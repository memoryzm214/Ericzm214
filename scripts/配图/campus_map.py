# -*- coding: utf-8 -*-
"""图2  校园共享道路12个观测点  ——  淡绿色系区位分析图。
源图坐标系为 826×558，按 K 倍缩放后落在画布上。"""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
from common import (page, T, rect, poly, line, path, circ, esc, LINE)

W, H = 2000, 1220
K = 1.90                      # 源图 → 画布缩放
OX, OY = 44, 132              # 地图区左上角
PANEL_X = 1660

# ══════════════ 淡绿色系 ══════════════
BG      = '#F6F9F3'           # 纸底
LAND    = '#EEF4E9'           # 校园用地
GREEN0  = '#DFEBD5'           # 一般绿地
GREEN1  = '#CFE2C1'           # 集中绿地
GREEN2  = '#BBD6A9'           # 深一层绿地
WATER   = '#CBE2DC'           # 水面
WATER_D = '#AFD3CA'
ROAD    = '#FFFFFF'           # 路面
ROAD_E  = '#E2ECDA'           # 路缘
BLD1    = '#84B08B'           # 重点建筑（教学科研）
BLD1_D  = '#6A9873'
BLD2    = '#D6E4CC'           # 一般建筑（宿舍等）
BLD2_D  = '#BFD3B2'
COURT   = '#B7D3C2'           # 运动场地
TRACK   = '#CBBFA8'           # 田径场
INK     = '#26382C'           # 主文字
INK2    = '#4E6B55'           # 次文字
INK3    = '#7E9682'           # 弱文字
PIN     = '#2E6B4B'           # 观测点标记
PIN_D   = '#1F4D35'
ACCENT  = '#4E8C68'


def X(x): return OX + x * K
def Y(y): return OY + y * K
def S(v): return v * K


# ══════════════ 数据（源图坐标） ══════════════

# 道路：(x1,y1,x2,y2,宽度)  —— 直线段
ROADS_H = [
    (96, 78, 706, 78, 9),
    (96, 176, 534, 176, 9),
    (4, 266, 790, 266, 12),
    (96, 340, 366, 340, 7),
    (598, 300, 790, 300, 7),
    (598, 388, 790, 388, 7),
]
ROADS_V = [
    (100, 74, 100, 346, 9),
    (268, 0, 268, 270, 8),
    (346, 0, 346, 270, 8),
    (424, 0, 424, 408, 8),
    (500, 0, 500, 306, 8),
    (604, 172, 604, 440, 8),
    (392, 262, 392, 512, 13),      # 中央大道
    (698, 0, 698, 270, 7),
    (58, 262, 58, 424, 7),
    (198, 262, 198, 352, 7),
    (302, 262, 302, 352, 7),
    (758, 262, 758, 474, 7),
    (652, 296, 652, 474, 7),
]

