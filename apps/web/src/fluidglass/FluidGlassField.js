import { Flowmap, Geometry, Mesh, Program, RenderTarget, Renderer, Texture } from "ogl";

import vertexSource from "./shaders/default.vert?raw";
import utilSource from "./shaders/util.glsl?raw";
import advectionSource from "./shaders/advection.frag?raw";
import backgroundSource from "./shaders/backgroundClock.frag?raw";
import displaySource from "./shaders/displayTexture.frag?raw";
import fluidVelocitySource from "./shaders/fluidVelocity.frag?raw";
import glassSource from "./shaders/glassShading.frag?raw";
import initializeSource from "./shaders/initializePressure.frag?raw";
import reactionSource from "./shaders/reactionDiffusion.frag?raw";
import correctionSource from "./shaders/velocityCorrection.frag?raw";
import divergenceSource from "./shaders/velocityToPressure.frag?raw";

const includeUtilities = (source) => source.replace("#include ./util.glsl", utilSource);

const PALETTE = {
  glass: [1, 1, 1],
  background: [0, 0, 0],
  graphite: [0x32 / 255, 0x37 / 255, 0x4a / 255],
  orange: [0xf7 / 255, 0x7e / 255, 0x2d / 255],
  pearl: [0xf5 / 255, 0xf5 / 255, 0xf5 / 255],
};

export class FluidGlassField {
  constructor(root, ghostCursor, options = {}) {
    this.root = root;
    this.ghostCursor = ghostCursor;
    this.options = {
      word: "KIN",
      feed: 0.054,
      kill: 0.0616,
      iterations: 10,
      ...options,
    };
    this.alive = true;
    this.active = true;
    this.resizeNeeded = true;
    this.userUntil = 0;
    this.pointer = { x: 0.5, y: 0.5, previousX: 0.5, previousY: 0.5 };
    this.parallax = { x: 0, y: 0 };
    this.lastFrame = performance.now();
    this.setupRenderer();
    this.setupPrograms();
    this.setupTargets();
    this.setupMask();
    this.bind();
    this.resize();
    // Font metrics can settle after the first layout pass; rerender the mask
    // once fonts and the viewport are ready to prevent a tiny first-paint word.
    window.addEventListener("load", () => this.resize(), { once: true });
    if (document.fonts?.ready) document.fonts.ready.then(() => this.resize());
    this.frame = this.frame.bind(this);
    requestAnimationFrame(this.frame);
  }

  setupRenderer() {
    this.renderer = new Renderer({ alpha: false, antialias: false, dpr: 1 });
    this.gl = this.renderer.gl;
    this.gl.canvas.className = "fluidglass-canvas";
    this.root.appendChild(this.gl.canvas);
    const geometry = new Geometry(this.gl, {
      position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
      uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
    });
    this.mesh = new Mesh(this.gl, { geometry });
  }

  createPass(fragment, uniforms = {}) {
    const program = new Program(this.gl, {
      vertex: vertexSource,
      fragment: includeUtilities(fragment),
      uniforms,
    });
    return (target, values = {}) => {
      this.mesh.program = program;
      for (const [key, value] of Object.entries(values)) {
        if (program.uniforms[key]) program.uniforms[key].value = value;
      }
      this.renderer.render({ scene: this.mesh, target: target ?? undefined });
    };
  }

  setupPrograms() {
    this.passes = {
      initialize: this.createPass(initializeSource),
      display: this.createPass(displaySource, {
        textureMap: { value: null },
        showAlpha: { value: false },
      }),
      velocity: this.createPass(fluidVelocitySource, {
        pressureMap: { value: null },
        velocityMap: { value: null },
        flowMap: { value: null },
        uSize: { value: [0, 0] },
      }),
      divergence: this.createPass(divergenceSource, {
        velocityMap: { value: null },
        uSize: { value: [0, 0] },
      }),
      correction: this.createPass(correctionSource, {
        pressureMap: { value: null },
        velocityMap: { value: null },
        uSize: { value: [0, 0] },
      }),
      advection: this.createPass(advectionSource, {
        inputMap: { value: null },
        velocityMap: { value: null },
        uSize: { value: [0, 0] },
      }),
      reaction: this.createPass(reactionSource, {
        pressureMap: { value: null },
        maskTexture: { value: null },
        uSize: { value: [0, 0] },
        feed0: { value: this.options.feed },
        kill0: { value: this.options.kill },
      }),
      background: this.createPass(backgroundSource, {
        uSize: { value: [0, 0] },
        parallax: { value: [0, 0] },
        clockHands: { value: [0, 0, 0] },
        bgcolor: { value: PALETTE.background },
        circlecolor1: { value: PALETTE.graphite },
        circlecolor2: { value: PALETTE.orange },
        circlecolor3: { value: PALETTE.pearl },
      }),
      glass: this.createPass(glassSource, {
        pressureMap: { value: null },
        backgroundMap: { value: null },
        uSize: { value: [0, 0] },
        glassColor: { value: PALETTE.glass },
        shadowFactor: { value: 0.05 },
        brightFactor: { value: 0.05 },
        parallax: { value: [0, 0] },
      }),
    };
  }

