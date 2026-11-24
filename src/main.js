import '../dist/css/index.css';
import './styles/page.css';
import './styles/components.css';
import './styles/docs.css';
import { gsap } from 'gsap';
import { mountTokenDocs } from './token-docs.js';

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const motion = () => !reduce.matches && !document.hidden;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
gsap.defaults({ ease: 'power3.out', duration: 0.3 });

/* ---------- Toast ---------- */
const toastEl = $('#toast');
let toastTimer;
function toast(msg) {
  $('#toast-text').textContent = msg;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  if (motion()) gsap.fromTo(toastEl, { y: 24, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.4, ease: 'back.out(1.6)' });
  toastTimer = setTimeout(() => {
    if (motion()) gsap.to(toastEl, { y: 16, autoAlpha: 0, duration: 0.25, onComplete: () => (toastEl.hidden = true) });
    else toastEl.hidden = true;
  }, 3200);
}

/* ---------- Theme: Hell / Dunkel / System ---------- */
const root = document.documentElement;
const themeBtns = $$('[data-theme-set]');
const pill = $('.theme__pill');
const store = {
  get: () => { try { return localStorage.getItem('dg-theme'); } catch { return null; } },
  set: (v) => { try { localStorage.setItem('dg-theme', v); } catch { /* privat */ } }
};
const activeBtn = () => themeBtns.find((b) => b.getAttribute('aria-pressed') === 'true');
function placePill(btn, animate) {
  const r = btn.getBoundingClientRect(), p = btn.parentElement.getBoundingClientRect();
  const x = r.left - p.left;
  if (animate && motion()) gsap.to(pill, { x, width: r.width, duration: 0.35, ease: 'power3.inOut' });
  else gsap.set(pill, { x, width: r.width });
}
function applyTheme(mode, ev) {
  const set = () => {
    if (mode === 'system') root.removeAttribute('data-theme'); else root.setAttribute('data-theme', mode);
    themeBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === mode)));
  };
  placePill(themeBtns.find((b) => b.dataset.themeSet === mode), !!ev);
  store.set(mode);
  if (ev && document.startViewTransition && motion()) {
    const x = ev.clientX || innerWidth - 80, y = ev.clientY || 32;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(set).ready.then(() => root.animate(
      { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
      { duration: 520, easing: 'cubic-bezier(.22,.8,.3,1)', pseudoElement: '::view-transition-new(root)' }
    ));
  } else set();
}
themeBtns.forEach((b) => b.addEventListener('click', (e) => applyTheme(b.dataset.themeSet, e)));
applyTheme(store.get() || 'system');
addEventListener('resize', () => placePill(activeBtn(), false));
document.fonts?.ready.then(() => placePill(activeBtn(), false));

/* ---------- Flyout (Select menu) ---------- */
function syncScrollbar(menu) {
  const list = $('.menu__list', menu), bar = $('.scrollbar', menu), thumb = $('.scrollbar__thumb', menu);
  const ratio = list.clientHeight / list.scrollHeight;
  bar.hidden = ratio >= 1;
  if (ratio >= 1) return;
  const h = Math.max(32, list.clientHeight * ratio);
  thumb.style.height = `${h}px`;
  thumb.style.transform = `translateY(${(list.scrollTop / (list.scrollHeight - list.clientHeight)) * (list.clientHeight - h)}px)`;
}
$$('.menu').forEach((m) => $('.menu__list', m).addEventListener('scroll', () => syncScrollbar(m), { passive: true }));

