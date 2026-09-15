const fs = require('fs');
const d = require('docx');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  ExternalHyperlink, TableOfContents, LevelFormat, PageOrientation,
} = d;

const SRC = process.argv[2];
const OUT = process.argv[3];

// ---- page geometry (A4) -------------------------------------------------
const MARGIN = 1418;            // 2.5 cm
const CONTENT_W = 11906 - 2 * MARGIN;   // 9070 DXA

// ---- typography ---------------------------------------------------------
const CN = '微软雅黑';
const EN = 'Calibri';
const MONO = 'Consolas';
const FONT = { ascii: EN, hAnsi: EN, eastAsia: CN, cs: EN };
const FONT_MONO = { ascii: MONO, hAnsi: MONO, eastAsia: CN, cs: MONO };

const INK = '1A1A1A';
const MUTED = '6B6B6B';
const ACCENT = '1F4E79';   // deep blue
const LINK = '1155CC';
const RED = 'B03030';
const GREEN = '1E7A44';

// marker emoji -> typographic tags
const TAGS = {
  '🟢': { t: '［开放获取］', c: GREEN },
  '🔒': { t: '［需订阅］', c: MUTED },
  '⭐': { t: '［必读］', c: RED },
  '📐': { t: '［量表·方法］', c: ACCENT },
};

