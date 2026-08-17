import "./style.css";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

gsap.registerPlugin(Draggable, InertiaPlugin);

/* ---- Desktop config (default) ---- */
const CONFIG_DESKTOP = {
  cardWidth: "clamp(220px, 30vw, 430px)",
  cardAspect: "10 / 7",
  gap: 345,
  step: 225,
  stepDecay: 0.71,
  depth: 90,
  depthStep: 15,
  rotBase: 66,
  rotStep: 86,
  perspective: 900,
  centerScale: 1.07,
  scaleDrop: 0.21,
  scaleStep: 0.175,
  visiblePerSide: 5,
  fadeZone: 0.45,
  dragUnit: 420,
  maxThrowDuration: 1.8,
  designWidth: 1650,
  minScale: 0.62,
  introDuration: 1.9,
  introDelay: 0.5,
  introEase: "expo.inOut",
};

/* ---- Mobile overrides (< 768px) ---- */
const CONFIG_MOBILE = {
  cardWidth: "clamp(190px, 64vw, 320px)",
  gap: 190,
  step: 120,
  depth: 60,
  depthStep: 12,
  rotBase: 60,
  rotStep: 75,
  perspective: 700,
  centerScale: 1.02,
  scaleDrop: 0.18,
  scaleStep: 0.15,
  visiblePerSide: 2,
  dragUnit: 220,
  designWidth: 400, // use mobile values as-is (rs = 1)
  minScale: 0.75,
};

// active config, filled by applyBreakpoint()
const CONFIG = { ...CONFIG_DESKTOP };

const IMAGES = [
  "photo-1519681393784-d120267933ba",
  "photo-1470813740244-df37b8c1edcb",
  "photo-1500462918059-b1a0cb512f1d",
  "photo-1464802686167-b939a6910659",
  "photo-1451187580459-43490279c0fa",
  "photo-1475274047050-1d0c0975c63e",
  "photo-1444703686981-a3abbc4d4fe3",
  "photo-1502134249126-9f3755a50d78",
  "photo-1531306728370-e2ebd9d7bb99",
  "photo-1462332420958-a05d1e002413",
  "photo-1446776811953-b23d57bd21aa",
  "photo-1506318137071-a8e063b4bec0",
].map(
  (id) => `https://images.unsplash.com/${id}?q=80&w=900&auto=format&fit=crop`,
);

const COUNT = IMAGES.length;
const wrapOffset = gsap.utils.wrap(-COUNT / 2, COUNT / 2);

const slider = document.createElement("div");
slider.className = "slider";
slider.innerHTML = `
  <div class="slider__stage"></div>
  <div class="slider__hint">Drag</div>
`;
document.body.appendChild(slider);

const stage = slider.querySelector(".slider__stage");
// vanishing point at screen center keeps both sides mirrored
stage.style.perspectiveOrigin = "50% 50%";

const cards = IMAGES.map((src) => {
  const card = document.createElement("div");
  card.className = "card";
  const img = document.createElement("img");
  img.src = src;
  img.alt = "";
  img.draggable = false;
  card.appendChild(img);
  stage.appendChild(card);
  // anchor each card by its own center
  gsap.set(card, { xPercent: -50, yPercent: -50 });
  return card;
});

let rs = 1; // responsive scale factor
function computeScale() {
  rs = gsap.utils.clamp(
    CONFIG.minScale,
    1,
    window.innerWidth / CONFIG.designWidth,
  );
}

// Each card is placed from its distance (d) to the center slot.
let spread = 0; // 0 → 1 during the intro fan-out

function render(pos) {
  for (let i = 0; i < COUNT; i++) {
    const off = wrapOffset(i - pos); // -COUNT/2 .. COUNT/2 (0 = center)
    const d = Math.abs(off);
    const side = Math.sign(off); // -1 left, +1 right
    const t = Math.min(d, 1); // 0 → 1 while leaving the center slot
    const rest = Math.max(d - 1, 0); // slots beyond the first side card

    // geometric spacing, compressing toward the edges
    const stack =
      CONFIG.step *
      ((1 - Math.pow(CONFIG.stepDecay, rest)) / (1 - CONFIG.stepDecay));
    const rotation = (t * CONFIG.rotBase + rest * CONFIG.rotStep) * spread;

    gsap.set(cards[i], {
      x: side * (t * CONFIG.gap + stack) * rs * spread,
      z: -(t * CONFIG.depth + rest * CONFIG.depthStep) * rs * spread,
      rotationY: -side * rotation,
      scale:
        CONFIG.centerScale - t * CONFIG.scaleDrop - rest * CONFIG.scaleStep,
      // same fade window on both sides keeps left/right symmetric
      opacity: gsap.utils.clamp(
        0,
        1,
        (CONFIG.visiblePerSide + CONFIG.fadeZone - d) / CONFIG.fadeZone,
      ),
      zIndex: Math.round((COUNT - d) * 10),
      force3D: true,
    });
  }
}

/* ---- Drag: pointer/touch only, no scroll ---- */
const proxy = document.createElement("div");
let position = 0;

const draggable = Draggable.create(proxy, {
  type: "x",
  trigger: slider,
  inertia: true,
  snap: (value) => Math.round(value / CONFIG.dragUnit) * CONFIG.dragUnit,
  maxDuration: CONFIG.maxThrowDuration,
  onPress: () => slider.classList.add("is-grabbing"),
  onRelease: () => slider.classList.remove("is-grabbing"),
  onDrag: update,
  onThrowUpdate: update,
  // settle on center even if the throw tween never runs
  onDragEnd() {
    if (!this.tween || !this.tween.isActive()) {
      const snapped = Math.round(this.x / CONFIG.dragUnit) * CONFIG.dragUnit;
      gsap.to(proxy, {
        x: snapped,
        duration: 0.5,
        ease: "power3.out",
        onUpdate: () => {
          draggable.update();
          update();
        },
      });
    }
  },
})[0];

function update() {
  position = -draggable.x / CONFIG.dragUnit;
  render(position);
}

/* ---- Breakpoint: CONFIG_MOBILE applies below 768px ---- */
const mq = window.matchMedia("(max-width: 767px)");

function applyBreakpoint() {
  const active = mq.matches
    ? { ...CONFIG_DESKTOP, ...CONFIG_MOBILE }
    : CONFIG_DESKTOP;
  Object.assign(CONFIG, active);

  cards.forEach((card) => {
    card.style.width = CONFIG.cardWidth;
    card.style.aspectRatio = CONFIG.cardAspect;
  });
  stage.style.perspective = `${CONFIG.perspective}px`;
  // re-map the proxy so a changed dragUnit doesn't jump the slider
  gsap.set(proxy, { x: -position * CONFIG.dragUnit });
  draggable.update();

  computeScale();
  render(position);
}

applyBreakpoint();
mq.addEventListener("change", applyBreakpoint);

window.addEventListener("resize", () => {
  computeScale();
  render(position);
});

/* ---- Intro fan-out ---- */
gsap.to(
  { value: 0 },
  {
    value: 1,
    duration: CONFIG.introDuration,
    delay: CONFIG.introDelay,
    ease: CONFIG.introEase,
    onUpdate() {
      spread = this.targets()[0].value;
      render(position);
    },
  },
);
