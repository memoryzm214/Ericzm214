# -*- coding: utf-8 -*-
"""图9—图11 设计原型图的公共绘图工具。
所有取值严格对应正文 4.4.3 节与表38《安全引导系统设计参数规范》。"""
import math, os

ASSETS = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'assets'))

# ── 表38 规定的色彩 ──
BLUE   = '#0057B8'   # Pantone 2935 C  骑行区铺装
BLUE_D = '#00429A'
BLUE_L = '#1E6FCB'
ORANGE = '#FF6A13'   # Pantone 1585 C  行人区铺装
ORG_D  = '#E25200'
ORG_L  = '#FF8340'
YELLOW = '#FFCD00'   # Pantone 116 C   交叉口警示色块 / 触感警示条
YEL_D  = '#D9A800'
RED    = '#DA291C'   # Pantone 485 C   冲突点标识
WHITE  = '#FFFFFF'
LED    = '#FFE9B0'

# ── 中性色 ──
ASPH   = '#53585E'
ASPH_D = '#3E434A'
ASPH_L = '#666C74'
GRASS  = '#5E8C4A'
GRASS_D= '#4A7139'
CURB   = '#C9CBC7'
INK    = '#1C2024'
GREY   = '#6B7280'
GREY_L = '#9AA1AA'
LINE   = '#C6CBD2'
PAPER  = '#FFFFFF'
PAPER2 = '#F5F6F8'

FONT_CSS = f"""
@font-face {{ font-family:'NSSC'; font-weight:400; font-style:normal;
  src:url('file://{ASSETS}/noto-sans-sc-chinese-simplified-400-normal.woff2') format('woff2'),
      url('file://{ASSETS}/noto-sans-sc-latin-400-normal.woff2') format('woff2'); }}
@font-face {{ font-family:'NSSC'; font-weight:500; font-style:normal;
  src:url('file://{ASSETS}/noto-sans-sc-chinese-simplified-500-normal.woff2') format('woff2'),
      url('file://{ASSETS}/noto-sans-sc-latin-500-normal.woff2') format('woff2'); }}
@font-face {{ font-family:'NSSC'; font-weight:700; font-style:normal;
  src:url('file://{ASSETS}/noto-sans-sc-chinese-simplified-700-normal.woff2') format('woff2'),
      url('file://{ASSETS}/noto-sans-sc-latin-700-normal.woff2') format('woff2'); }}
"""


def page(w, h, body, defs='', bg=PAPER):
    """输出一张独立 HTML，#canvas 即截图范围。"""
    return f"""<title>fig</title><style>
{FONT_CSS}
*{{margin:0;padding:0;box-sizing:border-box}}
body{{background:#fff}}
#canvas{{width:{w}px;height:{h}px;background:{bg};overflow:hidden}}
svg{{display:block}}
text{{font-family:'NSSC',sans-serif;-webkit-font-smoothing:antialiased}}
</style>
<div id="canvas"><svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" xmlns="http://www.w3.org/2000/svg">
<defs>{defs}</defs>
{body}
</svg></div>"""


def esc(s):
    return (s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))


def T(x, y, s, size=15, w=400, fill=INK, anchor='start', ls=0, op=1, family=None, baseline=None):
    fam = f" font-family=\"{family}\"" if family else ''
    bl = f' dominant-baseline="{baseline}"' if baseline else ''
    return (f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" font-weight="{w}" fill="{fill}" '
            f'text-anchor="{anchor}" letter-spacing="{ls}" opacity="{op}"{fam}{bl}>{esc(s)}</text>')


def rect(x, y, w, h, fill, rx=0, op=1, stroke=None, sw=1, extra=''):
    st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
    return (f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" '
            f'fill="{fill}" opacity="{op}"{st} {extra}/>')


def poly(pts, fill='none', op=1, stroke=None, sw=1, extra=''):
    d = ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts)
    st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
    return f'<polygon points="{d}" fill="{fill}" opacity="{op}"{st} {extra}/>'


def line(x1, y1, x2, y2, stroke=INK, sw=1, dash=None, op=1, cap='butt'):
    da = f' stroke-dasharray="{dash}"' if dash else ''
    return (f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" '
            f'stroke-width="{sw}" stroke-linecap="{cap}" opacity="{op}"{da}/>')


