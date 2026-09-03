# -*- coding: utf-8 -*-
import re, lib, tmpl, tbl
import content_lit as C

d = lib.load()

# ---------- 一、原有表号整体后移5位（为第2章新增的表1—表5让位）----------
SHIFT = 5
pat = re.compile(r'表(\d+)')
ps = lib.paras(d)
n_shift = 0
for i in range(len(ps) - 1, -1, -1):
    p = ps[i]
    if not pat.search(p['text']):
        continue
    newtext = pat.sub(lambda m: f'表{int(m.group(1)) + SHIFT}', p['text'])
    if newtext != p['text']:
        d = d[:p['s']] + tmpl.rebuild_with_sups(p['xml'], newtext, []) + d[p['e']:]
        ps = lib.paras(d)
        n_shift += 1
print(f'表号后移的段落数: {n_shift}')

# ---------- 二、区块渲染 ----------
T = tmpl.templates(d)

def caption_para(text):
    x = tmpl.make_para(T['body'], text)
    x = x.replace('<w:ind w:firstLine="480"/>', '')
    return x.replace('<w:jc w:val="both"/>', '<w:jc w:val="center"/>')

def render(blocks):
    out = []
    for b in blocks:
        if b[0] == 'body':
            out.append(tmpl.make_para(T['body'], b[1]))
        elif b[0] == 'table':
            _, cap, header, rows, widths, aligns = b
            out.append(caption_para(cap))
            out.append(tbl.make_table(header, rows, widths, aligns=aligns))
            out.append('<w:p/>')
    return ''.join(out)

def find(sub, ps):
    for i, p in enumerate(ps):
        if sub in p['text']:
            return i
    raise RuntimeError('not found: ' + sub[:40])

# ---------- 三、2.1 开篇插入文献检索与筛选 ----------
ps = lib.paras(d)
i = find('2.1课题研究现状', ps)
d = d[:ps[i]['e']] + render(C.INTRO) + d[ps[i]['e']:]

# ---------- 四、四个小节：前置段 + 原段（剥离尾句）+ 后续段 + 尾句 ----------
SECTIONS = [
 ('共享道路交通安全研究的首要任务是精准识别行为冲突并界定空间热点',
  '然而，现有研究仅从客观层面分析发生交通冲突的具体问题，如何从交通参与者的主观层面分析发生冲突的原因仍需要深入探讨。',
  C.S1_BEFORE, C.S1_AFTER),
 ('研究人员还探索了客观环境如何通过主观感知影响行为选择',
  '然而，现有研究虽然认识到校园交通环境特征与道路参与者主观认知具有一定的关联性，但如何将主观认知转化为具体的交通环境优化策略，并通过相关设计引导共享空间中道路参与者的交通安全行为还需要展开深入研究。',
  C.S2_BEFORE, C.S2_AFTER),
 ('在识别客观冲突基础上，理解心理认知过程成为预测和改变不安全行为的关键',
  '然而，心理模型研究在理论应用与实践验证间存在显著鸿沟。在复杂的校园交通共享道路中，交通参与者的认知意图与行为转化机制仍旧相对模糊。',
  C.S3_BEFORE, C.S3_AFTER),
 ('为提高高校共享道路交通的安全性，国内外研究在工程、教育和管理等领域提出了多样化的设计干预策略',
  '然而，当前研究未充分从设计角度考虑在校园共享交通环境下行人与非机动车的交通需求和行为动机的关联性，这导致实际产品在实际环境中的适用性大打折扣。',
  C.S4_BEFORE, C.S4_AFTER),
]
for anchor, tail, before, after in SECTIONS:
    ps = lib.paras(d)
    i = find(anchor, ps)
    p = ps[i]
    body = p['text']
    if tail not in body:
        raise RuntimeError('tail not found in: ' + anchor[:30])
    trimmed = body.replace(tail, '').rstrip()
    newp = tmpl.rebuild_with_sups(p['xml'], trimmed, [])
    block = (render(before) + newp + render(after)
             + tmpl.make_para(T['body'], tail))
    d = d[:p['s']] + block + d[p['e']:]

# ---------- 五、述评与研究缺口 ----------
ps = lib.paras(d)
i = find('综上所述，国内外研究人员在高校共享道路交通安全领域已积累了相当的研究基础', ps)
d = d[:ps[i]['e']] + render(C.GAP_BEFORE) + render(C.GAP_AFTER) + d[ps[i]['e']:]

lib.save(d)
print('第2章内容插入完成')
