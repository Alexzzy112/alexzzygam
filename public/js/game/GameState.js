export class GameState {
  constructor() {
    this.player = null;
    this.stage = null;
    this.phase = 'menu'; // menu, countdown, racing, finished, paused
    this.raceTime = 0;
    this.coinsCollected = 0;
    this.finalPosition = 0;
    this.aiPositions = [];
    this.leaderboard = [];
    this.token = null;
    this.load();
  }

  load() {
    try {
      const saved = localStorage.getItem('turboracer_player');
      if (saved) {
        this.player = JSON.parse(saved);
        this.token = localStorage.getItem('turboracer_token');
      }
    } catch {}
  }

  save() {
    if (this.player) {
      localStorage.setItem('turboracer_player', JSON.stringify(this.player));
      if (this.token) localStorage.setItem('turboracer_token', this.token);
    }
  }

  setPlayer(playerData, token) {
    this.player = playerData;
    this.token = token;
    this.save();
  }

  logout() {
    this.player = null;
    this.token = null;
    localStorage.removeItem('turboracer_player');
    localStorage.removeItem('turboracer_token');
  }

  addCoins(amount) {
    this.coinsCollected += amount;
    if (this.player) {
      this.player.coins = (this.player.coins || 0) + amount;
      this.save();
    }
  }

  unlockStage(stageId) {
    if (!this.player) return;
    if (!this.player.unlockedStages.includes(stageId)) {
      this.player.unlockedStages.push(stageId);
      this.save();
    }
  }

  isStageUnlocked(stageId) {
    if (!this.player) return stageId === 1;
    return this.player.unlockedStages.includes(stageId);
  }

  async syncWithServer(endpoint, method, body) {
    if (!this.token || !this.player || this.player.isGuest) return null;
    try {
      const res = await fetch(`/api/${endpoint}`, {
        method: method || 'GET',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.token}` },
        body: body ? JSON.stringify(body) : undefined
      });
      return await res.json();
    } catch { return null; }
  }

  getRaceResults(aiCars, playerZ, trackLength) {
    const entries = [{ name: this.player?.username || 'You', z: playerZ, isPlayer: true }];
    aiCars.forEach(ai => entries.push({ name: ai.name, z: ai.z, isPlayer: false }));
    entries.sort((a, b) => b.z - a.z);
    return entries.map((e, i) => ({ ...e, position: i + 1 }));
  }
}
