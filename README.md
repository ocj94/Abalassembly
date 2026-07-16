# Abalassembly

*Abalone est une marque déposée d'Abalone S.A. (France). Ce projet est une implémentation non officielle, sans lien avec les ayants droit.*

**Jouer, apprendre et progresser au jeu de stratégie Abalone** — entièrement dans un seul fichier HTML, sans serveur, sans dépendance, hors-ligne.

### 🎮 [Jouer maintenant → ocj94.github.io/Abalassembly](https://ocj94.github.io/Abalassembly/)

Ou : ouvrez `index.html` dans un navigateur, tout est là.

## Sommaire

- [Règles en bref](#règles-en-bref)
- [Ce que contient le fichier](#ce-que-contient-le-fichier)
- [Choix techniques](#choix-techniques)
- [Backend (dormant)](#backend-dormant)
- [Développement](#développement)
- [Licence](#licence)

## Règles en bref

Deux joueurs, 14 billes chacun sur un plateau hexagonal. Un tour = déplacer une bille seule ou une colonne de 2-3 billes alignées, d'une case, dans une direction libre. Le premier à éjecter **6 billes adverses** hors du plateau gagne.

On ne peut pousser l'adversaire que si on est numériquement supérieur sur la ligne de poussée (un « sumito ») :

| Sumito | Faisable ? |
|---|---|
| ⚫⚫⚫ pousse ⚪⚪ (3 contre 2) | ✅ |
| ⚫⚫⚫ pousse ⚪ (3 contre 1) | ✅ |
| ⚫⚫ pousse ⚪ (2 contre 1) | ✅ |
| ⚫⚫ contre ⚪⚪, ⚫⚫⚫ contre ⚪⚪⚪ (égalité) | ❌ personne ne pousse |
| Une seule bille ne pousse jamais | ❌ |

## Ce que contient le fichier

**Jeu**
- Partie contre l'IA (plusieurs niveaux, moteur alpha-bêta + PVS + quiescence dans un Web Worker — l'interface ne gèle jamais)
- Mode 2 joueurs sur le même écran
- 18 variantes de position de départ (belge, german daisy, the wall, star…)
- Pendule réelle optionnelle : cadences 5+3, 10+5, 20+10 avec incrément et défaite au temps (mode « libre » par défaut)
- Bots conseillers (Bot Noir / Bot Blanc), duels de bots, skins de billes à débloquer, vue 3D à la demande

**Apprendre**
- 80 puzzles minés dans de vraies parties : 64 offensifs (« trouve le coup qui éjecte ») et 16 défensifs (« pare la menace d'éjection », toutes les parades valides acceptées)
- Défi du jour, mode Storm, tutoriels guidés, académie, règles illustrées
- Analyse de partie coup par coup : chaque erreur du rapport est cliquable et rejoue la position

**Plateau réel**
- Détection d'un plateau physique par photo (page Détection IA)
- Enregistreur de parties réelles : photographiez le plateau après chaque coup, les coups sont reconstitués automatiquement par le moteur, vérifiés, puis sauvegardés avec joueurs, date et variante — et rejouables dans la bibliothèque

**Bibliothèque**
- 4 480 parties réelles embarquées (AbalOnline + MIGS), rejouables coup par coup
- Book d'ouvertures miné depuis ces parties

**Labo**
- Auto-amélioration du moteur : duels SPRT, réglage SPSA, suivi Elo, exports CSV/JSON
- Replay des parties du Labo sur plateau bois avec les vrais skins de billes

## Choix techniques

| Choix | Pourquoi |
|---|---|
| **Un seul fichier HTML** | Distribution triviale : un fichier = tout le site. Fonctionne en `file://`, sur GitHub Pages, sur clé USB. |
| **Zéro dépendance** | Rien à installer, rien qui casse, rien à auditer chez un tiers. (Seule la vue 3D charge Three.js, à la demande.) |
| **Banques compressées** | Les 4 480 parties, le book et les sons sont embarqués en deflate + base64, décompressés nativement au chargement (`DecompressionStream`). Fichier ≈ 2,5 Mo au lieu de 4,4 Mo. Sur un navigateur ancien, le jeu fonctionne — seules bibliothèque, book et sons sont absents. |
| **Hors-ligne d'abord** | Aucune requête réseau nécessaire. Progression, réglages et puzzles résolus vivent dans le `localStorage`. |
| **IA dans un Worker** | La recherche tourne dans un thread séparé ; l'interface reste fluide pendant la réflexion. |

## Backend (dormant)

Un backend optionnel (comptes, synchronisation, classement mondial) existe dans le dépôt séparé [`abalassembly-api`](https://github.com/ocj94/abalassembly-api) — Node + Fastify + PostgreSQL + Redis, conçu RGPD-ready (argon2id, JWT révocable, MFA TOTP sans dépendance, purges automatiques). Il n'est **pas déployé** : le HTML ne l'appelle que si `BACKEND.enabled = true`, ce qui n'est pas le cas. Tant que ce drapeau est à `false`, le site ne collecte rien et ne contacte aucun serveur.

## Développement

Le fichier est volontairement lisible : sections commentées, code non minifié (seules les **données** sont compressées). Pour vérifier l'intégrité après modification :

```bash
# extraire chaque bloc <script> et le worker, puis :
node --check bloc.js
```

Les puzzles sont minés hors-ligne depuis les banques de parties par un critère vérifiable (menace d'éjection réelle, parades recalculées exhaustivement par le moteur) — aucun puzzle n'est inventé à la main.

## Licence

**GPL-3.0-or-later.** Vous pouvez utiliser, étudier, modifier et redistribuer ce jeu, à condition de conserver la même licence. Les parties de la bibliothèque proviennent de bases publiques (AbalOnline, MIGS) et restent créditées à leurs joueurs.
