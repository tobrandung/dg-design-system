/* Gemeinsame Basis aller Seiten: Tokens, Grundstil, Theme-Schalter, Toast, Helfer. */
import '../dist/css/index.css';
import './styles/page.css';
import './styles/components.css';
import { gsap } from 'gsap';
import { dur, ease, distance, exitMs } from './motion.js';

export { gsap };
export * from './motion.js';
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
/** Animation nur, wenn erwünscht und die Seite sichtbar ist (verdeckte Tabs pausieren rAF). */
export const motion = () => !reduce.matches && !document.hidden;
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
gsap.defaults({ ease: ease.standard, duration: dur.base });

/* ---------- Toast ---------- */
let toastTimer;
export function toast(msg) {
  const el = $('#toast');
  if (!el) return;
  $('#toast-text').textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  if (motion()) gsap.fromTo(el, { y: distance * 2, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: dur.slow, ease: ease.enter });
  toastTimer = setTimeout(() => {
    const hide = () => { gsap.killTweensOf(el); gsap.set(el, { clearProps: 'all' }); el.hidden = true; };
    if (!motion()) { hide(); return; }
    gsap.to(el, { y: distance, autoAlpha: 0, duration: dur.fast, ease: ease.exit, onComplete: hide });
    setTimeout(hide, exitMs()); // falls rAF pausiert
  }, 3200);
}

/* ---------- Theme: Hell / Dunkel / System ---------- */
const root = document.documentElement;
const store = {
  get: () => { try { return localStorage.getItem('dg-theme'); } catch { return null; } },
  set: (v) => { try { localStorage.setItem('dg-theme', v); } catch { /* privat */ } }
};
// Standard ist Hell. Dunkel nur per Schalter oder „System“. Vor dem ersten Rendern setzen, damit nichts flackert.
const saved = ['light', 'dark', 'system'].includes(store.get()) ? store.get() : 'light';
if (saved !== 'system') root.setAttribute('data-theme', saved);

function initTheme() {
  const btns = $$('[data-theme-set]');
  const pill = $('.theme__pill');
  if (!btns.length) return;
  const activeBtn = () => btns.find((b) => b.getAttribute('aria-pressed') === 'true');
  const placePill = (btn, animate) => {
    const r = btn.getBoundingClientRect(), p = btn.parentElement.getBoundingClientRect();
    if (animate && motion()) gsap.to(pill, { x: r.left - p.left, width: r.width, duration: dur.slow, ease: ease.standard });
    else gsap.set(pill, { x: r.left - p.left, width: r.width });
  };
  const apply = (mode, ev) => {
    const set = () => {
      if (mode === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', mode);
      btns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === mode)));
    };
    placePill(btns.find((b) => b.dataset.themeSet === mode), !!ev);
    store.set(mode);
    if (ev && document.startViewTransition && motion()) {
      const x = ev.clientX || innerWidth - 80, y = ev.clientY || 32;
      const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      document.startViewTransition(set).ready.then(() => root.animate(
        { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: dur.slower * 1000, easing: getComputedStyle(root).getPropertyValue('--dg-motion-easing-standard'), pseudoElement: '::view-transition-new(root)' }
      ));
    } else set();
  };
  btns.forEach((b) => b.addEventListener('click', (e) => apply(b.dataset.themeSet, e)));
  apply(saved);
  addEventListener('resize', () => placePill(activeBtn(), false));
  document.fonts?.ready.then(() => placePill(activeBtn(), false));
}
initTheme();

/** Sanfter Einstieg für Elemente mit [data-reveal]. */
export function revealPage() {
  if (!motion()) return;
  gsap.from('[data-reveal]', { y: distance * 2, autoAlpha: 0, stagger: 0.05, duration: dur.slower, ease: ease.enter, clearProps: 'all' });
}
