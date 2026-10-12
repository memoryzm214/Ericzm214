// Shared design system for every Arduino course deck.
// Look and feel follows the "Untitled 7" template the user picked: turquoise #40E0D0,
// charcoal #2D2D2D, light grays #EBEBEB / #E2E2E2 / #F5F5F5 and white; minimal type,
// left text column + right tile grid, rounded light-gray cards, icons in turquoise circles,
// red-outlined cards for "don't do this".
//
// Usage (see build/*.js):
//   const V = require('../lib/vti');
//   const deck = await V.Deck.create({ label: '1-2 模拟输入', title: '...' });
//   deck.cover({...}); deck.section('AD 模数转换'); const s = deck.slide({title, desc}); V.codeBlock(s, {...});
//   await deck.save('output/xxx.pptx');

const fs = require('fs');
const path = require('path');
const pptxgen = require('pptxgenjs');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const sharp = require('sharp');
const JSZip = require('jszip');

// ---------------------------------------------------------------- palette & type
const P = {
  turq: '40E0D0',      // brand turquoise: fills, pills, tiles, highlights on dark
  turqDeep: '1A9E92',  // turquoise dark enough to use as text on white
  turqPale: 'E3FAF7',  // very light turquoise tint for soft highlights
  ink: '2D2D2D',       // charcoal: text, dark tiles, code background
  muted: '6B6B6B',     // secondary text on white
  faint: '9A9A9A',     // tertiary text, captions on dark
  card: 'F5F5F5',      // rounded card background
  gray1: 'EBEBEB',
  gray2: 'E2E2E2',     // tile borders, table lines
  white: 'FFFFFF',
  red: 'E5484D',       // "don't" outline / warning
  redPale: 'FDECEC',
  amber: 'F7C873',     // code: numbers, strings, constants (on dark only)
};

const FONT = '微软雅黑';
const MONO = 'Consolas';

const THEME = {
  name: 'Arduino Turquoise',
  headFontFace: FONT,
  bodyFontFace: FONT,
  colors: {
    dk1: P.ink, lt1: P.white, dk2: P.muted, lt2: P.card,
    accent1: P.turq, accent2: P.gray1, accent3: P.gray2, accent4: P.ink, accent5: P.red, accent6: P.turqDeep,
    hlink: P.turqDeep, folHlink: P.muted,
  },
};

const SIZE = { title: 24, desc: 12, body: 14, small: 12, caption: 10, code: 11.5 };

// Slide is LAYOUT_16x9 = 10 x 5.625 in.
const G = {
  W: 10, H: 5.625,
  L: 0.45, R: 9.55,          // left/right content edges
  top: 1.35, bottom: 5.0,    // content area (below title/desc, above footer)
  get cw() { return this.R - this.L; },
  get ch() { return this.bottom - this.top; },
};

// ---------------------------------------------------------------- measuring helpers
function isWide(ch) {
  const c = ch.codePointAt(0);
  return (c >= 0x2E80 && c <= 0x9FFF) || (c >= 0xF900 && c <= 0xFAFF) || (c >= 0xFF00 && c <= 0xFF60) ||
    (c >= 0x3000 && c <= 0x303F) || (c >= 0xFE30 && c <= 0xFE4F) || c === 0x2014 || c === 0x2026 ||
    (c >= 0x2018 && c <= 0x201D) || (c >= 0x2460 && c <= 0x24FF) || (c >= 0x25A0 && c <= 0x25FF);
}

