/**
 * DG-Illustrations-Icons (exportiert von deutsche-glasfaser.de, siehe src/assets/dg-icons/manifest.json).
 *
 * Die Icons werden inline eingebunden, damit ihre Farben den Tokens folgen (Dark Mode) –
 * genau wie in Figma, wo dieselben Farben an Variablen gebunden sind:
 *   #464646 → icon/default · #14a0dc → icon/brand · #32c864 → icon/accent-green · #ebb40f → icon/accent-yellow
 * Klassen und IDs aus den SVGs bekommen pro Icon ein Präfix, damit sich mehrere Icons auf einer Seite nicht stören.
 */
const raw = import.meta.glob('../assets/dg-icons/*.svg', { eager: true, query: '?raw', import: 'default' });

const TOKEN = {
  '464646': 'icon-default', '363636': 'icon-default', '3b3f42': 'icon-default',
  '14a0dc': 'icon-brand', '138fcf': 'icon-brand', '199fdb': 'icon-brand',
  '32c864': 'icon-accent-green', '4fa44d': 'icon-accent-green', '51b263': 'icon-accent-green',
  'ebb40f': 'icon-accent-yellow', 'ebb411': 'icon-accent-yellow', 'eda300': 'icon-accent-yellow', 'ffa933': 'icon-accent-yellow'
};
const tokenFor = (hex) => TOKEN[hex.toLowerCase()];

function theme(svg, prefix) {
  return svg
    // Farben in <style>-Blöcken und style-Attributen
    .replace(/(fill|stroke)\s*:\s*#([0-9a-f]{6})\b/gi, (m, p, h) => (tokenFor(h) ? `${p}:var(--dg-color-${tokenFor(h)})` : m))
    // Klassen-Selektoren in <style> eindeutig machen
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (m, css) => m.replace(css, css.replace(/\.([A-Za-z_][\w-]*)/g, `.${prefix}-$1`)))
    // Farb-Attribute → style, Klassen und IDs mit Präfix
    .replace(/<([a-zA-Z][\w:-]*)(\s[^>]*?)?(\/?)>/g, (m, tag, attrs = '', sc) => {
      const style = [];
      attrs = attrs
        .replace(/\s(fill|stroke)="#([0-9a-fA-F]{6})"/g, (a, p, h) => (tokenFor(h) ? (style.push(`${p}:var(--dg-color-${tokenFor(h)})`), '') : a))
        .replace(/\sclass="([^"]*)"/g, (a, c) => ` class="${c.split(/\s+/).filter(Boolean).map((x) => `${prefix}-${x}`).join(' ')}"`)
        .replace(/\sid="([^"]*)"/g, (a, id) => ` id="${prefix}-${id}"`)
        .replace(/(href|xlink:href)="#([^"]+)"/g, (a, k, id) => `${k}="#${prefix}-${id}"`)
        .replace(/url\(#([^)]+)\)/g, (a, id) => `url(#${prefix}-${id})`);
      if (style.length) attrs = /\sstyle="/.test(attrs) ? attrs.replace(/\sstyle="([^"]*)"/, (a, s) => ` style="${s};${style.join(';')}"`) : `${attrs} style="${style.join(';')}"`;
      return `<${tag}${attrs}${sc}>`;
    })
    .replace(/url\(#([^)]+)\)/g, (a, id) => (id.startsWith(prefix) ? a : `url(#${prefix}-${id})`));
}

const cache = new Map();
/** Inline-SVG eines DG-Icons, z. B. dgIconSvg('privatkunde'). Größe kommt vom umgebenden Element. */
export function dgIconSvg(id) {
  if (cache.has(id)) return cache.get(id);
  const src = raw[`../assets/dg-icons/${id}.svg`];
  const svg = src ? theme(src.trim(), `dgi-${id}`).replace(/<svg\b([^>]*?)\s(width|height)="[^"]*"/g, '<svg$1').replace(/<svg\b([^>]*?)\s(width|height)="[^"]*"/g, '<svg$1').replace(/<svg\b/, '<svg aria-hidden="true" focusable="false" width="100%" height="100%"') : null;
  cache.set(id, svg);
  return svg;
}
/** true, wenn es ein DG-Icon mit dieser ID gibt */
export const hasDgIcon = (id) => Boolean(raw[`../assets/dg-icons/${id}.svg`]);
