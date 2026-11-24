/* Verfügbarkeitscheck nach dem Ablauf auf deutsche-glasfaser.de:
 * Band mit PLZ/Ort → Straße → Hausnummer, dann Dialog mit Stepper (Adresse ✓ · Wohnsituation · Ergebnis). */
import '../styles/flows.css';
import { gsap, motion, $, $$, esc, toast, revealPage } from '../core.js';
import { combobox, bindChoices, optionHTML, clearError } from '../ui/forms.js';

/* ---------- Beispieldaten ---------- */
const PLACES = [['48529', 'Nordhorn'], ['48455', 'Bad Bentheim'], ['48527', 'Nordhorn-Klausheide'], ['46325', 'Borken'], ['46399', 'Bocholt'], ['52525', 'Heinsberg'], ['41751', 'Viersen'], ['53879', 'Euskirchen'], ['26789', 'Leer'], ['49716', 'Meppen'], ['47533', 'Kleve'], ['46414', 'Rhede']];
const STREETS = ['Am Markt', 'Am Sportpark', 'Bahnhofstraße', 'Birkenallee', 'Gartenstraße', 'Hauptstraße', 'Kirchstraße', 'Lindenweg', 'Mühlenweg', 'Schulstraße', 'Wiesengrund'];
const NUMBERS = Array.from({ length: 48 }, (_, i) => String(i + 1)).flatMap((n) => (['3', '12', '13', '27'].includes(n) ? [n, `${n}A`, `${n}B`] : [n]));

const TARIFFS = [
  { name: 'DG giga', speed: '1000', down: '1.000 Mbit/s', up: '500 Mbit/s', later: '89,99', tone: '', features: [[1, 'Telefonie-Flat ins dt. Festnetz'], [1, 'Telefonie-Flat ins dt. Mobilfunknetz'], [1, 'Tarifwechsel-Garantie']], terms: '12 oder 24 Monate' },
  { name: 'DG premium', speed: '500', down: '500 Mbit/s', up: '250 Mbit/s', later: '69,99', tone: 'green', features: [[1, 'Telefonie-Flat ins dt. Festnetz'], [1, 'Telefonie-Flat ins dt. Mobilfunknetz'], [1, 'Tarifwechsel-Garantie']], terms: '24 Monate' },
  { name: 'DG classic', speed: '300', down: '300 Mbit/s', up: '150 Mbit/s', later: '49,99', tone: 'yellow', features: [[1, 'Telefonie-Flat ins dt. Festnetz'], [0, 'Mobilfunknetz ab 19 Cent/Min.'], [1, 'Tarifwechsel-Garantie']], terms: '24 Monate' },
  { name: 'DG basic', speed: '100', down: '100 Mbit/s', up: '50 Mbit/s', later: '39,99', tone: 'neutral', features: [[0, 'Festnetz ab 2,9 Cent/Min.'], [0, 'Mobilfunknetz ab 19 Cent/Min.'], [0, 'Ohne Tarifwechsel-Garantie']], terms: '24 Monate' }
];
const BENEFITS = [
  ['Leistungssieger DG giga 1000 für 9,99 €', 'in den ersten 12 Monaten.'],
  ['Wunschtarif 12 Monate testen', 'und ohne Risiko in einen anderen Tarif wechseln.'],
  ['Mit passendem Entertainment:', 'waipu.tv Perfect Plus für 0 € in den ersten 3 Monaten.']
];
const STATUS = {
  active: { icon: 'thumbs-up', lead: 'Super! Glasfaser ist verfügbar.', bubble: ['clock', 'In wenigen Tagen am Netz', 'success'], phase: 'Netz aktiv', tip: 'Das Glasfasernetz in Ihrer Straße ist in Betrieb. Nach der Bestellung schalten wir Ihren Anschluss frei.', cta: 'Zu den Tarifen' },
  build: { icon: 'hard-hat', lead: 'Glasfaser wird an Ihrer Adresse gebaut.', bubble: ['hard-hat', 'Ihr Anschluss ist im Bau', 'brand'], phase: 'Bauphase', tip: 'Wir verlegen gerade die Glasfaser in Ihrem Ort. Sie können Ihren Tarif schon jetzt bestellen.', cta: 'Zu den Tarifen' },
  plan: { icon: 'clock', lead: 'Glasfaser ist an Ihrer Adresse in Planung.', bubble: ['info', 'Ausbau geplant', 'warning'], phase: 'Nachfragebündelung', tip: 'Wir bauen aus, sobald genug Haushalte in Ihrem Ort mitmachen. Mit einem Vertrag zählen Sie mit.', cta: 'Informiert bleiben' }
};
const statusFor = (addr) => { let h = 0; for (const c of addr) h = (h * 31 + c.charCodeAt(0)) >>> 0; return ['active', 'active', 'build', 'plan'][h % 4]; };

