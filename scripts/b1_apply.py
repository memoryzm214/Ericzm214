# -*- coding: utf-8 -*-
import re, json, lib, tmpl, tbl, refs
from content_front import FRONT
from content_back import BACK

d = lib.load()

# ============ 一、插入型勘误 ============
ps = lib.paras(d)
def find(sub):
    for i, p in enumerate(ps):
        if sub in p['text']: return i
    raise RuntimeError('not found: ' + sub[:40])

# E19 / E20 / E21 —— 文内替换
simple = [
 ('本研究识别出十二种典型的冲突触发行为', '本研究识别出十种典型的冲突触发行为'),
 ('蛇形穿行行为14起（占4.8%）', '蛇形穿行行为13起（占4.4%）'),
 ('问卷采用结构化设计，共32个题项，分为基本信息和五大环境因素评价两大板块',
  '问卷采用结构化设计，分为基本信息（4题）与五大环境因素评价（32题）两大板块，合计36个题项'),
]
for old, new in simple:
    i = find(old)
    p = ps[i]
    newxml = tmpl.rebuild_with_sups(p['xml'], p['text'].replace(old, new), [])
    d = d[:p['s']] + newxml + d[p['e']:]
    ps = lib.paras(d)

# 插入型：E7 生理反应调整说明；E13 86人样本来源；E14 需求收敛过程
BODY_T = tmpl.templates(d)['body']
INSERTS = [
 ('此类多重方法融合的策略旨在从不同视角审视认知偏差现象',
  ['需要说明的是，本课题在申报阶段曾设想借助焦点小组同步采集受试者面对不同设计条件时的生理反应数据。在研究实施过程中，考虑到生理测量设备在真实通行情境中的佩戴干扰、校园场景下伦理审查的复杂性以及样本规模的可行性，本研究将这一部分调整为以标准化场景图片为刺激材料的主观安全评分与深度访谈相结合的方式，通过大样本的主观评分获取认知偏差的量化证据，并借助访谈还原认知过程。此项调整不改变本子任务的研究目标与研究逻辑，但生理指标的采集有待后续研究予以补充。']),
 ('最终确立了包含14项核心需求的高校共享道路安全引导系统需求清单',
  ['需要说明的是，本环节的86名受访者由三部分构成，分别为前期参与场景评价问卷的56人、参与深度访谈的18人以及参与设计工作坊的12人。三部分人员均具有校园共享道路的实际使用经验，且对前期所提炼的需求要素具备基本认知，能够胜任Kano问卷正向与反向提问所要求的判断。相较于正文4.3.3节基于20名代表性使用者的重要度—满意度分析，本环节扩大了样本规模，其作用在于对前期的初步需求分层结论进行验证与细化，两者互为补充而非重复。',
   '由23项具体要素收敛至14项核心需求，经历了三个步骤。第一步为语义合并，将表述相近、指向同一设计问题的要素予以归并，例如将“反光材料与主动发光结合”与“光环境条件下的风险等级提示”合并为“夜间可见性保障”，将“标识高度适配视线习惯”与“图形化信息替代文字”合并为“标识适配性”，此步共减少5项。第二步为层级归属判定，将属于实现手段而非需求本身的要素并入其上位需求，例如将“地面纹理差异的触觉反馈”与“渐变式过渡区设计”归入“清晰的路权划分”，此步共减少3项。第三步为可行性筛除，剔除在当前校园管理条件与投入水平下短期内难以落地的要素1项。经上述三步，23项要素最终收敛为14项核心需求。整个收敛过程由课题组与6名专家共同完成，每一步的归并与剔除均记录了对应依据，以保证过程的可追溯性。']),
]
for anchor, texts in INSERTS:
    i = find(anchor)
    p = ps[i]
    add = ''.join(tmpl.make_para(BODY_T, t) for t in texts)
    d = d[:p['e']] + add + d[p['e']:]
    ps = lib.paras(d)

# ============ 二、区块渲染 ============
T = tmpl.templates(d)
PB = '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'

def flat_para(text):
    """无首行缩进的正文段（用于目录条目、参考文献）。"""
    x = tmpl.make_para(T['body'], text)
    return x.replace('<w:ind w:firstLine="480"/>', '')

def caption_para(text):
    x = tmpl.make_para(T['body'], text)
    x = x.replace('<w:ind w:firstLine="480"/>', '')
    return x.replace('<w:jc w:val="both"/>', '<w:jc w:val="center"/>')

TOC_FIELD = ('<w:p><w:pPr><w:pStyle w:val="4"/><w:jc w:val="both"/></w:pPr>'
             '<w:r><w:fldChar w:fldCharType="begin"/></w:r>'
             '<w:r><w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u </w:instrText></w:r>'
             '<w:r><w:fldChar w:fldCharType="separate"/></w:r>'
             '<w:r><w:t>目录内容将在打开文档时自动生成；若未显示，请全选后按F9更新域。</w:t></w:r>'
             '<w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>')

