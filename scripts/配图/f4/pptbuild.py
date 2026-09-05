# -*- coding: utf-8 -*-
"""用 PowerPoint 原生图形重建图1、图5、图6、图8（与 SVG 版同源同数据）。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
from pptx.enum.text import PP_ALIGN
from pptx.enum.dml import MSO_LINE_DASH_STYLE as DS
from deck import Deck, Page
from pal import *
import fig1 as F1
import fig568 as F8

DASH = DS.DASH


def tblock(p, cx, cy, w, h, lines, fs, wt, color, align=PP_ALIGN.CENTER, op=1):
    tb = p.slide.shapes.add_textbox(p.X(cx - w / 2), p.Y(cy - h / 2), p.L(w), p.L(h))
    p._fmt(tb.text_frame, lines, fs, wt, color, align, op)
    return tb


def elbow(p, pts, color, sw, dash=None, arrow=True):
    for i in range(len(pts) - 1):
        (x1, y1), (x2, y2) = pts[i], pts[i + 1]
        p.ln(x1, y1, x2, y2, color, sw, dash, arrow=(arrow and i == len(pts) - 2))


def boxt(p, x, y, w, h, lines, fill=CARD, stroke=LINE_D, tc=INK, fs=17, wt=500, rx=6, sw=1.2):
    sh = p.rect(x, y, w, h, fill, rx, 1, stroke, sw)
    p.label(sh, lines, fs, wt, tc)
    return sh


def title_bar(p, W, num, name, sub, y=56):
    p.txt(56, y, num, 27, 700, INK)
    p.txt(56 + len(num) * 16 + 14, y, name, 21, 500, INK)
    if sub:
        p.txt(56, y + 30, sub, 14, 400, INK3)
    p.ln(56, y + 48, W - 56, y + 48, LINE, 1.3)


def foot(p, W, H, left, right=''):
    p.ln(56, H - 46, W - 56, H - 46, LINE, 1.3)
    p.txt(56, H - 22, left, 12.5, 400, INK3)
    if right:
        p.txt(W - 56, H - 22, right, 12.5, 400, INK3, 'end')


# ═══════════════════ 图1 ═══════════════════
def fig1(deck):
    W, H = F1.W, F1.H
    CX0, CX1, MX0, MX1, RX0, RX1 = F1.CX0, F1.CX1, F1.MX0, F1.MX1, F1.RX0, F1.RX1
    B = F1.BANDS
    p = deck.page(W, H)
    p.rect(0, 0, W, H, PAPER)

    sh = p.rect(56, 44, W - 112, 62, FOREST, 8)
    p.label(sh, ['高校共享道路慢行主体的安全认知偏差与行为引导研究'], 24, 600, WHITE)
    for x0, x1, nm in ((CX0, CX1, '研究脉络'), (MX0, MX1, '研究内容'), (RX0, RX1, '研究方法')):
        p.label(p.rect(x0, 126, x1 - x0, 46, S1, 6), [nm], 19, 600, FOREST_D)

    for i, (y0, y1) in enumerate(B):
        if i % 2 == 0:
            p.rect(CX0 - 4, y0 - 14, RX1 - CX0 + 8, y1 - y0 + 28, S0, 8, .55)

    for i, (stage, task, ms) in enumerate(F1.STAGES):
        y0, y1 = B[i]
        h = y1 - y0
        flag = [(CX0, y0), (CX1 - 28, y0), (CX1, y0 + h / 2), (CX1 - 28, y1), (CX0, y1)]
        p.poly(flag, CARD)
        p.poly([(CX0, y0), (CX0 + 74, y0), (CX0 + 74, y1), (CX0, y1)], OLIVE)
        p.poly(flag, 'none', 1, LINE_D, 1.2)
        tblock(p, CX0 + 37, y0 + h / 2, 66, len(stage) * 42, list(stage), 21, 600, WHITE)
        tblock(p, CX0 + 74 + (CX1 - CX0 - 74) / 2 - 10, y0 + h / 2, CX1 - CX0 - 90,
               len(task) * 34, task, 18.5, 600, INK)
        if i < 3:
            cx = (CX0 + CX1) / 2
            p.poly([(cx - 15, y1 + 6), (cx + 15, y1 + 6), (cx + 15, B[i + 1][0] - 16),
                    (cx + 27, B[i + 1][0] - 16), (cx, B[i + 1][0] - 2),
                    (cx - 27, B[i + 1][0] - 16), (cx - 15, B[i + 1][0] - 16)], S2)
        n = len(ms)
        for k, m in enumerate(ms):
            yy = y0 + h / 2 - (n * 56 - 14) / 2 + k * 56
            p.label(p.rect(RX0, yy, RX1 - RX0, 42, S1, 21), [m], 16, 500, FOREST_D)

    CM = (MX0 + MX1) / 2
    boxt(p, 500, 250, 300, 58, ['冲突热点区域'], fs=18)
    boxt(p, 870, 250, 300, 58, ['冲突行为类型'], fs=18)
    elbow(p, [(650, 308), (650, 330), (858, 330), (858, 348)], INK2, 1.8)
    p.ln(1020, 308, 1020, 348, INK2, 1.8, arrow=True)
    boxt(p, 660, 352, 560, 58, ['冲突热点区域的交通环境特征'], fs=18)
    p.txt(CM + 8, 442, '数据整理与归纳', 14.5, 400, INK3, 'middle')
    p.ln(CM + 8, 412, CM + 8, 466, INK2, 1.8, arrow=True)
    p.label(p.poly([(590, 478), (1330, 478), (1360, 509), (1330, 540), (590, 540), (560, 509)],
                   TERRA), ['高校共享道路交通冲突热点区域环境特征'], 19, 600, WHITE)

    boxt(p, 560, 610, 800, 56, ['共享道路冲突主体感知安全数据收集'], fs=18)
    p.ln(960, 666, 960, 700, INK2, 1.8, arrow=True)
    p.label(p.rect(720, 706, 480, 50, S1, 25), ['行为意图要素集'], 18, 500, FOREST_D)
    p.ln(960, 756, 960, 794, INK2, 1.8, arrow=True)
    p.label(p.poly([(630, 806), (1290, 806), (1320, 837), (1290, 868), (630, 868), (600, 837)],
                   TERRA), ['共享道路冲突主体的行为决策模型'], 19, 600, WHITE)

    boxt(p, 500, 1000, 380, 58, ['客观交通环境特征'], fs=18)
    boxt(p, 970, 1000, 380, 58, ['主观决策行为要素'], fs=18)
    p.ln(880, 1029, 962, 1029, INK2, 1.6, arrow=True)
    p.ln(970, 1042, 888, 1042, INK2, 1.6, arrow=True)
    elbow(p, [(560, 509), (466, 509), (466, 1029), (492, 1029)], OLIVE_D, 1.6, DASH)
    elbow(p, [(1320, 837), (1386, 837), (1386, 1029), (1358, 1029)], OLIVE_D, 1.6, DASH)
    p.txt(CM + 8, 1108, '数据整理与归纳', 14.5, 400, INK3, 'middle')
    p.ln(CM + 8, 1070, CM + 8, 1132, INK2, 1.8, arrow=True)
    p.label(p.poly([(620, 1144), (1300, 1144), (1330, 1175), (1300, 1206), (620, 1206), (590, 1175)],
                   TERRA), ['高校共享道路安全引导系统需求清单'], 19, 600, WHITE)
    p.txt(CM + 8, 1250, '认知偏差测度 → 设计需求转化', 15, 500, TERRA_D, 'middle')

    boxt(p, 560, 1360, 800, 56, ['共享道路安全引导策略'], fs=18)
    p.ln(960, 1416, 960, 1452, INK2, 1.8, arrow=True)
    p.label(p.rect(620, 1458, 680, 52, S1, 26), ['高校共享道路安全引导系统设计原型'], 18, 500, FOREST_D)
    p.txt(1000, 1538, '评估', 14.5, 400, INK3)
    p.ln(960, 1510, 960, 1552, INK2, 1.8, arrow=True)
    boxt(p, 640, 1564, 640, 56, ['面向设计原型的可用性评估'], CARD, TERRA_L, TERRA_D, 18)
    elbow(p, [(1280, 1592), (1392, 1592), (1392, 1484), (1306, 1484)], TERRA, 1.6, DASH)
    tblock(p, 1415, 1550, 40, 110, list('优化与迭代'), 14.5, 500, TERRA_D)

    lx, ly = 60, 1712
    p.rect(lx, ly - 16, 24, 16, TERRA, 3)
    p.txt(lx + 34, ly - 3, '阶段性成果', 13.5, 500, INK2)
    p.rect(lx + 152, ly - 16, 24, 16, S1, 3)
    p.txt(lx + 186, ly - 3, '过程性输出', 13.5, 500, INK2)
    p.rect(lx + 304, ly - 16, 24, 16, CARD, 3, 1, LINE_D, 1.2)
    p.txt(lx + 338, ly - 3, '研究工作', 13.5, 500, INK2)
    p.ln(lx + 448, ly - 8, lx + 490, ly - 8, OLIVE_D, 1.6, DASH)
    p.txt(lx + 500, ly - 3, '成果向下一子任务的输入', 13.5, 500, INK2)
    p.ln(lx + 730, ly - 8, lx + 772, ly - 8, TERRA, 1.6, DASH)
    p.txt(lx + 782, ly - 3, '优化与迭代回路', 13.5, 500, INK2)
    foot(p, W, H, '图1  本课题技术路线图',
         '四项子任务依“特征识别—模型构建—需求识别—策略生成”逐级供给')


# ═══════════════════ 图5 / 图6 ═══════════════════
def model(deck, kind):
    W, H, RX, RY = F8.MW, F8.MH, F8.RX, F8.RY
    N, R2, BADGE = F8.NODES, F8.R2, F8.BADGE
    who = '行人' if kind == 'ped' else '骑行者'
    num = '图5' if kind == 'ped' else '图6'
    core_n = set(F8.CORE[kind])
    core_e = set(zip(F8.RIBBON[kind][:-1], F8.RIBBON[kind][1:]))
    p = deck.page(W, H)
    p.rect(0, 0, W, H, PAPER)
    title_bar(p, W, num, f'{who}行为决策模型',
              f'多群组结构方程分析（{who}组）；有效问卷 232 份，8 个潜变量、43 个观测题项；'
              f'路径系数取自表23，R² 取自 4.2.4 节')

    ly = 150
    p.ln(60, ly, 106, ly, TERRA, 5, cap='rnd')
    p.txt(118, ly + 5, '核心传导链', 14, 600, INK2)
    p.ln(228, ly, 274, ly, OLIVE_D, 2.4, cap='rnd')
    p.txt(286, ly + 5, '显著路径', 14, 500, INK2)
    p.ln(392, ly, 438, ly, LINE_D, 1.7, DASH)
    p.txt(450, ly + 5, '不显著路径', 14, 500, INK2)
    p.label(p.rect(574, ly - 13, 78, 26, S1, 13), ['R²  解释力'], 13, 600, FOREST_D)
    p.txt(676, ly + 5, '*** p<0.001    ** p<0.01    * p<0.05    n.s. 不显著', 13.5, 400, INK3)

    rb = F8.RIBBON[kind]
    for a, b in zip(rb[:-1], rb[1:]):
        p.ln(N[a][0], N[a][1], N[b][0], N[b][1], TERRA_P, 48, cap='rnd', op=.85)

    for a, b, pb, cb, ps_, cs_, t, (ox, oy) in F8.PATHS:
        beta = pb if kind == 'ped' else cb
        sig = ps_ if kind == 'ped' else cs_
        x1, y1, x2, y2 = F8.edge_pt(a, b)
        if sig == 0:
            p.ln(x1, y1, x2, y2, LINE_D, 1.7, DASH, arrow=True)
            col, fs, wt = INK3, 14.5, 500
        elif (a, b) in core_e:
            p.ln(x1, y1, x2, y2, TERRA, 3.4, arrow=True)
            col, fs, wt = TERRA_D, 20, 700
        else:
            p.ln(x1, y1, x2, y2, OLIVE_D, 2.4, arrow=True)
            col, fs, wt = FOREST_D, 16, 600
        px = x1 + (x2 - x1) * t + ox
        py = y1 + (y2 - y1) * t + oy
        lab = beta + F8.STAR[sig]
        bw = len(lab) * fs * .58 + 16
        p.rect(px - bw / 2, py - fs * .95, bw, fs * 1.82, PAPER, 5, .94)
        p.txt(px, py, lab, fs, wt, col, 'middle')

    for code, (x, y, cn) in N.items():
        core = code in core_n
        sh = p.ell(x, y, RX, RY, TERRA if core else CARD, 1,
                   TERRA_D if core else OLIVE, 2, name=f'构念-{code}')
        p.label(sh, [cn, code], [21, 17], [600, 700],
                [WHITE, WHITE] if core else [INK, OLIVE_D])
        if code in R2[kind]:
            bx, by = BADGE[code]
            p.label(p.rect(bx - 38, by - 15, 84, 27, S1, 13, 1, OLIVE, 1),
                    ['R² ' + R2[kind][code]], 13.5, 700, FOREST_D)

    PX, PY, PW, PH = 60, 1050, 1420, 230
    p.rect(PX, PY, PW, PH, S0, 10, .8)
    p.txt(PX + 26, PY + 32, '构念释义', 16, 700, FOREST_D)
    p.txt(PX + 108, PY + 32, '名称、代码与定义照录表14《高校共享道路交通安全行为要素表》，序号同表14',
          13, 400, INK3)
    p.ln(PX + 26, PY + 44, PX + PW - 26, PY + 44, LINE, 1)
    for i, (no, cd, cn, df) in enumerate(F8.DEFS):
        cx = PX + 26 + (i % 3) * 470
        cy = PY + 78 + (i // 3) * 58
        p.txt(cx, cy, no, 13, 700, INK3)
        p.txt(cx + 18, cy, cd, 14.5, 700, TERRA_D)
        p.txt(cx + 72, cy, cn, 15, 600, INK)
        p.txt(cx + 18, cy + 23, df, 13, 400, INK3)

    concl = ('行人以“过往冲突经历→风险感知→安全态度→行为意图”为主导传导链，'
             '安全态度对行为意图的路径系数达 0.378（p<0.001），模型对行为意图的解释力为 52.3%。'
             if kind == 'ped' else
             '骑行者以“感知易用性→知觉行为控制→行为意图”为主导传导链，'
             '知觉行为控制对行为意图的路径系数达 0.324（p<0.001），模型对行为意图的解释力为 44.8%。')
    p.txt(60, 1320, concl, 15, 500, TERRA_D)
    foot(p, W, H, f'{num}  {who}行为决策模型',
         '两组路径系数的组间差异经 z 检验，核心路径均达显著（见表23）')


# ═══════════════════ 图8 ═══════════════════
def kano(deck):
    W, H = F8.KW, F8.KH
    p = deck.page(W, H)
    p.rect(0, 0, W, H, PAPER)
    title_bar(p, W, '图8', '高校共享道路安全引导系统需求清单',
              '基于 86 份 Kano 问卷，共 14 项需求，分为基本／期望／兴奋三类；'
              '需求项、系数与优先级照录表34，各类内部次序同表34')

    CW, GAP, X0, Y0 = 590, 32, 66, 176
    NMAX = max(len(k[6]) for k in F8.KANO)
    CH = 100 + NMAX * 148 + 34
    for ci, (name, en, pr, col, band, defi, items) in enumerate(F8.KANO):
        x = X0 + ci * (CW + GAP)
        p.rect(x, Y0, CW, CH, CARD, 10, 1, LINE_D, 1.2, name=f'需求卡-{name}')
        p.rect(x, Y0, CW, 78, col, 10)
        p.rect(x, Y0 + 40, CW, 38, col)
        p.txt(x + 24, Y0 + 36, name, 22, 600, WHITE)
        p.txt(x + 24 + len(name) * 23 + 12, Y0 + 35, en, 13.5, 400, WHITE, op=.78)
        p.rect(x + CW - 118, Y0 + 16, 46, 26, WHITE, 13, .22)
        p.txt(x + CW - 95, Y0 + 35, pr, 15, 700, WHITE, 'middle')
        p.txt(x + CW - 58, Y0 + 35, f'{len(items)}项', 14, 500, WHITE, 'middle', op=.9)
        p.txt(x + 24, Y0 + 64, defi, 13, 400, WHITE, op=.82)

        for k, (nm, sat, dis, pri) in enumerate(items):
            yy = Y0 + 100 + k * 148
            p.rect(x + 18, yy, CW - 36, 128, band, 8, .5)
            p.txt(x + 40, yy + 34, nm, 19, 600, INK)
            p.label(p.rect(x + CW - 74, yy + 16, 36, 22, WHITE, 11, .85), [pri], 13, 700, col)
            cx = x + CW / 2 - 6
            base, span = yy + 82, 210
            p.ln(x + 40, base + 14, x + CW - 40, base + 14, LINE, 1)
            p.rect(cx - dis * span, base, dis * span, 15, TERRA, 3, .85)
            p.rect(cx, base, sat * span, 15, OLIVE, 3, .9)
            p.ln(cx, base - 7, cx, base + 22, INK3, 1.4)
            p.txt(cx - dis * span - 10, base + 12, f'−{dis:.2f}', 13, 600, TERRA_D, 'end')
            p.txt(cx + sat * span + 10, base + 12, f'{sat:.2f}', 13, 600, FOREST_D)
        if len(items) < NMAX:
            yy = Y0 + 100 + len(items) * 148
            sh = p.rect(x + 18, yy, CW - 36, 128, PAPER, 8, .75, LINE, 1.1)
            p.label(sh, ['——  该类需求共 4 项  ——'] + list(F8.NOTE0), 13, 400, INK3)
        p.txt(x + CW / 2, Y0 + CH - 12,
              '实施顺序：' + ('先行' if ci == 0 else ('次之' if ci == 1 else '增值')),
              13.5, 500, INK3, 'middle')

    by = Y0 + CH + 40
    p.rect(66, by, W - 132, 96, S0, 10)
    p.txt(94, by + 34, '读图说明', 16, 700, FOREST_D)
    p.rect(212, by + 18, 30, 15, TERRA, 3, .85)
    p.txt(250, by + 32, '不满意度系数 = −（基本+期望）/（兴奋+期望+基本+无差异）', 13.5, 400, INK2)
    p.rect(698, by + 18, 30, 15, OLIVE, 3, .9)
    p.txt(736, by + 32, '满意度系数 = （兴奋+期望）/（兴奋+期望+基本+无差异）（见表34注）', 13.5, 400, INK2)
    p.txt(94, by + 66, '需求间存在层级依赖：盲区提示与安全路径指引须以清晰的路权划分为前提，'
                       '社会规范可视化与情感化设计亦以基本需求的满足为条件，'
                       '故实施遵循“先基础后提升”的顺序。', 13.5, 400, INK2)
    foot(p, W, H, '图8  高校共享道路安全引导系统需求清单',
         '需求项与系数取自表34《基于KANO模型的需求分类统计表》')




# ═══════════════════ 图8（简版） ═══════════════════
def kano_simple(deck):
    W, H = F8.KW2, F8.KH2
    BX, BW, BH, BGAP = F8.BX, F8.BW, F8.BH, F8.BGAP
    CX0, CW, CGAP = F8.CX0, F8.CW, F8.CGAP
    p = deck.page(W, H)
    p.rect(0, 0, W, H, PAPER)
    title_bar(p, W, '图8', '高校共享道路安全引导系统需求清单',
              '共 14 项需求，依 Kano 模型分为基本／期望／兴奋三类；'
              '需求项与分类取自表34，实施遵循“先基础后提升”')

    ys = [180 + i * (BH + BGAP) for i in range(3)]
    for i, (name, en, pr, col, band, edge, defi) in enumerate(reversed(F8.KCLS)):
        y = ys[i]
        items = [it[0] for it in F8.KANO[2 - i][6]]
        p.rect(BX, y, BW, BH, band, 12, .45, name=f'需求带-{name}')
        p.rect(BX, y, 400, BH, col, 12)
        p.rect(BX + 280, y, 186, BH, col)
        p.txt(BX + 28, y + 58, name, 26, 600, WHITE)
        p.txt(BX + 28 + len(name) * 27 + 12, y + 56, en, 14, 400, WHITE, op=.78)
        p.label(p.rect(BX + 28, y + 78, 104, 30, WHITE, 15, .24),
                [f'{pr}   {len(items)} 项'], 14.5, 700, WHITE)
        for k, ln in enumerate(defi):
            p.txt(BX + 28, y + 146 + k * 24, ln, 13.5, 400, WHITE, op=.88)
        pris = dict((it[0], it[3]) for it in F8.KANO[2 - i][6])
        for k, nm in enumerate(items):
            cx = CX0 + 2 + k * (CW + CGAP)
            cy = y + (BH - 104) / 2
            p.rect(cx, cy, CW, 104, CARD, 10, 1, edge, 1.4, name=f'需求-{nm}')
            p.txt(cx + CW / 2, cy + 46, nm, 20, 600, INK, 'middle')
            p.label(p.rect(cx + CW / 2 - 24, cy + 60, 48, 24, band, 12),
                    [pris[nm]], 13, 700, col)

    top, bot = ys[0] - 4, ys[2] + BH
    p.poly([(1850, bot), (1900, bot), (1900, top + 60), (1918, top + 60),
            (1875, top), (1832, top + 60), (1850, top + 60)], S2)
    mid = (top + 60 + bot) / 2
    tblock(p, 1875, mid + 34, 44, 6 * 34, list('先基础后提升'), 22, 600, FOREST_D)
    tblock(p, 1875, bot - 96 + 1.5 * 26, 34, 4 * 26, list('实施顺序'), 14, 500, INK2)

    ny = 936
    p.rect(66, ny, W - 132, 112, S0, 10)
    p.txt(94, ny + 36, '说明', 16, 700, FOREST_D)
    p.txt(160, ny + 36, '三类需求呈层级关系：基本需求是其余两类的实现前提——'
                        '盲区提示与安全路径指引须以清晰的路权划分为基础，'
                        '社会规范可视化与情感化设计亦以基本需求的满足为条件。', 14, 400, INK2)
    p.txt(94, ny + 76, '故系统实施遵循“先基础后提升”的顺序：基本需求首轮全部落地，'
                       '期望需求次轮实现，兴奋需求作为增值项择机部署。'
                       '各需求的满意度系数与不满意度系数见表34。', 14, 400, INK2)
    foot(p, W, H, '图8  高校共享道路安全引导系统需求清单',
         '需求项与分类取自表34《基于KANO模型的需求分类统计表》')


if __name__ == '__main__':
    d = Deck()
    fig1(d)
    model(d, 'ped')
    model(d, 'cyc')
    kano_simple(d)
    kano(d)
    out = os.path.join(os.path.dirname(__file__), 'pptx', '配图_图1图5图6图8_可编辑.pptx')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    d.save(out)
    print('saved', out)
