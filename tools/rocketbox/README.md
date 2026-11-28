# Conversion des avatars Microsoft Rocketbox (MIT) pour Quérix

1. Cloner https://github.com/microsoft/Microsoft-Rocketbox (sparse : seuls les avatars et animations utiles).
2. `python3 prep_textures.py <rocketbox>/Assets <sortie>/tex` : TGA 2048 px → WebP (1024 joueur, 512 PNJ).
3. `node build.mjs <rocketbox>/Assets <sortie>/tex <dossier public game3d>` : FBX → GLB (FBX2glTF), textures
   attachées, cheveux en alpha « mask », couleurs de sommets retirées, compression meshopt ; animations
   rééchantillonnées et compressées, une par fichier.

Dépendances : `npm i fbx2gltf @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer`.
