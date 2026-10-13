// 2-1 PWM 与舵机控制：指南里的四个实验，按指南顺序一份 PPT
//   ① PWM 调节 LED 灯亮度 ② RGB 贴片模块呼吸灯 ③ 电位器调节舵机 ④ 摇杆模块
// Source: assets/l21/guide_text.md (PDF p1-18). Run: cd arduino-ppt && node build/21_lesson_2-1.js
// Each experiment's slides are built by one function (buildPWM … buildJoystick), called in guide order below.
const V = require('../lib/vti');
const { P, G } = V;

const OUT = __dirname + '/../output/2-1_PWM_RGB呼吸灯_舵机_摇杆.pptx';
const L = G.L, TOP = G.top, BOT = G.bottom, CW = G.cw, CH = G.ch;

// ------------------------------------------------------------------ programs
// Copied from guide_text.md. Indentation unified to 2 spaces; spaces used only to line up comments collapsed to one.
const PWM_CODE = `int ADPIN = A0 ;
int PWM_LEDPIN = 11 ;
int value = 0 ;
float voltage = 0.0 ;
void setup()
{
  pinMode(ADPIN,INPUT); // define ADPIN input PWM_LEDPIN output
  pinMode(PWM_LEDPIN,OUTPUT);
  Serial.begin(9600); //Serial Baud rate is 9600
}
void loop()
{
  value = analogRead(ADPIN); //读取 A0 引脚读取的可调电位计模拟值
  Serial.print("value1=="); //打印模拟值
  Serial.print(value);
  voltage = ( float )value /1023 ;//计算电压
  Serial.print("     voltage==");//打印电压
  Serial.print(voltage);
  value = (int)(voltage * 256 );//计算输出的 PWM 值
  Serial.print("    PWM==");//打印 PWM 值
  Serial.println(value);
  analogWrite(PWM_LEDPIN,value);
  delay(0);
}`;

const RGB_CODE = `#define RGB_RED     11
#define RGB_GREEN   10
#define RGB_BLUE    9

void setup()
{
  pinMode(RGB_RED,OUTPUT);
  pinMode(RGB_GREEN,OUTPUT);
  pinMode(RGB_BLUE,OUTPUT);
}

void setColor(int red,int green,int blue)
{
  analogWrite(RGB_RED,red);
  analogWrite(RGB_GREEN,green);
  analogWrite(RGB_BLUE,blue);
}

void loop()
{
  int i;
  for(i=0;i<256;i++)
  {
    setColor(i,0,0);
    delay(4);
  }
  delay(500); //turn the RGB LED red smoth

  for(i=0;i<256;i++)
  {
    setColor(0,i,0);
    delay(4);
  }
  delay(500); //turn the RGB LED green smoth

  for(i=0;i<256;i++)
  {
    setColor(0,0,i);
    delay(4);
  }
  delay(100); //turn the RGB LED blue smoth
}`;

// The PDF's program box breaks after delay(15); and the box on the next page is empty:
// loop()'s closing brace was never printed. It is put back as line 16 (explained on the slide).
const SERVO_CODE = `#include <Servo.h>
Servo myservo; // create servo object to control a servo
int readPin = A0;
int servopin = 7;

void setup() {
  pinMode(servopin,OUTPUT);
  myservo.attach(servopin); // attaches the servo on pin 9 to the servo object
}

void loop() {
  int readValue = analogRead(readPin);
  int angle = readValue / 4;
  myservo.write(angle); // tell servo to go to position in variable 'pos'
  delay(15);
}`;

const JOY1_CODE = `// X values will be read from pin 0 and Y from pin 1
#define PIN_ANALOG_X 0
#define PIN_ANALOG_Y 1
void setup() {
  // Start serial because we will observe values at serial monitor
  Serial.begin(9600);
}
void loop() {
  // Print x axis values
  Serial.print("x: ");
  Serial.println(analogRead(PIN_ANALOG_X));
  // Print y axis values
  Serial.print("y: ");
  Serial.println(analogRead(PIN_ANALOG_Y));
  // Some delay to clearly observe your values on serial monitor.
  delay(500);
}`;

const JOY2_CODE = `#define BUTTON_UP 2
#define BUTTON_RIGHT 3
#define BUTTON_DOWN 4
#define BUTTON_LEFT 5
#define BUTTON_E 6
#define BUTTON_F 7
#define BUTTON_K 8
#define PIN_ANALOG_X 0
#define PIN_ANALOG_Y 1
#define DELAY 500
void setup() {
  Serial.begin(9600);
  // to enable pull up resistors first write pin mode
  // and then make that pin HIGH
  pinMode(BUTTON_UP, INPUT);
  digitalWrite(BUTTON_UP, HIGH);
  pinMode(BUTTON_RIGHT, INPUT);
  digitalWrite(BUTTON_RIGHT, HIGH);
  pinMode(BUTTON_DOWN, INPUT);
  digitalWrite(BUTTON_DOWN, HIGH);
  pinMode(BUTTON_LEFT, INPUT);
  digitalWrite(BUTTON_LEFT, HIGH);
  pinMode(BUTTON_E, INPUT);
  digitalWrite(BUTTON_E, HIGH);
  pinMode(BUTTON_F, INPUT);
  digitalWrite(BUTTON_F, HIGH);
  pinMode(BUTTON_K, INPUT);
  digitalWrite(BUTTON_K, HIGH);
}
void loop() {
  if(digitalRead(BUTTON_UP) == LOW) {
    Serial.println("Button A is pressed");
    delay(DELAY);
  }
  else if(digitalRead(BUTTON_RIGHT) == LOW) {
    Serial.println("Button B is pressed");
    delay(DELAY);
  }
  else if(digitalRead(BUTTON_DOWN) == LOW) {
    Serial.println("Button C is pressed");
    delay(DELAY);
  }
  else if(digitalRead(BUTTON_LEFT) == LOW) {
    Serial.println("Button D is pressed");
    delay(DELAY);
  }
  else if(digitalRead(BUTTON_E) == LOW) {
    Serial.println("Button E is pressed");
    delay(DELAY);
  }
  else if(digitalRead(BUTTON_F) == LOW) {
    Serial.println("Button F is pressed");
    delay(DELAY);
  }
  else if(analogRead(PIN_ANALOG_X)<520){
    Serial.println(" left");
    delay(DELAY);
  }
  else if(analogRead(PIN_ANALOG_X)>530){
    Serial.println(" right");
    delay(DELAY);
  }
  else if(analogRead(PIN_ANALOG_Y)>520){
    Serial.println(" up");
    delay(DELAY);
  }
  else if(analogRead(PIN_ANALOG_Y)<515){
    Serial.println(" down");
    delay(DELAY);
  }
  // Some delay to clearly observe your values on serial monitor.
  if(digitalRead(BUTTON_K) == LOW) {
    Serial.println("Button k is pressed");
    delay(DELAY);
  }
}`;

// ------------------------------------------------------------------ local helpers (lib/vti.js is shared; not edited)
const warns = [];
let curTitle = '';
function warn(msg) { warns.push(`[${curTitle}] ${msg}`); console.warn('LAYOUT:', `[${curTitle}]`, msg); }

// Estimated rendered height of wrapped text (+10% slack for CJK rendering).
function hOf(str, w, size, ls = 1.3) { return V.textH(str, w, size, ls) * 1.1; }

// Plain text of a string or a pptxgenjs run array (breakLine runs end a line).
function plainOf(t) {
  if (typeof t === 'string') return t;
  return t.map((r) => r.text + (r.options && r.options.breakLine ? '\n' : '')).join('');
}

// Text box that warns when the estimated text height exceeds the box (strings and run arrays).
// oneLine: also warn when the longest line is wider than the box.
function txt(s, t, o) {
  const size = o.size || 14;
  if (o.h != null) {
    const need = hOf(plainOf(t), o.w, size, 1.25);
    if (need > o.h + 0.03) warn(`text may overflow (${need.toFixed(2)} > ${o.h.toFixed(2)}): ${plainOf(t).slice(0, 30)}`);
  }
  if (o.oneLine) {
    const wmax = Math.max(...plainOf(t).split('\n').map((ln) => (o.mono ? V.monoW(ln, size) : V.textW(ln, size))));
    if (wmax > o.w + 0.01) warn(`one-line text too wide (${wmax.toFixed(2)} > ${o.w.toFixed(2)}): ${plainOf(t).slice(0, 30)}`);
  }
  V.text(s, t, o);
}

// pptxgenjs mutates run option objects in place, so every run gets its own fresh options object.
const R = (text, opt) => ({ text, options: { ...(opt || {}) } });
const B = (text, opt) => R(text, { bold: true, ...(opt || {}) });
const M = (text, opt) => R(text, { fontFace: V.MONO, ...(opt || {}) });

// Copy of the code tokenizer in vti.js (not exported) for small inline code chips.
const KW = new Set(['void', 'int', 'float', 'double', 'char', 'long', 'bool', 'byte', 'const', 'unsigned', 'if', 'else', 'for', 'while', 'return', 'true', 'false']);
const FN = new Set(['pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'map', 'constrain', 'setup', 'loop', 'Serial', 'begin', 'print', 'println', 'write', 'attach']);
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
// hl: 0-based indexes of lines to highlight. Returns the chip height.
function miniCode(s, code, o) {
  const size = o.size || 11;
  const lines = code.split('\n');
  const lh = size * 1.38 / 72;
  const padX = o.padX ?? 0.15;
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
    // CJK in a monospace run falls back to a CJK font: count it a little wider.
    const need = V.monoW(ln, size) + (/[一-鿿]/.test(ln) ? 0.1 : 0);
    if (need > o.w - 2 * padX) warn(`miniCode too wide (${need.toFixed(2)} > ${(o.w - 2 * padX).toFixed(2)}): ${ln}`);
  });
  return h;
}

// V.codeBlock plus checks: rows that wrap, and lines whose CJK comments may render wider in LibreOffice.
function code(s, o) {
  const blk = V.codeBlock(s, o);
  const all = o.code.replace(/\t/g, '    ').split('\n');
  const from = o.from || 1, to = o.to || all.length;
  const charW = blk.size * 0.602 / 72;
  const avail = o.w - 0.28 - (String(to).length + 1.6) * charW;
  let longLines = 0;
  for (let n = from; n <= to; n++) {
    const src = all[n - 1] || '';
    const w = V.monoW(src, blk.size) * 1.004 + (/[一-鿿]/.test(src) ? 0.12 : 0);
    if (w > avail + 0.005) longLines++;
  }
  if (blk.rows !== to - from + 1 && !o.allowWrap) warn(`code wrapped (${blk.rows} rows for ${to - from + 1} lines, ${longLines} long) at ${blk.size}pt`);
  if (blk.size < 10) warn(`code shrunk to ${blk.size}pt (lines ${from}-${to})`);
  return blk;
}

// Straight segment without arrow head / polyline (last segment gets a head when o.head).
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
  const pad = o.pad ?? 0.2, iw = tw - 2 * pad, subSize = o.subSize || 12, titleGap = o.titleGap ?? 0.36;
  const subHOf = (it) => (it.sub ? hOf(it.sub, iw, subSize, 1.25) : 0);
  const rowSubH = [];
  o.items.forEach((it, i) => { const r = Math.floor(i / cols); rowSubH[r] = Math.max(rowSubH[r] || 0, subHOf(it)); });
  o.items.forEach((it, i) => {
    const cx = o.x + (i % cols) * tw, cy = o.y + Math.floor(i / cols) * th;
    const fill = it.fill || P.white, dark = fill === P.ink;
    s.addShape('rect', { x: cx, y: cy, w: tw, h: th, fill: { color: fill }, line: { color: P.gray2, width: 0.75 } });
    const titleSize = o.titleSize || 15, bigSize = it.bigSize || o.bigSize || 26;
    const subH = rowSubH[Math.floor(i / cols)];
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

// Light-gray card with an icon circle and a title row. Returns the y where body content may start.
function iconCard(s, ic, title, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill, line: o.line, lineW: o.lineW });
  const d = o.d || 0.4, dy = o.dy ?? 0.17;
  V.iconCircle(s, ic, { x: o.x + 0.2, y: o.y + dy, d, fill: o.iconFill });
  txt(s, title, { x: o.x + 0.2 + d + 0.14, y: o.y + dy, w: o.w - d - 0.54, h: d, size: o.titleSize || 15, bold: true, valign: 'middle', mono: o.mono, color: o.titleColor, oneLine: true });
  return o.y + dy + d + (o.gap ?? 0.14);
}

// Red-outlined "problem" card: red icon + red title, explanation below.
function warnCard(s, ic, title, body, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.white, line: P.red, lineW: 1 });
  const d = 0.32, pad = 0.16;
  V.iconCircle(s, ic, { x: o.x + pad, y: o.y + pad, d, fill: P.red });
  txt(s, title, { x: o.x + pad + d + 0.12, y: o.y + pad, w: o.w - 2 * pad - d - 0.12, h: d, size: o.titleSize || 13, bold: true, color: P.red, valign: 'middle', oneLine: true });
  const by = o.y + pad + d + 0.1;
  txt(s, body, { x: o.x + pad, y: by, w: o.w - 2 * pad, h: o.y + o.h - pad + 0.04 - by, size: o.size || 12 });
}

// V.tip with a pre-check of the text box size.
function tipBox(s, o, ic) {
  const tw = o.w - 0.32 - (ic ? 0.5 : 0);
  const th = o.h - 0.31 - (o.title ? 0.34 : 0);
  if (o.text) { const need = hOf(plainOf(o.text), tw, o.size || 12, 1.25); if (need > th + 0.03) warn(`tip overflow (${need.toFixed(2)} > ${th.toFixed(2)}): ${o.title || plainOf(o.text).slice(0, 20)}`); }
  if (o.title && V.textW(o.title, o.titleSize || 13) > tw) warn(`tip title too wide: ${o.title}`);
  V.tip(s, o, ic);
}

// Numbered list (number circles + text). Returns bottom y.
function numList(s, items, o) {
  const size = o.size || 13, d = o.d || 0.3, gap = o.gap ?? 0.16;
  let y = o.y;
  items.forEach((t, i) => {
    const tw = o.w - d - 0.14;
    const th = hOf(plainOf(t), tw, size, 1.25);
    const rowH = Math.max(d, th);
    V.numCircle(s, o.labels ? o.labels[i] : i + 1, { x: o.x, y, d, size: 11 });
    txt(s, t, { x: o.x + d + 0.14, y: y + (th < d ? (d - th) / 2 : -0.01), w: tw, h: th + 0.02, size, lineSpacingMultiple: 1.15 });
    y += rowH + gap;
  });
  return y - gap;
}

// Titled paragraph block: bold lead line + body. Returns bottom y.
function lead(s, title, body, o) {
  const size = o.size || 13;
  txt(s, title, { x: o.x, y: o.y, w: o.w, h: 0.3, size: o.leadSize || 14, bold: true, valign: 'middle' });
  const bh = hOf(plainOf(body), o.w, size, 1.25);
  txt(s, body, { x: o.x, y: o.y + 0.36, w: o.w, h: bh, size });
  return o.y + 0.36 + bh;
}

// Rounded box with centred label(s).
function fbox(s, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill || P.card, line: o.line, radius: o.radius ?? 0.08 });
  const dark = o.fill === P.ink;
  txt(s, o.text, { x: o.x + 0.08, y: o.y, w: o.w - 0.16, h: o.h, size: o.size || 12.5, bold: o.bold ?? true, align: 'center', valign: 'middle', color: dark ? P.white : P.ink, mono: o.mono, lineSpacingMultiple: 1.1 });
}

// Row of light-gray pills (component lists). Returns bottom y.
function chips(s, list, o) {
  const size = o.size || 12, h = size / 72 * 1.95, gap = o.gap ?? 0.1;
  let x = o.x, y = o.y;
  list.forEach((t, i) => {
    const w = V.textW(t, size) + 0.26;
    if (x + w > o.x + o.w + 0.001) { x = o.x; y += h + 0.1; }
    const dark = o.leadDark && i === 0;
    V.pill(s, { x, y, w, h, text: t, size, fill: dark ? P.ink : (o.fill || P.gray1), color: dark ? P.white : P.ink, bold: dark });
    x += w + gap;
  });
  return y + h;
}

