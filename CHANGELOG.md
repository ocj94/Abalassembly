🇬🇧 [English version](CHANGELOG.en.md)

# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Les versions correspondent à `APP_VERSION` dans `index.html` et aux
[Releases GitHub](https://github.com/ocj94/Abalassembly/releases).

Ce fichier existe parce que l'historique ne vivait que dans les Releases,
donc invisible hors ligne — ce qui contredit le principe du projet.

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
