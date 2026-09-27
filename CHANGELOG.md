🇬🇧 [English version](CHANGELOG.en.md)

# Journal des modifications

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).
Les versions correspondent à `APP_VERSION` dans `index.html` et aux
[Releases GitHub](https://github.com/ocj94/Abalassembly/releases).

Ce fichier existe parce que l'historique ne vivait que dans les Releases,
donc invisible hors ligne — ce qui contredit le principe du projet.

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
