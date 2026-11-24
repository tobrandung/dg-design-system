/* Kontakt-Assistent nach dem Ablauf auf deutsche-glasfaser.de/service/kontakt:
 * Ich bin … → Anliegen → Genaues Anliegen → Was ändern? → Formular.
 * 1:1 übernommen ist der Weg Privatkunde → Vertrag → Änderung persönlicher Daten → Kontaktdaten.
 * Andere Wege enden in einem allgemeinen Formular (Felder angenommen). */
import '../styles/flows.css';
import { gsap, motion, $, $$, esc, toast, revealPage, dur, ease, scaleEnter, distance } from '../core.js';
import { select, setError, clearError, setGroupError, bindChoices, bindClear, optionHTML, chipHTML, actionHTML } from '../ui/forms.js';

/* ---------- Themenbaum ---------- */
const PERSONAS = [['privat', 'Privatkunde', 'dg:privatkunde'], ['selbst', 'Selbstständig', 'dg:selbststaendig'], ['firma', 'Unternehmen / Öffentliche Ein­richtung', 'dg:unternehmen-oeffentliche-einrichtung'], ['kommune', 'Eine Kommune', 'dg:eine-kommune'], ['vermieter', 'Vermieter / Wohnungs­bau­gesellschaft', 'dg:vermieter-wohnungsbaugesellschaft'], ['sonst', 'Sonstiges', 'dg:sonstiges']];
const TOPICS = [['vertrag', 'Alles rund um Ihren Vertrag', 'dg:alles-rund-um-ihren-vertrag'], ['stoerung', 'Störung, technische Hilfe & Einrichtung', 'dg:stoerung-technische-hilfe-einrichtung'], ['bau', 'Alles zum Bau', 'dg:alles-zum-bau'], ['rufnummer', 'Rufnummernmitnahme', 'dg:rufnummernmitnahme'], ['adresse', 'Adresse nicht im Verfügbarkeitscheck', 'map-pin']];
const SUBS = [['daten', 'Änderung persönlicher Daten', 'dg:aenderung-persoenlicher-daten'], ['rechnung', 'Rechnungen / Mahnungen', 'dg:rechnungen-mahnungen'], ['geraete', 'Geräte', 'dg:geraete'], ['umzug', 'Umzug', 'dg:umzug'], ['anpassung', 'Anpassung Produkte & Services', 'dg:anpassung-produkte-services'], ['status', 'Status Ihres Vertrags', 'dg:status-ihres-vertrags']];
const CHANGES = [['kontaktdaten', 'Kontaktdaten', 'dg:kontaktdaten'], ['lieferadresse', 'Lieferadresse', 'dg:lieferadresse'], ['bankdaten', 'Bankdaten', 'dg:bankdaten']];
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
const field = ({ id, label, req = false, type = 'text', ac = 'off', mode = '', max = 0, cls = 'c-3', area = false, hint = '', icon = '', info = '', placeholder = '' }) => `
  <div class="field ${cls}" id="f-${id}" data-req="${req}" data-type="${type}">
    <label class="field__label dg-body-small-book" for="${id}">${esc(label)}${req ? '*' : ''}</label>
    <div class="field__control${area ? ' field__control--area' : ''}">
      ${icon ? `<svg class="icon" aria-hidden="true"><use href="#i-${icon}"/></svg>` : ''}
      ${area ? `<textarea class="field__input" id="${id}" name="${id}" rows="4"${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}${req ? ' aria-required="true"' : ''}></textarea>` : `<input class="field__input" id="${id}" name="${id}" type="${type}" autocomplete="${ac}"${placeholder ? ` placeholder="${esc(placeholder)}"` : ''}${mode ? ` inputmode="${mode}"` : ''}${max ? ` maxlength="${max}"` : ''}${req ? ' aria-required="true"' : ''}>`}
      <svg class="icon icon--sm field__error-icon" aria-hidden="true"><use href="#i-warning-circle"/></svg>
      ${info ? actionHTML('info', info) : ''}
    </div>
    <p class="field__hint dg-body-small-book"${hint ? '' : ' hidden'}><span class="field__hint-text">${esc(hint)}</span></p>
  </div>`;
