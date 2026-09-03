# -*- coding: utf-8 -*-
import re, lib, tmpl, refs

d = lib.load()
ps = lib.paras(d)

# 1) 按正文出现顺序定位锚点
located = []
missing = []
for anchor, keys in refs.CITES:
    hit = None
    for i, p in enumerate(ps):
        j = p['text'].find(anchor)
        if j >= 0:
            hit = (i, j + len(anchor), keys, anchor); break
    if hit: located.append(hit)
    else:   missing.append(anchor)

located.sort(key=lambda x: (x[0], x[1]))

# 2) 首次出现顺序编号
num, order = {}, []
for _, _, keys, _ in located:
    for k in keys:
        if k not in num:
            num[k] = len(order) + 1
            order.append(k)

def fmt(keys):
    ns = sorted(num[k] for k in keys)
    # 连续区间折叠为 a-b
    out, i = [], 0
    while i < len(ns):
        j = i
        while j + 1 < len(ns) and ns[j+1] == ns[j] + 1: j += 1
        out.append(str(ns[i]) if j == i else f'{ns[i]}-{ns[j]}')
        i = j + 1
    return '[' + ','.join(out) + ']'

# 3) 按段落分组插入上标
bypara = {}
for i, pos, keys, _ in located:
    bypara.setdefault(i, []).append((pos, fmt(keys)))

for i in sorted(bypara, reverse=True):
    p = ps[i]
    newxml = tmpl.rebuild_with_sups(p['xml'], p['text'], bypara[i])
    d = d[:p['s']] + newxml + d[p['e']:]
    ps = lib.paras(d)

lib.save(d)
print(f'引注锚点命中 {len(located)} 处，覆盖文献 {len(order)} 条')
if missing:
    print('未命中锚点：')
    for m in missing: print('   ', m[:52])
import json
json.dump(order, open('ref_order.json','w'), ensure_ascii=False)
