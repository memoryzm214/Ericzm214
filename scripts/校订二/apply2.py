# -*- coding: utf-8 -*-
import re, sys, json, lib, tmpl, fixes
MODE = sys.argv[1] if len(sys.argv) > 1 else 'clean'
HL = '<w:highlight w:val="yellow"/>'
import os
LOG = json.load(open('log.json')) if os.path.exists('log.json') else []
def note(cat, where, before, after, why): LOG.append(dict(cat=cat, where=where, before=before, after=after, why=why))

d = lib.load()

# ══ 4. 三级标题样式 2→3 ══
ps = lib.paras(d); n = 0
for i in range(len(ps)-1, -1, -1):
    p = ps[i]; t = p['text'].strip()
    if p['style'] != '2': continue
    if any(t.startswith(pre) for pre in fixes.HEADING_L3):
        newxml = p['xml'].replace('<w:pStyle w:val="2"/>', '<w:pStyle w:val="3"/>', 1)
        d = d[:p['s']] + newxml + d[p['e']:]; ps = lib.paras(d); n += 1
if n:
    note('标题层级', '第4章各小节与附录A—G', '标题2（与二级节同级）', '标题3',
         f'共{n}个三级标题原用二级样式，已统一为三级')
lib.save(d)

# ══ 5. 章标题统一 ══
for old, new, why in fixes.HEADING_RENAME:
    ps = lib.paras(d)
    for i, p in enumerate(ps):
        if p['text'].strip() == old and p['style'] in ('2', '3'):
            d = d[:p['s']] + tmpl.rebuild_with_sups(p['xml'], new, []) + d[p['e']:]
            note('标题', '第3章', old, new, why); break
lib.save(d)

# ══ 6. 目录与正文标题同步 ══
ps = lib.paras(d)
ti = next(i for i, p in enumerate(ps) if p['text'].strip() == '目录')
fi = next(i for i, p in enumerate(ps) if p['text'].strip() == '图目录')
bodystart = next(i for i, p in enumerate(ps) if p['style'] in ('2','3') and p['text'].strip() == '1研究背景及意义')
heads = [p['text'].strip() for i, p in enumerate(ps)
         if i >= bodystart and p['style'] in ('2', '3') and p['text'].strip()]
front = ['摘要', 'Abstract', '目录', '图目录', '表目录', '缩略语表']
expect = front + heads
entries = [i for i in range(ti + 1, fi) if re.match(r'^.+\d+$', ps[i]['text'].strip())]
fixed = 0
if len(entries) == len(expect):
    for k in range(len(entries) - 1, -1, -1):
        i = entries[k]; cur = ps[i]['text'].strip()
        m = re.match(r'^(.*?)(\d+)$', cur)
        label, page = m.group(1).strip(), m.group(2)
        if label != expect[k]:
            d = d[:ps[i]['s']] + tmpl.rebuild_with_sups(ps[i]['xml'], expect[k] + page, []) + d[ps[i]['e']:]
            ps = lib.paras(d); fixed += 1
            if fixed <= 6: note('目录', f'目录第{k+1}条', label, expect[k], '目录条目与正文标题不一致（正文标题修改后目录未同步）')
    if fixed > 6: note('目录', '目录', f'共{fixed}条不一致', '已全部同步', '目录条目与正文标题不一致，已按正文逐条同步')
else:
    note('!! 目录', '目录', f'条目{len(entries)}', f'标题{len(expect)}', '条目数与标题数不符，未自动同步')
lib.save(d)

# ══ 7. 图目录 / 表目录 依正文题注重建 ══
def caption_lines(xml):
    x = xml
    for tag in ('w:drawing', 'w:pict', 'mc:AlternateContent', 'w:object'):
        x = re.sub(r'<' + tag + r'\b.*?</' + tag + r'>', '', x, flags=re.S)
    x = x.replace('</w:p>', '\x00'); x = re.sub(r'<[^>]+>', '', x)
    return [s.strip() for s in x.split('\x00')]

for kind, pre in (('图目录', '图'), ('表目录', '表')):
    ps = lib.paras(d)
    si = next(i for i, p in enumerate(ps) if p['text'].strip() == kind)
    ei = next(i for i, p in enumerate(ps) if p['text'].strip() in ('表目录', '缩略语表') and i > si)
    bstart = next(i for i, p in enumerate(ps) if p['style'] in ('2','3') and p['text'].strip() == '1研究背景及意义')
    bxml = d[ps[bstart]['s']:]
    seen, real = set(), []
    for t in caption_lines(bxml):
        m = re.match(r'^' + pre + r'(\d+)(?=[\s　])', t)
        if m and m.group(1) not in seen and '（续）' not in t:
            seen.add(m.group(1))
            real.append(re.sub(r'^(' + pre + r'\d+)[\s　]+', r'\1  ', t))
    cur = [i for i in range(si + 1, ei) if ps[i]['text'].strip().startswith(pre)]
    old = [ps[i]['text'].strip() for i in cur]
    if old != real:
        for k in range(len(cur) - 1, -1, -1):
            i = cur[k]
            if k < len(real):
                d = d[:ps[i]['s']] + tmpl.rebuild_with_sups(ps[i]['xml'], real[k], []) + d[ps[i]['e']:]
            else:
                d = d[:ps[i]['s']] + d[ps[i]['e']:]          # 多余条目删除
            ps = lib.paras(d)
        diff = [(a, b) for a, b in zip(old, real) if a != b]
        for a, b in diff[:3]: note('图表目录', kind, a, b, '目录条目与正文题注不一致，已按正文订正')
        if len(old) > len(real):
            for a in old[len(real):]: note('图表目录', kind, a, '（删除）', '正文中该表已被删除，目录中的对应条目一并删除')
lib.save(d)
json.dump(LOG, open('log.json', 'w'), ensure_ascii=False)
print(f'[{MODE}] 标题/目录处理完成；日志累计 {len(LOG)} 条')
