import * as THREE from 'three';
import { LANE_POSITIONS } from '../config/constants.js';

const VEHICLE_TYPES = [
  {
    name: 'sedan',
    width: 2.0, height: 1.2, length: 4.2,
    bodyY: 0.7, wheelR: 0.4,
    colors: [0xcc3333, 0x3333cc, 0x33cc33, 0xcccc33, 0xcc33cc, 0x33cccc, 0xffffff, 0x222222],
    damage: 20
  },
  {
    name: 'sports',
    width: 2.1, height: 0.9, length: 4.0,
    bodyY: 0.55, wheelR: 0.35,
    colors: [0xff2200, 0xffdd00, 0x00ccff, 0xee44ee, 0xffffff, 0xff6600],
    damage: 25
  },
  {
    name: 'suv',
    width: 2.3, height: 1.5, length: 4.8,
    bodyY: 0.85, wheelR: 0.45,
    colors: [0x4466aa, 0xaa4422, 0x224422, 0x666666, 0x882266, 0x000022],
    damage: 25
  },
  {
    name: 'truck',
    width: 2.4, height: 1.8, length: 7.5,
    bodyY: 1.0, wheelR: 0.55,
    colors: [0x4466aa, 0xaa4422, 0x888888, 0x224466, 0x662244],
    damage: 30
  }
];

export class ObstacleManager {
  constructor(scene, stageConfig) {
    this.scene = scene;
    this.stage = stageConfig;
    this.obstacles = [];
    this.coins = [];
    this.lastSpawnZ = 60;
    this.spawnInterval = Math.max(15, 40 - stageConfig.obstacleFrequency * 30);
    this.trackLength = stageConfig.trackLength;
    this.coinValue = 10;
    this.onCoinCollected = null;
    this.onObstacleHit = null;
  }

  spawnCoin(z) {
    const lane = Math.floor(Math.random() * 3);
    const x = LANE_POSITIONS[lane];
    const geo = new THREE.CylinderGeometry(0.35, 0.35, 0.12, 12);
    const mat = new THREE.MeshPhongMaterial({ color: 0xffd700, shininess: 200, emissive: 0x443300 });
    const coin = new THREE.Mesh(geo, mat);
    coin.rotation.x = Math.PI / 2;
    coin.position.set(x, 0.8 + Math.sin(Date.now() * 0.003) * 0.1, z);
    coin.userData = { lane, active: true, baseY: 0.8, spawnTime: Date.now() };
    this.scene.add(coin);
    this.coins.push(coin);
  }

  spawnMovingTraffic(z) {
    const lane = Math.floor(Math.random() * 3);
    const x = LANE_POSITIONS[lane];
    const typeDef = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
    const group = new THREE.Group();
    const bodyColor = typeDef.colors[Math.floor(Math.random() * typeDef.colors.length)];

    // Body
    const bodyGeo = new THREE.BoxGeometry(typeDef.width, typeDef.height, typeDef.length);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshPhongMaterial({ color: bodyColor }));
    body.position.y = typeDef.bodyY;
    group.add(body);

    // Windshield (dark stripe on top front)
    if (typeDef.name !== 'truck') {
      const cabGeo = new THREE.BoxGeometry(typeDef.width * 0.85, typeDef.height * 0.4, typeDef.length * 0.2);
      const cab = new THREE.Mesh(cabGeo, new THREE.MeshPhongMaterial({ color: 0x222244, emissive: 0x111122 }));
      cab.position.set(0, typeDef.bodyY + typeDef.height * 0.35, typeDef.length * 0.35);
      group.add(cab);
    } else {
      const cabGeo = new THREE.BoxGeometry(typeDef.width * 0.9, typeDef.height * 0.7, typeDef.length * 0.3);
      const cab = new THREE.Mesh(cabGeo, new THREE.MeshPhongMaterial({ color: 0x333333 }));
      cab.position.set(0, typeDef.bodyY + typeDef.height * 0.2, typeDef.length * 0.35);
      group.add(cab);
    }

