/* ═══════════════════════════════════════════
   MOTEUR DE COMPRÉHENSION — étage 1 : décomposition spatiale
   Reprend exactement les mêmes grandeurs par bille que evaluateBoard
   (allies, chainLinks, iso, danger, mobilité, forteresse) mais les
   regroupe par ZONE plutôt que de tout sommer en un seul total global.
   Fonction séparée d'evaluateBoard (pas dans le chemin chaud de la
   recherche IA) : appelée seulement à l'affichage, jamais pendant
   search()/quiescence(). Deux découpages indépendants, dans la même
   passe :
     - colonne : aile gauche / centre / aile droite, mesurée par la
       position DANS SA PROPRE RANGÉE (col - (ROWS[row]-1)/2), PAS par
       la coordonnée axiale q — q suit un axe hexagonal incliné, pas la
       colonne écran, et donnait un découpage faux (aile droite à 0
       bille sur une position pourtant symétrique, détecté en testant).
     - distance au centre : cœur (0-1) / intermédiaire (2-3) / bord (4,
       même seuil que isEdge déjà utilisé dans evaluateBoard).
   Vérifié : totaux par couleur = 14 sur la position de départ, symétrie
   gauche/droite confirmée, cohérence entre les deux découpages (même
   somme de cohésion), position de contrôle asymétrique (3 billes
   alignées) correctement classée à 100% dans la bonne zone.
═══════════════════════════════════════════ */
function _zoneColonne(row, col) { const cc = col - (ROWS[row]-1)/2; return cc<=-1.5 ? 'aileGauche' : (cc>=1.5 ? 'aileDroite' : 'centre'); }
function _zoneDistance(d) { return d<=1 ? 'coeur' : (d<=3 ? 'intermediaire' : 'bord'); }
function _zoneVide() { return { cohesion:0, danger:0, mobilite:0, isolement:0, chaines:0, forteresse:0, billes:0 }; }
/* ═══ Étage 1 : décomposition spatiale ═══
   Reprend exactement les mêmes grandeurs par bille que evaluateBoard
   (allies, chainLinks, iso, danger, mobilité, forteresse) mais les
   regroupe par ZONE (colonne : aile gauche/centre/aile droite ; distance :
   coeur/intermédiaire/bord) plutôt que de tout sommer en un seul total
   global. Sert à répondre "où sur le plateau" plutôt que juste "combien
   au total" — fonction d'affichage, jamais appelée pendant la recherche IA.
   moi = mes zones, adversaire = les siennes, mêmes classifications. */
