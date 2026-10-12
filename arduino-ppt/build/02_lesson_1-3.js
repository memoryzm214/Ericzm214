// 1-3 数字输出实验：LED 流水灯实验 + 蜂鸣器模块实验
// Source: assets/pdf/guide_text.md sections 三、四 (PDF p7-15). Run: node build/02_lesson_1-3.js
const V = require('../lib/vti');
const { P, G } = V;

const OUT = __dirname + '/../output/1-3_数字输出实验_LED流水灯与蜂鸣器.pptx';

// ------------------------------------------------------------------ programs (copied from the guide; indent unified to 2 spaces)
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

// pptxgenjs mutates run option objects in place, so every run gets its own fresh options object.
const R = (text, opt) => ({ text, options: { ...(opt || {}) } });
const SUB = { subscript: true };

// Copy of the code tokenizer in vti.js (not exported) for small inline code chips.
const KW = new Set(['void', 'int', 'float', 'double', 'char', 'long', 'bool', 'byte', 'const', 'unsigned', 'if', 'else', 'for', 'while', 'return', 'true', 'false']);
const FN = new Set(['pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'delayMicroseconds', 'tone', 'noTone', 'map', 'setup', 'loop', 'Serial', 'begin', 'print', 'println']);
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

// Template tile grid tuned for content slides (big label top, title + sub anchored at bottom).
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

// Light-gray card with an icon circle and a title row. Returns the y where body content may start.
function iconCard(s, ic, title, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill, line: o.line, lineW: o.lineW });
  const d = o.d || 0.42;
  V.iconCircle(s, ic, { x: o.x + 0.2, y: o.y + 0.17, d, fill: o.iconFill });
  txt(s, title, { x: o.x + 0.2 + d + 0.14, y: o.y + 0.17, w: o.w - d - 0.54, h: d, size: o.titleSize || 15, bold: true, valign: 'middle', mono: o.mono, color: o.titleColor });
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
function wrapLine(line, max) {
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
    for (let n = from; n <= to; n++) rows += wrapLine(all[n - 1] ?? '', max).length;
    if (rows * lh <= innerH + 0.001) return size;
  }
  throw new Error(`fitCodeSize: ${from}-${to} does not fit`);
}

