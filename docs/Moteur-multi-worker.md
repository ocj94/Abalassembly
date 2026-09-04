# Moteur IA multi-worker — ce qui marche, ce qui ne marche pas encore

L'IA peut répartir son calcul sur plusieurs cœurs du processeur (jusqu'à 4), via des Web Workers. Cette page documente honnêtement une limite réelle découverte en investiguant une piste d'amélioration — pas pour alarmer, mais parce que prétendre le contraire irait contre l'esprit du projet.

## Comment ça marche aujourd'hui

Chaque worker reçoit un lot fixe de coups possibles à examiner (répartis par index sur une liste triée par `moveKey` — cases triées + direction —, `coup n° % nombre de workers`), et les explore de son côté, indépendamment des autres. À la fin, le site compare le meilleur score rapporté par chaque worker et retient le plus élevé.

**Note (corrigé depuis) :** avant le tri par `moveKey`, le partage se faisait sur l'ordre de sortie brut de `getAllMovesForColor`, qui dépend de l'ordre d'insertion des clés du plateau — `applyMove`/`undoMove` modifient cet ordre par delete puis réaffectation. Le partage cessait donc d'être une vraie partition dès la profondeur 2 : mesuré sur une Belgian Daisy réelle, 33 des 52 coups changeaient d'index après un seul aller-retour applyMove/undoMove, et avec 3 workers, 11 coups sur 52 n'étaient examinés par **aucun** worker. L'IA pouvait donc être structurellement aveugle à son meilleur coup, sans aucun signe visible. Corrigé en triant sur `moveKey` (canonique, donc stable) avant le partage — vérifié : couverture complète et sans doublon à toutes les profondeurs testées. **Ce correctif est distinct du problème décrit ci-dessous** — deux bugs différents dans la même zone de code. Celui-ci concernait la *couverture* (des coups jamais examinés) ; celui qui suit concerne la *comparabilité des scores* entre coups qui sont bien tous examinés. Le second reste entier.

## Le problème découvert

Chaque worker a sa **propre** mémoire de recherche (table de transposition, coups jugés bons récemment, historique) — jamais partagée avec les autres. Cette mémoire s'enrichit au fil de la recherche et rend les évaluations suivantes plus précises.

Concrètement : **le même coup, à la même profondeur, peut recevoir un score très différent** selon qu'il est évalué seul (mémoire vide) ou dans la continuité d'une recherche déjà riche. Vérifié directement : un coup objectivement bon (score 32 en recherche à un seul thread, dans un contexte continu) tombait à 0 quand évalué isolément, mémoire vide — un écart de 32 points sur la **même position exacte**.

Ce n'est pas un bug de calcul localisé — c'est une conséquence de la façon dont l'algorithme (élagage alpha-bêta assisté par la mémoire de recherche) fonctionne par nature. Résultat concret : comparer les scores de plusieurs workers indépendants n'est pas parfaitement fiable. Un worker qui a eu la séquence de coups la plus favorable pour accumuler du contexte utile peut rapporter un score plus flatteur qu'un autre, sur un coup pourtant équivalent ou moins bon.

## Pourquoi ce n'est pas (encore) corrigé

La correction classique — une mémoire de recherche **partagée** entre workers — nécessite une fonctionnalité web (`SharedArrayBuffer`) qui exige des en-têtes serveur qu'un site hébergé sur GitHub Pages ne peut pas envoyer. Confirmé bloqué, pas une question d'effort.

Une piste alternative a été explorée et **abandonnée** : trier rapidement les coups en parallèle (mémoire indépendante, donc approximatif), puis ne vérifier finement que les meilleurs candidats dans un contexte unique et fiable. Ça ne fonctionne pas : l'écart entre évaluation « à froid » et « en contexte » peut être si grand que le tri rapide écarte à tort le vrai meilleur coup, avant même d'atteindre l'étape de vérification fiable.

Une seconde piste (redistribution dynamique du travail entre workers, pour mieux équilibrer la charge) a été construite et vérifiée **correcte**, mais pas clairement plus rapide en pratique, et elle ne résout de toute façon pas ce problème de fond — elle reste dans le code, non activée, documentée en commentaire pour une reprise future.

## En pratique

Le système reste globalement fonctionnel : les écarts de score dus à ce phénomène changent rarement l'**ordre** des meilleurs coups, seulement leur valeur numérique rapportée. Mais le risque existe, n'est pas nul, et mérite d'être su plutôt que caché.
