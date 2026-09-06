/* ═══════════════════════════════════════════
   BOARD LAYOUTS (Belgian Daisy, German Daisy)
   Source: github.com/MichielVerloop/AbaloneAI
═══════════════════════════════════════════ */
let currentLayout = 'standard';


/* LAYOUTS (positions de départ) — défini plus haut, près de initBoardState */

function setLayout(name, btn) {
  currentLayout = name;
  document.querySelectorAll('[id^="layout-"]').forEach(function(b){b.classList.remove('active');});
  btn.classList.add('active');
  resetGame();
  showToast('Configuration : ' + ({
    standard:'Standard',
    belgian:'Belgian Daisy 🌼',
    german:'German Daisy 🌸',
    dutch:'Dutch Daisy 🌷 (ABA-PRO)',
    swiss:'Swiss Daisy 🏔 (ABA-PRO)'
  }[name]||name));
}


/* initBoardState — voir LAYOUTS section ci-dessus */


/* ═══════════════════════════════════════════
   AI ENGINE — MINIMAX + ALPHA-BETA PRUNING
   Heuristics from github.com/altin/abalone-ai
   h1: center distance | h2: cohesion | h3: push threats
═══════════════════════════════════════════ */
let aiDifficulty = 'medium';
/* Table UNIQUE profondeur/budget-temps par niveau — utilisée à la fois par la
   décision réelle de l'IA (plus bas dans aiMove) et par l'indication affichée
   sur l'écran de configuration (setup-diff-info). Une seule source de verité :
   changer un chiffre ici le change partout, jamais deux tables qui pourraient
   diverger et afficher un niveau différent de ce qui est réellement joué. */
const AI_DIFFICULTY_CONFIG = {
  easy:     { depth:1, time:200,     label:'Coup quasi instantané, parmi les meilleurs captures/poussées disponibles, avec un peu de hasard.' },
  medium:   { depth:2, time:600,     label:'Regarde 2 coups à l\'avance, jusqu\'à 0,6 s de réflexion.' },
  advanced: { depth:3, time:1200,    label:'Regarde 3 coups à l\'avance, jusqu\'à 1,2 s de réflexion.' },
  hard:     { depth:4, time:2500,    label:'Regarde 4 coups à l\'avance, jusqu\'à 2,5 s de réflexion.' },
  master:   { depth:6, time:5000,    label:'Regarde 6 coups à l\'avance, jusqu\'à 5 s de réflexion.' },
  minimax:  { depth:8, time:3600000, label:'Regarde 8 coups à l\'avance, sans limite de temps pratique (plafond de sécurité 1h) — le plus lent, le plus fort.' },
};
let aiMoveCount = 0; // track for adaptive difficulty

// Center coordinates
const CENTER_R = 4, CENTER_C = 4;

// h1: Distance from center — lower = better
function h1_centerDistance(color) {
  const pieces = Object.entries(board).filter(function(e){return e[1]===color;}).map(function(e){return e[0].split(',').map(Number);});
  if (!pieces.length) return -999;
  let sum = 0;
  pieces.forEach(function(p) {
    const dr = Math.abs(p[0] - CENTER_R);
    const dc = Math.abs(p[1] - (ROWS[p[0]]-1)/2);
    sum += dr + dc;
  });
  return -sum / pieces.length; // negative so higher = better (closer to center)
}

// h2: Cohesion — marbles closer together = better
function h2_cohesion(color) {
  const pieces = Object.entries(board).filter(function(e){return e[1]===color;}).map(function(e){return e[0].split(',').map(Number);});
  if (pieces.length < 2) return 0;
  let populations = 0;
  const visited = new Set();
  pieces.forEach(function(p) {
    const key = p[0]+','+p[1];
    if (!visited.has(key)) {
      populations++;
      // BFS to find connected component
      const queue = [p];
      while (queue.length) {
        const cur = queue.pop();
        visited.add(cur[0]+','+cur[1]);
        neighbors(cur[0],cur[1]).forEach(function(n) {
          const nk = n.r+','+n.c;
          if (!visited.has(nk) && board[nk]===color) queue.push([n.r,n.c]);
        });
      }
    }
  });
  return -populations; // fewer groups = better
}

// h3: Push threats (Sumito opportunities)
function h3_pushThreats(color) {
  const enemy = color==='white'?'black':'white';
  let threats = 0;
  const moves = getAllMovesForColor(color);
  moves.forEach(function(m) {
    if (m.type==='push') threats += m.eject ? 10 : 2;
  });
  // Also penalise opponent threats against us
  const oppMoves = getAllMovesForColor(enemy);
  oppMoves.forEach(function(m) {
    if (m.type==='push') threats -= m.eject ? 10 : 2;
  });
  return threats;
}