    // Headlights
    const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffaa });
    const hlGeo = new THREE.SphereGeometry(0.15, 6, 6);
    [[-typeDef.width * 0.35, typeDef.bodyY * 0.6, typeDef.length * 0.5],
     [typeDef.width * 0.35, typeDef.bodyY * 0.6, typeDef.length * 0.5]].forEach(([hx, hy, hz]) => {
      const hl = new THREE.Mesh(hlGeo, hlMat);
      hl.position.set(hx, hy, hz);
      group.add(hl);
    });

    // Taillights
    const tlMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
    [[-typeDef.width * 0.35, typeDef.bodyY * 0.6, -typeDef.length * 0.5],
     [typeDef.width * 0.35, typeDef.bodyY * 0.6, -typeDef.length * 0.5]].forEach(([tx, ty, tz]) => {
      const tl = new THREE.Mesh(hlGeo, tlMat);
      tl.position.set(tx, ty, tz);
      group.add(tl);
    });

    // Wheels
    const wGeo = new THREE.CylinderGeometry(typeDef.wheelR, typeDef.wheelR, 0.35, 8);
    const wMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const halfW = typeDef.width * 0.5 + 0.15;
    const halfL = typeDef.length * 0.35;
    [[-halfW, typeDef.wheelR, halfL], [halfW, typeDef.wheelR, halfL],
     [-halfW, typeDef.wheelR, -halfL], [halfW, typeDef.wheelR, -halfL]].forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, wy, wz);
      group.add(w);
    });

    group.position.set(x, 0, z);
    group.castShadow = true;
    group.userData = {
      type: typeDef.name, damage: typeDef.damage, lane, active: true,
      speed: 10 + Math.random() * (12 + this.stage.obstacleFrequency * 5),
      dir: Math.random() > 0.5 ? 1 : -1
    };
    this.scene.add(group);
    this.obstacles.push(group);
  }

  update(delta, playerZ) {
    // Spawn moving traffic + coins only
    if (playerZ + 80 > this.lastSpawnZ && this.lastSpawnZ < this.trackLength - 50) {
      this.lastSpawnZ += this.spawnInterval;
      if (Math.random() < 0.7) this.spawnMovingTraffic(this.lastSpawnZ + Math.random() * 15);
      if (Math.random() < 0.6) this.spawnCoin(this.lastSpawnZ - this.spawnInterval * 0.5);
    }

    // Animate coins
    const now = Date.now();
    this.coins.forEach(coin => {
      if (!coin.userData.active) return;
      const elapsed = (now - coin.userData.spawnTime) * 0.001;
      coin.position.y = coin.userData.baseY + Math.sin(elapsed * 2) * 0.2;
      coin.rotation.z += delta * 2;
      // Remove far behind
      if (coin.position.z < playerZ - 30) {
        this.scene.remove(coin);
        coin.userData.active = false;
      }
    });

    // Move traffic
    this.obstacles.forEach(obs => {
      if (!obs.userData.active) return;
      obs.position.z += obs.userData.dir * obs.userData.speed * delta;
      if (obs.position.z < playerZ - 40 || obs.position.z > playerZ + 150) {
        this.scene.remove(obs);
        obs.userData.active = false;
      }
    });

    // Clean up arrays
    this.obstacles = this.obstacles.filter(o => o.userData.active);
    this.coins = this.coins.filter(c => c.userData.active);
  }

  checkPlayerCollisions(playerBox, playerZ) {
    let damage = 0;
    let coinsCollected = 0;

    this.obstacles.forEach(obs => {
      if (!obs.userData.active) return;
      if (Math.abs(obs.position.z - playerZ) > 8) return;
      const obsBox = new THREE.Box3().setFromObject(obs);
      if (playerBox.intersectsBox(obsBox)) {
        damage += obs.userData.damage;
        obs.userData.active = false;
        this.scene.remove(obs);
      }
    });

    this.coins.forEach(coin => {
      if (!coin.userData.active) return;
      if (Math.abs(coin.position.z - playerZ) > 5) return;
      const coinBox = new THREE.Box3().setFromObject(coin);
      if (playerBox.intersectsBox(coinBox)) {
        coinsCollected += this.coinValue;
        coin.userData.active = false;
        this.scene.remove(coin);
      }
    });

    return { damage, coinsCollected };
  }

  dispose() {
    [...this.obstacles, ...this.coins].forEach(o => this.scene.remove(o));
    this.obstacles = [];
    this.coins = [];
  }
}
