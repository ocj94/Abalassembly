/* ═══════════════════════════════════════════
   SECURITY SCORE
═══════════════════════════════════════════ */
/* Test reel du chiffrement, pas une supposition. Round-trip encrypt+decrypt
   ne suffit PAS a lui seul : SEC.encrypt/decrypt ont chacun un repli
   silencieux vers du JSON en clair en cas d'echec (voir plus haut), et ce
   repli redonne aussi la bonne valeur au dechiffrement -- un simple
   aller-retour reussi ne distingue donc PAS "vrai AES-GCM" de "repli en
   clair". Le repli renvoie EXACTEMENT JSON.stringify(valeur) ; un vrai
   chiffre AES-GCM (IV aleatoire + ciphertext, encode en base64) ne peut pas
   coincider avec ca. Comparer les deux separe donc reellement les deux cas. */
async function _testEncryptionWorks(){
  try {
    if (typeof crypto === 'undefined' || !crypto.subtle) return false;
    const testVal = 'sec-selftest-' + Math.random().toString(36).slice(2);
    const enc = await SEC.encrypt(testVal);
    if (enc === JSON.stringify(testVal)) return false; // repli en clair détecté
    const dec = await SEC.decrypt(enc);
    return dec === testVal;
  } catch(e) { return false; }
}
async function computeSecurityScore() {
  const u = currentUser;
  const encryptionOk = await _testEncryptionWorks();
  const items = [
    { label:'Mot de passe hashé PBKDF2', ok: u && !!u.passwordHash, points:20 },
    { label:'Token de session HMAC', ok: u && !!u._token && SEC.validateToken(u._token), points:20 },
    { label:'localStorage chiffré AES-GCM' + (encryptionOk ? '' : ' — indisponible sur ce navigateur'), ok: encryptionOk, points:20 },
    { label:'Double authentification active', ok: u && u.twofa && u.twofa.length > 0, points:25 },
    { label:'YubiKey / FIDO2 configuré', ok: u && u.twofa && u.twofa.includes('yubikey'), points:15 },
  ];

  const score = items.reduce(function(sum, i){ return sum + (i.ok ? i.points : 0); }, 0);
  const color = score >= 80 ? 'var(--accent-green-light)' : score >= 50 ? 'var(--gold)' : '#e05c4b';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Bon' : score >= 40 ? 'Moyen' : 'Faible';

  const valEl = document.getElementById('sec-score-val');
  const barEl = document.getElementById('sec-score-bar');
  const itemsEl = document.getElementById('sec-score-items');

  if (valEl) { valEl.textContent = score + '/100 — ' + label; valEl.style.color = color; }
  if (barEl) { barEl.style.width = score + '%'; barEl.style.background = color; }
  if (itemsEl) {
    itemsEl.innerHTML = items.map(function(i) {
      return '<div style="display:flex;align-items:center;gap:8px;color:' + (i.ok ? 'var(--text)' : 'var(--muted)') + '">' +
        '<span>' + (i.ok ? '✅' : '⬜') + '</span>' +
        '<span>' + i.label + '</span>' +
        '<span style="margin-left:auto;font-family:DM Mono,monospace;font-size:11px;color:' + (i.ok ? color : 'var(--muted)') + '">+' + (i.ok ? i.points : 0) + ' pts</span>' +
        '</div>';
    }).join('');
  }
}

/* ── Auto-compute score when settings/twofa tab is shown ── */
const _origShowSettingsTab = showSettingsTab;
function showSettingsTab(tab) {
  _origShowSettingsTab(tab);
  if (tab === 'twofa') setTimeout(computeSecurityScore, 100);
}


/* ═══════════════════════════════════════════
   PUZZLES — état & interaction
═══════════════════════════════════════════ */
let puzzleBoard = {};
let puzzleSelected = [];
let puzzleMovesMade = 0;
let puzzleEjectedCount = 0;   // billes blanches éjectées du puzzle (pour la gouttière)
let puzzleShowCoords = false; // afficher les coordonnées sur le plateau du puzzle
let puzzleEjectAnim = null;   // animation de chute en cours dans le puzzle

