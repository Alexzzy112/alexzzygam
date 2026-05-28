import * as THREE from 'three';
import { MAX_HEALTH, NITRO_MAX, NITRO_DRAIN_RATE, NITRO_REGEN_RATE, NITRO_BOOST_MULTIPLIER, STEER_SPEED, STEER_FRICTION, ROAD_HALF_WIDTH } from '../config/constants.js';

export class PlayerCar {
  constructor(scene, carConfig, upgradeStats) {
    this.scene = scene;
    this.config = carConfig;
    this.upgrades = upgradeStats || { speed: 1, handling: 1, nitro: 1, armor: 1 };
    this.currentX = 0;
    this.xVelocity = 0;
    this.speed = 0;
    this.maxSpeed = carConfig.maxSpeed * (1 + (this.upgrades.speed - 1) * 0.08);
    this.acceleration = carConfig.acceleration * (1 + (this.upgrades.speed - 1) * 0.05);
    this.handling = carConfig.handling * (1 + (this.upgrades.handling - 1) * 0.05);
    this.health = MAX_HEALTH;
    this.armor = this.upgrades.armor;
    this.nitro = NITRO_MAX;
    this.nitroActive = false;
    this.nitroBoostMultiplier = NITRO_BOOST_MULTIPLIER * (1 + (this.upgrades.nitro - 1) * 0.05);
    this.z = 0;
    this.isAlive = true;
    this.invincible = false;
    this.invincibleTimer = 0;
    this.driftAngle = 0;
    this.group = new THREE.Group();
    this.buildMesh();
    this.scene.add(this.group);
  }

  buildMesh() {
    const c = this.config;
    // Car body
    const bodyGeo = new THREE.BoxGeometry(c.width, c.height * 0.6, c.length);
    const bodyMat = new THREE.MeshPhongMaterial({ color: c.bodyColor, shininess: 120, specular: 0x888888 });
    this.body = new THREE.Mesh(bodyGeo, bodyMat);
    this.body.position.y = c.height * 0.3 + 0.2;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Cabin / roof
    const roofGeo = new THREE.BoxGeometry(c.width * 0.75, c.height * 0.45, c.length * 0.48);
    const roofMat = new THREE.MeshPhongMaterial({ color: 0x222222, shininess: 80 });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, c.height * 0.6 + 0.2, c.length * 0.05);
    roof.castShadow = true;
    this.group.add(roof);

    // Windshield
    const windGeo = new THREE.PlaneGeometry(c.width * 0.7, c.height * 0.35);
    const windMat = new THREE.MeshPhongMaterial({ color: 0x88ccff, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
    const wind = new THREE.Mesh(windGeo, windMat);
    wind.position.set(0, c.height * 0.6 + 0.2, c.length * 0.29);
    wind.rotation.x = Math.PI / 2 * 0.3;
    this.group.add(wind);

    // Headlights
    [-c.width * 0.3, c.width * 0.3].forEach(lx => {
      const lightGeo = new THREE.BoxGeometry(0.35, 0.2, 0.15);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffee });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(lx, c.height * 0.3 + 0.2, c.length / 2);
      this.group.add(light);
    });

    // Tail lights
    [-c.width * 0.3, c.width * 0.3].forEach(lx => {
      const lightGeo = new THREE.BoxGeometry(0.35, 0.2, 0.1);
      const lightMat = new THREE.MeshBasicMaterial({ color: 0xff1100 });
      const light = new THREE.Mesh(lightGeo, lightMat);
      light.position.set(lx, c.height * 0.3 + 0.2, -c.length / 2);
      this.group.add(light);
    });

    // Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.28, 12);
    const wheelMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
    const hubGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.3, 8);
    const hubMat = new THREE.MeshPhongMaterial({ color: 0xaaaaaa, shininess: 200 });
    const wheelPos = [
      [-c.width / 2 - 0.14, 0.4, c.length * 0.35],
      [c.width / 2 + 0.14, 0.4, c.length * 0.35],
      [-c.width / 2 - 0.14, 0.4, -c.length * 0.35],
      [c.width / 2 + 0.14, 0.4, -c.length * 0.35]
    ];
    this.wheels = [];
    wheelPos.forEach(([wx, wy, wz]) => {
      const wGrp = new THREE.Group();
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      wGrp.add(wheel);
      const hub = new THREE.Mesh(hubGeo, hubMat);
      hub.rotation.z = Math.PI / 2;
      wGrp.add(hub);
      wGrp.position.set(wx, wy, wz);
      this.group.add(wGrp);
      this.wheels.push(wGrp);
    });

    // Nitro exhaust trails
    this.exhaustLeft = this.createExhaust(-c.width * 0.25, -c.length / 2);
    this.exhaustRight = this.createExhaust(c.width * 0.25, -c.length / 2);

    this.group.position.set(0, 0, 5);
  }

  createExhaust(x, z) {
    const geo = new THREE.SphereGeometry(0.15, 6, 6);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.6 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.35, z);
    mesh.visible = false;
    this.group.add(mesh);
    return mesh;
  }

  activateNitro() {
    if (this.nitro > 10) this.nitroActive = true;
  }

  deactivateNitro() {
    this.nitroActive = false;
  }

  takeDamage(amount) {
    if (this.invincible) return;
    const reduced = amount * (1 - (this.armor - 1) * 0.06);
    this.health = Math.max(0, this.health - reduced);
    this.invincible = true;
    this.invincibleTimer = 1.2;
    // Flash effect
    this.flashTimer = 0;
    if (this.health <= 0) this.isAlive = false;
  }

  update(delta, inputState) {
    if (!this.isAlive) return;
    const braking = inputState?.brake || false;

    // Invincibility frames
    if (this.invincible) {
      this.invincibleTimer -= delta;
      this.flashTimer = (this.flashTimer || 0) + delta;
      this.group.visible = Math.sin(this.flashTimer * 20) > 0;
      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.group.visible = true;
      }
    }

    // Nitro management
    if (this.nitroActive && this.nitro > 0) {
      this.nitro = Math.max(0, this.nitro - NITRO_DRAIN_RATE * (this.upgrades.nitro / 5) * delta);
      if (this.nitro <= 0) this.nitroActive = false;
    } else if (!this.nitroActive) {
      this.nitro = Math.min(NITRO_MAX, this.nitro + NITRO_REGEN_RATE * delta);
    }

    // Speed
    const nitroMult = this.nitroActive ? this.nitroBoostMultiplier : 1.0;
    const brakeMult = braking ? 0.3 : 1.0;
    const targetSpeed = this.maxSpeed * nitroMult * brakeMult;
    this.speed += (targetSpeed - this.speed) * this.acceleration * delta;

    // Smooth analog steering
    const steerInput = (inputState?.left ? -1 : 0) + (inputState?.right ? 1 : 0);
    const steerPower = this.handling * STEER_SPEED;
    this.xVelocity += steerInput * steerPower * delta;
    this.xVelocity *= (1 - STEER_FRICTION * delta);
    this.currentX += this.xVelocity * delta;

    // Clamp to road bounds (with car width margin)
    const margin = this.config.width / 2 + 0.5;
    this.currentX = Math.max(-(ROAD_HALF_WIDTH - margin), Math.min(ROAD_HALF_WIDTH - margin, this.currentX));
    if (Math.abs(this.currentX) >= ROAD_HALF_WIDTH - margin - 0.01) {
      this.xVelocity *= 0.5;
    }

    // Drift / visual lean based on lateral velocity
    this.driftAngle = THREE.MathUtils.lerp(this.driftAngle, -this.xVelocity * 0.04, 0.08);
    this.group.rotation.y = this.driftAngle;

    // Move forward
    this.z += this.speed * delta;

    // Update position
    this.group.position.set(this.currentX, 0, this.z);

    // Spin wheels
    this.wheels.forEach(w => { w.children[0].rotation.x += this.speed * delta * 0.5; });

    // Nitro exhaust
    const showExhaust = this.nitroActive;
    this.exhaustLeft.visible = showExhaust;
    this.exhaustRight.visible = showExhaust;
    if (showExhaust) {
      const pulse = 0.8 + Math.sin(Date.now() * 0.02) * 0.3;
      this.exhaustLeft.scale.setScalar(pulse);
      this.exhaustRight.scale.setScalar(pulse);
      this.exhaustLeft.material.color.setHSL(0.55 + Math.random() * 0.1, 1, 0.6);
      this.exhaustRight.material.color.setHSL(0.55 + Math.random() * 0.1, 1, 0.6);
    }
  }

  getBoundingBox() {
    return new THREE.Box3().setFromObject(this.group);
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
