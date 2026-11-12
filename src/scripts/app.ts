// Site-wide behaviour: smooth scroll, header, the scroll rail, and the shared
// motion vocabulary (hinge-up headings, wipe-in media, counters, accordions).
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

const root = document.documentElement;
export const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------ smooth scroll
export let lenis: Lenis | null = null;
if (!reduceMotion) {
  lenis = new Lenis({ lerp: 0.11, wheelMultiplier: 1, anchors: { offset: -70 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis!.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}
export function scrollToEl(el: Element) {
  if (lenis) lenis.scrollTo(el as HTMLElement, { offset: -70, duration: 1.2 });
  else el.scrollIntoView({ block: 'start' });
}
export function lockScroll(lock: boolean) {
  if (lenis) lock ? lenis.stop() : lenis.start();
  root.style.overflow = lock ? 'hidden' : '';
}

// ------------------------------------------------------------------- header
function initHeader() {
  const header = document.querySelector<HTMLElement>('[data-header]');
  const btn = document.querySelector<HTMLButtonElement>('[data-menu-btn]');
  if (!header || !btn) return;

  ScrollTrigger.create({
    start: 0,
    end: 'max',
    onUpdate(self) {
      const y = self.scroll();
      header.classList.toggle('is-stuck', y > 24);
      if (header.classList.contains('menu-open')) return;
      header.classList.toggle('is-hidden', self.direction === 1 && y > 420);
    },
  });
  header.addEventListener('focusin', () => header.classList.remove('is-hidden'));

  const setMenu = (open: boolean) => {
    header.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    lockScroll(open);
  };
  btn.addEventListener('click', () => setMenu(!header.classList.contains('menu-open')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && header.classList.contains('menu-open')) {
      setMenu(false);
      btn.focus();
    }
  });
  window.matchMedia('(min-width: 861px)').addEventListener('change', (e) => e.matches && setMenu(false));
}

// ----------------------------------------------------------- hinge headings
// Each line of a heading swings up from flat, hinged along its baseline.
function initHinge() {
  document.querySelectorAll<HTMLElement>('[data-hinge]').forEach((el) => {
    if (reduceMotion) return;
    const onLoad = el.dataset.hinge === 'load';
    const delay = Number(el.dataset.hingeDelay || (onLoad ? 0.15 : 0));
    SplitText.create(el, {
      type: 'lines',
      linesClass: 'hinge-line',
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          rotationX: -84,
          opacity: 0,
          transformPerspective: 900,
          transformOrigin: '50% 100%',
          duration: 0.95,
          ease: 'back.out(1.5)',
          stagger: 0.085,
          delay,
          scrollTrigger: onLoad ? undefined : { trigger: el, start: 'top 88%', once: true },
        });
      },
    });
  });
}

// --------------------------------------------------------------- wipe media
function initWipe() {
  document.querySelectorAll<HTMLElement>('[data-wipe]').forEach((el) => {
    if (reduceMotion) return;
    const img = el.querySelector('img, video');
    const from = el.dataset.wipe === 'left' ? 'inset(0 100% 0 0)' : 'inset(100% 0 0 0)';
    const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: 'top 86%', once: true } });
    tl.fromTo(el, { clipPath: from }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, ease: 'power3.inOut' });
    if (img) tl.fromTo(img, { scale: 1.22 }, { scale: 1, duration: 1.5, ease: 'power3.out' }, 0);
  });

  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((el) => {
    if (reduceMotion) return;
    const amount = Number(el.dataset.parallax || 10);
    gsap.fromTo(
      el,
      { yPercent: -amount / 2 },
      {
        yPercent: amount / 2,
        ease: 'none',
        scrollTrigger: { trigger: el.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
      },
    );
  });
}

// ----------------------------------------------------------- scrubbed text
// Words come into full ink as the paragraph crosses the viewport.
function initScrubText() {
  document.querySelectorAll<HTMLElement>('[data-scrub-text]').forEach((el) => {
    if (reduceMotion) return;
    SplitText.create(el, {
      type: 'words',
      autoSplit: true,
      onSplit(self) {
        return gsap.fromTo(
          self.words,
          { opacity: 0.16 },
          {
            opacity: 1,
            ease: 'none',
            stagger: 0.12,
            scrollTrigger: { trigger: el, start: 'top 82%', end: 'bottom 52%', scrub: 0.4 },
          },
        );
      },
    });
  });
}