def path(d, fill='none', stroke=None, sw=1, op=1, extra='', cap='butt', join='miter'):
    st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
    return (f'<path d="{d}" fill="{fill}" opacity="{op}"{st} stroke-linecap="{cap}" '
            f'stroke-linejoin="{join}" {extra}/>')


def circ(cx, cy, r, fill, op=1, stroke=None, sw=1):
    st = f' stroke="{stroke}" stroke-width="{sw}"' if stroke else ''
    return f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r:.1f}" fill="{fill}" opacity="{op}"{st}/>'


# ══════════════ 图纸元素 ══════════════

def title_block(w, num, name, sub='', y=44):
    """图纸左上角标题区。"""
    o = [T(52, y, num, 25, 700, INK),
         T(52 + len(num) * 15 + 14, y, name, 20, 500, INK)]
    if sub:
        o.append(T(52, y + 28, sub, 13.5, 400, GREY))
    o.append(line(52, y + 44, w - 52, y + 44, LINE, 1))
    return ''.join(o)


def foot(w, h, left, right=''):
    o = [line(52, h - 44, w - 52, h - 44, LINE, 1),
         T(52, h - 22, left, 12, 400, GREY_L)]
    if right:
        o.append(T(w - 52, h - 22, right, 12, 400, GREY_L, 'end'))
    return ''.join(o)


def dim_h(x1, x2, y, label, color=GREY, size=12, tick=5, above=True):
    """水平尺寸线。"""
    o = [line(x1, y, x2, y, color, 1),
         line(x1, y - tick, x1, y + tick, color, 1),
         line(x2, y - tick, x2, y + tick, color, 1)]
    ty = y - 7 if above else y + 16
    o.append(f'<rect x="{(x1+x2)/2 - len(label)*size*0.36:.1f}" y="{ty-size+2:.1f}" '
             f'width="{len(label)*size*0.72:.1f}" height="{size+2:.1f}" fill="{PAPER}"/>')
    o.append(T((x1 + x2) / 2, ty, label, size, 500, color, 'middle'))
    return ''.join(o)


def dim_v(y1, y2, x, label, color=GREY, size=12, tick=5, left=True):
    o = [line(x, y1, x, y2, color, 1),
         line(x - tick, y1, x + tick, y1, color, 1),
         line(x - tick, y2, x + tick, y2, color, 1)]
    tx = x - 9 if left else x + 9
    o.append(T(tx, (y1 + y2) / 2 + 4, label, size, 500, color, 'end' if left else 'start'))
    return ''.join(o)


def callout(n, cx, cy, tx, ty, text, sub='', color=INK, r=13, anchor='start', dotr=3):
    """带编号圆点的引线标注。"""
    o = [line(cx, cy, tx + (r + 4 if anchor == 'start' else -(r + 4)), ty, color, 1.2, op=.55),
         circ(cx, cy, dotr, color, .8)]
    o.append(circ(tx, ty, r, color))
    o.append(T(tx, ty + 4.5, str(n), 12.5, 700, PAPER, 'middle'))
    dx = r + 9 if anchor == 'start' else -(r + 9)
    o.append(T(tx + dx, ty - (1 if sub else -4.5), text, 14, 500, INK, anchor))
    if sub:
        o.append(T(tx + dx, ty + 15, sub, 11.5, 400, GREY, anchor))
    return ''.join(o)


def legend_sw(x, y, color, label, sub='', w=22, h=13, stroke=None):
    o = [rect(x, y, w, h, color, 2.5, stroke=stroke, sw=1),
         T(x + w + 9, y + h - 2, label, 13, 500)]
    if sub:
        o.append(T(x + w + 9, y + h + 15, sub, 11, 400, GREY))
    return ''.join(o)


def arrow_marker(idn, color, size=6):
    return (f'<marker id="{idn}" markerWidth="{size}" markerHeight="{size}" refX="{size-0.5}" '
            f'refY="{size/2}" orient="auto"><path d="M0,0 L{size},{size/2} L0,{size} Z" fill="{color}"/></marker>')


# ══════════════ 一点透视工具 ══════════════

