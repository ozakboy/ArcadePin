// Bootstrap: wires engine, audio, input, storage, cloud leaderboard and UI together.

import { CONFIG } from './config.js';
import { AudioManager } from './audio.js';
import { InputManager } from './input.js';
import { LocalStore } from './storage.js';
import { CloudLeaderboard } from './leaderboard.js';
import { Game } from './game.js';
import { UI } from './ui.js';

const canvas = document.getElementById('game');
canvas.width = CONFIG.width;
canvas.height = CONFIG.height;

const audio = new AudioManager();
const input = new InputManager();
const store = new LocalStore();
const cloud = new CloudLeaderboard();
const ui = new UI();
const game = new Game(canvas, { audio, input });

let playerId = null;
let playerName = null;
let paused = false;
let lastBoardTab = 'global';

input.attachKeyboard();
input.attachTouch(canvas);
input.onFirstInput = () => audio.resume();
if ('ontouchstart' in window) {
  document.body.classList.add('touch');
  input.bindLaunchButton(document.getElementById('launch-btn'));
}

input.onPause = () => {
  if (game.isIdle() || game.isOver()) return;
  if (ui.activeScreen === 'board' || ui.activeScreen === 'name') return;
  paused ? resume() : pause();
};

function pause() { paused = true; game.paused = true; ui.show('pause'); }
function resume() { paused = false; game.paused = false; ui.hideAll(); }

function goMenu() {
  paused = false;
  game.paused = false;
  game.state = 'idle';
  ui.show('menu');
}

ui.bindButtons();
ui.on('menu', goMenu);
ui.on('resume', resume);

ui.on('start', async (name) => {
  playerName = name;
  await store.setPlayerName(name);
  ui.setName(name);
  audio.resume();
  paused = false;
  game.paused = false;
  ui.hideAll();
  game.newGame();
});

ui.on('openBoard', () => openBoard(lastBoardTab));
ui.on('boardBack', () => { game.isOver() ? ui.show('gameover') : goMenu(); });
ui.on('boardTab', (tab) => openBoard(tab));
ui.on('toggleMute', (btn) => {
  const muted = !audio.muted;
  audio.setMuted(muted);
  btn.textContent = muted ? '🔇' : '🔊';
  btn.classList.toggle('off', muted);
});

async function openBoard(tab) {
  lastBoardTab = tab;
  ui.setActiveTab(tab);
  ui.show('board');
  ui.boardList.innerHTML = '<div class="board-msg">載入中…</div>';
  if (tab === 'global') {
    const entries = await cloud.fetchTop100();
    ui.renderGlobal(entries, playerId);
  } else {
    const [scores, stats] = await Promise.all([store.getTopScores(100), store.getStats()]);
    ui.renderLocal(scores, stats);
  }
}

game.onGameOver = async (result) => {
  const record = {
    playerId,
    playerName: playerName || 'PLAYER',
    score: result.score,
    maxCombo: result.maxCombo,
    playTimeSeconds: result.playTimeSeconds,
    timestamp: Date.now()
  };
  audio.gameOver();

  let prevBest = 0;
  try { prevBest = (await store.getStats()).best; } catch (_) { /* ignore */ }

  try { await store.addScore(record); } catch (_) { /* ignore */ }
  cloud.submit(record).catch(() => {});   // no-op unless explicitly enabled

  let rank = null;
  const entries = await cloud.fetchTop100();
  if (!entries.error) rank = cloud.rankFor(result.score);

  ui.setGameOver(result, rank, result.score > prevBest);
};

(async function init() {
  await store.open();
  playerId = await store.getPlayerId();
  playerName = await store.getPlayerName();
  if (playerName) ui.setName(playerName);
  ui.show('menu');
  requestAnimationFrame(loop);
})();

function loop(now) {
  game.update(now);
  game.render();
  requestAnimationFrame(loop);
}
