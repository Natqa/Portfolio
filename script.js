// Fade sections in as they scroll into view
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// Copy e-mail to clipboard
document.querySelectorAll('[data-copy]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const label = btn.querySelector('span');
    const original = label.textContent;
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      label.textContent = 'Copied!';
    } catch {
      label.textContent = btn.dataset.copy;
    }
    setTimeout(() => (label.textContent = original), 1800);
  });
});

// Hero background logo: draw-in on load, then a cursor-following spotlight + slight parallax
(() => {
  const hero = document.querySelector('.hero');
  const svg = document.querySelector('.hero__logo');
  const line = document.querySelector('.hero__logo-line');
  const grad = document.getElementById('logo-spot-grad');
  if (!hero || !svg || !line || !grad) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const lerp = (a, b, t) => a + (b - a) * t;
  const DRAW_MS = 1600;
  const start = performance.now();

  const spot = { x: 20, y: 40, tx: 20, ty: 40 };
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  let pointerActive = false;

  hero.addEventListener('pointermove', (e) => {
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
    spot.tx = p.x; spot.ty = p.y;
    const r = hero.getBoundingClientRect();
    tilt.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    tilt.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    pointerActive = true;
  });
  hero.addEventListener('pointerleave', () => { pointerActive = false; tilt.tx = tilt.ty = 0; });

  if (reduced) { line.style.strokeDashoffset = '0'; return; }

  function frame(now) {
    const drawn = ease(Math.min(1, (now - start) / DRAW_MS));
    line.style.strokeDashoffset = ((1 - drawn) * 1.03).toFixed(4);

    if (!pointerActive) {
      const t = now / 1000;
      spot.tx = 62 + Math.sin(t * 0.45) * 50;
      spot.ty = 40 + Math.sin(t * 0.9) * 22;
    }
    spot.x = lerp(spot.x, spot.tx, 0.08);
    spot.y = lerp(spot.y, spot.ty, 0.08);
    grad.setAttribute('cx', spot.x.toFixed(2));
    grad.setAttribute('cy', spot.y.toFixed(2));

    tilt.x = lerp(tilt.x, tilt.tx, 0.06);
    tilt.y = lerp(tilt.y, tilt.ty, 0.06);
    svg.style.transform = `translate3d(${(tilt.x * 18).toFixed(1)}px, ${(tilt.y * 14).toFixed(1)}px, 0)`;

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();

// Contact logo: draws itself in (like the hero logo) once the card is well in view
(() => {
  const logo = document.querySelector('.contact__logo');
  if (!logo) return;
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    logo.classList.add('is-drawn');
    io.disconnect();
  }, { threshold: 0.6 });
  io.observe(logo);
})();

// Contact clock: "Sun, Nov 15, 11:05:31 PM" in Gdańsk, ticking every second
(() => {
  const el = document.querySelector('[data-clock-live]');
  if (!el) return;
  const timeZone = el.dataset.clockLive;
  const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const day = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short', month: 'short', day: 'numeric' });
  const tick = () => {
    const now = new Date();
    el.textContent = `${day.format(now)}, ${time.format(now)}`;
    el.dateTime = now.toISOString();
    setTimeout(tick, 1000 - (now % 1000) + 20);
  };
  tick();
})();

// Nav: stretched across the hero at the top of the home page, compact pill once scrolled
(() => {
  const nav = document.querySelector('.nav');
  const hero = document.querySelector('.hero');
  if (!nav) return;

  // Measure the compact pill so width can transition between two fixed values
  function measure() {
    const wide = nav.classList.contains('is-wide');
    nav.classList.add('nav--measure');
    nav.classList.remove('is-wide');
    nav.style.width = 'auto';
    const w = nav.getBoundingClientRect().width;
    nav.style.width = '';
    nav.style.setProperty('--nav-compact-w', w + 'px');

    // Show the greeting in the wide state only if it fits next to the links
    const name = nav.querySelector('.nav__name');
    if (name) {
      nav.classList.remove('nav--no-greeting');
      nav.classList.add('is-wide');
      const wideW = nav.getBoundingClientRect().width;
      const need = w + name.scrollWidth + 24;
      nav.classList.toggle('nav--no-greeting', need > wideW);
      nav.classList.remove('is-wide');
    }
    if (wide) nav.classList.add('is-wide');
    nav.getBoundingClientRect(); // flush before re-enabling transitions
    nav.classList.remove('nav--measure');
  }

  if (!hero) { nav.classList.remove('is-wide'); return; }

  let ticking = false;
  const update = () => {
    nav.classList.toggle('is-wide', window.scrollY < 40);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', measure);
  document.fonts.ready.then(measure);
  measure();
  update();
})();

// Custom cursor: a small dot that replaces the pointer on every page (mouse only); over a project tile it grows into a "View" badge
(() => {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const cursor = document.createElement('div');
  cursor.className = 'cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.innerHTML = '<span>View</span>';
  document.body.append(cursor);
  document.documentElement.classList.add('has-cursor');

  let x = 0, y = 0, raf = 0;
  const place = () => {
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    const el = document.elementFromPoint(x, y);
    cursor.classList.toggle('on-dark', !!el?.closest('.section--navy, .nav.is-wide, .nav__cta, .btn--dark')
      && !el.closest('.btn--light'));
    cursor.classList.toggle('is-view', !!el?.closest('.tile') && !el.closest('.is-dragging'));
    raf = 0;
  };
  document.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    x = e.clientX; y = e.clientY;
    cursor.classList.add('is-on');
    if (!raf) raf = requestAnimationFrame(place);
  });
  // content can move under a still pointer (carousel, page scroll), so re-check what is under it
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(place); }, { passive: true, capture: true });
  document.documentElement.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));
  document.addEventListener('pointerdown', () => cursor.classList.add('is-down'));
  document.addEventListener('pointerup', () => cursor.classList.remove('is-down'));
})();

