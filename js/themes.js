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
    id: 'hutong',
    name: 'Hutong Courtyard',
    icon: '🏮',
    bg: 'linear-gradient(135deg, #f3e2c7 0%, #d9b98a 100%)',
    wall: '#8a3f2e',
    path: '#faf1e0',
    visited: '#e8d3ab',
    accent: '#8a3f2e',
    player: '🚶',
    goal: '🏠',
  },
  {
    id: 'countryside',
    name: 'Country Path',
    icon: '🌾',
    bg: 'linear-gradient(135deg, #eef2c9 0%, #bcd98a 100%)',
    wall: '#6b5732',
    path: '#fbf9e8',
    visited: '#dce9b8',
    accent: '#6b8f3a',
    player: '🚲',
    goal: '🏡',
  },
  {
    id: 'station',
    name: 'Old Train Station',
    icon: '🚉',
    bg: 'linear-gradient(135deg, #e8d9b8 0%, #b89b6e 100%)',
    wall: '#4a3524',
    path: '#f5ecd8',
    visited: '#ddc79c',
    accent: '#6b4a2f',
    player: '🚂',
    goal: '🚉',
  },
];

function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

window.MazeThemes = { THEMES, getTheme };
