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
  if (entry.spectateur) return 'Partie consultée — ' + (entry.blackName||'?') + ' vs ' + (entry.whiteName||'?');
  if (entry.mode === 'import') return 'Partie importée' + ((entry.blackName || entry.whiteName) ? ' — ' + (entry.blackName||'?') + ' vs ' + (entry.whiteName||'?') : '');
  if (entry.mode === 'local') return (entry.blackName || entry.whiteName) ? 'Partie par code/direct' : 'Local (même écran)';
  const styleLabels = { auto:'Auto', aggressive:'Agressif', defensive:'Défensif', divide:'Division', balanced:'Équilibré', kaah:'KAAH', humain:'Humain (Labo)', contremoi:'Contre moi (Labo)' };
  const style = styleLabels[entry.aiStyle] || entry.aiStyle || '?';
  // anciennes parties ("hard"...) affichees avec leur numero : meme niveau, renomme
  const _n = _niveauIA(entry.aiDiff);
  const diff = _n ? 'Niveau ' + _n : (entry.aiDiff || '?');
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
      moveCount: (typeof MoveCount !== 'undefined') ? MoveCount.get() : 0,
      aiStyle: (mode === 'ai' && typeof _setupCfg !== 'undefined') ? _setupCfg.style : null,
      aiDiff: (mode === 'ai' && typeof _setupCfg !== 'undefined') ? _setupCfg.diff : null,
      // 'actuel' si _engineMode est vide (null/undefined), meme convention que
      // _setupCfg.engine -- necessaire pour les stats moteur personnelles.
      engine: (mode === 'ai') ? ((typeof _engineMode !== 'undefined' && _engineMode) ? _engineMode : 'actuel') : null,
      blackName: (typeof gcBlackName !== 'undefined') ? gcBlackName : '',
      whiteName: (typeof gcWhiteName !== 'undefined') ? gcWhiteName : '',
      code: code
    };
    // evaluations de l'IA, coup par coup (0 = coup sans evaluation) : [score, profondeur, temps ms, phase]
    const _ev = (typeof boardSnapshots !== 'undefined') ? boardSnapshots.map(function(s){ return s.ia ? [s.ia.e, s.ia.p, s.ia.t, (s.ia.ph || '').charAt(0)] : 0; }) : [];
    if (_ev.some(function(x){ return x; })) entry.evals = _ev;
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
/* Parties "consultees" : importees d'un tournoi ou d'une autre source, mais
   jouees par D'AUTRES joueurs. Elles restent dans l'historique pour etre
   rejouees, mais n'entrent dans aucune statistique personnelle -- sans ce
   filtre, importer 85 parties d'un tournoi les comptait toutes comme les
   tiennes (ejections, noir/blanc, profil de decision, carte d'activite). */
function estMaPartie(e){ return !(e && e.spectateur); }
function getMesParties(){ return getGameHistory().filter(estMaPartie); }

/* Le resultat de TA partie (v2.68) : 'victoire', 'defaite', 'nulle', ou null
   (partie consultee, partie a deux sur le meme ecran, resultat inconnu).
   Avant, seules les parties contre l'IA en avaient un : une partie importee
   ou l'on sait quel camp tu tenais et qui a gagne (KAAH...) affichait « — ».
   Signale par Olivier, capture a l'appui. */
function _histMonResultat(e){
  if (!e || e.spectateur) return null;
  if (e.mode === 'ai') return !e.winner ? 'nulle' : (e.winner === e.humanColor ? 'victoire' : 'defaite');
  if (e.mode === 'import' && (e.humanColor === 'black' || e.humanColor === 'white')) {
    if (e.winner === 'black' || e.winner === 'white') return e.winner === e.humanColor ? 'victoire' : 'defaite';
    return e.nulle ? 'nulle' : null;
  }
  return null;
}
/* La date d'une partie, lue en heure LOCALE (v2.68). Une partie importee avec
   une date sans heure (« # 2026-10-22 · ... ») etait enregistree a minuit UTC,
   donc affichee « 02:00 » a Paris -- une heure inventee. Maintenant : l'heure
   de l'en-tete si elle y est (« 2026-10-22 06:41 »), sinon la date seule.
   Les parties importees avant la v2.68 (minuit UTC pile, sans le champ
   heureInconnue) sont reconnues et gardent leur jour d'origine. */
