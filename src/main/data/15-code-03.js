';
let _bookNode = null;

// id canonique d'un coup (identique à celui ayant servi à bâtir l'arbre)
// Identifiant canonique et stable d'un coup : les cellules impliquees (triees,
// pour que l'ordre de decouverte du groupe n'ait pas d'importance) + la direction.
// Sert de cle pour comparer/dedupliquer des coups (livre d'ouvertures, securite
// "ce coup propose est-il bien present dans les coups legaux actuels ?", etc.)
// — deux coups avec le meme canonId deplacent exactement le meme groupe de
// billes dans la meme direction, donc sont le meme coup au sens du jeu.
function canonId(mv){
  return mv.cells.map(function(c){ return '' + c.r + c.c; }).sort().join('') + '>' + mv.dir.q + '' + mv.dir.r;
}
// descend dans l'arbre selon le coup joué (sort du livre si inconnu)
// Fait avancer le pointeur dans l'arbre du livre (_bookNode) au fur et a mesure
// que la partie se joue reellement, coup par coup — que le coup vienne de
// l'humain ou de l'IA. Si la position sort du livre (coup jamais vu a cet
// endroit, ou _bookNode.k absent), on "sort du livre" une bonne fois pour
// toutes (_bookNode=null) : au-dela, ni pickBookMove ni le livre ne seront
// plus consultes pour le reste de la partie — la recherche prend le relais.
function bookDescend(moveInfo){
  if(!_bookNode || !_bookNode.k){ _bookNode = null; return; }
  if(!moveInfo || !moveInfo.cells || !moveInfo.dir){ _bookNode = null; return; }
  _bookNode = _bookNode.k[canonId(moveInfo)] || null;
}
// choisit une continuation du livre (tirage pondéré par fréquence × taux de victoire) qui soit LÉGALE
function pickBookMove(node, legalMoves){
  if(!node || !node.k) return null;
  // v2.60 : un coup qui reviendrait en arriere (position deja vue, aller-retour)
  // n'est jamais tire au sort -- voir _coupRetourEnArriere
  const exclus = new Set();
  for(const m of legalMoves){ const id = canonId(m); if(node.k[id] && _coupRetourEnArriere(m)) exclus.add(id); }
  const ids = Object.keys(node.k).filter(function(id){ return !exclus.has(id); });
  if(!ids.length) return null;
  // poids = fréquence × (0.5 + taux de victoire du joueur ayant joué ce coup), borné
  // Le "0.5 +" evite qu'un coup jamais gagnant (wr=0) ait un poids nul (donc
  // jamais choisi) : meme un coup rare avec un mauvais historique garde une
  // petite chance d'etre tire, pondere par sa frequence relle (n.c).
  function weight(n){
    const wr = (n.wg > 0) ? (n.w / n.wg) : 0.5;   // taux de victoire, 0.5 si inconnu
    return n.c * (0.5 + wr);
  }
  // Tirage pondere classique : chaque candidat occupe une "tranche" proportionnelle
  // a son poids sur [0, total], on tire un nombre au hasard dedans et on regarde
  // dans quelle tranche il tombe (roulette).
  let total = 0; for(const id of ids) total += weight(node.k[id]);
  let pick = Math.random()*total, chosen = ids[0];
  for(const id of ids){ pick -= weight(node.k[id]); if(pick <= 0){ chosen = id; break; } }
  // Verification de securite indispensable : l'arbre a pu etre construit sur un
  // plateau legerement different (transposition, variante) — on ne rend le coup
  // que s'il correspond REELLEMENT a un coup legal ICI, jamais a l'aveugle.
  for(const m of legalMoves){ if(canonId(m) === chosen) return m; }  // sécurité : doit être légal
  return null;
}

