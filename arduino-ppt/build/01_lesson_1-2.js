// 1-2 模拟输入实验：AD 模数转换实验 + 光敏电阻模块实验
// Source: assets/pdf/guide_text.md sections 一、二 (PDF p1-6). Run: node build/01_lesson_1-2.js
const V = require('../lib/vti');
const { P, G } = V;

const OUT = __dirname + '/../output/1-2_模拟输入实验_AD模数转换与光敏电阻.pptx';

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

// ------------------------------------------------------------------ local helpers (lib/vti.js is shared; not edited)
const warns = [];
function warn(msg) { warns.push(msg); console.warn('LAYOUT:', msg); }

// Estimated rendered height of wrapped text (+10% for CJK rendering slack).
function hOf(str, w, size, ls = 1.3) { return V.textH(str, w, size, ls) * 1.1; }

// Text box that warns when the estimated text height exceeds the box.
function txt(s, t, o) {
  if (typeof t === 'string' && o.h != null) {
    const need = hOf(t, o.w, o.size || 14, 1.25);
    if (need > o.h + 0.02) warn(`text may overflow (${need.toFixed(2)} > ${o.h.toFixed(2)}): ${t.slice(0, 24)}`);
  }
  V.text(s, t, o);
}

// Copy of the code tokenizer in vti.js (not exported) for small inline code chips.
const KW = new Set(['void', 'int', 'float', 'double', 'char', 'long', 'bool', 'byte', 'const', 'unsigned', 'if', 'else', 'for', 'while', 'return', 'true', 'false']);
const FN = new Set(['pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'map', 'constrain', 'setup', 'loop', 'Serial', 'begin', 'print', 'println']);
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

// Small charcoal code chip (no line numbers) for snippets that are not part of the lesson program.
function miniCode(s, code, o) {
  const size = o.size || 11;
  const lines = code.split('\n');
  const lh = size * 1.36 / 72;
  const padX = 0.14;
  const h = o.h || lines.length * lh + 0.16;
  V.card(s, { x: o.x, y: o.y, w: o.w, h, fill: P.ink, radius: 0.08 });
  const y0 = o.y + (h - lines.length * lh) / 2;
  lines.forEach((ln, i) => {
    const toks = tokenizeLine(ln);
    const runs = toks.map((tk) => ({ text: tk.t, options: { color: CODE_COL[tk.k], italic: tk.k === 'com' && !/[一-鿿]/.test(tk.t), bold: tk.k === 'kw' || tk.k === 'fn' } }));
    s.addText(runs.length ? runs : [{ text: ' ', options: {} }], {
      x: o.x + padX, y: y0 + i * lh, w: o.w - 2 * padX, h: lh,
      fontFace: V.MONO, fontSize: size, color: CODE_COL.base, margin: 0, valign: 'middle', isTextBox: true, fit: 'none',
    });
    const need = V.monoW(ln, size);
    if (need > o.w - 2 * padX) warn(`miniCode too wide (${need.toFixed(2)} > ${(o.w - 2 * padX).toFixed(2)}): ${ln}`);
  });
  return h;
}

// Polyline from line segments (no arrow heads).
function polyline(s, pts, o = {}) {
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1], [x2, y2] = pts[i];
    if (Math.abs(x1 - x2) < 1e-4 && Math.abs(y1 - y2) < 1e-4) continue;
    V.arrow(s, x1, y1, x2, y2, { noHead: true, color: o.color || P.ink, width: o.width || 1.5, dash: o.dash });
  }
}

