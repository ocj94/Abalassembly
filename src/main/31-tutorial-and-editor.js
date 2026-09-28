/* ═══════════════════════════════════════════
   ÉDITEUR DE POSITION
   Place librement les billes pour créer positions, puzzles et variantes.
═══════════════════════════════════════════ */
let editorBoard = {};
let editorTool = 'black';  // outil courant : 'black', 'white', 'erase'
/* Billes déjà éjectées par camp -- séparé du placement sur le plateau, pour
   pouvoir construire des positions de fin de partie réalistes (ex: puzzle
   où un camp a déjà perdu 5 billes, il n'en reste qu'une). Signalé : rien
   ne permettait de déclarer ça, playFromEditor() remettait toujours les
   deux compteurs à zéro peu importe le nombre de billes posées. */
let editorCapturedBlack = 0;
let editorCapturedWhite = 0;
const EDITOR_MAX_CAPTURED = 5;  // 6 billes perdues = partie déjà finie, donc max 5 avant de jouer

function setEditorTool(tool, btn) {
  editorTool = tool;
  // met à jour l'apparence des boutons
  ['black','white','erase'].forEach(function(t){
    const el = document.getElementById('edtool-' + t);
    if (el) {
      el.style.border = (t === tool) ? '2px solid var(--gold)' : '2px solid var(--border)';
      el.style.background = (t === tool) ? 'rgba(200,168,75,0.08)' : 'transparent';
    }
  });
}

function loadEditorPreset(preset) {
  editorBoard = {};
  editorCapturedBlack = 0; editorCapturedWhite = 0;  // nouvelle position -> repart de zéro
  const cb = document.getElementById('editor-captured-black'); if (cb) cb.textContent = '0';
  const cw = document.getElementById('editor-captured-white'); if (cw) cw.textContent = '0';
  if (preset !== 'empty' && LAYOUTS[preset]) {
    LAYOUTS[preset].black.forEach(function(p){ editorBoard[p[0]+','+p[1]] = 'black'; });
    LAYOUTS[preset].white.forEach(function(p){ editorBoard[p[0]+','+p[1]] = 'white'; });
  }
  // 'empty' → rien
  drawEditorBoard();
  updateEditorStatus();
}

/* Ajuste le compteur de billes déjà éjectées d'un camp. Borné à
   [0, EDITOR_MAX_CAPTURED] et au nombre de billes qu'il reste physiquement
   possible d'avoir perdues : billes sur le plateau + déjà éjectées ne peut
   jamais dépasser 14 (total réel de billes par camp). */
function editorAdjustCaptured(color, delta) {
  const onBoard = Object.values(editorBoard).filter(function(v){ return v === color; }).length;
  const current = (color === 'black') ? editorCapturedBlack : editorCapturedWhite;
  let next = current + delta;
  next = Math.max(0, Math.min(EDITOR_MAX_CAPTURED, next));
  if (onBoard + next > 14) {
    showToast('⚠️ Billes sur le plateau + éjectées ne peut pas dépasser 14');
    return;
  }
  if (color === 'black') editorCapturedBlack = next; else editorCapturedWhite = next;
  const el = document.getElementById('editor-captured-' + color);
  if (el) el.textContent = String(next);
}

function drawEditorBoard() {
  drawBoard({
    canvasId: 'editor-board',
    hideGameOverlays: true,
    board: editorBoard,
    selected: [],
    showHints: false,
    turn: 'black',
    hideGutter: true,
    showCoords: true,  // toujours les coordonnées dans l'éditeur
  });
}

function updateEditorStatus() {
  const blacks = Object.values(editorBoard).filter(v=>v==='black').length;
  const whites = Object.values(editorBoard).filter(v=>v==='white').length;
  const el = document.getElementById('editor-status');
  if (el) {
    let warn = '';
    if (blacks + editorCapturedBlack > 14 || whites + editorCapturedWhite > 14) warn = ' ⚠️ Maximum 14 billes par couleur (plateau + éjectées)';
    const bStops = (typeof boardTheme !== 'undefined' && boardTheme.blackStops || MARBLE_SKINS.kintsugi.b).join(', ');
    const wStops = (typeof boardTheme !== 'undefined' && boardTheme.whiteStops || MARBLE_SKINS.kintsugi.w).join(', ');
    const ejB = editorCapturedBlack ? ' (+' + editorCapturedBlack + ' éjectées)' : '';
    const ejW = editorCapturedWhite ? ' (+' + editorCapturedWhite + ' éjectées)' : '';
    el.innerHTML = _marbleSwatch(bStops) + blacks + ' Joueur 1' + ejB + ' · ' + _marbleSwatch(wStops) + whites + ' Joueur 2' + ejW + warn;
  }
}

