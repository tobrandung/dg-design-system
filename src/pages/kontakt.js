/* Kontakt-Assistent nach dem Ablauf auf deutsche-glasfaser.de/service/kontakt:
 * Ich bin … → Anliegen → Genaues Anliegen → Was ändern? → Formular.
 * 1:1 übernommen ist der Weg Privatkunde → Vertrag → Änderung persönlicher Daten → Kontaktdaten.
 * Andere Wege enden in einem allgemeinen Formular (Felder angenommen). */
import '../styles/flows.css';
import { gsap, motion, $, $$, esc, toast, revealPage, dur, ease, scaleEnter, distance } from '../core.js';
import { select, setError, clearError, setGroupError, bindChoices, optionHTML } from '../ui/forms.js';

/* ---------- Themenbaum ---------- */
const PERSONAS = [['privat', 'Privatkunde', 'user'], ['selbst', 'Selbstständig', 'storefront'], ['firma', 'Unternehmen / Öffentliche Einrichtung', 'buildings'], ['kommune', 'Eine Kommune', 'bank'], ['vermieter', 'Vermieter / Wohnungsbaugesellschaft', 'key'], ['sonst', 'Sonstiges', 'users']];
const TOPICS = [['vertrag', 'Alles rund um Ihren Vertrag', 'file-text'], ['stoerung', 'Störung, technische Hilfe & Einrichtung', 'wrench'], ['bau', 'Alles zum Bau', 'hard-hat'], ['rufnummer', 'Rufnummernmitnahme', 'phone'], ['adresse', 'Adresse nicht im Verfügbarkeitscheck', 'map-pin']];
const SUBS = [['daten', 'Änderung persönlicher Daten', 'pencil'], ['rechnung', 'Rechnungen / Mahnungen', 'receipt'], ['geraete', 'Geräte', 'router'], ['umzug', 'Umzug', 'truck'], ['anpassung', 'Anpassung Produkte & Services', 'sliders'], ['status', 'Status Ihres Vertrags', 'clock']];
const CHANGES = [['kontaktdaten', 'Kontaktdaten', 'id-card'], ['lieferadresse', 'Lieferadresse', 'house'], ['bankdaten', 'Bankdaten', 'credit-card']];
const TOTAL = 5; // Schritte auf dem längsten Weg inkl. Formular

/* Pfad: Liste gewählter Einträge [key, label, icon]; Schritt ergibt sich daraus */
let path = [];
const STEP = {
  persona: { kind: 'options', ask: 'Ich bin...', name: 'persona', items: PERSONAS, next: (v) => (v === 'privat' ? 'topic' : 'form:generic') },
  topic: { kind: 'select', ask: 'In welche Kategorie fällt Ihr Anliegen?', label: 'Anliegen', items: TOPICS, next: (v) => (v === 'vertrag' ? 'sub' : v === 'adresse' ? 'form:address' : 'form:generic') },
  sub: { kind: 'select', ask: 'Genauer fällt mein Anliegen in folgende Kategorie:', label: 'Genaues Anliegen', items: SUBS, next: (v) => (v === 'daten' ? 'change' : 'form:generic') },
  change: { kind: 'options', ask: 'Ich möchte folgendes ändern:', name: 'change', items: CHANGES, next: (v) => (v === 'kontaktdaten' ? 'form:contactdata' : 'form:generic') }
};
const stepOf = () => path.reduce((s, [k]) => STEP[s].next(k), 'persona');

/* ---------- Markup-Helfer ---------- */
const field = ({ id, label, req = false, type = 'text', ac = 'off', mode = '', max = 0, cls = 'c-3', area = false, hint = '' }) => `
  <div class="field ${cls}" id="f-${id}" data-req="${req}" data-type="${type}">
    <label class="field__label dg-body-small-book" for="${id}">${esc(label)}${req ? '*' : ''}</label>
    <div class="field__control${area ? ' field__control--area' : ''}">
      ${area ? `<textarea class="field__input" id="${id}" name="${id}" rows="4"${req ? ' aria-required="true"' : ''}></textarea>` : `<input class="field__input" id="${id}" name="${id}" type="${type}" autocomplete="${ac}"${mode ? ` inputmode="${mode}"` : ''}${max ? ` maxlength="${max}"` : ''}${req ? ' aria-required="true"' : ''}>`}
      <svg class="icon icon--sm field__error-icon" aria-hidden="true"><use href="#i-warning-circle"/></svg>
    </div>
    <p class="field__hint dg-body-small-book"${hint ? '' : ' hidden'}><span class="field__hint-text">${esc(hint)}</span></p>
  </div>`;
