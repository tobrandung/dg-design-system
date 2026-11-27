/**
 * Tokens ohne Plugin-Klick aktualisieren: aus einem Snapshot der Figma-Datei.
 *
 * Der Snapshot hat das Format von TokensBrücke (rohe Plugin-API-Objekte, siehe
 * https://github.com/tokens-bruecke/figma-plugin/blob/main/schemas/tokens-snapshot.schema.json).
 * Er kann z. B. von einem KI-Agenten über den Figma-MCP erzeugt werden. Umgewandelt wird mit
 * demselben Konverter wie im Plugin „DG Tokens“, das Ergebnis ist also identisch.
 *
 * Figma-Keys fehlen in manchen Snapshots. Sie werden dann aus den vorhandenen tokens/*.json übernommen.
 *
 * Aufruf: node scripts/sync-from-snapshot.mjs pfad/zum/snapshot.json
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { figmaToDtcg, stringify, tokenPath } from './lib/figma-to-dtcg.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = path.join(ROOT, 'tokens');
const snapPath = process.argv[2];
if (!snapPath) throw new Error('Pfad zum Snapshot fehlt: node scripts/sync-from-snapshot.mjs snapshot.json');
const snap = JSON.parse(await readFile(snapPath, 'utf8'));

// Vorhandene Figma-Keys nach Token-Pfad einsammeln
const keys = new Map();
const walk = (node, p) => {
  if (node && typeof node === 'object') {
    if ('$value' in node) {
      const k = node.$extensions?.['com.figma']?.key;
      if (k) keys.set(p.join('.'), k);
      return;
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith('$')) walk(v, [...p, k]);
  }
};
for (const f of await readdir(TOKENS)) if (f.endsWith('.tokens.json')) walk(JSON.parse(await readFile(path.join(TOKENS, f), 'utf8')), []);
const keyFor = (p, own) => own || keys.get(p.join('.'));

const model = {
  file: { key: '', name: 'snapshot' },
  collections: snap.variableCollections.filter((c) => !c.remote).map((c) => ({ id: c.id, name: c.name, modes: c.modes, defaultModeId: c.defaultModeId })),
  variables: snap.variables.filter((v) => !v.remote).map((v) => ({
    id: v.id, key: keyFor(tokenPath(v.name), v.key), name: v.name, collectionId: v.variableCollectionId,
    resolvedType: v.resolvedType, valuesByMode: v.valuesByMode, description: v.description || '',
    scopes: v.scopes || [], codeSyntax: v.codeSyntax || {}, hiddenFromPublishing: !!v.hiddenFromPublishing
  })),
  textStyles: (snap.textStyles || []).map((s) => ({
    id: s.id, key: keyFor(['text', ...tokenPath(s.name)], s.key), name: s.name, description: s.description || '',
    fontFamily: s.fontName.family, fontStyle: s.fontName.style, fontSize: s.fontSize,
    lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, textCase: s.textCase, boundVariables: s.boundVariables || {}
  })),
  effectStyles: (snap.effectStyles || []).map((s) => {
    const p = tokenPath(s.name);
    const isBlur = !s.effects.some((e) => e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW');
    const tp = isBlur ? ['blur', ...p.filter((x, i) => !(i === 0 && x === 'blur'))] : ['shadow', ...p.filter((x, i) => !(i === 0 && x === 'shadow'))];
    return { id: s.id, key: keyFor(tp, s.key), name: s.name, description: s.description || '', effects: s.effects };
  })
};

const { files, conflicts } = figmaToDtcg(model);
if (conflicts.length) console.warn('Namenskonflikte:', conflicts);
for (const [name, obj] of Object.entries(files)) await writeFile(path.join(TOKENS, `${name}.tokens.json`), stringify(obj));
console.log(`${Object.keys(files).length} Token-Dateien geschrieben: ${Object.keys(files).join(', ')}`);
