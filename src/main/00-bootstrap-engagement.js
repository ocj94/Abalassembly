<script>
/* ═══════════════════════════════════════════
   VERSION DE L'APPLICATION — a mettre a jour a CHAQUE release GitHub
   (doit correspondre exactement au tag de la derniere release publiee).
   Affichee dans le pied de page (footer-bottom). Rien n'affichait la
   version nulle part sur le site avant -- seul GitHub (releases/wiki)
   la tracait, invisible pour qui n'y va jamais. Signale par Olivier.
═══════════════════════════════════════════ */
const APP_VERSION = 'v2.45';
(function(){
  const el = document.getElementById('app-version-tag');
  if (el) el.textContent = APP_VERSION;
})();

/* ═══════════════════════════════════════════
   FILET DE SÉCURITÉ GLOBAL — capture les erreurs et rejets non gérés
   Autonome : ne dépend d'AUCUNE autre fonction ni d'aucun élément déjà
   présent dans le DOM (il construit son propre bandeau), pour ne jamais
   « planter dans le plantage ». N'interrompt pas le jeu — informe juste
   l'utilisateur discrètement plutôt que d'échouer en silence dans la
   console. Ajouté après vérification qu'aucun handler global n'existait.
═══════════════════════════════════════════ */
(function(){
  var shown = false;          // un seul bandeau à la fois
  var errorCount = 0;
  function showErrorBanner(){
    if (shown) return; shown = true;
    try {
      var bar = document.createElement('div');
      bar.setAttribute('role', 'alert');
      bar.style.cssText = 'position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:99999;'
        + 'background:#2a1a1a;color:#f0d0d0;border:1px solid #7a3a3a;border-radius:10px;'
        + 'padding:12px 16px;font-family:system-ui,sans-serif;font-size:13px;max-width:90vw;'
        + 'box-shadow:0 8px 30px rgba(0,0,0,0.5);display:flex;align-items:center;gap:12px';
      var txt = document.createElement('span');
      txt.textContent = '⚠️ Une erreur est survenue. Le jeu peut continuer, mais si quelque chose semble bloqué :';
      var reload = document.createElement('button');
      reload.textContent = 'Recharger';
      reload.style.cssText = 'background:#c8a84b;color:#0d0f0e;border:none;border-radius:7px;'
        + 'padding:6px 14px;font-weight:700;cursor:pointer;font-size:13px;white-space:nowrap';
      reload.onclick = function(){ location.reload(); };
      var close = document.createElement('button');
      close.textContent = '✕';
      close.setAttribute('aria-label', 'Fermer');
      close.style.cssText = 'background:none;border:none;color:#f0d0d0;cursor:pointer;font-size:15px;padding:0 4px';
      close.onclick = function(){ if (bar.parentNode) bar.parentNode.removeChild(bar); shown = false; };
      bar.appendChild(txt); bar.appendChild(reload); bar.appendChild(close);
      (document.body || document.documentElement).appendChild(bar);
      // auto-masquage après 12s pour ne pas rester coincé à l'écran
      setTimeout(function(){ if (bar.parentNode) { bar.parentNode.removeChild(bar); shown = false; } }, 12000);
    } catch(e){ shown = false; /* dernier recours silencieux : on n'aggrave rien */ }
  }
  window.addEventListener('error', function(e){
    errorCount++;
    // ignore les erreurs de ressources (images, etc.) qui n'ont pas de message
    if (e && e.message) showErrorBanner();
  });
  window.addEventListener('unhandledrejection', function(e){
    errorCount++;
    showErrorBanner();
  });
  // exposé pour le test / le diagnostic éventuel
  window.__abaErrorCount = function(){ return errorCount; };
})();

/* ═══════════════════════════════════════════
   MOTEUR D'ENGAGEMENT — XP · Streak · Défi quotidien · Badges
   Données persistantes via localStorage (clé: abalone_progress)
═══════════════════════════════════════════ */
const ENGAGE_KEY = 'abalone_progress';