// Template tile grid with layout tuned for content slides (big label top, title + sub anchored at bottom).
function tileGrid(s, o) {
  const cols = o.cols || 2, rows = Math.ceil(o.items.length / cols);
  const tw = o.w / cols, th = o.h / rows;
  o.items.forEach((it, i) => {
    const cx = o.x + (i % cols) * tw, cy = o.y + Math.floor(i / cols) * th;
    const fill = it.fill || P.white, dark = fill === P.ink;
    s.addShape('rect', { x: cx, y: cy, w: tw, h: th, fill: { color: fill }, line: { color: P.gray2, width: 0.75 } });
    const pad = 0.2, iw = tw - 2 * pad;
    const subSize = o.subSize || 12, titleSize = o.titleSize || 15, bigSize = it.bigSize || o.bigSize || 26;
    const subH = it.sub ? hOf(it.sub, iw, subSize, 1.25) : 0;
    const subY = cy + th - pad - subH;
    const titleY = subY - 0.36;
    const bigH = bigSize / 72 * 1.3;
    if (it.big) V.text(s, it.big, { x: cx + pad, y: cy + pad - 0.04, w: iw, h: bigH, size: bigSize, bold: true, color: dark ? P.turq : P.ink, mono: it.bigMono });
    if (it.title) V.text(s, it.title, { x: cx + pad, y: titleY, w: iw, h: 0.34, size: titleSize, bold: true, color: dark ? P.white : P.ink, valign: 'middle', mono: it.titleMono });
    if (it.sub) V.text(s, it.sub, { x: cx + pad, y: subY, w: iw, h: subH, size: subSize, color: dark ? 'D0D0D0' : (fill === P.turq ? P.ink : P.muted) });
    if (cy + pad - 0.04 + bigH * 0.85 > titleY) warn(`tile crowded: ${it.title}`);
    if (V.textW(it.big || '', bigSize) > iw) warn(`tile big too wide: ${it.big}`);
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
// pptxgenjs mutates run option objects in place (it merges the box options into them),
// so every run gets its own fresh options object.
const R = (text, opt) => ({ text, options: { ...(opt || {}) } });
const SUB = { subscript: true }, SUP = { superscript: true };

// Mock serial monitor where each output line has a known y (so notes can sit level with it).
function serialMock(s, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.white, line: P.gray2, radius: 0.1 });
  s.addShape('rect', { x: o.x + 0.02, y: o.y + 0.02, w: o.w - 0.04, h: 0.32, fill: { color: P.card }, line: { color: P.card, width: 0 } });
  txt(s, o.title || '串口监视器', { x: o.x + 0.14, y: o.y + 0.04, w: o.w - 0.28, h: 0.28, size: 10, bold: true, valign: 'middle' });
  if (o.baud) V.text(s, `${o.baud} 波特率`, { x: o.x + o.w / 2, y: o.y + 0.04, w: o.w / 2 - 0.14, h: 0.28, size: 10, color: P.muted, align: 'right', valign: 'middle' });
  const size = o.size || 11;
  const lh = o.lh || size * 1.45 / 72;
  const y0 = o.y + 0.46;
  o.lines.forEach((ln, i) => {
    V.text(s, ln, { x: o.x + 0.16, y: y0 + i * lh, w: o.lineW || o.w - 0.3, h: lh, size, mono: true, valign: 'middle' });
  });
  (o.annots || []).forEach((a) => {
    V.text(s, a.text, { x: o.x + o.annX, y: y0 + a.i * lh, w: o.w - o.annX - 0.12, h: lh, size: a.size || 11, bold: true, color: P.turqDeep, valign: 'middle' });
  });
  if (y0 + o.lines.length * lh > o.y + o.h - 0.05) warn('serialMock lines overflow');
}

// Light-gray card with an icon circle and a title row. Returns the y where body content may start.
function iconCard(s, ic, title, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill, line: o.line, lineW: o.lineW });
  const d = o.d || 0.42;
  V.iconCircle(s, ic, { x: o.x + 0.2, y: o.y + 0.17, d, fill: o.iconFill });
  txt(s, title, { x: o.x + 0.2 + d + 0.14, y: o.y + 0.17, w: o.w - d - 0.54, h: d, size: o.titleSize || 15, bold: true, valign: 'middle', mono: o.mono });
  return o.y + 0.17 + d + 0.12;
}

