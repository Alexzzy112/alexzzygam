import * as THREE from 'three';
import { LANE_POSITIONS, OBSTACLE_DAMAGE } from '../config/constants.js';

const OBSTACLE_TYPES = [
  { type: 'cone', color: 0xff6600, w: 0.6, h: 0.9, d: 0.6, damage: 5, points: 0 },
  { type: 'roadblock', color: 0xcc2200, w: 3.5, h: 0.9, d: 0.5, damage: 20, points: 0 },
  { type: 'oil', color: 0x222222, w: 2.0, h: 0.05, d: 2.0, damage: 3, points: 0, isFlat: true },
  { type: 'rock', color: 0x887766, w: 1.2, h: 0.9, d: 1.2, damage: 15, points: 0 },
  { type: 'tire', color: 0x111111, w: 0.8, h: 0.8, d: 0.8, damage: 8, points: 0 }
];

export class ObstacleManager {
  constructor(scene, stageConfig) {
    this.scene = scene;
    this.stage = stageConfig;
    this.obstacles = [];
    this.coins = [];
    this.lastSpawnZ = 60;
    this.spawnInterval = 20 - stageConfig.obstacleFrequency * 10;
    this.trackLength = stageConfig.trackLength;
    this.coinValue = 10;
    this.onCoinCollected = null;
    this.onObstacleHit = null;
  }

  spawnObstacle(z) {
    const lane = Math.floor(Math.random() * 3);
    const x = LANE_POSITIONS[lane];
    const typeIndex = Math.floor(Math.random() * OBSTACLE_TYPES.length);
    const def = OBSTACLE_TYPES[typeIndex];

    let mesh;
    if (def.type === 'cone') {
      const geo = new THREE.ConeGeometry(0.35, 0.9, 8);
      mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: def.color }));
      mesh.position.set(x, 0.45, z);
    } else if (def.type === 'roadblock') {
      mesh = new THREE.Group();
      const barGeo = new THREE.BoxGeometry(def.w, 0.25, 0.2);
      const bar = new THREE.Mesh(barGeo, new THREE.MeshPhongMaterial({ color: def.color }));
      bar.position.y = 0.9;
      mesh.add(bar);
      [-def.w / 2 + 0.2, def.w / 2 - 0.2].forEach(px => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.9, 0.2), new THREE.MeshPhongMaterial({ color: 0x888888 }));
        leg.position.set(px, 0.45, 0);
        mesh.add(leg);
      });
      mesh.position.set(x, 0, z);
    } else if (def.type === 'oil') {
      const geo = new THREE.PlaneGeometry(def.w, def.d);
      mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: def.color, transparent: true, opacity: 0.75, shininess: 200 }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, 0.02, z);
    } else if (def.type === 'rock') {
      const geo = new THREE.DodecahedronGeometry(0.6, 0);
      mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: def.color }));
      mesh.position.set(x, 0.6, z);
      mesh.rotation.y = Math.random() * Math.PI;
    } else if (def.type === 'tire') {
      const geo = new THREE.TorusGeometry(0.4, 0.18, 8, 16);
      mesh = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: def.color }));
      mesh.position.set(x, 0.4, z);
      mesh.rotation.x = Math.PI / 2;
    }

    if (mesh) {
      mesh.castShadow = true;
      mesh.userData = { type: def.type, damage: def.damage, lane, active: true };
      this.scene.add(mesh);
      this.obstacles.push(mesh);
    }
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
    const group = new THREE.Group();

    // Truck body
    const bodyGeo = new THREE.BoxGeometry(2.4, 1.8, 7.5);
    const body = new THREE.Mesh(bodyGeo, new THREE.MeshPhongMaterial({ color: Math.random() > 0.5 ? 0x4466aa : 0xaa4422 }));
    body.position.y = 1.0;
    group.add(body);

    // Cab
    const cabGeo = new THREE.BoxGeometry(2.2, 1.4, 2.5);
    const cab = new THREE.Mesh(cabGeo, new THREE.MeshPhongMaterial({ color: 0x333333 }));
    cab.position.set(0, 1.8, 2.8);
    group.add(cab);

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 10);
    const wMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    [[-1.3, 0.55, 2.5], [1.3, 0.55, 2.5], [-1.3, 0.55, -2.5], [1.3, 0.55, -2.5]].forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, wy, wz);
      group.add(w);
    });

    group.position.set(x, 0, z);
    group.castShadow = true;
    group.userData = {
      type: 'truck', damage: 30, lane, active: true,
      speed: 12 + Math.random() * 8,
      dir: Math.random() > 0.5 ? 1 : -1
    };
    this.scene.add(group);
    this.obstacles.push(group);
  }

  update(delta, playerZ) {
    // Spawn new obstacles
    if (playerZ + 80 > this.lastSpawnZ && this.lastSpawnZ < this.trackLength - 50) {
      this.lastSpawnZ += this.spawnInterval;
      const roll = Math.random();
      if (roll < 0.65) this.spawnObstacle(this.lastSpawnZ);
      else if (roll < 0.85) this.spawnMovingTraffic(this.lastSpawnZ + Math.random() * 15);
      // Coins every 12 units
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
      if (obs.userData.type === 'truck') {
        obs.position.z += obs.userData.dir * obs.userData.speed * delta;
        // Remove if far
        if (obs.position.z < playerZ - 40 || obs.position.z > playerZ + 150) {
          this.scene.remove(obs);
          obs.userData.active = false;
        }
      } else {
        // Remove static obstacles far behind
        if (obs.position.z < playerZ - 30) {
          this.scene.remove(obs);
          obs.userData.active = false;
        }
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
