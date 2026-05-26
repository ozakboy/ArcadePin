// Playfield geometry. All coordinates are in the logical 500x800 space.
// Tweak freely here without touching the engine.

import { Segment, Bumper, Flipper } from './entities.js';
import { CONFIG } from './config.js';

export function buildTable() {
  const wall = (ax, ay, bx, by, opts) =>
    new Segment(ax, ay, bx, by, { restitution: CONFIG.physics.wallRestitution, color: '#2bd1ff', ...opts });

  const segments = [
    // left wall + top dome + launch-lane outer wall (one continuous barrier)
    wall(30, 70, 30, 690),
    wall(30, 70, 120, 42),
    wall(120, 42, 250, 32),
    wall(250, 32, 380, 42),
    wall(380, 42, 470, 108),
    wall(470, 108, 470, 786),
    wall(430, 786, 470, 786),           // launch-lane floor

    // inner wall separating play area from the launch lane (open at the top)
    wall(430, 140, 430, 690),

    // lower funnels guiding the ball toward the flippers
    wall(30, 690, 150, 752),
    wall(430, 690, 350, 752),

    // slingshots (bouncy kickers above each flipper)
    new Segment(120, 610, 165, 690, { kind: 'sling', restitution: 1.15, score: CONFIG.scoring.slingBase, color: '#39ff8b' }),
    new Segment(380, 610, 335, 690, { kind: 'sling', restitution: 1.15, score: CONFIG.scoring.slingBase, color: '#39ff8b' })
  ];

  const bumpers = [
    new Bumper(175, 250, 30, { impulse: 300, score: CONFIG.scoring.bumperBase, color: '#ff37c0' }),
    new Bumper(325, 250, 30, { impulse: 300, score: CONFIG.scoring.bumperBase, color: '#ff37c0' }),
    new Bumper(250, 168, 30, { impulse: 320, score: CONFIG.scoring.bumperBase + 50, color: '#ffb02e' }),
    new Bumper(128, 392, 24, { impulse: 270, score: CONFIG.scoring.bumperBase, color: '#7a5cff' }),
    new Bumper(372, 392, 24, { impulse: 270, score: CONFIG.scoring.bumperBase, color: '#7a5cff' })
  ];

  const flippers = {
    left: new Flipper({ ...CONFIG.flipper.left, length: CONFIG.flipper.length, radius: CONFIG.flipper.radius,
      angularSpeed: CONFIG.flipper.angularSpeed, restitution: CONFIG.flipper.restitution, kick: CONFIG.flipper.kick }),
    right: new Flipper({ ...CONFIG.flipper.right, length: CONFIG.flipper.length, radius: CONFIG.flipper.radius,
      angularSpeed: CONFIG.flipper.angularSpeed, restitution: CONFIG.flipper.restitution, kick: CONFIG.flipper.kick })
  };

  return { segments, bumpers, flippers };
}
