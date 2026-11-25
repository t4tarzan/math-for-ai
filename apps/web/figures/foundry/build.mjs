// Fig 1 · The learning foundry. A lesson card rides a carriage along a bench past five
// instruments: a reading lamp over an open book, a pin-tumbler quiz gate, a practice rig with
// a dial gauge, a cloud-lab cabinet whose service drawers open, and a monitor that goes live.
// Build: node figures/foundry/build.mjs  →  public/figures/foundry.html (light theme).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "./kit/iso-kit.mjs";
import { COURSE, STATIONS, readouts } from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "..", "..", "public", "figures", "foundry.html");
const kitScript = () => readFileSync(join(HERE, "kit", "iso-kit.mjs"), "utf8").replace(/^export /gm, "");

const WIDTH = 680;
const HEIGHT = 330;
const AZIMUTH = 68;

// ---------- world plan (x along the bench, y toward the front, z up) ----------
const BENCH = { x: -236, y: -76, w: 472, d: 128, r: 8 };
const BENCH_H = 12;
const FOOT_H = 5;
const RAILS = [18, 36];
const RAIL_FROM = -222;
const RAIL_TO = 222;
const SX = [-176, -88, 0, 88, 176]; // station centres = carriage stops
const CARD = { x: -11, y: 24.2, w: 22, d: 1.6, r: 0.4 };
const CARD_Z = 11;
const CARD_TOP = 29;

