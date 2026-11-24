/**
 * Token-Referenz: rendert alle Tokens aus dist/tokens.json (generiert aus Figma).
 * Bei einer Änderung in tokens/ baut Vite neu und diese Ansicht aktualisiert sich per HMR.
 */
import initialTokens from '../dist/tokens.json';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const by = (list, fn) => list.reduce((m, t) => { const k = fn(t); (m[k] ||= []).push(t); return m; }, {});
const varOf = (t) => `var(${t.cssVar})`;
const copyBtn = (t) => `<button type="button" class="tok__var" data-copy="${esc(varOf(t))}" title="Kopieren">${esc(t.cssVar)}</button>`;

function swatchRamps(tokens) {
  const prim = tokens.filter((t) => t.set === 'primitives' && t.type === 'color');
  const ramps = by(prim, (t) => t.name.split('.')[1]);
  return Object.entries(ramps).map(([ramp, list]) => `
    <div class="tok-ramp">
      <h4 class="dg-body-small-semibold">${esc(ramp)}</h4>
      <div class="tok-ramp__row">${list.map((t) => `
        <div class="tok-swatch" data-search="${esc(t.name + ' ' + (t.description || ''))}">
          <span class="tok-swatch__chip" style="background:${varOf(t)}"></span>
          <span class="dg-body-tiny-semibold">${esc(t.name.split('.').pop())}</span>
          <span class="dg-body-tiny-book subtle">${esc(t.value)}</span>
          ${t.description?.startsWith('DG:') ? `<span class="badge badge--sm badge--brand">${esc(t.description.replace('DG: ', ''))}</span>` : ''}
        </div>`).join('')}
      </div>
    </div>`).join('');
}

function semanticTable(tokens) {
  const sem = tokens.filter((t) => t.set === 'color' && t.type === 'color');
  const groups = by(sem, (t) => t.name.split('.')[1]);
  return Object.entries(groups).map(([g, list]) => `
    <div class="tok-group">
      <h4 class="dg-body-small-semibold">${esc(g)}</h4>
      <div class="tok-table" role="table">
        ${list.map((t) => `
        <div class="tok-row" role="row" data-search="${esc(t.name + ' ' + (t.alias || '') + ' ' + (t.description || ''))}">
          <span class="tok-split" role="cell" aria-label="Light ${esc(t.value)}, Dark ${esc(t.dark ?? t.value)}">
            <span style="background:${esc(t.value)}"></span><span style="background:${esc(t.dark ?? t.value)}"></span>
          </span>
          <span role="cell" class="tok-row__name"><span class="dg-body-small-semibold">${esc(t.name.replace(/^color\./, ''))}</span>${copyBtn(t)}</span>
          <span role="cell" class="dg-body-tiny-book subtle tok-row__alias">${esc(t.alias || t.value)}<br>${esc(t.aliasDark || t.dark || '')}</span>
          <span role="cell" class="dg-body-tiny-book subtle tok-row__desc">${esc(t.description || '')}</span>
        </div>`).join('')}
      </div>
    </div>`).join('');
}

function scale(tokens, prefix, render) {
  return tokens.filter((t) => t.name.startsWith(prefix) && !t.deprecated).map((t) => `
    <div class="tok-scale" data-search="${esc(t.name)}">
      ${render(t)}
      <span class="dg-body-small-semibold">${esc(t.name.slice(prefix.length))}</span>
      <span class="dg-body-tiny-book subtle">${esc(t.value)}${t.alias ? ' · ' + esc(t.alias) : ''}</span>
      ${copyBtn(t)}
    </div>`).join('');
}

function typeSpecimens(tokens) {
  const styles = tokens.filter((t) => t.type === 'typography' && !t.deprecated);
  return styles.map((t) => {
    const ext = t.extensions || {};
    const sample = t.name.includes('heading') ? 'Glasfaser für Ihr Zuhause' : t.name.includes('price') ? '29,99 €' : t.name.includes('button') ? 'Verfügbarkeit prüfen' : 'Schnelles Internet mit bis zu 1 Gbit/s.';
    const style = `font:${varOf(t)};letter-spacing:${ext.letterSpacingEm ?? 0}em;${ext.textCase === 'UPPER' ? 'text-transform:uppercase;' : ''}`;
    return `
      <div class="tok-type" data-search="${esc(t.name)}">
        <div class="tok-type__meta"><span class="dg-body-small-semibold">${esc(t.name.replace(/^text\./, ''))}</span><span class="dg-body-tiny-book subtle">${esc(t.value.split(' ').slice(0, 2).join(' '))} · ${ext.letterSpacingEm ?? 0}em</span>${copyBtn(t)}</div>
        <p class="tok-type__sample" style="${style}">${esc(sample)}</p>
      </div>`;
  }).join('');
}

function render(tokens, root) {
  root.querySelector('[data-tok="count"]').textContent = `${tokens.length} Tokens · ${tokens.filter((t) => t.dark !== undefined).length} mit Dark-Wert`;
  root.querySelector('[data-tok="primitives"]').innerHTML = swatchRamps(tokens);
  root.querySelector('[data-tok="semantic"]').innerHTML = semanticTable(tokens);
  root.querySelector('[data-tok="spacing"]').innerHTML = scale(tokens, 'spacing.', (t) => `<span class="tok-bar" style="width:${varOf(t)}"></span>`);
  root.querySelector('[data-tok="radius"]').innerHTML = scale(tokens, 'radius.', (t) => `<span class="tok-box" style="border-radius:${varOf(t)}"></span>`);
  root.querySelector('[data-tok="border"]').innerHTML = scale(tokens, 'border-width.', (t) => `<span class="tok-box tok-box--line" style="border-width:${varOf(t)}"></span>`) + scale(tokens, 'focus-ring.', (t) => `<span class="tok-box" style="box-shadow:0 0 0 ${varOf(t)} var(--dg-color-focus-ring-brand)"></span>`);
  root.querySelector('[data-tok="icon"]').innerHTML = scale(tokens, 'icon-size.', (t) => `<span class="tok-box" style="width:${varOf(t)};height:${varOf(t)};border-radius:var(--dg-radius-xs)"></span>`);
  root.querySelector('[data-tok="shadow"]').innerHTML = scale(tokens, 'shadow.', (t) => `<span class="tok-box tok-box--shadow" style="box-shadow:${varOf(t)}"></span>`);
  root.querySelector('[data-tok="type"]').innerHTML = typeSpecimens(tokens);
  root.querySelector('[data-tok="font"]').innerHTML = ['font-family.', 'font-weight.', 'font-size.', 'line-height.'].map((p) => scale(tokens, p, () => '')).join('');
  filter(root);
}

function filter(root) {
  const q = root.querySelector('#tok-search').value.trim().toLowerCase();
  root.querySelectorAll('[data-search]').forEach((el) => { el.hidden = q && !el.dataset.search.toLowerCase().includes(q); });
}

export function mountTokenDocs(root, notify) {
  let tokens = initialTokens;
  render(tokens, root);
  root.querySelector('#tok-search').addEventListener('input', () => filter(root));
  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    try { await navigator.clipboard.writeText(b.dataset.copy); notify(`${b.dataset.copy} kopiert`); } catch { notify('Kopieren nicht erlaubt. Bitte markieren und kopieren.'); }
  });
  if (import.meta.hot) {
    import.meta.hot.accept('../dist/tokens.json', (mod) => {
      if (!mod) return;
      tokens = mod.default;
      render(tokens, root);
      notify('Tokens aktualisiert');
    });
  }
}