// -------------------------------------------------------------------------
// inline markdown -> array of TextRun / ExternalHyperlink
// -------------------------------------------------------------------------
function runs(text, base = {}, force = {}) {
  const out = [];
  text = text.replace(/️/g, '').replace(/⚠/g, '【注意】');

  // bold is non-greedy and may contain nested emphasis -> parsed recursively
  const re = /(\*\*[\s\S]+?\*\*)|(\*[^*\n]+\*)|(`[^`]+`)|(\[[^\]]*\]\([^)]+\))|([🟢🔒⭐📐])/gu;
  let last = 0, m;
  const plain = (s, extra = {}) => {
    if (!s) return;
    out.push(new TextRun({ text: s, font: FONT, color: INK, size: 21, ...base, ...extra, ...force }));
  };

  while ((m = re.exec(text)) !== null) {
    plain(text.slice(last, m.index));
    last = re.lastIndex;
    if (m[1]) {
      out.push(...runs(m[1].slice(2, -2), { ...base, bold: true }, force));
    } else if (m[2]) {
      out.push(...runs(m[2].slice(1, -1), { ...base, italics: true }, force));
    } else if (m[3]) {
      out.push(new TextRun({
        text: m[3].slice(1, -1), font: FONT_MONO, size: 19,
        color: ACCENT, ...base, ...force,
      }));
    } else if (m[4]) {
      const mm = /\[([^\]]*)\]\(([^)]+)\)/.exec(m[4]);
      out.push(new ExternalHyperlink({
        link: mm[2],
        children: [new TextRun({
          text: mm[1], font: FONT, size: 21, color: LINK, underline: {}, ...base,
          ...(force.size ? { size: force.size } : {}),
        })],
      }));
    } else if (m[5]) {
      const tag = TAGS[m[5]];
      if (!tag) { plain(m[5]); continue; }
      out.push(new TextRun({
        text: tag.t, font: FONT, size: 18, color: tag.c, bold: true, ...base,
        ...(force.size ? { size: Math.max(force.size - 3, 14) } : {}),
      }));
    }
  }
  plain(text.slice(last));
  return out.length ? out : [new TextRun({ text: '', font: FONT, size: 21, ...force })];
}

// -------------------------------------------------------------------------
// block helpers
// -------------------------------------------------------------------------
const hr = () => new Paragraph({
  spacing: { before: 200, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, space: 1, color: 'C8C8C8' } },
  children: [new TextRun({ text: '', size: 2 })],
});

function heading(text, level) {
  const cfg = {
    1: { size: 30, color: ACCENT, before: 0, after: 200, hl: HeadingLevel.HEADING_1 },
    2: { size: 27, color: ACCENT, before: 380, after: 160, hl: HeadingLevel.HEADING_2 },
    3: { size: 23, color: INK, before: 280, after: 120, hl: HeadingLevel.HEADING_3 },
    4: { size: 21, color: INK, before: 220, after: 100, hl: HeadingLevel.HEADING_4 },
  }[level];
  return new Paragraph({
    heading: cfg.hl,
    outlineLevel: level - 1,
    spacing: { before: cfg.before, after: cfg.after },
    keepNext: true,
    border: level === 2
      ? { bottom: { style: BorderStyle.SINGLE, size: 8, space: 4, color: ACCENT } }
      : undefined,
    children: runs(text, {}, { size: cfg.size, bold: true, color: cfg.color, font: FONT }),
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { before: 60, after: 60, line: 300 },
    alignment: AlignmentType.LEFT,
    ...opts,
    children: runs(text),
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'md-bullets', level },
    spacing: { before: 40, after: 40, line: 290 },
    children: runs(text),
  });
}

function numbered(text, level = 0) {
  return new Paragraph({
    numbering: { reference: 'md-numbers', level },
    spacing: { before: 40, after: 40, line: 290 },
    children: runs(text),
  });
}

function quote(lines) {
  return lines.map((t, i) => new Paragraph({
    spacing: { before: i === 0 ? 140 : 40, after: 40, line: 290 },
    indent: { left: 340, right: 200 },
    border: { left: { style: BorderStyle.SINGLE, size: 14, space: 10, color: ACCENT } },
    shading: { type: ShadingType.CLEAR, fill: 'F2F6FA' },
    children: runs(t),
  }));
}

// entry title line, e.g. **A1-1 ⭐🟢 Title** (2026, *Journal*)
function entryTitle(text) {
  return new Paragraph({
    spacing: { before: 240, after: 40, line: 290 },
    keepNext: true,
    border: { left: { style: BorderStyle.SINGLE, size: 12, space: 8, color: 'D0D7E0' } },
    indent: { left: 200 },
    children: runs(text),
  });
}

// DOI / link line under an entry
function metaLine(text) {
  return new Paragraph({
    spacing: { before: 20, after: 40, line: 280 },
    indent: { left: 200 },
    keepNext: true,
    children: runs(text, {}, { size: 19 }),
  });
}

// -------------------------------------------------------------------------
// table
// -------------------------------------------------------------------------
function makeTable(rowsRaw) {
  const cells = rowsRaw.map(r =>
    r.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
  const nCol = Math.max(...cells.map(r => r.length));
  cells.forEach(r => { while (r.length < nCol) r.push(''); });

  // weight columns by longest cell (CJK counts double)
  const w = (s) => [...s.replace(/\*\*|`/g, '')]
    .reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2E80 ? 2 : 1), 0);
  const weights = Array.from({ length: nCol }, (_, i) =>
    Math.min(Math.max(...cells.map(r => w(r[i] || ''))), 60) + 4);
  const total = weights.reduce((a, b) => a + b, 0);
  let widths = weights.map(x => Math.floor(CONTENT_W * x / total));
  widths[0] += CONTENT_W - widths.reduce((a, b) => a + b, 0);

  const rows = cells.map((r, ri) => new TableRow({
    tableHeader: ri === 0,
    children: r.map((c, ci) => new TableCell({
      width: { size: widths[ci], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: ri === 0 ? 'E8EEF5' : (ri % 2 ? 'FFFFFF' : 'FAFBFC') },
      margins: { top: 90, bottom: 90, left: 120, right: 120 },
      children: [new Paragraph({
        spacing: { before: 0, after: 0, line: 270 },
        children: runs(c, ri === 0 ? { bold: true } : {}, { size: 19 }),
      })],
    })),
  }));

  return new Table({
    columnWidths: widths,
    width: { size: CONTENT_W, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'B8C4D0' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'B8C4D0' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'B8C4D0' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'B8C4D0' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'D8DEE5' },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'D8DEE5' },
    },
    rows,
  });
}

// -------------------------------------------------------------------------
// parse
// -------------------------------------------------------------------------
const lines = fs.readFileSync(SRC, 'utf8').split(/\r?\n/);
const children = [];
let i = 0;
let seenTitle = false;