function _histSansHeure(e){
  return !!e && (e.heureInconnue === true || (e.heureInconnue === undefined && e.mode === 'import' && /T00:00:00\.000Z$/.test(String(e.date))));
}
function _histJour(e){
  const d = new Date(e && e.date);
  if (isNaN(d.getTime())) return null;
  const ancien = e.heureInconnue === undefined && _histSansHeure(e);   // jour lu en UTC, comme il avait ete ecrit
  return { a: ancien ? d.getUTCFullYear() : d.getFullYear(), m: (ancien ? d.getUTCMonth() : d.getMonth()) + 1, j: ancien ? d.getUTCDate() : d.getDate(),
           h: d.getHours(), mn: d.getMinutes(), sansHeure: _histSansHeure(e) };
}
// « 2026-10-22 06:41 », ou « 2026-10-22 » si l'heure n'est pas connue (en-tete d'export)
function _histDateTexte(e){
  const t = _histJour(e); if (!t) return '';
  const z = function(n){ return (n < 10 ? '0' : '') + n; };
  return t.a + '-' + z(t.m) + '-' + z(t.j) + (t.sansHeure ? '' : ' ' + z(t.h) + ':' + z(t.mn));
}

function deleteGameHistoryEntry(id){
  try {
    const h = getGameHistory();
    // v2.69 : supprimee ici, elle le sera aussi sur tes autres appareils a la prochaine synchro
    if (typeof _syncNoterSuppression === 'function') _syncNoterSuppression(h.filter(function(e){ return e.id === id; }).map(function(e){ return e.code; }));
    const list = h.filter(function(e){ return e.id !== id; });
    localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(list));
  } catch(e){}
}

