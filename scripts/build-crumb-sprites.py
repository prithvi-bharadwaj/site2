# Builds public/images/crumb-sprites{,-fill}.png from raw sprite-sheet cutouts.
# Each source is a transparent-bg sheet of 2 rows x 3 cols; sprites are detected
# by alpha bands, tight-cropped, scaled uniformly (normalized across sheets via
# a reference sit pose), and bottom-aligned into 300x300 cells.
#
# Usage: python3 scripts/build-crumb-sprites.py <sheet1.png> <sheet2.png> ...
import sys

import numpy as np
from PIL import Image, ImageDraw

CELL = 300
BOTTOM_PAD = 10
MAX_SPRITE = 280
ALPHA_BARRIER = 60


def bands(values, threshold=0):
    on = values > threshold
    out, start = [], None
    for i, flag in enumerate(on):
        if flag and start is None:
            start = i
        if not flag and start is not None:
            out.append((start, i))
            start = None
    if start is not None:
        out.append((start, len(on)))
    # Fold low-mass bands (flying crumbs, drool drops) into the nearest sprite band.
    masses = [values[a:b].sum() for a, b in out]
    cutoff = max(masses) * 0.1
    majors = [band for band, mass in zip(out, masses) if mass >= cutoff]
    for band, mass in zip(out, masses):
        if mass >= cutoff:
            continue
        center = (band[0] + band[1]) / 2
        nearest = min(range(len(majors)), key=lambda i: abs((majors[i][0] + majors[i][1]) / 2 - center))
        majors[nearest] = (min(majors[nearest][0], band[0]), max(majors[nearest][1], band[1]))
    return majors


def crops_from_sheet(path):
    image = Image.open(path).convert("RGBA")
    alpha = np.array(image.getchannel("A"))
    row_bands = bands(alpha.sum(axis=1))
    col_bands = bands(alpha.sum(axis=0))
    assert len(row_bands) == 2 and len(col_bands) == 3, (
        f"{path}: expected 2x3 sprites, got {len(row_bands)}x{len(col_bands)}"
    )
    crops = []
    for r0, r1 in row_bands:
        for c0, c1 in col_bands:
            sub = image.crop((c0, r0, c1, r1))
            crops.append(sub.crop(sub.getchannel("A").getbbox()))
    return crops


def main(paths):
    sheets = [crops_from_sheet(path) for path in paths]

    # Scale sheet 0 to fit, then match later sheets to its upright-sit height
    # (laughing pose, index 2) so the pup doesn't change size between frames.
    scales = [MAX_SPRITE / max(max(c.width, c.height) for c in sheets[0])]
    reference_height = sheets[0][2].height * scales[0]
    for crops in sheets[1:]:
        scale = reference_height / crops[1].height  # alert sit pose
        scale = min(scale, (CELL - 4) / max(max(c.width, c.height) for c in crops))
        scales.append(scale)

    rows = 2 * len(sheets)
    outline = Image.new("RGBA", (CELL * 3, CELL * rows), (0, 0, 0, 0))
    for sheet_index, crops in enumerate(sheets):
        for i, crop in enumerate(crops):
            w = round(crop.width * scales[sheet_index])
            h = round(crop.height * scales[sheet_index])
            crop = crop.resize((w, h), Image.LANCZOS)
            x = (i % 3) * CELL + (CELL - w) // 2
            y = (sheet_index * 2 + i // 3) * CELL + (CELL - BOTTOM_PAD - h)
            outline.paste(crop, (x, y), crop)

    alpha = outline.getchannel("A")
    black = Image.new("L", outline.size, 0)
    Image.merge("RGBA", (black, black, black, alpha)).save(
        "public/images/crumb-sprites.png", optimize=True
    )

    # Silhouette sheet: flood the outside, everything unreached is body fill.
    work = alpha.point(lambda v: 255 if v > ALPHA_BARRIER else 0)
    ImageDraw.floodfill(work, (0, 0), 128)
    silhouette = work.point(lambda v: 0 if v == 128 else 255)
    Image.merge("RGBA", (black, black, black, silhouette)).save(
        "public/images/crumb-sprites-fill.png", optimize=True
    )
    print("outline:", outline.size, "cells:", 3, "x", rows)


if __name__ == "__main__":
    main(sys.argv[1:])
