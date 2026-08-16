import "./style.css";
import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

gsap.registerPlugin(Draggable, InertiaPlugin);

/* ============================================================
   CONFIG — sab kuch yahin se tune karo
   ============================================================ */

/* ---- DESKTOP config (default) ---- */
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

/* ---- MOBILE overrides (< 768px) — sirf jo values alag chahiye wahi yahan likho ---- */
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
  designWidth: 400, // mobile values as-is use hongi (rs = 1)
  minScale: 0.75,
};

// active config — applyBreakpoint() breakpoint ke hisaab se isme values bharta hai
const CONFIG = { ...CONFIG_DESKTOP };

/* ============================================================
   IMAGES
   ============================================================ */
const IMAGES = [
  "photo-1519681393784-d120267933ba", // snowy mountain at night
  "photo-1470813740244-df37b8c1edcb", // deep blue starry night
  "photo-1500462918059-b1a0cb512f1d", // pink neon umbrella
  "photo-1464802686167-b939a6910659", // milky way galaxy
  "photo-1451187580459-43490279c0fa", // earth from space
  "photo-1475274047050-1d0c0975c63e", // purple night sky
  "photo-1444703686981-a3abbc4d4fe3", // star field
  "photo-1502134249126-9f3755a50d78", // deep space nebula
  "photo-1531306728370-e2ebd9d7bb99", // dark astro night
  "photo-1462332420958-a05d1e002413", // purple nebula
  "photo-1446776811953-b23d57bd21aa", // satellite over earth
  "photo-1506318137071-a8e063b4bec0", // milky way arc
].map(
  (id) => `https://images.unsplash.com/${id}?q=80&w=900&auto=format&fit=crop`,
);

const COUNT = IMAGES.length;
const wrapOffset = gsap.utils.wrap(-COUNT / 2, COUNT / 2);

/* ============================================================
   DOM
   ============================================================ */
const slider = document.createElement("div");
slider.className = "slider";
slider.innerHTML = `
  <div class="slider__stage"></div>
  <div class="slider__hint">Drag</div>
`;
document.body.appendChild(slider);

const stage = slider.querySelector(".slider__stage");
// perspective stage par — vanishing point exact screen center,
// isse left/right dono side perfect mirror dikhti hain
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
  // card apne center se anchor ho — isse ye hamesha screen ke exact center par baithti hai
  gsap.set(card, { xPercent: -50, yPercent: -50 });
  return card;
});

/* ============================================================
   RESPONSIVE SCALE
   ============================================================ */
let rs = 1; // responsive scale factor
function computeScale() {
  rs = gsap.utils.clamp(
    CONFIG.minScale,
    1,
    window.innerWidth / CONFIG.designWidth,
  );
}

/* ============================================================
   RENDER — har card ki position uske center-se-doori (d) se nikalti hai
   ============================================================ */
let spread = 0; // 0 → 1 intro fan-out ke dauran

function render(pos) {
  for (let i = 0; i < COUNT; i++) {
    const off = wrapOffset(i - pos); // -COUNT/2 .. COUNT/2 (0 = center)
    const d = Math.abs(off);
    const side = Math.sign(off); // -1 left, +1 right
    const t = Math.min(d, 1); // 0 → 1 center slot chhodte waqt
    const rest = Math.max(d - 1, 0); // pehli side card ke aage ke slots

    // side cards ka spacing geometric — bahar jaate jaate compress hota hai
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
      // dono side ka fade window same — isliye left/right hamesha symmetric
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

/* ============================================================
   DRAG — sirf pointer/touch, koi scroll nahi
   ============================================================ */
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
  // agar kisi wajah se throw na chale to bhi card center par settle ho
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

/* ============================================================
   BREAKPOINT — < 768px par CONFIG_MOBILE ki values apply hoti hain
   ============================================================ */
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
  // dragUnit badla to proxy re-map karo taaki slider jump na kare
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

/* ============================================================
   INTRO
   ============================================================ */
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
