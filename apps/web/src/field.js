import { addAgent, countStrongRelationships, createWorld, stepWorld } from "./simulation.js";

const COLORS = {
  dormant: [225, 230, 228],
  thinking: [139, 111, 255],
  communicating: [65, 225, 235],
  acting: [255, 128, 69],
};

export class Eigenfield {
  constructor(canvas, readout) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    this.readout = readout;
    this.pointer = { x: 0, y: 0, active: false };
    this.scene = "discover";
    this.running = true;
    this.lastTime = performance.now();
    this.world = createWorld(24, window.innerWidth, window.innerHeight, 8012);
    this.messages = [];
    this.bind();
    this.resize();
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  bind() {
    window.addEventListener("resize", () => this.resize(), { passive: true });
    window.addEventListener("pointermove", (event) => {
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      this.pointer.active = true;
    }, { passive: true });
    window.addEventListener("pointerleave", () => { this.pointer.active = false; }, { passive: true });
    this.canvas.addEventListener("click", (event) => this.introduce(event.clientX, event.clientY));
    document.addEventListener("visibilitychange", () => {
      this.running = !document.hidden;
      this.lastTime = performance.now();
      if (this.running) requestAnimationFrame(this.frame);
    });
  }

  resize() {
    const oldWidth = this.world.width;
    const oldHeight = this.world.height;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, width < 700 ? 1.25 : 1.65);
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (oldWidth && oldHeight) {
      for (const agent of this.world.agents) {
        agent.x = (agent.x / oldWidth) * width;
        agent.y = (agent.y / oldHeight) * height;
      }
    }
    this.world.width = width;
    this.world.height = height;
  }

  setScene(scene) {
    this.scene = scene;
    if (scene === "emerge") this.pulse("EXPERIENCE SIGNAL DETECTED", window.innerWidth * 0.66, window.innerHeight * 0.46, "emerge");
  }

  introduce(x = window.innerWidth * 0.62, y = window.innerHeight * 0.5) {
    if (this.world.agents.length >= 42) return;
    addAgent(this.world, x, y);
    this.pulse("NEW AGENT ENTERED THE FIELD", x, y, "birth");
  }

  pulse(text, x, y, kind = "intent") {
    this.messages.push({ text, x, y, kind, born: performance.now() });
    if (this.messages.length > 5) this.messages.shift();
  }

  frame(now) {
    if (!this.running) return;
    const dt = Math.min(now - this.lastTime, 32);
    this.lastTime = now;
    const events = stepWorld(this.world, dt, this.pointer);
    for (const event of events) {
      if (event.type === "intent") this.pulse("SHARED INTENT DISCOVERED", event.x, event.y, "intent");
      if (event.type === "handshake") this.pulse("CONTEXT HANDSHAKE", event.x, event.y, "handshake");
    }
    this.draw(now);
    this.updateReadout(now);
    requestAnimationFrame(this.frame);
  }

  draw(now) {
    const { ctx, world } = this;
    const { width, height } = world;
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(5, 5, 5, 0.19)";
    ctx.fillRect(0, 0, width, height);

    this.drawAmbientField(now);
    this.drawRelations(now);
    this.drawAgents(now);
    this.drawMessages(now);
  }

  drawAmbientField(now) {
    const { ctx, world } = this;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 4; i += 1) {
      const t = now * 0.000045 + i * 1.9;
      const x = world.width * (0.54 + Math.cos(t * (1 + i * 0.07)) * 0.23);
      const y = world.height * (0.5 + Math.sin(t * 1.23) * 0.29);
      const radius = Math.min(world.width, world.height) * (0.24 + i * 0.035);
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      const hue = i % 2 ? "105, 66, 190" : "29, 119, 134";
      gradient.addColorStop(0, `rgba(${hue}, 0.025)`);
      gradient.addColorStop(0.55, `rgba(${hue}, 0.012)`);
      gradient.addColorStop(1, `rgba(${hue}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }

  drawRelations(now) {
    const { ctx, world } = this;
    const byId = new Map(world.agents.map((agent) => [agent.id, agent]));
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const [key, strength] of world.relationships) {
      if (strength < 0.08) continue;
      const [aId, bId] = key.split(":").map(Number);
      const a = byId.get(aId);
      const b = byId.get(bId);
      if (!a || !b) continue;
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const normalX = -dy * (0.05 + strength * 0.07);
      const normalY = dx * (0.05 + strength * 0.07);
      const oscillation = Math.sin(now * 0.0014 + a.id) * 0.55;

      const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      gradient.addColorStop(0, `rgba(116, 102, 255, ${strength * 0.03})`);
      gradient.addColorStop(0.5, `rgba(64, 231, 235, ${strength * 0.24})`);
      gradient.addColorStop(1, `rgba(236, 242, 239, ${strength * 0.04})`);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 0.35 + strength * 0.85;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(mx + normalX * oscillation, my + normalY * oscillation, b.x, b.y);
      ctx.stroke();

      if (strength > 0.5) {
        const fieldRadius = 28 + strength * 52;
        const halo = ctx.createRadialGradient(mx, my, 0, mx, my, fieldRadius);
        halo.addColorStop(0, `rgba(73, 216, 226, ${strength * 0.055})`);
        halo.addColorStop(0.45, `rgba(125, 98, 245, ${strength * 0.025})`);
        halo.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = halo;
        ctx.fillRect(mx - fieldRadius, my - fieldRadius, fieldRadius * 2, fieldRadius * 2);
      }
    }
    ctx.restore();
  }

  drawAgents(now) {
    const { ctx, world } = this;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (const agent of world.agents) {
      if (agent.history.length > 1) {
        ctx.beginPath();
        for (let index = 0; index < agent.history.length; index += 1) {
          const point = agent.history[index];
          if (!index) ctx.moveTo(point.x, point.y);
          else ctx.lineTo(point.x, point.y);
        }
        const color = COLORS[agent.state] ?? COLORS.dormant;
        ctx.strokeStyle = `rgba(${color.join(",")}, 0.055)`;
        ctx.lineWidth = 0.45;
        ctx.stroke();
      }

      const pulse = 1 + Math.sin(now * 0.0014 + agent.phase) * 0.17;
      const size = agent.size * pulse;
      const color = COLORS[agent.state] ?? COLORS.dormant;
      const haloRadius = size * (5.8 + agent.energy * 2.2);
      const halo = ctx.createRadialGradient(agent.x, agent.y, 0, agent.x, agent.y, haloRadius);
      halo.addColorStop(0, `rgba(${color.join(",")}, 0.3)`);
      halo.addColorStop(0.18, `rgba(${color.join(",")}, 0.12)`);
      halo.addColorStop(1, `rgba(${color.join(",")}, 0)`);
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, haloRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(${color.join(",")}, ${0.58 + agent.energy * 0.34})`;
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.2 + agent.energy * 0.24})`;
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.arc(agent.x, agent.y, size * 2.35, 0, Math.PI * 2);
      ctx.stroke();
    }

    const youX = world.width * 0.59;
    const youY = world.height * 0.48;
    const youPulse = 30 + Math.sin(now * 0.0011) * 4;
    ctx.strokeStyle = "rgba(238,244,241,0.2)";
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.arc(youX, youY, youPulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(242,246,244,0.92)";
    ctx.beginPath();
    ctx.arc(youX, youY, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "500 9px ui-monospace, SFMono-Regular, monospace";
    ctx.letterSpacing = "0.16em";
    ctx.fillStyle = "rgba(236,242,239,0.72)";
    ctx.fillText("YOU", youX + 12, youY + 3);
    ctx.restore();
  }

  drawMessages(now) {
    const { ctx } = this;
    this.messages = this.messages.filter((message) => now - message.born < 3600);
    ctx.save();
    ctx.font = "500 9px ui-monospace, SFMono-Regular, monospace";
    for (const message of this.messages) {
      const age = now - message.born;
      const alpha = Math.min(1, age / 320) * Math.min(1, (3600 - age) / 700);
      const offsetY = -18 - age * 0.006;
      ctx.fillStyle = message.kind === "handshake"
        ? `rgba(73,226,232,${alpha * 0.75})`
        : message.kind === "birth"
          ? `rgba(255,142,80,${alpha * 0.75})`
          : `rgba(226,232,229,${alpha * 0.6})`;
      ctx.fillText(message.text, message.x + 12, message.y + offsetY);
      ctx.strokeStyle = `rgba(226,232,229,${alpha * 0.2})`;
      ctx.beginPath();
      ctx.moveTo(message.x, message.y - 3);
      ctx.lineTo(message.x + 7, message.y + offsetY - 3);
      ctx.stroke();
    }
    ctx.restore();
  }

  updateReadout(now) {
    if (now - (this.lastReadout ?? 0) < 280) return;
    this.lastReadout = now;
    const relations = countStrongRelationships(this.world);
    this.readout.agents.textContent = String(this.world.agents.length).padStart(2, "0");
    this.readout.relations.textContent = String(relations).padStart(2, "0");
    this.readout.emergence.textContent = relations > 5 ? "ACTIVE" : relations > 1 ? "FORMING" : "DORMANT";
  }
}
