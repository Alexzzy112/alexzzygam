import * as THREE from 'three';
import { LANE_POSITIONS } from '../config/constants.js';

export class AICar {
  constructor(scene, config, color, startZ, difficulty) {
    this.scene = scene;
    this.config = config;
    this.color = color;
    this.z = startZ;
    this.lane = Math.floor(Math.random() * 3);
    this.currentX = LANE_POSITIONS[this.lane];
    this.targetX = this.currentX;
    this.speed = difficulty.min + Math.random() * (difficulty.max - difficulty.min);
    this.baseSpeed = this.speed;
    this.maxSpeed = difficulty.max * 1.1;
    this.laneTimer = 1 + Math.random() * 2;
    this.finished = false;
    this.position = 0;
    this.name = config.name;
    this.group = new THREE.Group();
    this.buildMesh();
    this.scene.add(this.group);
  }

  buildMesh() {
    // Body
    const bodyGeo = new THREE.BoxGeometry(2.0, 0.6, 4.2);
    const bodyMat = new THREE.MeshPhongMaterial({ color: this.color, shininess: 100 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.55;
    body.castShadow = true;
    this.group.add(body);

    // Roof
    const roofGeo = new THREE.BoxGeometry(1.5, 0.42, 2.0);
    const roof = new THREE.Mesh(roofGeo, new THREE.MeshPhongMaterial({ color: 0x111111 }));
    roof.position.set(0, 1.06, 0.1);
    this.group.add(roof);

    // Headlights
    [-0.6, 0.6].forEach(lx => {
      const lg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xffffcc }));
      lg.position.set(lx, 0.55, 2.1);
      this.group.add(lg);
    });

    // Taillights
    [-0.6, 0.6].forEach(lx => {
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.1), new THREE.MeshBasicMaterial({ color: 0xff2200 }));
      tl.position.set(lx, 0.55, -2.1);
      this.group.add(tl);
    });

    // Wheels
    const wGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.26, 10);
    const wMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    [[- 1.1, 0.38, 1.4], [1.1, 0.38, 1.4], [-1.1, 0.38, -1.4], [1.1, 0.38, -1.4]].forEach(([wx, wy, wz]) => {
      const w = new THREE.Mesh(wGeo, wMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, wy, wz);
      w.castShadow = true;
      this.group.add(w);
    });

    this.group.position.set(this.currentX, 0, this.z);
  }

  update(delta, playerZ, trackLength) {
    if (this.finished) return;

    // AI lane change logic
    this.laneTimer -= delta;
    if (this.laneTimer <= 0) {
      this.laneTimer = 1.5 + Math.random() * 2.5;
      const newLane = Math.floor(Math.random() * 3);
      this.lane = newLane;
      this.targetX = LANE_POSITIONS[newLane];
    }

    // Rubber banding - catch up if far behind player
    const gap = playerZ - this.z;
    let speedMult = 1.0;
    if (gap > 30) speedMult = 1.15; // catch up
    else if (gap < -20) speedMult = 0.88; // slow down if too far ahead

    this.speed = THREE.MathUtils.lerp(this.speed, this.baseSpeed * speedMult, 0.05);
    this.speed = Math.min(this.speed, this.maxSpeed);

    this.z += this.speed * delta;
    this.currentX = THREE.MathUtils.lerp(this.currentX, this.targetX, 0.08);

    // Drift
    const xDiff = this.targetX - this.currentX;
    this.group.rotation.y = -xDiff * 0.06;

    this.group.position.set(this.currentX, 0, this.z);

    if (this.z >= trackLength) {
      this.finished = true;
    }
  }

  getBoundingBox() {
    return new THREE.Box3().setFromObject(this.group);
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