class Persp:
    """一点透视：路面中心线消失于 (vx, hz)。
    d 为距观察点的实际距离（米），near_d 为画面下沿对应的距离。"""

    def __init__(self, vx, hz, y_near, half_near, near_d=6.0, road_w=5.5):
        self.vx, self.hz, self.y_near = vx, hz, y_near
        self.half_near, self.near_d, self.road_w = half_near, near_d, road_w

    def k(self, d):
        return self.near_d / (self.near_d + d)

    def y(self, d):
        return self.hz + (self.y_near - self.hz) * self.k(d)

    def half(self, d):
        return self.half_near * self.k(d)

    def x(self, d, f):
        """f 为路幅横向比例 0—1（0 为左缘）。"""
        h = self.half(d)
        return self.vx - h + 2 * h * f

    def xm(self, d, m):
        """按米数偏移（自左缘起算）。"""
        return self.x(d, m / self.road_w)

    def band(self, f0, f1, d0, d1):
        """纵向色带（梯形）。"""
        return [(self.x(d0, f0), self.y(d0)), (self.x(d0, f1), self.y(d0)),
                (self.x(d1, f1), self.y(d1)), (self.x(d1, f0), self.y(d1))]

    def bandm(self, m0, m1, d0, d1):
        return self.band(m0 / self.road_w, m1 / self.road_w, d0, d1)

    def cross(self, d, m0, m1, wm):
        """横向条块（宽 wm 米，位于距离 d 处）。"""
        d2 = d + wm
        return [(self.xm(d, m0), self.y(d)), (self.xm(d, m1), self.y(d)),
                (self.xm(d2, m1), self.y(d2)), (self.xm(d2, m0), self.y(d2))]


def sky(w, hz, top='#BFD8EE', bot='#E8F1F8'):
    return f'<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{top}"/><stop offset="1" stop-color="{bot}"/></linearGradient>'


def sky_dusk():
    return ('<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#1E3A63"/><stop offset="0.45" stop-color="#4A6E9B"/>'
            '<stop offset="0.78" stop-color="#9C86A0"/><stop offset="1" stop-color="#D9A487"/></linearGradient>')


def tree(x, ybase, hgt, trunk='#5A4632', leaf='#4F7D42', leaf2='#638F52', seed=0):
    """扁平化行道树。"""
    tw = max(3.0, hgt * 0.062)
    o = [rect(x - tw / 2, ybase - hgt * 0.52, tw, hgt * 0.52, trunk)]
    cx, cy, r = x, ybase - hgt * 0.68, hgt * 0.275
    o.append(circ(cx, cy, r, leaf))
    o.append(circ(cx - r * .62, cy + r * .34, r * .70, leaf2))
    o.append(circ(cx + r * .64, cy + r * .26, r * .64, leaf2))
    o.append(circ(cx + r * .14, cy - r * .58, r * .58, leaf))
    return ''.join(o)


def building(x, ybase, w, h, base='#C3A48C', roof='#8E6E58', win='#7E9BB5', cols=4, rows=3, op=1):
    o = [rect(x, ybase - h, w, h, base, 0, op),
         rect(x - w * .03, ybase - h - h * .045, w * 1.06, h * .045, roof, 0, op)]
    mw, mh = w / (cols * 2 + 1), h / (rows * 2.2 + 1)
    for r in range(rows):
        for c in range(cols):
            o.append(rect(x + mw * (c * 2 + 1), ybase - h + mh * (r * 2.2 + 1), mw, mh * 1.35, win, 1, op * .85))
    return ''.join(o)


# ══════════════ 平面图形（单位框 0..1 内定义，按需变换） ══════════════

BIKE_D = ("M2,74 a15,15 0 1,0 30,0 a15,15 0 1,0 -30,0 "
          "M68,74 a15,15 0 1,0 30,0 a15,15 0 1,0 -30,0 "
          "M17,74 L40,34 L74,34 M40,34 L58,74 M83,74 L70,38 "
          "M32,28 L50,28 M41,28 L40,34")
PED_D = ("M50,10 a9,9 0 1,0 0.1,0 M50,20 L50,54 M50,28 L32,40 M50,28 L68,38 "
         "M50,54 L36,90 M50,54 L64,90")


