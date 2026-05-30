import { STAGES } from '../config/stages.js';
import { CARS } from '../config/cars.js';

export class Menus {
  constructor(gameState, onStartRace, onGarage, onLeaderboard) {
    this.gameState = gameState;
    this.onStartRace = onStartRace;
    this.onGarage = onGarage;
    this.onLeaderboard = onLeaderboard;
    this.currentScreen = 'loading';
    this.screens = {};
    this.init();
  }

  init() {
    this.screens = {
      loading: document.getElementById('screen-loading'),
      home: document.getElementById('screen-home'),
      auth: document.getElementById('screen-auth'),
      stageSelect: document.getElementById('screen-stage-select'),
      carSelect: document.getElementById('screen-car-select'),
      garage: document.getElementById('screen-garage'),
      results: document.getElementById('screen-results'),
      leaderboard: document.getElementById('screen-leaderboard'),
      pause: document.getElementById('screen-pause'),
    };
    this.bindHomeEvents();
    this.bindAuthEvents();
  }

  playSound(name) {
    const a = window.audioManager;
    if (!a) return;
    if (name === 'click') a.playMenuClick();
    else if (name === 'hover') a.playMenuHover();
    else if (name === 'back') a.playMenuBack();
    else if (name === 'confirm') a.playMenuConfirm();
    else if (name === 'coin') a.playCoinDrop();
  }

  show(screenName) {
    Object.values(this.screens).forEach(s => { if (s) s.classList.remove('active'); });
    if (this.screens[screenName]) {
      this.screens[screenName].classList.add('active');
      this.currentScreen = screenName;
    }
    // Toggle ad
    const adEl = document.getElementById('ad-container');
    if (adEl) {
      const showAd = ['home', 'stageSelect', 'carSelect', 'garage', 'leaderboard', 'results'].includes(screenName);
      adEl.style.display = showAd && window.innerWidth >= 360 ? 'block' : 'none';
    }
  }