const groupError = (msg) => `<p class="group__error dg-body-small-book" hidden><svg class="icon icon--sm" aria-hidden="true"><use href="#i-warning-circle"/></svg>${esc(msg)}</p>`;
const radio = (name, value, label, hint = '', checked = false) => `<label class="choice choice--radio"><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}><span class="choice__box"><span class="choice__dot"></span></span><span class="choice__label">${esc(label)}</span>${hint ? `<span class="choice__hint dg-body-small-book">${esc(hint)}</span>` : ''}</label>`;
const check = (name, value, label, { hint = '', checked = false, id = '' } = {}) => `<label class="choice"><input type="checkbox" name="${name}" value="${value}"${id ? ` id="${id}"` : ''}${checked ? ' checked' : ''}><span class="choice__box"><svg viewBox="0 0 256 256"><path class="choice__tick" d="M48 136l52 52L208 80"/><path class="choice__dash" d="M64 128h128"/></svg></span><span class="choice__label">${esc(label)}</span>${hint ? `<span class="choice__hint dg-body-small-book">${esc(hint)}</span>` : ''}</label>`;
const radioGroup = (id, legend, name, items) => `
  <fieldset class="group" id="g-${id}" data-req="true">
    <legend class="dg-body-small-book">${esc(legend)} *</legend>
    <div class="choices-inline">${items.map(([v, l]) => radio(name, v, l)).join('')}</div>
    ${groupError('Bitte wählen Sie eine Option aus.')}
  </fieldset>`;
const selectField = (id, label, hint) => `
  <div class="field c-6" id="f-${id}">
    <span class="field__label dg-body-small-book" id="${id}-label">${esc(label)}</span>
    <button type="button" class="field__control field__control--select" id="${id}" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${id}-label ${id}" aria-controls="${id}-list">
      <span class="field__value is-placeholder" data-placeholder="Bitte auswählen">Bitte auswählen</span>
      <svg class="field__chevron icon" aria-hidden="true"><use href="#i-caret-down"/></svg>
    </button>
    <p class="field__hint dg-body-small-book"><span class="field__hint-text">${esc(hint)}</span></p>
    <div class="menu" hidden><div class="menu__list" role="listbox" id="${id}-list" aria-labelledby="${id}-label" tabindex="-1"></div><div class="scrollbar" aria-hidden="true"><div class="scrollbar__thumb"></div></div></div>
  </div>`;
const SELECTS = { reach: ['Vormittags (8–12 Uhr)', 'Mittags (12–16 Uhr)', 'Nachmittags (16–20 Uhr)', 'Egal, jederzeit'] };

/* Kontaktweg + Erreichbarkeit (Radio mit Hinweis, Select) */
const channel = `
  <div class="c-block">
    <fieldset class="group" id="g-channel">
      <legend class="dg-body-regular-semibold">Wie dürfen wir Sie kontaktieren?</legend>
      ${radio('channel', 'mail', 'Per E-Mail', 'Wir antworten in der Regel innerhalb von 24 Stunden.', true)}
      ${radio('channel', 'phone', 'Telefonisch', 'Montag bis Freitag von 8 bis 20 Uhr.')}
    </fieldset>
    <div class="c-cond c-grid" data-when-channel="phone" hidden>${selectField('reach', 'Wann erreichen wir Sie am besten?', 'Optional. Wir rufen Sie in diesem Zeitraum an.')}</div>
  </div>`;
/* Benachrichtigungen (Checkbox-Gruppe mit „Alle“, indeterminate) */
const news = `
  <fieldset class="group c-block">
    <legend class="dg-body-regular-semibold">Benachrichtigungen per E-Mail</legend>
    ${check('news-all', 'all', 'Alle Benachrichtigungen', { id: 'news-all' })}
    <div class="group__nested">
      ${check('news', 'ausbau', 'Updates zum Glasfaserausbau in meinem Ort', { checked: true })}
      ${check('news', 'termine', 'Erinnerungen an Termine')}
      ${check('news', 'angebote', 'Angebote und Aktionen')}
    </div>
  </fieldset>`;