// Combined evaluation function
// ─── ÉVALUATION ENRICHIE ───
const EVAL_CENTER = { q:0, r:0 };  // centre du plateau en axial
function axHexDist(a, b) {
  return (Math.abs(a.q-b.q) + Math.abs(a.q+a.r-b.q-b.r) + Math.abs(a.r-b.r)) / 2;
}
/* Fonction d'évaluation heuristique de l'IA — additionne des composantes
   pondérées (matériel, centre, cohésion, bord, capture, mobilité, isolement,
   danger d'éjection, alignements, forteresse) en un seul score, du point de
   vue de `color`. 8 des multiplicateurs ci-dessous (centre 6, cohésion 4,
   bord 8, mobilité 2, isolement 18, danger 14, alignements 10, forteresse 20)
   sont les "8 poids" ajustables par le Labo d'auto-amélioration (SPSA/SPRT,
   voir page Labo) — les modifier ici a un effet direct sur le jeu de l'IA.
   material et capScore restent fixes (poids 1000, largement dominants :
   le matériel et les captures priment toujours sur tout le reste). */
function evaluateBoard(color, detail) {
  const enemy = color === 'white' ? 'black' : 'white';
  let myCount=0, enCount=0, myCenter=0, enCenter=0, myCohesion=0, enCohesion=0, myEdge=0, enEdge=0;
  let myMob=0, enMob=0, myIso=0, enIso=0, myDng=0, enDng=0;   // V13 : mobilité, isolation, danger d'éjection
  let myChain=0, enChain=0, myFort=0, enFort=0;                // chaînes alignées + forteresses (4+ voisins)
  for (const k in board) {
    const v = board[k];
    if (!v) continue;
    const parts = k.split(',');
    const r = +parts[0], c = +parts[1];
    const ax = rcToAxial(r, c);
    const dist = axHexDist(ax, EVAL_CENTER);   // 0 = centre, 4 = bord
    const isEdge = dist >= 4;
    let allies = 0, emptyN = 0;
    for (const d of AX_DIRS) {
      const n = axialToRc(ax.q+d.q, ax.r+d.r);
      if (!n) continue;                          // hors plateau
      const nv = board[akey(n.r,n.c)];
      if (nv === v) allies++;
      else if (!nv) emptyN++;                    // case vide adjacente = mobilité / échappatoire
    }
    const iso = allies === 0;                    // bille totalement isolée
    const dng = isEdge && allies <= 1;           // au bord et peu soutenue = risque d'éjection
    const fort = allies >= 4;                    // formation dense (forteresse)
    let chainLinks = 0;                          // longueur des alignements sur les 3 axes hexagonaux
    for (const [fwd, bwd] of EVAL_AXES) {
      const bd = AX_DIRS[bwd], bn = axialToRc(ax.q+bd.q, ax.r+bd.r);
      if (bn && board[akey(bn.r,bn.c)] === v) continue;   // pas la queue de la chaîne sur cet axe
      const fd = AX_DIRS[fwd];
      let aq = ax.q, ar = ax.r, len = 1;
      while (true) {
        aq += fd.q; ar += fd.r;
        const nrc = axialToRc(aq, ar);
        if (!nrc) break;
        if (board[akey(nrc.r,nrc.c)] !== v) break;
        len++;
      }
      if (len >= 2) chainLinks += (len-1);
    }
    if (v === color) { myCount++; myCenter += (4-dist); myCohesion += allies; if (isEdge) myEdge++; myMob += emptyN; if (iso) myIso++; if (dng) myDng++; if (fort) myFort++; myChain += chainLinks; }
    else             { enCount++; enCenter += (4-dist); enCohesion += allies; if (isEdge) enEdge++; enMob += emptyN; if (iso) enIso++; if (dng) enDng++; if (fort) enFort++; enChain += chainLinks; }
  }
  const material   = (myCount - enCount) * 1000;
  const centerScr  = (myCenter - enCenter) * 6;
  const cohesion   = (myCohesion - enCohesion) * 4;
  const edgePenalty= (enEdge - myEdge) * 8;     // billes adverses au bord = bon pour moi
  const capScore   = (color === 'white'
                      ? (capturedByWhite - capturedByBlack)
                      : (capturedByBlack - capturedByWhite)) * 1000;
  const mobScore   = (myMob - enMob) * 2;       // V13 : plus de cases libres autour de mes billes
  const isoScore   = (enIso - myIso) * 18;      // V13 : billes adverses isolées = bon (divide & conquer)
  const dngScore   = (enDng - myDng) * 14;      // V13 : billes adverses en danger d'éjection = bon
  const chainScore = (myChain - enChain) * 10;  // alignements sur les 3 axes hexagonaux
  const fortScore  = (myFort - enFort) * 20;    // formations denses (4+ voisins alliés)
  const total = material + centerScr + cohesion + edgePenalty + capScore + mobScore + isoScore + dngScore + chainScore + fortScore;
  /* detail=true : renvoie la decomposition COMPLETE plutot que le seul total
     — utilise par l'explication "Pourquoi ce coup ?" (calculerExplicationCoup,
     plus bas) pour montrer EXACTEMENT les memes composantes que celles qui
     ont servi a la decision, jamais une re-derivation separee qui pourrait
     diverger. Les appels existants (un seul argument) ne sont pas affectes :
     ils recoivent toujours juste le total, comme avant. */
  if (detail) {
    return { total, material, centerScr, cohesion, edgePenalty, capScore, mobScore, isoScore, dngScore, chainScore, fortScore };
  }
  return total;
}