// Work carousel: arrow keys move by one tile, a mouse can drag the row, touch and trackpads
// scroll it natively. The dots below are the row's stops (where it can come to rest); the current
// one is drawn as a pill and each dot scrolls to its stop.
(() => {
  const row = document.querySelector('.projects');
  const status = document.querySelector('.carousel__status');
  if (!row || !status) return;
  const tiles = [...row.children];
  const dotsBox = status.querySelector('.carousel__dots');
  const calm = matchMedia('(prefers-reduced-motion: reduce)');

  const step = () => tiles.length > 1 ? tiles[1].offsetLeft - tiles[0].offsetLeft : row.clientWidth;
  const go = (dir) => moveTo(row.scrollLeft + dir * step());
  // dots and keys: while the row is pinned they scroll the page to the matching point instead
  const moveTo = (left) => {
    left = Math.max(0, Math.min(left, row.scrollWidth - row.clientWidth));
    const behavior = calm.matches ? 'auto' : 'smooth';
    if (pin.on) scrollTo({ top: pin.start + left, behavior });
    else row.scrollTo({ left, behavior });
  };

  // Scroll-driven row (as on davemiye.com): #work gets extra height equal to how far the row can
  // move, its content sticks in the middle of the screen, and the page's scroll position inside that
  // stretch sets the row's position, eased so it glides. Manual sideways moves (drag, trackpad, swipe)
  // move the page along with them, so both stay in step. Off with reduced motion.
  const section = row.closest('#work');
  const sticky = section && section.querySelector('.work-sticky');
  const pin = { on: false, start: 0, travel: 0, cur: 0, set: -1, raf: 0 };
  const layout = () => {
    if (!sticky) return;
    section.classList.remove('is-pinned');
    pin.travel = Math.max(0, Math.round(row.scrollWidth - row.clientWidth));
    pin.on = !calm.matches && pin.travel > 2;
    if (!pin.on) return;
    section.classList.add('is-pinned');
    section.style.setProperty('--travel', `${pin.travel}px`);
    const top = Math.max(80, (innerHeight - sticky.offsetHeight) / 2);
    section.style.setProperty('--stick', `${top}px`);
    // offsetTop ignores the card-deck transform, so this is the page position where the content sticks
    pin.start = section.offsetTop + parseFloat(getComputedStyle(section).paddingTop) - top;
    pin.cur = row.scrollLeft;
    drive();
  };
  const glide = () => {
    pin.raf = 0;
    const target = Math.max(0, Math.min(pin.travel, scrollY - pin.start));
    const d = target - pin.cur;
    pin.cur = Math.abs(d) < 0.5 ? target : pin.cur + d * 0.14;
    row.scrollLeft = pin.set = pin.cur;
    pin.set = row.scrollLeft;
    if (pin.cur !== target) pin.raf = requestAnimationFrame(glide);
  };
  const drive = () => { if (pin.on && !pin.raf) pin.raf = requestAnimationFrame(glide); };
  addEventListener('scroll', drive, { passive: true });
  // a sideways move that didn't come from glide(): bring the page to the same point
  row.addEventListener('scroll', () => {
    if (!pin.on || Math.abs(row.scrollLeft - pin.set) < 2) return;
    cancelAnimationFrame(pin.raf); pin.raf = 0;
    pin.cur = pin.set = row.scrollLeft;
    scrollTo({ top: pin.start + row.scrollLeft, behavior: 'instant' });
  }, { passive: true });

  // stops: each tile's start, capped at the end of the row (several tiles can share the last one)
  let stops = [], dots = [];
  const build = () => {
    const max = row.scrollWidth - row.clientWidth;
    const next = [...new Set(tiles.map((t) => Math.round(Math.min(t.offsetLeft - tiles[0].offsetLeft, max))))];
    if (next.join() === stops.join()) return;
    stops = next;
    dotsBox.replaceChildren(...stops.map((left, n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'carousel__dot';
      b.setAttribute('aria-label', `Show projects, position ${n + 1} of ${stops.length}`);
      b.addEventListener('click', () => moveTo(left));
      return b;
    }));
    dots = [...dotsBox.children];
  };
  const update = () => {
    const fits = row.scrollWidth - row.clientWidth <= 2;
    status.hidden = fits;
    if (fits) return;
    build();
    let cur = 0;
    stops.forEach((left, n) => { if (Math.abs(left - row.scrollLeft) < Math.abs(stops[cur] - row.scrollLeft)) cur = n; });
    dots.forEach((d, n) => { if (n === cur) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current'); });
  };

  row.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); go(e.key === 'ArrowRight' ? 1 : -1); }
  });

  // Mouse drag; a drag longer than a few pixels doesn't open the tile it started on
  let down = null, moved = false;
  row.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = { x: e.clientX, left: row.scrollLeft }; moved = false;
  });
  addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (!moved && Math.abs(dx) > 6) { moved = true; row.classList.add('is-dragging'); }
    if (moved) row.scrollLeft = down.left - dx;
  });
  addEventListener('pointerup', () => {
    if (!down) return;
    down = null;
    if (!moved) return;
    // let the snap pick the nearest tile, smoothly
    const left = row.scrollLeft;
    row.classList.remove('is-dragging');
    const snapped = row.scrollLeft;
    row.scrollLeft = left;
    row.scrollTo({ left: snapped, behavior: calm.matches ? 'auto' : 'smooth' });
  });
  row.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);

  let ticking = false;
  row.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } }, { passive: true });
  addEventListener('resize', () => { layout(); update(); });
  addEventListener('load', () => { layout(); update(); });
  calm.addEventListener('change', layout);
  layout();
  update();
})();

