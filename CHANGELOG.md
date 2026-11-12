🇬🇧 [English version](CHANGELOG.en.md)

# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Les versions correspondent à `APP_VERSION` dans `index.html` et aux
[Releases GitHub](https://github.com/ocj94/Abalassembly/releases).

Ce fichier existe parce que l'historique ne vivait que dans les Releases,
donc invisible hors ligne — ce qui contredit le principe du projet.

## [v3.31]

### Trois parties PlayStrategy du 28 mai 2025, toujours en attente du recalcul
- **Gramgroum – Airisson**, trois parties amicales sans pendule : `MxbIzwOB`
  (102 demi-coups, Airisson gagne 6-4), `6mqKM9vY` (87, Airisson gagne 6-5),
  `RpnjUrjG` (186, Airisson gagne 6-5).
- **Notation, précisée** : la seconde case d'un coup en ligne est une case de la
  trajectoire, pas toujours la même. Dans `RpnjUrjG`, au demi-coup 181,
  « f9e8 » déplace la chaîne f9-e8-d7 : le joueur a seulement visé la case
  voisine. `psConvertirSequence` suit la chaîne et lit toutes ces formes. Le
  second décodage, élargi à toute case de la trajectoire, trouve une seule
  lecture pour chacune des 11 parties en attente, identique coup pour coup, et
  la 6e bille tombe chaque fois au dernier demi-coup.
- Bibliothèque : « 11 autres parties » ; `games/playstrategy-parties.apgn` à
  jour ; statistiques du corpus inchangées.

## [v3.30]

### Trois parties PlayStrategy de 2025, toujours en attente du recalcul
- **Airisson – Gramgroum**, trois parties amicales 10+0 du 27 mai 2025 :
  `FPEZWejN` (Airisson gagne 6-2), `HtlXNktv` (Airisson abandonne à 0-0,
  Gramgroum gagne), `5YGrgSbG` (Airisson gagne au temps à 3-3).
- **Notation de 2025** : pour une poussée, la seconde case est celle où arrive
  la bille de tête du joueur, pas la dernière bille poussée comme en 2026.
  `psConvertirSequence` lit les deux (il déplace toute la chaîne) ; le second
  décodage indépendant, refait avec la règle de 2025, donne une seule lecture
  et les mêmes coups sur les 256 demi-coups.
- La perte au temps ne se voit pas dans le rejeu : `tools/to-apgn.js` la note
  (`Termination "Au temps"`). Bibliothèque : « 8 autres parties » ;
  `games/playstrategy-parties.apgn` à jour ; statistiques du corpus inchangées.

## [v3.29]

### Quatre parties PlayStrategy de plus, toujours en attente du recalcul
- **Airisson – Sok_imsoo**, quatre parties amicales envoyées par ocj94 en PGN :
  `Dg90Vkbh` et `gcOnhSVq` (14 août 2026, cadence « 10 d/5 »), `aXsgzzHx` et
  `HrczjlFo` (17 août 2026, cadence « 12 d/1 »). Airisson gagne les quatre :
  trois au score (6-0, 6-4, 6-4), une par abandon (4-1).
- Converties par `psConvertirSequence`, puis vérifiées par le second décodage
  indépendant : mêmes coups sur les 314 demi-coups, aucune ambiguïté.
- Bibliothèque (« 5 autres parties PlayStrategy, pas encore comptées ») et
  `games/playstrategy-parties.apgn` à jour. Les statistiques du corpus ne
  changent pas : le recalcul se fera quand toutes les parties seront là.

## [v3.28]

### Une partie PlayStrategy de plus, en attente du recalcul des banques
- **ll – Airisson** (PlayStrategy `RCZ6myBN`, 9 août 2026, partie amicale
  10+0, Marguerite belge, 62 demi-coups, les Noirs abandonnent à 3 billes à 0).
  Envoyée par ocj94 en PGN. Elle est dans la bibliothèque (liste PlayStrategy,
  rejouable et analysable) et dans le nouveau fichier
  `games/playstrategy-parties.apgn`.
- **Pas encore dans les statistiques du corpus**, à la demande d'ocj94 :
  d'autres parties vont suivre, et les banques (statistiques des parties,
  positions du Labo, empreintes, qualité des coups) seront recalculées une
  seule fois. Elles sont rangées dans `PS_PARTIES_A_INTEGRER`. La bibliothèque
  signale « 1 autre partie PlayStrategy, pas encore comptée ». La marche à
  suivre est dans `games/README.md` (« Ajouter des parties »).
- **Notation de PlayStrategy** : ses PGN écrivent chaque coup en deux cases
  (« a1d4 » : la bille de queue et la case où arrive le bout de la chaîne ; un
  coup de côté : une extrémité et la case où arrive l'autre, jamais deux cases
  voisines). La partie a été convertie par `psConvertirSequence`, puis par un
  second décodage indépendant : mêmes 62 coups, tous légaux, aucune ambiguïté.
- `tools/to-apgn.js --source ps-autres`. Un test rejoue chaque partie en
  attente et vérifie qu'elle est dans la bibliothèque, pas encore dans les
  banques. `games/README.en.md` gagne aussi la section sur les pseudos.

## [v3.27]

