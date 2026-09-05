# -*- coding: utf-8 -*-
"""图1  本课题技术路线图 —— 参考配色重绘。结构与内容沿用原图，仅更新题名与视觉。"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from pal import *

W, H = 1820, 1780
OUT = os.path.join(os.path.dirname(__file__), 'html')
os.makedirs(OUT, exist_ok=True)

# 三栏
CX0, CX1 = 60, 400          # 研究脉络
MX0, MX1 = 432, 1420        # 研究内容
RX0, RX1 = 1452, 1760       # 研究方法

STAGES = [
    ('特征识别', ['高校共享道路', '交通冲突特征识别'], ['民族志', '访谈法', '问卷调研法']),
    ('模型构建', ['共享道路冲突主体', '安全认知与行为意图', '作用机理研究'],
     ['文献研究法', '问卷调研法', '实证分析法']),
    ('需求识别', ['共享道路交通冲突主体', '认知偏差与需求分析'],
     ['问卷调研法', '访谈法', '实证分析法']),
    ('策略生成', ['高校共享道路', '安全引导策略', '生成与验证'],
     ['问卷调研法', '实证研究法']),
]
BANDS = [(228, 560), (600, 940), (980, 1300), (1340, 1660)]


def build():
    d = [marker('ah', INK2), marker('ahT', TERRA), marker('ahG', FOREST)]
    o = [rect(0, 0, W, H, PAPER)]

    # ── 题头 ──
    o.append(rect(56, 44, W - 112, 62, FOREST, 8))
    o.append(T(W / 2, 84, '高校共享道路慢行主体的安全认知偏差与行为引导研究',
               24, 600, WHITE, 'middle'))

    # ── 栏头 ──
    for x0, x1, nm in ((CX0, CX1, '研究脉络'), (MX0, MX1, '研究内容'), (RX0, RX1, '研究方法')):
        o.append(rect(x0, 126, x1 - x0, 46, S1, 6))
        o.append(T((x0 + x1) / 2, 158, nm, 19, 600, FOREST_D, 'middle'))

    # ── 阶段带（底纹） ──
    for i, (y0, y1) in enumerate(BANDS):
        if i % 2 == 0:
            o.append(rect(CX0 - 4, y0 - 14, RX1 - CX0 + 8, y1 - y0 + 28, S0, 8, .55))

    # ── 左栏：阶段旗标 ──
    for i, (stage, task, _) in enumerate(STAGES):
        y0, y1 = BANDS[i]
        h = y1 - y0
        flag = [(CX0, y0), (CX1 - 28, y0), (CX1, y0 + h / 2), (CX1 - 28, y1), (CX0, y1)]
        o.append(poly([(a + 2, b + 3) for a, b in flag], '#3A3C34', .05))
        o.append(poly(flag, CARD))
        o.append(poly([(CX0, y0), (CX0 + 74, y0), (CX0 + 74, y1), (CX0, y1)], OLIVE))
        o.append(poly(flag, 'none', 1, LINE_D, 1.2))
        for k, ch in enumerate(stage):
            o.append(T(CX0 + 37, y0 + h / 2 - (len(stage) - 1) * 21 + k * 42 + 7,
                       ch, 21, 600, WHITE, 'middle'))
        for k, ln in enumerate(task):
            o.append(T(CX0 + 74 + (CX1 - CX0 - 74) / 2 - 10,
                       y0 + h / 2 - (len(task) - 1) * 17 + k * 34 + 6,
                       ln, 18.5, 600, INK, 'middle'))
        if i < 3:
            o.append(poly([((CX0 + CX1) / 2 - 15, y1 + 6), ((CX0 + CX1) / 2 + 15, y1 + 6),
                           ((CX0 + CX1) / 2 + 15, BANDS[i + 1][0] - 16),
                           ((CX0 + CX1) / 2 + 27, BANDS[i + 1][0] - 16),
                           ((CX0 + CX1) / 2, BANDS[i + 1][0] - 2),
                           ((CX0 + CX1) / 2 - 27, BANDS[i + 1][0] - 16),
                           ((CX0 + CX1) / 2 - 15, BANDS[i + 1][0] - 16)], S2))

    # ── 右栏：方法 ──
    for i, (_, _, ms) in enumerate(STAGES):
        y0, y1 = BANDS[i]
        n = len(ms)
        for k, m in enumerate(ms):
            yy = y0 + (y1 - y0) / 2 - (n * 56 - 14) / 2 + k * 56
            o.append(pill(RX0, yy, RX1 - RX0, 42, m, S1, FOREST_D, 16, 500))

    # ══ 研究内容 ══
    CM = (MX0 + MX1) / 2

    # ── 阶段一 ──
    o.append(box(500, 250, 300, 58, '冲突热点区域', CARD, LINE_D, INK, 18))
    o.append(box(870, 250, 300, 58, '冲突行为类型', CARD, LINE_D, INK, 18))
    o.append(elbow([(650, 308), (650, 330), (858, 330), (858, 348)], INK2, 1.8, 'ah'))
    o.append(arrow(1020, 308, 1020, 348, INK2, 1.8))
    o.append(box(660, 352, 560, 58, '冲突热点区域的交通环境特征', CARD, LINE_D, INK, 18))
    o.append(T(CM + 8, 442, '数据整理与归纳', 14.5, 400, INK3, 'middle'))
    o.append(arrow(CM + 8, 412, CM + 8, 466, INK2, 1.8))
    o.append(hexbox(560, 478, 800, 62, '', TERRA, WHITE, 19,
                    lines=['高校共享道路交通冲突热点区域环境特征']))

    # ── 阶段二 ──
    o.append(box(560, 610, 800, 56, '共享道路冲突主体感知安全数据收集', CARD, LINE_D, INK, 18))
    o.append(arrow(960, 666, 960, 700, INK2, 1.8))
    o.append(rect(720, 706, 480, 50, S1, 25))
    o.append(T(960, 738, '行为意图要素集', 18, 500, FOREST_D, 'middle'))
    o.append(arrow(960, 756, 960, 794, INK2, 1.8))
    o.append(hexbox(600, 806, 720, 62, '', TERRA, WHITE, 19,
                    lines=['共享道路冲突主体的行为决策模型']))

    # ── 阶段三 ──
    o.append(box(500, 1000, 380, 58, '客观交通环境特征', CARD, LINE_D, INK, 18))
    o.append(box(970, 1000, 380, 58, '主观决策行为要素', CARD, LINE_D, INK, 18))
    o.append(arrow(880, 1029, 962, 1029, INK2, 1.6))
    o.append(arrow(970, 1042, 888, 1042, INK2, 1.6))
    # 里程碑①→客观特征
    o.append(elbow([(560, 509), (466, 509), (466, 1029), (492, 1029)], OLIVE_D, 1.6, 'ahG', '7 6'))
    # 里程碑②→主观要素
    o.append(elbow([(1320, 837), (1386, 837), (1386, 1029), (1358, 1029)], OLIVE_D, 1.6, 'ahG', '7 6'))
    o.append(T(CM + 8, 1108, '数据整理与归纳', 14.5, 400, INK3, 'middle'))
    o.append(arrow(CM + 8, 1070, CM + 8, 1132, INK2, 1.8))
    o.append(hexbox(590, 1144, 740, 62, '', TERRA, WHITE, 19,
                    lines=['高校共享道路安全引导系统需求清单']))
    o.append(T(CM + 8, 1250, '认知偏差测度 → 设计需求转化', 15, 500, TERRA_D, 'middle'))

    # ── 阶段四 ──
    o.append(box(560, 1360, 800, 56, '共享道路安全引导策略', CARD, LINE_D, INK, 18))
    o.append(arrow(960, 1416, 960, 1452, INK2, 1.8))
    o.append(rect(620, 1458, 680, 52, S1, 26))
    o.append(T(960, 1491, '高校共享道路安全引导系统设计原型', 18, 500, FOREST_D, 'middle'))
    o.append(T(1000, 1538, '评估', 14.5, 400, INK3))
    o.append(arrow(960, 1510, 960, 1552, INK2, 1.8))
    o.append(box(640, 1564, 640, 56, '面向设计原型的可用性评估', CARD, TERRA_L, TERRA_D, 18))
    o.append(elbow([(1280, 1592), (1392, 1592), (1392, 1484), (1306, 1484)], TERRA, 1.6, 'ahT', '7 6'))
    for k, ch in enumerate('优化与迭代'):
        o.append(T(1408, 1508 + k * 21, ch, 14.5, 500, TERRA_D))

    # ── 图例 ──
    lx, ly = 60, 1712
    o.append(rect(lx, ly - 16, 24, 16, TERRA, 3))
    o.append(T(lx + 34, ly - 3, '阶段性成果', 13.5, 500, INK2))
    o.append(rect(lx + 152, ly - 16, 24, 16, S1, 3))
    o.append(T(lx + 186, ly - 3, '过程性输出', 13.5, 500, INK2))
    o.append(rect(lx + 304, ly - 16, 24, 16, CARD, 3, stroke=LINE_D, sw=1.2))
    o.append(T(lx + 338, ly - 3, '研究工作', 13.5, 500, INK2))
    o.append(line(lx + 448, ly - 8, lx + 490, ly - 8, OLIVE_D, 1.6, dash='7 6'))
    o.append(T(lx + 500, ly - 3, '成果向下一子任务的输入', 13.5, 500, INK2))
    o.append(line(lx + 730, ly - 8, lx + 772, ly - 8, TERRA, 1.6, dash='7 6'))
    o.append(T(lx + 782, ly - 3, '优化与迭代回路', 13.5, 500, INK2))

    o.append(foot(W, H, '图1  本课题技术路线图', '四项子任务依“特征识别—模型构建—需求识别—策略生成”逐级供给'))
    open(os.path.join(OUT, 'fig1.html'), 'w', encoding='utf-8').write(page(W, H, ''.join(o), ''.join(d)))
    print('· fig1')


if __name__ == '__main__':
    build()
