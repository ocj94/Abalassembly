# Moteur expérimental (NNUE)

Une section « Moteur expérimental (NNUE) » propose de remplacer certains rouages du moteur de jeu par un petit réseau de neurones entraîné sur les vraies parties du corpus. C'est une option, pas un remplacement — le moteur actuel (poids réglés à la main et par SPSA) reste l'IA par défaut.

**Deux endroits pour le choisir** : directement dans l'écran de configuration avant de lancer une partie (le plus pratique au quotidien), ou dans **Labo IA** (pour le tester isolément sans lancer de vraie partie). Les deux utilisent exactement le même réglage — le choix fait dans l'un se reflète dans l'autre.

## Ce que c'est

Un réseau minuscule (125 entrées → 32 → 16 → 1 sortie, 4 577 paramètres au total — assez petit pour tourner en JavaScript pur, sans dépendance externe) entraîné à prédire, à partir d'une position, quel camp est favori pour gagner la partie.

**Données d'entraînement** : 189 797 positions extraites de 3 944 vraies parties rejouables du corpus (MIGS + AbalOnline). Le découpage entraînement/validation se fait **par partie entière**, jamais par position isolée — des positions d'une même partie sont trop corrélées entre elles pour servir à la fois à l'entraînement et à la vérification sans fausser le résultat.

**Résultat de l'entraînement** : sur des parties jamais vues pendant l'entraînement, le réseau prédit correctement quel camp est favori dans 80,3 % des cas (contre 50 % au hasard).

## Les trois variantes proposées

1. **NNUE — évaluation** : remplace le calcul habituel (8 poids réglés à la main) par le réseau, pour juger chaque position en fin de recherche.
2. **NNUE — ordonnancement** : garde l'évaluation habituelle, mais utilise le réseau pour décider dans quel ordre examiner les coups possibles (un meilleur ordre peut, en théorie, accélérer la recherche).
3. **NNUE — combiné** : les deux à la fois, sur toute la profondeur de recherche.

## Le résultat honnête

Chaque variante a été testée en conditions réelles : de vraies parties, jouées jusqu'au bout, contre le moteur actuel, sur 15 positions de départ variées (issues du corpus, pas la même position répétée), en contrôlant l'avantage du premier coup.

| Variante | Résultat contre le moteur actuel |
|---|---|
| NNUE — évaluation | 2 victoires, 8 défaites, 5 nulles |
| NNUE — ordonnancement | +2,7 % de nœuds explorés pour un résultat identique (donc plus lent, pas plus efficace) |
| NNUE — combiné | Résultat quasi identique à l'évaluation seule |

**Dans les trois cas, le moteur actuel gagne.** Ce n'est pas un défaut caché : c'est affiché tel quel dans l'interface, avec ces mêmes chiffres en infobulle sur chaque bouton.

## Pourquoi le proposer quand même

Le principe du site est de ne jamais inventer de donnée ni maquiller un résultat. Ce réseau a été construit et testé sérieusement, et le résultat — même s'il ne va pas dans le sens espéré — est une vraie information : prédire *qui gagne finalement* une partie humaine est un objectif différent de bien juger la solidité tactique d'*une* position précise pendant la recherche. Cet écart d'objectif explique probablement pourquoi le réseau, malgré une précision honnête sur son propre critère (80,3 %), ne bat pas un moteur pensé directement pour la recherche.