def sprite(d_path, x, y, w, h, color, sw=6, op=1, box=100, fill='none', rot=0):
    """把 100×100 单位框内的路径缩放到 (x,y,w,h)。"""
    sx, sy = w / box, h / box
    tr = f'translate({x:.2f},{y:.2f}) scale({sx:.4f},{sy:.4f})'
    if rot:
        tr += f' rotate({rot},{box/2},{box/2})'
    return (f'<g transform="{tr}"><path d="{d_path}" fill="{fill}" stroke="{color}" '
            f'stroke-width="{sw:.2f}" stroke-linecap="round" stroke-linejoin="round" '
            f'opacity="{op}" vector-effect="non-scaling-stroke"/></g>')


ARROW_D = "M38,100 L38,42 L20,42 L50,2 L80,42 L62,42 L62,100 Z"
ARROW_DN = "M38,0 L38,58 L20,58 L50,98 L80,58 L62,58 L62,0 Z"


def flat_person(cx, ybase, hgt, body='#28323C', head='#28323C', shirt=None, walk=True):
    """扁平化站立人形（正/背视），hgt 为总身高。"""
    hd = hgt * 0.118
    sh = ybase - hgt * 0.815                     # 肩线
    hip = ybase - hgt * 0.475
    bw = hgt * 0.185
    o = [circ(cx, ybase - hgt + hd * 1.02, hd, head)]
    o.append(path(f'M{cx:.1f},{ybase-hgt+hd*2.0:.1f} L{cx:.1f},{sh:.1f}', 'none', head, hd * 0.62, cap='round'))
    o.append(path(f'M{cx-bw/2:.1f},{sh:.1f} q{bw/2:.1f},{-hgt*0.035:.1f} {bw:.1f},0 '
                  f'L{cx+bw*0.44:.1f},{hip:.1f} L{cx-bw*0.44:.1f},{hip:.1f} Z', shirt or body))
    o.append(path(f'M{cx-bw*0.50:.1f},{sh+hgt*0.02:.1f} L{cx-bw*0.62:.1f},{hip+hgt*0.03:.1f}',
                  'none', shirt or body, hgt * 0.052, cap='round'))
    o.append(path(f'M{cx+bw*0.50:.1f},{sh+hgt*0.02:.1f} L{cx+bw*0.62:.1f},{hip+hgt*0.03:.1f}',
                  'none', shirt or body, hgt * 0.052, cap='round'))
    if walk:
        o.append(path(f'M{cx-bw*0.16:.1f},{hip:.1f} L{cx-bw*0.42:.1f},{ybase:.1f}',
                      'none', body, hgt * 0.062, cap='round'))
        o.append(path(f'M{cx+bw*0.16:.1f},{hip:.1f} L{cx+bw*0.34:.1f},{ybase:.1f}',
                      'none', body, hgt * 0.062, cap='round'))
    else:
        o.append(path(f'M{cx-bw*0.18:.1f},{hip:.1f} L{cx-bw*0.20:.1f},{ybase:.1f}',
                      'none', body, hgt * 0.062, cap='round'))
        o.append(path(f'M{cx+bw*0.18:.1f},{hip:.1f} L{cx+bw*0.20:.1f},{ybase:.1f}',
                      'none', body, hgt * 0.062, cap='round'))
    return ''.join(o)


