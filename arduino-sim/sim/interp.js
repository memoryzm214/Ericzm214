/* =====================================================================
   sim/interp.js — Arduino C/C++ subset interpreter (SIM_SPEC §2)
   DOM-free. Browser: window.SIM.interp   Node: globalThis.SIM.interp + module.exports

   API (spec §2.1):
     const r = SIM.interp.compile(source)   → { ok:true, program, warnings } | { ok:false, errors:[{line,msg}] }
     const run = new SIM.interp.Runner(program, board, { onError, onLine, budget })
     run.start() / run.stop() / run.tick(wallMs, speed)
     run.state ('idle'|'running'|'stopped'|'error'|'done') · run.curLine · run.loopCount · run.fastLoop
     run.globals() → [{name, type, value}]
   Extras: run.error ({line,msg} after a runtime error), run.ops (statements executed),
           run.vtime (virtual µs since start), SIM.interp.formatFloat / printValue helpers.

   Architecture
     source ─ preprocess (comments, #include/#define/#ifdef, line numbers kept)
            ─ lex (tokens with line numbers; macros expanded at token level)
            ─ parse (recursive descent → AST)
            ─ analyze (scopes, static C types, overloads, errors in Chinese + GCC wording)
            ─ Runner: codegen to JS closures. Expressions/statements that can never block are
              plain closures; anything that may block (delay, pulseIn, DHT read, loops — which
              must be able to pause when the frame budget runs out — and calls to such
              functions) is a generator (function*). The runner drives one generator per program
              and resumes it once per tick().
     Numbers follow AVR rules: int 16-bit, long 32-bit, float == double == 32-bit (Math.fround),
     usual arithmetic conversions, truncating division, wraparound, conversion on assignment
     and on argument passing (delay(0.5) → delay(0)).
     Virtual clock (µs) lives in board._t: every statement costs 1 µs, library calls cost what
     spec §2.4 lists. tick() runs until the virtual clock reaches the frame target, or until
     the op budget (default 40000 statements/frame) is used up — then time jumps to the target.

   Deviations from SIM_SPEC (also listed in the build report):
     · Serial.print timing uses a 64-byte TX buffer model (bytes drain at baud/10 per second; the
       CPU only blocks when the buffer is full) instead of "≤1 ms per print". Throughput matches
       a real UNO, so fast loops that print cannot flood the monitor faster than 9600 baud allows.
     · Serial input arrives byte by byte at the program's baud rate (≈1 ms per char at 9600),
       like the real UART; Serial.available() counts only bytes that have arrived.
     · run.fastLoop is true when the op budget ran out in the last tick OR loop() completed ≥50
       times in it (a loop() without delay); at 1× speed the 40000-op budget alone is never hit
       because a 16 ms frame only has 16000 µs of virtual time.
     · Line-specific runtime warnings (division by zero, …) go to board.warn("第 N 行：…");
       fatal runtime errors go to onError({line,msg}) and set state 'error'.
     · Servo.attach() starts the arm at 90° (the real library's default 1500 µs pulse ≈ 92.7°;
       90° keeps the readout clean). NeoPixel brightness uses Adafruit's exact integer formula
       (c·(b+1))>>8 at show() time (≈ b/255).
     · Library calls also cost virtual time that the spec does not list: I2C LCD ≈1.3 ms per
       character/command (init ≈120 ms), NeoPixel show ≈30 µs per LED, DHT11 read ≈23 ms,
       Wire.endTransmission ≈0.1 ms — so programs pace like on the real board.
   Extras (additive, nothing renamed): compile() also returns warnings[] (e.g. "if (x = 0)");
   F("…") is accepted; Serial.parseInt/parseFloat/readString/readStringUntil/setTimeout,
   String.substring/replace/…, ColorHSV/gamma32, bitRead/bitSet/…, function-like #define,
   #ifdef/#if, default arguments, static locals, char arrays and const char* are supported.
   ===================================================================== */
