# -*- coding: utf-8 -*-
import lib, tmpl
import content_b6 as C

d = lib.load()
applied, failed = 0, []

for old, new in C.EDITS:
    hits = [p for p in lib.paras(d) if old in p['text']]
    if not hits:
        failed.append(old[:46]); continue
    for _ in range(len(hits)):                      # 同一串若多处出现则逐处替换
        ps = lib.paras(d)
        tgt = next((p for p in ps if old in p['text']), None)
        if tgt is None: break
        nt = tgt['text'].replace(old, new)
        d = d[:tgt['s']] + tmpl.rebuild_with_sups(tgt['xml'], nt, []) + d[tgt['e']:]
        applied += 1

# 在 2.2 研究目标段之后插入慢行主体界定段
T = tmpl.templates(d)
ps = lib.paras(d)
anchor = next(p for p in ps if '因此，为解决以上研究问题，研究目标如下' in p['text'])
add = ''.join(tmpl.make_para(T['body'], t) for t in C.DEFINITION)
d = d[:anchor['e']] + add + d[anchor['e']:]

lib.save(d)
print(f'替换生效 {applied} 处；插入界定段 1 段')
if failed:
    print('!! 未命中：')
    for f in failed: print('   ', f)