def flat_cyclist(cx, ybase, hgt, frame='#28323C', body='#28323C', shirt='#28323C'):
    """侧视骑行者剪影，hgt 为连人带车总高。"""
    wr = hgt * 0.24
    o = [circ(cx - wr * 1.35, ybase - wr, wr, 'none', 1, frame, hgt * 0.035),
         circ(cx + wr * 1.35, ybase - wr, wr, 'none', 1, frame, hgt * 0.035),
         path(f'M{cx-wr*1.35:.1f},{ybase-wr:.1f} L{cx-wr*0.15:.1f},{ybase-wr*1.05:.1f} '
              f'L{cx+wr*0.55:.1f},{ybase-wr*2.05:.1f} L{cx+wr*1.35:.1f},{ybase-wr:.1f} '
              f'M{cx-wr*0.15:.1f},{ybase-wr*1.05:.1f} L{cx+wr*0.55:.1f},{ybase-wr*2.05:.1f} '
              f'M{cx-wr*0.90:.1f},{ybase-wr*2.00:.1f} L{cx-wr*0.15:.1f},{ybase-wr*1.05:.1f}',
              'none', frame, hgt * 0.035, cap='round')]
    o.append(path(f'M{cx-wr*0.90:.1f},{ybase-wr*2.00:.1f} L{cx-wr*1.55:.1f},{ybase-wr*2.05:.1f}',
                  'none', frame, hgt * 0.030, cap='round'))
    # 骑者
    hy = ybase - wr * 3.55
    o.append(circ(cx - wr * 0.05, hy, hgt * 0.085, body))
    o.append(path(f'M{cx-wr*0.05:.1f},{hy+hgt*0.09:.1f} L{cx-wr*0.55:.1f},{ybase-wr*2.15:.1f}',
                  'none', shirt, hgt * 0.105, cap='round'))
    o.append(path(f'M{cx-wr*0.30:.1f},{hy+hgt*0.13:.1f} L{cx-wr*1.45:.1f},{ybase-wr*2.05:.1f}',
                  'none', body, hgt * 0.052, cap='round'))
    o.append(path(f'M{cx-wr*0.55:.1f},{ybase-wr*2.15:.1f} L{cx-wr*0.15:.1f},{ybase-wr*1.10:.1f}',
                  'none', body, hgt * 0.060, cap='round'))
    return ''.join(o)


def flat_cyclist_back(cx, ybase, hgt, body='#28323C', shirt='#2F6DB5', frame='#28323C'):
    """自后方看的骑行者（沿路远去），hgt 为连人带车总高。"""
    o = []
    wr = hgt * 0.20                       # 车轮半径
    o.append(f'<ellipse cx="{cx:.1f}" cy="{ybase:.1f}" rx="{hgt*0.17:.1f}" ry="{hgt*0.045:.1f}" fill="#000" opacity=".18"/>')
    # 后轮
    o.append(path(f'M{cx:.1f},{ybase:.1f} L{cx:.1f},{ybase-wr*1.9:.1f}', 'none', frame, hgt * 0.045, cap='round'))
    o.append(f'<ellipse cx="{cx:.1f}" cy="{ybase-wr*0.95:.1f}" rx="{hgt*0.028:.1f}" ry="{wr*0.95:.1f}" '
             f'fill="none" stroke="{frame}" stroke-width="{hgt*0.030:.1f}"/>')
    # 车把
    hy = ybase - hgt * 0.50
    o.append(path(f'M{cx-hgt*0.15:.1f},{hy:.1f} L{cx+hgt*0.15:.1f},{hy:.1f}', 'none', frame, hgt * 0.035, cap='round'))
    # 躯干
    bw = hgt * 0.195
    o.append(path(f'M{cx-bw/2:.1f},{ybase-hgt*0.80:.1f} q{bw/2:.1f},{-hgt*0.05:.1f} {bw:.1f},0 '
                  f'L{cx+bw*0.44:.1f},{ybase-hgt*0.44:.1f} L{cx-bw*0.44:.1f},{ybase-hgt*0.44:.1f} Z', shirt))
    # 手臂
    o.append(path(f'M{cx-bw*0.42:.1f},{ybase-hgt*0.76:.1f} L{cx-hgt*0.15:.1f},{hy:.1f}', 'none', shirt, hgt * 0.055, cap='round'))
    o.append(path(f'M{cx+bw*0.42:.1f},{ybase-hgt*0.76:.1f} L{cx+hgt*0.15:.1f},{hy:.1f}', 'none', shirt, hgt * 0.055, cap='round'))
    # 腿
    o.append(path(f'M{cx-bw*0.24:.1f},{ybase-hgt*0.45:.1f} L{cx-bw*0.30:.1f},{ybase-hgt*0.16:.1f}', 'none', body, hgt * 0.055, cap='round'))
    o.append(path(f'M{cx+bw*0.24:.1f},{ybase-hgt*0.45:.1f} L{cx+bw*0.30:.1f},{ybase-hgt*0.20:.1f}', 'none', body, hgt * 0.055, cap='round'))
    # 头（带头盔弧）
    o.append(circ(cx, ybase - hgt * 0.885, hgt * 0.088, body))
    return ''.join(o)
