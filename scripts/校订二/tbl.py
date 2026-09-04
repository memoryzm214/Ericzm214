# -*- coding: utf-8 -*-
def esc(t):
    return str(t).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

BORD = ('<w:tblBorders><w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/>'
        '<w:right w:val="none"/><w:insideH w:val="none"/><w:insideV w:val="none"/></w:tblBorders>')

def _cell(text, w, top, bottom, bold=False, align='center'):
    tb = f'<w:top w:val="single" w:color="000000" w:sz="{top}" w:space="0"/>' if top else '<w:top w:val="nil"/>'
    bb = f'<w:bottom w:val="single" w:color="000000" w:sz="{bottom}" w:space="0"/>' if bottom else '<w:bottom w:val="nil"/>'
    b = '<w:b/><w:bCs/>' if bold else ''
    rpr = ('<w:rPr><w:rFonts w:hint="eastAsia" w:ascii="Times New Roman" w:hAnsi="Times New Roman" '
           f'w:eastAsia="宋体" w:cs="Times New Roman"/>{b}<w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr>')
    return (f'<w:tc><w:tcPr><w:tcW w:w="{w}" w:type="dxa"/><w:tcBorders>{tb}<w:left w:val="nil"/>{bb}'
            f'<w:right w:val="nil"/></w:tcBorders><w:vAlign w:val="center"/></w:tcPr>'
            f'<w:p><w:pPr><w:widowControl/><w:spacing w:line="240" w:lineRule="auto"/>'
            f'<w:jc w:val="{align}"/>{rpr}</w:pPr>'
            f'<w:r>{rpr}<w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p></w:tc>')

def make_table(header, rows, widths=None, total=8496, aligns=None):
    """三线表：顶线、表头下横线、底线。"""
    n = len(header)
    if widths is None:
        widths = [total // n] * n
        widths[-1] = total - sum(widths[:-1])
    else:
        s = sum(widths)
        widths = [int(w * total / s) for w in widths]
        widths[-1] = total - sum(widths[:-1])
    aligns = aligns or ['center'] * n
    grid = ''.join(f'<w:gridCol w:w="{w}"/>' for w in widths)
    out = [f'<w:tbl><w:tblPr><w:tblStyle w:val="9"/><w:tblW w:w="{total}" w:type="dxa"/>'
           f'<w:tblInd w:w="0" w:type="dxa"/>{BORD}<w:tblLayout w:type="fixed"/>'
           '<w:tblCellMar><w:top w:w="20" w:type="dxa"/><w:left w:w="72" w:type="dxa"/>'
           '<w:bottom w:w="20" w:type="dxa"/><w:right w:w="72" w:type="dxa"/></w:tblCellMar></w:tblPr>'
           f'<w:tblGrid>{grid}</w:tblGrid>']
    # 表头行
    out.append('<w:tr><w:trPr><w:tblHeader/></w:trPr>' +
               ''.join(_cell(h, widths[i], 8, 8, bold=True) for i, h in enumerate(header)) + '</w:tr>')
    last = len(rows) - 1
    for r_i, row in enumerate(rows):
        cells = ''.join(_cell(c, widths[i], 0, 8 if r_i == last else 0, align=aligns[i])
                        for i, c in enumerate(row))
        out.append(f'<w:tr>{cells}</w:tr>')
    out.append('</w:tbl>')
    return ''.join(out)
