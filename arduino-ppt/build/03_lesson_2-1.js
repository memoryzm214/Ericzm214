// 2-1 开关传感器实验：小磁簧开关模块实验
// Source: assets/pdf/guide_text.md section 五 (PDF p16-20). Run: node build/03_lesson_2-1.js
const V = require('../lib/vti');
const { P, G } = V;

const OUT = __dirname + '/../output/2-1_开关传感器实验_小磁簧开关.pptx';

// ------------------------------------------------------------------ program (copied from the guide, indent unified)
const CODE = `int Led=11;
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
    if (need > o.h + 0.03) warn(`text may overflow (${need.toFixed(2)} > ${o.h.toFixed(2)}): ${plainOf(t).slice(0, 26)}`);
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
  });
}

// Mock serial monitor where each output line has a known y (so notes can sit level with it).
function serialMock(s, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.white, line: P.gray2, radius: 0.1 });
  s.addShape('rect', { x: o.x + 0.02, y: o.y + 0.02, w: o.w - 0.04, h: 0.32, fill: { color: P.card }, line: { color: P.card, width: 0 } });
  txt(s, o.title || '串口监视器', { x: o.x + 0.14, y: o.y + 0.04, w: o.w * 0.6, h: 0.28, size: 10, bold: true, valign: 'middle' });
  V.text(s, `${o.baud || 9600} 波特率`, { x: o.x + o.w / 2, y: o.y + 0.04, w: o.w / 2 - 0.14, h: 0.28, size: 10, color: P.muted, align: 'right', valign: 'middle' });
  const size = o.size || 11;
  const lh = o.lh || size * 1.45 / 72;
  const y0 = o.y + 0.46;
  o.lines.forEach((ln, i) => {
    V.text(s, ln, { x: o.x + 0.2, y: y0 + i * lh, w: 0.5, h: lh, size, mono: true, valign: 'middle' });
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
  txt(s, title, { x: o.x + pad + d + 0.12, y: o.y + pad, w: o.w - 2 * pad - d - 0.12, h: d, size: 13.5, bold: true, color: P.red, valign: 'middle' });
  const by = o.y + pad + d + 0.12;
  txt(s, body, { x: o.x + pad, y: by, w: o.w - 2 * pad, h: o.y + o.h - pad + 0.04 - by, size: o.size || 12 });
}

// Component chip: icon circle + label.
function compCard(s, ic, label, x, y, w, h, size = 12.5) {
  V.card(s, { x, y, w, h });
  const d = 0.36;
  V.iconCircle(s, ic, { x: x + 0.13, y: y + (h - d) / 2, d });
  txt(s, label, { x: x + 0.13 + d + 0.13, y, w: w - d - 0.36, h, size, valign: 'middle' });
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

// Lead line + body paragraph. Returns bottom y.
function lead(s, title, body, o) {
  const size = o.size || 13;
  txt(s, title, { x: o.x, y: o.y, w: o.w, h: 0.32, size: o.leadSize || 15, bold: true, valign: 'middle' });
  const bh = hOf(plainOf(body), o.w, size, 1.25);
  txt(s, body, { x: o.x, y: o.y + 0.38, w: o.w, h: bh, size });
  return o.y + 0.38 + bh;
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

// ------------------------------------------------------------------ build
(async () => {
  const deck = await V.Deck.create({ label: '2-1　开关传感器实验', title: '2-1 开关传感器实验：小磁簧开关模块' });
  const I = await deck.loadIcons({
    bulb: 'FaLightbulb', warn: 'FaExclamation', check: 'FaCheck', times: 'FaTimes', chip: 'FaMicrochip', grid: 'FaTh',
    usb: 'TbDeviceUsb', cable: 'MdCable', magnet: 'FaMagnet', volume: 'FaVolumeUp', door: 'FaDoorOpen', laptop: 'FaLaptop',
    bike: 'FaBiking', search: 'FaSearch', wrench: 'FaWrench', eye: 'FaEye', redo: 'FaRedo', branch: 'FaCodeBranch',
    target: 'FaBullseye', book: 'FaBook', comments: 'FaComments', bolt: 'FaBolt', toggle: 'FaToggleOn', bell: 'FaBell',
    flask: 'FaFlask', plug: 'FaPlug', puzzle: 'FaPuzzlePiece', hand: 'FaHandPointer', clock: 'FaClock', link: 'FaLink',
    terminal: 'FaTerminal', question: 'FaQuestion', tools: 'FaTools', signal: 'FaSignal',
  });

  const slide = (o) => {
    if (o.title.endsWith('。')) throw new Error('title ends with a period: ' + o.title);
    if (V.textW(o.title, 24) > 8.8) warn(`title long: ${o.title}`);
    if (V.textW(o.desc, 12) > 8.9) warn(`desc long (${V.textW(o.desc, 12).toFixed(2)}): ${o.desc}`);
    if (!o.notes) throw new Error('notes missing: ' + o.title);
    return deck.slide(o);
  };

  // ================================================================ 1 cover
  deck.cover({
    kicker: '开源硬件与 AI 辅助编程　/　实验 2-1',
    title: '2-1　开关传感器实验',
    subtitle: '小磁簧开关模块',
    notes: '这节课只做一个实验：小磁簧开关。开场可以拿出一块磁铁和模块现场演示——磁铁一靠近，灯亮、蜂鸣器响。然后问学生：它是怎么“知道”磁铁来了的？带着这个问题进入本节。',
  });

  // ================================================================ 2 overview
  deck.section('导入');
  let s = slide({
    title: '本节导览',
    desc: '一个实验，吃透四件事：磁簧开关怎么工作、怎么读开关、怎么做判断、怎么用串口找问题',
    notes: '左边是本实验的“实验卡”：一句话说清要做什么、用到哪些新语法。右边四块是本节的学习路线：先认识元件，再接线、读代码、看结果。因为这节只有一个实验，我们会把磁簧开关的原理和 if / else 判断讲得更透一些。',
  });
  {
    const cx = G.L, cw = 4.0, pad = 0.26, iw = cw - 2 * pad;
    V.card(s, { x: cx, y: G.top, w: cw, h: G.ch });
    V.pill(s, { x: cx + pad, y: G.top + 0.2, text: '实验卡', size: 10.5 });
    txt(s, '小磁簧开关模块实验', { x: cx + pad, y: G.top + 0.54, w: iw, h: 0.42, size: 19, bold: true, valign: 'middle' });
    const d1 = '用一块磁铁当“钥匙”：磁铁靠近，灯亮、蜂鸣器响；磁铁拿开，全部停下。';
    txt(s, d1, { x: cx + pad, y: G.top + 1.02, w: iw, h: 0.62, size: 13 });
    txt(s, '用到的新语法', { x: cx + pad, y: G.top + 1.74, w: iw, h: 0.26, size: 12, bold: true, color: P.muted, valign: 'middle' });
    const tb = V.tags(s, ['digitalRead()', 'if / else', '==', 'Serial.println()'], { x: cx + pad, y: G.top + 2.06, w: iw, size: 10.5 });
    txt(s, [R('元件　', { bold: true, color: P.muted }), R('UNO 主板、面包板、小磁簧开关模块、LED 模块、有源蜂鸣器、磁铁')], { x: cx + pad, y: tb + 0.2, w: iw, h: 0.5, size: 12 });
    if (tb + 0.7 > G.bottom - 0.08) warn('overview card overflow');
    tileGrid(s, {
      x: 4.7, y: G.top, w: G.R - 4.7, h: G.ch, cols: 2,
      items: [
        { fill: P.turq, big: '01', title: '认识元件', sub: '磁簧开关怎么“感觉”到磁铁' },
        { fill: P.gray1, big: '02', title: '接线', sub: '三个模块，三张接线表' },
        { fill: P.ink, big: '03', title: '读代码', sub: 'digitalRead + if / else' },
        { fill: P.white, big: '04', title: '看结果', sub: '看灯、听声、读串口' },
      ],
    });
  }

  // ================================================================ 3 what is a reed switch
  deck.section('认识磁簧开关');
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
    V.imageBox(s, { file: 'pdf/reed_module_photo.jpg', x: 6.0, y: G.top, w: G.R - 6.0, h: G.ch, caption: '小磁簧开关模块：左上方的玻璃管就是磁簧开关' });
  }

  // ================================================================ 4 how it works (drawn)
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

  // ================================================================ 5 purpose + principle
  s = slide({
    title: '实验目的与实验原理',
    desc: '用磁铁去“按”磁簧开关，让 Arduino 读到开关状态，再控制 LED 和蜂鸣器',
    notes: '实验目的照原指南念即可。下方的信号链是整节课的主线：磁铁 → 簧片 → 读数 → 输出，后面的代码就是把这条链一步步写出来。第三步“读到 0”是关键，下一页专门解释为什么有磁铁时反而读到 0。',
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

  // ================================================================ 6 digital input: why 0
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

  // ================================================================ 7 parts
  deck.section('接线');
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

  // ================================================================ 8 wiring tables
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

  // ================================================================ 9 wiring diagram
  s = slide({
    title: '接线图',
    desc: '从上到下找三个模块：上 RGB 灯模块、中 磁簧开关、下 蜂鸣器；黄线是信号，红线 5V，黑线 GND',
    notes: '对照原指南接线图，从上到下找到三个模块。图里黄线都是信号线，红线是 5V，黑线是 GND，按颜色找最不容易乱。接完后同桌互相检查一遍，再插 USB 上传程序。',
  });
  {
    const iw = 4.35;
    V.imageBox(s, { file: 'pdf/reed_wiring.jpg', x: G.L, y: G.top, w: iw, h: G.ch, diagram: true, caption: '原指南接线图' });
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

  // ================================================================ 10 syntax 1: digitalRead + Serial.println
  deck.section('代码');
  s = slide({
    title: '新语法①：digitalRead() 与 Serial.println()',
    desc: 'digitalRead() 问开关“通了没有”，只回答 0 或 1；Serial.println() 把答案显示在电脑上',
    notes: 'digitalRead 只有两个答案，适合开关、按键这类“有或没有”的传感器；1-2 课学过的 analogRead 回答的是“有多少”。Serial.println 是我们的“透视眼”：传感器的状态平时看不见，打印到串口就一目了然。打开串口监视器后，记得把波特率选成 9600。',
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
    txt(s, '一个读“有没有”，一个读“有多少”（1-2 课）', { x: x + 0.2, y, w: w - 0.4, h: 0.26, size: 12, color: P.muted, valign: 'middle' });
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

  // ================================================================ 11 syntax 2: if / else, == vs =
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

  // ================================================================ 12 code 1/2
  s = slide({
    title: '代码逐行看懂（1/2）：准备工作',
    desc: '先准备四个“盒子”记住引脚号和读数，再在 setup() 里告诉 Arduino 谁是输入、谁是输出',
    notes: '前 4 行准备了四个“盒子”：三个装引脚号，一个装读数。给引脚起名字的好处是：以后换引脚只改这里，程序里其他地方都不用动。setup() 里用 pinMode 告诉 Arduino 哪些脚是输出、哪个是输入，最后打开串口。',
  });
  {
    const cw = 4.3;
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: CODE, from: 1, to: 11, hl: [1, 2, 3, 9], file: 'reed_switch.ino', right: '第 1–11 行' });
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

  // ================================================================ 13 code 2/2
  s = slide({
    title: '代码逐行看懂（2/2）：读、打印、判断',
    desc: 'loop() 不停地重复三件事：读开关、把读数打印出来、按读数决定灯和蜂鸣器开还是关',
    notes: 'loop() 是程序的核心，一共只做三件事：读、打印、判断。第 16 行的 val==0 对应“磁铁靠近”，所以成立时灯亮、蜂鸣器响；else 分支把它们关掉。第 26 行的大括号结束后，loop 会立刻从第 12 行再来一遍。',
  });
  {
    const cw = 4.3;
    const b = V.codeBlock(s, { x: G.L, y: G.top, w: cw, h: G.ch, code: CODE, from: 12, to: 26, hl: [14, 15, 16, 21], file: 'reed_switch.ino', right: '第 12–26 行' });
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

  // ================================================================ 14 flowchart
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

  // ================================================================ 15 result
  deck.section('实验结果');
  s = slide({
    title: '实验结果',
    desc: '磁铁靠近：开关输出低电平，LED 灯亮、蜂鸣器响；磁铁拿开：全部停下，串口里的数字跟着变',
    notes: '上传程序后打开串口监视器，拿磁铁慢慢靠近再拿开，观察灯、蜂鸣器和串口数字三者同步变化。右边串口画面是示意，实际上因为 loop 里没有 delay，数字会刷得非常快。如果现象不对，先看串口数字，再查接线。',
  });
  {
    const iw = 4.95;
    V.imageBox(s, { file: 'pdf/reed_result_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南实物图：磁铁靠近磁簧开关，RGB 灯亮红光' });
    const rx = G.L + iw + 0.35, rw = G.R - rx;
    const smH = 1.86;
    serialMock(s, { x: rx, y: G.top, w: rw, h: smH, title: '串口监视器（示意）', lines: ['1', '1', '0', '0', '1', '1'], annX: 0.7,
      annots: [{ i: 0, text: '← 没有磁铁：灯灭、不响' }, { i: 2, text: '← 磁铁靠近：灯亮、响' }, { i: 4, text: '← 磁铁拿开：全部停下' }] });
    const ty = G.top + smH + 0.3;
    V.tip(s, { x: rx, y: ty, w: rw, h: G.bottom - ty, kind: 'note', title: '原指南结论', text: '用一个磁铁靠近小磁簧开关，会使得小磁簧开关输出低电平，从而点亮 LED 灯，蜂鸣器响。', size: 12 }, I.check);
  }

  // ================================================================ 16 Sensor V5.0 shield
  s = slide({
    title: '更方便的接法：Sensor V5.0 扩展板',
    desc: '扩展板把每个引脚都做成 G · V · S 三针一排，模块用杜邦线直插，不用面包板',
    notes: 'Sensor V5.0 扩展板直接插在 UNO 上，把每个数字脚都扩展成 G、V、S 三根针，接传感器模块非常方便。按同样的引脚号接，程序不用改。注意排针顺序：磁簧开关是 G 对 −，V 对中间脚，S 对 S；两针的 LED 和蜂鸣器只用 S 和 G，+ 接 S，− 接 G。没有扩展板就用面包板接法。',
  });
  {
    const iw = 2.75;
    V.imageBox(s, { file: 'pdf/reed_shield_photo.jpg', x: G.L, y: G.top, w: iw, h: G.ch, caption: '原指南：扩展板接法' });
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

  // ================================================================ 17 troubleshooting
  deck.section('拓展与小结');
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

  // ================================================================ 18 try it
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

  // ================================================================ 19 summary
  s = slide({
    title: '本节小结',
    desc: '一条信号链串起整节课：磁铁 → 簧片吸合 → 读到 0 → if 判断 → 灯亮、蜂鸣器响',
    notes: '用信号链把整节课串起来：磁铁 → 簧片 → 读数 → 判断 → 输出。右边四个关键词，请学生各用一句话解释给同桌听。课后思考：你的设计作品里，哪里可以用“磁铁靠近就触发”？',
  });
  {
    const lw = 4.0;
    txt(s, '一条信号链', { x: G.L, y: G.top, w: lw, h: 0.32, size: 15, bold: true, valign: 'middle' });
    const chain = ['磁铁靠近，簧片被磁化、吸合', 'OUT 接到 GND，digitalRead 读到 0', 'if(val==0) 成立，走进 if 这条路', 'LED 亮、蜂鸣器响；磁铁拿开就走 else'];
    const ly = numList(s, chain, { x: G.L, y: G.top + 0.5, w: lw, size: 13, gap: 0.3, d: 0.32 });
    const ty = Math.max(ly + 0.3, 4.15), th = G.bottom - ty;
    V.card(s, { x: G.L, y: ty, w: lw, h: th, fill: P.turqPale });
    V.iconCircle(s, I.search, { x: G.L + 0.16, y: ty + (th - 0.38) / 2, d: 0.38 });
    txt(s, [R('调试口诀　', { bold: true }), R('先看串口，再查接线。')], { x: G.L + 0.68, y: ty, w: lw - 0.8, h: th, size: 13, valign: 'middle' });
    if (th < 0.5) warn('summary tip short');
    tileGrid(s, {
      x: 4.75, y: G.top, w: G.R - 4.75, h: G.ch, cols: 2,
      items: [
        { fill: P.turq, big: '常开', title: '磁簧开关', sub: '平时断开，\n磁铁靠近才吸合' },
        { fill: P.gray1, big: '0 / 1', title: 'digitalRead()', sub: '数字输入只回答高或低', titleMono: true },
        { fill: P.ink, big: 'if…else', title: '岔路口', sub: '成立走 if，否则走 else', bigMono: true, bigSize: 24 },
        { fill: P.white, big: '==', title: '比较不是赋值', sub: '比较相等用 ==，\n赋值才用 =', bigMono: true },
      ],
    });
  }

  // ================================================================ 20 end
  deck.end({
    title: '磁铁一靠近，Arduino 就知道了',
    subtitle: '把磁簧开关藏进你的设计：门、抽屉、盒盖……都能变得会“说话”。',
    notes: '布置课后任务：用磁簧开关设计一个小装置，比如抽屉提醒器或门磁报警器，下节课分享。',
  });

  await deck.save(OUT);
  console.log('saved', OUT);
  if (warns.length) console.log(`${warns.length} layout warning(s)`);
})().catch((e) => { console.error(e); process.exit(1); });
