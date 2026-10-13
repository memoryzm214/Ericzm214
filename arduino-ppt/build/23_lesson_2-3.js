// 2-3 显示模块：① WS2812b RGB LED 模块实验 ② 串行 LCD1602 模块动态显示屏实验
// Source: assets/l23/guide_text.md (+ guide_raw.txt, PDF p1-7). Run: node build/23_lesson_2-3.js
const V = require('../lib/vti');
const { P, G } = V;

const OUT = __dirname + '/../output/2-3_WS2812灯环_LCD1602.pptx';

// ------------------------------------------------------------------ programs (copied from guide_text.md)
// WS2812b ring program (guide p2), unchanged.
const WS_CODE = `#include <Adafruit_NeoPixel.h>    //引入头文件

#define LED_Pin        10  //定义信号输出引脚
#define  PIXEL_COUNT    12  //定义LED灯个数
int count= 12;
Adafruit_NeoPixel pixels(PIXEL_COUNT, LED_Pin, NEO_GRB + NEO_KHZ800);

void setup() {
//灯条初始化
  pixels.begin();
  pixels.show();
  pixels.setBrightness(30);
}

void loop() {
  for (int i = 0; i < count; i++)
  {
    pixels.setPixelColor(i, pixels.Color(127, 127, 127)); //白色
    pixels.show();
  }
}`;

// I2C scanner (guide p4) exactly as printed: the guide omits `#include <Wire.h>` (noted on the slides).
const SCAN_CODE = `void setup()
{
  Serial.begin (9600); // Leonardo: wait for serial port to connect
  while (!Serial) { }
  Serial.println ();
  Serial.println ("I2C scanner. Scanning ...");
  byte count = 0;
  Wire.begin();
  for (byte i = 8; i < 120; i++) {
    Wire.beginTransmission (i);
    if (Wire.endTransmission () == 0) {
      Serial.print ("Found address: ");
      Serial.print (i, DEC);
      Serial.print (" (0x");
      Serial.print (i, HEX);
      Serial.println (")");
      count++;
      delay (1); // maybe unneeded?
    } // end of good response
  } // end of for loop
  Serial.println ("Done.");
  Serial.print ("Found ");
  Serial.print (count, DEC);
  Serial.println (" device(s).");
} // end of setup
void loop()
{
}`;

// LCD program (guide p5). Indent unified to 2 spaces and alignment runs before the comments shortened (whitespace only).
const LCD_CODE = `#include <Wire.h>
#include "LiquidCrystal_I2C.h"

LiquidCrystal_I2C lcd(0x27,16,2);  // set the LCD address to 0x27 for a 16 chars and 2 line display

void setup()
{
  lcd.init();  // initialize the lcd
  // Print a message to the LCD.
  lcd.backlight();
  lcd.setCursor(0,0); // go to start of 2nd line
  lcd.print("Hello Word");
  lcd.setCursor(4,1); // go to start of 2nd line
  lcd.print("Science Robot");
}

void loop()
{
}`;

// ------------------------------------------------------------------ local helpers (lib/vti.js is shared; not edited)
const warns = [];
let curTitle = '';
function warn(msg) { warns.push(`[${curTitle}] ${msg}`); console.warn('LAYOUT:', `[${curTitle}]`, msg); }

// Estimated rendered height of wrapped text (+10% slack for CJK rendering).
function hOf(str, w, size, ls = 1.3) { return V.textH(str, w, size, ls) * 1.1; }

function plainOf(t) {
  if (typeof t === 'string') return t;
  return t.map((r) => r.text + (r.options && r.options.breakLine ? '\n' : '')).join('');
}

// Text box that warns when the estimated text height exceeds the box (strings and run arrays).
function txt(s, t, o) {
  if (o.h != null) {
    const need = hOf(plainOf(t), o.w, o.size || 14, 1.25);
    if (need > o.h + 0.03) warn(`text may overflow (${need.toFixed(2)} > ${o.h.toFixed(2)}): ${plainOf(t).slice(0, 30)}`);
  }
  V.text(s, t, o);
}

// pptxgenjs mutates run option objects in place, so every run gets its own fresh options object.
const R = (text, opt) => ({ text, options: { ...(opt || {}) } });
const B = (text, opt) => R(text, { bold: true, ...(opt || {}) });
const M = (text, opt) => R(text, { fontFace: V.MONO, ...(opt || {}) });

// ---- code colouring (adapted copy of the vti tokenizer: also colours hex literals such as 0x27)
const KW = new Set(['void', 'int', 'float', 'double', 'char', 'long', 'short', 'bool', 'boolean', 'byte', 'word', 'String', 'const', 'unsigned', 'signed', 'static', 'if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue', 'switch', 'case', 'default', 'true', 'false']);
const FN = new Set(['pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'delayMicroseconds', 'millis', 'micros', 'map', 'constrain', 'min', 'max', 'abs', 'pow', 'sqrt', 'sq', 'random', 'tone', 'noTone', 'pulseIn', 'setup', 'loop', 'Serial', 'begin', 'print', 'println', 'available', 'read', 'write']);
const CONSTS = /^(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|A[0-5]|LED_BUILTIN|DEC|HEX|BIN)$/;
const CODE_COL = { base: 'D9D9D9', kw: P.turq, fn: P.white, num: P.amber, str: P.amber, com: '8E8E8E', pre: P.turq, punct: 'BDBDBD' };
function tokenizeLine(line) {
  const out = [];
  let i = 0;
  const push = (t, k) => { if (!t) return; const last = out[out.length - 1]; if (last && last.k === k) last.t += t; else out.push({ t, k }); };
  while (i < line.length) {
    const rest = line.slice(i);
    let m;
    if (rest.startsWith('//')) { push(rest, 'com'); break; }
    if (rest[0] === '"' && (m = rest.match(/^"(?:[^"\\]|\\.)*"?/))) { push(m[0], 'str'); i += m[0].length; continue; }
    if (rest[0] === '\'' && (m = rest.match(/^'(?:[^'\\]|\\.)*'?/))) { push(m[0], 'str'); i += m[0].length; continue; }
    if ((m = rest.match(/^#\s*\w+/))) { push(m[0], 'pre'); i += m[0].length; continue; }
    if ((m = rest.match(/^0x[0-9A-Fa-f]+/)) || (m = rest.match(/^\d+(?:\.\d+)?/))) { push(m[0], 'num'); i += m[0].length; continue; }
    if ((m = rest.match(/^[A-Za-z_]\w*/))) {
      const w = m[0];
      push(w, KW.has(w) ? 'kw' : CONSTS.test(w) ? 'num' : FN.has(w) ? 'fn' : 'base'); i += w.length; continue;
    }
    if ((m = rest.match(/^\s+/))) { push(m[0], out.length ? out[out.length - 1].k : 'base'); i += m[0].length; continue; }
    push(rest[0], 'punct'); i += 1;
  }
  return out;
}
const hasCJK = (t) => /[⺀-鿿＀-｠　-〿]/.test(t);
function codeRuns(toks) {
  return toks.map((tk) => R(tk.t, { color: CODE_COL[tk.k], italic: tk.k === 'com' && !hasCJK(tk.t), bold: tk.k === 'kw' || tk.k === 'fn' }));
}

// Small charcoal code chip (no line numbers) for snippets that are not the lesson program itself.
// hl: 0-based indexes of lines to highlight. Returns its height.
function miniCode(s, code, o) {
  const size = o.size || 11;
  const lines = code.split('\n');
  const lh = size * 1.4 / 72;
  const padX = 0.16;
  const h = o.h || lines.length * lh + 0.2;
  V.card(s, { x: o.x, y: o.y, w: o.w, h, fill: P.ink, radius: 0.08 });
  const y0 = o.y + (h - lines.length * lh) / 2;
  const hl = new Set(o.hl || []);
  lines.forEach((ln, i) => {
    if (hl.has(i)) s.addShape('rect', { x: o.x + 0.05, y: y0 + i * lh, w: o.w - 0.1, h: lh, fill: { color: '3E5250' }, line: { color: '3E5250', width: 0 } });
    const runs = codeRuns(tokenizeLine(ln));
    s.addText(runs.length ? runs : [R(' ')], {
      x: o.x + padX, y: y0 + i * lh, w: o.w - 2 * padX, h: lh,
      fontFace: V.MONO, fontSize: size, color: CODE_COL.base, margin: 0, valign: 'middle', isTextBox: true, fit: 'none',
    });
    const need = V.monoW(ln, size);
    if (need > o.w - 2 * padX) warn(`miniCode too wide (${need.toFixed(2)} > ${(o.w - 2 * padX).toFixed(2)}): ${ln}`);
  });
  return h;
}

// ---- code block (adapted copy of vti.codeBlock)
// The shared codeBlock tokenizes the continuation row of a wrapped line on its own, so the tail of a long
// `// comment` gets coloured as code. This copy keeps the comment colour on continuation rows and colours
// hex literals (0x27). Sizing, wrapping and the returned lineY() are identical to vti.codeBlock.
function cwide(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x2E80 && c <= 0x9FFF) || (c >= 0xF900 && c <= 0xFAFF) || (c >= 0xFF00 && c <= 0xFF60) ||
    (c >= 0x3000 && c <= 0x303F) || (c >= 0xFE30 && c <= 0xFE4F) || c === 0x2014 || c === 0x2026 ||
    (c >= 0x2018 && c <= 0x201D) || (c >= 0x2460 && c <= 0x24FF) || (c >= 0x25A0 && c <= 0x25FF);
}
function ccols(str) { let n = 0; for (const ch of str) n += cwide(ch) ? 2 : 1; return n; }
function cfit(str, max) { let n = 0, i = 0; for (const ch of str) { n += cwide(ch) ? 2 : 1; if (n > max) break; i += ch.length; } return i; }
function cwrap(line, max) {
  if (ccols(line) <= max) return [{ t: line, off: 0 }];
  const rows = [];
  const indent = (line.match(/^\s*/)[0].length) + 2;
  let cur = line, off = 0, pad = 0;
  while (ccols(cur) > max) {
    const fit = cfit(cur, max);
    let cut = cur.lastIndexOf(' ', fit);
    if (cut <= indent + 4) cut = fit;
    rows.push({ t: cur.slice(0, cut), off });
    const rest = cur.slice(cut);
    const lead = (rest.match(/^\s+/) || [''])[0].length;
    off += (cut - pad) + lead;
    cur = ' '.repeat(indent) + rest.slice(lead);
    pad = indent;
  }
  rows.push({ t: cur, off });
  return rows;
}
function commentAt(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === '\'') { q = c; continue; }
    if (c === '/' && line[i + 1] === '/') return i;
  }
  return -1;
}
function codeBlock(slide, o) {
  const all = o.code.replace(/\t/g, '    ').replace(/\s+$/, '').split('\n');
  const from = o.from || 1, to = o.to || all.length;
  const hl = new Set(o.hl || []);
  const headH = o.file || o.right ? 0.34 : 0.12;
  const padX = 0.14, padB = 0.12;
  const innerH = o.h - headH - padB;
  let size = o.size || V.SIZE.code, rows, lh, charW, gutter;
  const digits = String(to).length;
  for (; ; size -= 0.5) {
    lh = size * 1.36 / 72;
    charW = size * 0.602 / 72;
    gutter = (digits + 1.6) * charW;
    // one column of slack: the renderer's mono font is exactly 0.602 em, so a full row can wrap inside its box
    const max = Math.floor((o.w - 2 * padX - gutter) / charW) - 1;
    rows = [];
    for (let n = from; n <= to; n++) {
      const src = all[n - 1] ?? '';
      const ca = commentAt(src);
      cwrap(src, max).forEach((r, j) => rows.push({ n, t: r.t, cont: j > 0, com: j > 0 && ca >= 0 && r.off >= ca }));
    }
    if (rows.length * lh <= innerH + 0.001) break;
    if (size <= 9.5) throw new Error(`codeBlock: lines ${from}-${to} (${rows.length} rows) do not fit in h=${o.h}; split the code across slides`);
  }
  V.card(slide, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.ink, radius: 0.1 });
  if (o.file) V.text(slide, o.file, { x: o.x + padX, y: o.y + 0.07, w: o.w * 0.6, h: 0.22, size: 10, color: P.faint, mono: true, valign: 'middle' });
  if (o.right) V.text(slide, o.right, { x: o.x + o.w * 0.4, y: o.y + 0.07, w: o.w * 0.6 - padX, h: 0.22, size: 10, color: P.faint, align: 'right', valign: 'middle' });
  const y0 = o.y + headH;
  const lineY = {};
  rows.forEach((r, i) => {
    const y = y0 + i * lh;
    if (!r.cont) lineY[r.n] = y + lh / 2;
    const isHl = hl.has(r.n);
    if (isHl) slide.addShape('rect', { x: o.x + 0.05, y, w: o.w - 0.1, h: lh, fill: { color: '3E5250' }, line: { color: '3E5250', width: 0 } });
    V.text(slide, r.cont ? '↳' : String(r.n), { x: o.x + padX - 0.04, y, w: gutter - charW, h: lh, size: size - 1, mono: true, color: isHl ? P.turq : '7A7A7A', bold: isHl, align: 'right', valign: 'middle' });
    const toks = r.com ? [{ t: r.t, k: 'com' }] : tokenizeLine(r.t);
    const runs = toks.length ? codeRuns(toks) : [R(' ')];
    slide.addText(runs, {
      x: o.x + padX + gutter, y, w: o.w - 2 * padX - gutter, h: lh,
      fontFace: V.MONO, fontSize: size, color: CODE_COL.base, margin: 0, valign: 'middle', isTextBox: true, fit: 'none',
    });
  });
  return { lineY: (n) => lineY[n], bottom: y0 + rows.length * lh, size, rows: rows.length };
}

// V.explain wrapper: simulates the same placement first, warns when a note drifts more than ~0.3 in
// below its code line or the notes run past maxY, then draws with V.explain (which still throws on overflow).
function explain(s, b, o) {
  const size = o.size || 12, gap = o.gap ?? 0.14, pillH = 0.24;
  let y = (o.y ?? G.top) + (o.title ? 0.4 : 0);
  for (const it of o.items) {
    const tag = it.tag || (Array.isArray(it.line) ? `第 ${it.line[0]}–${it.line[1]} 行` : `第 ${it.line} 行`);
    const tagW = V.textW(tag, 9.5) + 0.2;
    const want = b && it.line != null ? b.lineY(Array.isArray(it.line) ? it.line[0] : it.line) - pillH / 2 : y;
    if (want != null && !Number.isNaN(want)) {
      if (y - want > 0.2) warn(`explain drift ${(y - want).toFixed(2)} at ${tag}`);
      y = Math.max(y, want);
    }
    const tw = o.w - tagW - 0.1;
    // V.explain sizes each note with V.textH (no slack); warn when ~12% wider rendering would add a line
    const nLines = Math.max(1, Math.ceil(V.textW(it.text, size) / (tw * 0.97)));
    const nSafe = Math.max(1, Math.ceil(V.textW(it.text, size) * 1.12 / (tw * 0.97)));
    if (nSafe > nLines) warn(`explain note near wrap boundary (${tag}): ${it.text}`);
    y += Math.max(pillH, V.textH(it.text, tw, size, 1.25)) + gap;
  }
  const maxY = o.maxY ?? G.bottom;
  if (y - gap > maxY + 0.02) warn(`explain overflow (${(y - gap).toFixed(2)} > ${maxY})`);
  return V.explain(s, b, { ...o, maxY: DEV ? undefined : maxY });
}
const DEV = process.env.DEV === '1';

// Header-less two-column table (V.table always styles rows[0] as a header). Column 0 mono + bold.
function kvTable(s, rows, o) {
  const size = o.size || 12;
  const body = rows.map((r) => r.map((c, ci) => ({
    text: c,
    options: {
      fontFace: ci === 0 ? V.MONO : V.FONT, fontSize: ci === 0 ? (o.monoSize || size - 0.5) : size, bold: ci === 0,
      color: P.ink, fill: { color: P.white }, align: 'left', valign: 'middle', margin: [2, 6, 2, 6],
    },
  })));
  s.addTable(body, { x: o.x, y: o.y, w: o.w, colW: o.colW, rowH: o.rowH || 0.3, border: { type: 'solid', pt: 0.75, color: P.gray2 }, autoPage: false });
  rows.forEach((r) => {
    if (V.monoW(r[0], o.monoSize || size - 0.5) > o.colW[0] - 0.17) warn('kvTable key too wide: ' + r[0]);
    if (V.textW(r[1], size) > o.colW[1] - 0.17) warn('kvTable value wraps: ' + r[1]);
  });
  return o.y + rows.length * (o.rowH || 0.3);
}

// Straight segment without arrow head.
function seg(s, x1, y1, x2, y2, o = {}) {
  V.arrow(s, x1, y1, x2, y2, { noHead: true, color: o.color || P.ink, width: o.width || 1.5, dash: o.dash });
}

// Template tile grid tuned for content slides (big label top-left, title + sub anchored at the bottom).
function tileGrid(s, o) {
  const cols = o.cols || 2, rows = Math.ceil(o.items.length / cols);
  const tw = o.w / cols, th = o.h / rows;
  const pad = 0.22, iw = tw - 2 * pad, subSize = o.subSize || 12;
  const rowSubH = [];
  o.items.forEach((it, i) => { const r = Math.floor(i / cols); rowSubH[r] = Math.max(rowSubH[r] || 0, it.sub ? hOf(it.sub, iw, subSize, 1.25) : 0); });
  o.items.forEach((it, i) => {
    const cx = o.x + (i % cols) * tw, cy = o.y + Math.floor(i / cols) * th;
    const fill = it.fill || P.white, dark = fill === P.ink;
    s.addShape('rect', { x: cx, y: cy, w: tw, h: th, fill: { color: fill }, line: { color: P.gray2, width: 0.75 } });
    const titleSize = o.titleSize || 15, bigSize = it.bigSize || o.bigSize || 28;
    const subH = rowSubH[Math.floor(i / cols)];
    const subY = cy + th - pad - subH;
    const titleY = subY - 0.38;
    const bigH = bigSize / 72 * 1.3;
    if (it.big) V.text(s, it.big, { x: cx + pad, y: cy + pad - 0.04, w: iw, h: bigH, size: bigSize, bold: true, color: dark ? P.turq : P.ink, mono: it.bigMono });
    if (it.title) V.text(s, it.title, { x: cx + pad, y: titleY, w: iw, h: 0.34, size: titleSize, bold: true, color: dark ? P.white : P.ink, valign: 'middle', mono: it.titleMono });
    if (it.sub) V.text(s, it.sub, { x: cx + pad, y: subY, w: iw, h: subH, size: subSize, color: dark ? 'D0D0D0' : (fill === P.turq ? P.ink : P.muted) });
    if (it.big && cy + pad - 0.04 + bigH * 0.85 > (it.title ? titleY : subY)) warn(`tile crowded: ${it.title || it.big}`);
    if ((it.bigMono ? V.monoW(it.big || '', bigSize) : V.textW(it.big || '', bigSize)) > iw) warn(`tile big too wide: ${it.big}`);
  });
}

// Light-gray card with an icon circle and a title row. Returns the y where body content may start.
function iconCard(s, ic, title, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill, line: o.line, lineW: o.lineW });
  const d = o.d || 0.42;
  V.iconCircle(s, ic, { x: o.x + 0.2, y: o.y + 0.18, d, fill: o.iconFill });
  txt(s, title, { x: o.x + 0.2 + d + 0.14, y: o.y + 0.18, w: o.w - d - 0.54, h: d, size: o.titleSize || 15, bold: true, valign: 'middle', mono: o.mono, color: o.titleColor });
  return o.y + 0.18 + d + 0.14;
}

// Red-outlined "problem" card: red icon + red title, explanation below (full width).
function warnCard(s, ic, title, body, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.white, line: P.red, lineW: 1 });
  const d = 0.34, pad = 0.18;
  V.iconCircle(s, ic, { x: o.x + pad, y: o.y + pad, d, fill: P.red });
  txt(s, title, { x: o.x + pad + d + 0.12, y: o.y + pad, w: o.w - 2 * pad - d - 0.12, h: d, size: o.titleSize || 13.5, bold: true, color: P.red, valign: 'middle' });
  const by = o.y + pad + d + 0.1;
  txt(s, body, { x: o.x + pad, y: by, w: o.w - 2 * pad, h: o.y + o.h - pad + 0.04 - by, size: o.size || 12 });
}

