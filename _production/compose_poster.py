from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "_production" / "poster-source.webp"
OUTPUT = ROOT / "public" / "poster.png"
THUMB = ROOT / "_production" / "poster-thumb.png"

image = (
    Image.open(SOURCE)
    .convert("RGB")
    .crop((28, 28, 996, 996))
    .resize((1024, 1024), Image.Resampling.LANCZOS)
)
veil = Image.new("RGBA", image.size, (0, 0, 0, 0))
pixels = veil.load()
for y in range(255):
    alpha = round(150 * (1 - y / 255) ** 1.5)
    for x in range(1024):
        pixels[x, y] = (2, 15, 40, alpha)
image = Image.alpha_composite(image.convert("RGBA"), veil)

draw = ImageDraw.Draw(image)
title = ImageFont.truetype("/System/Library/Fonts/Supplemental/Andale Mono.ttf", 62)
small = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 15)
draw.text((54, 38), "ALTERU / BALLISTICS 12", font=small, fill=(224, 238, 247, 205))
draw.multiline_text(
    (50, 62),
    "SKYLINE /\nGORILLAS",
    font=title,
    fill=(245, 241, 231, 255),
    spacing=-15,
)

rgb = image.convert("RGB")
rgb.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG).save(
    OUTPUT, "PNG", optimize=True
)
rgb.resize((160, 160), Image.Resampling.LANCZOS).save(THUMB, "PNG", optimize=True)

