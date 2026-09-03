// Preset themes: purely visual, gameplay logic is unaffected

const THEMES = [
  {
    id: 'forest',
    name: 'Fairytale Forest',
    icon: '🌳',
    bg: 'linear-gradient(135deg, #eef7d8 0%, #c6e6a3 100%)',
    wall: '#4f7a3a',
    path: '#fbf8ec',
    visited: '#dcedc6',
    accent: '#3f6b2c',
    player: '🐰',
    goal: '🍄',
  },
  {
    id: 'space',
    name: 'Space Adventure',
    icon: '🚀',
    bg: 'linear-gradient(135deg, #0d1030 0%, #251a52 100%)',
    wall: '#8b6cf6',
    path: '#171a3d',
    visited: '#2a2360',
    accent: '#a78bfa',
    player: '🚀',
    goal: '🪐',
  },
  {
    id: 'ocean',
    name: 'Undersea World',
    icon: '🐠',
    bg: 'linear-gradient(135deg, #8fe3ef 0%, #1f77ab 100%)',
    wall: '#0b4a6b',
    path: '#e7f9ff',
    visited: '#bfeaf5',
    accent: '#0c6f92',
    player: '🐠',
    goal: '💎',
  },
  {
    id: 'retro',
    name: 'Retro Pixel',
    icon: '🕹️',
    bg: '#181818',
    wall: '#f2c14e',
    path: '#2c2c2c',
    visited: '#3f3f3f',
    accent: '#f2c14e',
    player: '⭐',
    goal: '🚩',
  },
];

function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

window.MazeThemes = { THEMES, getTheme };