(function (root) {
  'use strict';
  const SIM = root.SIM = root.SIM || {};

  // =================================================================== errors
  class CompileError extends Error {
    constructor(line, zh, en) { super(zh); this.line = line; this.zh = zh; this.en = en; }
  }
  class SimError extends Error {
    constructor(line, msg) { super(msg); this.line = line; this.simMsg = msg; }
  }
  const fmtErr = (line, zh, en) => ({ line, msg: `第 ${line} 行：${zh}${en ? '（' + en + '）' : ''}` });
  function quoteTok(tk) {
    if (!tk || tk.t === 'eof') return 'end of input';
    if (tk.t === 'op') return `'${tk.v}' token`;
    if (tk.t === 'str') return 'string constant';
    if (tk.t === 'num') return 'numeric constant';
    if (tk.t === 'chr') return 'character constant';
    return `'${tk.v}'`;
  }

  // =================================================================== utf-8 (byte strings)
  function utf8(str) {
    if (SIM.hw && SIM.hw.utf8Encode) return SIM.hw.utf8Encode(str);
    let out = '';
    for (const ch of String(str)) {
      const c = ch.codePointAt(0);
      if (c < 0x80) out += ch;
      else if (c < 0x800) out += String.fromCharCode(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out += String.fromCharCode(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out += String.fromCharCode(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function bytesToText(b) {
    // decode a byte string as UTF-8 for display (variable panel)
    try {
      if (typeof TextDecoder !== 'undefined') {
        const a = new Uint8Array(b.length);
        for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i) & 255;
        return new TextDecoder('utf-8').decode(a);
      }
    } catch (e) { /* fall through */ }
    return b;
  }

  // =================================================================== types
  const wrap8s = v => (v << 24) >> 24;
  function scalar(k, name, o) { return Object.assign({ k, name, scalar: true, num: true }, o); }
  const TY = {
    void: { k: 'void', name: 'void' },
    bool: scalar('bool', 'bool', { int: true, rank: 1, size: 1, conv: v => (v ? 1 : 0) }),
    char: scalar('char', 'char', { int: true, rank: 1, size: 1, signed: true, conv: wrap8s }),
    schar: scalar('schar', 'signed char', { int: true, rank: 1, size: 1, signed: true, conv: wrap8s }),
    uchar: scalar('uchar', 'byte', { int: true, rank: 1, size: 1, conv: v => v & 255 }),
    int: scalar('int', 'int', { int: true, rank: 2, size: 2, signed: true, conv: v => (v << 16) >> 16 }),
    uint: scalar('uint', 'unsigned int', { int: true, rank: 2, size: 2, conv: v => v & 65535 }),
    long: scalar('long', 'long', { int: true, rank: 3, size: 4, signed: true, conv: v => v | 0 }),
    ulong: scalar('ulong', 'unsigned long', { int: true, rank: 3, size: 4, conv: v => v >>> 0 }),
    float: scalar('float', 'float', { float: true, rank: 4, size: 4, conv: Math.fround }),
    String: { k: 'String', name: 'String', size: 6 },
    cstr: { k: 'cstr', name: 'const char*', size: 2 },
    err: { k: 'err', name: '?' }
  };
  const CLASS_INFO = {
    HardwareSerial: { size: 34 }, TwoWire: { size: 1 },
    Servo: { size: 3, header: 'Servo.h' },
    LiquidCrystal_I2C: { size: 7, header: 'LiquidCrystal_I2C.h' },
    Adafruit_NeoPixel: { size: 20, header: 'Adafruit_NeoPixel.h' },
    dht11: { size: 4, header: 'dht11.h' }
  };
  const CLS = {};
  for (const c in CLASS_INFO) CLS[c] = { k: 'obj', cls: c, name: c, size: CLASS_INFO[c].size };
  const arrT = (el, n) => ({ k: 'arr', el, n, name: `${el.name} [${n == null ? '' : n}]` });
  const prom = t => (t.int && t.rank < 2 ? TY.int : t);
  function arith(a, b) {
    if (a.float || b.float) return TY.float;
    a = prom(a); b = prom(b);
    if (a === b) return a;
    if (a.k === 'ulong' || b.k === 'ulong') return TY.ulong;
    if (a.k === 'long' || b.k === 'long') return TY.long;
    if (a.k === 'uint' || b.k === 'uint') return TY.uint;
    return TY.int;
  }
  const isNum = t => !!(t && t.num);
  const isStrish = t => t && (t.k === 'String' || t.k === 'cstr' || (t.k === 'arr' && (t.el.k === 'char' || t.el.k === 'uchar' || t.el.k === 'schar')));
  function sizeOfT(t) {
    if (t.k === 'arr') return (t.n || 0) * sizeOfT(t.el);
    if (t.k === 'obj') return t.size || 1;
    return t.size || 2;
  }

  // =================================================================== number formatting (Arduino Print)
  function printFloat(number, digits) {
    digits = digits == null ? 2 : digits & 255;
    number = Math.fround(number);
    if (number !== number) return 'nan';
    if (number === Infinity || number === -Infinity) return 'inf';
    if (number > 4294967040.0 || number < -4294967040.0) return 'ovf';
    let s = '';
    if (number < 0) { s = '-'; number = -number; }
    let rounding = 0.5;
    for (let i = 0; i < digits; i++) rounding = Math.fround(rounding / 10);
    number = Math.fround(number + rounding);
    const intPart = Math.floor(number) >>> 0;
    let rem = Math.fround(number - Math.fround(intPart));
    s += String(intPart);
    if (digits > 0) s += '.';
    while (digits-- > 0) {
      rem = Math.fround(rem * 10);
      const d = Math.trunc(rem) & 0xFFFF;
      s += String(d);
      rem = Math.fround(rem - d);
    }
    return s;
  }
  const printUnsigned = (n, base) => (n >>> 0).toString(base < 2 || base > 36 ? 10 : base).toUpperCase();
  function printSigned(n, base) {
    n |= 0;
    if (base === 10 || base < 2 || base > 36) return String(n);
    return printUnsigned(n >>> 0, base);
  }
  /** Text (byte string) that print(v[, fmt]) produces for a value of static type t. */
  function printValue(v, t, fmt) {
    switch (t.k) {
      case 'char': case 'schar':
        if (fmt == null) return String.fromCharCode(v & 255);
        return fmt === 0 ? String.fromCharCode(v & 255) : printSigned(v, fmt);
      case 'uchar': case 'uint': case 'ulong':
        if (fmt === 0) return String.fromCharCode(v & 255);
        return printUnsigned(v, fmt == null ? 10 : fmt);
      case 'bool': case 'int': case 'long':
        if (fmt === 0) return String.fromCharCode(v & 255);
        return printSigned(v, fmt == null ? 10 : fmt);
      case 'float': return printFloat(v, fmt == null ? 2 : fmt);
      case 'String': case 'cstr': return String(v);
      case 'arr': return charArrayStr(v);
      default: return String(v);
    }
  }
  function charArrayStr(a) {
    let s = '';
    for (let i = 0; i < a.length; i++) { const c = a[i] & 255; if (!c) break; s += String.fromCharCode(c); }
    return s;
  }
  /** String(x) / String += x conversion. */
  function toStr(v, t) {
    switch (t.k) {
      case 'String': case 'cstr': return v;
      case 'char': case 'schar': return String.fromCharCode(v & 255);
      case 'float': return printFloat(v, 2);
      case 'arr': return charArrayStr(v);
      default: return String(v);
    }
  }
  function atol(s) {
    const m = /^[ \t\n\r\f\v]*([+-]?)(\d+)/.exec(s);
    if (!m) return 0;
    let v = 0;
    for (let i = 0; i < m[2].length; i++) v = (Math.imul(v, 10) + (m[2].charCodeAt(i) - 48)) | 0;
    return m[1] === '-' ? (-v | 0) : v;
  }
  function atof(s) {
    const m = /^[ \t\n\r\f\v]*([+-]?(\d+\.?\d*([eE][+-]?\d+)?|\.\d+([eE][+-]?\d+)?))/.exec(s);
    return m ? Math.fround(parseFloat(m[1])) : 0;
  }

  // =================================================================== lexer + preprocessor
  const TYPE_WORDS = new Set(['void', 'int', 'long', 'short', 'float', 'double', 'char', 'byte', 'bool', 'boolean', 'word',
    'unsigned', 'signed', 'String', 'uint8_t', 'int8_t', 'uint16_t', 'int16_t', 'uint32_t', 'int32_t', 'uint64_t', 'int64_t', 'size_t']);
  const QUALS = new Set(['const', 'static', 'volatile', 'extern', 'inline', 'register', 'PROGMEM']);
  const LIB_TYPES = { Servo: 'Servo.h', LiquidCrystal_I2C: 'LiquidCrystal_I2C.h', Adafruit_NeoPixel: 'Adafruit_NeoPixel.h', dht11: 'dht11.h' };
  const STMT_WORDS = new Set(['if', 'else', 'for', 'while', 'do', 'switch', 'case', 'default', 'break', 'continue', 'return', 'goto', 'sizeof', 'true', 'false',
    'struct', 'class', 'enum', 'typedef', 'union', 'new', 'delete', 'this', 'nullptr', 'public', 'private', 'template', 'namespace', 'using', 'operator']);
  const isKeyword = v => TYPE_WORDS.has(v) || QUALS.has(v) || STMT_WORDS.has(v);
  const KNOWN_HEADERS = {
    'Arduino.h': null, 'math.h': null, 'stdlib.h': null, 'string.h': null, 'stdio.h': null, 'avr/pgmspace.h': null, 'stdint.h': null,
    'Servo.h': 'Servo', 'Wire.h': 'Wire', 'LiquidCrystal_I2C.h': 'LiquidCrystal_I2C', 'Adafruit_NeoPixel.h': 'Adafruit_NeoPixel', 'dht11.h': 'dht11'
  };
  const OPS3 = ['<<=', '>>=', '...'];
  const OPS2 = ['->', '++', '--', '<<', '>>', '<=', '>=', '==', '!=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '::'];
  const OPS1 = '+-*/%=<>!~&|^?:;,.()[]{}#';
  const FULLWIDTH = { '；': ';', '，': ',', '（': '(', '）': ')', '“': '"', '”': '"', '‘': "'", '’': "'", '｛': '{', '｝': '}', '【': '[', '】': ']',
    '：': ':', '＝': '=', '！': '!', '＜': '<', '＞': '>', '　': '空格', '＋': '+', '－': '-', '＊': '*', '／': '/', '。': '.', '、': ',', '［': '[', '］': ']' };

  /** Remove comments (keeping newlines so line numbers stay right). */
  function stripComments(src) {
    let out = '', i = 0;
    const n = src.length;
    let line = 1;
    while (i < n) {
      const c = src[i];
      if (c === '\n') { out += c; line++; i++; continue; }
      if (c === '/' && src[i + 1] === '/') {
        while (i < n && src[i] !== '\n') {
          if (src[i] === '\\' && src[i + 1] === '\n') { out += ' \n'; line++; i += 2; continue; }   // "// …\" continues
          out += ' '; i++;
        }
        continue;
      }
      if (c === '/' && src[i + 1] === '*') {
        const startLine = line;
        out += '  '; i += 2;
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') { out += '\n'; line++; } else out += ' '; i++; }
        if (i >= n) throw new CompileError(startLine, '注释 /* 没有结束：缺少 */', 'unterminated comment');
        out += '  '; i += 2;
        continue;
      }
      if (c === '"' || c === "'") {
        out += c; i++;
        while (i < n && src[i] !== c && src[i] !== '\n') {
          if (src[i] === '\\' && i + 1 < n && src[i + 1] !== '\n') { out += src[i] + src[i + 1]; i += 2; continue; }
          out += src[i]; i++;
        }
        if (i < n && src[i] === c) { out += c; i++; }
        continue;
      }
      out += c; i++;
    }
    return out;
  }

  function lexText(text, line0, errAt) {
    const toks = [];
    let i = 0, line = line0 || 1;
    const n = text.length;
    const reHex = /0[xX]([0-9a-fA-F]+)([uUlL]*)/y;
    const reBin = /0[bB]([01]+)([uUlL]*)/y;
    const reFlt = /(\d+\.\d*|\.\d+)([eE][+-]?\d+)?([fFlL]?)|(\d+)([eE][+-]?\d+)([fFlL]?)/y;
    const reInt = /(\d+)([uUlL]*)/y;
    const reId = /[A-Za-z_][A-Za-z0-9_]*/y;
    while (i < n) {
      const c = text[i];
      if (c === '\n') { line++; i++; continue; }
      if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v') { i++; continue; }
      const cc = c.charCodeAt(0);
      if ((cc >= 65 && cc <= 90) || (cc >= 97 && cc <= 122) || c === '_') {
        reId.lastIndex = i; const m = reId.exec(text);
        toks.push({ t: 'id', v: m[0], line }); i += m[0].length; continue;
      }
      if ((cc >= 48 && cc <= 57) || (c === '.' && /[0-9]/.test(text[i + 1] || ''))) {
        let m, tk;
        reHex.lastIndex = i; reBin.lastIndex = i; reFlt.lastIndex = i; reInt.lastIndex = i;
        if ((m = reHex.exec(text))) tk = intTok(parseInt(m[1], 16), m[2], false, m[0]);
        else if ((m = reBin.exec(text))) tk = intTok(parseInt(m[1], 2), m[2], false, m[0]);
        else if ((m = reFlt.exec(text))) tk = { t: 'num', v: Math.fround(parseFloat(m[0].replace(/[fFlL]$/, ''))), ty: TY.float, raw: m[0] };
        else if ((m = reInt.exec(text))) {
          const d = m[1];
          if (d.length > 1 && d[0] === '0') {
            const bad = /[89]/.exec(d);
            if (bad) throw new CompileError(line, `0 开头的数字是八进制，里面不能有 ${bad[0]}：把前面的 0 去掉`, `invalid digit "${bad[0]}" in octal constant`);
            tk = intTok(parseInt(d, 8), m[2], false, m[0]);
          } else tk = intTok(Number(d), m[2], true, m[0]);
        }
        const end = i + m[0].length;
        const sfx = /^[A-Za-z_0-9.]+/.exec(text.slice(end, end + 20));
        if (sfx) throw new CompileError(line, `数字 ${m[0]} 后面多了 “${sfx[0]}”`, `invalid suffix "${sfx[0]}" on ${tk.ty.float ? 'floating' : 'integer'} constant`);
        tk.line = line; toks.push(tk); i = end; continue;
      }
      if (c === '"') {
        let j = i + 1, s = '';
        while (j < n && text[j] !== '"' && text[j] !== '\n') {
          if (text[j] === '\\') { const r = escape(text, j, line); s += r.s; j = r.j; continue; }
          const ch = text.codePointAt(j);
          const str = String.fromCodePoint(ch);
          s += utf8(str); j += str.length;
        }
        if (j >= n || text[j] !== '"') throw new CompileError(line, '字符串缺少结尾的双引号 "', 'missing terminating " character');
        const prev = toks[toks.length - 1];
        if (prev && prev.t === 'str') prev.v += s;                  // "abc" "def" → "abcdef"
        else toks.push({ t: 'str', v: s, line });
        i = j + 1; continue;
      }
      if (c === "'") {
        let j = i + 1, s = '';
        while (j < n && text[j] !== "'" && text[j] !== '\n') {
          if (text[j] === '\\') { const r = escape(text, j, line); s += r.s; j = r.j; continue; }
          const str = String.fromCodePoint(text.codePointAt(j));
          s += utf8(str); j += str.length;
        }
        if (j >= n || text[j] !== "'") throw new CompileError(line, "字符缺少结尾的单引号 '", "missing terminating ' character");
        if (!s.length) throw new CompileError(line, "单引号里面是空的：字符要写成 'A' 这样", 'empty character constant');
        let v = s.charCodeAt(s.length - 1), ty = TY.char;
        if (s.length > 1) { v = 0; for (let k = 0; k < s.length; k++) v = ((v << 8) | s.charCodeAt(k)) & 0xFFFF; v = (v << 16) >> 16; ty = TY.int; }
        else v = wrap8s(v);
        toks.push({ t: 'chr', v, ty, line, raw: text.slice(i, j + 1) }); i = j + 1; continue;
      }
      const s3 = text.substr(i, 3), s2 = text.substr(i, 2);
      if (OPS3.includes(s3)) { toks.push({ t: 'op', v: s3, line }); i += 3; continue; }
      if (OPS2.includes(s2)) { toks.push({ t: 'op', v: s2, line }); i += 2; continue; }
      if (OPS1.includes(c)) { toks.push({ t: 'op', v: c, line }); i++; continue; }
      const ch = String.fromCodePoint(text.codePointAt(i));
      const b0 = utf8(ch).charCodeAt(0);
      const oct = '\\' + b0.toString(8);
      if (FULLWIDTH[ch]) {
        const repl = FULLWIDTH[ch];
        throw new CompileError(line, repl === '空格' ? '代码里有全角空格（中文输入法打出来的空格），请删掉换成普通空格'
          : `代码里出现了中文标点 “${ch}”，要换成英文半角的 ${repl}（切换到英文输入法再打）`, `stray '${oct}' in program`);
      }
      if (cc > 127) throw new CompileError(line, `代码里出现了不认识的字符 “${ch}”：中文只能写在注释 // 或字符串 "…" 里`, `stray '${oct}' in program`);
      throw new CompileError(line, `代码里出现了不认识的符号 “${ch}”`, `stray '${ch}' in program`);
    }
    return toks;
    function intTok(v, sfx, dec, raw) {
      sfx = (sfx || '').toLowerCase();
      const u = sfx.includes('u'), l = sfx.includes('l');
      let ty;
      if (u && l) ty = TY.ulong;
      else if (u) ty = v <= 0xFFFF ? TY.uint : TY.ulong;
      else if (l) ty = v <= 0x7FFFFFFF ? TY.long : TY.ulong;
      else if (v <= 0x7FFF) ty = TY.int;
      else if (!dec && v <= 0xFFFF) ty = TY.uint;
      else if (v <= 0x7FFFFFFF) ty = TY.long;
      else ty = TY.ulong;
      if (v > 0xFFFFFFFF) v = v % 4294967296;
      return { t: 'num', v: ty.conv(v), ty, raw };
    }
  }
  function escape(text, j, line) {
    const e = text[j + 1];
    const map = { n: '\n', t: '\t', r: '\r', '0': '\0', '\\': '\\', '"': '"', "'": "'", a: '\x07', b: '\b', f: '\f', v: '\v', '?': '?' };
    if (e === 'x') {
      const m = /^[0-9a-fA-F]{1,2}/.exec(text.slice(j + 2, j + 4));
      if (!m) throw new CompileError(line, '\\x 后面要跟十六进制数字', '\\x used with no following hex digits');
      return { s: String.fromCharCode(parseInt(m[0], 16)), j: j + 2 + m[0].length };
    }
    if (e >= '0' && e <= '7') {
      const m = /^[0-7]{1,3}/.exec(text.slice(j + 1, j + 4));
      return { s: String.fromCharCode(parseInt(m[0], 8) & 255), j: j + 1 + m[0].length };
    }
    if (e in map) return { s: map[e], j: j + 2 };
    return { s: e || '', j: j + 2 };
  }

  /** Full preprocessing: → { toks, includes, defines, warnings } */
  function preprocess(src) {
    src = String(src == null ? '' : src).replace(/\r\n?/g, '\n');
    if (src.charCodeAt(0) === 0xFEFF) src = src.slice(1);
    const text = stripComments(src);
    const lines = text.split('\n');
    const includes = [];
    const defined = new Map();      // name → macro (for #ifdef during the line pass)
    const events = [];               // {line, kind:'define'|'undef', name, macro}
    const cond = [];                 // stack of {active, taken, parentActive}
    const active = () => cond.every(c => c.active);
    for (let li = 0; li < lines.length; li++) {
      const lineNo = li + 1;
      let L = lines[li];
      const tr = L.replace(/^\s+/, '');
      if (tr[0] !== '#') { if (!active()) lines[li] = ''; continue; }
      // join continuation lines
      let full = tr, extra = 0;
      while (/\\\s*$/.test(full) && li + extra + 1 < lines.length) {
        extra++;
        full = full.replace(/\\\s*$/, ' ') + lines[li + extra];
        lines[li + extra] = '';
      }
      lines[li] = '';
      const m = /^#\s*([A-Za-z_]*)\s*(.*)$/.exec(full);
      const dir = m ? m[1] : '';
      const rest = m ? m[2].trim() : '';
      if (dir === 'ifdef' || dir === 'ifndef') {
        const nm = (/^[A-Za-z_]\w*/.exec(rest) || [''])[0];
        const yes = defined.has(nm) === (dir === 'ifdef');
        cond.push({ active: yes, taken: yes, line: lineNo });
        continue;
      }
      if (dir === 'if') {
        const yes = evalPPCond(rest, defined, lineNo);
        cond.push({ active: yes, taken: yes, line: lineNo });
        continue;
      }
      if (dir === 'elif') {
        const c = cond[cond.length - 1];
        if (!c) throw new CompileError(lineNo, '#elif 前面没有 #if', '#elif without #if');
        if (c.taken) c.active = false;
        else { c.active = evalPPCond(rest, defined, lineNo); c.taken = c.active; }
        continue;
      }
      if (dir === 'else') {
        const c = cond[cond.length - 1];
        if (!c) throw new CompileError(lineNo, '#else 前面没有 #if', '#else without #if');
        c.active = !c.taken; c.taken = true;
        continue;
      }
      if (dir === 'endif') {
        if (!cond.length) throw new CompileError(lineNo, '#endif 前面没有 #if', '#endif without #if');
        cond.pop();
        continue;
      }
      if (!active()) continue;
      if (dir === 'include') {
        const im = /^([<"])\s*([^>"]+?)\s*[>"]/.exec(rest);
        if (!im) throw new CompileError(lineNo, '#include 后面要写 <库名.h> 或 "库名.h"', '#include expects "FILENAME" or <FILENAME>');
        const name = im[2];
        if (!(name in KNOWN_HEADERS)) {
          const lower = Object.keys(KNOWN_HEADERS).find(k => k.toLowerCase() === name.toLowerCase());
          throw new CompileError(lineNo, lower ? `找不到库文件 ${name}：文件名区分大小写，应该是 ${lower}`
            : `找不到库文件 ${name}：模拟器支持的库有 Servo.h、Wire.h、LiquidCrystal_I2C.h、Adafruit_NeoPixel.h、dht11.h`, `${name}: No such file or directory`);
        }
        includes.push({ name, line: lineNo, lib: KNOWN_HEADERS[name] });
        continue;
      }
      if (dir === 'define') {
        const dm = /^([A-Za-z_]\w*)(\(([^)]*)\))?\s*(.*)$/.exec(rest);
        if (!dm) throw new CompileError(lineNo, '#define 后面要写宏的名字', 'macro names must be identifiers');
        const name = dm[1];
        let params = null;
        if (dm[2]) {
          params = dm[3].split(',').map(s => s.trim()).filter(Boolean);
          if (params.some(p => !/^[A-Za-z_]\w*$/.test(p))) throw new CompileError(lineNo, `宏 ${name} 的参数写法不对`, 'expected parameter name');
        }
        const body = lexText(dm[4] || '', lineNo);
        const macro = { name, params, body, line: lineNo };
        defined.set(name, macro);
        events.push({ line: lineNo, kind: 'define', name, macro });
        continue;
      }
      if (dir === 'undef') {
        const nm = (/^[A-Za-z_]\w*/.exec(rest) || [''])[0];
        defined.delete(nm);
        events.push({ line: lineNo, kind: 'undef', name: nm });
        continue;
      }
      if (dir === 'pragma' || dir === 'line' || dir === 'warning' || dir === '') continue;
      if (dir === 'error') throw new CompileError(lineNo, '#error：' + rest, '#error ' + rest);
      throw new CompileError(lineNo, `不认识的预处理指令 #${dir}`, `invalid preprocessing directive #${dir}`);
    }
    if (cond.length) throw new CompileError(cond[cond.length - 1].line, '#if / #ifdef 没有对应的 #endif', 'unterminated conditional directive');
    const raw = lexText(lines.join('\n'), 1);
    // macro expansion with #define/#undef applied in source order
    const macros = new Map();
    let ei = 0;
    const out = [];
    const hide = new Set();
    for (let i = 0; i < raw.length; i++) {
      const tk = raw[i];
      while (ei < events.length && events[ei].line < tk.line) {
        const ev = events[ei++];
        if (ev.kind === 'define') macros.set(ev.name, ev.macro); else macros.delete(ev.name);
      }
      i = expandAt(raw, i, macros, hide, out);
    }
    return { toks: out, includes, macros: defined };
  }
  function evalPPCond(rest, defined, lineNo) {
    let s = rest.replace(/defined\s*\(\s*([A-Za-z_]\w*)\s*\)|defined\s+([A-Za-z_]\w*)/g, (m, a, b) => (defined.has(a || b) ? '1' : '0'));
    s = s.replace(/[A-Za-z_]\w*/g, nm => {
      const m = defined.get(nm);
      if (m && !m.params && m.body.length === 1 && m.body[0].t === 'num') return String(m.body[0].v);
      return '0';
    });
    if (!/^[\d\s()!&|<>=+\-*]*$/.test(s)) throw new CompileError(lineNo, '模拟器只支持简单的 #if 条件', 'unsupported #if expression');
    // tiny recursive-descent evaluator (no eval: works under a strict Content-Security-Policy)
    const tk = s.match(/\d+|&&|\|\||==|!=|<=|>=|[()!<>+\-*]/g) || ['0'];
    let i = 0;
    const bad = () => { throw new CompileError(lineNo, '#if 条件写法不对', 'invalid #if expression'); };
    const prec = { '||': 1, '&&': 2, '==': 3, '!=': 3, '<': 4, '>': 4, '<=': 4, '>=': 4, '+': 5, '-': 5, '*': 6 };
    const prim = () => {
      const t = tk[i++];
      if (t === undefined) bad();
      if (t === '(') { const v = bin(1); if (tk[i++] !== ')') bad(); return v; }
      if (t === '!') return prim() ? 0 : 1;
      if (t === '-') return -prim();
      if (/^\d+$/.test(t)) return Number(t);
      return bad();
    };
    const bin = mp => {
      let l = prim();
      while (i < tk.length && prec[tk[i]] >= mp) {
        const op = tk[i++], r = bin(prec[op] + 1);
        l = op === '||' ? (l || r ? 1 : 0) : op === '&&' ? (l && r ? 1 : 0) : op === '==' ? +(l === r) : op === '!=' ? +(l !== r)
          : op === '<' ? +(l < r) : op === '>' ? +(l > r) : op === '<=' ? +(l <= r) : op === '>=' ? +(l >= r) : op === '+' ? l + r : op === '-' ? l - r : l * r;
      }
      return l;
    };
    const v = bin(1);
    if (i !== tk.length) bad();
    return !!v;
  }
  /** Expand token toks[i] into out (recursively); returns the index of the last consumed token. */
  function expandAt(toks, i, macros, hide, out) {
    const tk = toks[i];
    if (tk.t !== 'id' || hide.has(tk.v) || !macros.has(tk.v)) { out.push(tk); return i; }
    const m = macros.get(tk.v);
    let body, last = i;
    if (m.params === null) body = m.body;
    else {
      const nx = toks[i + 1];
      if (!nx || nx.t !== 'op' || nx.v !== '(') { out.push(tk); return i; }
      let depth = 0, j = i + 1;
      let args = [[]];
      for (; j < toks.length; j++) {
        const a = toks[j];
        if (a.t === 'op' && a.v === '(') { depth++; if (depth === 1) continue; }
        else if (a.t === 'op' && a.v === ')') { depth--; if (depth === 0) break; }
        else if (a.t === 'op' && a.v === ',' && depth === 1) { args.push([]); continue; }
        args[args.length - 1].push(a);
      }
      if (j >= toks.length) throw new CompileError(tk.line, `宏 ${m.name}( 的括号没有闭合`, `unterminated argument list invoking macro "${m.name}"`);
      if (m.params.length === 0 && args.length === 1 && !args[0].length) args = [];
      if (args.length !== m.params.length)
        throw new CompileError(tk.line, `宏 ${m.name} 需要 ${m.params.length} 个参数，这里给了 ${args.length} 个`,
          `macro "${m.name}" requires ${m.params.length} arguments, but only ${args.length} given`);
      const ex = args.map(a => { const o = []; for (let k = 0; k < a.length; k++) k = expandAt(a, k, macros, hide, o); return o; });
      body = [];
      for (const b of m.body) {
        const p = b.t === 'id' ? m.params.indexOf(b.v) : -1;
        if (p >= 0) for (const x of ex[p]) body.push(x); else body.push(b);
      }
      last = j;
    }
    const copy = body.map(b => Object.assign({}, b, { line: tk.line, macro: m.name }));
    hide.add(m.name);
    for (let k = 0; k < copy.length; k++) k = expandAt(copy, k, macros, hide, out);
    hide.delete(m.name);
    return last;
  }

  // =================================================================== parser (tokens → AST)
  const BIN_PREC = { '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7, '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10 };
  const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']);

  class Parser {
    constructor(toks) {
      this.toks = toks; this.i = 0;
      const last = toks[toks.length - 1];
      this.eof = { t: 'eof', v: '', line: last ? last.line : 1 };
    }
    peek(o) { return this.toks[this.i + (o || 0)] || this.eof; }
    next() { return this.toks[this.i++] || this.eof; }
    prevLine() { return this.i > 0 ? this.toks[Math.min(this.i, this.toks.length) - 1].line : 1; }
    isOp(v, o) { const t = this.peek(o); return t.t === 'op' && t.v === v; }
    isWord(v, o) { const t = this.peek(o); return t.t === 'id' && t.v === v; }
    accept(v) { if (this.isOp(v)) { this.i++; return true; } return false; }
    fail(line, zh, en) {
      const tk = this.peek();
      if (tk.macro && tk.t === 'op' && tk.v === ';' && !/#define/.test(zh)) zh += `（#define ${tk.macro} 的末尾多了一个分号？#define 后面不要加 ;）`;
      throw new CompileError(line, zh, en);
    }
    expect(v, what) {
      if (this.isOp(v)) return this.next();
      const tk = this.peek();
      if (tk.t === 'eof' && v !== ';') this.endOfInput();
      const zh = what || ({ ')': '缺少右括号 )', '(': '缺少左括号 (', ']': '缺少右方括号 ]', ':': '缺少冒号 :', '{': '缺少左大括号 {', '}': '缺少右大括号 }' }[v] || `缺少 ${v}`);
      const line = v === ';' || v === ')' ? this.prevLine() : tk.line;
      this.fail(line, zh, tk.t === 'eof' ? `expected '${v}' at end of input` : `expected '${v}' before ${quoteTok(tk)}`);
    }
    expectSemi() {
      if (this.isOp(';')) { this.i++; return; }
      const tk = this.peek();
      this.fail(this.prevLine(), '这一句末尾缺少分号 ;', tk.t === 'eof' ? "expected ';' at end of input" : `expected ';' before ${quoteTok(tk)}`);
    }
    endOfInput() {
      this.fail(this.eof.line, '缺少右大括号 }（大括号 { } 没有成对，检查每个函数、if、for 的结尾）', "expected '}' at end of input");
    }
    ident(what) {
      const tk = this.peek();
      if (tk.t === 'id' && !isKeyword(tk.v)) return this.next();
      if (tk.t === 'eof') this.endOfInput();
      this.fail(tk.line, what || '这里应该写一个名字（变量名或函数名）', `expected unqualified-id before ${quoteTok(tk)}`);
    }

    // ---------------- types
    isTypeStart(o) {
      const t = this.peek(o);
      return t.t === 'id' && (TYPE_WORDS.has(t.v) || QUALS.has(t.v) || !!LIB_TYPES[t.v]);
    }
    parseSpec() {
      const line = this.peek().line;
      const words = [];
      let cnst = false, stat = false, lib = null;
      while (this.isTypeStart()) {
        const v = this.next().v;
        if (v === 'const') cnst = true;
        else if (v === 'static') stat = true;
        else if (QUALS.has(v)) { /* volatile, extern … ignored */ }
        else words.push(v);
        if (LIB_TYPES[v]) { lib = v; break; }
        if (v === 'String') break;
      }
      while (this.isWord('const')) { this.next(); cnst = true; }
      const r = resolveType(words, line, lib);
      r.cnst = cnst; r.stat = stat; r.line = line;
      if (this.isOp('*')) {
        if (r.ty.k === 'char' || r.ty.k === 'uchar' || r.ty.k === 'schar') { this.next(); r.ty = TY.cstr; r.text += '*'; while (this.isWord('const')) this.next(); }
        else this.fail(line, '模拟器暂不支持指针（* 变量）：可以改用数组或普通变量', 'pointers are not supported by the simulator');
      }
      if (this.isOp('&')) this.fail(line, '模拟器暂不支持引用参数（&）：可以改用全局变量或返回值', 'references are not supported by the simulator');
      return r;
    }

    // ---------------- program
    parseProgram() {
      const items = [];
      while (this.peek().t !== 'eof') {
        if (this.accept(';')) continue;
        if (this.isOp('}')) this.fail(this.peek().line, '多了一个右大括号 }，或者前面少了左大括号 {', "expected declaration before '}' token");
        items.push(this.parseExternal());
      }
      return items;
    }
    parseExternal() {
      const tk = this.peek();
      if (!this.isTypeStart()) this.topLevelError(tk);
      const spec = this.parseSpec();
      if (this.isOp(';')) { this.next(); return { k: 'Empty', line: tk.line }; }
      const nameTk = this.ident();
      if (this.isOp('(') && (spec.ty.k !== 'obj' || this.looksLikeParams())) {
        if (!this.looksLikeParams()) {
          // int x(5);  direct initialisation
          return this.finishVar(spec, nameTk, true);
        }
        this.next();
        const params = this.parseParams();
        if (this.isOp('{')) {
          const body = this.parseBlock();
          return { k: 'Func', line: nameTk.line, ret: spec, name: nameTk.v, params, body };
        }
        if (!this.isOp(';')) {
          const nt = this.peek();
          if (nt.t === 'eof') this.endOfInput();
          this.fail(nameTk.line, `函数 ${nameTk.v}() 的 ) 后面应该是左大括号 {（函数里的语句要用 { } 括起来）`, `expected initializer before ${quoteTok(nt)}`);
        }
        this.expectSemi();
        return { k: 'Func', line: nameTk.line, ret: spec, name: nameTk.v, params, body: null };
      }
      return this.finishVar(spec, nameTk, true);
    }
    topLevelError(tk) {
      if (tk.t === 'id' && !isKeyword(tk.v)) {
        const n1 = this.peek(1);
        if (n1.t === 'id') this.unknownType(tk);
        if (n1.t === 'op' && n1.v === '(') {
          let depth = 0, j = this.i + 1;
          for (; j < this.toks.length; j++) {
            const t = this.toks[j];
            if (t.t === 'op' && t.v === '(') depth++;
            else if (t.t === 'op' && t.v === ')') { depth--; if (!depth) break; }
          }
          const after = this.toks[j + 1];
          if (after && after.t === 'op' && after.v === '{')
            this.fail(tk.line, `函数 ${tk.v}() 前面缺少返回类型：要写成 void ${tk.v}()`, `ISO C++ forbids declaration of '${tk.v}' with no type`);
        }
        if (n1.t === 'op' && n1.v === '(')
          this.fail(tk.line, `函数外面不能直接写执行语句：${tk.v}(…) 要放进 setup() 或 loop() 的大括号 { } 里面（检查前面的 } 是不是放早了）`,
            "expected constructor, destructor, or type conversion before '(' token");
        this.fail(tk.line, `函数外面不能直接写执行语句：要放进 setup() 或 loop() 的大括号 { } 里面`, `'${tk.v}' does not name a type`);
      }
      if (tk.t === 'id' && (tk.v === 'if' || tk.v === 'for' || tk.v === 'while' || tk.v === 'return' || tk.v === 'else' || tk.v === 'do' || tk.v === 'switch'))
        this.fail(tk.line, `${tk.v} 语句只能写在函数里面（检查前面的 } 是不是多了或放早了）`, `expected unqualified-id before '${tk.v}'`);
      if (tk.t === 'id' && (tk.v === 'struct' || tk.v === 'class' || tk.v === 'enum' || tk.v === 'typedef' || tk.v === 'union' || tk.v === 'template' || tk.v === 'namespace' || tk.v === 'using'))
        this.fail(tk.line, `模拟器暂不支持 ${tk.v}`, `'${tk.v}' is not supported by the simulator`);
      this.fail(tk.line, '这里应该是变量或函数的定义', `expected unqualified-id before ${quoteTok(tk)}`);
    }
    unknownType(tk) {
      const v = tk.v;
      const all = [...TYPE_WORDS, ...Object.keys(LIB_TYPES)];
      let hint = all.find(w => w.toLowerCase() === v.toLowerCase());
      if (!hint && /^LiquidCrystal/i.test(v)) hint = 'LiquidCrystal_I2C';
      if (!hint && /^integer$/i.test(v)) hint = 'int';
      if (!hint && /^(dht|DHT)\d*$/.test(v)) hint = 'dht11';
      this.fail(tk.line, `'${v}' 不是已知的类型${hint ? `：是不是想写 ${hint}？` : '（检查拼写和大小写，或者是不是少了 #include）'}`, `'${v}' does not name a type`);
    }
    looksLikeParams() {
      // called with peek() === '('
      const t = this.peek(1);
      if (t.t === 'op' && t.v === ')') return true;
      return t.t === 'id' && (TYPE_WORDS.has(t.v) || QUALS.has(t.v) || !!LIB_TYPES[t.v]);
    }
    parseParams() {
      const params = [];
      if (this.accept(')')) return params;
      if (this.isWord('void') && this.isOp(')', 1)) { this.next(); this.next(); return params; }
      for (;;) {
        const tk = this.peek();
        if (!this.isTypeStart()) {
          if (tk.t === 'id' && this.peek(1).t === 'id') this.unknownType(tk);
          this.fail(tk.line, '函数参数要写成 “类型 名字”，例如 int pin', `expected declaration specifiers before ${quoteTok(tk)}`);
        }
        const spec = this.parseSpec();
        let name = null, line = spec.line;
        if (this.peek().t === 'id' && !isKeyword(this.peek().v)) { const n = this.next(); name = n.v; line = n.line; }
        let arr = false;
        if (this.accept('[')) {
          if (!this.isOp(']')) this.parseAssign();
          this.expect(']');
          arr = true;
          if (this.isOp('[')) this.fail(line, '模拟器暂不支持二维数组', 'multi-dimensional arrays are not supported by the simulator');
        }
        let def = null;
        if (this.accept('=')) def = this.parseAssign();
        params.push({ spec, name, arr, def, line });
        if (this.accept(',')) continue;
        this.expect(')');
        return params;
      }
    }
    finishVar(spec, nameTk, top) {
      const decls = [];
      let tk = nameTk;
      for (;;) {
        const d = { name: tk.v, line: tk.line, arr: null, init: null, ctor: null };
        if (this.accept('[')) {
          if (this.isOp(']')) d.arr = 'unsized';
          else d.arr = this.parseAssign();
          this.expect(']');
          if (this.isOp('[')) this.fail(tk.line, '模拟器暂不支持二维数组（可以拆成几个一维数组）', 'multi-dimensional arrays are not supported by the simulator');
        }
        if (this.accept('=')) {
          if (this.isOp('{')) d.init = this.parseInitList();
          else d.init = this.parseAssign();
        } else if (this.isOp('(')) {
          const line = this.next().line;
          d.ctor = [];
          if (!this.accept(')')) {
            for (;;) { d.ctor.push(this.parseAssign()); if (this.accept(',')) continue; this.expect(')'); break; }
          }
          d.ctorLine = line;
        } else if (this.isOp('{') && spec.ty.k !== 'obj') {
          d.init = this.parseInitList();
        }
        decls.push(d);
        if (this.accept(',')) {
          if (this.isOp('*') && spec.ty.k === 'cstr') this.next();
          tk = this.ident();
          continue;
        }
        break;
      }
      this.expectSemi();
      return { k: 'Var', line: nameTk.line, spec, decls, top: !!top };
    }
    parseInitList() {
      const line = this.expect('{').line;
      const items = [];
      while (!this.isOp('}')) {
        if (this.isOp('{')) this.fail(this.peek().line, '模拟器暂不支持二维数组', 'multi-dimensional arrays are not supported by the simulator');
        items.push(this.parseAssign());
        if (!this.accept(',')) break;
      }
      if (this.peek().t === 'eof') this.endOfInput();
      this.expect('}', '数组初始值要用 } 结束（数值之间用逗号隔开）');
      return { k: 'InitList', items, line };
    }

    // ---------------- statements
    parseBlock() {
      const line = this.expect('{').line;
      const body = [];
      while (!this.isOp('}')) {
        if (this.peek().t === 'eof') this.endOfInput();
        body.push(this.parseStatement());
      }
      const endLine = this.next().line;
      return { k: 'Block', line, body, endLine };
    }
    isDeclStart() {
      const t = this.peek();
      if (t.t !== 'id') return false;
      if (QUALS.has(t.v)) return true;
      if (t.v === 'String') return this.peek(1).t === 'id';
      if (TYPE_WORDS.has(t.v)) return !this.isOp('(', 1);
      if (LIB_TYPES[t.v]) return this.peek(1).t === 'id';
      return false;
    }
    parseStatement() {
      const tk = this.peek();
      const line = tk.line;
      if (tk.t === 'op') {
        if (tk.v === '{') return this.parseBlock();
        if (tk.v === ';') { this.next(); return { k: 'Empty', line }; }
      }
      if (tk.t === 'id') {
        switch (tk.v) {
          case 'if': {
            this.next();
            this.expect('(', "if 后面要跟括号：if (条件)");
            const c = this.parseExpr();
            this.expect(')');
            const a = this.parseSub();
            let b = null;
            if (this.isWord('else')) { this.next(); b = this.parseSub(); }
            return { k: 'If', line, c, a, b };
          }
          case 'else': this.fail(line, 'else 前面没有对应的 if（检查 if 的大括号是不是多了一个 ; 或者 } 放错了）', "'else' without a previous 'if'");
          // eslint-disable-next-line no-fallthrough
          case 'while': {
            this.next();
            this.expect('(', 'while 后面要跟括号：while (条件)');
            const c = this.parseExpr();
            this.expect(')');
            return { k: 'While', line, c, body: this.parseSub() };
          }
          case 'do': {
            this.next();
            const body = this.parseSub();
            if (!this.isWord('while')) this.fail(this.peek().line, 'do { … } 后面要写 while (条件);', `expected 'while' before ${quoteTok(this.peek())}`);
            this.next();
            this.expect('(');
            const c = this.parseExpr();
            this.expect(')');
            this.expectSemi();
            return { k: 'Do', line, body, c };
          }
          case 'for': {
            this.next();
            this.expect('(', 'for 后面要跟括号：for (初始; 条件; 更新)');
            {
              let depth = 1, semis = 0, j = this.i;
              for (; j < this.toks.length; j++) {
                const t = this.toks[j];
                if (t.t !== 'op') continue;
                if (t.v === '(' || t.v === '{' || t.v === '[') depth++;
                else if (t.v === ')' || t.v === '}' || t.v === ']') { depth--; if (!depth) break; }
                else if (t.v === ';' && depth === 1) semis++;
              }
              if (j < this.toks.length && this.toks[j].v === ')' && semis !== 2)
                this.fail(line, `for 的括号里要用两个分号把三部分隔开：for (int i = 0; i < 8; i++)，这里有 ${semis} 个分号`, semis < 2 ? "expected ';' before ')' token" : "expected ')' before ';' token");
            }
            let init = null;
            if (this.accept(';')) init = null;
            else if (this.isDeclStart()) {
              const spec = this.parseSpec();
              init = this.finishVar(spec, this.ident(), false);
            } else { const e = this.parseExpr(); this.expectSemi(); init = { k: 'Expr', line, e }; }
            let c = null;
            if (!this.isOp(';')) c = this.parseExpr();
            this.expectSemi();
            let u = null;
            if (!this.isOp(')')) u = this.parseExpr();
            this.expect(')');
            return { k: 'For', line, init, c, u, body: this.parseSub() };
          }
          case 'switch': return this.parseSwitch();
          case 'case': case 'default':
            this.fail(line, `${tk.v} 只能写在 switch { } 里面`, `case label not within a switch statement`);
          // eslint-disable-next-line no-fallthrough
          case 'break': this.next(); this.expectSemi(); return { k: 'Break', line };
          case 'continue': this.next(); this.expectSemi(); return { k: 'Continue', line };
          case 'return': {
            this.next();
            let e = null;
            if (!this.isOp(';')) e = this.parseExpr();
            this.expectSemi();
            return { k: 'Return', line, e };
          }
          case 'goto': this.fail(line, '模拟器不支持 goto', "'goto' is not supported by the simulator");
          // eslint-disable-next-line no-fallthrough
          default: break;
        }
        if (this.isDeclStart()) {
          const spec = this.parseSpec();
          if (this.isOp(';')) { this.next(); return { k: 'Empty', line }; }
          const nameTk = this.ident();
          if (this.isOp('(') && (spec.ty.k === 'void' || this.looksLikeParams())) {
            // a function definition (or prototype) inside a function body
            let depth = 0, j = this.i;
            for (; j < this.toks.length; j++) {
              const t = this.toks[j];
              if (t.t === 'op' && t.v === '(') depth++;
              else if (t.t === 'op' && t.v === ')') { depth--; if (!depth) break; }
            }
            const after = this.toks[j + 1];
            if (after && after.t === 'op' && after.v === '{')
              this.fail(nameTk.line, `函数 ${nameTk.v}() 不能写在另一个函数里面：前面的函数是不是少了一个右大括号 }？`, "a function-definition is not allowed here before '{' token");
            if (after && after.t === 'op' && after.v === ';') { this.i = j + 2; return { k: 'Empty', line }; }
          }
          return this.finishVar(spec, nameTk, false);
        }
        if (!isKeyword(tk.v) && this.peek(1).t === 'id' && !isKeyword(this.peek(1).v)) this.unknownType(tk);
        if (tk.v === 'struct' || tk.v === 'class' || tk.v === 'enum' || tk.v === 'typedef' || tk.v === 'union')
          this.fail(line, `模拟器暂不支持 ${tk.v}`, `'${tk.v}' is not supported by the simulator`);
      }
      const e = this.parseExpr();
      this.expectSemi();
      return { k: 'Expr', line, e };
    }
    parseSub() {
      // body of if/while/for: a declaration directly here is legal C++ but pointless; allow statements only
      return this.parseStatement();
    }
    parseSwitch() {
      const line = this.next().line;
      this.expect('(', 'switch 后面要跟括号：switch (变量)');
      const e = this.parseExpr();
      this.expect(')');
      this.expect('{', 'switch (…) 后面要跟 { case …: … }');
      const body = [], labels = [];
      while (!this.isOp('}')) {
        const tk = this.peek();
        if (tk.t === 'eof') this.endOfInput();
        if (tk.t === 'id' && tk.v === 'case') {
          this.next();
          const test = this.parseCond();
          if (this.isOp('...')) this.fail(tk.line, '模拟器不支持 case 1 ... 5 这种范围写法', 'case ranges are not supported');
          this.expect(':', 'case 值后面要写冒号 :');
          labels.push({ idx: body.length, test, line: tk.line });
          continue;
        }
        if (tk.t === 'id' && tk.v === 'default') {
          this.next(); this.expect(':', 'default 后面要写冒号 :');
          labels.push({ idx: body.length, test: null, line: tk.line });
          continue;
        }
        body.push(this.parseStatement());
      }
      this.next();
      return { k: 'Switch', line, e, body, labels };
    }

    // ---------------- expressions
    parseExpr() {
      const first = this.parseAssign();
      if (!this.isOp(',')) return first;
      const list = [first];
      while (this.accept(',')) list.push(this.parseAssign());
      return { k: 'Comma', list, line: first.line };
    }
    parseAssign() {
      const l = this.parseCond();
      const tk = this.peek();
      if (tk.t === 'op' && ASSIGN_OPS.has(tk.v)) {
        this.next();
        const r = this.parseAssign();
        return { k: 'Asg', op: tk.v, l, r, line: tk.line };
      }
      return l;
    }
    parseCond() {
      const c = this.parseBin(1);
      if (!this.isOp('?')) return c;
      const line = this.next().line;
      const a = this.parseExpr();
      this.expect(':', '三目运算 ? 后面缺少冒号 :');
      const b = this.parseAssign();
      return { k: 'Cond', c, a, b, line };
    }
    parseBin(minPrec) {
      let l = this.parseUnary();
      for (;;) {
        const tk = this.peek();
        if (tk.t !== 'op') break;
        const p = BIN_PREC[tk.v];
        if (!p || p < minPrec) break;
        this.next();
        const r = this.parseBin(p + 1);
        l = (tk.v === '&&' || tk.v === '||') ? { k: 'Log', op: tk.v, l, r, line: tk.line } : { k: 'Bin', op: tk.v, l, r, line: tk.line };
      }
      return l;
    }
    isCastAhead() {
      if (!this.isOp('(')) return false;
      const t = this.peek(1);
      if (t.t !== 'id') return false;
      if (t.v === 'String') return this.isOp(')', 2);
      return TYPE_WORDS.has(t.v) || t.v === 'const';
    }
    parseUnary() {
      const tk = this.peek();
      if (tk.t === 'op') {
        if (tk.v === '++' || tk.v === '--') { this.next(); const e = this.parseUnary(); return { k: 'Upd', op: tk.v, pre: true, e, line: tk.line }; }
        if (tk.v === '-' || tk.v === '+' || tk.v === '!' || tk.v === '~') { this.next(); const e = this.parseUnary(); return { k: 'Un', op: tk.v, e, line: tk.line }; }
        if (tk.v === '&' || tk.v === '*') this.fail(tk.line, `模拟器暂不支持指针运算（一元 ${tk.v}）`, 'pointers are not supported by the simulator');
        if (this.isCastAhead()) {
          this.next();
          const spec = this.parseSpec();
          this.expect(')');
          const e = this.parseUnary();
          return { k: 'Cast', spec, e, line: tk.line };
        }
      }
      if (tk.t === 'id' && tk.v === 'sizeof') {
        this.next();
        if (this.isOp('(') && this.isTypeStart(1)) {
          this.next(); const spec = this.parseSpec(); this.expect(')');
          return { k: 'Sizeof', spec, e: null, line: tk.line };
        }
        const e = this.parseUnary();
        return { k: 'Sizeof', spec: null, e, line: tk.line };
      }
      return this.parsePostfix();
    }
    parsePostfix() {
      let e = this.parsePrimary();
      for (;;) {
        const tk = this.peek();
        if (tk.t !== 'op') break;
        if (tk.v === '(') {
          this.next();
          const args = [];
          if (!this.accept(')')) {
            for (;;) {
              args.push(this.parseAssign());
              if (this.accept(',')) continue;
              this.expect(')', '函数调用缺少右括号 )');
              break;
            }
          }
          e = { k: 'Call', f: e, args, line: e.line };
        } else if (tk.v === '[') {
          this.next();
          const i = this.parseExpr();
          this.expect(']');
          e = { k: 'Idx', a: e, i, line: tk.line };
        } else if (tk.v === '.') {
          this.next();
          const n = this.peek();
          if (n.t !== 'id') this.fail(n.line, '点号 . 后面要写成员或函数的名字', `expected unqualified-id before ${quoteTok(n)}`);
          this.next();
          e = { k: 'Mem', o: e, name: n.v, line: n.line };
        } else if (tk.v === '->') {
          this.fail(tk.line, '模拟器暂不支持 -> （指针）', 'pointers are not supported by the simulator');
        } else if (tk.v === '++' || tk.v === '--') {
          this.next();
          e = { k: 'Upd', op: tk.v, pre: false, e, line: tk.line };
        } else break;
      }
      return e;
    }
    parsePrimary() {
      const tk = this.peek();
      const line = tk.line;
      if (tk.t === 'num') { this.next(); return { k: 'Num', v: tk.v, ty: tk.ty, line }; }
      if (tk.t === 'chr') { this.next(); return { k: 'Num', v: tk.v, ty: tk.ty, line, chr: true }; }
      if (tk.t === 'str') { this.next(); return { k: 'Str', v: tk.v, line }; }
      if (tk.t === 'op' && tk.v === '(') {
        this.next();
        const e = this.parseExpr();
        this.expect(')');
        e.paren = true;
        return e;
      }
      if (tk.t === 'id') {
        if (tk.v === 'true' || tk.v === 'false') { this.next(); return { k: 'Num', v: tk.v === 'true' ? 1 : 0, ty: TY.bool, line }; }
        if (tk.v === 'String' || (TYPE_WORDS.has(tk.v) && this.isOp('(', 1))) {
          // functional cast int(x) / String(x[, fmt])
          const spec = this.parseSpec();
          if (!this.isOp('(')) this.fail(line, `${tk.v} 后面应该是变量名`, `expected primary-expression before '${tk.v}'`);
          this.next();
          const args = [];
          if (!this.accept(')')) { for (;;) { args.push(this.parseAssign()); if (this.accept(',')) continue; this.expect(')'); break; } }
          if (spec.ty.k === 'String') return { k: 'StrCtor', args, line };
          if (args.length !== 1) this.fail(line, `${spec.text}(…) 只能有一个参数`, `expression list treated as compound expression in functional cast`);
          return { k: 'Cast', spec, e: args[0], line };
        }
        if (LIB_TYPES[tk.v] && this.isOp('::', 1)) {
          this.next(); this.next();
          const n = this.ident();
          return { k: 'Static', cls: tk.v, name: n.v, line };
        }
        if (!isKeyword(tk.v)) { this.next(); return { k: 'Id', name: tk.v, line }; }
        if (TYPE_WORDS.has(tk.v) || QUALS.has(tk.v)) this.fail(line, `这里不能写类型 ${tk.v}（声明变量要单独写一行，例如 int x = 0;）`, `expected primary-expression before '${tk.v}'`);
      }
      if (tk.t === 'eof') this.endOfInput();
      this.fail(line, tk.t === 'op' && (tk.v === ')' || tk.v === ';' || tk.v === ',') ? `${tk.v} 前面缺少数值或变量` : `这里缺少数值或变量（${tk.v} 用得不对）`,
        `expected primary-expression before ${quoteTok(tk)}`);
    }
  }

  function resolveType(words, line, lib) {
    if (lib) return { ty: CLS[lib], text: lib, lib };
    const cnt = {};
    for (const w of words) cnt[w] = (cnt[w] || 0) + 1;
    const has = w => !!cnt[w];
    const text = words.join(' ');
    const bad = () => { throw new CompileError(line, `类型写法不对：${text}`, `invalid type '${text}'`); };
    if (!words.length) throw new CompileError(line, '这里缺少类型（例如 int）', 'C++ forbids declaration with no type');
    const uns = has('unsigned'), sig = has('signed');
    if (uns && sig) bad();
    const base = words.filter(w => w !== 'unsigned' && w !== 'signed' && w !== 'short' && w !== 'long' && w !== 'int');
    if (base.length > 1) bad();
    const b = base[0];
    let ty;
    if (b) {
      if ((cnt.short || cnt.long || cnt.int) && b !== 'double') bad();
      switch (b) {
        case 'void': ty = TY.void; break;
        case 'bool': case 'boolean': ty = TY.bool; break;
        case 'char': ty = uns ? TY.uchar : sig ? TY.schar : TY.char; break;
        case 'byte': case 'uint8_t': ty = TY.uchar; break;
        case 'int8_t': ty = TY.schar; break;
        case 'int16_t': ty = TY.int; break;
        case 'uint16_t': case 'word': case 'size_t': ty = TY.uint; break;
        case 'int32_t': case 'int64_t': ty = TY.long; break;
        case 'uint32_t': case 'uint64_t': ty = TY.ulong; break;
        case 'float': case 'double': ty = TY.float; break;
        case 'String': ty = TY.String; break;
        default: bad();
      }
      if ((uns || sig) && b !== 'char') bad();
    } else {
      if (cnt.long) ty = uns ? TY.ulong : TY.long;
      else if (cnt.short) ty = uns ? TY.uint : TY.int;
      else ty = uns ? TY.uint : TY.int;
      if (cnt.long && cnt.short) bad();
    }
    return { ty, text };
  }

  // =================================================================== library catalog (analysis side)
  const U8 = TY.uchar, I16 = TY.int, U16 = TY.uint, I32 = TY.long, U32 = TY.ulong, F32 = TY.float, VOID = TY.void, BOOL = TY.bool, CHR = TY.char;
  const ANY = { k: 'any', name: 'any' };       // print-like argument (any printable type)
  // builtin functions. g: type-generic macro. y: may block (generator). cost: µs of virtual time.
  const BUILTINS = {
    pinMode: { ret: VOID, p: [U8, U8], cost: 2 },
    digitalWrite: { ret: VOID, p: [U8, U8], cost: 4 },
    digitalRead: { ret: I16, p: [U8], cost: 4 },
    analogRead: { ret: I16, p: [U8], cost: 112 },
    analogWrite: { ret: VOID, p: [U8, I16], cost: 6 },
    analogReference: { ret: VOID, p: [U8] },
    delay: { ret: VOID, p: [U32], y: true },
    delayMicroseconds: { ret: VOID, p: [U16], y: true },
    millis: { ret: U32, p: [] },
    micros: { ret: U32, p: [] },
    map: { ret: I32, p: [I32, I32, I32, I32, I32], cost: 3 },
    random: { ret: I32, p: [I32, I32], min: 1, cost: 2 },
    randomSeed: { ret: VOID, p: [U32] },
    tone: { ret: VOID, p: [U8, U16, U32], min: 2, cost: 5 },
    noTone: { ret: VOID, p: [U8], cost: 3 },
    pulseIn: { ret: U32, p: [U8, U8, U32], min: 2, y: true },
    pulseInLong: { ret: U32, p: [U8, U8, U32], min: 2, y: true },
    min: { g: 'arith2', p: [ANY, ANY] }, max: { g: 'arith2', p: [ANY, ANY] },
    constrain: { g: 'arith3', p: [ANY, ANY, ANY] },
    abs: { g: 'prom', p: [ANY] }, sq: { g: 'arith1', p: [ANY] },
    round: { g: 'round', p: [ANY] },
    radians: { ret: F32, p: [F32] }, degrees: { ret: F32, p: [F32] },
    sqrt: { ret: F32, p: [F32], cost: 2 }, sin: { ret: F32, p: [F32], cost: 2 }, cos: { ret: F32, p: [F32], cost: 2 }, tan: { ret: F32, p: [F32], cost: 2 },
    asin: { ret: F32, p: [F32], cost: 2 }, acos: { ret: F32, p: [F32], cost: 2 }, atan: { ret: F32, p: [F32], cost: 2 },
    exp: { ret: F32, p: [F32], cost: 2 }, log: { ret: F32, p: [F32], cost: 2 }, log10: { ret: F32, p: [F32], cost: 2 },
    fabs: { ret: F32, p: [F32] }, floor: { ret: F32, p: [F32] }, ceil: { ret: F32, p: [F32] },
    pow: { ret: F32, p: [F32, F32], cost: 2 }, atan2: { ret: F32, p: [F32, F32], cost: 2 }, fmod: { ret: F32, p: [F32, F32], cost: 2 }, hypot: { ret: F32, p: [F32, F32], cost: 2 },
    bitRead: { g: 'bitRead', p: [ANY, ANY] }, bit: { ret: U32, p: [U8] },
    lowByte: { ret: U8, p: [U16] }, highByte: { ret: U8, p: [U16] },
    isDigit: { ret: BOOL, p: [I16] }, isAlpha: { ret: BOOL, p: [I16] }, isAlphaNumeric: { ret: BOOL, p: [I16] }, isSpace: { ret: BOOL, p: [I16] },
    isUpperCase: { ret: BOOL, p: [I16] }, isLowerCase: { ret: BOOL, p: [I16] }, isPunct: { ret: BOOL, p: [I16] }, isWhitespace: { ret: BOOL, p: [I16] },
    toupper: { ret: I16, p: [I16] }, tolower: { ret: I16, p: [I16] },
    interrupts: { ret: VOID, p: [] }, noInterrupts: { ret: VOID, p: [] }, yield: { ret: VOID, p: [] }
  };
  const UNSUPPORTED_FUNCS = new Set(['attachInterrupt', 'detachInterrupt', 'shiftOut', 'shiftIn', 'analogReadResolution', 'analogWriteResolution',
    'malloc', 'free', 'sprintf', 'printf', 'strcpy', 'strlen', 'strcmp', 'itoa', 'dtostrf', 'memset', 'memcpy', 'EEPROM']);
  const PRINT = { special: 'print' };
  const METHODS = {
    HardwareSerial: {
      begin: { ret: VOID, p: [U32, U8], min: 1, cost: 5 }, end: { ret: VOID, p: [] },
      print: { special: 'print', min: 1, max: 2 }, println: { special: 'print', min: 0, max: 2, ln: true },
      write: { special: 'write', min: 1, max: 1 },
      available: { ret: I16, p: [], cost: 2 }, read: { ret: I16, p: [], cost: 2 }, peek: { ret: I16, p: [], cost: 2 },
      flush: { ret: VOID, p: [] }, availableForWrite: { ret: I16, p: [] },
      parseInt: { ret: I32, p: [], y: true }, parseFloat: { ret: F32, p: [], y: true },
      readString: { ret: TY.String, p: [], y: true }, readStringUntil: { ret: TY.String, p: [CHR], y: true },
      setTimeout: { ret: VOID, p: [U32] }
    },
    TwoWire: {
      begin: { ret: VOID, p: [U8], min: 0, cost: 5 }, beginTransmission: { ret: VOID, p: [U8], cost: 2 },
      write: { special: 'wirewrite', min: 1, max: 1 }, endTransmission: { ret: U8, p: [U8], min: 0, cost: 100 },
      requestFrom: { ret: U8, p: [U8, U8, U8], min: 2, cost: 100 }, available: { ret: I16, p: [] }, read: { ret: I16, p: [] },
      setClock: { ret: VOID, p: [U32] }
    },
    Servo: {
      attach: { ret: U8, p: [I16, I16, I16], min: 1, cost: 5 }, write: { ret: VOID, p: [I16], cost: 3 },
      writeMicroseconds: { ret: VOID, p: [I16], cost: 3 }, read: { ret: I16, p: [] }, readMicroseconds: { ret: I16, p: [] },
      attached: { ret: BOOL, p: [] }, detach: { ret: VOID, p: [], cost: 3 }
    },
    LiquidCrystal_I2C: {
      init: { ret: VOID, p: [], cost: 120000 }, begin: { ret: VOID, p: [U8, U8, U8], min: 0, cost: 120000 },
      backlight: { ret: VOID, p: [], cost: 200 }, noBacklight: { ret: VOID, p: [], cost: 200 }, setBacklight: { ret: VOID, p: [U8], cost: 200 },
      clear: { ret: VOID, p: [], cost: 3300 }, home: { ret: VOID, p: [], cost: 3300 },
      setCursor: { ret: VOID, p: [U8, U8], cost: 1300 },
      print: { special: 'print', min: 1, max: 2 }, println: { special: 'print', min: 0, max: 2, ln: true },
      write: { special: 'write', min: 1, max: 1 },
      cursor: { ret: VOID, p: [], cost: 1300 }, noCursor: { ret: VOID, p: [], cost: 1300 }, blink: { ret: VOID, p: [], cost: 1300 }, noBlink: { ret: VOID, p: [], cost: 1300 },
      display: { ret: VOID, p: [], cost: 1300 }, noDisplay: { ret: VOID, p: [], cost: 1300 },
      scrollDisplayLeft: { ret: VOID, p: [], cost: 1300 }, scrollDisplayRight: { ret: VOID, p: [], cost: 1300 },
      leftToRight: { ret: VOID, p: [], cost: 1300 }, rightToLeft: { ret: VOID, p: [], cost: 1300 }, autoscroll: { ret: VOID, p: [], cost: 1300 }, noAutoscroll: { ret: VOID, p: [], cost: 1300 },
      createChar: { ret: VOID, p: [U8, 'arr'], cost: 12000 }, printstr: { ret: VOID, p: [TY.cstr] }
    },
    Adafruit_NeoPixel: {
      begin: { ret: VOID, p: [], cost: 5 }, show: { ret: VOID, p: [] },
      setPixelColor: { special: 'setPixelColor', min: 2, max: 5, cost: 3 },
      Color: { ret: U32, p: [U8, U8, U8, U8], min: 3, stat: true }, ColorHSV: { ret: U32, p: [U16, U8, U8], min: 1, stat: true, cost: 5 },
      gamma32: { ret: U32, p: [U32], stat: true }, gamma8: { ret: U8, p: [U8], stat: true },
      setBrightness: { ret: VOID, p: [U8], cost: 5 }, getBrightness: { ret: U8, p: [] },
      clear: { ret: VOID, p: [], cost: 5 }, numPixels: { ret: U16, p: [] }, getPixelColor: { ret: U32, p: [U16] },
      fill: { ret: VOID, p: [U32, U16, U16], min: 0, cost: 5 }, setPin: { ret: VOID, p: [I16] }, canShow: { ret: BOOL, p: [] }
    },
    dht11: { read: { ret: I16, p: [I16], y: true } }
  };
  const FIELDS = { dht11: { temperature: I16, humidity: I16 } };
  const STRING_METHODS = {
    length: { ret: U16, p: [] }, toInt: { ret: I32, p: [], cost: 5 }, toFloat: { ret: F32, p: [], cost: 10 }, toDouble: { ret: F32, p: [], cost: 10 },
    indexOf: { ret: I16, p: ['strch', U16], min: 1, cost: 3 }, lastIndexOf: { ret: I16, p: ['strch', I16], min: 1, cost: 3 },
    charAt: { ret: CHR, p: [U16] }, substring: { ret: TY.String, p: [U16, U16], min: 1, cost: 3 },
    trim: { ret: VOID, p: [], mut: true, cost: 3 }, toUpperCase: { ret: VOID, p: [], mut: true, cost: 3 }, toLowerCase: { ret: VOID, p: [], mut: true, cost: 3 },
    equals: { ret: BOOL, p: ['str'] }, equalsIgnoreCase: { ret: BOOL, p: ['str'] }, startsWith: { ret: BOOL, p: ['str'] }, endsWith: { ret: BOOL, p: ['str'] },
    compareTo: { ret: I16, p: ['str'] }, concat: { ret: BOOL, p: ['any'], mut: true, cost: 3 },
    replace: { ret: VOID, p: ['strch', 'strch'], mut: true, cost: 5 }, remove: { ret: VOID, p: [U16, U16], min: 1, mut: true, cost: 3 },
    setCharAt: { ret: VOID, p: [U16, CHR], mut: true }, c_str: { ret: TY.cstr, p: [] }, reserve: { ret: BOOL, p: [U16] }
  };
  const CONSTS = {
    HIGH: [I16, 1], LOW: [I16, 0], INPUT: [I16, 0], OUTPUT: [I16, 1], INPUT_PULLUP: [I16, 2], LED_BUILTIN: [I16, 13],
    A0: [U8, 14], A1: [U8, 15], A2: [U8, 16], A3: [U8, 17], A4: [U8, 18], A5: [U8, 19],
    DEC: [I16, 10], HEX: [I16, 16], OCT: [I16, 8], BIN: [I16, 2],
    PI: [F32, Math.fround(Math.PI)], HALF_PI: [F32, Math.fround(Math.PI / 2)], TWO_PI: [F32, Math.fround(Math.PI * 2)],
    DEG_TO_RAD: [F32, Math.fround(Math.PI / 180)], RAD_TO_DEG: [F32, Math.fround(180 / Math.PI)], EULER: [F32, Math.fround(Math.E)],
    LSBFIRST: [I16, 0], MSBFIRST: [I16, 1], CHANGE: [I16, 1], FALLING: [I16, 2], RISING: [I16, 3], SERIAL_8N1: [I16, 6], NULL: [I16, 0],
    DEFAULT: [I16, 1], EXTERNAL: [I16, 0], INTERNAL: [I16, 3]
  };
  const LIB_CONSTS = {
    Adafruit_NeoPixel: { NEO_GRB: [U16, 0x52], NEO_RGB: [U16, 0x06], NEO_RGBW: [U16, 0x1B], NEO_GRBW: [U16, 0xD2], NEO_BRG: [U16, 0x58], NEO_KHZ800: [U16, 0], NEO_KHZ400: [U16, 0x100] },
    dht11: { DHTLIB_OK: [I16, 0], DHTLIB_ERROR_CHECKSUM: [I16, -1], DHTLIB_ERROR_TIMEOUT: [I16, -2] },
    Servo: { MIN_PULSE_WIDTH: [I16, 544], MAX_PULSE_WIDTH: [I16, 2400], DEFAULT_PULSE_WIDTH: [I16, 1500] }
  };
  const fnSig = (name, p, ret) => `${(ret || VOID).name} ${name}(${p.map(t => (t && t.name) || 'auto').join(', ')})`;

  // =================================================================== analyzer
  class StopAnalysis extends Error {}
  class Analyzer {
    constructor(pp, src) {
      this.libs = new Set(pp.includes.map(i => i.lib).filter(Boolean));
      this.wireOk = this.libs.has('Wire') || this.libs.has('LiquidCrystal_I2C');
      this.errors = [];
      this.warnings = [];
      this.globals = new Map();
      this.gvars = [];
      this.gslots = 0;
      this.funcs = new Map();
      this.fnList = [];
      this.src = src;
      this.lastLine = pp.toks.length ? pp.toks[pp.toks.length - 1].line : 1;
      this.statics = [];
    }
    error(line, zh, en) {
      if (!this.errors.some(e => e.line === line)) this.errors.push(fmtErr(line, zh, en));
      if (this.errors.length >= 5) throw new StopAnalysis();
      return TY.err;
    }
    warn(line, zh, en) { this.warnings.push(fmtErr(line, zh, en)); }

    run(items) {
      try {
        // functions are visible everywhere (the Arduino IDE generates prototypes)
        for (const it of items) if (it.k === 'Func') this.declareFunc(it);
        for (const it of items) {
          if (it.k === 'Var') this.globalVar(it);
          else if (it.k === 'Func' && it.body) this.funcBody(it);
        }
        const need = name => {
          const f = this.funcs.get(name);
          const d = f && f.find(o => o.params.length === 0 && o.def);
          if (!d) this.error(this.lastLine, `程序里没有 ${name}() 函数：Arduino 程序必须有 void ${name}() { … }（检查拼写和大小写）`, `undefined reference to \`${name}'`);
          return d;
        };
        this.setup = need('setup');
        this.loop = need('loop');
        for (const d of this.fnList) {
          if (!d.def && d.called) this.error(d.calledLine || d.line, `函数 ${d.name}() 只有声明，没有写出函数体 { … }`, `undefined reference to \`${d.name}()'`);
        }
      } catch (e) {
        if (!(e instanceof StopAnalysis)) throw e;
      }
      // which functions may block (contain loops / delay / pulseIn …, or call one that does)
      let changed = true;
      while (changed) {
        changed = false;
        for (const d of this.fnList) {
          if (d.y) continue;
          if (d.selfY) { d.y = true; changed = true; continue; }
          for (const c of d.callees) if (c.y) { d.y = true; changed = true; break; }
        }
      }
    }

    // ---------------- declarations
    checkTypeAvailable(spec) {
      if (spec.lib && !this.libs.has(spec.lib)) {
        const h = LIB_TYPES[spec.lib];
        this.error(spec.line, `'${spec.lib}' 不是已知的类型：是不是忘了 #include ${h === 'Servo.h' || h === 'Adafruit_NeoPixel.h' ? '<' + h + '>' : '"' + h + '"'}？`, `'${spec.lib}' does not name a type`);
        return false;
      }
      return true;
    }
    declareFunc(it) {
      this.checkTypeAvailable(it.ret);
      const params = it.params.map(p => {
        this.checkTypeAvailable(p.spec);
        let ty = p.spec.ty;
        if (ty.k === 'void') this.error(p.line, '参数的类型不能是 void', "invalid use of type 'void' in parameter declaration");
        if (p.arr) ty = arrT(ty, null);
        return { ty, name: p.name, def: p.def, line: p.line, text: p.spec.text };
      });
      if (BUILTINS[it.name] && it.name !== 'yield')
        this.error(it.line, `函数名 ${it.name} 和 Arduino 自带的函数重名了，换一个名字`, `conflicting declaration of '${it.name}'`);
      let list = this.funcs.get(it.name);
      if (!list) this.funcs.set(it.name, list = []);
      let d = list.find(o => o.params.length === params.length);
      if (d) {
        const same = d.params.every((p, i) => p.ty.k === params[i].ty.k) && d.ret === it.ret.ty;
        if (!same) {
          if (d.params.every((p, i) => p.ty.k === params[i].ty.k))
            return this.error(it.line, `函数 ${it.name} 的返回类型和前面的声明不一致`, `ambiguating new declaration of '${fnSig(it.name, params.map(p => p.ty), it.ret.ty)}'`);
          return this.error(it.line, `模拟器暂不支持参数个数相同的同名函数（重载）：${it.name}`, `overloading by parameter type is not supported by the simulator`);
        }
        params.forEach((p, i) => { if (!p.def && d.params[i].def) p.def = d.params[i].def; });   // defaults given in the prototype
        if (it.body) {
          if (d.def) return this.error(it.line, `函数 ${it.name}() 重复定义了（前面第 ${d.def.line} 行已经写过）`, `redefinition of '${fnSig(it.name, params.map(p => p.ty), it.ret.ty)}'`);
          d.def = it; d.line = it.line; d.params = params;
        } else {
          d.params.forEach((p, i) => { if (!p.def && params[i].def) p.def = params[i].def; });
        }
        it.decl = d;
        return;
      }
      d = { name: it.name, ret: it.ret.ty, retText: it.ret.text, params, def: it.body ? it : null, line: it.line, id: this.fnList.length,
        selfY: false, y: false, callees: new Set(), nslots: 0, called: false };
      list.push(d);
      this.fnList.push(d);
      it.decl = d;
    }
    globalVar(it) {
      if (!this.checkTypeAvailable(it.spec)) return;
      for (const d of it.decls) {
        if (this.globals.has(d.name)) {
          const prev = this.globals.get(d.name);
          this.error(d.line, `全局变量 '${d.name}' 重复定义了（第 ${prev.line} 行已经有了）`, `redefinition of '${it.spec.text} ${d.name}'`);
          continue;
        }
        if (this.funcs.has(d.name)) { this.error(d.line, `'${d.name}' 已经是一个函数的名字了，变量换个名字`, `'${it.spec.text} ${d.name}' redeclared as different kind of symbol`); continue; }
        const sym = this.declVar(it, d, null, null);
        if (!sym) continue;
        sym.slot = this.gslots++;
        sym.global = true;
        this.globals.set(d.name, sym);
        this.gvars.push(sym);
        d.sym = sym;
      }
    }
    /** Shared by globals and locals: resolve the type, analyse the initialiser. */
    declVar(it, d, sc, fn) {
      const spec = it.spec;
      let ty = spec.ty;
      if (ty.k === 'void') { this.error(d.line, `变量 '${d.name}' 的类型不能是 void`, `variable or field '${d.name}' declared void`); return null; }
      if (d.arr !== null) {
        let n = null;
        if (d.arr === 'unsized') {
          if (!d.init) { this.error(d.line, `数组 '${d.name}' 没写大小，也没有初始值`, `storage size of '${d.name}' isn't known`); return null; }
          if (d.init.k === 'InitList') n = d.init.items.length;
          else if (d.init.k === 'Str') n = d.init.v.length + 1;
          else { this.error(d.line, `数组 '${d.name}' 的初始值要用 { … } 括起来`, `initializer fails to determine size of '${d.name}'`); return null; }
        } else {
          this.expr(d.arr, sc, fn);
          const cv = this.constVal(d.arr);
          if (cv == null || !d.arr.ty.int) { this.error(d.line, `数组大小必须是整数常量（数字、#define 或 const int）`, `array bound is not an integer constant before ']' token`); return null; }
          if (cv <= 0 || cv > 4096) { this.error(d.line, `数组 '${d.name}' 的大小 ${cv} 不合理（UNO 只有 2KB 内存）`, `size of array '${d.name}' is ${cv <= 0 ? 'negative' : 'too large'}`); return null; }
          n = cv;
        }
        if (ty.k === 'obj') { this.error(d.line, '模拟器暂不支持对象数组', 'arrays of library objects are not supported by the simulator'); return null; }
        ty = arrT(ty, n);
      }
      const sym = { kind: 'var', name: d.name, ty, cnst: spec.cnst, line: d.line, typeText: (spec.cnst ? 'const ' : '') + spec.text + (ty.k === 'arr' ? `[${ty.n}]` : ''), stat: spec.stat };
      // initialiser
      if (d.init) {
        if (ty.k === 'arr') {
          if (d.init.k === 'InitList') {
            if (d.init.items.length > ty.n) this.error(d.line, `数组 '${d.name}' 只有 ${ty.n} 个位置，初始值给了 ${d.init.items.length} 个`, `too many initializers for '${ty.el.name} [${ty.n}]'`);
            for (const e of d.init.items) { const t = this.expr(e, sc, fn); this.assignable(ty.el, t, e.line, e); }
          } else if (d.init.k === 'Str' && (ty.el.k === 'char' || ty.el.k === 'uchar' || ty.el.k === 'schar')) {
            this.expr(d.init, sc, fn);
            if (d.init.v.length + 1 > ty.n) this.error(d.line, `字符数组 '${d.name}' 太小，放不下这个字符串（还要算上结尾的 \\0）`, `initializer-string for array of chars is too long`);
          } else this.error(d.line, `数组 '${d.name}' 的初始值要用 { … } 括起来`, `array must be initialized with a brace-enclosed initializer`);
        } else {
          if (d.init.k === 'InitList') {
            if (d.init.items.length !== 1) this.error(d.line, `'${d.name}' 不是数组，不能用 { … } 给多个初始值`, `scalar object '${d.name}' requires one element in initializer`);
            else d.init = d.init.items[0];
          }
          if (d.init.k !== 'InitList') {
            const t = this.expr(d.init, sc, fn);
            if (ty.k === 'obj') this.error(d.line, `${ty.cls} 对象不能用 = 初始化`, `conversion to non-scalar type '${ty.cls}' requested`);
            else this.assignable(ty, t, d.line, d.init);
            if (spec.cnst && ty.num) { const cv = this.constVal(d.init); if (cv != null) sym.cv = ty.conv(cv); }
          }
        }
      } else if (d.ctor) {
        if (ty.k === 'obj') this.ctorArgs(ty, d, sc, fn);
        else if (ty.k === 'String' || ty.num) {
          if (d.ctor.length !== 1) this.error(d.line, `'${d.name}' 的初始值写法不对`, `expression list treated as compound expression in initializer`);
          else { const t = this.expr(d.ctor[0], sc, fn); this.assignable(ty, t, d.line, d.ctor[0]); d.init = d.ctor[0]; d.ctor = null; if (spec.cnst && ty.num) { const cv = this.constVal(d.init); if (cv != null) sym.cv = ty.conv(cv); } }
        } else this.error(d.line, `'${d.name}' 的初始值写法不对`, `bad initializer`);
      } else if (spec.cnst && ty.k !== 'obj') {
        this.error(d.line, `常量 '${d.name}' 必须在声明时给初始值`, `uninitialized const '${d.name}'`);
      }
      if (ty.k === 'obj' && !d.ctor) this.ctorArgs(ty, d, sc, fn);
      return sym;
    }
    ctorArgs(ty, d, sc, fn) {
      const args = d.ctor || [];
      const want = { Servo: [0, 0], LiquidCrystal_I2C: [3, 3], Adafruit_NeoPixel: [0, 3], dht11: [0, 0], HardwareSerial: [0, 0], TwoWire: [0, 0] }[ty.cls];
      if (args.length < want[0] || args.length > want[1]) {
        const usage = { LiquidCrystal_I2C: 'LiquidCrystal_I2C lcd(0x27, 16, 2);', Adafruit_NeoPixel: 'Adafruit_NeoPixel pixels(12, 10, NEO_GRB + NEO_KHZ800);' }[ty.cls] || `${ty.cls} ${d.name};`;
        this.error(d.line, `创建 ${ty.cls} 对象的参数个数不对，写法是：${usage}`, `no matching function for call to '${ty.cls}::${ty.cls}(${args.map(() => 'int').join(', ')})'`);
        return;
      }
      for (const a of args) { const t = this.expr(a, sc, fn); if (t.k !== 'err' && !t.num) this.error(a.line, `${ty.cls} 的参数要是数字`, `invalid conversion from '${t.name}' to 'int'`); }
      d.ctorArgs = args;
    }
    funcBody(it) {
      const d = it.decl;
      if (!d || d.def !== it) return;
      const fn = { decl: d, nslots: 0, loops: 0, switches: 0 };
      const sc = { vars: new Map(), parent: null };
      d.params.forEach((p, i) => {
        if (p.name) {
          if (sc.vars.has(p.name)) this.error(p.line, `参数名 '${p.name}' 重复了`, `redefinition of '${p.text} ${p.name}'`);
          const sym = { kind: 'var', name: p.name, ty: p.ty, local: true, slot: fn.nslots++, line: p.line, param: true };
          sc.vars.set(p.name, sym);
          p.sym = sym;
        } else fn.nslots++;
        if (p.def && !p.def.ty) { this.expr(p.def, null, null); this.assignable(p.ty, p.def.ty, p.line, p.def); }
      });
      d.firstDefault = d.params.findIndex(p => p.def);
      this.block(it.body, sc, fn, true);
      d.nslots = fn.nslots;
    }

    // ---------------- statements
    block(b, sc, fn, isFnBody) {
      const inner = isFnBody ? sc : { vars: new Map(), parent: sc };
      if (isFnBody) inner.fnTop = true;
      for (const s of b.body) this.stmt(s, inner, fn);
    }
    localVar(it, sc, fn) {
      if (!this.checkTypeAvailable(it.spec)) return;
      for (const d of it.decls) {
        if (sc.vars.has(d.name)) {
          const prev = sc.vars.get(d.name);
          this.error(d.line, `变量 '${d.name}' 在这里重复声明了（第 ${prev.line} 行已经声明过）`, `redeclaration of '${it.spec.text} ${d.name}'`);
          continue;
        }
        const sym = this.declVar(it, d, sc, fn);
        if (!sym) continue;
        if (it.spec.stat) {
          sym.slot = this.gslots++; sym.global = true; sym.hidden = true;
          this.statics.push({ d, sym });
          if (d.init && this.constVal(d.init) == null && sym.ty.k !== 'String') this.error(d.line, '模拟器里 static 局部变量的初始值要是常量', 'non-constant static initializer is not supported by the simulator');
        } else { sym.slot = fn.nslots++; sym.local = true; }
        sc.vars.set(d.name, sym);
        d.sym = sym;
      }
    }
    stmt(s, sc, fn) {
      switch (s.k) {
        case 'Block': return this.block(s, sc, fn, false);
        case 'Empty': return;
        case 'Var': return this.localVar(s, sc, fn);
        case 'Expr':
          this.expr(s.e, sc, fn);
          return;
        case 'If': {
          this.cond(s.c, sc, fn);
          if (s.c.k === 'Asg' && s.c.op === '=' && !s.c.paren)
            this.warn(s.line, 'if 的条件里只写了一个等号 =，这是“赋值”不是“比较”；比较相等要用 ==', 'suggest parentheses around assignment used as truth value');
          this.sub(s.a, sc, fn);
          if (s.b) this.sub(s.b, sc, fn);
          return;
        }
        case 'While': case 'Do': {
          fn.decl.selfY = true;
          this.cond(s.c, sc, fn);
          fn.loops++; this.sub(s.body, sc, fn); fn.loops--;
          return;
        }
        case 'For': {
          fn.decl.selfY = true;
          const inner = { vars: new Map(), parent: sc };
          if (s.init) { if (s.init.k === 'Var') this.localVar(s.init, inner, fn); else this.expr(s.init.e, inner, fn); }
          if (s.c) this.cond(s.c, inner, fn);
          if (s.u) this.expr(s.u, inner, fn);
          fn.loops++; this.sub(s.body, inner, fn); fn.loops--;
          return;
        }
        case 'Switch': {
          const t = this.expr(s.e, sc, fn);
          if (t.k !== 'err' && !(t.int)) this.error(s.line, 'switch 括号里要放整数（int、char、byte…）', `switch quantity not an integer`);
          const seen = new Map();
          let hasDef = false;
          for (const lb of s.labels) {
            if (!lb.test) { if (hasDef) this.error(lb.line, 'switch 里有两个 default', 'multiple default labels in one switch'); hasDef = true; continue; }
            this.expr(lb.test, sc, fn);
            const cv = this.constVal(lb.test);
            if (cv == null) { this.error(lb.line, 'case 后面必须是常量（数字、字符或 #define 的值）', 'case label does not reduce to an integer constant'); continue; }
            lb.v = cv;
            if (seen.has(cv)) this.error(lb.line, `case ${cv} 重复了`, `duplicate case value`);
            seen.set(cv, lb);
          }
          const inner = { vars: new Map(), parent: sc };
          fn.switches++;
          for (const b of s.body) this.stmt(b, inner, fn);
          fn.switches--;
          return;
        }
        case 'Break':
          if (!fn.loops && !fn.switches) this.error(s.line, 'break 只能用在循环（for / while）或 switch 里面', 'break statement not within loop or switch');
          return;
        case 'Continue':
          if (!fn.loops) this.error(s.line, 'continue 只能用在循环（for / while）里面', 'continue statement not within a loop');
          return;
        case 'Return': {
          const rt = fn.decl.ret;
          if (s.e) {
            const t = this.expr(s.e, sc, fn);
            if (rt.k === 'void') { if (t.k !== 'void' && t.k !== 'err') this.error(s.line, `void 函数 ${fn.decl.name}() 不能 return 一个值`, `return-statement with a value, in function returning 'void'`); }
            else this.assignable(rt, t, s.line, s.e);
          } else if (rt.k !== 'void') {
            this.warn(s.line, `函数 ${fn.decl.name}() 应该 return 一个 ${rt.name} 值`, `return-statement with no value, in function returning '${rt.name}'`);
          }
          return;
        }
        default: throw new Error('unknown statement ' + s.k);
      }
    }
    sub(s, sc, fn) {
      if (s.k === 'Var') { const inner = { vars: new Map(), parent: sc }; return this.localVar(s, inner, fn); }
      return this.stmt(s, sc, fn);
    }
    cond(e, sc, fn) {
      const t = this.expr(e, sc, fn);
      if (t.k === 'err') return;
      if (!(t.num || t.k === 'String' || t.k === 'cstr' || t.k === 'arr' || (t.k === 'obj' && (t.cls === 'HardwareSerial')))) {
        this.error(e.line, `这里的条件要是数值或比较结果，不能是 ${t.name}`, `could not convert '${t.name}' to 'bool'`);
      }
      if (t.k === 'void') this.error(e.line, '这个函数没有返回值（void），不能当条件', 'void value not ignored as it ought to be');
    }

    // ---------------- helpers
    lookup(name, sc) {
      for (let s = sc; s; s = s.parent) { const v = s.vars.get(name); if (v) return v; }
      return this.globals.get(name) || null;
    }
    constVal(e) {
      switch (e.k) {
        case 'Num': return e.v;
        case 'Id':
          if (e.cst) return e.cst.v;
          if (e.sym && e.sym.cv != null) return e.sym.cv;
          return null;
        case 'Un': {
          const v = this.constVal(e.e); if (v == null) return null;
          const t = e.ty;
          if (e.op === '-') return t.conv(-v); if (e.op === '+') return v; if (e.op === '~') return t.conv(~v); if (e.op === '!') return v ? 0 : 1;
          return null;
        }
        case 'Bin': {
          const a = this.constVal(e.l), b = this.constVal(e.r);
          if (a == null || b == null) return null;
          if (!e.ty || !e.ty.num) return null;
          return evalBinConst(e, a, b);
        }
        case 'Cast': { const v = this.constVal(e.e); return v == null || !e.ty.num ? null : e.ty.conv(v); }
        case 'Sizeof': return e.cv;
        case 'Cond': { const c = this.constVal(e.c); if (c == null) return null; const v = this.constVal(c ? e.a : e.b); return v == null ? null : e.ty.conv(v); }
        case 'Comma': return null;
        default: return null;
      }
    }
    isLvalue(e) {
      if (e.k === 'Id') return !!e.sym;
      if (e.k === 'Idx') return e.a.ty && (e.a.ty.k === 'arr');
      if (e.k === 'Mem') return !!e.field;
      return false;
    }
    /** Can a value of type `from` be stored in `to`? Reports an error otherwise. */
    assignable(to, from, line, node) {
      if (!from || from.k === 'err' || to.k === 'err') return true;
      if (from.k === 'void') { this.error(line, '这个函数没有返回值（void），不能当数值用', 'void value not ignored as it ought to be'); return false; }
      if (to.num) {
        if (from.num) return true;
        if (from.k === 'String') { this.error(line, `String 不能直接赋给 ${to.name}：要用 .toInt() 或 .toFloat() 转换`, `cannot convert 'String' to '${to.name}' in assignment`); return false; }
        if (from.k === 'cstr') { this.error(line, `字符串 "…" 不能赋给 ${to.name}${to.k === 'char' ? "：单个字符要用单引号，例如 'A'" : ''}`, `invalid conversion from 'const char*' to '${to.name}'`); return false; }
        if (from.k === 'arr') { this.error(line, `数组不能整个赋给 ${to.name}（要写下标，例如 a[0]）`, `invalid conversion from '${from.el.name}*' to '${to.name}'`); return false; }
        this.error(line, `${from.name} 不能赋给 ${to.name}`, `cannot convert '${from.name}' to '${to.name}' in assignment`); return false;
      }
      if (to.k === 'String') {
        if (from.num || from.k === 'String' || from.k === 'cstr' || isStrish(from)) return true;
        this.error(line, `${from.name} 不能赋给 String`, `conversion from '${from.name}' to non-scalar type 'String' requested`); return false;
      }
      if (to.k === 'cstr') {
        if (from.k === 'cstr' || isStrish(from)) return true;
        if (from.k === 'String') { this.error(line, 'String 不能直接赋给 char*：用 .c_str()', "cannot convert 'String' to 'const char*' in initialization"); return false; }
        this.error(line, `${from.name} 不能赋给 char*`, `invalid conversion from '${from.name}' to 'const char*'`); return false;
      }
      if (to.k === 'arr') {
        if (from.k === 'arr' && (from.el.k === to.el.k)) return true;
        if (to.n == null && from.k === 'arr') { this.error(line, `数组类型不匹配：需要 ${to.el.name} 数组，这里是 ${from.el.name} 数组`, `cannot convert '${from.el.name}*' to '${to.el.name}*'`); return false; }
        this.error(line, '数组不能用 = 整个赋值（要一个一个元素地赋值）', `invalid array assignment`); return false;
      }
      if (to.k === 'obj') {
        if (from.k === 'obj' && from.cls === to.cls) return true;
        this.error(line, `${from.name} 不能赋给 ${to.cls} 对象`, `no match for 'operator='`); return false;
      }
      return true;
    }
    undeclared(e, asCall) {
      const name = e.name;
      if (name === 'Wire') {
        if (this.wireReported) return TY.err;
        this.wireReported = true;
        return this.error(e.line, "'Wire' 没有声明：是不是忘了 #include <Wire.h>？", "'Wire' was not declared in this scope");
      }
      if (LIB_TYPES[name]) return this.error(e.line, `'${name}' 是类型名：要先创建对象，例如 ${name === 'Servo' ? 'Servo myservo;' : name + ' obj;'}`, `expected primary-expression before '.' token`);
      for (const lib in LIB_CONSTS) if (LIB_CONSTS[lib][name]) return this.error(e.line, `'${name}' 没有声明：是不是忘了 #include ${lib === 'Servo' || lib === 'Adafruit_NeoPixel' ? '<' + lib + '.h>' : '"' + lib + '.h"'}？`, `'${name}' was not declared in this scope`);
      if (UNSUPPORTED_FUNCS.has(name)) return this.error(e.line, `模拟器暂不支持 ${name}()`, `'${name}' is not supported by the simulator`);
      // spelling / case hints
      const cands = [];
      for (let s = e.scope; s; s = s.parent) for (const k of s.vars.keys()) cands.push(k);
      for (const k of this.globals.keys()) cands.push(k);
      for (const k of this.funcs.keys()) cands.push(k);
      cands.push(...Object.keys(BUILTINS), ...Object.keys(CONSTS), 'Serial');
      if (this.wireOk) cands.push('Wire');
      const low = name.toLowerCase();
      let hint = cands.find(c => c.toLowerCase() === low);
      if (!hint) hint = cands.find(c => c.length >= 4 && editDist(c.toLowerCase(), low) <= (c.length >= 6 ? 2 : 1));
      if (!this.reported) this.reported = new Set();
      if (this.reported.has(name)) return TY.err;            // GCC reports each undeclared name once
      this.reported.add(name);
      const what = asCall ? `函数 ${name}() 没有定义` : `'${name}' 没有声明`;
      let how = asCall ? '：检查拼写，或者先写出这个函数' : '：变量要先声明再使用，例如 int ' + name + ' = 0;';
      if (e.asObj) {
        const ex = /lcd/i.test(name) ? `LiquidCrystal_I2C ${name}(0x27, 16, 2);` : /servo/i.test(name) ? `Servo ${name};` : /pix|strip|ring|neo/i.test(name) ? `Adafruit_NeoPixel ${name}(12, 10, NEO_GRB + NEO_KHZ800);` : /dht/i.test(name) ? `dht11 ${name};` : '';
        how = `：要先在程序开头创建这个对象${ex ? '，例如 ' + ex : ''}`;
      }
      return this.error(e.line, `${what}${hint ? `：是不是想写 ${hint}？（大小写也要一样）` : how}`, `'${name}' was not declared in this scope`);
    }

    // ---------------- expressions (annotate e.ty)
    expr(e, sc, fn) {
      const t = this.expr0(e, sc, fn);
      e.ty = t || TY.err;
      return e.ty;
    }
    expr0(e, sc, fn) {
      switch (e.k) {
        case 'Num': return e.ty;
        case 'Str': return TY.cstr;
        case 'Id': {
          const sym = this.lookup(e.name, sc);
          if (sym) { e.sym = sym; return sym.ty; }
          if (e.name === 'Serial') { e.obj = 'Serial'; return CLS.HardwareSerial; }
          if (e.name === 'Wire' && this.wireOk) { e.obj = 'Wire'; return CLS.TwoWire; }
          if (CONSTS[e.name]) { e.cst = { ty: CONSTS[e.name][0], v: CONSTS[e.name][1] }; return e.cst.ty; }
          for (const lib of this.libs) {
            const c = LIB_CONSTS[lib] && LIB_CONSTS[lib][e.name];
            if (c) { e.cst = { ty: c[0], v: c[1] }; return c[0]; }
          }
          if (this.funcs.has(e.name) || BUILTINS[e.name]) return this.error(e.line, `${e.name} 是函数，要加括号调用：${e.name}(…)`, `invalid use of function '${e.name}'`);
          e.scope = sc;
          return this.undeclared(e, false);
        }
        case 'Bin': return this.binary(e, sc, fn);
        case 'Log': {
          this.cond(e.l, sc, fn); this.cond(e.r, sc, fn);
          return TY.bool;
        }
        case 'Asg': return this.assign(e, sc, fn);
        case 'Un': {
          const t = this.expr(e.e, sc, fn);
          if (t.k === 'err') return t;
          if (e.op === '!') {
            if (!(t.num || t.k === 'obj' || t.k === 'String' || t.k === 'cstr')) return this.error(e.line, `! 后面要是数值或条件`, `no match for 'operator!'`);
            return TY.bool;
          }
          if (!t.num) return this.error(e.line, `${e.op} 只能用在数字上，不能用在 ${t.name} 上`, `wrong type argument to unary ${e.op === '~' ? 'complement' : e.op === '-' ? 'minus' : 'plus'}`);
          if (e.op === '~' && t.float) return this.error(e.line, '~ 只能用在整数上', 'wrong type argument to bit-complement');
          return t.float ? TY.float : prom(t);
        }
        case 'Upd': {
          const t = this.expr(e.e, sc, fn);
          if (t.k === 'err') return t;
          if (!this.isLvalue(e.e)) return this.error(e.line, `${e.op} 只能用在变量上`, `lvalue required as ${e.op === '++' ? 'increment' : 'decrement'} operand`);
          if (!t.num) return this.error(e.line, `${e.op} 只能用在数字变量上`, `no match for 'operator${e.op}'`);
          this.checkConstTarget(e.e);
          return t;
        }
        case 'Cond': {
          this.cond(e.c, sc, fn);
          const a = this.expr(e.a, sc, fn), b = this.expr(e.b, sc, fn);
          if (a.k === 'err' || b.k === 'err') return TY.err;
          if (a.num && b.num) return a === b ? a : arith(a, b);
          if ((a.k === 'String' || isStrish(a)) && (b.k === 'String' || isStrish(b))) return (a.k === 'String' || b.k === 'String') ? TY.String : TY.cstr;
          if (a.k === b.k && a.k !== 'obj') return a;
          if (a.k === 'void' && b.k === 'void') return TY.void;
          return this.error(e.line, `? : 两边的类型不一样（${a.name} 和 ${b.name}）`, `operands to ?: have different types '${a.name}' and '${b.name}'`);
        }
        case 'Call': return this.call(e, sc, fn);
        case 'Mem': {
          if (e.o.k === 'Id') e.o.asObj = true;
          const t = this.expr(e.o, sc, fn);
          if (t.k === 'err') return t;
          if (t.k === 'obj') {
            const f = FIELDS[t.cls] && FIELDS[t.cls][e.name];
            if (f) { e.field = e.name; return f; }
            if (METHODS[t.cls] && METHODS[t.cls][e.name]) return this.error(e.line, `${e.name} 是函数，要加括号：.${e.name}(…)`, `invalid use of non-static member function`);
            return this.noMember(e, t);
          }
          if (t.k === 'String') {
            if (STRING_METHODS[e.name]) return this.error(e.line, `${e.name} 是函数，要加括号：.${e.name}()`, `invalid use of non-static member function`);
            return this.noMember(e, t);
          }
          return this.error(e.line, `'${exprName(e.o)}' 不是对象，不能用 .${e.name}`, `request for member '${e.name}' in '${exprName(e.o)}', which is of non-class type '${t.name}'`);
        }
        case 'Idx': {
          const a = this.expr(e.a, sc, fn), i = this.expr(e.i, sc, fn);
          if (a.k === 'err' || i.k === 'err') return TY.err;
          if (!i.int) return this.error(e.line, '数组下标要是整数', `invalid types '${a.name}[${i.name}]' for array subscript`);
          if (a.k === 'arr') {
            const cv = this.constVal(e.i);
            if (cv != null && a.n != null && (cv < 0 || cv >= a.n))
              this.warn(e.line, `数组下标 ${cv} 超出范围（只有 0～${a.n - 1}）`, `array subscript ${cv} is above array bounds of '${a.el.name} [${a.n}]'`);
            return a.el;
          }
          if (a.k === 'String' || a.k === 'cstr') { e.strIdx = true; return TY.char; }
          return this.error(e.line, `'${exprName(e.a)}' 不是数组，不能用 [ ]`, `invalid types '${a.name}[${i.name}]' for array subscript`);
        }
        case 'Cast': {
          this.checkTypeAvailable(e.spec);
          const to = e.spec.ty;
          const t = this.expr(e.e, sc, fn);
          if (t.k === 'err') return t;
          if (to.num) {
            if (!t.num) return this.error(e.line, `${t.name} 不能强制转换成 ${to.name}${t.k === 'String' ? '（用 .toInt() / .toFloat()）' : ''}`, `invalid cast from type '${t.name}' to type '${to.name}'`);
            return to;
          }
          if (to.k === 'String') { e.k = 'StrCtor'; e.args = [e.e]; return TY.String; }
          if (to.k === 'cstr') return TY.cstr;
          if (to.k === 'void') return TY.void;
          return this.error(e.line, `不能转换成 ${to.name}`, `invalid cast to type '${to.name}'`);
        }
        case 'Sizeof': {
          let t;
          if (e.spec) t = e.spec.ty; else t = this.expr(e.e, sc, fn);
          if (t.k === 'err') return t;
          if (t.k === 'arr' && t.n == null) this.warn(e.line, 'sizeof 作用在数组参数上得到的是指针大小（2），不是数组长度', "'sizeof' on array function parameter will return size of 'int*'");
          e.cv = t.k === 'arr' && t.n == null ? 2 : sizeOfT(t);
          return TY.uint;
        }
        case 'Comma': {
          let t = TY.void;
          for (const x of e.list) t = this.expr(x, sc, fn);
          return t;
        }
        case 'StrCtor': {
          if (e.args.length > 2) return this.error(e.line, 'String(…) 最多两个参数', `no matching function for call to 'String::String(...)'`);
          const ts = e.args.map(a => this.expr(a, sc, fn));
          if (ts.some(t => t.k === 'err')) return TY.err;
          if (e.args.length >= 1 && !(ts[0].num || ts[0].k === 'String' || isStrish(ts[0]))) return this.error(e.line, `${ts[0].name} 不能转换成 String`, `no matching function for call to 'String::String(${ts[0].name})'`);
          if (e.args.length === 2 && !(ts[0].num && ts[1].int)) return this.error(e.line, 'String(数值, 进制或小数位数) 的写法不对', `no matching function for call to 'String::String(${ts.map(t => t.name).join(', ')})'`);
          return TY.String;
        }
        case 'Static': {
          return this.error(e.line, `${e.cls}::${e.name} 要加括号调用`, `invalid use of member function`);
        }
        case 'InitList': return this.error(e.line, '{ … } 只能用在数组声明里', 'expected primary-expression before \'{\' token');
        default: throw new Error('unknown expression ' + e.k);
      }
    }
    noMember(e, t) {
      const list = t.k === 'String' ? Object.keys(STRING_METHODS) : Object.keys(METHODS[t.cls] || {}).concat(Object.keys(FIELDS[t.cls] || {}));
      const low = e.name.toLowerCase();
      const hint = list.find(n => n.toLowerCase() === low) || list.find(n => editDist(n.toLowerCase(), low) <= 2);
      return this.error(e.line, `${exprName(e.o)} 没有叫 ${e.name} 的函数或成员${hint ? `：是不是想写 ${hint}？` : ''}`, `'class ${t.name}' has no member named '${e.name}'`);
    }
    checkConstTarget(l) {
      if (l.k === 'Id' && l.sym && l.sym.cnst) this.error(l.line, `'${l.name}' 是常量（const），不能再修改`, `assignment of read-only variable '${l.name}'`);
    }
    binary(e, sc, fn) {
      const a = this.expr(e.l, sc, fn), b = this.expr(e.r, sc, fn);
      if (a.k === 'err' || b.k === 'err') return TY.err;
      if (a.k === 'void' || b.k === 'void') return this.error(e.line, '没有返回值（void）的函数不能参与运算', 'void value not ignored as it ought to be');
      return this.binType(e, e.op, a, b);
    }
    binType(e, op, a, b) {
      const bad = () => this.error(e.line, `${a.name} 和 ${b.name} 不能做 ${op} 运算`, `invalid operands of types '${a.name}' and '${b.name}' to binary 'operator${op}'`);
      const strA = a.k === 'String', strB = b.k === 'String';
      const cA = a.k === 'cstr' || (a.k === 'arr' && isStrish(a)), cB = b.k === 'cstr' || (b.k === 'arr' && isStrish(b));
      switch (op) {
        case '+':
          if (strA || strB) {
            if ((strA || cA || a.num) && (strB || cB || b.num)) { e.strcat = true; return TY.String; }
            return bad();
          }
          if (cA && b.int) { e.ptr = 'l'; return TY.cstr; }
          if (cB && a.int) { e.ptr = 'r'; return TY.cstr; }
          if (cA && cB) return this.error(e.line, '两个 "字符串" 不能直接用 + 拼接：先把其中一个变成 String，例如 String("abc") + "def"', `invalid operands of types 'const char*' and 'const char*' to binary 'operator+'`);
          if (a.num && b.num) return (e.opT = arith(a, b));
          return bad();
        case '-':
          if (cA && b.int) { e.ptr = 'l'; e.neg = true; return TY.cstr; }
          if (a.num && b.num) return (e.opT = arith(a, b));
          return bad();
        case '*': case '/':
          if (a.num && b.num) return (e.opT = arith(a, b));
          return bad();
        case '%':
          if (a.int && b.int) return (e.opT = arith(a, b));
          if (a.num && b.num) return this.error(e.line, '% 只能用在整数上（小数取余可以用 fmod()）', `invalid operands of types '${a.name}' and '${b.name}' to binary 'operator%'`);
          return bad();
        case '<<': case '>>':
          if (a.int && b.int) return (e.opT = prom(a));
          return bad();
        case '&': case '|': case '^':
          if (a.int && b.int) return (e.opT = arith(a, b));
          return bad();
        case '==': case '!=': case '<': case '>': case '<=': case '>=':
          if (a.num && b.num) { e.opT = arith(a, b); return TY.bool; }
          if ((strA || cA || (a.k === 'char')) && (strB || cB || b.k === 'char') && (strA || strB || (cA && cB))) { e.strcmp = true; return TY.bool; }
          return this.error(e.line, `${a.name} 和 ${b.name} 不能比较`, `no match for 'operator${op}' (operand types are '${a.name}' and '${b.name}')`);
        default: return bad();
      }
    }
    assign(e, sc, fn) {
      const lt = this.expr(e.l, sc, fn);
      const rt = this.expr(e.r, sc, fn);
      if (lt.k === 'err' || rt.k === 'err') return lt.k === 'err' ? lt : TY.err;
      if (!this.isLvalue(e.l)) {
        if (e.l.k === 'Idx' && e.l.strIdx) return this.error(e.line, '模拟器暂不支持用 s[i] = … 修改 String 里的字符，请用 s.setCharAt(i, c)', 'assignment to String characters is not supported by the simulator');
        return this.error(e.line, '赋值号 = 左边必须是变量' + (e.l.k === 'Num' ? '（比较相等要用 ==）' : ''), 'lvalue required as left operand of assignment');
      }
      this.checkConstTarget(e.l);
      if (lt.k === 'arr') return this.error(e.line, '数组不能用 = 整个赋值（要一个一个元素地赋值）', 'invalid array assignment');
      if (e.op === '=') { this.assignable(lt, rt, e.line, e.r); return lt; }
      const op = e.op.slice(0, -1);
      if (lt.k === 'String') {
        if (op !== '+') return this.error(e.line, `String 只能用 += 追加内容`, `no match for 'operator${e.op}'`);
        if (!(rt.num || rt.k === 'String' || isStrish(rt))) return this.error(e.line, `${rt.name} 不能追加到 String 后面`, `no match for 'operator+='`);
        e.strcat = true;
        return lt;
      }
      const t = this.binType(e, op, lt, rt);
      if (t.k === 'err') return t;
      this.assignable(lt, t, e.line, e);
      return lt;
    }

    // ---------------- calls
    argCheck(e, name, d, sc, fn, sigName) {
      const n = e.args.length;
      const max = d.max != null ? d.max : d.p.length;
      const min = d.min != null ? d.min : d.p.length;
      const sig = sigName || fnSig(name, d.p.filter(p => p && p.k), d.ret);
      if (n < min) return this.error(e.line, `调用 ${name}() 参数太少：需要 ${min === max ? min : min + '～' + max} 个，这里只给了 ${n} 个`, `too few arguments to function '${sig}'`);
      if (n > max) return this.error(e.line, `调用 ${name}() 参数太多：最多 ${max} 个，这里给了 ${n} 个`, `too many arguments to function '${sig}'`);
      return null;
    }
    call(e, sc, fn) {
      const f = e.f;
      if (f.k === 'Id') {
        const sym = this.lookup(f.name, sc);
        if (sym) { e.args.forEach(a => this.expr(a, sc, fn)); return this.error(e.line, `'${f.name}' 是变量，不是函数，不能加括号调用`, `'${f.name}' cannot be used as a function`); }
        const user = this.funcs.get(f.name);
        if (user) return this.userCall(e, f.name, user, sc, fn);
        if ((f.name === 'F' || f.name === 'PSTR') && e.args.length === 1 && e.args[0].k === 'Str') {
          // F("text") keeps the string in flash on a real UNO; here it is just the string
          const a = e.args[0];
          for (const k in e) delete e[k];
          Object.assign(e, a);
          return TY.cstr;
        }
        const bi = BUILTINS[f.name];
        if (bi) return this.builtinCall(e, f.name, bi, sc, fn);
        if (f.name === 'bitSet' || f.name === 'bitClear' || f.name === 'bitWrite') return this.bitMacro(e, f.name, sc, fn);
        e.args.forEach(a => this.expr(a, sc, fn));
        f.scope = sc;
        return this.undeclared(f, true);
      }
      if (f.k === 'Mem') {
        if (f.o.k === 'Id') f.o.asObj = true;
        const ot = this.expr(f.o, sc, fn);
        if (ot.k === 'err') { e.args.forEach(a => this.expr(a, sc, fn)); return ot; }
        if (ot.k === 'obj') {
          const d = METHODS[ot.cls] && METHODS[ot.cls][f.name];
          if (!d) { e.args.forEach(a => this.expr(a, sc, fn)); return this.noMember(f, ot); }
          return this.methodCall(e, ot.cls, f.name, d, sc, fn);
        }
        if (ot.k === 'String') {
          const d = STRING_METHODS[f.name];
          if (!d) { e.args.forEach(a => this.expr(a, sc, fn)); return this.noMember(f, ot); }
          return this.stringCall(e, f.name, d, sc, fn);
        }
        e.args.forEach(a => this.expr(a, sc, fn));
        return this.error(e.line, `'${exprName(f.o)}' 不是对象，不能调用 .${f.name}()`, `request for member '${f.name}' in '${exprName(f.o)}', which is of non-class type '${ot.name}'`);
      }
      if (f.k === 'Static') {
        if (!this.libs.has(f.cls)) { this.checkTypeAvailable({ lib: f.cls, line: f.line }); return TY.err; }
        const d = METHODS[f.cls] && METHODS[f.cls][f.name];
        if (!d || !d.stat) return this.error(e.line, `${f.cls}::${f.name} 不能这样调用`, `cannot call member function '${f.name}' without object`);
        return this.methodCall(e, f.cls, f.name, d, sc, fn);
      }
      e.args.forEach(a => this.expr(a, sc, fn));
      this.expr(f, sc, fn);
      return this.error(e.line, '这个东西不能当函数调用', 'expression cannot be used as a function');
    }
    userCall(e, name, list, sc, fn) {
      const n = e.args.length;
      const ts = e.args.map(a => this.expr(a, sc, fn));
      let d = list.find(o => n <= o.params.length && n >= (o.params.findIndex(p => p.def) >= 0 ? o.params.findIndex(p => p.def) : o.params.length));
      if (!d) {
        const o = list[0];
        const sig = fnSig(name, o.params.map(p => p.ty), o.ret);
        const min = o.params.findIndex(p => p.def) >= 0 ? o.params.findIndex(p => p.def) : o.params.length;
        if (n < min) return this.error(e.line, `调用 ${name}() 参数太少：需要 ${min} 个，这里只给了 ${n} 个`, `too few arguments to function '${sig}'`);
        return this.error(e.line, `调用 ${name}() 参数太多：只要 ${o.params.length} 个，这里给了 ${n} 个`, `too many arguments to function '${sig}'`);
      }
      if (ts.some(t => t.k === 'err')) return d.ret;
      d.params.forEach((p, i) => {
        if (i < n) this.assignable(p.ty, ts[i], e.args[i].line, e.args[i]);
        else if (p.def && !p.def.ty) { this.expr(p.def, null, null); this.assignable(p.ty, p.def.ty, p.line, p.def); }
      });
      e.call = { k: 'user', d };
      d.called = true; if (!d.calledLine) d.calledLine = e.line;
      if (fn) fn.decl.callees.add(d); else this.globalInitCalls = true;
      return d.ret;
    }
    builtinCall(e, name, d, sc, fn) {
      const ts = e.args.map(a => this.expr(a, sc, fn));
      if (this.argCheck(e, name, d, sc, fn)) return TY.err;
      if (ts.some(t => t.k === 'err')) return d.ret || TY.err;
      for (let i = 0; i < ts.length; i++) {
        if (!ts[i].num) return this.error(e.args[i].line, `${name}() 的第 ${i + 1} 个参数要是数字，这里是 ${ts[i].name}`, `cannot convert '${ts[i].name}' to '${d.p[i] && d.p[i].name ? d.p[i].name : 'int'}' for argument '${i + 1}' to '${fnSig(name, d.p.filter(p => p.k !== 'any'), d.ret)}'`);
      }
      e.call = { k: 'bi', name, d };
      if (d.y && fn) fn.decl.selfY = true;
      if (d.g) {
        let rt;
        switch (d.g) {
          case 'arith2': rt = arith(ts[0], ts[1]); e.argT = [rt, rt]; break;
          case 'arith3': rt = arith(arith(ts[0], ts[1]), ts[2]); e.argT = [rt, rt, rt]; break;
          case 'prom': rt = ts[0].float ? TY.float : prom(ts[0]); e.argT = [rt]; break;
          case 'arith1': rt = arith(ts[0], ts[0]); e.argT = [rt]; break;
          case 'round': rt = TY.long; e.argT = [ts[0].float ? TY.float : prom(ts[0])]; break;
          case 'bitRead': if (!ts[0].int || !ts[1].int) return this.error(e.line, 'bitRead() 只能用在整数上', 'invalid operands to binary >>'); rt = prom(ts[0]); e.argT = [rt, TY.int]; break;
          default: rt = TY.err;
        }
        e.call.ret = rt;
        return rt;
      }
      e.argT = d.p.slice(0, ts.length);
      e.call.ret = d.ret;
      return d.ret;
    }
    bitMacro(e, name, sc, fn) {
      const need = name === 'bitWrite' ? 3 : 2;
      if (e.args.length !== need) {
        e.args.forEach(a => this.expr(a, sc, fn));
        return this.error(e.line, `${name}() 需要 ${need} 个参数`, `macro "${name}" requires ${need} arguments, but only ${e.args.length} given`);
      }
      const [x, n, v] = e.args;
      const one = { k: 'Num', v: 1, ty: TY.ulong, line: e.line };
      const mask = { k: 'Bin', op: '<<', l: one, r: n, line: e.line };
      const set = { k: 'Asg', op: '|=', l: x, r: mask, line: e.line };
      const clr = { k: 'Asg', op: '&=', l: x, r: { k: 'Un', op: '~', e: mask, line: e.line }, line: e.line };
      let rep;
      if (name === 'bitSet') rep = set;
      else if (name === 'bitClear') rep = clr;
      else rep = { k: 'Cond', c: v, a: set, b: { k: 'Asg', op: '&=', l: x, r: { k: 'Un', op: '~', e: { k: 'Bin', op: '<<', l: one, r: n, line: e.line }, line: e.line }, line: e.line }, line: e.line };
      for (const k in e) delete e[k];
      Object.assign(e, rep);
      return this.expr0(e, sc, fn);
    }
    methodCall(e, cls, name, d, sc, fn) {
      const ts = e.args.map(a => this.expr(a, sc, fn));
      const label = `${exprName(e.f.o || { k: 'Id', name: cls })}.${name}`;
      if (d.special) {
        const n = e.args.length;
        if (n < d.min) return this.error(e.line, `调用 ${label}() 参数太少`, `no matching function for call to '${cls}::${name}()'`);
        if (n > d.max) return this.error(e.line, `调用 ${label}() 参数太多`, `no matching function for call to '${cls}::${name}(${ts.map(t => t.name).join(', ')})'`);
        if (ts.some(t => t.k === 'err')) return TY.err;
        if (d.special === 'print') {
          if (n >= 1) {
            const t = ts[0];
            if (!(t.num || t.k === 'String' || t.k === 'cstr' || t.k === 'arr')) return this.error(e.line, `${label}() 不能打印 ${t.name}`, `no matching function for call to '${cls}::${name}(${t.name}&)'`);
            if (t.k === 'arr' && !isStrish(t)) return this.error(e.line, `${label}() 不能直接打印整个数组，要写下标，例如 a[0]`, `no matching function for call to '${cls}::${name}(${t.el.name} [${t.n}])'`);
            if (t.k === 'void') return this.error(e.line, '这个函数没有返回值（void），不能打印', 'void value not ignored as it ought to be');
          }
          if (n === 2 && !ts[1].int) return this.error(e.line, `${label}() 的第 2 个参数要是 DEC / HEX / BIN 或小数位数`, `no matching function for call to '${cls}::${name}(${ts.map(t => t.name).join(', ')})'`);
        } else if (d.special === 'write' || d.special === 'wirewrite') {
          const t = ts[0];
          if (!(t.num || t.k === 'String' || t.k === 'cstr' || isStrish(t))) return this.error(e.line, `${label}() 的参数要是数字或字符串`, `no matching function for call to '${cls}::write(${t.name})'`);
        } else if (d.special === 'setPixelColor') {
          if (n !== 2 && n !== 4 && n !== 5) return this.error(e.line, `${label}() 的写法：setPixelColor(编号, 颜色) 或 setPixelColor(编号, r, g, b)`, `no matching function for call to 'Adafruit_NeoPixel::setPixelColor(${ts.map(t => t.name).join(', ')})'`);
          for (let i = 0; i < n; i++) if (!ts[i].num) return this.error(e.args[i].line, `${label}() 的参数要是数字`, `invalid conversion from '${ts[i].name}' to 'uint32_t'`);
          e.argT = n === 2 ? [U16, U32] : [U16, U8, U8, U8, U8].slice(0, n);
        }
        e.call = { k: 'm', cls, name, d, ret: d.special === 'setPixelColor' ? VOID : U16 };
        return e.call.ret;
      }
      if (this.argCheck(e, label, d, sc, fn, `${(d.ret || VOID).name} ${cls}::${name}(${d.p.map(p => (p && p.name) || p).join(', ')})`)) return TY.err;
      if (ts.some(t => t.k === 'err')) return d.ret;
      for (let i = 0; i < ts.length; i++) {
        const p = d.p[i];
        if (p === 'arr') { if (ts[i].k !== 'arr') return this.error(e.args[i].line, `${label}() 的第 ${i + 1} 个参数要是数组`, `invalid conversion from '${ts[i].name}' to 'uint8_t*'`); continue; }
        if (p && p.k === 'cstr') { if (!(ts[i].k === 'cstr' || isStrish(ts[i]))) return this.error(e.args[i].line, `${label}() 的参数要是字符串`, `invalid conversion from '${ts[i].name}' to 'const char*'`); continue; }
        if (!ts[i].num) return this.error(e.args[i].line, `${label}() 的第 ${i + 1} 个参数要是数字，这里是 ${ts[i].name}`, `cannot convert '${ts[i].name}' to '${p.name}'`);
      }
      e.argT = d.p.slice(0, ts.length);
      e.call = { k: 'm', cls, name, d, ret: d.ret };
      if (d.y && fn) fn.decl.selfY = true;
      return d.ret;
    }
    stringCall(e, name, d, sc, fn) {
      const ts = e.args.map(a => this.expr(a, sc, fn));
      const label = `${exprName(e.f.o)}.${name}`;
      if (this.argCheck(e, label, d, sc, fn, `String::${name}`)) return TY.err;
      if (ts.some(t => t.k === 'err')) return d.ret;
      const argT = [];
      for (let i = 0; i < ts.length; i++) {
        const p = d.p[i], t = ts[i];
        if (p === 'str') { if (!(t.k === 'String' || isStrish(t))) return this.error(e.args[i].line, `${label}() 的参数要是字符串`, `no matching function for call to 'String::${name}(${t.name})'`); argT.push(t); }
        else if (p === 'strch') { if (!(t.k === 'String' || isStrish(t) || t.k === 'char')) return this.error(e.args[i].line, `${label}() 的参数要是字符或字符串`, `no matching function for call to 'String::${name}(${t.name})'`); argT.push(t); }
        else if (p === 'any') { if (!(t.num || t.k === 'String' || isStrish(t))) return this.error(e.args[i].line, `${label}() 的参数类型不对`, `no matching function for call to 'String::${name}(${t.name})'`); argT.push(t); }
        else { if (!t.num) return this.error(e.args[i].line, `${label}() 的第 ${i + 1} 个参数要是数字`, `invalid conversion from '${t.name}' to '${p.name}'`); argT.push(p); }
      }
      e.argT = argT; e.srcT = ts;
      e.call = { k: 's', name, d, ret: d.ret, lv: d.mut && this.isLvalue(e.f.o) };
      return d.ret;
    }
  }
  function exprName(e) {
    if (!e) return '?';
    if (e.k === 'Id') return e.name;
    if (e.k === 'Mem') return exprName(e.o) + '.' + e.name;
    if (e.k === 'Idx') return exprName(e.a) + '[…]';
    if (e.k === 'Call') return exprName(e.f) + '()';
    return '表达式';
  }
  function editDist(a, b) {
    if (Math.abs(a.length - b.length) > 2) return 9;
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
      {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    return d[m][n];
  }
  function evalBinConst(e, a, b) {
    const t = e.opT || e.ty;
    if (!t || !t.num) return null;
    const ca = convFn(t, e.l.ty), cb = convFn(t, e.r.ty);
    if (ca) a = ca(a);
    if (cb) b = cb(b);
    const f = binOpFn(e.op, t, e.l.ty);
    if (!f) return null;
    try { return f(a, b, null); } catch (x) { return null; }
  }

  // =================================================================== value conversion + operators
  function fits(from, to) {
    if (!from.int || !to.int) return false;
    switch (from.k) {
      case 'bool': return true;
      case 'char': case 'schar': return to.signed && to.rank >= 1;
      case 'uchar': return to.k !== 'char' && to.k !== 'schar' && to.k !== 'bool';
      case 'int': return to.k === 'long';
      case 'uint': return to.k === 'long' || to.k === 'ulong';
      default: return false;
    }
  }
  /** Conversion function for storing a `from` value in a `to` slot (null = identity). */
  function convFn(to, from) {
    if (!to || !from || to === from) return null;
    if (to.num) {
      if (!from.num) return null;
      if (to.k === 'float') return from.k === 'float' ? null : Math.fround;
      if (to.k === 'bool') return to.conv;
      if (from.int && fits(from, to)) return null;
      return to.conv;
    }
    if (to.k === 'String') {
      if (from.k === 'String' || from.k === 'cstr') return null;
      return v => toStr(v, from);
    }
    if (to.k === 'cstr') return from.k === 'arr' ? charArrayStr : null;
    return null;
  }
  const DIV0 = {};
  function binOpFn(op, t) {
    if (t.float) {
      switch (op) {
        case '+': return (a, b) => Math.fround(a + b);
        case '-': return (a, b) => Math.fround(a - b);
        case '*': return (a, b) => Math.fround(a * b);
        case '/': return (a, b) => Math.fround(a / b);
        default: return null;
      }
    }
    switch (t.k) {
      case 'int':
        switch (op) {
          case '+': return (a, b) => ((a + b) << 16) >> 16;
          case '-': return (a, b) => ((a - b) << 16) >> 16;
          case '*': return (a, b) => ((a * b) << 16) >> 16;
          case '/': return (a, b) => { if (b === 0) throw DIV0; return ((a / b | 0) << 16) >> 16; };
          case '%': return (a, b) => { if (b === 0) throw DIV0; return ((a % b) << 16) >> 16; };
          case '&': return (a, b) => a & b;
          case '|': return (a, b) => a | b;
          case '^': return (a, b) => a ^ b;
          case '<<': return (a, b) => ((a << b) << 16) >> 16;
          case '>>': return (a, b) => (b > 15 ? (a < 0 ? -1 : 0) : a >> b);
        }
        break;
      case 'uint':
        switch (op) {
          case '+': return (a, b) => (a + b) & 0xFFFF;
          case '-': return (a, b) => (a - b) & 0xFFFF;
          case '*': return (a, b) => (a * b) & 0xFFFF;
          case '/': return (a, b) => { if (b === 0) throw DIV0; return (a / b) >>> 0; };
          case '%': return (a, b) => { if (b === 0) throw DIV0; return a % b; };
          case '&': return (a, b) => a & b;
          case '|': return (a, b) => a | b;
          case '^': return (a, b) => a ^ b;
          case '<<': return (a, b) => (b > 15 ? 0 : (a << b) & 0xFFFF);
          case '>>': return (a, b) => (b > 15 ? 0 : a >>> b);
        }
        break;
      case 'long':
        switch (op) {
          case '+': return (a, b) => (a + b) | 0;
          case '-': return (a, b) => (a - b) | 0;
          case '*': return (a, b) => Math.imul(a, b);
          case '/': return (a, b) => { if (b === 0) throw DIV0; return (a / b) | 0; };
          case '%': return (a, b) => { if (b === 0) throw DIV0; return (a % b) | 0; };
          case '&': return (a, b) => a & b;
          case '|': return (a, b) => a | b;
          case '^': return (a, b) => a ^ b;
          case '<<': return (a, b) => (b > 31 ? 0 : a << b);
          case '>>': return (a, b) => (b > 31 ? (a < 0 ? -1 : 0) : a >> b);
        }
        break;
      case 'ulong':
        switch (op) {
          case '+': return (a, b) => (a + b) >>> 0;
          case '-': return (a, b) => (a - b) >>> 0;
          case '*': return (a, b) => Math.imul(a, b) >>> 0;
          case '/': return (a, b) => { if (b === 0) throw DIV0; return Math.floor(a / b) >>> 0; };
          case '%': return (a, b) => { if (b === 0) throw DIV0; return a % b; };
          case '&': return (a, b) => (a & b) >>> 0;
          case '|': return (a, b) => (a | b) >>> 0;
          case '^': return (a, b) => (a ^ b) >>> 0;
          case '<<': return (a, b) => (b > 31 ? 0 : (a << b) >>> 0);
          case '>>': return (a, b) => (b > 31 ? 0 : a >>> b);
        }
        break;
    }
    return null;
  }
  function cmpFn(op) {
    switch (op) {
      case '==': return (a, b) => (a === b ? 1 : 0);
      case '!=': return (a, b) => (a !== b ? 1 : 0);
      case '<': return (a, b) => (a < b ? 1 : 0);
      case '>': return (a, b) => (a > b ? 1 : 0);
      case '<=': return (a, b) => (a <= b ? 1 : 0);
      case '>=': return (a, b) => (a >= b ? 1 : 0);
    }
    return null;
  }
  const strOf = (v, t) => (t.k === 'char' || t.k === 'schar' ? String.fromCharCode(v & 255) : t.k === 'arr' ? charArrayStr(v) : v);
  const asciiUpper = s => s.replace(/[a-z]/g, c => String.fromCharCode(c.charCodeAt(0) - 32));
  const asciiLower = s => s.replace(/[A-Z]/g, c => String.fromCharCode(c.charCodeAt(0) + 32));
  function strcmp(a, b) {
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i++) { const d = (a.charCodeAt(i) & 255) - (b.charCodeAt(i) & 255); if (d) return d; }
    return a.length === b.length ? 0 : a.length < b.length ? -(b.charCodeAt(n) & 255) : (a.charCodeAt(n) & 255);
  }
  function itoaBase(v, t, base) {
    if (base === 10 || base < 2 || base > 36) return String(v);
    let u;
    if (t.k === 'long' || t.k === 'ulong') u = v >>> 0;
    else if (t.k === 'char' || t.k === 'schar' || t.k === 'uchar') u = t.k === 'uchar' ? v & 255 : v & 0xFFFF;
    else u = v & 0xFFFF;
    return u.toString(base);
  }
  function colorHSV(hue, sat, val) {
    let r, g, b;
    hue = Math.floor((hue * 1530 + 32768) / 65536);
    if (hue < 510) { b = 0; if (hue < 255) { r = 255; g = hue; } else { r = 510 - hue; g = 255; } }
    else if (hue < 1020) { r = 0; if (hue < 765) { g = 255; b = hue - 510; } else { g = 1020 - hue; b = 255; } }
    else if (hue < 1530) { g = 0; if (hue < 1275) { r = hue - 1020; b = 255; } else { r = 255; b = 1530 - hue; } }
    else { r = 255; g = b = 0; }
    const v1 = 1 + val, s1 = 1 + sat, s2 = 255 - sat;
    return (((((((r * s1) >> 8) + s2) * v1) & 0xff00) << 8) | (((((g * s1) >> 8) + s2) * v1) & 0xff00) | (((((b * s1) >> 8) + s2) * v1) >> 8)) >>> 0;
  }
  const gamma8 = x => Math.round(Math.pow((x & 255) / 255, 2.6) * 255);

  // avr-libc random(): Park–Miller "minimal standard", same sequence as a real UNO
  function avrRandom(R) {
    let x = R.seed;
    if (x === 0) x = 123459876;
    const hi = Math.trunc(x / 127773), lo = x % 127773;
    x = 16807 * lo - 2836 * hi;
    if (x < 0) x += 0x7fffffff;
    R.seed = x;
    return x % 0x80000000;
  }

  // =================================================================== runtime implementations of the library
  const P = f => ({ f, y: false });
  const Y = f => ({ f, y: true });

  function builtinImpl(name, R, e) {
    const B = R.B;
    switch (name) {
      case 'pinMode': return (pin, mode) => B.pinMode(pin, mode === 0 ? 'INPUT' : mode === 2 ? 'INPUT_PULLUP' : 'OUTPUT');
      case 'digitalWrite': return (pin, v) => B.digitalWrite(pin, v);
      case 'digitalRead': return pin => B.digitalRead(pin);
      case 'analogRead': return pin => B.analogRead(pin);
      case 'analogWrite': return (pin, v) => B.analogWrite(pin, v);
      case 'analogReference': return () => undefined;
      case 'millis': return () => Math.floor((B._t - R.t0) / 1000) >>> 0;
      case 'micros': return () => (Math.floor((B._t - R.t0) / 4) * 4) >>> 0;
      case 'map': return (x, a, b, c, d) => {
        const den = (b - a) | 0;
        if (den === 0) { R.div0(e.line); return -1; }
        return ((Math.imul((x - a) | 0, (d - c) | 0) / den | 0) + c) | 0;
      };
      case 'random': return (a, b) => {
        if (b === undefined) { if (a === 0) return 0; return (avrRandom(R) % a) | 0; }
        if (a >= b) return a;
        const diff = (b - a) | 0;
        return ((diff === 0 ? 0 : avrRandom(R) % diff) + a) | 0;
      };
      case 'randomSeed': return s => { if (s !== 0) R.seed = s >>> 0; };
      case 'tone': return (pin, f, ms) => B.toneStart(pin, f, ms || 0);
      case 'noTone': return pin => B.toneStop(pin);
      case 'radians': return x => Math.fround(x * Math.PI / 180);
      case 'degrees': return x => Math.fround(x * 180 / Math.PI);
      case 'sqrt': case 'sin': case 'cos': case 'tan': case 'asin': case 'acos': case 'atan': case 'exp': case 'log': case 'log10': case 'floor': case 'ceil': {
        const m = Math[name];
        return x => Math.fround(m(x));
      }
      case 'fabs': return x => Math.fround(Math.abs(x));
      case 'pow': return (a, b) => Math.fround(Math.pow(a, b));
      case 'atan2': return (a, b) => Math.fround(Math.atan2(a, b));
      case 'hypot': return (a, b) => Math.fround(Math.hypot(a, b));
      case 'fmod': return (a, b) => Math.fround(a % b);
      case 'bit': return n => (n > 31 ? 0 : (1 << n) >>> 0);
      case 'lowByte': return w => w & 255;
      case 'highByte': return w => (w >> 8) & 255;
      case 'isDigit': return c => (c >= 48 && c <= 57 ? 1 : 0);
      case 'isAlpha': return c => ((c | 32) >= 97 && (c | 32) <= 122 ? 1 : 0);
      case 'isAlphaNumeric': return c => ((c >= 48 && c <= 57) || ((c | 32) >= 97 && (c | 32) <= 122) ? 1 : 0);
      case 'isSpace': case 'isWhitespace': return c => (c === 32 || (c >= 9 && c <= 13) ? 1 : 0);
      case 'isUpperCase': return c => (c >= 65 && c <= 90 ? 1 : 0);
      case 'isLowerCase': return c => (c >= 97 && c <= 122 ? 1 : 0);
      case 'isPunct': return c => (c > 32 && c < 127 && !((c >= 48 && c <= 57) || ((c | 32) >= 97 && (c | 32) <= 122)) ? 1 : 0);
      case 'toupper': return c => (c >= 97 && c <= 122 ? c - 32 : c);
      case 'tolower': return c => (c >= 65 && c <= 90 ? c + 32 : c);
      case 'interrupts': case 'noInterrupts': case 'yield': return () => undefined;
      // type-generic macros (arguments already converted to the common type)
      case 'min': return (a, b) => (a < b ? a : b);
      case 'max': return (a, b) => (a > b ? a : b);
      case 'constrain': return (x, lo, hi) => (x < lo ? lo : x > hi ? hi : x);
      case 'abs': { const t = e.call.ret; return t.float ? (x => (x > 0 ? x : -x)) : (x => t.conv(x > 0 ? x : -x)); }
      case 'sq': { const m = binOpFn('*', e.call.ret); return x => m(x, x); }
      case 'round': return x => (x >= 0 ? Math.fround(x + 0.5) | 0 : Math.fround(x - 0.5) | 0);
      case 'bitRead': return (x, n) => (n > 31 ? 0 : (x >> n) & 1);
    }
    throw new Error('no impl for builtin ' + name);
  }
  function builtinGen(name, R) {
    const B = R.B;
    switch (name) {
      case 'delay': return function* (ms) { yield* R.sleep(ms * 1000); };
      case 'delayMicroseconds': return function* (us) { if (us > 0) yield* R.sleep(us); };
      case 'pulseIn': case 'pulseInLong': return function* (pin, level, timeout) {
        const r = B.pulseIn(pin, level, timeout === undefined ? 1000000 : timeout);
        yield* R.sleep(r.wait);
        return r.value >>> 0;
      };
    }
    throw new Error('no generator for builtin ' + name);
  }
  function newObject(cls, args, R) {
    switch (cls) {
      case 'Servo': return { cls, idx: R.servoCount++, pin: -1, attached: false, us: 1500, angle: 90, min: 544, max: 2400 };
      case 'LiquidCrystal_I2C': return { cls, addr: args[0] & 255, cols: args[1] & 255, rows: args[2] & 255 };
      case 'Adafruit_NeoPixel': {
        const n = args.length > 0 ? args[0] & 0xFFFF : 0;
        return { cls, n, pin: args.length > 1 ? args[1] : 6, type: args.length > 2 ? args[2] : 0x52, buf: Array.from({ length: n }, () => [0, 0, 0]), bright: 255, begun: false };
      }
      case 'dht11': return { cls, temperature: 0, humidity: 0 };
    }
    return { cls };
  }
  function methodImpl(cls, name, R) {
    const B = R.B;
    switch (cls) {
      case 'HardwareSerial':
        switch (name) {
          case 'begin': return (o, baud) => { B.serialBegin(baud); };
          case 'end': return () => B.serialEnd();
          case 'available': return () => B.serialAvailable();
          case 'read': return () => B.serialRead();
          case 'peek': return () => B.serialPeek();
          case 'flush': return () => { if (B._txFree > B._t) B._t = B._txFree; };
          case 'availableForWrite': return () => { if (B.serialBaud == null) return 0; const bt = 1e7 / B.serialBaud; return Math.max(0, 63 - Math.ceil(Math.max(0, B._txFree - B._t) / bt)); };
          case 'setTimeout': return (o, ms) => { R.timeout = ms; };
        }
        break;
      case 'TwoWire':
        switch (name) {
          case 'begin': return () => { R.wireBegun = true; };
          case 'beginTransmission': return (o, a) => { R.wireAddr = a & 127; if (!R.wireBegun) B.warn('用 Wire 之前要先调用 Wire.begin()'); };
          case 'endTransmission': return () => (B.i2cProbe(R.wireAddr) ? 0 : 2);
          case 'requestFrom': return (o, a, n) => (B.i2cProbe(a & 127) ? 0 : 0);
          case 'available': return () => 0;
          case 'read': return () => -1;
          case 'setClock': return () => undefined;
        }
        break;
      case 'Servo':
        switch (name) {
          case 'attach': return (o, pin, mn, mx) => {
            if (mn !== undefined) o.min = mn;
            if (mx !== undefined) o.max = mx;
            o.pin = pin; o.attached = true;
            B.servoAttach(pin, o.angle);
            return o.idx & 255;
          };
          case 'write': return (o, v) => {
            let us, angle;
            if (v < 544) { if (v < 0) v = 0; if (v > 180) v = 180; angle = v; us = ((Math.imul(v, o.max - o.min) / 180) | 0) + o.min; }
            else { us = Math.max(o.min, Math.min(o.max, v)); angle = (us - o.min) * 180 / (o.max - o.min); }
            o.us = us; o.angle = angle;
            if (o.pin >= 0) B.servoWrite(o.pin, angle, us);
          };
          case 'writeMicroseconds': return (o, v) => {
            const us = Math.max(o.min, Math.min(o.max, v));
            o.us = us; o.angle = (us - o.min) * 180 / (o.max - o.min);
            if (o.pin >= 0) B.servoWrite(o.pin, o.angle, us);
          };
          case 'read': return o => ((Math.imul(o.us + 1 - o.min, 180) / (o.max - o.min)) | 0);
          case 'readMicroseconds': return o => o.us;
          case 'attached': return o => (o.attached ? 1 : 0);
          case 'detach': return o => { if (o.attached) { o.attached = false; B.servoDetach(o.pin); } };
        }
        break;
      case 'LiquidCrystal_I2C':
        switch (name) {
          case 'init': return o => B.lcdInit(o.addr, o.cols, o.rows);
          case 'begin': return (o, c, r) => B.lcdInit(o.addr, c || o.cols, r || o.rows);
          case 'backlight': return o => B.lcdBacklight(o.addr, true);
          case 'noBacklight': return o => B.lcdBacklight(o.addr, false);
          case 'setBacklight': return (o, v) => B.lcdBacklight(o.addr, !!v);
          case 'clear': return o => B.lcdClear(o.addr);
          case 'home': return o => B.lcdHome(o.addr);
          case 'setCursor': return (o, c, r) => B.lcdSetCursor(o.addr, c, r);
          case 'cursor': return o => B.lcdDisplay(o.addr, 'cursorOn', true);
          case 'noCursor': return o => B.lcdDisplay(o.addr, 'cursorOn', false);
          case 'blink': return o => B.lcdDisplay(o.addr, 'blink', true);
          case 'noBlink': return o => B.lcdDisplay(o.addr, 'blink', false);
          case 'display': return o => B.lcdDisplay(o.addr, 'display', true);
          case 'noDisplay': return o => B.lcdDisplay(o.addr, 'display', false);
          case 'scrollDisplayLeft': return o => B.lcdScroll(o.addr, -1);
          case 'scrollDisplayRight': return o => B.lcdScroll(o.addr, 1);
          case 'leftToRight': case 'rightToLeft': case 'autoscroll': case 'noAutoscroll': return () => undefined;
          case 'createChar': return (o, slot, arr) => B.lcdCreateChar(o.addr, slot, arr.map(v => v & 31));
          case 'printstr': return (o, s) => { B.lcdWrite(o.addr, s); B._t += 1300 * s.length; };
        }
        break;
      case 'Adafruit_NeoPixel':
        switch (name) {
          case 'begin': return o => { o.begun = true; B.neoBegin(o.pin, o.n); };
          case 'show': return o => {
            if (o.begun) B.neoShow(o.pin, o.buf, o.bright); else B.warn('NeoPixel：show() 之前要先调用 begin()（不然数据发不出去，灯不会变）');
            B._t += o.n * 30 + 50;
          };
          case 'Color': return (o, r, g, b, w) => ((((w || 0) << 24) | (r << 16) | (g << 8) | b) >>> 0);
          case 'ColorHSV': return (o, h, s, v) => colorHSV(h, s === undefined ? 255 : s, v === undefined ? 255 : v);
          case 'gamma32': return (o, c) => ((gamma8(c >>> 24) << 24) | (gamma8(c >>> 16) << 16) | (gamma8(c >>> 8) << 8) | gamma8(c)) >>> 0;
          case 'gamma8': return (o, x) => gamma8(x);
          case 'setBrightness': return (o, b) => { o.bright = b; };
          case 'getBrightness': return o => o.bright;
          case 'clear': return o => { for (const c of o.buf) { c[0] = 0; c[1] = 0; c[2] = 0; } };
          case 'numPixels': return o => o.n;
          case 'getPixelColor': return (o, i) => { const c = o.buf[i]; return c ? ((c[0] << 16) | (c[1] << 8) | c[2]) >>> 0 : 0; };
          case 'fill': return (o, c, first, count) => {
            c = c || 0; first = first || 0;
            const end = !count ? o.n : Math.min(o.n, first + count);
            for (let i = first; i < end; i++) o.buf[i] = [(c >>> 16) & 255, (c >>> 8) & 255, c & 255];
          };
          case 'setPin': return (o, p) => { o.pin = p; };
          case 'canShow': return () => 1;
        }
        break;
    }
    throw new Error('no impl for ' + cls + '.' + name);
  }
  function methodGen(cls, name, R) {
    const B = R.B;
    if (cls === 'dht11' && name === 'read') {
      return function* (o, pin) {
        const r = B.dhtRead(pin);
        yield* R.sleep(r.code === 0 ? 23000 : 20000);
        if (r.code === 0) { o.temperature = r.temperature; o.humidity = r.humidity; }
        return r.code;
      };
    }
    if (cls === 'HardwareSerial') {
      // Stream helpers: wait (virtually) up to the timeout for each byte, like the real Stream class
      const timedPeek = function* () {
        const start = B._t;
        for (;;) {
          const c = B.serialPeek();
          if (c >= 0) return c;
          const dl = start + R.timeout * 1000;
          const na = B.serialNextArrival();
          if (na != null && na <= dl) { yield* R.sleep(Math.max(0, na - B._t)); continue; }
          yield* R.sleep(Math.max(0, dl - B._t));
          return -1;
        }
      };
      const timedRead = function* () { const c = yield* timedPeek(); if (c >= 0) B.serialRead(); return c; };
      switch (name) {
        case 'readString': return function* () { let s = ''; for (;;) { const c = yield* timedRead(); if (c < 0) return s; s += String.fromCharCode(c); } };
        case 'readStringUntil': return function* (o, term) { let s = ''; for (;;) { const c = yield* timedRead(); if (c < 0 || c === (term & 255)) return s; s += String.fromCharCode(c); } };
        case 'parseInt': case 'parseFloat': return function* () {
          let c;
          for (;;) {
            c = yield* timedPeek();
            if (c < 0) return 0;
            if (c === 45 || (c >= 48 && c <= 57) || (name === 'parseFloat' && c === 46)) break;
            B.serialRead();
          }
          let s = '';
          for (;;) {
            c = yield* timedPeek();
            if (c >= 48 && c <= 57) s += String.fromCharCode(c);
            else if (c === 45 && !s) s = '-';
            else if (name === 'parseFloat' && c === 46 && !s.includes('.')) s += '.';
            else break;
            B.serialRead();
          }
          return name === 'parseInt' ? atol(s) : atof(s);
        };
      }
    }
    throw new Error('no generator for ' + cls + '.' + name);
  }
  function stringImpl(name) {
    switch (name) {
      case 'length': return s => s.length;
      case 'toInt': return s => atol(s);
      case 'toFloat': case 'toDouble': return s => atof(s);
      case 'indexOf': return (s, x, from) => { from = from || 0; if (from >= s.length) return -1; return s.indexOf(x, from); };
      case 'lastIndexOf': return (s, x, from) => (from === undefined ? s.lastIndexOf(x) : from < 0 ? -1 : s.lastIndexOf(x, from));
      case 'charAt': return (s, i) => (i < s.length ? wrap8s(s.charCodeAt(i)) : 0);
      case 'substring': return (s, a, b) => {
        if (b === undefined) b = s.length;
        if (a > b) { const t = a; a = b; b = t; }
        if (a >= s.length) return '';
        return s.slice(a, Math.min(b, s.length));
      };
      case 'equals': return (s, x) => (s === x ? 1 : 0);
      case 'equalsIgnoreCase': return (s, x) => (asciiLower(s) === asciiLower(x) ? 1 : 0);
      case 'startsWith': return (s, x) => (s.startsWith(x) ? 1 : 0);
      case 'endsWith': return (s, x) => (s.endsWith(x) ? 1 : 0);
      case 'compareTo': return (s, x) => strcmp(s, x);
      case 'c_str': return s => s;
      case 'reserve': return () => 1;
      // mutating: return the new string
      case 'trim': return s => s.replace(/^[ \t\n\r\f\v]+/, '').replace(/[ \t\n\r\f\v]+$/, '');
      case 'toUpperCase': return s => asciiUpper(s);
      case 'toLowerCase': return s => asciiLower(s);
      case 'concat': return (s, x) => s + x;
      case 'replace': return (s, a, b) => (a.length ? s.split(a).join(b) : s);
      case 'remove': return (s, i, n) => { if (i >= s.length) return s; if (n === undefined) n = s.length - i; return s.slice(0, i) + s.slice(i + n); };
      case 'setCharAt': return (s, i, c) => (i < s.length ? s.slice(0, i) + String.fromCharCode(c & 255) + s.slice(i + 1) : s);
    }
    throw new Error('no impl for String.' + name);
  }

  // =================================================================== codegen (annotated AST → closures)
  const MAX_DEPTH = 120;
  function defaultValue(t) {
    if (t.num) return 0;
    if (t.k === 'String' || t.k === 'cstr') return '';
    return undefined;
  }
  function build(prog, R) {
    const B = R.B, G = R.G;
    const recs = prog.fnList.map(d => ({ d, f: null, y: d.y, nslots: d.nslots }));
    const SERIAL = { cls: 'HardwareSerial' }, WIRE = { cls: 'TwoWire' };

    const gen = c => (c.y ? c.f : function* (L) { return c.f(L); });
    function withConv(c, to, from) {
      const cv = convFn(to, from);
      if (!cv) return c;
      const f = c.f;
      if (!c.y) return P(L => cv(f(L)));
      return Y(function* (L) { return cv(yield* f(L)); });
    }
    function comb2(A, Bc, fn) {
      const a = A.f, b = Bc.f;
      if (!A.y && !Bc.y) return P(L => fn(a(L), b(L)));
      const ga = gen(A), gb = gen(Bc);
      return Y(function* (L) { const x = yield* ga(L); const y = yield* gb(L); return fn(x, y); });
    }
    function truthy(c, t) {
      if (t.num) return c;
      const f = c.f;
      if (!c.y) return P(L => { f(L); return 1; });
      return Y(function* (L) { yield* f(L); return 1; });
    }
    /** call impl(...args) after evaluating argument closures; cost µs added after the call */
    function callN(argCs, impl, cost, objC) {
      const all = objC ? [objC].concat(argCs) : argCs;
      const n = all.length;
      if (all.some(a => a.y)) {
        const gs = all.map(gen);
        return Y(function* (L) { const v = new Array(n); for (let i = 0; i < n; i++) v[i] = yield* gs[i](L); const r = impl.apply(null, v); B._t += cost; return r; });
      }
      const fs = all.map(a => a.f);
      switch (n) {
        case 0: return P(() => { const r = impl(); B._t += cost; return r; });
        case 1: { const a = fs[0]; return P(L => { const r = impl(a(L)); B._t += cost; return r; }); }
        case 2: { const a = fs[0], b = fs[1]; return P(L => { const r = impl(a(L), b(L)); B._t += cost; return r; }); }
        case 3: { const a = fs[0], b = fs[1], c = fs[2]; return P(L => { const r = impl(a(L), b(L), c(L)); B._t += cost; return r; }); }
        default: return P(L => { const v = new Array(n); for (let i = 0; i < n; i++) v[i] = fs[i](L); const r = impl.apply(null, v); B._t += cost; return r; });
      }
    }
    function callNY(argCs, impl, cost, objC) {
      const all = objC ? [objC].concat(argCs) : argCs;
      const n = all.length;
      const gs = all.map(gen);
      return Y(function* (L) {
        const v = new Array(n);
        for (let i = 0; i < n; i++) v[i] = yield* gs[i](L);
        B._t += cost;
        return yield* impl.apply(null, v);
      });
    }
    function oob(ln, name, n, i) {
      throw new SimError(ln, `第 ${ln} 行：数组越界：${name} 只有 ${n} 个元素（下标 0～${n - 1}），这里用了下标 ${i}（真实板子不会报错，但会读写到别的内存，结果不可预料）`);
    }

    // ---------------- lvalues
    function lval(e) {
      if (e.k === 'Id') return e.sym.global ? { k: 'g', s: e.sym.slot } : { k: 'l', s: e.sym.slot };
      if (e.k === 'Idx') return { k: 'a', A: ex(e.a), I: ex(e.i), name: exprName(e.a), ln: e.line };
      if (e.k === 'Mem') return { k: 'm', O: ex(e.o), name: e.field };
      throw new Error('not an lvalue');
    }
    /** Build "x = combine(old, rhs)" for any lvalue. combine(old, rhs) → new value (already converted). */
    function store(lv, Rc, combine, retOld) {
      const r = Rc ? Rc.f : null;
      const anyY = (Rc && Rc.y) || (lv.k === 'a' && (lv.A.y || lv.I.y)) || (lv.k === 'm' && lv.O.y);
      if (!anyY) {
        if (lv.k === 'g') {
          const s = lv.s;
          if (retOld) return P(L => { const o = G[s]; G[s] = combine(o, r ? r(L) : 0); return o; });
          return P(L => (G[s] = combine(G[s], r ? r(L) : 0)));
        }
        if (lv.k === 'l') {
          const s = lv.s;
          if (retOld) return P(L => { const o = L[s]; L[s] = combine(o, r ? r(L) : 0); return o; });
          return P(L => (L[s] = combine(L[s], r ? r(L) : 0)));
        }
        if (lv.k === 'a') {
          const A = lv.A.f, I = lv.I.f, name = lv.name, ln = lv.ln;
          return P(L => {
            const a = A(L), i = I(L);
            if (!(i >= 0 && i < a.length)) oob(ln, name, a.length, i);
            const o = a[i];
            a[i] = combine(o, r ? r(L) : 0);
            return retOld ? o : a[i];
          });
        }
        const O = lv.O.f, name = lv.name;
        return P(L => { const ob = O(L); const o = ob[name]; ob[name] = combine(o, r ? r(L) : 0); return retOld ? o : ob[name]; });
      }
      const gr = Rc ? gen(Rc) : null;
      if (lv.k === 'g' || lv.k === 'l') {
        const s = lv.s, glob = lv.k === 'g';
        return Y(function* (L) {
          const v = gr ? yield* gr(L) : 0;
          const C = glob ? G : L;
          const o = C[s]; C[s] = combine(o, v); return retOld ? o : C[s];
        });
      }
      if (lv.k === 'a') {
        const gA = gen(lv.A), gI = gen(lv.I), name = lv.name, ln = lv.ln;
        return Y(function* (L) {
          const a = yield* gA(L), i = yield* gI(L);
          if (!(i >= 0 && i < a.length)) oob(ln, name, a.length, i);
          const v = gr ? yield* gr(L) : 0;
          const o = a[i]; a[i] = combine(o, v); return retOld ? o : a[i];
        });
      }
      const gO = gen(lv.O), name = lv.name;
      return Y(function* (L) { const ob = yield* gO(L); const v = gr ? yield* gr(L) : 0; const o = ob[name]; ob[name] = combine(o, v); return retOld ? o : ob[name]; });
    }

    // ---------------- expressions
    function ex(e) {
      switch (e.k) {
        case 'Num': { const v = e.v; return P(() => v); }
        case 'Str': { const v = e.v; return P(() => v); }
        case 'Id': {
          if (e.cst) { const v = e.cst.v; return P(() => v); }
          if (e.obj === 'Serial') return P(() => SERIAL);
          if (e.obj === 'Wire') return P(() => WIRE);
          const s = e.sym;
          if (s.cnst && s.cv != null) { const v = s.cv; return P(() => v); }
          const k = s.slot;
          return s.global ? P(() => G[k]) : P(L => L[k]);
        }
        case 'Bin': return binary(e);
        case 'Log': {
          const A = truthy(ex(e.l), e.l.ty), Bc = truthy(ex(e.r), e.r.ty);
          const a = A.f, b = Bc.f;
          if (!A.y && !Bc.y) return e.op === '&&' ? P(L => (a(L) && b(L) ? 1 : 0)) : P(L => (a(L) || b(L) ? 1 : 0));
          const ga = gen(A), gb = gen(Bc);
          return e.op === '&&' ? Y(function* (L) { return (yield* ga(L)) && (yield* gb(L)) ? 1 : 0; })
            : Y(function* (L) { return (yield* ga(L)) || (yield* gb(L)) ? 1 : 0; });
        }
        case 'Asg': return assign(e);
        case 'Un': {
          const t = e.ty;
          if (e.op === '!') {
            const A = truthy(ex(e.e), e.e.ty);
            const a = A.f;
            return A.y ? Y(function* (L) { return (yield* a(L)) ? 0 : 1; }) : P(L => (a(L) ? 0 : 1));
          }
          const A = withConv(ex(e.e), t, e.e.ty);
          const a = A.f;
          let fn;
          if (e.op === '+') return A;
          if (e.op === '-') fn = t.float ? (x => -x) : (x => t.conv(-x));
          else fn = x => t.conv(~x);
          return A.y ? Y(function* (L) { return fn(yield* a(L)); }) : P(L => fn(a(L)));
        }
        case 'Upd': {
          const t = e.ty, lv = lval(e.e);
          const d = e.op === '++' ? 1 : -1;
          const fn = t.float ? (o => Math.fround(o + d)) : t.k === 'bool' ? (o => (e.op === '++' ? 1 : (o ? 0 : 1))) : (o => t.conv(o + d));
          return store(lv, null, fn, !e.pre);
        }
        case 'Cond': {
          const C = truthy(ex(e.c), e.c.ty);
          const A = withConv(ex(e.a), e.ty, e.a.ty), Bc = withConv(ex(e.b), e.ty, e.b.ty);
          const c = C.f, a = A.f, b = Bc.f;
          if (!C.y && !A.y && !Bc.y) return P(L => (c(L) ? a(L) : b(L)));
          const gc = gen(C), ga = gen(A), gb = gen(Bc);
          return Y(function* (L) { return (yield* gc(L)) ? yield* ga(L) : yield* gb(L); });
        }
        case 'Call': return call(e);
        case 'Mem': { const O = ex(e.o), name = e.field, o = O.f; return O.y ? Y(function* (L) { return (yield* o(L))[name]; }) : P(L => o(L)[name]); }
        case 'Idx': {
          const A = ex(e.a), I = ex(e.i);
          if (e.strIdx) {
            return comb2(A, I, (s, i) => (i >= 0 && i < s.length ? wrap8s(s.charCodeAt(i)) : 0));
          }
          const name = exprName(e.a), ln = e.line;
          return comb2(A, I, (a, i) => { if (!(i >= 0 && i < a.length)) oob(ln, name, a.length, i); return a[i]; });
        }
        case 'Cast': {
          if (e.ty.k === 'cstr') return withConv(ex(e.e), TY.cstr, e.e.ty);
          if (e.ty.k === 'void') return ex(e.e);
          return withConv(ex(e.e), e.ty, e.e.ty);
        }
        case 'Sizeof': { const v = e.cv; return P(() => v); }
        case 'Comma': {
          const cs = e.list.map(ex);
          if (!cs.some(c => c.y)) { const fs = cs.map(c => c.f); return P(L => { let v; for (let i = 0; i < fs.length; i++) v = fs[i](L); return v; }); }
          const gs = cs.map(gen);
          return Y(function* (L) { let v; for (const g of gs) v = yield* g(L); return v; });
        }
        case 'StrCtor': {
          if (!e.args.length) return P(() => '');
          const t = e.args[0].ty;
          const A = ex(e.args[0]);
          if (e.args.length === 1) { const a = A.f; return A.y ? Y(function* (L) { return toStr(yield* a(L), t); }) : P(L => toStr(a(L), t)); }
          const F = withConv(ex(e.args[1]), TY.int, e.args[1].ty);
          if (t.float) return comb2(A, F, (v, d) => printFloat(v, d));
          return comb2(A, F, (v, base) => itoaBase(v, t, base));
        }
        default: throw new Error('codegen: unknown expression ' + e.k);
      }
    }
    function binary(e) {
      const lt = e.l.ty, rt = e.r.ty;
      if (e.strcat) return comb2(ex(e.l), ex(e.r), (a, b) => toStr(a, lt) + toStr(b, rt));
      if (e.ptr) {
        const ln = e.line;
        const S = e.ptr === 'l' ? ex(e.l) : ex(e.r), N = e.ptr === 'l' ? ex(e.r) : ex(e.l);
        const st = e.ptr === 'l' ? lt : rt;
        const sgn = e.neg ? -1 : 1;
        return comb2(S, N, (s, n) => {
          s = strOf(s, st); n *= sgn;
          if (n < 0 || n > s.length) { B.warn(`第 ${ln} 行：“字符串 + 数字” 不是拼接，而是把字符串的起点往后挪了 ${n} 个字符，已经超出字符串，读到的是别的内存（想拼接请用 String(…)）`); return ''; }
          if (n > 0) B.warn(`第 ${ln} 行：“"字符串" + 数字” 不会把数字接在后面，而是从第 ${n} 个字符开始截取（想拼接请写成 String("…") + 数字）`);
          return s.slice(n);
        });
      }
      if (e.strcmp) {
        const f = cmpFn(e.op);
        return comb2(ex(e.l), ex(e.r), (a, b) => { a = strOf(a, lt); b = strOf(b, rt); return e.op === '==' || e.op === '!=' ? f(a, b) : f(strcmp(a, b), 0); });
      }
      const t = e.opT;
      const shift = e.op === '<<' || e.op === '>>';
      const A = withConv(ex(e.l), t, lt);
      const Bc = shift ? ex(e.r) : withConv(ex(e.r), t, rt);
      const cmp = cmpFn(e.op);
      if (cmp) {
        const a = A.f, b = Bc.f;
        if (!A.y && !Bc.y) {
          switch (e.op) {
            case '==': return P(L => (a(L) === b(L) ? 1 : 0));
            case '!=': return P(L => (a(L) !== b(L) ? 1 : 0));
            case '<': return P(L => (a(L) < b(L) ? 1 : 0));
            case '>': return P(L => (a(L) > b(L) ? 1 : 0));
            case '<=': return P(L => (a(L) <= b(L) ? 1 : 0));
            case '>=': return P(L => (a(L) >= b(L) ? 1 : 0));
          }
        }
        return comb2(A, Bc, cmp);
      }
      const fn = binOpFn(e.op, t);
      if (e.op === '/' || e.op === '%') {
        const ln = e.line;
        if (t.float) return comb2(A, Bc, e.op === '/' ? ((a, b) => Math.fround(a / b)) : ((a, b) => Math.fround(a % b)));
        const m1 = t.conv(-1);
        return comb2(A, Bc, (a, b) => { if (b === 0) { R.div0(ln); return e.op === '/' ? m1 : a; } return fn(a, b); });
      }
      const a = A.f, b = Bc.f;
      if (!A.y && !Bc.y && t.k === 'int') {
        switch (e.op) {
          case '+': return P(L => ((a(L) + b(L)) << 16) >> 16);
          case '-': return P(L => ((a(L) - b(L)) << 16) >> 16);
          case '*': return P(L => ((a(L) * b(L)) << 16) >> 16);
        }
      }
      return comb2(A, Bc, fn);
    }
    function assign(e) {
      const lt = e.l.ty, lv = lval(e.l);
      if (e.op === '=') {
        const cv = convFn(lt, e.r.ty);
        const Rc = ex(e.r);
        if (lt.k === 'arr') throw new Error('array assign');
        return store(lv, Rc, cv ? ((o, v) => cv(v)) : ((o, v) => v), false);
      }
      if (e.strcat) { const rt = e.r.ty; return store(lv, ex(e.r), (o, v) => o + toStr(v, rt), false); }
      const op = e.op.slice(0, -1);
      const t = e.opT;
      const shift = op === '<<' || op === '>>';
      const ca = convFn(t, lt) || (x => x), cb = shift ? (x => x) : (convFn(t, e.r.ty) || (x => x)), back = convFn(lt, t) || (x => x);
      let fn = binOpFn(op, t);
      if ((op === '/' || op === '%') && !t.float) {
        const raw = fn, ln = e.line, m1 = t.conv(-1);
        fn = (a, b) => { if (b === 0) { R.div0(ln); return op === '/' ? m1 : a; } return raw(a, b); };
      } else if (op === '%' && t.float) fn = (a, b) => Math.fround(a % b);
      return store(lv, ex(e.r), (o, v) => back(fn(ca(o), cb(v))), false);
    }

    // ---------------- calls
    function call(e) {
      const c = e.call;
      if (c.k === 'user') return userCall(e, c.d);
      if (c.k === 'bi') {
        const d = c.d;
        const argCs = e.args.map((a, i) => withConv(ex(a), e.argT[i], a.ty));
        if (d.y) return callNY(argCs, builtinGen(c.name, R), d.cost || 1);
        return callN(argCs, builtinImpl(c.name, R, e), d.cost || 1);
      }
      if (c.k === 'm') return methodCall(e, c);
      if (c.k === 's') return stringCall(e, c);
      throw new Error('codegen: unknown call');
    }
    function userCall(e, d) {
      const rec = recs[d.id];
      const argCs = d.params.map((p, i) => (i < e.args.length ? withConv(ex(e.args[i]), p.ty, e.args[i].ty) : withConv(ex(p.def), p.ty, p.def.ty)));
      const n = argCs.length, ns = Math.max(rec.nslots, n), ln = e.line, rd = defaultValue(d.ret);
      const overflow = () => { R.depth = 0; throw new SimError(ln, `第 ${ln} 行：函数调用嵌套太深（可能是函数自己无限地调用自己）：UNO 只有 2KB 内存，真实板子会因为栈溢出而“跑飞”`); };
      if (!rec.y && !argCs.some(a => a.y)) {
        const fs = argCs.map(a => a.f);
        if (n === 0) return P(() => { const nL = new Array(ns); if (++R.depth > MAX_DEPTH) overflow(); B._t += 1; const c = rec.f(nL); R.depth--; return c === 3 ? R.ret : rd; });
        if (n === 1) { const a0 = fs[0]; return P(L => { const nL = new Array(ns); nL[0] = a0(L); if (++R.depth > MAX_DEPTH) overflow(); B._t += 1; const c = rec.f(nL); R.depth--; return c === 3 ? R.ret : rd; }); }
        return P(L => {
          const nL = new Array(ns);
          for (let i = 0; i < n; i++) nL[i] = fs[i](L);
          if (++R.depth > MAX_DEPTH) overflow();
          B._t += 1;
          const c = rec.f(nL);
          R.depth--;
          return c === 3 ? R.ret : rd;
        });
      }
      const gs = argCs.map(gen);
      return Y(function* (L) {
        const nL = new Array(ns);
        for (let i = 0; i < n; i++) nL[i] = yield* gs[i](L);
        if (++R.depth > MAX_DEPTH) overflow();
        B._t += 1;
        const c = rec.y ? yield* rec.f(nL) : rec.f(nL);
        R.depth--;
        return c === 3 ? R.ret : rd;
      });
    }
    function methodCall(e, c) {
      const d = c.d, cls = c.cls, name = c.name;
      const O = e.f.k === 'Mem' ? ex(e.f.o) : P(() => null);
      if (d.special === 'print') return printCall(e, c, O, cls);
      if (d.special === 'write' || d.special === 'wirewrite') {
        const t = e.args[0].ty;
        const A = ex(e.args[0]);
        const toBytes = t.num ? (v => String.fromCharCode(v & 255)) : (v => strOf(v, t));
        if (d.special === 'wirewrite') return callN([A], (o, v) => { B._t += 90 * toBytes(v).length; return toBytes(v).length; }, 1, O);
        return callN([A], cls === 'HardwareSerial' ? ((o, v) => R.serialOut(toBytes(v))) : ((o, v) => R.lcdOut(o, toBytes(v))), 1, O);
      }
      if (d.special === 'setPixelColor') {
        const argCs = e.args.map((a, i) => withConv(ex(a), e.argT[i], a.ty));
        const impl = argCs.length === 2
          ? (o, i, col) => { if (i < o.n) o.buf[i] = [(col >>> 16) & 255, (col >>> 8) & 255, col & 255]; }
          : (o, i, r, g, b) => { if (i < o.n) o.buf[i] = [r, g, b]; };
        return callN(argCs, impl, d.cost || 1, O);
      }
      const argCs = e.args.map((a, i) => {
        const p = d.p[i];
        if (p === 'arr') return ex(a);
        if (p && p.k === 'cstr') return withConv(ex(a), TY.cstr, a.ty);
        return withConv(ex(a), e.argT[i], a.ty);
      });
      if (d.y) return callNY(argCs, methodGen(cls, name, R), d.cost || 1, O);
      return callN(argCs, methodImpl(cls, name, R), d.cost || 1, O);
    }
    function printCall(e, c, O, cls) {
      const n = e.args.length, ln = !!c.d.ln;
      const t = n ? e.args[0].ty : null;
      const A = n ? ex(e.args[0]) : null;
      const F = n > 1 ? withConv(ex(e.args[1]), TY.int, e.args[1].ty) : null;
      const sink = cls === 'HardwareSerial' ? ((o, s) => R.serialOut(s)) : ((o, s) => R.lcdOut(o, s));
      if (!n) return callN([], o => sink(o, '\r\n'), 1, O);
      if (!F) return callN([A], (o, v) => sink(o, printValue(v, t, null) + (ln ? '\r\n' : '')), 1, O);
      return callN([A, F], (o, v, f) => sink(o, printValue(v, t, f) + (ln ? '\r\n' : '')), 1, O);
    }
    function stringCall(e, c) {
      const d = c.d, name = c.name;
      const impl = stringImpl(name);
      const argCs = e.args.map((a, i) => {
        const p = d.p[i];
        if (p === 'str' || p === 'strch' || p === 'any') {
          const t = a.ty;
          const A = ex(a);
          const cvt = p === 'any' ? (v => toStr(v, t)) : (v => strOf(v, t));
          const f = A.f;
          return A.y ? Y(function* (L) { return cvt(yield* f(L)); }) : P(L => cvt(f(L)));
        }
        return withConv(ex(a), e.argT[i], a.ty);
      });
      if (d.mut) {
        const ret = name === 'concat' ? 1 : undefined;
        if (c.lv) {
          const lv = lval(e.f.o);
          // evaluate args first, then update the variable in place
          const n = argCs.length;
          if (!argCs.some(a => a.y) && (lv.k === 'g' || lv.k === 'l')) {
            const fs = argCs.map(a => a.f), s = lv.s, glob = lv.k === 'g';
            return P(L => {
              const v = new Array(n); for (let i = 0; i < n; i++) v[i] = fs[i](L);
              const C = glob ? G : L;
              C[s] = impl(C[s], v[0], v[1]);
              B._t += d.cost || 1;
              return ret;
            });
          }
          const gs = argCs.map(gen);
          const getS = lval(e.f.o);
          return Y(function* (L) {
            const v = new Array(n); for (let i = 0; i < n; i++) v[i] = yield* gs[i](L);
            const st = store(getS, null, o => impl(o, v[0], v[1]), false);
            if (st.y) yield* st.f(L); else st.f(L);
            B._t += d.cost || 1;
            return ret;
          });
        }
        const S = ex(e.f.o);
        return callN(argCs, (s, a, b) => { impl(s, a, b); return ret; }, d.cost || 1, S);
      }
      const S = ex(e.f.o);
      return callN(argCs, impl, d.cost || 1, S);
    }

    // ---------------- declarations
    function initValue(d, sym) {
      const t = sym.ty;
      if (t.k === 'arr') {
        const el = t.el, n = t.n, z = defaultValue(el);
        if (d.init && d.init.k === 'InitList') {
          const cs = d.init.items.map(it => withConv(ex(it), el, it.ty));
          if (!cs.some(c => c.y)) {
            const fs = cs.map(c => c.f);
            return P(L => { const a = new Array(n).fill(z); for (let i = 0; i < fs.length; i++) a[i] = fs[i](L); return a; });
          }
          const gs = cs.map(gen);
          return Y(function* (L) { const a = new Array(n).fill(z); for (let i = 0; i < gs.length; i++) a[i] = yield* gs[i](L); return a; });
        }
        if (d.init && d.init.k === 'Str') {
          const s = d.init.v;
          return P(() => { const a = new Array(n).fill(0); for (let i = 0; i < s.length; i++) a[i] = el.conv(s.charCodeAt(i)); return a; });
        }
        return P(() => new Array(n).fill(z));
      }
      if (t.k === 'obj') {
        const args = (d.ctorArgs || []).map(a => ex(a));
        const cls = t.cls;
        if (!args.some(a => a.y)) { const fs = args.map(a => a.f); return P(L => newObject(cls, fs.map(f => f(L)), R)); }
        const gs = args.map(gen);
        return Y(function* (L) { const v = []; for (const g of gs) v.push(yield* g(L)); return newObject(cls, v, R); });
      }
      if (d.init) return withConv(ex(d.init), t, d.init.ty);
      const z = defaultValue(t);
      return P(() => z);
    }
    function varDecl(s) {
      const parts = [];
      for (const d of s.decls) {
        const sym = d.sym;
        if (!sym) continue;
        if (sym.hidden) continue;                 // static local: initialised once at start
        const V = initValue(d, sym);
        parts.push({ V, slot: sym.slot, glob: !!sym.global });
      }
      return parts;
    }

    // ---------------- statements
    const BRK = 1, CONT = 2, RET = 3;
    function st(s) {
      const ln = s.line;
      switch (s.k) {
        case 'Empty': return P(() => 0);
        case 'Expr': {
          const E = ex(s.e), f = E.f;
          if (!E.y) return P(L => { R.line = ln; B._t++; R.ops++; f(L); return 0; });
          return Y(function* (L) { R.line = ln; B._t++; R.ops++; yield* f(L); return 0; });
        }
        case 'Var': {
          const parts = varDecl(s);
          if (!parts.length) return P(() => 0);
          if (!parts.some(p => p.V.y)) {
            if (parts.length === 1) {
              const p = parts[0], v = p.V.f, k = p.slot;
              if (p.glob) return P(L => { R.line = ln; B._t++; R.ops++; G[k] = v(L); return 0; });
              return P(L => { R.line = ln; B._t++; R.ops++; L[k] = v(L); return 0; });
            }
            return P(L => { R.line = ln; B._t++; R.ops++; for (const p of parts) (p.glob ? G : L)[p.slot] = p.V.f(L); return 0; });
          }
          return Y(function* (L) { R.line = ln; B._t++; R.ops++; for (const p of parts) { const v = p.V.y ? yield* p.V.f(L) : p.V.f(L); (p.glob ? G : L)[p.slot] = v; } return 0; });
        }
        case 'Block': {
          const ss = s.body.filter(b => b.k !== 'Empty').map(st);
          const n = ss.length;
          if (!ss.some(x => x.y)) {
            const fs = ss.map(x => x.f);
            if (n === 0) return P(() => 0);
            if (n === 1) return P(fs[0]);
            if (n === 2) { const a = fs[0], b = fs[1]; return P(L => a(L) || b(L)); }
            return P(L => { for (let i = 0; i < n; i++) { const r = fs[i](L); if (r) return r; } return 0; });
          }
          const fs = ss.map(x => x.f), ys = ss.map(x => x.y);
          return Y(function* (L) { for (let i = 0; i < n; i++) { const r = ys[i] ? yield* fs[i](L) : fs[i](L); if (r) return r; } return 0; });
        }
        case 'If': {
          const C = truthy(ex(s.c), s.c.ty), A = st(s.a), Bs = s.b ? st(s.b) : null;
          if (!C.y && !A.y && !(Bs && Bs.y)) {
            const c = C.f, a = A.f;
            if (!Bs) return P(L => { R.line = ln; B._t++; R.ops++; return c(L) ? a(L) : 0; });
            const b = Bs.f;
            return P(L => { R.line = ln; B._t++; R.ops++; return c(L) ? a(L) : b(L); });
          }
          const gc = gen(C), ga = gen(A), gb = Bs ? gen(Bs) : null;
          return Y(function* (L) { R.line = ln; B._t++; R.ops++; if (yield* gc(L)) return yield* ga(L); return gb ? yield* gb(L) : 0; });
        }
        case 'While': case 'Do': case 'For': return loop(s);
        case 'Switch': {
          const E = withConv(ex(s.e), prom(s.e.ty), s.e.ty);
          const ss = s.body.map(st);
          const map = new Map();
          let def = -1;
          for (const lb of s.labels) { if (lb.test) { if (!map.has(lb.v)) map.set(lb.v, lb.idx); } else def = lb.idx; }
          const n = ss.length, fs = ss.map(x => x.f), ys = ss.map(x => x.y);
          if (!E.y && !ys.some(Boolean)) {
            const ef = E.f;
            return P(L => {
              R.line = ln; B._t++; R.ops++;
              let i = map.get(ef(L)); if (i === undefined) i = def; if (i < 0) return 0;
              for (; i < n; i++) { const r = fs[i](L); if (r === BRK) return 0; if (r) return r; }
              return 0;
            });
          }
          const ge = gen(E);
          return Y(function* (L) {
            R.line = ln; B._t++; R.ops++;
            let i = map.get(yield* ge(L)); if (i === undefined) i = def; if (i < 0) return 0;
            for (; i < n; i++) { const r = ys[i] ? yield* fs[i](L) : fs[i](L); if (r === BRK) return 0; if (r) return r; }
            return 0;
          });
        }
        case 'Break': return P(() => { R.line = ln; B._t++; R.ops++; return BRK; });
        case 'Continue': return P(() => { R.line = ln; B._t++; R.ops++; return CONT; });
        case 'Return': {
          if (!s.e) return P(() => { R.line = ln; B._t++; R.ops++; R.ret = undefined; return RET; });
          const rt = s.fnRet;
          const E = rt && rt.k !== 'void' ? withConv(ex(s.e), rt, s.e.ty) : ex(s.e);
          const f = E.f;
          if (!E.y) return P(L => { R.line = ln; B._t++; R.ops++; R.ret = f(L); return RET; });
          return Y(function* (L) { R.line = ln; B._t++; R.ops++; R.ret = yield* f(L); return RET; });
        }
        default: throw new Error('codegen: unknown statement ' + s.k);
      }
    }
    function loop(s) {
      const ln = s.line;
      const Init = s.k === 'For' && s.init ? st(s.init) : null;
      const condNode = s.c;
      const C = condNode ? truthy(ex(condNode), condNode.ty) : null;
      const U = s.k === 'For' && s.u ? ex(s.u) : null;
      const Body = st(s.body);
      const isDo = s.k === 'Do';
      const simple = (!C || !C.y) && (!U || !U.y) && !Body.y && (!Init || !Init.y);
      if (simple) {
        const c = C ? C.f : null, u = U ? U.f : null, b = Body.f, init = Init ? Init.f : null;
        return Y(function* (L) {
          R.line = ln; B._t++; R.ops++;
          if (init) init(L);
          let first = true;
          for (;;) {
            if (c && !(isDo && first) && !c(L)) break;
            first = false;
            const r = b(L);
            if (r === BRK) break;
            if (r === RET) return RET;
            if (u) u(L);
            B._t++; R.ops++;
            if (B._t >= R.target || R.ops >= R.budget) yield;
          }
          return 0;
        });
      }
      const gc = C ? gen(C) : null, gu = U ? gen(U) : null, gb = gen(Body), gi = Init ? gen(Init) : null;
      return Y(function* (L) {
        R.line = ln; B._t++; R.ops++;
        if (gi) yield* gi(L);
        let first = true;
        for (;;) {
          if (gc && !(isDo && first) && !(yield* gc(L))) break;
          first = false;
          const r = yield* gb(L);
          if (r === BRK) break;
          if (r === RET) return RET;
          if (gu) yield* gu(L);
          B._t++; R.ops++;
          if (B._t >= R.target || R.ops >= R.budget) yield;
        }
        return 0;
      });
    }

    // ---------------- functions + globals
    for (const r of recs) {
      const def = r.d.def;
      if (!def) continue;
      markReturns(def.body, r.d.ret);
      const body = st(def.body);
      if (body.y && !r.y) throw new Error('internal: function ' + r.d.name + ' blocks but was analysed as non-blocking');
      r.f = body.y || !r.y ? body.f : (function (f) { return function* (L) { return f(L); }; })(body.f);
    }
    const inits = [];
    for (const it of prog.items) {
      if (it.k !== 'Var') continue;
      for (const d of it.decls) {
        if (!d.sym) continue;
        const V = initValue(d, d.sym);
        inits.push({ V, slot: d.sym.slot, line: d.line });
      }
    }
    // static locals (constant initialisers) are set up with the globals
    for (const sv of prog.statics) {
      const V = initValue(sv.d, sv.sym);
      inits.push({ V, slot: sv.sym.slot, line: sv.d.line });
    }
    return { recs, inits, setup: recs[prog.setup.id], loop: recs[prog.loop.id] };
  }
  function markReturns(node, ret) {
    if (!node || typeof node !== 'object') return;
    if (node.k === 'Return') node.fnRet = ret;
    if (node.k === 'Block') node.body.forEach(b => markReturns(b, ret));
    else if (node.k === 'If') { markReturns(node.a, ret); markReturns(node.b, ret); }
    else if (node.k === 'While' || node.k === 'Do' || node.k === 'For') markReturns(node.body, ret);
    else if (node.k === 'Switch') node.body.forEach(b => markReturns(b, ret));
  }

  // =================================================================== compile()
  function compile(source) {
    try {
      const pp = preprocess(source);
      const items = new Parser(pp.toks).parseProgram();
      const an = new Analyzer(pp, String(source));
      an.run(items);
      if (an.errors.length) return { ok: false, errors: an.errors };
      const program = {
        items, gvars: an.gvars, gslots: an.gslots, fnList: an.fnList, setup: an.setup, loop: an.loop,
        statics: an.statics, libs: Array.from(an.libs), includes: pp.includes, src: String(source)
      };
      return { ok: true, program, warnings: an.warnings };
    } catch (e) {
      if (e instanceof CompileError) return { ok: false, errors: [fmtErr(e.line, e.zh, e.en)] };
      return { ok: false, errors: [{ line: 0, msg: '模拟器内部错误（编译时）：' + (e && e.message ? e.message : e) }], internal: e };
    }
  }

  // =================================================================== value formatting for the variable panel
  function fmtChar(v) {
    const c = v & 255;
    const esc = { 0: '\\0', 9: '\\t', 10: '\\n', 13: '\\r', 39: "\\'", 92: '\\\\' }[c];
    const s = esc || (c >= 32 && c < 127 ? String.fromCharCode(c) : '\\x' + c.toString(16).padStart(2, '0'));
    return `'${s}'(${v})`;
  }
  function fmtElem(v, t) {
    if (v === undefined || v === null) return '?';
    if (t.k === 'char' || t.k === 'schar') return `'${(v & 255) >= 32 && (v & 255) < 127 ? String.fromCharCode(v & 255) : '\\x' + (v & 255).toString(16)}'`;
    if (t.k === 'bool') return v ? 'true' : 'false';
    if (t.float) return printFloat(v, 2);
    if (t.k === 'String' || t.k === 'cstr') return JSON.stringify(bytesToText(v));
    return String(v);
  }
  function fmtValue(v, t, B) {
    if (v === undefined || v === null) return '—';
    if (t.num) {
      if (t.k === 'char' || t.k === 'schar') return fmtChar(v);
      if (t.k === 'bool') return v ? 'true' : 'false';
      if (t.float) return printFloat(v, 2);
      return String(v);
    }
    if (t.k === 'String' || t.k === 'cstr') return JSON.stringify(bytesToText(String(v)));
    if (t.k === 'arr') {
      if ((t.el.k === 'char' || t.el.k === 'schar') && v.indexOf(0) >= 0) return JSON.stringify(bytesToText(charArrayStr(v)));
      return '{' + v.slice(0, 8).map(x => fmtElem(x, t.el)).join(',') + (v.length > 8 ? ',…' : '') + '}';
    }
    if (t.k === 'obj') {
      const lbl = n => (B && B.pinLabel ? B.pinLabel(n) : 'D' + n);
      switch (v.cls) {
        case 'Servo': return v.pin < 0 ? '还没有 attach' : `${lbl(v.pin)} · ${Math.round(v.angle)}°${v.attached ? '' : '（已 detach）'}`;
        case 'LiquidCrystal_I2C': return `地址 0x${v.addr.toString(16).toUpperCase()} · ${v.cols}×${v.rows}`;
        case 'Adafruit_NeoPixel': return `${v.n} 颗 · ${lbl(v.pin)} · 亮度 ${v.bright}`;
        case 'dht11': return `temperature=${v.temperature}, humidity=${v.humidity}`;
      }
    }
    return String(v);
  }

  // =================================================================== Runner
  class Runner {
    constructor(program, board, opts) {
      if (!program || !program.fnList) throw new Error('Runner: program must come from SIM.interp.compile(...).program');
      if (!board) throw new Error('Runner: board is required');
      opts = opts || {};
      this.program = program;
      this.board = board;
      this.onError = typeof opts.onError === 'function' ? opts.onError : null;
      this.onLine = typeof opts.onLine === 'function' ? opts.onLine : null;
      this.budget = opts.budget > 0 ? opts.budget : 40000;
      this.state = 'idle';
      this.loopCount = 0;
      this.fastLoop = false;
      this.error = null;
      if (typeof board._t !== 'number') board._t = 0;
      const R = this.R = {
        B: board, G: new Array(program.gslots), line: program.setup ? program.setup.line : 1, ops: 0, target: 0, budget: Infinity,
        depth: 0, ret: undefined, t0: 0, seed: 1, timeout: 1000, wireBegun: false, wireAddr: 0, servoCount: 0
      };
      R.sleep = function* (us) {
        const wake = board._t + us;
        while (wake > R.target) {
          if (board._t < R.target) board._t = R.target;
          yield;
        }
        if (wake > board._t) board._t = wake;
      };
      R.div0 = ln => board.warn(`第 ${ln} 行：整数除以 0：在 AVR 上结果不确定（模拟器按 -1 处理），程序继续运行`);
      R.serialOut = bytes => {
        const block = board.serialWrite(bytes) || 0;
        board._t += 4 + bytes.length + block;
        return bytes.length;
      };
      R.lcdOut = (o, bytes) => {
        board.lcdWrite(o.addr, bytes);
        board._t += 1300 * bytes.length;
        return bytes.length;
      };
      this.code = build(program, R);
      this.gen = null;
    }
    get curLine() { return this.R.line; }
    get ops() { return this.R.ops; }
    get vtime() { return this.board._t - this.R.t0; }
    start() {
      if (this.state === 'running') return;
      const B = this.board, R = this.R;
      if (typeof B.mcuReset === 'function') B.mcuReset();
      R.t0 = B._t; R.target = B._t; R.ops = 0; R.depth = 0; R.seed = 1; R.timeout = 1000; R.wireBegun = false; R.servoCount = 0;
      R.G.fill(undefined);
      R.line = this.program.setup.line;
      this.loopCount = 0; this.fastLoop = false; this.error = null;
      this.gen = this._main();
      this.state = 'running';
    }
    *_main() {
      const R = this.R, B = this.board, G = R.G, code = this.code;
      for (const it of code.inits) { R.line = it.line; G[it.slot] = it.V.y ? yield* it.V.f(null) : it.V.f(null); }
      const su = code.setup;
      R.line = su.d.line; R.depth = 1; B._t += 1;
      const L0 = new Array(su.nslots);
      if (su.y) yield* su.f(L0); else su.f(L0);
      R.depth = 0;
      const lp = code.loop, frame = new Array(lp.nslots), ln = lp.d.line;
      if (!lp.y) {
        const f = lp.f;
        for (;;) {
          R.line = ln; B._t += 1; R.ops++; R.depth = 1;
          f(frame);
          this.loopCount++;
          if (B._t >= R.target || R.ops >= R.budget) yield;
        }
      }
      const g = lp.f;
      for (;;) {
        R.line = ln; B._t += 1; R.ops++; R.depth = 1;
        yield* g(frame);
        this.loopCount++;
        if (B._t >= R.target || R.ops >= R.budget) yield;
      }
    }
    tick(wallMs, speed) {
      if (this.state !== 'running' || !this.gen) return;
      const R = this.R, B = this.board;
      wallMs = Number(wallMs); speed = Number(speed);
      if (!(wallMs >= 0)) wallMs = 16;
      if (!(speed > 0)) speed = 1;
      R.target += wallMs * speed * 1000;
      R.budget = R.ops + this.budget;
      const lc0 = this.loopCount;
      let hit = false;
      if (B._t < R.target) {
        try {
          const r = this.gen.next();
          if (r.done) { this.state = 'done'; this.gen = null; }
        } catch (e) { this._fail(e); }
        if (R.ops >= R.budget) { hit = true; if (B._t < R.target) B._t = R.target; }
      }
      this.fastLoop = hit || this.loopCount - lc0 >= 50;
      if (typeof B.sync === 'function') B.sync();
      if (this.onLine) { try { this.onLine(R.line); } catch (e) { /* ignore */ } }
    }
    _fail(e) {
      const R = this.R;
      let err;
      if (e instanceof SimError) err = { line: e.line, msg: e.simMsg };
      else if (e instanceof RangeError && /call stack/i.test(String(e.message))) err = { line: R.line, msg: `第 ${R.line} 行：函数调用嵌套太深（可能是函数自己无限地调用自己），程序停止` };
      else err = { line: R.line, msg: `第 ${R.line} 行：模拟器内部错误：${e && e.message ? e.message : e}`, internal: true };
      this.error = err;
      this.state = 'error';
      this.gen = null;
      if (this.onError) { try { this.onError(err); } catch (x) { /* ignore */ } }
    }
    stop() {
      if (this.state !== 'error' && this.state !== 'done') this.state = 'stopped';
      this.gen = null;
      if (typeof this.board.stopAll === 'function') this.board.stopAll();
    }
    globals() {
      const G = this.R.G;
      return this.program.gvars.filter(s => !s.hidden).map(s => ({ name: s.name, type: s.typeText, value: fmtValue(G[s.slot], s.ty, this.board) }));
    }
    /** Raw value of a global (tests / debugging). */
    global(name) {
      const s = this.program.gvars.find(v => v.name === name);
      return s ? this.R.G[s.slot] : undefined;
    }
  }

  SIM.interp = {
    compile, Runner,
    printFloat, printValue, formatValue: fmtValue,
    TYPES: TY,
    _internals: { preprocess, Parser, Analyzer, CompileError, SimError }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = SIM;
})(typeof window !== 'undefined' ? window : globalThis);
