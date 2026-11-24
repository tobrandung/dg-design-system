/* Formular-Bausteine: Flyout (Select menu), Combobox, Select, Fehlerzustände, Checkbox/Radio, Optionskacheln. */
import { gsap, motion, $, $$, esc, dur, ease, scaleEnter, distance, exitMs } from '../core.js';
import { dgIconSvg } from './dg-icons.js';

/* ---------- Flyout + Scroll bar ---------- */
function syncScrollbar(menu) {
  const list = $('.menu__list', menu), bar = $('.scrollbar', menu), thumb = $('.scrollbar__thumb', menu);
  if (!bar) return;
  const ratio = list.clientHeight / list.scrollHeight;
  bar.hidden = ratio >= 1;
  if (ratio >= 1) return;
  // Spur = Scrollbar-Höhe minus Innenabstand oben (Figma: 240 − 4)
  const track = bar.clientHeight - parseFloat(getComputedStyle(bar).paddingTop);
  const h = Math.max(24, track * ratio);
  thumb.style.height = `${h}px`;
  thumb.style.transform = `translateY(${(list.scrollTop / (list.scrollHeight - list.clientHeight)) * (track - h)}px)`;
}
function bindMenu(field) {
  const menu = $('.menu', field);
  if (menu && !menu.dataset.bound) {
    menu.dataset.bound = '1';
    $('.menu__list', menu).addEventListener('scroll', () => syncScrollbar(menu), { passive: true });
  }
  return menu;
}
export function openMenu(field) {
  const menu = bindMenu(field);
  if (field.classList.contains('is-open')) { syncScrollbar(menu); return; }
  field.classList.add('is-open');
  menu.hidden = false;
  syncScrollbar(menu);
  // wie shadcn: fade-in + zoom-in-95 + slide-in-from-top-2, enter-Easing
  if (motion()) {
    gsap.killTweensOf(menu);
    gsap.fromTo(menu, { autoAlpha: 0, scale: scaleEnter, y: -distance }, { autoAlpha: 1, scale: 1, y: 0, duration: dur.base, ease: ease.enter, clearProps: 'transform,opacity,visibility' });
  }
}
export function closeMenu(field) {
  const menu = $('.menu', field);
  if (!menu || menu.hidden) return;
  field.classList.remove('is-open');
  const hide = () => { if (field.classList.contains('is-open')) return; gsap.killTweensOf(menu); menu.hidden = true; gsap.set(menu, { clearProps: 'all' }); };
  if (!motion()) { hide(); return; }
  // wie shadcn: fade-out + zoom-out-95, kürzer als das Einblenden
  gsap.to(menu, { autoAlpha: 0, scale: scaleEnter, duration: dur.fast, ease: ease.exit, onComplete: hide });
  setTimeout(hide, exitMs()); // falls rAF pausiert (Hintergrund-Tab)
}
function setActive(field, idx) {
  const items = $$('.menu__item:not(.is-empty)', field);
  items.forEach((o, i) => o.classList.toggle('is-active', i === idx));
  const ctl = $('[aria-controls]', field);
  if (items[idx]) { ctl.setAttribute('aria-activedescendant', items[idx].id); items[idx].scrollIntoView({ block: 'nearest' }); }
  else ctl.removeAttribute('aria-activedescendant');
  return idx;
}
const mark = (text, q) => {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  return i < 0 ? esc(text) : `${esc(text.slice(0, i))}<mark>${esc(text.slice(i, i + q.length))}</mark>${esc(text.slice(i + q.length))}`;
};
const itemHTML = (id, label, sub, selected, q) =>
  `<div class="menu__item" role="option" id="${id}" aria-selected="${selected}"><span class="menu__item-text">${mark(label, q)}${sub ? `<span class="menu__item-sub dg-body-small-book">${esc(sub)}</span>` : ''}</span><svg class="icon menu__check" aria-hidden="true"><use href="#i-check"/></svg></div>`;

/* ---------- Fehlerzustände ---------- */
export function setError(field, msg) {
  const hint = $('.field__hint', field);
  field.classList.add('is-error');
  const wasError = field.dataset.err === msg;
  if (hint) { hint.dataset.base ??= hint.hidden ? '' : hint.textContent; $('.field__hint-text', hint).textContent = msg; hint.hidden = false; }
  field.dataset.err = msg;
  $('input, textarea, button.field__control', field)?.setAttribute('aria-invalid', 'true');
  // Fehlermeldung gleitet ruhig ein (kein Schütteln); Rahmenfarbe wechselt per CSS-Transition
  if (hint && !wasError && motion()) gsap.fromTo(hint, { autoAlpha: 0, y: -distance / 2 }, { autoAlpha: 1, y: 0, duration: dur.base, ease: ease.enter, clearProps: 'all' });
}
export function clearError(field) {
  if (!field.classList.contains('is-error')) return;
  field.classList.remove('is-error');
  delete field.dataset.err;
  const hint = $('.field__hint', field);
  if (hint) { if (hint.dataset.base) $('.field__hint-text', hint).textContent = hint.dataset.base; else hint.hidden = true; }
  $('input, textarea, button.field__control', field)?.removeAttribute('aria-invalid');
}
/** Fehler einer Gruppe (Radio, Checkbox, Optionskacheln). */
export function setGroupError(group, on) {
  const err = $('.group__error', group);
  if (err) err.hidden = !on;
  group.classList.toggle('is-error', on);
  $$('.choice, .select-card', group).forEach((c) => c.classList.toggle('is-error', on));
}

