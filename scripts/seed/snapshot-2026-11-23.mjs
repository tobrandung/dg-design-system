/**
 * Einmaliger Startpunkt: Stand der Figma-Datei vom 23.11.2026, ausgelesen über den Figma-MCP.
 * Danach kommen die Tokens nur noch über `npm run tokens:sync` (REST-API) oder das Figma-Plugin.
 * Aufruf: node scripts/seed/snapshot-2026-11-23.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { figmaToDtcg, stringify } from '../lib/figma-to-dtcg.mjs';

const hex = (h) => { const n = h.replace('#', ''); return { r: parseInt(n.slice(0, 2), 16) / 255, g: parseInt(n.slice(2, 4), 16) / 255, b: parseInt(n.slice(4, 6), 16) / 255, a: n.length > 6 ? parseInt(n.slice(6, 8), 16) / 255 : 1 }; };
const steps = ['25', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];
const ramps = {
  gray: ['f8f8f3', 'f3f3ed', 'eaeae6', 'ddddd9', 'cbcbc8', 'a5a5a2', '80807e', '636362', '525252', '464646', '2e2e2e', '181818'],
  brand: ['f5fbff', 'e6f5fe', 'd2ecfc', 'aedffd', '7dccf8', '4db7ee', '14a0dc', '007bad', '006592', '005078', '013c5d', '052941'],
  error: ['fff8f7', 'ffeeec', 'ffe0db', 'ffc8c1', 'ffa69b', 'ff7f73', 'fa5048', 'c8322e', 'a72724', '871c1a', '691211', '490d0b'],
  green: ['f2fff0', 'ebf8ee', 'cbf5d5', 'a4ebb5', '73da8e', '32c864', '28b445', '019303', '0f8111', '167017', '0e4c19', '0b2a12'],
  yellow: ['fffbed', 'fff7db', 'fff3bc', 'ffe994', 'ffd75f', 'ffcc34', 'ebb40f', 'ba8a00', '9a7000', '7a5800', '594203', '3a2c04'],
  orange: ['fdfcf8', 'fbf6ed', 'f6ecd5', 'f3dbae', 'f5c57b', 'ffa933', 'ef8600', 'da6a00', 'b45300', '8f4100', '70350a', '401f0b']
};
const dgNames = {
  'gray/25': 'DG: Sand', 'gray/50': 'DG: 5 Grau', 'gray/100': 'DG: 10 Grau', 'gray/200': 'DG: 20 Grau', 'gray/300': 'DG: 30 Grau', 'gray/600': 'DG: 80 Grau', 'gray/700': 'DG: 90 Grau', 'gray/800': 'DG: Basalt',
  'brand/500': 'DG: Himmel (Markenfarbe)', 'green/50': 'DG: Grün, sehr hell (Success-Hintergrund)', 'green/400': 'DG: Gras', 'green/600': 'DG: Grün / Success', 'green/800': 'DG: Success 2', 'green/950': 'DG: Grün, sehr dunkel (Success-Hintergrund Dark)',
  'yellow/50': 'DG: Gelb, sehr hell (Warning-Hintergrund)', 'yellow/300': 'DG: Blüte hover', 'yellow/400': 'DG: Blüte active', 'yellow/500': 'DG: Blüte', 'yellow/800': 'DG: Gelb, dunkel (Warning-Text)', 'yellow/950': 'DG: Gelb, sehr dunkel (Warning-Hintergrund Dark)',
  'orange/400': 'DG: Warning'
};

const collections = [
  { id: 'c:prim', name: 'Primitives', modes: [{ modeId: 'p', name: 'Value' }], defaultModeId: 'p' },
  { id: 'c:color', name: 'Color', modes: [{ modeId: 'l', name: 'Light' }, { modeId: 'd', name: 'Dark' }], defaultModeId: 'l' },
  { id: 'c:dim', name: 'Dimensions', modes: [{ modeId: 'v', name: 'Value' }], defaultModeId: 'v' },
  { id: 'c:typo', name: 'Typography', modes: [{ modeId: 't', name: 'Value' }], defaultModeId: 't' }
];
const variables = [];
const id = (name) => `v:${name}`;
const alias = (name) => ({ type: 'VARIABLE_ALIAS', id: id(name) });
const val = (x) => (typeof x === 'string' && x.startsWith('@') ? alias(x.slice(1)) : x);

for (const [ramp, hexes] of Object.entries(ramps)) hexes.forEach((h, i) => {
  const name = `color/${ramp}/${steps[i]}`;
  variables.push({ id: id(name), name, collectionId: 'c:prim', resolvedType: 'COLOR', valuesByMode: { p: hex(h) }, scopes: [], hiddenFromPublishing: true, description: dgNames[`${ramp}/${steps[i]}`] || 'Primitive: nicht direkt verwenden, sondern über semantische Tokens.' });
});
variables.push({ id: id('color/base/white'), name: 'color/base/white', collectionId: 'c:prim', resolvedType: 'COLOR', valuesByMode: { p: hex('ffffff') }, scopes: [], hiddenFromPublishing: true, description: 'Weiß' });
variables.push({ id: id('color/base/black'), name: 'color/base/black', collectionId: 'c:prim', resolvedType: 'COLOR', valuesByMode: { p: hex('000000') }, scopes: [], hiddenFromPublishing: true, description: 'Schwarz' });

// [Name, Light, Dark, Scopes, Beschreibung] – "@x" = Alias, "@x%70" = Alias mit Deckkraft
const color = [
  ['color/text/default', '@color/gray/800', '@color/gray/25', 'TEXT_FILL', 'Standard-Textfarbe'],
  ['color/text/subtle', '@color/gray/600', '@color/gray/200', 'TEXT_FILL', 'Sekundärtext, AA auf Weiß'],
  ['color/text/disabled', '@color/gray/400', '@color/gray/500', 'TEXT_FILL', 'Textfarbe: deaktivierte Elemente.'],
  ['color/text/inverse', '@color/gray/25', '@color/gray/800', 'TEXT_FILL', 'Text auf dunklem Grund (Sand)'],
  ['color/text/on-brand', '@color/base/white', '@color/base/white', 'TEXT_FILL', 'Text auf Brand-Flächen'],
  ['color/text/brand', '@color/brand/600', '@color/brand/200', 'TEXT_FILL', 'Brand-Text, AA auf Weiß'],
  ['color/text/link/default', '@color/brand/600', '@color/brand/200', 'TEXT_FILL', 'Textfarbe: Links, Standard.'],
  ['color/text/link/hover', '@color/brand/700', '@color/brand/100', 'TEXT_FILL', 'Textfarbe: Links, Hover-Zustand.'],
  ['color/text/link/active', '@color/brand/800', '@color/brand/50', 'TEXT_FILL', 'Textfarbe: Links, gedrückter/aktiver Zustand.'],
  ['color/text/link/visited', '@color/brand/800', '@color/brand/100', 'TEXT_FILL', 'Textfarbe: Links, besuchter Link.'],
  ['color/text/error', '@color/error/600', '@color/error/300', 'TEXT_FILL', 'Textfarbe: Fehler.'],
  ['color/text/success', '@color/green/800', '@color/green/400', 'TEXT_FILL', 'Textfarbe: Erfolg.'],
  ['color/text/warning', '@color/yellow/800', '@color/yellow/300', 'TEXT_FILL', 'Text für Warnhinweise (mind. 4,5:1 auf bg/warning/subtle).'],
  ['color/text/accent/yellow', '@color/yellow/500', '@color/yellow/500', 'TEXT_FILL', 'DG Blüte – nur auf dunklem Grund'],
  ['color/text/accent/green', '@color/green/400', '@color/green/400', 'TEXT_FILL', 'DG Gras – nur auf dunklem Grund'],
  ['color/icon/default', '@color/gray/800', '@color/gray/25', 'SHAPE_FILL,STROKE_COLOR', 'Iconfarbe: Standard.'],
  ['color/icon/subtle', '@color/gray/600', '@color/gray/200', 'SHAPE_FILL,STROKE_COLOR', 'Iconfarbe: zurückgenommen, für Hinweise und Sekundäres.'],
  ['color/icon/disabled', '@color/gray/300', '@color/gray/600', 'SHAPE_FILL,STROKE_COLOR', 'Iconfarbe: deaktivierte Elemente.'],
  ['color/icon/inverse', '@color/gray/25', '@color/gray/800', 'SHAPE_FILL,STROKE_COLOR', 'Iconfarbe: auf dunklen bzw. invertierten Flächen.'],
  ['color/icon/on-brand', '@color/base/white', '@color/base/white', 'SHAPE_FILL,STROKE_COLOR', 'Iconfarbe: auf Brand-Flächen (z. B. Primary Button).'],
  ['color/icon/brand', '@color/brand/500', '@color/brand/300', 'SHAPE_FILL,STROKE_COLOR', 'Iconfarbe: Markenfarbe.'],
  ['color/icon/error', '@color/error/600', '@color/error/300', 'SHAPE_FILL,STROKE_COLOR', 'Iconfarbe: Fehler.'],
  ['color/icon/success', '@color/green/600', '@color/green/400', 'SHAPE_FILL,STROKE_COLOR', 'Iconfarbe: Erfolg.'],
  ['color/icon/warning', '@color/orange/400', '@color/orange/400', 'SHAPE_FILL,STROKE_COLOR', 'Iconfarbe: Warnung.'],
  ['color/icon/accent/yellow', '@color/yellow/500', '@color/yellow/500', 'SHAPE_FILL,STROKE_COLOR', 'DG Blüte'],
  ['color/icon/accent/green', '@color/green/400', '@color/green/400', 'SHAPE_FILL,STROKE_COLOR', 'DG Gras'],
  ['color/bg/default', '@color/base/white', '@color/gray/700', 'FRAME_FILL,SHAPE_FILL', 'Flächen (Karten, Eingabefelder). Dark: heller als der Seitenhintergrund (Elevation).'],
  ['color/bg/subtle', '@color/gray/25', '@color/gray/800', 'FRAME_FILL,SHAPE_FILL', 'Seitenhintergrund. Light: Sand, Dark: Basalt.'],
  ['color/bg/muted', '@color/gray/50', '@color/gray/900', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: stark zurückgenommen.'],
  ['color/bg/disabled', '@color/gray/50', '@color/gray/700%70', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: deaktivierte Elemente.'],
  ['color/bg/inverse', '@color/gray/800', '@color/gray/25', 'FRAME_FILL,SHAPE_FILL', 'Dunkle Flächen (Basalt)'],
  ['color/bg/selected', '@color/brand/100', '@color/brand/900', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: ausgewählter Zustand.'],
  ['color/bg/neutral/default', '@color/gray/200', '@color/gray/600', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: neutrale interaktive Flächen, Standard.'],
  ['color/bg/neutral/hover', '@color/gray/300', '@color/gray/500', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: neutrale interaktive Flächen, Hover-Zustand.'],
  ['color/bg/neutral/active', '@color/gray/400', '@color/gray/400', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: neutrale interaktive Flächen, gedrückter/aktiver Zustand.'],
  ['color/bg/neutral/bold', '@color/gray/600', '@color/gray/200', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: neutrale interaktive Flächen, kräftig, hoher Kontrast.'],
  ['color/bg/brand/default', '@color/brand/500', '@color/brand/500', 'FRAME_FILL,SHAPE_FILL', 'Primäre Aktion'],
  ['color/bg/brand/hover', '@color/brand/600', '@color/brand/600', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: Markenfarbe, Hover-Zustand.'],
  ['color/bg/brand/active', '@color/brand/700', '@color/brand/700', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: Markenfarbe, gedrückter/aktiver Zustand.'],
  ['color/bg/brand/subtle', '@color/brand/50', '@color/brand/950', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: Markenfarbe, zurückgenommen, für Hinweise und Sekundäres.'],
  ['color/bg/brand/subtle-hover', '@color/brand/100', '@color/brand/900', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: Markenfarbe, Hover auf subtle.'],
  ['color/bg/error/default', '@color/error/600', '@color/error/600', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: Fehler, Standard.'],
  ['color/bg/error/hover', '@color/error/700', '@color/error/700', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: Fehler, Hover-Zustand.'],
  ['color/bg/error/active', '@color/error/800', '@color/error/800', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: Fehler, gedrückter/aktiver Zustand.'],
  ['color/bg/error/subtle', '@color/error/50', '@color/error/950', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: Fehler, zurückgenommen, für Hinweise und Sekundäres.'],
  ['color/bg/success/default', '@color/green/600', '@color/green/600', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: Erfolg, Standard.'],
  ['color/bg/success/subtle', '@color/green/50', '@color/green/950', 'FRAME_FILL,SHAPE_FILL', 'Heller Hintergrund für Erfolgs-/Statusmeldungen.'],
  ['color/bg/warning/default', '@color/orange/400', '@color/orange/400', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: Warnung, Standard.'],
  ['color/bg/warning/subtle', '@color/yellow/50', '@color/yellow/950', 'FRAME_FILL,SHAPE_FILL', 'Heller Hintergrund für Warnhinweise.'],
  ['color/bg/accent/yellow/default', '@color/yellow/500', '@color/yellow/500', 'FRAME_FILL,SHAPE_FILL', 'DG Blüte'],
  ['color/bg/accent/yellow/hover', '@color/yellow/300', '@color/yellow/300', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: Akzentfarbe, Gelb, Hover-Zustand.'],
  ['color/bg/accent/yellow/active', '@color/yellow/400', '@color/yellow/400', 'FRAME_FILL,SHAPE_FILL', 'Hintergrund: Akzentfarbe, Gelb, gedrückter/aktiver Zustand.'],
  ['color/bg/accent/green/default', '@color/green/400', '@color/green/400', 'FRAME_FILL,SHAPE_FILL', 'DG Gras'],
  ['color/border/subtle', '@color/gray/100', '@color/gray/600', 'STROKE_COLOR', 'Rahmenfarbe: zurückgenommen, für Hinweise und Sekundäres.'],
  ['color/border/default', '@color/gray/200', '@color/gray/500', 'STROKE_COLOR', 'Rahmenfarbe: Standard.'],
  ['color/border/medium', '@color/gray/400', '@color/gray/400', 'STROKE_COLOR', 'Rahmenfarbe: mittlere Stärke.'],
  ['color/border/strong', '@color/gray/500', '@color/gray/300', 'STROKE_COLOR', 'Formularfelder, ≥3:1'],
  ['color/border/bold', '@color/gray/800', '@color/gray/25', 'STROKE_COLOR', 'Rahmenfarbe: kräftig, hoher Kontrast.'],
  ['color/border/inverse', '@color/gray/25', '@color/gray/800', 'STROKE_COLOR', 'Rahmenfarbe: auf dunklen bzw. invertierten Flächen.'],
  ['color/border/disabled', '@color/gray/100', '@color/gray/700', 'STROKE_COLOR', 'Rahmenfarbe: deaktivierte Elemente.'],
  ['color/border/brand/default', '@color/brand/500', '@color/brand/300', 'STROKE_COLOR', 'Rahmenfarbe: Markenfarbe, Standard.'],
  ['color/border/brand/hover', '@color/brand/600', '@color/brand/200', 'STROKE_COLOR', 'Rahmenfarbe: Markenfarbe, Hover-Zustand.'],
  ['color/border/brand/active', '@color/brand/700', '@color/brand/100', 'STROKE_COLOR', 'Rahmenfarbe: Markenfarbe, gedrückter/aktiver Zustand.'],
  ['color/border/focus', '@color/brand/500', '@color/brand/400', 'STROKE_COLOR', 'Fokus-Ring, ≥3:1 auf Weiß und Brand'],
  ['color/border/selected', '@color/brand/500', '@color/brand/500', 'STROKE_COLOR', 'Rahmenfarbe: ausgewählter Zustand.'],
  ['color/border/error', '@color/error/600', '@color/error/300', 'STROKE_COLOR', 'Rahmenfarbe: Fehler.'],
  ['color/border/success', '@color/green/600', '@color/green/400', 'STROKE_COLOR', 'Rahmenfarbe: Erfolg.'],
  ['color/border/warning', '@color/orange/400', '@color/orange/400', 'STROKE_COLOR', 'Rahmenfarbe: Warnung.'],
  ['color/border/accent/yellow', '@color/yellow/500', '@color/yellow/500', 'STROKE_COLOR', 'Rahmenfarbe: Akzentfarbe, Gelb.'],
  ['color/border/accent/green', '@color/green/400', '@color/green/400', 'STROKE_COLOR', 'Rahmenfarbe: Akzentfarbe, Grün.'],
  ['color/focus-ring/brand', '@color/brand/100', '@color/brand/500%40', 'EFFECT_COLOR', 'Farbe des Fokusrings (4px) um fokussierte Felder und Buttons.'],
  ['color/focus-ring/error', '@color/error/100', '@color/error/400%40', 'EFFECT_COLOR', 'Farbe des Fokusrings bei fokussierten Feldern im Fehlerzustand.'],
  ...['gray', 'brand', 'error', 'warning', 'success'].flatMap((b) => {
    const t = {
      gray: ['@color/bg/muted', '@color/text/default', '@color/icon/subtle', '@color/gray/200', '@color/gray/700'],
      brand: ['@color/bg/brand/subtle', ['@color/brand/700', '@color/brand/200'], ['@color/brand/600', '@color/brand/300'], '@color/brand/200', '@color/brand/800'],
      error: ['@color/bg/error/subtle', '@color/text/error', '@color/icon/error', '@color/error/200', '@color/error/800'],
      warning: ['@color/bg/warning/subtle', '@color/text/warning', ['@color/yellow/800', '@color/yellow/300'], '@color/yellow/200', '@color/yellow/800'],
      success: ['@color/bg/success/subtle', '@color/text/success', '@color/icon/success', '@color/green/200', '@color/green/800']
    }[b];
    const pair = (x) => (Array.isArray(x) ? x : [x, x]);
    return [
      [`color/badge/${b}/bg`, ...pair(t[0]), 'FRAME_FILL,SHAPE_FILL', `Badge ${b}: Hintergrund.`],
      [`color/badge/${b}/text`, ...pair(t[1]), 'TEXT_FILL', `Badge ${b}: Label (mind. 4,5:1).`],
      [`color/badge/${b}/icon`, ...pair(t[2]), 'SHAPE_FILL,STROKE_COLOR', `Badge ${b}: Icon (mind. 3:1).`],
      [`color/badge/${b}/border`, t[3], t[4], 'STROKE_COLOR', `Badge-Rahmen ${b}: eine Stufe dunkler als der Badge-Hintergrund.`]
    ];
  }),
  ['color/scrollbar/thumb', '@color/gray/200', '@color/gray/600', 'FRAME_FILL,SHAPE_FILL', 'Scrollbar-Griff in Menüs und scrollbaren Flächen.']
];
for (const [name, l, d, scopes, description] of color) {
  const v = (x) => { const [n, op] = x.slice(1).split('%'); return op ? { color: alias(n), opacity: +op } : alias(n); };
  variables.push({ id: id(name), name, collectionId: 'c:color', resolvedType: 'COLOR', valuesByMode: { l: v(l), d: v(d) }, scopes: scopes.split(','), description });
}

const dims = [
  ...[['none', 0], ['3xs', 2], ['2xs', 4], ['xs', 8], ['sm', 12], ['md', 16], ['lg', 24], ['xl', 32], ['2xl', 40], ['3xl', 48], ['4xl', 56], ['5xl', 64], ['6xl', 80], ['7xl', 120]]
    .map(([k, n]) => [`spacing/${k}`, n, n >= 48 ? 'GAP' : 'WIDTH_HEIGHT,GAP', `Abstand ${n}px für Padding und Gaps; auch für feste Breiten/Höhen von Controls.`]),
  ['radius/none', 0, 'CORNER_RADIUS', 'Eckenradius 0px. Keine Rundung.'],
  ['radius/xs', 2, 'CORNER_RADIUS', 'Eckenradius 2px. Sehr kleine Elemente.'],
  ['radius/sm', 4, 'CORNER_RADIUS', 'Eckenradius 4px. Checkbox, kleine Tags.'],
  ['radius/md', 8, 'CORNER_RADIUS', 'Eckenradius 8px. Inputs, Selects, Buttons, Menüs.'],
  ['radius/lg', 12, 'CORNER_RADIUS', 'Eckenradius 12px. Karten und Panels.'],
  ['radius/xl', 16, 'CORNER_RADIUS', 'Eckenradius 16px. Große Container und Doku-Flächen.'],
  ['radius/full', 9999, 'CORNER_RADIUS', 'Eckenradius voll (9999). Pills: Badges, Chips, Avatare, Radio.'],
  ['border-width/none', 0, 'STROKE_FLOAT', 'Rahmenbreite 0px. Kein Rahmen.'],
  ['border-width/sm', 1, 'STROKE_FLOAT', 'Rahmenbreite 1px. Standard-Rahmen (Inputs, Karten, Trennlinien).'],
  ['border-width/md', 2, 'STROKE_FLOAT', 'Rahmenbreite 2px. Betonte Rahmen, z. B. ausgewählte Zustände.'],
  ['border-width/lg', 4, 'STROKE_FLOAT', 'Rahmenbreite 4px. Dicke Rahmen; Basis für focus-ring/width.'],
  ['focus-ring/width', '@border-width/lg', 'EFFECT_FLOAT', 'Breite des Fokusrings (box-shadow spread), = border-width/lg. Einziger Fokus-Breiten-Token.'],
  ['icon-size/xs', '@spacing/sm', 'WIDTH_HEIGHT', 'Icon 12px, nur in kleinen Badges.'],
  ['icon-size/sm', '@spacing/md', 'WIDTH_HEIGHT', 'Icon 16px: Info/Fehler in Formularfeldern, Badges md/lg, Checkbox-Häkchen.'],
  ['icon-size/md', 20, 'WIDTH_HEIGHT', 'Icon 20px: Zwischengröße, z. B. Icons in Buttons oder Listen neben body/md.'],
  ['icon-size/lg', '@spacing/lg', 'WIDTH_HEIGHT', 'Icon 24px: Standardgröße der Icon-Bibliothek (24er-Raster), z. B. Feld-Icons und Chevrons.']
];
for (const [name, value, scopes, description] of dims) variables.push({ id: id(name), name, collectionId: 'c:dim', resolvedType: 'FLOAT', valuesByMode: { v: val(value) }, scopes: scopes.split(','), description });
variables.push({ id: id('_legacy/color/basalt'), name: '_legacy/color/basalt', collectionId: 'c:dim', resolvedType: 'COLOR', valuesByMode: { v: alias('color/gray/800') }, scopes: [], description: 'Deprecated – nur noch von 6 Text-Layern mit „Söhne Kräftig“ auf der Foundations-Seite genutzt (Schnitt fehlt in Figma). Danach löschen.' });

const typo = [
  ['font-family/sans', 'STRING', 'Sohne', 'FONT_FAMILY', 'Grundschrift für Fließtext, Labels und Überschriften.'],
  ['font-family/display', 'STRING', 'SohneDG Schmal', 'FONT_FAMILY', 'Condensed-Schrift nur für H1 (Versalien).'],
  ['font-weight/regular', 'STRING', 'Buch', 'FONT_STYLE', 'Regular (CSS 400).'],
  ['font-weight/semibold', 'STRING', 'Halbfett', 'FONT_STYLE', 'Semibold (CSS 600).'],
  ...[12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 60].map((n) => [`font-size/${n}`, 'FLOAT', n, 'FONT_SIZE', `Schriftgröße ${n}px. Wird über die Textstile verwendet.`]),
  ...[16, 20, 24, 28, 32, 36, 40, 48, 56, 64].map((n) => [`line-height/${n}`, 'FLOAT', n, 'LINE_HEIGHT', `Zeilenhöhe ${n}px (4px-Raster). Wird über die Textstile verwendet.`])
];
for (const [name, type, value, scopes, description] of typo) variables.push({ id: id(name), name, collectionId: 'c:typo', resolvedType: type, valuesByMode: { t: value }, scopes: [scopes], description });

// Textstile: [Name, Familie, Gewicht, Größe, Zeilenhöhe, Laufweite %, Versalien, Beschreibung]
const T = [
  ['heading/desktop/h1-highlight', 'display', 'semibold', 60, 56, 1.5, 'UPPER', '60/56px · SohneDG Schmal Halbfett · Versalien'],
  ['heading/desktop/h1', 'sans', 'semibold', 48, 56, -3, 'ORIGINAL', '48/56px · Sohne Halbfett'],
  ['heading/desktop/h2', 'sans', 'semibold', 40, 48, -3, 'ORIGINAL', '40/48px · Sohne Halbfett'],
  ['heading/desktop/h3', 'sans', 'semibold', 32, 40, -4, 'ORIGINAL', '32/40px · Sohne Halbfett'],
  ['heading/desktop/h4', 'sans', 'semibold', 28, 36, -3, 'ORIGINAL', '28/36px · Sohne Halbfett'],
  ['heading/desktop/h5', 'sans', 'semibold', 20, 28, -3, 'ORIGINAL', '20/28px · Sohne Halbfett'],
  ['heading/desktop/h6', 'sans', 'semibold', 18, 24, -3, 'ORIGINAL', '18/24px · Sohne Halbfett'],
  ['heading/mobile/h1-highlight', 'display', 'semibold', 36, 32, 1.5, 'UPPER', '36/32px · SohneDG Schmal Halbfett · Versalien'],
  ['heading/mobile/h1', 'sans', 'semibold', 32, 40, -3, 'ORIGINAL', '32/40px · Sohne Halbfett'],
  ['heading/mobile/h2', 'sans', 'semibold', 24, 32, -3, 'ORIGINAL', '24/32px · Sohne Halbfett'],
  ['heading/mobile/h3', 'sans', 'semibold', 20, 28, -4, 'ORIGINAL', '20/28px · Sohne Halbfett'],
  ['heading/mobile/h4', 'sans', 'semibold', 18, 24, -3, 'ORIGINAL', '18/24px · Sohne Halbfett'],
  ['heading/mobile/h5', 'sans', 'semibold', 16, 24, -3, 'ORIGINAL', '16/24px · Sohne Halbfett'],
  ['heading/mobile/h6', 'sans', 'semibold', 14, 20, -3, 'ORIGINAL', '14/20px · Sohne Halbfett'],
  ...[['tiny', 12, 16], ['small', 14, 20], ['regular', 16, 24], ['medium', 18, 28], ['large', 20, 28], ['xlarge', 24, 32]].flatMap(([k, s, l]) => [
    [`body/${k}/book`, 'sans', 'regular', s, l, 0, 'ORIGINAL', `${s}/${l}px · Sohne Buch`],
    [`body/${k}/semibold`, 'sans', 'semibold', s, l, 0, 'ORIGINAL', `${s}/${l}px · Sohne Halbfett`]
  ]),
  ['label/button', 'sans', 'semibold', 16, 24, 0, 'ORIGINAL', '16/24px · Sohne Halbfett'],
  ['display/price', 'sans', 'semibold', 56, 64, 0, 'ORIGINAL', '56/64px · Sohne Halbfett'],
  ['_legacy/desktop-h3-regular', 'sans', 'regular', 32, 40, 0, 'ORIGINAL', 'Veraltet: Überschriften nur noch in Semibold.'],
  ['_legacy/mobile-h3-regular', 'sans', 'regular', 20, 28, 0, 'ORIGINAL', 'Veraltet: Überschriften nur noch in Semibold.']
];
const textStyles = T.map(([name, fam, w, size, lh, ls, tc, description]) => ({
  id: `s:${name}`, name, description, fontFamily: fam === 'display' ? 'SohneDG Schmal' : 'Sohne', fontStyle: w === 'semibold' ? 'Halbfett' : 'Buch', fontSize: size,
  lineHeight: { unit: 'PIXELS', value: lh }, letterSpacing: { unit: 'PERCENT', value: ls }, textCase: tc,
  boundVariables: { fontFamily: { id: id(`font-family/${fam}`) }, fontStyle: { id: id(`font-weight/${w}`) }, fontSize: { id: id(`font-size/${size}`) }, lineHeight: { id: id(`line-height/${lh}`) } }
}));

const sh = (h, x, y, r, s, bv) => ({ type: 'DROP_SHADOW', color: hex(h), offset: { x, y }, radius: r, spread: s, boundVariables: bv || {} });
const ring = (c) => sh(c === 'brand' ? 'd2ecfc' : 'ffe0db', 0, 0, 0, 4, { color: { id: id(`color/focus-ring/${c}`) }, spread: { id: id('focus-ring/width') } });
const effectStyles = [
  ['shadow/xs', [sh('0529410f', 0, 1, 3, 0)]],
  ['shadow/sm', [sh('05294112', 0, 1, 3, 0), sh('0529411d', 0, 1, 4, 0)]],
  ['shadow/md', [sh('05294112', 0, 2, 5, -2), sh('0529411d', 0, 4, 10, -2)]],
  ['shadow/lg', [sh('05294105', 0, 4, 8, -2), sh('05294114', 0, 12, 20, -4)]],
  ['shadow/xl', [sh('05294109', 0, 8, 10, -4), sh('05294117', 0, 20, 30, -4)]],
  ['shadow/2xl', [sh('05294135', 0, 24, 60, -12)]],
  ['shadow/3xl', [sh('05294129', 0, 32, 80, -12)]],
  ['focus-ring/brand', [ring('brand')], 'Fokusring 4px (brand). Für fokussierte Buttons, Links und Controls ohne eigenen Schatten.'],
  ['focus-ring/error', [ring('error')], 'Fokusring 4px (error). Für fokussierte Controls im Fehlerzustand.'],
  ['shadow/xs-focus-brand', [ring('brand'), sh('0529410f', 0, 1, 3, 0)], 'shadow/xs + Fokusring 4px brand. Für Formularfelder im Zustand Focused/Open.'],
  ['shadow/xs-focus-error', [ring('error'), sh('0529410f', 0, 1, 3, 0)], 'shadow/xs + Fokusring 4px error. Für Formularfelder, die im Fehlerzustand fokussiert sind.'],
  ['_legacy/shadow-card', [sh('0529412f', 2, 4, 20, 0)]],
  ['_legacy/shadow-card-lg', [sh('0529412f', 5, 10, 20, 0)]],
  ['blur/background', [{ type: 'BACKGROUND_BLUR', radius: 18 }]]
].map(([name, effects, description = '']) => ({ id: `s:${name}`, name, description, effects }));

const model = { file: { key: 'ogmZxRg1zUFxtTyH8mrOFL', name: 'Deutsche Glasfaser Relaunch (migrated) Copy' }, collections, variables, textStyles, effectStyles };
const { files, conflicts } = figmaToDtcg(model, { includeFigmaMeta: false });
if (conflicts.length) throw new Error('Pfad-Konflikte: ' + conflicts.join(', '));
const dir = new URL('../../tokens/', import.meta.url);
await mkdir(dir, { recursive: true });
for (const [name, content] of Object.entries(files)) await writeFile(new URL(`${name}.tokens.json`, dir), stringify(content));
console.log('Tokens geschrieben:', Object.keys(files).map((f) => `${f}.tokens.json`).join(', '));