function handleEditorClick(r, c) {
  const key = r + ',' + c;
  if (editorTool === 'erase') {
    delete editorBoard[key];
  } else {
    // si la case a déjà la couleur de l'outil → on efface (toggle), jamais bloqué
    if (editorBoard[key] === editorTool) {
      delete editorBoard[key];
    } else {
      // sinon on ajoute une bille : refuse au-delà de 14 par couleur EN COMPTANT les
      // billes déjà déclarées éjectées (editorCapturedBlack/White) -- limite réelle
      // du jeu physique (14 billes au total, sur le plateau ou éjectées).
      const count = Object.values(editorBoard).filter(function(v){ return v === editorTool; }).length;
      const captured = (editorTool === 'black') ? editorCapturedBlack : editorCapturedWhite;
      if (count + captured >= 14) {
        showToast('⚠️ Maximum 14 billes ' + (editorTool === 'black' ? 'noires' : 'blanches') + ' (plateau + éjectées)');
        return;
      }
      editorBoard[key] = editorTool;
    }
  }
  soundSelect();
  drawEditorBoard();
  updateEditorStatus();
}

// Jouer la position créée
function playFromEditor() {
  const blacks = Object.values(editorBoard).filter(v=>v==='black').length;
  const whites = Object.values(editorBoard).filter(v=>v==='white').length;
  if (blacks === 0 || whites === 0) {
    showToast('⚠️ Place au moins une bille de chaque couleur');
    return;
  }
  if (blacks > 14 || whites > 14) {
    showToast('⚠️ Maximum 14 billes par couleur');
    return;
  }
  // copie la position dans le plateau de jeu
  showPage('game');
  setTimeout(function() {
    board = JSON.parse(JSON.stringify(editorBoard));
    CapturedByWhite.set(editorCapturedWhite); CapturedByBlack.set(editorCapturedBlack);
    CurrentTurn.set('black'); MoveCount.set(0); GameOver.set(false);
    selected = [];
    if (typeof updateCaptures === 'function') updateCaptures();
    if (typeof updateStatus === 'function') updateStatus();
    drawBoard();
    showToast('▶ Position chargée — à toi de jouer !');
  }, 150);
}

// Tester la position comme puzzle (vérifie qu'une éjection est possible)
function testAsPuzzle() {
  const blacks = Object.values(editorBoard).filter(v=>v==='black').length;
  const whites = Object.values(editorBoard).filter(v=>v==='white').length;
  if (blacks === 0 || whites === 0) {
    showToast('⚠️ Place des billes des deux couleurs');
    return;
  }
  // cherche si les noirs peuvent éjecter une blanche (comme dans les puzzles)
  const savedBoard = board;
  board = editorBoard;
  let canEject = false;
  const blackPieces = Object.keys(board).filter(k=>board[k]==='black').map(k=>{const[r,c]=k.split(',').map(Number);return{r,c};});
  const groups = [];
  blackPieces.forEach(p=>groups.push([p]));
  blackPieces.forEach(p=>{ const pa=rcToAxial(p.r,p.c);
    AX_DIRS.forEach(d=>{ const c2=axialToRc(pa.q+d.q,pa.r+d.r);
      if(c2&&board[akey(c2.r,c2.c)]==='black'){ groups.push([p,{r:c2.r,c:c2.c}]);
        const c3=axialToRc(pa.q+2*d.q,pa.r+2*d.r);
        if(c3&&board[akey(c3.r,c3.c)]==='black') groups.push([p,{r:c2.r,c:c2.c},{r:c3.r,c:c3.c}]); }});});
  for (const cells of groups) {
    for (const dir of AX_DIRS) {
      const info = validateMove(cells, dir, 'black');
      if (info.valid && info.type==='push' && info.ejection) { canEject = true; break; }
    }
    if (canEject) break;
  }
  board = savedBoard;
  if (canEject) {
    showToast('✅ Position valide : une éjection est possible en 1 coup !');
  } else {
    showToast('ℹ️ Aucune éjection directe — bon pour une position de jeu, pas un puzzle 1 coup');
  }
}

