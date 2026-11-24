/**
 * Figma → DTCG (Design Tokens Format Module 2025.10)
 *
 * Input ist ein normalisiertes Figma-Modell, das das Figma-Plugin (figma-plugin/) aus der
 * Plugin-API liest. Das Plugin bekommt diese Datei beim Build eingebaut (npm run plugin:build).
 *
 * Modell:
 * {
 *   file: { key, name },
 *   collections: [{ id, name, modes: [{ modeId, name }], defaultModeId }],
 *   variables:   [{ id, key, name, collectionId, resolvedType, valuesByMode, description, scopes, hiddenFromPublishing }],
 *   textStyles:  [{ id, key, name, description, fontFamily, fontStyle, fontSize, lineHeight: {unit, value}, letterSpacing: {unit, value}, textCase, boundVariables }],
 *   effectStyles:[{ id, key, name, description, effects: [{ type, color: {r,g,b,a}, offset: {x,y}, radius, spread, boundVariables }] }]
 * }
 *
 * Output: { [dateiname]: dtcgObjekt }, z. B. "primitives", "color.light", "color.dark",
 * "dimensions", "typography", "text-styles", "effect-styles".
 */

/** Figma-Schnittnamen → CSS font-weight. Erweitern, wenn neue Schnitte dazukommen. */
export const FONT_WEIGHTS = {
  Buch: 400, Book: 400, Regular: 400, Normal: 400,
  Kräftig: 500, Medium: 500,
  Halbfett: 600, Semibold: 600, 'Semi Bold': 600, SemiBold: 600,
  Dreiviertelfett: 700, Fett: 700, Bold: 700
};

const hex2 = (x) => Math.round(x * 255).toString(16).padStart(2, '0');
const round = (n, d = 4) => +Number(n).toFixed(d);
const slug = (s) => String(s).trim().toLowerCase().replace(/\s+/g, '-');

export function colorValue({ r, g, b, a = 1 }, alphaOverride) {
  const alpha = alphaOverride ?? a ?? 1;
  const v = { colorSpace: 'srgb', components: [round(r), round(g), round(b)], hex: `#${hex2(r)}${hex2(g)}${hex2(b)}` };
  if (alpha < 1) v.alpha = round(alpha, 3);
  return v;
}