# 建筑：(x, y, w, h, 层级, 标签, 标签方位)  层级 1=重点 2=一般
BUILDINGS = [
    # ── 北侧宿舍区（上排） ──
    (276, 14, 28, 58, 2, '1栋', 'in'), (310, 14, 28, 58, 2, '2栋', 'in'),
    (356, 12, 62, 64, 1, '西苑食堂', 'in'),
    (430, 14, 28, 58, 2, '5栋', 'in'), (464, 14, 28, 58, 2, '6栋', 'in'),
    (498, 14, 28, 58, 2, '7栋', 'in'), (532, 14, 28, 58, 2, '8栋', 'in'),
    (566, 14, 28, 58, 2, '9栋', 'in'), (600, 14, 28, 58, 2, '10栋', 'in'),
    (634, 14, 28, 58, 2, '11栋', 'in'), (668, 14, 28, 58, 2, '12栋', 'in'),
    # ── 教学科研核心 ──
    (120, 96, 54, 68, 1, '教一楼', 'in'),
    (212, 100, 50, 70, 1, '工程一号楼', 'in'),
    (282, 98, 58, 74, 1, '工程二号楼', 'in'),
    (356, 90, 58, 86, 1, '图书馆', 'in'),
    (434, 94, 58, 72, 1, '科技创新中心', 'in'),
    (540, 88, 34, 58, 2, '', ''), (580, 88, 26, 46, 2, '', ''),
    (126, 194, 62, 64, 1, '教二楼', 'in'),
    (208, 192, 40, 64, 1, '教学楼', 'v'),
    (254, 192, 32, 60, 1, '实验楼', 'v'),
    (292, 192, 32, 60, 1, '行政楼', 'v'),
    (328, 192, 32, 60, 1, '教学楼', 'v'),
    (434, 192, 38, 58, 1, '精雕楼', 'in'),
    (478, 192, 26, 52, 2, '', ''),
    # ── 中心广场 ──
    (532, 178, 74, 78, 1, '中心广场', 'in'),
    # ── 附属小学 ──
    (44, 200, 60, 52, 2, '湖北工业大学附属小学', 'in'),
    # ── 南侧教学与科研 ──
    (102, 286, 34, 46, 1, '教三楼', 'v'),
    (146, 284, 58, 50, 1, '综合科技楼', 'in'),
    (212, 304, 36, 42, 2, '3号楼', 'in'),
    (296, 282, 36, 52, 1, '3号楼', 'in'),
    (352, 390, 42, 26, 1, '电气楼', 'in'),
    (352, 420, 42, 22, 2, '南一楼', 'in'),
    # ── 东侧宿舍区 ──
    (612, 180, 26, 26, 2, '10栋', 'in'), (638, 180, 26, 26, 2, '11栋', 'in'),
    (670, 180, 26, 26, 2, '12栋', 'in'), (702, 180, 26, 26, 2, '13栋', 'in'),
    (734, 180, 26, 26, 2, '14栋', 'in'),
    (624, 222, 26, 26, 2, '4栋', 'in'), (656, 222, 26, 26, 2, '5栋', 'in'),
    (688, 222, 26, 26, 2, '6栋', 'in'), (720, 222, 26, 26, 2, '7栋', 'in'),
    (752, 222, 24, 26, 2, '8栋', 'in'),
    (614, 306, 30, 40, 2, '', ''), (662, 306, 30, 40, 2, '', ''),
    (614, 352, 30, 40, 2, '', ''), (662, 352, 30, 40, 2, '', ''),
    (700, 330, 34, 34, 2, '15栋', 'in'), (740, 366, 34, 32, 2, '16栋', 'in'),
    (586, 414, 56, 28, 1, '大学生活动中心', 'in'),
    # ── 南侧宿舍区 ──
    (16, 424, 32, 46, 2, '6栋', 'in'), (54, 424, 32, 46, 2, '5栋', 'in'),
    (92, 424, 32, 46, 2, '4栋', 'in'), (130, 424, 32, 46, 2, '3栋', 'in'),
    (168, 424, 32, 46, 2, '2栋', 'in'), (206, 424, 32, 46, 2, '1栋', 'in'),
    (104, 404, 48, 26, 1, '东苑食堂', 'in'),
    # ── 体育设施 ──
    (466, 342, 34, 34, 1, '体育馆', 'in'),
    (508, 342, 42, 32, 1, '运动场', 'in'),
]

# 运动场地（球场）：(x, y, w, h, 标签)
COURTS = [
    (354, 2, 38, 12, ''), (400, 2, 38, 12, ''),
    (446, 2, 38, 12, ''), (492, 2, 38, 12, ''),
    (538, 2, 38, 12, ''), (584, 2, 38, 12, ''),
    (196, 92, 42, 26, '篮球场'),
]

# 绿地斑块：(x, y, w, h, 圆角, 颜色)
GREENS = [
    (8, 80, 92, 180, 6, GREEN1),
    (8, 268, 50, 148, 6, GREEN0),
    (440, 276, 90, 62, 30, GREEN2),
    (196, 276, 100, 66, 6, GREEN0),
    (306, 276, 80, 66, 6, GREEN0),
    (430, 180, 96, 76, 6, GREEN0),
    (612, 76, 180, 92, 6, GREEN0),
    (616, 448, 170, 40, 6, GREEN0),
    (0, 486, 300, 34, 6, GREEN0),
]