const radio = (name, value, label) => `<label class="choice choice--radio"><input type="radio" name="${name}" value="${value}"><span class="choice__box"><span class="choice__dot"></span></span><span class="choice__label">${esc(label)}</span></label>`;
const radioGroup = (id, legend, name, items) => `
  <fieldset class="group" id="g-${id}" data-req="true">
    <legend class="dg-body-small-book">${esc(legend)} *</legend>
    <div class="choices-inline">${items.map(([v, l]) => radio(name, v, l)).join('')}</div>
    <p class="group__error dg-body-small-book" hidden><svg class="icon icon--sm" aria-hidden="true"><use href="#i-warning-circle"/></svg>Bitte wählen Sie eine Option aus.</p>
  </fieldset>`;
const legal = `
  <div class="c-form__legal">
    <p class="dg-body-small-book">Wie Ihre persönlichen Daten verwendet werden und wie Sie Ihre Rechte ausüben können, finden Sie in unseren <a href="#" data-toast="Prototyp: Hier öffnen sich die Datenschutzhinweise.">Datenschutzhinweisen</a>.</p>
    <p class="dg-body-tiny-book subtle">Diese Seite ist durch einen Spamschutz gesichert. Im Prototyp ist er nicht aktiv.</p>
  </div>`;
const submitBtn = `<div class="c-form__actions"><button class="button button--primary" type="submit"><span>Abschicken</span><svg class="icon button__spinner" aria-hidden="true"><use href="#i-spinner"/></svg></button></div>`;
const assumed = `<span class="badge badge--sm badge--warning"><svg class="icon" aria-hidden="true"><use href="#i-info"/></svg>Felder angenommen, nicht von der Website übernommen</span>`;