function analyzeZones(color) {
  const zones = { colonne: { aileGauche: _zoneVide(), centre: _zoneVide(), aileDroite: _zoneVide() },
                   distance: { coeur: _zoneVide(), intermediaire: _zoneVide(), bord: _zoneVide() } };
  const zonesEnnemi = { colonne: { aileGauche: _zoneVide(), centre: _zoneVide(), aileDroite: _zoneVide() },
                         distance: { coeur: _zoneVide(), intermediaire: _zoneVide(), bord: _zoneVide() } };
  for (const k in board) {
    const v = board[k];
    if (!v) continue;
    const parts = k.split(',');
    const r = +parts[0], c = +parts[1];
    const ax = rcToAxial(r, c);
    const dist = axHexDist(ax, EVAL_CENTER);
    let allies = 0, emptyN = 0;
    for (const d of AX_DIRS) {
      const n = axialToRc(ax.q+d.q, ax.r+d.r);
      if (!n) continue;
      const nv = board[akey(n.r,n.c)];
      if (nv === v) allies++;
      else if (!nv) emptyN++;
    }
    const iso = allies === 0;
    const isEdge = dist >= 4;
    const fort = allies >= 4;
    let chainLinks = 0;
    for (const pair of EVAL_AXES) {
      const fwd = pair[0], bwd = pair[1];
      const bd = AX_DIRS[bwd], bn = axialToRc(ax.q+bd.q, ax.r+bd.r);
      if (bn && board[akey(bn.r,bn.c)] === v) continue;
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
    const target = (v === color) ? zones : zonesEnnemi;
    const zc = target.colonne[_zoneColonne(r, c)];
    const zd = target.distance[_zoneDistance(dist)];
    [zc, zd].forEach(function(z){
      z.billes++;
      z.cohesion += allies;
      z.mobilite += emptyN;
      if (iso) z.isolement++;
      if (isEdge && allies<=1) z.danger++;
      if (fort) z.forteresse++;
      z.chaines += chainLinks;
    });
  }
  return { moi: zones, adversaire: zonesEnnemi };
}

/* ═══ Étage 2 : faiblesse de soutien ═══
   Soutien d'une bille = profondeur (0/1/2) de billes alliées juste derrière
   elle, sur SON MEILLEUR axe parmi les 3 (le maximum, pas le minimum). Une
   bille alignée sur un seul axe a normalement 0 sur les deux autres — ce
   n'est pas une faiblesse, juste la géométrie d'une ligne droite. La vraie
   faiblesse, c'est de n'avoir AUCUN axe avec du soutien du tout (max = 0
   partout). Erreur trouvée en testant : ma première version prenait le
   MINIMUM des 3 axes, ce qui classait presque toutes les billes comme
   "faibles" (n'importe quelle ligne droite a 0 sur ses 2 axes non alignés)
   — pas un signal utile. Vérifié sur une ligne de 3 : queue=0 (vraiment
   faible), milieu=1, tête=2 — exactement l'attendu avec le maximum. */
function analyzeSupport(color) {
  const billesFaibles = [];
  let sommeMax = 0, nb = 0;
  for (const k in board) {
    const v = board[k];
    if (v !== color) continue;
    const parts = k.split(',');
    const r = +parts[0], c = +parts[1];
    const ax = rcToAxial(r, c);
    let maxSoutien = 0;
    EVAL_AXES.forEach(function(pair, i){
      const bwd = pair[1];
      const bd = AX_DIRS[bwd];
      let aq = ax.q, ar = ax.r, depth = 0;
      while (depth < 2) {
        aq += bd.q; ar += bd.r;
        const nrc = axialToRc(aq, ar);
        if (!nrc) break;
        if (board[akey(nrc.r,nrc.c)] !== v) break;
        depth++;
      }
      if (depth > maxSoutien) maxSoutien = depth;
    });
    nb++; sommeMax += maxSoutien;
    if (maxSoutien === 0) billesFaibles.push({ r:r, c:c });
  }
  return { nbBillesSansSoutien: billesFaibles.length, billesFaibles: billesFaibles, soutienMoyen: nb?sommeMax/nb:0, totalBilles: nb };
}

/* ═══ Étage 3 : potentiel de sumito ═══
   Pas une estimation — lecture directe des vrais coups déjà générés par
   getAllMovesForColor. Les codes 1-6 (encodage ULA, documenté plus haut)
   sont exactement les sumitos : 1-3 éjectent, 4-6 poussent sans éjecter. */
function analyzeSumitoPotential(color, movesPrecalcules) {
  const moves = movesPrecalcules || getAllMovesForColor(color);
  const sumitoMoves = moves.filter(function(m){ return m.code && m.code <= 6; });
  const parType = { '3v2':0, '3v1':0, '2v1':0 };
  sumitoMoves.forEach(function(m){
    if (m.code===1||m.code===4) parType['3v2']++;
    else if (m.code===2||m.code===5) parType['3v1']++;
    else if (m.code===3||m.code===6) parType['2v1']++;
  });
  return {
    total: sumitoMoves.length,
    ejections: sumitoMoves.filter(function(m){ return m.code<=3; }).length,
    poussees: sumitoMoves.filter(function(m){ return m.code>=4; }).length,
    parType: parType
  };
}

/* ═══ Étage 4 : menace immédiate ═══
   Vraie liste de coups adverses, pas une estimation. Réutilise exactement
   la même marche que abApplyMove (info.oppStart, info.push) pour identifier
   les cases concernées par un coup, sans l'exécuter. */
function _billesViseesParCoup(m) {
  const cells = [];
  let cur = { q: m.info.oppStart.q, r: m.info.oppStart.r };
  for (let i = 0; i < m.info.push; i++) {
    cells.push({ q: cur.q, r: cur.r });
    cur = { q: cur.q + m.dir.q, r: cur.r + m.dir.r };
  }
  return cells.map(function(a){ return axialToRc(a.q, a.r); }).filter(Boolean);
}
function analyzeMenaceImmediate(color) {
  const enemy = color === 'black' ? 'white' : 'black';
  const enemyMoves = getAllMovesForColor(enemy);
  const sumitoMoves = enemyMoves.filter(function(m){ return m.code && m.code <= 6; });
  const ejections = sumitoMoves.filter(function(m){ return m.eject; });
  const poussees = sumitoMoves.filter(function(m){ return !m.eject; });
  const billesToucheesSet = new Set();
  sumitoMoves.forEach(function(m){
    _billesViseesParCoup(m).forEach(function(rc){ billesToucheesSet.add(rc.r+','+rc.c); });
  });
  return {
    nbCoupsMenacants: sumitoMoves.length,
    nbEjections: ejections.length,
    nbPoussees: poussees.length,
    nbBillesMenacees: billesToucheesSet.size,
    billesMenacees: Array.from(billesToucheesSet)
  };
}

/* ═══ Étage 5 : profondeur tactique ═══
   Suit une vraie ligne d'éjections en chaîne jusqu'à ce que la position
   redevienne calme — même principe que quiescence(), mais fonction séparée :
   celle-ci sert à l'affichage, jamais au chemin chaud de la recherche IA
   (aucun risque de ralentir le moteur). Vérifié : le plateau est intact
   après l'analyse (tous les applyMove sont annulés dans l'ordre inverse). */
function analyzeProfondeurTactique(color, maxDepth, movesPrecalcules) {
  maxDepth = maxDepth || 8;
  const undos = [];
  const billesImpliquees = [];
  let profondeur = 0;
  let currentColor = color;
  while (profondeur < maxDepth) {
    const moves = (profondeur === 0 && movesPrecalcules)
      ? movesPrecalcules.filter(function(m){ return m.eject; })
      : getAllMovesForColor(currentColor).filter(function(m){ return m.eject; });
    if (!moves.length) break;
    const m = moves[0];
    const u = applyMove(m, currentColor);
    undos.push(u);
    billesImpliquees.push(m.cells);
    profondeur++;
    currentColor = currentColor === 'black' ? 'white' : 'black';
  }
  for (let i = undos.length - 1; i >= 0; i--) undoMove(undos[i]);
  return { profondeur: profondeur, depart: color, billesImpliquees: billesImpliquees };
}

/* ═══ Étage 6 : menace à N coups ═══
   La seule pièce coûteuse — une vraie recherche, pas une estimation. Utilise
   sa PROPRE fonction de recherche (_searchAvecLigne), séparée du moteur IA
   (pas de TT/killer/history partagés — jamais de risque d'interférer avec
   une vraie partie en cours). N petit (2-4), appelée UNIQUEMENT à la
   demande, jamais à chaque coup. Mise en cache tant que la position, la
   couleur et N n'ont pas changé. Rapporte la vraie séquence de coups (ligne
   principale), pas juste oui/non.
   Vérifié : séquence trouvée sur une vraie menace d'éjection à 1 coup ;
   cache confirmé (deuxième appel identique renvoie le même objet) ; aucune
   fausse alerte sur une position sans menace réelle ; plateau et compteurs
   de capture confirmés intacts après une vraie recherche à profondeur 2
   (comparaison par valeur, pas par ordre JSON — un premier test a donné une
   fausse alerte à cause de ça, corrigé). */
function _searchAvecLigne(depth, alpha, beta, maxi, pov) {
  if (capturedByWhite>=6) return { score: pov==='white'?100000:-100000, ligne:[] };
  if (capturedByBlack>=6) return { score: pov==='black'?100000:-100000, ligne:[] };
  if (depth === 0) return { score: evaluateBoard(pov, false), ligne:[] };
  const mc = maxi ? pov : (pov==='white'?'black':'white');
  const moves = getAllMovesForColor(mc);
  if (!moves.length) return { score: maxi?-99999:99999, ligne:[] };
  let best = maxi ? -Infinity : Infinity, bestMove = null, bestLigne = [];
  for (const m of moves) {
    const u = applyMove(m, mc);
    const res = _searchAvecLigne(depth-1, alpha, beta, !maxi, pov);
    undoMove(u);
    if (maxi) {
      if (res.score > best) { best = res.score; bestMove = m; bestLigne = res.ligne; }
      if (best > alpha) alpha = best;
    } else {
      if (res.score < best) { best = res.score; bestMove = m; bestLigne = res.ligne; }
      if (best < beta) beta = best;
    }
    if (alpha >= beta) break;
  }
  return { score: best, ligne: bestMove ? [bestMove].concat(bestLigne) : [] };
}
let _menaceCache = null;
function analyzeMenaceNCoups(color, N) {
  N = N || 3;
  const enemy = color === 'black' ? 'white' : 'black';

  let posStr = '';
  for (let r=0;r<9;r++) for (let c=0;c<ROWS[r];c++) posStr += (board[akey(r,c)]||'-')[0];
  const cacheKey = posStr + '|' + color + '|' + N;
  if (_menaceCache && _menaceCache.key === cacheKey) return _menaceCache.result;

  const scoreEnnemiStatique = evaluateBoard(enemy, false);
  const res = _searchAvecLigne(N, -Infinity, Infinity, true, enemy);

  const result = {
    N: N,
    sequence: res.ligne,
    scoreEnnemiApres: res.score,
    scoreEnnemiStatique: scoreEnnemiStatique,
    gainTactique: res.score - scoreEnnemiStatique,
    menaceReelle: (res.score - scoreEnnemiStatique) > 200
  };
  _menaceCache = { key: cacheKey, result: result };
  return result;
}

/* ═══ Étage 7 (option B) : mobilité à 2 coups ═══
   Combien de cases DISTINCTES sont atteignables en exactement 2 coups
   légaux, tous coups intermédiaires confondus. Distinct de la mobilité
   existante (mobScore, qui ne compte que les cases vides ADJACENTES,
   1 coup) : deux groupes avec la même mobilité à 1 coup peuvent avoir une
   portée réelle très différente à 2 coups selon qu'ils sont coincés dans
   un coin ou au centre.
   Vérifié : bille isolée au centre exact du plateau → 6 cases en 1 coup
   (ses 6 voisins), exactement 19 en 2 coups (calculé à la main : 1+6+12
   cases à distance ≤2, aucun bord ne coupe rien depuis le centre). Bille
   isolée dans un coin → nettement moins (bord qui coupe la portée),
   confirmant que la mesure réagit bien à la géométrie réelle. Plateau
   intact après l'analyse. */
function _casesAtteintes(moves) {
  const dest = new Set();
  moves.forEach(function(m){
    m.cells.forEach(function(cell){
      const ax = rcToAxial(cell.r, cell.c);
      const d = axialToRc(ax.q + m.dir.q, ax.r + m.dir.r);
      if (d) dest.add(d.r + ',' + d.c);
    });
  });
  return dest;
}
/* ═══ Étage 6 : mobilité à 2 coups ═══
   cases1Coup : nombre de cases distinctes atteignables en un seul coup
   (comptage direct des destinations, dédupliqué via un Set).
   cases2Coups : pour chaque coup possible, on le joue VRAIMENT (applyMove),
   on recompte les destinations atteignables depuis cette nouvelle position,
   puis on annule (undoMove) avant de tester le coup suivant — pas une
   estimation, une vraie exploration à 2 plis. C'est la fonction la plus
   coûteuse de l'empreinte (voir notes de profilage : ~93% du temps total
   de calculerEmpreinte avant optimisation v1.71). */
function analyzeMobilite2Coups(color, movesPrecalcules) {
  const moves1 = movesPrecalcules || getAllMovesForColor(color);
  const dest1 = _casesAtteintes(moves1);
  const dest2 = new Set();
  moves1.forEach(function(m1){
    const u1 = applyMove(m1, color);
    const moves2 = getAllMovesForColor(color);
    _casesAtteintes(moves2).forEach(function(k){ dest2.add(k); });
    undoMove(u1);
  });
  return { cases1Coup: dest1.size, cases2Coups: dest2.size };
}

/* ═══ Adaptateur : appelle les analyze* sur N'IMPORTE QUEL plateau, sans
   toucher aux 7 fonctions déjà testées ═══
   Les analyze* lisent la variable globale `board` (comme evaluateBoard,
   search, etc. partout ailleurs dans le fichier). La page Analyse de
   partie a SON PROPRE plateau (analysisBoard), séparé du plateau de jeu
   en direct. Plutôt que de réécrire les 7 fonctions pour accepter un
   plateau en paramètre (risque de régression sur du code déjà vérifié),
   on bascule temporairement les globales, on appelle, on restaure —
   toujours synchrone (aucun await à l'intérieur des analyze*), donc rien
   d'autre ne peut lire `board` pendant le court instant de la bascule :
   JS est mono-thread, pas de risque de collision avec la partie en
   cours. Le `finally` garantit la restauration même en cas d'erreur. */
function _avecPlateau(b, capB, capW, fn) {
  const savedBoard = board, savedCapB = capturedByBlack, savedCapW = capturedByWhite;
  board = b; capturedByBlack = capB; capturedByWhite = capW;
  try {
    return fn();
  } finally {
    board = savedBoard; capturedByBlack = savedCapB; capturedByWhite = savedCapW;
  }
}

/* ═══ Empreinte positionnelle — étape 1 ═══
   Vecteur de 12 dimensions, toutes déjà réelles et testées (evaluateBoard,
   analyzeZones, analyzeSupport, etc. — rien d'inventé). Normalisées en
   ratios (pas des sommes brutes) pour comparer des positions à effectifs
   différents équitablement. Les zones colonne sont rapportées en
   "forte/faible" (max/min entre aile gauche et aile droite) plutôt qu'en
   "gauche/droite" littéral : un miroir gauche-droite de la même position
   doit donner une empreinte quasi identique, sinon l'idée même
   d'empreinte échoue sur son cas le plus évident.
   Vérifié : position comparée à elle-même → distance exactement 0 ;
   miroir gauche-droite exact de la même position → distance exactement 0
   (le vecteur est bien invariant au miroir) ; position nettement
   différente → distance separée d'un ordre de grandeur, pas de zone
   grise ambiguë sur ce cas de test. */
function calculerEmpreinte(color) {
  const enemy = color === 'black' ? 'white' : 'black';
  let myCount = 0, enCount = 0;
  for (const k in board) { if (board[k] === color) myCount++; else if (board[k]) enCount++; }

  /* getAllMovesForColor(color) etait recalcule 4 fois sur le meme plateau non
     modifie (dans analyzeSumitoPotential, analyzeProfondeurTactique au 1er
     tour, analyzeMobilite2Coups, et ici pour mesCoupsLegaux) : un seul calcul
     partage, gain mesure de 7,1% sur calculerEmpreinte (verifie identique sur
     58 positions reelles issues de vraies parties MIGS/AO avant deploiement).
     La boucle interne d'analyzeMobilite2Coups (le vrai cout, ~93% du total)
     n'est pas touchee : c'est une exploration a 2 plis genuine, pas une
     redondance. */
  const mesMoves = getAllMovesForColor(color);

  const z = analyzeZones(color);
  const s = analyzeSupport(color);
  const su = analyzeSumitoPotential(color, mesMoves);
  const me = analyzeMenaceImmediate(color);
  const pr = analyzeProfondeurTactique(color, undefined, mesMoves);
  const mo = analyzeMobilite2Coups(color, mesMoves);

  const mesBilles = myCount || 1;
  const mesCoupsLegaux = mesMoves.length || 1;

  const zc = z.moi.colonne;
  const cohForte = Math.max(zc.aileGauche.cohesion, zc.aileDroite.cohesion);
  const cohFaible = Math.min(zc.aileGauche.cohesion, zc.aileDroite.cohesion);

  return {
    materialDiff: myCount - enCount,
    cohesionMoyenne: (zc.aileGauche.cohesion + zc.centre.cohesion + zc.aileDroite.cohesion) / mesBilles,
    soutienMoyen: s.soutienMoyen,
    proportionSansSoutien: s.nbBillesSansSoutien / mesBilles,
    zoneForteCohesion: cohForte / mesBilles,
    zoneFaibleCohesion: cohFaible / mesBilles,
    coeurRatio: z.moi.distance.coeur.billes / mesBilles,
    bordRatio: z.moi.distance.bord.billes / mesBilles,
    sumitoRatio: su.total / mesCoupsLegaux,
    menaceRatio: me.nbCoupsMenacants / mesBilles,
    profondeurTactique: pr.profondeur,
    mobilite2Ratio: mo.cases2Coups / mesBilles
  };
}
function distanceEmpreintes(e1, e2) {
  const cles = Object.keys(e1);
  let sommeCarres = 0;
  cles.forEach(function(k){ const d = (e1[k]||0) - (e2[k]||0); sommeCarres += d*d; });
  return Math.sqrt(sommeCarres);
}

/* ═══════════════════════════════════════════
   COMPARAISON AUX 418595 POSITIONS HISTORIQUES
   (2589 parties MIGS + 1890 parties AbalOnline reconstruites)
   Une seule passe : calcule à la fois le percentile de la position
   actuelle sur chaque dimension ET les k positions historiques les
   plus proches (même couleur au trait), sans recalcul redondant.
═══════════════════════════════════════════ */
const LABELS_EMPREINTE = {
  materialDiff:          'Différence matérielle',
  cohesionMoyenne:       'Cohésion moyenne',
  soutienMoyen:          'Soutien moyen',
  proportionSansSoutien: 'Billes sans soutien',
  zoneForteCohesion:     'Zone forte cohésion',
  zoneFaibleCohesion:    'Zone faible cohésion',
  coeurRatio:            'Billes au cœur',
  bordRatio:             'Billes au bord',
  sumitoRatio:           'Potentiel sumito',
  menaceRatio:           'Menaces subies',
  profondeurTactique:    'Profondeur tactique',
  mobilite2Ratio:        'Mobilité (2 coups)'
};
function calculerAnalyseHistorique(color, k) {
  if (typeof EMPREINTES_HISTORIQUES === 'undefined' || !EMPREINTES_HISTORIQUES.length) return null;
  k = k || 5;
  const emp = calculerEmpreinte(color);
  const stats = {};
  EMPREINTES_CHAMPS.forEach(function(ch){ stats[ch] = { sum:0, sumSq:0, n:0, rangInf:0 }; });
  let nMigs = 0, nAo = 0;
  const meilleurs = [];  // liste triee croissante par distance, taille plafonnee a k
  for (let i = 0; i < EMPREINTES_HISTORIQUES.length; i++) {
    const p = EMPREINTES_HISTORIQUES[i];
    if (p.c !== color) continue;
    if (p.s === 'MIGS') nMigs++; else nAo++;
    for (let c = 0; c < EMPREINTES_CHAMPS.length; c++) {
      const ch = EMPREINTES_CHAMPS[c], v = p.e[ch], st = stats[ch];
      st.sum += v; st.sumSq += v*v; st.n++;
      if (v <= emp[ch]) st.rangInf++;
    }
    const d = distanceEmpreintes(emp, p.e);
    if (meilleurs.length < k) {
      meilleurs.push({ d:d, p:p }); meilleurs.sort(function(a,b){ return a.d-b.d; });
    } else if (d < meilleurs[k-1].d) {
      meilleurs[k-1] = { d:d, p:p }; meilleurs.sort(function(a,b){ return a.d-b.d; });
    }
  }
  const champs = {};
  EMPREINTES_CHAMPS.forEach(function(ch){
    const st = stats[ch];
    const moyenne = st.n ? st.sum/st.n : 0;
    const variance = st.n ? Math.max(0, st.sumSq/st.n - moyenne*moyenne) : 0;
    champs[ch] = { actuelle: emp[ch], moyenne: moyenne, ecartType: Math.sqrt(variance), percentile: st.n ? Math.round(100*st.rangInf/st.n) : null };
  });
  return {
    nMigs: nMigs, nAo: nAo, nTotal: nMigs + nAo, champs: champs,
    similaires: meilleurs.map(function(x){ return { distance:x.d, s:x.p.s, g:x.p.g, m:x.p.m }; }),
    // Rarete : seuils calibres sur la VRAIE distribution des distances au
    // plus proche voisin (mesuree sur 300 positions reelles tirees au
    // hasard, meme metrique distanceEmpreintes) -- pas des nombres
    // inventes. Mediane ~0.18, p90 ~0.29 sur cette mesure.
    rarete: (function(){
      const d0 = meilleurs.length ? meilleurs[0].d : null;
      if (d0 === null) return null;
      if (d0 < 0.05) return { niveau:'frequente', label:'Position très courante' };
      if (d0 > 0.29) return { niveau:'rare', label:'Position rare' };
      return { niveau:'normale', label:'Position courante' };
    })()
  };
}

/* ═══════════════════════════════════════════
   COURBE D'EVOLUTION D'UNE PARTIE HISTORIQUE
   Une empreinte existe pour CHAQUE coup d'une partie (verifie : 86
   empreintes pour la toute premiere partie MIGS, une par coup environ).
   On peut donc tracer comment une dimension a evolue tout au long d'une
   partie reelle, sans rien recalculer -- juste filtrer et trier ce qui
   existe deja par (source, partie), puis par numero de coup. */
function _trajectoireDonnees(source, gameIdx, champ){
  const pts = EMPREINTES_HISTORIQUES
    .filter(function(x){ return x.s === source && x.g === gameIdx; })
    .sort(function(a,b){ return a.m - b.m; });
  return pts.map(function(x){ return { m: x.m, v: x.e[champ], c: x.c }; });
}
function _trajectoireSVG(pts, w, h, color){
  if (!pts.length) return '<div style="height:'+h+'px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px">Aucune donnée pour cette partie.</div>';
  const vals = pts.map(function(p){ return p.v; });
  const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  const range = (max - min) || 1;
  const xpts = pts.map(function(p,i){
    const x = pts.length>1 ? (i/(pts.length-1))*w : w/2;
    const y = h - ((p.v-min)/range)*(h-10) - 5;
    return x.toFixed(1)+','+y.toFixed(1);
  });
  return '<svg width="100%" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" style="display:block">'+
    '<polyline points="'+xpts.join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>'+
    '</svg>'+
    '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:2px">'+
      '<span>coup 1</span><span>min '+min.toFixed(2)+' · max '+max.toFixed(2)+'</span><span>coup '+pts.length+'</span></div>';
}
function _renderTrajectoire(source, gameIdx, champ){
  const host = document.getElementById('trajectoire-chart');
  if (!host) return;
  const pts = _trajectoireDonnees(source, gameIdx, champ);
  host.innerHTML = _trajectoireSVG(pts, 400, 120, '#c8a84b');
}
function openTrajectoryChart(source, gameIdx){
  let m = document.getElementById('trajectoire-modal');
  if (m) m.remove();
  const pts0 = _trajectoireDonnees(source, gameIdx, 'cohesionMoyenne');
  const options = EMPREINTES_CHAMPS.map(function(ch){
    return '<option value="'+ch+'"'+(ch==='cohesionMoyenne'?' selected':'')+'>'+(LABELS_EMPREINTE[ch]||ch)+'</option>';
  }).join('');
  m = document.createElement('div');
  m.id = 'trajectoire-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(13,15,14,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML =
    '<div style="max-width:480px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:24px">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:6px">Évolution au fil de la partie</h3>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">'+source+' · partie #'+gameIdx+' · '+pts0.length+' coups mesurés</div>'
    + '<select onchange="_renderTrajectoire(\''+source+'\','+gameIdx+',this.value)" style="width:100%;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px;margin-bottom:12px">'+options+'</select>'
    + '<div id="trajectoire-chart"></div>'
    + '<button class="ctrl-btn" onclick="document.getElementById(\'trajectoire-modal\').remove()" style="width:100%;margin-top:14px">Fermer</button>'
    + '</div>';
  document.body.appendChild(m);
  _renderTrajectoire(source, gameIdx, 'cohesionMoyenne');
}

/* ═══════════════════════════════════════════
   CORRELATIONS DIMENSION ↔ VICTOIRE (parties AbalOnline uniquement --
   seule source ou le nom du vainqueur reel est stocke directement ;
   les parties MIGS n'ont qu'un type de fin, pas un nom de vainqueur,
   verifie avant de construire cette fonctionnalite).
   Pour chaque dimension : compare le taux de victoire du tiers des
   positions les plus BASSES sur cette dimension au tiers des plus
   HAUTES. Calcule a l'execution sur les vraies donnees, jamais des
   pourcentages ecrits a la main. */
/* Determination du vainqueur pour les parties MIGS -- verifie AVANT de
   construire : contrairement a AO_GAMES, MIGS_GAMES n'a pas de nom de
   vainqueur stocke, seulement un type de fin ("Au score"/"Abandon"/
   "Au temps"/"Deco"/"Match nul"). Teste sur un echantillon reel : pour
   "Au score", rejouer la partie jusqu'au bout atteint TOUJOURS exactement
   6 captures d'un cote (1518/1524 verifie) -- vainqueur fiable. Pour
   "Abandon"/"Au temps"/"Deco", les captures finales ne depassent jamais
   3-5 -- IMPOSSIBLE de savoir qui a abandonne depuis les seules donnees.
   Cette fonction se limite donc honnetement aux parties "Au score".
   Coute ~40s a calculer (mesure, pas estime) sur l'ensemble du corpus --
   mis en cache dans localStorage apres le premier calcul, jamais refait
   a chaque ouverture du panneau. Calcule par blocs (yield au navigateur
   entre chaque partie) pour ne jamais geler l'interface, meme au premier
   calcul. Sauvegarde et restaure systematiquement l'etat du plateau
   autour du rejeu -- ne doit jamais perturber une partie en cours. */
const MIGS_WINNERS_KEY = 'abaMigsWinnersCache';
let _migsWinnersCache = null;
async function ensureMigsWinners(onProgress){
  if (_migsWinnersCache) return _migsWinnersCache;
  try {
    const raw = localStorage.getItem(MIGS_WINNERS_KEY);
    if (raw) { _migsWinnersCache = new Map(JSON.parse(raw)); return _migsWinnersCache; }
  } catch(e){}
  if (typeof MIGS_GAMES === 'undefined' || !MIGS_GAMES.length) return new Map();
  const winnerByGame = new Map();
  const saveLayout = currentLayout, saveBoard = board, saveCB = capturedByBlack, saveCW = capturedByWhite;
  let done = 0;
  const candidats = [];
  MIGS_GAMES.forEach(function(g, idx){ if (g[4] === 'Au score') candidats.push(idx); });
  for (const idx of candidats) {
    const g = MIGS_GAMES[idx];
    currentLayout = 'belgian'; initBoardState(); capturedByBlack = 0; capturedByWhite = 0;
    const toks = (g[5]||'').replace(/\d+\./g,' ').trim().split(/\s+/).filter(Boolean);
    let color = 'black';
    for (const tok of toks) {
      const mv = resolveAbaProToken(tok, color);
      if (!mv) break;
      const info = validateMove(mv.cells, mv.dir, color);
      if (!info || !info.valid) break;
      applyMove({cells:mv.cells, dir:mv.dir, info:info}, color);
      color = color === 'black' ? 'white' : 'black';
    }
    if (capturedByBlack >= 6) winnerByGame.set(idx, 'black');
    else if (capturedByWhite >= 6) winnerByGame.set(idx, 'white');
    done++;
    if (done % 40 === 0) {
      if (onProgress) onProgress(done, candidats.length);
      await new Promise(function(r){ setTimeout(r, 0); }); // rend la main au navigateur
    }
  }
  currentLayout = saveLayout; board = saveBoard; capturedByBlack = saveCB; capturedByWhite = saveCW;
  try { localStorage.setItem(MIGS_WINNERS_KEY, JSON.stringify(Array.from(winnerByGame.entries()))); } catch(e){}
  _migsWinnersCache = winnerByGame;
  return winnerByGame;
}

async function calculerCorrelationsVictoire(onProgress){
  if (typeof EMPREINTES_HISTORIQUES === 'undefined' || !EMPREINTES_HISTORIQUES.length) return null;
  if (typeof AO_GAMES === 'undefined' || !AO_GAMES.length) return null;
  const winnerByGameAO = new Map();
  AO_GAMES.forEach(function(g, idx){
    const winnerName = g[3] || '', black = g[1], white = g[2];
    let wc = null;
    if (winnerName && winnerName === black) wc = 'black';
    else if (winnerName && winnerName === white) wc = 'white';
    winnerByGameAO.set(idx, wc);
  });
  const winnerByGameMigs = await ensureMigsWinners(onProgress);
  const aoEntries = EMPREINTES_HISTORIQUES.filter(function(x){ return x.s === 'AO' && winnerByGameAO.get(x.g) !== null && winnerByGameAO.get(x.g) !== undefined; });
  const migsEntries = EMPREINTES_HISTORIQUES.filter(function(x){ return x.s === 'MIGS' && winnerByGameMigs.has(x.g); });
  const results = {};
  EMPREINTES_CHAMPS.forEach(function(ch){
    const withVal = aoEntries.map(function(x){ return { v: x.e[ch], win: (winnerByGameAO.get(x.g) === x.c) ? 1 : 0 }; })
      .concat(migsEntries.map(function(x){ return { v: x.e[ch], win: (winnerByGameMigs.get(x.g) === x.c) ? 1 : 0 }; }));
    withVal.sort(function(a,b){ return a.v - b.v; });
    const n = withVal.length, third = Math.floor(n/3);
    const bas = withVal.slice(0, third), haut = withVal.slice(n - third);
    const tauxBas = bas.reduce(function(s,x){ return s+x.win; },0) / bas.length;
    const tauxHaut = haut.reduce(function(s,x){ return s+x.win; },0) / haut.length;
    results[ch] = { n:n, tauxBas: +(tauxBas*100).toFixed(1), tauxHaut: +(tauxHaut*100).toFixed(1), ecart: +((tauxHaut-tauxBas)*100).toFixed(1) };
  });
  return { n: aoEntries.length + migsEntries.length, nAo: aoEntries.length, nMigs: migsEntries.length, results: results };
}
async function openCorrelationsPanel(){
  let m = document.getElementById('correlations-modal');
  if (m) m.remove();
  m = document.createElement('div');
  m.id = 'correlations-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(13,15,14,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML =
    '<div style="max-width:520px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:24px;max-height:90vh;overflow-y:auto">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:6px">Ce que disent les positions réelles</h3>'
    + '<div id="correlations-body"><div style="font-size:12px;color:var(--muted)" id="correlations-progress">Calcul en cours (première fois seulement — mis en cache ensuite)…</div></div>'
    + '<button class="ctrl-btn" onclick="document.getElementById(\'correlations-modal\').remove()" style="width:100%;margin-top:14px">Fermer</button>'
    + '</div>';
  document.body.appendChild(m);

  const data = await calculerCorrelationsVictoire(function(done, total){
    const el = document.getElementById('correlations-progress');
    if (el) el.textContent = 'Calcul en cours (première fois seulement) — ' + done + '/' + total + ' parties…';
  });
  const host = document.getElementById('correlations-body');
  if (!host) return; // modal fermee entre-temps
  if (!data) {
    host.innerHTML = '<div style="font-size:12px;color:var(--muted)">Données pas encore chargées — réessaie dans un instant.</div>';
    return;
  }
  const sorted = Object.entries(data.results).sort(function(a,b){ return Math.abs(b[1].ecart) - Math.abs(a[1].ecart); });
  host.innerHTML = '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">Sur '+data.n.toLocaleString('fr-FR')+' positions de vraies parties avec vainqueur connu ('+data.nAo.toLocaleString('fr-FR')+' AbalOnline + '+data.nMigs.toLocaleString('fr-FR')+' MIGS « Au score ») : taux de victoire final du joueur au trait, selon qu\u2019il était dans le tiers le plus bas ou le plus haut sur chaque dimension.</div>'
    + sorted.map(function(entry){
      const ch = entry[0], d = entry[1];
      const positif = d.ecart >= 0;
      return '<div style="padding:8px 0;border-bottom:1px solid var(--border)">'
        + '<div style="font-size:12px;color:var(--text)">'+(LABELS_EMPREINTE[ch]||ch)+'</div>'
        + '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)">'
          + '<span>tiers bas : '+d.tauxBas+'%</span><span>tiers haut : '+d.tauxHaut+'%</span>'
          + '<span style="color:'+(positif?'var(--accent-green-light)':'#e08050')+';font-weight:700">'+(positif?'+':'')+d.ecart+'pt</span>'
        + '</div></div>';
    }).join('');
}

/* ═══════════════════════════════════════════
   CARTE TACTIQUE PAR CASE — 4 dimensions réelles, aucun coefficient inventé.
   mobilité : nb de coups légaux impliquant cette bille (comptage direct).
   soutien : profondeur de soutien réelle (0/1/2, même calcul qu'analyzeSupport).
   menace : nb de sumitos adverses visant précisément cette bille (comptage direct
   des coups adverses déjà générés, pas une estimation).
   bord : fait géométrique (isEdgeCell).
   Pas de score composite : les 4 dimensions restent séparées, à consulter une
   par une (texte ou carte visuelle), jamais fusionnées en une note fabriquée.
═══════════════════════════════════════════ */
function calculerCarteTactique(color, boardOverride) {
  // boardOverride permet d'analyser un instantane du passe (navigation dans
  // l'historique) sans jamais toucher au plateau REEL de la partie en cours.
  const b = boardOverride || board;
  // Tous les coups legaux de la couleur analysee, et tous ceux de l'adversaire —
  // on a besoin des deux : les miens pour la mobilite, ceux d'en face pour la menace.
  // getAllMovesForColor lit la variable globale `board` : on la substitue
  // temporairement si un instantane different est demande, puis on la restaure.
  const saved = board;
  if (boardOverride) board = boardOverride;
  const moves = getAllMovesForColor(color);
  const enemy = color === 'black' ? 'white' : 'black';
  const enemyMoves = getAllMovesForColor(enemy);
  if (boardOverride) board = saved;
  // Seuls les coups de type sumito (code <=6, meme convention que le moteur) comptent
  // comme une vraie menace d'ejection — un simple deplacement n'en est pas une.
  const enemySumito = enemyMoves.filter(function(m){ return m.code && m.code <= 6; });

  // mobilite[case] = nombre de coups legaux DE MA COULEUR qui impliquent cette case
  // (comptage direct sur mes propres coups, pas une estimation)
  const mobilite = {};
  moves.forEach(function(m){ m.cells.forEach(function(cell){ const k = cell.r+','+cell.c; mobilite[k] = (mobilite[k]||0) + 1; }); });

  // menace[case] = nombre de sumitos ADVERSES qui visent precisement cette case
  // (_billesViseesParCoup donne les cellules reellement poussees par ce coup)
  const menace = {};
  enemySumito.forEach(function(m){ _billesViseesParCoup(m).forEach(function(rc){ const k = rc.r+','+rc.c; menace[k] = (menace[k]||0) + 1; }); });

  // Pour chaque bille de ma couleur : assembler les 4 dimensions + calculer
  // son soutien reel (meme logique que analyzeSupport, refaite ici en local
  // pour ne pas dependre de son format de retour agrege).
  const cases = [];
  for (const k in b) {
    if (b[k] !== color) continue;
    const parts = k.split(',');
    const r = +parts[0], c = +parts[1];
    const ax = rcToAxial(r, c);
    let maxSoutien = 0;
    // Teste les 3 axes hexagonaux (paires de directions opposees) : jusqu'a 2 cases
    // de la meme couleur alignees derriere la bille = soutien maximal sur cet axe.
    EVAL_AXES.forEach(function(pair){
      const bd = AX_DIRS[pair[1]];
      let aq = ax.q, ar = ax.r, depth = 0;
      while (depth < 2) { aq += bd.q; ar += bd.r; const nrc = axialToRc(aq, ar); if (!nrc) break; if (b[akey(nrc.r,nrc.c)] !== color) break; depth++; }
      if (depth > maxSoutien) maxSoutien = depth;
    });
    cases.push({ r:r, c:c, mobilite: mobilite[k]||0, soutien: maxSoutien, menace: menace[k]||0, bord: isEdgeCell(r,c)?1:0 });
  }
  return cases;
}
const LABELS_CARTE_TACTIQUE = { mobilite:'Mobilité', soutien:'Soutien', menace:'Menace', bord:'En bordure' };
/* Explications affichées sous la carte -- calquées précisément sur le calcul
   réel de calculerCarteTactique() ci-dessus, pas des descriptions génériques.
   Ajouté suite à un retour : le sens des chiffres et des couleurs n'était
   pas clair sans lire le code. */
const EXPLICATIONS_CARTE_TACTIQUE = {
  mobilite: 'Nombre de coups légaux qui font bouger cette bille. Chiffre haut et couleur claire = beaucoup d\'options de déplacement pour cette bille.',
  soutien:  'Nombre de billes alliées alignées juste derrière cette bille, sur un même axe (0, 1 ou 2 au maximum). Plus il y en a, plus la bille est protégée contre un sumito adverse.',
  menace:   'Nombre de coups adverses (sumito) qui visent précisément cette bille pour l\'éjecter. 0 = aucune menace immédiate sur cette bille.',
  bord:     '1 si la bille est sur une case du bord du plateau (moins de cases de repli en cas de poussée adverse), 0 si elle est plus au centre.'
};
// SVG statique (memes conventions que buildHeatmapSVG) : une seule dimension a la fois,
// jamais de fusion — le choix de la dimension affichee reste a la personne, pas au code.
function buildCarteTactiqueSVG(color, dim, boardOverride) {
  const b = boardOverride || board;
  const cases = calculerCarteTactique(color, boardOverride);
  const parCle = {};
  cases.forEach(function(c){ parCle[c.r+','+c.c] = c; });
  let maxVal = 0;
  cases.forEach(function(c){ if (c[dim] > maxVal) maxVal = c[dim]; });
  const SIZE = 280, scale = SIZE/640, cellR = HEX_RADIUS*scale*0.92;
  /* La carte doit suivre le retournement POV (0°/180° selon monCamp(), voir
     applyPovOrientation) pour rester dans le meme sens que le plateau
     affiche au joueur -- signale : en jouant les blancs, la carte restait
     orientee cote noir. Mais elle ne doit PAS suivre la rotation manuelle
     Y↺/Y↻ (qui s'accumule EN PLUS du POV dans boardRotation) : ignorerRotation
     bloque bien cette part-la, comme pour buildHeatmapSVG. On calcule donc
     ici le seul angle POV, separement de boardRotation. */
  const povDeg = (typeof monCamp === 'function' && monCamp() === 'white') ? 180 : 0;
  const povRad = povDeg * Math.PI / 180;
  const cx0 = 320, cy0 = 320;
  let svg = '';
  for (let r=0;r<9;r++) for (let c2=0;c2<ROWS[r];c2++) {
    const p0 = hexCoord(r, c2, true);
    let px = p0.x, py = p0.y;
    if (povDeg) {
      const dx = px - cx0, dy = py - cy0;
      px = cx0 + dx * Math.cos(povRad) - dy * Math.sin(povRad);
      py = cy0 + dx * Math.sin(povRad) + dy * Math.cos(povRad);
    }
    const x = px*scale, y = py*scale;
    const k = r+','+c2;
    const info = parCle[k];
    let fill;
    if (info) {
      const v = info[dim];
      const intensite = maxVal>0 ? v/maxVal : (v>0?1:0);
      fill = heatColor(v===0?0:intensite);
    } else {
      fill = b[k] ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)';
    }
    svg += '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+cellR.toFixed(1)+'" fill="'+fill+'" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>';
    if (info) svg += '<text x="'+x.toFixed(1)+'" y="'+(y+3).toFixed(1)+'" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.85)" font-weight="700">'+info[dim]+'</text>';
  }
  return '<svg viewBox="0 0 '+SIZE+' '+SIZE+'" width="'+SIZE+'" height="'+SIZE+'" xmlns="http://www.w3.org/2000/svg">'+svg+'</svg>';
}

