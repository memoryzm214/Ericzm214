#!/usr/bin/env bash
# Render a .pptx to per-slide JPGs + a contact sheet for visual QA.
#   tools/render.sh output/deck.pptx /path/to/outdir [dpi]
set -euo pipefail
DECK="$(readlink -f "$1")"; OUT="$2"; DPI="${3:-110}"
SK=/root/.claude/skills/synced/9c1bc9f6-2c2b-470b-96fb-37ad7e5c6198_08e1177a-7b6b-453e-b4ef-3cd785341a21/pptx
mkdir -p "$OUT"; cd "$OUT"
rm -f slide-*.jpg contact-*.jpg
base="$(basename "${DECK%.*}")"
python "$SK/scripts/office/soffice.py" --headless --convert-to pdf "$DECK" >/dev/null 2>&1
pdftoppm -jpeg -r "$DPI" "$base.pdf" slide
python3 - <<'PY'
import glob
from PIL import Image, ImageDraw
fs = sorted(glob.glob('slide-*.jpg'))
per = 12
for k in range(0, len(fs), per):
    ims = [Image.open(f) for f in fs[k:k+per]]
    w, h = ims[0].size
    s = 0.5
    tw, th = int(w*s), int(h*s)
    g = Image.new('RGB', (tw*3, (th+18)*4), 'white')
    d = ImageDraw.Draw(g)
    for i, im in enumerate(ims):
        x, y = (i % 3)*tw, (i//3)*(th+18)
        g.paste(im.resize((tw, th)), (x, y+18)); d.text((x+4, y+3), fs[k+i], fill='black')
    g.save('contact-%d.jpg' % (k//per+1))
PY
ls -1 "$PWD"/slide-*.jpg "$PWD"/contact-*.jpg
