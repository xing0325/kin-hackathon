import "./style.css";
import { FluidGlassField } from "./fluidglass/FluidGlassField.js";
import { OriginalWaveGrid } from "./originalWaveGrid.js";

const field = new FluidGlassField(
  document.querySelector("#fluidglass"),
  document.querySelector(".ghost-cursor"),
  { word: "KIN", feed: 0.054, kill: 0.0616, iterations: 10 },
);

document.body.classList.add("hero-visible");
const heroObserver = new IntersectionObserver(([entry]) => {
  const active = entry.isIntersecting;
  document.body.classList.toggle("hero-visible", active);
  field.setActive(active);
}, { threshold: 0.05 });
heroObserver.observe(document.querySelector("#hero"));

const revealObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) entry.target.classList.add("is-visible");
  }
}, { threshold: 0.14 });

document.querySelectorAll("section > *").forEach((element) => {
  element.classList.add("reveal");
  revealObserver.observe(element);
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
