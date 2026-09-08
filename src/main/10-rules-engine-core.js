/* ═══════════════════════════════════════════
   SUIVI DES MÉTRIQUES DE JEU (alimente le radar)
   On ne compte que les coups du joueur humain (noir).
═══════════════════════════════════════════ */
let lastMoveTime = Date.now();

// Cohésion : part des billes du joueur ayant au moins un voisin allié (0..1)
/* Compacite geometrique : distance hexagonale moyenne de chaque bille au
   centre de masse du camp. Mesure d'ABA-PRO. Plus petit = plus resserre.
   (Ces deux fonctions avaient ete perdues lors de l'ajout du radar 15 axes :
   les appels subsistaient dans recordMoveStats, provoquant un crash a chaque
   coup joue. Reintegrees ici, pres des mesures de meme nature.) */
function _compactness(color) {
  const cells = Object.keys(board).filter(function(k){ return board[k] === color; })
    .map(function(k){ const p = k.split(',').map(Number); return rcToAxial(p[0], p[1]); });
  if (cells.length < 2) return null;
  const cx = cells.reduce(function(s,p){ return s + p.q; }, 0) / cells.length;
  const cy = cells.reduce(function(s,p){ return s + p.r; }, 0) / cells.length;
  return cells.reduce(function(s,p){
    return s + (Math.abs(p.q - cx) + Math.abs(p.q + p.r - cx - cy) + Math.abs(p.r - cy)) / 2;
  }, 0) / cells.length;
}

/* Nombre de groupes connectes d'un camp. Impose a l'adversaire, il mesure la
   fragmentation — « diviser pour regner » (Schmittberger). */
function _groupCount(color) {
  const set = new Set(Object.keys(board).filter(function(k){ return board[k] === color; }));
  if (!set.size) return 0;
  const seen = new Set();
  let groups = 0;
  set.forEach(function(start){
    if (seen.has(start)) return;
    groups++;
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const rc = stack.pop().split(',').map(Number);
      neighbors(rc[0], rc[1]).forEach(function(nb){
        const k = nb.r + ',' + nb.c;
        if (set.has(k) && !seen.has(k)) { seen.add(k); stack.push(k); }
      });
    }
  });
  return groups;
}

function cohesionScore(color) {
  const cells = Object.keys(board).filter(k => board[k] === color);
  if (!cells.length) return 0;
  let connected = 0;
  cells.forEach(k => {
    const [r,c] = k.split(',').map(Number);
    const hasAlly = neighbors(r,c).some(n => board[`${n.r},${n.c}`] === color);
    if (hasAlly) connected++;
  });
  return connected / cells.length;
}

// Contrôle du centre : le joueur a-t-il plus de billes au centre que l'adversaire ?
function centerControl(color) {
  const opp = color === 'black' ? 'white' : 'black';
  // anneau central : cases proches du centre du plateau (rangée 4, colonnes centrales)
  const centerCells = ['3,3','3,4','4,3','4,4','4,5','5,3','5,4'];
  let mine = 0, theirs = 0;
  centerCells.forEach(k => {
    if (board[k] === color) mine++;
    else if (board[k] === opp) theirs++;
  });
  return mine > theirs ? 1 : 0;
}

