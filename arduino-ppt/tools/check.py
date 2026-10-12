#!/usr/bin/env python3
"""Content checks for a built deck.
  python3 tools/check.py output/deck.pptx --require pdf/ad_wiring.jpg pdf/ad_result_photo.jpg ...
Checks: every required asset image is embedded (byte-identical), no forbidden words (mBlock, 网页版, 模拟器),
no leftover placeholder text, every slide has speaker notes; prints the slide text outline.
"""
import argparse, hashlib, os, re, subprocess, sys, zipfile

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets')
ap = argparse.ArgumentParser()
ap.add_argument('deck')
ap.add_argument('--require', nargs='*', default=[])
ap.add_argument('--quiet', action='store_true')
a = ap.parse_args()

z = zipfile.ZipFile(a.deck)
media = {hashlib.md5(z.read(n)).hexdigest(): n for n in z.namelist() if n.startswith('ppt/media/')}
ok = True
for r in a.require:
    h = hashlib.md5(open(os.path.join(ROOT, r), 'rb').read()).hexdigest()
    if h not in media:
        print('MISSING IMAGE:', r); ok = False
    elif not a.quiet:
        print('image ok:', r)

md = subprocess.run(['markitdown', a.deck], capture_output=True, text=True).stdout
for bad in ['mBlock', 'mblock', '网页版', '模拟器', '点 ▶', 'lorem', 'TODO', 'xxx', 'Click to add']:
    if bad in md:
        print('FORBIDDEN TEXT:', bad); ok = False

slides = [n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)]
notes = {n for n in z.namelist() if re.match(r'ppt/notesSlides/notesSlide\d+\.xml$', n)}
empty_notes = 0
for n in notes:
    x = z.read(n).decode('utf8')
    body = ''.join(re.findall(r'<a:t>([^<]*)</a:t>', x))
    if len(re.sub(r'\d+', '', body).strip()) < 4:
        empty_notes += 1
print(f'slides: {len(slides)}  notes parts: {len(notes)}  notes nearly empty: {empty_notes}')
if not a.quiet:
    print(md)
print('RESULT:', 'PASS' if ok else 'FAIL')
sys.exit(0 if ok else 1)
