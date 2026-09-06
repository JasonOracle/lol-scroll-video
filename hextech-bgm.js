/* ============================================================
   Hextech BGM — file-based background music (assets/bgm.mp3,
   the 18–32s slice, level-normalized). Decoded once, then looped
   gaplessly through Web Audio with fade in/out. DEFAULT-ON: every
   page load attempts to play immediately; if autoplay policy blocks
   it, any first interaction (click / key / scroll) completes the
   start. The topbar speaker button mutes for the current visit only.
   ============================================================ */
(function () {
  'use strict';

  var SRC = 'assets/bgm.mp3';
  var TARGET_GAIN = 0.9; // the file itself is pre-lowered to BGM level (-12 dB)

  var ctx = null, buffer = null, gain = null, source = null;
  var muted = true, loading = false;

  function ensureCtx() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(ctx.destination);
    return true;
  }

  function load() {
    if (buffer || loading) return Promise.resolve(buffer);
    loading = true;
    return fetch(SRC)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.arrayBuffer();
      })
      .then(function (ab) { return ctx.decodeAudioData(ab); })
      .then(function (buf) { buffer = buf; loading = false; return buf; })
      .catch(function (err) {
        loading = false;
        console.warn('[bgm] failed to load ' + SRC + ':', err);
        return null;
      });
  }

  function begin() {
    btn.classList.remove('is-hinted');
    if (source) return;
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true; // gapless: Web Audio joins the buffer ends sample-exactly
    source.connect(gain);
    source.start();
  }

  function fadeIn() {
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), ctx.currentTime);
    gain.gain.linearRampToValueAtTime(TARGET_GAIN, ctx.currentTime + 1.2);
  }

  function fadeOut() {
    if (!ctx) return;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
  }

  function setMuted(m) {
    // Default-ON design: the mute button only affects the CURRENT page visit.
    // No persistence — every load starts with music on (subject to autoplay policy).
    muted = m;
    btn.classList.remove('is-hinted');
    if (m) {
      if (ctx) {
        fadeOut();
        setTimeout(function () { if (muted && source) { source.stop(); source = null; } }, 900);
      }
    } else {
      tryStart(); // ensureCtx + resume + load + begin — even on a cold page
    }
    applyIcon();
  }

  // Try to be audible right now. Called on page load (autoplay attempt — browsers
  // allow it for sites with interaction history, and localhost is often lenient),
  // on every kind of first gesture, and whenever the context un-blocks itself.
  function tryStart() {
    if (muted) return;
    if (!ensureCtx()) return;
    if (ctx.state === 'suspended') ctx.resume().catch(function () {});
    if (buffer) { begin(); fadeIn(); }
    else {
      load().then(function (b) { if (b && !muted) { begin(); fadeIn(); } });
    }
  }

  // ---------- topbar toggle button ----------
  var ICON_ON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9.5 9.5 0 0 1 0 13"/></svg>';
  var ICON_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><line x1="16" y1="9" x2="22" y2="15"/><line x1="22" y1="9" x2="16" y2="15"/></svg>';

  var btn = document.createElement('button');
  btn.className = 'sw-bgm-btn';
  btn.type = 'button';

  function applyIcon() {
    btn.innerHTML = muted ? ICON_OFF : ICON_ON;
    btn.setAttribute('aria-label', muted ? '开启背景音乐' : '关闭背景音乐');
    btn.classList.toggle('is-off', muted);
  }
  applyIcon();

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    // If music is intended but not actually audible (autoplay blocked), the first
    // click forces a play instead of toggling to mute — the button never feels dead.
    if (muted || !ctx || ctx.state !== 'running' || !source) { setMuted(false); return; }
    setMuted(true);
  });

  var host = document.querySelector('.sw-topbar');
  if (host) {
    var cta = host.querySelector('.sw-topcta');
    if (cta) host.insertBefore(btn, cta); else host.appendChild(btn);
  } else {
    document.body.appendChild(btn);
  }

  // preload right away so the first click starts instantly
  function preload() { ensureCtx() && load(); window.removeEventListener('pointerdown', preload); }
  window.addEventListener('pointerdown', preload);

  // read-only debug/QA handle (not used by the page)
  window.__hextechBGM = {
    get playing() { return !!(ctx && source && !muted && ctx.state === 'running'); },
    get ctxState() { return ctx ? ctx.state : 'none'; },
    get duration() { return buffer ? buffer.duration : 0; },
    get loop() { return !!(source && source.loop); },
    get gain() { return ctx && gain ? gain.gain.value : 0; }
  };

  // ---------- boot: default-ON, autoplay attempt + gesture fallback ----------
  try { localStorage.removeItem('hextech-bgm'); } catch (e) {}  // clear stale pref from the old design
  muted = false;                   // every load starts with music on
  applyIcon();
  btn.classList.add('is-hinted');
  tryStart();                      // may be blocked by autoplay policy → hint pulses

  // Any interaction completes the start if policy blocked it. Scroll/wheel included:
  // cheap no-ops once playing.
  function gesture() {
    if (!muted) { btn.classList.remove('is-hinted'); tryStart(); }
  }
  ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (ev) {
    window.addEventListener(ev, gesture, { passive: true });
  });

  // Policy can unblock late (media engagement heuristics) — start the moment it does.
  function watchCtx() {
    if (!ctx) return;
    ctx.onstatechange = function () {
      if (ctx.state === 'running' && !muted) {
        btn.classList.remove('is-hinted');
        if (buffer) { begin(); fadeIn(); }
        else { load().then(function (b) { if (b && !muted) { begin(); fadeIn(); } }); }
      }
    };
  }
  var ensureOrig = ensureCtx;
  ensureCtx = function () { var ok = ensureOrig(); if (ok) watchCtx(); return ok; };
  var css = document.createElement('style');
  css.textContent =
    '.sw-bgm-btn{display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:999px;border:1px solid rgba(10,200,185,.34);border-color:color-mix(in srgb,#0AC8B9 34%,transparent);cursor:pointer;color:#F0E6D2;background:rgba(10,20,40,.72);background-color:color-mix(in srgb,#0A1428 72%,transparent);backdrop-filter:blur(10px);box-shadow:0 4px 14px rgba(0,0,0,.35);transition:transform .2s,color .2s;}' +
    '.sw-bgm-btn svg{pointer-events:none;}' +
    '.sw-bgm-btn:hover{transform:translateY(-1px);}' +
    '.sw-bgm-btn.is-hinted{animation:sw-bgm-hint 2.2s ease-in-out 3;}' +
    '@keyframes sw-bgm-hint{0%,100%{box-shadow:0 4px 14px rgba(0,0,0,.35),0 0 0 0 rgba(10,200,185,.45);}55%{box-shadow:0 4px 14px rgba(0,0,0,.35),0 0 0 9px rgba(10,200,185,0);}}';
  document.head.appendChild(css);
})();
