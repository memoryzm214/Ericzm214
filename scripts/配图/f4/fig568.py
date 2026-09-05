# -*- coding: utf-8 -*-
"""图5／图6 行为决策模型，图8 需求清单 —— 参考配色重绘。
路径系数取自表23（多群组分析），R² 取自 4.2.4 节；需求项与系数取自表34。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
from pal import *

OUT = os.path.join(os.path.dirname(__file__), 'html')
os.makedirs(OUT, exist_ok=True)


def w(name, html):
    open(os.path.join(OUT, name + '.html'), 'w', encoding='utf-8').write(html)
    print('·', name)


# ══════════════════════ 图5 / 图6  行为决策模型 ══════════════════════

MW, MH = 1980, 1400
RX, RY = 124, 58

NODES = {   # code: (x, y, 中文名)
    'SN':  (1150, 270,  '主观规范'),
    'PCE': (245,  500,  '过往冲突经历'),
    'RP':  (700,  500,  '风险感知'),
    'AT':  (1150, 500,  '安全态度'),
    'BI':  (1660, 700,  '行为意图'),
    'PEU': (245,  900,  '感知易用性'),
    'PBC': (700,  970,  '知觉行为控制'),
    'PU':  (1660, 1130, '感知有用性'),
}

# 构念名称、代码与定义均照录表14《高校共享道路交通安全行为要素表》，序号同表14
DEFS = [('1', 'AT',  '安全态度',     '个体对交通安全重要性的总体评判'),
        ('2', 'SN',  '主观规范',     '个体所感知到的来自重要他人的行为期望'),
        ('3', 'PBC', '知觉行为控制', '体现个体对执行安全行为的自我效能感'),
        ('4', 'PU',  '感知有用性',   '个体认为遵守交通规则对保障安全的有效程度'),
        ('5', 'PEU', '感知易用性',   '个体认为执行安全行为的便利程度'),
        ('6', 'RP',  '风险感知',     '对潜在交通危险的主观评估'),
        ('7', 'PCE', '过往冲突经历', '反映个体的直接或间接事故经验'),
        ('8', 'BI',  '行为意图',     '作为因变量用于预测实际行为')]

# (起, 止, 行人β, 骑行者β, 行人显著, 骑行者显著, 标签点 t, 标签偏移)
PATHS = [
    ('PCE', 'RP',  '0.487', '0.538', 3, 3, .50, (0, -46)),
    ('RP',  'AT',  '0.516', '0.342', 3, 3, .50, (0, -46)),
    ('AT',  'BI',  '0.378', '0.196', 3, 3, .50, (34, -26)),
    ('SN',  'BI',  '0.167', '0.145', 2, 2, .50, (44, -26)),
    ('PEU', 'PBC', '0.287', '0.456', 3, 3, .50, (0, -48)),
    ('PBC', 'BI',  '0.158', '0.324', 2, 3, .50, (-12, -38)),
    ('PU',  'BI',  '0.134', '0.149', 1, 2, .50, (80, 4)),
    ('RP',  'BI',  '0.094', '0.081', 0, 0, .28, (0, 0)),
    ('PEU', 'BI',  '0.072', '0.065', 0, 0, .30, (0, -6)),
]
STAR = {3: '***', 2: '**', 1: '*', 0: ' n.s.'}
CORE = {'ped': ['PCE', 'RP', 'AT', 'BI'], 'cyc': ['PEU', 'PBC', 'BI']}
RIBBON = {'ped': ['PCE', 'RP', 'AT', 'BI'], 'cyc': ['PEU', 'PBC', 'BI']}
R2 = {'ped': {'BI': '52.3%', 'AT': '26.6%', 'PBC': '8.2%'},
      'cyc': {'BI': '44.8%', 'AT': '11.7%', 'PBC': '20.8%'}}
BADGE = {'AT': (1244, 438), 'PBC': (606, 908), 'BI': (1754, 638)}


def edge_pt(a, b, m1=2, m2=15):
    """a、b 两椭圆之间的连线端点（各留出边距）。"""
    ax, ay, _ = NODES[a]
    bx, by, _ = NODES[b]
    dx, dy = bx - ax, by - ay
    s1 = 1.0 / math.hypot(dx / (RX + m1), dy / (RY + m1))
    s2 = 1.0 / math.hypot(dx / (RX + m2), dy / (RY + m2))
    return ax + dx * s1, ay + dy * s1, bx - dx * s2, by - dy * s2


def model(kind):
    who = '行人' if kind == 'ped' else '骑行者'
    num = '图5' if kind == 'ped' else '图6'
    core_n = set(CORE[kind])
    core_e = set(zip(RIBBON[kind][:-1], RIBBON[kind][1:]))
    d = [marker('ah', OLIVE_D, 7), marker('ahC', TERRA_D, 7), marker('ahN', LINE_D, 7)]
    o = [rect(0, 0, MW, MH, PAPER)]
    o.append(title_bar(MW, num, f'{who}行为决策模型',
                       f'多群组结构方程分析（{who}组）；有效问卷 232 份，8 个潜变量、43 个观测题项；'
                       f'路径系数取自表23，R² 取自 4.2.4 节', 56))

    # ── 顶部图例 ──
    ly = 150
    o.append(line(60, ly, 106, ly, TERRA, 5, cap='round'))
    o.append(T(118, ly + 5, '核心传导链', 14, 600, INK2))
    o.append(line(228, ly, 274, ly, OLIVE_D, 2.4, cap='round'))
    o.append(T(286, ly + 5, '显著路径', 14, 500, INK2))
    o.append(line(392, ly, 438, ly, LINE_D, 1.7, dash='8 6'))
    o.append(T(450, ly + 5, '不显著路径', 14, 500, INK2))
    o.append(rect(574, ly - 13, 78, 26, S1, 13))
    o.append(T(613, ly + 5, 'R²  解释力', 13, 600, FOREST_D, 'middle'))
    o.append(T(676, ly + 5, '*** p<0.001    ** p<0.01    * p<0.05    n.s. 不显著', 13.5, 400, INK3))

    # ── 核心链底衬 ──
    pts = 'M' + ' L'.join(f'{NODES[c][0]},{NODES[c][1]}' for c in RIBBON[kind])
    o.append(path(pts, 'none', TERRA_P, 48, .85, cap='round', join='round'))

    # ── 路径 ──
    for a, b, pb, cb, ps_, cs_, t, (ox, oy) in PATHS:
        beta = pb if kind == 'ped' else cb
        sig = ps_ if kind == 'ped' else cs_
        x1, y1, x2, y2 = edge_pt(a, b)
        if sig == 0:
            o.append(arrow(x1, y1, x2, y2, LINE_D, 1.7, 'ahN', '8 6'))
            col, fs, wt = INK3, 14.5, 500
        elif (a, b) in core_e:
            o.append(arrow(x1, y1, x2, y2, TERRA, 3.4, 'ahC'))
            col, fs, wt = TERRA_D, 20, 700
        else:
            o.append(arrow(x1, y1, x2, y2, OLIVE_D, 2.4, 'ah'))
            col, fs, wt = FOREST_D, 16, 600
        px = x1 + (x2 - x1) * t + ox
        py = y1 + (y2 - y1) * t + oy
        lab = beta + STAR[sig]
        bw_ = len(lab) * fs * 0.58 + 16
        o.append(rect(px - bw_ / 2, py - fs * .95, bw_, fs * 1.82, PAPER, 5, .94))
        o.append(T(px, py + fs * .34, lab, fs, wt, col, 'middle'))

    # ── 节点 ──
    for code, (x, y, cn) in NODES.items():
        is_core = code in core_n
        fill = TERRA if is_core else CARD
        stroke = TERRA_D if is_core else OLIVE
        tc = WHITE if is_core else INK
        o.append(f'<ellipse cx="{x+2}" cy="{y+3}" rx="{RX}" ry="{RY}" fill="#3A3C34" opacity=".07"/>')
        o.append(f'<ellipse cx="{x}" cy="{y}" rx="{RX}" ry="{RY}" fill="{fill}" '
                 f'stroke="{stroke}" stroke-width="2"/>')
        o.append(T(x, y - 3, cn, 21, 600, tc, 'middle'))
        o.append(T(x, y + 27, code, 17, 700, tc if is_core else OLIVE_D, 'middle', op=.92 if is_core else 1))
        if code in R2[kind]:
            bx, by = BADGE[code]
            o.append(rect(bx - 38, by - 15, 84, 27, S1, 13, 1, OLIVE, 1))
            o.append(T(bx + 4, by + 4, 'R² ' + R2[kind][code], 13.5, 700, FOREST_D, 'middle'))

    # ── 构念释义 ──
    PX, PY, PW, PH = 60, 1050, 1420, 230
    o.append(rect(PX, PY, PW, PH, S0, 10, .8))
    o.append(T(PX + 26, PY + 32, '构念释义', 16, 700, FOREST_D))
    o.append(T(PX + 108, PY + 32, '名称、代码与定义照录表14《高校共享道路交通安全行为要素表》，序号同表14',
               13, 400, INK3))
    o.append(line(PX + 26, PY + 44, PX + PW - 26, PY + 44, LINE, 1))
    for i, (no, cd, cn, df) in enumerate(DEFS):
        cx = PX + 26 + (i % 3) * 470
        cy = PY + 78 + (i // 3) * 58
        o.append(T(cx, cy, no, 13, 700, INK3))
        o.append(T(cx + 18, cy, cd, 14.5, 700, TERRA_D))
        o.append(T(cx + 72, cy, cn, 15, 600, INK))
        o.append(T(cx + 18, cy + 23, df, 13, 400, INK3))

    concl = ('行人以“过往冲突经历→风险感知→安全态度→行为意图”为主导传导链，'
             '安全态度对行为意图的路径系数达 0.378（p<0.001），模型对行为意图的解释力为 52.3%。'
             if kind == 'ped' else
             '骑行者以“感知易用性→知觉行为控制→行为意图”为主导传导链，'
             '知觉行为控制对行为意图的路径系数达 0.324（p<0.001），模型对行为意图的解释力为 44.8%。')
    o.append(T(60, 1320, concl, 15, 500, TERRA_D))
    o.append(foot(MW, MH, f'{num}  {who}行为决策模型',
                 '两组路径系数的组间差异经 z 检验，核心路径均达显著（见表23）'))
    w('fig' + ('5' if kind == 'ped' else '6'), page(MW, MH, ''.join(o), ''.join(d)))


# ══════════════════════ 图8  需求清单 ══════════════════════

KANO = [
    ('基本需求', 'Must-be', 'P0', TERRA, TERRA_P, '不满足即引发不满，满足亦不显著提升满意度',
     [('清晰的路权划分', 0.32, 0.89, 'P0'), ('交叉口冲突标注', 0.28, 0.85, 'P0'),
      ('夜间可见性保障', 0.35, 0.82, 'P0'), ('标识适配性', 0.31, 0.80, 'P0')]),
    ('期望需求', 'One-dimensional', 'P1', OLIVE_D, S1, '满足度与满意度近似线性相关',
     [('盲区提示', 0.76, 0.68, 'P1'), ('速度警示', 0.82, 0.71, 'P1'),
      ('推荐速度提示', 0.78, 0.65, 'P1'), ('安全路径指引', 0.85, 0.73, 'P1'),
      ('分层信息呈现', 0.75, 0.62, 'P1')]),
    ('兴奋需求', 'Attractive', 'P2', STEEL_D, STEEL_L, '不满足不引发不满，满足则显著提升满意度',
     [('动态流量显示', 0.74, 0.15, 'P2'), ('社会规范可视化', 0.68, 0.12, 'P2'),
      ('听觉辅助提示', 0.62, 0.18, 'P2'), ('情感化设计元素', 0.65, 0.14, 'P2'),
      ('景观融合设计', 0.61, 0.11, 'P3')]),
]
KW, KH = 1980, 1240
NOTE0 = ('基本需求为其余两类需求的实现前提，', '须在系统首轮部署中全部落地。')


def kano():
    d = [marker('ah', INK3, 7)]
    o = [rect(0, 0, KW, KH, PAPER)]
    o.append(title_bar(KW, '图8', '高校共享道路安全引导系统需求清单',
                       '基于 86 份 Kano 问卷，共 14 项需求，分为基本／期望／兴奋三类；'
                       '需求项、系数与优先级照录表34，各类内部次序同表34', 56))

    CW, GAP, X0, Y0 = 590, 32, 66, 176
    NMAX = max(len(k[6]) for k in KANO)
    CH = 100 + NMAX * 148 + 34
    for ci, (name, en, pr, col, band, defi, items) in enumerate(KANO):
        x = X0 + ci * (CW + GAP)
        o.append(rect(x + 3, Y0 + 4, CW, CH, '#3A3C34', 10, .05))
        o.append(rect(x, Y0, CW, CH, CARD, 10, 1, LINE_D, 1.2))
        o.append(path(f'M{x},{Y0+10} a10,10 0 0 1 10,-10 L{x+CW-10},{Y0} '
                      f'a10,10 0 0 1 10,10 L{x+CW},{Y0+78} L{x},{Y0+78} Z', col))
        o.append(T(x + 24, Y0 + 36, name, 22, 600, WHITE))
        o.append(T(x + 24 + len(name) * 23 + 12, Y0 + 35, en, 13.5, 400, WHITE, op=.78))
        o.append(rect(x + CW - 118, Y0 + 16, 46, 26, WHITE, 13, .22))
        o.append(T(x + CW - 95, Y0 + 35, pr, 15, 700, WHITE, 'middle'))
        o.append(T(x + CW - 58, Y0 + 35, f'{len(items)}项', 14, 500, WHITE, 'middle', op=.9))
        o.append(T(x + 24, Y0 + 64, defi, 13, 400, WHITE, op=.82))

        for k, (nm, sat, dis, p) in enumerate(items):
            yy = Y0 + 100 + k * 148
            o.append(rect(x + 18, yy, CW - 36, 128, band, 8, .5))
            o.append(T(x + 40, yy + 34, nm, 19, 600, INK))
            o.append(rect(x + CW - 74, yy + 16, 36, 22, WHITE, 11, .85))
            o.append(T(x + CW - 56, yy + 32, p, 13, 700, col, 'middle'))
            cx = x + CW / 2 - 6
            base, span = yy + 82, 210
            o.append(line(x + 40, base + 14, x + CW - 40, base + 14, LINE, 1))
            o.append(rect(cx - dis * span, base, dis * span, 15, TERRA, 3, .85))
            o.append(rect(cx, base, sat * span, 15, OLIVE, 3, .9))
            o.append(line(cx, base - 7, cx, base + 22, INK3, 1.4))
            o.append(T(cx - dis * span - 10, base + 12, f'−{dis:.2f}', 13, 600, TERRA_D, 'end'))
            o.append(T(cx + sat * span + 10, base + 12, f'{sat:.2f}', 13, 600, FOREST_D))
        # 空位补白（第一列仅 4 项）
        if len(items) < NMAX:
            yy = Y0 + 100 + len(items) * 148
            o.append(rect(x + 18, yy, CW - 36, 128, PAPER, 8, .75, LINE, 1.1))
            o.append(T(x + CW / 2, yy + 56, '——  该类需求共 4 项  ——', 14, 600, INK3, 'middle'))
            o.append(T(x + CW / 2, yy + 84, NOTE0[0], 13, 400, INK3, 'middle'))
            o.append(T(x + CW / 2, yy + 106, NOTE0[1], 13, 400, INK3, 'middle'))
        o.append(T(x + CW / 2, Y0 + CH - 12,
                   '实施顺序：' + ('先行' if ci == 0 else ('次之' if ci == 1 else '增值')),
                   13.5, 500, INK3, 'middle'))

    by = Y0 + CH + 40
    o.append(rect(66, by, KW - 132, 96, S0, 10))
    o.append(T(94, by + 34, '读图说明', 16, 700, FOREST_D))
    o.append(rect(212, by + 18, 30, 15, TERRA, 3, .85))
    o.append(T(250, by + 32, '不满意度系数 = −（基本+期望）/（兴奋+期望+基本+无差异）', 13.5, 400, INK2))
    o.append(rect(698, by + 18, 30, 15, OLIVE, 3, .9))
    o.append(T(736, by + 32, '满意度系数 = （兴奋+期望）/（兴奋+期望+基本+无差异）（见表34注）', 13.5, 400, INK2))
    o.append(T(94, by + 66, '需求间存在层级依赖：盲区提示与安全路径指引须以清晰的路权划分为前提，'
                            '社会规范可视化与情感化设计亦以基本需求的满足为条件，'
                            '故实施遵循“先基础后提升”的顺序。', 13.5, 400, INK2))

    o.append(foot(KW, KH, '图8  高校共享道路安全引导系统需求清单',
                 '需求项与系数取自表34《基于KANO模型的需求分类统计表》'))
    w('fig8', page(KW, KH, ''.join(o), ''.join(d)))




# ══════════════════════ 图8（简版）  只列需求，不列系数 ══════════════════════

KW2, KH2 = 1980, 1120
# 类别定义照录 4.4 节正文表述
KCLS = [
    ('基本需求', 'Must-be', 'P0', TERRA, TERRA_P, TERRA_L,
     ['不满足即引发不满，', '满足亦不显著提升满意度']),
    ('期望需求', 'One-dimensional', 'P1', OLIVE_D, S1, OLIVE,
     ['呈线性效应，实现程度越高，', '满意度提升越明显']),
    ('兴奋需求', 'Attractive', 'P2', STEEL_D, STEEL_L, STEEL_D,
     ['超出使用者基本预期，缺失不引发不满，', '具备则显著提升体验']),
]
BX, BW, BH, BGAP = 66, 1748, 220, 26
CX0, CXW, CW, CGAP = 500, 1290, 238, 24


def kano_simple():
    d = []
    o = [rect(0, 0, KW2, KH2, PAPER)]
    o.append(title_bar(KW2, '图8', '高校共享道路安全引导系统需求清单',
                       '共 14 项需求，依 Kano 模型分为基本／期望／兴奋三类；'
                       '需求项与分类取自表34，实施遵循“先基础后提升”', 56))

    ys = [180 + i * (BH + BGAP) for i in range(3)]          # 自上而下
    for i, (name, en, pr, col, band, edge, defi) in enumerate(reversed(KCLS)):
        y = ys[i]
        items = [it[0] for it in KANO[2 - i][6]]
        o.append(rect(BX, y, BW, BH, band, 12, .45))
        o.append(rect(BX, y, 400, BH, col, 12))
        o.append(rect(BX + 280, y, 186, BH, col))
        o.append(T(BX + 28, y + 58, name, 26, 600, WHITE))
        o.append(T(BX + 28 + len(name) * 27 + 12, y + 56, en, 14, 400, WHITE, op=.78))
        o.append(rect(BX + 28, y + 78, 104, 30, WHITE, 15, .24))
        o.append(T(BX + 80, y + 99, f'{pr}   {len(items)} 项', 14.5, 700, WHITE, 'middle'))
        for k, ln in enumerate(defi):
            o.append(T(BX + 28, y + 146 + k * 24, ln, 13.5, 400, WHITE, op=.88))

        pris = dict((it[0], it[3]) for it in KANO[2 - i][6])
        for k, nm in enumerate(items):
            cx = CX0 + 2 + k * (CW + CGAP)
            cy = y + (BH - 104) / 2
            o.append(rect(cx + 2, cy + 3, CW, 104, '#3A3C34', 10, .05))
            o.append(rect(cx, cy, CW, 104, CARD, 10, 1, edge, 1.4))
            o.append(T(cx + CW / 2, cy + 46, nm, 20, 600, INK, 'middle'))
            o.append(rect(cx + CW / 2 - 24, cy + 60, 48, 24, band, 12))
            o.append(T(cx + CW / 2, cy + 77, pris[nm], 13, 700, col, 'middle'))

    # ── 右侧实施顺序箭头 ──
    top, bot = ys[0] - 4, ys[2] + BH
    o.append(poly([(1850, bot), (1900, bot), (1900, top + 60), (1918, top + 60),
                   (1875, top), (1832, top + 60), (1850, top + 60)], S2))
    mid = (top + 60 + bot) / 2
    for k, ch in enumerate('先基础后提升'):
        o.append(T(1875, mid - 85 + k * 34, ch, 22, 600, FOREST_D, 'middle'))
    for k, ch in enumerate('实施顺序'):
        o.append(T(1875, bot - 96 + k * 26, ch, 14, 500, INK2, 'middle'))

    # ── 说明 ──
    ny = 936
    o.append(rect(66, ny, KW2 - 132, 112, S0, 10))
    o.append(T(94, ny + 36, '说明', 16, 700, FOREST_D))
    o.append(T(160, ny + 36, '三类需求呈层级关系：基本需求是其余两类的实现前提——'
                             '盲区提示与安全路径指引须以清晰的路权划分为基础，'
                             '社会规范可视化与情感化设计亦以基本需求的满足为条件。',
               14, 400, INK2))
    o.append(T(94, ny + 76, '故系统实施遵循“先基础后提升”的顺序：基本需求首轮全部落地，'
                            '期望需求次轮实现，兴奋需求作为增值项择机部署。'
                            '各需求的满意度系数与不满意度系数见表34。', 14, 400, INK2))

    o.append(foot(KW2, KH2, '图8  高校共享道路安全引导系统需求清单',
                  '需求项与分类取自表34《基于KANO模型的需求分类统计表》'))
    w('fig8b', page(KW2, KH2, ''.join(o), ''.join(d)))


if __name__ == '__main__':
    model('ped')
    model('cyc')
    kano()
    kano_simple()
