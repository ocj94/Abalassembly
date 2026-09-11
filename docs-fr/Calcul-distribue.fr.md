🇬🇧 [English version](../docs-en/Calcul-distribue.en.md)

# Calcul distribué — pourquoi il n'y en a pas

Quatre propositions distinctes de « grille de calcul volontaire » (façon World Community Grid ou BOINC) ont été étudiées pour Abalassembly. Aucune n'a été retenue. Cette page explique pourquoi, avec les chiffres, pour éviter de refaire le tour de la question dans six mois.

L'idée n'est pas mauvaise. Le blocage n'est pas non plus technique au sens strict — le navigateur sait faire tourner des Workers en arrière-plan. Le blocage est plus simple : **il n'existe aujourd'hui aucun calcul qui justifierait l'infrastructure**.

## Les tailles réelles des tablebases

C'est l'erreur commune aux quatre propositions : chacune sous-estimait massivement la taille des tablebases, et chacune en faisait son argument principal. Voici les chiffres calculés, pour un plateau de 61 cases :

| Classe | Positions | Stockage minimum (2 bits/position) |
|---|---|---|
| 2v2 — **déjà calculée** | 3 131 130 | ~1 Mo |
| 3v2 — **déjà calculée** | 59 491 470 | ~15 Mo |
| 3v3 | 1 110 507 440 | **278 Mo** |
| 4v3 | 15 269 477 300 | **3,8 Go** |
| 4v4 | 206 137 943 550 | **51,5 Go** |

Pour mémoire, le site entier pèse environ 7,8 Mo, tout compris. Même la classe 3v3, la plus modeste des trois restantes, dépasserait le fichier de trente-cinq fois.

Les écarts entre ces chiffres et ceux annoncés dans les propositions allaient d'un facteur 6 à un facteur 20 000. C'est systématiquement ce qui faisait s'effondrer chaque proposition une fois recalculée.

### Deux façons de compter, toutes les deux justes

Le tableau ci-dessus compte les placements **bruts** — combien de configurations de billes existent sur le plateau, sans tenir compte des symétries. C'est la bonne mesure pour donner l'échelle du problème.

Mais 2v2 et 3v2, une fois **réellement calculées**, n'occupent pas cet espace brut : elles exploitent les 12 symétries du plateau (rotations et réflexions) pour réduire le camp faible à ses seules positions canoniques, plus un facteur ×2 pour le trait. Concrètement :

| Classe | Espace brut (tableau ci-dessus) | Espace réduit (méthode réelle, validée) |
|---|---|---|
| 2v2 | 3 131 130 | 6 262 260 *(inclut le ×2 du trait, absent du brut)* |
| 3v2 | 59 491 470 | 11 703 240 |
| 3v3 | 1 110 507 440 | **224 721 560** |

La méthode réduite est celle qui a réellement produit les tables 2v2 et 3v2 déjà embarquées dans le jeu — revérifié en la relançant de zéro dans un bac à sable séparé et en comparant le résultat aux vraies données, position par position, sans un seul écart sur les dizaines de milliers d'entrées non nulles des deux tables.

**3v3 a été calculée avec cette même méthode**, une première : 224 721 560 positions résolues, dont seulement 2 gains et aucune perte forcée — le reste, des nulles. Un résultat surprenant mais cohérent : une capture depuis 3v3 retombe sur une position 3v2 presque toujours nulle (99,85 % du corpus), donc très peu de captures tombent par chance sur l'une des rares positions décisives. Les deux positions gagnantes ont été revérifiées indépendamment avec le moteur de jeu réel, pas seulement avec le calcul qui les a produites.

**Une hypothèse de la table 3v2 déployée, vérifiée pour la première fois plutôt que simplement héritée** : l'algorithme original ne teste jamais si le camp fort (3 billes) peut perdre — il suppose cette impossibilité sans la démontrer. Une bille noire isolée peut réellement être poussée par les deux billes blanches (confirmé avec le vrai moteur, sur une position construite à la main), mais une poussée simple ne réduit pas le nombre de billes. La vraie question — blanc peut-il forcer une éjection complète malgré une défense optimale — a été testée sur un échantillon de 158 043 positions noir-au-trait, couvrant les 180 orbites du camp faible : zéro cas où tous les coups de noir mèneraient à une victoire blanche confirmée. La table déployée tient, maintenant sur preuve.

