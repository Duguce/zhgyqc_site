(function() {
  const article = document.querySelector(".scholar-article");
  if (!article) return;
  const zh = article.dataset.language === "zh";
  /* Keep wide tables inside the centered reading column. */
  document.querySelectorAll('.scholar-body__content table').forEach(table => {
    const wrap = document.createElement('div');
    wrap.className = 'table-scroll';
    table.parentNode.insertBefore(wrap, table);
    wrap.appendChild(table);
  });

  /* ── Code blocks ──
     The label and copy button live on a wrapper rather than inside <pre>, so
     they stay pinned to the visible corner while wide code scrolls under them. */
  const blocks = document.querySelectorAll('.scholar-body__content pre');
  blocks.forEach(block => {
    if (block.dataset.enhanced) return;
    block.dataset.enhanced = 'true';

    const wrap = document.createElement('div');
    wrap.className = 'code-block';
    block.parentNode.insertBefore(wrap, block);
    wrap.appendChild(block);

    const codeEl = block.querySelector('code');
    const cls = (codeEl && codeEl.className) || block.className || '';
    const lang = (cls.match(/language-(\w+)/) || [])[1];
    if (lang) {
      const lbl = document.createElement('span');
      lbl.className = 'code-lang';
      lbl.textContent = lang;
      wrap.appendChild(lbl);
    }

    const btn = document.createElement('button');
    btn.className = 'code-copy';
    btn.type = 'button';
    btn.textContent = zh ? '复制' : 'Copy';
    btn.addEventListener('click', () => {
      const text = codeEl ? codeEl.innerText : block.innerText;
      navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('is-copied');
        btn.textContent = zh ? '已复制' : 'Copied';
        setTimeout(() => {
          btn.classList.remove('is-copied');
          btn.textContent = zh ? '复制' : 'Copy';
        }, 1600);
      });
    });
    wrap.appendChild(btn);

    const syncScroll = () => {
      const overflowing = block.scrollWidth - block.clientWidth > 4;
      wrap.classList.toggle('is-scrollable', overflowing);
      wrap.classList.toggle(
        'is-at-end',
        overflowing && block.scrollLeft + block.clientWidth >= block.scrollWidth - 4
      );
    };
    syncScroll();
    block.addEventListener('scroll', syncScroll, { passive: true });
    window.addEventListener('resize', syncScroll, { passive: true });
  });

  /* Native modal dialog handles focus containment and Escape. */
  const zoomables = Array.from(article.querySelectorAll('.scholar-body__content img'))
    .filter(img => !img.closest('a, button'));
  if (zoomables.length && typeof HTMLDialogElement !== 'undefined') {
    const dialog = document.createElement('dialog');
    dialog.className = 'scholar-lightbox';
    dialog.setAttribute('aria-label', zh ? '图片预览' : 'Image preview');
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'scholar-lightbox__close';
    close.setAttribute('aria-label', zh ? '关闭图片' : 'Close image');
    close.textContent = '×';
    const full = document.createElement('img');
    const caption = document.createElement('p');
    caption.className = 'scholar-lightbox__caption';
    caption.id = 'image-preview-caption';
    dialog.append(close, full, caption);
    document.body.appendChild(dialog);
    let trigger = null;
    let previousOverflow = '';
    zoomables.forEach(img => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'scholar-image-trigger';
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-label', (zh ? '放大图片：' : 'Enlarge image: ') + (img.alt || (zh ? '文章配图' : 'Article image')));
      const figureCaption = img.closest('figure')?.querySelector('figcaption');
      const sibling = img.nextElementSibling;
      const captionText = figureCaption?.textContent.trim() ||
        (sibling && /^(P|EM|FIGCAPTION)$/.test(sibling.tagName) ? sibling.textContent.trim() : img.alt);
      // Preserve legacy authored widths when adding the button wrapper.
      const width = img.getAttribute('width');
      if (width?.endsWith('%')) {
        button.style.width = width;
        img.removeAttribute('width');
      }
      img.parentNode.insertBefore(button, img);
      button.appendChild(img);
      button.addEventListener('click', () => {
        trigger = button;
        full.src = img.dataset.fullSrc || img.currentSrc || img.src;
        full.alt = img.alt || '';
        caption.textContent = captionText || '';
        caption.hidden = !captionText;
        if (captionText) dialog.setAttribute('aria-describedby', caption.id);
        else dialog.removeAttribute('aria-describedby');
        previousOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        dialog.showModal();
        close.focus();
      });
    });
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', event => {
      // There is one control in the preview; keep Tab and Shift+Tab on it.
      if (event.key === 'Tab') {
        event.preventDefault();
        close.focus();
      }
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) dialog.close();
    });
    dialog.addEventListener('close', () => {
      document.documentElement.style.overflow = previousOverflow;
      trigger?.focus({ preventScroll: true });
      full.removeAttribute('src');
    });
  }

  /* ── Heading anchor links ── */
  const headings = document.querySelectorAll('.scholar-body__content h2[id], .scholar-body__content h3[id]');
  headings.forEach(h => {
    if (h.querySelector('.heading-anchor')) return;
    const a = document.createElement('a');
    a.className = 'heading-anchor';
    a.href = '#' + h.id;
    a.textContent = '#';
    a.title = zh ? '链接到此章节' : 'Link to this section';
    h.prepend(a);
  });
})();
