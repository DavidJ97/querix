"""Lightmap EXR linéaire (Blender, origine en bas) -> WebP sRGB 8 bits, valeur / 4, origine en haut (UV glTF).
Usage : blender-python encode_lightmap.py -- <entrée.exr> <sortie.webp> [taille]"""
import bpy, sys, numpy as np
from PIL import Image
src, dst, *rest = sys.argv[sys.argv.index('--') + 1:]
img = bpy.data.images.load(src); w, h = img.size
px = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1, :, :3]   # retournement vertical
v = np.clip(px / 4.0, 0, 1)
srgb = np.where(v <= 0.0031308, v * 12.92, 1.055 * np.power(v, 1 / 2.4) - 0.055)
im = Image.fromarray((srgb * 255 + 0.5).astype(np.uint8))
if rest: im = im.resize((int(rest[0]), int(rest[0])), Image.LANCZOS)
im.save(dst, quality=92, method=6)
print('lightmap', w, h, 'max', float(px.max()), 'mean', float(px.mean()))
