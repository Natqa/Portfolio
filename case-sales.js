// Bulk Lead Creation case page

// Videos (full flow, After shot): plays muted while it is on screen, pauses when it leaves; with reduced motion it
// shows the native controls instead of playing by itself
document.querySelectorAll('.cs-video').forEach((v) => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { v.controls = true; return; }
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) v.play().catch(() => { v.controls = true; });
    else v.pause();
  }, { threshold: 0.2 }).observe(v);
});

// Before and After carousels: the same scroll-driven behaviour as Work on the home page. The block sticks in the
// middle of the screen, scrolling down slides the pain points sideways (eased so it glides), and once
// the last one is in view the page scrolls on. Dots and arrow keys move one pain point at a time.
// If the block is taller than the screen (or with reduced motion) it stays a normal swipeable row.
document.querySelectorAll('.cs-pin').forEach((pinBox) => {
  const sticky = pinBox.querySelector('.cs-sticky');
  const row = pinBox.querySelector('.cs-row');
  const dotsBox = pinBox.querySelector('.cs-dots');
  const section = pinBox.closest('.section');
  const tiles = [...row.children];
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const pin = { on: false, start: 0, travel: 0, cur: 0, set: -1, raf: 0 };

  // page position ignoring transforms (the card-deck effect scales sections while they come in)
  const docTop = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
  const stops = () => {
    const max = row.scrollWidth - row.clientWidth;
    return tiles.map((t) => Math.round(Math.min(t.offsetLeft - tiles[0].offsetLeft, max)));
  };

  const layout = () => {
    cancelAnimationFrame(pin.raf); pin.raf = 0;
    pinBox.classList.remove('is-pinned'); section.classList.remove('is-pinned');
    pin.travel = Math.max(0, Math.round(row.scrollWidth - row.clientWidth));
    const top = Math.max(80, (innerHeight - sticky.offsetHeight) / 2);
    pin.on = !calm.matches && pin.travel > 2 && sticky.offsetHeight + 80 <= innerHeight;
    if (pin.on) {
      pinBox.classList.add('is-pinned'); section.classList.add('is-pinned');
      pinBox.style.setProperty('--travel', `${pin.travel}px`);
      pinBox.style.setProperty('--stick', `${top}px`);
      // measured from the block itself: a stuck sticky element reports its shifted position
      pin.start = docTop(pinBox) - top;
      pin.cur = row.scrollLeft;
      drive();
    }
    update();
  };
  const glide = () => {
    pin.raf = 0;
    const target = Math.max(0, Math.min(pin.travel, scrollY - pin.start));
    const d = target - pin.cur;
    pin.cur = Math.abs(d) < 0.5 ? target : pin.cur + d * 0.14;
    row.scrollLeft = pin.cur;
    pin.set = row.scrollLeft;
    update();
    if (pin.cur !== target) pin.raf = requestAnimationFrame(glide);
  };
  const drive = () => { if (pin.on && !pin.raf) pin.raf = requestAnimationFrame(glide); };
  addEventListener('scroll', drive, { passive: true });
  // a sideways swipe or trackpad move while pinned: bring the page to the same point
  row.addEventListener('scroll', () => {
    update();
    if (!pin.on || Math.abs(row.scrollLeft - pin.set) < 2) return;
    cancelAnimationFrame(pin.raf); pin.raf = 0;
    pin.cur = pin.set = row.scrollLeft;
    scrollTo({ top: pin.start + row.scrollLeft, behavior: 'instant' });
  }, { passive: true });

  const moveTo = (left) => {
    const behavior = calm.matches ? 'auto' : 'smooth';
    if (pin.on) scrollTo({ top: pin.start + left, behavior });
    else row.scrollTo({ left, behavior });
  };
  const dots = tiles.map((t, n) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'carousel__dot';
    b.setAttribute('aria-label', `${pinBox.id === 'after' ? 'Fix' : 'Pain point'} ${n + 1} of ${tiles.length}`);
    b.addEventListener('click', () => moveTo(stops()[n]));
    dotsBox.append(b);
    return b;
  });
  const current = () => {
    const s = stops(); let cur = 0;
    s.forEach((left, n) => { if (Math.abs(left - row.scrollLeft) < Math.abs(s[cur] - row.scrollLeft)) cur = n; });
    return cur;
  };
  function update() {
    const cur = current();
    dots.forEach((d, n) => { if (n === cur) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
  }
  row.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const n = Math.max(0, Math.min(tiles.length - 1, current() + (e.key === 'ArrowRight' ? 1 : -1)));
    moveTo(stops()[n]);
  });

  addEventListener('resize', layout);
  addEventListener('load', layout);
  calm.addEventListener('change', layout);
  tiles.forEach((t) => t.querySelectorAll('img').forEach((im) => { if (!im.complete) im.addEventListener('load', layout, { once: true }); }));
  layout();
});