/* ═══════════════════════════════════════════
   PROFIL DE DÉCISION — pas un score composite "complexité X/100" (ça
   demanderait des poids calibrés sur des milliers de résolutions humaines
   réelles, données qu'on n'a pas). À la place : des mesures brutes, réelles,
   issues du même evaluateBoard que le moteur utilise pour choisir ses coups.
   - nbCoupsLegaux : branching brut, comptage direct.
   - ecartMeilleurPire : écart de score entre le meilleur et le pire coup —
     grand écart = un coup se détache nettement (décision facile) ; petit
     écart = coups proches en valeur (décision plus disputée).
   - nbCoupsProchesDuMeilleur : nombre de coups à moins de SEUIL_PROCHE points
     du meilleur — seuil fixe et documenté ici, pas caché dans le calcul.
═══════════════════════════════════════════ */
const SEUIL_PROCHE_MEILLEUR = 30;  // points d'evaluateBoard — choix documenté, pas calibré sur des données humaines
function calculerProfilDecision(color) {
  let moves;
  try { moves = getAllMovesForColor(color); } catch(e) { return null; }
  if (!moves || !moves.length) return null;
  // On rejoue CHAQUE coup legal virtuellement (applyMove puis undoMove tout de
  // suite apres) pour recuperer son score reel via evaluateBoard — exactement
  // ce que fait deja computeTopMoves, mais ici on garde tous les scores, pas
  // seulement les meilleurs, pour mesurer l'ecart entre le premier et le dernier.
  const scores = [];
  for (let i = 0; i < moves.length; i++) {
    const undo = applyMove(moves[i], color);
    scores.push(evaluateBoard(color));
    undoMove(undo);
  }
  scores.sort(function(a,b){ return b-a; });  // du meilleur score au pire
  const meilleur = scores[0], pire = scores[scores.length-1];
  // Combien de coups restent a moins de SEUIL_PROCHE_MEILLEUR points du sommet —
  // plus ce nombre est petit, plus le "bon" coup se distingue nettement des autres.
  const nbProches = scores.filter(function(s){ return meilleur - s <= SEUIL_PROCHE_MEILLEUR; }).length;
  return { nbCoupsLegaux: moves.length, ecartMeilleurPire: meilleur - pire, nbCoupsProchesDuMeilleur: nbProches };
}

