# -*- coding: utf-8 -*-
import re, lib, tmpl, tbl
import content_b4 as C

d = lib.load()

# ---------- 一、表号推移：表28及以后 +6（为4.4节新增的表28—表33让位）----------
pat = re.compile(r'表(\d+)')
def shift(m):
    n = int(m.group(1))
    return f'表{n+6}' if n >= 28 else m.group(0)
ps = lib.paras(d); n_shift = 0
for i in range(len(ps) - 1, -1, -1):
    p = ps[i]
    if not pat.search(p['text']): continue
    nt = pat.sub(shift, p['text'])
    if nt != p['text']:
        d = d[:p['s']] + tmpl.rebuild_with_sups(p['xml'], nt, []) + d[p['e']:]
        ps = lib.paras(d); n_shift += 1
print(f'表号推移的段落数: {n_shift}')

# ---------- 二、渲染 ----------
T = tmpl.templates(d)
def caption_para(t):
    x = tmpl.make_para(T['body'], t).replace('<w:ind w:firstLine="480"/>', '')
    return x.replace('<w:jc w:val="both"/>', '<w:jc w:val="center"/>')
def render(blocks):
    out = []
    for b in blocks:
        if b[0] == 'body': out.append(tmpl.make_para(T['body'], b[1]))
        elif b[0] == 'table':
            _, cap, header, rows, widths, aligns = b
            out.append(caption_para(cap))
            out.append(tbl.make_table(header, rows, widths, aligns=aligns))
            out.append('<w:p/>')
    return ''.join(out)

def insert_after(sub, blocks):
    global d
    ps = lib.paras(d)
    for i, p in enumerate(ps):
        if sub in p['text']:
            d = d[:p['e']] + render(blocks) + d[p['e']:]
            return
    raise RuntimeError('not found: ' + sub[:40])

# ---------- 三、插入（自后向前）----------
INSERTS = [
 ('行人对避险空间和路径安全性的主观感知也得到提升', C.QUANT),
 ('高于行业普遍认可的68分可用性阈值', C.USABILITY),
 ('图11 立面动态提示装置设计原型', C.SPEC),
 ('4.4.3高校共享道路安全引导系统设计与可用性评估', C.ITERATION),
 ('筛选出最优的设计组合方案', C.PRINCIPLES),
]
for anchor, blocks in INSERTS:
    insert_after(anchor, blocks)

lib.save(d)
print('批次4内容插入完成')