// Enregistre un coup du joueur humain et met à jour les métriques
function recordPlayerMove(opts) {
  opts = opts || {};
  if (typeof progress === 'undefined') return;
  progress.totalMoves = (progress.totalMoves||0) + 1;
  // Rapidité : coup joué en moins de 5 secondes
  const dt = Date.now() - lastMoveTime;
  if (dt < 5000) progress.fastMoves = (progress.fastMoves||0) + 1;
  lastMoveTime = Date.now();
  // Poussées
  if (opts.pushAttempt) progress.pushAttempts = (progress.pushAttempts||0) + 1;
  if (opts.pushSuccess) progress.totalPushes = (progress.totalPushes||0) + 1;
  if (opts.ejection)    { progress.totalEjections = (progress.totalEjections||0) + 1; if (typeof checkDailyGameComplete === 'function') checkDailyGameComplete(); }
  // Contrôle du centre + cohésion (état après le coup)
  /* Le joueur ne tient pas forcement les noirs — voir monCamp() (point de
     verite unique, defini avec humanColor/aiColor()). opts.color reste
     prioritaire quand l'appelant le precise explicitement. */
  const _myCol = opts.color || monCamp();
  progress.centerTurns = (progress.centerTurns||0) + centerControl(_myCol);
  progress.cohesionSum = (progress.cohesionSum||0) + cohesionScore(_myCol);
  /* Compacite geometrique (ABA-PRO) et fragmentation adverse, echantillonnees
     periodiquement pour ne pas alourdir chaque coup. La reference MiGs est
     elle-meme echantillonnee de la meme facon (un point tous les ~10 coups). */
  if (((progress.totalMoves||0) % 8) === 0) {
    const _cp = _compactness(_myCol);
    if (_cp != null) { progress.compactSum = (progress.compactSum||0) + _cp; progress.compactSamples = (progress.compactSamples||0) + 1; }
    const _oppCol = _myCol === 'black' ? 'white' : 'black';
    progress.oppGroupSum = (progress.oppGroupSum||0) + _groupCount(_oppCol);
    progress.oppGroupSamples = (progress.oppGroupSamples||0) + 1;
  }
  // "Meilleur coup" : heuristique simple — un coup qui éjecte ou pousse est jugé bon
  if (opts.ejection || opts.pushSuccess) progress.bestMoves = (progress.bestMoves||0) + 1;
  /* Jeu de flanc : coups latéraux (broadside) du joueur. */
  if (opts.type === 'broadside') progress.broadsideMoves = (progress.broadsideMoves||0) + 1;
  /* Tempo : coup de la PREMIÈRE éjection réussie du joueur dans la partie.
     _firstEjThisGame est remis à zéro au début de chaque partie. */
  if (opts.ejection && !progress.__firstEjDone) {
    progress.__firstEjDone = true;
    progress.firstEjSum = (progress.firstEjSum||0) + ((progress.totalMoves||1));
    progress.firstEjGames = (progress.firstEjGames||0) + 1;
  }
  // Heatmap : enregistre les cases jouées par le joueur local ('me')
  // dans la structure par joueur (cumulé sur toutes ses parties).
  if (opts.cells && opts.cells.length) {
    recordHeatmapForPlayer(localPlayerId(), opts.cells);
    // Carte personnelle « mes noires » (profil perso : on ne range ici que MES coups)
    recordMyHeat(_myCol, opts.cells);
    // compat : maintient aussi l'ancienne clé pour ne rien casser
    if (!progress.heatmap) progress.heatmap = {};
    opts.cells.forEach(function(cell){
      const k = cell.r + ',' + cell.c;
      progress.heatmap[k] = (progress.heatmap[k] || 0) + 1;
    });
  }
  // Suivi de l'avance (pour le taux de conversion) : le joueur mène-t-il ?
  if (capturedByBlack > capturedByWhite) progress.__hadLead = true;
  saveProgress(progress);
}

// Enregistre la heatmap des coups blancs (adversaire local ou IA) sous 'opponent'
/* Coups de l'adversaire : jamais ranges dans la carte personnelle. */
function recordOpponentHeat(cells) {
  if (typeof progress === 'undefined' || !cells || !cells.length) return;
  recordHeatmapForPlayer('opponent', cells);
  if (!progress.heatmapWhite) progress.heatmapWhite = {};
  cells.forEach(function(cell){
    const k = cell.r + ',' + cell.c;
    progress.heatmapWhite[k] = (progress.heatmapWhite[k] || 0) + 1;
  });
  saveProgress(progress);
}

function recordWhiteHeatmap(cells) {
  if (typeof progress === 'undefined' || !cells || !cells.length) return;
  recordHeatmapForPlayer('opponent', cells);
  // Carte personnelle « mes blanches » : uniquement si le joueur tenait les blancs
  recordMyHeat('white', cells);
  // compat : maintient aussi l'ancienne clé
  if (!progress.heatmapWhite) progress.heatmapWhite = {};
  cells.forEach(function(cell){
    const k = cell.r + ',' + cell.c;
    progress.heatmapWhite[k] = (progress.heatmapWhite[k] || 0) + 1;
  });
  saveProgress(progress);
}

/* ═══════════════════════════════════════════
   MOTEUR ABALONE — coordonnées axiales + règles officielles
   Sélection alignée · déplacement de groupe · sumito (2v1,3v1,3v2)
═══════════════════════════════════════════ */
function rcToAxial(row, col) {
  return { q: row <= 4 ? col - row : col - 4, r: row - 4 };
}
function axialToRc(q, rAx) {
  const row = rAx + 4;
  if (row < 0 || row > 8) return null;
  const col = row <= 4 ? q + row : q + 4;
  if (col < 0 || col >= ROWS[row]) return null;
  return { r: row, c: col };
}
const AX_DIRS = [
  { q:1, r:0 }, { q:-1, r:0 },
  { q:0, r:-1 }, { q:1, r:-1 },
  { q:0, r:1 }, { q:-1, r:1 },
];
const EVAL_AXES = [[0,1],[2,4],[3,5]];   // les 3 axes hexagonaux, en paires de directions opposees
const akey = (r,c) => r + ',' + c;

