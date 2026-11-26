# Phase M : Architecture technique

## Choix proposés
PWA Next.js/React/TypeScript, Motion, Zod, MiniSearch, IndexedDB limité aux ressources publiques et entraînements fictifs; API Node.js, PostgreSQL; Unreal Engine 5 C++/Blueprint, Blender, Pixel Streaming/WebRTC; Docker pour services compatibles, GitHub Actions, Vitest et Playwright. Versions à verrouiller après preuve de concept.

## Monorepo cible
apps/web, apps/api, packages/decision-engine, packages/contracts, packages/ui, packages/training, game/Querix, infrastructure, tests, docs, assets. Les chemins sont une proposition, pas une application existante.

## Autorité et flux
Le moteur TypeScript déterministe valide les transitions, les versions et les verdicts. Le client peut exécuter les règles autorisées localement pour le mode professionnel hors ligne si elles sont valides; aucune règle expirée ne produit GO. API et moteur partagent le même paquet. Unreal reçoit les états et émet des intentions via un adaptateur authentifié; aucun verdict calculé par la physique. Les sessions de formation sont fictives. Pixel Streaming transporte vidéo/audio et entrées; canal applicatif validé pour événements. Reconnexion par révision, identifiants idempotents et rejet des événements périmés.

## Infrastructure
Web et API indépendants du serveur GPU. Serveur domestique envisagé pour prototype avec GPU compatible, signalisation, ICE/STUN/TURN si nécessaire, HTTPS, authentification et isolation réseau. Pas d'ouverture publique directe de ports administratifs. Capacité par session à mesurer; vérifier encodeur, bande passante montante, latence, disponibilité et coûts. Une panne GPU ne bloque pas le mode professionnel.

## Données et sécurité
PostgreSQL : comptes, préférences, progression fictive, métadonnées de versions autorisées. Aucun dossier patient, NAM, données de santé réelles ou règles internes dans le dépôt public, journaux, télémétrie ou cache. Les contenus métier autorisés sont distribués séparément avec contrôle d'accès. Secrets hors Git. Aucun lien direct avec Clic Santé sans autorisation et intégration approuvée.

## Validation
Prototype web indépendant, moteur et tests de parité, scène Unreal minimale, streaming sur réseau local puis distant sécurisé, tests de reconnexion, accessibilité, charge et confidentialité. Les technologies et l'hébergement restent à valider; aucun serveur ni application déployé par cette phase. Issue #13 ouverte. Suite N : développement web.