### Les cartes des données : nuages de points en couleur, en 2D ou en 3D
- **Quatre cartes** :
  - **Statistiques du jeu** : un point par camp et par partie du corpus,
    placé par la moyenne de ses 12 dimensions, coloré par résultat, source,
    camp, longueur ou joueurs. La carte suit les filtres de la page.
  - **Mes statistiques** : tes parties au milieu de celles des vrais joueurs,
    colorées par résultat, niveau de l'IA, couleur ou date. Tes parties sont
    mesurées une fois, sur demande, puis gardées sur l'appareil.
  - **Labo** (tableau de bord) : les réglages des 16 poids, c'est-à-dire les
    champions (reliés dans l'ordre), les mutants adoptés, rejetés, indécis
    ou écartés au tri, le chemin du SPSA et les mutants en test.
  - **Analyse** : le chemin de la partie chargée, une ligne par camp et par
    demi-coup, parmi 4 000 positions de vrais joueurs. Un clic sur un point
    mène à ce demi-coup.
- **Deux méthodes** : l'ACP, instantanée, dont les axes sont expliqués sous la
  carte (« Axe 1 (35 %) : plus de soutien moyen, plus de cohésion moyenne ») ;
  t-SNE, qui révèle les familles de parties, calculé dans un fil séparé sur
  1 200 points au plus (environ 10 s). Même entrée, même carte.
- **Rendu maison**, sans bibliothèque, en 2D ou en 3D tournante (souris,
  doigt, flèches du clavier, zoom). Un passage sur un point en donne le détail,
  un clic l'ouvre ; un clic dans la légende masque un groupe. Les réglages sont
  retenus. axe-core : 0 violation.
- **Le Labo relève chaque réglage tranché** (poids, verdict, score) pour sa
  carte, 600 au plus.
- **Correction** : depuis la v3.22, le bouton « Voir les N coups » de
  l'Observatoire ne faisait rien. Sa fonction était placée après la fin du bloc
  de script : elle n'était jamais exécutée et s'affichait comme du texte en bas
  de la page. La fin du script principal est maintenant une pièce à part
  (`src/07z-fin-script-principal.part`), et un test vérifie qu'aucun module ne
  la porte.
- Documentation : page « Cartes des données » (FR/EN). Tests : ACP, t-SNE
  (familles séparées, résultat déterministe), échantillon, relevé du Labo,
  branchements.

## [v3.26]

### RGPD : ne garder que les données utiles, et un droit d'opposition pour les joueurs publiés
Point 8 de l'audit RGPD / CNIL du 11 novembre 2026.
- **Plus d'e-mail dans le profil local.** Il ne servait qu'à se reconnecter sur
  le même appareil, ce que le nom fait déjà. Le champ disparaît de la création
  de profil et des Paramètres. Les e-mails saisis avant sont effacés de
  l'appareil à la prochaine ouverture (registre des profils et session).
  La connexion et « Mot de passe oublié » se font par le nom.
- **Pseudos des parties publiées.** La politique de confidentialité dit
  maintenant pourquoi le site publie les pseudos des joueurs (intérêt légitime :
  archives de parties jouées en public) et comment s'y opposer (RGPD, art. 21),
  sans justification. Un modèle d'issue « Retirer mon pseudo » rappelle que
  l'issue est publique et ne demande que le pseudo.
- **Retrait en une ligne.** `src/main/00c-pseudos-retires.js` tient la liste des
  pseudos retirés (vide aujourd'hui). Chaque pseudo de la liste devient
  « Joueur retiré » dans toutes les parties publiées : MiGs, Abalone Online,
  parties de référence et tracées, tournoi PlayStrategy, et les fichiers APGN
  exportés par `tools/to-apgn.js`. Majuscules et accents sont ignorés. Deux
  joueurs retirés d'une même partie restent distincts, pour que le vainqueur
  reste juste.
- Un test vérifie l'absence d'e-mail, l'effacement des anciens, le retrait des
  pseudos et son branchement sur chaque banque de parties.

## [v3.25]

### Accessibilité : contrastes, plateaux nommés, tout le site au clavier
Points 14, 15 et 16 de l'audit RGPD / CNIL / accessibilité du 11 novembre 2026.
- **Contrastes (WCAG AA)** : le gris des textes secondaires passe de `#6b7570`
  (3,4 à 3,9 pour 1) à `#8b948f` (4,8 à 6 pour 1), l'or atténué de `#8a7235` à
  `#a68a44`. Les cases des cartes de chaleur (Stats du corpus, tableau des
  remontées) choisissent leur encre, sombre ou blanche, et foncent un peu leur
  fond quand aucune n'atteint 4,5 pour 1. Les grands chiffres des Règles et de
  l'Academy, illisibles à 15 % d'opacité, sont maintenant lisibles. Mesure
  axe-core sur les 36 pages : 2 567 relevés sous le seuil avant (la barre latérale comptée sur chaque page), 0 après.
- **Textes alternatifs** : les 15 zones de dessin (plateaux de jeu, d’analyse, des problèmes, du tutoriel,
  de l'éditeur, en 3D, photo du plateau…) ont un nom ; les aperçus décoratifs
  sont masqués aux lecteurs d'écran.
- **Clavier** : chaque élément cliquable qui n'est pas un vrai bouton (cartes de
  l'accueil, pastilles de couleur, lignes de tableau…) devient atteignable à la
  touche Tab et se déclenche avec Entrée ou Espace, y compris ceux ajoutés plus
  tard dans la page. Un lien « Aller au contenu » est le premier arrêt de Tab.
  Les boutons qui n'affichent qu'une croix s'appellent « Fermer ». Onglets du
  Labo, filtres de l'Historique, cases des Formateurs, historique des coups :
  balisage et noms corrigés. axe-core (WCAG 2 A et AA) : 0 violation sur les
  36 pages.
- Un test vérifie les contrastes des couleurs du site et des cartes de chaleur,
  le nom de chaque plateau et le déclenchement au clavier.

## [v3.24]

### Auto-jeu : la base de positions d'un réseau de neurones « en ombre »
- Nouveau type de campagne dans le Labo (🌐 Réseau, administration) :
  **auto-jeu**. Un réglage de l'IA joue contre lui-même, chaque partie avec sa
  propre graine, donc sa propre ouverture de 8 demi-coups tirée au hasard. Les
  parties sont distribuées aux exécutants (navigateurs, PC, conteneurs) et
  vérifiées par recalcul comme les duels. Le bilan affiche les parties et les
  positions produites, et le partage Noirs / nulles / Blancs.
- Côté serveur (`abalassembly-api`) : `type: 'autojeu'` sur `POST /ordo/campagnes`
  (migration 009), et `scripts/exporter-positions.js`, qui rejoue chaque partie
  acceptée dans le moteur et écrit une ligne par position (plateau en 61 cases,
  camp au trait, billes sorties, score du juge actuel, résultat final vu du
  camp au trait, ouverture marquée), en NDJSON ou CSV. Testé jusque dans le
  conteneur Docker.
- C'est la première étape du réseau de neurones « en ombre » : il tournera à
  côté du juge actuel, sans le remplacer, pour comparer les deux. Le moteur qui
  joue ne change pas.

## [v3.23]

### Bande vide en haut des pages, bandeau de langue, filtre du Musée
- **Bandeau de langue** (« View Abalassembly in English? ») : il s'affichait en
  haut, **sous** la barre fixe du haut, donc invisible, tout en poussant chaque
  page de sa hauteur. Pour tout navigateur qui n'est pas en français, une bande
  vide au-dessus du titre, et une proposition de langue que personne ne voyait.
  Il s'affiche maintenant en bas de l'écran.
- **Téléphone** : plusieurs pages (Analyse, Éditeur, Gym, Labo…) gardaient la
  marge de la barre du haut de l'ordinateur (64 px) en plus de celle du
  téléphone (56 px) ; la page Photo aussi. Le titre remonte de 50 à 110 px selon
  la page et la langue du navigateur ; rien ne passe sous la barre.
- **Ordinateur** : l'accueil, l'Aide et la vue d'exercice du Gym Cerveau
  commençaient **sous** la barre fixe du haut (haut des tuiles, titre « Aide »
  et bouton « ← Tous les exercices » cachés). Ils démarrent maintenant sous la
  barre. Vérifié sur les 36 pages à 1280, 1000 et 390 px de large.
- **Musée** : les sept boutons de filtre (Luxe, Bois, Voyage…) appelaient une
  fonction qui n'avait jamais existé. Le filtre existe maintenant, et les
  boutons ne s'affichent que s'il y a des pièces à filtrer : la page n'en a pas
  encore, elle dit honnêtement « en cours de préparation ».

## [v3.22]

### Plus aucun code dans le HTML : la CSP protège vraiment
- **Les 1 011 gestionnaires écrits dans le HTML** (`onclick`, `onchange`,
  `oninput`, `onkeydown`, `onmouseover`/`onmouseout`, `ontoggle`), dans les pages
  comme dans le HTML que le JavaScript fabrique, sont remplacés par des attributs
  de données : `data-click="showPage('gym')"`, `data-change`, `data-input`,
  `data-keydown`, `data-toggle`, plus `data-entree` (touche Entrée),
  `data-fond` (clic sur le fond d'une fenêtre) et `data-survol` (style le temps du
  survol). Le navigateur ne les exécute jamais : un seul écouteur
  (`src/main/00a-actions.js`) les lit, n'appelle que les 460 fonctions de la
  liste des actions du site (`tools/actions.js`), et n'accepte comme arguments
  que des valeurs simples. Le clic remonte les éléments comme avant.
- **CSP** : `script-src` n'a plus `'unsafe-inline'`. Les six blocs de script du
  fichier y sont nommés par leur empreinte SHA-256, recalculée à chaque
  assemblage. Un script glissé dans la page par un pseudo, un fichier ou un
  message ne s'exécuterait pas, même si un échappement était oublié. Les fils
  de calcul (IA, Labo, réseau de calcul) restent autorisés.
- Rien ne change pour le joueur. Vérifié dans Chromium avec la nouvelle CSP : les
  36 pages sans gestionnaire en ligne ni violation de la CSP, et un parcours
  (menu, Gym Cerveau, partie contre l'IA qui joue, Analyse, réglages, survol,
  fenêtres, Labo et son fil de calcul).
- Tests : plus aucun gestionnaire en ligne dans les sources, empreintes exactes,
  liste des actions à jour, interpréteur qui refuse tout ce qui n'est pas une
  valeur simple. `CONTRIBUTING` et `SECURITY` expliquent la règle.

## [v3.21]

### Plus de Google Fonts, téléphone et accessibilité
- **Polices hébergées par le site** : Playfair Display, DM Sans et DM Mono sont
  embarquées dans le fichier (`fonts/`, licence SIL OFL 1.1, `tools/polices.js`),
  comme les polices de la page Écosystème. Avant, chaque visite appelait Google
  Fonts, qui recevait l'adresse IP de chaque visiteur, contrairement à ce que
  disait la politique de confidentialité ; et hors ligne, le site retombait sur
  des polices de secours. Le site n'appelle plus aucun autre site à l'ouverture
  (vérifié dans un navigateur), et la CSP n'autorise plus Google.
- **Politique de confidentialité** : la liste exacte des autres sites que deux
  fonctions peuvent appeler (import Excel, partie en direct sur PlayStrategy),
  et le fait que le site ne calcule aucune empreinte de l'appareil.
- **Téléphone** : les plateaux d'Analyse et de l'Éditeur sortaient à moitié de
  l'écran (540 et 500 px sur 390) ; ils retrécissent maintenant. La page Photo
  gardait sa colonne de 520 px à côté du texte : une règle écrite plus bas
  écrasait celle du téléphone. Mêmes marges corrigées sur l'accueil. Les 36
  pages tiennent dans un écran de 390 px.
- **Accessibilité** : 25 champs, 5 interrupteurs et 1 image avaient leur
  étiquette à l'écran mais pas pour les lecteurs d'écran ; boutons et liens du
  pied de page plus hauts au doigt (24 px au moins).

## [v3.20]

### Gym Cerveau : l'exercice sur sa propre vue, lancé par « Démarrer »
- « Commencer » ouvre l'exercice **à la place de la liste**, sur sa propre vue
  (avant : un panneau à droite, ou sous la liste sur téléphone), avec son titre,
  sa zone, sa consigne et le choix du niveau.
- L'exercice ne part **qu'au clic sur ▶ Démarrer** : la position à mémoriser, le
  chronomètre et les flashs n'avancent plus pendant qu'on lit la consigne ou
  qu'on choisit le niveau. Changer de niveau remet le bouton Démarrer ; Rejouer
  repart tout de suite.
- « ← Tous les exercices » revient à la liste ; le Retour du navigateur ou du
  téléphone aussi (adresse `#gym-exercice`). Quitter la page arrête l'exercice.
- Le Duel Cerveau garde son décompte commun de 3 secondes : ses manches partent
  sans bouton, sur la même vue, et son bandeau reste affiché pendant le duel.

## [v3.19]

### Protection anti-robot du serveur, sans service tiers
- **Preuve de travail** (le « captcha » d'Abalassembly) : le serveur donne un
  défi signé, l'appareil cherche une réponse par SHA-256 — environ 0,3 s sur un
  ordinateur, une seconde sur un téléphone, rien à cliquer. Aucun script d'un
  autre site, aucun cookie : le calcul tient dans le fichier du jeu, qui reste
  utilisable hors ligne. Demandée à l'inscription, et à la connexion seulement
  après trois mots de passe faux pour ce compte : un joueur normal ne la voit
  jamais. La connexion du Labo (réseau de calcul) en profite aussi.
- Côté serveur (`abalassembly-api`) : limites propres à la connexion (10 par
  minute) et à l'inscription (5 par heure), IPv6 comptée par bloc /64,
  blocage d'un compte 15 minutes après dix mots de passe faux (les sessions
  ouvertes continuent), même temps de réponse pour un email inconnu.
- Tant que le serveur n'est pas en ligne, rien ne part de l'appareil (testé).
- Politique de confidentialité : une phrase sur cette protection.
- **Wiki à jour, et qui le reste** : il est maintenant recopié de `docs-fr/`
  à chaque modification de la documentation (`tools/wiki.js`, lancé par la
  CI). Il avait des mois de retard ; il gagne seize pages (Calcul distribué,
  Observatoire IA, Analyse…). Les pages écrites directement dans le wiki
  restent.

## [v3.18]

### Réseau de calcul : un ordonnanceur, des exécutants branchables
- **Parties du Labo reproductibles.** À profondeur fixe, une partie se refait
  maintenant coup pour coup, dans n'importe quel fil et sur n'importe quel
  appareil :
  - les clés de hachage du moteur sortent d'une graine fixe (avant,
    `Math.random`, d'autres clés dans chaque fil) ;
  - le plateau est remis dans l'ordre des cases avant chaque recherche. Avant,
    l'ordre des billes en mémoire, bousculé par les recherches précédentes,
    changeait l'ordre des coups générés, donc le choix entre deux coups de même
    note : un coup recalculé seul différait du coup joué (trouvé en
    recalculant).
  Vérifié sur 116 demi-coups recalculés un à un, jusqu'à la profondeur 3.
  La force du jeu ne change pas.
- **Vérification d'une partie rendue** : le fil de calcul sait rejouer une
  partie imposée et rechercher lui-même les demi-coups demandés. Il signale un
  coup différent du sien, un coup illégal, une ouverture qui ne vient pas de la
  graine, une partie inachevée ou des coups joués après la fin.
- **Onglet 🌐 Réseau de calcul du Labo** :
  - se connecter au serveur de calcul, choisir le nombre de cœurs prêtés,
    brancher ou débrancher ;
  - pour l'administrateur : les interrupteurs (une famille d'exécutants, un
    exécutant) et la création de campagnes (deux jeux de poids, une
    profondeur, des paires).
  Tant que le serveur n'est pas en ligne, l'onglet le dit et **rien ne part**
  de l'appareil.
- Le serveur (`abalassembly-api`, `/ordo`) tient la file des missions et les
  baux, choisit l'exécutant selon sa vitesse mesurée, et vérifie chaque
  partie. Un exécutant Node permet de brancher un PC en ligne de commande.
- Page [Calcul distribué](docs-fr/Calcul-distribue.fr.md) réécrite : ce qui a
  changé depuis l'étude qui l'écartait, et ce qui reste exclu.

## [v3.17]

### Observatoire IA — l'arbre de recherche dessiné
D'après les maquettes envoyées par ocj94 :
- **Un vrai arbre**, en haut de l'onglet Recherche et en vue simplifiée dans
  la Vue générale : la position, ses meilleurs coups de départ en cases
  notées, et sous chacun la chaîne de la suite que l'IA prévoit (la pastille
  noire ou blanche dit qui joue). Il remplace la liste « Arbre des lignes
  principales » ; les 10 lignes restent listées au niveau Développeur.
- **Il se remplit pendant le calcul.** Les coups sont classés selon la
  dernière profondeur terminée. Une pastille dit où en est chacun à la
  profondeur en cours : en cours (jaune), noté (bleu, avec sa nouvelle note),
  pas encore noté (gris, il garde sa note précédente). « p4 » dit de quelle
  profondeur vient la note affichée.
- **Vue simplifiée** (3 coups, 2 étages) ou **complète** (5 coups, toute la
  suite), au choix et retenue. Toucher un coup le choisit ; après le coup,
  toucher une case de la suite montre le plateau à cette étape.
- **Ce qui n'y est pas, parce que ce serait inventé** : plusieurs réponses
  notées sous un coup (le moteur ne garde que celle qu'il prévoit) et une case
  « élaguée » (aucun coup de départ n'est élagué).
- Pour la suite en direct, le message « profondeur terminée » du moteur
  emporte maintenant la suite prévue de ses 10 meilleurs coups. Elle était
  déjà calculée à ce moment-là : un test vérifie que le moteur joue le même
  coup, avec les mêmes positions examinées.

## [v3.16]

### Sécurité — bibliothèques vérifiées, SheetJS isolé, versions vérifiables
Suite de l'analyse de sécurité (référentiel SSDF du NIST) :
- **Bibliothèques des CDN vérifiées octet pour octet.** Three.js (la 3D) et
  SheetJS (le lecteur de tableur) ne s'exécutent qu'après comparaison de leur
  empreinte SHA-384 avec celle du paquet npm officiel. Un fichier différent est
  refusé, et un message le dit. cdnjs est retiré des sources, car il sert sa
  propre copie. La copie locale de Three.js est identique au paquet npm.
- **SheetJS 0.18.5 isolé.** Deux failles connues sur des fichiers piégés
  (CVE-2023-30533, pollution de prototype ; CVE-2024-22363, expression
  régulière qui s'emballe). Les versions corrigées ne sont plus sur npm. Le
  tableur est donc lu dans un fil de calcul jetable, qui ne renvoie que des
  lignes de texte et qui est arrêté au bout de 20 s. Aucun code de SheetJS ne
  s'exécute dans la page. Vérifié dans un vrai navigateur : un bon fichier se
  lit, et un fichier de bibliothèque falsifié est refusé sans s'exécuter.
- **Politique de sécurité du contenu resserrée.** Les CDN ne peuvent plus
  servir de script (`script-src 'self' 'unsafe-inline' blob:`). Ils sont
  seulement lus (`connect-src`), et seul le contenu vérifié s'exécute. La page
  Architecture le dit.
- **Versions vérifiables.** Chaque nouvelle release joint `index.html`, la
  copie de Three.js et leurs empreintes SHA-256 (`SHA256SUMS`). SECURITY.md
  explique comment vérifier.

## [v3.15]

### Changé — l'Observatoire IA dans la colonne de droite
Demande de l'auteur : « toute la partie Observatoire IA dans la sidebar de
droite et non dans une fenêtre ». L'Observatoire est maintenant un onglet de la
colonne de droite de la partie, **« 🔭 Observatoire IA »**, à côté de Partie,
Liste, Commentaires, Chat, Analyse et Bots (le bouton de l'onglet Partie y
mène aussi).
- Sur ordinateur, il est à côté du plateau ; la colonne passe de 320 à 420 px
  tant qu'il est ouvert, sur les écrans d'au moins 1 700 px (en dessous, le
  plateau n'aurait plus la place).
- Sur téléphone, il est sous le plateau, comme les autres onglets : plus de
  tiroir sur le bas de l'écran.
- Changer d'onglet le ferme ; ✕ ramène à l'onglet Partie ; le site se
  souvient de l'onglet ouvert. Les boutons de fenêtre (— réduire, ⤢ plein
  écran) disparaissent.

### Corrigé — le plateau passait sous les colonnes
- De 901 à environ 1 500 px de large, le plateau gardait 640 px même quand la
  colonne centrale était plus étroite : il passait sous les deux colonnes
  (mesuré à 1 280 px : 90 px cachés de chaque côté, bouton plein écran
  compris). Il rétrécit maintenant à la largeur de la colonne.
- Sur téléphone, une ligne qui ne se coupe pas (une ligne de mesures, un
  tableau) pouvait élargir toute la page au-delà de l'écran (mesuré : 419 px
  sur un écran de 390). La colonne ne dépasse plus l'écran ; un tableau trop
  large défile dans l'Observatoire.

## [v3.14]

### Changé — « L'IA réfléchit… » dans la barre du joueur
Demande de l'auteur, captures à l'appui : sur téléphone, le bandeau flottant
« L'IA réfléchit… / Jouer maintenant / prof. 5/8 · 1,1 M positions… » cachait
le bas du plateau. Il s'affiche maintenant **dans la barre du joueur que joue
l'IA** (Joueur 2, en haut, en général), sous son nom :
- pendant le calcul : « L'IA réfléchit… », le bouton **⚡ Jouer maintenant**
  et la ligne de mesures, sur une ligne, le meilleur coup en premier ;
- au repos : « L'IA attend votre coup » et son dernier calcul (coup, note,
  profondeur, temps).

La zone reste là pendant toute la partie contre l'IA : le plateau ne bouge plus
d'un pixel entre le calcul et le repos (vérifié sur téléphone et ordinateur).
Elle disparaît en fin de partie. Le bandeau flottant ne sert plus que si la
barre n'est pas à l'écran pendant le calcul. « Jouer maintenant » n'agit que
pendant le calcul.

### Corrigé
Les boutons 1D / 2D / 3D et plein écran étaient placés à 11 % de la hauteur
du bloc, barres comprises : la barre plus haute les faisait tomber dessus. Ils
suivent maintenant le haut du plateau.

## [v3.13]

### Ajouté — l'Observatoire et le Labo s'échangent leurs données
- **Temps réels des niveaux** (Labo, onglet « Les niveaux », sous le banc) : une
  case à cocher fait noter, à chaque coup que l'IA joue contre vous, la
  profondeur terminée par tous ses fils, le temps utilisé et le temps accordé
  (niveau 2 et plus, coups calculés seulement ; 1 500 coups au plus, rien ne
  quitte le navigateur). Le tableau donne, par niveau, la profondeur
  réellement terminée, la part des coups qui atteignent la profondeur prévue,
  le temps médian, les dépassements, et le temps qu'il faudrait pour terminer
  la profondeur prévue dans 8 coups sur 10 (estimé avec la croissance mesurée
  sur l'appareil, « extrapolé » quand une profondeur n'y a jamais été
  terminée). Le banc mesurait les niveaux sur un seul fil ; ceci mesure la
  vraie partie. Rien n'est changé dans les niveaux.
- **Chance de gain mesurée** (Observatoire, Vue générale et Évaluation) : une
  fréquence observée, pas un modèle. Sur 8 000 positions de vraies parties du
  corpus dont on connaît le vainqueur, notées avec les poids du coup observé,
  rangées par note en tranches de même effectif : combien de fois le camp au
  trait a gagné, avec sa marge. Calcul en un clic (environ une seconde sur
  ordinateur), gardé dans le navigateur. Elle figure aussi dans le rapport.
  C'est la version mesurée de la « confiance » des maquettes.

### Corrigé — l'échelle de la méthode Texel
La recherche de l'échelle s (la pente de la courbe note → chance de gain)
démarrait sur un plateau de l'erreur et s'y arrêtait : s = 0,0061 au lieu
d'environ 0,0004, une courbe quinze fois trop raide (erreur 0,222 contre
0,188 sur 3 000 positions). Elle cherche maintenant d'abord sur une grille.
Ça corrige l'outil Texel du Labo. **Les poids Texel du jeu (niveaux 4 et plus)
ont été réglés avec l'ancienne échelle** (`tools/texel-poids.js`) : ils ne
changent pas dans cette version.

D'abord essayée pour la chance de gain : cette courbe, même bien réglée, colle
mal aux vraies parties (une bille d'avance prévue à 68 %, gagnée à 95 %). D'où
les tranches mesurées.

## [v3.12]

### Ajouté — Observatoire IA : carte de chaleur, aperçu au survol, vraie pause
Trois idées reprises des maquettes envoyées par l'auteur (« Observatoire
hybride » et « Plateau des choix »), sans toucher au moteur :
- **Carte de chaleur** (onglet Recherche) : les cases où les 10 meilleurs coups
  amènent une bille, en orange ; chaque case prend la meilleure note des coups
  qui y mènent, couleur pleine pour le meilleur, de plus en plus pâle jusqu'au
  10e. Une bulle donne le coup et sa note. Lien 🔥 pour la masquer. Une échelle
  fixe en points ne disait rien : en ouverture, les 10 premiers coups tiennent
  souvent en 50 points.
- **Aperçu au survol** : à la souris, survoler un coup de la liste ou de
  l'arbre montre la position juste après lui, billes déplacées cerclées d'or
  (règles du site, sans recherche). La légende et la note gardent la même
  hauteur, pour que la liste ne bouge pas sous la souris.
- **Vraie pause** : en revue d'un ancien coup, le calcul suivant de l'IA ne
  ramène plus au direct ; le point qui pulse dans la frise y ramène.

Écarté des maquettes, parce que le moteur ne le calcule pas : la « confiance »
en pourcentage, les explications en phrases (« libère la colonne F ») et le
scénario « si l'adversaire avait joué… ».

## [v3.11]

### Corrigé — la mémoire de l'IA confondait les deux camps
Trouvé en mesurant l'espacement des niveaux : à partir du niveau 4, le niveau
supérieur ne battait plus celui du dessous (4 → 5 : 0 Elo, 5 → 6 : −99,
6 → 7 : −221, sur 9 paires de parties par marche).

La table de transposition, où l'IA range les positions déjà calculées,
reconnaissait une position à ses billes seulement, sans le camp qui doit
jouer. Or la même disposition revient avec l'autre camp au trait, par exemple
quand une bille fait en deux coups le trajet qu'un autre chemin fait en un.
L'IA relisait alors une note calculée pour l'adversaire. Mesuré sans limite de
temps, contre le même moteur sans table (dont les notes sont exactes) :
- trois départs de la Marguerite belge, profondeur 3 : **118 notes de coups sur
  203 fausses**, jusqu'à 1 957 points (près de 2 billes) ;
- une petite position, profondeur 4 : 40 notes sur 43 fausses, et **un autre
  coup choisi** que le bon.

La clé contient maintenant le camp au trait (fil de calcul, fil principal, et
les deux lectures de la suite prévue) : plus aucune note fausse, et la
recherche va un peu plus vite. Plus l'IA cherche profond, plus elle y gagne.
Les notes affichées par l'Observatoire IA et la Réflexion de l'IA en
profitent aussi. Test ajouté : les notes de tous les coups racine sont égales
à celles de la recherche sans table.

## [v3.10]

### Ajouté — une documentation illustrée de l'analyse
Demande de l'auteur : des photos explicatives dans le wiki pour les parties
« analyse ». Captures du **vrai site**, prises pendant de vraies parties contre
l'IA (dossier `docs-img/`), dans les pages du dépôt (`docs-fr/`, `docs-en/`)
et dans le wiki GitHub :
- **Observatoire IA** (nouvelle page) : le plateau en direct, chaque onglet, la
  fiche « Pourquoi pas … ? », deux variantes côte à côte, le panneau réduit, le
  téléphone ;
- **Réflexion de l'IA** (page ajoutée au dépôt, image ajoutée au wiki) : le
  tableau après le coup, avec la suite prévue sur le petit plateau ; une note
  dit que depuis la v2.75 les poids Texel donnent aussi une valeur à certains
  critères de KAAH ;
- **Analyser une partie** (nouvelle page) : « Après la partie », « Analyse de
  la position », le rapport « Analyser la partie » (précision, catégories,
  coups à revoir) et la page Analyse. Elle explique aussi pourquoi la courbe de
  la page Analyse et le rapport classent les coups différemment : ils ne
  mesurent pas la même chose.

### Corrigé
- **Labo, banc « Niveaux » : il ne pouvait pas finir au-delà du niveau 5.** Son
  chien de garde jugeait bloquée toute partie de plus de 2 minutes, en comptant
  0,4 s par coup au lieu du vrai temps des niveaux (jusqu'à 5 s au niveau 7) :
  les parties entre hauts niveaux étaient tuées puis relancées sans fin. Le
  délai compte maintenant le temps par coup des deux camps (test ajouté).
- Observatoire : quand plusieurs des 3 meilleurs coups partent de la même
  bille, leurs pastilles de rang se cachaient l'une l'autre ; la suivante
  glisse maintenant le long de sa flèche.
- « Après la partie » et son bouton étaient écrits sans accents (« Apres la
  partie », « Premiere bille perdue », « Position basculee »…).
- Observatoire sur téléphone : le bandeau « L'IA réfléchit… » cachait le bas
  du tiroir (mini plateau, frise) ; il passe maintenant juste au-dessus.

## [v3.09]

### Ajouté — l'Observatoire IA, d'après les maquettes « HUD », « timeline » et « courbe par profondeur »
- **Panneau réductible en une ligne** (bouton —) : profondeur, positions,
  temps et meilleur coup pendant le calcul, ou le dernier coup joué. Le plateau
  de la partie reste dégagé, avec ses flèches et ses billes menacées. Un clic
  sur la ligne (ou ▢) rouvre le panneau ; le choix est retenu.
- **Frise des décisions** en bas du panneau, dans tous les onglets : un point
  par coup de l'IA (vert, rouge si la note est négative, cerclé d'orange après
  une chute d'au moins 200 points, vide sans calcul), un point qui pulse pendant
  le calcul, ◀ ▶ pour passer d'un coup à l'autre.
- **Courbe de la note du meilleur coup, profondeur par profondeur** (Vue
  générale), point orange quand le meilleur coup change.

### Changé
- L'en-tête du panneau tient de nouveau sur une ligne (étiquettes plus courtes).

### Écarté
Les maquettes reçues décrivaient en partie des échecs (plateau 8×8, pions,
roi, colonne F) : rien de cela ne s'applique. Toujours pas de « confiance »
en pourcentage, de « robustesse testée sur 100 parties » ni de scénario
« si l'adversaire avait joué… » : ce serait inventé.

## [v3.08]

### Ajouté — l'Observatoire IA, d'après les maquettes « journal » et « délibération »
- **Journal de la recherche** (Vue générale, niveau Analyste et plus) : une
  ligne par profondeur terminée par tous les fils — l'heure, le meilleur coup
  et sa note, les positions et coupures de cette profondeur, et « le meilleur
  change » quand c'est le cas ; puis le coup joué, avec « temps écoulé pendant
  la profondeur N » si le minuteur a coupé. Tiré des messages du moteur : ce
  n'est pas la trace de chaque position, et le panneau le dit.
- **La note d'un coup, profondeur après profondeur** (« Pourquoi pas … ? » et
  onglet Décision) : sa note et son rang à chaque profondeur terminée. Quand un
  coup menait plus tôt puis recule, la fiche le dit (« en cherchant plus loin,
  le moteur lui a trouvé une meilleure réponse adverse ») ; pour le coup
  retenu, combien de profondeurs il est resté en tête.
- **Copier le rapport** (onglet Historique), en plus du téléchargement ; le
  rapport donne le meilleur coup à chaque profondeur.

### Écarté, parce que ce serait inventé ou faux pour ce moteur
« Coups vivants 44 → 7 » et « 40 autres coups élagués » (chaque coup de départ
est noté en entier), « jauge de confiance » en pourcentage (on montre l'écart
avec le 2e et la stabilité, pas un chiffre composé), radar à 5 axes (les
critères n'ont pas la même échelle), arbre en accordéon avec coupures β (le
moteur ne garde pas l'arbre).

## [v3.07]

### Ajouté — l'Observatoire IA, d'après la maquette « plateau + choix de l'algo »
- **Flèches sur tout le groupe qui bouge** : en ligne, de la dernière bille à
  la case où arrive la première ; en latéral, du milieu du groupe à son
  arrivée. **Numérotées comme la liste** (1, 2, 3 dans la couleur de leur
  flèche), sur les mini plateaux et sur le plateau de la partie.
- **Coordonnées Aba-Pro** sur les mini plateaux (lettres a à i, chiffres 1 à 9),
  pour lire la notation des coups.
- **« Pourquoi ce coup ? / Pourquoi pas celui-là ? »** pour n'importe quel coup
  choisi dans la liste : son rang et sa note, son écart avec le coup retenu (en
  points et en billes), l'éjection adverse vue par la recherche, ce que
  montrent les règles un coup plus loin, et les critères qui diffèrent au bout
  des deux suites prévues quand elles sont gardées.
- Les flèches dessinent leur pointe elles-mêmes (plus de marqueur SVG, mal
  pris en charge par certains navigateurs).

### Écarté de la maquette, parce que c'est faux pour ce moteur
« Écarté tôt par élagage α-β » pour un coup de départ : chaque coup de départ
est noté en entier, sans élagage à la racine ; le panneau le dit. Et une
poussée de 3 billes contre 3 n'existe pas dans les règles.

## [v3.06]

### Ajouté — l'Observatoire IA, d'après les maquettes de l'auteur
- **Le plateau de la partie en direct** : pendant le calcul, les 3 meilleurs
  coups du moment en flèches (vert, orange, gris), le meilleur avec ses billes
  entourées ; les billes en danger (au bord, un allié ou moins) entourées en
  rouge, les isolées en orange, pour les deux camps. Réglable dans le panneau
  (« Afficher : flèches, menaces »), seulement panneau ouvert et contre l'IA.
- **Le bandeau « L'IA réfléchit… » détaillé** : profondeur, positions, temps et
  meilleur coup provisoire, même panneau fermé. Se coupe dans le panneau
  (« bandeau »).
- **Décision enrichie** : pour le coup retenu et ses alternatives, le type de
  coup (en ligne, latéral, poussée 3 contre 2, éjection), les éjections que
  l'IA prépare, celles que l'adversaire peut jouer tout de suite, les billes en
  danger de chaque camp — regardé un coup plus loin avec les règles du jeu,
  sans recherche, et dit comme tel. **Deux variantes côte à côte**, avancées
  ensemble pas à pas.
- **Rapport téléchargeable** (bouton ⬇ et onglet Historique) : un fichier
  lisible (.txt) et, au niveau Développeur, les données (.json). Créé dans le
  navigateur, rien n'est envoyé.
- **Mode plein écran** (⤢) : les cinq onglets à la fois, en tableau de bord.
- Bouton « ⚡ Jouer maintenant » dans la Vue générale pendant le calcul.
- Sur très grand écran (1800 px et plus), le panneau prend sa place à droite au
  lieu de couvrir la partie.

### Écarté, parce que ce serait inventé
« Mémoire utilisée » (pas mesurable de façon fiable dans un fil de calcul),
notes de « confiance » ou de « performance », arbre complet nœud par nœud (le
moteur ne le garde pas : le reconstituer voudrait dire recalculer).

### Changé
- Les niveaux de détail passent sous les onglets, avec les réglages
  d'affichage : l'en-tête du panneau tient sur une ligne.

## [v3.05]

### Corrigé après publication
- Les onglets de l'Observatoire sortaient du panneau et se collaient en haut
  de la fenêtre (le style du menu du site s'appliquait à eux). Ils restent
  maintenant dans le panneau.

### Ajouté — l'Observatoire IA
Idée de l'auteur : voir ce que l'IA calcule pendant la partie. Un panneau à
activer (bouton « 🔭 Observatoire IA » sous le plateau), à droite sur ordinateur
et en bas sur téléphone, avec cinq onglets et trois niveaux de détail
(Spectateur, Analyste, Développeur).
- **Vue générale** : profondeur atteinte, positions examinées, temps sur le
  temps accordé, vitesse (courbe en direct), coupures alpha-bêta, part de la
  table de transposition, meilleur coup profondeur après profondeur (le
  changement de coup est signalé), élagage par profondeur, détail fil par fil.
- **Recherche** : les coups de départ au fur et à mesure qu'ils sont notés
  (note, écart avec le meilleur, effort, ⚠ si l'adversaire a une éjection
  juste après), flèches sur un plateau, coup choisi tracé sur le plateau de la
  partie pendant le calcul, variante prévue pas à pas, arbre des lignes
  principales.
- **Évaluation** : ce qui compose la note de la position (critères et poids du
  moteur), l'effet d'un coup choisi, carte des billes (en danger, isolées,
  forteresses : les définitions de l'évaluation).
- **Décision** : le coup retenu comparé à ses deux meilleures alternatives, les
  critères qui font l'écart, « et si l'IA avait joué… ? » (variante du coup
  écarté).
- **Historique** : toutes les décisions de l'IA de la partie, courbe de sa
  note, chute signalée, revue d'un coup dans tous les onglets, et « rejouer ce
  calcul plus profond » (deux profondeurs de plus, 8 s au plus, dans un fil à
  part).
- Un coup joué sans calcul (livre, table de finale, empreinte, niveau 1) est
  indiqué comme tel.

### Moteur — mesures pendant le calcul, sans changer un choix
Les fils de calcul envoient, au plus toutes les 150 ms, la profondeur, les
positions, les coupures et les coups de départ déjà notés ; seulement quand le
panneau est ouvert (`observe: 150`). Un compteur de coupures s'y ajoute
(`_cuts`, aussi dans `_metrics.cuts` et `depthInfo[d].cuts`). Un test vérifie
que le moteur examine exactement les mêmes positions, avec le même résultat,
avec et sans mesures, et que les coups de départ envoyés sont ceux du moteur.
Aucun serveur n'est contacté : tout reste dans le navigateur.

### Ce que l'Observatoire ne prétend pas
- Le moteur n'est **pas un PVS** : alpha-bêta avec approfondissement itératif,
  table de transposition, coups tueurs et quiescence ; chaque coup de départ
  est cherché avec une fenêtre complète, donc leurs notes sont exactes. Une
  coupure ne dit pas qu'un coup est mauvais.
- L'arbre complet n'est pas conservé (des milliers de positions) : on montre
  l'arbre des lignes principales des 10 meilleurs coups de départ.
- Les notes sont en points internes (une bille de plus = 1000, une éjection
  2000), pas une probabilité de gagner.
- Les écarts de critères entre deux coups sont reconstitués après le calcul à
  partir du bout de leur suite prévue, et l'écran le dit.

## [v3.04]

### Ajouté — Speed run et Au centre, 49 départs
Demande de l'auteur : des départs en petits groupes « qui facilitent des
éjections rapides », d'autres « qui favorisent la position au centre », et
certains qui « réduisent l'avance des 53 % des Noirs ». Générés par le LLM
Claude Opus 5.5 Extra, mesurés par le moteur ; noms provisoires.
- **⚡ Speed run** (24) : 20 départs, 4 à 6 petits groupes par camp,
  beaucoup de billes au bord et au contact de l'adversaire, sans éjection
  possible au premier coup. Quand le moteur joue contre lui-même, la
  première bille sort en moyenne entre le demi-coup 6,3 et 16,5, contre
  29,2 pour la Marguerite belge. Avantage du trait de +34 à +54.
- **🎯 Au centre** (25) : 20 départs, 4 ou 5 petits groupes serrés autour
  du centre (2,21 à 2,57 cases en moyenne, contre 3,29 pour la Standard),
  au contact de l'adversaire. Avantage du trait de +26 à +46.
- **9 versions rééquilibrées** (« · rééquilibré »), rangées avec leur
  départ : un coup blanc déjà joué ramène l'équilibre entre −5 et +6,
  contre +13 à +26 sans lui (Standard +19).
- Deux catégories de plus dans le menu de configuration et la galerie
  (« ⚡ Speed run », « 🎯 Au centre ») ; 189 positions de départ en tout,
  dont 129 générées par Claude.
- Tests : les 49 (demi-tour, groupes, bord, contacts, distance au centre,
  aucune éjection au premier coup, coup d'avance légal et ce qu'il permet,
  nouveauté), deux mesures refaites par le moteur ; wiki, README.

## [v3.03]

### Modifié — trois catégories, et le nom de qui les a générés
Demande de l'auteur : « on garde toutes les variantes, mais on les regroupe
par catégories dans le site » et, au lieu de « fait par Abalassembly »,
« généré par LLM Claude Opus 5.5 Extra ».
- Les 80 départs nouveaux (v3.01-v3.02) sont rangés en trois catégories :
  **Les formes compactes** (20), **Les petits groupes** (40, les séries 2
  et 3 réunies), **Les Blancs prennent de l'avance** (20). Le menu de
  configuration a un groupe par catégorie ; la galerie Variantes a un bouton
  par catégorie, et « 🧪 Générées par Claude » pour les 80.
- Les fiches, le menu, la carte de la page Variantes et la page
  Architecture disent « généré par le LLM Claude Opus 5.5 Extra », mesuré
  par le moteur d'Abalassembly.
- Les noms ne changent pas encore : ils seront revus.
- Tests : les trois catégories (fiches, menu, boutons) et le crédit.

## [v3.02]

### Ajouté — les Blancs prennent de l'avance
Demande de l'auteur : des variantes où les Blancs peuvent atteindre le centre
ou éjecter les premiers, pour réduire l'avantage du premier joueur.
- **20 départs de plus** : un départ connu (la Standard, les Marguerites
  belge, allemande, hollandaise et suisse, ou un des départs inventés), et
  les Blancs commencent avec un coup déjà joué, des billes avancées vers le
  centre ou une poussée blanche prête. Les Noirs jouent toujours en premier
  et ne peuvent rien pousser au premier coup. Un groupe du menu de
  configuration ; dans la galerie, sous « 🧪 Inventées ».
- **Une mesure qui ne favorise aucun camp**, puisque les camps ne sont plus
  pareils : la moyenne des notes du moteur à 2 et à 3 demi-coups. 0 est
  l'équilibre ; Standard +19, Marguerite belge +16, Marguerite allemande +25.
- Tous les coups d'avance des cinq départs classiques ont été mesurés. Avec
  le bon, la Marguerite allemande passe à +3, la Marguerite belge à −4, la
  Standard à +7 ; 14 des 20 départs sont entre −5 et +5.
- Les tests vérifient que chaque départ est sa base plus un coup blanc
  légal, celui annoncé, que les Noirs ne peuvent pas pousser d'entrée, ce
  que dit la fiche (vers le centre, poussée ou éjection prête), et refont une
  mesure du moteur.

## [v3.01]

### Ajouté — 60 départs inventés par Abalassembly
Demande de l'auteur : « oui ajoute-les » (les 60 formes inventées et
mesurées, avec leur nom).
- **60 positions de départ nouvelles**, jouables depuis le menu de
  configuration (trois groupes « Départs inventés par Abalassembly ») et la
  galerie Variantes, où le bouton « 🧪 Inventées » les montre toutes. Chacune
  a sa fiche : sa forme, ses groupes de billes, et l'avantage du trait mesuré
  par le moteur.
- Les règles du choix : 14 billes par camp ; les Blancs sont le demi-tour
  exact des Noirs ; les deux camps ne se touchent pas ; aucune bille seule ;
  aucune n'est une position déjà connue, même tournée ou retournée.
- **Série 1, formes compactes** (La Ruche… Le Pavé) : avantage du trait de
  +12 à +38. **Série 2, petits groupes** mêlés à ceux de l'adversaire
  (L'Archipel… La Volée) : de +24 à +48. **Série 3, petits groupes, suite**
  (La Patrouille… L'Envol), dont 7 symétriques : de +28 à +50. Pour
  comparer : Standard +38, Marguerite belge +32, Marguerite allemande +50.
- Une carte sur la page Variantes et une section du wiki
  ([Variantes](docs-fr/Variantes.fr.md)) expliquent la mesure et ce que la
  recherche a montré : plus un camp est éclaté, plus le premier coup
  rapporte, sauf si ses petits groupes sont mêlés à ceux de l'adversaire.
  Ce sont des mesures du moteur : aucune partie n'a encore été jouée depuis
  ces positions.
- Les tests vérifient chaque fiche : équité, absence de contact, groupes
  annoncés, nouveauté (posRef de KAAH), et refont une mesure du moteur.

## [v3.00]

### Ajouté — les grands nombres de l'Abalone
Demande de l'auteur : « marque-le dans Variantes, et les nombres énormes et la
quantité de mémoire dans la partie Tables de finale ».
- **Variantes** : combien de positions de départ peuvent exister avec 28
  billes et 61 trous. 7,7 × 10²⁴ en tout ; environ 6,4 × 10²³ vraiment
  différentes (12 symétries du plateau) ; 2 382 605 107 200 départs
  équitables, comme la Standard ou la Marguerite belge, dont 198 550 991 616
  vraiment différents. Le test refait le calcul.
- **Tables de finale** : les finales à une bille de la fin en Abalone normal,
  de 14 contre 9 à 9 contre 9. 7,8 × 10²¹ positions, environ 2 zettaoctets.
  La comparaison avec les tables d'échecs à 7 pièces. La mémoire disponible
  aujourd'hui (disques dans le monde, El Capitan). Dans combien d'années on
  pourrait les calculer, avec les réserves.

### Corrigé — la page Tables de finale
- Elle ne parlait que du 2 contre 2 et du 3 contre 2 : le 4 contre 2 (résolu
  en v2.49) et le 3 contre 3 (calculé) y sont, et la consultation dit qu'elle
  couvre le 4 contre 2.
- Le tableau « Pour aller plus loin » donnait les anciennes tailles, décalées
  d'une ligne (3 contre 3 « ~185 M », 4 contre 3 « ~30 G ») ; il donne
  maintenant celles de `tablebase/RESULTS.md`, avec le 5 contre 2.
- « Abalone n'a pas besoin de tables de finale » ne tenait plus depuis le
  4 contre 2 : le texte dit ce que chaque table a appris.

## [v2.99]

### Corrigé — vie privée
- La carte de FightClub, dans le Hall of Fame et parmi les liens, montrait
  un nom présenté comme le sien. Il n'est publié nulle part ailleurs : le
  site ne montre plus que son pseudo, comme pour tous les joueurs.
- L'historique du dépôt a été réécrit : le vrai nom de l'auteur, ce nom et
  le numéro de téléphone qu'une ancienne version affichait n'y figurent
  plus, dans aucune version passée des fichiers ni dans aucun message de
  commit. Un test vérifie qu'ils ne reviennent dans aucun fichier.

## [v2.98]

### Ajouté — la notation de Saab : le code de position de KAAH et KAAWA
Demande de l'auteur, après l'explication de Saab : « ce n'est pas une
notation de coup, c'est la notation de la position complète compressée ».
Le code lui-même s'affichait déjà sous le plateau ; il devient une vraie
notation, qu'on lit autant qu'on l'écrit.
- **La posRef de KAAH** : la fenêtre *Permutations* met en évidence la
  posRef, la forme sous laquelle KAAH range une position (le camp qui a le
  plus de billes devant, puis la position dont les billes sont le plus près
  de a1, a2, a3…), avec son `code_permut_Ref_Orig`. Le calcul est celui de
  KAAH, comparé à son propre code sur 2 885 positions : zéro écart.
  L'ancienne « forme canonique » (le plus petit des 12 codes) n'était la
  sienne que dans 57 % des positions.
- **La fenêtre Permutations** : le code y est modifiable (on colle n'importe
  quelle position), *Copier tout* écrit le même texte que KAAH, et *Jouer
  cette position* lance une partie depuis là.
- **Jouer depuis un code** : aussi dans *Importer* et dans l'éditeur de
  position (« Ou un code de position »), dont *Copier le code de position*
  copie désormais ce code. Le code de partie (`ABAL1`) porte alors la
  position de départ, `pos_` et le code, à la place du nom de la
  disposition : l'historique et la *Partie par code* la rejouent.
- **Les fichiers de partie de KAAH et KAAWA (.json)** : *Importer* → *Fichier
  de partie KAAH / KAAWA*, et *💾 Fichier KAAH (.json)* dans la partie.
  Chaque coup y porte sa position : c'est elle qui désigne le coup à la
  lecture, l'idée même de Saab. Vérifié dans les deux sens : 40 parties
  écrites par Abalassembly relues par le chargeur de KAAH à l'identique,
  et deux vrais fichiers de KAAWA relus ici jusqu'à la même position finale.

### Corrigé — l'éditeur de position
- *Jouer cette position* inversait les billes déjà éjectées : les billes
  noires perdues devenaient le score de Noir au lieu de celui de Blanc.
- Il gardait aussi l'historique des coups de la partie précédente. Il passe
  désormais par le code de la position, comme le reste.

## [v2.97]

### Ajouté — les notations de Marc Ghigou, et le principe de Michael Frank
Demande de l'auteur : « intègre au site la notation de Marc Ghigou, et
celle de Michael Frank ».
- **Paramètres → Notation des coups → Notation historique** : un des deux
  systèmes de la Fédération française de jeu d'Abalone s'affiche sous chaque
  coup de l'historique, en plus d'Aba-Pro et de Nacre.
  - **1990, dit « Hemgé »** (*Jeux & Stratégie* n° 7, signé Barlerin « avec
    la complicité de Marc Ghigou ») : rangées A à I, cases numérotées
    depuis l'Ouest, `A1-B2`, `C3-D4, D5, D6`, `(e)`.
  - **1989, les 24 lettres** (*Jeux & Stratégie* n° 1, attribué à Marc
    Ghigou par le blog Abalone Online) : lettres sur le bord, sans W ; une
    case intérieure porte deux lettres (`BD`) ; `A-M`, `AC-SR`, et le rang
    de la bille éjectée, `(eI)` en romain pour Noir, `(e2)` pour Blanc.
- **Une fenêtre** (bouton sous le réglage) dessine les deux plateaux à
  partir des tables mêmes, explique les règles, donne la partie en cours
  dans les deux systèmes, et raconte le principe de Michael Frank (MIT) :
  repérer chaque case par x et y, l'idée que reprend Aba-Pro. Frank n'a pas
  abouti à une notation des coups : il n'y a rien de lui à afficher coup
  par coup, et ses échanges sont archivés au MIT.
- **Vérifié** contre les articles : la partie d'exemple de 1990 (10 demi-
  coups), celle de 1989 (9) et les 17 premiers coups d'une solution publiée
  en 1990 se rejouent avec le vrai moteur, et chaque coup publié est le
  seul coup légal qui s'écrive ainsi. Ces parties ont tranché deux points :
  le W n'existe pas (la partie écrit `AYX` et `Y-N`), et les cases des
  médianes suivent les exemples (`MO`, `MN`) plutôt que la phrase du texte.
  Sur le papier, une même écriture en flèche de 1989 peut viser deux
  groupes ; jamais dans une même position, où les deux coups ne peuvent pas
  être légaux ensemble (vérifié). L'Aba-Pro reste la notation des exports
  et des imports.
- Le wiki : une section « Les systèmes de notation » dans Ressources
  (Ghigou, Frank, LMU, OKUN, Aba-Pro, Nacre), et la base de connaissances.

## [v2.96]

### Modifié — la page Architecture remise à jour
Demande de l'auteur : « la partie Architecture correspond-elle à ce qu'il y a
maintenant ? ». Non : elle avait été vérifiée en v2.66.
- **Comment l'IA choisit son coup** : la recherche utilise, en style Auto ou
  Équilibré et à partir du niveau 4, les poids que la méthode Texel a
  appris sur 15 036 positions de vraies parties (v2.75). En option : le
  style KAAH et le moteur NNUE expérimental.
- **D'où viennent les données** : s'ajoutent la qualité des coups (chaque
  partie analysée hors ligne par le moteur), les humains et les programmes,
  les 60 positions de départ (dont 37 de gym-abalone), les 40 parties citées
  sans leurs coups et les fichiers APGN publiés dans `games/`.
- Les mêmes ajouts dans `docs-fr/Architecture.fr.md` et
  `docs-en/Architecture.en.md`, schémas compris. Deux nouveaux chiffres
  (positions de départ, parties citées) sont vérifiés par le test.

### Corrigé — PlayStrategy était bloqué par le site lui-même
- La page promettait de suivre une partie PlayStrategy en direct, de voir
  ses tournois et d'en importer un. Mais la règle de sécurité du site
  n'autorisait aucune connexion vers un autre site : vérifié dans un
  navigateur, ces fonctions étaient bloquées depuis leur ajout. Elle
  autorise maintenant `https://playstrategy.org`, et lui seul. Le site n'y
  envoie toujours qu'un pseudo ou un lien. Reste une inconnue, impossible à
  tester d'ici : que PlayStrategy accepte les requêtes venant d'un autre
  site. Sinon, le message d'erreur le dit.

## [v2.95]

### Ajouté — tout ce qui existe autour du jeu
Demande de l'auteur : compléter les pages avec ce qu'on a trouvé (PDF,
dépôts GitHub, sites, applis, tournois).
- **Une page « Ressources » dans le wiki du projet** (français et anglais) :
  où jouer, les serveurs disparus, les compétitions, les programmes, les
  articles, les encyclopédies, la communauté, les données ouvertes. Avec la
  liste des 42 codes des variantes de MiGs, que FightClub avait envoyée en
  2019.
- **La page Écosystème** gagne deux acteurs, **PlayStrategy** (Abalone y
  est arrivé le 9 janvier 2025, développé surtout par Vincent Frochot) et
  **KAAH**, l'application de Saab, ainsi qu'un **annuaire** sous le
  plateau. Le palmarès est mis à jour : onze titres mondiaux pour Vincent
  Frochot, de 2007 à 2026, d'après Wikipédia en anglais.
- **Les positions de départ portent leur nom de MiGs** quand il est connu :
  Couronne, Croix, Forçage, Labyrinthe, Mosaïque, Pieuvre, Roue, Tranchée,
  Je suis un robot, Vraie marguerite, Domination vs Marguerite, Def or
  Atak, MQuorric1. Les 23 positions de la liste de MiGs le disent sur leur
  fiche, avec leur code. Wikipédia confirme les 15 billes de la Sibe.
- **La bibliothèque de documents** ajoute *Abalearn* (Campos, Langlois) et
  date le mémoire de Lemmens (18 juin 2005).

### Corrigé
- **abal.online n'a pas rouvert en novembre 2020** : ses plus anciennes
  parties connues datent du 31 juillet 2020. Page Écosystème et wiki
  corrigés.
- La base de connaissances du site comptait 10 titres mondiaux pour Vincent
  Frochot ; il en a 11.

## [v2.94]

### Ajouté — The Arrow, grâce à Wikipédia
L'auteur a trouvé sur Wikipédia les images de deux positions que la v2.93
avait écartées.
- **The Arrow** : l'image « Abalone arrow » est identique, case par case, au
  relevé de gym-abalone, y compris ses 13 billes blanches. Deux sources qui
  s'accordent : 14 noires contre 13 blanches est la position publiée, pas
  une erreur de lecture. Elle est ajoutée (60 positions de départ) : c'est
  la seule disposition du jeu aux camps inégaux, et sa fiche le dit.
- **Snakes variation** : l'image est notre Snakes variant, à qui gym-abalone
  avait fait perdre une bille noire. Rien à ajouter, mais c'est une
  troisième confirmation de cette position, après le corpus AbalOnline et
  l'image du blog. Sa fiche le mentionne.
- Restent à vérifier : food-mill et windmill.

## [v2.93]

### Ajouté — 36 positions de départ, de 23 à 59
Demande de l'auteur (« Ajoute ce qui est possible »). Source : le projet
libre gym-abalone (Nicolas Larue, licence MIT), qui a relevé
automatiquement 60 positions de départ sur les images du blog Abalone
Online.
- **Fiabilité mesurée avant d'ajouter quoi que ce soit** : 20 des 23
  positions déjà présentes y sont identiques case par case, couleurs
  comprises, et Corners et Duel sont identiques aux positions de départ des
  vraies parties AbalOnline. Une erreur connue : sa « snakes-variation » a
  perdu une bille.
- **36 retenues**, chacune avec sa fiche dans la galerie Variantes et son
  entrée dans le menu de configuration (groupe « Positions du blog Abalone
  Online ») : Aliennage, April Fish, Boutonnière, Damier, Corners, Cross, Cœurs croisés, Crown, Def or Attack, Domination vs Daisy, Duel, Forcing, Fracture, French King Cake, Horseshoes, Infiltralien, Infiltration, Intimidation, Marguerite irlandaise, I'm a Robot, Labyrinth, Mosaic, Mquorric, Neko, Oath, Octopus, Scottish Daisy, Sibe, Slaloms, Snowflake, Araignée, Tinsels, Trench, True Daisy, Wheel, Xmas Star.
- **Les fiches ne disent que ce qui est vérifié** : nombre de billes,
  symétries calculées et, pour Corners (32 parties) et Duel (21), les
  résultats du corpus AbalOnline. Les 34 autres n'ont qu'une source, et
  leur fiche le dit. Corners a 13 billes par camp et Sibe 15 : ce sont des
  particularités de ces positions, pas des erreurs (pour Corners, confirmé
  par les parties AbalOnline).
- **Écartées, à vérifier sur les images du blog** : snakes-variation (13
  billes contre 14), the-arrow (14 contre 13), food-mill et windmill
  (symétriques à une bille près, la marque d'une case mal lue).
- **Les parties MiGs en trace retrouvent leur disposition** : Marguerite
  irlandaise (n° 427), Cœurs croisés (614), Damier (2218), Def or Attack
  (10537), Araignée (21470), Aliennage (29333) et Boutonnière (29713) sont
  maintenant jouables. Si leurs coups sont retrouvés, ces parties pourront
  être rejouées.
- La licence MIT de gym-abalone est reproduite avec les données.

### Retiré
- **Le dossier `undefined/`**, ajouté par erreur en v2.69 : des captures et
  un fichier de synchronisation de test, écrits par un script dont le
  chemin n'était pas défini. Aucune donnée personnelle.

## [v2.92]

### Ajouté — les deux plus anciennes parties de MiGs
- **La n° 159** (15 octobre 2006), la première partie gardée par MiGs, et
  **la n° 357** (29 octobre 2006), CH4 contre floopy, la première partie
  complète (finie 6-4 en 73 coups). Elles viennent de la page du blog Abalone
  Online qui présente l'historique de MiGs. La section 📜 de la bibliothèque
  en garde maintenant 40.
- Sa présentation précise que MiGs ne gardait pas toutes les parties avant
  février 2008.

## [v2.91]

### Ajouté — humains et programmes
Demande de l'auteur (« Go »). Sur MiGs, 1 431 des 2 589 parties ont une IA
dans un camp ; dans le tournoi Yearly de PlayStrategy, 73 des 93.
- **Statistiques du jeu, nouveau filtre « Joueurs »** : tous, humains contre
  humains (2 735 parties) ou avec un programme (1 512). Toutes les cartes 🔎
  suivent. Entre humains, les Noirs gagnent 53,1 % des parties (sur 2 222 au
  vainqueur connu).
- **Mes statistiques, « Vrais joueurs »** : seuls les camps tenus par des
  humains sont comptés, sur toutes les parties. Avant, MLA, qui joue plus de
  la moitié des parties MiGs, pesait comme un joueur. La colonne « Les
  gagnants » ne garde, elle aussi, que les gagnants humains.
- **La bibliothèque** signale les programmes par un 🤖.
- **Comment on les reconnaît** : par leur nom exact — « MLA (IA) - … »,
  « IA de lolo », « π #0ABA10 » (à confirmer), les IA des parties de
  référence — et, sur PlayStrategy, par la marque BOT de l'export (le bot
  PST-Greedy-Tom). Les comptes de programmes d'AbalOnline ne sont pas connus
  : ses parties comptent comme humaines.

### Ajouté — les 93 parties du Yearly en APGN
- **`games/playstrategy-yearly-2026.apgn`** : les parties du tournoi du
  18 septembre 2026, publiées avec l'accord de Vincent. Notation Aba-Pro
  (PlayStrategy a sa propre notation, qui n'est pas du Nacre), 93 sur 93
  rejouent. La fin de partie est lue dans le rejeu : sur les 91 parties que
  PlayStrategy dit « Normal », 5 ne sont pas allées jusqu'à 6 billes.
- **Nouvelles balises APGN `BlackType` / `WhiteType`** `"program"`, comme
  en PGN, pour le camp d'un programme. Le fichier MiGs les porte aussi
  désormais (1 454 camps).

### Corrigé
- **`tools/to-apgn.js` ne rejouait plus aucune partie** depuis que le moteur
  compte les billes tombées autrement. Il a été réparé, et un test vérifie
  maintenant que les fichiers de `games/` sont exactement ce qu'il produit.

## [v2.90]

### Ajouté — une 38e partie de MiGs citée par le blog
- **La n° 21470, en Araignée** (24 février 2014), relevée dans la
  bibliothèque des variantes du blog Abalone Online. Sa date tombe bien
  entre celles des parties voisines déjà gardées (n° 21001 du 1er décembre
  2013 et n° 21764 du 26 mars 2014).

## [v2.89]

### Ajouté — 12 parties de MiGs citées par le blog, de plus
D'autres recherches sur le blog Abalone Online (sa bibliothèque des
variantes, ses articles, sa rubrique Records) ont relevé 12 parties de plus.
La section 📜 de la bibliothèque en garde maintenant 37 en trace.
- **Les plus anciennes du site** : la n° 427 (Marguerite irlandaise,
  7 novembre 2006) et la n° 614 (Cœurs croisés, décembre 2006).
- **Des dispositions que nous n'avions pas en MiGs** : Damier, Def or
  Attack, Alliances, Aliennage, Boutonnière, Snakes, Alitration, Face à
  face.
- **Dates contrôlées sur nos propres parties** : les numéros MiGs suivent le
  temps, et chaque numéro tombe bien le jour annoncé entre nos parties
  voisines (la n° 33456 entre deux parties du 17 janvier 2017, par
  exemple). Quand le blog ne donne que l'année, le mois vient de ces
  voisines. Un test le vérifie pour chaque partie.
- **Ce qui reste à faire** : pour 3 d'entre elles (n° 4916, 18416 et 33456),
  le blog publie les coups. Elles sont marquées « coups publiés sur le
  blog, pas encore repris » : il suffira de récupérer ce texte pour les
  vérifier au moteur et les rendre rejouables. Les autres disent « coups
  non retrouvés » plutôt que « perdus », car la bibliothèque des variantes
  du blog en propose parfois en PDF.
- La recherche trouve aussi le nom de la disposition (« face à face »).

## [v2.88]

### Modifié — l'auteur signe ocj94, partout
Demande de l'auteur : sur le site, son nom de joueur est ocj94, et c'est le
seul nom qui doit apparaître.
- **Le Hall of Fame** affiche ocj94, comme le compte de démonstration de la
  page Comparer.
- **La page Écosystème**, le fichier de citation (`CITATION.cff`), la
  mention de copyright, ce journal, la documentation et les commentaires du
  code : même chose.
- Un test vérifie désormais que le vrai nom de l'auteur n'apparaît dans
  aucun fichier du dépôt.

## [v2.87]

### Ajouté — les parties de MiGs citées par le blog, gardées en trace
Demande de l'auteur : « Même si nous n'avons pas les coups, marque les
parties : les numéros, les pseudos et les dates, au moins cela laissera une
trace. » Le serveur MiGs a fermé en 2017 avec sa base de parties ; nous en
avons 2 589 sur au moins 39 517. Le blog Abalone Online en citait 25 (sa
« banque abalonienne » et ses problèmes du mois).
- **Dans la bibliothèque** (📚 Parties), une section repliée en tête :
  numéro MiGs, date, joueurs (pseudos seulement), disposition et ce qui la
  cite sur le blog. 23 n'ont plus leurs coups : elles sont gardées telles
  quelles, en attendant qu'on retrouve un jour la base.
- **2 sont chez nous avec leurs coups** et s'ouvrent d'un clic : la n° 26599
  (problème du mois « Restons simples ! ») et la n° 33170 (« Il peut le
  faire ! »). Vérifiées : mêmes joueurs, même date, et la partie va bien
  jusqu'au coup du problème (pour la n° 33170, au score de 5-5 que donne le
  blog). Un 📌 les signale aussi
  dans la liste MiGs.
- La section suit la recherche et le filtre de disposition ; elle disparaît
  quand on filtre par longueur (on ne connaît pas celle des parties perdues).
- L'en-tête compte les 23 parties « citées sans leurs coups ».

### Corrigé
- **Recherche par numéro** : le champ annonçait « Rechercher un joueur ou un
  N° », mais la liste MiGs ne cherchait que les joueurs. Elle cherche
  maintenant aussi le numéro.
- **En-tête de la bibliothèque sur téléphone** : le bouton ✕ sortait du
  cadre. Les boutons passent sous le titre, le compte sur sa propre ligne.

## [v2.86]

### Ajouté — la matrice des 12 dimensions, les dimensions au fil de la partie, le point de non-retour
Demande d'ocj94 (« Go ») : les trois idées qui n'étaient pas déjà sur le
site, après l'audit d'une nouvelle liste proposée par une autre IA. Le
script qu'elle fournissait n'était pas utilisable : il n'était pas relié au
moteur, ses voisins de case étaient faux, et il aurait compté presque tous
les coups comme des éjections.
- **Toutes les paires de dimensions** : sous les 5 liens les plus forts, la
  matrice complète des corrélations, en carte de chaleur.
- **Les 12 dimensions au fil de la partie** 🔎 : une petite courbe par
  dimension, demi-coup par demi-coup, pour le camp qui va gagner et celui qui
  va perdre. Entre les demi-coups 20 et 29, avant que les billes ne tombent
  vraiment, le futur vainqueur subit déjà moins de menaces (−0,35
  écart-type), a plus de potentiel de poussée (+0,29) et moins de billes au
  bord (−0,25).
- **Le point de non-retour** 🔎 : la bille après laquelle le futur vainqueur
  mène au score jusqu'à la fin, sans jamais être rejoint.
  - Il arrive au 51ᵉ demi-coup en médiane, à 61 % de la partie.
  - Dans 39 % des parties, c'est la toute première bille : 1-0, et le
    vainqueur n'est plus jamais rejoint.
  - Dans 11 %, c'est la dernière : 5-5, puis 6-5.
  - 10 % des parties sont gagnées sans mener au score à la fin.
- Les petits graphiques (`grMultiples`) acceptent une deuxième série sur la
  même échelle.
- **Tests** : 2 de plus (304).

## [v2.85]

### Ajouté — Mes statistiques : la colonne « les gagnants » et les coups d'une seule bille, comme sur Board Game Arena
Demande d'ocj94, après avoir comparé son profil de joueur sur BGA.
- Le tableau **Toi face aux vrais joueurs** a une 3ᵉ colonne, **Les
  gagnants** : le seul camp qui a gagné, dans les 3 163 parties du corpus au
  vainqueur connu. Pour chaque ligne, on voit où l'on se situe entre
  l'ensemble des joueurs et ceux qui gagnent.
- Deux lignes de plus, celles de BGA : les **coups d'une seule bille** et les
  **coups en ligne** (2 ou 3 billes).
- Dans le corpus comme sur BGA, les gagnants jouent moins de coups d'une
  seule bille (21 % contre 25 % pour l'ensemble) et poussent plus (47 %
  contre 39 %).
- Toutes les lignes sont des parts de l'ensemble des coups joués. BGA, lui,
  donne des moyennes par partie : elles dépendent de la longueur des parties.
- **Tests** : 1 de plus (302).

## [v2.84]

### Ajouté — les positions critiques
Le point 7 de la demande d'ocj94 (« Toute »), après les six de la v2.83.
- **Une position critique** : le joueur au trait ne peut pas éjecter, et
  **un seul** de ses coups ne laisse à l'adversaire aucune éjection possible.
  Elle est vérifiée coup par coup, sans évaluation. C'est le cas de 2,1 %
  des coups du corpus (8 957 positions).
- **Les vrais joueurs ne trouvent ce seul coup que 25 % du temps** : 18 % en
  début de partie, 22 % au milieu, 33 % en fin. Les joueurs du tournoi
  PlayStrategy le trouvent 68 % du temps (sur 162 positions), contre 22 %
  sur MIGS et 28 % sur AbalOnline.
- **Une surprise, dite telle quelle** : le futur vainqueur trouve ce coup
  moins souvent (22 %) que le futur perdant (29 %). Quand le coup est manqué,
  l'adversaire ne prend vraiment la bille au coup suivant que dans 27 % des
  cas. Offrir une bille n'est donc pas toujours une faute, et la carte le
  dit.
- **Sans issue** : dans 7,7 % des positions, quoi qu'on joue, l'adversaire
  pourra éjecter.
- **Des positions manquées à revoir** : le bouton « Voir la position »
  ouvre la partie juste avant le coup. De quoi fabriquer des puzzles.
- **L'écart entre le meilleur et le 2ᵉ coup a été essayé, puis écarté.**
  Avec l'évaluation à un demi-coup, il n'est grand que quand un coup éjecte
  une bille (un bond de près de 2 000 points). Il aurait compté les occasions
  d'éjection, qui sont déjà sur la page. La carte l'explique.
- La qualité des coups a été recalculée (`tools/qualite-coups.js`, 27
  minutes sur 2 cœurs). La précision (37,5 %) et les billes offertes (10,1
  pour 100 coups) n'ont pas bougé : les six compteurs d'avant sont
  identiques, partie par partie, sur les 4 580 parties.
- **Tests** : 2 de plus (301).

## [v2.83]

### Ajouté — temps morts, sortie du corpus, positions déjà vues, billes seules, contacts, ce qui se dégrade avant une bille perdue
Demande d'ocj94 (« Toute ») : les idées retenues après l'audit de deux
listes proposées par une autre IA. Elles étaient en partie déjà sur le site,
et leurs chiffres étaient des paris. Ici, tout est compté sur les vraies
parties.
- **Les temps morts** 🔎 : la plus longue période sans bille tombée dure 36
  demi-coups en médiane (26 après la première bille). Deux billes tombent en
  médiane à 6 demi-coups d'écart. 14 % des parties passent au moins 60
  demi-coups sans bille. Le record (275 demi-coups) se rejoue d'un clic.
- **Quand une partie sort du corpus** 🔎 : comme aux échecs quand on « sort
  du livre ». En Marguerite belge, une partie ne ressemble plus à aucune
  autre au 9ᵉ demi-coup (médiane) : 38 % sont encore « dans le corpus » au
  10ᵉ, 3 % au 20ᵉ. Les autres dispositions en sortent vers le 4ᵉ.
- **Les positions déjà vues** 🔎 : la position exacte existe dans une autre
  partie au 10ᵉ demi-coup dans 37 % des cas, au 20ᵉ dans 3 %, au 30ᵉ presque
  jamais. Au 10ᵉ, 31 % de ces positions communes ont été atteintes par un
  autre ordre de coups (des transpositions).
- **Les billes seules** 🔎 (aucune voisine de leur couleur), suivies d'un
  coup à l'autre :
  - une bille seule tombe **5,3 fois plus** souvent qu'une bille
    accompagnée ;
  - 38 % des billes perdues étaient seules, alors qu'elles ne le sont que
    10 % du temps ;
  - une bille laissée seule tombe dans 11 % des cas, retrouve une voisine
    dans 77 % (12 % restent seules jusqu'à la fin) ;
  - le perdant laisse ses billes seules 12,7 % du temps, le vainqueur
    9,3 %.
- **Les contacts et les billes qui tombent** : une bille tombe dans les 3
  demi-coups dans 2 % des positions avec 0 à 4 contacts, 11 % avec 5 à 9, et
  18 à 19 % au-delà.
- **Ce qui se dégrade avant une bille perdue** 🔎 : juste avant de perdre une
  bille, le camp a nettement plus de billes au bord (+0,78 écart-type) et de
  menaces, moins de soutien et de cohésion. Le retard matériel compte peu
  (−0,16). Les billes au bord sont aussi ce qui change le plus dans les trois
  coups qui précèdent. La carte dit que c'est un lien, pas une cause.
- Les événements des parties ont été recalculés (`tools/stats-parties.js`,
  8 minutes). Une partie est maintenant comparée à toutes les autres. Les
  calculs sur tout le corpus (`_sbPlaceDansCorpus`, `_sbTotauxCorpus`) sont
  vérifiés par des tests sur des parties construites à la main.
- **Tests** : 5 de plus (299).

## [v2.82]

### Corrigé — l'échec intermittent des tests, trouvé : une partie réimportée pouvait disparaître à la synchro
Les annotations ajoutées à la CI en v2.78 l'ont attrapé à la première
occurrence. Quand une partie était supprimée puis réimportée sur un
appareil **dans la même milliseconde**, les deux marques portaient la même
date. À la synchronisation, la suppression gardée par l'autre appareil
pouvait l'emporter, et la partie réimportée disparaissait. Dans la vraie
vie, c'est presque impossible ; sur un serveur de test rapide, ça arrivait
une fois de temps en temps (v2.73, v2.76, v2.77, v2.81).
- Une marque posée sur un appareil est maintenant toujours plus récente que
  la précédente pour la même partie.
- Entre deux appareils, à date égale, la partie revient : une égalité ne
  fait jamais perdre une partie.
- Un test fige l'horloge pour reproduire le cas à coup sûr : il échoue sans
  la correction.
- **Tests** : 1 de plus (294).

## [v2.81]

### Ajouté — l'avantage du trait par disposition, le jeu au fil des années, la première poussée de chaque type, les positions répétées, les coups possibles
Demande d'ocj94 (« Je veux tout ») : les cinq propositions, sur la page
Statistiques du jeu. Toutes suivent les filtres 🔎.
- **L'avantage du trait, disposition par disposition**, avec la marge
  d'erreur de chacune. Les Noirs gagnent 53,7 % des parties en tout, 55,6 %
  en Marguerite belge et 55,1 % en Standard : là, l'avantage est démontré
  (toute la marge est au-dessus de 50 %). Ailleurs, rien n'est démontré :
  The Wall donne 44 % aux Noirs, mais avec une marge de 8 points. Une
  disposition jouée moins de 100 fois rejoint « Autres ».
- **Le jeu au fil des années** : pour chaque année, la part gagnée par les
  Noirs, la durée médiane et les parties finies à 6 billes. Les Noirs
  gagnent 55 à 56 % sur MIGS (2016-2017), 50 à 51 % sur AbalOnline
  (2020-2021). La carte prévient que chaque année vient presque toujours
  d'un seul site : un écart dit d'abord que ce ne sont pas les mêmes
  parties.
- **La première poussée de chaque type** : la première poussée arrive au
  6ᵉ demi-coup (médiane), le premier 3 contre 2 au 11ᵉ. Le camp qui joue le
  premier **3 contre 2 gagne 62 %** des parties (63 % si ce sont les Noirs,
  61 % si ce sont les Blancs). Le premier 2 contre 1 ne dit rien (50 %).
  C'est un lien, pas une cause, et la carte le dit.
- **Les positions répétées** : 7,7 % des parties revoient exactement une
  position déjà vue (même plateau, même camp au trait). La première
  répétition arrive vers le 81ᵉ demi-coup ; près de 9 fois sur 10, c'est un
  aller-retour de chaque camp. Ces parties sont plus longues (médiane 148
  demi-coups contre 87). La comparaison se fait case par case, pas par un
  hachage.
- **Combien de coups possibles** : 52 au départ en Marguerite belge, 59 au
  10ᵉ demi-coup, puis environ 51 jusqu'à la fin. Au 30ᵉ demi-coup, regarder
  toutes les suites de 4 demi-coups représente déjà 8,5 millions de
  positions. Le nombre de départ est aussi donné pour chaque disposition :
  de 33 (Corners, The clearing) à 102 (The Wall).
- Les événements des parties ont été recalculés (`tools/stats-parties.js`,
  8 minutes) : trois champs de plus par partie.
- **Graphiques** : dans les barres horizontales, toutes les lignes ont
  maintenant la même longueur de piste. Avant, une valeur plus longue
  raccourcissait sa ligne, et le zéro des barres signées se décalait. Les
  boîtes à moustaches ont leur axe dans la même grille.
- **Tests** : 5 de plus (293).

## [v2.80]

### Ajouté — l'explorateur d'ouvertures du corpus, les types de poussée, la longueur selon le premier coup
Suite de la demande d'ocj94 (« 4, 1, 2 et 3 ») : les points 1, 2 et 3,
sur la page Statistiques du jeu.
- **Les poussées par type** (dans « Comment jouent les vrais joueurs ») :
  - 2 contre 1 : 46 % des poussées ;
  - 3 contre 1 : 29 % ;
  - 3 contre 2 : 24 %.

  Elles font tomber une bille dans 15 à 19 % des cas. Et dans une même
  partie, **le camp qui pousse le plus à 3 contre 2 gagne 80 %** des
  parties (3 contre 1 : 70 %, 2 contre 1 : 59 %). Les poussées qui éjectent
  ne sont pas comptées, puisque la bille tombée dirait déjà qui gagne. La
  carte précise que c'est un lien, pas une cause. Les événements des
  parties ont été recalculés (`tools/stats-parties.js`, 8 minutes).
- **L'explorateur d'ouvertures du corpus**, coup par coup, comme aux échecs,
  sur toutes les parties de la disposition choisie et avec les filtres de
  la page. Pour chaque suite : le nombre de parties, la part gagnée par les
  Noirs avec sa marge, et la longueur médiane. Sous 20 parties, la liste
  des parties, à rejouer.
  - Un coup est reconnu à ses billes et à sa direction, pas à son écriture :
    MIGS et AbalOnline ne notent pas les coups pareil.
  - La disposition libre est exclue, puisque chaque partie y part d'un
    plateau différent.
  - La page Ouvertures garde son explorateur (2 126 parties de tournoi) et
    renvoie à celui-ci.
- **La longueur des parties selon le premier coup**, en boîtes à
  moustaches : la boîte contient la moitié des parties, le trait la
  médiane, la moustache 8 parties sur 10. En Marguerite belge, les deux
  premiers coups les plus joués mènent à des parties de même longueur
  (médianes 93 et 90 demi-coups) ; seuls des coups rares s'en écartent, sur
  trop peu de parties pour conclure. Nouveau graphique `grBoites`.
- **Tests** : 3 de plus (288).

## [v2.79]

### Ajouté — tes billes offertes et ta conversion de l'avance, face aux vrais joueurs
Demande d'ocj94, à partir de deux propositions d'IA (« 4, 1, 2 et 3 ») :
le point 4 d'abord.
- **Ma qualité de jeu face aux vrais joueurs**, nouvelle carte de Mes
  statistiques, avec deux colonnes « Toi » et « Vrais joueurs » :
  - tes coups proches du meilleur, avec leur marge d'erreur ;
  - tes **billes offertes** pour 100 coups, en tout et selon le moment de
    la partie (début, milieu, fin).

  Les mesures sont **exactement** celles du corpus (un test le vérifie
  partie par partie, sur les deux couleurs). Les vrais joueurs offrent
  10,1 billes pour 100 coups, et 13,4 en milieu de partie.
- **Quand tu mènes, quand tu es mené** : tes victoires après avoir mené de
  1, 2 ou 3 billes à un moment de la partie, et après avoir été mené
  d'autant. Chez les vrais joueurs, celui qui a mené de 2 billes gagne
  80 % du temps, et celui qui a mené de 3, 92 %. La 6ᵉ bille, qui finit la
  partie, ne compte pas. Même règle des deux côtés, vérifiée par un test.
- **Ma progression** montre tes billes offertes partie par partie, avec un
  trait gris pour les vrais joueurs. Le profil de décision affiche aussi la
  ligne des billes offertes.
- L'**export CSV** gagne une colonne `billes_offertes`.
- **Tests** : 2 de plus (285).

## [v2.78]

### Ajouté — la qualité des coups des vrais joueurs
Point 4 de l'audit des statistiques choisi par ocj94. Chacun des 418 046
coups des 4 247 parties jouées depuis une position de départ a été analysé
à l'avance par le moteur du site (31 minutes de calcul,
`tools/qualite-coups.js`).
- **Coups proches du meilleur** : à un demi-coup, chaque coup légal est
  évalué, et le coup joué compte s'il est à 30 points ou moins du meilleur.
  C'est **exactement** la précision affichée dans Mes statistiques (un test
  le vérifie), donc les deux se comparent. Mes statistiques montrent
  maintenant, sous ta précision, celle des vrais joueurs : **37,5 %**.
- **Billes offertes** : après le coup, l'adversaire peut éjecter une bille
  alors qu'un autre coup l'évitait. Un échange (le coup joué éjecte
  lui-même) ne compte pas. Résultat : **10,1 pour 100 coups**. La
  vérification est exacte, et 20 fois plus rapide que de générer tous les
  coups adverses ; un test la compare au générateur sur plus de 2 000
  positions.
- **Ce que ça montre** :
  - le futur vainqueur offre 8,3 billes pour 100 coups, le futur perdant
    11,6 ;
  - le milieu de partie est le moment le plus risqué (13,4) ;
  - les joueurs du tournoi PlayStrategy, les plus forts du corpus, n'en
    offrent que 3,6, mais n'ont pas une meilleure « précision » (34,7 %).
    À un demi-coup, la précision mesure mal la force, et la carte le dit.
- La carte suit les filtres de la page (source, disposition, longueur,
  année). Les données, 131 Ko, sont embarquées dans la page, qui reste
  entièrement hors ligne.

### Modifié — les tests sur GitHub
Le même test du moteur échoue de temps en temps sur GitHub (v2.73, v2.76,
v2.77) puis passe à la relance, sans qu'on puisse lire pourquoi. Chaque
échec devient maintenant une annotation lisible, avec le message d'erreur
et le système de la machine, pour le trouver à la prochaine occurrence.

- **Tests** : 4 de plus (283).

## [v2.77]

### Ajouté — des statistiques du corpus plus fiables, et l'explorateur des scores
Suite à l'audit des statistiques fait par ChatGPT pour ocj94 (« 1 2 3 et
4 », plus la spécification de l'explorateur). Le point 4, la qualité des
coups, suit en v2.78 : il demande un long calcul fait à l'avance.
- **Les marges d'erreur** : les pourcentages du corpus montrent leur marge à
  95 % (« 53,7 % ± 1,7 »), calculée par l'intervalle de Wilson, plus juste
  que la formule habituelle pour les petits effectifs. Elle apparaît :
  - en chiffre dans « En bref » et dans « Qui fait tomber la première
    bille » ;
  - en moustache sur les barres de « Ce qui fait gagner » et des premiers
    coups ;
  - au survol des cartes de chaleur et du tableau des remontées.

  Sous 100 parties, un ⚠ signale un chiffre fragile.
- **Les doublons** : 3 parties d'AbalOnline (2020) étaient enregistrées deux
  fois à l'identique. Elles restent dans la bibliothèque mais ne comptent
  plus qu'une fois dans les statistiques. La page parle donc de **4 577
  parties distinctes**, et le dit dans ses sources.
- **Un filtre par année**, à côté de la source, de la disposition et de la
  longueur. Exemple : en 2021, les Noirs ne gagnent que 50,1 % (± 3,6) des
  parties AbalOnline.
- **L'explorateur des scores** (d'après la spécification proposée) : pour
  chaque score atteint en cours de partie, et pour le camp choisi, les
  victoires, défaites, nulles et résultats inconnus, le taux de victoire avec
  sa marge, au choix sur toute la partie, le début, le milieu ou la fin.
  - Une partie compte une fois par score.
  - Un clic sur une ligne montre ses parties, à rejouer.
  - Différence avec la spécification : les moments se comptent en
    demi-coups (comme ailleurs sur le site), puisque le score donne déjà le
    nombre d'éjections.
  - Pas de serveur : tout se calcule sur l'appareil.
- **Corrigé** : avec un filtre actif, la carte « Les billes qui tombent »
  annonçait un nombre faux de parties AbalOnline « commencées sur une
  position de problème » (par exemple 2 000 avec le filtre MIGS). Il est
  maintenant compté, pas déduit.
- **Tests** : 4 de plus (279).

## [v2.76]

### Modifié — le Labo part des poids Texel
Demande d'ocj94 (« Commence par le 1 ») : depuis la v2.75, l'IA joue avec
les poids Texel à partir du niveau 4, mais l'auto-amélioration du Labo
cherchait encore à améliorer les anciens poids « Équilibré », que presque
plus personne n'affronte à ces niveaux.
- **Le point de départ** : un Labo neuf part des poids Texel. Ses mutants,
  SPSA et la méthode Texel tournent autour d'eux, et ses bilans mesurent le
  champion **contre les poids Texel**. Le gain affiché est donc ce que le
  Labo ajoute à l'IA réellement jouée.
- **Ce qu'il adopte** remplace les poids Texel à partir du niveau 4, en
  style Auto ou Équilibré, sur l'appareil où il tourne. Les niveaux 1 à 3
  gardent les poids d'origine : avant, un champion adopté les changeait
  aussi. La case « Utiliser les poids adoptés » dit maintenant où ils
  servent.
- **Un Labo déjà en route** repart des poids Texel à l'ouverture de la
  page. Le test en cours s'arrête, puisqu'il portait sur l'ancien champion.
  L'historique, les compteurs et le journal restent. L'ancien champion reste
  dans l'historique des champions (le bouton « Définir comme champion » peut le remettre),
  et ses bilans, mesurés contre les poids d'origine, sont gardés à part. Le
  plafond de générations repart de zéro.
- **Un champion adopté avant la v2.76** ne s'applique plus : il venait des
  anciens poids, que les poids Texel battent de plus de 300 Elo. Le fichier
  d'export du Labo enregistre maintenant d'où vient le champion.
- **Deux mutations qui restaient bloquées à 0** : « danger » et
  « mobilité », multipliées, ne pouvaient jamais se rallumer une fois à 0.
  Or les poids Texel n'ont plus de « danger ». Elles repartent maintenant de
  4 et de 1.
- **Tests** : 3 de plus (275), et ceux du Labo suivent le nouveau départ.

## [v2.75]

### Modifié — à partir du niveau 4, une IA réglée sur les vraies parties
Choix d'ocj94 (« Ok pour la 2 ») : les poids trouvés par la **méthode
Texel** du Labo, seulement pour les niveaux 4 et plus.
- **Ce qui change** : à partir du **niveau 4**, en style **Auto** ou
  **Équilibré**, l'IA juge les positions avec les poids Texel. Ils misent
  beaucoup plus sur le **centre** et la **compacité** (un critère venu de
  KAAH), presque plus sur la défense passive (forteresse, danger). Sur les
  positions de contrôle du corpus, ils devinent le gagnant dans 75,8 % des
  cas, contre 73,1 % pour les anciens poids.
- **Ce qui ne change pas** : les niveaux 1 à 3 ; un style choisi à la main
  (Agressif, Défensif, Division, KAAH…) ; le **tournoi du mois** (même
  difficulté pour tout le monde jusqu'à la fin du mois) ; un appareil où un
  champion du Labo est adopté (il garde la main).
- **Vérifié en duels** contre les anciens poids, par paires (la même vraie
  position deux fois, couleurs inversées) :
  - profondeur 2 : 42 points sur 48, environ +338 Elo (± 145) ;
  - niveau 4 : 27,5 sur 32, +314 (± 198) ;
  - niveau 5 : 29 sur 32, +394 (± 250) ;
  - niveau 6 : 17,5 sur 20, +338 (± 278).
  Ils battent aussi les styles que le mode Auto choisissait (profondeur 2) :
  Défensif +338, Agressif +163, Division +163.
- **La marche entre les niveaux 3 et 4** : avant, les deux niveaux étaient à
  égalité (+17 ± 114 Elo) ; elle passe à environ **+382** (± 299). Les
  marches voisines : 2 → 3 environ +191, 4 → 5 environ +127. La marche 3 → 4
  est donc la plus haute ; elle reste telle quelle, car l'adoucir
  reviendrait à déplacer le saut sur une autre marche.
- **Un peu plus lent à calculer** : l'évaluation Texel examine environ 17 %
  de positions de moins par seconde. À temps égal, elle voit souvent un coup
  de moins loin, et gagne quand même. Le temps de réflexion ne change pas.
- **Où le voir** : la phrase sous le choix du niveau, l'aide, et l'onglet
  « Méthode Texel » du Labo (les duels et les marches). Les bancs du Labo
  mesurent chaque niveau avec ses poids de partie. `tools/texel-poids.js`
  refait le calcul et vérifie que les poids embarqués sont les bons.
- **Tests** : 3 de plus (272) — quels niveaux et quels styles prennent les
  poids Texel, le moteur qui joue avec, les textes de l'aide et du Labo.

## [v2.74]

### Corrigé — la page Statistiques du jeu en anglais
Signalé par ocj94 : « Je suis sur la partie corpus. En anglais mais cela
reste en français ».
- **Tout est traduit** : le titre et l'introduction de la page, les cartes
  « L'avantage du premier joueur », « Durée d'une partie », « Comment se
  terminent les parties », « Variantes les plus jouées », la phrase des
  sources et la section « Réflexion de l'IA » (boutons et messages de la
  mesure compris). Les types de fin du corpus MIGS, enregistrés en français
  (« Au score », « Abandon », « Déco »…), ont leur traduction.
- **Les noms des dispositions** : les filtres et la carte des variantes
  affichaient des clés brutes (`swiss_daisy`, `custom`…) ; ils affichent
  maintenant « Swiss Daisy », « Disposition libre »…, comme les billes qui
  tombent, et en anglais « French Daisy », « Custom layout »…
- **Les nombres** s'écrivent à la mode de la langue (1,877 et 100.7 en
  anglais ; 1 877 et 100,7 en français).
