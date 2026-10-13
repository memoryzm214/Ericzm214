// 2-2 测距、通信与环境感知：指南里的四个实验，按指南顺序一份 PPT
//   ① 超声波模块实验 ② 串口调节舵机角度实验 ③ 红外避障模块实验 ④ 温湿度传感器模块实验
// Source: assets/l22/guide_text.md (PDF p1-21). Run: node build/22_lesson_2-2.js
// mBlock / Mixly parts of the guide are intentionally left out.
const V = require('../lib/vti');
const { P, G } = V;

const OUT = __dirname + '/../output/2-2_超声波_串口舵机_红外避障_温湿度.pptx';

// ------------------------------------------------------------------ programs
// ① Ultrasonic: the guide's program box is blank. Program from the same kit's
//    《Arduino 编程入门学习教程》lesson 2.38 (same pins: Trig 2, Echo 3).
const ULTRA_CODE = `const int TrigPin = 2;
const int EchoPin = 3;
float distance;
void setup()
{
  Serial.begin(9600);
  pinMode(TrigPin, OUTPUT);
  pinMode(EchoPin, INPUT);
  Serial.println("Ultrasonic sensor:");
}
void loop()
{
  digitalWrite(TrigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(TrigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(TrigPin, LOW);
  distance = pulseIn(EchoPin, HIGH) / 58.00;
  Serial.print("distance is :");
  Serial.print(distance);
  Serial.print("cm");
  Serial.println();
  delay(1000);
}`;

// ② Serial servo: copied from the guide, indent unified. The comment of `temp += inByte;`
//    was broken over two lines by the PDF layout; joined back into one line (line 18).
const SERVO_CODE = `#include <Servo.h>
Servo myservo;
int ServoPin = 13;
char inByte = 0;
int angle = 0;
String temp = "";//Temporary character variables, or use it for the cache
void setup()
{
  Serial.begin(9600); //Set the baud rate
  pinMode(ServoPin, OUTPUT);
  myservo.attach(ServoPin);
}
void loop()
{
  while (Serial.available() > 0) //Determine whether the serial data
  {
    inByte = Serial.read();//Read data, the serial port can only read 1 character
    temp += inByte;//The characters read into temporary variables inside the cache, Continue to determine the serial port there is no data, know all the data read out
  }

  if (temp != "")// Determine whether the temporary variable is empty
  {
    angle = temp.toInt();    //Convert variable string type to integer
    Serial.print("Servo degree: ");
    Serial.println(angle);
    //Control the servo to rotate the corresponding angle.
  }
  temp = "";//Please see temporary variables
  myservo.write(angle);
  delay(100);//Delayed 100 milliseconds

}`;

// ③ IR obstacle: the guide's program box is blank. Program from the same kit's
//    《Arduino 编程入门学习教程》lesson 2.25 (same pins: OUT 12, LED 11, buzzer 13).
const IR_CODE = `int Led=11;
int Buzzer_pin=13;
int Sensor_PIN=12;
int val=0;
void setup()
{
  pinMode(Led,OUTPUT);
  pinMode(Buzzer_pin,OUTPUT);
  pinMode(Sensor_PIN,INPUT);
  Serial.begin(9600);
}
void loop()
{
  val=digitalRead(Sensor_PIN);
  Serial.println(val);
  if(val==0)
  {
    digitalWrite(Led,HIGH);
    digitalWrite(Buzzer_pin,HIGH);
  }
  else
  {
    digitalWrite(Led,LOW);
    digitalWrite(Buzzer_pin,LOW);
  }
}`;

// ④ DHT11 + LCD1602: copied from the guide, indent unified.
const DHT_CODE = `#include <Wire.h>
#include"dht11.h"
#include "LiquidCrystal_I2C.h"

#define    DHT11PIN     8
dht11 DHT11;
LiquidCrystal_I2C lcd(0x27, 16, 2);// 0x27 is the I2C bus address for an unmodified backpack
void setup() {
  pinMode(DHT11PIN, OUTPUT);
  lcd.init();
  lcd.backlight();
  Serial.begin(9600);
}

void loop() {
  int chk = DHT11.read(DHT11PIN);
  lcd.setCursor(0, 0);
  lcd.print("Tep: ");
  lcd.print((float)DHT11.temperature, 2);
  lcd.print("C");
  lcd.setCursor(0, 1);
  lcd.print("Hum: ");
  lcd.print((float)DHT11.humidity, 2);
  lcd.print("%");
  delay(200);
}`;

// ------------------------------------------------------------------ local helpers (lib/vti.js is shared; not edited)
const warns = [];
let SLIDE_NO = 0;
function warn(msg) { warns.push(`[${SLIDE_NO}] ${msg}`); console.warn(`LAYOUT [slide ${SLIDE_NO}]:`, msg); }

// Estimated rendered height of wrapped text (+10% slack for CJK rendering).
function hOf(str, w, size, ls = 1.3) { return V.textH(str, w, size, ls) * 1.1; }

function plainOf(t) {
  if (typeof t === 'string') return t;
  return t.map((r) => r.text + (r.options && r.options.breakLine ? '\n' : '')).join('');
}

// Text box that warns when the estimated text height exceeds the box.
function txt(s, t, o) {
  if (o.h != null) {
    const need = hOf(plainOf(t), o.w, o.size || 14, 1.25);
    if (need > o.h + 0.03) warn(`text may overflow (${need.toFixed(2)} > ${o.h.toFixed(2)}): ${plainOf(t).slice(0, 30)}`);
  }
  V.text(s, t, o);
}
// One-line label: warns when wider than its box.
function label(s, t, o) {
  const w = o.mono ? V.monoW(plainOf(t), o.size || 14) : V.textW(plainOf(t), o.size || 14);
  if (w > o.w) warn(`label too wide (${w.toFixed(2)} > ${o.w.toFixed(2)}): ${plainOf(t)}`);
  V.text(s, t, { valign: 'middle', ...o });
}

// pptxgenjs mutates run option objects in place, so every run gets its own fresh options object.
const R = (text, opt) => ({ text, options: { ...(opt || {}) } });
const M = (text, opt) => R(text, { fontFace: V.MONO, ...(opt || {}) });

// Copy of the code tokenizer in vti.js (not exported) for small inline code chips.
const KW = new Set(['void', 'int', 'float', 'double', 'char', 'long', 'bool', 'byte', 'const', 'unsigned', 'String', 'if', 'else', 'for', 'while', 'return', 'true', 'false']);
const FN = new Set(['pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'delayMicroseconds', 'pulseIn', 'setup', 'loop', 'Serial', 'begin', 'print', 'println', 'available', 'read', 'write', 'attach', 'toInt', 'constrain', 'init', 'backlight', 'setCursor']);
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
    if ((m = rest.match(/^#\s*\w+/))) { push(m[0], 'pre'); i += m[0].length; continue; }
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
function miniCode(s, code, o) {
  const size = o.size || 11;
  const lines = code.split('\n');
  const lh = size * 1.4 / 72;
  const padX = 0.14;
  const h = o.h || lines.length * lh + 0.18;
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

// ---- code block (adapted copy of vti.codeBlock) ----
// The shared codeBlock re-tokenizes the continuation rows of a wrapped line on their own, so the tail of a
// long `// comment` is coloured as code (e.g. "for" / "read" highlighted). This copy keeps the comment
// colour on continuation rows and also colours hex literals (0x27) as numbers. Sizing is identical.
const CB_KW = new Set(['void', 'int', 'float', 'double', 'char', 'long', 'short', 'bool', 'boolean', 'byte', 'word', 'String', 'const', 'unsigned', 'signed', 'static', 'if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue', 'switch', 'case', 'default', 'true', 'false']);
const CB_FN = new Set(['pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'delayMicroseconds', 'millis', 'micros', 'map', 'constrain', 'min', 'max', 'abs', 'pow', 'sqrt', 'sq', 'random', 'tone', 'noTone', 'pulseIn', 'setup', 'loop', 'Serial', 'begin', 'print', 'println', 'available', 'read', 'write']);
const CB_CONSTS = /^(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|A[0-5]|LED_BUILTIN|DEC|HEX|BIN)$/;
function cbTokenize(line) {
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
      push(w, CB_KW.has(w) ? 'kw' : CB_CONSTS.test(w) ? 'num' : CB_FN.has(w) ? 'fn' : 'base'); i += w.length; continue;
    }
    if ((m = rest.match(/^\s+/))) { push(m[0], out.length ? out[out.length - 1].k : 'base'); i += m[0].length; continue; }
    push(rest[0], 'punct'); i += 1;
  }
  return out;
}
function cbWide(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x2E80 && c <= 0x9FFF) || (c >= 0xF900 && c <= 0xFAFF) || (c >= 0xFF00 && c <= 0xFF60) ||
    (c >= 0x3000 && c <= 0x303F) || (c >= 0xFE30 && c <= 0xFE4F) || c === 0x2014 || c === 0x2026 ||
    (c >= 0x2018 && c <= 0x201D) || (c >= 0x2460 && c <= 0x24FF) || (c >= 0x25A0 && c <= 0x25FF);
}
function cbCols(str) { let n = 0; for (const ch of str) n += cbWide(ch) ? 2 : 1; return n; }
function cbFit(str, max) { let n = 0, i = 0; for (const ch of str) { n += cbWide(ch) ? 2 : 1; if (n > max) break; i += ch.length; } return i; }
// Same wrapping rule as vti, but each row also records where its text starts in the original line.
function cbWrap(line, max) {
  if (cbCols(line) <= max) return [{ t: line, off: 0 }];
  const rows = [];
  const indent = (line.match(/^\s*/)[0].length) + 2;
  let cur = line, off = 0, pad = 0;
  while (cbCols(cur) > max) {
    const fit = cbFit(cur, max);
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
// Index where a `//` comment starts in a source line (outside string literals), or -1.
function cbCommentAt(line) {
  let q = null;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === '\'') { q = c; continue; }
    if (c === '/' && line[i + 1] === '/') return i;
  }
  return -1;
}
function codeBlock2(slide, o) {
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
    const max = Math.floor((o.w - 2 * padX - gutter) / charW);
    rows = [];
    for (let n = from; n <= to; n++) {
      const src = all[n - 1] ?? '';
      const ca = cbCommentAt(src);
      cbWrap(src, max).forEach((r, j) => rows.push({ n, t: r.t, cont: j > 0, com: j > 0 && ca >= 0 && r.off >= ca }));
    }
    if (rows.length * lh <= innerH + 0.001) break;
    if (size <= 9.5) throw new Error(`codeBlock2: lines ${from}-${to} (${rows.length} rows) do not fit in h=${o.h}; split the code across slides`);
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
    const toks = r.com ? [{ t: r.t, k: 'com' }] : cbTokenize(r.t);
    const runs = toks.length ? toks.map((tk) => R(tk.t, { color: CODE_COL[tk.k], italic: tk.k === 'com', bold: tk.k === 'kw' || tk.k === 'fn' })) : [R(' ')];
    slide.addText(runs, {
      x: o.x + padX + gutter, y, w: o.w - 2 * padX - gutter, h: lh,
      fontFace: V.MONO, fontSize: size, color: CODE_COL.base, margin: 0, valign: 'middle', isTextBox: true, fit: 'none',
    });
  });
  return { lineY: (n) => lineY[n], bottom: y0 + rows.length * lh, size, rows: rows.length };
}

// Conservative height for short Latin/CJK mixes (LibreOffice renders Latin runs a little wider than textW).
function hSafe(str, w, size) { return hOf(str, w * 0.88, size, 1.25); }

// Straight segment without arrow head / polyline (last segment may get a head).
function seg(s, x1, y1, x2, y2, o = {}) {
  V.arrow(s, x1, y1, x2, y2, { noHead: true, color: o.color || P.ink, width: o.width || 1.5, dash: o.dash });
}
function polyline(s, pts, o = {}) {
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
    if (Math.abs(x1 - x2) < 1e-4 && Math.abs(y1 - y2) < 1e-4) continue;
    const last = i === pts.length - 1;
    V.arrow(s, x1, y1, x2, y2, { noHead: !(last && o.head), color: o.color || P.ink, width: o.width || 1.5, dash: o.dash });
  }
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
    if (cy + pad - 0.04 + bigH * 0.85 > titleY) warn(`tile crowded: ${it.title}`);
    if ((it.bigMono ? V.monoW(it.big || '', bigSize) : V.textW(it.big || '', bigSize)) > iw) warn(`tile big too wide: ${it.big}`);
    if (V.textW(it.title || '', titleSize) > iw) warn(`tile title too wide: ${it.title}`);
  });
}

// Light-gray card with an icon circle and a title row. Returns the y where body content may start.
function iconCard(s, ic, title, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill, line: o.line, lineW: o.lineW });
  const d = o.d || 0.42;
  V.iconCircle(s, ic, { x: o.x + 0.2, y: o.y + 0.17, d, fill: o.iconFill });
  label(s, title, { x: o.x + 0.2 + d + 0.14, y: o.y + 0.17, w: o.w - d - 0.5, h: d, size: o.titleSize || 15, bold: true, mono: o.mono, color: o.titleColor });
  return o.y + 0.17 + d + 0.12;
}

// Red-outlined "problem" card: red icon + red title, explanation below.
function warnCard(s, ic, title, body, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.white, line: P.red, lineW: 1 });
  const d = 0.34, pad = 0.18;
  V.iconCircle(s, ic, { x: o.x + pad, y: o.y + pad, d, fill: P.red });
  label(s, title, { x: o.x + pad + d + 0.12, y: o.y + pad, w: o.w - 2 * pad - d - 0.12, h: d, size: 13.5, bold: true, color: P.red });
  const by = o.y + pad + d + 0.12;
  txt(s, body, { x: o.x + pad, y: by, w: o.w - 2 * pad, h: o.y + o.h - pad + 0.04 - by, size: o.size || 12 });
}

// Component chip: icon circle + label.
function compCard(s, ic, text, x, y, w, h, size = 12.5) {
  V.card(s, { x, y, w, h });
  const d = 0.34;
  V.iconCircle(s, ic, { x: x + 0.12, y: y + (h - d) / 2, d });
  txt(s, text, { x: x + 0.12 + d + 0.12, y, w: w - d - 0.32, h, size, valign: 'middle' });
}

// Numbered list (number circles + text). Returns bottom y.
function numList(s, items, o) {
  const size = o.size || 13, d = o.d || 0.3, gap = o.gap ?? 0.16;
  let y = o.y;
  items.forEach((t, i) => {
    const tw = o.w - d - 0.14;
    const th = hOf(plainOf(t), tw, size, 1.25);
    const rowH = Math.max(d, th);
    V.numCircle(s, o.labels ? o.labels[i] : i + 1, { x: o.x, y, d, size: 11, fill: o.fill, color: o.color });
    txt(s, t, { x: o.x + d + 0.14, y: y + (th < d ? (d - th) / 2 : -0.01), w: tw, h: th + 0.02, size, lineSpacingMultiple: 1.15 });
    y += rowH + gap;
  });
  return y - gap;
}

// Lead line + body paragraph. Returns bottom y.
function lead(s, title, body, o) {
  const size = o.size || 13;
  label(s, title, { x: o.x, y: o.y, w: o.w, h: 0.32, size: o.leadSize || 15, bold: true });
  const bh = hOf(plainOf(body), o.w, size, 1.25);
  txt(s, body, { x: o.x, y: o.y + 0.38, w: o.w, h: bh, size });
  return o.y + 0.38 + bh;
}

