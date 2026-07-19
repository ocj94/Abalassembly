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
