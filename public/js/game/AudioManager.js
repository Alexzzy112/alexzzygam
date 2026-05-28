export class AudioManager {
  constructor() {
    this.ctx = null;
    this.sounds = {};
    this.bgmGain = null;
    this.sfxGain = null;
    this.bgmSource = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.35;
      this.bgmGain.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.7;
      this.sfxGain.connect(this.ctx.destination);
      this.startEngine();
      this.initialized = true;
    } catch (e) { console.warn('Audio not available:', e); }
  }

  startEngine() {
    if (!this.ctx) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 60;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.035;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 400;
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
  }

  updateEngine(speed, maxSpeed) {
    if (!this.engineOsc || this.muted) return;
    const norm = Math.min(speed / maxSpeed, 1);
    const freq = 55 + norm * 220;
    const vol = 0.025 + norm * 0.05;
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.1);
    this.engineGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
  }

  playNitro() { this.playTone(200, 'sine', 0.06, 0.3); }

  playCollision() {
    this.playTone(80, 'square', 0.2, 0.15);
    setTimeout(() => this.playTone(60, 'sawtooth', 0.15, 0.2), 80);
  }

  playCoinCollect() { this.playTone(880, 'sine', 0.08, 0.12); setTimeout(() => this.playTone(1100, 'sine', 0.06, 0.1), 80); }

  playCountdown() { this.playTone(440, 'sine', 0.2, 0.25); }

  playCountdownGo() {
    this.playTone(880, 'sine', 0.3, 0.1);
    setTimeout(() => this.playTone(1100, 'sine', 0.25, 0.15), 100);
    setTimeout(() => this.playTone(1320, 'sine', 0.2, 0.3), 220);
  }

  playFinish() {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 'sine', 0.25, 0.35), i * 120);
    });
  }

  playTireScreech() { this.playNoise(0.1, 0.25, 1800, 'bandpass'); }

  playNoise(vol, dur, freq, filterType) {
    if (!this.ctx || this.muted) return;
    const bufSize = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start();
    src.stop(this.ctx.currentTime + dur);
  }

  playTone(freq, type, vol, dur) {
    if (!this.ctx || this.muted) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(this.ctx.currentTime + dur);
  }

  startBGM(envType) {
    if (!this.ctx || this.muted) return;
    if (this.bgmOsc) { this.bgmOsc.stop(); }
    // Simple procedural BGM drone
    const freqs = { city: 130.8, highway: 146.8, desert: 123.5, forest: 110, mountain: 138.6, bridge: 155.6, night: 103.8, storm: 92.5 };
    const baseFreq = freqs[envType] || 130.8;
    this.bgmOsc = this.ctx.createOscillator();
    this.bgmOsc.type = 'triangle';
    this.bgmOsc.frequency.value = baseFreq;
    const bgmFilter = this.ctx.createBiquadFilter();
    bgmFilter.type = 'lowpass';
    bgmFilter.frequency.value = 600;
    this.bgmOsc.connect(bgmFilter);
    bgmFilter.connect(this.bgmGain);
    this.bgmOsc.start();
  }

  setMuted(val) {
    this.muted = val;
    if (this.ctx) {
      this.bgmGain.gain.value = val ? 0 : 0.35;
      this.sfxGain.gain.value = val ? 0 : 0.7;
      this.engineGain && (this.engineGain.gain.value = val ? 0 : 0.035);
    }
  }

  dispose() {
    try {
      this.engineOsc?.stop();
      this.bgmOsc?.stop();
    } catch {}
  }
}
