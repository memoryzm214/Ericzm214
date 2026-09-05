# -*- coding: utf-8 -*-
"""图11  立面动态提示装置设计原型  —  6 张备选。
依 4.4.3 节与表38：屏幕主信息区占 70% 面积、侧栏辅助信息区占 30%；
装置设于交叉口来向 20m 处（15km/h 通行时约 4.8s 读取时距）。"""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from common import *
import fig9
from fig9 import W, H, RW, PL0, PL1, BK0, BK1, PR0, PR1, CYC_L, CYC_R, write

# 装置尺寸（米）
DEV_H = 2.40        # 总高
BASE_H = 0.62       # 底座高
SCR_H = 1.62        # 屏体高
SCR_W = 0.96        # 屏体宽
BEZEL = 0.05

SCR_BG = '#0E1A2B'
SCR_BG2 = '#132338'
SIDE_BG = '#0B1524'
C_OK = '#3DBE7C'
C_WARN = '#F5B426'
C_ALERT = '#E8543F'
C_TXT = '#E8EEF5'
C_DIM = '#8FA3B8'
C_ACC = '#48A0F0'


# ══════════════════════════ 屏幕界面 ══════════════════════════

def screen_ui(x, y, w, h, detail=True, glow=False):
    """屏幕内容。主信息区占宽70%，侧栏占30%（即面积 70%∶30%）。"""
    o = []
    mw = w * 0.70
    sw = w - mw
    o.append(rect(x, y, w, h, SCR_BG, 3))
    o.append(rect(x + mw, y, sw, h, SIDE_BG))
    o.append(line(x + mw, y + 6, x + mw, y + h - 6, '#24384F', 1))
    if not detail:
        # 场景中的小尺寸：以色块示意
        o.append(rect(x + w * .05, y + h * .06, mw - w * .10, h * .30, '#1B3350', 2))
        o.append(rect(x + w * .12, y + h * .12, mw - w * .30, h * .16, C_OK, 2, .85))
        o.append(rect(x + w * .05, y + h * .42, mw - w * .10, h * .26, C_WARN, 2, .9))
        o.append(rect(x + w * .05, y + h * .74, mw - w * .10, h * .20, '#1B3350', 2))
        for i in range(3):
            o.append(rect(x + mw + sw * .16, y + h * (.10 + i * .30), sw * .68, h * .20, '#1B3350', 2))
        return ''.join(o)

    P = w * 0.030          # 内边距
    # ── 主信息区 ──
    o.append(T(x + P, y + h * .072, '速度反馈', w * .030, 700, C_DIM))
    o.append(line(x + P, y + h * .086, x + mw - P, y + h * .086, '#24384F', 1))
    o.append(T(x + P, y + h * .215, '14', w * .165, 700, C_OK))
    o.append(T(x + P + w * .215, y + h * .215, 'km/h', w * .046, 500, C_TXT))
    o.append(T(x + P + w * .215, y + h * .168, '当前路段均速', w * .030, 400, C_DIM))
    # 限速对照条
    bx, by, bw2, bh2 = x + P, y + h * .250, mw - 2 * P, h * .030
    o.append(rect(bx, by, bw2, bh2, '#1B3350', bh2 / 2))
    o.append(rect(bx, by, bw2 * 14 / 20.0, bh2, C_OK, bh2 / 2))
    o.append(line(bx + bw2 * 15 / 20.0, by - h * .012, bx + bw2 * 15 / 20.0, by + bh2 + h * .012, C_WARN, 2))
    o.append(T(bx + bw2 * 15 / 20.0, by + bh2 + h * .046, '限速15', w * .028, 500, C_WARN, 'middle'))
    o.append(T(bx + bw2, by - h * .012, '低于限速  通行正常', w * .030, 500, C_OK, 'end'))

    # 冲突预警
    wy = y + h * .360
    o.append(rect(x + P, wy, mw - 2 * P, h * .180, '#3A2A08', 4))
    o.append(rect(x + P, wy, w * .012, h * .180, C_WARN, 2))
    s_ = h * .052
    tx = x + P + w * .062
    o.append(poly([(tx, wy + h * .046), (tx + s_ * .92, wy + h * .046 + s_ * 1.35),
                   (tx - s_ * .92, wy + h * .046 + s_ * 1.35)], C_WARN))
    o.append(T(tx, wy + h * .046 + s_ * 1.18, '!', s_ * 1.05, 700, '#3A2A08', 'middle'))
    o.append(T(x + P + w * .115, wy + h * .062, '冲突预警', w * .030, 700, C_WARN))
    o.append(T(x + P + w * .115, wy + h * .115, '前方20m交叉口', w * .052, 700, C_TXT))
    o.append(T(x + P + w * .115, wy + h * .160, '有行人横穿，请减速', w * .042, 500, C_TXT))

    # 路径优化建议
    ry = y + h * .590
    o.append(T(x + P, ry, '路径优化建议', w * .030, 700, C_DIM))
    o.append(line(x + P, ry + h * .014, x + mw - P, ry + h * .014, '#24384F', 1))
    o.append(rect(x + P, ry + h * .034, mw - 2 * P, h * .130, '#122844', 4))
    o.append(sprite(ARROW_D, x + P + w * .022, ry + h * .054, w * .052, h * .092, 'none', 0, 1, 100, C_ACC))
    o.append(T(x + P + w * .098, ry + h * .086, '沿蓝色骑行区靠右通行', w * .040, 600, C_TXT))
    o.append(T(x + P + w * .098, ry + h * .132, '西侧支路当前空闲，绕行可省约1分钟', w * .030, 400, C_DIM))
    # 简化路径示意
    my = ry + h * .200
    o.append(rect(x + P, my, mw - 2 * P, h * .160, '#0A1626', 4))
    o.append(path(f'M{x+P+w*.05:.1f},{my+h*.140:.1f} L{x+P+w*.05:.1f},{my+h*.055:.1f} '
                  f'L{x+mw-P-w*.16:.1f},{my+h*.055:.1f}', 'none', C_ACC, w * .012, 1, cap='round'))
    o.append(path(f'M{x+P+w*.05:.1f},{my+h*.140:.1f} L{x+P+w*.20:.1f},{my+h*.140:.1f} '
                  f'L{x+P+w*.20:.1f},{my+h*.095:.1f}', 'none', C_ALERT, w * .010, .85, cap='round'))
    o.append(circ(x + mw - P - w * .16, my + h * .055, w * .016, C_ACC))
    o.append(T(x + mw - P - w * .13, my + h * .062, '推荐', w * .026, 500, C_ACC))
    o.append(T(x + P + w * .23, my + h * .140, '拥堵', w * .026, 500, C_ALERT))

    # ── 侧栏 ──
    sx = x + mw + sw * .10
    swid = sw * .80
    # 流量状态
    o.append(T(sx, y + h * .072, '当前流量', w * .026, 700, C_DIM))
    for i, (lb, v, col) in enumerate((('行人', .62, C_ACC), ('骑行', .84, C_WARN))):
        yy = y + h * (.105 + i * .072)
        o.append(T(sx, yy + h * .020, lb, w * .024, 400, C_TXT))
        o.append(rect(sx + swid * .30, yy, swid * .70, h * .026, '#1B3350', 3))
        o.append(rect(sx + swid * .30, yy, swid * .70 * v, h * .026, col, 3))
    o.append(T(sx, y + h * .278, '较昨日同时段 +12%', w * .022, 400, C_DIM))
    o.append(line(sx, y + h * .300, sx + swid, y + h * .300, '#24384F', 1))

    # 时间天气
    o.append(T(sx, y + h * .350, '时间与天气', w * .026, 700, C_DIM))
    o.append(T(sx, y + h * .420, '18:42', w * .072, 700, C_TXT))
    o.append(T(sx, y + h * .462, '9月18日  周四', w * .024, 400, C_DIM))
    o.append(circ(sx + swid * .18, y + h * .520, w * .026, C_WARN, .9))
    o.append(f'<ellipse cx="{sx+swid*.36:.1f}" cy="{y+h*.528:.1f}" rx="{w*.040:.1f}" ry="{w*.022:.1f}" fill="{C_DIM}" opacity=".8"/>')
    o.append(T(sx, y + h * .585, '多云  22℃', w * .030, 500, C_TXT))
    o.append(T(sx, y + h * .620, '路面干燥  能见度良好', w * .022, 400, C_DIM))
    o.append(line(sx, y + h * .650, sx + swid, y + h * .650, '#24384F', 1))

    # 文明出行统计
    o.append(T(sx, y + h * .700, '文明出行', w * .026, 700, C_DIM))
    o.append(T(sx, y + h * .772, '92.4', w * .070, 700, C_OK))
    o.append(T(sx + swid * .58, y + h * .772, '%', w * .034, 500, C_TXT))
    o.append(T(sx, y + h * .806, '本周合规通行率', w * .022, 400, C_DIM))
    o.append(T(sx, y + h * .840, '较上周 +3.1', w * .024, 500, C_OK))
    bars = (.62, .70, .66, .78, .84, .80, .92)
    for i, v in enumerate(bars):
        bh3 = h * .085 * v
        o.append(rect(sx + i * swid / 7.4, y + h * .955 - bh3, swid / 11.0, bh3,
                      C_OK if i == len(bars) - 1 else '#2A4A63', 1))
    return ''.join(o)