/** "_legacy/color/basalt" → ["legacy","color","basalt"] */
export const tokenPath = (name) => name.replace(/^_legacy\//, 'legacy/').split('/').map(slug);
const isLegacy = (name) => /^_legacy\//.test(name);
const px = (value) => ({ value: round(value, 3), unit: 'px' });

function tokenType(v) {
  const s = v.scopes || [];
  if (v.resolvedType === 'COLOR') return 'color';
  if (v.resolvedType === 'STRING') {
    if (s.includes('FONT_FAMILY') || v.name.startsWith('font-family')) return 'fontFamily';
    if (s.includes('FONT_STYLE') || v.name.startsWith('font-weight')) return 'fontWeight';
    return 'string';
  }
  if (v.resolvedType === 'FLOAT') {
    if (s.includes('FONT_WEIGHT')) return 'fontWeight';
    if (s.includes('OPACITY')) return 'number';
    return 'dimension';
  }
  if (v.resolvedType === 'BOOLEAN') return 'boolean';
  return 'string';
}

function setDeep(root, path, token, conflicts) {
  let node = root;
  for (let i = 0; i < path.length - 1; i++) {
    node[path[i]] ??= {};
    node = node[path[i]];
    if (node.$value !== undefined) conflicts.push(path.join('.'));
  }
  const leaf = path[path.length - 1];
  if (node[leaf]) conflicts.push(path.join('.'));
  node[leaf] = token;
}

export function figmaToDtcg(model, { includeFigmaMeta = true } = {}) {
  const files = {};
  const conflicts = [];
  const byId = new Map(model.variables.map((v) => [v.id, v]));
  const colById = new Map(model.collections.map((c) => [c.id, c]));
  const ref = (v) => `{${tokenPath(v.name).join('.')}}`;
  const refById = (id) => (byId.has(id) ? ref(byId.get(id)) : null);

  /** Wert eines Variablen-Alias auflösen (für Alias + Deckkraft). */
  const resolveRaw = (v, modeName) => {
    const col = colById.get(v.collectionId);
    const mode = col.modes.find((m) => m.name === modeName) || col.modes.find((m) => m.modeId === col.defaultModeId) || col.modes[0];
    let raw = v.valuesByMode[mode.modeId];
    if (raw && raw.type === 'VARIABLE_ALIAS') return resolveRaw(byId.get(raw.id), modeName);
    return raw;
  };

  const fileFor = (col, mode) => (col.modes.length > 1 ? `${slug(col.name)}.${slug(mode.name)}` : slug(col.name));

  for (const col of model.collections) {
    for (const mode of col.modes) {
      const file = fileFor(col, mode);
      files[file] ??= {};
      for (const v of model.variables.filter((x) => x.collectionId === col.id)) {
        const type = tokenType(v);
        const raw = v.valuesByMode[mode.modeId];
        const meta = { key: v.key, scopes: v.scopes };
        if (v.hiddenFromPublishing) meta.hiddenFromPublishing = true;
        let value;
        if (raw && raw.type === 'VARIABLE_ALIAS') {
          value = refById(raw.id);
        } else if (raw && raw.color && raw.color.type === 'VARIABLE_ALIAS') {
          // Figma: Alias mit eigener Deckkraft. DTCG kennt das nicht, daher als aufgelöste Farbe mit Alpha.
          const target = byId.get(raw.color.id);
          value = colorValue(resolveRaw(target, mode.name), (raw.opacity ?? 100) / 100);
          meta.aliasOf = ref(target);
          meta.aliasOpacity = raw.opacity;
        } else if (type === 'color') {
          value = colorValue(raw);
        } else if (type === 'dimension') {
          value = px(raw);
        } else if (type === 'fontWeight') {
          value = typeof raw === 'number' ? raw : FONT_WEIGHTS[raw] ?? 400;
          if (typeof raw === 'string') meta.fontStyle = raw;
        } else {
          value = raw;
        }
        const token = { $type: type, $value: value };
        if (v.description) token.$description = v.description;
        if (isLegacy(v.name)) token.$deprecated = v.description || true;
        if (includeFigmaMeta) token.$extensions = { 'com.figma': meta };
        setDeep(files[file], tokenPath(v.name), token, conflicts);
      }
    }
  }

  // Textstile → typography-Tokens
  if (model.textStyles?.length) {
    files['text-styles'] = {};
    for (const s of model.textStyles) {
      const bv = s.boundVariables || {};
      const letterEm = s.letterSpacing.unit === 'PERCENT' ? s.letterSpacing.value / 100 : s.letterSpacing.value / s.fontSize;
      const lineHeightPx = s.lineHeight.unit === 'PIXELS' ? s.lineHeight.value : s.lineHeight.unit === 'PERCENT' ? (s.lineHeight.value / 100) * s.fontSize : null;
      const value = {
        fontFamily: refById(bv.fontFamily?.id) ?? s.fontFamily,
        fontWeight: refById(bv.fontStyle?.id) ?? refById(bv.fontWeight?.id) ?? FONT_WEIGHTS[s.fontStyle] ?? 400,
        fontSize: refById(bv.fontSize?.id) ?? px(s.fontSize),
        lineHeight: round((lineHeightPx ?? s.fontSize * 1.2) / s.fontSize),
        letterSpacing: px(letterEm * s.fontSize)
      };
      const meta = { key: s.key, fontStyle: s.fontStyle, letterSpacingEm: round(letterEm), textCase: s.textCase || 'ORIGINAL' };
      if (bv.lineHeight) meta.lineHeight = refById(bv.lineHeight.id);
      else if (lineHeightPx) meta.lineHeightPx = round(lineHeightPx, 2);
      const token = { $type: 'typography', $value: value };
      if (s.description) token.$description = s.description;
      if (isLegacy(s.name)) token.$deprecated = s.description || true;
      token.$extensions = { 'com.figma': includeFigmaMeta ? meta : { letterSpacingEm: meta.letterSpacingEm, textCase: meta.textCase, lineHeight: meta.lineHeight } };
      setDeep(files['text-styles'], ['text', ...tokenPath(s.name)], token, conflicts);
    }
  }

  // Effektstile → shadow-Tokens (Background-Blur als dimension)
  if (model.effectStyles?.length) {
    files['effect-styles'] = {};
    for (const s of model.effectStyles) {
      const shadows = s.effects.filter((e) => e.visible !== false && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW'));
      const meta = includeFigmaMeta ? { key: s.key } : {};
      const path = tokenPath(s.name);
      if (!shadows.length) {
        const blur = s.effects.find((e) => e.type === 'BACKGROUND_BLUR' || e.type === 'LAYER_BLUR');
        if (blur) setDeep(files['effect-styles'], ['blur', ...path.filter((p, i) => !(i === 0 && p === 'blur'))], { $type: 'dimension', $value: px(blur.radius), $description: s.description || 'Blur-Radius', $extensions: { 'com.figma': { ...meta, effect: blur.type } } }, conflicts);
        continue;
      }
      const layers = shadows.map((e) => {
        const bv = e.boundVariables || {};
        const layer = {
          color: refById(bv.color?.id) ?? colorValue(e.color),
          offsetX: px(e.offset.x),
          offsetY: px(e.offset.y),
          blur: px(e.radius),
          spread: refById(bv.spread?.id) ?? px(e.spread || 0)
        };
        if (e.type === 'INNER_SHADOW') layer.inset = true;
        return layer;
      });
      const token = { $type: 'shadow', $value: layers.length === 1 ? layers[0] : layers };
      if (s.description) token.$description = s.description;
      if (isLegacy(s.name)) token.$deprecated = s.description || true;
      token.$extensions = { 'com.figma': meta };
      setDeep(files['effect-styles'], ['shadow', ...path.filter((p, i) => !(i === 0 && p === 'shadow'))], token, conflicts);
    }
  }

  return { files, conflicts };
}

/** Stabile, gut diffbare JSON-Ausgabe (2 Leerzeichen, Zeilenumbruch am Ende). */
export const stringify = (obj) => JSON.stringify(obj, null, 2) + '\n';
