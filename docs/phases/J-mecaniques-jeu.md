# Phase J : Mécaniques de jeu

## Contrôles proposés
PC : WASD ou ZQSD configurables, souris caméra, E interaction, espace saut lorsque pertinent, Maj course, Échap pause. Manette : sticks déplacement/caméra, boutons configurables. Mobile : joystick gauche, caméra tactile droite, boutons contextuels. Alternative accessible sans déplacement ni précision motrice.

## Physique et interactions
Déplacement troisième personne, collisions capsule, caméra anti-obstacle, détection de proximité, interaction contextuelle, prise/dépôt d'objets, portes, échelles, ascenseurs, cibles, ponts et aiguillages. Pas de combat contre les patients. Les erreurs motrices permettent de réessayer sans sanction pédagogique.

## Dialogues
PNJ fictifs, choix explicites, sous-titres, répétition des informations, audio facultatif. Aucun renseignement réel ni décision clinique générée par un PNJ.

## Contrat événementiel proposé
Chaque action pédagogique émet sessionId, protocolVersion, nodeId, optionId, eventId, expectedRevision. Le moteur valide la transition et retourne revision, nextNode, verdict éventuel et feedback. Les actions purement physiques ne changent pas les réponses. Événements dupliqués ignorés, événements périmés rejetés, ordre vérifié. Une seule autorité logique pour les trois modes. Retour arrière invalide les réponses ultérieures. Synchronisation après reconnexion depuis l'état autorisé; pas de données patient persistantes.

## Boucle
Explorer → interagir → sélectionner une réponse → validation → retour pédagogique → prochaine étape ou bilan. Les verdicts GO/HOLD/STOP/DONE sont également valides lorsque conformes au scénario. Aucun trophée, classement ou récompense liée au nombre de rendez-vous.

## États
Chargement, exploration, interaction, dialogue, validation, feedback, pause, reconnexion, bilan. Suspendre les entrées pendant validation. Déconnexion 3D : alternative questionnaire disponible. Réduction des mouvements, absence de chronomètre obligatoire, commandes remappables.

## Tests
Transitions valides et invalides, doublons, événements hors ordre, retour arrière, changement de mode, déconnexion, collisions, commandes tactiles et clavier, accessibilité, parité des verdicts. Prototyper avant validation.

Spécifications seulement; aucune mécanique Unreal exécutable ni test réalisé. Issue #10 ouverte. Suite : phase K, scénarios pédagogiques.