// Rounded flowchart box with centred label(s).
function fbox(s, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill || P.card, line: o.line, radius: o.radius ?? 0.08 });
  const dark = o.fill === P.ink;
  txt(s, o.text, { x: o.x + 0.06, y: o.y, w: o.w - 0.12, h: o.h, size: o.size || 12.5, bold: o.bold ?? true, align: 'center', valign: 'middle', color: o.color || (dark ? P.white : P.ink), mono: o.mono, lineSpacingMultiple: 1.1 });
}

// Card with a one-line icon + text (valign middle). Returns nothing.
function noteStrip(s, ic, t, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill || P.turqPale, line: o.line, lineW: 1 });
  const d = o.d || 0.36;
  V.iconCircle(s, ic, { x: o.x + 0.16, y: o.y + (o.h - d) / 2, d, fill: o.iconFill });
  txt(s, t, { x: o.x + 0.16 + d + 0.14, y: o.y + 0.04, w: o.w - d - 0.46, h: o.h - 0.08, size: o.size || 12, valign: 'middle' });
}

// "New syntax" concept card: icon + title, analogy, mini example, red "common mistake" box at the bottom.
function conceptCard(s, I, o) {
  const { x, y, w, h } = o;
  V.card(s, { x, y, w, h });
  const pad = 0.18, d = 0.36, iw = w - 2 * pad;
  V.iconCircle(s, o.icon, { x: x + pad, y: y + 0.16, d });
  label(s, o.title, { x: x + pad + d + 0.12, y: y + 0.16, w: iw - d - 0.12, h: d, size: o.titleSize || 13, bold: true, mono: o.mono });
  let cy = y + 0.16 + d + 0.12;
  const ah = hSafe(plainOf(o.text), iw, 12);
  txt(s, o.text, { x: x + pad, y: cy, w: iw, h: ah, size: 12 });
  cy += ah + 0.08;
  cy += miniCode(s, o.code, { x: x + pad, y: cy, w: iw, size: o.codeSize || 10.5 });
  if (o.extra) cy = o.extra(cy + 0.14);
  if (o.compact) {
    // one red line under the example: icon + "常见错误：" + text
    const mtw = iw - 0.34;
    const mth = hSafe('常见错误：' + o.mistake, mtw, 12);
    const my = cy + 0.14;
    if (my + mth > y + h - 0.08) warn(`concept card crowded (${(my + mth - y - h + 0.1).toFixed(2)} over): ${o.title}`);
    V.iconCircle(s, I.times_w, { x: x + pad, y: my + 0.01, d: 0.24, fill: P.red });
    txt(s, [R('常见错误：', { bold: true, color: P.red }), R(o.mistake)], { x: x + pad + 0.34, y: my - 0.01, w: mtw, h: mth, size: 12 });
    return;
  }
  const mtw = iw - 0.28;
  const mth = hSafe(o.mistake, mtw, 12);
  const mh = 0.12 + 0.26 + 0.06 + mth + 0.1;
  const my = y + h - 0.16 - mh;
  if (my < cy + 0.1) warn(`concept card crowded (${(cy + 0.1 - my).toFixed(2)} over): ${o.title}`);
  V.card(s, { x: x + pad, y: my, w: iw, h: mh, fill: P.white, line: P.red, lineW: 1, radius: 0.08 });
  V.iconCircle(s, I.times_w, { x: x + pad + 0.13, y: my + 0.12, d: 0.26, fill: P.red });
  label(s, '常见错误', { x: x + pad + 0.47, y: my + 0.12, w: 1.5, h: 0.26, size: 12, bold: true, color: P.red });
  txt(s, o.mistake, { x: x + pad + 0.14, y: my + 0.44, w: mtw, h: mth, size: 12 });
}

// Pin chip: dark mono pill + description.
function pinRow(s, pin, desc, x, y, w, pillW = 0.7) {
  V.pill(s, { x, y: y + 0.02, w: pillW, h: 0.28, text: pin, size: 11, fill: P.ink, color: P.white, mono: true });
  label(s, desc, { x: x + pillW + 0.1, y, w: w - pillW - 0.1, h: 0.32, size: 12 });
}

// LCD1602 drawing: charcoal bezel, turquoise screen, two mono lines.
function lcdMock(s, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.ink, radius: 0.1 });
  const ix = o.x + 0.14, iy = o.y + 0.14, iw = o.w - 0.28, ih = o.h - 0.28;
  s.addShape('rect', { x: ix, y: iy, w: iw, h: ih, fill: { color: P.turq }, line: { color: P.turq, width: 0 } });
  const size = o.size || 16;
  o.lines.forEach((ln, i) => {
    label(s, ln, { x: ix + 0.16, y: iy + i * ih / 2, w: iw - 0.32, h: ih / 2, size, mono: true, bold: true });
  });
}

// Servo dial: circle + arrow. 0° points left, 90° up, 180° right (as in the guide's picture).
function dial(s, cx, cy, r, deg) {
  s.addShape('ellipse', { x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, fill: { color: P.white }, line: { color: P.ink, width: 1.25 } });
  const a = deg * Math.PI / 180;
  V.arrow(s, cx, cy, cx - 0.78 * r * Math.cos(a), cy - 0.78 * r * Math.sin(a), { color: P.turqDeep, width: 2.25 });
  s.addShape('ellipse', { x: cx - 0.04, y: cy - 0.04, w: 0.08, h: 0.08, fill: { color: P.ink }, line: { color: P.ink, width: 0 } });
}