- **Changer de langue sur la page** la redessine aussitôt (avant, les cartes
  gardaient l'ancienne langue jusqu'à la visite suivante) ; pareil pour Mes
  statistiques.
- **Une phrase fausse** : « celui qui commence gagne 3,7 points de
  pourcentage plus souvent que l'autre » — c'est l'écart à un partage égal
  (50 %), l'écart entre les deux camps étant le double. La phrase le dit
  maintenant. L'introduction cite aussi toutes les sources (PlayStrategy et
  parties de référence comprises).
- **Tests** : la page rendue en anglais ne contient plus un mot de français
  (titre, cartes, variantes, réflexion de l'IA, filtres), et le changement
  de langue la redessine.

## [v2.73]

### Ajouté — Mes statistiques et le Profil, filtrés et en graphiques
Troisième partie de la demande d'ocj94 (« plus de paramètres, de
graphiques, de métriques… »), après le Labo et le corpus.
- **Les filtres filtrent** : les onglets de période (7 jours, 30 jours,
  90 jours, 1 an, Tout) ne faisaient qu'afficher un message ; ils filtrent
  maintenant toute la page, avec un choix du **type de partie** (contre
  l'IA, importées, à deux). Le reste du site (historique, Labo, synchro)
  voit toujours toutes tes parties.
- **Résultats détaillés** : ton score et le **taux glissant** sur tes
  10 dernières parties, puis par niveau de l'IA, par style, par couleur,
  par disposition et par adversaire (parties importées ou à deux).
- **Ma progression** : la **précision** partie par partie (coups proches du
  meilleur choix), les billes faites et perdues, la longueur des parties
  (victoires et défaites en couleur), et **quand tu joues** (jours de la
  semaine × tranches de 4 heures).
- **Moi contre le corpus** : tes **12 dimensions** face aux 427 000
  positions des vrais joueurs (ton centile moyen, 50 = comme eux), et
  **tes ouvertures** face au livre : part de coups connus, part du coup le
  plus joué, taux de victoire de tes choix chez les humains contre celui
  du meilleur coup possible.
- **Export CSV** de tes parties (filtres appliqués) avec leurs chiffres :
  adversaire, niveau, résultat, billes faites et perdues, précision.
- **Le Profil** gagne une carte « Mes chiffres » : score, 10 dernières
  parties, meilleure série, plus haut niveau battu, et la courbe du score.
- Le centile se calcule « au milieu des égalités » : sur des dimensions aux
  valeurs souvent égales, le centile strict plaçait les vrais joueurs
  eux-mêmes au 24ᵉ centile au lieu du 50ᵉ (vérifié sur 3 891 positions du
  corpus).
- 2 tests nouveaux (267 au total).

## [v2.72]

### Ajouté — les Statistiques du jeu, filtrées et en graphiques
Deuxième partie de la demande d'ocj94 (« plus de paramètres, de
graphiques, de métriques… »), après le Labo.
- **Des filtres** en tête de page : **source** (MIGS, AbalOnline,
  PlayStrategy, parties de référence), **disposition**, **longueur** (moins
  de 60 demi-coups, 60 à 119, 120 et plus). Ils recalculent les cartes
  marquées 🔎 : le résumé, les billes qui tombent, ce qui fait gagner,
  comment jouent les vrais joueurs et les nouvelles cartes. Mes statistiques
  et l'écran de fin de partie restent comparés à tout le corpus.
