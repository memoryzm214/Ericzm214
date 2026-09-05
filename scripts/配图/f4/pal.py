# -*- coding: utf-8 -*-
"""图1／图5／图6／图8 的公共配色与绘图工具。
配色取自参考底图：米白纸底 + 灰绿／橄榄绿层次 + 灰蓝 + 单一赭红点缀。"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'fig', 'src'))
from common import page as _page, T, rect, poly, line, path, circ, esc, FONT_CSS

# ── 纸与面 ──
PAPER  = '#F4F3ED'      # 纸底
CARD   = '#FCFBF7'      # 卡片
PANEL  = '#EDEDE4'      # 面板
# ── 绿系四级 ──
S0     = '#E8EBDE'
S1     = '#D8DFC8'
S2     = '#C0CCA9'
OLIVE  = '#97A97F'
OLIVE_D= '#7A8E63'
FOREST = '#5E7249'
FOREST_D='#465736'
# ── 灰蓝（对应参考图水系） ──
STEEL  = '#C4CDD2'
STEEL_D= '#A6B2B9'
STEEL_L= '#DFE5E8'
# ── 赭红点缀 ──
TERRA  = '#AE564A'
TERRA_D= '#8E4238'
TERRA_L= '#CE8A7C'
TERRA_P= '#EEDCD6'
# ── 墨与线 ──
INK    = '#31332C'
INK2   = '#5A5D52'
INK3   = '#8A8D80'
LINE   = '#D2D2C8'
LINE_D = '#B9B9AD'
WHITE  = '#FFFFFF'


def page(w, h, body, defs=''):
    return _page(w, h, body, defs, bg=PAPER)


def marker(idn, color, size=7):
    return (f'<marker id="{idn}" markerWidth="{size}" markerHeight="{size}" '
            f'refX="{size-0.4}" refY="{size/2}" orient="auto">'
            f'<path d="M0,0.6 L{size},{size/2} L0,{size-0.6} Z" fill="{color}"/></marker>')


def arrow(x1, y1, x2, y2, color=INK2, sw=1.8, mk='ah', dash=None, op=1):
    da = f' stroke-dasharray="{dash}"' if dash else ''
    return (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" '
            f'stroke="{color}" stroke-width="{sw}" opacity="{op}"{da} '
            f'marker-end="url(#{mk})"/>')


def elbow(pts, color=INK2, sw=1.8, mk='ah', dash=None, op=1):
    d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    da = f' stroke-dasharray="{dash}"' if dash else ''
    return (f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{sw}" '
            f'opacity="{op}" stroke-linejoin="round"{da} marker-end="url(#{mk})"/>')


def box(x, y, w, h, text, fill=CARD, stroke=LINE_D, tc=INK, fs=17, wt=500,
        rx=6, sw=1.2, sub='', shadow=True, lines=None):
    """圆角矩形 + 居中文字（支持手动换行 lines）。"""
    o = []
    if shadow:
        o.append(rect(x + 2, y + 3, w, h, '#3A3C34', rx, .05))
    o.append(rect(x, y, w, h, fill, rx, 1, stroke, sw))
    rows = lines if lines else [text]
    n = len(rows)
    for i, r in enumerate(rows):
        o.append(T(x + w / 2, y + h / 2 - (n - 1) * fs * .68 + i * fs * 1.36 + fs * .35,
                   r, fs, wt, tc, 'middle'))
    if sub:
        o.append(T(x + w / 2, y + h - 10, sub, fs * .68, 400, INK3, 'middle'))
    return ''.join(o)


def chevron(x, y, w, h, fill, notch=26):
    """右向箭头旗标（左侧凹、右侧凸）。"""
    return poly([(x, y), (x + w - notch, y), (x + w, y + h / 2), (x + w - notch, y + h),
                 (x, y + h), (x + notch * .62, y + h / 2)], fill)


def hexbox(x, y, w, h, text, fill=TERRA, tc=WHITE, fs=18, cut=30, lines=None):
    """六边形里程碑块。"""
    o = [poly([(x + cut, y), (x + w - cut, y), (x + w, y + h / 2), (x + w - cut, y + h),
               (x + cut, y + h), (x, y + h / 2)], fill)]
    rows = lines if lines else [text]
    n = len(rows)
    for i, r in enumerate(rows):
        o.append(T(x + w / 2, y + h / 2 - (n - 1) * fs * .68 + i * fs * 1.36 + fs * .35,
                   r, fs, 600, tc, 'middle'))
    return ''.join(o)


def pill(x, y, w, h, text, fill=S1, tc=INK2, fs=15, wt=500):
    return rect(x, y, w, h, fill, h / 2) + T(x + w / 2, y + h / 2 + fs * .35, text, fs, wt, tc, 'middle')


def title_bar(w, num, name, sub='', y=54, rule_y=None):
    o = [T(56, y, num, 27, 700, INK),
         T(56 + len(num) * 16 + 14, y, name, 21, 500, INK)]
    if sub:
        o.append(T(56, y + 30, sub, 14, 400, INK3))
    o.append(line(56, (rule_y or y + 48), w - 56, (rule_y or y + 48), LINE, 1.3))
    return ''.join(o)


def foot(w, h, left, right=''):
    o = [line(56, h - 46, w - 56, h - 46, LINE, 1.3),
         T(56, h - 22, left, 12.5, 400, INK3)]
    if right:
        o.append(T(w - 56, h - 22, right, 12.5, 400, INK3, 'end'))
    return ''.join(o)
