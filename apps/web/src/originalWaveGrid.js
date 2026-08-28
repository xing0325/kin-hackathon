import Orchestrator from "./vendor/wave-original-threejs/Orchestrator.js";

// Thin page wrapper around the upstream 3d-wave-grid scene. The source is
// vendored and runs unchanged; this adapter only supplies the page canvas and
// pauses rendering when the section is outside the viewport.
export class OriginalWaveGrid {
  constructor(canvas) {
    canvas.classList.add("webgl");
    this.scene = new Orchestrator(canvas);
    this.active = true;
  }
  setActive(active) {
    this.active = active;
    if (this.scene?.renderer?.instance) this.scene.renderer.instance.setAnimationLoop(active ? this.scene.animate.bind(this.scene) : null);
  }
  destroy() { this.scene?.destroy?.(); }
}
