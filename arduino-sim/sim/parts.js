/* =====================================================================
   sim/parts.js — virtual parts (SIM_SPEC §4)
   SIM.parts.create(type, config, board) → { el, update(), destroy(), rebind(), setRunning(on) }
   Every part is a card (title + pin chip + hand-drawn SVG + live readout + controls).
   Parts read the board only through the public SIM.hw.Board API (§3):
     board.pin(n) / board.on('pin'|'serial'|…) / setDigitalSource / setAnalogSource /
     board.servo(pin) / board.lcd(addr) / board.neopixel(pin) / board.tone(pin) / board.sensors
   Extra (optional) methods called by lab.js:
     rebind()          re-register input sources after board.reset()
     setRunning(bool)  program running or not (active-low parts go dark, LCD shows 已停止)
   ===================================================================== */
(function (root) {
  'use strict';
  const SIM = root.SIM = root.SIM || {};
  const SVGNS = 'http://www.w3.org/2000/svg';
  let UID = 0;

  // ------------------------------------------------------------------ helpers
  function el(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    setAttrs(e, attrs);
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : String(k));
    return e;
  }
  function sv(tag, attrs, ...kids) {
    const e = document.createElementNS(SVGNS, tag);
    setAttrs(e, attrs);
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k)));
    return e;
  }
  function setAttrs(e, attrs) {
    if (!attrs) return;
    for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  function hex2rgb(h) {
    h = String(h || '#ff4d4f').replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const mixRGB = (a, b, t) => [0, 1, 2].map(i => Math.round(lerp(a[i], b[i], t)));
  const css = c => `rgb(${c[0]},${c[1]},${c[2]})`;
  function pinNum(v, analog) {
    if (typeof v === 'string') {
      const s = v.trim();
      const a = /^A(\d)$/i.exec(s);
      if (a) return 14 + Number(a[1]);
      const d = /^D?(\d+)$/i.exec(s);
      if (d) v = Number(d[1]);
    }
    v = Number(v);
    if (analog && v >= 0 && v < 6) return 14 + v;
    return v;
  }
  const pinText = n => (n >= 14 ? 'A' + (n - 14) : 'D' + n);
  function listen(board, ev, fn) {
    if (!board || typeof board.on !== 'function') return () => {};
    const r = board.on(ev, fn);
    return () => {
      if (typeof r === 'function') r();
      else if (typeof board.off === 'function') board.off(ev, fn);
    };
  }
  const reduced = () => !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const nowMs = () => (root.performance ? root.performance.now() : Date.now());
  function pinState(board, n) {
    const p = (board && board.pin && board.pin(n)) || {};
    return { mode: p.mode || null, level: p.level ? 1 : 0, pwm: p.pwm == null ? null : p.pwm, pullup: !!p.pullup };
  }
  const driving = st => st.mode === 'OUTPUT' || st.pwm != null;
  function glowFilter(id, sd) {
    return sv('filter', { id, x: '-80%', y: '-80%', width: '260%', height: '260%' }, sv('feGaussianBlur', { stdDeviation: sd || 5 }));
  }

  // ------------------------------------------------------------------ pin tracker
  // Time-weighted duty (so a pin toggled fast in software looks dimmed, like a real LED)
  // and toggle timestamps (for the passive buzzer's frequency estimate).
  const TRACKERS = new WeakMap();
  function tracker(board) {
    let t = TRACKERS.get(board);
    if (!t) { t = new Tracker(board); TRACKERS.set(board, t); }
    return t;
  }
  class Tracker {
    constructor(b) {
      this.b = b; this.p = {};
      this.off = listen(b, 'pin', (n, st, t) => this.onPin(n, st || pinState(b, n), t));
    }
    now() { const t = this.b.now ? this.b.now() : 0; return Number.isFinite(t) ? t : 0; }
    val(st) { return st.pwm != null ? clamp(st.pwm / 255, 0, 1) : (st.level ? 1 : 0); }
    rec(n) {
      let r = this.p[n];
      if (!r) {
        const st = pinState(this.b, n), now = this.now();
        r = this.p[n] = { v: this.val(st), t: now, acc: 0, w0: now, lastNow: -1, duty: this.val(st), lvl: st.level, tog: [] };
      }
      return r;
    }
    onPin(n, st, t) {
      const r = this.rec(n);
      if (t == null || !Number.isFinite(t)) t = this.now();
      if (t < r.t) { r.t = t; r.w0 = t; r.acc = 0; r.tog.length = 0; }
      r.acc += r.v * (t - r.t);
      r.t = t;
      r.v = this.val(st);
      const lvl = st.level ? 1 : 0;
      if (lvl !== r.lvl) {
        r.lvl = lvl;
        r.tog.push(t);
        if (r.tog.length > 1200) r.tog.splice(0, 600);
      }
    }
    duty(n) {
      const r = this.rec(n), now = this.now();
      if (now === r.lastNow) return r.duty;
      if (now < r.w0) { r.w0 = now; r.t = now; r.acc = 0; }
      const win = now - r.w0;
      const d = win <= 0 ? r.v : (r.acc + r.v * Math.max(0, now - r.t)) / win;
      r.acc = 0; r.t = now; r.w0 = now; r.lastNow = now;
      r.duty = clamp(d, 0, 1);
      return r.duty;
    }
    toggles(n) { return this.rec(n).tog; }
  }

  // ------------------------------------------------------------------ audio (WebAudio square wave)
  const AUD = { ctx: null, on: false, subs: new Set() };
  function audioToggle(on) {
    if (on) {
      try {
        if (!AUD.ctx) {
          const C = root.AudioContext || root.webkitAudioContext;
          if (!C) return false;
          AUD.ctx = new C();
        }
        if (AUD.ctx.state === 'suspended') AUD.ctx.resume();
      } catch (e) { return false; }
    }
    AUD.on = !!on;
    AUD.subs.forEach(f => f(AUD.on));
    return true;
  }
  class Voice {
    constructor() { this.osc = null; this.g = null; this.f = 0; this.playing = false; }
    set(freq, vol) {
      if (!AUD.on || !AUD.ctx || !freq) { this.silence(); return; }
      const ctx = AUD.ctx;
      try {
        if (!this.osc) {
          this.osc = ctx.createOscillator();
          this.osc.type = 'square';
          this.g = ctx.createGain();
          this.g.gain.value = 0;
          this.osc.connect(this.g);
          this.g.connect(ctx.destination);
          this.osc.start();
        }
        if (Math.abs(this.f - freq) > 0.5) { this.osc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.004); this.f = freq; }
        if (!this.playing) { this.g.gain.setTargetAtTime(vol || 0.045, ctx.currentTime, 0.004); this.playing = true; }
      } catch (e) { /* ignore audio errors */ }
    }
    silence() {
      if (this.osc && this.playing) {
        try { this.g.gain.setTargetAtTime(0, AUD.ctx.currentTime, 0.006); } catch (e) { /* */ }
        this.playing = false;
      }
    }
    destroy() {
      if (this.osc) {
        try { this.osc.stop(); this.osc.disconnect(); this.g.disconnect(); } catch (e) { /* */ }
        this.osc = null; this.playing = false;
      }
    }
  }

  // ------------------------------------------------------------------ card + controls
  function makeCard(type, cfg, defTitle, pinStr, opts) {
    opts = opts || {};
    const title = cfg.label || defTitle;
    const root_ = el('div', { class: 'part ' + type + (opts.wide ? ' wide' : ''), 'data-type': type, role: 'group', 'aria-label': title });
    const head = el('div', { class: 'part-head' },
      el('span', { class: 'part-title', text: title }),
      pinStr ? el('span', { class: 'part-pin', text: pinStr }) : null);
    const fig = el('div', { class: 'part-fig' });
    const read = el('div', { class: 'part-read' });
    const ctl = el('div', { class: 'part-ctl' });
    root_.append(head, fig, read, ctl);
    let last = null;
    function setRead(html, plain) {
      if (html === last) return;
      last = html;
      read.innerHTML = html;
      root_.dataset.read = plain != null ? plain : read.textContent;
    }
    return { el: root_, fig, read, ctl, setRead };
  }

  /* press-and-hold behaviour for buttons / pads / levers (mouse, touch, keyboard). */
  function pressable(target, onChange) {
    let pressed = false, latched = false;
    function set(v) {
      if (latched && !v) return;
      if (pressed === v) return;
      pressed = v;
      target.setAttribute('aria-pressed', String(v));
      onChange(v);
    }
    target.setAttribute('aria-pressed', 'false');
    if (!target.hasAttribute('tabindex') && target.tagName !== 'BUTTON') target.setAttribute('tabindex', '0');
    if (!target.hasAttribute('role') && target.tagName !== 'BUTTON') target.setAttribute('role', 'button');
    target.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault();
      try { target.setPointerCapture(e.pointerId); } catch (err) { /* */ }
      try { target.focus({ preventScroll: true }); } catch (err) { /* */ }
      set(true);
    });
    const up = () => set(false);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
    target.addEventListener('lostpointercapture', up);
    target.addEventListener('keydown', e => {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) set(true); }
    });
    target.addEventListener('keyup', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); set(false); } });
    target.addEventListener('blur', up);
    target.addEventListener('contextmenu', e => e.preventDefault());
    target.addEventListener('click', e => e.preventDefault());
    return {
      get pressed() { return pressed; },
      latch(v) { latched = !!v; if (latched) { pressed = false; set(true); } else { latched = false; set(false); } },
      release() { latched = false; set(false); }
    };
  }
  function latchBox(p, text) {
    const cb = el('input', { type: 'checkbox' });
    cb.addEventListener('change', () => p.latch(cb.checked));
    return el('label', { class: 'latch' }, cb, text || '保持按下');
  }

  function slider(label, min, max, step, value, fmt, onInput) {
    const input = el('input', { type: 'range', min, max, step, value, 'aria-label': label });
    const out = el('output', {});
    function paint() {
      const v = Number(input.value);
      out.textContent = fmt ? fmt(v) : String(v);
      input.style.setProperty('--fill', ((v - min) / (max - min) * 100) + '%');
      input.setAttribute('aria-valuetext', out.textContent);
    }
    input.addEventListener('input', () => { paint(); onInput(Number(input.value)); });
    paint();
    const row = el('label', { class: 'part-row' }, el('span', { text: label }), input, out);
    return { row, input, set(v) { input.value = v; paint(); } };
  }
  function pbtn(text, attrs) { return el('button', Object.assign({ type: 'button', class: 'pbtn' }, attrs || {}), text); }

  /* rotary knob: drag around the centre, arrows / PageUp / PageDown / Home / End. value 0..1 */
  function knob(o) {
    const size = o.size || 76;
    let v = clamp(o.value == null ? 0.5 : o.value, 0, 1);
    const g = sv('svg', { width: size, height: size, viewBox: '-50 -50 100 100', class: 'drag knob', tabindex: 0, role: 'slider', 'aria-label': o.label || '旋钮', 'aria-valuemin': 0, 'aria-valuemax': 100 });
    const R = 43;
    const arcPath = (a0, a1) => {
      const p = a => [Math.sin(a * Math.PI / 180) * R, -Math.cos(a * Math.PI / 180) * R];
      const [x0, y0] = p(a0), [x1, y1] = p(a1);
      return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
    };
    const track = sv('path', { d: arcPath(-150, 150), fill: 'none', stroke: 'var(--track)', 'stroke-width': 6, 'stroke-linecap': 'round' });
    const val = sv('path', { fill: 'none', stroke: 'var(--turq-deep)', 'stroke-width': 6, 'stroke-linecap': 'round' });
    const body = sv('circle', { r: 32, fill: o.body || '#2D2D2D' });
    const ring = sv('circle', { r: 36, class: 'focus-ring' });
    const ptr = sv('line', { x1: 0, y1: -6, x2: 0, y2: -26, stroke: '#fff', 'stroke-width': 6, 'stroke-linecap': 'round' });
    g.append(track, val, ring, body, ptr);
    function paint() {
      const a = -150 + 300 * v;
      val.setAttribute('d', v < 0.004 ? 'M0 0' : arcPath(-150, a));
      ptr.setAttribute('transform', `rotate(${a.toFixed(1)})`);
      g.setAttribute('aria-valuenow', Math.round(v * 100));
      if (o.text) g.setAttribute('aria-valuetext', o.text(v));
    }
    function set(nv, fire) {
      nv = clamp(nv, 0, 1);
      if (nv === v && fire) return;
      v = nv; paint();
      if (fire && o.onChange) o.onChange(v);
    }
    let last = null;
    const angAt = e => {
      const r = g.getBoundingClientRect();
      return Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI;
    };
    g.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault();
      try { g.setPointerCapture(e.pointerId); } catch (err) { /* */ }
      try { g.focus({ preventScroll: true }); } catch (err) { /* */ }
      last = angAt(e);
      // clicking on the arc jumps there directly
      const a = last;
      if (a >= -150 && a <= 150) {
        const r = g.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        if (Math.hypot(dx, dy) > r.width * 0.36) set((a + 150) / 300, true);
      }
    });
    g.addEventListener('pointermove', e => {
      if (last == null) return;
      const a = angAt(e);
      let d = a - last;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      last = a;
      set(v + d / 300, true);
    });
    const end = () => { last = null; };
    g.addEventListener('pointerup', end);
    g.addEventListener('pointercancel', end);
    g.addEventListener('keydown', e => {
      const big = e.shiftKey ? 0.1 : 0.01;
      let nv = null;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nv = v + big;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nv = v - big;
      else if (e.key === 'PageUp') nv = v + 0.1;
      else if (e.key === 'PageDown') nv = v - 0.1;
      else if (e.key === 'Home') nv = 0;
      else if (e.key === 'End') nv = 1;
      if (nv != null) { e.preventDefault(); e.stopPropagation(); set(nv, true); }
    });
    paint();
    return { el: g, get value() { return v; }, set: nv => set(nv, false) };
  }

  /* horizontal drag of an SVG element (magnet, obstacle). map(clientX→value) given by caller */
  function hdrag(handle, svg, onX) {
    let on = false;
    const toSvgX = e => {
      const r = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      return vb.x + (e.clientX - r.left) / r.width * vb.width;
    };
    handle.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault(); on = true;
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* */ }
      try { handle.focus({ preventScroll: true }); } catch (err) { /* */ }
    });
    handle.addEventListener('pointermove', e => { if (on) onX(toSvgX(e)); });
    const end = () => { on = false; };
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  }

  // ------------------------------------------------------------------ part factories
  const F = {};

  /* ---------- board: Arduino UNO mini card */
  F.board = function (cfg, board) {
    const c = makeCard('board', cfg, 'Arduino UNO', '');
    const s = sv('svg', { viewBox: '0 0 150 98', width: 132, 'aria-hidden': 'true' });
    const led = (x, y, color) => sv('rect', { x, y, width: 8, height: 4.5, rx: 1, fill: color, opacity: 0.25 });
    const lOn = led(124, 26, '#3DDC84'), lL = led(30, 40, '#F7C873'), lTX = led(30, 52, '#F7C873'), lRX = led(30, 64, '#F7C873');
    s.append(
      sv('rect', { x: 6, y: 4, width: 140, height: 90, rx: 6, fill: '#0F7C80' }),
      sv('rect', { x: 0, y: 14, width: 24, height: 20, rx: 2, fill: '#B9C0C2' }),
      sv('rect', { x: 0, y: 62, width: 20, height: 18, rx: 2, fill: '#2B2B2B' }),
      sv('rect', { x: 50, y: 8, width: 90, height: 7, rx: 1.5, fill: '#1D2626' }),
      sv('rect', { x: 62, y: 83, width: 78, height: 7, rx: 1.5, fill: '#1D2626' }),
      sv('rect', { x: 72, y: 54, width: 56, height: 14, rx: 2, fill: '#222' }),
      sv('text', { x: 96, y: 44, 'text-anchor': 'middle', fill: '#E3FAF7', 'font-size': 13, 'font-weight': 700, 'font-family': 'Poppins, sans-serif' }, 'UNO'),
      lOn, lL, lTX, lRX,
      sv('text', { x: 122, y: 41, fill: '#CFEDEA', 'font-size': 7, 'text-anchor': 'middle' }, 'ON'),
      sv('text', { x: 42, y: 45, fill: '#CFEDEA', 'font-size': 7 }, 'L'),
      sv('text', { x: 42, y: 57, fill: '#CFEDEA', 'font-size': 7 }, 'TX'),
      sv('text', { x: 42, y: 69, fill: '#CFEDEA', 'font-size': 7 }, 'RX'));
    c.fig.append(s);
    lOn.setAttribute('opacity', 1);
    const T = tracker(board);
    let txUntil = 0, rxUntil = 0, lastL = -1, lastTx = null, lastRx = null;
    const offSerial = listen(board, 'serial', () => { txUntil = nowMs() + 70; });
    c.setRead('ON 电源 · L 灯 = D13 · TX 串口发送');
    return {
      el: c.el,
      update() {
        const st = pinState(board, 13);
        const d = driving(st) ? T.duty(13) : 0;
        const op = d <= 0 ? 0.22 : 0.35 + 0.65 * Math.pow(d, 0.6);
        if (Math.abs(op - lastL) > 0.01) { lL.setAttribute('opacity', op.toFixed(2)); lastL = op; }
        const t = nowMs();
        const tx = t < txUntil, rx = t < rxUntil;
        if (tx !== lastTx) { lTX.setAttribute('opacity', tx ? 1 : 0.22); lastTx = tx; }
        if (rx !== lastRx) { lRX.setAttribute('opacity', rx ? 1 : 0.22); lastRx = rx; }
      },
      rxFlash() { rxUntil = nowMs() + 120; },
      rebind() {},
      setRunning() {},
      destroy() { offSerial(); c.el.remove(); }
    };
  };

  /* ---------- led */
  F.led = function (cfg, board) {
    const pin = pinNum(cfg.pin);
    const c = makeCard('led', cfg, 'LED', pinText(pin));
    const col = hex2rgb(cfg.color || '#ff4d4f');
    const off = mixRGB(col, [58, 58, 58], 0.62);
    const fid = 'pglow' + (++UID);
    const s = sv('svg', { viewBox: '0 0 64 96', width: 58, 'aria-hidden': 'true' });
    const glow = sv('circle', { cx: 32, cy: 28, r: 22, fill: css(col), opacity: 0, filter: `url(#${fid})` });
    const dome = sv('path', { d: 'M16 48 V28 A16 16 0 0 1 48 28 V48 Z', fill: css(off) });
    const rim = sv('rect', { x: 12, y: 46, width: 40, height: 6, rx: 2, fill: css(mixRGB(off, [0, 0, 0], 0.15)) });
    const shine = sv('path', { d: 'M22 30 A10 10 0 0 1 30 20', stroke: '#fff', 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round', opacity: 0.35 });
    s.append(sv('defs', {}, glowFilter(fid, 7)), glow,
      sv('line', { x1: 26, y1: 52, x2: 26, y2: 86, stroke: '#9AA0A0', 'stroke-width': 2.5 }),
      sv('line', { x1: 38, y1: 52, x2: 38, y2: 93, stroke: '#9AA0A0', 'stroke-width': 2.5 }),
      sv('text', { x: 44, y: 92, 'font-size': 9, fill: 'var(--muted)' }, '+'),
      dome, rim, shine);
    c.fig.append(s);
    const T = tracker(board);
    let running = false, lastVis = -1;
    function update() {
      const st = pinState(board, pin);
      let d = T.duty(pin), on, txt;
      if (cfg.activeLow) on = running && driving(st) ? 1 - d : 0;
      else on = driving(st) ? d : 0;
      let vis = on <= 0.002 ? 0 : 0.18 + 0.82 * Math.pow(on, 0.6);
      if (!driving(st) && st.pullup && !cfg.activeLow) { vis = 0.08; txt = '微亮（没设 OUTPUT，只开了上拉）'; }
      else if (on <= 0.002) txt = '灭';
      else if (on >= 0.995) txt = '<b>亮</b>';
      else txt = `亮度 <b>${Math.round(on * 100)}%</b>`;
      if (Math.abs(vis - lastVis) > 0.004) {
        lastVis = vis;
        dome.setAttribute('fill', css(mixRGB(off, col, Math.min(1, vis * 1.15))));
        glow.setAttribute('opacity', (vis * 0.85).toFixed(3));
        shine.setAttribute('opacity', (0.3 + 0.5 * vis).toFixed(2));
        c.el.dataset.brightness = on.toFixed(3);
      }
      c.setRead(txt);
    }
    return { el: c.el, update, rebind() {}, setRunning(r) { running = r; }, destroy() { c.el.remove(); } };
  };

  /* ---------- rgbLed */
  F.rgbLed = function (cfg, board) {
    const P = cfg.pins || {};
    const pins = { r: pinNum(P.r != null ? P.r : 11), g: pinNum(P.g != null ? P.g : 10), b: pinNum(P.b != null ? P.b : 9) };
    const c = makeCard('rgbLed', cfg, 'RGB 灯模块', `R${pins.r} G${pins.g} B${pins.b}`);
    const fid = 'pglow' + (++UID);
    const s = sv('svg', { viewBox: '0 0 100 84', width: 96, 'aria-hidden': 'true' });
    const glow = sv('circle', { cx: 50, cy: 36, r: 20, fill: '#000', opacity: 0, filter: `url(#${fid})` });
    const inner = sv('circle', { cx: 50, cy: 36, r: 10, fill: '#D7D7D7' });
    s.append(sv('defs', {}, glowFilter(fid, 8)),
      sv('rect', { x: 10, y: 8, width: 80, height: 58, rx: 5, fill: '#222' }),
      glow,
      sv('rect', { x: 34, y: 20, width: 32, height: 32, rx: 3, fill: '#F2F2F2' }),
      inner,
      ...['R', 'G', 'B', '−'].map((t, i) => sv('g', {},
        sv('circle', { cx: 23 + i * 18, cy: 74, r: 3.5, fill: '#C9A227' }),
        sv('text', { x: 23 + i * 18, y: 64, 'font-size': 8, fill: '#ddd', 'text-anchor': 'middle' }, t))));
    c.fig.append(s);
    const T = tracker(board);
    let lastKey = '';
    function chan(n) { const st = pinState(board, n); return driving(st) ? T.duty(n) : 0; }
    return {
      el: c.el,
      update() {
        const d = [chan(pins.r), chan(pins.g), chan(pins.b)];
        const v = d.map(x => Math.round(x * 255));
        const key = v.join(',');
        if (key === lastKey) return;
        lastKey = key;
        const m = Math.max(...d);
        if (m <= 0.002) { inner.setAttribute('fill', '#D7D7D7'); glow.setAttribute('opacity', 0); }
        else {
          const hue = d.map(x => Math.round(255 * Math.pow(x / m, 0.8)));
          const inten = 0.25 + 0.75 * Math.pow(m, 0.55);
          inner.setAttribute('fill', css(mixRGB([215, 215, 215], hue, inten)));
          glow.setAttribute('fill', css(hue));
          glow.setAttribute('opacity', (0.95 * inten).toFixed(2));
        }
        c.el.dataset.rgb = key;
        c.setRead(`R <b>${v[0]}</b> · G <b>${v[1]}</b> · B <b>${v[2]}</b>`);
      },
      rebind() {}, setRunning() {}, destroy() { c.el.remove(); }
    };
  };

  /* ---------- ledBar: 8 LEDs (flow lamp) */
  F.ledBar = function (cfg, board) {
    const pins = (cfg.pins || [2, 3, 4, 5, 6, 7, 8, 9]).map(p => pinNum(p));
    const activeLow = cfg.activeLow !== false;
    const colors = (cfg.colors || pins.map((_, i) => (cfg.color || (i % 2 ? '#ff4d4f' : '#F5C542')))).map(hex2rgb);
    const c = makeCard('ledBar', cfg, '8 个 LED（流水灯）', `${pinText(pins[0])}–${pinText(pins[pins.length - 1])}`, { wide: true });
    const W = pins.length * 26 + 8;
    const fid = 'pglow' + (++UID);
    const s = sv('svg', { viewBox: `0 0 ${W} 82`, width: Math.min(300, W * 1.2), 'aria-hidden': 'true' });
    s.append(sv('defs', {}, glowFilter(fid, 4)));
    if (activeLow) s.append(sv('line', { x1: 6, y1: 6, x2: W - 6, y2: 6, stroke: '#E5484D', 'stroke-width': 2 }), sv('text', { x: W - 6, y: 16, 'font-size': 7.5, fill: 'var(--muted)', 'text-anchor': 'end' }, '正极共接 5V'));
    const leds = pins.map((p, i) => {
      const x = 8 + i * 26;
      const off = mixRGB(colors[i], [58, 58, 58], 0.62);
      const glow = sv('circle', { cx: x + 9, cy: 32, r: 10, fill: css(colors[i]), opacity: 0, filter: `url(#${fid})` });
      const dome = sv('path', { d: `M${x + 2} 46 V32 A7 7 0 0 1 ${x + 16} 32 V46 Z`, fill: css(off) });
      s.append(glow,
        sv('line', { x1: x + 6, y1: 48, x2: x + 6, y2: 60, stroke: '#9AA0A0', 'stroke-width': 1.6 }),
        sv('line', { x1: x + 12, y1: 48, x2: x + 12, y2: 60, stroke: '#9AA0A0', 'stroke-width': 1.6 }),
        dome,
        sv('rect', { x: x, y: 45, width: 18, height: 4, rx: 1, fill: css(mixRGB(off, [0, 0, 0], 0.15)) }),
        sv('text', { x: x + 9, y: 74, 'font-size': 8.5, 'text-anchor': 'middle', fill: 'var(--muted)', 'font-family': 'var(--font-code)' }, pinText(p)));
      return { p, glow, dome, off, col: colors[i], last: -1 };
    });
    c.fig.append(s);
    const T = tracker(board);
    let running = false;
    return {
      el: c.el,
      update() {
        const lit = [];
        for (const L of leds) {
          const st = pinState(board, L.p);
          const d = T.duty(L.p);
          const on = running && driving(st) ? (activeLow ? 1 - d : d) : 0;
          const vis = on <= 0.002 ? 0 : 0.2 + 0.8 * Math.pow(on, 0.6);
          if (on > 0.5) lit.push(pinText(L.p));
          if (Math.abs(vis - L.last) > 0.01) {
            L.last = vis;
            L.dome.setAttribute('fill', css(mixRGB(L.off, L.col, Math.min(1, vis * 1.15))));
            L.glow.setAttribute('opacity', (vis * 0.9).toFixed(2));
          }
        }
        c.el.dataset.lit = lit.join(',');
        c.setRead(lit.length === 0 ? '全灭' : lit.length === leds.length ? '<b>全亮</b>' : `亮：<b>${lit.join(' ')}</b>`);
      },
      rebind() {}, setRunning(r) { running = r; }, destroy() { c.el.remove(); }
    };
  };

  /* ---------- button (module with pull-up: released 1, pressed 0) */
  F.button = function (cfg, board) {
    const pin = pinNum(cfg.pin);
    const pressedLevel = cfg.pressedLevel == null ? 0 : cfg.pressedLevel;
    const c = makeCard('button', cfg, '按键模块', pinText(pin));
    const cap = el('button', { type: 'button', class: 'cap-btn' + (cfg.color === 'dark' ? '' : ' red'), 'aria-label': '按键（按住）' }, '按住');
    c.fig.append(cap);
    let pressed = false;
    const src = () => (pressed ? pressedLevel : 1 - pressedLevel);
    const reg = () => board.setDigitalSource(pin, src);
    reg();
    function paint() {
      const lv = src();
      c.el.dataset.pressed = pressed ? '1' : '0';
      c.setRead(pressed ? `按下 → 读到 <b>${lv} (${lv ? 'HIGH' : 'LOW'})</b>` : `松开 → 读到 <b>${lv} (${lv ? 'HIGH' : 'LOW'})</b>`);
    }
    const p = pressable(cap, v => { pressed = v; cap.textContent = v ? '按下' : '按住'; paint(); });
    c.ctl.append(latchBox(p));
    paint();
    return { el: c.el, update() {}, rebind: reg, setRunning() {}, press(v) { pressed = !!v; paint(); }, destroy() { board.setDigitalSource(pin, () => null); c.el.remove(); } };
  };

  /* ---------- touch (TTP223: touched 1, else 0) */
  F.touch = function (cfg, board) {
    const pin = pinNum(cfg.pin);
    const c = makeCard('touch', cfg, '触摸开关模块', pinText(pin));
    const s = sv('svg', { viewBox: '0 0 100 86', width: 96, class: 'hit', 'aria-label': '触摸区（按住 = 手指放上）' });
    const finger = sv('g', { opacity: 0 },
      sv('ellipse', { cx: 50, cy: 40, rx: 15, ry: 18, fill: '#E9B48F', stroke: '#C98E68', 'stroke-width': 1.5 }),
      sv('path', { d: 'M42 30 Q50 26 58 30', stroke: '#C98E68', 'stroke-width': 1.5, fill: 'none' }));
    const ind = sv('circle', { cx: 84, cy: 14, r: 3.5, fill: '#E5484D', opacity: 0.25 });
    s.append(
      sv('rect', { x: 8, y: 4, width: 84, height: 78, rx: 6, fill: '#1F5FA8' }),
      ...[26, 20, 14, 8].map(r => sv('circle', { cx: 50, cy: 40, r, fill: 'none', stroke: '#E8F1FB', 'stroke-width': 2 })),
      sv('circle', { cx: 50, cy: 40, r: 3, fill: '#E8F1FB' }),
      sv('text', { x: 50, y: 78, 'font-size': 7.5, fill: '#E8F1FB', 'text-anchor': 'middle' }, 'SIG  VCC  GND'),
      ind, finger);
    c.fig.append(s);
    let touched = false;
    const reg = () => board.setDigitalSource(pin, () => (touched ? 1 : 0));
    reg();
    function paint() {
      finger.setAttribute('opacity', touched ? 0.92 : 0);
      ind.setAttribute('opacity', touched ? 1 : 0.25);
      c.el.dataset.pressed = touched ? '1' : '0';
      c.setRead(touched ? '摸到 → 读到 <b>1 (HIGH)</b>' : '手指离开 → 读到 <b>0 (LOW)</b>');
    }
    const p = pressable(s, v => { touched = v; paint(); });
    c.ctl.append(latchBox(p, '手指一直放着'));
    paint();
    return { el: c.el, update() {}, rebind: reg, setRunning() {}, press(v) { touched = !!v; paint(); }, destroy() { board.setDigitalSource(pin, () => null); c.el.remove(); } };
  };

  /* ---------- limitSwitch (pressed 0, released 1; module LED lit when pressed) */
  F.limitSwitch = function (cfg, board) {
    const pin = pinNum(cfg.pin);
    const c = makeCard('limitSwitch', cfg, '限位开关模块', pinText(pin));
    const s = sv('svg', { viewBox: '0 0 120 86', width: 112, class: 'hit', 'aria-label': '限位开关摆杆（按住 = 压下）' });
    const lever = sv('g', {},
      sv('line', { x1: 24, y1: 34, x2: 96, y2: 34, stroke: '#B8BEC0', 'stroke-width': 3.5, 'stroke-linecap': 'round' }),
      sv('circle', { cx: 98, cy: 30, r: 7, fill: '#3B3B3B', stroke: '#B8BEC0', 'stroke-width': 2 }));
    const ind = sv('circle', { cx: 104, cy: 70, r: 3.5, fill: '#E5484D', opacity: 0.25 });
    s.append(
      sv('rect', { x: 8, y: 52, width: 104, height: 30, rx: 4, fill: '#1F5FA8' }),
      sv('rect', { x: 20, y: 38, width: 62, height: 24, rx: 3, fill: '#2B2B2B' }),
      sv('rect', { x: 50, y: 33, width: 9, height: 7, rx: 1.5, fill: '#E5484D' }),
      sv('circle', { cx: 24, cy: 34, r: 3, fill: '#888' }),
      sv('text', { x: 56, y: 78, 'font-size': 7.5, fill: '#E8F1FB', 'text-anchor': 'middle' }, 'OUT  GND  VCC'),
      lever, ind);
    c.fig.append(s);
    let pressed = false;
    const reg = () => board.setDigitalSource(pin, () => (pressed ? 0 : 1));
    reg();
    function paint() {
      lever.setAttribute('transform', pressed ? 'rotate(6 24 34)' : 'rotate(-9 24 34)');
      ind.setAttribute('opacity', pressed ? 1 : 0.25);
      c.el.dataset.pressed = pressed ? '1' : '0';
      c.setRead(pressed ? '压下 → OUT 读到 <b>0 (LOW)</b>' : '松开 → OUT 读到 <b>1 (HIGH)</b>');
    }
    const p = pressable(s, v => { pressed = v; paint(); });
    c.ctl.append(latchBox(p, '一直压着'));
    paint();
    return { el: c.el, update() {}, rebind: reg, setRunning() {}, press(v) { pressed = !!v; paint(); }, destroy() { board.setDigitalSource(pin, () => null); c.el.remove(); } };
  };

  /* ---------- tilt (SW-520D): >10° toward cap end → open → 1; level / toward pins → closed → 0 */
  F.tilt = function (cfg, board) {
    const pin = pinNum(cfg.pin);
    const c = makeCard('tilt', cfg, '倾斜开关模块', pinText(pin));
    const s = sv('svg', { viewBox: '0 0 130 84', width: 122, 'aria-hidden': 'true' });
    const ball = sv('circle', { cx: 0, cy: 0, r: 5.5, fill: '#C9CED0', stroke: '#7D8486', 'stroke-width': 1 });
    ball.style.transition = 'transform .18s ease-out';
    const grp = sv('g', {},
      sv('rect', { x: 14, y: 36, width: 102, height: 22, rx: 4, fill: '#1F5FA8' }),
      sv('line', { x1: 22, y1: 40, x2: 40, y2: 40, stroke: '#D9B44A', 'stroke-width': 2 }),
      sv('line', { x1: 22, y1: 46, x2: 40, y2: 46, stroke: '#D9B44A', 'stroke-width': 2 }),
      sv('rect', { x: 38, y: 32, width: 56, height: 18, rx: 4, fill: '#E8EAEA', stroke: '#7D8486', 'stroke-width': 1.2 }),
      sv('rect', { x: 90, y: 31, width: 10, height: 20, rx: 3, fill: '#2B2B2B' }),
      sv('text', { x: 95, y: 64, 'font-size': 7, fill: '#E8F1FB', 'text-anchor': 'middle' }, '帽盖'),
      sv('text', { x: 30, y: 64, 'font-size': 7, fill: '#E8F1FB', 'text-anchor': 'middle' }, '导针'),
      ball);
    s.append(sv('line', { x1: 6, y1: 78, x2: 124, y2: 78, stroke: 'var(--line)', 'stroke-width': 2, 'stroke-dasharray': '4 4' }), grp);
    c.fig.append(s);
    let angle = Number(cfg.angle) || 0, tapUntil = 0;
    const isOpen = () => angle > 10 || nowMs() < tapUntil;
    const reg = () => board.setDigitalSource(pin, () => (isOpen() ? 1 : 0));
    reg();
    const sl = slider('倾斜', -90, 90, 1, angle, v => (v > 0 ? '+' : '') + v + '°', v => { angle = v; });
    const tap = pbtn('碰一下');
    tap.addEventListener('click', () => { tapUntil = nowMs() + 350; });
    c.ctl.append(sl.row, el('div', { class: 'part-btns' }, tap));
    c.ctl.append(el('div', { class: 'part-note', text: '向右（帽盖端）倾斜超过 10° 断开' }));
    let lastKey = '';
    return {
      el: c.el,
      update() {
        const open = isOpen(), tapping = nowMs() < tapUntil;
        const key = angle + '|' + open + '|' + tapping;
        if (key === lastKey) return;
        lastKey = key;
        grp.setAttribute('transform', `rotate(${clamp(angle, -90, 90) * 0.5} 65 47)`);
        const bx = tapping ? 64 : open ? 84 : 46;
        ball.setAttribute('transform', `translate(${bx} 41)`);
        c.el.dataset.open = open ? '1' : '0';
        const a = (angle > 0 ? '向帽盖端倾斜 ' : angle < 0 ? '向导针端倾斜 ' : '水平 ') + (angle ? Math.abs(angle) + '°' : '');
        c.setRead(tapping ? '碰一下：滚珠弹开 → 读到 <b>1</b>' : open ? `${a} · 断开 → 读到 <b>1</b>` : `${a} · 闭合 → 读到 <b>0</b>`);
      },
      rebind: reg, setRunning() {},
      setAngle(v) { angle = v; sl.set(v); },
      tap() { tapUntil = nowMs() + 350; },
      destroy() { board.setDigitalSource(pin, () => null); c.el.remove(); }
    };
  };

  /* ---------- pot (rotary potentiometer) */
  F.pot = function (cfg, board) {
    const pin = pinNum(cfg.pin == null ? 14 : cfg.pin, true);
    const vcc = Number(cfg.vcc) || 5;
    const c = makeCard('pot', cfg, '电位器（旋钮）', pinText(pin));
    let pos = clamp(cfg.value == null ? 0.5 : Number(cfg.value), 0, 1);
    const reading = () => Math.round(pos * vcc / 5 * 1023);
    const reg = () => board.setAnalogSource(pin, reading);
    reg();
    const txt = () => { const r = reading(); return `读数 ${r} (${(r * 5 / 1023).toFixed(2)}V)`; };
    const k = knob({ size: 80, value: pos, label: '电位器旋钮', text: txt, onChange: v => { pos = v; sl.set(Math.round(v * 1000)); paint(); } });
    c.fig.append(k.el);
    const sl = slider('位置', 0, 1000, 1, Math.round(pos * 1000), v => Math.round(v / 10) + '%', v => { pos = v / 1000; k.set(pos); paint(); });
    c.ctl.append(sl.row);
    if (vcc !== 5) c.ctl.append(el('div', { class: 'part-note', text: `接 ${vcc}V：最大读数约 ${Math.round(vcc / 5 * 1023)}` }));
    function paint() {
      const r = reading();
      c.el.dataset.value = String(r);
      c.setRead(`读数 <b>${r}</b> (${(r * 5 / 1023).toFixed(2)}V)`);
    }
    paint();
    return {
      el: c.el, update() {}, rebind: reg, setRunning() {},
      set(v) { pos = clamp(v, 0, 1); k.set(pos); sl.set(Math.round(pos * 1000)); paint(); },
      destroy() { board.setAnalogSource(pin, () => 0); c.el.remove(); }
    };
  };

  /* ---------- ldr (photoresistor module). Simulation: brighter → larger reading. */
  F.ldr = function (cfg, board) {
    const pin = pinNum(cfg.pin == null ? 14 : cfg.pin, true);
    const c = makeCard('ldr', cfg, '光敏电阻模块', pinText(pin));
    let light = clamp(cfg.light == null ? 60 : Number(cfg.light), 0, 100), covered = false;
    const reading = () => Math.round((covered ? Math.min(light, 4) : light) / 100 * 1023);
    const reg = () => board.setAnalogSource(pin, reading);
    reg();
    const s = sv('svg', { viewBox: '0 0 120 86', width: 112, 'aria-hidden': 'true' });
    const rays = sv('g', { stroke: '#E8A93B', 'stroke-width': 2.5, 'stroke-linecap': 'round' },
      ...[0, 45, 90, 135, 180, 225, 270, 315].map(a => sv('line', { x1: 0, y1: -13, x2: 0, y2: -18, transform: `rotate(${a})` })));
    const sun = sv('g', { transform: 'translate(98 18)' }, sv('circle', { r: 8.5, fill: '#F7C873' }), rays);
    const hand = sv('path', { d: 'M28 70 C26 50 30 36 38 32 C40 22 46 20 49 28 C52 18 58 18 60 28 C64 22 70 24 70 34 L72 48 C76 42 82 44 80 52 L72 70 Z', fill: '#4A4F4F', opacity: 0 });
    s.append(
      sv('rect', { x: 8, y: 40, width: 84, height: 40, rx: 5, fill: '#1F5FA8' }),
      sv('circle', { cx: 50, cy: 46, r: 15, fill: '#E7A045', stroke: '#B97A2E', 'stroke-width': 1.5 }),
      sv('path', { d: 'M40 42 h18 a2 2 0 0 1 0 4 h-16 a2 2 0 0 0 0 4 h16', fill: 'none', stroke: '#6B3F12', 'stroke-width': 2 }),
      sv('text', { x: 50, y: 76, 'font-size': 7.5, fill: '#E8F1FB', 'text-anchor': 'middle' }, 'S   V   G'),
      sun, hand);
    c.fig.append(s);
    const sl = slider('光照', 0, 100, 1, light, v => v + '%', v => { light = v; paint(); });
    const cover = pbtn('用手盖住', { 'aria-pressed': 'false' });
    cover.addEventListener('click', () => { covered = !covered; cover.setAttribute('aria-pressed', String(covered)); cover.textContent = covered ? '把手拿开' : '用手盖住'; paint(); });
    c.ctl.append(sl.row, el('div', { class: 'part-btns' }, cover), el('div', { class: 'part-note', text: '本模拟：越亮读数越大（实物模块可能相反）' }));
    function paint() {
      const r = reading();
      sun.setAttribute('opacity', (0.25 + 0.75 * light / 100).toFixed(2));
      rays.setAttribute('transform', `scale(${(0.6 + 0.5 * light / 100).toFixed(2)})`);
      hand.setAttribute('opacity', covered ? 0.92 : 0);
      c.el.dataset.value = String(r);
      c.setRead(`${covered ? '盖住' : '光照 ' + light + '%'} · 读数 <b>${r}</b>`);
    }
    paint();
    return {
      el: c.el, update() {}, rebind: reg, setRunning() {},
      set(v) { light = clamp(v, 0, 100); sl.set(light); paint(); },
      destroy() { board.setAnalogSource(pin, () => 0); c.el.remove(); }
    };
  };

  /* ---------- buzzer (active: HIGH = ~2.3 kHz; passive: frequency from pin toggles / tone()) */
  F.buzzer = function (cfg, board) {
    const pin = pinNum(cfg.pin);
    const kind = cfg.kind === 'passive' ? 'passive' : 'active';
    const c = makeCard('buzzer', cfg, kind === 'active' ? '有源蜂鸣器' : '无源蜂鸣器', pinText(pin));
    const s = sv('svg', { viewBox: '0 0 120 86', width: 112, 'aria-hidden': 'true' });
    const waves = sv('g', { transform: 'translate(52 40)' },
      ...[1, 2, 3].map(i => sv('path', { class: 'wave w' + i, d: `M${22 + i * 8} -${10 + i * 5} A${18 + i * 8} ${18 + i * 8} 0 0 1 ${22 + i * 8} ${10 + i * 5}` })));
    s.append(
      sv('rect', { x: 8, y: 8, width: 70, height: 72, rx: 5, fill: kind === 'active' ? '#2B2F2F' : '#1F5FA8' }),
      sv('circle', { cx: 43, cy: 40, r: 24, fill: '#1A1A1A', stroke: '#555', 'stroke-width': 1.5 }),
      sv('circle', { cx: 43, cy: 40, r: 15, fill: 'none', stroke: '#3A3A3A', 'stroke-width': 1.5 }),
      sv('circle', { cx: 43, cy: 40, r: 3.5, fill: '#555' }),
      sv('text', { x: 43, y: 23, 'font-size': 8, fill: '#ccc', 'text-anchor': 'middle' }, '+'),
      sv('text', { x: 43, y: 76, 'font-size': 7, fill: '#ddd', 'text-anchor': 'middle' }, kind === 'active' ? '有源' : '无源'),
      waves);
    c.fig.append(s);
    const voice = new Voice();
    const sb = pbtn(AUD.on ? '声音：开' : '开启声音', { class: 'pbtn sound', 'aria-pressed': String(AUD.on) });
    const onAud = on => { sb.setAttribute('aria-pressed', String(on)); sb.textContent = on ? '声音：开' : '开启声音'; };
    AUD.subs.add(onAud);
    sb.addEventListener('click', () => { const ok = audioToggle(!AUD.on); if (!ok) sb.textContent = '浏览器不支持声音'; });
    c.ctl.append(el('div', { class: 'part-btns' }, sb));
    const T = tracker(board);
    let running = false, lastKey = '', highUntil = 0, highFreq = 0, freqShown = 0, freqT = 0;
    function estimate() {
      const tg = T.toggles(pin), now = board.now();
      const n = tg.length;
      if (n < 3) return 0;
      const last = tg[n - 1];
      // find toggles within the last 50 ms of virtual time
      let i = n - 1;
      while (i > 0 && last - tg[i - 1] <= 50000) i--;
      const cnt = n - i;
      if (cnt < 3) return 0;
      const span = last - tg[i];
      if (span <= 0) return 1e6;
      const half = span / (cnt - 1);              // average µs between toggles
      if (now - last > Math.max(3 * half, 3000)) return 0; // stopped toggling
      return 1e6 / (2 * half);
    }
    return {
      el: c.el,
      update() {
        const st = pinState(board, pin);
        const tn = board.tone ? board.tone(pin) : null;
        let freq = 0, txt, sounding = false;
        if (!running) { freq = 0; }
        else if (tn && tn.freq) freq = kind === 'active' ? 2300 : tn.freq;
        else if (kind === 'active') freq = driving(st) && T.duty(pin) > 0.3 ? 2300 : 0;
        else freq = driving(st) ? estimate() : 0;
        const t = nowMs();
        if (freq > 20000) { highUntil = t + 1500; highFreq = freq; }
        if (freq >= 20 && freq <= 20000) {
          sounding = true;
          // smooth the readout so it does not flicker
          if (!freqShown || Math.abs(freq - freqShown) / freqShown > 0.04 || t - freqT > 400) { freqShown = freq; freqT = t; }
          txt = kind === 'active' ? '响（约 <b>2.3 kHz</b>）' : `频率 <b>${freqShown >= 1000 ? (freqShown / 1000).toFixed(2) + ' kHz' : Math.round(freqShown) + ' Hz'}</b>`;
          voice.set(freq, kind === 'active' ? 0.03 : 0.045);
        } else {
          voice.silence();
          freqShown = 0;
          if (t < highUntil) txt = `频率太高（约 ${Math.round(highFreq / 1000)} kHz），人耳听不到`;
          else txt = '安静';
        }
        if (!AUD.on && sounding) txt += ' · 点“开启声音”能听到';
        const key = txt + sounding;
        if (key !== lastKey) {
          lastKey = key;
          c.el.classList.toggle('sounding', sounding && !reduced());
          s.classList.toggle('sounding', sounding);
          c.el.dataset.freq = sounding ? String(Math.round(freq)) : (t < highUntil ? 'high' : '0');
          c.setRead(txt);
        }
      },
      rebind() {}, setRunning(r) { running = r; if (!r) voice.silence(); },
      destroy() { voice.destroy(); AUD.subs.delete(onAud); c.el.remove(); }
    };
  };

  /* ---------- reed switch with draggable magnet (distance < 1.5 cm → closed → 0) */
  F.reed = function (cfg, board) {
    const pin = pinNum(cfg.pin);
    const c = makeCard('reed', cfg, '小磁簧开关模块', pinText(pin));
    let dist = clamp(cfg.distanceCm == null ? 4 : Number(cfg.distanceCm), 0.3, 6);
    const closed = () => dist < 1.5;
    const reg = () => board.setDigitalSource(pin, () => (closed() ? 0 : 1));
    reg();
    const X0 = 62, X1 = 150; // magnet centre x for 0.3 cm … 6 cm
    const xOf = d => X0 + (d - 0.3) / 5.7 * (X1 - X0);
    const dOf = x => clamp(0.3 + (x - X0) / (X1 - X0) * 5.7, 0.3, 6);
    const s = sv('svg', { viewBox: '0 0 170 92', width: 150 });
    const bladeR = sv('line', { x1: 108, y1: 66, x2: 58, y2: 66, stroke: '#7D8486', 'stroke-width': 2.2 });
    bladeR.style.transition = 'transform .12s';
    const magnet = sv('g', { class: 'drag', tabindex: 0, role: 'slider', 'aria-label': '磁铁（左右拖动，或用方向键）', 'aria-valuemin': 0.3, 'aria-valuemax': 6 },
      sv('rect', { class: 'focus-ring', x: -24, y: -11, width: 48, height: 22, rx: 4 }),
      sv('rect', { x: -21, y: -8, width: 21, height: 16, rx: 2, fill: '#E5484D' }),
      sv('rect', { x: 0, y: -8, width: 21, height: 16, rx: 2, fill: '#3A6FD8' }),
      sv('text', { x: -10.5, y: 4, 'font-size': 10, fill: '#fff', 'text-anchor': 'middle', 'font-weight': 700 }, 'N'),
      sv('text', { x: 10.5, y: 4, 'font-size': 10, fill: '#fff', 'text-anchor': 'middle', 'font-weight': 700 }, 'S'));
    const field = sv('ellipse', { cx: 62, cy: 62, rx: 34, ry: 14, fill: 'var(--turq)', opacity: 0 });
    s.append(
      sv('rect', { x: 8, y: 76, width: 108, height: 12, rx: 3, fill: '#2B2F2F' }),
      field,
      sv('rect', { x: 22, y: 56, width: 80, height: 16, rx: 8, fill: 'rgba(200,230,240,.35)', stroke: '#9DB8C2', 'stroke-width': 1.2 }),
      sv('line', { x1: 14, y1: 64, x2: 66, y2: 64, stroke: '#7D8486', 'stroke-width': 2.2 }),
      sv('line', { x1: 102, y1: 66, x2: 112, y2: 66, stroke: '#7D8486', 'stroke-width': 2.2 }),
      bladeR,
      sv('line', { x1: X0, y1: 34, x2: X1 + 10, y2: 34, stroke: 'var(--line)', 'stroke-width': 1, 'stroke-dasharray': '3 3' }),
      magnet);
    c.fig.append(s);
    hdrag(magnet, s, x => { dist = dOf(x); sl.set(dist); paint(); });
    magnet.addEventListener('keydown', e => {
      let nd = null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nd = dist - 0.1;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nd = dist + 0.1;
      else if (e.key === 'Home') nd = 0.3;
      else if (e.key === 'End') nd = 6;
      if (nd != null) { e.preventDefault(); e.stopPropagation(); dist = clamp(nd, 0.3, 6); sl.set(dist); paint(); }
    });
    const sl = slider('距离', 0.3, 6, 0.1, dist, v => v.toFixed(1) + 'cm', v => { dist = v; paint(); });
    c.ctl.append(sl.row);
    function paint() {
      magnet.setAttribute('transform', `translate(${xOf(dist).toFixed(1)} 30)`);
      magnet.setAttribute('aria-valuenow', dist.toFixed(1));
      bladeR.setAttribute('transform', closed() ? 'translate(0 -2)' : '');
      field.setAttribute('opacity', closed() ? 0.22 : 0);
      c.el.dataset.closed = closed() ? '1' : '0';
      c.setRead(`磁铁 ${dist.toFixed(1)} cm · ${closed() ? '吸合 → 读到 <b>0</b>' : '断开 → 读到 <b>1</b>'}`);
    }
    paint();
    return { el: c.el, update() {}, rebind: reg, setRunning() {}, setDistance(d) { dist = clamp(d, 0.3, 6); sl.set(dist); paint(); }, destroy() { board.setDigitalSource(pin, () => null); c.el.remove(); } };
  };

  /* ---------- servo (SG90): arm follows board.servo(pin).angle (hw smooths it) */
  F.servo = function (cfg, board) {
    const pin = pinNum(cfg.pin);
    const c = makeCard('servo', cfg, '舵机 SG90', pinText(pin));
    const s = sv('svg', { viewBox: '0 0 130 100', width: 124, 'aria-hidden': 'true' });
    const cx = 65, cy = 74, R = 46;
    const ticks = sv('g', {});
    for (let a = 0; a <= 180; a += 15) {
      const r1 = a % 45 === 0 ? R - 7 : R - 4, rad = a * Math.PI / 180;
      ticks.append(sv('line', { x1: cx + Math.cos(rad) * r1, y1: cy - Math.sin(rad) * r1, x2: cx + Math.cos(rad) * R, y2: cy - Math.sin(rad) * R, stroke: 'var(--muted)', 'stroke-width': a % 45 === 0 ? 1.6 : 1 }));
    }
    const lab = (a, t) => { const rad = a * Math.PI / 180; return sv('text', { x: cx + Math.cos(rad) * (R + 8), y: cy - Math.sin(rad) * (R + 8) + 3, 'font-size': 8, fill: 'var(--muted)', 'text-anchor': 'middle' }, t); };
    const ghost = sv('line', { x1: cx, y1: cy, x2: cx + 36, y2: cy, stroke: 'var(--turq-deep)', 'stroke-width': 2, 'stroke-dasharray': '3 3', opacity: 0 });
    const arm = sv('g', {},
      sv('path', { d: `M${cx} ${cy - 6} L${cx + 38} ${cy - 3.5} A3.5 3.5 0 0 1 ${cx + 38} ${cy + 3.5} L${cx} ${cy + 6} Z`, fill: '#F4F4F4', stroke: '#8A9092', 'stroke-width': 1.2 }),
      ...[14, 22, 30].map(x => sv('circle', { cx: cx + x, cy, r: 1.3, fill: '#8A9092' })));
    s.append(
      sv('path', { d: `M${cx - R} ${cy} A${R} ${R} 0 0 1 ${cx + R} ${cy}`, fill: 'none', stroke: 'var(--line)', 'stroke-width': 1.2 }),
      ticks, lab(0, '0°'), lab(90, '90°'), lab(180, '180°'),
      sv('rect', { x: cx - 26, y: cy - 12, width: 52, height: 26, rx: 3, fill: '#2E6FD8' }),
      sv('text', { x: cx - 18, y: cy + 10, 'font-size': 6, fill: '#DCE8FB' }, 'SG90'),
      ghost, arm,
      sv('circle', { cx, cy, r: 6.5, fill: '#fff', stroke: '#8A9092', 'stroke-width': 1.2 }));
    c.fig.append(s);
    let lastKey = '';
    return {
      el: c.el,
      update() {
        const st = (board.servo && board.servo(pin)) || {};
        const a = Number(st.angle) || 0, tg = Number(st.target) || 0, att = !!st.attached;
        const key = att + '|' + a.toFixed(1) + '|' + tg.toFixed(0);
        if (key === lastKey) return;
        lastKey = key;
        arm.setAttribute('transform', `rotate(${(-a).toFixed(2)} ${cx} ${cy})`);
        arm.setAttribute('opacity', att ? 1 : 0.45);
        const moving = att && Math.abs(tg - a) > 0.6;
        ghost.setAttribute('opacity', moving ? 0.8 : 0);
        if (moving) ghost.setAttribute('transform', `rotate(${(-tg).toFixed(1)} ${cx} ${cy})`);
        c.el.dataset.angle = String(Math.round(a));
        c.el.dataset.target = String(Math.round(tg));
        c.setRead(!att ? '还没 attach()，舵机不动' : moving ? `角度 <b>${Math.round(a)}°</b> → 目标 ${Math.round(tg)}°` : `角度 <b>${Math.round(a)}°</b>`);
      },
      rebind() {}, setRunning() {}, destroy() { c.el.remove(); }
    };
  };

  /* ---------- joystick shield: stick (A0/A1, springs back) + 7 buttons (held → 0) */
  F.joystick = function (cfg, board) {
    const px = pinNum(cfg.x == null ? 14 : cfg.x, true), py = pinNum(cfg.y == null ? 15 : cfg.y, true);
    const btnMap = cfg.buttons || { 2: 'A', 3: 'B', 4: 'C', 5: 'D', 6: 'E', 7: 'F', 8: 'K' };
    const CX = cfg.restX == null ? 525 : cfg.restX, CY = cfg.restY == null ? 518 : cfg.restY;
    const c = makeCard('joystick', cfg, '摇杆扩展板', `X:${pinText(px)} Y:${pinText(py)}`, { wide: true });
    let dx = 0, dy = 0, dragging = false; // dx right +, dy up + (−1…1)
    const keys = { x: 0, y: 0 };
    const xVal = () => Math.round(clamp(CX + (dx > 0 ? dx * (1023 - CX) : dx * CX), 0, 1023));
    const yVal = () => Math.round(clamp(CY + (dy > 0 ? dy * (1023 - CY) : dy * CY), 0, 1023));
    const pressed = {};
    const regs = () => {
      board.setAnalogSource(px, xVal);
      board.setAnalogSource(py, yVal);
      for (const p in btnMap) { const n = pinNum(p); board.setDigitalSource(n, () => (pressed[n] ? 0 : null)); }
    };
    regs();
    const s = sv('svg', { viewBox: '0 0 280 140', width: 270 });
    const JX = 70, JY = 68, RR = 38;
    const stick = sv('g', { class: 'drag', tabindex: 0, role: 'group', 'aria-label': '摇杆：拖动，或按方向键；松开自动回中' },
      sv('circle', { class: 'focus-ring', r: 25 }),
      sv('circle', { r: 21, fill: '#2D2D2D' }),
      sv('circle', { r: 15, fill: 'none', stroke: '#555', 'stroke-width': 2 }));
    s.append(
      sv('rect', { x: 2, y: 2, width: 276, height: 136, rx: 8, fill: 'var(--card)', stroke: 'var(--line)' }),
      sv('circle', { cx: JX, cy: JY, r: 52, fill: 'var(--gray1)' }),
      sv('circle', { cx: JX, cy: JY, r: RR + 2, fill: 'none', stroke: 'var(--line)', 'stroke-width': 1.5 }),
      sv('line', { x1: JX - RR, y1: JY, x2: JX + RR, y2: JY, stroke: 'var(--line)' }),
      sv('line', { x1: JX, y1: JY - RR, x2: JX, y2: JY + RR, stroke: 'var(--line)' }),
      sv('text', { x: JX, y: 12, 'font-size': 8, fill: 'var(--muted)', 'text-anchor': 'middle' }, '上推 Y 变大'),
      sv('text', { x: JX + 56, y: JY + 3, 'font-size': 8, fill: 'var(--muted)' }, 'X→'),
      stick);
    const POS = { A: [205, 30], B: [233, 58], C: [205, 86], D: [177, 58], E: [180, 120], F: [230, 120], K: [JX, 128] };
    const btnEls = {};
    for (const p in btnMap) {
      const n = pinNum(p), L = btnMap[p];
      const [x, y] = POS[L] || [140, 120];
      const small = L === 'E' || L === 'F' || L === 'K';
      const circ = sv('circle', { r: small ? 9 : 12, fill: '#2D2D2D' });
      const g = sv('g', { class: 'hit', transform: `translate(${x} ${y})`, 'aria-label': `按键 ${L}（${pinText(n)}，按住）` },
        sv('circle', { class: 'focus-ring', r: small ? 12 : 15 }), circ,
        sv('text', { y: small ? 3 : 4, 'font-size': small ? 8.5 : 11, 'font-weight': 700, fill: '#fff', 'text-anchor': 'middle' }, L));
      if (L === 'K') g.append(sv('text', { x: 14, y: 3, 'font-size': 7.5, fill: 'var(--muted)' }, '按下摇杆'));
      s.append(g);
      pressable(g, v => { pressed[n] = v; circ.setAttribute('fill', v ? '#1A9E92' : '#2D2D2D'); paint(); });
      btnEls[L] = { n, g };
    }
    c.fig.append(s);
    const toLocal = e => {
      const r = s.getBoundingClientRect();
      return [(e.clientX - r.left) / r.width * 280, (e.clientY - r.top) / r.height * 140];
    };
    function setFrom(x, y) {
      let ux = (x - JX) / RR, uy = -(y - JY) / RR;
      const m = Math.hypot(ux, uy);
      if (m > 1) { ux /= m; uy /= m; }
      dx = ux; dy = uy; paint();
    }
    stick.addEventListener('pointerdown', e => {
      if (e.button > 0) return;
      e.preventDefault(); dragging = true;
      try { stick.setPointerCapture(e.pointerId); } catch (err) { /* */ }
      try { stick.focus({ preventScroll: true }); } catch (err) { /* */ }
    });
    stick.addEventListener('pointermove', e => { if (dragging) { const [x, y] = toLocal(e); setFrom(x, y); } });
    const release = () => { dragging = false; };
    stick.addEventListener('pointerup', release);
    stick.addEventListener('pointercancel', release);
    stick.addEventListener('lostpointercapture', release);
    const keyDir = { ArrowLeft: ['x', -1], ArrowRight: ['x', 1], ArrowUp: ['y', 1], ArrowDown: ['y', -1] };
    stick.addEventListener('keydown', e => {
      const k = keyDir[e.key];
      if (k) { e.preventDefault(); e.stopPropagation(); keys[k[0]] = k[1]; dx = keys.x; dy = keys.y; paint(); return; }
      const L = e.key.length === 1 ? e.key.toUpperCase() : (e.key === ' ' ? 'K' : '');
      if (btnEls[L] && !e.repeat) { e.preventDefault(); pressed[btnEls[L].n] = true; btnEls[L].g.querySelector('circle:nth-of-type(2)').setAttribute('fill', '#1A9E92'); paint(); }
    });
    stick.addEventListener('keyup', e => {
      const k = keyDir[e.key];
      if (k) { keys[k[0]] = 0; dx = keys.x; dy = keys.y; paint(); return; }
      const L = e.key.length === 1 ? e.key.toUpperCase() : (e.key === ' ' ? 'K' : '');
      if (btnEls[L]) { pressed[btnEls[L].n] = false; btnEls[L].g.querySelector('circle:nth-of-type(2)').setAttribute('fill', '#2D2D2D'); paint(); }
    });
    stick.addEventListener('blur', () => { keys.x = keys.y = 0; });
    c.ctl.append(el('div', { class: 'part-note', text: '拖动摇杆（松手回中）；按住 A～F、K 键。键盘：聚焦摇杆后用方向键，字母键 A～F，空格 = K' }));
    function paint() {
      stick.setAttribute('transform', `translate(${(JX + dx * RR).toFixed(1)} ${(JY - dy * RR).toFixed(1)})`);
      const names = Object.keys(btnMap).filter(p => pressed[pinNum(p)]).map(p => btnMap[p]);
      c.el.dataset.x = String(xVal()); c.el.dataset.y = String(yVal()); c.el.dataset.buttons = names.join('');
      c.setRead(`X <b>${xVal()}</b> · Y <b>${yVal()}</b> · 按键：<b>${names.length ? names.join(' ') : '无'}</b>`);
    }
    paint();
    return {
      el: c.el,
      update() {
        if (!dragging && !keys.x && !keys.y && (dx || dy)) {
          const k = reduced() ? 0 : 0.55;
          dx *= k; dy *= k;
          if (Math.hypot(dx, dy) < 0.01) { dx = 0; dy = 0; }
          paint();
        }
      },
      rebind: regs, setRunning() {},
      set(x, y) { dx = clamp(x, -1, 1); dy = clamp(y, -1, 1); dragging = true; paint(); },
      release() { dragging = false; },
      press(letter, v) { const b = btnEls[letter]; if (b) { pressed[b.n] = !!v; paint(); } },
      destroy() { c.el.remove(); }
    };
  };

  /* ---------- ultrasonic HC-SR04: obstacle distance 2…400 cm */
  F.ultrasonic = function (cfg, board) {
    const trig = pinNum(cfg.trig == null ? 2 : cfg.trig), echo = pinNum(cfg.echo == null ? 3 : cfg.echo);
    const c = makeCard('ultrasonic', cfg, '超声波测距模块', `Trig ${pinText(trig)} · Echo ${pinText(echo)}`, { wide: true });
    const init = board.sensors && board.sensors.ultrasonic && board.sensors.ultrasonic.distanceCm;
    let dist = clamp(Math.round(cfg.distanceCm || init || 20), 2, 400);
    function push() {
      if (!board.sensors) return;
      const u = board.sensors.ultrasonic;
      if (u && typeof u === 'object') { u.trig = trig; u.echo = echo; u.distanceCm = dist; }
      else board.sensors.ultrasonic = { trig, echo, distanceCm: dist };
    }
    push();
    const XA = 96, XB = 290;
    const xOf = d => XA + Math.log(d / 2) / Math.log(200) * (XB - XA);
    const dOf = x => clamp(Math.round(2 * Math.pow(200, (x - XA) / (XB - XA))), 2, 400);
    const s = sv('svg', { viewBox: '0 0 300 96', width: 300 });
    const obstacle = sv('g', { class: 'drag', tabindex: 0, role: 'slider', 'aria-label': '障碍物（左右拖动，或用方向键）', 'aria-valuemin': 2, 'aria-valuemax': 400 },
      sv('rect', { class: 'focus-ring', x: -9, y: 10, width: 18, height: 66, rx: 3 }),
      sv('rect', { x: -6, y: 13, width: 12, height: 60, rx: 2, fill: '#2D2D2D' }));
    const dlabel = sv('text', { y: 8, 'font-size': 9, 'text-anchor': 'middle', fill: 'var(--fg)', 'font-weight': 600 }, '');
    const pings = sv('g', {});
    const pingOut = sv('path', { class: 'ping', d: 'M0 -10 A12 12 0 0 1 0 10' });
    const pingBack = sv('path', { class: 'ping back', d: 'M0 -10 A12 12 0 0 0 0 10' });
    pings.append(pingOut, pingBack);
    const axis = sv('g', {});
    for (const d of [2, 10, 50, 100, 400]) {
      const x = xOf(d);
      axis.append(sv('line', { x1: x, y1: 80, x2: x, y2: 84, stroke: 'var(--muted)' }), sv('text', { x, y: 93, 'font-size': 7.5, 'text-anchor': 'middle', fill: 'var(--muted)' }, d + 'cm'));
    }
    s.append(
      sv('rect', { x: 4, y: 22, width: 76, height: 50, rx: 4, fill: '#1F5FA8' }),
      ...[23, 61].map(x => sv('g', {}, sv('circle', { cx: x, cy: 47, r: 15, fill: '#C9CED0', stroke: '#8A9092' }), sv('circle', { cx: x, cy: 47, r: 10, fill: '#5D6466' }))),
      sv('text', { x: 23, y: 18, 'font-size': 8, fill: 'var(--muted)', 'text-anchor': 'middle' }, 'T 发'),
      sv('text', { x: 61, y: 18, 'font-size': 8, fill: 'var(--muted)', 'text-anchor': 'middle' }, 'R 收'),
      sv('line', { x1: XA, y1: 80, x2: XB, y2: 80, stroke: 'var(--line)' }),
      axis, pings, obstacle, dlabel);
    c.fig.append(s);
    hdrag(obstacle, s, x => { dist = dOf(x); sl.set(dist); paint(); });
    obstacle.addEventListener('keydown', e => {
      let nd = null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nd = dist - 1;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nd = dist + 1;
      else if (e.key === 'PageUp') nd = dist + 10;
      else if (e.key === 'PageDown') nd = dist - 10;
      if (nd != null) { e.preventDefault(); e.stopPropagation(); dist = clamp(nd, 2, 400); sl.set(dist); paint(); }
    });
    const sl = slider('距离', 2, 400, 1, dist, v => v + 'cm', v => { dist = v; paint(); });
    c.ctl.append(sl.row);
    let lastPing = 0, trigHigh = false;
    const offPin = listen(board, 'pin', (n, st) => {
      if (n !== trig) return;
      const lv = st && st.level ? 1 : 0;
      if (lv && !trigHigh) {
        const t = nowMs();
        if (t - lastPing > 450 && !reduced()) {
          lastPing = t;
          pings.classList.remove('pinging');
          void pings.getBoundingClientRect();
          pings.classList.add('pinging');
        }
      }
      trigHigh = !!lv;
    });
    function paint() {
      push();
      const x = xOf(dist);
      obstacle.setAttribute('transform', `translate(${x.toFixed(1)} 0)`);
      obstacle.setAttribute('aria-valuenow', dist);
      dlabel.setAttribute('x', x.toFixed(1));
      dlabel.textContent = dist + ' cm';
      const mid = (86 + x) / 2;
      pingOut.setAttribute('transform', `translate(${mid.toFixed(1)} 47)`);
      pingBack.setAttribute('transform', `translate(${(mid - 6).toFixed(1)} 47)`);
      c.el.dataset.distance = String(dist);
      c.setRead(`障碍物 <b>${dist} cm</b> · 回波约 ${dist * 58} µs（÷58 = ${dist} cm）`);
    }
    paint();
    return {
      el: c.el, update() { push(); }, rebind: push, setRunning() {},
      setDistance(d) { dist = clamp(Math.round(d), 2, 400); sl.set(dist); paint(); },
      destroy() { offPin(); c.el.remove(); }
    };
  };

  /* ---------- IR obstacle module: distance ≤ threshold → green LED, OUT 0 */
  F.ir = function (cfg, board) {
    const pin = pinNum(cfg.pin);
    const c = makeCard('ir', cfg, '红外避障模块', pinText(pin));
    let dist = clamp(cfg.distanceCm == null ? 20 : Number(cfg.distanceCm), 1, 40);
    let th = clamp(cfg.thresholdCm == null ? 10 : Number(cfg.thresholdCm), 2, 30);
    const hit = () => dist <= th;
    const reg = () => board.setDigitalSource(pin, () => (hit() ? 0 : 1));
    reg();
    const XA = 78, XB = 150;
    const xOf = d => XA + (d - 1) / 39 * (XB - XA);
    const dOf = x => clamp(Math.round(1 + (x - XA) / (XB - XA) * 39), 1, 40);
    const s = sv('svg', { viewBox: '0 0 160 84', width: 150 });
    const obs = sv('g', { class: 'drag', tabindex: 0, role: 'slider', 'aria-label': '障碍物（左右拖动，或用方向键）', 'aria-valuemin': 1, 'aria-valuemax': 40 },
      sv('rect', { class: 'focus-ring', x: -7, y: 6, width: 14, height: 62, rx: 3 }),
      sv('rect', { x: -4.5, y: 9, width: 9, height: 56, rx: 2, fill: '#2D2D2D' }));
    const thLine = sv('line', { y1: 12, y2: 70, stroke: 'var(--turq-deep)', 'stroke-width': 1.2, 'stroke-dasharray': '3 3' });
    const obsLed = sv('circle', { cx: 18, cy: 62, r: 3.5, fill: '#3DDC84', opacity: 0.2 });
    s.append(
      sv('rect', { x: 4, y: 16, width: 62, height: 54, rx: 4, fill: '#1F5FA8' }),
      sv('rect', { x: 60, y: 22, width: 14, height: 10, rx: 4, fill: '#EAF4F4', stroke: '#9AA' }),
      sv('rect', { x: 60, y: 52, width: 14, height: 10, rx: 4, fill: '#1A1A1A' }),
      sv('rect', { x: 30, y: 30, width: 16, height: 16, rx: 2, fill: '#3A7BD5', stroke: '#DDE' }),
      sv('circle', { cx: 38, cy: 38, r: 4, fill: '#E8E8E8' }),
      sv('circle', { cx: 18, cy: 50, r: 3.5, fill: '#E5484D' }),
      sv('text', { x: 26, y: 53, 'font-size': 6.5, fill: '#E8F1FB' }, 'PWR'),
      obsLed,
      sv('text', { x: 26, y: 65, 'font-size': 6.5, fill: '#E8F1FB' }, 'OBS'),
      sv('line', { x1: XA, y1: 76, x2: XB, y2: 76, stroke: 'var(--line)' }),
      thLine, obs);
    c.fig.append(s);
    hdrag(obs, s, x => { dist = dOf(x); sl.set(dist); paint(); });
    obs.addEventListener('keydown', e => {
      let nd = null;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nd = dist - 1;
      else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nd = dist + 1;
      if (nd != null) { e.preventDefault(); e.stopPropagation(); dist = clamp(nd, 1, 40); sl.set(dist); paint(); }
    });
    const sl = slider('距离', 1, 40, 1, dist, v => v + 'cm', v => { dist = v; paint(); });
    const sl2 = slider('检测', 2, 30, 1, th, v => v + 'cm', v => { th = v; paint(); });
    sl2.input.setAttribute('aria-label', '检测距离（模块上的蓝色旋钮）');
    c.ctl.append(sl.row, sl2.row, el('div', { class: 'part-note', text: '“检测”= 模块上蓝色旋钮调的检测距离' }));
    function paint() {
      obs.setAttribute('transform', `translate(${xOf(dist).toFixed(1)} 0)`);
      obs.setAttribute('aria-valuenow', dist);
      thLine.setAttribute('x1', xOf(th).toFixed(1)); thLine.setAttribute('x2', xOf(th).toFixed(1));
      obsLed.setAttribute('opacity', hit() ? 1 : 0.2);
      c.el.dataset.detected = hit() ? '1' : '0';
      c.setRead(hit() ? `${dist} cm ≤ ${th} cm · 有障碍 → OUT <b>0</b>` : `${dist} cm > ${th} cm · 没障碍 → OUT <b>1</b>`);
    }
    paint();
    return { el: c.el, update() {}, rebind: reg, setRunning() {}, setDistance(d) { dist = clamp(d, 1, 40); sl.set(dist); paint(); }, destroy() { board.setDigitalSource(pin, () => null); c.el.remove(); } };
  };

  /* ---------- DHT11 temperature / humidity */
  F.dht11 = function (cfg, board) {
    const pin = pinNum(cfg.pin == null ? 8 : cfg.pin);
    const c = makeCard('dht11', cfg, 'DHT11 温湿度传感器', pinText(pin));
    const init = (board.sensors && board.sensors.dht) || {};
    let temp = clamp(Math.round(cfg.temperature != null ? cfg.temperature : init.temperature != null ? init.temperature : 24), 0, 50);
    let hum = clamp(Math.round(cfg.humidity != null ? cfg.humidity : init.humidity != null ? init.humidity : 46), 20, 90);
    function push() {
      if (!board.sensors) return;
      const d = board.sensors.dht;
      if (d && typeof d === 'object') { d.pin = pin; d.temperature = temp; d.humidity = hum; }
      else board.sensors.dht = { pin, temperature: temp, humidity: hum };
    }
    push();
    const s = sv('svg', { viewBox: '0 0 110 80', width: 100, 'aria-hidden': 'true' });
    const grid = sv('g', {});
    for (let r = 0; r < 5; r++) for (let q = 0; q < 4; q++) grid.append(sv('rect', { x: 38 + q * 9, y: 14 + r * 9, width: 5, height: 5, rx: 1, fill: '#2A6BB0' }));
    s.append(
      sv('rect', { x: 10, y: 4, width: 90, height: 72, rx: 5, fill: '#1F5FA8' }),
      sv('rect', { x: 32, y: 8, width: 46, height: 52, rx: 4, fill: '#4FA3E0' }),
      grid,
      sv('text', { x: 55, y: 71, 'font-size': 7.5, fill: '#E8F1FB', 'text-anchor': 'middle' }, 'DHT11  S + −'));
    c.fig.append(s);
    const s1 = slider('温度', 0, 50, 1, temp, v => v + '°C', v => { temp = v; paint(); });
    const s2 = slider('湿度', 20, 90, 1, hum, v => v + '%', v => { hum = v; paint(); });
    c.ctl.append(s1.row, s2.row);
    function paint() {
      push();
      c.el.dataset.temperature = String(temp); c.el.dataset.humidity = String(hum);
      c.setRead(`温度 <b>${temp}°C</b> · 湿度 <b>${hum}%</b>`);
    }
    paint();
    return {
      el: c.el, update() { push(); }, rebind: push, setRunning() {},
      set(t, h) { if (t != null) { temp = clamp(Math.round(t), 0, 50); s1.set(temp); } if (h != null) { hum = clamp(Math.round(h), 20, 90); s2.set(hum); } paint(); },
      destroy() { c.el.remove(); }
    };
  };

  /* ---------- LCD1602 (I2C backpack): 16×2 pixel-style cells, backlight, contrast knob */
  // 5×7 font, ASCII 0x20…0x7E, 5 column bytes each (bit 0 = top row)
  const FONT = [
    0, 0, 0, 0, 0, 0, 0, 95, 0, 0, 0, 7, 0, 7, 0, 20, 127, 20, 127, 20, 36, 42, 127, 42, 18, 35, 19, 8, 100, 98, 54, 73, 85, 34, 80, 0, 5, 3, 0, 0,
    0, 28, 34, 65, 0, 0, 65, 34, 28, 0, 8, 42, 28, 42, 8, 8, 8, 62, 8, 8, 0, 80, 48, 0, 0, 8, 8, 8, 8, 8, 0, 96, 96, 0, 0, 32, 16, 8, 4, 2,
    62, 81, 73, 69, 62, 0, 66, 127, 64, 0, 66, 97, 81, 73, 70, 33, 65, 69, 75, 49, 24, 20, 18, 127, 16, 39, 69, 69, 69, 57, 60, 74, 73, 73, 48, 1, 113, 9, 5, 3,
    54, 73, 73, 73, 54, 6, 73, 73, 41, 30, 0, 54, 54, 0, 0, 0, 86, 54, 0, 0, 0, 8, 20, 34, 65, 20, 20, 20, 20, 20, 65, 34, 20, 8, 0, 2, 1, 81, 9, 6,
    50, 73, 121, 65, 62, 126, 17, 17, 17, 126, 127, 73, 73, 73, 54, 62, 65, 65, 65, 34, 127, 65, 65, 34, 28, 127, 73, 73, 73, 65, 127, 9, 9, 1, 1, 62, 65, 65, 81, 50,
    127, 8, 8, 8, 127, 0, 65, 127, 65, 0, 32, 64, 65, 63, 1, 127, 8, 20, 34, 65, 127, 64, 64, 64, 64, 127, 2, 4, 2, 127, 127, 4, 8, 16, 127, 62, 65, 65, 65, 62,
    127, 9, 9, 9, 6, 62, 65, 81, 33, 94, 127, 9, 25, 41, 70, 70, 73, 73, 73, 49, 1, 1, 127, 1, 1, 63, 64, 64, 64, 63, 31, 32, 64, 32, 31, 127, 32, 24, 32, 127,
    99, 20, 8, 20, 99, 3, 4, 120, 4, 3, 97, 81, 73, 69, 67, 0, 0, 127, 65, 65, 2, 4, 8, 16, 32, 65, 65, 127, 0, 0, 4, 2, 1, 2, 4, 64, 64, 64, 64, 64,
    0, 1, 2, 4, 0, 32, 84, 84, 84, 120, 127, 72, 68, 68, 56, 56, 68, 68, 68, 32, 56, 68, 68, 72, 127, 56, 84, 84, 84, 24, 8, 126, 9, 1, 2, 8, 20, 84, 84, 60,
    127, 8, 4, 4, 120, 0, 68, 125, 64, 0, 32, 64, 68, 61, 0, 0, 127, 16, 40, 68, 0, 65, 127, 64, 0, 124, 4, 24, 4, 120, 124, 8, 4, 4, 120, 56, 68, 68, 68, 56,
    124, 20, 20, 20, 8, 8, 20, 20, 24, 124, 124, 8, 4, 4, 8, 72, 84, 84, 84, 32, 4, 63, 68, 64, 32, 60, 64, 64, 32, 124, 28, 32, 64, 32, 28, 60, 64, 48, 64, 60,
    68, 40, 16, 40, 68, 12, 80, 80, 80, 60, 68, 100, 84, 76, 68, 0, 8, 54, 65, 0, 0, 0, 127, 0, 0, 0, 65, 54, 8, 0, 8, 4, 8, 16, 8
  ];
  function glyph(code) {
    // returns 8 rows × 5 bits as an array of row bitmasks (bit 4 = left column)
    let cols;
    if (code >= 32 && code <= 126) cols = FONT.slice((code - 32) * 5, (code - 32) * 5 + 5);
    else if (code === 0xDF || code === 0xB0) cols = [0, 6, 9, 9, 6];          // degree sign
    else if (code === 0xFF) return [31, 31, 31, 31, 31, 31, 31, 31];            // full block
    else if (code < 32) return [0, 0, 0, 0, 0, 0, 0, 0];
    else { // unknown ROM character: deterministic pseudo-pattern (looks like katakana noise)
      let h = (code * 2654435761) >>> 0; const rows = [];
      for (let r = 0; r < 7; r++) { h = (h * 1103515245 + 12345) >>> 0; rows.push((h >>> 11) & 31); }
      rows.push(0); return rows;
    }
    const rows = [];
    for (let r = 0; r < 8; r++) {
      let m = 0;
      for (let q = 0; q < 5; q++) if (cols[q] & (1 << r)) m |= 1 << (4 - q);
      rows.push(r === 7 ? 0 : m);
    }
    return rows;
  }
  function rowCodes(row) {
    if (Array.isArray(row)) return row.map(v => (typeof v === 'number' ? v : String(v).charCodeAt(0)));
    return Array.from(String(row || '')).map(ch => ch.charCodeAt(0));
  }
  F.lcd1602 = function (cfg, board) {
    const addr = cfg.addr == null ? 0x27 : Number(cfg.addr);
    const c = makeCard('lcd1602', cfg, `LCD1602 显示屏（I2C 0x${addr.toString(16).toUpperCase()}）`, 'SDA:A4 SCL:A5', { wide: true });
    c.el.append(el('span', { class: 'stopped-tag', text: '已停止' }));
    const DOT = 3, GAP = 1, CG = 3, PAD = 8, SC = 2;
    const cw = 5 * (DOT + GAP), ch = 8 * (DOT + GAP);
    const W = PAD * 2 + 16 * cw + 15 * CG, H = PAD * 2 + 2 * ch + 6;
    const cv = el('canvas', { width: W * SC, height: H * SC, role: 'img', 'aria-label': 'LCD 屏幕' });
    const wrap = el('div', { class: 'lcd-wrap' }, cv);
    c.fig.append(wrap);
    const ctx = cv.getContext && cv.getContext('2d');
    let contrast = clamp(cfg.contrast == null ? 0.55 : Number(cfg.contrast), 0, 1);
    let dirty = true, lastKey = '';
    const offLcd = listen(board, 'lcd', () => { dirty = true; });
    const k = knob({ size: 40, value: contrast, label: 'LCD 背面对比度旋钮', body: '#3A6FD8', onChange: v => { contrast = v; dirty = true; } });
    const hintEl = el('span', { class: 'part-note' });
    c.ctl.append(el('div', { class: 'part-row', style: 'justify-content:center;gap:10px' }, k.el, el('span', { text: '背面对比度旋钮' }), hintEl));
    function draw(st) {
      if (!ctx) return;
      const bl = !!st.backlight;
      const inited = !!st.inited;
      ctx.setTransform(SC, 0, 0, SC, 0, 0);
      ctx.fillStyle = bl ? '#2E66D8' : '#14223F';
      ctx.fillRect(0, 0, W, H);
      const aText = clamp((contrast - 0.12) / 0.26, 0, 1) * (bl ? 1 : 0.32);
      const aBlock = clamp((contrast - 0.8) / 0.16, 0, 1) * (bl ? 0.92 : 0.3);
      const rows = st.ddram || [];
      for (let r = 0; r < 2; r++) {
        const codes = inited ? rowCodes(rows[r]) : [];
        for (let q = 0; q < 16; q++) {
          const x0 = PAD + q * (cw + CG), y0 = PAD + r * (ch + 6);
          const code = codes[q] == null ? 32 : codes[q];
          const g = !inited ? (r === 0 ? [31, 31, 31, 31, 31, 31, 31, 31] : null) : glyph(code);
          for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 5; x++) {
              const on = g && (g[y] & (1 << (4 - x)));
              let a;
              if (!inited) a = on ? aBlock * 0.9 + clamp((contrast - 0.55) / 0.4, 0, 1) * 0.25 * (bl ? 1 : 0.3) : 0;
              else a = on ? Math.max(aText, aBlock) : aBlock;
              ctx.fillStyle = a > 0.01 ? `rgba(236,244,255,${(0.07 + 0.93 * a).toFixed(3)})` : 'rgba(255,255,255,0.07)';
              ctx.fillRect(x0 + x * (DOT + GAP), y0 + y * (DOT + GAP), DOT, DOT);
            }
          }
        }
      }
    }
    return {
      el: c.el,
      update() {
        const st = (board.lcd && board.lcd(addr)) || {};
        const rows = (st.ddram || []).map(r => rowCodes(r).slice(0, 16).map(x => String.fromCharCode(x)).join(''));
        const key = [st.backlight, st.inited, rows.join('|'), contrast.toFixed(3)].join('#');
        if (!dirty && key === lastKey) return;
        dirty = false; lastKey = key;
        draw(st);
        const vis = st.inited ? rows.map(r => r.padEnd(16, ' ')) : ['', ''];
        c.el.dataset.row0 = vis[0] || ''; c.el.dataset.row1 = vis[1] || '';
        c.el.dataset.backlight = st.backlight ? '1' : '0';
        hintEl.textContent = contrast < 0.2 ? '太低：看不见字' : contrast > 0.84 ? '太高：满屏方块' : '';
        let txt;
        if (!st.inited) txt = '还没初始化（lcd.init()）或地址不对';
        else txt = `背光${st.backlight ? '开' : '关'} · 第 1 行「${(vis[0] || '').replace(/\s+$/, '')}」 · 第 2 行「${(vis[1] || '').replace(/\s+$/, '')}」`;
        c.setRead(txt.replace(/</g, '&lt;'), txt);
      },
      rebind() { dirty = true; }, setRunning() { dirty = true; },
      destroy() { offLcd(); c.el.remove(); }
    };
  };

  /* ---------- NeoPixel ring (WS2812b × count) */
  // board.neopixel(pin).shown holds the colours pushed by show(); SIM_SPEC §2.4 says show()
  // already applies setBrightness, so shown values are what the LEDs emit.
  F.neopixel = function (cfg, board) {
    const pin = pinNum(cfg.pin == null ? 10 : cfg.pin);
    const count = Number(cfg.count) || 12;
    const c = makeCard('neopixel', cfg, `WS2812 灯环（${count} 颗）`, pinText(pin));
    const fid = 'pglow' + (++UID);
    const s = sv('svg', { viewBox: '-62 -62 124 124', width: 120, 'aria-hidden': 'true' });
    s.append(sv('defs', {}, glowFilter(fid, 4)), sv('circle', { r: 48, fill: 'none', stroke: '#1E1E1E', 'stroke-width': 22 }));
    const px = [];
    for (let i = 0; i < count; i++) {
      const a = -Math.PI / 2 + i / count * Math.PI * 2;
      const x = Math.cos(a) * 48, y = Math.sin(a) * 48;
      const glow = sv('circle', { cx: x, cy: y, r: 9, fill: '#fff', opacity: 0, filter: `url(#${fid})` });
      const pkg = sv('rect', { x: x - 7, y: y - 7, width: 14, height: 14, rx: 2, fill: '#EFEFEF', transform: `rotate(${(a * 180 / Math.PI + 90).toFixed(1)} ${x.toFixed(2)} ${y.toFixed(2)})` });
      const dot = sv('circle', { cx: x, cy: y, r: 4.5, fill: '#CFCFCF' });
      s.append(glow, pkg, dot);
      px.push({ glow, dot, last: '' });
    }
    s.append(sv('text', { y: 4, 'font-size': 9, 'text-anchor': 'middle', fill: 'var(--muted)' }, '0 号在最上'));
    c.fig.append(s);
    let lastKey = '';
    return {
      el: c.el,
      update() {
        const st = (board.neopixel && board.neopixel(pin)) || {};
        const shown = st.shown || [];
        const key = JSON.stringify(shown) + '|' + st.brightness;
        if (key === lastKey) return;
        lastKey = key;
        let lit = 0;
        for (let i = 0; i < count; i++) {
          const v = shown[i] || [0, 0, 0];
          const rgb = [0, 1, 2].map(j => clamp(Number(v[j]) || 0, 0, 255));
          const m = Math.max(...rgb);
          const P = px[i];
          if (m <= 0) { P.dot.setAttribute('fill', '#CFCFCF'); P.glow.setAttribute('opacity', 0); continue; }
          lit++;
          const hue = rgb.map(x => Math.round(x / m * 255));
          const inten = Math.pow(m / 255, 0.45);
          P.dot.setAttribute('fill', css(mixRGB([207, 207, 207], hue, 0.35 + 0.65 * inten)));
          P.glow.setAttribute('fill', css(hue));
          P.glow.setAttribute('opacity', (0.2 + 0.8 * inten).toFixed(2));
        }
        c.el.dataset.lit = String(lit);
        c.el.dataset.first = shown[0] ? shown[0].join(',') : '';
        const b = st.brightness == null ? 255 : st.brightness;
        c.setRead(!shown.length ? '还没 show()，灯不亮' : `亮 <b>${lit}</b> 颗 · 亮度 ${b}/255 · 0 号 RGB(${(shown[0] || [0, 0, 0]).join(',')})`);
      },
      rebind() {}, setRunning() {}, destroy() { c.el.remove(); }
    };
  };

  // ------------------------------------------------------------------ public API
  function create(type, config, board) {
    const f = F[type];
    if (!f) {
      const c = makeCard('unknown', config || {}, '未知元件：' + type, '');
      c.setRead('parts.js 不认识这个元件类型');
      return { el: c.el, update() {}, destroy() { c.el.remove(); }, rebind() {}, setRunning() {} };
    }
    const p = f(config || {}, board);
    p.type = type;
    p.config = config || {};
    if (!p.rebind) p.rebind = () => {};
    if (!p.setRunning) p.setRunning = () => {};
    return p;
  }
  /* pins a part config uses (for the lab's pin panel) */
  function pinsOf(type, cfg) {
    cfg = cfg || {};
    switch (type) {
      case 'board': return [13];
      case 'rgbLed': { const P = cfg.pins || {}; return [P.r != null ? P.r : 11, P.g != null ? P.g : 10, P.b != null ? P.b : 9].map(p => pinNum(p)); }
      case 'ledBar': return (cfg.pins || [2, 3, 4, 5, 6, 7, 8, 9]).map(p => pinNum(p));
      case 'pot': case 'ldr': return [pinNum(cfg.pin == null ? 14 : cfg.pin, true)];
      case 'joystick': return [pinNum(cfg.x == null ? 14 : cfg.x, true), pinNum(cfg.y == null ? 15 : cfg.y, true)].concat(Object.keys(cfg.buttons || { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 }).map(p => pinNum(p)));
      case 'ultrasonic': return [pinNum(cfg.trig == null ? 2 : cfg.trig), pinNum(cfg.echo == null ? 3 : cfg.echo)];
      case 'lcd1602': return [18, 19];
      case 'neopixel': return [pinNum(cfg.pin == null ? 10 : cfg.pin)];
      case 'dht11': return [pinNum(cfg.pin == null ? 8 : cfg.pin)];
      default: return cfg.pin != null ? [pinNum(cfg.pin)] : [];
    }
  }

  SIM.parts = {
    create,
    pinsOf,
    types: Object.keys(F),
    audio: { toggle: audioToggle, get on() { return AUD.on; } },
    _util: { el, sv, pinNum, pinText, glyph }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SIM;
})(typeof window !== 'undefined' ? window : globalThis);
