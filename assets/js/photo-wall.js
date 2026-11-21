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
    const leaf = index => ({ first: index, weight: exhibit.weights[tiles[index].dataset.print] || 1 });
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
    return pack(groups);
  }
  const landscape = collection(exhibit.landscape);
  const portrait = collection(exhibit.portrait);

  function arrange() {
    const width = grid.clientWidth, height = grid.clientHeight;
    if (!width || !height) return;
    const gap = parseFloat(getComputedStyle(grid).columnGap);

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
    const layout = fit(width >= height ? landscape : portrait, width, height);
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

  const photo = dialog.querySelector('.photo-wall__image');
  const close = dialog.querySelector('[data-close]');
  const status = dialog.querySelector('[aria-live]');
  const position = dialog.querySelector('.photo-wall__position');
  let current = 0;
  let opener;
  let previousOverflow;
  let swipeStart;
  photo.addEventListener('touchstart', event => {
    swipeStart = event.touches.length === 1 ? event.touches[0] : null;
  }, { passive: true });
  photo.addEventListener('touchcancel', () => { swipeStart = null; });
  photo.addEventListener('touchend', event => {
    if (!swipeStart) return;
    const dx = event.changedTouches[0].clientX - swipeStart.clientX;
    const dy = event.changedTouches[0].clientY - swipeStart.clientY;
    swipeStart = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
  }, { passive: true });

  function show(index) {
    current = (index + tiles.length) % tiles.length;
    const tile = tiles[current];
    photo.alt = tile.querySelector('img').alt;
    photo.src = tile.href;
    position.textContent = (current + 1) + ' / ' + tiles.length;
    status.textContent = `Photo ${current + 1} of ${tiles.length}. ${photo.alt}`;
  }

  tiles.forEach((tile, index) => {
    tile.setAttribute('aria-haspopup', 'dialog');
    tile.addEventListener('click', event => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = tile;
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      dialog.showModal();
      show(index);
      close.focus();
    });
  });

  dialog.querySelectorAll('[data-step]').forEach(button => {
    button.hidden = tiles.length < 2;
    button.addEventListener('click', () => show(current + Number(button.dataset.step)));
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    show(current + (event.key === 'ArrowRight' ? 1 : -1));
  });
  close.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.documentElement.style.overflow = previousOverflow;
    opener.focus({ preventScroll: true });
    photo.removeAttribute('src');
    status.textContent = '';
  });
})();