- **En bref** : parties, part gagnée par les Noirs, durée médiane, parties
  finies à 6 billes — pour la sélection.
- **Gagner selon l'avance et le moment** : une carte de chaleur — en ligne,
  l'avance en billes (1 à 5), en colonne, le demi-coup (20 à 140) ; dans la
  case, la part des vraies parties que le camp qui mène a gagnées. Par
  exemple, une bille d'avance au 60ᵉ demi-coup : 65 %.
- **Premiers coups, longueur et fins** : l'histogramme de la longueur des
  parties, comment elles finissent (6 billes, abandon ou temps, nulle,
  vainqueur inconnu), et les premiers coups des Noirs avec leur part des
  parties et leur taux de victoire.
- **Où sont les billes** : le plateau en carte de chaleur, par camp et par
  moment (début, milieu, fin), et **d'où partent les poussées** (la case de
  tête des groupes qui poussent), à partir des positions du Labo.
- 3 tests nouveaux (265 au total).

## [v2.71]

### Ajouté — le Labo en graphiques et en réglages
Demande d'ocj94 : « plus de paramètres, de graphiques, de métriques… pour le
Labo, le corpus et les profils ». Première partie : le Labo.
- **📊 Tableau de bord** (nouvel onglet) : parties jouées (Labo, bancs, test
  KAAH), temps de calcul, parties par heure, tests tranchés (adoptés,
  rejetés, indécis, tris sans finaliste), taux d'adoption, gain réel mesuré.
  Graphiques : le gain réel bilan après bilan avec sa marge, **les poids du
  champion adoption après adoption** (une petite courbe par critère), les
  parties par jour, la longueur des parties, comment elles finissent, le
  score du camp testé selon sa couleur, d'où partent les parties. Filtres
  en tête : période (7 jours, 30 jours, tout) et phase.
