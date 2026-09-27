';

// Parties AbalOnline — variété (toutes variantes sauf belgian) : [date,x(noir),y(blanc),winner,variante,startPosition,séquence]
let AO_GAMES=[];  // rempli par ensureGameBanks() — banque compressée ci-dessous
/* PARTIES DE REFERENCE DES VARIANTES -- parties publiees avec une variante,
   ajoutees une par une, chacune VERIFIEE coup par coup avant integration
   (rejeu complet depuis LAYOUTS, une seule lecture possible par coup).
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