const P = k.fitProjection(
  [
    ...k.boxCorners(BENCH, -BENCH_H - FOOT_H, 0),
    [-202, -56, 50],
    [-88, 6, 62],
    [-88, 48, 62],
    [0, -30, 60],
    [66, -66, 60],
    [110, -22, 60],
    [176, -40, 78],
  ],
  WIDTH,
  HEIGHT,
  { pad: 14, azimuth: AZIMUTH },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
const poly = (pts) => k.pathOf(pts.map(at), true);
let parts = 0;
const count = (n = 1) => (parts += n);

// ---------- bench ----------
function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(BENCH, -BENCH_H - FOOT_H, BENCH_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(BENCH, 22))) {
    out.push(S(k.cylinder(x, y, 7, -BENCH_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -BENCH_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
    count(2);
  }
  out.push(S(k.slabOf(BENCH, -BENCH_H, BENCH_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(BENCH, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(BENCH, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  count(2 + screws.length);
  // ruler strip along the front edge
  const strip = { x: -196, y: BENCH.y + BENCH.d - 12, w: 410, d: 6, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [1.8, 3.4], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3, 0.6]), at([strip.x + strip.w - 2, strip.y + 3, 0.6])], { size: 0.45 }));
  count(1);
  // label plate at the front-left corner
  const plate = { x: -228, y: BENCH.y + BENCH.d - 22, w: 26, d: 14, r: 1.5 };
  out.push(S(k.slabOf(plate, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(plate, 1.6), 0.8, P), { tone: "faint" }));
  out.push(L([0, 1, 2].map((i) => k.lineOnTop([plate.x + 4, plate.y + 4.2 + i * 2.8], [plate.x + 4 + [16, 12, 14][i], plate.y + 4.2 + i * 2.8], 0.8, P)).join(""), { tone: "lo", free: true }));
  out.push(D([at([plate.x + 2.2, plate.y + 2.2, 0.8]), at([plate.x + plate.w - 2.2, plate.y + plate.d - 2.2, 0.8])], { size: 0.4 }));
  count(1);
  // signal wire on the bench top: cloud cabinet → monitor stand
  out.push(k.wireSvg(at([110, -30, 0]), at([164, -36, 0]), { via: [at([130, -30, 0]), at([140, -36, 0])], tone: "lo", size: 1 }));
  count(1);
  return out.join("");
}

// ---------- rails, end stops and detent pins ----------
function rails() {
  const out = [];
  for (const x of [RAIL_FROM - 6, RAIL_TO]) {
    out.push(S(k.slabOf({ x, y: 14, w: 6, d: 30, r: 1.2 }, 0, 7, P, 3, 0.5), { tone: "mid" }));
    out.push(D([at([x + 3, 17, 7]), at([x + 3, 41, 7])], { size: 0.45 }));
    count();
  }
  for (const y of RAILS) {
    out.push(S(k.slabOf({ x: RAIL_FROM, y, w: RAIL_TO - RAIL_FROM, d: 4, r: 1 }, 0, 3, P, 3, 0.4), { tone: "mid" }));
    out.push(D(SX.map((x) => at([x + 28, y + 2, 3])), { size: 0.4, tone: "lo" }));
    count();
  }
  // a detent pin in front of each station: where the carriage stops
  for (const x of SX) {
    out.push(S(k.cylinder(x, 12, 1.6, 0, 4, P, 16), { tone: "mid" }));
    out.push(L(k.ring(x, 12, 0.7, 4, P, 12), { tone: "lo" }));
    count();
  }
  return out.join("");
}

// ---------- the carriage and the lesson card (the subject) ----------
function carriage() {
  const C = { x: -17, y: 14, w: 34, d: 26, r: 3 };
  const out = [`<path class="iso-halo" d="${k.haloOf(k.insetPlan(C, 3), 3, 0.1, P)}" style="filter:blur(4px)"/>`];
  for (const [x, y] of byDepth([[-13, 16], [13, 16], [-13, 34], [13, 34]])) {
    out.push(S(k.slabOf({ x: x - 3, y: y - 1, w: 6, d: 8, r: 1 }, 0.5, 3, P, 3), { tone: "lo" })); // bushings
    count();
  }
  out.push(S(k.slabOf(C, 3, 5, P, 5, 0.6), { tone: "mid" }));
  out.push(D([-12, -4, 4, 12].map((x) => at([x, C.y + C.d - 2.4, 8])), { size: 0.4, tone: "lo" }));
  out.push(L(k.lineOnTop([C.x, 18.5], [C.x + C.w, 18.5], 8, P), { tone: "faint" }));
  count(2);
  // card holder: a slotted block, then the card standing in it
  const holder = { x: -13, y: 22, w: 26, d: 6, r: 1 };
  out.push(S(k.slabOf(holder, 8, 3, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([-11, 23.2, 11]), at([11, 23.2, 11])], { size: 0.4 }));
  count();
  out.push(S(k.slabOf(CARD, CARD_Z, CARD_TOP - CARD_Z, P, 2, 0.3), { tone: "hi", lit: true }));
  // punched answer holes on the card's front face (y = 25.8): two rows
  const holes = [];
  for (let i = 0; i < 7; i++) {
    holes.push(at([-8 + i * 2.7, CARD.y + CARD.d + 0.05, 24.5]));
    if (i % 2 === 0) holes.push(at([-8 + i * 2.7, CARD.y + CARD.d + 0.05, 21.5]));
  }
  out.push(D(holes, { size: 0.55, tone: "hi" }));
  out.push(L(k.segment([-9.5, CARD.y + CARD.d + 0.05, 17.5], [9.5, CARD.y + CARD.d + 0.05, 17.5], P), { tone: "lo", free: true }));
  count();
  // handle on the front face
  out.push(S(k.slabOf({ x: 8, y: C.y + C.d - 1, w: 4, d: 4, r: 1 }, 4, 3, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(10, C.y + C.d + 4, 2.8, 3, 5, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(10, C.y + C.d + 4, 2.8, 3, 8, 18, P), { tone: "lo" }));
  count(2);
  return out.join("");
}

// ---------- station 1: reading lamp over an open book ----------
const BOOK_SPINE = -176;
const BOOK_Y = [-52, -16];
const PAGE_W = 22;
function readBack() {
  const out = [];
  const base = { x: -208, y: -64, w: 64, d: 56, r: 3 };
  out.push(S(k.slabOf(base, 0, 6, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(base, 3), 6, P), { tone: "faint" }));
  out.push(D(k.corners(base, 4).map(([x, y]) => at([x, y, 6])), { size: 0.45 }));
  count();
  // lamp column at the back-left, arm reaching over the book, lamp head
  out.push(S(k.cylinder(-202, -56, 4.6, 6, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(-202, -56, 2.4, 9, 37, P, 20), { tone: "mid", crease: "none" }));
  out.push(L([20, 32].map((z) => k.sideArc(-202, -56, 2.4, z, P, 12)).join(""), { tone: "faint" }));
  count(2);
  // book: two page blocks and a spine groove
  out.push(S(k.slabOf({ x: BOOK_SPINE - PAGE_W - 1, y: BOOK_Y[0], w: PAGE_W + 1, d: BOOK_Y[1] - BOOK_Y[0], r: 1 }, 6, 4, P, 3), { tone: "hi", crease: "lo" }));
  out.push(S(k.slabOf({ x: BOOK_SPINE, y: BOOK_Y[0], w: PAGE_W + 1, d: BOOK_Y[1] - BOOK_Y[0], r: 1 }, 6, 4, P, 3), { tone: "hi", crease: "lo" }));
  // printed lines on the left page (text stands for type, free ends)
  const rows = [];
  for (let i = 0; i < 6; i++) {
    const y = BOOK_Y[0] + 5 + i * 5;
    rows.push(k.lineOnTop([BOOK_SPINE - 19, y], [BOOK_SPINE - 4 - (i % 3) * 3, y], 10, P));
  }
  out.push(L(rows.join(""), { tone: "lo", free: true }));
  count(2);
  return out.join("");
}
// the page that turns: a thin leaf hinged on the spine, angle a (0 = flat on the right)
const pageAt = (a) => {
  const x = BOOK_SPINE + Math.cos(a) * PAGE_W;
  const z = 10.2 + Math.sin(a) * PAGE_W;
  return k.pathOf([at([BOOK_SPINE, BOOK_Y[0] + 1, 10.2]), at([x, BOOK_Y[0] + 1, z]), at([x, BOOK_Y[1] - 1, z]), at([BOOK_SPINE, BOOK_Y[1] - 1, 10.2])], true);
};
function readFront() {
  // arm and lamp head: drawn after the page so the head hangs over it
  const out = [];
  out.push(S(k.slabOf({ x: -204, y: -58.5, w: 36, d: 5, r: 1.5 }, 44, 4, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(-202, -56, 3.4, 48, 2, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(-170, -48, 7.5, 34, 10, P, 36, 0.6), { tone: "mid" }));
  out.push(L(k.sideArc(-170, -48, 7.5, 40, P, 24), { tone: "faint" }));
  out.push(S(k.cylinder(-170, -48, 3, 44, 4, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(-170, -48, 3.6, 48, 2.4, P, 24), { tone: "mid" }));
  out.push(L(k.knurl(-170, -48, 3.6, 48, 50.4, 18, P), { tone: "lo" }));
  count(5);
  return out.join("");
}

// ---------- station 2: pin-tumbler quiz gate spanning the track ----------
const GX = SX[1] - 18; // the gate stands just upstream of the quiz stop, so the card waits in full view past the open pins
const PIN_Y = [12, 19, 26, 33, 40];
const PIN_REST = 3; // a pin stands 3 above its chamber at rest and rises 5 when the card's answers match
const pinSvg = (y, lift) => S(k.cylinder(GX, y, 1.5, 52, PIN_REST + lift, P, 16), { tone: "hi", crease: "lo" }) + L(k.ring(GX, y, 0.7, 52 + PIN_REST + lift, P, 10), { tone: "lo" });
function quizBack() {
  const out = [];
  out.push(S(k.slabOf({ x: GX - 8, y: 4, w: 16, d: 10, r: 1.5 }, 0, 3, P, 3, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf({ x: GX - 5, y: 6, w: 10, d: 6, r: 1 }, 3, 37, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([GX - 6, 5.5, 3]), at([GX + 6, 5.5, 3])], { size: 0.45 }));
  count(2);
  return out.join("");
}
function quizFront() {
  const out = [];
  out.push(S(k.slabOf({ x: GX - 8, y: 40, w: 16, d: 10, r: 1.5 }, 0, 3, P, 3, 0.4), { tone: "lo" }));
  out.push(S(k.slabOf({ x: GX - 5, y: 42, w: 10, d: 6, r: 1 }, 3, 37, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([GX - 6, 48.5, 3]), at([GX + 6, 48.5, 3])], { size: 0.45 }));
  // lock housing across the top
  const housing = { x: GX - 8, y: 4, w: 16, d: 46, r: 2 };
  out.push(S(k.slabOf(housing, 40, 10, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(housing, 44, P, 4), { tone: "faint" }) }));
  count(3);
  // pin chambers on top; the pins themselves are live (data-pin)
  for (const y of PIN_Y) {
    out.push(S(k.cylinder(GX, y, 2.8, 50, 2, P, 20), { tone: "mid" }));
    count();
  }
  PIN_Y.forEach((y, i) => {
    out.push(`<g data-pin="${i}" data-y="${y}">${pinSvg(y, 0)}</g>`);
    count();
  });
  out.push(D([at([GX - 6, 6, 50]), at([GX + 6, 48, 50])], { size: 0.45 }));
  return out.join("");
}

// ---------- station 3: practice rig with a dial gauge ----------
const DIAL = [0, -32];
const DIAL_R = 14;
const DIAL_Z = 50;
const DIAL_TOP = 58;
const TIP_REST = 26;
const LIFT = 3; // a card under the roller lifts it 3 units: one PASS
function practiceBack() {
  const out = [];
  const base = { x: -18, y: -48, w: 36, d: 32, r: 3 };
  out.push(S(k.slabOf(base, 0, 6, P, 4, 0.6), { tone: "mid" }));
  out.push(D(k.corners(base, 4).map(([x, y]) => at([x, y, 6])), { size: 0.45 }));
  out.push(S(k.cylinder(DIAL[0], DIAL[1], 5, 6, 4, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL[0], DIAL[1], 3, 10, 30, P, 24), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(DIAL[0], DIAL[1], 3, 26, P, 14), { tone: "faint" }));
  count(3);
  // dial face up on the column
  const [x, y] = DIAL;
  out.push(S(k.cylinder(x, y, 3, 40, DIAL_Z - 40, P, 20), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_TOP - DIAL_Z, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 3, DIAL_TOP, 72, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 2, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 2.4, 40, 5, DIAL_TOP, [1.1, 2.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // the PASS sector: a filled wedge where one full lift leaves the needle
  const pass = (t) => [x + Math.sin(t * Math.PI * 2) * (DIAL_R - 2.6), y - Math.cos(t * Math.PI * 2) * (DIAL_R - 2.6), DIAL_TOP];
  const wedge = [];
  for (let i = 0; i <= 8; i++) wedge.push(pass(0.27 + i * 0.0075));
  for (let i = 8; i >= 0; i--) { const p = pass(0.27 + i * 0.0075); wedge.push([x + (p[0] - x) * 0.72, y + (p[1] - y) * 0.72, DIAL_TOP]); }
  out.push(`<path class="iso-line" data-tone="mid" d="${poly(wedge)}" style="fill:var(--anatomy-mid);fill-opacity:.35"/>`);
  out.push(L(k.ring(x, y, 1.4, DIAL_TOP, P, 14), { tone: "mid" }));
  // crown on the +x side
  out.push(S(k.slabOf({ x: x + DIAL_R - 1, y: y - 2.2, w: 4.6, d: 4.4, r: 1.1 }, DIAL_Z + 2, 4, P, 3), { tone: "mid" }));
  count(5);
  return out.join("");
}
const needleAt = (turn) => {
  const a = turn * Math.PI * 2;
  const [x, y] = DIAL;
  return k.lineOnTop([x - Math.sin(a) * 3, y + Math.cos(a) * 3], [x + Math.sin(a) * (DIAL_R - 3.4), y - Math.cos(a) * (DIAL_R - 3.4)], DIAL_TOP + 0.2, P);
};
const NEEDLE_PER_LIFT = 0.3 / LIFT; // a full lift turns the needle 0.3 turn, into the PASS sector
function practicePlunger() {
  // rod built at rest (tip on z = TIP_REST) and lifted as one piece
  const out = [];
  out.push(S(k.cylinder(0, 25, 2.4, TIP_REST, 2, P, 20), { tone: "hi", crease: "lo" }));
  out.push(S(k.cylinder(0, 25, 1.2, TIP_REST + 2, 40 - TIP_REST - 2, P, 14), { tone: "hi", crease: "none" }));
  count(2);
  return out.join("");
}
function practiceArm() {
  const out = [];
  out.push(S(k.slabOf({ x: -3.5, y: -34, w: 7, d: 62, r: 2 }, 40, 4, P, 3, 0.5), { tone: "mid" }));
  out.push(S(k.cylinder(0, 25, 3, 44, 3, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(0, 25, 3, 44, 47, 16, P), { tone: "lo" }));
  out.push(D([at([0, -20, 44]), at([0, 10, 44])], { size: 0.45 }));
  count(2);
  return out.join("");
}

// ---------- station 4: cloud-lab cabinet with four service drawers ----------
const CAB = { x: 66, y: -66, w: 44, d: 44, r: 2 };
const CAB_TOP = 58;
const DRAWERS = [8, 20, 32, 44]; // z of each drawer: Lambda, S3, DynamoDB, API Gateway (bottom→top)
function cloudCabinet() {
  const out = [];
  out.push(S(k.slabOf(k.insetPlan(CAB, -2), 0, 4, P, 4, 0.5), { tone: "lo" }));
  out.push(S(k.slabOf(CAB, 4, CAB_TOP - 4, P, 4, 0.8), { tone: "mid", inner: L(k.sideSeam(CAB, 6, P, 4), { tone: "faint" }) }));
  count(2);
  // top: vent grid and the one engraved label
  out.push(D(k.dotGrid(CAB.x + 22, CAB.y + 6, 8, 6, 2.6, CAB_TOP, P), { size: 0.4, tone: "lo" }));
  out.push(k.faceTextSvg(k.topMatrix([CAB.x + 5, CAB.y + 30], CAB_TOP, P, "x"), "FLOCI", { size: 4, tone: "lo" }));
  out.push(D(k.corners(CAB, 3).map(([x, y]) => at([x, y, CAB_TOP])), { size: 0.45 }));
  // vent slots on the +x side face: closed outlines
  const slots = [];
  for (let i = 0; i < 6; i++) {
    const z = 12 + i * 6.5;
    slots.push(k.pathOf([[110.05, -60, z], [110.05, -32, z], [110.05, -32, z + 2], [110.05, -60, z + 2]].map(at), true));
  }
  out.push(L(slots.join(""), { tone: "lo" }));
  // drawer openings on the front face (y = -22)
  const openings = DRAWERS.map((z) => k.pathOf([[70, -21.95, z], [106, -21.95, z], [106, -21.95, z + 10], [70, -21.95, z + 10]].map(at), true));
  out.push(L(openings.join(""), { tone: "faint" }));
  count(3);
  return out.join("");
}
function cloudDrawer(z, i) {
  const out = [];
  out.push(S(k.slabOf({ x: 70, y: -22, w: 36, d: 2.2, r: 0.6 }, z, 10, P, 3, 0.4), { tone: "hi", crease: "lo" }));
  // pull and label holder on the front
  const fy = -19.8;
  out.push(S(k.slabOf({ x: 92, y: fy, w: 10, d: 1.6, r: 0.5 }, z + 3.6, 2.6, P, 2), { tone: "mid" }));
  out.push(L(k.pathOf([[74, fy + 0.05, z + 3], [86, fy + 0.05, z + 3], [86, fy + 0.05, z + 7], [74, fy + 0.05, z + 7]].map(at), true), { tone: "lo" }));
  out.push(L(k.segment([75.5, fy + 0.05, z + 5], [75.5 + [8, 5, 9, 7][i], fy + 0.05, z + 5], P), { tone: "lo", free: true }));
  out.push(D([at([71.6, fy + 0.05, z + 5])], { size: 0.45, tone: "lo" }));
  out.push(`<g class="led" data-led="${i}">${D([at([104, fy + 0.05, z + 5])], { size: 0.9, tone: "hi" })}</g>`);
  count(4);
  return out.join("");
}

// ---------- station 5: monitor on a stand with an aerial ----------
const MON = { x: 150, y: -44, w: 52, d: 8, r: 2 };
const MON_Z = 22;
const MON_TOP = 58;
const MAST = [194, -40];
function shipMonitor() {
  const out = [];
  out.push(S(k.cylinder(176, -36, 13, 0, 2, P, 40, 0.5), { tone: "lo" }));
  out.push(S(k.cylinder(176, -36, 9, 2, 2, P, 36), { tone: "mid" }));
  out.push(S(k.slabOf({ x: 173, y: -42, w: 6, d: 6, r: 1.5 }, 4, MON_Z - 4, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.slabOf(MON, MON_Z, MON_TOP - MON_Z, P, 4, 0.8), { tone: "mid" }));
  count(4);
  // aerial on the top-right corner
  out.push(S(k.cylinder(MAST[0], MAST[1], 2.4, MON_TOP, 2, P, 16), { tone: "mid" }));
  out.push(S(k.cylinder(MAST[0], MAST[1], 0.9, MON_TOP + 2, 14, P, 12), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(MAST[0], MAST[1], 1.8, MON_TOP + 16, 2.4, P, 16), { tone: "hi" }));
  count(3);
  // the screen in the plane of the front face (y = -36): local u along +x, v down from the top
  const m = k.sideMatrix([MON.x, MON.y + MON.d + 0.05], MON_TOP, P, "left");
  const W = MON.w, H = MON_TOP - MON_Z;
  const scr = { u: 3.5, v: 3.5, w: W - 7, h: H - 8 };
  const r = (u, v, w, h, cls, extra = "") => `<rect x="${u}" y="${v}" width="${w}" height="${h}" rx="0.8" class="${cls}"${extra}/>`;
  out.push(`<g transform="${m}">`);
  out.push(r(scr.u, scr.v, scr.w, scr.h, "scr-glass"));
  out.push(`<g class="scr-live" data-screen>`);
  out.push(r(scr.u, scr.v, scr.w, 4.4, "scr-bar"));
  out.push([0, 1, 2].map((i) => `<circle cx="${scr.u + 2.4 + i * 2.2}" cy="${scr.v + 2.2}" r="0.7" class="scr-dot"/>`).join(""));
  out.push(r(scr.u + 10, scr.v + 0.9, 28, 2.6, "scr-pill"));
  out.push(`<text x="${scr.u + 24}" y="${scr.v + 2.95}" class="scr-url" text-anchor="middle">math.wntap.org</text>`);
  out.push(r(scr.u + 3, scr.v + 8, 18, 3, "scr-block"));
  out.push(r(scr.u + 3, scr.v + 13, 26, 1.6, "scr-line"));
  out.push(r(scr.u + 3, scr.v + 16, 22, 1.6, "scr-line"));
  out.push(r(scr.u + 3, scr.v + 21, 10, 3.2, "scr-btn"));
  out.push(r(scr.u + 30, scr.v + 8, 12, 16, "scr-card"));
  out.push(`</g>`);
  out.push(r(scr.u, scr.v, scr.w, scr.h, "scr-rim"));
  out.push(`</g>`);
  // power button and badge under the screen
  out.push(D([at([MON.x + W - 4, MON.y + MON.d + 0.05, MON_Z + 2.2])], { size: 0.6, tone: "mid" }));
  count(2);
  return out.join("");
}

// ---------- assemble ----------
const START = SX[0];
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: `The learning foundry: a lesson card rides a carriage along a bench past five instruments. A reading lamp over an open book (${COURSE.lessons} lessons in ${COURSE.phases} phases), a pin-tumbler quiz gate (${COURSE.quizzes} lessons have quizzes), a practice rig whose dial gauge swings to pass (${COURSE.practice} problems), a cloud-lab cabinet whose service drawers open (capstones on a local AWS emulator), and a monitor that goes live at the end.`,
  body: [
    bench(),
    readBack(),
    `<path data-part="page" class="page-leaf" d="${pageAt(0)}"/>`,
    readFront(),
    quizBack(),
    practiceBack(),
    `<path data-part="needle" class="iso-line" data-tone="hi" data-free="start" d="${needleAt(0)}" style="stroke-width:1.1"/>`,
    cloudCabinet(),
    ...DRAWERS.map((z, i) => `<g data-body="${i}" data-z="${z}"></g><g data-drawer="${i}">${cloudDrawer(z, i)}</g>`),
    shipMonitor(),
    `<g data-part="rings">${[0, 1, 2].map((i) => `<path class="iso-line ring" data-tone="mid" data-ring="${i}" d=""/>`).join("")}</g>`,
    rails(),
    `<g data-part="carriage" transform="${k.translateAlong(P, [START, 0, 0])}">${carriage()}</g>`,
    `<g data-part="plunger">${practicePlunger()}</g>`,
    practiceArm(),
    quizFront(),
  ],
});

const CSS = `
html,body{margin:0;background:transparent;color-scheme:light}
body.iso{--anatomy-page:transparent;--anatomy-card:#fbfaf6;--anatomy-paper:#fbfaf6}
.iso-page{width:100%;margin:0}
.iso-figure{margin:0}
.iso-plate{padding:44px 18px 46px;border-radius:14px;box-shadow:0 0 0 1px #e7e3d8}
.iso-plate-corners{inset:16px 18px}
.iso-stage{outline:none;cursor:ew-resize}
.iso-stage:focus-visible{outline:2px solid #4b44d6;outline-offset:6px;border-radius:8px}
.page-leaf{fill:var(--anatomy-face);stroke:var(--anatomy-hi);stroke-width:var(--anatomy-weight);stroke-linejoin:round}
.scr-glass{fill:var(--anatomy-shade-1);stroke:none}
.scr-rim{fill:none;stroke:var(--anatomy-lo);stroke-width:.6}
.scr-live{opacity:.15;transition:none}
.scr-bar{fill:var(--anatomy-shade-3);stroke:none}
.scr-dot{fill:var(--anatomy-lo)}
.scr-pill{fill:#ffffff;stroke:var(--anatomy-lo);stroke-width:.3}
.scr-url{font:1.7px var(--anatomy-mono);fill:var(--anatomy-hi)}
.scr-block{fill:var(--anatomy-hi);stroke:none}
.scr-line{fill:var(--anatomy-lo);stroke:none}
.scr-btn{fill:#4b44d6;stroke:none}
.scr-card{fill:#ffffff;stroke:var(--anatomy-lo);stroke-width:.3}
.led circle{transition:none}
.ring{opacity:0}
@media (max-width:560px){.iso-plate{padding:36px 8px 40px}.iso-plate-corner[data-corner="hint"]{display:none}.iso-plate-corner{font-size:9.5px}}
`;

const live = `
const P = ${JSON.stringify(P)};
const SX = ${JSON.stringify(SX)};
const READOUTS = ${JSON.stringify(readouts)};
const NAMES = ${JSON.stringify(STATIONS.map((s) => s.name))};
const BOOK_SPINE = ${BOOK_SPINE}, BOOK_Y = ${JSON.stringify(BOOK_Y)}, PAGE_W = ${PAGE_W};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP}, LIFT = ${LIFT}, NEEDLE_PER_LIFT = ${NEEDLE_PER_LIFT};
const MAST = ${JSON.stringify(MAST)}, MAST_Z = ${MON_TOP + 18};
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const $ = (s) => svg.querySelector(s);
const carriage = $('[data-part="carriage"]'), plunger = $('[data-part="plunger"]'), needle = $('[data-part="needle"]'), page = $('[data-part="page"]');
const pins = [...svg.querySelectorAll("[data-pin]")], drawers = [...svg.querySelectorAll("[data-drawer]")], leds = [...svg.querySelectorAll("[data-led]")];
const bodies = [...svg.querySelectorAll("[data-body]")];
const GX = ${GX}, PIN_REST = ${PIN_REST};
const S = (paths, style) => solidSvg(paths, style), L = (d, style) => lineSvg(d, style);
const pinSvg = ${pinSvg.toString().replace(/k\./g, "")};
const drawerBody = (z, out) => S(slabOf({ x: 71, y: -22, w: 34, d: out, r: 0.5 }, z + 0.5, 9, P, 2), { tone: "lo" });
const screen = $("[data-screen]"), rings = [...svg.querySelectorAll("[data-ring]")];
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const at = (p) => iso(p, P);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const ease = (t) => t * t * (3 - 2 * t);
const pageAt = ${pageAt.toString().replace(/k\./g, "")};
const needleAt = ${needleAt.toString().replace(/k\./g, "")};
let x = SX[0], target = x, stop = 0, dwell = 0, touring = !still.matches, visible = false, frame = 0, last = 0, idle = 0, clock = 0;
const env = SX.map(() => 0);
const DWELL = 2.6;
function draw() {
  carriage.setAttribute("transform", translateAlong(P, [x, 0, 0]));
  // practice rig: the roller rides up onto the card as it slides under
  const under = clamp(1 - (Math.abs(x - SX[2]) - 8) / 6, 0, 1);
  const lift = LIFT * ease(under);
  plunger.setAttribute("transform", translateAlong(P, [0, 0, lift]));
  needle.setAttribute("d", needleAt(lift * NEEDLE_PER_LIFT));
  page.setAttribute("d", pageAt(Math.PI * ease(clamp(env[0], 0, 1)) * 0.96));
  pins.forEach((pin, i) => {
    const lift = Math.round(5 * ease(clamp(env[1] * 1.7 - i * 0.16, 0, 1)) * 20) / 20;
    if (pin.dataset.lift !== String(lift)) { pin.dataset.lift = String(lift); pin.innerHTML = pinSvg(+pin.dataset.y, lift); }
  });
  drawers.forEach((d, i) => {
    const out = Math.round(9 * ease(clamp(env[3] * 1.9 - i * 0.22, 0, 1)) * 20) / 20;
    d.setAttribute("transform", translateAlong(P, [0, out, 0]));
    const b = bodies[i];
    if (b.dataset.out !== String(out)) { b.dataset.out = String(out); b.innerHTML = out > 0.2 ? drawerBody(+b.dataset.z, out) : ""; }
  });
  leds.forEach((l, i) => l.style.opacity = String(0.25 + 0.75 * clamp(env[3] * 1.9 - i * 0.22, 0, 1)));
  screen.style.opacity = String(0.15 + 0.85 * clamp(env[4], 0, 1));
  rings.forEach((ring, i) => {
    const f = (clock / 1.8 + i / 3) % 1;
    const a = clamp(env[4] * 1.4 - 0.4, 0, 1) * (1 - f) * (f < 0.08 ? f / 0.08 : 1);
    ring.style.opacity = String(a);
    ring.setAttribute("d", a > 0.01 ? k_ring(MAST[0], MAST[1], 3 + f * 13, MAST_Z, 40) : "");
  });
  const here = SX.findIndex((s) => Math.abs(x - s) < 1.5);
  const text = here >= 0 ? READOUTS[here] : "on the rail · next: " + NAMES[stop];
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuenow", String(stop + 1));
  stage.setAttribute("aria-valuetext", READOUTS[stop]);
}
const k_ring = (cx, cy, r, z, n) => ring(cx, cy, r, z, P, n);
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  if (touring) {
    if (Math.abs(x - target) < 0.05) { dwell += dt; if (dwell > DWELL) { dwell = 0; stop = (stop + 1) % SX.length; target = SX[stop]; } }
  }
  const calm = still.matches;
  // carriage: critically damped follow, slower over long runs (the wrap back to the start)
  const tau = Math.abs(target - x) > 200 ? 0.55 : 0.38;
  x = calm ? target : x + (target - x) * (1 - Math.exp(-dt / tau));
  if (Math.abs(target - x) < 0.02) x = target;
  SX.forEach((s, i) => {
    const want = Math.abs(x - s) < 1.5 ? 1 : 0;
    env[i] = calm ? want : env[i] + (want - env[i]) * (1 - Math.exp(-dt / (want ? 0.55 : 0.3)));
  });
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const goTo = (i) => {
  touring = false; stop = clamp(i, 0, SX.length - 1); target = SX[stop]; dwell = 0;
  clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; run(); }, 4200); run();
};
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "80px 0px" }).observe(stage);
stage.addEventListener("pointermove", (event) => {
  const box = svg.getBoundingClientRect();
  const share = clamp((event.clientX - box.left) / box.width, 0, 0.999);
  const i = Math.floor(share * SX.length);
  if (i !== stop || touring) goTo(i);
});
stage.addEventListener("keydown", (event) => {
  let to = null;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") to = stop + 1;
  if (event.key === "ArrowLeft" || event.key === "ArrowUp") to = stop - 1;
  if (event.key === "Home") to = 0;
  if (event.key === "End") to = SX.length - 1;
  if (to === null) return;
  event.preventDefault();
  goTo(to);
});
still.addEventListener("change", () => { touring = !still.matches; run(); });
draw();
`;

const body = k.plateHtml({
  fig: "Fig 1",
  title: "The learning foundry",
  hint: "Hover the bench · arrow keys",
  readout: readouts[0],
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="The learning foundry: arrow keys move the lesson card from station to station" aria-valuemin="1" aria-valuemax="${SX.length}" aria-valuenow="1">${svg}</div>`,
});

const html = k.pageHtml({ title: "The learning foundry", theme: "light", body, script: kitScript() + live }).replace("</style>", `${CSS}</style>`);
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, html);
console.log(`wrote ${OUT} · ${parts} parts · ${Math.round(html.length / 1024)} KB`);
