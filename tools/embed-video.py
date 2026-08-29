#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把视频文件直接烧进课件 HTML，生成一个自带视频的单文件。

用法：
    python3 tools/embed-video.py 你的视频.mp4
    python3 tools/embed-video.py 你的视频.mp4 -i slides-single.html -o 上课用.html

生成的 HTML 双击就能播，不需要 assets/ 文件夹，也不需要联网。
代价是文件会变大约为视频体积的 1.35 倍，建议视频控制在 30MB 以内。
"""
import argparse, base64, mimetypes, os, re, sys

DEFAULT_IN = "slides-single.html"
DEFAULT_OUT = "slides-with-video.html"
# 浏览器普遍支持的容器/编码
OK_EXT = {".mp4": "video/mp4", ".m4v": "video/mp4", ".webm": "video/webm", ".ogv": "video/ogg"}


def human(n):
    for u in ("B", "KB", "MB", "GB"):
        if n < 1024 or u == "GB":
            return f"{n:.1f} {u}" if u != "B" else f"{n} B"
        n /= 1024


def main():
    ap = argparse.ArgumentParser(description="把视频内嵌进课件 HTML")
    ap.add_argument("video", help="视频文件路径（建议 mp4 / H.264）")
    ap.add_argument("-i", "--input", default=DEFAULT_IN, help=f"输入 HTML（默认 {DEFAULT_IN}）")
    ap.add_argument("-o", "--output", default=DEFAULT_OUT, help=f"输出 HTML（默认 {DEFAULT_OUT}）")
    a = ap.parse_args()

    for p in (a.video, a.input):
        if not os.path.isfile(p):
            sys.exit(f"找不到文件：{p}")

    ext = os.path.splitext(a.video)[1].lower()
    mime = OK_EXT.get(ext) or mimetypes.guess_type(a.video)[0]
    if ext not in OK_EXT:
        print(f"⚠️  {ext} 不是浏览器普遍支持的格式，建议先转成 mp4（H.264 + AAC）。")

    size = os.path.getsize(a.video)
    if size > 60 * 1024 * 1024:
        print(f"⚠️  视频 {human(size)}，内嵌后约 {human(size * 4 / 3)}，打开会很慢。")
        print("    建议压到 30MB 以内，或改用『同目录 assets/hook.mp4』的方式。")

    html = open(a.input, encoding="utf-8").read()
    if 'id="hookSrc"' not in html:
        sys.exit(f"{a.input} 里找不到视频位（id=\"hookSrc\"），请确认输入的是本课件的 HTML。")

    print(f"读取视频 {a.video}（{human(size)}）…")
    uri = f"data:{mime};base64," + base64.b64encode(open(a.video, "rb").read()).decode()

    # 只替换 hookSrc 这一个 source 的 src
    new, n = re.subn(
        r'(<source id="hookSrc"[^>]*?src=")[^"]*(")',
        lambda m: m.group(1) + uri + m.group(2),
        html, count=1,
    )
    if n != 1:
        sys.exit("替换失败：没能定位到 hookSrc 的 src 属性。")

    # 顺带把 type 对齐
    new = re.sub(r'(<source id="hookSrc"[^>]*?type=")[^"]*(")',
                 lambda m: m.group(1) + mime + m.group(2), new, count=1)

    open(a.output, "w", encoding="utf-8").write(new)
    print(f"✅ 已生成 {a.output}（{human(os.path.getsize(a.output))}）")
    print("   双击即可打开，视频会自动播放，无需联网、无需附带文件夹。")


if __name__ == "__main__":
    main()