// Colour interpolation inside the palette (for brightness ramps).
function lerp(a, c, t) {
  const pa = [0, 2, 4].map((i) => parseInt(a.slice(i, i + 2), 16)), pc = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  return pa.map((v, i) => Math.round(v + (pc[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}
// Brightness ramp: charcoal (off) -> turquoise (full). Outlined.
function gradBar(s, x, y, w, h, n = 26, from = P.ink, to = P.turq) {
  for (let i = 0; i < n; i++) {
    const c = lerp(from, to, i / (n - 1));
    s.addShape('rect', { x: x + i * w / n, y, w: w / n + 0.003, h, fill: { color: c }, line: { color: c, width: 0 } });
  }
}
// PWM square wave: duty 0..1, n periods, baseline at y+h.
function pwmWave(s, x, y, w, h, duty, n = 4) {
  const per = w / n;
  if (duty >= 1) s.addShape('rect', { x, y, w, h, fill: { color: P.turq }, line: { color: P.turq, width: 0 } });
  else if (duty > 0) for (let k = 0; k < n; k++) s.addShape('rect', { x: x + k * per, y, w: per * duty, h, fill: { color: P.turq }, line: { color: P.turq, width: 0 } });
  seg(s, x, y + h, x + w, y + h, { color: P.ink, width: 1 });
}

// ------------------------------------------------------------------ slides
// ================================================================ 导入：本节导览
function buildOverview({ deck, I, slide }) {
  deck.section('导入');
  const s = slide({
    title: '本节导览',
    desc: '四个实验，一条主线：让只会“开 / 关”的数字引脚，做出亮度、颜色和角度的“中间值”',
    notes: '先给学生一张地图：这节课按指南顺序做四个实验。前两个用 PWM 让 LED 有“半亮”、让 RGB 灯混出颜色；第三个用脉冲宽度指挥舵机转到指定角度；第四个反过来，读摇杆里两个电位器的“中间值”和七个按键。右边的标签是每个实验要学的新语法，下课前再回来对照一遍。',
  });
  const rowH = 0.8, gap = 0.15;
  const rowY = (i) => TOP + i * (rowH + gap);
  const gw = 1.22;
  const groups = [
    { from: 0, to: 1, fill: P.turq, t: 'PWM 输出', sub: '调亮度 · 调颜色' },
    { from: 2, to: 2, fill: P.ink, t: '舵机', sub: '调角度' },
    { from: 3, to: 3, fill: P.gray1, t: '模拟输入', sub: '摇杆 · 按键' },
  ];
  for (const g of groups) {
    const y = rowY(g.from), h = rowY(g.to) + rowH - y, dark = g.fill === P.ink;
    s.addShape('rect', { x: L, y, w: gw, h, fill: { color: g.fill }, line: { color: P.gray2, width: 0.75 } });
    V.text(s, [R(g.t, { bold: true, color: dark ? P.turq : P.ink, breakLine: true }), R(g.sub, { fontSize: 10.5, color: dark ? 'D0D0D0' : P.ink })],
      { x: L, y, w: gw, h, size: 13, align: 'center', valign: 'middle' });
  }
  const ex = [
    { ic: I.bulb, n: '01', t: 'PWM 调节 LED 灯亮度', d: '转动电位器，LED 从暗到亮连续变化', tags: ['analogWrite()', 'PWM', '占空比'] },
    { ic: I.palette, n: '02', t: 'RGB 贴片模块呼吸灯', d: '红、绿、蓝三种颜色依次由暗渐亮', tags: ['#define', 'setColor(r,g,b)', 'for'] },
    { ic: I.cogs, n: '03', t: '电位器调节舵机', d: '旋钮转到哪里，舵机就转到哪里', tags: ['#include', 'Servo', 'write()'] },
    { ic: I.gamepad, n: '04', t: '摇杆模块', d: '推摇杆、按按键，串口报出方向', tags: ['INPUT_PULLUP', 'else if', '死区'] },
  ];
  const cx = L + gw + 0.15, cw = G.R - cx, tx = cx + 0.82, tagX = cx + 4.55, tw = tagX - tx - 0.15;
  const tagH = 10 / 72 * 1.9;
  ex.forEach((e, i) => {
    const y = rowY(i);
    V.card(s, { x: cx, y, w: cw, h: rowH });
    V.iconCircle(s, e.ic, { x: cx + 0.17, y: y + (rowH - 0.48) / 2, d: 0.48 });
    txt(s, [R(`实验 ${e.n}　`, { fontSize: 10.5, color: P.muted }), B(e.t)], { x: tx, y: y + 0.1, w: tw, h: 0.32, size: 14.5, valign: 'middle' });
    txt(s, e.d, { x: tx, y: y + 0.44, w: tw, h: 0.26, size: 12, valign: 'middle', oneLine: true });
    const b = V.tags(s, e.tags, { x: tagX, y: y + (rowH - tagH) / 2, w: G.R - 0.14 - tagX, size: 10 });
    if (b > y + rowH - 0.1) warn('overview tags wrap: ' + e.t);
  });
}

// ================================================================ 实验 01　PWM 调节 LED 灯亮度
function buildPWM({ deck, I, slide }) {
  let s;
  deck.section('实验一　PWM 调光');
  deck.divider({
    kicker: '实验 01',
    title: 'PWM 调节\nLED 灯亮度实验',
    desc: '数字引脚只会输出 0V 或 5V，怎样让 LED “半亮”？答案是 PWM：飞快地开关，用“开着的时间占多少”来调亮度。再拿电位器当旋钮，转多少，灯就亮多少。',
    tiles: [
      { fill: P.turq, big: '01', title: '原理', sub: 'PWM · 占空比', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: '电位器 → A0，LED → 11', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: 'analogRead · analogWrite', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '旋钮调亮度', subSize: 12 },
    ],
    notes: '实验一分四步：先弄懂 PWM 怎样用“快速开关”调出中间电压，再接线、读代码、看结果。1-3 光敏实验里已经见过 analogWrite()，这次把它讲透。提醒学生准备 10k 电位器、红色 LED 和 220Ω 电阻。',
  });

  // ---------------------------------------------------------------- PWM intro
  s = slide({
    title: 'PWM：用飞快的开关“调”出中间电压',
    desc: '数字引脚只有 0V 和 5V 两种状态；飞快地开关，开着的时间占比越大，平均电压越高，灯就越亮',
    notes: '先问学生：数字引脚只会 0V 和 5V，怎么让 LED 半亮？答案是“快速开关”。用右图验证公式：75% 的时间是 5V，平均就是 5 × 75% = 3.75V；50% 对应 2.5V，20% 对应 1V。“开着的时间占整个周期的比例”就叫占空比，左下角是原指南列出的 PWM 三个要素。',
  });
  {
    const lw = 4.2;
    tipBox(s, { x: L, y: TOP, w: lw, h: 1.1, kind: 'tip', title: '打个比方', text: '一秒钟开关电灯几百次，眼睛看不出闪烁，只觉得灯暗了；“开”的时间越多，灯越亮。', size: 12 }, I.bulb);
    const fy = TOP + 1.1 + 0.3, fh = 1.2;
    V.card(s, { x: L, y: fy, w: lw, h: fh });
    txt(s, '原指南公式：输出（平均）电压', { x: L + 0.2, y: fy + 0.12, w: lw - 0.4, h: 0.26, size: 12, bold: true, color: P.muted, valign: 'middle' });
    V.formula(s, { x: L + 0.25, y: fy + 0.44, h: 0.66, lhs: '电压 =', num: '导通时间', den: '脉冲周期', rhs: '× 5V', size: 16 });
    const ey = fy + fh + 0.3, eh = BOT - ey, ew = (lw - 0.3) / 3;
    const el = [['脉冲宽度', '每次开多久'], ['脉冲周期', '多久开关一轮'], ['电压范围', '例如 0～5V']];
    el.forEach(([t, d], i) => {
      const x = L + i * (ew + 0.15);
      V.card(s, { x, y: ey, w: ew, h: eh });
      V.numCircle(s, i + 1, { x: x + 0.12, y: ey + 0.11, d: 0.28, size: 10.5 });
      txt(s, t, { x: x + 0.46, y: ey + 0.1, w: ew - 0.52, h: 0.3, size: 12.5, bold: true, valign: 'middle', oneLine: true });
      txt(s, d, { x: x + 0.12, y: ey + 0.44, w: ew - 0.2, h: 0.26, size: 12, color: P.muted, valign: 'middle', oneLine: true });
    });
    if (ey + 0.72 > BOT) warn('PWM elements overflow');
    V.imageBox(s, { file: 'l21/pwm_waveforms.jpg', x: L + lw + 0.3, y: TOP, w: G.R - (L + lw + 0.3), h: CH, diagram: true, caption: '原指南：占空比 75% → 3.75V，50% → 2.5V，20% → 1V' });
  }

  // ---------------------------------------------------------------- potentiometer + purpose
  s = slide({
    title: '认识电位器 · 实验目的',
    desc: '电位器就是可调电阻：两端接 5V 和 GND，转动旋钮，中间脚就输出 0～5V 之间的电压',
    notes: '1-3 的 AD 实验已经用过电位器，这里复习它的接法。右边四条是原指南的说明：两端之间电阻固定，中间脚像一个滑块；本实验把它当分压器用，所以两端接 5V 和 GND，中间脚接 A0。左图红色箭头标的“接地 / 输出 / 输入”就是这三个脚。',
  });
  {
    const lw = 3.6;
    V.imageBox(s, { file: 'l21/pot_photo.jpg', x: L, y: TOP, w: lw, h: 2.65, caption: '原指南：旋转电位器（接地 / 输出 / 输入）' });
    txt(s, '电位器的三种用法', { x: L, y: TOP + 2.95, w: lw, h: 0.26, size: 12, bold: true, color: P.muted, valign: 'middle' });
    let px = L;
    for (const t of ['分压器', '变阻器', '电流控制器']) px += V.pill(s, { x: px, y: TOP + 3.29, text: t, size: 12, fill: P.turq }) + 0.1;
    const rx = L + lw + 0.35, rw = G.R - rx;
    const ly = numList(s, [
      [B('两端之间'), R('电阻固定；中间脚到任一端的电阻随旋钮变化')],
      [R('相当于从中间脚分成'), B('两段串联电阻'), R('，总阻值不变')],
      [B('当分压器用（本实验）：', { breakLine: true }), R('一端接输入电压，中间脚接输出，另一端接地')],
      [B('当可变电阻用：', { breakLine: true }), R('一端接输入电压，中间脚接输出，另一端悬空或接中间脚')],
    ], { x: rx, y: TOP, w: rw, size: 12.5, gap: 0.14 });
    const ty = Math.max(ly + 0.3, 3.95);
    tipBox(s, { x: rx, y: ty, w: rw, h: BOT - ty, kind: 'note', text: [B('实验目的　'), R('之前用按键（数字信号）控制灯的亮灭；这次用电位器（模拟信号）控制 LED 的亮度。')], size: 12.5 }, I.target);
  }

  // ---------------------------------------------------------------- wiring + parts
  s = slide({
    title: '接线：电位器接 A0，LED 接 11 号脚',
    desc: '电位器两端接 5V 和 GND、中间脚接 A0；LED 长脚接 11 号脚（带 ~），短脚经 220Ω 电阻接 GND',
    notes: '原指南只给了接线图，右边的表格是从图上读出来的：电位器左脚经红线接 5V，右脚经黑线接 GND，中间脚经蓝线接 A0；黄线从 11 号脚接到 LED 长脚，LED 短脚串一个 220Ω 电阻接到 GND。强调 LED 一定要接带 ~ 的引脚，11 号正好是。接线前先拔掉 USB。',
  });
  {
    const iw = 4.55;
    V.imageBox(s, { file: 'l21/pwm_wiring.jpg', x: L, y: TOP, w: iw, h: CH, diagram: true, caption: '原指南只有接线图，右表是从图上读出的' });
    const rx = L + iw + 0.35, rw = G.R - rx;
    const by = V.wiring(s, {
      x: rx, y: TOP, w: rw, right: '元件', colW: [1.25, rw - 1.25], rowH: 0.29,
      rows: [['5V', '电位器 一端'], ['A0', '电位器 中间脚'], ['GND', '电位器 另一端'], ['11', 'LED 长脚（正极）'], ['GND', '220Ω 电阻 → LED 短脚']],
    });
    const cy = by + 0.3;
    txt(s, '组件清单', { x: rx, y: cy, w: rw, h: 0.26, size: 12, bold: true, color: P.muted, valign: 'middle' });
    const cb = chips(s, ['UNO R3 主板', '面包板', 'USB 数据线', '10k 电位器 ×1', '红色 LED ×1', '220Ω 电阻 ×1', '若干跳线'], { x: rx, y: cy + 0.34, w: rw, size: 12 });
    if (cb > BOT + 0.01) warn(`parts chips overflow ${cb.toFixed(2)}`);
  }

  // ---------------------------------------------------------------- syntax: analogWrite / PWM pins
  s = slide({
    title: '新语法：analogWrite() 输出 PWM',
    desc: 'analogWrite(引脚, 值)：值 0～255 决定开着的时间占多少；只有带 ~ 的 3、5、6、9、10、11 号脚能用',
    notes: '1-3 光敏实验见过 analogWrite()，这次把它讲透：第二个参数 0～255 共 256 档，数值越大，“开”的时间占比越大，平均电压越高。左图四行把数值、波形、占空比和平均电压对应起来，128 正好约一半，平均约 2.5V。原指南写“频率固定 50Hz、参数 0～256”是笔误：UNO 的 PWM 约 490Hz（5、6 号约 980Hz），范围是 0～255。',
  });
  {
    const lw = 4.55;
    V.card(s, { x: L, y: TOP, w: lw, h: CH });
    txt(s, '同样是 5V，开着的时间比例不同', { x: L + 0.2, y: TOP + 0.14, w: lw - 0.4, h: 0.3, size: 13, bold: true, valign: 'middle' });
    const hdY = TOP + 0.52;
    txt(s, '占空比', { x: L + 3.15, y: hdY, w: 0.6, h: 0.22, size: 10, color: P.muted, align: 'center', valign: 'middle' });
    txt(s, '平均电压', { x: L + 3.72, y: hdY, w: 0.7, h: 0.22, size: 10, color: P.muted, align: 'center', valign: 'middle' });
    const rows = [[0, 0, '0V'], [64, 0.25, '1.25V'], [128, 0.5, '2.5V'], [255, 1, '5V']];
    rows.forEach(([v, d, volt], i) => {
      const y = TOP + 0.8 + i * 0.46;
      txt(s, `analogWrite(11, ${v})`, { x: L + 0.18, y, w: 1.75, h: 0.34, size: 10.5, mono: true, valign: 'middle', oneLine: true });
      pwmWave(s, L + 2.1, y + 0.04, 0.98, 0.26, d, 4);
      txt(s, `${Math.round(d * 100)}%`, { x: L + 3.15, y, w: 0.6, h: 0.34, size: 12, bold: true, align: 'center', valign: 'middle' });
      txt(s, volt, { x: L + 3.72, y, w: 0.7, h: 0.34, size: 12, bold: true, align: 'center', valign: 'middle' });
    });
    const ny = TOP + 0.8 + 4 * 0.46 + 0.14, nh = BOT - 0.16 - ny;
    V.card(s, { x: L + 0.18, y: ny, w: lw - 0.36, h: nh, fill: P.white, line: P.red, lineW: 1 });
    txt(s, [B('常见错误　', { color: P.red }), R('接在没有 ~ 的引脚上，', { breakLine: true }), R('analogWrite 只能让灯全亮或全灭。')],
      { x: L + 0.32, y: ny, w: lw - 0.64, h: nh, size: 12, valign: 'middle' });
    const rx = L + lw + 0.3, rw = G.R - rx;
    tipBox(s, { x: rx, y: TOP, w: rw, h: 0.9, kind: 'tip', title: '像一个 256 档的调光旋钮', text: '0 全灭，255 全亮，128 约一半亮。', size: 12 }, I.sliders);
    const my = TOP + 0.9 + 0.3;
    const mh = miniCode(s, 'pinMode(11, OUTPUT);\nanalogWrite(11, 128);  // 约一半亮', { x: rx, y: my, w: rw, size: 11.5 });
    const py = my + mh + 0.3;
    txt(s, '能用的引脚', { x: rx, y: py, w: 1.0, h: 0.3, size: 12, bold: true, valign: 'middle' });
    let px = rx + 1.02;
    for (const p of ['~3', '~5', '~6', '~9', '~10', '~11']) px += V.pill(s, { x: px, y: py, h: 0.3, text: p, size: 11, fill: p === '~11' ? P.turq : P.gray1, mono: true }) + 0.08;
    if (px > G.R + 0.01) warn('pin pills too wide');
    const ty = py + 0.3 + 0.3;
    tipBox(s, { x: rx, y: ty, w: rw, h: BOT - ty, kind: 'note', text: [B('原指南笔误　'), R('频率约 490Hz，不是 50Hz；范围 0～255，不是 0～256。')], size: 12 }, I.book);
  }

  // ---------------------------------------------------------------- code 1/2 + program idea
  s = slide({
    title: '代码逐行看懂（1/2）：准备工作',
    desc: '先给引脚起名字、准备装数据的“盒子”，再在 setup() 里设好输入输出和串口；下方是整个程序的思路',
    notes: '前 4 行准备了引脚名和两个变量：value 是整数，装读数；voltage 是 float，能装小数。setup() 里把 A0 设为输入、11 号设为输出，再打开串口。下方的四步是原指南的“程序原理”：读旋钮 → 换成比例 → 换成 PWM 值 → 输出，下一页的 loop() 就是照这四步写的。',
  });
  {
    const cw = 5.35, ch = 2.6;
    const b = code(s, { x: L, y: TOP, w: cw, h: ch, code: PWM_CODE, from: 1, to: 10, hl: [1, 2, 3, 4], file: 'pwm_led.ino', right: '第 1–10 行', allowWrap: true });
    V.explain(s, b, { x: L + cw + 0.35, w: G.R - (L + cw + 0.35), title: '逐行看懂', maxY: TOP + ch, gap: 0.12, items: [
      { line: [1, 2], text: '起名字：A0 读电位器，\n11 号脚（带 ~）接 LED' },
      { line: [3, 4], text: 'value 装整数读数，\nvoltage 装带小数的数' },
      { line: [7, 8], text: 'A0 设为输入，11 号设为输出' },
      { line: 9, text: '打开串口，波特率 9600' },
    ] });
    const sy = TOP + ch + 0.3, sh = BOT - sy;
    V.card(s, { x: L, y: sy, w: CW, h: sh, fill: P.turqPale });
    txt(s, [B('程序原理', { breakLine: true }), R('（原指南）', { fontSize: 11, color: P.muted })], { x: L + 0.18, y: sy, w: 1.1, h: sh, size: 13, valign: 'middle' });
    const st = [['analogRead()', '读旋钮 0～1023'], ['÷ 1023', '换成 0～1 的比例'], ['× 256', '换成 PWM 值'], ['analogWrite()', '输出，LED 跟着变']];
    const x0 = L + 1.35, aw = 0.3, stw = (G.R - 0.15 - x0 - aw * 3) / 4;
    st.forEach(([c, d], i) => {
      const x = x0 + i * (stw + aw);
      V.card(s, { x, y: sy + 0.1, w: stw, h: sh - 0.2, fill: P.white });
      txt(s, [M(c, { bold: true, breakLine: true }), R(d, { fontSize: 12 })], { x: x + 0.1, y: sy + 0.1, w: stw - 0.2, h: sh - 0.2, size: 12, align: 'center', valign: 'middle' });
      if (V.textW(d, 12) > stw - 0.2) warn('program idea step too wide: ' + d);
      if (i < 3) V.arrow(s, x + stw + 0.04, sy + sh / 2, x + stw + aw - 0.04, sy + sh / 2, { color: P.muted });
    });
  }

  // ---------------------------------------------------------------- code 2/2
  s = slide({
    title: '代码逐行看懂（2/2）：读数、换算、输出',
    desc: 'loop() 不停地重复：读旋钮 → 换成 0～1 的比例 → 换成 PWM 值 → 点亮 LED，同时把三个数打印出来',
    notes: '高亮的四行就是上一页的四步。第 16 行先用 (float) 把读数变成小数再除以 1023，得到 0～1 的比例——原注释写“计算电压”，其实没有乘 5，所以它并不是电压。第 19 行乘 256 再用 (int) 去掉小数，得到 PWM 值；读数满 1023 时会算出 256，这个坑后面专门讲。其余几行把三个数打印到同一行，delay(0) 等于不等待。',
  });
  {
    const cw = 5.45;
    const b = code(s, { x: L, y: TOP, w: cw, h: CH, code: PWM_CODE, from: 11, to: 24, hl: [13, 16, 19, 22], file: 'pwm_led.ino', right: '第 11–24 行', allowWrap: true });
    V.explain(s, b, { x: L + cw + 0.35, w: G.R - (L + cw + 0.35), title: '逐行看懂', maxY: BOT, gap: 0.07, items: [
      { line: 13, text: '读电位器 → 0～1023' },
      { line: [14, 15], text: '打印 value1== 和读数' },
      { line: 16, text: '变小数再 ÷1023 → 0～1 比例' },
      { line: [17, 18], text: '打印 voltage== 和比例' },
      { line: 19, text: '× 256 再取整 → PWM 值' },
      { line: [20, 21], text: '打印 PWM== 和数值，换行' },
      { line: 22, text: '按 PWM 值点亮 LED' },
      { line: 23, text: 'delay(0)：不等待' },
    ] });
  }

  // ---------------------------------------------------------------- result
  s = slide({
    title: '实验结果：旋钮一转，LED 跟着变亮变暗',
    desc: '转动电位器，LED 亮度连续变化；串口监视器里 voltage 和 value 的数值也跟着变',
    notes: '上传程序后打开串口监视器（9600），一边转旋钮一边看灯和数字。提醒学生两点：voltage 只在 0.00～1.00 之间变化，因为程序算的是比例；截图是“两行一组”，而这段程序打印的是一行三项，说明截图来自旧版程序，以自己屏幕上的输出为准。',
  });
  {
    const pw = 3.55, sw = 3.2, ph = 2.45;
    V.imageBox(s, { file: 'l21/pwm_result_photo.jpg', x: L, y: TOP, w: pw, h: ph, caption: '原指南实物图' });
    const cy = TOP + ph + 0.3, chh = BOT - cy;
    V.card(s, { x: L, y: cy, w: pw, h: chh, fill: P.turqPale });
    txt(s, [B('原指南结论', { breakLine: true }), R('转动电位器，灯的明暗随之变化；串口里 voltage 和 value 的数值也跟着变化。')], { x: L + 0.16, y: cy + 0.08, w: pw - 0.32, h: chh - 0.16, size: 12, valign: 'middle' });
    const sx = L + pw + 0.3;
    V.imageBox(s, { file: 'l21/pwm_serial_monitor.jpg', x: sx, y: TOP, w: sw, h: CH, caption: '原指南串口截图', fill: P.white, line: P.gray2 });
    const nx = sx + sw + 0.3, nw = G.R - nx;
    txt(s, '读懂截图', { x: nx, y: TOP, w: nw, h: 0.3, size: 13, bold: true, valign: 'middle' });
    const notes = [
      [B('voltage 只到 1.00', { breakLine: true }), R('程序算的是 0～1 的比例，没有乘 5')],
      [B('格式略有不同', { breakLine: true }), R('截图两行一组，程序是一行三项——截图来自旧版程序')],
    ];
    let ny = TOP + 0.42;
    notes.forEach((t) => {
      const h = hOf(plainOf(t), nw - 0.28, 12, 1.25) + 0.2;
      V.card(s, { x: nx, y: ny, w: nw, h });
      txt(s, t, { x: nx + 0.14, y: ny + 0.1, w: nw - 0.28, h: h - 0.2, size: 12 });
      ny += h + 0.3;
    });
    if (ny - 0.3 > BOT + 0.01) warn('result notes overflow');
  }

  // ---------------------------------------------------------------- pitfalls + try
  s = slide({
    title: '常见坑与动手改一改',
    desc: 'voltage 其实是比例、× 256 会越界、delay(0) 刷屏太快——用 map() 和 × 5 把程序改得更靠谱',
    notes: '左边三个坑都来自这段程序本身。最隐蔽的是第二个：读数正好 1023 时算出 256，超出 analogWrite 的 0～255，灯会突然几乎熄灭，而不是最亮。右边三个改法当堂试：用 map() 一步换算、乘 5 打印真实电压、把 map 的最后两个数对调让旋钮反着调。每次只改一处，上传后看串口验证。',
  });
  {
    const lw = 4.35, th = (CH - 0.6) / 3;
    const W = [
      ['voltage 不是电压', '它是 0～1 的比例；要真实电压还得 × 5。'],
      ['× 256 会越界', '读数 1023 时算出 256，灯反而几乎熄灭。'],
      ['delay(0) 等于不等', '串口刷屏太快；改成 delay(100) 更好读。'],
    ];
    W.forEach(([t, d], i) => tipBox(s, { x: L, y: TOP + i * (th + 0.3), w: lw, h: th, kind: 'warn', title: t, text: d, size: 12 }, I.warn_w));
    const rx = L + lw + 0.3, rw = G.R - rx;
    V.card(s, { x: rx, y: TOP, w: rw, h: CH });
    V.iconCircle(s, I.wrench, { x: rx + 0.2, y: TOP + 0.16, d: 0.4 });
    txt(s, '动手改一改', { x: rx + 0.74, y: TOP + 0.16, w: 2.5, h: 0.4, size: 15, bold: true, valign: 'middle' });
    const C = [
      ['用 map() 一步换算，不会越界', 'value = map(value, 0, 1023, 0, 255);'],
      ['打印真实电压（0～5V）', 'voltage = (float)value / 1023 * 5;'],
      ['旋钮反着调：越转越暗', 'map(value, 0, 1023, 255, 0)'],
    ];
    let y = TOP + 0.72;
    C.forEach(([t, c], i) => {
      V.numCircle(s, i + 1, { x: rx + 0.2, y, d: 0.28, size: 10.5 });
      txt(s, t, { x: rx + 0.58, y: y - 0.02, w: rw - 0.78, h: 0.32, size: 12.5, bold: true, valign: 'middle', oneLine: true });
      const h = miniCode(s, c, { x: rx + 0.58, y: y + 0.38, w: rw - 0.78, size: 10.5 });
      y += 0.38 + h + 0.26;
    });
    if (y - 0.26 > BOT - 0.1) warn(`try card overflow ${y.toFixed(2)}`);
  }
}

// ================================================================ 实验 02　RGB 贴片模块呼吸灯
function vennRGB(s, cx, cy, d) {
  const a = 0.32 * d, b = 0.185 * d, c = 0.37 * d;
  const cs = [[cx - a, cy - b], [cx + a, cy - b], [cx, cy + c]];
  for (const [x, y] of cs) s.addShape('ellipse', { x: x - d / 2, y: y - d / 2, w: d, h: d, fill: { color: P.turq, transparency: 72 }, line: { color: P.turqDeep, width: 1 } });
  const lab = (t, x, y, o = {}) => V.text(s, t, { x: x - 0.4, y: y - 0.13, w: 0.8, h: 0.26, size: o.size || 11, bold: o.bold ?? true, align: 'center', valign: 'middle', color: o.color || P.ink });
  lab('R 红', cx - a - 0.2 * d, cy - b - 0.16 * d, { size: 12 });
  lab('G 绿', cx + a + 0.2 * d, cy - b - 0.16 * d, { size: 12 });
  lab('B 蓝', cx, cy + c + 0.24 * d, { size: 12 });
  lab('黄', cx, cy - 0.3 * d);
  lab('品红', cx - 0.27 * d, cy + 0.17 * d);
  lab('青', cx + 0.27 * d, cy + 0.17 * d);
  lab('白', cx, cy + 0.02 * d, { size: 12 });
}

function buildRGB({ deck, I, slide }) {
  let s;
  deck.section('实验二　RGB 呼吸灯');
  deck.divider({
    kicker: '实验 02',
    title: 'RGB 贴片模块\n呼吸灯实验',
    desc: '一颗 RGB LED 里藏着红、绿、蓝三盏小灯。用三路 PWM 分别调它们的亮度，叠加起来就能混出各种颜色；再用 for 循环一点点加亮，做出渐变的效果。',
    tiles: [
      { fill: P.turq, big: '01', title: '原理', sub: '红绿蓝 · 加色混合', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: 'R→11 · G→10 · B→9', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: 'setColor(r,g,b) · for', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '红、绿、蓝依次渐亮', subSize: 12 },
    ],
    notes: '实验二接着用 PWM，只是一次控制三路。新语法有两个：#define 给数字起外号、带参数的函数 setColor()。for 循环 1-3 学过，这次让循环变量 i 直接当亮度用，就有了渐变效果。',
  });

  // ---------------------------------------------------------------- intro + principle
  s = slide({
    title: '认识 RGB LED：三原色混出千万种颜色',
    desc: '红、绿、蓝三个通道各有 0～255 共 256 级亮度，叠加起来能混出 256³ = 16777216 种颜色',
    notes: 'RGB 是红、绿、蓝三个英文单词的首字母，屏幕上的每个像素也是这样混色的。每个通道 256 级，三个通道自由组合就是 256 × 256 × 256 = 16777216 种颜色，多到肉眼几乎分不出和真实颜色的差别。右图是“加色混合”：光叠加得越多越亮，三色全开就是白光——这和颜料越混越暗正好相反。',
  });
  {
    const lw = 4.6;
    V.imageBox(s, { file: 'l21/rgb_module_photo.jpg', x: L, y: TOP, w: lw, h: 2.3, caption: '原指南：RGB LED 模块正面 / 反面（引脚 R、G、B、GND）' });
    const fy = TOP + 2.3 + 0.3, fh = BOT - fy;
    V.card(s, { x: L, y: fy, w: lw, h: fh, fill: P.turqPale });
    txt(s, '256 × 256 × 256 = 16 777 216', { x: L + 0.2, y: fy + 0.1, w: lw - 0.4, h: 0.36, size: 17, bold: true, mono: true, valign: 'middle', oneLine: true });
    txt(s, '每个通道 256 级，三个通道自由组合——颜色多到肉眼几乎分不出和自然颜色的差别。', { x: L + 0.2, y: fy + 0.5, w: lw - 0.4, h: fh - 0.56, size: 12 });
    const rx = L + lw + 0.3, rw = G.R - rx;
    V.card(s, { x: rx, y: TOP, w: rw, h: CH });
    txt(s, '加色混合：光叠加得越多越亮', { x: rx + 0.2, y: TOP + 0.14, w: rw - 0.4, h: 0.32, size: 14, bold: true, valign: 'middle', oneLine: true });
    vennRGB(s, rx + rw / 2, TOP + 1.33, 1.12);
    txt(s, [B('全为 0：'), R('熄灭　　'), B('全为 255：'), R('最亮的白光', { breakLine: true }), R('混得越多越亮——原指南说的“添加剂混合”，就是加色混合。')],
      { x: rx + 0.2, y: TOP + 2.58, w: rw - 0.4, h: CH - 2.7, size: 12 });
  }

  // ---------------------------------------------------------------- parts + wiring
  s = slide({
    title: '组件清单与接线：R→11，G→10，B→9',
    desc: 'RGB 模块的 R、G、B 三个脚分别接 UNO 的 11、10、9 号脚（都带 ~，能输出 PWM），“−”接 GND',
    notes: '照接线表接四根线：红线 R 接 11，绿线 G 接 10，蓝线 B 接 9，黑线接 GND。三个颜色脚都必须接带 ~ 的引脚，因为每一路都要用 PWM 调亮度。这个模块用法和光敏实验里的 RGB 模块一样，只是这次三种颜色都用上了。',
  });
  {
    const iw = 4.9;
    V.imageBox(s, { file: 'l21/rgb_wiring.jpg', x: L, y: TOP, w: iw, h: CH, diagram: true, caption: '原指南接线图（红 R · 绿 G · 蓝 B · 黑 GND）' });
    const rx = L + iw + 0.35, rw = G.R - rx;
    const by = V.wiring(s, { x: rx, y: TOP, w: rw, right: 'RGB 模块', rowH: 0.34, rows: [['11', 'R'], ['10', 'G'], ['9', 'B'], ['GND', '−']] });
    const cy = by + 0.35;
    txt(s, '组件清单', { x: rx, y: cy, w: rw, h: 0.26, size: 12, bold: true, color: P.muted, valign: 'middle' });
    const cb = chips(s, ['UNO R3 主板', '面包板', 'USB 数据线', 'RGB LED 模块 ×1', '若干跳线'], { x: rx, y: cy + 0.34, w: rw, size: 12 });
    if (cb > BOT + 0.01) warn(`parts chips overflow ${cb.toFixed(2)}`);
  }

  // ---------------------------------------------------------------- syntax: #define + function parameters
  s = slide({
    title: '新语法：#define 和带参数的函数',
    desc: '#define 给数字起个好记的外号；带参数的函数像能“点单”的菜谱——setColor(红, 绿, 蓝) 报三个亮度就行',
    notes: '#define 像手机通讯录：存一次“RGB_RED 就是 11”，以后写名字就行，编译时会自动换回 11。1-3 学过的函数是“不带材料”的菜谱；这次的 setColor 带三个参数，像点奶茶要报甜度和冰量，调用时报的三个数会按顺序装进 red、green、blue。两个常见错误：#define 行末加分号或等号；参数顺序弄反，颜色就错了。',
  });
  {
    const lw = 4.15;
    let y = iconCard(s, I.tag, '#define：给数字起外号', { x: L, y: TOP, w: lw, h: CH, titleSize: 14.5 });
    const iw = lw - 0.4;
    const t1 = '像手机通讯录：存一次“RGB_RED 就是 11”，以后写名字就行。换引脚时只改这一行。';
    const h1 = hOf(t1, iw, 12.5, 1.25);
    txt(s, t1, { x: L + 0.2, y, w: iw, h: h1, size: 12.5 });
    y += h1 + 0.16;
    y += miniCode(s, '#define RGB_RED   11\npinMode(RGB_RED,OUTPUT);\n// 等于 pinMode(11,OUTPUT);', { x: L + 0.2, y, w: iw, size: 11 }) + 0.3;
    const wh = 0.72;
    V.card(s, { x: L + 0.2, y, w: iw, h: wh, fill: P.white, line: P.red, lineW: 1 });
    txt(s, [B('常见错误　', { color: P.red }), R('行末加分号或写等号：', { breakLine: true }), M('#define RGB_RED = 11;')], { x: L + 0.34, y, w: iw - 0.28, h: wh, size: 12, valign: 'middle' });
    if (y + wh > BOT - 0.12) warn('#define warn card low');
    const rx = L + lw + 0.3, rw = G.R - rx;
    y = iconCard(s, I.mug, '带参数的函数：能“点单”的菜谱', { x: rx, y: TOP, w: rw, h: CH, titleSize: 14.5 });
    const t2 = '点奶茶要报甜度、冰量；调用 setColor() 要报红、绿、蓝三个亮度，按顺序装进三个参数。';
    const h2 = hOf(t2, rw - 0.4, 12.5, 1.25);
    txt(s, t2, { x: rx + 0.2, y, w: rw - 0.4, h: h2, size: 12.5 });
    y += h2 + 0.16;
    // parameter mapping: setColor( 255 , 128 , 0 )
    const size = 15, cy = y;
    const parts = ['setColor(', '255', ' , ', '128', ' , ', '0', ');'];
    let x = rx + 0.3;
    const centers = [];
    parts.forEach((p, i) => {
      const w = V.monoW(p, size) + (i % 2 === 1 ? 0.24 : 0.04);
      if (i % 2 === 1) {
        V.card(s, { x, y: cy, w, h: 0.38, fill: P.white, line: P.turqDeep, radius: 0.06 });
        centers.push(x + w / 2);
      }
      V.text(s, p, { x, y: cy, w, h: 0.38, size, mono: true, bold: true, align: 'center', valign: 'middle' });
      x += w + 0.04;
    });
    if (x > rx + rw - 0.1) warn('setColor mapping too wide');
    const labs = [['red', '红'], ['green', '绿'], ['blue', '蓝']];
    const ly = cy + 0.5;
    centers.forEach((c, i) => {
      seg(s, c, cy + 0.38, c, ly, { color: P.turqDeep, width: 1.25 });
      V.text(s, [M(labs[i][0], { bold: true, breakLine: true }), R(labs[i][1], { color: P.muted })], { x: c - 0.45, y: ly + 0.02, w: 0.9, h: 0.44, size: 11.5, align: 'center', valign: 'top', lineSpacingMultiple: 1.0 });
    });
    y = ly + 0.46 + 0.16;
    const mh = miniCode(s, 'setColor(255, 128, 0);  // 红 + 半个绿 ≈ 橙\nsetColor(255, 255, 0);  // 红 + 绿 = 黄', { x: rx + 0.2, y, w: rw - 0.4, size: 11 });
    y += mh + 0.16;
    txt(s, [B('常见错误　', { color: P.red }), R('参数按顺序对号入座：第 1 个永远是红色。')], { x: rx + 0.2, y, w: rw - 0.4, h: BOT - 0.1 - y, size: 12, oneLine: true });
  }

  // ---------------------------------------------------------------- code 1/3
  s = slide({
    title: '代码逐行看懂（1/3）：起外号、setup() 和 setColor()',
    desc: '前三行给三个引脚起外号，setup() 把它们设为输出；setColor() 一次把三个亮度送到三路 PWM',
    notes: '第 1–3 行用 #define 起外号，注意行末没有分号。setup() 只做一次：三个颜色脚都设为输出。第 12–17 行定义 setColor()：括号里的 int red, int green, int blue 是三个参数，调用时传进来的三个数就装在里面，再由三个 analogWrite 分别送到 11、10、9 号脚。',
  });
  {
    const cw = 4.9;
    const b = code(s, { x: L, y: TOP, w: cw, h: CH, code: RGB_CODE, from: 1, to: 17, hl: [1, 2, 3, 12, 14, 15, 16], file: 'rgb_breath.ino', right: '第 1–17 行' });
    V.explain(s, b, { x: L + cw + 0.35, w: G.R - (L + cw + 0.35), title: '逐行看懂', maxY: BOT, gap: 0.14, items: [
      { line: [1, 3], text: '起外号：RED 是 11，\nGREEN 是 10，BLUE 是 9' },
      { line: [5, 10], text: 'setup()：三个颜色脚都设为输出' },
      { line: 12, text: '定义 setColor()：三个参数\nred、green、blue 装三个亮度' },
      { line: [14, 16], text: '三个亮度分别交给三路 PWM：\n红、绿、蓝同时调好' },
    ] });
  }

  // ---------------------------------------------------------------- code 2/3
  s = slide({
    title: '代码逐行看懂（2/3）：for 循环让红灯渐亮',
    desc: 'i 从 0 数到 255，每数一下就把 i 当作红色亮度送出去，再停 4 毫秒——红灯就一级一级亮起来',
    notes: 'for 循环 1-3 学过：起点 i=0，条件 i<256，每圈 i++。这次的新用法是把计数器 i 直接当亮度：setColor(i,0,0) 让红色等于 i，绿和蓝为 0。256 级 × 4 毫秒约 1 秒，所以红灯用 1 秒从灭到最亮，然后停 0.5 秒。可以请学生算一算：delay(4) 改成 delay(10) 要多久？',
  });
  {
    const cw = 5.2, ch = 2.68;
    const b = code(s, { x: L, y: TOP, w: cw, h: ch, code: RGB_CODE, from: 19, to: 28, hl: [22, 24, 25], file: 'rgb_breath.ino', right: '第 19–28 行' });
    V.explain(s, b, { x: L + cw + 0.35, w: G.R - (L + cw + 0.35), title: '逐行看懂', maxY: TOP + ch, gap: 0.12, items: [
      { line: 19, text: 'loop()：一轮一轮地重复' },
      { line: [21, 22], text: '计数器 i 从 0 数到 255，\n一共 256 次' },
      { line: [24, 25], text: '红色亮度 = i，绿蓝为 0；\n每一级停 4 毫秒' },
      { line: 27, text: '红色最亮后，停 0.5 秒' },
    ] });
    const sy = TOP + ch + 0.3, sh = BOT - sy;
    V.card(s, { x: L, y: sy, w: CW, h: sh });
    txt(s, [B('256 级 × 4 毫秒', { breakLine: true }), R('≈ 1 秒从灭到最亮', { color: P.muted })], { x: L + 0.2, y: sy, w: 2.0, h: sh, size: 12.5, valign: 'middle' });
    const bx = L + 2.4, bw = G.R - 0.25 - bx, byy = sy + 0.38, bh = 0.26;
    gradBar(s, bx, byy, bw, bh, 32);
    [[0, 'i = 0　灭'], [64, '64'], [128, '128'], [192, '192'], [255, '255　最亮']].forEach(([v, t]) => {
      const tx = bx + bw * v / 255;
      const w = 1.2, al = v === 0 ? 'left' : v === 255 ? 'right' : 'center';
      const lx = v === 0 ? tx : v === 255 ? tx - w : tx - w / 2;
      V.text(s, t, { x: lx, y: sy + 0.1, w, h: 0.24, size: 10.5, bold: true, align: al, valign: 'middle', mono: false });
    });
  }

  // ---------------------------------------------------------------- code 3/3
  s = slide({
    title: '代码逐行看懂（3/3）：绿灯、蓝灯照样来一遍',
    desc: '后两段 for 循环和红色完全一样，只是把 i 交给绿色、蓝色；最后一段只停 0.1 秒就回到开头',
    notes: '让学生先找不同：三段 for 只有 setColor 里 i 的位置不一样。注意 setColor(0,i,0) 一开始就把红色设成 0，所以红灯是“突然熄灭”的，下一页的实验结果和后面的“动手改一改”都会用到这个发现。第 42 行的右大括号结束 loop()，然后马上回到第 19 行，红色重新开始。',
  });
  {
    const cw = 5.2;
    const b = code(s, { x: L, y: TOP, w: cw, h: CH, code: RGB_CODE, from: 29, to: 42, hl: [29, 31, 38], file: 'rgb_breath.ino', right: '第 29–42 行' });
    const ex = L + cw + 0.35, ew = G.R - ex;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: BOT, gap: 0.12, items: [
      { line: 29, text: '同样的 for：i 再从 0 数到 255' },
      { line: 31, text: '这次 i 交给绿色——红色一下子\n变成 0，所以是“突然熄灭”' },
      { line: 34, text: '绿色最亮后停 0.5 秒' },
      { line: [36, 40], text: '再交给蓝色，从 0 渐亮到 255' },
      { line: 41, text: '蓝色最亮后只停 0.1 秒' },
      { line: 42, text: 'loop() 结束，回到第 19 行' },
    ] });
  }

  // ---------------------------------------------------------------- result
  s = slide({
    title: '实验结果：红、绿、蓝依次由暗变亮',
    desc: '每种颜色约 1 秒从暗到最亮，停一下就换下一种颜色；一轮约 4.2 秒，循环往复',
    notes: '原指南的结果写的是“先是红色，然后绿色、蓝色”，照片拍下的是绿色那一段。让学生对照右边的时间线观察：渐亮约 1 秒，停 0.5 秒，然后颜色突然切换。一轮 1.02 + 0.5 + 1.02 + 0.5 + 1.02 + 0.1 ≈ 4.2 秒。看到“突然熄灭”了吗？这说明它还不是真正的“呼吸”，下一页来改。',
  });
  {
    const pw = 4.2;
    V.imageBox(s, { file: 'l21/rgb_result_photo.jpg', x: L, y: TOP, w: pw, h: CH, caption: '原指南实物图：模块正在亮绿光' });
    const rx = L + pw + 0.3, rw = G.R - rx;
    tipBox(s, { x: rx, y: TOP, w: rw, h: 0.8, kind: 'note', text: [B('原指南　'), R('RGB LED 先亮红色，然后绿色、蓝色，循环往复。')], size: 12.5 }, I.check);
    const cy = TOP + 0.8 + 0.3, chh = 1.45;
    V.card(s, { x: rx, y: cy, w: rw, h: chh });
    txt(s, '一轮 loop() 的时间线（约 4.2 秒）', { x: rx + 0.2, y: cy + 0.12, w: rw - 0.4, h: 0.3, size: 13, bold: true, valign: 'middle', oneLine: true });
    const segs = [['红', 1.024, true], ['停', 0.5], ['绿', 1.024, true], ['停', 0.5], ['蓝', 1.024, true], ['', 0.1]];
    const total = segs.reduce((a, x) => a + x[1], 0);
    const tx0 = rx + 0.2, tw = rw - 0.4, ty = cy + 0.8, th = 0.32;
    let x = tx0;
    segs.forEach(([t, dur, fade]) => {
      const w = tw * dur / total;
      if (fade) gradBar(s, x, ty, w - 0.02, th, 14);
      else s.addShape('rect', { x, y: ty, w: w - 0.02, h: th, fill: { color: P.gray1 }, line: { color: P.gray2, width: 0.5 } });
      if (t) V.text(s, fade ? `${t}渐亮` : '停', { x, y: ty - 0.32, w, h: 0.26, size: 11, bold: !!fade, align: 'center', valign: 'middle' });
      if (dur >= 0.5) V.text(s, fade ? '1.0s' : '0.5s', { x, y: ty + th + 0.04, w, h: 0.22, size: 10, color: P.muted, align: 'center', valign: 'middle' });
      x += w;
    });
    V.text(s, '0.1s', { x: x - 0.45, y: ty + th + 0.04, w: 0.45, h: 0.22, size: 10, color: P.muted, align: 'right', valign: 'middle' });
    const by = cy + chh + 0.3;
    tipBox(s, { x: rx, y: by, w: rw, h: BOT - by, kind: 'tip', text: [B('眼睛看到的　'), R('渐亮 → 停一下 → 突然熄灭、换色。')], size: 12.5 }, I.eye);
  }

  // ---------------------------------------------------------------- try: real breathing
  s = slide({
    title: '动手改一改：让灯真正“呼吸”起来',
    desc: '原程序只会“渐亮后突然熄灭”；再加一段 i 从 255 减到 0 的循环，灯就会慢慢亮、慢慢暗',
    notes: '先看左边两张亮度曲线：原程序像锯齿，亮到顶就掉下来；真正的呼吸像山峰，一呼一吸。改法很简单：在红色渐亮的 for 后面，再加一个 i 从 255 减到 0 的 for，绿色、蓝色照样各加一段。i-- 表示每圈减 1。顺便提醒一个边界错误：i<256 不能写成 i<=256，否则 i 会数到 256，超出 0～255。',
  });
  {
    const lw = 4.2;
    V.card(s, { x: L, y: TOP, w: lw, h: CH });
    const graph = (y, title, pts) => {
      txt(s, title, { x: L + 0.2, y, w: lw - 0.4, h: 0.28, size: 12.5, bold: true, valign: 'middle', oneLine: true });
      const gx = L + 0.55, gy = y + 0.42, gw = lw - 0.85, gh = 0.95;
      V.arrow(s, gx, gy + gh, gx + gw, gy + gh, { color: P.muted, width: 1 });
      V.arrow(s, gx, gy + gh, gx, gy - 0.05, { color: P.muted, width: 1 });
      V.text(s, '亮度', { x: L + 0.12, y: gy - 0.02, w: 0.42, h: 0.22, size: 10, color: P.muted, valign: 'middle' });
      V.text(s, '时间', { x: gx + gw - 0.45, y: gy + gh + 0.02, w: 0.45, h: 0.2, size: 10, color: P.muted, align: 'right', valign: 'middle' });
      polyline(s, pts.map(([u, v]) => [gx + 0.05 + u * (gw - 0.25), gy + gh - v * (gh - 0.12)]), { color: P.turqDeep, width: 2.25 });
    };
    graph(TOP + 0.15, '原程序：渐亮后突然熄灭（像锯齿）', [[0, 0], [0.28, 1], [0.33, 1], [0.33, 0], [0.61, 1], [0.66, 1], [0.66, 0], [0.94, 1], [1, 1]]);
    graph(TOP + 1.95, '加上渐暗：一呼一吸（像山峰）', [[0, 0], [0.25, 1], [0.5, 0], [0.75, 1], [1, 0]]);
    const rx = L + lw + 0.3, rw = G.R - rx;
    const c1h = 2.2;
    V.card(s, { x: rx, y: TOP, w: rw, h: c1h });
    V.numCircle(s, 1, { x: rx + 0.2, y: TOP + 0.16, d: 0.3, size: 11 });
    txt(s, '在红色渐亮之后，加一段渐暗', { x: rx + 0.6, y: TOP + 0.14, w: rw - 0.8, h: 0.34, size: 13, bold: true, valign: 'middle', oneLine: true });
    const mh = miniCode(s, 'for(i=255;i>=0;i--)   // 从 255 往下数\n{\n  setColor(i,0,0);\n  delay(4);\n}', { x: rx + 0.2, y: TOP + 0.58, w: rw - 0.4, size: 11, hl: [0] });
    txt(s, '绿色、蓝色照样各加一段，三种颜色就都会“呼吸”。', { x: rx + 0.2, y: TOP + 0.58 + mh + 0.08, w: rw - 0.4, h: 0.28, size: 12, oneLine: true });
    if (TOP + 0.58 + mh + 0.36 > TOP + c1h) warn('breath card overflow');
    const wy = TOP + c1h + 0.3, wh = BOT - wy;
    const ww = (rw - 0.3) / 2;
    V.card(s, { x: rx, y: wy, w: ww, h: wh });
    V.numCircle(s, 2, { x: rx + 0.16, y: wy + 0.15, d: 0.3, size: 11 });
    txt(s, '混出新颜色', { x: rx + 0.54, y: wy + 0.13, w: ww - 0.64, h: 0.34, size: 13, bold: true, valign: 'middle' });
    txt(s, [M('setColor(255,255,0)', { bold: true, breakLine: true }), R('红 + 绿 = 黄')], { x: rx + 0.16, y: wy + 0.56, w: ww - 0.28, h: wh - 0.64, size: 11.5, oneLine: true });
    warnCard(s, I.times_w, '边界别写错', [M('i<=256'), R(' 会数到 256，超出 0～255')], { x: rx + ww + 0.3, y: wy, w: ww, h: wh });
  }
}

// ================================================================ 实验 03　电位器调节舵机
function buildServo({ deck, I, slide }) {
  let s;
  deck.section('实验三　电位器调节舵机');
  deck.divider({
    kicker: '实验 03',
    title: '电位器调节舵机实验',
    desc: '舵机是一种能转到指定角度并停住的电机，航模、遥控机器人和机械臂都离不开它。这次用电位器当旋钮：旋钮转多少，舵机就跟着转多少。',
    tiles: [
      { fill: P.turq, big: '01', title: '原理', sub: '闭环反馈 · 脉宽定角度', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: '电位器 → A0，舵机 → 7', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: 'Servo 库 · write()', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '旋钮控制角度', subSize: 12 },
    ],
    notes: '实验三从“调亮度”变成“调角度”。先认识舵机内部的闭环反馈，再看它听懂的信号：每 20 毫秒一个脉冲，脉冲越宽角度越大。代码部分第一次用到“库”，Servo 库帮我们把复杂的脉冲都发好，我们只管说角度。',
  });

  // ---------------------------------------------------------------- intro
  s = slide({
    title: '认识舵机：转到指定角度并停住',
    desc: '舵机（伺服电机）能转到 0～180° 之间的任意角度并保持住，常用在航模、遥控机器人和机械臂里',
    notes: '把 SG90 舵机传下去让学生看：一个小盒子、一根输出轴、三根线。“舵机”是俗称，本名叫伺服电机：普通电机只会一直转，舵机能转到指定角度并停住，外力推它还会顶回去。它里面有四样东西：电机、减速齿轮、检测角度的电位器和控制电路，下一页看它们怎么配合。',
  });
  {
    const iw = 3.9;
    V.imageBox(s, { file: 'l21/servo_photo.jpg', x: L, y: TOP, w: iw, h: CH, caption: '原指南：SG90 舵机与舵盘、螺丝' });
    const rx = L + iw + 0.35, rw = G.R - rx;
    const ly = lead(s, '它是什么', '“舵机”是俗称，本名叫伺服电机：能转到 0～180° 中的指定角度并停住，外力推它也会顶回去。', { x: rx, y: TOP, w: rw, size: 12.5 });
    const cy = ly + 0.22, cw2 = (rw - 0.2) / 2, chh = 0.56;
    const comps = [[I.cog, '直流电机', '提供转动的动力'], [I.cogs, '减速齿轮组', '降低转速、增大力量'], [I.sliders, '电位器', '检测转到了多少度'], [I.chip, '控制电路', '比较角度、指挥电机']];
    comps.forEach(([ic, t, d], i) => {
      const x = rx + (i % 2) * (cw2 + 0.2), y = cy + Math.floor(i / 2) * (chh + 0.15);
      V.card(s, { x, y, w: cw2, h: chh });
      V.iconCircle(s, ic, { x: x + 0.12, y: y + (chh - 0.36) / 2, d: 0.36 });
      txt(s, [B(t, { breakLine: true }), R(d, { color: P.muted })], { x: x + 0.58, y, w: cw2 - 0.66, h: chh, size: 12, valign: 'middle' });
    });
    const ty = cy + 2 * chh + 0.15 + 0.3;
    tipBox(s, { x: rx, y: ty, w: rw, h: BOT - ty, kind: 'note', size: 12, text: [
      B('实验目的　'), R('用电位器控制舵机转动', { breakLine: true }),
      B('组件　'), R('UNO 主板、面包板、USB 数据线、', { breakLine: true }),
      R('　　　10k 电位器 ×1、SG90 舵机 ×1、若干跳线'),
    ] }, I.target);
  }

  // ---------------------------------------------------------------- inside + closed loop
  s = slide({
    title: '工作原理：边转边比较的“闭环”',
    desc: '控制电路把“要转到的角度”和电位器测到的“实际角度”比一比，差多少就让电机转多少，差为 0 就停',
    notes: '左边是原指南拆开的舵机：电路板、电机和外壳，齿轮和电位器在外壳里。右边按顺序讲闭环：收到信号知道目标角度 → 和电位器测到的实际角度比较 → 差多少电机就转多少，正负决定方向 → 齿轮带着电位器一起转，实际角度变了，再回去比较，直到差为 0 才停。这种“边做边检查”的控制就叫闭环反馈。',
  });
  {
    const iw = 3.7;
    V.imageBox(s, { file: 'l21/servo_inside_photo.jpg', x: L, y: TOP, w: iw, h: CH, caption: '原指南：舵机内部结构（电路板、电机、外壳）' });
    const rx = L + iw + 0.35, rw = G.R - rx;
    const bw = (rw - 2 * 0.35) / 3, bh = 1.0;
    const box = (x, y, n, t, d, fill) => {
      V.card(s, { x, y, w: bw, h: bh, fill: fill || P.card });
      V.numCircle(s, n, { x: x + 0.1, y: y + 0.1, d: 0.28, size: 10.5, fill: fill === P.turq ? P.ink : P.turq, color: fill === P.turq ? P.white : P.ink });
      txt(s, t, { x: x + 0.44, y: y + 0.08, w: bw - 0.5, h: 0.32, size: 12.5, bold: true, valign: 'middle', oneLine: true });
      txt(s, d, { x: x + 0.1, y: y + 0.44, w: bw - 0.18, h: bh - 0.48, size: 12 });
    };
    const y1 = TOP, y2 = TOP + bh + 0.35;
    const x1 = rx, x2 = rx + bw + 0.35, x3 = rx + 2 * (bw + 0.35);
    box(x1, y1, 1, '收到信号', '脉冲宽度说明要转到几度');
    box(x2, y1, 2, '比一比', '目标角度和实际角度差多少', P.turq);
    box(x3, y1, 3, '电机转动', '差多少转多少，正负定方向');
    box(x3, y2, 4, '带动电位器', '齿轮带着它转，实际角度变了');
    V.arrow(s, x1 + bw + 0.04, y1 + bh / 2, x2 - 0.04, y1 + bh / 2, { color: P.ink, width: 1.5 });
    V.arrow(s, x2 + bw + 0.04, y1 + bh / 2, x3 - 0.04, y1 + bh / 2, { color: P.ink, width: 1.5 });
    V.arrow(s, x3 + bw / 2, y1 + bh + 0.04, x3 + bw / 2, y2 - 0.04, { color: P.ink, width: 1.5 });
    polyline(s, [[x3 - 0.04, y2 + bh / 2], [x2 + bw / 2, y2 + bh / 2], [x2 + bw / 2, y1 + bh + 0.04]], { head: true, color: P.turqDeep, width: 1.75 });
    txt(s, '再比一次', { x: x2 + bw / 2 + 0.08, y: y2 + bh / 2 - 0.3, w: 0.9, h: 0.24, size: 11, bold: true, color: P.turqDeep, valign: 'middle' });
    // "difference is 0" exit from step 2
    polyline(s, [[x2 + 0.28, y1 + bh + 0.04], [x2 + 0.28, y2 + bh / 2], [x1 + bw + 0.04, y2 + bh / 2]], { head: true, color: P.ink, width: 1.5 });
    V.card(s, { x: x1, y: y2 + 0.1, w: bw, h: bh - 0.2, fill: P.ink });
    txt(s, [B('差为 0', { color: P.turq, breakLine: true }), R('电机停转，角度保持住', { color: P.white })], { x: x1 + 0.1, y: y2 + 0.1, w: bw - 0.2, h: bh - 0.2, size: 12, align: 'center', valign: 'middle' });
    const ty = y2 + bh + 0.3;
    tipBox(s, { x: rx, y: ty, w: rw, h: BOT - ty, kind: 'tip', size: 12, text: [B('打个比方　'), R('像开车盯着车道线：偏左就往右打一点方向盘，偏右就往左打一点，直到车开正——这就是“闭环反馈”。')] }, I.car);
  }

  // ---------------------------------------------------------------- pulse width -> angle
  s = slide({
    title: '舵机的控制：脉冲宽度决定角度',
    desc: '每 20ms 发一个脉冲，高电平持续 0.5～2.5ms：0.5ms 转到 0°，1.5ms 转到 90°，2.5ms 转到 180°',
    notes: '舵机听懂的“暗号”是脉冲宽度：像按门铃，每 20 毫秒按一次，按住的时间越长，角度越大。左下图三行分别是最小、中间、最大脉冲。原指南这里有一句机翻，意思是：从中间位置（1.5ms，90°）转到最小角度和转到最大角度，转过的角度相等。舵机要一直收到脉冲才能稳住角度——这些脉冲稍后交给 Servo 库来发。',
  });
  {
    const lw = 5.35;
    V.imageBox(s, { file: 'l21/servo_pulse_period.jpg', x: L, y: TOP, w: lw, h: 1.25, diagram: true });
    V.imageBox(s, { file: 'l21/servo_pulse_angles.jpg', x: L, y: TOP + 1.25 + 0.3, w: lw, h: CH - 1.55, diagram: true });
    const rx = L + lw + 0.35, rw = G.R - rx, rowH = 0.29;
    V.table(s, [
      ['脉冲宽度（高电平）', '舵机角度'],
      ['0.5 ms', '0°'],
      ['1.0 ms', '45°'],
      [{ text: '1.5 ms', bold: true }, { text: '90°（中间位置）', bold: true }],
      ['2.0 ms', '135°'],
      ['2.5 ms', '180°'],
    ], { x: rx, y: TOP, w: rw, colW: [1.75, rw - 1.75], rowH, size: 12, monoCols: [0], align: ['center', 'center'] });
    const ty = TOP + 6 * rowH + 0.3;
    tipBox(s, { x: rx, y: ty, w: rw, h: BOT - ty, kind: 'note', title: '要点', size: 12,
      text: '• 小于 1.5ms：逆时针转\n• 大于 1.5ms：顺时针转\n• 中间位置到两头的转角相等\n• 要一直发脉冲，角度才能保持' }, I.clock);
  }

  // ---------------------------------------------------------------- wiring
  s = slide({
    title: '接线：电位器接 3.3V 和 A0，舵机信号接 7',
    desc: '电位器左脚接 3.3V、右脚接 GND、中间脚接 A0；舵机红线接 5V、黑（棕）线接 GND、黄（橙）线接 7 号脚',
    notes: '照原指南接线：电位器左脚接 3.3V（注意不是 5V），右脚接 GND，中间脚接 A0；舵机三根线，红线接 5V，黑线接 GND，黄线是信号线接 7 号脚。SG90 实物的线是棕、红、橙三色，棕对应 GND、橙对应信号。电位器接 3.3V 会让舵机转不满 180°，实验结果那一页再细说。',
  });
  {
    const iw = 4.1;
    V.imageBox(s, { file: 'l21/servo_pot_wiring.jpg', x: L, y: TOP, w: iw, h: CH, diagram: true, caption: '原指南接线图' });
    const rx = L + iw + 0.35, rw = G.R - rx, tw = (rw - 0.3) / 2, rowH = 0.31;
    V.wiring(s, { x: rx, y: TOP, w: tw, right: '电位器', left: 'Arduino', rowH, size: 12, colW: [tw * 0.45, tw * 0.55], rows: [[{ text: '3.3V', color: P.red, bold: true }, '左脚'], ['A0', '中间脚'], ['GND', '右脚']] });
    V.wiring(s, { x: rx + tw + 0.3, y: TOP, w: tw, right: '舵机', left: 'Arduino', rowH, size: 12, colW: [tw * 0.45, tw * 0.55], rows: [['5V', '红线'], ['GND', '黑 / 棕线'], ['7', '黄 / 橙线']] });
    const ny = TOP + 4 * rowH + 0.1;
    txt(s, [B('注意　', { color: P.red }), R('电位器接 3.3V，不是 5V；下图是舵机的三根线')], { x: rx, y: ny, w: rw, h: 0.28, size: 12, valign: 'middle', oneLine: true });
    const wy = ny + 0.28 + 0.2;
    V.imageBox(s, { file: 'l21/servo_wires.jpg', x: rx, y: wy, w: rw, h: BOT - wy, diagram: true, caption: '原指南：0V GND · +5V · PWM 信号线，可转 180°' });
  }

  // ---------------------------------------------------------------- syntax: Servo library
  s = slide({
    title: '新语法：用 Servo 库控制舵机',
    desc: '库是别人写好的“扩展包”：#include 引进来，创建舵机对象，attach() 配对引脚，write() 让它转到角度',
    notes: '舵机要每 20 毫秒收到一个精确的脉冲，自己写很麻烦。Servo 库就像手机上装好的 App：引进来以后，领一个“遥控器”（对象 myservo），和 7 号脚配对，再按“转到 90°”就行，脉冲由库在后台一直发。Servo 库是 Arduino IDE 自带的，不用另外安装。最常见的错误是大小写写错，或者忘了第一行的 #include。',
  });
  {
    const n = 4, gap = 0.3, w = (CW - gap * (n - 1)) / n, h = 1.95;
    const st = [
      ['#include <Servo.h>', '装上“扩展包”', 'IDE 自带，不用另装'],
      ['Servo myservo;', '领一个“遥控器”', '对象名字自己起'],
      ['myservo.attach(7);', '和 7 号脚配对', '信号线接哪就写几'],
      ['myservo.write(90);', '按下“转到 90°”', '0～180 之间的角度'],
    ];
    st.forEach(([c, t, d], i) => {
      const x = L + i * (w + gap);
      V.card(s, { x, y: TOP, w, h, fill: i === 3 ? P.turqPale : P.card });
      V.numCircle(s, i + 1, { x: x + 0.15, y: TOP + 0.15, d: 0.32, size: 11 });
      miniCode(s, c, { x: x + 0.15, y: TOP + 0.62, w: w - 0.3, size: 10, padX: 0.08 });
      txt(s, t, { x: x + 0.15, y: TOP + 1.1, w: w - 0.3, h: 0.32, size: 13, bold: true, valign: 'middle', oneLine: true });
      txt(s, d, { x: x + 0.15, y: TOP + 1.45, w: w - 0.3, h: 0.3, size: 12, color: P.muted, valign: 'middle', oneLine: true });
      if (i < n - 1) V.arrow(s, x + w + 0.04, TOP + 0.31, x + w + gap - 0.04, TOP + 0.31, { color: P.muted });
    });
    const by = TOP + h + 0.3, bh = BOT - by, lw = 5.0;
    tipBox(s, { x: L, y: by, w: lw, h: bh, kind: 'tip', title: '为什么要用库', size: 12,
      text: '舵机要不停地收到 0.5～2.5ms 的脉冲；\nServo 库在后台替你一直发，你只管说角度。' }, I.puzzle);
    tipBox(s, { x: L + lw + 0.3, y: by, w: CW - lw - 0.3, h: bh, kind: 'warn', title: '常见错误', size: 12,
      text: [R('Servo 的 S 要大写；', { breakLine: true }), R('忘了 #include，编译会报：', { breakLine: true }), M('\'Servo\' does not name a type')] }, I.warn_w);
  }

  // ---------------------------------------------------------------- code 1/2
  s = slide({
    title: '代码逐行看懂（1/2）：引入库、创建对象、配对引脚',
    desc: '前 4 行引入 Servo 库、创建舵机对象 myservo、给两个引脚起名；setup() 把舵机和 7 号脚配对',
    notes: '第 1、2 行就是新语法的前两步：引入库、领遥控器。第 8 行 attach 把 myservo 和 7 号脚配对，从这以后 myservo 发出的脉冲都从 7 号脚出去。第 7 行把 7 号脚设为输出其实可以省略，attach 会自己处理。第 8 行的英文注释写的是 pin 9，那是沿用官方例程的旧注释，实际接的是 7 号脚。',
  });
  {
    const cw = 5.6, ch = 2.75;
    const b = code(s, { x: L, y: TOP, w: cw, h: ch, size: 11, code: SERVO_CODE, from: 1, to: 9, hl: [1, 2, 8], file: 'servo_knob.ino', right: '第 1–9 行', allowWrap: true });
    V.explain(s, b, { x: L + cw + 0.35, w: G.R - (L + cw + 0.35), title: '逐行看懂', maxY: BOT, gap: 0.12, items: [
      { line: 1, text: '引入 Servo 库（IDE 自带）' },
      { line: 2, text: '创建舵机对象 myservo' },
      { line: [3, 4], text: 'A0 接电位器，7 号脚接舵机' },
      { line: 7, text: '7 号脚设为输出（可省略）' },
      { line: 8, text: 'myservo 和 7 号脚配对' },
    ] });
    const ty = TOP + ch + 0.3;
    tipBox(s, { x: L, y: ty, w: cw, h: BOT - ty, kind: 'note', size: 12, text: [B('原注释有误　'), R('第 8 行写的 pin 9 是旧注释，实为 7 号脚')] }, I.book);
  }

  // ---------------------------------------------------------------- code 2/2
  s = slide({
    title: '代码逐行看懂（2/2）：读旋钮、换角度、转舵机',
    desc: 'loop() 每 15 毫秒做一次：读电位器 → 除以 4 换成角度 → 让舵机转到这个角度',
    notes: '第 12 行读电位器，得到 0～1023；第 13 行除以 4 换成角度——这是整数除法，小数直接扔掉。第 14 行 write 让舵机转到 angle 度，英文注释里的 pos 也是旧例程留下的，实际变量是 angle。最后提醒：原指南第 4 页的程序框在 delay(15); 后断页，loop() 的右大括号漏印了，照抄会报错，第 16 行已经补上。',
  });
  {
    const cw = 5.6, ch = 2.0;
    const b = code(s, { x: L, y: TOP, w: cw, h: ch, code: SERVO_CODE, from: 11, to: 16, hl: [12, 13, 14, 16], file: 'servo_knob.ino', right: '第 11–16 行', allowWrap: true });
    const ex = L + cw + 0.35, ew = G.R - ex;
    const yEnd = V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: 3.6, gap: 0.1, items: [
      { line: 12, text: '读电位器：0～1023' },
      { line: 13, text: '÷ 4 换成角度（扔掉小数）' },
      { line: 14, text: '舵机转到 angle 度' },
      { line: 15, text: '等 15 毫秒，让舵机转过去' },
      { line: 16, text: '补上的右大括号' },
    ] });
    const ny = Math.max(yEnd + 0.2, 3.85);
    tipBox(s, { x: ex, y: ny, w: ew, h: BOT - ny, kind: 'note', size: 12, text: [B('原注释有误　'), R('第 14 行注释里的 pos 是旧例程留下的，实际变量是 angle。')] }, I.book);
    const ty = 3.85;
    warnCard(s, I.times_w, '原指南漏印了一个 }', '原指南程序框在 delay(15); 后断页，下一页的框是空的：loop() 的右大括号 } 漏印了，照抄会编译报错。第 16 行已补上。', { x: L, y: ty, w: cw, h: BOT - ty, size: 12 });
  }

  // ---------------------------------------------------------------- result + why not 180
  s = slide({
    title: '实验结果：旋钮转到哪，舵机就转到哪',
    desc: '上传程序后转动电位器，舵机跟着转；按原接法电位器接 3.3V，实际最大约 168°，改用 map() 能转满',
    notes: '先演示：转动电位器，舵机跟着转。再算一笔账：电位器接 3.3V，A0 最大读数约 3.3 ÷ 5 × 1023 ≈ 675，除以 4 约 168°，所以转到底也到不了 180°。如果电位器改接 5V，读数能到 1023，除以 4 得 255，超过 180 的部分舵机都停在 180°，旋钮最后一段就没反应了。最稳妥的是电位器接 5V，再用 map(readValue, 0, 1023, 0, 180)；想反着转，就把最后两个数换成 180, 0。',
  });
  {
    const pw = 3.9;
    V.imageBox(s, { file: 'l21/servo_pot_result_photo.jpg', x: L, y: TOP, w: pw, h: CH, caption: '原指南实物图' });
    const rx = L + pw + 0.3, rw = G.R - rx;
    tipBox(s, { x: rx, y: TOP, w: rw, h: 0.8, kind: 'note', size: 12, text: [B('原指南结论　'), R('转动电位器就能改变舵机角度，', { breakLine: true }), R('范围 0～180°，为之后的机械臂打下基础。')] }, I.check);
    const wy = TOP + 0.8 + 0.3, wh = 0.9;
    V.card(s, { x: rx, y: wy, w: rw, h: wh, fill: P.white, line: P.red, lineW: 1 });
    V.iconCircle(s, I.warn_w, { x: rx + 0.16, y: wy + 0.12, d: 0.32, fill: P.red });
    txt(s, '按原接法转不满 180°', { x: rx + 0.6, y: wy + 0.12, w: rw - 0.76, h: 0.32, size: 13, bold: true, color: P.red, valign: 'middle', oneLine: true });
    txt(s, [R('3.3V → 读数最大约 '), M('675', { bold: true }), R(' → '), M('675 / 4', { bold: true }), R(' ≈ 168°')], { x: rx + 0.16, y: wy + 0.5, w: rw - 0.32, h: 0.3, size: 12.5, valign: 'middle', oneLine: true });
    const cy = wy + wh + 0.3, chh = BOT - cy;
    V.card(s, { x: rx, y: cy, w: rw, h: chh });
    V.iconCircle(s, I.wrench, { x: rx + 0.16, y: cy + 0.12, d: 0.32 });
    txt(s, '动手改一改：让旋钮正好对应 0～180°', { x: rx + 0.6, y: cy + 0.12, w: rw - 0.76, h: 0.32, size: 13, bold: true, valign: 'middle', oneLine: true });
    txt(s, '电位器左脚改接 5V，再把第 13 行改成：', { x: rx + 0.16, y: cy + 0.5, w: rw - 0.32, h: 0.28, size: 12, valign: 'middle', oneLine: true });
    const mh = miniCode(s, 'int angle = map(readValue, 0, 1023, 0, 180);', { x: rx + 0.16, y: cy + 0.84, w: rw - 0.32, size: 10.5 });
    if (cy + 0.84 + mh > BOT - 0.08) warn('servo try card overflow');
  }
}

