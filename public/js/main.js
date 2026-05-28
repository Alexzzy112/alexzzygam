import { GameEngine } from './game/GameEngine.js';
import { Track } from './game/Track.js';
import { PlayerCar } from './game/PlayerCar.js';
import { AICar } from './game/AICar.js';
import { ObstacleManager } from './game/ObstacleManager.js';
import { WeatherSystem } from './game/WeatherSystem.js';
import { CameraSystem } from './game/CameraSystem.js';
import { AudioManager } from './game/AudioManager.js';
import { ParticleSystem } from './game/ParticleSystem.js';
import { GameState } from './game/GameState.js';
import { HUD } from './ui/HUD.js';
import { Menus } from './ui/Menus.js';
import { STAGES } from './config/stages.js';
import { CARS, AI_CARS } from './config/cars.js';
import { AI_COUNT, FINISH_LINE_COINS, MAX_HEALTH } from './config/constants.js';
import * as THREE from 'three';

window._gameLoadReady = true;
if (window._clearLoadTimer) window._clearLoadTimer();

class TurboRacer {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.engine = null;
    this.track = null;
    this.playerCar = null;
    this.aiCars = [];
    this.obstacles = null;
    this.weather = null;
    this.camera = null;
    this.particles = null;
    this.hud = new HUD();
    this.gameState = new GameState();
    this.audio = new AudioManager();
    window.audioManager = this.audio;
    this.menus = new Menus(this.gameState, this.startRace.bind(this), null, null);
    this.raceTime = 0;
    this.racePhase = 'menu'; // menu | countdown | racing | finished
    this.countdownTimer = 0;
    this.countdownStep = 3;
    this.braking = false;
    this.inputState = { left: false, right: false, nitro: false, brake: false };
    this.finishHandled = false;
    this.coinsThisRace = 0;
    this.currentStageConfig = null;
    this.currentCarConfig = null;
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.paused = false;

