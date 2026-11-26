# Phase Q : Sécurité et confidentialité
Objectif : minimisation des données et séparation formation/professionnel. Aucun dossier patient, NAM, nom de patient ou texte libre clinique dans Quérix. Ne pas enregistrer les réponses professionnelles individuelles ni les transmettre au serveur 3D. Contenus internes uniquement dans un environnement autorisé, jamais dans GitHub public.
## Accès proposés
Agent : consulter les protocoles autorisés et ses formations. Responsable : consulter les résultats de formation autorisés et valider les contenus selon mandat. Administrateur technique : infrastructure sans accès métier par défaut. Appliquer le moindre privilège, refus par défaut, contrôle serveur, MFA pour comptes privilégiés, sessions révocables. Préférer SSO institutionnel si autorisé.
## Mesures
HTTPS, cookies Secure HttpOnly SameSite adaptés, CSRF, CSP, validation des entrées, limitation de débit, secrets hors Git, dépendances verrouillées et analysées, journaux minimisés, sauvegardes chiffrées et restauration testée. Isolation du serveur GPU, accès distant authentifié. Pas de données sensibles dans URL, cache, analytics, crash reports ou prompts IA.
## Gouvernance Québec
Faire déterminer par le responsable de la protection des renseignements personnels le régime applicable, notamment la Loi sur les renseignements de santé et de services sociaux et les dispositions pertinentes modernisées par la Loi 25. Évaluer les facteurs relatifs à la vie privée lorsque requis, les fournisseurs, les transferts hors Québec, la conservation, les incidents et les droits des personnes. Autorisation institutionnelle avant usage professionnel. Ceci est un plan technique, pas une certification juridique.
## Validation
Tests d'autorisation, fuite de données, XSS, CSRF, sessions, dépendances, isolation, restauration et réponse aux incidents. Aucun contrôle déployé ou audité à ce stade. Issue #17 ouverte. Suite R : IA et dialogues.