# 观测点：(编号, x, y, 名称)
POINTS = [
    ('01', 152, 272, '教二楼南侧路口'),
    ('02', 266, 176, '工程一号楼东侧'),
    ('03', 300, 76, '北苑宿舍区支路'),
    ('04', 500, 234, '精雕楼东侧路口'),
    ('05', 393, 76, '西苑食堂前广场'),
    ('06', 116, 402, '东苑食堂前路段'),
    ('07', 380, 272, '中央大道主校道'),
    ('08', 206, 180, '工程学院大道西段'),
    ('09', 118, 322, '教三楼西侧路段'),
    ('10', 690, 374, '东苑宿舍区主路'),
    ('11', 662, 270, '中央大道东段'),
    ('12', 334, 132, '图书馆西侧路口'),
]

# 河流（源图坐标控制点）
RIVER = ('M -10,352 C 90,348 140,372 220,382 C 300,392 340,414 420,432 '
         'C 500,450 560,452 640,448 C 720,444 780,452 840,462 '
         'L 840,506 C 780,496 720,488 640,492 C 560,496 500,494 420,476 '
         'C 340,458 300,436 220,426 C 140,416 90,392 -10,396 Z')

# 城市道路（河南侧）
CITY_ROAD = ('M -10,414 C 90,410 140,434 220,444 C 300,454 340,476 420,494 '
             'C 500,512 560,514 640,510 C 720,506 780,514 840,524')


