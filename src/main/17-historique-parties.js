/* ═══════════════════════════════════════════
   HISTORIQUE DE PARTIES — consultable, filtrable, rejouable.
   Reutilise gameCodeEncode() pour stocker chaque partie de facon compacte
   (le meme format que "Partie par code", deja teste et fiable) plutot que
   de sauvegarder les snapshots complets du plateau a chaque coup -- une
   partie de 60 coups tient en quelques centaines d'octets, pas des
   dizaines de kilo-octets.
   Plafonne a HIST_MAX parties (les plus recentes) pour eviter une
   croissance illimitee de localStorage. */
const GAME_HISTORY_KEY = 'abaGameHistory';
const HIST_MAX = 200;

function _historyOpponentLabel(entry){
  if (entry.mode === 'import') return 'Partie importée' + ((entry.blackName || entry.whiteName) ? ' — ' + (entry.blackName||'?') + ' vs ' + (entry.whiteName||'?') : '');
  if (entry.mode === 'local') return (entry.blackName || entry.whiteName) ? 'Partie par code/direct' : 'Local (même écran)';
  const styleLabels = { auto:'Auto', aggressive:'Agressif', defensive:'Défensif', divide:'Division', balanced:'Équilibré' };
  const diffLabels = { easy:'Facile', medium:'Moyen', advanced:'Avancé', hard:'Expert', master:'Maître', minimax:'Minimax' };
  const style = styleLabels[entry.aiStyle] || entry.aiStyle || '?';
  const diff = diffLabels[entry.aiDiff] || entry.aiDiff || '?';
  return 'IA ' + style + ' — ' + diff;
}

function _recordGameHistory(winner, reason){
  try {
    if (typeof gameCodeEncode !== 'function') return;
    const code = gameCodeEncode();
    if (!code) return; // aucun coup joue -- rien a enregistrer
    const mode = (typeof GameMode !== 'undefined') ? GameMode.get() : 'ai';
    const entry = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2,7),
      date: new Date().toISOString(),
      variant: (typeof currentLayout !== 'undefined') ? currentLayout : 'standard',
      mode: mode,
      humanColor: (typeof HumanColor !== 'undefined') ? HumanColor.get() : 'black',
      winner: winner || null,
      reason: reason || null,
      moveCount: (typeof moveCount !== 'undefined') ? moveCount : 0,
      aiStyle: (mode === 'ai' && typeof _setupCfg !== 'undefined') ? _setupCfg.style : null,
      aiDiff: (mode === 'ai' && typeof _setupCfg !== 'undefined') ? _setupCfg.diff : null,
      // 'actuel' si _engineMode est vide (null/undefined), meme convention que
      // _setupCfg.engine -- necessaire pour les stats moteur personnelles.
      engine: (mode === 'ai') ? ((typeof _engineMode !== 'undefined' && _engineMode) ? _engineMode : 'actuel') : null,
      blackName: (typeof gcBlackName !== 'undefined') ? gcBlackName : '',
      whiteName: (typeof gcWhiteName !== 'undefined') ? gcWhiteName : '',
      code: code
    };
    let list = [];
    try { list = JSON.parse(localStorage.getItem(GAME_HISTORY_KEY) || '[]'); } catch(e){ list = []; }
    list.unshift(entry); // la plus recente en tete
    if (list.length > HIST_MAX) list = list.slice(0, HIST_MAX);
    localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(list));
  } catch(e) { /* stockage indisponible ou plein -- ne bloque jamais la fin de partie pour autant */ }
}

function getGameHistory(){
  try { return JSON.parse(localStorage.getItem(GAME_HISTORY_KEY) || '[]'); } catch(e) { return []; }
}

function deleteGameHistoryEntry(id){
  try {
    const list = getGameHistory().filter(function(e){ return e.id !== id; });
    localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(list));
  } catch(e){}
}

function clearGameHistory(){
  try { localStorage.removeItem(GAME_HISTORY_KEY); } catch(e){}
}

/* Filtre en memoire -- pas besoin d'index, HIST_MAX=200 parties suffit
   largement pour un filtrage lineaire instantane. */