function clearGameHistory(){
  try { if (typeof _syncNoterSuppression === 'function') _syncNoterSuppression(getGameHistory().map(function(e){ return e.code; })); } catch(e){}
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
      const r = _histMonResultat(e);   // v2.68 : les parties importees ou l'on sait ton camp comptent aussi
      const won = r === 'victoire';
      const lost = r === 'defaite';
      const draw = r === 'nulle' || (r === null && e.mode !== 'import' && !e.winner);
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
  GameOver.set(true);
  if (typeof disarmInactivityCancel === 'function') disarmInactivityCancel();
  try{ localStorage.setItem('abaGamesFinished', String((parseInt(localStorage.getItem('abaGamesFinished')||'0',10)||0)+1)); }catch(e){}
  _emitAbaEvent('gameOver', { winner: winner, reason: reason || null,
    capturedByBlack: CapturedByBlack.get(), capturedByWhite: CapturedByWhite.get(), moveCount: MoveCount.get() });
  /* Previent qui a quitte l'onglet pendant la partie. Sans effet si la page
     est au premier plan : l'ecran affiche deja le resultat. */
  (function(){
    const moi = (typeof monCamp === 'function') ? monCamp() : 'black';
    const issue = (winner === moi) ? 'Vous gagnez !' : 'Vous perdez.';
    notifierSiAbsent('finPartie', 'Partie terminée', issue);
  })();
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
  /* Le joueur n'a pas toujours les Noirs. Avant : "Noirs = moi" code en dur ici --
     une victoire AVEC LES BLANCS s'affichait « Défaite… » et comptait comme une
     DEFAITE (ELO, XP, serie, conversion, badge). Constate par simulation et
     signale a Olivier, qui joue souvent les Blancs. On suit monCamp(), le point
     de verite unique du camp tenu (mode IA : la couleur choisie ; deux joueurs
     sur le meme ecran : convention Noirs = joueur local, comme partout ailleurs). */
  const moi = (typeof monCamp === 'function') ? monCamp() : 'black';
  const jeGagne = (winner === moi);
  const deuxJoueurs = (typeof GameMode !== 'undefined' && GameMode.get() === 'local');
  const nomCamp = function(x){ return x === 'black' ? 'Noirs' : 'Blancs'; };
  if (typeof kidsMode !== 'undefined' && kidsMode) {
    // Mode Enfant : jamais de vocabulaire "défaite" — on valide toujours
    // l'effort, on invite à rejouer, peu importe le résultat.
    if (jeGagne) {
      title.textContent = 'Bravo, tu as gagné ! 🎉';
      sub.textContent = 'Belle partie, bien joué !';
    } else {
      title.textContent = 'Belle partie ! 💪';
      sub.textContent = 'Cette fois c\'est l\'autre camp qui gagne — à toi de rejouer !';
    }
  } else if (deuxJoueurs) {
    // deux joueurs sur le meme ecran : ni « victoire » ni « defaite », le camp gagnant
    title.textContent = 'Les ' + nomCamp(winner) + ' gagnent !';
    sub.textContent = reason === 'resign' ? 'Les ' + nomCamp(winner === 'black' ? 'white' : 'black') + ' ont abandonné.'
                    : 'Les ' + nomCamp(winner) + ' ont éjecté 6 billes adverses.';
  } else if (jeGagne) {
    title.textContent = 'Victoire !';
    sub.textContent = reason === 'resign' ? 'Votre adversaire a abandonné.' : 'Vous avez éjecté 6 billes adverses !';
  } else {
    title.textContent = 'Défaite…';
    sub.textContent = reason === 'resign' ? 'Vous avez abandonné.' : 'L\'adversaire a éjecté 6 de vos billes.';
  }
  overlay.classList.add('show');
  // v2.63 : une ligne tiree du tableau des remontees des vraies parties (vide en mode Enfant ou si aucune bille n'est tombee)
  (function(){
    const rep = document.getElementById('win-repere');
    if (!rep || typeof _sbRepereFinDePartie !== 'function') return;
    rep.textContent = '';
    ensureStatsParties().then(function(){ rep.textContent = _sbRepereFinDePartie(winner, moi, deuxJoueurs); });
  })();
  if (typeof renderStyleCard === 'function') renderStyleCard();   // carte d'analyse de style
  if (typeof renderHeatmapCard === 'function') renderHeatmapCard();   // carte de chaleur de la partie
  // ── Hook engagement : XP, streak, ELO, badges ──
  sanitizeProgress();
  // ── Taux de conversion : le joueur a-t-il mené puis gagné ? ──
  const mesEj = (moi === 'black') ? CapturedByBlack.get() : CapturedByWhite.get();
  const sesEj = (moi === 'black') ? CapturedByWhite.get() : CapturedByBlack.get();
  if ((progress.__hadLead || mesEj > 0) && !(typeof MoveCount !== 'undefined' && MoveCount.get() === 0)) {
    progress.leadGames = (progress.leadGames||0) + 1;
    if (jeGagne) progress.leadWins = (progress.leadWins||0) + 1;
    progress.__hadLead = false;
    saveProgress(progress);
  }
  if (typeof onGamePlayed === 'function' && !(typeof MoveCount !== 'undefined' && MoveCount.get() === 0)) {
    onGamePlayed(jeGagne);
  }
  // Partie sans aucun coup joué (abandon immédiat, annulation) : aucun ELO
  // retiré, aucune stat comptée — idée d'Olivier. On informe juste discrètement.
  if (typeof MoveCount !== 'undefined' && MoveCount.get() === 0) {
    if (typeof showToast === 'function') showToast('Partie annulée — aucun coup joué, ELO inchangé');
  }
  // Badge Blanchissage : le joueur gagne 6-0 sans avoir perdu une seule bille
  if (jeGagne && sesEj === 0 && typeof awardBadge === 'function') {
    awardBadge('shutout');
    showToast('🧺 Blanchissage ! Victoire 6-0 sans perdre une bille !');
  }
}



