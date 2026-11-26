# Phase G : Personnages et animations

## Avatar principal
Jeune homme à peau foncée, cheveux courts bouclés, chandail à capuche marine, jeans, chaussures sport, sac à dos. Style low-poly semi-réaliste, proportions humaines, logo Quérix indépendant. Silhouette et vêtements constants dans les quinze chapitres.

## PNJ
Patients adultes et aînés, parents, enfants accompagnés, agents administratifs, personnel infirmier, responsables. Personnages fictifs, diversité de morphologies, âges et apparences. Aucun visage de patient réel. Ne pas déduire une condition médicale de l'apparence.

## Personnel infirmier moderne
Uniforme médical contemporain bleu marine ou turquoise, pantalon médical, espadrilles professionnelles blanches, carte d'identification fictive, cheveux attachés selon le personnage. Aucune coiffe traditionnelle. Variantes à valider.

## Animations
Repos, respiration, clignement, marche, course, virage, arrêt, interaction, prise et dépôt d'objet, ouverture de porte, conversation, écoute, attente, assise, lever, montée d'escalier. Saut et actions spécialisées selon chapitre. Transitions via machine d'états et blend spaces; IK pieds et mains selon besoin. Expressions sobres.

## Contrôles
Clavier/souris, manette et commandes tactiles. Caméra troisième personne orbitale, collision caméra, sensibilité réglable, option de réduction des mouvements. Alternative sans déplacement 3D pour toutes les décisions pédagogiques.

## Pipeline proposé
Fiches de référence face/profil/dos, modèle Blender, UV et matériaux, squelette compatible Unreal, skinning, animations, import, Animation Blueprint, tests. Squelette commun pour adultes lorsque compatible; variantes enfants adaptées. Budgets polygonaux à confirmer par benchmark. Ne pas utiliser de ressources sans licence vérifiée.

## Comportement
PNJ avec états attente, approche, conversation, interaction et départ. Le moteur décisionnel pilote les événements pédagogiques; aucune animation ne modifie seule un verdict. Dialogues fictifs, sous-titres, audio facultatif. Aucun diagnostic déduit des gestes.

## Validation
- [ ] Valider fiche visuelle avatar.
- [ ] Produire modèle et rig.
- [ ] Produire animations et transitions.
- [ ] Tester collisions, caméra et commandes.
- [ ] Tester PNJ et synchronisation avec moteur.
- [ ] Vérifier licences et accessibilité.

Spécifications documentées, aucun modèle, rig ou animation exécutable livré. Issue #7 ouverte. Suite : phase H, environnements et établissements.