/* Repli "livre" par les parties reelles, quand l'arbre (OPENING_TREES) a
   perdu la trace de la partie : la MEME position, atteinte dans un autre
   ordre (transposition), existe-t-elle dans une des 4479 parties du corpus ?
   Si oui, on joue ce que les joueurs y ont joue.

   Ce que faisait ce repli jusqu'a la v2.59, et pourquoi c'etait faux
   (allers-retours h9g8 / g8h9 vus contre l'IA niveau 3) :
   - il prenait l'empreinte la plus PROCHE, sans aucun seuil : une position
     sans rapport (autre disposition de depart, autre partie) donnait son coup ;
   - il comparait la position, ou l'IA est au trait, a des positions ou
     c'etait a l'ADVERSAIRE de jouer (un enregistrement {m, c} decrit la
     position juste apres le coup m du camp c, vue de c -- verifie en
     rejouant des parties : distance 0,001 pour {m, c} apres m+1 demi-coups),
     puis rejouait le coup m+2, joue dans une position que l'adversaire avait
     deja changee ;
   - rien n'empechait de revenir a une position deja vue, ni de defaire son
     propre coup precedent.
   Mesure avant correction, sur 24 parties simulees au niveau 3 (disposition
   standard et Marguerite belge, 264 coups de l'IA dans les 22 premiers
   demi-coups) : 136 coups venaient de ce repli, dont 16 allers-retours, en
   moyenne 313 points moins bons que le coup calcule et jusqu'a 2112 (plus
   d'une bille). Apres : 11 coups de ce repli, aucun aller-retour.

   Depuis la v2.60 :
   1. on compare la position actuelle, vue du camp qui VIENT de jouer, aux
      enregistrements de ce camp (meme trait), a 6 demi-coups pres ;
   2. seuls les enregistrements quasi identiques comptent (distance < 0,01 :
      l'arrondi du stockage donne au plus 0,002 pour la meme position) ;
   3. chacun est VERIFIE : on rejoue sa partie jusqu'a ce coup, et la
      position doit etre exactement la notre (memes billes, memes ejections) ;
      on joue alors la reponse jouee dans cette partie (coup m+1) ;
   4. jamais un coup qui ramene une position deja vue dans la partie, ni qui
      defait le coup precedent du meme camp ;
   5. plusieurs parties d'accord : tirage pondere par le nombre de parties.
   Rien de verifie : null, et la recherche decide. Ne touche pas evaluateBoard
   (la Lab a etabli qu'ajouter des criteres a l'evaluation la degrade). */
