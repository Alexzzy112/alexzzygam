export class HUD {
  constructor() {
    this.el = {};
    this.speedometerNeedle = null;
    this.lastSpeedUpdate = 0;
    this.init();
  }

  init() {
    this.container = document.getElementById('hud');
    if (!this.container) return;
    this.container.innerHTML = `
      <div id="hud-top">
        <div id="hud-stage-info">
          <span id="hud-stage-name">Stage 1</span>
          <div id="hud-progress-bar-wrap"><div id="hud-progress-bar"></div></div>
        </div>
        <div id="hud-race-info">
          <span id="hud-position">POS: 1st</span>
          <span id="hud-timer">00:00</span>
          <span id="hud-coins-display">🪙 0</span>
        </div>
      </div>
      <div id="hud-bottom">
        <div id="hud-health-wrap">
          <div class="hud-label">SHIELD</div>
          <div id="hud-health-bar-bg"><div id="hud-health-bar"></div></div>
        </div>
        <div id="hud-speedometer">
          <canvas id="speed-canvas" width="130" height="130"></canvas>
          <div id="hud-speed-text">0</div>
          <div id="hud-speed-unit">KM/H</div>
        </div>
        <div id="hud-nitro-wrap">
          <div class="hud-label">NITRO</div>
          <div id="hud-nitro-bar-bg"><div id="hud-nitro-bar"></div></div>
        </div>
      </div>
      <div id="hud-minimap-wrap">
        <canvas id="minimap-canvas" width="100" height="100"></canvas>
        <div id="hud-minimap-label">MAP</div>
      </div>
      <div id="hud-center-msg"></div>
      <div id="hud-countdown"></div>
      <div id="hud-damage-overlay"></div>
    `;
    this.el = {
      stageName: document.getElementById('hud-stage-name'),
      progressBar: document.getElementById('hud-progress-bar'),
      position: document.getElementById('hud-position'),
      timer: document.getElementById('hud-timer'),
      coinsDisplay: document.getElementById('hud-coins-display'),
      healthBar: document.getElementById('hud-health-bar'),
      nitroBar: document.getElementById('hud-nitro-bar'),
      speedText: document.getElementById('hud-speed-text'),
      speedCanvas: document.getElementById('speed-canvas'),
      minimap: document.getElementById('minimap-canvas'),
      centerMsg: document.getElementById('hud-center-msg'),
      countdown: document.getElementById('hud-countdown'),
      damageOverlay: document.getElementById('hud-damage-overlay')
    };
    this.speedCtx = this.el.speedCanvas?.getContext('2d');
    this.minimapCtx = this.el.minimap?.getContext('2d');
    this.drawSpeedometer(0);
  }

  drawSpeedometer(speed, maxSpeed = 120) {
    const ctx = this.speedCtx;
    if (!ctx) return;
    const cx = 65, cy = 72, r = 52;
    ctx.clearRect(0, 0, 130, 130);
    // Outer ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 8;
    ctx.stroke();
    // Speed arc
    const pct = Math.min(speed / maxSpeed, 1);
    const startA = Math.PI * 0.75;
    const endA = startA + pct * Math.PI * 1.5;
    const hue = (1 - pct) * 120;
    ctx.beginPath();
    ctx.arc(cx, cy, r, startA, endA);
    ctx.strokeStyle = `hsl(${hue}, 100%, 55%)`;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();
    // Tick marks
    for (let i = 0; i <= 10; i++) {
      const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
      const inner = i % 5 === 0 ? r - 16 : r - 10;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
      ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
      ctx.strokeStyle = i % 5 === 0 ? '#fff' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = i % 5 === 0 ? 2 : 1;
      ctx.stroke();
    }
    // Needle
    const needleA = Math.PI * 0.75 + pct * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(needleA) * (r - 14), cy + Math.sin(needleA) * (r - 14));
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  }

  updateMinimap(playerZ, aiCars, trackLength) {
    const ctx = this.minimapCtx;
    if (!ctx) return;
    const W = 100, H = 100;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    // Track line
    ctx.fillStyle = '#444';
    ctx.fillRect(W * 0.3, 5, W * 0.4, H - 10);
    // Player
    const py = H - 10 - (playerZ / trackLength) * (H - 20);
    ctx.fillStyle = '#00ffaa';
    ctx.beginPath();
    ctx.arc(W / 2, Math.max(5, Math.min(H - 5, py)), 5, 0, Math.PI * 2);
    ctx.fill();
    // AI
    aiCars.forEach((ai, i) => {
      const ay = H - 10 - (ai.z / trackLength) * (H - 20);
      ctx.fillStyle = `hsl(${i * 60}, 100%, 60%)`;
      ctx.beginPath();
      ctx.arc(W / 2 + (i % 2 === 0 ? -6 : 6), Math.max(5, Math.min(H - 5, ay)), 3.5, 0, Math.PI * 2);
      ctx.fill();
    });
    // Finish line
    ctx.fillStyle = '#fff';
    ctx.fillRect(W * 0.25, 3, W * 0.5, 3);
  }

  update(data) {
    const { speed, maxSpeed, health, nitro, raceTime, coins, progress, position, aiCars, trackLength, playerZ } = data;
    if (this.el.speedText) this.el.speedText.textContent = Math.round(speed);
    this.drawSpeedometer(speed, maxSpeed);
    if (this.el.healthBar) {
      const hp = Math.max(0, health) / 100;
      this.el.healthBar.style.width = `${hp * 100}%`;
      this.el.healthBar.style.background = `hsl(${hp * 120}, 100%, 45%)`;
    }
    if (this.el.nitroBar) {
      this.el.nitroBar.style.width = `${(nitro / 100) * 100}%`;
    }
    if (this.el.timer) {
      const m = Math.floor(raceTime / 60).toString().padStart(2, '0');
      const s = Math.floor(raceTime % 60).toString().padStart(2, '0');
      this.el.timer.textContent = `${m}:${s}`;
    }
    if (this.el.coinsDisplay) this.el.coinsDisplay.textContent = `🪙 ${coins}`;
    if (this.el.progressBar) this.el.progressBar.style.width = `${Math.min(progress * 100, 100)}%`;
    const ordinals = ['1st', '2nd', '3rd', '4th', '5th'];
    if (this.el.position) this.el.position.textContent = `POS: ${ordinals[Math.min(position - 1, 4)] || position + 'th'}`;
    this.updateMinimap(playerZ, aiCars, trackLength);
  }

  showCountdown(val) {
    if (!this.el.countdown) return;
    this.el.countdown.textContent = val;
    this.el.countdown.style.display = 'block';
    this.el.countdown.className = val === 'GO!' ? 'go' : '';
    if (val === 'GO!') setTimeout(() => { if (this.el.countdown) this.el.countdown.style.display = 'none'; }, 900);
  }

  showCenterMessage(msg, duration = 2000) {
    if (!this.el.centerMsg) return;
    this.el.centerMsg.textContent = msg;
    this.el.centerMsg.style.display = 'block';
    this.el.centerMsg.style.opacity = '1';
    setTimeout(() => {
      this.el.centerMsg.style.opacity = '0';
      setTimeout(() => { this.el.centerMsg.style.display = 'none'; }, 400);
    }, duration);
  }

  flashDamage() {
    if (!this.el.damageOverlay) return;
    this.el.damageOverlay.style.opacity = '0.5';
    setTimeout(() => { this.el.damageOverlay.style.opacity = '0'; }, 300);
  }

  setStageName(name) { if (this.el.stageName) this.el.stageName.textContent = name; }

  show() { if (this.container) this.container.style.display = 'block'; }
  hide() { if (this.container) this.container.style.display = 'none'; }
}