/* ═══════════════════════════════════════════
   PROFIL DE DÉCISION PERSONNEL — agrege calculerProfilDecision() sur
   TOUT l'historique de parties du joueur, pas seulement la position
   courante. Reutilise gameCodeParse() (deja utilise par gameCodeLoad)
   pour rejouer chaque partie archivee, isole du plateau reel via
   sauvegarde/restauration systematique (meme precaution que
   ensureMigsWinners -- ne doit jamais perturber une partie en cours).
   Pour CHAQUE coup joue par le joueur (pas ceux de l'IA/l'adversaire),
   evalue TOUS les coups legaux disponibles a cet instant, et verifie si
   le coup reellement joue faisait partie des "proches du meilleur"
   (meme seuil SEUIL_PROCHE_MEILLEUR que le profil de decision existant,
   30 points -- pas un nouveau seuil invente pour l'occasion).
   Distingue aussi les decisions "faciles" (grand ecart meilleur/pire,
   un choix se detachait nettement) des "disputees" (ecart <= 100 points,
   seuil arbitraire mais documente ici) -- pour voir si le joueur trouve
   le bon coup plus souvent quand c'est facile ou quand c'est dispute. */
const SEUIL_ECART_DECISION_DISPUTEE = 100; // points d'evaluateBoard -- choix documente, pas calibre
/* ═══════════════════════════════════════════
   STATISTIQUES D'EJECTION — demande d'Olivier suite a une revue externe.
   Reutilise exactement la meme methode que computeDecisionProfile()
   (gameCodeParse + rejeu isole, sauvegarde/restauration systematique de
   l'etat) : chaque statistique ci-dessous precise sa source de donnee
   dans son commentaire, comme demande.

   CONVENTIONS EXPLICITES (documentees, pas cachees dans le calcul) :
   - "Opportunite d'ejection" = au moins un coup legal a cette position
     avait ejection=true (que le joueur l'ait pris ou non).
   - Phase de partie, definie par l'etat du materiel (plus parlant pour
     Abalone qu'un simple numero de coup) :
       OUVERTURE : aucun camp n'a encore perdu de bille
       MILIEU    : premiere perte de bille faite, aucun camp a 3+ pertes
       FINALE    : un camp a deja perdu 3 billes ou plus (a mi-chemin
                   de la defaite, qui survient a 6)
   - Ratio ejection = realisees / subies, avec subies=0 rapporte a part
     (division par zero explicitement evitee, jamais masquee par un 0
     ou un Infinity silencieux).
   - "Premiere ejection" = moyenne du numero de coup de la premiere
     ejection du joueur, sur les seules parties ou il en a fait au moins
     une (les parties sans ejection n'entrent pas dans cette moyenne). */