function todayStr() {
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

/* ═══════════════════════════════════════════
   PROBLÈME DU MOIS — dans l'esprit de la tradition d'Abalone Online
   (onlineabalone.wordpress.com/abalone-academy/problemes-abaloniens/).
   Un vrai puzzle miné dans une vraie partie (PUZZLES, pas la banque
   pédagogique de l'Académie), le même pour tout le monde durant tout le
   mois, présenté façon NIVEAU/TRAIT/OBJECTIF, solution cachée jusqu'au clic.
═══════════════════════════════════════════ */
function monthStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}
function monthSeed() {
  const m = monthStr();
  let h = 0;
  for (let i = 0; i < m.length; i++) h = (h * 31 + m.charCodeAt(i)) >>> 0;
  return h;
}
const MONTHLY_LEVEL_LABEL = { 1: 'FACILE', 2: 'MOYEN', 3: 'DIFFICILE' };
/* Export APGN d'un puzzle -- reutilise EXACTEMENT le meme format d'en-tete
   que exportGameNotation() (deja etabli, deja utilise par les vraies
   parties), adapte pour une position figee plutot qu'une sequence de
   coups. Notation des cases via coordToABAPRO(), deja utilisee partout
   ailleurs sur le site -- aucune nouvelle notation inventee. */
function exportPuzzleAPGN(idx){
  const p = PUZZLES[idx];
  if (!p) { showToast('⚠️ Puzzle introuvable'); return; }
  const parseCell = function(s){ const parts = s.split(','); return { r: +parts[0], c: +parts[1] }; };
  const blackCells = p.bm.map(function(s){ const c = parseCell(s); return coordToABAPRO(c.r, c.c); });
  const whiteCells = p.wm.map(function(s){ const c = parseCell(s); return coordToABAPRO(c.r, c.c); });
  const trait = p.c === 'black' ? 'Noirs' : 'Blancs';
  const diffLabel = ['Facile','Moyen','Difficile'][Math.max(0,Math.min(2,(p.d||1)-1))] || ('Niveau '+p.d);

  let header = '[Abalassembly-Puzzle] #' + idx
    + '\n[Source] ' + (p.src || '?')
    + '\n[Difficulte] ' + diffLabel
    + '\n[Trait] ' + trait
    + '\n[Notation] Aba-Pro';
  if (typeof p.gap === 'number') header += '\n[Ecart eval] ' + p.gap;
  header += '\n\n[Noirs] ' + blackCells.join(' ')
          + '\n[Blancs] ' + whiteCells.join(' ')
          + '\n\n[Solution] ' + (p.lab || '?') + '\n';

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(header).then(function(){
      showToast('📋 Puzzle copié (Aba-Pro) !');
    }).catch(function(){
      if (typeof showExportModal === 'function') showExportModal(header);
    });
  } else if (typeof showExportModal === 'function') {
    showExportModal(header);
  }
}

/* Certification d'un puzzle contre le moteur reel du site (pas une simple
   affirmation) : verifie que le coup EXACT annonce (p.sol) est bien un
   coup legal dans la position du puzzle, ET qu'il produit reellement la
   capture revendiquee. Sauvegarde/restaure l'etat global du plateau
   (board/capturedByBlack/capturedByWhite/currentTurn) car applyMove/
   getAllMovesForColor operent dessus directement -- jamais laisser un
   appel de certification affecter la partie en cours de l'utilisateur. */
/* Compte les coups d'une couleur qui capturent immediatement (utilise pour
   verifier les puzzles defensifs : le bon coup doit faire disparaitre
   toute prise immediate pour l'adversaire, pas en creer une pour nous). */
function _countImmediateCaptures(color){
  const moves = getAllMovesForColor(color);
  let n = 0;
  for (let i = 0; i < moves.length; i++){
    if (moves[i].info && moves[i].info.ejection) n++;
  }
  return n;
}

