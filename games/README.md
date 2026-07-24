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

## Non publié

Le fichier unique contient également 1 891 parties provenant d'**abal.online**,
le site de Vincent Frochot. Elles ne sont **pas** diffusées ici, faute d'accord
de sa part. Le convertisseur sait les produire — `--source ao` — mais elles ne
doivent pas être publiées avant cet accord.

## Produire les fichiers

```
node tools/to-apgn.js --source migs --out games/migs-2016-2017.apgn
```