// Exporter la position sous forme de code (liste de coordonnées)
function exportEditorPosition() {
  const blacks = Object.keys(editorBoard).filter(k=>editorBoard[k]==='black').map(k=>{const[r,c]=k.split(',').map(Number);return coordToABAPRO(r,c);});
  const whites = Object.keys(editorBoard).filter(k=>editorBoard[k]==='white').map(k=>{const[r,c]=k.split(',').map(Number);return coordToABAPRO(r,c);});
  const code = 'Noirs: ' + (blacks.join(' ') || '(aucun')+'\nBlancs: ' + (whites.join(' ') || '(aucun)');
  // copie dans le presse-papier
  if (navigator.clipboard) {
    navigator.clipboard.writeText(code).then(function(){
      showToast('📋 Position copiée (notation A-I / 1-9)');
    }, function(){ showToast(code); });
  } else {
    showToast('📋 ' + code);
  }
}

// Clic sur le plateau de l'éditeur
document.addEventListener('DOMContentLoaded', function() {
  const canvas = document.getElementById('editor-board');
  if (!canvas) return;
  canvas.addEventListener('click', function(e) {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / 640;
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    let best = null, bestD = Infinity;
    for (let r=0;r<9;r++) for (let c=0;c<ROWS[r];c++) {
      const p = hexCoord(r,c);
      const d = Math.hypot(px - p.x*scale, py - p.y*scale);
      if (d < bestD && d < HEX_RADIUS*scale) { bestD = d; best = {r,c}; }
    }
    if (best) handleEditorClick(best.r, best.c);
  });
});

/* ═══════════════════════════════════════════
   ANALYSE DE PARTIE
   - Navigation coup par coup dans une partie
   - Jeu libre pour explorer des variantes
   - Évaluation de la position (via evaluateBoard de l'IA)
═══════════════════════════════════════════ */
let analysisBoard = {};
let analysisSelected = [];
let analysisHistory = [];   // [{board, capB, capW, label, turn}]
let analysisIdx = 0;        // position courante dans l'historique
let analysisTurn = 'black';
let analysisCapB = 0, analysisCapW = 0;
let analysisBestHint = null;  // {cells:[...], dir} = meilleur coup suggéré

function drawAnalysisBoard() {
  drawBoard({
    canvasId: 'analysis-board',
    hideGameOverlays: true,
    board: analysisBoard,
    selected: analysisSelected,
    showHints: true,
    turn: analysisTurn,
    /* hideGutter masquait toute la rigole : c'etait le seul moyen d'eviter
       d'afficher les billes de la partie precedente, mais du coup l'analyse
       ne montrait jamais ses propres ejections. Elle tient pourtant ses
       compteurs a jour — on les lui passe explicitement.
       analysisCapB = pris PAR les Noirs = billes blanches. Signale par Saab. */
    gutterCounts: { black: analysisCapW, white: analysisCapB },
  });
  // Surligne le meilleur coup suggéré (flèche dorée)
  if (analysisBestHint) drawBestMoveHint();
  updateAnalysisEval();
  updateAnalysisScore();
}

/* Score d'ejection de la position affichee, en clair sous le plateau.
   Il n'existait nulle part dans la page alors que les compteurs etaient
   corrects en interne. */
function updateAnalysisScore() {
  const el = document.getElementById('analysis-score');
  if (!el) return;
  const bStops = (typeof boardTheme !== 'undefined' && boardTheme.blackStops || MARBLE_SKINS.kintsugi.b).join(', ');
  const wStops = (typeof boardTheme !== 'undefined' && boardTheme.whiteStops || MARBLE_SKINS.kintsugi.w).join(', ');
  el.innerHTML = '<span style="color:var(--text)">' + _marbleSwatch(bStops) + 'Joueur 1 : ' + analysisCapB + '</span>'
    + '<span style="color:var(--muted);margin:0 8px">—</span>'
    + '<span style="color:var(--text)">' + analysisCapW + ' : Joueur 2' + _marbleSwatch(wStops) + '</span>'
    + '<span style="color:var(--muted);margin-left:10px;font-size:11px">billes éjectées</span>';
}

