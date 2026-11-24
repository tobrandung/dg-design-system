/**
 * Token-Build: tokens/*.tokens.json (DTCG) → dist/
 *
 *   dist/css/tokens.css       :root mit allen Tokens (Light-Werte), auch für [data-theme="light"]
 *   dist/css/theme-dark.css   Dark-Werte für prefers-color-scheme + [data-theme="dark"]
 *
 *   data-theme wirkt auf <html> und auf jedem anderen Element. So kann ein Bereich
 *   (z. B. das Band „Verfügbarkeit prüfen“) dauerhaft dunkel oder hell sein.
 *   dist/css/typography.css   Textstil-Klassen (.dg-heading-h1 …), mobil zuerst
 *   dist/css/index.css        bindet alles ein
 *   dist/tokens.mjs / .d.ts   aufgelöste Werte für JS
 *   dist/tokens.json          Liste aller Tokens für Doku und Tests
 *
 * Aufruf: npm run tokens:build  (läuft im Dev-Server automatisch bei jeder Änderung)
 */
import StyleDictionary from 'style-dictionary';
import { mkdir, writeFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const T = (f) => path.join(ROOT, 'tokens', f);
const DIST = path.join(ROOT, 'dist');

/* ---------- Konfiguration, die nicht in Figma lebt ---------- */
export const PREFIX = 'dg';
/** Fallback-Stacks für die Schriften aus Figma. Söhne ist lizenziert und wird lokal oder per @font-face geladen. */
const FONT_STACKS = {
  Sohne: ['Sohne', 'Söhne', 'Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
  'SohneDG Schmal': ['SohneDG Schmal', 'Söhne Schmal', 'Barlow Condensed', 'Arial Narrow', 'sans-serif']
};
/** Ab dieser Breite gelten die Desktop-Textstile. */
const BREAKPOINT_DESKTOP = '48rem';
/** Token-Gruppen, die in rem ausgegeben werden (skalieren mit der Browser-Schriftgröße). */
const REM_GROUPS = new Set(['font-size', 'line-height']);

/* ---------- Helfer ---------- */
const isRef = (v) => typeof v === 'string' && /^\{[^{}]+\}$/.test(v);
const varName = (p) => `--${PREFIX}-${p.join('-')}`;
const cssVar = (ref) => `var(${varName(ref.slice(1, -1).split('.'))})`;
const num = (n) => String(+Number(n).toFixed(4));

function colorCss(v) {
  if (typeof v === 'string') return v;
  if (!v || !v.components) return String(v);
  const hex = v.hex || '#' + v.components.map((c) => Math.round(c * 255).toString(16).padStart(2, '0')).join('');
  if (v.alpha === undefined || v.alpha >= 1) return hex;
  const [r, g, b] = v.components.map((c) => Math.round(c * 255));
  return `rgb(${r} ${g} ${b} / ${num(v.alpha)})`;
}
function dimCss(v, group) {
  if (typeof v === 'number') v = { value: v, unit: 'px' };
  if (typeof v === 'string') return v;
  if (v.unit !== 'px') return `${num(v.value)}${v.unit}`;
  if (v.value === 0) return '0';
  if (REM_GROUPS.has(group)) return `${num(v.value / 16)}rem`;
  return `${num(v.value)}px`;
}
const part = (v, fn) => (isRef(v) ? cssVar(v) : fn(v));

function shadowCss(value, refs) {
  const layers = Array.isArray(value) ? value : [value];
  return layers.map((l) => [
    l.inset ? 'inset' : '',
    refs ? part(l.offsetX, dimCss) : dimCss(l.offsetX),
    refs ? part(l.offsetY, dimCss) : dimCss(l.offsetY),
    refs ? part(l.blur, dimCss) : dimCss(l.blur),
    refs ? part(l.spread, dimCss) : dimCss(l.spread),
    refs ? part(l.color, colorCss) : colorCss(l.color)
  ].filter(Boolean).join(' ')).join(', ');
}
function fontCss(token, refs) {
  const o = token.original.$value;
  const r = token.$value;
  // Zeilenhöhe: Figma bindet line-height/* (px) – DTCG speichert das Verhältnis, die Referenz liegt in $extensions.
  const lhRef = token.original.$extensions?.['com.figma']?.lineHeight;
  const lhResolved = token.$extensions?.['com.figma']?.lineHeight;
  const fam = refs && isRef(o.fontFamily) ? cssVar(o.fontFamily) : fontStack(r.fontFamily);
  const weight = refs && isRef(o.fontWeight) ? cssVar(o.fontWeight) : r.fontWeight;
  const size = refs && isRef(o.fontSize) ? cssVar(o.fontSize) : dimCss(r.fontSize, 'font-size');
  const lh = refs && isRef(lhRef) ? cssVar(lhRef) : typeof lhResolved === 'string' ? lhResolved : num(r.lineHeight);
  return `${weight} ${size}/${lh} ${fam}`;
}
const fontStack = (f) => {
  if (typeof f === 'string' && f.includes(',')) return f; // schon transformiert
  const list = Array.isArray(f) ? f : FONT_STACKS[f] || [f, 'sans-serif'];
  return list.map((x) => (/^[a-z-]+$/.test(x) ? x : `"${x}"`)).join(', ');
};
/** Referenzen nur ausgeben, wenn der ganze Wert ein Alias ist (z. B. {color.gray.800}). */
const keepRef = (token) => isRef(token.original.$value);

/* ---------- Transforms ---------- */
StyleDictionary.registerTransform({ name: 'dg/name', type: 'name', transform: (t) => `${PREFIX}-${t.path.join('-')}` });
StyleDictionary.registerTransform({ name: 'dg/color', type: 'value', transitive: true, filter: (t) => t.$type === 'color', transform: (t) => colorCss(t.$value) });
StyleDictionary.registerTransform({ name: 'dg/dimension', type: 'value', transitive: true, filter: (t) => t.$type === 'dimension', transform: (t) => dimCss(t.$value, t.path[0]) });
StyleDictionary.registerTransform({ name: 'dg/duration', type: 'value', transitive: true, filter: (t) => t.$type === 'duration', transform: (t) => (typeof t.$value === 'string' ? t.$value : `${num(t.$value.value)}${t.$value.unit}`) });
StyleDictionary.registerTransform({ name: 'dg/cubicBezier', type: 'value', transitive: true, filter: (t) => t.$type === 'cubicBezier', transform: (t) => (Array.isArray(t.$value) ? `cubic-bezier(${t.$value.map(num).join(', ')})` : t.$value) });
StyleDictionary.registerTransform({ name: 'dg/fontFamily', type: 'value', transitive: true, filter: (t) => t.$type === 'fontFamily', transform: (t) => fontStack(t.$value) });
StyleDictionary.registerTransform({ name: 'dg/shadow', type: 'value', transitive: true, filter: (t) => t.$type === 'shadow', transform: (t) => shadowCss(t.original.$value, true) });
StyleDictionary.registerTransform({ name: 'dg/typography', type: 'value', transitive: true, filter: (t) => t.$type === 'typography', transform: (t) => fontCss(t, true) });
// Für JS/JSON: alles aufgelöst, keine var()-Verweise
StyleDictionary.registerTransform({ name: 'dg/shadow-resolved', type: 'value', transitive: true, filter: (t) => t.$type === 'shadow', transform: (t) => shadowCss(t.$value, false) });
StyleDictionary.registerTransform({ name: 'dg/typography-resolved', type: 'value', transitive: true, filter: (t) => t.$type === 'typography', transform: (t) => fontCss(t, false) });

const CSS_TRANSFORMS = ['dg/name', 'dg/color', 'dg/dimension', 'dg/duration', 'dg/cubicBezier', 'dg/fontFamily', 'dg/shadow', 'dg/typography'];
const JS_TRANSFORMS = ['dg/name', 'dg/color', 'dg/dimension', 'dg/duration', 'dg/cubicBezier', 'dg/fontFamily', 'dg/shadow-resolved', 'dg/typography-resolved'];

/* ---------- Formate ---------- */
const HEADER = '/* Automatisch erzeugt aus tokens/*.tokens.json – nicht von Hand ändern. Quelle: Figma */\n';
const line = (t, indent) => {
  const value = keepRef(t) ? cssVar(t.original.$value) : t.$value;
  const note = t.$deprecated ? ' /* veraltet */' : '';
  return `${indent}--${t.name}: ${value};${note}`;
};
StyleDictionary.registerFormat({
  name: 'dg/css-root',
  format: ({ dictionary }) => HEADER + `:root,\n[data-theme="light"] {\n  color-scheme: light;\n${dictionary.allTokens.map((t) => line(t, '  ')).join('\n')}\n}\n`
});
StyleDictionary.registerFormat({
  name: 'dg/css-dark',
  format: ({ dictionary }) => {
    const body = (i) => dictionary.allTokens.map((t) => line(t, i)).join('\n');
    return HEADER +
      `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n    color-scheme: dark;\n${body('    ')}\n  }\n}\n\n` +
      `:root[data-theme="dark"],\n[data-theme="dark"] {\n  color-scheme: dark;\n${body('  ')}\n}\n`;
  }
});
StyleDictionary.registerFormat({
  name: 'dg/typography-classes',
  format: ({ dictionary }) => {
    const styles = dictionary.allTokens.filter((t) => t.$type === 'typography' && !t.$deprecated);
    const props = (t) => {
      const ext = t.$extensions?.['com.figma'] || {};
      const out = [`font: var(--${t.name})`, `letter-spacing: ${num(ext.letterSpacingEm ?? 0)}em`];
      if (ext.textCase === 'UPPER') out.push('text-transform: uppercase');
      return out.map((p) => `${p};`).join(' ');
    };
    const base = [], desktop = [];
    for (const t of styles) {
      const [, group, ...rest] = t.path; // text, heading|body|label|display, …
      if (group === 'heading') {
        const [device, level] = rest;
        const cls = `.${PREFIX}-heading-${level}`;
        (device === 'mobile' ? base : desktop).push(`${cls} { ${props(t)} }`);
      } else {
        base.push(`.${PREFIX}-${[group, ...rest].join('-')} { ${props(t)} }`);
      }
    }
    return HEADER + base.join('\n') + `\n\n@media (min-width: ${BREAKPOINT_DESKTOP}) {\n  ${desktop.join('\n  ')}\n}\n`;
  }
});

/* ---------- Builds ---------- */
/** Alle Token-Dateien außer den Farb-Modes. Neue Collections aus Figma werden so automatisch mitgebaut. */
const BASE = readdirSync(path.join(ROOT, 'tokens')).filter((f) => f.endsWith('.tokens.json') && !f.startsWith('color.')).sort().map((f) => T(f));
const log = { verbosity: 'silent', warnings: 'disabled' };

export async function buildTokens({ quiet = false } = {}) {
  const t0 = Date.now();
  const light = new StyleDictionary({
    source: [...BASE, T('color.light.tokens.json')],
    log,
    platforms: {
      css: {
        transforms: CSS_TRANSFORMS, buildPath: path.join(DIST, 'css') + '/',
        files: [
          { destination: 'tokens.css', format: 'dg/css-root' },
          { destination: 'typography.css', format: 'dg/typography-classes', filter: (t) => t.$type === 'typography' }
        ]
      },
      js: { transforms: JS_TRANSFORMS }
    }
  });
  const dark = new StyleDictionary({
    include: BASE,
    source: [T('color.dark.tokens.json')],
    log,
    platforms: {
      css: {
        transforms: CSS_TRANSFORMS, buildPath: path.join(DIST, 'css') + '/',
        files: [{ destination: 'theme-dark.css', format: 'dg/css-dark', filter: (t) => t.isSource }]
      },
      js: { transforms: JS_TRANSFORMS }
    }
  });
  await light.buildPlatform('css');
  await dark.buildPlatform('css');
  await writeFile(path.join(DIST, 'css', 'index.css'), HEADER + `@import "./tokens.css";\n@import "./theme-dark.css";\n@import "./typography.css";\n`);

  // JS + JSON aus den aufgelösten Werten
  const flat = (tree, acc = []) => { for (const v of Object.values(tree)) { if (v && typeof v === 'object' && '$value' in v) acc.push(v); else if (v && typeof v === 'object') flat(v, acc); } return acc; };
  const lightTokens = flat(await light.exportPlatform('js'));
  const darkTokens = flat(await dark.exportPlatform('js')).filter((t) => t.isSource);
  const darkByName = new Map(darkTokens.map((t) => [t.name, t]));
  const set = (t) => path.basename(t.filePath).replace('.tokens.json', '').replace('.light', '');
  const docs = lightTokens.map((t) => ({
    name: t.path.join('.'),
    cssVar: `--${t.name}`,
    type: t.$type,
    set: set(t),
    value: t.$value,
    ...(darkByName.has(t.name) ? { dark: darkByName.get(t.name).$value } : {}),
    ...(isRef(t.original.$value) ? { alias: t.original.$value.slice(1, -1) } : {}),
    ...(darkByName.has(t.name) && isRef(darkByName.get(t.name).original.$value) ? { aliasDark: darkByName.get(t.name).original.$value.slice(1, -1) } : {}),
    ...(t.$description ? { description: t.$description } : {}),
    ...(t.$deprecated ? { deprecated: true } : {}),
    ...(t.$type === 'typography' ? { extensions: t.$extensions?.['com.figma'] } : {})
  }));
  await writeFile(path.join(DIST, 'tokens.json'), JSON.stringify(docs, null, 2) + '\n');
  const toObj = (list, key = 'value') => Object.fromEntries(list.map((d) => [d.name, d[key]]));
  await writeFile(path.join(DIST, 'tokens.mjs'),
    '// Automatisch erzeugt – nicht von Hand ändern.\n' +
    `export const light = ${JSON.stringify(toObj(docs), null, 2)};\n\n` +
    `export const dark = { ...light, ...${JSON.stringify(Object.fromEntries(docs.filter((d) => d.dark).map((d) => [d.name, d.dark])), null, 2)} };\n\n` +
    `export const cssVar = (name) => \`var(--${PREFIX}-\${name.replaceAll('.', '-')})\`;\n`);
  await writeFile(path.join(DIST, 'tokens.d.ts'),
    '// Automatisch erzeugt – nicht von Hand ändern.\n' +
    `export type TokenName =\n${docs.map((d) => `  | '${d.name}'`).join('\n')};\n` +
    'export declare const light: Record<TokenName, string | number>;\nexport declare const dark: Record<TokenName, string | number>;\nexport declare function cssVar(name: TokenName): string;\n');

  if (!quiet) console.log(`Tokens gebaut: ${docs.length} Tokens (${docs.filter((d) => d.dark).length} mit Dark-Wert) in ${Date.now() - t0} ms → dist/`);
  return docs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await mkdir(DIST, { recursive: true });
  await buildTokens();
}
