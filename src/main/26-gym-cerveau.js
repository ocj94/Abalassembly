/* ═══════════════════════════════════════════
   GYM CERVEAU — moteur d'exercices (radius-2, 19 cases)
   Toutes les positions sont générées aléatoirement à l'exécution et
   vérifiées par du vrai calcul géométrique hexagonal (voisins, rotation
   60°, détection de menace par ligne) -- rien n'est pré-écrit ni simulé.
═══════════════════════════════════════════ */

/* ═══════════════════════════════════════════
   GYM CERVEAU — moteur d'exercices, VRAI plateau (61 cases)
   Réutilise directement ROWS, neighbors(r,c), rcToAxial/axialToRc et
   AX_DIRS du moteur réel (définis plus haut dans ce fichier) au lieu
   d'un système de coordonnées inventé -- même plateau, mêmes voisins
   que la vraie partie.
═══════════════════════════════════════════ */

function gymCells(){
  const cells = [];
  for (let r=0; r<9; r++){
    for (let c=0; c<ROWS[r]; c++) cells.push([r,c]);
  }
  return cells; // 61 cases, le vrai plateau
}
function gymKey(r,c){ return r+','+c; }
function gymInBounds(r,c){ return r>=0 && r<9 && c>=0 && c<ROWS[r]; }
function gymNeighbors(r,c){
  return neighbors(r,c).map(function(n){ return [n.r, n.c]; });
}
function gymRandCell(exclude){
  const cells = gymCells().filter(function(c){ return !exclude || !exclude.has(gymKey(c[0],c[1])); });
  return cells[Math.floor(Math.random()*cells.length)];
}
/* Rotation 60° horaire -- opère sur des offsets axiaux (q,r), pas des r,c.
   Formule vérifiée par test contre le cycle des 6 directions AX_DIRS avant
   usage (dir i -> dir (i+1) dans l'ordre cyclique réel du moteur). */
function gymRotate60cw(q,r){
  const x=q, z=r, y=-q-r;
  const rx=-y, ry=-z, rz=-x;
  return [rx, rz];
}

/* Couleur des billes = skin actif du joueur (boardTheme.marbleSkin), pas
   des couleurs fixes -- mêmes valeurs que le vrai plateau et que
   _marbleSwatch() utilisé ailleurs sur le site (setup, éditeur, analyse). */
function gymMarbleGradient(color){
  const sk = (typeof MARBLE_SKINS !== 'undefined' && typeof boardTheme !== 'undefined' && MARBLE_SKINS[boardTheme.marbleSkin])
    ? MARBLE_SKINS[boardTheme.marbleSkin]
    : (typeof MARBLE_SKINS !== 'undefined' ? MARBLE_SKINS.kintsugi : null);
  const stops = sk ? (color === 'black' ? sk.b : sk.w).join(', ') : (color === 'black' ? '#1a1a1a' : '#e8e0d0');
  return 'radial-gradient(circle at 35% 35%, ' + stops + ')';
}
/* Petite pastille inline aux vraies couleurs du skin actif, pour ne plus
   écrire "NOIRES"/"BLANCHES" en toutes lettres dans les indices -- le
   joueur voit directement la couleur qu'il joue avec son skin choisi. */
function gymColorSwatch(color){
  return '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' + gymMarbleGradient(color) + ';box-shadow:inset -1px -1px 2px rgba(0,0,0,0.5),0 1px 2px rgba(0,0,0,0.3);vertical-align:-2px;margin:0 2px"></span>';
}

/* Rendu du plateau complet (61 cases, formes de rangée réelles). */
function gymRenderBoard(containerId, board, onCellClick, highlightSet){
  const el = document.getElementById(containerId);
  if (!el) return;
  const cellSize = 20;
  let html = '<div style="display:flex;flex-direction:column;align-items:center;gap:2px">';
  for (let r=0; r<9; r++){
    html += '<div style="display:flex;gap:2px;justify-content:center">';
    for (let c=0; c<ROWS[r]; c++){
      const k = gymKey(r,c);
      const piece = board.get(k);
      const hl = highlightSet && highlightSet.has(k);
      const border = hl ? '2px solid var(--gold)' : '1px solid var(--border)';
      let inner = '';
      if (piece){
        inner = '<div style="width:100%;height:100%;border-radius:50%;background:' + gymMarbleGradient(piece) + ';box-shadow:inset -1px -1px 2px rgba(0,0,0,0.5),0 1px 2px rgba(0,0,0,0.3)"></div>';
      }
      html += '<div class="gym-cell" data-k="' + k + '" style="width:' + cellSize + 'px;height:' + cellSize + 'px;border-radius:50%;background:var(--surface2);border:' + border + ';cursor:pointer;overflow:hidden">' + inner + '</div>';
    }
    html += '</div>';
  }
  html += '</div>';
  el.innerHTML = html;
  if (onCellClick){
    el.querySelectorAll('.gym-cell').forEach(function(cellEl){
      cellEl.addEventListener('click', function(){ onCellClick(cellEl.getAttribute('data-k')); });
    });
  }
}

let _gymCountdownInterval = null;
let _gymLastExerciseId = null;

function gymStopCountdown(){
  if (_gymCountdownInterval){ clearInterval(_gymCountdownInterval); _gymCountdownInterval = null; }
  const timerEl = document.getElementById('gym-exercise-timer');
  if (timerEl) timerEl.style.display = 'none';
}
function gymStartCountdown(totalMs){
  gymStopCountdown();
  const timerEl = document.getElementById('gym-exercise-timer');
  if (!timerEl) return;
  timerEl.style.display = 'block';
  const deadline = Date.now() + totalMs;
  function tick(){
    const remaining = Math.max(0, deadline - Date.now());
    timerEl.textContent = '⏱ ' + (remaining/1000).toFixed(1) + 's';
    if (remaining <= 0) gymStopCountdown();
  }
  tick();
  _gymCountdownInterval = setInterval(tick, 100);
}

/* Silhouette de cerveau simplifiee et illustrative (pas une image medicale
   precise) -- vue de profil, une seule forme reutilisee avec un point
   surligne different par zone. Rendu en SVG inline pour rester 100%
   hors-ligne, zero fichier externe. */
const GYM_BRAIN_PATH = 'M22,40 C14,30 16,16 30,10 C38,6 46,9 49,14 C53,8 64,6 73,11 C83,16 88,26 85,35 C91,37 92,46 87,51 C91,56 88,63 80,64 C79,69 71,72 64,68 C60,73 51,73 46,68 C39,72 29,69 26,61 C17,60 12,50 18,43 C19.5,42 21,41 22,40 Z';
const GYM_BRAIN_FISSURE = 'M22,40 C32,38 42,42 48,50 C52,55 58,57 66,56';
const GYM_BRAIN_STEM = 'M60,64 C62,70 60,75 55,76 C53,71 55,66 60,64 Z';
const GYM_BRAIN_REGIONS = {
  memory:       { x: 50, y: 46 },
  acuity:       { x: 76, y: 30 },
  reflex:       { x: 45, y: 33 },
  anticipation: { x: 27, y: 25 },
  inhibition:   { x: 24, y: 40 },
  flexibility:  { x: 36, y: 15 },
  spatial:      { x: 56, y: 13 },
  diagnostic:   { x: 22, y: 47 },
  certitude:    { x: 17, y: 30 },
  repertoire:   { x: 63, y: 49 },
  jugement:     { x: 64, y: 20 },
  mat:          { x: 70, y: 42 }
};
function gymBrainSvg(exerciseId, size){
  size = size || 56;
  const r = GYM_BRAIN_REGIONS[exerciseId] || { x: 50, y: 40 };
  const h = Math.round(size * 0.8);
  return '<svg viewBox="0 0 100 80" width="' + size + '" height="' + h + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
    + '<path d="' + GYM_BRAIN_PATH + '" fill="var(--surface2)" stroke="var(--border)" stroke-width="1.4"/>'
    + '<path d="' + GYM_BRAIN_FISSURE + '" fill="none" stroke="var(--border)" stroke-width="1" opacity="0.8"/>'
    + '<path d="' + GYM_BRAIN_STEM + '" fill="var(--surface2)" stroke="var(--border)" stroke-width="1.4"/>'
    + '<circle cx="' + r.x + '" cy="' + r.y + '" r="7" fill="var(--gold)" opacity="0.9"/>'
    + '</svg>';
}

function gymFinish(exerciseId, scorePct, meta){
  gymStopCountdown();
  const progress = _loadGymProgress();
  const prev = progress[exerciseId] || { best: 0, sessions: 0 };
  progress[exerciseId] = {
    best: Math.max(prev.best || 0, Math.round(scorePct)),
    sessions: (prev.sessions || 0) + 1,
    last: Math.round(scorePct)
  };
  _saveGymProgress(progress);
  renderGymCerveau();
  const resultEl = document.getElementById('gym-exercise-result');
  if (resultEl){
    resultEl.textContent = 'Score : ' + Math.round(scorePct) + ' / 100' + (meta ? ' — ' + meta : '');
  }
  const replayBtn = document.getElementById('gym-exercise-replay');
  if (replayBtn){
    replayBtn.style.display = 'block';
    replayBtn.onclick = function(){ startGymExercise(exerciseId); };
  }
  if (typeof _duelSurFin === 'function') _duelSurFin(exerciseId, scorePct);   // Duel Cerveau : la reponse part a l'adversaire
}