// Dessine une flèche dorée du groupe de billes vers la destination du meilleur coup
function drawBestMoveHint() {
  const canvas = document.getElementById('analysis-board');
  if (!canvas || !analysisBestHint) return;
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / 640;
  const cells = analysisBestHint.cells;
  const dir = analysisBestHint.dir;
  ctx.save();
  ctx.scale(scale, scale);
  // entoure les billes à jouer
  cells.forEach(function(cell){
    const p = hexCoord(cell.r, cell.c);
    ctx.beginPath();
    ctx.arc(p.x, p.y, HEX_RADIUS - 4, 0, Math.PI*2);
    ctx.strokeStyle = '#f0c040';
    ctx.lineWidth = 3;
    ctx.stroke();
  });
  // flèche depuis la bille de tête vers la direction
  const ax = cells.map(function(s){return rcToAxial(s.r,s.c);});
  const sorted = ax.slice().sort(function(a,b){return (a.q*dir.q+a.r*dir.r)-(b.q*dir.q+b.r*dir.r);});
  const head = sorted[sorted.length-1];
  const headP = hexCoord(axialToRc(head.q,head.r).r, axialToRc(head.q,head.r).c);
  const destAx = { q: head.q + dir.q, r: head.r + dir.r };
  const destRc = axialToRc(destAx.q, destAx.r);
  const destP = destRc ? hexCoord(destRc.r, destRc.c) : { x: headP.x + dir.q*40, y: headP.y + dir.r*40 };
  // ligne fléchée
  ctx.beginPath();
  ctx.moveTo(headP.x, headP.y);
  ctx.lineTo(destP.x, destP.y);
  ctx.strokeStyle = '#f0c040';
  ctx.lineWidth = 4;
  ctx.stroke();
  // pointe de flèche
  const angle = Math.atan2(destP.y - headP.y, destP.x - headP.x);
  ctx.beginPath();
  ctx.moveTo(destP.x, destP.y);
  ctx.lineTo(destP.x - 12*Math.cos(angle - Math.PI/6), destP.y - 12*Math.sin(angle - Math.PI/6));
  ctx.lineTo(destP.x - 12*Math.cos(angle + Math.PI/6), destP.y - 12*Math.sin(angle + Math.PI/6));
  ctx.closePath();
  ctx.fillStyle = '#f0c040';
  ctx.fill();
  ctx.restore();
}

/* ── Dernier coup : un chevron sur chaque bille deplacee ──
   Remplace l'ancienne fleche, a la demande d'Olivier, sur le modele du site
   de Saab : un petit chevron sur le bord de CHAQUE bille qui a bouge, sa
   pointe tournee dans le sens du deplacement -- blanc sur les billes noires,
   sombre sur les blanches. Plus de trait qui traverse le plateau et masque
   d'autres billes, et le principe est le meme pour un coup en ligne, un
   coup lateral ou une poussee.

   Billes marquees : celles du joueur, a leur case d'arrivee, et les billes
   adverses poussees (une bille ejectee a quitte le plateau, rien a marquer).
   Le nombre de billes poussees n'est pas enregistre avec le coup : il est
   COMPTE sur la position d'avant le coup (instantane precedent). Le deviner
   sur la position d'apres ne serait pas fiable -- une bille adverse posee
   juste derriere la ligne poussee serait comptee a tort. Quand la position
   d'avant est inconnue (premier coup d'une partie en direct), seules les
   billes du joueur sont marquees : jamais un chevron sur une bille qui n'a
   pas bouge.

   L'ancienne fleche distinguait les types de coup par sa couleur (idee de
   Saab, mail du 20/07/2026). Les chevrons s'en passent : une poussee se
   reconnait aux chevrons des deux couleurs. */
