🇬🇧 [English version](README.en.md)

# Parties

Des parties d'Abalone au format [APGN](../APGN.md). Chaque partie de ce dossier
a été **rejouée coup par coup contre le moteur du jeu** avant d'être écrite :
une partie qui ne rejoue pas n'est pas publiée.

## `migs-2016-2017.apgn`

2 589 parties jouées sur **MiGs**, serveur gratuit d'Abalone en ligne conçu et
administré par « Mogwai » et financé par les dons des joueurs. MiGs a
définitivement fermé le **30 mai 2017**. Il n'existe, à notre connaissance,
aucune autre source publique pour ces parties.

- Période : 2016 – 2017
- Disposition : marguerite belge, pour toutes les parties
- 140 joueurs distincts, 262 032 coups, 101 coups par partie en moyenne
- Notation : Aba-Pro
- Validation : 2 589 sur 2 589 rejouent intégralement

Ces relevés sont des suites de coups, c'est-à-dire des faits, et non des
œuvres. Ils sont republiés ici à des fins de préservation : le serveur qui les
hébergeait n'existe plus et son administrateur n'est pas joignable. Si vous
détenez des droits sur cet ensemble et souhaitez son retrait, ouvrez une issue
sur ce dépôt : il sera retiré sans discussion.

1 431 de ces parties ont un programme dans un camp (MLA, l'IA de lolo,
π #0ABA10) : ces camps portent la balise `BlackType` ou `WhiteType` `"program"`
(v2.91).

## `playstrategy-yearly-2026.apgn`

Les 93 parties du tournoi **Yearly Abalone Arena** de PlayStrategy, joué le
18 septembre 2026, publiées avec l'accord de Vincent Frochot.

- Disposition : marguerite belge (c'est « Abalone » sur PlayStrategy)
- 16 joueurs, dont un programme : le bot PST-Greedy-Tom, présent dans 73
  parties (balise `"program"`) ; 20 parties opposent deux humains
- 7 705 demi-coups, 83 par partie en moyenne ; 86 parties finies au score,
  7 par abandon, dont 3 sans un seul coup joué
- Notation : Aba-Pro. PlayStrategy écrit ses coups dans sa propre notation,
  qui n'est **pas** du Nacre : chaque coup a été converti puis vérifié
  (position identique à celle de PlayStrategy sur les 7 705 demi-coups)
- Validation : 93 sur 93 rejouent intégralement
- Résultat : celui enregistré par PlayStrategy ; la fin de partie
  (`Termination`) est lue dans le rejeu

## `playstrategy-parties.apgn`

D'autres parties jouées sur **PlayStrategy**, envoyées une par une (v3.28).
Elles sont dans le site (bibliothèque, rejouables et analysables) mais **pas
encore comptées dans les statistiques du corpus** : les banques de données
seront recalculées une seule fois, quand toutes les parties prévues seront là.

- Aujourd'hui : 11 parties amicales, 1 007 demi-coups
  - `MxbIzwOB`, `6mqKM9vY`, `RpnjUrjG` (28 mai 2025, sans pendule, 102, 87 et 186 demi-coups : gagnées 6-4, 6-5 et 6-5)
  - `FPEZWejN`, `HtlXNktv`, `5YGrgSbG` (27 mai 2025, 10+0, 113, 36 et 107 demi-coups : gagnée 6-2, abandon à 0-0, perte au temps à 3-3)
  - `RCZ6myBN` (9 août 2026, 10+0, 62 demi-coups, abandon des Noirs)
  - `Dg90Vkbh`, `gcOnhSVq` (14 août 2026, cadence « 10 d/5 », 99 et 54 demi-coups, gagnées 6-0 et 6-4)
  - `aXsgzzHx` (17 août 2026, cadence « 12 d/1 », 78 demi-coups, gagnée 6-4)
  - `HrczjlFo` (17 août 2026, cadence « 12 d/1 », 83 demi-coups, abandon des Blancs à 4-1)
- Disposition : marguerite belge (« Abalone » sur PlayStrategy)
- Notation : Aba-Pro. Chaque coup a été converti depuis la notation de
  PlayStrategy par `psConvertirSequence` (sa sémantique de rejeu), puis
  vérifié par un second décodage indépendant : mêmes coups, tous légaux,
  aucune ambiguïté
- Validation : 11 sur 11 rejouent intégralement
- Notation : première case, la bille de queue ; seconde case, une case de sa
  trajectoire (en 2026, là où arrive la dernière bille poussée ; en 2025, selon
  les coups, là où arrive la bille de tête ou simplement la case voisine). Toute
  la chaîne part dans cette direction ; `psConvertirSequence` lit toutes ces
  formes

## Non publié

Le fichier unique contient également 1 891 parties provenant d'**abal.online**,
le site de Vincent Frochot. Elles ne sont **pas** diffusées ici, faute d'accord
de sa part. Le convertisseur sait les produire — `--source ao` — mais elles ne
doivent pas être publiées avant cet accord.

## Produire les fichiers

```
node tools/to-apgn.js --source migs --out games/migs-2016-2017.apgn
node tools/to-apgn.js --source ps --out games/playstrategy-yearly-2026.apgn
node tools/to-apgn.js --source ps-autres --out games/playstrategy-parties.apgn
```

## Ajouter des parties

1. Ajouter la partie à `PS_PARTIES_A_INTEGRER` (`src/main/16-corpus-data-tools.js`),
   coups convertis par `psConvertirSequence`, puis `node tools/build.js` et
   régénérer `playstrategy-parties.apgn` avec la commande ci-dessus.
2. Quand toutes les parties sont là, les faire entrer dans le corpus : les
   ajouter aux banques (`_sbBanques`, `src/main/39-statistiques-billes.js`), puis
   recalculer `tools/stats-parties.js`, `tools/labo-positions.js`,
   `tools/empreintes-complement.js` et `tools/qualite-coups.js` (plusieurs
   heures), et mettre à jour les chiffres cités (4 580 parties…).

## Pseudos des joueurs (RGPD)

Ces parties portent le pseudo de leurs joueurs, publié au titre de l'intérêt
légitime (archives de parties jouées en public). Un joueur peut demander le
retrait du sien, sans se justifier : modèle d'issue « Retirer mon pseudo ».

Pour le retirer : ajouter le pseudo à `PSEUDOS_RETIRES` dans
`src/main/00c-pseudos-retires.js`, puis `node tools/build.js` et régénérer ces
fichiers avec les commandes ci-dessus. Le pseudo devient « Joueur retiré » sur
le site et dans les fichiers. Répondre dans le mois (RGPD, article 12).

