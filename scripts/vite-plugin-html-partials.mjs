/**
 * Gemeinsame HTML-Teile für alle Seiten (Kopf, Icons, Fußzeile).
 *
 * In einer Seite:  <!-- @include head -->  →  src/partials/head.html
 * Die aktive Seite steht in <body data-page="kontakt">. Der passende Link im Kopf
 * (data-nav="kontakt") bekommt aria-current="page".
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DIR = resolve(import.meta.dirname, '../src/partials');

export function htmlPartials() {
  return {
    name: 'dg-html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const page = html.match(/<body[^>]*data-page="([^"]+)"/)?.[1];
        let out = html.replace(/<!--\s*@include\s+([\w-]+)\s*-->/g, (_, name) => readFileSync(resolve(DIR, `${name}.html`), 'utf8'));
        if (page) out = out.replace(`data-nav="${page}"`, `data-nav="${page}" aria-current="page"`);
        return out;
      }
    },
    configureServer(server) {
      server.watcher.add(DIR);
      server.watcher.on('change', (file) => { if (file.startsWith(DIR)) server.ws.send({ type: 'full-reload' }); });
    }
  };
}
