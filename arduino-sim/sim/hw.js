/* =====================================================================
   sim/hw.js — virtual hardware for the Arduino UNO simulator (SIM_SPEC §3)
   DOM-free. Browser: window.SIM.hw   Node: globalThis.SIM.hw + module.exports

   Public API (spec §3):
     const board = new SIM.hw.Board({ i2c:[0x27], baud:9600 })
     board.now() / reset() / pin(n) / pinLabel(n) / on(ev, fn) → unsubscribe / off(ev, fn)
     board.setDigitalSource(n, fn) / setAnalogSource(n, fn)
     board.serialSend(text[, monitorBaud]) / serialBaud
     board.servo(pin) / lcd(addr) / neopixel(pin) / tone(pin)
     board.sensors.ultrasonic = {trig, echo, distanceCm} / board.sensors.dht = {pin, temperature, humidity}
     board.i2c (Set) / warn(msg)
   Events: 'pin' (n, state, tUs) · 'serial' (text) · 'servo' (pin) · 'lcd' (addr) · 'neopixel' (pin)
           'tone' (pin) · 'warn' (msg) · extra: 'baud' (baud|null) · 'reset' () · 'run' (bool)

   Engine-side API (used by sim/interp.js; also usable by tests):
     pinMode(n, 'INPUT'|'OUTPUT'|'INPUT_PULLUP'), digitalWrite(n, v), digitalRead(n),
     analogRead(pinOrChannel), analogWrite(n, v), advance(us), sync(),
     serialBegin(baud), serialEnd(), serialWrite(byteString) → µs the CPU blocks,
     serialAvailable(), serialRead(), serialPeek(), serialNextArrival(),
     i2cProbe(addr), servoAttach/servoWrite/servoDetach, lcdInit/lcdBacklight/lcdClear/lcdHome/
     lcdSetCursor/lcdWrite/lcdDisplay/lcdScroll, neoBegin/neoShow, dhtRead(pin),
     pulseIn(pin, level, timeoutUs) → {value, wait}, toneStart(pin, f, ms), toneStop(pin),
     mcuReset() (what an upload does), stopAll() (what the ■ button does)
   Time: board._t is the virtual clock in µs (the interpreter advances it directly for speed).
   Strings that cross the program boundary are "byte strings" (each JS char = one byte 0…255);
   serial output is UTF-8 decoded before it is emitted, so Chinese text prints correctly.
   ===================================================================== */