**Ce que ça ne change pas** : 4v3 reste hors de portée d'un stockage en fichier unique même réduit par symétrie (environ 812 Mo estimés, contre 3,8 Go en brut) — toujours des dizaines de fois la taille du site entier. Un vrai obstacle supplémentaire, découvert en creusant : la moitié du calcul retrograde (le camp faible, quand c'est son tour de jouer) change de case dans la table à **chaque coup, sans exception** — un découpage en tranches indépendantes ne fonctionne donc pas, il faudrait garder toute la table en mémoire (ou en mémoire virtuelle avec un fichier d'échange) d'un bout à l'autre du calcul.

**Où ça en est concrètement** : 3v2 (déjà déployée) et 3v3 (calculée, validée, non déployée — aucune utilité pour un joueur, 2 positions exploitables sur 224 millions) sont les deux étapes préalables à 4v2, elle-même préalable à 4v3. Rien de tout cela ne change la conclusion de cette page — 4v3 reste hors de portée du site — mais la méthode de calcul est maintenant éprouvée, pas seulement estimée sur le papier.

## Les quatre candidats de calcul, et pourquoi aucun ne tient

**Tablebases 3v3 et au-delà** — incompatibles avec l'architecture fichier unique, voir le tableau ci-dessus. Le projet s'est arrêté à 3v2 pour cette raison, et c'était le bon choix.

**Entraînement d'un réseau de neurones (NNUE)** — c'est le candidat qui revenait le plus souvent, présenté comme prioritaire. Il est écarté sur mesure, pas sur intuition : le réseau est **aveugle aux positions tactiques**, et ce n'est pas un problème de volume de données ni de puissance de calcul. Voir [Moteur expérimental](Moteur-experimental.fr.md), section « Pourquoi pas de NNUE — la mesure du 0/53 ». Ajouter de la puissance à un modèle qui rate systématiquement les éjections ne le corrigerait pas.

**Optimisation des poids par SPSA** — le Labo la fait déjà, en local, sur quelques workers. Elle n'a pas besoin de renfort extérieur.

**Génération de positions et analyse de parties** — le corpus de 4 479 parties réelles est déjà embarqué et exploité (livres d'ouvertures, empreintes historiques, statistiques). Rien n'attend d'être calculé.

## Deux contraintes d'architecture, vérifiées dans le code

**Les Workers sont créés depuis une chaîne embarquée**, jamais depuis un fichier séparé :

```js
const blob = new Blob([AI_WORKER_CODE], { type: 'application/javascript' });
_aiWorker = new Worker(URL.createObjectURL(blob));
```

Plusieurs propositions suggéraient un `distributed-worker.js` autonome. Un fichier séparé **casse le fonctionnement depuis `file://`** — donc depuis une clé USB, hors ligne, ce qui est le principe fondateur du projet.

**`SharedArrayBuffer` est inutilisable ici.** Il exige les en-têtes HTTP COOP/COEP, impossibles à définir sur GitHub Pages. C'est la même limite qui empêche déjà une table de transposition partagée entre workers (voir [Moteur multi-worker](Moteur-multi-worker.fr.md)).

## Le problème de la vérification

Sans serveur, il n'existe aucun moyen de vérifier qu'un contributeur a réellement calculé ce qu'il renvoie. Un client malveillant — ou simplement buggé — pourrait retourner n'importe quoi.

Les vraies grilles (BOINC, World Community Grid) résolvent ça en distribuant la même tâche à plusieurs machines et en comparant les résultats. Cela suppose exactement le serveur central que l'architecture hors-ligne cherche à éviter, et double le coût de calcul.

Fusionner à la main des fichiers reçus par courriel n'est pas une grille de calcul : c'est du partage de fichiers, sans garantie sur leur contenu.

## Ce qui reste valable dans ces propositions

Trois points méritent d'être conservés pour le jour où la question se rouvrira :

**Le consentement strict.** Rien par défaut, case à cocher explicite, limite de puissance réglable, bouton d'arrêt immédiat, et texte clair sur ce qui est calculé. Un site qui ferait tourner du calcul sans accord explicite serait, à juste titre, traité comme un mineur caché.

**La validation redondante.** Même tâche distribuée à plusieurs machines, résultat retenu seulement si les réponses concordent ; plus des tâches de contrôle dont la réponse est connue d'avance.

**Commencer par un test de reproductibilité, pas par les tablebases.** Faire calculer des positions aléatoires à plusieurs navigateurs et vérifier qu'ils retrouvent exactement le même résultat. Cela teste toute la chaîne — distribution, calcul, validation — sans engager des semaines de calcul sur un objectif incertain. C'était le meilleur conseil des quatre documents.

## À quelles conditions la question se rouvre

Deux, cumulatives :

1. **Un objectif de calcul réel** — quelque chose dont le résultat tiendrait dans le site et apporterait une amélioration mesurable. Aucun des quatre candidats actuels ne remplit ce critère.
2. **Un backend actif** — `abalassembly-api` existe mais reste volontairement dormant. Il est la condition de l'agrégation et de la vérification, et débloquerait au passage un vrai classement Elo.

En attendant, construire les interrupteurs « prêter mon processeur » reviendrait à promettre aux contributeurs un calcul dont personne n'a besoin.
