# -*- coding: utf-8 -*-
import re, json, lib, tmpl, tbl
import content_b5 as C

d = lib.load()
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

def place(sub, blocks, before=False):
    global d
    for p in lib.paras(d):
        if sub in p['text']:
            pos = p['s'] if before else p['e']
            d = d[:pos] + render(blocks) + d[pos:]
            return
    raise RuntimeError('not found: ' + sub[:40])

# ---------- 插入（自后向前，锚点按文本定位故顺序无关，但保持文档倒序更稳）----------
PLAN = [
 ('5课题研究总结', C.LINK44, True),
 ('4.4高校共享道路安全引导策略生成与验证', C.LINK43, True),
 ('图8 高校共享道路安全引导系统需求清单', C.IPA_FULL, True),
 ('赶时间的动机则促使个体容忍更高的风险', C.BIAS_QUOTE, False),
 ('参与式设计工作坊共28人次参与', C.ICC, False),
 ('通过统计优化算法筛选出96个具有代表性的场景组合', C.ORTHO, False),
 ('图6 骑行者行为决策模型', C.LINK42, False),
 ('这些间接效应揭示了变量间的作用机制', C.HYPO_RESULT + C.INVAR, False),
 ('以上结果表明测量模型的区分效尚可', C.CMB, False),
 ('4.2.2研究分层抽样与数据收集', C.CVI + C.EFA + C.HYPO, True),
 ('视距条件、照明水平和路面平整度的影响虽然相对较弱', C.LINK41, False),
 ('以揭示访谈材料中的主要主题和潜在逻辑', C.THEMES, False),
 ('整个采集期间，设备正常运行率达到96.3%', C.ETHICS, False),
 ('以便于帮助研究人员更好观测并识别行人与骑行者在校园共享道路中的冲突事件及其类别', C.CALIB, False),
]
for sub, blocks, before in PLAN:
    place(sub, blocks, before)

# ---------- 表格按出现顺序全量重编号 ----------
CAP = re.compile(r'^表(#?\d+)(?=[\s　])')
ps = lib.paras(d)
mapping, order = {}, 0
for p in ps:
    m = CAP.match(p['text'].strip())
    if m:
        lab = m.group(1)
        if lab not in mapping:            # “（续）”沿用同一编号
            order += 1
            mapping[lab] = order
print(f'表格总数: {order}')

SENT_L, SENT_R = chr(0xE000), chr(0xE001)   # 私用区哨兵，避免连锁替换
REF = re.compile(r'表(#?\d+)')
def to_sentinel(m):
    lab = m.group(1)
    if lab not in mapping:
        raise RuntimeError('未知表号引用: 表' + lab)
    return f'{SENT_L}{mapping[lab]}{SENT_R}'

ps = lib.paras(d)
for i in range(len(ps) - 1, -1, -1):
    p = ps[i]
    if not REF.search(p['text']): continue
    nt = REF.sub(to_sentinel, p['text'])
    nt = re.sub(SENT_L + r'(\d+)' + SENT_R, r'表\1', nt)
    if nt != p['text']:
        d = d[:p['s']] + tmpl.rebuild_with_sups(p['xml'], nt, []) + d[p['e']:]
        ps = lib.paras(d)

lib.save(d)
json.dump({k: v for k, v in mapping.items()}, open('table_map.json', 'w'), ensure_ascii=False)
print('批次5内容插入与表号重编完成')
