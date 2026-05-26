// DOM overlay screens: menu, name entry, leaderboards, game over, pause.

import { formatScore, formatDuration, formatDate } from './utils.js';

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export class UI {
  constructor() {
    this.screens = {
      menu: document.getElementById('screen-menu'),
      name: document.getElementById('screen-name'),
      gameover: document.getElementById('screen-gameover'),
      board: document.getElementById('screen-board'),
      pause: document.getElementById('screen-pause')
    };
    this.nameInput = document.getElementById('name-input');
    this.boardList = document.getElementById('board-list');
    this.boardTabs = { global: document.getElementById('tab-global'), local: document.getElementById('tab-local') };
    this.handlers = {};
  }

  on(name, fn) { this.handlers[name] = fn; }
  _fire(name, ...args) { if (this.handlers[name]) this.handlers[name](...args); }

  show(id) {
    for (const key of Object.keys(this.screens)) {
      this.screens[key].classList.toggle('hidden', key !== id);
    }
    this.activeScreen = id;
  }

  hideAll() {
    for (const key of Object.keys(this.screens)) this.screens[key].classList.add('hidden');
    this.activeScreen = null;
  }

  bindButtons() {
    document.getElementById('btn-play').addEventListener('click', () => this.openNameEntry());
    document.getElementById('btn-board').addEventListener('click', () => this._fire('openBoard'));
    document.getElementById('btn-start').addEventListener('click', () => this._submitName());
    this.nameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._submitName(); });

    document.getElementById('btn-again').addEventListener('click', () => this.openNameEntry(true));
    document.getElementById('btn-go-board').addEventListener('click', () => this._fire('openBoard'));
    document.getElementById('btn-go-menu').addEventListener('click', () => this._fire('menu'));

    document.getElementById('btn-board-back').addEventListener('click', () => this._fire('boardBack'));
    this.boardTabs.global.addEventListener('click', () => this._fire('boardTab', 'global'));
    this.boardTabs.local.addEventListener('click', () => this._fire('boardTab', 'local'));

    document.getElementById('btn-resume').addEventListener('click', () => this._fire('resume'));
    document.getElementById('btn-pause-menu').addEventListener('click', () => this._fire('menu'));
    document.getElementById('btn-mute').addEventListener('click', (e) => this._fire('toggleMute', e.currentTarget));
  }

  setName(name) { if (name) this.nameInput.value = name; }

  openNameEntry() {
    this.show('name');
    this.nameInput.focus();
    this.nameInput.select();
  }

  _submitName() {
    let name = (this.nameInput.value || '').trim().slice(0, 8);
    if (!name) name = 'PLAYER';
    name = name.toUpperCase();
    this._fire('start', name);
  }

  setGameOver(result, rank, isLocalBest) {
    document.getElementById('go-score').textContent = formatScore(result.score);
    document.getElementById('go-combo').textContent = result.maxCombo;
    document.getElementById('go-time').textContent = formatDuration(result.playTimeSeconds);
    const rankEl = document.getElementById('go-rank');
    if (rank) rankEl.textContent = `GLOBAL RANK #${rank}`;
    else rankEl.textContent = isLocalBest ? 'NEW PERSONAL BEST!' : 'GAME OVER';
    this.show('gameover');
  }

  setActiveTab(tab) {
    this.boardTabs.global.classList.toggle('active', tab === 'global');
    this.boardTabs.local.classList.toggle('active', tab === 'local');
  }

  renderGlobal(entries, myId) {
    if (entries && entries.error) {
      this.boardList.innerHTML = `<div class="board-msg">無法載入全球排行榜<br><span>${esc(entries.error)}</span></div>`;
      return;
    }
    if (!entries || !entries.length) {
      this.boardList.innerHTML = `<div class="board-msg">尚無紀錄，成為第一名！</div>`;
      return;
    }
    const rows = entries.slice(0, 100).map((e, i) => this._row(i + 1, e, e.playerId === myId)).join('');
    this.boardList.innerHTML = this._header() + rows;
  }

  renderLocal(scores, stats) {
    const head = `
      <div class="stats-row">
        <div><b>${stats.games}</b><span>場次</span></div>
        <div><b>${formatScore(stats.best)}</b><span>最高分</span></div>
        <div><b>${stats.bestCombo}</b><span>最高連擊</span></div>
        <div><b>${formatDuration(stats.totalTime)}</b><span>總時數</span></div>
      </div>`;
    if (!scores.length) {
      this.boardList.innerHTML = head + `<div class="board-msg">在這台裝置上還沒有紀錄。<br>開始第一場吧！</div>`;
      return;
    }
    const rows = scores.slice(0, 100).map((e, i) =>
      `<div class="board-row">
        <span class="bk">#${i + 1}</span>
        <span class="bn">${esc(e.playerName || '—')}</span>
        <span class="bs">${formatScore(e.score)}</span>
        <span class="bc">x${e.maxCombo}</span>
        <span class="bt">${formatDate(e.timestamp)}</span>
      </div>`).join('');
    this.boardList.innerHTML = head + this._header(true) + rows;
  }

  _header(local) {
    return `<div class="board-row board-head">
      <span class="bk">#</span><span class="bn">玩家</span><span class="bs">分數</span>
      <span class="bc">連擊</span><span class="bt">${local ? '日期' : '時間'}</span></div>`;
  }

  _row(rank, e, mine) {
    return `<div class="board-row${mine ? ' mine' : ''}${rank <= 3 ? ' top' + rank : ''}">
      <span class="bk">#${rank}</span>
      <span class="bn">${esc(e.playerName || '—')}</span>
      <span class="bs">${formatScore(e.score)}</span>
      <span class="bc">x${e.maxCombo}</span>
      <span class="bt">${formatDuration(e.playTimeSeconds || 0)}</span>
    </div>`;
  }
}