// ================================================================ 实验 04　摇杆模块
// Joystick shield sketch (vertical) with the pins each control uses, for the #define slide.
function shieldMap(s, x, y, w, h) {
  V.card(s, { x, y, w, h, fill: P.card });
  txt(s, '按键接在哪', { x: x + 0.18, y: y + 0.12, w: w - 0.36, h: 0.3, size: 13, bold: true, valign: 'middle' });
  const cx = x + w / 2;
  const jy = y + 1.02, jd = 0.95;
  s.addShape('ellipse', { x: cx - jd / 2, y: jy - jd / 2, w: jd, h: jd, fill: { color: P.ink }, line: { color: P.ink, width: 0 } });
  V.text(s, [B('摇杆', { color: P.white, breakLine: true }), R('X → 0', { color: P.turq, fontSize: 10.5, breakLine: true }), R('Y → 1', { color: P.turq, fontSize: 10.5 })],
    { x: cx - jd / 2, y: jy - jd / 2, w: jd, h: jd, size: 11, align: 'center', valign: 'middle', lineSpacingMultiple: 1.0 });
  txt(s, [B('K → 8'), R('　按下摇杆', { color: P.muted })], { x: x + 0.1, y: jy + jd / 2 + 0.06, w: w - 0.2, h: 0.24, size: 11, align: 'center', valign: 'middle', oneLine: true });
  const by = y + 2.55, off = 0.43, bd = 0.42;
  const btn = (bx, byy, t, p, fill) => {
    s.addShape('ellipse', { x: bx - bd / 2, y: byy - bd / 2, w: bd, h: bd, fill: { color: fill }, line: { color: P.gray2, width: 0.75 } });
    V.text(s, [B(t, { breakLine: true }), R(p, { fontSize: 10 })], { x: bx - bd / 2, y: byy - bd / 2, w: bd, h: bd, size: 10.5, align: 'center', valign: 'middle', lineSpacingMultiple: 0.9 });
  };
  btn(cx, by - off, 'A', '2', P.turq);
  btn(cx + off, by, 'B', '3', P.white);
  btn(cx, by + off, 'C', '4', P.turq);
  btn(cx - off, by, 'D', '5', P.white);
  txt(s, '上', { x: cx + 0.26, y: by - off - 0.12, w: 0.3, h: 0.24, size: 10, color: P.muted, valign: 'middle' });
  txt(s, '右', { x: cx + off + 0.24, y: by - 0.12, w: 0.3, h: 0.24, size: 10, color: P.muted, valign: 'middle' });
  txt(s, '下', { x: cx + 0.26, y: by + off - 0.12, w: 0.3, h: 0.24, size: 10, color: P.muted, valign: 'middle' });
  txt(s, '左', { x: cx - off - 0.54, y: by - 0.12, w: 0.3, h: 0.24, size: 10, color: P.muted, align: 'right', valign: 'middle' });
  const ey = y + h - 0.4;
  V.pill(s, { x: cx - 0.8, y: ey, w: 0.75, h: 0.28, text: 'E → 6', size: 10.5, fill: P.white, line: P.gray2, mono: true });
  V.pill(s, { x: cx + 0.05, y: ey, w: 0.75, h: 0.28, text: 'F → 7', size: 10.5, fill: P.white, line: P.gray2, mono: true });
}