- **📐 Méthode Texel** : des réglages — quelles positions (toutes les
  dispositions ou la Marguerite belge), à quel moment (début, milieu, fin),
  le rappel vers les poids du champion (aucun à fort), le nombre d'étapes.
  Et des graphiques : **gagnant prévu contre gagnant réel** (la calibration,
  avant et après), de combien chaque critère fait bouger l'évaluation,
  l'erreur selon le moment de la partie, et tes réglages précédents
  côte à côte.
- **Bancs d'essai** (tournoi des styles, niveaux, contre toi, ouvertures) :
  le temps de réflexion par coup, le nombre de demi-coups avant l'arbitrage
  et le départ se règlent pour chacun (les niveaux gardent leur vrai
  temps). Le tournoi gagne **l'Elo de chaque style avec sa marge** et un
  **tableau croisé « qui bat qui »** coloré ; les niveaux, leur échelle en
  courbe avec sa marge ; contre toi, le score de chaque style contre ton
  clone ; les ouvertures, humains et IA côte à côte.
- Partout : une bulle au survol (ou au toucher) sur chaque barre, case ou
  point, « Voir les chiffres » sous les graphiques principaux, et des
  graphiques dessinés à la largeur réelle de l'écran (texte lisible sur
  téléphone).
- Le Labo garde désormais l'historique de ses champions et le temps de
  calcul de chaque partie.