// Width of a string in inches for the body font (CJK 1em, Latin ~0.56em). Errs on the wide side.
function textW(str, size) {
  let em = 0;
  for (const ch of String(str)) {
    if (isWide(ch)) em += 1.0;
    else if (ch === ' ') em += 0.32;
    else if (/[iljI.,:;'|!()\[\]]/.test(ch)) em += 0.32;
    else if (/[mwMW@%]/.test(ch)) em += 0.85;
    else if (/[A-Z0-9]/.test(ch)) em += 0.64;
    else em += 0.56;
  }
  return em * size / 72;
}

// Width of a monospace string (Consolas is 0.55em; measured at 0.6em for safety).
function monoW(str, size) {
  let em = 0;
  for (const ch of String(str)) em += isWide(ch) ? 1.0 : 0.6;
  return em * size / 72;
}

// Estimated wrapped height (inches) of `str` in a box `w` wide.
function textH(str, w, size, lineSpacing = 1.3) {
  const lines = String(str).split('\n');
  let n = 0;
  for (const ln of lines) n += Math.max(1, Math.ceil(textW(ln, size) / (w * 0.97)));
  return n * size * lineSpacing / 72;
}

// ---------------------------------------------------------------- image helpers
function imgSize(p) {
  const b = fs.readFileSync(p);
  if (b[0] === 0x89 && b[1] === 0x50) return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xFF) { i++; continue; }
    const m = b[i + 1];
    if (m === 0xD8 || m === 0x01 || (m >= 0xD0 && m <= 0xD7)) { i += 2; continue; }
    const len = b.readUInt16BE(i + 2);
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  throw new Error('cannot read image size: ' + p);
}

const ASSETS = path.join(__dirname, '..', 'assets');
function asset(rel) {
  const p = path.isAbsolute(rel) ? rel : path.join(ASSETS, rel);
  if (!fs.existsSync(p)) throw new Error('missing asset: ' + p);
  return p;
}

// Contain-fit an image into a box, centred. Never crops (the source pictures must stay whole).
function placeImage(slide, file, x, y, w, h, opts = {}) {
  const p = asset(file);
  const s = imgSize(p);
  const k = Math.min(w / s.w, h / s.h);
  const iw = s.w * k, ih = s.h * k;
  const ix = x + (w - iw) / 2;
  const iy = opts.valign === 'top' ? y : y + (h - ih) / 2;
  slide.addImage({ path: p, x: ix, y: iy, w: iw, h: ih, altText: opts.alt || path.basename(p), objectName: opts.name });
  return { x: ix, y: iy, w: iw, h: ih };
}

// ---------------------------------------------------------------- icons & motif art
const ICON_LIBS = { Fa: 'fa', Md: 'md', Lu: 'lu', Tb: 'tb', Pi: 'pi', Bs: 'bs', Ri: 'ri', Bi: 'bi', Hi: 'hi', Gi: 'gi' };
const iconCache = new Map();
async function icon(name, color = P.ink, px = 256) {
  const key = `${name}|${color}|${px}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const pre = Object.keys(ICON_LIBS).find((k) => name.startsWith(k) && /[A-Z0-9]/.test(name[k.length]));
  if (!pre) throw new Error('unknown icon library for ' + name);
  const lib = require('react-icons/' + ICON_LIBS[pre]);
  const Comp = lib[name];
  if (!Comp) throw new Error(`icon ${name} not found in react-icons/${ICON_LIBS[pre]}`);
  const svg = ReactDOMServer.renderToStaticMarkup(React.createElement(Comp, { color: '#' + color, size: px }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const data = 'image/png;base64,' + buf.toString('base64');
  iconCache.set(key, data);
  return data;
}

// Isometric cube polygons (the deck's own mark, echoing the template's isometric logo).
function cubeSvg(cubes, vb, faces) {
  const polys = [];
  for (const { cx, cy, s, top } of cubes) {
    const a = s * 0.866;
    const t = `${cx},${cy - s} ${cx + a},${cy - s / 2} ${cx},${cy} ${cx - a},${cy - s / 2}`;
    const l = `${cx - a},${cy - s / 2} ${cx},${cy} ${cx},${cy + s} ${cx - a},${cy + s / 2}`;
    const r = `${cx},${cy} ${cx + a},${cy - s / 2} ${cx + a},${cy + s / 2} ${cx},${cy + s}`;
    polys.push(`<polygon points="${t}" fill="#${top || faces.top}"/>`, `<polygon points="${l}" fill="#${faces.left}"/>`, `<polygon points="${r}" fill="#${faces.right}"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb[0]} ${vb[1]}" width="${vb[0] * 4}" height="${vb[1] * 4}">${polys.join('')}</svg>`;
}
async function svgData(svg) {
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  return 'image/png;base64,' + buf.toString('base64');
}
const ART = {};
async function loadArt() {
  if (ART.ready) return ART;
  const dark = { top: '6B6B6B', left: '2D2D2D', right: '474747' };
  // single cube (footer mark): turquoise top
  ART.cube = await svgData(cubeSvg([{ cx: 50, cy: 50, s: 40, top: P.turq }], [100, 100], dark));
  // cluster of three cubes (cover)
  ART.cluster = await svgData(cubeSvg([
    { cx: 70, cy: 112, s: 40 },
    { cx: 140, cy: 152, s: 40 },
    { cx: 140, cy: 72, s: 40, top: 'EBEBEB' },
  ], [200, 200], dark));
  ART.ready = true;
  return ART;
}

// ---------------------------------------------------------------- primitives
// Text box. `t` is a string or a pptxgenjs run array. Defaults: body font, margin 0, top aligned.
function text(slide, t, o = {}) {
  const opts = {
    x: o.x, y: o.y, w: o.w, h: o.h,
    fontFace: o.mono ? MONO : FONT,
    fontSize: o.size || SIZE.body,
    color: o.color || P.ink,
    bold: !!o.bold, italic: !!o.italic,
    align: o.align || 'left', valign: o.valign || 'top',
    margin: o.margin ?? 0,
    isTextBox: true,
    lineSpacingMultiple: o.lineSpacingMultiple || 1.15,
    fit: 'none',
    objectName: o.name,
  };
  if (o.fill) opts.fill = { color: o.fill };
  if (o.paraSpaceAfter) opts.paraSpaceAfter = o.paraSpaceAfter;
  if (o.charSpacing) opts.charSpacing = o.charSpacing;
  slide.addText(t, opts);
}

