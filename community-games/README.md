🇬🇧 [English version](README.en.md)

# Parties communautaires

Des parties réelles, jouées sur un vrai plateau physique et enregistrées via
la fonction **Détection photo/plateau** du site (photographier le plateau
après chaque coup ; le coup est reconstruit automatiquement par le moteur).

Contrairement aux parties de [`games/`](../games/README.md), celles-ci ne
sont **pas toutes garanties rejouables** : la détection part d'une photo, pas
d'un journal de coups numérique, et peut se tromper. Chaque partie porte donc
un champ `verified`, honnête sur ce point plutôt que de prétendre une
fiabilité uniforme.

## Format (`abalassembly-scanned-games-v1`)

```json
{
  "format": "abalassembly-scanned-games-v1",
  "exportedAt": "2026-07-16T00:00:00.000Z",
  "count": 85,
  "games": [
    {
      "date": "2026-07-16",
      "black": "AP10",
      "white": "Ula6",
      "variant": "belgian",
      "start": "0a1a2b1b2b3c2c3g7g8h7h8h9i8i9,...",
      "startColor": "black",
      "seq": "1.A1B2 I5H5 2.A2B3 I6H6 3.C2C3 A5B5 ...",
      "plies": 84,
      "verified": true
    }
  ]
}
```

| Champ | Contenu |
|---|---|
| `date` | Date de la partie, `AAAA-MM-JJ`. |
| `black` / `white` | Noms saisis par la personne qui enregistre. |
| `variant` | Disposition de départ. |
| `start` | Position de départ, format AO (une notation de position compacte, différente du FEN-like d'APGN — voir [`APGN.md`](../APGN.md) pour ce second format). |
| `startColor` | Camp qui ouvre depuis cette position. |
| `seq` | Coups en notation Aba-Pro. |
| `plies` | Nombre de demi-coups. |
| `verified` | `true` si la séquence rejoue intégralement contre le moteur au moment de l'enregistrement ; `false` sinon (détection imparfaite). |

Le fichier entier porte aussi `format`, `exportedAt` (horodatage de l'export)
et `count` (nombre de parties). Un export d'une seule partie utilise le
format voisin `abalassembly-scanned-game-v1` (singulier), avec un champ
`game` unique plutôt que `games`.

## Contenu actuel

`abalassembly-saab-lot2.json` — 85 parties soumises par **Saab**, toutes en
Marguerite belge : **83 sur 85 rejouent intégralement** (`verified: true`),
2 ne rejouent pas (détection imparfaite au moment de l'enregistrement,
conservées telles quelles plutôt que corrigées à la main).

## Vérification à l'import

Le site ne fait jamais confiance aveuglément à un fichier reçu de
l'extérieur : à l'import, chaque partie est rejouée contre le moteur avant
d'être acceptée, qu'elle porte `verified: true` ou non dans le fichier
d'origine.

## Différence avec `games/`

`games/` contient des parties **au format APGN**, **toutes** vérifiées avant
publication, issues de serveurs de jeu en ligne (MiGs). Ce dossier-ci
contient des parties **au format JSON natif du site**, issues d'un plateau
**physique**, où une partie non vérifiée reste publiée mais clairement
signalée comme telle.
