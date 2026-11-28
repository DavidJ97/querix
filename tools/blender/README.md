# Scène réaliste (démo) — Blender + Cycles

Prérequis : `uv venv blendenv --python 3.13 && uv pip install --python blendenv/bin/python bpy==5.3.0 pillow`.

1. Aperçu : `blendenv/bin/python clinic_booth.py -- --preview aperçu.png 48`
2. Précalcul (≈ 15 min sur 2 cœurs) : `blendenv/bin/python clinic_booth.py -- --bake out 2048 64`
   → `out/clinic_booth.glb` (2 jeux d'UV), `out/lightmap.exr`, `out/env.exr`.
3. Débruitage : `blendenv/bin/python denoise.py -- out/lightmap.exr out/lightmap_dn.exr`
4. Encodage web : `blendenv/bin/python encode_lightmap.py -- out/lightmap_dn.exr lightmap.webp`
5. Compression : `node compress_scene.mjs out/clinic_booth.glb clinic_booth.glb` (garde l'UV de la lightmap).

Dans le navigateur (`apps/web/app/demo/DemoScene.tsx`) : lightmap × 4π sur l'UV 1, panorama utilisé
seulement pour les reflets, rendu tonal Khronos PBR Neutral, exposition 0,3. Réglages testables :
`/demo/?tm=agx&exp=0.4&env=1`.
