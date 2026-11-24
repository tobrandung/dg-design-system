# DG Design System – Tokens und Prototyp

Figma ist die Quelle der Wahrheit. Variablen, Text- und Effektstile werden als
[DTCG-Tokens (Format 2025.10)](https://www.designtokens.org/) in `tokens/` abgelegt,
mit [Style Dictionary 5](https://styledictionary.com/) zu CSS, JS und JSON gebaut und im
Prototyp (Vite) verwendet.

```
Figma: ändern → veröffentlichen → „Tokens senden“ (Plugin DG Tokens)
   │                                   │
   ▼                                   ▼
lokaler Dev-Server (sofort, HMR)     GitHub-Commit tokens/*.tokens.json
                                       │  GitHub Actions
                                       ▼
                                     Build (Style Dictionary + Vite) → GitHub Pages

tokens/*.tokens.json  →  dist/css/index.css   --dg-* Variablen, Dark-Theme, Textstil-Klassen
                         dist/tokens.mjs/.d.ts aufgelöste Werte für JS/TS
                         dist/tokens.json      Liste aller Tokens (Doku, Tests)
```

## Warum ein Plugin

Die Variables-REST-API von Figma gibt es nur für Full Seats in Enterprise-Organisationen
([Figma-Doku](https://developers.figma.com/docs/rest-api/variables)). Ohne Enterprise kann kein
Server die Variablen selbst abholen. Den Anstoß gibt deshalb das Plugin „DG Tokens“ in Figma,
und zwar mit einem Klick nach dem Publish. Alles danach läuft automatisch.

## Schnellstart

```bash
npm install
```

```bash
npm run dev
```

Der Dev-Server läuft auf http://localhost:4318. Jede Änderung an `tokens/*.tokens.json` wird
sofort neu gebaut und ohne Neuladen in die Seite übernommen. Das gilt auch, wenn die Änderung vom Plugin kommt.

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Prototyp mit Live-Tokens, nimmt Tokens vom Plugin an |
| `npm run tokens:build` | `tokens/` → `dist/` |
| `npm run build` | Tokens + Prototyp für die Veröffentlichung nach `site/` |
| `npm run plugin:build` | Figma-Plugin `figma-plugin/code.js` neu bauen |

## Seiten

| Seite | Inhalt |
| --- | --- |
| `index.html` | Übersicht |
| `verfuegbarkeit.html` | Verfügbarkeitscheck nach dem Ablauf auf deutsche-glasfaser.de: Band mit PLZ/Ort, Straße und Hausnummer, dann Dialog mit Wohnsituation und Ergebnis, darunter die Tarife |
| `kontakt.html` | Kontakt-Assistent nach dem Ablauf auf deutsche-glasfaser.de/service/kontakt: Ich bin … → Anliegen → Genaues Anliegen → Formular |
| `bausteine.html` | Alle Komponenten mit Zuständen |
| `tokens.html` | Alle Tokens aus Figma, aktualisiert sich live |

- **Gemeinsame Teile** (Kopf, Icons, Fußzeile, noindex) stehen in `src/partials/`. Eingebunden werden sie mit `<!-- @include name -->`, siehe `scripts/vite-plugin-html-partials.mjs`.
- **Neue Seite**: HTML-Datei anlegen und in `vite.config.mjs` unter `PAGES` eintragen.
- **1:1 übernommen** ist im Kontakt-Assistenten der Weg Privatkunde → Vertrag → Änderung persönlicher Daten → Kontaktdaten. Andere Wege enden in einem allgemeinen Formular. Es ist als „Felder angenommen“ markiert.
- **Beispieldaten**: Orte, Straßen, Ausbaustatus und Telefonnummern sind erfunden. Fotos sind Platzhalter.
- **Nicht auffindbar**: Jede Seite hat `noindex, nofollow`, dazu kommt `robots.txt`. Das Repository selbst ist öffentlich und damit über GitHub auffindbar.

## Figma-Plugin „DG Tokens“ einrichten (einmalig)

1. Figma Desktop öffnen, die Design-System-Datei öffnen.
2. Plugins → Development → Import plugin from manifest → `figma-plugin/manifest.json` wählen.
3. Plugins → Development → DG Tokens → **Einstellungen und Export**:
   - **Lokaler Dev-Server**: anhaken, Adresse `http://localhost:4318`.
   - **GitHub**: anhaken, Repository `owner/name`, Branch `main`.
     - Dazu einen fine-grained Token anlegen: GitHub → Settings → Developer settings → Fine-grained tokens.
     - Er braucht nur Zugriff auf dieses Repository mit „Contents: Read and write“.
   - **Speichern**. Die Einstellungen liegen lokal in Figma auf deinem Rechner.

Für andere Teammitglieder: Jede Person importiert das Plugin selbst und nutzt einen eigenen Token.
Später kann das Plugin privat in der Organisation veröffentlicht werden, dann entfällt der Import.

## Arbeitsablauf

1. In Figma Variablen oder Stile ändern und die Library **veröffentlichen**.
2. Rechts im Eigenschaften-Panel der Datei (ohne Auswahl) auf **„Tokens senden“** klicken. Alternativ: Plugins → DG Tokens → Tokens senden.
3. Das Plugin liest alle Variablen, Text- und Effektstile, wandelt sie in DTCG-Dateien um und sendet sie:
   - an den **Dev-Server**, falls `npm run dev` läuft. Die offene Seite zeigt die Änderung sofort.
   - an **GitHub** als Commit. Die Action `.github/workflows/tokens.yml` baut und veröffentlicht die Seite auf GitHub Pages, meist in ein bis zwei Minuten.
4. Unten in Figma erscheint, was gesendet wurde, z. B. „GitHub: Commit a1b2c3d auf main“.

Das Plugin liest den aktuellen Stand der Datei, auch unveröffentlichte Änderungen. Deshalb erst
veröffentlichen, dann senden.

## GitHub einrichten (einmalig)

1. Repository anlegen und diesen Ordner pushen.
2. Settings → Pages → Source: „GitHub Actions“.
3. Fertig. Jeder Push auf `main`, der Tokens oder Code ändert, baut und veröffentlicht die Seite.

## Token-Dateien

| Datei | Figma-Quelle | Inhalt |
| --- | --- | --- |
| `primitives.tokens.json` | Collection „Primitives“ | Farbreihen gray, brand, error, green, yellow, orange (je 12 Stufen), base |
| `color.light.tokens.json` / `color.dark.tokens.json` | Collection „Color“, Modes Light/Dark | Semantische Farben (Aliase auf Primitives) |
| `dimensions.tokens.json` | Collection „Dimensions“ | spacing, radius, border-width, focus-ring, icon-size |
| `typography.tokens.json` | Collection „Typography“ | font-family, font-weight, font-size, line-height |
| `text-styles.tokens.json` | Textstile | Composite-Tokens `typography` (Überschriften, Fließtext, Label, Preis) |
| `effect-styles.tokens.json` | Effektstile | Schatten, Fokusringe, Hintergrund-Blur |

Pro Mode entsteht eine Datei, wie beim nativen Variablen-Export von Figma. Weitere Angaben:
- Figma-Metadaten (Key, Scopes) stehen unter `$extensions["com.figma"]`.
- Beschreibungen stehen unter `$description`.
- Veraltete Tokens (`_legacy/…` in Figma) bekommen `$deprecated`.

Neue Collections oder Modes in Figma erzeugen automatisch neue Dateien. Damit sie gebaut werden,
in `scripts/build-tokens.mjs` unter `BASE` bzw. als Theme eintragen.

## Im Code verwenden

```css
@import "dg-design-system/css";

.karte {
  background: var(--dg-color-bg-default);
  border: var(--dg-border-width-sm) solid var(--dg-color-border-subtle);
  border-radius: var(--dg-radius-lg);
  padding: var(--dg-spacing-lg);
  box-shadow: var(--dg-shadow-md);
}
```

```html
<h2 class="dg-heading-h2">Überschrift</h2>
<p class="dg-body-regular-book">Fließtext</p>
```

- **Namen**: Figma-Pfad mit Bindestrichen und Präfix `dg`. Aus `color/text/default` wird `--dg-color-text-default`.
- **Dark Mode**: folgt `prefers-color-scheme`. `data-theme="light|dark"` auf `<html>` überschreibt das.
  - `data-theme` wirkt auch auf einzelnen Bereichen. Ein Bereich mit `data-theme="dark"` bleibt immer dunkel, alle Komponenten darin nutzen die Dark-Werte aus Figma.
  - Beispiel: das Band „Verfügbarkeit prüfen“ auf `verfuegbarkeit.html`.
- **Textstile**: `.dg-heading-h1` bis `.dg-heading-h6` nutzen mobil die Mobile-Werte und ab 48 rem die Desktop-Werte. Daneben gibt es `.dg-body-{tiny|small|regular|medium|large|xlarge}-{book|semibold}`, `.dg-label-button` und `.dg-display-price`.
- **Einheiten**: Schriftgrößen und Zeilenhöhen in rem, damit sie mit der Browser-Schriftgröße skalieren. Alles andere in px.
- **JS/TS**: `import { light, dark, cssVar } from 'dg-design-system/tokens'`.

## Regeln

- `dist/` und `site/` sind generiert. Nie von Hand ändern.
- Werte nur in Figma ändern, nicht in `tokens/`. Sonst überschreibt der nächste Sync die Änderung.
- Was nicht in Figma lebt, steht oben in `scripts/build-tokens.mjs`:
  - das Präfix
  - die Font-Fallbacks
  - der Desktop-Breakpoint
- Neue Figma-Schnitte in `FONT_WEIGHTS` (`scripts/lib/figma-to-dtcg.mjs`) ergänzen, danach `npm run plugin:build`.

## Offene Punkte

- **Söhne als Webfont**: Lizenz und Dateien fehlen noch. Bis dahin greifen Geist und Barlow Condensed als Ersatz, wenn Söhne nicht lokal installiert ist.
- **Button**: In Figma gibt es noch keine Button-Komponente. Der Button im Prototyp ist ein Vorschlag.
- **Rahmen von Eingabefeldern**: Sie nutzen `border/subtle` mit sehr wenig Kontrast. WCAG 1.4.11 verlangt für Bedienelemente 3:1. `border/strong` würde das erfüllen.