function _dernierCoupBillesDeplacees(snap, avant) {
  const info = snap && snap.moveInfo;
  if (!info || !info.cells || !info.cells.length || !info.dir) return [];
  const d = info.dir, apres = snap.board || {};
  const cle = function(rc){ return rc.r + ',' + rc.c; };
  const out = [];
  let tete = null, proj = -Infinity;
  info.cells.forEach(function(c){
    const a = rcToAxial(c.r, c.c);
    const dest = axialToRc(a.q + d.q, a.r + d.r);
    if (dest) out.push({ de: c, a: dest, couleur: apres[cle(dest)] || null });
    const p = a.q * d.q + a.r * d.r + (a.q + a.r) * (d.q + d.r);   // projection sur la direction
    if (p > proj) { proj = p; tete = a; }
  });
  if (info.type === 'push' && avant && tete) {
    const moi = avant[cle(info.cells[0])];
    for (let k = 1; k <= 3; k++) {
      const rc = axialToRc(tete.q + d.q * k, tete.r + d.r * k);
      if (!rc) break;
      const v = avant[cle(rc)];
      if (!v || v === moi) break;
      const dest = axialToRc(tete.q + d.q * (k + 1), tete.r + d.r * (k + 1));
      if (dest) out.push({ de: rc, a: dest, couleur: v });   // sinon : ejectee
    }
  }
  return out;
}
function _dessinerChevron(ctx, centre, ux, uy, couleurBille) {
  const R = HEX_RADIUS * 0.9;                 // rayon approximatif d'une bille
  const pointe = { x: centre.x + ux * R * 0.55, y: centre.y + uy * R * 0.55 };
  const bras = R * 0.34, s = Math.SQRT1_2;
  const bx = -ux, by = -uy;                   // vers l'arriere de la bille
  ctx.beginPath();
  ctx.moveTo(pointe.x + bras * (bx * s - by * s), pointe.y + bras * (bx * s + by * s));
  ctx.lineTo(pointe.x, pointe.y);
  ctx.lineTo(pointe.x + bras * (bx * s + by * s), pointe.y + bras * (-bx * s + by * s));
  ctx.strokeStyle = couleurBille === 'white' ? 'rgba(18,18,18,0.85)' : 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, R * 0.14);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();
}
function drawLastMoveArrow(ctx) {   // nom conserve : appele par drawBoard
  if (typeof showLastMoveArrow !== 'undefined' && !showLastMoveArrow) return;
  if (typeof boardSnapshots === 'undefined' || !boardSnapshots.length) return;
  /* En replay, le marquage doit designer le coup AFFICHE, pas le dernier coup
     de la partie (remarque de Saab). A la position initiale (index -1), il
     n'y a pas encore de coup. */
  let _idx = boardSnapshots.length - 1;
  if (typeof replayMode !== 'undefined' && replayMode && typeof replayCurrentIdx !== 'undefined') {
    if (replayCurrentIdx < 0) return;
    _idx = replayCurrentIdx;
  }
  const snap = boardSnapshots[_idx];
  const avant = _idx > 0 ? (boardSnapshots[_idx - 1] && boardSnapshots[_idx - 1].board)
                         : (typeof _replayStartBoard !== 'undefined' ? _replayStartBoard : null);
  const billes = _dernierCoupBillesDeplacees(snap, avant);
  if (!billes.length) return;
  // direction a l'ecran (tient compte de l'orientation du plateau)
  const p0 = hexCoord(billes[0].de.r, billes[0].de.c), p1 = hexCoord(billes[0].a.r, billes[0].a.c);
  const n = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  if (n < 1) return;
  const ux = (p1.x - p0.x) / n, uy = (p1.y - p0.y) / n;
  ctx.save();
  billes.forEach(function(b){ _dessinerChevron(ctx, hexCoord(b.a.r, b.a.c), ux, uy, b.couleur); });
  ctx.restore();
}

/* ── Affichage des menaces d'éjection ─────────────────────────────────
   Marque d'un halo rouge chaque bille qui peut être éjectée du plateau au
   PROCHAIN coup adverse — pour les deux camps à la fois. S'appuie sur le
   vrai moteur : on génère tous les coups d'éjection légaux de chaque
   couleur (validateMove renvoie oppStart = la bille éjectée) et on marque
   ces billes. Idée de Saab (bouton « !? » dans ses diagrammes). Désactivé
   par défaut ; activable dans les réglages d'accessibilité. */