// Dead-zone ruler zoomed to 495..555. Axis label on the left, red marker = resting value.
function zoomRuler(s, o) {
  const { x, y, w, label } = o, lw = 0.75, bx = x + lw + 0.05, bw = x + w - bx, h = 0.32;
  const lo = 495, hi = 555;
  const X = (v) => bx + bw * (v - lo) / (hi - lo);
  const ly = y + 0.38;
  txt(s, label, { x, y: ly - 0.08, w: lw, h: 0.48, size: 12, bold: true, valign: 'middle', lineSpacingMultiple: 1.0 });
  o.zones.forEach((z) => {
    const x0 = X(Math.max(z.from, lo)), x1 = X(Math.min(z.to, hi));
    s.addShape('rect', { x: x0, y: ly, w: x1 - x0, h, fill: { color: z.fill }, line: { color: P.gray2, width: 0.5 } });
    V.text(s, z.text, { x: x0, y: ly, w: x1 - x0, h, size: 11, bold: true, align: 'center', valign: 'middle', color: z.fill === P.ink ? P.white : P.ink });
  });
  o.ticks.forEach((v) => {
    seg(s, X(v), ly + h, X(v), ly + h + 0.06, { color: P.muted, width: 1 });
    V.text(s, String(v), { x: X(v) - 0.3, y: ly + h + 0.06, w: 0.6, h: 0.2, size: 10, color: P.muted, align: 'center', valign: 'middle', mono: true });
  });
  const mx = X(o.marker);
  s.addShape('triangle', { x: mx - 0.08, y: ly - 0.16, w: 0.16, h: 0.14, flipV: true, fill: { color: P.red }, line: { color: P.red, width: 0 } });
  V.text(s, String(o.marker), { x: mx - 0.3, y, w: 0.6, h: 0.2, size: 10, bold: true, color: P.red, align: 'center', valign: 'middle', mono: true });
  return ly + h + 0.26;
}

