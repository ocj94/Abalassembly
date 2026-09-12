🇬🇧 [English version](RECOVERY.en.md)

# Guide de reprise

Ce document part d'une hypothèse précise : tu reprends ce projet sans
pouvoir poser de question à son créateur. Il ne remplace pas le
[wiki](docs-fr/Home.fr.md) ni [`CONTRIBUTING.md`](CONTRIBUTING.md) — il donne le
contexte que ni l'un ni l'autre ne couvre : par où commencer, ce qui est
vraiment tranché, et ce qui ne l'est pas.

## Par où commencer

1. [`README.md`](README.md) — la vue d'ensemble
2. [`docs-fr/Home.fr.md`](docs-fr/Home.fr.md) — le sommaire du wiki, toutes les pages
3. [`docs-fr/Architecture.fr.md`](docs-fr/Architecture.fr.md) — les 3 schémas (moteur, données, modes de jeu)
4. [`src/README.md`](src/README.md) — comment le code source est organisé

Tout le wiki existe en français et en anglais (lien de bascule en tête de
chaque page).

## Les principes qui ne se négocient pas

Ce ne sont pas des préférences de style. Ce sont des règles qui, si tu les
casses, changent la nature du projet :

- **Jamais de donnée inventée.** Un chiffre affiché est calculé à
  l'exécution ou sourcé, jamais estimé "à vue de nez". Une valeur qui
  manque s'affiche `—`, jamais `0` — un zéro invente une absence de la même
  façon qu'un chiffre inventé invente une présence.
- **Vérifier avant d'affirmer.** Avant de dire qu'un bug existe, qu'une
  fonctionnalité manque, ou qu'un chiffre est juste : va lire le code réel
  déployé (`raw.githubusercontent.com`, pas une copie locale qui pourrait
  dater), pas ce qu'un README ou une conversation passée en dit.
- **Un seul fichier, hors-ligne, pour le joueur.** `index.html` doit rester
  jouable sans réseau, y compris ouvert directement depuis `file://` ou une
  clé USB. `src/` existe pour le confort de développement, mais ne change
  rien à cette promesse — voir plus bas pourquoi ce n'est pas encore de
  vrais modules.
- **Documenter une limite plutôt que la taire.** Le projet a plusieurs pages
  qui disent explicitement "ceci ne marche pas encore, voici pourquoi"
  ([`docs-fr/Moteur-multi-worker.fr.md`](docs-fr/Moteur-multi-worker.fr.md),
  [`docs-fr/Calcul-distribue.fr.md`](docs-fr/Calcul-distribue.fr.md)). C'est un choix
  assumé, pas un aveu à corriger en cachant le problème.

## Comment le code est vraiment organisé

`board`, `currentTurn`, `humanColor`, `capturedByBlack` et une dizaine
d'autres variables globales portent tout l'état du jeu, lues et écrites
directement depuis des centaines d'endroits (`board` seule : plus de 600
occurrences). `src/` découpe le code en fichiers lisibles, mais reste une
**concaténation plate** — aucun `import`/`export` réel. Ce n'est pas un
chantier interrompu : de vrais modules obligeraient à retracer et corriger
chaque appelant un par un, et un seul oublié ne fait pas planter
bruyamment — il continue de lire l'ancienne variable pendant qu'une autre
partie du code écrit dans la nouvelle. Un bug de divergence silencieuse,
pas une erreur visible. Si tu veux vraiment t'y attaquer un jour, commence
par chiffrer précisément le nombre d'appelants de chaque variable avant de
toucher quoi que ce soit — ne suppose jamais que c'est plus petit que ça
n'y paraît.

**Deux copies du moteur existent, volontairement** : une pour le thread
principal, une pour le Web Worker (recherche IA sans geler l'interface).
Un script de synchronisation (voir `abalassembly-api/scripts/check-engine-sync.js`
et son équivalent conceptuel côté client) doit rester vert — une fonction
mise à jour d'un côté sans l'autre est un vrai bug déjà survenu par le
passé (« OPP_DIR »), pas une simple négligence de style.

## Ce qui reste ouvert, honnêtement

- **Classement personnel + ELO local contre l'IA** — jamais commencé.
- **`estMonTour()`/`monCamp()`** — le point de vérité unique pour "qui est
  l'humain" existe et corrige des bugs réels déjà trouvés (statut de
  partie, conseil de coup, affichage des éjections — tous inversés pour un
  joueur en blanc avant correction). Il n'a **pas** fait l'objet d'un
  balayage exhaustif de tout le fichier : d'autres endroits codant encore
  l'hypothèse "noir = moi" peuvent exister, non trouvés.
- **Comparabilité des scores entre workers** — chaque worker a sa propre
  mémoire de recherche, jamais partagée (`SharedArrayBuffer` indisponible
  sur GitHub Pages). Documenté, pas résolu.
