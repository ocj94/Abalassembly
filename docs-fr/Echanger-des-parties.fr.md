🇬🇧 [English version](../docs-en/Echanger-des-parties.en.md)

# Échanger des parties

## Partie par code

Une partie en différé, par simple échange de texte. Vous jouez, vous copiez le code, vous l'envoyez ; votre adversaire le colle, joue, et vous renvoie le sien. **Aucun compte, aucun serveur.**

Le code porte la partie entière depuis le premier coup — variante, historique des coups, et désormais l'identité des deux joueurs (`ABAL1:variante:nomNoir|nomBlanc:coups`). Celui qui le reçoit rejoue tout contre le moteur et refuse le code au premier coup illégal, plutôt que de faire confiance. Les codes générés avant cet ajout (sans nom) restent lisibles.

Un champ « Ton nom » (mémorisé d'une partie à l'autre) et un choix de couleur apparaissent dans le modal. Dès que les deux noms sont connus, ils s'affichent en tête : « ⚫ ocj94 vs ⚪ Saab ».

Menu du jeu → **Partie par code**.

## Partie en direct (WebRTC) — expérimental

Même esprit que « Partie par code », mais en temps réel : les deux navigateurs se connectent directement l'un à l'autre, sans compte ni serveur de jeu. Un seul échange de code au début (offre → réponse, exactement comme pour établir une partie par code), puis chaque coup s'affiche instantanément chez l'autre — plus rien à copier-coller ensuite.

Un service externe minime reste nécessaire : un serveur STUN public et gratuit aide chaque appareil à se repérer derrière sa box internet. Aucune donnée de partie n'y transite, juste quelques informations réseau techniques.

**Étiqueté expérimental** car la connexion directe ne fonctionne pas sur tous les réseaux (pare-feux stricts, certains réseaux d'entreprise ou mobiles). En cas d'échec ou de déconnexion en cours de partie, un bouton propose de basculer directement sur « Partie par code » — la partie continue, juste en différé au lieu du temps réel.

Menu du jeu → **Partie en direct**.

## Format APGN

L'Abalone n'avait pas d'équivalent du PGN des échecs. [`APGN.md`](../APGN.fr.md) en propose un : en-tête de balises, coups numérotés, résultat.

Deux choix le distinguent d'un simple fichier texte :

- La balise **Notation** est obligatoire. Aba-Pro et Nacre produisent des jetons de forme identique ; les confondre corromprait la partie en silence.
- La balise **Position** joue le rôle du FEN et lève l'ambiguïté d'Aba-Pro.

**Une partie n'est valide que si elle rejoue.** Le convertisseur `tools/to-apgn.js` produit le fichier et rejette ce qui ne passe pas.

## Importer une notation Aba-Pro

Un troisième point d'entrée, pour les coups déjà écrits ailleurs : le menu → **Importer** ouvre une zone de texte où coller une séquence de coups en notation Aba-Pro (`e5f6 c3b2 ...`, numéros de coup optionnels), avec le choix de la variante et de qui commence.

Précision honnête : ce n'est pas un import ciblant un site en particulier. Board Game Arena, par exemple, n'expose aucun format d'export texte téléchargeable pour Abalone — sa relecture fonctionne par un rejeu de notifications internes au navigateur, rien à copier-coller. Aba-Pro reste en revanche le standard réellement documenté et utilisé par la communauté Abalone, le même que celui de « Partie par code » et de l'APGN ci-dessous.

Si le texte collé contient un coup illisible ou illégal sur le plateau choisi, l'import s'arrête proprement à ce point-là et l'indique clairement (X coups reconnus sur Y) — jamais un import silencieusement tronqué présenté comme complet.

## La notation de Saab : le code de position (KAAH, KAAWA)

Ce n'est pas une notation de coup, mais la **position entière**, « factorisée »
(l'explication de Saab, l'auteur de KAAH) : les cases de chaque camp groupées
par rangée (`a1 a2 b1 b2 b3` → `a12b123`), chaque camp précédé du nombre de
**ses** billes perdues, les deux camps séparés par `_`. La Belgian Daisy :

```
0a12b123c23g78h789i89_0a45b456c56g45h456i56
```

En mort subite (5 billes déjà perdues de chaque côté) : `5a12b123c23g78h789i89_5a45b456c56g45h456i56`.
Une position seule s'affiche sans rejouer la partie, et deux positions qui se
suivent donnent le coup, dans n'importe quelle notation.

Dans Abalassembly (v2.98) :

- **sous le plateau**, le code de la position affichée : *Copier*, et
  *Permutations*, la fenêtre de KAAH : le code y est modifiable (collez-en un
  autre pour le lire), les 12 symétries et les camps échangés, la **posRef**
  en évidence avec son **code_permut**, *Copier tout* au format de KAAH, et
  *Jouer cette position* ;
- la **posRef** est la forme sous laquelle KAAH range une position, quelle
  que soit son orientation : le camp qui a le plus de billes passe devant,
  puis, parmi les 12 symétries (et les camps échangés s'ils ont autant de
  billes), celle dont les billes sont le plus près de a1, puis a2, a3, b2…
  Le `code_permut_Ref_Orig` dit quelle symétrie y mène (0 à 11, +100 si les
  camps ont été échangés). C'est le calcul de KAAH lui-même, comparé à son
  code sur 2 885 positions sans un écart ;
- **jouer depuis un code** : menu → *Importer* (champ « Ou une position »),
  la fenêtre *Permutations*, ou l'éditeur de position (« Ou un code de
  position », et *Copier le code de position*). La partie part de cette
  position, noirs au trait. Son code de partie (`ABAL1`) porte alors sa
  position de départ à la place du nom de la disposition — `pos_` suivi du
  code — pour que l'historique et la *Partie par code* la rejouent ;
- **les fichiers de partie de KAAH et KAAWA** (`.json`) : menu → *Importer* →
  *Fichier de partie KAAH / KAAWA*, et le bouton *💾 Fichier KAAH (.json)* de
  la partie. Chaque coup y porte sa position (`pos`) : à la lecture, c'est
  elle qui désigne le coup parmi les coups légaux (le texte Nacre ne sert
  qu'en secours), en suivant la ligne réellement jouée (`is_origin`). Les
  fichiers écrits par Abalassembly ont été relus par le chargeur de KAAH
  lui-même, à l'identique ; les branches et les pendules ne sont pas écrites.

## Différence entre les deux

Le code de partie (`ABAL1`) est compact, fait pour transiter par SMS pendant une partie. L'APGN est fait pour archiver et partager une partie terminée.
