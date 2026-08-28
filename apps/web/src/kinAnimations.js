const TAU = Math.PI * 2;

// Adapted from the pinned `franky-adl/3d-wave-grid` source snapshot.
// The production wrapper keeps the pointer-trail wave behavior while using a
// lightweight canvas renderer so the marketing page stays dependency-free.
export class WaveGrid {
  constructor(canvas, stateNode) {
    this.canvas = canvas;
    this.stateNode = stateNode;
    this.active = false;
    this.pointer = { x: -1000, y: -1000, down: false };
    this.trail = [];
    this.resize = () => { this.metrics = fitCanvas(canvas); };
    window.addEventListener("resize", this.resize, { passive: true });
    this.resize();
    canvas.addEventListener("pointermove", (e) => {
      this.pointer.x = e.offsetX; this.pointer.y = e.offsetY;
      this.trail.push({ x: e.offsetX, y: e.offsetY, age: 0 });
      if (this.trail.length > 18) this.trail.shift();
      this.stateNode.textContent = "RESPONDING";
    });
    canvas.addEventListener("pointerleave", () => { this.pointer.x = -1000; this.pointer.y = -1000; });
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }
  setActive(value) { this.active = value; }
  frame(now) {
    requestAnimationFrame(this.frame);
    if (!this.active || !this.metrics) return;
    const { ctx, width, height } = this.metrics;
    const cols = Math.max(18, Math.floor(width / 28));
    const rows = Math.max(14, Math.floor(height / 28));
    const sx = width / cols; const sy = height / rows;
    ctx.fillStyle = "#09111f"; ctx.fillRect(0, 0, width, height);
    this.trail.forEach((p) => { p.age += 0.016; });
    this.trail = this.trail.filter((p) => p.age < 1.5);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const px = x * sx + sx * .5, py = y * sy + sy * .5;
      let lift = Math.sin(now * .0014 + x * .34 + y * .2) * 2;
      for (const p of this.trail) {
        const d = Math.hypot(px - p.x, py - p.y);
        const wave = Math.sin(d * .18 - p.age * 8) * Math.exp(-d * .018) * Math.max(0, 1 - p.age / 1.5);
        lift += wave * 13;
      }
      const size = 8 + Math.max(0, lift) * .32;
      const glow = Math.max(0, Math.min(1, .35 + lift * .035));
      const blue = Math.max(0, Math.min(1, .45 + lift * .045));
      ctx.save(); ctx.translate(px, py - lift * .32); ctx.rotate(lift * .018);
      ctx.shadowBlur = 12 + glow * 16; ctx.shadowColor = `rgba(105,183,255,${glow})`;
      ctx.fillStyle = `rgba(${Math.floor(205 - blue * 70)},${Math.floor(231 - blue * 32)},255,${.38 + glow * .5})`;
      ctx.fillRect(-size / 2, -size / 2, size, size);
      ctx.restore();
    }
    if (!this.trail.length) this.stateNode.textContent = "LISTENING";
  }
}

function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width: rect.width, height: rect.height };
}

