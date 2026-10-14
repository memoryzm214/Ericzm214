// 1-2 开关类传感器：按键模块 · 触摸开关模块 · 限位开关模块 · 倾斜开关模块
// Source: assets/l12/guide_text.md (+ guide_raw.txt, PDF 15 pages). Run: node build/12_lesson_1-2.js
const V = require('../lib/vti');
const { P, G } = V;

const OUT = __dirname + '/../output/1-2_按键_触摸_限位_倾斜开关.pptx';

// ------------------------------------------------------------------ programs (copied from guide_text.md; indent unified to 2 spaces,
// runs of alignment spaces before // collapsed — whitespace only)
const BTN_CODE = `int led_out = 11 ; //GPIO 11 LED pin
int keypad_pin = 7; //GPIO 7 key pin
int value;
void setup()
{
  pinMode(led_out,OUTPUT);  // init led pin output
  pinMode(keypad_pin,INPUT);  // init key pin input
  digitalWrite(led_out,LOW);
}
void loop()
{
  value = digitalRead(keypad_pin);  // read key pad pin vaule
  if( value == LOW )
  {
    digitalWrite(led_out,HIGH);  // if key value is down turn on LED

  }
  else
  {
    digitalWrite(led_out,LOW);  // if key value is down turn off LED
  }
}`;

// Guide left this program blank; supplied from the same kit's 《Arduino 编程入门学习教程》第 2.19 讲.
const TOUCH_CODE = `int Led=A5;//定义 LED 接口
int SensorPin=A0;
int val=0;
void setup()
{
  pinMode(Led,OUTPUT);//定义 LED 为输出接口
  pinMode(SensorPin, INPUT);
  Serial.begin(9600);
}
void loop()
{
  val=digitalRead(SensorPin);
  Serial.println(val);
  if(val==1)
  {
    digitalWrite(Led,HIGH);
  }
  else
  {
    digitalWrite(Led,LOW);
  }
}`;

const LIMIT_CODE = `int Led =11; //定义 LED 接口
int SensorPin=10;  //定义限位开关接口
int val=0;//定义数字变量 val
void setup()
{
  pinMode(Led,OUTPUT);//定义 LED 为输出接口
  pinMode(SensorPin,INPUT);//定义限位开关引脚为输出接口
  Serial.begin(9600);
}
void loop()
{
  val=digitalRead(SensorPin);
  Serial.println(val);
  if(val==0)
  {
    digitalWrite(Led,HIGH);
  }
  else
  {
    digitalWrite(Led,LOW);
  }
}`;

const TILT_CODE = `int Led=11;//定义 LED 接口
int Buzzer_pin=13;
int buttonpin=12; //定义倾斜开关传感器接口
int val=0;//定义数字变量 val
void setup()
{
  pinMode(Led,OUTPUT);//定义 LED 为输出接口
  pinMode(Buzzer_pin,OUTPUT);
  pinMode(buttonpin,INPUT);//定义倾斜开关传感器为输出接口
  Serial.begin(9600);
}
void loop()
{
  val=digitalRead(buttonpin);//将数字接口 A5 的值读取赋给 val
  Serial.println(val);
  if(val==0)//当倾斜开关传感器检测有信号时，LED 闪烁
  {
    digitalWrite(Led,HIGH);
    digitalWrite(Buzzer_pin,HIGH);
    // delay(1000);
  }
  else
  {
    digitalWrite(Led,LOW);
    digitalWrite(Buzzer_pin,LOW);
  }
}`;

// ------------------------------------------------------------------ local helpers (lib/vti.js is shared; not edited)
const warns = [];
function warn(msg) { warns.push(msg); console.warn('LAYOUT:', msg); }

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
    if (need > o.h + 0.03) warn(`text may overflow (${need.toFixed(2)} > ${o.h.toFixed(2)}): ${plainOf(t).slice(0, 28)}`);
  }
  V.text(s, t, o);
}

// pptxgenjs mutates run option objects in place, so every run gets its own fresh options object.
const R = (text, opt) => ({ text, options: { ...(opt || {}) } });

// Copy of the code tokenizer in vti.js (not exported) for small inline code chips.
const KW = new Set(['void', 'int', 'float', 'double', 'char', 'long', 'bool', 'byte', 'const', 'unsigned', 'if', 'else', 'for', 'while', 'return', 'true', 'false']);
const FN = new Set(['pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'setup', 'loop', 'Serial', 'begin', 'print', 'println']);
const CONSTS = /^(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|A[0-5]|LED_BUILTIN)$/;
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
    if ((m = rest.match(/^\d+(?:\.\d+)?/))) { push(m[0], 'num'); i += m[0].length; continue; }
    if ((m = rest.match(/^[A-Za-z_]\w*/))) {
      const w = m[0];
      push(w, KW.has(w) ? 'kw' : CONSTS.test(w) ? 'num' : FN.has(w) ? 'fn' : 'base'); i += w.length; continue;
    }
    if ((m = rest.match(/^\s+/))) { push(m[0], out.length ? out[out.length - 1].k : 'base'); i += m[0].length; continue; }
    push(rest[0], 'punct'); i += 1;
  }
  return out;
}

// Small charcoal code chip (no line numbers) for snippets that are not the lesson program itself.
// hl: 0-based indexes of lines to highlight.
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
    const toks = tokenizeLine(ln);
    const runs = toks.map((tk) => R(tk.t, { color: CODE_COL[tk.k], italic: tk.k === 'com' && !/[一-鿿]/.test(tk.t), bold: tk.k === 'kw' || tk.k === 'fn' }));
    s.addText(runs.length ? runs : [R(' ')], {
      x: o.x + padX, y: y0 + i * lh, w: o.w - 2 * padX, h: lh,
      fontFace: V.MONO, fontSize: size, color: CODE_COL.base, margin: 0, valign: 'middle', isTextBox: true, fit: 'none',
    });
    const need = V.monoW(ln, size);
    if (need > o.w - 2 * padX) warn(`miniCode too wide (${need.toFixed(2)} > ${(o.w - 2 * padX).toFixed(2)}): ${ln}`);
  });
  return h;
}

// Straight segment without arrow head.
function seg(s, x1, y1, x2, y2, o = {}) {
  V.arrow(s, x1, y1, x2, y2, { noHead: true, color: o.color || P.ink, width: o.width || 1.5, dash: o.dash });
}
// Polyline; the last segment gets an arrow head when o.head is set.
function polyline(s, pts, o = {}) {
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
    const last = i === pts.length - 1;
    V.arrow(s, x1, y1, x2, y2, { noHead: !(last && o.head), color: o.color || P.ink, width: o.width || 1.5, dash: o.dash });
  }
}

// Mock serial monitor where each output line has a known y (so notes can sit level with it).
function serialMock(s, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.white, line: P.gray2, radius: 0.1 });
  s.addShape('rect', { x: o.x + 0.02, y: o.y + 0.02, w: o.w - 0.04, h: 0.32, fill: { color: P.card }, line: { color: P.card, width: 0 } });
  txt(s, o.title || '串口监视器', { x: o.x + 0.14, y: o.y + 0.04, w: o.w * 0.62, h: 0.28, size: 10, bold: true, valign: 'middle' });
  V.text(s, `${o.baud || 9600} 波特率`, { x: o.x + o.w / 2, y: o.y + 0.04, w: o.w / 2 - 0.14, h: 0.28, size: 10, color: P.muted, align: 'right', valign: 'middle' });
  const size = o.size || 11;
  const lh = o.lh || size * 1.45 / 72;
  const y0 = o.y + 0.44;
  o.lines.forEach((ln, i) => {
    V.text(s, ln, { x: o.x + 0.2, y: y0 + i * lh, w: 0.5, h: lh, size, mono: true, valign: 'middle' });
  });
  (o.annots || []).forEach((a) => {
    V.text(s, a.text, { x: o.x + o.annX, y: y0 + a.i * lh, w: o.w - o.annX - 0.1, h: lh, size: a.size || 11, bold: true, color: P.turqDeep, valign: 'middle' });
    if (V.textW(a.text, a.size || 11) > o.w - o.annX - 0.1) warn('serial annotation too wide: ' + a.text);
  });
  if (y0 + o.lines.length * lh > o.y + o.h - 0.04) warn('serialMock lines overflow');
}

// Light-gray card with an icon circle and a title row. Returns the y where body content may start.
function iconCard(s, ic, title, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill, line: o.line, lineW: o.lineW });
  const d = o.d || 0.42;
  V.iconCircle(s, ic, { x: o.x + 0.2, y: o.y + 0.17, d, fill: o.iconFill });
  txt(s, title, { x: o.x + 0.2 + d + 0.14, y: o.y + 0.17, w: o.w - d - 0.54, h: d, size: o.titleSize || 15, bold: true, valign: 'middle', mono: o.mono, color: o.titleColor });
  return o.y + 0.17 + d + 0.12;
}

// Red-outlined "problem" card: red icon left, red title, explanation under the title.
function warnRow(s, ic, title, body, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.white, line: P.red, lineW: 1 });
  const d = 0.32, pad = 0.13;
  V.iconCircle(s, ic, { x: o.x + pad, y: o.y + pad, d, fill: P.red });
  const tx = o.x + pad + d + 0.14, tw = o.x + o.w - pad - tx;
  txt(s, title, { x: tx, y: o.y + pad, w: tw, h: d, size: o.titleSize || 13, bold: true, color: P.red, valign: 'middle', mono: o.mono });
  const by = o.y + pad + d + 0.06;
  txt(s, body, { x: tx, y: by, w: tw, h: o.y + o.h - pad + 0.06 - by, size: o.size || 12 });
}

// One-line red-outlined warning strip.
function warnLine(s, ic, runs, o) {
  const h = o.h || 0.44;
  V.card(s, { x: o.x, y: o.y, w: o.w, h, fill: P.white, line: P.red, lineW: 1 });
  const d = 0.28;
  V.iconCircle(s, ic, { x: o.x + 0.12, y: o.y + (h - d) / 2, d, fill: P.red });
  txt(s, runs, { x: o.x + 0.12 + d + 0.12, y: o.y, w: o.w - d - 0.36, h, size: o.size || 12, valign: 'middle' });
}

// Card with a "组件清单" title and wrapping white pills.
function partsCard(s, items, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill });
  const size = o.size || 11.5, ph = 0.3, pad = 0.18;
  let px = o.x + pad, py;
  if (o.inline) {
    const lw = V.textW(o.title || '组件', 13) + 0.2;
    txt(s, o.title || '组件', { x: o.x + pad, y: o.y, w: lw, h: o.h, size: 13, bold: true, valign: 'middle' });
    px = o.x + pad + lw; py = o.y + (o.h - ph) / 2;
    const x0 = px;
    for (const it of items) {
      const pw = V.textW(it, size) + 0.24;
      V.pill(s, { x: px, y: py, w: pw, h: ph, text: it, size, fill: P.white, line: P.gray2, color: P.ink, bold: false });
      px += pw + 0.08;
    }
    if (px - 0.08 > o.x + o.w - pad + 0.02) warn(`parts strip overflow ${(px - x0).toFixed(2)}`);
    return;
  }
  txt(s, o.title || '组件清单', { x: o.x + pad, y: o.y + 0.12, w: o.w - 2 * pad, h: 0.3, size: 13, bold: true, valign: 'middle' });
  py = o.y + 0.47;
  for (const it of items) {
    const pw = V.textW(it, size) + 0.24;
    if (px + pw > o.x + o.w - pad) { px = o.x + pad; py += ph + 0.09; }
    V.pill(s, { x: px, y: py, w: pw, h: ph, text: it, size, fill: P.white, line: P.gray2, color: P.ink, bold: false });
    px += pw + 0.08;
  }
  if (py + ph > o.y + o.h - 0.05) warn('parts card overflow');
}

// Numbered list (number circles + text). Returns bottom y.
function numList(s, items, o) {
  const size = o.size || 13, d = o.d || 0.3, gap = o.gap ?? 0.16;
  let y = o.y;
  items.forEach((t, i) => {
    const tw = o.w - d - 0.14;
    const th = hOf(plainOf(t), tw, size, 1.25);
    const rowH = Math.max(d, th);
    V.numCircle(s, i + 1, { x: o.x, y, d, size: 11 });
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

// Rounded box with centred label(s).
function fbox(s, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill || P.card, line: o.line, radius: o.radius ?? 0.08 });
  const dark = o.fill === P.ink;
  txt(s, o.text, { x: o.x + 0.06, y: o.y, w: o.w - 0.12, h: o.h, size: o.size || 12.5, bold: o.bold ?? true, align: 'center', valign: 'middle', color: dark ? P.white : P.ink, mono: o.mono, lineSpacingMultiple: 1.1 });
}

// Small tag + quoted text card (used for "two descriptions in the guide").
function quoteCard(s, tag, body, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill || P.card });
  const tw = V.textW(tag, 10) + 0.24;
  V.pill(s, { x: o.x + 0.16, y: o.y + 0.13, w: tw, h: 0.24, text: tag, size: 10, fill: o.tagFill || P.gray2, color: P.ink });
  txt(s, body, { x: o.x + 0.16, y: o.y + 0.44, w: o.w - 0.32, h: o.h - 0.5, size: o.size || 12.5 });
}