// ----------------------------------------------------------------- counters
function initCounters() {
  const fmt = new Intl.NumberFormat('en-AU');
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    if (reduceMotion) {
      el.textContent = fmt.format(end);
      return;
    }
    const state = { v: 0 };
    el.textContent = '0';
    gsap.to(state, {
      v: end,
      duration: 2.2,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      onUpdate: () => (el.textContent = fmt.format(Math.round(state.v))),
    });
  });
}

// ---------------------------------------------------------------- accordion
function initAccordions() {
  document.querySelectorAll<HTMLElement>('.acc').forEach((acc) => {
    const single = acc.dataset.single !== undefined;
    const buttons = Array.from(acc.querySelectorAll<HTMLButtonElement>('.acc__q'));
    const setOpen = (b: HTMLButtonElement, open: boolean) => {
      b.setAttribute('aria-expanded', String(open));
      const panel = b.nextElementSibling as HTMLElement | null;
      if (panel) panel.inert = !open;
    };
    buttons.forEach((b) => {
      setOpen(b, b.getAttribute('aria-expanded') === 'true');
      b.addEventListener('click', () => {
        const open = b.getAttribute('aria-expanded') !== 'true';
        if (single && open) buttons.forEach((o) => o !== b && setOpen(o, false));
        setOpen(b, open);
        // Panel heights change; let scroll-linked animations re-measure.
        setTimeout(() => ScrollTrigger.refresh(), 560);
      });
    });
  });
}

// --------------------------------------------------------------- scroll rail
function initRail() {
  const rail = document.querySelector<HTMLElement>('[data-rail-root]');
  if (!rail) return;
  const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-rail]'));
  if (sections.length < 3) return;
  const mover = rail.querySelector<HTMLElement>('.rail__mover')!;
  const label = rail.querySelector<HTMLElement>('.rail__label')!;
  const ticks = sections.map((s) => {
    const t = document.createElement('button');
    t.type = 'button';
    t.className = 'rail__tick';
    t.tabIndex = -1;
    t.title = s.dataset.rail || '';
    t.addEventListener('click', () => scrollToEl(s));
    rail.appendChild(t);
    return t;
  });

  let tops: number[] = [];
  let max = 1;
  const measure = () => {
    max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    tops = sections.map((s) => Math.min(max, s.getBoundingClientRect().top + window.scrollY));
    ticks.forEach((t, i) => (t.style.top = `${(tops[i] / max) * 100}%`));
  };
  let idle: number | undefined;
  const update = () => {
    const y = window.scrollY;
    const h = rail.offsetHeight;
    const p = Math.min(1, Math.max(0, y / max));
    mover.style.transform = `translateY(${p * h}px)`;
    label.style.transform = `translateY(${p * h}px)`;
    const probe = y + window.innerHeight * 0.35;
    let current = 0;
    tops.forEach((t, i) => {
      const passed = t <= probe;
      if (passed) current = i;
      ticks[i].classList.toggle('is-passed', t <= y + 2);
    });
    label.textContent = sections[current].dataset.rail || '';
    rail.classList.add('is-scrolling');
    clearTimeout(idle);
    idle = window.setTimeout(() => rail.classList.remove('is-scrolling'), 1400);
  };
  measure();
  ScrollTrigger.addEventListener('refresh', measure);
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update });
  update();
  rail.classList.remove('is-scrolling');
  rail.classList.add('is-ready');
}

// ---------------------------------------------------------- background video
// Hero video is large, so it only loads on wide screens with motion allowed
// and no data-saver, and fades in over the still once it can play.
function initBgVideo() {
  document.querySelectorAll<HTMLVideoElement>('video[data-bg-video]').forEach((v) => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (reduceMotion || window.innerWidth < 900 || conn?.saveData) return;
    v.addEventListener('playing', () => v.classList.add('is-playing'), { once: true });
    const start = () => {
      v.src = v.dataset.bgVideo!;
      v.play().catch(() => {});
    };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
  });
}

// --------------------------------------------------------------------- boot
function boot() {
  initHeader();
  initHinge();
  initWipe();
  initScrubText();
  initCounters();
  initAccordions();
  initBgVideo();
  root.classList.add('app-ready');
  initRail();
  window.addEventListener('load', () => ScrollTrigger.refresh());
}

// Lines are measured from rendered text, so wait for the display face.
const fontsReady = document.fonts?.ready ?? Promise.resolve();
Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1500))]).then(boot);