// Set up click handler on puzzle canvas after render
function initPuzzleInteraction() {
  const canvas = document.getElementById('puzzle-board');
  if (!canvas || canvas._puzzleInited) return;
  canvas._puzzleInited = true;

  /* Coordonnees canvas a partir d'un point ecran. */
  function puzzlePos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top)  * (canvas.height / rect.height)
    };
  }

  canvas.addEventListener('click', function(e) {
    /* Neutralise le clic parasite emis a la fin d'un balayage. */
    if (canvas._pzDragJustEnded) { canvas._pzDragJustEnded = false; return; }
    const p = puzzlePos(e.clientX, e.clientY);
    handlePuzzleClick(p.x, p.y);
  });

  /* ── GLISSER : selection par balayage, comme sur le plateau de jeu ──
     Le mode Puzzle n'avait qu'un ecouteur 'click' : le clic-glisser ne
     faisait rien. Signale par Saab. On reprend la meme semantique que
     pointerDown/Move/Up du plateau principal : glisser depuis une bille
     noire construit la selection (2 ou 3 billes alignees), la direction
     se donne ensuite par un clic. Souris uniquement : sur tactile on
     laisse le tap et le defilement de la page. */
  const PZ_TOUCH = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));
  if (PZ_TOUCH) return;

  const PZ_DRAG_THRESHOLD = (typeof DRAG_THRESHOLD !== 'undefined') ? DRAG_THRESHOLD : 8;
  let pzDrag = null;

  canvas.addEventListener('mousedown', function(e) {
    canvas._pzDragJustEnded = false;
    const p = puzzlePos(e.clientX, e.clientY);
    const hex = puzzleHexAt(p.x, p.y);
    if (!hex) return;
    pzDrag = {
      startX: p.x, startY: p.y, hex: hex, moved: false,
      onOwnPiece: (puzzleBoard[hex.r + ',' + hex.c] === 'black')
    };
    if (e.cancelable) e.preventDefault();
  });

  canvas.addEventListener('mousemove', function(e) {
    if (!pzDrag) return;
    const p = puzzlePos(e.clientX, e.clientY);
    if (Math.hypot(p.x - pzDrag.startX, p.y - pzDrag.startY) > PZ_DRAG_THRESHOLD) pzDrag.moved = true;
    if (!pzDrag.moved || !pzDrag.onOwnPiece) return;
    if (!pzDrag.selecting) {
      pzDrag.selecting = true;
      puzzleSelected = [{ r: pzDrag.hex.r, c: pzDrag.hex.c }];
      drawPuzzleBoardInteractive();
    }
    const hex = puzzleHexAt(p.x, p.y);
    if (!hex || puzzleBoard[hex.r + ',' + hex.c] !== 'black') return;
    const already = puzzleSelected.some(function(s){ return s.r === hex.r && s.c === hex.c; });
    if (already || puzzleSelected.length >= 3) return;
    const candidate = puzzleSelected.concat([{ r: hex.r, c: hex.c }]);
    if (puzzleSelectionValid(candidate)) {
      puzzleSelected.push({ r: hex.r, c: hex.c });
      drawPuzzleBoardInteractive();
    }
  });

  function pzEnd() {
    if (!pzDrag) return;
    const d = pzDrag;
    pzDrag = null;
    if (d.moved && d.onOwnPiece) {
      canvas._pzDragJustEnded = true;
      drawPuzzleBoardInteractive();
      const msgEl = document.getElementById('puzzle-msg');
      if (msgEl) msgEl.textContent = puzzleSelected.length
        + ' bille(s) — cliquez la direction de poussée';
    }
  }
  canvas.addEventListener('mouseup', pzEnd);
  canvas.addEventListener('mouseleave', pzEnd);
}

/* Case du plateau de puzzle sous un point canvas (null si hors plateau). */
function puzzleHexAt(px, py) {
  const canvas = document.getElementById('puzzle-board');
  const SIZE = canvas ? canvas.width : 400;
  const scale = SIZE / 640;
  let best = null, bestDist = Infinity;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < ROWS[r]; c++) {
      const p = hexCoord(r, c);
      const d = Math.hypot(px - p.x * scale, py - p.y * scale);
      if (d < bestDist && d < HEX_RADIUS * scale) { bestDist = d; best = { r: r, c: c }; }
    }
  }
  return best;
}

