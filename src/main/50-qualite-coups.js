/* ═══════════════════════════════════════════
   STATISTIQUES DU JEU : LA QUALITE DES COUPS (v2.78)
   Demande d'Olivier (audit des statistiques du corpus, point 4) : pour chaque
   vrai coup du corpus, est-il proche du meilleur coup du moteur, et offre-t-il
   une bille a l'adversaire ?
   - « Proche du meilleur » : EXACTEMENT la mesure de la precision de Mes
     statistiques (computeDecisionProfile, 12-positional-analysis.js) -- chaque
     coup legal evalue a un demi-coup (evaluateBoard du camp au trait), le coup
     joue a SEUIL_PROCHE_MEILLEUR points ou moins du meilleur. Meme mesure des
     deux cotes : ta precision se compare a celle des vrais joueurs.
   - « Decision facile » : le meilleur et le pire coup legaux sont a plus de
     SEUIL_ECART_DECISION_DISPUTEE points (meme regle que Mes statistiques).
   - « Bille offerte » : apres le coup joue, l'adversaire peut ejecter une bille,
     alors qu'un autre coup legal ne le permettait pas. Un coup qui ejecte
     lui-meme (echange) n'est pas compte.
   - Par partie, par camp et par moment (debut : demi-coups 0 a 29, milieu : 30 a
     69, fin : 70 et plus -- les memes que la methode Texel du Labo).
   Le calcul (plusieurs minutes, toutes les parties completes) est fait hors
   ligne par tools/qualite-coups.js ; la page n'additionne que des compteurs.
═══════════════════════════════════════════ */
const QC_MOMENTS = [30, 70];                 // bornes des trois moments (demi-coups)
const QC_CHAMPS = ['coups', 'proches', 'faciles', 'facilesTrouves', 'offertes', 'perte'];   // perte : somme des ecarts au meilleur (dizaines de points, plafonnee a 1 000 par coup)
function _qcMoment(ply){ return ply < QC_MOMENTS[0] ? 0 : (ply < QC_MOMENTS[1] ? 1 : 2); }
/* Le camp « pousseur » peut-il ejecter une bille au prochain coup ? Exact, sans generer tous ses coups
   (un test le compare a getAllMovesForColor sur des milliers de positions du corpus) : une bille
   adverse au bord, la case au-dela hors du plateau dans une direction d ; en remontant la ligne
   (sens -d), k billes adverses contigues (1 ou 2) puis au moins k + 1 billes du pousseur (3 au plus). */
function _qcEjectionPossible(pousseur){
  const victime = pousseur === 'black' ? 'white' : 'black';
  for (const cle in board) {
    if (board[cle] !== victime) continue;
    const rc = cle.split(','), ax = rcToAxial(+rc[0], +rc[1]);
    for (let i = 0; i < AX_DIRS.length; i++) {
      const d = AX_DIRS[i];
      if (axialToRc(ax.q + d.q, ax.r + d.r)) continue;          // la case au-dela est sur le plateau
      let q = ax.q, r = ax.r, k = 0, j = 0, c;
      while ((c = axialToRc(q, r)) && board[akey(c.r, c.c)] === victime) { k++; q -= d.q; r -= d.r; }
      if (k > 2 || !c) continue;
      while ((c = axialToRc(q, r)) && board[akey(c.r, c.c)] === pousseur && j < 3) { j++; q -= d.q; r -= d.r; }
      if (j > k) return true;
    }
  }
  return false;
}

/* Analyse une partie du corpus (memes depart, jetons et arret que _sbRejouerPartie).
   Rend null pour une partie qui ne part pas d'une position de depart (probleme, position
   arrangee) ; sinon q[camp][moment] = les 6 compteurs de QC_CHAMPS (camp 0 : Noirs). */
function _qcAnalyserPartie(src, g){
  const dep = _sbDepart(src, g);
  if (!dep) return null;
  let nN = 0, nB = 0;
  for (const k in dep.board) { if (dep.board[k] === 'black') nN++; else if (dep.board[k] === 'white') nB++; }
  if (!(dep.cb === 0 && dep.cw === 0 && Math.min(nN, nB) >= 12)) return null;
  const jetons = _sbJetons(src, g);
  const q = [0, 1].map(function(){ return [0, 1, 2].map(function(){ return [0, 0, 0, 0, 0, 0]; }); });
  const sauve = { b: board, cb: CapturedByBlack.get(), cw: CapturedByWhite.get() };
  try {
    board = Object.assign({}, dep.board); CapturedByBlack.set(0); CapturedByWhite.set(0);
    let col = 'black', cb = 0, cw = 0;
    for (let k = 0; k < jetons.length; k++) {
      const legal = getAllMovesForColor(col);
      const mv = resolveAbaProToken(jetons[k], col, legal);
      if (!mv) break;
      const adv = col === 'black' ? 'white' : 'black';
      {   // tous les coups, meme forces (comme computeDecisionProfile)
        const scores = legal.map(function(m){ const u = applyMove(m, col); const s = evaluateBoard(col); undoMove(u); return s; });
        const idJ = canonId(mv), iJ = legal.findIndex(function(m){ return canonId(m) === idJ; });
        if (iJ >= 0) {
          const t = q[col === 'black' ? 0 : 1][_qcMoment(k)];
          const best = Math.max.apply(null, scores), worst = Math.min.apply(null, scores), ecart = best - scores[iJ];
          t[0]++;
          if (ecart <= SEUIL_PROCHE_MEILLEUR) t[1]++;
          if (best - worst > SEUIL_ECART_DECISION_DISPUTEE) { t[2]++; if (ecart <= SEUIL_PROCHE_MEILLEUR) t[3]++; }
          t[5] += Math.round(Math.min(1000, ecart) / 10);
          // bille offerte : le coup joue (sans ejection) permet une ejection, un autre coup legal non
          if (!(mv.info && mv.info.type === 'push' && mv.info.ejection)) {
            const u = applyMove(mv, col), offre = _qcEjectionPossible(adv); undoMove(u);
            if (offre && legal.some(function(m, i){ if (i === iJ) return false; const v = applyMove(m, col), danger = _qcEjectionPossible(adv); undoMove(v); return !danger; })) t[4]++;
          }
        }
      }
      if (abApplyMove(mv.cells, mv.dir, col, mv.info).ejected) { if (col === 'black') { cb++; CapturedByBlack.set(cb); } else { cw++; CapturedByWhite.set(cw); } }
      col = adv;
      if (cb >= 6 || cw >= 6) break;
    }
  } finally { board = sauve.b; CapturedByBlack.set(sauve.cb); CapturedByWhite.set(sauve.cw); }
  return q;
}
</script>
