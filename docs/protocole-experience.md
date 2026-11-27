# Protocole d'amélioration de l'expérience Quérix (UX, UI, ressenti de jeu)

Ce protocole sert à faire progresser le jeu 3D de Quérix **par itérations mesurables**, en s'appuyant
sur des références publiées plutôt que sur l'intuition. Chaque itération suit la même boucle et se
termine par un commit poussé sur GitHub et un lien vers la version en ligne.

## 1. La boucle d'itération

1. **Mesurer** sur un vrai téléphone : ouvrir `https://davidj97.github.io/querix/?debug=1`, lancer le jeu,
   noter images/s, appels de dessin, triangles et palier de qualité affichés en haut à droite.
2. **Choisir** au maximum trois améliorations dans la grille ci-dessous, en priorisant ce qui touche
   l'apprentissage, puis la jouabilité, puis la beauté.
3. **Chercher l'existant** : ressource CC0 (ambientCG, Poly Haven, Kenney, Quaternius, KayKit) ou technique
   documentée (exemples officiels Three.js), avant d'écrire quoi que ce soit de zéro.
4. **Implémenter** avec un test automatique quand la logique s'y prête (`tests/*.test.mjs`).
5. **Vérifier** : `node --test`, `tsc`, build GitHub Pages, parcours complet au toucher (joystick → poste
   → Interagir → question suivante), captures ordinateur + mobile.
6. **Publier** : un commit par changement, push, déploiement Actions vert, lien en ligne.

## 2. Budgets à respecter

| Mesure | Cible téléphone | Cible ordinateur | Référence |
|---|---|---|---|
| Images/s | ≥ 30 stable | 60 | — |
| Appels de dessin par image | < 150 (idéal < 100) | < 300 | Guides de performance Three.js : sous 500, idéalement sous 100 |
| Résolution de rendu | ≤ 1,35× | ≤ 2× | Limiter le *pixel ratio* est la première économie sur mobile |
| Poids des ressources 3D | < 3 Mo | < 6 Mo | — |
| Démarrage de la scène | < 5 s en 4G | < 2 s | — |

État au 27 novembre 2026 (mesuré en rendu logiciel, sans GPU) : **234 appels de dessin** ombres comprises
(433 avant la fusion du décor), ~95 k triangles, ~1 Mo de ressources 3D.

## 3. Grille d'évaluation

Légende : ✅ en place · 🔜 prochaine itération · 💡 plus tard.

### A. Rendu et performance
- ✅ Matériaux PBR texturés (couleur, relief, rugosité) à l'échelle réelle : carrelage 60 cm, mosaïque, plâtre, dalles de plafond.
- ✅ Éclairage d'ambiance par HDRI (reflets crédibles sur le sol ciré).
- ✅ Post-traitement : occlusion ambiante GTAO (ordinateur), halo des lumières, anticrénelage MSAA, tonemapping ACES.
- ✅ Paliers de qualité automatiques (haut / moyen / bas) : on descend d'un palier si l'appareil passe sous ~28 i/s.
- ✅ Décor fixe fusionné par matériau ; chaises instanciées.
- 🔜 Compresser les textures en KTX2/Basis (mémoire GPU divisée par 4 à 6 sur mobile).
- 🔜 Réduire les appels des personnages : atlas de couleurs (un seul matériau par personnage) et ombres limitées au joueur sur mobile.
- 💡 Niveaux de détail (LOD) pour les personnages éloignés.

### B. Contrôles tactiles
- ✅ Joystick **flottant** : il apparaît sous le pouce (moitié gauche de la scène), comme le recommandent les guides d'Apple.
- ✅ Zone morte (12 %) et courbe de réponse progressive : précis près du centre, pleine vitesse au bord.
- ✅ Caméra au glissé direct (pas de second joystick) ; défilement vertical de la page conservé.
- ✅ Alternatives : toucher une destination (chemin calculé), clavier ZQSD/flèches, bouton Courir.
- 🔜 Réglage de la sensibilité de la caméra et inversion de l'axe.
- 💡 Taille et position des boutons ajustables.

