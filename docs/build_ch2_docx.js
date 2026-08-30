const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, WidthType, HeadingLevel, BorderStyle, ShadingType,
} = require('docx');

const SRC = '/home/user/Ericzm214/docs/第2章-理论谱系-润色稿.md';
const OUT = '/home/user/Ericzm214/docs/第2章-理论谱系-润色稿.docx';

const CONTENT_W = 9026; // A4 (11906) - 2*1440 margins

const F_SONG = { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '宋体', cs: 'Times New Roman' };
const F_HEI  = { ascii: 'Times New Roman', hAnsi: 'Times New Roman', eastAsia: '黑体', cs: 'Times New Roman' };

// ---------- inline parsing: endnote superscripts + 待补 markers ----------
function runs(text, base = {}) {
  const out = [];
  // split on [n] endnote refs and 【...】 markers
  const re = /(\[\d{1,2}\])|(【[^】]*】)/g;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), font: F_SONG, size: 24, ...base }));
    if (m[1]) {
      out.push(new TextRun({ text: m[1], font: F_SONG, size: 24, superScript: true, ...base }));
    } else {
      out.push(new TextRun({ text: m[2], font: F_SONG, size: 24, color: 'C00000', ...base }));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), font: F_SONG, size: 24, ...base }));
  return out;
}

const body = (t) => new Paragraph({
  children: runs(t),
  alignment: AlignmentType.BOTH,
  indent: { firstLine: 480 },
  spacing: { line: 400, lineRule: 'auto', before: 0, after: 60 },
});

const heading = (t, level) => {
  const spec = {
    1: { size: 32, before: 480, after: 360, align: AlignmentType.CENTER, hl: HeadingLevel.HEADING_1 },
    2: { size: 28, before: 400, after: 220, align: AlignmentType.LEFT,   hl: HeadingLevel.HEADING_2 },
    3: { size: 24, before: 240, after: 160, align: AlignmentType.LEFT,   hl: HeadingLevel.HEADING_3 },
  }[level];
  return new Paragraph({
    children: [new TextRun({ text: t, font: F_HEI, size: spec.size, bold: level === 3 })],
    heading: spec.hl,
    alignment: spec.align,
    spacing: { line: 360, lineRule: 'auto', before: spec.before, after: spec.after },
  });
};

// caption line: 小五 (sz 18), centered, no indent
const caption = (t, isEn) => new Paragraph({
  children: [new TextRun({ text: t, font: isEn ? F_SONG : F_SONG, size: 18 })],
  alignment: AlignmentType.CENTER,
  spacing: { line: 300, lineRule: 'auto', before: 0, after: 0 },
});

const placeholder = (t) => new Paragraph({
  children: [new TextRun({ text: t, font: F_SONG, size: 24, color: '808080' })],
  alignment: AlignmentType.CENTER,
  spacing: { line: 400, lineRule: 'auto', before: 120, after: 120 },
});

const spacer = () => new Paragraph({ children: [new TextRun({ text: '', size: 18 })], spacing: { line: 200, lineRule: 'auto' } });

// ---------- table building (three-line style) ----------
function buildTable(rows) {
  const nCols = rows[0].length;
  const colW = Math.floor(CONTENT_W / nCols);
  const widths = Array(nCols).fill(colW);
  widths[nCols - 1] = CONTENT_W - colW * (nCols - 1);

  const noB = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const line = { style: BorderStyle.SINGLE, size: 6, color: '000000' };

  const trs = rows.map((cells, ri) => new TableRow({
    tableHeader: ri === 0,
    children: cells.map((c, ci) => new TableCell({
      width: { size: widths[ci], type: WidthType.DXA },
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      borders: {
        top: ri === 0 ? line : (ri === 1 ? line : noB),
        bottom: ri === rows.length - 1 ? line : noB,
        left: noB, right: noB,
      },
      children: [new Paragraph({
        children: [new TextRun({ text: c, font: F_SONG, size: 18, bold: ri === 0 })],
        alignment: ri === 0 ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { line: 280, lineRule: 'auto', before: 20, after: 20 },
      })],
    })),
  }));

  return new Table({
    columnWidths: widths,
    width: { size: CONTENT_W, type: WidthType.DXA },
    rows: trs,
  });
}

// ---------- parse markdown ----------
const raw = fs.readFileSync(SRC, 'utf8');
const blocks = raw.split(/\n{2,}/).map(b => b.replace(/\s+$/, '')).filter(b => b.trim() !== '');

const children = [];
for (const blk of blocks) {
  const lines = blk.split('\n').map(l => l.trim()).filter(l => l !== '');
  const first = lines[0];

  if (first.startsWith('>')) continue;                 // editorial note at top of md
  if (/^-{3,}$/.test(first)) continue;                 // horizontal rules

  if (first.startsWith('# ')) { children.push(heading(first.slice(2).trim(), 1)); continue; }
  if (first.startsWith('## ')) { children.push(heading(first.slice(3).trim(), 2)); continue; }
  if (first.startsWith('### ')) { children.push(heading(first.slice(4).trim(), 3)); continue; }

  if (first.startsWith('|')) {
    const rows = lines
      .filter(l => !/^\|[\s\-:|]+\|$/.test(l))
      .map(l => l.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()));
    children.push(buildTable(rows));
    children.push(spacer());
    continue;
  }

  if (/^［此处插入/.test(first)) { children.push(placeholder(first)); continue; }

  if (/^(表|图)2-\d/.test(first) && lines.length === 3) {
    if (first.startsWith('表')) {
      children.push(spacer());
      lines.forEach((l, i) => children.push(caption(l, i === 1)));
    } else {
      lines.forEach((l, i) => children.push(caption(l, i === 1)));
      children.push(spacer());
    }
    continue;
  }

  children.push(body(lines.join('')));
}

const doc = new Document({
  styles: {
    default: {
      document: { run: { font: F_SONG, size: 24 } },
    },
  },
  sections: [{
    properties: {
      page: {
        size: { width: 11906, height: 16838 },
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
      },
    },
    children,
  }],
});

Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(OUT, buf);
  console.log('written:', OUT, buf.length, 'bytes;', children.length, 'blocks');
});