def device(x_base, y_base, ppm, dusk=False, detail=False, label=False):
    """在场景中绘制立面动态提示装置。(x_base, y_base) 为装置落地点。"""
    o = []
    U = ppm
    bw = SCR_W * U
    o.append(f'<ellipse cx="{x_base:.1f}" cy="{y_base:.1f}" rx="{bw*0.62:.1f}" ry="{bw*0.20:.1f}" fill="#000" opacity=".20"/>')
    # 底座
    o.append(rect(x_base - bw * .30, y_base - BASE_H * U, bw * .60, BASE_H * U,
                  '#9AA2AB' if not dusk else '#4C545D', 3))
    o.append(rect(x_base - bw * .30, y_base - BASE_H * U, bw * .12, BASE_H * U,
                  '#C3C9CF' if not dusk else '#5E666F', 3))
    # 机身
    by = y_base - DEV_H * U
    o.append(rect(x_base - bw / 2 - BEZEL * U, by, bw + 2 * BEZEL * U, (DEV_H - BASE_H) * U + BEZEL * U,
                  '#B7BDC4' if not dusk else '#5A626B', 6))
    o.append(rect(x_base - bw / 2 - BEZEL * U, by, bw * .10, (DEV_H - BASE_H) * U,
                  '#DBE0E5' if not dusk else '#6E767F', 4))
    # 屏幕
    sx0, sy0 = x_base - bw / 2, by + BEZEL * U
    o.append(screen_ui(sx0, sy0, bw, SCR_H * U, detail=detail))
    if dusk:
        o.append(rect(sx0 - bw * .22, sy0 - bw * .14, bw * 1.44, SCR_H * U + bw * .28,
                      C_ACC, 10, .13))
    return ''.join(o)