// Rounded card. fill default light gray; pass line for an outline (white tile with border = template tile).
function card(slide, o) {
  const shape = o.square ? 'rect' : 'roundRect';
  const opts = {
    x: o.x, y: o.y, w: o.w, h: o.h,
    fill: { color: o.fill || P.card },
    line: o.line ? { color: o.line, width: o.lineW || 0.75 } : { color: o.fill || P.card, width: 0 },
    objectName: o.name,
  };
  if (!o.square) opts.rectRadius = o.radius ?? 0.12;
  if (o.shadow) opts.shadow = { type: 'outer', color: '000000', opacity: 0.12, blur: 8, offset: 2, angle: 90 };
  slide.addShape(shape, opts);
}

// Pill label (e.g. "第 3 行", a syntax tag). Returns its width.
function pill(slide, o) {
  const size = o.size || 10;
  const h = o.h || size / 72 * 1.9;
  const w = o.w || (o.mono ? monoW(o.text, size) : textW(o.text, size)) + 0.22;
  slide.addShape('roundRect', {
    x: o.x, y: o.y, w, h, rectRadius: h / 2,
    fill: { color: o.fill || P.turq },
    line: o.line ? { color: o.line, width: 0.75 } : { color: o.fill || P.turq, width: 0 },
  });
  text(slide, o.text, { x: o.x, y: o.y, w, h, size, bold: o.bold ?? true, color: o.color || P.ink, align: 'center', valign: 'middle', mono: o.mono });
  return w;
}

// A row of pills (syntax tags). Wraps to new lines within w. Returns bottom y.
function tags(slide, list, o) {
  const size = o.size || 10.5;
  const h = size / 72 * 1.9;
  let x = o.x, y = o.y;
  for (const t of list) {
    const mono = o.mono ?? true;
    const w = (mono ? monoW(t, size) : textW(t, size)) + 0.26;
    if (x + w > o.x + o.w) { x = o.x; y += h + 0.08; }
    pill(slide, { x, y, w, h, text: t, size, fill: o.fill || P.ink, color: o.color || P.white, bold: false, mono: o.mono ?? true });
    x += w + 0.08;
  }
  return y + h;
}

// Icon inside a filled circle (template motif).
function iconCircle(slide, data, o) {
  const d = o.d || 0.5;
  slide.addShape('ellipse', { x: o.x, y: o.y, w: d, h: d, fill: { color: o.fill || P.turq }, line: { color: o.fill || P.turq, width: 0 } });
  const k = o.scale || 0.52;
  slide.addImage({ data, x: o.x + d * (1 - k) / 2, y: o.y + d * (1 - k) / 2, w: d * k, h: d * k });
}

// Number in a circle (step markers).
function numCircle(slide, n, o) {
  const d = o.d || 0.42;
  slide.addShape('ellipse', { x: o.x, y: o.y, w: d, h: d, fill: { color: o.fill || P.turq }, line: { color: o.fill || P.turq, width: 0 } });
  text(slide, String(n), { x: o.x, y: o.y, w: d, h: d, size: o.size || 13, bold: true, color: o.color || P.ink, align: 'center', valign: 'middle' });
}

function arrow(slide, x1, y1, x2, y2, o = {}) {
  slide.addShape('line', {
    x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1) || 0.0001, h: Math.abs(y2 - y1) || 0.0001,
    flipH: x2 < x1, flipV: y2 < y1,
    line: { color: o.color || P.muted, width: o.width || 1.25, endArrowType: o.noHead ? undefined : 'triangle', dashType: o.dash },
  });
}

// Bulleted list. items: strings or {text, bold} or run arrays.
function bullets(slide, items, o) {
  const size = o.size || SIZE.body;
  const runs = [];
  items.forEach((it, i) => {
    const last = i === items.length - 1;
    const base = { bullet: o.numbered ? { type: 'number' } : { indent: size * 0.9 }, breakLine: !last, paraSpaceAfter: o.gap ?? 6 };
    if (Array.isArray(it)) {
      it.forEach((r, j) => runs.push({ text: r.text, options: { ...base, ...r.options, breakLine: j === it.length - 1 ? !last : false } }));
    } else if (typeof it === 'object') {
      runs.push({ text: it.text, options: { ...base, bold: !!it.bold, color: it.color } });
    } else {
      runs.push({ text: it, options: base });
    }
  });
  text(slide, runs, { ...o, size });
}

// ---------------------------------------------------------------- composite blocks
// Image inside a tile. Photos go on a light-gray card; diagrams on white with a thin border.
// Never crops. Optional caption under the image (inside the tile).
function imageBox(slide, o) {
  const pad = o.pad ?? 0.12;
  const capH = o.caption ? (o.capH || 0.3) : 0;
  card(slide, { x: o.x, y: o.y, w: o.w, h: o.h, fill: o.fill || (o.diagram ? P.white : P.card), line: o.diagram ? P.gray2 : o.line, radius: o.radius });
  const r = placeImage(slide, o.file, o.x + pad, o.y + pad, o.w - 2 * pad, o.h - 2 * pad - capH, { alt: o.alt || o.caption });
  if (o.caption) text(slide, o.caption, { x: o.x + pad, y: o.y + o.h - pad - capH + 0.04, w: o.w - 2 * pad, h: capH - 0.04, size: SIZE.caption, color: P.muted, align: 'center', valign: 'middle' });
  return r;
}