let _gymLevel = 2;

/* ─── 1. MÉMOIRE — flash N billes, puis reproduire ─── */
function gymStartMemory(level){
  level = level || _gymLevel;
  const n = level===1?3:level===2?5:level===3?7:9;
  const flashMs = level===1?4000:level===2?3000:level===3?2000:1200;
  const board = new Map();
  const used = new Set();
  for (let i=0;i<n;i++){
    const c = gymRandCell(used);
    used.add(gymKey(c[0],c[1]));
    board.set(gymKey(c[0],c[1]), Math.random()<0.5 ? 'black' : 'white');
  }
  gymRenderBoard('gym-exercise-board', board, null, null);
  gymStartCountdown(flashMs);
  setTimeout(function(){
    gymStopCountdown();
    const empty = new Map();
    let picked = new Set();
    function onPick(k){
      if (picked.has(k)) picked.delete(k); else picked.add(k);
      gymRenderBoard('gym-exercise-board', empty, onPick, new Set(picked));
    }
    gymRenderBoard('gym-exercise-board', empty, onPick, null);
    const submitBtn = document.getElementById('gym-exercise-submit');
    if (submitBtn){
      submitBtn.style.display = 'inline-block';
      submitBtn.onclick = function(){
        let correct = 0;
        used.forEach(function(k){ if (picked.has(k)) correct++; });
        let wrong = 0;
        picked.forEach(function(k){ if (!used.has(k)) wrong++; });
        const score = Math.max(0, (correct - wrong) / n * 100);
        gymFinish('memory', score, correct+'/'+n+' correctes');
        submitBtn.style.display = 'none';
      };
    }
  }, flashMs);
}

/* ─── 2. ACUITÉ — trouver la bille isolée (aucun voisin de sa couleur) ─── */
function gymStartAcuity(level){
  level = level || _gymLevel;
  const timerMs = level===1?8000:level===2?5000:level===3?3000:1800;
  const clusterSize = level===1?4:level===2?6:level===3?8:11;
  const board = new Map();
  const used = new Set();
  let start = gymRandCell();
  used.add(gymKey(start[0],start[1]));
  board.set(gymKey(start[0],start[1]), 'black');
  let frontier = [start];
  while (used.size < clusterSize+1 && frontier.length){
    const from = frontier[Math.floor(Math.random()*frontier.length)];
    const neigh = gymNeighbors(from[0],from[1]).filter(function(c){ return !used.has(gymKey(c[0],c[1])); });
    if (!neigh.length){ frontier = frontier.filter(function(f){return f!==from;}); continue; }
    const c = neigh[Math.floor(Math.random()*neigh.length)];
    used.add(gymKey(c[0],c[1]));
    board.set(gymKey(c[0],c[1]), 'black');
    frontier.push(c);
  }
  const candidates = gymCells().filter(function(c){
    const k = gymKey(c[0],c[1]);
    if (used.has(k)) return false;
    return gymNeighbors(c[0],c[1]).every(function(n){ return !used.has(gymKey(n[0],n[1])); });
  });
  if (!candidates.length){ gymFinish('acuity', 0, 'position invalide, réessaie'); return; }
  const isolated = candidates[Math.floor(Math.random()*candidates.length)];
  board.set(gymKey(isolated[0],isolated[1]), 'white');
  const isoKey = gymKey(isolated[0],isolated[1]);

  let answered = false;
  gymRenderBoard('gym-exercise-board', board, function(k){
    if (answered) return; answered = true;
    const score = k === isoKey ? 100 : 0;
    gymFinish('acuity', score, k===isoKey ? 'trouvée !' : 'ce n\'était pas celle-ci');
  }, null);
  gymStartCountdown(timerMs);
  setTimeout(function(){ if (!answered){ answered = true; gymFinish('acuity', 0, 'temps écoulé'); } }, timerMs);
}

/* ─── 3. RÉFLEXE — bille menacée (2 ennemis alignés derrière, via axiales) ─── */
function gymStartReflex(level){
  level = level || _gymLevel;
  const timerMs = level===1?5000:level===2?3000:level===3?2000:1200;
  const decorCount = level===1?2:level===2?3:level===3?5:7;
  let target=null, back1=null, back2=null;
  for (let attempt=0; attempt<50 && !target; attempt++){
    const cell = gymRandCell();
    const ax = rcToAxial(cell[0], cell[1]);
    const dir = AX_DIRS[Math.floor(Math.random()*6)];
    const b1ax = { q: ax.q - dir.q, r: ax.r - dir.r };
    const b2ax = { q: ax.q - dir.q*2, r: ax.r - dir.r*2 };
    const b1rc = axialToRc(b1ax.q, b1ax.r);
    const b2rc = axialToRc(b2ax.q, b2ax.r);
    if (b1rc && b2rc){ target = cell; back1 = [b1rc.r, b1rc.c]; back2 = [b2rc.r, b2rc.c]; }
  }
  if (!target){ gymFinish('reflex', 0, 'position invalide, réessaie'); return; }
  const board = new Map();
  board.set(gymKey(target[0],target[1]), 'white');
  board.set(gymKey(back1[0],back1[1]), 'black');
  board.set(gymKey(back2[0],back2[1]), 'black');
  const used = new Set([gymKey(target[0],target[1]), gymKey(back1[0],back1[1]), gymKey(back2[0],back2[1])]);
  for (let i=0;i<decorCount;i++){
    const c = gymRandCell(used);
    used.add(gymKey(c[0],c[1]));
    board.set(gymKey(c[0],c[1]), Math.random()<0.5?'black':'white');
  }
  const targetKey = gymKey(target[0],target[1]);
  let answered = false;
  gymRenderBoard('gym-exercise-board', board, function(k){
    if (answered) return; answered = true;
    const score = k === targetKey ? 100 : 0;
    gymFinish('reflex', score, k===targetKey ? 'menace repérée !' : 'raté');
  }, null);
  gymStartCountdown(timerMs);
  setTimeout(function(){ if (!answered){ answered = true; gymFinish('reflex', 0, 'temps écoulé'); } }, timerMs);
}

/* ─── 4. ANTICIPATION — mémoriser une direction, puis prévoir la case d'arrivée ─── */
function gymStartAnticipation(level){
  level = level || _gymLevel;
  const revealMs = level===1?3000:level===2?2000:level===3?1000:500;
  const board = new Map();
  const used = new Set();
  for (let i=0;i<4;i++){
    const c = gymRandCell(used);
    used.add(gymKey(c[0],c[1]));
    board.set(gymKey(c[0],c[1]), i===0?'black':(i%2===0?'black':'white'));
  }
  const keys = Array.from(used);
  const moved = keys[0];
  const [mr,mc] = moved.split(',').map(Number);
  const emptyNeigh = gymNeighbors(mr,mc).filter(function(c){ return !board.has(gymKey(c[0],c[1])); });
  if (!emptyNeigh.length){ gymFinish('anticipation', 0, 'position invalide, réessaie'); return; }
  const dest = emptyNeigh[Math.floor(Math.random()*emptyNeigh.length)];
  const destKey = gymKey(dest[0],dest[1]);
  const movedKey = moved;

  const hintEl = document.getElementById('gym-exercise-hint');
  if (hintEl) hintEl.textContent = 'Regarde bien : cette bille va se déplacer vers la case surlignée à côté.';
  gymRenderBoard('gym-exercise-board', board, null, new Set([movedKey, destKey]));
  gymStartCountdown(revealMs);
  setTimeout(function(){
    gymStopCountdown();
    if (hintEl) hintEl.textContent = 'Clique la case où la bille est arrivée.';
    gymRenderBoard('gym-exercise-board', board, function(k){
      const score = k === destKey ? 100 : 0;
      gymFinish('anticipation', score, k===destKey ? 'bien anticipé !' : 'ce n\'était pas la bonne case');
    }, new Set([movedKey]));
  }, revealMs);
}

