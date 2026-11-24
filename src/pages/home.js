import { $, revealPage } from '../core.js';
import tokens from '../../dist/tokens.json';

$('[data-count]').textContent = `Aktuell ${tokens.length} Tokens, davon ${tokens.filter((t) => t.dark !== undefined).length} mit Dark-Wert.`;
revealPage();