/* ---------- Combobox: Eingabe mit Vorschlägen ---------- */
export function combobox(field, source, onPick, { empty = 'Keine Treffer. Prüfen Sie die Schreibweise.', minChars = 0, short = '' } = {}) {
  const input = $('input', field), list = $('.menu__list', field);
  let items = [], active = -1;
  const close = () => { closeMenu(field); input.setAttribute('aria-expanded', 'false'); active = -1; };
  const render = () => {
    const q = input.value.trim();
    items = q.length < minChars ? [] : source(q);
    list.innerHTML = items.length
      ? items.map((it, i) => itemHTML(`${input.id}-o${i}`, it.label, it.sub, false, q)).join('')
      : `<div class="menu__item is-empty">${esc(q.length < minChars ? short : empty)}</div>`;
    active = setActive(field, items.length ? 0 : -1);
    openMenu(field);
    input.setAttribute('aria-expanded', 'true');
  };
  const pick = (i) => { const it = items[i]; if (!it) return; input.value = it.value; onPick(it); close(); };
  input.addEventListener('input', () => { clearError(field); onPick(null); render(); });
  input.addEventListener('focus', () => { if (input.value.trim() || minChars) render(); });
  input.addEventListener('keydown', (e) => {
    const open = !$('.menu', field).hidden;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) render(); else active = setActive(field, Math.min(items.length - 1, active + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = setActive(field, Math.max(0, active - 1)); }
    else if (e.key === 'Enter' && open && active > -1) { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape') close();
  });
  list.addEventListener('mousedown', (e) => { const o = e.target.closest('.menu__item:not(.is-empty)'); if (!o) return; e.preventDefault(); pick($$('.menu__item', list).indexOf(o)); });
  input.addEventListener('blur', () => setTimeout(close, 80));
  return { close };
}

/* ---------- Select (Button + Listbox) ---------- */
export function select(field, options, { initial = -1, onChange } = {}) {
  const btn = $('button.field__control', field), list = $('.menu__list', field), val = $('.field__value', field);
  const placeholder = val.dataset.placeholder || val.textContent;
  let opts = options, selected = initial, active = -1;
  const isOpen = () => btn.getAttribute('aria-expanded') === 'true';
  const render = () => { list.innerHTML = opts.map((t, i) => itemHTML(`${btn.id}-o${i}`, t, '', i === selected, '')).join(''); };
  const show = () => { val.textContent = selected > -1 ? opts[selected] : placeholder; val.classList.toggle('is-placeholder', selected < 0); };
  const open = () => { render(); openMenu(field); btn.setAttribute('aria-expanded', 'true'); active = setActive(field, Math.max(0, selected)); list.focus({ preventScroll: true }); };
  const close = (focusBtn) => { if (!isOpen()) return; closeMenu(field); btn.setAttribute('aria-expanded', 'false'); if (focusBtn) btn.focus(); };
  const pick = (i) => {
    selected = i; show(); clearError(field); close(true);
    if (motion()) gsap.fromTo(val, { y: distance / 2, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: dur.base, ease: ease.enter, clearProps: 'all' });
    onChange?.(i, opts[i]);
  };
  btn.addEventListener('click', () => (isOpen() ? close(false) : open()));
  btn.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); } });
  list.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); active = setActive(field, Math.min(opts.length - 1, active + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); active = setActive(field, Math.max(0, active - 1)); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(active); }
    else if (e.key === 'Escape' || e.key === 'Tab') close(e.key === 'Escape');
  });
  list.addEventListener('click', (e) => { const o = e.target.closest('.menu__item'); if (o) pick($$('.menu__item', list).indexOf(o)); });
  list.addEventListener('mousemove', (e) => { const o = e.target.closest('.menu__item'); if (o) active = setActive(field, $$('.menu__item', list).indexOf(o)); });
  document.addEventListener('pointerdown', (e) => { if (!field.contains(e.target)) close(false); });
  show();
  return {
    get value() { return selected; },
    get label() { return selected > -1 ? opts[selected] : ''; },
    set(i) { selected = i; show(); },
    setOptions(list2) { opts = list2; selected = -1; show(); }
  };
}