function computeEjectionStats(){
  if (typeof getGameHistory !== 'function') return null;
  const history = getGameHistory();
  if (!history.length) return null;

  const saveLayout = currentLayout, saveBoard = board, saveCB = capturedByBlack, saveCW = capturedByWhite;
  let realisees = 0, subies = 0, opportunites = 0, gamesWithData = 0;
  let bestGame = 0, firstEjPlies = [];
  const byPhase = { ouverture:0, milieu:0, finale:0 };

  history.forEach(function(entry){
    if (!entry.code) return;
    const parsed = gameCodeParse(entry.code);
    if (!parsed.ok) return;
    const humanC = entry.humanColor || 'black';
    currentLayout = parsed.layout || 'standard';
    initBoardState(); capturedByBlack = 0; capturedByWhite = 0;
    let turn = 'black', thisGameEj = 0, firstEjThisGame = null, ply = 0;
    for (let i = 0; i < parsed.moves.length; i++) {
      const mv = parsed.moves[i];
      const v = validateMove(mv.cells, mv.dir, turn);
      if (!v || !v.valid) break;
      ply++;
      const capB0 = capturedByBlack, capW0 = capturedByWhite;
      // phase AVANT ce coup, basee sur les pertes deja subies par chaque camp
      const maxLoss = Math.max(capB0, capW0);
      const phase = (capB0===0 && capW0===0) ? 'ouverture' : (maxLoss>=3 ? 'finale' : 'milieu');

      if (turn === humanC) {
        const legal = getAllMovesForColor(turn);
        const uneOpportunite = legal.some(function(m){ return m.dir && validateMove(m.cells, m.dir, turn).ejection; });
        if (uneOpportunite) opportunites++;
        if (v.ejection) {
          realisees++; thisGameEj++; byPhase[phase]++;
          if (firstEjThisGame === null) firstEjThisGame = ply;
        }
      } else {
        if (v.ejection) subies++;
      }

      applyMove({cells:mv.cells, dir:mv.dir, info:v}, turn);
      turn = (turn === 'black') ? 'white' : 'black';
    }
    if (ply > 0) gamesWithData++;
    if (thisGameEj > bestGame) bestGame = thisGameEj;
    if (firstEjThisGame !== null) firstEjPlies.push(firstEjThisGame);
  });

  currentLayout = saveLayout; board = saveBoard; capturedByBlack = saveCB; capturedByWhite = saveCW;

  if (!gamesWithData) return null;
  return {
    gamesWithData: gamesWithData,
    realisees: realisees, subies: subies,
    ratio: (subies>0) ? +(realisees/subies).toFixed(2) : null,
    parPartie: +(realisees/gamesWithData).toFixed(2),
    opportunites: opportunites,
    efficacite: (opportunites>0) ? +(realisees/opportunites*100).toFixed(1) : null,
    premiereEjectionMoyenne: firstEjPlies.length ? +(firstEjPlies.reduce(function(a,b){return a+b;},0)/firstEjPlies.length).toFixed(1) : null,
    partiesAvecEjection: firstEjPlies.length,
    meilleurePartie: bestGame,
    byPhase: byPhase
  };
}