# ══════════════════════════ 11-A / 11-B / 11-C 场景图 ══════════════════════════

def scene_fig(name, dusk, sub, callouts=False, footnote=''):
    defs, body, P = fig9.scene(dusk=dusk)
    ppm = lambda dd: 2 * P.half(dd) / RW
    o = [body]
    dn = 7.4
    U = ppm(dn)
    dx, dy = P.xm(dn, RW + 1.45), P.y(dn)
    o.append(device(dx, dy, U, dusk, detail=False))
    if callouts:
        o.append(rect(0, 96, W, 904, '#FFFFFF' if not dusk else '#000000', 0, .20))
        cs = [(1, dx - U * SCR_W * .18, dy - DEV_H * U * .72, 420, 606, '屏幕主信息区',
               '占屏幕面积70%：速度反馈／冲突预警／路径建议', 'end'),
              (2, dx + U * SCR_W * .34, dy - DEV_H * U * .56, 420, 686, '侧边栏辅助信息区',
               '占屏幕面积30%：流量状态／时间天气／文明出行统计', 'end'),
              (3, dx, dy - BASE_H * U * .5, 420, 766, '装置底座', '内置控制单元与配电，高620mm', 'end'),
              (4, P.xm(24.0, CYC_L), P.y(24.0), 1214, 606, '安装位置', '设于交叉口来向20m处'),
              (5, P.xm(12.0, CYC_R), P.y(12.0), 1214, 686, '读取时距', '15km/h通行时约4.8s，满足3.5s识别要求'),
              (6, P.xm(7.0, 2.0), P.y(7.0), 1214, 766, '与地面系统的协同', '立面承担动态信息，地面承担静态路权')]
        for c in cs:
            an = c[7] if len(c) > 7 else 'start'
            o.append(callout(c[0], c[1], c[2], c[3], c[4], c[5], c[6], INK, 13, an))
    o.append(rect(0, 0, W, 96, PAPER))
    o.append(rect(0, 1000, W, 60, PAPER))
    o.append(title_block(W, '图11', '立面动态提示装置设计原型', sub, 46))
    o.append(foot(W, H, footnote, '各项取值依表38《安全引导系统设计参数规范》'))
    write(name, page(W, H, ''.join(o), defs))


