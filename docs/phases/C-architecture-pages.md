# Phase C : Architecture des pages

## Inventaire des écrans

| Nº | Écran | Route proposée | Fonction |
|---|---|---|---|
| 1 | Chargement | / | Initialisation, reprise et erreur |
| 2 | Accueil | /home | Recherche, raccourcis, reprise |
| 3 | Protocoles | /protocoles | Catalogue, catégories, favoris |
| 4 | Recherche | /recherche | Résultats et filtres |
| 5 | Protocole actif | /protocoles/:id/session | Questions conditionnelles, retour, réinitialisation |
| 6 | Verdict | /protocoles/:id/verdict | GO HOLD STOP DONE et justification |
| 7 | Résumé | /protocoles/:id/resume | Copie explicite et instructions |
| 8 | Clic Santé | /reservation | Guide sans réservation automatique |
| 9 | Répertoire | /repertoire | Recherche de services et établissements |
| 10 | Établissement | /repertoire/:id | Coordonnées publiques et services validés |
| 11 | Menu du jeu | /jeu | Reprise et chapitres |
| 12 | Chapitre | /jeu/:id | Objectifs et mécanique |
| 13 | Scénario | /jeu/:id/scenarios | Cas fictifs et difficulté |
| 14 | Chargement 3D | /jeu/session/connexion | Connexion, annulation, alternative 2D |
| 15 | Hybride | /jeu/session/hybride | Questionnaire et jeu synchronisés |
| 16 | Immersif | /jeu/session/immersif | Plein écran et commandes |
| 17 | Pause | overlay:pause | Reprise, commandes, quitter |
| 18 | Bilan | /jeu/session/bilan | Décisions et explications |
| 19 | Progression | /progression | Maîtrise et révision, sans trophées |
| 20 | Profil | /profil | Préférences et accès progression |
| 21 | Paramètres | /profil/parametres | Langue, audio, graphismes |
| 22 | Accessibilité | /profil/accessibilite | Contrastes, mouvements, commandes alternatives |
| 23 | Notifications | /notifications | Mises à jour validées |
| 24 | Sources | /sources | Références autorisées et versions |
| 25 | Aide | /aide | Guides et dépannage |

## Navigation
Mobile : cinq onglets persistants Accueil, Protocoles, Jeu 3D, Répertoire, Profil. Desktop : barre latérale équivalente. Les pages secondaires utilisent retour et fil d'Ariane selon le format. Le plein écran immersif masque la navigation, accessible via Pause. Logo SVG fourni par l'utilisateur : assets/brand/querix-icon.svg.

## Parcours
- Professionnel : Accueil → Protocoles ou Recherche → Protocole actif → Verdict → Résumé → aide à la réservation si pertinente.
- Formation : Jeu 3D → Chapitre → Scénario → Connexion → Hybride ou Immersif → Bilan → Progression.
- Répertoire : recherche → établissement → service.
- Profil : paramètres, accessibilité, progression et aide.

## Contrat de navigation
Retour sans perte des réponses en session; confirmation avant abandon; aucune donnée patient dans URL, historique, télémétrie ou stockage persistant. Liens directs vers les pages publiques; sessions de formation fictives restaurables. Le moteur métier contrôle les transitions de verdict, pas la route seule. Une déconnexion 3D ne bloque pas le mode professionnel.

## Responsive
Mobile portrait : colonne unique, barre inférieure et zones sûres. Paysage : jeu prioritaire. Tablette : panneaux adaptatifs. Desktop : navigation latérale, questionnaire et scène côte à côte en hybride. Prévoir focus clavier, titres de page, annonces de changements et alternative 2D.

## États transversaux
Chargement, vide, erreur, hors ligne, données obsolètes, accès non autorisé, reconnexion et confirmation de sortie. Aucun verdict inventé en cas de données manquantes.

## Validation
- [ ] Vérifier les 25 écrans et les routes.
- [ ] Valider les parcours et retours.
- [ ] Tester les quatre formats.
- [ ] Vérifier les états transversaux et l'accessibilité.
- [ ] Valider la séparation formation/professionnel.

Les routes sont proposées, non implémentées. La phase #3 reste ouverte. Suite : phase D, maquettes UX/UI.