function handlePuzzleClick(px, py) {
  const canvas = document.getElementById('puzzle-board');
  const SIZE = canvas ? canvas.width : 400;
  const scale = SIZE / 640;                   // même échelle que le rendu
  let best = null, bestDist = Infinity;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < ROWS[r]; c++) {
      const p = hexCoord(r, c);
      const x = p.x * scale, y = p.y * scale;
      const d = Math.sqrt((px-x)**2+(py-y)**2);
      if (d < bestDist && d < HEX_RADIUS*scale) { bestDist = d; best = {r,c}; }
    }
  }
  if (!best) return;
  const key = best.r + ',' + best.c;
  const piece = puzzleBoard[key];
  const msgEl = document.getElementById('puzzle-msg');

  // Clic sur une bille noire → sélection/désélection (multiple si aligné)
  if (piece === 'black') {
    if (!Array.isArray(puzzleSelected)) puzzleSelected = [];
    const i = puzzleSelected.findIndex(function(s){return s.r===best.r&&s.c===best.c;});
    if (i !== -1) {
      puzzleSelected.splice(i,1);
    } else {
      if (puzzleSelected.length >= 3) { if(msgEl) msgEl.textContent='Maximum 3 billes'; return; }
      const candidate = puzzleSelected.concat([best]);
      if (puzzleSelectionValid(candidate)) puzzleSelected.push(best);
      else puzzleSelected = [best];
    }
    drawPuzzleBoardInteractive();
    if (msgEl) msgEl.textContent = puzzleSelected.length ? '⚫ ' + puzzleSelected.length + ' bille(s) — cliquez la direction de poussée' : '⚫ Sélectionnez vos billes noires';
    return;
  }

  // Clic sur une case (vide ou blanche) = direction de la poussée
  if (Array.isArray(puzzleSelected) && puzzleSelected.length > 0) {
    const targetAx = rcToAxial(best.r, best.c);
    let chosenDir = null;
    for (const s of puzzleSelected) {
      const sAx = rcToAxial(s.r, s.c);
      for (const d of AX_DIRS) {
        if (sAx.q+d.q===targetAx.q && sAx.r+d.r===targetAx.r) { chosenDir = d; break; }
      }
      if (chosenDir) break;
    }
    if (!chosenDir) { puzzleSelected=[]; drawPuzzleBoardInteractive(); if(msgEl) msgEl.textContent='Direction invalide — resélectionnez'; return; }

    // Valide et applique le coup via le VRAI moteur (sur puzzleBoard)
    const _tbSeqBoardBefore = (currentPuzzleIdx === -3) ? Object.assign({}, puzzleBoard) : null;
    const result = puzzleApplyMove(puzzleSelected, chosenDir);
    if (!result.valid) {
      if (msgEl) msgEl.textContent = '⛔ ' + result.reason;
      return;
    }
    puzzleSelected = [];
    puzzleMovesMade++;
    if (currentPuzzleIdx === -3) {
      tbSeqHandleMove(_tbSeqBoardBefore, result);
      return;
    }
    drawPuzzleBoardInteractive();
    if (result.ejected) {
      // Anime la chute de la bille dans la gouttière, PUIS affiche la résolution
      if (msgEl) msgEl.textContent = '💥 Éjection !';
      animatePuzzleEjection(result.ejectRC, function() {
        showPuzzleResult(true);
        if (stormActive) stormPuzzleSolved();
      });
    } else {
      if (msgEl) msgEl.textContent = 'Coup joué (' + puzzleMovesMade + '). Continuez !';
    }
    return;
  }
  puzzleSelected = [];
  drawPuzzleBoardInteractive();
}

// Valide qu'une sélection de billes de puzzle est alignée et contiguë
function puzzleSelectionValid(sel) {
  if (sel.length === 1) return true;
  if (sel.length > 3) return false;
  const ax = sel.map(function(s){return rcToAxial(s.r,s.c);});
  for (const d of AX_DIRS) {
    const sorted = ax.slice().sort(function(a,b){return (a.q*d.q+a.r*d.r)-(b.q*d.q+b.r*d.r);});
    let ok = true;
    for (let i=1;i<sorted.length;i++){ if(sorted[i].q!==sorted[i-1].q+d.q||sorted[i].r!==sorted[i-1].r+d.r){ok=false;break;} }
    if (ok) return true;
  }
  return false;
}

