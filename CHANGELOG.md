🇬🇧 [English version](CHANGELOG.en.md)

# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Les versions correspondent à `APP_VERSION` dans `index.html` et aux
[Releases GitHub](https://github.com/ocj94/Abalassembly/releases).

Ce fichier existe parce que l'historique ne vivait que dans les Releases,
donc invisible hors ligne — ce qui contredit le principe du projet.

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
  « (1-1) », coups repris). La partie d'ULA envoyée par Olivier (Marguerite
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
- **Partie** : la carte du joueur affichait « Vous (Olivier) » pour tout le
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