/* Datenschutz: Text + Pflicht-Checkbox */
const legal = `
  <div class="c-form__legal c-block">
    <p class="dg-body-small-book">Wie Ihre persönlichen Daten verwendet werden und wie Sie Ihre Rechte ausüben können, finden Sie in unseren <a href="#" data-toast="Prototyp: Hier öffnen sich die Datenschutzhinweise.">Datenschutzhinweisen</a>.</p>
    <fieldset class="group" id="g-consent" data-req="true">
      <legend class="sr-only">Datenschutz *</legend>
      ${check('consent', 'yes', 'Ich habe die Datenschutzhinweise gelesen und bin mit der Verarbeitung meiner Angaben einverstanden.*')}
      ${groupError('Bitte bestätigen Sie die Datenschutzhinweise, um fortzufahren.')}
    </fieldset>
    <p class="dg-body-tiny-book subtle">Diese Seite ist durch einen Spamschutz gesichert. Im Prototyp ist er nicht aktiv.</p>
  </div>`;
const submitBtn = `<div class="c-form__actions"><button class="button button--primary" type="submit"><span>Abschicken</span><svg class="icon button__spinner" aria-hidden="true"><use href="#i-spinner"/></svg></button></div>`;
const nameFields = `
      ${field({ id: 'firstname', label: 'Vorname', req: true, ac: 'given-name', icon: 'user', placeholder: 'Max' })}
      ${field({ id: 'lastname', label: 'Nachname', req: true, ac: 'family-name', placeholder: 'Mustermann' })}`;
const addressFields = (req) => `
      ${field({ id: 'street', label: 'Straße', req, ac: 'address-line1', cls: 'c-4', icon: 'map-pin', placeholder: 'Hauptstraße' })}
      ${field({ id: 'houseNumber', label: 'Hausnummer', req, cls: 'c-2', placeholder: '12a' })}
      ${field({ id: 'zipcode', label: 'PLZ', req, ac: 'postal-code', mode: 'numeric', max: 5, cls: 'c-2', placeholder: '48529' })}
      ${field({ id: 'city', label: 'Ort', req, ac: 'address-level2', cls: 'c-4', placeholder: 'Nordhorn' })}`;
const KUNDENNR_INFO = 'Ihre Kundennummer finden Sie oben rechts auf Ihrer Rechnung und im Kundenportal.';

const FORMS = {
  contactdata: () => `
    <p class="dg-body-small-book">* Pflichtfeld</p>
    <div class="c-grid">
      ${nameFields}
      ${addressFields(false)}
      ${field({ id: 'customerNumber', label: 'Kundennummer', req: true, cls: 'c-6', icon: 'file-text', info: KUNDENNR_INFO, placeholder: 'z. B. 1234567' })}
    </div>
    ${radioGroup('changed', 'Welche Kontaktdaten möchten Sie ändern?', 'changedContactData', [['telephone', 'Telefonnummer'], ['email', 'E-Mail-Adresse'], ['name', 'Namen']])}
    <div class="c-cond" data-when="telephone" hidden><div class="c-grid">${field({ id: 'newTelephone', label: 'Neue Telefonnummer', req: true, type: 'tel', ac: 'tel', cls: 'c-6', icon: 'phone', placeholder: '0171 1234567' })}</div></div>
    <div class="c-cond" data-when="email" hidden><div class="c-grid">${field({ id: 'newEmail', label: 'Neue E-Mail-Adresse', req: true, type: 'email', ac: 'email', cls: 'c-6', icon: 'envelope', placeholder: 'name@beispiel.de' })}</div></div>
    <div class="c-cond" data-when="name" hidden>
      <fieldset class="group" id="g-reason" data-req="true">
        <legend class="sr-only">Grund der Namensänderung *</legend>
        <div class="choices-inline">${radio('reasonChangeOfName', 'typo', 'Tippfehler im Vertrag')}${radio('reasonChangeOfName', 'official', 'Offizielle Namensänderung')}</div>
        ${groupError('Bitte wählen Sie eine Option aus.')}
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
    <p class="dg-body-small-book">* Pflichtfeld</p>
    <fieldset class="group" id="g-building" data-req="true">
      <legend class="dg-body-regular-semibold">Um welche Gebäudeart handelt es sich?*</legend>
      <div class="select-cards">${optionHTML('building', 'neubau', 'Neubau', 'dg:neubau', false, { hint: 'Das Haus ist geplant oder im Bau.' })}${optionHTML('building', 'bestand', 'Bestehende Immobilie', 'dg:bestehende-immobilie', false, { hint: 'Das Haus ist bereits bewohnt.' })}</div>
      ${groupError('Bitte wählen Sie eine Gebäudeart aus.')}
    </fieldset>
    <div class="c-grid">
      ${addressFields(true)}
      ${nameFields}
      ${field({ id: 'email', label: 'E-Mail-Adresse', req: true, type: 'email', ac: 'email', icon: 'envelope', placeholder: 'name@beispiel.de', info: 'An diese Adresse senden wir das Ergebnis der Prüfung.' })}
      ${field({ id: 'phone', label: 'Telefonnummer', type: 'tel', ac: 'tel', icon: 'phone', placeholder: '0171 1234567' })}
      ${field({ id: 'message', label: 'Ihre Nachricht', area: true, cls: 'c-6', hint: 'Zum Beispiel: Neubau, Hausnummer neu vergeben.', placeholder: 'Was sollen wir zu Ihrer Adresse wissen?' })}
    </div>
    ${channel}${legal}${submitBtn}`,
  generic: () => `
    <p class="dg-body-small-book">* Pflichtfeld</p>
    <div class="c-grid">
      ${nameFields}
      ${field({ id: 'email', label: 'E-Mail-Adresse', req: true, type: 'email', ac: 'email', icon: 'envelope', placeholder: 'name@beispiel.de' })}
      ${field({ id: 'phone', label: 'Telefonnummer', type: 'tel', ac: 'tel', icon: 'phone', placeholder: '0171 1234567' })}
      ${field({ id: 'customerNumber', label: 'Kundennummer', cls: 'c-6', icon: 'file-text', info: KUNDENNR_INFO, placeholder: 'Falls vorhanden' })}
      ${field({ id: 'message', label: 'Ihre Nachricht', req: true, area: true, cls: 'c-6', placeholder: 'Beschreiben Sie kurz Ihr Anliegen.' })}
    </div>
    ${channel}${news}${legal}${submitBtn}`
};

