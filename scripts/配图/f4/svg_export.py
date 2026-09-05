# -*- coding: utf-8 -*-
"""把 html/ 下的图页导出为独立 SVG：
   1) 把 marker 箭头实体化为 polygon（LibreOffice/PowerPoint 不支持 SVG marker）；
   2) 给每个 <text> 补 font-family，保证在 Windows PowerPoint 中正常显示中文；
   3) 按毫米设定画布尺寸，便于转成合适大小的 PPT 页面。"""
import os, re, sys, math

HTML = os.path.join(os.path.dirname(__file__), 'html')
SVGD = os.path.join(os.path.dirname(__file__), 'svg')
os.makedirs(SVGD, exist_ok=True)
FONT = "Microsoft YaHei, Noto Sans SC, PingFang SC, SimHei, sans-serif"
MAXMM = 330.0


def arrowhead(x, y, ux, uy, sw, color):
    s = 7.0
    tx, ty = x + ux * .4 * sw, y + uy * .4 * sw
    bx, by = x - ux * (s - .4) * sw, y - uy * (s - .4) * sw
    px, py = -uy, ux
    hw = (s / 2 - .6) * sw
    return (f'<polygon points="{tx:.2f},{ty:.2f} {bx+px*hw:.2f},{by+py*hw:.2f} '
            f'{bx-px*hw:.2f},{by-py*hw:.2f}" fill="{color}"/>')


def num(tag, name, dflt=None):
    m = re.search(rf'\b{name}="([-0-9.]+)"', tag)
    return float(m.group(1)) if m else dflt


def convert(name):
    src = open(os.path.join(HTML, name + '.html'), encoding='utf-8').read()
    m = re.search(r'<svg width="(\d+)" height="(\d+)"[^>]*>(.*)</svg>', src, re.S)
    W, H, body = int(m.group(1)), int(m.group(2)), m.group(3)

    dm = re.search(r'<defs>(.*?)</defs>', body, re.S)
    mkcol = {}
    for mm in re.finditer(r'<marker id="([^"]+)".*?fill="([^"]+)"', dm.group(1), re.S):
        mkcol[mm.group(1)] = mm.group(2)
    body = body[dm.end():]

    # ── marker → polygon ──
    def repl(mo):
        tag, kind, mid = mo.group(0), mo.group(1), mo.group(2)
        sw = num(tag, 'stroke-width', 1.0)
        col = mkcol.get(mid, '#000000')
        if kind == 'line':
            x1, y1 = num(tag, 'x1'), num(tag, 'y1')
            x2, y2 = num(tag, 'x2'), num(tag, 'y2')
        else:
            pts = re.findall(r'([-0-9.]+),([-0-9.]+)', re.search(r'\bd="([^"]+)"', tag).group(1))
            (x1, y1), (x2, y2) = [tuple(map(float, p)) for p in pts[-2:]]
        L = math.hypot(x2 - x1, y2 - y1) or 1
        ux, uy = (x2 - x1) / L, (y2 - y1) / L
        clean = re.sub(r'\s*marker-end="url\(#[^)]+\)"', '', tag)
        return clean + arrowhead(x2, y2, ux, uy, sw, col)

    body = re.sub(r'<(line|path)\b[^>]*marker-end="url\(#([^)]+)\)"[^>]*/>', repl, body)

    # ── 文字补字体 ──
    body = re.sub(r'<text (?![^>]*font-family)', f'<text font-family="{FONT}" ', body)

    sc = MAXMM / max(W, H)
    head = (f'<svg xmlns="http://www.w3.org/2000/svg" version="1.1" '
            f'width="{W*sc:.2f}mm" height="{H*sc:.2f}mm" viewBox="0 0 {W} {H}">')
    open(os.path.join(SVGD, name + '.svg'), 'w', encoding='utf-8').write(head + body + '</svg>')
    print(f'· {name}.svg  {W}×{H}px → {W*sc:.1f}×{H*sc:.1f}mm')


if __name__ == '__main__':
    for n in (sys.argv[1:] or ['fig1', 'fig5', 'fig6', 'fig8']):
        convert(n)
