# -*- coding: utf-8 -*-
"""以清洁版为底，比对原稿，逐段精确高亮改动文字；文末追加修改清单。"""
import re, json, zipfile, difflib, shutil, os
import lib, tmpl, tbl

HL = '<w:highlight w:val="yellow"/>'
CITE = re.compile(r'\[\d+(?:[,\-]\d+)*\]')

def texts(path):
    x = zipfile.ZipFile(path).read('word/document.xml').decode('utf-8')
    P = re.compile(r'<w:p(?: [^>]*)?>.*?</w:p>|<w:p(?: [^>]*)?/>', re.S)
    T = re.compile(r'<w:t(?: [^>]*)?>(.*?)</w:t>', re.S)
    return [''.join(T.findall(m.group(0))) for m in P.finditer(x)]

base = texts('base.docx')
shutil.rmtree('unpacked', ignore_errors=True)
os.system('unzip -o -q clean.docx -d unpacked')
d = lib.load()
cur = [p['text'] for p in lib.paras(d)]

sm = difflib.SequenceMatcher(None, base, cur, autojunk=False)
targets = {}                     # 段落索引 -> [(改动起, 改动止)]
for tag, i1, i2, j1, j2 in sm.get_opcodes():
    if tag == 'equal': continue
    if tag == 'insert':
        for j in range(j1, j2):
            if cur[j].strip(): targets[j] = [(0, len(cur[j]))]
    elif tag == 'replace':
        for k in range(max(i2 - i1, j2 - j1)):
            bi, cj = i1 + k, j1 + k
            if cj >= j2: break
            if not cur[cj].strip(): continue
            if bi < i2:
                s = difflib.SequenceMatcher(None, base[bi], cur[cj], autojunk=False)
                rng = [(b1, b2) for t, a1, a2, b1, b2 in s.get_opcodes() if t != 'equal' and b2 > b1]
                targets[cj] = rng or [(0, len(cur[cj]))]
            else:
                targets[cj] = [(0, len(cur[cj]))]

def build(pxml, text, hl_ranges):
    rpr = tmpl._first_rpr(pxml); ppr = tmpl._ppr(pxml)
    sup = tmpl.sup_rpr(rpr)
    hl  = rpr.replace('</w:rPr>', HL + '</w:rPr>') if rpr else '<w:rPr>' + HL + '</w:rPr>'
    suphl = sup.replace('</w:rPr>', HL + '</w:rPr>')
    cuts = {0, len(text)}
    for a, b in hl_ranges: cuts |= {max(0, a), min(len(text), b)}
    for m in CITE.finditer(text): cuts |= {m.start(), m.end()}
    pts = sorted(cuts)
    parts = []
    for a, b in zip(pts, pts[1:]):
        if a >= b: continue
        seg = text[a:b]
        is_sup = any(m.start() <= a and b <= m.end() for m in CITE.finditer(text))
        is_hl  = any(x <= a and b <= y for x, y in hl_ranges)
        r = suphl if (is_sup and is_hl) else sup if is_sup else hl if is_hl else rpr
        parts.append(f'<w:r>{r}<w:t xml:space="preserve">{tmpl.esc(seg)}</w:t></w:r>')
    return f'<w:p>{ppr}{"".join(parts)}</w:p>'

ps = lib.paras(d); n = 0
for j in sorted(targets, reverse=True):
    if j >= len(ps): continue
    p = ps[j]
    if '<w:tbl>' in p['xml']: continue
    d = d[:p['s']] + build(p['xml'], p['text'], targets[j]) + d[p['e']:]
    ps = lib.paras(d); n += 1
while re.search(r'&amp;(?:lt|gt|amp);', d):
    d = d.replace('&amp;lt;', '&lt;').replace('&amp;gt;', '&gt;').replace('&amp;amp;', '&amp;')
lib.save(d)
print(f'高亮段落 {n} 个')

# ── 文末追加修改清单 ──
LOG = json.load(open('log.json'))
d = lib.load(); T = tmpl.templates(d)
def cap(t):
    x = tmpl.make_para(T['body'], t).replace('<w:ind w:firstLine="480"/>', '')
    return x.replace('<w:jc w:val="both"/>', '<w:jc w:val="center"/>')
out = ['<w:p><w:r><w:br w:type="page"/></w:r></w:p>', tmpl.make_para(T['h1'], '附：本次修订清单')]
out.append(tmpl.make_para(T['body'],
  '本清单逐条列出本次修订的内容。正文中凡经改动之处均以黄色底纹标出，可对照查阅。'
  '涉及标题层级、目录同步与表格格式的改动无法在正文中以底纹呈现，仅列于本清单。'))
rows = [[str(i+1), e['cat'], (e['where'] or '')[:30],
         (str(e['before']) or '')[:140], (str(e['after']) or '')[:140], e['why'][:150]]
        for i, e in enumerate(LOG)]
out.append(cap('附表  修订清单'))
out.append(tbl.make_table(['序号','类别','位置','原文','改后','修订理由'], rows,
                          [500, 900, 1500, 2100, 2100, 1396],
                          aligns=['center','center','left','left','left','left']))
d = d[:d.rindex('<w:sectPr', 0, d.rindex('</w:body>'))] + ''.join(out) + d[d.rindex('<w:sectPr', 0, d.rindex('</w:body>')):]
lib.save(d)
print(f'修订清单 {len(LOG)} 条已附于文末')