    this.bindInputs();
    this.bindGameEvents();
    this.showLoadingThenHome();
  }

  async showLoadingThenHome() {
    this.menus.show('loading');
    // Simulate asset load
    await new Promise(r => setTimeout(r, 2000));
    this.menus.refreshHomeUI();
    this.menus.show('home');
    const lp = document.getElementById('loading-progress');
    if (lp) { lp.style.width = '100%'; }
  }

  bindGameEvents() {
    window.addEventListener('game:resume', () => this.resumeRace());
    window.addEventListener('game:quit', () => this.quitRace());
    document.getElementById('btn-pause')?.addEventListener('click', () => this.pauseRace());
  }

  bindInputs() {
    // Keyboard
    window.addEventListener('keydown', e => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': this.inputState.left = true; break;
        case 'ArrowRight': case 'KeyD': this.inputState.right = true; break;
        case 'Space': case 'ShiftLeft': this.inputState.nitro = true; break;
        case 'ArrowDown': case 'KeyS': this.inputState.brake = true; break;
        case 'Escape': this.pauseRace(); break;
      }
    });
    window.addEventListener('keyup', e => {
      switch (e.code) {
        case 'ArrowLeft': case 'KeyA': this.inputState.left = false; break;
        case 'ArrowRight': case 'KeyD': this.inputState.right = false; break;
        case 'Space': case 'ShiftLeft': this.inputState.nitro = false; break;
        case 'ArrowDown': case 'KeyS': this.inputState.brake = false; break;
      }
    });

    // Touch controls — swipe gesture for nitro burst
    const touchArea = document.getElementById('touch-controls');
    window.addEventListener('touchstart', e => {
      const t = e.changedTouches[0];
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
    }, { passive: true });
    window.addEventListener('touchend', e => {
      if (this.racePhase !== 'racing') return;
      const t = e.changedTouches[0];
      const dx = t.clientX - this.touchStartX;
      const dy = t.clientY - this.touchStartY;
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 20) { this.inputState.right = true; this.inputState._swipeTimer = setTimeout(() => this.inputState.right = false, 300); }
        else if (dx < -20) { this.inputState.left = true; this.inputState._swipeTimer = setTimeout(() => this.inputState.left = false, 300); }
      } else {
        if (dy < -20) { this.playerCar?.activateNitro(); setTimeout(() => this.playerCar?.deactivateNitro(), 1500); }
      }
    }, { passive: true });

    // Touch buttons — hold for smooth continuous steering
    document.getElementById('btn-left')?.addEventListener('touchstart', () => { this.inputState.left = true; });
    document.getElementById('btn-left')?.addEventListener('touchend', () => { this.inputState.left = false; });
    document.getElementById('btn-right')?.addEventListener('touchstart', () => { this.inputState.right = true; });
    document.getElementById('btn-right')?.addEventListener('touchend', () => { this.inputState.right = false; });
    document.getElementById('btn-nitro')?.addEventListener('touchstart', () => { this.inputState.nitro = true; });
    document.getElementById('btn-nitro')?.addEventListener('touchend', () => { this.inputState.nitro = false; });
    document.getElementById('btn-brake')?.addEventListener('touchstart', () => { this.inputState.brake = true; });
    document.getElementById('btn-brake')?.addEventListener('touchend', () => { this.inputState.brake = false; });
  }

  startRace(stageConfig, carConfig) {
    this.currentStageConfig = stageConfig;
    this.currentCarConfig = carConfig;
    this.finishHandled = false;
    this.raceTime = 0;
    this.coinsThisRace = 0;
    this.racePhase = 'countdown';
    this.countdownStep = 3;
    this.countdownTimer = 1.0;
    this.paused = false;

    // Init engine if not done
    if (!this.engine) {
      this.engine = new GameEngine(this.canvas);
    } else {
      this.disposeRaceObjects();
    }

    const scene = this.engine.scene;

    // Apply environment
    this.engine.setEnvironmentColors(
      stageConfig.skyColor, stageConfig.fogColor,
      stageConfig.groundColor, stageConfig.ambientLight,
      stageConfig.sunColor
    );
    if (stageConfig.weather === 'fog' || stageConfig.weather === 'storm') {
      this.engine.setFogDensity(40, 140);
    } else if (stageConfig.weather === 'night') {
      this.engine.setFogDensity(30, 120);
    } else {
      this.engine.setFogDensity(80, 300);
    }

    // Build world
    this.track = new Track(scene, stageConfig);
    this.playerCar = new PlayerCar(scene, carConfig, this.gameState.player?.garageUpgrades);
    this.obstacles = new ObstacleManager(scene, stageConfig);
    this.weather = new WeatherSystem(scene, stageConfig.weather, stageConfig);
    this.particles = new ParticleSystem(scene);
    this.camera = new CameraSystem(this.engine.camera);

    // AI cars
    this.aiCars = [];
    const aiCount = Math.min(stageConfig.aiCount, AI_CARS.length);
    for (let i = 0; i < aiCount; i++) {
      const aiDef = AI_CARS[i];
      const startZ = 2 - i * 3;
      const ai = new AICar(scene, aiDef, aiDef.color, startZ, stageConfig.aiSpeed);
      this.aiCars.push(ai);
    }

    // Audio
    this.audio.init();
    this.audio.startBGM(stageConfig.environment);

    // UI
    this.hud.show();
    this.hud.setStageName(stageConfig.name);
    document.getElementById('touch-controls').style.display = 'flex';
    document.getElementById('btn-pause').style.display = 'block';
    this.menus.show('__none__'); // hide all menus

    // Start engine loop
    this.engine.start(delta => this.update(delta));
  }

  update(delta) {
    if (this.paused) return;

    switch (this.racePhase) {
      case 'countdown': this.updateCountdown(delta); break;
      case 'racing': this.updateRacing(delta); break;
      case 'finished': this.updateFinished(delta); break;
    }
  }

  updateCountdown(delta) {
    this.countdownTimer -= delta;
    if (this.countdownTimer <= 0) {
      if (this.countdownStep > 0) {
        this.hud.showCountdown(this.countdownStep);
        this.audio.playCountdown();
        this.countdownStep--;
        this.countdownTimer = 1.0;
      } else {
        this.hud.showCountdown('GO!');
        this.audio.playCountdownGo();
        this.racePhase = 'racing';
      }
    }
    // Camera still follows car during countdown
    this.camera.update(delta, this.playerCar.group, 0);
  }

  updateRacing(delta) {
    this.raceTime += delta;

    // Process input
    if (this.inputState.nitro) {
      this.playerCar.activateNitro();
      if (!this._nitroSfxPlaying) { this.audio.playNitro(); this._nitroSfxPlaying = true; }
    } else {
      this.playerCar.deactivateNitro();
      this._nitroSfxPlaying = false;
    }

    // Update player with full input state for analog steering
    this.playerCar.update(delta, this.inputState);
    this.audio.updateEngine(this.playerCar.speed, this.playerCar.maxSpeed);

    // Nitro particles
    if (this.playerCar.nitroActive && Math.random() < 0.4) {
      const p = this.playerCar.group.position.clone();
      p.z -= 2;
      this.particles.emitNitroBurst(p);
    }

    // Collisions
    const playerBox = this.playerCar.getBoundingBox();
    const { damage, coinsCollected } = this.obstacles.checkPlayerCollisions(playerBox, this.playerCar.z);
    if (damage > 0) {
      this.playerCar.takeDamage(damage);
      this.camera.addShake(damage * 0.3);
      this.hud.flashDamage();
      this.audio.playCollision();
      this.particles.emitExplosion(this.playerCar.group.position.clone(), 0xff4400, 15);
      this.audio.playTireScreech();
    }
    if (coinsCollected > 0) {
      this.coinsThisRace += coinsCollected;
      this.audio.playCoinCollect();
      this.particles.emitCoinCollect(this.playerCar.group.position.clone().add(new THREE.Vector3(0, 1, 0)));
    }

    // Check AI collisions with player
    this.aiCars.forEach(ai => {
      if (Math.abs(ai.z - this.playerCar.z) > 6) return;
      const aiBox = ai.getBoundingBox();
      if (playerBox.intersectsBox(aiBox)) {
        this.playerCar.takeDamage(15);
        this.camera.addShake(2);
        this.hud.flashDamage();
        this.audio.playCollision();
      }
    });

    // Update AI
    this.aiCars.forEach(ai => ai.update(delta, this.playerCar.z, this.currentStageConfig.trackLength));

    // Update world systems
    this.track.update(this.playerCar.z);
    this.obstacles.update(delta, this.playerCar.z);
    this.weather.update(delta, this.playerCar.z);
    this.particles.update(delta);
    this.camera.update(delta, this.playerCar.group, this.playerCar.speed);

    // Compute position
    const allZ = [this.playerCar.z, ...this.aiCars.map(a => a.z)];
    const playerPos = allZ.filter(z => z > this.playerCar.z).length + 1;

    // HUD
    this.hud.update({
      speed: this.playerCar.speed,
      maxSpeed: this.playerCar.maxSpeed,
      health: this.playerCar.health,
      nitro: this.playerCar.nitro,
      raceTime: this.raceTime,
      coins: this.coinsThisRace,
      progress: this.playerCar.z / this.currentStageConfig.trackLength,
      position: playerPos,
      aiCars: this.aiCars,
      trackLength: this.currentStageConfig.trackLength,
      playerZ: this.playerCar.z
    });

    // Check finish
    if (this.playerCar.z >= this.currentStageConfig.trackLength && !this.finishHandled) {
      this.finishHandled = true;
      this.racePhase = 'finished';
      this.handleRaceFinish(playerPos);
    }

    // Check death
    if (!this.playerCar.isAlive && !this.finishHandled) {
      this.finishHandled = true;
      this.racePhase = 'finished';
      this.hud.showCenterMessage('💥 WRECKED!', 2000);
      setTimeout(() => this.handleRaceFinish(this.aiCars.length + 1), 2200);
    }
  }

  updateFinished(delta) {
    this.particles.update(delta);
    if (this.playerCar) {
      this.camera.setFinishCamera(this.playerCar.group.position);
    }
  }

  handleRaceFinish(position) {
    this.audio.playFinish();
    const results = this.gameState.getRaceResults(this.aiCars, this.playerCar.z, this.currentStageConfig.trackLength);
    const coinsEarned = Math.max(50, Math.round(FINISH_LINE_COINS[Math.min(position - 1, 3)] + this.coinsThisRace));

    if (position === 1) {
      this.hud.showCenterMessage('🏆 YOU WIN!', 2500);
      this.particles.emitExplosion(this.playerCar.group.position.clone().add(new THREE.Vector3(0, 3, 0)), 0xffd700, 50);
    } else {
      this.hud.showCenterMessage(`🏁 FINISHED ${['1st', '2nd', '3rd', '4th'][position - 1] || position + 'th'}`, 2500);
    }

    // Unlock next stage
    const nextStageId = this.currentStageConfig.id + 1;
    if (position <= 2 && nextStageId <= STAGES.length) {
      this.gameState.unlockStage(nextStageId);
    }

    // Add coins
    this.gameState.addCoins(coinsEarned);

    // Server sync
    this.gameState.syncWithServer('player/progress', 'PUT', {
      stage: this.currentStageConfig.id,
      coinsEarned,
      position,
      time: this.raceTime,
      unlockedStage: position <= 2 ? nextStageId : null
    });
    this.gameState.syncWithServer('leaderboard/submit', 'POST', {
      stage: this.currentStageConfig.id,
      time: this.raceTime,
      position,
      coinsEarned
    });

    setTimeout(() => {
      this.engine.stop();
      document.getElementById('touch-controls').style.display = 'none';
      document.getElementById('btn-pause').style.display = 'none';
      this.hud.hide();
      this.menus.showResults({
        results,
        coinsEarned,
        raceTime: this.raceTime,
        stage: this.currentStageConfig
      });
    }, 3000);
  }

  pauseRace() {
    if (this.racePhase !== 'racing') return;
    this.paused = true;
    this.menus.show('pause');
  }

  resumeRace() {
    this.paused = false;
    this.menus.show('__none__');
  }

  quitRace() {
    this.engine?.stop();
    this.disposeRaceObjects();
    document.getElementById('touch-controls').style.display = 'none';
    document.getElementById('btn-pause').style.display = 'none';
    this.hud.hide();
    this.racePhase = 'menu';
    this.paused = false;
  }

  disposeRaceObjects() {
    this.track?.dispose();
    this.playerCar?.dispose();
    this.aiCars.forEach(a => a.dispose());
    this.aiCars = [];
    this.obstacles?.dispose();
    this.weather?.dispose();
    this.particles?.dispose();
    this.audio?.dispose();
    // Clear scene
    if (this.engine?.scene) {
      while (this.engine.scene.children.length > 0) {
        this.engine.scene.remove(this.engine.scene.children[0]);
      }
      this.engine.setupLights();
    }
  }
}

window.addEventListener('DOMContentLoaded', () => { new TurboRacer(); });