// CJK-aware mirror of vti.codeBlock's sizing so two side-by-side blocks can share one font size.
function isWide(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x2E80 && c <= 0x9FFF) || (c >= 0xF900 && c <= 0xFAFF) || (c >= 0xFF00 && c <= 0xFF60) ||
    (c >= 0x3000 && c <= 0x303F) || (c >= 0xFE30 && c <= 0xFE4F) || c === 0x2014 || c === 0x2026 ||
    (c >= 0x2018 && c <= 0x201D) || (c >= 0x2460 && c <= 0x24FF) || (c >= 0x25A0 && c <= 0x25FF);
}
function colsOf(str) { let n = 0; for (const ch of str) n += isWide(ch) ? 2 : 1; return n; }
function fitPrefix(str, max) { let n = 0, i = 0; for (const ch of str) { n += isWide(ch) ? 2 : 1; if (n > max) break; i += ch.length; } return i; }
function wrapRows(line, max) {
  if (colsOf(line) <= max) return 1;
  const indent = (line.match(/^\s*/)[0].length) + 2;
  let cur = line, n = 0;
  while (colsOf(cur) > max) {
    const fit = fitPrefix(cur, max);
    let cut = cur.lastIndexOf(' ', fit);
    if (cut <= indent + 4) cut = fit;
    n++;
    cur = ' '.repeat(indent) + cur.slice(cut).replace(/^\s+/, '');
  }
  return n + 1;
}
function fitCodeSize(code, from, to, w, h, start = 11.5) {
  const all = code.replace(/\t/g, '    ').replace(/\s+$/, '').split('\n');
  const innerH = h - 0.34 - 0.12;
  const digits = String(to).length;
  for (let size = start; size >= 9.5; size -= 0.5) {
    const lh = size * 1.36 / 72, charW = size * 0.602 / 72;
    const gutter = (digits + 1.6) * charW;
    const max = Math.floor((w - 0.28 - gutter) / charW);
    let rows = 0;
    for (let n = from; n <= to; n++) rows += wrapRows(all[n - 1] ?? '', max);
    if (rows * lh <= innerH + 0.001) return size;
  }
  throw new Error(`fitCodeSize: ${from}-${to} does not fit`);
}

// Module output stage drawn as a schematic: pull-up resistor from 5V to the signal pin, switch to GND.
function pullupPanel(s, o) {
  const { x, w, closed } = o, y = G.top, h = G.ch;
  V.card(s, { x, y, w, h, fill: closed ? P.turqPale : P.card });
  txt(s, o.title, { x: x + 0.2, y: y + 0.14, w: w - 0.4, h: 0.32, size: 13.5, bold: true, valign: 'middle' });
  const cx = x + 0.78;
  const hot = closed ? P.turqDeep : P.ink;
  V.text(s, '5V', { x: cx - 0.35, y: y + 0.55, w: 0.7, h: 0.24, size: 11, bold: true, mono: true, align: 'center', valign: 'middle' });
  seg(s, cx - 0.16, y + 0.82, cx + 0.16, y + 0.82, { width: 2 });
  seg(s, cx, y + 0.82, cx, y + 0.98);
  s.addShape('rect', { x: cx - 0.1, y: y + 0.98, w: 0.2, h: 0.5, fill: { color: P.white }, line: { color: P.ink, width: 1.25 } });
  V.text(s, '上拉\n电阻', { x: x + 0.08, y: y + 1.0, w: cx - 0.2 - (x + 0.08), h: 0.46, size: 10, color: P.muted, align: 'right', valign: 'middle', lineSpacingMultiple: 1.0 });
  seg(s, cx, y + 1.48, cx, y + 1.72);
  s.addShape('ellipse', { x: cx - 0.055, y: y + 1.665, w: 0.11, h: 0.11, fill: { color: P.ink }, line: { color: P.ink, width: 0 } });
  V.arrow(s, cx, y + 1.72, cx + 0.62, y + 1.72, { color: P.ink, width: 1.5 });
  V.text(s, o.outName, { x: cx + 0.08, y: y + 1.46, w: 0.55, h: 0.22, size: 10, bold: true, mono: true, valign: 'middle' });
  txt(s, o.pin, { x: cx + 0.68, y: y + 1.6, w: x + w - 0.08 - (cx + 0.68), h: 0.24, size: 11, bold: true, valign: 'middle' });
  // switch
  seg(s, cx, y + 1.72, cx, y + 1.98, { color: hot });
  s.addShape('ellipse', { x: cx - 0.04, y: y + 1.94, w: 0.08, h: 0.08, fill: { color: hot }, line: { color: hot, width: 0 } });
  s.addShape('ellipse', { x: cx - 0.04, y: y + 2.42, w: 0.08, h: 0.08, fill: { color: hot }, line: { color: hot, width: 0 } });
  if (closed) seg(s, cx, y + 2.46, cx, y + 1.98, { color: hot, width: 2.5 });
  else seg(s, cx, y + 2.46, cx + 0.3, y + 2.06, { width: 2.5 });
  V.text(s, o.sw, { x: x + 0.08, y: y + 2.1, w: cx - 0.2 - (x + 0.08), h: 0.24, size: 10, color: P.muted, align: 'right', valign: 'middle' });
  if (closed && o.icon) V.iconCircle(s, o.icon, { x: cx + 0.34, y: y + 2.02, d: 0.38 });
  seg(s, cx, y + 2.46, cx, y + 2.72, { color: hot });
  seg(s, cx - 0.2, y + 2.72, cx + 0.2, y + 2.72, { width: 2, color: hot });
  seg(s, cx - 0.13, y + 2.8, cx + 0.13, y + 2.8, { width: 2, color: hot });
  seg(s, cx - 0.06, y + 2.88, cx + 0.06, y + 2.88, { width: 2, color: hot });
  V.text(s, 'GND', { x: cx + 0.28, y: y + 2.68, w: 0.6, h: 0.22, size: 10, bold: true, mono: true, valign: 'middle' });
  V.card(s, { x: x + 0.14, y: y + 3.06, w: w - 0.28, h: 0.44, fill: closed ? P.turq : P.white, line: closed ? undefined : P.gray2, radius: 0.22 });
  txt(s, o.result, { x: x + 0.14, y: y + 3.06, w: w - 0.28, h: 0.44, size: 12, bold: true, align: 'center', valign: 'middle' });
}

// Ball tilt switch drawn as a tilted glass tube: pins on the left end, cap on the right end.
// ang: degrees, clockwise positive (negative = left/pin end lower). ball: 'pins' | 'cap'.
function tiltTube(s, o) {
  const { cx, cy, L, H } = o;
  const a = o.ang * Math.PI / 180;
  const ux = Math.cos(a), uy = Math.sin(a);       // axis (towards cap end)
  const nx = -uy, ny = ux;                        // perpendicular
  // horizontal reference
  seg(s, cx - L / 2 - 0.3, cy, cx + L / 2 + 0.1, cy, { color: P.faint, width: 0.75, dash: 'dash' });
  // pins (drawn first so the tube covers their inner part)
  const ex = cx - ux * L / 2, ey = cy - uy * L / 2;
  for (const k of [-0.07, 0.07]) {
    const sx = ex + nx * k + ux * 0.16, sy = ey + ny * k + uy * 0.16;
    const tx = ex + nx * k - ux * 0.34, ty = ey + ny * k - uy * 0.34;
    seg(s, sx, sy, tx, ty, { color: 'B8860B', width: 2.25 });
  }
  s.addShape('roundRect', {
    x: cx - L / 2, y: cy - H / 2, w: L, h: H, rectRadius: 0.08, rotate: (o.ang + 360) % 360,
    fill: { color: P.white, transparency: 15 }, line: { color: P.ink, width: 1.25 },
  });
  const capX = cx + ux * L / 2, capY = cy + uy * L / 2;
  // ball
  const d = H * 0.72;
  const off = (L / 2 - d / 2 - 0.08) * (o.ball === 'pins' ? -1 : 1);
  const bx = cx + ux * off, by = cy + uy * off;
  s.addShape('ellipse', { x: bx - d / 2, y: by - d / 2, w: d, h: d, fill: { color: o.ball === 'pins' ? P.turq : P.faint }, line: { color: P.ink, width: 1 } });
  // labels
  const tipX = ex - ux * 0.34, tipY = ey - uy * 0.34;
  V.text(s, '引脚', { x: tipX - 0.22, y: tipY + (o.ang < 0 ? 0.06 : -0.32), w: 0.5, h: 0.24, size: 10, color: P.muted, align: 'center', valign: 'middle' });
  V.text(s, '帽盖', { x: capX - 0.25, y: capY + (o.ang < 0 ? -0.44 : 0.2), w: 0.5, h: 0.24, size: 10, color: P.muted, align: 'center', valign: 'middle' });
}

