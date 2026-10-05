';

// Parties AbalOnline — variété (toutes variantes sauf belgian) : [date,x(noir),y(blanc),winner,variante,startPosition,séquence]
let AO_GAMES=[];  // rempli par ensureGameBanks() — banque compressée ci-dessous
/* PARTIES DE REFERENCE -- ajoutees une par une, chacune VERIFIEE coup par
   coup avant integration (rejeu complet depuis LAYOUTS, une seule lecture
   possible par coup) : parties publiees avec une variante, et parties
   jouees sur une autre application, source indiquee.
   Ni MIGS ni AbalOnline : une banque a part, pour ne pas mentir sur la
   provenance. Non compressee -- elle reste petite.
   Format : [date, noir, blanc, vainqueur, variante (cle de LAYOUTS), source, coups] */
const PARTIES_REFERENCE = [
  ['2018-02-25', 'FightClub', 'Aba-Pro 8 (IA)', 'FightClub', 'pyramide', 'onlineabalone.wordpress.com',
   '1.b5c5 h4h5 2.d7d6 g4f4 3.c6d6 f3f4 4.a5c7b5 g3f2g4 5.d7d6 g4f4 6.d8e8c7 g5f4 7.c5d5 d3e4 8.b5c5 d2e2 9.d7d6 d3e4 10.h7g7 f2f3g3 11.g7f7 e2f2 12.d4e5 f2e1f3 13.d6e7 g4h4 14.d7e7 e4f4 15.c6c7d6 h7g6 16.e9e8 g4g5 17.d6e6 e4f5 18.b4c5 e2e3 19.e7e6 g6f5 20.d6e6 i6h5 21.e5f6 h5g5 22.e8f8 i8i7 23.e6f6 h4h5 24.f6g6 f3g4 25.h8g7 i6h5 26.c5d5d6 g3f3 27.g8g7 d3e4 28.g7h7 e4f5 29.i7h6 d2d3 30.h6g5 g6h7 31.f6f8g6 g3h4 32.g7g6 h5h6 33.d6e6e7 d3e4 34.d7e7 g3f3 35.f4g5 i7i6 36.e7f7 e5f5 37.h7h6 d2e3 38.f7g7 i6i7 39.g6h7 e2e3 40.g7h7 i9h8 41.h6i6 h8i9 42.i7i6']
  // MiGs n. 31299, 31/10/2016, titre 'MLAIA-max vs ccc'. Couleurs DEDUITES de la
  // convention de ces titres (1er nomme = Blancs), etablie sur la partie MiGs 29744
  // d'Alitration ('MLA vs ccc'), ou le recit de l'article confirmait que MLA avait les Blancs.
  ,['2016-10-31', 'ccc', 'MLAIA-max', 'ccc', 'french', 'MiGs n\u00b0 31299 (onlineabalone.wordpress.com)',
   '1.h6g6 f8e7 2.h7g6 e7d6 3.g5f5 d6c5 4.g6f5 d7e8c7 5.f5e4 e2d2 6.b3b2 d2c2 7.e5d4 e3f3d2 8.g7f6 e2d2 9.e5d4 a3b3 10.d4c3 f4e3 11.a1b2 c6c7b5 12.e4d4 a4b5 13.e6f6e5 e3e2 14.f5e5 e2d2 15.e5d5 d2c2 16.b4b5']
  // KAAH, l'application de Saab (saabalone.github.io/KAAH_Test), 28/09/2026, partie
  // amicale 2609281513. Noirs : l'IA de KAAH, niveau 3, style agressif, 5 s de
  // reflexion ('Machine_N3_Agressif'). Blancs : Olivier ('Joueur_2' dans KAAH).
  // Fournie dans DEUX notations, Aba-Pro et Nacre, rejouees separement : 204
  // demi-coups chacune, les 204 positions identiques, une seule lecture Aba-Pro
  // possible, 6e ejection blanche au dernier demi-coup (Blancs 6 a 5).
  ,['2026-09-28', 'IA de KAAH (niveau 3, agressive)', 'ocj94', 'ocj94', 'belgian', 'KAAH, l\u2019application de Saab',
   '1.i9h8 a5b5 2.i8h7 a4b4 3.h7g6 c6c5 4.a1b2 b5c5 5.g8g7 g3g4f3 6.c1c2 b6c6 7.c2c3 c6d6 8.a2b3 f3f4e3 9.b3c4 e3e4 10.g5g6 g9f8 11.b2c3c2 e4e5 12.e8d7 c7c6 13.c4c5 c7d8 14.h8g7 e7e6 15.g8g7 d8e8 16.h9h8 e8f9 17.e4f4 b4c4 18.f4g5 h4h5 19.g7h7 f9f8 20.b1c2 f8f7 21.f3e3 f7f6 22.f3e3 d6e7 23.e3d3 a3b4 24.d7d6 e7e6 25.d6c5 a3a4 26.b3b4 i5h4 27.h8g7 h4h5 28.c6b5 e4d4 29.a4b5 b4c4 30.c6d6 h5h6 31.h9g8 h8i8 32.g7h8 f6e6g7 33.g8h8 f7g7 34.i8h8 i6h6 35.g8f7 h6g6 36.f7e6 f4e4 37.d3c3 e4d4 38.c3b3 d4c4 39.h8g8 a4b4 40.a3b3 b4c4 41.g5f4 g6g5 42.e3f4 h7g6 43.d6d5 g7f6 44.b3c3 f6e5 45.a1b1 h6g6 46.g5f4 e5e4 47.b5c5 d2e3 48.g8f7 f6g7 49.f7f6 g7g6 50.c5d5 g6g5 51.g3f3 i7i6 52.d5e5 e3f4 53.e2f3d2 i5h5 54.b1c2 h5g5 55.c5d6 f4f5 56.c2d3 c4d4 57.h6h5 g6h7h6 58.f5g6 g4g5 59.f4g4 i6i7 60.g4f4 g5g6 61.g8h8 h6g6 62.h5h6 i7h7 63.h8g8 i8h7 64.d6c6c5 g7g6 65.g8g7 g5g6 66.b5c5 f6f5 67.h6h5 c3d4 68.c5c4 h7g7 69.f3e3 e6f7 70.h9h8 f7f8 71.e7e6 f8g8 72.i8i7 e5f5 73.i5h4 g6h6 74.h4g4 g5h6 75.d5e5 i7h6 76.g4f3 h5g5 77.d2c2 g5f5 78.c5d6 e4e5 79.e7f7 h6h7 80.e3e4 e6e5 81.d6e6 h7g7h6 82.c2c3 h8g8h7 83.f3g4 f4e4 84.b4c5 e4e5 85.f7f6 d5e5 86.c5d5 c4d4 87.e7f7 d4e4 88.h4h5 h7g7 89.b2c3b3 g7g8 90.d3c3 g6h7 91.e7d6 h7h6 92.h4g3 e5e4 93.g3f3 e4e3 94.e1f2 e2d2 95.c5d5 h6g6 96.c3c4 h5g4 97.f2e2 f4e3 98.b3c3 e3d2 99.c5c4 c1d2 100.c2d3 g6f5 101.d6d5 e4e3 102.d5d4 e3e2']
  // KAAH, 01/10/2026, partie amicale 2610010832. Noirs : KAI++ de KAAH, niveau 8,
  // profil 'agressif v2', 30 s de reflexion ('KAI++8_Agr_30s_v2'). Blancs : Olivier.
  // Trois sources independantes : notation Aba-Pro (84 demi-coups, une seule lecture),
  // notation Nacre rejouee separement (84 positions identiques), et code de la
  // position FINALE affiche par KAAH -- identique case par case. Blancs 6 a 3.
  ,['2026-10-01', 'KAI++ de KAAH (niveau 8, agressif v2)', 'ocj94', 'ocj94', 'belgian', 'KAAH, l\u2019application de Saab',
   '1.i9h8 a5b5 2.i8h7 a4b4 3.h7g6 i5h4 4.h8g7 b4c4 5.a1b1 g3g5f2 6.c1c3d1 b5c5 7.f5g5 i5h4 8.g6g5 c5d5 9.g5g4 i6h6 10.d1e2 b6c6 11.d2e2 f4f3 12.a2b2 f2f3 13.b3c3 c6d6 14.b1d3c1 d5e5 15.e2d2 f3f4 16.g7f7 d6d5 17.h5g4 f6e5 18.b2b1 d4e4 19.f3e3 e5e4 20.d2d3 h6g6 21.d3d4 e3d3 22.d5d4 d6d5 23.d4d3 h4h5 24.d3d2 c3c4d3 25.d2e3 f5e4 26.b1a1b2 g5f4 27.d1e2 h5g5 28.d2e2 e4f5 29.f2e1 f6f5 30.e1e2 f5f4 31.g3g4h4 f2f3 32.c1d2 f5g5 33.i5i6 e4f4 34.i6h6 f4g4 35.d2e3 d4d5e4 36.h6h7 e6e5 37.e1e2d1 e4e5d4 38.d1e1 h5g4 39.b2b3 d4d3 40.d1c1 e3d2 41.h7h8 c1d2 42.f4f5 e3e2']
  // KAAH, 02/10/2026, partie amicale 2610021154. Noirs : KAI++ de KAAH, niveau 8,
  // profil 'Normal', 60 s ('KAI++8_Nor_60s'). Blancs : Olivier. Trois sources
  // independantes : Aba-Pro (216 demi-coups, une seule lecture), Nacre (216
  // positions identiques), code de la position FINALE affiche par KAAH --
  // identique case par case. Blancs 6 a 5. (L'en-tete KAAH '-0-3tr18' ne
  // correspond pas a la fin de partie : en-tete fige en cours de jeu.)
  ,['2026-10-02', 'KAI++ de KAAH (niveau 8, normal, 60 s)', 'ocj94', 'ocj94', 'belgian', 'KAAH, l\u2019application de Saab',
   '1.i9h8 a5b5 2.i8h7 a4b4 3.a1b2 b5c5 4.h7g6 c6c5 5.c1c2d2 i5h4 6.d2d3 g3g5f2 7.h9g8 f2f4e2 8.g8g7 i6h5 9.f5g5 e2e4f3 10.g7g6 g3f3 11.f6g6 d6e6 12.g6h6 b4c4 13.i6h6 c5c4 14.h6h5 c2d2 15.g5h5 d2e3 16.h5g4 f5f4 17.h4i5h5 e5e6f5 18.h8g7 e2e3 19.f2e2 b6c6 20.e5d5e6 c6c5 21.e6d6e5 c5d6 22.b1b2 e3e4 23.e2e3 e4f4 24.h4h5 e5e4 25.f7g8 e4f5 26.d3e3 f5f4 27.f2e2 c3d4 28.e2e3 g3f3 29.a2b2 f4g5 30.b2c3 f6g6 31.b3c3 f3f4 32.i7h7 i6h6 33.f7e6 d6e7 34.e6d5 h6g6 35.d5c4 f6f5 36.h5h6 e7e6 37.a2b3 g4g5 38.g8g9f7 g3f3 39.d3e3 e6e5 40.e1e2d1 f5g6 41.i8h8 f4g5 42.d1d2 g5h6 43.f3f4 g3g4 44.b3c3 g7g6 45.c3d3 g3h4 46.f3f4 g6f6 47.h8g7 h7g6 48.f7f8e6 g6f6 49.b4c5 e6e5 50.e2f3 g4g5 51.c2c3 d4e4 52.d2d3 g5g6 53.g8f7 g7f6 54.g4g5 h6g6 55.f3g4 e3f4 56.h6h5 g6g5 57.g3f3 i7h6 58.f7e7 e6f6 59.b2b3 g6h7 60.b3c4 h4g3 61.d7e8 d4e5 62.d3d4 h6g5 63.h5h6 g7g6 64.h6h5 g6h6 65.d6e6 h7h6 66.f6e6 g6f6 67.d6e6 h6h5 68.e7e8d6 g5f4 69.e6f6 d2d3 70.f5g5 d3e4 71.f6g7 e4f5 72.c3d4 f6f5 73.f2e2 h4g4 74.e2d2 e3e4 75.c5c4 f3f4 76.d6d7e7 f4e3 77.c4d4 h5h6 78.e7e8f7 h7g6 79.c3d3 h6g6 80.f7e7 e6e5 81.e2d2 f6e5 82.c3c4 f4e4 83.h8g7 g6f5 84.b1c2b2 e4d4 85.a4b5 f3e3 86.e7f8e6 g3g4f3 87.b5c5 f4e3 88.d6c5 e3d2 89.c5b4 f5e5 90.a3b4 e5d5 91.d6e6 f3e3 92.b3b4 d5c5 93.a5a4 d2d3 94.g7f6 e3d3 95.f7f6 c1c2 96.e6e5 d3d2 97.g6f5 d2c2 98.f5e4 d5d4 99.b6c6 b5c5 100.e5f5 d5c4 101.d2e3 a2b3 102.c2d2 c3c4 103.c7d8 c5c6d6 104.d8e8 b1b2 105.a4b5 b4c5 106.c6b5 b2b3 107.a4b5 c4c5 108.g5f5 c5c6']
  // KAAH, 05/10/2026, partie amicale 2610051911. Noirs : KAI++ de KAAH, niveau 8,
  // profil 'agressif v4', 60 s ('KAI++8_Agr_60s_v4'). Blancs : Olivier. Trois
  // sources independantes : Aba-Pro (66 demi-coups, une seule lecture), Nacre (66
  // positions identiques), codes de depart et de fin affiches par KAAH --
  // identiques au caractere pres au code calcule par Abalassembly. Blancs 6 a 3.
  ,['2026-10-05', 'KAI++ de KAAH (niveau 8, agressif v4, 60 s)', 'ocj94', 'ocj94', 'belgian', 'KAAH, l\u2019application de Saab',
   '1.a1b2 i5h5 2.a2b3 i6h6 3.b3c4 a5b6 4.b2c3 c5c7d6 5.b1c2 d6d8e6 6.c2c3 e6e8f6 7.i9h9 a4b5 8.e5d5 b6c6 9.d5c5 h6g6 10.d4c4 h5g5 11.c4b4 d6c6e7 12.i8i7 f5g6 13.h9h8 e5f5 14.a5a4 e6f7 15.g9h9 d7e8 16.i9h8 e8f8 17.f6g7 e5e4 18.i7h7 e4f5 19.f7g7 i7h6 20.g7h8 h4g4 21.h7g7 d7e7 22.h8g7 e7f7 23.h7h8 f7g8 24.f6e5 f4f5 25.b5c5 g4h5 26.a3b4 e4f5 27.b4c5 g6h7 28.d6e7e6 h7g7 29.e7e6 h6g6 30.e4d4 i8h7 31.i9i8 g6h7 32.e6e5 f6g7 33.c3d4 g7h8']
];
/* AO_GAMES exclut deliberement 1 partie (sur les 1891 d'origine) :
   2022-09-16, mascotte vs Abadeus, variante "domination". Le premier
   coup enregistre (b1c2) demande de deplacer une bille noire sur une
   case (c2) deja occupee par une AUTRE bille noire dans la position de
   depart -- incoherence de donnees a la source (export AbalOnline),
   pas une limite du parseur : aucun coup de ce type n'est legal dans
   quelque variante d'Abalone connue. Plutot que de deviner une regle
   de correction pour une variante exotique sans specification complete,
   la partie est retiree proprement. Verifie avant retrait : aucune
   autre partie du corpus ne presente cette incoherence. */
const AO_B64='