/* ---------- Tarifkarten ---------- */
$('#tariff-grid').innerHTML = TARIFFS.map((t) => `
  <article class="tariff-card${t.tone ? ` tariff-card--${t.tone}` : ''}" data-reveal-card>
    <header class="tariff-card__head"><h4 class="dg-heading-h5">${esc(t.name)} <span class="dg-body-xlarge-semibold">${esc(t.speed)}</span></h4></header>
    <div class="tariff-card__body">
      <div class="tariff-card__speed">
        <div><span class="dg-body-tiny-book subtle">Download bis zu</span><br><span class="dg-body-regular-semibold">${esc(t.down)}</span></div>
        <div><span class="dg-body-tiny-book subtle">Upload bis zu</span><br><span class="dg-body-regular-semibold">${esc(t.up)}</span></div>
      </div>
      <div class="stack dg-body-small-book">${t.features.map(([ok, f]) => `<span class="feature feature--${ok ? 'yes' : 'no'}"><svg class="icon icon--sm" aria-hidden="true"><use href="#i-${ok ? 'check-circle' : 'x'}"/></svg>${esc(f)}</span>`).join('')}</div>
      <div>
        <span class="dg-body-tiny-book subtle">Willkommenspreis</span>
        <div class="tariff-card__price"><span class="dg-heading-h2">29,99 €</span><span class="dg-body-small-book subtle">mtl.</span></div>
        <span class="dg-body-small-book subtle">Ab dem 13. Monat ${esc(t.later)} € mtl. · Laufzeit ${esc(t.terms)}</span>
      </div>
      <a class="button button--secondary" href="#check">Verfügbarkeit prüfen</a>
    </div>
  </article>`).join('');

/* ---------- Adresseingabe ---------- */
const form = $('#vc-form'), submit = $('#vc-submit');
const fPlace = $('#f-place'), fStreet = $('#f-street'), fNo = $('#f-no');
const inPlace = $('#place'), inStreet = $('#street'), inNo = $('#no');
const addr = { place: null, street: null, no: null };

const enable = (field, input, on) => {
  input.disabled = !on;
  field.classList.toggle('is-disabled', !on);
  if (!on) input.value = '';
};
const sync = () => { submit.disabled = !(addr.place && addr.street && addr.no); };

combobox(fPlace, (q) => {
  const s = q.toLowerCase();
  return PLACES.filter(([z, o]) => z.startsWith(s) || o.toLowerCase().includes(s)).map(([z, o]) => ({ label: `${z} ${o}`, value: `${z} ${o}`, data: { zip: z, city: o } }));
}, (it) => {
  addr.place = it?.data ?? null;
  enable(fStreet, inStreet, !!it); addr.street = null;
  enable(fNo, inNo, false); addr.no = null;
  if (it) setTimeout(() => inStreet.focus(), 60);
  sync();
}, { minChars: 1, short: 'Geben Sie mind. 1 Zeichen an' });

combobox(fStreet, (q) => {
  const s = q.toLowerCase();
  return STREETS.filter((n) => n.toLowerCase().includes(s)).map((n) => ({ label: n, value: n }));
}, (it) => {
  addr.street = it?.value ?? null;
  enable(fNo, inNo, !!it); addr.no = null;
  if (it) setTimeout(() => inNo.focus(), 60);
  sync();
}, { minChars: 1, short: 'Geben Sie mind. 1 Zeichen an' });

combobox(fNo, (q) => {
  const s = q.toUpperCase();
  return NUMBERS.filter((n) => n.startsWith(s)).slice(0, 30).map((n) => ({ label: n, value: n }));
}, (it) => {
  addr.no = it?.value ?? null;
  sync();
  if (it) setTimeout(() => submit.focus(), 60);
}, { minChars: 1, short: 'Geben Sie mind. 1 Zeichen an', empty: 'Hausnummer nicht gefunden.' });

const fullAddress = () => `${addr.street} ${addr.no}, ${addr.place.zip} ${addr.place.city}`;

/* ---------- Dialog ---------- */
const dlg = $('#vc');
const steps = $$('.stepper__step', dlg);
const panels = { living: $('[data-panel="living"]', dlg), result: $('[data-panel="result"]', dlg) };
const foots = { living: $('[data-foot="living"]', dlg), result: $('[data-foot="result"]', dlg) };
let current = 'living';

$('#o-role').innerHTML = [['owner', 'Eigentümer (Eigennutzung)', 'house'], ['tenant', 'Mieter', 'user'], ['landlord', 'Vermieter', 'key']].map(([v, l, i]) => optionHTML('role', v, l, i)).join('');
$('#o-home').innerHTML = [['single', 'Ein-/Zweifamilienhaus', 'house'], ['multi', 'Mehrfamilienhaus', 'building-apt']].map(([v, l, i]) => optionHTML('home', v, l, i)).join('');
bindChoices(dlg);
const living = () => ({ role: $('input[name=role]:checked', dlg)?.value, home: $('input[name=home]:checked', dlg)?.value });
dlg.addEventListener('change', () => { const l = living(); $('#living-next').disabled = !(l.role && l.home); });

