// 1-3 传感器与声光输出：指南里的五个实验，按指南顺序一份 PPT
//   ① AD 模数转换 ② 光敏电阻模块 ③ LED 流水灯 ④ 蜂鸣器模块 ⑤ 小磁簧开关模块
// Source: assets/l13/guide_text.md (PDF p1-20). Run: node build/13_lesson_1-3.js
// Each experiment's slides are built by one function (buildAD … buildReed), called in guide order below.
const V = require('../lib/vti');
const { P, G } = V;

const OUT = __dirname + '/../output/1-3_AD_光敏_流水灯_蜂鸣器_磁簧开关.pptx';

// ------------------------------------------------------------------ programs
// AD: copied from the guide (indent unified to 2 spaces, alignment spaces collapsed).
// The PDF printed loop()'s closing brace before the last delay(1000); it is put back at the end here.
const AD_CODE = `int ADPIN = A0 ;
int LEDPIN = 13 ;
int value = 0 ;
float voltage = 0.0 ;
void setup()
{
  pinMode(ADPIN,INPUT); // define ADPIN input LEDPIN output
  pinMode(LEDPIN,OUTPUT);
  Serial.begin(9600); //Serial Baud rate is 115200
}
void loop()
{
  digitalWrite(LEDPIN,HIGH); // light on led
  value = analogRead(ADPIN); // read analog pin raw data
  voltage = ( ( float )value )/1023 ;
  voltage = voltage * 5 ; // convert analog raw data to real voltage = (analog/1023)*5
  Serial.print("get ad pin value "); //printf Analog pin value
  Serial.print(value);
  Serial.println("\\nvoltage =  ");
  Serial.println(voltage);
  delay(1000);
  digitalWrite(LEDPIN,LOW); //turn off led
  delay(1000);
}`;

// LDR: the PDF left this section blank; program from the same kit's tutorial, lesson 2.20.
const LDR_CODE = `int ADPIN = A0 ;
int LEDPIN = 11 ;
int value = 0 ;
float voltage = 0.0 ;
void setup()
{
  pinMode(LEDPIN,OUTPUT);
  pinMode(ADPIN,INPUT);
  Serial.begin(9600); //Serial Baud rate is 115200
}
void loop()
{
  value = analogRead(ADPIN);
  voltage = ( ( float )value )/1023 ;
  value = (int)(voltage * 256) ; //convert voltage to value
  Serial.println(value);
  analogWrite(LEDPIN,value);
  delay(1000);
}`;

// LED 流水灯 / 蜂鸣器: copied from the guide (indent unified to 2 spaces).
const LED_CODE = `int led_array[8] = { 2 , 3 , 4 , 5 , 6 , 7 , 8 , 9 } ;
int flash_speed = 100 ;

/* flash led form left to right one by one */
void led_flash(void)
{
  int i ;
  for( i = 0 ; i < 8 ; i++ )
  {
    digitalWrite(led_array[i],LOW);
    delay(flash_speed);
    digitalWrite(led_array[i],HIGH);
  }
}

/* turn on all led form left to right */
void led_turn_on(void)
{
  int i ;
  for( i = 0 ; i < 8 ; i++ )
  {
    digitalWrite(led_array[i],LOW);
    delay(flash_speed);
  }
}

/* turn off all led  */
void led_turn_off(void)
{
  int i ;
  for( i = 0 ; i < 8 ; i++ )
  {
    digitalWrite(led_array[i],HIGH);
    delay(flash_speed);
  }
}
void setup() {
  // put your setup code here, to run once:
  int i ;
  Serial.begin(115200);
  for( i = 0 ; i < 8 ; i++ )
  {
    pinMode(led_array[i],OUTPUT);
    digitalWrite(led_array[i],HIGH);  // set led control pin defalut HIGH turn off all LED
  }
}

void loop() {
  // put your main code here, to run repeatedly:
  Serial.println("start flash led !");
  led_flash();
  led_turn_off();
  led_turn_on();
}`;

const ACTIVE_CODE = `int buzzer = 9;

void setup()
{
  pinMode(buzzer,OUTPUT);
}
void loop()
{
  digitalWrite(buzzer,HIGH);  //sound production
  delay(1000);
  digitalWrite(buzzer,LOW);
  delay(1000);
}`;

const PASSIVE_CODE = `int buzzer = 9;
//# define frequence_2()
void frequence_1(void)    // 1k HZ
{
  int i ;
  for(i=0;i<800;i++)
  {
    digitalWrite(buzzer,HIGH);  //sound production
    delay(0.5);
    digitalWrite(buzzer,LOW);
    delay(0.5);
  }
}

void frequence_2(void)    // 250 HZ
{
  int i ;
  for(i=0;i<800;i++)
  {
    digitalWrite(buzzer,HIGH);  //sound production
    delay(2);
    digitalWrite(buzzer,LOW);
    delay(2);
  }
}
void setup()
{
  pinMode(buzzer,OUTPUT);
}
void loop()
{
  frequence_1();
  delay(1000);
  frequence_2();
  delay(1000);
}`;

