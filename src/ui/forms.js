/* Formular-Bausteine: Flyout (Select menu), Combobox, Select, Fehlerzustände, Checkbox/Radio, Optionskacheln. */
import { gsap, motion, $, $$, esc } from '../core.js';

/* ---------- Flyout + Scroll bar ---------- */
function syncScrollbar(menu) {
  const list = $('.menu__list', menu), bar = $('.scrollbar', menu), thumb = $('.scrollbar__thumb', menu);
  if (!bar) return;
  const ratio = list.clientHeight / list.scrollHeight;
  bar.hidden = ratio >= 1;
  if (ratio >= 1) return;
  const h = Math.max(32, list.clientHeight * ratio);
  thumb.style.height = `${h}px`;
  thumb.style.transform = `translateY(${(list.scrollTop / (list.scrollHeight - list.clientHeight)) * (list.clientHeight - h)}px)`;
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
  if (motion()) {
    gsap.killTweensOf(menu);
    gsap.fromTo(menu, { autoAlpha: 0, y: -6, scaleY: 0.96 }, { autoAlpha: 1, y: 0, scaleY: 1, duration: 0.24 });
    gsap.fromTo($$('.menu__item', menu).slice(0, 8), { autoAlpha: 0, y: -4 }, { autoAlpha: 1, y: 0, duration: 0.22, stagger: 0.02, delay: 0.03 });
  }
}
export function closeMenu(field) {
  const menu = $('.menu', field);
  if (!menu || menu.hidden) return;
  field.classList.remove('is-open');
  const hide = () => { if (field.classList.contains('is-open')) return; gsap.killTweensOf(menu); menu.hidden = true; gsap.set(menu, { clearProps: 'all' }); };
  if (!motion()) { hide(); return; }
  gsap.to(menu, { autoAlpha: 0, y: -4, scaleY: 0.98, duration: 0.14, ease: 'power2.in', onComplete: hide });
  setTimeout(hide, 180); // falls rAF pausiert (Hintergrund-Tab)
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
  if (hint) { hint.dataset.base ??= hint.hidden ? '' : hint.textContent; $('.field__hint-text', hint).textContent = msg; hint.hidden = false; }
  $('input, textarea, button.field__control', field)?.setAttribute('aria-invalid', 'true');
  if (motion()) gsap.fromTo($('.field__control', field), { x: 0 }, { keyframes: { x: [0, -6, 5, -3, 2, 0] }, duration: 0.36, ease: 'none' });
}
export function clearError(field) {
  if (!field.classList.contains('is-error')) return;
  field.classList.remove('is-error');
  const hint = $('.field__hint', field);
  if (hint) { if (hint.dataset.base) $('.field__hint-text', hint).textContent = hint.dataset.base; else hint.hidden = true; }
  $('input, textarea, button.field__control', field)?.removeAttribute('aria-invalid');
}
/** Fehler einer Gruppe (Radio, Checkbox, Optionskacheln). */
export function setGroupError(group, on) {
  const err = $('.group__error', group);
  if (err) err.hidden = !on;
  group.classList.toggle('is-error', on);
  $$('.choice, .option', group).forEach((c) => c.classList.toggle('is-error', on));
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
    if (motion()) gsap.fromTo(val, { y: 6, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.25 });
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
    gsap.fromTo(box, { scale: 0.86 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
    if (input.checked && tick) gsap.fromTo(tick, { strokeDashoffset: 260 }, { strokeDashoffset: 0, duration: 0.28, ease: 'power2.out', clearProps: 'strokeDashoffset' });
  }));
  $$('.choice > input[type=radio]', scope).forEach((input) => input.addEventListener('change', () => {
    if (motion()) gsap.fromTo($('.choice__dot', input.nextElementSibling), { scale: 0 }, { scale: 1, duration: 0.4, ease: 'back.out(2.6)', clearProps: 'transform' });
  }));
  $$('.option > input', scope).forEach((input) => input.addEventListener('change', () => {
    if (!motion() || !input.checked) return;
    const opt = input.closest('.option');
    gsap.fromTo(opt, { scale: 0.97 }, { scale: 1, duration: 0.35, ease: 'back.out(2.4)', clearProps: 'transform' });
    gsap.fromTo($('.option__check', opt), { scale: 0, rotate: -45 }, { scale: 1, rotate: 0, duration: 0.4, ease: 'back.out(2.6)', clearProps: 'transform' });
  }));
}

/** Optionskachel als HTML (Radio). icon = Name aus dem Icon-Sprite. */
export const optionHTML = (name, value, label, icon, checked = false) =>
  `<label class="option"><input type="radio" name="${esc(name)}" value="${esc(value)}"${checked ? ' checked' : ''}><span class="option__icon" aria-hidden="true"><svg class="icon"><use href="#i-${icon}"/></svg></span><span class="option__label">${esc(label)}</span><span class="option__check" aria-hidden="true"><svg class="icon icon--xs"><use href="#i-check"/></svg></span></label>`;