function buildJoystick({ deck, I, slide }) {
  let s;
  deck.section('实验四　摇杆模块');
  deck.divider({
    kicker: '实验 04',
    title: '摇杆模块实验',
    desc: '摇杆扩展板就像游戏手柄：一根能前后左右推的拇指摇杆（里面是两个电位器），再加七个按键。直接插在 UNO 上，读出摇杆的位置和按键，在串口里报出方向。',
    tiles: [
      { fill: P.turq, big: '01', title: '原理', sub: '两个电位器 + 按键', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: '直接插在 UNO 上', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: '上拉 · else if · 死区', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '串口报方向和按键', subSize: 12 },
    ],
    notes: '实验四从“输出”回到“输入”：前三个实验是让 Arduino 输出中间值，这次是读摇杆里两个电位器的中间值。指南里有两段程序：程序①先看摇杆不动时读数是多少，程序②再判断方向和按键。新语法是内部上拉电阻和 else if 连环判断。',
  });

  // ---------------------------------------------------------------- intro
  s = slide({
    title: '认识摇杆扩展板：两个电位器加七个按键',
    desc: '拇指摇杆里有两个电位器，分别测左右（X）和上下（Y）；另有六个独立按键，摇杆按下去也是一个按键',
    notes: '原指南说它提供了老式任天堂游戏手柄上的功能：摇杆可以控制音乐旋律或屏幕上的像素，按键可以做菜单导航或游戏控制。重点讲摇杆的本质：左右推是在转一个电位器，上下推是在转另一个电位器，所以读出来是 0～1023 的模拟值；按键只有按下和松开，是数字量。这块扩展板直接插在 UNO 上，不用面包板。',
  });
  {
    const iw = 3.55, ph = 2.55;
    V.imageBox(s, { file: 'l21/joystick_shield_photo.jpg', x: L, y: TOP, w: iw, h: ph, caption: '摇杆扩展板（Joystick Shield）' });
    const cb = chips(s, ['组件清单', 'UNO 主板', 'USB 数据线', '摇杆模块 ×1', '若干跳线'], { x: L, y: TOP + ph + 0.3, w: iw, size: 12, leadDark: true });
    if (cb > BOT + 0.01) warn('joystick parts overflow');
    const rx = L + iw + 0.35, rw = G.R - rx;
    const ly = lead(s, '像一个老式游戏手柄', '原指南：它提供了任天堂（Nintendo）手柄上的功能。摇杆可以控制音乐旋律、屏幕上的像素；按键可以做菜单导航或游戏控制。', { x: rx, y: TOP, w: rw, size: 12.5 });
    const gy = ly + 0.3;
    tileGrid(s, {
      x: rx, y: gy, w: rw, h: BOT - gy, cols: 3, bigSize: 22, titleSize: 14,
      items: [
        { fill: P.turq, big: 'X', title: '左右推', sub: '一个电位器\n读数 0～1023' },
        { fill: P.ink, big: 'Y', title: '上下推', sub: '另一个电位器\n读数 0～1023' },
        { fill: P.white, big: '7 个', title: '按键', sub: '6 个独立按键\n+ 摇杆按下' },
      ],
    });
  }

  // ---------------------------------------------------------------- schematic + axes
  s = slide({
    title: '原理图：摇杆 = 两个电位器 + 一个按键',
    desc: 'VRx、VRy 是两个电位器的中间脚，输出 0～1023 的模拟值；SW 是摇杆下面的按键，按下接地',
    notes: '对照原理图：左下的 Joystick 有五个脚，VRx、VRy 分别接到端口的 X-out、Y-out，就是两个电位器的输出；SW 经 R1（10K）接到 VCC，松开时是高电平，按下接地变成低电平；两颗 LED 是指示灯。右图是摇杆的“坐标”：不推时两个电位器都停在中间，读数约 512；按程序的判断，往左推 X 变小、往右推 X 变大，往上推 Y 变大、往下推 Y 变小。',
  });
  {
    const iw = 4.75, ih = 2.55;
    V.imageBox(s, { file: 'l21/joystick_schematic.jpg', x: L, y: TOP, w: iw, h: ih, diagram: true, caption: '原指南原理图' });
    const ty = TOP + ih + 0.3;
    tipBox(s, { x: L, y: ty, w: iw, h: BOT - ty, kind: 'note', size: 12, text: [B('SW 按键　'), R('经 R1（10K）接 VCC：松开是高电平，按下接地变低电平。')] }, I.hand);
    const rx = L + iw + 0.35, rw = G.R - rx;
    V.card(s, { x: rx, y: TOP, w: rw, h: CH });
    txt(s, '摇杆的“坐标”（按程序的判断）', { x: rx + 0.2, y: TOP + 0.12, w: rw - 0.4, h: 0.3, size: 13, bold: true, valign: 'middle', oneLine: true });
    const cx = rx + rw / 2, cy = TOP + 1.65, a = 0.8;
    s.addShape('ellipse', { x: cx - a, y: cy - a, w: 2 * a, h: 2 * a, fill: { color: P.white }, line: { color: P.gray2, width: 1 } });
    V.arrow(s, cx, cy, cx + a - 0.04, cy, { color: P.turqDeep, width: 1.75 });
    V.arrow(s, cx, cy, cx - a + 0.04, cy, { color: P.turqDeep, width: 1.75 });
    V.arrow(s, cx, cy, cx, cy - a + 0.04, { color: P.ink, width: 1.75 });
    V.arrow(s, cx, cy, cx, cy + a - 0.04, { color: P.ink, width: 1.75 });
    s.addShape('ellipse', { x: cx - 0.12, y: cy - 0.12, w: 0.24, h: 0.24, fill: { color: P.ink }, line: { color: P.ink, width: 0 } });
    const side = cx - a - 0.1 - (rx + 0.12);
    txt(s, [B('左推', { breakLine: true }), R('X 变小')], { x: rx + 0.12, y: cy - 0.25, w: side, h: 0.5, size: 11.5, align: 'right', valign: 'middle', lineSpacingMultiple: 1.0 });
    txt(s, [B('右推', { breakLine: true }), R('X 变大')], { x: cx + a + 0.1, y: cy - 0.25, w: side, h: 0.5, size: 11.5, align: 'left', valign: 'middle', lineSpacingMultiple: 1.0 });
    txt(s, [B('上推　'), R('Y 变大')], { x: cx - 1.0, y: cy - a - 0.3, w: 2.0, h: 0.24, size: 11.5, align: 'center', valign: 'middle', oneLine: true });
    txt(s, [B('下推　'), R('Y 变小')], { x: cx - 1.0, y: cy + a + 0.06, w: 2.0, h: 0.24, size: 11.5, align: 'center', valign: 'middle', oneLine: true });
    const by = cy + a + 0.44, bh = BOT - 0.12 - by;
    V.card(s, { x: rx + 0.2, y: by, w: rw - 0.4, h: bh, fill: P.turqPale });
    txt(s, [B('不推的时候：'), R('两个电位器都停在中间，读数约 512（下一个程序会测出来）')], { x: rx + 0.32, y: by, w: rw - 0.64, h: bh, size: 12, valign: 'middle' });
  }

  // ---------------------------------------------------------------- wiring
  s = slide({
    title: '接线：扩展板直接插在 UNO 上',
    desc: '摇杆 X、Y 接模拟口 A0、A1，按键 A～F 接数字口 2～7，摇杆按下（K）接 8 号脚',
    notes: '扩展板对准排针直接插到 UNO 上就行，不用接线。表格照原指南抄录，但要提醒两点：表里的 0、1 指的是模拟口 A0、A1（程序里写 analogRead(0)），不是数字 0、1 号脚；摇杆按下的 K 接 8 号脚，原表没有列，是从程序里补上的。接线图里按键旁的丝印和表格编号不完全一致（不同版本扩展板），以程序和串口打印为准。',
  });
  {
    const iw = 5.0, ih = 2.55;
    V.imageBox(s, { file: 'l21/joystick_wiring.jpg', x: L, y: TOP, w: iw, h: ih, diagram: true, caption: '原指南：扩展板插在 UNO 上（示意图）' });
    const ty = TOP + ih + 0.3;
    tipBox(s, { x: L, y: ty, w: iw, h: BOT - ty, kind: 'note', size: 12, text: '表里 0、1 指模拟口 A0、A1，不是数字 0、1 号脚；K 那一行原表没列，从程序补上。' }, I.search);
    const rx = L + iw + 0.35, rw = G.R - rx;
    V.table(s, [
      ['Arduino Uno', '摇杆模块'],
      ['0（A0）', 'VRX'], ['1（A1）', 'VRY'],
      ['2', 'A'], ['3', 'B'], ['4', 'C'], ['5', 'D'], ['6', 'E'], ['7', 'F'],
      ['GND', 'GND'], ['5V', 'VCC'],
      [{ text: '8（程序）', color: P.turqDeep, bold: true }, { text: 'K（摇杆按下）', color: P.turqDeep, bold: true }],
    ], { x: rx, y: TOP, w: rw, colW: [rw * 0.45, rw * 0.55], rowH: 0.3, size: 12, monoCols: [0], boldCols: [0], align: ['center', 'center'] });
  }

  // ---------------------------------------------------------------- program 1
  s = slide({
    title: '程序①：读出摇杆的 X、Y',
    desc: '每 0.5 秒读一次模拟口 0、1，把 x、y 的数值打印到串口——先看看摇杆不动时读数是多少',
    notes: '原指南说这个程序也可以直接打开 .ino 文件运行，打开方法参考套件的 Hello Arduino 实验。#define 在实验二学过，这里把 0、1 起名为 PIN_ANALOG_X、PIN_ANALOG_Y；analogRead(0) 和 analogRead(A0) 读的是同一个口。Serial.print 不换行、println 换行，所以串口里 x、y 各占一行，每 0.5 秒刷新一组。',
  });
  {
    const cw = 5.95;
    const b = code(s, { x: L, y: TOP, w: cw, h: CH, code: JOY1_CODE, file: 'joystick_xy.ino', right: '第 1–17 行', hl: [2, 3, 10, 11, 16] });
    V.explain(s, b, { x: L + cw + 0.3, w: G.R - (L + cw + 0.3), title: '逐行看懂', maxY: BOT, gap: 0.12, items: [
      { line: [2, 3], text: 'X 读模拟口 0\nY 读模拟口 1' },
      { line: 6, text: '打开串口，9600' },
      { line: [10, 11], text: '先打印“x: ”\n再打印 X 读数并换行' },
      { line: [13, 14], text: 'y 也一样' },
      { line: 16, text: '每 0.5 秒读一次' },
    ] });
  }

  // ---------------------------------------------------------------- program 1 result + dead zone
  s = slide({
    title: '程序①结果：不动时 x≈525、y≈518',
    desc: '摇杆静止时读数并不正好是 512；程序②把 520～530、515～520 设成“死区”，读数落在里面就当没推',
    notes: '串口里 x 一直是 525、y 一直是 518：静止时读数接近中间，但每个摇杆都有一点偏差。程序②判断方向时，在静止值两边留了一小段“不算数”的区间，这叫死区：X 小于 520 才算左、大于 530 才算右；Y 大于 520 才算上、小于 515 才算下。好比汽车方向盘中间有一点空行程，轻轻碰一下车不会拐。',
  });
  {
    const iw = 4.0;
    V.imageBox(s, { file: 'l21/joystick_serial_xy.jpg', x: L, y: TOP, w: iw, h: CH, caption: '原指南串口截图：x: 525 / y: 518 交替出现', fill: P.white, line: P.gray2 });
    const rx = L + iw + 0.35, rw = G.R - rx;
    txt(s, '静止值正好落在“死区”里', { x: rx, y: TOP, w: rw, h: 0.3, size: 13, bold: true, valign: 'middle', oneLine: true });
    txt(s, '尺子只画了中间 495～555 这一段；红三角 = 静止值', { x: rx, y: TOP + 0.32, w: rw, h: 0.22, size: 10, color: P.muted, valign: 'middle', oneLine: true });
    zoomRuler(s, { x: rx, y: TOP + 0.66, w: rw, label: [B('X 轴', { breakLine: true }), R('左右', { fontSize: 10.5, color: P.muted })], marker: 525, ticks: [520, 530], zones: [
      { from: 0, to: 520, fill: P.turq, text: '← left' },
      { from: 520, to: 530, fill: P.ink, text: '死区' },
      { from: 530, to: 1023, fill: P.turq, text: 'right →' },
    ] });
    zoomRuler(s, { x: rx, y: TOP + 1.85, w: rw, label: [B('Y 轴', { breakLine: true }), R('上下', { fontSize: 10.5, color: P.muted })], marker: 518, ticks: [515, 520], zones: [
      { from: 0, to: 515, fill: P.gray1, text: '← down' },
      { from: 515, to: 520, fill: P.ink, text: '死区' },
      { from: 520, to: 1023, fill: P.gray1, text: 'up →' },
    ] });
    const ty = TOP + 3.05;
    tipBox(s, { x: rx, y: ty, w: rw, h: BOT - ty, kind: 'tip', size: 12, text: [B('死区　'), R('留一小段“不算数”，读数抖一抖也不误报')] }, I.crosshairs);
  }

  // ---------------------------------------------------------------- syntax: internal pull-up + else if
  s = slide({
    title: '新语法：内部上拉电阻和 else if',
    desc: '先 INPUT 再写 HIGH，就打开了引脚内部的上拉电阻（等同 INPUT_PULLUP）；else if 从上往下问，第一个成立就停',
    notes: '左边：1-2 课的按键模块里有一颗上拉电阻，像弹簧把引脚拉在高电平；这块扩展板的按键没有自带，就用芯片引脚里面的那颗。老写法是先 pinMode 设为 INPUT，再 digitalWrite 写 HIGH；新写法一句 INPUT_PULLUP。所以松开读到 HIGH，按下读到 LOW。右边：else if 像排队过安检，一个个问，第一个“是”就进门，后面的都不问了；如果写成一串独立的 if，几个条件同时成立时会打印好几行。',
  });
  {
    const w = (CW - 0.3) / 2, iw = w - 0.4;
    // left card: internal pull-up
    let y = iconCard(s, I.arrowUp, '内部上拉：芯片里的“弹簧”', { x: L, y: TOP, w, h: CH, titleSize: 14 });
    txt(s, '1-2 课学过上拉电阻：像弹簧把引脚拉在高电平。扩展板的按键没带，就打开引脚里面那一颗。', { x: L + 0.2, y, w: iw, h: 0.5, size: 12 });
    y += 0.6;
    y += miniCode(s, 'pinMode(2, INPUT);\ndigitalWrite(2, HIGH);    // 老写法：两句\npinMode(2, INPUT_PULLUP); // 新写法：一句', { x: L + 0.2, y, w: iw, size: 10.5, hl: [2] }) + 0.14;
    txt(s, [B('效果：'), R('松开读到 '), M('HIGH', { bold: true }), R('，按下读到 '), M('LOW', { bold: true })], { x: L + 0.2, y, w: iw, h: 0.28, size: 12, valign: 'middle', oneLine: true });
    y += 0.28 + 0.16;
    let wh = BOT - 0.16 - y;
    V.card(s, { x: L + 0.2, y, w: iw, h: wh, fill: P.white, line: P.red, lineW: 1 });
    txt(s, [B('常见错误　', { color: P.red }), R('只写 INPUT 不开上拉：', { breakLine: true }), R('松开时引脚“悬空”，读数乱跳。')], { x: L + 0.34, y, w: iw - 0.28, h: wh, size: 12, valign: 'middle' });
    // right card: else if
    const rx = L + w + 0.3;
    y = iconCard(s, I.branch, 'else if：一个个问，第一个“是”就停', { x: rx, y: TOP, w, h: CH, titleSize: 14 });
    txt(s, '像排队过安检：从上往下一个个问，第一个回答“是”的就执行，后面的都不再问。', { x: rx + 0.2, y, w: iw, h: 0.5, size: 12 });
    y += 0.6;
    y += miniCode(s, 'if (A 键按下) { 打印 A }\nelse if (B 键按下) { 打印 B }\nelse if (X < 520) { 打印 left }\n// 都不成立：什么也不做', { x: rx + 0.2, y, w: iw, size: 10.5 }) + 0.14;
    txt(s, [B('只执行一个分支：'), R('越靠前，优先级越高。')], { x: rx + 0.2, y, w: iw, h: 0.28, size: 12, valign: 'middle', oneLine: true });
    y += 0.28 + 0.16;
    wh = BOT - 0.16 - y;
    V.card(s, { x: rx + 0.2, y, w: iw, h: wh, fill: P.white, line: P.red, lineW: 1 });
    txt(s, [B('常见错误　', { color: P.red }), R('写成一串独立的 if：', { breakLine: true }), R('几个条件同时成立时，会打印好几行。')], { x: rx + 0.34, y, w: iw - 0.28, h: wh, size: 12, valign: 'middle' });
  }

  // ---------------------------------------------------------------- program 2 (1/5): defines
  s = slide({
    title: '程序②（1/5）：给按键和摇杆起名字',
    desc: '10 个 #define：A～D 四个大按键接 2～5，E、F 接 6、7，摇杆按下 K 接 8，摇杆 X、Y 接模拟口 0、1',
    notes: '先对照右图认一认：四个大按键按“上、右、下、左”分别是 A、B、C、D，接 2～5 号脚；两个小按键 E、F 接 6、7；按下摇杆是 K，接 8 号脚。名字里的 UP、RIGHT、DOWN、LEFT 说的就是按键的位置。最后一行把 500 起名为 DELAY，后面每次打印都停 0.5 秒，想改快慢只改这一处。',
  });
  {
    const cw = 3.0, ch = 2.5;
    const b = code(s, { x: L, y: TOP, w: cw, h: ch, size: 10.5, code: JOY2_CODE, from: 1, to: 10, hl: [1, 2, 3, 4, 7], file: 'joystick.ino', right: '第 1–10 行' });
    const ex = L + cw + 0.3, ew = 3.0;
    V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: BOT, gap: 0.12, items: [
      { line: [1, 4], text: '四个大按键：\n上 A、右 B、下 C、左 D' },
      { line: [5, 6], text: '两个小按键 E、F' },
      { line: 7, text: 'K：按下摇杆' },
      { line: [8, 9], text: '摇杆 X、Y：模拟口 0、1' },
      { line: 10, text: '每次打印后停 500 毫秒' },
    ] });
    shieldMap(s, ex + ew + 0.3, TOP, G.R - (ex + ew + 0.3), CH);
    const ty = TOP + ch + 0.3;
    tipBox(s, { x: L, y: ty, w: cw, h: BOT - ty, kind: 'tip', size: 12, text: '名字说清用途：\nUP 是上，DOWN 是下。' }, I.tag);
  }

  // ---------------------------------------------------------------- program 2 (2/5): setup
  s = slide({
    title: '程序②（2/5）：setup() 打开上拉电阻',
    desc: '七个按键脚都做同样两步：先设为输入，再写 HIGH——打开内部上拉，松开读 HIGH，按下读 LOW',
    notes: '第 13、14 行的英文注释说明了意图：要打开上拉电阻，先设引脚模式，再把引脚写成 HIGH。下面 14 行其实是 7 个按键各两步，一模一样。可以让学生动手把它们改成 7 行 pinMode(按键, INPUT_PULLUP);，上传后效果完全相同。',
  });
  {
    const w = (CW - 0.3) / 2, ch = 2.55;
    const a = code(s, { x: L, y: TOP, w, h: ch, code: JOY2_CODE, from: 11, to: 20, hl: [15, 16], file: 'joystick.ino', right: '第 11–20 行', size: 10.5, allowWrap: true });
    code(s, { x: L + w + 0.3, y: TOP, w, h: ch, code: JOY2_CODE, from: 21, to: 29, hl: [27, 28], file: 'joystick.ino', right: '第 21–29 行', size: a.size });
    const ny = TOP + ch + 0.22;
    V.explain(s, null, { x: L, y: ny, w, maxY: BOT, gap: 0.12, items: [
      { line: [13, 14], text: '注释：先设模式再写 HIGH，即上拉' },
      { line: [15, 20], text: 'A、B、C 键：每个都是 INPUT + HIGH' },
    ] });
    V.explain(s, null, { x: L + w + 0.3, y: ny, w, maxY: BOT, gap: 0.12, items: [
      { line: [21, 28], text: 'D、E、F、K 键：还是同样的两步' },
      { tag: '新写法', text: '可改成 7 行：\npinMode(按键, INPUT_PULLUP);' },
    ] });
  }

  // ---------------------------------------------------------------- program 2 (3/5): buttons A-D
  s = slide({
    title: '程序②（3/5）：else if 依次检查按键',
    desc: '先问 A 键按下没有；没按，再问 B 键……按键按下读到 LOW，就打印是哪个键，再停 0.5 秒',
    notes: '这一页是 else if 链的开头。第 31 行先问 A 键：读到 LOW 说明按下了，就打印 Button A is pressed，再停 0.5 秒，然后整个链条结束，后面的都不问。没按才轮到第 35 行问 B 键，C、D 写法完全一样。停 0.5 秒是为了让按一次只打印一行，不然串口会刷屏。',
  });
  {
    const cw = 5.3;
    const b = code(s, { x: L, y: TOP, w: cw, h: CH, code: JOY2_CODE, from: 30, to: 46, hl: [31, 35], file: 'joystick.ino', right: '第 30–46 行' });
    const ex = L + cw + 0.35, ew = G.R - ex;
    const yEnd = V.explain(s, b, { x: ex, w: ew, title: '逐行看懂', maxY: 3.95, gap: 0.12, items: [
      { line: 31, text: 'A 键按下了吗？按下读到 LOW' },
      { line: [32, 33], text: '是：打印这个按键的名字，\n再停 0.5 秒' },
      { line: 35, text: '否则，再问 B 键' },
      { line: [39, 46], text: 'C、D 键：同样的写法，\n一个接一个往下问' },
    ] });
    const ty = Math.max(yEnd + 0.2, 4.15);
    tipBox(s, { x: ex, y: ty, w: ew, h: BOT - ty, kind: 'tip', size: 12, text: [B('按住不放　'), R('每过 0.5 秒再打印一行，节奏由 DELAY 决定。')] }, I.clock);
  }

  // ---------------------------------------------------------------- program 2 (4/5): E, F, left, right
  s = slide({
    title: '程序②（4/5）：E、F 键和左右方向',
    desc: '六个按键都没按，才去看摇杆：X 小于 520 打印 left，大于 530 打印 right，中间的死区什么也不做',
    notes: 'E、F 两个小按键和前面一样。从第 55 行开始读模拟值：X 小于 520 算往左，大于 530 算往右，520～530 是死区。注意这些方向判断都排在按键后面，按住任何一个按键时，摇杆方向就不会被打印——这就是 else if 的“优先级”。',
  });
  {
    const cw = 5.3;
    const b = code(s, { x: L, y: TOP, w: cw, h: CH, code: JOY2_CODE, from: 47, to: 62, hl: [55, 56, 59, 60], file: 'joystick.ino', right: '第 47–62 行' });
    V.explain(s, b, { x: L + cw + 0.35, w: G.R - (L + cw + 0.35), title: '逐行看懂', maxY: BOT, gap: 0.12, items: [
      { line: [47, 54], text: 'E、F 键：同样的写法' },
      { line: [55, 56], text: 'X 小于 520：往左推了，\n打印 left' },
      { line: [59, 60], text: 'X 大于 530：往右推了，\n打印 right' },
      { tag: '死区', text: '520～530 之间：两条都不成立，\n接着问 Y' },
    ] });
  }

  // ---------------------------------------------------------------- program 2 (5/5): up, down, K
  s = slide({
    title: '程序②（5/5）：上下方向和摇杆按键 K',
    desc: 'Y 大于 520 打印 up，小于 515 打印 down；K 键单独用一个 if 判断，不在 else if 链里',
    notes: '上下方向和左右一样，只是死区是 515～520。第 71 行的注释是从程序①抄过来的，和下面的代码关系不大。K 键用的是一个独立的 if：不管前面的链条打印了什么，每一轮都会检查 K。所以一边推摇杆一边按下它，可能先打印方向，再打印 Button k is pressed。',
  });
  {
    const cw = 5.3;
    const b = code(s, { x: L, y: TOP, w: cw, h: CH, code: JOY2_CODE, from: 63, to: 76, hl: [63, 64, 67, 68, 72, 73], file: 'joystick.ino', right: '第 63–76 行', allowWrap: true });
    V.explain(s, b, { x: L + cw + 0.35, w: G.R - (L + cw + 0.35), title: '逐行看懂', maxY: BOT, gap: 0.12, items: [
      { line: [63, 64], text: 'Y 大于 520：往上推，\n打印 up' },
      { line: [67, 68], text: 'Y 小于 515：往下推，\n打印 down' },
      { line: 71, text: '这句注释是从程序①抄来的' },
      { line: [72, 73], text: 'K 键：独立的 if，\n每一轮都会检查' },
      { line: 76, text: 'loop() 结束，从头再来' },
    ] });
  }

  // ---------------------------------------------------------------- result
  s = slide({
    title: '实验结果：推摇杆、按按键，串口报出来',
    desc: '往上下左右推，串口打印 up / down / left / right；按下按键，打印 Button A～F（或 k）is pressed',
    notes: '上传程序②后打开串口监视器（9600），先推摇杆四个方向，再逐个按 A～F 键，最后按下摇杆。原指南的结论说“往上拨时对应的 LED 灯会亮起”，但这段程序只在串口打印，并不控制 LED；扩展板上亮着的小灯是板子自带的指示灯。以串口里的文字为准。',
  });
  {
    const pw = 4.3, ph = 2.55;
    V.imageBox(s, { file: 'l21/joystick_result_photo.jpg', x: L, y: TOP, w: pw, h: ph, caption: '原指南实物图：扩展板插在 UNO 上' });
    const ty = TOP + ph + 0.3;
    tipBox(s, { x: L, y: ty, w: pw, h: BOT - ty, kind: 'warn', size: 12, text: [B('原文与程序不符　'), R('原指南说往上拨时“对应的 LED 灯会亮”，但程序只在串口打印。')] }, I.warn_w);
    const rx = L + pw + 0.3, rw = G.R - rx;
    V.imageBox(s, { file: 'l21/joystick_serial_buttons.jpg', x: rx, y: TOP, w: rw, h: CH, caption: '原指南串口截图：方向和按键依次出现', fill: P.white, line: P.gray2 });
  }

  // ---------------------------------------------------------------- pitfalls + try
  s = slide({
    title: '常见坑与动手改一改',
    desc: '读数乱跳先查上拉、方向误报就调死区；学会了读摇杆，就能用它控制实验三的舵机',
    notes: '左边三个坑按出现频率排：按键乱报，多半是没开上拉；摇杆不动也报方向，说明你的摇杆静止值和截图不同，先用程序①测一下再改死区；按住按键时方向不打印，是 else if 的优先级，不是坏了。右边的挑战把实验三和实验四连起来：摇杆的 X 读数用 map 换成角度，直接送给舵机，就是一个遥控云台的雏形。',
  });
  {
    const lw = 4.35, th = (CH - 0.6) / 3;
    const W = [
      ['按键乱报、自己“按下”', '多半没开上拉：检查 setup() 里的 HIGH。'],
      ['不推也报方向', '静止值不同：先跑程序①，再改 520、530。'],
      ['按住按键时方向不打印', '这是 else if 的优先级，不是坏了。'],
    ];
    W.forEach(([t, d], i) => tipBox(s, { x: L, y: TOP + i * (th + 0.3), w: lw, h: th, kind: 'warn', title: t, text: d, size: 12 }, I.warn_w));
    const rx = L + lw + 0.3, rw = G.R - rx;
    V.card(s, { x: rx, y: TOP, w: rw, h: CH });
    V.iconCircle(s, I.wrench, { x: rx + 0.2, y: TOP + 0.16, d: 0.4 });
    txt(s, '动手改一改', { x: rx + 0.74, y: TOP + 0.16, w: 2.5, h: 0.4, size: 15, bold: true, valign: 'middle' });
    let y = TOP + 0.72;
    V.numCircle(s, 1, { x: rx + 0.2, y, d: 0.28, size: 10.5 });
    txt(s, '用新写法打开上拉：7 行就够', { x: rx + 0.58, y: y - 0.02, w: rw - 0.78, h: 0.32, size: 12.5, bold: true, valign: 'middle', oneLine: true });
    y += 0.38;
    y += miniCode(s, 'pinMode(BUTTON_UP, INPUT_PULLUP);', { x: rx + 0.58, y, w: rw - 0.78, size: 10.5 }) + 0.26;
    V.numCircle(s, 2, { x: rx + 0.2, y, d: 0.28, size: 10.5 });
    txt(s, '摇杆遥控舵机（接上实验三的舵机）', { x: rx + 0.58, y: y - 0.02, w: rw - 0.78, h: 0.32, size: 12.5, bold: true, valign: 'middle', oneLine: true });
    y += 0.38;
    y += miniCode(s, 'int x = analogRead(PIN_ANALOG_X);\nint angle = map(x, 0, 1023, 0, 180);\nmyservo.write(angle);', { x: rx + 0.58, y, w: rw - 0.78, size: 10.5 }) + 0.12;
    txt(s, '别忘了 #include <Servo.h> 和 attach()', { x: rx + 0.58, y, w: rw - 0.78, h: 0.26, size: 12, color: P.muted, valign: 'middle', oneLine: true });
    y += 0.26;
    if (y > BOT - 0.1) warn(`joystick try overflow ${y.toFixed(2)}`);
  }
}