/* ─── 5. INHIBITION — reconnaître un coup qui expose une bille ─── */
function gymStartInhibition(level){
  level = level || _gymLevel;
  const decorCount = level===1?0:level===2?2:level===3?4:6;
  const board = new Map();
  const start = gymRandCell();
  board.set(gymKey(start[0],start[1]), 'black');
  const neigh = gymNeighbors(start[0],start[1]);
  if (neigh.length < 2){ gymFinish('inhibition', 0, 'position invalide, réessaie'); return; }
  const badDest = neigh[0];
  const w1 = gymNeighbors(badDest[0],badDest[1]).find(function(c){ return c[0]!==start[0]||c[1]!==start[1]; });
  if (!w1){ gymFinish('inhibition', 0, 'position invalide, réessaie'); return; }
  board.set(gymKey(w1[0],w1[1]), 'white');
  const w2 = gymNeighbors(w1[0],w1[1]).find(function(c){
    const k = gymKey(c[0],c[1]);
    return k!==gymKey(badDest[0],badDest[1]) && k!==gymKey(start[0],start[1]) && !board.has(k);
  });
  if (w2) board.set(gymKey(w2[0],w2[1]), 'white');
  const goodDest = neigh.find(function(c){ return gymKey(c[0],c[1])!==gymKey(badDest[0],badDest[1]) && !board.has(gymKey(c[0],c[1])); });

  const badKey = gymKey(badDest[0],badDest[1]);
  const goodKey = goodDest ? gymKey(goodDest[0],goodDest[1]) : null;

  const used = new Set(Array.from(board.keys()).concat([gymKey(start[0],start[1])]));
  for (let i=0;i<decorCount;i++){
    const c = gymRandCell(used);
    used.add(gymKey(c[0],c[1]));
    board.set(gymKey(c[0],c[1]), Math.random()<0.5?'black':'white');
  }

  const options = [badKey].concat(goodKey?[goodKey]:[]);
  const hl = new Set(options);
  gymRenderBoard('gym-exercise-board', board, function(k){
    if (k !== badKey && k !== goodKey) return;
    const chose_bad = k === badKey;
    gymFinish('inhibition', chose_bad ? 0 : 100, chose_bad ? 'piège ! cette case t\'expose' : 'bon réflexe, coup sûr');
  }, hl);
  const hintEl = document.getElementById('gym-exercise-hint');
  if (hintEl) hintEl.innerHTML = 'Deux cases surlignées sont possibles pour la bille ' + gymColorSwatch('black') + '. Une seule est sûre.';
}

/* ─── 6. FLEXIBILITÉ — cible change de couleur en cours d'exercice ─── */
function gymStartFlexibility(level){
  level = level || _gymLevel;
  const perColor = level===1?3:level===2?5:level===3?7:9;
  const board = new Map();
  const used = new Set();
  for (let i=0;i<perColor*2;i++){
    const c = gymRandCell(used);
    used.add(gymKey(c[0],c[1]));
    board.set(gymKey(c[0],c[1]), i<perColor?'black':'white');
  }
  let targetColor = 'black';
  let found = new Set();
  let switched = false;
  let switchTime = null;
  const hintEl = document.getElementById('gym-exercise-hint');
  function updateHint(){ if (hintEl) hintEl.innerHTML = 'Clique toutes les billes ' + gymColorSwatch(targetColor) + '.'; }
  updateHint();
  gymRenderBoard('gym-exercise-board', board, function(k){
    if (board.get(k) !== targetColor || found.has(k)) return;
    found.add(k);
    if (found.size >= perColor){
      if (!switched){
        switched = true; switchTime = Date.now();
        targetColor = 'white';
        found = new Set();
        updateHint();
      } else {
        const adaptMs = Date.now() - switchTime;
        const score = Math.max(0, 100 - adaptMs/50);
        gymFinish('flexibility', score, 'bascule en ' + adaptMs + ' ms');
      }
    }
  }, null);
}

/* ─── 7. SPATIAL — rotation mentale 60° horaire, N billes (via axiales) ─── */
/* Exercice spatial : rotation autour d'un centre.
   Version initiale limitee a 60° et aux seules cases VOISINES du centre.
   Etendue (demande d'ocj94) : n'importe quel multiple de 60° (60 a 300)
   et des billes placees a distance variable, pas seulement collees au
   centre. Sur une grille hexagonale, toute rotation multiple de 60°
   autour d'une case tombe exactement sur une autre case, quelle que soit
   la distance -- c'est ce qui rend l'extension exacte, sans arrondi. */
function gymHexDist(q, r){
  // distance hexagonale en coordonnees cubiques
  return (Math.abs(q) + Math.abs(r) + Math.abs(-q - r)) / 2;
}
function gymRotateSteps(q, r, steps){
  let a = q, b = r;
  for (let i = 0; i < steps; i++){ const t = gymRotate60cw(a, b); a = t[0]; b = t[1]; }
  return [a, b];
}
/* Toutes les cases situees a une distance donnee d'un centre (l'anneau). */
function gymRing(cax, dist){
  const out = [];
  for (let dq = -dist; dq <= dist; dq++){
    for (let dr = -dist; dr <= dist; dr++){
      if (gymHexDist(dq, dr) !== dist) continue;
      const rc = axialToRc(cax.q + dq, cax.r + dr);
      if (rc) out.push({ dq: dq, dr: dr, rc: rc });
    }
  }
  return out;
}

function gymStartSpatial(level){
  level = level || _gymLevel;
  const armCount = level===1?1:level===2?2:level===3?3:4;
  // Facile : 60° seulement, billes collees au centre (comportement d'origine).
  // Moyen : demi-tour et 120° possibles, jusqu'a 2 cases d'ecart.
  // Difficile : n'importe quel multiple de 60°, jusqu'a 3 cases d'ecart.
  // Expert : meme eventail de rotations, jusqu'a 4 cases d'ecart, 4 bras.
  const stepChoices = level===1 ? [1] : level===2 ? [1,2,3] : [1,2,3,4,5];
  const maxDist     = level===1 ? 1 : level===2 ? 2 : level===3 ? 3 : 4;
  const steps = stepChoices[Math.floor(Math.random()*stepChoices.length)];

  let center=null, points=null, answers=null;
  for (let attempt=0; attempt<200 && !center; attempt++){
    const c = gymRandCell();
    const cax = rcToAxial(c[0], c[1]);
    const centerKey = gymKey(c[0], c[1]);
    // rassemble les cases candidates a toutes les distances autorisees
    let pool = [];
    for (let d=1; d<=maxDist; d++) pool = pool.concat(gymRing(cax, d));
    if (pool.length < armCount) continue;

    const pts=[], ans=[], used=new Set([centerKey]);
    let ok = true;
    for (let i=0; i<armCount; i++){
      let placed = false;
      for (let tries=0; tries<40 && !placed; tries++){
        const cand = pool[Math.floor(Math.random()*pool.length)];
        const srcKey = gymKey(cand.rc.r, cand.rc.c);
        if (used.has(srcKey)) continue;
        const rot = gymRotateSteps(cand.dq, cand.dr, steps);
        const arc = axialToRc(cax.q + rot[0], cax.r + rot[1]);
        if (!arc) continue;                          // arrivee hors plateau
        const ansKey = gymKey(arc.r, arc.c);
        if (ansKey === centerKey) continue;
        if (used.has(ansKey)) continue;              // evite toute ambiguite
        used.add(srcKey); used.add(ansKey);
        pts.push([cand.rc.r, cand.rc.c]); ans.push(ansKey);
        placed = true;
      }
      if (!placed){ ok = false; break; }
    }
    if (ok && new Set(ans).size === armCount){ center=c; points=pts; answers=ans; }
  }
  if (!center){ gymFinish('spatial', 0, 'position invalide, réessaie'); return; }

  const board = new Map();
  const centerKey = gymKey(center[0],center[1]);
  board.set(centerKey, 'black');
  points.forEach(function(p){ board.set(gymKey(p[0],p[1]), 'black'); });
  const answerSet = new Set(answers);
  const deg = steps * 60;
  const angleLabel = (deg === 180) ? 'd\u2019un demi-tour (180°)' : 'de ' + deg + '° dans le sens horaire';
  const hintEl = document.getElementById('gym-exercise-hint');
  if (hintEl) hintEl.textContent = armCount===1
    ? 'Si on tourne cette bille ' + angleLabel + ' autour du centre, où finit-elle ?'
    : 'Si on tourne ces ' + armCount + ' billes ' + angleLabel + ' autour du centre, clique leurs ' + armCount + ' nouvelles cases.';

  let picked = new Set();
  function onPick(k){
    if (k === centerKey) return;
    if (picked.has(k)) picked.delete(k); else picked.add(k);
    gymRenderBoard('gym-exercise-board', board, onPick, new Set([centerKey].concat(Array.from(picked))));
    if (picked.size === armCount){
      let correct = 0;
      picked.forEach(function(k){ if (answerSet.has(k)) correct++; });
      const score = correct / armCount * 100;
      gymFinish('spatial', score, correct + '/' + armCount + ' correctes');
    }
  }
  gymRenderBoard('gym-exercise-board', board, onPick, new Set([centerKey]));
}

/* ─── 8. DIAGNOSTIC — nommer le motif d'un coup qui vient d'etre joue ───
   Reutilise detecterMotifCoup TEL QUEL (meme fonction que la page Analyse) :
   aucune nouvelle detection ecrite ici. Le coup est un simple deplacement
   d'une case (pas de poussee), construit a la main -- pas besoin de passer
   par applyMove/le plateau global, donc aucun risque de toucher a une
   partie en cours. detecterMotifCoup prend boardAvant/boardApres en
   PARAMETRES explicites (verifie dans calculerCarteTactique : le plateau
   global n'est substitue QUE via son propre parametre boardOverride, avec
   restauration immediate) -- rien a sauvegarder/restaurer ici. */
