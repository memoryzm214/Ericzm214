# -*- coding: utf-8 -*-
"""表格格式统一：表内字号、表题与表格前后间距。"""
import re, sys, json, os, lib, tmpl
MODE = sys.argv[1] if len(sys.argv) > 1 else 'clean'
LOG = json.load(open('log.json')) if os.path.exists('log.json') else []
def note(c, w, b, a, y): LOG.append(dict(cat=c, where=w, before=b, after=a, why=y))

d = lib.load()
SZ = '18'          # 小五 9pt：正文为小四12pt，表格小一级

# ── 表内字号统一 ──
cnt = {}
def uni_tbl(m):
    t = m.group(0)
    for tag in ('w:sz', 'w:szCs'):
        for mm in re.finditer(r'<' + tag + r' w:val="(\d+)"/>', t):
            if mm.group(1) != SZ: cnt[mm.group(1)] = cnt.get(mm.group(1), 0) + 1
        t = re.sub(r'<' + tag + r' w:val="\d+"/>', f'<{tag} w:val="{SZ}"/>', t)
    return t
d = re.sub(r'<w:tbl>.*?</w:tbl>', uni_tbl, d, flags=re.S)
if cnt:
    note('表格格式', '全文53个表格', '表内字号混用：' + '、'.join(f'{int(k)/2:g}pt×{v}处' for k, v in sorted(cnt.items())),
         f'统一为{int(SZ)/2:g}pt（小五）', '正文为小四12pt，表格文字统一小一级；原文档中新旧表格字号不一致')
lib.save(d)

# ── 间距工具 ──
def set_spacing(pxml, before=None, after=None, line=None):
    ppr = re.search(r'<w:pPr>.*?</w:pPr>', pxml, re.S)
    if not ppr:
        pxml = re.sub(r'(<w:p(?: [^>]*)?>)', r'\1<w:pPr></w:pPr>', pxml, count=1)
        ppr = re.search(r'<w:pPr>.*?</w:pPr>', pxml, re.S)
    body = ppr.group(0)
    new = body
    m = re.search(r'<w:spacing [^>]*/>', new)
    attrs = {}
    if m:
        attrs = dict(re.findall(r'(w:\w+)="([^"]*)"', m.group(0)))
        new = new.replace(m.group(0), '')
    if before is not None: attrs['w:before'] = str(before); attrs.pop('w:beforeLines', None); attrs.pop('w:beforeAutospacing', None)
    if after is not None:  attrs['w:after'] = str(after);  attrs.pop('w:afterLines', None);  attrs.pop('w:afterAutospacing', None)
    if line is not None:   attrs['w:line'] = str(line); attrs['w:lineRule'] = 'auto'
    sp = '<w:spacing ' + ' '.join(f'{k}="{v}"' for k, v in attrs.items()) + '/>'
    for anchor in ('<w:ind ', '<w:contextualSpacing', '<w:jc ', '<w:rPr>', '</w:pPr>'):
        i = new.find(anchor)
        if i >= 0:
            new = new[:i] + sp + new[i:]; break
    return pxml.replace(body, new)

CAP = re.compile(r'^(表|附表)\s?[\dA-G]')
ps = lib.paras(d)
bstart = ps[next(i for i, q in enumerate(ps) if q['style'] in ('2','3') and q['text'].strip() == '1研究背景及意义')]['s']
spans = [(m.start(), m.end()) for m in re.finditer(r'<w:tbl>.*?</w:tbl>', d, re.S)]
def in_tbl(pos): return any(a <= pos < b for a, b in spans)
n_cap = 0
for i in range(len(ps) - 1, -1, -1):
    p = ps[i]
    if p['s'] < bstart: continue          # 跳过目录区，其条目不属表题
    if in_tbl(p['s']): continue           # 跳过表格单元格内的段落
    if not CAP.match(p['text'].strip()): continue
    nx = set_spacing(p['xml'], before=120, after=60)      # 段前6pt 段后3pt
    if nx != p['xml']:
        d = d[:p['s']] + nx + d[p['e']:]; ps = lib.paras(d); n_cap += 1
note('表格格式', '全部表题段落', '表题与表格、正文之间的间距不一致',
     f'统一为段前6磅、段后3磅（共{n_cap}处）', '按你的要求统一表格与文字之间的间隔')
lib.save(d)

# ── 表格之后紧邻段落：加段前间距 ──
ps = lib.paras(d); n_aft = 0
tbl_end = [m.end() for m in re.finditer(r'</w:tbl>', d)]
for i in range(len(ps) - 1, -1, -1):
    p = ps[i]
    if not any(abs(p['s'] - e) < 3 for e in tbl_end): continue
    if not p['text'].strip(): continue
    nx = set_spacing(p['xml'], before=120)
    if nx != p['xml']:
        d = d[:p['s']] + nx + d[p['e']:]; n_aft += 1
        tbl_end = [m.end() for m in re.finditer(r'</w:tbl>', d)]
        ps = lib.paras(d)
note('表格格式', '表格后紧邻的段落', '表格与其后正文贴合，无间距',
     f'统一加段前6磅（共{n_aft}处）', '按你的要求统一表格与文字之间的间隔')
lib.save(d)
# ── 收尾：段落重建过程会把已转义文本再次转义，此处统一收敛 ──
n_esc = len(re.findall(r'&amp;(?:lt|gt|amp);', d))
while re.search(r'&amp;(?:lt|gt|amp);', d):
    d = d.replace('&amp;lt;', '&lt;').replace('&amp;gt;', '&gt;').replace('&amp;amp;', '&amp;')
if n_esc: lib.save(d)
print(f'  收尾转义收敛：{n_esc} 处')

json.dump(LOG, open('log.json', 'w'), ensure_ascii=False)
print(f'[{MODE}] 表格格式统一完成：字号 {sum(cnt.values())} 处、表题 {n_cap} 处、表后段落 {n_aft} 处')
