// Maze generation and solving algorithms (pure logic, no rendering)

const DIRS = [
  { dx: 0, dy: -1, wall: 'top', opp: 'bottom' },
  { dx: 1, dy: 0, wall: 'right', opp: 'left' },
  { dx: 0, dy: 1, wall: 'bottom', opp: 'top' },
  { dx: -1, dy: 0, wall: 'left', opp: 'right' },
];

// Randomized depth-first backtracker; produces a "perfect maze" (exactly one path between any two cells)
function generateMaze(width, height) {
  const grid = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) {
      row.push({ top: true, right: true, bottom: true, left: true, visited: false });
    }
    grid.push(row);
  }

  const stack = [{ x: 0, y: 0 }];
  grid[0][0].visited = true;

  while (stack.length) {
    const cur = stack[stack.length - 1];
    const candidates = [];
    for (const d of DIRS) {
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      if (nx >= 0 && nx < width && ny >= 0 && ny < height && !grid[ny][nx].visited) {
        candidates.push({ x: nx, y: ny, dir: d });
      }
    }
    if (candidates.length === 0) {
      stack.pop();
      continue;
    }
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    grid[cur.y][cur.x][next.dir.wall] = false;
    grid[next.y][next.x][next.dir.opp] = false;
    grid[next.y][next.x].visited = true;
    stack.push({ x: next.x, y: next.y });
  }

  for (const row of grid) {
    for (const cell of row) delete cell.visited;
  }

  return grid;
}

// BFS from start; returns per-cell distance and predecessor, used for the farthest-cell search and path solving
function bfs(grid, start) {
  const height = grid.length;
  const width = grid[0].length;
  const dist = Array.from({ length: height }, () => new Array(width).fill(-1));
  const prev = Array.from({ length: height }, () => new Array(width).fill(null));

  const queue = [start];
  dist[start.y][start.x] = 0;
  let qi = 0;

  while (qi < queue.length) {
    const cur = queue[qi++];
    const cell = grid[cur.y][cur.x];
    for (const d of DIRS) {
      if (cell[d.wall]) continue;
      const nx = cur.x + d.dx;
      const ny = cur.y + d.dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      if (dist[ny][nx] !== -1) continue;
      dist[ny][nx] = dist[cur.y][cur.x] + 1;
      prev[ny][nx] = cur;
      queue.push({ x: nx, y: ny });
    }
  }

  return { dist, prev };
}

// Find the cell farthest from start (used as the goal, guaranteeing a sufficiently long solution path)
function farthestCell(grid, start) {
  const { dist } = bfs(grid, start);
  let best = start;
  let bestDist = 0;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (dist[y][x] > bestDist) {
        bestDist = dist[y][x];
        best = { x, y };
      }
    }
  }
  return { cell: best, dist: bestDist };
}

// Reconstruct the path from start to end using the BFS predecessor table
function reconstructPath(prev, start, end) {
  const path = [];
  let cur = end;
  while (cur) {
    path.push(cur);
    if (cur.x === start.x && cur.y === start.y) break;
    cur = prev[cur.y][cur.x];
  }
  path.reverse();
  return path;
}

window.MazeCore = { generateMaze, bfs, farthestCell, reconstructPath };
