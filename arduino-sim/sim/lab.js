/* =====================================================================
   sim/lab.js — 动手实验室 (SIM_SPEC §5.1 / §5.2)
   SIM.lab.mount(container, config) → { destroy(), run(), stop(), loadProgram(i), board, runner, … }

   Layout (same as the old web version, turquoise palette):
     left   code editor: program tabs · ▶ 运行 · ■ 停止 · ↺ 原始代码 · 速度 · 跟随行,
            textarea over a highlighted <pre>, line numbers, current-line bar,
            error-line marking, messages, status bar
     right  虚拟电路 (part cards) / 串口监视器 + 变量 + 引脚
     below  任务卡 (checkboxes remembered in localStorage, “载入参考代码”)
   Talks to the engine only through the public APIs of §2–§3:
     SIM.interp.compile(src) / new SIM.interp.Runner(program, board, {onError, onLine})
     runner.start() / stop() / tick(wallMs, speed) / state / curLine / loopCount / fastLoop / globals()
     new SIM.hw.Board({i2c, baud}) / board.reset() / on('serial'|'warn') / serialSend() / serialBaud / pin() / pinLabel() / now()
   Also exported:
     SIM.lab.highlightLines(src) → per-line HTML (used by deck.js code slides)
     SIM.lab.normCode(src)       → code as shown (leading newline / trailing blanks removed)
     SIM.lab.active()            → the lab that is currently running (only one at a time)
     SIM.icon(name)              → inline SVG icon markup shared with deck.js

   DEVIATIONS / DECISIONS (also listed in the UI builder's report):
     · Every ▶ 运行 calls board.reset() (fresh power-on: clock 0, LCD blank) before the new Runner starts,
       then re-applies config.sensors and each part's rebind(); the serial monitor is cleared too.
     · Baud mismatch garbling of program output is done here (display side); typed input is garbled by
       hw.js via board.serialSend(text, monitorBaud).
     · Tab inserts 2 spaces once the user is editing (clicked into the editor or typed). A keyboard user who
       Tabs *into* the editor can Tab straight out again (accessibility); Esc then Tab always leaves.
     · The pin panel wraps board.setDigitalSource / setAnalogSource on this lab's own board instance to know
       what an input pin would read (pure pass-through to hw.js).
     · (integration) When the editor column sits above the circuit (narrow screens), messages / status-line
       changes keep the circuit in place on screen (manual scroll anchoring; .lab has overflow-anchor:none),
       so a knob being dragged never jumps away from the finger when a runtime warning appears.
     · (integration) The serial monitor never wraps lines (white-space: pre, scrolls sideways) — one program
       line is one monitor line, as in the Arduino IDE.
   Extra (optional) config keys beyond §5.1:
     key         storage key for task checkboxes / in-session edits (deck passes one)
     lineEnding  default line ending of the serial monitor: 'none' | 'nl' | 'cr' | 'both' (default 'none')
     programs[i].note   one-line note shown under the toolbar for that program
     tasks[i].program   which program tab “载入参考代码” loads into (default: current tab)
     programs[i].expect / tasks[i].expect = 'error'   read by test/smoke.js only (must fail to compile)
     smoke       scripted interaction for test/smoke.js (ignored here; see AUTHORING_LESSONS.md §6)
   ===================================================================== */