### C. Ressenti (« game feel », « juice »)
Le *juice* doit **renforcer la boucle principale** (se déplacer, choisir un poste, répondre) et rester sobre :
c'est une formation, pas un jeu d'action.
- ✅ Pas synchronisés sur le cycle de marche, sons d'interface et de validation, bouton muet mémorisé.
- ✅ Vibration courte à l'arrivée dans une zone et à la validation.
- ✅ Flash de confirmation à la réponse ; anneaux et étiquettes qui pulsent ; flèches de guidage animées.
- 🔜 Petites particules au sol lors de la validation (anneau qui s'élargit).
- 🔜 Vie ambiante : personnel qui tourne la tête vers le joueur, patients qui changent de posture.
- 💡 Ambiance sonore discrète de salle d'attente (avec volume séparé).

### D. Accessibilité (Game Accessibility Guidelines, niveau « basic » en priorité)
- ✅ Respect du réglage système « réduire les animations ».
- ✅ Son coupable et réglage mémorisé ; aucune information portée uniquement par le son.
- ✅ Toujours une alternative sans 3D : mode 2,5D et boutons de réponse sous le jeu.
- 🔜 Taille du texte des étiquettes réglable ; contraste vérifié (WCAG AA) sur toutes les puces.
- 🔜 Champ de vision réglable (recommandation des guidelines pour les jeux 3D) pour limiter le mal des transports.
- 🔜 Tutoriel d'une minute au premier lancement, rejouable.

### E. Pédagogie (jeu sérieux)
- ✅ Le guidage au sol n'indique **jamais** la bonne réponse : les flèches n'apparaissent que vers le poste choisi par l'apprenant.
- ✅ Contenu fictif uniquement, aucune donnée patient, aucun protocole interne dans le dépôt public.
- 🔜 Rétroaction immédiate après chaque réponse : pourquoi, en une phrase, avec la source du protocole fictif.
- 🔜 Écran de débriefing à la fin : réponses, temps, points à revoir.
- 💡 Répétition espacée des questions ratées ; difficulté adaptative.

### F. Interface (identité Quérix)
- ✅ Bleu Quérix, panneaux en verre dépoli, hiérarchie claire (destination → distance → action).
- 🔜 Écran de chargement illustré avec progression réelle.
- 🔜 Panneau « Réglages » unique : son, qualité forcée, sensibilité, champ de vision, taille du texte.

## 4. Feuille de route proposée

1. **Personnages semi-réalistes** : packs CC0 Quaternius « Universal Base Characters » et « Universal Animation Library »
   (à fournir en ZIP, sites bloqués depuis l'environnement de Claude). C'est le levier visuel le plus fort qui reste.
2. KTX2 et atlas des personnages (budget mobile < 150 appels).
3. Rétroaction pédagogique et débriefing.
4. Panneau de réglages et tutoriel (accessibilité).
5. Vie ambiante et particules.

## 5. Sources

- Game Accessibility Guidelines — https://gameaccessibilityguidelines.com/
- Xbox Accessibility Guidelines — https://learn.microsoft.com/gaming/accessibility/guidelines
- Apple Human Interface Guidelines, *Game controls* — https://developer.apple.com/design/human-interface-guidelines/game-controls
- Bugnet, *How to fix mobile virtual joystick feeling bad* — https://bugnet.io/blog/how-to-fix-mobile-virtual-joystick-feeling-bad
- Martin Jonasson et Petri Purho, *Juice it or lose it* (GDC 2012) et la page Wikipédia *Game feel* — https://en.wikipedia.org/wiki/Game_feel
- GameAnalytics, *Squeezing more juice out of your game design* — https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design
- Codrops, *Building Efficient Three.js Scenes* (2025) — https://tympanus.net/codrops/2025/02/11/building-efficient-three-js-scenes-optimize-performance-while-maintaining-quality/
- MetaDesign Solutions, *Three.js performance optimization* — https://metadesignsolutions.com/blog/threejs-performance-optimization-best-practices
- *Game-based learning in medical education* (revue, PMC, 2023) — https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10020233/
- *Serious Games in Health Professions Education: Review of Trends and Learning Efficacy* (Yearbook of Medical Informatics, 2019) — https://pmc.ncbi.nlm.nih.gov/articles/PMC6697512
- Ressources : ambientCG, Poly Haven, Kenney, Quaternius (toutes CC0) — voir `apps/web/public/game3d/CREDITS.md`.