function openMenu(field) {
  const menu = $('.menu', field);
  if (field.classList.contains('is-open')) { syncScrollbar(menu); return; }
  field.classList.add('is-open');
  menu.hidden = false;
  syncScrollbar(menu);
  if (motion()) {
    gsap.killTweensOf(menu);
    gsap.fromTo(menu, { autoAlpha: 0, y: -6, scaleY: 0.96 }, { autoAlpha: 1, y: 0, scaleY: 1, duration: 0.24 });
    gsap.fromTo($$('.menu__item', menu).slice(0, 8), { autoAlpha: 0, y: -4 }, { autoAlpha: 1, y: 0, duration: 0.22, stagger: 0.02, delay: 0.03 });
  }
}
function closeMenu(field) {
  const menu = $('.menu', field);
  if (menu.hidden) return;
  field.classList.remove('is-open');
  if (motion()) gsap.to(menu, { autoAlpha: 0, y: -4, scaleY: 0.98, duration: 0.14, ease: 'power2.in', onComplete: () => { menu.hidden = true; gsap.set(menu, { clearProps: 'all' }); } });
  else menu.hidden = true;
}
function setActive(field, idx) {
  const items = $$('.menu__item:not(.is-empty)', field);
  items.forEach((o, i) => o.classList.toggle('is-active', i === idx));
  const ctl = $('[aria-controls]', field);
  if (items[idx]) { ctl.setAttribute('aria-activedescendant', items[idx].id); items[idx].scrollIntoView({ block: 'nearest' }); }
  else ctl.removeAttribute('aria-activedescendant');
  return idx;
}
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const mark = (text, q) => {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  return i < 0 ? esc(text) : `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
};
const itemHTML = (id, label, sub, selected, q) =>
  `<div class="menu__item" role="option" id="${id}" aria-selected="${selected}"><span class="menu__item-text">${mark(label, q)}${sub ? `<span class="menu__item-sub dg-body-small-book">${esc(sub)}</span>` : ''}</span><svg class="icon menu__check" aria-hidden="true"><use href="#i-check"/></svg></div>`;

/* ---------- Fehlerzustände ---------- */
function setError(field, msg) {
  const hint = $('.field__hint', field);
  field.classList.add('is-error');
  if (hint) { hint.dataset.base ??= hint.hidden ? '' : hint.textContent; $('.field__hint-text', hint).textContent = msg; hint.hidden = false; }
  $('input, button.field__control', field)?.setAttribute('aria-invalid', 'true');
  if (motion()) gsap.fromTo($('.field__control', field), { x: 0 }, { keyframes: { x: [0, -6, 5, -3, 2, 0] }, duration: 0.36, ease: 'none' });
}
function clearError(field) {
  if (!field.classList.contains('is-error')) return;
  field.classList.remove('is-error');
  const hint = $('.field__hint', field);
  if (hint) { if (hint.dataset.base) $('.field__hint-text', hint).textContent = hint.dataset.base; else hint.hidden = true; }
  $('input, button.field__control', field)?.removeAttribute('aria-invalid');
}

/* ---------- Combobox: PLZ / Ort, Straße (Beispieldaten) ---------- */
const PLACES = [['48529', 'Nordhorn'], ['48455', 'Bad Bentheim'], ['48527', 'Nordhorn-Klausheide'], ['46325', 'Borken'], ['46399', 'Bocholt'], ['52525', 'Heinsberg'], ['41751', 'Viersen'], ['53879', 'Euskirchen'], ['26789', 'Leer'], ['49716', 'Meppen'], ['47533', 'Kleve'], ['46414', 'Rhede']];
const STREETS = ['Am Markt', 'Am Sportpark', 'Bahnhofstraße', 'Birkenallee', 'Gartenstraße', 'Hauptstraße', 'Kirchstraße', 'Lindenweg', 'Mühlenweg', 'Schulstraße', 'Wiesengrund'];
const state = { place: null, street: null };

function combobox(field, source, onPick) {
  const input = $('input', field), list = $('.menu__list', field);
  let items = [], active = -1;
  const close = () => { closeMenu(field); input.setAttribute('aria-expanded', 'false'); active = -1; };
  const render = () => {
    const q = input.value.trim();
    items = source(q);
    list.innerHTML = items.length ? items.map((it, i) => itemHTML(`${input.id}-o${i}`, it.label, it.sub, false, q)).join('') : '<div class="menu__item is-empty">Keine Treffer. Prüfen Sie die Schreibweise.</div>';
    active = setActive(field, items.length ? 0 : -1);
    openMenu(field);
    input.setAttribute('aria-expanded', 'true');
  };
  const pick = (i) => { const it = items[i]; if (!it) return; input.value = it.value; onPick(it); close(); };
  input.addEventListener('input', () => { clearError(field); onPick(null); render(); });
  input.addEventListener('focus', () => { if (input.value.trim()) render(); });
  input.addEventListener('keydown', (e) => {
    const open = !$('.menu', field).hidden;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) render(); else active = setActive(field, Math.min(items.length - 1, active + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = setActive(field, Math.max(0, active - 1)); }
    else if (e.key === 'Enter' && open && active > -1) { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape') close();
  });
  list.addEventListener('mousedown', (e) => { const o = e.target.closest('.menu__item:not(.is-empty)'); if (!o) return; e.preventDefault(); pick($$('.menu__item', list).indexOf(o)); });
  input.addEventListener('blur', () => setTimeout(close, 80));
}

const fPlace = $('#f-place'), fStreet = $('#f-street'), fNo = $('#f-no'), streetInput = $('#street');
combobox(fPlace, (q) => {
  const s = q.toLowerCase();
  return PLACES.filter(([z, o]) => !s || z.startsWith(s) || o.toLowerCase().includes(s)).map(([z, o]) => ({ label: `${z} ${o}`, value: `${z} ${o}`, data: { zip: z, city: o } }));
}, (it) => {
  state.place = it ? it.data : null;
  streetInput.disabled = !it;
  fStreet.classList.toggle('is-disabled', !it);
  streetInput.placeholder = it ? 'z. B. Hauptstraße' : 'Erst Ort wählen';
  if (!it) { streetInput.value = ''; state.street = null; return; }
  clearError(fStreet);
  setTimeout(() => streetInput.focus(), 60);
});
combobox(fStreet, (q) => {
  const s = q.toLowerCase();
  return STREETS.filter((n) => !s || n.toLowerCase().includes(s)).map((n) => ({ label: n, value: n, sub: state.place ? `${state.place.zip} ${state.place.city}` : '' }));
}, (it) => { state.street = it ? it.value : null; if (it) setTimeout(() => $('#no').focus(), 60); });
$('#no').addEventListener('input', () => clearError(fNo));

/* ---------- Ergebnis mit Glasfaser-Licht ---------- */
const TARIFFS = [
  { id: 'giga1000', name: 'DG giga1000', speed: '1.000 Mbit/s', later: '89,99 €' },
  { id: 'premium500', name: 'DG premium500', speed: '500 Mbit/s', later: '69,99 €' },
  { id: 'classic300', name: 'DG classic300', speed: '300 Mbit/s', later: '49,99 €' },
  { id: 'basic100', name: 'DG basic100', speed: '100 Mbit/s', later: '39,99 €' }
];
const STATUS = {
  available: { badge: ['success', 'check-circle', 'Glasfaser verfügbar'], title: 'Ihre Adresse ist angeschlossen', text: 'Wählen Sie einen Tarif. Alle Tarife starten mit dem Willkommenspreis von 29,99 € mtl.', tariffs: true, cta: 'Tarif auswählen' },
  building: { badge: ['brand', 'clock', 'Im Bau'], title: 'Glasfaser wird gerade verlegt', text: 'Sie können jetzt schon einen Tarif buchen. Wir melden uns, sobald Ihr Hausanschluss fertig ist.', tariffs: true, cta: 'Tarif vormerken' },
  planned: { badge: ['warning', 'info', 'In Planung'], title: 'Ihr Ort ist im Ausbau geplant', text: 'Noch kein Tarif buchbar. Lassen Sie sich informieren, sobald die Vermarktung startet.', tariffs: false, cta: 'Benachrichtigen lassen' }
};
const statusFor = (addr) => { let h = 0; for (const c of addr) h = (h * 31 + c.charCodeAt(0)) >>> 0; return ['available', 'available', 'building', 'planned'][h % 4]; };
const form = $('#check-form'), result = $('#result'), card = $('#check');

function renderResult(status, addr) {
  const s = STATUS[status];
  $('#result-badge').innerHTML = `<span class="badge badge--${s.badge[0]}"><svg class="icon" aria-hidden="true"><use href="#i-${s.badge[1]}"/></svg>${s.badge[2]}</span>`;
  $('#result-title').textContent = s.title;
  $('#result-text').textContent = `${addr}. ${s.text}`;
  const fs = $('#tariffs');
  fs.hidden = !s.tariffs;
  fs.innerHTML = '<legend class="sr-only">Tarif auswählen</legend>' + TARIFFS.map((t, i) => `
    <label class="choice choice--radio tile tariff"><input type="radio" name="tariff" value="${t.id}" ${i === 1 ? 'checked' : ''}><span class="choice__box"><span class="choice__dot"></span></span>
      <span class="tariff__name"><span class="dg-body-regular-semibold">${t.name}</span><span class="dg-body-small-book subtle">${t.speed}</span></span>
      <span class="tariff__price"><span class="dg-body-medium-semibold">29,99 €</span><span class="dg-body-tiny-book subtle">ab 13. Monat ${t.later}</span></span></label>`).join('');
  $('#result-cta').textContent = s.cta;
  bindRadios(fs);
}

function showResult(status, addr) {
  renderResult(status, addr);
  const fiber = $('#fiber'), light = $('#fiber-light'), len = $('#fiber-path').getTotalLength();
  const lit = status !== 'planned', reach = lit ? len : len * 0.55;
  fiber.classList.remove('is-lit');
  const swap = () => { form.hidden = true; result.hidden = false; };
  if (!motion()) { swap(); fiber.classList.toggle('is-lit', lit); light.style.strokeDasharray = `${reach} ${len}`; return; }
  const h0 = card.offsetHeight;
  gsap.timeline()
    .to(form, { autoAlpha: 0, y: -8, duration: 0.2, ease: 'power2.in' })
    .add(() => { swap(); gsap.set(form, { clearProps: 'all' }); gsap.fromTo(card, { height: h0 }, { height: card.offsetHeight, duration: 0.45, ease: 'power3.inOut', clearProps: 'height' }); })
    .set(light, { strokeDasharray: `56 ${len + 56}`, strokeDashoffset: 56, autoAlpha: 1 })
    .from('.result__text, #tariffs, .result__actions', { autoAlpha: 0, y: 10, stagger: 0.06, duration: 0.35 }, '+=.05')
    .to(light, { strokeDashoffset: -reach, duration: lit ? 1.1 : 0.9, ease: 'power1.inOut' }, '<-.25')
    .add(() => fiber.classList.toggle('is-lit', lit))
    .set(light, { strokeDasharray: `${reach} ${len}`, strokeDashoffset: 0, autoAlpha: 0 })
    .to(light, { autoAlpha: lit ? 1 : 0.45, duration: 0.4 })
    .from('#result-badge .badge', { scale: 0.7, autoAlpha: 0, duration: 0.45, ease: 'back.out(2)' }, '<')
    .from('.tariff', { x: -8, autoAlpha: 0, stagger: 0.05, duration: 0.3 }, '<');
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  let first = null;
  if (!state.place) { setError(fPlace, $('#place').value.trim() ? 'Wählen Sie einen Ort aus der Liste.' : 'Bitte geben Sie PLZ oder Ort ein.'); first ??= $('#place'); }
  if (state.place && !state.street) { setError(fStreet, 'Wählen Sie eine Straße aus der Liste.'); first ??= streetInput; }
  if (!$('#no').value.trim()) { setError(fNo, 'Hausnummer fehlt.'); first ??= $('#no'); }
  if (first) { first.focus(); return; }
  const btn = $('#check-submit');
  btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
  const addr = `${state.street} ${$('#no').value.trim()}, ${state.place.zip} ${state.place.city}`;
  setTimeout(() => { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); showResult(statusFor(addr), addr); }, motion() ? 900 : 0);
});
$('#result-back').addEventListener('click', () => {
  const back = () => { result.hidden = true; form.hidden = false; $('#fiber-light').removeAttribute('style'); $('#no').focus(); };
  if (motion()) gsap.to(result, { autoAlpha: 0, y: 8, duration: 0.18, onComplete: () => { gsap.set(result, { clearProps: 'all' }); back(); gsap.from(form, { autoAlpha: 0, y: -8, duration: 0.3 }); } });
  else back();
});
$('#result-cta').addEventListener('click', () => toast('Prototyp: Hier ginge es weiter zur Tarifauswahl.'));

/* ---------- Select (Anliegen) ---------- */
const TOPICS = ['Alles rund um Ihren Vertrag', 'Störung, technische Hilfe & Einrichtung', 'Alles zum Bau', 'Rufnummernmitnahme', 'Adresse nicht im Verfügbarkeitscheck', 'Hausanschluss und Termin', 'Umzug', 'Sonstiges'];
function select(field, initial = -1) {
  const btn = $('button.field__control', field), list = $('.menu__list', field), val = $('.field__value', field);
  let selected = initial, active = -1;
  const isOpen = () => btn.getAttribute('aria-expanded') === 'true';
  const render = () => { list.innerHTML = TOPICS.map((t, i) => itemHTML(`${btn.id}-o${i}`, t, '', i === selected, '')).join(''); };
  const open = () => { render(); openMenu(field); btn.setAttribute('aria-expanded', 'true'); active = setActive(field, Math.max(0, selected)); list.focus({ preventScroll: true }); };
  const close = (focusBtn) => { if (!isOpen()) return; closeMenu(field); btn.setAttribute('aria-expanded', 'false'); if (focusBtn) btn.focus(); };
  const pick = (i) => {
    selected = i; val.textContent = TOPICS[i]; val.classList.remove('is-placeholder'); clearError(field); close(true);
    if (motion()) gsap.fromTo(val, { y: 6, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.25 });
  };
  btn.addEventListener('click', () => (isOpen() ? close(false) : open()));
  btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); } });
  list.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = setActive(field, Math.min(TOPICS.length - 1, active + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = setActive(field, Math.max(0, active - 1)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape' || e.key === 'Tab') close(e.key === 'Escape');
  });
  list.addEventListener('click', (e) => { const o = e.target.closest('.menu__item'); if (o) pick($$('.menu__item', list).indexOf(o)); });
  list.addEventListener('mousemove', (e) => { const o = e.target.closest('.menu__item'); if (o) active = setActive(field, $$('.menu__item', list).indexOf(o)); });
  document.addEventListener('pointerdown', (e) => { if (!field.contains(e.target)) close(false); });
  return { get value() { return selected; } };
}
const topic = select($('#f-topic'));
select($('#f-demo'), 2);

/* ---------- Checkbox / Radio ---------- */
function bindCheck(input) {
  input.addEventListener('change', () => {
    if (!motion()) return;
    const box = input.nextElementSibling, tick = $('.choice__tick', box);
    gsap.fromTo(box, { scale: 0.86 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
    if (input.checked && tick) gsap.fromTo(tick, { strokeDashoffset: 260 }, { strokeDashoffset: 0, duration: 0.28, ease: 'power2.out', clearProps: 'strokeDashoffset' });
  });
}
function bindRadios(scope) {
  $$('input[type=radio]', scope).forEach((input) => input.addEventListener('change', () => {
    if (motion()) gsap.fromTo($('.choice__dot', input.nextElementSibling), { scale: 0 }, { scale: 1, duration: 0.4, ease: 'back.out(2.6)', clearProps: 'transform' });
  }));
}
$$('input[type=checkbox]').forEach(bindCheck);
bindRadios(document);
$$('[data-indeterminate]').forEach((i) => (i.indeterminate = true));

const all = $('#news-all'), subs = $$('input[name=news]');
const syncAll = () => { const n = subs.filter((s) => s.checked).length; all.checked = n === subs.length; all.indeterminate = n > 0 && n < subs.length; };
all.addEventListener('change', () => { subs.forEach((s) => { if (s.checked !== all.checked) { s.checked = all.checked; s.dispatchEvent(new Event('change')); } }); syncAll(); });
subs.forEach((s) => s.addEventListener('change', syncAll));
syncAll();

/* ---------- Kontaktformular ---------- */
const cf = $('#contact-form');
$$('#contact-form .field input').forEach((i) => i.addEventListener('input', () => clearError(i.closest('.field'))));
$$('#contact-form .group').forEach((g) => g.addEventListener('change', () => { const err = $('.group__error', g); if (err) err.hidden = true; $$('.choice', g).forEach((c) => c.classList.remove('is-error')); }));
$('#consent').addEventListener('change', () => { $('#c-consent').classList.remove('is-error'); $('#consent-hint').hidden = true; });
const rules = [
  ['#f-c-street', (v) => (v ? '' : 'Bitte geben Sie die Straße ein.')],
  ['#f-c-no', (v) => (v ? '' : 'Hausnummer fehlt.')],
  ['#f-c-zip', (v) => (/^\d{5}$/.test(v) ? '' : 'Die Postleitzahl hat fünf Ziffern.')],
  ['#f-c-city', (v) => (v ? '' : 'Bitte geben Sie den Ort ein.')],
  ['#f-first', (v) => (v ? '' : 'Bitte geben Sie Ihren Vornamen ein.')],
  ['#f-last', (v) => (v ? '' : 'Bitte geben Sie Ihren Nachnamen ein.')],
  ['#f-mail', (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Bitte geben Sie eine vollständige E-Mail-Adresse ein, z. B. name@beispiel.de.')]
];
cf.addEventListener('submit', (e) => {
  e.preventDefault();
  const bad = [];
  for (const id of ['#g-building', '#g-type']) {
    const g = $(id);
    if ($('input:checked', g)) continue;
    $('.group__error', g).hidden = false;
    $$('.choice', g).forEach((c) => c.classList.add('is-error'));
    bad.push($('input', g));
  }
  for (const [id, test] of rules) { const f = $(id), msg = test($('input', f).value.trim()); if (msg) { setError(f, msg); bad.push($('input', f)); } }
  if (topic.value < 0) { setError($('#f-topic'), 'Bitte wählen Sie ein Anliegen aus.'); bad.push($('#topic')); }
  if (!$('#consent').checked) { $('#c-consent').classList.add('is-error'); $('#consent-hint').hidden = false; bad.push($('#consent')); }
  if (bad.length) { bad[0].focus({ preventScroll: true }); bad[0].closest('.field, .group, .choice').scrollIntoView({ behavior: motion() ? 'smooth' : 'auto', block: 'center' }); return; }
  const btn = $('#contact-submit');
  btn.classList.add('is-loading'); btn.setAttribute('aria-busy', 'true');
  setTimeout(() => { btn.classList.remove('is-loading'); btn.removeAttribute('aria-busy'); toast(`Anfrage gesendet. Wir melden uns per ${$('input[name=channel]:checked').value === 'mail' ? 'E-Mail' : 'Telefon'}.`); }, motion() ? 900 : 0);
});

/* ---------- Badges ---------- */
const colors = [['', 'Grau'], ['brand', 'Brand'], ['error', 'Error'], ['warning', 'Warning'], ['success', 'Success']];
$('#badge-grid').innerHTML = ['sm', 'md', 'lg'].map((size) => `<div class="row">${colors.map(([c, n]) => `<span class="badge ${c ? `badge--${c}` : ''} ${size !== 'md' ? `badge--${size}` : ''}"><svg class="icon" aria-hidden="true"><use href="#i-check-circle"/></svg>${n}</span>`).join('')}</div>`).join('');

/* ---------- Token-Referenz ---------- */
mountTokenDocs($('#tokens'), toast);

/* ---------- Seitenstart ---------- */
if (motion()) {
  gsap.from('.hero__copy > *', { y: 14, autoAlpha: 0, stagger: 0.07, duration: 0.6, clearProps: 'all' });
  gsap.from('#check', { y: 20, autoAlpha: 0, duration: 0.7, delay: 0.15, clearProps: 'all' });
}