- 3 tests nouveaux (262 au total).

## [v2.70]

### Ajouté — le Labo IA, six outils de plus
Demande d'ocj94 : « amélioration du Labo », puis « les 6 ». La page Labo IA
passe en **onglets**, un par outil.
- **📐 Méthode Texel** : sur 18 855 positions de vraies parties dont on
  connaît le gagnant, les poids pour lesquels l'évaluation de l'IA **devine
  le mieux qui va gagner** (la méthode des moteurs d'échecs). Quelques
  secondes de calcul. Les parties dont le numéro finit par 0 ou 5 ne servent
  qu'à vérifier : bon gagnant deviné 73,1 % → 75,8 %, erreur −5 %. Rien
  n'est adopté sur ce seul critère : « Vérifier en duels » envoie les poids
  au Labo, qui les confronte au champion. Premier essai, hors du site avec le
  même moteur et les mêmes règles (24 paires depuis de vraies positions,
  profondeur 2 comme le Labo) : les poids Texel marquent 42 points sur 48
  contre le champion (+338 Elo ± 145). Les poids par défaut de l'IA ne
  changent pas pour autant.
- **🏆 Tournoi des styles** : Équilibré, Agressif, Défensif, Division, KAAH
  (et Texel, Humain s'ils existent) s'affrontent deux à deux, par paires ;
  classement Elo.
- **📶 Niveaux** : chaque niveau contre le suivant, avec sa vraie profondeur
  et son vrai temps (le niveau 1 tire au sort, comme en partie) ; la hauteur
  de chaque marche en Elo, et l'échelle depuis le niveau 1. Jusqu'au
  niveau 8 (9 et 10 demanderaient des jours).
- **🧑 Comme les humains** : combien de fois chaque niveau joue le coup du
  joueur (mesuré : niveau 1 13 %, niveau 2 26 %, niveau 3 28 %) ; et des
  **poids « humains »**, ceux qui rendent le coup réellement joué le plus
  probable (coup deviné 17 % → 30 % sur des parties de contrôle). Ils
  deviennent le style **« Humain (Labo) »** de la configuration de partie.
- **🎯 Contre toi** : ton **clone**, le même réglage sur tes coups (ton
  historique, parties importées comprises, 120 coups au moins) ; puis chaque
  style affronte ton clone, et le meilleur peut devenir le style **« Contre
  moi (Labo) »**.
- **📖 Ouvertures** : les débuts de la Marguerite belge du livre, joués par
  l'IA depuis des positions un peu plus loin (ce que les vrais joueurs ont
  joué ensuite), comparés au score des humains. Case à cocher : le livre de
  l'IA mélange alors humains et duels.
- Les bancs d'essai (tournoi, niveaux, contre toi, ouvertures) jouent sur
  les fils de calcul du Labo, plusieurs parties à la fois, avec débit et
  temps restant ; ils reprennent après un rechargement. Un seul à la fois,
  jamais en même temps que le Labo.

### Modifié — des parties du Labo qui ressemblent aux vraies
- **Départ** : de vraies positions de **Marguerite belge** tirées du corpus
  (entre le 8ᵉ et le 16ᵉ demi-coup, à 0-0), au lieu de la disposition
  Standard et de 6 coups au hasard. 2 688 des 4 580 parties du corpus sont
  en Marguerite belge, 384 en Standard. Au choix : toutes les dispositions
  du corpus, ou l'ancien départ. Les deux parties d'une paire partent de la
  même position ; « ▶ revoir » la rejoue.
- **Arbitrage** à la limite de coups : dans les vraies parties, le camp qui
  mène d'une bille au 66ᵉ demi-coup ne gagne que 66 % du temps (deux
  billes : 78 %, trois : 94 %). Une bille d'avance ne compte plus comme une
  victoire que si les deux évaluations, billes mises à part, ne voient pas
  l'autre camp mieux placé ; sinon, nulle.
- Le test en cours au Labo repart sur ces règles (le champion, l'historique
  et les mesures restent). Le test des critères de KAAH aussi, quand on le
  relance.
- Page plus lisible : les poids en français (« centre 6 · cohésion 4 »,
  avant « center 6 · cohesion 4 »), une explication sans jargon, la mise en
  page corrigée sur téléphone.
- Nouvelles données embarquées : `tools/labo-positions.js` (rejoue le corpus
  hors ligne, environ 3 minutes) écrit 25 204 positions calmes et 3 866
  positions de départ. À relancer quand une partie embarquée change : un
  test le réclame.
- 9 tests nouveaux (259 au total).

## [v2.69]

### Ajouté — synchroniser mes appareils
- **🔄 Synchroniser mes appareils** (Historique ou Paramètres, adresse
  `#synchroniser`) : deux appareils, ou deux navigateurs, **fusionnent**
  leurs données de jeu. Demande d'ocj94 : « comment faire pour que tous les
  navigateurs aient les mêmes données ? ».
  - **En direct** : les deux ouverts, un code dans chaque sens (Copier ou
    Partager), puis une connexion directe entre les navigateurs, comme la
    Partie en direct. Aucun compte, aucun serveur.
  - **Par fichier**, si la connexion directe ne passe pas : un fichier de
    synchro à ouvrir sur l'autre appareil avec « Fusionner ».
- **Ce qui voyage** : historique des parties, progression (XP, niveau, ELO,
  badges, séries), statistiques, cartes de chaleur, problèmes et défis du
  jour, Gym Cerveau, Formation Formateurs, carnet du plateau, pseudo. **Ce qui
  reste sur chaque appareil** : réglages d'affichage et de son, compte local,
  Labo IA, partie en cours.
- **Rien n'est écrasé, rien n'est compté deux fois** : les parties
  s'ajoutent sans doublon, une partie supprimée sur un appareil l'est aussi
  sur l'autre (et revient si tu la réimportes). Chaque compteur garde la part
  de chaque appareil : synchroniser deux fois ne change rien, et trois
  appareils synchronisés deux à deux tombent juste. Seule prudence : deux
  appareils dont l'un est la copie de l'autre (ancien export JSON) gardent le
  plus grand total au lieu de l'additionner.
- Après la synchro, un récapitulatif (parties, XP, parties jouées,
  problèmes) puis la page se recharge.
- **Export / import « Mes données (JSON) »** : l'identité de l'appareil ne
  voyage plus avec, et l'export dit la part de chaque appareil — une copie
  synchronisée plus tard ne compte rien deux fois.
- Vérifié de bout en bout : deux navigateurs réels connectés en direct,
  fusion identique des deux côtés. 4 tests nouveaux (250 au total).

## [v2.68]

### Corrigé — les parties importées dans l'historique
- **Le résultat** : une partie importée dont on sait quel camp tu tenais et
  qui a gagné (une partie KAAH, par exemple) affichait « — » au lieu de
  **Victoire** ou **Défaite**. Elle l'affiche maintenant, et le filtre
  « Tout résultat » de la page Historique la range au bon endroit. Une partie
  consultée (jouée par d'autres) ou au résultat inconnu garde « — ».
- **L'heure** : une partie importée avec une date sans heure était
  enregistrée à minuit UTC, donc affichée **« 02:00 »** à Paris — une heure
  inventée. Elle affiche maintenant la date seule. L'en-tête d'import accepte
  aussi l'heure (`# 2026-10-22 06:41 · …`), lue en heure locale ; réimporter
  une partie déjà présente, cette fois avec son heure, la complète sans
  créer de doublon. Les parties déjà importées sont reconnues et affichent
  leur date seule.
- **L'export** de l'historique écrit la date et l'heure locales (avant : le
  jour UTC — une partie jouée à 1 h du matin, à Paris, partait datée de la
  veille).

## [v2.67]

### Ajouté
- **Corpus** : 6ᵉ partie KAAH vérifiée par trois sources — 22/10/2026, contre
  KAI++ niveau 8 (profil Normal v5El10, 60 s), **Blancs 6 à 2** en 58 coups.
  La notation Aba-Pro (116 demi-coups, une seule lecture possible à chaque
  coup), la notation Nacre (116 positions identiques) et les cinq codes de
  position affichés par KAAH (départ, coups 26, 55 et 82, fin) concordent au
  caractère près ; les 58 coups du tableau de réflexion de l'IA de KAAH sont
  bien ceux de la partie. **4 580 parties**.
- Ses statistiques (billes qui tombent, ce qui fait gagner, sortes de coups)
  et ses empreintes sont calculées comme pour les autres : elle compte dans
  les Statistiques du jeu, et la page Architecture passe à 8 parties de
  référence et 427 272 positions mesurées.

## [v2.66]

### Corrigé — la page Architecture, remise à jour
- **Elle datait de la v2.39** et ne correspondait plus au code. Elle est
  revérifiée contre le code en v2.66 :
  - **comment l'IA choisit son coup** : la première question manquait — en
    mode Découverte, à 4 billes contre 2, l'IA joue parfaitement grâce à la
    table de finale (depuis la v2.49, sauf au niveau 1). Ajoutée aussi : la
    règle de la v2.60, jamais un coup qui revient en arrière. Et le niveau 1
    ne tire pas parmi les 4 *meilleurs* coups, mais parmi les 4 premiers de
    la liste (éjections, puis poussées, puis déplacements) ;
  - **d'où viennent les données** : **4 579** parties (et non 4 479 : il
    manquait les 93 parties du tournoi PlayStrategy et les 7 parties de
    référence), **427 156** positions mesurées (et non 418 595), et tout ce
    que les Statistiques du jeu ont gagné depuis ;
  - **les modes de jeu et les échanges** : le mode Découverte, les liens
    `?pos=` et `?defi=`, les images à partager, l'import APGN, le fichier de
    parties envoyé vers le site ; et PlayStrategy, qui passe, lui, par un
    serveur extérieur (en lecture seule) — la page disait qu'aucun échange
    n'en utilisait ;
  - **les tables de finale** : la carte disait qu'elles n'étaient pas
    branchées sur l'IA et que les tables plus grandes étaient hors de
    portée ; la table **4 contre 2** est résolue et prouvée depuis la v2.49
    (140 575 680 positions, le camp fort gagne toujours) et l'IA s'en sert.
- **Lisible sur téléphone** : les schémas étaient des images de 640 points de
  large, dont le texte tombait à 7 points environ sur un téléphone. Ce sont
  maintenant des cartes en texte, qui passent à la ligne ; chaque question de
  l'IA a sa réponse « oui » à côté (en retrait dessous sur téléphone).
- **En anglais** : la page restait en français quand le site était en
  anglais. Elle a maintenant sa version anglaise, et elle change de langue
  avec le site.
- **Le lien vers la version détaillée** menait à une page introuvable
  (`docs/Architecture.md`) : il pointe vers `docs-fr/Architecture.fr.md` ou
  `docs-en/Architecture.en.md`, selon la langue. Ces deux documents sont mis
  à jour de la même façon (quatre schémas Mermaid, vérifiés au rendu), comme
  les liens du guide de reprise anglais (`RECOVERY.en.md`).
- **Un test** compare désormais chaque chiffre de la page et des documents
  aux données embarquées, et l'ordre des questions de l'IA à celui du code :
  une partie de plus ou une question déplacée, et il demande la mise à jour.

## [v2.65]

### Ajouté — à quel coup tombent les billes, toutes les billes
- La carte « À quel coup tombe la première bille » de la page Statistiques du
  jeu devient **« À quel coup tombent les billes »** : une ligne par bille,
  de la **1ʳᵉ à la 11ᵉ**, puis **la dernière** (la 6ᵉ du vainqueur, celle qui
  finit la partie). Sur chaque ligne, la médiane (le point) et l'intervalle
  où tombent 8 parties sur 10 (le trait), tous sur la même échelle de coups.
- Ce que disent les vraies parties : la 1ʳᵉ bille tombe vers le **coup 26**,
  puis il en tombe une autre à peu près **tous les 10 coups** (la 6ᵉ vers le
  coup 75, la 11ᵉ vers le coup 121). La dernière, celle qui fait gagner,
  tombe vers le **coup 99** — vers le coup 73 en Standard, le coup 104 en
  Belgian Daisy.
- **Choisir une ligne** montre son détail juste en dessous : la phrase,
  l'histogramme et les médianes selon la disposition de départ.
  L'histogramme garde les mêmes axes d'une bille à l'autre : on voit la
  bosse glisser vers la droite et s'étaler.
- Chaque bille ne compte que les parties où elle est tombée (4 063 pour la
  1ʳᵉ, 317 pour la 11ᵉ) ; une bille tombée dans moins de 50 parties ne serait
  pas montrée.
- Rien à recalculer : le coup de chaque éjection était déjà dans les données
  embarquées.

### Ajouté — des graduations sous l'échelle de couleurs
- Sous l'échelle de couleurs de **la carte des éjections**, des traits
  verticaux et leurs nombres, **de 0 au maximum** : 0, 200, 500, 1 000 et
  1 767 billes sur la carte « Toutes ». Chaque trait est placé exactement là
  où la carte met la couleur de ce nombre.
- Même chose sous la carte « Où tombent tes billes » de Mes statistiques
  (jusqu'à 6 billes, chaque nombre a son trait).

### Corrigé
- Changer d'onglet sur la carte des éjections ne fait plus disparaître
  l'avertissement « parties ajoutées depuis le dernier calcul ».

## [v2.64]

### Ajouté — une adresse par page
- **Chaque entrée du menu a son adresse**, à garder en favori ou à envoyer :
  par exemple `https://ocj94.github.io/Abalassembly/#corpus` ouvre directement
  les Stats du corpus, `#regles` les Règles du jeu, `#problemes` les
  Problèmes, `#mes-statistiques`, `#plateau`, `#bibliotheque`… (liste
  complète dans le README). L'accueil garde l'adresse nue.
- **Le bouton Retour** du navigateur ou du téléphone revient à la page
  d'avant, et Avance à la suivante.
- **Arriver par une de ces adresses** ouvre directement la page, sans l'intro.
- **En anglais**, le site montre des adresses anglaises (`#rules`,
  `#my-statistics`…) ; les deux langues sont toujours comprises, comme les
  accents (`#problèmes`), les majuscules et les noms complets du menu
  (`#regles-du-jeu`). Changer de langue change l'adresse affichée.
- **Les fenêtres du menu** (Importer, Bibliothèque de parties, Fiche pour IA)
  ont aussi leur adresse ; refermées, l'adresse revient à la page dessous, et
  le bouton Retour les referme.
- **Une partie en cours n'est jamais recommencée** : revenir sur `#partie`
  la remontre telle quelle. Sans partie, `#partie` mène à la préparation
  d'une partie, ou propose de reprendre celle qui était sauvegardée.
- Le mode Enfant garde ses interdits (`#parametres`, `#labo` y sont refusés
  comme au menu) ; les liens existants (`?partie=`, `?pos=`, `?defi`) passent
  avant.

## [v2.63]

### Ajouté — les billes qui tombent, ce qui fait gagner, comment jouent les vrais joueurs
- **L'idée** vient des fonctions d'analyse de séquences de ClickHouse
  (`sequenceMatch`, `windowFunnel`) : suivre les enchaînements d'événements
  d'une partie. Réécrite ici, sans rien installer, sur les vraies parties.
- **Page Statistiques du jeu, « Les billes qui tombent »** (calculé en
  rejouant les 4 247 parties jouées depuis une position de départ) :
  - le camp qui fait tomber la première bille gagne **65 %** des parties ;
  - la première bille tombe en médiane au **coup 26** (entre 9 et 49 dans
    8 parties sur 10), avec le détail par disposition de départ ;
  - **le tableau des remontées** : à 1-0, celui qui mène gagne 65 % ; à 3-0,
    90 % ; mené 0-2, on gagne encore 23 % du temps ;
  - **le score final** : 6-3 est le plus fréquent (22 %), 6-0 et 6-5 font
    13 % chacun ;
  - **la carte des éjections**, vue du joueur qui perd la bille : en
    Standard, 75 % des billes tombent de sa propre moitié ; toutes
    dispositions confondues, les 6 coins n'en donnent que 15 %, alors qu'ils
    font un quart des cases du bord.
- **« Ce qui fait gagner »**, juste après les 12 dimensions : au 20ᵉ, 40ᵉ et
  60ᵉ coup, les dimensions des deux camps comparées sur la même position, et
  la part des parties gagnées par celui qui mène sur chacune. Au 40ᵉ coup,
  le camp qui subit le moins de menaces gagne 69 % des parties, autant
  qu'avoir plus de billes. Présenté comme un lien constaté, pas une cause.
- **« Comment jouent les vrais joueurs »** : 25 % de coups à une bille, 33 %
  à deux en ligne, 32 % à trois en ligne, 9 % de côté ; 39 % des coups
  poussent des billes adverses, 6,8 % en font tomber une ; 33 % des
  occasions de faire tomber une bille sont saisies.
- **Mes statistiques, carte Éjections** : tes remontées (victoires après
  avoir perdu ou fait tomber la première bille), toi face aux vrais joueurs
  (éjections par partie, occasions saisies, première éjection, sortes de
  coups, phases), et où tombent tes billes, vue de ton côté. Mêmes
  définitions des deux côtés.
- **Écran de fin de partie** : une ligne tirée des vraies parties, par
  exemple « Belle remontée ! Vous étiez mené 1 à 3. Dans les vraies parties,
  le camp mené 1 à 3 ne gagne que 21 % du temps. » Jamais en mode Enfant.

### Comment c'est calculé
- `tools/stats-parties.js` rejoue chaque partie embarquée avec le vrai
  moteur (environ 5 minutes) et écrit `15-stats-parties.b64` ; la page n'a
  plus qu'à additionner. Un test rejoue un échantillon de 17 parties et
  compare au fichier, et vérifie la signature des parties ; d'autres
  vérifient chaque addition sur des parties construites à la main.

### Amélioré
- La page Statistiques du jeu s'affiche entière en moins d'une seconde dès
  la première visite : les vainqueurs MIGS viennent de ces données (vérifiés
  identiques au rejeu sur les 1 518 parties « Au score ») au lieu de plus
  d'une minute de rejeu dans le navigateur.

## [v2.62]

### Modifié — « Sur un vrai plateau » commence à 3 ans, pas avant
- **On respecte la boîte.** Abalone ne convient pas aux moins de 3 ans
  (petits éléments : les billes). La page commence donc à 3 ans, et le dit
  partout : en tête de page (« À partir de 3 ans »), dès la première phrase,
  en premier point de l'encadré sécurité, dans l'aide et la documentation.
- **Retiré** : tout ce qui visait les moins de 3 ans — les âges « dès 2 ans »
  et « 2 ans ½ », et le plateau géant au sol avec de gros objets.
- **L'étape 1** se joue maintenant sur le vrai plateau : on n'utilise d'abord
  que les 19 trous du centre (3, 4, 5, 4, 3), une bille par trou. Toutes les
  étapes ont un âge repère de 3 ans ou plus.
- **Un plus petit de moins de 3 ans à la maison** ne joue pas encore, même
  « juste pour toucher » : on joue pendant sa sieste, on recompte les 28
  billes et la boîte retourne en hauteur.

## [v2.61]

### Ajouté — « Apprendre sur un vrai plateau », pour les tout-petits
- **Une nouvelle page** (menu ☰ → Progresser → **Sur un vrai plateau**) pour
  apprendre Abalone à de très jeunes enfants, dès 2 ans, sur un vrai plateau
  et loin des écrans. Le but n'est pas une vraie partie tout de suite (la
  boîte indique 6 ou 7 ans), mais qu'ils aiment le plateau, les billes et ce
  moment avec un parent.
