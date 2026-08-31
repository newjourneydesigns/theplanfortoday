#!/usr/bin/env python3
"""Crop the watercolor artwork out of the printed poster into web assets.

Usage: python3 tools/make_assets.py [poster_path]
Writes into ../assets/ (relative to this file). Requires Pillow.
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "assets" / "poster-source.png"
OUT = ROOT / "assets"

# (left, top, right, bottom) boxes measured on the 1536x1024 poster scan
CROPS = {
    "pointe-header.png": (70, 30, 392, 315),
    "lion-lamppost.png": (1212, 55, 1505, 312),
    "icon-pointe.png": (58, 320, 172, 425),
    "icon-snowflake.png": (58, 476, 168, 562),
    "icon-crown.png": (56, 602, 172, 652),
    "icon-shield.png": (66, 698, 162, 772),
    "icon-wardrobe.png": (62, 816, 164, 908),
}
# icons get auto-tightened to their artwork; the two header pieces keep their framing
TIGHTEN = {name for name in CROPS if name.startswith("icon-")}

img = Image.open(SRC).convert("RGB")
print(f"source: {SRC} {img.size}")

# Sample candidate blank patches and use the lightest as the parchment color —
# the parchment is the brightest broad surface on the poster.
candidates = [(760, 312), (500, 316), (1000, 314), (300, 955), (620, 60)]
samples = [(pt, img.getpixel(pt)) for pt in candidates]
for pt, c in samples:
    print(f"  sample {pt}: #{c[0]:02x}{c[1]:02x}{c[2]:02x}")
bg = max((c for _, c in samples), key=sum)
print(f"parchment: #{bg[0]:02x}{bg[1]:02x}{bg[2]:02x}")


def tighten(im, bg_color, threshold=18, pad=6):
    solid = Image.new("RGB", im.size, bg_color)
    diff = ImageChops.difference(im, solid).convert("L")
    box = diff.point(lambda p: 255 if p > threshold else 0).getbbox()
    if not box:
        return im
    left, top, right, bottom = box
    return im.crop((
        max(0, left - pad),
        max(0, top - pad),
        min(im.width, right + pad),
        min(im.height, bottom + pad),
    ))


for name, box in CROPS.items():
    crop = img.crop(box)
    if name in TIGHTEN:
        crop = tighten(crop, bg)
    crop.save(OUT / name)
    print(f"{name}: {box} -> {crop.size}")

# favicon: the crown, centered on a parchment square
crown = Image.open(OUT / "icon-crown.png")
scale = 56 / max(crown.size)
small = crown.resize((max(1, int(crown.width * scale)), max(1, int(crown.height * scale))))
canvas = Image.new("RGB", (64, 64), bg)
canvas.paste(small, ((64 - small.width) // 2, (64 - small.height) // 2))
canvas.save(OUT / "favicon.png")
print("favicon.png: 64x64")

# social/link preview: the full poster as a compressed JPEG
img.save(OUT / "og-poster.jpg", "JPEG", quality=85)
print("og-poster.jpg saved")
