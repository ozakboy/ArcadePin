// Small 2D vector type + shared helpers. No DOM dependencies (Node-checkable).

export class Vec2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  clone() { return new Vec2(this.x, this.y); }
  add(v) { return new Vec2(this.x + v.x, this.y + v.y); }
  sub(v) { return new Vec2(this.x - v.x, this.y - v.y); }
  scale(s) { return new Vec2(this.x * s, this.y * s); }
  dot(v) { return this.x * v.x + this.y * v.y; }
  len() { return Math.hypot(this.x, this.y); }
  lenSq() { return this.x * this.x + this.y * this.y; }
  perp() { return new Vec2(-this.y, this.x); }   // 90deg CCW in math space
  normalize() {
    const l = this.len();
    return l > 1e-9 ? new Vec2(this.x / l, this.y / l) : new Vec2(0, 0);
  }
}

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

// Closest point on segment AB to point P.
export function closestPointOnSegment(p, a, b) {
  const ab = b.sub(a);
  const lenSq = ab.lenSq();
  if (lenSq < 1e-9) return a.clone();
  let t = p.sub(a).dot(ab) / lenSq;
  t = clamp(t, 0, 1);
  return new Vec2(a.x + ab.x * t, a.y + ab.y * t);
}

// RFC4122-ish v4 UUID using crypto when available.
export function uuidv4() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Deterministic, fast non-cryptographic hash (FNV-1a, 32-bit) returned as hex.
export function fnv1aHex(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

// Integrity stamp for a score record (order-stable).
export function scoreSignature(record, salt) {
  const base = [
    record.playerId, record.playerName, record.score,
    record.maxCombo, record.playTimeSeconds, record.timestamp, salt
  ].join('|');
  return fnv1aHex(base);
}

export function formatScore(n) {
  return Math.round(n).toLocaleString('en-US');
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function formatDate(ts) {
  const d = new Date(ts);
  const pad = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
