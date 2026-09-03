# -*- coding: utf-8 -*-
"""统一引注环节：同时处理正文锚点与新增内容中的 {{key}} 占位符，
按正文首次出现顺序编号，输出上标引注。"""
import re, json, lib, tmpl, refs

PH = re.compile(r'\{\{([^}]+)\}\}')
d = lib.load()
ps = lib.paras(d)

num, order, missing_keys = {}, [], set()
def numbers(keys):
    for k in keys:
        if k not in refs.REFS:
            missing_keys.add(k); continue
        if k not in num:
            num[k] = len(order) + 1; order.append(k)
    ns = sorted(num[k] for k in keys if k in num)
    out, i = [], 0
    while i < len(ns):
        j = i
        while j + 1 < len(ns) and ns[j+1] == ns[j] + 1: j += 1
        out.append(str(ns[i]) if j == i else f'{ns[i]}-{ns[j]}')
        i = j + 1
    return '[' + ','.join(out) + ']'

# 已用锚点，避免同一锚点在多段重复命中
used_anchor = set()
plan = []          # (段落索引, 清洗后文本, [(位置, 标记)])
n_ph = n_anchor = 0

for i, p in enumerate(ps):
    text = p['text']
    if not text.strip():
        continue
    marks = []

    # 1) 占位符：先剥离，记录其在清洗后文本中的位置
    clean, last, ph_hits = [], 0, []
    for m in PH.finditer(text):
        clean.append(text[last:m.start()])
        ph_hits.append((sum(len(c) for c in clean), [k.strip() for k in m.group(1).split(',')]))
        last = m.end()
    clean.append(text[last:])
    clean = ''.join(clean)
    marks.extend(ph_hits)
    n_ph += len(ph_hits)

    # 2) 正文锚点
    for anchor, keys in refs.CITES:
        if anchor in used_anchor:
            continue
        j = clean.find(anchor)
        if j >= 0:
            used_anchor.add(anchor)
            marks.append((j + len(anchor), keys))
            n_anchor += 1

    if marks:
        marks.sort(key=lambda x: x[0])
        plan.append((i, clean, [(pos, numbers(keys)) for pos, keys in marks]))

# 3) 倒序重写，保持偏移有效
for i, clean, marks in reversed(plan):
    p = ps[i]
    d = d[:p['s']] + tmpl.rebuild_with_sups(p['xml'], clean, marks) + d[p['e']:]
    ps = lib.paras(d)

lib.save(d)
print(f'引注：占位符 {n_ph} 处，正文锚点 {n_anchor} 处，覆盖文献 {len(order)} 条')
un = [a for a, _ in refs.CITES if a not in used_anchor]
if un:
    print('未命中锚点：'); [print('   ', a[:50]) for a in un]
if missing_keys:
    print('!! 未定义的文献键:', missing_keys)
uncited = set(refs.REFS) - set(order)
if uncited:
    print('!! 未被引用的文献（顺序编码制下不应出现）:', uncited)
json.dump(order, open('ref_order.json','w'), ensure_ascii=False)
