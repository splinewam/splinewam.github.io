(() => {
  'use strict';
  const dialog = document.querySelector('#figure-dialog');
  const dialogImage = document.querySelector('#dialog-image');
  const caption = document.querySelector('#figure-caption');
  let lastFigure;

  document.querySelectorAll('[data-figure]').forEach(button => {
    button.addEventListener('click', () => {
      lastFigure = button;
      dialogImage.src = button.dataset.figure;
      dialogImage.alt = button.querySelector('img').alt;
      caption.textContent = button.dataset.caption;
      dialog.showModal();
    });
  });
  document.querySelector('#close-figure').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => lastFigure?.focus({ preventScroll: true }));

  document.querySelectorAll('video').forEach(video => {
    const label = video.closest('figure').querySelector('[data-playback-rate]');
    const updateRate = () => {
      if (label) label.textContent = `${video.playbackRate}× playback`;
    };
    video.addEventListener('ratechange', updateRate);
    updateRate();
  });
  const bookshelfSpeed = document.querySelector('#bookshelf-speed');
  const setBookshelfSpeed = () => {
    document.querySelectorAll('video[data-bookshelf]').forEach(video => {
      video.defaultPlaybackRate = Number(bookshelfSpeed.value);
      video.playbackRate = Number(bookshelfSpeed.value);
    });
  };
  bookshelfSpeed.addEventListener('change', setBookshelfSpeed);
  setBookshelfSpeed();

  if ('IntersectionObserver' in window) {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const connection = navigator.connection;
    const states = new Map();
    const pauseAutomatically = (video, state) => {
      if (video.paused) return;
      state.automaticPause = true;
      video.pause();
    };
    const canAutoplay = state => state.visible && !state.manuallyPaused &&
      !document.hidden && !reducedMotion.matches && !connection?.saveData;
    const synchronize = (video, state) => {
      if (!canAutoplay(state)) {
        pauseAutomatically(video, state);
        return;
      }
      if (!video.paused || state.pendingPlay) return;
      state.pendingPlay = true;
      video.muted = true;
      video.play().then(() => {
        if (!canAutoplay(state)) pauseAutomatically(video, state);
      }).catch(() => {
        // Native controls remain available when the browser blocks autoplay.
      }).finally(() => { state.pendingPlay = false; });
    };
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const state = states.get(entry.target);
        state.visible = entry.isIntersecting && entry.intersectionRatio >= 0.5;
        synchronize(entry.target, state);
      });
    }, { threshold: [0, 0.5] });
    document.querySelectorAll('video[data-autoplay]').forEach(video => {
      const state = { visible: false, manuallyPaused: false, automaticPause: false, pendingPlay: false };
      states.set(video, state);
      video.addEventListener('pause', () => {
        if (state.automaticPause) state.automaticPause = false;
        else state.manuallyPaused = true;
      });
      video.addEventListener('play', () => { state.manuallyPaused = false; });
      observer.observe(video);
    });
    const synchronizeAll = () => states.forEach((state, video) => synchronize(video, state));
    document.addEventListener('visibilitychange', synchronizeAll);
    reducedMotion.addEventListener('change', synchronizeAll);
    connection?.addEventListener('change', synchronizeAll);
  }

  const copyButton = document.querySelector('#copy-citation');
  const copyStatus = document.querySelector('#copy-status');
  copyButton.addEventListener('click', async () => {
    const citation = document.querySelector('#bibtex');
    try {
      if (!navigator.clipboard || !window.isSecureContext) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(citation.textContent.trim());
      copyButton.querySelector('span').textContent = 'Copied!';
      copyStatus.textContent = 'BibTeX copied to clipboard.';
    } catch {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(citation);
      selection.removeAllRanges();
      selection.addRange(range);
      copyStatus.textContent = 'Citation selected. Press Ctrl+C or ⌘C to copy.';
    }
  });
})();