// 2x2 (or n x m) tile grid like the template's "Colors" page. items: {fill, title, sub, code, big, color}
function tiles(slide, o) {
  const cols = o.cols || 2, rows = o.rows || Math.ceil(o.items.length / cols);
  const tw = o.w / cols, th = o.h / rows;
  o.items.forEach((it, i) => {
    const cx = o.x + (i % cols) * tw, cy = o.y + Math.floor(i / cols) * th;
    const fill = it.fill || P.white;
    const dark = fill === P.ink;
    slide.addShape('rect', { x: cx, y: cy, w: tw, h: th, fill: { color: fill }, line: { color: P.gray2, width: 0.75 } });
    const col = it.color || (dark ? P.white : P.ink);
    const pad = 0.22;
    if (it.big) text(slide, it.big, { x: cx + pad, y: cy + pad - 0.04, w: tw - 2 * pad, h: 0.6, size: it.bigSize || 30, bold: true, color: dark ? P.turq : col });
    if (it.title) text(slide, it.title, { x: cx + pad, y: it.big ? cy + th - pad - 0.95 : cy + (th - 0.9) / 2, w: tw - 2 * pad, h: 0.45, size: it.titleSize || 16, bold: true, color: col, align: it.big ? 'left' : 'center', valign: 'middle' });
    if (it.sub) text(slide, it.sub, { x: cx + pad, y: it.big ? cy + th - pad - 0.5 : cy + (th - 0.9) / 2 + 0.45, w: tw - 2 * pad, h: 0.5, size: it.subSize || 12, color: dark ? 'CFCFCF' : (fill === P.turq ? P.ink : P.muted), align: it.big ? 'left' : 'center', valign: 'top' });
  });
}

// Styled table. rows[0] is the header. colW array (inches). Options: zebra, mono columns.
function table(slide, rows, o) {
  const size = o.size || 12;
  const monoCols = new Set(o.monoCols || []);
  const boldCols = new Set(o.boldCols || []);
  const body = rows.map((r, ri) => r.map((c, ci) => {
    const header = ri === 0;
    const cell = typeof c === 'object' && c !== null && !Array.isArray(c) ? c : { text: String(c) };
    return {
      text: cell.text,
      options: {
        fontFace: header ? FONT : (monoCols.has(ci) ? MONO : FONT),
        fontSize: header ? size - 1 : size,
        bold: header || boldCols.has(ci) || !!cell.bold,
        color: header ? P.white : (cell.color || P.ink),
        fill: { color: header ? P.ink : (cell.fill || ((o.zebra ?? true) && ri % 2 === 0 ? P.card : P.white)) },
        align: cell.align || (o.align && o.align[ci]) || 'left',
        valign: 'middle',
        margin: [3, 6, 3, 6],
      },
    };
  }));
  slide.addTable(body, {
    x: o.x, y: o.y, w: o.w, colW: o.colW, rowH: o.rowH || 0.32,
    border: { type: 'solid', pt: 0.75, color: P.gray2 },
    autoPage: false,
  });
}

// Wiring table: Arduino pin -> module pin, header = [left, right].
function wiring(slide, o) {
  const rows = [[o.left || 'Arduino UNO', o.right], ...o.rows.map((r) => [r[0], r[1]])];
  const colW = o.colW || [o.w / 2, o.w / 2];
  table(slide, rows, { x: o.x, y: o.y, w: o.w, colW, rowH: o.rowH || 0.3, size: o.size || 12, monoCols: [0, 1], boldCols: [0], align: ['center', 'center'] });
  return o.y + (o.rowH || 0.3) * rows.length;
}

// Tip / warning / don't box. kind: 'tip' (gray card + turquoise icon), 'warn' (red outline), 'note' (turquoise tint)
function tip(slide, o, iconData) {
  const kind = o.kind || 'tip';
  const fill = kind === 'warn' ? P.white : kind === 'note' ? P.turqPale : P.card;
  card(slide, { x: o.x, y: o.y, w: o.w, h: o.h, fill, line: kind === 'warn' ? P.red : undefined, lineW: 1 });
  const pad = 0.16;
  let tx = o.x + pad;
  if (iconData) {
    const d = 0.36;
    iconCircle(slide, iconData, { x: o.x + pad, y: o.y + pad, d, fill: kind === 'warn' ? P.red : P.turq });
    tx += d + 0.14;
  }
  const tw = o.x + o.w - pad - tx;
  let y = o.y + pad - 0.01;
  if (o.title) {
    text(slide, o.title, { x: tx, y, w: tw, h: 0.3, size: o.titleSize || 13, bold: true, color: kind === 'warn' ? P.red : P.ink, valign: 'middle' });
    y += 0.34;
  }
  if (o.text) text(slide, o.text, { x: tx, y, w: tw, h: o.y + o.h - pad - y, size: o.size || 12, color: P.ink });
}

