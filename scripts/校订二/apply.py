# -*- coding: utf-8 -*-
import re, sys, json, lib, tmpl, fixes
HASDRAW = re.compile(r'<w:(?:drawing|pict|object)[ >]|<mc:AlternateContent[ >]')

MODE = sys.argv[1] if len(sys.argv) > 1 else 'clean'   # clean | annot
HL = '<w:highlight w:val="yellow"/>'
LOG = []

d = lib.load()

def note(cat, where, before, after, why):
    LOG.append(dict(cat=cat, where=where, before=before, after=after, why=why))

# ══ 1. 转义缺陷：&amp;lt; → &lt; 迭代收敛 ══
n0 = len(re.findall(r'&amp;(?:lt|gt|amp);', d))
while re.search(r'&amp;(?:lt|gt|amp);', d):
    d = d.replace('&amp;lt;', '&lt;').replace('&amp;gt;', '&gt;').replace('&amp;amp;', '&amp;')
if n0:
    note('转义', '4.2.3节等', 'p&amp;lt;0.001（Word中显示为字面 &lt;）', 'p<0.001',
         f'共{n0}处多重转义，Word中会显示为字面的“&lt;”而非小于号')
lib.save(d)

# ══ 2. 文本类修改（含引注、缺引用、中文文献）══
def sub_text(old, new, why, cat, hl_new=True):
    """在包含 old 的段落内做子串替换；annot 模式下将新文字高亮。"""
    global d
    ps = lib.paras(d)
    tgt = next((p for p in ps if old in p['text'] and not HASDRAW.search(p['xml'])), None)
    if tgt is None:
        note('!! 未命中', old[:40], old[:60], '', why); return False
    txt = tgt['text']
    if MODE == 'annot' and hl_new:
        i = txt.find(old)
        pre, post = txt[:i], txt[i+len(old):]
        rpr = tmpl._first_rpr(tgt['xml']); ppr = tmpl._ppr(tgt['xml'])
        hrpr = (rpr.replace('</w:rPr>', HL + '</w:rPr>') if rpr
                else '<w:rPr>' + HL + '</w:rPr>')
        parts = []
        if pre:  parts.append(f'<w:r>{rpr}<w:t xml:space="preserve">{tmpl.esc(pre)}</w:t></w:r>')
        if new:  parts.append(f'<w:r>{hrpr}<w:t xml:space="preserve">{tmpl.esc(new)}</w:t></w:r>')
        if post: parts.append(f'<w:r>{rpr}<w:t xml:space="preserve">{tmpl.esc(post)}</w:t></w:r>')
        newxml = f'<w:p>{ppr}{"".join(parts)}</w:p>'
    else:
        newxml = tmpl.rebuild_with_sups(tgt['xml'], txt.replace(old, new), [])
    d = d[:tgt['s']] + newxml + d[tgt['e']:]
    note(cat, txt[:26] + '…', old, new, why)
    return True

for cat, loc, old, new, why in (fixes.TEXT_FIX + fixes.CITE_FIX +
                                fixes.QMARK_FIX + fixes.NEW_CITE):
    sub_text(old, new, why, cat)
lib.save(d)

# ══ 3. 引注全量重编号（新增文献按首次出现顺序插入）══
ps = lib.paras(d)
ri = next(i for i, p in enumerate(ps) if p['text'].strip() == '参考文献')
ai = next(i for i, p in enumerate(ps) if p['text'].strip() == '附录')
oldrefs = {}
refidx = []
for i in range(ri, ai):
    m = re.match(r'^\[(\d+)\]\s*(.+)$', ps[i]['text'].strip())
    if m:
        oldrefs[int(m.group(1))] = m.group(2); refidx.append(i)

MARK = re.compile(r'\[(\d+(?:[,\-]\d+)*)\]|\{\{(N\d)\}\}')
def expand(g):
    if g[1]: return [g[1]]
    out = []
    for part in g[0].split(','):
        if '-' in part:
            a, b = part.split('-'); out += list(range(int(a), int(b) + 1))
        else: out.append(int(part))
    return out

num, order = {}, []
plan = []
for i, p in enumerate(ps):
    if ri <= i < ai: continue
    t = p['text']
    if not MARK.search(t): continue
    if HASDRAW.search(p['xml']):
        note('!! 含图段落有引注', t[:40], '', '', '该段落含图片，未重建以免丢图'); continue
    marks, clean, last = [], [], 0
    for m in MARK.finditer(t):
        clean.append(t[last:m.start()])
        pos = sum(len(c) for c in clean)
        keys = expand((m.group(1), m.group(2)))
        for k in keys:
            if k not in num:
                num[k] = len(order) + 1; order.append(k)
        marks.append((pos, keys))
        last = m.end()
    clean.append(t[last:])
    plan.append((i, ''.join(clean), marks))

def fmt(keys):
    ns = sorted(num[k] for k in keys)
    out, i = [], 0
    while i < len(ns):
        j = i
        while j + 1 < len(ns) and ns[j+1] == ns[j] + 1: j += 1
        out.append(str(ns[i]) if j == i else f'{ns[i]}-{ns[j]}')
        i = j + 1
    return '[' + ','.join(out) + ']'

for i, clean, marks in reversed(plan):
    p = ps[i]
    d = d[:p['s']] + tmpl.rebuild_with_sups(p['xml'], clean, [(pos, fmt(k)) for pos, k in marks]) + d[p['e']:]
    ps = lib.paras(d)

# 重排参考文献表
newlist = [(fixes.NEW_REFS[k] if isinstance(k, str) else oldrefs[k]) for k in order]
ps = lib.paras(d)
ri = next(i for i, p in enumerate(ps) if p['text'].strip() == '参考文献')
ai = next(i for i, p in enumerate(ps) if p['text'].strip() == '附录')
refidx = [i for i in range(ri, ai) if re.match(r'^\[\d+\]\s', ps[i]['text'].strip())]
tmplxml = ps[refidx[0]]['xml']
for k, i in enumerate(reversed(refidx)):
    idx = len(refidx) - 1 - k
    if idx < len(newlist):
        d = d[:ps[i]['s']] + tmpl.rebuild_with_sups(ps[i]['xml'], f'[{idx+1}] {newlist[idx]}', []) + d[ps[i]['e']:]
        ps = lib.paras(d)
if len(newlist) > len(refidx):
    ps = lib.paras(d)
    last = [i for i in range(len(ps)) if re.match(r'^\[\d+\]\s', ps[i]['text'].strip())][-1]
    add = ''.join(tmpl.make_para(tmplxml, f'[{n+1}] {newlist[n]}')
                  for n in range(len(refidx), len(newlist)))
    add = add.replace('<w:ind w:firstLine="480"/>', '')
    d = d[:ps[last]['e']] + add + d[ps[last]['e']:]
note('参考文献', '参考文献表', f'{len(oldrefs)}条', f'{len(newlist)}条',
     f'新增中文国家标准{len(fixes.NEW_REFS)}条，并按首次出现顺序对全部引注重新编号')
lib.save(d)
json.dump({'order': [str(k) for k in order]}, open('order.json', 'w'), ensure_ascii=False)
json.dump(LOG, open('log.json', 'w'), ensure_ascii=False)
print(f'[{MODE}] 引注重编号完成：{len(order)} 条')