// ------------------------------------------------------------------ build
(async () => {
  const deck = await V.Deck.create({ label: '1-2　开关类传感器', title: '1-2 开关类传感器：按键 · 触摸开关 · 限位开关 · 倾斜开关' });
  const I = await deck.loadIcons({
    bulb: 'FaLightbulb', warn: 'FaExclamation', check: 'FaCheck', times: 'FaTimes', chip: 'FaMicrochip', grid: 'FaTh',
    usb: 'TbDeviceUsb', cable: 'MdCable', volume: 'FaVolumeUp', bell: 'FaBell', search: 'FaSearch', wrench: 'FaWrench',
    eye: 'FaEye', redo: 'FaRedo', branch: 'FaCodeBranch', target: 'FaBullseye', book: 'FaBook', comments: 'FaComments',
    bolt: 'FaBolt', toggle: 'FaToggleOn', plug: 'FaPlug', puzzle: 'FaPuzzlePiece', hand: 'FaHandPointer', finger: 'FaFingerprint',
    link: 'FaLink', terminal: 'FaTerminal', question: 'FaQuestion', shield: 'FaShieldAlt', mobile: 'FaMobileAlt',
    note: 'FaRegStickyNote', layer: 'FaLayerGroup', route: 'FaRoute', stop: 'FaStopCircle', bullhorn: 'FaBullhorn',
    cogs: 'FaCogs', listen: 'FaAssistiveListeningSystems', exchange: 'FaExchangeAlt', eyeslash: 'FaEyeSlash', compass: 'FaCompass',
    power: 'FaPowerOff', magic: 'FaMagic', pen: 'FaPencilAlt', clip: 'FaClipboardList', random: 'FaRandom', box: 'FaBox',
  });

  const slide = (o) => {
    if (/[。.]$/.test(o.title)) throw new Error('title ends with a period: ' + o.title);
    if (V.textW(o.title, 24) > 8.8) warn(`title long: ${o.title}`);
    if (V.textW(o.desc, 12) > 8.9) warn(`desc long (${V.textW(o.desc, 12).toFixed(2)}): ${o.desc}`);
    if (!o.notes) throw new Error('notes missing: ' + o.title);
    return deck.slide(o);
  };

  // Two code blocks side by side (shared font size), each with its notes underneath.
  function codePair(s, o) {
    const size = Math.min(fitCodeSize(o.code, o.a.from, o.a.to, o.a.w, o.h), fitCodeSize(o.code, o.b.from, o.b.to, o.b.w, o.h));
    const xb = G.L + o.a.w + 0.3;
    for (const [c, x] of [[o.a, G.L], [o.b, xb]]) {
      V.codeBlock(s, { x, y: G.top, w: c.w, h: o.h, size, code: o.code, from: c.from, to: c.to, hl: c.hl, file: o.file, right: `第 ${c.from}–${c.to} 行` });
      V.explain(s, null, { x, y: G.top + o.h + 0.2, w: c.w, maxY: G.bottom, items: c.notes, gap: 0.12 });
    }
  }

  // ================================================================ 1 cover
  deck.cover({
    kicker: '开源硬件与 AI 辅助编程　/　实验 1-2',
    title: '1-2　开关类传感器',
    subtitle: '按键 · 触摸开关 · 限位开关 · 倾斜开关',
    notes: '这节课按指南顺序做四个实验：按键、触摸开关、限位开关、倾斜开关。它们都是“开关类”传感器，只回答“是”或“不是”，正好用来学习数字输入。开场可以问学生：电梯按钮、台灯的触摸开关、3D 打印机走到头会停，这些“感觉”是怎么交给程序的？',
  });

  // ================================================================ 2 overview
  deck.section('导入');
  let s = slide({
    title: '本节导览',
    desc: '四个开关类传感器，一条主线：用 digitalRead() 让 Arduino “听”外面的动静，再决定灯亮不亮',
    notes: '按指南顺序介绍四个实验，每张卡片下面写着“触发时读到几”，这是整节课最重要的线索：有的按下是 0，有的摸到是 1。下面一排是四个程序共用的骨架：读、打印、判断、输出。后两个实验的程序和第一个几乎一样，只是换了传感器，学会第一个，后面就轻松了。',
  });
  {
    const n = 4, gap = 0.3, cw = (G.cw - gap * (n - 1)) / n, ch = 2.3, y = G.top;
    const ex = [
      { ic: I.hand, k: '实验 01', t: '按键模块', trig: [R('按下 → 读到 '), R('0', { bold: true })], syn: 'digitalRead()\nif / else · ==' },
      { ic: I.finger, k: '实验 02', t: '触摸开关模块', trig: [R('摸到 → 读到 '), R('1', { bold: true })], syn: 'Serial.println()\nA0～A5 当数字口' },
      { ic: I.stop, k: '实验 03', t: '限位开关模块', trig: [R('压下 → 读到 '), R('0', { bold: true })], syn: '程序骨架\n和实验 01 一样' },
      { ic: I.compass, k: '实验 04', t: '倾斜开关模块', trig: [R('读到 '), R('0', { bold: true }), R(' → 报警')], syn: '一个 if\n管两个输出' },
    ];
    ex.forEach((e, i) => {
      const x = G.L + i * (cw + gap);
      V.card(s, { x, y, w: cw, h: ch, fill: i === 0 ? P.turqPale : P.card });
      V.iconCircle(s, e.ic, { x: x + 0.18, y: y + 0.18, d: 0.5 });
      txt(s, e.k, { x: x + 0.8, y: y + 0.18, w: cw - 0.95, h: 0.5, size: 11, color: P.muted, valign: 'middle' });
      txt(s, e.t, { x: x + 0.18, y: y + 0.84, w: cw - 0.3, h: 0.36, size: 15, bold: true, valign: 'middle' });
      V.card(s, { x: x + 0.18, y: y + 1.3, w: cw - 0.36, h: 0.36, fill: P.white, line: P.gray2, radius: 0.18 });
      txt(s, e.trig, { x: x + 0.18, y: y + 1.3, w: cw - 0.36, h: 0.36, size: 12.5, align: 'center', valign: 'middle' });
      txt(s, e.syn, { x: x + 0.18, y: y + 1.76, w: cw - 0.3, h: 0.44, size: 12, color: P.muted });
    });
    const ly = y + ch + 0.3;
    txt(s, '四个程序共用一个骨架', { x: G.L, y: ly, w: 4, h: 0.28, size: 13, bold: true, valign: 'middle' });
    const by = ly + 0.36, bh = G.bottom - by, bgap = 0.35, bw = (G.cw - bgap * 3) / 4;
    const st = [['读', 'digitalRead()'], ['打印', 'Serial.println()'], ['判断', 'if … else'], ['输出', 'digitalWrite()']];
    st.forEach(([t, c], i) => {
      const x = G.L + i * (bw + bgap);
      V.card(s, { x, y: by, w: bw, h: bh, fill: i === 2 ? P.ink : P.white, line: i === 2 ? undefined : P.gray2 });
      txt(s, [R(`${i + 1}  ${t}`, { bold: true, breakLine: true, color: i === 2 ? P.turq : P.ink }), R(c, { fontFace: V.MONO })], { x: x + 0.16, y: by, w: bw - 0.24, h: bh, size: 11.5, valign: 'middle', color: i === 2 ? P.white : P.ink, lineSpacingMultiple: 1.05 });
      if (i < 3) V.arrow(s, x + bw + 0.05, by + bh / 2, x + bw + bgap - 0.05, by + bh / 2, { color: P.muted });
    });
  }

  // ================================================================ EXPERIMENT 1: button
  deck.section('实验一　按键模块');
  deck.divider({
    kicker: '实验 01',
    title: '按键模块实验',
    desc: '以前的 LED 实验只用了引脚的“输出”功能。这一次反过来，让 Arduino 读取按键的状态：按下按键，LED 亮；松开，LED 灭。',
    tiles: [
      { fill: P.turq, big: '01', title: '原理', sub: '按下 = 低电平' },
      { fill: P.gray1, big: '02', title: '接线', sub: '按键 → D7，LED → D11' },
      { fill: P.ink, big: '03', title: '代码', sub: 'digitalRead · if / else' },
      { fill: P.white, big: '04', title: '结果', sub: '按下就亮，松开就灭' },
    ],
    notes: '第一个实验最重要，新语法都在这里学：pinMode 设成输入、digitalRead 读取、if / else 做判断。先认识按键模块，再弄清“按下为什么是低电平”，然后接线、读代码、看结果。',
  });

  // ---------------------------------------------------------------- intro + purpose + parts
  s = slide({
    title: '认识按键模块：从“输出”到“输入”',
    desc: '引脚既能“说”（OUTPUT 输出），也能“听”（INPUT 输入）；这次用按键做输入、LED 做输出',
    notes: '数字 I/O 口就是“输入 / 输出”口。之前点 LED 只用了输出，这节课第一次用输入：从外部元件读回一个值。请学生看模块反面的丝印“按下输出低电平”，下一页会解释为什么。D0、D1 兼做串口，上传程序时要和电脑通信，所以按键和灯都不接在这两个脚上。',
  });
  {
    const lw = 4.6, ph = 2.6;
    V.imageBox(s, { file: 'l12/btn_module_photo.jpg', x: G.L, y: G.top, w: lw, h: ph, pad: 0.06, caption: '原指南：按键开关模块正面 / 反面（反面印着“按下输出低电平”）' });
    const by = G.top + ph + 0.3, bh = G.bottom - by, bw = (lw - 0.3) / 2;
    const io = [
      { fill: P.ink, k: 'OUTPUT　输出', d: '以前：点亮 LED', ic: I.bulb_w },
      { fill: P.turq, k: 'INPUT　输入', d: '这次：读取按键', ic: I.listen },
    ];
    io.forEach((c, i) => {
      const x = G.L + i * (bw + 0.3);
      const dark = c.fill === P.ink;
      V.card(s, { x, y: by, w: bw, h: bh, fill: c.fill });
      V.iconCircle(s, c.ic, { x: x + 0.14, y: by + (bh - 0.36) / 2, d: 0.36, fill: dark ? '474747' : P.white });
      txt(s, c.k, { x: x + 0.6, y: by + 0.1, w: bw - 0.68, h: 0.28, size: 12.5, bold: true, color: dark ? P.turq : P.ink, valign: 'middle' });
      txt(s, c.d, { x: x + 0.6, y: by + 0.42, w: bw - 0.68, h: 0.28, size: 12, color: dark ? P.white : P.ink, valign: 'middle' });
    });
    const rx = G.L + lw + 0.35, rw = G.R - rx;
    let y = lead(s, '实验目的', '按键接 D7，LED 接 D11：\n按下按键 LED 亮，松开 LED 灭。', { x: rx, y: G.top, w: rw, size: 13, leadSize: 14 }) + 0.15;
    const th = 1.05;
    V.tip(s, { x: rx, y, w: rw, h: th, kind: 'tip', title: '为什么不用 D0、D1？', text: 'D0、D1 兼做串口，上传程序时要和电脑通信，所以先空着。', size: 12 }, I.question);
    y += th + 0.3;
    partsCard(s, ['Arduino Uno 主板', '面包板', 'USB 数据线', '按键 ×1', 'LED 灯模块 ×1', '若干跳线'], { x: rx, y, w: rw, h: G.bottom - y });
  }

  // ---------------------------------------------------------------- principle (pull-up)
  s = slide({
    title: '实验原理：按下按键 = 低电平',
    desc: '模块里有个上拉电阻：松开时 S 脚是高电平（1）；按下时 S 脚被接到 GND，变成低电平（0）',
    notes: '用左边两幅简图讲“低电平有效”：上拉电阻像一根弹簧，平时把 S 脚拉在 5V，所以读到 1；按下按键，S 脚直接接到 GND，读到 0。原指南的文字把这件事说反了，以模块丝印和程序为准。不要求学生会画电路，只要记住：这块按键模块按下 = 0。',
  });
  {
    const pw = 2.1;
    pullupPanel(s, { x: G.L, w: pw, closed: false, title: '① 松开按键', result: 'S 约 5V → 读到 1', outName: 'S', pin: 'D7', sw: '按键' });
    pullupPanel(s, { x: G.L + pw + 0.3, w: pw, closed: true, title: '② 按下按键', result: 'S 约 0V → 读到 0', outName: 'S', pin: 'D7', sw: '按键', icon: I.hand });
    const rx = G.L + 2 * pw + 0.65, rw = G.R - rx;
    let y = lead(s, '为什么“按下”反而是 0？', '模块里有个电阻把 S 脚接到 5V（上拉）：松开时 S 是高电平；按下时 S 直接接到 GND，变成低电平。', { x: rx, y: G.top, w: rw, size: 12.5, leadSize: 14 }) + 0.2;
    V.table(s, [
      ['按键', 'S 脚电压', 'digitalRead', 'LED'],
      ['松开', '约 5V', { text: '1（HIGH）', bold: true }, '灭'],
      ['按下', '约 0V', { text: '0（LOW）', bold: true }, '亮'],
    ], { x: rx, y, w: rw, colW: [0.7, 1.05, 1.5, rw - 3.25], rowH: 0.34, size: 12, align: ['center', 'center', 'center', 'center'] });
    y += 1.02 + 0.3;
    V.tip(s, { x: rx, y, w: rw, h: G.bottom - y, kind: 'note', title: '原指南此处写反了', text: '原文说“按下时 D7 是高电平”，与丝印和程序都不符。以程序为准：按下 → LOW → 灯亮。', size: 12 }, I.book);
    if (G.bottom - y < 1.2) warn('btn principle note short');
  }

  // ---------------------------------------------------------------- wiring
  s = slide({
    title: '接线：按键接 D7，LED 接 D11',
    desc: '按键模块的 S、G、V 分别接 7、GND、5V；LED 正极接 11，负极接 GND',
    notes: '照原指南两张表接线，先拔掉 USB。按键模块三根针的顺序是 S、V、G，对着模块上的丝印插，别插反。接线图里的 LED 插在面包板上，并在 11 号脚和 LED 之间串了一个电阻限流；如果用的是 LED 模块，模块上已经带了电阻，直接接 + 和 − 就行。',
  });
  {
    const iw = 5.0;
    V.imageBox(s, { file: 'l12/btn_wiring.jpg', x: G.L, y: G.top, w: iw, h: G.ch, diagram: true, caption: '原指南接线图：绿线 7 → S · 红线 5V → V · 黑线 GND → G' });
    const rx = G.L + iw + 0.35, rw = G.R - rx;
    let y = V.wiring(s, { x: rx, y: G.top, w: rw, left: 'Arduino Uno', right: '按键模块', rows: [['7', 'S'], ['GND', 'G'], ['5V', 'V']], rowH: 0.3 }) + 0.3;
    y = V.wiring(s, { x: rx, y, w: rw, left: 'Arduino Uno', right: 'LED 灯', rows: [['11', '+'], ['GND', '−']], rowH: 0.3 }) + 0.3;
    V.tip(s, { x: rx, y, w: rw, h: G.bottom - y, kind: 'tip', text: '图中 LED 插在面包板上，还串了一个电阻；换成 LED 模块时，直接接模块的正、负极即可。', size: 12 }, I.search);
    if (G.bottom - y < 0.95) warn('btn wiring tip short');
  }

  // ---------------------------------------------------------------- syntax 1: pinMode INPUT + digitalRead
  s = slide({
    title: '新语法①：pinMode(INPUT) 与 digitalRead()',
    desc: 'pinMode 先说好哪个引脚当“耳朵”，digitalRead 再去听：答案只有 HIGH（1）和 LOW（0）',
    notes: '类比：引脚像人，OUTPUT 是嘴巴，用 digitalWrite 往外说；INPUT 是耳朵，用 digitalRead 听外面的动静。digitalRead 只有两个答案，HIGH 也可以写成 1，LOW 也可以写成 0，这两种写法后面四个实验都会见到。最容易混淆的是：它回答的是电平高低，不是“按下 / 松开”，按下对应哪一个要看模块。',
  });
  {
    const w = (G.cw - 0.35) / 2;
    // card A: pinMode
    let x = G.L;
    let y = iconCard(s, I.listen, '耳朵和嘴巴', { x, y: G.top, w, h: G.ch });
    const ta = '引脚像人：OUTPUT 是“嘴巴”，往外说；INPUT 是“耳朵”，听外面的动静。';
    const ha = hOf(ta, w - 0.4, 12.5, 1.25);
    txt(s, ta, { x: x + 0.2, y, w: w - 0.4, h: ha, size: 12.5 });
    y += ha + 0.12;
    y += miniCode(s, 'pinMode(11, OUTPUT);  // 11 号当嘴巴\npinMode(7, INPUT);    // 7 号当耳朵', { x: x + 0.2, y, w: w - 0.4, size: 10.5 }) + 0.16;
    const mw = (w - 0.4 - 0.2) / 2, mh = 0.62;
    [['嘴巴：OUTPUT', 'digitalWrite()', P.white], ['耳朵：INPUT', 'digitalRead()', P.turqPale]].forEach(([t, c, f], i) => {
      const mx = x + 0.2 + i * (mw + 0.2);
      V.card(s, { x: mx, y, w: mw, h: mh, fill: f, line: P.gray2 });
      txt(s, [R(t, { bold: true, breakLine: true }), R(c, { fontFace: V.MONO })], { x: mx + 0.14, y, w: mw - 0.2, h: mh, size: 11.5, valign: 'middle' });
    });
    y += mh + 0.2;
    warnLine(s, I.times_w, [R('把按键脚设成 OUTPUT', { bold: true, color: P.red }), R(' → 读不到按键')], { x: x + 0.2, y, w: w - 0.4 });
    if (y + 0.44 > G.bottom - 0.1) warn('syntax1 card A overflow');
    // card B: digitalRead
    x = G.L + w + 0.35;
    y = iconCard(s, I.toggle, 'digitalRead(引脚)', { x, y: G.top, w, h: G.ch, mono: true, titleSize: 14 });
    y += miniCode(s, 'value = digitalRead(7);  // 听一次', { x: x + 0.2, y, w: w - 0.4, size: 11 }) + 0.14;
    txt(s, '像问一句“现在是高还是低？”答案只有两个：', { x: x + 0.2, y, w: w - 0.4, h: 0.3, size: 12.5, valign: 'middle' });
    y += 0.36;
    V.table(s, [
      ['答案', '也可以写成', '电压'],
      [{ text: 'HIGH', bold: true }, '1', '约 5V'],
      [{ text: 'LOW', bold: true }, '0', '约 0V'],
    ], { x: x + 0.2, y, w: w - 0.4, colW: [1.25, 1.35, w - 0.4 - 2.6], rowH: 0.28, size: 12, monoCols: [0, 1], align: ['center', 'center', 'center'] });
    y += 0.84 + 0.2;
    warnRow(s, I.times_w, '以为 HIGH 就是“按下”', '这块按键模块按下时反而是 LOW。', { x: x + 0.2, y, w: w - 0.4, h: G.bottom - 0.16 - y });
    if (G.bottom - 0.16 - y < 0.82) warn('syntax1 card B warn short');
  }

  // ---------------------------------------------------------------- syntax 2: if / else, == vs =
  s = slide({
    title: '新语法②：if / else 与 ==',
    desc: 'if / else 是程序里的岔路口：条件成立走一条路，不成立走另一条；比较“相等”要写两个等号 ==',
    notes: '用“岔路口”类比 if / else：条件成立走 if 的路，不成立走 else 的路，两条只走一条。重点强调 == 和 = 的区别，这是初学者最常犯的错：写成 if( value = LOW ) 也能编译通过，但它把 LOW 放进了 value，条件永远不成立，按了灯也不亮。',
  });
  {
    const lw = 4.5, lx = G.L;
    V.card(s, { x: lx, y: G.top, w: lw, h: G.ch });
    V.iconCircle(s, I.branch, { x: lx + 0.2, y: G.top + 0.18, d: 0.42 });
    txt(s, '像走到岔路口看路牌', { x: lx + 0.76, y: G.top + 0.18, w: lw - 0.9, h: 0.42, size: 15, bold: true, valign: 'middle' });
    txt(s, '路牌上写着条件：成立就走左边，不成立就走右边，两条路只能选一条。', { x: lx + 0.2, y: G.top + 0.72, w: lw - 0.4, h: 0.5, size: 12.5 });
    const dcx = lx + lw / 2, dw = 2.2, dh = 0.78, dy = G.top + 1.32;
    s.addShape('diamond', { x: dcx - dw / 2, y: dy, w: dw, h: dh, fill: { color: P.white }, line: { color: P.ink, width: 1.25 } });
    V.text(s, 'value == LOW ?', { x: dcx - dw / 2, y: dy, w: dw, h: dh, size: 11.5, bold: true, mono: true, align: 'center', valign: 'middle' });
    const bw = 1.55, bh = 0.62, by = dy + dh + 0.34;
    const lbx = lx + 0.25, rbx = lx + lw - 0.25 - bw;
    polyline(s, [[dcx - dw / 2, dy + dh / 2], [lbx + bw / 2, dy + dh / 2], [lbx + bw / 2, by]], { head: true, color: P.ink, width: 1.5 });
    polyline(s, [[dcx + dw / 2, dy + dh / 2], [rbx + bw / 2, dy + dh / 2], [rbx + bw / 2, by]], { head: true, color: P.ink, width: 1.5 });
    txt(s, '成立', { x: lbx + bw / 2 - 0.66, y: dy + dh / 2 + 0.08, w: 0.58, h: 0.26, size: 11, bold: true, align: 'right', valign: 'middle' });
    txt(s, '不成立', { x: rbx + bw / 2 + 0.08, y: dy + dh / 2 + 0.08, w: 0.7, h: 0.26, size: 11, bold: true, valign: 'middle' });
    fbox(s, { x: lbx, y: by, w: bw, h: bh, fill: P.turq, text: 'if 里的代码\nLED 亮', size: 11.5 });
    fbox(s, { x: rbx, y: by, w: bw, h: bh, fill: P.gray1, text: 'else 里的代码\nLED 灭', size: 11.5 });
    txt(s, 'else 可以不写：不写就是“不成立时什么也不做”。', { x: lx + 0.2, y: by + bh + 0.16, w: lw - 0.4, h: 0.28, size: 12, color: P.muted, valign: 'middle' });
    if (by + bh + 0.44 > G.bottom - 0.06) warn('fork overflow');
    const rx = lx + lw + 0.35, rw = G.R - rx;
    txt(s, '写法', { x: rx, y: G.top, w: rw, h: 0.28, size: 13, bold: true, valign: 'middle' });
    const mh = miniCode(s, 'if (条件) {\n  // 条件成立：做这里\n} else {\n  // 不成立：做这里\n}', { x: rx, y: G.top + 0.36, w: rw, size: 11 });
    // == vs = : two stacked full-width cards so each explanation fits on one line
    const cy = G.top + 0.36 + mh + 0.3, chh = (G.bottom - cy - 0.3) / 2;
    const CMP = [
      { ok: true, sym: '==', t: '两个等号是“比较”', d: '问：value 等于 LOW 吗？答：是 / 不是' },
      { ok: false, sym: '=', t: '一个等号是“赋值”', d: '把 LOW 存进 value，条件永远不成立' },
    ];
    CMP.forEach((c, i) => {
      const y = cy + i * (chh + 0.3);
      if (c.ok) V.card(s, { x: rx, y, w: rw, h: chh, fill: P.turqPale });
      else V.card(s, { x: rx, y, w: rw, h: chh, fill: P.white, line: P.red, lineW: 1 });
      V.iconCircle(s, c.ok ? I.check : I.times_w, { x: rx + 0.14, y: y + (chh - 0.36) / 2, d: 0.36, fill: c.ok ? P.turq : P.red });
      const col = c.ok ? P.ink : P.red;
      txt(s, [R(c.sym, { bold: true, fontFace: V.MONO, color: col }), R('　' + c.t, { bold: true, color: col, breakLine: true }), R(c.d)], { x: rx + 0.64, y, w: rw - 0.76, h: chh, size: 12, valign: 'middle' });
      if (V.textW(c.d, 12) * 1.15 > rw - 0.76) warn('==/= card text tight: ' + c.d);
    });
    if (chh < 0.62) warn('==/= cards short');
  }

  // ---------------------------------------------------------------- code 1/2
  s = slide({
    title: '代码逐行看懂（1/2）：准备工作',
    desc: '先给两个引脚起名字、准备一个装读数的盒子，再在 setup() 里分好谁是输入、谁是输出',
    notes: '前三行准备了三个“盒子”：两个装引脚号，一个装读数。value 没有给初值也没关系，loop() 一开始就会把读数装进去。setup() 只在通电时运行一次：11 号设为输出、7 号设为输入，并先让 LED 熄灭。代码里的英文注释只是给人看的说明，下面的提示框给出了中文意思。',
  });
  {
    const cw = 5.0, ch = 2.5;
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: cw, h: ch, size: 10.5, code: BTN_CODE, from: 1, to: 9, hl: [1, 2, 3, 6, 7, 8], file: 'key_led.ino', right: '第 1–9 行' });
    V.tip(s, { x: G.L, y: G.top + ch + 0.3, w: cw, h: G.bottom - G.top - ch - 0.3, kind: 'tip', text: '注释翻译：key pin = 按键引脚；init … output / input = 设为输出 / 输入。// 后面的注释 Arduino 不执行。', size: 12 }, I.comments);
    const ex = G.L + cw + 0.4, ew = G.R - ex;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.12, items: [
      { line: [1, 2], text: '起名字：11 号接 LED，7 号接按键' },
      { line: 3, text: 'value：装读数的盒子，没写初值，开机是 0' },
      { line: 4, text: 'setup()：通电后只运行一次' },
      { line: [6, 7], text: '11 号当“嘴巴”，7 号当“耳朵”' },
      { line: 8, text: '开机先让 LED 熄灭' },
    ] });
  }

  // ---------------------------------------------------------------- code 2/2
  s = slide({
    title: '代码逐行看懂（2/2）：读按键、做判断',
    desc: 'loop() 不停地重复：读 7 号脚 → 是 LOW（按下了）就点亮 LED → 否则熄灭',
    notes: 'loop() 是程序的核心，只做两件事：读、判断。第 13 行问“value 等于 LOW 吗”，等于就说明按下了，走 if 让灯亮；否则走 else 让灯灭。第 20 行的注释写成了 is down，其实这里是松开时关灯，注释笔误不影响运行。loop 转得飞快，所以手一按灯几乎同时就亮。',
  });
  {
    const cw = 5.3;
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: BTN_CODE, from: 10, to: 22, hl: [12, 13, 15, 18, 20], file: 'key_led.ino', right: '第 10–22 行' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.12, items: [
      { line: 12, text: '读 7 号脚存进 value：按下 LOW，松开 HIGH' },
      { line: [13, 15], text: '等于 LOW（按下了）→ 11 号输出 HIGH，LED 亮' },
      { line: [18, 20], text: '否则（松开）→ LED 灭；注释“is down”是笔误' },
      { line: 22, text: '回到第 12 行再读一次' },
    ] });
  }

  // ---------------------------------------------------------------- result
  s = slide({
    title: '实验结果：按下就亮，松开就灭',
    desc: 'LED 跟着按键走：按住按键灯一直亮，一松手灯就灭',
    notes: '原指南“实验结论”下面只有标题没有文字，这里按程序写出现象。让学生按住、松开、快速连按，观察灯是否跟得上。可以对照右边的表复述一遍：按下 → 读到 LOW → 走 if → 灯亮。照片里用的是黄色 LED，颜色不影响结果。',
  });
  {
    const iw = 4.9;
    V.imageBox(s, { file: 'l12/btn_result_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南实物照片：按键模块 + 面包板上的 LED 接 UNO' });
    const rx = G.L + iw + 0.35, rw = G.R - rx;
    V.tip(s, { x: rx, y: G.top, w: rw, h: 1.05, kind: 'note', title: '原指南“实验结论”处空白', text: '按程序运行：按住按键 LED 亮，松开 LED 灭。', size: 12 }, I.check);
    let y = G.top + 1.05 + 0.3;
    txt(s, '一按一放，程序这样走', { x: rx, y, w: rw, h: 0.28, size: 13, bold: true, valign: 'middle' });
    y += 0.36;
    V.table(s, [
      ['按键', 'D7 读到', '走哪条路', 'LED'],
      ['松开', 'HIGH（1）', 'else', '灭'],
      ['按下', 'LOW（0）', 'if', { text: '亮', bold: true }],
    ], { x: rx, y, w: rw, colW: [0.72, 1.3, 1.05, rw - 3.07], rowH: 0.34, size: 12, align: ['center', 'center', 'center', 'center'] });
    y += 1.02 + 0.3;
    V.card(s, { x: rx, y, w: rw, h: G.bottom - y, fill: P.turqPale });
    V.iconCircle(s, I.redo, { x: rx + 0.14, y: y + (G.bottom - y - 0.36) / 2, d: 0.36 });
    txt(s, '快速连按几下，灯也跟着闪：loop 转得比手快得多。', { x: rx + 0.62, y, w: rw - 0.74, h: G.bottom - y, size: 12, valign: 'middle' });
  }

  // ---------------------------------------------------------------- pitfalls + try
  s = slide({
    title: '常见坑与动手改一改',
    desc: '先对照三个常见错误排查，再改一两行代码，看看灯的反应怎么变',
    notes: '左边三个坑是课堂上最常见的：等号写错、接到 D0 / D1、模块没供电。模块上的 Power 灯可以帮忙判断有没有通电。右边两个小改动建议当堂做：第一个把条件反过来；第二个给程序加上串口，让按键“开口说话”，这正好引出下一个实验要学的 Serial.println。',
  });
  {
    const lw = 4.4, n = 3, gap = 0.3, wh = (G.ch - gap * (n - 1)) / n;
    const W = [
      ['写成 if( value = LOW )', '一个等号是赋值，条件永远不成立，怎么按灯都不亮。比较要写 ==。'],
      ['按键接到了 D0 / D1', '这两个脚兼做串口，可能让上传失败、读数不准。按指南接 D7。'],
      ['模块没供电', 'V、G 没接好时，模块上的 Power 灯不亮，按了也没反应。'],
    ];
    W.forEach(([t, d], i) => warnRow(s, I.times_w, t, d, { x: G.L, y: G.top + i * (wh + gap), w: lw, h: wh }));
    const rx = G.L + lw + 0.35, rw = G.R - rx, ch = (G.ch - 0.3) / 2;
    // A
    let y = G.top;
    V.card(s, { x: rx, y, w: rw, h: ch });
    V.numCircle(s, 1, { x: rx + 0.18, y: y + 0.15, d: 0.34, size: 12 });
    txt(s, '反过来：按下灯灭', { x: rx + 0.64, y: y + 0.15, w: rw - 0.8, h: 0.34, size: 14, bold: true, valign: 'middle' });
    const m1 = miniCode(s, 'if( value == HIGH )   // 原来是 LOW', { x: rx + 0.18, y: y + 0.6, w: rw - 0.36, size: 11 });
    txt(s, '只改第 13 行：松开时灯亮，按下时灯灭。', { x: rx + 0.18, y: y + 0.6 + m1 + 0.1, w: rw - 0.36, h: 0.3, size: 12, valign: 'middle' });
    // B
    y = G.top + ch + 0.3;
    V.card(s, { x: rx, y, w: rw, h: ch, fill: P.turqPale });
    V.numCircle(s, 2, { x: rx + 0.18, y: y + 0.15, d: 0.34, size: 12 });
    txt(s, '让按键“开口说话”', { x: rx + 0.64, y: y + 0.15, w: rw - 0.8, h: 0.34, size: 14, bold: true, valign: 'middle' });
    const m2 = miniCode(s, 'Serial.begin(9600);     // 加进 setup()\nSerial.println(value);  // 加进 loop()', { x: rx + 0.18, y: y + 0.6, w: rw - 0.36, size: 10.5 });
    txt(s, '打开串口监视器：按下是 0，松开是 1。', { x: rx + 0.18, y: y + 0.6 + m2 + 0.1, w: rw - 0.36, h: 0.3, size: 12, valign: 'middle' });
    if (0.6 + m2 + 0.4 > ch) warn('btn try card B overflow');
  }

  // ================================================================ EXPERIMENT 2: touch
  deck.section('实验二　触摸开关');
  deck.divider({
    kicker: '实验 02',
    title: '触摸开关模块实验',
    desc: '不用按，轻轻一摸就能开灯。触摸模块和按键正好相反：摸到时输出高电平。这一次还要打开串口，亲眼“看见”传感器的读数。',
    tiles: [
      { fill: P.turq, big: '01', title: '认识', sub: 'TTP223B 电容触摸' },
      { fill: P.gray1, big: '02', title: '接线', sub: 'A0 读触摸，A5 控灯' },
      { fill: P.ink, big: '03', title: '代码', sub: 'Serial.println()' },
      { fill: P.white, big: '04', title: '结果', sub: '一摸就亮' },
    ],
    notes: '第二个实验换成触摸开关。注意两个新变化：一是摸到时读到的是 1，和按键相反；二是程序里多了串口打印，可以在电脑上看到读数。另外，这次的信号脚接在 A0、A5 上，我们会解释模拟口为什么也能当数字口用。',
  });

  // ---------------------------------------------------------------- intro
  s = slide({
    title: '认识触摸开关模块',
    desc: '手指一靠近，触摸芯片就能感觉到：平时输出低电平，摸到时输出高电平',
    notes: '“点动型”的意思是：摸着才有信号，手一松信号就没了，和按键一样。低功耗、快速模式是芯片自己切换的，编程时不用管。可以现场演示隔着一张纸触摸，让学生体会“隐藏按键”的设计可能：做产品时，开关可以藏在外壳后面。',
  });
  {
    const lw = 5.3;
    const y = numList(s, [
      '核心是触摸检测芯片 TTP223B：电容式、点动型，摸着才有信号，松手就没有',
      '平时输出低电平，处在省电的低功耗模式',
      '手指一摸，输出高电平并切换到快速模式；连续 12 秒没人摸，又回到低功耗模式',
      '可以装在塑料、玻璃等非金属表面后面，盖一张薄纸也能用，做成藏在墙上、桌面里的“隐藏按键”',
    ], { x: G.L, y: G.top, w: lw, size: 13, gap: 0.16 });
    const cy = Math.max(y + 0.3, 4.0), chh = G.bottom - cy;
    V.card(s, { x: G.L, y: cy, w: lw, h: chh, fill: P.turqPale });
    V.iconCircle(s, I.mobile, { x: G.L + 0.16, y: cy + (chh - 0.4) / 2, d: 0.4 });
    txt(s, [R('和手机触摸屏一个道理：', { bold: true }), R('手指能导电，靠近感应区时会改变它的电容，芯片据此判断“有人摸”。')], { x: G.L + 0.7, y: cy, w: lw - 0.84, h: chh, size: 12, valign: 'middle' });
    if (chh < 0.75) warn('touch analogy card short');
    V.imageBox(s, { file: 'l12/touch_module_photo.jpg', x: G.L + lw + 0.35, y: G.top, w: G.R - G.L - lw - 0.35, h: G.ch, caption: '原指南：触摸开关模块实物图' });
  }

  // ---------------------------------------------------------------- purpose + parts + principle
  s = slide({
    title: '实验目的、组件与原理：摸到 = 高电平',
    desc: '触摸模块检测到手指就输出高电平：Arduino 读到 1 就点亮 LED，否则熄灭',
    notes: '实验原理一句话：摸到 → 高电平 → 读到 1 → 灯亮。原文“负责 LED 灯灭”是“否则”的错别字。下面两张卡片请学生对比：按键是“按下 = 0”，触摸是“摸到 = 1”，所以 if 的条件一个写 LOW、一个写 1。以后遇到新传感器，第一步就是弄清楚触发时是 0 还是 1。',
  });
  {
    const w = (G.cw - 0.3) / 2, th = 1.25;
    V.tip(s, { x: G.L, y: G.top, w, h: th, kind: 'note', title: '实验目的', text: '① 了解触摸开关模块的工作原理\n② 用 Arduino 读取触摸开关，控制 LED 灯', size: 12.5 }, I.target);
    V.tip(s, { x: G.L + w + 0.3, y: G.top, w, h: th, kind: 'tip', title: '实验原理', text: '手指触摸模块，Arduino 检测到高电平就让 LED 亮，否则灭（原文“负责”应为“否则”）。', size: 12 }, I.book);
    const py = G.top + th + 0.3, ph = 0.46;
    partsCard(s, ['Arduino UNO R3 主板', '面包板', 'USB 数据线', '触摸开关模块 ×1', 'LED 模块 ×1', '若干跳线'], { x: G.L, y: py, w: G.cw, h: ph, inline: true, title: '组件', size: 11.5 });
    const cy = py + ph + 0.3, chh = G.bottom - cy;
    const C = [
      { ic: I.hand, t: '按键模块（实验 01）', a: '按下', lv: '低电平', v: '0', code: 'if( value == LOW )', fill: P.card },
      { ic: I.finger, t: '触摸开关模块（实验 02）', a: '摸到', lv: '高电平', v: '1', code: 'if(val==1)', fill: P.turqPale },
    ];
    C.forEach((c, i) => {
      const x = G.L + i * (w + 0.3);
      V.card(s, { x, y: cy, w, h: chh, fill: c.fill });
      V.iconCircle(s, c.ic, { x: x + 0.18, y: cy + 0.13, d: 0.36 });
      txt(s, c.t, { x: x + 0.66, y: cy + 0.13, w: w - 0.85, h: 0.36, size: 13.5, bold: true, valign: 'middle' });
      txt(s, [R(`${c.a} → 输出${c.lv} → 读到 `), R(c.v, { bold: true })], { x: x + 0.18, y: cy + 0.56, w: w - 0.36, h: 0.3, size: 13, valign: 'middle' });
      const pw = V.monoW(c.code, 11.5) + 0.3;
      V.pill(s, { x: x + 0.18, y: cy + 0.92, w: pw, h: 0.3, text: c.code, size: 11.5, mono: true, fill: P.ink, color: P.white, bold: false });
    });
    if (chh < 1.33) warn('touch compare cards short');
  }

  // ---------------------------------------------------------------- wiring
  s = slide({
    title: '接线：A0 读触摸，A5 控制灯',
    desc: '触摸模块 SIG 接 A0；灯接 A5——模拟口 A0～A5 在这里当普通数字口用',
    notes: '照两张表接线：触摸模块三根针 SIG、VCC、GND 分别接 A0、5V、GND。原指南接线图里的“LED”其实是一块 RGB 贴片模块，A5 接它的 R 脚，所以亮的是红灯；用普通 LED 模块也可以，A5 接 +。A0、A5 本来是模拟口，这里当数字口用，下一页专门讲。',
  });
  {
    const iw = 5.0;
    V.imageBox(s, { file: 'l12/touch_wiring.jpg', x: G.L, y: G.top, w: iw, h: G.ch, diagram: true, caption: '原指南接线图：黄线是信号，红线 5V，黑线 GND' });
    const rx = G.L + iw + 0.35, rw = G.R - rx;
    let y = V.wiring(s, { x: rx, y: G.top, w: rw, right: '触摸开关模块', rows: [['A0', 'SIG（信号引脚）'], ['5V', 'VCC(+)'], ['GND', 'GND(-)']], rowH: 0.3, colW: [rw * 0.4, rw * 0.6] }) + 0.3;
    y = V.wiring(s, { x: rx, y, w: rw, right: 'LED', rows: [['A5', '+'], ['GND', 'GND(-)']], rowH: 0.3, colW: [rw * 0.4, rw * 0.6] }) + 0.3;
    V.tip(s, { x: rx, y, w: rw, h: G.bottom - y, kind: 'tip', text: '图中的“LED”是一块 RGB 贴片模块：A5 接它的 R 脚，GND 接 − 脚，所以亮红灯。', size: 12 }, I.search);
    if (G.bottom - y < 0.95) warn('touch wiring tip short');
  }

  // ---------------------------------------------------------------- syntax 3: Serial + A0..A5
  s = slide({
    title: '新语法③：Serial.println() 与“兼职”的 A0～A5',
    desc: '串口是 Arduino 和电脑聊天的窗口，把读数打印出来，看不见的传感器状态就“看得见”了',
    notes: 'Serial.begin(9600) 在 setup 里打开聊天窗口，9600 是说话的速度；Serial.println(val) 每次说一句并换行。在 IDE 右上角点放大镜图标打开串口监视器，波特率选 9600。A0～A5 平时用来读模拟量，也能当数字口，但要写 A0 而不是 0——数字 0 指的是 D0 号脚。',
  });
  {
    const w = (G.cw - 0.35) / 2;
    let x = G.L;
    let y = iconCard(s, I.comments, 'Serial.println(val)', { x, y: G.top, w, h: G.ch, mono: true, titleSize: 14 });
    y += miniCode(s, 'Serial.begin(9600);   // 打开聊天窗口\nSerial.println(val);  // 说一句并换行', { x: x + 0.2, y, w: w - 0.4, size: 10.5 }) + 0.18;
    const smH = 1.24;
    serialMock(s, { x: x + 0.2, y, w: w - 0.4, h: smH, lh: 0.18, size: 10.5, lines: ['0', '1', '1', '0'], annX: 0.75, annots: [{ i: 0, text: '← 没摸', size: 10.5 }, { i: 1, text: '← 摸到了', size: 10.5 }, { i: 3, text: '← 松开手', size: 10.5 }] });
    y += smH + 0.2;
    warnLine(s, I.times_w, [R('波特率没选 9600', { bold: true, color: P.red }), R(' → 串口显示乱码')], { x: x + 0.2, y, w: w - 0.4 });
    if (y + 0.44 > G.bottom - 0.08) warn('syntax3 card A overflow');
    x = G.L + w + 0.35;
    y = iconCard(s, I.exchange, 'A0～A5 也能当数字口', { x, y: G.top, w, h: G.ch, titleSize: 14.5 });
    const tb = 'A0～A5 本职是读模拟量（analogRead），也能“兼职”当普通数字口用。';
    const hb = hOf(tb, w - 0.4, 12.5, 1.25);
    txt(s, tb, { x: x + 0.2, y, w: w - 0.4, h: hb, size: 12.5 });
    y += hb + 0.12;
    y += miniCode(s, 'int Led=A5;             // A5 接灯\nint SensorPin=A0;       // A0 接触摸\npinMode(Led,OUTPUT);\nval=digitalRead(SensorPin);', { x: x + 0.2, y, w: w - 0.4, size: 10.5 }) + 0.2;
    warnRow(s, I.times_w, '把 A0 写成 0', '数字 0 指的是 D0 号脚，不是 A0！', { x: x + 0.2, y, w: w - 0.4, h: G.bottom - 0.16 - y });
    if (G.bottom - 0.16 - y < 0.85) warn('syntax3 card B warn short');
  }

  // ---------------------------------------------------------------- code (pair)
  s = slide({
    title: '代码逐行看懂：读数、打印、判断',
    desc: '原指南此处空白：程序取自同一套件《Arduino 编程入门学习教程》第 2.19 讲，接线与本指南一致',
    notes: '原指南的“ArduinoIDE 编程程序”下面是空白，这里用同一套件《Arduino 编程入门学习教程》第 2.19 讲的程序，引脚和本指南的接线完全一致。请学生和按键程序对比：骨架一样，只多了串口两句，条件换成 val==1。val==1 也可以写成 val==HIGH，意思相同。',
  });
  codePair(s, {
    code: TOUCH_CODE, file: 'touch_led.ino', h: 2.75,
    a: { from: 1, to: 11, w: 4.9, hl: [1, 2, 7, 8], notes: [
      { line: [1, 2], text: 'A5 接灯、A0 接触摸：两个模拟口都当数字口用' },
      { line: [7, 8], text: 'A0 设为输入，再打开串口（速度 9600）' },
    ] },
    b: { from: 12, to: 22, w: G.cw - 4.9 - 0.3, hl: [12, 13, 14, 18], notes: [
      { line: [12, 13], text: '读 A0 并打印：没摸 0，摸到 1' },
      { line: [14, 21], text: 'val 是 1 → 灯亮；否则灯灭' },
    ] },
  });

  // ---------------------------------------------------------------- result + shield
  s = slide({
    title: '实验结果：一摸就亮',
    desc: '手指按在触摸区上，RGB 模块亮红灯；松开手，灯就灭——串口里的数字同步在 0 和 1 之间切换',
    notes: '上传程序后打开串口监视器，一边摸一边看：摸到时打印 1、灯亮，松开打印 0、灯灭。因为 loop 里没有 delay，数字会刷得很快，示意图只画了几行。如果手头有 Sensor V5.0 扩展板，可以照右边的照片接，每个引脚都有 G、V、S 三根针，模块直接插上，程序不用改。',
  });
  {
    const pw = 2.45, gap = 0.3;
    V.imageBox(s, { file: 'l12/touch_result_photo.jpg', x: G.L, y: G.top, w: pw, h: G.ch, caption: '原指南：触摸后亮红灯' });
    const mx = G.L + pw + gap, sx = G.R - pw, mw = sx - gap - mx;
    serialMock(s, { x: mx, y: G.top, w: mw, h: 1.62, title: '串口监视器（示意）', lh: 0.2, lines: ['0', '0', '1', '1', '0'], annX: 0.62,
      annots: [{ i: 0, text: '← 没摸：灯灭' }, { i: 2, text: '← 摸到：灯亮' }, { i: 4, text: '← 松开：灯灭' }] });
    const ty = G.top + 1.62 + 0.3;
    V.tip(s, { x: mx, y: ty, w: mw, h: G.bottom - ty, kind: 'note', title: '原指南：扩展板接法', text: '套件里有 Sensor V5.0 扩展板的话，可以照右图接线：模块直接插到对应引脚的三针座上，程序不用改。', size: 12 }, I.puzzle);
    V.imageBox(s, { file: 'l12/touch_shield_photo.jpg', x: sx, y: G.top, w: pw, h: G.ch, caption: 'Sensor V5.0 扩展板接法' });
  }

  // ---------------------------------------------------------------- pitfalls + try
  s = slide({
    title: '常见坑与动手改一改',
    desc: '触摸模块很灵敏，也有自己的“小脾气”；改一个数字、盖一张纸，就能玩出新花样',
    notes: 'TTP223B 通电后大约半秒内在自动校准，这时手放在触摸区上，它会把“有手”当成平常状态，之后就不灵了；松开手重新上电即可。只能隔着塑料、玻璃、纸这类非金属，而且越薄越灵敏。右边第一个改动可以让学生找张便利贴试试，第二个只改第 14 行的一个数字。',
  });
  {
    const lw = 4.4, n = 3, gap = 0.3, wh = (G.ch - gap * (n - 1)) / n;
    const W = [
      ['一上电就不灵', '通电后约半秒芯片在自动校准，这时别碰触摸区；不灵就松手、重新上电。'],
      ['隔着东西摸没反应', '只能隔塑料、玻璃、纸这类非金属，而且要薄。'],
      ['摸了，灯却不亮', '先看模块上的小指示灯：亮了说明触摸没问题，去查 A5 和灯；不亮就查 VCC、GND。'],
    ];
    W.forEach(([t, d], i) => warnRow(s, I.times_w, t, d, { x: G.L, y: G.top + i * (wh + gap), w: lw, h: wh }));
    const rx = G.L + lw + 0.35, rw = G.R - rx, ch = (G.ch - 0.3) / 2;
    let y = G.top;
    V.card(s, { x: rx, y, w: rw, h: ch, fill: P.turqPale });
    V.numCircle(s, 1, { x: rx + 0.18, y: y + 0.15, d: 0.34, size: 12 });
    txt(s, '做一个“隐藏开关”', { x: rx + 0.64, y: y + 0.15, w: rw - 0.8, h: 0.34, size: 14, bold: true, valign: 'middle' });
    txt(s, '在模块上盖一张便利贴或薄塑料片，隔着它摸，灯照样会亮。开关可以藏进产品外壳里。', { x: rx + 0.18, y: y + 0.62, w: rw - 0.36, h: ch - 0.7, size: 12.5 });
    y = G.top + ch + 0.3;
    V.card(s, { x: rx, y, w: rw, h: ch });
    V.numCircle(s, 2, { x: rx + 0.18, y: y + 0.15, d: 0.34, size: 12 });
    txt(s, '反过来：摸着灯灭', { x: rx + 0.64, y: y + 0.15, w: rw - 0.8, h: 0.34, size: 14, bold: true, valign: 'middle' });
    const m = miniCode(s, 'if(val==0)   // 原来是 val==1', { x: rx + 0.18, y: y + 0.6, w: rw - 0.36, size: 11 });
    txt(s, '只改第 14 行：松手时灯亮，摸着时灯灭。', { x: rx + 0.18, y: y + 0.6 + m + 0.1, w: rw - 0.36, h: 0.3, size: 12, valign: 'middle' });
  }

  // ================================================================ EXPERIMENT 3: limit switch
  deck.section('实验三　限位开关');
  deck.divider({
    kicker: '实验 03',
    title: '限位开关模块实验',
    desc: '机器上的“到位报告员”：被压下就报告。它的程序和按键实验几乎一模一样，只是换了一个传感器、换了一个引脚。',
    tiles: [
      { fill: P.turq, big: '01', title: '认识', sub: '行程开关' },
      { fill: P.gray1, big: '02', title: '原理', sub: '看懂原理图' },
      { fill: P.ink, big: '03', title: '代码', sub: '和按键同一个骨架' },
      { fill: P.white, big: '04', title: '结果', sub: '压下就亮' },
    ],
    notes: '原指南把这一部分叫作“第 2.17 讲：限位开关模块实验”。这个实验的新东西不在代码，而在原理图：我们第一次照着原理图，弄清楚为什么压下时读到 0。代码部分只要找出和按键程序的不同之处。',
  });

  // ---------------------------------------------------------------- intro + parts
  s = slide({
    title: '认识限位开关：机器的“到位报告员”',
    desc: '限位开关又叫行程开关：机器的运动部件走到预定位置、把它压下，电路就切换，相当于报告“到位了”',
    notes: '限位开关本质上就是一个装了摆杆的微动开关，摆杆被碰到、压下，开关就切换。原指南列了四种用途：行程控制、限位保护、报警、联锁启停。生活里的例子：3D 打印机开机先“回原点”，喷头碰到限位开关才知道走到头了。组件清单里的 220Ω 电阻给 LED 限流。',
  });
  {
    const lw = 4.3;
    V.imageBox(s, { file: 'l12/limit_module_photo.jpg', x: G.L, y: G.top, w: lw, h: 2.15, caption: '原指南：限位开关模块（引脚 OUT · GND · VCC）' });
    lead(s, '它是做什么的', '限位开关用来反映设备机械位置的变化：设备一到预定位置就切换电路，从而实现右边这四种功能。', { x: G.L, y: G.top + 2.15 + 0.3, w: lw, size: 13, leadSize: 14 });
    const rx = G.L + lw + 0.35, rw = G.R - rx, gap = 0.3, fw = (rw - gap) / 2, fh = 0.72;
    const F = [
      [I.route, '行程控制', '走到头就停'],
      [I.shield, '限位保护', '防止冲过头撞坏'],
      [I.bell, '报警', '到位或越位就提醒'],
      [I.link, '联锁启停', '到位后再下一步'],
    ];
    F.forEach(([ic, t, d], i) => {
      const x = rx + (i % 2) * (fw + gap), y = G.top + Math.floor(i / 2) * (fh + gap);
      V.card(s, { x, y, w: fw, h: fh });
      V.iconCircle(s, ic, { x: x + 0.14, y: y + (fh - 0.38) / 2, d: 0.38 });
      txt(s, [R(t, { bold: true, breakLine: true }), R(d, { color: P.muted })], { x: x + 0.62, y, w: fw - 0.7, h: fh, size: 12, valign: 'middle' });
    });
    const py = G.top + 2 * fh + gap + 0.3;
    partsCard(s, ['Arduino UNO R3 主板', 'USB 数据线', '限位开关模块 ×1', 'LED 灯模块 ×1', '220Ω 电阻 ×1', '若干跳线'], { x: rx, y: py, w: rw, h: G.bottom - py, size: 11.5 });
  }

  // ---------------------------------------------------------------- principle: schematic
  s = slide({
    title: '实验原理：读懂原理图，压下为什么是 0',
    desc: 'OUT 经 10K 电阻接到 5V（上拉），开关 K 一头接地：松开时 OUT 是高电平，压下时 OUT 被拉到 0V',
    notes: '原指南的实验原理只有这张原理图，我们一起读：R2 是 10K 上拉电阻，把 OUT 平时拉在 5V；开关 K 一头接地。压下限位开关，K 接通，OUT 直接接地变成 0V；同时 +5V 经 R1、模块上的 LED、K 流到地，模块上的指示灯亮。结论和按键模块一样：低电平有效。',
  });
  {
    const iw = 4.7;
    V.imageBox(s, { file: 'l12/limit_schematic.jpg', x: G.L, y: G.top, w: iw, h: G.ch, diagram: true, caption: '原指南原理图：R1 1K · R2 10K · 开关 K · 接口 J1' });
    const rx = G.L + iw + 0.35, rw = G.R - rx, th = 1.15;
    const st = [
      { fill: P.ink, big: '1', t: '松开：OUT = 高电平', d: 'K 断开，R2 把 OUT 拉到 5V；\n模块上的 LED 两头都是 5V，不亮', col: P.white, sub: 'D0D0D0' },
      { fill: P.turq, big: '0', t: '压下：OUT = 低电平', d: 'K 接通，OUT 直接接地；\n电流经 R1、LED 流到地，模块上的 LED 亮', col: P.ink, sub: P.ink },
    ];
    st.forEach((t, i) => {
      const ty = G.top + i * th;
      s.addShape('rect', { x: rx, y: ty, w: rw, h: th, fill: { color: t.fill }, line: { color: P.gray2, width: 0.75 } });
      V.text(s, t.big, { x: rx + 0.2, y: ty + 0.1, w: 0.5, h: 0.42, size: 24, bold: true, mono: true, color: t.fill === P.ink ? P.turq : P.ink, valign: 'middle' });
      txt(s, t.t, { x: rx + 0.75, y: ty + 0.1, w: rw - 0.9, h: 0.42, size: 15, bold: true, color: t.col, valign: 'middle' });
      txt(s, t.d, { x: rx + 0.2, y: ty + 0.56, w: rw - 0.35, h: 0.52, size: 12, color: t.sub });
    });
    const ty = G.top + 2 * th + 0.3;
    V.tip(s, { x: rx, y: ty, w: rw, h: G.bottom - ty, kind: 'tip', title: '和按键模块一样：低电平有效', text: 'R2 像弹簧把 OUT 拉在高处，压下才被拉到地，所以程序写 if(val==0)。', size: 12 }, I.bulb);
  }

  // ---------------------------------------------------------------- wiring
  s = slide({
    title: '接线：OUT 接 10 号脚，LED 接 11 号脚',
    desc: '限位开关 OUT、GND、VCC 接 10、GND、5V；LED 长脚经 220Ω 电阻接 11，短脚接 GND',
    notes: '照两张表接线。表里“LED（中间加电阻）”的意思是：11 号脚和 LED 长脚之间串一个 220Ω 电阻。注意接线图里的模块画成了另一种外形，印的是 S、G、V，对应关系是 S＝OUT、G＝GND、V＝VCC，按丝印接就不会错。',
  });
  {
    const iw = 5.1;
    V.imageBox(s, { file: 'l12/limit_wiring.jpg', x: G.L, y: G.top, w: iw, h: G.ch, diagram: true, caption: '原指南接线图：黄线 10 → S · 红线 5V → V · 黑线 GND → G' });
    const rx = G.L + iw + 0.35, rw = G.R - rx;
    let y = V.wiring(s, { x: rx, y: G.top, w: rw, left: 'Arduino Uno', right: '限位开关模块', rows: [['10', 'OUT'], ['GND', 'GND'], ['5V', 'VCC']], rowH: 0.3 }) + 0.3;
    y = V.wiring(s, { x: rx, y, w: rw, left: 'Arduino Uno', right: 'LED（中间加电阻）', rows: [['11', '长脚'], ['GND', '短脚']], rowH: 0.3 }) + 0.3;
    V.tip(s, { x: rx, y, w: rw, h: G.bottom - y, kind: 'tip', text: '接线图里的模块印着 S、G、V，\n分别对应 OUT、GND、VCC。', size: 12 }, I.search);
    if (G.bottom - y < 0.95) warn('limit wiring tip short');
  }

  // ---------------------------------------------------------------- code (pair)
  s = slide({
    title: '代码：和按键实验是同一个骨架',
    desc: '读 → 打印 → 判断 → 输出，四步不变；只是换成 10 号脚，条件写成 val==0（0 就是 LOW）',
    notes: '先请学生自己找不同：和按键程序相比，引脚从 7 换成 10，多了串口两句，条件从 value == LOW 换成 val==0，意思完全一样。第 7 行注释写“输出接口”是笔误，代码是 INPUT，Arduino 只看代码不看注释。这就是“学会一个，会一类”。',
  });
  codePair(s, {
    code: LIMIT_CODE, file: 'limit_switch.ino', h: 2.6,
    a: { from: 1, to: 11, w: 5.2, hl: [2, 7, 8], notes: [
      { line: 2, text: '限位开关接 10 号脚（按键实验接的是 7 号）' },
      { line: 7, text: '注释写“输出接口”是笔误：INPUT 是输入' },
    ] },
    b: { from: 12, to: 22, w: G.cw - 5.2 - 0.3, hl: [12, 13, 14, 18], notes: [
      { line: [12, 13], text: '读 10 号脚并打印' },
      { line: [14, 21], text: 'val==0（压下）→ 灯亮；否则灭' },
    ] },
  });

  // ---------------------------------------------------------------- result + pitfall
  s = slide({
    title: '实验结果：压下开关，灯就亮',
    desc: '原指南：上传程序之后，按下限位开关，灯会随之亮起；串口里，松开是 1，压下是 0',
    notes: '上传后打开串口，用手指压下摆杆，观察灯和串口数字同时变化。排查口诀：先看串口，再查接线。串口数字会变，说明限位开关这一路没问题，去查 LED 的方向和电阻；数字不变，就查 OUT 有没有接在 10 号脚。',
  });
  {
    const iw = 5.3;
    V.imageBox(s, { file: 'l12/limit_result_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南实物照片：限位开关模块 + 面包板上的 LED 接 UNO' });
    const rx = G.L + iw + 0.35, rw = G.R - rx, smH = 1.62;
    serialMock(s, { x: rx, y: G.top, w: rw, h: smH, title: '串口监视器（示意）', lh: 0.2, lines: ['1', '1', '0', '0', '1'], annX: 0.6,
      annots: [{ i: 0, text: '← 松开：灯灭' }, { i: 2, text: '← 压下：灯亮' }, { i: 4, text: '← 松开：灯灭' }] });
    const wy = G.top + smH + 0.3;
    warnRow(s, I.times_w, '压下了，灯却不亮？', '先看串口：数字会变 0，就去查 LED（长脚经电阻接 11）；数字不变，查 OUT 是否接在 10 号脚。', { x: rx, y: wy, w: rw, h: G.bottom - wy });
  }

  // ================================================================ EXPERIMENT 4: tilt switch
  deck.section('实验四　倾斜开关');
  deck.divider({
    kicker: '实验 04',
    title: '倾斜开关模块实验',
    desc: '里面藏着一颗会滚的小钢珠：一倾斜、一碰撞，电路就接通或断开。用它加上灯和蜂鸣器，做一个“碰一下就报警”的防盗装置。',
    tiles: [
      { fill: P.turq, big: '01', title: '认识', sub: '滚珠开关' },
      { fill: P.gray1, big: '02', title: '原理', sub: '先观察，再判断' },
      { fill: P.ink, big: '03', title: '代码', sub: '一个 if 管两个输出' },
      { fill: P.white, big: '04', title: '结果', sub: '碰一下就报警' },
    ],
    notes: '最后一个实验：倾斜开关。程序骨架还是一样，新东西有两个：一个 if 同时控制灯和蜂鸣器两个输出；用 // 把一句代码“注释掉”。原指南对“哪种状态输出 0”有两种说法，我们用串口亲眼观察来解决。',
  });

  // ---------------------------------------------------------------- intro
  s = slide({
    title: '认识倾斜开关：管子里有颗小钢珠',
    desc: '倾斜开关又叫滚珠开关：钢珠滚到引脚那一端就把电路接通，滚走就断开',
    notes: '可以把模块拿起来轻轻摇，能听到钢珠滚动的声音。右边两幅图讲清原指南第 2 条的意思：引脚那一端朝下超过 10°，钢珠滚到两根引脚上把它们接通；帽盖那一端朝下超过 10°，钢珠滚走，电路断开。SW-520D 这类开关只对这一个方向的倾斜敏感，所以叫“单方向触发”。',
  });
  {
    const lw = 4.6, ih = 2.3;
    V.imageBox(s, { file: 'l12/tilt_module_photo.jpg', x: G.L, y: G.top, w: lw, h: ih, pad: 0.06, caption: '原指南：倾斜传感器（正面）/（反面）' });
    const ly = lead(s, '一颗钢珠当开关', '也叫钢珠开关、珠子开关，是震动开关的一种：靠珠子滚动去碰导针，让电路接通或断开。', { x: G.L, y: G.top + ih + 0.3, w: lw, size: 13, leadSize: 14 });
    if (ly > G.bottom) warn('tilt intro lead overflow');
    const rx = G.L + lw + 0.35, rw = G.R - rx, ch = 1.45, gap = 0.3;
    const S = [
      { ang: -14, ball: 'pins', fill: P.turqPale, t: '引脚端朝下超过 10°', d: [R('钢珠滚到引脚处，把两根引脚接通 → '), R('闭路 ON', { bold: true })] },
      { ang: 14, ball: 'cap', fill: P.card, t: '帽盖端朝下超过 10°', d: [R('钢珠滚到帽盖端，离开引脚 → '), R('开路 OFF', { bold: true })] },
    ];
    S.forEach((c, i) => {
      const y = G.top + i * (ch + gap);
      V.card(s, { x: rx, y, w: rw, h: ch, fill: c.fill });
      tiltTube(s, { cx: rx + 1.05, cy: y + ch / 2 + 0.02, L: 1.1, H: 0.34, ang: c.ang, ball: c.ball });
      const tx = rx + 1.95, tw = rw - 1.95 - 0.14;
      if (V.textW(c.t, 14) * 1.12 > tw) warn('tilt state title tight: ' + c.t);
      txt(s, c.t, { x: tx, y: y + 0.14, w: tw, h: 0.32, size: 14, bold: true, valign: 'middle' });
      txt(s, c.d, { x: tx, y: y + 0.52, w: tw, h: ch - 0.6, size: 12 });
    });
    txt(s, '注：SW-520D 这类滚珠开关是“单方向触发”，只对这一个方向的倾斜敏感。', { x: rx, y: G.top + 2 * ch + gap + 0.08, w: rw, h: 0.36, size: 10, color: P.muted });
  }

  // ---------------------------------------------------------------- purpose + parts + principle
  s = slide({
    title: '实验目的与原理：先观察，再判断',
    desc: '原指南对“何时输出低电平”有两种说法；程序只认一条规则：读到 0 就报警',
    notes: '原指南介绍里说“倾斜时输出低电平”，实验原理里又说“静止时闭合、碰一下断开就报警”，两种说法角度不同，容易把人绕晕。不用死记哪种状态是 0：程序的规则只有 if(val==0) 一条，到底哪种姿势读到 0，上传程序后打开串口亲眼看一看，记在“实验结果”页的表里。组件里的“贴片模块”就是 RGB 贴片灯模块。',
  });
  {
    const lw = 4.0;
    V.tip(s, { x: G.L, y: G.top, w: lw, h: 1.15, kind: 'note', title: '实验目的', text: '① 了解倾斜开关模块的工作原理\n② 用倾斜开关做一个防盗报警装置', size: 12.5 }, I.target);
    const py = G.top + 1.15 + 0.3;
    partsCard(s, ['Arduino UNO R3 主板', '面包板', 'USB 数据线', '倾斜开关模块 ×1', '贴片模块 ×1', '有源蜂鸣器 ×1', '若干跳线'], { x: G.L, y: py, w: lw, h: G.bottom - py, size: 11.5 });
    txt(s, '注：“贴片模块”就是 RGB 贴片灯模块。', { x: G.L + 0.18, y: G.bottom - 0.46, w: lw - 0.36, h: 0.3, size: 12, color: P.muted, valign: 'middle' });
    const rx = G.L + lw + 0.35, rw = G.R - rx;
    txt(s, '原指南的两种说法', { x: rx, y: G.top, w: rw, h: 0.28, size: 13, bold: true, valign: 'middle' });
    quoteCard(s, '说法 A · 介绍', '感应到倾斜时，模块输出低电平，否则输出高电平。', { x: rx, y: G.top + 0.38, w: rw, h: 0.74 });
    quoteCard(s, '说法 B · 实验原理', '静止时开关闭合；外力一碰，钢珠和导针分开、电路断开，就触发报警：LED 亮，蜂鸣器响。', { x: rx, y: G.top + 0.38 + 0.74 + 0.3, w: rw, h: 1.0 });
    const ry = G.top + 0.38 + 0.74 + 0.3 + 1.0 + 0.3, rh = G.bottom - ry;
    V.card(s, { x: rx, y: ry, w: rw, h: rh, fill: P.ink });
    txt(s, [R('程序只认一条规则：', { color: P.white, bold: true }), R('if(val==0) → 报警', { color: P.turq, bold: true, fontFace: V.MONO })], { x: rx + 0.2, y: ry + 0.12, w: rw - 0.4, h: 0.32, size: 13.5, valign: 'middle' });
    txt(s, '哪种姿势读到 0？上传程序后，打开串口自己看。', { x: rx + 0.2, y: ry + 0.5, w: rw - 0.4, h: 0.3, size: 12, color: 'E0E0E0', valign: 'middle' });
    if (rh < 0.88) warn('tilt rule card short');
  }

  // ---------------------------------------------------------------- wiring
  s = slide({
    title: '接线：三个模块，三张表',
    desc: '倾斜开关 S 接 12，RGB 贴片模块 R 接 11，蜂鸣器 S 接 13；倾斜开关和蜂鸣器从面包板电源轨取电',
    notes: '照三张表一张一张接。接线图里 UNO 的 5V 和 GND 先接到面包板的电源轨，倾斜开关和蜂鸣器的 V、G 再从电源轨取电。“贴片模块”是 RGB 贴片灯模块，11 号脚接它的 R 脚，所以报警时亮红灯；它的 GND 直接接 UNO 的 GND。接完同桌互相检查一遍再上电。',
  });
  {
    const iw = 4.8;
    V.imageBox(s, { file: 'l12/tilt_wiring.jpg', x: G.L, y: G.top, w: iw, h: G.ch, diagram: true, caption: '原指南接线图：上 RGB 贴片模块 · 中 蜂鸣器 · 下 倾斜开关' });
    const rx = G.L + iw + 0.35, rw = G.R - rx, rh = 0.27, gap = 0.3;
    let y = V.wiring(s, { x: rx, y: G.top, w: rw, right: '倾斜开关模块', rows: [['12', 'S'], ['5V', 'V'], ['GND', 'G']], rowH: rh, size: 11.5 }) + gap;
    y = V.wiring(s, { x: rx, y, w: rw, right: '贴片模块（RGB 灯）', rows: [['11', 'R'], ['GND', 'GND']], rowH: rh, size: 11.5 }) + gap;
    y = V.wiring(s, { x: rx, y, w: rw, right: '有源蜂鸣器', rows: [['13', 'S'], ['GND', 'G'], ['5V', 'V']], rowH: rh, size: 11.5 });
    if (y > G.bottom + 0.01) warn(`tilt wiring tables overflow ${y.toFixed(2)}`);
  }

  // ---------------------------------------------------------------- syntax 4: one if, two outputs + comments
  s = slide({
    title: '新语法④：一个 if 管两件事，// 让代码“休息”',
    desc: '大括号里可以写好几句，条件成立时一起执行；行首加 // 的代码变成注释，Arduino 会跳过它',
    notes: '大括号就像一个打包袋，if 成立时袋子里的几句话从上到下全部执行，所以灯和蜂鸣器同时动作。漏写大括号时 if 只管紧跟的第一句，有 else 时还会编译报错。// 后面的内容是写给人看的便利贴，Arduino 一律跳过；在一行代码前加 // 叫“注释掉”，调试时很常用。',
  });
  {
    const w = (G.cw - 0.35) / 2;
    let x = G.L;
    let y = iconCard(s, I.box, '一个 if，管两件事', { x, y: G.top, w, h: G.ch, titleSize: 14.5 });
    txt(s, '大括号像打包袋：成立时，里面几句一起执行。', { x: x + 0.2, y, w: w - 0.4, h: 0.28, size: 12.5, valign: 'middle' });
    y += 0.28 + 0.12;
    y += miniCode(s, 'if(val==0)\n{\n  digitalWrite(Led,HIGH);\n  digitalWrite(Buzzer_pin,HIGH);\n}', { x: x + 0.2, y, w: w - 0.4, size: 10.5, hl: [2, 3] }) + 0.2;
    warnRow(s, I.times_w, '漏写大括号', 'if 只管第一句；有 else 时还会报错。', { x: x + 0.2, y, w: w - 0.4, h: G.bottom - 0.16 - y });
    if (G.bottom - 0.16 - y < 0.95) warn('syntax4 A warn short');
    x = G.L + w + 0.35;
    y = iconCard(s, I.note, '// 注释：写给人看的便利贴', { x, y: G.top, w, h: G.ch, titleSize: 14.5 });
    const tb = '// 后面的内容 Arduino 一律跳过。在一行代码前加上 //，它就“休息”了，这叫“注释掉”。';
    const hb = hOf(tb, w - 0.4, 12.5, 1.25);
    txt(s, tb, { x: x + 0.2, y, w: w - 0.4, h: hb, size: 12.5 });
    y += hb + 0.12;
    y += miniCode(s, '// delay(1000);', { x: x + 0.2, y, w: w - 0.4, size: 11.5 }) + 0.1;
    txt(s, '第 20 行就是这样：delay 被注释掉了，不执行。', { x: x + 0.2, y, w: w - 0.4, h: 0.48, size: 12, color: P.muted });
    y += 0.48 + 0.18;
    warnRow(s, I.times_w, '注释也会写错', '第 9、14、16 行的注释都和代码不符。', { x: x + 0.2, y, w: w - 0.4, h: G.bottom - 0.16 - y });
    if (G.bottom - 0.16 - y < 0.85) warn('syntax4 B warn short');
  }

  // ---------------------------------------------------------------- code 1/2
  s = slide({
    title: '代码逐行看懂（1/2）：三个引脚',
    desc: '这次要管三个元件：灯和蜂鸣器是输出，倾斜开关是输入，另外打开串口用来观察',
    notes: '前四行准备了四个盒子：三个装引脚号，一个装读数。变量名 buttonpin 是沿用按键实验的名字，实际接的是倾斜开关——名字可以随便起，但最好见名知意。第 9 行注释写“输出接口”是笔误，代码写的是 INPUT。',
  });
  {
    const cw = 5.6;
    const chh = 2.95;
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: cw, h: chh, size: 10, code: TILT_CODE, from: 1, to: 13, hl: [1, 2, 3, 9, 10], file: 'tilt_alarm.ino', right: '第 1–13 行' });
    const ny = G.top + chh + 0.3, nh = G.bottom - ny;
    V.card(s, { x: G.L, y: ny, w: cw, h: nh, fill: P.card });
    V.iconCircle(s, I.redo, { x: G.L + 0.16, y: ny + (nh - 0.3) / 2, d: 0.3 });
    txt(s, [R('第 12 行起是 loop()', { bold: true }), R('：读开关、判断、报警，下一页接着看')], { x: G.L + 0.6, y: ny, w: cw - 0.75, h: nh, size: 12, valign: 'middle' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    const yEnd = V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: 4.1, gap: 0.12, items: [
      { line: [1, 3], text: '11 接灯，13 接蜂鸣器，12 接倾斜开关' },
      { line: 4, text: 'val：装读数的盒子，先放 0' },
      { line: [7, 8], text: '灯和蜂鸣器设为输出' },
      { line: 9, text: '倾斜开关设为输入（注释“输出”是笔误）' },
      { line: 10, text: '打开串口，速度 9600' },
    ] });
    const ty = Math.max(yEnd + 0.12, 4.1);
    V.tip(s, { x: ex, y: ty, w: ew, h: G.bottom - ty, kind: 'tip', text: 'buttonpin 是沿用按键实验的名字，其实接的是倾斜开关。', size: 12 }, I.pen);
    if (G.bottom - ty < 0.75) warn('tilt code1 tip short');
  }

  // ---------------------------------------------------------------- code 2/2
  s = slide({
    title: '代码逐行看懂（2/2）：读到 0 就报警',
    desc: 'loop() 一直在问：倾斜开关读到 0 了吗？是 → 灯亮、蜂鸣器响；否 → 全部关掉',
    notes: '和前面三个程序比，唯一的新东西是 if 和 else 里各有两句，同时管灯和蜂鸣器。第 14 行注释说读的是 A5，第 16 行注释说 LED 闪烁，都是笔误：读的是 12 号脚，灯是常亮：if 里只有点亮、没有熄灭，就算恢复第 20 行的 delay 也不会闪。想让它真的闪，后面“动手改一改”会讲。',
  });
  {
    const cw = 5.6;
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: TILT_CODE, from: 14, to: 27, hl: [14, 15, 16, 18, 19, 20, 22], file: 'tilt_alarm.ino', right: '第 14–27 行' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: 3.88, gap: 0.12, items: [
      { line: [14, 15], text: '读 12 号脚存进 val，再打印出来' },
      { line: 16, text: 'val 是 0 就报警' },
      { line: [18, 20], text: '灯亮、蜂鸣器响；第 20 行不执行' },
      { line: [22, 25], text: '否则：灯灭、蜂鸣器停' },
    ] });
    const ty = 4.02;
    V.tip(s, { x: ex, y: ty, w: ew, h: G.bottom - ty, kind: 'note', text: '注释笔误：第 14 行读的是 12 号脚，不是 A5；第 16 行灯是常亮，不是闪烁。', size: 12 }, I.pen);
  }

  // ---------------------------------------------------------------- result + observe
  s = slide({
    title: '实验结果：碰一下就报警',
    desc: '原指南：烧录程序后，把倾斜开关模块稍微触碰一下，即可触发报警——LED 灯亮，蜂鸣器响',
    notes: '先照原指南的说法轻碰模块，听到蜂鸣器响、看到红灯亮就成功了。然后做右边的观察：打开串口，把模块分别平放、引脚端朝下、帽盖端朝下、轻碰一下，记录 val 和报警情况。学生会自己发现：读到 0 的那几种姿势就会报警，这比背结论可靠。',
  });
  {
    const iw = 4.6;
    V.imageBox(s, { file: 'l12/tilt_result_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南实物照片：倾斜开关、RGB 贴片模块、有源蜂鸣器接 UNO' });
    const rx = G.L + iw + 0.35, rw = G.R - rx;
    txt(s, '动手观察：打开串口，填一填', { x: rx, y: G.top, w: rw, h: 0.3, size: 13.5, bold: true, valign: 'middle' });
    const q = { text: '？', color: P.muted };
    V.table(s, [
      ['模块的姿势', 'val', '报警了吗'],
      ['平放、静止', q, q],
      ['引脚端朝下', q, q],
      ['帽盖端朝下', q, q],
      ['轻轻碰一下', q, q],
    ], { x: rx, y: G.top + 0.4, w: rw, colW: [1.8, 0.9, rw - 2.7], rowH: 0.34, size: 12, align: ['left', 'center', 'center'] });
    const ty = G.top + 0.4 + 5 * 0.34 + 0.3;
    V.tip(s, { x: rx, y: ty, w: rw, h: G.bottom - ty, kind: 'note', title: '找规律', text: '读到 0 的姿势就会报警；以你在串口里看到的为准，不用死记。', size: 12 }, I.eye);
  }

  // ---------------------------------------------------------------- pitfalls + try
  s = slide({
    title: '常见坑与动手改一改',
    desc: '原程序有三处注释和代码对不上；加上熄灭和 delay，就能做出真正“闪烁”的报警',
    notes: '三处注释笔误都不影响运行，但很容易误导人，这正是“以代码为准”的好例子。一直报警停不下来时，先看串口：一直是 0，说明模块此刻的姿势正好读到 0，换个姿势放；数字乱跳，多半是 S 线没插牢。右边的改法：亮 0.1 秒、灭 0.1 秒，loop 一圈圈转，就成了“滴滴”闪响。',
  });
  {
    const lw = 4.4;
    const h1 = 1.85;
    V.card(s, { x: G.L, y: G.top, w: lw, h: h1, fill: P.white, line: P.red, lineW: 1 });
    V.iconCircle(s, I.times_w, { x: G.L + 0.16, y: G.top + 0.16, d: 0.34, fill: P.red });
    txt(s, '三处注释和代码对不上', { x: G.L + 0.64, y: G.top + 0.16, w: lw - 0.8, h: 0.34, size: 13, bold: true, color: P.red, valign: 'middle' });
    const rows = [['第 9 行', '注释写“输出接口”，代码是 INPUT'], ['第 14 行', '注释写“A5”，实际读 12 号脚'], ['第 16 行', '注释写“闪烁”，实际是常亮']];
    rows.forEach(([tag, t], i) => {
      const y = G.top + 0.64 + i * 0.38;
      V.pill(s, { x: G.L + 0.2, y: y + 0.02, w: 0.82, h: 0.26, text: tag, size: 10, fill: P.redPale, color: P.red });
      txt(s, t, { x: G.L + 1.12, y, w: lw - 1.3, h: 0.3, size: 12, valign: 'middle' });
    });
    const wy = G.top + h1 + 0.3;
    warnRow(s, I.times_w, '一直报警，停不下来', '先看串口：一直是 0，说明模块此刻的姿势正好读到 0，换个姿势放；数字乱跳，查 S 线是否插牢在 12 号脚。', { x: G.L, y: wy, w: lw, h: G.bottom - wy });
    const rx = G.L + lw + 0.35, rw = G.R - rx;
    V.card(s, { x: rx, y: G.top, w: rw, h: G.ch, fill: P.turqPale });
    V.iconCircle(s, I.bell, { x: rx + 0.2, y: G.top + 0.17, d: 0.42 });
    txt(s, '动手改一改：真的“闪”起来', { x: rx + 0.76, y: G.top + 0.17, w: rw - 0.9, h: 0.42, size: 14.5, bold: true, valign: 'middle' });
    txt(s, '把 if 里的两句换成下面 6 句：', { x: rx + 0.2, y: G.top + 0.72, w: rw - 0.4, h: 0.3, size: 12.5, valign: 'middle' });
    const mh = miniCode(s, 'digitalWrite(Led,HIGH);\ndigitalWrite(Buzzer_pin,HIGH);\ndelay(100);   // 亮 0.1 秒\ndigitalWrite(Led,LOW);\ndigitalWrite(Buzzer_pin,LOW);\ndelay(100);   // 灭 0.1 秒', { x: rx + 0.2, y: G.top + 1.1, w: rw - 0.4, size: 11, hl: [2, 5] });
    txt(s, 'loop 一圈圈重复，报警就变成“滴滴”闪响。把 100 改成 300，节奏会怎样？', { x: rx + 0.2, y: G.top + 1.1 + mh + 0.15, w: rw - 0.4, h: G.bottom - 0.12 - (G.top + 1.1 + mh + 0.15), size: 12 });
  }

  // ================================================================ summary
  deck.section('小结');
  s = slide({
    title: '本节小结：四个传感器，一个骨架',
    desc: '四个程序都是“读 → 打印 → 判断 → 输出”；变的只是引脚号，以及触发时读到 0 还是 1',
    notes: '用这张表把四个实验串起来：骨架不变，变的只有输入脚、触发时读到几、if 的条件和控制的输出。请学生合上课件，说出每一行的“触发时读到几”。最后强调三件事：== 是比较、A0～A5 也能当数字口、注释只给人看。下节课遇到新的开关类传感器，先用串口看它触发时是 0 还是 1，再套这个骨架。',
  });
  {
    const gap = 0.35, bw = (G.cw - gap * 3) / 4, bh = 0.72, y = G.top;
    const st = [['读', 'digitalRead()'], ['打印', 'Serial.println()'], ['判断', 'if … else'], ['输出', 'digitalWrite()']];
    st.forEach(([t, c], i) => {
      const x = G.L + i * (bw + gap);
      V.card(s, { x, y, w: bw, h: bh, fill: i === 2 ? P.ink : P.turqPale });
      txt(s, [R(`${i + 1}  ${t}`, { bold: true, breakLine: true, color: i === 2 ? P.turq : P.ink }), R(c, { fontFace: V.MONO })], { x: x + 0.16, y, w: bw - 0.24, h: bh, size: 11.5, valign: 'middle', color: i === 2 ? P.white : P.ink, lineSpacingMultiple: 1.05 });
      if (i < 3) V.arrow(s, x + bw + 0.05, y + bh / 2, x + bw + gap - 0.05, y + bh / 2, { color: P.muted });
    });
    const ty = y + bh + 0.3, rh = 0.33;
    const b = (t) => ({ text: t, bold: true });
    V.table(s, [
      ['传感器', '输入脚', '触发动作', '触发时读到', 'if 的条件', '控制的输出'],
      [b('按键模块'), '7', '按下', '0（LOW）', 'value == LOW', 'LED（11）'],
      [b('触摸开关模块'), 'A0', '摸到', '1（HIGH）', 'val==1', '灯（A5）'],
      [b('限位开关模块'), '10', '压下', '0', 'val==0', 'LED（11）'],
      [b('倾斜开关模块'), '12', '看串口', '0 时报警', 'val==0', '灯（11）＋ 蜂鸣器（13）'],
    ], { x: G.L, y: ty, w: G.cw, colW: [1.5, 0.8, 1.05, 1.3, 1.75, 2.7], rowH: rh, size: 12, align: ['left', 'center', 'center', 'center', 'center', 'left'] });
    const cy = ty + 5 * rh + 0.3, chh = G.bottom - cy, cgap = 0.3, cw = (G.cw - 2 * cgap) / 3;
    const K = [[I.check, '== 是比较，= 是赋值'], [I.exchange, 'A0～A5 也能当数字口'], [I.note, '注释只给人看，以代码为准']];
    K.forEach(([ic, t], i) => {
      const x = G.L + i * (cw + cgap);
      V.card(s, { x, y: cy, w: cw, h: chh });
      V.iconCircle(s, ic, { x: x + 0.14, y: cy + (chh - 0.36) / 2, d: 0.36 });
      txt(s, t, { x: x + 0.62, y: cy, w: cw - 0.72, h: chh, size: 12.5, bold: true, valign: 'middle' });
    });
    if (chh < 0.5) warn('summary key cards short');
  }

  // ================================================================ end
  deck.end({
    title: '一个骨架，四种感知',
    subtitle: '学会了数字输入，Arduino 就能“听见”按键、手指、碰撞和倾斜。\n把它们用进你的设计吧！',
    notes: '课后任务：从四个传感器里选一个，设计一个小装置，比如隐藏式触摸台灯、抽屉防盗报警器、走到头会停的小车，下节课分享。提醒学生：先用串口确认传感器触发时是 0 还是 1，再写判断。',
  });

  await deck.save(OUT);
  console.log('saved', OUT);
  if (warns.length) console.log(`${warns.length} layout warning(s)`);
})().catch((e) => { console.error(e); process.exit(1); });
