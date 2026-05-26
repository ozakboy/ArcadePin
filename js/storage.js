// Local, unlimited, permanent personal history via IndexedDB.
// Falls back gracefully to in-memory if IndexedDB is unavailable.

import { uuidv4 } from './utils.js';

const DB_NAME = 'arcadepin';
const DB_VERSION = 1;
const STORE_SCORES = 'scores';
const STORE_META = 'meta';

export class LocalStore {
  constructor() {
    this.db = null;
    this.memFallback = false;
    this._mem = { scores: [], meta: {} };
  }

  open() {
    return new Promise((resolve) => {
      if (!('indexedDB' in window)) {
        this.memFallback = true;
        return resolve(this);
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_SCORES)) {
          const s = db.createObjectStore(STORE_SCORES, { keyPath: 'localId', autoIncrement: true });
          s.createIndex('byScore', 'score');
          s.createIndex('byTimestamp', 'timestamp');
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => { this.db = req.result; resolve(this); };
      req.onerror = () => { this.memFallback = true; resolve(this); };
    });
  }

  _tx(store, mode) {
    return this.db.transaction(store, mode).objectStore(store);
  }

  addScore(record) {
    if (this.memFallback) {
      this._mem.scores.push({ ...record, localId: this._mem.scores.length + 1 });
      return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
      const req = this._tx(STORE_SCORES, 'readwrite').add(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  getAllScores() {
    if (this.memFallback) {
      return Promise.resolve([...this._mem.scores].sort((a, b) => b.score - a.score));
    }
    return new Promise((resolve, reject) => {
      const req = this._tx(STORE_SCORES, 'readonly').getAll();
      req.onsuccess = () => resolve((req.result || []).sort((a, b) => b.score - a.score));
      req.onerror = () => reject(req.error);
    });
  }

  async getTopScores(limit = 50) {
    const all = await this.getAllScores();
    return all.slice(0, limit);
  }

  async getStats() {
    const all = await this.getAllScores();
    if (!all.length) return { games: 0, best: 0, bestCombo: 0, totalTime: 0 };
    return {
      games: all.length,
      best: all[0].score,
      bestCombo: all.reduce((m, r) => Math.max(m, r.maxCombo || 0), 0),
      totalTime: all.reduce((s, r) => s + (r.playTimeSeconds || 0), 0)
    };
  }

  _getMeta(key) {
    if (this.memFallback) return Promise.resolve(this._mem.meta[key]);
    return new Promise((resolve) => {
      const req = this._tx(STORE_META, 'readonly').get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : undefined);
      req.onerror = () => resolve(undefined);
    });
  }

  _setMeta(key, value) {
    if (this.memFallback) { this._mem.meta[key] = value; return Promise.resolve(); }
    return new Promise((resolve) => {
      const req = this._tx(STORE_META, 'readwrite').put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  }

  // Persistent anonymous identity for this device.
  async getPlayerId() {
    let id = await this._getMeta('playerId');
    if (!id) { id = uuidv4(); await this._setMeta('playerId', id); }
    return id;
  }

  getPlayerName() { return this._getMeta('playerName'); }
  setPlayerName(name) { return this._setMeta('playerName', name); }
}
