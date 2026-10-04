#!/usr/bin/env python3
"""
Asset pipeline: turn the raw chroma-key render (a wide, side-facing car) into a
tight, transparent, top-down car sprite that the hero can drive across the road.

Steps
  1. rotate so the nose points "up" (the scene drives the car to the right, so the
     car's own forward axis has to be vertical)
  2. chroma-key the green backdrop (it is not perfectly flat, so we use a colour
     distance test plus a *bright* green-dominance test instead of an exact match).
     The luminance guard is essential: the car's dark tinted glass is also
     green-dominant (it reflects the backdrop) but dark, and keying it out would
     leave see-through holes all over the body.
  3. build a solid silhouette - close hairline cracks, fill enclosed holes, keep
     the largest blob - then force the whole interior to full opacity. Any
     background left inside that silhouette is the green seen *through* the
     glass, so it is re-coloured to a neutral smoked tone instead of punched out.
  4. de-fringe: a soft edge on the outside of the core only, so no green rim survives
  5. crop to the car, re-pad, downscale and export WebP (2x) + PNG (1x fallback)

Usage: python3 tools/process-car.py
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter
from scipy.ndimage import binary_closing, binary_erosion, binary_fill_holes, label

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "raw" / "car-top-raw.png"
PUBLIC = ROOT / "public"

CHROMA = np.array([0, 148, 68], dtype=np.float32)  # studio backdrop green
KEY_TOLERANCE = 110.0                              # per-pixel RGB distance
# A green-dominant pixel only counts as backdrop if it is this bright. The dark
# tinted glass (lum ~60) is excluded, which is what keeps the car solid.
GREEN_MIN_LUMA = 95.0
EDGE_FEATHER = 1.1                                 # mask blur radius (px)
TARGET_WIDTH = 720                                 # exported sprite width (px, 2x of display)
PADDING_RATIO = 0.03                               # transparent margin around car


def main() -> None:
    img = Image.open(RAW).convert("RGBA").rotate(180, expand=True, resample=Image.BICUBIC)
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32)

    # --- 2. chroma key -------------------------------------------------------
    dist = np.sqrt(((rgb - CHROMA) ** 2).sum(axis=2))
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = r * 0.2126 + g * 0.7152 + b * 0.0722
    green_dominant = (g > r * 1.15) & (g > b * 1.15) & (g > 70) & (lum > GREEN_MIN_LUMA)
    bg = (dist < KEY_TOLERANCE) | green_dominant

    # --- 3. a solid silhouette -----------------------------------------------
    # Close hairline cracks in the key first (they are what let the road show
    # through the roof), fill what is enclosed, then keep the largest blob so
    # stray specks never make it into the sprite.
    sil = binary_closing(~bg, iterations=2)
    sil = binary_fill_holes(sil)
    blobs, _ = label(sil)
    sizes = np.bincount(blobs.ravel())
    sizes[0] = 0
    sil = blobs == sizes.argmax()

    # Background inside the silhouette is glass: recolour it, keep it opaque.
    interior_bg = bg & sil
    if interior_bg.any():
        smoked = np.clip(lum[..., None] * np.array([0.62, 0.72, 0.68]), 6, 52)
        rgb[interior_bg] = np.where(
            (lum[interior_bg, None] < 40), smoked[interior_bg], rgb[interior_bg] * 0.35
        )

    # --- 4. de-fringe on the outside edge only ------------------------------
    core = binary_erosion(sil, iterations=2)
    alpha = np.asarray(
        Image.fromarray((core * 255).astype(np.uint8)).filter(
            ImageFilter.GaussianBlur(EDGE_FEATHER)
        ),
        dtype=np.float32,
    )
    alpha = np.clip((alpha - 60.0) * (255.0 / 130.0), 0, 255)
    alpha[core] = 255.0  # guarantee: the interior is never see-through
    alpha[~sil] = 0.0    # hard zero outside the car

    out = np.dstack([rgb, alpha]).astype(np.uint8)
    car = Image.fromarray(out, mode="RGBA")

    # --- 5. tight crop + pad + downscale ------------------------------------
    car = car.crop(car.getbbox())
    w, h = car.size
    px, py = int(w * PADDING_RATIO), int(h * PADDING_RATIO)
    canvas = Image.new("RGBA", (w + px * 2, h + py * 2), (0, 0, 0, 0))
    canvas.paste(car, (px, py))
    w, h = canvas.size
    canvas = canvas.resize((TARGET_WIDTH, round(h * TARGET_WIDTH / w)), Image.LANCZOS)

    PUBLIC.mkdir(parents=True, exist_ok=True)
    webp = PUBLIC / "car-top.webp"
    png = PUBLIC / "car-top.png"          # 1x fallback for ancient browsers
    half = canvas.resize((round(w / 2), round(h / 2)), Image.LANCZOS)

    canvas.save(webp, "WEBP", quality=86, method=6)
    half.save(png, "PNG", optimize=True)

    for f, size in ((webp, canvas.size), (png, half.size)):
        print(
            f"wrote {f.relative_to(ROOT)}  {size[0]}x{size[1]}  "
            f"{f.stat().st_size / 1024:.0f} KB"
        )
    print(f"sprite aspect ratio (w/h) = {canvas.size[0] / canvas.size[1]:.3f}")


if __name__ == "__main__":
    main()