def build():
    d, o = [], []

    # ── 底 ──
    o.append(rect(0, 0, W, H, BG))
    o.append(rect(X(0) - 12, Y(0) - 12, S(826) + 24, S(520) + 24, '#FFFFFF', 10))
    o.append(rect(X(0) - 12, Y(0) - 12, S(826) + 24, S(520) + 24, 'none', 10, 1, '#DCE7D4', 1.2))

    # 校园用地底色
    o.append(rect(X(0), Y(0), S(826), S(520), LAND, 6))

    # ── 绿地斑块 ──
    for x, y, w, h, r, c in GREENS:
        o.append(rect(X(x), Y(y), S(w), S(h), c, r * K * .5))

    # ── 田径场 ──
    tx, ty, tw, th = 126, 16, 138, 50
    o.append(rect(X(tx), Y(ty), S(tw), S(th), '#C9DDBE', S(th) / 2))
    o.append(rect(X(tx) + 6, Y(ty) + 6, S(tw) - 12, S(th) - 12, TRACK, (S(th) - 12) / 2))
    o.append(rect(X(tx) + 22, Y(ty) + 16, S(tw) - 44, S(th) - 32, '#B9D0AE', 10))
    o.append(T(X(tx + tw / 2), Y(ty + th / 2) + 5, '田径场', 15, 500, '#5C6E52', 'middle'))

    o.append(rect(X(348), Y(0), S(300), S(16), GREEN1, 3))
    # ── 球场 ──
    for x, y, w, h, lb in COURTS:
        o.append(rect(X(x), Y(y), S(w), S(h), COURT, 3))
        o.append(rect(X(x) + 3, Y(y) + 3, S(w) - 6, S(h) - 6, 'none', 2, 1, '#FFFFFF', 1.2))
        if lb:
            o.append(T(X(x + w / 2), Y(y + h / 2) + 5, lb, 13, 500, '#3F5A46', 'middle'))

    # ── 水系 ──
    d.append('<linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">'
             f'<stop offset="0" stop-color="{WATER_D}"/><stop offset="1" stop-color="{WATER}"/></linearGradient>')
    o.append(f'<g transform="translate({OX},{OY}) scale({K})">')
    o.append(f'<path d="{RIVER}" fill="url(#wg)"/>')
    o.append(f'<path d="{RIVER}" fill="none" stroke="#FFFFFF" stroke-width="1.1" opacity=".55"/>')
    o.append('</g>')

    # ── 道路 ──
    def road(x1, y1, x2, y2, w):
        g = [line(X(x1), Y(y1), X(x2), Y(y2), ROAD_E, S(w) + 4.5, cap='butt'),
             line(X(x1), Y(y1), X(x2), Y(y2), ROAD, S(w), cap='butt')]
        return ''.join(g)

    for r in ROADS_H + ROADS_V:
        o.append(road(*r))
    # 沿河城市道路
    o.append(f'<g transform="translate({OX},{OY}) scale({K})">')
    o.append(f'<path d="{CITY_ROAD}" fill="none" stroke="{ROAD_E}" stroke-width="9.5" stroke-linecap="butt"/>')
    o.append(f'<path d="{CITY_ROAD}" fill="none" stroke="{ROAD}" stroke-width="7" stroke-linecap="butt"/>')
    o.append('</g>')
    # 中央大道中心线
    o.append(line(X(392), Y(272), X(392), Y(502), '#CFE0C6', 1.6, dash='10 10'))

    # ── 建筑 ──
    for x, y, w, h, tier, lb, pos in BUILDINGS:
        c, cd = (BLD1, BLD1_D) if tier == 1 else (BLD2, BLD2_D)
        o.append(rect(X(x) + 2, Y(y) + 3, S(w), S(h), '#3E5A44', 3, .06))
        o.append(rect(X(x), Y(y), S(w), S(h), cd, 3))
        o.append(rect(X(x), Y(y), S(w), S(h) - 3, c, 3))
        o.append(rect(X(x), Y(y), S(w), 3, '#FFFFFF', 3, .30))
        if tier == 2:
            o.append(rect(X(x), Y(y), S(w), S(h), 'none', 3, .5, '#A9C39C', .9))

    # ── 建筑标签 ──
    for x, y, w, h, tier, lb, pos in BUILDINGS:
        if not lb:
            continue
        cx, cy = X(x + w / 2), Y(y + h / 2)
        col = '#FFFFFF' if tier == 1 else INK2
        n = len(lb)
        if pos == 'v' or (S(w) < n * 13 and S(h) > n * 15):
            fs = 12 if tier == 1 else 11
            for i, ch in enumerate(lb):
                o.append(T(cx, cy - (n - 1) * fs * .62 + i * fs * 1.24 + 4, ch, fs,
                           600 if tier == 1 else 500, col, 'middle'))
        else:
            fs = 12.5 if tier == 1 else 11
            if S(w) < n * fs * 1.05:
                fs = max(8.5, S(w) / (n * 1.06))
            if n >= 7 and S(w) < n * fs * 1.05:
                half = (n + 1) // 2
                o.append(T(cx, cy - 3, lb[:half], fs, 600, col, 'middle'))
                o.append(T(cx, cy + fs + 1, lb[half:], fs, 600, col, 'middle'))
            else:
                o.append(T(cx, cy + fs * .36, lb, fs, 600 if tier == 1 else 500, col, 'middle'))

    # ── 道路名 ──
    def road_label(x, y, s, vertical=False, fs=12):
        if vertical:
            g = []
            for i, ch in enumerate(s):
                g.append(T(X(x), Y(y) + i * fs * 1.3, ch, fs, 500, INK3, 'middle'))
            return ''.join(g)
        return T(X(x), Y(y), s, fs, 500, INK3, 'middle')

    o.append(road_label(176, 187, '教学楼大道'))
    o.append(road_label(300, 187, '工程学院大道'))
    o.append(road_label(452, 187, '工程学院大道'))
    o.append(road_label(240, 279, '中央大道'))
    o.append(road_label(560, 279, '中央大道'))
    o.append(road_label(392, 300, '中央大道', True, 12))
    o.append(T(X(420), Y(470), '巡司河', 14, 500, '#5C8C82', 'middle'))

    # ── 观测点标记 ──
    def pin(no, x, y):
        px, py = X(x), Y(y)
        R = 21
        g = [f'<ellipse cx="{px:.1f}" cy="{py+3:.1f}" rx="{R*.55:.1f}" ry="{R*.2:.1f}" fill="#1F4D35" opacity=".22"/>']
        g.append(circ(px, py - R * 1.42, R + 12, PIN, .10))
        # 水滴形
        g.append(path(f'M{px:.1f},{py:.1f} '
                      f'C{px-R*.72:.1f},{py-R*.86:.1f} {px-R:.1f},{py-R*1.32:.1f} {px-R:.1f},{py-R*1.62:.1f} '
                      f'A{R:.1f},{R:.1f} 0 1,1 {px+R:.1f},{py-R*1.62:.1f} '
                      f'C{px+R:.1f},{py-R*1.32:.1f} {px+R*.72:.1f},{py-R*.86:.1f} {px:.1f},{py:.1f} Z',
                      PIN))
        g.append(circ(px, py - R * 1.62, R * .70, '#FFFFFF', .96))
        g.append(T(px, py - R * 1.62 + 6.5, no, 16.5, 700, PIN_D, 'middle'))
        return ''.join(g)

    for no, x, y, nm in POINTS:
        o.append(pin(no, x, y))

    # ══ 标题 ══
    o.append(T(48, 62, '图2', 27, 700, INK))
    o.append(T(102, 62, '校园共享道路12个观测点', 22, 500, INK))
    o.append(T(48, 92, '湖北工业大学主校区  ·  观测点位分布图', 14, 400, INK3))
    o.append(line(48, 108, W - 48, 108, '#DCE7D4', 1.2))

    # ══ 指北针（原图北向为左） ══
    nx, ny = X(46), Y(64)
    o.append(circ(nx, ny, 30, '#FFFFFF', .9))
    o.append(circ(nx, ny, 30, 'none', 1, '#DCE7D4', 1.2))
    o.append(poly([(nx - 20, ny), (nx + 8, ny - 11), (nx + 2, ny), (nx + 8, ny + 11)], ACCENT))
    o.append(T(nx + 2, ny - 18, 'N', 12, 700, INK2, 'middle'))

    # ══ 比例尺 ══
    sx, sy = X(18), Y(498)
    o.append(rect(sx, sy, 60, 7, ACCENT, 1))
    o.append(rect(sx + 60, sy, 60, 7, '#FFFFFF', 1))
    o.append(rect(sx, sy, 120, 7, 'none', 1, 1, ACCENT, 1))
    o.append(T(sx, sy + 24, '0', 11, 500, INK3, 'middle'))
    o.append(T(sx + 60, sy + 24, '100', 11, 500, INK3, 'middle'))
    o.append(T(sx + 120, sy + 24, '200m', 11, 500, INK3, 'middle'))

    # ══ 右侧图例与点位表 ══
    px = PANEL_X
    o.append(T(px, 176, '图  例', 16, 700, INK))
    o.append(line(px, 190, W - 48, 190, '#DCE7D4', 1.2))
    leg = [(BLD1, '教学科研与公共建筑'), (BLD2, '宿舍及其他建筑'),
           (GREEN1, '绿地与开敞空间'), (COURT, '运动场地'),
           (WATER, '水系（巡司河）'), (ROAD, '道路')]
    for i, (c, lb) in enumerate(leg):
        yy = 214 + i * 30
        o.append(rect(px, yy - 11, 26, 15, c, 3,
                      stroke='#C6D6BC' if c in (ROAD, GREEN1) else None, sw=1))
        o.append(T(px + 36, yy + 1, lb, 12.5, 400, INK2))

    o.append(T(px, 424, '观测点位', 16, 700, INK))
    o.append(line(px, 438, W - 48, 438, '#DCE7D4', 1.2))
    for i, (no, x, y, nm) in enumerate(POINTS):
        yy = 464 + i * 34
        o.append(circ(px + 13, yy - 4, 13, PIN))
        o.append(T(px + 13, yy + 0.5, no, 11.5, 700, '#FFFFFF', 'middle'))
        o.append(T(px + 36, yy + 1, f'P{no}', 12.5, 700, INK))
        o.append(T(px + 76, yy + 1, nm, 12, 400, INK2))

    o.append(line(px, 900, W - 48, 900, '#DCE7D4', 1.2))
    note = ['观测点依前期踏勘选取，覆盖教学区、',
            '宿舍区、食堂与体育设施四类人流集散端，',
            '并包含弯道、交叉口与出入口三类空间类型。']
    for i, t_ in enumerate(note):
        o.append(T(px, 928 + i * 22, t_, 11.5, 400, INK3))

    return page(W, H, ''.join(o), ''.join(d), bg=BG)


if __name__ == '__main__':
    out = os.path.join(os.path.dirname(__file__), 'html')
    os.makedirs(out, exist_ok=True)
    open(os.path.join(out, 'campus.html'), 'w', encoding='utf-8').write(build())
    print('ok')