# ══════════════════════════ 11-D 屏幕界面设计图 ══════════════════════════

def ui_sheet():
    w, h = 1600, 1060
    o = []
    o.append(title_block(w, '图11', '立面动态提示装置设计原型：屏幕界面设计',
                         '主信息区占屏幕面积70%，侧边栏辅助信息区占30%（对应三层信息架构中的第三层）', 46))
    SW, SH = 620, 760
    x0, y0 = 118, 190
    o.append(rect(x0 - 14, y0 - 14, SW + 28, SH + 28, '#B7BDC4', 10))
    o.append(screen_ui(x0, y0, SW, SH, detail=True))
    o.append(dim_h(x0, x0 + SW * .70, y0 + SH + 34, '主信息区  70%'))
    o.append(dim_h(x0 + SW * .70, x0 + SW, y0 + SH + 34, '侧栏  30%'))
    o.append(line(x0 + SW * .70, y0, x0 + SW * .70, y0 + SH + 40, C_ACC, 1.2, '5 5', .8))

    # 右侧说明
    bx = 830
    o.append(T(bx, y0 + 16, '信息分区与内容组织', 17, 700))
    o.append(line(bx, y0 + 32, w - 118, y0 + 32, LINE, 1))
    blocks = [
        ('主信息区（70%）', C_ACC, [
            ('速度反馈', '以当前路段均速与限速15km/h对照，低于限速时显示为绿色，超出时转为警示色。'),
            ('冲突预警', '联动前方交叉口的检测结果，给出方位、距离与冲突类型，是三项内容中的最高优先级。'),
            ('路径优化建议', '给出当前推荐通行方式与可选绕行路径，使装置由“提示危险”延伸到“提供选择”。')]),
        ('侧边栏（30%）', C_DIM, [
            ('当前流量状态', '行人与骑行两类主体的实时流量水平，供使用者自行判断拥挤程度。'),
            ('时间与天气', '时间、天气与路面状态，其中路面湿滑与能见度直接影响风险判断。'),
            ('文明出行统计', '本周合规通行率及其变化，以社会规范可视化的方式发挥助推作用。')]),
    ]
    yy = y0 + 62
    for title, col, items in blocks:
        o.append(rect(bx, yy - 14, 5, 20, col, 2))
        o.append(T(bx + 16, yy + 2, title, 15, 700))
        yy += 30
        for k_, v_ in items:
            o.append(T(bx + 16, yy + 2, k_, 13, 600, INK))
            yy += 22
            for ln in _wrap(v_, 30):
                o.append(T(bx + 16, yy + 2, ln, 12.5, 400, GREY))
                yy += 21
            yy += 8
        yy += 14

    o.append(rect(bx, yy - 6, w - 118 - bx, 96, PAPER2, 6))
    o.append(T(bx + 18, yy + 22, '可用性测试反馈（表40）', 13.5, 700))
    o.append(T(bx + 18, yy + 48, '侧栏信息密度偏高，通行时间压力下不易快速定位；', 12.5, 400, GREY))
    o.append(T(bx + 18, yy + 70, '第二轮修改后已将侧栏由五项精简为三项，并加大字号。', 12.5, 400, GREY))

    o.append(foot(w, h, '备选方案 11-D　屏幕界面设计图', '各项取值依表38《安全引导系统设计参数规范》'))
    write('fig11-D', page(w, h, ''.join(o)))