const isEntry = (t) => /^\*\*[A-D][0-9]?-[0-9]+\b/.test(t);
const isMeta = (t) => /^(DOI:|\[)/.test(t) || /^https?:\/\//.test(t);

while (i < lines.length) {
  let L = lines[i];
  const t = L.trim();

  if (t === '') { i++; continue; }

  // horizontal rule
  if (/^-{3,}$/.test(t)) { children.push(hr()); i++; continue; }

  // heading
  let hm = /^(#{1,4})\s+(.*)$/.exec(t);
  if (hm) {
    const lvl = hm[1].length;
    children.push(heading(hm[2], lvl));
    if (lvl === 1 && !seenTitle) {
      seenTitle = true;
      children.push(new Paragraph({
        spacing: { before: 120, after: 120 },
        children: [new TextRun({
          text: '提示：本文档含自动目录。在 Word 中按 Ctrl+A 全选后按 F9（Mac：Cmd+A 后 fn+F9），选择「更新整个目录」即可生成页码。',
          font: FONT, size: 18, color: MUTED, italics: true,
        })],
      }));
      children.push(new TableOfContents('目录', { hyperlinks: true, headingStyleRange: '1-3' }));
    }
    i++; continue;
  }

  // blockquote block
  if (/^>/.test(t)) {
    const buf = [];
    while (i < lines.length && /^\s*>/.test(lines[i])) {
      const c = lines[i].replace(/^\s*>\s?/, '').trim();
      if (c !== '') buf.push(c);
      i++;
    }
    children.push(...quote(buf));
    continue;
  }

  // table block
  if (/^\|/.test(t)) {
    const buf = [];
    while (i < lines.length && /^\s*\|/.test(lines[i])) {
      const r = lines[i].trim();
      if (!/^\|[\s:|-]+\|$/.test(r)) buf.push(r);   // drop separator row
      i++;
    }
    children.push(makeTable(buf));
    children.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: '', size: 2 })] }));
    continue;
  }

  // bullet list item (supports one nesting level via leading spaces)
  let bm = /^(\s*)[-*]\s+(.*)$/.exec(L);
  if (bm) {
    children.push(bullet(bm[2], Math.min(Math.floor(bm[1].length / 2), 2)));
    i++; continue;
  }

  // numbered list item
  let nm = /^(\s*)\d+\.\s+(.*)$/.exec(L);
  if (nm) {
    children.push(numbered(nm[2], Math.min(Math.floor(nm[1].length / 3), 2)));
    i++; continue;
  }

  // entry title + its meta line
  if (isEntry(t)) {
    children.push(entryTitle(t));
    i++;
    while (i < lines.length && lines[i].trim() !== '' && isMeta(lines[i].trim())) {
      children.push(metaLine(lines[i].trim()));
      i++;
    }
    continue;
  }

  children.push(body(t));
  i++;
}

// -------------------------------------------------------------------------
// document
// -------------------------------------------------------------------------
const doc = new Document({
  creator: '文献库 v1.0',
  title: '长江文化 × 游戏化文化传播 × AI文化IP · 固定文献库',
  description: '按研究功能分类的 106 条文献及入选理由',
  styles: {
    default: {
      document: { run: { font: FONT, size: 21, color: INK }, paragraph: { spacing: { line: 300 } } },
      heading1: { run: { font: FONT, size: 34, bold: true, color: ACCENT } },
      heading2: { run: { font: FONT, size: 27, bold: true, color: ACCENT } },
      heading3: { run: { font: FONT, size: 23, bold: true, color: INK } },
      heading4: { run: { font: FONT, size: 21, bold: true, color: INK } },
    },
  },
  numbering: {
    config: [
      {
        reference: 'md-bullets',
        levels: [0, 1, 2].map(l => ({
          level: l,
          format: LevelFormat.BULLET,
          text: ['●', '○', '▪'][l],
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 340 + l * 340, hanging: 240 } } },
        })),
      },
      {
        reference: 'md-numbers',
        levels: [0, 1, 2].map(l => ({
          level: l,
          format: [LevelFormat.DECIMAL, LevelFormat.LOWER_LETTER, LevelFormat.LOWER_ROMAN][l],
          text: [`%1.`, `%2)`, `%3.`][l],
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 340 + l * 340, hanging: 240 } } },
        })),
      },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { orientation: PageOrientation.PORTRAIT },
        margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
      },
    },
    footers: {
      default: new d.Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: '', font: FONT, size: 17, color: MUTED }),
            new TextRun({ children: [d.PageNumber.CURRENT], font: FONT, size: 17, color: MUTED }),
            new TextRun({ text: ' / ', font: FONT, size: 17, color: MUTED }),
            new TextRun({ children: [d.PageNumber.TOTAL_PAGES], font: FONT, size: 17, color: MUTED }),
          ],
        })],
      }),
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log('wrote', OUT, buf.length, 'bytes;', children.length, 'blocks');
});
