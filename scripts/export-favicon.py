#!/usr/bin/env python3
"""Export GrantOS favicon PNGs — dark squircle with bold white G."""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"
APP = ROOT / "app"

BG = (11, 18, 32)  # #0B1220
WHITE = (255, 255, 255)


def _font(size: int, bold: bool = True) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def render(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    pad = max(1, round(size * 0.03125))
    radius = max(2, round(size * 0.25))
    draw.rounded_rectangle((pad, pad, size - pad, size - pad), radius=radius, fill=BG)

    g_font = _font(max(10, round(size * 0.62)), bold=True)
    g_bbox = draw.textbbox((0, 0), "G", font=g_font)
    g_w = g_bbox[2] - g_bbox[0]
    g_h = g_bbox[3] - g_bbox[1]
    g_x = (size - g_w) / 2 - g_bbox[0]
    g_y = (size - g_h) / 2 - g_bbox[1] + size * 0.03
    draw.text((g_x, g_y), "G", font=g_font, fill=WHITE)

    return img


OUT = [
    (16, "favicon-16x16.png"),
    (32, "favicon-32x32.png"),
    (48, "favicon-48x48.png"),
    (180, "apple-touch-icon.png"),
]

for px, name in OUT:
    dest = PUBLIC / name
    render(px).save(dest, format="PNG", optimize=True)
    print(f"wrote {dest}")

ico_16 = render(16)
ico_32 = render(32)
ico_48 = render(48)
for dest in (PUBLIC / "favicon.ico", APP / "favicon.ico"):
    ico_32.save(dest, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)], append_images=[ico_16, ico_48])
    print(f"wrote {dest}")

APP.mkdir(exist_ok=True)
render(32).save(APP / "icon.png", format="PNG", optimize=True)
render(180).save(APP / "apple-icon.png", format="PNG", optimize=True)
print(f"wrote {APP / 'icon.png'}")
