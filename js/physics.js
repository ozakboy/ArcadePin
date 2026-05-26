// Collision resolution. Pure math against entity objects; no DOM. Node-checkable.

import { Vec2, closestPointOnSegment, clamp } from './utils.js';

// Integrate a ball forward one fixed step under gravity, clamping max speed.
export function integrate(ball, dt, gravity, maxSpeed) {
  ball.vel.y += gravity * dt;
  const sp = ball.vel.len();
  if (sp > maxSpeed) ball.vel = ball.vel.scale(maxSpeed / sp);
  ball.pos = ball.pos.add(ball.vel.scale(dt));
}

// Ball vs static thick segment. Returns impact speed if it collided, else 0.
export function collideSegment(ball, seg) {
  const closest = closestPointOnSegment(ball.pos, seg.a, seg.b);
  const delta = ball.pos.sub(closest);
  let dist = delta.len();
  const minDist = ball.radius + seg.radius;
  if (dist >= minDist) return 0;

  let n;
  if (dist > 1e-6) n = delta.scale(1 / dist);
  else { n = new Vec2(0, -1); dist = 0; }

  ball.pos = ball.pos.add(n.scale(minDist - dist));
  const vn = ball.vel.dot(n);
  if (vn < 0) {
    ball.vel = ball.vel.sub(n.scale((1 + seg.restitution) * vn));
    return -vn;
  }
  return 0;
}

// Ball vs circular bumper. Applies bounce + outward impulse. Returns impact speed.
export function collideBumper(ball, bumper) {
  const delta = ball.pos.sub(bumper.pos);
  let dist = delta.len();
  const minDist = ball.radius + bumper.radius;
  if (dist >= minDist) return 0;

  let n;
  if (dist > 1e-6) n = delta.scale(1 / dist);
  else { n = new Vec2(0, -1); dist = 0; }

  ball.pos = bumper.pos.add(n.scale(minDist));
  const vn = ball.vel.dot(n);
  if (vn < 0) ball.vel = ball.vel.sub(n.scale((1 + bumper.restitution) * vn));
  ball.vel = ball.vel.add(n.scale(bumper.impulse));
  return Math.max(-vn, bumper.impulse * 0.5);
}

// Ball vs rotating flipper (thick segment with surface velocity at contact).
export function collideFlipper(ball, flipper) {
  const tip = flipper.tip();
  const closest = closestPointOnSegment(ball.pos, flipper.pivot, tip);
  const delta = ball.pos.sub(closest);
  let dist = delta.len();
  const minDist = ball.radius + flipper.radius;
  if (dist >= minDist) return 0;

  let n;
  if (dist > 1e-6) n = delta.scale(1 / dist);
  else { n = new Vec2(0, -1); dist = 0; }

  // Surface velocity at the contact point: omega x r  ->  perp(r) * omega
  const r = closest.sub(flipper.pivot);
  const surfaceVel = r.perp().scale(flipper.omega);

  ball.pos = ball.pos.add(n.scale(minDist - dist));

  const relVn = ball.vel.sub(surfaceVel).dot(n);
  if (relVn < 0) {
    // reflect the relative velocity, then add the surface velocity back
    ball.vel = ball.vel.sub(n.scale((1 + flipper.restitution) * relVn));
  }
  // extra kick proportional to how hard the flipper is swinging into the ball
  const swing = clamp(Math.abs(flipper.omega), 0, 30);
  ball.vel = ball.vel.add(n.scale(flipper.kick * (swing / 30)));
  return Math.abs(relVn) + flipper.kick * (swing / 30);
}
