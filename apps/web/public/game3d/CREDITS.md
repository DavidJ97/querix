# Crédits des ressources 3D

## characters/worker.glb
- Auteur : Quaternius (https://quaternius.com), modèle « Animated Human / Worker ».
- Licence : CC0 1.0 (domaine public), aucune attribution requise.
- Source : copie optimisée (meshopt) du paquet npm `@netforge/asset-library-files` 0.2.0,
  dont le fichier NOTICE indique que les modèles Quaternius retenus sont ceux publiés en CC0
  (les modèles sous CC-BY sont exclus).
- Les couleurs (tenue du joueur, blouses du personnel, patients) sont modifiées dans le code.

Tout le reste de la clinique 3D (murs, sol, mobilier, signalétique, éclairage) est généré en code
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
