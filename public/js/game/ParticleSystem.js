import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.emitters = [];
  }

  emitExplosion(position, color = 0xff4400, count = 30) {
    const particles = [];
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.08 + Math.random() * 0.12, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).offsetHSL(Math.random() * 0.1 - 0.05, 0, Math.random() * 0.3),
        transparent: true, opacity: 1
      });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(position);
      const speed = 3 + Math.random() * 8;
      const angle = Math.random() * Math.PI * 2;
      const elevation = (Math.random() - 0.3) * Math.PI;
      p.userData.vel = new THREE.Vector3(
        Math.cos(angle) * Math.cos(elevation) * speed,
        Math.abs(Math.sin(elevation)) * speed + 2,
        Math.sin(angle) * Math.cos(elevation) * speed
      );
      p.userData.life = 0.6 + Math.random() * 0.6;
      p.userData.maxLife = p.userData.life;
      this.scene.add(p);
      particles.push(p);
    }
    this.emitters.push({ particles, type: 'explosion' });
  }

  emitCoinCollect(position) {
    const particles = [];
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.SphereGeometry(0.1, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 1 });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(position);
      const angle = (i / 8) * Math.PI * 2;
      p.userData.vel = new THREE.Vector3(Math.cos(angle) * 3, 4 + Math.random() * 2, Math.sin(angle) * 3);
      p.userData.life = 0.5;
      p.userData.maxLife = 0.5;
      this.scene.add(p);
      particles.push(p);
    }
    this.emitters.push({ particles, type: 'coin' });
  }

  emitNitroBurst(position) {
    const particles = [];
    for (let i = 0; i < 10; i++) {
      const geo = new THREE.SphereGeometry(0.15 + Math.random() * 0.1, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(0.55 + Math.random() * 0.1, 1, 0.5), transparent: true, opacity: 0.8 });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(position);
      p.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 1, -(3 + Math.random() * 5));
      p.userData.life = 0.3 + Math.random() * 0.2;
      p.userData.maxLife = p.userData.life;
      this.scene.add(p);
      particles.push(p);
    }
    this.emitters.push({ particles, type: 'nitro' });
  }

  emitDust(position) {
    const particles = [];
    for (let i = 0; i < 6; i++) {
      const geo = new THREE.SphereGeometry(0.2 + Math.random() * 0.2, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0xccbbaa, transparent: true, opacity: 0.5 });
      const p = new THREE.Mesh(geo, mat);
      p.position.copy(position);
      p.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 4, 0.5 + Math.random(), (Math.random() - 0.5) * 2);
      p.userData.life = 0.8 + Math.random() * 0.4;
      p.userData.maxLife = p.userData.life;
      this.scene.add(p);
      particles.push(p);
    }
    this.emitters.push({ particles, type: 'dust' });
  }

  update(delta) {
    const gravity = new THREE.Vector3(0, -9.8, 0);
    this.emitters = this.emitters.filter(emitter => {
      emitter.particles = emitter.particles.filter(p => {
        p.userData.life -= delta;
        if (p.userData.life <= 0) { this.scene.remove(p); return false; }
        const t = p.userData.life / p.userData.maxLife;
        p.material.opacity = t;
        p.userData.vel.addScaledVector(gravity, delta * 0.4);
        p.position.addScaledVector(p.userData.vel, delta);
        p.scale.setScalar(t * 0.8 + 0.2);
        return true;
      });
      return emitter.particles.length > 0;
    });
  }

  dispose() {
    this.emitters.forEach(e => e.particles.forEach(p => this.scene.remove(p)));
    this.emitters = [];
  }
}