// Applique un coup de puzzle via le moteur principal (bascule board ↔ puzzleBoard)
function puzzleApplyMove(sel, dir) {
  const savedBoard = board;
  const savedCW = capturedByWhite, savedCB = capturedByBlack;
  board = puzzleBoard;  // le moteur travaille sur puzzleBoard
  const info = validateMove(sel, dir, 'black');
  let res = { valid:false, reason:'Coup invalide', ejected:false, ejectRC:null };
  if (info.valid) {
    // position de la bille blanche qui sort (dernière case avant le bord)
    let ejectRC = null;
    if (info.type === 'push' && info.ejection && info.oppStart) {
      let cur = { ...info.oppStart };
      for (let s=0; s<info.push-1; s++) cur = { q:cur.q+dir.q, r:cur.r+dir.r };
      ejectRC = axialToRc(cur.q, cur.r);
    }
    abApplyMove(sel, dir, 'black', info);
    res = { valid:true, ejected: !!(info.type==='push' && info.ejection), ejectRC: ejectRC };
  } else {
    res.reason = info.reason || 'Coup invalide';
  }
  puzzleBoard = board;   // récupère le plateau modifié
  board = savedBoard;    // restaure le plateau de jeu principal
  capturedByWhite = savedCW; capturedByBlack = savedCB;
  return res;
}

/* Animation de chute dans le puzzle : la bille blanche tombe dans la gouttière
   (côté bas) puis glisse, comme dans une partie. Puis on résout. */
function animatePuzzleEjection(ejectRC, onDone) {
  const canvas = document.getElementById('puzzle-board');
  if (!canvas || !ejectRC) { puzzleEjectedCount++; if(onDone) onDone(); return; }
  const SIZE = canvas.width, scale = SIZE / 640;
  const corners = [hexCoord(0,0),hexCoord(0,ROWS[0]-1),hexCoord(4,ROWS[4]-1),hexCoord(8,ROWS[8]-1),hexCoord(8,0),hexCoord(4,0)];
  let mx=0,my=0; corners.forEach(p=>{mx+=p.x;my+=p.y;}); mx/=6; my/=6;
  const pad = HEX_RADIUS + 22, gutterW = 46;
  const halfH = Math.abs(my - corners[0].y);
  const ringR = halfH + pad + gutterW/2 - HEX_RADIUS - 4;
  const gr = HEX_RADIUS * 0.82, spacing = gr * 2.0;

  const fromP = hexCoord(ejectRC.r, ejectRC.c);
  const fromX = fromP.x, fromY = fromP.y;
  // place finale (bille blanche en bas, à l'index courant)
  const slotIndex = puzzleEjectedCount;  // avant incrément
  const finalOffset = (slotIndex - (Math.min(puzzleEjectedCount+1,6)-1)/2) * spacing;
  const targetX = mx + finalOffset, targetY = my + ringR;
  const dropX = fromX, dropY = targetY;

  puzzleEjectedCount++;  // la bille compte désormais (mais l'anim l'exclut tant qu'elle bouge)
  puzzleEjectAnim = {
    gr, fromX, fromY, dropX, dropY, targetX, targetY,
    start: performance.now(), dur: 1800, phase1: 0.33, scale,
  };

  function step(now) {
    if (!puzzleEjectAnim) return;
    const a = puzzleEjectAnim;
    const t = Math.min(1, (now - a.start) / a.dur);
    drawPuzzleBoardInteractive();  // redessine le plateau (bille animée exclue)
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.scale(a.scale, a.scale);
    let x, y;
    if (t < a.phase1) {
      const tp = t / a.phase1, e = tp*tp;        // easeIn (chute)
      x = a.fromX + (a.dropX - a.fromX) * e;
      y = a.fromY + (a.dropY - a.fromY) * e;
    } else {
      const tp = (t - a.phase1) / (1 - a.phase1), e = 1-(1-tp)*(1-tp);  // easeOut (glissement)
      x = a.dropX + (a.targetX - a.dropX) * e;
      y = a.dropY;
    }
    drawSmallMarble(ctx, x, y, a.gr, 'white');
    ctx.restore();
    if (t < 1) {
      requestAnimationFrame(step);
    } else {
      puzzleEjectAnim = null;
      drawPuzzleBoardInteractive();  // rendu final (bille à sa place)
      if (onDone) onDone();
    }
  }
  requestAnimationFrame(step);
}

