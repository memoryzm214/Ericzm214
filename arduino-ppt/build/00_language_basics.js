// Arduino 编程语言基础 — standalone language-basics deck (turquoise template).
//   cd arduino-ppt && node build/00_language_basics.js  ->  output/Arduino编程语言基础.pptx
// Content: old handbook PART 1 (1.1–1.15) + appendix (语法速查 / 常见报错), re-told more plainly:
// life analogy -> minimal syntax -> tiny example -> common mistake.
const V = require('../lib/vti');
const { P, G } = V;

const OUT = __dirname + '/../output/Arduino编程语言基础.pptx';
const L = G.L, TOP = G.top, BOT = G.bottom, CW = G.R - G.L;
const MONO = V.MONO;

// ---------------------------------------------------------------- QA helpers
const WARN = [];
let NO = 0;
const warn = (m) => WARN.push(`[slide ${NO}] ${m}`);

// split text / runs into lines of runs (for measuring)
function toLines(t) {
  const lines = [];
  if (!Array.isArray(t)) { String(t).split('\n').forEach((p) => lines.push([{ text: p }])); return lines; }
  let cur = [];
  for (const r of t) {
    String(r.text).split('\n').forEach((p, i) => { if (i > 0) { lines.push(cur); cur = []; } cur.push({ text: p, options: r.options || {} }); });
    if (r.options && r.options.breakLine) { lines.push(cur); cur = []; }
  }
  if (cur.length) lines.push(cur);
  return lines;
}
const runW = (r, size) => {
  const sz = (r.options && r.options.fontSize) || size;
  return (r.options && r.options.fontFace === MONO) ? V.monoW(r.text, sz) : V.textW(r.text, sz) * 1.04;
};
function measureH(t, w, size, ls = 1.38) {
  let n = 0;
  for (const ln of toLines(t)) n += Math.max(1, Math.ceil(ln.reduce((a, r) => a + runW(r, size), 0) / (w * 0.95)));
  return n * size * ls / 72;
}
function maxLineW(t, size) { return Math.max(...toLines(t).map((ln) => ln.reduce((a, r) => a + runW(r, size), 0))); }

// Text box with an overflow check.
function T(s, t, o) {
  const size = o.size || 14;
  if (o.oneLine) { const w = maxLineW(t, size); if (w > o.w) warn(`one-line text too wide (${w.toFixed(2)} > ${o.w.toFixed(2)}): ${toLines(t).map((l) => l.map((r) => r.text).join('')).join('|').slice(0, 40)}`); }
  const need = measureH(t, o.w, size);
  if (need > o.h + 0.03) warn(`text overflow (${need.toFixed(2)} > ${o.h.toFixed(2)}): ${toLines(t).map((l) => l.map((r) => r.text).join('')).join('|').slice(0, 50)}`);
  V.text(s, t, o);
}
const m = (text, o = {}) => ({ text, options: { fontFace: MONO, ...o } });   // mono run
const b = (text, o = {}) => ({ text, options: { bold: true, ...o } });       // bold run
const r = (text, o = {}) => ({ text, options: { ...o } });                   // plain run
const br = (run) => { run.options = { ...run.options, breakLine: true }; return run; };

