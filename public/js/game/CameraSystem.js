import * as THREE from 'three';

export class CameraSystem {
  constructor(camera) {
    this.camera = camera;
    this.offset = new THREE.Vector3(0, 5, -12);
    this.lookAhead = new THREE.Vector3(0, 1.5, 15);
    this.smoothSpeed = 8;
    this.shake = 0;
    this.shakeDecay = 4;
    this.cinematicMode = false;
    this.cinematicAngle = 0;
  }

  addShake(amount) { this.shake = Math.max(this.shake, amount); }

  update(delta, targetGroup, speed) {
    if (!targetGroup) return;
    const carPos = targetGroup.position;
    const speedNorm = Math.min(speed / 100, 1);
    const dynamicZ = -12 - speedNorm * 4;
    const dynamicY = 5 + speedNorm * 1.5;
    const desiredPos = new THREE.Vector3(
      carPos.x + this.offset.x,
      carPos.y + dynamicY,
      carPos.z + dynamicZ
    );

    if (this.shake > 0) {
      desiredPos.x += (Math.random() - 0.5) * this.shake * 0.5;
      desiredPos.y += (Math.random() - 0.5) * this.shake * 0.3;
      this.shake = Math.max(0, this.shake - this.shakeDecay * delta);
    }

    this.camera.position.lerp(desiredPos, this.smoothSpeed * delta);
    const lookTarget = new THREE.Vector3(carPos.x * 0.3, carPos.y + 1.5, carPos.z + 20);
    this.camera.lookAt(lookTarget);
  }

  setCinematic(enabled) { this.cinematicMode = enabled; }

  setFinishCamera(carPos) {
    this.camera.position.set(carPos.x + 8, carPos.y + 6, carPos.z - 5);
    this.camera.lookAt(carPos.x, carPos.y + 1, carPos.z);
  }
}
