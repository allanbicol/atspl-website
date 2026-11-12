// The homepage hero: a stylised live-fire range seen from the firing point.
// Targets rise on their lifters, a mover crosses on its rail, and a click
// registers on the firer's display the way a projectile location system would.
import {
  CanvasTexture,
  CircleGeometry,
  Color,
  DoubleSide,
  Fog,
  Group,
  LineBasicMaterial,
  LineSegments,
  BufferGeometry,
  Float32BufferAttribute,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Shape,
  ShapeGeometry,
  BoxGeometry,
  Raycaster,
  RingGeometry,
  Scene,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const NIGHT = 0x171a12;
const GROUND = 0x1d2116;
const BUFF = '#e6dfc8';
const OLIVE = '#747233';
const SIGNAL = '#f79322';

const LANES = 7;
const LANE_W = 4.4;
const PLATE_W = 1.5;
const PLATE_H = 2.5;
const MM_PER_UNIT = 500 / PLATE_W; // a 500 mm wide plate
const DOWN = -Math.PI / 2 + 0.06;

type Target = {
  pivot: Group;
  plate: Mesh;
  mat: MeshBasicMaterial;
  lane: string;
  range: number;
  up: boolean;
  marks: Mesh[];
  timer?: gsap.core.Tween;
};

// x and y are millimetres from the centre of the scoring zone; u and v are the
// same point as a 0–1 position on the plate, for plotting.
export type HitDetail = { lane: string; range: number; x: number; y: number; u: number; v: number; hits: number };

const laneX = (lane: number) => (lane - (LANES + 1) / 2) * LANE_W;

function plateTexture() {
  const c = document.createElement('canvas');
  c.width = 300;
  c.height = 500;
  const g = c.getContext('2d')!;
  const w = c.width;
  const h = c.height;
  // Head-and-shoulders plate.
  const body = (inset: number) => {
    const sx = w * 0.04 + inset;
    const ex = w * 0.96 - inset;
    const hx0 = w * 0.3 + inset * 0.6;
    const hx1 = w * 0.7 - inset * 0.6;
    const shoulder = h * 0.27 + inset * 0.5;
    g.beginPath();
    g.moveTo(sx, h - inset);
    g.lineTo(sx, shoulder + 26);
    g.quadraticCurveTo(sx, shoulder, sx + 26, shoulder);
    g.lineTo(hx0, shoulder);
    g.lineTo(hx0, inset + 24);
    g.quadraticCurveTo(hx0, inset, hx0 + 24, inset);
    g.lineTo(hx1 - 24, inset);
    g.quadraticCurveTo(hx1, inset, hx1, inset + 24);
    g.lineTo(hx1, shoulder);
    g.lineTo(ex - 26, shoulder);
    g.quadraticCurveTo(ex, shoulder, ex, shoulder + 26);
    g.lineTo(ex, h - inset);
    g.closePath();
  };
  body(0);
  g.fillStyle = BUFF;
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(29,32,22,.55)';
  body(4);
  g.stroke();
  // Scoring zones.
  g.strokeStyle = OLIVE;
  g.lineWidth = 4;
  const cx = w / 2;
  const cy = h * 0.6;
  [
    [0.36, 0.3],
    [0.24, 0.2],
    [0.12, 0.1],
  ].forEach(([rx, ry]) => {
    g.beginPath();
    g.ellipse(cx, cy, w * rx, h * ry, 0, 0, Math.PI * 2);
    g.stroke();
  });
  g.fillStyle = SIGNAL;
  g.beginPath();
  g.arc(cx, cy, w * 0.045, 0, Math.PI * 2);
  g.fill();
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Is a point (plate-local units, origin at the hinge) on the plate itself?
function onPlate(x: number, y: number) {
  const u = x / PLATE_W + 0.5;
  const v = y / PLATE_H;
  if (v < 0 || v > 1) return false;
  if (v <= 0.73) return u > 0.04 && u < 0.96;
  return u > 0.3 && u < 0.7;
}

function boardTexture(text: string, fg: string, bg: string, font: string) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = fg;
  g.font = `800 132px ${font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 8);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

function skyTexture() {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#171a12');
  grad.addColorStop(0.3, '#1f1f15');
  grad.addColorStop(0.58, '#4a3318');
  grad.addColorStop(0.8, '#a8601d');
  grad.addColorStop(0.93, '#ee9838');
  grad.addColorStop(1, '#ffc477');
  g.fillStyle = grad;
  g.fillRect(0, 0, 8, 512);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export async function initRange(canvas: HTMLCanvasElement, host: HTMLElement) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch {
    host.classList.add('no-webgl');
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(NIGHT);

  const stencil = '"Big Shoulders Stencil Variable", "Arial Narrow", sans-serif';
  try {
    await Promise.race([document.fonts.load(`800 100px ${stencil}`), new Promise((r) => setTimeout(r, 1200))]);
  } catch {
    /* fall through with the fallback face */
  }

  const scene = new Scene();
  scene.fog = new Fog(0x1b1d13, 44, 230);
  const camera = new PerspectiveCamera(38, 1, 0.1, 500);
  const camBase = new Vector3(0, 2.7, 11);
  const lookAt = new Vector3(0, 2.4, -40);

  // Sky glow behind the stop butt.
  const sky = new Mesh(new PlaneGeometry(900, 84), new MeshBasicMaterial({ map: skyTexture(), fog: false }));
  sky.position.set(0, 38, -210);
  scene.add(sky);

  // Two ridgelines between the butt and the sky, for depth.
  const ridge = (seed: number, height: number, z: number, color: number) => {
    const shape = new Shape();
    shape.moveTo(-420, -4);
    for (let x = -420; x <= 420; x += 12) {
      const y = height * (0.55 + 0.25 * Math.sin(x * 0.011 + seed) + 0.14 * Math.sin(x * 0.037 + seed * 2.3) + 0.06 * Math.sin(x * 0.09 + seed * 5));
      shape.lineTo(x, y);
    }
    shape.lineTo(420, -4);
    const m = new Mesh(new ShapeGeometry(shape), new MeshBasicMaterial({ color, fog: false }));
    m.position.z = z;
    scene.add(m);
  };
  ridge(1.7, 17, -200, 0x4a3216);
  ridge(4.2, 11, -170, 0x26200f);

  // Dust hanging over the range, catching the last light.
  const DUST = 170;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 70;
    dustPos[i * 3 + 1] = 0.4 + Math.random() * 9;
    dustPos[i * 3 + 2] = 6 - Math.random() * 80;
  }
  const dustGeo = new BufferGeometry();
  dustGeo.setAttribute('position', new Float32BufferAttribute(dustPos, 3));
  const dust = new Points(dustGeo, new PointsMaterial({ color: 0xf2c58a, size: 0.085, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(dust);

  // Ground and lane markings.
  const ground = new Mesh(new PlaneGeometry(900, 400), new MeshBasicMaterial({ color: GROUND }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -150;
  scene.add(ground);

  const rows = [
    { z: -13, range: 100 },
    { z: -30, range: 200 },
    { z: -50, range: 300 },
  ];
  const half = (LANES * LANE_W) / 2;
  const linePts: number[] = [];
  for (let i = 0; i <= LANES; i++) {
    const x = -half + i * LANE_W;
    linePts.push(x, 0.02, 9, x, 0.02, -78);
  }
  rows.forEach((r) => linePts.push(-half - 1.2, 0.02, r.z + 1.2, half + 1.2, 0.02, r.z + 1.2));
  const laneGeo = new BufferGeometry();
  laneGeo.setAttribute('position', new Float32BufferAttribute(linePts, 3));
  scene.add(new LineSegments(laneGeo, new LineBasicMaterial({ color: 0xe6dfc8, transparent: true, opacity: 0.2 })));

  // Stop butt with numbered lane boards along its crest.
  const butt = new Mesh(new BoxGeometry(170, 5.4, 10), new MeshBasicMaterial({ color: 0x171a11, fog: false }));
  butt.position.set(0, 2.7, -86);
  scene.add(butt);
  for (let l = 1; l <= LANES; l++) {
    const board = new Mesh(
      new PlaneGeometry(2.6, 1.7),
      new MeshBasicMaterial({ map: boardTexture(String(l), '#171a12', '#f1ecdc', stencil), fog: false }),
    );
    board.position.set(laneX(l), 7.2, -81);
    scene.add(board);
    const post = new Mesh(new BoxGeometry(0.18, 1.2, 0.18), new MeshBasicMaterial({ color: 0x14170f, fog: false }));
    post.position.set(laneX(l), 5.9, -81);
    scene.add(post);
  }

  // Distance boards beside each row.
  rows.forEach((r) => {
    [-1, 1].forEach((side) => {
      const b = new Mesh(
        new PlaneGeometry(1.9, 1.2),
        new MeshBasicMaterial({ map: boardTexture(String(r.range), SIGNAL, '#171a12', stencil) }),
      );
      b.position.set(side * (half + 2.3), 1.3, r.z + 1.2);
      scene.add(b);
      const p = new Mesh(new BoxGeometry(0.12, 0.8, 0.12), new MeshBasicMaterial({ color: 0x3b4030 }));
      p.position.set(side * (half + 2.3), 0.4, r.z + 1.2);
      scene.add(p);
    });
  });

  // Targets on lifters.
  const tex = plateTexture();
  const plateGeo = new PlaneGeometry(PLATE_W, PLATE_H);
  plateGeo.translate(0, PLATE_H / 2, 0);
  const baseGeo = new BoxGeometry(1.25, 0.42, 0.7);
  const baseMat = new MeshBasicMaterial({ color: 0x3b4030 });
  const targets: Target[] = [];
  const plates: Mesh[] = [];

  function makeTarget(lane: string, range: number) {
    const g = new Group();
    const base = new Mesh(baseGeo, baseMat);
    base.position.y = 0.21;
    g.add(base);
    const pivot = new Group();
    pivot.position.set(0, 0.42, -0.1);
    pivot.rotation.x = reduce ? 0 : DOWN;
    const mat = new MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: DoubleSide });
    const plate = new Mesh(plateGeo, mat);
    pivot.add(plate);
    g.add(pivot);
    const t: Target = { pivot, plate, mat, lane, range, up: reduce, marks: [] };
    plate.userData.target = t;
    targets.push(t);
    plates.push(plate);
    return g;
  }

  const layout: [number, number[]][] = [
    [0, [3, 6]],
    [1, [1, 4, 7]],
    [2, [2, 3, 5, 6]],
  ];
  layout.forEach(([row, lanes]) => {
    lanes.forEach((l) => {
      const g = makeTarget(String(l), rows[row].range);
      g.position.set(laneX(l), 0, rows[row].z);
      scene.add(g);
    });
  });

  // The mover: one target on a trolley, crossing the range on a rail.
  const MOVER_Z = -40;
  const railPts: number[] = [-half - 4, 0.12, MOVER_Z, half + 4, 0.12, MOVER_Z, -half - 4, 0.12, MOVER_Z - 0.7, half + 4, 0.12, MOVER_Z - 0.7];
  for (let x = -half - 4; x <= half + 4; x += 1.6) railPts.push(x, 0.12, MOVER_Z, x, 0.12, MOVER_Z - 0.7);
  const railGeo = new BufferGeometry();
  railGeo.setAttribute('position', new Float32BufferAttribute(railPts, 3));
  scene.add(new LineSegments(railGeo, new LineBasicMaterial({ color: 0xf79322, transparent: true, opacity: 0.55 })));
  const mover = makeTarget('Mover', 250);
  mover.position.set(-half - 2, 0.1, MOVER_Z - 0.35);
  scene.add(mover);
  const moverTarget = targets[targets.length - 1];
  if (!reduce) {
    gsap.to(mover.position, { x: half + 2, duration: 12, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  } else {
    mover.position.x = -6;
  }

  // ------------------------------------------------------------ behaviour
  const setUp = (t: Target, up: boolean, delay = 0) => {
    t.timer?.kill();
    if (up) {
      t.marks.forEach((m) => t.pivot.remove(m));
      t.marks = [];
    }
    t.timer = gsap.to(t.pivot.rotation, {
      x: up ? 0 : DOWN,
      delay,
      duration: reduce ? 0 : up ? 0.75 : 0.3,
      ease: up ? 'back.out(2.4)' : 'power2.in',
      onStart: () => {
        if (!up) t.up = false;
      },
      onComplete: () => {
        if (up) t.up = true;
      },
    });
    if (!up) t.up = false;
  };

  // Load sequence: nearest row first, then downrange.
  if (!reduce) {
    targets.forEach((t) => {
      const order = t === moverTarget ? 1.5 : t.range / 100 - 1;
      setUp(t, true, 0.7 + order * 0.34 + Math.random() * 0.22);
    });
    // Exposure programme: every so often a target conceals, then presents again.
    const cycle = () => {
      const pool = targets.filter((t) => t.up && t !== moverTarget && t !== hovered);
      if (pool.length && !document.hidden && visible) {
        const t = pool[Math.floor(Math.random() * pool.length)];
        setUp(t, false);
        gsap.delayedCall(1.7, () => setUp(t, true));
      }
      gsap.delayedCall(3.2 + Math.random() * 2.6, cycle);
    };
    gsap.delayedCall(6, cycle);
  }

  // ------------------------------------------------------------- pointer
  const ray = new Raycaster();
  const ndc = new Vector2();
  const local = new Vector3();
  const pointer = { x: 0, y: 0 };
  let hovered: Target | null = null;
  let hits = 0;
  const warm = new Color(1, 0.8, 0.55);
  const white = new Color(1, 1, 1);
  const reticle = host.querySelector<HTMLElement>('[data-reticle]');
  const moveX = reticle ? gsap.quickTo(reticle, 'x', { duration: 0.18, ease: 'power3.out' }) : null;
  const moveY = reticle ? gsap.quickTo(reticle, 'y', { duration: 0.18, ease: 'power3.out' }) : null;

  function pick(clientX: number, clientY: number) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    for (const hit of ray.intersectObjects(plates, false)) {
      const t = hit.object.userData.target as Target;
      if (!t.up) continue;
      local.copy(hit.point);
      t.pivot.worldToLocal(local);
      if (onPlate(local.x, local.y)) return { t, x: local.x, y: local.y };
    }
    return null;
  }

  function setHover(t: Target | null) {
    if (t === hovered) return;
    if (hovered) hovered.mat.color.copy(white);
    hovered = t;
    if (t) t.mat.color.copy(warm);
    reticle?.classList.toggle('is-locked', !!t);
  }

  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (e.pointerType === 'mouse') {
      reticle?.classList.add('is-on');
      moveX?.(e.clientX - r.left);
      moveY?.(e.clientY - r.top);
      setHover(pick(e.clientX, e.clientY)?.t ?? null);
    }
  });
  canvas.addEventListener('pointerleave', () => {
    reticle?.classList.remove('is-on');
    setHover(null);
    pointer.x = 0;
    pointer.y = 0;
  });

  const holeGeo = new CircleGeometry(0.075, 20);
  const ringGeo = new RingGeometry(0.11, 0.15, 28);
  canvas.addEventListener('click', (e) => {
    if (reticle) gsap.fromTo(reticle, { scale: 0.82 }, { scale: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)' });
    const hit = pick(e.clientX, e.clientY);
    if (!hit) return;
    const { t } = hit;
    hits += 1;
    const hole = new Mesh(holeGeo, new MeshBasicMaterial({ color: NIGHT }));
    hole.position.set(hit.x, hit.y, 0.02);
    const ring = new Mesh(ringGeo, new MeshBasicMaterial({ color: 0xf79322, transparent: true }));
    ring.position.set(hit.x, hit.y, 0.03);
    t.pivot.add(hole, ring);
    t.marks.push(hole, ring);
    if (!reduce) {
      gsap.fromTo(ring.scale, { x: 0.4, y: 0.4 }, { x: 2.6, y: 2.6, duration: 0.5, ease: 'power2.out' });
      gsap.to(ring.material, { opacity: 0, duration: 0.5, ease: 'power1.in' });
    }
    setHover(null);
    setUp(t, false, 0.07);
    gsap.delayedCall(2.4, () => setUp(t, true));
    const detail: HitDetail = {
      lane: t.lane,
      range: t.range,
      x: Math.round(hit.x * MM_PER_UNIT),
      y: Math.round((hit.y - PLATE_H * 0.4) * MM_PER_UNIT),
      u: hit.x / PLATE_W + 0.5,
      v: hit.y / PLATE_H,
      hits,
    };
    host.dispatchEvent(new CustomEvent<HitDetail>('range:hit', { detail }));
  });

  // -------------------------------------------------------------- render
  let visible = true;
  const state = { scroll: 0 };
  ScrollTrigger.create({
    trigger: host,
    start: 'top top',
    end: 'bottom top',
    onUpdate: (self) => (state.scroll = self.progress),
    onToggle: (self) => (visible = self.isActive || self.progress === 0),
  });

  function resize() {
    const w = host.clientWidth;
    const h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep all seven lanes in frame on tall, narrow screens.
    camera.fov = camera.aspect < 0.8 ? 62 : camera.aspect < 1.25 ? 50 : 38;
    // The headline owns the lower part of the hero, so lift the horizon.
    camera.setViewOffset(w, h, 0, Math.round(h * (camera.aspect < 0.8 ? 0.3 : 0.19)), w, h);
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  const cam = { x: 0, y: 0 };
  function frame() {
    if (!visible || document.hidden) return;
    const k = reduce ? 0 : 1;
    cam.x += (pointer.x * 1.5 * k - cam.x) * 0.045;
    cam.y += (-pointer.y * 0.45 * k - cam.y) * 0.045;
    camera.position.set(camBase.x + cam.x, camBase.y + cam.y + state.scroll * 2.2, camBase.z - state.scroll * 9);
    camera.lookAt(lookAt.x + cam.x * 0.25, lookAt.y + state.scroll * 5, lookAt.z);
    if (!reduce) {
      const p = dustGeo.attributes.position;
      for (let i = 0; i < DUST; i++) {
        let x = p.getX(i) + 0.006 + (i % 5) * 0.0016;
        if (x > 35) x = -35;
        p.setX(i, x);
        p.setY(i, p.getY(i) + Math.sin(performance.now() * 0.0004 + i) * 0.0016);
      }
      p.needsUpdate = true;
    }
    renderer.render(scene, camera);
  }
  gsap.ticker.add(frame);
  frame();
  host.classList.add('is-live');
}
