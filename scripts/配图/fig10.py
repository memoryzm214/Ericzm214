# -*- coding: utf-8 -*-
"""图10  交叉口部署预警标志设计原型  —  6 张备选。
要素依表38：黄色菱形警示色块 Pantone 116 C；冲突点标识 Pantone 485 C；
渐进减速标线 白色宽200mm、间距 4.0→1.5m。"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *
from fig9 import (W, H, RW, PL0, PL1, WL0, WL1, TL0, TL1, BK0, BK1,
                  TR0, TR1, WR0, WR1, PR0, PR1, LEDL, LEDR, CYC_L, CYC_R,
                  OUT, write, ground_glyph)

DIAM = 0.60      # 菱形警示色块边长 600mm
CONF = 0.80      # 冲突点标识直径 800mm
D0 = 15.0        # 交叉口近边距观察点距离（透视图）

DIAMOND = "M50,2 L98,50 L50,98 L2,50 Z"


# ══════════════════════════ 轴测鸟瞰效果图 ══════════════════════════

CA, SA = 0.866, 0.5
ARMM = 8.8                                    # 各进口道绘制长度（米）
SS = 31.0                                     # 每米像素
OX, OY = 800, 552                             # 原点（交叉口中心投影）


def iso(u, v, z=0.0, ox=OX, oy=OY, S=SS):
    """u：东向米（交叉口中心为0）；v：北向米；z：高度米。"""
    return (ox + (u - v) * S * CA, oy + (u + v) * S * SA - z * S)


def quad(u0, u1, v0, v1, fill, op=1, stroke=None, sw=1, **kw):
    return poly([iso(u0, v0, **kw), iso(u1, v0, **kw), iso(u1, v1, **kw), iso(u0, v1, **kw)],
                fill, op, stroke, sw)


def aerial(dusk=False, callouts=False):
    """交叉口轴测鸟瞰。主路南北向（v 轴），次路东西向（u 轴）。"""
    d, o = [], []
    HW = RW / 2
    L = ARMM + HW

    if dusk:
        d.append('<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
                 '<stop offset="0" stop-color="#16233A"/><stop offset="1" stop-color="#0D1522"/></linearGradient>')
        grass, grassD = '#27381F', '#1D2B18'
        asph, curb = '#2E333A', '#5C636B'
        bl, org, ylw, wht, rd = '#0A4894', '#C24D10', '#D9AE0A', '#D7DCE2', '#B32418'
        trunk, leaf, leaf2 = '#241E18', '#243A22', '#2E482B'
        figc, tint, ledop = '#0C0F14', .28, .95
        walk = '#4A5058'
    else:
        d.append('<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">'
                 '<stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#F2F5F7"/></linearGradient>')
        grass, grassD = '#79A55F', '#6A9553'
        asph, curb = '#5B6068', '#C4C7C4'
        bl, org, ylw, wht, rd = BLUE, ORANGE, YELLOW, WHITE, RED
        trunk, leaf, leaf2 = '#5B4835', '#517F44', '#659155'
        figc, tint, ledop = '#28323C', .12, .55
        walk = '#CFD2D0'

    o.append(rect(0, 96, W, 904, 'url(#bg)'))

    # ── 四个象限的绿地 ──
    for su, sv in ((1, 1), (1, -1), (-1, 1), (-1, -1)):
        u0, u1 = (HW, L) if su > 0 else (-L, -HW)
        v0, v1 = (HW, L) if sv > 0 else (-L, -HW)
        o.append(quad(u0, u1, v0, v1, grass))
        o.append(quad(u0 + (0.5 if su > 0 else 0), u1 - (0 if su > 0 else 0.5),
                      v0 + (0.5 if sv > 0 else 0), v1 - (0 if sv > 0 else 0.5), grassD, .35))

    # ── 路面 ──
    o.append(quad(-HW - 0.6, HW + 0.6, -L, L, curb))
    o.append(quad(-L, L, -HW - 0.6, HW + 0.6, curb))
    o.append(quad(-HW, HW, -L, L, asph))
    o.append(quad(-L, L, -HW, HW, asph))

    def mv(m):
        return m - HW           # 由“自左缘起算的米”换算为中心坐标

    # 主路（南北）纵向条带 -> u 方向切分
    for a_, b_, c_ in ((PL0, PL1, org), (PR0, PR1, org), (BK0, BK1, bl)):
        o.append(quad(mv(a_), mv(b_), -L, L, c_))
        o.append(quad(mv(a_), mv(b_), -L, L, '#000000', tint))
    for a_, b_ in ((WL0, WL1), (WR0, WR1)):
        o.append(quad(mv(a_), mv(b_), -L, L, wht, .96))
    for a_, b_ in ((TL0, TL1), (TR0, TR1)):
        o.append(quad(mv(a_), mv(b_), -L, L, ylw))
    # 次路（东西）
    for a_, b_, c_ in ((PL0, PL1, org), (PR0, PR1, org), (BK0, BK1, bl)):
        for u0, u1 in ((-L, -HW), (HW, L)):
            o.append(quad(u0, u1, mv(a_), mv(b_), c_))
            o.append(quad(u0, u1, mv(a_), mv(b_), '#000000', tint))
    for a_, b_ in ((WL0, WL1), (WR0, WR1)):
        for u0, u1 in ((-L, -HW), (HW, L)):
            o.append(quad(u0, u1, mv(a_), mv(b_), wht, .96))
    for a_, b_ in ((TL0, TL1), (TR0, TR1)):
        for u0, u1 in ((-L, -HW), (HW, L)):
            o.append(quad(u0, u1, mv(a_), mv(b_), ylw))
    # 交叉口范围内：次路色彩半透明叠加，形成交织区
    for a_, b_, c_ in ((PL0, PL1, org), (PR0, PR1, org), (BK0, BK1, bl)):
        o.append(quad(-HW, HW, mv(a_), mv(b_), c_, .42))

    # ── 渐进减速标线（四进口） ──
    gaps = (1.5, 2.0, 2.5, 3.0, 3.5)
    for arm in range(4):
        dd = 1.4
        for g in gaps:
            if HW + dd + 0.20 > L - 0.3:
                break
            if arm == 0:      # 南进口（v 负向来车，朝北）
                o.append(quad(mv(BK0 + .05), mv(BK1 - .05), -HW - dd - 0.20, -HW - dd, wht, .93))
            elif arm == 1:
                o.append(quad(mv(BK0 + .05), mv(BK1 - .05), HW + dd, HW + dd + 0.20, wht, .93))
            elif arm == 2:
                o.append(quad(-HW - dd - 0.20, -HW - dd, mv(BK0 + .05), mv(BK1 - .05), wht, .93))
            else:
                o.append(quad(HW + dd, HW + dd + 0.20, mv(BK0 + .05), mv(BK1 - .05), wht, .93))
            dd += g

    # ── 黄色菱形警示色块 ──
    def diamond(u, v, side=DIAM):
        r = side / 2 * 1.15
        return poly([iso(u, v - r), iso(u + r, v), iso(u, v + r), iso(u - r, v)], ylw, .96)

    diam_pos = []
    for off in (2.0, 3.4):
        for cm in (BK0 + 0.55, BK1 - 0.55):
            diam_pos += [(mv(cm), -HW - off), (mv(cm), HW + off),
                         (-HW - off, mv(cm)), (HW + off, mv(cm))]
    for u, v in diam_pos:
        o.append(diamond(u, v))

    # ── 红色冲突点标识 C1—C4 ──
    conf = [(mv(a_), mv(b_)) for a_ in (CYC_L, CYC_R) for b_ in (CYC_L, CYC_R)]
    for u, v in conf:
        r = CONF / 2
        o.append(poly([iso(u - r, v - r), iso(u + r, v - r), iso(u + r, v + r), iso(u - r, v + r)], rd, 0))
        # 圆形：用等距投影下的椭圆近似
        px, py = iso(u, v)
        o.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{r*SS*CA*1.414:.1f}" ry="{r*SS*SA*1.414:.1f}" fill="{rd}" opacity=".96"/>')
        o.append(quad(u - 0.45, u + 0.45, v - 0.055, v + 0.055, wht, .95))
        o.append(quad(u - 0.055, u + 0.055, v - 0.45, v + 0.45, wht, .95))

    # ── LED 地埋灯 ──
    for cm in (LEDL, LEDR):
        t = -L + 1.0
        while t < L:
            if abs(t) > HW + 0.2:
                px, py = iso(mv(cm), t)
                o.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{6.2:.1f}" ry="{3.4:.1f}" '
                         f'fill="{LED if dusk else "#F7C948"}" opacity="{ledop}"/>')
                px, py = iso(t, mv(cm))
                o.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{6.2:.1f}" ry="{3.4:.1f}" '
                         f'fill="{LED if dusk else "#F7C948"}" opacity="{ledop}"/>')
            t += 3.0

    # ── 直立要素：按 (u - v) 从小到大绘制 ──
    upright = []
    # 预警标志牌（四进口各一，设于来向20m外——图中示意两处）
    for u, v, ang in ((HW + 1.2, -HW - 6.0, 0), (-HW - 1.2, HW + 6.0, 0)):
        upright.append((u - v, ('sign', u, v)))
    # 行道树
    for u, v in ((HW + 2.6, HW + 4.2), (-HW - 2.6, HW + 6.4), (HW + 3.2, -HW - 5.2),
                 (-HW - 3.2, -HW - 3.4), (HW + 6.8, HW + 8.0), (-HW - 6.6, -HW - 7.4),
                 (HW + 8.0, -HW - 2.8), (-HW - 7.6, HW + 2.8)):
        upright.append((u - v, ('tree', u, v)))
    # 人物
    upright.append((mv(CYC_L) - (-HW - 3.0), ('cyc', mv(CYC_L), -HW - 3.0, '#2F6DB5')))
    upright.append((mv(CYC_R) - (HW + 4.0), ('cyc', mv(CYC_R), HW + 4.0, '#3C7A46')))
    upright.append((-HW - 3.4 - mv(PL1 - 0.4), ('ped', -HW - 3.4, mv(PL1 - 0.4), '#C8543B')))
    upright.append((mv(PR0 + 0.6) - (HW + 2.2), ('ped', mv(PR0 + 0.6), HW + 2.2, '#D6A22E')))

    for _, item in sorted(upright, key=lambda t: t[0]):
        kind, u, v = item[0], item[1], item[2]
        px, py = iso(u, v)
        if kind == 'tree':
            hgt = 4.3 * SS
            o.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{hgt*0.19:.1f}" ry="{hgt*0.085:.1f}" fill="#000" opacity=".16"/>')
            o.append(tree(px, py, hgt, trunk, leaf, leaf2))
        elif kind == 'sign':
            U = SS
            o.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{U*0.26:.1f}" ry="{U*0.12:.1f}" fill="#000" opacity=".18"/>')
            o.append(rect(px - U * 0.035, py - U * 2.5, U * 0.07, U * 2.5, '#AEB3B9' if not dusk else '#767C84'))
            s_ = U * 0.46
            cyy = py - U * 2.0 - s_ * 0.86
            o.append(poly([(px, cyy - s_), (px + s_ * .90, cyy + s_ * .62), (px - s_ * .90, cyy + s_ * .62)], '#F2F4F6'))
            o.append(poly([(px, cyy - s_ * .84), (px + s_ * .76, cyy + s_ * .52), (px - s_ * .76, cyy + s_ * .52)], YELLOW))
            o.append(poly([(px, cyy - s_ * .64), (px + s_ * .58, cyy + s_ * .40), (px - s_ * .58, cyy + s_ * .40)], YELLOW, 1, RED, s_ * .10))
            o.append(T(px, cyy + s_ * .28, '!', s_ * .86, 700, INK, 'middle'))
        else:
            col = item[3]
            hpx = 1.74 * SS
            o.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{hpx*0.17:.1f}" ry="{hpx*0.075:.1f}" fill="#000" opacity=".18"/>')
            if kind == 'ped':
                o.append(flat_person(px, py, hpx, figc, figc, col))
            else:
                o.append(flat_cyclist_back(px, py, hpx, figc, col, figc))

    # ── 方位与比例 ──
    nx, ny = 1418, 930
    o.append(f'<line x1="{nx}" y1="{ny}" x2="{nx+38*CA:.1f}" y2="{ny-38*SA:.1f}" stroke="{GREY if not dusk else "#9AA1AA"}" stroke-width="1.6"/>')
    o.append(poly([(nx + 46 * CA, ny - 46 * SA), (nx + 30 * CA + 5, ny - 30 * SA + 7),
                   (nx + 30 * CA - 6, ny - 30 * SA - 5)], GREY if not dusk else '#9AA1AA'))
    o.append(T(nx + 54 * CA, ny - 52 * SA, 'N', 13, 700, GREY if not dusk else '#9AA1AA'))

    if callouts:
        o.append(rect(0, 96, W, 904, '#FFFFFF' if not dusk else '#000000', 0, .22))
        cs = [(1, iso(mv(BK0 + .55), -HW - 2.0)[0], iso(mv(BK0 + .55), -HW - 2.0)[1], 1224, 592,
               '黄色菱形警示色块', 'Pantone 116 C  边长600mm'),
              (2, iso(conf[1][0], conf[1][1])[0], iso(conf[1][0], conf[1][1])[1], 1224, 664,
               '冲突点红色标识', 'Pantone 485 C  直径800mm  共4处'),
              (3, iso(mv(CYC_L), -HW - 6.0)[0], iso(mv(CYC_L), -HW - 6.0)[1], 372, 596,
               '渐进减速标线', '宽200mm  间距4.0→1.5m', 'end'),
              (4, iso(-HW - 4.0, mv(BK1 - .4))[0], iso(-HW - 4.0, mv(BK1 - .4))[1], 372, 672,
               '次路进口道同构布设', '四个进口对称，预警语义一致', 'end'),
              (5, iso(0, 0)[0], iso(0, 0)[1], 1224, 736, '交叉口交织区',
               '两路分区铺装半透明叠合，路权归属仍可读'),
              (6, iso(-HW - 1.2, HW + 6.0)[0], iso(-HW - 1.2, HW + 6.0)[1] - 56, 372, 748,
               '交叉口预警标志牌', '设于来向20m处，约4.8s读取时距', 'end')]
        for c in cs:
            an = c[7] if len(c) > 7 else 'start'
            o.append(callout(c[0], c[1], c[2], c[3], c[4], c[5], c[6], INK, 13, an))

    return ''.join(d), ''.join(o)


def persp_fig(name, dusk, sub, callouts=False, footnote=''):
    defs, body = aerial(dusk, callouts)
    o = [body]
    o.append(rect(0, 0, W, 96, PAPER))
    o.append(rect(0, 1000, W, 60, PAPER))
    o.append(title_block(W, '图10', '交叉口部署预警标志设计原型', sub, 46))
    o.append(foot(W, H, footnote, '各项取值依表38《安全引导系统设计参数规范》'))
    write(name, page(W, H, ''.join(o), defs))


# ══════════════════════════ 10-D 平面布置图 ══════════════════════════

def plan(name='fig10-D', logic=False):
    w, h = 1600, 1060
    o, d = [], [arrow_marker('ah', GREY, 6)]
    cx, cy = 660, 552
    S = 34.0                                   # 每米像素
    HALF = RW / 2 * S
    ARM = 322.0                                # 进口道绘制长度（像素）

    def MX(m):
        return cx + (m - RW / 2) * S

    def MY(m):
        return cy + (m - RW / 2) * S

    # 绿地底
    o.append(rect(cx - ARM - HALF - 34, cy - ARM - HALF - 34,
                  2 * (ARM + HALF + 34), 2 * (ARM + HALF + 34), '#EDF1EA'))
    # 四个象限的绿地
    for sx in (-1, 1):
        for sy in (-1, 1):
            o.append(rect(cx + sx * HALF if sx > 0 else cx - ARM - HALF,
                          cy + sy * HALF if sy > 0 else cy - ARM - HALF,
                          ARM, ARM, '#D3E0CC'))
    # 路面
    o.append(rect(cx - HALF, cy - ARM - HALF, RW * S, 2 * ARM + RW * S, '#5B6068'))
    o.append(rect(cx - ARM - HALF, cy - HALF, 2 * ARM + RW * S, RW * S, '#5B6068'))

    def vstrip(a, b, c, op=1):
        return rect(MX(a), cy - ARM - HALF, (b - a) * S, 2 * ARM + RW * S, c, 0, op)

    def hstrip(a, b, c, op=1):
        return rect(cx - ARM - HALF, MY(a), 2 * ARM + RW * S, (b - a) * S, c, 0, op)

    for a, b, c in ((PL0, PL1, ORANGE), (PR0, PR1, ORANGE), (BK0, BK1, BLUE)):
        o.append(vstrip(a, b, c))
        o.append(hstrip(a, b, c))
    for a, b in ((WL0, WL1), (WR0, WR1)):
        o.append(vstrip(a, b, WHITE))
        o.append(hstrip(a, b, WHITE))
    for a, b in ((TL0, TL1), (TR0, TR1)):
        o.append(vstrip(a, b, YELLOW))
        o.append(hstrip(a, b, YELLOW))
    # 交叉口范围：仅将次路骑行区以半透明叠加，标示两向骑行流的交织范围
    o.append(rect(cx - HALF, MY(BK0), RW * S, (BK1 - BK0) * S, BLUE, 0, .38))
    o.append(rect(MX(BK0), cy - HALF, (BK1 - BK0) * S, RW * S, BLUE, 0, .12))
    o.append(rect(cx - HALF, cy - HALF, RW * S, RW * S, 'none', 0, 1, WHITE, 2))

    # 渐进减速标线（四个进口）
    gaps = (1.5, 2.0, 2.5, 3.0, 3.5, 4.0)
    for ang in range(4):
        dd = 1.5
        for g in gaps:
            t = dd * S
            if ang == 0:      # 南进口（自下而上）
                o.append(rect(MX(BK0 + .05), cy + HALF + t, (BK1 - BK0 - .1) * S, 0.20 * S, WHITE, 0, .95))
            elif ang == 1:    # 北进口
                o.append(rect(MX(BK0 + .05), cy - HALF - t - 0.20 * S, (BK1 - BK0 - .1) * S, 0.20 * S, WHITE, 0, .95))
            elif ang == 2:    # 西进口
                o.append(rect(cx - HALF - t - 0.20 * S, MY(BK0 + .05), 0.20 * S, (BK1 - BK0 - .1) * S, WHITE, 0, .95))
            else:             # 东进口
                o.append(rect(cx + HALF + t, MY(BK0 + .05), 0.20 * S, (BK1 - BK0 - .1) * S, WHITE, 0, .95))
            dd += g

    # 黄色菱形警示色块
    def diamond(px, py, side):
        r = side * S / 2
        return poly([(px, py - r), (px + r, py), (px, py + r), (px - r, py)], YELLOW, .96)

    for off in (2.0, 3.4):
        for cm in (BK0 + 0.55, BK1 - 0.55):
            o.append(diamond(MX(cm), cy + HALF + off * S, DIAM))
            o.append(diamond(MX(cm), cy - HALF - off * S, DIAM))
            o.append(diamond(cx - HALF - off * S, MY(cm), DIAM))
            o.append(diamond(cx + HALF + off * S, MY(cm), DIAM))

    # 红色冲突点标识
    pts = [(MX(a), MY(b)) for a in (CYC_L, CYC_R) for b in (CYC_L, CYC_R)]
    for px, py in pts:
        o.append(circ(px, py, CONF * S / 2, RED, .95))
        o.append(rect(px - 0.45 * S, py - 0.055 * S, 0.90 * S, 0.11 * S, WHITE, 0, .95))
        o.append(rect(px - 0.055 * S, py - 0.45 * S, 0.11 * S, 0.90 * S, WHITE, 0, .95))

    if logic:
        # 骑行流线与冲突点生成逻辑
        for cm, sgn in ((CYC_L, 1), (CYC_R, -1)):
            o.append(f'<line x1="{MX(cm):.1f}" y1="{cy+ARM+HALF-20:.1f}" x2="{MX(cm):.1f}" '
                     f'y2="{cy-ARM-HALF+20:.1f}" stroke="#12325C" stroke-width="3" '
                     f'stroke-dasharray="12 8" opacity=".85" marker-end="url(#ah)"/>' if sgn > 0 else
                     f'<line x1="{MX(cm):.1f}" y1="{cy-ARM-HALF+20:.1f}" x2="{MX(cm):.1f}" '
                     f'y2="{cy+ARM+HALF-20:.1f}" stroke="#12325C" stroke-width="3" '
                     f'stroke-dasharray="12 8" opacity=".85" marker-end="url(#ah)"/>')
        for cm, sgn in ((CYC_L, 1), (CYC_R, -1)):
            o.append(f'<line x1="{cx-ARM-HALF+20:.1f}" y1="{MY(cm):.1f}" x2="{cx+ARM+HALF-20:.1f}" '
                     f'y2="{MY(cm):.1f}" stroke="#12325C" stroke-width="3" stroke-dasharray="12 8" '
                     f'opacity=".85" marker-end="url(#ah)"/>' if sgn > 0 else
                     f'<line x1="{cx+ARM+HALF-20:.1f}" y1="{MY(cm):.1f}" x2="{cx-ARM-HALF+20:.1f}" '
                     f'y2="{MY(cm):.1f}" stroke="#12325C" stroke-width="3" stroke-dasharray="12 8" '
                     f'opacity=".85" marker-end="url(#ah)"/>')
        offs = [(-1, -1), (-1, 1), (1, -1), (1, 1)]
        for i, (px, py) in enumerate(pts):
            o.append(circ(px, py, CONF * S / 2 + 9, RED, .18))
            ox_, oy_ = offs[i]
            o.append(T(px + ox_ * 30, py + oy_ * 30 + 5, f'C{i+1}', 13.5, 700, RED, 'middle'))

    # 尺寸标注
    o.append(dim_h(MX(0), MX(RW), cy - ARM - HALF - 34, '5500'))
    o.append(dim_v(MY(0), MY(RW), cx - ARM - HALF - 34, '5500'))
    o.append(dim_v(cy + HALF, cy + HALF + 2.0 * S, MX(0) - 26, '2000'))
    o.append(dim_v(cy + HALF + 2.0 * S, cy + HALF + 3.4 * S, MX(0) - 26, '1400'))
    o.append(dim_h(MX(CYC_L), MX(CYC_R), cy - HALF - 1.8 * S, '骑行流间距1100'))

    # 图例
    lx, ly = 1206, 196
    o.append(T(lx, ly - 20, '图  例', 14, 700))
    items = [(YELLOW, '菱形警示色块', 'Pantone 116 C  边长600mm'),
             (RED, '冲突点标识', 'Pantone 485 C  直径800mm'),
             (WHITE, '渐进减速标线', '宽200mm  间距4.0→1.5m'),
             (BLUE, '骑行区铺装', 'Pantone 2935 C'),
             (ORANGE, '行人区铺装', 'Pantone 1585 C')]
    for i, (c, a, b) in enumerate(items):
        o.append(legend_sw(lx, ly + i * 46, c, a, b, 24, 14, LINE if c == WHITE else None))

    note = ['交叉口内两条双向骑行流相互交叉，', '形成 C1—C4 共 4 个冲突点；', '警示色块布设于各进口道冲突点',
            '上游 2.0m 与 3.4m 处，使骑行者', '在到达冲突点前获得两次预警。']
    for i, t_ in enumerate(note):
        o.append(T(lx, ly + 310 + i * 25, t_, 12.5, 400, GREY if i else INK))

    ttl = ('交叉口预警要素布设逻辑图' if logic else '交叉口预警标志平面布置图')
    sub = ('骑行流线交叉关系与冲突点 C1—C4 的生成' if logic else '比例 1∶65　单位：mm')
    o.append(title_block(w, '图10', ttl, sub, 46))
    o.append(foot(w, h, ('备选方案 10-E　布设逻辑图' if logic else '备选方案 10-D　平面布置图'),
                  '各项取值依表38《安全引导系统设计参数规范》'))
    write(name, page(w, h, ''.join(o), ''.join(d)))


# ══════════════════════════ 10-F 要素规格详图 ══════════════════════════

def spec():
    w, h = 1600, 1060
    o, d = [], [arrow_marker('ah2', GREY, 6)]
    o.append(title_block(w, '图10', '交叉口预警要素规格详图与速度诱导机理',
                         '单位：mm　　速度诱导机理对应 4.4.2 节“决策点供给”原则', 46))

    # ① 菱形警示色块
    x0, y0 = 120, 200
    o.append(T(x0, y0, '① 黄色菱形警示色块', 16, 700))
    o.append(T(x0, y0 + 24, 'Pantone 116 C　RGB(255,205,0)', 12.5, 400, GREY))
    S1 = 150
    ccx, ccy = x0 + 150, y0 + 190
    o.append(poly([(ccx, ccy - S1 / 2 * 1.414), (ccx + S1 / 2 * 1.414, ccy),
                   (ccx, ccy + S1 / 2 * 1.414), (ccx - S1 / 2 * 1.414, ccy)], YELLOW))
    o.append(dim_h(ccx - S1 / 2 * 1.414, ccx, ccy + S1 / 2 * 1.414 + 34, '600'))
    o.append(line(ccx - S1 / 2 * 1.414, ccy, ccx - S1 / 2 * 1.414, ccy + S1 / 2 * 1.414 + 40, LINE, .8, '3 3'))
    o.append(line(ccx, ccy, ccx, ccy + S1 / 2 * 1.414 + 40, LINE, .8, '3 3'))
    o.append(T(x0, y0 + 396, '菱形朝向与通行方向成45°，', 12.5, 400, GREY))
    o.append(T(x0, y0 + 420, '在低视角下的可见面积大于同面积方块。', 12.5, 400, GREY))

    # ② 冲突点标识
    x0 = 560
    o.append(T(x0, y0, '② 冲突点红色标识', 16, 700))
    o.append(T(x0, y0 + 24, 'Pantone 485 C　RGB(218,41,28)', 12.5, 400, GREY))
    ccx, ccy, R2 = x0 + 150, y0 + 190, 105
    o.append(circ(ccx, ccy, R2, RED))
    o.append(rect(ccx - R2 * .62, ccy - R2 * .075, R2 * 1.24, R2 * .15, WHITE))
    o.append(rect(ccx - R2 * .075, ccy - R2 * .62, R2 * .15, R2 * 1.24, WHITE))
    o.append(dim_h(ccx - R2, ccx + R2, ccy + R2 + 34, '800'))
    o.append(line(ccx - R2, ccy, ccx - R2, ccy + R2 + 40, LINE, .8, '3 3'))
    o.append(line(ccx + R2, ccy, ccx + R2, ccy + R2 + 40, LINE, .8, '3 3'))
    o.append(T(x0, y0 + 396, '十字形白色内标使标识在潮湿路面', 12.5, 400, GREY))
    o.append(T(x0, y0 + 420, '反光条件下仍具备形态辨识度。', 12.5, 400, GREY))

    # ③ 视认距离
    x0 = 1000
    o.append(T(x0, y0, '③ 视认距离与预警时距', 16, 700))
    o.append(T(x0, y0 + 24, '依 15km/h 通行速度与 3.5s 反应时间推算', 12.5, 400, GREY))
    bx, by = x0, y0 + 92
    rows = [('通行速度', '15 km/h ＝ 4.17 m/s'),
            ('要求反应时间', '3.5 s'),
            ('对应视认距离', '4.17 × 3.5 ≈ 14.6 m'),
            ('第二列色块位置', '冲突点上游 3.4 m'),
            ('第一列色块位置', '冲突点上游 2.0 m'),
            ('标志牌设置位置', '交叉口来向 20 m（约4.8 s）')]
    for i, (k_, v_) in enumerate(rows):
        o.append(rect(bx, by + i * 38, 460, 32, PAPER2 if i % 2 == 0 else '#FFFFFF', 3))
        o.append(T(bx + 14, by + i * 38 + 21, k_, 12.5, 500))
        o.append(T(bx + 200, by + i * 38 + 21, v_, 12.5, 400, GREY))

    o.append(line(96, 596, w - 96, 596, LINE, 1))

    # ④ 渐进减速标线的速度诱导机理
    o.append(T(120, 648, '④ 渐进减速标线的速度诱导机理', 16, 700))
    o.append(T(120, 672, '间距自 4.0m 递减至 1.5m。等速通过时，标线的掠过频率持续升高，'
                         '使骑行者产生“速度正在增加”的错觉，从而主动减速。', 12.5, 400, GREY))
    gx0, gy = 150, 830
    gaps = (4.0, 3.5, 3.0, 2.5, 2.0, 1.5)
    total = sum(gaps)
    SCALE = 1000.0 / total
    px = gx0
    o.append(rect(gx0 - 30, gy - 46, 1000 + 92, 92, PAPER2, 6))
    for i, g in enumerate(gaps):
        o.append(rect(px, gy - 30, 8, 60, INK, 1))
        if i < len(gaps):
            o.append(dim_h(px, px + g * SCALE, gy + 52, f'{int(g*1000)}', GREY, 11.5, 4))
        px += g * SCALE
    o.append(rect(px, gy - 30, 8, 60, INK, 1))
    o.append(f'<line x1="{gx0-14}" y1="{gy-64}" x2="{px+14}" y2="{gy-64}" stroke="{GREY}" '
             f'stroke-width="1.4" marker-end="url(#ah2)"/>')
    o.append(T(gx0, gy - 74, '通行方向', 12, 500, GREY))
    o.append(T(px + 22, gy - 58, '交叉口', 13, 700, RED))
    o.append(T(px + 22, gy - 38, '冲突点', 13, 700, RED))

    # 掠过频率曲线
    fx0, fy0, fw, fh = 150, 960, 1000, 0
    o.append(T(1224, 892, '标线掠过频率（次/秒）', 13, 700, INK))
    freqs = [4.17 / g for g in gaps]
    for i, (g, f_) in enumerate(zip(gaps, freqs)):
        o.append(T(1224, 920 + i * 25, f'间距 {g:.1f} m　→　{f_:.2f} 次/秒', 12.5, 400, GREY))

    o.append(foot(w, h, '备选方案 10-F　要素规格详图', '各项取值依表38《安全引导系统设计参数规范》'))
    write('fig10-F', page(w, h, ''.join(o), ''.join(d)))


def build():
    persp_fig('fig10-A', False, '交叉口轴测鸟瞰效果图（日间）', False, '备选方案 10-A　轴测鸟瞰效果图·日间')
    persp_fig('fig10-B', True, '交叉口轴测鸟瞰效果图（夜间，预警要素与地埋灯带点亮）', False, '备选方案 10-B　轴测鸟瞰效果图·夜间')
    persp_fig('fig10-C', False, '交叉口轴测鸟瞰效果图（六项预警要素标注）', True, '备选方案 10-C　轴测鸟瞰·要素标注版')
    plan('fig10-D', logic=False)
    plan('fig10-E', logic=True)
    spec()


if __name__ == '__main__':
    build()