- **La sécurité d'abord.** La boîte prévient que le jeu ne convient pas aux
  moins de 3 ans (petits éléments). Avant 3 ans : pas de vraies billes, un
  plateau géant au sol (19 cases en 3-4-5-4-3) avec de gros objets qui ne
  passent pas dans un rouleau de papier toilette ; dès 3 ans, un adulte à côté
  et les 28 billes comptées à la sortie et au rangement. Sources citées sur la
  page (fiche du jeu, Santé Canada, INSPQ et Société canadienne de pédiatrie,
  CPSC).
- **Neuf règles d'or** pour qu'ils ne soient ni blessés par la défaite ni
  dégoûtés du jeu : séances courtes et joyeuses, l'enfant choisit, il gagne
  souvent puis joue avec un handicap pour vous, on félicite ce qu'il a fait,
  le parent montre comment perdre, une bille poussée « va à la piscine »
  (jamais « tuée »), frère et sœur dans la même équipe, sans comparaison…
- **Une séance type de 5 à 10 minutes** et **8 étapes**, chacune un petit jeu
  avec son âge repère, son schéma, « c'est acquis quand » et « si ça coince » :
  Une bille par maison, Un petit pas, Chacun son tour, Le petit train, Le plus
  fort pousse (le sumito : 2 contre 1, 3 contre 2… et 2 contre 2 bloque),
  Plouf !, La mini-partie (7 billes chacun, la disposition Découverte du Mode
  Enfant) et La vraie partie. Les schémas sont dessinés par la page (SVG) ;
  ceux des deux dernières étapes viennent des dispositions du moteur.
- **Et pour en faire des « machines de guerre »** : trois petites phrases qui
  préparent les futurs bons joueurs (« Je regarde avant de toucher »,
  « Ensemble, on est plus forts », « Au milieu, on ne tombe pas »).
- **Un carnet de progrès** pour 1 à 4 enfants : une étoile datée par étape
  acquise et la prochaine étape de chacun. Les prénoms et les dates restent
  sur l'appareil (localStorage), ils ne sont envoyés nulle part.
- **Une fiche à imprimer** (5 pages A4, sur fond blanc) et la page entière en
  anglais.

## [v2.60]

### Corrigé — l'IA ne fait plus d'allers-retours en début de partie
- **D'où ils venaient.** Dans les 20 premiers demi-coups, quand le livre
  d'ouvertures avait perdu la trace de la partie, l'IA jouait souvent sans
  calculer un coup « tiré de vraies parties passées par une position proche ».
  Ce repli prenait en fait la position historique la plus proche, sans aucun
  seuil : souvent une autre partie, d'une autre disposition de départ, avec le
  mauvais camp au trait, dont il rejouait un coup choisi deux demi-coups plus
  loin. D'où h9g8, g8h9, h9g8… — et à tous les niveaux, car ce repli passait
  avant le calcul.
- **Mesuré avant correction.** Dans le navigateur, niveaux 1 à 5, disposition
  standard et marguerite belge : 99 des 146 premiers coups de l'IA venaient de
  ce repli, avec 25 allers-retours (5 à chaque niveau en disposition standard).
  Sur 24 parties simulées au niveau 3 : 136 coups sur 264, dont 16
  allers-retours, en moyenne 313 points moins bons que le coup calculé et
  jusqu'à 2 112 (plus d'une bille).
- **Maintenant**, ce repli ne joue que depuis exactement la même position
  qu'une partie réelle (atteinte dans un autre ordre), vérifiée en rejouant
  cette partie ; sinon l'IA calcule. Aucun coup joué sans calcul (livres
  d'ouvertures, ce repli, niveau 1) ne ramène une position déjà vue ni ne
  défait le coup précédent du même camp.
- **Le calcul aussi pouvait osciller** : dans une partie simulée, f4f5 puis
  f7f6, quatre fois de suite — la position complète ne se répétait pas, car
  l'adversaire avançait ailleurs. Un coup qui remet ses billes exactement comme
  avant son coup précédent coûte maintenant 140 points, 560 la deuxième fois de
  suite, 1 260 ensuite : jamais le prix d'une bille, donc l'IA recule toujours
  devant un vrai danger.
- **Résultat.** Dans le navigateur, mêmes parties : 0 aller-retour sur 144
  coups, 5 coups seulement tirés de parties réelles (passées exactement par la
  même position). Sur les parties simulées : 0 aller-retour.

### Corrigé — un coup parfois très mauvais quand le temps de réflexion s'arrête
- Quand le temps de réflexion s'arrêtait au milieu d'une profondeur, l'IA
  jouait le meilleur des seuls coups déjà examinés à cette profondeur — souvent
  le premier de la liste — même s'il était bien pire que le meilleur coup de la
  profondeur précédente. Mesuré sur 132 recherches coupées (positions de vraies
  parties, coupure toujours au même endroit) : 61 rendaient un coup pire que
  celui-là, jusqu'à 2 010 points (une bille). Le meilleur coup de la profondeur
  précédente est maintenant examiné en premier : aucune n'est pire. Cela
  concerne les niveaux 2 à 9, surtout sur un appareil lent.

### Tests
- 6 nouveaux tests : ce que décrit un enregistrement d'empreinte ; le repli ne
  joue que des coups réellement joués depuis la même position, et rien hors des
  parties réelles (la position qui donnait g8h9 juste après h9g8) ; aucun coup
  joué sans calcul ne revient en arrière ; le coût d'un aller-retour (140, 560,
  1 260) ; une recherche coupée par le temps n'est jamais pire que la
  profondeur précédente.

## [v2.59]

### Ajouté — comprendre les 12 dimensions, page Statistiques du jeu
- **Comment lire le tableau** : une explication des centiles, avec un dessin.
  Chaque dimension est mesurée dans chaque position des vraies parties ; on range
  ces positions de la plus petite valeur à la plus grande, et chaque barre du
  dessin en représente 1 %. Le 10ᵉ centile, la médiane et le 90ᵉ centile y sont
  marqués, avec entre les deux la zone normale (80 % des positions).
- **Trois graphiques** pour la dimension choisie : les deux camps ensemble, les
  Noirs, les Blancs (une position compte pour le camp qui vient de jouer).
  Cliquer sur une ligne du tableau change de dimension ; le tableau s'affiche
  pour les deux camps, les Noirs ou les Blancs.
- **Situer une valeur** : un curseur place une valeur dans les trois graphiques
  et dit au-dessus de quelle part des positions elle se trouve (« au-dessus de
  93 % des positions : parmi les 10 % les plus marquées »).
- **Accordé au nombre de parties** : les 93 parties du tournoi PlayStrategy et
  les 7 parties de référence n'avaient pas encore leurs mesures, si bien que les
  12 dimensions portaient sur 4 479 parties quand la page en annonce 4 579. Elles
  les ont maintenant : 427 156 positions de 4 576 parties (les 3 parties
  abandonnées avant le premier coup n'en ont aucune). Tout est calculé à partir
  des parties chargées : si des parties s'ajoutent sans leurs mesures, la carte
  dit combien manquent, et un test le refuse.
- Sur téléphone, le dessin a sa propre mise en page, lisible.

### Corrigé
- **Page Statistiques du jeu** : elle bloquait le navigateur environ 5 secondes à
  chaque ouverture (calcul des 12 dimensions et de leurs corrélations, mesuré à
  2,7 s + 2,4 s). Maintenant 0,25 s la première fois, puis instantané ; et la
  carte des 12 dimensions s'affiche sans attendre le reste de la page, dont le
  premier calcul prend plus d'une minute.
- « Jusqu'à 0,93 » (le lien entre cohésion, soutien et billes sans soutien)
  était écrit à la main : il est maintenant mesuré.

### Tests
- 5 nouveaux tests : chaque partie PlayStrategy et de référence a ses mesures, à
  jour ; elles suivent la même convention que la banque ; les centiles sur toutes
  les parties et par camp ; la carte (explication, graphiques, curseur, tableau
  par camp) ; les parties sans mesures sont signalées.

## [v2.58]

### Ajouté — Liste et Commentaires de la partie, comme dans Uncle Lolo's Abalone
- **📋 Liste** : un onglet à côté de « Partie ». Les coups en tableau
  Coup | Noir | Blanc, en notation Aba-Pro, avec le score après chaque éjection
  « (2-1) » (Noirs-Blancs), comme la Liste d'ULA. Toucher un coup montre la
  position ; ⏮ ◀ ▶ ⏭ pour naviguer, « ↩ Partie en cours » pour revenir ;
  « Copier » donne le tableau (pour un tableur ou un message).
- **📝 Commentaires** : un bloc par coup, comme le journal d'ULA. Pour chaque coup
  de l'IA : sa suite prévue (la réponse qu'elle attend, puis les coups
  suivants), son évaluation, la profondeur, les positions examinées et le
  temps ; ou d'où vient le coup quand il n'est pas calculé (livre d'ouvertures,
  vraies parties, table de finale). Pour chaque position, les deux camps : distance
  au centre, cohésion, billes au bord, billes en danger. Sumitos, éjections
  (avec le score) et positions répétées sont signalés. « Copier » donne tout le
  journal en texte, numéroté 1x, 1y… comme dans ULA.
- **Importer une partie (Aba-Pro)** accepte la Liste et le journal de
  commentaires d'ULA collés tels quels (majuscules, numéros de coup, scores
  « (1-1) », coups repris). La partie d'ULA envoyée par ocj94 (Marguerite
  belge, 217 coups) se rejoue en entier : éjections aux mêmes coups, 6-2.

### Corrigé
- **Annuler** : le coup annulé restait dans la liste des coups, les exports et la
  partie enregistrée (dans un puzzle, le mauvais coup restait avant le bon).
- **Rejeu** : « Position de départ » montrait celle d'une partie importée
  auparavant (la règle des trois répétitions la prenait aussi pour départ), ou la
  disposition standard pour une partie lancée depuis l'éditeur ; les billes déjà
  éjectées au départ d'un puzzle n'étaient pas comptées.
- **Téléphone** : sous le plateau, « Cliquez sur vos billes… » recouvrait la
  ligne « Projeter ».

### Tests
- 5 nouveaux tests : import de la Liste et du journal d'ULA, la partie d'ULA
  rejouée en entier avec les mêmes scores, les mesures de position, les
  commentaires de l'IA, l'annulation.

## [v2.57]