function setStep(i) {
  steps.forEach((s, n) => {
    s.classList.toggle('is-done', n < i);
    s.classList.toggle('is-current', n === i);
    if (n === i) s.setAttribute('aria-current', 'step'); else s.removeAttribute('aria-current');
  });
  if (motion()) gsap.fromTo($('.stepper__dot', steps[i]), { scale: 0.6 }, { scale: 1, duration: 0.45, ease: 'back.out(2.4)', clearProps: 'transform' });
}

function show(name) {
  const from = panels[current], to = panels[name];
  const swap = () => {
    Object.entries(panels).forEach(([k, p]) => (p.hidden = k !== name));
    Object.entries(foots).forEach(([k, f]) => (f.hidden = k !== name));
    current = name;
    $('.modal__body', dlg).scrollTop = 0;
  };
  // Inhalt sofort tauschen; die Animation ist nur Kosmetik und darf nichts blockieren
  swap();
  if (!motion() || from === to) return;
  const dir = name === 'result' ? 1 : -1;
  gsap.timeline()
    .fromTo(to, { x: 24 * dir, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.35, clearProps: 'all' })
    .from($$('.pill, .bubble, .vc-result__phase, .panel, .checklist li, .vc-result__biz', to), { y: 10, autoAlpha: 0, stagger: 0.04, duration: 0.28, clearProps: 'all' }, '-=.25');
}

function open() {
  setStep(1);
  show('living');
  dlg.showModal();
  if (motion()) gsap.fromTo(dlg, { y: 24, scale: 0.98, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.4, clearProps: 'all' });
}
function close(after) {
  let closed = false;
  const done = () => { if (closed) return; closed = true; gsap.killTweensOf(dlg); gsap.set(dlg, { clearProps: 'all' }); dlg.close(); after?.(); };
  if (!motion()) { done(); return; }
  gsap.to(dlg, { y: 16, autoAlpha: 0, duration: 0.18, ease: 'power2.in', onComplete: done });
  setTimeout(done, 220); // falls rAF pausiert (Hintergrund-Tab)
}
dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
$('[data-close]', dlg).addEventListener('click', () => close());
dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (submit.disabled) return;
  submit.classList.add('is-loading'); submit.setAttribute('aria-busy', 'true');
  setTimeout(() => { submit.classList.remove('is-loading'); submit.removeAttribute('aria-busy'); open(); }, motion() ? 500 : 0);
});

function renderResult() {
  const a = fullAddress(), s = STATUS[statusFor(a)];
  $('#r-icon use').setAttribute('href', `#i-${s.icon}`);
  $('#r-lead').textContent = s.lead;
  $('#r-addr').textContent = a;
  const b = $('#r-bubble');
  b.style.setProperty('--bubble-bg', `var(--dg-color-bg-${s.bubble[2]}-subtle)`);
  b.style.setProperty('--bubble-icon', `var(--dg-color-icon-${s.bubble[2]})`);
  $('use', b).setAttribute('href', `#i-${s.bubble[0]}`);
  $('#r-bubble-text').textContent = s.bubble[1];
  $('#r-phase').textContent = s.phase;
  $('#tip-phase-text').textContent = s.tip;
  $('#r-benefits').innerHTML = BENEFITS.map(([t, d]) => `<li><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg><span><strong>${esc(t)}</strong><br>${esc(d)}</span></li>`).join('');
  $('#result-cta').textContent = s.cta;
  $('#result-cta').dataset.status = statusFor(a);
}

$('#living-next').addEventListener('click', () => {
  const btn = $('#living-next');
  btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
  setTimeout(() => {
    btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy');
    renderResult(); setStep(2); show('result');
    $('#result-cta').focus({ preventScroll: true });
  }, motion() ? 600 : 0);
});
$('#living-back').addEventListener('click', () => close(() => inNo.focus()));
$('#r-edit').addEventListener('click', () => close(() => inPlace.focus()));
$('#result-reset').addEventListener('click', () => close(() => {
  inPlace.value = ''; addr.place = addr.street = addr.no = null;
  enable(fStreet, inStreet, false); enable(fNo, inNo, false);
  $$('input[type=radio]', dlg).forEach((r) => (r.checked = false));
  $('#living-next').disabled = true;
  [fPlace, fStreet, fNo].forEach(clearError);
  sync(); inPlace.focus();
}));
$('#result-more').addEventListener('click', () => toast('Prototyp: Hier ginge es zur Seite „Glasfaser-Ausbau“.'));
$('#result-cta').addEventListener('click', (e) => {
  if (e.currentTarget.dataset.status === 'plan') { close(() => toast('Prototyp: Hier ginge es zur Anmeldung für Ausbau-Updates.')); return; }
  close(() => $('#tarife').scrollIntoView({ behavior: motion() ? 'smooth' : 'auto' }));
});

revealPage();
if (motion()) gsap.from('[data-reveal-card]', { y: 20, autoAlpha: 0, stagger: 0.08, duration: 0.5, delay: 0.2, clearProps: 'all' });