function certifyPuzzle(idx){
  const p = PUZZLES[idx];
  if (!p || !p.sol) return { proved: false, reason: 'no-sol' };
  const savedBoard = board, savedCB = capturedByBlack, savedCW = capturedByWhite, savedTurn = currentTurn;
  try {
    const b = {};
    p.bm.forEach(function(s){ b[s] = 'black'; });
    p.wm.forEach(function(s){ b[s] = 'white'; });
    board = b;
    capturedByBlack = p.cb || 0;
    capturedByWhite = p.cw || 0;
    currentTurn = p.c;

    if (p.multi && p.seq && p.seq.length === 3) {
      // Puzzle MULTI-COUPS (3 demi-coups) : verifie la ligne COMPLETE --
      // coup 1 legal, reponse adverse stockee legale a ce point, coup 2
      // legal ET capturant reellement. Meme logique que la verification
      // independante faite au minage, rejouee ici a chaque certification
      // pour ne jamais dependre d'un etat en cache.
      const opp = p.c === 'black' ? 'white' : 'black';
      const keyOf = function(mv){ return mv.cells.map(function(c){ return c.r+','+c.c; }).sort().join('|'); };

      const legal1 = getAllMovesForColor(p.c);
      const k1 = p.seq[0].cells.map(function(c){ return c.r+','+c.c; }).sort().join('|');
      const m1 = legal1.find(function(m){ return keyOf(m) === k1 && m.dir.q === p.seq[0].dir.q && m.dir.r === p.seq[0].dir.r; });
      if (!m1) return { proved: false, reason: 'illegal-move1' };
      applyMove(m1, p.c);

      const legal2 = getAllMovesForColor(opp);
      const k2 = p.seq[1].cells.map(function(c){ return c.r+','+c.c; }).sort().join('|');
      const m2 = legal2.find(function(m){ return keyOf(m) === k2 && m.dir.q === p.seq[1].dir.q && m.dir.r === p.seq[1].dir.r; });
      if (!m2) return { proved: false, reason: 'illegal-reply' };
      applyMove(m2, opp);

      const legal3 = getAllMovesForColor(p.c);
      const k3 = p.seq[2].cells.map(function(c){ return c.r+','+c.c; }).sort().join('|');
      const m3 = legal3.find(function(m){ return keyOf(m) === k3 && m.dir.q === p.seq[2].dir.q && m.dir.r === p.seq[2].dir.r; });
      if (!m3) return { proved: false, reason: 'illegal-move2' };
      const baseCap = p.c === 'black' ? capturedByBlack : capturedByWhite;
      applyMove(m3, p.c);
      const afterCap = p.c === 'black' ? capturedByBlack : capturedByWhite;
      const gained = afterCap - baseCap;
      return { proved: gained >= 1, reason: gained >= 1 ? 'ok-multi' : 'no-gain', gained: gained };
    }

    const solKey = p.sol.cells.map(function(c){ return c.r+','+c.c; }).sort().join('|');
    const legalMoves = getAllMovesForColor(p.c);
    const found = legalMoves.find(function(m){
      const mKey = m.cells.map(function(c){ return c.r+','+c.c; }).sort().join('|');
      return mKey === solKey && m.dir.q === p.sol.dir.q && m.dir.r === p.sol.dir.r;
    });
    if (!found) return { proved: false, reason: 'illegal' };

    const opponent = p.c === 'black' ? 'white' : 'black';

    if (p.def) {
      // Puzzle DEFENSIF : le bon coup doit faire disparaitre toute prise
      // immediate pour l'adversaire (pas de gain pour nous attendu ici).
      const undo = applyMove(found, p.c);
      const remainingThreats = _countImmediateCaptures(opponent);
      undoMove(undo);
      return { proved: remainingThreats === 0, reason: remainingThreats === 0 ? 'ok-def' : 'threat-remains', remainingThreats: remainingThreats };
    }

    // Puzzle OFFENSIF (par defaut) : le coup doit capturer immediatement.
    const baseCap = p.c === 'black' ? capturedByBlack : capturedByWhite;
    const undo = applyMove(found, p.c);
    const afterCap = p.c === 'black' ? capturedByBlack : capturedByWhite;
    undoMove(undo);
    const gained = afterCap - baseCap;
    return { proved: gained >= 1, reason: gained >= 1 ? 'ok' : 'no-gain', gained: gained };
  } finally {
    board = savedBoard; capturedByBlack = savedCB; capturedByWhite = savedCW; currentTurn = savedTurn;
  }
}

/* Certifie tous les puzzles, cache le resultat en localStorage pour ne pas
   refaire le calcul a chaque visite. Rapide (verification directe, pas de
   recherche recursive) -- peut tourner sur les 138 puzzles sans bloquer
   la page de facon genante. */
function certifyAllPuzzles(){
  const results = {};
  for (let i = 0; i < PUZZLES.length; i++){
    try { results[i] = certifyPuzzle(i).proved; }
    catch(e){ results[i] = false; }
  }
  try { localStorage.setItem('abaPuzzleCertified', JSON.stringify(results)); } catch(e){}
  return results;
}
function isPuzzleCertified(idx){
  try {
    const cached = JSON.parse(localStorage.getItem('abaPuzzleCertified') || '{}');
    return cached[idx] === true;
  } catch(e){ return false; }
}

