// Cloud (global) leaderboard. Reading is always available on a static deploy.
// Writing is optional and disabled by default (see CONFIG.leaderboard.submit).

import { CONFIG } from './config.js';
import { scoreSignature } from './utils.js';

export class CloudLeaderboard {
  constructor() {
    this.cache = null;
  }

  async fetchTop100() {
    try {
      const url = `${CONFIG.leaderboard.top100Url}?t=${Date.now()}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const entries = Array.isArray(data.entries) ? data.entries : [];
      entries.sort((a, b) => b.score - a.score);
      this.cache = entries;
      return entries;
    } catch (err) {
      return { error: err.message || 'fetch failed' };
    }
  }

  // Returns the 1-based global rank a score would achieve, or null if outside top 100.
  rankFor(score) {
    if (!this.cache) return null;
    let rank = 1;
    for (const e of this.cache) { if (e.score > score) rank++; }
    return rank <= 100 ? rank : null;
  }

  // Submit a score through the Serverless proxy, which holds the GitHub token and
  // triggers the score-processing Action. No-op when not configured (local-only).
  async submit(record) {
    const cfg = CONFIG.leaderboard.submit;
    if (!cfg.enabled || !cfg.proxyUrl) {
      return { ok: false, skipped: true, reason: 'cloud submit disabled' };
    }
    const payload = {
      ...record,
      sig: scoreSignature(record, CONFIG.integritySalt)
    };
    try {
      const res = await fetch(cfg.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) return { ok: true };
      return { ok: false, reason: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, reason: err.message || 'network error' };
    }
  }
}