// ------------------------------------------------------------------ build
(async () => {
  const deck = await V.Deck.create({ label: '1-3　数字输出实验', title: '1-3 数字输出实验：LED 流水灯与蜂鸣器' });
  const I = await deck.loadIcons({
    bulb: 'FaLightbulb', warn: 'FaExclamation', check: 'FaCheck', times: 'FaTimes', chip: 'FaMicrochip', grid: 'FaTh',
    usb: 'TbDeviceUsb', resistor: 'TbCircuitResistor', cable: 'MdCable', diode: 'TbCircuitDiode', bolt: 'FaBolt',
    redo: 'FaRedo', archive: 'FaArchive', book: 'FaBook', comments: 'FaComments', volume: 'FaVolumeUp', music: 'FaMusic',
    wave: 'FaWaveSquare', clock: 'FaClock', search: 'FaSearch', wrench: 'FaWrench', eye: 'FaEye', heart: 'FaHeart',
    target: 'FaBullseye', question: 'FaQuestion', cubes: 'FaCubes', tint: 'FaTint', exchange: 'FaExchangeAlt',
    magic: 'FaMagic', pencil: 'FaPencilAlt', headphones: 'FaHeadphones', calc: 'FaCalculator', sliders: 'FaSlidersH',
    layer: 'FaLayerGroup', box: 'FaBoxOpen', plug: 'FaPlug',
  });

  const slide = (o) => {
    if (V.textW(o.title, 24) > 8.8) warn(`title long: ${o.title}`);
    if (/[。.]$/.test(o.title)) warn(`title ends with period: ${o.title}`);
    if (V.textW(o.desc, 12) > 8.9) warn(`desc long (${V.textW(o.desc, 12).toFixed(2)}): ${o.desc}`);
    if (!o.notes) throw new Error('notes missing: ' + o.title);
    return deck.slide(o);
  };

  // Two code blocks side by side, each with its notes underneath.
  function codeWithNotes(s, o) {
    const b = V.codeBlock(s, { x: o.x, y: o.y, w: o.w, h: o.h, code: o.code, from: o.from, to: o.to, hl: o.hl, file: o.file, right: o.right, size: o.size });
    const y = o.y + o.h + 0.2;
    V.explain(s, null, { x: o.x, y, w: o.w, maxY: G.bottom, items: o.notes, gap: 0.12 });
    return b;
  }

  // ================================================================ 1 cover
  deck.cover({
    kicker: '开源硬件与 AI 辅助编程　/　实验 1-3',
    title: '1-3　数字输出实验',
    subtitle: 'LED 流水灯 · 蜂鸣器模块',
    notes: '这节课做两个“数字输出”实验：先让 8 盏 LED 像流水一样依次亮起，再让蜂鸣器发出声音。开场可以问学生：红绿灯、电梯提示音是怎么被控制的？引出“Arduino 用 HIGH / LOW 指挥外部元件”。',
  });

  // ================================================================ 2 overview
  deck.section('导入');
  let s = slide({
    title: '本节导览',
    desc: '两个实验，同一个动作：用 digitalWrite() 让引脚输出 HIGH 或 LOW，控制灯光和声音',
    notes: '先给学生一张地图：上节课是“读进来”（模拟输入），这节课是“送出去”（数字输出）。两个实验都只用 digitalWrite()，区别在于开关的节奏：慢慢切换控制灯，飞快切换就成了声音。实验一顺带学三样新语法：数组、for 循环、自定义函数。',
  });
  {
    const cw = 4.4, ch = 2.4, y = G.top;
    const ex = [
      { x: G.L, ic: I.bulb, k: '实验一', t: 'LED 流水灯', d: '8 盏 LED 接在 D2～D9，一盏接一盏亮起，像水在流动。', tags: ['led_array[8]', 'for( ; ; )', 'void led_flash()', 'digitalWrite()'] },
      { x: G.R - cw, ic: I.volume, k: '实验二', t: '蜂鸣器模块', d: '有源蜂鸣器“滴滴”响；无源蜂鸣器靠开关的快慢，唱出两种音调。', tags: ['HIGH / LOW', 'delay()', 'delayMicroseconds()', 'Hz'] },
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
    txt(s, '一句话看懂数字输出：引脚就是一个开关', { x: G.L, y: 4.02, w: 6, h: 0.28, size: 13, bold: true, valign: 'middle' });
    const gw = (G.cw - 0.6) / 3, gy = 4.37, gh = 0.63;
    const items = [
      { pill: 'HIGH', t: '引脚输出 5V\n好比开关“开”' },
      { pill: 'LOW', t: '引脚输出 0V\n好比开关“关”' },
      { ic: I.bolt, t: '开关切换得飞快\n就变成了声音' },
    ];
    items.forEach((it, i) => {
      const gx = G.L + i * (gw + 0.3);
      V.card(s, { x: gx, y: gy, w: gw, h: gh });
      let tx;
      if (it.pill) {
        const pw = 0.62;
        V.pill(s, { x: gx + 0.14, y: gy + (gh - 0.3) / 2, w: pw, h: 0.3, text: it.pill, size: 11, fill: P.ink, color: P.white, mono: true });
        tx = gx + 0.14 + pw + 0.12;
      } else {
        V.iconCircle(s, it.ic, { x: gx + 0.14, y: gy + (gh - 0.36) / 2, d: 0.36 });
        tx = gx + 0.62;
      }
      txt(s, it.t, { x: tx, y: gy, w: gx + gw - 0.1 - tx, h: gh, size: 12.5, valign: 'middle' });
    });
  }

  // ================================================================ 3 divider: experiment 1
  deck.section('实验一　LED 流水灯');
  deck.divider({
    kicker: '实验 01',
    title: 'LED 流水灯实验',
    desc: '让 8 盏 LED 一个接一个亮起来，像水一样“流”过去。顺便学会三样新本领：数组、for 循环和自定义函数。',
    tiles: [
      { fill: P.turq, big: '01', title: '原理', sub: '限流电阻 · 低电平点亮', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: '8 盏灯 → D2～D9', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: '数组 · for · 函数', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '看灯怎么“流”起来', subSize: 12 },
    ],
    notes: '实验一分四步：先认识 LED 和限流电阻，再看原理图和接线，然后学新语法、逐行读代码，最后看效果。提醒学生准备 8 个 LED 和 8 个 1kΩ 电阻，先不要急着插线。',
  });

  // ================================================================ 4 LED intro
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
    V.imageBox(s, { file: 'pdf/led_photo.jpg', x: rx, y: G.top, w: iw, h: ih, diagram: true, caption: '实物：红色 LED' });
    V.imageBox(s, { file: 'pdf/led_symbol.jpg', x: rx + iw + 0.3, y: G.top, w: iw, h: ih, diagram: true, caption: '电路符号' });
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

  // ================================================================ 5 current-limiting resistor
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

  // ================================================================ 6 goal + parts
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

  // ================================================================ 7 schematic
  s = slide({
    title: '原理图：低电平点亮',
    desc: '8 盏 LED 的正极都接 5V，负极经 1kΩ 电阻接 D2～D9——引脚输出 LOW 灯亮，HIGH 灯灭',
    notes: '这一页是整个实验的关键。很多同学以为 HIGH 才是亮，这里正好相反：LED 正极已经接在 5V 上，引脚拉到 LOW（0V）时两端有电压差，电流从 5V 经 LED、电阻流进引脚，灯就亮；引脚输出 HIGH 时两端都是 5V，没有电流，灯就灭。用“水往低处流”来类比。',
  });
  {
    V.imageBox(s, { file: 'pdf/flow_schematic.jpg', x: G.L, y: G.top, w: 5.75, h: G.ch, diagram: true, caption: '原指南原理图：VCC_5V → LED1～LED8 → 1K 电阻 → D2～D9' });
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

  // ================================================================ 8 wiring
  s = slide({
    title: '接线：8 盏灯接 D2～D9',
    desc: 'LED 长脚插 5V 电源轨，短脚各串一个 1kΩ 电阻，再分别接到 D2～D9',
    notes: '先断电再接线。8 个 LED 方向要一致：长脚全部朝 5V 电源轨。每个短脚串一个电阻再接到数字口，电源轨用一根红线接到 UNO 的 5V。接完数一数：8 根信号线、1 根电源线。',
  });
  {
    V.imageBox(s, { file: 'pdf/flow_wiring.jpg', x: G.L, y: G.top, w: 4.4, h: G.ch, diagram: true, caption: '原指南接线图（短脚 · 电阻 1K · 长脚）' });
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

  // ================================================================ 9 program idea
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

  // ================================================================ 10 syntax 1: array + for
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

  // ================================================================ 11 syntax 2: functions
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

  // ================================================================ 12 code 1/3
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

  // ================================================================ 13 code 2/3 (twins)
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

  // ================================================================ 14 code 3/3 (setup + loop)
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

  // ================================================================ 15 think: real behaviour
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

  // ================================================================ 16 result
  s = slide({
    title: '实验结果：8 盏灯接力闪亮',
    desc: '上传程序后，灯一盏接一盏亮起又熄灭；改一改 flash_speed，“水流”就会变快或变慢',
    notes: '原指南的结果照片里用了黄、红两种颜色的 LED，效果更好看。原指南最后半开玩笑地建议“做一个心形流水灯”，可以作为课后小挑战：同样的 8 个引脚，换一种摆法就是新作品——这正是工业设计同学的强项。右边三个小改动建议当堂试，每次只改一处。',
  });
  {
    V.imageBox(s, { file: 'pdf/flow_result_photo.jpg', x: G.L, y: G.top, w: 5.4, h: G.ch, caption: '原指南实物照片：8 个 LED 接 UNO' });
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

  // ================================================================ 17 divider: experiment 2
  deck.section('实验二　蜂鸣器');
  deck.divider({
    kicker: '实验 02',
    title: '蜂鸣器模块实验',
    desc: 'LED 管“光”，蜂鸣器管“声”。还是用 digitalWrite()：先让有源蜂鸣器“滴滴”响，再让无源蜂鸣器唱出两种音调——频率对上乐谱，就能演奏音乐。',
    tiles: [
      { fill: P.turq, big: '01', title: '认识', sub: '有源 vs 无源', subSize: 12 },
      { fill: P.gray1, big: '02', title: '接线', sub: 'S → 9 号脚', subSize: 12 },
      { fill: P.ink, big: '03', title: '代码', sub: '开关的快慢 = 音调', subSize: 12 },
      { fill: P.white, big: '04', title: '结果', sub: '听出两种声音', subSize: 12 },
    ],
    notes: '实验二换成“声音”。先认清两种蜂鸣器的区别，接线只有三根线，两种蜂鸣器接法一样。重点是理解：声音就是很快的开关，开关越快音调越高。教室里同时响会很吵，可以让各组轮流测试。',
  });

  // ================================================================ 18 active vs passive
  s = slide({
    title: '认识蜂鸣器：有源和无源',
    desc: '“源”指的是内部振荡器，不是电源——有源通电就响，无源要 Arduino 替它打拍子',
    notes: '“有源”“无源”最容易被误解成有没有电源，其实指的是有没有内部振荡器。有源蜂鸣器像带节拍器的音乐盒，一通电就按固定音调响；无源蜂鸣器像一面鼓，要有人按节奏敲它才响，敲得快慢不同，音调就不同。两种模块都有三根针：信号、电源、地。',
  });
  {
    const labW = 1.75, cw = (G.cw - labW) / 2;
    const c1 = G.L + labW, c2 = c1 + cw;
    const ih = 1.6, iw = cw - 0.5;
    V.imageBox(s, { file: 'pdf/buzzer_active_module.jpg', x: c1 + 0.25, y: G.top, w: iw, h: ih, diagram: true });
    V.imageBox(s, { file: 'pdf/buzzer_passive_module.jpg', x: c2 + 0.25, y: G.top, w: iw, h: ih, diagram: true });
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

  // ================================================================ 19 wiring + parts
  s = slide({
    title: '接线：S 接 9 号脚，两种蜂鸣器接法一样',
    desc: 'V 接 5V、G 接 GND、S 接 9 号脚——做完实验一，换上无源蜂鸣器，线一根都不用动',
    notes: '只有三根线：红线 5V 接 V，黑线 GND 接 G，黄线 9 号脚接 S。原指南表格里写的 VCC 就是 UNO 上的 5V。无源模块上印的是 VCC、I/O、GND，对应关系一样。对照下面的组件清单检查一遍再通电。',
  });
  {
    V.imageBox(s, { file: 'pdf/buzzer_wiring.jpg', x: G.L, y: G.top, w: 5.75, h: 2.85, diagram: true, caption: '原指南接线图：黄线 9 → S · 红线 5V → V · 黑线 GND → G' });
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

  // ================================================================ 20 active code
  s = slide({
    title: '实验一代码：让有源蜂鸣器“滴——滴——”',
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

  // ================================================================ 21 active result
  s = slide({
    title: '实验一结果：只有一种音调的“滴滴”声',
    desc: '有源蜂鸣器只能发出一个固定频率的声音——程序能控制的只是“响多久、停多久”',
    notes: '上传后能听到“滴——滴——”，每声 1 秒。照片里模块上的红灯是电源指示灯。让学生思考：既然音调固定，有源蜂鸣器适合做什么？（报警、提示音、倒计时）想要旋律，就得用无源蜂鸣器。',
  });
  {
    V.imageBox(s, { file: 'pdf/buzzer_active_photo.jpg', x: G.L, y: G.top, w: 4.9, h: G.ch, caption: '原指南实物照片：有源蜂鸣器模块接 UNO' });
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

  // ================================================================ 22 sound principle
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

  // ================================================================ 23 passive code 1/2
  s = slide({
    title: '实验二代码（1/2）：frequence_1() 想发 1 kHz',
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

  // ================================================================ 24 passive code 2/2
  s = slide({
    title: '实验二代码（2/2）：低音函数和主程序',
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

  // ================================================================ 25 pitfall: delay(0.5)
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

  // ================================================================ 26 passive result
  s = slide({
    title: '实验二结果：两种不同的蜂鸣声',
    desc: '接线不变，把有源蜂鸣器换成无源蜂鸣器，就能听到两种频率不一样的声音',
    notes: '原指南的照片里用的是一只单独的无源蜂鸣器，直接插在面包板上，再用跳线连到 UNO。原指南说能听到两种频率；实际上要把 delay(0.5) 改成 delayMicroseconds(500)，1 kHz 那一段才明显。可以让学生对比改之前和改之后，用耳朵验证上一页的结论。',
  });
  {
    V.imageBox(s, { file: 'pdf/buzzer_passive_photo.jpg', x: G.L, y: G.top, w: 2.75, h: G.ch, caption: '原指南实物照片' });
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

  // ================================================================ 27 modify
  s = slide({
    title: '动手改一改：做一个会变调的蜂鸣器',
    desc: '每次只改一个数字，上传后听一听——耳朵就是最好的“测量仪器”',
    notes: '四个小任务由易到难，建议每组至少完成前两个。第 3 个把两个实验结合起来：流水灯已经占用了 D2～D9，蜂鸣器必须换一个引脚，这时就体会到用变量 buzzer 的好处。第 4 个是下节课以后会用到的 tone() 函数，它在后台帮我们生成方波，不用自己写循环。',
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

  // ================================================================ 28 summary
  deck.section('小结');
  s = slide({
    title: '本节小结',
    desc: '数字输出只有 HIGH 和 LOW 两个词：慢慢切换能控制灯光，飞快切换就变成了声音',
    notes: '用右边四个方块回顾：LOW 点亮的接法、数组 + for 批量控制、函数打包动作、频率决定音调。再提醒两个坑：数组编号从 0 开始、delay() 只认整数毫秒。下节课 2-1 开始用开关传感器做输入，把“感知”和“输出”连起来。',
  });
  {
    const w = 3.85;
    let y = G.top;
    y = lead(s, '一个函数，两种用法', 'digitalWrite() 慢慢切换 → 灯亮灯灭；\n飞快切换 → 蜂鸣器发声。', { x: G.L, y, w, size: 12.5 }) + 0.12;
    y = lead(s, '三样新本领', '数组装一排数，for 循环挨个处理，\n自定义函数把动作打包。', { x: G.L, y, w, size: 12.5 }) + 0.12;
    y = lead(s, '两个小坑', '数组编号从 0 开始；\ndelay() 只认整数毫秒。', { x: G.L, y, w, size: 12.5 }) + 0.16;
    const b = V.tags(s, ['digitalWrite()', 'led_array[i]', 'for', 'void', 'delay()', 'delayMicroseconds()'], { x: G.L, y, w, size: 10.5 });
    if (b > G.bottom) warn('summary tags overflow');
    tileGrid(s, {
      x: 4.75, y: G.top, w: G.R - 4.75, h: G.ch, cols: 2, bigSize: 24,
      items: [
        { fill: P.turq, big: 'LOW = 亮', title: '低电平点亮', sub: '正极接 5V，\n引脚拉低才有电流' },
        { fill: P.gray1, big: '[0]～[7]', title: '数组 + for', sub: '8 盏灯，\n一个循环搞定' },
        { fill: P.ink, big: 'void', title: '自定义函数', sub: '把动作打包，\n喊名字就执行' },
        { fill: P.white, big: '250 Hz', title: '频率 = 音调', sub: '周期 4 毫秒，\n每秒振动 250 次' },
      ],
    });
  }

  // ================================================================ 29 end
  deck.end({
    title: '让灯会“流”，让声音会“唱”',
    subtitle: '数字输出是所有互动作品的起点——下一节：2-1 开关传感器',
    notes: '收尾：今天的两个实验都只用到 HIGH 和 LOW，但通过节奏和组合就做出了流水灯和音调。布置课后挑战：心形流水灯，或者用蜂鸣器给流水灯配上“嘀”声。',
  });

  await deck.save(OUT);
  console.log('saved', OUT);
  if (warns.length) console.log(`${warns.length} layout warning(s)`);
})().catch((e) => { console.error(e); process.exit(1); });
