(() => {
  'use strict';
  const root = document.getElementById('site-statistics');
  if (!root) return;
  const byId = id => document.getElementById(`stats-${id}`);
  const number = new Intl.NumberFormat('en-US');
  const average = new Intl.NumberFormat('en-US', {maximumFractionDigits: 1});
  const clock = new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Shanghai', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'});
  const calendar = new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Shanghai', year: 'numeric', month: 'short', day: 'numeric'});
  const shortCalendar = new Intl.DateTimeFormat('en-US', {timeZone: 'Asia/Shanghai', month: 'short', day: 'numeric'});
  const compact = new Intl.NumberFormat('en-US', {notation: 'compact', maximumFractionDigits: 1});
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
  function date(value, format = calendar) { return format.format(new Date(`${value}T00:00:00+08:00`)); }
  function visitsLabel(count) { return `${number.format(count)} ${count === 1 ? 'visit' : 'visits'}`; }
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
    const previousDay = host.querySelector('[aria-pressed="true"]')?.dataset.date;
    const restoreFocus = host.contains(document.activeElement);
    const max = Math.max(...daily.map(day => day.visits));
    if (max === 0) {
      host.replaceChildren(element('p', 'No visits recorded in this period.', 'stats-placeholder'));
      return;
    }

    const ns = 'http://www.w3.org/2000/svg';
    const sparse = daily.length <= 3;
    const width = host.clientWidth || 700;
    const narrow = width < 440;
    const height = sparse ? 156 : narrow ? 176 : 208;
    const top = sparse ? 26 : 12;
    const baseline = height - 29;
    const plotWidth = sparse ? Math.min(width - 62, daily.length * 168) : width - 50;
    const left = sparse ? (width - plotWidth) / 2 : 38;
    const step = plotWidth / daily.length;
    const unit = 10 ** Math.floor(Math.log10(Math.max(1, max / 2)));
    const upper = Math.ceil(max / (2 * unit)) * 2 * unit;
    const scaleY = value => baseline - (baseline - top) * value / upper;
    const points = daily.map((day, i) => [left + (i + .5) * step, scaleY(day.visits)]);
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    function shape(tag, attrs, text, parent = svg) {
      const node = document.createElementNS(ns, tag);
      for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, String(value));
      if (text !== undefined) node.textContent = text;
      parent.append(node);
      return node;
    }

    const defs = shape('defs', {});
    const gradient = shape('linearGradient', {id: 'stats-chart-fill', x2: '0%', y2: '100%'}, undefined, defs);
    shape('stop', {offset: '0%', 'stop-opacity': sparse ? .85 : .20}, undefined, gradient);
    shape('stop', {offset: '100%', 'stop-opacity': sparse ? .42 : .02}, undefined, gradient);

    for (const value of [0, upper / 2, upper]) {
      const y = scaleY(value);
      shape('line', {x1: left, y1: y, x2: left + plotWidth, y2: y, class: value === 0 ? 'stats-baseline' : 'stats-grid-line'});
      shape('text', {x: left - 8, y: y + 4, 'text-anchor': 'end'}, compact.format(value));
    }
    const labelCount = Math.min(daily.length, sparse || narrow ? 3 : 5);
    for (let label = 0; label < labelCount; label++) {
      const i = Math.round(label * (daily.length - 1) / Math.max(1, labelCount - 1));
      shape('text', {x: points[i][0], y: height - 7, 'text-anchor': 'middle'}, date(daily[i].date, shortCalendar));
    }

    if (sparse) {
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', daily.map(day => `${date(day.date)}: ${visitsLabel(day.visits)}`).join('; '));
      const barWidth = Math.min(48, step * .46);
      daily.forEach((day, i) => {
        const [x, y] = points[i];
        const bar = day.visits
          ? shape('rect', {x: x - barWidth / 2, y, width: barWidth, height: baseline - y, rx: 5, fill: 'url(#stats-chart-fill)'})
          : shape('circle', {cx: x, cy: y, r: 3, class: 'stats-chart-zero'});
        shape('title', {}, `${date(day.date)}: ${visitsLabel(day.visits)}`, bar);
        const exact = number.format(day.visits);
        const label = exact.length * 8 <= step - 8 ? exact : compact.format(day.visits);
        shape('text', {x, y: y - 9, 'text-anchor': 'middle', class: 'stats-chart-value'}, label);
      });
      host.replaceChildren(svg);
      return;
    }

    svg.setAttribute('aria-hidden', 'true');
    const line = points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ');
    shape('path', {d: `${line} L ${points.at(-1)[0]} ${baseline} L ${points[0][0]} ${baseline} Z`, fill: 'url(#stats-chart-fill)'});
    const guide = shape('line', {y1: top, y2: baseline, class: 'stats-chart-guide'});
    shape('path', {d: line, class: 'stats-line'});
    const point = shape('circle', {r: 5, class: 'stats-point'});
    const stage = element('div', undefined, 'stats-chart-stage');
    const readout = element('div', undefined, 'stats-chart-readout');
    const readoutDate = element('span');
    const readoutVisits = element('strong');
    readout.append(readoutDate, readoutVisits);
    readout.setAttribute('aria-hidden', 'true');
    const targets = element('div', undefined, 'stats-chart-targets');
    targets.setAttribute('role', 'group');
    targets.setAttribute('aria-label', 'Daily visits. Use the arrow keys to move between dates.');
    targets.style.inset = `${100 * top / height}% ${100 * (width - left - plotWidth) / width}% ${100 * (height - baseline) / height}% ${100 * left / width}%`;

    let active;
    const days = daily.map((day, i) => {
      const button = element('button');
      button.type = 'button';
      button.tabIndex = -1;
      button.dataset.date = day.date;
      button.setAttribute('aria-label', `${date(day.date)}: ${visitsLabel(day.visits)}`);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') select(i); });
      button.addEventListener('click', () => select(i));
      button.addEventListener('focus', () => select(i));
      button.addEventListener('keydown', event => {
        const next = {ArrowLeft: i - 1, ArrowRight: i + 1, Home: 0, End: daily.length - 1}[event.key];
        if (next === undefined) return;
        event.preventDefault();
        days[Math.max(0, Math.min(next, days.length - 1))].focus();
      });
      return button;
    });

    function select(i) {
      if (active !== undefined) {
        days[active].tabIndex = -1;
        days[active].setAttribute('aria-pressed', 'false');
      }
      active = i;
      days[i].tabIndex = 0;
      days[i].setAttribute('aria-pressed', 'true');
      readoutDate.textContent = date(daily[i].date, shortCalendar);
      readoutVisits.textContent = visitsLabel(daily[i].visits);
      const [x, y] = points[i];
      guide.setAttribute('x1', x);
      guide.setAttribute('x2', x);
      point.setAttribute('cx', x);
      point.setAttribute('cy', y);
    }

    const previousIndex = daily.findIndex(day => day.date === previousDay);
    select(previousIndex === -1 ? daily.length - 1 : previousIndex);
    targets.append(...days);
    stage.append(svg, targets);
    host.replaceChildren(readout, stage);
    if (restoreFocus) days[active].focus({preventScroll: true});
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
