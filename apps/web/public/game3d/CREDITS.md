# Crédits des ressources 3D

## avatars/ et anims/
- Microsoft Rocketbox Avatar Library (https://github.com/microsoft/Microsoft-Rocketbox), licence MIT,
  Copyright (c) 2020 Microsoft. Avatars : Male_Adult_17 (joueur), Medical_Female_01/02, Medical_Male_01/04,
  Female_Adult_01/04/09/12, Male_Adult_02/06/08. Animations : idle/walk/run neutral 01, sit_table_idle_neutral_01,
  sit_chair_idle_waiting_01 (versions homme et femme).
- Convertis avec FBX2glTF, textures réduites en WebP, maillages et animations compressés (meshopt) :
  voir `tools/rocketbox/`.

Les murs, le mobilier, la signalétique et l'éclairage sont générés en code
dans `apps/web/app/Clinic3D.tsx`. Aucune donnée réelle de patient ni protocole interne.

## textures/ (tile_*, mosaic_*, plaster_normal)
- Matériaux ambientCG (https://ambientcg.com), licence CC0 1.0.
- Copie traitée provenant du dépôt GitHub `itz019/tls-textures` (README : « Source: ambientCG, CC0 1.0 »).
- Redimensionnées et recompressées en JPEG pour le web ; teintes ajustées dans le code.

## env/lobby.exr
- HDRI « lobby » de Poly Haven (https://polyhaven.com), licence CC0 1.0, version web 512 px
  du paquet npm `@pmndrs/assets` 1.7.0 (licence CC0-1.0). Sert uniquement aux reflets et à l'éclairage d'ambiance.

## audio/ (step, ui, confirm, level_up)
- Packs sonores Kenney (Impact Sounds, Interface Sounds, RPG Audio…), licence CC0 1.0,
  via le paquet npm `@netforge/asset-library-files` 0.2.0 ; convertis en MP3 mono.

## textures/ (knit_*, jersey_*, denim_*, linen_*, leather_*, veneer_*)
- Textures Poly Haven (https://polyhaven.com), licence CC0 1.0, téléchargées depuis l'API officielle :
  `jogging_melange` → knit, `cotton_jersey` → jersey, `denim_fabric_04` → denim, `rough_linen` → linen,
  `leather_white` → leather, `okoume_veneer` → veneer.
- Réduites en 512 px ; knit, jersey et leather converties en niveaux de gris pour être teintées dans le code.
- Plaquées par projection triplanaire (`Clinic3D.tsx`, fonction `triplanar`) : vêtements, rideaux, assises, façades de bureau.

## props/ (potted_plant_02, WetFloorSign_01, wall_clock, clipboard, office_notepads)
- Modèles Poly Haven (https://polyhaven.com/models), licence CC0 1.0, glTF 1K téléchargé depuis l'API officielle.
- Simplifiés (meshopt), textures WebP 512 px : voir `tools/rocketbox/polyhaven_models.mjs`.

## demo/ (clinic_booth.glb, lightmap.webp, env.exr)
- Décor modélisé en Python dans Blender 5.3 (`tools/blender/clinic_booth.py`), éclairage calculé par Cycles :
  lightmap précalculée (débruitée par OpenImageDenoise) et panorama d'environnement de la même scène.
- Textures : ambientCG et Poly Haven (CC0) ; signalétique générée. Aucune donnée réelle.