(function (root) {
  'use strict';
  const SIM = root.SIM = root.SIM || {};
  const doc = root.document;

  // ------------------------------------------------------------------ icons
  const IC = {
    play: '<path d="M7 4.8v14.4L19 12z" fill="currentColor" stroke="none"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="1.6" fill="currentColor" stroke="none"/>',
    reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.4"/>',
    warn: '<path d="M12 3.8 2.8 19.8h18.4z"/><path d="M12 10v4.4M12 17.2v.4"/>',
    error: '<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    left: '<path d="M15 5l-7 7 7 7"/>',
    right: '<path d="M9 5l7 7-7 7"/>',
    home: '<path d="M4 11l8-6.5 8 6.5"/><path d="M6.5 9.5V19h11V9.5"/>',
    zoom: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5M11 8v6M8 11h6"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    auto: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17A8.5 8.5 0 0 0 12 3.5z" fill="currentColor"/>',
    code: '<path d="M8.5 7 3.5 12l5 5M15.5 7l5 5-5 5"/>',
    chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2.5v3.5M15 2.5v3.5M9 18v3.5M15 18v3.5M2.5 9H6M2.5 15H6M18 9h3.5M18 15h3.5"/>',
    send: '<path d="M4 12 20 4l-6 16-2.5-6.5z"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 12.5h9l1-12.5"/>',
    list: '<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="4.5" cy="6.5" r="1" fill="currentColor"/><circle cx="4.5" cy="12" r="1" fill="currentColor"/><circle cx="4.5" cy="17.5" r="1" fill="currentColor"/>',
    load: '<path d="M12 4v11M7 10.5l5 5 5-5"/><path d="M4.5 19.5h15"/>',
    bulb: '<path d="M9 17.5h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
    plug: '<path d="M9 3v5M15 3v5M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0z"/><path d="M12 17v4"/>',
    hand: '<path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4a1.5 1.5 0 0 1 3 0v6.5M14 10.5V5.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6 6 0 0 1-4.7-2.3L2.5 15.5a1.6 1.6 0 0 1 2.4-2.1L8 16"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.6M12 17v.4"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    bolt: '<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
    cube: '<path d="M12 2.8 20 7.4v9.2L12 21.2 4 16.6V7.4z"/><path d="M4 7.4 12 12l8-4.6M12 12v9.2"/>',
    wave: '<path d="M2.5 12h3l2-6 3 12 3-9 2 3h6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
    target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'
  };
  function icon(name, cls) {
    return `<svg class="i${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[name] || IC.info}</svg>`;
  }
  SIM.icon = icon;
  SIM.icons = IC;

  // ------------------------------------------------------------------ helpers
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  function h(tag, attrs, html) {
    const e = doc.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    if (html != null) e.innerHTML = html;
    return e;
  }
  function normCode(src) {
    return String(src == null ? '' : src).replace(/\r\n?/g, '\n').replace(/^[ \t]*\n/, '').replace(/\s+$/, '');
  }
  function hash(s) { let x = 5381; for (let i = 0; i < s.length; i++) x = ((x << 5) + x + s.charCodeAt(i)) | 0; return (x >>> 0).toString(36); }
  const store = {
    get(k) { try { const v = root.localStorage.getItem(k); return v == null ? null : JSON.parse(v); } catch (e) { return null; } },
    set(k, v) { try { root.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode etc. */ } }
  };
  const fmtSec = us => ((Number(us) || 0) / 1e6).toFixed(1);

  // ------------------------------------------------------------------ syntax highlighting
  const KW = new Set(('void int long short float double char byte bool boolean word String unsigned signed const static volatile ' +
    'return if else for while do break continue switch case default sizeof struct class new delete ' +
    'uint8_t int8_t uint16_t int16_t uint32_t int32_t size_t Servo LiquidCrystal_I2C Adafruit_NeoPixel dht11').split(' '));
  const CONST = new Set(('HIGH LOW INPUT OUTPUT INPUT_PULLUP LED_BUILTIN A0 A1 A2 A3 A4 A5 DEC HEX BIN OCT true false NULL ' +
    'NEO_GRB NEO_RGB NEO_RGBW NEO_KHZ800 NEO_KHZ400 PI').split(' '));
  const RX = {
    bcom: /\/\*[\s\S]*?(?:\*\/|$)/y,
    lcom: /\/\/[^\n]*/y,
    str: /"(?:\\.|[^"\\\n])*"?/y,
    chr: /'(?:\\.|[^'\\\n])*'?/y,
    pp: /#[ \t]*[A-Za-z_]+/y,
    inc: /[ \t]*<[^>\n]*>/y,
    num: /(?:0[xX][0-9a-fA-F]+|0[bB][01]+|\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+)[uUlLfF]*/y,
    id: /[A-Za-z_]\w*/y,
    ws: /\s+/y,
    call: /\s*\(/y
  };
  function tokenize(src) {
    const out = [];
    let i = 0, lastPP = '';
    const n = src.length;
    const at = (re) => { re.lastIndex = i; const m = re.exec(src); return m && m.index === i ? m[0] : null; };
    while (i < n) {
      let m, c = null;
      const ch = src[i];
      if (ch === '/' && (m = at(RX.bcom) || at(RX.lcom))) c = 'com';
      else if (ch === '"' && (m = at(RX.str))) c = 'str';
      else if (ch === "'" && (m = at(RX.chr))) c = 'str';
      else if (ch === '#' && (m = at(RX.pp))) { c = 'pp'; lastPP = m.replace(/[#\s]/g, ''); }
      else if (lastPP === 'include' && (ch === '<' || ch === ' ' || ch === '\t') && (m = at(RX.inc))) { c = 'str'; lastPP = ''; }
      else if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) { m = at(RX.num); c = 'num'; }
      else if (/[A-Za-z_]/.test(ch)) {
        m = at(RX.id);
        if (KW.has(m)) c = 'kw';
        else if (CONST.has(m)) c = 'const';
        else { RX.call.lastIndex = i + m.length; const k = RX.call.exec(src); c = (k && k.index === i + m.length) ? 'fn' : null; }
      } else if (/\s/.test(ch)) { m = at(RX.ws); if (m.indexOf('\n') >= 0) lastPP = ''; }
      if (!m) m = ch;
      out.push([c, m]);
      i += m.length;
    }
    return out;
  }
  function highlightLines(src) {
    const lines = [''];
    for (const [c, t] of tokenize(String(src))) {
      const parts = t.split('\n');
      parts.forEach((p, k) => {
        if (k > 0) lines.push('');
        if (p) lines[lines.length - 1] += c ? `<span class="tk-${c}">${esc(p)}</span>` : esc(p);
      });
    }
    return lines;
  }

  // ------------------------------------------------------------------ editor (textarea over highlighted pre)
  const LH = 20, PAD = 10;
  function makeEditor(opts) {
    const scroll = h('div', { class: 'ed-scroll' });
    const inner = h('div', { class: 'ed-inner' });
    const gutter = h('div', { class: 'ed-gutter', 'aria-hidden': 'true' });
    const code = h('div', { class: 'ed-code' });
    const marks = h('div', { class: 'ed-marks', 'aria-hidden': 'true' });
    const curMark = h('div', { class: 'ed-mark cur', hidden: true });
    marks.append(curMark);
    const pre = h('pre', { class: 'ed-hl', 'aria-hidden': 'true' });
    const ta = h('textarea', {
      class: 'ed-ta', spellcheck: 'false', wrap: 'off', autocapitalize: 'off', autocomplete: 'off', autocorrect: 'off',
      'aria-label': opts.label || 'Arduino 代码（可以修改）', 'aria-describedby': opts.describedBy || null
    });
    code.append(marks, pre, ta);
    inner.append(gutter, code);
    scroll.append(inner);

    let lineCount = 0, errLines = [], cur = 0, hlQueued = false, escMode = false, caretLn = -1;
    const errEls = [];
    function renderGutter(n) {
      if (n === lineCount) return;
      lineCount = n;
      let s = '';
      for (let i = 1; i <= n; i++) s += `<div class="ln">${i}</div>`;
      gutter.innerHTML = s;
      paintGutterMarks();
    }
    function paintGutterMarks() {
      const kids = gutter.children;
      for (let i = 0; i < kids.length; i++) {
        const ln = i + 1;
        kids[i].className = 'ln' + (ln === cur ? ' cur' : '') + (errLines.indexOf(ln) >= 0 ? ' err' : '') + (ln === caretLn ? ' caret' : '');
      }
    }
    function render() {
      hlQueued = false;
      const v = ta.value;
      pre.innerHTML = highlightLines(v).join('\n') + '\n ';
      renderGutter(v.split('\n').length);
    }
    function queue() { if (!hlQueued) { hlQueued = true; (root.requestAnimationFrame || setTimeout)(render); } }

    function insert(text) {
      let ok = false;
      try { ok = doc.execCommand('insertText', false, text); } catch (e) { ok = false; }
      if (!ok) {
        ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
    let measureCtx = null;
    function textWidth(s) {
      try {
        if (!measureCtx) measureCtx = doc.createElement('canvas').getContext('2d');
        const cs = root.getComputedStyle(ta);
        measureCtx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        return measureCtx.measureText(s.replace(/\t/g, '  ')).width;
      } catch (e) { return s.length * 7.8; }
    }
    function lineOfPos(pos) { let n = 0; const v = ta.value; for (let i = 0; i < pos; i++) if (v.charCodeAt(i) === 10) n++; return n; }
    function ensureCaret() {
      const v = ta.value, s = ta.selectionEnd;
      const ln = lineOfPos(s);
      const top = PAD + ln * LH;
      if (top < scroll.scrollTop + 2) scroll.scrollTop = Math.max(0, top - 6);
      else if (top + LH > scroll.scrollTop + scroll.clientHeight - 2) scroll.scrollTop = top + LH - scroll.clientHeight + 8;
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      const gw = gutter.offsetWidth;
      const x = 12 + textWidth(v.slice(ls, s));
      const visL = scroll.scrollLeft, visR = scroll.scrollLeft + scroll.clientWidth - gw;
      if (x < visL + 8) scroll.scrollLeft = Math.max(0, x - 40);
      else if (x > visR - 16) scroll.scrollLeft = x - (scroll.clientWidth - gw) + 48;
      setCaretLine(ln + 1);
    }
    function setCaretLine(ln) { if (ln !== caretLn) { caretLn = ln; paintGutterMarks(); } }

    ta.addEventListener('input', () => { queue(); if (errLines.length) setErr([]); opts.onChange && opts.onChange(ta.value); (root.requestAnimationFrame || setTimeout)(ensureCaret); });
    ta.addEventListener('keydown', e => {
      if (e.isComposing || e.keyCode === 229) return;
      if (e.key === 'Escape') { escMode = true; return; }
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); opts.onRun && opts.onRun(); return; }
      if (e.key === 'Tab' && !escMode && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        const s = ta.selectionStart, en = ta.selectionEnd, v = ta.value;
        if (s === en && !e.shiftKey) insert('  ');
        else {
          const ls = v.lastIndexOf('\n', s - 1) + 1;
          let le = v.indexOf('\n', en > s ? en - 1 : en); if (le < 0) le = v.length;
          const lines = v.slice(ls, le).split('\n');
          const nb = (e.shiftKey ? lines.map(l => l.replace(/^( {1,2}|\t)/, '')) : lines.map(l => '  ' + l)).join('\n');
          ta.setSelectionRange(ls, le);
          insert(nb);
          ta.setSelectionRange(ls, ls + nb.length);
        }
        return;
      }
      if (e.key !== 'Shift' && !/^(Arrow|Home|End|Page)/.test(e.key)) escMode = false;
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const s = ta.selectionStart, v = ta.value;
        const ls = v.lastIndexOf('\n', s - 1) + 1;
        const before = v.slice(ls, s);
        const ind = /^[ \t]*/.exec(before)[0];
        const extra = /\{\s*$/.test(before) ? '  ' : '';
        e.preventDefault();
        insert('\n' + ind + extra);
      }
    });
    ta.addEventListener('keyup', e => { if (/^(Arrow|Home|End|Page)/.test(e.key)) ensureCaret(); });
    ta.addEventListener('click', () => setCaretLine(lineOfPos(ta.selectionEnd) + 1));
    // keyboard users who Tab *into* the editor can Tab straight out again until they start typing;
    // clicking into the editor (or typing) makes Tab insert two spaces. Esc then Tab always leaves.
    let pointerFocus = false;
    ta.addEventListener('pointerdown', () => { pointerFocus = true; escMode = false; });
    ta.addEventListener('focus', () => { escMode = !pointerFocus; pointerFocus = false; });
    ta.addEventListener('blur', () => { escMode = false; pointerFocus = false; setCaretLine(-1); });

    function setErr(lines) {
      errLines = (lines || []).filter(n => n > 0);
      errEls.splice(0).forEach(x => x.remove());
      for (const ln of errLines) {
        const m = h('div', { class: 'ed-mark err' });
        m.style.top = (PAD + (ln - 1) * LH) + 'px';
        marks.append(m); errEls.push(m);
      }
      paintGutterMarks();
    }
    function setCur(ln) {
      ln = ln > 0 ? ln : 0;
      if (ln === cur) return;
      cur = ln;
      if (!ln) curMark.hidden = true;
      else { curMark.hidden = false; curMark.style.top = (PAD + (ln - 1) * LH) + 'px'; }
      paintGutterMarks();
    }
    function revealLine(ln, center) {
      if (!ln) return;
      const top = PAD + (ln - 1) * LH;
      const vh = scroll.clientHeight;
      if (center || top < scroll.scrollTop || top + LH > scroll.scrollTop + vh) {
        scroll.scrollTop = Math.max(0, top - (center ? vh / 2 - LH : vh / 3));
      }
    }
    function gotoLine(ln) {
      const v = ta.value;
      let pos = 0;
      for (let i = 1; i < ln && pos >= 0; i++) { pos = v.indexOf('\n', pos); if (pos >= 0) pos++; }
      if (pos < 0) pos = v.length;
      try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); }
      ta.setSelectionRange(pos, pos);
      revealLine(ln, true);
      setCaretLine(ln);
    }
    return {
      el: scroll, ta,
      get value() { return ta.value; },
      setValue(v) { ta.value = v; render(); setErr([]); scroll.scrollTop = 0; scroll.scrollLeft = 0; },
      setErr, setCur, revealLine, gotoLine, render
    };
  }

  // ------------------------------------------------------------------ serial helpers
  const JUNK = '⸮ÿ⸮ø¿Æ⸮Ðþ§¤⸮Ÿ®°±¶×⸮ã';
  let junkSeed = 7;
  function garble(t) {
    let o = '';
    for (const ch of t) {
      if (ch === '\n' || ch === '\r') { o += ch; continue; }
      junkSeed = (junkSeed * 31 + ch.charCodeAt(0) + 11) % 9973;
      if (junkSeed % 3 === 0) continue;
      o += JUNK[junkSeed % JUNK.length];
    }
    return o;
  }
  const ENDINGS = [['none', '没有结束符', ''], ['nl', '换行', '\n'], ['cr', '回车', '\r'], ['both', '换行和回车', '\r\n']];
  const SPEEDS = [[0.1, '0.1× 慢动作'], [0.5, '0.5×'], [1, '1×'], [2, '2×'], [5, '5×']];
  const SERIAL_MAX = 500;

  // ------------------------------------------------------------------ mount
  const ACTIVE = { lab: null };
  const EDITS = new Map(); // in-session edits: key → {programIndex: code}
  let LAB_UID = 0;

  function mount(container, config) {
    config = config || {};
    const uid = ++LAB_UID;
    const programs = (config.programs && config.programs.length ? config.programs : [{ name: 'sketch.ino', code: 'void setup() {\n}\n\nvoid loop() {\n}' }])
      .map(p => Object.assign({}, p, { code: normCode(p.code) }));
    const key = String(config.key || config.id || ('lab-' + hash(programs.map(p => p.code).join('\n'))));
    const edits = EDITS.get(key) || {};
    EDITS.set(key, edits);

    const rootEl = h('div', { class: 'lab', 'data-state': 'idle' });
    container.append(rootEl);

    if (!SIM.interp || typeof SIM.interp.compile !== 'function' || !SIM.hw || typeof SIM.hw.Board !== 'function' || !SIM.parts) {
      rootEl.innerHTML = `<div class="lab-error">${icon('warn')} 模拟器引擎没有加载成功（需要 sim/interp.js、sim/hw.js、sim/parts.js）。请确认这些文件和 index.html 在同一个文件夹结构里，然后刷新页面。</div>`;
      const stub = { el: rootEl, board: null, runner: null, parts: [], run() { return false; }, stop() {}, loadProgram() {}, destroy() { rootEl.remove(); } };
      return stub;
    }

    // ---------------- board + parts
    const partCfgs = config.parts || [{ type: 'board' }];
    const i2c = Array.isArray(config.i2c) ? config.i2c.slice()
      : partCfgs.filter(p => p.type === 'lcd1602').map(p => (p.addr == null ? 0x27 : Number(p.addr)));
    const board = new SIM.hw.Board({ i2c, baud: config.baud || 9600 });
    if (!board.sensors) board.sensors = {};
    function applySensors() {
      const S = config.sensors;
      if (!S) return;
      if (!board.sensors) board.sensors = {};
      for (const k in S) {
        const v = S[k], cur = board.sensors[k];
        if (v && typeof v === 'object') {
          if (cur && typeof cur === 'object') Object.assign(cur, v); else board.sensors[k] = Object.assign({}, v);
        } else board.sensors[k] = v;
      }
    }
    applySensors();
    // remember input sources so the pin panel can show what the program would read
    const dsrc = {}, asrc = {};
    if (typeof board.setDigitalSource === 'function') {
      const o = board.setDigitalSource.bind(board);
      board.setDigitalSource = (n, f) => { dsrc[n] = f; return o(n, f); };
    }
    if (typeof board.setAnalogSource === 'function') {
      const o = board.setAnalogSource.bind(board);
      board.setAnalogSource = (n, f) => { asrc[n] = f; return o(n, f); };
    }

    // ---------------- DOM
    if (config.note) rootEl.append(h('div', { class: 'lab-note' }, `${icon('info')} ${config.note}`));
    const grid = h('div', { class: 'lab-grid' });
    rootEl.append(grid);

    // editor column
    const edEl = h('section', { class: 'ed', 'aria-label': '代码编辑器' });
    const bar = h('div', { class: 'ed-bar' });
    const tabs = h('div', { class: 'ed-tabs', role: 'tablist', 'aria-label': '程序' });
    const actions = h('div', { class: 'ed-actions' });
    const bRun = h('button', { type: 'button', class: 'btn btn-run', title: '编译并从头运行（Ctrl+Enter）' }, `${icon('play')}<span>运行</span>`);
    const bStop = h('button', { type: 'button', class: 'btn btn-stop', title: '停止程序', disabled: true }, `${icon('stop')}<span>停止</span>`);
    const bReset = h('button', { type: 'button', class: 'btn btn-reset', title: '恢复这段程序的原始代码' }, `${icon('reset')}<span>原始代码</span>`);
    const speedSel = h('select', { 'aria-label': '运行速度' }, SPEEDS.map(([v, t]) => `<option value="${v}"${v === 1 ? ' selected' : ''}>${t}</option>`).join(''));
    const speedLbl = h('label', { class: 'ed-opt speed', title: '虚拟时间的速度：慢动作时能看清每一行' }, '<span class="lbl-txt">速度</span>');
    speedLbl.append(speedSel);
    const followCb = h('input', { type: 'checkbox', checked: true });
    const followLbl = h('label', { class: 'ed-opt follow', title: '运行时让编辑器跟着当前执行的行滚动' });
    followLbl.append(followCb, h('span', { text: '跟随行' }));
    actions.append(bRun, bStop, bReset, speedLbl, followLbl);
    bar.append(tabs, actions);
    const noteEl = h('div', { class: 'ed-note', hidden: true });
    const helpId = 'labhelp' + uid;
    const help = h('span', { class: 'sr-only', id: helpId, text: '可以直接修改代码。开始输入后 Tab 插入 2 个空格；先按 Esc 再按 Tab 可以离开编辑器；Ctrl+Enter 运行。' });
    const ed = makeEditor({ describedBy: helpId, onChange: onEdit, onRun: () => run() });
    const msgs = h('div', { class: 'ed-msgs', 'aria-live': 'polite' });
    const status = h('div', { class: 'ed-status idle', role: 'status' }, '<span class="dot"></span><span class="st-text"></span>');
    const stText = status.querySelector('.st-text');
    edEl.append(bar, noteEl, help, ed.el, msgs, status);

    // right column
    const side = h('div', { class: 'lab-side' });
    const circuit = h('section', { class: 'circuit', 'aria-label': '虚拟电路' },
      `<div class="panel-head"><span>${icon('chip')} 虚拟电路</span><span class="hint">按住按键 · 拖动旋钮 / 磁铁 / 障碍物 · 方向键也能操作</span></div>`);
    const cgrid = h('div', { class: 'circuit-grid' });
    circuit.append(cgrid);
    const io = h('div', { class: 'lab-io' });

    // serial monitor
    const serial = h('section', { class: 'serial', 'aria-label': '串口监视器' });
    const sHead = h('div', { class: 'serial-head' }, '<b>串口监视器</b>');
    const baudSel = h('select', { 'aria-label': '串口监视器波特率' }, [9600, 115200].map(b => `<option value="${b}">${b}</option>`).join(''));
    baudSel.value = String(config.baud === 115200 ? 115200 : 9600);
    const autoCb = h('input', { type: 'checkbox', checked: true });
    const autoLbl = h('label', { class: 'chk', title: '有新内容时自动滚到最底下' });
    autoLbl.append(autoCb, h('span', { text: '自动滚动' }));
    const bClear = h('button', { type: 'button', class: 'btn', title: '清空串口监视器' }, '清空');
    sHead.append(autoLbl, baudSel, bClear);
    const baudWarn = h('div', { class: 'serial-baudwarn', hidden: true });
    const out = h('pre', { class: 'serial-out', tabindex: '0', 'aria-label': '串口输出', 'aria-live': 'off' });
    const sIn = h('div', { class: 'serial-in' });
    const inp = h('input', { type: 'text', placeholder: '输入要发送的内容，回车发送', 'aria-label': '要发送给 Arduino 的内容', autocomplete: 'off', spellcheck: 'false' });
    const endSel = h('select', { 'aria-label': '行结束符', title: '行结束符：发送时自动加在后面的字符' }, ENDINGS.map(([v, t]) => `<option value="${v}">${t}</option>`).join(''));
    endSel.value = ENDINGS.some(e => e[0] === config.lineEnding) ? config.lineEnding : 'none';
    const bSend = h('button', { type: 'button', class: 'btn send' }, '发送');
    sIn.append(inp, endSel, bSend);
    const sentEl = h('div', { class: 'serial-sent', 'aria-live': 'polite' });
    serial.append(sHead, baudWarn, out, sentEl, sIn);

    // inspector: variables + pins
    const inspect = h('section', { class: 'inspect', 'aria-label': '变量和引脚' });
    const varsEl = h('div', { class: 'vars' }, '<div class="panel-head"><span>变量</span><span class="hint">全局变量的实时值</span></div>');
    const varsBody = h('div', { class: 'vars-body' });
    varsEl.append(varsBody);
    const pinsEl = h('div', { class: 'pins' }, '<div class="panel-head"><span>引脚</span><span class="hint">模式 · 电平 · PWM</span></div>');
    const pinsBody = h('div', { class: 'pins-body' });
    pinsEl.append(pinsBody);
    inspect.append(varsEl, pinsEl);
    io.append(serial, inspect);
    side.append(circuit, io);
    grid.append(edEl, side);

    // parts
    const parts = [];
    for (const pc of partCfgs) {
      try {
        const p = SIM.parts.create(pc.type, pc, board);
        parts.push(p);
        cgrid.append(p.el);
      } catch (e) {
        if (root.console) console.warn('[lab] part failed', pc, e);
      }
    }
    const boardPart = parts.find(p => p.type === 'board');

    // tasks
    const tasks = config.tasks || [];
    const taskKey = 'sim-tasks:' + key;
    let done = new Set(store.get(taskKey) || []);
    let tasksHead = null;
    const taskEls = [];
    if (tasks.length) {
      const sec = h('section', { class: 'lab-tasks', 'aria-label': '任务' });
      tasksHead = h('div', { class: 'panel-head' });
      const ol = h('ol');
      tasks.forEach((t, i) => {
        const li = h('li', { class: 'task' });
        const chk = h('label', { class: 'chk', title: '做完了就勾上' });
        const cb = h('input', { type: 'checkbox', 'aria-label': `任务 ${i + 1} 完成` });
        cb.checked = done.has(i);
        chk.append(cb, h('span', { text: String(i + 1) }));
        const body = h('div', { class: 'task-body' });
        body.append(h('div', { class: 'task-text' }, typeof t === 'string' ? t : (t.text || '')));
        if (t && t.code) {
          const b = h('button', { type: 'button', class: 'btn small' }, `${icon('load')}<span>载入参考代码</span>`);
          b.addEventListener('click', () => loadTaskCode(i));
          body.append(b);
        }
        cb.addEventListener('change', () => {
          if (cb.checked) done.add(i); else done.delete(i);
          store.set(taskKey, Array.from(done).sort((a, b) => a - b));
          paintTasks();
        });
        li.append(chk, body);
        ol.append(li);
        taskEls.push({ li, cb });
      });
      sec.append(tasksHead, ol);
      rootEl.append(sec);
    }
    function paintTasks() {
      if (!tasksHead) return;
      taskEls.forEach(({ li, cb }, i) => { cb.checked = done.has(i); li.classList.toggle('done', done.has(i)); });
      tasksHead.innerHTML = `<span>${icon('flag')} 动手任务</span><span class="hint">完成 <b>${done.size}</b> / ${tasks.length} · 勾选会被记住</span>`;
    }
    paintTasks();

    // ---------------- state
    let cur = 0, runner = null, state = 'idle', speed = 1, raf = 0, lastTs = 0, slowTs = 0, destroyed = false;
    let lastLine = 0, editedWhileRunning = false, lastErrLine = 0;
    const warned = new Set();

    // ---------------- tabs / programs
    function originalOf(i) { return programs[i].code; }
    function codeOf(i) { return edits[i] != null ? edits[i] : programs[i].code; }
    function renderTabs() {
      tabs.innerHTML = '';
      programs.forEach((p, i) => {
        const mod = edits[i] != null && edits[i] !== originalOf(i);
        const label = programs.length > 1 && p.label ? p.label : (p.name || ('程序 ' + (i + 1)));
        const t = h('button', { type: 'button', class: 'ed-tab', role: 'tab', 'aria-selected': String(i === cur), title: p.name || '' },
          `${icon('code')}<span class="nm">${esc(label)}</span>${mod ? '<span class="mod">已修改</span>' : ''}`);
        t.addEventListener('click', () => loadProgram(i));
        tabs.append(t);
      });
    }
    function showNote() {
      const n = programs[cur].note;
      keepPlace(() => {
        noteEl.hidden = !n;
        noteEl.innerHTML = n ? `${icon('info')}<span>${n}</span>` : '';
      });
    }
    function loadProgram(i) {
      i = Math.max(0, Math.min(programs.length - 1, Number(i) || 0));
      if (i === cur && ed.value === codeOf(i)) return;
      const wasRunning = state === 'running';
      if (wasRunning) stop();
      cur = i;
      ed.setValue(codeOf(i));
      ed.setCur(0);
      clearMsgs();
      renderTabs(); showNote();
      if (wasRunning || state !== 'idle') { state = 'idle'; rootEl.dataset.state = 'idle'; }
      setStatus('idle', `已切换到「${programs[i].label || programs[i].name}」· 点 ▶ 运行`);
    }
    function onEdit(v) {
      edits[cur] = v;
      const mod = v !== originalOf(cur);
      const tab = tabs.children[cur];
      if (tab) {
        const m = tab.querySelector('.mod');
        if (mod && !m) tab.insertAdjacentHTML('beforeend', '<span class="mod">已修改</span>');
        else if (!mod && m) m.remove();
      }
      if (state === 'running' && !editedWhileRunning) {
        editedWhileRunning = true;
        addMsg('info', '代码改了：再点一次 <b>▶ 运行</b> 才会用新代码重新开始。');
      }
    }
    function loadTaskCode(i) {
      const t = tasks[i];
      if (!t || !t.code) return;
      const target = t.program != null ? Math.max(0, Math.min(programs.length - 1, t.program)) : cur;
      if (target !== cur) loadProgram(target);
      const prev = ed.value;
      const code = normCode(t.code);
      if (state === 'running') stop();
      ed.setValue(code);
      onEdit(code);
      clearMsgs();
      addMsg('info', `已载入任务 ${i + 1} 的参考代码，点 <b>▶ 运行</b> 看效果。`, { text: '撤销', fn: () => { ed.setValue(prev); onEdit(prev); clearMsgs(); } });
      setStatus('idle', `已载入任务 ${i + 1} 的参考代码 · 点 ▶ 运行`);
    }

    // ---------------- messages / status
    // Narrow layout: the editor column (messages, status bar) sits ABOVE the circuit. A runtime warning or a
    // status line that wraps would push the parts down while a student is dragging a knob below — the knob
    // would jump away from the finger. Keep the circuit where it is (manual scroll anchoring; native CSS
    // anchoring is switched off for .lab so the two never add up, and Safari has none).
    function keepPlace(fn) {
      let top = null;
      try {
        const r = circuit.getBoundingClientRect(), vh = root.innerHeight || 0;
        if (r.bottom > 0 && r.top < vh && edEl.getBoundingClientRect().bottom <= r.top + 1) top = r.top;
      } catch (e) { top = null; }
      fn();
      if (top != null) {
        const d = circuit.getBoundingClientRect().top - top;
        if (Math.abs(d) >= 1) { try { root.scrollBy(0, d); } catch (e) { /* */ } }
      }
    }
    function clearMsgs() { if (msgs.firstChild) keepPlace(() => { msgs.innerHTML = ''; }); warned.clear(); }
    function addMsg(kind, html, action) {
      let m;
      keepPlace(() => { m = addMsg_(kind, html, action); });
      return m;
    }
    function addMsg_(kind, html, action) {
      const m = h('div', { class: 'ed-msg ' + kind }, `${icon(kind === 'err' ? 'error' : kind === 'warn' ? 'warn' : 'info')}<span class="tx">${html}</span>`);
      if (action) {
        const b = h('button', { type: 'button', text: action.text });
        b.addEventListener('click', action.fn);
        m.append(b);
      }
      msgs.append(m);
      while (msgs.children.length > 6) msgs.firstChild.remove();
      return m;
    }
    // errors are listed under the editor: make sure the student sees them (page may be scrolled)
    function showStatus() {
      try {
        const r = status.getBoundingClientRect(), vh = root.innerHeight || 0;
        if (vh && (r.bottom > vh - 64 || r.top < 0)) status.scrollIntoView({ block: 'end', behavior: 'smooth' });
      } catch (e) { /* */ }
    }
    function setStatus(kind, text) {
      status.className = 'ed-status ' + kind;
      if (stText.textContent !== text) keepPlace(() => { stText.textContent = text; });
    }
    function runningText() {
      if (!runner) return '';
      const n = Number(runner.loopCount) || 0;
      let t = `运行中 · loop() 已执行 ${n} 次 · ${fmtSec(board.now())} 秒`;
      if (runner.fastLoop) t += ' · 全速循环中';
      if (speed !== 1) t += ` · ${speed}× 速度`;
      return t;
    }

    // ---------------- serial
    let serLines = [], serPartial = '', serDirty = true, garbledSeen = false, sentT = 0;
    function onSerial(text) {
      if (destroyed) return;
      let t = String(text == null ? '' : text);
      const pb = board.serialBaud;
      if (pb != null && Number(pb) !== Number(baudSel.value)) { t = garble(t); garbledSeen = true; }
      appendSerial(t);
    }
    function appendSerial(t) {
      t = t.replace(/\r\n/g, '\n').replace(/\r/g, '');
      if (!t) return;
      const ps = (serPartial + t).split('\n');
      serPartial = ps.pop();
      if (ps.length >= SERIAL_MAX) serLines = ps.slice(ps.length - SERIAL_MAX);
      else if (ps.length) {
        for (const l of ps) serLines.push(l);
        if (serLines.length > SERIAL_MAX) serLines.splice(0, serLines.length - SERIAL_MAX);
      }
      if (serPartial.length > 2000) { serLines.push(serPartial); serPartial = ''; }
      serDirty = true;
    }
    function renderSerial() {
      serDirty = false;
      const text = serLines.length ? serLines.join('\n') + '\n' + serPartial : serPartial;
      if (!text) {
        out.innerHTML = `<span class="ph">程序里 Serial.print() / println() 输出的内容会显示在这里。</span>`;
        out.classList.remove('garbled');
        return;
      }
      out.textContent = text;
      out.classList.toggle('garbled', garbledSeen && board.serialBaud != null && Number(board.serialBaud) !== Number(baudSel.value));
      if (autoCb.checked) out.scrollTop = out.scrollHeight;
    }
    function clearSerial() { serLines = []; serPartial = ''; garbledSeen = false; serDirty = true; }
    function paintBaudWarn() {
      const pb = board.serialBaud;
      const bad = pb != null && Number(pb) !== Number(baudSel.value);
      const html = bad ? `程序里是 <b>Serial.begin(${pb})</b>，监视器选的是 ${baudSel.value} → 显示乱码。把波特率改成 <b>${pb}</b>。` : '';
      if (baudWarn.innerHTML !== html) baudWarn.innerHTML = html;
      baudWarn.hidden = !bad;
    }
    function send() {
      const v = inp.value;
      const end = ENDINGS.find(e => e[0] === endSel.value) || ENDINGS[0];
      try { board.serialSend(v + end[2], Number(baudSel.value)); } catch (e) { /* ignore */ }
      if (boardPart && boardPart.rxFlash) boardPart.rxFlash();
      sentEl.textContent = `已发送：${JSON.stringify(v)}${end[2] ? ' + ' + end[1] : '（没有结束符）'}${state === 'running' ? '' : ' · 程序没在运行，字符会留在接收缓冲区'}`;
      sentT = performance.now();
      if (v) { hist.push(v); if (hist.length > 30) hist.shift(); }
      histPos = hist.length;
      inp.value = '';
    }
    const hist = []; let histPos = 0;
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); send(); }
      else if (e.key === 'ArrowUp' && hist.length) { e.preventDefault(); histPos = Math.max(0, histPos - 1); inp.value = hist[histPos] || ''; }
      else if (e.key === 'ArrowDown' && hist.length) { e.preventDefault(); histPos = Math.min(hist.length, histPos + 1); inp.value = hist[histPos] || ''; }
    });
    bSend.addEventListener('click', send);
    bClear.addEventListener('click', () => { clearSerial(); renderSerial(); });
    baudSel.addEventListener('change', () => { board.monitorBaud = Number(baudSel.value); paintBaudWarn(); serDirty = true; });
    board.monitorBaud = Number(baudSel.value);
    autoCb.addEventListener('change', () => { if (autoCb.checked) out.scrollTop = out.scrollHeight; });

    // ---------------- variables / pins
    let varsHtml = '', pinsHtml = '';
    const prevVals = {}, changedAt = {};
    function renderVars(now) {
      let html;
      if (!runner) html = '<div class="empty">点 ▶ 运行后，这里实时显示全局变量的值。</div>';
      else {
        let g = [];
        try { g = runner.globals() || []; } catch (e) { g = []; }
        if (!g.length) html = '<div class="empty">（这段程序没有全局变量）</div>';
        else {
          html = '<table><tbody>' + g.map(v => {
            const val = String(v.value);
            if (prevVals[v.name] !== undefined && prevVals[v.name] !== val) changedAt[v.name] = now;
            prevVals[v.name] = val;
            const ch = now - (changedAt[v.name] || -1e9) < 700;
            return `<tr${ch ? ' class="changed"' : ''}><td class="n" title="${esc(v.name)}">${esc(v.name)}</td><td class="t"><span title="${esc(v.type || '')}">${esc(v.type || '')}</span></td><td class="v">${esc(val)}</td></tr>`;
          }).join('') + '</tbody></table>';
        }
      }
      if (html !== varsHtml) { varsHtml = html; varsBody.innerHTML = html; }
    }
    const i2cPins = partCfgs.some(pc => pc.type === 'lcd1602');
    const partPins = new Set();
    for (const pc of partCfgs) { try { (SIM.parts.pinsOf ? SIM.parts.pinsOf(pc.type, pc) : []).forEach(n => { if (n >= 0 && n < 20) partPins.add(n); }); } catch (e) { /* */ } }
    // pins driven by a module protocol rather than a plain level (shown instead of “浮空”)
    const pinRole = {};
    const pn = v => { try { return SIM.parts._util.pinNum(v); } catch (e) { return Number(v); } };
    for (const pc of partCfgs) {
      if (pc.type === 'ultrasonic') pinRole[pn(pc.echo == null ? 3 : pc.echo)] = '等回波';
      if (pc.type === 'dht11') pinRole[pn(pc.pin == null ? 8 : pc.pin)] = 'DHT 数据';
    }
    const label = n => (typeof board.pinLabel === 'function' ? board.pinLabel(n) : (n >= 14 ? 'A' + (n - 14) : 'D' + n));
    function srcVal(f) { try { return f(); } catch (e) { return null; } }
    function renderPins() {
      const used = new Set(partPins);
      for (let n = 0; n < 20; n++) { const p = board.pin(n); if (p && (p.mode || p.pwm != null)) used.add(n); }
      const list = Array.from(used).sort((a, b) => a - b);
      let html;
      if (!list.length) html = '<div class="empty">（还没有用到引脚）</div>';
      else {
        html = '<table><tbody>' + list.map(n => {
          const p = board.pin(n) || {};
          if (i2cPins && (n === 18 || n === 19) && !p.mode) return `<tr><td class="p">${label(n)}</td><td class="m">I2C ${n === 18 ? 'SDA' : 'SCL'}</td><td class="l"><span class="lv">总线</span></td></tr>`;
          const mode = p.mode === 'OUTPUT' ? '输出' : p.mode === 'INPUT_PULLUP' ? '输入·上拉' : p.mode === 'INPUT' ? (p.pullup ? '输入·上拉' : '输入') : (asrc[n] && n >= 14 ? '模拟输入' : '—');
          let val;
          const pwm = p.pwm;
          if (pwm != null && pwm > 0 && pwm < 255) {
            val = `<div class="pwm"><span class="bar"><i style="width:${(pwm / 255 * 100).toFixed(1)}%"></i></span><span>PWM ${pwm}</span></div>`;
          } else if (p.mode === 'OUTPUT' || pwm != null) {
            const hi = pwm != null ? pwm >= 255 : !!p.level;
            val = `<span class="lv${hi ? ' hi' : ''}">${hi ? 'HIGH' : 'LOW'}</span>`;
          } else if (asrc[n] && n >= 14 && p.mode !== 'INPUT_PULLUP' && !(dsrc[n] && srcVal(dsrc[n]) != null)) {
            const a = Math.max(0, Math.min(1023, Math.round(Number(srcVal(asrc[n])) || 0)));
            val = `<div class="pwm"><span class="bar"><i style="width:${(a / 1023 * 100).toFixed(1)}%"></i></span><span>${a}</span></div>`;
          } else {
            const d = dsrc[n] ? srcVal(dsrc[n]) : null;
            if (d != null) val = `<span class="lv${d ? ' hi' : ''}">${d ? 'HIGH' : 'LOW'}</span>`;
            else if (pinRole[n]) val = `<span class="lv">${pinRole[n]}</span>`;
            else if (p.pullup || p.mode === 'INPUT_PULLUP') val = '<span class="lv hi">HIGH</span>';
            else if (p.mode === 'INPUT') val = '<span class="lv">浮空</span>';
            else val = '<span class="lv">—</span>';
          }
          return `<tr><td class="p">${label(n)}</td><td class="m">${mode}</td><td class="l">${val}</td></tr>`;
        }).join('') + '</tbody></table>';
      }
      if (html !== pinsHtml) { pinsHtml = html; pinsBody.innerHTML = html; }
    }

    // ---------------- run / stop
    function normErr(e) {
      if (e && typeof e === 'object') return { line: Number(e.line) || 0, msg: String(e.msg || e.message || e) };
      return { line: 0, msg: String(e) };
    }
    function onRunError(e) {
      const er = normErr(e);
      if (destroyed) return;
      const k = er.line + '|' + er.msg;
      if (warned.has(k)) return;
      warned.add(k);
      lastErrLine = er.line;
      addMsg('warn', esc(er.msg), er.line ? { text: `跳到第 ${er.line} 行`, fn: () => ed.gotoLine(er.line) } : null);
    }
    function onWarn(msg) {
      if (destroyed) return;
      const k = 'w|' + msg;
      if (warned.has(k)) return;
      warned.add(k);
      addMsg('warn', esc(msg));
    }
    function fatal(e, where) {
      if (root.console) console.warn('[lab] ' + (where || '') + ' failed', e);
      try { if (runner) runner.stop(); } catch (x) { /* */ }
      state = 'error'; rootEl.dataset.state = 'error';
      parts.forEach(p => { try { p.setRunning(false); } catch (x) { /* */ } });
      setStatus('error', '模拟器内部错误：' + (e && e.message ? e.message : e));
      addMsg('err', '模拟器内部错误：' + esc(e && e.message ? e.message : e) + '。可以点 ↺ 原始代码 再试，或换一种写法。');
      ed.setCur(0);
      bStop.disabled = true;
      if (ACTIVE.lab === api) ACTIVE.lab = null;
    }
    function run() {
      if (destroyed) return false;
      if (ACTIVE.lab && ACTIVE.lab !== api) { try { ACTIVE.lab.stop(); } catch (e) { /* */ } }
      if (runner && state === 'running') { try { runner.stop(); } catch (e) { /* */ } }
      clearMsgs();
      ed.setErr([]); ed.setCur(0);
      editedWhileRunning = false; lastLine = 0; lastErrLine = 0;
      const src = ed.value;
      let res;
      try { res = SIM.interp.compile(src); } catch (e) { res = { ok: false, errors: [{ line: 0, msg: '模拟器内部错误（编译时）：' + (e && e.message ? e.message : e) }] }; if (root.console) console.warn(e); }
      if (!res || !res.ok) {
        const errs = ((res && res.errors) || []).map(normErr);
        if (!errs.length) errs.push({ line: 0, msg: '编译失败' });
        runner = null;
        // nothing was uploaded: an old run's output would look like it came from the broken program
        clearSerial(); renderSerial();
        ed.setErr(errs.map(e => e.line));
        errs.slice(0, 5).forEach(e => addMsg('err', esc(e.msg), e.line ? { text: `跳到第 ${e.line} 行`, fn: () => ed.gotoLine(e.line) } : null));
        state = 'error'; rootEl.dataset.state = 'error';
        rootEl.classList.remove('stopped');
        setStatus('error', '编译错误：' + errs[0].msg);
        if (errs[0].line) ed.revealLine(errs[0].line, true);
        showStatus();
        bStop.disabled = true;
        parts.forEach(p => { try { p.setRunning(false); } catch (x) { /* */ } });
        renderVars(performance.now());
        return false;
      }
      // compile warnings (e.g. `if (x = 0)`): shown, but the program still runs
      ((res && res.warnings) || []).slice(0, 3).map(normErr).forEach(w => {
        warned.add(w.line + '|' + w.msg);
        addMsg('warn', esc(w.msg), w.line ? { text: `跳到第 ${w.line} 行`, fn: () => ed.gotoLine(w.line) } : null);
      });
      try { board.reset(); } catch (e) { /* */ }
      applySensors();
      parts.forEach(p => { try { p.rebind(); } catch (e) { /* */ } });
      clearSerial(); renderSerial();
      for (const k in prevVals) delete prevVals[k];
      try {
        runner = new SIM.interp.Runner(res.program, board, { onError: onRunError, onLine: null });
      } catch (e) { fatal(e, 'Runner'); return false; }
      parts.forEach(p => { try { p.setRunning(true); } catch (e) { /* */ } });
      state = 'running'; rootEl.dataset.state = 'running';
      rootEl.classList.remove('stopped');
      ACTIVE.lab = api;
      bStop.disabled = false;
      bRun.title = '重新编译并从头运行（Ctrl+Enter）';
      try { runner.start(); } catch (e) { fatal(e, 'start'); return false; }
      setStatus('running', runningText());
      lastTs = 0;
      return true;
    }
    function stop() {
      if (!runner || state !== 'running') return;
      try { runner.stop(); } catch (e) { /* */ }
      state = 'stopped'; rootEl.dataset.state = 'stopped';
      rootEl.classList.add('stopped');
      parts.forEach(p => { try { p.setRunning(false); } catch (e) { /* */ } });
      ed.setCur(0);
      bStop.disabled = true;
      setStatus('stopped', `已停止 · loop() 执行了 ${Number(runner.loopCount) || 0} 次 · ${fmtSec(board.now())} 秒`);
      if (ACTIVE.lab === api) ACTIVE.lab = null;
    }
    function checkRunner() {
      if (!runner || state !== 'running') return;
      const st = runner.state;
      if (st === 'error') {
        state = 'error'; rootEl.dataset.state = 'error';
        parts.forEach(p => { try { p.setRunning(false); } catch (e) { /* */ } });
        const re = runner.error ? normErr(runner.error) : null;
        if (re && re.line) lastErrLine = re.line;
        const warns = Array.from(msgs.querySelectorAll('.ed-msg.warn'));
        const match = re && warns.filter(m => m.querySelector('.tx').textContent === re.msg).pop();
        const last = re ? match : warns[warns.length - 1];
        if (last) { last.classList.remove('warn'); last.classList.add('err'); const ic = last.querySelector('svg.i'); if (ic) ic.outerHTML = icon('error'); }
        else if (re) addMsg('err', esc(re.msg), re.line ? { text: `跳到第 ${re.line} 行`, fn: () => ed.gotoLine(re.line) } : null);
        const txt = re ? re.msg : last ? last.querySelector('.tx').textContent : '运行出错';
        setStatus('error', '运行错误：' + txt);
        if (lastErrLine) { ed.setErr([lastErrLine]); ed.revealLine(lastErrLine, true); }
        showStatus();
        ed.setCur(0);
        bStop.disabled = true;
        if (ACTIVE.lab === api) ACTIVE.lab = null;
      } else if (st === 'done' || st === 'stopped') {
        state = 'stopped'; rootEl.dataset.state = 'stopped';
        rootEl.classList.add('stopped');
        parts.forEach(p => { try { p.setRunning(false); } catch (e) { /* */ } });
        ed.setCur(0);
        bStop.disabled = true;
        setStatus('stopped', `程序结束 · loop() 执行了 ${Number(runner.loopCount) || 0} 次 · ${fmtSec(board.now())} 秒`);
        if (ACTIVE.lab === api) ACTIVE.lab = null;
      }
    }

    // ---------------- frame loop
    function frame(ts) {
      if (destroyed) return;
      raf = root.requestAnimationFrame(frame);
      const dt = lastTs ? Math.min(100, Math.max(0, ts - lastTs)) : 16;
      lastTs = ts;
      if (runner && state === 'running') {
        try { runner.tick(dt, speed); } catch (e) { fatal(e, 'tick'); }
        checkRunner();
      }
      for (const p of parts) {
        try { p.update(); } catch (e) { if (!p.__warned) { p.__warned = true; if (root.console) console.warn('[lab] part update failed', p.type, e); } }
      }
      if (runner && state === 'running') {
        const ln = Number(runner.curLine) || 0;
        if (ln !== lastLine) {
          lastLine = ln;
          ed.setCur(ln);
          if (followCb.checked && doc.activeElement !== ed.ta) ed.revealLine(ln, false);
        }
      }
      if (serDirty) renderSerial();
      if (ts - slowTs > 140) {
        slowTs = ts;
        if (state === 'running') setStatus('running', runningText());
        renderVars(ts);
        renderPins();
        paintBaudWarn();
        if (sentT && ts - sentT > 6000) { sentEl.textContent = ''; sentT = 0; }
      }
    }

    // ---------------- wiring of controls
    bRun.addEventListener('click', () => run());
    bStop.addEventListener('click', () => stop());
    bReset.addEventListener('click', () => {
      const prev = ed.value;
      const orig = originalOf(cur);
      if (prev === orig) { addMsg('info', '现在已经是原始代码了。'); return; }
      ed.setValue(orig);
      delete edits[cur];
      renderTabs();
      clearMsgs();
      addMsg('info', '已恢复原始代码。', { text: '撤销', fn: () => { ed.setValue(prev); onEdit(prev); clearMsgs(); } });
    });
    speedSel.addEventListener('change', () => { speed = Number(speedSel.value) || 1; if (state === 'running') setStatus('running', runningText()); });
    const offs = [];
    function listen(ev, fn) {
      if (typeof board.on !== 'function') return;
      const r = board.on(ev, fn);
      offs.push(() => { if (typeof r === 'function') r(); else if (typeof board.off === 'function') board.off(ev, fn); });
    }
    listen('serial', onSerial);
    listen('warn', onWarn);

    // ---------------- init
    renderTabs(); showNote();
    ed.setValue(codeOf(cur));
    setStatus('idle', '就绪 · 点 ▶ 运行（可以先改代码）');
    renderSerial(); renderVars(0); renderPins(); paintBaudWarn();
    raf = root.requestAnimationFrame(frame);

    function destroy() {
      if (destroyed) return;
      if (state === 'running') stop();
      destroyed = true;
      root.cancelAnimationFrame(raf);
      offs.forEach(f => { try { f(); } catch (e) { /* */ } });
      parts.forEach(p => { try { p.destroy(); } catch (e) { /* */ } });
      rootEl.remove();
      if (ACTIVE.lab === api) ACTIVE.lab = null;
    }

    const api = {
      el: rootEl, board, parts, key,
      get runner() { return runner; },
      get state() { return state; },
      get program() { return cur; },
      run, stop, loadProgram, destroy,
      getCode() { return ed.value; },
      setCode(t) { ed.setValue(String(t)); onEdit(ed.value); },
      setSpeed(v) { speedSel.value = String(v); speed = Number(v) || 1; },
      serialText() { return serLines.join('\n') + (serLines.length ? '\n' : '') + serPartial; },
      sendSerial(t, ending) { if (ending) endSel.value = ending; inp.value = t; send(); },
      setBaud(b) { baudSel.value = String(b); paintBaudWarn(); }
    };
    return api;
  }

  SIM.lab = {
    mount,
    highlightLines,
    normCode,
    escape: esc,
    active() { return ACTIVE.lab; },
    stopAll() { if (ACTIVE.lab) ACTIVE.lab.stop(); }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SIM;
})(typeof window !== 'undefined' ? window : globalThis);