// Component chip: icon circle + label.
function compCard(s, ic, label, x, y, w, h, size = 12.5) {
  V.card(s, { x, y, w, h });
  const d = 0.38;
  V.iconCircle(s, ic, { x: x + 0.12, y: y + (h - d) / 2, d });
  txt(s, label, { x: x + 0.12 + d + 0.13, y, w: w - d - 0.35, h, size, valign: 'middle' });
}

// Titled paragraph block: bold lead line + body. Returns bottom y.
function lead(s, title, body, o) {
  const size = o.size || 13;
  txt(s, title, { x: o.x, y: o.y, w: o.w, h: 0.3, size: o.leadSize || 14, bold: true, valign: 'middle' });
  const bh = hOf(body, o.w, size, 1.25);
  txt(s, body, { x: o.x, y: o.y + 0.34, w: o.w, h: bh, size });
  return o.y + 0.34 + bh;
}

// ------------------------------------------------------------------ build
(async () => {
  const deck = await V.Deck.create({ label: '1-2　模拟输入实验', title: '1-2 模拟输入实验：AD 模数转换与光敏电阻' });
  const I = await deck.loadIcons({
    bulb: 'FaLightbulb', warn: 'FaExclamation', check: 'FaCheck', times: 'FaTimes', chip: 'FaMicrochip', grid: 'FaTh',
    usb: 'TbDeviceUsb', slider: 'FaSlidersH', resistor: 'TbCircuitResistor', cable: 'MdCable', sun: 'FaSun',
    toggle: 'FaToggleOn', ruler: 'FaRulerHorizontal', box: 'FaBoxOpen', target: 'FaBullseye', book: 'FaBook',
    search: 'FaSearch', eye: 'FaEye', comments: 'FaComments', cut: 'FaCut', question: 'FaQuestion', wave: 'FaWaveSquare',
    led: 'FaRegLightbulb', bolt: 'FaBolt',
  });

  const slide = (o) => {
    if (V.textW(o.title, 24) > 8.8) warn(`title long: ${o.title}`);
    if (V.textW(o.desc, 12) > 8.9) warn(`desc long (${V.textW(o.desc, 12).toFixed(2)}): ${o.desc}`);
    if (!o.notes) throw new Error('notes missing: ' + o.title);
    return deck.slide(o);
  };

  // ================================================================ 1 cover
  deck.cover({
    kicker: '开源硬件与 AI 辅助编程　/　实验 1-2',
    title: '1-2　模拟输入实验',
    subtitle: 'AD 模数转换 · 光敏电阻模块',
    notes: '这节课做两个“模拟输入”实验：先用电位器认识 AD 模数转换，再用光敏电阻感知环境亮度。开场可以问学生：路灯怎么知道天黑了该亮？由此引出“传感器 + 模拟输入”。',
  });

  // ================================================================ 2 overview
  deck.section('导入');
  let s = slide({
    title: '本节导览',
    desc: '两个实验，同一个套路：把“连续变化”的量变成电压，再让 Arduino 读成数字',
    notes: '先给学生一张地图：两个实验用的是同一个套路——把变化变成电压，再读成数字。实验一的重点是 analogRead 和换算公式，实验二在此基础上加入 analogWrite 输出。下方三条是本节的学习目标，下课前回来对照一遍。',
  });
  {
    const cw = 4.4, ch = 2.35, y = G.top;
    const ex = [
      { x: G.L, ic: I.slider, k: '实验一', t: 'AD 模数转换', d: '转动电位器旋钮，Arduino 读出 0～1023 的数字，再换算成电压，显示在电脑上。', tags: ['analogRead()', 'float', '(float)', 'Serial.print()', 'Serial.println()'] },
      { x: G.R - cw, ic: I.sun, k: '实验二', t: '光敏电阻模块', d: '用光敏电阻感受环境亮度，再用读到的数去控制 RGB 灯里红灯的亮度。', tags: ['analogRead()', 'analogWrite()', 'PWM', '(int)', 'map()'] },
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
    txt(s, '学完这节课，你能：', { x: G.L, y: 4.0, w: 4, h: 0.26, size: 13, bold: true, valign: 'middle' });
    const goals = ['分清模拟信号与数字信号', '用 analogRead()\n读出传感器的数值', '用 analogWrite()\n调节灯的亮度'];
    const gw = (G.cw - 0.6) / 3;
    goals.forEach((g, i) => {
      const gx = G.L + i * (gw + 0.3);
      V.card(s, { x: gx, y: 4.32, w: gw, h: 0.68 });
      V.iconCircle(s, I.check, { x: gx + 0.14, y: 4.48, d: 0.36 });
      txt(s, g, { x: gx + 0.62, y: 4.32, w: gw - 0.74, h: 0.68, size: 12.5, valign: 'middle' });
    });
  }

  // ================================================================ 3 concept
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

  // ================================================================ 4 divider: experiment 1
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

  // ================================================================ 5 intro
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
        { fill: P.turq, big: 'A/D', title: '模数转换', sub: '模拟 → 数字\n本节的主角' },
        { fill: P.gray1, big: 'D/A', title: '数模转换', sub: '数字 → 模拟\n正好是 A/D 反过来' },
        { fill: P.ink, big: 'A0～A5', title: '6 个模拟输入口', sub: '也能当数字口用\n编号 14～19' },
        { fill: P.white, big: '10K', title: '电位器', sub: '会转的“分压旋钮”\n本实验的信号来源' },
      ],
    });
  }

  // ================================================================ 6 parts + goal
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

  // ================================================================ 7 principle 1: potentiometer
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

  // ================================================================ 8 principle 2: formula
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

  // ================================================================ 9 wiring
  s = slide({
    title: '接线：电位器接 A0，LED 接 13',
    desc: '电位器两端接 5V 和 GND，中间脚接 A0；LED 和 220Ω 电阻串联，接在 13 号脚与 GND 之间',
    notes: '先断电再接线。红线 5V、黑线 GND、黄线 A0 是电位器的三根线；蓝线从 13 号脚到 LED，LED 另一脚经 220Ω 电阻回到 GND。提醒学生 LED 长脚是正极，接反了不会亮。',
  });
  {
    V.imageBox(s, { file: 'pdf/ad_wiring.jpg', x: G.L, y: G.top, w: 5.1, h: G.ch, diagram: true, caption: '原指南接线图：红线 5V · 黄线 A0 · 黑线 GND · 蓝线 13 号脚' });
    const tx = 5.85, tw = G.R - tx;
    V.table(s, [['Arduino UNO', '10K 电位器'], ['5V', '一端'], ['A0', '中间引脚'], ['GND', '另一端']], { x: tx, y: G.top, w: tw, colW: [1.45, tw - 1.45], rowH: 0.3, size: 12, monoCols: [0], boldCols: [0], align: ['center', 'center'] });
    V.table(s, [['Arduino UNO', 'LED（串 220Ω 电阻）'], ['13', 'LED 正极（长脚）'], ['GND', '220Ω 电阻 → LED 负极']], { x: tx, y: 2.85, w: tw, colW: [1.45, tw - 1.45], rowH: 0.3, size: 12, monoCols: [0], boldCols: [0], align: ['center', 'center'] });
    V.tip(s, { x: tx, y: 4.05, w: tw, h: 0.95, kind: 'tip', text: '电位器两端的 5V、GND 对调也能用，只是读数随旋钮变化的方向会反过来。', size: 12 }, I.bulb);
  }

  // ================================================================ 10 syntax 1: analogRead + (float)
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

  // ================================================================ 11 syntax 2: Serial.print / println
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

  // ================================================================ 12 code 1/2
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

  // ================================================================ 13 code 2/2
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

  // ================================================================ 14 result
  s = slide({
    title: '实验结果：转动旋钮，数字跟着变',
    desc: '串口监视器（9600 波特率）每 2 秒打印一组：读数、提示文字、电压',
    notes: '上传后打开串口监视器，波特率选 9600。让学生慢慢转旋钮，观察读数从 0 变到 1023、电压从 0 变到 5V。不动旋钮时 398、399 来回跳是正常的测量误差。这种“读模拟值再换算”的方法，以后读大多数传感器都会用到。',
  });
  {
    const Hi = 2.05, capH = 0.3, pad = 0.12;
    const bh = Hi + 2 * pad + capH;
    const pw = Hi * 1196 / 803 + 2 * pad, sw = Hi * 449 / 366 + 2 * pad;
    V.imageBox(s, { file: 'pdf/ad_result_photo.jpg', x: G.L, y: G.top, w: pw, h: bh, caption: '实物连接（原指南照片）' });
    V.imageBox(s, { file: 'pdf/ad_serial_monitor.jpg', x: G.L + pw + 0.3, y: G.top, w: sw, h: bh, diagram: true, caption: '串口监视器（原指南截图）' });
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

  // ================================================================ 15 try it
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

  // ================================================================ 16 divider: experiment 2
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

  // ================================================================ 17 module intro
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
    V.imageBox(s, { file: 'pdf/ldr_module_photo.jpg', x: px, y: G.top, w: pw, h: 2.5, pad: 0.1 });
    const facts = [['< 1 kΩ', '强光下的电阻', false], ['≈ 1.5 MΩ', '无光时的电阻', false], ['S V G', '信号 电源 地', true]];
    const fw = (pw - 0.5) / 3;
    facts.forEach(([b, t, mono], i) => {
      const fx = px + i * (fw + 0.25);
      V.card(s, { x: fx, y: 4.15, w: fw, h: 0.85 });
      txt(s, b, { x: fx + 0.15, y: 4.24, w: fw - 0.3, h: 0.36, size: 16, bold: true, valign: 'middle', mono });
      txt(s, t, { x: fx + 0.15, y: 4.6, w: fw - 0.3, h: 0.28, size: 12, color: P.muted, valign: 'middle' });
    });
  }

  // ================================================================ 18 parts + principle chain
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

  // ================================================================ 19 wiring
  s = slide({
    title: '接线：光敏模块接 A0，RGB 模块红灯接 11',
    desc: '光敏电阻模块 S → A0、G → GND、V → 5V；RGB LED 模块 R → 11、GND → GND',
    notes: '光敏模块三根线：S 接 A0、G 接 GND、V 接 5V；RGB 模块只接 R 和 GND 两根。提醒学生 R 接的是 11 号——板上 11 旁边有 ~ 号，表示它能输出 PWM，下一页就讲。',
  });
  {
    V.imageBox(s, { file: 'pdf/ldr_wiring.jpg', x: G.L, y: G.top, w: 5.6, h: 2.6, diagram: true, caption: '原指南接线图：上方是 RGB LED 模块，下方是光敏电阻模块' });
    const tx = 6.35, tw = G.R - tx;
    V.table(s, [['Arduino UNO 板', '光敏电阻模块'], ['A0', 'S'], ['GND', 'G'], ['5V', 'V']], { x: tx, y: G.top, w: tw, colW: [1.6, tw - 1.6], rowH: 0.3, size: 12, monoCols: [0, 1], boldCols: [0], align: ['center', 'center'] });
    txt(s, 'S = 信号　G = 地　V = 电源', { x: tx, y: 2.6, w: tw, h: 0.24, size: 10.5, color: P.muted, valign: 'middle' });
    V.table(s, [['Arduino UNO 板', 'RGB LED 模块'], ['11', 'R'], ['GND', 'GND']], { x: tx, y: 3.05, w: tw, colW: [1.6, tw - 1.6], rowH: 0.3, size: 12, monoCols: [0, 1], boldCols: [0], align: ['center', 'center'] });
    V.tip(s, { x: G.L, y: 4.25, w: G.cw, h: 0.75, kind: 'tip', text: '注意：组件清单写的是“LED 模块”，接线图用的是 RGB LED 模块。\n这里只接了 R（红色）一路，所以亮的是红灯。', size: 12 }, I.search);
  }

  // ================================================================ 20 syntax: analogWrite + PWM
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

  // ================================================================ 21 code 1/2
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

  // ================================================================ 22 code 2/2
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

  // ================================================================ 23 result
  s = slide({
    title: '实验结果：盖住光敏电阻，红灯亮度跟着变',
    desc: '用手盖住或用灯照光敏电阻，红灯亮度明显改变，串口里的数值也跟着跳变',
    notes: '上传后打开串口监视器（9600），按表格顺序做三次：正常光线、用手盖住、用手机手电筒照，每次把串口数值和红灯亮度填进表里。数值是变大还是变小取决于模块内部电路，原指南没有写，让学生自己测出来、再和同桌对比。',
  });
  {
    V.imageBox(s, { file: 'pdf/ldr_result_photo.jpg', x: G.L, y: G.top, w: 4.25, h: G.ch, caption: '实物：光敏模块和 RGB 模块接在 UNO 上，红灯亮起' });
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

  // ================================================================ 24 (int) + 256 pitfall
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

  // ================================================================ 25 summary
  deck.section('小结');
  s = slide({
    title: '本节小结',
    desc: '模拟输入三步走：传感器把变化变成电压 → analogRead() 读成数字 → 换算后拿去用',
    notes: '用四个方块回顾：读进来 0～1023、换算成电压、输出去 0～255、用 map 换算范围。下一节 1-3 是数字输出（LED 流水灯、蜂鸣器），会继续用到 digitalWrite 和 delay。',
  });
  {
    const w = 3.95;
    let y = G.top;
    y = lead(s, '两个实验，同一个套路', '电位器、光敏电阻都把变化变成 A0 电压，\nArduino 再把电压读成 0～1023。', { x: G.L, y, w }) + 0.24;
    y = lead(s, '记住两个范围', '读进来 0～1023（10 位 A/D）；\n输出去 0～255（PWM）。', { x: G.L, y, w }) + 0.24;
    y = lead(s, '下一节预告', '1-3 数字输出：LED 流水灯、蜂鸣器。', { x: G.L, y, w }) + 0.24;
    const tb = V.tags(s, ['analogRead()', 'analogWrite()', '(float)', '(int)', 'map()', 'Serial.println()'], { x: G.L, y, w, size: 10.5 });
    if (tb > G.bottom) warn('summary tags overflow');
    tileGrid(s, {
      x: 4.75, y: G.top, w: G.R - 4.75, h: G.ch, cols: 2, bigSize: 24,
      items: [
        { fill: P.turq, big: '0～1023', title: 'analogRead()', sub: '把 A0～A5 的电压\n读成数字' },
        { fill: P.gray1, big: '÷1023×5', title: '换算成电压', sub: '先 (float) 再除\n小数才不会丢' },
        { fill: P.ink, big: '0～255', title: 'analogWrite()', sub: '带 ~ 的引脚\n用 PWM 调亮度' },
        { fill: P.white, big: 'map()', title: '换算范围', sub: '0～1023 → 0～255\n不会越界' },
      ],
    });
  }

  // ================================================================ 26 end
  deck.end({
    title: '旋一旋、盖一盖，让 Arduino 感知世界',
    subtitle: '模拟输入是很多传感器实验的起点——下一节：1-3 数字输出',
    notes: '课后小任务：用电位器控制 LED 亮度——把 LED 改接到带 ~ 的 11 号脚，把读数换算成 0～255 送进 analogWrite。下节课开头请两三位同学展示。',
  });

  await deck.save(OUT);
  console.log('saved', OUT);
  if (warns.length) console.log(`${warns.length} layout warning(s)`);
})().catch((e) => { console.error(e); process.exit(1); });