// ================================================================ 本节小结
function buildSummary({ deck, I, slide }) {
  deck.section('小结');
  const s = slide({
    title: '本节小结',
    desc: '四个实验一条主线：PWM 让数字引脚输出“中间值”，脉宽指挥舵机，摇杆把“中间值”读回来',
    notes: '先用上面四个方块按实验顺序回顾：analogWrite 的 0～255、RGB 的 256³ 种颜色、舵机的 0.5～2.5ms 脉宽、摇杆的死区。下面三张卡片是本节的三条主线：送出去、读进来、以及这节课遇到的几个坑。课后可以先做“摇杆遥控舵机”，下一节 2-2 还会用串口来调舵机角度。',
  });
  const th = 1.9;
  tileGrid(s, {
    x: L, y: TOP, w: CW, h: th, cols: 4, bigSize: 20, titleSize: 13.5,
    items: [
      { fill: P.turq, big: '0～255', title: 'PWM 调光', sub: '开着的时间占比\n决定平均电压' },
      { fill: P.gray1, big: '256³', title: 'RGB 呼吸灯', sub: '三路 PWM 叠加\nfor 让亮度渐变' },
      { fill: P.ink, big: '0.5～2.5ms', title: '舵机', sub: '脉宽决定角度\nServo 库帮你发' },
      { fill: P.white, big: '520～530', title: '摇杆', sub: '两个电位器 + 按键\n死区防误判' },
    ],
  });
  const by = TOP + th + 0.3, bh = BOT - by, bw = (CW - 0.6) / 3;
  const cards = [
    { ic: I.sliders, t: '送出去：中间值', d: 'analogWrite(引脚, 0～255)\nsetColor(红, 绿, 蓝)\nmyservo.write(0～180)' },
    { ic: I.search, t: '读进来：摇杆和按键', d: 'analogRead()：0～1023\nINPUT_PULLUP：按下读 LOW\nelse if：第一个成立就停' },
    { ic: I.warn_w, t: '小心这几个坑', d: '× 256 会越界，用 map()\n电位器接 3.3V 转不满 180°\n原指南漏印了一个 }', warn: true },
  ];
  cards.forEach((c, i) => {
    const x = L + i * (bw + 0.3);
    const top = iconCard(s, c.ic, c.t, c.warn
      ? { x, y: by, w: bw, h: bh, d: 0.36, titleSize: 13.5, fill: P.white, line: P.red, lineW: 1, iconFill: P.red, titleColor: P.red }
      : { x, y: by, w: bw, h: bh, d: 0.36, titleSize: 13.5 });
    txt(s, c.d, { x: x + 0.2, y: top - 0.04, w: bw - 0.4, h: by + bh - 0.06 - (top - 0.04), size: 12 });
  });
}

