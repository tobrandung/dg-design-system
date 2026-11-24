import { defineConfig, loadEnv } from 'vite';
import { designTokens } from './scripts/vite-plugin-design-tokens.mjs';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'DG_');
  return {
    base: './',
    plugins: [designTokens()],
    // Feste Adresse, weil das Figma-Plugin an http://localhost:4318/__dg-tokens sendet
    server: { port: Number(env.DG_DEV_PORT || 4318), strictPort: true },
    build: { outDir: 'site', emptyOutDir: true }
  };
});
