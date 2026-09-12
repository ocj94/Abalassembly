🇬🇧 [English version](CONTRIBUTING.en.md)

# Contribuer

Un mot honnête d'abord : ce projet est essentiellement maintenu seul, en
parallèle d'[abalassembly-api](https://github.com/ocj94/abalassembly-api),
pas par une équipe établie. Les contributions sont les bienvenues, mais
attends-toi à un rythme de revue personnel.

## Signaler une vulnérabilité

Pas ici — voir [`SECURITY.md`](SECURITY.md), qui pointe vers le formulaire
privé du dépôt plutôt qu'une issue publique.

## Avant de proposer un changement

**Les 3 contrôles que la CI impose réellement** (`.github/workflows/verify.yml`,
~30 secondes, à chaque push) :

```bash
node tools/check-scripts.js index.html      # 1/3 — syntaxe de chaque bloc <script>
node tools/check-embedded.js index.html     # 2/3 — tables embarquées conformes aux sources
node tablebase/audit-puzzles.js index.html --baseline tablebase/puzzles-baseline.json  # 3/3 — chaque puzzle a une solution démontrable
```

Une pull request qui ne passe pas ces 3 contrôles n'est pas fusionnée, quel
que soit l'aspect du reste.

**En complément, pas imposés par la CI mais utiles en local** :
`node tests/regression.js`, `node tests/nacre.js`, `node tests/gamecode.js` —
intégrité, notation, code de partie.

## Le dossier `src/` et le fichier unique

`index.html` à la racine est **généré**, pas édité à la main : voir
[`src/README.md`](src/README.md) pour la structure complète. En bref —
modifie le bon fichier dans `src/`, puis :

```bash
node tools/build.js --check   # régénère index.html et vérifie qu'il n'y a pas eu de perte
```

**Pourquoi une concaténation plate et pas de vrais modules `import`/`export`** :
le code communique entièrement par variables globales partagées
(`board`, `currentTurn`, `humanColor`, `capturedByBlack`…) — certaines
appelées plusieurs centaines de fois à travers le fichier. De vrais modules
obligeraient à retracer et corriger chaque appelant un par un ; un seul
oublié ne fait pas planter bruyamment, il continue de lire l'ancienne
référence pendant qu'une autre partie du code écrit dans la nouvelle — un
bug de divergence silencieuse, pas une erreur visible. Choix délibéré,
documenté dans `src/README.md`, pas un chantier abandonné en cours de route.

## Style et principes

- **Jamais de donnée inventée.** Un chiffre affiché doit être calculé ou
  sourcé, jamais estimé. Une valeur manquante s'affiche `—`, jamais `0`.
- **Vérifier avant d'affirmer.** Avant de dire qu'un bug existe ou qu'une
  fonctionnalité manque, va lire le code réel (`raw.githubusercontent.com`
  ou l'API authentifiée, pas une version en cache).
- **Hors-ligne d'abord.** Le jeu doit rester jouable sans réseau, y compris
  depuis `file://`. Toute fonctionnalité qui suppose une connexion doit
  avoir un repli honnête, jamais un échec silencieux.
- **Documenter les limites plutôt que les taire.** Voir
  [`docs-fr/Multi-worker`](docs-fr/Moteur-multi-worker.fr.md) ou
  [`docs-fr/Calcul-distribue`](docs-fr/Calcul-distribue.fr.md) comme exemples : un
  vrai problème non résolu, documenté honnêtement, vaut mieux qu'un silence.

## Ce qui aide vraiment

- Un correctif accompagné d'un test qui échouait avant et passe après
- Une correction d'un chiffre obsolète (variantes, puzzles, parties) trouvée
  en le recoupant contre le vrai code — pas en le recopiant d'une autre page
- Une traduction anglaise d'une page qui n'en a pas encore, dans le même
  esprit que le reste du wiki : français inchangé, lien de bascule ajouté
