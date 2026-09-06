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
  jugement:     { x: 64, y: 20 }
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
   Etendue (demande d'Olivier) : n'importe quel multiple de 60° (60 a 300)
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
  jugement: gymStartJugement
};

