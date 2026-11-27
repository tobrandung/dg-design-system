# DG Design System: Tokens und Prototyp

Die Farben, Abstände, Schriften und Animationen der Deutsche-Glasfaser-Seite kommen aus Figma-Variablen.
Dieses Repository macht daraus CSS-Variablen und zeigt sie in einem Prototyp: https://tobrandung.github.io/dg-design-system/

Werte werden nur in Figma geändert. Jede Änderung kommt als Pull Request ins Repository, das Frontend prüft sie, und erst nach dem Merge geht sie live.

## Ablauf

```
Design                         Pull Request                          nach dem Merge
──────                         ────────────                          ──────────────
Figma ändern, veröffentlichen  Plugin öffnet PR auf figma/tokens     GitHub Pages wird neu gebaut
„Tokens senden“ klicken   →    Prüfung schreibt Bericht in den PR →  Frontend übernimmt die Version
                               Frontend und Design geben frei
```

1. **Design** ändert Variablen in Figma, veröffentlicht die Library und klickt im Plugin „DG Tokens“ auf „Tokens senden“. Optional steht im Plugin, was geändert wurde und warum.
2. **Das Plugin** schreibt `tokens/*.tokens.json` auf den Branch `figma/tokens` und öffnet einen Pull Request. Gibt es schon einen offenen, wird er aktualisiert.
3. **Die Prüfung** (`.github/workflows/tokens-pr.yml`) baut alles und kommentiert im PR:
   - welche Tokens neu, geändert oder entfernt sind, für Light und Dark getrennt
   - Breaking Changes, also entfernte, umbenannte oder im Typ geänderte Tokens
   - Kontraste nach WCAG 2.2 AA für Text und Bedienelemente. Fällt ein Paar neu unter den Grenzwert, schlägt die Prüfung fehl.
   - einen Vorschlag für die Version (major, minor, patch)

   Die gebaute Seite hängt als Artefakt „vorschau“ am Lauf.
4. **Frontend und Design** prüfen den Bericht und die Vorschau und mergen. Die Code Owner stehen in `.github/CODEOWNERS`.
5. **Nach dem Merge** baut `.github/workflows/tokens.yml` die Seite neu und veröffentlicht sie.