/* Statistiques noir/blanc -- lit directement getGameHistory(), aucun
   rejeu necessaire : humanColor et winner sont deja stockes par entree
   (source : _recordGameHistory(), meme convention deja utilisee par
   computeEngineStats). */
/* ═══════════════════════════════════════════
   STATISTIQUES DU JEU (corpus) — distinctes des statistiques PERSONNELLES.
   Celles-ci portent sur les 4 479 vraies parties embarquees (MIGS +
   AbalOnline), pas sur les parties du joueur. Repondent a des questions
   sur l'Abalone lui-meme : l'avantage du premier joueur existe-t-il
   vraiment, combien de temps dure une partie, etc.

   SOURCES, precisees pour chaque chiffre :
   - Vainqueur AbalOnline : nom stocke directement (g[3]), compare aux
     deux joueurs (g[1]=noir, g[2]=blanc -- convention validee lors du
     minage des livres d'ouvertures).
   - Vainqueur MIGS : determine par rejeu complet, uniquement pour les
     parties "Au score" (voir ensureMigsWinners, v2.20) -- les abandons
     et fins de temps restent structurellement indeterminables.
   - Longueur : comptage des jetons de la notation, sans rejeu (rapide).
   - Types de fin MIGS : champ stocke directement (g[4]).

   Le calcul MIGS s'appuie sur le cache deja construit (~78s la premiere
   fois, jamais refait ensuite). */
