import * as THREE from 'three';

export class WeatherSystem {
  constructor(scene, weather, stageConfig) {
    this.scene = scene;
    this.weather = weather;
    this.stage = stageConfig;
    this.particles = [];
    this.rainGroup = null;
    this.fogDensity = 0;
    this.init();
  }

  init() {
    if (this.weather === 'rain') this.createRain();
    if (this.weather === 'fog') this.applyFog(80, 180);
    if (this.weather === 'night') this.setupNightLights();
    if (this.weather === 'sunset') this.applyFog(100, 280);
    if (this.weather === 'storm') { this.createRain(); this.applyFog(40, 120); }
  }

  createRain() {
    const count = 800;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 25;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0x88aacc, size: 0.08, transparent: true, opacity: 0.6 });
    this.rainGroup = new THREE.Points(geo, mat);
    this.scene.add(this.rainGroup);
  }

  applyFog(near, far) {
    this.scene.fog = new THREE.Fog(this.stage.fogColor, near, far);
  }

  setupNightLights() {
    // Street light point lights
    for (let i = 0; i < 6; i++) {
      const light = new THREE.PointLight(0xff9944, 1.5, 25);
      light.position.set((i % 2 === 0 ? -8 : 8), 6.5, i * 30);
      this.scene.add(light);
      this.particles.push(light);
    }
  }

  update(delta, playerZ) {
    if (this.rainGroup) {
      const positions = this.rainGroup.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 18 * delta;
        positions[i + 2] -= 3 * delta;
        if (positions[i + 1] < 0) positions[i + 1] = 25;
        positions[i + 2] = ((positions[i + 2] - (playerZ - 30)) % 60) + (playerZ - 30);
      }
      this.rainGroup.geometry.attributes.position.needsUpdate = true;
      this.rainGroup.position.z = playerZ;
    }

    if (this.particles.length > 0 && this.weather === 'night') {
      this.particles.forEach((light, i) => {
        light.position.z = playerZ + (i * 30 - 60);
      });
    }
  }

  dispose() {
    if (this.rainGroup) this.scene.remove(this.rainGroup);
    this.particles.forEach(p => this.scene.remove(p));
  }
}