Das Plugin gibt es, weil die Variables-REST-API von Figma nur im Enterprise-Plan verfügbar ist ([Figma-Doku](https://developers.figma.com/docs/rest-api/variables)). Ein Plugin läuft in jedem Plan.

### Breaking Changes

Entfernte oder umbenannte Tokens brechen Code, der sie nutzt. Deshalb in Figma erst nach `_legacy/…` verschieben. Im Export steht dann `$deprecated`, der Token bleibt also erhalten. Gelöscht wird er frühestens mit der nächsten Major-Version, wenn kein Code ihn mehr nutzt.

## Einrichten

### Plugin in Figma (einmal pro Person)

1. Figma Desktop öffnen, die Datei „Deutsche Glasfaser Relaunch (Tokens)“ öffnen.
2. Plugins → Development → Import plugin from manifest → `figma-plugin/manifest.json`.
3. Plugins → Development → DG Tokens → **Einstellungen und Export**:
   - GitHub: Repository `owner/name`, Ziel-Branch `main`.
   - Token: GitHub → Settings → Developer settings → Fine-grained tokens. Er braucht nur dieses Repository, mit „Contents“ und „Pull requests“ auf Read and write.
   - Optional: lokaler Dev-Server `http://localhost:4318` für eine Vorschau ohne PR.

Die Einstellungen bleiben lokal in Figma. Jede Person nutzt einen eigenen Token.

### GitHub (einmal)

- Settings → Pages → Source: „GitHub Actions“.
- Settings → Branches → Regel für `main`: Pull Request vor dem Merge, eine Freigabe, „Require review from Code Owners“, der Status-Check der „Token-Prüfung“ muss grün sein.
- In `.github/CODEOWNERS` die GitHub-Namen von Frontend-Lead und Design-Lead eintragen.

### Lokal

```bash
npm install
```

```bash
npm run dev
```

Der Dev-Server läuft auf http://localhost:4318. Änderungen an `tokens/` erscheinen ohne Neuladen.

| Befehl | Zweck |
| --- | --- |
| `npm run dev` | Prototyp mit Live-Tokens, nimmt auch Tokens direkt vom Plugin an |
| `npm run build` | Tokens und Prototyp nach `site/` |
| `npm run tokens:build` | nur `tokens/` → `dist/` |
| `npm run plugin:build` | `figma-plugin/code.js` neu bauen |
| `node scripts/token-report.mjs --base origin/main` | Token-Bericht wie im PR |
| `node scripts/sync-from-snapshot.mjs snapshot.json` | Tokens aus einem Figma-Snapshot schreiben, ohne Plugin |

Der Snapshot hat das Format von [TokensBrücke](https://github.com/tokens-bruecke/figma-plugin). Ein KI-Agent kann ihn über den Figma-MCP erzeugen.

## Tokens im Code

```css
@import "dg-design-system/css";

.karte {
  background: var(--dg-color-bg-default);
  border: var(--dg-border-width-sm) solid var(--dg-color-border-subtle);
  border-radius: var(--dg-radius-lg);
  padding: var(--dg-spacing-lg);
}
```

- **Namen:** Figma-Pfad mit Bindestrichen und Präfix `dg`. Aus `color/text/default` wird `--dg-color-text-default`. Derselbe Name steht in Figma Dev Mode als Code Syntax. `tokens.html` zählt, ob alle übereinstimmen.
- **Dark Mode:** folgt `prefers-color-scheme`. `data-theme="light|dark"` überschreibt das, auch für einzelne Bereiche.
- **Textstile:** Klassen wie `.dg-heading-h2` oder `.dg-body-regular-book`. Überschriften wechseln ab 48 rem auf die Desktop-Werte.
- **Einheiten:** Schriftgrößen und Zeilenhöhen in rem, alles andere in px.
- **JS/TS:** `import { light, dark, cssVar } from 'dg-design-system/tokens'`.
- **Motion:** Dauer (`--dg-motion-duration-*`, in ms) und Easing (`--dg-motion-easing-*`, als `cubic-bezier`). Einblenden mit `enter`, Ausblenden mit `exit` und immer `fast`. Bei `prefers-reduced-motion` fallen alle Dauern auf 0. Für GSAP liefert `src/motion.js` dieselben Werte.

### Dateien in `tokens/`

| Datei | Quelle in Figma |
| --- | --- |
| `primitives` | Collection „Primitives“: Farbreihen mit 12 Stufen |
| `color.light`, `color.dark` | Collection „Color“, Modes Light und Dark |
| `dimensions` | Collection „Dimensions“: Abstände, Radien, Rahmen, Icon-Größen |
| `typography`, `text-styles` | Collection „Typography“ und die Textstile |
| `motion` | Collection „Motion“ |
| `effect-styles` | Effektstile: Schatten, Fokusringe, Blur |

Format: [DTCG 2025.10](https://www.designtokens.org/tr/2025.10/). Figma-Key, Scopes und Code Syntax stehen unter `$extensions["com.figma"]`. Neue Collections erzeugen automatisch neue Dateien. Ein neuer Mode, etwa eine zweite Marke, muss in `scripts/build-tokens.mjs` eingetragen werden.

`dist/` und `site/` sind generiert. Was nicht aus Figma kommt (Präfix, Font-Fallbacks, Breakpoint), steht oben in `scripts/build-tokens.mjs`. Neue Schriftschnitte gehören in `FONT_WEIGHTS` in `scripts/lib/figma-to-dtcg.mjs`.

## Prototyp

`verfuegbarkeit.html` und `kontakt.html` bauen die Abläufe von deutsche-glasfaser.de nach, `bausteine.html` zeigt alle Komponenten mit Zuständen, `tokens.html` alle Tokens. Orte, Straßen und Telefonnummern sind Beispieldaten. Alle Seiten sind auf `noindex` gesetzt, das Repository selbst ist öffentlich.

## Warum ein eigenes Plugin

TokensBrücke 3.32.1 haben wir am 27.11.2026 mit der DG-Datei getestet. Der Export läuft, passt aber nicht zu den DG-Konventionen: Motion-Dauern kommen als px, Easing als Text, „Halbfett“ wird zu Schriftgewicht 400, und Light und Dark landen in einer Datei. Das eigene Plugin setzt diese Regeln um und nutzt denselben Konverter wie `sync-from-snapshot.mjs`.

## Offen

- **Söhne als Webfont:** Lizenz und Dateien fehlen. Bis dahin stehen Geist und Barlow Condensed als Ersatz.
- **Button:** In Figma gibt es noch keine Button-Komponente, der Button im Prototyp ist ein Vorschlag.
- **Kontraste:** Laut Token-Bericht liegen `border/focus` auf `bg/default` (Light, 2,96 : 1) und `text/error` auf `bg/default` (Dark, 4,16 : 1) unter WCAG AA.
- **Visueller Vergleich im PR:** Screenshots der Komponenten vor und nach der Änderung, z. B. mit Playwright oder Chromatic.
- **Versionierung:** Sobald das DG-Frontend die Tokens als Paket nutzt, mit Changesets Versionen und Changelog erzeugen. Den Vorschlag dafür liefert schon der Token-Bericht.