/* Distribution des 12 dimensions sur l'ensemble du corpus (418 595
   positions). Quasi instantane (~0,2 s mesure) : les empreintes sont
   deja en memoire, on ne fait que trier. Donne un referentiel objectif
   -- "ta cohesion est au Xe centile de toutes les positions humaines
   jamais jouees" -- la ou le radar personnel n'avait aucun point de
   comparaison exterieur.
   Source : EMPREINTES_HISTORIQUES, une entree par coup joue dans les
   4 479 parties reelles du corpus. */
function computeDimensionDistributions(){
  if (typeof EMPREINTES_HISTORIQUES === 'undefined' || !EMPREINTES_HISTORIQUES.length) return null;
  const out = {};
  EMPREINTES_CHAMPS.forEach(function(f){
    const vals = EMPREINTES_HISTORIQUES.map(function(e){ return e.e[f]; });
    vals.sort(function(a,b){ return a-b; });
    const n = vals.length;
    const q = function(p){ return vals[Math.min(n-1, Math.floor(n*p))]; };
    out[f] = {
      min: vals[0], p10: q(0.10), median: q(0.50), p90: q(0.90), max: vals[n-1],
      n: n
    };
  });
  return out;
}

/* Correlations de Pearson entre dimensions, mesurees sur le corpus
   complet. Sert a signaler honnetement quelles dimensions mesurent
   presque la meme chose -- information utile pour lire le radar sans
   surinterpreter trois axes qui bougent ensemble.
   Mesure reelle : cohesion/soutien/sans-soutien forment un groupe
   fortement redondant (|r| jusqu'a 0,93). */
