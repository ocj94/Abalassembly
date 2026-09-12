/* ═══════════════════════════════════════════
   ANTI-TRICHE / INTÉGRITÉ
   Vérifie la cohérence de l'état avant de valider
   une victoire ou de créditer de l'XP. Empêche les
   manipulations triviales (console, édition du score).
═══════════════════════════════════════════ */
let gameStartTime = Date.now();

function countMarbles() {
  let black = 0, white = 0;
  for (const k in board) {
    if (board[k] === 'black') black++;
    else if (board[k] === 'white') white++;
  }
  return { black, white };
}

function boardIntegrityOK() {
  const { black, white } = countMarbles();
  // Jamais plus de 14 billes par couleur, et le compte éjecté doit concorder
  if (black > 14 || white > 14) return false;
  if (black + CapturedByWhite.get() > 14) return false;   // blancs ont éjecté des noirs
  if (white + CapturedByBlack.get() > 14) return false;
  if (CapturedByBlack.get() < 0 || CapturedByWhite.get() < 0) return false;
  if (CapturedByBlack.get() > 6 || CapturedByWhite.get() > 6) return false;
  return true;
}

function winIntegrityOK(winner) {
  // Une vraie victoire exige 6 éjections et un minimum de coups/temps
  const caps = winner === 'black' ? CapturedByBlack.get() : CapturedByWhite.get();
  if (caps < 6) return false;
  // Il faut au moins 6 coups pour éjecter 6 billes (en réalité bien plus)
  if (MoveCount.get() < 6) return false;
  // Partie anormalement instantanée (< 3 s) = manipulation probable
  if (Date.now() - gameStartTime < 3000) return false;
  return boardIntegrityOK();
}

function progressIntegrityOK(p) {
  if (!p) return false;
  // Bornes de cohérence
  if (p.gamesWon > p.gamesPlayed) return false;
  if ((p.gamesWon||0) + (p.gamesLost||0) + (p.gamesDraw||0) > p.gamesPlayed) return false;
  if (p.xp < 0 || p.level < 1) return false;
  if (p.elo < 0 || p.elo > 4000) return false;        // ELO plausible
  if (p.streak < 0 || p.streak > 3650) return false;
  // Le niveau doit correspondre à l'XP (tolérance ±1)
  if (typeof levelFromXp === 'function') {
    const expected = levelFromXp(p.xp);
    if (Math.abs(p.level - expected) > 1) return false;
  }
  return true;
}

function sanitizeProgress() {
  // Recale la progression si une incohérence est détectée
  if (!progressIntegrityOK(progress)) {
    if (progress.gamesWon > progress.gamesPlayed) progress.gamesPlayed = progress.gamesWon;
    if (progress.xp < 0) progress.xp = 0;
    if (typeof levelFromXp === 'function') progress.level = levelFromXp(progress.xp);
    progress.elo = Math.min(4000, Math.max(0, progress.elo || 1000));
    progress.streak = Math.max(0, Math.min(3650, progress.streak || 0));
    saveProgress(progress);
  }
}

