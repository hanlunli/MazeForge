// Page interaction and state management: start screen, game screen, win modal

const STORAGE_KEY = 'mazeforge.settings.v1';
const BEST_KEY = 'mazeforge.best.v1';

const state = {
  difficulty: 'easy',
  theme: 'forest',
  a11y: false,
};

let game = null;

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    Object.assign(state, saved);
  } catch (e) {
    // ignore corrupted local storage
  }
}

function saveSettings() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ difficulty: state.difficulty, theme: state.theme, a11y: state.a11y })
  );
}

function loadBestTimes() {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) || '{}');
  } catch (e) {
    return {};
  }
}

function saveBestTime(difficulty, stats) {
  const best = loadBestTimes();
  const current = best[difficulty];
  if (!current || stats.seconds < current.seconds) {
    best[difficulty] = { seconds: stats.seconds, time: stats.time, moves: stats.moves };
    localStorage.setItem(BEST_KEY, JSON.stringify(best));
    return true;
  }
  return false;
}

function renderBestTimes() {
  const best = loadBestTimes();
  for (const key of Object.keys(DIFFICULTIES)) {
    const el = document.querySelector(`[data-best="${key}"]`);
    if (!el) continue;
    el.textContent = best[key] ? `Best: ${best[key].time} · ${best[key].moves} moves` : 'No record yet';
  }
}

function buildThemePicker() {
  const wrap = document.getElementById('theme-picker');
  wrap.innerHTML = '';
  for (const theme of MazeThemes.THEMES) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-btn';
    btn.dataset.theme = theme.id;
    btn.innerHTML = `<span class="theme-icon">${theme.icon}</span><span>${theme.name}</span>`;
    btn.style.background = theme.bg;
    btn.addEventListener('click', () => selectTheme(theme.id));
    wrap.appendChild(btn);
  }
  updateThemePickerSelection();
}

function updateThemePickerSelection() {
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.theme === state.theme);
  });
}

function selectTheme(themeId) {
  state.theme = themeId;
  saveSettings();
  updateThemePickerSelection();
  if (game) game.setTheme(themeId);
}

function selectDifficulty(diff) {
  state.difficulty = diff;
  saveSettings();
  document.querySelectorAll('.diff-btn').forEach((btn) => {
    btn.classList.toggle('selected', btn.dataset.diff === diff);
  });
}

function applyA11y() {
  document.body.classList.toggle('a11y-mode', state.a11y);
  document.getElementById('a11y-toggle').checked = state.a11y;
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function formatStats(stats) {
  return `${stats.time} · ${stats.moves} moves`;
}

function starsFor(stats) {
  if (!stats.optimalMoves) return 3;
  const ratio = stats.moves / Math.max(stats.optimalMoves, 1);
  if (ratio <= 1.2) return 3;
  if (ratio <= 1.8) return 2;
  return 1;
}

function startGame() {
  showScreen('screen-game');
  document.getElementById('current-theme-name').textContent =
    MazeThemes.getTheme(state.theme).name;
  document.getElementById('current-diff-name').textContent =
    DIFFICULTIES[state.difficulty].label;

  if (game) game.destroy();
  const canvas = document.getElementById('maze-canvas');
  game = new MazeGame(canvas, {
    difficulty: state.difficulty,
    theme: state.theme,
    onTick: (stats) => updateHud(stats),
    onWin: (stats) => showWin(stats),
  });
  updateHud(game.getStats());
}

function updateHud(stats) {
  document.getElementById('hud-time').textContent = stats.time;
  document.getElementById('hud-moves').textContent = stats.moves;
}

function showWin(stats) {
  const isBest = saveBestTime(state.difficulty, stats);
  document.getElementById('win-stats').textContent = formatStats(stats);
  document.getElementById('win-stars').textContent = '⭐'.repeat(starsFor(stats));
  document.getElementById('win-best-badge').classList.toggle('hidden', !isBest);
  document.getElementById('modal-win').classList.remove('hidden');
  renderBestTimes();
}

function hideWin() {
  document.getElementById('modal-win').classList.add('hidden');
}

function bindControls() {
  document.querySelectorAll('.diff-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectDifficulty(btn.dataset.diff));
  });

  document.getElementById('a11y-toggle').addEventListener('change', (e) => {
    state.a11y = e.target.checked;
    saveSettings();
    applyA11y();
  });

  document.getElementById('btn-start').addEventListener('click', startGame);

  document.getElementById('btn-hint').addEventListener('click', () => game && game.showHint());
  document.getElementById('btn-restart').addEventListener('click', () => game && game.newMaze());
  document.getElementById('btn-menu').addEventListener('click', () => {
    showScreen('screen-start');
    renderBestTimes();
  });

  document.getElementById('btn-win-again').addEventListener('click', () => {
    hideWin();
    game.newMaze();
  });
  document.getElementById('btn-win-menu').addEventListener('click', () => {
    hideWin();
    showScreen('screen-start');
    renderBestTimes();
  });

  document.querySelectorAll('.dpad-btn').forEach((btn) => {
    const dx = Number(btn.dataset.dx);
    const dy = Number(btn.dataset.dy);
    btn.addEventListener('click', () => game && game.move(dx, dy));
  });

  document.addEventListener('keydown', (e) => {
    if (!game || document.getElementById('screen-game').classList.contains('active') === false) {
      return;
    }
    const map = {
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      w: [0, -1],
      s: [0, 1],
      a: [-1, 0],
      d: [1, 0],
    };
    const dir = map[e.key];
    if (dir) {
      e.preventDefault();
      game.move(dir[0], dir[1]);
    }
  });

  // Mobile swipe gestures
  const canvasWrap = document.getElementById('canvas-wrap');
  let touchStart = null;
  canvasWrap.addEventListener(
    'touchstart',
    (e) => {
      const t = e.changedTouches[0];
      touchStart = { x: t.clientX, y: t.clientY };
    },
    { passive: true }
  );
  canvasWrap.addEventListener(
    'touchend',
    (e) => {
      if (!touchStart || !game) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchStart.x;
      const dy = t.clientY - touchStart.y;
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const threshold = 24;
      if (Math.max(absX, absY) < threshold) return;
      if (absX > absY) {
        game.move(dx > 0 ? 1 : -1, 0);
      } else {
        game.move(0, dy > 0 ? 1 : -1);
      }
      touchStart = null;
    },
    { passive: true }
  );
}

function init() {
  loadSettings();
  buildThemePicker();
  selectDifficulty(state.difficulty);
  applyA11y();
  renderBestTimes();
  bindControls();
}

document.addEventListener('DOMContentLoaded', init);
