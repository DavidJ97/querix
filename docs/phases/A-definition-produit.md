# Phase A : Définition du produit

## Vision
Quérix est un projet indépendant d'assistance administrative et de formation immersive en santé. Il ne constitue pas un service officiel ni un dispositif de décision clinique.

## Utilisateurs
Agents administratifs expérimentés, nouveaux agents en formation et formateurs autorisés.

## Trois modes
- Professionnel : recherche rapide, questionnaire conditionnel, orientation, scripts et résumé copiable. Fonctionnement indépendant du jeu.
- Hybride : questionnaire et scène 3D synchronisés dans les deux sens.
- Immersif : simulation à la troisième personne, interactions physiques, dialogues fictifs et bilan pédagogique.

## Parcours
Accueil → sélection du protocole → questions pertinentes → décision administrative → instructions → résumé.
Formation : sélection du chapitre → scénario fictif → interactions → décision → explication → reprise ou révision.

## Exigences
- Quinze protocoles, chacun avec une mécanique ludique distincte.
- Moteur décisionnel commun, déterministe et versionné.
- États GO, HOLD, STOP, DONE. Informations insuffisantes : vérification humaine.
- Navigation mobile inférieure : Accueil, Protocoles, Jeu 3D, Répertoire, Profil.
- Français et anglais, accessibilité WCAG 2.2 AA comme objectif.
- Univers low-poly contemporain inspiré des établissements réels; avatar en chandail marine et sac à dos.
- Aucun plateau générique, aucun trophée ni section Succès.
- Les orientations sans rendez-vous sont des résultats pédagogiques valides.

## Périmètre V1
Catalogue, recherche, questionnaires, résumés, répertoire, aide à la réservation, progression, trois modes, quinze chapitres. Première tranche verticale : un protocole complet et un environnement jouable, avant extension.

## Hors périmètre
Réservation automatique réelle, dossier patient, diagnostic, intégration aux systèmes institutionnels sans autorisation, données identifiantes, classement compétitif.

## Confidentialité
Dépôt public : uniquement documentation non confidentielle, code et données synthétiques. Référentiel interne conservé séparément. Aucun renseignement patient sur le serveur personnel. Usage professionnel réel soumis à validation institutionnelle.

## Critères d'acceptation
- [ ] Valider les trois modes et leurs parcours.
- [ ] Valider le périmètre V1 et les exclusions.
- [ ] Confirmer les utilisateurs et les exigences d'accessibilité.
- [ ] Choisir le premier chapitre du prototype.
- [ ] Valider la séparation des données et les conditions d'utilisation.
- [ ] Approuver cette spécification avant la clôture de #1.

## Décisions ouvertes
Choix définitif du moteur graphique, architecture de déploiement, premier chapitre, identité graphique finale et modalités de validation métier. Les estimations du plan directeur ne sont pas des engagements.

## Livrable suivant
Phase B : identité visuelle et design system.