function puzzleNeighbors(r, c) {
  const ROWS=[5,6,7,8,9,8,7,6,5];
  const nbrs = [];
  if (r > 0) { const pr=ROWS[r-1]; if(pr<ROWS[r]){nbrs.push({r:r-1,c:c-1});nbrs.push({r:r-1,c:c});}else{nbrs.push({r:r-1,c:c});nbrs.push({r:r-1,c:c+1});} }
  if (c > 0) nbrs.push({r,c:c-1});
  if (c < ROWS[r]-1) nbrs.push({r,c:c+1});
  if (r < 8) { const nr=ROWS[r+1]; if(nr>ROWS[r]){nbrs.push({r:r+1,c:c});nbrs.push({r:r+1,c:c+1});}else{nbrs.push({r:r+1,c:c-1});nbrs.push({r:r+1,c:c});} }
  return nbrs.filter(function(n){return n.r>=0&&n.r<9&&n.c>=0&&n.c<ROWS[n.r];});
}

/* ═══════════════════════════════════════════
   REPETITION ESPACEE (SRS) — sur les puzzles.
   Systeme simple a intervalles croissants (pas un SM-2 complet avec facteur
   de facilite variable) : reussite -> case suivante (intervalle plus long),
   echec -> retour a la case 0 (revient demain). Le "puzzle du jour/mois"
   deterministe par date n'est jamais touche -- ceci est un mode SEPARE
   ("Reviser"), pour ne pas casser un mecanisme deja en place et teste. */
const SRS_INTERVALS_DAYS = [1, 3, 7, 14, 30, 90];
const SRS_KEY = 'abaSrsPuzzles';

function _srsLoad(){
  try { return JSON.parse(localStorage.getItem(SRS_KEY) || '{}'); } catch(e){ return {}; }
}
function _srsSave(data){
  try { localStorage.setItem(SRS_KEY, JSON.stringify(data)); } catch(e){}
}

/* Enregistre le resultat d'un puzzle (succes ou echec) dans le planning de
   revision. Ne fait rien pour un puzzle jamais vu qui reussit du premier
   coup sans etre entre dans le systeme -- il y entre naturellement des
   ce premier resultat, qu'il soit bon ou mauvais. */
function srsRecordResult(puzzleIdx, success){
  const data = _srsLoad();
  const key = String(puzzleIdx);
  const entry = data[key] || { box: -1 };
  if (success) {
    entry.box = Math.min(entry.box + 1, SRS_INTERVALS_DAYS.length - 1);
  } else {
    entry.box = 0;
  }
  const days = SRS_INTERVALS_DAYS[Math.max(0, entry.box)];
  const next = new Date();
  next.setDate(next.getDate() + days);
  entry.nextReview = next.toISOString();
  entry.lastResult = success ? 'ok' : 'fail';
  data[key] = entry;
  _srsSave(data);
}

/* Puzzles dus aujourd'hui : jamais vus NE comptent PAS comme "dus" (ce
   mode sert a REVISER ce qu'on a deja tente, pas a decouvrir -- le puzzle
   du jour/du mois existant s'occupe deja de la decouverte). */
function srsGetDuePuzzles(){
  const data = _srsLoad();
  const now = Date.now();
  const due = [];
  for (const key in data) {
    const entry = data[key];
    if (entry.nextReview && new Date(entry.nextReview).getTime() <= now) {
      due.push({ idx: parseInt(key, 10), box: entry.box, lastResult: entry.lastResult });
    }
  }
  due.sort(function(a,b){ return a.box - b.box; }); // les plus fragiles (case basse) d'abord
  return due;
}

function srsCountDue(){ return srsGetDuePuzzles().length; }

function srsStats(){
  const data = _srsLoad();
  let total = 0, mastered = 0; // "maitrise" = case la plus haute atteinte
  for (const key in data) {
    total++;
    if (data[key].box >= SRS_INTERVALS_DAYS.length - 1) mastered++;
  }
  return { total: total, mastered: mastered, due: srsCountDue() };
}

function renderSrsReviewCard(){
  const card = document.getElementById('srs-review-card');
  const text = document.getElementById('srs-review-text');
  if (!card || !text) return;
  const due = srsGetDuePuzzles();
  if (!due.length) { card.style.display = 'none'; return; }
  card.style.display = '';
  const stats = srsStats();
  text.textContent = due.length + ' puzzle' + (due.length>1?'s':'') + ' à revoir aujourd\u2019hui'
    + (stats.mastered ? ' — ' + stats.mastered + ' maîtrisé' + (stats.mastered>1?'s':'') : '') + '.';
}

