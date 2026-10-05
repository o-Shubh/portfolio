'use strict';
(() => {
  const root = document.documentElement, reduced = matchMedia('(prefers-reduced-motion: reduce)'), system = matchMedia('(prefers-color-scheme: light)');
  const toggle = document.querySelector('.theme-toggle');
  let config, saved;
  try { saved = localStorage.getItem('portfolio-theme'); } catch (_) {}
  function syncTheme() {
    const light = root.dataset.theme === 'light';
    toggle.setAttribute('aria-label', light ? (config?.ui.switchDark || 'Switch to dark theme') : (config?.ui.switchLight || 'Switch to light theme'));
    toggle.setAttribute('aria-pressed', String(light));
    document.querySelector('meta[name="theme-color"]').content = light ? '#f5f6ef' : '#101311';
  }
  toggle.hidden = false; syncTheme();
  toggle.addEventListener('click', () => {
    saved = root.dataset.theme === 'light' ? 'dark' : 'light'; root.dataset.theme = saved;
    try { localStorage.setItem('portfolio-theme', saved); } catch (_) {} syncTheme();
  });
  system.addEventListener('change', () => {
    if (saved !== 'light' && saved !== 'dark') { root.dataset.theme = system.matches ? 'light' : 'dark'; syncTheme(); }
  });
  let opener;
  document.querySelectorAll('[data-dialog]').forEach(button => button.addEventListener('click', () => {
    opener = button; document.getElementById(button.dataset.dialog).showModal(); document.body.classList.add('modal-open');
  }));
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); opener?.focus(); });
  });
  const topButton = document.querySelector('.back-top'), progress = document.querySelector('.scroll-progress'), nav = [...document.querySelectorAll('.navlinks a')];
  let scheduled = false;
  function scrollState() {
    scheduled = false;
    const max = root.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`; topButton.hidden = scrollY < 700;
    let current = nav[0], closest = -Infinity;
    nav.forEach(a => { const y = document.querySelector(a.hash)?.getBoundingClientRect().top; if (y <= 180 && y > closest) { current = a; closest = y; } });
    nav.forEach(a => a === current ? a.setAttribute('aria-current', 'location') : a.removeAttribute('aria-current'));
  }
  addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(scrollState); } }, { passive: true });
  addEventListener('resize', scrollState); scrollState();
  topButton.addEventListener('click', () => { scrollTo({ top: 0, behavior: reduced.matches ? 'instant' : 'smooth' }); document.querySelector('.brand').focus({ preventScroll: true }); });
  if ('IntersectionObserver' in window && !reduced.matches) {
    const reveal = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('revealed'); reveal.unobserve(entry.target); } }), { threshold: .06 });
    document.querySelectorAll('.section-header,.skill-card,.project,.experience,.book-copy,.education>div,.learning-note,.empty-state').forEach((el, i) => { el.style.setProperty('--delay', `${(i % 3) * 70}ms`); el.classList.add('reveal'); reveal.observe(el); });
    const counters = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      counters.unobserve(entry.target);
      const el = entry.target, value = Number(el.dataset.count), start = performance.now();
      function frame(now) {
        const t = Math.min(1, (now - start) / 1000);
        el.textContent = Math.round(value * (1 - Math.pow(1 - t, 3))).toLocaleString() + el.dataset.suffix;
        if (t < 1 && !reduced.matches) requestAnimationFrame(frame); else el.textContent = value.toLocaleString() + el.dataset.suffix;
      }
      requestAnimationFrame(frame);
    }), { threshold: .5 });
    document.querySelectorAll('[data-count]:not([data-count=""])').forEach(el => counters.observe(el));
  }
  const slides = [...document.querySelectorAll('.quote')]; let slide = 0;
  document.querySelectorAll('[data-carousel]').forEach(button => button.addEventListener('click', () => {
    slide = (slide + Number(button.dataset.carousel) + slides.length) % slides.length;
    slides.forEach((el, i) => el.hidden = i !== slide); document.getElementById('slide-status').textContent = `${slide + 1} / ${slides.length}`;
  }));
  document.querySelectorAll('.video-load').forEach(button => button.addEventListener('click', () => {
    const frame = button.closest('[data-video]'); if (!/^[\w-]{11}$/.test(frame.dataset.video)) return;
    const iframe = document.createElement('iframe'); iframe.src = `https://www.youtube-nocookie.com/embed/${frame.dataset.video}?autoplay=1`;
    iframe.title = frame.closest('article').querySelector('h3').textContent; iframe.loading = 'lazy'; iframe.allow = 'autoplay; encrypted-media; picture-in-picture'; iframe.allowFullscreen = true;
    frame.replaceChildren(iframe); iframe.focus();
  }));
  const form = document.getElementById('contact-form');
  form.querySelector('button').disabled = true;
  fetch('content.json').then(response => { if (!response.ok) throw new Error('Content unavailable'); return response.json(); }).then(data => {
    config = data; syncTheme(); const u = config.ui, typing = document.querySelector('.role-typing');
    let role = 0, length = 0, deleting = false, timer;
    function tick() {
      if (reduced.matches) { typing.textContent = config.roles[0] || ''; return; }
      const text = config.roles[role] || ''; length += deleting ? -1 : 1; typing.textContent = text.slice(0, length);
      let delay = deleting ? 35 : 65;
      if (length >= text.length && !deleting) { deleting = true; delay = 2100; }
      else if (length <= 0 && deleting) { deleting = false; role = (role + 1) % config.roles.length; delay = 350; }
      timer = setTimeout(tick, delay);
    }
    if (config.roles.length) tick();
    reduced.addEventListener('change', () => { clearTimeout(timer); length = 0; deleting = false; if (config.roles.length) tick(); });
    const submit = form.querySelector('button'), status = document.getElementById('form-status'); submit.disabled = false;
    if (config.formEndpoint) { submit.textContent = u.sendEndpoint; document.getElementById('form-note').textContent = u.endpointNote; }
    form.addEventListener('submit', async event => {
      event.preventDefault(); const fields = ['name', 'email', 'message']; let firstInvalid;
      fields.forEach(key => {
        const input = form.elements[key], valid = input.value.trim().length > 0 && input.checkValidity() && (key !== 'message' || input.value.trim().length >= 10);
        input.setAttribute('aria-invalid', String(!valid)); document.getElementById(`${key}-error`).textContent = valid ? '' : u[`${key}Error`];
        if (!valid && !firstInvalid) firstInvalid = input;
      });
      if (firstInvalid) { status.textContent = u.invalidForm; firstInvalid.focus(); return; }
      const values = Object.fromEntries(fields.map(key => [key, form.elements[key].value.trim()]));
      if (!config.formEndpoint) {
        location.href = `mailto:${config.email}?subject=${encodeURIComponent(`${u.subject} ${values.name}`)}&body=${encodeURIComponent(`${values.message}\n\n${values.name}\n${values.email}`)}`;
        status.textContent = u.draftOpened; return;
      }
      submit.disabled = true; status.textContent = u.sending;
      try {
        const response = await fetch(config.formEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(values), signal: AbortSignal.timeout(15000) });
        if (!response.ok) throw new Error('Contact service error'); status.textContent = u.sent; form.reset();
      } catch (_) { status.textContent = u.sendError; } finally { submit.disabled = false; }
    });
  }).catch(() => { document.getElementById('form-status').textContent = 'Please use the email link to get in touch.'; });
})();
