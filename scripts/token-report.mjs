/**
 * Token-Bericht für Pull Requests: vergleicht tokens/ im Arbeitsstand mit einem Basis-Branch.
 *
 *   - Was ist neu, was wurde geändert, was entfernt (Light und Dark getrennt)
 *   - Breaking Changes: entfernte oder umbenannte Tokens, geänderter Typ
 *   - Kontrast nach WCAG 2.2 für die wichtigsten Paare (Text auf Fläche, Rahmen von Bedienelementen)
 *   - Vorschlag für die nächste Version (major, minor, patch)
 *
 * Ausgabe: Markdown auf stdout. Exit-Code 1, wenn ein Kontrastpaar durch den PR neu unter den Grenzwert fällt.
 * Aufruf: node scripts/token-report.mjs --base origin/main
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (name, fallback) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : fallback; };
const BASE = arg('--base', 'origin/main');

/* ---------- Tokens laden ---------- */
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
function loadHead() {
  const dir = path.join(ROOT, 'tokens');
  return Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.tokens.json')).map((f) => [f.replace('.tokens.json', ''), JSON.parse(readFileSync(path.join(dir, f), 'utf8'))]));
}
function loadBase(ref) {
  let list = [];
  try { list = git('ls-tree', '--name-only', `${ref}:tokens`).split('\n').filter((f) => f.endsWith('.tokens.json')); } catch { return {}; }
  return Object.fromEntries(list.map((f) => [f.replace('.tokens.json', ''), JSON.parse(git('show', `${ref}:tokens/${f}`))]));
}
function flatten(node, p = [], out = {}) {
  if (node && typeof node === 'object' && '$value' in node) { out[p.join('.')] = node; return out; }
  if (node && typeof node === 'object') for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) flatten(v, [...p, k], out);
  return out;
}
/** Datei → Mode: color.light/color.dark gehören zu Light bzw. Dark, alles andere zu beiden. */
const modeOf = (file) => (file.endsWith('.dark') ? 'Dark' : file.endsWith('.light') ? 'Light' : '');
function index(files) {
  const all = {};
  for (const [file, tree] of Object.entries(files)) for (const [p, t] of Object.entries(flatten(tree))) all[`${p}${modeOf(file) ? ` (${modeOf(file)})` : ''}`] = { ...t, file };
  return all;
}

/* ---------- Werte lesbar machen ---------- */
const isRef = (v) => typeof v === 'string' && /^\{[^{}]+\}$/.test(v);
function show(v) {
  if (isRef(v)) return v.slice(1, -1).replace(/^color\./, '');
  if (v && typeof v === 'object' && 'hex' in v) return v.alpha !== undefined ? `${v.hex} ${+(v.alpha * 100).toFixed(1)} %` : v.hex;
  if (v && typeof v === 'object' && 'unit' in v) return `${v.value}${v.unit}`;
  if (Array.isArray(v) && v.length === 4 && v.every((n) => typeof n === 'number')) return `cubic-bezier(${v.join(', ')})`;
  if (Array.isArray(v)) return v.map(show).join(' + ');
  if (v && typeof v === 'object' && 'offsetY' in v) return `${show(v.offsetX)} ${show(v.offsetY)} ${show(v.blur)} ${show(v.spread)} ${show(v.color)}`;
  if (v && typeof v === 'object') return Object.entries(v).map(([k, x]) => `${k}: ${show(x)}`).join(', ');
  return String(v);
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ---------- Farben auflösen und Kontrast ---------- */
function palette(files, mode) {
  const map = {};
  for (const [file, tree] of Object.entries(files)) {
    const m = modeOf(file);
    if (m && m !== mode) continue;
    Object.assign(map, flatten(tree));
  }
  const resolve = (p, depth = 0) => {
    const t = map[p];
    if (!t || depth > 10) return null;
    return isRef(t.$value) ? resolve(t.$value.slice(1, -1), depth + 1) : t.$value;
  };
  return resolve;
}
function rgb(v) {
  if (!v || typeof v !== 'object' || v.alpha !== undefined) return null; // Farben mit Deckkraft hängen vom Untergrund ab, nicht prüfbar
  if (Array.isArray(v.components)) return v.components;
  return null;
}
const lum = ([r, g, b]) => [r, g, b].map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };

/** Paare, die im Projekt zählen. 4,5 = Text (WCAG 1.4.3), 3 = Bedienelemente und Fokus (WCAG 1.4.11). */
const PAIRS = [
  ['color.text.default', 'color.bg.default', 4.5], ['color.text.default', 'color.bg.subtle', 4.5],
  ['color.text.subtle', 'color.bg.default', 4.5], ['color.text.subtle', 'color.bg.subtle', 4.5],
  ['color.text.brand', 'color.bg.default', 4.5], ['color.text.link.default', 'color.bg.default', 4.5],
  ['color.text.on-brand', 'color.bg.brand.default', 4.5], ['color.text.on-brand', 'color.bg.brand.hover', 4.5],
  ['color.text.error', 'color.bg.default', 4.5], ['color.text.warning', 'color.bg.warning.subtle', 4.5],
  ['color.badge.brand.text', 'color.badge.brand.bg', 4.5], ['color.badge.error.text', 'color.badge.error.bg', 4.5],
  ['color.badge.success.text', 'color.badge.success.bg', 4.5], ['color.badge.warning.text', 'color.badge.warning.bg', 4.5],
  ['color.border.strong', 'color.bg.default', 3], ['color.border.focus', 'color.bg.default', 3]
];
function contrast(files, mode) {
  const resolve = palette(files, mode);
  return Object.fromEntries(PAIRS.map(([fg, bg, min]) => {
    const a = rgb(resolve(fg)), b = rgb(resolve(bg));
    return [`${fg} auf ${bg}`, a && b ? { value: ratio(a, b), min } : null];
  }));
}

