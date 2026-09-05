# -*- coding: utf-8 -*-
"""图9  面向高校共享道路主要参与者的安全引导系统设计原型  —  6 张备选。
横断面分配（总宽 5.50m，对应附录A中 P07 路段实测宽度）：
  0.00–1.20 行人区(橙)  1.20–1.35 白色实线150mm  1.35–1.65 黄色触感警示条300mm
  1.65–3.85 骑行区(蓝，双向2.20m)
  3.85–4.15 触感条  4.15–4.30 白线  4.30–5.50 行人区(橙)
"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *

W, H = 1600, 1060
RW = 5.5
PL0, PL1 = 0.00, 1.20          # 左行人区
WL0, WL1 = 1.20, 1.35          # 左白线
TL0, TL1 = 1.35, 1.65          # 左触感条
BK0, BK1 = 1.65, 3.85          # 骑行区
TR0, TR1 = 3.85, 4.15
WR0, WR1 = 4.15, 4.30
PR0, PR1 = 4.30, 5.50
LEDL, LEDR = 1.275, 4.225      # 灯带中心
CYC_L, CYC_R = 2.20, 3.30      # 两个骑行方向的中心

OUT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src_html'))
os.makedirs(OUT, exist_ok=True)


def write(name, html):
    open(os.path.join(OUT, name + '.html'), 'w', encoding='utf-8').write(html)
    print('  ·', name)


# ══════════════════════════ 透视场景 ══════════════════════════

def ground_glyph(P, d, cm, len_m, wid_m, dpath, color, fill='none', sw=6, op=1, box=100):
    """把单位框图形按地面透视投放到 (d, cm)。"""
    yf, yn = P.y(d + len_m), P.y(d)
    xc = (P.xm(d + len_m, cm) + P.xm(d, cm)) / 2
    w = ((P.xm(d + len_m, cm + wid_m / 2) - P.xm(d + len_m, cm - wid_m / 2)) +
         (P.xm(d, cm + wid_m / 2) - P.xm(d, cm - wid_m / 2))) / 2
    return sprite(dpath, xc - w / 2, yf, w, yn - yf, color, sw, op, box, fill)


def scene(dusk=False):
    """返回 (defs, body, P)。绘图区 y∈[96, 1000]。"""
    ytop, ybot = 96, 1000
    P = Persp(788, 452, 1000, 424, near_d=11.5, road_w=RW)
    ppm = lambda dd: 2 * P.half(dd) / RW          # 距离 dd 处每米对应的像素
    d, o = [], []
    FAR = 260.0

    if dusk:
        d.append(sky_dusk())
        grass, grass2, grass3 = '#31462C', '#3A5233', '#283A25'
        asph = '#33383F'
        curb = '#767C84'
        bl, org, ylw, wht = '#0A4894', '#C24D10', '#D9AE0A', '#DFE4E9'
        bldg, roof, win = '#4E453D', '#3A322D', '#F5CE83'
        trunk, leaf, leaf2 = '#2A231C', '#2C4429', '#365332'
        hedge = '#2C4128'
        walkc = '#6E737A'
        glow, tint = .95, .30
        figc = '#12161B'
    else:
        d.append(sky(W, 442, '#A9CBE8', '#E9F2F8'))
        grass, grass2, grass3 = '#6E9C57', '#7BA863', '#5C8749'
        asph = '#565B62'
        curb = '#C4C7C4'
        bl, org, ylw, wht = BLUE, ORANGE, YELLOW, WHITE
        bldg, roof, win = '#CBB29C', '#93745E', '#93B3C8'
        trunk, leaf, leaf2 = '#5B4835', '#517F44', '#659155'
        hedge = '#4E7A40'
        walkc = '#CFD2D0'
        glow, tint = .55, .13
        figc = '#28323C'

    o.append(rect(0, ytop, W, 442 - ytop, 'url(#sky)'))
    if not dusk:
        o.append(f'<ellipse cx="1180" cy="200" rx="150" ry="46" fill="#FFFFFF" opacity=".55"/>')
        o.append(f'<ellipse cx="1090" cy="214" rx="105" ry="34" fill="#FFFFFF" opacity=".45"/>')
        o.append(f'<ellipse cx="352" cy="176" rx="118" ry="34" fill="#FFFFFF" opacity=".40"/>')

    # ── 远景建筑（贴在地平线上，前有树篱遮挡脚部） ──
    for x, bw, bh, op in ((78, 232, 132, .92), (330, 138, 96, .88),
                          (1120, 212, 122, .92), (1352, 168, 92, .88)):
        o.append(building(x, 448, bw, bh, bldg, roof, win, 5, 3, op))

    # ── 地面 ──
    o.append(rect(0, 442, W, ybot - 442, grass))
    # 透视草地条带
    dd = 4.0
    tog = 0
    while dd < 160:
        y0, y1 = P.y(dd + 6), P.y(dd)
        o.append(rect(0, y0, W, max(1.0, y1 - y0), grass2 if tog else grass3, 0, .12))
        tog ^= 1
        dd += 6.0
    # 树篱与远景绿带
    o.append(rect(0, 440, W, 16, hedge, 0, .95))
    o.append(rect(0, 452, W, 12, grass3, 0, .55))

    # ── 两侧步道（人行道铺装带，位于绿化带之外） ──
    o.append(poly(P.bandm(-6.6, -4.4, 1.0, FAR), walkc, .9))
    o.append(poly(P.bandm(RW + 4.4, RW + 6.6, 1.0, FAR), walkc, .9))

    # ── 路面 ──
    o.append(poly(P.bandm(-0.62, RW + 0.62, 0.6, FAR), curb))
    o.append(poly(P.bandm(-0.62, RW + 0.62, 0.6, FAR), '#000000', .10))
    o.append(poly(P.bandm(0, RW, 0.6, FAR), asph))

    # ── 铺装分区（叠一层暗色，做出沥青质感而非纯色） ──
    for a, b, c in ((PL0, PL1, org), (PR0, PR1, org), (BK0, BK1, bl)):
        o.append(poly(P.bandm(a, b, 0.6, FAR), c))
        o.append(poly(P.bandm(a, b, 0.6, FAR), '#000000', tint))
    # 近处受光
    o.append(poly(P.bandm(0, RW, 0.6, 14), '#FFFFFF', .05))

    # ── 白色分区实线 150mm ──
    for a, b in ((WL0, WL1), (WR0, WR1)):
        o.append(poly(P.bandm(a, b, 0.6, FAR), wht, .96))
    # ── 黄色凸起触感警示条 300mm ──
    for a, b in ((TL0, TL1), (TR0, TR1)):
        o.append(poly(P.bandm(a, b, 0.6, FAR), ylw))
        o.append(poly(P.bandm(a, a + 0.05, 0.6, FAR), '#FFFFFF', .40))
        o.append(poly(P.bandm(b - 0.05, b, 0.6, FAR), '#000000', .18))

    # ── 草坪缓坡减速带 1:8 宽1.5m ──
    dsb = 25.0
    o.append(poly(P.cross(dsb - 0.10, -0.70, RW + 0.70, 1.70), '#4E7A40' if not dusk else '#243A21'))
    o.append(poly(P.cross(dsb, -0.62, RW + 0.62, 1.5), '#79A860' if not dusk else '#3A5730'))
    o.append(poly(P.cross(dsb + 0.30, -0.62, RW + 0.62, 0.62), '#9CC47E' if not dusk else '#4A6B3C'))
    o.append(poly(P.cross(dsb + 1.34, -0.62, RW + 0.62, 0.20), '#000000', .22))

    # ── 渐进减速标线 200mm，间距 4.0→1.5m ──
    dd, gaps = 5.0, (1.5, 2.0, 2.5, 3.0, 3.5, 4.0)
    for g in gaps:
        o.append(poly(P.cross(dd, BK0 + .06, BK1 - .06, 0.20), wht, .90))
        dd += g

    # ── 骑行区中心虚线 ──
    dd = 1.2
    while dd < 90:
        o.append(poly(P.cross(dd, 2.72, 2.78, 1.0), wht, .5))
        dd += 2.6

    # ── 地面路径方向箭头 1200×400mm ──
    o.append(ground_glyph(P, 22.0, CYC_L, 1.20, 0.40, ARROW_D, 'none', wht, 0, .95))
    o.append(ground_glyph(P, 46.0, CYC_L, 1.20, 0.40, ARROW_D, 'none', wht, 0, .95))
    o.append(ground_glyph(P, 11.0, CYC_R, 1.20, 0.40, ARROW_DN, 'none', wht, 0, .95))
    o.append(ground_glyph(P, 31.0, CYC_R, 1.20, 0.40, ARROW_DN, 'none', wht, 0, .95))

    # ── 自行车地面标记 ──
    for dn, cm in ((7.0, CYC_R), (18.0, CYC_L)):
        o.append(ground_glyph(P, dn, cm, 1.45, 0.78, BIKE_D, wht, 'none', 3.4, .92))

    # ── LED 地埋灯 间距3m ──
    dd = 1.5
    while dd < 100:
        for cm in (LEDL, LEDR):
            x, y = P.xm(dd, cm), P.y(dd)
            s = max(1.1, 16 * P.k(dd))
            if dusk:
                o.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{s*3.2:.1f}" ry="{s*1.4:.1f}" fill="{LED}" opacity=".20"/>')
            o.append(f'<ellipse cx="{x:.1f}" cy="{y:.1f}" rx="{s*1.05:.1f}" ry="{s*0.42:.1f}" '
                     f'fill="{LED if dusk else "#F7C948"}" opacity="{glow:.2f}"/>')
        dd += 3.0

    # ── 场景人物（由远及近） ──
    figs = [(40.0, ('ped', 0.60, 1.70, '#C8543B')),
            (30.0, ('cyc', CYC_L, 1.75, '#3C7A46')),
            (21.0, ('ped', 4.88, 1.66, '#3F6FA8')),
            (15.0, ('cyc', CYC_L, 1.78, '#2F6DB5'))]
    for dn, (kind, cm, hm, col) in sorted(figs, key=lambda t: -t[0]):
        px, py = P.xm(dn, cm), P.y(dn)
        hpx = hm * ppm(dn)
        o.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{hpx*0.17:.1f}" ry="{hpx*0.048:.1f}" fill="#000" opacity=".16"/>')
        if kind == 'ped':
            o.append(flat_person(px, py, hpx, figc, figc, col, walk=True))
        else:
            o.append(flat_cyclist_back(px, py, hpx, figc, col, figc))

    # ── 行道树（绿化带内，由远及近） ──
    for dn, off, hm in ((110, -3.8, 4.6), (86, 3.8, 4.4), (66, -3.8, 4.8), (52, 3.8, 4.5),
                        (40, -3.8, 4.7), (31, 3.8, 4.4), (24, -3.8, 4.8), (18.5, 3.8, 4.5)):
        x = P.xm(dn, RW + off) if off > 0 else P.xm(dn, off)
        yb = P.y(dn)
        hgt = hm * ppm(dn)
        o.append(f'<ellipse cx="{x:.1f}" cy="{yb:.1f}" rx="{hgt*0.19:.1f}" ry="{hgt*0.042:.1f}" fill="#000" opacity=".14"/>')
        o.append(tree(x, yb, hgt, trunk, leaf, leaf2))

    # ── 空气透视：远处淡化 ──
    o.append(f'<linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">'
             f'<stop offset="0" stop-color="{"#0E1A2E" if dusk else "#DCE8F2"}" stop-opacity="0.55"/>'
             f'<stop offset="1" stop-color="{"#0E1A2E" if dusk else "#DCE8F2"}" stop-opacity="0"/></linearGradient>')
    o.append(rect(0, 448, W, 140, 'url(#haze)'))

    # ── 限速标识牌（右侧 d=13m，牌面下缘距地2.0m） ──
    dsg = 15.0
    U = ppm(dsg)                                             # 1m 对应像素
    px, py = P.xm(dsg, RW + 1.05), P.y(dsg)
    o.append(f'<ellipse cx="{px:.1f}" cy="{py:.1f}" rx="{U*0.32:.1f}" ry="{U*0.09:.1f}" fill="#000" opacity=".16"/>')
    o.append(rect(px - U * 0.035, py - U * 2.72, U * 0.07, U * 2.72, '#AEB3B9' if not dusk else '#767C84'))
    r = U * 0.36
    cy = py - U * 2.0 - r
    o.append(circ(px, cy, r * 1.10, '#F2F4F6'))
    o.append(circ(px, cy, r, RED))
    o.append(circ(px, cy, r * .74, '#FFFFFF'))
    o.append(T(px, cy + r * .20, '15', r * .80, 700, INK, 'middle'))
    o.append(T(px, cy + r * .66, 'km/h', r * .30, 500, INK, 'middle'))

    return ''.join(d), ''.join(o), P


# ══════════════════════════ 9-A / 9-B / 9-C ══════════════════════════

def persp_fig(name, dusk, sub, with_callouts=False, footnote=''):
    defs, body, P = scene(dusk=dusk)
    o = [body]
    if with_callouts:
        # 半透明白幕，便于阅读标注
        o.append(rect(0, 96, W, 904, '#FFFFFF', 0, .18))
        cs = [
            (1, P.xm(2.0, PR0 + .6), P.y(2.0), 1178, 636, '暖橙色行人区铺装', 'Pantone 1585 C  宽1.20m'),
            (2, P.xm(6.0, CYC_R), P.y(6.0), 1178, 706, '冷蓝色骑行区铺装', 'Pantone 2935 C  双向2.20m'),
            (3, P.xm(3.2, TL1 - .1), P.y(3.2), 250, 706, '黄色凸起触感警示条', '宽300mm  高5mm', 'end'),
            (4, P.xm(4.5, LEDL), P.y(4.5), 250, 636, 'LED地埋灯带', '间距3m  照度≥50lux', 'end'),
            (5, P.xm(5.5, CYC_L), P.y(5.5), 250, 566, '渐进减速标线', '宽200mm  间距4.0→1.5m', 'end'),
            (6, P.xm(20.6, CYC_L), P.y(20.6), 1178, 566, '路径方向箭头', '1200mm×400mm'),
            (7, P.xm(12.0, RW + .75), P.y(12.0) - 150, 1178, 496, '静态限速标识牌', '每100m一处  下缘距地2.0m'),
            (8, P.xm(30.6, RW / 2), P.y(30.6), 250, 496, '草坪缓坡减速带', '缓坡1∶8  宽1.5m', 'end'),
        ]
        for c in cs:
            n, cx, cy, tx, ty, tt, ss = c[0], c[1], c[2], c[3], c[4], c[5], c[6]
            an = c[7] if len(c) > 7 else 'start'
            o.append(callout(n, cx, cy, tx, ty, tt, ss, INK, 13, an))
    o.append(rect(0, 0, W, 96, PAPER))
    o.append(rect(0, 1000, W, 60, PAPER))
    o.append(title_block(W, '图9', '面向高校共享道路主要参与者的安全引导系统设计原型', sub, 46))
    o.append(foot(W, H, footnote, '各项取值依表38《安全引导系统设计参数规范》'))
    write(name, page(W, H, ''.join(o), defs))


# ══════════════════════════ 9-D 平面布置图 ══════════════════════════

def plan():
    w, h = 1600, 1060
    o, d = [], [arrow_marker('ah', GREY, 6)]
    x0, x1 = 300, 1130                      # 路幅横向范围（俯视：路宽横置）
    y0, y1 = 150, 906                       # 纵向（行车方向向上）
    S = (x1 - x0) / RW                      # 1m 对应像素

    def mx(m):
        return x0 + m * S

    # 纵向 1m 对应像素（按 24m 长度铺满）
    LEN = 24.0
    Sy = (y1 - y0) / LEN

    def my(m):
        return y1 - m * Sy

    o.append(rect(x0 - 46, y0, 46, y1 - y0, '#DCE6D4'))
    o.append(rect(x1, y0, 46, y1 - y0, '#DCE6D4'))
    o.append(rect(x0 - 46, y0, 46, y1 - y0, GRASS, stroke=None, op=.35))
    o.append(rect(x1, y0, 46, y1 - y0, GRASS, op=.35))
    o.append(rect(x0, y0, x1 - x0, y1 - y0, '#5B6068'))
    for a, b, c in ((PL0, PL1, ORANGE), (PR0, PR1, ORANGE), (BK0, BK1, BLUE)):
        o.append(rect(mx(a), y0, (b - a) * S, y1 - y0, c))
    for a, b in ((WL0, WL1), (WR0, WR1)):
        o.append(rect(mx(a), y0, (b - a) * S, y1 - y0, WHITE))
    for a, b in ((TL0, TL1), (TR0, TR1)):
        o.append(rect(mx(a), y0, (b - a) * S, y1 - y0, YELLOW))

    # 中心虚线
    yy = y1 - 4
    while yy > y0:
        o.append(rect(mx(2.70), yy - 26, 0.10 * S, 26, WHITE, 0, .6))
        yy -= 46

    # 渐进减速标线（间距 4.0→1.5m，自上而下逼近）
    dd, gaps = 1.2, (1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.0)
    marks = []
    for g in gaps:
        if dd > LEN - 0.6:
            break
        o.append(rect(mx(BK0 + .05), my(dd) - 0.20 * Sy, (BK1 - BK0 - .1) * S, 0.20 * Sy, WHITE, 0, .95))
        marks.append(dd)
        dd += g

    # LED 地埋灯 3m
    dd = 1.0
    while dd < LEN:
        for cm in (LEDL, LEDR):
            o.append(circ(mx(cm), my(dd), 4.6, '#F5B700'))
            o.append(circ(mx(cm), my(dd), 2.2, '#FFF6DA'))
        dd += 3.0

    # 方向箭头 1200×400mm 与自行车标记
    def parrow(cm, dn, up=True):
        L, wd = 1.20 * Sy, 0.40 * S
        return sprite(ARROW_D if up else ARROW_DN, mx(cm) - wd / 2, my(dn) - L, wd, L,
                      'none', 0, .96, 100, WHITE)

    o.append(parrow(CYC_L, 7.6, True))
    o.append(parrow(CYC_L, 18.2, True))
    o.append(parrow(CYC_R, 12.2, False))
    for cm, dn in ((CYC_L, 3.4), (CYC_R, 16.4)):
        o.append(sprite(BIKE_D, mx(cm) - 0.78 * S / 2, my(dn) - 1.45 * Sy, 0.78 * S, 1.45 * Sy,
                        WHITE, 3.4, .95))

    # 草坪缓坡减速带（宽1.5m）
    o.append(rect(x0, my(21.6), x1 - x0, 1.5 * Sy, '#6C9A55'))
    o.append(rect(x0, my(21.6) + 1.5 * Sy * .38, x1 - x0, 1.5 * Sy * .24, '#87B36C'))
    o.append(T((x0 + x1) / 2, my(21.6) + 1.5 * Sy * .62, '草坪缓坡减速带  1∶8  宽1.5m', 12.5, 500, '#22331B', 'middle'))

    # 限速标识牌位置
    o.append(circ(x1 + 23, my(13.0), 11, RED))
    o.append(circ(x1 + 23, my(13.0), 7.4, WHITE))
    o.append(T(x1 + 23, my(13.0) + 3.6, '15', 9.5, 700, INK, 'middle'))
    o.append(line(x1 + 23, my(13.0) + 11, x1 + 23, my(13.0) + 26, GREY, 1.4))
    o.append(T(x1 + 42, my(13.0) - 2, '静态限速标识牌', 12, 500, INK))
    o.append(T(x1 + 42, my(13.0) + 15, '每100m一处  下缘距地2.0m', 11, 400, GREY))

    # 横向尺寸链
    yd = y1 + 40
    segs = [(PL0, PL1, '1200'), (WL0, WL1, '150'), (TL0, TL1, '300'), (BK0, BK1, '2200'),
            (TR0, TR1, '300'), (WR0, WR1, '150'), (PR0, PR1, '1200')]
    for a, b, lb in segs:
        o.append(dim_h(mx(a), mx(b), yd, lb))
    o.append(dim_h(mx(0), mx(RW), yd + 54, '路幅总宽 5500'))
    for a, b, lb in segs:
        o.append(line(mx(a), y1, mx(a), yd + 6, LINE, .8, '3 3'))
    o.append(line(mx(RW), y1, mx(RW), yd + 60, LINE, .8, '3 3'))

    # 纵向尺寸：减速标线间距
    xd = x0 - 78
    for i in range(len(marks) - 1):
        o.append(dim_v(my(marks[i]), my(marks[i + 1]), xd, f'{gaps[i]*1000:.0f}'.rstrip('0').rstrip('.') if False else f'{int(gaps[i]*1000)}', GREY, 11, 4))
    o.append(T(xd - 52, (my(marks[0]) + my(marks[-1])) / 2, '渐', 12, 500, GREY, 'middle'))
    o.append(T(xd - 52, (my(marks[0]) + my(marks[-1])) / 2 + 16, '进', 12, 500, GREY, 'middle'))
    o.append(T(xd - 52, (my(marks[0]) + my(marks[-1])) / 2 + 32, '减', 12, 500, GREY, 'middle'))
    o.append(T(xd - 52, (my(marks[0]) + my(marks[-1])) / 2 + 48, '速', 12, 500, GREY, 'middle'))

    # 行车方向
    o.append(line(x1 + 118, y1 - 20, x1 + 118, y0 + 40, GREY, 1.4, marker='' ) if False else '')
    o.append(f'<line x1="{x1+118}" y1="{y1-20}" x2="{x1+118}" y2="{y0+40}" stroke="{GREY}" stroke-width="1.4" marker-end="url(#ah)"/>')
    o.append(T(x1 + 130, (y0 + y1) / 2, '通行方向', 12.5, 500, GREY))

    # 图例
    lx, ly = 1290, 180
    o.append(T(lx, ly - 18, '图  例', 14, 700))
    items = [(ORANGE, '行人区铺装', 'Pantone 1585 C'), (BLUE, '骑行区铺装', 'Pantone 2935 C'),
             (WHITE, '分区边界实线', '白色 宽150mm'), (YELLOW, '触感警示条', '黄色凸起 高5mm'),
             ('#F5B700', 'LED地埋灯', '间距3000mm'), ('#6C9A55', '草坪缓坡减速带', '缓坡1∶8')]
    for i, (c, a, b) in enumerate(items):
        o.append(legend_sw(lx, ly + i * 46, c, a, b, 24, 14, LINE if c == WHITE else None))

    o.append(title_block(w, '图9', '安全引导系统设计原型：地面标识系统平面布置图',
                         '比例 1∶50（横向）／示意（纵向）　单位：mm', 46))
    o.append(foot(w, h, '备选方案 9-D　平面布置图', '各项取值依表38《安全引导系统设计参数规范》'))
    write('fig9-D', page(w, h, ''.join(o), ''.join(d)))


# ══════════════════════════ 9-E 横断面图 ══════════════════════════

def section():
    w, h = 1600, 1060
    o = []
    x0, x1 = 220, 1380
    S = (x1 - x0) / RW
    yr = 706                                 # 路面标高
    th = 30                                  # 面层厚度

    def mx(m):
        return x0 + m * S

    o.append(rect(0, yr + th, w, 200, '#EDEFF2'))
    # 路基
    o.append(poly([(x0 - 120, yr + th), (x1 + 120, yr + th), (x1 + 150, yr + th + 92), (x0 - 150, yr + th + 92)], '#D6D9DE'))
    o.append(rect(x0, yr, x1 - x0, th, '#6A7078'))
    # 铺装
    for a, b, c in ((PL0, PL1, ORANGE), (PR0, PR1, ORANGE), (BK0, BK1, BLUE)):
        o.append(rect(mx(a), yr, (b - a) * S, th, c))
    for a, b in ((WL0, WL1), (WR0, WR1)):
        o.append(rect(mx(a), yr, (b - a) * S, th, WHITE))
    # 触感条（凸起 5mm，放大绘制）
    for a, b in ((TL0, TL1), (TR0, TR1)):
        o.append(rect(mx(a), yr - 9, (b - a) * S, th + 9, YELLOW))
        o.append(rect(mx(a), yr - 9, (b - a) * S, 4, '#FFFFFF', 0, .5))
    # LED 地埋灯
    for cm in (LEDL, LEDR):
        o.append(rect(mx(cm) - 9, yr - 4, 18, 12, '#F5B700', 2))
        o.append(path(f'M{mx(cm)-26:.1f},{yr-56:.1f} L{mx(cm):.1f},{yr-6:.1f} L{mx(cm)+26:.1f},{yr-56:.1f} Z',
                      LED, None, 0, .45))
    # 路缘石与绿化
    for sx, sgn in ((x0, -1), (x1, 1)):
        o.append(rect(sx + (0 if sgn > 0 else -34), yr - 14, 34, th + 14, CURB))
        gx = sx + (34 if sgn > 0 else -154)
        o.append(rect(gx, yr - 6, 120, 8 + th, '#6C9A55'))
        for i in range(9):
            xx = gx + 8 + i * 13
            o.append(path(f'M{xx},{yr-6} q3,-16 6,-22', 'none', '#4A7139', 2, .8))

    # 人物与自行车比例示意（背视，与横断面视向一致）
    HP = 1.70 * S * 0.52
    o.append(flat_person(mx(0.60), yr, HP, '#39424C', '#39424C', '#C8543B'))
    o.append(flat_person(mx(4.90), yr, HP, '#39424C', '#39424C', '#3F6FA8'))
    o.append(flat_cyclist_back(mx(2.60), yr, 1.78 * S * 0.52, '#39424C', '#2F6DB5', '#39424C'))

    # 尺寸链
    yd = yr + 120
    segs = [(PL0, PL1, '1200', '行人区'), (WL0, WL1, '150', '实线'), (TL0, TL1, '300', '触感条'),
            (BK0, BK1, '2200', '骑行区（双向）'), (TR0, TR1, '300', '触感条'), (WR0, WR1, '150', '实线'),
            (PR0, PR1, '1200', '行人区')]
    for a, b, lb, nm in segs:
        o.append(dim_h(mx(a), mx(b), yd, lb))
        o.append(line(mx(a), yr + th, mx(a), yd + 6, LINE, .8, '3 3'))
        if (b - a) * S > 70:
            o.append(T((mx(a) + mx(b)) / 2, yd + 34, nm, 12.5, 500, INK, 'middle'))
    o.append(line(mx(RW), yr + th, mx(RW), yd + 68, LINE, .8, '3 3'))
    o.append(dim_h(mx(0), mx(RW), yd + 64, '路幅总宽 5500'))

    # 引出标注
    notes = [
        (mx(0.60), yr - 4, 250, 486, '暖橙色行人区铺装', 'Pantone 1585 C  RGB(255,106,19)', 'end'),
        (mx(2.75), yr - 4, 250, 556, '冷蓝色骑行区铺装', 'Pantone 2935 C  RGB(0,87,184)', 'end'),
        (mx(TL0 + .15), yr - 12, 250, 626, '黄色凸起触感警示条', '高5mm  宽300mm', 'end'),
        (mx(LEDR), yr - 4, 1350, 486, 'LED地埋灯', '间距3m  4000K  ≥50lux'),
        (mx(WR0 + .07), yr - 4, 1350, 556, '分区边界实线', '白色  宽150mm  逆反射'),
        (x1 + 90, yr + 6, 1350, 626, '路缘石与绿化带', '设施带兼作缓冲空间'),
    ]
    for i, nt in enumerate(notes):
        an = nt[6] if len(nt) > 6 else 'start'
        o.append(callout(i + 1, nt[0], nt[1], nt[2], nt[3], nt[4], nt[5], INK, 13, an))

    # 参数速查面板
    px0, py0 = 220, 168
    o.append(rect(px0, py0, 560, 214, PAPER2, 6))
    o.append(T(px0 + 22, py0 + 34, '主要构造参数', 15, 700))
    rows = [('铺装色彩', '骑行区 Pantone 2935 C ／ 行人区 Pantone 1585 C'),
            ('边界实线', '白色，宽150mm，逆反射性能按现行标线标准'),
            ('触感警示条', '黄色凸起，高5mm，宽300mm'),
            ('LED地埋灯', '间距3m，色温4000K，路面平均照度≥50lux'),
            ('明度对比', '蓝∶白=6.9∶1　橙∶白=2.9∶1　蓝∶橙=2.4∶1')]
    for i, (k_, v_) in enumerate(rows):
        o.append(T(px0 + 22, py0 + 66 + i * 30, k_, 12.5, 500, INK))
        o.append(T(px0 + 128, py0 + 66 + i * 30, v_, 12.5, 400, GREY))
    o.append(rect(px0 + 596, py0, 500, 214, PAPER2, 6))
    o.append(T(px0 + 618, py0 + 34, '冗余编码说明', 15, 700))
    txt = ['蓝橙两色的明度对比仅2.4∶1，低于图形要素通常',
           '要求的3∶1，故色彩不作为唯一区分依据：',
           '· 白色实线（对蓝6.9∶1）承担形态区分',
           '· 黄色凸起条承担触觉区分',
           '三重编码并置，使色觉障碍者亦可辨识分界。']
    for i, t_ in enumerate(txt):
        o.append(T(px0 + 618, py0 + 66 + i * 28, t_, 12.5, 400, GREY if i > 1 else INK))

    o.append(title_block(w, '图9', '安全引导系统设计原型：共享道路标准横断面图',
                         '比例 1∶25　单位：mm　（触感条凸起高度按10倍放大绘示）', 46))
    o.append(foot(w, h, '备选方案 9-E　标准横断面图', '各项取值依表38《安全引导系统设计参数规范》'))
    write('fig9-E', page(w, h, ''.join(o)))


# ══════════════════════════ 9-F 轴测分解图 ══════════════════════════

def axon():
    w, h = 1600, 1060
    o = []
    SX, SY = 41.0, 23.0          # 横向/纵向每米像素
    CA, SA = 0.866, 0.5
    LEN = 7.0

    def pt(u, v, ox, oy):
        """u 横向米（0=左缘），v 纵向米。"""
        return (ox + u * SX * CA + v * SY * CA, oy + u * SX * SA - v * SY * SA)

    def plate(ox, oy, fill, op=1, stroke=None, sw=1):
        return poly([pt(0, 0, ox, oy), pt(RW, 0, ox, oy), pt(RW, LEN, ox, oy), pt(0, LEN, ox, oy)],
                    fill, op, stroke, sw)

    def strip(ox, oy, m0, m1, c, op=1, stroke=None, sw=1):
        return poly([pt(m0, 0, ox, oy), pt(m1, 0, ox, oy), pt(m1, LEN, ox, oy), pt(m0, LEN, ox, oy)],
                    c, op, stroke, sw)

    def band(ox, oy, v0, vw, m0, m1, c, op=1):
        return poly([pt(m0, v0, ox, oy), pt(m1, v0, ox, oy),
                     pt(m1, v0 + vw, ox, oy), pt(m0, v0 + vw, ox, oy)], c, op)

    BX, BY, DZ = 392, 252, 156
    labels = [('第①层  铺装色彩', '以冷蓝／暖橙确立路权归属，是其余信息层的依附基础'),
              ('第②层  标线与触感', '白色实线与黄色凸起条界定分区边界，兼作触觉线索'),
              ('第③层  路径与速度', '方向箭头与渐进减速标线，布设于实际决策点'),
              ('第④层  照明', 'LED地埋灯带间距3m，保障夜间分区边界仍可辨识'),
              ('叠合结果  地面引导网络', '同一视域内不并置两层以上信息，避免视觉负荷叠加')]

    for k in range(5):
        ox, oy = BX, BY + k * DZ
        if k == 0:
            o.append(plate(ox, oy, '#5B6068'))
            for a_, b_, c_ in ((PL0, PL1, ORANGE), (PR0, PR1, ORANGE), (BK0, BK1, BLUE)):
                o.append(strip(ox, oy, a_, b_, c_))
        elif k == 4:
            o.append(plate(ox, oy, '#5B6068'))
            for a_, b_, c_ in ((PL0, PL1, ORANGE), (PR0, PR1, ORANGE), (BK0, BK1, BLUE)):
                o.append(strip(ox, oy, a_, b_, c_))
            for a_, b_ in ((WL0, WL1), (WR0, WR1)):
                o.append(strip(ox, oy, a_, b_, WHITE))
            for a_, b_ in ((TL0, TL1), (TR0, TR1)):
                o.append(strip(ox, oy, a_, b_, YELLOW))
        else:
            o.append(plate(ox, oy, '#FFFFFF', .55, '#B9BEC6', 1.1))

        if k in (1, 4):
            if k == 1:
                for a_, b_ in ((WL0, WL1), (WR0, WR1)):
                    o.append(strip(ox, oy, a_, b_, WHITE, 1, '#AEB4BC', .8))
                for a_, b_ in ((TL0, TL1), (TR0, TR1)):
                    o.append(strip(ox, oy, a_, b_, YELLOW))
        if k in (2, 4):
            dd, gaps = 0.5, (1.2, 1.6, 2.0)
            for g in gaps:
                o.append(band(ox, oy, dd, 0.20, BK0 + .05, BK1 - .05, WHITE if k == 4 else '#7A828C', 1 if k == 4 else .9))
                dd += g
            for cm, dn in ((CYC_L, 4.9), (CYC_R, 1.1)):
                hw, L = 0.20, 1.2
                col = WHITE if k == 4 else '#7A828C'
                o.append(poly([pt(cm - hw, dn, ox, oy), pt(cm - hw, dn + L * .62, ox, oy),
                               pt(cm - hw * 2.1, dn + L * .62, ox, oy), pt(cm, dn + L, ox, oy),
                               pt(cm + hw * 2.1, dn + L * .62, ox, oy), pt(cm + hw, dn + L * .62, ox, oy),
                               pt(cm + hw, dn, ox, oy)], col, 1 if k == 4 else .85))
        if k in (3, 4):
            dd = 0.8
            while dd < LEN:
                for cm in (LEDL, LEDR):
                    x_, y_ = pt(cm, dd, ox, oy)
                    o.append(circ(x_, y_, 8.0, '#F7C948', .28))
                    o.append(circ(x_, y_, 3.6, '#F0A500'))
                dd += 3.0

        # 标签
        lx, ly = pt(RW, LEN, ox, oy)
        o.append(line(lx + 8, ly, 1076, ly - 26, GREY_L, 1))
        o.append(line(1076, ly - 26, 1108, ly - 26, GREY_L, 1))
        o.append(T(1120, ly - 30, labels[k][0], 15.5, 700, INK))
        o.append(T(1120, ly - 10, labels[k][1], 12, 400, GREY))

        if k < 4:
            mx_, my_ = pt(RW / 2, LEN / 2, ox, oy)
            o.append(line(mx_, my_ + 46, mx_, my_ + DZ - 46, GREY_L, 1, '5 5', .7))

    o.append(title_block(w, '图9', '安全引导系统设计原型：地面信息的分层构成（轴测分解）',
                         '按“铺装—标线—路径—照明”四层叠合，对应分层减负的设计原则', 46))
    o.append(foot(w, h, '备选方案 9-F　轴测分解图', '各项取值依表38《安全引导系统设计参数规范》'))
    write('fig9-F', page(w, h, ''.join(o)))


def build():
    persp_fig('fig9-A', True, '透视效果图（黄昏，LED地埋灯带点亮）', False, '备选方案 9-A　透视效果图·黄昏')
    persp_fig('fig9-B', False, '透视效果图（日间，突出色彩编码与标线体系）', False, '备选方案 9-B　透视效果图·日间')
    persp_fig('fig9-C', False, '透视效果图（八项设计要素标注）', True, '备选方案 9-C　透视效果图·要素标注版')
    plan()
    section()
    axon()


if __name__ == '__main__':
    build()