const FORMS = {
  contactdata: () => `
    <p class="dg-body-small-book">* Pflichtfeld</p>
    <div class="c-grid">
      ${field({ id: 'firstname', label: 'Vorname', req: true, ac: 'given-name' })}
      ${field({ id: 'lastname', label: 'Nachname', req: true, ac: 'family-name' })}
      ${field({ id: 'street', label: 'Straße', ac: 'address-line1', cls: 'c-4' })}
      ${field({ id: 'houseNumber', label: 'Hausnummer', cls: 'c-2' })}
      ${field({ id: 'zipcode', label: 'PLZ', ac: 'postal-code', mode: 'numeric', max: 5, cls: 'c-2' })}
      ${field({ id: 'city', label: 'Ort', ac: 'address-level2', cls: 'c-4' })}
      ${field({ id: 'customerNumber', label: 'Kundennummer', req: true, cls: 'c-6' })}
    </div>
    ${radioGroup('changed', 'Welche Kontaktdaten möchten Sie ändern?', 'changedContactData', [['telephone', 'Telefonnummer'], ['email', 'E-Mail-Adresse'], ['name', 'Namen']])}
    <div class="c-cond" data-when="telephone" hidden><div class="c-grid">${field({ id: 'newTelephone', label: 'Neue Telefonnummer', req: true, type: 'tel', ac: 'tel', cls: 'c-6' })}</div></div>
    <div class="c-cond" data-when="email" hidden><div class="c-grid">${field({ id: 'newEmail', label: 'Neue E-Mail-Adresse', req: true, type: 'email', ac: 'email', cls: 'c-6' })}</div></div>
    <div class="c-cond" data-when="name" hidden>
      <fieldset class="group" id="g-reason" data-req="true">
        <legend class="sr-only">Grund der Namensänderung *</legend>
        <div class="choices-inline">${radio('reasonChangeOfName', 'typo', 'Tippfehler im Vertrag')}${radio('reasonChangeOfName', 'official', 'Offizielle Namensänderung')}</div>
        <p class="group__error dg-body-small-book" hidden><svg class="icon icon--sm" aria-hidden="true"><use href="#i-warning-circle"/></svg>Bitte wählen Sie eine Option aus.</p>
      </fieldset>
      <div class="field">
        <span class="field__label dg-body-small-book" id="upload-label">Bei offizieller Namensänderung: Bitte Urkunde Namensänderung hochladen (kein Personalausweis)</span>
        <div class="upload">
          <input type="file" id="upload" accept=".pdf,.jpg,.jpeg,.png" aria-labelledby="upload-label">
          <label class="button button--secondary" for="upload"><svg class="icon" aria-hidden="true"><use href="#i-upload"/></svg>Datei auswählen</label>
          <span class="upload__name dg-body-small-book" id="upload-name">Keine Datei ausgewählt</span>
        </div>
      </div>
    </div>
    ${legal}${submitBtn}`,
  address: () => `
    ${assumed}
    <p class="dg-body-small-book">* Pflichtfeld</p>
    <div class="c-grid">
      ${field({ id: 'firstname', label: 'Vorname', req: true, ac: 'given-name' })}
      ${field({ id: 'lastname', label: 'Nachname', req: true, ac: 'family-name' })}
      ${field({ id: 'street', label: 'Straße', req: true, ac: 'address-line1', cls: 'c-4' })}
      ${field({ id: 'houseNumber', label: 'Hausnummer', req: true, cls: 'c-2' })}
      ${field({ id: 'zipcode', label: 'PLZ', req: true, ac: 'postal-code', mode: 'numeric', max: 5, cls: 'c-2' })}
      ${field({ id: 'city', label: 'Ort', req: true, ac: 'address-level2', cls: 'c-4' })}
      ${field({ id: 'email', label: 'E-Mail-Adresse', req: true, type: 'email', ac: 'email' })}
      ${field({ id: 'phone', label: 'Telefonnummer', type: 'tel', ac: 'tel' })}
      ${field({ id: 'message', label: 'Ihre Nachricht', area: true, cls: 'c-6', hint: 'Zum Beispiel: Neubau, Hausnummer neu vergeben.' })}
    </div>
    ${legal}${submitBtn}`,
  generic: () => `
    ${assumed}
    <p class="dg-body-small-book">* Pflichtfeld</p>
    <div class="c-grid">
      ${field({ id: 'firstname', label: 'Vorname', req: true, ac: 'given-name' })}
      ${field({ id: 'lastname', label: 'Nachname', req: true, ac: 'family-name' })}
      ${field({ id: 'email', label: 'E-Mail-Adresse', req: true, type: 'email', ac: 'email' })}
      ${field({ id: 'customerNumber', label: 'Kundennummer' })}
      ${field({ id: 'message', label: 'Ihre Nachricht', req: true, area: true, cls: 'c-6' })}
    </div>
    ${legal}${submitBtn}`
};

/* ---------- Rendern ---------- */
const body = $('#wizard-body'), summary = $('#summary'), bar = $('.progress');

function setProgress(n) {
  const v = Math.round((n / TOTAL) * 100);
  bar.setAttribute('aria-valuenow', String(v));
  bar.style.setProperty('--value', `${v}%`);
}
function renderSummary() {
  summary.innerHTML = path.map(([, l, i]) => `<li class="option option--static"><span class="option__icon" aria-hidden="true"><svg class="icon icon--sm"><use href="#i-${i}"/></svg></span><span class="option__label">${esc(l)}</span></li>`).join('');
}