// ---------------------------------------------------------------- code block
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
    let m;
    if (rest.startsWith('//')) { push(rest, 'com'); break; }
    if (rest.startsWith('/*')) { state.inBlock = true; push('/*', 'com'); i += 2; continue; }
    if ((m = rest.match(/^"(?:[^"\\]|\\.)*"?/)) && rest[0] === '"') { push(m[0], 'str'); i += m[0].length; continue; }
    if ((m = rest.match(/^'(?:[^'\\]|\\.)*'?/)) && rest[0] === '\'') { push(m[0], 'str'); i += m[0].length; continue; }
    if ((m = rest.match(/^#\s*\w+/))) { push(m[0], 'pre'); i += m[0].length; continue; }
    if ((m = rest.match(/^\d+(?:\.\d+)?/))) { push(m[0], 'num'); i += m[0].length; continue; }
    if ((m = rest.match(/^[A-Za-z_]\w*/))) {
      const w = m[0];
      const k = KW.has(w) ? 'kw' : CONSTS.test(w) ? 'num' : FN.has(w) ? 'fn' : 'base';
      push(w, k); i += w.length; continue;
    }
    if ((m = rest.match(/^\s+/))) { push(m[0], out.length ? out[out.length - 1].k : 'base'); i += m[0].length; continue; }
    push(rest[0], 'punct'); i += 1;
  }
  return out;
}

// Split a source line that is too long into display rows (continuations get no line number).
function cols(str) {
  let n = 0;
  for (const ch of str) n += isWide(ch) ? 2 : 1;
  return n;
}
// Longest prefix of `str` that fits in `max` columns.
function fitPrefix(str, max) {
  let n = 0, i = 0;
  for (const ch of str) { n += isWide(ch) ? 2 : 1; if (n > max) break; i += ch.length; }
  return i;
}
function wrapLine(line, max) {
  if (cols(line) <= max) return [line];
  const rows = [];
  const indent = (line.match(/^\s*/)[0].length) + 2;
  let cur = line;
  while (cols(cur) > max) {
    const fit = fitPrefix(cur, max);
    let cut = cur.lastIndexOf(' ', fit);
    if (cut <= indent + 4) cut = fit;
    rows.push(cur.slice(0, cut));
    cur = ' '.repeat(indent) + cur.slice(cut).replace(/^\s+/, '');
  }
  rows.push(cur);
  return rows;
}

// Code block on a charcoal card.
//   code: full source string; from/to: 1-based line range shown (defaults: all)
//   hl: array of line numbers to highlight; file: label in the header; right: header right label
//   size: preferred font size (auto-shrinks to 9.5 if needed, then throws so you split the code)
// Returns { lineY(n) -> centre y of source line n, bottom }.
function codeBlock(slide, o) {
  const all = o.code.replace(/\t/g, '    ').replace(/\s+$/, '').split('\n');
  const from = o.from || 1, to = o.to || all.length;
  const hl = new Set(o.hl || []);
  const headH = o.file || o.right ? 0.34 : 0.12;
  const padX = 0.14, padB = 0.12;
  const innerH = o.h - headH - padB;
  // Tokenizer state must account for block comments opened before `from`.
  const state = { inBlock: false };
  for (let n = 1; n < from; n++) tokenizeLine(all[n - 1], state);

  let size = o.size || SIZE.code, rows, lh, charW, gutter;
  const digits = String(to).length;
  for (; ; size -= 0.5) {
    lh = size * 1.36 / 72;
    charW = size * 0.602 / 72;  // DejaVu/Liberation Mono width: wider than Consolas, so real decks have slack
    gutter = (digits + 1.6) * charW;
    const max = Math.floor((o.w - 2 * padX - gutter) / charW);
    rows = [];
    for (let n = from; n <= to; n++) wrapLine(all[n - 1] ?? '', max).forEach((t, j) => rows.push({ n, t, cont: j > 0 }));
    if (rows.length * lh <= innerH + 0.001) break;
    if (size <= 9.5) throw new Error(`codeBlock: lines ${from}-${to} (${rows.length} rows) do not fit in h=${o.h}; split the code across slides`);
  }

  card(slide, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.ink, radius: 0.1 });
  if (o.file) text(slide, o.file, { x: o.x + padX, y: o.y + 0.07, w: o.w * 0.6, h: 0.22, size: 10, color: P.faint, mono: true, valign: 'middle' });
  if (o.right) text(slide, o.right, { x: o.x + o.w * 0.4, y: o.y + 0.07, w: o.w * 0.6 - padX, h: 0.22, size: 10, color: P.faint, align: 'right', valign: 'middle' });

  const y0 = o.y + headH;
  const lineY = {};
  rows.forEach((r, i) => {
    const y = y0 + i * lh;
    if (!r.cont) lineY[r.n] = y + lh / 2;
    const isHl = hl.has(r.n);
    if (isHl) slide.addShape('rect', { x: o.x + 0.05, y, w: o.w - 0.1, h: lh, fill: { color: '3E5250' }, line: { color: '3E5250', width: 0 } });
    text(slide, r.cont ? '↳' : String(r.n), { x: o.x + padX - 0.04, y, w: gutter - charW, h: lh, size: size - 1, mono: true, color: isHl ? P.turq : '7A7A7A', bold: isHl, align: 'right', valign: 'middle' });
    const toks = tokenizeLine(r.t, state);
    const runs = toks.length ? toks.map((tk) => ({ text: tk.t, options: { color: CODE_COL[tk.k], italic: tk.k === 'com', bold: tk.k === 'kw' || tk.k === 'fn' } })) : [{ text: ' ', options: {} }];
    slide.addText(runs, {
      x: o.x + padX + gutter, y, w: o.w - 2 * padX - gutter, h: lh,
      fontFace: MONO, fontSize: size, color: CODE_COL.base, margin: 0, valign: 'middle', isTextBox: true, fit: 'none',
    });
  });
  return { lineY: (n) => lineY[n], bottom: y0 + rows.length * lh, size, rows: rows.length };
}

// "逐行看懂" explanations next to a code block. items: {line, text} or {tag, text}.
// When `block` is given, each note is placed level with its line (pushed down to avoid overlaps).
function explain(slide, block, o) {
  const size = o.size || 12;
  let y = o.y ?? (o.title ? G.top : G.top);
  if (o.title) {
    text(slide, o.title, { x: o.x, y, w: o.w, h: 0.3, size: 13, bold: true, valign: 'middle' });
    y += 0.4;
  }
  const pillH = 0.24;
  for (const it of o.items) {
    const tag = it.tag || (Array.isArray(it.line) ? `第 ${it.line[0]}–${it.line[1]} 行` : `第 ${it.line} 行`);
    const tagW = textW(tag, 9.5) + 0.2;
    const want = block && it.line != null ? block.lineY(Array.isArray(it.line) ? it.line[0] : it.line) - pillH / 2 : y;
    if (want != null && !Number.isNaN(want)) y = Math.max(y, want);
    pill(slide, { x: o.x, y, w: tagW, h: pillH, text: tag, size: 9.5 });
    const tx = o.x + tagW + 0.1, tw = o.w - tagW - 0.1;
    const h = Math.max(pillH, textH(it.text, tw, size, 1.25));
    text(slide, it.text, { x: tx, y: y - 0.01, w: tw, h: h + 0.04, size, lineSpacingMultiple: 1.1 });
    y += h + (o.gap ?? 0.14);
  }
  if (o.maxY && y - (o.gap ?? 0.14) > o.maxY + 0.02) throw new Error(`explain(): notes overflow (${y.toFixed(2)} > ${o.maxY}); shorten text or move notes`);
  return y;
}

// Mock serial monitor window.
function serialMonitor(slide, o) {
  card(slide, { x: o.x, y: o.y, w: o.w, h: o.h, fill: P.white, line: P.gray2, radius: 0.1 });
  slide.addShape('rect', { x: o.x + 0.01, y: o.y + 0.01, w: o.w - 0.02, h: 0.32, fill: { color: P.card }, line: { color: P.card, width: 0 } });
  text(slide, o.title || '串口监视器', { x: o.x + 0.14, y: o.y + 0.03, w: o.w / 2, h: 0.28, size: 10, bold: true, valign: 'middle' });
  text(slide, `${o.baud || 9600} 波特率`, { x: o.x + o.w / 2, y: o.y + 0.03, w: o.w / 2 - 0.14, h: 0.28, size: 10, color: P.muted, align: 'right', valign: 'middle' });
  const size = o.size || 10.5;
  const lh = size * 1.32 / 72;
  const maxRows = Math.floor((o.h - 0.45) / lh);
  const lines = o.lines.slice(0, maxRows);
  text(slide, lines.join('\n'), { x: o.x + 0.16, y: o.y + 0.42, w: o.w - 0.3, h: o.h - 0.5, size, mono: true, color: P.ink, lineSpacingMultiple: 1.0 });
}

// Horizontal process / step flow. items: {title, sub}
function steps(slide, o) {
  const n = o.items.length;
  const gap = o.gap ?? 0.35;
  const w = (o.w - gap * (n - 1)) / n;
  o.items.forEach((it, i) => {
    const x = o.x + i * (w + gap);
    card(slide, { x, y: o.y, w, h: o.h, fill: it.fill || (i === o.focus ? P.turq : P.card) });
    numCircle(slide, it.n ?? i + 1, { x: x + 0.16, y: o.y + 0.16, d: 0.38, fill: i === o.focus ? P.ink : P.turq, color: i === o.focus ? P.white : P.ink, size: 12 });
    text(slide, it.title, { x: x + 0.16, y: o.y + 0.64, w: w - 0.32, h: 0.34, size: o.titleSize || 14, bold: true, valign: 'middle', mono: it.mono });
    if (it.sub) text(slide, it.sub, { x: x + 0.16, y: o.y + 1.0, w: w - 0.32, h: o.h - 1.1, size: o.subSize || 12, color: i === o.focus ? P.ink : P.muted });
    if (i < n - 1) arrow(slide, x + w + 0.06, o.y + o.h / 2, x + w + gap - 0.06, o.y + o.h / 2, { color: P.muted });
  });
}

// Fraction / formula: lhs  num/den  rhs, vertically centred on y+h/2.
function formula(slide, o) {
  const size = o.size || 20;
  const cy = o.y + (o.h || 0.9) / 2;
  const lh = size / 72 * 1.25;
  let x = o.x;
  const put = (t, w, y, opts = {}) => text(slide, t, { x, y, w, h: lh, size, align: 'center', valign: 'middle', ...opts });
  if (o.lhs) { const w = textW(o.lhs, size) + 0.1; put(o.lhs, w, cy - lh / 2); x += w + 0.06; }
  const fw = Math.max(textW(o.num, size), textW(o.den, size)) + 0.2;
  put(o.num, fw, cy - lh - 0.03);
  slide.addShape('line', { x, y: cy, w: fw, h: 0, line: { color: P.ink, width: 1.25 } });
  put(o.den, fw, cy + 0.03);
  x += fw + 0.06;
  if (o.rhs) { const w = textW(o.rhs, size) + 0.1; put(o.rhs, w, cy - lh / 2); x += w; }
  return x;
}

// ---------------------------------------------------------------- deck
async function patchTheme(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const part = 'ppt/theme/theme1.xml';
  let xml = await zip.file(part).async('string');
  const SLOTS = ['dk1', 'lt1', 'dk2', 'lt2', 'accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6', 'hlink', 'folHlink'];
  const scheme = `<a:clrScheme name="${THEME.name}">` + SLOTS.map((k) => `<a:${k}><a:srgbClr val="${THEME.colors[k]}"/></a:${k}>`).join('') + '</a:clrScheme>';
  xml = xml.replace(/<a:clrScheme\b[\s\S]*?<\/a:clrScheme>/, () => scheme)
    .replace(/(<a:(?:theme|fontScheme)\b[^>]*?\bname=")[^"]*"/g, (_, h) => `${h}${THEME.name}"`)
    .replace(/(<a:(?:majorFont|minorFont)>[\s\S]*?)<a:ea typeface="[^"]*"\s*\/>/g, (_, h) => `${h}<a:ea typeface="${FONT}"/>`);
  zip.file(part, xml);
  for (const name of Object.keys(zip.files)) {
    if (!name.endsWith('.xml')) continue;
    const bad = (await zip.file(name).async('string')).match(/<a:srgbClr val="((?![0-9A-Fa-f]{6}")[^"]*)"/);
    if (bad) throw new Error(`${name}: invalid color "${bad[1]}"`);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
}

class Deck {
  static async create(o) {
    const d = new Deck();
    await d.init(o);
    return d;
  }

  async init(o) {
    await loadArt();
    this.label = o.label;
    const pres = this.pres = new pptxgen();
    pres.layout = 'LAYOUT_16x9';
    pres.theme = { headFontFace: FONT, bodyFontFace: FONT };
    pres.title = o.title || o.label;
    pres.author = o.author || '湖北工业大学 · 工业设计学院';
    pres.subject = o.subject || 'Arduino 编程';
    pres.company = '湖北工业大学 · 工业设计学院';
    this.curSection = null;
    this.icons = {};
    const esc = (s) => String(s).replace(/&/g, '&amp;');
    // pptxgenjs mutates option objects in place, so every layout gets fresh copies.
    const footMark = () => ({ image: { x: G.L, y: 5.2, w: 0.2, h: 0.2, data: ART.cube } });
    const footLabel = () => ({ text: { text: esc(o.label), options: { x: G.L + 0.3, y: 5.18, w: 4.2, h: 0.24, fontFace: FONT, fontSize: 8, color: P.ink, margin: 0, valign: 'middle' } } });
    const footRight = () => ({ placeholder: { options: { name: 'foot', type: 'body', x: 5.0, y: 5.18, w: 4.05, h: 0.24, fontFace: FONT, fontSize: 8, color: P.ink, align: 'right', margin: 0, valign: 'middle' }, text: '' } });
    const slideNumber = () => ({ x: 9.12, y: 5.18, w: 0.43, h: 0.24, fontFace: FONT, fontSize: 8, color: P.muted, align: 'right', valign: 'middle', margin: 0 });

    pres.defineSlideMaster({
      title: 'COVER',
      background: { color: P.turq },
      objects: [
        { image: { x: 0.5, y: 3.55, w: 1.45, h: 1.45, data: ART.cluster } },
        { placeholder: { options: { name: 'kicker', type: 'body', x: 0.55, y: 0.45, w: 8.9, h: 0.3, fontFace: FONT, fontSize: 11, color: P.ink, margin: 0, valign: 'middle' }, text: '' } },
        { placeholder: { options: { name: 'title', type: 'title', x: 0.55, y: 0.95, w: 8.9, h: 0.95, fontFace: FONT, fontSize: 40, bold: true, color: P.ink, align: 'left', margin: 0, valign: 'middle' }, text: '' } },
        { placeholder: { options: { name: 'subtitle', type: 'body', x: 0.55, y: 1.9, w: 8.9, h: 0.8, fontFace: FONT, fontSize: 28, color: P.ink, margin: 0, valign: 'top' }, text: '' } },
        { placeholder: { options: { name: 'meta', type: 'body', x: 4.6, y: 4.45, w: 4.9, h: 0.6, fontFace: FONT, fontSize: 10, color: P.ink, align: 'right', margin: 0, valign: 'bottom' }, text: '' } },
      ],
    });
    pres.defineSlideMaster({
      title: 'SECTION',
      background: { color: P.white },
      objects: [
        footMark(), footLabel(), footRight(),
        { placeholder: { options: { name: 'kicker', type: 'body', x: G.L, y: 0.42, w: 3.7, h: 0.3, fontFace: FONT, fontSize: 11, color: P.muted, margin: 0, valign: 'middle' }, text: '' } },
        { placeholder: { options: { name: 'title', type: 'title', x: G.L, y: 0.78, w: 3.7, h: 1.2, fontFace: FONT, fontSize: 28, color: P.ink, align: 'left', margin: 0, valign: 'top' }, text: '' } },
        { placeholder: { options: { name: 'desc', type: 'body', x: G.L, y: 2.05, w: 3.55, h: 2.6, fontFace: FONT, fontSize: 12, color: P.ink, margin: 0, valign: 'top', lineSpacingMultiple: 1.3 }, text: '' } },
      ],
      slideNumber: slideNumber(),
    });
    pres.defineSlideMaster({
      title: 'CONTENT',
      background: { color: P.white },
      objects: [
        footMark(), footLabel(), footRight(),
        { placeholder: { options: { name: 'title', type: 'title', x: G.L, y: 0.3, w: G.cw, h: 0.55, fontFace: FONT, fontSize: SIZE.title, color: P.ink, align: 'left', margin: 0, valign: 'middle' }, text: '' } },
        { placeholder: { options: { name: 'desc', type: 'body', x: G.L, y: 0.86, w: G.cw, h: 0.36, fontFace: FONT, fontSize: SIZE.desc, color: P.muted, margin: 0, valign: 'top' }, text: '' } },
      ],
      slideNumber: slideNumber(),
    });
    pres.defineSlideMaster({
      title: 'END',
      background: { color: P.turq },
      objects: [
        { image: { x: 0.5, y: 3.55, w: 1.45, h: 1.45, data: ART.cluster } },
        { placeholder: { options: { name: 'title', type: 'title', x: 0.55, y: 1.2, w: 8.9, h: 1.0, fontFace: FONT, fontSize: 34, bold: true, color: P.ink, align: 'left', margin: 0, valign: 'middle' }, text: '' } },
        { placeholder: { options: { name: 'subtitle', type: 'body', x: 0.55, y: 2.25, w: 8.9, h: 1.0, fontFace: FONT, fontSize: 16, color: P.ink, margin: 0, valign: 'top' }, text: '' } },
      ],
    });
  }

  // Load icons once: deck.loadIcons({bulb:'FaLightbulb'}) -> deck.icons.bulb (charcoal) / deck.icons.bulb_w (white)
  async loadIcons(map) {
    for (const [k, name] of Object.entries(map)) {
      this.icons[k] = await icon(name, P.ink);
      this.icons[k + '_w'] = await icon(name, P.white);
    }
    return this.icons;
  }

  section(title) {
    this.pres.addSection({ title });
    this.curSection = title;
  }

  _add(master, footer) {
    const s = this.pres.addSlide({ masterName: master, sectionTitle: this.curSection || undefined });
    if (master === 'SECTION' || master === 'CONTENT') s.addText(footer || this.curSection || this.label, { placeholder: 'foot' });
    return s;
  }

  cover(o) {
    const s = this._add('COVER');
    s.addText(o.kicker || '', { placeholder: 'kicker' });
    s.addText(o.title, { placeholder: 'title' });
    s.addText(o.subtitle || '', { placeholder: 'subtitle' });
    s.addText(o.meta || '湖北工业大学 · 工业设计学院', { placeholder: 'meta' });
    if (o.notes) s.addNotes(o.notes);
    return s;
  }

  // Section divider: left title/desc, right 2x2 tiles (items as in tiles()).
  divider(o) {
    const s = this._add('SECTION', o.footer);
    s.addText(o.kicker || '', { placeholder: 'kicker' });
    s.addText(o.title, { placeholder: 'title' });
    s.addText(o.desc || '', { placeholder: 'desc' });
    if (o.tiles) tiles(s, { x: 4.55, y: 0.38, w: 5.0, h: 4.62, cols: 2, items: o.tiles });
    if (o.notes) s.addNotes(o.notes);
    return s;
  }

  slide(o) {
    const s = this._add('CONTENT', o.footer);
    s.addText(o.title, { placeholder: 'title' });
    s.addText(o.desc || ' ', { placeholder: 'desc' });
    if (o.notes) s.addNotes(o.notes);
    return s;
  }

  end(o) {
    const s = this._add('END');
    s.addText(o.title, { placeholder: 'title' });
    s.addText(o.subtitle || '', { placeholder: 'subtitle' });
    if (o.notes) s.addNotes(o.notes);
    return s;
  }

  async save(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await this.pres.writeFile({ fileName: file });
    await patchTheme(file);
    return file;
  }
}

module.exports = {
  P, FONT, MONO, THEME, SIZE, G, Deck,
  text, card, pill, tags, iconCircle, numCircle, arrow, bullets,
  imageBox, placeImage, imgSize, tiles, table, wiring, tip, codeBlock, explain, serialMonitor, steps, formula,
  textW, textH, monoW, icon,
};
