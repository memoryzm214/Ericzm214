# -*- coding: utf-8 -*-
"""图题补全、空标题清理、题注间隔与目录层级样式。"""
import re, sys, json, os, lib, tmpl
MODE = sys.argv[1] if len(sys.argv) > 1 else 'clean'
LOG = json.load(open('log.json')) if os.path.exists('log.json') else []
def note(c, w, b, a, y): LOG.append(dict(cat=c, where=w, before=b, after=a, why=y))

d = lib.load()

# ── 1. 补回缺失的图4题注 ──
LEG = '（4a:P02;4b:P03;4c:P05;4d:P07;4e:P12）'
CAP4 = '图4  校园共享道路5个热点区域的具体交通状况'
ps = lib.paras(d)
hit = next((p for p in ps if p['text'].strip() == LEG), None)
if hit is None:
    print('!! 图4 图注锚点未命中')
else:
    newp = tmpl.rebuild_with_sups(hit['xml'], CAP4, [])
    d = d[:hit['e']] + newp + d[hit['e']:]
    note('图表编号', '4.1.2 图4', '（正文缺此图注：4.1.2节已写明“如图3、图4所示”，图目录中亦有该条，正文却只剩子图对照说明）',
         CAP4, '图4的图注在正文中缺失，只剩下子图对照说明，导致正文图题序列为1、2、3、5…；现补回题注，位置紧接子图说明之后。')
lib.save(d)

# ── 2. 4.2.1 节中的空三级标题 ──
ps = lib.paras(d)
n_emp = 0
for i in range(len(ps) - 1, -1, -1):
    p = ps[i]
    if p['style'] == '3' and not p['text'].strip():
        d = d[:p['s']] + p['xml'].replace('<w:pStyle w:val="3"/>', '<w:pStyle w:val="1"/>', 1) + d[p['e']:]
        ps = lib.paras(d); n_emp += 1
if n_emp:
    note('标题层级', '4.2.1 节内', f'{n_emp}个空段落被标记为三级标题样式', '改为正文样式',
         '空的标题段落会在更新域时向目录中插入一条空白条目；现取消其标题样式。')
lib.save(d)

# ── 3. 正文图表题注：题号与题名之间统一为两个空格 ──
ps = lib.paras(d)
bstart = ps[next(i for i, q in enumerate(ps) if q['style'] in ('2', '3')
                 and q['text'].strip() == '1研究背景及意义')]['s']
spans = [(m.start(), m.end()) for m in re.finditer(r'<w:tbl>.*?</w:tbl>', d, re.S)]
def in_tbl(pos): return any(a <= pos < b for a, b in spans)
CAP = re.compile(r'^((?:附?表|图)\s?[\dA-G]+(?:-\d+)?)([ 　]+)(\S)')
# 题注段落常与图片同处一段，整段重建会丢图，故只在第一个 <w:t> 内就地补一个空格
T1 = re.compile(r'<w:t(?: [^>]*)?>[^<]*</w:t>')
INNER = re.compile(r'^((?:附?表|图)\s?[\dA-G]+(?:-\d+)?)([ 　]+)')
def widen(pxml):
    segs = [(m.start(), m.end(), m.group(0)) for m in T1.finditer(pxml)]
    if not segs: return pxml
    texts = [g[g.index('>') + 1:-len('</w:t>')] for _, _, g in segs]
    mm = INNER.match(''.join(texts))
    if not mm or mm.group(2) == '  ': return pxml
    pos, acc = mm.end(1), 0                      # 在题号之后补一个空格
    for k, (s, e, g) in enumerate(segs):
        if acc <= pos <= acc + len(texts[k]):
            off = pos - acc
            open_tag = g[:g.index('>') + 1]
            if 'xml:space' not in open_tag:
                open_tag = open_tag[:-1] + ' xml:space="preserve">'
            nt = texts[k][:off] + ' ' + texts[k][off:]
            return pxml[:s] + open_tag + nt + '</w:t>' + pxml[e:]
        acc += len(texts[k])
    return pxml

n_sp = 0
for i in range(len(ps) - 1, -1, -1):
    p = ps[i]
    if p['s'] < bstart or in_tbl(p['s']): continue
    m = CAP.match(p['text'].strip())
    if not m or m.group(2) == '  ': continue
    nx = widen(p['xml'])
    if nx == p['xml']: continue
    d = d[:p['s']] + nx + d[p['e']:]
    ps = lib.paras(d); n_sp += 1
if n_sp:
    note('图表格式', '正文图题与表题', '题号与题名之间的间隔不一致（原稿题注用一个空格，新增题注用两个空格）',
         f'统一为两个空格（共{n_sp}处）', '与图目录、表目录中的写法保持一致。')
lib.save(d)

# ── 4. 目录条目层级样式：三级标题对应的条目改用"toc 3" ──
ps = lib.paras(d)
ti = next(i for i, p in enumerate(ps) if p['text'].strip() == '目录')
fi = next(i for i, p in enumerate(ps) if p['text'].strip() == '图目录')
L3 = re.compile(r'^(?:\d+\.\d+\.\d+|附录[A-G])')
n_toc = 0
for i in range(fi - 1, ti, -1):
    p = ps[i]
    t = p['text'].strip()
    if not L3.match(t): continue
    if p['style'] == '5': continue
    d = d[:p['s']] + p['xml'].replace(f'<w:pStyle w:val="{p["style"]}"/>', '<w:pStyle w:val="5"/>', 1) + d[p['e']:]
    ps = lib.paras(d); n_toc += 1
if n_toc:
    note('目录层级', '目录', '第4章各小节与附录A—G的目录条目使用二级目录样式，与2.1.1—2.1.4的三级样式不一致',
         f'统一改为三级目录样式（共{n_toc}条）', '正文中这些标题同为三级标题，目录缩进层级应当一致。')
lib.save(d)

json.dump(LOG, open('log.json', 'w'), ensure_ascii=False)
print(f'[{MODE}] 图题/空标题/题注间隔/目录层级：图题1、空标题{n_emp}、题注{n_sp}、目录{n_toc}')
