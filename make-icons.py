#!/usr/bin/env python3
"""Render the PNG/ICO icon set from the SVG sources in .

Needs: pip install playwright && playwright install chromium
Run from the repo root:  python3 make-icons.py
Sources of truth: icon.svg, icon-maskable.svg, favicon.svg
"""
import io, struct, pathlib
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent
ICONS = ROOT

JOBS = [  # (source svg, output png, size, transparent corners?)
    ("icon.svg", "icon-192.png", 192, True),
    ("icon.svg", "icon-512.png", 512, True),
    ("icon-maskable.svg", "icon-maskable-192.png", 192, False),
    ("icon-maskable.svg", "icon-maskable-512.png", 512, False),
    ("icon-maskable.svg", "apple-touch-icon.png", 180, False),  # iOS rounds the corners itself
    ("favicon.svg", "favicon-32.png", 32, True),
    ("favicon.svg", "favicon-48.png", 48, True),
]

def png_bytes(page, svg_path, size, transparent):
    svg = (ICONS / svg_path).read_text(encoding="utf-8")
    page.set_viewport_size({"width": size, "height": size})
    page.set_content(f'<style>html,body{{margin:0;background:transparent}}svg{{display:block;width:{size}px;height:{size}px}}</style>{svg}')
    return page.screenshot(omit_background=transparent, clip={"x": 0, "y": 0, "width": size, "height": size})

def write_ico(path, images):
    """PNG-in-ICO: header, directory entries, then the PNG payloads."""
    head = struct.pack("<HHH", 0, 1, len(images))
    offset = 6 + 16 * len(images)
    entries, blobs = b"", b""
    for size, data in images:
        entries += struct.pack("<BBBBHHII", size % 256, size % 256, 0, 0, 1, 32, len(data), offset)
        blobs += data
        offset += len(data)
    path.write_bytes(head + entries + blobs)

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    ico = []
    for src, out, size, transparent in JOBS:
        data = png_bytes(page, src, size, transparent)
        (ICONS / out).write_bytes(data)
        if out.startswith("favicon-") and size in (32, 48):
            ico.append((size, data))
        print("wrote", out, len(data), "bytes")
    browser.close()

write_ico(ROOT / "favicon.ico", ico)
(ICONS / "favicon-48.png").unlink()  # only needed inside the .ico
print("wrote favicon.ico")
