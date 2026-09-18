/* ═══════════════════════════════════════════════════════════════
   HARNAIS HISTORIQUE — interface conservee pour nacre.js et gamecode.js

   Version precedente : ce fichier extrayait CHIRURGICALEMENT une liste de
   fonctions codee en dur (grab('fn','validateMove') ...) et les recollait
   dans un new Function(). Deux fragilites l'ont casse :

     1. Une fonction appelee mais absente de la liste devient undefined a
        l'execution. C'est arrive avec _gcParseBody, appelee par
        gameCodeParse : gamecode.js plantait sur "_gcParseBody is not defined".
     2. Toute variable globale du moteur devait etre re-simulee a la main
        (board, capturedByBlack...). Quand les compteurs sont passes derriere
        CapturedByBlack.get()/.set(), la portee bricolee ne les connaissait
        plus.

   Les deux problemes viennent de la meme cause : reconstituer un
   sous-ensemble du moteur au lieu de le charger. On charge donc maintenant
   le moteur ENTIER via ./harness.js, et on se contente d'exposer la meme
   interface publique qu'avant — nacre.js et gamecode.js sont inchanges.
   ═══════════════════════════════════════════════════════════════ */
'use strict';
const { chargerMoteur } = require('./harness.js');

const ctx = chargerMoteur();

/** Les fonctions du moteur, telles que les attendaient les tests existants. */
function run() {
  return {
    validateMove: ctx.validateMove,
    applyMove: ctx.applyMove,
    undoMove: ctx.undoMove,
    getAllMovesForColor: ctx.getAllMovesForColor,
    coordToABAPRO: ctx.coordToABAPRO,
    abaproToRc: ctx.abaproToRc,
    gameCodeParse: ctx.gameCodeParse,
    resolveAbaProToken: ctx.resolveAbaProToken,
    abaproOfficialLabels: ctx.abaproOfficialLabels,
    AX_DIRS: ctx.AX_DIRS,
    akey: ctx.akey,
    rcToAxial: ctx.rcToAxial,
    axialToRc: ctx.axialToRc
  };
}

/* L'etat partage. Les compteurs passent par les accesseurs encapsules :
   les tests continuent d'ecrire st.cb = 0 sans savoir que c'est devenu
   CapturedByBlack.set(0) derriere. */
const state = {
  get board() { return ctx.board; },
  set board(v) { ctx.board = v; },
  get cb() { return ctx.CapturedByBlack.get(); },
  set cb(v) { ctx.CapturedByBlack.set(v); },
  get cw() { return ctx.CapturedByWhite.get(); },
  set cw(v) { ctx.CapturedByWhite.set(v); }
};

module.exports = { run, state, ctx };
