# APGN — Abalone Portable Game Notation

Un format texte pour échanger des parties d'Abalone, calqué sur le PGN des
échecs. Lisible à l'œil, analysable par une machine, et **vérifiable** : chaque
partie doit pouvoir être rejouée coup par coup contre un moteur de règles.

L'Abalone n'a pas d'équivalent du PGN. Il a deux notations concurrentes —
Aba-Pro et Nacre — dont aucune n'est autosuffisante : elles décrivent un coup,
jamais la position de départ, et Aba-Pro est ambiguë hors contexte. Il n'existe
pas non plus de base publique. Ce document propose le premier.

---

## 1. Structure

Un fichier `.apgn` contient une suite de parties. Chaque partie a un **en-tête**
de balises entre crochets, une ligne vide, puis le **texte des coups**, puis une
ligne vide. Encodage UTF-8, fins de ligne `\n`.

```
[Event "MIGS 29813"]
[Date "2016.09.19"]
[Black "abbelgriebsch"]
[White "budgie"]
[Variant "belgian"]
[Result "1-0"]
[Termination "Au score"]
[Notation "Aba-Pro"]
[Plies "84"]
[Source "MIGS"]

1. i9h8 i6h6 2. i8h7 a5b5 3. h8g7 h6g5 1-0
```

## 2. Balises

Sept balises sont **obligatoires**, dans cet ordre. Une partie à laquelle il en
manque une n'est pas de l'APGN valide.

| Balise | Contenu |
|---|---|
| `Event` | Nom du tournoi, de la source ou de la rencontre. |
| `Date` | `AAAA.MM.JJ`. Un champ inconnu s'écrit `????`, jamais une date inventée. |
| `Black` | Joueur des noirs. Les noirs ouvrent toujours. |
| `White` | Joueur des blancs. |
| `Variant` | Disposition de départ (§3). |
| `Result` | `1-0` noirs gagnants, `0-1` blancs gagnants, `1/2-1/2` nulle, `*` inconnu ou partie interrompue. |
| `Notation` | `Aba-Pro` ou `Nacre`. Aucune valeur par défaut : les deux notations produisent des jetons de forme identique, et les confondre corrompt la partie en silence. |

Balises facultatives, dans cet ordre quand elles sont présentes :
`SetUp`, `Position`, `Termination`, `Plies`, `Source`, `BlackElo`, `WhiteElo`,
`TimeControl`, `Annotator`.

## 3. Variantes

`Variant` prend un des noms suivants, en minuscules :

`standard`, `belgian`, `german_daisy`, `dutch_daisy`, `swiss_daisy`,
`alien`, `alliances`, `accelium`, `atomouche`, `centrifugeuse`, `corners`,
`domination`, `duel`, `fujiyama`, `snakes_variant`, `star`, `the_clearing`,
`the_wall`, `custom`.

`custom` **exige** les balises `SetUp "1"` et `Position`, sans quoi la partie
n'est pas rejouable. Une variante nommée peut aussi porter une `Position` : en
cas de désaccord, **la `Position` fait foi**.

## 4. Position — le champ le plus important

Le PGN a le FEN. L'APGN a une chaîne de neuf rangées, de la rangée `i` (en
haut) à la rangée `a` (en bas), séparées par `/`. Dans chaque rangée, de
gauche à droite : `b` pour une bille noire, `w` pour une blanche, un chiffre
pour un nombre de cases vides consécutives. La longueur des rangées est fixée
par le plateau — 5, 6, 7, 8, 9, 8, 7, 6, 5 — et doit être respectée.

Position standard :

```
Position "ww3/www3/2www2/8/9/8/2bbb2/3bbb/3bb b"
```

Le dernier champ, séparé par une espace, est le trait : `b` ou `w`. Il est
obligatoire. Aux échecs, le trait se déduit du numéro de coup ; en Abalone,
une position d'étude peut commencer sur n'importe quel camp.

## 5. Texte des coups

Les coups sont groupés par numéro : `1. <noir> <blanc> 2. <noir> <blanc>`. Le
point suit immédiatement le chiffre. Si le premier coup enregistré est celui
des blancs, il s'écrit `1... <blanc>`.

Le texte se termine par le résultat, répété depuis l'en-tête. Un lecteur qui
constate un désaccord entre les deux doit rejeter la partie plutôt que d'en
choisir un.

Les jetons sont ceux de la notation déclarée. Les commentaires s'écrivent entre
accolades et peuvent être ignorés.

## 6. Rejouabilité — l'exigence qui fait la différence

Une partie APGN est **valide** si, en partant de sa position et en appliquant
ses coups dans l'ordre, un moteur de règles accepte chaque coup comme légal.

C'est ce qui sépare l'APGN d'un simple fichier texte. Aba-Pro est ambiguë : un
jeton peut désigner plusieurs coups légaux, et il faut la position pour
trancher. La balise `Position` supprime l'ambiguïté ; le rejeu la vérifie.

Un producteur d'APGN doit valider avant d'écrire. Un consommateur doit valider
avant d'utiliser. Une partie qui ne rejoue pas n'est pas une partie APGN
malformée : c'est une partie fausse, et elle doit être rejetée avec le numéro
du coup fautif.

## 7. Ce que ce format ne fait pas

Il ne remplace ni Aba-Pro ni Nacre : il les transporte. Il ne définit pas de
notation de coup, il déclare laquelle est employée.

Il ne porte ni horloge par coup, ni évaluation, ni variantes d'analyse. Ces
ajouts viendront si un besoin réel apparaît — pas avant.

## 8. Extension de fichier et type

`.apgn`, `text/x-abalone-pgn`.
