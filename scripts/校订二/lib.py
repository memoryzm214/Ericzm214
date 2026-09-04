import re
DOC='unpacked/word/document.xml'
P_RE = re.compile(r'<w:p(?: [^>]*)?>.*?</w:p>|<w:p(?: [^>]*)?/>', re.S)
T_RE = re.compile(r'<w:t(?: [^>]*)?>(.*?)</w:t>', re.S)
STY_RE = re.compile(r'<w:pStyle w:val="([^"]+)"')
def load():
    return open(DOC, encoding='utf-8').read()
def save(d):
    open(DOC,'w',encoding='utf-8').write(d)
def paras(d):
    out=[]
    for m in P_RE.finditer(d):
        x=m.group(0)
        txt=''.join(T_RE.findall(x))
        st=STY_RE.search(x)
        out.append(dict(s=m.start(), e=m.end(), xml=x, text=txt, style=st.group(1) if st else '1'))
    return out