/* ═══════════════════════════════════════════
   MOTIFS TACTIQUES — bibliothèque de structures locales nommées
   Contrairement aux empreintes (agrégats globaux sur tout le plateau), un
   motif est une forme LOCALE : une petite suite de cellules, définies en
   coordonnées relatives (axiales) à une origine, avec un rôle par cellule
   ('attaquant' ou 'defenseur'). La détection essaie les 6 orientations de
   AX_DIRS depuis chaque bille candidate — un motif purement linéaire (les
   seuls gérés pour l'instant : cel.q = nombre de pas le long de l'axe,
   cel.r toujours 0) est ainsi retrouvé quelle que soit sa rotation sur le
   plateau, sans distinction supplémentaire de réflexion (une ligne lue à
   l'envers est déjà couverte par la direction opposée, présente dans
   AX_DIRS). Le nom et la description de chaque motif sont fournis par
   Olivier — ce module se contente de les détecter et de les compter dans
   les vraies parties, jamais de juger ou d'inventer une valeur stratégique.
═══════════════════════════════════════════ */
const MOTIFS_TACTIQUES = {
  ligne3v2: {
    id: 'ATK.LAT.3V2',
    nom: 'Ligne 3 vs 2 alignée',
    categorie: 'Tactique',
    description: 'Trois billes attaquantes alignées, directement suivies (même axe) par deux billes défenseures alignées — configuration de sumito 3v2.',
    // Motifs dont la co-occurrence pourrait etre interessante a etudier une fois qu'ils existeront
    // (ex. surcharge, manque de soutien...) — vide tant qu'un seul motif est defini : une relation
    // suppose deux motifs reels a mettre en regard, pas une liste anticipee sans donnee derriere.
    motifsAssocies: [],
    /* Statistique reelle, precalculee hors-ligne sur les 4480 parties (rejeu complet jusqu'au
       vainqueur reel, determine par elimination effective pour MIGS et par le champ 'win' pour
       AO — hypothese x=noir validee empiriquement a 98,8% sur les fins par elimination claire).
       Restreinte aux occurrences JOUABLES et aux parties dont le vainqueur est confirme (224880
       occurrences sur ~1M au total ; les parties sans vainqueur recuperable — abandon, deco, temps,
       nul — sont exclues, pas approximees). Correlation sur la partie entiere, pas causalite : ne
       pas confondre avec "ce coup gagne la partie". */
    statVictoire: { attaquantGagne: 135525, attaquantPerd: 89355 },
    cellules: [
      { q:0, r:0, role:'attaquant' }, { q:1, r:0, role:'attaquant' }, { q:2, r:0, role:'attaquant' },
      { q:3, r:0, role:'defenseur' }, { q:4, r:0, role:'defenseur' }
    ]
  }
};
// Cherche un motif linéaire sur le plateau COURANT (global `board`), pour une couleur attaquante donnée.
// Retourne la liste des occurrences : { dir, cells:[{r,c},...] }.
function chercherMotif(motifDef, couleurAttaquant) {
  const couleurDefenseur = couleurAttaquant === 'black' ? 'white' : 'black';
  const occurrences = [];
  // On part de CHAQUE bille attaquante comme origine possible (case 0 du motif),
  // et on essaie les 6 directions de AX_DIRS — c'est ce qui donne l'invariance
  // par rotation, sans avoir a coder les 6 orientations a la main.
  for (const key in board) {
    if (board[key] !== couleurAttaquant) continue;
    const [r0, c0] = key.split(',').map(Number);
    const origine = rcToAxial(r0, c0);
    for (const dir of AX_DIRS) {
      let ok = true;
      const cells = [];
      // Le motif est purement lineaire : chaque cellule du gabarit est a
      // cel.q pas de l'origine, dans la direction dir choisie pour cet essai.
      for (const cel of motifDef.cellules) {
        const q = origine.q + cel.q*dir.q, r = origine.r + cel.q*dir.r;
        const rc = axialToRc(q, r);
        if (!rc) { ok = false; break; }  // sort du plateau -> cette orientation ne marche pas
        const couleurAttendue = cel.role === 'attaquant' ? couleurAttaquant : couleurDefenseur;
        if (board[rc.r+','+rc.c] !== couleurAttendue) { ok = false; break; }
        cells.push(rc);
      }
      if (ok) occurrences.push({ dir:dir, cells:cells });
    }
  }
  return occurrences;
}
// Pour un motif linéaire de type "ligne NvM" (N attaquants puis M défenseurs), indique si la
// poussée est immédiatement jouable : la cellule juste après les défenseurs doit être vide ou hors plateau.
function motifEstJouable(occurrence, motifDef, dir) {
  const dern = occurrence.cells[occurrence.cells.length - 1];  // derniere case du motif (dernier defenseur)
  const derniereAxiale = rcToAxial(dern.r, dern.c);
  const suivante = axialToRc(derniereAxiale.q + dir.q, derniereAxiale.r + dir.r);
  // Pas de case suivante (bord du plateau) OU case vide -> la poussee est possible.
  return !suivante || !board[suivante.r+','+suivante.c];
}