  bindHomeEvents() {
    const playBtn = document.getElementById('btn-play');
    const garageBtn = document.getElementById('btn-garage');
    const lbBtn = document.getElementById('btn-leaderboard');
    const loginBtn = document.getElementById('btn-login');
    const logoutBtn = document.getElementById('btn-logout');
    const muteBtn = document.getElementById('btn-mute');

    playBtn?.addEventListener('click', () => { this.playSound('click'); this.show('stageSelect'); });
    garageBtn?.addEventListener('click', () => { this.playSound('click'); this.buildGarageUI(); this.show('garage'); });
    lbBtn?.addEventListener('click', () => { this.playSound('click'); this.loadLeaderboard(); this.show('leaderboard'); });
    loginBtn?.addEventListener('click', () => { this.playSound('click'); this.show('auth'); });
    logoutBtn?.addEventListener('click', () => { this.playSound('back'); this.gameState.logout(); this.refreshHomeUI(); });
    muteBtn?.addEventListener('click', () => {
      this.playSound('click');
      window.audioManager?.setMuted(!window.audioManager?.muted);
      if (muteBtn) muteBtn.textContent = window.audioManager?.muted ? '🔇' : '🔊';
    });

    document.getElementById('btn-back-stages')?.addEventListener('click', () => { this.playSound('back'); this.show('home'); });
    document.getElementById('btn-back-cars')?.addEventListener('click', () => { this.playSound('back'); this.show('stageSelect'); });
    document.getElementById('btn-back-garage')?.addEventListener('click', () => { this.playSound('back'); this.show('home'); });
    document.getElementById('btn-back-lb')?.addEventListener('click', () => { this.playSound('back'); this.show('home'); });
    document.getElementById('btn-resume')?.addEventListener('click', () => { this.playSound('click'); window.dispatchEvent(new CustomEvent('game:resume')); });
    document.getElementById('btn-quit-race')?.addEventListener('click', () => { this.playSound('back'); window.dispatchEvent(new CustomEvent('game:quit')); this.show('home'); });

    // Leaderboard tabs
    document.querySelectorAll('.lb-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.playSound('click');
        document.querySelectorAll('.lb-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const stage = tab.dataset.stage;
        this.loadLeaderboard(stage);
      });
    });

    // Leaderboard refresh
    document.getElementById('btn-lb-refresh')?.addEventListener('click', () => {
      this.playSound('click');
      const activeTab = document.querySelector('.lb-tab.active');
      this.loadLeaderboard(activeTab?.dataset?.stage || 'global');
    });

    // Add hover sound to buttons
    document.querySelectorAll('.btn-primary, .btn-secondary, .btn-icon, .btn-back, .lb-tab').forEach(btn => {
      btn.addEventListener('mouseenter', () => this.playSound('hover'));
    });
  }

  bindAuthEvents() {
    const loginTab = document.getElementById('tab-login');
    const regTab = document.getElementById('tab-register');
    const loginForm = document.getElementById('form-login');
    const regForm = document.getElementById('form-register');
    const guestBtn = document.getElementById('btn-guest');
    const backAuth = document.getElementById('btn-back-auth');

    loginTab?.addEventListener('click', () => { this.playSound('click'); loginTab.classList.add('active'); regTab?.classList.remove('active'); loginForm.style.display = 'flex'; regForm.style.display = 'none'; });
    regTab?.addEventListener('click', () => { this.playSound('click'); regTab.classList.add('active'); loginTab?.classList.remove('active'); regForm.style.display = 'flex'; loginForm.style.display = 'none'; });
    backAuth?.addEventListener('click', () => { this.playSound('back'); this.show('home'); });

    loginForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const email = document.getElementById('login-email').value;
      const password = document.getElementById('login-pass').value;
      await this.doLogin(email, password);
    });

    regForm?.addEventListener('submit', async e => {
      e.preventDefault();
      const username = document.getElementById('reg-user').value;
      const email = document.getElementById('reg-email').value;
      const password = document.getElementById('reg-pass').value;
      await this.doRegister(username, email, password);
    });

    guestBtn?.addEventListener('click', async () => {
      const res = await fetch('/api/auth/guest', { method: 'POST' });
      const data = await res.json();
      this.gameState.setPlayer(data, null);
      this.refreshHomeUI();
      this.show('home');
    });
  }

  async doLogin(email, password) {
    const msgEl = document.getElementById('auth-msg');
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      const data = await res.json();
      if (!res.ok) { if (msgEl) msgEl.textContent = data.message; return; }
      this.gameState.setPlayer(data, data.token);
      this.refreshHomeUI();
      this.show('home');
    } catch { if (msgEl) msgEl.textContent = 'Connection error'; }
  }

  async doRegister(username, email, password) {
    const msgEl = document.getElementById('auth-msg-reg');
    try {
      const res = await fetch('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, email, password }) });
      const data = await res.json();
      if (!res.ok) { if (msgEl) msgEl.textContent = data.message; return; }
      this.gameState.setPlayer(data, data.token);
      this.refreshHomeUI();
      this.show('home');
    } catch { if (msgEl) msgEl.textContent = 'Connection error'; }
  }

  refreshHomeUI() {
    const p = this.gameState.player;
    const userDisplay = document.getElementById('home-user-display');
    const loginBtn = document.getElementById('btn-login');
    const logoutBtn = document.getElementById('btn-logout');
    const coinDisplay = document.getElementById('home-coins');
    if (p) {
      if (userDisplay) userDisplay.textContent = `👤 ${p.username}`;
      if (loginBtn) loginBtn.style.display = 'none';
      if (logoutBtn) logoutBtn.style.display = 'inline-block';
      if (coinDisplay) coinDisplay.textContent = `🪙 ${p.coins || 0}`;
    } else {
      if (userDisplay) userDisplay.textContent = '';
      if (loginBtn) loginBtn.style.display = 'inline-block';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (coinDisplay) coinDisplay.textContent = '';
    }
    this.buildStageSelectUI();
  }

  buildStageSelectUI() {
    const grid = document.getElementById('stages-grid');
    if (!grid) return;
    grid.innerHTML = '';
    STAGES.forEach(stage => {
      const unlocked = this.gameState.isStageUnlocked(stage.id);
      const card = document.createElement('div');
      card.className = `stage-card ${unlocked ? '' : 'locked'}`;
      card.dataset.stageId = stage.id;
      const envEmojis = { city: '🏙️', highway: '🛣️', desert: '🏜️', forest: '🌲', mountain: '⛰️', bridge: '🌉', night: '🌃', storm: '⛈️' };
      card.innerHTML = `
        <div class="stage-env-icon">${envEmojis[stage.environment] || '🏁'}</div>
        <div class="stage-id">STAGE ${stage.id}</div>
        <div class="stage-name">${stage.name}</div>
        <div class="stage-desc">${stage.description}</div>
        <div class="stage-meta">
          <span>🏁 ${(stage.trackLength / 1000).toFixed(1)}km</span>
          <span>🤖 ${stage.aiCount} AI</span>
          <span>🌦️ ${stage.weather}</span>
        </div>
        <div class="stage-reward">🏆 ${stage.reward} coins</div>
        ${!unlocked ? `<div class="stage-lock">🔒 ${stage.unlockCost} coins</div>` : '<div class="stage-start-hint">▶ RACE</div>'}
      `;
      if (unlocked) {
        card.addEventListener('click', () => {
          this.playSound('click');
          this.gameState.stage = stage;
          this.buildCarSelectUI(stage);
          this.show('carSelect');
        });
      } else {
        card.addEventListener('click', () => {
          const coins = this.gameState.player?.coins || 0;
          if (coins >= stage.unlockCost) {
            this.playSound('coin');
            this.gameState.player.coins -= stage.unlockCost;
            this.gameState.unlockStage(stage.id);
            this.buildStageSelectUI();
          } else {
            this.playSound('back');
            this.showNotification(`Need ${stage.unlockCost} 🪙 to unlock!`);
          }
        });
      }
      grid.appendChild(card);
    });
  }

  buildCarSelectUI(stage) {
    const grid = document.getElementById('cars-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const unlockedCars = this.gameState.player?.unlockedCars || ['speedster'];
    const selectedCar = this.gameState.player?.selectedCar || 'speedster';
    CARS.forEach(car => {
      const owned = unlockedCars.includes(car.id);
      const card = document.createElement('div');
      card.className = `car-card ${owned ? '' : 'locked'} ${car.id === selectedCar ? 'selected' : ''}`;
      card.innerHTML = `
        <div class="car-preview" style="background:hsl(${Math.round(car.color / 0xffffff * 360)},70%,45%)">
          <div class="car-shape"></div>
        </div>
        <div class="car-name">${car.name}</div>
        <div class="car-desc">${car.description}</div>
        <div class="car-stats">
          ${Object.entries(car.stats).map(([k, v]) => `<div class="stat-row"><span>${k.toUpperCase()}</span><div class="stat-bar"><div style="width:${v * 10}%"></div></div></div>`).join('')}
        </div>
        ${!owned ? `<div class="car-price">🪙 ${car.price}</div>` : `<div class="car-owned">${car.id === selectedCar ? '✅ SELECTED' : '✔ OWNED'}</div>`}
      `;
      card.addEventListener('click', () => {
        if (!owned) {
          const coins = this.gameState.player?.coins || 0;
          if (coins >= car.price) {
            this.playSound('coin');
            this.gameState.player.coins -= car.price;
            this.gameState.player.unlockedCars.push(car.id);
            this.gameState.player.selectedCar = car.id;
            this.gameState.save();
            this.buildCarSelectUI(stage);
          } else { this.playSound('back'); this.showNotification(`Need ${car.price} 🪙!`); }
        } else {
          this.playSound('click');
          this.gameState.player.selectedCar = car.id;
          this.gameState.save();
          this.buildCarSelectUI(stage);
        }
      });
      grid.appendChild(card);
    });

    document.getElementById('btn-start-race')?.removeEventListener('click', this._startRaceFn);
    this._startRaceFn = () => {
      const carId = this.gameState.player?.selectedCar || 'speedster';
      const carCfg = CARS.find(c => c.id === carId) || CARS[0];
      this.onStartRace(stage, carCfg);
    };
    document.getElementById('btn-start-race')?.addEventListener('click', this._startRaceFn);
  }

  buildGarageUI() {
    const container = document.getElementById('garage-container');
    if (!container) return;
    const upgrades = this.gameState.player?.garageUpgrades || { speed: 1, handling: 1, nitro: 1, armor: 1 };
    const coins = this.gameState.player?.coins || 0;
    const UPGRADE_COST_BASE = 150;
    container.innerHTML = `
      <div class="garage-coins">🪙 ${coins} coins</div>
      ${Object.entries(upgrades).map(([stat, level]) => {
        const cost = UPGRADE_COST_BASE * level;
        return `<div class="garage-stat-card">
          <div class="garage-stat-name">${stat.toUpperCase()}</div>
          <div class="garage-stat-level">Level ${level}/10</div>
          <div class="garage-stat-bar-wrap"><div class="garage-stat-bar" style="width:${level * 10}%"></div></div>
          <button class="btn-upgrade ${level >= 10 ? 'maxed' : ''}" data-stat="${stat}" data-cost="${cost}">
            ${level >= 10 ? '✅ MAXED' : `⬆ Upgrade (🪙 ${cost})`}
          </button>
        </div>`;
      }).join('')}
    `;
    container.querySelectorAll('.btn-upgrade').forEach(btn => {
      btn.addEventListener('click', async () => {
        const stat = btn.dataset.stat;
        const cost = parseInt(btn.dataset.cost);
        if (this.gameState.player.coins >= cost && this.gameState.player.garageUpgrades[stat] < 10) {
          this.playSound('coin');
          this.gameState.player.coins -= cost;
          this.gameState.player.garageUpgrades[stat]++;
          this.gameState.save();
          this.buildGarageUI();
          await this.gameState.syncWithServer('player/upgrade', 'PUT', { stat, cost });
        } else { this.playSound('back'); this.showNotification('Not enough coins!'); }
      });
    });
  }

  async loadLeaderboard(stage = 'global') {
    const container = document.getElementById('leaderboard-list');
    if (!container) return;
    container.innerHTML = '<div class="lb-loading"><div class="loading-spinner" style="margin:1rem auto;"></div>Loading...</div>';
    try {
      const url = stage === 'global' ? '/api/leaderboard/global' : `/api/leaderboard/stage/${stage}`;
      const res = await fetch(url);
      const data = await res.json();
      let html = '';
      if (!data || data.length === 0) {
        html = '<div class="lb-empty">No races yet. Be the first!</div>';
      } else {
        html = data.map((p, i) => {
          const isPlayer = this.gameState?.player && p.username === this.gameState.player.username;
          return `<div class="lb-row ${i < 3 ? 'top-' + (i + 1) : ''} ${isPlayer ? 'lb-player-row' : ''}">
            <span class="lb-rank">${['🥇', '🥈', '🥉'][i] || `#${i + 1}`}</span>
            <span class="lb-name">${p.username}${isPlayer ? ' ⭐' : ''}</span>
            <span class="lb-wins">${p.wins || (p.time ? this.formatTime(p.time) : '0')} ${p.wins !== undefined ? 'wins' : ''}</span>
            <span class="lb-coins">${p.coins !== undefined ? '🪙 ' + p.coins : ''}</span>
          </div>`;
        }).join('');
      }
      // Show player's best time if stage-specific and player is logged in
      if (stage !== 'global' && this.gameState?.player?.bestTimes?.[stage]) {
        const best = this.gameState.player.bestTimes[stage];
        const m = Math.floor(best / 60).toString().padStart(2, '0');
        const s = Math.floor(best % 60).toString().padStart(2, '0');
        html += `<div class="lb-personal-best">🏁 Your Best: ${m}:${s}</div>`;
      }
      container.innerHTML = html;
    } catch { container.innerHTML = '<div class="lb-error">Failed to load leaderboard</div>'; }
  }

  showResults(raceData) {
    const { results, coinsEarned, raceTime, stage } = raceData;
    const container = document.getElementById('results-content');
    if (!container) return;
    const playerResult = results.find(r => r.isPlayer);
    const m = Math.floor(raceTime / 60).toString().padStart(2, '0');
    const s = Math.floor(raceTime % 60).toString().padStart(2, '0');
    const ordinals = ['1st 🥇', '2nd 🥈', '3rd 🥉', '4th', '5th'];
    container.innerHTML = `
      <div class="results-header">
        <div class="results-pos">${ordinals[(playerResult?.position || 1) - 1]}</div>
        <div class="results-stage">${stage.name}</div>
      </div>
      <div class="results-time">⏱️ ${m}:${s}</div>
      <div class="results-coins">+🪙 ${coinsEarned}</div>
      <div class="results-ranking">
        ${results.map(r => `<div class="results-row ${r.isPlayer ? 'player-row' : ''}">
          <span>${ordinals[r.position - 1]}</span>
          <span>${r.name}</span>
        </div>`).join('')}
      </div>
    `;
    if (this._nextStageFn) document.getElementById('btn-next-stage')?.removeEventListener('click', this._nextStageFn);
    if (this._retryStageFn) document.getElementById('btn-retry-stage')?.removeEventListener('click', this._retryStageFn);
    if (this._resultsHomeFn) document.getElementById('btn-results-home')?.removeEventListener('click', this._resultsHomeFn);
    this._nextStageFn = () => {
      const nextStage = STAGES.find(s => s.id === stage.id + 1);
      if (nextStage) { this.gameState.stage = nextStage; this.show('carSelect'); this.buildCarSelectUI(nextStage); }
      else { this.show('home'); }
    };
    this._retryStageFn = () => {
      const carId = this.gameState.player?.selectedCar || 'speedster';
      const carCfg = CARS.find(c => c.id === carId) || CARS[0];
      this.onStartRace(stage, carCfg);
    };
    this._resultsHomeFn = () => this.show('home');
    document.getElementById('btn-next-stage')?.addEventListener('click', this._nextStageFn);
    document.getElementById('btn-retry-stage')?.addEventListener('click', this._retryStageFn);
    document.getElementById('btn-results-home')?.addEventListener('click', this._resultsHomeFn);
    this.show('results');
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  showNotification(msg) {
    let notif = document.getElementById('global-notif');
    if (!notif) { notif = document.createElement('div'); notif.id = 'global-notif'; document.body.appendChild(notif); }
    notif.textContent = msg;
    notif.className = 'notif-show';
    clearTimeout(this._notifTimer);
    this._notifTimer = setTimeout(() => { notif.className = ''; }, 2500);
  }
}
