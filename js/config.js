// Central tuning + deployment configuration for ArcadePin.
// Everything here is plain data so it can be tweaked without touching engine code.

export const CONFIG = {
  // Logical playfield resolution (the canvas scales to fit while preserving ratio).
  width: 600,
  height: 1000,

  physics: {
    gravity: 2200,        // px / s^2  (fast fall, little reaction time)
    fixedDt: 1 / 300,     // physics step (small for stable, tunnel-free collisions)
    maxStepsPerFrame: 10, // accumulator cap to avoid spiral-of-death
    maxSpeed: 2500,       // px / s velocity clamp
    wallRestitution: 0.42,
    ballRadius: 10,
    ballMass: 1,
    drainMargin: 40       // ball is lost below (height - drainMargin)
  },

  flipper: {
    length: 80,
    radius: 10,
    // angles in radians, measured from +x axis with y pointing DOWN (clockwise positive)
    left:  { pivotX: 215, pivotY: 882, restAngle:  0.52, activeAngle: -0.46 },
    right: { pivotX: 385, pivotY: 882, restAngle:  Math.PI - 0.52, activeAngle: Math.PI + 0.46 },
    angularSpeed: 28,
    restitution: 0.5,
    kick: 130
  },

  scoring: {
    bumperBase: 100,
    slingBase: 60,
    blackHoleScore: 250,
    comboWindowMs: 2600,        // shorter window -> combos are harder to keep alive
    comboPerLevel: 5,
    maxMultiplier: 8,
    ballsPerGame: 3
  },

  launcher: {
    restX: 565,
    restY: 935,
    minPower: 1980,             // always clears the (taller) lane under higher gravity
    maxPower: 2380,
    chargeRate: 1250,
    laneMinX: 548               // x beyond this is the launch lane (used by safety checks)
  },

  // "Black hole" capture-and-eject feature.
  blackHole: {
    radius: 26,                 // capture core
    influence: 80,              // ring within which the ball is pulled in
    pull: 2000,                 // attraction strength (px/s^2 at the core edge)
    holdTime: 0.55,             // seconds the ball is held before ejecting
    ejectMin: 2050,
    ejectMax: 2350,
    ejectSpread: 0.7,           // rad, +/- around straight up
    score: 250
  },

  // Dual-track leaderboard configuration.
  leaderboard: {
    // Read path: a static JSON file served alongside the site (works on GitHub Pages).
    top100Url: 'data/top_100_leaderboard.json',

    // Write path via a Serverless proxy that holds the GitHub token (see serverless/).
    // The proxy forwards to repository_dispatch; the Action validates + writes the JSON.
    submit: {
      enabled: true,           // set true after deploying the proxy below
      proxyUrl: 'https://arcadepin-proxy.awc0450056.workers.dev/'              // e.g. https://arcadepin-proxy.<you>.workers.dev
    }
  },

  // Lightweight integrity stamp for submitted scores (verified by the Action).
  integritySalt: 'arcadepin-v6'
};