// Nav: marks the link of the section that is on screen (Work, About)
(() => {
  const links = [...document.querySelectorAll('.nav__link[href^="#"]')].filter((a) => a.getAttribute('href').length > 1)
    .map((a) => [a, document.querySelector(a.getAttribute('href'))]).filter(([, s]) => s);
  if (!links.length) return;
  const update = () => {
    const y = innerHeight * 0.4;
    let current = null;
    links.forEach(([a, s]) => { const r = s.getBoundingClientRect(); if (r.top <= y && r.bottom > y) current = a; });
    links.forEach(([a]) => {
      a.classList.toggle('is-current', a === current);
      if (a === current) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  };
  addEventListener('scroll', update, { passive: true });
  update();
})();

// Card deck scroll: earlier cards sit on top; each next one starts pulled up under the previous card's
// bottom edge, slightly smaller and darker, then slides down out from behind it and grows to full size,
// ending in its normal place with the usual gap.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cards = [...document.querySelectorAll('body > .section')];
  if (cards.length < 2) return;
  document.body.classList.add('deck');
  cards.forEach((card, i) => { card.style.zIndex = cards.length - i; });
  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = innerHeight;
    // how far a card is tucked under the previous one at the start (its gap + the overlap)
    const tuck = innerWidth <= 600 ? 8 + 40 : 12 + 64;
    cards.forEach((card, i) => {
      if (i === 0) return;
      // 0 while the card's top is at the bottom of the screen, 1 once it has risen 75% of the way up
      const p = Math.min(1, Math.max(0, (vh - card.getBoundingClientRect().top) / (vh * 0.75)));
      const e = 1 - Math.pow(1 - p, 2);
      card.style.transform = e < 1 ? `translateY(${(-tuck * (1 - e)).toFixed(1)}px) scale(${(0.92 + 0.08 * e).toFixed(4)})` : '';
      card.style.setProperty('--shade', (0.22 * (1 - e)).toFixed(3));
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', update);
  update();
})();