// ------------------------------------------------------------------ build
(async () => {
  const deck = await V.Deck.create({ label: '2-2　测距、通信与环境感知', title: '2-2 测距、通信与环境感知：超声波 · 串口调节舵机 · 红外避障 · 温湿度传感器' });
  const I = await deck.loadIcons({
    bulb: 'FaLightbulb', warn: 'FaExclamation', check: 'FaCheck', times: 'FaTimes', chip: 'FaMicrochip', grid: 'FaTh',
    usb: 'TbDeviceUsb', cable: 'MdCable', volume: 'FaVolumeUp', target: 'FaBullseye', book: 'FaBook', search: 'FaSearch',
    wrench: 'FaWrench', eye: 'FaEye', redo: 'FaRedo', clock: 'FaClock', ruler: 'FaRulerHorizontal', tower: 'FaBroadcastTower',
    keyboard: 'FaKeyboard', cog: 'FaCog', cogs: 'FaCogs', thermo: 'FaThermometerHalf', tint: 'FaTint', envelope: 'FaEnvelope',
    link: 'FaLink', puzzle: 'FaPuzzlePiece', battery: 'FaBatteryFull', robot: 'FaRobot', car: 'FaCar', stopwatch: 'FaStopwatch',
    calc: 'FaCalculator', lock: 'FaLock', tag: 'FaTag', box: 'FaBoxOpen', comments: 'FaComments', plug: 'FaPlug',
    bolt: 'FaBolt', hand: 'FaHandPaper', wave: 'FaWaveSquare', tv: 'FaTv', layer: 'FaLayerGroup', bat: 'GiBat',
    sync: 'FaSyncAlt', sliders: 'FaSlidersH', question: 'FaQuestion', tools: 'FaTools', pencil: 'FaPencilAlt',
    terminal: 'FaTerminal', hashtag: 'FaHashtag', quote: 'FaQuoteRight', users: 'FaUserFriends', sun: 'FaSun', inbox: 'FaInbox',
    code: 'FaCode', compass: 'FaCompass', signal: 'FaSignal', tach: 'FaTachometerAlt',
  });

  const slide = (o) => {
    SLIDE_NO += 1;
    if (/[。.]$/.test(o.title)) throw new Error('title ends with a period: ' + o.title);
    if (V.textW(o.title, 24) > 8.8) warn(`title long: ${o.title}`);
    if (V.textW(o.desc, 12) > 8.9) warn(`desc long (${V.textW(o.desc, 12).toFixed(2)}): ${o.desc}`);
    if (!o.notes) throw new Error('notes missing: ' + o.title);
    return deck.slide(o);
  };
  const divider = (o) => { SLIDE_NO += 1; if (!o.notes) throw new Error('notes missing: ' + o.title); return deck.divider(o); };

  // ================================================================ cover
  SLIDE_NO += 1;
  deck.cover({
    kicker: '开源硬件与 AI 辅助编程　/　实验 2-2',
    title: '2-2　测距、通信与环境感知',
    subtitle: '超声波 · 串口调节舵机\n红外避障 · 温湿度传感器',
    notes: '这节课按指南顺序做四个实验：超声波测距、串口调节舵机角度、红外避障、温湿度传感器。它们有一条共同的主线：传感器不只会“感觉”，还会“测量”，还会用自己的方式和 Arduino“说话”。开场可以挥挥手、哈口气，让学生猜猜：Arduino 怎么知道手有多远、空气有多潮？',
  });

  // ================================================================ overview
  deck.section('导入');
  let s = slide({
    title: '本节导览',
    desc: '四个实验，一条主线：传感器不只会“感觉”，还会“测量”，还会和 Arduino“说话”',
    notes: '先给学生一张地图：四个实验按指南顺序进行。超声波学“测时间算距离”，串口舵机学“读字符拼数字”，红外避障是熟悉的数字输入，温湿度传感器学“按约定的时序收数据”，并第一次用到库和对象。下面四个小标签就是每个实验最核心的一句话。',
  });
  {
    const n = 4, gap = 0.25, cw = (G.cw - gap * (n - 1)) / n, ch = 2.75, y = G.top, pad = 0.18, iw = cw - 2 * pad;
    const ex = [
      { k: '实验一', ic: I.tower, t: '超声波模块实验', d: '像蝙蝠一样听回声，算出前方有多远', tags: ['const', 'pulseIn()', '÷ 58'], key: '测时间 → 算距离' },
      { k: '实验二', ic: I.keyboard, t: '串口调节舵机角度实验', d: '在电脑上输入角度，舵机就转过去', tags: ['available()', 'read()', 'toInt()'], key: '读字符 → 拼数字' },
      { k: '实验三', ic: I.eye, t: '红外避障模块实验', d: '前面有东西，就亮灯、报警', tags: ['digitalRead()', 'if / else'], key: '读高低 → 做判断' },
      { k: '实验四', ic: I.thermo, t: '温湿度传感器模块实验', d: '读出温度和湿度，显示在 LCD 屏上', tags: ['#include', '对象.成员'], key: '按时序 → 收数据' },
    ];
    ex.forEach((e, i) => {
      const x = G.L + i * (cw + gap);
      V.card(s, { x, y, w: cw, h: ch, fill: i === 0 ? P.turqPale : P.card });
      V.pill(s, { x: x + pad, y: y + 0.24, text: e.k, size: 10.5, fill: P.ink, color: P.white });
      V.iconCircle(s, e.ic, { x: x + cw - pad - 0.48, y: y + 0.16, d: 0.48 });
      txt(s, e.t, { x: x + pad, y: y + 0.7, w: iw, h: 0.56, size: 14, bold: true });
      txt(s, e.d, { x: x + pad, y: y + 1.38, w: iw, h: 0.56, size: 12, color: P.ink });
      const b = V.tags(s, e.tags, { x: x + pad, y: y + 2.0, w: iw, size: 10 });
      if (b > y + ch - 0.1) warn('overview tags overflow ' + e.t);
      // key idea strip under each card
      const ky = y + ch + 0.3, kh = G.bottom - ky;
      V.card(s, { x, y: ky, w: cw, h: kh, fill: i === 0 ? P.turq : P.white, line: i === 0 ? undefined : P.gray2 });
      label(s, e.key, { x: x + 0.1, y: ky, w: cw - 0.2, h: kh, size: 13, bold: true, align: 'center' });
      if (i < n - 1) V.arrow(s, x + cw + 0.03, ky + kh / 2, x + cw + gap - 0.03, ky + kh / 2, { color: P.muted });
    });
  }

  // ================================================================ EXPERIMENT 1: ULTRASONIC
  deck.section('实验一　超声波');
  divider({
    kicker: '实验 01',
    title: '超声波模块实验',
    desc: '超声波模块会“喊一声、听回声”：测出声音来回用了多少时间，就能算出前方物体有多远。顺带学会三个新词：const、delayMicroseconds() 和 pulseIn()。',
    tiles: [
      { fill: P.turq, big: '01', title: '原理', sub: '回声 · s = 340 × t ÷ 2', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: 'Trig → 2，Echo → 3', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: 'pulseIn() · ÷ 58', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '串口里看距离', subSize: 12 },
    ],
    notes: '实验一分四步：先弄懂“回声测距”的原理和公式，再接四根线，然后学三个新语法、逐行读代码，最后在串口监视器里看距离。可以先让学生对着墙拍一下手，体会“声音会反射回来”。',
  });

  // ---------------------------------------------------------------- U: intro
  s = slide({
    title: '认识超声波模块：像蝙蝠一样“听回声”',
    desc: '模块一边“喊”（发出超声波），一边“听”（接收回声），用声音来回的时间算出距离',
    notes: '用蝙蝠和山谷回声来类比：喊一声，回声越晚回来，说明山越远。模块上的两个“眼睛”其实是一个发射器、一个接收器。超声波频率是 40kHz，人耳最多只能听到约 20kHz，所以我们听不见它。原指南的实验目的写“通过串口输入距离”，这里应为“输出”，讲课时顺口纠正。',
  });
  {
    const lw = 4.35;
    let y = lead(s, '生活里的类比', '蝙蝠在黑暗里飞行时会发出超声波，听回声就知道前面有没有障碍物。对着山谷喊一声，回声越晚回来，山就越远。', { x: G.L, y: G.top, w: lw, size: 13 }) + 0.22;
    y = numList(s, [
      '发射器发出超声波，同时开始计时',
      '超声波碰到障碍物，立刻反射回来',
      '接收器听到回声，停止计时，得到时间 t',
    ], { x: G.L, y, w: lw, size: 13, gap: 0.14 });
    const py = Math.max(y + 0.3, 4.15), ph = G.bottom - py;
    V.card(s, { x: G.L, y: py, w: lw, h: ph, fill: P.turqPale });
    V.iconCircle(s, I.target, { x: G.L + 0.16, y: py + (ph - 0.36) / 2, d: 0.36 });
    txt(s, [R('实验目的　', { bold: true }), R('通过串口显示测到的距离', { breakLine: true }), R('原指南写“通过串口输入”，应为“输出”', { color: P.muted })],
      { x: G.L + 0.64, y: py + 0.03, w: lw - 0.76, h: ph - 0.06, size: 12, valign: 'middle' });
    if (ph < 0.75) warn('purpose card short');
    const rx = 5.1, rw = G.R - rx, ih = 2.2;
    V.imageBox(s, { file: 'l22/ultra_result_photo.jpg', x: rx, y: G.top, w: rw, h: ih, caption: '原指南实验照片：右边就是超声波模块' });
    const cy = G.top + ih + 0.3, chh = G.bottom - cy;
    V.card(s, { x: rx, y: cy, w: rw, h: chh });
    const cw2 = (rw - 0.5) / 2;
    const pins = [['Vcc', '电源 5V'], ['Trig', '触发：“喊”'], ['GND', '接地'], ['Echo', '回声：“听”']];
    pins.forEach(([p, d], i) => {
      pinRow(s, p, d, rx + 0.2 + (i % 2) * (cw2 + 0.1), cy + 0.17 + Math.floor(i / 2) * 0.44, cw2, 0.62);
    });
  }

  // ---------------------------------------------------------------- U: principle
  s = slide({
    title: '测距原理：距离 = 340 × t ÷ 2',
    desc: '声音跑了一个来回，所以算出的路程要除以 2；换成厘米和微秒，就是“回波时间 ÷ 58”',
    notes: '先讲上面的图：声音从模块出发，碰到障碍物再回来，走过的路是距离的两倍，所以要除以 2。再讲下面三步：把 340 米/秒换成 0.034 厘米/微秒，来回 1 厘米要走 2 厘米，约 58 微秒，于是“微秒数 ÷ 58 = 厘米”。可以让学生算一算：回波时间 580 微秒是多远？（10 厘米）',
  });
  {
    const ax = G.L, aw = 5.5, ah = 1.95, ay = G.top;
    V.card(s, { x: ax, y: ay, w: aw, h: ah });
    label(s, '声音走了一个来回', { x: ax + 0.2, y: ay + 0.12, w: 2.5, h: 0.3, size: 13, bold: true });
    // module
    const mx = ax + 0.3, my = ay + 0.55, mw = 0.62, mh = 1.0;
    V.card(s, { x: mx, y: my, w: mw, h: mh, fill: P.ink, radius: 0.08 });
    [['发', 0.08], ['收', 0.56]].forEach(([t, dy]) => {
      s.addShape('ellipse', { x: mx + 0.14, y: my + dy, w: 0.34, h: 0.34, fill: { color: P.turq }, line: { color: P.turq, width: 0 } });
      V.text(s, t, { x: mx + 0.14, y: my + dy, w: 0.34, h: 0.34, size: 10, bold: true, align: 'center', valign: 'middle' });
    });
    label(s, '超声波模块', { x: mx - 0.15, y: my + mh + 0.04, w: 0.95, h: 0.24, size: 10, color: P.muted, align: 'center' });
    // wall
    const wx = ax + aw - 0.62;
    s.addShape('rect', { x: wx, y: ay + 0.5, w: 0.24, h: 1.2, fill: { color: P.gray2 }, line: { color: P.muted, width: 1 } });
    label(s, '障碍物', { x: wx - 0.35, y: ay + 0.14, w: 0.95, h: 0.28, size: 11, bold: true, align: 'center' });
    // go / back
    const x1 = mx + mw + 0.12, x2 = wx - 0.1, gy = my + 0.25, by = my + 0.62;
    V.arrow(s, x1, gy, x2, gy, { color: P.turqDeep, width: 2.25 });
    V.arrow(s, x2, by, x1, by, { color: P.ink, width: 2.25, dash: 'dash' });
    label(s, '① 发出超声波（去）', { x: x1 + 0.3, y: gy - 0.32, w: 2.3, h: 0.26, size: 11, bold: true });
    label(s, '② 碰到障碍物反射（回）', { x: x1 + 0.3, y: by + 0.04, w: 2.4, h: 0.26, size: 11, bold: true });
    label(s, '来回一共走了 2 × s，用时 t', { x: x1 + 0.3, y: ay + ah - 0.33, w: 3.2, h: 0.26, size: 11, color: P.muted });
    // formula
    const fx = ax + aw + 0.3, fw = G.R - fx;
    V.card(s, { x: fx, y: ay, w: fw, h: ah, fill: P.turqPale });
    V.formula(s, { x: fx + 0.25, y: ay + 0.12, h: 0.85, lhs: 's =', num: '340 × t', den: '2', size: 22 });
    const lg = [[R('s', { bold: true }), R('：距离（米）')], [R('340', { bold: true }), R('：声速（米/秒）')], [R('t', { bold: true }), R('：声音来回的时间（秒）')]];
    lg.forEach((runs, i) => V.text(s, runs, { x: fx + 0.25, y: ay + 1.06 + i * 0.27, w: fw - 0.4, h: 0.26, size: 12, valign: 'middle' }));
    // why 58
    const ty = ay + ah + 0.3;
    label(s, '为什么程序里写的是 ÷ 58？', { x: G.L, y: ty, w: 4, h: 0.3, size: 13, bold: true });
    const sy = ty + 0.4, sh = G.bottom - sy, gap = 0.35, sw = (G.cw - 2 * gap) / 3;
    const st = [
      { k: '① 声速换个单位', v: '340 m/s = 0.034 cm/μs', fill: P.card },
      { k: '② 来回 1 cm 要走 2 cm', v: '2 ÷ 0.034 ≈ 58 μs', fill: P.card },
      { k: '③ 所以', v: '距离(cm) = t(μs) ÷ 58', fill: P.turq },
    ];
    st.forEach((c, i) => {
      const x = G.L + i * (sw + gap);
      V.card(s, { x, y: sy, w: sw, h: sh, fill: c.fill });
      label(s, c.k, { x: x + 0.2, y: sy + 0.1, w: sw - 0.4, h: 0.28, size: 12, color: i === 2 ? P.ink : P.muted });
      label(s, c.v, { x: x + 0.2, y: sy + 0.42, w: sw - 0.3, h: 0.4, size: 14.5, bold: true });
      if (i < 2) V.arrow(s, x + sw + 0.05, sy + sh / 2, x + sw + gap - 0.05, sy + sh / 2, { color: P.muted });
    });
  }

  // ---------------------------------------------------------------- U: timing
  s = slide({
    title: '时序图：Trig 喊一声，Echo 报时间',
    desc: 'Trig 给至少 10μs 高电平 → 模块自动发出 8 个 40kHz 脉冲 → Echo 高电平持续的时间 = 声音来回的时间',
    notes: '时序图从上往下读，横轴是时间；第一行是我们要做的：给 Trig 一个至少 10 微秒的高电平。第二行是模块自己完成的：发出 8 个 40kHz 的超声波脉冲。第三行是结果：Echo 变成高电平，高电平持续多久，声音就来回了多久。程序只需要“喊”和“量”两件事。',
  });
  {
    const iw = 6.3, ih = 2.95;
    V.imageBox(s, { file: 'l22/ultra_timing.jpg', x: G.L, y: G.top, w: iw, h: ih, diagram: true, caption: '原指南时序图：Trig 引脚 / 超声波发射器 / Echo 引脚' });
    const ny = G.top + ih + 0.25;
    noteStrip(s, I.stopwatch, [R('pulseIn()', { fontFace: V.MONO, bold: true }), R(' 是一块秒表：量出第三行 Echo 高电平有多长（微秒）')], { x: G.L, y: ny, w: iw, h: G.bottom - ny, d: 0.3 });
    const rx = G.L + iw + 0.3, rw = G.R - rx, gap = 0.3, ch = (G.ch - 2 * gap) / 3;
    const C = [
      { t: 'Trig pin', d: 'Arduino 给 ≥10μs 高电平\n= “测一次”的命令', fill: P.turqPale },
      { t: 'Ultrasonic Sender', d: '模块自动发 8 个 40kHz\n超声波脉冲', fill: P.card },
      { t: 'Echo Pin', d: '高电平持续的时间\n= 声音来回的时间 t', fill: P.card },
    ];
    C.forEach((c, i) => {
      const y = G.top + i * (ch + gap);
      V.card(s, { x: rx, y, w: rw, h: ch, fill: c.fill });
      V.numCircle(s, i + 1, { x: rx + 0.14, y: y + 0.12, d: 0.3, size: 11 });
      label(s, c.t, { x: rx + 0.52, y: y + 0.09, w: rw - 0.6, h: 0.36, size: 12, bold: true, mono: true });
      txt(s, c.d, { x: rx + 0.14, y: y + 0.47, w: rw - 0.24, h: ch - 0.5, size: 12 });
    });
  }

  // ---------------------------------------------------------------- U: parts + wiring
  s = slide({
    title: '组件清单与接线',
    desc: 'VCC 接 5V、GND 接 GND；Trig 接 2 号脚（Arduino 发命令），Echo 接 3 号脚（Arduino 收结果）',
    notes: '只要四根线。表里 Arduino 一侧写的 VCC 就是 UNO 上的 5V 口。重点让学生分清 Trig 和 Echo 的方向：Trig 是 Arduino 发给模块的命令，所以程序里设成 OUTPUT；Echo 是模块送回来的结果，所以设成 INPUT。接线前先拔掉 USB。',
  });
  {
    const iw = 3.95;
    V.imageBox(s, { file: 'l22/ultra_wiring.jpg', x: G.L, y: G.top, w: iw, h: G.ch, diagram: true, caption: '原指南接线图' });
    const rx = G.L + iw + 0.35, rw = G.R - rx, rowH = 0.3;
    const tb = V.wiring(s, { x: rx, y: G.top, w: rw, left: 'Arduino Uno', right: 'Ultrasonic（超声波模块）', rows: [['VCC', '1 (Vcc)'], ['2', '2 (Trig)'], ['3', '3 (Echo)'], ['GND', '4 (Gnd)']], rowH, size: 12.5, colW: [rw * 0.42, rw * 0.58] });
    const cy = tb + 0.3, chh = 0.97, cw2 = (rw - 0.3) / 2;
    const roles = [
      { t: 'Trig ← 2 号脚', d: 'OUTPUT：Arduino\n发出“测一次”的命令', fill: P.turqPale, ic: I.comments },
      { t: 'Echo → 3 号脚', d: 'INPUT：模块把\n测量结果送回来', fill: P.card, ic: I.inbox },
    ];
    roles.forEach((r, i) => {
      const x = rx + i * (cw2 + 0.3);
      V.card(s, { x, y: cy, w: cw2, h: chh, fill: r.fill });
      label(s, r.t, { x: x + 0.16, y: cy + 0.08, w: cw2 - 0.3, h: 0.28, size: 13, bold: true });
      txt(s, r.d, { x: x + 0.16, y: cy + 0.4, w: cw2 - 0.3, h: chh - 0.46, size: 12 });
    });
    const py = cy + chh + 0.3, ph = G.bottom - py;
    V.card(s, { x: rx, y: py, w: rw, h: ph });
    txt(s, [R('组件清单　', { bold: true }), R('Arduino UNO R3 主板、面包板、USB 数据线、超声波模块 ×1、若干跳线')], { x: rx + 0.18, y: py + 0.04, w: rw - 0.36, h: ph - 0.08, size: 12, valign: 'middle' });
  }

  // ---------------------------------------------------------------- U: syntax
  s = slide({
    title: '新语法小课堂：const、delayMicroseconds()、pulseIn()',
    desc: 'const 给数字“钉上名字”不许再改；delayMicroseconds() 按微秒等待；pulseIn() 是量高电平的秒表',
    notes: '三个新词各配一个比方：const 像门牌号，钉上去就不改；delayMicroseconds 是更细的计时单位；pulseIn 像秒表。每张卡片底部的红框是最容易犯的错，可以请学生读出来。特别提醒 delay(0.01) 这种写法：delay 只认整数毫秒，0.01 会变成 0，要等微秒就得用 delayMicroseconds。',
  });
  {
    const gap = 0.3, w = (G.cw - 2 * gap) / 3;
    const C = [
      { icon: I.tag, title: 'const 常量', text: '像门牌号：钉上去就不再改。用名字代替数字，好读，又防止误改。', code: 'const int TrigPin = 2;\nTrigPin = 5;   // 报错', mistake: '给 const 再赋值会编译报错：要改，就改它的初始值。' },
      { icon: I.clock, title: 'delayMicroseconds()', mono: true, titleSize: 12, text: '更细的计时单位：1 秒 = 1000 毫秒 = 1000000 微秒（μs）。', code: 'delayMicroseconds(10);\ndelay(1000);  // 1 秒', mistake: 'delay(0.01) 不等于 10μs：delay() 只认整数毫秒。' },
      { icon: I.stopwatch, title: 'pulseIn(引脚, HIGH)', mono: true, titleSize: 12, text: '像秒表：Echo 一变高就开始计时，变低就停表，返回多少微秒。', code: 'pulseIn(EchoPin, HIGH)\n// → 高电平的微秒数', mistake: '没收到回声时，等约 1 秒后返回 0：读数是 0 先查线。' },
    ];
    C.forEach((c, i) => conceptCard(s, I, { ...c, x: G.L + i * (w + gap), y: G.top, w, h: G.ch }));
  }

  // ---------------------------------------------------------------- U: code 1/2
  s = slide({
    title: '代码逐行看懂（1/2）：准备工作',
    desc: '用 const 给两个引脚起名，准备一个小数变量装距离；setup() 里设好输入输出、打开串口',
    notes: '原指南这一页的程序是空白的，我们用同一套件《Arduino 编程入门学习教程》第 2.38 讲的程序，引脚和串口输出格式都和本指南的截图一致。第 3 行用 float 是因为距离带小数，比如 8.57 厘米。第 7、8 行最关键：Trig 是输出、Echo 是输入，方向不能反。',
  });
  {
    const cw = 4.75, chh = 2.75;
    const b = codeBlock2(s, { x: G.L, y: G.top, w: cw, h: chh, code: ULTRA_CODE, from: 1, to: 10, hl: [1, 2, 3, 7, 8], file: 'ultrasonic.ino', right: '第 1–10 行' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.top + chh, gap: 0.12, items: [
      { line: [1, 2], text: 'const 常量：Trig 接 2 号脚，Echo 接 3 号脚，运行中不会变' },
      { line: 3, text: 'float 小数变量，用来装算出的距离' },
      { line: 6, text: '打开串口，速度 9600' },
      { line: [7, 8], text: 'Trig 设为输出、Echo 设为输入' },
      { line: 9, text: '先打印一行标题 Ultrasonic sensor:' },
    ] });
    const ty = G.top + chh + 0.3;
    noteStrip(s, I.book, '原指南此处程序空白：这里用同一套件《Arduino 编程入门学习教程》第 2.38 讲的程序，引脚与本指南一致（Trig 2、Echo 3）。', { x: G.L, y: ty, w: G.cw, h: G.bottom - ty });
  }

  // ---------------------------------------------------------------- U: code 2/2
  s = slide({
    title: '代码逐行看懂（2/2）：喊一声，量回声',
    desc: '每一轮：Trig 发 10 微秒高电平“喊一声”→ pulseIn() 量回声 → ÷ 58 换成厘米 → 打印 → 等 1 秒',
    notes: '第 13–17 行就是时序图第一行：先拉低清零，再拉高 10 微秒，再拉低，模块就会自动发出超声波。第 18 行是整个程序的核心：量出 Echo 高电平的微秒数，除以 58 得到厘米。写成 58.00 是有讲究的：pulseIn 返回整数，除以整数 58 会把小数直接丢掉，除以 58.00 才能保留小数。第 19–22 行用三个 print 拼成一行，最后用 println() 换行。',
  });
  {
    const cw = 4.95;
    const b = codeBlock2(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: ULTRA_CODE, from: 11, to: 24, hl: [15, 16, 18, 22], file: 'ultrasonic.ino', right: '第 11–24 行' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.12, items: [
      { line: [13, 14], text: 'Trig 先拉低 2 微秒，“清零”' },
      { line: [15, 17], text: '高电平 10 微秒再拉低 = “喊一声”，模块自动发出 8 个脉冲' },
      { line: 18, text: 'Echo 高电平的微秒数 ÷ 58 = 厘米；写成 58.00 才保留小数' },
      { line: [19, 22], text: '拼成一行 distance is :8.57cm，再换行' },
      { line: 23, text: '等 1 秒，再测下一次' },
    ] });
  }

  // ---------------------------------------------------------------- U: result
  s = slide({
    title: '实验结果：串口里每秒刷新一次距离',
    desc: '打开串口监视器（9600 波特率），先显示 Ultrasonic sensor:，之后每秒一行 distance is :xx.xxcm',
    notes: '上传程序后打开串口监视器，把手或一本书放在模块前，慢慢前后移动，数字会跟着变。右边的表帮助学生读懂截图里的数字：几厘米说明东西很近，一两百厘米说明前方比较空，测到的是远处的物体。可以拿尺子验证：把书放在 10 厘米、20 厘米处，看读数对不对得上。',
  });
  {
    const iw = 4.1;
    V.imageBox(s, { file: 'l22/ultra_serial_monitor.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南串口截图' });
    const rx = G.L + iw + 0.35, rw = G.R - rx, th = 1.15;
    V.tip(s, { x: rx, y: G.top, w: rw, h: th, kind: 'note', title: '实验现象', text: '串口先打印一行 Ultrasonic sensor:，之后每秒一行距离；挡在前面的物体越近，数字越小。', size: 12 }, I.check);
    const ty = G.top + th + 0.3;
    label(s, '怎么读截图里的数字', { x: rx, y: ty, w: 3, h: 0.3, size: 13, bold: true });
    V.table(s, [
      ['串口读数（cm）', '说明'],
      ['4.40 / 8.57', '物体离模块只有几厘米'],
      ['114.98 / 119.64', '物体在 1 米多远的地方'],
      ['243.98', '前方空旷，测到了远处的物体'],
    ], { x: rx, y: ty + 0.4, w: rw, colW: [1.75, rw - 1.75], rowH: 0.4, size: 12, monoCols: [0] });
  }

  // ---------------------------------------------------------------- U: pitfalls + try
  s = slide({
    title: '常见坑与动手改一改：做个“倒车雷达”',
    desc: '读数不对先查 Trig / Echo 两根线和被测物体；再加几行代码，让它离得太近就亮灯',
    notes: '左边两个是课堂上最常见的问题：读数一直是 0，多半是 Trig 和 Echo 接反或没插牢；读数乱跳，多半是对着斜面、软布测，或者离得太近。右边的挑战把今天的超声波和以前学的 if 结合起来：距离小于 10 厘米就点亮板载 L 灯，就是一个简单的倒车雷达。还可以让学生把 L 灯换成蜂鸣器。',
  });
  {
    const lw = 4.4, gap = 0.3, wh = (G.ch - gap) / 2;
    warnCard(s, I.times_w, '读数一直是 0', 'Echo 等不到高电平，pulseIn() 超时就返回 0。多半是 Trig、Echo 接反或没插牢：对照接线表查 2、3 号脚。', { x: G.L, y: G.top, w: lw, h: wh });
    warnCard(s, I.times_w, '读数忽大忽小', '超声波碰到斜面、软布、海绵会被反射偏或被吸收；离得太近（几厘米以内）也测不准。对着平整的硬物测最稳。', { x: G.L, y: G.top + wh + gap, w: lw, h: wh });
    const rx = G.L + lw + 0.3, rw = G.R - rx;
    let y = iconCard(s, I.car, '挑战：小于 10 厘米就亮灯', { x: rx, y: G.top, w: rw, h: G.ch, d: 0.4, titleSize: 14.5 });
    txt(s, '物体靠近到 10 厘米以内，板载 L 灯就亮\n（L 灯接在 13 号脚）。加两处代码：', { x: rx + 0.2, y, w: rw - 0.4, h: 0.5, size: 12 });
    y += 0.5 + 0.1;
    y += miniCode(s, '// setup() 里加：\npinMode(13, OUTPUT);\n// loop() 里 delay(1000); 前面加：\nif (distance < 10)\n  digitalWrite(13, HIGH);\nelse\n  digitalWrite(13, LOW);', { x: rx + 0.2, y, w: rw - 0.4, size: 10.5 }) + 0.14;
    txt(s, [R('再试试：', { bold: true }), R('delay(1000) 改成 delay(200)，灯的反应更灵敏。')], { x: rx + 0.2, y, w: rw - 0.4, h: G.bottom - 0.1 - y, size: 12 });
    if (G.bottom - 0.1 - y < 0.45) warn('ultra challenge text short');
  }

  // ================================================================ EXPERIMENT 2: SERIAL SERVO
  deck.section('实验二　串口调节舵机');
  divider({
    kicker: '实验 02',
    title: '串口调节舵机\n角度实验',
    desc: '在电脑的串口监视器里输入一个角度，舵机就转到那个角度。舵机在 2-1 已经认识过；这一节的新本领是：从串口一个个读入字符，拼成一个数字。',
    tiles: [
      { fill: P.turq, big: '01', title: '回顾', sub: '舵机：脉宽决定角度', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: '信号线 → 13 号脚', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: 'available() · read()\ntoInt()', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '输入 0、90、180', subSize: 12 },
    ],
    notes: '实验二把“串口”从只会说话变成也会听话：以前用 Serial.print 让 Arduino 告诉电脑，这次反过来，电脑告诉 Arduino 转多少度。舵机原理在 2-1 学过，这里只做简短回顾，重点放在读串口的三句新语法上。',
  });

  // ---------------------------------------------------------------- S: recap structure + control signal
  s = slide({
    title: '回顾：舵机的结构与控制信号',
    desc: '舵机里有电机、齿轮、电位器和控制电路；Arduino 每 20ms 发一个脉冲，高电平的宽度决定转到几度',
    notes: '这一页是 2-1 的回顾，左边拆解照片里的英文标注，对照右下角的表认一认。舵机是“闭环”的：电位器跟着输出轴转，随时告诉控制电路现在转到了几度，没对准就继续转，所以用手掰它，它会顶回去。右上是控制信号：每 20 毫秒一个脉冲，高电平越宽，角度越大。图上标的是 1ms–2ms，正文写的是 0.5ms–2.5ms，下一页细讲。',
  });
  {
    const iw = 2.45;
    V.imageBox(s, { file: 'l22/servo_inside_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南：舵机内部结构' });
    const rx = G.L + iw + 0.3, rw = G.R - rx, ph = 2.3;
    V.imageBox(s, { file: 'l22/servo_pulse_period.jpg', x: rx, y: G.top, w: rw, h: ph, diagram: true, caption: '原指南：周期（Cycle）20ms，脉宽（pulse width）1ms (Min) – 2ms (Max)' });
    const ly = G.top + ph + 0.3, lh = G.bottom - ly;
    V.card(s, { x: rx, y: ly, w: rw, h: lh });
    const L = [
      [R('driveshaft', { bold: true }), R('　输出轴')], [R('motor', { bold: true }), R('　直流电机')],
      [R('gear train', { bold: true }), R('　减速齿轮组')], [R('control electronics', { bold: true }), R('　控制电路')],
      [R('potentiometer', { bold: true }), R('　电位器')], [R('闭环：', { bold: true }), R('没转到位就继续转')],
    ];
    const cws = [2.6, rw - 0.4 - 2.6], rh = (lh - 0.16) / 3;
    L.forEach((runs, i) => {
      label(s, runs, { x: rx + 0.2 + (i % 2) * cws[0], y: ly + 0.08 + Math.floor(i / 2) * rh, w: cws[i % 2] - 0.08, h: rh, size: 12 });
    });
  }

  // ---------------------------------------------------------------- S: recap pulse width -> angle
  s = slide({
    title: '回顾：脉冲越宽，角度越大',
    desc: '高电平 0.5ms → 0°，1.5ms → 90°，2.5ms → 180°；小于 1.5ms 逆时针转，大于 1.5ms 顺时针转',
    notes: '对照左图从上往下看：最小脉冲 0.5 毫秒，舵机指向 0 度；中间脉冲 1.5 毫秒，指向 90 度；最大脉冲 2.5 毫秒，指向 180 度。右边的表是原指南给的完整对应关系。原指南的周期图上写的是 1ms–2ms，而正文写 0.5ms–2.5ms，原文也说不同品牌、甚至同一品牌的舵机范围都可能不同。好在 Servo 库会帮我们换算，程序里只要写 write(角度)。',
  });
  {
    const iw = 5.2;
    V.imageBox(s, { file: 'l22/servo_pulse_angles.jpg', x: G.L, y: G.top, w: iw, h: G.ch, diagram: true, caption: '原指南：最小 / 中间 / 最大脉冲' });
    const rx = G.L + iw + 0.35, rw = G.R - rx, rowH = 0.3;
    V.table(s, [
      ['高电平宽度', '舵机角度'],
      ['0.5ms', '0°'], ['1.0ms', '45°'], ['1.5ms', '90°（中间）'], ['2.0ms', '135°'], ['2.5ms', '180°'],
    ], { x: rx, y: G.top, w: rw, colW: [rw / 2, rw / 2], rowH, size: 12, monoCols: [0], boldCols: [0], align: ['center', 'center'] });
    const qy = G.top + rowH * 6 + 0.3;
    V.tip(s, { x: rx, y: qy, w: rw, h: G.bottom - qy, kind: 'note', title: '图和正文不一样？', text: '周期图写 1ms–2ms，正文写 0.5ms–2.5ms：不同舵机的范围本来就有差别。Servo 库会替我们换算，写 write(角度) 即可。', size: 12 }, I.search);
  }

  // ---------------------------------------------------------------- S: purpose + wiring
  s = slide({
    title: '实验目的、组件与接线',
    desc: '舵机三根线：黑线接 GND，红线接 VCC（5V），黄色信号线接 13 号脚',
    notes: '先读实验目的和原理：在串口监视器里输入角度，舵机就转到那个角度。接线只有三根，信号线接 13 号脚。我们手里的 SG90 舵机，线色常见是棕、红、橙，分别对应表里的黑、红、黄，不要因为颜色不一样就接错。原指南还建议接上 9V 电池一起供电，下一页的实物照片里可以看到。',
  });
  {
    const iw = 3.7;
    V.imageBox(s, { file: 'l22/servo_wiring.jpg', x: G.L, y: G.top, w: iw, h: G.ch, diagram: true, caption: '原指南接线图' });
    const rx = G.L + iw + 0.3, rw = G.R - rx, th = 1.15;
    V.tip(s, { x: rx, y: G.top, w: rw, h: th, kind: 'note', title: '实验目的与原理', text: '用 UNO 主板调整舵机角度：烧录程序后，在串口监视器里输入角度，舵机就转到对应的位置。', size: 12 }, I.target);
    const wy = G.top + th + 0.3, tw = 2.35;
    const wb = V.wiring(s, { x: rx, y: wy, w: tw, left: 'Arduino UNO', right: '舵机', rows: [['GND', '黑线'], ['VCC', '红线'], ['13', '黄线']], rowH: 0.33, size: 12.5, colW: [1.35, tw - 1.35] });
    const px = rx + tw + 0.3, pw = G.R - px, phh = wb - wy;
    V.card(s, { x: px, y: wy, w: pw, h: phh });
    label(s, '组件清单', { x: px + 0.18, y: wy + 0.1, w: pw - 0.36, h: 0.28, size: 12.5, bold: true });
    txt(s, 'Keywish UNO R3 主板\nUSB 数据线 · SG90 舵机\n若干跳线', { x: px + 0.18, y: wy + 0.42, w: pw - 0.36, h: phh - 0.48, size: 12 });
    const cy = wb + 0.3;
    noteStrip(s, I.search, [R('线色对照：', { bold: true }), R('SG90 的线常见为 棕 / 红 / 橙，分别对应表里的 黑 / 红 / 黄（GND / 电源 / 信号）。')], { x: rx, y: cy, w: rw, h: G.bottom - cy, fill: P.card });
  }

  // ---------------------------------------------------------------- S: syntax
  s = slide({
    title: '新语法小课堂：从串口读一串数字',
    desc: '串口一次只能取 1 个字符：用 while 把字符一个个取出来，拼成一串，再变成数字',
    notes: '先看上面这条流水线：我们在键盘上输入 180，传到 Arduino 的其实是三个字符 1、8、0，一次只能取一个。所以要先用 String 把它们拼成 "180"，再用 toInt() 变成真正的数字 180，最后交给舵机。三张卡片各讲一步，红框是对应的常见错误。',
  });
  {
    const fy = G.top, fh = 0.86;
    V.card(s, { x: G.L, y: fy, w: G.cw, h: fh });
    const bh = 0.42, by = fy + 0.1, ly = by + bh + 0.04;
    const items = [
      { w: 1.3, t: '输入 180', fill: P.white, line: P.gray2, sub: '串口监视器' },
      { w: 1.36, chars: ['1', '8', '0'], sub: 'read() 每次取 1 个' },
      { w: 1.6, t: 'temp = "180"', fill: P.white, line: P.gray2, mono: true, sub: 'String 用 += 拼接' },
      { w: 1.45, t: 'angle = 180', fill: P.ink, mono: true, sub: 'toInt() 变成数字' },
      { w: 1.25, t: '转到 180°', fill: P.turqPale, sub: 'myservo.write()' },
    ];
    const ag = 0.42, tot = items.reduce((a, it) => a + it.w, 0) + ag * (items.length - 1);
    let x = G.L + (G.cw - tot) / 2;
    items.forEach((it, i) => {
      if (it.chars) {
        it.chars.forEach((c, j) => {
          const cx = x + j * 0.48;
          V.card(s, { x: cx, y: by, w: 0.4, h: bh, fill: P.turq, radius: 0.06 });
          V.text(s, `'${c}'`, { x: cx, y: by, w: 0.4, h: bh, size: 12, bold: true, mono: true, align: 'center', valign: 'middle' });
        });
      } else {
        fbox(s, { x, y: by, w: it.w, h: bh, fill: it.fill, line: it.line, text: it.t, mono: it.mono, size: 12 });
      }
      label(s, it.sub, { x: x - 0.12, y: ly, w: it.w + 0.24, h: 0.24, size: 10.5, color: P.muted, align: 'center', mono: /\(\)/.test(it.sub) && !/[一-鿿]/.test(it.sub) });
      if (i < items.length - 1) V.arrow(s, x + it.w + 0.06, by + bh / 2, x + it.w + ag - 0.06, by + bh / 2, { color: P.muted });
      x += it.w + ag;
    });
    const cy = fy + fh + 0.3, gap = 0.3, w = (G.cw - 2 * gap) / 3;
    const C = [
      { icon: I.envelope, title: '串口像个信箱', text: 'available() 问还剩几个字符；read() 每次只取 1 个。', code: 'inByte = Serial.read();', mistake: '以为 read() 一次能读到整个“180”。' },
      { icon: I.link, title: '字符串像串珠子', text: 'String 装一串字符，+= 接到末尾："1"→"18"→"180"', code: 'temp += inByte;', mistake: '用完不清空，下次会拼成“18090”。' },
      { icon: I.calc, title: '纸条换成数字', text: 'toInt() 把文字 "180" 变成能交给舵机的数字 180。', code: 'angle = temp.toInt();', mistake: '“abc”不是数字，toInt() 得到 0。' },
    ];
    C.forEach((c, i) => conceptCard(s, I, { ...c, x: G.L + i * (w + gap), y: cy, w, h: G.bottom - cy, titleSize: 13.5, compact: true }));
  }

  // ---------------------------------------------------------------- S: code 1/3
  s = slide({
    title: '代码逐行看懂（1/3）：准备工作',
    desc: '引入舵机库、创建舵机对象，再准备三个“盒子”：一个装字符，一个装角度，一个拼字符串',
    notes: '第 1、2 行和 2-1 一样：引入 Servo 库，创建舵机对象 myservo。第 4 行的 char 是“字符”类型，一次只装一个字符，比如 \'9\'；第 6 行的 String 能装一串字符，先放一个空字符串 ""。setup() 里打开串口，并用 attach 把舵机“绑”到 13 号脚。',
  });
  {
    const cw = 5.2;
    const b = codeBlock2(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: SERVO_CODE, from: 1, to: 12, hl: [1, 2, 4, 6, 11], file: 'serial_servo.ino', right: '第 1–12 行' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.12, items: [
      { line: [1, 2], text: '引入舵机库，创建舵机对象 myservo（2-1 学过）' },
      { line: 3, text: '信号线接 13 号脚' },
      { line: [4, 5], text: 'char 装 1 个字符；angle 装角度' },
      { line: 6, text: 'String 字符串 temp：先放空的 ""，用来拼字符' },
      { line: [9, 11], text: '开串口 9600；13 号脚设为输出；attach 把舵机“绑”到 13 号脚' },
    ] });
  }

  // ---------------------------------------------------------------- S: code 2/3
  s = slide({
    title: '代码逐行看懂（2/3）：把字符一个个读进来',
    desc: '只要串口里还有没读的字符，while 就一直转：每圈取 1 个字符，接到 temp 的末尾',
    notes: 'while 和 if 很像，区别是：if 判断一次，while 只要条件成立就一直重复。这里的条件是“串口里还有字符没读”，所以输入 180 时 while 会转 3 圈，temp 依次变成 "1"、"18"、"180"，见左下角。原指南第 18 行的英文注释被 PDF 排版折成了两行，照抄的话第二行不是注释，会编译报错，这里已经合回一行。',
  });
  {
    const cw = 5.4, chh = 2.85;
    const b = codeBlock2(s, { x: G.L, y: G.top, w: cw, h: chh, size: 10.5, code: SERVO_CODE, from: 13, to: 19, hl: [15, 17, 18], file: 'serial_servo.ino', right: '第 13–19 行' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    const yEnd = V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: 4.25, gap: 0.12, items: [
      { line: 13, text: 'loop() 一遍遍重复' },
      { line: 15, text: 'while：串口里还有没读的字符，就继续' },
      { line: 17, text: 'read() 取出 1 个字符，放进 inByte' },
      { line: 18, text: '把 inByte 接到 temp 的末尾' },
      { line: 19, text: '字符全部读完，跳出 while' },
    ] });
    const ty = Math.max(yEnd + 0.16, 4.3);
    V.card(s, { x: ex, y: ty, w: ew, h: G.bottom - ty, fill: P.white, line: P.red, lineW: 1 });
    txt(s, [R('原指南第 18 行', { bold: true, color: P.red }), R('的注释被排版折成两行，这里合回一行，否则编译报错。')], { x: ex + 0.16, y: ty + 0.04, w: ew - 0.32, h: G.bottom - ty - 0.08, size: 12, valign: 'middle' });
    // trace strip under the code
    const sy = G.top + chh + 0.3, sh = G.bottom - sy;
    V.card(s, { x: G.L, y: sy, w: cw, h: sh, fill: P.turqPale });
    label(s, '输入 180：', { x: G.L + 0.14, y: sy, w: 0.95, h: sh, size: 12, bold: true });
    const steps = ['第 1 圈 "1"', '第 2 圈 "18"', '第 3 圈 "180"'];
    const pw = 1.22, pg = 0.2;
    steps.forEach((t, i) => {
      const px = G.L + 1.08 + i * (pw + pg);
      V.pill(s, { x: px, y: sy + (sh - 0.32) / 2, w: pw, h: 0.32, text: t, size: 10.5, fill: i === 2 ? P.turq : P.white, line: i === 2 ? undefined : P.gray2, bold: true });
      if (i < 2) V.arrow(s, px + pw + 0.04, sy + sh / 2, px + pw + pg - 0.04, sy + sh / 2, { color: P.muted });
    });
  }

  // ---------------------------------------------------------------- S: code 3/3
  s = slide({
    title: '代码逐行看懂（3/3）：拼好的数字交给舵机',
    desc: '收到新输入就把文字变成数字、在串口回一句，再清空 temp；舵机始终转到 angle 度',
    notes: '第 21 行判断 temp 是不是空的：不空，说明刚收到新输入。第 23 行用 toInt() 把文字变成数字，第 24、25 行在串口回一句 Servo degree:，方便我们确认。第 28 行清空 temp，原注释 Please see temporary variables 是机翻，意思是“清空临时变量”。第 29 行才是真正让舵机转动的一句；没有新输入时 angle 不变，舵机就保持原角度。',
  });
  {
    const cw = 5.3;
    const b = codeBlock2(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: SERVO_CODE, from: 21, to: 32, hl: [21, 23, 28, 29], file: 'serial_servo.ino', right: '第 21–32 行' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.1, items: [
      { line: 21, text: 'temp 不是空的 = 刚收到新输入' },
      { line: 23, text: 'toInt()：文字 "180" → 数字 180' },
      { line: [24, 25], text: '串口回一句 Servo degree: 180' },
      { line: 26, text: '只是注释：真正转动的是第 29 行' },
      { line: 28, text: '清空 temp，等下一次输入' },
      { line: [29, 30], text: '舵机转到 angle 度；等 0.1 秒再来一圈' },
    ] });
  }

  // ---------------------------------------------------------------- S: steps
  s = slide({
    title: '实验步骤：接上电池，打开串口监视器',
    desc: '程序烧录后先不要拔 USB 线，再把电池插头插到 UNO 上一起供电，然后打开 IDE 的串口监视器',
    notes: '按原指南的三步做：烧录后不拔 USB，因为串口监视器要通过 USB 和电脑通信；插上电池，是因为舵机转动时电流大，只靠 USB 供电可能不稳；然后点 IDE 右上角的“串口监视器”。中间的截图只看红框里的按钮就好，截图里的代码和我们的程序版本略有不同。',
  });
  {
    const pw = 2.6;
    V.imageBox(s, { file: 'l22/servo_result_photo.jpg', x: G.L, y: G.top, w: pw, h: G.ch, caption: '原指南实物：舵机 + 电池供电' });
    const mx = G.L + pw + 0.3, mw = 3.3;
    V.imageBox(s, { file: 'l22/servo_ide_monitor.jpg', x: mx, y: G.top, w: mw, h: G.ch, caption: '打开串口监视器示意图：只看红框里的按钮\n（截图里的代码版本略有不同）', capH: 0.46 });
    const rx = mx + mw + 0.3, rw = G.R - rx;
    label(s, '三步走', { x: rx, y: G.top, w: rw, h: 0.32, size: 15, bold: true });
    const ly = numList(s, [
      '烧录后先别拔 USB 线',
      '插上电池：舵机耗电大，帮 USB 分担供电',
      '点 IDE 右上角“串口监视器”，选 9600',
    ], { x: rx, y: G.top + 0.46, w: rw, size: 12.5, gap: 0.2, d: 0.32 });
    const ty = Math.max(ly + 0.3, 4.1);
    if (ty > 4.35) warn('servo steps overflow');
    noteStrip(s, I.usb, '不拔 USB：串口监视器要靠它和电脑“聊天”', { x: rx, y: ty, w: rw, h: G.bottom - ty, d: 0.32 });
  }

  // ---------------------------------------------------------------- S: result
  s = slide({
    title: '实验结果：输入角度，舵机跟着转',
    desc: '在串口监视器里依次输入 0、90、180、90，每输入一次，串口回一句 Servo degree:，舵机转到对应角度',
    notes: '在输入框里输入数字，按回车或点“发送”。每次输入，串口都会回一句 Servo degree: 和角度，舵机转到对应位置：0 度指向一边，90 度在中间，180 度指向另一边。注意截图右下角：行结束符选的是“没有结束符”，波特率 9600，建议和截图保持一致。',
  });
  {
    const iw = 4.0;
    V.imageBox(s, { file: 'l22/servo_serial_input.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南：串口输入舵机角度数值' });
    const rx = G.L + iw + 0.35, rw = G.R - rx, dh = 1.5;
    V.card(s, { x: rx, y: G.top, w: rw, h: dh });
    const vals = [0, 90, 180, 90], n = 4, sw = (rw - 0.3) / n;
    vals.forEach((v, i) => {
      const cx = rx + 0.15 + sw * (i + 0.5);
      label(s, `输入 ${v}`, { x: cx - sw / 2, y: G.top + 0.1, w: sw, h: 0.26, size: 12, bold: true, align: 'center' });
      dial(s, cx, G.top + 0.78, 0.32, v);
      label(s, `${v}°`, { x: cx - sw / 2, y: G.top + 1.14, w: sw, h: 0.26, size: 12, color: P.muted, align: 'center' });
      if (i < n - 1) V.arrow(s, cx + 0.41, G.top + 0.78, cx + sw - 0.41, G.top + 0.78, { color: P.muted });
    });
    const sy = G.top + dh + 0.3, sh = 0.75;
    V.card(s, { x: rx, y: sy, w: rw, h: sh });
    label(s, '右下角这样设：', { x: rx + 0.18, y: sy, w: 1.45, h: sh, size: 12, bold: true });
    let px = rx + 1.7;
    for (const t of ['没有结束符', '9600 波特率']) {
      const w = V.pill(s, { x: px, y: sy + (sh - 0.32) / 2, text: t, size: 11, fill: P.ink, color: P.white, h: 0.32 });
      px += w + 0.14;
    }
    if (px > G.R - 0.1) warn('servo settings pills overflow');
    const qy = sy + sh + 0.3;
    noteStrip(s, I.check, [R('原指南结论：', { bold: true }), R('在串口监视器分别输入以上舵机角度值之后，会发现舵机会转动。')], { x: rx, y: qy, w: rw, h: G.bottom - qy });
  }

  // ---------------------------------------------------------------- S: pitfalls + try
  s = slide({
    title: '常见坑与动手改一改：把角度限制在 0～180',
    desc: '行结束符、供电是两个常见坑；再用 constrain() 把输入的角度“关进笼子”',
    notes: '第一个坑：行结束符如果选了“换行”，空着点发送也会发出一个换行符，temp 不是空的，toInt() 得到 0，舵机就跳回 0 度。第二个坑：舵机转动瞬间电流大，只靠 USB 可能掉电重启。右边的改法用 constrain() 把角度限制在 0～180：Servo 库本身最多转到 180 度，但串口会照样打印 200，加上这一行，打印和实际就一致了。',
  });
  {
    const lw = 4.4, gap = 0.3, wh = (G.ch - gap) / 2;
    warnCard(s, I.times_w, '空着点“发送”，舵机跳回 0°', '行结束符选了“换行”时，空着发送也会送出一个换行符：temp 不为空，toInt() 得到 0。选“没有结束符”就不会这样。', { x: G.L, y: G.top, w: lw, h: wh });
    warnCard(s, I.times_w, '舵机抖动、板子反复重启', '舵机转动的瞬间电流很大，只靠 USB 供电会“掉电”。按原指南插上电池一起供电。', { x: G.L, y: G.top + wh + gap, w: lw, h: wh });
    const rx = G.L + lw + 0.3, rw = G.R - rx;
    let y = iconCard(s, I.lock, '挑战：只接受 0～180', { x: rx, y: G.top, w: rw, h: G.ch, d: 0.4, titleSize: 14.5 });
    txt(s, '输入 200 时，串口照样打印 Servo degree: 200，可舵机最多只转到 180°。在第 23 行后面加一行：', { x: rx + 0.2, y, w: rw - 0.4, h: 0.62, size: 12 });
    y += 0.62 + 0.14;
    y += miniCode(s, 'angle = constrain(angle, 0, 180);', { x: rx + 0.2, y, w: rw - 0.4, size: 11 }) + 0.16;
    txt(s, [M('constrain(值, 最小, 最大)', { bold: true }), R('：比最小还小就取最小，比最大还大就取最大。')], { x: rx + 0.2, y, w: rw - 0.4, h: 0.52, size: 12 });
    y += 0.52 + 0.16;
    txt(s, [R('再试试：', { bold: true }), R('输入 45、135，对照“脉冲宽度”那一页的表，看角度对不对。')], { x: rx + 0.2, y, w: rw - 0.4, h: G.bottom - 0.12 - y, size: 12 });
    if (G.bottom - 0.12 - y < 0.45) warn('servo challenge text short');
  }

  // ================================================================ EXPERIMENT 3: IR OBSTACLE
  deck.section('实验三　红外避障');
  divider({
    kicker: '实验 03',
    title: '红外避障模块实验',
    desc: '红外避障模块像一只会“看”障碍物的眼睛：前面有东西，它就输出低电平。程序和 1-3 的小磁簧开关几乎一样——输入换了，逻辑不变。',
    tiles: [
      { fill: P.turq, big: '01', title: '认识', sub: '发射管 + 接收管', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: 'OUT → 12，LED → 11\n蜂鸣器 → 13', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: 'digitalRead()\nif / else', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '挡一下：灯亮、响', subSize: 12 },
    ],
    notes: '实验三是一个“老朋友”式的实验：读一个数字输入，再用 if / else 控制 LED 和蜂鸣器。和 1-3 的小磁簧开关比，只是把“磁铁靠近”换成了“前方有障碍物”。可以先让学生回忆：磁簧开关有磁铁时读到的是 0 还是 1？',
  });

  // ---------------------------------------------------------------- IR: intro
  s = slide({
    title: '认识红外避障模块：看“反光”找障碍物',
    desc: '透明的发射管发出红外线，碰到障碍物反射回来被黑色的接收管收到：绿灯亮，OUT 输出低电平',
    notes: '用手电筒照墙来类比：前面有墙就能看到反光，前面空空的光就“有去无回”。模块用的是人眼看不见的红外线。检测距离可以用蓝色电位器旋钮调节，有效范围约 2～30 厘米，工作电压 3.3～5V。这种模块在机器人避障、避障小车、流水线计数、黑白线循迹里都很常见。',
  });
  {
    const lw = 4.3, ph = 2.55;
    V.imageBox(s, { file: 'l22/ir_module_photo.jpg', x: G.L, y: G.top, w: lw, h: ph, caption: '红外避障模块实物图（原指南）' });
    const sy = G.top + ph + 0.3, sh = G.bottom - sy, sg = 0.3, sw = (lw - 2 * sg) / 3;
    [['2–30 cm', '有效检测距离'], ['3.3–5 V', '工作电压'], ['蓝色旋钮', '调检测距离']].forEach(([b, t], i) => {
      const x = G.L + i * (sw + sg);
      V.card(s, { x, y: sy, w: sw, h: sh, fill: i === 0 ? P.turq : P.card });
      label(s, b, { x: x + 0.14, y: sy + 0.1, w: sw - 0.24, h: 0.36, size: 14, bold: true });
      label(s, t, { x: x + 0.14, y: sy + 0.46, w: sw - 0.28, h: 0.26, size: 11, color: i === 0 ? P.ink : P.muted });
    });
    const rx = G.L + lw + 0.35, rw = G.R - rx - 0.1;
    let y = lead(s, '像拿手电筒照墙', '前面有墙，就能看到反光；前面空空的，光就有去无回。模块用看不见的红外线做同样的事。', { x: rx, y: G.top, w: rw, size: 13 }) + 0.2;
    y = numList(s, [
      '透明的发射管发出红外线',
      '遇到障碍物，红外线反射回来被接收管收到',
      '比较器判断后：绿灯亮，OUT 输出低电平 0',
    ], { x: rx, y, w: rw, size: 13, gap: 0.14 });
    const ay = Math.max(y + 0.3, 4.2);
    noteStrip(s, I.robot, [R('用在哪：', { bold: true }), R('机器人避障、避障小车、流水线计数、黑白线循迹')], { x: rx, y: ay, w: rw + 0.1, h: G.bottom - ay });
    if (G.bottom - ay < 0.55) warn('IR apps strip short');
  }

  // ---------------------------------------------------------------- IR: purpose + principle
  s = slide({
    title: '实验目的、组件与原理',
    desc: '前方有障碍物 → LED 亮、蜂鸣器响；没有障碍物 → 全部熄灭。和 1-3 的小磁簧开关是同一个套路',
    notes: '实验目的照原指南读。右边上方是信号链：有障碍物，OUT 输出低电平，读到 0，于是 LED 亮、蜂鸣器响。下方的对比表是本实验的重点：和 1-3 的小磁簧开关相比，只是“触发条件”变了，读数规律和程序完全一样。这就是模块化传感器的好处：输入换了，逻辑不变。',
  });
  {
    const lw = 4.3, th = 1.4;
    V.tip(s, { x: G.L, y: G.top, w: lw, h: th, kind: 'note', title: '实验目的', text: '① 了解红外避障模块的工作原理\n② 用 UNO 获取红外避障模块的值，控制蜂鸣器和 LED 灯', size: 12.5 }, I.target);
    const py = G.top + th + 0.3, ph = G.bottom - py;
    V.card(s, { x: G.L, y: py, w: lw, h: ph });
    label(s, '组件清单', { x: G.L + 0.2, y: py + 0.14, w: 2, h: 0.3, size: 13, bold: true });
    const parts = [[I.chip, 'UNO R3 主板'], [I.grid, '面包板'], [I.usb, 'USB 数据线'], [I.cable, '若干跳线'], [I.eye, '红外避障模块 ×1'], [I.bulb, 'LED 模块 ×1'], [I.volume, '有源蜂鸣器 ×1']];
    const cw2 = (lw - 0.5) / 2, rs = 0.33;
    parts.forEach(([ic, t], i) => {
      const c = i < 4 ? 0 : 1, r = i < 4 ? i : i - 4;
      const x = G.L + 0.2 + c * (cw2 + 0.1), y = py + 0.5 + r * rs;
      V.iconCircle(s, ic, { x, y, d: 0.27 });
      label(s, t, { x: x + 0.35, y, w: cw2 - 0.4, h: 0.27, size: 12 });
    });
    if (py + 0.5 + 3 * rs + 0.27 > G.bottom - 0.12) warn('IR parts overflow');
    const rx = G.L + lw + 0.35, rw = G.R - rx;
    label(s, '实验原理', { x: rx, y: G.top, w: 3, h: 0.3, size: 13, bold: true });
    const fy = G.top + 0.4, fh = 0.72, ag = 0.32, fw = (rw - 2 * ag) / 3;
    const F = [['前方有障碍物', P.card, P.ink], ['OUT 输出 0', P.ink, P.white], ['LED 亮\n蜂鸣器响', P.turq, P.ink]];
    F.forEach(([t, fill], i) => {
      const x = rx + i * (fw + ag);
      fbox(s, { x, y: fy, w: fw, h: fh, fill, text: t, size: 12.5 });
      if (i < 2) V.arrow(s, x + fw + 0.04, fy + fh / 2, x + fw + ag - 0.04, fy + fh / 2, { color: P.muted });
    });
    label(s, '没有障碍物：OUT 输出 1 → LED 灭、蜂鸣器不响', { x: rx, y: fy + fh + 0.08, w: rw, h: 0.26, size: 12, color: P.muted });
    const ty = fy + fh + 0.6;
    label(s, '和 1-3 的小磁簧开关比一比', { x: rx, y: ty, w: rw, h: 0.3, size: 13, bold: true });
    V.table(s, [
      ['', '小磁簧开关', '红外避障模块'],
      [{ text: '触发条件', bold: true }, '磁铁靠近', '前方有障碍物'],
      [{ text: '触发时读到', bold: true }, '0（低电平）', '0（低电平）'],
      [{ text: '引脚与程序', bold: true }, '12 / 11 / 13', '完全相同'],
    ], { x: rx, y: ty + 0.38, w: rw, colW: [1.3, (rw - 1.3) / 2, (rw - 1.3) / 2], rowH: 0.33, size: 12, align: ['left', 'center', 'center'] });
    if (ty + 0.38 + 4 * 0.33 > G.bottom + 0.02) warn('IR compare table overflow');
  }

  // ---------------------------------------------------------------- IR: wiring
  s = slide({
    title: '接线：三个模块，三张表',
    desc: '红外模块 OUT 接 12，LED 模块 + 接 11，有源蜂鸣器 + 接 13；所有 GND 都接 UNO 的 GND',
    notes: '三张表照原指南抄录，一张一张对着接；接线图里的 LED 用的是 RGB 贴片模块，11 号脚接它的 R 脚，所以亮的是红灯，用普通 LED 模块也可以。红外模块的 VCC 接 5V。UNO 上有好几个 GND 口，哪个都可以。先断电再接线，接完同桌互相检查。',
  });
  {
    const iw = 4.65;
    V.imageBox(s, { file: 'l22/ir_wiring.jpg', x: G.L, y: G.top, w: iw, h: G.ch, diagram: true, caption: '原指南接线图：LED 用的是 RGB 贴片模块（11 → R 脚）', capH: 0.3 });
    const rx = G.L + iw + 0.35, rw = G.R - rx, rowH = 0.3, gap = 0.3;
    let y = V.wiring(s, { x: rx, y: G.top, w: rw, right: '红外避障模块', rows: [['12', 'OUT'], ['5V', 'VCC'], ['GND', 'GND']], rowH, size: 12.5 }) + gap;
    y = V.wiring(s, { x: rx, y, w: rw, right: 'LED', rows: [['11', '+'], ['GND', '—']], rowH, size: 12.5 }) + gap;
    y = V.wiring(s, { x: rx, y, w: rw, right: '有源蜂鸣器', rows: [['13', '+'], ['GND', '—']], rowH, size: 12.5 });
    if (y > G.bottom + 0.01) warn('IR wiring tables overflow');
  }

  // ---------------------------------------------------------------- IR: code 1/2
  s = slide({
    title: '代码逐行看懂（1/2）：准备工作',
    desc: '先给三个引脚起名字、准备装读数的盒子，再在 setup() 里分好输入和输出',
    notes: '原指南这一页程序是空白的，这里用同一套件《Arduino 编程入门学习教程》第 2.25 讲的程序，引脚和本指南一致。前 4 行准备了四个“盒子”：三个装引脚号，一个装读数。setup() 里 LED 和蜂鸣器是输出，红外模块是输入。',
  });
  {
    const cw = 4.4, chh = 2.75;
    const b = codeBlock2(s, { x: G.L, y: G.top, w: cw, h: chh, code: IR_CODE, from: 1, to: 11, hl: [1, 2, 3, 9], file: 'ir_obstacle.ino', right: '第 1–11 行' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.top + chh, gap: 0.12, items: [
      { line: [1, 3], text: '给三个引脚起名字：\nLED 11、蜂鸣器 13、传感器 12' },
      { line: 4, text: 'val：装读数的盒子，先放 0' },
      { line: 5, text: 'setup()：通电后只运行一次' },
      { line: [7, 8], text: 'LED、蜂鸣器设为输出' },
      { line: [9, 10], text: '红外模块设为输入；打开串口 9600' },
    ] });
    const ty = G.top + chh + 0.3;
    noteStrip(s, I.book, '原指南此处程序空白：这里用同一套件《Arduino 编程入门学习教程》第 2.25 讲的程序，引脚与本指南一致（OUT 12、LED 11、蜂鸣器 13）。', { x: G.L, y: ty, w: G.cw, h: G.bottom - ty });
  }

  // ---------------------------------------------------------------- IR: code 2/2
  s = slide({
    title: '代码逐行看懂（2/2）：读、打印、判断',
    desc: '和 1-3 小磁簧开关的程序一模一样：读到 0（有障碍物）就亮灯、响蜂鸣器，否则全部关掉',
    notes: 'loop() 只做三件事：读、打印、判断。第 16 行 val==0 对应“前方有障碍物”，所以成立时灯亮、蜂鸣器响；else 分支把它们关掉。提醒学生比较相等要写两个等号。可以把 1-3 的磁簧开关程序打开对照，会发现一个字都不用改。',
  });
  {
    const cw = 4.6;
    const b = codeBlock2(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: IR_CODE, from: 12, to: 26, hl: [14, 15, 16, 21], file: 'ir_obstacle.ino', right: '第 12–26 行' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.1, items: [
      { line: 14, text: '读 12 号脚：有障碍物是 0，没有是 1' },
      { line: 15, text: '把读数打印到串口，一行一个' },
      { line: 16, text: '岔路口：val 等于 0 吗？（== 是比较）' },
      { line: [18, 19], text: '是（有障碍物）：LED 亮、蜂鸣器响' },
      { line: 21, text: '否则（val 是 1）……' },
      { line: [23, 24], text: '……LED 灭、蜂鸣器停' },
    ] });
  }

  // ---------------------------------------------------------------- IR: result
  s = slide({
    title: '实验结果：挡一下，灯亮、蜂鸣器响',
    desc: '把手挡在红外模块前：模块绿灯亮、RGB 模块亮红灯、蜂鸣器响；手拿开，全部熄灭',
    notes: '原指南的实验结果只有两张照片。右边照片里，红外模块上的两个绿灯都亮了（一个是电源灯，一个是检测到障碍物的指示灯），RGB 模块亮红灯。让学生打开串口监视器，挡一下、拿开，看 0 和 1 的变化。检测距离不合适时，用螺丝刀拧蓝色电位器调节。',
  });
  {
    const p1 = 2.35;
    V.imageBox(s, { file: 'l22/ir_result_photo.jpg', x: G.L, y: G.top, w: p1, h: G.ch, caption: '原指南实物照片' });
    const p2x = G.L + p1 + 0.3, p2w = 3.85;
    V.imageBox(s, { file: 'l22/ir_result_photo2.jpg', x: p2x, y: G.top, w: p2w, h: G.ch, caption: '检测到障碍物：红灯亮、模块绿灯亮' });
    const rx = p2x + p2w + 0.3, rw = G.R - rx;
    const A = [
      { t: '挡住它', d: 'val = 0\nLED 亮、蜂鸣器响', fill: P.turqPale },
      { t: '拿开', d: 'val = 1\nLED 灭、蜂鸣器停', fill: P.card },
    ];
    const ah = 1.0;
    A.forEach((a, i) => {
      const y = G.top + i * (ah + 0.3);
      V.card(s, { x: rx, y, w: rw, h: ah, fill: a.fill });
      label(s, a.t, { x: rx + 0.18, y: y + 0.08, w: rw - 0.36, h: 0.3, size: 13.5, bold: true });
      txt(s, a.d, { x: rx + 0.18, y: y + 0.42, w: rw - 0.3, h: ah - 0.46, size: 12 });
    });
    const ty = G.top + 2 * (ah + 0.3), th = G.bottom - ty;
    V.card(s, { x: rx, y: ty, w: rw, h: th });
    V.iconCircle(s, I.sliders, { x: rx + 0.16, y: ty + 0.14, d: 0.32 });
    label(s, '调距离', { x: rx + 0.58, y: ty + 0.14, w: rw - 0.7, h: 0.32, size: 13.5, bold: true });
    txt(s, '拧蓝色电位器，调远或调近', { x: rx + 0.16, y: ty + 0.54, w: rw - 0.3, h: th - 0.58, size: 12 });
  }

  // ---------------------------------------------------------------- IR: shield + pitfalls
  s = slide({
    title: '扩展板接法、常见坑与动手改一改',
    desc: '有 Sensor V5.0 扩展板时用杜邦线直插更方便；一直报警、黑色物体测不到，是两个最常见的问题',
    notes: '扩展板把每个数字脚都扩展成 G、V、S 三根针，模块直接插上，引脚号不变，程序也不用改。一直报警多半是检测距离调得太远，或者模块正对着桌面；黑色物体会吸收红外线，反光太弱，要靠得更近才能测到。动手改一改：把条件反过来就成了“东西被拿走才报警”的防盗器。',
  });
  {
    const iw = 2.55;
    V.imageBox(s, { file: 'l22/ir_shield_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '扩展板接法（原指南）' });
    const rx = G.L + iw + 0.3, rw = G.R - rx, nh = 0.85;
    V.tip(s, { x: rx, y: G.top, w: rw, h: nh, kind: 'note', text: '原指南：如果你的套件中有 Sensor V5.0 扩展板，可以按照左图接线，更加方便。引脚号不变，程序不用改。', size: 12 }, I.puzzle);
    const wy = G.top + nh + 0.3, wh = 1.5, ww = (rw - 0.3) / 2;
    warnCard(s, I.times_w, '一直在报警', '检测距离调得太远，或模块正对着桌面、墙面。拧蓝色电位器调近，直到前方没东西时绿灯熄灭。', { x: rx, y: wy, w: ww, h: wh });
    warnCard(s, I.times_w, '黑色物体测不到', '黑色表面会吸收红外线，反光太弱，要靠得更近才能检测到。', { x: rx + ww + 0.3, y: wy, w: ww, h: wh });
    const my = wy + wh + 0.3;
    noteStrip(s, I.pencil, [R('动手改一改　', { bold: true }), R('把 '), M('if(val==0)', { bold: true }), R(' 改成 '), M('if(val==1)', { bold: true }), R('：东西被拿走才报警，就是一个简易防盗器。')], { x: rx, y: my, w: rw, h: G.bottom - my, fill: P.card });
  }

  // ================================================================ EXPERIMENT 4: DHT11
  deck.section('实验四　温湿度传感器');
  divider({
    kicker: '实验 04',
    title: '温湿度传感器\n模块实验',
    desc: 'DHT11 只用一根数据线，就能把温度和湿度“说”给 Arduino 听。我们先看懂它的“说话规则”（时序），再用现成的库读出数据，显示在 LCD1602 上。',
    tiles: [
      { fill: P.turq, big: '01', title: '认识', sub: 'DHT11 · 单总线', subSize: 12 },
      { fill: P.gray1, big: '02', title: '时序', sub: '高电平长短 = 0 / 1', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: '库 · 对象.成员', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: 'LCD 显示温湿度', subSize: 12 },
    ],
    notes: '实验四是本节最“深”的一个：先认识 DHT11，再用 5 张时序图看懂它怎么在一根线上发数据。时序不用背，理解“高电平短是 0、长是 1”就够了，因为库会替我们处理。最后第一次用到“库”和“对象”，把温湿度显示在 LCD1602 上。',
  });

  // ---------------------------------------------------------------- DHT: intro
  s = slide({
    title: '认识 DHT11：一个模块，两种本领',
    desc: 'DHT11 里装着测湿度的电阻式元件、测温度的 NTC 元件和一颗 8 位单片机，直接输出校准好的数字信号',
    notes: 'DHT11 是一种复合传感器：一个小盒子里同时测温度和湿度，内部的单片机把测量结果变成数字信号送出来，所以它不是 analogRead 读的模拟量。右边是原指南的引脚说明：DATA 线必须接一个约 5.1kΩ 的上拉电阻，让它空闲时保持高电平；做成模块的 DHT11 一般已在板上带好这个电阻，NC 脚也不用接，所以模块只要接 VCC、GND、OUT 三根线。上电后约 1 秒才稳定。右下角是本实验的目的。',
  });
  {
    const lw = 4.3, ph = 2.35;
    V.imageBox(s, { file: 'l22/dht_photo.jpg', x: G.L, y: G.top, w: lw, h: ph, caption: '温湿度传感器实物图（原指南）' });
    const sy = G.top + ph + 0.3, sh = G.bottom - sy, sg = 0.3, sw = (lw - 2 * sg) / 3;
    [[I.tint, '湿度', '电阻式元件'], [I.thermo, '温度', 'NTC 元件'], [I.chip, '处理', '8 位单片机']].forEach(([ic, t, d], i) => {
      const x = G.L + i * (sw + sg);
      V.card(s, { x, y: sy, w: sw, h: sh, fill: i < 2 ? P.turqPale : P.card });
      V.iconCircle(s, ic, { x: x + 0.14, y: sy + 0.14, d: 0.34 });
      label(s, t, { x: x + 0.56, y: sy + 0.14, w: sw - 0.66, h: 0.34, size: 13.5, bold: true });
      label(s, d, { x: x + 0.14, y: sy + 0.6, w: sw - 0.24, h: 0.28, size: 12 });
    });
    const rx = G.L + lw + 0.35, rw = G.R - rx;
    label(s, '引脚说明（原指南）', { x: rx, y: G.top, w: rw, h: 0.3, size: 13, bold: true });
    const rows = [
      ['引脚', '名称', '说明'],
      ['1', 'VDD', '电源正极（3～5V）'],
      ['2', 'DATA', '串行数据，单总线；需约 5.1kΩ 上拉电阻，空闲时保持高电平（模块上一般已带好）'],
      ['3', 'GND', '电源负极'],
      ['4', 'NC', '悬空，不用接'],
    ];
    const rh = [0.3, 0.32, 0.76, 0.32, 0.32];
    V.table(s, rows, { x: rx, y: G.top + 0.38, w: rw, colW: [0.6, 0.85, rw - 1.45], rowH: rh, size: 12, monoCols: [1], boldCols: [1], align: ['center', 'left', 'left'] });
    const cy = G.top + 0.38 + rh.reduce((a, b) => a + b, 0) + 0.3, chh = G.bottom - cy;
    V.card(s, { x: rx, y: cy, w: rw, h: chh, fill: P.turqPale });
    V.iconCircle(s, I.target, { x: rx + 0.16, y: cy + (chh - 0.36) / 2, d: 0.36 });
    txt(s, [R('实验目的　', { bold: true }), R('用 DHT11 检测温度和湿度，显示在 LCD1602 上：第一行温度，第二行湿度。')], { x: rx + 0.64, y: cy + 0.04, w: rw - 0.78, h: chh - 0.08, size: 12, valign: 'middle' });
  }

  // ---------------------------------------------------------------- DHT: protocol overview (sequence)
  s = slide({
    title: 'DHT11 怎么“说话”：一根线、40 位数据',
    desc: 'Arduino 先“点名”，DHT11 再回答：一次发 40 位 = 湿度整数 + 湿度小数 + 温度整数 + 温度小数 + 校验和',
    notes: '先看全貌：DHT11 和 Arduino 只靠一根数据线通信，像课堂点名，主机 Arduino 先喊，从机 DHT11 才回答。一次对话分四步：起始、响应、40 位数据、结束；结束时 DHT11 把线拉低 50 微秒再松开，线又回到高电平。40 位分成 5 个 8 位的数，最后一个是校验和：前四个数相加只取低 8 位，等于它才说明没传错；高位先发，叫“大端”。还要知道：每次读到的是 DHT11 上一次测量的结果。',
  });
  {
    const iw = 6.35, ih = 2.2;
    V.imageBox(s, { file: 'l22/dht_timing_sequence.jpg', x: G.L, y: G.top, w: iw, h: ih, diagram: true, caption: '原指南：完整时序图（粗线 = 主机发出，细线 = DHT11 发出）' });
    const rx = G.L + iw + 0.3, rw = G.R - rx;
    V.card(s, { x: rx, y: G.top, w: rw, h: ih, fill: P.turqPale });
    label(s, '一次对话 4 步', { x: rx + 0.18, y: G.top + 0.12, w: rw - 0.36, h: 0.3, size: 13, bold: true });
    const ly = numList(s, ['起始：Arduino 点名', '响应：DHT11 答到', '数据：连发 40 位', '结束：拉低后松开'], { x: rx + 0.18, y: G.top + 0.54, w: rw - 0.3, size: 12, gap: 0.1, d: 0.28 });
    if (ly > G.top + ih - 0.05) warn('protocol steps overflow');
    const by = G.top + ih + 0.3, bh = 0.8, n = 5, bg = 0.12, bw = (G.cw - bg * (n - 1)) / n;
    const B = [
      { t: '湿度整数', v: '46', fill: P.turq },
      { t: '湿度小数', v: '0', fill: P.turq },
      { t: '温度整数', v: '24', fill: P.gray1 },
      { t: '温度小数', v: '0', fill: P.gray1 },
      { t: '校验和', v: '70', fill: P.ink },
    ];
    B.forEach((b, i) => {
      const x = G.L + i * (bw + bg), dark = b.fill === P.ink;
      V.card(s, { x, y: by, w: bw, h: bh, fill: b.fill, radius: 0.08 });
      label(s, b.t, { x: x + 0.14, y: by + 0.08, w: bw - 0.7, h: 0.28, size: 12, bold: true, color: dark ? P.white : P.ink });
      label(s, '8 位', { x: x + bw - 0.6, y: by + 0.08, w: 0.46, h: 0.28, size: 10.5, color: dark ? 'D0D0D0' : P.muted, align: 'right' });
      label(s, b.v, { x: x + 0.14, y: by + 0.38, w: bw - 0.28, h: 0.36, size: 18, bold: true, mono: true, color: dark ? P.turq : P.ink });
    });
    const fy = by + bh + 0.08;
    label(s, [R('校验和 = 前 4 个数相加（只取低 8 位）：', { bold: true }), R('46 + 0 + 24 + 0 = 70，对得上才算没传错')], { x: G.L, y: fy, w: G.cw, h: G.bottom - fy, size: 12 });
  }

  // ---------------------------------------------------------------- DHT: start + response
  s = slide({
    title: '时序细节①：起始信号与响应信号',
    desc: 'Arduino 把线拉低超过 18ms 叫醒 DHT11；DHT11 先拉低 80μs、再拉高 80μs，表示“我准备好了”',
    notes: '左图是主机 Arduino 发的起始信号：先高电平，再拉低超过 18 毫秒，这是在“叫醒”DHT11，让它从低功耗模式切换到高速模式，然后 Arduino 松开线，上拉电阻把线拉回高电平。右图是 DHT11 的回答：先拉低 80 微秒表示“到”，再拉高 80 微秒表示“准备好了”，接着就开始发 40 位数据。原指南右边这一节的标题把 DHT 误写成了 THD。',
  });
  {
    const gap = 0.3, w = (G.cw - gap) / 2, ih = 2.1;
    const cols = [
      { t: '主机起始信号（Arduino → DHT11）', file: 'l22/dht_timing_start.jpg', cap: '原指南：主机发送起始信号（>18ms）',
        list: ['先输出高电平，再拉低超过 18ms', 'DHT11 被叫醒：从低功耗模式切到高速模式', '改为输入：上拉电阻把线拉回高电平'] },
      { t: 'DHT11 响应信号（DHT11 → Arduino）', file: 'l22/dht_timing_response.jpg', cap: '原指南图（标题“THD 响应信号”应为 DHT）',
        list: ['输出 80μs 低电平：应答“到！”', '再输出 80μs 高电平：准备好发数据了', '接着连续发出 40 位数据（上一次测得的）'] },
    ];
    cols.forEach((c, i) => {
      const x = G.L + i * (w + gap);
      V.numCircle(s, i + 1, { x, y: G.top + 0.01, d: 0.3, size: 11 });
      label(s, c.t, { x: x + 0.4, y: G.top, w: w - 0.4, h: 0.32, size: 13, bold: true });
      V.imageBox(s, { file: c.file, x, y: G.top + 0.42, w, h: ih, diagram: true, caption: c.cap });
      const ly = numList(s, c.list, { x, y: G.top + 0.42 + ih + 0.2, w, size: 12, gap: 0.08, d: 0.26, fill: P.gray1 });
      if (ly > G.bottom + 0.02) warn('start/response list overflow');
    });
  }

  // ---------------------------------------------------------------- DHT: bits
  s = slide({
    title: '时序细节②：高电平的长短表示 0 和 1',
    desc: '每一位都先拉低 50μs，接着看高电平多长：短（26–28μs）是 0，长（70μs）是 1',
    notes: '这是 DHT11 最巧妙的地方：它不是用“高电平 = 1、低电平 = 0”，而是用高电平持续的长短来区分。可以类比摩尔斯电码：短音是点，长音是划；这里短高电平是 0，长高电平是 1。40 位发完，DHT11 再拉低 50 微秒后松开，表示结束。这些微秒级的时序都由 dht11 库帮我们处理，程序里只要一句 DHT11.read()。',
  });
  {
    const gap = 0.3, w = (G.cw - gap) / 2, ih = 2.0;
    V.imageBox(s, { file: 'l22/dht_timing_bit0.jpg', x: G.L, y: G.top, w, h: ih, diagram: true, caption: '“0”：50μs 低电平 + 26–28μs 高电平' });
    V.imageBox(s, { file: 'l22/dht_timing_bit1.jpg', x: G.L + w + gap, y: G.top, w, h: ih, diagram: true, caption: '“1”：50μs 低电平 + 70μs 高电平' });
    const cy = G.top + ih + 0.3, chh = G.bottom - cy;
    // analogy card
    V.card(s, { x: G.L, y: cy, w, h: chh, fill: P.turqPale });
    V.iconCircle(s, I.signal, { x: G.L + 0.16, y: cy + 0.14, d: 0.36 });
    label(s, '像摩尔斯电码', { x: G.L + 0.64, y: cy + 0.14, w: w - 0.8, h: 0.36, size: 14, bold: true });
    txt(s, [R('短音、长音拼字母；DHT11 用短、长高电平拼出 0 和 1。'), R('好消息：', { bold: true }), R('时序都由 dht11 库处理，程序里一句 DHT11.read() 就够。')],
      { x: G.L + 0.16, y: cy + 0.58, w: w - 0.3, h: chh - 0.62, size: 12 });
    // drawn pulse train
    const px = G.L + w + gap;
    V.card(s, { x: px, y: cy, w, h: chh });
    label(s, '例：依次发出 0、1、1、0', { x: px + 0.18, y: cy + 0.1, w: w - 0.36, h: 0.28, size: 12, bold: true });
    const bits = [0, 1, 1, 0], x0 = px + 0.25, x1 = px + w - 0.25;
    const total = 15 + bits.reduce((a, b) => a + 50 + (b ? 70 : 27), 0) + 15;
    const k = (x1 - x0) / total, hi = cy + 0.55, lo = cy + 0.95;
    const pts = [[x0, hi], [x0 + 15 * k, hi], [x0 + 15 * k, lo]];
    let t = 15;
    const labs = [];
    bits.forEach((b) => {
      t += 50; pts.push([x0 + t * k, lo], [x0 + t * k, hi]);
      const hw = b ? 70 : 27;
      labs.push([x0 + t * k, hw * k, b]);
      t += hw; pts.push([x0 + t * k, hi], [x0 + t * k, lo]);
    });
    pts.push([x1, lo]);
    labs.forEach(([lx, lw2, b]) => {
      s.addShape('rect', { x: lx, y: hi, w: lw2, h: lo - hi, fill: { color: b ? P.turq : P.gray2 }, line: { color: b ? P.turq : P.gray2, width: 0 } });
      V.text(s, b ? '1（长）' : '0（短）', { x: lx + lw2 / 2 - 0.4, y: lo + 0.04, w: 0.8, h: 0.24, size: 10.5, bold: true, align: 'center', valign: 'middle' });
    });
    polyline(s, pts, { color: P.ink, width: 2 });
    if (lo + 0.3 > cy + chh - 0.04) warn('pulse drawing overflow');
  }

  // ---------------------------------------------------------------- DHT: wiring
  s = slide({
    title: '组件与接线：LCD 接 I2C，DHT11 接 8 号脚',
    desc: 'LCD 四根线：SDA → A4、SCL → A5、VCC → 5V、GND → GND；温湿度模块 OUT → 8 号脚',
    notes: '这是我们第一次用 LCD1602 显示屏：16 列 2 行，背面的 PCF8574T 转接板把十几根线变成 4 根，用 I2C 通信，下一节 2-3 会专门讲它。LCD 的 SDA、SCL 分别接 A4、A5，这两个口在 UNO 上就是 I2C 接口，这时它们不是在读模拟量。温湿度模块的信号脚 OUT 接 8 号脚，对应程序里的 #define DHT11PIN 8。原指南组件清单里的“DTH11”是笔误，应为 DHT11。',
  });
  {
    const iw = 5.4, ih = 2.6;
    V.imageBox(s, { file: 'l22/dht_wiring.jpg', x: G.L, y: G.top, w: iw, h: ih, diagram: true, caption: '原指南接线图' });
    const ny = G.top + ih + 0.3;
    V.card(s, { x: G.L, y: ny, w: iw, h: G.bottom - ny });
    txt(s, [R('组件清单　', { bold: true }), R('UNO R3 主板、面包板、USB 数据线、若干跳线', { breakLine: true }), R('LCD1602 模块 ×1、DHT11 温湿度模块 ×1（原文误作 DTH11）')], { x: G.L + 0.18, y: ny + 0.04, w: iw - 0.36, h: G.bottom - ny - 0.08, size: 12, valign: 'middle' });
    const rx = G.L + iw + 0.35, rw = G.R - rx, rowH = 0.28;
    const y1 = V.wiring(s, { x: rx, y: G.top, w: rw, left: 'LCD 显示屏 PCF8574T', right: 'Arduino', rows: [['GND', 'GND'], ['VCC', '5V'], ['SDA', 'A4'], ['SCL', 'A5']], rowH, size: 12, colW: [rw * 0.6, rw * 0.4] });
    const y2 = V.wiring(s, { x: rx, y: y1 + 0.3, w: rw, left: '温湿度传感器', right: 'Arduino', rows: [['GND', 'GND'], ['VCC', '5V'], ['OUT', '8']], rowH, size: 12, colW: [rw * 0.6, rw * 0.4] });
    const qy = y2 + 0.3;
    V.card(s, { x: rx, y: qy, w: rw, h: G.bottom - qy, fill: P.turqPale });
    txt(s, [R('A4 = SDA，A5 = SCL：', { bold: true }), R('这里当 I2C 接口用，不是读模拟量')], { x: rx + 0.16, y: qy + 0.04, w: rw - 0.32, h: G.bottom - qy - 0.08, size: 12, valign: 'middle' });
  }

  // ---------------------------------------------------------------- DHT: syntax 1 (library, #define, object)
  s = slide({
    title: '新语法小课堂①：库、#define 和对象',
    desc: '库是别人写好的“工具箱”，#include 把它搬进来；用 对象.成员 指挥一台具体的设备',
    notes: '库就像借来的一整套工具：DHT11 复杂的微秒级时序、LCD 的显示细节，都已经写在库里，我们拿来就用。dht11 和 LiquidCrystal_I2C 两个库在套件资料的库文件里，要先安装，否则编译时会提示 No such file。#define 像“查找替换”，编译前把名字换成数字。对象可以类比“型号”和“你手里这一台”：dht11 是型号，DHT11 是这一台，用点号来按它的按钮、看它的读数。',
  });
  {
    const gap = 0.3, ws = [3.25, 2.5, G.cw - 3.25 - 2.5 - 2 * gap];
    const xs = [G.L, G.L + ws[0] + gap, G.L + ws[0] + ws[1] + 2 * gap];
    // library card (with the three libraries this program uses)
    conceptCard(s, I, {
      x: xs[0], y: G.top, w: ws[0], h: G.ch, icon: I.box, title: '库与 #include', compact: true,
      text: '像借来一套工具：复杂的细节，库里都写好了。',
      code: '#include "dht11.h"',
      extra: (y) => {
        const L = [['Wire.h', 'I2C 通信'], ['dht11.h', '读温湿度'], ['LiquidCrystal_I2C.h', 'I2C 液晶屏']];
        L.forEach(([f, d], i) => {
          V.pill(s, { x: xs[0] + 0.18, y: y + i * 0.34, w: 1.85, h: 0.27, text: f, size: 10, fill: P.white, line: P.gray2, color: P.ink, mono: true, bold: false });
          label(s, d, { x: xs[0] + 0.18 + 1.93, y: y + i * 0.34 - 0.01, w: ws[0] - 0.36 - 1.93, h: 0.29, size: 12 });
        });
        return y + 3 * 0.34;
      },
      mistake: '没安装库：编译时报 No such file。',
    });
    conceptCard(s, I, {
      x: xs[1], y: G.top, w: ws[1], h: G.ch, icon: I.tag, title: '#define 起外号', compact: true,
      text: '像“查找替换”：编译前把名字换成后面的值。',
      code: '#define DHT11PIN 8',
      mistake: '末尾加分号：分号也会被替换进去。',
    });
    conceptCard(s, I, {
      x: xs[2], y: G.top, w: ws[2], h: G.ch, icon: I.cogs, title: '对象.成员', compact: true,
      text: 'dht11 是“型号”，DHT11 是你手里这一台；用“.”按它的按钮、看它的读数。',
      code: 'dht11 DHT11;   // 造一台\nDHT11.read(8); // 读一次\nDHT11.humidity // 湿度',
      mistake: '大小写写错：dht11 是型号，DHT11 才是对象。',
    });
  }

  // ---------------------------------------------------------------- DHT: syntax 2 (LCD)
  s = slide({
    title: '新语法小课堂②：setCursor() 和 print()',
    desc: 'setCursor(列, 行) 先把光标移到位置（从 0 开始数），print() 再把文字或数字写上去',
    notes: '用“格子本”来类比：LCD1602 是一个 16 × 2 的格子本，setCursor 是用手指点到第几格，print 是从那一格开始往后写。行和列都从 0 开始数，第二行是 1。print 的第二个参数 2 表示保留 2 位小数，(float) 先把整数变成小数，所以 24 会显示成 24.00。print 不会自动擦掉旧字，新内容比旧内容短时，后面会残留旧字符。',
  });
  {
    const lw = 5.6, ah = 2.05;
    V.card(s, { x: G.L, y: G.top, w: lw, h: ah });
    label(s, [M('setCursor(列, 行)', { bold: true }), R('：先指好从哪一格开始写')], { x: G.L + 0.2, y: G.top + 0.1, w: lw - 0.4, h: 0.3, size: 12.5 });
    const cs = 0.29, gx = G.L + 0.55, gy = G.top + 0.76, rh = 0.4;
    for (let c = 0; c < 16; c++) V.text(s, String(c), { x: gx + c * cs, y: gy - 0.26, w: cs, h: 0.22, size: 10, color: P.muted, align: 'center', valign: 'middle', mono: true });
    ['0', '1'].forEach((r, i) => V.text(s, r, { x: gx - 0.3, y: gy + i * rh, w: 0.24, h: rh, size: 10, color: P.muted, align: 'center', valign: 'middle', mono: true }));
    const L2 = ['Tep: 24.00C', 'Hum: 46.00%'];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 16; c++) {
        const ch = L2[r][c] || '';
        s.addShape('rect', { x: gx + c * cs, y: gy + r * rh, w: cs, h: rh, fill: { color: c === 0 ? P.turq : P.white }, line: { color: P.gray2, width: 0.75 } });
        if (ch && ch !== ' ') V.text(s, ch, { x: gx + c * cs, y: gy + r * rh, w: cs, h: rh, size: 13, bold: true, mono: true, align: 'center', valign: 'middle' });
      }
    }
    label(s, [M('setCursor(0, 0)', { bold: true }), R(' → 第一行开头　'), M('setCursor(0, 1)', { bold: true }), R(' → 第二行开头')], { x: G.L + 0.2, y: gy + 2 * rh + 0.12, w: lw - 0.4, h: 0.26, size: 11 });
    const by = G.top + ah + 0.3, bh = G.bottom - by;
    V.card(s, { x: G.L, y: by, w: lw, h: bh });
    label(s, '(float) 和“保留 2 位小数”', { x: G.L + 0.2, y: by + 0.1, w: lw - 0.4, h: 0.28, size: 12.5, bold: true });
    const mh = miniCode(s, 'lcd.print((float)DHT11.temperature, 2);', { x: G.L + 0.2, y: by + 0.44, w: lw - 0.4, size: 10.5 });
    label(s, '(float) 变成小数，参数 2 = 保留 2 位：24 → 24.00', { x: G.L + 0.2, y: by + 0.44 + mh + 0.06, w: lw - 0.4, h: 0.28, size: 12 });
    if (by + 0.44 + mh + 0.06 + 0.28 > G.bottom - 0.04) warn('float card overflow');
    const rx = G.L + lw + 0.3, rw = G.R - rx, th = 1.55;
    V.tip(s, { x: rx, y: G.top, w: rw, h: th, kind: 'tip', title: '像在格子本上写字', text: 'LCD1602 是 16 列 × 2 行的格子本：setCursor 指到第几格，print 从那里往后写。', size: 12 }, I.pencil);
    const wy = G.top + th + 0.3;
    warnCard(s, I.times_w, '常见错误', '① 行号从 0 开始：第二行是 1\n② print 不擦旧字：新内容更短时，后面会残留旧字符', { x: rx, y: wy, w: rw, h: G.bottom - wy });
  }

  // ---------------------------------------------------------------- DHT: code 1/2
  s = slide({
    title: '代码逐行看懂（1/2）：库、对象和准备工作',
    desc: '引入三个库，给 8 号脚起外号，创建传感器对象 DHT11 和屏幕对象 lcd，再初始化屏幕',
    notes: '前三行引入三个库：Wire 负责 I2C 通信，dht11 负责读温湿度，LiquidCrystal_I2C 负责 I2C 液晶屏；第 2 行 #include 后面少了空格，也能正常编译。第 7 行创建屏幕对象 lcd，括号里依次是 I2C 地址 0x27、16 列、2 行。第 9 行把 8 号脚设为输出，其实 dht11 库读数时会自己切换输入输出。第 12 行打开了串口，但这个程序没有用串口打印。',
  });
  {
    const cw = 5.25;
    const b = codeBlock2(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: DHT_CODE, from: 1, to: 13, hl: [1, 2, 3, 5, 6, 7], file: 'dht11_lcd.ino', right: '第 1–13 行' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.1, items: [
      { line: [1, 3], text: '引入三个库（上一页讲过）' },
      { line: [5, 6], text: '8 号脚起外号 DHT11PIN；\n创建传感器对象 DHT11' },
      { line: 7, text: '创建屏幕对象 lcd：\n地址 0x27，16 列 2 行' },
      { line: 9, text: '8 号脚先设为输出（库会自己切换）' },
      { line: [10, 12], text: '初始化屏幕、开背光；开串口（本程序没用到）' },
    ] });
  }

  // ---------------------------------------------------------------- DHT: code 2/2
  s = slide({
    title: '代码逐行看懂（2/2）：读一次，写两行',
    desc: 'loop() 每轮：读一次温湿度 → 光标移到第一行写温度 → 移到第二行写湿度 → 等 0.2 秒',
    notes: '第 16 行 DHT11.read() 读一次温湿度，返回值 chk 是结果码，0 表示读取成功，这个程序没有用它，课后可以加上判断。第 18–20 行在第一行显示 Tep: 24.00C，Tep 是原程序对 Temp 的简写；第 22–24 行在第二行显示湿度。第 25 行 delay(200) 偏短：DHT11 两次读取最好间隔 1 秒以上，原指南也说间隔 5 秒以上最准确，建议改成 delay(2000)。',
  });
  {
    const cw = 4.75, chh = 3.06;
    const b = codeBlock2(s, { x: G.L, y: G.top, w: cw, h: chh, code: DHT_CODE, from: 15, to: 26, hl: [16, 17, 19, 21, 23, 25], file: 'dht11_lcd.ino', right: '第 15–26 行' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.1, items: [
      { line: 16, text: '读一次温湿度；chk 是结果码（0 为成功），没用到' },
      { line: 17, text: '光标移到第 1 行开头' },
      { line: [18, 20], text: '显示 Tep: 24.00C（Tep 即 Temp）' },
      { line: 21, text: '光标移到第 2 行开头' },
      { line: [22, 24], text: '显示 Hum: 46.00%' },
      { line: 25, text: '等 0.2 秒再读（偏短，见常见坑）' },
    ] });
    const ty = G.top + chh + 0.25;
    V.card(s, { x: G.L, y: ty, w: cw, h: G.bottom - ty, fill: P.white, line: P.red, lineW: 1 });
    txt(s, [R('第 25 行偏短：', { bold: true, color: P.red }), R('DHT11 两次读取最好隔 1 秒以上')], { x: G.L + 0.16, y: ty + 0.03, w: cw - 0.32, h: G.bottom - ty - 0.06, size: 12, valign: 'middle' });
  }

  // ---------------------------------------------------------------- DHT: result
  s = slide({
    title: '实验结果：LCD 第一行温度，第二行湿度',
    desc: '上传后 LCD 显示 Tep: 24.00C 和 Hum: 46.00%；对着传感器哈口气，湿度会明显上升',
    notes: '上传程序后，LCD 第一行显示温度、第二行显示湿度。可以让学生对着传感器哈一口气，湿度很快上升；用手捂住，温度慢慢上升。为什么小数部分总是 .00？因为 DHT11 只能测到整数精度，程序用 (float) 和保留 2 位小数显示，就成了 24.00。',
  });
  {
    const iw = 4.55;
    V.imageBox(s, { file: 'l22/dht_result_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南实物：LCD 显示 Tep: 24.00C / Hum: 46.00%' });
    const rx = G.L + iw + 0.35, rw = G.R - rx, lh = 1.0;
    lcdMock(s, { x: rx, y: G.top, w: rw, h: lh, lines: ['Tep: 24.00C', 'Hum: 46.00%'], size: 17 });
    const ty = G.top + lh + 0.3, th = 0.9;
    noteStrip(s, I.check, [R('原指南：', { bold: true }), R('结果显示在 LCD 上，第一行显示温度，第二行显示湿度。')], { x: rx, y: ty, w: rw, h: th });
    const qy = ty + th + 0.3;
    V.card(s, { x: rx, y: qy, w: rw, h: G.bottom - qy });
    V.iconCircle(s, I.question, { x: rx + 0.16, y: qy + 0.16, d: 0.36 });
    label(s, '为什么总是 .00？', { x: rx + 0.64, y: qy + 0.16, w: rw - 0.8, h: 0.36, size: 13.5, bold: true });
    txt(s, 'DHT11 只测到整数精度，程序用 (float) 保留 2 位小数显示，就成了 24.00。', { x: rx + 0.16, y: qy + 0.6, w: rw - 0.32, h: G.bottom - qy - 0.66, size: 12 });
  }

  // ---------------------------------------------------------------- DHT: shield + pitfalls
  s = slide({
    title: '扩展板接法、常见坑与动手改一改',
    desc: '有 Sensor V5.0 扩展板时接线更方便；读得太勤、LCD 没字是两个最常见的问题',
    notes: '扩展板照片里的屏幕显示 Tep:30 C 和 Hum:45 %，没有小数，说明那是另一版程序的显示格式，不影响接线方法。常见坑一：delay(200) 读得太勤，DHT11 两次读取最好隔 1 秒以上。常见坑二：LCD 背光亮但没有字，先拧背面的蓝色电位器调对比度，再检查 I2C 地址，常见是 0x27，有的屏是 0x3F。动手改一改让学生在串口里也打印湿度，体会“同一个数据，可以同时显示在两个地方”。',
  });
  {
    const iw = 2.55;
    V.imageBox(s, { file: 'l22/dht_shield_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '扩展板接法（原指南）' });
    const rx = G.L + iw + 0.3, rw = G.R - rx, nh = 0.8;
    V.tip(s, { x: rx, y: G.top, w: rw, h: nh, kind: 'note', text: '原指南：套件中有 Sensor V5.0 扩展板时，可以按左图接线，更加方便。照片里屏幕显示“Tep:30 C / Hum:45 %”，是另一版程序的显示格式。', size: 12 }, I.puzzle);
    const wy = G.top + nh + 0.3, wh = 1.55, ww = (rw - 0.3) / 2;
    warnCard(s, I.times_w, '读得太勤', 'delay(200) 太短：DHT11 两次读取最好间隔 1 秒以上，改成 delay(2000) 更稳。', { x: rx, y: wy, w: ww, h: wh });
    warnCard(s, I.times_w, 'LCD 亮了却没有字', '拧背面蓝色电位器调对比度；还不行就查地址：常见是 0x27，有的屏是 0x3F。', { x: rx + ww + 0.3, y: wy, w: ww, h: wh });
    const my = wy + wh + 0.3;
    noteStrip(s, I.pencil, [R('动手改一改　', { bold: true }), R('在 loop() 里加一句 '), M('Serial.println(DHT11.humidity);', { bold: true }), R('，串口监视器里也能看湿度。')], { x: rx, y: my, w: rw, h: G.bottom - my, fill: P.card });
  }

  // ================================================================ summary
  deck.section('小结');
  s = slide({
    title: '本节小结',
    desc: '四个传感器，一条主线：测时间算距离、读字符拼数字、读高低做判断、按时序收数据',
    notes: '用右边四个方块回顾四个实验各自最核心的一句话，再请学生用自己的话解释左边四条。可以追问：超声波和 DHT11 都在“量时间”，有什么不同？（超声波量回声时间算距离，DHT11 用高电平时间长短表示 0 和 1。）下一节 2-3 学 WS2812b 彩灯和 LCD1602 动态显示。',
  });
  {
    const lw = 4.0;
    label(s, '四个实验，一条主线', { x: G.L, y: G.top, w: lw, h: 0.32, size: 15, bold: true });
    const ly = numList(s, [
      [R('超声波：', { bold: true }), R('回声时间 ÷ 58 = 厘米')],
      [R('串口舵机：', { bold: true }), R('一个个读字符，拼成数字')],
      [R('红外避障：', { bold: true }), R('读到 0 = 前方有障碍物')],
      [R('DHT11：', { bold: true }), R('高电平长短 = 0 / 1，共 40 位')],
    ], { x: G.L, y: G.top + 0.46, w: lw, size: 13, gap: 0.14, d: 0.3 });
    label(s, '本节新语法', { x: G.L, y: ly + 0.18, w: lw, h: 0.28, size: 12, bold: true, color: P.muted });
    const tb = V.tags(s, ['const', 'delayMicroseconds()', 'pulseIn()', 'available()', 'read()', 'String', 'toInt()', '#include', '#define', '对象.成员'], { x: G.L, y: ly + 0.52, w: lw, size: 10 });
    if (tb > G.bottom) warn('summary tags overflow');
    tileGrid(s, {
      x: 4.75, y: G.top, w: G.R - 4.75, h: G.ch, cols: 2, bigSize: 26,
      items: [
        { fill: P.turq, big: '÷ 58', title: '超声波测距', sub: '回声时间 → 距离' },
        { fill: P.gray1, big: 'toInt()', bigMono: true, title: '串口读字符', sub: '"180" → 180' },
        { fill: P.ink, big: '0 = 有', title: '红外避障', sub: '低电平 = 有障碍物' },
        { fill: P.white, big: '40 位', title: 'DHT11 单总线', sub: '高电平长短 = 0 / 1' },
      ],
    });
  }

  SLIDE_NO += 1;
  deck.end({
    title: '会测量，也会“说话”',
    subtitle: '把超声波、红外和温湿度装进你的设计，让作品感知周围的世界。\n下一节：2-3　WS2812b 彩灯 · LCD1602 动态显示',
    notes: '收尾：今天的四个传感器，一个量距离，一个听指令，一个看障碍，一个感知冷暖干湿。布置课后任务：选一个传感器，设计一个小装置，比如会提醒“离屏幕太近”的台灯，或会显示温湿度的桌面小摆件，下节课分享。',
  });

  await deck.save(OUT);
  console.log('saved', OUT, 'slides:', SLIDE_NO);
  if (warns.length) console.log(`${warns.length} layout warning(s)`);
})().catch((e) => { console.error(e); process.exit(1); });