// ---------------------------------------------------------------- code helpers (tokenizer copied from lib/vti.js)
const KW = new Set(['void', 'int', 'float', 'double', 'char', 'long', 'short', 'bool', 'boolean', 'byte', 'word', 'String', 'const', 'unsigned', 'signed', 'static', 'if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue', 'switch', 'case', 'default', 'true', 'false']);
const FN = new Set(['pinMode', 'digitalWrite', 'digitalRead', 'analogRead', 'analogWrite', 'delay', 'delayMicroseconds', 'millis', 'micros', 'map', 'constrain', 'min', 'max', 'abs', 'pow', 'sqrt', 'sq', 'random', 'tone', 'noTone', 'pulseIn', 'setup', 'loop', 'Serial', 'begin', 'print', 'println', 'available', 'read', 'write']);
const CONSTS = /^(HIGH|LOW|INPUT|OUTPUT|INPUT_PULLUP|A[0-5]|LED_BUILTIN|DEC|HEX|BIN)$/;
const CODE_COL = { base: 'D9D9D9', kw: P.turq, fn: P.white, num: P.amber, str: P.amber, com: '8E8E8E', pre: P.turq, punct: 'BDBDBD' };
function tokenizeLine(line, state) {
  const out = [];
  let i = 0;
  const push = (t, k) => { if (!t) return; const last = out[out.length - 1]; if (last && last.k === k) last.t += t; else out.push({ t, k }); };
  while (i < line.length) {
    if (state.inBlock) {
      const end = line.indexOf('*/', i);
      if (end < 0) { push(line.slice(i), 'com'); i = line.length; break; }
      push(line.slice(i, end + 2), 'com'); i = end + 2; state.inBlock = false; continue;
    }
    const rest = line.slice(i);
    let mm;
    if (rest.startsWith('//')) { push(rest, 'com'); break; }
    if (rest.startsWith('/*')) { state.inBlock = true; push('/*', 'com'); i += 2; continue; }
    if ((mm = rest.match(/^"(?:[^"\\]|\\.)*"?/)) && rest[0] === '"') { push(mm[0], 'str'); i += mm[0].length; continue; }
    if ((mm = rest.match(/^'(?:[^'\\]|\\.)*'?/)) && rest[0] === '\'') { push(mm[0], 'str'); i += mm[0].length; continue; }
    if ((mm = rest.match(/^#\s*\w+/))) { push(mm[0], 'pre'); i += mm[0].length; continue; }
    if ((mm = rest.match(/^\d+(?:\.\d+)?/))) { push(mm[0], 'num'); i += mm[0].length; continue; }
    if ((mm = rest.match(/^[A-Za-z_]\w*/))) {
      const w = mm[0];
      const k = KW.has(w) ? 'kw' : CONSTS.test(w) ? 'num' : FN.has(w) ? 'fn' : 'base';
      push(w, k); i += w.length; continue;
    }
    if ((mm = rest.match(/^\s+/))) { push(mm[0], out.length ? out[out.length - 1].k : 'base'); i += mm[0].length; continue; }
    push(rest[0], 'punct'); i += 1;
  }
  return out;
}
function codeRuns(code) {
  const st = { inBlock: false };
  const lines = code.split('\n');
  const runs = [];
  lines.forEach((ln, i) => {
    const last = i === lines.length - 1;
    const toks = tokenizeLine(ln, st);
    if (!toks.length) { runs.push({ text: ' ', options: { breakLine: !last } }); return; }
    toks.forEach((tk, j) => runs.push({ text: tk.t, options: { color: CODE_COL[tk.k], bold: tk.k === 'kw' || tk.k === 'fn', italic: tk.k === 'com', breakLine: j === toks.length - 1 && !last } }));
  });
  return runs;
}

// Small charcoal code chip (no line numbers), syntax coloured.
function snippet(s, o) {
  const size = o.size || 10.5, pad = o.pad ?? 0.12;
  const lines = o.code.split('\n');
  const need = Math.max(...lines.map((l) => V.monoW(l, size) * 1.004));
  if (need > o.w - 2 * pad + 0.005) warn(`snippet too wide (${need.toFixed(2)} > ${(o.w - 2 * pad).toFixed(2)}): ${o.code.slice(0, 30)}`);
  if (lines.length * size * 1.2 / 72 > o.h + 0.01) warn(`snippet too tall: ${o.code.slice(0, 30)}`);
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill || P.ink, radius: o.radius ?? 0.08 });
  V.text(s, codeRuns(o.code), { x: o.x + pad, y: o.y, w: o.w - 2 * pad, h: o.h, size, mono: true, color: CODE_COL.base, valign: 'middle', lineSpacingMultiple: 1.0 });
}

// Wrapper around V.codeBlock that also checks real line widths (CJK comments are 1em wide in mono text).
function code(s, o) {
  const blk = V.codeBlock(s, o);
  const all = o.code.replace(/\t/g, '    ').split('\n');
  const from = o.from || 1, to = o.to || all.length;
  const charW = blk.size * 0.602 / 72;
  const avail = o.w - 0.28 - (String(to).length + 1.6) * charW;
  for (let n = from; n <= to; n++) {
    const src = all[n - 1] || '';
    // LibreOffice adds autospace around CJK and renders fullwidth "～" a bit wider: keep extra slack for those lines.
    const slack = (/[⺀-鿿＀-｠]/.test(src) ? 0.12 : 0) + (src.match(/～/g) || []).length * 0.1;
    const w = V.monoW(src, blk.size) * 1.004 + slack;
    if (w > avail + 0.005) warn(`code line ${n} too wide (${w.toFixed(2)} > ${avail.toFixed(2)}) at ${blk.size}pt`);
  }
  if (blk.rows !== to - from + 1) warn(`code wrapped (${blk.rows} rows for ${to - from + 1} lines)`);
  blk.x0 = o.x + 0.14 + (String(to).length + 1.6) * charW;   // x where code text starts
  blk.charW = charW;
  return blk;
}

// ---------------------------------------------------------------- drawing helpers
let I;
function line(s, x1, y1, x2, y2, o = {}) { V.arrow(s, x1, y1, x2, y2, { ...o, noHead: true }); }

// ✓ / ✗ marker
function mark(s, ok, x, y, d = 0.26) {
  V.iconCircle(s, ok ? I.check : I.times_w, { x, y, d, fill: ok ? P.turq : P.red, scale: 0.5 });
}

// icon circle + bold heading on one row
function iconTitle(s, ic, title, o) {
  const d = o.d || 0.42;
  V.iconCircle(s, ic, { x: o.x, y: o.y, d, fill: o.fill || P.turq });
  T(s, title, { x: o.x + d + 0.14, y: o.y - 0.02, w: o.w - d - 0.14, h: d + 0.04, size: o.size || 15, bold: true, valign: 'middle', color: o.color || P.ink, oneLine: true });
}

// Template tile (square corners, thin border) with optional big number and icon.
function tile(s, o) {
  const dark = o.fill === P.ink, turq = o.fill === P.turq;
  s.addShape('rect', { x: o.x, y: o.y, w: o.w, h: o.h, fill: { color: o.fill }, line: { color: P.gray2, width: 0.75 } });
  const pad = 0.22, d = o.d || 0.46;
  const circFill = turq ? P.ink : P.turq;
  const ic = o.icon ? (turq ? I[o.icon + '_w'] : I[o.icon]) : null;
  if (o.big) {
    V.text(s, o.big, { x: o.x + pad, y: o.y + 0.14, w: 1.2, h: 0.55, size: 28, bold: true, color: dark ? P.turq : P.ink });
    if (ic) V.iconCircle(s, ic, { x: o.x + o.w - pad - d, y: o.y + 0.18, d, fill: circFill });
  } else if (ic) V.iconCircle(s, ic, { x: o.x + pad, y: o.y + pad, d, fill: circFill });
  const ty = o.titleY ?? 0.82;
  T(s, o.title, { x: o.x + pad, y: o.y + ty, w: o.w - 2 * pad, h: 0.38, size: o.titleSize || 16, bold: true, color: dark ? P.white : P.ink, valign: 'middle', oneLine: true });
  if (o.sub) T(s, o.sub, { x: o.x + pad, y: o.y + ty + 0.42, w: o.w - 2 * pad, h: o.h - ty - 0.42 - 0.1, size: o.subSize || 12, color: dark ? 'D6D6D6' : (turq ? P.ink : P.muted) });
}

// V.tip with a pre-check of the text box size.
function tipBox(s, o, ic) {
  const tw = o.w - 0.32 - (ic ? 0.5 : 0);
  const th = o.h - 0.31 - (o.title ? 0.34 : 0);
  if (o.text) { const need = measureH(o.text, tw, o.size || 12); if (need > th + 0.03) warn(`tip overflow (${need.toFixed(2)} > ${th.toFixed(2)}): ${String(o.title || '')}`); }
  V.tip(s, o, ic);
}

// One-row "动手试一试" strip.
function tryStrip(s, o) {
  const h = o.h || 0.55;
  V.card(s, { x: o.x, y: o.y, w: o.w, h, fill: P.turqPale });
  V.iconCircle(s, I.wrench, { x: o.x + 0.14, y: o.y + (h - 0.34) / 2, d: 0.34 });
  T(s, [b(o.label || '动手试一试　'), ...o.runs], { x: o.x + 0.6, y: o.y, w: o.w - 0.74, h, size: 12, valign: 'middle' });
}

// Bullet list drawn item by item (V.bullets loses the bullet glyph on multi-run items, see report).
function dotList(s, items, o) {
  const size = o.size || 12, gap = o.gap ?? 0.1, tw = o.w - 0.2;
  let y = o.y;
  for (const it of items) {
    const h = measureH(it, tw, size);
    const cy = y + size * 1.32 / 72 / 2;
    s.addShape('ellipse', { x: o.x + 0.02, y: cy - 0.035, w: 0.07, h: 0.07, fill: { color: P.turqDeep }, line: { color: P.turqDeep, width: 0 } });
    V.text(s, it, { x: o.x + 0.2, y, w: tw, h: h + 0.02, size });
    y += h + gap;
  }
  if (o.maxY && y - gap > o.maxY + 0.02) warn(`dotList overflow (${(y - gap).toFixed(2)} > ${o.maxY})`);
  return y - gap;
}

// Explanation list (stacked, or aligned with code lines when a block is given).
function explain(s, blk, o) { return V.explain(s, blk, { title: '逐行看懂', maxY: BOT, ...o }); }

function lerp(a, c, t) {
  const pa = [0, 2, 4].map((i) => parseInt(a.slice(i, i + 2), 16)), pc = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  return pa.map((v, i) => Math.round(v + (pc[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
}
// light -> turquoise -> deep turquoise bar (an "analog" continuum)
function gradBar(s, x, y, w, h, n = 18) {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const c = t < 0.5 ? lerp('F2FDFB', P.turq, t * 2) : lerp(P.turq, '13756C', (t - 0.5) * 2);
    s.addShape('rect', { x: x + i * w / n, y, w: w / n + 0.002, h, fill: { color: c }, line: { color: c, width: 0 } });
  }
  s.addShape('rect', { x, y, w, h, fill: { color: 'FFFFFF', transparency: 100 }, line: { color: P.gray2, width: 0.75 } });
}

// PWM square wave: duty 0..1
function pwmWave(s, x, y, w, h, duty) {
  if (duty >= 1) s.addShape('rect', { x, y, w, h, fill: { color: P.turq }, line: { color: P.turq, width: 0 } });
  else if (duty > 0) {
    const n = 5, per = w / n;
    for (let i = 0; i < n; i++) s.addShape('rect', { x: x + i * per, y, w: per * duty, h, fill: { color: P.turq }, line: { color: P.turq, width: 0 } });
  }
  line(s, x, y + h, x + w, y + h, { color: P.ink, width: 1 });
}

// Cheat-sheet card: icon + title, then rows of [code, note]
function cheat(s, o) {
  V.card(s, { x: o.x, y: o.y, w: o.w, h: o.h });
  iconTitle(s, I[o.icon], o.title, { x: o.x + 0.18, y: o.y + 0.13, w: o.w - 0.36, d: 0.34, size: 14 });
  const pitch = o.pitch || 0.235, cs = o.codeSize || 11;
  o.rows.forEach(([c, note], i) => {
    const y = o.y + 0.56 + i * pitch;
    const cw = note ? o.codeW : o.w - 0.36;
    if (V.monoW(c, cs) > cw + 0.01) warn(`cheat code too wide: ${c}`);
    V.text(s, c, { x: o.x + 0.2, y, w: cw, h: pitch, size: cs, mono: true, bold: true, valign: 'middle' });
    if (note) T(s, note, { x: o.x + 0.2 + o.codeW, y, w: o.w - 0.4 - o.codeW, h: pitch, size: 12, color: P.muted, valign: 'middle', oneLine: true });
  });
  if (0.56 + o.rows.length * pitch > o.h - 0.08) warn(`cheat card ${o.title} overflow`);
}

// ---------------------------------------------------------------- programs (copied from the handbook)
const SKELETON = `void setup() {
  // 只运行一次：
  // 设置引脚、打开串口……
}

void loop() {
  // 反复运行，永不停止：
  // 读传感器、控制输出……
}`;

const SERIAL_DEMO = `int count = 0;

void setup() {
  Serial.begin(9600);          // 打开串口，波特率 9600
  Serial.println("Hello!");    // 发送一行文字
}

void loop() {
  count = count + 1;           // 计数加 1
  Serial.print("第 ");
  Serial.print(count);         // 打印变量的值
  Serial.println(" 次循环");
  delay(1000);                 // 等 1 秒
}`;

const IF_SYNTAX = `if (条件) {
  // 条件成立时执行
} else if (条件2) {
  // 条件2 成立时执行
} else {
  // 都不成立时执行
}`;

const IF_DEMO = `int buttonPin = 2;   // 按键接 2 号引脚（按下读到 LOW）
int ledPin = 13;     // 板载 L 灯

void setup() {
  pinMode(buttonPin, INPUT);
  pinMode(ledPin, OUTPUT);
}

void loop() {
  if (digitalRead(buttonPin) == LOW) {
    digitalWrite(ledPin, HIGH);   // 按下：开灯
  } else {
    digitalWrite(ledPin, LOW);    // 松开：关灯
  }
}`;

const FOR_DEMO = `void setup() {
  pinMode(9, OUTPUT);
}

void loop() {
  for (int i = 0; i <= 255; i++) {
    analogWrite(9, i);   // 亮度逐渐增加
    delay(10);           // 每级停留 10 毫秒
  }
  for (int i = 255; i >= 0; i--) {
    analogWrite(9, i);   // 亮度逐渐减小
    delay(10);
  }
}`;

const SET_COLOR = `void setColor(int red, int green, int blue) {
  analogWrite(11, red);
  analogWrite(10, green);
  analogWrite(9, blue);
}`;

const FUNC_DEMO = `int ledPin = 13;

// 自己写一个函数：闪 times 次，每次间隔 ms 毫秒
void blink(int times, int ms) {
  for (int i = 0; i < times; i++) {
    digitalWrite(ledPin, HIGH);
    delay(ms);
    digitalWrite(ledPin, LOW);
    delay(ms);
  }
}

void setup() {
  pinMode(ledPin, OUTPUT);
}

void loop() {
  blink(3, 150);    // 快闪 3 下
  delay(800);
  blink(1, 600);    // 慢闪 1 下
  delay(800);
}`;

const MAP_DEMO = `int knob = A0;     // 电位器接 A0
int led  = 9;      // LED 接 9 号（PWM 引脚）

void setup() {
  pinMode(led, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  int val = analogRead(knob);               // 0～1023
  int light = map(val, 0, 1023, 0, 255);    // 换算成 0～255
  light = constrain(light, 0, 255);         // 限制在范围内
  analogWrite(led, light);
  Serial.print(val);
  Serial.print(" -> ");
  Serial.println(light);
  delay(200);
}`;

// ---------------------------------------------------------------- build
(async () => {
  const deck = await V.Deck.create({ label: 'Arduino 编程语言基础', title: 'Arduino 编程语言基础', subject: 'Arduino 编程语言基础' });
  I = await deck.loadIcons({
    bulb: 'FaLightbulb', warn: 'FaExclamation', check: 'FaCheck', times: 'FaTimes', clock: 'FaClock', comments: 'FaComments',
    redo: 'FaRedo', branch: 'FaCodeBranch', box: 'FaBoxOpen', cubes: 'FaCubes', book: 'FaBook', sliders: 'FaSlidersH',
    search: 'FaSearch', wrench: 'FaWrench', keyboard: 'FaKeyboard', store: 'FaStore', utensils: 'FaUtensils', code: 'FaCode',
    toggle: 'FaToggleOn', stopwatch: 'FaStopwatch', calc: 'FaCalculator', ruler: 'FaRulerHorizontal', puzzle: 'FaPuzzlePiece',
    lock: 'FaLock', archive: 'FaArchive', hand: 'FaHandPointer', bug: 'FaBug', laptop: 'FaLaptopCode', chip: 'FaMicrochip',
    question: 'FaQuestion', font: 'FaFont', bed: 'FaBed', balance: 'FaBalanceScale', plug: 'FaPlug', bolt: 'FaBolt',
    bullseye: 'FaBullseye', listol: 'FaListOl', sun: 'FaSun', running: 'FaRunning', download: 'FaDownload', eye: 'FaEye',
  });
  const slide = (o) => { NO++; return deck.slide(o); };
  const divider = (o) => { NO++; return deck.divider(o); };
  let s, blk;

  // ============================================================ 1 cover
  deck.section('开始之前');
  NO++;
  deck.cover({
    kicker: '开源硬件与 AI 辅助编程　/　编程语言基础',
    title: 'Arduino 编程语言基础',
    subtitle: '从零读懂 Arduino 代码',
    meta: '湖北工业大学 · 工业设计学院',
    notes: '这一讲把 Arduino 编程语言的基础单独拿出来讲：不追求一次学全，先能读懂套件里的代码。每个知识点都按“生活类比 → 最小写法 → 小例子 → 常见错误”的顺序展开。建议学生边听边在 Arduino IDE 里跟着敲。',
  });

  // ============================================================ 2 route
  s = slide({
    title: '这节课的学习路线',
    desc: '6 个小站：前 5 站学语法，最后一站是写代码时随手翻的速查表。',
    notes: '先给学生一张地图：6 个小站，前 5 站是语法，最后一站是随时翻的速查表。每一站都对应套件实验里马上会用到的东西，不讲用不到的语法。可以告诉学生：学完第 3 站就能自己点灯、读按键。',
  });
  {
    const items = [
      { fill: P.turq, big: '01', title: '程序的骨架', sub: 'setup() 和 loop()\n写代码的 6 条规则', icon: 'cubes' },
      { fill: P.gray1, big: '02', title: '变量与数据', sub: '变量、数据类型、常量\n数组、运算符', icon: 'box' },
      { fill: P.white, big: '03', title: '和硬件对话', sub: '数字 / 模拟输入输出\n时间、串口', icon: 'plug' },
      { fill: P.ink, big: '04', title: '让程序会做决定', sub: 'if / else 判断\nfor / while 循环', icon: 'branch' },
      { fill: P.white, big: '05', title: '把代码打包', sub: '自定义函数、map() 换算\n库 #include', icon: 'puzzle' },
      { fill: P.gray1, big: '06', title: '速查与排错', sub: '四类输入输出、语法速查\n常见报错', icon: 'search' },
    ];
    const tw = CW / 3, th = (BOT - TOP) / 2;
    items.forEach((it, i) => tile(s, { ...it, x: L + (i % 3) * tw, y: TOP + Math.floor(i / 3) * th, w: tw, h: th, titleY: 0.8 }));
  }

  // ============================================================ 3 analogy
  s = slide({
    title: '先打个比方：程序就是一份“菜谱”',
    desc: 'Arduino 是一个听话但很死板的小助手：你写什么，它就一步一步照着做。',
    notes: '用“菜谱”打比方：程序就是一条条写清楚的步骤，Arduino 严格按顺序执行。强调它“听话但死板”：标点、大小写、拼写错一点都不行，这也是后面 6 条规则的由来。可以现场念一遍左边三行代码，让学生说出 LED 会怎样。Arduino 用的是 C / C++ 语言，但只要认识骨架和十几个常用函数，就能完成套件里的全部实验。',
  });
  {
    const lw = 4.15;
    T(s, '程序就是写给 Arduino 的指令清单：\n一行一句话，它从上往下照着做。', { x: L, y: TOP, w: lw, h: 0.62, size: 14 });
    T(s, 'Arduino 用的是 C / C++ 语言。不用一下子全学会：\n认识程序的骨架和十几个常用函数，\n就能完成套件里的全部实验。', { x: L, y: 2.1, w: lw, h: 0.75, size: 12, color: P.muted });
    const cy = 3.15, ch = 1.85;
    V.card(s, { x: L, y: cy, w: lw, h: ch });
    T(s, '菜谱上写的', { x: L + 0.18, y: cy + 0.12, w: 1.3, h: 0.28, size: 12, bold: true, color: P.muted, valign: 'middle' });
    T(s, '程序里写的', { x: L + 1.8, y: cy + 0.12, w: 2.0, h: 0.28, size: 12, bold: true, color: P.muted, valign: 'middle' });
    const rows = [['① 把灯打开', 'digitalWrite(13, HIGH);'], ['② 等 1 秒', 'delay(1000);'], ['③ 把灯关掉', 'digitalWrite(13, LOW);']];
    rows.forEach(([a, c], i) => {
      const y = cy + 0.5 + i * 0.45;
      T(s, a, { x: L + 0.18, y, w: 1.25, h: 0.34, size: 13, bold: true, valign: 'middle', oneLine: true });
      V.arrow(s, L + 1.42, y + 0.17, L + 1.72, y + 0.17, { color: P.muted });
      snippet(s, { x: L + 1.8, y, w: 2.17, h: 0.34, size: 10, pad: 0.1, code: c });
    });
    const tx = 4.95, tw = (9.55 - tx) / 2, th = (BOT - TOP) / 2;
    const tl = [
      { fill: P.turq, icon: 'listol', title: '一步一步照做', sub: '从上往下一行行执行，\n不会跳步' },
      { fill: P.gray1, icon: 'keyboard', title: '只认英文标点', sub: '中文的 ；（）“”\n它看不懂' },
      { fill: P.ink, icon: 'font', title: '分得清大小写', sub: 'pinMode 对，写成\npinmode 它就不认识' },
      { fill: P.white, icon: 'question', title: '不会猜你的意思', sub: '少一个分号，\n它就“罢工”报错' },
    ];
    tl.forEach((it, i) => tile(s, { ...it, x: tx + (i % 2) * tw, y: TOP + Math.floor(i / 2) * th, w: tw, h: th, titleY: 0.86, titleSize: 15, d: 0.5 }));
  }

  // ============================================================ SECTION 1
  deck.section('程序的骨架');
  divider({
    kicker: '第 1 站', title: '程序的骨架',
    desc: '每个 Arduino 程序都长着同一副“骨架”：\nsetup() 负责开机准备，loop() 负责不停干活。\n再记住 6 条书写规则，代码就不会被“退货”。',
    tiles: [
      { fill: P.turq, big: '01', title: 'setup()', sub: '开机只做一次', subSize: 12 },
      { fill: P.gray1, big: '02', title: 'loop()', sub: '一遍遍不停重复', subSize: 12 },
      { fill: P.ink, big: '03', title: '书写规则', sub: '分号、括号、大小写', subSize: 12 },
      { fill: P.white, big: '04', title: '注释', sub: '写给人看的说明', subSize: 12 },
    ],
    notes: '第 1 站只讲一件事：所有 Arduino 程序都长着同一副骨架。看懂 setup() 和 loop() 的分工，再记住 6 条书写规则，后面的代码就都能“对号入座”。',
  });

  // ------------------------------------------------------------ setup / loop
  s = slide({
    title: '程序的骨架：setup() 和 loop()',
    desc: '每个程序都至少有这两个函数：setup() 开机只做一次，loop() 做完又从头再来。',
    notes: '用开店来类比：setup() 是开门前的准备，只做一次；loop() 是营业时间，一遍遍重复，直到断电。强调两个函数都必须写，哪怕里面是空的。可以让学生按一下板子上的复位键，观察程序会从 setup() 重新开始。',
  });
  code(s, { x: L, y: TOP, w: 4.4, h: 2.35, code: SKELETON, file: 'skeleton.ino', hl: [1, 6] });
  tipBox(s, { x: L, y: 4.0, w: 4.4, h: 1.0, text: 'void 表示“不交回结果”；\n( ) 里放参数，{ } 里写要做的事；\n两个函数都必须写，哪怕里面是空的。' }, I.bulb);
  {
    const fx = 5.2, fw = 3.75, cx = fx + fw / 2;
    V.card(s, { x: fx, y: TOP, w: fw, h: 0.42, fill: P.gray1 });
    V.iconCircle(s, I.bolt, { x: fx + 0.08, y: TOP + 0.05, d: 0.32 });
    T(s, '通电 / 按复位键', { x: fx + 0.52, y: TOP, w: fw - 0.6, h: 0.42, size: 13, bold: true, valign: 'middle' });
    V.arrow(s, cx, TOP + 0.44, cx, 1.99, { color: P.ink });
    const flow = (y, fill, ic, icFill, head, tail, text) => {
      V.card(s, { x: fx, y, w: fw, h: 1.15, fill });
      V.iconCircle(s, ic, { x: fx + 0.18, y: y + 0.18, d: 0.42, fill: icFill });
      T(s, [m(head, { bold: true }), b('　' + tail)], { x: fx + 0.74, y: y + 0.16, w: fw - 0.9, h: 0.42, size: 15, valign: 'middle', oneLine: true });
      T(s, text, { x: fx + 0.74, y: y + 0.6, w: fw - 0.92, h: 0.5, size: 12 });
    };
    flow(2.02, P.card, I.store, P.turq, 'setup()', '只执行一次', '像开店前的准备：\n开灯、摆货、开收银机，只做一次');
    V.arrow(s, cx, 3.19, cx, 3.4, { color: P.ink });
    flow(3.42, P.turq, I.redo_w, P.ink, 'loop()', '做完又从头开始', '像营业时间：\n一位客人接一位客人，不停地重复');
    const rx = fx + fw;
    line(s, rx + 0.02, 4.3, rx + 0.32, 4.3, { color: P.ink });
    line(s, rx + 0.32, 4.3, rx + 0.32, 3.75, { color: P.ink });
    V.arrow(s, rx + 0.32, 3.75, rx + 0.04, 3.75, { color: P.ink });
    T(s, 'loop() 跑完最后一行，马上回到第一行，永不停止', { x: fx, y: 4.68, w: 4.35, h: 0.3, size: 12, color: P.muted, oneLine: true });
  }

  // ------------------------------------------------------------ 6 rules
  s = slide({
    title: '写代码的 6 条规则',
    desc: '代码要让电脑看懂，规则比写作文严格得多——红框里的 3 条最容易出错。',
    notes: '前三条（分号、英文标点、大小写）是新手报错的三大来源，红框卡片里打 ✗ 的写法都会编译失败。提醒学生写代码前先切换到英文输入法。原课件里“int 按钮状态 = digitalRead(2);”这类中文变量名只是为了说明意思，实际写代码要用英文名字，例如 buttonState。',
  });
  {
    const cw = (CW - 0.6) / 3, chh = (BOT - TOP - 0.3) / 2;
    const top = [
      ['01', '每句话以分号结尾', 'pinMode(13, OUTPUT)', 'pinMode(13, OUTPUT);', '漏了分号是最常见的错误'],
      ['02', '只用英文标点', 'int ledPin = 13；', 'int ledPin = 13;', '写代码前切换到英文输入法'],
      ['03', '严格区分大小写', 'pinmode(13, output);', 'pinMode(13, OUTPUT);', 'OUTPUT、HIGH 都要大写'],
    ];
    top.forEach(([n, t, bad, good, note], i) => {
      const x = L + i * (cw + 0.3), y = TOP;
      V.card(s, { x, y, w: cw, h: chh, fill: P.white, line: P.red, lineW: 1 });
      T(s, [b(n + '　', { color: P.red }), b(t)], { x: x + 0.16, y: y + 0.12, w: cw - 0.32, h: 0.32, size: 14, valign: 'middle', oneLine: true });
      mark(s, false, x + 0.16, y + 0.56, 0.24);
      snippet(s, { x: x + 0.5, y: y + 0.52, w: cw - 0.66, h: 0.32, size: 10.5, pad: 0.1, code: bad });
      mark(s, true, x + 0.16, y + 0.94, 0.24);
      snippet(s, { x: x + 0.5, y: y + 0.9, w: cw - 0.66, h: 0.32, size: 10.5, pad: 0.1, code: good });
      T(s, note, { x: x + 0.16, y: y + 1.3, w: cw - 0.32, h: 0.3, size: 12, oneLine: true });
    });
    const bottom = [
      ['04', '大括号成对出现', 'void loop() { … }', '函数、if、for 的内容\n都写在 { } 里'],
      ['05', '注释不会被执行', '// 单行  /* 多行 */', '注释是写给人看的说明，\nArduino 会跳过它'],
      ['06', '名字用英文字母', 'int ledPin = 13;', '可以用字母、数字、下划线；\n不能数字开头，不能用中文'],
    ];
    bottom.forEach(([n, t, c, note], i) => {
      const x = L + i * (cw + 0.3), y = TOP + chh + 0.3;
      V.card(s, { x, y, w: cw, h: chh });
      T(s, [b(n + '　', { color: P.turqDeep }), b(t)], { x: x + 0.16, y: y + 0.12, w: cw - 0.32, h: 0.32, size: 14, valign: 'middle', oneLine: true });
      snippet(s, { x: x + 0.16, y: y + 0.52, w: cw - 0.32, h: 0.32, size: 10.5, pad: 0.1, code: c });
      T(s, note, { x: x + 0.16, y: y + 0.96, w: cw - 0.32, h: 0.62, size: 12 });
    });
  }

  // ============================================================ SECTION 2
  deck.section('变量与数据');
  divider({
    kicker: '第 2 站', title: '变量与数据',
    desc: '程序要“记住”东西：传感器的读数、\n计数器、开关状态……都放在变量里。\n这一站认识变量、数据类型、常量和数组，\n以及用来计算、比较的运算符。',
    tiles: [
      { fill: P.turq, big: '01', title: '变量', sub: '贴了标签的盒子', subSize: 12 },
      { fill: P.gray1, big: '02', title: '数据类型', sub: '盒子能装什么', subSize: 12 },
      { fill: P.ink, big: '03', title: '常量与数组', sub: '不变的数、一排盒子', subSize: 12 },
      { fill: P.white, big: '04', title: '运算符', sub: '算一算、比一比', subSize: 12 },
    ],
    notes: '第 2 站讲程序怎么“记东西”。变量就像贴了标签的盒子，数据类型决定盒子能装什么，运算符负责计算和比较。这里有两个大坑（整数除法、= 和 ==），一定要讲透。',
  });

  // ------------------------------------------------------------ variables
  s = slide({
    title: '变量：贴了标签的盒子',
    desc: '变量就是一个有名字的“盒子”：先说清楚装什么、叫什么，再往里放东西。',
    notes: '把一句 int count = 0; 像产品爆炸图一样拆开：类型、名字、放进去的值、分号。强调“先声明，再使用”，以及变量里的值可以随时改变——count = count + 1 就是把盒子里的数加 1 再放回去。',
  });
  snippet(s, { x: L, y: TOP, w: CW, h: 0.6, size: 16, pad: 0.3, code: 'int count = 0;     // 准备一个叫 count 的盒子，先放进 0' });
  {
    const parts = [['int', '类型', '装整数的盒子'], ['count', '名字', '贴在盒子上的标签'], ['= 0', '放进去', '把 0 放进盒子，\n这叫“初始值”'], [';', '结束', '这句话说完了']];
    const pw = (CW - 0.9) / 4, y = 2.25;
    parts.forEach(([tok, role, ex], i) => {
      const x = L + i * (pw + 0.3);
      V.card(s, { x, y, w: pw, h: 1.17 });
      const tw = V.pill(s, { x: x + 0.16, y: y + 0.14, text: tok, mono: true, size: 15, h: 0.38, fill: P.turq });
      T(s, role, { x: x + 0.16 + tw + 0.12, y: y + 0.14, w: pw - tw - 0.44, h: 0.38, size: 14, bold: true, valign: 'middle', oneLine: true });
      T(s, ex, { x: x + 0.16, y: y + 0.6, w: pw - 0.32, h: 0.48, size: 12 });
    });
    const y3 = 3.72, h3 = BOT - y3;
    V.card(s, { x: L, y: y3, w: 5.3, h: h3 });
    T(s, '盒子里的东西可以换', { x: L + 0.2, y: y3 + 0.1, w: 3.0, h: 0.3, size: 14, bold: true, valign: 'middle' });
    const by = y3 + 0.55;
    const box = (x, val) => {
      V.card(s, { x, y: by, w: 0.95, h: 0.6, fill: P.white, line: P.ink, lineW: 1, radius: 0.06 });
      V.text(s, val, { x, y: by, w: 0.95, h: 0.6, size: 20, bold: true, align: 'center', valign: 'middle', mono: true });
      V.pill(s, { x: x + 0.1, y: by - 0.12, text: 'count', mono: true, size: 9.5, h: 0.24, fill: P.turq });
    };
    box(L + 0.3, '0');
    snippet(s, { x: L + 1.5, y: by - 0.08, w: 2.3, h: 0.32, size: 10.5, code: 'count = count + 1;' });
    V.arrow(s, L + 1.5, by + 0.34, L + 3.8, by + 0.34, { color: P.ink });
    T(s, '执行一次：0 变成 1', { x: L + 1.5, y: by + 0.38, w: 2.3, h: 0.24, size: 10, color: P.muted, align: 'center', valign: 'middle', oneLine: true });
    box(L + 4.0, '1');
    tipBox(s, { x: 6.05, y: y3, w: 3.5, h: h3, kind: 'warn', title: '先声明，再使用', text: '没写 int count; 就直接用 count，编译时会报错。' }, I.warn_w);
  }

  // ------------------------------------------------------------ data types
  s = slide({
    title: '数据类型：盒子能装什么',
    desc: '盒子的类型决定能放什么：整数用 int，小数用 float，文字用 String。',
    notes: '套件实验里最常用的是 int 和 float，其次是 String、char、byte。提醒：int 最大只到 32767，超过就要用 long；有小数就用 float。millis() 的结果很大，要用 unsigned long 来装。',
  });
  V.table(s, [
    ['类型', '存什么', '范围 / 说明', '写法示例', '生活里的例子'],
    ['int', '整数', '-32768 ～ 32767', 'int value = 0;', '人数、楼层、传感器读数'],
    ['long', '大整数', '约 ±21 亿', 'long t = 100000;', '很大的计数，比如毫秒数'],
    ['float', '小数', '约 6～7 位有效数字', 'float voltage = 0.0;', '体温 36.5、电压 3.3'],
    ['char', '一个字符', "'A'、'9'", 'char inByte = 0;', '键盘上的一个键，比如 Y'],
    ['String', '一串文字', '可以拼接、比较', 'String temp = "";', '一句话、一个名字'],
    ['bool', '真 / 假', 'true、false', 'bool on = true;', '灯开着吗？是 / 否'],
    ['byte', '0～255 的整数', '占 1 个字节', 'byte count = 0;', '亮度值、小计数'],
  ], { x: L, y: TOP, w: CW, colW: [0.9, 1.6, 1.9, 2.3, 2.4], monoCols: [0, 3], boldCols: [0], rowH: 0.35, size: 12 });
  V.card(s, { x: L, y: 4.45, w: CW, h: 0.55, fill: P.turqPale });
  V.iconCircle(s, I.bulb, { x: L + 0.14, y: 4.555, d: 0.34 });
  T(s, [b('选盒子口诀：'), r('整数用 int，小数用 float，文字用 String，真假用 bool；数太大就换 long。')], { x: L + 0.62, y: 4.45, w: CW - 0.76, h: 0.55, size: 13, valign: 'middle', oneLine: true });

  // ------------------------------------------------------------ constants & arrays
  s = slide({
    title: '常量与数组',
    desc: '常量：起了名字、不会再变的数；数组：一个名字管一排编了号的盒子。',
    notes: '常量：起了名字就不再改。const 有类型、更安全；#define 是编译前的“查找替换”，末尾不加分号、不写等号（实验 2.3、2.17）。数组：一排编号的储物柜，编号从 0 开始，8 个柜子的编号是 0～7；配合 for 循环，几行代码就能控制 8 盏灯（实验 2.2）。',
  });
  {
    const cw = (CW - 0.3) / 2, x1 = L, x2 = L + cw + 0.3, iw = cw - 0.4;
    V.card(s, { x: x1, y: TOP, w: cw, h: BOT - TOP });
    iconTitle(s, I.lock, '常量：不会变的数', { x: x1 + 0.2, y: TOP + 0.18, w: iw });
    T(s, '像门牌号：起好名字、定下来，运行时不再改。', { x: x1 + 0.2, y: TOP + 0.72, w: iw, h: 0.3, size: 12, color: P.muted, oneLine: true });
    snippet(s, { x: x1 + 0.2, y: TOP + 1.12, w: iw, h: 0.34, code: 'const int TrigPin = 2;' });
    T(s, [b('const'), r('：有类型的常量，程序运行时不能再改')], { x: x1 + 0.2, y: TOP + 1.52, w: iw, h: 0.3, size: 12, oneLine: true });
    snippet(s, { x: x1 + 0.2, y: TOP + 1.94, w: iw, h: 0.34, code: '#define RGB_RED 11' });
    T(s, [b('#define'), r('：编译前把名字直接替换成数字；\n末尾不加分号，也不写等号')], { x: x1 + 0.2, y: TOP + 2.34, w: iw, h: 0.5, size: 12 });
    mark(s, true, x1 + 0.2, TOP + 3.12, 0.26);
    T(s, '好处：名字比数字好懂；改接线只改一行', { x: x1 + 0.56, y: TOP + 3.08, w: iw - 0.36, h: 0.34, size: 12, bold: true, valign: 'middle', oneLine: true });

    V.card(s, { x: x2, y: TOP, w: cw, h: BOT - TOP });
    iconTitle(s, I.archive, '数组：一排编了号的储物柜', { x: x2 + 0.2, y: TOP + 0.18, w: iw });
    snippet(s, { x: x2 + 0.2, y: TOP + 0.76, w: iw, h: 0.34, code: 'int led_array[8] = {2,3,4,5,6,7,8,9};' });
    const bw = 0.44, gap = (iw - 8 * bw) / 7;
    for (let i = 0; i < 8; i++) {
      const bx = x2 + 0.2 + i * (bw + gap), by = TOP + 1.3;
      const hi = i === 0 || i === 7;
      V.card(s, { x: bx, y: by, w: bw, h: 0.5, fill: hi ? P.turq : P.white, line: hi ? P.turq : P.gray2, radius: 0.05 });
      V.text(s, String(i + 2), { x: bx, y: by, w: bw, h: 0.5, size: 15, bold: true, align: 'center', valign: 'middle' });
      V.text(s, `[${i}]`, { x: bx - 0.05, y: by + 0.54, w: bw + 0.1, h: 0.22, size: 10, mono: true, color: hi ? P.ink : P.muted, bold: hi, align: 'center', valign: 'middle' });
    }
    T(s, [br(r('编号（下标）从 0 开始：')), m('led_array[0]'), r(' 是 2，'), m('led_array[7]'), r(' 是 9。')], { x: x2 + 0.2, y: TOP + 2.2, w: iw, h: 0.5, size: 12 });
    mark(s, false, x2 + 0.2, TOP + 2.82, 0.26);
    T(s, [r('没有 '), m('led_array[8]'), r('：编号最大只到 7')], { x: x2 + 0.56, y: TOP + 2.78, w: iw - 0.36, h: 0.34, size: 12, valign: 'middle', oneLine: true });
    mark(s, true, x2 + 0.2, TOP + 3.22, 0.26);
    T(s, '配合 for 循环，几行代码就能控制 8 盏灯', { x: x2 + 0.56, y: TOP + 3.18, w: iw - 0.36, h: 0.34, size: 12, valign: 'middle', oneLine: true });
  }

  // ------------------------------------------------------------ operators
  s = slide({
    title: '运算符：算一算、比一比',
    desc: '四类运算符：算术、赋值、比较、逻辑。比较和逻辑的结果只有“真”或“假”。',
    notes: '四类运算符里，赋值和比较最容易混。x += 2 和 i++ 是“简写”，在循环里非常常见。逻辑运算可以用生活里的话来说：&& 是“并且”，|| 是“或者”，! 是“不是”——比如“带了钥匙 && 带了手机”才出门。',
  });
  {
    const cw = (CW - 0.3) / 2, chh = (BOT - TOP - 0.3) / 2;
    const groups = [
      ['calc', '算术', '+  -  *  /  %', [['7 + 2', '→ 9，加减乘除'], ['7 / 2', '→ 3，整数相除舍去小数'], ['7 % 2', '→ 1，取余数']]],
      ['box', '赋值', '=  +=  -=  ++  --', [['x = 5;', '把 5 放进 x'], ['x += 2;', '等于 x = x + 2;'], ['i++;', '等于 i = i + 1;']]],
      ['balance', '比较', '==  !=  >  <  >=  <=', [['value == LOW', '判断是否相等'], ['a != b', '判断是否不相等'], ['a >= b', '判断是否大于或等于']]],
      ['branch', '逻辑', '&&  ||  !', [['a && b', '两个都成立（并且）'], ['a || b', '至少一个成立（或者）'], ['!a', '取反（不是）']]],
    ];
    groups.forEach(([ic, t, sym, rows], i) => {
      const x = L + (i % 2) * (cw + 0.3), y = TOP + Math.floor(i / 2) * (chh + 0.3);
      V.card(s, { x, y, w: cw, h: chh });
      V.iconCircle(s, I[ic], { x: x + 0.18, y: y + 0.15, d: 0.38 });
      T(s, t, { x: x + 0.66, y: y + 0.13, w: 0.7, h: 0.42, size: 15, bold: true, valign: 'middle' });
      T(s, [m(sym, { bold: true })], { x: x + 1.35, y: y + 0.13, w: cw - 1.53, h: 0.42, size: 15, align: 'right', valign: 'middle', oneLine: true });
      rows.forEach(([c, d], j) => {
        const ry = y + 0.68 + j * 0.31;
        T(s, [m(c, { bold: true })], { x: x + 0.22, y: ry, w: 1.75, h: 0.3, size: 12, valign: 'middle', oneLine: true });
        T(s, d, { x: x + 2.0, y: ry, w: cw - 2.18, h: 0.3, size: 12, valign: 'middle', oneLine: true });
      });
    });
  }

  // ------------------------------------------------------------ two traps
  s = slide({
    title: '运算符的两个大坑',
    desc: '整数相除会把小数直接扔掉；判断“相等”要写两个等号。',
    notes: '第一个坑：两个整数相除，结果还是整数，小数直接扔掉，所以 7 / 2 = 3。电压换算时如果写 value / 1023，读数小于 1023 时结果总是 0，要写成 value / 1023.0 或先转成 float。第二个坑：if 里写一个等号是“赋值”，不是比较，编译器不一定报错，但结果会出错。',
  });
  {
    const cw = (CW - 0.3) / 2, h = BOT - TOP;
    const trap = (x, title, bad, badNote, good, goodNote, tipText, size) => {
      V.card(s, { x, y: TOP, w: cw, h, fill: P.white, line: P.red, lineW: 1 });
      iconTitle(s, I.warn_w, title, { x: x + 0.2, y: TOP + 0.18, w: cw - 0.4, fill: P.red, size: 15 });
      mark(s, false, x + 0.2, TOP + 0.86, 0.3);
      T(s, [m(bad, { bold: true })], { x: x + 0.62, y: TOP + 0.76, w: cw - 0.8, h: 0.5, size, valign: 'middle', oneLine: true });
      T(s, badNote, { x: x + 0.62, y: TOP + 1.26, w: cw - 0.8, h: 0.3, size: 12, color: P.red, oneLine: true });
      mark(s, true, x + 0.2, TOP + 1.82, 0.3);
      T(s, [m(good, { bold: true })], { x: x + 0.62, y: TOP + 1.72, w: cw - 0.8, h: 0.5, size, valign: 'middle', oneLine: true });
      T(s, goodNote, { x: x + 0.62, y: TOP + 2.22, w: cw - 0.8, h: 0.3, size: 12, oneLine: true });
      tipBox(s, { x: x + 0.15, y: TOP + 2.7, w: cw - 0.3, h: 0.8, kind: 'note', text: tipText }, I.bulb);
    };
    trap(L, '坑 1：整数相除，小数没了', '7 / 2 = 3', '整数 ÷ 整数，小数部分被直接扔掉', '7.0 / 2 = 3.5', '只要有一个是小数，结果就保留小数',
      '像分苹果：7 个分给 2 人，每人 3 个，\n剩下的 1 个就是余数：7 % 2 = 1。', 24);
    trap(L + cw + 0.3, '坑 2：= 和 == 不是一回事', 'if (value = LOW)', '一个等号是“放进去”，不是比较', 'if (value == LOW)', '两个等号才是“问一问：相等吗？”',
      '记法：= 像把东西放进盒子；\n== 像拿两样东西比一比，看是不是一样。', 20);
  }

  // ============================================================ SECTION 3
  deck.section('和硬件对话');
  divider({
    kicker: '第 3 站', title: '和硬件对话',
    desc: 'Arduino 用引脚“听”传感器、指挥 LED，\n还能通过串口和电脑聊天。\n这一站认识数字 / 模拟输入输出、\n时间函数和串口。',
    tiles: [
      { fill: P.turq, big: '01', title: '数字信号', sub: '电灯开关：HIGH / LOW', subSize: 12 },
      { fill: P.gray1, big: '02', title: '模拟信号', sub: '调光旋钮：可以停在中间', subSize: 12 },
      { fill: P.ink, big: '03', title: '时间', sub: 'delay() / millis()', subSize: 12 },
      { fill: P.white, big: '04', title: '串口', sub: 'Serial：和电脑聊天', subSize: 12 },
    ],
    notes: '第 3 站开始和硬件打交道：引脚怎么输出、怎么读取，程序怎么等待，Arduino 怎么把数据发给电脑。这一站学完，就能做点灯、读按键、读旋钮这些最基础的实验。',
  });

  // ------------------------------------------------------------ digital vs analog
  s = slide({
    title: '数字信号 vs 模拟信号',
    desc: '数字信号像电灯开关，只有开和关；模拟信号像调光旋钮，可以停在中间任何位置。',
    notes: '数字信号像电灯开关：只有开（HIGH，约 5V）和关（LOW，0V）。模拟信号像调光旋钮：可以停在中间任意位置。UNO 上 0～13 是数字引脚，其中带 ~ 的 6 个能输出 PWM；A0～A5 用来读模拟电压。0、1 号脚还兼做串口通信，初学时尽量不要占用。',
  });
  {
    const cw = (CW - 0.3) / 2, ch = 1.9, iw = cw - 0.4;
    const x1 = L, x2 = L + cw + 0.3;
    V.card(s, { x: x1, y: TOP, w: cw, h: ch });
    iconTitle(s, I.toggle, '数字信号＝电灯开关', { x: x1 + 0.2, y: TOP + 0.18, w: iw });
    const pw = (iw - 0.2) / 2;
    V.pill(s, { x: x1 + 0.2, y: TOP + 0.74, w: pw, h: 0.4, text: 'HIGH ≈ 5V　开', size: 13, fill: P.turq });
    V.pill(s, { x: x1 + 0.4 + pw, y: TOP + 0.74, w: pw, h: 0.4, text: 'LOW = 0V　关', size: 13, fill: P.ink, color: P.white });
    T(s, '只有两种状态，没有中间值。\n例子：按键按没按、LED 亮不亮。', { x: x1 + 0.2, y: TOP + 1.3, w: iw, h: 0.5, size: 12 });

    V.card(s, { x: x2, y: TOP, w: cw, h: ch });
    iconTitle(s, I.sliders, '模拟信号＝调光旋钮', { x: x2 + 0.2, y: TOP + 0.18, w: iw });
    gradBar(s, x2 + 0.2, TOP + 0.76, iw, 0.26);
    T(s, '0V', { x: x2 + 0.2, y: TOP + 1.04, w: 0.6, h: 0.22, size: 10, color: P.muted });
    T(s, '2.5V', { x: x2 + 0.2 + iw / 2 - 0.4, y: TOP + 1.04, w: 0.8, h: 0.22, size: 10, color: P.muted, align: 'center' });
    T(s, '5V', { x: x2 + 0.2 + iw - 0.6, y: TOP + 1.04, w: 0.6, h: 0.22, size: 10, color: P.muted, align: 'right' });
    T(s, '连续变化，可以停在中间任何位置。\n例子：旋钮转到一半、光线有多亮。', { x: x2 + 0.2, y: TOP + 1.3, w: iw, h: 0.5, size: 12 });

    const sy = TOP + ch + 0.3, sh = BOT - sy;
    V.card(s, { x: L, y: sy, w: CW, h: sh });
    T(s, 'Arduino UNO 板子上的引脚', { x: L + 0.2, y: sy + 0.1, w: 4, h: 0.28, size: 12, bold: true, valign: 'middle' });
    const sq = 0.42, sg = 0.07, sx = L + 1.55;
    T(s, '数字 0～13', { x: L + 0.2, y: sy + 0.46, w: 1.3, h: sq, size: 12, bold: true, valign: 'middle' });
    const pwm = new Set([3, 5, 6, 9, 10, 11]);
    for (let i = 0; i < 14; i++) {
      const x = sx + i * (sq + sg), on = pwm.has(i);
      V.card(s, { x, y: sy + 0.46, w: sq, h: sq, fill: on ? P.turq : P.white, line: on ? P.turq : P.gray2, radius: 0.05 });
      V.text(s, (on ? '~' : '') + i, { x, y: sy + 0.46, w: sq, h: sq, size: on ? 11 : 11, bold: on, mono: true, align: 'center', valign: 'middle' });
    }
    T(s, '模拟 A0～A5', { x: L + 0.2, y: sy + 0.94, w: 1.3, h: sq, size: 12, bold: true, valign: 'middle' });
    for (let i = 0; i < 6; i++) {
      const x = sx + i * (sq + sg);
      V.card(s, { x, y: sy + 0.94, w: sq, h: sq, fill: P.ink, radius: 0.05 });
      V.text(s, 'A' + i, { x, y: sy + 0.94, w: sq, h: sq, size: 10.5, bold: true, mono: true, color: P.white, align: 'center', valign: 'middle' });
    }
    const lx = sx + 6 * (sq + sg) + 0.25;
    V.card(s, { x: lx, y: sy + 1.05, w: 0.2, h: 0.2, fill: P.turq, radius: 0.03 });
    T(s, [r('带 '), b('~'), r(' 的引脚能输出 PWM（模拟输出）')], { x: lx + 0.3, y: sy + 0.94, w: L + CW - 0.15 - lx - 0.3, h: sq, size: 12, valign: 'middle', oneLine: true });
  }

  // ------------------------------------------------------------ digital I/O
  s = slide({
    title: '数字输入输出',
    desc: '先用 pinMode 说清楚“进”还是“出”，再用 digitalWrite 输出、digitalRead 读取。',
    notes: '三个函数记一个顺序：先 pinMode 说明方向，再 digitalWrite 输出或 digitalRead 读取。右边解释“按下 = LOW”：平时电阻把引脚拉到 5V，就像弹簧把门拉住；按下按键，引脚直接接地变成 LOW。如果写 pinMode(pin, INPUT_PULLUP)，就是借用芯片里自带的上拉电阻，按键直接接在引脚和 GND 之间即可。',
  });
  {
    const lw = 5.3;
    const rows = [
      ['pinMode(引脚, 模式);', 'pinMode(13, OUTPUT);', '设置引脚是输入还是输出。模式：OUTPUT 输出、INPUT 输入、\nINPUT_PULLUP 带上拉电阻的输入。'],
      ['digitalWrite(引脚, 电平);', 'digitalWrite(13, HIGH);', '让输出引脚输出 HIGH 或 LOW，例如开关 LED、有源蜂鸣器。'],
      ['digitalRead(引脚)', 'int v = digitalRead(7);', '读取输入引脚的电平，结果是 HIGH(1) 或 LOW(0)，\n例如读按键、触摸、倾斜开关。'],
    ];
    rows.forEach(([sig, ex, d], i) => {
      const y = TOP + i * 1.3;
      V.card(s, { x: L, y, w: lw, h: 1.0 });
      T(s, [m(sig, { bold: true })], { x: L + 0.18, y: y + 0.08, w: 2.75, h: 0.34, size: 12.5, valign: 'middle', oneLine: true });
      snippet(s, { x: L + lw - 0.18 - 2.15, y: y + 0.08, w: 2.15, h: 0.34, size: 10, pad: 0.1, code: ex });
      T(s, d, { x: L + 0.18, y: y + 0.47, w: lw - 0.36, h: 0.46, size: 12 });
    });
    const x0 = 6.05, w0 = 9.55 - x0, y0 = TOP;
    V.card(s, { x: x0, y: y0, w: w0, h: BOT - y0 });
    iconTitle(s, I.question, '为什么“按下 = LOW”？', { x: x0 + 0.18, y: y0 + 0.16, w: w0 - 0.36, d: 0.38, size: 14 });
    const wy = y0 + 0.98;
    T(s, '5V', { x: x0 + 0.16, y: wy - 0.15, w: 0.4, h: 0.3, size: 12, bold: true, valign: 'middle' });
    line(s, x0 + 0.52, wy, x0 + 0.75, wy, { color: P.ink });
    s.addShape('rect', { x: x0 + 0.75, y: wy - 0.1, w: 0.55, h: 0.2, fill: { color: P.white }, line: { color: P.ink, width: 1.25 } });
    T(s, '电阻', { x: x0 + 0.7, y: wy + 0.13, w: 0.65, h: 0.22, size: 10, color: P.muted, align: 'center' });
    line(s, x0 + 1.3, wy, x0 + 2.25, wy, { color: P.ink });
    s.addShape('ellipse', { x: x0 + 1.76, y: wy - 0.045, w: 0.09, h: 0.09, fill: { color: P.ink }, line: { color: P.ink, width: 0 } });
    // push button: two contacts + open lever
    s.addShape('ellipse', { x: x0 + 2.22, y: wy - 0.04, w: 0.08, h: 0.08, fill: { color: P.white }, line: { color: P.ink, width: 1 } });
    s.addShape('ellipse', { x: x0 + 2.62, y: wy - 0.04, w: 0.08, h: 0.08, fill: { color: P.white }, line: { color: P.ink, width: 1 } });
    line(s, x0 + 2.29, wy - 0.02, x0 + 2.64, wy - 0.2, { color: P.ink });
    T(s, '按键', { x: x0 + 2.14, y: wy + 0.13, w: 0.65, h: 0.22, size: 10, color: P.muted, align: 'center' });
    line(s, x0 + 2.7, wy, x0 + 2.86, wy, { color: P.ink });
    T(s, 'GND', { x: x0 + 2.88, y: wy - 0.15, w: 0.5, h: 0.3, size: 12, bold: true, valign: 'middle' });
    line(s, x0 + 1.805, wy, x0 + 1.805, wy + 0.42, { color: P.ink });
    V.pill(s, { x: x0 + 1.805 - 0.62, y: wy + 0.42, w: 1.24, h: 0.26, text: 'Arduino 引脚', size: 10, fill: P.ink, color: P.white });
    const st = [['没按', '引脚被电阻拉到 5V', 'HIGH', P.turq, P.ink], ['按下', '引脚经按键接到 GND', 'LOW', P.ink, P.white]];
    st.forEach(([a, t, v, f, c], i) => {
      const y = y0 + 1.9 + i * 0.42;
      V.pill(s, { x: x0 + 0.18, y, w: 0.56, h: 0.3, text: a, size: 11, fill: P.gray2 });
      T(s, t, { x: x0 + 0.84, y, w: 1.95, h: 0.3, size: 12, valign: 'middle', oneLine: true });
      V.pill(s, { x: x0 + w0 - 0.18 - 0.62, y, w: 0.62, h: 0.3, text: v, size: 11, fill: f, color: c, mono: true });
    });
    snippet(s, { x: x0 + 0.18, y: y0 + 2.85, w: w0 - 0.36, h: 0.34, size: 10, code: 'if (digitalRead(pin) == LOW)' });
    T(s, '代码里这样写，意思是“被按下了”', { x: x0 + 0.18, y: y0 + 3.24, w: w0 - 0.36, h: 0.3, size: 12, oneLine: true });
  }

  // ------------------------------------------------------------ analog I/O
  s = slide({
    title: '模拟输入输出',
    desc: '读：把 0～5V 变成 0～1023；写：用 PWM 输出 0～255 的“中间亮度”。',
    notes: 'analogRead 把 0～5V 换成 0～1023 的数，换算回电压要除以 1023 再乘 5（实验 2.4、2.5、2.10、2.17、2.20）。analogWrite 并不是真的输出 2.5V，而是用 PWM 快速开关：开的时间占一半，看起来就是半亮。提醒只有带 ~ 的 3、5、6、9、10、11 号引脚能用 analogWrite（实验 2.3、2.5、2.20）。',
  });
  {
    const cw = (CW - 0.3) / 2, iw = cw - 0.4, x1 = L, x2 = L + cw + 0.3, h = BOT - TOP;
    V.card(s, { x: x1, y: TOP, w: cw, h });
    T(s, [m('analogRead(引脚)', { bold: true })], { x: x1 + 0.2, y: TOP + 0.16, w: 2.6, h: 0.36, size: 14, valign: 'middle', oneLine: true });
    V.pill(s, { x: x1 + cw - 0.2 - 1.15, y: TOP + 0.18, w: 1.15, h: 0.32, text: '0 ～ 1023', size: 12, fill: P.turq });
    T(s, '读取 A0～A5 上的电压：0V → 0，5V → 1023。', { x: x1 + 0.2, y: TOP + 0.64, w: iw, h: 0.3, size: 12, oneLine: true });
    const by = TOP + 1.3;
    T(s, '0V', { x: x1 + 0.2, y: by - 0.25, w: 0.6, h: 0.22, size: 10, color: P.muted });
    T(s, '2.5V', { x: x1 + 0.2 + iw / 2 - 0.4, y: by - 0.25, w: 0.8, h: 0.22, size: 10, color: P.muted, align: 'center' });
    T(s, '5V', { x: x1 + 0.2 + iw - 0.6, y: by - 0.25, w: 0.6, h: 0.22, size: 10, color: P.muted, align: 'right' });
    gradBar(s, x1 + 0.2, by, iw, 0.26);
    T(s, [m('0', { bold: true })], { x: x1 + 0.2, y: by + 0.3, w: 0.6, h: 0.24, size: 11, valign: 'middle' });
    T(s, [m('≈512', { bold: true })], { x: x1 + 0.2 + iw / 2 - 0.4, y: by + 0.3, w: 0.8, h: 0.24, size: 11, align: 'center', valign: 'middle' });
    T(s, [m('1023', { bold: true })], { x: x1 + 0.2 + iw - 0.7, y: by + 0.3, w: 0.7, h: 0.24, size: 11, align: 'right', valign: 'middle' });
    T(s, '换算回电压：', { x: x1 + 0.2, y: TOP + 2.08, w: 1.4, h: 0.3, size: 12, bold: true, valign: 'middle' });
    V.formula(s, { x: x1 + 0.3, y: TOP + 2.3, h: 0.7, lhs: '电压 =', num: '读数', den: '1023', rhs: '× 5V', size: 17 });
    snippet(s, { x: x1 + 0.2, y: TOP + 3.12, w: iw, h: 0.34, code: 'int v = analogRead(A0);' });

    V.card(s, { x: x2, y: TOP, w: cw, h });
    T(s, [m('analogWrite(引脚, 值)', { bold: true })], { x: x2 + 0.2, y: TOP + 0.16, w: 2.7, h: 0.36, size: 14, valign: 'middle', oneLine: true });
    V.pill(s, { x: x2 + cw - 0.2 - 1.0, y: TOP + 0.18, w: 1.0, h: 0.32, text: '0 ～ 255', size: 12, fill: P.turq });
    T(s, '用 PWM 输出“中间亮度”：0 全灭，255 全亮。\n只有带 ~ 的 3、5、6、9、10、11 号脚能用。', { x: x2 + 0.2, y: TOP + 0.64, w: iw, h: 0.5, size: 12 });
    const waves = [['analogWrite(9, 0)', 0, '全灭'], ['analogWrite(9, 128)', 0.5, '约一半亮'], ['analogWrite(9, 255)', 1, '全亮']];
    waves.forEach(([c, duty, t], i) => {
      const y = TOP + 1.3 + i * 0.42;
      T(s, [m(c)], { x: x2 + 0.2, y, w: 1.7, h: 0.3, size: 10, valign: 'middle', oneLine: true });
      pwmWave(s, x2 + 1.95, y + 0.04, 1.35, 0.22, duty);
      T(s, t, { x: x2 + 3.42, y, w: cw - 3.6, h: 0.3, size: 12, bold: true, valign: 'middle', oneLine: true });
    });
    T(s, [b('PWM＝快速开关：'), r('一秒开关约 500 次，\n每次“开”得越久，看起来越亮。')], { x: x2 + 0.2, y: TOP + 2.6, w: iw, h: 0.5, size: 12 });
    snippet(s, { x: x2 + 0.2, y: TOP + 3.12, w: iw, h: 0.34, code: 'analogWrite(11, 128);' });
  }

  // ------------------------------------------------------------ time
  s = slide({
    title: '时间：delay() 和 millis()',
    desc: 'Arduino 一秒能执行几十万条语句；要让动作“慢下来”，就得等一等，或者看看表。',
    notes: 'delay 最简单，但等待的时候 Arduino 什么都做不了，按键按了也不知道。delayMicroseconds 用在需要极短时间的场合，比如超声波测距（实验 2.38）。millis 是进阶写法：不停地看表，到点了再做事，中间还能干别的。',
  });
  {
    const cw = (CW - 0.6) / 3, ch = 2.45, iw = cw - 0.36;
    const cards = [
      ['bed', '闭上眼睛等', 'delay(毫秒)', 'delay(1000);  // 等 1 秒', '暂停一段时间。\n1000 毫秒 = 1 秒。\n等的时候什么也做不了。'],
      ['stopwatch', '更短的一眨眼', 'delayMicroseconds(微秒)', 'delayMicroseconds(10);', '更短的等待。\n1 毫秒 = 1000 微秒。\n超声波测距要用到。'],
      ['clock', '抬头看一眼表', 'millis()', 'unsigned long t = millis();', '开机到现在过了多少毫秒。\n不用 delay 也能计时，\n属于进阶写法。'],
    ];
    cards.forEach(([ic, t, fn, ex, d], i) => {
      const x = L + i * (cw + 0.3);
      V.card(s, { x, y: TOP, w: cw, h: ch });
      iconTitle(s, I[ic], t, { x: x + 0.18, y: TOP + 0.18, w: iw, size: 14 });
      T(s, [m(fn, { bold: true })], { x: x + 0.18, y: TOP + 0.72, w: iw, h: 0.3, size: 12, valign: 'middle', oneLine: true });
      snippet(s, { x: x + 0.18, y: TOP + 1.08, w: iw, h: 0.34, size: 10, pad: 0.1, code: ex });
      T(s, d, { x: x + 0.18, y: TOP + 1.52, w: iw, h: 0.85, size: 12 });
    });
    const y2 = TOP + ch + 0.3, h2 = BOT - y2;
    V.card(s, { x: L, y: y2, w: 3.3, h: h2, fill: P.gray1 });
    T(s, [b('1 秒 = 1000 毫秒（ms）', { breakLine: true }), b('1 毫秒 = 1000 微秒（µs）')], { x: L + 0.22, y: y2, w: 2.9, h: h2, size: 13, valign: 'middle', lineSpacingMultiple: 1.35 });
    tipBox(s, { x: L + 3.6, y: y2, w: CW - 3.6, h: h2, kind: 'note', text: 'delay 像闭眼等：这 1 秒里按键按了也不知道。\nmillis 像看表：到点了再做，中间还能干别的事。' }, I.eye);
  }

  // ------------------------------------------------------------ serial
  s = slide({
    title: '串口 Serial：和电脑聊天的窗口',
    desc: '串口是 Arduino 和电脑“聊天”的通道，最常用来打印数值、检查程序是否正常。',
    notes: '串口监视器是调试程序最好用的工具：看不到的数值，打印出来就看得到。强调 print 不换行、println 换行；available 和 read 用于电脑给 Arduino 发消息（实验 2.11）。波特率不一致是串口乱码最常见的原因。',
  });
  {
    const lw = 3.7, x0 = L, y0 = TOP;
    V.card(s, { x: x0, y: y0, w: lw, h: 2.0 });
    V.iconCircle(s, I.chip, { x: x0 + 0.3, y: y0 + 0.3, d: 0.62 });
    V.iconCircle(s, I.laptop, { x: x0 + lw - 0.92, y: y0 + 0.3, d: 0.62 });
    T(s, 'Arduino', { x: x0 + 0.11, y: y0 + 0.98, w: 1.0, h: 0.26, size: 12, bold: true, align: 'center', valign: 'middle' });
    T(s, '电脑', { x: x0 + lw - 1.11, y: y0 + 0.98, w: 1.0, h: 0.26, size: 12, bold: true, align: 'center', valign: 'middle' });
    V.arrow(s, x0 + 1.02, y0 + 0.5, x0 + lw - 1.02, y0 + 0.5, { color: P.ink, width: 1.5 });
    V.arrow(s, x0 + lw - 1.02, y0 + 0.78, x0 + 1.02, y0 + 0.78, { color: P.ink, width: 1.5 });
    T(s, 'print 发消息', { x: x0 + 1.02, y: y0 + 0.24, w: lw - 2.04, h: 0.22, size: 10, color: P.muted, align: 'center', valign: 'middle' });
    T(s, 'read 收消息', { x: x0 + 1.02, y: y0 + 0.82, w: lw - 2.04, h: 0.22, size: 10, color: P.muted, align: 'center', valign: 'middle' });
    T(s, 'USB 线', { x: x0 + 1.02, y: y0 + 1.04, w: lw - 2.04, h: 0.22, size: 10, bold: true, align: 'center', valign: 'middle' });
    T(s, '电脑上打开“串口监视器”，就能看到 Arduino 发来的消息。', { x: x0 + 0.2, y: y0 + 1.38, w: lw - 0.4, h: 0.5, size: 12 });
    tipBox(s, { x: x0, y: y0 + 2.3, w: lw, h: BOT - y0 - 2.3, title: '怎样打开串口监视器', text: 'IDE 右上角的放大镜图标，\n或菜单 工具 → 串口监视器。' }, I.search);

    const tx = L + lw + 0.3, tw = CW - lw - 0.3;
    V.table(s, [
      ['函数', '作用'],
      ['Serial.begin(9600);', '打开串口\n9600 是波特率（通信速度）'],
      ['Serial.print(内容);', '发送文字或数值，不换行'],
      ['Serial.println(内容);', '发送后换行'],
      ['Serial.available()', '电脑发来了几个字符还没读'],
      ['Serial.read()', '读出 1 个字符'],
    ], { x: tx, y: TOP, w: tw, colW: [2.35, tw - 2.35], monoCols: [0], boldCols: [0], rowH: 0.4, size: 12 });
    tipBox(s, { x: tx, y: 4.15, w: tw, h: 0.85, kind: 'warn', text: [b('波特率要一致：', { color: P.red }), r('串口监视器右下角选的波特率，要和 Serial.begin() 里的一样，否则显示乱码。')] }, I.warn_w);
  }

  // ------------------------------------------------------------ 1.9 example code
  s = slide({
    title: '示例：每秒打印一次计数',
    desc: '开机先打个招呼，然后每过 1 秒报一次数——注意 print 和 println 的区别。',
    notes: '这是第一个完整的小程序：setup() 里打开串口、打招呼，loop() 里每秒计数一次。注意 count 声明在最上面，所以 loop() 每一圈都能接着上一次的数继续加。可以让学生先猜一猜串口里会出现什么，再看下一页。',
  });
  blk = code(s, { x: L, y: TOP, w: 5.85, h: 3.65, code: SERIAL_DEMO, file: 'serial_demo.ino', hl: [4, 5, 9, 11, 12] });
  explain(s, blk, { x: 6.6, w: 2.95, items: [
    { line: 4, text: '在 setup() 里打开串口' },
    { line: 5, text: '开机先打印一行 Hello!' },
    { line: 9, text: '每循环一次，count 加 1' },
    { line: 11, text: '打印变量的值（数字）' },
    { line: 12, text: 'println 打完才换行' },
  ] });

  // ------------------------------------------------------------ 1.9 result
  s = slide({
    title: '运行结果：串口监视器里会看到什么',
    desc: 'print 不换行、println 打完才换行，所以三句话拼成了一行“第 1 次循环”。',
    notes: '对照代码看输出：Hello! 只出现一次（在 setup 里），“第 N 次循环”每秒一行（在 loop 里）。三句 print 拼成一行，是因为只有最后一句是 println。动手改一改，让学生体会每一处修改带来的变化。',
  });
  {
    const lines = ['Hello!'];
    for (let i = 1; i <= 10; i++) lines.push(`第 ${i} 次循环`);
    V.serialMonitor(s, { x: L, y: TOP, w: 3.4, h: BOT - TOP, baud: 9600, size: 11, lines });
    const x0 = L + 3.7, w0 = CW - 3.7, h0 = 1.95;
    V.card(s, { x: x0, y: TOP, w: w0, h: h0 });
    T(s, '三句 print，拼成一行', { x: x0 + 0.2, y: TOP + 0.12, w: 3, h: 0.32, size: 14, bold: true, valign: 'middle' });
    const chips = ['Serial.print("第 ");', 'Serial.print(count);', 'Serial.println(" 次循环");'];
    const rx = x0 + 3.3, rw = w0 - 3.5;
    chips.forEach((c, i) => {
      const y = TOP + 0.52 + i * 0.36;
      snippet(s, { x: x0 + 0.2, y, w: 2.65, h: 0.3, size: 10, pad: 0.1, code: c });
      V.arrow(s, x0 + 2.92, y + 0.15, rx - 0.06, TOP + 0.89, { color: P.muted });
    });
    V.card(s, { x: rx, y: TOP + 0.53, w: rw, h: 0.72, fill: P.white, line: P.gray2 });
    T(s, [m('第 1 次循环', { bold: true })], { x: rx + 0.12, y: TOP + 0.57, w: rw - 0.24, h: 0.4, size: 14, valign: 'middle', oneLine: true });
    T(s, '↵ 最后一句换行', { x: rx + 0.12, y: TOP + 0.95, w: rw - 0.24, h: 0.24, size: 10, color: P.turqDeep, bold: true, valign: 'middle' });
    T(s, 'Hello! 只在 setup() 里打印一次，所以只出现一行', { x: x0 + 0.2, y: TOP + 1.62, w: w0 - 0.4, h: 0.24, size: 12, color: P.muted, valign: 'middle', oneLine: true });
    tipBox(s, { x: x0, y: TOP + h0 + 0.3, w: w0, h: BOT - TOP - h0 - 0.3, kind: 'note', title: '动手试一试', text: [
      br(r('① 把 delay(1000) 改成 delay(200)：计数变快了')),
      br(r('② 把第 12 行的 println 改成 print：计数全挤在一行')),
      r('③ 把 9600 改成 115200，监视器不改：出现乱码'),
    ] }, I.wrench);
  }

  // ============================================================ SECTION 4
  deck.section('让程序会做决定');
  divider({
    kicker: '第 4 站', title: '让程序会做决定',
    desc: '到这里，程序还只会从头到尾照做。\n这一站教它“看情况做事”（if / else）\n和“重复做事”（for / while）。\n几乎所有交互作品都离不开这两样。',
    tiles: [
      { fill: P.turq, big: '01', title: 'if / else', sub: '岔路口：成立走这边', subSize: 12 },
      { fill: P.gray1, big: '02', title: '按键点灯', sub: '读按键 + if 判断', subSize: 12 },
      { fill: P.ink, big: '03', title: 'for / while', sub: '数着圈跑步', subSize: 12 },
      { fill: P.white, big: '04', title: '呼吸灯', sub: 'for 循环 + PWM', subSize: 12 },
    ],
    notes: '第 4 站让程序变“聪明”：会根据情况选择（if），会重复做事（for / while）。这两样是所有交互作品的核心——按下就亮、越近越响、依次点亮一排灯，都离不开它们。',
  });

  // ------------------------------------------------------------ if / else
  s = slide({
    title: '条件判断 if / else：程序的岔路口',
    desc: '让程序“看情况做事”：条件成立走这条路，不成立走另一条。',
    notes: 'if 就像岔路口：条件成立走一条路，不成立走另一条。注意条件写在小括号里，要做的事写在大括号里，判断相等一定用两个等号。套件里的例子：实验 2.15 用 if (value == LOW) 判断按键；实验 2.17 用一串 else if 依次判断 6 个按键和 4 个方向；实验 2.32 条件成立时同时打开 RGB 灯和蜂鸣器。',
  });
  {
    const x0 = L, w0 = 4.1, y0 = TOP, cx = x0 + w0 / 2;
    V.card(s, { x: x0, y: y0, w: w0, h: BOT - y0 });
    iconTitle(s, I.branch, '像出门前看一眼天气', { x: x0 + 0.2, y: y0 + 0.16, w: w0 - 0.4, d: 0.38, size: 14 });
    s.addShape('diamond', { x: cx - 1.0, y: y0 + 0.72, w: 2.0, h: 0.86, fill: { color: P.white }, line: { color: P.ink, width: 1.25 } });
    T(s, '下雨了吗？', { x: cx - 0.9, y: y0 + 0.72, w: 1.8, h: 0.86, size: 13, bold: true, align: 'center', valign: 'middle' });
    const bw = 1.5, lx = x0 + 0.3, rxx = x0 + w0 - 0.3 - bw, byy = y0 + 2.05;
    V.arrow(s, cx - 0.55, y0 + 1.37, lx + bw / 2, byy - 0.02, { color: P.ink });
    V.arrow(s, cx + 0.55, y0 + 1.37, rxx + bw / 2, byy - 0.02, { color: P.ink });
    T(s, '是', { x: cx - 1.3, y: y0 + 1.5, w: 0.4, h: 0.26, size: 12, bold: true, color: P.turqDeep, align: 'right' });
    T(s, '否', { x: cx + 0.9, y: y0 + 1.5, w: 0.4, h: 0.26, size: 12, bold: true });
    V.card(s, { x: lx, y: byy, w: bw, h: 0.62, fill: P.turq });
    T(s, [b('带上伞', { breakLine: true }), m('if { … }', { fontSize: 10 })], { x: lx, y: byy, w: bw, h: 0.62, size: 13, align: 'center', valign: 'middle', lineSpacingMultiple: 1.0 });
    V.card(s, { x: rxx, y: byy, w: bw, h: 0.62, fill: P.ink });
    T(s, [b('戴上墨镜', { breakLine: true, color: P.white }), m('else { … }', { fontSize: 10, color: P.turq })], { x: rxx, y: byy, w: bw, h: 0.62, size: 13, align: 'center', valign: 'middle', lineSpacingMultiple: 1.0 });
    const fy = y0 + 3.05;
    V.arrow(s, lx + bw / 2, byy + 0.64, cx - 0.25, fy - 0.02, { color: P.ink });
    V.arrow(s, rxx + bw / 2, byy + 0.64, cx + 0.25, fy - 0.02, { color: P.ink });
    V.card(s, { x: cx - 0.7, y: fy, w: 1.4, h: 0.4, fill: P.white, line: P.gray2 });
    T(s, '继续出门', { x: cx - 0.7, y: fy, w: 1.4, h: 0.4, size: 12, bold: true, align: 'center', valign: 'middle' });

    const x1 = x0 + w0 + 0.3, w1 = CW - w0 - 0.3;
    code(s, { x: x1, y: TOP, w: w1, h: 1.98, code: IF_SYNTAX, file: 'if / else 的写法' });
    dotList(s, [
      [r('条件写在 '), m('( )'), r(' 里，要做的事写在 '), m('{ }'), r(' 里')],
      [r('判断相等用 '), m('==', { bold: true }), r('（两个等号）')],
      [m('else if'), r(' 和 '), m('else'), r(' 都可以省略')],
      [r('条件常用比较运算符：'), m('==  !=  >  <')],
    ], { x: x1, y: 3.63, w: w1, size: 13, gap: 0.1, maxY: BOT });
  }

  // ------------------------------------------------------------ 1.10 example
  s = slide({
    title: '示例：按下按键点亮 L 灯',
    desc: '按键接 2 号脚，按下时读到 LOW——读到 LOW 就开灯，否则关灯。',
    notes: '这个例子把前面学的串起来：数字输入（按键）+ 数字输出（L 灯）+ if/else。按键模块按下时读到 LOW，所以条件写 == LOW。L 灯是板子上自带的、接在 13 号脚的小灯，不用接线就能看到效果。按键模块接线：S 接 2 号脚，V（或 +）接 5V，G（或 -）接 GND。',
  });
  blk = code(s, { x: L, y: TOP, w: 5.5, h: 3.65, code: IF_DEMO, file: 'if_demo.ino', hl: [1, 5, 10, 11, 13] });
  {
    const ex = 6.25, ew = 9.55 - ex;
    const yEnd = explain(s, null, { x: ex, w: ew, items: [
      { line: 1, text: '按键接 2 号脚，按下读到 LOW' },
      { line: 5, text: '按键是输入：INPUT' },
      { line: 10, text: '读到 LOW＝按下了' },
      { line: 11, text: '条件成立：开灯' },
      { line: 13, text: '否则（松开）：关灯' },
    ] });
    const ty = Math.max(yEnd + 0.16, 3.75);
    tipBox(s, { x: ex, y: ty, w: ew, h: BOT - ty, kind: 'note', title: '动手试一试', text: '把第 10 行的 LOW 改成 HIGH：灯的亮灭反过来了吗？' }, I.wrench);
  }

  // ------------------------------------------------------------ for / while
  s = slide({
    title: '循环 for / while：重复的事交给它',
    desc: 'for 像数着圈跑步：跑够圈数就停；while 像“只要……就一直……”。',
    notes: 'for 的小括号里有三段：从几开始、什么时候继续、每圈怎么变，用分号隔开。“数着圈跑步”：i 是圈数，跑一圈加 1，i < 8 不成立就停下，所以一共 8 圈。while 只有条件，适合“不知道要重复几次”的情况；注意条件要有机会变成假，否则就停不下来。实验 2.2 用 for 依次点亮 8 盏灯，实验 2.3 用 i 从 0 数到 255 让颜色由暗变亮；实验 2.11 用 while 把串口里的字符全部读完。',
  });
  {
    const barH = 0.62, size = 17;
    V.card(s, { x: L, y: TOP, w: CW, h: barH, fill: P.ink, radius: 0.08 });
    const segs = ['for (', 'int i = 0', '; ', 'i < 8', '; ', 'i++', ') {  /* 要重复的事 */  }'];
    const hiIdx = { 1: 1, 3: 2, 5: 3 };
    let x = L + 0.3;
    const centers = {};
    segs.forEach((sg, i) => {
      const last = i === segs.length - 1;
      const w = last ? L + CW - 0.1 - x : V.monoW(sg, size) * 1.004;
      if (last && V.monoW(sg, size) + 0.3 > w) warn('for bar: last segment too wide');
      const hi = hiIdx[i];
      if (hi) {
        s.addShape('roundRect', { x: x - 0.02, y: TOP + 0.09, w: w + 0.16, h: barH - 0.18, rectRadius: 0.05, fill: { color: '3E5250' }, line: { color: P.turq, width: 1 } });
        centers[hi] = x - 0.02 + (w + 0.16) / 2;
        x += 0.06;
      }
      V.text(s, codeRuns(sg), { x, y: TOP, w: w + 0.05, h: barH, size, mono: true, valign: 'middle', color: CODE_COL.base });
      x += w + (hi ? 0.1 : 0);
    });
    if (x > L + CW - 0.1) warn('for bar too wide');
    Object.entries(centers).forEach(([n, c]) => V.numCircle(s, n, { x: c - 0.15, y: TOP + barH + 0.06, d: 0.3, size: 11 }));
    const cw = (CW - 0.6) / 3, cy = 2.45, chh = 0.85;
    const cards = [['int i = 0', '开始：i 从 0 开始数'], ['i < 8', '条件：成立就继续跑'], ['i++', '每跑完一圈，i 加 1']];
    cards.forEach(([c, d], i) => {
      const cx = L + i * (cw + 0.3);
      V.card(s, { x: cx, y: cy, w: cw, h: chh });
      V.numCircle(s, i + 1, { x: cx + 0.16, y: cy + 0.13, d: 0.32, size: 11 });
      T(s, [m(c, { bold: true })], { x: cx + 0.6, y: cy + 0.11, w: cw - 0.76, h: 0.36, size: 14, valign: 'middle', oneLine: true });
      T(s, d, { x: cx + 0.16, y: cy + 0.5, w: cw - 0.32, h: 0.3, size: 12, oneLine: true });
    });
    const y3 = cy + chh + 0.3, h3 = BOT - y3, w3 = (CW - 0.3) / 2;
    V.card(s, { x: L, y: y3, w: w3, h: h3 });
    T(s, [b('一共跑 8 圈：'), r('i = 0、1、2……7')], { x: L + 0.2, y: y3 + 0.12, w: w3 - 0.4, h: 0.3, size: 13, valign: 'middle', oneLine: true });
    const d = 0.34, g = (w3 - 0.4 - 9 * d) / 8;
    for (let i = 0; i <= 8; i++) {
      const xx = L + 0.2 + i * (d + g), stop = i === 8;
      s.addShape('ellipse', { x: xx, y: y3 + 0.52, w: d, h: d, fill: { color: stop ? P.white : P.turq }, line: { color: stop ? P.red : P.turq, width: stop ? 1.25 : 0 } });
      V.text(s, String(i), { x: xx, y: y3 + 0.52, w: d, h: d, size: 12, bold: true, color: stop ? P.red : P.ink, align: 'center', valign: 'middle' });
    }
    T(s, [r('i 变成 8 时，'), m('i < 8'), r(' 不成立 → 停下')], { x: L + 0.2, y: y3 + 0.94, w: w3 - 0.4, h: 0.28, size: 12, color: P.muted, valign: 'middle', oneLine: true });
    const x4 = L + w3 + 0.3;
    V.card(s, { x: x4, y: y3, w: w3, h: h3 });
    T(s, [m('while', { bold: true }), b('：只要条件成立，就一直重复')], { x: x4 + 0.2, y: y3 + 0.12, w: w3 - 0.4, h: 0.3, size: 13, valign: 'middle', oneLine: true });
    snippet(s, { x: x4 + 0.2, y: y3 + 0.5, w: 2.85, h: 0.66, size: 9.5, pad: 0.12, code: 'while (Serial.available() > 0) {\n  inByte = Serial.read();\n}' });
    T(s, '把串口里的\n字符全部读完', { x: x4 + 3.17, y: y3 + 0.5, w: w3 - 3.35, h: 0.66, size: 12, valign: 'middle' });
  }

  // ------------------------------------------------------------ 1.11 breathing LED
  s = slide({
    title: '示例：LED 呼吸灯',
    desc: '两个 for 循环：亮度从 0 慢慢加到 255，再从 255 慢慢减回 0，像在呼吸。',
    notes: '两个 for 循环一前一后：前一个 i 从 0 加到 255，亮度慢慢增加；后一个从 255 减到 0，亮度慢慢减小。256 级 × 10 毫秒约 2.6 秒，所以一呼一吸大约 5 秒。9 号脚必须是带 ~ 的 PWM 引脚，换成 8 号就不会有渐变效果。接线：LED 长脚串一个 220Ω 电阻接 9 号脚，短脚接 GND。',
  });
  blk = code(s, { x: L, y: TOP, w: 4.9, h: 3.65, code: FOR_DEMO, file: 'for_demo.ino', hl: [2, 6, 7, 8, 10] });
  {
    const ex = 5.65, ew = 9.55 - ex;
    const yEnd = explain(s, null, { x: ex, w: ew, items: [
      { line: 2, text: '9 号脚带 ~，可以用 analogWrite' },
      { line: 6, text: 'i 从 0 增加到 255' },
      { line: 7, text: '亮度逐级增加' },
      { line: 8, text: '每级停 10 毫秒：256 级约 2.6 秒' },
      { line: 10, text: 'i-- 每次减 1：亮度逐级减小' },
    ] });
    const ty = Math.max(yEnd + 0.16, 3.85);
    tipBox(s, { x: ex, y: ty, w: ew, h: BOT - ty, kind: 'note', title: '动手试一试', text: '把两处 delay(10) 改成 delay(3)，\n呼吸会变快吗？' }, I.wrench);
  }

  // ============================================================ SECTION 5
  deck.section('把代码打包');
  divider({
    kicker: '第 5 站', title: '把代码打包',
    desc: '代码越写越长时，就要学会“打包”：\n把常用动作写成自己的函数，\n用 map() 做换算，\n再直接用别人写好的“库”。',
    tiles: [
      { fill: P.turq, big: '01', title: '自定义函数', sub: '菜谱：写一次，随时用', subSize: 12 },
      { fill: P.gray1, big: '02', title: 'blink 函数', sub: '参数不同，闪法不同', subSize: 12 },
      { fill: P.ink, big: '03', title: 'map()', sub: '换算尺：按比例换算', subSize: 12 },
      { fill: P.white, big: '04', title: '库 #include', sub: '给 Arduino 装扩展包', subSize: 12 },
    ],
    notes: '第 5 站讲“打包”：把常用的一段代码起个名字（函数），用现成的换算工具（map），以及直接用别人写好的代码（库）。代码越写越长时，打包能让它更短、更好读。',
  });

  // ------------------------------------------------------------ functions
  s = slide({
    title: '自定义函数：把常用动作打包',
    desc: '把一段常用的代码打包、起个名字，以后一句话就能调用——就像一份菜谱。',
    notes: '函数就像菜谱：写一次步骤，以后喊名字就能做；参数就是每次可以不一样的配料。读函数的第一行要看三样东西：返回类型、函数名、参数。需要函数交回结果时，把 void 换成 int 等类型，并用 return 把结果交回去，比如 add(2, 3) 的结果是 5。',
  });
  {
    const lw = 3.5;
    V.card(s, { x: L, y: TOP, w: lw, h: 1.55 });
    iconTitle(s, I.book, '函数＝一份菜谱', { x: L + 0.18, y: TOP + 0.16, w: lw - 0.36 });
    T(s, '把做法写一次、起个名字，\n以后喊一声名字就照着做。\n参数就像“放几个鸡蛋”，每次可以不同。', { x: L + 0.18, y: TOP + 0.66, w: lw - 0.36, h: 0.8, size: 12 });
    V.card(s, { x: L, y: 3.2, w: lw, h: BOT - 3.2 });
    dotList(s, [
      '好处：代码更短、更好读，\n改一处就改了所有地方',
      [r('函数可以写在 '), m('setup()'), r(' / '), br(m('loop()')), r('的前面，也可以写在后面')],
      [r('没有参数时写 '), m('( )'), r(' 或 '), m('(void)'), br(r('，')), r('例如 '), m('void led_flash(void)')],
    ], { x: L + 0.16, y: 3.32, w: lw - 0.3, size: 12, gap: 0.1, maxY: BOT - 0.08 });

    const x1 = L + lw + 0.3, w1 = CW - lw - 0.3;
    const cb = code(s, { x: x1, y: TOP, w: w1, h: 1.55, code: SET_COLOR, right: '定义一个函数', hl: [1] });
    [[0, 1], [5, 2], [13, 3]].forEach(([ci, n]) => V.numCircle(s, n, { x: cb.x0 + ci * cb.charW, y: TOP + 0.06, d: 0.22, size: 9 }));
    const lg = [['void', '不交回结果'], ['setColor', '函数的名字'], ['(int red, …)', '传进来的值（参数）']];
    const lgw = w1 / 3;
    lg.forEach(([tok, d], i) => {
      const x = x1 + i * lgw;
      V.numCircle(s, i + 1, { x, y: 3.2, d: 0.26, size: 10 });
      T(s, [m(tok, { bold: true })], { x: x + 0.34, y: 3.18, w: lgw - 0.4, h: 0.3, size: 12, valign: 'middle', oneLine: true });
      T(s, d, { x, y: 3.5, w: lgw - 0.1, h: 0.28, size: 12, color: P.muted, oneLine: true });
    });
    T(s, '调用：', { x: x1, y: 4.06, w: 1.0, h: 0.34, size: 12, bold: true, valign: 'middle' });
    snippet(s, { x: x1 + 1.0, y: 4.06, w: w1 - 1.0, h: 0.34, size: 10.5, code: 'setColor(255, 0, 0);   // 调用：红色' });
    T(s, '带返回值：', { x: x1, y: 4.5, w: 1.0, h: 0.5, size: 12, bold: true, valign: 'middle' });
    snippet(s, { x: x1 + 1.0, y: 4.5, w: w1 - 1.0, h: 0.5, size: 10, code: 'int add(int a, int b) { return a + b; }\nint s = add(2, 3);   // s 等于 5' });
  }

  // ------------------------------------------------------------ blink 1/2
  s = slide({
    title: '示例：自己写一个 blink 函数（1/2）',
    desc: '先“定义”函数：说清楚闪几次、每次隔多久——这一步只是写好菜谱，还没开始做。',
    notes: '这一页只是“定义”函数，相当于写好了菜谱，还没有开始做。times 和 ms 是两个参数，在函数里像普通变量一样使用。for 循环跑 times 圈，每圈亮一次、灭一次。',
  });
  blk = code(s, { x: L, y: TOP, w: 5.3, h: 2.85, code: FUNC_DEMO, from: 1, to: 11, file: 'function_demo.ino', right: '第 1–11 行', hl: [3, 4, 5, 6] });
  explain(s, blk, { x: 6.05, w: 3.5, items: [
    { line: 3, text: '// 开头是注释：说明这个函数做什么' },
    { line: 4, text: '两个参数：闪几次、间隔多久' },
    { line: 5, text: '参数当变量用：循环 times 圈' },
    { line: [6, 9], text: '亮 → 等 → 灭 → 等，就是闪一下' },
  ] });
  V.card(s, { x: L, y: 4.45, w: 5.3, h: 0.55, fill: P.turqPale });
  V.iconCircle(s, I.bulb, { x: L + 0.14, y: 4.555, d: 0.34 });
  T(s, [b('定义 ≠ 执行：'), br(r('函数要在 loop() 里“调用”，')), r('才会真的闪起来（见下一页）。')], { x: L + 0.6, y: 4.45, w: 5.3 - 0.74, h: 0.55, size: 12, valign: 'middle' });

  // ------------------------------------------------------------ blink 2/2
  s = slide({
    title: '示例：自己写一个 blink 函数（2/2）',
    desc: '在 loop() 里调用：同一个函数，传不同的参数，就能快闪 3 下、慢闪 1 下。',
    notes: 'loop() 里两次调用同一个函数，只是传的参数不同，就得到“快闪 3 下、慢闪 1 下”的节奏。这就是函数的好处：想改闪法，只改参数，不用重写四行代码。可以让学生用 blink 拼出一段求救信号（三短三长三短）。',
  });
  blk = code(s, { x: L, y: TOP, w: 5.3, h: 2.85, code: FUNC_DEMO, from: 12, to: 22, file: 'function_demo.ino', right: '第 12–22 行', hl: [14, 18, 20] });
  explain(s, blk, { x: 6.05, w: 3.5, items: [
    { line: 14, text: '开机时把 13 号脚设为输出' },
    { line: 18, text: '调用：快闪 3 下，每次 150 毫秒' },
    { line: 20, text: '换一组参数：慢闪 1 下' },
  ] });
  tryStrip(s, { x: L, y: 4.45, w: 5.3, h: 0.55, runs: [r('把第 18 行改成 '), br(m('blink(5, 80);')), r('再加一行 '), m('blink(2, 1000);'), r(' 看看节奏')] });

  // ------------------------------------------------------------ math & map
  s = slide({
    title: '数学函数与 map()：换算尺',
    desc: 'map() 是传感器编程里最常用的“换算器”：把一个范围按比例换成另一个范围。',
    notes: 'map() 是传感器编程里最常用的换算器：把一个范围按比例换成另一个范围，就像比例尺。注意 map 只做整数运算，512 换算成 127.6 会被舍成 127。constrain 常和 map 搭配，保证结果不越界。',
  });
  {
    const tw = 4.4;
    V.table(s, [
      ['函数', '作用'],
      ['min(x, y)', '取较小值'],
      ['max(x, y)', '取较大值'],
      ['abs(x)', '绝对值'],
      ['constrain(x, a, b)', '把 x 限制在 a～b 之间'],
      ['pow(x, n)', 'x 的 n 次方'],
      ['sq(x)', '平方'],
      ['sqrt(x)', '开平方'],
      ['random(a, b)', 'a～b-1 的随机整数'],
    ], { x: L, y: TOP, w: tw, colW: [2.0, tw - 2.0], monoCols: [0], boldCols: [0], rowH: 0.28, size: 12 });
    const x1 = L + tw + 0.3, w1 = CW - tw - 0.3, h1 = 2.55;
    V.card(s, { x: x1, y: TOP, w: w1, h: h1 });
    iconTitle(s, I.ruler, 'map()：按比例换算', { x: x1 + 0.18, y: TOP + 0.14, w: w1 - 0.36, d: 0.38, size: 14 });
    T(s, [m('map(值, 原最小, 原最大, 新最小, 新最大)', { bold: true })], { x: x1 + 0.18, y: TOP + 0.6, w: w1 - 0.36, h: 0.28, size: 11.5, valign: 'middle', oneLine: true });
    const bx = x1 + 0.95, bw = w1 - 1.15;
    const yT = TOP + 1.17, yB = TOP + 1.68;
    T(s, '原范围', { x: x1 + 0.18, y: yT - 0.06, w: 0.75, h: 0.28, size: 11, bold: true, valign: 'middle' });
    T(s, '新范围', { x: x1 + 0.18, y: yB - 0.06, w: 0.75, h: 0.28, size: 11, bold: true, valign: 'middle' });
    s.addShape('rect', { x: bx, y: yT, w: bw, h: 0.16, fill: { color: P.turq }, line: { color: P.turq, width: 0 } });
    s.addShape('rect', { x: bx, y: yB, w: bw, h: 0.16, fill: { color: P.ink }, line: { color: P.ink, width: 0 } });
    const ticks = [[0, '0', '0'], [0.5, '512', '127'], [1, '1023', '255']];
    ticks.forEach(([t, a, c]) => {
      const tx = bx + t * bw;
      line(s, tx, yT + 0.16, tx, yB, { color: P.muted, dash: 'dash', width: 1 });
      const al = t === 0 ? 'left' : t === 1 ? 'right' : 'center';
      const lx = t === 0 ? tx : t === 1 ? tx - 0.6 : tx - 0.3;
      T(s, [m(a, { bold: true })], { x: lx, y: yT - 0.24, w: 0.6, h: 0.22, size: 10.5, align: al, valign: 'middle' });
      T(s, [m(c, { bold: true })], { x: lx, y: yB + 0.18, w: 0.6, h: 0.22, size: 10.5, align: al, valign: 'middle' });
    });
    snippet(s, { x: x1 + 0.18, y: TOP + 2.13, w: w1 - 0.36, h: 0.3, size: 10.5, code: 'map(512, 0, 1023, 0, 255)  // → 127' });
    // table renders ~3.97 in at the bottom; keep >= 0.3 in gap
    const ty = 4.36, th = BOT - ty;
    V.card(s, { x: L, y: ty, w: CW, h: th, fill: P.turqPale });
    V.iconCircle(s, I.bulb, { x: L + 0.14, y: ty + (th - 0.34) / 2, d: 0.34 });
    T(s, [r('实验 2.10（旋钮控制舵机）用 '), m('readValue / 4'), br(r(' 粗略换算角度；')), r('改成 '), m('map(readValue, 0, 1023, 0, 180)'), r(' 就能让旋钮完整对应 0～180°。')], { x: L + 0.62, y: ty, w: CW - 0.76, h: th, size: 12, valign: 'middle', lineSpacingMultiple: 1.1 });
  }

  // ------------------------------------------------------------ knob 1/2
  s = slide({
    title: '示例：旋钮调亮度（1/2）',
    desc: '电位器接 A0、LED 接 9 号 PWM 引脚；第 1–7 行先起名字、做准备。',
    notes: '先看实验卡和接线：电位器两边脚接 5V 和 GND，中间脚接 A0；LED 串一个 220Ω 电阻接 9 号脚，长脚是正极。第 1–7 行只是起名字和做准备：LED 引脚设为输出，打开串口。',
  });
  blk = code(s, { x: L, y: TOP, w: 5.3, h: 1.98, code: MAP_DEMO, from: 1, to: 7, file: 'map_demo.ino', right: '第 1–7 行', hl: [1, 2, 5, 6] });
  {
    const cy = TOP + 1.98 + 0.3, ch = BOT - cy;
    V.card(s, { x: L, y: cy, w: 5.3, h: ch });
    iconTitle(s, I.bullseye, '实验目的', { x: L + 0.18, y: cy + 0.13, w: 3, d: 0.36, size: 14 });
    T(s, '转动旋钮，LED 从灭到最亮连续变化；串口同时打印读数和亮度。', { x: L + 0.18, y: cy + 0.55, w: 5.3 - 0.36, h: 0.48, size: 12 });
    V.tags(s, ['analogRead', 'map', 'constrain', 'analogWrite'], { x: L + 0.18, y: cy + ch - 0.36, w: 5.3 - 0.36 });
  }
  explain(s, blk, { x: 6.05, w: 3.5, maxY: 3.22, gap: 0.1, items: [
    { line: 1, text: '给 A0 起名 knob' },
    { line: 2, text: '给 9 号脚起名 led，它带 ~' },
    { line: 5, text: 'LED 引脚设为输出' },
    { line: 6, text: '打开串口，用来看数值' },
  ] });
  V.wiring(s, { x: 6.05, y: 3.52, w: 3.5, left: 'Arduino', right: '元件', colW: [1.1, 2.4], rowH: 0.28, rows: [['A0', '电位器 中间脚'], ['5V、GND', '电位器 两边脚'], ['9', 'LED 长脚（串 220Ω）'], ['GND', 'LED 短脚']] });

  // ------------------------------------------------------------ knob 2/2
  s = slide({
    title: '示例：旋钮调亮度（2/2）',
    desc: '读旋钮 → 换算 → 限制范围 → 输出亮度 → 打印到串口，每 0.2 秒重复一次。',
    notes: 'loop() 里四步：读旋钮、换算、限制范围、输出亮度，再把两个数打印出来。串口里“读数 -> 亮度”一行一行地出现，转旋钮时数字跟着变。动手题：把 map 的最后两个数换成 255, 0，旋钮方向就反过来了。',
  });
  blk = code(s, { x: L, y: TOP, w: 6.2, h: 2.75, size: 10.5, code: MAP_DEMO, from: 8, to: 18, file: 'map_demo.ino', right: '第 8–18 行', hl: [10, 11, 12, 13] });
  explain(s, blk, { x: 6.95, w: 2.6, maxY: 3.5, items: [
    { line: 10, text: '读旋钮：0～1023' },
    { line: 11, text: '换算成亮度 0～255' },
    { line: 12, text: '保险起见限制范围' },
    { line: 13, text: '输出到 PWM 引脚' },
  ] });
  V.serialMonitor(s, { x: 6.95, y: 3.8, w: 2.6, h: 1.2, size: 10, baud: 9600, lines: ['0 -> 0', '256 -> 63', '512 -> 127', '1023 -> 255'] });
  tryStrip(s, { x: L, y: 4.45, w: 6.2, h: 0.55, runs: [r('把 map 的最后两个数换成 '), m('255, 0'), r('：旋钮方向反过来')] });

  // ------------------------------------------------------------ libraries
  s = slide({
    title: '库 #include：给 Arduino 装“扩展包”',
    desc: '库是别人写好的代码：一句 #include 引入，就能直接控制舵机、显示屏这些复杂模块。',
    notes: '库就像手机上的 App：装好以后，用一句 #include 引入，就能直接用它提供的功能。IDE 自带的库（Servo、Wire）不用安装；其他库用“管理库”在线安装，或者导入套件资料里的 .ZIP 文件。库的函数通常写成“对象.函数()”，例如 lcd.print()、myservo.write(90)。',
  });
  V.table(s, [
    ['写法', '能控制什么', '从哪里来', '套件实验'],
    ['#include <Servo.h>', '舵机', 'IDE 自带', '2.10　2.11'],
    ['#include <LiquidCrystal_I2C.h>', 'LCD1602 显示屏', '需要安装', '2.13　2.23'],
    ['#include <Adafruit_NeoPixel.h>', 'WS2812 彩灯', '需要安装', '2.6'],
    ['#include <dht11.h>', 'DHT11 温湿度', '套件资料提供', '2.23'],
    ['#include <Wire.h>', 'I2C 通信', 'IDE 自带', '2.13'],
    ['#include <SegmentDisplay.h>', '四位数码管', '实验资料提供', '原课件'],
  ], { x: L, y: TOP, w: CW, colW: [3.4, 2.1, 1.7, 1.9], monoCols: [0], rowH: 0.29, size: 12 });
  {
    const y = 3.68, h = BOT - y, cw = (CW - 0.6) / 3;
    const st = [
      ['在线安装', [r('工具 → 管理库，搜索库名（如 LiquidCrystal I2C），点“安装”')]],
      ['压缩包安装', [r('项目 → 导入库 → 添加 .ZIP 库，选择套件资料里的库文件')]],
      ['在代码里使用', [r('开头写 '), m('#include'), br(r('，')), br(r('再用“对象.函数()”来调用，')), r('例如 '), m('lcd.print(…)')]],
    ];
    st.forEach(([t, runs], i) => {
      const x = L + i * (cw + 0.3);
      V.card(s, { x, y, w: cw, h, fill: i === 2 ? P.turqPale : P.card });
      V.numCircle(s, i + 1, { x: x + 0.16, y: y + 0.14, d: 0.34, size: 12 });
      T(s, t, { x: x + 0.6, y: y + 0.12, w: cw - 0.76, h: 0.38, size: 14, bold: true, valign: 'middle', oneLine: true });
      T(s, runs, { x: x + 0.16, y: y + 0.56, w: cw - 0.32, h: h - 0.62, size: 12 });
    });
  }

  // ============================================================ SECTION 6 quick reference
  deck.section('速查与排错');
  s = slide({
    title: '速查：四类输入输出',
    desc: '套件里绝大多数模块都能归到这四类：先判断是哪一类，再套用对应的函数。',
    notes: '这张图基本覆盖了套件里所有模块：先判断模块属于哪一类，再用对应的函数。数字输出控制开关量，数字输入读开关量，模拟输入读连续变化的电压，PWM 输出“中间亮度”。舵机、LCD、彩灯、温湿度、超声波这些复杂一些的模块，通过库或特殊函数控制。',
  });
  {
    const tw = CW / 2, th = (BOT - TOP) / 2;
    const q = [
      { fill: P.turq, icon: 'bulb', title: '数字输出', fn: 'digitalWrite(引脚, HIGH/LOW)', mod: 'LED、有源蜂鸣器、RGB 单色', exp: '实验 2.1 2.2 2.15 2.18 2.19 2.25 2.27 2.32 2.33' },
      { fill: P.gray1, icon: 'hand', title: '数字输入', fn: 'digitalRead(引脚)', mod: '按键、触摸、倾斜、磁簧、限位、红外避障', exp: '实验 2.15 2.17 2.19 2.25 2.27 2.32 2.33' },
      { fill: P.white, icon: 'sliders', title: '模拟输入', fn: 'analogRead(A0～A5)', mod: '电位器、光敏电阻、摇杆', exp: '实验 2.4 2.5 2.10 2.17 2.20' },
      { fill: P.ink, icon: 'sun', title: '模拟输出（PWM）', fn: 'analogWrite(引脚, 0～255)', mod: 'LED 调光、RGB 混色', exp: '实验 2.3 2.5 2.20' },
    ];
    q.forEach((it, i) => {
      const x = L + (i % 2) * tw, y = TOP + Math.floor(i / 2) * th;
      const dark = it.fill === P.ink, turq = it.fill === P.turq;
      s.addShape('rect', { x, y, w: tw, h: th, fill: { color: it.fill }, line: { color: P.gray2, width: 0.75 } });
      V.iconCircle(s, turq ? I[it.icon + '_w'] : I[it.icon], { x: x + 0.25, y: y + 0.22, d: 0.46, fill: turq ? P.ink : P.turq });
      T(s, it.title, { x: x + 0.86, y: y + 0.22, w: tw - 1.1, h: 0.46, size: 17, bold: true, color: dark ? P.white : P.ink, valign: 'middle', oneLine: true });
      T(s, [m(it.fn, { bold: true })], { x: x + 0.25, y: y + 0.82, w: tw - 0.5, h: 0.32, size: 13, color: dark ? P.turq : P.ink, valign: 'middle', oneLine: true });
      T(s, it.mod, { x: x + 0.25, y: y + 1.15, w: tw - 0.5, h: 0.3, size: 13, color: dark ? P.white : P.ink, valign: 'middle', oneLine: true });
      T(s, it.exp, { x: x + 0.25, y: y + 1.47, w: tw - 0.5, h: 0.24, size: 10.5, color: dark ? 'CFCFCF' : (turq ? P.ink : P.muted), valign: 'middle', oneLine: true });
    });
  }

  // ------------------------------------------------------------ cheat sheet 1/2
  s = slide({
    title: '常用语法速查（1/2）',
    desc: '程序结构、变量、数字和模拟输入输出——写代码时忘了写法，就翻这一页。',
    notes: '两页速查表可以打印出来贴在桌边。写代码时忘了写法，就来这里查，不用死记。重点提醒 analogWrite 只能用在 3、5、6、9、10、11 号引脚。',
  });
  {
    const cw = (CW - 0.3) / 2, chh = (BOT - TOP - 0.3) / 2;
    const hs = [1.85, 1.5];
    const at = (i) => ({ x: L + (i % 2) * (cw + 0.3), y: i < 2 ? TOP : TOP + hs[0] + 0.3, w: cw, h: hs[i < 2 ? 0 : 1] });
    cheat(s, { ...at(0), icon: 'cubes', title: '程序结构', codeW: 2.4, rows: [['void setup() { }', '只执行一次'], ['void loop() { }', '反复执行'], ['// 注释', '单行注释'], ['/* … */', '多行注释']] });
    cheat(s, { ...at(1), icon: 'box', title: '变量', codeW: 2.4, rows: [['int a = 0;', '整数'], ['float v = 0.0;', '小数'], ['String s = "";', '文字'], ['const int P = 2;', '常量'], ['int arr[8] = {…};', '数组']] });
    cheat(s, { ...at(2), icon: 'toggle', title: '数字 IO', codeW: 2.4, rows: [['pinMode(p, OUTPUT / INPUT / INPUT_PULLUP);', ''], ['digitalWrite(p, HIGH / LOW);', ''], ['digitalRead(p)', '→ HIGH / LOW']] });
    cheat(s, { ...at(3), icon: 'sliders', title: '模拟 IO', codeW: 2.4, rows: [['analogRead(A0)', '→ 0～1023'], ['analogWrite(p, 0～255);', '仅 3 5 6 9 10 11']] });
  }

  // ------------------------------------------------------------ cheat sheet 2/2
  s = slide({
    title: '常用语法速查（2/2）',
    desc: '判断与循环、时间、串口、数学函数——四张卡片，覆盖套件实验里的常用写法。',
    notes: '判断与循环、时间、串口、数学函数都在这一页。pulseIn 前面没有展开，它用来测量一个高电平持续了多少微秒，超声波测距会用到。',
  });
  {
    const cw = (CW - 0.3) / 2, chh = (BOT - TOP - 0.3) / 2;
    const hs = [1.56, 1.79];
    const at = (i) => ({ x: L + (i % 2) * (cw + 0.3), y: i < 2 ? TOP : TOP + hs[0] + 0.3, w: cw, h: hs[i < 2 ? 0 : 1], pitch: 0.225 });
    cheat(s, { ...at(0), icon: 'branch', title: '判断与循环', codeW: 2.4, rows: [['if (条件) { } else if (条件) { } else { }', ''], ['for (int i = 0; i < n; i++) { }', ''], ['while (条件) { }', ''], ['==  !=  >  <  >=  <=  &&  ||  !', '']] });
    cheat(s, { ...at(1), icon: 'clock', title: '时间', codeW: 2.3, rows: [['delay(ms);', '等待毫秒'], ['delayMicroseconds(us);', '等待微秒'], ['millis()', '开机后的毫秒数'], ['pulseIn(p, HIGH)', '高电平持续微秒数']] });
    cheat(s, { ...at(2), icon: 'comments', title: '串口', codeW: 2.3, rows: [['Serial.begin(9600);', '打开串口'], ['Serial.print(x);', '打印，不换行'], ['Serial.println(x);', '打印后换行'], ['Serial.available()', '收到几个字符'], ['Serial.read()', '读出 1 个字符']] });
    cheat(s, { ...at(3), icon: 'calc', title: '数学', codeW: 2.55, rows: [['map(x, 0, 1023, 0, 255)', '按比例换算'], ['constrain(x, a, b)', '限制在 a～b'], ['min  max  abs', ''], ['pow  sq  sqrt  random(a, b)', '']] });
  }

  // ------------------------------------------------------------ common errors
  s = slide({
    title: '常见报错和排查',
    desc: '在 Arduino IDE 里，错误信息显示在窗口下方——先看是哪一行，再对照这张表。',
    notes: '编译报错别慌：先看最上面的第一条，它会告诉你出错的行号。最常见的就是表里前四条：漏分号、拼写或大小写、括号不成对、中文标点。上传失败多半是端口没选对，串口乱码多半是波特率不一致。',
  });
  V.table(s, [
    ['报错信息', '是什么意思', '怎么改'],
    ["expected ';' before …", '缺少分号', '检查报错行的上一行末尾是否漏了 ;'],
    ['was not declared in this scope', '名字没有定义', '拼写或大小写写错（pinmode → pinMode），或变量没有先声明'],
    ["expected '}' at end of input", '大括号不成对', '数一数 { 和 } 是否一样多'],
    ["stray '\\357' in program", '出现中文标点', '把中文的 ；（）“” 改成英文标点'],
    ['No such file or directory', '缺少库', '用“管理库”安装，或检查 #include 的名字'],
    ['串口监视器乱码', '波特率不一致', '监视器右下角的波特率要和 Serial.begin() 里的一样'],
    ['上传失败 / 找不到端口', '端口没选对', '工具 → 端口，选择带 Arduino 字样的 COM 口'],
  ], { x: L, y: TOP, w: CW, colW: [3.3, 1.45, 4.35], monoCols: [0], rowH: 0.33, size: 12 });
  V.card(s, { x: L, y: 4.5, w: CW, h: 0.5, fill: P.turqPale });
  V.iconCircle(s, I.bug, { x: L + 0.14, y: 4.58, d: 0.34 });
  T(s, [b('看不懂报错？'), r('先看最上面那一条——后面的报错，常常是被第一条连累的。')], { x: L + 0.62, y: 4.5, w: CW - 0.76, h: 0.5, size: 12, valign: 'middle', oneLine: true });

  // ============================================================ end
  NO++;
  deck.end({
    title: '先让它跑起来，再让它变得有趣。',
    subtitle: '改一个数字、换一个引脚、加一个 if——每一次修改，都是在设计一件会动的作品。',
    notes: '总结：先让程序跑起来，再一点点改，每次只改一处，观察变化。下一步就可以进入套件实验，把这些语法用到真实的电路里。',
  });

  await deck.save(OUT);
  if (WARN.length) { console.log('LAYOUT WARNINGS:\n' + WARN.join('\n')); }
  console.log(`ok: ${NO} slides -> ${OUT}`);
})().catch((e) => { console.error(e); process.exit(1); });
