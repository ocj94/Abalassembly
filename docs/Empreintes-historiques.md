# Empreintes historiques — ce qu'on peut en tirer

Chaque partie du corpus (MIGS + AbalOnline) est résumée, coup par coup, en une **empreinte de 12 dimensions** — cohésion, soutien, potentiel sumito, menaces subies, profondeur tactique, mobilité... 418 595 empreintes au total, une par coup joué dans une vraie partie humaine.

Trois fonctionnalités s'appuient dessus, toutes calculées à l'exécution — jamais un pourcentage ou un seuil écrit à la main.

## Rareté d'une position

Le panneau d'analyse compare ta position actuelle à ses plus proches voisines dans les 418 595 empreintes, et indique si elle est courante ou rare.

Les seuils ne sont pas arbitraires : ils viennent d'une mesure réelle sur 300 positions tirées au hasard (distance médiane au plus proche voisin ≈ 0,18, 90ᵉ centile ≈ 0,29). En dessous de 0,05, une position est dite « très courante » ; au-dessus de 0,29, « rare ».

## Courbe d'évolution d'une partie

Sur chaque position historique similaire affichée, un bouton **« 📈 courbe »** trace comment n'importe laquelle des 12 dimensions a évolué, coup par coup, tout au long de cette partie réelle précise.

Rien de nouveau n'est calculé pour ça — chaque coup d'une partie a déjà sa propre empreinte (vérifié : 86 empreintes pour la toute première partie du corpus MIGS, une par coup). La courbe se contente de filtrer et trier ce qui existe déjà.

## Ce que disent 155 533 positions réelles sur la victoire

La fonctionnalité la plus intéressante des trois. Pour chaque dimension, on compare le taux de victoire final du joueur au trait selon qu'il était dans le tiers le plus bas ou le plus haut sur cette dimension, au moment de la position :

| Dimension | Tiers bas | Tiers haut | Écart |
|---|---|---|---|
| Différentiel matériel | 39,5 % | 61,3 % | +21,8 pt |
| Menaces subies | 58,8 % | 39,3 % | −19,5 pt |
| Billes au cœur | 41,4 % | 58,7 % | +17,3 pt |
| Potentiel sumito | 43,4 % | 57,7 % | +14,3 pt |
| Billes au bord | 56,7 % | 44,1 % | −12,6 pt |
| Profondeur tactique | 45,1 % | 56,8 % | +11,7 pt |
| Cohésion moyenne | 43,0 % | 54,2 % | +11,3 pt |

Ces chiffres varient légèrement d'une exécution à l'autre (les entrées sans vainqueur connu changent selon l'état de chargement), mais l'ordre et le sens restent stables. Ce n'est pas du bruit statistique : ça confirme, avec de vraies données plutôt qu'une supposition, des principes stratégiques bien connus d'Abalone — contrôler le centre, éviter le bord, ne pas subir de menaces.

### La limite assumée

Ce calcul ne porte **que** sur les positions issues de parties AbalOnline (155 533 sur les ~156 500 empreintes AO). Les parties du corpus MIGS n'ont pas de nom de vainqueur stocké directement — seulement un type de fin de partie (« Au score », « Abandon », « Au temps »...). Plutôt que d'approximer un vainqueur pour cette moitié du corpus, la fonctionnalité s'en tient à la source où l'information est réellement fiable.

## Comment y accéder

Menu de jeu → onglet **Analyse**, pendant ou après une partie. La comparaison aux positions historiques (percentile, rareté, positions similaires, corrélations) s'affiche automatiquement dès que la bibliothèque a fini de se charger.
