(() => {
  const wall = document.querySelector('.photo-wall');
  const tiles = Array.from(wall.querySelectorAll('.photo-wall__tile'));
  const dialog = wall.querySelector('dialog');
  if (!tiles.length || typeof dialog.showModal !== 'function') return;

  const photo = dialog.querySelector('.photo-wall__image');
  const close = dialog.querySelector('[data-close]');
  const status = dialog.querySelector('[aria-live]');
  let current = 0;
  let opener;
  let previousOverflow;

  function show(index) {
    current = (index + tiles.length) % tiles.length;
    const tile = tiles[current];
    photo.alt = tile.querySelector('img').alt;
    photo.src = tile.href;
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
