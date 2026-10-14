#!/usr/bin/env python3
"""Pack the whole course into ONE self-contained HTML file (double-click to open, no folder needed).

    python3 tools/make_single.py [out.html]      (default: dist/Arduino互动实验室.html)

Inlines sim/sim.css, every <script src> (engine + lessons) and all pictures under img/ as data: URIs
(window.SIM_ASSETS; deck.js swaps them in when it builds a slide). Only the Google Fonts link stays
external: online the page uses those fonts, offline it falls back to the system fonts.
"""
import base64, json, mimetypes, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def read(rel):
    return open(os.path.join(ROOT, rel), encoding='utf-8').read()

def script(code):
    return '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>'

def main():
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'dist', 'Arduino互动实验室.html')
    html = re.sub(r'<!--.*?-->\s*', '', read('index.html'), flags=re.S)  # comments hold example tags
    assets = {}
    for root, _, names in os.walk(os.path.join(ROOT, 'img')):
        for name in sorted(names):
            full = os.path.join(root, name)
            mime = mimetypes.guess_type(name)[0] or 'application/octet-stream'
            assets[os.path.relpath(full, ROOT).replace(os.sep, '/')] = f'data:{mime};base64,' + base64.b64encode(open(full, 'rb').read()).decode()
    css = read('sim/sim.css').replace('</style', '<\\/style')
    html, n = re.subn(r'<link rel="stylesheet" href="sim/sim\.css">', lambda m: '<style>\n' + css + '\n</style>', html)
    assert n == 1, 'sim.css link not found'
    first = [True]
    def inline(m):
        pre = ''
        if first[0]:  # the picture table goes in before the first engine script
            pre = script('window.SIM_ASSETS = ' + json.dumps(assets, separators=(',', ':')) + ';') + '\n'
            first[0] = False
        return pre + script(read(m.group(1)))
    tags = r'<script[^>]*\ssrc="([^"]+)"[^>]*></script>'
    want = len(re.findall(r'<script[^>]*\ssrc=', html))
    html, n = re.subn(tags, inline, html)
    assert n == want and n >= 10, 'a script was not inlined'
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(html)
    print(f'{out}: {os.path.getsize(out) / 1e6:.1f} MB, {n} scripts and {len(assets)} pictures inlined')

if __name__ == '__main__':
    main()