function filterGameHistory(opts){
  opts = opts || {};
  return getGameHistory().filter(function(e){
    if (opts.variant && opts.variant !== 'all' && e.variant !== opts.variant) return false;
    if (opts.mode && opts.mode !== 'all' && e.mode !== opts.mode) return false;
    if (opts.result && opts.result !== 'all') {
      const isAI = e.mode === 'ai';
      const won = isAI && e.winner === e.humanColor;
      const lost = isAI && e.winner && e.winner !== e.humanColor;
      const draw = !e.winner;
      if (opts.result === 'victoire' && !won) return false;
      if (opts.result === 'defaite' && !lost) return false;
      if (opts.result === 'nulle' && !draw) return false;
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      const hay = [e.variant, e.blackName, e.whiteName, e.date].join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

function triggerWin(winner, reason) {
  // ── Garde anti-triche : refuse une victoire incohérente ──
  if (!reason && !winIntegrityOK(winner)) {
    if (!boardIntegrityOK()) {
      showToast('⚠️ Incohérence détectée — partie réinitialisée');
      resetGame();
      return;
    }
    // sinon on ignore simplement le déclenchement suspect
    return;
  }
  gameOver = true;
  if (typeof disarmInactivityCancel === 'function') disarmInactivityCancel();
  try{ localStorage.setItem('abaGamesFinished', String((parseInt(localStorage.getItem('abaGamesFinished')||'0',10)||0)+1)); }catch(e){}
  _emitAbaEvent('gameOver', { winner: winner, reason: reason || null,
    capturedByBlack: capturedByBlack, capturedByWhite: capturedByWhite, moveCount: moveCount });
  if (typeof updateHeroStats==='function') updateHeroStats();
  if (typeof _tourneyMatch!=='undefined' && _tourneyMatch && typeof tourneyMatchEnd==='function') { tourneyMatchEnd(winner, reason); }
  clearInterval(timerInterval);
  stopGameTimer();      // arrête le chronomètre de partie
  _recordGameHistory(winner, reason);   // archive AVANT d'effacer la sauvegarde de reprise
  clearSavedGame();     // partie terminée = efface la sauvegarde
  soundWin();  // 🔊 fanfare de victoire
  const overlay = document.getElementById('win-overlay');
  const title = document.getElementById('win-title');
  const sub = document.getElementById('win-sub');
  if (typeof kidsMode !== 'undefined' && kidsMode) {
    // Mode Enfant : jamais de vocabulaire "défaite" — on valide toujours
    // l'effort, on invite à rejouer, peu importe le résultat.
    if (winner === 'black') {
      title.textContent = 'Bravo, tu as gagné ! 🎉';
      sub.textContent = 'Belle partie, bien joué !';
    } else {
      title.textContent = 'Belle partie ! 💪';
      sub.textContent = 'Cette fois c\'est l\'autre camp qui gagne — à toi de rejouer !';
    }
  } else if (winner === 'black') {
    title.textContent = 'Victoire !';
    sub.textContent = `Vous avez éjecté 6 billes adverses !`;
  } else {
    title.textContent = 'Défaite…';
    sub.textContent = 'L\'adversaire a éjecté 6 de vos billes.';
  }
  overlay.classList.add('show');
  if (typeof renderStyleCard === 'function') renderStyleCard();   // carte d'analyse de style
  if (typeof renderHeatmapCard === 'function') renderHeatmapCard();   // carte de chaleur de la partie
  // ── Hook engagement : XP, streak, ELO, badges ──
  sanitizeProgress();
  // ── Taux de conversion : le joueur a-t-il mené puis gagné ? ──
  if ((progress.__hadLead || capturedByBlack > 0) && !(typeof moveCount !== 'undefined' && moveCount === 0)) {
    progress.leadGames = (progress.leadGames||0) + 1;
    if (winner === 'black') progress.leadWins = (progress.leadWins||0) + 1;
    progress.__hadLead = false;
    saveProgress(progress);
  }
  if (typeof onGamePlayed === 'function' && !(typeof moveCount !== 'undefined' && moveCount === 0)) {
    onGamePlayed(winner === 'black');
  }
  // Partie sans aucun coup joué (abandon immédiat, annulation) : aucun ELO
  // retiré, aucune stat comptée — idée d'Olivier. On informe juste discrètement.
  if (typeof moveCount !== 'undefined' && moveCount === 0) {
    if (typeof showToast === 'function') showToast('Partie annulée — aucun coup joué, ELO inchangé');
  }
  // Badge Blanchissage : le joueur gagne 6-0 sans avoir perdu une seule bille
  if (winner === 'black' && capturedByWhite === 0 && typeof awardBadge === 'function') {
    awardBadge('shutout');
    showToast('🧺 Blanchissage ! Victoire 6-0 sans perdre une bille !');
  }
}



