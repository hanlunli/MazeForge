// Full-screen firework particle celebration, drawn on a canvas behind the win modal card

class Fireworks {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.running = false;
    this._launchTimeouts = [];
    this._boundResize = () => this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = w;
    this.height = h;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.resize();
    window.addEventListener('resize', this._boundResize);
    this._scheduleLaunches();
    this._lastTs = performance.now();
    this._loop();
  }

  stop() {
    this.running = false;
    window.removeEventListener('resize', this._boundResize);
    this._launchTimeouts.forEach((id) => clearTimeout(id));
    this._launchTimeouts = [];
    this.particles = [];
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this.width) this.ctx.clearRect(0, 0, this.width, this.height);
  }

  _scheduleLaunches() {
    const bursts = 7;
    for (let i = 0; i < bursts; i++) {
      const delay = i * 450 + Math.random() * 300;
      const id = setTimeout(() => this._launch(), delay);
      this._launchTimeouts.push(id);
    }
  }

  _launch() {
    if (!this.running) return;
    const x = this.width * (0.15 + Math.random() * 0.7);
    const y = this.height * (0.15 + Math.random() * 0.35);
    const hue = Math.floor(Math.random() * 360);
    const count = 46;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: 0.012 + Math.random() * 0.01,
        hue: hue + Math.random() * 30 - 15,
        size: 2 + Math.random() * 2,
      });
    }
  }

  _loop() {
    if (!this.running) return;
    const now = performance.now();
    const dt = Math.min((now - this._lastTs) / 16.67, 3);
    this._lastTs = now;

    this.ctx.clearRect(0, 0, this.width, this.height);

    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.vy += 0.04 * dt;
      p.vx *= 0.99;
      p.vy *= 0.99;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= p.decay * dt;

      this.ctx.globalAlpha = Math.max(p.life, 0);
      this.ctx.fillStyle = `hsl(${p.hue}, 90%, 60%)`;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;

    this._rafId = requestAnimationFrame(() => this._loop());
  }
}

window.Fireworks = Fireworks;
