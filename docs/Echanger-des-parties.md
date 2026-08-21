# Échanger des parties

## Partie par code

Une partie en différé, par simple échange de texte. Vous jouez, vous copiez le code, vous l'envoyez ; votre adversaire le colle, joue, et vous renvoie le sien. **Aucun compte, aucun serveur.**

Le code porte la partie entière depuis le premier coup — variante, historique des coups, et désormais l'identité des deux joueurs (`ABAL1:variante:nomNoir|nomBlanc:coups`). Celui qui le reçoit rejoue tout contre le moteur et refuse le code au premier coup illégal, plutôt que de faire confiance. Les codes générés avant cet ajout (sans nom) restent lisibles.

Un champ « Ton nom » (mémorisé d'une partie à l'autre) et un choix de couleur apparaissent dans le modal. Dès que les deux noms sont connus, ils s'affichent en tête : « ⚫ Olivier vs ⚪ Saab ».

Menu du jeu → **Partie par code**.

## Partie en direct (WebRTC) — expérimental

Même esprit que « Partie par code », mais en temps réel : les deux navigateurs se connectent directement l'un à l'autre, sans compte ni serveur de jeu. Un seul échange de code au début (offre → réponse, exactement comme pour établir une partie par code), puis chaque coup s'affiche instantanément chez l'autre — plus rien à copier-coller ensuite.

Un service externe minime reste nécessaire : un serveur STUN public et gratuit aide chaque appareil à se repérer derrière sa box internet. Aucune donnée de partie n'y transite, juste quelques informations réseau techniques.

**Étiqueté expérimental** car la connexion directe ne fonctionne pas sur tous les réseaux (pare-feux stricts, certains réseaux d'entreprise ou mobiles). En cas d'échec ou de déconnexion en cours de partie, un bouton propose de basculer directement sur « Partie par code » — la partie continue, juste en différé au lieu du temps réel.

Menu du jeu → **Partie en direct**.

## Format APGN

L'Abalone n'avait pas d'équivalent du PGN des échecs. [`APGN.md`](../APGN.md) en propose un : en-tête de balises, coups numérotés, résultat.

Deux choix le distinguent d'un simple fichier texte :

- La balise **Notation** est obligatoire. Aba-Pro et Nacre produisent des jetons de forme identique ; les confondre corromprait la partie en silence.
- La balise **Position** joue le rôle du FEN et lève l'ambiguïté d'Aba-Pro.

**Une partie n'est valide que si elle rejoue.** Le convertisseur `tools/to-apgn.js` produit le fichier et rejette ce qui ne passe pas.

## Différence entre les deux

Le code de partie (`ABAL1`) est compact, fait pour transiter par SMS pendant une partie. L'APGN est fait pour archiver et partager une partie terminée.