// ------------------------------------------------------------------ build
(async () => {
  const deck = await V.Deck.create({ label: '2-1　PWM 与舵机控制', title: '2-1 PWM 与舵机控制：PWM 调光、RGB 呼吸灯、电位器调节舵机、摇杆模块' });
  const I = await deck.loadIcons({
    bulb: 'FaLightbulb', warn: 'FaExclamation', check: 'FaCheck', times: 'FaTimes', chip: 'FaMicrochip', grid: 'FaTh',
    target: 'FaBullseye', book: 'FaBook', search: 'FaSearch', eye: 'FaEye', wrench: 'FaWrench', clock: 'FaClock',
    sliders: 'FaSlidersH', palette: 'FaPalette', cog: 'FaCog', cogs: 'FaCogs', gamepad: 'FaGamepad', tag: 'FaTag',
    mug: 'FaMugHot', puzzle: 'FaPuzzlePiece', car: 'FaCarSide', branch: 'FaCodeBranch', magnet: 'FaMagnet',
    hand: 'FaHandPointer', crosshairs: 'FaCrosshairs', arrowUp: 'FaArrowUp',
  });

  const slide = (o) => {
    curTitle = o.title;
    if (V.textW(o.title, 24) > 8.9) warn(`title long (${V.textW(o.title, 24).toFixed(2)})`);
    if (/[。.]$/.test(o.title)) warn('title ends with period');
    if (V.textW(o.desc, 12) > 8.95) warn(`desc long (${V.textW(o.desc, 12).toFixed(2)}): ${o.desc}`);
    if (!o.notes) throw new Error('notes missing: ' + o.title);
    return deck.slide(o);
  };

  deck.cover({
    kicker: '开源硬件与 AI 辅助编程　/　实验 2-1',
    title: '2-1　PWM 与舵机控制',
    subtitle: 'PWM 调光 · RGB 呼吸灯\n电位器调节舵机 · 摇杆',
    notes: '这节课做四个实验，主题是“中间值”：数字引脚只会 0V 和 5V，怎样让 LED 半亮、让 RGB 灯混出颜色、让舵机停在 37°？开场可以先展示一个呼吸灯或转动的舵机，再问学生：Arduino 只会开和关，它是怎么做到的？',
  });
  const ctx = { deck, I, slide };
  buildOverview(ctx);
  buildPWM(ctx);
  buildRGB(ctx);
  buildServo(ctx);
  buildJoystick(ctx);
  buildSummary(ctx);
  deck.end({
    title: '让开和关，变出无数个“中间值”',
    subtitle: 'PWM 调亮度、调颜色，脉宽调角度，摇杆把中间值读回来\n下一节：2-2 超声波 · 串口调舵机 · 红外避障 · 温湿度',
    notes: '课后挑战二选一：① 把 RGB 程序改成真正的呼吸灯，再试着混出黄、青、品红；② 用摇杆遥控实验三的舵机。下一节 2-2 会用超声波测距、用串口输入角度控制舵机，开头请两三位同学展示作品。',
  });

  await deck.save(OUT);
  console.log('saved', OUT);
  if (warns.length) console.log(`${warns.length} layout warning(s)`);
})().catch((e) => { console.error(e); process.exit(1); });