// Les billes sélectionnées forment-elles une ligne contiguë ? → {dir, ordered} | null
function selectionLine(sel) {
  if (sel.length === 1) return { dir: null, ordered: sel.slice() };
  if (sel.length > 3) return null;
  const ax = sel.map(s => rcToAxial(s.r, s.c));
  for (const d of AX_DIRS) {
    const sorted = ax.slice().sort((a,b) => (a.q*d.q + a.r*d.r) - (b.q*d.q + b.r*d.r));
    let contiguous = true;
    for (let i=1; i<sorted.length; i++) {
      if (sorted[i].q !== sorted[i-1].q + d.q || sorted[i].r !== sorted[i-1].r + d.r) { contiguous = false; break; }
    }
    if (contiguous) return { dir: d, ordered: sorted.map(a => axialToRc(a.q, a.r)) };
  }
  return null;
}

// Valide un coup : billes 'sel' déplacées dans la direction axiale 'dir'
function validateMove(sel, dir, me) {
  /* Garde de direction : AX_DIRS contient les 6 seules directions
     hexagonales legitimes. Sans ce controle, validateMove acceptait
     n'importe quel vecteur -- (99,99), (5,-3), voire (0,0) qui ne bouge
     pas. Non exploitable en jouant (l'interface ne propose que les 6),
     mais un coup VENU DE L'EXTERIEUR pouvait passer : notation Aba-Pro
     malformee, code de partie corrompu, ou coup renvoye par un moteur
     externe via le duel -- ou la revalidation systematique etait pourtant
     annoncee. Trouve en ecrivant l'audit des puzzles multi-coups. */
  if (!dir || !AX_DIRS.some(function(d){ return d.q === dir.q && d.r === dir.r; })) {
    return { valid:false, reason:'Direction invalide' };
  }
  const opp = me === 'black' ? 'white' : 'black';
  const line = selectionLine(sel);
  if (!line) return { valid:false, reason:'Billes non alignées' };
  const ax = sel.map(s => rcToAxial(s.r, s.c));
  const lineDir = line.dir;
  const isInline = sel.length === 1 || (lineDir && (
    (dir.q === lineDir.q && dir.r === lineDir.r) || (dir.q === -lineDir.q && dir.r === -lineDir.r)
  ));

  if (isInline) {
    const sorted = ax.slice().sort((a,b) => (a.q*dir.q + a.r*dir.r) - (b.q*dir.q + b.r*dir.r));
    const head = sorted[sorted.length-1];
    const front = { q: head.q + dir.q, r: head.r + dir.r };
    const frontRc = axialToRc(front.q, front.r);
    if (!frontRc) return { valid:false, reason:'Sortie de ses propres billes interdite' };
    const frontCell = board[akey(frontRc.r, frontRc.c)];
    if (!frontCell) return { valid:true, type:'move', dir, ordered:line.ordered };
    if (frontCell === me) return { valid:false, reason:'Bloqué par une bille alliée' };
    // Sumito : compte les adverses alignés
    let oppCount = 0, cur = { ...front };
    while (true) {
      const rc = axialToRc(cur.q, cur.r);
      if (!rc) break;
      if (board[akey(rc.r, rc.c)] === opp) { oppCount++; cur = { q:cur.q+dir.q, r:cur.r+dir.r }; }
      else break;
    }
    if (oppCount >= sel.length) return { valid:false, reason:`Poussée impossible (${sel.length} contre ${oppCount})` };
    const afterRc = axialToRc(cur.q, cur.r);
    if (afterRc) {
      if (board[akey(afterRc.r, afterRc.c)]) return { valid:false, reason:'Poussée bloquée' };
      return { valid:true, type:'push', push:oppCount, ejection:false, dir, oppStart:front };
    }
    return { valid:true, type:'push', push:oppCount, ejection:true, dir, oppStart:front };
  } else {
    // Broadside : chaque bille avance d'une case vide
    for (const a of ax) {
      const t = axialToRc(a.q + dir.q, a.r + dir.r);
      if (!t) return { valid:false, reason:'Mouvement hors plateau' };
      if (board[akey(t.r, t.c)]) return { valid:false, reason:'Mouvement bloqué' };
    }
    return { valid:true, type:'broadside', dir, ordered:line.ordered };
  }
}

