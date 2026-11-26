# Références techniques 2,5D

Direction : conserver React/TypeScript et le moteur décisionnel. Évaluer un rendu CSS 3D texturé et des sprites prérendus à huit directions, caméra contrainte, collisions indépendantes du rendu. Ne pas utiliser des rectangles CSS comme graphismes finaux.

## Références à étudier
- https://github.com/pkalogiros/css3d-game : géométrie CSS, éclairage et ombres.
- https://github.com/snuffyDev/Wolfensvelte-3D : boucle de jeu, composants de portes et interactions DOM.
- https://github.com/NielsLeenheer/cssDOOM : textures, projection et sprites DOM. GPL-2.0 : étude conceptuelle uniquement avant décision de licence.
- https://github.com/guilhermecibien/isometric-rpg-animation : projection, animation directionnelle, synchronisation des pas et profondeur.
- https://github.com/melonjs/melonJS : alternative de rendu et sprites 2,5D.

## Critères
Décor médical détaillé, textures cohérentes, personnage semi-réaliste original, ombres de contact, pas de glissement des pieds, occultation crédible, contrôles tactiles et clavier, objectif 30–60 FPS à mesurer. Pas de données cliniques internes ni de ressources sans droits vérifiés dans le dépôt public.

Les README ont servi à présélectionner ces références. Le code et les licences de chaque dépendance restent à auditer avant toute réutilisation. Aucun code tiers importé à cette étape.

## Licences vérifiées (novembre 2026)
| Dépôt | Licence | Usage dans Quérix |
|---|---|---|
| pkalogiros/css3d-game | MIT | Concept : ombres de contact et éclairage simulé. |
| snuffyDev/Wolfensvelte-3D | Unlicense (domaine public) | Concept : boucle `requestAnimationFrame` et interactions DOM superposées. |
| NielsLeenheer/cssDOOM | GPL-2.0 | Étude conceptuelle uniquement, aucun code repris (incompatible avec un usage non GPL). |
| guilhermecibien/isometric-rpg-animation | MIT | Concept : animation directionnelle synchronisée sur la distance parcourue. |
| melonjs/melonJS | MIT | Concept : tri de profondeur (ordre du peintre) et collisions séparées du rendu. |

Aucun code tiers n'a été copié : seules les techniques ont été réimplémentées.

## Implémentation actuelle (`apps/web/app/ClinicGame.tsx`, `clinicWorld.mjs`)
- Décor peint `clinic.webp` (1276 × 490) rendu en Canvas 2D ; caméra qui suit le joueur sur mobile.
- Géométrie en pixels du décor : polygone praticable, obstacles (ellipses, segments), zones de réponse. Testée par `tests/clinic-world.test.mjs`.
- Perspective : hauteur du personnage = 100 px au fond → 215 px au premier plan, vitesse proportionnelle.
- Occultation : comptoir, plantes, poteaux et cordons sont redécoupés du décor (masque polygone + clé de couleur) et redessinés devant le personnage quand leur ligne de sol est plus proche. Les cordons en biais sont découpés en bandes verticales ayant chacune leur ligne de sol.
- Animation : une image toutes les 0,14 hauteur de corps parcourue, donc les pieds ne glissent pas ; la gauche est le miroir de la droite.
- Ombre de contact double (noyau + halo) et reflet atténué sur le sol ciré.
- Contrôles : flèches/ZQSD/WASD, croix tactile, toucher-pour-aller avec recherche de chemin (grille 8 px + lissage), touche E / bouton Interagir.

## Sprites
Le pack fourni avait un détourage cassé (le sweat marine avait été effacé avec le fond). Les couleurs étaient intactes sous la transparence : `tools/sprites/rematte.py` refait le masque, `tools/sprites/normalize.py` aligne les 18 images sur une toile 96 × 160, pieds à y = 154, même hauteur dans les trois directions.
