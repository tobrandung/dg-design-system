/**
 * Vite-Plugin: hält dist/ synchron mit tokens/.
 *
 * - Beim Start und bei jeder Änderung an tokens/*.tokens.json wird neu gebaut.
 *   Vite lädt die geänderten CSS-Variablen per HMR nach, ohne Neuladen der Seite.
 * - POST /__dg-tokens nimmt Token-Dateien direkt vom Figma-Plugin „DG Tokens“ an
 *   (nur im Dev-Server, nur von localhost). So sieht man eine Figma-Änderung sofort im Browser.
 */
import path from 'node:path';
import { readFile, writeFile } from 'node:fs/promises';
import { buildTokens } from './build-tokens.mjs';

const FILE_RE = /^tokens\/[a-z0-9.-]+\.tokens\.json$/;
const MAX_BODY = 2 * 1024 * 1024;

export function designTokens() {
  let queue = Promise.resolve();
  const rebuild = (server, reason) => {
    queue = queue.then(async () => {
      try {
        const docs = await buildTokens({ quiet: true });
        server?.config.logger.info(`\x1b[36m[tokens]\x1b[0m ${reason} → ${docs.length} Tokens neu gebaut`, { timestamp: true });
      } catch (e) {
        server?.config.logger.error(`[tokens] Build fehlgeschlagen: ${e.message}`);
        server?.ws.send({ type: 'error', err: { message: `Token-Build: ${e.message}`, stack: '' } });
      }
    });
    return queue;
  };

  return {
    name: 'dg-design-tokens',
    async buildStart() {
      await buildTokens({ quiet: true });
    },
    configureServer(server) {
      const root = server.config.root;
      const tokensDir = path.join(root, 'tokens');
      const isToken = (file) => file.startsWith(tokensDir) && file.endsWith('.tokens.json');
      server.watcher.add(tokensDir);
      server.watcher.on('change', (file) => isToken(file) && rebuild(server, path.basename(file)));
      server.watcher.on('add', (file) => isToken(file) && rebuild(server, path.basename(file)));

      // Empfang vom Figma-Plugin
      server.middlewares.use('/__dg-tokens', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
        const remote = req.socket.remoteAddress || '';
        if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(remote)) { res.statusCode = 403; return res.end('Nur von localhost'); }
        if (req.method !== 'POST') { res.statusCode = 405; return res.end(); }
        let body = '';
        for await (const chunk of req) { body += chunk; if (body.length > MAX_BODY) { res.statusCode = 413; return res.end('Zu groß'); } }
        try {
          const { files } = JSON.parse(body);
          const entries = Object.entries(files || {});
          if (!entries.length || entries.some(([p, c]) => !FILE_RE.test(p) || typeof c !== 'string')) throw new Error('Erwartet { files: { "tokens/<name>.tokens.json": "<json>" } }');
          const changed = [];
          for (const [p, content] of entries) {
            JSON.parse(content); // nur gültiges JSON schreiben
            const target = path.join(root, p);
            if ((await readFile(target, 'utf8').catch(() => '')) !== content) { await writeFile(target, content); changed.push(path.basename(p)); }
          }
          if (changed.length) await rebuild(server, `Figma-Plugin: ${changed.join(', ')}`);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, changed }));
        } catch (e) {
          res.statusCode = 400;
          res.end(JSON.stringify({ ok: false, error: e.message }));
        }
      });
    }
  };
}