// Generate all legal moves for a color
/* ──────────────────────────────────────────────────────
   ENCODAGE DES COUPS — méthode ULA (Laurent Pagli, 2013)
   code:        1-9 (voir ci-dessous)
   caseDepart:  première bille de l'alignement (index 0-60)
   d1:          direction de l'alignement
   d2:          direction du mouvement
   ──────────────────────────────────────────────────────
   1: éject 3v2   (sumito éjectant avec 3 contre 2)
   2: éject 3v1   (sumito éjectant avec 3 contre 1)
   3: éject 2v1   (sumito éjectant avec 2 contre 1)
   4: sumito 3v2  (pousse sans éject)
   5: sumito 3v1  (pousse sans éject)
   6: sumito 2v1  (pousse sans éject)
   7: flèche 3    (broadside 3 billes)
   8: flèche 2    (broadside 2 billes)
   9: coup 1      (1 bille libre)
   ──────────────────────────────────────────────────────
   Astuce Pagli: code < 4 → éject → position non-calme
   → approfondir la recherche (quiescence search)
   ────────────────────────────────────────────────────── */
function getAllMovesForColor(color) {
  // Génère TOUS les coups légaux via le moteur axial officiel.
  // Un coup = { cells:[{r,c}...], dir:{q,r}, info } validé par validateMove.
  const pieces = Object.entries(board)
    .filter(e => e[1] === color)
    .map(e => { const [r,c] = e[0].split(',').map(Number); return {r,c}; });
  const moves = [];
  const seen = new Set();

  /* Construit les groupes de billes alignées (1, 2 ou 3) à partir des pièces.
     Dédupliqué DÈS LA CONSTRUCTION (pas seulement au niveau des coups finaux
     comme avant) : un groupe de 2-3 billes contiguës est découvert deux fois
     — une fois depuis chaque extrémité — et sans cette dédup en amont,
     validateMove() était appelé (x6 directions) sur chaque doublon avant
     d'être jeté par le `seen` des coups. Mesuré : ~35-40% des groupes générés
     étaient des doublons purs sur de vraies positions de milieu de partie.
     Sûr par construction : deux groupes ne partagent la même clé triée que
     s'ils contiennent exactement les mêmes billes, donc c'est le même groupe
     quel que soit le chemin de découverte — aucun risque de perdre un groupe
     légitime. Vérifié : 798/798 positions réelles (MIGS+AO, noir et blanc,
     y compris 103 positions avec captures déjà en cours) donnent exactement
     le même ensemble de coups, tous champs confondus, qu'avant ce changement.
     Gain mesuré : 41,8% sur cette fonction seule. */
  const groups = [];
  const groupKeys = new Set();
  function addGroup(cells) {
    const key = cells.map(c => c.r+','+c.c).sort().join('|');
    if (groupKeys.has(key)) return;
    groupKeys.add(key);
    groups.push(cells);
  }
  // 1 bille
  pieces.forEach(p => addGroup([p]));
  // 2 et 3 billes alignées et contiguës
  pieces.forEach(p => {
    const pAx = rcToAxial(p.r, p.c);
    AX_DIRS.forEach(d => {
      // groupe de 2
      const c2 = axialToRc(pAx.q + d.q, pAx.r + d.r);
      if (c2 && board[akey(c2.r,c2.c)] === color) {
        addGroup([p, c2]);
        // groupe de 3
        const c3 = axialToRc(pAx.q + 2*d.q, pAx.r + 2*d.r);
        if (c3 && board[akey(c3.r,c3.c)] === color) {
          addGroup([p, c2, c3]);
        }
      }
    });
  });

  // Pour chaque groupe, teste les 6 directions
  groups.forEach(cells => {
    AX_DIRS.forEach(dir => {
      const info = validateMove(cells, dir, color);
      if (!info.valid) return;
      // clé unique pour dédupliquer (cells triées + direction)
      const ck = cells.map(c => c.r+','+c.c).sort().join('|') + '>' + dir.q + ',' + dir.r;
      if (seen.has(ck)) return;
      seen.add(ck);
      // code de priorité ULA : éjections d'abord, puis poussées, puis déplacements
      let code = 9;
      if (info.type === 'push') code = info.ejection ? (cells.length===3 ? 1 : 3) : (cells.length===3 ? 4 : 6);
      else if (info.type === 'broadside') code = 8;
      moves.push({ cells: cells.slice(), dir, info, code, type: info.type, eject: !!(info.type==='push' && info.ejection) });
    });
  });
  return moves;
}

