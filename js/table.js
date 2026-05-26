// Playfield geometry. All coordinates are in the logical 600x1000 space.
// Tweak freely here without touching the engine.

import { Segment, Bumper, Flipper, BlackHole } from './entities.js';
import { Vec2 } from './utils.js';
import { CONFIG } from './config.js';

export function buildTable() {
  const wall = (ax, ay, bx, by, opts) =>
    new Segment(ax, ay, bx, by, { restitution: CONFIG.physics.wallRestitution, color: '#2bd1ff', ...opts });

  const segments = [
    // left wall + top dome + launch-lane outer wall (one continuous barrier)
    wall(35, 90, 35, 860),
    wall(35, 90, 150, 52),
    wall(150, 52, 300, 40),
    wall(300, 40, 450, 52),
    wall(450, 52, 575, 140),
    wall(575, 140, 575, 975),           // launch-lane outer wall
    wall(545, 975, 575, 975),           // launch-lane floor

    // inner wall separating play area from the launch lane (open at the top)
    wall(545, 180, 545, 860),

    // one-way gate across the lane entrance: blocks balls trying to re-enter
    // the lane (moving +x) but lets the launched ball pass out (moving -x).
    new Segment(547, 138, 547, 188, {
      radius: 4, restitution: 0.4, color: 'rgba(120,200,255,0.22)', oneWay: new Vec2(1, 0)
    }),

    // lower funnels guiding the ball toward the flippers
    wall(35, 860, 190, 930),
    wall(545, 860, 410, 930),

    // slingshots (bouncy kickers above each flipper)
    new Segment(150, 760, 210, 855, { kind: 'sling', restitution: 1.15, score: CONFIG.scoring.slingBase, color: '#39ff8b' }),
    new Segment(450, 760, 390, 855, { kind: 'sling', restitution: 1.15, score: CONFIG.scoring.slingBase, color: '#39ff8b' })
  ];

  const B = CONFIG.scoring.bumperBase;
  const bumpers = [
    new Bumper(300, 150, 30, { impulse: 320, score: B + 50, color: '#ffb02e' }),
    new Bumper(185, 210, 26, { impulse: 300, score: B, color: '#ff37c0' }),
    new Bumper(415, 210, 26, { impulse: 300, score: B, color: '#ff37c0' }),
    new Bumper(110, 310, 24, { impulse: 290, score: B, color: '#2bd1ff' }),
    new Bumper(300, 290, 28, { impulse: 320, score: B, color: '#ff37c0' }),
    new Bumper(490, 310, 24, { impulse: 290, score: B, color: '#2bd1ff' }),
    new Bumper(200, 400, 24, { impulse: 290, score: B, color: '#7a5cff' }),
    new Bumper(400, 400, 24, { impulse: 290, score: B, color: '#7a5cff' }),
    new Bumper(300, 500, 26, { impulse: 300, score: B, color: '#ffb02e' }),
    new Bumper(130, 540, 22, { impulse: 280, score: B, color: '#2bd1ff' }),
    new Bumper(470, 540, 22, { impulse: 280, score: B, color: '#2bd1ff' }),
    new Bumper(300, 640, 24, { impulse: 300, score: B, color: '#ff37c0' })
  ];

  const bh = CONFIG.blackHole;
  const blackHoles = [
    new BlackHole(185, 470, { ...bh }),
    new BlackHole(415, 470, { ...bh })
  ];

  const fl = CONFIG.flipper;
  const flippers = {
    left: new Flipper({ ...fl.left, length: fl.length, radius: fl.radius,
      angularSpeed: fl.angularSpeed, restitution: fl.restitution, kick: fl.kick }),
    right: new Flipper({ ...fl.right, length: fl.length, radius: fl.radius,
      angularSpeed: fl.angularSpeed, restitution: fl.restitution, kick: fl.kick })
  };

  return { segments, bumpers, blackHoles, flippers };
}