const EMP_SEUIL_IDENTIQUE = 0.01, EMP_MAX_VERIFS = 16, EMP_FENETRE = 6;
let _empIndexDemiCoups = null;     // demi-coup m -> indices des enregistrements (construit une fois)
const _empRejeux = new Map();      // 'MIGS:12' -> positions de la partie rejouee (cache borne)
function _empIndex(){
  if (_empIndexDemiCoups && _empIndexDemiCoups.n === EMPREINTES_HISTORIQUES.length) return _empIndexDemiCoups.t;
  const parM = [];
  for (let i = 0; i < EMPREINTES_HISTORIQUES.length; i++) {
    const m = EMPREINTES_HISTORIQUES[i].m;
    if (m > 40) continue;            // seul le debut de partie sert ici
    (parM[m] || (parM[m] = [])).push(i);
  }
  _empIndexDemiCoups = { n: EMPREINTES_HISTORIQUES.length, t: parM.map(function(a){ return a ? Int32Array.from(a) : null; }) };
  return _empIndexDemiCoups.t;
}
// position de depart d'une partie du corpus, sans toucher au jeu en cours
function _empDepartPartie(s, jeu){
  const bd = {};
  if (s === 'MIGS') {                // MIGS : toujours la Marguerite belge (comme loadMigsGame)
    LAYOUTS.belgian.black.forEach(function(p){ bd[p[0]+','+p[1]] = 'black'; });
    LAYOUTS.belgian.white.forEach(function(p){ bd[p[0]+','+p[1]] = 'white'; });
    return { board: bd, cb: 0, cw: 0 };
  }
  // AbalOnline : meme lecture que _setupFromAOStart, sans modifier les compteurs du jeu
  const parts = String(jeu[5]).split(','); if (parts.length !== 2) return null;
  const perdues = [];
  for (let i = 0; i < 2; i++) {
    const m = parts[i].match(/^(\d)(.*)$/); if (!m) return null;
    const cases = m[2].match(/[a-i][1-9]/g) || [];
    for (const cc of cases) { const rc = abaproToRc(cc); if (!rc) return null; bd[rc.r+','+rc.c] = i === 0 ? 'black' : 'white'; }
    perdues.push(parseInt(m[1], 10));
  }
  return { board: bd, cb: perdues[1], cw: perdues[0] };   // billes blanches perdues = score des noirs
}
function _empCle(bd, cb, cw){ return _repKeyOf(bd) + '|' + cb + '-' + cw; }
// rejoue (une fois, puis en cache) les nb premiers demi-coups d'une partie du corpus
function _empRejeuPartie(s, g, nb){
  const id = s + ':' + g;
  let r = _empRejeux.get(id);
  if (r && (r.fini || r.cles.length >= nb)) return r;
  const jeu = s === 'MIGS' ? MIGS_GAMES[g] : AO_GAMES[g];
  if (!jeu) return null;
  const depart = _empDepartPartie(s, jeu);
  if (!depart) return null;
  const jetons = String(s === 'MIGS' ? jeu[5] : jeu[6]).replace(/\d+\.-?/g, ' ').trim().split(/\s+/).filter(Boolean);
  r = { cles: [], jetons: jetons, fini: false };
  // resolveAbaProToken lit le plateau global : on le permute le temps du rejeu,
  // et on le restaure meme en cas d'exception (meme patron que les indices de coups)
  const sauve = board;
  try {
    board = depart.board;
    let col = 'black', cb = depart.cb, cw = depart.cw;
    for (let k = 0; k < nb; k++) {
      const mv = k < jetons.length ? resolveAbaProToken(jetons[k], col) : null;
      if (!mv) { r.fini = true; break; }
      if (abApplyMove(mv.cells, mv.dir, col, mv.info).ejected) { if (col === 'black') cb++; else cw++; }
      r.cles.push(_empCle(board, cb, cw));
      col = col === 'black' ? 'white' : 'black';
    }
  } finally { board = sauve; }
  if (_empRejeux.size >= 400) _empRejeux.clear();
  _empRejeux.set(id, r);
  return r;
}
// Ce coup ramene-t-il une position deja vue, ou defait-il le coup precedent du meme camp ?
// Partage par le repli et par les livres d'ouvertures : un coup joue SANS calcul
// ne revient jamais en arriere (la recherche, elle, a sa propre penalite de
// repetition et peut choisir de revenir si c'est vraiment le meilleur coup).
function _coupRetourEnArriere(mv, color){
  if (!mv || !mv.info || !mv.cells || !mv.cells.length || typeof boardSnapshots === 'undefined') return false;
  color = color || board[mv.cells[0].r + ',' + mv.cells[0].c];
  if (!color) return false;
  const depart = (typeof _replayStartBoard !== 'undefined' && _replayStartBoard) ? _replayStartBoard : null;
  const n = boardSnapshots.length;
  // sur une COPIE du plateau : applyMove puis undoMove rendraient le meme contenu mais
  // changeraient l'ordre des cases, donc l'ordre des coups generes ensuite
  const sauve = board, cb = CapturedByBlack.get(), cw = CapturedByWhite.get();
  board = Object.assign({}, sauve);
  let retour = false;
  try {
    applyMove(mv, color);
    const cle = _repKeyOf(board);
    if (depart && _repKeyOf(depart) === cle) retour = true;
    for (let i = 0; i < n && !retour; i++) if (boardSnapshots[i] && boardSnapshots[i].board && _repKeyOf(boardSnapshots[i].board) === cle) retour = true;
    // aller-retour : mes billes reviennent la ou elles etaient avant mon coup precedent
    if (!retour && n >= 2) {
      const avantMonCoup = n >= 3 ? (boardSnapshots[n - 3] && boardSnapshots[n - 3].board) : depart;
      if (avantMonCoup && boardSnapshots[n - 2] && boardSnapshots[n - 2].color === color) {
        const miennes = function(bd){ return Object.keys(bd).filter(function(k){ return bd[k] === color; }).sort().join(' '); };
        if (miennes(board) === miennes(avantMonCoup)) retour = true;
      }
    }
  } finally { board = sauve; CapturedByBlack.set(cb); CapturedByWhite.set(cw); }
  return retour;
}
function pickEmpreinteFallbackMove(color, legalMoves, moveCountActuel){
  if (typeof EMPREINTES_HISTORIQUES === 'undefined' || !EMPREINTES_HISTORIQUES.length || !EMPREINTES_FLAT) return null;
  if (!legalMoves || !legalMoves.length || !moveCountActuel) return null;
  if (!MIGS_GAMES.length && !AO_GAMES.length) return null;
  const adv = color === 'black' ? 'white' : 'black';   // le camp qui vient de jouer
  const emp = calculerEmpreinte(adv);
  const D = EMPREINTES_CHAMPS.length, e = new Float64Array(D), S2 = EMP_SEUIL_IDENTIQUE * EMP_SEUIL_IDENTIQUE;
  for (let c = 0; c < D; c++) e[c] = emp[EMPREINTES_CHAMPS[c]];
  const index = _empIndex(), proches = [];
  // enregistrement {m, c=adv} : position apres m+1 demi-coups, notre camp au trait
  for (let m = Math.max(0, moveCountActuel - 1 - EMP_FENETRE); m <= moveCountActuel - 1 + EMP_FENETRE; m++) {
    const ids = index[m]; if (!ids) continue;
    for (let j = 0; j < ids.length; j++) {
      const i = ids[j], p = EMPREINTES_HISTORIQUES[i];
      if (p.c !== adv) continue;
      const off = i * D; let sq = 0;
      for (let c = 0; c < D && sq < S2; c++) { const df = e[c] - EMPREINTES_FLAT[off + c]; sq += df * df; }
      if (sq < S2) proches.push({ p: p, d: sq });
    }
  }
  if (!proches.length) return null;
  proches.sort(function(a, b){ return a.d - b.d; });
  const ici = _empCle(board, CapturedByBlack.get(), CapturedByWhite.get());
  const votes = new Map();
  for (let j = 0; j < proches.length && j < EMP_MAX_VERIFS; j++) {
    const q = proches[j].p;
    const r = _empRejeuPartie(q.s, q.g, q.m + 1);
    if (!r || r.cles[q.m] !== ici) continue;           // pas exactement notre position : on n'en tire rien
    const jeton = r.jetons[q.m + 1];
    const mv = jeton ? resolveAbaProToken(jeton, color) : null;
    if (!mv) continue;
    let legal = null;
    for (const m of legalMoves) { if (canonId(m) === canonId(mv)) { legal = m; break; } }   // doit etre legal ici
    if (!legal || _coupRetourEnArriere(legal, color)) continue;
    const id = canonId(legal), v = votes.get(id) || { m: legal, n: 0 };
    v.n++; votes.set(id, v);
  }
  if (!votes.size) return null;
  let total = 0; votes.forEach(function(v){ total += v.n; });
  let x = Math.random() * total;
  for (const v of votes.values()) { x -= v.n; if (x <= 0) return v.m; }
  return votes.values().next().value.m;
}


/* ═══════════════════════════════════════════
   PARTIES MIGS — 2589 parties Belgian Daisy (notation ABA-PRO)
   [n°, date, noir, blanc, résultat, séquence]
═══════════════════════════════════════════ */
let MIGS_GAMES=[];  // rempli par ensureGameBanks() — banque compressée ci-dessous
const MIGS_B64='