/* ---------- Checkbox / Radio / Optionskachel ---------- */
export function bindChoices(scope = document) {
  $$('.choice > input[type=checkbox]', scope).forEach((input) => input.addEventListener('change', () => {
    if (!motion()) return;
    const box = input.nextElementSibling, tick = $('.choice__tick', box);
    gsap.fromTo(box, { scale: 0.9 }, { scale: 1, duration: dur.base, ease: ease.spring, clearProps: 'transform' });
    if (input.checked && tick) gsap.fromTo(tick, { strokeDashoffset: 260 }, { strokeDashoffset: 0, duration: dur.base, ease: ease.enter, clearProps: 'strokeDashoffset' });
  }));
  $$('.choice > input[type=radio]', scope).forEach((input) => input.addEventListener('change', () => {
    if (motion()) gsap.fromTo($('.choice__dot', input.nextElementSibling), { scale: 0 }, { scale: 1, duration: dur.base, ease: ease.spring, clearProps: 'transform' });
  }));
  $$('.select-card > input', scope).forEach((input) => input.addEventListener('change', () => {
    if (!motion() || !input.checked) return;
    const box = $('.choice__box', input.closest('.select-card'));
    gsap.fromTo(box, { scale: 0.9 }, { scale: 1, duration: dur.base, ease: ease.spring, clearProps: 'transform' });
    const dot = $('.choice__dot', box), tick = $('.choice__tick', box);
    if (dot) gsap.fromTo(dot, { scale: 0 }, { scale: 1, duration: dur.base, ease: ease.spring, clearProps: 'transform' });
    if (tick) gsap.fromTo(tick, { strokeDashoffset: 260 }, { strokeDashoffset: 0, duration: dur.base, ease: ease.enter, clearProps: 'strokeDashoffset' });
  }));
}

/** Bild oder Icon für Karte und Chip: „dg:privatkunde“ = DG-Illustration, sonst Linien-Icon aus dem Sprite */
export const mediaHTML = (icon, cls) => {
  const svg = icon?.startsWith('dg:') ? dgIconSvg(icon.slice(3)) : null;
  return svg
    ? `<span class="${cls}__img">${svg}</span>`
    : `<span class="${cls}__icon" aria-hidden="true"><svg class="icon"><use href="#i-${esc(icon || 'info')}"/></svg></span>`;
};

/* ---------- Rechter Slot im Feld (Figma: „Info Icon“): Info-Hinweis oder Eingabe löschen ---------- */
let tipId = 0;
/** Markup für den rechten Slot. kind: 'clear' (X, leert das Feld) oder 'info' (Hinweis per Popover). */
export const actionHTML = (kind, text = '') => {
  if (kind === 'clear') return `<button type="button" class="field__action" data-clear aria-label="Eingabe löschen" hidden><svg class="icon" aria-hidden="true"><use href="#i-x"/></svg></button>`;
  const id = `tip-${++tipId}`;
  return `<button type="button" class="field__action" data-info popovertarget="${id}" aria-label="Hinweis anzeigen"><svg class="icon" aria-hidden="true"><use href="#i-info"/></svg></button><span class="tip dg-body-small-book" id="${id}" popover>${esc(text)}</span>`;
};
/** X-Buttons verdrahten: sichtbar, sobald das Feld einen Wert hat; Klick leert das Feld und löst „input“ aus. */
export function bindClear(scope = document) {
  $$('.field__action[data-clear]', scope).forEach((btn) => {
    const input = $('input', btn.closest('.field__control'));
    const sync = () => { btn.hidden = !input.value || input.disabled; };
    input.addEventListener('input', sync);
    new MutationObserver(sync).observe(input, { attributes: true, attributeFilter: ['disabled'] });
    btn.addEventListener('mousedown', (e) => e.preventDefault()); // Fokus bleibt im Feld
    btn.addEventListener('click', () => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); input.focus(); sync(); });
    sync();
  });
}

/**
 * Auswahlkarte (Figma: „Selection card“). Die ganze Karte ist das Label eines echten Radios bzw. einer Checkbox.
 * icon: „dg:<id>“ für DG-Illustrationen oder Name eines Linien-Icons. hint: optionaler Zusatztext.
 */
export const optionHTML = (name, value, label, icon, checked = false, { type = 'radio', hint = '', disabled = false } = {}) => {
  const indicator = type === 'checkbox'
    ? '<svg viewBox="0 0 256 256"><path class="choice__tick" d="M48 136l52 52L208 80"/></svg>'
    : '<span class="choice__dot"></span>';
  return `<label class="select-card select-card--${type}${disabled ? ' is-disabled' : ''}"><input type="${type}" name="${esc(name)}" value="${esc(value)}"${checked ? ' checked' : ''}${disabled ? ' disabled' : ''}>${mediaHTML(icon, 'select-card')}<span class="select-card__text"><span class="select-card__label">${esc(label).replace(/\//g, '/<wbr>')}</span>${hint ? `<span class="select-card__hint">${esc(hint)}</span>` : ''}</span><span class="choice__box" aria-hidden="true">${indicator}</span></label>`;
};
/** Chip für bereits gewählte Optionen (Zusammenfassung im Assistenten) */
export const chipHTML = (label, icon) => `<li class="chip">${mediaHTML(icon, 'chip')}<span class="chip__label">${esc(label)}</span></li>`;
