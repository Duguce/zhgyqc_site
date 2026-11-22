(() => {
  const wall = document.querySelector('.photo-wall');
  const tiles = Array.from(wall.querySelectorAll('.photo-wall__tile'));
  const dialog = wall.querySelector('dialog');
  if (!tiles.length) return;

  const grid = wall.querySelector('.photo-wall__grid');
  const exhibit = JSON.parse(grid.dataset.exhibit);
  const ratios = tiles.map(tile => {
    const img = tile.querySelector('img');
    return exhibit.ratios[tile.dataset.print] ||
      Number(img.getAttribute('width')) / Number(img.getAttribute('height'));
  });
  function join(a, b) {
    return { a, b, weight: a.weight + b.weight };
  }
  function pack(nodes) {
    if (nodes.length === 1) return nodes[0];
    const middle = Math.ceil(nodes.length / 2);
    return join(pack(nodes.slice(0, middle)), pack(nodes.slice(middle)));
  }
  function collection(order) {
    const remaining = new Set(tiles.map((_, i) => i));
    const orderedTiles = [];
    function leaf(index) {
      const tile = tiles[index];
      orderedTiles.push(tile);
      return { first: index, weight: exhibit.weights[tile.dataset.print] || 1 };
    }
    function take(spec) {
      if (Array.isArray(spec)) {
        const members = spec.map(take).filter(Boolean);
        return members.length && pack(members);
      }
      const index = tiles.findIndex((tile, i) => remaining.has(i) && tile.dataset.print === spec);
      if (index >= 0) { remaining.delete(index); return leaf(index); }
    }
    const groups = [];
    for (const name of order) {
      const node = take(exhibit.groups[name]);
      if (node) { node.name = name; groups.push(node); }
    }
    if (remaining.size) groups.push(pack([...remaining].map(leaf)));
    return { tree: pack(groups), tiles: orderedTiles };
  }
  const landscape = collection(exhibit.landscape);
  const portrait = collection(exhibit.portrait);
  const position = dialog.querySelector('.photo-wall__position');
  const status = dialog.querySelector('[aria-live]');
  let orderedTiles = tiles;
  let current;

  function updatePosition() {
    if (!current) return;
    const index = orderedTiles.indexOf(current) + 1;
    position.textContent = index + ' / ' + orderedTiles.length;
    status.textContent = 'Photo ' + index + ' of ' + orderedTiles.length + '. ' + current.querySelector('img').alt;
  }

  function arrange() {
    const width = grid.clientWidth, height = grid.clientHeight;
    if (!width || !height) return;
    const gap = parseFloat(getComputedStyle(grid).columnGap);
    const collection = width >= height ? landscape : portrait;
    if (orderedTiles !== collection.tiles) {
      const focused = document.activeElement;
      orderedTiles = collection.tiles;
      grid.append(...orderedTiles);
      if (grid.contains(focused)) focused.focus({ preventScroll: true });
      updatePosition();
    }

    // Try side-by-side and stacked arrangements within each group. Score
    // the actual cropping of the photos, rather than imposing row heights.
    function fit(node, w, h) {
      if (!node.a) {
        const crop = Math.log((w / h) / ratios[node.first]);
        return { score: crop * crop, index: node.first, w, h };
      }
      function split(across) {
        const span = (across ? w : h) - gap;
        const share = node.a.weight / node.weight;
        let fraction = share;
        if (!node.a.a && !node.b.a && node.name !== 'lake') {
          const ra = ratios[node.a.first], rb = ratios[node.b.first];
          const natural = across ? ra / (ra + rb) : rb / (ra + rb);
          fraction = 0.3 * share + 0.7 * natural;
        }
        const size = Math.round(span * fraction);
        if (size <= 0 || size >= span) return { score: Infinity };
        const a = fit(node.a, across ? size : w, across ? h : size);
        const b = fit(node.b, across ? span - size : w, across ? h : span - size);
        return { a, b, across, offset: size + gap, score: a.score + b.score };
      }
      if (node.name === 'lake' && height > width) return split(false);
      const side = split(true), stack = split(false);
      return side.score < stack.score ? side : stack;
    }

    function place(box, x, y) {
      if (box.a) {
        place(box.a, x, y);
        place(box.b, x + (box.across ? box.offset : 0), y + (box.across ? 0 : box.offset));
        return;
      }
      const tile = tiles[box.index];
      Object.assign(tile.style, {
        left: x + 'px', top: y + 'px', width: box.w + 'px', height: box.h + 'px'
      });
      tile.querySelector('img').sizes = box.w + 'px';
    }
    const layout = fit(collection.tree, width, height);
    if (!Number.isFinite(layout.score)) {
      grid.classList.remove('is-arranged');
      tiles.forEach(tile => ['left', 'top', 'width', 'height'].forEach(key => tile.style.removeProperty(key)));
      return;
    }
    place(layout, 0, 0);
    grid.classList.add('is-arranged');
  }
  arrange();
  if (window.ResizeObserver) new ResizeObserver(arrange).observe(grid);
  else window.addEventListener('resize', arrange);
  if (typeof dialog.showModal !== 'function') return;

  const frame = dialog.querySelector('.photo-wall__frame');
  const preview = frame.querySelector('[data-preview]');
  const retry = frame.querySelector('[data-retry]');
  const close = dialog.querySelector('[data-close]');
  const tilesById = new Map(tiles.map(tile => [tile.id, tile]));
  let activeLoad;
  let prefetched;
  let opener;
  let previousOverflow;
  let closing = false;
  let swipeStart;

  function neighbor(direction) {
    const count = orderedTiles.length;
    const index = orderedTiles.indexOf(current);
    return orderedTiles[(index + direction + count) % count];
  }

  function loadPhoto(tile, priority) {
    const image = new Image();
    image.className = 'photo-wall__image';
    image.alt = tile.querySelector('img').alt;
    image.fetchPriority = priority;
    image.src = tile.href;
    const ready = image.decode().then(() => true, () => false);
    return { tile, image, ready };
  }

  function discard(load) {
    if (!load) return;
    load.image.remove();
    load.image.removeAttribute('src');
  }

  async function show(tile, direction = 1) {
    current = tile;
    updatePosition();
    frame.style.setProperty('--photo-width', tile.dataset.width + 'px');
    frame.style.setProperty('--photo-height', tile.dataset.height + 'px');
    const thumbnail = tile.querySelector('img');
    preview.src = tile.dataset.preview || thumbnail.currentSrc || thumbnail.src;
    preview.alt = thumbnail.alt;
    preview.hidden = false;
    if (document.activeElement === retry) close.focus({ preventScroll: true });
    retry.hidden = true;

    discard(activeLoad);
    if (prefetched?.tile === tile) {
      activeLoad = prefetched;
      activeLoad.image.fetchPriority = 'high';
    } else {
      discard(prefetched);
      activeLoad = loadPhoto(tile, 'high');
    }
    prefetched = undefined;

    const request = activeLoad;
    const loaded = await request.ready;
    if (request !== activeLoad || !dialog.open) return;
    if (!loaded) {
      retry.hidden = false;
      status.textContent = 'The full-size image could not load.';
      return;
    }
    preview.after(request.image);
    preview.hidden = true;

    const next = neighbor(direction);
    if (next !== tile && !navigator.connection?.saveData) {
      prefetched = loadPhoto(next, 'low');
    }
  }

  function photoURL(tile) {
    const url = new URL(location.href);
    url.hash = tile ? encodeURIComponent(tile.id) : '';
    return url;
  }

  function tileFromLocation() {
    try {
      return tilesById.get(decodeURIComponent(location.hash.slice(1)));
    } catch {
      return undefined;
    }
  }

  function syncLocation() {
    closing = false;
    const tile = tileFromLocation();
    if (!tile) {
      if (!dialog.open) return;
      dialog.close();
      document.documentElement.style.overflow = previousOverflow;
      (opener || current).focus({ preventScroll: Boolean(opener) });
      discard(activeLoad);
      discard(prefetched);
      current = undefined;
      activeLoad = undefined;
      prefetched = undefined;
      opener = undefined;
      swipeStart = undefined;
      preview.removeAttribute('src');
      status.textContent = '';
      return;
    }

    if (!dialog.open) {
      opener = tilesById.get(history.state?.photoWallOpener);
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      dialog.showModal();
      close.focus({ preventScroll: true });
    }
    if (tile !== current) show(tile);
  }

  function step(direction) {
    if (!current || closing) return;
    const tile = neighbor(direction);
    if (tile === current) return;
    history.replaceState(history.state, '', photoURL(tile));
    show(tile, direction);
  }

  function closeViewer() {
    if (closing) return;
    if (tilesById.has(history.state?.photoWallOpener)) {
      closing = true;
      history.back();
    } else {
      history.replaceState(history.state, '', photoURL());
      syncLocation();
    }
  }

  tiles.forEach(tile => {
    tile.setAttribute('aria-haspopup', 'dialog');
    tile.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      history.pushState({ ...history.state, photoWallOpener: tile.id }, '', photoURL(tile));
      syncLocation();
    });
  });

  frame.addEventListener('touchstart', event => {
    swipeStart = event.touches.length === 1 && event.target instanceof HTMLImageElement ? event.touches[0] : null;
  }, { passive: true });
  frame.addEventListener('touchcancel', () => { swipeStart = null; });
  frame.addEventListener('touchend', event => {
    if (!swipeStart) return;
    const dx = event.changedTouches[0].clientX - swipeStart.clientX;
    const dy = event.changedTouches[0].clientY - swipeStart.clientY;
    swipeStart = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  dialog.querySelectorAll('[data-step]').forEach(button => {
    button.hidden = tiles.length < 2;
    button.addEventListener('click', () => step(Number(button.dataset.step)));
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    step(event.key === 'ArrowRight' ? 1 : -1);
  });
  close.addEventListener('click', closeViewer);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeViewer();
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) closeViewer();
  });
  retry.addEventListener('click', () => show(current));
  window.addEventListener('popstate', syncLocation);
  window.addEventListener('hashchange', syncLocation);
  syncLocation();
})();
