/* Global Theme and Hover Zoom Script for Sharkim Traders */
(function(){
  const STORAGE_KEY = 'sharkim:theme';
  const root = document.documentElement;

  // Inject global styles (theme + toggle + hover zoom)
  const style = document.createElement('style');
  style.setAttribute('data-sharkim-theme', '');
  style.textContent = `
    :root {
      --bg: #f3f4f6;           /* light background */
      --card: #ffffff;         /* light card */
      --text: #111827;         /* light text */
      --muted: #6b7280;        /* muted text */
      --border: #e5e7eb;       /* light border */
      --overlay: rgba(0,0,0,0.3);
    }
    html.dark {
      --bg: #0f172a;           /* slate-900 */
      --card: #0b1222;         /* slightly lighter than bg */
      --text: #e5e7eb;         /* slate-200 */
      --muted: #9ca3af;        /* slate-400 */
      --border: #1f2937;       /* slate-800 */
      --overlay: rgba(0,0,0,0.5);
    }

    /* Base overrides */
    html, body { background: var(--bg) !important; color: var(--text) !important; }
    /* Common containers/cards */
    .bg-white { background-color: var(--card) !important; }
    .bg-gray-50, .bg-gray-100 { background-color: var(--bg) !important; }

    /* Text colors normalization */
    .text-black, .text-gray-900, .text-gray-800, .text-gray-700, .text-gray-600, .text-gray-500 { color: var(--text) !important; }
    p, h1, h2, h3, h4, h5, h6, label, span, li, dt, dd { color: var(--text) !important; }
    small, .muted, .text-muted, .text-sm, .text-xs { color: var(--muted) !important; }

    /* Borders and form controls */
    .border, .border-gray-200, .border-gray-300 { border-color: var(--border) !important; }
    input, select, textarea { background-color: var(--card) !important; color: var(--text) !important; border-color: var(--border) !important; }
    input::placeholder, textarea::placeholder { color: var(--muted) !important; }

    /* Modal overlays or translucent backgrounds */
    .backdrop-blur-sm { background-color: var(--overlay) !important; }

    /* Links */
    a { color: inherit; }

    /* Image hover zoom (applied via class) */
    img.hover-zoom { transition: transform .35s ease, filter .35s ease; transform-origin: center center; }
    img.hover-zoom:hover { transform: scale(1.06); }

    /* Advanced follow-cursor zoom + search cursor */
    .zoom-container { position: relative; overflow: hidden; }
    .zoom-container img { display: block; }
    .zoom-container .zoom-lens { position: absolute; pointer-events: none; width: 120px; height: 120px; border-radius: 9999px; border: 2px solid rgba(255,255,255,.9); box-shadow: 0 2px 8px rgba(0,0,0,.35); background-repeat: no-repeat; background-size: 200% 200%; opacity: 0; transition: opacity .2s ease; }
    .zoom-container.zoom-active .zoom-lens { opacity: 1; }
    .zoom-search-cursor { cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>') 4 4, zoom-in; }

    /* Bottom-left circular bulb theme toggle */
    .shk-theme-toggle { position: fixed; z-index: 1000; left: 16px; bottom: 16px; width: 48px; height: 48px; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(0,0,0,.15); user-select: none; cursor: pointer; transition: transform .15s ease; }
    .shk-theme-toggle:hover { transform: scale(1.05); }
    .shk-theme-toggle.light { background: #fef08a; color: #78350f; border: 1px solid rgba(0,0,0,.08); }
    .shk-theme-toggle.dark { background: #111827; color: #fef08a; border: 1px solid rgba(255,255,255,.1); }
    .shk-theme-toggle__icon { width: 24px; height: 24px; display: inline-block; }
    /* hide old internals if present */
    .shk-theme-toggle__labels, .shk-theme-toggle__thumb { display: none !important; }
  `;
  document.head.appendChild(style);

  // Build the toggle element (bottom-left bulb)
  function buildToggle(){
    const toggle = document.createElement('button');
    toggle.className = 'shk-theme-toggle';
    toggle.setAttribute('type', 'button');
    toggle.setAttribute('aria-label', 'Toggle color mode');
    toggle.setAttribute('title', 'Toggle theme');

    const icon = document.createElementNS('http://www.w3.org/2000/svg','svg');
    icon.setAttribute('viewBox','0 0 24 24');
    icon.setAttribute('fill','currentColor');
    icon.classList.add('shk-theme-toggle__icon');
    // Bulb path
    icon.innerHTML = '<path d="M9 21h6a1 1 0 001-1v-1H8v1a1 1 0 001 1zm3-19a7 7 0 00-4.95 11.95c.64.63 1.37 1.71 1.68 2.55.17.47.61.8 1.11.8h4.32c.5 0 .94-.33 1.11-.8.31-.84 1.04-1.92 1.68-2.55A7 7 0 0012 2z"/>'; 

    toggle.appendChild(icon);

    toggle.addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
    toggle.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
      }
    });

    return toggle;
  }

  function currentTheme(){
    return root.classList.contains('dark') ? 'dark' : 'light';
  }

  function setTheme(t){
    if (t === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    try { localStorage.setItem(STORAGE_KEY, t); } catch {}
    updateToggleUI(t);
  }

  function updateToggleUI(t){
    const el = document.querySelector('.shk-theme-toggle');
    if (!el) return;
    el.classList.toggle('dark', t === 'dark');
    el.classList.toggle('light', t !== 'dark');
    el.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
  }

  function initTheme(){
    let preferred = 'light'; // Light mode is the primary default
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') preferred = saved;
      // Do not auto-switch to dark unless the user previously chose it.
    } catch {}
    setTheme(preferred);
  }

  function enableHoverZoom(){
    // Apply zoom to all meaningful images, excluding logos/icons and hero/banner.
    const imgs = Array.from(document.querySelectorAll('img'));
    imgs.forEach(img => {
      // Exclusions: logos/icons/hero/banner or explicitly opted-out
      const src = (img.getAttribute('src')||'').toLowerCase();
      const alt = (img.getAttribute('alt')||'').toLowerCase();
      const cls = img.className || '';
      const isExplicitNo = img.hasAttribute('data-no-zoom') || /\bno-zoom\b/.test(cls);
      const isLogoLike = /logo|icon|mpesa|payment|favicon/.test(src) || /logo|icon/.test(alt) || /\bbrand\b|\blogo\b|\bicon\b/.test(cls);
      const inHeaderFooter = false; // do not blanket-exclude header/footer
      const heroBanner = document.querySelector('.md\\:col-span-9 img');
      const isHeroBanner = heroBanner && img === heroBanner;

      // Skip tiny icons
      const rect = img.getBoundingClientRect();
      const wAttr = Number(img.getAttribute('width')||0);
      const hAttr = Number(img.getAttribute('height')||0);
      const isTiny = (rect.width && rect.width <= 32) || (rect.height && rect.height <= 32) || wAttr <= 32 || hAttr <= 32;

      if (isExplicitNo || isLogoLike || inHeaderFooter || isHeroBanner || isTiny) return;

      // Add hover-zoom
      img.classList.add('hover-zoom');

      // Wrap in a zoom container once
      if (!img.closest('.zoom-container')){
        const wrap = document.createElement('span');
        wrap.className = 'zoom-container zoom-search-cursor';
        img.parentNode.insertBefore(wrap, img);
        wrap.appendChild(img);
        const lens = document.createElement('span');
        lens.className = 'zoom-lens';
        wrap.appendChild(lens);

        let naturalW = 0, naturalH = 0;
        function computeNatural(){
          if (img.naturalWidth && img.naturalHeight){ naturalW = img.naturalWidth; naturalH = img.naturalHeight; return; }
          const tmp = new Image(); tmp.src = img.src; tmp.onload = () => { naturalW = tmp.naturalWidth; naturalH = tmp.naturalHeight; };
        }
        computeNatural();
        img.addEventListener('load', computeNatural);

        function onMove(e){
          const r = wrap.getBoundingClientRect();
          const x = (e.touches? e.touches[0].clientX : e.clientX) - r.left;
          const y = (e.touches? e.touches[0].clientY : e.clientY) - r.top;
          const px = Math.max(0, Math.min(1, x / r.width));
          const py = Math.max(0, Math.min(1, y / r.height));

          lens.style.left = (x - lens.offsetWidth/2) + 'px';
          lens.style.top  = (y - lens.offsetHeight/2) + 'px';

          // Background image and position
          const bgX = px * 100;
          const bgY = py * 100;
          lens.style.backgroundImage = `url(${img.src})`;
          lens.style.backgroundPosition = `${bgX}% ${bgY}%`;
        }
        function onEnter(){ wrap.classList.add('zoom-active'); }
        function onLeave(){ wrap.classList.remove('zoom-active'); }

        wrap.addEventListener('mousemove', onMove);
        wrap.addEventListener('mouseenter', onEnter);
        wrap.addEventListener('mouseleave', onLeave);
        // Touch support
        wrap.addEventListener('touchmove', onMove, { passive: true });
        wrap.addEventListener('touchstart', onEnter, { passive: true });
        wrap.addEventListener('touchend', onLeave);
      }
    });
  }

  // Initialize on DOM ready
  function ready(fn){ if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }

  // Expose re-init globally so pages can call after dynamic renders
  window.initHoverZoom = function(){
    try { enableHoverZoom(); } catch {}
  };

  ready(() => {
    // Apply theme
    initTheme();

    // Inject toggle
    const existing = document.querySelector('.shk-theme-toggle');
    if (!existing) document.body.appendChild(buildToggle());
    updateToggleUI(currentTheme());

    // Initial pass
    enableHoverZoom();

    // React to OS theme changes if user hasn't explicitly chosen
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved && window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        mq.addEventListener ? mq.addEventListener('change', e => setTheme(e.matches ? 'dark' : 'light')) : mq.addListener && mq.addListener(e => setTheme(e.matches ? 'dark' : 'light'));
      }
    } catch {}
  });
})();
