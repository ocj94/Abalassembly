';

// Parties AbalOnline — variété (toutes variantes sauf belgian) : [date,x(noir),y(blanc),winner,variante,startPosition,séquence]
let AO_GAMES=[];  // rempli par ensureGameBanks() — banque compressée ci-dessous
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