function drawThreats(ctx) {
  if (typeof showThreats !== 'undefined' && !showThreats) return;
  if (typeof board === 'undefined' || typeof getAllMovesForColor !== 'function') return;
  if (typeof GameOver !== 'undefined' && GameOver.get()) return;

  // Collecte les billes menacées d'éjection, par couleur de la VICTIME
  const menaced = {};   // "r,c" -> couleur de la bille menacée
  ['black','white'].forEach(function(attacker){
    let moves;
    try { moves = getAllMovesForColor(attacker); } catch(e){ return; }
    if (!moves) return;
    moves.forEach(function(m){
      if (!m.eject) return;
      // la bille éjectée est la première bille adverse dans la ligne de poussée
      const info = m.info || (typeof validateMove === 'function' ? validateMove(m.cells, m.dir, attacker) : null);
      if (!info || !info.ejection || !info.oppStart) return;
      // oppStart est en coordonnées AXIALES {q,r} → convertir en case {r,c}
      const victim = (typeof axialToRc === 'function') ? axialToRc(info.oppStart.q, info.oppStart.r) : null;
      if (!victim) return;
      menaced[victim.r + ',' + victim.c] = (attacker === 'black') ? 'white' : 'black';
    });
  });

  const keys = Object.keys(menaced);
  if (!keys.length) return;

  // halo rouge pulsé (léger) autour de chaque bille menacée
  const pulse = 0.55 + 0.25 * Math.sin(Date.now() / 350);
  ctx.save();
  keys.forEach(function(k){
    const parts = k.split(',');
    const p = hexCoord(parseInt(parts[0],10), parseInt(parts[1],10));
    ctx.beginPath();
    ctx.arc(p.x, p.y, HEX_RADIUS - 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(224,64,64,' + pulse.toFixed(2) + ')';
    ctx.lineWidth = 4;
    ctx.stroke();
    // petit ⚠ discret en haut à droite de la bille
    ctx.font = (HEX_RADIUS * 0.7).toFixed(0) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠', p.x + HEX_RADIUS * 0.55, p.y - HEX_RADIUS * 0.55);
  });
  ctx.restore();

  // anime tant que les menaces sont affichées (halo pulsé)
  if (typeof showThreats !== 'undefined' && showThreats && !_threatAnimScheduled) {
    _threatAnimScheduled = true;
    requestAnimationFrame(function(){ _threatAnimScheduled = false; if (typeof drawBoard === 'function') drawBoard(); });
  }
}
let _threatAnimScheduled = false;

// Calcule et affiche le meilleur coup pour la position d'analyse courante
function analysisShowBestMove() {
  if (Object.keys(analysisBoard).length === 0) { showToast('⚠️ Charge une position d\'abord'); return; }
  const info = document.getElementById('analysis-bestmove-info');
  if (info) info.textContent = '🧠 Calcul en cours...';
  // laisse l'UI se rafraîchir avant le calcul
  setTimeout(function() {
    const savedB = board, savedCB = CapturedByBlack.get(), savedCW = CapturedByWhite.get();
    board = analysisBoard; CapturedByBlack.set(analysisCapB); CapturedByWhite.set(analysisCapW);
    let best = null;
    try {
      best = searchBestMove(analysisTurn, 3, 2000);  // profondeur 3, max 2s
    } catch(e) { best = null; }
    board = savedB; CapturedByBlack.set(savedCB); CapturedByWhite.set(savedCW);

    if (best && best.cells) {
      analysisBestHint = { cells: best.cells, dir: best.dir };
      drawAnalysisBoard();
      const from = coordToABAPRO(best.cells[0].r, best.cells[0].c);
      const typeLabel = best.eject ? 'éjection !' : best.type === 'push' ? 'poussée' : best.type === 'broadside' ? 'latéral' : 'déplacement';
      if (info) info.textContent = '💡 Meilleur coup : ' + from + ' (' + typeLabel + ')';
    } else {
      if (info) info.textContent = 'Aucun coup trouvé';
    }
  }, 50);
}