// Exécute un coup validé sur le plateau
function abApplyMove(sel, dir, me, info) {
  const opp = me === 'black' ? 'white' : 'black';
  let ejected = false;
  if (info.type === 'push') {
    // Déplace les billes adverses de la fin vers l'avant
    const oppCells = [];
    let cur = { ...info.oppStart };
    for (let i=0; i<info.push; i++) { oppCells.push({ ...cur }); cur = { q:cur.q+dir.q, r:cur.r+dir.r }; }
    // efface les adverses
    oppCells.forEach(o => { const rc = axialToRc(o.q,o.r); if (rc) delete board[akey(rc.r,rc.c)]; });
    // repositionne (de l'arrière vers l'avant) ou éjecte la dernière
    for (let i=oppCells.length-1; i>=0; i--) {
      const dest = { q: oppCells[i].q + dir.q, r: oppCells[i].r + dir.r };
      const rc = axialToRc(dest.q, dest.r);
      if (rc) board[akey(rc.r,rc.c)] = opp;
      else ejected = true; // sortie du plateau
    }
  }
  // Déplace mes billes (de la tête vers l'arrière pour ne pas écraser)
  const ax = sel.map(s => rcToAxial(s.r, s.c));
  const sorted = ax.slice().sort((a,b) => (b.q*dir.q + b.r*dir.r) - (a.q*dir.q + a.r*dir.r));
  sorted.forEach(a => { const rc = axialToRc(a.q,a.r); if (rc) delete board[akey(rc.r,rc.c)]; });
  sorted.forEach(a => { const d = axialToRc(a.q+dir.q, a.r+dir.r); if (d) board[akey(d.r,d.c)] = me; });
  return { ejected };
}

/* ═══════════════════════════════════════════
   NAVIGATION CLAVIER + ARIA — accessibilite du plateau 2D
   Le plateau est un <canvas>, invisible pour un lecteur d'ecran (bitmap
   opaque, aucune sous-structure DOM). Solution standard : une grille de
   boutons transparents superposee, un par case reelle, positionnee via
   hexCoord() (memes coordonnees que le rendu canvas, donc toujours alignee,
   y compris apres rotation). Chaque bouton porte un aria-label decrivant
   son contenu. Navigation clavier : 4 fleches + PageUp/PageDown pour
   couvrir les 6 directions hexagonales (mapping derive des vraies
   directions axiales du moteur, AX_DIRS -- pas invente).
   Reutilise handleClick(r,c), la MEME fonction que le clic souris : aucune
   nouvelle logique de jeu, uniquement une nouvelle voie d'entree vers le
   code deja teste. */
const A11Y_DIR_KEYS = {
  ArrowLeft:  { q:-1, r:0 },
  ArrowRight: { q:1,  r:0 },
  ArrowUp:    { q:0,  r:-1 },
  ArrowDown:  { q:0,  r:1 },
  PageUp:     { q:1,  r:-1 },
  PageDown:   { q:-1, r:1 }
};

function _a11yCellLabel(r, c) {
  const cellId = coordToABAPRO(r, c);
  const v = board[akey(r, c)];
  const contenu = v === 'black' ? 'bille noire' : v === 'white' ? 'bille blanche' : 'case vide';
  const sel = (typeof selected !== 'undefined' && selected.some(function(s){ return s.r === r && s.c === c; }));
  return 'Case ' + cellId.toUpperCase() + ', ' + contenu + (sel ? ', sélectionnée' : '');
}

let _a11yCursor = { r: 4, c: 4 }; // centre du plateau par defaut