let _srsQueue = [];
let _srsReviewActive = false;
function srsStartReview(){
  _srsQueue = srsGetDuePuzzles().map(function(d){ return d.idx; });
  if (!_srsQueue.length) { if (typeof showToast === 'function') showToast('Rien à réviser pour l\u2019instant.'); return; }
  _srsReviewActive = true;
  _srsNextInQueue();
}
function _srsNextInQueue(){
  if (!_srsQueue.length) {
    _srsReviewActive = false;
    if (typeof showToast === 'function') showToast('✅ Révision terminée !');
    if (typeof renderSrsReviewCard === 'function') renderSrsReviewCard();
    return;
  }
  const idx = _srsQueue.shift();
  if (typeof loadPuzzle === 'function') loadPuzzle(idx);
}

function showPuzzleResult(success) {
  const overlay = document.getElementById('puzzle-result-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  document.getElementById('puzzle-result-icon').textContent = success ? '✅' : '❌';
  document.getElementById('puzzle-result-title').textContent = success ? 'Bravo !' : 'Pas tout à fait...';
  document.getElementById('puzzle-result-sub').textContent = success
    ? 'Bille éjectée — résolu en ' + puzzleMovesMade + ' coup' + (puzzleMovesMade>1?'s':'') + ' !'
    : 'Essayez encore ou consultez l\u2019indice.';
  // Répétition espacée : enregistre CHAQUE résultat (succès ou échec), pas
  // seulement les succès. Un échec répété avant réussite reste inoffensif
  // (remise à la case 0, idempotent), la case ne progresse qu'au succès final.
  /* currentPuzzleIdx < 0 = puzzle genere (-1) ou tire d'une tablebase (-2) :
     pas une entree de puzzlesData, donc rien a marquer "resolu" ni a faire
     progresser dans la repetition espacee -- ces deux mecanismes n'ont de
     sens que pour le catalogue fixe. Sans ce garde, puzzlesData[-1] vaut
     undefined en JS et ".solved = true" plantait juste en dessous : bug
     preexistant du mode "Puzzle infini" (jamais remarque car l'erreur est
     silencieuse hors console), qui aurait aussi casse le trainer de finales. */
  if (typeof srsRecordResult === 'function' && typeof currentPuzzleIdx !== 'undefined' && currentPuzzleIdx >= 0) {
    srsRecordResult(currentPuzzleIdx, !!success);
  }
  if (success && currentPuzzleIdx >= 0 && puzzlesData[currentPuzzleIdx]) {
    puzzlesData[currentPuzzleIdx].solved = true;
    _saveSolvedPuzzleTitle(puzzlesData[currentPuzzleIdx].title);
    updatePuzzleProgressBar();
    const si = document.getElementById('psolved-'+currentPuzzleIdx);
    if (si) si.textContent = '✅';
    if (typeof onPuzzleSolved === 'function') onPuzzleSolved();
    // Session de revision en cours : avance automatiquement au puzzle
    // suivant de la file, apres un court delai pour laisser voir "Bravo !".
    if (typeof _srsReviewActive !== 'undefined' && _srsReviewActive) {
      setTimeout(function(){ if (typeof _srsNextInQueue === 'function') _srsNextInQueue(); }, 1500);
    }
  }
}

function resetCurrentPuzzle() {
  const overlay = document.getElementById('puzzle-result-overlay');
  if (overlay) overlay.style.display = 'none';
  puzzleMovesMade = 0;
  puzzleSelected = [];
  buildPuzzleBoard(currentPuzzleIdx);
  drawPuzzleBoardInteractive();
  const msg = document.getElementById('puzzle-msg');
  if (msg) msg.textContent = '⚫ Sélectionnez vos billes noires';
}

function buildPuzzleBoard(idx) {
  const p = puzzlesData[idx % puzzlesData.length];
  puzzleBoard = {};
  if (!p) return;
  p.black.forEach(function(pos){ puzzleBoard[pos[0]+','+pos[1]]='black'; });
  p.white.forEach(function(pos){ puzzleBoard[pos[0]+','+pos[1]]='white'; });
  puzzleStartCaptured = 0;  // aucune bille éjectée au départ
  puzzleEjectedCount = 0;   // gouttière vide
  puzzleEjectAnim = null;
}

/* ═══════════════════════════════════════════
   GÉNÉRATEUR AUTOMATIQUE DE PUZZLES
   Génère une position aléatoire où une éjection est possible,
   vérifiée par le vrai moteur. Crée des puzzles à l'infini.
═══════════════════════════════════════════ */
function isEdgeCell(r, c) {
  const ax = rcToAxial(r, c);
  for (const d of AX_DIRS) {
    if (!axialToRc(ax.q + d.q, ax.r + d.r)) return true;
  }
  return false;
}

// Cherche un coup noir qui éjecte une blanche dans une position donnée
function findEjectingMoveOn(brd) {
  const savedB = board;
  board = brd;
  const blackCells = Object.keys(brd).filter(function(k){return brd[k]==='black';}).map(function(k){const p=k.split(',').map(Number);return{r:p[0],c:p[1]};});
  const groups = [];
  blackCells.forEach(function(p){ groups.push([p]); });
  blackCells.forEach(function(p){
    const pa = rcToAxial(p.r,p.c);
    AX_DIRS.forEach(function(d){
      const c2 = axialToRc(pa.q+d.q, pa.r+d.r);
      if (c2 && brd[c2.r+','+c2.c]==='black') {
        groups.push([p,{r:c2.r,c:c2.c}]);
        const c3 = axialToRc(pa.q+2*d.q, pa.r+2*d.r);
        if (c3 && brd[c3.r+','+c3.c]==='black') groups.push([p,{r:c2.r,c:c2.c},{r:c3.r,c:c3.c}]);
      }
    });
  });
  let found = null;
  for (const cells of groups) {
    for (const dir of AX_DIRS) {
      const info = validateMove(cells, dir, 'black');
      if (info.valid && info.type === 'push' && info.ejection) { found = { cells, dir, push: info.push }; break; }
    }
    if (found) break;
  }
  board = savedB;
  return found;
}

// Génère une position de puzzle aléatoire et soluble
function generateRandomPuzzle() {
  for (let attempt = 0; attempt < 200; attempt++) {
    const brd = {};
    // choisit une bille blanche cible au bord
    const edges = [];
    for (let r=0;r<9;r++) for (let c=0;c<ROWS[r];c++) if (isEdgeCell(r,c)) edges.push({r,c});
    const target = edges[Math.floor(Math.random()*edges.length)];
    brd[target.r+','+target.c] = 'white';

    // direction de poussée = vers le bord (depuis le centre)
    const tAx = rcToAxial(target.r, target.c);
    // trouve la direction qui sort du plateau depuis la cible
    let pushDir = null;
    for (const d of AX_DIRS) {
      if (!axialToRc(tAx.q + d.q, tAx.r + d.r)) { pushDir = d; break; }
    }
    if (!pushDir) continue;
    // les billes noires sont derrière la cible (direction opposée à la sortie)
    const back = { q: -pushDir.q, r: -pushDir.r };
    const nBlacks = 2 + Math.floor(Math.random()*2);  // 2 ou 3 billes
    let cur = { ...tAx };
    let valid = true;
    const blackPos = [];
    for (let i=0;i<nBlacks;i++) {
      cur = { q: cur.q + back.q, r: cur.r + back.r };
      const rc = axialToRc(cur.q, cur.r);
      if (!rc) { valid = false; break; }
      blackPos.push(rc);
    }
    if (!valid) continue;
    blackPos.forEach(function(rc){ brd[rc.r+','+rc.c] = 'black'; });

    // ajoute parfois une 2e blanche devant (pour des 3v2), aléatoirement
    if (nBlacks === 3 && Math.random() < 0.4) {
      const front = { q: tAx.q - pushDir.q, r: tAx.r - pushDir.r };  // entre cible et noirs... non
      // on met la 2e blanche entre la cible et les noirs n'a pas de sens ; on la met devant la cible (déjà au bord)
      // donc on saute ce cas pour rester sûr
    }

    // vérifie qu'une éjection est réellement possible
    const sol = findEjectingMoveOn(brd);
    if (sol) {
      return { board: brd, solution: sol };
    }
  }
  return null;  // échec (rare)
}

