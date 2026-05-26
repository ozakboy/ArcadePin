// Game entities: rendering + per-entity state. Physics resolution lives in physics.js.

import { Vec2 } from './utils.js';

function neonStroke(ctx, color, width, glow) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = color;
  ctx.shadowBlur = glow;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

export class Ball {
  constructor(x, y, radius) {
    this.pos = new Vec2(x, y);
    this.vel = new Vec2(0, 0);
    this.radius = radius;
    this.trail = [];
  }
  recordTrail() {
    this.trail.push(this.pos.clone());
    if (this.trail.length > 10) this.trail.shift();
  }
  draw(ctx) {
    // motion trail
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const a = (i / this.trail.length) * 0.35;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.radius * (0.4 + 0.6 * i / this.trail.length), 0, Math.PI * 2);
      ctx.fillStyle = '#7fdfff';
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.shadowColor = '#aef3ff';
    ctx.shadowBlur = 18;
    const g = ctx.createRadialGradient(
      this.pos.x - this.radius * 0.3, this.pos.y - this.radius * 0.3, 1,
      this.pos.x, this.pos.y, this.radius
    );
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.5, '#cdeeff');
    g.addColorStop(1, '#3aa6d6');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Segment {
  constructor(ax, ay, bx, by, opts = {}) {
    this.a = new Vec2(ax, ay);
    this.b = new Vec2(bx, by);
    this.radius = opts.radius ?? 5;
    this.restitution = opts.restitution ?? 0.42;
    this.color = opts.color ?? '#2bd1ff';
    this.kind = opts.kind ?? 'wall';   // 'wall' | 'sling'
    this.score = opts.score ?? 0;
    this.oneWay = opts.oneWay ?? null; // Vec2: only blocks balls moving this way
    this.flash = 0;
  }
  hitFlash() { this.flash = 1; }
  update(dt) { if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 5); }
  draw(ctx) {
    ctx.save();
    const lit = this.kind === 'sling' && this.flash > 0;
    const color = lit ? '#ffffff' : this.color;
    neonStroke(ctx, color, this.radius * 2, lit ? 30 : 12);
    ctx.beginPath();
    ctx.moveTo(this.a.x, this.a.y);
    ctx.lineTo(this.b.x, this.b.y);
    ctx.stroke();
    ctx.restore();
  }
}

export class Bumper {
  constructor(x, y, radius, opts = {}) {
    this.pos = new Vec2(x, y);
    this.radius = radius;
    this.restitution = opts.restitution ?? 1.0;
    this.impulse = opts.impulse ?? 300;
    this.score = opts.score ?? 100;
    this.color = opts.color ?? '#ff37c0';
    this.flash = 0;
  }
  hitFlash() { this.flash = 1; }
  update(dt) { if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4); }
  draw(ctx) {
    ctx.save();
    const pulse = 1 + this.flash * 0.18;
    const r = this.radius * pulse;
    // outer glow ring
    neonStroke(ctx, this.color, 4, 22 + this.flash * 20);
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, r, 0, Math.PI * 2);
    ctx.stroke();
    // inner core
    const g = ctx.createRadialGradient(this.pos.x, this.pos.y, 2, this.pos.x, this.pos.y, r);
    g.addColorStop(0, this.flash > 0.3 ? '#ffffff' : '#5a1240');
    g.addColorStop(1, 'rgba(255,55,192,0.12)');
    ctx.shadowBlur = 0;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, r - 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class Flipper {
  constructor(conf, color = '#ffd23f') {
    this.pivot = new Vec2(conf.pivotX, conf.pivotY);
    this.length = conf.length;
    this.radius = conf.radius;
    this.restAngle = conf.restAngle;
    this.activeAngle = conf.activeAngle;
    this.angle = conf.restAngle;
    this.omega = 0;
    this.active = false;
    this.angularSpeed = conf.angularSpeed;
    this.restitution = conf.restitution;
    this.kick = conf.kick;
    this.color = color;
  }
  tip() {
    return new Vec2(
      this.pivot.x + Math.cos(this.angle) * this.length,
      this.pivot.y + Math.sin(this.angle) * this.length
    );
  }
  update(dt) {
    const target = this.active ? this.activeAngle : this.restAngle;
    const prev = this.angle;
    const maxStep = this.angularSpeed * dt;
    const diff = target - this.angle;
    if (Math.abs(diff) <= maxStep) this.angle = target;
    else this.angle += Math.sign(diff) * maxStep;
    this.omega = dt > 0 ? (this.angle - prev) / dt : 0;
  }
  draw(ctx) {
    const tip = this.tip();
    ctx.save();
    neonStroke(ctx, this.color, this.radius * 2, this.active ? 26 : 14);
    ctx.beginPath();
    ctx.moveTo(this.pivot.x, this.pivot.y);
    ctx.lineTo(tip.x, tip.y);
    ctx.stroke();
    // pivot hub
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff7d6';
    ctx.beginPath();
    ctx.arc(this.pivot.x, this.pivot.y, this.radius + 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class BlackHole {
  constructor(x, y, opts = {}) {
    this.pos = new Vec2(x, y);
    this.radius = opts.radius ?? 26;
    this.influence = opts.influence ?? 80;
    this.pull = opts.pull ?? 2000;
    this.holdTime = opts.holdTime ?? 0.55;
    this.ejectMin = opts.ejectMin ?? 2050;
    this.ejectMax = opts.ejectMax ?? 2350;
    this.ejectSpread = opts.ejectSpread ?? 0.7;
    this.score = opts.score ?? 250;
    this.color = opts.color ?? '#a35bff';
    this.phase = Math.random() * Math.PI * 2;
    this.flash = 0;
  }
  hitFlash() { this.flash = 1; }
  update(dt) { this.phase += dt * 6; if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2); }
  draw(ctx) {
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    // swirling accretion arcs
    ctx.strokeStyle = this.color;
    ctx.shadowColor = this.color;
    ctx.shadowBlur = 24 + this.flash * 30;
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.55 - i * 0.14;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 6 + i * 5, this.phase + i * 2, this.phase + i * 2 + Math.PI * 1.4);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // dark core
    ctx.shadowBlur = 16;
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, this.radius);
    g.addColorStop(0, '#000008');
    g.addColorStop(0.7, '#0b0524');
    g.addColorStop(1, this.color);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