/* isEject (code < 4) = position non-calme → quiescence search (Pagli 2013 / Chorus 2009) */
function isQuiescentPosition(moves) {
  return !moves.some(function(m){ return m.code < 4; });
}

function isOffBoard(r, c) {
  return r<0||r>8||c<0||c>=ROWS[Math.max(0,Math.min(8,r))];
}

// Applique un coup (nouveau format) au plateau, retourne une fonction d'annulation
// Applique un coup (nouveau format) au plateau, retourne une fonction d'annulation.
// Principe : au lieu de recalculer tout le plateau pour annuler, on note juste
// la valeur AVANT modification de chaque case touchée (touched), pour pouvoir
// la restaurer exactement telle quelle dans undoMove — beaucoup plus rapide que
// cloner tout le board a chaque coup essaye pendant la recherche minimax.
function applyMove(move, color) {
  const touched = new Set();
  // Les cases de depart des billes qui bougent, ET leur case d'arrivee (destination
  // dans la direction du coup) doivent etre suivies pour pouvoir tout restaurer.
  move.cells.forEach(c => {
    touched.add(akey(c.r,c.c));
    const ax = rcToAxial(c.r,c.c);
    const d = axialToRc(ax.q+move.dir.q, ax.r+move.dir.r);
    if (d) touched.add(akey(d.r,d.c));
  });
  if (move.info.type === 'push') {
    // En cas de poussee (sumito), il faut aussi suivre TOUTE la chaine de billes
    // adverses poussees, jusqu'a la case au-dela (vide, bord, ou ejection) —
    // sinon on ne pourrait pas annuler correctement une poussee.
    let cur = { ...move.info.oppStart };
    for (let i=0; i<=move.info.push+1; i++) {
      const rc = axialToRc(cur.q, cur.r);
      if (rc) touched.add(akey(rc.r,rc.c));
      cur = { q:cur.q+move.dir.q, r:cur.r+move.dir.r };
    }
  }
  // Capture l'etat AVANT modification de chaque case suivie — c'est le
  // journal d'annulation que undoMove rejouera a l'envers.
  const undo = [];
  touched.forEach(k => undo.push({ k, v: board[k] }));
  undo.__captured = null;
  // met à jour le compteur de captures pendant la recherche
  if (move.info.type === 'push' && move.info.ejection) {
    if (color === 'white') { capturedByWhite++; undo.__captured = 'white'; }
    else                   { capturedByBlack++; undo.__captured = 'black'; }
  }
  // abApplyMove fait la modification reelle du board (deplacement/poussee/ejection) —
  // toute la logique de detection ci-dessus ne sert qu'a preparer l'annulation.
  abApplyMove(move.cells, move.dir, color, move.info);
  return undo;
}

// Annule exactement le coup applique par applyMove, en restaurant chaque case
// suivie a sa valeur d'avant (v===undefined signifie que la case etait vide).
function undoMove(undo) {
  if (undo.__captured === 'white') capturedByWhite--;
  else if (undo.__captured === 'black') capturedByBlack--;
  undo.forEach(function(entry) {
    if (entry.v === undefined) delete board[entry.k];
    else board[entry.k] = entry.v;
  });
}

/* Pourquoi ce coup ? Decompose l'effet REEL d'un coup sur les memes
   composantes que celles utilisees par evaluateBoard() pour choisir ce
   coup — jamais une estimation separee qui pourrait diverger de la vraie
   decision. Applique le coup avec applyMove/undoMove (les memes fonctions
   que le moteur de recherche utilise en interne, deja utilisees des
   milliers de fois par coup dans minimax), compare l'evaluation detaillee
   avant/apres, annule proprement. */
const LABELS_EXPLICATION = {
  material:    'Matériel',
  centerScr:   'Centre',
  cohesion:    'Cohésion',
  edgePenalty: 'Bord adverse',
  capScore:    'Capture',
  mobScore:    'Mobilité',
  isoScore:    'Isolement adverse',
  dngScore:    'Danger d\'éjection adverse',
  chainScore:  'Alignements',
  fortScore:   'Forteresse',
};
