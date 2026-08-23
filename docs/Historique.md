# Historique de parties

Chaque partie terminée (contre l'IA, en local, par code ou en direct) est archivée automatiquement sur cet appareil — accessible depuis le bouton **Historique** du menu latéral.

## Ce qui est enregistré

Pour chaque partie : la date, la variante jouée, le mode (contre l'IA avec son style et son niveau, ou local/par code), le résultat, le nombre de coups, et la partie complète (rejouable coup par coup).

Techniquement, chaque partie est stockée dans le même format compact que « Partie par code » — quelques centaines d'octets par partie, pas les positions complètes à chaque coup. Les 200 parties les plus récentes sont conservées ; au-delà, les plus anciennes disparaissent pour laisser la place.

## Consulter et filtrer

Le modal d'historique propose trois filtres combinables — variante, mode, résultat — plus une recherche texte libre. Chaque partie affiche un bouton **Revoir**, qui la recharge en mode relecture : navigation coup par coup, comme pour une partie de la bibliothèque.

## Revoir mes erreurs

Sur l'écran de victoire, juste après une partie, le bouton **⚠️ Revoir mes erreurs** liste directement tes 3 coups les plus coûteux (perte d'évaluation la plus forte), sans avoir à aller chercher soi-même dans l'onglet Analyse. Chaque coup listé est cliquable et saute directement à la position correspondante.

Ce n'est pas une nouvelle analyse — le bouton réutilise exactement le même moteur d'évaluation déjà utilisé par la barre d'évaluation de l'onglet Analyse, juste rendu accessible en un clic plutôt qu'à chercher manuellement coup par coup.

## Confidentialité

Tout reste sur cet appareil, dans le stockage local du navigateur — rien n'est envoyé où que ce soit. Vider le cache du navigateur efface aussi cet historique (comme le reste de la progression) ; pense à utiliser **Exporter mes données** dans les paramètres si tu veux le conserver ailleurs.