  createTarget(delayed = false) {
    const target = new RenderTarget(this.gl, {
      width: 512,
      height: 512,
      type: this.gl.HALF_FLOAT,
      format: this.gl.RGBA,
      internalFormat: this.gl.RGBA16F,
      depth: false,
      wrapS: this.gl.CLAMP_TO_EDGE,
      wrapT: this.gl.CLAMP_TO_EDGE,
    });
    (delayed ? this.delayedTargets : this.targets).push(target);
    return target;
  }

  setupTargets() {
    this.targets = [];
    this.delayedTargets = [];
    this.pressure = this.createTarget();
    this.background = this.createTarget();
    this.pressureTemp = this.createTarget(true);
    this.velocity = this.createTarget();
    this.velocityTemp = this.createTarget(true);
    this.flowmap = new Flowmap(this.gl, {
      size: 512,
      falloff: 0.16,
      alpha: 0.72,
      dissipation: 0.78,
    });
    this.passes.initialize(this.pressure);
  }

  setupMask() {
    this.maskCanvas = document.createElement("canvas");
    this.maskContext = this.maskCanvas.getContext("2d");
    this.maskTexture = new Texture(this.gl);
    this.maskTexture.image = this.maskCanvas;
  }

  bind() {
    this.handleResize = () => this.resize();
    this.handlePointer = (event) => {
      const rect = this.root.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height;
      this.applyPointer(x, y, event.movementX / rect.width, -event.movementY / rect.height, true);
      this.userUntil = performance.now() + 2200;
    };
    window.addEventListener("resize", this.handleResize, { passive: true });
    window.addEventListener("pointermove", this.handlePointer, { passive: true });
  }

