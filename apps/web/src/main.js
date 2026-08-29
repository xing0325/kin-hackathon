import "./style.css";
import { FluidGlassField } from "./fluidglass/FluidGlassField.js";
import { OriginalWaveGrid } from "./originalWaveGrid.js";

const field = new FluidGlassField(
  document.querySelector("#fluidglass"),
  document.querySelector(".ghost-cursor"),
  { word: "KIN", feed: 0.054, kill: 0.0616, iterations: 10 },
);

document.body.classList.add("hero-visible");
const heroVideo = document.querySelector(".hero-product-video");
const heroObserver = new IntersectionObserver(([entry]) => {
  const active = entry.isIntersecting;
  document.body.classList.toggle("hero-visible", active);
  field.setActive(active);
  if (active) heroVideo?.play().catch(() => {});
  else heroVideo?.pause();
}, { threshold: 0.05 });
heroObserver.observe(document.querySelector("#hero"));

const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) entry.target.classList.add("is-visible");
  }
}, { threshold: 0.14 });

document.querySelectorAll("section > *:not([data-no-reveal])").forEach((element) => {
  element.classList.add("reveal");
  revealObserver.observe(element);
});

// Keep image swapping scoped to the visible media rectangle, not card copy.
document.querySelectorAll(".product-card-media").forEach((media) => {
  media.addEventListener("pointerenter", () => media.classList.add("is-hovered"));
  media.addEventListener("pointerleave", () => media.classList.remove("is-hovered"));
  media.addEventListener("focusin", () => media.classList.add("is-hovered"));
  media.addEventListener("focusout", () => media.classList.remove("is-hovered"));
});

window.addEventListener("beforeunload", () => field.destroy());

const waveGrid = new OriginalWaveGrid(document.querySelector("#wave-grid-canvas"));
window.addEventListener("beforeunload", () => waveGrid.destroy());
const animationObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const active = entry.isIntersecting;
    if (entry.target.id === "wave-grid") waveGrid.setActive(active);
  }
}, { threshold: 0.15 });
animationObserver.observe(document.querySelector("#wave-grid"));

const waveCanvas = document.querySelector("#wave-grid-canvas");
const waveState = document.querySelector("#wave-grid-state");
let waveStateTimer;
waveCanvas.addEventListener("pointermove", () => {
  waveState.textContent = "RESPONDING";
  clearTimeout(waveStateTimer);
  waveStateTimer = setTimeout(() => { waveState.textContent = "LISTENING"; }, 1200);
}, { passive: true });