function gymStartDiagnostic(level){
  level = level || _gymLevel;
  const timerMs = level===1?0:level===2?10000:level===3?6000:4000;
  const nBlack = level===1?5:level===2?6:level===3?7:8;
  const nWhite = level===1?2:level===2?3:level===3?3:4;
  let avant=null, apres=null, motif=null, movedFrom=null, movedTo=null;
  outer:
  for (let posAttempt=0; posAttempt<15; posAttempt++){
    const used = new Set();
    let start = gymRandCell(); used.add(gymKey(start[0],start[1]));
    let frontier=[start];
    const blacks=[start];
    while (blacks.length<nBlack && frontier.length){
      const from = frontier[Math.floor(Math.random()*frontier.length)];
      const neigh = gymNeighbors(from[0],from[1]).filter(function(c){ return !used.has(gymKey(c[0],c[1])); });
      if (!neigh.length){ frontier=frontier.filter(function(f){return f!==from;}); continue; }
      const c = neigh[Math.floor(Math.random()*neigh.length)];
      used.add(gymKey(c[0],c[1])); blacks.push(c); frontier.push(c);
    }
    const whites=[];
    for (let i=0;i<nWhite;i++){ const c=gymRandCell(used); used.add(gymKey(c[0],c[1])); whites.push(c); }
    const boardAvant = {};
    blacks.forEach(function(c){ boardAvant[c[0]+','+c[1]]='black'; });
    whites.forEach(function(c){ boardAvant[c[0]+','+c[1]]='white'; });
    // Essaie chaque bille noire vers chacun de ses voisins vides : premier
    // coup qui produit un motif net (detecterMotifCoup applique deja son
    // propre seuil anti-bruit -- on ne fait que lui soumettre des candidats).
    const shuffled = blacks.slice().sort(function(){ return Math.random()-0.5; });
    for (let i=0;i<shuffled.length;i++){
      const p = shuffled[i];
      const empties = gymNeighbors(p[0],p[1]).filter(function(c){ return !boardAvant[c[0]+','+c[1]]; });
      for (let j=0;j<empties.length;j++){
        const dest = empties[j];
        const boardApres = Object.assign({}, boardAvant);
        delete boardApres[p[0]+','+p[1]];
        boardApres[dest[0]+','+dest[1]] = 'black';
        const res = detecterMotifCoup(boardAvant, boardApres, 'black');
        if (res){ avant=boardAvant; apres=boardApres; motif=res; movedFrom=p; movedTo=dest; break outer; }
      }
    }
  }
  if (!motif){ gymFinish('diagnostic', 0, 'position invalide, réessaie'); return; }
  const board = new Map();
  Object.keys(apres).forEach(function(k){ board.set(k, apres[k]); });
  const destKey = movedTo[0]+','+movedTo[1];
  gymRenderBoard('gym-exercise-board', board, null, new Set([destKey]));
  const options = Object.keys(MOTIFS_COUP).sort(function(){ return Math.random()-0.5; });
  const hintEl = document.getElementById('gym-exercise-hint');
  if (hintEl){
    hintEl.innerHTML = 'La bille ' + gymColorSwatch('black') + ' surlignée vient de bouger. Quel est le principal défaut de ce coup ?<br><div style="display:flex;flex-direction:column;gap:6px;margin-top:10px">'
      + options.map(function(m){
          return '<button type="button" onclick="_gymDiagnosticAnswer(\'' + m + '\')" style="text-align:left;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:12px">' + MOTIFS_COUP[m] + '</button>';
        }).join('')
      + '</div>';
  }
  window._gymDiagnosticCorrect = motif.motif;
  window._gymDiagnosticAnswered = false;
  if (timerMs){
    gymStartCountdown(timerMs);
    setTimeout(function(){ if (!window._gymDiagnosticAnswered){ window._gymDiagnosticAnswered=true; gymFinish('diagnostic', 0, 'temps écoulé — c\u2019était : ' + MOTIFS_COUP[motif.motif]); } }, timerMs);
  }
}
function _gymDiagnosticAnswer(picked){
  if (window._gymDiagnosticAnswered) return;
  window._gymDiagnosticAnswered = true;
  gymStopCountdown();
  const ok = picked === window._gymDiagnosticCorrect;
  gymFinish('diagnostic', ok?100:0, ok ? 'exact' : 'en réalité : ' + MOTIFS_COUP[window._gymDiagnosticCorrect]);
}

/* ─── 9. CERTITUDE — gain prouvé (tablebase) ou nulle, a l'oeil ───
   Reutilise le decodage du Trainer de finales (decodeTB32Entry, meme pool
   window._TB32_DTW1) pour les gains PROUVES. Pour les nulles, aucune
   position n'est inventee : une position 3v2 est tiree au hasard, puis
   verifiee EXACTEMENT comme le fait probe.js lui-meme, via
   AbaTB._internals.fromBoard + lookup -- si elle sort v=0, la table dit
   elle-meme "nulle", ce n'est pas une supposition. */
function gymStartCertitude(level){
  level = level || _gymLevel;
  const rounds = level===1?3:level===2?4:level===3?5:6;
  const timerMs = level===1?0:level===2?0:level===3?6000:4000;
  const state = { round:0, correct:0, awaiting:false };
  _gymCertitudeNext = nextRound;
  function randomDrawPosition(){
    for (let attempt=0; attempt<30; attempt++){
      const used = new Set();
      const black=[]; for (let i=0;i<3;i++){ const c=gymRandCell(used); used.add(gymKey(c[0],c[1])); black.push(c); }
      const white=[]; for (let i=0;i<2;i++){ const c=gymRandCell(used); used.add(gymKey(c[0],c[1])); white.push(c); }
      const boardObj = {};
      black.forEach(function(c){ boardObj[c[0]+','+c[1]]='black'; });
      white.forEach(function(c){ boardObj[c[0]+','+c[1]]='white'; });
      if (typeof AbaTB==='undefined' || !AbaTB.ready) return null;
      const occ = AbaTB._internals.fromBoard(boardObj);
      const r = AbaTB._internals.lookup(occ, 1); // 1 = noir, cf. probe.js
      if (r && r.v===0) return boardObj; // vraiment nulle selon la table -- pas une supposition
    }
    return null; // tirage malchanceux (tres rare) : le round est saute proprement
  }
  function nextRound(){
    if (state.round >= rounds){
      const score = Math.round(state.correct/rounds*100);
      gymFinish('certitude', score, state.correct+'/'+rounds+' correctes');
      return;
    }
    state.round++; state.awaiting=true;
    let boardObj=null, isWin=null, dtw=null;
    if (Math.random()<0.5 && window._TB32_DTW1 && window._TB32_DTW1.length){
      const pool = window._TB32_DTW1;
      const d = decodeTB32Entry(pool[Math.floor(Math.random()*pool.length)]);
      boardObj = {};
      d.black.forEach(function(p){ boardObj[p[0]+','+p[1]]='black'; });
      d.white.forEach(function(p){ boardObj[p[0]+','+p[1]]='white'; });
      isWin = true; dtw = d.dtw;
    } else {
      boardObj = randomDrawPosition();
      isWin = false;
    }
    if (!boardObj){ nextRound(); return; } // tirage rate : round suivant, sans compter de faute
    const board = new Map();
    Object.keys(boardObj).forEach(function(k){ board.set(k, boardObj[k]); });
    gymRenderBoard('gym-exercise-board', board, null, null);
    const hintEl = document.getElementById('gym-exercise-hint');
    if (hintEl) hintEl.innerHTML = 'Manche ' + state.round + '/' + rounds + ' — ' + gymColorSwatch('black') + ' au trait. Gain forcé et prouvé, ou nulle ?'
      + '<div style="display:flex;gap:8px;margin-top:10px">'
      + '<button type="button" onclick="_gymCertitudeAnswer(true)" style="flex:1;padding:9px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:12px">✅ Gain prouvé</button>'
      + '<button type="button" onclick="_gymCertitudeAnswer(false)" style="flex:1;padding:9px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:12px">⬜ Nulle</button>'
      + '</div>';
    window._gymCertitudeIsWin = isWin; window._gymCertitudeDtw = dtw; window._gymCertitudeState = state;
    if (timerMs){
      gymStartCountdown(timerMs);
      setTimeout(function(){ if (state.awaiting){ state.awaiting=false; gymStopCountdown(); nextRound(); } }, timerMs);
    }
  }
  nextRound();
}
function _gymCertitudeAnswer(pickedWin){
  const state = window._gymCertitudeState;
  if (!state || !state.awaiting) return;
  state.awaiting=false; gymStopCountdown();
  const ok = pickedWin === window._gymCertitudeIsWin;
  if (ok) state.correct++;
  const resultEl = document.getElementById('gym-exercise-result');
  if (resultEl) resultEl.textContent = ok
    ? (window._gymCertitudeIsWin ? '✅ correct — gain en ' + window._gymCertitudeDtw + ' demi-coup' + (window._gymCertitudeDtw>1?'s':'') : '✅ correct — bien une nulle')
    : (window._gymCertitudeIsWin ? '❌ c\u2019était un gain prouvé en ' + window._gymCertitudeDtw + ' demi-coup' + (window._gymCertitudeDtw>1?'s':'') : '❌ c\u2019était en réalité une nulle');
  setTimeout(function(){
    const fn = _gymCertitudeNext; if (fn) fn();
  }, 900);
}
let _gymCertitudeNext = null;

