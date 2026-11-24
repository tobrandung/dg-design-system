/**
 * Motion-Tokens aus Figma (Collection „Motion“) für GSAP.
 * CSS nutzt dieselben Werte direkt: var(--dg-motion-duration-base), var(--dg-motion-easing-enter) …
 *
 * Regeln (wie shadcn/ui bzw. Material 3):
 *  - Erscheinen: enter-Easing, base (Flyout) oder slow (Dialog). Leicht skaliert (scale/enter) und versetzt (distance/enter).
 *  - Verschwinden: exit-Easing, immer fast. Ausblenden ist kürzer als Einblenden.
 *  - Zustandswechsel auf der Seite: standard-Easing.
 *  - spring nur für kleine Bestätigungen (Häkchen, Auswahl), nie für Flächen.
 *  - prefers-reduced-motion: alle Dauern 0.
 */
import { gsap } from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { light } from '../dist/tokens.mjs';

gsap.registerPlugin(CustomEase);
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
// Rückfallwerte nur für den Fall, dass ein Token fehlt (z. B. in Figma gelöscht). Maßgeblich sind die Tokens.
const FALLBACK = { fast: '200ms', base: '250ms', slow: '350ms', slower: '600ms', standard: '0.2,0,0,1', enter: '0,0,0.2,1', exit: '0.4,0,1,1', spring: '0.34,1.56,0.64,1' };
const sec = (v) => (reduce.matches ? 0 : parseFloat(v) / 1000);
const bezier = (v) => String(v).replace(/^cubic-bezier\(|\)$/g, '').replace(/\s+/g, '');
const token = (group, k) => {
  const v = light[`motion.${group}.${k}`];
  if (v === undefined) console.warn(`Motion-Token motion.${group}.${k} fehlt, nutze ${FALLBACK[k]}`);
  return v ?? FALLBACK[k];
};

/** Dauer in Sekunden: fast 200 ms, base 250 ms, slow 350 ms, slower 600 ms (Werte aus Figma) */
export const dur = Object.fromEntries(['fast', 'base', 'slow', 'slower'].map((k) => [k, sec(token('duration', k))]));
/** GSAP-Easings aus den cubic-bezier-Tokens */
export const ease = Object.fromEntries(['standard', 'enter', 'exit', 'spring'].map((k) => [k, CustomEase.create(`dg-${k}`, bezier(token('easing', k)))]));
/** Startgröße beim Einblenden (0.95) */
export const scaleEnter = Number(light['motion.scale.enter']) || 0.95;
/** Versatz beim Einblenden in px (spacing/xs) */
export const distance = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dg-motion-distance-enter')) || 8;
/** Wartezeit in ms, bis eine Ausblende-Animation sicher fertig ist (Fallback für pausierte Tabs) */
export const exitMs = () => Math.round(dur.fast * 1000) + 40;