// Red-outlined row: icon on the left (vertically centred), red title + body to the right.
function warnRow(s, ic, title, body, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.white, line: P.red, lineW: 1 });
  const d = 0.34, pad = 0.16;
  V.iconCircle(s, ic, { x: o.x + pad, y: o.y + (o.h - d) / 2, d, fill: P.red });
  const tx = o.x + pad + d + 0.14, tw = o.x + o.w - pad - tx;
  txt(s, title, { x: tx, y: o.y + 0.1, w: tw, h: 0.3, size: 13, bold: true, color: P.red, valign: 'middle' });
  txt(s, body, { x: tx, y: o.y + 0.42, w: tw, h: o.h - 0.5, size: 12 });
}

// Numbered list (number circles + text). Returns bottom y.
function numList(s, items, o) {
  const size = o.size || 13, d = o.d || 0.3, gap = o.gap ?? 0.16;
  let y = o.y;
  items.forEach((t, i) => {
    const tw = o.w - d - 0.14;
    const th = hOf(plainOf(t), tw, size, 1.25);
    const rowH = Math.max(d, th);
    V.numCircle(s, o.start ? o.start + i : i + 1, { x: o.x, y, d, size: 11, fill: o.fill, color: o.color });
    txt(s, t, { x: o.x + d + 0.14, y: y + (th < d ? (d - th) / 2 : -0.01), w: tw, h: th + 0.02, size, lineSpacingMultiple: 1.15 });
    y += rowH + gap;
  });
  return y - gap;
}

// Lead line + body paragraph. Returns bottom y.
function lead(s, title, body, o) {
  const size = o.size || 13;
  txt(s, title, { x: o.x, y: o.y, w: o.w, h: 0.32, size: o.leadSize || 15, bold: true, valign: 'middle' });
  const bh = hOf(plainOf(body), o.w, size, 1.25);
  txt(s, body, { x: o.x, y: o.y + 0.38, w: o.w, h: bh, size });
  return o.y + 0.38 + bh;
}

// Rounded box with centred label(s) (diagram boxes).
function fbox(s, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill || P.card, line: o.line, radius: o.radius ?? 0.08 });
  const dark = o.fill === P.ink;
  txt(s, o.text, { x: o.x + 0.06, y: o.y, w: o.w - 0.12, h: o.h, size: o.size || 12.5, bold: o.bold ?? true, align: 'center', valign: 'middle', color: dark ? P.white : P.ink, mono: o.mono, lineSpacingMultiple: 1.05 });
}

// Card with a title and a list of {ic, t} parts laid out in columns (component lists).
function partsCard(s, I, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill });
  txt(s, o.title || '组件清单（原指南）', { x: o.x + 0.18, y: o.y + 0.12, w: o.w - 0.36, h: 0.3, size: 13, bold: true, valign: 'middle' });
  const cols = o.cols || 2, rh = o.rowH || 0.34, d = 0.28;
  const colW = o.colW || Array(cols).fill((o.w - 0.36) / cols);
  const rowsN = Math.ceil(o.items.length / cols);
  o.items.forEach((it, i) => {
    const c = o.byCol ? Math.floor(i / rowsN) : i % cols, r = o.byCol ? i % rowsN : Math.floor(i / cols);
    const x = o.x + 0.18 + colW.slice(0, c).reduce((a, b) => a + b, 0), y = o.y + 0.52 + r * rh;
    V.iconCircle(s, I[it.ic], { x, y: y + (rh - d) / 2, d });
    txt(s, it.t, { x: x + d + 0.1, y, w: colW[c] - d - 0.14, h: rh, size: o.size || 12, valign: 'middle' });
    if (V.textW(it.t, o.size || 12) > colW[c] - d - 0.14) warn('parts item too wide: ' + it.t);
  });
  if (o.y + 0.52 + rowsN * rh > o.y + o.h - 0.06) warn('parts card overflow');
}

// Mono pill + description on one row.
function pinRow(s, pin, desc, x, y, w, o = {}) {
  const pw = o.pillW || 0.42, h = o.h || 0.34;
  V.pill(s, { x, y: y + (h - 0.28) / 2, w: pw, h: 0.28, text: pin, size: o.pillSize || 11, fill: o.fill || P.ink, color: o.color || P.white, mono: true });
  txt(s, desc, { x: x + pw + 0.12, y, w: w - pw - 0.12, h, size: o.size || 12, valign: 'middle' });
}

// 16 x 2 character grid (LCD1602). o.text: [row0, row1] (16 chars each, spaces allowed);
// o.lcd: dark LCD look; o.hl: [[col,row],...] highlighted cells; o.colNums / o.rowNums: index labels.
function charGrid(s, o) {
  const cw = o.cw, ch = o.ch, x0 = o.x, y0 = o.y;
  const hl = new Set((o.hl || []).map(([c, r]) => `${c},${r}`));
  if (o.lcd) V.card(s, { x: x0 - 0.1, y: y0 - 0.1, w: 16 * cw + 0.2, h: 2 * ch + 0.2, fill: P.ink, radius: 0.06 });
  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 16; c++) {
      const x = x0 + c * cw, y = y0 + r * ch;
      const on = hl.has(`${c},${r}`);
      const fill = o.lcd ? (on ? P.turqDeep : '3A3A3A') : (on ? P.turq : P.white);
      s.addShape('rect', { x: x + 0.012, y: y + 0.012, w: cw - 0.024, h: ch - 0.024, fill: { color: fill }, line: { color: o.lcd ? P.ink : P.gray2, width: 0.75 } });
      const chx = o.text && o.text[r] ? o.text[r][c] : '';
      if (chx && chx !== ' ') V.text(s, chx, { x, y, w: cw, h: ch, size: o.size || 13, bold: true, mono: true, color: o.lcd ? P.turq : P.ink, align: 'center', valign: 'middle' });
    }
  }
  if (o.colNums) for (let c = 0; c < 16; c++) V.text(s, String(c), { x: x0 + c * cw, y: y0 - 0.26, w: cw, h: 0.22, size: 10, mono: true, color: P.muted, align: 'center', valign: 'middle' });
  if (o.rowNums) for (let r = 0; r < 2; r++) V.text(s, String(r), { x: x0 - 0.34, y: y0 + r * ch, w: 0.26, h: ch, size: 10, mono: true, color: P.muted, align: 'right', valign: 'middle' });
}

