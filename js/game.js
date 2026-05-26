// Core game: fixed-step physics loop, state machine, scoring, neon rendering.

import { CONFIG } from './config.js';
import { Vec2, clamp, formatScore } from './utils.js';
import { Ball } from './entities.js';
import { buildTable } from './table.js';
import { integrate, collideSegment, collideBumper, collideFlipper } from './physics.js';

const STATE = { IDLE: 'idle', LAUNCH: 'launch', PLAY: 'play', OVER: 'over' };

export class Game {
  constructor(canvas, { audio, input }) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.audio = audio;
    this.input = input;
    this.W = CONFIG.width;
    this.H = CONFIG.height;

    this.table = buildTable();
    this.ball = new Ball(CONFIG.launcher.restX, CONFIG.launcher.restY, CONFIG.physics.ballRadius);

    this.state = STATE.IDLE;
    this.onGameOver = null;
    this.paused = false;

    this.acc = 0;
    this.t = 0;
    this.lastTime = 0;
    this.shake = 0;
    this.popups = [];
    this._wallSoundT = 0;

    this._resetRunState();
  }

  _resetRunState() {
    this.score = 0;
    this.lives = CONFIG.scoring.ballsPerGame;
    this.combo = 0;
    this.comboMax = 0;
    this.multiplier = 1;
    this.elapsed = 0;
    this.lastHitTime = -999;
    this.power = CONFIG.launcher.minPower;
    this.charging = false;
    this.stuckTimer = 0;
    this.popups.length = 0;
  }

  newGame() {
    this._resetRunState();
    this._attachToLauncher();
  }

  isOver() { return this.state === STATE.OVER; }
  isIdle() { return this.state === STATE.IDLE; }

  _attachToLauncher() {
    this.state = STATE.LAUNCH;
    this.ball.pos = new Vec2(CONFIG.launcher.restX, CONFIG.launcher.restY);
    this.ball.vel = new Vec2(0, 0);
    this.ball.trail.length = 0;
    this.power = CONFIG.launcher.minPower;
    this.charging = false;
  }

  _fireLaunch() {
    this.ball.vel = new Vec2((Math.random() - 0.5) * 50, -this.power);
    this.state = STATE.PLAY;
    this.charging = false;
    this.power = CONFIG.launcher.minPower;
    this.audio.launch();
  }

  // --------------------------------------------------------------- main update
  update(now) {
    if (!this.lastTime) this.lastTime = now;
    if (this.paused) { this.lastTime = now; return; }
    let frameDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    frameDt = clamp(frameDt, 0, 0.05);

    this._handleLaunch(frameDt);

    const FIXED = CONFIG.physics.fixedDt;
    this.acc += frameDt;
    let steps = 0;
    while (this.acc >= FIXED && steps < CONFIG.physics.maxStepsPerFrame) {
      this._step(FIXED);
      this.acc -= FIXED;
      steps++;
    }
    if (steps === CONFIG.physics.maxStepsPerFrame) this.acc = 0;

    this._updateVisuals(frameDt);
  }

  _handleLaunch(dt) {
    if (this.state !== STATE.LAUNCH) return;
    this.ball.vel = new Vec2(0, 0);
    if (this.input.launch) {
      this.charging = true;
      this.power = clamp(this.power + CONFIG.launcher.chargeRate * dt,
        CONFIG.launcher.minPower, CONFIG.launcher.maxPower);
    } else if (this.charging) {
      this._fireLaunch();
    }
  }

  _step(dt) {
    const f = this.table.flippers;
    f.left.active = this.input.left;
    f.right.active = this.input.right;
    f.left.update(dt);
    f.right.update(dt);

    if (this.state === STATE.PLAY) {
      integrate(this.ball, dt, CONFIG.physics.gravity, CONFIG.physics.maxSpeed);

      for (const seg of this.table.segments) {
        const s = collideSegment(this.ball, seg);
        if (s > 0) this._onSegment(seg, s);
      }
      for (const b of this.table.bumpers) {
        const s = collideBumper(this.ball, b);
        if (s > 0) this._onBumper(b);
      }
      if (collideFlipper(this.ball, f.left) > 0) this.audio.flipper();
      if (collideFlipper(this.ball, f.right) > 0) this.audio.flipper();

      this._clampBounds();

      if (this.ball.pos.y > 770) {
        this._loseBall();
      } else if (this.ball.pos.x > 434 && this.ball.pos.y > 735 && this.ball.vel.len() < 45) {
        this._attachToLauncher();           // rolled back into the launch lane
      } else {
        this._handleStuck(dt);
      }
      this.elapsed += dt;
    }

    this.t += dt;
    if (this.combo > 0 && (this.t - this.lastHitTime) > CONFIG.scoring.comboWindowMs / 1000) {
      this.combo = 0;
      this.multiplier = 1;
    }
  }

  _registerCombo() {
    if (this.t - this.lastHitTime <= CONFIG.scoring.comboWindowMs / 1000) this.combo++;
    else this.combo = 1;
    this.lastHitTime = this.t;
    this.comboMax = Math.max(this.comboMax, this.combo);
    this.multiplier = Math.min(
      1 + Math.floor(this.combo / CONFIG.scoring.comboPerLevel),
      CONFIG.scoring.maxMultiplier
    );
  }

  _award(base, x, y) {
    const pts = Math.round(base * this.multiplier);
    this.score += pts;
    this.popups.push({
      x, y, vy: -38, age: 0, life: 0.8,
      text: this.multiplier > 1 ? `+${pts} x${this.multiplier}` : `+${pts}`,
      color: this.multiplier > 1 ? '#ffd23f' : '#8fefff'
    });
  }

  _onSegment(seg, speed) {
    if (seg.kind === 'sling') {
      if (this.t - (seg._lastHit || -1) < 0.1) return;
      seg._lastHit = this.t;
      seg.hitFlash();
      this._registerCombo();
      this._award(seg.score, (seg.a.x + seg.b.x) / 2, (seg.a.y + seg.b.y) / 2);
      this.audio.sling();
    } else if (speed > 130 && this.t - this._wallSoundT > 0.05) {
      this._wallSoundT = this.t;
      this.audio.wall();
    }
  }

  _onBumper(b) {
    if (this.t - (b._lastHit || -1) < 0.1) return;
    b._lastHit = this.t;
    b.hitFlash();
    this._registerCombo();
    this._award(b.score, b.pos.x, b.pos.y - b.radius);
    this.audio.bumper(this.combo);
    this.shake = Math.min(this.shake + 4, 10);
  }

  _clampBounds() {
    const r = this.ball.radius, e = 0.4;
    if (this.ball.pos.x < r) { this.ball.pos.x = r; this.ball.vel.x = Math.abs(this.ball.vel.x) * e; }
    if (this.ball.pos.x > this.W - r) { this.ball.pos.x = this.W - r; this.ball.vel.x = -Math.abs(this.ball.vel.x) * e; }
    if (this.ball.pos.y < r) { this.ball.pos.y = r; this.ball.vel.y = Math.abs(this.ball.vel.y) * e; }
  }

  _handleStuck(dt) {
    const inLane = this.ball.pos.x > 434;
    if (!inLane && this.ball.vel.len() < 35) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 2.5) {
        this.ball.vel = new Vec2((Math.random() - 0.5) * 200, -260);
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }
  }

  _loseBall() {
    this.lives--;
    this.combo = 0;
    this.multiplier = 1;
    this.shake = 12;
    this.audio.drain();
    if (this.lives <= 0) {
      this.state = STATE.OVER;
      if (this.onGameOver) {
        this.onGameOver({
          score: this.score,
          maxCombo: this.comboMax,
          playTimeSeconds: Math.round(this.elapsed)
        });
      }
    } else {
      this._attachToLauncher();
      setTimeout(() => this.audio.newBall(), 120);
    }
  }

  _updateVisuals(dt) {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 40);
    if (this.state === STATE.PLAY || this.state === STATE.LAUNCH) this.ball.recordTrail();
    for (const b of this.table.bumpers) b.update(dt);
    for (const s of this.table.segments) s.update(dt);
    for (const p of this.popups) { p.age += dt; p.y += p.vy * dt; }
    this.popups = this.popups.filter((p) => p.age < p.life);
  }

  // ------------------------------------------------------------------- render
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.W, this.H);
    this._drawBackground(ctx);

    ctx.save();
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    for (const seg of this.table.segments) seg.draw(ctx);
    for (const b of this.table.bumpers) b.draw(ctx);
    this.table.flippers.left.draw(ctx);
    this.table.flippers.right.draw(ctx);
    this._drawLauncher(ctx);
    if (this.state !== STATE.IDLE) this.ball.draw(ctx);

    this._drawPopups(ctx);
    ctx.restore();

    this._drawHud(ctx);
  }

  _drawBackground(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, '#0b0f24');
    g.addColorStop(1, '#06070f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.strokeStyle = 'rgba(60,120,200,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= this.W; x += 25) { ctx.moveTo(x, 0); ctx.lineTo(x, this.H); }
    for (let y = 0; y <= this.H; y += 25) { ctx.moveTo(0, y); ctx.lineTo(this.W, y); }
    ctx.stroke();
  }

  _drawLauncher(ctx) {
    const lx = CONFIG.launcher.restX, ly = CONFIG.launcher.restY;
    const frac = (this.power - CONFIG.launcher.minPower) /
      (CONFIG.launcher.maxPower - CONFIG.launcher.minPower);
    ctx.save();
    // plunger shaft
    ctx.fillStyle = '#3aa6d6';
    ctx.shadowColor = '#2bd1ff';
    ctx.shadowBlur = 8;
    const compress = this.charging ? frac * 14 : 0;
    ctx.fillRect(lx - 9, ly + 14 + compress, 18, 786 - (ly + 14 + compress));
    // power meter
    if (this.state === STATE.LAUNCH) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(478, 560, 8, 200);
      ctx.fillStyle = frac > 0.75 ? '#ff5d5d' : '#39ff8b';
      ctx.fillRect(478, 760 - 200 * frac, 8, 200 * frac);
    }
    ctx.restore();
  }

  _drawPopups(ctx) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px "Courier New", monospace';
    for (const p of this.popups) {
      ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.restore();
  }

  _drawHud(ctx) {
    ctx.save();
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8fefff';
    ctx.shadowColor = '#2bd1ff';
    ctx.shadowBlur = 8;
    ctx.fillText(formatScore(this.score), 18, 34);

    // lives as glowing balls
    ctx.shadowColor = '#aef3ff';
    for (let i = 0; i < this.lives; i++) {
      ctx.fillStyle = '#cdeeff';
      ctx.beginPath();
      ctx.arc(this.W - 24 - i * 22, 26, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    // combo / multiplier
    if (this.combo > 1) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd23f';
      ctx.shadowColor = '#ffd23f';
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.fillText(`COMBO ${this.combo}  x${this.multiplier}`, this.W / 2, 34);
    }

    if (this.state === STATE.LAUNCH) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.shadowBlur = 6;
      ctx.font = 'bold 14px "Courier New", monospace';
      ctx.fillText('HOLD / TAP TO CHARGE — RELEASE TO LAUNCH', this.W / 2, this.H - 14);
    }
    ctx.restore();
  }
}
