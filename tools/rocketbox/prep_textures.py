"""TGA Rocketbox (2048 px) -> WebP à la taille voulue. Usage : prep_textures.py <Assets> <sortie> <avatars.json>"""
import json, os, sys
from PIL import Image
assets, out, manifest = sys.argv[1], sys.argv[2], sys.argv[3]
for a in json.load(open(manifest))['avatars']:
    src = os.path.join(assets, 'Avatars', a['src'], 'Textures'); dst = os.path.join(out, a['id']); os.makedirs(dst, exist_ok=True)
    for f in sorted(os.listdir(src)):
        if not f.endswith('.tga') or ' ' in f or 'wrinkle' in f or 'specular' in f: continue
        im = Image.open(os.path.join(src, f)); keep_alpha = im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] < 250
        im = im.convert('RGBA' if keep_alpha else 'RGB').resize((a['size'], a['size']), Image.LANCZOS)
        im.save(os.path.join(dst, f[:-4] + '.webp'), quality=88 if 'normal' in f else 82, method=6)
    print(a['id'], sorted(os.listdir(dst)))
