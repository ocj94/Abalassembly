# Échanger des parties

## Partie par code

Une partie en différé, par simple échange de texte. Vous jouez, vous copiez le code, vous l'envoyez ; votre adversaire le colle, joue, et vous renvoie le sien. **Aucun compte, aucun serveur.**

Le code porte la partie entière depuis le premier coup. Celui qui le reçoit la rejoue contre le moteur et la refuse au premier coup illégal, plutôt que de faire confiance.

Menu du jeu → **Partie par code**.

## Format APGN

L'Abalone n'avait pas d'équivalent du PGN des échecs. [`APGN.md`](../APGN.md) en propose un : en-tête de balises, coups numérotés, résultat.

Deux choix le distinguent d'un simple fichier texte :

- La balise **Notation** est obligatoire. Aba-Pro et Nacre produisent des jetons de forme identique ; les confondre corromprait la partie en silence.
- La balise **Position** joue le rôle du FEN et lève l'ambiguïté d'Aba-Pro.

**Une partie n'est valide que si elle rejoue.** Le convertisseur `tools/to-apgn.js` produit le fichier et rejette ce qui ne passe pas.

## Différence entre les deux

Le code de partie (`ABAL1`) est compact, fait pour transiter par SMS pendant une partie. L'APGN est fait pour archiver et partager une partie terminée.
