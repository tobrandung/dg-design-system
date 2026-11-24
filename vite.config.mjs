import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'node:path';
import { designTokens } from './scripts/vite-plugin-design-tokens.mjs';
import { htmlPartials } from './scripts/vite-plugin-html-partials.mjs';

/** Alle Seiten des Prototyps. Neue Seite: HTML-Datei anlegen und hier eintragen. */
const PAGES = ['index', 'verfuegbarkeit', 'kontakt', 'bausteine', 'tokens'];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'DG_');
  return {
    base: './',
    plugins: [designTokens(), htmlPartials()],
    // Feste Adresse, weil das Figma-Plugin an http://localhost:4318/__dg-tokens sendet
    server: { port: Number(env.DG_DEV_PORT || 4318), strictPort: true },
    build: {
      outDir: 'site',
      emptyOutDir: true,
      rolldownOptions: { input: Object.fromEntries(PAGES.map((p) => [p, resolve(import.meta.dirname, `${p}.html`)])) }
    }
  };
});
