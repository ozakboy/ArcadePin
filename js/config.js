// Central tuning + deployment configuration for ArcadePin.
// Everything here is plain data so it can be tweaked without touching engine code.

export const CONFIG = {
  // Logical playfield resolution (the canvas scales to fit while preserving ratio).
  width: 500,
  height: 800,

  physics: {
    gravity: 1900,        // px / s^2  (faster fall, less reaction time)
    fixedDt: 1 / 240,     // physics step (small for stable, tunnel-free collisions)
    maxStepsPerFrame: 8,  // accumulator cap to avoid spiral-of-death
    maxSpeed: 2000,       // px / s velocity clamp
    wallRestitution: 0.38,
    ballRadius: 9,
    ballMass: 1
  },

  flipper: {
    length: 70,           // shorter -> real central drain gap, no auto-save
    radius: 9,
    // angles in radians, measured from +x axis with y pointing DOWN (clockwise positive)
    left:  { pivotX: 178, pivotY: 706, restAngle:  0.52, activeAngle: -0.46 },
    right: { pivotX: 322, pivotY: 706, restAngle:  Math.PI - 0.52, activeAngle: Math.PI + 0.46 },
    angularSpeed: 26,     // rad / s rotation speed toward target
    restitution: 0.5,
    kick: 120             // extra outward impulse applied when the flipper is swinging
  },

  scoring: {
    bumperBase: 100,
    slingBase: 60,
    comboWindowMs: 2600,        // shorter window -> combos are harder to keep alive
    comboPerLevel: 5,           // hits needed to raise the multiplier one step
    maxMultiplier: 8,
    ballsPerGame: 3
  },

  launcher: {
    restX: 450,
    restY: 762,
    minPower: 1650,             // enough to always clear the lane under higher gravity
    maxPower: 1980,
    chargeRate: 1050            // power gained per second while holding
  },

  // Dual-track leaderboard configuration.
  leaderboard: {
    // Read path: a static JSON file served alongside the site (works on GitHub Pages).
    top100Url: 'data/top_100_leaderboard.json',

    // Write path (optional). A pure-frontend site cannot hold a secret token safely,
    // so cloud submission is OFF by default and the game runs perfectly local-only.
    // To enable: set enabled=true and supply a token at runtime (never commit one).
    submit: {
      enabled: false,
      owner: 'ozakboy',
      repo: 'arcadepin',
      eventType: 'arcadepin_score',
      token: ''
    }
  },

  // Lightweight integrity stamp for submitted scores (deters trivial tampering;
  // not a substitute for a real server-side check).
  integritySalt: 'arcadepin-v6'
};