def caption_lines(xml):
    """按段落边界切分原始XML后取纯文本；可覆盖与图片同处一段的题注。
    须先剔除图形块——<w:drawing>等元素内含 posOffset 一类数值文本，
    剥标签后会混入题注之前。"""
    x = xml
    for tag in ('w:drawing', 'w:pict', 'mc:AlternateContent', 'w:object'):
        x = re.sub(r'<' + tag + r'\b.*?</' + tag + r'>', '', x, flags=re.S)
    x = x.replace('</w:p>', '\x00')
    x = re.sub(r'<[^>]+>', '', x)
    return [seg.strip() for seg in x.split('\x00') if seg.strip()]

def render(blocks):
    out = []
    for b in blocks:
        kind = b[0]
        if kind == 'h1':
            out.append(PB); out.append(tmpl.make_para(T['h1'], b[1]))
        elif kind == 'h2':
            out.append(tmpl.make_para(T['h2'], b[1]))
        elif kind == 'body':
            out.append(tmpl.make_para(T['body'], b[1]))
        elif kind == 'plain':
            out.append(caption_para(b[1]))
        elif kind == 'flat':
            out.append(flat_para(b[1]))
        elif kind == 'toc':
            out.append(TOC_FIELD)
        elif kind in ('autofig', 'autotbl'):
            pre = '图' if kind == 'autofig' else '表'
            rx = re.compile(r'^' + pre + r'(\d+)(?=[\s\u3000])')
            seen = set()
            for t in caption_lines(d):          # 按段落边界切原始XML，可覆盖图形内嵌段落
                m = rx.match(t)
                if m and m.group(1) not in seen and '（续）' not in t:
                    seen.add(m.group(1))
                    out.append(flat_para(re.sub(r'^(' + pre + r'\d+)[\s\u3000]+', r'\1  ', t)))
        elif kind == 'table':
            _, cap, header, rows, widths, aligns = b
            if cap: out.append(caption_para(cap))
            header = [h.replace('\n', '') for h in header]
            out.append(tbl.make_table(header, rows, widths, aligns=aligns))
            out.append('<w:p/>')
    return ''.join(out)

# 图目录/表目录条目改为左对齐无缩进
FRONT2 = []
in_index = False
for b in FRONT:
    if b[0] == 'h1':
        in_index = b[1] in ('图目录', '表目录')
    if in_index and b[0] == 'plain':
        FRONT2.append(('flat', b[1]))
    else:
        FRONT2.append(b)

# ============ 三、参考文献 ============
order = json.load(open('ref_order.json'))
REFBLOCKS = [('h1', '参考文献')]
for n, key in enumerate(order, 1):
    REFBLOCKS.append(('flat', f'[{n}] {refs.REFS[key]}'))

# ============ 四、插入 ============
ps = lib.paras(d)
i = find('1课题研究背景及意义')
front_xml = render(FRONT2)
d = d[:ps[i]['s']] + front_xml + d[ps[i]['s']:]

def resolve_tblrefs(xml):
    caps = {}
    for q in lib.paras(d):
        t = q['text'].strip()
        m = re.match(r'^表(\d+)[\s\u3000]+(.+)$', t)
        if m and '（续）' not in t:
            caps.setdefault(m.group(2).strip(), m.group(1))
    def rep(m):
        title = m.group(1)
        if title not in caps:
            raise RuntimeError('附录引用了不存在的表题: ' + title)
        return '表' + caps[title]
    return re.sub(r'表\{\{([^}]+)\}\}', rep, xml)

back_xml = resolve_tblrefs(render(REFBLOCKS) + render(BACK))
bodyend = d.rindex('</w:body>')
pos = d.rindex('<w:sectPr', 0, bodyend)      # 取正文末尾的 sectPr，而非文中分节符
d = d[:pos] + back_xml + d[pos:]

lib.save(d)

# ============ 五、打开时更新域 ============
sp = 'unpacked/word/settings.xml'
s = open(sp, encoding='utf-8').read()
if 'updateFields' not in s:
    tag = '<w:updateFields w:val="true"/>'
    for before in ('<w:hdrShapeDefaults', '<w:footnotePr', '<w:endnotePr', '<w:compat', '<w:rsids'):
        if before in s:                       # updateFields 须紧邻其后继元素之前
            s = s.replace(before, tag + before, 1); break
    else:
        s = s.replace('</w:settings>', tag + '</w:settings>')
    open(sp, 'w', encoding='utf-8').write(s)

print('参考文献条数:', len(order))
print('前置件区块:', len(FRONT2), '| 附录区块:', len(BACK))