/* ---------- Rendern ---------- */
const body = $('#wizard-body'), summary = $('#summary'), bar = $('.progress');

function setProgress(n) {
  const v = Math.round((n / TOTAL) * 100);
  bar.setAttribute('aria-valuenow', String(v));
  bar.style.setProperty('--value', `${v}%`);
}
function renderSummary() {
  summary.innerHTML = path.map(([, l, i]) => chipHTML(l, i)).join('');
}

function stepHTML(key) {
  const s = STEP[key];
  const control = s.kind === 'options'
    ? `<fieldset class="group" id="g-step"><legend class="sr-only">${esc(s.ask)}</legend><div class="select-cards">${s.items.map(([v, l, i]) => optionHTML(s.name, v, l, i)).join('')}</div></fieldset>`
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
  const input = e.target.closest('.select-card > input');
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
  bindClear(form);
  const reach = $('#f-reach', form);
  if (reach) select(reach, SELECTS.reach);
  // „Alle Benachrichtigungen“ steuert die Gruppe (indeterminate bei Teilauswahl)
  const all = $('#news-all', form), subs = $$('input[name=news]', form);
  if (all) {
    const syncAll = () => { const n = subs.filter((s) => s.checked).length; all.checked = n === subs.length; all.indeterminate = n > 0 && n < subs.length; };
    all.addEventListener('change', () => { subs.forEach((s) => { if (s.checked !== all.checked) { s.checked = all.checked; s.dispatchEvent(new Event('change', { bubbles: true })); } }); syncAll(); });
    subs.forEach((s) => s.addEventListener('change', syncAll));
    syncAll();
  }
  form.addEventListener('input', (e) => { const f = e.target.closest('.field'); if (f) clearError(f); });
  form.addEventListener('change', (e) => {
    const g = e.target.closest('.group');
    if (g) setGroupError(g, false);
    if (e.target.name === 'channel') {
      const c = $('[data-when-channel]', form), on = e.target.value === c.dataset.whenChannel;
      if (on !== !c.hidden) { c.hidden = !on; if (on && motion()) gsap.from(c, { y: -distance, autoAlpha: 0, duration: dur.base, ease: ease.enter, clearProps: 'all' }); }
    }
    if (e.target.name === 'changedContactData') {
      $$('.c-cond[data-when]', form).forEach((c) => {
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