function stepHTML(key) {
  const s = STEP[key];
  const control = s.kind === 'options'
    ? `<fieldset class="group" id="g-step"><legend class="sr-only">${esc(s.ask)}</legend><div class="options">${s.items.map(([v, l, i]) => optionHTML(s.name, v, l, i)).join('')}</div></fieldset>`
    : `<div class="field" id="f-step">
         <span class="field__label dg-body-small-book" id="step-label">${esc(s.label)}</span>
         <button type="button" class="field__control field__control--select" id="step-select" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="step-label step-select" aria-controls="step-list">
           <span class="field__value is-placeholder" data-placeholder="Bitte auswählen">Bitte auswählen</span>
           <svg class="field__chevron icon" aria-hidden="true"><use href="#i-caret-down"/></svg>
         </button>
         <div class="menu" hidden><div class="menu__list" role="listbox" id="step-list" aria-labelledby="step-label" tabindex="-1"></div><div class="scrollbar" aria-hidden="true"><div class="scrollbar__thumb"></div></div></div>
       </div>`;
  return `
    <div class="wizard__step">
      <div class="wizard__ask"><p class="dg-body-small-book">Bitte wählen Sie aus:</p><p class="${s.kind === 'options' ? 'dg-body-regular-semibold' : 'dg-body-small-book'}">${esc(s.ask)}</p></div>
      ${control}
      <div class="wizard__nav">
        <button class="button button--primary" type="button" id="w-next" disabled>Nächster Schritt</button>
        ${path.length ? '<button class="link-button" type="button" id="w-back">Zurück</button>' : ''}
      </div>
    </div>`;
}

let pending = null; // aktuelle Auswahl im Schritt: [key, label, icon]

function render(focus = true) {
  const key = stepOf();
  renderSummary();
  pending = null;
  if (key.startsWith('form:')) {
    const kind = key.slice(5);
    setProgress(TOTAL);
    body.innerHTML = `
      <button class="link-button wizard__change" type="button" id="w-change">Auswahl ändern</button>
      <form class="c-form" id="c-form" novalidate data-kind="${kind}">${FORMS[kind]()}</form>`;
    bindForm($('#c-form'));
    $('#w-change').addEventListener('click', () => { path.pop(); go(-1); });
  } else {
    const s = STEP[key];
    setProgress(path.length + 1);
    body.innerHTML = stepHTML(key);
    const next = $('#w-next');
    if (s.kind === 'options') {
      bindChoices(body);
      body.addEventListener('change', onOption);
    } else {
      select($('#f-step'), s.items.map(([, l]) => l), { onChange: (i) => { pending = s.items[i]; next.disabled = false; } });
    }
    next.addEventListener('click', () => { if (pending) { path.push(pending); go(1); } });
    $('#w-back')?.addEventListener('click', () => { path.pop(); go(-1); });
  }
  if (focus) body.focus({ preventScroll: true });
}
function onOption(e) {
  const input = e.target.closest('.option > input');
  if (!input) return;
  const s = STEP[stepOf()];
  pending = s.items.find(([v]) => v === input.value);
  $('#w-next').disabled = false;
}

/* Schrittwechsel: Inhalt sofort tauschen, Animation ist nur Kosmetik.
 * So hängt nichts, wenn der Tab im Hintergrund liegt, und Doppelklicks treffen den neuen (deaktivierten) Button. */
