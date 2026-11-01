# Le moteur d'Abalassembly sur carte graphique

[![Ouvrir dans Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/ocj94/Abalassembly/blob/main/tools/gpu/Abalassembly_GPU.ipynb)

Le moteur du site, réécrit pour une carte graphique NVIDIA (CUDA), fait jouer
des milliers de parties du moteur contre lui-même sur chacun des départs du
site, pour mesurer **qui gagne le plus souvent depuis chaque départ**. Entre
humains, dans les 4 580 parties du site, les Noirs (qui commencent) gagnent
53 %.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `abalone_gpu.cu` | Le moteur : règles, évaluation, recherche, une partie entière. Une seule source pour la carte graphique (compilée par NVRTC dans Colab) et pour le processeur (compilée par g++ pour les tests). |
| `Abalassembly_GPU.ipynb` | Le carnet Google Colab : contrôle, test de vitesse, campagne qui reprend après une coupure (sauvegarde dans Google Drive), tableau des résultats. Généré par `carnet.py`. |
| `departs.tsv` | Les 188 départs du site (tous sauf Découverte), écrits par `departs.js` depuis `LAYOUTS`. |
| `test_cpu.cpp` | Le moteur compilé pour le processeur : comparaison avec le site, parties de test. |
| `verifier.js` | Compare le moteur GPU au moteur du site, position par position. |
| `reference.json` | 36 parties jouées sur processeur ; le carnet vérifie que la carte graphique joue exactement les mêmes. Écrit par `reference.js`. |

## Ce qui est vérifié

- **Mêmes coups, même évaluation, mêmes notes que le moteur du site**, à
  profondeur 1 et 2, pénalités de répétition et d'aller-retour comprises
  (`verifier.js`). Le test du site le refait à chaque modification, sur 120
  positions, et vérifie que `departs.tsv` et `reference.json` suivent leur
  source.
- **La carte graphique joue les mêmes parties que le processeur** : le carnet
  rejoue les 36 parties de `reference.json` avant toute campagne et s'arrête
  à la moindre différence.

Le moteur GPU n'a pas de table de transposition (elle ne change pas la note
d'un coup à la racine) ni de table de finale (elle ne sert qu'à 4 billes ou
moins).

## Lancer une campagne

1. Ouvrir le carnet avec le bouton ci-dessus.
2. *Exécution → Modifier le type d'exécution → GPU (T4)*, puis *Exécution →
   Tout exécuter*, et accepter l'accès à Google Drive.
3. Si Colab coupe la session, relancer *Tout exécuter* : la campagne reprend.
4. Envoyer le fichier `campagne-….json` téléchargé à la fin.

Par défaut : profondeur 2 (comme les duels du Labo), 2 400 parties par départ
(la part de victoires des Noirs à ±2 % près), le meilleur coup du moteur (au
hasard entre les ex aequo), 200 demi-coups au plus, 3 billes d'avance
gagnent, pénalités de répétition.

## Sans carte graphique

```sh
node tools/build.js && node tools/gpu/departs.js
g++ -O2 -std=c++17 -fopenmp tools/gpu/test_cpu.cpp -o /tmp/abalone_cpu
node tools/gpu/verifier.js /tmp/abalone_cpu 2000 400
/tmp/abalone_cpu jouer tools/gpu/departs.tsv 2 0 0 200 1 1 400 20261101 standard
```

Sur un cœur de processeur, une partie à profondeur 2 prend environ 0,1 s,
à profondeur 3 environ 2 s.
