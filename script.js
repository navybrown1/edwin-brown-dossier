/* =========================================================================
   EDWIN BROWN // OPERATOR FILE
   Boot sequence, live telemetry, scroll reveals, readiness animations,
   filter chips, counter animations, and a DECLASSIFY easter egg.
   ========================================================================= */

(function () {
  'use strict';

  const root = document.documentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -----------------------------------------------------------------------
     Session ID (random but stable per load)
     ----------------------------------------------------------------------- */
  const sessionIdEl = document.getElementById('sessionId');
  if (sessionIdEl) {
    const sid = 'EB-' + Math.floor(1000 + Math.random() * 9000);
    sessionIdEl.textContent = sid;
  }

  /* -----------------------------------------------------------------------
     Live UTC clock
     ----------------------------------------------------------------------- */
  const clockEl = document.getElementById('liveClock');
  function pad(n) { return String(n).padStart(2, '0'); }
  function tickClock() {
    if (!clockEl) return;
    const d = new Date();
    clockEl.textContent =
      pad(d.getUTCHours()) + ':' +
      pad(d.getUTCMinutes()) + ':' +
      pad(d.getUTCSeconds()) + ' UTC';
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* -----------------------------------------------------------------------
     Boot / access sequence
     ----------------------------------------------------------------------- */
  const bootEl = document.getElementById('boot');
  const bootLogEl = document.getElementById('bootLog');

  const typingAudio = (function () {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    let ctx = null;
    let master = null;
    let armed = false;
    let tailTime = 0;

    function ensure() {
      if (!AudioCtor) return false;
      if (ctx) return true;
      ctx = new AudioCtor();
      master = ctx.createGain();
      master.gain.value = 0.045;
      master.connect(ctx.destination);
      return true;
    }

    function arm() {
      if (armed) return;
      if (!ensure()) return;
      armed = true;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(function () {});
      }
    }

    function ping(intensity) {
      if (!armed || !ctx || !master) return;
      const now = ctx.currentTime;
      const start = Math.max(now, tailTime + 0.008);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'highpass';
      filter.frequency.value = 850;

      osc.type = 'square';
      osc.frequency.setValueAtTime(2450 + Math.random() * 700, start);
      osc.frequency.exponentialRampToValueAtTime(1650 + Math.random() * 260, start + 0.025);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.01, (intensity || 1) * 0.026), start + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(master);

      osc.start(start);
      osc.stop(start + 0.055);
      tailTime = start;
    }

    return {
      arm: arm,
      ping: ping
    };
  })();

  const bootLines = [
    { t: '> ', cls: 'k', text: 'establish_secure_channel', delay: 120 },
    { t: '  ', cls: 'd', text: '... handshake / tls ok', delay: 260 },
    { t: '> ', cls: 'k', text: 'authenticate operator', delay: 140 },
    { t: '  ', cls: 'g', text: '... credentials verified', delay: 240 },
    { t: '> ', cls: 'k', text: 'load_file 2026-EB-001', delay: 140 },
    { t: '  ', cls: 'd', text: '... subject: BROWN, EDWIN', delay: 200 },
    { t: '  ', cls: 'd', text: '... clearance: UNCLASSIFIED // PUBLIC', delay: 200 },
    { t: '> ', cls: 'g', text: 'ACCESS GRANTED', delay: 160 }
  ];

  function typeBoot() {
    if (!bootEl || !bootLogEl) return Promise.resolve();
    if (prefersReducedMotion) {
      bootLogEl.innerHTML = bootLines.map(function (l) {
        return '<span class="' + l.cls + '">' + l.t + l.text + '</span>';
      }).join('\n');
      return new Promise(function (r) { setTimeout(r, 300); });
    }

    return new Promise(function (resolve) {
      let i = 0;
      let currentLineNode = null;
      let charIdx = 0;

      function startLine() {
        if (i >= bootLines.length) {
          // blink cursor briefly then resolve
          const cursor = document.createElement('span');
          cursor.className = 'cursor';
          bootLogEl.appendChild(cursor);
          setTimeout(resolve, 550);
          return;
        }
        const line = bootLines[i];
        const node = document.createElement('span');
        node.className = line.cls;
        if (i > 0) bootLogEl.appendChild(document.createTextNode('\n'));
        bootLogEl.appendChild(node);
        currentLineNode = node;
        charIdx = 0;
        currentLineNode.textContent = line.t;
        typeChars();
      }

      function typeChars() {
        const line = bootLines[i];
        if (charIdx < line.text.length) {
          currentLineNode.textContent += line.text.charAt(charIdx);
          typingAudio.ping(line.text.charAt(charIdx) === ' ' ? 0.55 : 1);
          charIdx++;
          setTimeout(typeChars, 14 + Math.random() * 14);
        } else {
          i++;
          setTimeout(startLine, line.delay);
        }
      }

      startLine();
    });
  }

  function dismissBoot() {
    if (!bootEl) return;
    try { window.sessionStorage.setItem('dossierBootSeen', '1'); } catch (e) {}
    bootEl.classList.add('is-done');
    setTimeout(function () {
      if (bootEl.parentNode) bootEl.parentNode.removeChild(bootEl);
    }, 700);
  }

  // Boot flow
  if (bootEl) {
    const armAudio = function () { typingAudio.arm(); };
    try {
      if (window.sessionStorage.getItem('dossierBootSeen') === '1') {
        dismissBoot();
      }
    } catch (e) {}

    // skip on any click or key during boot
    const skip = function () { dismissBoot(); };
    document.addEventListener('pointerdown', armAudio, { once: true, passive: true });
    document.addEventListener('keydown', armAudio, { once: true });
    bootEl.addEventListener('click', skip, { once: true });
    document.addEventListener('keydown', function once(e) {
      if (bootEl.classList.contains('is-done')) return;
      skip();
      armAudio();
      document.removeEventListener('keydown', once);
    });

    typeBoot().then(function () {
      setTimeout(dismissBoot, 180);
    });
  }

  /* -----------------------------------------------------------------------
     Scroll progress
     ----------------------------------------------------------------------- */
  function updateProgress() {
    const max = document.body.scrollHeight - window.innerHeight;
    const p = max > 0 ? (window.scrollY / max) * 100 : 0;
    root.style.setProperty('--scroll-progress', p + '%');
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  /* -----------------------------------------------------------------------
     Reveal on scroll
     ----------------------------------------------------------------------- */
  const revealItems = document.querySelectorAll('[data-reveal]');
  if ('IntersectionObserver' in window) {
    const revealObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    revealItems.forEach(function (el) { revealObs.observe(el); });
  } else {
    revealItems.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* -----------------------------------------------------------------------
     Active nav highlight
     ----------------------------------------------------------------------- */
  const navLinks = document.querySelectorAll('.nav a');
  const sections = Array.from(document.querySelectorAll('main section[id]'));
  if ('IntersectionObserver' in window && sections.length) {
    const navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        const id = entry.target.getAttribute('id');
        navLinks.forEach(function (l) {
          l.classList.toggle('is-active', l.getAttribute('href') === '#' + id);
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0.01 });
    sections.forEach(function (s) { navObs.observe(s); });
  }

  /* -----------------------------------------------------------------------
     Counters (stats)
     ----------------------------------------------------------------------- */
  const counters = document.querySelectorAll('[data-count]');
  function animateCount(el) {
    const target = parseInt(el.getAttribute('data-count'), 10) || 0;
    if (prefersReducedMotion) { el.textContent = target; return; }
    const duration = 1400;
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if ('IntersectionObserver' in window) {
    const countObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    counters.forEach(function (c) { countObs.observe(c); });
  } else {
    counters.forEach(animateCount);
  }

  /* -----------------------------------------------------------------------
     Readiness bars fill on scroll into view
     ----------------------------------------------------------------------- */
  const bars = document.querySelectorAll('.cap__bar span[data-fill]');
  if ('IntersectionObserver' in window) {
    const barObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          const pct = parseInt(entry.target.getAttribute('data-fill'), 10) || 0;
          entry.target.style.width = pct + '%';
          barObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    bars.forEach(function (b) { barObs.observe(b); });
  } else {
    bars.forEach(function (b) {
      b.style.width = (b.getAttribute('data-fill') || 0) + '%';
    });
  }

  /* -----------------------------------------------------------------------
     Capability filters
     ----------------------------------------------------------------------- */
  const chips = document.querySelectorAll('.chip');
  const caps = document.querySelectorAll('.cap');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      const filter = chip.getAttribute('data-filter');
      chips.forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');
      caps.forEach(function (cap) {
        const cats = (cap.getAttribute('data-category') || '').split(/\s+/);
        const show = filter === 'all' || cats.indexOf(filter) !== -1;
        cap.hidden = !show;
        // re-trigger bar animation for newly-visible caps
        if (show) {
          const barSpan = cap.querySelector('.cap__bar span[data-fill]');
          if (barSpan) {
            const pct = parseInt(barSpan.getAttribute('data-fill'), 10) || 0;
            barSpan.style.width = '0%';
            requestAnimationFrame(function () {
              setTimeout(function () { barSpan.style.width = pct + '%'; }, 60);
            });
          }
        }
      });
    });
  });

  /* -----------------------------------------------------------------------
     Copy summary
     ----------------------------------------------------------------------- */
  const toast = document.querySelector('.toast');
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('is-visible');
    setTimeout(function () { toast.classList.remove('is-visible'); }, 2200);
  }

  const summary =
    'Edwin Brown // Operator File 2026-EB-001. U.S. Army veteran, operations leader, and technical builder. MPA (John Jay, CUNY, distinction). MSIS candidate (Baruch Zicklin, 2026). Public administration, finance, project delivery, data systems, and AI-assisted workflows. Bilingual English / Spanish. Direct communicator. Discipline, curiosity, and execution.';

  document.querySelectorAll('[data-copy-summary]').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(summary);
        showToast('Dossier summary copied');
      } catch (err) {
        showToast('Copy blocked. Select manually.');
      }
    });
  });

  /* -----------------------------------------------------------------------
     Print
     ----------------------------------------------------------------------- */
  document.querySelectorAll('[data-print]').forEach(function (btn) {
    btn.addEventListener('click', function () { window.print(); });
  });

  /* -----------------------------------------------------------------------
     DECLASSIFY easter egg. Type the word anywhere on the page
     ----------------------------------------------------------------------- */
  const codeword = 'DECLASSIFY';
  const decryptEl = document.getElementById('decrypt');
  const decryptClose = document.getElementById('decryptClose');
  let buffer = '';

  function openDecrypt() {
    if (!decryptEl) return;
    decryptEl.classList.add('is-open');
    decryptEl.setAttribute('aria-hidden', 'false');
    showToast('Addendum unsealed');
  }
  function closeDecrypt() {
    if (!decryptEl) return;
    decryptEl.classList.remove('is-open');
    decryptEl.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('keydown', function (e) {
    // ignore while typing in a form field
    const tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'Escape') { closeDecrypt(); return; }
    if (e.key.length !== 1) return;
    buffer = (buffer + e.key.toUpperCase()).slice(-codeword.length);
    if (buffer === codeword) {
      openDecrypt();
      buffer = '';
    }
  });

  if (decryptClose) decryptClose.addEventListener('click', closeDecrypt);
  if (decryptEl) {
    decryptEl.addEventListener('click', function (e) {
      if (e.target === decryptEl) closeDecrypt();
    });
  }

  /* -----------------------------------------------------------------------
     Seal triple-click = also unlock (friendly on mobile)
     ----------------------------------------------------------------------- */
  const sealEl = document.querySelector('.seal__mark');
  let clickCount = 0;
  let clickTimer = null;
  if (sealEl) {
    sealEl.addEventListener('click', function (e) {
      e.preventDefault();
      clickCount++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(function () { clickCount = 0; }, 600);
      if (clickCount >= 3) {
        clickCount = 0;
        openDecrypt();
      }
    });
  }
})();