function _a11yMoveCursor(dir) {
  const ax = rcToAxial(_a11yCursor.r, _a11yCursor.c);
  const dest = axialToRc(ax.q + dir.q, ax.r + dir.r);
  if (!dest) return false; // hors plateau : le curseur ne bouge pas
  _a11yCursor = dest;
  return true;
}

function _a11yCellKey(r, c) { return r + ',' + c; }

/* Construit la grille de boutons transparents, une fois. Repositionnee (pas
   reconstruite) a chaque appel de _a11yRefreshOverlay -- moins couteux, et
   evite de perdre le focus courant a chaque coup joue. */
let _a11yOverlayBuilt = false;
function _a11yBuildOverlay() {
  const stage = document.getElementById('board-stage');
  if (!stage || _a11yOverlayBuilt) return;
  const layer = document.createElement('div');
  layer.id = 'board-a11y-layer';
  layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
  for (let r = 0; r < ROWS.length; r++) {
    for (let c = 0; c < ROWS[r]; c++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'board-a11y-cell';
      btn.dataset.r = r; btn.dataset.c = c;
      btn.tabIndex = -1;
      btn.style.cssText = 'position:absolute;width:8%;height:8%;transform:translate(-50%,-50%);'
        + 'background:transparent;border:none;padding:0;pointer-events:auto;cursor:pointer;';
      btn.addEventListener('click', function(){
        _a11yCursor = { r: +btn.dataset.r, c: +btn.dataset.c };
        if (typeof handleClick === 'function') handleClick(_a11yCursor.r, _a11yCursor.c);
        _a11yRefreshOverlay();
      });
      btn.addEventListener('keydown', _a11yHandleKeydown);
      layer.appendChild(btn);
    }
  }
  stage.appendChild(layer);
  _a11yOverlayBuilt = true;
  _a11yRefreshOverlay();
}

function _a11yHandleKeydown(e) {
  const dir = A11Y_DIR_KEYS[e.key];
  if (dir) {
    e.preventDefault();
    _a11yMoveCursor(dir);
    _a11yRefreshOverlay(true);
    return;
  }
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (typeof handleClick === 'function') handleClick(_a11yCursor.r, _a11yCursor.c);
    _a11yRefreshOverlay();
  }
}

/* Repositionne + relabelle chaque bouton (position en %, alignee sur
   hexCoord -- meme systeme de coordonnees que le rendu canvas, donc
   toujours juste y compris apres rotation du plateau). focusCursor : si
   vrai, redonne le focus clavier a la case courante (apres un deplacement
   au clavier) -- jamais apres un simple clic souris, pour ne pas voler
   le focus a l'utilisateur. */
function _a11yRefreshOverlay(focusCursor) {
  const layer = document.getElementById('board-a11y-layer');
  if (!layer || typeof board === 'undefined') return;
  const view = (typeof _currentBoardView === 'function') ? _currentBoardView() : '2d';
  layer.style.display = (view === '2d') ? 'block' : 'none';
  if (view !== '2d') return;
  layer.querySelectorAll('.board-a11y-cell').forEach(function(btn){
    const r = +btn.dataset.r, c = +btn.dataset.c;
    const pos = (typeof hexCoord === 'function') ? hexCoord(r, c) : { x: 320, y: 320 };
    btn.style.left = (pos.x / 640 * 100) + '%';
    btn.style.top = (pos.y / 640 * 100) + '%';
    btn.setAttribute('aria-label', _a11yCellLabel(r, c));
    const isCursor = (r === _a11yCursor.r && c === _a11yCursor.c);
    btn.tabIndex = isCursor ? 0 : -1;
    if (isCursor && focusCursor) btn.focus();
  });
}

/* Rafraichit apres chaque coup (position + etiquettes changent), apres une
   rotation manuelle, et au redimensionnement (repositionnement en %, deja
   correct normalement, mais garde en filet de securite). Ecoute les
   evenements publics deja emis par le moteur -- aucune modification de
   drawBoard() ni des fonctions de rotation elles-memes. */
document.addEventListener('abalassembly:movePlayed', function(){ _a11yRefreshOverlay(); });
document.addEventListener('abalassembly:positionChanged', function(){ _a11yRefreshOverlay(); });
window.addEventListener('resize', function(){ _a11yRefreshOverlay(); });

