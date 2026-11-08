# Politique de sécurité

Abalassembly est un jeu web mono-fichier, sans backend actif et sans collecte
de données (voir le README). La surface d'attaque réelle est donc limitée,
mais si vous trouvez un problème, merci de le signaler.

## Signaler une vulnérabilité

Utilisez l'onglet **[Security → Report a vulnerability](https://github.com/ocj94/Abalassembly/security/advisories/new)**
de ce dépôt (rapport privé, visible seulement par le mainteneur jusqu'à
résolution) plutôt qu'une issue publique.

Merci d'inclure :
- Une description claire du problème
- Les étapes pour le reproduire
- L'impact potentiel

## Portée

- ✅ `index.html` (le jeu lui-même)
- ✅ Le backend associé, [`abalassembly-api`](https://github.com/ocj94/abalassembly-api) (actuellement dormant, `BACKEND.enabled = false`)
- ❌ Contenu tiers (bibliothèques chargées à la demande depuis des CDN publics : Three.js, SheetJS)

## Bibliothèques tierces (depuis la v3.16)

- **Vérifiées avant de s'exécuter.** Three.js et SheetJS sont téléchargés depuis jsDelivr ou unpkg, puis leur empreinte SHA-384 est comparée à celle du paquet npm officiel (`three@0.160.0`, `xlsx@0.18.5`). Un fichier différent est refusé. La copie locale `vendor/three.module.js` est identique, octet pour octet, au paquet npm.
- **SheetJS 0.18.5 isolé.** Cette version a deux failles connues sur des fichiers piégés : CVE-2023-30533 (pollution de prototype) et CVE-2024-22363 (expression régulière qui s'emballe). Les versions corrigées ne sont plus publiées sur npm. Le site lit donc les tableurs dans un fil de calcul jetable, qui ne renvoie que des lignes de texte et qui est arrêté au bout de 20 secondes. Aucun code de SheetJS ne s'exécute dans la page.
- **Politique de sécurité du contenu.** Les CDN ne peuvent plus servir de script directement. Ils sont seulement lus (`connect-src`), et seul le contenu vérifié s'exécute.

## Aucun code dans le HTML (depuis la v3.22)

- **`script-src` sans `'unsafe-inline'`.** La CSP nomme chacun des blocs `<script>` du fichier par son empreinte SHA-256, recalculée à chaque assemblage (`tools/build.js`). Un script glissé dans la page (par un pseudo, un fichier de partie, un message) n'a pas d'empreinte connue : le navigateur refuse de l'exécuter, même si un échappement a été oublié quelque part.
- **Plus aucun `onclick`.** Les boutons portent `data-click="nom(…)"`, du texte que le navigateur n'exécute jamais. Un seul écouteur (`src/main/00a-actions.js`) le lit, n'appelle que les fonctions de la liste des actions du site (`_ACTIONS`, relevée dans les sources par `tools/actions.js`), et n'accepte comme arguments que des valeurs simples. Un attribut piégé ne peut ni appeler autre chose, ni évaluer une expression.
- **Ni `eval` ni `new Function`** dans le code (vérifié par les tests) : pas besoin de `'unsafe-eval'`.
- Les fils de calcul (IA, Labo, réseau de calcul) restent autorisés par `worker-src 'self' blob:`. Les styles écrits dans le HTML restent permis (`style-src 'unsafe-inline'`) : un style ne peut pas exécuter de code.

## Vérifier une version

Chaque release publiée depuis la v3.16 joint ses fichiers (`index.html`, `three.module.js`) et leurs empreintes SHA-256 dans `SHA256SUMS`. Après téléchargement :

```
sha256sum -c SHA256SUMS
```
