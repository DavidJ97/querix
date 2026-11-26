import sys, glob, os
import numpy as np
from PIL import Image
from scipy import ndimage as nd
src, dst = sys.argv[1], sys.argv[2]
os.makedirs(dst, exist_ok=True)
for f in sorted(glob.glob(src+'/*-*.png')):
    a = np.asarray(Image.open(f).convert('RGBA')).astype(np.float32)
    rgb = a[..., :3]
    h, w = rgb.shape[:2]
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.sqrt(((rgb - bg) ** 2).sum(-1))
    fg = dist > float(sys.argv[3]) if len(sys.argv) > 3 else dist > 22
    # background = region connected to the border among non-fg pixels
    closed = nd.binary_closing(fg, structure=np.ones((3,3)), iterations=int(sys.argv[4]) if len(sys.argv)>4 else 2)
    lab, _ = nd.label(~closed)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bgmask = np.isin(lab, list(edge))
    # small enclosed background pockets (<30px) are holes -> foreground; larger ones (between arm/body) stay bg
    mask = ~bgmask & (fg | nd.binary_dilation(fg, iterations=3))
    mask = nd.binary_opening(mask, iterations=1)
    lab2, n = nd.label(mask)
    if n:
        sizes = nd.sum(mask, lab2, range(1, n + 1))
        mask = lab2 == (1 + int(np.argmax(sizes)))  # keep main body only (drop specks)
        # re-add parts attached: keep any component > 15% of main
        keep = [i + 1 for i, s in enumerate(sizes) if s > 0.05 * sizes.max()]
        mask = np.isin(lab2, keep)
    mask = nd.binary_fill_holes(mask)
    # Jambes : pas de fermeture morphologique (elle comble l'espace entre les jambes).
    # Seuls les petits trous (< 40 px) sont bouchés ; les vides ouverts restent transparents.
    strict = nd.binary_opening(fg, iterations=1)
    holes = nd.binary_fill_holes(strict) & ~strict
    hl, hn = nd.label(holes)
    if hn:
        hs = nd.sum(holes, hl, range(1, hn + 1))
        strict |= np.isin(hl, [i + 1 for i, v in enumerate(hs) if v < 120])
    ys = np.nonzero(mask.any(1))[0]
    cut = int(ys[0] + 0.58 * (ys[-1] - ys[0])) if len(ys) else h
    if os.path.basename(f).startswith("right"): mask[cut:] &= strict[cut:]
    mask = nd.binary_erosion(mask, iterations=1)
    alpha = nd.gaussian_filter(mask.astype(np.float32), 0.6)
    alpha = np.clip((alpha - 0.15) / 0.7, 0, 1)
    # despill: pull edge colors away from dark bg
    out = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    Image.fromarray(out, 'RGBA').save(os.path.join(dst, os.path.basename(f)), optimize=True)
    print(os.path.basename(f), int(mask.sum()), bg.round())
