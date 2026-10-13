/* test/mock-engine.js — STAND-IN for sim/interp.js + sim/hw.js (UI testing only).
 * Implements the public API surface of SIM_SPEC §2.1 / §3 well enough for the UI:
 *   SIM.hw.Board  — full pin/serial/device/sensor state with events
 *   SIM.interp.compile / Runner — NOT a C interpreter: it recognises a few guide
 *   programs by pattern and fakes their behaviour in JS.
 * index.html must NOT load this file; tests swap it in when the real engine is missing.
 * The fake Runner only uses public / engine-side Board methods, so it also drives the real sim/hw.js Board
 * (load this file first, then sim/hw.js replaces SIM.hw).
 */
(function (root) {
  'use strict';
  const SIM = root.SIM = root.SIM || {};

  // ------------------------------------------------------------ Board
  class Board {
    constructor(opts) {
      opts = opts || {};
      this._l = {};
      this.opts = opts;
      this.i2c = new Set(opts.i2c || []);
      this.sensors = {};
      this._dsrc = {};
      this._asrc = {};
      this.reset();
    }
    on(ev, fn) { (this._l[ev] = this._l[ev] || []).push(fn); return () => this.off(ev, fn); }
    off(ev, fn) { const a = this._l[ev]; if (a) { const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); } }
    emit(ev, ...args) { const a = this._l[ev]; if (a) for (const f of a.slice()) f(...args); }
    reset() {
      this.t = 0;
      this.pins = Array.from({ length: 20 }, () => ({ mode: null, level: 0, pwm: null, pullup: false }));
      this.serialBaud = null;
      this.rx = [];
      this._servo = {}; this._lcd = {}; this._neo = {}; this._tone = {};
      this._warned = new Set();
      for (let n = 0; n < 20; n++) this.emit('pin', n, this.pins[n], 0);
      this.emit('lcd'); this.emit('servo'); this.emit('neopixel');
    }
    now() { return this.t; }
    pin(n) { return this.pins[n] || { mode: null, level: 0, pwm: null, pullup: false }; }
    pinLabel(n) { return n >= 14 ? 'A' + (n - 14) : 'D' + n; }
    setDigitalSource(n, f) { this._dsrc[n] = f; }
    setAnalogSource(n, f) { this._asrc[n] = f; }
    serialSend(text) { for (const ch of String(text)) this.rx.push(ch.charCodeAt(0)); }
    servo(pin) { return this._servo[pin] || { attached: false, target: 0, angle: 0 }; }
    lcd(addr) {
      return this._lcd[addr] || { cols: 16, rows: 2, ddram: [' '.repeat(40), ' '.repeat(40)], backlight: false, inited: false, cursor: { c: 0, r: 0 } };
    }
    neopixel(pin) { return this._neo[pin] || { count: 0, shown: [], brightness: 255 }; }
    tone(pin) { return this._tone[pin] || { freq: null }; }
    warn(msg) { if (this._warned.has(msg)) return; this._warned.add(msg); this.emit('warn', msg); }

    // --- engine side helpers used by the mock runner and the gallery
    _set(n, patch) { Object.assign(this.pins[n], patch); this.emit('pin', n, this.pins[n], this.t); }
    pinMode(n, m) { this._set(n, { mode: m, pullup: m === 'INPUT_PULLUP' }); }
    digitalWrite(n, v) { const p = this.pins[n]; if (p.mode === 'OUTPUT') this._set(n, { level: v ? 1 : 0, pwm: null }); else this._set(n, { pullup: !!v }); }
    analogWrite(n, v) { if (this.pins[n].mode !== 'OUTPUT') this.pins[n].mode = 'OUTPUT'; v = v & 255; this._set(n, v === 0 ? { level: 0, pwm: null } : v === 255 ? { level: 1, pwm: null } : { pwm: v, level: 0 }); }
    digitalRead(n) {
      const f = this._dsrc[n]; const v = f ? f() : null;
      if (v != null) return v ? 1 : 0;
      const p = this.pins[n];
      if (p.mode === 'OUTPUT') return p.level;
      if (p.pullup) return 1;
      return Math.random() < 0.5 ? 0 : 1;
    }
    analogRead(n) { if (n < 14) n += 14; const f = this._asrc[n]; return f ? Math.max(0, Math.min(1023, Math.round(f()))) : 300 + Math.round(Math.random() * 40); }
    serialOut(text) { if (this.serialBaud == null) { this.warn('还没有 Serial.begin() 就 print，串口不会输出'); return; } this.emit('serial', text); }
    advance(us) {
      this.t += us;
      for (const k in this._servo) {
        const s = this._servo[k]; if (!s.attached) continue;
        const step = us / 2000; // 0.12s per 60deg = 0.5 deg/ms
        if (Math.abs(s.target - s.angle) <= step) s.angle = s.target; else s.angle += Math.sign(s.target - s.angle) * step;
      }
    }
    _lcdState(addr) {
      if (!this._lcd[addr]) this._lcd[addr] = { cols: 16, rows: 2, ddram: [' '.repeat(40), ' '.repeat(40)], backlight: false, inited: false, cursor: { c: 0, r: 0 } };
      return this._lcd[addr];
    }
    lcdInit(addr) { const s = this._lcdState(addr); if (!this.i2c.has(addr)) return; s.inited = true; s.ddram = [' '.repeat(40), ' '.repeat(40)]; this.emit('lcd', addr); }
    lcdBacklight(addr, on) { const s = this._lcdState(addr); if (!this.i2c.has(addr)) return; s.backlight = on; this.emit('lcd', addr); }
    lcdSetCursor(addr, c, r) { const s = this._lcdState(addr); s.cursor = { c, r }; }
    lcdPrint(addr, text) {
      const s = this._lcdState(addr); if (!this.i2c.has(addr) || !s.inited) return;
      for (const ch of String(text)) {
        const row = s.ddram[s.cursor.r];
        if (s.cursor.c < 40) s.ddram[s.cursor.r] = row.slice(0, s.cursor.c) + ch + row.slice(s.cursor.c + 1);
        s.cursor.c++;
      }
      this.emit('lcd', addr);
    }
    servoAttach(pin) { this._servo[pin] = this._servo[pin] || { attached: true, target: 90, angle: 90 }; this._servo[pin].attached = true; this.emit('servo', pin); }
    servoWrite(pin, a) { const s = this._servo[pin]; if (s) { s.target = Math.max(0, Math.min(180, a)); this.emit('servo', pin); } }
    neoShow(pin, count, colors, brightness) { this._neo[pin] = { count, shown: colors.map(c => c.map(v => Math.round(v * brightness / 255))), brightness }; this.emit('neopixel', pin); }
    setTone(pin, freq) { this._tone[pin] = { freq }; this.emit('tone', pin); }
  }

  // ------------------------------------------------------------ fake programs
  function lineOf(src, needle) { const i = src.indexOf(needle); return i < 0 ? 1 : src.slice(0, i).split('\n').length; }
  function compile(src) {
    const lines = src.split('\n');
    let depth = 0, inStr = false;
    const clean = src.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' ')).replace(/\/\/.*$/gm, '').replace(/"(?:\\.|[^"\\])*"/g, '""').replace(/'(?:\\.|[^'\\])'/g, "''");
    for (const ch of clean) { if (ch === '{') depth++; else if (ch === '}') depth--; }
    void inStr;
    if (depth > 0) return { ok: false, errors: [{ line: lines.length, msg: `第 ${lines.length} 行：缺少右大括号 }（expected '}' at end of input）` }] };
    if (depth < 0) return { ok: false, errors: [{ line: lines.length, msg: `第 ${lines.length} 行：多了一个右大括号 }（expected declaration before '}' token）` }] };
    if (/\bWire\./.test(clean) && !/#include\s*[<"](Wire|LiquidCrystal_I2C)\.h[>"]/.test(src)) {
      const ln = lineOf(src, 'Wire.');
      return { ok: false, errors: [{ line: ln, msg: `第 ${ln} 行：'Wire' 没有声明：是不是忘了 #include <Wire.h>？（'Wire' was not declared in this scope）` }] };
    }
    let kind = 'generic';
    if (/lcd\.print/.test(clean)) kind = 'lcd';
    else if (/analogRead/.test(clean) && /analogWrite/.test(clean)) kind = 'pwm';
    else if (/digitalRead/.test(clean) && /digitalWrite/.test(clean)) kind = 'button';
    else if (/Serial\.print/.test(clean)) kind = 'serial';
    else if (/analogWrite/.test(clean)) kind = 'breathe';
    const nums = {};
    const m1 = /int\s+led_out\s*=\s*(\d+)/.exec(clean); if (m1) nums.led = +m1[1];
    const m2 = /int\s+keypad_pin\s*=\s*(\d+)/.exec(clean); if (m2) nums.key = +m2[1];
    const m3 = /lcd\(\s*(0x[0-9a-fA-F]+|\d+)/.exec(clean); if (m3) nums.addr = Number(m3[1]);
    const prints = [];
    const re = /lcd\.setCursor\((\d+)\s*,\s*(\d+)\)[\s\S]*?lcd\.print\("([^"]*)"\)/g; let m;
    while ((m = re.exec(src))) prints.push([+m[1], +m[2], m[3]]);
    const cmpHigh = /if\s*\(\s*value\s*==\s*HIGH\s*\)/.test(clean);
    return { ok: true, program: { src, kind, nums, prints, cmpHigh, loopLine: lineOf(src, 'void loop') } };
  }

  // board adapter: works with this file's Board and with the real sim/hw.js Board
  const isReal = b => typeof b.serialWrite === 'function';
  const outLevel = (b, n) => b.pin(n).level;
  function serBegin(b, baud) { if (isReal(b)) b.serialBegin(baud); else b.serialBaud = baud; }
  function serOut(b, t) { if (isReal(b)) b.serialWrite(t); else b.serialOut(t); }
  function serTake(b) {
    if (isReal(b)) { let s = ''; while (b.serialAvailable() > 0) s += String.fromCharCode(b.serialRead()); return s; }
    return b.rx.length ? String.fromCharCode(...b.rx.splice(0)) : '';
  }
  function lcdShow(b, a, prints) {
    if (isReal(b)) { b.lcdInit(a, 16, 2); b.lcdBacklight(a, true); for (const [c, r, t] of prints) { b.lcdSetCursor(a, c, r); b.lcdWrite(a, t); } }
    else { b.lcdInit(a); b.lcdBacklight(a, true); for (const [c, r, t] of prints) { b.lcdSetCursor(a, c, r); b.lcdPrint(a, t); } }
  }
  const now = b => b.now();

  class Runner {
    constructor(program, board, opts) {
      this.p = program; this.b = board; this.opts = opts || {};
      this.state = 'idle'; this.curLine = 1; this.loopCount = 0; this.fastLoop = false;
      this._g = {}; this._next = 0;
    }
    start() {
      const b = this.b, p = this.p;
      this.state = 'running';
      if (isReal(b)) b.mcuReset();
      if (p.kind === 'button') {
        const led = p.nums.led || 11, key = p.nums.key || 7;
        b.pinMode(led, 'OUTPUT'); b.pinMode(key, 'INPUT'); b.digitalWrite(led, 0);
        this._g = { led_out: ['int', led], keypad_pin: ['int', key], value: ['int', 0] };
      } else if (p.kind === 'pwm') {
        b.pinMode(14, 'INPUT'); b.pinMode(11, 'OUTPUT'); serBegin(b, 9600);
        this._g = { ADPIN: ['int', 14], PWM_LEDPIN: ['int', 11], value: ['int', 0], voltage: ['float', 0] };
      } else if (p.kind === 'lcd') {
        lcdShow(b, p.nums.addr || 0x27, p.prints);
      } else if (p.kind === 'serial') {
        serBegin(b, 9600); serOut(b, 'Hello!\r\n'); this._g = { count: ['int', 0] };
      } else if (p.kind === 'breathe') {
        b.pinMode(9, 'OUTPUT'); this._g = { i: ['int', 0] };
      }
    }
    stop() {
      if (this.state === 'running') this.state = 'stopped';
      if (isReal(this.b)) { this.b.stopAll(); return; }
      for (let n = 0; n < 20; n++) { const pn = this.b.pins[n]; if (pn.mode === 'OUTPUT') this.b._set(n, { level: 0, pwm: null }); }
    }
    tick(wallMs, speed) {
      if (this.state !== 'running') return;
      const b = this.b, p = this.p;
      const target = now(b) + wallMs * speed * 1000;
      if (p.kind === 'button' || p.kind === 'generic' || p.kind === 'lcd') {
        // fast loop: ~25µs per loop
        const loops = Math.max(1, Math.floor((target - now(b)) / 25));
        if (p.kind === 'button') {
          const led = p.nums.led || 11, key = p.nums.key || 7;
          const v = b.digitalRead(key);
          this._g.value[1] = v;
          const on = p.cmpHigh ? v === 1 : v === 0;
          if (outLevel(b, led) !== (on ? 1 : 0)) b.digitalWrite(led, on ? 1 : 0);
          this.curLine = on ? 15 : 20;
        } else this.curLine = p.loopLine + 1;
        this.loopCount += loops; this.fastLoop = true; b.advance(target - now(b));
      } else if (p.kind === 'pwm') {
        while (now(b) < target) {
          const v = b.analogRead(14);
          const volt = v / 1023;
          let pwm = Math.trunc(volt * 256);
          this._g.value[1] = pwm; this._g.voltage[1] = volt;
          serOut(b, `value1==${v}     voltage==${volt.toFixed(2)}    PWM==${pwm}\r\n`);
          b.analogWrite(11, pwm);
          this.loopCount++; b.advance(48000); this.curLine = 22;
        }
      } else if (p.kind === 'serial') {
        while (now(b) < target) {
          if (now(b) >= this._next) {
            this._g.count[1]++; serOut(b, `第 ${this._g.count[1]} 次循环\r\n`); this._next = now(b) + 1e6; this.loopCount++;
            const s = serTake(b); if (s) serOut(b, '收到: ' + s + '\r\n');
          }
          const step = Math.min(target - now(b), this._next - now(b)); b.advance(Math.max(1, step)); this.curLine = 13;
        }
      } else if (p.kind === 'breathe') {
        while (now(b) < target) {
          const ph = Math.floor(now(b) / 10000) % 512; const i = ph < 256 ? ph : 511 - ph;
          this._g.i[1] = i; b.analogWrite(9, i); b.advance(10000); this.curLine = 8; if (ph === 0) this.loopCount++;
        }
      }
    }
    globals() {
      return Object.keys(this._g).map(k => {
        const [type, v] = this._g[k];
        return { name: k, type, value: type === 'float' ? Number(v).toFixed(2) : String(v) };
      });
    }
  }

  SIM.hw = SIM.hw || {};
  SIM.hw.Board = Board;
  SIM.hw.__mock = true;
  SIM.interp = { compile, Runner, __mock: true };
  if (typeof module !== 'undefined' && module.exports) module.exports = SIM;
})(typeof window !== 'undefined' ? window : globalThis);