export class KinHelix {
  constructor(canvas, countNode, stateNode) {
    this.canvas = canvas;
    this.countNode = countNode;
    this.stateNode = stateNode;
    this.active = false;
    this.t = 0;
    this.cells = Array.from({ length: 36 }, (_, i) => ({ phase: i * 0.34, hue: i % 3, hit: 0 }));
    this.resize = () => { this.metrics = fitCanvas(canvas); };
    window.addEventListener("resize", this.resize, { passive: true });
    this.resize();
    canvas.addEventListener("pointermove", (e) => { this.pointer = { x: e.offsetX, y: e.offsetY }; });
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  setActive(value) { this.active = value; }

  frame(now) {
    requestAnimationFrame(this.frame);
    if (!this.active || !this.metrics) return;
    const { ctx, width, height } = this.metrics;
    this.t = now * 0.00055;
    ctx.fillStyle = "rgba(232,232,226,0.16)";
    ctx.fillRect(0, 0, width, height);
    const cx = width * 0.56;
    const cy = height * 0.51;
    const radius = Math.min(width * 0.28, 190);
    const span = Math.min(width * 0.52, 410);
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(247,126,45,0.3)";
    ctx.beginPath();
    for (let j = 0; j <= 100; j++) {
      const y = cy - span * 0.5 + (j / 100) * span;
      const angle = this.t * 0.75 + j * 0.1;
      const x = cx + Math.sin(angle) * radius;
      if (!j) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.strokeStyle = "rgba(50,55,74,0.46)";
    ctx.beginPath();
    for (let j = 0; j <= 100; j++) {
      const y = cy - span * 0.5 + (j / 100) * span;
      const angle = this.t * 0.75 + j * 0.1 + Math.PI;
      const x = cx + Math.sin(angle) * radius;
      if (!j) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    this.cells.forEach((cell, i) => {
      const y = cy - span * 0.5 + ((i + 0.5) / this.cells.length) * span;
      const angle = this.t * 0.75 + i * 0.34;
      const x = cx + Math.sin(angle) * radius;
      const depth = (Math.cos(angle) + 1) * 0.5;
      const size = 5 + depth * 6;
      const color = cell.hue === 0 ? "247,126,45" : cell.hue === 1 ? "50,55,74" : "232,232,226";
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2.4);
      gradient.addColorStop(0, `rgba(${color},${0.5 + depth * 0.3})`);
      gradient.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath(); ctx.arc(x, y, size * 2.4, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(${color},${0.55 + depth * 0.4})`;
      ctx.beginPath(); ctx.roundRect(x - size, y - size * 0.52, size * 2, size, size * 0.45); ctx.fill();
      if (this.pointer && Math.hypot(this.pointer.x - x, this.pointer.y - y) < 48) {
        cell.hit = 1;
        this.stateNode.textContent = "RESPONDING";
      }
      cell.hit *= 0.97;
    });
    if (Math.random() < 0.01) this.stateNode.textContent = "LISTENING";
  }
}

export class SignalGarden {
  constructor(canvas) {
    this.canvas = canvas;
    this.active = false;
    this.pointer = { x: -1000, y: -1000, down: false };
    this.petals = Array.from({ length: 180 }, (_, i) => ({ angle: i * 0.46, radius: 8 + (i % 30) * 4, life: Math.random(), speed: 0.2 + Math.random() * 0.7 }));
    this.resize = () => { this.metrics = fitCanvas(canvas); };
    window.addEventListener("resize", this.resize, { passive: true });
    this.resize();
    canvas.addEventListener("pointermove", (e) => { this.pointer.x = e.offsetX; this.pointer.y = e.offsetY; });
    canvas.addEventListener("pointerdown", () => { this.pointer.down = true; });
    window.addEventListener("pointerup", () => { this.pointer.down = false; });
    canvas.addEventListener("dblclick", () => this.petals.forEach((p) => { p.life = 0; }));
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }
  setActive(value) { this.active = value; }
  frame(now) {
    requestAnimationFrame(this.frame);
    if (!this.active || !this.metrics) return;
    const { ctx, width, height } = this.metrics;
    const dt = 0.016;
    ctx.fillStyle = "rgba(9,9,9,0.16)";
    ctx.fillRect(0, 0, width, height);
    const cx = width * 0.5;
    const cy = height * 0.5;
    this.petals.forEach((p, i) => {
      const attract = Math.hypot(this.pointer.x - cx, this.pointer.y - cy) < Math.min(width, height) * 0.4;
      if (this.pointer.down && attract) p.radius += (Math.min(width, height) * 0.4 - p.radius) * 0.012;
      p.life = Math.min(1, p.life + dt * 0.08 * p.speed);
      const theta = p.angle + now * 0.0002 * p.speed;
      const x = cx + Math.cos(theta) * p.radius * (1 + Math.sin(now * 0.001 + i) * 0.12);
      const y = cy + Math.sin(theta) * p.radius * 0.62;
      const size = 1.2 + (i % 5) * 0.46;
      const color = i % 4 === 0 ? "247,126,45" : i % 4 === 1 ? "120,116,160" : "232,232,226";
      ctx.save(); ctx.translate(x, y); ctx.rotate(theta + Math.PI / 2);
      ctx.fillStyle = `rgba(${color},${0.1 + p.life * 0.43})`;
      ctx.beginPath(); ctx.ellipse(0, 0, size * 2.4, size * 5.2, 0, 0, TAU); ctx.fill(); ctx.restore();
    });
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(width, height) * 0.28);
    halo.addColorStop(0, "rgba(247,126,45,0.11)"); halo.addColorStop(1, "rgba(247,126,45,0)");
    ctx.fillStyle = halo; ctx.fillRect(cx - width * .3, cy - height * .3, width * .6, height * .6);
  }
}
