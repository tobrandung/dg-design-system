import '../styles/flows.css';
import { gsap, motion, $, $$, revealPage } from '../core.js';
import { select, bindChoices, optionHTML } from '../ui/forms.js';

select($('#f-demo'), ['Alles rund um Ihren Vertrag', 'Störung, technische Hilfe & Einrichtung', 'Alles zum Bau', 'Rufnummernmitnahme', 'Adresse nicht im Verfügbarkeitscheck', 'Hausanschluss und Termin', 'Umzug', 'Sonstiges'], { initial: 2 });

const items = [['privat', 'Privatkunde', 'user'], ['selbst', 'Selbstständig', 'storefront'], ['kommune', 'Eine Kommune', 'bank'], ['vermieter', 'Vermieter', 'key']];
$('#demo-options').innerHTML = items.map(([v, l, i], n) => optionHTML('demo-o', v, l, i, n === 0)).join('');
$('#demo-summary').innerHTML = [['Privatkunde', 'user'], ['Alles rund um Ihren Vertrag', 'file-text']].map(([l, i]) => `<li class="option option--static"><span class="option__icon" aria-hidden="true"><svg class="icon icon--sm"><use href="#i-${i}"/></svg></span><span class="option__label">${l}</span></li>`).join('');

bindChoices(document);
$$('[data-indeterminate]').forEach((i) => (i.indeterminate = true));

const all = $('#news-all'), subs = $$('input[name=news]');
const syncAll = () => { const n = subs.filter((s) => s.checked).length; all.checked = n === subs.length; all.indeterminate = n > 0 && n < subs.length; };
all.addEventListener('change', () => { subs.forEach((s) => { if (s.checked !== all.checked) { s.checked = all.checked; s.dispatchEvent(new Event('change')); } }); syncAll(); });
subs.forEach((s) => s.addEventListener('change', syncAll));
syncAll();

/* Stepper-Demo */
const steps = $$('#demo-stepper .stepper__step');
let cur = 1;
const setStep = (i) => {
  cur = Math.max(0, Math.min(steps.length, i));
  steps.forEach((s, n) => { s.classList.toggle('is-done', n < cur); s.classList.toggle('is-current', n === cur); s.toggleAttribute('aria-current', n === cur); });
  if (motion() && steps[cur]) gsap.fromTo($('.stepper__dot', steps[cur]), { scale: 0.6 }, { scale: 1, duration: 0.45, ease: 'back.out(2.4)', clearProps: 'transform' });
};
$('#step-prev').addEventListener('click', () => setStep(cur - 1));
$('#step-next').addEventListener('click', () => setStep(cur + 1));

/* Badges */
const colors = [['', 'Grau'], ['brand', 'Brand'], ['error', 'Error'], ['warning', 'Warning'], ['success', 'Success']];
$('#badge-grid').innerHTML = ['sm', 'md', 'lg'].map((size) => `<div class="row">${colors.map(([c, n]) => `<span class="badge ${c ? `badge--${c}` : ''} ${size !== 'md' ? `badge--${size}` : ''}"><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg>${n}</span>`).join('')}</div>`).join('');

revealPage();