// 小磁簧开关: copied from the guide, indent unified.
const REED_CODE = `int Led=11;
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

// ------------------------------------------------------------------ local helpers (lib/vti.js is shared; not edited)
// One merged set for all five experiments. Where the old per-lesson scripts drew a helper with slightly
// different spacing, the difference is an option, and LOOSE (below) holds the preset the 磁簧开关 slides use.
const warns = [];
function warn(msg) { warns.push(msg); console.warn('LAYOUT:', msg); }

// Estimated rendered height of wrapped text (+10% slack for CJK rendering).
function hOf(str, w, size, ls = 1.3) { return V.textH(str, w, size, ls) * 1.1; }

// Plain text of a string or a pptxgenjs run array (breakLine runs end a line).
function plainOf(t) {
  if (typeof t === 'string') return t;
  return t.map((r) => r.text + (r.options && r.options.breakLine ? '\n' : '')).join('');
}

// Text box that warns when the estimated text height exceeds the box (strings and run arrays).
function txt(s, t, o) {
  if (o.h != null) {
    const need = hOf(plainOf(t), o.w, o.size || 14, 1.25);
    if (need > o.h + 0.03) warn(`text may overflow (${need.toFixed(2)} > ${o.h.toFixed(2)}): ${plainOf(t).slice(0, 26)}`);
  }
  V.text(s, t, o);
}

// pptxgenjs mutates run option objects in place (it merges the box options into them),
// so every run gets its own fresh options object.
const R = (text, opt) => ({ text, options: { ...(opt || {}) } });
const SUB = { subscript: true }, SUP = { superscript: true };

// Copy of the code tokenizer in vti.js (not exported) for small inline code chips.
const KW = new Set(['void', 'int', 'float', 'double', 'char', 'long', 'bool', 'byte', 'const', 'unsigned', 'if', 'else', 'for', 'while', 'return', 'true', 'false']);
const FN = new Set(['pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'delayMicroseconds', 'tone', 'noTone', 'map', 'constrain', 'setup', 'loop', 'Serial', 'begin', 'print', 'println']);
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
// hl: 0-based indexes of lines to highlight. lhK / padX / padY: line height factor and paddings.
function miniCode(s, code, o) {
  const size = o.size || 11;
  const lines = code.split('\n');
  const lh = size * (o.lhK || 1.36) / 72;
  const padX = o.padX ?? 0.14;
  const h = o.h || lines.length * lh + (o.padY ?? 0.16);
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
// Polyline from line segments; the last segment gets an arrow head when o.head is set.
function polyline(s, pts, o = {}) {
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
    if (Math.abs(x1 - x2) < 1e-4 && Math.abs(y1 - y2) < 1e-4) continue;
    const last = i === pts.length - 1;
    V.arrow(s, x1, y1, x2, y2, { noHead: !(last && o.head), color: o.color || P.ink, width: o.width || 1.5, dash: o.dash });
  }
}

// Template tile grid tuned for content slides (big label top-left, title + sub anchored at the bottom).
// rowSub: tiles in one row share the tallest sub height, so their titles line up.
function tileGrid(s, o) {
  const cols = o.cols || 2, rows = Math.ceil(o.items.length / cols);
  const tw = o.w / cols, th = o.h / rows;
  const pad = o.pad ?? 0.2, iw = tw - 2 * pad, subSize = o.subSize || 12, titleGap = o.titleGap ?? 0.36;
  const subHOf = (it) => (it.sub ? hOf(it.sub, iw, subSize, 1.25) : 0);
  const rowSubH = [];
  o.items.forEach((it, i) => { const r = Math.floor(i / cols); rowSubH[r] = Math.max(rowSubH[r] || 0, subHOf(it)); });
  o.items.forEach((it, i) => {
    const cx = o.x + (i % cols) * tw, cy = o.y + Math.floor(i / cols) * th;
    const fill = it.fill || P.white, dark = fill === P.ink;
    s.addShape('rect', { x: cx, y: cy, w: tw, h: th, fill: { color: fill }, line: { color: P.gray2, width: 0.75 } });
    const titleSize = o.titleSize || 15, bigSize = it.bigSize || o.bigSize || 26;
    const subH = o.rowSub ? rowSubH[Math.floor(i / cols)] : subHOf(it);
    const subY = cy + th - pad - subH;
    const titleY = subY - titleGap;
    const bigH = bigSize / 72 * 1.3;
    if (it.big) V.text(s, it.big, { x: cx + pad, y: cy + pad - 0.04, w: iw, h: bigH, size: bigSize, bold: true, color: dark ? P.turq : P.ink, mono: it.bigMono });
    if (it.title) V.text(s, it.title, { x: cx + pad, y: titleY, w: iw, h: 0.34, size: titleSize, bold: true, color: dark ? P.white : P.ink, valign: 'middle', mono: it.titleMono });
    if (it.sub) V.text(s, it.sub, { x: cx + pad, y: subY, w: iw, h: subH, size: subSize, color: dark ? 'D0D0D0' : (fill === P.turq ? P.ink : P.muted) });
    if (cy + pad - 0.04 + bigH * 0.85 > titleY) warn(`tile crowded: ${it.title}`);
    if ((it.bigMono ? V.monoW(it.big || '', bigSize) : V.textW(it.big || '', bigSize)) > iw) warn(`tile big too wide: ${it.big}`);
    if (it.title && (it.titleMono ? V.monoW(it.title, titleSize) : V.textW(it.title, titleSize)) > iw) warn(`tile title too wide: ${it.title}`);
  });
}

// Formula with rich-text runs (sub/superscripts). Width estimated from the plain text.
function richFormula(s, o) {
  const size = o.size || 20;
  const cy = o.y + o.h / 2;
  const lh = size / 72 * 1.3;
  const plain = (r) => r.map((x) => x.text).join('');
  const wOf = (r) => V.textW(plain(r), size) + 0.12;
  let x = o.x;
  const put = (runs, w, y) => V.text(s, runs, { x, y, w, h: lh, size, align: 'center', valign: 'middle' });
  const lw = wOf(o.lhs); put(o.lhs, lw, cy - lh / 2); x += lw + 0.04;
  const fw = Math.max(wOf(o.num), wOf(o.den)) + 0.1;
  put(o.num, fw, cy - lh - 0.02);
  s.addShape('line', { x, y: cy, w: fw, h: 0, line: { color: P.ink, width: 1.25 } });
  put(o.den, fw, cy + 0.02);
  x += fw + 0.04;
  const rw = wOf(o.rhs); put(o.rhs, rw, cy - lh / 2); x += rw;
  return x;
}

// Mock serial monitor where each output line has a known y (so notes can sit level with it).
function serialMock(s, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.white, line: P.gray2, radius: 0.1 });
  s.addShape('rect', { x: o.x + 0.02, y: o.y + 0.02, w: o.w - 0.04, h: 0.32, fill: { color: P.card }, line: { color: P.card, width: 0 } });
  txt(s, o.title || '串口监视器', { x: o.x + 0.14, y: o.y + 0.04, w: o.titleW || o.w - 0.28, h: 0.28, size: 10, bold: true, valign: 'middle' });
  if (o.baud !== false) V.text(s, `${o.baud || 9600} 波特率`, { x: o.x + o.w / 2, y: o.y + 0.04, w: o.w / 2 - 0.14, h: 0.28, size: 10, color: P.muted, align: 'right', valign: 'middle' });
  const size = o.size || 11;
  const lh = o.lh || size * 1.45 / 72;
  const y0 = o.y + 0.46;
  o.lines.forEach((ln, i) => {
    V.text(s, ln, { x: o.x + (o.lineX ?? 0.16), y: y0 + i * lh, w: o.lineW || o.w - 0.3, h: lh, size, mono: true, valign: 'middle' });
  });
  (o.annots || []).forEach((a) => {
    V.text(s, a.text, { x: o.x + o.annX, y: y0 + a.i * lh, w: o.w - o.annX - 0.12, h: lh, size: a.size || 11, bold: true, color: P.turqDeep, valign: 'middle' });
    if (V.textW(a.text, a.size || 11) > o.w - o.annX - 0.12) warn('serial annotation too wide: ' + a.text);
  });
  if (y0 + o.lines.length * lh > o.y + o.h - 0.05) warn('serialMock lines overflow');
}

// Light-gray card with an icon circle and a title row. Returns the y where body content may start.
function iconCard(s, ic, title, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill, line: o.line, lineW: o.lineW });
  const d = o.d || 0.42, dy = o.dy ?? 0.17;
  V.iconCircle(s, ic, { x: o.x + 0.2, y: o.y + dy, d, fill: o.iconFill });
  txt(s, title, { x: o.x + 0.2 + d + 0.14, y: o.y + dy, w: o.w - d - 0.54, h: d, size: o.titleSize || 15, bold: true, valign: 'middle', mono: o.mono, color: o.titleColor });
  return o.y + dy + d + (o.gap ?? 0.12);
}

// Component chip: icon circle + label.
function compCard(s, ic, label, x, y, w, h, size = 12.5, o = {}) {
  V.card(s, { x, y, w, h });
  const d = o.d || 0.38, ix = o.ix ?? 0.12;
  V.iconCircle(s, ic, { x: x + ix, y: y + (h - d) / 2, d });
  txt(s, label, { x: x + ix + d + 0.13, y, w: w - d - (o.trim ?? 0.35), h, size, valign: 'middle' });
}

// Titled paragraph block: bold lead line + body. Returns bottom y.
function lead(s, title, body, o) {
  const size = o.size || 13;
  const titleH = o.titleH ?? 0.3, bodyDy = o.bodyDy ?? 0.34;
  txt(s, title, { x: o.x, y: o.y, w: o.w, h: titleH, size: o.leadSize || 14, bold: true, valign: 'middle' });
  const bh = hOf(plainOf(body), o.w, size, 1.25);
  txt(s, body, { x: o.x, y: o.y + bodyDy, w: o.w, h: bh, size });
  return o.y + bodyDy + bh;
}

// Presets the 小磁簧开关 slides were drawn with (a little more air around icons, leads and code chips).
const LOOSE = {
  miniCode: (s, code, o) => miniCode(s, code, { lhK: 1.4, padX: 0.16, padY: 0.2, ...o }),
  iconCard: (s, ic, title, o) => iconCard(s, ic, title, { dy: 0.18, gap: 0.14, ...o }),
  compCard: (s, ic, label, x, y, w, h, size = 12.5) => compCard(s, ic, label, x, y, w, h, size, { d: 0.36, ix: 0.13, trim: 0.36 }),
  lead: (s, title, body, o) => lead(s, title, body, { titleH: 0.32, bodyDy: 0.38, leadSize: 15, ...o }),
  serialMock: (s, o) => serialMock(s, { lineX: 0.2, lineW: 0.5, titleW: o.w * 0.6, ...o }),
};

// Two code blocks side by side, each with its notes underneath.
function codeWithNotes(s, o) {
  const b = V.codeBlock(s, { x: o.x, y: o.y, w: o.w, h: o.h, code: o.code, from: o.from, to: o.to, hl: o.hl, file: o.file, right: o.right, size: o.size });
  const y = o.y + o.h + 0.2;
  V.explain(s, null, { x: o.x, y, w: o.w, maxY: G.bottom, items: o.notes, gap: 0.12 });
  return b;
}

// ---- LED 流水灯 helpers
// A lamp (LED) dot: lit = turquoise with a pale glow, off = white with a gray ring.
function lamp(s, cx, cy, d, on) {
  if (on) {
    const g = d * 1.5;
    s.addShape('ellipse', { x: cx - g / 2, y: cy - g / 2, w: g, h: g, fill: { color: P.turqPale }, line: { color: P.turqPale, width: 0 } });
    s.addShape('ellipse', { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: P.turq }, line: { color: P.turqDeep, width: 1 } });
  } else {
    s.addShape('ellipse', { x: cx - d / 2, y: cy - d / 2, w: d, h: d, fill: { color: P.white }, line: { color: P.faint, width: 1 } });
  }
}
// Row of 8 lamps; `on` is a predicate on index 0..7. Returns array of centre x.
function lampRow(s, x, cy, w, d, on) {
  const step = w / 8;
  const xs = [];
  for (let k = 0; k < 8; k++) {
    const cx = x + step * (k + 0.5);
    lamp(s, cx, cy, d, on(k));
    xs.push(cx);
  }
  return xs;
}

// Mirror of vti.codeBlock's sizing so two side-by-side blocks can share one font size.
function wrapCodeLine(line, max) {
  if (line.length <= max) return [line];
  const rows = [];
  const indent = (line.match(/^\s*/)[0].length) + 2;
  let cur = line;
  while (cur.length > max) {
    let cut = cur.lastIndexOf(' ', max);
    if (cut <= indent + 4) cut = max;
    rows.push(cur.slice(0, cut));
    cur = ' '.repeat(indent) + cur.slice(cut).replace(/^\s+/, '');
  }
  rows.push(cur);
  return rows;
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
    for (let n = from; n <= to; n++) rows += wrapCodeLine(all[n - 1] ?? '', max).length;
    if (rows * lh <= innerH + 0.001) return size;
  }
  throw new Error(`fitCodeSize: ${from}-${to} does not fit`);
}

// ---- 小磁簧开关 helpers
// Red-outlined "problem" card: red icon + red title, explanation below (full width).
function warnCard(s, ic, title, body, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.white, line: P.red, lineW: 1 });
  const d = 0.34, pad = 0.18;
  V.iconCircle(s, ic, { x: o.x + pad, y: o.y + pad, d, fill: P.red });
  txt(s, title, { x: o.x + pad + d + 0.12, y: o.y + pad, w: o.w - 2 * pad - d - 0.12, h: d, size: 13.5, bold: true, color: P.red, valign: 'middle' });
  const by = o.y + pad + d + 0.12;
  txt(s, body, { x: o.x + pad, y: by, w: o.w - 2 * pad, h: o.y + o.h - pad + 0.04 - by, size: o.size || 12 });
}
// Numbered list (number circles + text). Returns bottom y.
function numList(s, items, o) {
  const size = o.size || 13, d = o.d || 0.3, gap = o.gap ?? 0.16;
  let y = o.y;
  items.forEach((t, i) => {
    const tw = o.w - d - 0.14;
    const th = hOf(plainOf(t), tw, size, 1.25);
    const rowH = Math.max(d, th);
    V.numCircle(s, i + 1, { x: o.x, y: y + (o.alignTop ? 0 : 0), d, size: 11 });
    txt(s, t, { x: o.x + d + 0.14, y: y + (th < d ? (d - th) / 2 : -0.01), w: tw, h: th + 0.02, size, lineSpacingMultiple: 1.15 });
    y += rowH + gap;
  });
  return y - gap;
}
// Rounded flowchart box with centred label(s).
function fbox(s, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill || P.card, line: o.line, radius: o.radius ?? 0.08 });
  const dark = o.fill === P.ink;
  txt(s, o.text, { x: o.x + 0.06, y: o.y, w: o.w - 0.12, h: o.h, size: o.size || 12.5, bold: o.bold ?? true, align: 'center', valign: 'middle', color: dark ? P.white : P.ink, mono: o.mono, lineSpacingMultiple: 1.1 });
}

// Reed switch drawing: glass tube + two reeds (open or closed). x/w = tube box, cy = centre line.
function reedTube(s, o) {
  const { x, w, cy } = o, th = 0.42, g = 0.075, lead = 0.28;
  const xc = x + w / 2;
  s.addShape('roundRect', { x, y: cy - th / 2, w, h: th, rectRadius: th / 2, fill: { color: P.turqPale }, line: { color: P.turqDeep, width: 1 } });
  const lw = 3.25;
  if (!o.closed) {
    seg(s, x - lead, cy - g, xc + 0.2, cy - g, { width: lw });
    seg(s, xc - 0.2, cy + g, x + w + lead, cy + g, { width: lw });
  } else {
    seg(s, x - lead, cy - g, xc - 0.34, cy - g, { width: lw });
    seg(s, xc - 0.34, cy - g, xc + 0.2, cy - 0.012, { width: lw });
    seg(s, xc - 0.2, cy + 0.012, xc + 0.34, cy + g, { width: lw });
    seg(s, xc + 0.34, cy + g, x + w + lead, cy + g, { width: lw });
    s.addShape('ellipse', { x: xc - 0.075, y: cy - 0.075, w: 0.15, h: 0.15, fill: { color: P.turq }, line: { color: P.turqDeep, width: 1 } });
  }
}

// Bar magnet (N charcoal / S turquoise). faded = lighter colours.
function magnet(s, x, y, w, h, faded) {
  const nF = faded ? P.gray2 : P.ink, sF = faded ? P.gray1 : P.turq;
  s.addShape('rect', { x, y, w: w / 2, h, fill: { color: nF }, line: { color: nF, width: 0 } });
  s.addShape('rect', { x: x + w / 2, y, w: w / 2, h, fill: { color: sF }, line: { color: faded ? P.gray2 : P.turqDeep, width: 0.75 } });
  V.text(s, 'N', { x, y, w: w / 2, h, size: 11, bold: true, color: faded ? P.muted : P.white, align: 'center', valign: 'middle' });
  V.text(s, 'S', { x: x + w / 2, y, w: w / 2, h, size: 11, bold: true, color: faded ? P.muted : P.ink, align: 'center', valign: 'middle' });
}

// Schematic of the module output (pull-up resistor + reed switch to GND).
function pullupPanel(s, o) {
  const { x, w, closed } = o, y = G.top, h = G.ch;
  V.card(s, { x, y, w, h, fill: closed ? P.turqPale : P.card });
  txt(s, o.title, { x: x + 0.2, y: y + 0.14, w: w - 0.4, h: 0.32, size: 13.5, bold: true, valign: 'middle' });
  const cx = x + 0.78;
  const hot = closed ? P.turqDeep : P.ink;
  // 5V rail
  V.text(s, '5V', { x: cx - 0.35, y: y + 0.55, w: 0.7, h: 0.24, size: 11, bold: true, mono: true, align: 'center', valign: 'middle' });
  seg(s, cx - 0.16, y + 0.82, cx + 0.16, y + 0.82, { width: 2 });
  seg(s, cx, y + 0.82, cx, y + 0.98);
  // resistor
  s.addShape('rect', { x: cx - 0.1, y: y + 0.98, w: 0.2, h: 0.5, fill: { color: P.white }, line: { color: P.ink, width: 1.25 } });
  V.text(s, '上拉\n电阻', { x: x + 0.08, y: y + 1.0, w: cx - 0.2 - (x + 0.08), h: 0.46, size: 10, color: P.muted, align: 'right', valign: 'middle', lineSpacingMultiple: 1.0 });
  seg(s, cx, y + 1.48, cx, y + 1.72);
  // OUT node
  s.addShape('ellipse', { x: cx - 0.055, y: y + 1.665, w: 0.11, h: 0.11, fill: { color: P.ink }, line: { color: P.ink, width: 0 } });
  V.arrow(s, cx, y + 1.72, cx + 0.62, y + 1.72, { color: P.ink, width: 1.5 });
  V.text(s, 'OUT', { x: cx + 0.08, y: y + 1.46, w: 0.55, h: 0.22, size: 10, bold: true, mono: true, valign: 'middle' });
  V.text(s, '12 号脚', { x: cx + 0.68, y: y + 1.6, w: x + w - 0.1 - (cx + 0.68), h: 0.24, size: 11, bold: true, valign: 'middle' });
  // reed switch
  seg(s, cx, y + 1.72, cx, y + 1.98, { color: hot });
  s.addShape('ellipse', { x: cx - 0.04, y: y + 1.94, w: 0.08, h: 0.08, fill: { color: hot }, line: { color: hot, width: 0 } });
  s.addShape('ellipse', { x: cx - 0.04, y: y + 2.42, w: 0.08, h: 0.08, fill: { color: hot }, line: { color: hot, width: 0 } });
  if (closed) seg(s, cx, y + 2.46, cx, y + 1.98, { color: hot, width: 2.5 });
  else seg(s, cx, y + 2.46, cx + 0.3, y + 2.06, { width: 2.5 });
  V.text(s, '簧片', { x: x + 0.08, y: y + 2.1, w: cx - 0.2 - (x + 0.08), h: 0.24, size: 10, color: P.muted, align: 'right', valign: 'middle' });
  if (closed) V.iconCircle(s, o.icon, { x: cx + 0.34, y: y + 2.02, d: 0.38 });
  seg(s, cx, y + 2.46, cx, y + 2.72, { color: hot });
  // GND symbol
  seg(s, cx - 0.2, y + 2.72, cx + 0.2, y + 2.72, { width: 2, color: hot });
  seg(s, cx - 0.13, y + 2.8, cx + 0.13, y + 2.8, { width: 2, color: hot });
  seg(s, cx - 0.06, y + 2.88, cx + 0.06, y + 2.88, { width: 2, color: hot });
  V.text(s, 'GND', { x: cx + 0.28, y: y + 2.68, w: 0.6, h: 0.22, size: 10, bold: true, mono: true, valign: 'middle' });
  // result
  V.card(s, { x: x + 0.16, y: y + 3.06, w: w - 0.32, h: 0.44, fill: closed ? P.turq : P.white, line: closed ? undefined : P.gray2, radius: 0.22 });
  txt(s, o.result, { x: x + 0.16, y: y + 3.06, w: w - 0.32, h: 0.44, size: 12, bold: true, align: 'center', valign: 'middle' });
}

// ------------------------------------------------------------------ slides
// ================================================================ 导入：本节导览 (replaces the three old overview slides) + 数字 / 模拟信号
function buildOverview({ deck, I, slide }) {
  deck.section('导入');
  const s = slide({
    title: '本节导览',
    desc: '五个实验，按指南顺序：先把外界的变化“读进来”，再把灯光和声音“送出去”，最后把两者连起来',
    notes: '先给学生一张地图：这节课按指南顺序做五个实验。左边三块是信号的方向：实验一、二把旋钮和光线的变化“读进来”（模拟输入）；实验三、四用 HIGH / LOW 把灯光和声音“送出去”（数字输出）；实验五读磁簧开关的 0 / 1，再控制灯和蜂鸣器，把前面学的连起来。右边的标签是每个实验要学的新语法，下课前回来对照一遍。',
  });
  const rowH = 0.64, gap = 0.1;
  const rowY = (i) => G.top + i * (rowH + gap);
  // left: template squares naming the signal direction of each group of experiments
  const gw = 1.0;
  const groups = [
    { from: 0, to: 1, fill: P.turq, t: '模拟输入', sub: '读进来' },
    { from: 2, to: 3, fill: P.ink, t: '数字输出', sub: '送出去' },
    { from: 4, to: 4, fill: P.gray1, t: '数字输入', sub: '读 + 判断' },
  ];
  for (const g of groups) {
    const y = rowY(g.from), h = rowY(g.to) + rowH - y, dark = g.fill === P.ink;
    s.addShape('rect', { x: G.L, y, w: gw, h, fill: { color: g.fill }, line: { color: P.gray2, width: 0.75 } });
    V.text(s, [R(g.t, { bold: true, color: dark ? P.turq : P.ink, breakLine: true }), R(g.sub, { fontSize: 10.5, color: dark ? 'D0D0D0' : P.ink })],
      { x: G.L, y, w: gw, h, size: 13, align: 'center', valign: 'middle' });
  }
  // right: one row per experiment, in the guide's order
  const ex = [
    { ic: I.slider, n: '01', t: 'AD 模数转换', d: '转动电位器，读出 0～1023 再换算成电压', tags: ['analogRead()', 'float', 'Serial.print()'] },
    { ic: I.sun, n: '02', t: '光敏电阻模块', d: '光敏电阻感知亮度，PWM 调节红灯亮度', tags: ['analogWrite()', 'PWM', '(int)', 'map()'] },
    { ic: I.bulb, n: '03', t: 'LED 流水灯', d: '8 盏 LED 依次点亮，像流水一样', tags: ['led_array[i]', 'for( ; ; )', 'void 函数()'] },
    { ic: I.volume, n: '04', t: '蜂鸣器模块', d: '有源“滴滴”响，无源唱出两种音调', tags: ['delay()', 'delayMicroseconds()', 'Hz'] },
    { ic: I.magnet, n: '05', t: '小磁簧开关模块', d: '磁铁靠近：灯亮、蜂鸣器响；拿开就停', tags: ['digitalRead()', 'if / else', '=='] },
  ];
  const cx = G.L + gw + 0.15, cw = G.R - cx, tx = cx + 0.7, tagX = cx + 4.15, tw = tagX - tx - 0.1;
  const tagH = 10 / 72 * 1.9;
  ex.forEach((e, i) => {
    const y = rowY(i);
    V.card(s, { x: cx, y, w: cw, h: rowH });
    V.iconCircle(s, e.ic, { x: cx + 0.14, y: y + (rowH - 0.42) / 2, d: 0.42 });
    V.text(s, [R(`实验 ${e.n}　`, { fontSize: 10.5, color: P.muted }), R(e.t, { bold: true })], { x: tx, y: y + 0.07, w: tw, h: 0.28, size: 14, valign: 'middle' });
    txt(s, e.d, { x: tx, y: y + 0.36, w: tw, h: 0.22, size: 12, valign: 'middle' });
    if (V.textW(e.d, 12) > tw) warn('overview goal too long: ' + e.d);
    const b = V.tags(s, e.tags, { x: tagX, y: y + (rowH - tagH) / 2, w: G.R - 0.14 - tagX, size: 10 });
    if (b > y + rowH - 0.1) warn('overview tags wrap: ' + e.t);
  });
}

function buildConcept({ deck, I, slide }) {
  let s;
  // ================================================================ lead-in concept: digital vs analog, ADC
  s = slide({
    title: '先懂一个概念：数字信号与模拟信号',
    desc: '数字信号只有开 / 关两种状态；模拟信号连续变化——ADC 负责把它切成 1024 级台阶',
    notes: '用电灯开关和调光旋钮做对比：开关只有两档，旋钮可以停在任何位置。ADC 就像给连续的电压配一把尺子，UNO 的尺子有 1024 格，所以读数是 0～1023。右图为了看清只画了 8 级，提醒学生实际台阶细得多。',
  });
  {
    const lw = 4.1, chh = 1.67;
    const cards = [
      { y: G.top, ic: I.toggle, t: '数字信号', d: '只有两种状态：开和关，\n也就是 HIGH 和 LOW。\n就像电灯开关，非亮即灭。', kind: 'digital' },
      { y: G.bottom - chh, ic: I.slider, t: '模拟信号', d: '可以连续变化：\n0～5V 之间任何值都行。\n就像调光旋钮、水龙头。', kind: 'analog' },
    ];
    for (const c of cards) {
      V.card(s, { x: G.L, y: c.y, w: lw, h: chh });
      V.iconCircle(s, c.ic, { x: G.L + 0.2, y: c.y + 0.18, d: 0.42 });
      txt(s, c.t, { x: G.L + 0.76, y: c.y + 0.18, w: 2, h: 0.42, size: 15, bold: true, valign: 'middle' });
      txt(s, c.d, { x: G.L + 0.2, y: c.y + 0.72, w: 2.45, h: 0.82, size: 12.5 });
      const wx = G.L + 2.9, ww = 1.0, wy = c.y + 1.02, a = 0.3;
      if (c.kind === 'digital') {
        const hi = wy - a, lo = wy + a, st = ww / 4;
        polyline(s, [[wx, lo], [wx + st, lo], [wx + st, hi], [wx + 2 * st, hi], [wx + 2 * st, lo], [wx + 3 * st, lo], [wx + 3 * st, hi], [wx + ww, hi]], { color: P.ink, width: 2 });
      } else {
        const pts = [];
        for (let k = 0; k <= 32; k++) pts.push([wx + ww * k / 32, wy - a * Math.sin(2 * Math.PI * 1.5 * k / 32)]);
        polyline(s, pts, { color: P.ink, width: 2 });
      }
      txt(s, c.kind === 'digital' ? '跳变' : '连续', { x: wx, y: wy + a + 0.06, w: ww, h: 0.22, size: 10, color: P.muted, align: 'center' });
    }
    // right card: staircase
    const rx = 4.85, rw = G.R - rx;
    V.card(s, { x: rx, y: G.top, w: rw, h: G.ch });
    txt(s, 'ADC：把连续电压切成 1024 级台阶', { x: rx + 0.22, y: G.top + 0.14, w: rw - 0.44, h: 0.32, size: 14, bold: true, valign: 'middle' });
    const ox = rx + 0.78, oy = 3.62, cwid = 2.2, chgt = 1.55;
    V.arrow(s, ox, oy, ox + cwid + 0.25, oy, { color: P.ink, width: 1.25 });
    V.arrow(s, ox, oy, ox, oy - chgt - 0.22, { color: P.ink, width: 1.25 });
    V.arrow(s, ox, oy, ox + cwid, oy - chgt, { noHead: true, color: P.muted, width: 1.25, dash: 'dash' });
    const n = 8, stw = cwid / n, sth = chgt / (n - 1);
    const pts = [[ox, oy]];
    for (let k = 0; k < n; k++) {
      const yy = oy - k * sth;
      if (k > 0) pts.push([ox + k * stw, yy]);
      pts.push([ox + (k + 1) * stw, yy]);
      if (k < n - 1) pts.push([ox + (k + 1) * stw, yy - sth]);
    }
    polyline(s, pts, { color: P.turqDeep, width: 2.5 });
    txt(s, '0V', { x: ox - 0.2, y: oy + 0.05, w: 0.4, h: 0.22, size: 10, color: P.muted, align: 'center' });
    txt(s, '2.5V', { x: ox + cwid / 2 - 0.25, y: oy + 0.05, w: 0.5, h: 0.22, size: 10, color: P.muted, align: 'center' });
    txt(s, '5V', { x: ox + cwid - 0.2, y: oy + 0.05, w: 0.4, h: 0.22, size: 10, color: P.muted, align: 'center' });
    txt(s, '0', { x: ox - 0.5, y: oy - 0.11, w: 0.42, h: 0.22, size: 10, color: P.muted, align: 'right' });
    txt(s, '1023', { x: ox - 0.56, y: oy - chgt - 0.11, w: 0.48, h: 0.22, size: 10, color: P.muted, align: 'right' });
    // legend
    const lx = ox + cwid + 0.45, lw2 = rx + rw - 0.2 - lx;
    V.arrow(s, lx, 2.2, lx + 0.4, 2.2, { noHead: true, color: P.turqDeep, width: 2.5 });
    txt(s, '读数\n一级一级跳', { x: lx, y: 2.3, w: lw2, h: 0.44, size: 10.5 });
    V.arrow(s, lx, 2.95, lx + 0.4, 2.95, { noHead: true, color: P.muted, width: 1.5, dash: 'dash' });
    txt(s, '电压\n连续变化', { x: lx, y: 3.05, w: lw2, h: 0.44, size: 10.5 });
    txt(s, '示意图只画了 8 级，UNO 实际有 1024 级，台阶细得多', { x: rx + 0.22, y: 3.9, w: rw - 0.44, h: 0.22, size: 10, color: P.muted });
    V.card(s, { x: rx + 0.2, y: 4.2, w: rw - 0.4, h: 0.65, fill: P.white });
    V.iconCircle(s, I.ruler, { x: rx + 0.32, y: 4.335, d: 0.38 });
    txt(s, '像一把刻了 1024 格的尺子：analogRead() 读出电压落在第几格，每格约 4.9 mV。', { x: rx + 0.84, y: 4.2, w: rw - 1.14, h: 0.65, size: 12, valign: 'middle' });
  }
}

// ================================================================ 实验 01　AD 模数转换
function buildAD({ deck, I, slide }) {
  let s;
  // ================================================================ divider: experiment 1
  deck.section('实验一　AD 模数转换');
  deck.divider({
    kicker: '实验 01',
    title: 'AD 模数转换实验',
    desc: '转动电位器旋钮，让 Arduino 读出 0～1023 的数字，再换算成真实电压，显示在电脑屏幕上。',
    tiles: [
      { fill: P.turq, big: '01', title: '原理', sub: '电位器分压 · 换算公式', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: '电位器中间脚 → A0', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: 'analogRead() · (float)', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '串口监视器看数字', subSize: 12 },
    ],
    notes: '实验一分四步：先理解电位器和换算公式，再接线、读代码、看串口结果。提醒学生准备好 10k 电位器、LED 和 220Ω 电阻，先不要急着接线。',
  });

  // ================================================================ intro
  s = slide({
    title: '实验介绍：A/D 转换是什么',
    desc: 'A/D 转换就是把模拟信号变成数字信号——Arduino 正是靠它“读懂”各种传感器',
    notes: '原指南的介绍比较拗口，这里只抓三点：模拟量要先由传感器变成电压；A/D 是模拟变数字，D/A 正好相反；UNO 的 A/D 是 10 位，所以有 1024 级。A0～A5 也能当数字口用（编号 14～19），以后数字引脚不够时可以借用。',
  });
  {
    const w = 3.95;
    let y = G.top;
    y = lead(s, '模拟量到处都是', '温度、光线、声音、压力……都在连续变化。\n传感器先把它们变成电压，再交给 Arduino。', { x: G.L, y, w }) + 0.26;
    y = lead(s, 'A/D 与 D/A', 'Arduino 只认数字，要用 A/D 转换器把电压变成数字，叫模数转换；反过来，把数字变回电压叫 D/A，即数模转换。', { x: G.L, y, w }) + 0.26;
    y = lead(s, '10 位 = 1024 级', 'UNO 的 A/D 是 10 位，读数范围 0～1023。\n位数越多，刻度越细。', { x: G.L, y, w });
    if (y > G.bottom) warn('intro text overflow');
    tileGrid(s, {
      x: 4.75, y: G.top, w: G.R - 4.75, h: G.ch, cols: 2,
      items: [
        { fill: P.turq, big: 'A/D', title: '模数转换', sub: '模拟 → 数字\n本实验的主角' },
        { fill: P.gray1, big: 'D/A', title: '数模转换', sub: '数字 → 模拟\n正好是 A/D 反过来' },
        { fill: P.ink, big: 'A0～A5', title: '6 个模拟输入口', sub: '也能当数字口用\n编号 14～19' },
        { fill: P.white, big: '10K', title: '电位器', sub: '会转的“分压旋钮”\n本实验的信号来源' },
      ],
    });
  }

  // ================================================================ parts + goal
  s = slide({
    title: '组件清单与实验目的',
    desc: '一块 UNO、一个电位器、一颗 LED，就能把“旋钮转了多少”变成屏幕上的数字',
    notes: '对照清单把元件逐一拿出来，特别认一下电位器的三个脚。LED 在这个实验里不是主角，它像一个“心跳灯”，告诉我们程序正在运行。',
  });
  {
    txt(s, '组件清单', { x: G.L, y: G.top, w: 3, h: 0.3, size: 13, bold: true, valign: 'middle' });
    const parts = [[I.chip, 'Arduino Uno R3 主板'], [I.grid, '面包板'], [I.usb, 'USB 数据线'], [I.slider, '10k 电位器 ×1'], [I.bulb, 'LED ×1'], [I.resistor, '220Ω 电阻 ×1'], [I.cable, '若干跳线']];
    const pw = 2.5, ph = 0.62, gx = 0.25, gy = 0.18;
    parts.forEach(([ic, t], i) => {
      const c = i % 2, r = Math.floor(i / 2);
      compCard(s, ic, t, G.L + c * (pw + gx), 1.75 + r * (ph + gy), pw, ph);
    });
    const rx = 6.0, rw = G.R - rx;
    V.tip(s, { x: rx, y: G.top, w: rw, h: 1.68, kind: 'note', title: '实验目的', text: '把电位器旋钮的位置变成 Arduino 能读的数值（0～1023），再换算成电压，显示在电脑屏幕上。这是以后读各种传感器的基本功。', size: 12.5 }, I.target);
    V.tip(s, { x: rx, y: 3.33, w: rw, h: 1.67, kind: 'tip', title: 'LED 起什么作用？', text: '程序让 13 号脚的 LED 亮 1 秒、灭 1 秒。看到它在闪，就说明程序正在一遍遍运行。', size: 12.5 }, I.bulb);
  }

  // ================================================================ principle 1: potentiometer
  s = slide({
    title: '实验原理①：电位器是一个“分压旋钮”',
    desc: '两端接 5V 和 GND，中间脚的电压随旋钮在 0～5V 之间变化，A0 读的就是它',
    notes: '可以在黑板上画一条电阻：两头接 5V 和地，中间的滑片在上面滑动。滑片越靠近 5V，中间脚电压越高。讲右图前先让学生猜：旋钮转到正中间，读数大约是多少？',
  });
  {
    const w = 3.35;
    const rows = [
      '电位器有 3 个脚：两端之间是一整条电阻，中间脚连着一个能滑动的“滑片”。',
      '两端接 5V 和 GND 后，沿着电阻条从 GND 一端到 5V 一端，电压由 0V 逐渐升到 5V。',
      '转动旋钮就是移动滑片：滑片停在哪，中间脚就输出那里的电压，接到 A0 上去读。',
    ];
    rows.forEach((t, i) => {
      const y = G.top + i * 0.92;
      V.numCircle(s, i + 1, { x: G.L, y: y + 0.02, d: 0.34, size: 12 });
      txt(s, t, { x: G.L + 0.48, y, w: w - 0.48, h: 0.8, size: 13 });
    });
    V.tip(s, { x: G.L, y: 4.15, w, h: 0.85, kind: 'note', text: '记住：离 5V 越近 → 电压越高 → 读数越大', size: 12.5 }, I.bulb);
    const states = [
      { f: 0, t: '旋到 GND 一端', v: '电压 ≈ 0 V', r: '读数 ≈ 0' },
      { f: 0.5, t: '旋到正中间', v: '电压 ≈ 2.5 V', r: '读数 ≈ 512' },
      { f: 1, t: '旋到 5V 一端', v: '电压 ≈ 5 V', r: '读数 ≈ 1023' },
    ];
    const x0 = 4.1, cw = (G.R - x0 - 0.5) / 3;
    states.forEach((st, i) => {
      const cx = x0 + i * (cw + 0.25), y = G.top;
      V.card(s, { x: cx, y, w: cw, h: G.ch });
      const sx = cx + 0.42, sw = 0.26, sTop = y + 0.55, sBot = y + 2.22;
      V.pill(s, { x: sx + sw / 2 - 0.24, y: y + 0.17, w: 0.48, h: 0.27, text: '5V', size: 10.5, fill: P.ink, color: P.white });
      V.pill(s, { x: sx + sw / 2 - 0.3, y: sBot + 0.1, w: 0.6, h: 0.27, text: 'GND', size: 10.5, fill: P.ink, color: P.white });
      V.card(s, { x: sx, y: sTop, w: sw, h: sBot - sTop, fill: P.white, line: P.gray2, radius: 0.06 });
      const wy = sBot - 0.08 - st.f * (sBot - sTop - 0.16);
      s.addShape('rect', { x: sx + 0.04, y: wy, w: sw - 0.08, h: Math.max(0.02, sBot - 0.04 - wy), fill: { color: P.turq }, line: { color: P.turq, width: 0 } });
      V.arrow(s, cx + 1.2, wy, sx + sw + 0.05, wy, { color: P.ink, width: 2 });
      txt(s, 'A0', { x: cx + 1.2, y: wy - 0.13, w: 0.4, h: 0.26, size: 11, bold: true, mono: true, align: 'center', valign: 'middle' });
      txt(s, st.t, { x: cx + 0.15, y: y + 2.78, w: cw - 0.3, h: 0.3, size: 13, bold: true, valign: 'middle' });
      txt(s, st.v, { x: cx + 0.15, y: y + 3.08, w: cw - 0.3, h: 0.24, size: 12, valign: 'middle' });
      txt(s, st.r, { x: cx + 0.15, y: y + 3.32, w: cw - 0.3, h: 0.24, size: 12, bold: true, color: P.turqDeep, valign: 'middle' });
    });
  }

  // ================================================================ principle 2: formula
  s = slide({
    title: '实验原理②：读数怎么换算成电压',
    desc: 'analogRead() 读到 0～1023 的数；除以 1023 再乘 5V，就是引脚上的真实电压',
    notes: '公式看着复杂，其实就是“读数占满格的几分之几，再乘 5V”。用串口截图里的 399 现场算一遍：399 ÷ 1023 × 5 ≈ 1.95，和截图完全对上。下面四步就是程序的骨架，后面看代码时会一一对应。',
  });
  {
    const fx = G.L, fw = 5.9, fh = 1.7, y = G.top;
    V.card(s, { x: fx, y, w: fw, h: fh });
    richFormula(s, {
      x: fx + 0.2, y: y + 0.12, h: 1.0, size: 20,
      lhs: [R('V'), R('R', SUB), R(' =')],
      num: [R('Value')],
      den: [R('2'), R('10', SUP), R(' − 1')],
      rhs: [R('× V'), R('DD', SUB)],
    });
    txt(s, '也就是：电压 = 读数 ÷ 1023 × 5V', { x: fx + 0.25, y: y + 1.22, w: 3.4, h: 0.3, size: 13, bold: true, valign: 'middle' });
    const lx = fx + 3.75, lw = fw - 3.75 - 0.15;
    const legend = [
      [R('V'), R('R', SUB), R('：实际电压')],
      [R('Value：读数 0～1023')],
      [R('2'), R('10', SUP), R(' − 1 = 1023')],
      [R('V'), R('DD', SUB), R('：参考电压 5V')],
    ];
    legend.forEach((runs, i) => V.text(s, runs, { x: lx, y: y + 0.18 + i * 0.34, w: lw, h: 0.3, size: 12, valign: 'middle' }));
    const ex = fx + fw + 0.3, ew = G.R - ex;
    V.card(s, { x: ex, y, w: ew, h: fh, fill: P.turqPale });
    txt(s, '举个例子：读数 399', { x: ex + 0.2, y: y + 0.14, w: ew - 0.4, h: 0.3, size: 13, bold: true, valign: 'middle' });
    txt(s, '399 ÷ 1023 × 5', { x: ex + 0.2, y: y + 0.52, w: ew - 0.4, h: 0.32, size: 14, mono: true, valign: 'middle' });
    txt(s, '≈ 1.95 V', { x: ex + 0.2, y: y + 0.86, w: ew - 0.4, h: 0.46, size: 24, bold: true, valign: 'middle' });
    txt(s, '和串口截图里的 1.95 对上了', { x: ex + 0.2, y: y + 1.34, w: ew - 0.4, h: 0.26, size: 12, color: P.ink, valign: 'middle' });
    V.steps(s, {
      x: G.L, y: 3.35, w: G.cw, h: 1.65, focus: 1, subSize: 12,
      items: [
        { title: '电位器', sub: '旋钮分出\n0～5V 的电压' },
        { title: 'analogRead()', sub: '把电压变成\n0～1023 的读数', mono: true },
        { title: '换算', sub: '读数 ÷ 1023 × 5\n得到电压' },
        { title: 'Serial', sub: '把读数和电压\n发到电脑', mono: true },
      ],
    });
  }

  // ================================================================ wiring
  s = slide({
    title: '接线：电位器接 A0，LED 接 13',
    desc: '电位器两端接 5V 和 GND，中间脚接 A0；LED 和 220Ω 电阻串联，接在 13 号脚与 GND 之间',
    notes: '先断电再接线。红线 5V、黑线 GND、黄线 A0 是电位器的三根线；蓝线从 13 号脚到 LED，LED 另一脚经 220Ω 电阻回到 GND。提醒学生 LED 长脚是正极，接反了不会亮。',
  });
  {
    V.imageBox(s, { file: 'l13/ad_wiring.jpg', x: G.L, y: G.top, w: 5.1, h: G.ch, diagram: true, caption: '原指南接线图：红线 5V · 黄线 A0 · 黑线 GND · 蓝线 13 号脚' });
    const tx = 5.85, tw = G.R - tx;
    V.table(s, [['Arduino UNO', '10K 电位器'], ['5V', '一端'], ['A0', '中间引脚'], ['GND', '另一端']], { x: tx, y: G.top, w: tw, colW: [1.45, tw - 1.45], rowH: 0.3, size: 12, monoCols: [0], boldCols: [0], align: ['center', 'center'] });
    V.table(s, [['Arduino UNO', 'LED（串 220Ω 电阻）'], ['13', 'LED 正极（长脚）'], ['GND', '220Ω 电阻 → LED 负极']], { x: tx, y: 2.85, w: tw, colW: [1.45, tw - 1.45], rowH: 0.3, size: 12, monoCols: [0], boldCols: [0], align: ['center', 'center'] });
    V.tip(s, { x: tx, y: 4.05, w: tw, h: 0.95, kind: 'tip', text: '电位器两端的 5V、GND 对调也能用，只是读数随旋钮变化的方向会反过来。', size: 12 }, I.bulb);
  }

  // ================================================================ syntax 1: analogRead + (float)
  s = slide({
    title: '新语法①：analogRead() 和 (float)',
    desc: 'analogRead() 负责“量电压”；(float) 让除法保留小数，否则 399 / 1023 会得到 0',
    notes: 'analogRead 就像量尺：只能用在 A0～A5，返回 0～1023 的整数。重点讲整数除法的坑：两个整数相除只保留整数部分，399 / 1023 等于 0，哪怕结果再存进 float 也晚了。加上 (float) 先把读数变成小数，除出来才是 0.39；程序里写的 ( ( float )value )/1023 是同一个意思。',
  });
  {
    const cw = 4.4, y = G.top;
    // left
    let lx = G.L;
    let by = iconCard(s, I.ruler, 'analogRead(引脚)', { x: lx, y, w: cw, h: G.ch });
    const iw = cw - 0.4;
    txt(s, '像拿尺子量一下：\n读出引脚电压落在 0～1023 的第几格。', { x: lx + 0.2, y: by, w: iw, h: 0.5, size: 12.5 });
    miniCode(s, 'value = analogRead(A0);  // 0 ~ 1023', { x: lx + 0.2, y: by + 0.6, w: iw, size: 11 });
    V.table(s, [['函数', '能读到什么'], ['digitalRead()', '只有 0 或 1（开 / 关）'], ['analogRead()', '0～1023 之间的整数']], { x: lx + 0.2, y: by + 1.2, w: iw, colW: [1.6, iw - 1.6], rowH: 0.32, size: 12, monoCols: [0] });
    txt(s, '只有 A0～A5 能用 analogRead()', { x: lx + 0.2, y: by + 2.32, w: iw, h: 0.26, size: 12, color: P.muted, valign: 'middle' });
    // right
    const rx = G.R - cw;
    by = iconCard(s, I.box, 'float 与 (float)', { x: rx, y, w: cw, h: G.ch });
    txt(s, 'int 只装整数，float 能装小数。\n(float) 能让整数临时变成小数。', { x: rx + 0.2, y: by, w: iw, h: 0.5, size: 12.5 });
    const boxes = [
      { y: by + 0.56, fill: P.white, line: P.red, ic: I.times_w, icFill: P.red, code: 'voltage = value / 1023;', t: '399 / 1023 → 0\n两个整数相除，小数部分被直接扔掉' },
      { y: by + 1.78, fill: P.turqPale, line: undefined, ic: I.check, icFill: P.turq, code: 'voltage = ((float)value)/1023;', t: '399.0 / 1023 → 0.39\n先变成小数再除，结果才对' },
    ];
    for (const b of boxes) {
      V.card(s, { x: rx + 0.2, y: b.y, w: iw, h: 0.98, fill: b.fill, line: b.line, lineW: 1 });
      V.iconCircle(s, b.ic, { x: rx + 0.32, y: b.y + 0.12, d: 0.3, fill: b.icFill });
      txt(s, b.code, { x: rx + 0.75, y: b.y + 0.1, w: iw - 0.67, h: 0.3, size: 11, mono: true, bold: true, valign: 'middle' });
      txt(s, b.t, { x: rx + 0.75, y: b.y + 0.43, w: iw - 0.67, h: 0.48, size: 12 });
    }
  }

  // ================================================================ syntax 2: Serial.print / println
  s = slide({
    title: '新语法②：Serial.print() 和 println()',
    desc: '串口是 Arduino 和电脑聊天的窗口：print 说完不换行，println 说完换行，"\\n" 表示在这里换行',
    notes: '串口监视器就是 Arduino 和电脑“聊天”的窗口，记得波特率选 9600。print 和 println 的区别只在于说完换不换行；\\n 是藏在文字里的换行符。对照右边：第 17、18 行拼成第一行，第 19 行开头的 \\n 把这一行结束，再打出 voltage = 并换行，第 20 行打出电压。',
  });
  {
    const lw = 4.0;
    const rules = [
      { tag: 'Serial.print(x)', t: '把 x 发到电脑，说完不换行；\n下一次接着写在同一行。' },
      { tag: 'Serial.println(x)', t: '发完 x 再换行（ln = line）；\n下一次从新的一行开始。' },
      { tag: '"\\n"', t: '藏在文字里的“换行符”。第 19 行开头的 \\n\n先结束读数那行，“voltage =”另起一行。' },
    ];
    rules.forEach((r, i) => {
      const y = G.top + i * 1.3;
      V.card(s, { x: G.L, y, w: lw, h: 1.0 });
      V.pill(s, { x: G.L + 0.18, y: y + 0.12, text: r.tag, size: 11, fill: P.ink, color: P.white, mono: true, bold: false, h: 0.28 });
      txt(s, r.t, { x: G.L + 0.18, y: y + 0.46, w: lw - 0.36, h: 0.44, size: 12 });
    });
    const rx = 4.75, rw = G.R - rx;
    V.codeBlock(s, { x: rx, y: G.top, w: rw, h: 1.55, code: AD_CODE, from: 17, to: 20, hl: [19], file: 'ad_convert.ino', right: '第 17–20 行' });
    V.arrow(s, rx + rw / 2, 3.0, rx + rw / 2, 3.24, { color: P.muted, width: 1.5 });
    txt(s, '串口里看到', { x: rx + rw / 2 + 0.15, y: 2.97, w: 1.6, h: 0.28, size: 10.5, color: P.muted, valign: 'middle' });
    serialMock(s, {
      x: rx, y: 3.3, w: rw, h: 1.7, baud: 9600, size: 11, lh: 0.36,
      lines: ['get ad pin value 399', 'voltage =', '1.95'], annX: 2.55,
      annots: [{ i: 0, text: '← 第 17、18 行' }, { i: 1, text: '← 第 19 行' }, { i: 2, text: '← 第 20 行' }],
    });
  }

  // ================================================================ code 1/2
  s = slide({
    title: '代码逐行看懂（1/2）：准备工作',
    desc: '先准备四个“盒子”（变量），再在 setup() 里把引脚和串口设置好',
    notes: '前 12 行都是准备工作：起名字、准备盒子、设置引脚和串口。注释里写 115200，但代码是 9600，以代码为准；串口监视器右下角也要选 9600，否则会看到乱码。',
  });
  {
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: 5.3, h: G.ch, code: AD_CODE, from: 1, to: 12, hl: [1, 4, 9], file: 'ad_convert.ino', right: '第 1–12 行' });
    V.explain(s, b, {
      x: 6.05, w: G.R - 6.05, title: '逐行看懂', maxY: G.bottom,
      items: [
        { line: [1, 2], text: '起名字：ADPIN 就是 A0，\nLEDPIN 就是 13' },
        { line: [3, 4], text: '两个盒子：value 装整数读数；\nvoltage 装带小数的电压' },
        { line: [7, 8], text: 'A0 设为输入（读电压）；\n13 设为输出（点亮 LED）' },
        { line: 9, text: '打开串口，速度 9600；\n注释写 115200 是笔误' },
        { line: 11, text: 'loop() 里的内容会反复执行' },
      ],
    });
  }

  // ================================================================ code 2/2
  s = slide({
    title: '代码逐行看懂（2/2）：读数、换算、打印',
    desc: '每一轮：亮灯 → 读 A0 → 换算成电压 → 打印 → 灭灯，每 2 秒重复一次',
    notes: 'loop 一轮做这几件事：亮灯、读数、换算、打印、灭灯、等待。第 15、16 行就是上一页的换算公式。原指南第 3 页把最后的大括号印到了 delay(1000) 前面，照抄会编译报错，这里已经改正——遇到报错先数一数括号是否成对。',
  });
  {
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: 5.1, h: G.ch, code: AD_CODE, from: 13, to: 24, hl: [14, 15, 16, 19, 24], file: 'ad_convert.ino', right: '第 13–24 行' });
    V.explain(s, b, {
      x: 5.85, w: G.R - 5.85, title: '逐行看懂', maxY: G.bottom,
      items: [
        { line: [13, 14], text: '先点亮 LED，再读 A0：\n0V → 0，5V → 1023' },
        { line: [15, 16], text: '(float) 先变小数，\n再 ÷1023 得到 0～1 的比例，\n× 5 就是电压' },
        { line: [17, 20], text: '打印 3 行：\n读数、“voltage =”、电压值' },
        { line: [21, 24], text: '亮 1 秒 → 灭灯 → 再等 1 秒。\n原指南把第 24 行的 } 印早了一行（会报错），这里已放回最后' },
      ],
    });
  }

  // ================================================================ result
  s = slide({
    title: '实验结果：转动旋钮，数字跟着变',
    desc: '串口监视器（9600 波特率）每 2 秒打印一组：读数、提示文字、电压',
    notes: '上传后打开串口监视器，波特率选 9600。让学生慢慢转旋钮，观察读数从 0 变到 1023、电压从 0 变到 5V。不动旋钮时 398、399 来回跳是正常的测量误差。这种“读模拟值再换算”的方法，以后读大多数传感器都会用到。',
  });
  {
    const Hi = 2.05, capH = 0.3, pad = 0.12;
    const bh = Hi + 2 * pad + capH;
    const pw = Hi * 1196 / 803 + 2 * pad, sw = Hi * 449 / 366 + 2 * pad;
    V.imageBox(s, { file: 'l13/ad_result_photo.jpg', x: G.L, y: G.top, w: pw, h: bh, caption: '实物连接（原指南照片）' });
    V.imageBox(s, { file: 'l13/ad_serial_monitor.jpg', x: G.L + pw + 0.3, y: G.top, w: sw, h: bh, diagram: true, caption: '串口监视器（原指南截图）' });
    const ix = G.L + pw + sw + 0.6, iw = G.R - ix;
    V.card(s, { x: ix, y: G.top, w: iw, h: G.ch });
    txt(s, '输出怎么读', { x: ix + 0.16, y: G.top + 0.14, w: iw - 0.32, h: 0.3, size: 13, bold: true, valign: 'middle' });
    const outs = [['get ad pin value 399', 'A0 的读数是 399'], ['voltage =', '提示文字'], ['1.95', '电压 1.95 V']];
    outs.forEach(([m, t], i) => {
      const y = G.top + 0.56 + i * 0.66;
      V.card(s, { x: ix + 0.12, y, w: iw - 0.24, h: 0.3, fill: P.white, radius: 0.06 });
      txt(s, m, { x: ix + 0.2, y, w: iw - 0.4, h: 0.3, size: 10.5, mono: true, valign: 'middle' });
      txt(s, t, { x: ix + 0.16, y: y + 0.32, w: iw - 0.32, h: 0.26, size: 12, valign: 'middle' });
    });
    V.card(s, { x: ix + 0.12, y: G.top + 2.6, w: iw - 0.24, h: 0.9, fill: P.turqPale });
    txt(s, '验算：399 ÷ 1023 × 5\n≈ 1.95，和屏幕一致', { x: ix + 0.24, y: G.top + 2.6, w: iw - 0.48, h: 0.9, size: 12, valign: 'middle' });
    V.tip(s, { x: G.L, y: G.top + bh + 0.3, w: pw + sw + 0.3, h: G.bottom - (G.top + bh + 0.3), kind: 'tip', text: '转动电位器，读数和电压一起变；不动旋钮时，数字在 398、399 之间轻轻跳动，属于正常的小误差。', size: 12 }, I.eye);
  }

  // ================================================================ try it
  s = slide({
    title: '动手改一改：小改动，看变化',
    desc: '每次只改一处，上传后看串口有什么不同——改代码是读懂代码最快的办法',
    notes: '每组挑一两个改动做，改完上传再看效果。第 4 题答案：3.3 ÷ 5 × 1023 ≈ 675，旋到头读数约 675。也可以鼓励学生自己发明改法，比如读数大于 512 时才点亮 LED。',
  });
  {
    const cw = 4.4, ch = 1.67;
    const cards = [
      { t: '只看电压', code: 'Serial.println(voltage);  // 删掉 17–19 行', r: '串口只剩一列电压；打开“工具 → 串口绘图器”，还能看到随旋钮起伏的曲线。' },
      { t: '刷新快一点', code: 'delay(100);  // 两处 delay(1000) 都改', r: '每 0.2 秒刷新一次，转旋钮时数字跟得更紧，LED 也闪得更快。' },
      { t: '换成百分比', code: 'int percent = map(value, 0, 1023, 0, 100);', r: '把 0～1023 按比例换成 0～100，再打印 percent，旋钮位置一看就懂。' },
      { t: '想一想', q: '把电位器接 5V 的那根线改接到 3.3V，\n旋到头时，读数大约是多少？', r: '提示：用 3.3 ÷ 5 × 1023 算一算。' },
    ];
    cards.forEach((c, i) => {
      const x = G.L + (i % 2) * (cw + 0.3), y = G.top + Math.floor(i / 2) * (ch + 0.31);
      V.card(s, { x, y, w: cw, h: ch, fill: c.q ? P.turqPale : P.card });
      if (c.q) V.iconCircle(s, I.question, { x: x + 0.18, y: y + 0.17, d: 0.34 });
      else V.numCircle(s, i + 1, { x: x + 0.18, y: y + 0.17, d: 0.34, size: 12 });
      txt(s, c.t, { x: x + 0.64, y: y + 0.15, w: cw - 0.8, h: 0.38, size: 14, bold: true, valign: 'middle' });
      if (c.code) {
        miniCode(s, c.code, { x: x + 0.18, y: y + 0.64, w: cw - 0.36, size: 10.5 });
        txt(s, c.r, { x: x + 0.18, y: y + 1.1, w: cw - 0.36, h: 0.48, size: 12 });
      } else {
        txt(s, c.q, { x: x + 0.18, y: y + 0.62, w: cw - 0.36, h: 0.5, size: 12.5 });
        txt(s, c.r, { x: x + 0.18, y: y + 1.18, w: cw - 0.36, h: 0.3, size: 12, color: P.muted, valign: 'middle' });
      }
    });
  }
}

// ================================================================ 实验 02　光敏电阻模块
function buildLDR({ deck, I, slide }) {
  let s;
  // ================================================================ divider: experiment 2
  deck.section('实验二　光敏电阻');
  deck.divider({
    kicker: '实验 02',
    title: '光敏电阻模块实验',
    desc: '光敏电阻会随光线改变阻值。把它接到 A0 读出环境亮度，再用这个数控制 RGB 灯里红灯的亮度。',
    tiles: [
      { fill: P.turq, big: '01', title: '认识模块', sub: '光越强，电阻越小', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: 'S → A0，R → 11', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: 'analogRead()\nanalogWrite()', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '盖住它，看灯的变化', subSize: 12 },
    ],
    notes: '实验二把电位器换成光敏电阻：原来是手转旋钮，现在是光线来“转旋钮”。同时多了一个输出——用读数控制 RGB 模块红灯的亮度。',
  });

  // ================================================================ module intro
  s = slide({
    title: '认识光敏电阻：光越强，电阻越小',
    desc: '光敏电阻对光线非常敏感，常用来检测周围环境的亮度，做光控灯、自动调光',
    notes: '光敏电阻的核心一句话：光越强，电阻越小。亮电阻不到 1kΩ、暗电阻约 1.5MΩ，相差上千倍，所以非常灵敏。可以让学生想想生活中的光控路灯、小夜灯是怎么“知道”天黑的。',
  });
  {
    const w = 3.7;
    let y = G.top;
    y = lead(s, '它是什么', '一种会“看光”的电阻，\n用硫化镉等半导体材料做成。', { x: G.L, y, w }) + 0.26;
    y = lead(s, '为什么会变', '光一照，材料里能自由移动的电荷变多，电流更容易通过，电阻就变小（内光电效应）。', { x: G.L, y, w }) + 0.26;
    y = lead(s, '变化有多大', '强光下可小于 1 kΩ，完全无光时约 1.5 MΩ——相差上千倍，所以非常灵敏。', { x: G.L, y, w });
    if (y > G.bottom) warn('ldr intro text overflow');
    const px = 4.45, pw = G.R - px;
    V.imageBox(s, { file: 'l13/ldr_module_photo.jpg', x: px, y: G.top, w: pw, h: 2.5, pad: 0.1 });
    const facts = [['< 1 kΩ', '强光下的电阻', false], ['≈ 1.5 MΩ', '无光时的电阻', false], ['S V G', '信号 电源 地', true]];
    const fw = (pw - 0.5) / 3;
    facts.forEach(([b, t, mono], i) => {
      const fx = px + i * (fw + 0.25);
      V.card(s, { x: fx, y: 4.15, w: fw, h: 0.85 });
      txt(s, b, { x: fx + 0.15, y: 4.24, w: fw - 0.3, h: 0.36, size: 16, bold: true, valign: 'middle', mono });
      txt(s, t, { x: fx + 0.15, y: 4.6, w: fw - 0.3, h: 0.28, size: 12, color: P.muted, valign: 'middle' });
    });
  }

  // ================================================================ parts + principle chain
  s = slide({
    title: '组件清单与实验原理',
    desc: '光线一变，电阻就变，A0 上的电压和读数跟着变，最后变成红灯的亮度',
    notes: '强调这是一条因果链：光线 → 电阻 → 电压 → 读数 → 亮度。第 3 步是关键：模块里光敏电阻和一个固定电阻串联分压，和实验一的电位器是同一个道理。注意清单写的是 LED 模块，接线图实际用的是 RGB LED 模块。',
  });
  {
    const lw = 3.0;
    V.card(s, { x: G.L, y: G.top, w: lw, h: G.ch });
    txt(s, '组件清单', { x: G.L + 0.18, y: G.top + 0.14, w: lw - 0.36, h: 0.3, size: 13, bold: true, valign: 'middle' });
    const parts = [[I.chip, 'Arduino UNO R3 主板'], [I.grid, '面包板'], [I.usb, 'USB 数据线'], [I.sun, '光敏电阻 ×1（模块）'], [I.bulb, 'LED 模块 ×1 *'], [I.cable, '若干跳线']];
    parts.forEach(([ic, t], i) => {
      const y = G.top + 0.56 + i * 0.43;
      V.iconCircle(s, ic, { x: G.L + 0.18, y: y + 0.03, d: 0.32 });
      txt(s, t, { x: G.L + 0.62, y, w: lw - 0.75, h: 0.38, size: 12.5, valign: 'middle' });
    });
    txt(s, '* 接线图用的是 RGB LED 模块\n（只接了红色 R）', { x: G.L + 0.18, y: G.top + 3.12, w: lw - 0.36, h: 0.42, size: 10.5, color: P.muted });
    const fx = 3.75, rowH = 0.6, gap = 0.16;
    const chain = [
      ['光线变化', '用手盖住它，或用手电筒照它'],
      ['电阻变化', '光越强电阻越小，越暗电阻越大'],
      ['A0 电压变化', '模块里光敏电阻和固定电阻串联分压，电阻一变，S 脚电压就变'],
      ['读数 0～1023', 'analogRead(A0) 把电压读成数字'],
      ['亮度 0～255', '换算后用 analogWrite(11, 值) 点亮红灯'],
    ];
    chain.forEach(([t, sub], i) => {
      const y = G.top + i * (rowH + gap);
      if (i < chain.length - 1) V.arrow(s, fx + 0.2, y + 0.5, fx + 0.2, y + rowH + gap + 0.1, { noHead: true, color: P.gray2, width: 1.5 });
      V.numCircle(s, i + 1, { x: fx, y: y + 0.1, d: 0.4, size: 12 });
      V.card(s, { x: fx + 0.6, y, w: G.R - fx - 0.6, h: rowH, fill: i === 2 ? P.turqPale : P.card });
      txt(s, t, { x: fx + 0.78, y, w: 1.6, h: rowH, size: 14, bold: true, valign: 'middle' });
      txt(s, sub, { x: fx + 2.45, y, w: G.R - fx - 2.6, h: rowH, size: 12, valign: 'middle' });
    });
  }

  // ================================================================ wiring
  s = slide({
    title: '接线：光敏模块接 A0，RGB 模块红灯接 11',
    desc: '光敏电阻模块 S → A0、G → GND、V → 5V；RGB LED 模块 R → 11、GND → GND',
    notes: '光敏模块三根线：S 接 A0、G 接 GND、V 接 5V；RGB 模块只接 R 和 GND 两根。提醒学生 R 接的是 11 号——板上 11 旁边有 ~ 号，表示它能输出 PWM，下一页就讲。',
  });
  {
    V.imageBox(s, { file: 'l13/ldr_wiring.jpg', x: G.L, y: G.top, w: 5.6, h: 2.6, diagram: true, caption: '原指南接线图：上方是 RGB LED 模块，下方是光敏电阻模块' });
    const tx = 6.35, tw = G.R - tx;
    V.table(s, [['Arduino UNO 板', '光敏电阻模块'], ['A0', 'S'], ['GND', 'G'], ['5V', 'V']], { x: tx, y: G.top, w: tw, colW: [1.6, tw - 1.6], rowH: 0.3, size: 12, monoCols: [0, 1], boldCols: [0], align: ['center', 'center'] });
    txt(s, 'S = 信号　G = 地　V = 电源', { x: tx, y: 2.6, w: tw, h: 0.24, size: 10.5, color: P.muted, valign: 'middle' });
    V.table(s, [['Arduino UNO 板', 'RGB LED 模块'], ['11', 'R'], ['GND', 'GND']], { x: tx, y: 3.05, w: tw, colW: [1.6, tw - 1.6], rowH: 0.3, size: 12, monoCols: [0, 1], boldCols: [0], align: ['center', 'center'] });
    V.tip(s, { x: G.L, y: 4.25, w: G.cw, h: 0.75, kind: 'tip', text: '注意：组件清单写的是“LED 模块”，接线图用的是 RGB LED 模块。\n这里只接了 R（红色）一路，所以亮的是红灯。', size: 12 }, I.search);
  }

  // ================================================================ syntax: analogWrite + PWM
  s = slide({
    title: '新语法：analogWrite() 和 PWM',
    desc: '数字引脚只会开 / 关；PWM 让它飞快地开关，用“开着的时间占多少”来调节亮度',
    notes: '数字引脚本身只能输出 0V 或 5V，PWM 用“快速开关”模拟出中间的亮度。用右边的波形说明：开着的时间占 25%，灯看起来就大约是 25% 的亮度。只有带 ~ 的引脚能用 analogWrite，UNO 上是 3、5、6、9、10、11；11 号脚每秒开关约 490 次。',
  });
  {
    const lw = 3.9;
    V.tip(s, { x: G.L, y: G.top, w: lw, h: 1.45, kind: 'tip', title: '打个比方', text: '飞快地开关灯：一秒开关几百次，\n眼睛看不出闪烁，只觉得灯暗了一些。\n开着的时间越长，看起来越亮。', size: 12 }, I.bulb);
    miniCode(s, 'analogWrite(11, 128);  // 一半亮度', { x: G.L, y: 3.1, w: lw, size: 11.5 });
    V.table(s, [
      ['要点', '说明'],
      ['值的范围', '0～255（0 灭，255 最亮）'],
      ['能用的引脚', '3 5 6 9 10 11（带 ~ 的）'],
      ['11 号脚', '每秒开关约 490 次'],
    ], { x: G.L, y: 3.75, w: lw, colW: [1.2, lw - 1.2], rowH: 0.3, size: 12, boldCols: [0] });
    const rx = 4.75, rw = G.R - rx;
    V.card(s, { x: rx, y: G.top, w: rw, h: G.ch });
    txt(s, '同样是 5V，开着的时间比例不同', { x: rx + 0.2, y: G.top + 0.14, w: rw - 0.4, h: 0.3, size: 13, bold: true, valign: 'middle' });
    const rows = [[0, 0], [64, 0.25], [128, 0.5], [255, 1]];
    rows.forEach(([v, d], i) => {
      const y = G.top + 0.62 + i * 0.72;
      const by = y + 0.5, ph = 0.36;
      txt(s, `analogWrite(11, ${v})`, { x: rx + 0.18, y: y + 0.18, w: 1.95, h: 0.3, size: 10.5, mono: true, valign: 'middle' });
      const wx = rx + 2.15, ww = 1.5, per = ww / 4;
      V.arrow(s, wx, by, wx + ww, by, { noHead: true, color: P.faint, width: 1 });
      if (d > 0) for (let k = 0; k < 4; k++) s.addShape('rect', { x: wx + k * per, y: by - ph, w: per * d, h: ph, fill: { color: P.turq }, line: { color: P.turq, width: 0 } });
      s.addShape('ellipse', { x: rx + 3.82, y: y + 0.18, w: 0.3, h: 0.3, fill: { color: P.turq, transparency: Math.round((1 - d) * 100) }, line: { color: P.gray2, width: 0.75 } });
      txt(s, `${Math.round(d * 100)}%`, { x: rx + 4.17, y: y + 0.18, w: 0.58, h: 0.3, size: 12, bold: true, valign: 'middle' });
    });
  }

  // ================================================================ code 1/2
  s = slide({
    title: '代码逐行看懂（1/2）：和实验一几乎一样',
    desc: '变量和 setup() 与实验一基本相同，只是 LED 换到了能输出 PWM 的 11 号脚',
    notes: '先说明来源：原指南这一节的程序是空白的，这里用同套件教程第 2.20 讲的程序，接线完全一致。前 10 行和实验一几乎一样，可以让学生自己找不同：LED 换到了 11 号脚。注意 voltage 这里存的是 0～1 的比例，并不是电压。',
  });
  {
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: 5.4, h: 2.6, code: LDR_CODE, from: 1, to: 10, hl: [2, 4], file: 'light_sensor.ino', right: '第 1–10 行' });
    V.tip(s, { x: G.L, y: 4.25, w: 5.4, h: 0.75, kind: 'note', text: '原指南这一节程序是空白的，这里的程序来自同套件\n《Arduino 编程入门学习教程》第 2.20 讲，接线一致。', size: 12 }, I.book);
    V.explain(s, b, {
      x: 6.15, w: G.R - 6.15, title: '逐行看懂', maxY: G.bottom,
      items: [
        { line: [1, 2], text: 'A0 读光敏电阻；\nLED 换到带 ~ 的 11 号脚' },
        { line: [3, 4], text: 'value 装读数；voltage 装的\n是 0～1 的比例，不是电压' },
        { line: [7, 8], text: '11 号设为输出，A0 设为输入\n（顺序反过来也没关系）' },
        { line: 9, text: '串口 9600；注释里的\n115200 同样是笔误' },
      ],
      gap: 0.1,
    });
  }

  // ================================================================ code 2/2
  s = slide({
    title: '代码逐行看懂（2/2）：读光线，调亮度',
    desc: '每秒一轮：读 A0 → 算出 0～1 的比例 → 换算成亮度值 → 打印 → 送到红灯',
    notes: '第 14 行和实验一相同，先求出 0～1 的比例；第 15 行乘 256 再用 (int) 去掉小数，得到亮度值。第 16、17 行一边打印、一边输出到红灯。第 15 行藏着一个越界的小坑，留到后面专门讲。',
  });
  {
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: 5.4, h: 2.6, code: LDR_CODE, from: 11, to: 19, hl: [13, 15, 17], file: 'light_sensor.ino', right: '第 11–19 行' });
    V.tip(s, { x: G.L, y: 4.25, w: 5.4, h: 0.75, kind: 'warn', text: '读数满 1023 时，第 15 行会算出 256，\n超出 analogWrite 的 0～255——后面专门讲怎么修。', size: 12 }, I.warn_w);
    V.explain(s, b, {
      x: 6.15, w: G.R - 6.15, title: '逐行看懂', maxY: G.bottom,
      items: [
        { line: 13, text: '读光敏电阻，得到 0～1023' },
        { line: 14, text: '先变小数再 ÷1023 → 0～1' },
        { line: 15, text: '× 256，(int) 去小数 → 亮度值' },
        { line: [16, 17], text: '打印亮度值，再送到红灯' },
        { line: 18, text: '等 1 秒，回到第 13 行再读' },
      ],
      gap: 0.08,
    });
  }

  // ================================================================ result
  s = slide({
    title: '实验结果：盖住光敏电阻，红灯亮度跟着变',
    desc: '用手盖住或用灯照光敏电阻，红灯亮度明显改变，串口里的数值也跟着跳变',
    notes: '上传后打开串口监视器（9600），按表格顺序做三次：正常光线、用手盖住、用手机手电筒照，每次把串口数值和红灯亮度填进表里。数值是变大还是变小取决于模块内部电路，原指南没有写，让学生自己测出来、再和同桌对比。',
  });
  {
    V.imageBox(s, { file: 'l13/ldr_result_photo.jpg', x: G.L, y: G.top, w: 4.25, h: G.ch, caption: '实物：光敏模块和 RGB 模块接在 UNO 上，红灯亮起' });
    const rx = 5.0, rw = G.R - rx;
    V.tip(s, { x: rx, y: G.top, w: rw, h: 0.8, kind: 'note', text: '原指南：“现在我们盖住光敏电阻，\n我们将清楚地看到光的亮度变化。”', size: 12 }, I.book);
    const ty = 2.45;
    txt(s, '动手观察：测一测，填一填', { x: rx, y: ty, w: rw, h: 0.3, size: 13, bold: true, valign: 'middle' });
    const rowH = 0.36, tblY = ty + 0.38;
    V.table(s, [
      ['光线条件', '串口数值', '红灯亮度'],
      ['① 正常光线', '', ''],
      ['② 用手盖住', '', ''],
      ['③ 手电筒照', '', ''],
    ], { x: rx, y: tblY, w: rw, colW: [1.55, 1.5, rw - 3.05], rowH, size: 12, zebra: false });
    const hintY = tblY + rowH * 4 + 0.22;
    V.iconCircle(s, I.eye, { x: rx, y: hintY + 0.02, d: 0.32 });
    txt(s, '变大还是变小取决于模块电路，\n原指南没写——自己测出来才算数。', { x: rx + 0.44, y: hintY, w: rw - 0.44, h: G.bottom - hintY, size: 12 });
  }

  // ================================================================ (int) + 256 pitfall
  s = slide({
    title: '换算细节：(int) 和越界的 256',
    desc: '(int) 直接去掉小数；读数满 1023 时会算出 256，超出 analogWrite 的 0～255，改用 map() 更稳妥',
    notes: '(int) 是直接截断，不是四舍五入。表格前三行都正常，只有读数正好 1023 时算出 256，超出 analogWrite 的范围，灯会突然几乎熄灭，而不是最亮。修复方法：用 map(value, 0, 1023, 0, 255)，或者把 256 改成 255。',
  });
  {
    const lw = 4.6;
    let by = iconCard(s, I.cut, '(int)：把小数砍掉', { x: G.L, y: G.top, w: lw, h: G.ch });
    const iw = lw - 0.4;
    txt(s, '像量身高只记整厘米：172.9 cm 记作 172。\n(int) 不四舍五入，直接扔掉小数部分。', { x: G.L + 0.2, y: by, w: iw, h: 0.5, size: 12.5 });
    const red = (t) => ({ text: t, color: P.red, bold: true });
    V.table(s, [
      ['读数 value', '÷ 1023', '× 256', '(int) 结果'],
      ['0', '0.000', '0.0', '0'],
      ['512', '0.500', '128.1', '128'],
      ['1000', '0.978', '250.2', '250'],
      [red('1023'), red('1.000'), red('256.0'), red('256 越界')],
    ], { x: G.L + 0.2, y: by + 0.66, w: iw, colW: [1.1, 0.95, 0.95, iw - 3.0], rowH: 0.34, size: 12, monoCols: [0, 1, 2, 3], align: ['center', 'center', 'center', 'center'] });
    txt(s, '前三行都没问题，只有满量程 1023 这一格出界。', { x: G.L + 0.2, y: by + 2.5, w: iw, h: 0.28, size: 12, color: P.muted, valign: 'middle' });
    const rx = 5.35, rw = G.R - rx;
    V.tip(s, { x: rx, y: G.top, w: rw, h: 1.55, kind: 'warn', title: '小心：256 越界了', text: 'analogWrite 只认 0～255。读数正好 1023 时算出 256，超出范围，灯会突然变得几乎不亮，而不是最亮。', size: 12 }, I.warn_w);
    const fy = G.top + 1.55 + 0.3, fh = G.bottom - fy;
    V.tip(s, { x: rx, y: fy, w: rw, h: fh, kind: 'note', title: '更稳妥：用 map() 换算' }, I.check);
    miniCode(s, 'value = map(value, 0, 1023, 0, 255);', { x: rx + 0.16, y: fy + 0.62, w: rw - 0.32, size: 11 });
    txt(s, 'map() 把 0～1023 按比例换成 0～255，\n最大正好是 255，不会越界。', { x: rx + 0.16, y: fy + 1.12, w: rw - 0.32, h: 0.5, size: 12 });
  }
}

// ================================================================ 实验 03　LED 流水灯
function buildLED({ deck, I, slide }) {
  let s;
  // ================================================================ divider: experiment 3
  deck.section('实验三　LED 流水灯');
  deck.divider({
    kicker: '实验 03',
    title: 'LED 流水灯实验',
    desc: '让 8 盏 LED 一个接一个亮起来，像水一样“流”过去。顺便学会三样新本领：数组、for 循环和自定义函数。',
    tiles: [
      { fill: P.turq, big: '01', title: '原理', sub: '限流电阻 · 低电平点亮', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: '8 盏灯 → D2～D9', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: '数组 · for · 函数', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '看灯怎么“流”起来', subSize: 12 },
    ],
    notes: '前两个实验是把外界的变化“读进来”，从实验三开始反过来，用 digitalWrite() 把 HIGH / LOW “送出去”。实验三分四步：先认识 LED 和限流电阻，再看原理图和接线，然后学新语法、逐行读代码，最后看效果。提醒学生准备 8 个 LED 和 8 个 1kΩ 电阻，先不要急着插线。',
  });

  // ================================================================ LED intro
  s = slide({
    title: '认识 LED：会发光的二极管',
    desc: 'LED 只让电流从正极流向负极——长脚接正、短脚接负，接反了就不亮',
    notes: '拿一颗 LED 让学生看两条腿：长的是正极，短的是负极。“单向导通”可以类比地铁的单向闸机：只能从一边进。原指南这里把两种颜色的材料印成了同一个名字（印刷错误），讲课时只讲结论：材料不同，颜色就不同。',
  });
  {
    const w = 3.9;
    let y = G.top;
    y = lead(s, '它是什么', 'LED 是“发光二极管”的英文缩写。电流流过它就会发光，省电又耐用，指示灯、屏幕、车灯里到处都是。', { x: G.L, y, w }) + 0.24;
    y = lead(s, '为什么有不同颜色', '用的半导体材料不同（镓、砷、磷等元素的化合物），发出的光颜色就不同：红、绿、黄……', { x: G.L, y, w }) + 0.24;
    y = lead(s, '单向导通', '电流只能从正极（长脚）流到负极（短脚），像只能单向通过的闸机。', { x: G.L, y, w });
    txt(s, '注：原指南此处材料名印重复了，这里只保留结论。', { x: G.L, y: y + 0.12, w, h: 0.22, size: 10, color: P.muted, valign: 'middle' });
    if (y + 0.34 > G.bottom) warn('LED intro text overflow');
    const rx = 4.75, rw = G.R - rx, iw = (rw - 0.3) / 2, ih = 2.5;
    V.imageBox(s, { file: 'l13/led_photo.jpg', x: rx, y: G.top, w: iw, h: ih, diagram: true, caption: '实物：红色 LED' });
    V.imageBox(s, { file: 'l13/led_symbol.jpg', x: rx + iw + 0.3, y: G.top, w: iw, h: ih, diagram: true, caption: '电路符号' });
    const by = G.top + ih + 0.3, bh = G.bottom - by;
    const pol = [
      { x: rx, big: '+', t: '长脚 = 正极', d: '接电源这一边' },
      { x: rx + iw + 0.3, big: '−', t: '短脚 = 负极', d: '三角形尖端指向它' },
    ];
    for (const p of pol) {
      V.card(s, { x: p.x, y: by, w: iw, h: bh });
      V.numCircle(s, p.big, { x: p.x + 0.16, y: by + (bh - 0.44) / 2, d: 0.44, size: 18 });
      txt(s, p.t, { x: p.x + 0.72, y: by + 0.12, w: iw - 0.84, h: 0.3, size: 13.5, bold: true, valign: 'middle' });
      txt(s, p.d, { x: p.x + 0.72, y: by + 0.44, w: iw - 0.84, h: 0.26, size: 12, color: P.muted, valign: 'middle' });
    }
  }

  // ================================================================ current-limiting resistor
  s = slide({
    title: '为什么要串电阻：限流电阻',
    desc: 'LED 自己不会“限速”，电流太大就会烧坏；串一个电阻，把电流控制在安全范围',
    notes: '公式不用死记，记住“电源电压减去 LED 吃掉的电压，剩下的由电阻承担”。现场算一遍：(5−2)÷0.015≈200Ω，取常见规格 220Ω。本套件用的是 1kΩ，电流只有约 3mA，灯稍暗但完全够看，接错也不容易烧。顺便提醒：LED 反向最多只能承受约 5V，不要反接到更高的电压上。',
  });
  {
    const fx = G.L, fw = 5.3, fh = 1.8, y = G.top;
    V.card(s, { x: fx, y, w: fw, h: fh });
    // formula R = (E − V_F) / I
    const size = 22, cy = y + 0.72, lh = size / 72 * 1.3;
    const lw = V.textW('R =', size) + 0.12;
    V.text(s, 'R =', { x: fx + 0.25, y: cy - lh / 2, w: lw, h: lh, size, align: 'center', valign: 'middle' });
    const nx = fx + 0.25 + lw + 0.06, nw = V.textW('E − VF', size) + 0.2;
    V.text(s, [R('E − V'), R('F', SUB)], { x: nx, y: cy - lh - 0.09, w: nw, h: lh, size, align: 'center', valign: 'middle' });
    s.addShape('line', { x: nx, y: cy, w: nw, h: 0, line: { color: P.ink, width: 1.25 } });
    V.text(s, 'I', { x: nx, y: cy + 0.02, w: nw, h: lh, size, align: 'center', valign: 'middle' });
    txt(s, '电阻 = 电阻要分担的电压 ÷ 电流', { x: fx + 0.25, y: y + 1.32, w: 3.2, h: 0.3, size: 12.5, bold: true, valign: 'middle' });
    const lx = fx + 2.75, lww = fw - 2.75 - 0.15;
    const legend = [
      [R('E：电源电压，这里是 5V')],
      [R('V'), R('F', SUB), R('：LED 压降，约 1.5～2V')],
      [R('I：工作电流，约 10～20 mA')],
    ];
    legend.forEach((runs, i) => V.text(s, runs, { x: lx, y: y + 0.2 + i * 0.34, w: lww, h: 0.3, size: 12, valign: 'middle' }));
    const ex = fx + fw + 0.3, ew = G.R - ex;
    V.card(s, { x: ex, y, w: ew, h: fh, fill: P.turqPale });
    txt(s, '算一算：红色 LED 接 5V', { x: ex + 0.2, y: y + 0.14, w: ew - 0.4, h: 0.3, size: 13, bold: true, valign: 'middle' });
    txt(s, '(5 − 2) V ÷ 15 mA', { x: ex + 0.2, y: y + 0.5, w: ew - 0.4, h: 0.3, size: 14, valign: 'middle' });
    txt(s, '≈ 200 Ω', { x: ex + 0.2, y: y + 0.82, w: ew - 0.4, h: 0.46, size: 24, bold: true, valign: 'middle' });
    txt(s, '取常见的规格：220 Ω', { x: ex + 0.2, y: y + 1.34, w: ew - 0.4, h: 0.28, size: 12, valign: 'middle' });
    const by = y + fh + 0.3, bh = G.bottom - by, bw = (G.cw - 0.6) / 3;
    const cards = [
      { ic: I.bolt, t: '为什么必须串电阻', d: 'LED 的脾气很“陡”：电压只高一点点，电流就猛增，很快就烧坏了。' },
      { ic: I.tint, t: '像水龙头的阀门', d: '电阻越大，电流越小。灯会暗一些，但更安全。' },
      { ic: I.resistor, t: '本套件用 1kΩ', d: '(5 − 2) V ÷ 1000 Ω ≈ 3 mA：灯稍暗，但更省电、更安全，照样看得清。' },
    ];
    cards.forEach((c, i) => {
      const cx = G.L + i * (bw + 0.3);
      const top = iconCard(s, c.ic, c.t, { x: cx, y: by, w: bw, h: bh, d: 0.38, titleSize: 13.5 });
      txt(s, c.d, { x: cx + 0.2, y: top, w: bw - 0.4, h: by + bh - 0.1 - top, size: 12 });
    });
  }

  // ================================================================ goal + parts
  s = slide({
    title: '实验目的与组件清单',
    desc: '目标：让灯光像流水一样，从一头“流”到另一头——先单灯跑，再逐个点亮',
    notes: '对照清单把元件拿出来：8 个 LED、8 个 1kΩ 电阻。可以问学生：为什么从 D2 开始而不是 D0？因为 D0、D1 是 Arduino 和电脑通信的串口，接了别的东西可能导致上传程序失败。右下的小图先让学生想象一下“流水”的样子。',
  });
  {
    txt(s, '组件清单', { x: G.L, y: G.top, w: 3, h: 0.3, size: 13, bold: true, valign: 'middle' });
    const parts = [[I.chip, 'Arduino UNO R3 主板'], [I.grid, '面包板'], [I.usb, 'USB 数据线'], [I.bulb, 'LED ×8'], [I.resistor, '1kΩ 电阻 ×8'], [I.cable, '若干跳线']];
    const pw = 2.6, ph = 0.6, gx = 0.2, gy = 0.18;
    parts.forEach(([ic, t], i) => {
      const c = i % 2, r = Math.floor(i / 2);
      compCard(s, ic, t, G.L + c * (pw + gx), 1.75 + r * (ph + gy), pw, ph, 12);
    });
    V.tip(s, { x: G.L, y: 4.2, w: 2 * pw + gx, h: 0.8, kind: 'tip', text: 'D0、D1 是和电脑通信（串口）用的，先空着，所以 8 盏灯从 D2 接到 D9。', size: 12 }, I.bulb);
    const rx = 6.15, rw = G.R - rx;
    V.tip(s, { x: rx, y: G.top, w: rw, h: 2.0, kind: 'note', title: '实验目的', text: '什么是流水灯？就像山间的小溪，让灯光一盏接一盏地亮起来，看上去在流动。先让单个灯从头跑到尾，再让所有灯依次点亮，如此循环。', size: 12.5 }, I.target);
    const cy = 3.65, chh = G.bottom - cy;
    V.card(s, { x: rx, y: cy, w: rw, h: chh });
    txt(s, '想象一下“流水”的样子：', { x: rx + 0.2, y: cy + 0.1, w: rw - 0.4, h: 0.26, size: 12, bold: true, valign: 'middle' });
    [['单灯跑', (k) => k === 4, 0.62], ['逐个点亮', (k) => k <= 4, 1.0]].forEach(([lab, on, dy]) => {
      txt(s, lab, { x: rx + 0.2, y: cy + dy - 0.13, w: 0.8, h: 0.26, size: 10.5, color: P.muted, valign: 'middle' });
      lampRow(s, rx + 1.0, cy + dy, rw - 1.15, 0.2, on);
    });
    if (cy + 1.0 + 0.2 > G.bottom) warn('lamp sketch overflow');
  }

  // ================================================================ schematic
  s = slide({
    title: '原理图：低电平点亮',
    desc: '8 盏 LED 的正极都接 5V，负极经 1kΩ 电阻接 D2～D9——引脚输出 LOW 灯亮，HIGH 灯灭',
    notes: '这一页是整个实验的关键。很多同学以为 HIGH 才是亮，这里正好相反：LED 正极已经接在 5V 上，引脚拉到 LOW（0V）时两端有电压差，电流从 5V 经 LED、电阻流进引脚，灯就亮；引脚输出 HIGH 时两端都是 5V，没有电流，灯就灭。用“水往低处流”来类比。',
  });
  {
    V.imageBox(s, { file: 'l13/flow_schematic.jpg', x: G.L, y: G.top, w: 5.75, h: G.ch, diagram: true, caption: '原指南原理图：VCC_5V → LED1～LED8 → 1K 电阻 → D2～D9' });
    const rx = 6.5, rw = G.R - rx, th = 1.15;
    const st = [
      { fill: P.turq, big: 'LOW', t: '灯亮', d: '引脚 0V，比正极低 5V\n电流流过 LED', col: P.ink, sub: P.ink },
      { fill: P.ink, big: 'HIGH', t: '灯灭', d: '引脚也是 5V，两头一样高\n没有电流', col: P.white, sub: 'D0D0D0' },
    ];
    st.forEach((t, i) => {
      const ty = G.top + i * th;
      s.addShape('rect', { x: rx, y: ty, w: rw, h: th, fill: { color: t.fill }, line: { color: P.gray2, width: 0.75 } });
      V.text(s, t.big, { x: rx + 0.2, y: ty + 0.1, w: 1.2, h: 0.42, size: 22, bold: true, mono: true, color: t.fill === P.ink ? P.turq : P.ink, valign: 'middle' });
      txt(s, t.t, { x: rx + 1.45, y: ty + 0.1, w: rw - 1.6, h: 0.42, size: 16, bold: true, color: t.col, valign: 'middle' });
      txt(s, t.d, { x: rx + 0.2, y: ty + 0.56, w: rw - 0.4, h: 0.5, size: 12, color: t.sub });
    });
    const ty = G.top + 2 * th + 0.3;
    V.tip(s, { x: rx, y: ty, w: rw, h: G.bottom - ty, kind: 'tip', title: '水往低处流', text: '正极在 5V 高处，引脚降到 0V，电流才流下来', size: 12 }, I.tint);
  }

  // ================================================================ wiring
  s = slide({
    title: '接线：8 盏灯接 D2～D9',
    desc: 'LED 长脚插 5V 电源轨，短脚各串一个 1kΩ 电阻，再分别接到 D2～D9',
    notes: '先断电再接线。8 个 LED 方向要一致：长脚全部朝 5V 电源轨。每个短脚串一个电阻再接到数字口，电源轨用一根红线接到 UNO 的 5V。接完数一数：8 根信号线、1 根电源线。',
  });
  {
    V.imageBox(s, { file: 'l13/flow_wiring.jpg', x: G.L, y: G.top, w: 4.4, h: G.ch, diagram: true, caption: '原指南接线图（短脚 · 电阻 1K · 长脚）' });
    const rx = 5.15, rw = G.R - rx, tw = (rw - 0.3) / 2;
    const rows1 = [['LED', 'Arduino'], ['LED1', 'D2'], ['LED2', 'D3'], ['LED3', 'D4'], ['LED4', 'D5']];
    const rows2 = [['LED', 'Arduino'], ['LED5', 'D6'], ['LED6', 'D7'], ['LED7', 'D8'], ['LED8', 'D9']];
    V.table(s, rows1, { x: rx, y: G.top, w: tw, colW: [tw / 2, tw / 2], rowH: 0.3, size: 12, monoCols: [0, 1], boldCols: [1], align: ['center', 'center'] });
    V.table(s, rows2, { x: rx + tw + 0.3, y: G.top, w: tw, colW: [tw / 2, tw / 2], rowH: 0.3, size: 12, monoCols: [0, 1], boldCols: [1], align: ['center', 'center'] });
    const cy = G.top + 1.5 + 0.3, chh = G.bottom - cy;
    V.card(s, { x: rx, y: cy, w: rw, h: chh });
    txt(s, '接线三步', { x: rx + 0.2, y: cy + 0.12, w: 2, h: 0.28, size: 13, bold: true, valign: 'middle' });
    const stp = [
      '长脚（+）全部插到 5V 电源轨',
      '短脚（−）各串一个 1kΩ 电阻',
      '电阻另一头接 D2～D9，电源轨接 5V',
    ];
    stp.forEach((t, i) => {
      const yy = cy + 0.5 + i * 0.44;
      V.numCircle(s, i + 1, { x: rx + 0.2, y: yy + 0.02, d: 0.3, size: 11 });
      txt(s, t, { x: rx + 0.62, y: yy, w: rw - 0.8, h: 0.36, size: 12, valign: 'middle' });
    });
  }

  // ================================================================ program idea
  s = slide({
    title: '程序原理：灯是怎么“流”起来的',
    desc: '一次只改一个引脚，停一小会儿再改下一个——快速接力，看起来就像水在流',
    notes: '右边是“慢动作回放”：每一行是 0.1 秒后的样子。上半部分是单灯跑：每次只有一盏亮；下半部分是逐个点亮：亮了就不关。原指南文字里写的是 500ms、从 D9 开始，但程序里 flash_speed = 100、数组从 2 号脚开始，讲的时候以程序为准。可以提问：间隔改成 1 毫秒会怎样？（太快了，眼睛看着像全都亮着）',
  });
  {
    const w = 3.55;
    const steps = [
      '准备：D2～D9 都输出 HIGH\n8 盏灯全部熄灭',
      '单灯跑：按 2 → 9 号的顺序\n拉低一个引脚（亮），等 0.1 秒\n再拉高（灭），然后换下一盏',
      '逐个点亮：一盏接一盏拉低\n亮了就不再关，直到 8 盏全亮',
    ];
    let y = G.top;
    steps.forEach((t, i) => {
      V.numCircle(s, i + 1, { x: G.L, y: y + 0.02, d: 0.34, size: 12 });
      const h = hOf(t, w - 0.48, 13, 1.25);
      txt(s, t, { x: G.L + 0.48, y, w: w - 0.48, h, size: 13 });
      y += Math.max(h, 0.4) + 0.2;
    });
    const ty = Math.max(y + 0.1, 3.85);
    V.tip(s, { x: G.L, y: ty, w, h: G.bottom - ty, kind: 'note', text: '原指南文字写“每盏 500ms”，程序里 flash_speed = 100，即 0.1 秒，以程序为准。', size: 12 }, I.clock);
    // slow-motion lamp chart
    const cx = 4.35, cw = G.R - cx;
    V.card(s, { x: cx, y: G.top, w: cw, h: G.ch });
    const labW = 1.05, lx = cx + 0.2 + labW, lw = G.R - 0.2 - lx, step = lw / 8;
    txt(s, '引脚', { x: cx + 0.2, y: G.top + 0.12, w: labW, h: 0.22, size: 10, color: P.muted, valign: 'middle' });
    for (let k = 0; k < 8; k++) V.text(s, String(k + 2), { x: lx + step * k, y: G.top + 0.12, w: step, h: 0.22, size: 10.5, mono: true, bold: true, align: 'center', valign: 'middle' });
    const rowH = 0.25, d = 0.18;
    const sections = [
      { y: G.top + 0.42, title: [R('led_flash()', { fontFace: V.MONO, bold: true }), R('　单灯跑')], on: (r, k) => k === r },
      { y: G.top + 2.0, title: [R('led_turn_on()', { fontFace: V.MONO, bold: true }), R('　逐个点亮')], on: (r, k) => k <= r },
    ];
    const rowsIdx = [0, 1, 2, 7];
    for (const sec of sections) {
      V.text(s, sec.title, { x: cx + 0.2, y: sec.y, w: cw - 0.4, h: 0.28, size: 12, bold: true, valign: 'middle' });
      rowsIdx.forEach((r, j) => {
        const ry = sec.y + 0.36 + j * rowH + (j === 3 ? 0.1 : 0);
        txt(s, r === 7 ? '第 8 步' : `第 ${r + 1} 步`, { x: cx + 0.2, y: ry, w: labW, h: rowH, size: 10.5, color: P.muted, valign: 'middle' });
        lampRow(s, lx, ry + rowH / 2, lw, d, (k) => sec.on(r, k));
        if (j === 2) V.text(s, '⋮', { x: cx + 0.2, y: ry + rowH - 0.04, w: 0.5, h: 0.2, size: 10, color: P.muted, valign: 'middle' });
      });
    }
    const last = G.top + 2.0 + 0.36 + 3 * rowH + 0.1 + rowH;
    if (last > G.bottom - 0.08) warn(`lamp chart overflow ${last.toFixed(2)}`);
  }

  // ================================================================ syntax 1: array + for
  s = slide({
    title: '新语法①：数组和 for 循环',
    desc: '数组把 8 个引脚号排进一排编号的柜子；for 循环从 0 号柜开始，挨个打开处理',
    notes: '数组就像学校的一排储物柜：柜子统一叫 led_array，每个柜子有编号，里面放着一个引脚号。最容易错的是编号从 0 开始，8 个柜子的编号是 0～7，没有 led_array[8]。for 循环像操场跑圈：起点、什么时候停、每圈之后做什么，三件事写在一对括号里，用分号隔开。',
  });
  {
    const y = G.top, h = 1.45;
    V.card(s, { x: G.L, y, w: G.cw, h });
    V.iconCircle(s, I.archive, { x: G.L + 0.2, y: y + 0.17, d: 0.42 });
    txt(s, '数组 = 一排编号的柜子', { x: G.L + 0.76, y: y + 0.17, w: 2.6, h: 0.42, size: 14.5, bold: true, valign: 'middle' });
    txt(s, '一个名字装 8 个引脚号，按编号取用。\n注意：编号从 0 开始！', { x: G.L + 0.2, y: y + 0.7, w: 3.0, h: 0.62, size: 12 });
    const bx = 3.75, bw = 0.6, bg = 0.1;
    for (let k = 0; k < 8; k++) {
      const x = bx + k * (bw + bg);
      V.text(s, `[${k}]`, { x, y: y + 0.08, w: bw, h: 0.22, size: 10.5, mono: true, color: P.muted, align: 'center', valign: 'middle' });
      V.card(s, { x, y: y + 0.33, w: bw, h: 0.5, fill: P.white, line: P.gray2, radius: 0.06 });
      V.text(s, String(k + 2), { x, y: y + 0.33, w: bw, h: 0.5, size: 18, bold: true, align: 'center', valign: 'middle' });
    }
    miniCode(s, 'int led_array[8] = { 2 , 3 , 4 , 5 , 6 , 7 , 8 , 9 } ;', { x: bx, y: y + 0.98, w: 8 * bw + 7 * bg, size: 11 });
    const by = y + h + 0.3, bh = G.bottom - by, cw = (G.cw - 0.3) / 2;
    // for loop anatomy
    let top = iconCard(s, I.redo, 'for 循环 = 数着圈跑步', { x: G.L, y: by, w: cw, h: bh, d: 0.38, titleSize: 14 });
    miniCode(s, 'for( i = 0 ; i < 8 ; i++ )', { x: G.L + 0.2, y: top - 0.02, w: cw - 0.4, size: 12 });
    const parts = [['i = 0', '从 0 开始'], ['i < 8', '小于 8 就继续'], ['i++', '每圈加 1']];
    const pw = (cw - 0.4 - 0.2) / 3;
    parts.forEach(([c, t], i) => {
      const px = G.L + 0.2 + i * (pw + 0.1);
      V.pill(s, { x: px, y: top + 0.46, w: pw, h: 0.26, text: `${i + 1}  ${c}`, size: 10.5, fill: P.turq, mono: true });
      txt(s, t, { x: px, y: top + 0.76, w: pw, h: 0.26, size: 12, align: 'center', valign: 'middle' });
    });
    if (top + 1.02 > by + bh) warn('for anatomy overflow');
    // combined
    const rx = G.L + cw + 0.3;
    top = iconCard(s, I.cubes, '合起来：挨个开柜子', { x: rx, y: by, w: cw, h: bh, d: 0.38, titleSize: 14 });
    miniCode(s, 'for( i = 0 ; i < 8 ; i++ )\n  digitalWrite(led_array[i],LOW);', { x: rx + 0.2, y: top - 0.02, w: cw - 0.4, h: 0.54, size: 11 });
    txt(s, 'i = 0 点 2 号脚，i = 1 点 3 号脚……\ni = 7 点 9 号脚，8 盏灯全部处理完', { x: rx + 0.2, y: top + 0.68, w: cw - 0.4, h: 0.46, size: 12 });
    if (top + 0.68 + 0.46 > by + bh - 0.04) warn('combined card text overflow');
  }

  // ================================================================ syntax 2: functions
  s = slide({
    title: '新语法②：自定义函数',
    desc: '把一串动作装进一个有名字的“菜谱”，以后喊一声名字，就把整套动作做一遍',
    notes: '函数就是菜谱：定义的时候写清楚步骤，调用的时候只要喊菜名。void 在英语里是“空”，表示做完不交回任何结果；括号里的 void 表示不需要额外材料。setup() 和 loop() 其实也是函数，只不过是 Arduino 规定好名字、自动调用的。让学生体会：loop() 里三行就读懂了整个流水灯的流程。',
  });
  {
    const lw = 4.55, y = G.top;
    let top = iconCard(s, I.book, '定义：写一份菜谱', { x: G.L, y, w: lw, h: G.ch, d: 0.4, titleSize: 14.5 });
    const mh = miniCode(s, 'void led_flash(void)\n{\n  // 一串动作写在这里\n}', { x: G.L + 0.2, y: top, w: lw - 0.4, size: 12 });
    const legend = [
      ['void', '做完不交回结果（“空”）'],
      ['led_flash', '菜谱的名字，自己起，最好见名知意'],
      ['(void)', '不需要额外的“材料”'],
      ['{ }', '具体步骤都写在大括号里'],
    ];
    let ly = top + mh + 0.2;
    legend.forEach(([c, t]) => {
      V.pill(s, { x: G.L + 0.2, y: ly + 0.03, w: 1.15, h: 0.28, text: c, size: 10.5, fill: P.ink, color: P.white, mono: true });
      txt(s, t, { x: G.L + 1.47, y: ly, w: lw - 1.67, h: 0.34, size: 12, valign: 'middle' });
      ly += 0.42;
    });
    if (ly > G.bottom) warn('function legend overflow');
    const rx = G.L + lw + 0.3, rw = G.R - rx, th = 2.0;
    top = iconCard(s, I.comments, '调用：喊一声名字', { x: rx, y, w: rw, h: th, d: 0.4, titleSize: 14.5 });
    miniCode(s, 'led_flash();     // 单灯跑\nled_turn_off();  // 逐个熄灭\nled_turn_on();   // 逐个点亮', { x: rx + 0.2, y: top, w: rw - 0.4, size: 11.5 });
    txt(s, '写一行名字 = 照着菜谱做一遍', { x: rx + 0.2, y: y + th - 0.4, w: rw - 0.4, h: 0.28, size: 12, bold: true, valign: 'middle' });
    const by = y + th + 0.3, bh = G.bottom - by, bw = (rw - 0.4) / 3;
    const good = [[I.eye, '好读', '读起来\n像说话'], [I.wrench, '好改', '改一处\n处处生效'], [I.redo, '好复用', '想用几次\n就用几次']];
    good.forEach(([ic, t, d], i) => {
      const bx = rx + i * (bw + 0.2);
      V.card(s, { x: bx, y: by, w: bw, h: bh });
      V.iconCircle(s, ic, { x: bx + 0.16, y: by + 0.16, d: 0.36 });
      txt(s, t, { x: bx + 0.6, y: by + 0.16, w: bw - 0.7, h: 0.36, size: 13.5, bold: true, valign: 'middle' });
      txt(s, d, { x: bx + 0.16, y: by + 0.64, w: bw - 0.3, h: bh - 0.74, size: 12 });
    });
  }

  // ================================================================ code 1/3
  s = slide({
    title: '代码逐行看懂（1/3）：数组和单灯跑',
    desc: '先准备好“柜子”和速度，再把“一盏灯从头跑到尾”打包成 led_flash()',
    notes: '第 1 行一次装下 8 个引脚号，后面就能用 led_array[i] 按编号取。第 10～12 行是流水灯的核心：拉低让这盏亮，等 0.1 秒，再拉高让它灭，然后 for 循环换到下一盏。再强调一次：这里 LOW 才是亮。第 4 行注释里的 form 是 from 的笔误，不影响程序。',
  });
  {
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: 5.7, h: G.ch, code: LED_CODE, from: 1, to: 14, hl: [1, 2, 5, 8, 10, 11, 12], file: 'flowing_led.ino', right: '第 1–14 行' });
    V.explain(s, b, { x: 6.4, w: G.R - 6.4, title: '逐行看懂', maxY: G.bottom, gap: 0.1, items: [
      { line: [1, 2], text: '数组：[0] 是 2，[7] 是 9\n每一步停 100 毫秒' },
      { line: 5, text: '自定义函数\n把“单灯跑一趟”打包' },
      { line: 8, text: 'i 从 0 数到 7\n8 盏灯挨个处理' },
      { line: [10, 12], text: '拉低 → 这盏亮；等 0.1 秒\n拉高 → 熄灭，换下一盏' },
    ] });
  }

  // ================================================================ code 2/3 (twins)
  s = slide({
    title: '代码逐行看懂（2/3）：一对“双胞胎”函数',
    desc: 'led_turn_on() 逐个点亮，led_turn_off() 逐个熄灭——两段代码只差 LOW 和 HIGH',
    notes: '让学生先找不同：两个函数只有高亮的那一行不一样。和上一页的 led_flash() 比，led_turn_on() 少了“拉高熄灭”这一步，所以灯亮了就不再灭，越来越多。led_turn_off() 反过来，一盏一盏关掉。每个函数都要 8 × 0.1 = 0.8 秒。',
  });
  {
    const w = (G.cw - 0.3) / 2, h = 2.6;
    const size = Math.min(fitCodeSize(LED_CODE, 16, 25, w, h), fitCodeSize(LED_CODE, 27, 36, w, h));
    codeWithNotes(s, { x: G.L, y: G.top, w, h, size, code: LED_CODE, from: 16, to: 25, hl: [22], file: 'flowing_led.ino', right: '第 16–25 行', notes: [
      { line: 22, text: 'LOW：点亮这一盏，而且不再熄灭' },
      { line: 23, text: '等 0.1 秒再点下一盏 → 灯越亮越多' },
    ] });
    codeWithNotes(s, { x: G.L + w + 0.3, y: G.top, w, h, size, code: LED_CODE, from: 27, to: 36, hl: [33], file: 'flowing_led.ino', right: '第 27–36 行', notes: [
      { line: 33, text: 'HIGH：熄灭这一盏' },
      { line: 34, text: '等 0.1 秒再关下一盏 → 灯越来越少' },
    ] });
  }

  // ================================================================ code 3/3 (setup + loop)
  s = slide({
    title: '代码逐行看懂（3/3）：setup() 和 loop()',
    desc: 'setup() 开机只做一次准备；loop() 按顺序调用三个函数，一遍又一遍地重复',
    notes: 'setup() 像上课前摆好桌椅，只做一次：把 8 个引脚设成输出，并先输出 HIGH 让灯全灭。Serial.begin(115200) 打开了串口，loop() 每轮会发一句 start flash led !，要看的话串口监视器选 115200。loop() 里三行函数调用就是整个流水灯的流程，读起来像说话——这就是自定义函数的好处。',
  });
  {
    const lw = 4.6, rw = G.cw - 0.3 - lw;
    const size = Math.min(fitCodeSize(LED_CODE, 37, 46, lw, 2.75), fitCodeSize(LED_CODE, 48, 54, rw, 2.0));
    codeWithNotes(s, { x: G.L, y: G.top, w: lw, h: 2.75, size, code: LED_CODE, from: 37, to: 46, hl: [40, 43, 44], file: 'flowing_led.ino', right: '第 37–46 行 · 只做一次', notes: [
      { line: 40, text: '打开串口（速度 115200），给第 50 行用' },
      { line: [43, 44], text: '8 个引脚设为输出，先输出 HIGH → 全部熄灭' },
    ] });
    codeWithNotes(s, { x: G.L + lw + 0.3, y: G.top, w: rw, h: 2.0, size, code: LED_CODE, from: 48, to: 54, hl: [51, 52, 53], file: 'flowing_led.ino', right: '第 48–54 行 · 反复执行', notes: [
      { line: 50, text: '串口发一句 start flash led !' },
      { line: [51, 53], text: '单灯跑 → 逐个熄灭 → 逐个点亮' },
      { tag: '然后', text: '回到 loop() 开头，再来一遍' },
    ] });
  }

  // ================================================================ think: real behaviour
  s = slide({
    title: '想一想：实际跑起来是什么样',
    desc: '第一轮是“单灯跑”，从第二轮起变成“逐个熄灭”——因为上一轮结束时灯已经全亮了',
    notes: '先别揭晓答案，让学生根据代码推一推：第一轮结束时灯是什么状态？（全亮）第二轮 led_flash() 把每盏灯“拉低再拉高”，原本亮着的灯就被逐个关掉了，看起来不再是单灯跑。led_turn_off() 执行时灯已经全灭，所以只是停顿 0.8 秒。把 loop() 的顺序换一下，每轮就都能看到单灯跑了。',
  });
  {
    const labW = 1.15, gap = 0.3, cw = (G.cw - labW - gap * 3) / 3;
    const colX = (j) => G.L + labW + gap + j * (cw + gap);
    const fns = ['led_flash()', 'led_turn_off()', 'led_turn_on()'];
    fns.forEach((f, j) => {
      const pw = V.monoW(f, 11) + 0.3;
      V.pill(s, { x: colX(j) + (cw - pw) / 2, y: G.top, w: pw, h: 0.3, text: f, size: 11, fill: P.ink, color: P.white, mono: true });
    });
    const rows = [
      { y: 1.83, t: '第 1 轮', sub: '灯从全灭开始', cells: [
        { on: (k) => k === 3, d: '一盏灯从 2 号跑到 9 号' },
        { on: () => false, d: '已经全灭，只停顿 0.8 秒' },
        { on: (k) => k <= 3, d: '一盏接一盏点亮，最后全亮' },
      ] },
      { y: 3.08, t: '第 2 轮起', sub: '灯从全亮开始', cells: [
        { on: (k) => k > 3, d: '从 2 号到 9 号\n变成逐个熄灭！', hl: true },
        { on: () => false, d: '又停顿 0.8 秒' },
        { on: (k) => k <= 3, d: '再逐个点亮……如此循环' },
      ] },
    ];
    const rh = 0.95;
    for (const r of rows) {
      txt(s, r.t, { x: G.L, y: r.y + 0.14, w: labW, h: 0.3, size: 14, bold: true, valign: 'middle' });
      txt(s, r.sub, { x: G.L, y: r.y + 0.46, w: labW, h: 0.24, size: 10.5, color: P.muted, valign: 'middle' });
      r.cells.forEach((c, j) => {
        const x = colX(j);
        V.card(s, { x, y: r.y, w: cw, h: rh, fill: c.hl ? P.turqPale : P.card, line: c.hl ? P.turqDeep : undefined, lineW: 1 });
        lampRow(s, x + 0.15, r.y + 0.24, cw - 0.3, 0.15, c.on);
        txt(s, c.d, { x: x + 0.15, y: r.y + 0.44, w: cw - 0.3, h: 0.44, size: 12 });
      });
    }
    const ty = 3.08 + rh + 0.3, th = G.bottom - ty;
    V.card(s, { x: G.L, y: ty, w: G.cw, h: th, fill: P.turqPale });
    V.iconCircle(s, I.exchange, { x: G.L + 0.18, y: ty + (th - 0.38) / 2, d: 0.38 });
    txt(s, '想每轮都看到单灯跑？\n把 loop() 里的顺序换成：', { x: G.L + 0.7, y: ty, w: 3.6, h: th, size: 12.5, bold: true, valign: 'middle' });
    miniCode(s, 'led_flash(); led_turn_on(); led_turn_off();', { x: 4.6, y: ty + (th - 0.38) / 2, w: G.R - 0.18 - 4.6, h: 0.38, size: 11.5 });
  }

  // ================================================================ result
  s = slide({
    title: '实验结果：8 盏灯接力闪亮',
    desc: '上传程序后，灯一盏接一盏亮起又熄灭；改一改 flash_speed，“水流”就会变快或变慢',
    notes: '原指南的结果照片里用了黄、红两种颜色的 LED，效果更好看。原指南最后半开玩笑地建议“做一个心形流水灯”，可以作为课后小挑战：同样的 8 个引脚，换一种摆法就是新作品——这正是工业设计同学的强项。右边三个小改动建议当堂试，每次只改一处。',
  });
  {
    V.imageBox(s, { file: 'l13/flow_result_photo.jpg', x: G.L, y: G.top, w: 5.4, h: G.ch, caption: '原指南实物照片：8 个 LED 接 UNO' });
    const rx = 6.15, rw = G.R - rx;
    V.tip(s, { x: rx, y: G.top, w: rw, h: 1.15, kind: 'note', title: '小挑战：心形流水灯', text: '原指南的彩蛋：把 LED 摆成心形，做一盏送给重要的人。', size: 12 }, I.heart);
    const cy = G.top + 1.15 + 0.3, chh = G.bottom - cy;
    V.card(s, { x: rx, y: cy, w: rw, h: chh });
    txt(s, '动手改一改', { x: rx + 0.2, y: cy + 0.12, w: 2, h: 0.28, size: 13, bold: true, valign: 'middle' });
    const mods = [
      [R('flash_speed', { fontFace: V.MONO, bold: true }), R(' 改成 300 慢慢流\n改成 5 快到像全亮')],
      [R('数组倒过来写成 '), R('{9,8,…,2}', { fontFace: V.MONO, bold: true }), R('\n水流方向就反过来')],
      [R('换 '), R('loop()', { fontFace: V.MONO, bold: true }), R(' 里的顺序\n每轮都有单灯跑')],
    ];
    mods.forEach((runs, i) => {
      const yy = cy + 0.48 + i * 0.56;
      V.numCircle(s, i + 1, { x: rx + 0.2, y: yy + 0.04, d: 0.3, size: 11 });
      V.text(s, runs, { x: rx + 0.62, y: yy, w: rw - 0.8, h: 0.5, size: 12 });
    });
    if (cy + 0.48 + 3 * 0.56 > G.bottom + 0.02) warn('result mods overflow');
  }
}

// ================================================================ 实验 04　蜂鸣器模块
function buildBuzzer({ deck, I, slide }) {
  let s;
  // ================================================================ divider: experiment 4
  deck.section('实验四　蜂鸣器');
  deck.divider({
    kicker: '实验 04',
    title: '蜂鸣器模块实验',
    desc: 'LED 管“光”，蜂鸣器管“声”。还是用 digitalWrite()：先让有源蜂鸣器“滴滴”响，再让无源蜂鸣器唱出两种音调——频率对上乐谱，就能演奏音乐。',
    tiles: [
      { fill: P.turq, big: '01', title: '认识', sub: '有源 vs 无源', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: 'S → 9 号脚', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: '开关的快慢 = 音调', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '听出两种声音', subSize: 12 },
    ],
    notes: '实验四换成“声音”。先认清两种蜂鸣器的区别，接线只有三根线，两种蜂鸣器接法一样。重点是理解：声音就是很快的开关，开关越快音调越高。教室里同时响会很吵，可以让各组轮流测试。',
  });

  // ================================================================ active vs passive
  s = slide({
    title: '认识蜂鸣器：有源和无源',
    desc: '“源”指的是内部振荡器，不是电源——有源通电就响，无源要 Arduino 替它打拍子',
    notes: '“有源”“无源”最容易被误解成有没有电源，其实指的是有没有内部振荡器。有源蜂鸣器像带节拍器的音乐盒，一通电就按固定音调响；无源蜂鸣器像一面鼓，要有人按节奏敲它才响，敲得快慢不同，音调就不同。两种模块都有三根针：信号、电源、地。',
  });
  {
    const labW = 1.75, cw = (G.cw - labW) / 2;
    const c1 = G.L + labW, c2 = c1 + cw;
    const ih = 1.6, iw = cw - 0.5;
    V.imageBox(s, { file: 'l13/buzzer_active_module.jpg', x: c1 + 0.25, y: G.top, w: iw, h: ih, diagram: true });
    V.imageBox(s, { file: 'l13/buzzer_passive_module.jpg', x: c2 + 0.25, y: G.top, w: iw, h: ih, diagram: true });
    {
      const tw = labW - 0.3;
      s.addShape('rect', { x: G.L, y: G.top, w: tw, h: ih, fill: { color: P.ink }, line: { color: P.ink, width: 0 } });
      V.text(s, '“源”', { x: G.L + 0.16, y: G.top + 0.14, w: tw - 0.2, h: 0.5, size: 24, bold: true, color: P.turq, valign: 'middle' });
      txt(s, '= 振荡器', { x: G.L + 0.16, y: G.top + 0.8, w: tw - 0.2, h: 0.3, size: 14, bold: true, color: P.white, valign: 'middle' });
      txt(s, '不是电源', { x: G.L + 0.16, y: G.top + 1.12, w: tw - 0.2, h: 0.26, size: 12, color: 'D0D0D0', valign: 'middle' });
    }
    const ty = G.top + ih + 0.3, rowH = 0.29;
    const rows = [
      ['', '有源蜂鸣器（黑色）', '无源蜂鸣器（蓝色）'],
      ['内部振荡器', '有', '没有'],
      ['通电以后', '直接响', '不响，要喂 2～5 kHz 方波'],
      ['音调', '固定一种', '随频率变化，能“唱歌”'],
      ['程序怎么写', 'HIGH 响，LOW 停', '快速来回切换 HIGH / LOW'],
      ['三根针', 'S · V · G', 'I/O · VCC · GND'],
    ];
    V.table(s, rows, { x: G.L, y: ty, w: G.cw, colW: [labW, cw, cw], rowH, size: 12, boldCols: [0], align: ['left', 'center', 'center'] });
    if (ty + rowH * rows.length > G.bottom + 0.02) warn('buzzer table overflow');
  }

  // ================================================================ wiring + parts
  s = slide({
    title: '接线：S 接 9 号脚，两种蜂鸣器接法一样',
    desc: 'V 接 5V、G 接 GND、S 接 9 号脚——测完有源蜂鸣器，换上无源的，线一根都不用动',
    notes: '只有三根线：红线 5V 接 V，黑线 GND 接 G，黄线 9 号脚接 S。原指南表格里写的 VCC 就是 UNO 上的 5V。无源模块上印的是 VCC、I/O、GND，对应关系一样。对照下面的组件清单检查一遍再通电。',
  });
  {
    V.imageBox(s, { file: 'l13/buzzer_wiring.jpg', x: G.L, y: G.top, w: 5.75, h: 2.85, diagram: true, caption: '原指南接线图：黄线 9 → S · 红线 5V → V · 黑线 GND → G' });
    const rx = 6.5, rw = G.R - rx;
    V.wiring(s, { x: rx, y: G.top, w: rw, right: '蜂鸣器模块', rows: [['5V（VCC）', 'V'], ['GND', 'G'], ['9', 'S']], rowH: 0.32, colW: [rw * 0.55, rw * 0.45] });
    const ty = G.top + 0.32 * 4 + 0.3;
    V.tip(s, { x: rx, y: ty, w: rw, h: G.top + 2.85 - ty, kind: 'note', title: '接法完全一样', text: '三根针：信号、电源、地\n换模块，线不用动', size: 12 }, I.plug);
    const sy = G.top + 2.85 + 0.3, sh = G.bottom - sy;
    V.card(s, { x: G.L, y: sy, w: G.cw, h: sh });
    txt(s, '组件清单', { x: G.L + 0.18, y: sy, w: 0.9, h: sh, size: 12.5, bold: true, valign: 'middle' });
    const parts = ['Arduino UNO 主板', '面包板', 'USB 数据线', '有源蜂鸣器模块 ×1', '无源蜂鸣器模块 ×1', '若干跳线'];
    let px = G.L + 1.12;
    const ph = 0.3;
    for (const p of parts) {
      const pw = V.textW(p, 11) + 0.22;
      V.pill(s, { x: px, y: sy + (sh - ph) / 2, w: pw, h: ph, text: p, size: 11, fill: P.white, line: P.gray2, color: P.ink, bold: false });
      px += pw + 0.08;
    }
    if (px - 0.08 > G.R - 0.15) warn(`parts strip overflow ${px.toFixed(2)}`);
  }

  // ================================================================ active buzzer code
  s = slide({
    title: '有源蜂鸣器代码：让它“滴——滴——”',
    desc: '9 号脚输出 HIGH 就响，输出 LOW 就停，各持续 1 秒，然后不停循环',
    notes: '这段程序和最早的 Blink 闪灯几乎一模一样，只是把灯换成了蜂鸣器。有源蜂鸣器里有振荡器，所以给 HIGH 就能响。第 1 行用变量 buzzer 代替数字 9，以后换引脚只改这一处。',
  });
  {
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: 5.4, h: G.ch, code: ACTIVE_CODE, hl: [1, 5, 9, 10, 11, 12], file: 'active_buzzer.ino', right: '共 13 行' });
    V.explain(s, b, { x: 6.15, w: G.R - 6.15, title: '逐行看懂', maxY: G.bottom, gap: 0.1, items: [
      { line: 1, text: '给 9 号脚起名 buzzer\n以后换引脚只改这里' },
      { line: 5, text: '设为输出：Arduino 来发号施令' },
      { line: [9, 10], text: '输出 HIGH：通电就响\n持续 1 秒（1000 毫秒）' },
      { line: [11, 12], text: '输出 LOW：声音停\n安静 1 秒后 loop() 从头再来' },
    ] });
  }

  // ================================================================ active buzzer result
  s = slide({
    title: '有源蜂鸣器结果：只有一种音调的“滴滴”声',
    desc: '有源蜂鸣器只能发出一个固定频率的声音——程序能控制的只是“响多久、停多久”',
    notes: '上传后能听到“滴——滴——”，每声 1 秒。照片里模块上的红灯是电源指示灯。让学生思考：既然音调固定，有源蜂鸣器适合做什么？（报警、提示音、倒计时）想要旋律，就得用无源蜂鸣器。',
  });
  {
    V.imageBox(s, { file: 'l13/buzzer_active_photo.jpg', x: G.L, y: G.top, w: 4.9, h: G.ch, caption: '原指南实物照片：有源蜂鸣器模块接 UNO' });
    const rx = 5.7, rw = G.R - rx;
    V.tip(s, { x: rx, y: G.top, w: rw, h: 0.95, kind: 'note', title: '原指南结论', text: '有源蜂鸣器发出只有一个频率的“滴滴”声。', size: 12 }, I.headphones);
    const cy = G.top + 0.95 + 0.3, chh = 1.15;
    V.card(s, { x: rx, y: cy, w: rw, h: chh });
    txt(s, '一个循环 = 2 秒', { x: rx + 0.2, y: cy + 0.1, w: rw - 0.4, h: 0.28, size: 13, bold: true, valign: 'middle' });
    const bx = rx + 0.2, bw = rw - 0.4, segW = bw / 2, by = cy + 0.44;
    s.addShape('rect', { x: bx, y: by, w: segW, h: 0.36, fill: { color: P.turq }, line: { color: P.turq, width: 0 } });
    s.addShape('rect', { x: bx + segW, y: by, w: segW, h: 0.36, fill: { color: P.white }, line: { color: P.gray2, width: 0.75 } });
    V.text(s, 'HIGH · 响', { x: bx, y: by, w: segW, h: 0.36, size: 12, bold: true, align: 'center', valign: 'middle' });
    V.text(s, 'LOW · 停', { x: bx + segW, y: by, w: segW, h: 0.36, size: 12, bold: true, align: 'center', valign: 'middle' });
    V.text(s, '1 秒', { x: bx, y: by + 0.4, w: segW, h: 0.22, size: 10, color: P.muted, align: 'center', valign: 'middle' });
    V.text(s, '1 秒', { x: bx + segW, y: by + 0.4, w: segW, h: 0.22, size: 10, color: P.muted, align: 'center', valign: 'middle' });
    const ty = cy + chh + 0.3;
    V.tip(s, { x: rx, y: ty, w: rw, h: G.bottom - ty, kind: 'tip', text: '试一试：两个 delay 都改成 200，\n变成急促的“嘀嘀嘀”，像倒车雷达。', size: 12 }, I.pencil);
  }

  // ================================================================ sound principle
  s = slide({
    title: '声音的原理：开关越快，音调越高',
    desc: '每秒“开-关”多少次就叫频率，单位赫兹（Hz）——像拨动桌边的钢尺，振得越快，音调越高',
    notes: '无源蜂鸣器里有一片薄膜，每给一次高电平就被吸一下，变低又弹回，一开一关就振动一次，每秒振动的次数就是频率。可以联系初中物理拨钢尺的实验：钢尺振得越快，音调越高。左图按真实比例画：同样 8 毫秒，上面只开关 2 次，下面开关 8 次。频率 = 1000 ÷ 周期（毫秒），用这个式子就能算出程序注释里的 250 Hz 和 1 kHz。',
  });
  {
    const lx = G.L, lw = 5.55;
    V.card(s, { x: lx, y: G.top, w: lw, h: G.ch });
    txt(s, '同样 8 毫秒里，开关的快慢不同', { x: lx + 0.2, y: G.top + 0.12, w: lw - 0.4, h: 0.3, size: 13, bold: true, valign: 'middle' });
    const x0 = lx + 0.85, x1 = lx + lw - 0.3, msW = (x1 - x0) / 8;
    const wave = (hi, lo, half) => {
      const pts = [[x0, lo], [x0, hi]];
      let t = 0, high = true;
      while (t < 8 - 1e-6) {
        const t2 = t + half;
        const yv = high ? hi : lo;
        pts.push([x0 + t2 * msW, yv]);
        if (t2 < 8 - 1e-6) pts.push([x0 + t2 * msW, high ? lo : hi]);
        t = t2; high = !high;
      }
      polyline(s, pts, { color: P.ink, width: 1.75 });
      V.text(s, 'HIGH', { x: lx + 0.18, y: hi - 0.1, w: 0.6, h: 0.2, size: 9.5, mono: true, color: P.muted, valign: 'middle' });
      V.text(s, 'LOW', { x: lx + 0.18, y: lo - 0.1, w: 0.6, h: 0.2, size: 9.5, mono: true, color: P.muted, valign: 'middle' });
    };
    V.text(s, [R('高 2 ms + 低 2 ms = 周期 4 ms → '), R('250 Hz', { bold: true }), R('（低沉）')], { x: lx + 0.2, y: G.top + 0.5, w: lw - 0.4, h: 0.28, size: 12, valign: 'middle' });
    wave(G.top + 0.95, G.top + 1.45, 2);
    V.text(s, [R('高 0.5 ms + 低 0.5 ms = 周期 1 ms → '), R('1000 Hz', { bold: true }), R('（尖细）')], { x: lx + 0.2, y: G.top + 1.7, w: lw - 0.4, h: 0.28, size: 12, valign: 'middle' });
    wave(G.top + 2.15, G.top + 2.65, 0.5);
    const ay = G.top + 2.85;
    V.arrow(s, x0, ay, x1 + 0.12, ay, { color: P.muted, width: 1 });
    for (let t = 0; t <= 8; t += 2) {
      V.text(s, t === 8 ? '8 ms' : String(t), { x: x0 + t * msW - 0.3, y: ay + 0.05, w: 0.6, h: 0.2, size: 10, color: P.muted, align: 'center', valign: 'middle' });
    }
    txt(s, '开关越快 → 周期越短 → 频率越高 → 音调越尖', { x: lx + 0.2, y: G.top + 3.25, w: lw - 0.4, h: 0.28, size: 12, bold: true, valign: 'middle' });
    // right column
    const rx = lx + lw + 0.3, rw = G.R - rx, fh = 1.25;
    V.card(s, { x: rx, y: G.top, w: rw, h: fh, fill: P.turqPale });
    V.formula(s, { x: rx + 0.15, y: G.top + 0.1, h: 1.05, lhs: '频率 =', num: '1000', den: '周期（毫秒）', rhs: 'Hz', size: 16 });
    const ex = [
      { t: '周期 4 ms', v: '1000 ÷ 4 = 250 Hz' },
      { t: '周期 1 ms', v: '1000 ÷ 1 = 1000 Hz' },
    ];
    const eh = (G.ch - fh - 0.6) / 2;
    ex.forEach((e, i) => {
      const ey = G.top + fh + 0.3 + i * (eh + 0.3);
      V.card(s, { x: rx, y: ey, w: rw, h: eh });
      txt(s, e.t, { x: rx + 0.2, y: ey + 0.12, w: rw - 0.4, h: 0.26, size: 12, color: P.muted, valign: 'middle' });
      txt(s, e.v, { x: rx + 0.2, y: ey + 0.42, w: rw - 0.4, h: 0.36, size: 16, bold: true, valign: 'middle' });
    });
  }

  // ================================================================ passive buzzer code 1/2
  s = slide({
    title: '无源蜂鸣器代码（1/2）：frequence_1() 想发 1 kHz',
    desc: '无源蜂鸣器要靠程序“打拍子”：开 0.5 毫秒、关 0.5 毫秒，重复 800 次',
    notes: '和有源蜂鸣器不同，这里要自己用 for 循环快速开关。每一圈“开一下、关一下”就是一个周期，800 圈就是 800 个周期，次数决定响多久。注释写的是 1k HZ，想法是对的：0.5 + 0.5 = 1 毫秒一个周期。但 delay(0.5) 有个坑，下下页专门讲。',
  });
  {
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: 5.5, h: G.ch, code: PASSIVE_CODE, from: 1, to: 13, hl: [1, 2, 3, 6, 8, 9, 10, 11], file: 'buzzer.ino', right: '第 1–13 行' });
    V.explain(s, b, { x: 6.25, w: G.R - 6.25, title: '逐行看懂', maxY: G.bottom, gap: 0.08, items: [
      { line: [1, 2], text: '蜂鸣器还是接 9 号脚\n第 2 行被注释掉，不起作用' },
      { line: 3, text: '高音函数，注释说要发 1 kHz' },
      { line: 6, text: '重复 800 次“开-关”\n次数决定响多久' },
      { line: [8, 11], text: '开 0.5 + 关 0.5 毫秒\n= 周期 1 毫秒（1 kHz）\n注意：delay(0.5) 有坑！' },
    ] });
  }

  // ================================================================ passive buzzer code 2/2
  s = slide({
    title: '无源蜂鸣器代码（2/2）：低音函数和主程序',
    desc: 'frequence_2() 开 2 毫秒、关 2 毫秒，音调更低；loop() 让两种音调轮流播放',
    notes: 'frequence_2() 和 frequence_1() 结构完全一样，只是每次等 2 毫秒，所以周期 4 毫秒、频率 250 Hz，800 个周期大约 3.2 秒。loop() 先放高音、停 1 秒，再放低音、停 1 秒，周而复始。可以让学生算算：一轮大约多长时间？',
  });
  {
    const w = 5.0, w2 = G.cw - 0.3 - w, h = 2.75;
    const size = Math.min(fitCodeSize(PASSIVE_CODE, 15, 25, w, h), fitCodeSize(PASSIVE_CODE, 26, 36, w2, h));
    codeWithNotes(s, { x: G.L, y: G.top, w, h, size, code: PASSIVE_CODE, from: 15, to: 25, hl: [15, 21, 23], file: 'buzzer.ino', right: '第 15–25 行', notes: [
      { line: 15, text: '低音函数，注释写 250 Hz' },
      { line: [21, 23], text: '周期 4 毫秒 → 250 Hz，约响 3.2 秒' },
    ] });
    codeWithNotes(s, { x: G.L + w + 0.3, y: G.top, w: w2, h, size, code: PASSIVE_CODE, from: 26, to: 36, hl: [28, 32, 33, 34, 35], file: 'buzzer.ino', right: '第 26–36 行', notes: [
      { line: 28, text: '9 号脚设为输出' },
      { line: [32, 35], text: '高音 → 停 1 秒 → 低音 → 停 1 秒' },
    ] });
  }

  // ================================================================ pitfall: delay(0.5)
  s = slide({
    title: '小心：delay(0.5) 其实是 delay(0)',
    desc: 'delay() 只认整数毫秒，0.5 会被直接砍成 0——frequence_1() 几乎不等待，基本听不到',
    notes: '这是原指南程序里的一个真实 bug，正好用来讲“单位”。delay() 的参数是整数毫秒，写 0.5 会被截成 0，所以 frequence_1() 的 800 次开关一眨眼就做完了，频率远远超过 1 kHz，人耳基本听不到。改成 delayMicroseconds(500)，每次等 500 微秒，也就是 0.5 毫秒，才能得到真正的 1 kHz。',
  });
  {
    const cw = (G.cw - 0.3) / 2, ch = 2.25, y = G.top;
    // bad
    V.card(s, { x: G.L, y, w: cw, h: ch, fill: P.white, line: P.red, lineW: 1.25 });
    V.iconCircle(s, I.times_w, { x: G.L + 0.2, y: y + 0.18, d: 0.4, fill: P.red });
    txt(s, '原指南写法', { x: G.L + 0.74, y: y + 0.18, w: 2.5, h: 0.4, size: 15, bold: true, color: P.red, valign: 'middle' });
    miniCode(s, 'delay(0.5);   // 被截成 delay(0)', { x: G.L + 0.2, y: y + 0.74, w: cw - 0.4, size: 12 });
    txt(s, 'delay() 只收整数毫秒：0.5 变成 0，\n几乎不等待。800 次开关一眨眼就做完，\n频率远高于 1 kHz，人耳基本听不到。', { x: G.L + 0.2, y: y + 1.3, w: cw - 0.4, h: 1.0, size: 12 });
    // good
    const rx = G.L + cw + 0.3;
    V.card(s, { x: rx, y, w: cw, h: ch, fill: P.turqPale });
    V.iconCircle(s, I.check, { x: rx + 0.2, y: y + 0.18, d: 0.4 });
    txt(s, '改成这样', { x: rx + 0.74, y: y + 0.18, w: 2.5, h: 0.4, size: 15, bold: true, valign: 'middle' });
    miniCode(s, 'delayMicroseconds(500);  // 0.5 毫秒', { x: rx + 0.2, y: y + 0.74, w: cw - 0.4, size: 12 });
    txt(s, 'delayMicroseconds() 按微秒计时：\n500 微秒 = 0.5 毫秒。开 0.5 + 关 0.5\n= 1 毫秒 → 正好 1 kHz，800 次约 0.8 秒。', { x: rx + 0.2, y: y + 1.3, w: cw - 0.4, h: 1.0, size: 12 });
    // unit ladder
    const uy = y + ch + 0.3, uh = G.bottom - uy, uw = 2.6, ugap = (G.cw - 3 * uw) / 2;
    const units = [
      { big: '1 秒', sub: '' },
      { big: '1000 毫秒', sub: 'delay() 的单位' },
      { big: '1000000 微秒', sub: 'delayMicroseconds() 的单位' },
    ];
    units.forEach((u, i) => {
      const ux = G.L + i * (uw + ugap);
      V.card(s, { x: ux, y: uy, w: uw, h: uh, fill: i === 0 ? P.ink : P.card });
      txt(s, u.big, { x: ux + 0.15, y: uy + (u.sub ? 0.1 : (uh - 0.4) / 2), w: uw - 0.3, h: 0.4, size: 17, bold: true, color: i === 0 ? P.turq : P.ink, align: 'center', valign: 'middle' });
      if (u.sub) txt(s, u.sub, { x: ux + 0.15, y: uy + 0.5, w: uw - 0.3, h: 0.24, size: 10.5, color: P.muted, align: 'center', valign: 'middle', mono: false });
      if (i < 2) V.text(s, '=', { x: ux + uw, y: uy, w: ugap, h: uh, size: 20, bold: true, align: 'center', valign: 'middle' });
    });
  }

  // ================================================================ passive buzzer result
  s = slide({
    title: '无源蜂鸣器结果：两种不同的蜂鸣声',
    desc: '接线不变，把有源蜂鸣器换成无源蜂鸣器，就能听到两种频率不一样的声音',
    notes: '原指南的照片里用的是一只单独的无源蜂鸣器，直接插在面包板上，再用跳线连到 UNO。原指南说能听到两种频率；实际上要把 delay(0.5) 改成 delayMicroseconds(500)，1 kHz 那一段才明显。可以让学生对比改之前和改之后，用耳朵验证上一页的结论。',
  });
  {
    V.imageBox(s, { file: 'l13/buzzer_passive_photo.jpg', x: G.L, y: G.top, w: 2.75, h: G.ch, caption: '原指南实物照片' });
    const rx = G.L + 2.75 + 0.3, rw = G.R - rx;
    V.tip(s, { x: rx, y: G.top, w: rw, h: 1.1, kind: 'note', title: '原指南结论', text: '接线不变，直接用无源蜂鸣器替换有源蜂鸣器；无源蜂鸣器没有正负极之分；可以听到两个频率不一样的蜂鸣声。', size: 12 }, I.headphones);
    const cy = G.top + 1.1 + 0.3, chh = 1.15;
    V.card(s, { x: rx, y: cy, w: rw, h: chh });
    txt(s, '一轮大约 6 秒（改用 delayMicroseconds 之后）', { x: rx + 0.2, y: cy + 0.1, w: rw - 0.4, h: 0.28, size: 13, bold: true, valign: 'middle' });
    const bx = rx + 0.2, bw = rw - 0.4, per = bw / 6;
    const segs = [
      { d: 0.8, t: '1 kHz', fill: P.turq, col: P.ink, lab: '0.8 秒' },
      { d: 1, t: '停', fill: P.white, col: P.muted, lab: '1 秒' },
      { d: 3.2, t: '250 Hz', fill: P.ink, col: P.white, lab: '3.2 秒' },
      { d: 1, t: '停', fill: P.white, col: P.muted, lab: '1 秒' },
    ];
    let sx = bx;
    const sy = cy + 0.46;
    for (const g of segs) {
      const w = g.d * per;
      s.addShape('rect', { x: sx, y: sy, w, h: 0.38, fill: { color: g.fill }, line: { color: g.fill === P.white ? P.gray2 : g.fill, width: 0.75 } });
      V.text(s, g.t, { x: sx, y: sy, w, h: 0.38, size: 11, bold: true, color: g.col, align: 'center', valign: 'middle' });
      V.text(s, g.lab, { x: sx, y: sy + 0.42, w, h: 0.22, size: 10, color: P.muted, align: 'center', valign: 'middle' });
      sx += w;
    }
    const ty = cy + chh + 0.3;
    V.tip(s, { x: rx, y: ty, w: rw, h: G.bottom - ty, kind: 'tip', text: '对比听一听：保留原来的 delay(0.5)，第一段几乎听不到，\n只剩低沉的 250 Hz。', size: 12 }, I.eye);
  }

  // ================================================================ modify
  s = slide({
    title: '动手改一改：做一个会变调的蜂鸣器',
    desc: '每次只改一个数字，上传后听一听——耳朵就是最好的“测量仪器”',
    notes: '四个小任务由易到难，建议每组至少完成前两个。第 3 个把流水灯和蜂鸣器结合起来：流水灯已经占用了 D2～D9，蜂鸣器必须换一个引脚，这时就体会到用变量 buzzer 的好处。第 4 个是以后会用到的 tone() 函数，它在后台帮我们生成方波，不用自己写循环。',
  });
  {
    const cw = (G.cw - 0.3) / 2, ch = (G.ch - 0.3) / 2;
    const cards = [
      { t: '音调变高', code: 'delay(1);   // 原来是 delay(2)', d: '低音函数里两个 delay(2) 都改成 delay(1)：\n周期 2 毫秒 → 500 Hz，音调升高' },
      { t: '响得更久', code: 'for(i=0;i<1600;i++)', d: '低音函数的 800 次改成 1600 次：\n响的时间翻倍，3.2 秒 → 6.4 秒' },
      { t: '声光联动', code: 'int buzzer = 10;', d: '流水灯占了 D2～D9，蜂鸣器改接 10 号脚：\n程序里只改这一行，不用到处找 9' },
      { t: '进阶预告：tone()', code: 'tone(buzzer, 262, 500);', d: 'Arduino 自带的发声函数：\n262 Hz（中音 do）响 500 毫秒' },
    ];
    cards.forEach((c, i) => {
      const x = G.L + (i % 2) * (cw + 0.3), y = G.top + Math.floor(i / 2) * (ch + 0.3);
      V.card(s, { x, y, w: cw, h: ch, fill: i === 3 ? P.turqPale : P.card });
      V.numCircle(s, i + 1, { x: x + 0.2, y: y + 0.15, d: 0.36, size: 12 });
      txt(s, c.t, { x: x + 0.68, y: y + 0.15, w: cw - 0.9, h: 0.36, size: 14, bold: true, valign: 'middle' });
      miniCode(s, c.code, { x: x + 0.2, y: y + 0.62, w: cw - 0.4, size: 11.5 });
      txt(s, c.d, { x: x + 0.2, y: y + 1.04, w: cw - 0.4, h: ch - 1.1, size: 12 });
    });
  }
}

// ================================================================ 实验 05　小磁簧开关模块
function buildReed({ deck, I, slide }) {
  // These slides keep the slightly looser spacing they were drawn with (see LOOSE).
  const { miniCode, iconCard, compCard, lead, serialMock } = LOOSE;
  let s;
  // ================================================================ divider: experiment 5 (the old 2-1 deck had none)
  deck.section('实验五　小磁簧开关');
  deck.divider({
    kicker: '实验 05',
    title: '小磁簧开关模块实验',
    desc: '用一块磁铁当“钥匙”：磁铁靠近，灯亮、蜂鸣器响；磁铁拿开，全部停下。新学 digitalRead() 读开关的 0 / 1，再用 if / else 做判断。',
    tiles: [
      { fill: P.turq, big: '01', title: '认识元件', sub: '磁铁靠近就接通', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: '三个模块 · 三张接线表', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: 'digitalRead + if / else', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '看灯、听声、读串口', subSize: 12 },
    ],
    notes: '实验五是本节最后一个实验，把前面的“读进来”和“送出去”连在一起：磁簧开关是输入，LED 和蜂鸣器是输出。开场可以拿出一块磁铁和模块现场演示——磁铁一靠近，灯亮、蜂鸣器响，然后问学生：它是怎么“知道”磁铁来了的？带着这个问题往下学。',
  });

  // ================================================================ what is a reed switch
  s = slide({
    title: '认识小磁簧开关',
    desc: '磁簧开关是一个用磁铁“隔空按”的开关：磁铁靠近就接通，磁铁拿开就断开',
    notes: '可以把模块传下去，让学生看清玻璃管里的两片簧片。重点讲“常开”：平时断开，磁铁靠近才接通。原指南提到的惰性气体和铑、钌镀层属于小知识，知道它们让开关更耐用就够了。提醒：玻璃管很脆，不要用力掰它的引线。',
  });
  {
    const lw = 5.2;
    let y = lead(s, '和按键开关是亲戚', '普通按键要用手指按下去才接通；磁簧开关不用碰它，磁铁一靠近，它自己就接通了。', { x: G.L, y: G.top, w: lw, size: 13 }) + 0.22;
    y = numList(s, [
      '玻璃管里封着两片铁镍簧片，中间只隔几微米的缝',
      '平时两片簧片不接触，电路断开——这叫“常开”',
      '磁铁靠近：簧片被磁化、互相吸住 → 电路接通',
      '磁铁移开：簧片靠自身弹力弹开 → 电路断开',
    ], { x: G.L, y, w: lw, size: 12.5, gap: 0.14 });
    const fy = Math.max(y + 0.3, 4.28);
    V.card(s, { x: G.L, y: fy, w: lw, h: G.bottom - fy, fill: P.turqPale });
    V.iconCircle(s, I.flask, { x: G.L + 0.16, y: fy + (G.bottom - fy - 0.38) / 2, d: 0.38 });
    txt(s, [R('小知识　', { bold: true }), R('管内充有惰性气体（如氮气）；', { breakLine: true }), R('触点镀了很硬的铑、钌，开关次数更多、寿命更长。')],
      { x: G.L + 0.66, y: fy, w: lw - 0.8, h: G.bottom - fy, size: 12, valign: 'middle' });
    if (G.bottom - fy < 0.6) warn('reed facts card too short');
    V.imageBox(s, { file: 'l13/reed_module_photo.jpg', x: 6.0, y: G.top, w: G.R - 6.0, h: G.ch, caption: '小磁簧开关模块：左上方的玻璃管就是磁簧开关' });
  }

  // ================================================================ how it works (drawn)
  s = slide({
    title: '工作过程图解',
    desc: '没有磁铁 → 断开；磁铁靠近 → 吸合接通；磁铁移开 → 弹开断开，全靠磁力和弹力',
    notes: '按从左到右的顺序讲三个状态，可以配合手势：两根手指分开、靠拢、再分开。强调簧片能吸合，是因为它被磁铁磁化了；能弹开，是因为它本身有弹性。最后联系生活：门窗报警、笔记本合盖、自行车码表，都用到“磁铁靠近就触发”的思路。',
  });
  {
    const n = 3, gap = 0.35, cw = (G.cw - gap * (n - 1)) / n, ch = 2.2, y0 = G.top;
    const st = [
      { t: '没有磁铁', closed: false, mag: null, k: '断开', d: '两片簧片之间有缝，\n电流过不去' },
      { t: '磁铁靠近', closed: true, mag: 'near', k: '吸合', d: '簧片被磁化、互相吸住，\n电路接通' },
      { t: '磁铁移开', closed: false, mag: 'away', k: '弹开', d: '簧片靠自身弹力分开，\n电路又断开' },
    ];
    st.forEach((it, i) => {
      const x = G.L + i * (cw + gap);
      V.card(s, { x, y: y0, w: cw, h: ch, fill: it.closed ? P.turqPale : P.card });
      V.numCircle(s, i + 1, { x: x + 0.18, y: y0 + 0.16, d: 0.32, size: 11, fill: it.closed ? P.ink : P.turq, color: it.closed ? P.white : P.ink });
      txt(s, it.t, { x: x + 0.6, y: y0 + 0.16, w: cw - 0.8, h: 0.32, size: 14, bold: true, valign: 'middle' });
      const tw = 1.85, tx = x + (cw - tw) / 2, cy = y0 + 0.86;
      reedTube(s, { x: tx, w: tw, cy, closed: it.closed });
      const mw = 1.1, mh = 0.27, my = y0 + 1.2;
      if (it.mag === 'near') magnet(s, x + (cw - mw) / 2, my, mw, mh, false);
      if (it.mag === 'away') {
        magnet(s, x + cw - mw - 0.2, my + 0.06, mw, mh, true);
        V.arrow(s, x + cw / 2 - 0.55, my + 0.195, x + cw - mw - 0.3, my + 0.195, { color: P.muted, width: 1.25 });
      }
      txt(s, [R(it.k + '：', { bold: true }), R(it.d)], { x: x + 0.18, y: y0 + 1.62, w: cw - 0.3, h: 0.5, size: 12 });
      if (i < n - 1) V.arrow(s, x + cw + 0.06, cy, x + cw + gap - 0.06, cy, { color: P.muted, width: 1.5 });
    });
    const ay = y0 + ch + 0.3;
    txt(s, '生活里的磁簧开关', { x: G.L, y: ay, w: 4, h: 0.28, size: 13, bold: true, valign: 'middle' });
    const apps = [
      [I.door, '门窗报警', '开门时磁铁离开 → 报警'],
      [I.laptop, '合盖检测', '盖里的磁铁靠近 → 熄屏'],
      [I.bike, '自行车码表', '轮上磁铁转一圈 → 计一次'],
    ];
    const by = ay + 0.38, bh = G.bottom - by;
    apps.forEach(([ic, t, d], i) => {
      const x = G.L + i * (cw + gap);
      V.card(s, { x, y: by, w: cw, h: bh });
      V.iconCircle(s, ic, { x: x + 0.16, y: by + (bh - 0.42) / 2, d: 0.42 });
      txt(s, [R(t, { bold: true, breakLine: true }), R(d, { color: P.muted })], { x: x + 0.7, y: by, w: cw - 0.82, h: bh, size: 12, valign: 'middle' });
    });
  }

  // ================================================================ purpose + principle
  s = slide({
    title: '实验目的与实验原理',
    desc: '用磁铁去“按”磁簧开关，让 Arduino 读到开关状态，再控制 LED 和蜂鸣器',
    notes: '实验目的照原指南念即可。下方的信号链是这个实验的主线：磁铁 → 簧片 → 读数 → 输出，后面的代码就是把这条链一步步写出来。第三步“读到 0”是关键，下一页专门解释为什么有磁铁时反而读到 0。',
  });
  {
    const w = (G.cw - 0.35) / 2, h = 1.3;
    V.tip(s, { x: G.L, y: G.top, w, h, kind: 'note', title: '实验目的', text: '① 学习磁簧开关的特性和工作原理\n② 使用小磁簧开关控制 LED 灯的亮灭', size: 13 }, I.target);
    V.tip(s, { x: G.L + w + 0.35, y: G.top, w, h, kind: 'tip', title: '实验原理', text: '没有磁铁时，开关处于断开状态；磁铁靠近，磁感线穿过开关使它导通——LED 灯亮起来，蜂鸣器响。', size: 12.5 }, I.book);
    const hy = G.top + h + 0.3;
    txt(s, '从磁铁到蜂鸣器：一条信号链', { x: G.L, y: hy, w: 5, h: 0.28, size: 13, bold: true, valign: 'middle' });
    V.steps(s, {
      x: G.L, y: hy + 0.38, w: G.cw, h: G.bottom - hy - 0.38, focus: 2, subSize: 12, titleSize: 14,
      items: [
        { title: '磁铁靠近', sub: '磁感线穿过\n玻璃管' },
        { title: '簧片吸合', sub: '开关接通，\nOUT 连到 GND' },
        { title: '读到 0', sub: 'digitalRead(12)\n得到 0' },
        { title: '灯亮 + 响', sub: '11、13 号脚\n输出高电平' },
      ],
    });
  }

  // ================================================================ digital input: why 0
  s = slide({
    title: '数字输入：模块只回答 0 或 1',
    desc: '模块里有个上拉电阻：簧片断开时 OUT 是高电平（1），簧片吸合时 OUT 接到 GND（0）',
    notes: '这一页解释“低电平有效”。上拉电阻像一根弹簧，平时把 OUT 往 5V 拉，所以读到 1；簧片一吸合，OUT 直接接到 GND，被“按”到 0V，读到 0。图是原理示意，不要求学生会画电路，只要记住：这个模块有磁铁 = 0，没磁铁 = 1。',
  });
  {
    const pw = 2.25;
    pullupPanel(s, { x: G.L, w: pw, closed: false, title: '① 没有磁铁', result: 'OUT 约 5V → 读到 1' });
    pullupPanel(s, { x: G.L + pw + 0.3, w: pw, closed: true, title: '② 磁铁靠近', result: 'OUT 约 0V → 读到 0', icon: I.magnet });
    const rx = G.L + 2 * pw + 0.65, rw = G.R - rx;
    const y = lead(s, '为什么“有磁铁”反而是 0？', '模块里有一个电阻把 OUT 接到 5V，叫“上拉”。簧片断开时，OUT 被拉成高电平；簧片一吸合，OUT 直接连到 GND，变成低电平。', { x: rx, y: G.top, w: rw, size: 12.5, leadSize: 14 }) + 0.3;
    V.table(s, [
      ['磁铁', '簧片', 'OUT 电平', 'digitalRead'],
      ['远离', '断开', '高（约 5V）', { text: '1', bold: true }],
      ['靠近', '吸合', '低（约 0V）', { text: '0', bold: true }],
    ], { x: rx, y, w: rw, colW: [0.7, 0.7, 1.3, rw - 2.7], rowH: 0.34, size: 12, align: ['center', 'center', 'center', 'center'] });
    const ty = y + 1.02 + 0.3;
    V.card(s, { x: rx, y: ty, w: rw, h: G.bottom - ty, fill: P.turqPale });
    V.iconCircle(s, I.bulb, { x: rx + 0.16, y: ty + (G.bottom - ty - 0.38) / 2, d: 0.38 });
    txt(s, [R('记住“低电平有效”：', { bold: true, breakLine: true }), R('有磁铁 = 0，没磁铁 = 1，', { breakLine: true }), R('所以程序里写 if(val==0)。')],
      { x: rx + 0.68, y: ty, w: rw - 0.8, h: G.bottom - ty, size: 12, valign: 'middle' });
    if (G.bottom - ty < 0.85) warn('pull-up tip too short');
  }

  // ================================================================ parts
  s = slide({
    title: '组件清单',
    desc: '三个模块各管一件事：磁簧开关负责“听”，LED 和蜂鸣器负责“说”',
    notes: '对照清单把元件拿出来，别忘了准备一块磁铁。右边三张卡片帮学生分清输入和输出：磁簧开关是输入，Arduino 去“听”它；LED 和蜂鸣器是输出，Arduino 去“说”给它们。“有源”蜂鸣器内部自带发声电路，给高电平就响。原指南接线图里的 LED 模块用的是 RGB 灯模块，用普通 LED 模块也可以。',
  });
  {
    txt(s, '组件清单（原指南）', { x: G.L, y: G.top, w: 3.5, h: 0.3, size: 13, bold: true, valign: 'middle' });
    const parts = [[I.chip, 'Arduino UNO R3 主板'], [I.grid, '面包板'], [I.usb, 'USB 数据线'], [I.magnet, '小磁簧开关模块 ×1'], [I.bulb, 'LED ×1'], [I.volume, '有源蜂鸣器 ×1'], [I.cable, '若干跳线']];
    const pw = 2.3, ph = 0.56, gx = 0.3, gy = 0.3, py = G.top + 0.45;
    parts.forEach(([ic, t], i) => {
      const c = i % 2, r = Math.floor(i / 2);
      compCard(s, ic, t, G.L + c * (pw + gx), py + r * (ph + gy), pw, ph);
    });
    {
      const nx = G.L + pw + gx, ny = py + 3 * (ph + gy);
      V.card(s, { x: nx, y: ny, w: pw, h: ph, fill: P.white, line: P.turqDeep });
      V.iconCircle(s, I.magnet_w, { x: nx + 0.13, y: ny + (ph - 0.36) / 2, d: 0.36, fill: P.ink });
      txt(s, [R('另备：', { bold: true }), R('一块小磁铁')], { x: nx + 0.62, y: ny, w: pw - 0.72, h: ph, size: 12.5, valign: 'middle' });
    }
    const rx = 5.75, rw = G.R - rx, n = 3, gap = 0.3, ch = (G.ch - gap * (n - 1)) / n;
    const roles = [
      [I.magnet, '小磁簧开关模块', '输入', '感知磁铁，用 0 / 1 告诉 Arduino'],
      [I.bulb, 'LED 模块', '输出', '11 号脚给高电平，灯就亮'],
      [I.volume, '有源蜂鸣器', '输出', '13 号脚给高电平，它就响'],
    ];
    roles.forEach(([ic, t, k, d], i) => {
      const y = G.top + i * (ch + gap);
      V.card(s, { x: rx, y, w: rw, h: ch });
      V.iconCircle(s, ic, { x: rx + 0.18, y: y + 0.18, d: 0.42, fill: k === '输入' ? P.turq : P.gray2 });
      txt(s, t, { x: rx + 0.74, y: y + 0.18, w: 2.0, h: 0.42, size: 14, bold: true, valign: 'middle' });
      V.pill(s, { x: rx + 0.74 + V.textW(t, 14) + 0.16, y: y + 0.27, text: k, size: 10, fill: k === '输入' ? P.turq : P.ink, color: k === '输入' ? P.ink : P.white });
      txt(s, d, { x: rx + 0.74, y: y + 0.62, w: rw - 0.92, h: ch - 0.68, size: 12, color: P.ink });
    });
  }

  // ================================================================ wiring tables
  s = slide({
    title: '接线表',
    desc: '照原指南三张表接线：开关信号进 12 号脚，LED 模块接 11，蜂鸣器接 13，GND 都接 UNO 的 GND',
    notes: '三张表照原指南抄录，接线时一张一张对着接。提醒学生：模块上印的不是 VCC / OUT，而是 S、中间脚和 −，对应关系看下面的卡片；表里括号中的 R、Y 可以对照接线图里的红线、黄线来记。所有模块的 GND 都接到 UNO 的 GND，UNO 上有好几个 GND 口，哪个都可以。接线时先拔掉 USB。',
  });
  {
    const n = 3, gap = 0.35, w = (G.cw - gap * (n - 1)) / n;
    const T = [
      // PDF mixes full-width "VCC（R）" with half-width "GND(G)"; parens unified so the mono column renders evenly.
      { h: '小磁簧开关（输入）', right: '小磁簧开关', rows: [['5V', 'VCC(R)'], ['GND', 'GND(G)'], ['12', 'OUT(Y)']] },
      { h: 'LED 模块（输出）', right: 'LED 模块', rows: [['11', '+'], ['GND', '—']] },
      { h: '有源蜂鸣器（输出）', right: '有源蜂鸣器', rows: [['13', '+'], ['GND', '—']] },
    ];
    const ty = G.top + 0.38, rowH = 0.34;
    T.forEach((t, i) => {
      const x = G.L + i * (w + gap);
      V.numCircle(s, i + 1, { x, y: G.top + 0.01, d: 0.27, size: 10.5 });
      txt(s, t.h, { x: x + 0.37, y: G.top, w: w - 0.37, h: 0.28, size: 13, bold: true, valign: 'middle' });
      V.wiring(s, { x, y: ty, w, right: t.right, rows: t.rows, rowH, size: 12.5 });
    });
    const cy = ty + rowH * 4 + 0.32, ch = G.bottom - cy;
    const C = [
      [I.search, '模块上的标记', '模块上印的 S 就是 OUT，\n中间脚是 VCC，− 是 GND。'],
      [I.bulb, '图里用 RGB 灯模块', '接线图用 RGB 灯模块代替，\n11 号脚接它的 R 脚，\n所以亮的是红灯。'],
      [I.volume, '蜂鸣器分正负', '+ 脚（接线图里的红线头）\n接 13，另一脚接 GND。'],
    ];
    C.forEach(([ic, t, d], i) => {
      const x = G.L + i * (w + gap);
      const by = iconCard(s, ic, t, { x, y: cy, w, h: ch, d: 0.36, titleSize: 13 });
      txt(s, d, { x: x + 0.2, y: by - 0.04, w: w - 0.4, h: cy + ch - by - 0.08, size: 12 });
    });
  }

  // ================================================================ wiring diagram
  s = slide({
    title: '接线图',
    desc: '从上到下找三个模块：上 RGB 灯模块、中 磁簧开关、下 蜂鸣器；黄线是信号，红线 5V，黑线 GND',
    notes: '对照原指南接线图，从上到下找到三个模块。图里黄线都是信号线，红线是 5V，黑线是 GND，按颜色找最不容易乱。接完后同桌互相检查一遍，再插 USB 上传程序。',
  });
  {
    const iw = 4.35;
    V.imageBox(s, { file: 'l13/reed_wiring.jpg', x: G.L, y: G.top, w: iw, h: G.ch, diagram: true, caption: '原指南接线图' });
    const rx = G.L + iw + 0.35, rw = G.R - rx, n = 3, gap = 0.3, ch = (G.ch - gap * (n - 1)) / n;
    const M = [
      ['上', [R('RGB 灯模块', { bold: true, breakLine: true }), R('当 LED 模块用', { fontSize: 12, color: P.muted })], [['黄线', '11 → R 脚'], ['黑线', 'GND → − 脚']]],
      ['中', '小磁簧开关\n模块', [['黄线', '12 → S 脚'], ['红线', '5V → 中间脚'], ['黑线', 'GND → − 脚']]],
      ['下', '有源蜂鸣器', [['黄线', '13 → + 脚'], ['黑线', 'GND → − 脚']]],
    ];
    const tcw = 1.4, wx = rx + 0.62 + tcw + 0.12, ww = rx + rw - 0.16 - wx, rh = 0.27;
    M.forEach(([pos, t, rows], i) => {
      const y = G.top + i * (ch + gap);
      V.card(s, { x: rx, y, w: rw, h: ch });
      V.numCircle(s, pos, { x: rx + 0.16, y: y + (ch - 0.36) / 2, d: 0.36, size: 12, fill: i === 1 ? P.ink : P.turq, color: i === 1 ? P.white : P.ink });
      txt(s, t, { x: rx + 0.62, y: y + 0.08, w: tcw, h: ch - 0.16, size: 13, bold: typeof t === 'string', valign: 'middle', lineSpacingMultiple: 1.1 });
      const ry = y + (ch - rows.length * rh) / 2;
      rows.forEach(([c, d], j) => {
        txt(s, [R(c + '　', { bold: true }), R(d)], { x: wx, y: ry + j * rh, w: ww, h: rh, size: 12, valign: 'middle' });
        if (V.textW(c + '　' + d, 12) > ww) warn('wiring row too wide: ' + d);
      });
      if (rows.length * rh > ch - 0.12) warn('wiring card overflow ' + plainOf(t));
    });
  }

  // ================================================================ syntax 1: digitalRead + Serial.println
  s = slide({
    title: '新语法①：digitalRead() 与 Serial.println()',
    desc: 'digitalRead() 问开关“通了没有”，只回答 0 或 1；Serial.println() 把答案显示在电脑上',
    notes: 'digitalRead 只有两个答案，适合开关、按键这类“有或没有”的传感器；实验一、二用过的 analogRead 回答的是“有多少”。Serial.println 是我们的“透视眼”：传感器的状态平时看不见，打印到串口就一目了然。打开串口监视器后，记得把波特率选成 9600。',
  });
  {
    const w = (G.cw - 0.35) / 2;
    // card A
    let x = G.L;
    let y = iconCard(s, I.toggle, 'digitalRead(引脚)', { x, y: G.top, w, h: G.ch, mono: true, titleSize: 14 });
    const ta = '像问开关一句：“你现在通了没有？”它只回答两种：1（高电平）或 0（低电平）。';
    const ha = hOf(ta, w - 0.4, 12.5, 1.25);
    txt(s, ta, { x: x + 0.2, y, w: w - 0.4, h: ha, size: 12.5 });
    y += ha + 0.14;
    y += miniCode(s, 'pinMode(12, INPUT);         // 当“耳朵”\nint val = digitalRead(12);  // 0 或 1', { x: x + 0.2, y, w: w - 0.4, size: 10.5 }) + 0.2;
    V.table(s, [
      ['函数', '回答什么', '适合读'],
      [{ text: 'digitalRead()' }, '0 或 1', '开关、按键'],
      [{ text: 'analogRead()' }, '0～1023', '旋钮、光线'],
    ], { x: x + 0.2, y, w: w - 0.4, colW: [1.65, 1.0, w - 0.4 - 2.65], rowH: 0.3, size: 12, monoCols: [0] });
    y += 0.9 + 0.12;
    txt(s, '一个读“有没有”，一个读“有多少”（实验一）', { x: x + 0.2, y, w: w - 0.4, h: 0.26, size: 12, color: P.muted, valign: 'middle' });
    if (y + 0.26 > G.bottom - 0.06) warn('syntax1 card A overflow');
    // card B
    x = G.L + w + 0.35;
    y = iconCard(s, I.comments, 'Serial.println(val)', { x, y: G.top, w, h: G.ch, mono: true, titleSize: 14 });
    const tb2 = '串口是 Arduino 和电脑聊天的窗口。把 val 打印出来，看不见的开关状态就“看得见”了。';
    const hb = hOf(tb2, w - 0.4, 12.5, 1.25);
    txt(s, tb2, { x: x + 0.2, y, w: w - 0.4, h: hb, size: 12.5 });
    y += hb + 0.12;
    const smH = 1.62;
    serialMock(s, { x: x + 0.2, y, w: w - 0.4, h: smH, lh: 0.2, lines: ['1', '1', '0', '0', '1'], annX: 0.75, annots: [{ i: 0, text: '← 没有磁铁' }, { i: 2, text: '← 磁铁靠近' }, { i: 4, text: '← 磁铁拿开' }] });
    y += smH + 0.12;
    txt(s, [R('println', { bold: true, fontFace: V.MONO }), R(' 打印完自动换行；打开方法：IDE 右上角放大镜图标，波特率选 9600。')], { x: x + 0.2, y, w: w - 0.4, h: G.bottom - 0.1 - y, size: 12 });
    if (G.bottom - 0.1 - y < 0.42) warn('syntax1 card B footer short');
  }

  // ================================================================ syntax 2: if / else, == vs =
  s = slide({
    title: '新语法②：if / else 与 ==',
    desc: 'if / else 是程序里的岔路口：条件成立走一条路，不成立走另一条；比较“相等”要写两个等号 ==',
    notes: '用“岔路口”类比 if / else：条件成立走 if 的路，不成立走 else 的路，两条只走一条。重点强调 == 和 = 的区别，这是初学者最常犯的错：写成 if(val=0) 也能编译通过，但灯永远不会亮。可以让学生故意写错一次，看看现象。',
  });
  {
    const lw = 4.5, lx = G.L;
    V.card(s, { x: lx, y: G.top, w: lw, h: G.ch });
    V.iconCircle(s, I.branch, { x: lx + 0.2, y: G.top + 0.18, d: 0.42 });
    txt(s, '像走到岔路口看路牌', { x: lx + 0.76, y: G.top + 0.18, w: lw - 0.9, h: 0.42, size: 15, bold: true, valign: 'middle' });
    txt(s, '路牌上写着条件：成立就走左边，不成立就走右边，两条路只能选一条。', { x: lx + 0.2, y: G.top + 0.72, w: lw - 0.4, h: 0.5, size: 12.5 });
    // fork drawing
    const dcx = lx + lw / 2, dw = 1.9, dh = 0.74, dy = G.top + 1.3;
    s.addShape('diamond', { x: dcx - dw / 2, y: dy, w: dw, h: dh, fill: { color: P.white }, line: { color: P.ink, width: 1.25 } });
    V.text(s, 'val == 0 ?', { x: dcx - dw / 2, y: dy, w: dw, h: dh, size: 12.5, bold: true, mono: true, align: 'center', valign: 'middle' });
    const bw = 1.6, bh = 0.62, by = dy + dh + 0.36;
    const lbx = lx + 0.25, rbx = lx + lw - 0.25 - bw;
    polyline(s, [[dcx - dw / 2, dy + dh / 2], [lbx + bw / 2, dy + dh / 2], [lbx + bw / 2, by]], { head: true, color: P.ink, width: 1.5 });
    polyline(s, [[dcx + dw / 2, dy + dh / 2], [rbx + bw / 2, dy + dh / 2], [rbx + bw / 2, by]], { head: true, color: P.ink, width: 1.5 });
    txt(s, '成立', { x: lbx + bw / 2 + 0.08, y: dy + dh / 2 + 0.06, w: 0.6, h: 0.26, size: 11, bold: true, valign: 'middle' });
    txt(s, '不成立', { x: rbx + bw / 2 - 0.72, y: dy + dh / 2 + 0.06, w: 0.66, h: 0.26, size: 11, bold: true, align: 'right', valign: 'middle' });
    fbox(s, { x: lbx, y: by, w: bw, h: bh, fill: P.turq, text: 'if 里的代码\n灯亮、蜂鸣器响', size: 11.5 });
    fbox(s, { x: rbx, y: by, w: bw, h: bh, fill: P.gray1, text: 'else 里的代码\n全部关掉', size: 11.5 });
    txt(s, 'else 可以不写：不写就是“不成立时什么也不做”。', { x: lx + 0.2, y: by + bh + 0.18, w: lw - 0.4, h: 0.26, size: 12, color: P.muted, valign: 'middle' });
    if (by + bh + 0.44 > G.bottom - 0.08) warn('fork overflow');
    // right column
    const rx = lx + lw + 0.35, rw = G.R - rx;
    txt(s, '写法', { x: rx, y: G.top, w: rw, h: 0.28, size: 13, bold: true, valign: 'middle' });
    const mh = miniCode(s, 'if (条件) {\n  // 条件成立：做这里\n} else {\n  // 不成立：做这里\n}', { x: rx, y: G.top + 0.36, w: rw, size: 11.5 });
    const cy = G.top + 0.36 + mh + 0.3, chh = G.bottom - cy, cw = (rw - 0.3) / 2;
    // == card
    V.card(s, { x: rx, y: cy, w: cw, h: chh, fill: P.turqPale });
    V.iconCircle(s, I.check, { x: rx + 0.16, y: cy + 0.16, d: 0.34 });
    txt(s, 'val == 0', { x: rx + 0.6, y: cy + 0.16, w: cw - 0.7, h: 0.34, size: 13, bold: true, mono: true, valign: 'middle' });
    txt(s, [R('两个等号是“比较”', { bold: true, breakLine: true }), R('问一句：val 等于 0 吗？答案只有“是”或“不是”。')], { x: rx + 0.16, y: cy + 0.62, w: cw - 0.32, h: chh - 0.72, size: 12 });
    // = card (don't)
    const x2 = rx + cw + 0.3;
    V.card(s, { x: x2, y: cy, w: cw, h: chh, fill: P.white, line: P.red, lineW: 1 });
    V.iconCircle(s, I.times_w, { x: x2 + 0.16, y: cy + 0.16, d: 0.34, fill: P.red });
    txt(s, 'val = 0', { x: x2 + 0.6, y: cy + 0.16, w: cw - 0.7, h: 0.34, size: 13, bold: true, mono: true, color: P.red, valign: 'middle' });
    txt(s, [R('一个等号是“赋值”', { bold: true, breakLine: true }), R('把 0 放进 val！写成 if(val=0)，条件永远不成立。')], { x: x2 + 0.16, y: cy + 0.62, w: cw - 0.32, h: chh - 0.72, size: 12 });
  }

  // ================================================================ code 1/2
  s = slide({
    title: '代码逐行看懂（1/2）：准备工作',
    desc: '先准备四个“盒子”记住引脚号和读数，再在 setup() 里告诉 Arduino 谁是输入、谁是输出',
    notes: '前 4 行准备了四个“盒子”：三个装引脚号，一个装读数。给引脚起名字的好处是：以后换引脚只改这里，程序里其他地方都不用动。setup() 里用 pinMode 告诉 Arduino 哪些脚是输出、哪个是输入，最后打开串口。',
  });
  {
    const cw = 4.3;
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: REED_CODE, from: 1, to: 11, hl: [1, 2, 3, 9], file: 'reed_switch.ino', right: '第 1–11 行' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    const yEnd = V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: 4.15, gap: 0.12, items: [
      { line: [1, 3], text: '给三个引脚起名字：11、13、12 号脚' },
      { line: 4, text: 'val：装读数的盒子，先放一个 0' },
      { line: 5, text: 'setup()：通电后只运行一次，做准备' },
      { line: [7, 8], text: 'LED、蜂鸣器设为输出：Arduino 去“说”' },
      { line: 9, text: '磁簧开关设为输入：Arduino 去“听”' },
      { line: 10, text: '打开串口，速度 9600，准备和电脑聊天' },
    ] });
    const ty = Math.max(yEnd + 0.18, 4.25);
    V.tip(s, { x: ex, y: ty, w: ew, h: G.bottom - ty, kind: 'tip', text: '起名字的好处：换引脚时只改第 1–3 行，下面的代码一字不动。', size: 12 }, I.bulb);
    if (G.bottom - ty < 0.6) warn('code1 tip too short');
  }

  // ================================================================ code 2/2
  s = slide({
    title: '代码逐行看懂（2/2）：读、打印、判断',
    desc: 'loop() 不停地重复三件事：读开关、把读数打印出来、按读数决定灯和蜂鸣器开还是关',
    notes: 'loop() 是程序的核心，一共只做三件事：读、打印、判断。第 16 行的 val==0 对应“磁铁靠近”，所以成立时灯亮、蜂鸣器响；else 分支把它们关掉。第 26 行的大括号结束后，loop 会立刻从第 12 行再来一遍。',
  });
  {
    const cw = 4.3;
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: REED_CODE, from: 12, to: 26, hl: [14, 15, 16, 21], file: 'reed_switch.ino', right: '第 12–26 行' });
    const ex = G.L + cw + 0.35, ew = G.R - ex;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: G.bottom, gap: 0.1, items: [
      { line: 12, text: 'loop()：里面的代码一遍又一遍地重复' },
      { line: 14, text: '读 12 号脚，结果存进 val：有磁铁是 0，没有磁铁是 1' },
      { line: 15, text: '把 val 打印到串口，一行一个数' },
      { line: 16, text: '岔路口：val 等于 0 吗？（== 是比较）' },
      { line: [18, 19], text: '成立（有磁铁）：LED 亮、蜂鸣器响' },
      { line: 21, text: '否则（val 是 1，没有磁铁）……' },
      { line: [23, 24], text: '……LED 灭、蜂鸣器停' },
      { line: 26, text: 'loop 结束，马上回到第 12 行再来一遍' },
    ] });
  }

  // ================================================================ flowchart
  s = slide({
    title: '程序流程图',
    desc: '把程序画成路线图：setup() 只走一次，loop() 一圈圈地“读 → 判断 → 输出”',
    notes: '流程图把程序画成一张路线图：椭圆是开始，方框是做事，菱形是判断。可以请学生用手指沿着箭头走一遍，分别模拟“有磁铁”和“没有磁铁”两种情况。loop 转得非常快：就算每圈都要往串口打印一个数，每秒也能转几百圈，所以磁铁一靠近，灯几乎同时就亮了。',
  });
  {
    const mw = 2.3, mx = 2.05, mcx = mx + mw / 2;
    // legend
    txt(s, '图例', { x: G.L, y: G.top, w: 1.3, h: 0.26, size: 12, bold: true, color: P.muted, valign: 'middle' });
    const lg = [['oval', '开始'], ['box', '做一件事'], ['dia', '做判断']];
    lg.forEach(([k, t], i) => {
      const y = G.top + 0.38 + i * 0.42;
      if (k === 'oval') V.card(s, { x: G.L, y, w: 0.42, h: 0.26, fill: P.ink, radius: 0.13 });
      if (k === 'box') V.card(s, { x: G.L, y, w: 0.42, h: 0.26, fill: P.card, line: P.gray2, radius: 0.05 });
      if (k === 'dia') s.addShape('diamond', { x: G.L, y: y - 0.02, w: 0.42, h: 0.3, fill: { color: P.white }, line: { color: P.ink, width: 1 } });
      txt(s, t, { x: G.L + 0.52, y, w: 1.0, h: 0.26, size: 11, valign: 'middle' });
    });
    // main column
    const y1 = G.top + 0.03;
    V.card(s, { x: mcx - 0.85, y: y1, w: 1.7, h: 0.4, fill: P.ink, radius: 0.2 });
    txt(s, '开始（通电）', { x: mcx - 0.85, y: y1, w: 1.7, h: 0.4, size: 12, bold: true, color: P.white, align: 'center', valign: 'middle' });
    V.arrow(s, mcx, y1 + 0.4, mcx, y1 + 0.62, { color: P.ink });
    const y2 = y1 + 0.62;
    fbox(s, { x: mx, y: y2, w: mw, h: 0.62, line: P.gray2, text: [R('setup()　只做一次', { bold: true, breakLine: true }), R('设引脚、开串口', { bold: false })], size: 12 });
    V.arrow(s, mcx, y2 + 0.62, mcx, y2 + 0.86, { color: P.ink });
    const y3 = y2 + 0.86;
    fbox(s, { x: mx, y: y3, w: mw, h: 0.66, line: P.gray2, text: [R('val = digitalRead(12)', { fontFace: V.MONO, breakLine: true }), R('并打印到串口', { bold: false })], size: 11.5 });
    V.arrow(s, mcx, y3 + 0.66, mcx, y3 + 0.9, { color: P.ink });
    const y4 = y3 + 0.9, dh = 0.92;
    s.addShape('diamond', { x: mx, y: y4, w: mw, h: dh, fill: { color: P.white }, line: { color: P.ink, width: 1.25 } });
    V.text(s, 'val == 0 ?', { x: mx, y: y4, w: mw, h: dh, size: 13, bold: true, mono: true, align: 'center', valign: 'middle' });
    const dcy = y4 + dh / 2;
    // yes branch (right)
    const yx = mx + mw + 0.45, yw = 1.7, bh = 0.66;
    V.arrow(s, mx + mw, dcy, yx, dcy, { color: P.ink, width: 1.5 });
    txt(s, '是', { x: mx + mw + 0.05, y: dcy - 0.32, w: 0.35, h: 0.26, size: 12, bold: true, align: 'center', valign: 'middle' });
    fbox(s, { x: yx, y: dcy - bh / 2, w: yw, h: bh, fill: P.turq, text: 'LED 亮\n蜂鸣器响', size: 12.5 });
    // no branch (left)
    const nw = 1.2, nx = G.L;
    V.arrow(s, mx, dcy, nx + nw, dcy, { color: P.ink, width: 1.5 });
    txt(s, '否', { x: nx + nw + 0.04, y: dcy - 0.32, w: mx - nx - nw - 0.08, h: 0.26, size: 12, bold: true, align: 'center', valign: 'middle' });
    fbox(s, { x: nx, y: dcy - bh / 2, w: nw, h: bh, fill: P.gray1, text: 'LED 灭\n蜂鸣器停', size: 12.5 });
    // loop back
    const ly = y3 + 0.33;
    polyline(s, [[yx + yw / 2, dcy - bh / 2], [yx + yw / 2, ly], [mx + mw, ly]], { head: true, color: P.turqDeep, width: 1.5 });
    polyline(s, [[nx + nw / 2, dcy - bh / 2], [nx + nw / 2, ly], [mx, ly]], { head: true, color: P.turqDeep, width: 1.5 });
    txt(s, '回到 loop() 开头，重复', { x: mx + mw + 0.12, y: ly - 0.32, w: 1.9, h: 0.26, size: 11, bold: true, color: P.turqDeep, valign: 'middle' });
    if (y4 + dh > G.bottom) warn('flowchart overflow');
    // right panel: map to code
    const rx = 6.95, rw = G.R - rx;
    V.card(s, { x: rx, y: G.top, w: rw, h: G.ch });
    txt(s, '对照代码', { x: rx + 0.2, y: G.top + 0.14, w: rw - 0.4, h: 0.3, size: 13, bold: true, valign: 'middle' });
    const map = [['第 5–11 行', 'setup()：只做一次'], ['第 14–15 行', '读开关、打印读数'], ['第 16 行', '判断 val 是不是 0'], ['第 18–19 行', '是：LED 亮、蜂鸣器响'], ['第 23–24 行', '否：LED 灭、蜂鸣器停']];
    map.forEach(([tag, t], i) => {
      const y = G.top + 0.56 + i * 0.6;
      const tw = V.textW(tag, 10) + 0.22;
      V.pill(s, { x: rx + 0.2, y, w: tw, h: 0.25, text: tag, size: 10 });
      txt(s, t, { x: rx + 0.2, y: y + 0.27, w: rw - 0.4, h: 0.26, size: 12, valign: 'middle' });
    });
  }

  // ================================================================ result
  s = slide({
    title: '实验结果',
    desc: '磁铁靠近：开关输出低电平，LED 灯亮、蜂鸣器响；磁铁拿开：全部停下，串口里的数字跟着变',
    notes: '上传程序后打开串口监视器，拿磁铁慢慢靠近再拿开，观察灯、蜂鸣器和串口数字三者同步变化。右边串口画面是示意，实际上因为 loop 里没有 delay，数字会刷得非常快。如果现象不对，先看串口数字，再查接线。',
  });
  {
    const iw = 4.95;
    V.imageBox(s, { file: 'l13/reed_result_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南实物图：磁铁靠近磁簧开关，RGB 灯亮红光' });
    const rx = G.L + iw + 0.35, rw = G.R - rx;
    const smH = 1.86;
    serialMock(s, { x: rx, y: G.top, w: rw, h: smH, title: '串口监视器（示意）', lines: ['1', '1', '0', '0', '1', '1'], annX: 0.7,
      annots: [{ i: 0, text: '← 没有磁铁：灯灭、不响' }, { i: 2, text: '← 磁铁靠近：灯亮、响' }, { i: 4, text: '← 磁铁拿开：全部停下' }] });
    const ty = G.top + smH + 0.3;
    V.tip(s, { x: rx, y: ty, w: rw, h: G.bottom - ty, kind: 'note', title: '原指南结论', text: '用一个磁铁靠近小磁簧开关，会使得小磁簧开关输出低电平，从而点亮 LED 灯，蜂鸣器响。', size: 12 }, I.check);
  }

  // ================================================================ Sensor V5.0 shield
  s = slide({
    title: '更方便的接法：Sensor V5.0 扩展板',
    desc: '扩展板把每个引脚都做成 G · V · S 三针一排，模块用杜邦线直插，不用面包板',
    notes: 'Sensor V5.0 扩展板直接插在 UNO 上，把每个数字脚都扩展成 G、V、S 三根针，接传感器模块非常方便。按同样的引脚号接，程序不用改。注意排针顺序：磁簧开关是 G 对 −，V 对中间脚，S 对 S；两针的 LED 和蜂鸣器只用 S 和 G，+ 接 S，− 接 G。没有扩展板就用面包板接法。',
  });
  {
    const iw = 2.75;
    V.imageBox(s, { file: 'l13/reed_shield_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南：扩展板接法' });
    const rx = G.L + iw + 0.35, rw = G.R - rx;
    const qh = 0.78;
    V.tip(s, { x: rx, y: G.top, w: rw, h: qh, kind: 'note', text: '原指南：如果你的套件中有 Sensor V5.0 的扩展板，\n按照下图（即左图）接线，更加方便。', size: 12.5 }, I.book);
    const cy = G.top + qh + 0.3, ch = 1.62, n = 3, gap = 0.3, cw = (rw - gap * (n - 1)) / n;
    const C = [
      [I.puzzle, '三针一排', '每个数字脚旁\n都有 G、V、S\n三根针'],
      [I.link, '直接插', '模块用杜邦线\n直接插上，\n不用面包板'],
      [I.check, '不改程序', '引脚号不变：\n13、12、11，\n代码不用改'],
    ];
    C.forEach(([ic, t, d], i) => {
      const x = rx + i * (cw + gap);
      const by = iconCard(s, ic, t, { x, y: cy, w: cw, h: ch, d: 0.36, titleSize: 13 });
      txt(s, d, { x: x + 0.2, y: by - 0.02, w: cw - 0.4, h: cy + ch - by - 0.08, size: 12 });
    });
    const ty = cy + ch + 0.3, th = G.bottom - ty;
    V.card(s, { x: rx, y: ty, w: rw, h: th });
    V.iconCircle(s, I.search, { x: rx + 0.16, y: ty + (th - 0.36) / 2, d: 0.36 });
    txt(s, '对准排针', { x: rx + 0.66, y: ty, w: 0.95, h: th, size: 12.5, bold: true, valign: 'middle' });
    txt(s, '磁簧开关：G 接 −，V 接中间脚，S 接 S\nLED、蜂鸣器：+ 接 S，− 接 G', { x: rx + 1.66, y: ty, w: rw - 1.8, h: th, size: 12, valign: 'middle' });
    if (th < 0.55) warn('shield pin card too short');
  }

  // ================================================================ troubleshooting
  s = slide({
    title: '常见问题',
    desc: '排查口诀：先看串口，再查接线——串口里的 0 / 1 会告诉你问题出在输入还是输出',
    notes: '排查问题的口诀：先看串口，再查接线。串口数字会随磁铁变化，说明输入没问题，去查灯和蜂鸣器；数字不变，就查磁簧开关那三根线。右边四种是课堂上最常见的情况，可以让学生先自己对照排查，再举手求助。',
  });
  {
    const lw = 2.75;
    txt(s, '排查步骤', { x: G.L, y: G.top, w: lw, h: 0.32, size: 15, bold: true, valign: 'middle' });
    const ly = numList(s, [
      '打开串口监视器，盯住 val 的值',
      '拿磁铁靠近、拿开，看 0 / 1 变不变',
      [R('会变', { bold: true }), R(' → 输入正常，去查灯和蜂鸣器')],
      [R('不变', { bold: true }), R(' → 去查磁簧开关的接线')],
    ], { x: G.L, y: G.top + 0.46, w: lw, size: 12.5, gap: 0.24 });
    if (ly > G.bottom) warn('debug steps overflow');
    const rx = G.L + lw + 0.35, rw = G.R - rx, cw = (rw - 0.3) / 2, ch = (G.ch - 0.3) / 2;
    const W = [
      ['磁铁靠近没反应', 'OUT 接在 12 号脚了吗？磁铁要贴近玻璃管、顺着管子方向放，离远了吸不动。'],
      ['一直亮、一直响', '串口一直是 0？\n先查模块中间脚有没有接 5V，\n再看旁边有没有别的磁铁，\n最后核对程序里的引脚号。'],
      ['读数乱跳、灯忽亮忽灭', '12 号脚的信号线没插牢时，\n引脚“悬空”，读数会乱跳。\n把信号线重新插紧就好。'],
      ['串口乱码、刷屏太快', '波特率选 9600，和程序一致。\n嫌刷得太快，可在 loop() 末尾\n临时加一句 delay(200)。'],
    ];
    W.forEach(([t, d], i) => {
      const x = rx + (i % 2) * (cw + 0.3), y = G.top + Math.floor(i / 2) * (ch + 0.3);
      warnCard(s, I.times_w, t, d, { x, y, w: cw, h: ch });
    });
  }

  // ================================================================ try it
  s = slide({
    title: '动手改一改',
    desc: '改一个数字、加几行代码，同一套硬件就能变成门磁报警器和“滴滴”提醒器',
    notes: '两个小改动都只需要改几行。门磁报警把条件反过来：门关着时磁铁贴着开关，读数是 0；门打开、磁铁离开才是 1，这时才报警。“想一想”的答案也是门磁写法：冰箱门打开时磁铁离开，val 是 1。滴滴声靠 delay 控制节奏，可以让学生比较 100 和 300 两种节奏的区别。',
  });
  {
    const w = (G.cw - 0.35) / 2;
    // A
    let x = G.L;
    V.card(s, { x, y: G.top, w, h: G.ch });
    V.iconCircle(s, I.door, { x: x + 0.2, y: G.top + 0.18, d: 0.42 });
    txt(s, '挑战 1　门磁报警器', { x: x + 0.76, y: G.top + 0.18, w: w - 0.9, h: 0.42, size: 15, bold: true, valign: 'middle' });
    let y = G.top + 0.76;
    txt(s, [R('门关着：', { bold: true }), R('磁铁贴着开关 → val 是 0，安静', { breakLine: true }), R('门打开：', { bold: true }), R('磁铁离开 → val 是 1 → 报警！')], { x: x + 0.2, y, w: w - 0.4, h: 0.56, size: 12.5 });
    y += 0.56 + 0.16;
    y += miniCode(s, 'if(val==0)   // 原来：磁铁靠近才响\nif(val==1)   // 改成：磁铁离开才响', { x: x + 0.2, y, w: w - 0.4, size: 11, hl: [1] }) + 0.16;
    V.tip(s, { x: x + 0.2, y, w: w - 0.4, h: 0.72, kind: 'note', text: '只改第 16 行的一个数字。把磁铁贴在门上、开关贴在门框上，就是真的门磁。', size: 12 }, I.bulb);
    y += 0.72 + 0.18;
    txt(s, [R('想一想　', { bold: true }), R('冰箱门没关好就提醒，该用哪一种写法？')], { x: x + 0.2, y, w: w - 0.4, h: G.bottom - 0.15 - y, size: 12.5 });
    if (G.bottom - 0.15 - y < 0.26) warn('challenge A think line short');
    // B
    x = G.L + w + 0.35;
    V.card(s, { x, y: G.top, w, h: G.ch });
    V.iconCircle(s, I.bell, { x: x + 0.2, y: G.top + 0.18, d: 0.42 });
    txt(s, '挑战 2　“滴滴”提醒声', { x: x + 0.76, y: G.top + 0.18, w: w - 0.9, h: 0.42, size: 15, bold: true, valign: 'middle' });
    y = G.top + 0.76;
    txt(s, '把第 18–19 行的“长鸣”改成响一下、停一下：', { x: x + 0.2, y, w: w - 0.4, h: 0.28, size: 12.5 });
    y += 0.28 + 0.16;
    y += miniCode(s, 'digitalWrite(Led,HIGH);\ndigitalWrite(Buzzer_pin,HIGH);\ndelay(100);    // 响 0.1 秒\ndigitalWrite(Buzzer_pin,LOW);\ndelay(100);    // 停 0.1 秒', { x: x + 0.2, y, w: w - 0.4, size: 11, hl: [2, 3, 4] }) + 0.22;
    txt(s, 'loop() 一圈圈重复，就成了“滴滴滴”。把 100 改成 300 试试，节奏会怎样变？', { x: x + 0.2, y, w: w - 0.4, h: G.bottom - 0.15 - y, size: 12.5 });
    if (G.bottom - 0.15 - y < 0.45) warn('challenge B text short');
  }
}

// ================================================================ 本节小结 (replaces the three old summary slides)
function buildSummary({ deck, I, slide }) {
  deck.section('小结');
  const s = slide({
    title: '本节小结',
    desc: '五个实验一条主线：传感器把变化变成电压或开关信号 → Arduino 读进来 → 用引脚控制灯光和声音',
    notes: '先用上面五个方块从左到右、按实验顺序回顾：读数 0～1023 换算成电压、PWM 输出 0～255、LOW 点亮的流水灯、频率决定音调、磁簧开关读到 0 / 1。下面三张卡片是本节的主线：把传感器的值“读进来”，再用引脚“送出去”控制灯光和声音。最后再提醒几个常见的坑：整数相除会丢小数、数组编号从 0 开始、delay() 只认整数毫秒、比较相等要写 ==。',
  });
  const th = 1.9;
  tileGrid(s, {
    x: G.L, y: G.top, w: G.cw, h: th, cols: 5, bigSize: 20, titleSize: 13,
    items: [
      { fill: P.turq, big: '0～1023', title: 'AD 模数转换', sub: '读数 ÷ 1023 × 5\n就是电压' },
      { fill: P.gray1, big: '0～255', title: '光敏电阻', sub: '光越强电阻越小\nPWM 调亮度' },
      { fill: P.ink, big: 'LOW = 亮', title: 'LED 流水灯', sub: '数组 + for + 函数\n批量控制 8 盏灯' },
      { fill: P.white, big: '250 Hz', title: '蜂鸣器', sub: '开关越快音调越高\n无源才能变音调' },
      { fill: P.turq, big: '0 / 1', title: '小磁簧开关', sub: '有磁铁读到 0\nif / else 做判断' },
    ],
  });
  const by = G.top + th + 0.3, bh = G.bottom - by, bw = (G.cw - 0.6) / 3;
  const cards = [
    { ic: I.search, t: '读进来', d: 'analogRead()：0～1023\ndigitalRead()：0 或 1\n看不见的数值，打印到串口看' },
    { ic: I.bolt, t: '送出去', d: 'digitalWrite()：HIGH / LOW\nanalogWrite()：0～255\n切换得飞快，就成了声音' },
    { ic: I.warn_w, t: '小心这几个坑', d: '先 (float) 再除，小数才不丢\n数组从 [0] 开始，比较要写 ==\ndelay() 只认整数毫秒', warn: true },
  ];
  cards.forEach((c, i) => {
    const x = G.L + i * (bw + 0.3);
    const top = iconCard(s, c.ic, c.t, c.warn
      ? { x, y: by, w: bw, h: bh, d: 0.36, titleSize: 13.5, fill: P.white, line: P.red, lineW: 1, iconFill: P.red, titleColor: P.red }
      : { x, y: by, w: bw, h: bh, d: 0.36, titleSize: 13.5 });
    txt(s, c.d, { x: x + 0.2, y: top - 0.04, w: bw - 0.4, h: by + bh - 0.06 - (top - 0.04), size: 12 });
  });
}

// ------------------------------------------------------------------ build
(async () => {
  const deck = await V.Deck.create({ label: '1-3　传感器与声光输出', title: '1-3 传感器与声光输出：AD 模数转换、光敏电阻、LED 流水灯、蜂鸣器、小磁簧开关' });
  const I = await deck.loadIcons({
    bulb: 'FaLightbulb', warn: 'FaExclamation', check: 'FaCheck', times: 'FaTimes', chip: 'FaMicrochip', grid: 'FaTh',
    usb: 'TbDeviceUsb', cable: 'MdCable', resistor: 'TbCircuitResistor', bolt: 'FaBolt', target: 'FaBullseye', book: 'FaBook',
    search: 'FaSearch', eye: 'FaEye', comments: 'FaComments', question: 'FaQuestion', box: 'FaBoxOpen', toggle: 'FaToggleOn',
    // AD / 光敏电阻
    slider: 'FaSlidersH', sun: 'FaSun', ruler: 'FaRulerHorizontal', cut: 'FaCut',
    // LED 流水灯 / 蜂鸣器
    redo: 'FaRedo', archive: 'FaArchive', volume: 'FaVolumeUp', clock: 'FaClock', wrench: 'FaWrench', heart: 'FaHeart',
    cubes: 'FaCubes', tint: 'FaTint', exchange: 'FaExchangeAlt', pencil: 'FaPencilAlt', headphones: 'FaHeadphones', plug: 'FaPlug',
    // 小磁簧开关
    magnet: 'FaMagnet', door: 'FaDoorOpen', laptop: 'FaLaptop', bike: 'FaBiking', branch: 'FaCodeBranch', bell: 'FaBell',
    flask: 'FaFlask', puzzle: 'FaPuzzlePiece', link: 'FaLink',
  });

  const slide = (o) => {
    if (/[。.]$/.test(o.title)) throw new Error('title ends with a period: ' + o.title);
    if (V.textW(o.title, 24) > 8.8) warn(`title long: ${o.title}`);
    if (V.textW(o.desc, 12) > 8.9) warn(`desc long (${V.textW(o.desc, 12).toFixed(2)}): ${o.desc}`);
    if (!o.notes) throw new Error('notes missing: ' + o.title);
    return deck.slide(o);
  };
  const ctx = { deck, I, slide };

  deck.cover({
    kicker: '开源硬件与 AI 辅助编程　/　实验 1-3',
    title: '1-3　传感器与声光输出',
    // The five experiment names do not fit one line at the master's 28 pt, so this run is set smaller.
    subtitle: [R('AD 模数转换 · 光敏电阻 · LED 流水灯 · 蜂鸣器 · 小磁簧开关', { fontSize: 22 })],
    notes: '这节课是 1-3，一共五个实验，按指南顺序来：先用电位器和光敏电阻做“模拟输入”，再用 LED 流水灯和蜂鸣器做“声光输出”，最后用小磁簧开关把“感知”和“输出”连起来。开场可以问学生：路灯怎么知道天黑了该亮？红绿灯、电梯提示音又是怎么被控制的？',
  });

  buildOverview(ctx);
  buildConcept(ctx);
  buildAD(ctx);      // 实验 01
  buildLDR(ctx);     // 实验 02
  buildLED(ctx);     // 实验 03
  buildBuzzer(ctx);  // 实验 04
  buildReed(ctx);    // 实验 05
  buildSummary(ctx);

  deck.end({
    title: '感知世界，再用灯光和声音回应',
    subtitle: '从传感器读数到声光输出，五个实验走完了一条完整的链——下一节：2-1 PWM 与舵机',
    notes: '课后挑战三选一：① 用电位器控制 LED 亮度——LED 改接带 ~ 的 11 号脚，把读数换算成 0～255 送进 analogWrite；② 心形流水灯，或者用蜂鸣器给流水灯配上“嘀”声；③ 用磁簧开关做一个抽屉提醒器或门磁报警器。下一节 2-1 会用 PWM 调 LED 亮度、控制舵机，开头请两三位同学展示作品。',
  });

  await deck.save(OUT);
  console.log('saved', OUT);
  if (warns.length) console.log(`${warns.length} layout warning(s)`);
})().catch((e) => { console.error(e); process.exit(1); });