function currentMonthlyPuzzle() {
  const m = monthStr();
  if (!progress.monthly || progress.monthly.month !== m) {
    // Uniquement les puzzles 1-coup : les puzzles multi-coups (ajoutes a la
    // fin de PUZZLES) ne sont pas compatibles avec le flux de resolution
    // interactif (clic-glisser -> 1 seul coup attendu). Ils ont leur propre
    // section de consultation, separee.
    const idx = monthSeed() % SINGLE_MOVE_PUZZLE_COUNT;
    progress.monthly = { month: m, idx: idx, solved: false, revealed: false };
    saveProgress(progress);
  }
  const idx = progress.monthly.idx;
  const p = PUZZLES[idx];
  return {
    idx: idx, puzzle: p,
    niveau: MONTHLY_LEVEL_LABEL[p.d] || 'MOYEN',
    trait: p.c === 'black' ? 'NOIR' : 'BLANC',
    objectif: p.def ? 'PARER LA MENACE' : 'TROUVER LE COUP GAGNANT',
    solved: !!progress.monthly.solved,
    revealed: !!progress.monthly.revealed,
  };
}
function playMonthlyPuzzle() {
  const mc = currentMonthlyPuzzle();
  showPage('puzzles');
  if (typeof startPuzzle === 'function') startPuzzle(mc.idx);
}
function revealMonthlySolution() {
  progress.monthly.revealed = true;
  saveProgress(progress);
  renderMonthlyCard();
}
function checkMonthlyCompletion(solvedIdx) {
  const mc = currentMonthlyPuzzle();
  if (solvedIdx === mc.idx && !progress.monthly.solved) {
    progress.monthly.solved = true;
    saveProgress(progress);
    addXp(80, 'Problème du mois résolu');
    if (typeof awardBadge === 'function') awardBadge('monthly_' + mc.idx);
    setTimeout(function(){ showToast('🏆 Problème du mois résolu ! +80 XP'); }, 700);
    renderMonthlyCard();
  }
}
function renderMonthlyCard() {
  const host = document.getElementById('monthly-puzzle-card');
  if (!host) return;
  const mc = currentMonthlyPuzzle();
  const src = mc.puzzle.src || '';
  const certified = (typeof isPuzzleCertified === 'function') && isPuzzleCertified(mc.idx);
  host.innerHTML =
    '<div style="font-size:11px;letter-spacing:1px;color:var(--muted);margin-bottom:10px">' +
      'NIVEAU : <strong style="color:var(--gold)">' + mc.niveau + '</strong> &nbsp;·&nbsp; ' +
      'TRAIT : <strong style="color:var(--gold)">' + mc.trait + '</strong> &nbsp;·&nbsp; ' +
      'OBJECTIF : <strong style="color:var(--gold)">' + mc.objectif + '</strong>' +
      (certified ? ' &nbsp;·&nbsp; <span style="color:#5ab48c" title="Coup vérifié directement contre le moteur du site">🏅 Certifié</span>' : '') +
    '</div>' +
    (mc.solved ? '<div style="color:#5ab48c;font-size:13px;margin-bottom:10px">✅ Résolu ce mois-ci</div>' : '') +
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">' +
      '<button class="ctrl-btn" onclick="playMonthlyPuzzle()">▶ Jouer le problème du mois</button>' +
      (mc.revealed ? '' : '<button class="ctrl-btn" onclick="revealMonthlySolution()">👁 Voir la solution</button>') +
      '<button class="ctrl-btn" onclick="exportPuzzleAPGN(' + mc.idx + ')" title="Copie la position et la solution au format Aba-Pro">📋 Exporter (APGN)</button>' +
    '</div>' +
    (mc.revealed ? '<div style="font-size:13px;color:var(--text);padding:10px;background:var(--surface2);border-radius:8px">Solution : <strong style="color:var(--gold)">' + mc.puzzle.lab + '</strong>' + (src ? '<br><span style="color:var(--muted);font-size:12px">Issu de la partie : ' + src + '</span>' : '') + '</div>' : '');
}
function daysBetween(a, b) {
  const da = new Date(a), db = new Date(b);
  return Math.round((db - da) / 86400000);
}