- **Quatre chiffres de variantes différents** (13 avec livre statistique,
  18 dans la bibliothèque AbalOnline, 19 dans le corpus complet, 20 dans la
  galerie jouable) — clarifiés dans les textes affichés, jamais unifiés en
  un seul si tu veux vraiment n'en garder qu'un.
- **La suite de coups (variante principale)** — affichée pour le conseil de
  coup pendant une partie (2 demi-coups, honnêtement bornée à la profondeur
  réellement cherchée), pas pour le panneau multi-PV : étendre chaque
  candidat du panneau donnerait des suites fiables pour le premier et
  approximatives pour les autres, à cause de l'élagage alpha-bêta.
- **Découpage modulaire arrêté à six variables** — `GameMode`,
  `HumanColor`, `CurrentTurn`, `CapturedByBlack`/`CapturedByWhite`,
  `MoveCount` et `GameOver` sont encapsulées derrière une interface
  `.get()`/`.set()` (plus `.inc()`/`.dec()` pour les compteurs). **`board`
  a été écarté sciemment, pas oublié.** Les chiffres qui ont conduit à
  cette décision, pour ne pas les recalculer :
  - *Risque* : 24 portées où `board` n'est pas la globale — 15 variables
    locales (dont une par exercice du Gym, `const board = new Map()`) et
    9 paramètres de fonction (`probe(board, color)`, `fromBoard(board)`,
    `gymRenderBoard(id, board, ...)`). Soit 78 des 447 lignes concernées,
    17 % à exclure avec des frontières de portée exactes. Les six autres
    variables en avaient 0 ou 1.
  - *Nature du risque* : une frontière légèrement fausse ne casse pas la
    syntaxe (le CI ne verrait rien), elle produit du code valide mais
    faux — un exercice du Gym lisant le plateau de la partie en cours au
    lieu de sa propre grille.
  - *Bénéfice* : `board` est un objet **mutable**, contrairement aux six
    autres qui sont des scalaires. Sur ~217 sites d'accès, seules les 85
    réaffectations gagneraient un vrai point de contrôle ; les 69
    lectures par clé, 11 écritures `board[k] = v`, 3 `delete` et 49
    passages par référence contournent l'interface de toute façon
    (`Board.get()[k] = 'black'` mute sans aucun contrôle).
  - *Conclusion* : le travail le plus risqué de la série pour le gain le
    plus faible. Si quelqu'un veut quand même le faire, qu'il commence
    par cartographier les 24 portées, pas par une transformation ligne à
    ligne.

- **Abalassembly Intelligence** — un nom qui circule dans les discussions
  pour désigner une couche d'orchestration qui n'existe pas encore. Les
  capacités (moteur, historique, empreintes, profil, analyse, puzzles,
  Labo) existent déjà, chacune rebranchant ce dont elle a besoin
  directement plutôt que de passer par un point commun.

## Pièges déjà rencontrés, pour ne pas les retrouver

- **La chaîne `AI_WORKER_CODE` s'étend sur DEUX fichiers source**
  (`main/13-move-detection-motifs.js` → `main/14-engine-experimental-workers.js`).
  Elle contient le code complet du worker IA, qui s'exécute dans un thread
  séparé avec ses **propres** variables locales du même nom que les
  globales. Toute transformation automatique doit l'exclure : y injecter
  une interface du thread principal casse l'IA, et **aucun contrôle de
  syntaxe ne le voit** puisque ce code vit dans une chaîne. C'est l'audit
  des puzzles qui a attrapé le cas — pas `check-scripts`.
- **Des variables locales masquent les globales.** `renderPSGamesList()`
  déclare sa propre `const moveCount`, sans rapport avec le compteur
  global ; `board` a 15 cas de ce genre. Transformer une déclaration
  locale produit `const MoveCount.set(...)`, invalide — mais transformer
  ses *usages* produit du code valide et faux.
- **Les raccourcis d'objet ne survivent pas à une transformation
  automatique.** Dans `pushUndoState()`, `{ capturedByBlack, moveCount }`
  ne peut pas devenir `{ CapturedByBlack.get(), MoveCount.get() }` — il
  faut rendre la clé explicite, sinon l'annulation de coup casse.
- **Les commentaires de documentation se font transformer aussi.** Une
  passe a modifié deux commentaires décrivant la forme des événements
  émis (`abalassembly:movePlayed`, `gameOver`), qui affichaient ensuite
  des appels de méthode au lieu des vrais noms de propriétés. Vérifier la
  charge utile réellement émise avant de corriger ce genre de texte.
- **`console.assert` ne stoppe rien en Node.js.** Un test qui l'utilise
  peut sembler passer alors qu'il a échoué. Toujours vérifier le vrai code
  de sortie du processus.
- **`raw.githubusercontent.com` a un délai de propagation** après un
  commit (15 à 30 secondes observées). Un 404 immédiatement après un push
  n'est pas un échec — réessaie avant de conclure.
- **Un token GitHub ne doit jamais persister** au-delà de la session qui
  s'en sert — détruit immédiatement après usage, jamais commité, jamais
  laissé dans un fichier de configuration.
