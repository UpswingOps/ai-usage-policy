(function () {
  'use strict';

  const DEFAULT_COMPANY = 'UpswingOps';

  const qs = (sel, parent = document) => parent.querySelector(sel);
  const el = (tag, opts = {}) => {
    const node = document.createElement(tag);
    if (opts.className) node.className = opts.className;
    if (opts.text) node.textContent = opts.text;
    if (opts.html) node.innerHTML = opts.html;
    if (opts.attrs) Object.entries(opts.attrs).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  };

  function getCompanyName() {
    const params = new URLSearchParams(window.location.search);
    const value = (params.get('companyName') || '').trim();
    return value || DEFAULT_COMPANY;
  }

  function setCompanyParam(value) {
    const params = new URLSearchParams(window.location.search);
    if (value && value !== DEFAULT_COMPANY) {
      params.set('companyName', value);
    } else {
      params.delete('companyName');
    }
    const url = `${location.pathname}?${params.toString()}`.replace(/\?$/, '');
    history.replaceState(null, '', url);
  }

  function replaceCompanyPlaceholders(value, data) {
    const replacer = (obj) => {
      if (typeof obj === 'string') return obj.replaceAll('{{companyName}}', value);
      if (Array.isArray(obj)) return obj.map(replacer);
      if (obj && typeof obj === 'object') {
        const copy = {};
        Object.entries(obj).forEach(([k, v]) => { copy[k] = replacer(v); });
        return copy;
      }
      return obj;
    };
    return replacer(data);
  }

  async function loadPolicy(company) {
    const res = await fetch('data/policy.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load policy.json');
    const json = await res.json();
    return replaceCompanyPlaceholders(company, json);
  }

  function createDisclosureButton() {
    const btn = el('button', { className: 'disclosure', attrs: { 'aria-expanded': 'false' } });
    btn.append(
      el('span', { className: 'chevron', html: '▾' }),
      el('span', { text: 'Details' })
    );
    return btn;
  }

  function createHiddenDescription(text) {
    const p = el('p', { className: 'item-description', text });
    p.setAttribute('aria-hidden', 'true');
    return p;
  }

  function renderRemember(list, items) {
    list.innerHTML = '';
    items.forEach((t) => {
      const li = el('li', { text: t });
      list.appendChild(li);
    });
  }

  function createItemRow(titleText, metaText) {
    const item = el('div', { className: 'item' });
    const header = el('div', { className: 'item-header' });
    const left = el('div');
    const title = el('div', { className: 'item-title', text: titleText });
    // if (metaText) {
    //   const meta = el('div', { className: 'item-meta', text: metaText });
    //   left.append(title, meta);
    // } else {
    //   left.append(title);
    // }
    left.append(title);
    const toggle = createDisclosureButton();
    const desc = createHiddenDescription(metaText || '');
    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      desc.setAttribute('aria-hidden', String(expanded));
    });
    header.append(left, toggle);
    item.append(header, desc);
    return item;
  }

  function renderSection(container, items, mapFn) {
    container.innerHTML = '';
    items.forEach((it) => container.appendChild(mapFn(it)));
  }

  function applySearchFilter(query) {
    const q = query.trim().toLowerCase();
    document.querySelectorAll('.item').forEach((node) => {
      const text = node.textContent.toLowerCase();
      node.style.display = !q || text.includes(q) ? '' : 'none';
    });
  }

  function initControls(company) {
    const companyInput = qs('#companyName');
    const applyBtn = qs('#applyCompany');
    const search = qs('#search');
    companyInput.value = company;
    applyBtn.addEventListener('click', () => {
      const value = companyInput.value.trim() || DEFAULT_COMPANY;
      setCompanyParam(value);
      // Reload to re-run placeholder substitution path
      location.reload();
    });
    search.addEventListener('input', (e) => applySearchFilter(e.target.value));
  }

  function setFooter(company) {
    qs('#footerCompany').textContent = company;
    qs('#year').textContent = String(new Date().getFullYear());
    qs('#site-title').textContent = `${company} · AI Usage Policy`;
  }

  async function start() {
    const company = getCompanyName();
    setFooter(company);
    initControls(company);
    try {
      const policy = await loadPolicy(company);
      renderRemember(qs('#rememberList'), policy.remember || []);

      // Do's
      renderSection(qs('#dosList'), policy.dos || [], (d) => createItemRow(d.title, d.description));
      // Don'ts
      renderSection(qs('#dontsList'), policy.donts || [], (d) => createItemRow(d.title, d.description));
      // Tools
      renderSection(qs('#toolsList'), policy.approved_tools || [], (t) => createItemRow(t.name, t.description));
      // Risks
      renderSection(qs('#risksList'), policy.key_risks || [], (r) => createItemRow(r.risk, r.description));
      // Definitions
      renderSection(qs('#definitionsList'), policy.definitions || [], (d) => createItemRow(d.term, d.description));

    } catch (err) {
      console.error(err);
      const main = document.querySelector('main');
      const error = el('div', { className: 'card' });
      error.append(el('h2', { text: 'Error loading policy' }), el('p', { text: 'Please try again later.' }));
      main.prepend(error);
    }
  }

  document.addEventListener('DOMContentLoaded', start);
})();


