🇬🇧 [English version](../docs-en/Plateau-physique.en.md)

# Jouer sur un plateau physique

Ce que le site sait déjà faire avec un vrai plateau, et ce qu'il faudrait de plus pour qu'une machine déplace les billes elle-même. Noté en novembre 2026 après avoir regardé un projet de machine joueuse d'Abalone trouvé en vidéo.

---

## Ce que fait déjà le site

La page **Détection photo / plateau** (`#photo`, `18-camera-detection.js`) a trois modes :

| Mode | Ce qu'il fait | Où tourne le calcul |
|---|---|---|
| **Photo** | Une image déposée ou prise, lue par Claude Vision | appel réseau |
| **Direct** | Flux de la caméra, lecture image par image | dans la page |
| **AR** | Flux continu, plateau reconnu en surimpression, coups légaux et meilleur coup dessinés sur l'image | dans la page |

Le mode AR est le plus abouti : calibration sur les quatre coins, homographie (`detComputeHomography` / `detApplyHomography`), classification des 61 trous par couleur (`detSamplePatch` / `detClassify`), puis **les vraies fonctions du moteur** — `validateMove`, `applyMove`, `evaluateBoard` — appliquées à un plateau temporaire, de façon synchrone, sans jamais toucher à une partie en cours ailleurs dans l'application.

Autrement dit : **voir le plateau** et **décider du coup** sont faits, et faits hors ligne, dans le téléphone.

## Le projet observé

Un montage en cinq blocs : une application téléphone pour lancer la partie, **Microsoft Azure** pour le calcul, une caméra au-dessus du plateau, un **Arduino Uno**, et un portique à deux axes qui déplace les billes.

Deux différences de fond avec le choix d'Abalassembly :

- **Leur moteur est sur un serveur.** Sans réseau, pas de partie, et chaque coup coûte un aller-retour. Ici le moteur est dans la page : le site joue en avion, dans le métro, sans compte.
- **Leur caméra sert à déduire le coup de l'humain** en comparant deux états successifs. Le mode AR lit l'état complet à chaque image, ce qui est plus simple et plus robuste : aucune mémoire du coup précédent n'est nécessaire.

Il ne manque donc que le troisième bloc : **bouger les billes**.

## Pourquoi l'Abalone est plus dur à automatiser que les échecs

Aux échecs, aux dames, au morpion, un coup est un **« prends et pose »** : une pièce quitte une case, atterrit sur une autre. Un bras ou un électro-aimant suffit.

À l'Abalone, un coup est le **glissement d'une colonne**. Une poussée trois contre deux déplace **cinq billes à la fois**, le long d'un même axe. Un aimant n'en tire qu'une, et déplacer les billes dans le désordre casse la position.

## La décomposition qui résout le problème

Un coup d'Abalone se décompose en déplacements simples, à condition de **commencer par la bille de devant** :

1. La bille la plus avancée dans la direction du coup part en premier — vers la case vide qui la précède, ou **hors du plateau** s'il s'agit d'une éjection.
2. La case qu'elle libère devient la destination de la bille juste derrière.
3. On remonte ainsi la colonne, une bille à la fois, jusqu'à la queue.

Chaque destination se libère **juste avant** qu'on en ait besoin. Une poussée devient donc 2 à 5 déplacements d'une seule case, dans un ordre imposé, et un portique à deux axes suffit — pas besoin de saisir plusieurs billes ensemble.

Le moteur produit déjà tout ce qu'il faut pour cette liste : `addMoveToHistory` reçoit `{ cells, dir, type, ejection }`, c'est-à-dire les billes jouées, la direction et la nature du coup. La séquence s'en déduit sans rien recalculer :

```
billes triées selon (bille · direction), décroissant   →  la tête d'abord
pour chaque bille, de la tête vers la queue :
    destination = position + direction
    si la destination est hors du plateau : éjection
```

Pour un coup en flèche (`broadside`), les billes se déplacent **en parallèle** et aucune ne se gêne : l'ordre est libre.

## Ce qui n'est pas fait, et ne l'est pas par hasard

Aucun pilotage de matériel n'est prévu dans le site. Un portique coûte cher, tombe en panne, et n'apporte rien au joueur : savoir quel coup jouer est toute la valeur, déplacer trois billes de deux centimètres, l'humain le fait très bien. La page [Sur un vrai plateau](../docs-fr/Home.fr.md) et le mode AR couvrent le besoin réel — jouer sur son plateau en bois avec le moteur qui conseille.

Si un jour la troisième brique devait exister, le chemin le plus court serait : le navigateur lit le plateau en AR, calcule le coup, et envoie la séquence de déplacements simples à un microcontrôleur en Bluetooth ou en Wi-Fi local. Le serveur optionnel (`abalassembly-api`) n'est pas nécessaire : il n'y a rien à calculer ailleurs que dans la page.
