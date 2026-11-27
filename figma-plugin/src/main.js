/* DG Tokens – Figma-Plugin (Sandbox-Teil)
 *
 * Befehle:
 *  - "sync": ohne Fenster. Liest die Tokens, sendet sie an GitHub und/oder den lokalen Dev-Server,
 *            meldet das Ergebnis und schließt sich. Auch als Button im Eigenschaften-Panel der Datei.
 *  - "open": Fenster mit Einstellungen, Vorschau und Download.
 *
 * figmaToDtcg() und stringify() werden beim Build aus scripts/lib/figma-to-dtcg.mjs eingefügt.
 */
const SYNC = figma.command === 'sync';
figma.showUI(__html__, { width: 400, height: 600, themeColors: true, visible: !SYNC });
// Button „Tokens senden“ dauerhaft rechts im Eigenschaften-Panel der Datei anzeigen
figma.root.setRelaunchData({ sync: 'Variablen und Stile als Tokens an GitHub und den Dev-Server senden' });

async function readModel() {
  const cols = await figma.variables.getLocalVariableCollectionsAsync();
  const collections = cols.map((c) => ({ id: c.id, name: c.name, modes: c.modes.map((m) => ({ modeId: m.modeId, name: m.name })), defaultModeId: c.defaultModeId }));
  const variables = [];
  for (const c of cols) {
    for (const id of c.variableIds) {
      const v = await figma.variables.getVariableByIdAsync(id);
      if (!v) continue;
      variables.push({ id: v.id, key: v.key, name: v.name, collectionId: v.variableCollectionId, resolvedType: v.resolvedType, valuesByMode: v.valuesByMode, description: v.description, scopes: v.scopes, codeSyntax: v.codeSyntax, hiddenFromPublishing: v.hiddenFromPublishing });
    }
  }
  const textStyles = (await figma.getLocalTextStylesAsync()).map((s) => ({
    id: s.id, key: s.key, name: s.name, description: s.description,
    fontFamily: s.fontName.family, fontStyle: s.fontName.style, fontSize: s.fontSize,
    lineHeight: s.lineHeight, letterSpacing: s.letterSpacing, textCase: s.textCase,
    boundVariables: s.boundVariables || {}
  }));
  const effectStyles = (await figma.getLocalEffectStylesAsync()).map((s) => ({
    id: s.id, key: s.key, name: s.name, description: s.description,
    effects: s.effects.map((e) => Object.assign({}, e))
  }));
  return { file: { key: figma.fileKey || '', name: figma.root.name }, collections, variables, textStyles, effectStyles };
}

async function exportFiles() {
  const model = await readModel();
  const { files, conflicts } = figmaToDtcg(model);
  const out = {};
  for (const [name, content] of Object.entries(files)) out[`tokens/${name}.tokens.json`] = stringify(content);
  return { files: out, conflicts, counts: { variables: model.variables.length, textStyles: model.textStyles.length, effectStyles: model.effectStyles.length }, fileName: model.file.name };
}

const settings = async () => (await figma.clientStorage.getAsync('dg-tokens')) || {};

figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'ready') {
      const s = await settings();
      if (SYNC) {
        if (!s.github && !s.local) { figma.notify('DG Tokens: Bitte zuerst unter „Einstellungen und Export“ ein Ziel einrichten.'); figma.closePlugin(); return; }
        figma.notify('DG Tokens: Sende …', { timeout: 1500 });
        figma.ui.postMessage({ type: 'sync', settings: s, ...(await exportFiles()) });
      } else {
        figma.ui.postMessage({ type: 'settings', value: s });
      }
    } else if (msg.type === 'export') {
      figma.ui.postMessage({ type: 'files', ...(await exportFiles()) });
    } else if (msg.type === 'settings:set') {
      await figma.clientStorage.setAsync('dg-tokens', msg.value);
    } else if (msg.type === 'done') {
      figma.notify(msg.text, { error: !!msg.error, timeout: msg.error ? 8000 : 4000 });
      if (SYNC) figma.closePlugin();
    }
  } catch (e) {
    const text = 'DG Tokens: ' + String((e && e.message) || e);
    if (SYNC) { figma.notify(text, { error: true }); figma.closePlugin(); }
    else figma.ui.postMessage({ type: 'error', message: text });
  }
};
