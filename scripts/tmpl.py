# -*- coding: utf-8 -*-
import re, lib

R_RE = re.compile(r'<w:r(?: [^>]*)?>.*?</w:r>', re.S)
PPR_RE = re.compile(r'<w:pPr>.*?</w:pPr>', re.S)

def esc(t):
    return t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')

def _first_rpr(pxml):
    runs = R_RE.findall(pxml)
    if not runs: return ''
    m = re.search(r'<w:rPr>.*?</w:rPr>', runs[0], re.S)
    return m.group(0) if m else ''

def _ppr(pxml):
    m = PPR_RE.search(pxml)
    return m.group(0) if m else ''

def make_para(tmpl_xml, text):
    """新建一个与模板同款式的段落。"""
    rpr = _first_rpr(tmpl_xml)
    ppr = _ppr(tmpl_xml)
    return f'<w:p>{ppr}<w:r>{rpr}<w:t xml:space="preserve">{esc(text)}</w:t></w:r></w:p>'

def sup_rpr(rpr):
    """在 rPr 中加入上标。"""
    if not rpr:
        return '<w:rPr><w:vertAlign w:val="superscript"/></w:rPr>'
    return rpr.replace('</w:rPr>', '<w:vertAlign w:val="superscript"/></w:rPr>')

def rebuild_with_sups(pxml, text, marks):
    """按 marks=[(pos, '[1-3]'), ...] 在 text 指定位置插入上标引注。"""
    rpr = _first_rpr(pxml)
    ppr = _ppr(pxml)
    srpr = sup_rpr(rpr)
    parts, last = [], 0
    for pos, mk in sorted(marks):
        seg = text[last:pos]
        if seg:
            parts.append(f'<w:r>{rpr}<w:t xml:space="preserve">{esc(seg)}</w:t></w:r>')
        parts.append(f'<w:r>{srpr}<w:t xml:space="preserve">{esc(mk)}</w:t></w:r>')
        last = pos
    seg = text[last:]
    if seg:
        parts.append(f'<w:r>{rpr}<w:t xml:space="preserve">{esc(seg)}</w:t></w:r>')
    return f'<w:p>{ppr}{"".join(parts)}</w:p>'

def templates(d):
    ps = lib.paras(d)
    def find(pred):
        for p in ps:
            if pred(p): return p['xml']
        raise RuntimeError('template not found')
    return {
        'h1':   find(lambda p: p['text'].strip()=='5课题研究总结'),
        'h2':   find(lambda p: p['text'].strip()=='5.1课题研究成果概述'),
        'body': find(lambda p: p['text'].startswith('本研究聚焦于化解高校共享道路')),
        'plain':find(lambda p: p['text'].strip()=='图1 本课题技术路线图'),
    }
