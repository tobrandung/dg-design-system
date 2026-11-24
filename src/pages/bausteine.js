import '../styles/flows.css';
import { $, $$, revealPage } from '../core.js';
import { select, bindChoices, bindClear, optionHTML, chipHTML } from '../ui/forms.js';

select($('#f-demo'), ['Alles rund um Ihren Vertrag', 'Störung, technische Hilfe & Einrichtung', 'Alles zum Bau', 'Rufnummernmitnahme', 'Adresse nicht im Verfügbarkeitscheck', 'Hausanschluss und Termin', 'Umzug', 'Sonstiges'], { initial: 2 });

const items = [['privat', 'Privatkunde', 'dg:privatkunde'], ['selbst', 'Selbstständig', 'dg:selbststaendig'], ['kommune', 'Eine Kommune', 'dg:eine-kommune'], ['vermieter', 'Vermieter / Wohnungsbaugesellschaft', 'dg:vermieter-wohnungsbaugesellschaft']];
$('#demo-options').innerHTML = items.map(([v, l, i], n) => optionHTML('demo-o', v, l, i, n === 0)).join('');
$('#demo-checks').innerHTML = [
  optionHTML('demo-c', 'internet', 'Internetproblem', 'dg:internetproblem', true, { type: 'checkbox', hint: 'Seiten laden langsam oder gar nicht' }),
  optionHTML('demo-c', 'telefon', 'Telefonieproblem', 'dg:telefonieproblem', false, { type: 'checkbox', hint: 'Kein Freizeichen, Gespräche brechen ab' }),
  optionHTML('demo-c', 'tv', 'waipu.tv', 'dg:waipu-tv', false, { type: 'checkbox', hint: 'Zurzeit nicht verfügbar', disabled: true })
].join('');
$('#demo-summary').innerHTML = [['Privatkunde', 'dg:privatkunde'], ['Alles rund um Ihren Vertrag', 'dg:alles-rund-um-ihren-vertrag']].map(([l, i]) => chipHTML(l, i)).join('');

bindChoices(document);
bindClear(document);
$$('[data-indeterminate]').forEach((i) => (i.indeterminate = true));

const all = $('#news-all'), subs = $$('input[name=news]');
const syncAll = () => { const n = subs.filter((s) => s.checked).length; all.checked = n === subs.length; all.indeterminate = n > 0 && n < subs.length; };
all.addEventListener('change', () => { subs.forEach((s) => { if (s.checked !== all.checked) { s.checked = all.checked; s.dispatchEvent(new Event('change')); } }); syncAll(); });
subs.forEach((s) => s.addEventListener('change', syncAll));
syncAll();

/* Badges */
const colors = [['', 'Grau'], ['brand', 'Brand'], ['error', 'Error'], ['warning', 'Warning'], ['success', 'Success']];
$('#badge-grid').innerHTML = ['sm', 'md', 'lg'].map((size) => `<div class="row">${colors.map(([c, n]) => `<span class="badge ${c ? `badge--${c}` : ''} ${size !== 'md' ? `badge--${size}` : ''}"><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg>${n}</span>`).join('')}</div>`).join('');

revealPage();