  resize() {
    const rect = this.root.getBoundingClientRect();
    this.renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height));
    this.resizeNeeded = true;
  }

  resizeSimulation() {
    this.passes.display(this.pressureTemp, { textureMap: this.pressure.texture, showAlpha: false });
    this.passes.display(this.velocityTemp, { textureMap: this.velocity.texture, showAlpha: false });
    const minDimension = Math.min(this.renderer.width, this.renderer.height);
    const scale = Math.max(0.36, Math.min(0.7, 920 / Math.max(1, minDimension)));
    const width = Math.max(256, Math.round((this.renderer.width * scale) / 4) * 4);
    const height = Math.max(256, Math.round((this.renderer.height * scale) / 4) * 4);
    this.simulationSize = [width, height];
    for (const target of this.targets) target.setSize(width, height);
    this.passes.display(this.pressure, { textureMap: this.pressureTemp.texture, showAlpha: false });
    this.passes.display(this.velocity, { textureMap: this.velocityTemp.texture, showAlpha: false });
    for (const target of this.delayedTargets) target.setSize(width, height);
    this.renderWordMask(width, height);
  }

  renderWordMask(width, height) {
    const canvas = this.maskCanvas;
    const ctx = this.maskContext;
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#ff0000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const compact = width < 680;
    const focalX = compact ? width * 0.5 : width * 0.64;
    const focalY = height * 0.47;
    const size = Math.min(width * (compact ? 0.31 : 0.24), height * 0.47);

    // The name is the primary life-form, but not the only glass object. The
    // orbit, kin cells, and ritual phrase all seed the same evolving field.
    ctx.save();
    ctx.strokeStyle = "rgba(255, 0, 0, 0.34)";
    ctx.lineWidth = Math.max(1, size * 0.008);
    ctx.beginPath();
    ctx.ellipse(focalX, focalY, size * 1.42, size * 0.72, -0.09, 0, Math.PI * 2);
    ctx.stroke();
    for (const [angle, scale] of [[-2.72, 1], [-1.1, 0.72], [0.28, 0.88], [2.1, 0.62]]) {
      const x = focalX + Math.cos(angle) * size * 1.42;
      const y = focalY + Math.sin(angle) * size * 0.72;
      ctx.beginPath();
      ctx.arc(x, y, size * 0.045 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    ctx.font = `800 ${Math.round(size)}px Inter, Arial, sans-serif`;
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${Math.round(size * 0.07)}px`;
    ctx.fillText(this.options.word, focalX, focalY);
    if ("letterSpacing" in ctx) ctx.letterSpacing = `${Math.max(2, Math.round(size * 0.025))}px`;
    ctx.font = `500 ${Math.max(10, Math.round(size * 0.071))}px "DM Mono", monospace`;
    ctx.fillStyle = "rgba(255, 0, 0, 0.66)";
    ctx.fillText("RECOGNIZE KIN", focalX, focalY + size * 0.64);

    if (!compact) {
      ctx.textAlign = "left";
      ctx.font = `500 ${Math.max(8, Math.round(size * 0.045))}px "DM Mono", monospace`;
      ctx.fillStyle = "rgba(255, 0, 0, 0.42)";
      ctx.fillText("SHARED INTENT", focalX - size * 1.36, focalY - size * 0.54);
      ctx.textAlign = "right";
      ctx.fillText("RELATION MEMORY", focalX + size * 1.36, focalY + size * 0.5);
    }
    this.maskTexture.needsUpdate = true;
  }

  applyPointer(x, y, dx, dy, userDriven = false) {
    const [width, height] = this.simulationSize ?? [512, 512];
    this.flowmap.mouse.set(x, y);
    this.flowmap.velocity.set(dx * width, dy * height);
    this.pointer.x = x;
    this.pointer.y = y;
    const visualY = 1 - y;
    this.ghostCursor.style.transform = `translate3d(${x * innerWidth}px, ${visualY * innerHeight}px, 0)`;
    this.ghostCursor.dataset.mode = userDriven ? "human" : "ghost";
  }

  updateGhost(now, delta) {
    if (now < this.userUntil) return;
    const t = now * 0.00016;
    const x = 0.61 + Math.sin(t * 1.11) * 0.23 + Math.sin(t * 2.9) * 0.04;
    const y = 0.52 + Math.cos(t * 1.37) * 0.17 + Math.sin(t * 2.2) * 0.035;
    const dx = (x - this.pointer.previousX) * Math.min(1, 16.667 / Math.max(1, delta));
    const dy = (y - this.pointer.previousY) * Math.min(1, 16.667 / Math.max(1, delta));
    this.applyPointer(x, y, dx, dy, false);
    this.pointer.previousX = x;
    this.pointer.previousY = y;
    this.parallax.x += (dx * 1.4 - this.parallax.x) * 0.045;
    this.parallax.y += (dy * 1.4 - this.parallax.y) * 0.045;
  }

  frame(now) {
    if (!this.alive) return;
    requestAnimationFrame(this.frame);
    if (!this.active) {
      this.lastFrame = now;
      return;
    }
    const delta = Math.min(32, now - this.lastFrame);
    this.lastFrame = now;
    if (this.resizeNeeded) {
      this.resizeNeeded = false;
      this.resizeSimulation();
    }
    this.updateGhost(now, delta);
    this.flowmap.update();

    this.passes.velocity(this.velocityTemp, {
      pressureMap: this.pressure.texture,
      velocityMap: this.velocity.texture,
      flowMap: this.flowmap.mask.read.texture,
      uSize: this.simulationSize,
    });

    for (let index = 0; index < this.options.iterations; index += 1) {
      this.passes.divergence(this.pressureTemp, {
        velocityMap: this.velocityTemp.texture,
        uSize: this.simulationSize,
      });
      this.passes.correction(this.velocity, {
        pressureMap: this.pressureTemp.texture,
        velocityMap: this.velocityTemp.texture,
        uSize: this.simulationSize,
      });
      this.passes.advection(this.velocityTemp, {
        inputMap: this.velocity.texture,
        velocityMap: this.velocity.texture,
        uSize: this.simulationSize,
      });
      this.passes.advection(this.pressureTemp, {
        inputMap: this.pressure.texture,
        velocityMap: this.velocity.texture,
        uSize: this.simulationSize,
      });
      this.passes.reaction(this.pressure, {
        pressureMap: this.pressureTemp.texture,
        maskTexture: this.maskTexture,
        uSize: this.simulationSize,
        feed0: this.options.feed,
        kill0: this.options.kill,
      });
    }

    this.passes.display(this.velocity, { textureMap: this.velocityTemp.texture, showAlpha: false });
    this.passes.background(this.background, {
      uSize: this.simulationSize,
      parallax: [this.parallax.x, this.parallax.y],
      clockHands: [twelveHour(now), (now * 0.00012) % 60, (now * 0.00032) % 60],
      bgcolor: PALETTE.background,
      circlecolor1: PALETTE.graphite,
      circlecolor2: PALETTE.orange,
      circlecolor3: PALETTE.pearl,
    });
    this.passes.glass(null, {
      pressureMap: this.pressure.texture,
      backgroundMap: this.background.texture,
      uSize: this.simulationSize,
      glassColor: PALETTE.glass,
      shadowFactor: 0.05,
      brightFactor: 0.05,
      parallax: [this.parallax.x, this.parallax.y],
    });
  }

  destroy() {
    this.alive = false;
    window.removeEventListener("resize", this.handleResize);
    window.removeEventListener("pointermove", this.handlePointer);
    this.gl.canvas.remove();
  }

  setActive(active) {
    this.active = active;
    this.lastFrame = performance.now();
  }
}

function twelveHour(now) {
  return (now * 0.00002) % 12;
}
