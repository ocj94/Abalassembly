# Benchmark moteur — méthodologie et résultats réels

Il n'existe, à notre connaissance, aucune comparaison publique et reproductible des programmes jouant à l'Abalone. Les travaux universitaires sur le sujet le notent explicitement, et l'un d'eux relève même qu'aucun serveur public ne permet à une IA de se connecter pour être évaluée.

Cette page rassemble ce qu'Abalassembly mesure réellement, avec la méthode employée. Tous les chiffres ci-dessous ont été obtenus par mesure, jamais estimés — et là où une mesure manque ou est peu fiable, c'est dit.

## Comment mesurer soi-même

Le site embarque un **benchmark moteur** (Labo IA) qui tourne entièrement dans le navigateur, sans rien envoyer nulle part. Il mesure, sur la position de départ Belgian Daisy : les nœuds explorés par seconde avec un seul worker, puis avec le nombre de workers réellement utilisés, et l'efficacité réelle du parallélisme (gain observé rapporté au gain théorique idéal).

C'est reproductible par n'importe qui, sur n'importe quel appareil — et les résultats varient beaucoup selon la machine, ce qui est précisément l'intérêt de le mesurer chez soi plutôt que de lire un chiffre publié.

## Résultats mesurés — appareil mobile (Android, navigateur)

| Profondeur | 1 worker | 4 workers (cumulé) | Efficacité du parallélisme |
|---|---|---|---|
| 3 | 4 661 nœuds/s | 14 059 nœuds/s | 69 % |
| 4 | 16 881 nœuds/s | 26 735 nœuds/s | 13 % |
| 5 | 8 912 nœuds/s | 18 047 nœuds/s | 15 % |
| 6 | 7 422 nœuds/s | 20 606 nœuds/s | 17 % |

**Lecture honnête** : l'efficacité s'effondre au-delà de la profondeur 3. Les coups racine sont répartis une fois pour toutes entre les workers, sans redistribution — un worker qui finit tôt attend pendant qu'un autre traîne. Voir [Moteur multi-worker](Moteur-multi-worker.md) pour le détail, et une limite plus profonde encore qui n'est pas résolue.

Note sur la profondeur 3 : le test est très court (quelques secondes), et le débit à 1 worker y paraît plus bas qu'à la profondeur 4. C'est très probablement le processeur mobile qui n'a pas le temps de monter en fréquence, pas une propriété du moteur.

## Résultats mesurés — environnement serveur (Node.js, un seul cœur)

| Profondeur | Temps | Nœuds explorés |
|---|---|---|
| 3 | 4,5 s | ~24 000 |
| 4 | 31,5 s | ~239 000 |
| 5 | 120 s | ~866 000 |

Soit environ 5 400 nœuds/seconde en mono-thread dans cet environnement.

## Comparaison de versions du moteur (SPRT)

Le Labo IA permet de faire s'affronter deux jeux de poids d'évaluation et d'appliquer un **test séquentiel (SPRT)** : plutôt que de fixer arbitrairement un nombre de parties, le test s'arrête dès qu'il peut conclure avec un niveau de confiance donné qu'une version est plus forte que l'autre — ou qu'il n'y a pas de différence détectable.

C'est la méthode standard dans le monde des moteurs d'échecs, et elle évite le piège classique : jouer 20 parties, gagner 12, et en conclure à tort qu'on a progressé.

## Résultat notable : le réseau de neurones (NNUE) ne bat pas le moteur actuel

Testé en vraies parties, jouées jusqu'au bout, sur 15 positions de départ variées, en contrôlant l'avantage du premier coup :

| Variante | Résultat contre le moteur actuel |
|---|---|
| NNUE — évaluation | 2 victoires, 8 défaites, 5 nulles |
| NNUE — ordonnancement | +2,7 % de nœuds pour un résultat identique |
| NNUE — combiné | quasi identique à l'évaluation seule |

Détail complet et interprétation : [Moteur expérimental](Moteur-experimental.md).

## Résultat notable : les finales 2v2 et 3v2 sont quasi toutes nulles

Les tables de finale calculées exhaustivement pour le mode Découverte montrent que **99,9 % des positions 2v2 et 3v2 sont des nulles**. En 2v2, les seules victoires sont des éjections immédiates ; en 3v2, la victoire la plus longue demande 7 demi-coups.

Résultat négatif, conservé et documenté tel quel — il dit quelque chose de réel sur le jeu.

## Ce que ce benchmark ne mesure pas

- **Un classement Elo absolu** face à d'autres programmes (Aba-Pro, ULA…) : ces programmes ne sont pas connectables automatiquement, et aucun protocole commun n'existe pour l'Abalone.
- **La force face à des humains forts** : demanderait un volume de parties qu'aucun site hors-ligne ne peut réunir seul.
- **Une comparabilité parfaite entre workers** : limite réelle, documentée dans [Moteur multi-worker](Moteur-multi-worker.md).

## Échanger une partie avec un moteur externe

Faute de protocole standard, le site propose le chemin manuel qui fonctionne avec n'importe quel programme : **exporter les coups en notation Aba-Pro** (contrôles de jeu → « Copier les coups »), les soumettre au moteur externe, puis **réimporter** le résultat (menu → « Importer »).

À noter : il n'existe aucun format standard de *position* pour l'Abalone, contrairement au FEN des échecs. Seule la notation des *coups* est standardisée. Tout échange part donc d'une position de départ connue.

Depuis la version 2.12, un mode **« Duel moteur externe »** (contrôles de jeu) automatise ce relais coup par coup : le site affiche son coup en Aba-Pro, tu le soumets au programme externe, tu colles sa réponse, et la partie continue normalement — avec pendules, captures et détection de victoire comme une partie ordinaire.

Le coup reçu est systématiquement revalidé contre le moteur avant d'être appliqué : un programme externe ne peut pas faire jouer un coup illégal, même par erreur.