/* Execution d'un coup joue par un joueur (humain au clic, ou coup relaye
   depuis un moteur externe). Extrait tel quel de handleClick() : tout ce
   qui suivait « Applique le coup » ne dependait en rien de l'interface
   (aucun clic, aucune selection), seule la determination de la selection
   et de la direction en dependait. Aucun changement de comportement --
   handleClick appelle simplement cette fonction avec exactement les
   memes arguments qu'il calculait lui-meme auparavant.
   Permet a un coup valide venu d'ailleurs (moteur externe) de suivre
   EXACTEMENT le meme chemin qu'un coup humain : animations, sons,
   captures, coach, analyse de style, detection de victoire, pendules,
   sauvegarde -- rien n'est contourne ni reimplemente en parallele. */
function executePlayerMove(selCopy, chosenDir, me, info) {
  // Applique le coup
  pushUndoState();
  // Mode Coach : capture l'état stratégique AVANT le coup (du point de vue de l'humain)
  let coachBefore = null, coachCapBefore = (HumanColor.get() === 'black' ? capturedByBlack : capturedByWhite);
  if ((coachEnabled || advisorEnabled) && me === HumanColor.get()) coachBefore = evalFactors(HumanColor.get());
  // Analyse de style : état AVANT le coup (toujours active, réutilise coachBefore si dispo)
  let styleBefore = (me === HumanColor.get()) ? (coachBefore || evalFactors(HumanColor.get())) : null;
  // Prépare l'animation de glissement (déplacements et latéraux uniquement)
  let slidePieces = null;
  if (info.type === 'move' || info.type === 'broadside') {
    slidePieces = selCopy.map(function(s) {
      const from = hexCoord(s.r, s.c);
      const sAx = rcToAxial(s.r, s.c);
      const toRc = axialToRc(sAx.q + chosenDir.q, sAx.r + chosenDir.r);
      const to = toRc ? hexCoord(toRc.r, toRc.c) : from;
      return { fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, color: me, toR: toRc ? toRc.r : s.r, toC: toRc ? toRc.c : s.c };
    });
  }
  const result = abApplyMove(selCopy, chosenDir, me, info);

  // Comptabilise les éjections
  if (info.type === 'push' && info.ejection) {
    // position écran de la bille éjectée (dernière case avant la sortie)
    let ejX = null, ejY = null;
    if (info.oppStart) {
      // la bille sort dans la direction du coup, depuis le bord
      let cur = { ...info.oppStart };
      for (let s=0; s<info.push-1; s++) cur = { q:cur.q+chosenDir.q, r:cur.r+chosenDir.r };
      const rc = axialToRc(cur.q, cur.r);
      if (rc) { const p = hexCoord(rc.r, rc.c); ejX = p.x; ejY = p.y; }
    }
    soundEject();  // 🔊 son d'éjection
    if (me === 'black') { capturedByBlack++; if (ejX!==null) animateEjection(ejX, ejY, 'white', capturedByBlack-1); }
    else                { capturedByWhite++; if (ejX!==null) animateEjection(ejX, ejY, 'black', capturedByWhite-1); }
  } else if (info.type === 'push') {
    soundPush();   // 🔊 son de poussée (sans éjection)
  } else {
    soundMove();   // 🔊 son de déplacement
  }

  /* Attribution des metriques et de la heatmap selon la couleur que le
     joueur tient reellement — voir monCamp() (point de verite unique). */
  const _mine = monCamp();
  if (me === _mine) {
    recordPlayerMove({
      pushAttempt: info.type === 'push',
      pushSuccess: info.type === 'push',
      ejection: !!(info.type === 'push' && info.ejection),
      cells: selCopy,  // cases jouées (pour la heatmap)
      color: me,
      type: info.type   // 'move' | 'push' | 'broadside'
    });
  } else {
    recordOpponentHeat(selCopy);
  }

  selected = [];
  moveCount++;
  // Libellé du coup selon les systèmes de notation activés (Aba-Pro et/ou Nacre)
  const ejected = !!(info.type === 'push' && info.ejection);
  const moveNotation = moveLabel(selCopy, chosenDir, info.type, ejected);
  if (!variantMode) addMoveToHistory(moveNotation, me, { cells: selCopy.slice(), dir: chosenDir, type: info.type, ejection: ejected });
  updateCaptures();

  // Mode Coach : commente le coup du joueur
  if (coachEnabled && me === HumanColor.get() && coachBefore) {
    const coachAfter = evalFactors(HumanColor.get());
    const capDelta = (HumanColor.get() === 'black' ? capturedByBlack : capturedByWhite) - coachCapBefore;
    showCoachBubble(coachComment(coachBefore, coachAfter, capDelta));
  }

  // Bot conseiller : le bot opposé à l'adversaire commente ton coup (gentil ou moqueur)
  if (advisorEnabled && me === HumanColor.get() && coachBefore) {
    const advColor = advisorBotColor();
    if (advColor) {
      const aAfter = evalFactors(HumanColor.get());
      const capDelta = (HumanColor.get() === 'black' ? capturedByBlack : capturedByWhite) - coachCapBefore;
      const txt = botAdvisorComment(advColor, coachBefore, aAfter, capDelta);
      showBotBubble(advColor, txt);
    }
  }

  // Analyse de style : enregistre ce coup humain (toujours, même hors coach/conseiller)
  if (me === HumanColor.get() && styleBefore) {
    const styleAfter = evalFactors(HumanColor.get());
    const sCapDelta = (HumanColor.get() === 'black' ? capturedByBlack : capturedByWhite) - coachCapBefore;
    recordStyleMove(styleBefore, styleAfter, sCapDelta, info);
  }

  // Victoire ?
  if (capturedByBlack >= 6) { if (variantMode) { _variantConclude('black'); return; } triggerWin('black'); return; }
  if (capturedByWhite >= 6) { if (variantMode) { _variantConclude('white'); return; } triggerWin('white'); return; }

  _clockInc(me);   // ⏱️ incrément de cadence pour celui qui vient de jouer
  currentTurn = (me === 'black') ? 'white' : 'black';
  _emitAbaEvent('movePlayed', { color: me, label: (typeof moveNotation !== 'undefined') ? moveNotation : null,
    moveCount: moveCount, capturedByBlack: capturedByBlack, capturedByWhite: capturedByWhite });
  updateStatus();
  // Animation de glissement si déplacement simple/latéral, sinon rendu direct
  if (slidePieces && slidePieces.length) {
    animateMarbleSlide(slidePieces, afterHumanMove);
  } else {
    drawBoard();
    afterHumanMove();
  }
}