def _wrap(s, n):
    return [s[i:i + n] for i in range(0, len(s), n)]


# ══════════════════════════ 11-E 三视图 ══════════════════════════

def three_view():
    w, h = 1600, 1060
    o = []
    o.append(title_block(w, '图11', '立面动态提示装置设计原型：三视图与安装尺寸',
                         '比例 1∶20　单位：mm', 46))
    U = 214.0                      # 每米像素
    gy = 806                       # 地面线

    def ground(x1, x2):
        return line(x1, gy, x2, gy, GREY, 1.6)

    # ── 正立面 ──
    cx = 300
    bw = SCR_W * U
    o.append(ground(cx - 200, cx + 200))
    o.append(rect(cx - bw * .30, gy - BASE_H * U, bw * .60, BASE_H * U, '#B7BDC4', 3))
    by = gy - DEV_H * U
    o.append(rect(cx - bw / 2 - BEZEL * U, by, bw + 2 * BEZEL * U, (DEV_H - BASE_H) * U + BEZEL * U, '#9AA2AB', 6))
    o.append(screen_ui(cx - bw / 2, by + BEZEL * U, bw, SCR_H * U, detail=False))
    o.append(T(cx, gy + 46, '正立面', 14, 700, INK, 'middle'))
    o.append(dim_v(by, gy, cx - bw / 2 - 56, '2400'))
    o.append(dim_v(by + BEZEL * U, by + BEZEL * U + SCR_H * U, cx + bw / 2 + 66, '1620', GREY, 12, 5, False))
    o.append(dim_v(gy - BASE_H * U, gy, cx + bw / 2 + 66, '620', GREY, 12, 5, False))
    o.append(dim_h(cx - bw / 2, cx + bw / 2, by - 68, '960'))
    o.append(line(cx - bw / 2, by, cx - bw / 2, by - 74, LINE, .8, '3 3'))
    o.append(line(cx + bw / 2, by, cx + bw / 2, by - 74, LINE, .8, '3 3'))
    # 主/侧栏分界
    o.append(line(cx - bw / 2 + bw * .70, by + BEZEL * U, cx - bw / 2 + bw * .70,
                  by + BEZEL * U + SCR_H * U, C_ACC, 1.2, '5 5', .9))
    o.append(dim_h(cx - bw / 2, cx - bw / 2 + bw * .70, by - 26, '主信息区 672'))
    o.append(dim_h(cx - bw / 2 + bw * .70, cx + bw / 2, by - 26, '侧栏 288'))
    o.append(line(cx - bw / 2 + bw * .70, by, cx - bw / 2 + bw * .70, by - 32, LINE, .8, '3 3'))

    # ── 侧立面 ──
    cx2 = 760
    dw = 0.22 * U
    o.append(ground(cx2 - 170, cx2 + 170))
    o.append(rect(cx2 - dw * .9, gy - BASE_H * U, dw * 1.8, BASE_H * U, '#B7BDC4', 3))
    o.append(rect(cx2 - dw / 2, by, dw, (DEV_H - BASE_H) * U + BEZEL * U, '#9AA2AB', 4))
    o.append(rect(cx2 - dw / 2, by, dw * .30, (DEV_H - BASE_H) * U + BEZEL * U, '#0E1A2B', 3))
    o.append(T(cx2, gy + 46, '侧立面', 14, 700, INK, 'middle'))
    o.append(dim_h(cx2 - dw / 2, cx2 + dw / 2, by - 26, '220'))
    o.append(T(cx2 + dw + 22, by + 60, '屏体朝向来向', 12, 500, GREY))
    o.append(T(cx2 + dw + 22, by + 82, '与骑行方向成15°偏转', 11.5, 400, GREY))

    # ── 平面 ──
    cx3 = 1180
    py = 700
    o.append(T(cx3, py + 150, '平面（含安装位置）', 14, 700, INK, 'middle'))
    RS = 26.0
    o.append(rect(cx3 - RW / 2 * RS, py - 190, RW * RS, 300, '#5B6068'))
    for a_, b_, c_ in ((PL0, PL1, ORANGE), (PR0, PR1, ORANGE), (BK0, BK1, BLUE)):
        o.append(rect(cx3 - RW / 2 * RS + a_ * RS, py - 190, (b_ - a_) * RS, 300, c_))
    o.append(rect(cx3 + RW / 2 * RS + 0.55 * RS, py - 20, 0.22 * RS, SCR_W * RS, '#4A5058'))
    o.append(T(cx3 + RW / 2 * RS + 1.15 * RS, py + 6, '装置', 12, 600, INK))
    o.append(T(cx3 + RW / 2 * RS + 1.15 * RS, py + 26, '路缘外0.55m', 11.5, 400, GREY))
    o.append(dim_h(cx3 + RW / 2 * RS, cx3 + RW / 2 * RS + 0.55 * RS, py + 76, '550'))

    # ── 安装参数表 ──
    tx, ty = 118, 872
    o.append(rect(tx, ty, w - 236, 116, PAPER2, 6))
    rows = [('总高', '2400mm'), ('屏体', '960 × 1620mm'), ('屏幕分区', '主70%／侧栏30%'),
            ('安装位置', '交叉口来向20m'), ('读取时距', '约4.8s（15km/h）'), ('底座', '620mm，内置控制与配电')]
    for i, (k_, v_) in enumerate(rows):
        col = i % 3
        row = i // 3
        o.append(T(tx + 30 + col * 440, ty + 40 + row * 40, k_, 13, 600))
        o.append(T(tx + 150 + col * 440, ty + 40 + row * 40, v_, 13, 400, GREY))

    o.append(foot(w, h, '备选方案 11-E　三视图与安装尺寸', '各项取值依表38《安全引导系统设计参数规范》'))
    write('fig11-E', page(w, h, ''.join(o)))