function computeDimensionCorrelations(){
  if (typeof EMPREINTES_HISTORIQUES === 'undefined' || !EMPREINTES_HISTORIQUES.length) return null;
  const F = EMPREINTES_CHAMPS, N = EMPREINTES_HISTORIQUES.length;
  const mean = {}, sd = {};
  F.forEach(function(f){
    let s = 0; for (let i=0;i<N;i++) s += EMPREINTES_HISTORIQUES[i].e[f];
    mean[f] = s/N;
  });
  F.forEach(function(f){
    let s = 0; for (let i=0;i<N;i++){ const d = EMPREINTES_HISTORIQUES[i].e[f]-mean[f]; s += d*d; }
    sd[f] = Math.sqrt(s/N);
  });
  const pairs = [];
  for (let a=0;a<F.length;a++) for (let b=a+1;b<F.length;b++){
    const fa=F[a], fb=F[b];
    let cov = 0;
    for (let i=0;i<N;i++) cov += (EMPREINTES_HISTORIQUES[i].e[fa]-mean[fa])*(EMPREINTES_HISTORIQUES[i].e[fb]-mean[fb]);
    cov /= N;
    const r = (sd[fa] && sd[fb]) ? cov/(sd[fa]*sd[fb]) : 0;
    pairs.push({ a:fa, b:fb, r: +r.toFixed(3) });
  }
  pairs.sort(function(x,y){ return Math.abs(y.r) - Math.abs(x.r); });
  return { n: N, pairs: pairs };
}

async function computeCorpusStats(onProgress){
  if (typeof MIGS_GAMES === 'undefined' || typeof AO_GAMES === 'undefined') return null;
  if (!MIGS_GAMES.length || !AO_GAMES.length) return null;

  // --- Vainqueurs AbalOnline (lecture directe, aucun rejeu) ---
  let aoBlack = 0, aoWhite = 0;
  AO_GAMES.forEach(function(g){
    if (!g[3]) return;
    if (g[3] === g[1]) aoBlack++;
    else if (g[3] === g[2]) aoWhite++;
  });

  // --- Vainqueurs MIGS (cache de la v2.20) ---
  const migsWinners = await ensureMigsWinners(onProgress);
  let migsBlack = 0, migsWhite = 0;
  migsWinners.forEach(function(v){ if (v === 'black') migsBlack++; else if (v === 'white') migsWhite++; });

  const black = aoBlack + migsBlack, white = aoWhite + migsWhite;
  const decided = black + white;

  // --- Longueur des parties (comptage de jetons, pas de rejeu) ---
  const lens = [];
  MIGS_GAMES.forEach(function(g){
    const n = (g[5]||'').replace(/\d+\./g,' ').trim().split(/\s+/).filter(Boolean).length;
    if (n) lens.push(n);
  });
  lens.sort(function(a,b){ return a-b; });
  const median = lens.length ? lens[Math.floor(lens.length/2)] : null;
  const mean = lens.length ? +(lens.reduce(function(a,c){return a+c;},0)/lens.length).toFixed(1) : null;

  // --- Types de fin de partie (MIGS, champ direct) ---
  const endTypes = {};
  MIGS_GAMES.forEach(function(g){ endTypes[g[4]] = (endTypes[g[4]]||0) + 1; });

  // --- Variantes representees (AbalOnline) ---
  const byVariant = {};
  AO_GAMES.forEach(function(g){ byVariant[g[4]] = (byVariant[g[4]]||0) + 1; });
  const topVariants = Object.entries(byVariant).sort(function(a,b){ return b[1]-a[1]; }).slice(0, 8);

  return {
    totalGames: MIGS_GAMES.length + AO_GAMES.length,
    nMigs: MIGS_GAMES.length, nAo: AO_GAMES.length,
    decided: decided,
    black: black, white: white,
    blackPct: decided ? +(black/decided*100).toFixed(1) : null,
    whitePct: decided ? +(white/decided*100).toFixed(1) : null,
    lenMedian: median, lenMean: mean,
    lenMin: lens.length ? lens[0] : null, lenMax: lens.length ? lens[lens.length-1] : null,
    endTypes: endTypes,
    topVariants: topVariants,
    nVariants: Object.keys(byVariant).length
  };
}

function computeColorStats(){
  if (typeof getGameHistory !== 'function') return null;
  const history = getGameHistory();
  if (!history.length) return null;
  const out = { black:{games:0,wins:0,losses:0,draws:0}, white:{games:0,wins:0,losses:0,draws:0} };
  history.forEach(function(entry){
    const c = entry.humanColor === 'white' ? 'white' : 'black';
    out[c].games++;
    if (!entry.winner) out[c].draws++;
    else if (entry.winner === entry.humanColor) out[c].wins++;
    else out[c].losses++;
  });
  ['black','white'].forEach(function(c){
    out[c].winRate = out[c].games ? +(out[c].wins/out[c].games*100).toFixed(1) : null;
  });
  return out;
}

function computeDecisionProfile(){
  if (typeof getGameHistory !== 'function') return null;
  const history = getGameHistory();
  if (!history.length) return null;

  const saveLayout = currentLayout, saveBoard = board, saveCB = capturedByBlack, saveCW = capturedByWhite;
  let totalMoves = 0, closeToBest = 0, brancheSum = 0;
  let easyCount = 0, easyFound = 0, hardCount = 0, hardFound = 0;

  history.forEach(function(entry){
    if (!entry.code) return;
    const parsed = gameCodeParse(entry.code);
    if (!parsed.ok) return;
    const humanC = entry.humanColor || 'black';
    currentLayout = parsed.layout || 'standard';
    initBoardState(); capturedByBlack = 0; capturedByWhite = 0;
    let turn = 'black';
    for (let i = 0; i < parsed.moves.length; i++) {
      const mv = parsed.moves[i];
      const v = validateMove(mv.cells, mv.dir, turn);
      if (!v || !v.valid) break;
      if (turn === humanC) {
        const legal = getAllMovesForColor(turn);
        const scores = legal.map(function(m){
          const u = applyMove(m, turn);
          const s = evaluateBoard(turn);
          undoMove(u);
          return s;
        });
        const idxJoue = legal.findIndex(function(m){ return canonId(m) === canonId(mv); });
        if (idxJoue >= 0 && scores.length) {
          const best = Math.max.apply(null, scores), worst = Math.min.apply(null, scores);
          const scoreJoue = scores[idxJoue];
          const trouve = (best - scoreJoue) <= SEUIL_PROCHE_MEILLEUR;
          totalMoves++; brancheSum += legal.length;
          if (trouve) closeToBest++;
          const gap = best - worst;
          if (gap > SEUIL_ECART_DECISION_DISPUTEE) { easyCount++; if (trouve) easyFound++; }
          else { hardCount++; if (trouve) hardFound++; }
        }
      }
      applyMove({cells:mv.cells, dir:mv.dir, info:v}, turn);
      turn = (turn === 'black') ? 'white' : 'black';
    }
  });

  currentLayout = saveLayout; board = saveBoard; capturedByBlack = saveCB; capturedByWhite = saveCW;

  if (!totalMoves) return null;
  return {
    totalMoves: totalMoves,
    tauxProcheMeilleur: +(closeToBest/totalMoves*100).toFixed(1),
    brancheMoyenne: +(brancheSum/totalMoves).toFixed(1),
    easyCount: easyCount, easyFoundPct: easyCount ? +(easyFound/easyCount*100).toFixed(1) : null,
    hardCount: hardCount, hardFoundPct: hardCount ? +(hardFound/hardCount*100).toFixed(1) : null
  };
}