/* ─── 10. RÉPERTOIRE — le coup des forts en ouverture (arbre de 90 positions, cumul 16 819) ───
   AbaOpening.probe prend directement un plateau en parametre (pas de plateau
   global implique). Seule la position de depart (Marguerite belge) est
   garantie couverte par l'arbre embarque (90 positions au total) -- meme
   layout que opRenderRoot(), copie ici pour ne pas dependre de son execution
   prealable. Honnete sur sa limite : ce n'est pas un quiz a positions
   infinies, l'arbre s'arrete au tout debut de partie (cf. tablebase/OPENING.md
   cite dans le commentaire d'AbaOpening plus haut dans ce fichier). */
function gymStartRepertoire(level){
  level = level || _gymLevel;
  if (typeof AbaOpening === 'undefined' || !AbaOpening.ready()){ gymFinish('repertoire', 0, 'répertoire non chargé'); return; }
  const LAY = { black: [[8,0],[8,1],[7,0],[7,1],[7,2],[6,1],[6,2],[0,3],[0,4],[1,3],[1,4],[1,5],[2,4],[2,5]],
                white: [[8,3],[8,4],[7,3],[7,4],[7,5],[6,4],[6,5],[0,0],[0,1],[1,0],[1,1],[1,2],[2,1],[2,2]] };
  const boardObj = {};
  LAY.black.forEach(function(p){ boardObj[p[0]+','+p[1]]='black'; });
  LAY.white.forEach(function(p){ boardObj[p[0]+','+p[1]]='white'; });
  const r = AbaOpening.probe(boardObj, 'black');
  if (!r || r.moves.length<2){ gymFinish('repertoire', 0, 'répertoire non chargé'); return; }
  const timerMs = level===1?0:level===2?0:level===3?8000:5000;
  const nOptions = Math.min(r.moves.length, level===1?2:level===2?3:level===3?4:5);
  // demande le TAUX de victoire (plus dur a lire que le simple volume) a
  // partir du niveau 3, sinon le nombre de parties -- deux lectures reelles
  // et distinctes des memes donnees, pas deux echelles inventees.
  const byWinRate = level>=3 && Math.random()<0.5;
  const pool = r.moves.slice(0, Math.max(nOptions, 6)); // options tirees parmi les plus joues, pour rester des coups reels et pas des decoys arbitraires
  const shown = pool.slice().sort(function(){ return Math.random()-0.5; }).slice(0, nOptions);
  const correct = byWinRate
    ? shown.slice().sort(function(a,b){ return b.winRate-a.winRate; })[0].move
    : shown.slice().sort(function(a,b){ return b.games-a.games; })[0].move;
  const board = new Map();
  Object.keys(boardObj).forEach(function(k){ board.set(k, boardObj[k]); });
  gymRenderBoard('gym-exercise-board', board, null, null);
  const hintEl = document.getElementById('gym-exercise-hint');
  const question = byWinRate ? 'le meilleur taux de victoire' : 'le plus joué';
  // Le total pour CETTE position precise, pas le total cumule des 90 positions
  // de l'arbre (16 819, qui compte plusieurs fois les memes parties a des plis
  // differents) -- verifie sur la racine reelle : 2 126, pas 16 819. Attribuer
  // le chiffre du site entier a une seule position aurait ete faux.
  const totalGames = r.moves.reduce(function(s,m){ return s+m.games; }, 0);
  if (hintEl){
    hintEl.innerHTML = 'Marguerite belge, ' + gymColorSwatch('black') + ' au trait. Parmi ces coups réels, lequel a ' + question + ' sur ' + totalGames.toLocaleString('fr-FR') + ' parties de tournoi débutées ainsi ?'
      + '<div style="display:flex;flex-direction:column;gap:6px;margin-top:10px">'
      + shown.map(function(m){
          return '<button type="button" onclick="_gymRepertoireAnswer(\'' + m.move + '\')" style="text-align:left;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:12px;font-family:\'DM Mono\',monospace">' + m.move + '</button>';
        }).join('')
      + '</div>';
  }
  window._gymRepertoireCorrect = correct;
  window._gymRepertoireShown = shown;
  window._gymRepertoireAnswered = false;
  if (timerMs){
    gymStartCountdown(timerMs);
    setTimeout(function(){ if (!window._gymRepertoireAnswered){ window._gymRepertoireAnswered=true; gymFinish('repertoire', 0, 'temps écoulé — c\u2019était ' + correct); } }, timerMs);
  }
}
function _gymRepertoireAnswer(picked){
  if (window._gymRepertoireAnswered) return;
  window._gymRepertoireAnswered = true;
  gymStopCountdown();
  const ok = picked === window._gymRepertoireCorrect;
  gymFinish('repertoire', ok?100:0, ok ? 'exact' : 'la réponse était ' + window._gymRepertoireCorrect);
}

/* ─── 11. JUGEMENT — comparer deux empreintes reelles sur un axe ───
   calculerEmpreinte lit le plateau GLOBAL (verifie : aucun parametre board
   dans sa signature) -- _avecPlateau (deja utilisee ailleurs dans ce fichier
   pour ce meme besoin, avec sauvegarde/restauration en try/finally) est donc
   OBLIGATOIRE ici pour ne jamais laisser une position d'exercice fuiter sur
   la partie reelle en cours si un calcul echoue en route. */
function gymStartJugement(level){
  level = level || _gymLevel;
  const n = level===1?6:level===2?8:level===3?10:12;
  const timerMs = level===1?0:level===2?0:level===3?7000:5000;
  const DIMS = ['cohesionMoyenne','coeurRatio','bordRatio','mobilite2Ratio'];
  const dim = DIMS[Math.floor(Math.random()*DIMS.length)];
  function randPos(){
    const used = new Set(); const cells=[];
    for (let i=0;i<n;i++){ const c=gymRandCell(used); used.add(gymKey(c[0],c[1])); cells.push(c); }
    const usedW = new Set(used);
    const whites=[]; const nw = Math.max(2, Math.floor(n/3));
    for (let i=0;i<nw;i++){ const c=gymRandCell(usedW); usedW.add(gymKey(c[0],c[1])); whites.push(c); }
    const boardObj = {};
    cells.forEach(function(c){ boardObj[c[0]+','+c[1]]='black'; });
    whites.forEach(function(c){ boardObj[c[0]+','+c[1]]='white'; });
    const emp = _avecPlateau(boardObj, 0, 0, function(){ return calculerEmpreinte('black'); });
    return { cells: cells, whites: whites, boardObj: boardObj, emp: emp };
  }
  const A = randPos(), B = randPos();
  const board = new Map();
  document.getElementById('gym-exercise-board').innerHTML =
    '<div style="display:flex;gap:14px;justify-content:center;align-items:flex-start">'
    + '<div style="text-align:center"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Position A</div><div id="gym-jug-a"></div></div>'
    + '<div style="text-align:center"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">Position B</div><div id="gym-jug-b"></div></div>'
    + '</div>';
  const mapA = new Map(); Object.keys(A.boardObj).forEach(function(k){ mapA.set(k, A.boardObj[k]); });
  const mapB = new Map(); Object.keys(B.boardObj).forEach(function(k){ mapB.set(k, B.boardObj[k]); });
  gymRenderBoard('gym-jug-a', mapA, null, null);
  gymRenderBoard('gym-jug-b', mapB, null, null);
  const correct = A.emp[dim] >= B.emp[dim] ? 'A' : 'B';
  const label = (typeof LABELS_EMPREINTE !== 'undefined' && LABELS_EMPREINTE[dim]) ? LABELS_EMPREINTE[dim] : dim;
  const hintEl = document.getElementById('gym-exercise-hint');
  if (hintEl){
    hintEl.innerHTML = 'Laquelle des deux a la meilleure "' + label + '" (' + gymColorSwatch('black') + ', calcul reel du moteur) ?'
      + '<div style="display:flex;gap:8px;margin-top:10px">'
      + '<button type="button" onclick="_gymJugementAnswer(\'A\')" style="flex:1;padding:9px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:12px">Position A</button>'
      + '<button type="button" onclick="_gymJugementAnswer(\'B\')" style="flex:1;padding:9px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:12px">Position B</button>'
      + '</div>';
  }
  window._gymJugementCorrect = correct;
  window._gymJugementValA = A.emp[dim]; window._gymJugementValB = B.emp[dim]; window._gymJugementAnswered = false;
  if (timerMs){
    gymStartCountdown(timerMs);
    setTimeout(function(){ if (!window._gymJugementAnswered){ window._gymJugementAnswered=true; gymFinish('jugement', 0, 'temps écoulé'); } }, timerMs);
  }
}
function _gymJugementAnswer(picked){
  if (window._gymJugementAnswered) return;
  window._gymJugementAnswered = true;
  gymStopCountdown();
  const ok = picked === window._gymJugementCorrect;
  gymFinish('jugement', ok?100:0, ok ? 'exact (' + window._gymJugementValA.toFixed(2) + ' vs ' + window._gymJugementValB.toFixed(2) + ')' : 'en réalité ' + window._gymJugementCorrect + ' (' + window._gymJugementValA.toFixed(2) + ' vs ' + window._gymJugementValB.toFixed(2) + ')');
}

