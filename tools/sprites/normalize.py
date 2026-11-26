import sys, glob, os
import numpy as np
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]; os.makedirs(dst, exist_ok=True)
W, H, FOOT, TARGET = 96, 160, 154, 146   # canvas, feet baseline, body height
for d in ['back', 'front', 'right']:
    ims = [Image.open(f'{src}/{d}-{i}.png').convert('RGBA') for i in range(6)]
    boxes = [im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox() for im in ims]
    hmed = np.median([b[3] - b[1] for b in boxes])
    cx = np.median([(b[0] + b[2]) / 2 for b in boxes])   # one anchor per direction keeps natural sway
    k = TARGET / hmed
    for i, (im, b) in enumerate(zip(ims, boxes)):
        big = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
        c = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        c.alpha_composite(big, (round(W / 2 - cx * k), round(FOOT - b[3] * k)))
        c.save(f'{dst}/{d}-{i}.png', optimize=True)
    print(d, 'scale', round(k, 3), 'hmed', hmed)
