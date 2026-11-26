# Phase E : Base de connaissances

## Séparation
Le moteur déterministe est indépendant des interfaces et du jeu. Les règles métier internes restent dans un espace autorisé non public. Ce dépôt public ne contient que le contrat générique et des exemples fictifs. La source de travail contient quinze chapitres; aucune règle clinique n'est publiée ici.

## Modèle proposé
Un protocole contient id, version, statut (draft, approved, retired), date d'effet, date de révision, références autorisées, nœud initial et nœuds. Un nœud question contient un identifiant, un libellé et des options avec destination explicite. Un nœud terminal contient verdict, justification et action. Chaque règle est traçable à sa source. Toute ambiguïté non résolue bloque la publication de la règle.

## Verdicts
GO : rendez-vous selon règle validée. HOLD : vérification humaine requise. STOP : ne pas poursuivre ce parcours, orientation selon source. DONE : parcours terminé sans action supplémentaire. Aucun verdict n'est un diagnostic.

## Exécution
Valider le graphe avant activation : identifiants uniques, destinations existantes, nœuds accessibles, absence de cycles non autorisés, options exhaustives. Une session conserve la version exacte du protocole et les réponses en mémoire. Un retour invalide les réponses ultérieures. Les trois modes consomment les mêmes transitions. Les règles manquantes, expirées ou non approuvées ne peuvent produire de GO.

## Exemple fictif
Question : le dossier de formation est-il complet ? Oui → DONE; Non ou Inconnu → HOLD. Aucun contenu médical réel.

## Tests requis
Couverture de toutes les branches, limites temporelles et numériques, réponses inconnues, retour arrière, changement de version, incohérences, parité des trois modes, absence de données patient dans les journaux. Relecture métier avant activation.

## Gouvernance
Importer les quinze protocoles dans un espace autorisé; conserver les formulations et références; documenter les divergences sans les résoudre par supposition; faire valider par responsable métier. Les versions approuvées sont immuables. Aucun LLM ne décide de l'admissibilité.

## État
Contrat proposé, moteur et règles réelles non implémentés. Issue #5 ouverte. Suite : phase F, direction artistique 3D.
