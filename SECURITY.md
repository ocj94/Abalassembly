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
- **Politique de sécurité du contenu.** Les CDN ne peuvent plus servir de script directement (`script-src 'self' 'unsafe-inline' blob:`). Ils sont seulement lus (`connect-src`), et seul le contenu vérifié s'exécute.

## Vérifier une version

Chaque release publiée depuis la v3.16 joint ses fichiers (`index.html`, `three.module.js`) et leurs empreintes SHA-256 dans `SHA256SUMS`. Après téléchargement :

```
sha256sum -c SHA256SUMS
```