/* ---------- Vergleich ---------- */
const head = loadHead();
const base = loadBase(BASE);
const H = index(head), B = index(base);
const added = Object.keys(H).filter((k) => !(k in B));
const removed = Object.keys(B).filter((k) => !(k in H));
const changed = Object.keys(H).filter((k) => k in B && !same(H[k].$value, B[k].$value));
const typeChanged = changed.filter((k) => H[k].$type !== B[k].$type);
const newlyDeprecated = Object.keys(H).filter((k) => H[k].$deprecated && B[k] && !B[k].$deprecated);
// Umbenennung erkennen: entfernt und neu mit gleichem Wert und Typ
const renamed = removed.map((r) => [r, added.find((a) => H[a].$type === B[r].$type && same(H[a].$value, B[r].$value))]).filter(([, a]) => a);
const breaking = [...removed.filter((r) => !B[r].$deprecated), ...typeChanged];

const rows = [];
const bump = breaking.length ? 'major' : added.length ? 'minor' : changed.length || newlyDeprecated.length ? 'patch' : null;

const lines = ['## Token-Änderungen aus Figma', ''];
if (!Object.keys(base).length) lines.push(`Basis \`${BASE}\` hat keine Tokens, Vergleich nicht möglich.`, '');
if (!bump) lines.push('Keine Änderungen an Token-Werten.', '');
else {
  lines.push(`| | Anzahl |`, `| --- | ---: |`, `| Geändert | ${changed.length} |`, `| Neu | ${added.length} |`, `| Entfernt | ${removed.length} |`, `| Breaking | ${breaking.length} |`, '');
  lines.push(`**Vorschlag für die Version: ${bump}**${breaking.length ? ' (entfernte oder umbenannte Tokens brechen Code, der sie nutzt)' : ''}`, '');
}
if (breaking.length) {
  lines.push('### Breaking Changes', '', 'Diese Tokens fehlen danach oder haben einen anderen Typ. Code, der sie nutzt, muss angepasst werden. Besser: in Figma erst als `_legacy/…` markieren (deprecated) und später löschen.', '');
  for (const k of breaking) { const r = renamed.find(([x]) => x === k); lines.push(`- \`${k}\`${r ? ` vermutlich umbenannt in \`${r[1]}\`` : typeChanged.includes(k) ? `: Typ ${B[k].$type} → ${H[k].$type}` : ' entfernt'}`); }
  lines.push('');
}
if (changed.length) {
  lines.push('### Geändert', '', '| Token | Vorher | Nachher |', '| --- | --- | --- |');
  for (const k of changed) lines.push(`| \`${k}\` | ${show(B[k].$value)} | ${show(H[k].$value)} |`);
  lines.push('');
}
if (added.length) {
  lines.push('### Neu', '', '| Token | Wert | Beschreibung |', '| --- | --- | --- |');
  for (const k of added) lines.push(`| \`${k}\` | ${show(H[k].$value)} | ${(H[k].$description || '').replace(/\|/g, '/')} |`);
  lines.push('');
}
if (newlyDeprecated.length) lines.push('### Als veraltet markiert', '', ...newlyDeprecated.map((k) => `- \`${k}\``), '');

// Kontrast
let regressions = 0;
lines.push('### Kontrast (WCAG 2.2 AA)', '', '| Paar | Mode | Vorher | Nachher | Grenze | Status |', '| --- | --- | ---: | ---: | ---: | --- |');
for (const mode of ['Light', 'Dark']) {
  const before = contrast(base, mode), after = contrast(head, mode);
  for (const [pair, a] of Object.entries(after)) {
    if (!a) continue;
    const b = before[pair];
    const ok = a.value >= a.min, wasOk = !b || b.value >= b.min;
    if (!ok && wasOk) regressions++;
    const moved = b && Math.abs(b.value - a.value) > 0.005;
    if (!moved && ok) continue; // unverändert und in Ordnung: nicht auflisten
    const status = ok ? 'ok' : wasOk ? '**neu unter Grenze**' : 'schon vorher unter Grenze';
    lines.push(`| \`${pair}\` | ${mode} | ${b ? b.value.toFixed(2) : '–'} | ${a.value.toFixed(2)} | ${a.min} | ${status} |`);
  }
}
lines.push('', 'Gelistet sind Paare, deren Kontrast sich ändert oder die unter der Grenze liegen. Text braucht 4,5 : 1, Rahmen und Fokus 3 : 1.', '');

process.stdout.write(lines.join('\n') + '\n');
if (regressions) { process.stderr.write(`${regressions} Kontrastpaar(e) fallen durch diese Änderung unter WCAG AA.\n`); process.exit(1); }
