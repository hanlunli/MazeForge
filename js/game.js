// Game runtime logic: rendering, input, timer, hints, win detection

const DIFFICULTIES = {
  easy: { label: 'Easy', cols: 7, rows: 7 },
  medium: { label: 'Medium', cols: 12, rows: 12 },
  hard: { label: 'Hard', cols: 18, rows: 18 },
};

class MazeGame {
  constructor(canvas, options) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.difficulty = options.difficulty;
    this.theme = options.theme;
    this.onWin = options.onWin || function () {};
    this.onTick = options.onTick || function () {};

    this.hintTimeoutId = null;
    this.hintPath = null;

    this._boundResize = () => this.resize();
    window.addEventListener('resize', this._boundResize);

    this.newMaze();
  }

  newMaze() {
    const { cols, rows } = DIFFICULTIES[this.difficulty];
    this.cols = cols;
    this.rows = rows;
    this.grid = MazeCore.generateMaze(cols, rows);
    this.start = { x: 0, y: 0 };
    const { cell, dist } = MazeCore.farthestCell(this.grid, this.start);
    this.goal = cell;
    this.optimalMoves = dist;

    this.player = { x: this.start.x, y: this.start.y };
    this.visited = new Set([this._key(this.start)]);
    this.moves = 0;
    this.elapsedMs = 0;
    this.running = false;
    this.finished = false;
    this.hintPath = null;
    if (this.hintTimeoutId) {
      clearTimeout(this.hintTimeoutId);
      this.hintTimeoutId = null;
    }

    this.resize();
    this._tickTimer();
    this.onTick(this.getStats());
  }

  setTheme(themeId) {
    this.theme = themeId;
    this.draw();
  }

  _key(pos) {
    return `${pos.x},${pos.y}`;
  }

  resize() {
    const wrap = this.canvas.parentElement;
    const maxW = wrap.clientWidth;
    const maxH = wrap.clientHeight;
    const cell = Math.floor(Math.min(maxW / this.cols, maxH / this.rows));
    this.cellSize = Math.max(cell, 10);

    const dpr = window.devicePixelRatio || 1;
    const displayW = this.cellSize * this.cols;
    const displayH = this.cellSize * this.rows;
    this.canvas.style.width = `${displayW}px`;
    this.canvas.style.height = `${displayH}px`;
    this.canvas.width = Math.round(displayW * dpr);
    this.canvas.height = Math.round(displayH * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.draw();
  }

  _tickTimer() {
    if (this._timerInterval) clearInterval(this._timerInterval);
    this._lastTs = performance.now();
    this._timerInterval = setInterval(() => {
      if (this.running && !this.finished) {
        const now = performance.now();
        this.elapsedMs += now - this._lastTs;
        this._lastTs = now;
        this.onTick(this.getStats());
      }
    }, 250);
  }

  getStats() {
    const totalSeconds = Math.floor(this.elapsedMs / 1000);
    const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    return { time: `${mm}:${ss}`, moves: this.moves, seconds: totalSeconds };
  }

  move(dx, dy) {
    if (this.finished) return;
    const dir =
      dx === 1 ? 'right' : dx === -1 ? 'left' : dy === 1 ? 'bottom' : dy === -1 ? 'top' : null;
    if (!dir) return;
    const cell = this.grid[this.player.y][this.player.x];
    if (cell[dir]) return; // blocked by a wall

    if (!this.running) {
      this.running = true;
      this._lastTs = performance.now();
    }

    this.player.x += dx;
    this.player.y += dy;
    this.moves += 1;
    this.visited.add(this._key(this.player));
    this.hintPath = null;

    this.draw();
    this.onTick(this.getStats());

    if (this.player.x === this.goal.x && this.player.y === this.goal.y) {
      this.finished = true;
      this.running = false;
      this.onWin({ ...this.getStats(), optimalMoves: this.optimalMoves });
    }
  }

  showHint() {
    if (this.finished) return;
    const { prev } = MazeCore.bfs(this.grid, this.player);
    this.hintPath = MazeCore.reconstructPath(prev, this.player, this.goal);
    this.draw();
    if (this.hintTimeoutId) clearTimeout(this.hintTimeoutId);
    this.hintTimeoutId = setTimeout(() => {
      this.hintPath = null;
      this.draw();
    }, 2500);
  }

  destroy() {
    window.removeEventListener('resize', this._boundResize);
    if (this._timerInterval) clearInterval(this._timerInterval);
    if (this.hintTimeoutId) clearTimeout(this.hintTimeoutId);
  }

  draw() {
    const ctx = this.ctx;
    const theme = MazeThemes.getTheme(this.theme);
    const size = this.cellSize;
    const w = this.cols * size;
    const h = this.rows * size;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = theme.path;
    ctx.fillRect(0, 0, w, h);

    // Faintly shade visited cells so the player can see where they've been
    ctx.fillStyle = theme.visited;
    for (const key of this.visited) {
      const [x, y] = key.split(',').map(Number);
      ctx.fillRect(x * size, y * size, size, size);
    }

    // Hint path
    if (this.hintPath) {
      ctx.fillStyle = theme.accent;
      ctx.globalAlpha = 0.35;
      for (const p of this.hintPath) {
        ctx.fillRect(p.x * size, p.y * size, size, size);
      }
      ctx.globalAlpha = 1;
    }

    // Walls
    ctx.strokeStyle = theme.wall;
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.grid[y][x];
        const px = x * size;
        const py = y * size;
        if (cell.top) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + size, py);
        }
        if (cell.left) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + size);
        }
        if (cell.right) {
          ctx.moveTo(px + size, py);
          ctx.lineTo(px + size, py + size);
        }
        if (cell.bottom) {
          ctx.moveTo(px, py + size);
          ctx.lineTo(px + size, py + size);
        }
      }
    }
    ctx.stroke();

    // Outer border
    ctx.strokeRect(1, 1, w - 2, h - 2);

    // Goal
    ctx.font = `${size * 0.7}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(theme.goal, this.goal.x * size + size / 2, this.goal.y * size + size / 2);

    // Player
    ctx.font = `${size * 0.75}px sans-serif`;
    ctx.fillText(theme.player, this.player.x * size + size / 2, this.player.y * size + size / 2);
  }
}

window.MazeGame = MazeGame;
window.DIFFICULTIES = DIFFICULTIES;
