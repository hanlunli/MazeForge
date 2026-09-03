// Page interaction and state management: start screen, game screen, win modal

const STORAGE_KEY = 'mazeforge.settings.v1';
const GOAL_PHOTO_KEY = 'mazeforge.goalPhoto.v1';
const GOAL_PHOTO_SIZE = 160;
const BG_PHOTO_KEY = 'mazeforge.bgPhoto.v1';
const BG_PHOTO_SIZE = 320;

const state = {
  difficulty: 'easy',
  theme: 'forest',
  a11y: false,
  voice: true,
};

let game = null;
const fireworks = new Fireworks(document.getElementById('fireworks-canvas'));
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    JSON.stringify({
      difficulty: state.difficulty,
      theme: state.theme,
      a11y: state.a11y,
      voice: state.voice,
    })
  );
}

// Shared upload/crop/persist pipeline for the goal-photo and background-photo slots
function createPhotoUploader({ storageKey, size, previewId, removeBtnId, onChange }) {
  function setPreview(dataUrl) {
    const preview = document.getElementById(previewId);
    const removeBtn = document.getElementById(removeBtnId);
    if (dataUrl) {
      preview.src = dataUrl;
      preview.classList.remove('hidden');
      removeBtn.classList.remove('hidden');
    } else {
      preview.classList.add('hidden');
      removeBtn.classList.add('hidden');
    }
  }

  function loadImage(dataUrl) {
    const img = new Image();
    img.onload = () => {
      uploader.image = img;
      onChange(img);
    };
    img.src = dataUrl;
  }

  function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // Crop to a centered square and downscale so localStorage stays small
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        localStorage.setItem(storageKey, dataUrl);
        setPreview(dataUrl);
        loadImage(dataUrl);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function remove() {
    localStorage.removeItem(storageKey);
    uploader.image = null;
    setPreview(null);
    onChange(null);
  }

  function init() {
    const dataUrl = localStorage.getItem(storageKey);
    if (dataUrl) {
      setPreview(dataUrl);
      loadImage(dataUrl);
    }
  }

  const uploader = { image: null, handleFile, remove, init };
  return uploader;
}

const goalPhoto = createPhotoUploader({
  storageKey: GOAL_PHOTO_KEY,
  size: GOAL_PHOTO_SIZE,
  previewId: 'goal-photo-preview',
  removeBtnId: 'btn-remove-photo',
  onChange: (img) => {
    if (game) game.setGoalImage(img);
  },
});

const bgPhoto = createPhotoUploader({
  storageKey: BG_PHOTO_KEY,
  size: BG_PHOTO_SIZE,
  previewId: 'bg-photo-preview',
  removeBtnId: 'btn-remove-bg-photo',
  onChange: (img) => {
    if (game) game.setBgImage(img);
  },
});

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

function applyVoiceToggle() {
  document.getElementById('voice-toggle').checked = state.voice;
}

const WIN_PHRASES = ['Well done!', "You've completed today's task!", 'Great job!'];

// Preferred voice names, best-sounding first. System TTS voices vary a lot
// in quality — these are the higher-quality options browsers commonly ship
// (Edge/Chrome "Natural"/Google voices) over the default robotic SAPI voice.
const PREFERRED_VOICE_NAMES = [
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Google US English',
  'Samantha',
  'Microsoft Zira - English (United States)',
];

let cachedVoices = [];

function refreshVoiceCache() {
  if ('speechSynthesis' in window) {
    cachedVoices = speechSynthesis.getVoices();
  }
}

function pickBestVoice() {
  for (const name of PREFERRED_VOICE_NAMES) {
    const match = cachedVoices.find((v) => v.name === name);
    if (match) return match;
  }
  const natural = cachedVoices.find((v) => /natural/i.test(v.name) && v.lang.startsWith('en'));
  if (natural) return natural;
  const google = cachedVoices.find((v) => /google/i.test(v.name) && v.lang.startsWith('en'));
  if (google) return google;
  return cachedVoices.find((v) => v.lang === 'en-US') || null;
}

function speakEncouragement() {
  if (!state.voice || !('speechSynthesis' in window)) return;
  const text = WIN_PHRASES[Math.floor(Math.random() * WIN_PHRASES.length)];
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;
  utterance.pitch = 1.05;
  const voice = pickBestVoice();
  if (voice) utterance.voice = voice;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
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
    goalImage: goalPhoto.image,
    bgImage: bgPhoto.image,
    onWin: () => showWin(),
  });
}

const CELEBRATION_EMOJI = ['🎈', '🌸', '🎈', '🌼', '🎈'];

function playWinCelebration() {
  const container = document.getElementById('win-celebration');
  container.innerHTML = '';
  CELEBRATION_EMOJI.forEach((emoji, i) => {
    const span = document.createElement('span');
    span.className = 'drifter';
    span.textContent = emoji;
    span.style.left = `${8 + i * 20 + (Math.random() * 8 - 4)}%`;
    span.style.animationDelay = `${i * 0.35}s`;
    span.style.setProperty('--drift', `${Math.round(Math.random() * 30 - 15)}px`);
    container.appendChild(span);
  });
}

function showWin() {
  document.getElementById('modal-win').classList.remove('hidden');
  playWinCelebration();
  speakEncouragement();
  if (!prefersReducedMotion) fireworks.start();
}

function hideWin() {
  document.getElementById('modal-win').classList.add('hidden');
  fireworks.stop();
  document.getElementById('win-celebration').innerHTML = '';
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

  document.getElementById('voice-toggle').addEventListener('change', (e) => {
    state.voice = e.target.checked;
    saveSettings();
  });

  document.getElementById('btn-start').addEventListener('click', startGame);

  document.getElementById('goal-photo-input').addEventListener('change', (e) => {
    goalPhoto.handleFile(e.target.files[0]);
  });
  document.getElementById('btn-remove-photo').addEventListener('click', goalPhoto.remove);

  document.getElementById('bg-photo-input').addEventListener('change', (e) => {
    bgPhoto.handleFile(e.target.files[0]);
  });
  document.getElementById('btn-remove-bg-photo').addEventListener('click', bgPhoto.remove);

  document.getElementById('btn-hint').addEventListener('click', () => game && game.showHint());
  document.getElementById('btn-restart').addEventListener('click', () => game && game.newMaze());
  document.getElementById('btn-menu').addEventListener('click', () => {
    showScreen('screen-start');
  });

  document.getElementById('btn-win-again').addEventListener('click', () => {
    hideWin();
    game.newMaze();
  });
  document.getElementById('btn-win-menu').addEventListener('click', () => {
    hideWin();
    showScreen('screen-start');
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
  applyVoiceToggle();
  goalPhoto.init();
  bgPhoto.init();
  bindControls();

  if ('speechSynthesis' in window) {
    refreshVoiceCache();
    speechSynthesis.onvoiceschanged = refreshVoiceCache;
  }
}

document.addEventListener('DOMContentLoaded', init);
