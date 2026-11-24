/**
 * Baut figma-plugin/code.js: Konverter + Plugin-Code in eine Datei (Figma lädt nur ein Skript).
 * Aufruf: npm run plugin:build
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lib = await readFile(path.join(ROOT, 'scripts/lib/figma-to-dtcg.mjs'), 'utf8');
const main = await readFile(path.join(ROOT, 'figma-plugin/src/main.js'), 'utf8');
const code = `// Automatisch erzeugt mit npm run plugin:build – nicht von Hand ändern.\n(function () {\n${lib.replace(/^export /gm, '')}\n${main}\n})();\n`;
await writeFile(path.join(ROOT, 'figma-plugin/code.js'), code);
console.log('figma-plugin/code.js gebaut.');
