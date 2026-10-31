🇬🇧 [English version](README.en.md)

# Abalassembly

<p align="center">
  <img src="og-image.png" width="100%" alt="Abalassembly — jeu de stratégie Abalone">
</p>

*Abalone est une marque déposée d'Abalone S.A. (France). Ce projet est une implémentation non officielle, sans lien avec les ayants droit.*

**Jouer, apprendre et progresser au jeu de stratégie Abalone** — entièrement dans un seul fichier HTML, sans serveur, sans dépendance, hors-ligne.

### 🎮 [Jouer maintenant → ocj94.github.io/Abalassembly](https://ocj94.github.io/Abalassembly/)

Ou : ouvrez `index.html` dans un navigateur, tout est là.

Le site parle **français et anglais** (menu de langue en haut à droite, ou `?lang=en` / `?lang=fr` dans l'adresse). En anglais : le jeu, les règles, le tutoriel, les problèmes et l'aide ; quelques pages plus techniques (Labo IA, bibliothèque, Academy) restent en français.

## Sommaire

- [Règles en bref](#règles-en-bref)
- [Mode Enfant](#mode-enfant)
- [Une adresse par page](#une-adresse-par-page)
- [Ce que contient le fichier](#ce-que-contient-le-fichier)
- [Échanger des parties](#échanger-des-parties)
- [Choix techniques](#choix-techniques)
- [Backend (dormant)](#backend-dormant)
- [Développement](#développement)
- [Licence](#licence)

## Règles en bref

Deux joueurs, 14 billes chacun sur un plateau hexagonal. Un tour = déplacer une bille seule ou une colonne de 2-3 billes alignées, d'une case, dans une direction libre. Le premier à éjecter **6 billes adverses** hors du plateau gagne.

<p align="center">
  <img src="rules-moves.png" width="100%" alt="Coup en ligne et coup latéral">
</p>

On ne peut pousser l'adversaire que si on est numériquement supérieur sur la ligne de poussée (un « sumito ») :

<p align="center">
  <img src="rules-sumito.png" width="100%" alt="Les trois sumito : 3 contre 2, 3 contre 1, 2 contre 1">
</p>

| Sumito | Faisable ? |
|---|---|
| ⚫⚫⚫ pousse ⚪⚪ (3 contre 2) | ✅ |
| ⚫⚫⚫ pousse ⚪ (3 contre 1) | ✅ |
| ⚫⚫ pousse ⚪ (2 contre 1) | ✅ |
| ⚫⚫ contre ⚪⚪, ⚫⚫⚫ contre ⚪⚪⚪ (égalité) | ❌ personne ne pousse |
| Une seule bille ne pousse jamais | ❌ |

## Mode Enfant

Un mode conçu pour laisser un jeune joueur seul devant l'écran.

**Où le trouver :** menu ☰ → **Paramètres** → carte « Mode Enfant » → **Activer**.

Ce qu'il change :

- **Plateau allégé** — disposition « Découverte », 7 billes par camp au lieu de 14. Moins de matériel à tenir en tête, parties plus courtes.
- **Aide au coup** — avant toute sélection, le jeu met en évidence toutes les billes qui ont au moins un coup légal. L'enfant ne cherche plus au hasard laquelle peut bouger. Le calcul passe par le moteur réel, il n'est pas approximé.
- **Billes aux couleurs vives**, skin dédiée.

Ce qu'il masque : le **chat**, le **Labo IA**, les **paramètres** et les **liens externes**. Si le chat était ouvert, l'affichage bascule sur l'onglet Jeu.

**La sortie est verrouillée** par une addition à deux termes tirés au hasard. Tant que la réponse est fausse, le mode reste actif.

**L'état est conservé.** Un rechargement de page ne rouvre rien : le mode se remet en place au démarrage, et il faut toujours répondre à l'addition pour en sortir.

**Avant l'écran, un vrai plateau.** Pour les enfants **à partir de 3 ans** (pas avant : la boîte d'Abalone ne convient pas aux moins de 3 ans), la page **Sur un vrai plateau** (menu ☰ → Progresser) guide les parents hors écran : la sécurité d'abord (toujours avec un adulte, billes comptées, boîte hors de portée d'un plus petit), des règles d'or pour qu'ils aiment le jeu sans pleurs ni dégoût, 8 petites étapes avec leurs schémas (« Une bille par maison », « Le petit train », « Le plus fort pousse », « Plouf ! »… jusqu'à la vraie partie), un carnet de progrès pour plusieurs enfants (prénoms gardés sur l'appareil) et une fiche à imprimer.

## Une adresse par page

Chaque entrée du menu a son adresse, à garder en favori ou à envoyer : par exemple <https://ocj94.github.io/Abalassembly/#corpus> ouvre directement les Stats du corpus. Ouvrir une page met son adresse dans la barre, et le bouton Retour du navigateur ou du téléphone revient à la page d'avant. Les adresses anglaises marchent aussi (le site les montre quand il est en anglais), comme les accents (`#problèmes`). Une partie en cours n'est jamais recommencée par `#partie` : elle est remontrée telle quelle. Le mode Enfant garde ses interdits.

| Page | Adresse | En anglais |
|---|---|---|
| Accueil | l’adresse du site, ou `#accueil` | `#home` |
| Jouer (préparer une partie) | `#jouer` | `#play` |
| Partie en cours | `#partie` | `#game` |
| Historique | `#historique` | `#history` |
| Stats du corpus | `#corpus` | `#corpus` |
| Importer | `#importer` | `#import` |
| Problèmes | `#problemes` | `#puzzles` |
| Éditeur | `#editeur` | `#editor` |
| Variantes | `#variantes` | `#variants` |
| Aide | `#aide` | `#help` |
| Règles du jeu | `#regles` | `#rules` |
| Sur un vrai plateau | `#plateau` | `#real-board` |
| Abalone Academy | `#academy` | `#academy` |
| Ouvertures | `#ouvertures` | `#openings` |
| Analyse | `#analyse` | `#analysis` |
| Mes statistiques | `#mes-statistiques` | `#my-statistics` |
| Gym Cerveau | `#gym` | `#brain-gym` |
| Formation Formateurs | `#formateurs` | `#trainers` |
| Labo IA | `#labo` | `#lab` |
| Bibliothèque de parties | `#bibliotheque` | `#library` |
| Tables de finale | `#finales` | `#endgames` |
| Détection photo / plateau | `#photo` | `#photo` |
| Documentation | `#documentation` | `#documentation` |
| Insights GitHub | `#github` | `#github` |
| Architecture | `#architecture` | `#architecture` |
| Fiche pour IA | `#fiche-ia` | `#ai-sheet` |
| Musée | `#musee` | `#museum` |
| Pionniers | `#pionniers` | `#pioneers` |
| Trombinoscope | `#trombinoscope` | `#members` |
| Classement | `#classement` | `#leaderboard` |
| Observer | `#observer` | `#watch` |
| Communauté | `#communaute` | `#community` |
| Tournoi | `#tournoi` | `#tournament` |
| Comparer | `#comparer` | `#compare` |
| Amis | `#amis` | `#friends` |
| Profil | `#profil` | `#profile` |
| Paramètres | `#parametres` | `#settings` |
| Synchroniser mes appareils | `#synchroniser` | `#sync` |
| Mentions légales | `#mentions` | `#legal` |
| Confidentialité | `#confidentialite` | `#privacy` |

## Ce que contient le fichier

**Jeu**
- Partie contre l'IA (plusieurs niveaux, moteur alpha-bêta + PVS + quiescence dans un Web Worker — l'interface ne gèle jamais ; table de finales 2v2/3v2 consultée pendant la recherche, résultat exact dès qu'une fin de partie résolue est atteinte)
- **À partir du niveau 4, une IA réglée sur les vraies parties (v2.75)** : en style Auto ou Équilibré, elle juge les positions avec les poids trouvés par la méthode Texel du Labo ; en duels contre les anciens poids, depuis de vraies positions, environ +300 à +400 Elo aux niveaux 4, 5 et 6
- Mode 2 joueurs sur le même écran
- **Synchroniser mes appareils** : historique, progression, problèmes, cartes de chaleur… fusionnés entre deux appareils ou deux navigateurs, en direct (un code dans chaque sens, connexion directe) ou par fichier. Sans compte ni serveur ; rien n'est écrasé, rien n'est compté deux fois
- **Liste et Commentaires**, comme dans Uncle Lolo's Abalone : les coups en tableau Coup | Noir | Blanc avec le score après chaque éjection, et un journal coup par coup (suite prévue et évaluation de l'IA, distance au centre, cohésion, billes en danger). Les deux se copient ; la Liste et le journal d'ULA s'importent tels quels
- 18 variantes de position de départ recensées dans la bibliothèque AbalOnline (belge, german daisy, the wall, star…)
- Pendule réelle optionnelle : cadences 5+3, 10+5, 20+10 avec incrément et défaite au temps (mode « libre » par défaut)
- Bots conseillers (Bot Noir / Bot Blanc), duels de bots, skins de billes à débloquer, vue 3D à la demande
- **Vue à la première personne** : avec les blancs, le plateau se retourne pour que votre camp soit toujours en bas. La notation, elle, reste absolue — `e5` désigne `e5` quelle que soit l'orientation
- **Mode Enfant** (voir plus haut) : plateau allégé, aide au coup, sortie protégée
- **Sur un vrai plateau** (voir plus haut) : apprendre aux enfants dès 3 ans, sans écran, en 8 étapes, avec carnet de progrès et fiche à imprimer
- **Mode technique** — réglage global qui bascule l'affichage de contenu détaillé (méthode, chiffres bruts, limites) sur les pages qui en ont, sans encombrer la vue joueur par défaut. Pages équipées : Tables de finale, Ouvertures, Labo, Statistiques
- **12 langues au sélecteur** — français natif ; anglais et hébreu avec traduction embarquée de la navigation (instantanée, sans réseau) ; les 9 autres s'appuient sur la traduction native du navigateur, avec un guide adapté selon Chrome/Firefox/Safari/Edge. **Hébreu en RTL** : sidebar, mise en page et menus déroulants basculent à droite ; les flèches directionnelles se retournent nativement (caractères Unicode *bidi-mirrored*, aucun texte réécrit)

**Apprendre**
- 138 puzzles minés dans de vraies parties : 126 offensifs (« trouve le coup qui éjecte »), 11 défensifs (« pare la menace d'éjection », toutes les parades valides acceptées) et 1 trivial
- Défi du jour, mode Storm, tutoriels guidés, académie, règles illustrées
- Analyse de partie coup par coup : chaque erreur du rapport est cliquable et rejoue la position
- **Analyse d'après-partie** : rejoue les positions réellement traversées avec l'évaluation de l'IA, et indique où la partie a basculé, à quel coup la première bille a été perdue
- **Moteur de compréhension** (page Analyse) : sur n'importe quelle position, décomposition spatiale, faiblesse de soutien, potentiel de sumito, menaces immédiates, profondeur tactique et mobilité à 2 coups — un résumé court par défaut, le détail chiffré derrière le mode technique. Une recherche ciblée (« menace à N coups ») disponible sur demande, jamais automatique
- **Empreinte positionnelle** (même page) : vecteur de 12 dimensions par position, invariant au miroir gauche-droite. Capture une position comme référence, compare-la à toute position visitée ensuite (distance affichée, détail par dimension en mode technique). Comparaison à la demande entre positions choisies ; les 12 dimensions sont aussi mesurées sur toutes les positions des vraies parties (page Statistiques du jeu)
- **Défi du jour #N** : un puzzle numéroté par jour, le même pour tout le monde, sans compte ni serveur ; un résultat à partager façon Wordle (🟥🟨🟩, sans dévoiler la solution) et une image ; série de jours consécutifs. Lien direct : `?defi=12`

**Plateau réel**
- Détection d'un plateau physique par photo (page Détection IA)
- Enregistreur de parties réelles : photographiez le plateau après chaque coup, les coups sont reconstitués automatiquement par le moteur, vérifiés, puis sauvegardés avec joueurs, date et variante — et rejouables dans la bibliothèque

**Bibliothèque**
- 4 580 parties réelles embarquées (MIGS, AbalOnline, tournois et parties de référence), rejouables coup par coup
- Book d'ouvertures miné depuis ces parties
- **Statistiques du jeu** : ce que disent ces parties (avantage du premier joueur, durée, fins de partie) et les 12 dimensions de l'empreinte mesurées sur toutes leurs positions, avec une explication des centiles, un graphique pour les deux camps, un pour les Noirs, un pour les Blancs, et un curseur pour situer une valeur. Puis **les billes qui tombent** (le camp qui fait tomber la première bille gagne-t-il, à quel coup tombe chaque bille, de la 1ʳᵉ à la dernière, le tableau des remontées 1-0 … 5-4, le score final, la carte des cases d'où tombent les billes, avec son échelle graduée), **ce qui fait gagner** (les 12 dimensions camp contre camp aux 20ᵉ, 40ᵉ et 60ᵉ coups) et **comment jouent les vrais joueurs** (sortes de coups, poussées, occasions d'éjection saisies) — chaque partie rejouée coup par coup hors ligne par `tools/stats-parties.js`, vérifiée par un test. Tout est calculé à partir des parties chargées : les chiffres suivent quand le corpus grandit
- **Filtres et nouvelles cartes (v2.72)** : source, disposition et longueur recalculent les cartes marquées 🔎 ; gagner selon l'avance et le moment (carte de chaleur), premiers coups, longueur et fins des parties, où sont les billes et d'où partent les poussées
- **Matrice des 12 dimensions, dimensions au fil de la partie, point de non-retour (v2.86)** : toutes les corrélations en carte de chaleur ; une courbe par dimension pour le futur vainqueur et le futur perdant ; le demi-coup à partir duquel le vainqueur n'est plus jamais rejoint au score
- **Parties de MiGs citées par le blog (v2.87)** : dans la bibliothèque, les 40 parties citées par le blog Abalone Online (v2.89-v2.92 : 15 de plus, dont les plus anciennes, d'octobre 2006) — numéro, date, pseudos — gardées en trace même quand leurs coups sont perdus ; les 2 que nous avons s'ouvrent d'un clic
- **Humains et programmes (v2.91)** : filtre « humains contre humains » sur la page Statistiques du jeu, vrais joueurs humains dans Mes statistiques, 🤖 dans la bibliothèque ; les 93 parties du tournoi Yearly de PlayStrategy publiées en APGN, programmes marqués
- **60 positions de départ (v2.93-v2.94)** : 37 de plus, relevées par le projet gym-abalone sur les images du blog Abalone Online et vérifiées (22 confirmations sur nos positions et sur les parties AbalOnline) ; chacune a sa fiche dans la galerie Variantes
- **120 positions de départ, dont 60 inventées (v3.01)** : 60 départs nouveaux, choisis parmi des milliers de positions générées puis mesurées par le moteur — équitables (les Blancs sont le demi-tour des Noirs), sans contact au départ, en trois séries : formes compactes (avantage du trait de +12 à +38, contre +38 pour la Standard), petits groupes mêlés (+24 à +48), petits groupes suite (+28 à +50) ; chacun a sa fiche, avec le bouton « 🧪 Inventées » dans la galerie
- **La notation de Saab (v2.98)** : le code de position de KAAH et KAAWA se lit autant qu'il s'écrit — sa posRef, identique à celle de KAAH, jouer depuis n'importe quelle position, et les fichiers de partie de KAAH importés et exportés
- **Notations historiques (v2.97)** : les deux systèmes de Marc Ghigou (1989, 24 lettres ; 1990, rangées A à I) sous chaque coup de l'historique, et une fenêtre qui dessine leurs plateaux et raconte le principe de Michael Frank ; vérifiés contre les parties d'exemple des articles de *Jeux & Stratégie*
- **Ressources (v2.95)** : une page du wiki qui rassemble tout ce qui existe autour du jeu — où jouer, serveurs disparus, compétitions, programmes, articles, codes des variantes de MiGs — et un annuaire sur la page Écosystème
- **Les positions critiques (v2.84)** : quand un seul coup évite de perdre une bille, les vrais joueurs le trouvent-ils ? Mesuré exactement sur tout le corpus, avec des positions manquées à revoir
- **Temps morts, sortie du corpus, positions déjà vues, billes seules, contacts, avant une bille perdue (v2.83)** : la plus longue période sans bille tombée ; le demi-coup où une partie ne ressemble plus à aucune autre, et les transpositions ; le risque d'une bille laissée seule, suivie d'un coup à l'autre ; les éjections selon le nombre de contacts ; les 12 dimensions du camp qui va perdre une bille
- **Avantage du trait par disposition, années, premières poussées, positions répétées, coups possibles (v2.81)** : la part gagnée par les Noirs dans chaque disposition et chaque année, avec sa marge ; quand arrive le premier 2 contre 1, 3 contre 1, 3 contre 2, et si celui qui le joue gagne ; les parties qui revoient une position ; le nombre de coups légaux au fil de la partie
- **Explorateur d'ouvertures du corpus, types de poussée, longueur selon le premier coup (v2.80)** : coup par coup sur toutes les parties d'une disposition, avec la part gagnée par les Noirs et sa marge ; 2 contre 1, 3 contre 1, 3 contre 2 et leur lien avec la victoire ; boîtes à moustaches
- **Ma qualité de jeu face aux vrais joueurs (v2.79)** : dans Mes statistiques, tes billes offertes et ta précision (mêmes mesures que le corpus), et tes victoires après avoir mené ou été mené de 1, 2 ou 3 billes
- **La qualité des coups des vrais joueurs (v2.78)** : sur les 418 046 coups du corpus, la part proche du meilleur coup (la même mesure que ta précision dans Mes statistiques) et les billes offertes, selon le moment, le vainqueur ou le perdant, la source
- **Marges d'erreur, doublons, année, explorateur des scores (v2.77)** : chaque pourcentage du corpus avec sa marge à 95 % (intervalle de Wilson), les doublons exacts comptés une fois, un filtre par année, et pour chaque score atteint en cours de partie les victoires, défaites et nulles du camp choisi, avec ses parties à rejouer
- **Mes statistiques filtrées et en graphiques (v2.73)** : période et type de partie, résultats par niveau, style, couleur, disposition et adversaire, taux glissant, précision partie par partie, quand tu joues, tes 12 dimensions et tes ouvertures face aux vrais joueurs, export CSV ; une carte « Mes chiffres » dans le Profil
- **Mes statistiques, carte Éjections** : tes remontées, où tombent tes billes, et toi face aux vrais joueurs, avec les mêmes définitions ; à la fin d'une partie, une ligne tirée des vraies parties (« vous étiez mené 1 à 3 : le camp mené 1 à 3 ne gagne que 21 % du temps »)
- **2 589 de ces parties republiées** en [APGN](APGN.fr.md) dans [`games/`](games/) — celles du serveur MiGs, fermé le 30 mai 2017, dont il n'existe aucune autre source publique connue

**Labo**
- Auto-amélioration du moteur : duels joués par paires (la même position deux fois, couleurs inversées), **depuis de vraies positions de Marguerite belge tirées du corpus** (v2.70 ; avant : Standard et 6 coups au hasard), verdict SPRT « pentanomial » comme Fishtest/Stockfish, arbitrage des parties longues calibré sur le corpus (une bille d'avance ne suffit plus : dans les vraies parties, elle ne gagne que 66 % du temps), plusieurs parties à la fois ; réglage continu SPSA vérifié par SPRT avant adoption ; 16 poids d'évaluation (centre, cohésion, bord, mobilité, isolement, danger, alignements, forteresse, et les 8 critères de KAAH) ; gain réel mesuré contre les poids d'origine ; exports CSV/JSON
- **Six outils de plus (v2.70)**, en onglets : la **méthode Texel** (les poids qui devinent le mieux le gagnant de 18 855 positions de vraies parties, en quelques secondes, puis vérifiés en duels), le **tournoi des styles** (classement Elo), la **mesure des niveaux** (la hauteur de chaque marche), **comme les humains** (combien de fois l'IA joue le coup du joueur ; un style « Humain »), **contre toi** (un clone tiré de ton historique, et le style qui le bat le mieux) et les **ouvertures** de la Marguerite belge jouées par l'IA. Les positions viennent de `tools/labo-positions.js` (hors ligne, embarquées)
- **Tableau de bord et graphiques (v2.71)** : totaux (parties, temps de calcul, tests tranchés, taux d'adoption, gain réel), les poids du champion adoption après adoption, parties par jour, longueur et fins des parties ; pour Texel, la calibration « gagnant prévu / gagnant réel » et ses réglages (positions, moment de la partie, rappel, étapes) ; pour les bancs, le temps par coup, la limite de coups et le départ, l'Elo de chaque style avec sa marge et le tableau croisé « qui bat qui »
- **Impact réel, pas un simple tableau de bord** : quand le Labo prouve statistiquement qu'un nouveau jeu de poids bat le champion actuel, il est adopté automatiquement et remplace en direct les poids de l'IA à partir du niveau 4 (styles Auto et Équilibré), sur l'appareil où il tourne. Depuis la v2.76, le Labo part des poids Texel, ceux que l'IA utilise déjà à ces niveaux : chaque progrès qu'il prouve rend donc plus forte l'IA réellement jouée. Autrement dit : l'IA que vous affrontez peut réellement progresser d'une session à l'autre.
- Réversible et local : interrupteur « Utiliser les poids du Labo » (actif par défaut, désactivable) ; tout vit dans le `localStorage` du navigateur — chaque exemplaire du jeu apprend pour son propre joueur, rien n'est partagé entre appareils **tant que le backend reste dormant** (voir plus bas : une variante *distribuée* du Labo, où plusieurs joueurs alimentent le même test SPRT, existe déjà côté serveur)
- Replay des parties du Labo sur plateau bois avec les vrais skins de billes

## Échanger des parties

**Partie par code.** Une partie en différé, par simple échange de texte : vous jouez, vous copiez le code, vous l'envoyez ; votre adversaire le colle, joue, et vous renvoie le sien. Aucun compte, aucun serveur. Le code porte la partie entière depuis le premier coup, et celui qui le reçoit la rejoue contre le moteur — il la refuse au premier coup illégal plutôt que de faire confiance.

**APGN.** L'Abalone n'avait pas d'équivalent du PGN des échecs. [`APGN.fr.md`](APGN.fr.md) en propose un : en-tête de balises, coups numérotés, résultat. Une partie n'y est valide que si elle rejoue. Le convertisseur [`tools/to-apgn.js`](tools/to-apgn.js) produit le fichier et rejette ce qui ne passe pas.

**[`ecosysteme.html`](ecosysteme.html).** Une carte interactive de l'écosystème Abalone, dessinée comme une position de jeu : les projets entrent sur le plateau et glissent dans la gouttière quand ils ferment.

## Choix techniques

| Choix | Pourquoi |
|---|---|
| **Un seul fichier HTML** | Distribution triviale : un fichier = tout le site. Fonctionne en `file://`, sur GitHub Pages, sur clé USB. |
| **Zéro dépendance** | Rien à installer, rien qui casse, rien à auditer chez un tiers. (Seule la vue 3D charge Three.js, à la demande.) |
| **Banques compressées** | Les 4 580 parties, le book et les sons sont embarqués en deflate + base64, décompressés nativement au chargement (`DecompressionStream`). Fichier ≈ 7,1 Mo (a grossi avec l'ajout des empreintes historiques, tablebases et graphe de positions). Sur un navigateur ancien, le jeu fonctionne — seules bibliothèque, book et sons sont absents. |
| **Hors-ligne d'abord** | Aucune requête réseau nécessaire. Progression, réglages et puzzles résolus vivent dans le `localStorage`. |
| **IA dans un Worker** | La recherche tourne dans un thread séparé ; l'interface reste fluide pendant la réflexion. |
| **Recherche multi-worker adaptative** | Sur un appareil à plusieurs cœurs, la recherche se partage entre plusieurs Workers (partage des coups racine, chacun sa propre table de transposition — pas de mémoire partagée, GitHub Pages ne pose pas les en-têtes nécessaires à `SharedArrayBuffer`). S'adapte via `navigator.hardwareConcurrency` : jusqu'à 4 workers sur un PC multi-cœurs, 1 seul (comportement identique à avant) sur un téléphone contraint. |
| **Table de transposition plafonnée selon la RAM** | Le cache de recherche (TT) s'adapte à `navigator.deviceMemory` (repli à 4 Go si l'API est indisponible) plutôt que de grossir sans limite — pertinent surtout au niveau 10, l'ancien « Minimax » (recherche non bornée en temps). Le plafond ne peut jamais changer un résultat, seulement l'efficacité du cache une fois atteint. |

## Backend (dormant)

Un backend optionnel (comptes, synchronisation, classement mondial) existe dans le dépôt séparé [`abalassembly-api`](https://github.com/ocj94/abalassembly-api) — Node + Fastify + PostgreSQL + Redis, conçu RGPD-ready (argon2id, JWT révocable, MFA TOTP sans dépendance, purges automatiques). Il inclut aussi un **Labo distribué** : plusieurs joueurs peuvent alimenter le même test SPRT collectif (méthodologie [OpenBench](https://github.com/AndyGrant/OpenBench)/Fishtest), avec diversité des 5 ouvertures officielles et vérification par rejeu de chaque partie témoin — 54 tests, CI verte. Il n'est **pas déployé** : le HTML ne l'appelle que si `BACKEND.enabled = true`, ce qui n'est pas le cas. Tant que ce drapeau est à `false`, le site ne collecte rien et ne contacte aucun serveur.

## Développement

Le fichier est volontairement lisible : sections commentées, code non minifié (seules les **données** sont compressées). Pour vérifier l'intégrité après modification :

```bash
node tests/regression.js   # intégrité, régressions, garde-fous — sort en 1 si ça casse
node tests/nacre.js        # notation des coups latéraux, vérifiée contre le moteur
node tests/gamecode.js     # aller-retour du code de partie, 40 parties rejouées
```

La suite est versionnée et sans dépendance. Chaque bug corrigé y ajoute un test qui échouait sur l'ancien code. `console.assert` n'y est jamais utilisé : il n'interrompt rien et laisse un test échoué afficher un succès.

Les puzzles sont minés hors-ligne depuis les banques de parties par un critère vérifiable (menace d'éjection réelle, parades recalculées exhaustivement par le moteur) — aucun puzzle n'est inventé à la main.

## Licence

**GPL-3.0-or-later.** Vous pouvez utiliser, étudier, modifier et redistribuer ce jeu, à condition de conserver la même licence. Les parties de la bibliothèque proviennent de bases publiques (AbalOnline, MiGs) et restent créditées à leurs joueurs. Les relevés de coups sont des suites de faits, non des œuvres ; les parties MiGs republiées dans [`games/`](games/) le sont à des fins de préservation, avec une procédure de retrait explicite.
