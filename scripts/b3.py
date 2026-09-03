# -*- coding: utf-8 -*-
import re, lib, tmpl, tbl
import content_b3 as C

d = lib.load()

# ---------- 一、表号推移：表6及以后 +1（为第3章新增的表6让位）----------
pat = re.compile(r'表(\d+)')
def shift(m):
    n = int(m.group(1))
    return f'表{n+1}' if n >= 6 else m.group(0)
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
        if b[0] == 'body':   out.append(tmpl.make_para(T['body'], b[1]))
        elif b[0] == 'h2':   out.append(tmpl.make_para(T['h2'], b[1]))
        elif b[0] == 'table':
            _, cap, header, rows, widths, aligns = b
            out.append(caption_para(cap))
            out.append(tbl.make_table(header, rows, widths, aligns=aligns))
            out.append('<w:p/>')
    return ''.join(out)

def para_index(sub):
    for i, p in enumerate(lib.paras(d)):
        if sub in p['text']: return i
    raise RuntimeError('not found: ' + sub[:36])

def insert_after(sub, blocks):
    global d
    ps = lib.paras(d); i = para_index(sub)
    d = d[:ps[i]['e']] + render(blocks) + d[ps[i]['e']:]

def replace_text(sub, old, new):
    global d
    ps = lib.paras(d); i = para_index(sub); p = ps[i]
    assert old in p['text'], old[:30]
    d = d[:p['s']] + tmpl.rebuild_with_sups(p['xml'], p['text'].replace(old, new), []) + d[p['e']:]

# ---------- 三、语境由市级上移至省级 ----------
replace_text('武汉市作为华中地区核心科教枢纽',
 '武汉市作为华中地区核心科教枢纽与长江中游高等教育资源富集地，拥有数量庞大、层次多元的高等院校集群，是我国高校密度与综合办学实力位居前列的城市之一。',
 '湖北省是我国高等教育大省，其省会武汉作为华中地区核心科教枢纽与长江中游高等教育资源富集地，拥有数量庞大、层次多元的高等院校集群，高校密度与综合办学实力位居全国前列。')
replace_text('研究场地选择湖北工业大学主校区为研究对象',
 '研究场地选择湖北工业大学主校区为研究对象', '研究场地选择湖北工业大学主校区作为典型案例')

# ---------- 四、插入（自后向前，避免锚点位移）----------
INSERTS = [
 ('同时，在技术深化层面，未来研究应探寻基于物联网', C.CH5_FUT + C.CH5_PROMO),
 ('此外，研究未对设计方案的实施成本、维护成本和成本效益进行系统分析', C.CH5_LIM),
 ('路径使用者舒适度评估证实行人的安全感知得到显著改善', C.CH5_SUM),
 ('第四，基于AI生成相应场景的模拟图片，利用BLOS及', C.CH3_T4),
 ('第三，基于深度访谈和用户参与式设计', C.CH3_T3),
 ('第四，通过模型比较分析高校共享道路的主要交通参与者在心理机制上的异同', C.CH3_T2),
 ('第四，将热点区域的环境特征', C.CH3_T1),
 ('图1 本课题技术路线图', C.CH3_PARADIGM),
 ('此外，本研究与国家交通安全与地区可持续发展战略相契合', C.CH1_SIG[1:]),
 ('有助于克服单纯依靠工程和管理手段的局限性', C.CH1_SIG[:1]),
 ('然而，政策规范的完善并未从根本上消解高校共享道路的交通冲突', C.CH1_BG[2:]),
 ('实现了从原则性要求到可操作规则的制度具化', C.CH1_BG[:2]),
]
for anchor, blocks in INSERTS:
    insert_after(anchor, blocks)

lib.save(d)
print('批次3内容插入完成')