### Ajouté — le Défi du jour #N
- **Un puzzle par jour, le même pour tout le monde** : chaque jour a son numéro
  (#1 = 14 octobre 2026) et un puzzle tiré de vraies parties, sans compte ni
  serveur. Il se joue sur le plateau de la partie ; l'accueil, la page Problèmes
  et le badge du haut y mènent, et un lien `?defi=12` ouvre le défi n° 12.
- **Un résultat à partager sans rien dévoiler** : une grille (🟥 mauvais coup,
  🟨 indice, 🟩 trouvé, ⬛ solution affichée), le temps passé devant le puzzle,
  la série de jours et le lien. Sur téléphone, le partage du téléphone ; ailleurs,
  le presse-papier. Un compte à rebours annonce le prochain défi.
- **Des images à partager** : en fin de partie (nouveau bouton 🖼️ Image : le
  résultat, le score et le plateau final) et pour le défi du jour (la grille,
  jamais la position).
- Il remplace trois « défis du jour » qui coexistaient, dont un faux : un numéro
  de puzzle inventé, « relevé » d'un clic contre 50 XP sans rien jouer.

### Corrigé — ce qui ne marchait pas
- **Paramètres** : seul « Profil général » s'affichait ; les autres onglets
  (Accessibilité, Autorisations, Notifications, Sécurité, Mot de passe)
  tournaient en boucle jusqu'à l'erreur. Des balises mal fermées faisaient aussi
  déborder des morceaux de page (les filtres des Variantes apparaissaient dans le
  Musée, l'Espace rédacteur sous les Paramètres).
- **Problème du mois** : « Jouer » posait le puzzle sur le plateau de la partie
  en restant sur la page Problèmes, sans plateau. Il s'ouvre maintenant sur le
  plateau, sans effacer la partie sauvegardée, sans pluie de billes, et sans le
  « Partie annulée — aucun coup joué » qui renvoyait à l'accueil après une
  minute de réflexion.
- **Puzzles** : après un puzzle, une nouvelle partie restait en mode puzzle :
  chaque coup était comparé à la solution, puis annulé.
- **Partager** : le message disait toujours « Je viens de gagner », même après
  une défaite. Il suit maintenant la vraie fin de partie (victoire, défaite,
  nulle, partie à deux) avec le score, l'adversaire et le nombre de coups. Les
  boutons Discord, YouTube et Twitch, vers des pages qui n'existent pas, sont
  retirés.
- **Profils** : n'importe quel mot de passe ouvrait n'importe quel profil ; il
  est maintenant vérifié (empreinte PBKDF2, gardée dans le navigateur). Retirés :
  les boutons Google et Discord qui n'affichaient qu'une bulle, « Email de
  réinitialisation envoyé » (aucun e-mail ne part), « visible par les autres
  joueurs », et le compte « fightclub » qui connectait, sans mot de passe, sous
  le nom d'une vraie personne avec des statistiques inventées — ainsi que
  l'« Espace rédacteur » qu'il ouvrait, dont les articles « publiés » ne
  quittaient pas le navigateur. Les fenêtres disent ce qu'est un profil : local,
  sur cet appareil ; l'e-mail devient facultatif.
- **Page Profil** : sans profil, on voyait sous « Connexion requise » une
  « Série de 18 jours », une courbe ELO « 1388 → 1489 » dessinée à la main et
  les parties d'abal.online d'ocj94 — montrées aussi à chaque profil comme les
  siennes. Rang mondial sans classement, succès débloqués d'office, compteurs
  jamais mis à jour : tout vient maintenant de la progression de l'appareil
  (parties, série, ELO, dernières parties).
- **Parrainage** : « 100 XP par ami » ne pouvait pas marcher sans serveur. L'ami
  invité garde son bonus de bienvenue ; la fenêtre dit pourquoi il n'y en a pas
  pour vous.
- **Bas de page** : « 🔥 18 » et « ⚡ 14 928 », restes d'une ancienne barre de
  téléphone, s'affichaient en bas de chaque page.

### Tests
- 9 nouveaux tests : onglets des Paramètres, balises de chaque page, profil,
  message de partage, mots de passe des profils, parrainage, et le défi du jour
  (un numéro par jour, tirage, puzzles figés, grille et texte sans la solution).

## [v2.56]

### Ajouté — le site en anglais
- **Langue** : le menu de langue est de retour en haut de l'écran. L'anglais est
  traduit par le site lui-même (plus de 700 textes) : en-tête, menus, accueil,
  configuration, partie, fins de partie, règles essentielles, tutoriel, aide
  (11 rubriques réécrites), problèmes (les 18 de la série et les 138 de vraies
  parties), partie en direct, Duel et Gym Cerveau (accueil des exercices).
  Les pages plus techniques (Labo IA, bibliothèque, Academy, chapitres de
  stratégie…) restent en français et le disent. Les autres langues passent,
  comme avant, par la traduction du navigateur.
- **Lien direct** : `?lang=en` (ou `?lang=fr`) ouvre le site dans cette langue
  et s'en souvient. Sans lien ni choix, le site reste en français ; un bandeau,
  en anglais, propose l'anglais aux navigateurs étrangers.
- **Pas de clignotement** : en anglais, la page s'affiche directement en
  anglais. Mesuré sur un téléphone moyen simulé : le français restait visible
  jusqu'à 1,7 s avant ; plus du tout maintenant.
- **Accueil** : « Gratuit pour toujours. Sans pub, sans compte obligatoire,
  sans mesure d'audience. Code ouvert (GPL). »

### Corrigé
- **Problèmes** : deux des 18 problèmes plaçaient une bille hors du plateau
  (« Sumito 3v2 bas », « Riposte au sumito ») ; la solution nommait parfois la
  mauvaise bille éjectée (la dernière blanche de la liste, pas celle poussée
  dehors) ; les énoncés utilisaient des coordonnées internes (« en 3,7 ») au
  lieu de la notation du plateau (f9). Un test vérifie désormais chaque problème.
- **Règles** : « vendu à plus de 5 millions d'exemplaires… Prix du Jouet
  Éducatif » remplacé par des faits sourcés (plus de 4,5 millions
  d'exemplaires, plus de trente pays en 2011, l'un des premiers prix Mensa
  Select en 1990) ; la disposition standard n'est pas « dite Belgique » et
  compte 5 + 6 + 3 billes par camp.
- **Partie** : la carte du joueur affichait « Vous (ocj94) » pour tout le
  monde et « Vos billes : Noires » même avec les Blancs.
- **Niveau** : un nouveau joueur voyait « -50 / 102 XP » ; le niveau 1
  commence maintenant à 0.
- **Menus** : le menu de langue et le menu Aide ne débordent plus de l'écran
  du téléphone.

## [v2.55]

### Corrigé — rien d'inventé sur le site
- **Accueil** : les chiffres « 48K joueurs actifs · 2.3M parties · 79K sur BGA ·
  127 pays », non datés, sans source précise et lisibles comme ceux du site,
  sont remplacés par des chiffres vérifiables : 4 579 vraies parties, 138
  puzzles tirés de vraies parties, 100 % hors ligne, 0 compte, pub ou mesure
  d'audience. Un test les compare au corpus et à la liste des puzzles.
- **Ouvertures** : la page annonçait « 16 819 parties de tournoi ». C'est un
  cumul sur les 90 positions de l'arbre (une partie en traverse plusieurs) :
  l'arbre vient de **2 126 parties** de Marguerite belge. La page le dit, et
  explique que les positions y sont regroupées par les billes du camp au trait.
- **Démonstrations Amis, Comparer et chat général** : elles utilisaient de
  vrais pseudos de la communauté (dont celui d'un joueur du corpus) avec un
  ELO, des parties et des « vu il y a 2 h » inventés, ou leur prêtaient des
  messages. Noms désormais clairement fictifs, « (démo) » / « (exemple) ».
- **Numéro de téléphone retiré** : le code contenait le numéro personnel d'un
  membre de la communauté dans la fiche d'un compte prédéfini, avec une
  adresse e-mail inventée. Les deux sont retirés.
- **Chat de partie** : il s'ouvrait sur une conversation écrite d'avance, dont
  un « Vous : Merci, à toi aussi ! » jamais tapé. Il s'ouvre sur l'aide /bot.
- **Actualités** : trois titres et dates inventés (« MSO 2026 — Résultats
  Ronde 1 : SumitoPro et MarbleKing en tête · il y a 1 semaine ») attribués au
  blog Abalone Online, remplacés par des liens vers les vraies sources et vers
  le journal des versions. Les dates figées « il y a 3 jours » de l'espace
  rédacteur sont retirées.
- **Classement** : plus de tableau vide avec des filtres Blitz / régions /
  semaine — qui, avec des données, auraient fabriqué un ELO blitz et des
  victoires du mois. La page dit honnêtement qu'il n'y a pas encore de
  classement entre joueurs, et propose le jeu en direct, le tournoi, les stats.
- README : 4 579 parties, et la description du Labo v4.
- 5 tests.

## [v2.54]

### Modifié
- **Labo : des verdicts fiables.** Chaque ouverture tirée au sort est jouée
  **deux fois, couleurs inversées**, et le verdict compte des **paires**
  (0, ½, 1, 1½ ou 2 points) : l'avantage qu'une ouverture donne à une couleur
  s'annule dans la paire. Le SPRT devient « pentanomial », la méthode de
  Fishtest (le banc d'essai de Stockfish), avec un a priori de Jeffreys
  (½ paire fictive par case). Avant, le verdict comptait les parties une par
  une, tombait sur 8 victoires de suite (variance mesurée nulle) et s'arrêtait
  à 60 parties. En simulation, au taux de nulles mesuré en confirmation
  (≈ 30 %) : avant, 96 % des tests d'un mutant sans effet finissaient
  « indécis », et un mutant nettement meilleur (+70 Elo) n'était adopté que
  14 fois sur 100. Maintenant : +70 Elo adopté plus de 99 fois sur 100 (en
  ≈ 140 parties), +35 Elo 68 fois sur 100, un mutant sans effet adopté à tort
  ≈ 4 fois sur 100 (seuil choisi : 5 %).
- **Labo : les parties trop longues sont arbitrées par consensus** — la
  victoire n'est donnée que si les deux évaluations sont d'accord. Avant,
  seule celle du mutant tranchait : il arbitrait ses propres parties. Sur
  40 vraies parties mesurées avec de petites mutations, les deux règles
  donnaient le même résultat ; l'écart peut venir des grosses valeurs, comme
  celles des critères de KAAH, que le Labo règle désormais.
- **Labo, SPSA : vérifié avant adoption.** Avant, les poids de l'IA
  changeaient toutes les 2 parties sans aucune vérification. Maintenant θ est
  confronté au champion (SPRT par paires) toutes les 50 itérations, et l'IA ne
  l'utilise qu'après adoption.
- **Labo : gain réel mesuré** après chaque adoption — le champion contre les
  poids d'origine, 25 paires, avec sa marge à 95 %, et une courbe. Il remplace
  l'« Élo cumulé », qui additionnait les estimations les plus chanceuses
  (gardé une fois pour mémoire), et un bouton « Mesurer maintenant ».
- **Labo : pas de confirmation inutile** — si aucun mutant n'atteint 50 % au
  tri, on passe directement à la génération suivante au lieu de lancer un test
  de plusieurs heures.

### Ajouté
- **Labo plus rapide : plusieurs parties en même temps**, une par fil de
  calcul (la moitié des cœurs, 4 au plus, réglable de 1 à 8) — il reste de la
  place pour jouer pendant. Débit affiché (parties par heure). Une partie
  bloquée remplace son fil et se rejoue ; trois de suite mettent en pause.
- **Le Labo règle aussi les critères de KAAH** (sumito, menace, fourchette,
  piège, compacité, cases, gain et perte selon le score) : des mutants les
  allument à la valeur de KAAH puis les ajustent, SPSA les règle avec les
  autres poids. Case « Régler aussi les critères de KAAH » dans les réglages.
  Un critère adopté est utilisé par l'IA et apparaît dans le tableau
  « Réflexion de l'IA ».
- **Test des critères de KAAH** : mêmes paires, même verdict, plusieurs
  parties à la fois.

### Corrigé
- **« ▶ revoir » une partie du Labo montrait une autre partie** : le rejeu
  tirait l'ouverture une deuxième fois puis rejouait les coups enregistrés,
  ouverture comprise (position fausse dès le 7e coup, captures différentes).
  Il rejoue maintenant depuis la position de départ.
- Une partie dont aucune des 10 ouvertures tirées n'était équilibrée partait
  d'une ouverture non enregistrée.
- Les réglages « Ouverture : demi-coups » et « fenêtre d'équilibre »
  s'affichaient mais n'étaient jamais transmis au moteur (6 et 600 en dur).
- Décocher « Utiliser les poids adoptés » ou réinitialiser le Labo laissait
  en place d'éventuels critères de KAAH adoptés.
- Les réglages avancés ne se redessinent plus pendant qu'on y tape une valeur.

## [v2.53]

### Modifié
- **Duel Cerveau : une seule barre, face à face, comme un sumito** (à la
  Brain Wars / match TikTok). Ta couleur de thème pousse depuis la gauche,
  celle de l'adversaire depuis la droite ; la ligne de front suit le rapport
  des points et glisse avec un rebond à chaque réponse. **Au front, des
  billes** de chaque couleur : 1 contre 1 à égalité, 2 contre 1 puis 3 contre
  1 pour celui qui mène. Scores, ★ des manches gagnées et pastille verte ✓
  « a déjà répondu » au-dessus, de chaque côté. 1 test réécrit.

## [v2.52]

### Ajouté
- **Duel Cerveau : barres de progression des deux joueurs**, juste au-dessus
  de l'exercice, chacune **de la couleur du thème de plateau de son joueur**
  (la couleur part avec le défi et l'acceptation). Elles montent dès qu'une
  réponse arrive : si ton adversaire a répondu avant toi, sa barre grimpe et
  « ⚡ a déjà répondu ! » clignote dans la sienne, pour la pression. Points
  cumulés et ★ par manche gagnée. Couleur reçue vérifiée (format #rrggbb
  seulement). 1 test.

## [v2.51]

### Ajouté
- **⚔️ Duel Cerveau : des exercices de vitesse contre un ami, en direct**
  (sur le modèle de Brain Wars). Page Gym Cerveau → *Se connecter à un ami*
  (même code à échanger une fois que pour jouer en direct, sans compte ni
  serveur de jeu) → *Lancer un duel*. 3 manches tirées parmi 5 exercices
  (Acuité, Réflexe, Mat, Mémoire, Anticipation), au niveau de celui qui défie.
  Une graine commune remplace le hasard : les deux joueurs voient exactement
  la même position. Chaque manche : le meilleur score gagne, à égalité le plus
  rapide ; chacun mesure son propre temps, le délai du réseau ne compte pas.
  Tableau des manches, revanche, bilan victoires/défaites sur l'appareil ;
  défi refusé, adversaire occupé et connexion perdue sont gérés. 3 tests.

## [v2.50]

### Ajouté
- **Une section Aide qui explique comment utiliser le site** : menu ☰ →
  Progresser → **❓ Aide**, ou menu « Aide » du haut → « 📖 Comment utiliser
  le site ». 11 rubriques (jouer, pendant et après la partie, réflexion de l'IA,
  historique et sauvegarde, jouer à deux, progresser, explorer, installer et
  hors ligne, notations, réglages), recherche sans accents, hors ligne. Chaque
  libellé cité est repris du site ; un test vérifie que les 50 boutons et menus
  mentionnés existent vraiment.
- **Corpus** : 5e partie KAAH vérifiée par trois sources (08/10/2026, Blancs
  6 à 2) ; 4 579 parties.

### Corrigé
- **La « double authentification » était factice** : dans les Paramètres, ses
  quatre méthodes (e-mail, SMS, application, YubiKey) ne faisaient que changer
  une étiquette, et rapportaient pourtant 40 points au score de sécurité ; la
  fenêtre de connexion affichait un cadenas « activée ». Sans serveur, aucun
  code ne pouvait être envoyé ni vérifié. Tout est retiré : l'onglet s'appelle
  désormais « Sécurité » et explique pourquoi il n'y a pas de double
  authentification ; le score ne compte plus que ce qui existe vraiment.

## [v2.49]

### Ajouté
- **Table de finale 4 contre 2, résolue et prouvée** (mode Découverte) : avec
  le trait, le camp fort gagne **toujours**, en 97 demi-coups au plus ; le camp
  faible ne s'en sort que dans 0,2 % des cas. Chacune des 140 575 680 positions
  recontrôlée contre les équations exactes. Dans le jeu : IA parfaite, verdict
  « les Noirs gagnent en N demi-coups », page Tables de finale, Trainer.
- **Réflexion de l'IA**, comme dans KAAH : pour chaque profondeur, les 10
  meilleurs premiers coups avec évaluation, temps, « sous lui », positions,
  écart de chaque critère et suite prévue (vérifiée légale coup par coup), sur
  un petit plateau. Dans un panneau de la partie et pour chaque coup de l'IA.
- **Les critères d'évaluation de KAAH dans le moteur** (sc. Gain, sc. Perte,
  Cases, Compac., Sumito, Menace, Fourch., Piège), réimplémentés d'après leurs
  définitions, **éteints par défaut** ; style « KAAH (expérimental) » ; test au
  Labo (duels appariés, verdict SPRT, rien d'adopté automatiquement).
- **Réflexion max réglable** par niveau (vide = sans limite) et
  **statistiques de réflexion** : profondeur atteinte selon le temps, mesurée
  sur des positions du corpus et relevée pendant tes parties.
- **Code de la position** (format KAAH), copiable ; **évaluation** sous chaque
  coup de l'IA, gardée dans l'historique ; **permutations** (12 symétries et
  camps échangés, numérotation de KAAH, forme canonique).
- **Pendules complètes** : Chrono, Délai, bonus par éjection, cadence
  personnalisée, durée de chaque coup.
- **Nulle** : vraie proposition (IA, même écran, à distance) et triple
  répétition.
- **Niveaux de l'IA numérotés de 1 à 10**, dont 4 intermédiaires.
- **Partager un fichier de parties vers Abalassembly** (Android : menu
  Partager ; ordinateur : Ouvrir avec) : l'import s'ouvre prérempli.
- **Corpus** : 4 parties KAAH vérifiées par trois sources (4 578 parties) ; la
  carte de chaleur se nourrit des parties importées.

### Modifié
- **Intro** : l'emblème (hexagone et bille) prolonge l'écran de démarrage,
  tourne et disparaît, puis ABALASSEMBLY, puis le sous-titre.
- **Icône** : l'hexagone actuel avec la bille d'origine, variante masquable.
- **Dernier coup** : chevrons sur les billes déplacées.
- Thème sombre déclaré au navigateur (couleurs altérées sur Samsung Internet).

### Corrigé
- **Une victoire avec les Blancs comptait comme une défaite** (écran, ELO, XP,
  série).
- **Le bouton « Proposer nulle » ne faisait rien.**
- **Le service worker n'avait jamais fonctionné** (créé d'une façon que les
  navigateurs refusent) : remplacé par un vrai `sw.js`, le hors-ligne est réel.
- **Académie** : les 10 Commandements affichaient du code brut.

## [v2.48]

### Ajouté
- **Suivre une partie PlayStrategy en direct**, en lecture seule, par son
  lien ou simplement par le pseudo d'un joueur. Chaque coup arrive comme une
  position complète : aucune notation à interpréter. Sans partie en cours,
  PlayStrategy renvoie la dernière partie jouée : elle est reconnue et jamais
  présentée comme du direct.
- **La fenêtre PlayStrategy s'enrichit** : tournois Abalone en cours et à
  venir, équipes Abalone, directs Twitch/YouTube (seulement quand il y en a),
  et import d'un tournoi entier en collant son lien (arena ou suisse) — le
  *Grand Abalone*, au plateau incompatible, est écarté d'office. Les 82 routes
  de l'API PlayStrategy ont été passées en revue dans leur code source ;
  l'ouverture aux requêtes d'autres sites (CORS) y est confirmée pour tout
  `/api/`, pas encore vérifiée en production. Écartés, preuve dans leur code :
  problèmes (échecs seulement), cache d'analyse (le moteur Abalone n'est
  jamais analysé), retransmissions (échecs seulement). Tout texte venant de
  PlayStrategy est échappé avant affichage.
- **Deux variantes, vérifiées en rejouant intégralement une vraie partie**
  depuis la position lue sur l'image : **Pyramide** (83 demi-coups) et la
  **Marguerite française** (partie MiGs 31299, 31 demi-coups). Les
  affirmations des articles — symétries, sumitos de départ, contrôle du
  centre — sont vérifiées par calcul, pas recopiées.
- **Parties de référence des variantes** : une petite banque à part, ni MIGS
  ni AbalOnline, pour ne pas mentir sur la provenance, avec la source de
  chaque partie. Elles s'ouvrent depuis la bibliothèque et comptent dans le
  corpus.
- **Galerie des variantes refaite** : toucher une fiche ouvre ses explications
  juste en dessous, avec le plateau de départ et un bouton « ▶ Jouer cette
  variante » qui ouvre la configuration avec la variante déjà choisie. Dix
  fiches ajoutées : les 23 dispositions jouables ont toutes la leur (33 fiches
  en tout). Leurs textes reposent sur des mesures — parties, victoires, durée
  médiane dans le corpus, symétries calculées — et aucune difficulté n'est
  inventée : faute de donnée, elle est « Non évaluée ».
- **Stats du corpus** : le tournoi *Yearly Abalone Arena* y compte, toutes
  parties comprises, même abandonnées (93), ainsi que les parties de
  référence — 4 574 parties au total. Le titre de la page et l'en-tête de la
  bibliothèque sont désormais calculés au lieu d'être écrits en dur.
- **Découverte** (7 billes par camp, le plateau du mode Enfant) dans le menu
  « Jouer », toujours exclue du tirage aléatoire.
- 78 tests unitaires (41 en v2.47).

### Corrigé
- La fiche de la Marguerite française la disait « la seule variante
  déséquilibrée du jeu ». C'était faux : **Domination** n'a pas non plus de
  symétrie qui échange les camps — et ce n'est pas à lui seul un
  déséquilibre, ses 33 parties réelles se partagent 16 à 17. Le message du
  commit `b1182f3c` garde l'erreur ; ce journal fait foi.
- La documentation des variantes annonçait 23 dispositions dans le menu
  « Jouer » alors qu'il en comptait 22 (Découverte manquait).

## [v2.47]

### Ajouté
- **Notifications locales** : « à vous de jouer » et fin de partie, envoyées
  uniquement si l'onglet est en arrière-plan. Le panneau de réglages
  correspondant ne sauvegardait rien et ne déclenchait jamais rien ; les
  préférences persistent désormais réellement.
- **Balayage du menu sur téléphone** : balayer vers la droite ouvre le menu,
  vers la gauche le ferme (sens inversés en arabe/hébreu). Reconnu seulement
  hors des zones qui gèrent déjà leurs propres glissements (plateau 3D,
  réalité augmentée, calibration photo, puzzles, recadrage).
- **Import de tournoi PlayStrategy corrigé et enrichi** : la notation
  PlayStrategy n'est pas celle d'Abalassembly — l'ancien import stockait les
  coups bruts en le croyant, si bien qu'aucune partie importée ne se
  rejouait au-delà du premier coup. Un convertisseur vérifié trois fois par
  coup (légalité, position, notation) corrige l'import. Les parties d'autres
  joueurs importées n'affectent plus les statistiques personnelles, et
  l'import respecte enfin la couleur réellement jouée par l'utilisateur.
  Le *Yearly Abalone Arena* (PlayStrategy, 90 parties) est embarqué comme
  premier jeu de données vérifié par cette voie.
- **Tests unitaires du moteur** (`node --test`) : 41 tests couvrant les
  règles, les deux camps, la détection de plateau et l'import de parties,
  exécutés à chaque poussée par la CI — qui ne vérifiait jusqu'ici que des
  contrôles d'intégrité (syntaxe, données embarquées, preuve des puzzles).
- Sécurité du CI (référentiel OpenSSF Scorecard) : permissions du jeton
  réduites au strict nécessaire, actions épinglées par empreinte de commit,
  suivi automatique des dépendances (Dependabot) sur les deux dépôts.
- `CITATION.cff`, ce journal, et un modèle de rapport de bug qui demande
  systématiquement la couleur jouée — plusieurs bugs réels de cette version
  n'apparaissaient qu'en jouant blanc.

### Corrigé
- **Billes adverses jouables pendant le tour de l'IA** : la garde qui
  empêche de toucher aux pièces de l'adversaire n'était posée que sur deux
  des cinq façons de cliquer une case (clic canevas, glisser-déposer) ; la
  navigation clavier, la vue 1D et le plateau du mode Commentateur en
  étaient dépourvus. La garde est désormais centralisée dans `handleClick`.
- **Détection de plateau par photo** : le classificateur séparait plateau et
  bille par la chaleur de teinte, qui suppose un plateau en bois — sur un
  plateau en plastique gris (le standard), une bille isolée était manquée à
  quasiment chaque photo. Remplacé par la distance de couleur au médian RGB
  de l'image, avec une séparation en deux passes pour les parties où les
  deux couleurs de bille sont présentes.
- Un nom d'événement public (`gameOver`) abîmé par une passe d'encapsulation
  précédente, qui avait remplacé le nom à l'intérieur du littéral de chaîne.
- `APGN.md` renommé en `APGN.fr.md` (convention de suffixe déjà appliquée au
  reste de la documentation) ; au passage, `README.en.md` pointait vers la
  spécification en français plutôt qu'en anglais.

## [v2.46]

### Ajouté
- **Variante Alitration** jouable, trouvée sur onlineabalone.wordpress.com.
  Position vérifiée en rejouant intégralement une partie MiGs réelle de
  122 demi-coups jusqu'à sa conclusion avant intégration.
- **Variante principale** sur le conseil de coup : la réponse probable de
  l'adversaire s'affiche, bornée honnêtement à la profondeur réellement
  cherchée.
- **`docs/Variantes`** : ce qui est jouable contre ce qui est seulement
  documenté, à travers les trois endroits du site qui en parlent.
- **`docs/Glossaire-fonctions`** : 1 236 fonctions extraites du code réel,
  classées par lettre avec leur section.
- **`tablebase/generate-3v3.js`** : outil autonome de résolution 3v3.

### Modifié
- Les 21 dispositions de départ passent en menu déroulant (étaient des
  boutons individuels) ; aperçu de la disposition agrandi.
- Encapsulation progressive de l'état global derrière une interface
  explicite : `GameMode`, `HumanColor`, `CurrentTurn`, `CapturedByBlack`,
  `CapturedByWhite`, `MoveCount`, `GameOver`. `board` a été écarté
  sciemment — voir `RECOVERY.fr.md` pour les chiffres qui motivent ce choix.
- Documentation réorganisée en `docs-fr/` et `docs-en/`, suffixes explicites.

### Corrigé
- **Vue 1D** : se retourne correctement quand l'humain joue blanc. La
  disposition standard place noir en bas ; l'affichage restait figé, donc
  juste pour un joueur noir et inversé pour un joueur blanc.
- **Annulation de coup impossible en blanc** : `requestUndo()` comparait à
  `'black'` en dur. Un humain tenant les blancs contre l'IA recevait
  « Seul vous pouvez demander une annulation » alors qu'il *est* le joueur.
- **Seuil d'attestation** de Formation Formateurs : les 6 séances comptent
  désormais vraiment, en plus de l'évaluation.
- Optimisation de la comparaison aux 418 595 empreintes historiques
  (accès par index plutôt que par clé texte), sans dépendance ajoutée.
- Un commentaire du code affirmait à tort que `tablebase/tb-3v2.json`
  n'existait pas. Le fichier existe bel et bien (243 Ko) : c'est la source
  que lit `tools/check-embedded.js`, et sa copie encodée en base64 dans
  `index.html` est celle utilisée à l'exécution. Le commentaire décrit
  maintenant les deux formes, et pourquoi elles coexistent.

- **Gym Cerveau, exercice « Mat au bord »** (12ᵉ exercice) : trouver
  l'éjection qui gagne immédiatement, généré par géométrie (54 directions
  sortantes × 3 formes de sumito = 162 motifs) et validé un à un par le
  moteur avant d'être proposé — aucune position écrite à la main.

## [v2.45]

- Détecteur de motif dans la courbe d'évaluation.

## [v2.44]

- Variantes Korean Daisy et Anglattack.

## [v2.43]

- Partie en direct : sous-section intégrée.

---

*Les versions antérieures à v2.43 ne sont pas reprises ici : leur détail
vit dans les Releases GitHub et l'historique des commits.*
