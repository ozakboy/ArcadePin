// Synthesized arcade sound effects via Web Audio API. No external assets.

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.master = null;
  }

  // Must be called from a user gesture to satisfy autoplay policies.
  resume() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  _blip(freq, dur, type = 'square', vol = 0.4, slide = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  bumper(combo = 0) {
    this._blip(420 + Math.min(combo, 20) * 28, 0.12, 'square', 0.45);
  }
  sling() { this._blip(660, 0.08, 'triangle', 0.4, 220); }
  flipper() { this._blip(180, 0.05, 'square', 0.25); }
  wall() { this._blip(120, 0.04, 'sine', 0.12); }
  launch() { this._blip(140, 0.35, 'sawtooth', 0.4, 520); }
  drain() { this._blip(300, 0.5, 'sawtooth', 0.45, -240); }
  gameOver() {
    this._blip(330, 0.18, 'square', 0.4);
    setTimeout(() => this._blip(247, 0.18, 'square', 0.4), 170);
    setTimeout(() => this._blip(196, 0.4, 'square', 0.4), 340);
  }
  newBall() { this._blip(523, 0.1, 'triangle', 0.35, 260); }
  blackhole() { this._blip(220, 0.28, 'sine', 0.4, -150); }
  eject() { this._blip(180, 0.3, 'sawtooth', 0.45, 760); }
}