function go(dir) {
  body.removeEventListener('change', onOption);
  render();
  if (!motion()) return;
  gsap.fromTo(body, { x: distance * 2 * dir, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: dur.slow, ease: ease.standard, clearProps: 'all' });
  if (dir > 0) gsap.from('#summary li:last-child', { scale: scaleEnter, autoAlpha: 0, duration: dur.base, ease: ease.spring, clearProps: 'all' });
  const top = $('#wizard').getBoundingClientRect().top;
  if (top < 0) $('#wizard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- Formular: Bedingungsfelder, Validierung, Senden ---------- */
const RULES = {
  zipcode: (v) => (!v || /^\d{5}$/.test(v) ? '' : 'Die Postleitzahl hat fünf Ziffern.'),
  email: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Bitte geben Sie eine vollständige E-Mail-Adresse ein, z. B. name@beispiel.de.'),
  tel: (v) => (!v || /^[+\d][\d\s/()-]{5,}$/.test(v) ? '' : 'Bitte geben Sie eine gültige Telefonnummer ein.')
};
const MSG = { firstname: 'Bitte geben Sie Ihren Vornamen ein.', lastname: 'Bitte geben Sie Ihren Nachnamen ein.', customerNumber: 'Bitte geben Sie Ihre Kundennummer ein.', street: 'Bitte geben Sie die Straße ein.', houseNumber: 'Hausnummer fehlt.', zipcode: 'Bitte geben Sie die Postleitzahl ein.', city: 'Bitte geben Sie den Ort ein.', email: 'Bitte geben Sie Ihre E-Mail-Adresse ein.', newEmail: 'Bitte geben Sie die neue E-Mail-Adresse ein.', newTelephone: 'Bitte geben Sie die neue Telefonnummer ein.', message: 'Bitte beschreiben Sie kurz Ihr Anliegen.' };

function bindForm(form) {
  bindChoices(form);
  form.addEventListener('input', (e) => { const f = e.target.closest('.field'); if (f) clearError(f); });
  form.addEventListener('change', (e) => {
    const g = e.target.closest('.group');
    if (g) setGroupError(g, false);
    if (e.target.name === 'changedContactData') {
      $$('.c-cond', form).forEach((c) => {
        const on = c.dataset.when === e.target.value;
        if (on === !c.hidden) return;
        c.hidden = !on;
        if (on && motion()) gsap.from(c, { y: -distance, autoAlpha: 0, duration: dur.base, ease: ease.enter, clearProps: 'all' });
      });
    }
    if (e.target.id === 'upload') $('#upload-name').textContent = e.target.files[0]?.name || 'Keine Datei ausgewählt';
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const bad = [];
    $$('.field[data-req]', form).forEach((f) => {
      if (f.closest('[hidden]')) return;
      const input = $('input, textarea', f), v = input.value.trim(), type = f.dataset.type;
      const rule = RULES[input.id] || RULES[type];
      const msg = (f.dataset.req === 'true' && !v) ? (MSG[input.id] || 'Bitte füllen Sie dieses Feld aus.') : rule?.(v) || '';
      if (msg) { setError(f, msg); bad.push(input); }
    });
    $$('.group[data-req]', form).forEach((g) => {
      if (g.closest('[hidden]') || $('input:checked', g)) return;
      setGroupError(g, true); bad.push($('input', g));
    });
    if (bad.length) {
      bad[0].focus({ preventScroll: true });
      bad[0].closest('.field, .group').scrollIntoView({ behavior: motion() ? 'smooth' : 'auto', block: 'center' });
      return;
    }
    const btn = $('button[type=submit]', form);
    btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
    setTimeout(() => done(), motion() ? 900 : 0);
  });
}

function done() {
  body.innerHTML = `
    <div class="done" role="status">
      <span class="done__icon" aria-hidden="true"><svg class="icon"><use href="#i-check"/></svg></span>
      <h3 class="dg-heading-h4">Vielen Dank, Ihre Anfrage ist eingegangen</h3>
      <p class="subtle">Wir melden uns so schnell wie möglich bei Ihnen. Im Prototyp wurden keine Daten gesendet.</p>
      <button class="button button--secondary" type="button" id="w-restart">Neues Anliegen</button>
    </div>`;
  if (motion()) {
    gsap.from('.done__icon', { scale: 0.5, autoAlpha: 0, duration: dur.slow, ease: ease.spring, clearProps: 'all' });
    gsap.from('.done > :not(.done__icon)', { y: distance, autoAlpha: 0, stagger: 0.05, duration: dur.slow, ease: ease.enter, delay: dur.fast, clearProps: 'all' });
  }
  $('#w-restart').addEventListener('click', () => { path = []; go(-1); });
}

/* Platzhalter-Links im Prototyp */
document.addEventListener('click', (e) => { const t = e.target.closest('[data-toast]'); if (t) { e.preventDefault(); toast(t.dataset.toast); } });

/* Einstieg aus dem Verfügbarkeitscheck: ?thema=adresse */
if (new URLSearchParams(location.search).get('thema') === 'adresse') path = [PERSONAS[0], TOPICS[4]];
render(false);
revealPage();
if (path.length) requestAnimationFrame(() => $('#wizard').scrollIntoView({ block: 'start' }));
