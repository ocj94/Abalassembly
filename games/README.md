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

## Non publié

Le fichier unique contient également 1 891 parties provenant d'**abal.online**,
le site de Vincent Frochot. Elles ne sont **pas** diffusées ici, faute d'accord
de sa part. Le convertisseur sait les produire — `--source ao` — mais elles ne
doivent pas être publiées avant cet accord.

## Produire les fichiers

```
node tools/to-apgn.js --source migs --out games/migs-2016-2017.apgn
node tools/to-apgn.js --source ps --out games/playstrategy-yearly-2026.apgn
```