(function (root) {
  'use strict';
  const SIM = root.SIM = root.SIM || {};

  const NPINS = 20;
  const PWM_PINS = [3, 5, 6, 9, 10, 11];
  const IS_PWM = new Array(NPINS).fill(false);
  PWM_PINS.forEach(p => { IS_PWM[p] = true; });
  const SERVO_RATE = 60 / 120000;        // SG90: 60° per 0.12 s → degrees per µs
  const LCD_ROW_OFFSETS = [0x00, 0x40, 0x14, 0x54];
  const RX_BUF = 64, TX_BUF = 64;

  // ------------------------------------------------------------ UTF-8 helpers
  function utf8Encode(str) {
    str = String(str);
    let out = '';
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i);
      if (c < 0x80) { out += str[i]; continue; }
      if (c >= 0xD800 && c < 0xDC00 && i + 1 < str.length) {
        const d = str.charCodeAt(i + 1);
        if (d >= 0xDC00 && d < 0xE000) { c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00); i++; }
      }
      if (c < 0x800) out += String.fromCharCode(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out += String.fromCharCode(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out += String.fromCharCode(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  /** Streaming UTF-8 decoder: push(byteString) → text (incomplete sequences are kept). */
  class Utf8Decoder {
    constructor() { this.pend = []; this.need = 0; }
    push(bytes) {
      let out = '';
      for (let i = 0; i < bytes.length; i++) {
        const b = bytes.charCodeAt(i) & 255;
        if (this.need) {
          if ((b & 0xC0) === 0x80) {
            this.pend.push(b);
            if (--this.need === 0) out += this._flush();
            continue;
          }
          out += '\uFFFD'; this.pend = []; this.need = 0;
        }
        if (b < 0x80) out += String.fromCharCode(b);
        else if (b >= 0xC2 && b < 0xE0) { this.pend = [b]; this.need = 1; }
        else if (b >= 0xE0 && b < 0xF0) { this.pend = [b]; this.need = 2; }
        else if (b >= 0xF0 && b < 0xF5) { this.pend = [b]; this.need = 3; }
        else out += '\uFFFD';
      }
      return out;
    }
    _flush() {
      const p = this.pend; this.pend = [];
      let c;
      if (p.length === 2) c = ((p[0] & 31) << 6) | (p[1] & 63);
      else if (p.length === 3) c = ((p[0] & 15) << 12) | ((p[1] & 63) << 6) | (p[2] & 63);
      else c = ((p[0] & 7) << 18) | ((p[1] & 63) << 12) | ((p[2] & 63) << 6) | (p[3] & 63);
      return String.fromCodePoint(c);
    }
  }

  // small deterministic PRNG (floating pins, analog noise, garbled serial)
  function prng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  const label = n => (n >= 14 && n < 20 ? 'A' + (n - 14) : 'D' + n);

  // ------------------------------------------------------------ Board
  class Board {
    constructor(opts) {
      opts = opts || {};
      this.opts = opts;
      this._l = Object.create(null);
      this.i2c = new Set((opts.i2c || []).map(Number));
      this.monitorBaud = opts.baud || 9600;
      this.sensors = {};
      if (opts.sensors) for (const k in opts.sensors) this.sensors[k] = Object.assign({}, opts.sensors[k]);
      this._dsrc = new Array(NPINS).fill(null);
      this._asrc = new Array(NPINS).fill(null);
      this.running = false;
      this.reset();
    }

    // ---------------- events
    on(ev, fn) { (this._l[ev] || (this._l[ev] = [])).push(fn); return () => this.off(ev, fn); }
    off(ev, fn) { const a = this._l[ev]; if (!a) return; const i = a.indexOf(fn); if (i >= 0) a.splice(i, 1); }
    emit(ev, a, b, c) {
      const ls = this._l[ev];
      if (!ls || !ls.length) return;
      for (const f of ls.slice()) {
        try { f(a, b, c); } catch (e) { if (root.console) console.warn('[hw] listener for "' + ev + '" failed', e); }
      }
    }
    warn(msg) {
      msg = String(msg);
      if (this._warned.has(msg)) return;
      this._warned.add(msg);
      this.emit('warn', msg);
    }

    // ---------------- power / reset
    /** Power-on state: clock 0, all pins INPUT, devices blank. Sources and sensors stay registered. */
    reset() {
      this._t = 0;
      this._rand = prng(0x5EED1234);
      this._pins = [];
      for (let n = 0; n < NPINS; n++) this._pins.push({ mode: null, port: 0, pwm: null, lastIn: 0, noise: 300, touched: false });
      this.serialBaud = null;
      this._rx = []; this._rxLast = 0; this._txFree = 0; this._dec = new Utf8Decoder();
      this._servos = Object.create(null);
      this._lcds = Object.create(null);
      this._neo = Object.create(null);
      this._tones = Object.create(null);
      this._trig = { pin: -1, level: 0, rise: 0, ready: null };
      this._dhtLast = null;
      this._warned = new Set();
      this.running = false;
      for (let n = 0; n < NPINS; n++) this.emit('pin', n, this.pin(n), 0);
      this.emit('baud', null);
      this.emit('lcd'); this.emit('servo'); this.emit('neopixel'); this.emit('tone');
      this.emit('reset');
    }
    /** What uploading a sketch does: the MCU restarts, external devices keep their state. */
    mcuReset() {
      for (let n = 0; n < NPINS; n++) {
        const p = this._pins[n];
        const was = p.mode || p.port || p.pwm != null;
        p.mode = null; p.port = 0; p.pwm = null; p.touched = false;
        if (was) this.emit('pin', n, this.pin(n), this._t);
      }
      this.serialBaud = null; this._rx = []; this._rxLast = this._t; this._txFree = this._t; this._dec = new Utf8Decoder();
      this.emit('baud', null);
      for (const k in this._servos) this._servoDetach(this._servos[k]);
      for (const k in this._tones) if (this._tones[k].freq) { this._tones[k] = { freq: null, end: null }; this.emit('tone', +k); }
      for (const k in this._neo) this._neo[k].begun = false;
      for (const k in this._lcds) this._lcds[k].stopped = false;
      this._trig = { pin: -1, level: 0, rise: 0, ready: null };
      this._dhtLast = null;
      this._warned = new Set();
      this.running = true;
      this.emit('run', true);
    }
    /** ■ Stop: outputs LOW, PWM off, tones off; servos hold their angle; LCD keeps its text (marked stopped). */
    stopAll() {
      for (let n = 0; n < NPINS; n++) {
        const p = this._pins[n];
        if (p.mode === 'OUTPUT' && (p.port || p.pwm != null)) { p.port = 0; p.pwm = null; this.emit('pin', n, this.pin(n), this._t); }
        else if (p.pwm != null) { p.pwm = null; this.emit('pin', n, this.pin(n), this._t); }
      }
      for (const k in this._tones) if (this._tones[k].freq) { this._tones[k] = { freq: null, end: null }; this.emit('tone', +k); }
      for (const k in this._servos) this._servoDetach(this._servos[k]);
      for (const k in this._lcds) { this._lcds[k].stopped = true; this.emit('lcd', +k); }
      this.running = false;
      this.emit('run', false);
    }

    // ---------------- time
    now() { return this._t; }
    advance(us) { if (us > 0) this._t += us; this.sync(); }
    /** Process timed device events (tone durations). Called by the runner once per frame. */
    sync() {
      for (const k in this._tones) {
        const t = this._tones[k];
        if (t.freq && t.end != null && this._t >= t.end) { this._tones[k] = { freq: null, end: null }; this.emit('tone', +k); }
      }
    }

    // ---------------- pins
    pinLabel(n) { return label(n); }
    pin(n) {
      const p = this._pins[n];
      if (!p) return { mode: null, level: 0, pwm: null, pullup: false };
      if (p.mode === 'OUTPUT') {
        const st = { mode: 'OUTPUT', level: p.pwm != null ? 0 : p.port, pwm: p.pwm, pullup: false };
        const sv = this._servos[n];
        if (sv && sv.attached) st.servo = true;
        const tn = this._tones[n];
        if (tn && tn.freq) st.tone = tn.freq;
        return st;
      }
      return { mode: p.mode, level: this._inLevel(n, false), pwm: null, pullup: !!p.port };
    }
    setDigitalSource(n, fn) { if (n >= 0 && n < NPINS) this._dsrc[n] = typeof fn === 'function' ? fn : null; }
    setAnalogSource(n, fn) { if (n >= 0 && n < NPINS) this._asrc[n] = typeof fn === 'function' ? fn : null; }
    _emitPin(n) { this.emit('pin', n, this.pin(n), this._t); }

    pinMode(n, mode) {
      const p = this._pins[n];
      if (!p) { this.warn(`UNO 没有 ${n} 号引脚（数字口 0～13，模拟口 A0～A5 = 14～19）`); return; }
      const before = p.mode + '|' + p.port + '|' + p.pwm;
      p.touched = true;
      if (mode === 'OUTPUT') p.mode = 'OUTPUT';
      else if (mode === 'INPUT_PULLUP') { p.mode = 'INPUT_PULLUP'; p.port = 1; p.pwm = null; }
      else { p.mode = 'INPUT'; p.port = 0; p.pwm = null; }
      if (before !== p.mode + '|' + p.port + '|' + p.pwm) { this._trigEdge(n); this._emitPin(n); }
    }
    digitalWrite(n, v) {
      const p = this._pins[n];
      if (!p) { this.warn(`UNO 没有 ${n} 号引脚（数字口 0～13，模拟口 A0～A5 = 14～19）`); return; }
      v = v ? 1 : 0;
      if (p.port === v && p.pwm == null) return;
      if (p.mode !== 'OUTPUT' && v && !p.touched)
        this.warn(`${label(n)} 还没有 pinMode(${n}, OUTPUT)：digitalWrite(HIGH) 只会打开内部上拉电阻，接的 LED 会很暗`);
      p.port = v; p.pwm = null;
      this._trigEdge(n);
      this._emitPin(n);
    }
    digitalRead(n) {
      const p = this._pins[n];
      if (!p) return 0;
      if (p.pwm != null) { p.pwm = null; this._emitPin(n); }   // AVR digitalRead() turns PWM off
      if (p.mode === 'OUTPUT') return p.port;
      return this._inLevel(n, true);
    }
    _inLevel(n, reading) {
      const p = this._pins[n];
      const ds = this._dsrc[n];
      if (ds) { let v = null; try { v = ds(); } catch (e) { v = null; } if (v != null) return v ? 1 : 0; }
      const as = this._asrc[n];
      if (as) { let v = null; try { v = as(); } catch (e) { v = null; } if (v != null) return v >= 512 ? 1 : 0; }
      const u = this.sensors && this.sensors.ultrasonic;
      if (u && n === Number(u.echo)) return 0;
      const d = this.sensors && this.sensors.dht;
      if (d && n === Number(d.pin)) return 1;
      if (p.port) return 1;                                  // pull-up (INPUT_PULLUP or INPUT + digitalWrite HIGH)
      if (reading) {
        this.warn(`${label(n)} 设成了输入但没有接元件（悬空），digitalRead 读到的 0/1 会随机跳动；需要上拉可以用 INPUT_PULLUP`);
        p.lastIn = this._rand() < 0.5 ? 0 : 1;
      }
      return p.lastIn;
    }
    analogRead(ch) {
      ch = Number(ch) | 0;
      const n = ch < 14 ? ch + 14 : ch;
      if (n < 14 || n >= NPINS) { this.warn(`analogRead(${ch})：UNO 只有 A0～A5 六个模拟输入`); return 0; }
      const as = this._asrc[n];
      if (as) {
        let v = null; try { v = as(); } catch (e) { v = null; }
        if (v != null && isFinite(v)) return Math.max(0, Math.min(1023, Math.round(v)));
      }
      const ds = this._dsrc[n];
      if (ds) { let v = null; try { v = ds(); } catch (e) { v = null; } if (v != null) return v ? 1023 : 0; }
      const p = this._pins[n];
      if (p.mode === 'OUTPUT') return p.port ? 1023 : 0;
      if (p.port) return 1023;
      this.warn(`${label(n)} 没有接元件（悬空），analogRead 读到的是随机飘动的数`);
      p.noise = Math.max(150, Math.min(600, p.noise + Math.round((this._rand() - 0.5) * 60)));
      return p.noise;
    }
    analogWrite(n, v) {
      const p = this._pins[n];
      if (!p) { this.warn(`UNO 没有 ${n} 号引脚`); return; }
      v = Math.trunc(Number(v)) || 0;
      const before = p.mode + '|' + p.port + '|' + p.pwm;
      p.mode = 'OUTPUT'; p.touched = true;             // analogWrite() calls pinMode(pin, OUTPUT)
      if (!IS_PWM[n]) {
        this.warn(`${n} 号脚不支持 PWM（UNO 只有 3、5、6、9、10、11 可以），analogWrite 在这里只能全亮（≥128）或全灭（<128）`);
        p.pwm = null; p.port = v < 128 ? 0 : 1;
      } else if ((n === 9 || n === 10) && this._servoOnTimer1()) {
        this.warn('用了 Servo 库以后，9、10 号脚的 PWM 就不能用了（Timer1 被舵机占用）');
        p.pwm = null; p.port = v < 128 ? 0 : 1;
      } else if (v <= 0) { p.pwm = null; p.port = 0; }
      else if (v === 255) { p.pwm = null; p.port = 1; }
      else {
        const r = v & 255;
        if (v > 255) this.warn(`analogWrite(${n}, ${v})：数值超出 0～255，只保留低 8 位 → ${r}${r === 0 ? '，灯几乎熄灭' : ''}`);
        p.pwm = r; p.port = 0;
      }
      if (before === p.mode + '|' + p.port + '|' + p.pwm) return;
      this._trigEdge(n);
      this._emitPin(n);
    }

    // ---------------- ultrasonic (HC-SR04): trig pulse detection + echo
    _trigEdge(n) {
      const u = this.sensors && this.sensors.ultrasonic;
      if (!u || n !== Number(u.trig)) return;
      const p = this._pins[n];
      const lvl = p.pwm != null ? 0 : p.port;            // output level, or a weak pull-up
      const tr = this._trig;
      if (tr.pin !== n) { tr.pin = n; tr.level = 0; tr.ready = null; }
      if (lvl === tr.level) return;
      tr.level = lvl;
      if (lvl) tr.rise = this._t;
      else if (this._t - tr.rise >= 10) tr.ready = { t: this._t };
    }
    /** pulseIn(pin, level, timeout) → { value: µs (0 = timeout), wait: µs the call takes } */
    pulseIn(pin, level, timeout) {
      timeout = timeout == null ? 1000000 : Number(timeout);
      const u = this.sensors && this.sensors.ultrasonic;
      if (u && pin === Number(u.echo)) {
        const rd = this._trig.ready;
        this._trig.ready = null;
        if (level && rd) {
          const d = Number(u.distanceCm);
          const start = rd.t + 460;                       // 8 × 40 kHz burst + processing
          if (!(d >= 2 && d <= 400)) {
            this.warn('超声波：障碍物距离超出 2～400cm 的量程，pulseIn 返回 0');
            return { value: 0, wait: Math.min(timeout, 38000) };
          }
          const dur = Math.round(d * 58);
          if (this._t > start + dur) {
            this.warn('超声波：Trig 触发之后隔了太久才调用 pulseIn，回波已经错过了');
            return { value: 0, wait: timeout };
          }
          if (start - this._t > timeout) return { value: 0, wait: timeout };
          return { value: dur, wait: Math.max(0, start - this._t) + dur };
        }
        if (level) this.warn('超声波：pulseIn 之前没有在 Trig 脚发出 ≥10µs 的高电平脉冲，等到超时返回 0');
        return { value: 0, wait: timeout };
      }
      this.warn(`pulseIn(${pin}, …)：模拟器里只有超声波模块的 Echo 脚会产生脉冲，这里等到超时返回 0`);
      return { value: 0, wait: timeout };
    }

    // ---------------- tone
    toneStart(pin, freq, ms) {
      for (const k in this._tones) {
        if (+k !== pin && this._tones[k].freq) { this.warn('UNO 同一时间只能在一个引脚上 tone()，先 noTone() 另一个引脚'); return; }
      }
      const p = this._pins[pin];
      if (!p) return;
      if (p.mode !== 'OUTPUT') { p.mode = 'OUTPUT'; p.touched = true; this._emitPin(pin); }
      this._tones[pin] = { freq: Number(freq), end: ms ? this._t + ms * 1000 : null };
      this.emit('tone', pin);
    }
    toneStop(pin) {
      const t = this._tones[pin];
      const p = this._pins[pin];
      if (t && t.freq) { this._tones[pin] = { freq: null, end: null }; this.emit('tone', pin); }
      if (p && (p.port || p.pwm != null)) { p.port = 0; p.pwm = null; this._emitPin(pin); }
    }
    tone(pin) {
      const t = this._tones[pin];
      if (!t) return { freq: null };
      if (t.freq && t.end != null && this._t >= t.end) { this._tones[pin] = { freq: null, end: null }; return { freq: null }; }
      return { freq: t.freq || null };
    }

    // ---------------- serial
    serialBegin(baud) {
      this.serialBaud = Number(baud) || 9600;
      this._txFree = this._t;
      this.emit('baud', this.serialBaud);
    }
    serialEnd() { this.serialBaud = null; this.emit('baud', null); }
    /** Program → monitor. bytes: byte string. Returns µs the CPU blocks (TX buffer full). */
    serialWrite(bytes) {
      if (!bytes.length) return 0;
      if (this.serialBaud == null) { this.warn('还没有 Serial.begin() 就 Serial.print()：串口不会输出（先在 setup() 里 Serial.begin(9600)）'); return 0; }
      const text = this._dec.push(bytes);
      if (text) this.emit('serial', text);
      const bt = 1e7 / this.serialBaud;                  // 10 bits per byte
      const start = Math.max(this._t, this._txFree);
      this._txFree = start + bytes.length * bt;
      const pending = (this._txFree - this._t) / bt;
      return pending > TX_BUF ? (pending - TX_BUF) * bt : 0;
    }
    /** Monitor → program. Characters arrive one by one at the program's baud rate. */
    serialSend(text, monitorBaud) {
      let bytes = utf8Encode(text == null ? '' : text);
      if (!bytes.length) return;
      if (this.serialBaud == null) {
        if (this.running) { this.warn('程序还没有 Serial.begin()，串口监视器发送的字符收不到'); return; }
      } else if (monitorBaud && Number(monitorBaud) !== this.serialBaud) {
        let g = '';
        for (let i = 0; i < bytes.length; i++) g += String.fromCharCode(Math.floor(this._rand() * 256));
        bytes = g;
      }
      const bt = 1e7 / (this.serialBaud || 9600);
      let t = Math.max(this._t, this._rxLast);
      for (let i = 0; i < bytes.length; i++) {
        t += bt;
        if (this._rx.length >= RX_BUF) break;               // 64-byte receive buffer overflows
        this._rx.push({ b: bytes.charCodeAt(i) & 255, t });
      }
      this._rxLast = t;
    }
    serialAvailable() {
      let n = 0;
      for (let i = 0; i < this._rx.length; i++) { if (this._rx[i].t <= this._t) n++; else break; }
      return n;
    }
    serialRead() {
      if (this._rx.length && this._rx[0].t <= this._t) return this._rx.shift().b;
      return -1;
    }
    serialPeek() { return this._rx.length && this._rx[0].t <= this._t ? this._rx[0].b : -1; }
    serialNextArrival() { return this._rx.length ? this._rx[0].t : null; }

    // ---------------- I2C
    i2cProbe(addr) { return this.i2c.has(Number(addr)); }

    // ---------------- servo
    _servoState(pin) {
      let s = this._servos[pin];
      if (!s) s = this._servos[pin] = { pin, attached: false, target: 90, a0: 90, t0: 0, us: 1500 };
      return s;
    }
    _servoAngle(s) {
      if (!s.attached) return s.a0;
      const d = s.target - s.a0;
      const step = (this._t - s.t0) * SERVO_RATE;
      if (Math.abs(d) <= step) return s.target;
      return s.a0 + Math.sign(d) * step;
    }
    _servoDetach(s) {
      if (!s.attached) return;
      s.a0 = this._servoAngle(s); s.t0 = this._t; s.attached = false;
      this.emit('servo', s.pin);
    }
    _servoOnTimer1() { for (const k in this._servos) if (this._servos[k].attached) return true; return false; }
    servoAttach(pin, angle) {
      const s = this._servoState(pin);
      if (angle != null) s.target = angle;
      s.a0 = this._servoAngle(s); s.t0 = this._t; s.attached = true;
      const p = this._pins[pin];
      if (p && p.mode !== 'OUTPUT') { p.mode = 'OUTPUT'; p.touched = true; }
      if (p) this._emitPin(pin);
      this.emit('servo', pin);
    }
    servoWrite(pin, angle, us) {
      const s = this._servoState(pin);
      s.a0 = this._servoAngle(s); s.t0 = this._t;
      s.target = angle;
      if (us != null) s.us = us;
      this.emit('servo', pin);
    }
    servoDetach(pin) { const s = this._servos[pin]; if (s) this._servoDetach(s); if (this._pins[pin]) this._emitPin(pin); }
    servo(pin) {
      const s = this._servos[pin];
      if (!s) return { attached: false, target: 90, angle: 90 };
      return { attached: s.attached, target: s.target, angle: this._servoAngle(s), us: s.us };
    }

    // ---------------- LCD1602 with PCF8574 I2C backpack
    _lcd(addr) {
      let l = this._lcds[addr];
      if (!l) {
        l = this._lcds[addr] = {
          cols: 16, rows: 2, ddram: [new Array(40).fill(32), new Array(40).fill(32)],
          backlight: false, inited: false, ac: 0, display: true, cursorOn: false, blink: false, shift: 0,
          custom: [], stopped: false
        };
      }
      return l;
    }
    _lcdOk(addr, what) {
      if (this.i2c.has(addr)) return true;
      const have = Array.from(this.i2c).map(a => '0x' + a.toString(16).toUpperCase()).join('、');
      this.warn(`LCD 地址 0x${Number(addr).toString(16).toUpperCase()} 上没有设备${have ? '（总线上的设备地址是 ' + have + '）' : '（总线上没有发现 I2C 设备）'}，${what || '屏幕不会显示'}`);
      return false;
    }
    lcdInit(addr, cols, rows) {
      if (!this._lcdOk(addr)) return;
      const l = this._lcd(addr);
      l.inited = true; l.ac = 0; l.shift = 0; l.display = true; l.cursorOn = false; l.blink = false; l.stopped = false;
      if (cols) l.progCols = cols;
      if (rows) l.progRows = rows;
      for (const row of l.ddram) row.fill(32);
      this.emit('lcd', addr);
    }
    lcdBacklight(addr, on) {
      if (!this._lcdOk(addr)) return;
      const l = this._lcd(addr);
      l.backlight = !!on;
      this.emit('lcd', addr);
    }
    lcdClear(addr) {
      if (!this.i2c.has(addr)) return;
      const l = this._lcd(addr);
      if (!l.inited) return;
      for (const row of l.ddram) row.fill(32);
      l.ac = 0; l.shift = 0;
      this.emit('lcd', addr);
    }
    lcdHome(addr) { if (!this.i2c.has(addr)) return; const l = this._lcd(addr); l.ac = 0; l.shift = 0; this.emit('lcd', addr); }
    lcdSetCursor(addr, col, row) {
      if (!this.i2c.has(addr)) return;
      const l = this._lcd(addr);
      const lines = l.progRows || 2;
      if (row > lines) row = lines - 1;                   // LiquidCrystal_I2C's own check (row == lines slips through)
      row = Math.max(0, Math.min(3, row | 0));
      l.ac = ((col | 0) + LCD_ROW_OFFSETS[row]) & 0x7F;
    }
    lcdWrite(addr, bytes) {
      if (!this.i2c.has(addr)) { this._lcdOk(addr); return; }
      const l = this._lcd(addr);
      if (!l.inited) { this.warn('LCD 还没有初始化：先调用 lcd.init()，再 print'); return; }
      for (let i = 0; i < bytes.length; i++) {
        const b = bytes.charCodeAt(i) & 255;
        if (l.ac < 40) l.ddram[0][l.ac] = b;
        else if (l.ac >= 0x40 && l.ac < 0x68) l.ddram[1][l.ac - 0x40] = b;
        l.ac++;
        if (l.ac === 0x28) l.ac = 0x40;
        else if (l.ac === 0x68 || l.ac > 0x7F) l.ac = 0;
      }
      this.emit('lcd', addr);
    }
    lcdDisplay(addr, key, on) {
      if (!this.i2c.has(addr)) return;
      const l = this._lcd(addr);
      l[key] = !!on;
      this.emit('lcd', addr);
    }
    lcdScroll(addr, dir) {
      if (!this.i2c.has(addr)) return;
      const l = this._lcd(addr);
      l.shift = (l.shift + (dir < 0 ? 1 : -1) + 40) % 40;
      this.emit('lcd', addr);
    }
    lcdCreateChar(addr, slot, rows) { if (!this.i2c.has(addr)) return; this._lcd(addr).custom[slot & 7] = rows.slice(0, 8); this.emit('lcd', addr); }
    lcd(addr) {
      addr = addr == null ? 0x27 : Number(addr);
      const l = this._lcds[addr];
      if (!l) return { cols: 16, rows: 2, ddram: [' '.repeat(40), ' '.repeat(40)], backlight: false, inited: false, cursor: { c: 0, r: 0 }, display: true, shift: 0, present: this.i2c.has(addr) };
      const ac = l.ac;
      const cursor = ac >= 0x40 ? { c: ac - 0x40, r: 1 } : { c: ac, r: 0 };
      return {
        cols: 16, rows: 2,
        ddram: l.ddram.map(r => String.fromCharCode.apply(null, r)),
        backlight: l.backlight, inited: l.inited, cursor, display: l.display, cursorOn: l.cursorOn, blink: l.blink,
        shift: l.shift, custom: l.custom, stopped: l.stopped, present: this.i2c.has(addr)
      };
    }

    // ---------------- NeoPixel (WS2812)
    neoBegin(pin, count) {
      const s = this._neo[pin] || (this._neo[pin] = { count, shown: [], brightness: 255, begun: false });
      s.count = count; s.begun = true;
      if (s.shown.length !== count) s.shown = Array.from({ length: count }, (_, i) => s.shown[i] || [0, 0, 0]);
      const p = this._pins[pin];
      if (p && p.mode !== 'OUTPUT') { p.mode = 'OUTPUT'; p.touched = true; this._emitPin(pin); }
    }
    /** colors: [[r,g,b]…] (unscaled), brightness 0…255 as given to setBrightness (255 = full). */
    neoShow(pin, colors, brightness) {
      const s = this._neo[pin];
      if (!s || !s.begun) { this.warn('NeoPixel：show() 之前要先调用 begin()（不然数据发不出去，灯不会变）'); return; }
      const b = brightness == null ? 255 : brightness;
      const k = b >= 255 ? 0 : b + 1;                       // Adafruit: brightness stored as b+1, 0 = no scaling
      s.shown = colors.map(c => (k ? [(c[0] * k) >> 8, (c[1] * k) >> 8, (c[2] * k) >> 8] : [c[0], c[1], c[2]]));
      s.brightness = b;
      this.emit('neopixel', pin);
    }
    neopixel(pin) {
      const s = this._neo[pin];
      if (!s) return { count: 0, shown: [], brightness: 255 };
      return { count: s.count, shown: s.shown.map(c => c.slice()), brightness: s.brightness, begun: s.begun };
    }

    // ---------------- DHT11
    /** → { code: 0 ok | -2 timeout, temperature, humidity } */
    dhtRead(pin) {
      const d = this.sensors && this.sensors.dht;
      if (!d || pin !== Number(d.pin)) {
        this.warn(`DHT11.read(${pin})：这个引脚上没有温湿度传感器${d ? '（传感器接在 ' + label(Number(d.pin)) + '）' : ''}，返回 -2（超时）`);
        return { code: -2 };
      }
      const last = this._dhtLast;
      if (last && this._t - last.t < 1000000) return { code: 0, temperature: last.temperature, humidity: last.humidity };
      const r = { t: this._t, temperature: Math.round(Number(d.temperature) || 0), humidity: Math.round(Number(d.humidity) || 0) };
      this._dhtLast = r;
      return { code: 0, temperature: r.temperature, humidity: r.humidity };
    }
  }

  SIM.hw = {
    Board,
    utf8Encode,
    Utf8Decoder,
    PWM_PINS: PWM_PINS.slice(),
    pinLabel: label
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SIM;
})(typeof window !== 'undefined' ? window : globalThis);