function defaultProgress() {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    bestStreak: 0,
    lastActive: null,
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    gamesDraw: 0,
    // Métriques de jeu (alimentent le radar de profil)
    totalMoves: 0,          // total de coups joués
    totalEjections: 0,      // billes adverses éjectées
    totalPushes: 0,         // poussées réussies
    pushAttempts: 0,        // tentatives de poussée
    bestMoves: 0,           // coups jugés "optimaux"
    fastMoves: 0,           // coups joués rapidement
    centerTurns: 0,         // tours avec contrôle du centre
    cohesionSum: 0,         // somme des scores de cohésion (0..1) par coup
    leadGames: 0,           // parties où le joueur a mené
    leadWins: 0,            // parties menées ET gagnées (conversion)
    broadsideMoves: 0,      // coups latéraux (axe Jeu de flanc)
    firstEjSum: 0, firstEjGames: 0,    // tempo : coup de la 1re éjection
    compactSum: 0, compactSamples: 0,  // compacité géo. échantillonnée
    oppGroupSum: 0, oppGroupSamples: 0,// fragmentation adverse échantillonnée
    showRadar: true,        // afficher le radar perso dans les stats
    puzzlesSolved: 0,
    dailyDone: null,        // date du dernier défi complété
    eloHistory: [],         // [{date, elo}]
    elo: 1000,
    badges: {},             // {badgeId: dateObtenu}
    history: [],            // [{date, xp}] pour la courbe
    referralCode: null,     // code de parrainage unique du joueur
    referrals: 0,           // nombre de parrainages réussis
    referredBy: null,       // code utilisé à l'inscription
    // ── HEATMAPS PAR JOUEUR (structure évolutive pour le futur multijoueur) ──
    // Indexées par identité de joueur. Aujourd'hui, sans comptes, on utilise
    // 'me' (le joueur local) et 'opponent' (adversaires locaux + IA agrégés).
    // Plus tard, la clé sera l'ID du compte de chaque joueur, et la heatmap
    // le suivra sur toutes ses parties (point de raccordement backend).
    heatmaps: {}            // { playerId: { "r,c": nbFois } }
  };
}

// Identité du joueur local (deviendra l'ID de compte avec le backend)
function localPlayerId() {
  // Aujourd'hui : un seul joueur local. Plus tard : ID du compte connecté.
  return 'me';
}

// Récupère (ou crée) la heatmap d'un joueur donné
function getPlayerHeatmap(playerId) {
  if (!progress.heatmaps) progress.heatmaps = {};
  if (!progress.heatmaps[playerId]) progress.heatmaps[playerId] = {};
  return progress.heatmaps[playerId];
}

/* Cette couleur est-elle jouée par le joueur local ?
   - mode « vs IA » : seulement sa couleur (humanColor)
   - mode « 2 joueurs » même écran : les deux camps sont locaux, donc les deux
   Sert à ranger les coups dans MA carte noire ou MA carte blanche. */
function isMyColor(color) {
  if (typeof GameMode !== 'undefined' && GameMode.get() === 'local') return true;
  const hc = (typeof HumanColor !== 'undefined') ? HumanColor.get() : 'black';
  return color === hc;
}

// Enregistre des cases jouées dans la heatmap d'un joueur (cumulé sur toutes ses parties)
/* Variantes suivies par la carte de chaleur. Chaque coup du joueur est
   comptabilise deux fois : dans le cumul GLOBAL (me_black / me_white) et dans
   le seau de la variante en cours (me_black@belgian, etc.). On peut ainsi
   comparer ses habitudes selon la position de depart, qui change beaucoup le
   jeu. Demande d'Olivier. */
const HEAT_VARIANTS = ['standard','belgian','german','dutch','swiss','decouverte','69','fujiyama','the_wall','star','face_a_face','alliances','domination','atomouche','centrifuge','snakes_variant','snakes','alien','korean_daisy','anglattack'];
const HEAT_VARIANT_LABEL = { standard:'Standard', belgian:'Belgian Daisy', german:'German Daisy',
  dutch:'Dutch Daisy', swiss:'Swiss Daisy', decouverte:'D\u00e9couverte', '69':'69', fujiyama:'Fujiyama', the_wall:'The Wall', star:'Star', face_a_face:'Face à face', alliances:'Alliances', domination:'Domination', atomouche:'Atomouche', centrifuge:'Centrifugeuse', snakes_variant:'Snakes variant', snakes:'Snakes', alien:'Alien', korean_daisy:'Korean Daisy', anglattack:'Anglattack' };

function recordMyHeat(color, cells) {
  if (typeof isMyColor === 'function' && !isMyColor(color)) return;
  recordHeatmapForPlayer('me_' + color, cells);                     // cumul global
  const v = (typeof currentLayout !== 'undefined') ? currentLayout : 'standard';
  if (HEAT_VARIANTS.indexOf(v) >= 0) recordHeatmapForPlayer('me_' + color + '@' + v, cells);
}

function recordHeatmapForPlayer(playerId, cells) {
  if (!playerId || !cells || !cells.length) return;
  const hm = getPlayerHeatmap(playerId);
  cells.forEach(function(cell){
    const k = cell.r + ',' + cell.c;
    hm[k] = (hm[k] || 0) + 1;
  });
  saveProgress(progress);
}