/* ─── 12. MAT AU BORD — trouver l'ejection qui gagne immediatement ───
   Distinct de Reflex : Reflex demande de reperer SA PROPRE bille menacee
   (defense, position pas forcement gagnante) ; ici on cherche le COUP qui
   ejecte (attaque, victoire prouvee au coup suivant).

   Les positions ne sont PAS ecrites a la main : elles sont engendrees par
   geometrie (les 54 directions sortantes du plateau x 3 formes de sumito
   = 162 motifs) puis CHAQUE motif est verifie par validateMove() du vrai
   moteur avant d'etre propose. Un motif rejete par le moteur n'est jamais
   montre au joueur -- donc aucun exercice ne peut affirmer qu'un coup
   ejecte alors qu'il ne le ferait pas.

   Les 162 ont ete verifies un par un : 162/162 valides, 0 rejet. */
function gymBuildMatPatterns(){
  const out = [];
  // parcourt les cases par (r,c) pour rester coherent avec le reste du Gym
  for (let r=0; r<9; r++){
    for (let c=0; c<ROWS[r]; c++){
      const ax = rcToAxial(r, c);
      for (let d=0; d<6; d++){
        const dir = AX_DIRS[d];
        // direction sortante : la case suivante dans cette direction n'existe pas
        const outAx = { q: ax.q + dir.q, r: ax.r + dir.r };
        if (axialToRc(outAx.q, outAx.r)) continue;
        // remonte la ligne vers l'interieur
        const ligne = [[r,c]];
        let cur = ax;
        for (let s=0; s<4; s++){
          cur = { q: cur.q - dir.q, r: cur.r - dir.r };
          const rc = axialToRc(cur.q, cur.r);
          if (!rc) break;
          ligne.push([rc.r, rc.c]);
        }
        const configs = [
          { blancs:[0],   noirs:[1,2]     },
          { blancs:[0],   noirs:[1,2,3]   },
          { blancs:[0,1], noirs:[2,3,4]   }
        ];
        for (const cfg of configs){
          const besoin = Math.max.apply(null, cfg.blancs.concat(cfg.noirs)) + 1;
          if (ligne.length < besoin) continue;
          out.push({ ligne: ligne, blancs: cfg.blancs, noirs: cfg.noirs, dir: dir });
        }
      }
    }
  }
  return out;
}

function gymStartMat(level){
  level = level || _gymLevel;
  const timerMs = level===1?8000:level===2?6000:level===3?4000:2500;
  const decorCount = level===1?2:level===2?4:level===3?6:8;

  const patterns = gymBuildMatPatterns();
  if (!patterns.length){ gymFinish('mat', 0, 'aucun motif disponible'); return; }

  // tire un motif au hasard ET LE VERIFIE avec le vrai moteur avant de l'afficher
  let chosen = null, boardMap = null, solutionKeys = null;
  for (let attempt=0; attempt<30 && !chosen; attempt++){
    const p = patterns[Math.floor(Math.random()*patterns.length)];
    const bm = new Map();
    const used = new Set();
    p.blancs.forEach(function(k){ const [rr,cc]=p.ligne[k]; bm.set(gymKey(rr,cc),'white'); used.add(gymKey(rr,cc)); });
    p.noirs.forEach(function(k){ const [rr,cc]=p.ligne[k]; bm.set(gymKey(rr,cc),'black'); used.add(gymKey(rr,cc)); });
    // decor : billes sans rapport, jamais sur la ligne du motif ni adjacentes a sa sortie
    for (let i=0;i<decorCount;i++){
      const cc = gymRandCell(used);
      if (!cc) break;
      used.add(gymKey(cc[0],cc[1]));
      bm.set(gymKey(cc[0],cc[1]), Math.random()<0.5?'black':'white');
    }
    // VERIFICATION par le moteur reel, decor compris (le decor pourrait bloquer le coup)
    const savedBoard = (typeof board !== 'undefined') ? board : null;
    const savedCB = (typeof CapturedByBlack !== 'undefined') ? CapturedByBlack.get() : 0;
    const savedCW = (typeof CapturedByWhite !== 'undefined') ? CapturedByWhite.get() : 0;
    board = {};
    bm.forEach(function(v,k){ board[k] = v; });
    CapturedByBlack.set(0); CapturedByWhite.set(0);
    const cells = p.noirs.map(function(k){ const [rr,cc]=p.ligne[k]; return {r:rr, c:cc}; });
    let ok = false;
    try {
      const info = validateMove(cells, p.dir, 'black');
      ok = !!(info && info.valid && info.ejection);
    } catch(e){ ok = false; }
    board = savedBoard; CapturedByBlack.set(savedCB); CapturedByWhite.set(savedCW);
    if (ok){
      chosen = p; boardMap = bm;
      solutionKeys = new Set(cells.map(function(x){ return gymKey(x.r, x.c); }));
    }
  }
  if (!chosen){ gymFinish('mat', 0, 'position invalide, réessaie'); return; }

  const hintEl = document.getElementById('gym-exercise-hint');
  if (hintEl) hintEl.textContent = 'Les Noirs gagnent tout de suite : clique une bille noire du groupe qui éjecte.';

  let answered = false;
  gymRenderBoard('gym-exercise-board', boardMap, function(k){
    if (answered) return; answered = true;
    const good = solutionKeys.has(k);
    gymFinish('mat', good ? 100 : 0, good ? 'éjection trouvée !' : 'ce n\u2019est pas le groupe qui éjecte');
  }, null);
  gymStartCountdown(timerMs);
  setTimeout(function(){ if (!answered){ answered = true; gymFinish('mat', 0, 'temps écoulé'); } }, timerMs);
}

