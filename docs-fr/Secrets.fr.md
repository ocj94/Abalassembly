🇬🇧 [English version](../docs-en/Secrets.en.md)

# Ne pas pousser de clé

Deux filets, et pourquoi il en faut deux. Mis en place en novembre 2026 après être passé en revue avec gitleaks, semgrep et `npm audit`.

---

## La règle, d'abord

**Une clé poussée est une clé perdue.** Effacer le commit ne la dés-fuite pas : elle a existé dans un dépôt public, elle a pu être clonée, indexée, mise en cache. Le seul geste utile est de la **révoquer** et d'en créer une autre. Le nettoyage de l'historique vient après, et il ne remplace rien.

C'est pour que cette journée-là n'arrive pas que les deux filets existent.

## Filet 1 — le crochet avant-commit

Il arrête la clé **avant** qu'elle entre dans l'historique. À installer une fois, dans chaque clone :

```bash
git config core.hooksPath tools/githooks
```

Le crochet vit dans le dépôt, donc il suit les clones et les Codespaces ; la commande ci-dessus dit seulement à git d'aller le chercher là.

Il lance `tools/scan-secrets.js` sur ce qui est indexé. Ce scanner est **sans dépendance** : il tourne partout où Node tourne, y compris dans un Codespace vide, et il coûte une seconde. Il connaît les formats qui comptent ici — jeton GitHub (`ghp_`, `github_pat_`), clé AWS, clé privée, jeton Slack, clé Google, jeton Stripe, JWT — plus une règle générale : une affectation `secret = "…"` d'au moins vingt caractères et d'entropie suffisante.

Il ne sonne pas sur une ligne qui contient `exemple`, `placeholder`, `votre`, `xxxx`, `REDACTED` et compagnie, ni sur `index.html` (le site assemblé, qui répète tout le reste), ni sur les images et les archives.

Pour passer outre une fois, en connaissance de cause :

```bash
git commit --no-verify
```

## Filet 2 — l'intégration continue

Le crochet ne protège que celui qui l'a installé. Le job `secrets` de `.github/workflows/verify.yml` rattrape les autres :

1. le **même scanner maison** sur tous les fichiers suivis — s'il se casse, on l'apprend ici et pas le jour où il aurait servi ;
2. le **vrai gitleaks**, sur **tout l'historique** (`fetch-depth: 0`) puis sur les fichiers. Il connaît des centaines de formats que le scanner maison n'aura jamais.

Le binaire est épinglé **par version et par empreinte SHA-256** : une release remplacée côté GitHub ne passerait pas le contrôle. C'est la même précaution que les actions épinglées par SHA ailleurs dans le fichier.

Le job tourne en parallèle du reste, donc il n'allonge pas la vérification.

## Ce que ça ne couvre pas

- **Le navigateur du joueur.** Un site livré en un seul fichier n'a aucun secret : tout ce qui est écrit dans `index.html` est public, par construction. Ce n'est pas un défaut à corriger, c'est le modèle.
- **Les secrets qui ne ressemblent à rien.** Une chaîne quelconque qui serait en fait un mot de passe ne sera repérée par aucun des deux. D'où la règle : on ne met pas de secret dans un fichier, même pour « tester ».
- **Les dépendances.** Le site n'a pas de `package.json` du tout. Côté API, `npm audit` est le bon outil, et il annonçait zéro vulnérabilité au moment de cette page.

## L'état au 18 novembre 2026

| Contrôle | Portée | Résultat |
|---|---|---|
| gitleaks, historique | 1 744 commits | aucune fuite |
| gitleaks, fichiers | dépôt entier | aucune fuite |
| scanner maison | 1 014 fichiers suivis | aucune fuite |
| semgrep, 11 règles maison | 120 fichiers | 47 alertes, 0 confirmée après tri |
| workflows | 3 fichiers | droits déclarés, actions épinglées par SHA |

Les 47 alertes de semgrep se répartissaient ainsi : 21 `http://` qui étaient tous `xmlns="http://www.w3.org/2000/svg"` — un identifiant d'espace de noms XML, rien n'est chargé ; 18 `target="_blank"` qui portaient bien `rel="noopener"` sur la même ligne, la règle ne le voyait pas ; 5 `new Function` dans des outils qui ne tournent qu'en intégration continue et qui chargent le code du dépôt lui-même ; 3 ouvertures de fenêtre, dont deux avec une URL constante et une sur la page du site elle-même.
