#!/usr/bin/env python3
"""Build the shareable (claude.ai Artifact) copy of the course page.

    python3 tools/make_publish.py <out.html> [--keep-org]

Writes <out.html>: index.html without <!doctype>/<html>/<head>/<body> and the charset/viewport
metas (the Artifact host adds its own skeleton; <title> stays in the first 8 KB), and prints the
supporting files to publish next to it (sim/*, lessons/l*.js, img/**), as a JSON list of paths
relative to arduino-sim/.

Unless --keep-org is given, the school name is replaced by a neutral label, so a public link is
not mistaken for an official university page; index.html itself (the local copy) keeps it.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORG = '湖北工业大学 · 工业设计学院'

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        sys.exit(__doc__)
    out, keep_org = args[0], '--keep-org' in sys.argv
    s = open(os.path.join(ROOT, 'index.html'), encoding='utf-8').read()
    for pat in (r'<!doctype html>\s*', r'<html[^>]*>\s*', r'</html>\s*', r'<head>\s*', r'</head>\s*',
                r'<body[^>]*>\s*', r'</body>\s*', r'<meta charset="utf-8">\s*', r'<meta name="viewport"[^>]*>\s*'):
        s = re.sub(pat, '', s, flags=re.I)
    if not keep_org:
        n = s.count(ORG)
        s = s.replace(f'<span>{ORG} · Arduino 互动实验室</span>', '<span>Arduino 互动实验室</span>')
        s = s.replace(f'<span>{ORG}</span>', '<span>实验指南 1-2 · 1-3 · 2-1 · 2-2 · 2-3</span>')
        s = s.replace("SIM.deck.boot({ lessons:", "SIM.deck.boot({ org: 'Arduino 互动实验室', lessons:")
        assert n == 2 and ORG not in s and "org: 'Arduino" in s, 'index.html changed: update make_publish.py'
    assert '<title>' in s[:8192], '<title> must stay in the first 8 KB'
    open(out, 'w', encoding='utf-8').write(s)
    files = []
    for sub in ('sim', 'lessons', 'img'):
        for root, _, names in os.walk(os.path.join(ROOT, sub)):
            for name in sorted(names):
                if sub == 'lessons' and not re.fullmatch(r'l\d+\.js', name):
                    continue  # _demo.js / _parts.js are test lessons
                files.append(os.path.relpath(os.path.join(root, name), ROOT))
    print(json.dumps(files, ensure_ascii=False))

if __name__ == '__main__':
    main()
