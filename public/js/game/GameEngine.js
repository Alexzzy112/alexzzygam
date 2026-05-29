import * as THREE from 'three';
import { LANE_POSITIONS, CAMERA_OFFSET, FOG_NEAR, FOG_FAR } from '../config/constants.js';

export class GameEngine {
  constructor(canvas) {
    this.canvas = canvas;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();
    this.running = false;
    this.animFrameId = null;
    this.onUpdate = null;
    this.init();
  }

  init() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x87ceeb, FOG_NEAR, FOG_FAR);

    // Camera
    this.camera = new THREE.PerspectiveCamera(window.innerWidth < 768 ? 78 : 70, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 5, -12);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: false });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Lights
    this.setupLights();

    // Resize handler
    window.addEventListener('resize', () => this.onResize());
  }

  setupLights() {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);

    // Directional sun light
    this.sunLight = new THREE.DirectionalLight(0xffd700, 1.2);
    this.sunLight.position.set(50, 100, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.scene.add(this.sunLight);

    // Hemisphere light for sky/ground bounce
    this.hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.4);
    this.scene.add(this.hemiLight);
  }

  setEnvironmentColors(skyColor, fogColor, groundColor, ambientColor, sunColor) {
    this.scene.background = new THREE.Color(skyColor);
    this.scene.fog.color.set(fogColor);
    this.ambientLight.color.set(ambientColor);
    this.sunLight.color.set(sunColor);
    this.hemiLight.groundColor.set(groundColor);
  }

  setFogDensity(near, far) {
    this.scene.fog.near = near;
    this.scene.fog.far = far;
  }

  start(updateFn) {
    this.onUpdate = updateFn;
    this.running = true;
    this.clock.start();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  loop() {
    if (!this.running) return;
    this.animFrameId = requestAnimationFrame(() => this.loop());
    const delta = Math.min(this.clock.getDelta(), 0.05);
    if (this.onUpdate) this.onUpdate(delta);
    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  dispose() {
    this.stop();
    this.renderer.dispose();
    window.removeEventListener('resize', () => this.onResize());
  }

  add(obj) { this.scene.add(obj); }
  remove(obj) { this.scene.remove(obj); }

  get delta() { return this.clock.getDelta(); }
}