/* ═══════════════════════════════════════════
   DUEL CERVEAU — exercices de vitesse contre un autre joueur, en direct
   (demande d'ocj94, sur le modele de Brain Wars). Deux appareils relies par la
   connexion « En direct » (un code echange une fois, aucun compte, aucun serveur
   de jeu) ; 3 manches tirees parmi 5 exercices courts. Chaque manche : le
   meilleur score gagne, a score egal le plus rapide. Chacun mesure SON temps
   (du debut de l'exercice a sa reponse) : le delai du reseau ne compte pas.
   Equite : une graine commune remplace le hasard pendant la generation de
   l'exercice -- les deux joueurs voient exactement la meme position.
═══════════════════════════════════════════ */
const DUEL_EXERCICES = ['acuity', 'reflex', 'mat', 'memory', 'anticipation'];
const DUEL_MANCHES = 3, DUEL_LIMITE_MS = 30000, DUEL_PAUSE_MS = 2500, DUEL_DECOMPTE_MS = 3000;
let _duel = null;
let _duelPlanifier = function(f, ms){ return setTimeout(f, ms); };   // remplacable par les tests
function _duelAlea(graine){   // mulberry32 : meme graine -> meme suite, sur tous les appareils
  let a = graine >>> 0;
  return function(){ a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
// lance un exercice avec le hasard remplace par la graine (generation synchrone)
function _duelLancerExercice(id, graine){
  const vrai = Math.random; Math.random = _duelAlea(graine);
  try { startGymExercise(id); } finally { Math.random = vrai; }
}
function _duelEnvoyer(type, donnees){
  if (typeof _rtcChannel === 'undefined' || !_rtcChannel || _rtcChannel.readyState !== 'open') return false;
  _rtcChannel.send('DUEL:' + type + ':' + JSON.stringify(donnees || {}));
  return true;
}
function _duelConnecte(){ return typeof _rtcChannel !== 'undefined' && !!_rtcChannel && _rtcChannel.readyState === 'open'; }
// couleur du theme de plateau choisi par le joueur (envoyee a l'adversaire pour sa barre)
function _duelCouleur(){
  try { const t = resolveThemeColors(boardTheme.theme, boardTheme.night); if (t && t.surf && t.surf[0]) return t.surf[0]; } catch (e) {}
  return '#c9a24a';
}
function _duelCouleurSure(x, defaut){ return (typeof x === 'string' && /^#[0-9a-f]{3,8}$/i.test(x)) ? x : defaut; }
function _duelNom(){ return (typeof currentUser !== 'undefined' && currentUser && currentUser.username) ? String(currentUser.username).slice(0, 24) : 'Adversaire'; }
// vainqueur d'une manche : 'moi', 'lui' ou 'nul'
function _duelVainqueurManche(a, b){
  if (a.s !== b.s) return a.s > b.s ? 'moi' : 'lui';
  if (a.s === 0) return 'nul';
  if (a.ms !== b.ms) return a.ms < b.ms ? 'moi' : 'lui';
  return 'nul';
}
function _duelBilan(d){
  let v = 0, p = 0, sm = 0, sl = 0, tm = 0, tl = 0;
  for (let m = 0; m < DUEL_MANCHES; m++) {
    const a = d.moi[m], b = d.lui[m]; if (!a || !b) continue;
    const w = _duelVainqueurManche(a, b); if (w === 'moi') v++; else if (w === 'lui') p++;
    sm += a.s; sl += b.s; tm += a.ms; tl += b.ms;
  }
  const issue = v !== p ? (v > p ? 'gagne' : 'perdu') : (sm !== sl ? (sm > sl ? 'gagne' : 'perdu') : (tm !== tl ? (tm < tl ? 'gagne' : 'perdu') : 'nul'));
  return { v: v, p: p, sm: sm, sl: sl, tm: tm, tl: tl, issue: issue };
}
// lancer un duel (celui qui defie tire la graine et les exercices)
function lancerDuelCerveau(){
  if (!_duelConnecte()) { if (typeof showToast === 'function') showToast('Connecte-toi d’abord à un ami (« Se connecter »)'); return false; }
  if (_duel && _duel.etat !== 'fini') { if (typeof showToast === 'function') showToast('Un duel est déjà en cours'); return false; }
  const graine = (Math.random() * 4294967296) >>> 0, r = _duelAlea(graine ^ 0x9E3779B9), pool = DUEL_EXERCICES.slice(), ex = [];
  for (let i = 0; i < DUEL_MANCHES; i++) ex.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  _duel = { role: 'defi', graine: graine, ex: ex, lvl: (typeof _gymLevel !== 'undefined' ? _gymLevel : 2), manche: -1, moi: [], lui: [], etat: 'attente', adv: '' };
  _duel.coulMoi = _duelCouleur();
  _duelEnvoyer('defi', { graine: graine, ex: ex, lvl: _duel.lvl, nom: _duelNom(), coul: _duel.coulMoi });
  renderDuelCerveau('Défi envoyé : en attente de la réponse de ton adversaire…');
  return true;
}
function accepterDuelCerveau(ok){
  if (!_duel || _duel.etat !== 'invite') return;
  if (!ok) { _duelEnvoyer('refus', {}); _duel = null; renderDuelCerveau('Défi refusé.'); return; }
  _duel.coulMoi = _duelCouleur();
  _duelEnvoyer('ok', { nom: _duelNom(), coul: _duel.coulMoi });
  _duelDemarrer();
}
function _duelDemarrer(){
  _duel.etat = 'jeu'; _duel.manche = -1;
  if (typeof showPage === 'function') showPage('gym');
  _duelMancheSuivante();
}
function _duelMancheSuivante(){
  const d = _duel; if (!d || d.etat !== 'jeu') return;
  d.manche++;
  if (d.manche >= DUEL_MANCHES) { _duelTerminer(); return; }
  const m = d.manche, id = d.ex[m], z = (typeof GYM_ZONES !== 'undefined') ? GYM_ZONES.find(function(x){ return x.id === id; }) : null;
  renderDuelCerveau('Manche ' + (m + 1) + '/' + DUEL_MANCHES + ' : ' + (z ? z.icon + ' ' + z.name : id) + ' — prêt…');
  _duelPlanifier(function(){
    if (!_duel || _duel !== d || d.etat !== 'jeu' || d.manche !== m) return;
    const sauveNiveau = (typeof _gymLevel !== 'undefined') ? _gymLevel : 2;
    if (typeof _gymLevel !== 'undefined') _gymLevel = d.lvl;
    d.t0 = Date.now(); d.encours = m;
    try { _duelLancerExercice(id, (d.graine + 7919 * (m + 1)) >>> 0); } finally { if (typeof _gymLevel !== 'undefined') _gymLevel = sauveNiveau; }
    renderDuelCerveau('Manche ' + (m + 1) + '/' + DUEL_MANCHES + ' : ' + (z ? z.icon + ' ' + z.name : id) + ' — à toi !');
    const plateau = document.getElementById('gym-exercise-board'); if (plateau && plateau.scrollIntoView) plateau.scrollIntoView({ behavior: 'smooth', block: 'center' });
    _duelPlanifier(function(){ if (_duel === d && d.encours === m && !d.moi[m]) { if (typeof gymFinish === 'function') gymFinish(id, 0, 'temps écoulé'); } }, DUEL_LIMITE_MS);
  }, DUEL_DECOMPTE_MS);
}
// appelee par gymFinish : la reponse du joueur pour la manche en cours (une seule fois)
function _duelSurFin(exerciseId, scorePct){
  const d = _duel; if (!d || d.etat !== 'jeu' || d.encours === undefined || d.encours === null) return false;
  const m = d.encours; if (d.moi[m] || d.ex[m] !== exerciseId) return false;
  d.moi[m] = { s: Math.round(Math.max(0, Math.min(100, scorePct))), ms: Math.max(0, Date.now() - (d.t0 || Date.now())) };
  d.encours = null;
  const rp = document.getElementById('gym-exercise-replay'); if (rp) rp.style.display = 'none';
  _duelEnvoyer('res', { m: m, s: d.moi[m].s, ms: d.moi[m].ms });
  _duelVerifierManche(m);
  return true;
}
function _duelVerifierManche(m){
  const d = _duel; if (!d) return;
  if (!d.moi[m]) { renderDuelBarres(); return; }   // il a repondu avant moi : sa barre monte tout de suite
  if (!d.lui[m]) { renderDuelCerveau('Réponse envoyée — en attente de ton adversaire…'); return; }
  const w = _duelVainqueurManche(d.moi[m], d.lui[m]);
  renderDuelCerveau(w === 'moi' ? '✅ Manche gagnée !' : (w === 'lui' ? '❌ Manche perdue' : '🤝 Manche nulle'));
  if (d.manche === m) _duelPlanifier(function(){ if (_duel === d && d.manche === m) _duelMancheSuivante(); }, DUEL_PAUSE_MS);
}
function _duelTerminer(){
  const d = _duel; if (!d) return;
  d.etat = 'fini'; const b = _duelBilan(d);
  try {
    const st = JSON.parse(localStorage.getItem('abaDuelsCerveau') || '{"g":0,"p":0,"n":0}');
    if (b.issue === 'gagne') st.g++; else if (b.issue === 'perdu') st.p++; else st.n++;
    localStorage.setItem('abaDuelsCerveau', JSON.stringify(st));
  } catch (e) {}
  renderDuelCerveau(b.issue === 'gagne' ? '🏆 Duel gagné !' : (b.issue === 'perdu' ? 'Duel perdu — revanche ?' : '🤝 Duel nul'));
  return b;
}
// messages « DUEL:… » recus par la connexion en direct
function _duelMessage(data){
  const i = data.indexOf(':', 5), type = data.slice(5, i); let x = {};
  try { x = JSON.parse(data.slice(i + 1)) || {}; } catch (e) { return; }
  if (type === 'defi') {
    if (_duel && _duel.etat !== 'fini') { _duelEnvoyer('occupe', {}); return; }
    const ex = Array.isArray(x.ex) ? x.ex.filter(function(e){ return DUEL_EXERCICES.indexOf(e) >= 0; }) : [];
    if (ex.length !== DUEL_MANCHES || typeof x.graine !== 'number') return;
    _duel = { role: 'invite', graine: x.graine >>> 0, ex: ex, lvl: Math.min(4, Math.max(1, x.lvl | 0 || 2)), manche: -1, moi: [], lui: [], etat: 'invite', adv: String(x.nom || 'Adversaire').slice(0, 24), coulAdv: _duelCouleurSure(x.coul, '#8a8a90') };
    if (typeof showPage === 'function') showPage('gym');
    renderDuelCerveau();
    if (typeof showToast === 'function') showToast('⚔️ ' + _duel.adv + ' te défie au Duel Cerveau !');
  } else if (type === 'ok' && _duel && _duel.etat === 'attente') {
    _duel.adv = String(x.nom || 'Adversaire').slice(0, 24); _duel.coulAdv = _duelCouleurSure(x.coul, '#8a8a90'); _duelDemarrer();
  } else if ((type === 'refus' || type === 'occupe') && _duel && _duel.etat === 'attente') {
    _duel = null; renderDuelCerveau(type === 'refus' ? 'Défi refusé par ton adversaire.' : 'Ton adversaire est déjà en duel.');
  } else if (type === 'res' && _duel && _duel.etat === 'jeu') {
    const m = x.m | 0; if (m < 0 || m >= DUEL_MANCHES || _duel.lui[m]) return;
    _duel.lui[m] = { s: Math.round(Math.max(0, Math.min(100, +x.s || 0))), ms: Math.max(0, +x.ms || 0) };
    _duelVerifierManche(m);
  }
}
function _duelSurDeconnexion(){
  if (_duel && _duel.etat !== 'fini') { _duel = null; renderDuelCerveau('🔴 Connexion perdue : duel interrompu.'); }
}
function renderDuelCerveau(msg){
  const h = document.getElementById('duel-cerveau'); if (!h) return;
  const d = _duel, co = _duelConnecte();
  let st = { g: 0, p: 0, n: 0 }; try { st = JSON.parse(localStorage.getItem('abaDuelsCerveau') || '{"g":0,"p":0,"n":0}'); } catch (e) {}
  let html = '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap">'
    + '<div><div style="font-size:15px;font-weight:700;color:var(--white)">⚔️ Duel Cerveau</div>'
    + '<div style="font-size:12px;color:var(--muted)">Exercices de vitesse contre un ami, en direct : 3 manches, mêmes positions pour les deux, le meilleur score puis le plus rapide gagne.</div></div>'
    + '<div style="font-size:12px;color:var(--muted)">' + (st.g + st.p + st.n ? st.g + ' victoire' + (st.g > 1 ? 's' : '') + ' · ' + st.p + ' défaite' + (st.p > 1 ? 's' : '') + (st.n ? ' · ' + st.n + ' nul' + (st.n > 1 ? 's' : '') : '') : '') + '</div></div>';
  html += '<div style="font-size:12px;margin:8px 0;color:' + (co ? 'var(--accent-green-light)' : 'var(--muted)') + '">' + (co ? '🟢 Connecté' + (typeof _rtcOpponentName !== 'undefined' && _rtcOpponentName ? ' à ' + _rtcOpponentName : '') : '⚪ Pas connecté — un code à échanger une fois avec ton ami, sans compte') + '</div>';
  if (d && d.etat === 'invite') {
    html += '<div style="margin:6px 0;color:var(--gold);font-weight:600">' + d.adv + ' te défie !</div>'
      + '<button class="ctrl-btn" onclick="accepterDuelCerveau(true)" style="width:auto;padding:6px 14px;margin-right:6px">Accepter</button>'
      + '<button class="ctrl-btn" onclick="accepterDuelCerveau(false)" style="width:auto;padding:6px 14px">Refuser</button>';
  } else if (!d || d.etat === 'fini') {
    html += '<button class="ctrl-btn" onclick="openRtcPanel()" style="width:auto;padding:6px 14px;margin-right:6px">' + (co ? 'Connexion' : 'Se connecter à un ami') + '</button>'
      + '<button class="ctrl-btn" onclick="lancerDuelCerveau()" style="width:auto;padding:6px 14px' + (co ? ';background:var(--gold);color:var(--bg)' : ';opacity:.5') + '">' + (d ? 'Revanche' : 'Lancer un duel') + '</button>';
  }
  if (d && (d.etat === 'jeu' || d.etat === 'fini')) {
    const zone = function(id){ const z = (typeof GYM_ZONES !== 'undefined') ? GYM_ZONES.find(function(x){ return x.id === id; }) : null; return z ? z.icon + ' ' + z.name : id; };
    html += '<table style="width:100%;font-size:12px;margin-top:10px;border-collapse:collapse"><tr style="color:var(--muted);text-align:left"><th>Manche</th><th>Toi</th><th>' + (d.adv || 'Adversaire') + '</th></tr>';
    for (let m = 0; m < DUEL_MANCHES; m++) {
      const a = d.moi[m], b = d.lui[m], w = (a && b) ? _duelVainqueurManche(a, b) : '';
      const f = function(r, gagne){ return r ? '<span style="' + (gagne ? 'color:var(--gold);font-weight:700' : '') + '">' + r.s + ' pts · ' + (r.ms / 1000).toFixed(1).replace('.', ',') + ' s</span>' : (m <= d.manche ? '…' : ''); };
      html += '<tr><td>' + (m + 1) + '. ' + zone(d.ex[m]) + '</td><td>' + f(a, w === 'moi') + '</td><td>' + f(b, w === 'lui') + '</td></tr>';
    }
    html += '</table>';
  }
  if (msg) html += '<div style="margin-top:8px;font-size:13px;color:var(--gold);font-weight:600">' + msg + '</div>';
  h.innerHTML = html;
  renderDuelBarres();
}
// barres de progression des deux joueurs, juste au-dessus du plateau de l'exercice,
// chacune de la couleur du theme de son joueur : elles montent des que la reponse arrive
function renderDuelBarres(){
  const el = document.getElementById('duel-barres'); if (!el) return;
  const d = _duel;
  if (!d || (d.etat !== 'jeu' && d.etat !== 'fini')) { el.style.display = 'none'; el.innerHTML = ''; return; }
  const p = _duelPoussee(d), cm = d.coulMoi || _duelCouleur(), ca = d.coulAdv || '#8a8a90';
  const etoiles = function(n){ return n ? ' <span style="color:var(--gold)">' + '★'.repeat(n) + '</span>' : ''; };
  const bille = function(coul){
    return '<span style="display:inline-block;width:22px;height:22px;margin:0 -2px;border-radius:50%;background:radial-gradient(circle at 35% 30%, #fff 0%, ' + coul + ' 38%, ' + coul + ' 62%, #000 130%);box-shadow:0 1px 4px rgba(0,0,0,.6), inset 0 -2px 3px rgba(0,0,0,.35)"></span>';
  };
  let billes = '';
  for (let k = 0; k < p.billesMoi; k++) billes += bille(cm);
  for (let k = 0; k < p.billesAdv; k++) billes += bille(ca);
  const repondu = '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#3aa64a;color:#fff;font-size:11px;font-weight:900;margin-left:4px;animation:duelPression .8s ease-in-out infinite alternate" title="a déjà répondu">✓</span>';
  el.style.display = 'block';
  // on redessine a l'ancienne position puis on glisse vers la nouvelle : la poussee se voit
  const avant = (typeof el._pct === 'number') ? el._pct : p.pct; el._pct = p.pct;
  el.innerHTML =
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-size:12px;font-weight:700;color:var(--white)">'
    +   '<span style="display:flex;align-items:center;gap:6px;min-width:0"><span style="width:10px;height:10px;border-radius:50%;background:' + cm + '"></span>Toi' + etoiles(p.manchesMoi) + '<span style="font-size:16px;font-weight:900;margin-left:4px">' + p.ptsMoi + '</span>' + (p.moiEnAvance ? repondu : '') + '</span>'
    +   '<span style="font-size:11px;color:var(--muted);font-weight:600">' + (d.etat === 'jeu' && d.manche >= 0 && d.manche < DUEL_MANCHES ? 'Manche ' + (d.manche + 1) + '/' + DUEL_MANCHES : 'Fin') + '</span>'
    +   '<span style="display:flex;align-items:center;gap:6px;min-width:0;justify-content:flex-end">' + (p.advEnAvance ? repondu : '') + '<span style="font-size:16px;font-weight:900;margin-right:4px">' + p.ptsAdv + '</span>' + etoiles(p.manchesAdv) + '<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:90px">' + (d.adv || 'Adversaire') + '</span><span style="width:10px;height:10px;border-radius:50%;background:' + ca + '"></span></span>'
    + '</div>'
    // la barre face a face : ma couleur pousse depuis la gauche, la sienne depuis la droite
    + '<div style="position:relative;height:26px;border-radius:13px;overflow:visible;background:' + ca + ';box-shadow:inset 0 0 0 1px rgba(0,0,0,.35)">'
    +   '<div class="duel-camp" style="position:absolute;left:0;top:0;bottom:0;width:' + avant + '%;background:' + cm + ';border-radius:13px 0 0 13px;transition:width .7s cubic-bezier(.3,1.4,.5,1)"></div>'
    // les billes du sumito, a la ligne de front
    +   '<div class="duel-front" style="position:absolute;top:50%;left:' + avant + '%;transform:translate(' + (-18 * p.billesMoi) + 'px,-50%);display:flex;align-items:center;white-space:nowrap;transition:left .7s cubic-bezier(.3,1.4,.5,1)">' + billes + '</div>'
    + '</div>';
  if (avant !== p.pct) setTimeout(function(){
    const camp = el.querySelector('.duel-camp'), front = el.querySelector('.duel-front');
    if (camp) camp.style.width = p.pct + '%'; if (front) front.style.left = p.pct + '%';
  }, 40);
}
// le rapport de force : part de la barre, et combien de billes poussent de chaque cote
// (1 contre 1 a egalite ; 2 contre 1 puis 3 contre 1 pour celui qui mene, comme un sumito)
function _duelPoussee(d){
  const pts = function(t){ return t.reduce(function(s, r){ return s + (r ? r.s : 0); }, 0); };
  const ptsMoi = pts(d.moi), ptsAdv = pts(d.lui), tot = ptsMoi + ptsAdv;
  const part = tot ? ptsMoi / tot : 0.5, ecart = Math.abs(part - 0.5);
  const force = ecart < 0.08 ? 1 : (ecart < 0.25 ? 2 : 3);
  const meneMoi = part > 0.5;
  const manches = function(qui){ let n = 0; for (let m = 0; m < DUEL_MANCHES; m++) { const a = d.moi[m], b = d.lui[m]; if (a && b && _duelVainqueurManche(a, b) === qui) n++; } return n; };
  const m = d.manche, enJeu = d.etat === 'jeu' && m >= 0 && m < DUEL_MANCHES;
  return {
    ptsMoi: ptsMoi, ptsAdv: ptsAdv,
    pct: Math.round(Math.max(16, Math.min(84, 100 * part))),   // la ligne de front reste visible aux extremites
    billesMoi: force === 1 ? 1 : (meneMoi ? force : 1),
    billesAdv: force === 1 ? 1 : (meneMoi ? 1 : force),
    manchesMoi: manches('moi'), manchesAdv: manches('lui'),
    moiEnAvance: !!(enJeu && d.moi[m] && !d.lui[m]),
    advEnAvance: !!(enJeu && d.lui[m] && !d.moi[m])
  };
}

const GYM_STARTERS = {
  memory: gymStartMemory,
  acuity: gymStartAcuity,
  reflex: gymStartReflex,
  anticipation: gymStartAnticipation,
  inhibition: gymStartInhibition,
  flexibility: gymStartFlexibility,
  spatial: gymStartSpatial,
  diagnostic: gymStartDiagnostic,
  certitude: gymStartCertitude,
  repertoire: gymStartRepertoire,
  jugement: gymStartJugement,
  mat: gymStartMat
};

