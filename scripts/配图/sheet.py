# -*- coding: utf-8 -*-
import os, sys, base64
sys.path.insert(0, 'src')
from common import FONT_CSS
OUT = 'sheet_html'
os.makedirs(OUT, exist_ok=True)
SPEC = {
 '9': ('图9  面向高校共享道路主要参与者的安全引导系统设计原型',
   [('A', '透视效果图·黄昏', '沿用现图的路面视角，LED地埋灯带点亮，突出夜间可见性', '在现图基础上调整'),
    ('B', '透视效果图·日间', '同一视角的日间版本，突出色彩编码与标线体系', '在现图基础上调整'),
    ('C', '透视效果图·要素标注版', '同一视角，八项设计要素逐一引线标注', '在现图基础上调整'),
    ('D', '地面标识系统平面布置图', '俯视，含横向尺寸链与减速标线间距递减标注', '全新'),
    ('E', '共享道路标准横断面图', '含尺寸链、材料标注与冗余编码说明', '全新'),
    ('F', '地面信息的分层构成（轴测分解）', '铺装—标线—路径—照明四层叠合', '全新')]),
 '10': ('图10  交叉口部署预警标志设计原型',
   [('A', '轴测鸟瞰效果图·日间', '交叉口全貌，菱形警示色块与冲突点标识清晰可辨', '在现图基础上调整'),
    ('B', '轴测鸟瞰效果图·夜间', '同一视角的夜间版本', '在现图基础上调整'),
    ('C', '轴测鸟瞰·要素标注版', '六项预警要素引线标注', '在现图基础上调整'),
    ('D', '交叉口预警标志平面布置图', '含尺寸标注与图例', '全新'),
    ('E', '交叉口预警要素布设逻辑图', '骑行流线交叉关系与冲突点 C1—C4 的生成', '全新'),
    ('F', '要素规格详图与速度诱导机理', '菱形色块／冲突点尺寸详图＋减速标线掠过频率计算', '全新')]),
 '11': ('图11  立面动态提示装置设计原型',
   [('A', '路侧场景效果图·日间', '沿用现图的路侧视角，装置置于绿化带内', '在现图基础上调整'),
    ('B', '路侧场景效果图·夜间', '屏幕与地埋灯带点亮', '在现图基础上调整'),
    ('C', '路侧场景·要素标注版', '装置构成与安装参数标注', '在现图基础上调整'),
    ('D', '屏幕界面设计图', '主信息区70%／侧栏30%，界面内容全部可读', '全新'),
    ('E', '三视图与安装尺寸', '正立面／侧立面／平面＋安装参数表', '全新'),
    ('F', '信息架构与布点逻辑', '三层信息架构＋20m布点与4.8s时距推算', '全新')]),
}
for num, (title, items) in SPEC.items():
    cards = []
    for code, name, desc, kind in items:
        p = os.path.abspath(f'out/fig{num}-{code}.png')
        b = base64.b64encode(open(p, 'rb').read()).decode()
        badge = '#0057B8' if kind == '全新' else '#FF6A13'
        cards.append(f'''<div class="card">
  <div class="thumb"><img src="data:image/png;base64,{b}"></div>
  <div class="meta"><span class="code">{num}-{code}</span>
    <span class="badge" style="background:{badge}">{kind}</span>
    <div class="nm">{name}</div><div class="ds">{desc}</div></div>
</div>''')
    html = f'''<title>sheet</title><style>{FONT_CSS}
*{{margin:0;padding:0;box-sizing:border-box}}
#canvas{{width:1800px;background:#fff;font-family:'NSSC',sans-serif;padding:44px 48px 40px}}
h1{{font-size:26px;font-weight:700;color:#1C2024}}
.sub{{font-size:14px;color:#6B7280;margin-top:8px;padding-bottom:18px;border-bottom:1px solid #E3E7EC}}
.grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;margin-top:26px}}
.card{{border:1px solid #E3E7EC;border-radius:10px;overflow:hidden;background:#fff}}
.thumb{{background:#F5F6F8;border-bottom:1px solid #E3E7EC}}
.thumb img{{width:100%;display:block}}
.meta{{padding:14px 16px 16px}}
.code{{font-size:15px;font-weight:700;color:#1C2024}}
.badge{{font-size:11px;color:#fff;padding:2px 8px;border-radius:9px;margin-left:8px;vertical-align:2px}}
.nm{{font-size:14px;font-weight:600;margin-top:8px;color:#1C2024}}
.ds{{font-size:12.5px;color:#6B7280;margin-top:5px;line-height:1.55}}
</style><div id="canvas"><h1>{title}</h1>
<div class="sub">6 张备选：3 张在目前基础上调整（橙标），3 张全新（蓝标）。各项取值均依表38《安全引导系统设计参数规范》。</div>
<div class="grid">{''.join(cards)}</div></div>'''
    open(f'{OUT}/sheet{num}.html', 'w', encoding='utf-8').write(html)
    print('·', num)