function handleClick(r, c) {
  const piece = board[akey(r,c)];
  const me = currentTurn;

  // Clic sur une de ses propres billes → sélection/désélection
  if (piece === me) {
    const idx = selected.findIndex(s => s.r===r && s.c===c);
    if (idx !== -1) {
      selected.splice(idx,1);
    } else {
      if (selected.length >= 3) { showToast('Maximum 3 billes'); return; }
      const candidate = selected.concat([{r,c}]);
      // n'autorise que les sélections alignées et contiguës
      if (selectionLine(candidate)) {
        selected.push({r,c});
      } else {
        // remplace la sélection si la nouvelle bille n'est pas alignée
        selected = [{r,c}];
      }
    }
    soundSelect();  // 🔊 petit son de sélection
    drawBoard();
    return;
  }

  // Aucune bille sélectionnée → rien à faire
  if (selected.length === 0) { return; }

  // Le clic sur une case (vide ou adverse) définit la DIRECTION du coup,
  // déterminée par le vecteur depuis la bille la plus proche de la sélection.
  const targetAx = rcToAxial(r, c);
  // trouve la direction : la cible doit être adjacente à une bille de la sélection
  let chosenDir = null;
  for (const s of selected) {
    const sAx = rcToAxial(s.r, s.c);
    for (const d of AX_DIRS) {
      if (sAx.q + d.q === targetAx.q && sAx.r + d.r === targetAx.r) { chosenDir = d; break; }
    }
    if (chosenDir) break;
  }
  if (!chosenDir) { selected = []; drawBoard(); return; }

  const info = validateMove(selected, chosenDir, me);
  if (!info.valid) {
    showToast('⛔ ' + info.reason);
    return;
  }

  executePlayerMove(selected.slice(), chosenDir, me, info);
}

/* Après un coup humain : déclenche l'IA seulement en mode IA */
function afterHumanMove() {
  gameBestHint = null;  // efface la suggestion après avoir joué
  if (_puzzleActive) { checkPuzzleMove(); return; }   // mode puzzle : vérifie, pas d'IA ni de sauvegarde
  if (!variantMode) saveGameState();      // sauvegarde automatique — jamais pendant l'exploration d'une variante
  if (GameMode.get() === 'ai' && currentTurn === aiColor() && !gameOver) {
    setTimeout(aiMove, 800 + Math.random()*600);
  }
}

/* ─── AI ENGINE (difficulty-aware) ─── */