// ------------------------------------------------------------------ build
(async () => {
  const deck = await V.Deck.create({ label: '2-3　显示模块', title: '2-3 显示模块：WS2812b RGB 灯环 · LCD1602 显示屏' });
  const I = await deck.loadIcons({
    bulb: 'FaLightbulb', warn: 'FaExclamation', check: 'FaCheck', times: 'FaTimes', chip: 'FaMicrochip', grid: 'FaTh',
    usb: 'TbDeviceUsb', cable: 'MdCable', puzzle: 'FaPuzzlePiece', book: 'FaBook', target: 'FaBullseye', search: 'FaSearch',
    wrench: 'FaWrench', link: 'FaLink', palette: 'FaPalette', sun: 'FaSun', envelope: 'FaEnvelope', plane: 'FaPaperPlane',
    download: 'FaDownload', robot: 'FaRobot', ring: 'FaCircleNotch', desktop: 'FaDesktop', font: 'FaFont', home: 'FaHome',
    door: 'FaDoorOpen', plug: 'FaPlug', adjust: 'FaAdjust', terminal: 'FaTerminal', hashtag: 'FaHashtag', note: 'FaStickyNote',
    exchange: 'FaExchangeAlt', comments: 'FaComments', stopwatch: 'FaStopwatch', pen: 'FaPen', eye: 'FaEye', bus: 'FaBus',
    tools: 'FaTools', layer: 'FaLayerGroup', key: 'FaKey', calc: 'FaCalculator',
  });

  const slide = (o) => {
    curTitle = o.title;
    if (/[。.]$/.test(o.title)) throw new Error('title ends with a period: ' + o.title);
    if (V.textW(o.title, 24) > 8.9) warn(`title long (${V.textW(o.title, 24).toFixed(2)})`);
    if (V.textW(o.desc, 12) > 8.95) warn(`desc long (${V.textW(o.desc, 12).toFixed(2)}): ${o.desc}`);
    if (!o.notes) throw new Error('notes missing: ' + o.title);
    return deck.slide(o);
  };

  // ================================================================ 1 cover
  curTitle = 'cover';
  deck.cover({
    kicker: '开源硬件与 AI 辅助编程　/　实验 2-3',
    title: '2-3　显示模块',
    subtitle: 'WS2812b RGB 灯环 · LCD1602 显示屏',
    notes: '这节课做两个“显示”实验：先让一圈 12 颗彩灯亮起来，再让液晶屏显示文字。开场可以问学生：商场的灯带、电梯里的楼层屏，是怎么被控制的？两个实验都要用到别人写好的“库”，这是今天最重要的新本领。',
  });

  // ================================================================ 2 overview
  deck.section('导入');
  let s = slide({
    title: '本节导览',
    desc: '两个实验，两种“显示”：用彩灯显示颜色，用液晶屏显示文字——都要借助“库”来完成',
    notes: '先给学生一张地图：实验一是 WS2812b 灯环，实验二是 LCD1602 显示屏，按原指南的顺序来做。两个模块内部都很复杂，但有人已经把控制它们的代码写成了“库”，我们装上库、创建一个“对象”，再用 对象.函数() 给它下命令就行。下方三条是今天两个实验共同的新本领，下课前回来对照一遍。',
  });
  {
    const cw = 4.4, ch = 2.4, y = G.top;
    const ex = [
      { x: G.L, ic: I.ring, k: '实验一', t: 'WS2812b RGB 灯环', d: '12 颗彩灯串成一圈，只用 1 根信号线，就能让每颗灯单独变色。', tags: ['#include', 'Adafruit_NeoPixel', 'pixels.show()', 'setBrightness()'] },
      { x: G.R - cw, ic: I.desktop, k: '实验二', t: '串行 LCD1602 显示屏', d: '先扫描 I2C 地址，再让 16 × 2 的液晶屏显示两行英文。', tags: ['Wire', 'I2C 地址 0x27', 'lcd.setCursor()', 'lcd.print()'] },
    ];
    for (const e of ex) {
      V.card(s, { x: e.x, y, w: cw, h: ch });
      V.iconCircle(s, e.ic, { x: e.x + 0.22, y: y + 0.22, d: 0.55 });
      txt(s, e.k, { x: e.x + 0.92, y: y + 0.2, w: 2.5, h: 0.24, size: 11, color: P.muted, valign: 'middle' });
      txt(s, e.t, { x: e.x + 0.92, y: y + 0.44, w: 3.3, h: 0.36, size: 18, bold: true, valign: 'middle' });
      txt(s, e.d, { x: e.x + 0.22, y: y + 0.93, w: cw - 0.44, h: 0.56, size: 13 });
      const b = V.tags(s, e.tags, { x: e.x + 0.22, y: y + 1.6, w: cw - 0.44, size: 10.5 });
      if (b > y + ch - 0.1) warn('overview tags overflow');
    }
    txt(s, '两个实验共同的新本领', { x: G.L, y: 4.02, w: 6, h: 0.28, size: 13, bold: true, valign: 'middle' });
    const gw = (G.cw - 0.6) / 3, gy = 4.37, gh = 0.63;
    const items = [
      { pill: '库', t: '#include 引入\n别人写好的代码' },
      { pill: '对象', t: '对象.函数() 下命令\n如 lcd.print()' },
      { ic: I.plug, t: '少占引脚：灯环 1 根\n信号线，屏幕 2 根' },
    ];
    items.forEach((it, i) => {
      const gx = G.L + i * (gw + 0.3);
      V.card(s, { x: gx, y: gy, w: gw, h: gh });
      let tx;
      if (it.pill) {
        const pw = 0.62;
        V.pill(s, { x: gx + 0.14, y: gy + (gh - 0.3) / 2, w: pw, h: 0.3, text: it.pill, size: 11, fill: P.ink, color: P.white });
        tx = gx + 0.14 + pw + 0.12;
      } else {
        V.iconCircle(s, it.ic, { x: gx + 0.14, y: gy + (gh - 0.36) / 2, d: 0.36 });
        tx = gx + 0.62;
      }
      txt(s, it.t, { x: tx, y: gy, w: gx + gw - 0.1 - tx, h: gh, size: 12.5, valign: 'middle' });
    });
  }

  // ================================================================ 3 divider: experiment 1
  deck.section('实验一　WS2812b 灯环');
  curTitle = 'divider 1';
  deck.divider({
    kicker: '实验 01',
    title: 'WS2812b RGB LED 模块实验',
    desc: '一圈 12 颗彩灯，只用 Arduino 的 1 个引脚就能全部点亮。这一课学会三样新本领：安装和引入“库”、用“对象”下命令、先写草稿再用 show() 发出去。',
    tiles: [
      { fill: P.turq, big: '01', title: '认识', sub: '灯珠里藏着芯片', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: '信号线 → 10 号脚', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: '库 · 对象 · show()', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '12 颗灯亮起白光', subSize: 12 },
    ],
    notes: '实验一分四步：认识灯环、接线、读代码、看结果。这次代码只有 20 来行，但几乎每一行都是新东西：#include、#define、对象、show()。我们会先上三节“新语法小课堂”，再逐行读代码。',
  });

  // ================================================================ 4 WS2812 intro
  s = slide({
    title: '认识 WS2812b RGB 灯环',
    desc: '12 颗 WS2812 灯珠串成一圈，每颗灯珠里都藏着一个小芯片，所以 1 个 IO 口就能控制整圈灯',
    notes: '把灯环传下去，让学生看正面 12 颗灯珠和背面的 4 根排针。和 2-1 课的 RGB 贴片模块对比：那个模块要 3 根信号线、3 个 PWM 引脚，只能控制 1 颗灯；WS2812 每颗灯珠里都有芯片，能自己“记住”颜色，所以 1 根线就能分别控制 12 颗。下面的组件清单照原指南准备即可。',
  });
  {
    const lw = 4.15;
    let y = lead(s, '它是什么', '模块由 12 颗 WS2812 RGB 灯珠串联成一圈。每颗灯珠里都集成了一个控制芯片，能“听懂”数据，所以只需要 Arduino 的 1 个 IO 口就能驱动整个模块。', { x: G.L, y: G.top, w: lw, size: 12.5 }) + 0.22;
    txt(s, '和 2-1 课的 RGB 灯比一比', { x: G.L, y, w: lw, h: 0.3, size: 14, bold: true, valign: 'middle' });
    y += 0.38;
    V.table(s, [
      ['', 'RGB 贴片模块', 'WS2812b 灯环'],
      ['信号线', '3 根：11、10、9', '1 根：10 号脚'],
      ['单独控制', '1 颗灯', '12 颗，还能再串'],
      ['调颜色', 'analogWrite()', '用库发颜色数据'],
    ], { x: G.L, y, w: lw, colW: [0.95, 1.6, 1.6], rowH: 0.34, size: 12, boldCols: [0] });
    if (y + 4 * 0.34 > G.bottom) warn('compare table overflow');
    const rx = 4.9, rw = G.R - rx;
    V.imageBox(s, { file: 'l23/ws_module_photo.jpg', x: rx, y: G.top, w: rw, h: 2.05 });
    const py = G.top + 2.05 + 0.3;
    partsCard(s, I, { x: rx, y: py, w: rw, h: G.bottom - py, colW: [2.72, rw - 0.36 - 2.72], byCol: true, rowH: 0.3, items: [
      { ic: 'chip', t: 'Arduino UNO R3 主板' }, { ic: 'ring', t: 'WS2812b RGB LED 模块 ×1' },
      { ic: 'usb', t: 'USB 数据线' }, { ic: 'cable', t: '若干跳线' },
    ] });
  }

  // ================================================================ 5 principle: daisy chain
  s = slide({
    title: '实验原理：一根信号线串起 12 颗灯',
    desc: '数据从第 1 颗灯流进去，每颗灯留下属于自己的那份颜色，再把剩下的从 D 脚传给下一颗',
    notes: '用“传纸条”讲级联：Arduino 一口气发出 12 份颜色数据，第 1 颗灯留下第 1 份，把其余的从 D 脚传给第 2 颗，依此类推。因为每颗灯都会把信号重新“整理”一遍再转发，所以串得再长也不失真，这就是原指南说的“整形电路”。原指南写的“16 万色”有误：红、绿、蓝各 256 级，组合起来是 256×256×256，约 1677 万色。',
  });
  {
    const y0 = G.top, bx = 1.75, by = y0 + 0.45, bh = 0.72;
    // Arduino
    fbox(s, { x: G.L, y: by, w: 1.05, h: bh, fill: P.ink, text: 'UNO\n10 号脚', size: 12.5 });
    txt(s, '进入这颗灯\n的数据 →', { x: G.L, y: y0 - 0.02, w: 1.2, h: 0.42, size: 10, color: P.muted, lineSpacingMultiple: 1.0 });
    const leds = [{ x: 2.0, n: '第 1 颗', keep: '1', pk: ['1', '2', '…', '12'] }, { x: 3.85, n: '第 2 颗', keep: '2', pk: ['2', '3', '…', '12'] }, { x: 6.2, n: '第 12 颗', keep: '12', pk: ['12'] }];
    const lw2 = 1.35;
    leds.forEach((l) => {
      V.card(s, { x: l.x, y: by, w: lw2, h: bh, fill: P.white, line: P.gray2, radius: 0.08 });
      V.text(s, 'R', { x: l.x + 0.06, y: by, w: 0.2, h: bh, size: 10, bold: true, mono: true, color: P.muted, valign: 'middle' });
      V.text(s, 'D', { x: l.x + lw2 - 0.26, y: by, w: 0.2, h: bh, size: 10, bold: true, mono: true, color: P.muted, align: 'right', valign: 'middle' });
      txt(s, l.n, { x: l.x + 0.2, y: by + 0.08, w: lw2 - 0.4, h: 0.3, size: 13, bold: true, align: 'center', valign: 'middle' });
      txt(s, `留下第 ${l.keep} 份`, { x: l.x + 0.2, y: by + 0.38, w: lw2 - 0.4, h: 0.26, size: 10.5, color: P.muted, align: 'center', valign: 'middle' });
      // packets
      const pw = 0.27, pg = 0.04;
      const widths = l.pk.map((p) => (p === '…' ? 0.16 : pw));
      const tot = widths.reduce((a, b) => a + b, 0) + pg * (l.pk.length - 1);
      let px = l.x + (lw2 - tot) / 2;
      l.pk.forEach((p, j) => {
        if (p === '…') V.text(s, '…', { x: px, y: y0, w: 0.16, h: 0.26, size: 10, color: P.muted, align: 'center', valign: 'middle' });
        else {
          V.card(s, { x: px, y: y0 + 0.01, w: pw, h: 0.25, fill: j === 0 ? P.turq : P.gray1, radius: 0.04 });
          V.text(s, p, { x: px, y: y0 + 0.01, w: pw, h: 0.25, size: 10, bold: true, mono: true, align: 'center', valign: 'middle' });
        }
        px += widths[j] + pg;
      });
    });
    const ay = by + bh / 2;
    V.arrow(s, G.L + 1.05 + 0.05, ay, 2.0 - 0.05, ay, { color: P.ink, width: 1.5 });
    V.arrow(s, 2.0 + lw2 + 0.05, ay, 3.85 - 0.05, ay, { color: P.ink, width: 1.5 });
    V.arrow(s, 3.85 + lw2 + 0.05, ay, 5.43, ay, { color: P.ink, width: 1.5 });
    V.text(s, '⋯', { x: 5.45, y: by, w: 0.32, h: bh, size: 16, bold: true, color: P.muted, align: 'center', valign: 'middle' });
    V.arrow(s, 5.79, ay, 6.2 - 0.05, ay, { color: P.ink, width: 1.5 });
    V.arrow(s, 6.2 + lw2 + 0.05, ay, 8.05, ay, { color: P.muted, width: 1.25, dash: 'dash' });
    V.card(s, { x: 8.1, y: by, w: G.R - 8.1, h: bh, fill: P.white, line: P.faint, radius: 0.08 });
    txt(s, '下一个灯环\n（可以再串）', { x: 8.1, y: by, w: G.R - 8.1, h: bh, size: 11, color: P.muted, align: 'center', valign: 'middle', lineSpacingMultiple: 1.05 });
    // bottom: analogy + features
    const cy = 2.85, chh = G.bottom - cy, aw = 3.45;
    V.card(s, { x: G.L, y: cy, w: aw, h: chh, fill: P.turqPale });
    V.iconCircle(s, I.note, { x: G.L + 0.2, y: cy + 0.18, d: 0.42 });
    txt(s, '像传纸条', { x: G.L + 0.76, y: cy + 0.18, w: aw - 0.9, h: 0.42, size: 15, bold: true, valign: 'middle' });
    txt(s, '老师把 12 张纸条交给第 1 位同学：他留下第 1 张，把剩下的往后传……每颗灯都这样做，所以 12 颗灯只要 1 根信号线。', { x: G.L + 0.2, y: cy + 0.72, w: aw - 0.4, h: chh - 0.84, size: 12.5 });
    const fx = G.L + aw + 0.35, fw = G.R - fx;
    txt(s, '模块主要特点（原指南）', { x: fx, y: cy, w: fw, h: 0.3, size: 13.5, bold: true, valign: 'middle' });
    const feats = [
      '5050 高亮 LED，内置芯片', '1 个 IO 口控制多颗灯',
      '整形电路：失真不会累积', '三基色各 256 级亮度',
      '约 1677 万种颜色 *', '扫描频率 ≥ 400 Hz',
      '30 帧/秒时可串 ≥ 512 颗', '一根信号线收数据、解码',
      '数据速度最高 800 Kbps', '光色、亮度一致性高',
    ];
    const colw = (fw - 0.2) / 2, rh = 0.28, fy = cy + 0.4;
    feats.forEach((f, i) => {
      const x = fx + (i % 2) * (colw + 0.2), y = fy + Math.floor(i / 2) * rh;
      V.numCircle(s, i + 1, { x, y: y + 0.035, d: 0.22, size: 9.5 });
      txt(s, f, { x: x + 0.3, y, w: colw - 0.3, h: rh, size: 12, valign: 'middle' });
      if (V.textW(f, 12) > colw - 0.3) warn('feature too wide: ' + f);
    });
    txt(s, '* 原指南写“16 万色”有误：256 × 256 × 256 ≈ 1677 万色', { x: fx, y: fy + 5 * rh + 0.04, w: fw, h: 0.24, size: 10.5, color: P.muted, valign: 'middle' });
    if (fy + 5 * rh + 0.28 > G.bottom + 0.01) warn('features overflow');
  }

  // ================================================================ 6 wiring
  s = slide({
    title: '接线：信号线接 10 号脚',
    desc: '只要三根线：10 号脚 → R（信号），5V → V，GND → G；D 脚空着，留给下一个灯环',
    notes: '照接线表接三根线，接线前先拔掉 USB。灯环背面 4 根排针从左到右是 D、R、V、G：R 是信号输入，要接 10 号脚；D 是信号输出，这次空着不接。最常见的错误是把信号线插到了相邻的 D 脚上，灯就不会亮。',
  });
  {
    const lw = 3.3;
    const ty = V.wiring(s, { x: G.L, y: G.top, w: lw, right: 'WS2812b 模块', rows: [['10', 'R'], ['5V', 'V'], ['GND', 'G']], rowH: 0.34, size: 13 });
    const cy = ty + 0.3, chh = G.bottom - cy;
    V.card(s, { x: G.L, y: cy, w: lw, h: chh });
    txt(s, '灯环的四个引脚', { x: G.L + 0.18, y: cy + 0.12, w: lw - 0.36, h: 0.3, size: 13, bold: true, valign: 'middle' });
    const pins = [['R', '信号输入：接 10 号脚'], ['V', '电源正极（VDD）：接 5V'], ['G', '电源负极：接 GND'], ['D', '信号输出：这次空着']];
    pins.forEach(([p, d], i) => pinRow(s, p, d, G.L + 0.18, cy + 0.5 + i * 0.33, lw - 0.36, { h: 0.33, pillW: 0.36, fill: p === 'D' ? P.gray2 : P.ink, color: p === 'D' ? P.ink : P.white }));
    if (cy + 0.5 + 4 * 0.33 > G.bottom - 0.05) warn('pins card overflow');
    const rx = G.L + lw + 0.35, rw = G.R - rx, ih = 2.2;
    V.imageBox(s, { file: 'l23/ws_wiring.jpg', x: rx, y: G.top, w: rw, h: ih, diagram: true, caption: '原指南接线图：蓝线 10 → R，红线 5V → V，黑线 GND → G' });
    const ty2 = G.top + ih + 0.3, th = G.bottom - ty2, tw = (rw - 0.3) / 2;
    V.tip(s, { x: rx, y: ty2, w: tw, h: th, kind: 'note', title: 'D 脚留给下一个灯环', text: '把 D 接到下一个灯环的 R，灯就能越串越多。', size: 12 }, I.link);
    V.tip(s, { x: rx + tw + 0.3, y: ty2, w: tw, h: th, kind: 'warn', title: '信号线别插到 D', text: 'D 是“输出”，插错了灯不亮；要插 R。', size: 12 }, I.times_w);
  }

  // ================================================================ 7 syntax 1: library
  s = slide({
    title: '新语法①：库——给 Arduino 装“扩展包”',
    desc: '控制灯环的复杂代码，别人已经写好打包成了“库”：先在库管理器里安装，再用 #include 引进来',
    notes: '库就像手机上的 App：别人写好、打包好，我们装上就能用。WS2812 要求按微秒级的节奏发出一长串数据，自己写非常难，Adafruit 公司的 NeoPixel 库把这些都做好了。安装只需一次：工具 → 管理库，搜索 Adafruit NeoPixel，点安装。如果没装就编译，会看到 “No such file or directory”，意思是找不到这个库文件。',
  });
  {
    const lw = 4.35;
    let y = iconCard(s, I.puzzle, '库 = 别人写好的“扩展包”', { x: G.L, y: G.top, w: lw, h: G.ch });
    const t1 = '要让 WS2812 亮起来，得按微秒级的节奏发出一长串 0 和 1，自己写很难。Adafruit 公司把这些代码写好、打包成“库”，装上就能直接用——就像给手机装 App。';
    const h1 = hOf(t1, lw - 0.4, 12.5, 1.25);
    txt(s, t1, { x: G.L + 0.2, y, w: lw - 0.4, h: h1, size: 12.5 });
    y += h1 + 0.12;
    y += miniCode(s, '#include <Adafruit_NeoPixel.h>  // 引入库', { x: G.L + 0.2, y, w: lw - 0.4, size: 10.5 }) + 0.16;
    const pts = [
      [B('#include', { fontFace: V.MONO }), R(' 写在程序最开头')],
      [B('<>', { fontFace: V.MONO }), R(' 里是库的“说明书”文件（.h 头文件）')],
      [R('一个库装一次，以后所有程序都能用')],
    ];
    pts.forEach((p, i) => {
      V.numCircle(s, i + 1, { x: G.L + 0.2, y: y + i * 0.36 + 0.03, d: 0.26, size: 10 });
      txt(s, p, { x: G.L + 0.56, y: y + i * 0.36, w: lw - 0.76, h: 0.32, size: 12, valign: 'middle' });
    });
    if (y + 3 * 0.36 > G.bottom - 0.05) warn('library card overflow');
    const rx = G.L + lw + 0.3, rw = G.R - rx;
    txt(s, '安装步骤（每台电脑只需一次）', { x: rx, y: G.top, w: rw, h: 0.3, size: 13.5, bold: true, valign: 'middle' });
    const sy = G.top + 0.4, sh = 1.86;
    V.card(s, { x: rx, y: sy, w: rw, h: sh });
    const st = [
      ['打开库管理器', '菜单 工具 → 管理库…（Ctrl+Shift+I）'],
      ['搜索库名', '在搜索框输入 Adafruit NeoPixel'],
      ['点“安装”', '找到作者是 Adafruit 的那个，点安装'],
    ];
    st.forEach(([t, d], i) => {
      const yy = sy + 0.16 + i * 0.57;
      V.numCircle(s, i + 1, { x: rx + 0.18, y: yy + 0.02, d: 0.32, size: 11 });
      txt(s, t, { x: rx + 0.62, y: yy - 0.02, w: rw - 0.8, h: 0.28, size: 13, bold: true, valign: 'middle' });
      txt(s, d, { x: rx + 0.62, y: yy + 0.26, w: rw - 0.8, h: 0.26, size: 12, color: P.muted, valign: 'middle' });
    });
    const wy = sy + sh + 0.3;
    warnRow(s, I.times_w, '没装库就编译，会报错', [M('Adafruit_NeoPixel.h: No such file', { breakLine: true }), R('意思是“找不到这个文件”：先去装库。')], { x: rx, y: wy, w: rw, h: G.bottom - wy });
  }

  // ================================================================ 8 syntax 2: object
  s = slide({
    title: '新语法②：对象——pixels 是你的“灯环管家”',
    desc: '用库先“创建一个对象”，以后就用 对象.函数() 给它下命令，比如 pixels.begin()、pixels.show()',
    notes: '对象可以想成一位管家：Adafruit_NeoPixel 是管家的“种类”，pixels 是我们给这位管家起的名字。创建时要交代清楚：管几颗灯、接哪个脚、用什么数据格式。以后说 pixels.show()，就是“pixels，把颜色发出去”，中间的点可以读成“的”。名字要一字不差，大小写写错就会报 was not declared 的错误。',
  });
  {
    const lw = 4.6;
    let y = iconCard(s, I.robot, '对象 = 一位“灯环管家”', { x: G.L, y: G.top, w: lw, h: G.ch });
    y += miniCode(s, 'Adafruit_NeoPixel pixels(\n    PIXEL_COUNT, LED_Pin,\n    NEO_GRB + NEO_KHZ800);', { x: G.L + 0.2, y, w: lw - 0.4, size: 11 }) + 0.14;
    const tw0 = lw - 0.4, c0 = 1.92;
    kvTable(s, [
      ['Adafruit_NeoPixel', '类型：管家的“种类”'],
      ['pixels', '名字：自己起，后面都用它'],
      ['PIXEL_COUNT', '管几颗灯：12'],
      ['LED_Pin', '接哪个脚：10'],
      ['NEO_GRB', '颜色按 绿-红-蓝 顺序发'],
      ['NEO_KHZ800', '发送速度 800 kHz'],
    ], { x: G.L + 0.2, y, w: tw0, colW: [c0, tw0 - c0], rowH: 0.29, size: 12, monoSize: 11 });
    if (y + 6 * 0.29 > G.bottom - 0.08) warn('object table overflow');
    const rx = G.L + lw + 0.3, rw = G.R - rx, ch = 2.13;
    y = iconCard(s, I.comments, '对象.函数()：对管家下命令', { x: rx, y: G.top, w: rw, h: ch });
    y += miniCode(s, 'pixels.begin();  // 管家，准备开工\npixels.show();   // 管家，把颜色发出去', { x: rx + 0.2, y, w: rw - 0.4, size: 10.5 }) + 0.1;
    txt(s, [R('中间的“'), B('.', { fontFace: V.MONO }), R('”读作“的”：pixels 的 show 功能。', { breakLine: true }), R('后面还有 setPixelColor() 等命令。')], { x: rx + 0.2, y, w: rw - 0.4, h: G.top + ch - 0.06 - y, size: 12 });
    const wy = G.top + ch + 0.3;
    warnCard(s, I.times_w, '名字要一字不差', [R('写成 Pixels.show()（大写 P）就会报错：', { breakLine: true }), M("'Pixels' was not declared in this scope", { fontSize: 11 })], { x: rx, y: wy, w: rw, h: G.bottom - wy });
  }

  // ================================================================ 9 syntax 3: draft then show
  s = slide({
    title: '新语法③：先写草稿，再用 show() 寄出',
    desc: 'setPixelColor() 只是把颜色写进 Arduino 里的“草稿”，show() 才把 12 颗灯的颜色一次性发出去',
    notes: '用写信和寄信来类比：setPixelColor() 是在信纸上写“第几颗灯要什么颜色”，写多少行灯都不会变；show() 才是把信寄出去，灯环收到后一起变色。Color(红, 绿, 蓝) 三个数都是 0～255，和 2-1 课 analogWrite 调 RGB 是同一个道理。setBrightness(30) 把整体亮度限制在约 12%，既不刺眼，也避免 12 颗灯满亮时 USB 供电不够。',
  });
  {
    const lw = 4.6;
    const ch = 2.27;
    V.card(s, { x: G.L, y: G.top, w: lw, h: ch });
    V.iconCircle(s, I.envelope, { x: G.L + 0.2, y: G.top + 0.18, d: 0.42 });
    txt(s, '像写信和寄信', { x: G.L + 0.76, y: G.top + 0.18, w: lw - 0.9, h: 0.42, size: 15, bold: true, valign: 'middle' });
    const bw = 1.85, by = G.top + 0.76, bh = 1.33;
    const boxes = [
      { x: G.L + 0.2, n: 1, t: '写信', c: 'setPixelColor()', d: '把第 i 颗灯的颜色写进草稿，灯还没变', fill: P.white },
      { x: G.L + lw - 0.2 - bw, n: 2, t: '寄出', c: 'show()', d: '整份草稿发给灯环，灯一起变色', fill: P.turq },
    ];
    boxes.forEach((b) => {
      V.card(s, { x: b.x, y: by, w: bw, h: bh, fill: b.fill, line: b.fill === P.white ? P.gray2 : undefined });
      V.numCircle(s, b.n, { x: b.x + 0.14, y: by + 0.12, d: 0.3, size: 11, fill: b.fill === P.turq ? P.ink : P.turq, color: b.fill === P.turq ? P.white : P.ink });
      txt(s, b.t, { x: b.x + 0.52, y: by + 0.12, w: bw - 0.6, h: 0.3, size: 14, bold: true, valign: 'middle' });
      txt(s, b.c, { x: b.x + 0.14, y: by + 0.5, w: bw - 0.2, h: 0.26, size: 11, bold: true, mono: true, valign: 'middle' });
      txt(s, b.d, { x: b.x + 0.14, y: by + 0.8, w: bw - 0.26, h: bh - 0.84, size: 12 });
    });
    V.arrow(s, G.L + 0.2 + bw + 0.08, by + bh / 2, G.L + lw - 0.2 - bw - 0.08, by + bh / 2, { color: P.ink, width: 1.75 });
    const wy = G.top + ch + 0.3;
    warnRow(s, I.times_w, '只写不寄 = 灯不变', '写完 setPixelColor() 却忘了 show()，灯一点反应都没有。', { x: G.L, y: wy, w: lw, h: G.bottom - wy });
    // right: Color() + brightness
    const rx = G.L + lw + 0.3, rw = G.R - rx;
    const ah = 1.85;
    V.card(s, { x: rx, y: G.top, w: rw, h: ah });
    V.iconCircle(s, I.palette, { x: rx + 0.2, y: G.top + 0.16, d: 0.38 });
    txt(s, 'pixels.Color(红, 绿, 蓝)', { x: rx + 0.7, y: G.top + 0.16, w: rw - 0.85, h: 0.38, size: 13, bold: true, mono: true, valign: 'middle' });
    const cr = [['(255, 0, 0)', '红'], ['(0, 0, 255)', '蓝'], ['(127, 127, 127)', '白（约一半亮度）']];
    cr.forEach(([c, t], i) => {
      const yy = G.top + 0.64 + i * 0.29;
      txt(s, c, { x: rx + 0.24, y: yy, w: 1.75, h: 0.28, size: 12, mono: true, bold: true, valign: 'middle' });
      txt(s, '→ ' + t, { x: rx + 2.0, y: yy, w: rw - 2.15, h: 0.28, size: 12, valign: 'middle' });
    });
    txt(s, '三个数各 0～255，可混出约 1677 万种颜色', { x: rx + 0.24, y: G.top + 1.5, w: rw - 0.4, h: 0.26, size: 12, color: P.muted, valign: 'middle' });
    const gy = G.top + ah + 0.3, gh = G.bottom - gy;
    V.card(s, { x: rx, y: gy, w: rw, h: gh, fill: P.turqPale });
    V.iconCircle(s, I.sun, { x: rx + 0.2, y: gy + 0.14, d: 0.36 });
    txt(s, 'setBrightness(30)：亮度上限', { x: rx + 0.66, y: gy + 0.14, w: rw - 0.8, h: 0.36, size: 13, bold: true, valign: 'middle' });
    const barX = rx + 0.24, barW = rw - 0.48, barY = gy + 0.62;
    V.card(s, { x: barX, y: barY, w: barW, h: 0.2, fill: P.white, line: P.gray2, radius: 0.1 });
    V.card(s, { x: barX, y: barY, w: Math.max(0.24, barW * 30 / 255), h: 0.2, fill: P.turqDeep, radius: 0.1 });
    V.text(s, '30 / 255 ≈ 12%', { x: barX + barW * 30 / 255 + 0.12, y: barY - 0.04, w: 1.6, h: 0.28, size: 11, bold: true, valign: 'middle' });
    txt(s, '不刺眼、更省电：12 颗灯全亮白光约 0.7 A，电脑 USB 口一般只能给 0.5 A。', { x: rx + 0.24, y: barY + 0.32, w: rw - 0.44, h: gy + gh - 0.08 - (barY + 0.32), size: 12 });
  }

  // ================================================================ 10 code 1/2
  s = slide({
    title: '代码逐行看懂（1/2）：准备工作',
    desc: '先引入库、给数字起外号、创建灯环对象，再在 setup() 里让管家开工并设好亮度',
    notes: '第 3、4 行的 #define 在 2-1 课见过：给数字起外号，编译前 LED_Pin 会被直接换成 10，注意末尾不加分号。第 6 行是本程序的核心：创建对象 pixels，括号里的外号分别代表 12 颗灯、10 号脚。setup() 里 begin() 让管家开工；紧接着的 show() 发出的是空草稿，作用是先把灯全部关掉；setBrightness(30) 设定亮度上限。',
  });
  {
    const cw = 5.15;
    const b = codeBlock(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: WS_CODE, from: 1, to: 13, hl: [1, 6, 10, 11, 12], file: 'ws2812_ring.ino', right: '第 1–13 行' });
    const ex = G.L + cw + 0.32, ew = G.R - ex;
    explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.08, items: [
      { line: 1, text: '引入 NeoPixel 库（要先安装）' },
      { line: [3, 5], text: '起外号 LED_Pin＝10、PIXEL_COUNT＝12；count 也是 12' },
      { line: 6, text: '创建灯环对象 pixels：管 12 颗灯、接 10 号脚' },
      { line: [8, 9], text: 'setup() 开始，只运行一次' },
      { line: [10, 11], text: 'begin() 让管家开工；show() 发出空草稿，先把灯全关掉' },
      { line: 12, text: '亮度上限设为 30（最大 255）' },
    ] });
  }

  // ================================================================ 11 code 2/2
  s = slide({
    title: '代码逐行看懂（2/2）：一颗一颗写成白色',
    desc: 'for 循环让 i 从 0 数到 11：每圈给第 i 颗灯写上白色，再 show() 发出去',
    notes: '灯的编号和数组一样从 0 开始，12 颗灯是 0～11，所以条件写 i < count。第 18 行只是写草稿，第 19 行 show() 才真正发出去，所以每转一圈就多亮一颗。12 圈加起来不到 10 毫秒，眼睛根本分辨不出先后，看到的就是 12 颗一起亮。loop() 结束后又从头写一遍同样的白色，所以灯一直亮着、不闪。',
  });
  {
    const cw = 5.15;
    const b = codeBlock(s, { x: G.L, y: G.top, w: cw, h: 2.2, code: WS_CODE, from: 15, to: 21, hl: [16, 18, 19], file: 'ws2812_ring.ino', right: '第 15–21 行' });
    const ex = G.L + cw + 0.32, ew = G.R - ex;
    explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: 3.55, gap: 0.06, items: [
      { line: 15, text: 'loop()：一遍又一遍地重复' },
      { line: 16, text: 'i 从 0 数到 11：正好 12 颗' },
      { line: 18, text: '写草稿：第 i 颗 → 白色' },
      { line: 19, text: 'show() 寄出：第 i 颗亮起来' },
      { line: [20, 21], text: 'loop 又从头写一遍同样的白色，所以灯一直亮' },
    ] });
    // slow-motion replay (full width)
    const ry = G.top + 2.2 + 0.3, rh = G.bottom - ry;
    V.card(s, { x: G.L, y: ry, w: G.cw, h: rh });
    V.iconCircle(s, I.stopwatch, { x: G.L + 0.2, y: ry + 0.16, d: 0.38 });
    txt(s, '慢动作回放', { x: G.L + 0.7, y: ry + 0.16, w: 2.5, h: 0.38, size: 14, bold: true, valign: 'middle' });
    txt(s, '每圈多亮一颗；12 圈不到 10 毫秒，看起来就是“一起亮”。', { x: G.L + 0.2, y: ry + 0.64, w: 3.3, h: rh - 0.74, size: 12 });
    const rowsR = [['i = 0', 1], ['i = 1', 2], ['i = 11', 12]];
    const d = 0.22, dg = 0.08, lx0 = G.L + 3.85, lx = lx0 + 0.85, rp = 0.3, ry0 = ry + (rh - 3 * rp) / 2;
    rowsR.forEach(([lab, k], j) => {
      const yy = ry0 + j * rp;
      txt(s, lab, { x: lx0, y: yy, w: 0.8, h: rp, size: 11, mono: true, bold: true, valign: 'middle' });
      for (let q = 0; q < 12; q++) {
        const on = q < k;
        s.addShape('ellipse', { x: lx + q * (d + dg), y: yy + (rp - d) / 2, w: d, h: d, fill: { color: on ? P.turq : P.white }, line: { color: on ? P.turqDeep : P.gray2, width: 0.75 } });
      }
    });
    if (lx + 12 * (d + dg) > G.R - 0.15) warn('replay dots too wide');
  }

  // ================================================================ 12 result
  s = slide({
    title: '实验结果：12 颗灯亮起白光',
    desc: '上传程序后，12 颗灯一起亮起柔和的白光——注意：不要长时间直视！',
    notes: '上传后灯环 12 颗灯同时亮白光，中间那个小红点是模块的电源指示灯（Power）。原指南写的是“12 bit RGB 灯会亮起”，意思是 12 颗灯珠。即使亮度只有 30，LED 也很刺眼，提醒学生不要盯着看太久。如果灯不亮，先看下一页的常见坑。',
  });
  {
    const iw = 5.3;
    V.imageBox(s, { file: 'l23/ws_result_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南实物图：12 颗灯亮起白光（中间小红点是电源指示灯）' });
    const rx = G.L + iw + 0.3, rw = G.R - rx;
    const nh = 1.42;
    V.tip(s, { x: rx, y: G.top, w: rw, h: nh, kind: 'note', title: '原指南结论', text: '上传程序之后，12 颗 RGB 灯会亮起；注意，不要直视太久！', size: 12.5 }, I.check);
    const cy = G.top + nh + 0.3, chh = G.bottom - cy;
    V.card(s, { x: rx, y: cy, w: rw, h: chh });
    txt(s, '为什么是柔和的白光', { x: rx + 0.2, y: cy + 0.14, w: rw - 0.4, h: 0.3, size: 13.5, bold: true, valign: 'middle' });
    const why = [
      [I.palette, [B('R = G = B = 127', { fontFace: V.MONO, breakLine: true }), R('三色等量混合，就是白光')]],
      [I.sun, [B('setBrightness(30)', { fontFace: V.MONO, breakLine: true }), R('整体只有约 12% 亮度')]],
    ];
    why.forEach(([ic, t], i) => {
      const yy = cy + 0.56 + i * 0.66;
      V.iconCircle(s, ic, { x: rx + 0.2, y: yy + 0.06, d: 0.36 });
      txt(s, t, { x: rx + 0.68, y: yy, w: rw - 0.86, h: 0.52, size: 12 });
    });
    if (cy + 0.56 + 2 * 0.66 > G.bottom) warn('why card overflow');
  }

  // ================================================================ 13 pitfalls + try
  s = slide({
    title: '常见坑与动手改一改',
    desc: '灯不亮先查库和接线；跑通以后，改两三行代码，就能换颜色、做出“一颗颗亮起”的效果',
    notes: '左边三个坑按出现频率排序：没装库编译不过、信号线插错脚、亮度太高供电不足。右边两个小挑战：挑战 1 只改三个数字；挑战 2 在 show() 后面加一个 delay，就能看清“一颗一颗亮”的过程，再用 clear() 清空草稿、show() 寄出，灯就全灭，然后循环重来。可以让学生比较 delay(100) 和 delay(30) 的区别。',
  });
  {
    const lw = 4.3, n = 3, gap = 0.3, wh = (G.ch - gap * (n - 1)) / n;
    const W = [
      ['编译报错：No such file…', '没装库：工具 → 管理库，搜索 Adafruit NeoPixel 安装。'],
      ['上传成功，灯却不亮', '信号线插到 D 脚了？要插 R；再查 V、G 两根线。'],
      ['灯闪烁、板子反复重启', '亮度太高，USB 供电不够：把 setBrightness() 的数调小。'],
    ];
    W.forEach(([t, d], i) => warnRow(s, I.times_w, t, d, { x: G.L, y: G.top + i * (wh + gap), w: lw, h: wh }));
    const rx = G.L + lw + 0.35, rw = G.R - rx;
    let y = iconCard(s, I.wrench, '动手改一改', { x: rx, y: G.top, w: rw, h: G.ch });
    txt(s, [B('挑战 1　'), R('换个颜色：改第 18 行的三个数')], { x: rx + 0.2, y, w: rw - 0.4, h: 0.28, size: 12.5, valign: 'middle' });
    y += 0.34;
    y += miniCode(s, 'pixels.Color(127, 127, 127)  // 原来：白\npixels.Color(0, 0, 127)      // 改成：蓝', { x: rx + 0.2, y, w: rw - 0.4, size: 10.5, hl: [1] }) + 0.16;
    txt(s, [B('挑战 2　'), R('一颗颗亮起再全灭（第 19 行后加）')], { x: rx + 0.2, y, w: rw - 0.4, h: 0.28, size: 12.5, valign: 'middle' });
    y += 0.34;
    y += miniCode(s, '    delay(100);      // 新增：每颗停 0.1 秒\n  }\n  pixels.clear();    // 新增：草稿全清空\n  pixels.show();     // 新增：寄出 = 全灭\n  delay(500);        // 新增：停 0.5 秒', { x: rx + 0.2, y, w: rw - 0.4, size: 10.5, hl: [0, 2, 3, 4] });
    if (y > G.bottom - 0.1) warn('try card overflow');
  }

  // ================================================================ 14 divider: experiment 2
  deck.section('实验二　LCD1602 显示屏');
  curTitle = 'divider 2';
  deck.divider({
    kicker: '实验 02',
    title: '串行 LCD1602 模块动态显示屏实验',
    desc: '让一块 16 × 2 的液晶屏显示文字。只用两根信号线（I2C）：先“敲门”找到屏幕的地址，再用 setCursor() 和 print() 把字写上去。',
    tiles: [
      { fill: P.turq, big: '01', title: '认识', sub: '2 行 × 16 字符', subSize: 12 },
      { fill: P.gray1, big: '02', title: 'I2C', sub: '两根线 · 门牌号', subSize: 12 },
      { fill: P.ink, big: '03', title: '找地址', sub: '扫描程序 → 0x27', subSize: 12 },
      { fill: P.white, big: '04', title: '显示', sub: 'setCursor + print', subSize: 12 },
    ],
    notes: '实验二要运行两段程序：第一段扫描 I2C 地址，第二段才是显示文字。中间会讲 I2C 总线和十六进制，这是以后接各种 I2C 模块（OLED 屏、传感器）都要用到的知识。提醒学生：LCD 模块背面的转接板要先焊好。',
  });

  // ================================================================ 15 LCD intro
  s = slide({
    title: '认识 LCD1602 液晶显示屏',
    desc: '“1602” 的意思是 2 行、每行 16 个字符；背面的转接板让它只用两根信号线就能工作',
    notes: 'LCD1602 是最常见的字符屏，电子钟、温度计、打印机面板上都能见到。名字里的 16 和 02 分别指每行 16 个字符、一共 2 行，原指南这句话的表述有误，这里已改正。背面黑色的小板是 I2C 转接板，上面的芯片是 PCF8574（原指南误写成 PCA8574），蓝色方块是调对比度的电位器，后面排错时会用到。',
  });
  {
    const th = 1.9;
    const w1 = 4.1, w2 = 2.9;
    V.imageBox(s, { file: 'l23/lcd_module_photo1.jpg', x: G.L, y: G.top, w: w1, h: th, caption: '背面：I2C 转接板与蓝色电位器' });
    V.imageBox(s, { file: 'l23/lcd_module_photo2.jpg', x: G.L + w1 + 0.3, y: G.top, w: w2, h: th, caption: '侧面：转接板的 4 根排针' });
    const tx = G.L + w1 + w2 + 0.6, tw = G.R - tx;
    s.addShape('rect', { x: tx, y: G.top, w: tw, h: th, fill: { color: P.ink }, line: { color: P.gray2, width: 0.75 } });
    V.text(s, '16×2', { x: tx + 0.16, y: G.top + 0.16, w: tw - 0.24, h: 0.5, size: 26, bold: true, color: P.turq });
    txt(s, '每行 16 个字符\n一共 2 行', { x: tx + 0.16, y: G.top + th - 0.72, w: tw - 0.24, h: 0.58, size: 12, color: 'D0D0D0' });
    const cy = G.top + th + 0.3, chh = G.bottom - cy, n = 3, cw = (G.cw - 0.3 * (n - 1)) / n;
    const C = [
      [I.font, '字符型液晶屏', '专门显示字母、数字和符号，电子钟、温度显示器里很常见。'],
      [I.chip, '控制芯片 HD44780', '市面上的 1602 大多用它，控制方法都一样，屏内自带字库。'],
      [I.exchange, '背面：I2C 转接板', 'PCF8574 芯片（原指南误作 PCA8574），只占 SDA、SCL 两根线。'],
    ];
    C.forEach(([ic, t, d], i) => {
      const x = G.L + i * (cw + 0.3);
      const by = iconCard(s, ic, t, { x, y: cy, w: cw, h: chh, d: 0.36, titleSize: 13.5 });
      txt(s, d, { x: x + 0.2, y: by - 0.06, w: cw - 0.36, h: cy + chh - by - 0.04, size: 12 });
    });
  }

  // ================================================================ 16 purpose / principle / parts
  s = slide({
    title: '实验目的、原理与组件清单',
    desc: 'Arduino 通过 I2C 通信控制 LCD1602 显示字符；带上转接板，屏幕只占 2 个 IO 口',
    notes: '实验目的和原理照原指南念。右下角解释为什么要用转接板：不带转接板时，1602 至少要占 6 个 IO 口（RS、E 和 4 根数据线），再加上电源、背光、对比度的线，面包板上一大把；带了转接板，只要 SDA、SCL 两根信号线，省下来的口可以接别的传感器。组件里的 LCD 一定要是“带转接板”的那种。',
  });
  {
    const w = (G.cw - 0.35) / 2, h = 1.12;
    V.tip(s, { x: G.L, y: G.top, w, h, kind: 'note', title: '实验目的', text: '通过 Arduino UNO R3 主控板控制 LCD1602 液晶显示屏显示字符。', size: 12.5 }, I.target);
    V.tip(s, { x: G.L + w + 0.35, y: G.top, w, h, kind: 'tip', title: '实验原理', text: 'UNO 主控板与串行 LCD1602 相连，使用 I2C 通信，控制液晶屏显示字符。', size: 12.5 }, I.book);
    const by = G.top + h + 0.3, bh = G.bottom - by, pw = 3.75;
    partsCard(s, I, { x: G.L, y: by, w: pw, h: bh, cols: 1, rowH: 0.31, items: [
      { ic: 'chip', t: 'Arduino Uno R3 主板' }, { ic: 'grid', t: '面包板' }, { ic: 'usb', t: 'USB 数据线' },
      { ic: 'desktop', t: '带转接板的 LCD1602 显示屏' }, { ic: 'cable', t: '若干跳线' },
    ] });
    const rx = G.L + pw + 0.35, rw = G.R - rx;
    txt(s, '为什么要带转接板？', { x: rx, y: by, w: rw, h: 0.3, size: 13.5, bold: true, valign: 'middle' });
    const cy = by + 0.4, chh = G.bottom - cy, cw = (rw - 0.3) / 2;
    const cmp = [
      { fill: P.card, big: '6 个', t: '不带转接板', d: '至少占 6 个 IO 口（RS、E、D4～D7），另有电源、背光、对比度的线' },
      { fill: P.turq, big: '2 个', t: '带转接板', d: '只占 A4、A5 两个口，一共 4 根线；省下的口留给别的传感器' },
    ];
    cmp.forEach((c, i) => {
      const x = rx + i * (cw + 0.3);
      V.card(s, { x, y: cy, w: cw, h: chh, fill: c.fill });
      V.text(s, c.big, { x: x + 0.18, y: cy + 0.1, w: 1.2, h: 0.5, size: 24, bold: true });
      txt(s, c.t, { x: x + 1.2, y: cy + 0.16, w: cw - 1.3, h: 0.4, size: 13, bold: true, valign: 'middle' });
      txt(s, c.d, { x: x + 0.18, y: cy + 0.66, w: cw - 0.34, h: chh - 0.72, size: 12 });
    });
  }

  // ================================================================ 17 I2C bus
  s = slide({
    title: '原理：I2C 总线——两根线，按“门牌号”找设备',
    desc: 'SDA 传数据、SCL 打节拍；同一条总线能挂很多设备，Arduino 按地址（门牌号）找到要说话的那一个',
    notes: 'I2C 只用两根线：SCL 像节拍器，SDA 跟着节拍一位一位地传数据。一条总线上可以挂很多设备，每个设备都有自己的地址，就像一条街上每户人家的门牌号；Arduino 喊“0x27 号”，只有门牌是 0x27 的设备会回答。0x 开头的数是十六进制，0x27 = 2×16 + 7 = 39，扫描程序会把两种写法都打印出来。转接板上的跳线可以把地址设成 0x20～0x27，所以一块 Arduino 可以同时接好几块屏。',
  });
  {
    const lw = 5.45;
    // Arduino block
    const ax = G.L, ay = G.top + 0.05, aw = 1.1, ah = 1.25;
    V.card(s, { x: ax, y: ay, w: aw, h: ah, fill: P.ink, radius: 0.08 });
    txt(s, 'UNO', { x: ax, y: ay + 0.1, w: aw, h: 0.32, size: 14, bold: true, color: P.white, align: 'center', valign: 'middle' });
    const sdaY = ay + 0.62, sclY = ay + 0.98;
    V.text(s, 'A4', { x: ax + aw - 0.42, y: sdaY - 0.12, w: 0.36, h: 0.24, size: 10.5, bold: true, mono: true, color: P.turq, align: 'right', valign: 'middle' });
    V.text(s, 'A5', { x: ax + aw - 0.42, y: sclY - 0.12, w: 0.36, h: 0.24, size: 10.5, bold: true, mono: true, color: P.turq, align: 'right', valign: 'middle' });
    const lineEnd = G.L + lw;
    seg(s, ax + aw, sdaY, lineEnd, sdaY, { color: P.turqDeep, width: 2.25 });
    seg(s, ax + aw, sclY, lineEnd, sclY, { color: P.ink, width: 2.25 });
    txt(s, 'SDA 数据线', { x: ax + aw + 0.1, y: sdaY - 0.3, w: 1.3, h: 0.24, size: 10.5, bold: true, color: P.turqDeep, valign: 'middle' });
    txt(s, 'SCL 时钟线（打节拍）', { x: ax + aw + 0.1, y: sclY - 0.3, w: 2.0, h: 0.24, size: 10.5, bold: true, valign: 'middle' });
    // devices
    const dy = ay + ah + 0.45, dh = 0.82, dw = 1.08;
    const devs = [
      { x: 2.15, t: 'LCD1602', a: '0x27', on: true },
      { x: 3.5, t: '另一块 LCD', a: '0x26', on: false },
      { x: lineEnd - dw, t: 'OLED 屏', a: '0x3C', on: false },
    ];
    devs.forEach((d0) => {
      const cxa = d0.x + dw * 0.35, cxb = d0.x + dw * 0.65;
      seg(s, cxa, sdaY, cxa, dy, { color: P.turqDeep, width: 1.25 });
      seg(s, cxb, sclY, cxb, dy, { color: P.ink, width: 1.25 });
      s.addShape('ellipse', { x: cxa - 0.04, y: sdaY - 0.04, w: 0.08, h: 0.08, fill: { color: P.turqDeep }, line: { color: P.turqDeep, width: 0 } });
      s.addShape('ellipse', { x: cxb - 0.04, y: sclY - 0.04, w: 0.08, h: 0.08, fill: { color: P.ink }, line: { color: P.ink, width: 0 } });
      V.card(s, { x: d0.x, y: dy, w: dw, h: dh, fill: d0.on ? P.turqPale : P.card, line: d0.on ? P.turqDeep : P.gray2 });
      txt(s, d0.t, { x: d0.x + 0.04, y: dy + 0.06, w: dw - 0.08, h: 0.3, size: 11.5, bold: true, align: 'center', valign: 'middle' });
      V.pill(s, { x: d0.x + (dw - 0.62) / 2, y: dy + 0.44, w: 0.62, h: 0.26, text: d0.a, size: 10.5, mono: true, fill: d0.on ? P.turq : P.ink, color: d0.on ? P.ink : P.white });
    });
    V.iconCircle(s, I.home, { x: G.L + 0.3, y: dy + 0.18, d: 0.46 });
    txt(s, '门牌号\n（地址）', { x: G.L + 0.84, y: dy + 0.1, w: 1.0, h: 0.62, size: 11, bold: true, valign: 'middle', lineSpacingMultiple: 1.05 });
    // analogy strip
    const sy = dy + dh + 0.3, sh = G.bottom - sy;
    V.card(s, { x: G.L, y: sy, w: lw, h: sh, fill: P.turqPale });
    txt(s, [B('像一条街：'), R('SDA、SCL 是街道，设备是住户。Arduino 喊“0x27 号”，只有门牌是 0x27 的设备回应。')], { x: G.L + 0.2, y: sy, w: lw - 0.4, h: sh, size: 12.5, valign: 'middle' });
    // right: hex
    const rx = G.L + lw + 0.3, rw = G.R - rx;
    V.card(s, { x: rx, y: G.top, w: rw, h: G.ch });
    V.iconCircle(s, I.hashtag, { x: rx + 0.2, y: G.top + 0.18, d: 0.4 });
    txt(s, '0x27 是多少？', { x: rx + 0.72, y: G.top + 0.18, w: rw - 0.9, h: 0.4, size: 15, bold: true, valign: 'middle' });
    txt(s, '0x 开头表示十六进制（逢 16 进 1）', { x: rx + 0.2, y: G.top + 0.7, w: rw - 0.4, h: 0.28, size: 12, valign: 'middle' });
    V.card(s, { x: rx + 0.2, y: G.top + 1.08, w: rw - 0.4, h: 0.56, fill: P.white, line: P.gray2 });
    txt(s, [M('0x27', { bold: true }), R(' = 2 × 16 + 7 = '), B('39')], { x: rx + 0.2, y: G.top + 1.08, w: rw - 0.4, h: 0.56, size: 16, align: 'center', valign: 'middle' });
    V.table(s, [['十进制', '十六进制'], ['32', '0x20'], ['…', '…'], ['39', '0x27']], { x: rx + 0.2, y: G.top + 1.86, w: rw - 0.4, colW: [(rw - 0.4) / 2, (rw - 0.4) / 2], rowH: 0.27, size: 12, monoCols: [0, 1], align: ['center', 'center'] });
    txt(s, '跳线可把地址设成 0x20～0x27，一块 Arduino 能接好几块屏', { x: rx + 0.2, y: G.top + 3.0, w: rw - 0.4, h: 0.56, size: 12, color: P.muted });
  }

  // ================================================================ 18 wiring
  s = slide({
    title: '接线：4 根线，SDA 接 A4、SCL 接 A5',
    desc: '先把转接板焊在屏幕背面，再接 4 根线：GND → GND、VCC → 5V、SDA → A4、SCL → A5',
    notes: '原指南第一步是把转接板焊到 LCD 上，套件里如果已经焊好就跳过。接线只有 4 根：两根电源、两根信号。记住 SDA 对 A4、SCL 对 A5，接反了扫描程序就找不到设备。UNO R3 在 AREF 旁边还有两个标着 SDA、SCL 的排针，和 A4、A5 是连通的，接哪组都可以。',
  });
  {
    const lw = 3.55;
    const ty = V.wiring(s, { x: G.L, y: G.top, w: lw, left: 'LCD1602 模块', right: 'Arduino', rows: [['GND', 'GND'], ['VCC', '5V'], ['SDA', 'A4'], ['SCL', 'A5']], rowH: 0.34, size: 13 });
    const cy = ty + 0.3;
    V.tip(s, { x: G.L, y: cy, w: lw, h: G.bottom - cy, kind: 'note', title: '记一记', text: 'SDA（数据）→ A4\nSCL（时钟）→ A5\nAREF 旁的 SDA、SCL 排针和 A4、A5 相通，接哪组都行。', size: 12 }, I.key);
    const rx = G.L + lw + 0.3, rw = G.R - rx;
    V.imageBox(s, { file: 'l23/lcd_wiring.jpg', x: rx, y: G.top, w: rw, h: G.ch, diagram: true, caption: '原指南接线图：红 5V · 黑 GND · 黄 A4（SDA）· 蓝 A5（SCL）' });
  }

  // ================================================================ 19 real connection
  s = slide({
    title: '实物连接：对照照片检查一遍',
    desc: '杜邦线插在转接板的 4 根排针上，另一头接 UNO 的 5V、GND、A4、A5，接好再插 USB',
    notes: '对照实物照片，让同桌互相检查四根线。插上 USB 后背光应该立刻亮起，这只说明电源接对了；能不能显示字，还要看地址和程序。如果背光不亮，先查 VCC 和 GND；转接板上还有一个背光跳线帽，掉了背光也不亮。',
  });
  {
    const iw = 5.4;
    V.imageBox(s, { file: 'l23/lcd_connect_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南实物连接照片' });
    const rx = G.L + iw + 0.3, rw = G.R - rx;
    txt(s, '接线检查', { x: rx, y: G.top, w: rw, h: 0.32, size: 15, bold: true, valign: 'middle' });
    const ly = numList(s, [
      '先拔掉 USB，再接线',
      'VCC 接 5V，不要接 3.3V',
      'SDA → A4，SCL → A5，别接反',
      '插上 USB：背光亮 = 电源接对了',
    ], { x: rx, y: G.top + 0.46, w: rw, size: 12.5, gap: 0.2 });
    const ty = Math.max(ly + 0.3, 4.05);
    V.card(s, { x: rx, y: ty, w: rw, h: G.bottom - ty, fill: P.turqPale });
    V.iconCircle(s, I.eye, { x: rx + 0.16, y: ty + (G.bottom - ty - 0.36) / 2, d: 0.36 });
    txt(s, [B('背光亮 ≠ 能显示字', { breakLine: true }), R('还要找到地址、上传程序')], { x: rx + 0.64, y: ty, w: rw - 0.76, h: G.bottom - ty, size: 12, valign: 'middle' });
    if (G.bottom - ty < 0.6) warn('connect tip too short');
  }

  // ================================================================ 20 syntax 4: Wire scan
  s = slide({
    title: '新语法④：Wire 库——挨家“敲门”找地址',
    desc: '扫描程序用 for 循环把 8～119 号地址挨个“敲一遍门”，谁应答，就把谁的地址打印出来',
    notes: 'Wire 是 Arduino IDE 自带的 I2C 库，不用安装，但必须 #include <Wire.h>。原指南的扫描程序漏了这一行，直接编译会报 Wire was not declared，请学生先补上。程序思路就是挨家敲门：beginTransmission(i) 敲 i 号的门，endTransmission() 返回 0 表示有人应答。Serial.print 第二个参数 DEC、HEX 决定按十进制还是十六进制打印。',
  });
  {
    const lw = 4.6;
    let y = iconCard(s, I.door, '像挨家挨户敲门', { x: G.L, y: G.top, w: lw, h: G.ch });
    const doors = ['8', '9', '…', '39', '…', '119'];
    const dw = 0.52, dgap = 0.14, dh = 0.5;
    let dx = G.L + 0.2;
    doors.forEach((dn) => {
      if (dn === '…') { V.text(s, '…', { x: dx, y, w: 0.3, h: dh, size: 14, color: P.muted, align: 'center', valign: 'middle' }); dx += 0.3 + dgap; return; }
      const on = dn === '39';
      V.card(s, { x: dx, y, w: dw, h: dh, fill: on ? P.turq : P.white, line: on ? undefined : P.gray2, radius: 0.05 });
      V.text(s, dn, { x: dx, y, w: dw, h: dh, size: 12, bold: true, mono: true, align: 'center', valign: 'middle' });
      if (on) txt(s, '应答！', { x: dx - 0.2, y: y + dh + 0.02, w: dw + 0.4, h: 0.24, size: 11, bold: true, color: P.turqDeep, align: 'center', valign: 'middle' });
      dx += dw + dgap;
    });
    txt(s, '其他门没人', { x: dx + 0.02, y, w: G.L + lw - 0.2 - dx, h: dh, size: 11, color: P.muted, valign: 'middle' });
    y += dh + 0.36;
    y += miniCode(s, '#include <Wire.h>             // IDE 自带\nWire.begin();                 // 加入 I2C 总线\nWire.beginTransmission(39);   // 敲 39 号门\nWire.endTransmission() == 0   // 0 = 有人应答', { x: G.L + 0.2, y, w: lw - 0.4, size: 10 }) + 0.14;
    txt(s, [R('程序里用 '), M('for (byte i = 8; i < 120; i++)'), R(' 从 8 号敲到 119 号。')], { x: G.L + 0.2, y, w: lw - 0.4, h: G.bottom - 0.1 - y, size: 12 });
    // right
    const rx = G.L + lw + 0.3, rw = G.R - rx, ah = 1.95;
    let ry = iconCard(s, I.calc, '同一个数，两种写法', { x: rx, y: G.top, w: rw, h: ah, d: 0.4 });
    const rr = [['Serial.print(i, DEC)', '→ 39'], ['Serial.print(i, HEX)', '→ 27']];
    rr.forEach(([c, o2], i) => {
      txt(s, c, { x: rx + 0.2, y: ry + i * 0.3, w: 2.35, h: 0.28, size: 11.5, mono: true, bold: true, valign: 'middle' });
      txt(s, o2, { x: rx + 2.6, y: ry + i * 0.3, w: rw - 2.8, h: 0.28, size: 12, mono: true, valign: 'middle' });
    });
    txt(s, [B('byte', { fontFace: V.MONO }), R('：装 0～255 的小整数，放地址正好够用')], { x: rx + 0.2, y: ry + 0.7, w: rw - 0.4, h: G.top + ah - 0.06 - (ry + 0.7), size: 12 });
    const wy = G.top + ah + 0.3;
    warnCard(s, I.warn_w, '原指南程序少了一行', [R('在最前面补上 '), M('#include <Wire.h>', { bold: true }), R('，否则编译报错：', { breakLine: true }), M("'Wire' was not declared in this scope")], { x: rx, y: wy, w: rw, h: G.bottom - wy });
  }

  // ================================================================ 21 scan code 1/2
  s = slide({
    title: '程序①逐行看懂（1/2）：准备好，开始敲门',
    desc: '打开串口、加入 I2C 总线，然后让 i 从 8 数到 119，每个号码都敲一次门',
    notes: '整个扫描程序都写在 setup() 里，只运行一次。第 3 行的英文注释说的是 Leonardo 板要等串口连上，UNO 上第 4 行会马上通过。第 9 行的 for 循环和流水灯里学过的一样，只是计数器换成了 byte 类型。第 11 行最关键：endTransmission() 返回 0，说明这个地址上有设备回应。再提醒一次：最前面要补 #include <Wire.h>。',
  });
  {
    const cw = 5.15, chh = 2.85;
    const b = codeBlock(s, { x: G.L, y: G.top, w: cw, h: chh, code: SCAN_CODE, from: 1, to: 11, hl: [8, 9, 10, 11], file: 'i2c_scanner.ino', right: '第 1–11 行' });
    const wy = G.top + chh + 0.3;
    V.card(s, { x: G.L, y: wy, w: cw, h: G.bottom - wy, fill: P.white, line: P.red, lineW: 1 });
    V.iconCircle(s, I.warn_w, { x: G.L + 0.14, y: wy + (G.bottom - wy - 0.32) / 2, d: 0.32, fill: P.red });
    txt(s, [R('原指南漏了一行：第 1 行之前要加 '), M('#include <Wire.h>', { bold: true })], { x: G.L + 0.58, y: wy, w: cw - 0.7, h: G.bottom - wy, size: 12, color: P.red, valign: 'middle' });
    const ex = G.L + cw + 0.32, ew = G.R - ex;
    explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.1, items: [
      { line: [1, 2], text: '全部写在 setup() 里：扫描一次就够' },
      { line: [3, 4], text: '打开串口 9600，等它准备好（UNO 马上通过）' },
      { line: [5, 7], text: '打印标题；count 记录找到几个设备' },
      { line: 8, text: '加入 I2C 总线（SDA = A4，SCL = A5）' },
      { line: 9, text: 'i 从 8 数到 119，挨个试' },
      { line: [10, 11], text: '敲 i 号的门；返回 0 = 有设备应答' },
    ] });
  }

  // ================================================================ 22 scan code 2/2
  s = slide({
    title: '程序①逐行看懂（2/2）：有人应答就打印',
    desc: '找到设备就用十进制和十六进制各打印一次地址，全部敲完再报告一共找到几个',
    notes: '第 12～16 行拼出一整行：“Found address: 39 (0x27)”，其中 DEC 打印十进制 39，HEX 打印十六进制 27，前面的 0x 是第 14 行手动印上去的。第 17 行 count++ 等于 count = count + 1。for 循环结束后打印 Done. 和找到的设备总数。loop() 是空的，所以想再扫一次，按一下板子上的复位键就行。',
  });
  {
    const cw = 5.15;
    const b = codeBlock(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: SCAN_CODE, from: 12, to: 28, hl: [13, 15, 17], file: 'i2c_scanner.ino', right: '第 12–28 行' });
    const ex = G.L + cw + 0.32, ew = G.R - ex;
    explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.1, items: [
      { line: [12, 16], text: '拼出一行 “Found address: 39 (0x27)”：DEC 印十进制，HEX 印十六进制' },
      { line: [17, 18], text: 'count 加 1；稍等 1 毫秒（注释：也许不需要）' },
      { line: [19, 20], text: '应答处理结束；for 循环结束' },
      { line: [21, 24], text: '打印 “Done.” 和 “Found 1 device(s).”' },
      { line: [26, 28], text: 'loop() 空着；想再扫一次，按复位键' },
    ] });
  }

  // ================================================================ 23 scan result
  s = slide({
    title: '程序①结果：扫描到地址 0x27',
    desc: '串口监视器（波特率 9600）显示 Found address: 39 (0x27)——39 和 0x27 是同一个数',
    notes: '上传后打开串口监视器，右下角波特率选 9600，就能看到扫描结果。对照右边，每一行输出都能找到打印它的代码。原指南提醒：很多转接板默认是 0x27，但最好自己扫一下；如果扫出来是 0x3F，后面显示程序里的 0x27 也要改成 0x3F。如果显示 Found 0 device(s)，说明总线上没找到设备，先查 SDA、SCL 两根线。',
  });
  {
    const iw = 4.3;
    V.imageBox(s, { file: 'l23/lcd_i2c_scan_serial.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南：串口监视器扫描到的 I2C 地址为 0x27' });
    const rx = G.L + iw + 0.3, rw = G.R - rx;
    txt(s, '每一行是哪句代码打印的', { x: rx, y: G.top, w: rw, h: 0.3, size: 13.5, bold: true, valign: 'middle' });
    const out = [['I2C scanner. Scanning ...', '第 6 行'], ['Found address: 39 (0x27)', '第 12–16 行'], ['Done.', '第 21 行'], ['Found 1 device(s).', '第 22–24 行']];
    const tagW = 1.1, oy = G.top + 0.4, orh = 0.38, og = 0.1;
    out.forEach(([o2, tag], i) => {
      const yy = oy + i * (orh + og);
      V.card(s, { x: rx, y: yy, w: rw - tagW - 0.12, h: orh, fill: P.card, radius: 0.06 });
      txt(s, o2, { x: rx + 0.12, y: yy, w: rw - tagW - 0.3, h: orh, size: 11, mono: true, bold: i === 1, valign: 'middle' });
      if (V.monoW(o2, 11) > rw - tagW - 0.3) warn('serial line too wide: ' + o2);
      V.pill(s, { x: rx + rw - tagW, y: yy + (orh - 0.26) / 2, w: tagW, h: 0.26, text: tag, size: 10 });
    });
    const ty = oy + 4 * (orh + og) - og + 0.3;
    V.tip(s, { x: rx, y: ty, w: rw, h: G.bottom - ty, kind: 'note', title: '原指南提示', text: '很多转接板默认是 0x27，但最好自己扫一下。扫出 0x3F，程序②里的 0x27 也要改成 0x3F。', size: 12 }, I.search);
  }

  // ================================================================ 24 syntax 5: lcd object + setCursor
  s = slide({
    title: '新语法⑤：lcd 对象和 setCursor(列, 行)',
    desc: '先创建 lcd 对象，告诉它地址和尺寸；setCursor(列, 行) 把“笔尖”放到某一格，print() 从那里开始写',
    notes: '和灯环一样，先请一位“屏幕管家”：LiquidCrystal_I2C lcd(0x27,16,2)，括号里是地址、列数、行数，地址必须和扫描结果一致。LiquidCrystal_I2C 库不是 IDE 自带的，要用套件资料里的库文件，或在库管理器里搜索 LiquidCrystal I2C 安装。setCursor 像在格子本上落笔：先说第几列，再说第几行，而且都从 0 开始数，这是最容易错的地方。',
  });
  {
    const lw = 4.3;
    let y = iconCard(s, I.desktop, '再请一位“屏幕管家”', { x: G.L, y: G.top, w: lw, h: G.ch });
    y += miniCode(s, 'LiquidCrystal_I2C lcd(0x27,16,2);', { x: G.L + 0.2, y, w: lw - 0.4, size: 11 }) + 0.1;
    txt(s, [R('括号里：'), M('0x27', { bold: true }), R(' 地址（和扫描结果一致）、'), M('16', { bold: true }), R(' 列、'), M('2', { bold: true }), R(' 行')], { x: G.L + 0.2, y, w: lw - 0.4, h: 0.5, size: 12 });
    y += 0.56;
    const fns = [['lcd.init()', '初始化屏幕'], ['lcd.backlight()', '打开背光'], ['lcd.setCursor(列,行)', '移动“笔尖”'], ['lcd.print("…")', '从笔尖处写字']];
    fns.forEach(([c, t], i) => pinRow(s, c, t, G.L + 0.2, y + i * 0.34, lw - 0.4, { h: 0.34, pillW: 2.15, pillSize: 10.5 }));
    y += 4 * 0.34 + 0.1;
    txt(s, '库要先安装：LiquidCrystal_I2C（套件资料提供）', { x: G.L + 0.2, y, w: lw - 0.4, h: G.bottom - 0.08 - y, size: 11.5, color: P.muted });
    // right: grid
    const rx = G.L + lw + 0.3, rw = G.R - rx;
    txt(s, '像在格子本上写字：先列后行，从 0 数', { x: rx, y: G.top, w: rw, h: 0.3, size: 13.5, bold: true, valign: 'middle' });
    const gx = rx + 0.38, cwid = (rw - 0.42) / 16, gy = G.top + 0.72, gch = 0.4;
    txt(s, '列 →', { x: rx, y: gy - 0.27, w: 0.4, h: 0.22, size: 10, color: P.muted, valign: 'middle' });
    charGrid(s, { x: gx, y: gy, cw: cwid, ch: gch, colNums: true, rowNums: true, hl: [[0, 0], [4, 1]], text: ['H               ', '    S           '], size: 12 });
    txt(s, '行', { x: rx, y: gy + gch * 2 + 0.02, w: 0.34, h: 0.22, size: 10, color: P.muted, align: 'right', valign: 'middle' });
    const ly = gy + 2 * gch + 0.32;
    const L2 = [['setCursor(0,0)', '第 1 行第 1 格'], ['setCursor(4,1)', '第 2 行第 5 格']];
    L2.forEach(([c, t], i) => {
      V.pill(s, { x: rx, y: ly + i * 0.36, w: 1.55, h: 0.28, text: c, size: 10.5, mono: true });
      txt(s, '→ ' + t, { x: rx + 1.67, y: ly + i * 0.36 - 0.02, w: rw - 1.7, h: 0.32, size: 12.5, valign: 'middle' });
    });
    const wy = ly + 2 * 0.36 + 0.24;
    warnCard(s, I.times_w, '行、列都从 0 开始', [M('setCursor(1,1)'), R(' 不是第 1 行第 1 格，而是第 2 行第 2 格。')], { x: rx, y: wy, w: rw, h: G.bottom - wy });
  }

  // ================================================================ 25 lcd code 1/2
  s = slide({
    title: '程序②逐行看懂（1/2）：创建 lcd 对象',
    desc: '引入两个库，按扫描到的地址创建 lcd 对象，然后在 setup() 里初始化屏幕、打开背光',
    notes: '第 1 行的 Wire 是 I2C 通信库，第 2 行的 LiquidCrystal_I2C 是屏幕库；第 2 行用双引号，表示先在程序所在文件夹里找这个库文件，找不到再去库目录找。第 4 行最重要：0x27 一定要和程序①扫描到的地址一样。第 8 行 init() 是让屏幕开工，相当于灯环的 begin()；第 10 行打开背光，不开背光字会很难看清。',
  });
  {
    const cw = 5.15;
    const b = codeBlock(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: LCD_CODE, from: 1, to: 10, hl: [4, 8, 10], file: 'lcd1602_hello.ino', right: '第 1–10 行' });
    const ex = G.L + cw + 0.32, ew = G.R - ex;
    explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.1, items: [
      { line: [1, 2], text: '引入 Wire（I2C，IDE 自带）和 LiquidCrystal_I2C（要安装）' },
      { line: 4, text: '创建 lcd 对象：地址 0x27、16 列、2 行（地址要和扫描结果一致）' },
      { line: [6, 7], text: 'setup()：只运行一次' },
      { line: 8, text: 'init()：屏幕开工（像灯环的 begin()）' },
      { line: 9, text: '注释：下面开始往屏幕上写字' },
      { line: 10, text: 'backlight()：打开背光' },
    ] });
  }

  // ================================================================ 26 lcd code 2/2
  s = slide({
    title: '程序②逐行看懂（2/2）：落笔、写字',
    desc: '两次“先 setCursor 落笔、再 print 写字”：第 1 行写 Hello Word，第 2 行从第 5 格写 Science Robot',
    notes: '第 11 行的注释写成了 “go to start of 2nd line”，这是原程序抄错了：(0,0) 是第 1 行第 1 格，第 13 行的 (4,1) 才是第 2 行。Hello Word 也是原程序的拼写，正确应为 Hello World，学生可以自己改过来。数一数：Science Robot 有 13 个字符，从第 5 格开始只剩 12 格，最后的 t 显示不出来。字写一次就会一直留在屏幕上，所以 loop() 空着也没关系。',
  });
  {
    const cw = 5.15;
    const b = codeBlock(s, { x: G.L, y: G.top, w: cw, h: 2.35, code: LCD_CODE, from: 11, to: 19, hl: [11, 12, 13, 14], file: 'lcd1602_hello.ino', right: '第 11–19 行' });
    const ex = G.L + cw + 0.32, ew = G.R - ex;
    explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.1, items: [
      { line: 11, text: '落笔到第 1 行第 1 格（注释写成 2nd line，是原程序的笔误）' },
      { line: 12, text: '写 “Hello Word”（原拼写，应为 World）' },
      { line: 13, text: '落笔到第 2 行第 5 格' },
      { line: 14, text: '写 “Science Robot”：13 个字符只剩 12 格，t 显示不出来' },
      { line: [17, 19], text: 'loop() 空着：字写一次就一直留在屏幕上' },
    ] });
    // count the cells on line 2
    const ry = G.top + 2.35 + 0.3, rh = G.bottom - ry;
    V.card(s, { x: G.L, y: ry, w: cw, h: rh });
    txt(s, '数一数第 2 行的格子', { x: G.L + 0.18, y: ry + 0.1, w: 3, h: 0.28, size: 13, bold: true, valign: 'middle' });
    const cwid = 0.27, gx = G.L + 0.24, gy = ry + 0.62;
    const line2 = '    Science Robot';
    for (let c = 0; c < 17; c++) {
      const x = gx + c * cwid, out = c === 16;
      if (!out) s.addShape('rect', { x: x + 0.01, y: gy + 0.01, w: cwid - 0.02, h: 0.36, fill: { color: c >= 4 ? P.turqPale : P.white }, line: { color: P.gray2, width: 0.75 } });
      else V.card(s, { x: x + 0.03, y: gy + 0.01, w: cwid - 0.02, h: 0.36, fill: P.white, line: P.red, lineW: 1, radius: 0.04 });
      const chx = line2[c];
      if (chx && chx !== ' ') V.text(s, chx, { x, y: gy, w: cwid, h: 0.38, size: 12, bold: true, mono: true, color: out ? P.red : P.ink, align: 'center', valign: 'middle' });
      if (c === 0 || c === 4 || c === 15) V.text(s, String(c), { x, y: gy - 0.24, w: cwid, h: 0.2, size: 10, mono: true, color: P.muted, align: 'center', valign: 'middle' });
    }
    txt(s, '第 16 格不存在 → t 看不见', { x: gx, y: gy + 0.44, w: cw - 0.5, h: 0.26, size: 11.5, color: P.red, valign: 'middle' });
  }

  // ================================================================ 27 result
  s = slide({
    title: '实验结果：屏幕显示文字',
    desc: '原指南照片里屏幕显示 “Hello, world!”，和程序里的文字不一样——照片来自另一版程序',
    notes: '先展示原指南的结果照片，再说明：照片里的 Hello, world! 和我们这段程序的文字不同，说明照片拍的是另一版程序，不是我们看错了。按本页的程序上传，屏幕应该像右边那样：第 1 行 Hello Word，第 2 行从第 5 格开始 Science Robo。如果背光亮了但看不到字，就进入下一页的排错。',
  });
  {
    const iw = 5.1;
    V.imageBox(s, { file: 'l23/lcd_result_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南结果照片（显示 “Hello, world!”，来自另一版程序）' });
    const rx = G.L + iw + 0.3, rw = G.R - rx;
    txt(s, '按本节程序，屏幕应该是这样', { x: rx, y: G.top, w: rw, h: 0.3, size: 13.5, bold: true, valign: 'middle' });
    const cwid = (rw - 0.3) / 16, gch = 0.42, gx = rx + 0.15, gy = G.top + 0.55;
    charGrid(s, { x: gx, y: gy, cw: cwid, ch: gch, lcd: true, text: ['Hello Word      ', '    Science Robo'], size: 11.5 });
    const ty = gy + 2 * gch + 0.1 + 0.3;
    V.tip(s, { x: rx, y: ty, w: rw, h: 1.15, kind: 'note', title: '照片和程序为什么不一样', text: '照片里的文字来自另一版程序；我们以本页程序为准。', size: 12 }, I.eye);
    const t2 = ty + 1.15 + 0.3;
    V.tip(s, { x: rx, y: t2, w: rw, h: G.bottom - t2, kind: 'tip', text: '想显示 Hello World？把第 12 行的 Word 改成 World 再上传。', size: 12 }, I.pen);
    if (G.bottom - t2 < 0.6) warn('result tip short');
  }

  // ================================================================ 28 troubleshooting + try
  s = slide({
    title: '常见问题与动手改一改',
    desc: '背光亮了却没有字，先调转接板背面的蓝色电位器；跑通以后，让屏幕“动”起来',
    notes: '原指南给出的头号问题：上传后背光亮了却不显示字符，多半是对比度没调好。用小十字螺丝刀慢慢转背面的蓝色电位器：转过头会出现一排排黑方块，转反了什么都看不见，转到字清楚为止。如果怎么调都只有黑方块，通常是地址不对或程序没跑起来。动手改一改里的秒表用到了 millis()，它返回开机以来的毫秒数，除以 1000 就是秒，这正是本实验名字里“动态显示”的意思。',
  });
  {
    const lw = 4.85;
    const ch = 2.0;
    V.card(s, { x: G.L, y: G.top, w: lw, h: ch, fill: P.turqPale });
    V.iconCircle(s, I.adjust, { x: G.L + 0.18, y: G.top + 0.16, d: 0.38 });
    txt(s, '背光亮了，却不显示字？', { x: G.L + 0.66, y: G.top + 0.16, w: 2.6, h: 0.38, size: 14, bold: true, valign: 'middle' });
    const pw = 1.85;
    V.imageBox(s, { file: 'l23/lcd_module_photo1.jpg', x: G.L + lw - pw - 0.14, y: G.top + 0.14, w: pw, h: ch - 0.28, fill: P.white, caption: '蓝色方块 = 电位器', capH: 0.26 });
    numList(s, ['原指南：调转接板背面的蓝色电位器', '用小螺丝刀慢慢转', '满屏黑方块是转过头了，转到字清楚为止'], { x: G.L + 0.18, y: G.top + 0.68, w: lw - pw - 0.5, size: 12, d: 0.24, gap: 0.08 });
    const wy = G.top + ch + 0.3, wh = G.bottom - wy, ww = (lw - 0.3) / 2;
    warnCard(s, I.times_w, '只有黑方块', '地址不对或程序没跑：先用程序①核对地址。', { x: G.L, y: wy, w: ww, h: wh, titleSize: 13 });
    warnCard(s, I.times_w, '扫不到设备', 'Found 0 device(s)：查 SDA、SCL 是否接反或松动。', { x: G.L + ww + 0.3, y: wy, w: ww, h: wh, titleSize: 13 });
    const rx = G.L + lw + 0.3, rw = G.R - rx;
    let y = iconCard(s, I.wrench, '动手改一改', { x: rx, y: G.top, w: rw, h: G.ch });
    txt(s, [B('挑战 1　'), R('显示你的名字（拼音）')], { x: rx + 0.2, y, w: rw - 0.4, h: 0.28, size: 12.5, valign: 'middle' });
    y += 0.32;
    y += miniCode(s, 'lcd.print("Li Ming");', { x: rx + 0.2, y, w: rw - 0.4, size: 10.5 }) + 0.06;
    txt(s, '字库里没有汉字，只能写英文字母和符号', { x: rx + 0.2, y, w: rw - 0.4, h: 0.26, size: 11, color: P.muted, valign: 'middle' });
    y += 0.36;
    txt(s, [B('挑战 2　'), R('做个秒表：把 loop() 改成')], { x: rx + 0.2, y, w: rw - 0.4, h: 0.28, size: 12.5, valign: 'middle' });
    y += 0.32;
    y += miniCode(s, 'void loop()\n{\n  lcd.setCursor(0,1);\n  lcd.print(millis()/1000);\n  delay(200);\n}', { x: rx + 0.2, y, w: rw - 0.4, size: 10.5, hl: [2, 3, 4] }) + 0.06;
    txt(s, '第 2 行左边会显示开机后的秒数', { x: rx + 0.2, y, w: rw - 0.4, h: 0.26, size: 11, color: P.muted, valign: 'middle' });
    if (y + 0.26 > G.bottom - 0.04) warn('lcd try card overflow');
  }

  // ================================================================ 29 summary
  deck.section('小结');
  s = slide({
    title: '本节小结',
    desc: '两个模块，一个套路：装库 → #include → 创建对象 → 对象.函数() 下命令',
    notes: '用左边的四步套路把两个实验串起来：以后遇到任何复杂模块，舵机、OLED 屏、温湿度传感器，都是装库、引入、创建对象、下命令。右边四个关键词，请学生各用一句话讲给同桌听。课后思考：能不能把光敏电阻的读数显示在 LCD 上，或者用灯环的颜色表示温度高低？',
  });
  {
    const lw = 4.1;
    txt(s, '一个套路，用遍所有复杂模块', { x: G.L, y: G.top, w: lw, h: 0.32, size: 15, bold: true, valign: 'middle' });
    const chain = [
      [R('装库：工具 → 管理库')],
      [M('#include'), R(' 把库引进来')],
      [R('创建对象：'), M('pixels'), R(' / '), M('lcd')],
      [R('对象.函数() 下命令：'), M('show()'), R('、'), M('print()')],
    ];
    const ly = numList(s, chain, { x: G.L, y: G.top + 0.5, w: lw, size: 13, gap: 0.24, d: 0.32 });
    const ty = Math.max(ly + 0.3, 4.05), th = G.bottom - ty;
    V.card(s, { x: G.L, y: ty, w: lw, h: th, fill: P.turqPale });
    V.iconCircle(s, I.search, { x: G.L + 0.16, y: ty + (th - 0.38) / 2, d: 0.38 });
    txt(s, [B('排错口诀　'), R('编译报错先查库，没反应先查线和地址。')], { x: G.L + 0.66, y: ty, w: lw - 0.8, h: th, size: 12.5, valign: 'middle' });
    if (th < 0.6) warn('summary tip short');
    tileGrid(s, {
      x: 4.85, y: G.top, w: G.R - 4.85, h: G.ch, cols: 2,
      items: [
        { fill: P.turq, big: '#include', bigMono: true, bigSize: 22, title: '库', sub: '别人写好的“扩展包”，\n装一次就能用' },
        { fill: P.gray1, big: 'show()', bigMono: true, bigSize: 22, title: '先写草稿再寄出', sub: 'setPixelColor 只写草稿，\nshow 才发出去' },
        { fill: P.ink, big: '0x27', bigMono: true, bigSize: 22, title: 'I2C 门牌号', sub: '两根线挂多台设备，\n0x27 就是 39' },
        { fill: P.white, big: '(列, 行)', bigSize: 22, title: 'setCursor', titleMono: true, sub: '先列后行，\n都从 0 开始数' },
      ],
    });
  }

  // ================================================================ 30 end
  curTitle = 'end';
  deck.end({
    title: '让作品会发光，也会“说话”',
    subtitle: '灯环显示颜色，液晶屏显示文字——下一步，试着把传感器的读数显示出来。',
    notes: '布置课后任务：把前面学过的一个传感器（光敏、超声波、温湿度任选）的读数显示在 LCD1602 上，或者用灯环的颜色表示读数的高低，下节课分享。',
  });

  await deck.save(OUT);
  console.log('saved', OUT);
  if (warns.length) console.log(`${warns.length} layout warning(s)`);
})().catch((e) => { console.error(e); process.exit(1); });