# ══════════════════════════ 11-F 信息架构与布点 ══════════════════════════

def arch():
    w, h = 1600, 1060
    o, d = [], [arrow_marker('a3', GREY, 6), arrow_marker('a4', C_ACC, 6)]
    o.append(title_block(w, '图11', '立面动态提示装置：信息架构与布点逻辑',
                         '三层信息架构中的第三层由立面装置承担；布点依视认距离与反应时间反推', 46))

    # ── 上：三层信息架构 ──
    lx, ly, lw, lh = 118, 190, 660, 92
    layers = [('第一层  铺装色彩', '路权归属', '地面·静态·持续', ORANGE),
              ('第二层  地面标线与箭头', '路径与速度', '地面·静态·持续', BLUE),
              ('第三层  立面动态提示', '状态与预警', '立面·动态·即时', C_ACC)]
    for i, (a_, b_, c_, col) in enumerate(layers):
        yy = ly + i * (lh + 22)
        o.append(rect(lx, yy, lw, lh, PAPER2, 6))
        o.append(rect(lx, yy, 6, lh, col, 3))
        o.append(T(lx + 26, yy + 34, a_, 15.5, 700))
        o.append(T(lx + 26, yy + 62, '承载信息：' + b_, 12.5, 400, GREY))
        o.append(T(lx + lw - 26, yy + 62, c_, 12.5, 500, col, 'end'))
        if i < 2:
            o.append(f'<line x1="{lx+lw/2}" y1="{yy+lh+2}" x2="{lx+lw/2}" y2="{yy+lh+18}" '
                     f'stroke="{GREY}" stroke-width="1.4" marker-end="url(#a3)"/>')
    o.append(T(lx, ly + 3 * (lh + 22) + 22, '同一视域内不并置两层以上信息，避免视觉负荷叠加。', 12.5, 400, GREY))

    # ── 右上：为什么把动态信息放到立面 ──
    rx = 838
    o.append(T(rx, ly + 20, '为什么由立面承担动态信息', 16, 700))
    o.append(line(rx, ly + 36, w - 118, ly + 36, LINE, 1))
    txt = ['地面信息一经施划即固定，只能承载不随时间变化的内容；',
           '而速度、流量、前方冲突这三类信息本身随时间变化，',
           '若强行落到地面，将迫使使用者在低头与观察前方之间反复切换，',
           '反而增加视觉负荷。将其上移至立面，使地面专注于"在哪里走"，',
           '立面专注于"此刻发生了什么"，两者各自承担一类问题。']
    for i, t_ in enumerate(txt):
        o.append(T(rx, ly + 70 + i * 26, t_.replace('"', '“', 1).replace('"', '”', 1), 13, 400, GREY))
    o.append(rect(rx, ly + 216, w - 118 - rx, 128, PAPER2, 6))
    o.append(T(rx + 22, ly + 250, '与地面系统的分工', 14, 700))
    o.append(T(rx + 22, ly + 280, '地面：路权归属、路径方向、速度诱导  —  静态、持续', 12.5, 400, GREY))
    o.append(T(rx + 22, ly + 306, '立面：速度反馈、冲突预警、路径建议  —  动态、即时', 12.5, 400, GREY))
    o.append(T(rx + 22, ly + 332, '二者构成“静态与动态”“持续与即时”的互补关系。', 12.5, 400, GREY))

    # ── 下：布点与时距 ──
    o.append(line(118, 626, w - 118, 626, LINE, 1))
    o.append(T(118, 670, '布点位置与读取时距', 16, 700))
    o.append(T(118, 696, '骑行者以校园建议速度15km/h（4.17m/s）通行，装置设于交叉口来向20m处，'
                         '自进入视野至到达冲突点约有4.8s，高于3.5s的识别与反应要求。', 13, 400, GREY))

    ax0, ax1, ay = 200, 1400, 830
    o.append(rect(ax0 - 84, ay - 130, ax1 - ax0 + 172, 218, PAPER2, 8))
    o.append(f'<line x1="{ax0}" y1="{ay}" x2="{ax1}" y2="{ay}" stroke="{GREY}" '
             f'stroke-width="1.6" marker-end="url(#a3)"/>')
    marks = [(0.0, '', '来向20m'), (0.30, '', ''), (0.62, '', ''), (1.0, '交叉口冲突点', '0m')]
    for f_, lb, sub in marks:
        x_ = ax0 + (ax1 - ax0 - 40) * f_
        o.append(line(x_, ay - 12, x_, ay + 12, GREY, 1.4))
        if lb:
            o.append(T(x_, ay - 26, lb, 13, 700, RED if '冲突' in lb else INK, 'middle'))
        if sub:
            o.append(T(x_, ay + 32, sub, 12, 400, GREY, 'middle'))
    # 装置图示
    o.append(device(ax0, ay - 14, 34.0, False, detail=False))
    o.append(T(ax0, ay - 112, '装置位置', 13, 700, INK, 'middle'))
    o.append(circ(ax0 + (ax1 - ax0 - 40), ay, 14, RED))
    o.append(dim_h(ax0, ax0 + (ax1 - ax0 - 40), ay + 62, '20 000'))
    o.append(T(ax0 + (ax1 - ax0 - 40) / 2, ay + 22, '4.17 m/s × 4.8 s ＝ 20 m', 13, 600, C_ACC, 'middle'))

    o.append(foot(w, h, '备选方案 11-F　信息架构与布点逻辑', '各项取值依表38《安全引导系统设计参数规范》'))
    write('fig11-F', page(w, h, ''.join(o), ''.join(d)))


# ══════════════════════════ 11-C 正立面大图 ══════════════════════════

def build():
    scene_fig('fig11-A', False, '路侧场景效果图（日间）', False, '备选方案 11-A　路侧场景效果图·日间')
    scene_fig('fig11-B', True, '路侧场景效果图（夜间，屏幕与地埋灯带点亮）', False, '备选方案 11-B　路侧场景效果图·夜间')
    scene_fig('fig11-C', False, '路侧场景效果图（装置构成与安装参数标注）', True, '备选方案 11-C　路侧场景·要素标注版')
    ui_sheet()
    three_view()
    arch()


if __name__ == '__main__':
    build()
