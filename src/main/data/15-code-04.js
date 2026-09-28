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