Cette section reste disponible pour qui veut voir le résultat par lui-même, ou explorer plus tard un entraînement avec un objectif différent (imiter les coups de joueurs humains forts, par exemple, plutôt que prédire l'issue de la partie).


## Tes propres résultats par moteur

La page **Statistiques** réunit désormais les deux échelles côte à côte : le résultat général ci-dessus (les 15 parties de test), et tes résultats personnels — calculés depuis ton historique de parties, filtrés par moteur choisi à chaque partie.

Si tu joues peu de parties avec un moteur donné, un avertissement « échantillon réduit » apparaît sous les 10 parties — un taux de victoire sur 2 ou 3 parties n'a pas grand sens statistiquement, et le site ne le présente jamais comme s'il en avait.

## La piste de l'auto-apprentissage : mesurée, et bien plus abordable que je ne l'avais écrit

Un travail universitaire (Abalearn, INESC-ID) a entraîné un réseau pour l'Abalone par **auto-apprentissage** — le programme joue contre lui-même et apprend de ses propres parties — plutôt qu'en prédisant l'issue de parties humaines. C'est exactement l'hypothèse formulée plus haut pour expliquer le résultat mitigé du NNUE actuel : l'objectif d'entraînement n'est peut-être pas le bon.

**Correction d'une affirmation erronée.** Une version précédente de cette page affirmait que cette piste coûtait environ 300 heures de calcul et était donc hors de portée. **C'était faux**, et sur la base d'une estimation jamais vérifiée. Le calcul supposait une recherche à profondeur 3 et la volonté d'égaler l'intégralité du corpus humain — deux hypothèses inutilement coûteuses, dont aucune n'est requise par l'auto-apprentissage.

Voici ce que donne la **mesure réelle** (profondeur 2, Belgian Daisy, parties complètes jouées jusqu'au bout) :

| Mesure | Valeur |
|---|---|
| Temps par partie | 20,4 s |
| Longueur moyenne | 43,6 coups |
| Positions d'entraînement par partie | 44,6 |
| Positions uniques | 97,8 % |

Ce qui donne, en extrapolant depuis ces mesures :

| Volume visé | Temps de calcul |
|---|---|
| 20 000 positions | ~2,5 heures |
| 50 000 positions | ~6,3 heures |
| 190 000 positions (volume du corpus humain actuel) | ~24 heures |

Long, mais parfaitement à portée pour un jeu de données utile — sans commune mesure avec les 300 heures annoncées à tort.

### Un piège évité de justesse

Le moteur est **strictement déterministe** : trois recherches sur la même position renvoient exactement le même coup. Sans randomisation des premiers coups, mille parties d'auto-jeu auraient été **mille fois la même partie**, et le jeu de données aurait été sans aucune valeur — un échec silencieux, difficile à repérer après coup.

Le générateur joue donc les premiers coups au hasard, et **mesure puis affiche le taux de positions uniques à chaque exécution** (97,8 % sur l'échantillon), précisément pour que ce risque reste visible si les réglages changent.

### La vraie difficulté n'est pas le temps de calcul

Sur l'échantillon mesuré, **les noirs gagnent 8 parties sur 10**. Ce déséquilibre marqué du premier joueur signifie qu'un réseau entraîné tel quel apprendrait surtout « les noirs gagnent », au lieu d'apprendre à évaluer une position. Il faudrait équilibrer les données avant tout entraînement — inverser les couleurs, ou pondérer.

C'est ce point, et non le coût de calcul, qui reste le vrai obstacle. Il n'est pas résolu.

### État actuel

Le générateur existe et est validé : `tools/selfplay-gen.js` dans le dépôt, avec ses chiffres mesurés et ses réserves documentées en en-tête. La génération à grande échelle et l'entraînement restent à faire.

## Pourquoi pas de NNUE — la mesure du 0/53

Cette section clôt la piste du réseau de neurones, non pas sur un « ça n'a pas marché », mais sur trois mesures reproductibles qui expliquent **pourquoi**.

### Le bon critère n'était pas la corrélation

Un réseau réentraîné atteignait **0,87 de corrélation** avec l'évaluation classique (contre 0,07 pour le réseau embarqué). Ça semblait excellent — et il perdait quand même, 3 victoires sur 12.

La corrélation mesure l'accord *en moyenne*. Or choisir un coup ne dépend pas de la moyenne : il faut classer correctement les alternatives entre elles. Sur une position où cinquante coups valent +10 et un seul vaut +2100 parce qu'il éjecte une bille, une erreur de quelques points passe inaperçue dans une corrélation mais fait rater le coup gagnant.

Le critère utile est donc le **taux de « même meilleur coup »** que l'évaluation classique, mesuré séparément selon que la position est tactique (au moins une éjection possible, pour un camp ou l'autre) ou calme.

### Les trois expériences

| Approche | Entrée | Paramètres | Tactique | Calme | Total |
|---|---|---|---|---|---|
| 64/32, réseau d'origine | 125 cases | 10 177 | **0 %** (0/53) | 26,9 % | 20,5 % |
| 256/128, ×6,4 paramètres | 125 cases | 65 281 | 8,7 % (4/46) | 31,0 % | 26,4 % |
| 64/32 + 4 indicateurs tactiques | 129 entrées | 10 433 | **26 %** (13/50) | 7,3 % | 12,0 % |

Le premier résultat est le plus frappant : **zéro bon coup sur 53 positions tactiques**. Pas « moins souvent » — jamais. Et l'erreur coûte cher : 58 points d'évaluation en médiane, jusqu'à 2 104 au pire, soit l'ordre de grandeur d'une bille perdue.

### Ce que ces mesures établissent

**Ce n'est pas une question de capacité.** Multiplier les paramètres par 6,4 améliore bien l'apprentissage (erreur de validation 0,102 contre 0,123) mais ne gagne que 8,7 points sur la tactique. Loin des ~100 % qu'il faudrait pour rivaliser.

**C'est une question de représentation.** Ajouter seulement quatre indicateurs tactiques explicites — nombre d'éjections disponibles, de poussées possibles, de menaces subies, différentiel de captures — fait passer la tactique à 26 %, avec un réseau six fois plus petit que le précédent. Trois fois mieux, pour bien moins cher.

**Mais ce gain se paie.** Les positions calmes s'effondrent de 31 % à 7,3 %, et le total baisse de 26,4 % à 12 %. Le réseau s'appuie sur les indicateurs faciles et cesse d'apprendre la structure positionnelle. Il troque une compétence contre une autre plutôt que d'ajouter la seconde à la première.

### La conclusion

Les 125 entrées d'origine décrivent uniquement quelles cases sont occupées. Elles ne disent rien de ce qui rend une position tactique : qu'une poussée est possible, qu'une bille adverse est en bord de plateau et poussable, qu'une menace pèse. Le réseau devrait déduire tout cela de l'occupation brute — c'est-à-dire réapprendre la géométrie hexagonale : alignements sur six directions, règles du sumito, distance au bord.

Il ne le fait pas, et lui fournir ces informations revient à recalculer ce que l'évaluation classique calcule déjà, explicitement, en quinze lignes.

**S'il faut donner au réseau les calculs de l'évaluation classique pour qu'il soit correct, autant garder l'évaluation classique.** Elle est en outre trois fois plus rapide par appel (9,9 µs contre 31,4 µs mesurées — le réseau n'a jamais été le maillon lent), elle contient la géométrie de façon explicite, et elle gagne : 15-2 contre le réseau embarqué, 9-3 contre la version réentraînée.

### Reproduire la mesure

1. Générer environ 220 positions par marche aléatoire depuis plusieurs variantes de départ, en s'arrêtant à 6 captures.
2. Classer chaque position : *tactique* si au moins une éjection est disponible pour l'un des deux camps, *calme* sinon.
3. Pour chaque position, énumérer les coups légaux et retenir celui que préfère l'évaluation classique, puis celui que préfère le réseau.
4. Compter le taux d'accord séparément sur chaque catégorie.

Un taux d'accord proche de zéro sur les positions tactiques est le signal décisif : le réseau ne voit pas les éjections, quelle que soit sa corrélation globale.
