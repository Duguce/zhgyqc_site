(() => {
  'use strict';
  const root = document.getElementById('site-statistics');
  if (!root) return;
  const byId = id => document.getElementById(`stats-${id}`);
  const number = new Intl.NumberFormat('en-US');
  const average = new Intl.NumberFormat('en-US', {maximumFractionDigits: 1});
  const clock = new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Shanghai', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
  const calendar = new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Shanghai', year: 'numeric', month: 'short', day: 'numeric'});
  const buttons = [...root.querySelectorAll('[data-period]')];
  let snapshot, period = '30';

  function element(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function notice(text) {
    byId('notice').textContent = text;
    byId('notice').hidden = !text;
  }
  function validPath(path) {
    return typeof path === 'string' && path.length < 1200 && !/[?#\\\s]/.test(path) &&
      (path === '/' || /^\/(blogs|moments)\/(?!\/)/.test(path)) &&
      !path.split('/').some(part => /^(\.|%2e){1,2}$/i.test(part));
  }
  function validate(data) {
    if (!data || data.version !== 1 || !['ready', 'not_configured'].includes(data.state)) throw new Error('Unsupported snapshot');
    if (data.state !== 'ready') return;
    for (const key of ['7', '30']) {
      const p = data.periods?.[key];
      if (!p || !Number.isSafeInteger(p.total) || p.total < 0 || !Number.isSafeInteger(p.pageCount) || p.pageCount < 0 ||
          !Number.isInteger(p.coveredDays) || p.coveredDays < 1 || p.coveredDays > Number(key) ||
          !Array.isArray(p.daily) || p.daily.length !== p.coveredDays ||
          !Array.isArray(p.pages) || p.pages.length > 5 || !Array.isArray(p.sources) || p.sources.length > 5) throw new Error('Invalid period');
      if (p.daily.some(d => !/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !Number.isSafeInteger(d.visits) || d.visits < 0) ||
          p.daily.reduce((sum, d) => sum + d.visits, 0) !== p.total) throw new Error('Invalid daily totals');
      if (p.pages.some(row => !validPath(row.path) || typeof row.title !== 'string' || row.title.length > 500 ||
          !['home', 'blogs', 'moments'].includes(row.kind) || !Number.isSafeInteger(row.visits) || row.visits < 1)) throw new Error('Invalid page');
      if (p.sources.some(row => typeof row.name !== 'string' || row.name.length > 253 || !Number.isSafeInteger(row.visits) || row.visits < 1)) throw new Error('Invalid source');
    }
    if (!Number.isFinite(Date.parse(data.generatedAt)) || !Number.isFinite(Date.parse(data.dataThrough)) || !/^\d{4}-\d{2}-\d{2}$/.test(data.startedAt)) throw new Error('Invalid timestamp');
  }
  function dateLabel(value) { return value.slice(5).replace('-', '/'); }
  function date(value) { return calendar.format(new Date(`${value}T00:00:00+08:00`)); }
  function pageLabel(page) {
    if (!/[\u3400-\u9fff]/.test(page.title)) return page.title;
    const slug = page.path.split('/').filter(Boolean).at(-1).replace(/^\d{4}-\d{2}-\d{2}-/, '');
    if (!/^[a-z0-9-]+$/i.test(slug)) return page.kind === 'blogs' ? 'Blog article' : 'Moment';
    return slug.replace(/-/g, ' ').replace(/\b[a-z]/g, letter => letter.toUpperCase());
  }
  function timestamp(value) {
    const parts = Object.fromEntries(clock.formatToParts(new Date(value)).map(part => [part.type, part.value]));
    return `${parts.month} ${parts.day}, ${parts.year} · ${parts.hour}:${parts.minute}`;
  }
  function renderChart(daily) {
    const host = byId('chart');
    host.replaceChildren();
    if (!daily.some(d => d.visits > 0)) {
      host.append(element('p', 'No visits recorded in this period.', 'stats-placeholder'));
    } else {
      const ns = 'http://www.w3.org/2000/svg';
      const width = Math.max(260, Math.round(host.clientWidth || 700));
      const height = width < 450 ? 180 : 210;
      const left = 40, right = 4, top = 12, bottom = 30;
      const plotWidth = width - left - right, plotHeight = height - top - bottom;
      const max = Math.max(...daily.map(d => d.visits));
      const upper = Math.max(2, Math.ceil(max / 2) * 2);
      const svg = document.createElementNS(ns, 'svg');
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-labelledby', 'stats-svg-title stats-svg-desc');
      function shape(tag, attrs, text) {
        const node = document.createElementNS(ns, tag);
        for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
        if (text !== undefined) node.textContent = text;
        svg.append(node);
        return node;
      }
      shape('title', {id: 'stats-svg-title'}, 'Daily visits');
      shape('desc', {id: 'stats-svg-desc'}, `Visits from ${daily[0].date} to ${daily.at(-1).date}. Exact values are available in the daily numbers table below.`);
      for (const value of [0, upper / 2, upper]) {
        const y = top + plotHeight * (1 - value / upper);
        shape('line', {x1: left, y1: y, x2: width - right, y2: y, class: 'stats-grid-line'});
        shape('text', {x: left - 8, y: y + 4, 'text-anchor': 'end'}, number.format(value));
      }
      const step = daily.length > 1 ? plotWidth / (daily.length - 1) : 0;
      const points = daily.map((day, i) => [left + (step ? i * step : plotWidth / 2), top + plotHeight * (1 - day.visits / upper)]);
      const line = points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
      const defs = shape('defs', {});
      const gradient = document.createElementNS(ns, 'linearGradient');
      gradient.id = 'stats-area-fill'; gradient.setAttribute('x2', '0'); gradient.setAttribute('y2', '1');
      for (const [offset, opacity] of [['0%', '.16'], ['100%', '.01']]) {
        const stop = document.createElementNS(ns, 'stop');
        stop.setAttribute('offset', offset); stop.setAttribute('stop-color', '#526d82'); stop.setAttribute('stop-opacity', opacity); gradient.append(stop);
      }
      defs.append(gradient);
      if (daily.length > 1) {
        shape('path', {d: `${line} L ${points.at(-1)[0]} ${top + plotHeight} L ${points[0][0]} ${top + plotHeight} Z`, fill: 'url(#stats-area-fill)'});
        shape('path', {d: line, class: 'stats-line'});
      }
      daily.forEach((day, i) => {
        const point = shape('circle', {cx: points[i][0], cy: points[i][1], r: daily.length <= 7 || i === daily.length - 1 ? 3.5 : 0, class: 'stats-point'});
        const title = document.createElementNS(ns, 'title');
        title.textContent = `${day.date}: ${number.format(day.visits)}`;
        point.append(title);
      });
      const labels = [...new Set([0, Math.floor((daily.length - 1) / 2), daily.length - 1])];
      for (const i of labels) shape('text', {x: points[i][0], y: height - 6, 'text-anchor': daily.length === 1 ? 'middle' : i === 0 ? 'start' : i === daily.length - 1 ? 'end' : 'middle'}, dateLabel(daily[i].date));
      host.append(svg);
    }
    const table = element('table');
    const head = element('thead'), headRow = element('tr');
    headRow.append(element('th', 'Date'), element('th', 'Visits'));
    head.append(headRow);
    const body = element('tbody');
    daily.forEach(day => {
      const row = element('tr');
      row.append(element('td', day.date), element('td', number.format(day.visits)));
      body.append(row);
    });
    table.append(head, body);
    byId('daily-table').replaceChildren(table);
  }
  function renderPages(pages) {
    const host = byId('pages'); host.replaceChildren();
    if (!pages.length) host.append(element('li', 'No visits recorded yet.', 'stats-placeholder'));
    for (const page of pages) {
      const li = element('li'), row = element('div', undefined, 'stats-row');
      const link = element('a', pageLabel(page));
      const base = new URL(root.dataset.siteRoot, location.origin);
      const target = new URL(page.path.slice(1), base);
      if (target.origin !== location.origin || !target.pathname.startsWith(base.pathname)) continue;
      link.href = target.href;
      row.append(link, element('span', number.format(page.visits), 'stats-row-count'));
      li.append(row, element('span', {home: 'Home', blogs: 'Blog', moments: 'Moments'}[page.kind], 'stats-row-label'));
      host.append(li);
    }
  }
  function renderSources(sources, total) {
    const host = byId('sources'); host.replaceChildren();
    if (!sources.length) host.append(element('li', 'No source data yet.', 'stats-placeholder'));
    for (const source of sources) {
      const share = total ? Math.min(100, 100 * source.visits / total) : 0;
      const li = element('li'), row = element('div', undefined, 'stats-row');
      const label = source.name;
      if (label === 'Direct or unknown') li.title = 'Visits without referrer information';
      row.append(element('span', label), element('span', `${number.format(source.visits)} · ${Math.round(share)}%`, 'stats-row-count'));
      const track = element('div', undefined, 'stats-source-track'), fill = element('span');
      fill.style.width = `${share}%`; track.append(fill); li.append(row, track); host.append(li);
    }
  }
  function render() {
    const p = snapshot.periods[period];
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.period === period)));
    byId('range').textContent = `${date(p.start)} — ${date(p.end)}`;
    byId('total').textContent = number.format(p.total);
    byId('average').textContent = average.format(p.total / p.coveredDays);
    byId('page-count').textContent = number.format(p.pageCount);
    byId('coverage').textContent = `${p.coveredDays} ${p.coveredDays === 1 ? 'day' : 'days'} recorded`;
    renderChart(p.daily); renderPages(p.pages); renderSources(p.sources, p.total);
  }
  async function load() {
    const abort = new AbortController(), timeout = setTimeout(() => abort.abort(), 8000);
    try {
      const source = new URL(root.dataset.source, location.href);
      if (source.origin !== location.origin) throw new Error('Unexpected origin');
      const response = await fetch(source, {signal: abort.signal, credentials: 'omit'});
      if (!response.ok) throw new Error('Snapshot unavailable');
      const text = await response.text();
      if (text.length > 100000) throw new Error('Snapshot too large');
      const data = JSON.parse(text); validate(data);
      if (data.state === 'not_configured') {
        byId('status').textContent = 'Awaiting the first update';
        notice('Statistics will appear after the first successful update.');
        return;
      }
      snapshot = data;
      byId('started').textContent = date(data.startedAt);
      byId('through').textContent = timestamp(data.dataThrough);
      byId('updated').textContent = timestamp(data.generatedAt);
      byId('status').textContent = 'Updated every 6 hours';
      if (data.demo === true) notice('This preview uses sample data.');
      else if (Date.now() - Date.parse(data.generatedAt) > 86400000) notice('The last update is over 24 hours old.');
      else notice('');
      buttons.forEach(button => { button.disabled = false; button.addEventListener('click', () => { period = button.dataset.period; render(); }); });
      render();
      if (typeof ResizeObserver !== 'undefined') {
        let lastWidth = 0;
        new ResizeObserver(entries => {
          const width = Math.round(entries[0].contentRect.width);
          if (width !== lastWidth) { lastWidth = width; renderChart(snapshot.periods[period].daily); }
        }).observe(byId('chart'));
      }
    } catch (_) {
      byId('status').textContent = 'Statistics are temporarily unavailable';
      notice('Please try again later.');
    } finally { clearTimeout(timeout); }
  }
  load();
})();
