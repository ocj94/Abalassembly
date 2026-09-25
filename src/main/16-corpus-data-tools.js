/* ═══════════════════════════════════════════
   GRAPHE DES POSITIONS — transpositions réelles (839 positions, 876 arêtes)
   Contrairement au livre d'ouvertures (qui fusionne par CHEMIN de coups),
   ce graphe fusionne par POSITION atteinte : deux parties qui arrivent au
   même plateau par des ordres de coups différents pointent vers le même
   nœud. Construit sur les 20 premiers plis des 4480 vraies parties,
   élagué aux positions atteintes par au moins 5 parties DIFFÉRENTES (pas
   juste 5 occurrences — 5 parties distinctes, pour écarter les répétitions
   internes à une seule partie). wg/w utilisent les mêmes vainqueurs réels
   que le livre d'ouvertures (rejeu complet, voir plus haut).
   Hash de position : 'B'|'W' (trait) + 61 caractères (0=vide,1=noir,2=blanc)
   dans l'ordre fixe des cases du plateau — DOIT rester identique au script
   de construction hors-ligne pour que les clés se retrouvent.
═══════════════════════════════════════════ */
let GRAFFE_POSITIONS = null;  // {nodes:{hash:{c,g,wg,w}}, edges:{hash:{canonId:{to,c}}}} — rempli par ensurePositionsGraph()
let _graphReady = null;
function ensurePositionsGraph(){
  if (_graphReady) return _graphReady;
  if (typeof DecompressionStream === 'undefined') { _graphReady = Promise.resolve(false); return _graphReady; }
  _graphReady = _inflB64(GRAPH_B64).then(function(txt){ GRAFFE_POSITIONS = JSON.parse(txt); return true; }).catch(function(){ return false; });
  return _graphReady;
}
/* Différé hors du chemin critique de rendu (même raison que les empreintes
   ci-dessus : pas de fallback "chargement en cours" côté consommateur). */
(function(){
  const start = function(){ ensurePositionsGraph(); };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(start, {timeout: 2000});
  else setTimeout(start, 300);
})();
function hashPositionActuelle(color) {
  let s = color === 'black' ? 'B' : 'W';
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < ROWS[r]; c++) {
      const v = board[r+','+c];
      s += v === 'black' ? '1' : v === 'white' ? '2' : '0';
    }
  }
  return s;
}

(function(){  // sons -> Blob URLs
  if(typeof DecompressionStream==='undefined') return;
  Object.keys(SFX_C).forEach(function(k){
    _inflB64(SFX_C[k], true).then(function(buf){
      SFX[k]=URL.createObjectURL(new Blob([buf],{type:'audio/wav'}));
    }).catch(function(){});
  });
})();

// Notation officielle ABA-PRO d'un coup légal (pour résoudre les tokens)
function abaproOfficialLabels(mv){
  const dir=mv.dir, cells=mv.cells;
  const ax=cells.map(function(c){ return {c:c, a:rcToAxial(c.r,c.c)}; });
  const type=(mv.info&&mv.info.type)||mv.type;
  function proj(a){ return a.q*dir.q + a.r*dir.r; }
  if(type==='broadside'){
    const s=ax.slice().sort(function(p,q){ return (p.a.q-q.a.q)||(p.a.r-q.a.r); });
    const e1=s[0].c, e2=s[s.length-1].c;
    const d1=axialToRc(rcToAxial(e1.r,e1.c).q+dir.q, rcToAxial(e1.r,e1.c).r+dir.r);
    const d2=axialToRc(rcToAxial(e2.r,e2.c).q+dir.q, rcToAxial(e2.r,e2.c).r+dir.r);
    const L=[];
    if(d1)L.push(coordToABAPRO(e1.r,e1.c)+coordToABAPRO(e2.r,e2.c)+coordToABAPRO(d1.r,d1.c));
    if(d2)L.push(coordToABAPRO(e2.r,e2.c)+coordToABAPRO(e1.r,e1.c)+coordToABAPRO(d2.r,d2.c));
    return L;
  }
  const s=ax.slice().sort(function(p,q){ return proj(p.a)-proj(q.a); });
  const tail=s[0].c;
  const td=axialToRc(rcToAxial(tail.r,tail.c).q+dir.q, rcToAxial(tail.r,tail.c).r+dir.r);
  if(!td)return [];
  return [coordToABAPRO(tail.r,tail.c)+coordToABAPRO(td.r,td.c)];
}
// Retrouve, parmi les coups legaux ACTUELS du plateau, celui qui correspond a
// un token de notation ABA-PRO textuelle (ex: "d1d3") venant d'une partie
// enregistree (MIGS/AO) ou du livre d'ouvertures. Fonctionne sur n'importe
// quel plateau (pas seulement celui d'origine) car la notation ABA-PRO est
// en coordonnees absolues, pas relatives — d'ou son usage aussi pour le
// repli empreintes historiques (verifie qu'un coup historique est LEGAL ici).
function resolveAbaProToken(token,color){
  const legal=getAllMovesForColor(color);
  // abaproOfficialLabels(mv) genere tous les libelles textuels valides pour
  // ce coup (un meme coup peut avoir plusieurs notations equivalentes selon
  // la bille de reference choisie dans le groupe) — on cherche le token dedans.
  const m=legal.filter(function(mv){ return abaproOfficialLabels(mv).indexOf(token)!==-1; });
  if(!m.length)return null;   // token illisible ou coup illegal sur CE plateau
  m.sort(function(a,b){ return b.cells.length-a.cells.length; });  // ligne maximale si ambigu
  return m[0];
}
// Pose une position depuis une chaîne AbalOnline "Sblack_cells,Swhite_cells" (S = score = billes éjectées)
// Installe la position de DEPART d'une partie AbalOnline (variante quelconque,
// pas seulement Belgian Daisy) a partir du champ g[5] du format AO_GAMES.
// Format de startStr : "<nbEjectees><cases>,<nbEjectees><cases>" — ex.
// "0a1a2b1,0i9i8h9" = noir a a1/a2/b1, blanc a i9/i8/h9, personne n'a encore
// perdu de bille. Retourne false si le format ne peut pas etre lu (partie
// ignoree plutot que plantee), true si le plateau a ete installe avec succes.
function _setupFromAOStart(startStr){
  board={}; CapturedByBlack.set(0); CapturedByWhite.set(0);
  const parts=String(startStr).split(','); if(parts.length!==2) return false;
  // place() lit un segment "<nbEjectees><cases>" pour UNE couleur : le premier
  // chiffre est le nombre de billes deja perdues par ce camp (score adverse),
  // suivi de la liste de ses cases occupees en notation officielle (a1, i9...).
  function place(p,col){
    const m=p.match(/^(\d)(.*)$/); if(!m) return false;
    const cells=m[2].match(/[a-i][1-9]/g)||[];
    for(const cc of cells){ const rc=abaproToRc(cc); if(!rc) return false; board[rc.r+','+rc.c]=col; }
    return parseInt(m[1],10);
  }
  const sb=place(parts[0],'black'), sw=place(parts[1],'white');
  if(sb===false||sw===false) return false;
  CapturedByWhite.set(sb); CapturedByBlack.set(sw);   // billes noires éjectées = score blanc, et inversement
  return true;
}
// Rejoue une séquence ABA-PRO sur le plateau courant et bascule en mode rejeu
function _replaySeqToSnapshots(seq, labelText, startColor){
  boardSnapshots=[]; _bookNode=null;
  /* Les billes ejectees de la partie precedente restaient dessinees dans la
     gouttiere pendant tout le rejeu : un score fantome sans rapport avec la
     partie chargee. Signale par Saab. */
  if (typeof resetGutterPositions === 'function') resetGutterPositions();
  /* Position de depart, conservee a part : boardSnapshots ne contient que des
     etats APRES coup, si bien que le rejeu commencait au coup 1 et ne montrait
     jamais l'ouverture. On ne l'insere pas dans boardSnapshots, dont l'index
     est la reference de l'export, de l'historique et de l'analyse. */
  _replayStartBoard = JSON.parse(JSON.stringify(board));
  let color=startColor||'black', played=0;
  const tokens=String(seq).replace(/\d+\./g,' ').trim().split(/\s+/).filter(Boolean);
  for(let i=0;i<tokens.length;i++){
    const mv=resolveAbaProToken(tokens[i],color);
    if(!mv) break;   // arrêt propre si un token ne résout pas
    const moveInfo={cells:mv.cells,dir:mv.dir,type:(mv.info&&mv.info.type)||mv.type,ejection:!!mv.eject};
    let lab; try{ lab=moveToABAPRO(mv.cells,mv.dir,moveInfo.type); }catch(e){ lab=tokens[i]; }
    applyMove(mv,color);
    boardSnapshots.push({board:JSON.parse(JSON.stringify(board)),capturedByBlack:CapturedByBlack.get(),capturedByWhite:CapturedByWhite.get(),moveCount:played,label:lab,color:color,moveInfo:moveInfo});
    color=color==='black'?'white':'black'; played++;
  }
  GameOver.set(true);
  if(typeof rebuildMoveListLabels==='function') rebuildMoveListLabels();
  replayMode=true; replayCurrentIdx=-1;   // -1 = position de depart
  const rb=document.getElementById('replay-btn'); if(rb){ rb.style.display='block'; rb.textContent='■ Quitter replay'; }
  if(typeof loadSnapshot==='function') loadSnapshot(-1);
  closeMigsBrowser();
  showToast('📂 '+labelText+' — '+played+' coups (◀ ▶ pour naviguer)');
}
// Charge une partie Migs (belgian) en mode rejeu
function loadMigsGame(idx){
  if(!MIGS_GAMES.length){ ensureGameBanks().then(function(ok){ if(ok)loadMigsGame(idx); else showToast('Bibliothèque indisponible (navigateur trop ancien)'); }); showToast('⏳ Chargement de la bibliothèque…'); return; }
  const g=MIGS_GAMES[idx]; if(!g) return;
  /* Bug signale par Saab (v1.17) : « la fenetre dit chargee, mais la game ne
     s'affiche pas ». _replaySeqToSnapshots preparait bien le replay et fermait
     le navigateur, mais si on lance depuis le menu Bibliotheque en etant sur
     une autre page, le plateau reste invisible. On bascule donc sur la page
     jeu AVANT de construire le replay. */
  if(typeof showPage==='function') showPage('game');
  currentLayout='belgian'; initBoardState(); CapturedByBlack.set(0); CapturedByWhite.set(0);
  _replaySeqToSnapshots(g[5], g[2]+' vs '+g[3]);
}
// Charge une partie AbalOnline (variante quelconque, position de départ propre) en mode rejeu
function loadAOGame(idx){
  if(!AO_GAMES.length){ ensureGameBanks().then(function(ok){ if(ok)loadAOGame(idx); else showToast('Bibliothèque indisponible (navigateur trop ancien)'); }); showToast('⏳ Chargement de la bibliothèque…'); return; }
  const g=AO_GAMES[idx]; if(!g) return;   // [date,x,y,win,var,start,seq]
  if(!_setupFromAOStart(g[5])){ showToast('Position de départ illisible'); return; }
  const v=g[4].replace('_daisy',''); if(typeof LAYOUTS!=='undefined' && LAYOUTS[v]) currentLayout=v;
  _replaySeqToSnapshots(g[6], g[1]+' vs '+g[2]+' ('+g[4].replace('_daisy',' daisy')+')');
}

/* ═══════════════════════════════════════════
   IMPORT PLAYSTRATEGY — récupération live des parties d'un joueur,
   directement depuis le navigateur (CORS ouvert côté PlayStrategy,
   confirmé par test réel). Session uniquement -- pas fusionné dans
   MIGS_GAMES/AO_GAMES (banques figées à la construction du site) ;
   c'est une bibliothèque à part, tant qu'on n'a pas de pipeline pour
   régénérer les banques compressées avec ces parties.
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   NOTATION PLAYSTRATEGY -> ABA-PRO D'ABALASSEMBLY
   PlayStrategy n'ecrit PAS ses coups comme Abalassembly, contrairement a ce
   qu'affirmait un ancien commentaire ("utilisable telle quelle"). Mesure sur
   un tournoi reel de 90 parties : stockees telles quelles, 0 partie rejouait
   en entier -- 3 demi-coups sur 7 705 -- chaque rejeu s'arretant au premier
   coup.

   La regle, lue dans le moteur de PlayStrategy (strategygames, abalone) :
   cle = lettre de rangee + position ; pour un coup EN LIGNE "xy", PlayStrategy
   ne regarde pas vraiment la case d'arrivee : il decale toute la chaine de
   billes contigues depuis x, dans la direction de y (la case notee ne sert
   qu'a donner la direction). Pour un coup LATERAL, x est une extremite du
   groupe et y la destination de l'extremite opposee.

   Chaque coup converti est VERIFIE trois fois : legal pour le moteur
   d'Abalassembly, position obtenue identique a celle de PlayStrategy, et
   jeton Aba-Pro choisi qui se relit bien en ce meme coup (la notation Aba-Pro
   peut etre ambigue). Au premier doute, la conversion s'arrete : une partie
   partielle vaut mieux qu'une partie fausse. */
const _PS_VOISINS = [[1,0],[0,1],[1,1],[-1,0],[0,-1],[-1,-1]];
function _psNorme(dx, dy){ return Math.max(Math.abs(dx), Math.abs(dy), Math.abs(dx - dy)); }
function _psEstCase(x, y){ return x >= 0 && x <= 8 && y >= 0 && y <= 8 && _psNorme(x - 4, y - 4) < 5; }
function _psPos(nom){ return [parseInt(nom.slice(1), 10) - 1, nom.charCodeAt(0) - 97]; }
function _psNom(x, y){ return String.fromCharCode(97 + y) + (x + 1); }
let _psNomVersRc = null;
function _psRc(nom){
  if (!_psNomVersRc) {
    _psNomVersRc = {};
    for (let r = 0; r < 9; r++) for (let c = 0; c < ROWS[r]; c++) _psNomVersRc[String(coordToABAPRO(r, c))] = { r: r, c: c };
  }
  return _psNomVersRc[nom] || null;
}
function _psPlateauParNom(){
  const out = {};
  for (let r = 0; r < 9; r++) for (let c = 0; c < ROWS[r]; c++) {
    const p = board[akey(r, c)]; if (p) out[String(coordToABAPRO(r, c))] = p;
  }
  return out;
}
/* Semantique de rejeu de PlayStrategy (Variant.boardAfter_pieces), sur un
   plateau indexe par nom de case. Renvoie le plateau apres coup, ou null. */
function _psAppliquer(pl, o, d){
  const res = Object.assign({}, pl); delete res[_psNom(o[0], o[1])];
  const vx = d[0] - o[0], vy = d[1] - o[1];
  let n = _psNorme(vx, vy);
  const ligne = _PS_VOISINS.find(function(v){ return v[0] * n === vx && v[1] * n === vy; });
  if (!ligne) {
    n -= 1;
    for (const v of _PS_VOISINS) for (const s of _PS_VOISINS) {
      if ((s[0] === v[0] && s[1] === v[1]) || (s[0] === -v[0] && s[1] === -v[1])) continue;
      if (v[0] * n + s[0] !== vx || v[1] * n + s[1] !== vy) continue;
      const groupe = [];
      for (let i = 0; i <= n; i++) groupe.push([o[0] + v[0] * i, o[1] + v[1] * i]);
      if (groupe.some(function(g){ return !pl[_psNom(g[0], g[1])]; })) continue;
      const r2 = Object.assign({}, pl);
      groupe.forEach(function(g){ delete r2[_psNom(g[0], g[1])]; });
      for (const g of groupe) {
        const to = [g[0] + s[0], g[1] + s[1]];
        if (!_psEstCase(to[0], to[1]) || r2[_psNom(to[0], to[1])]) return null;
        r2[_psNom(to[0], to[1])] = pl[_psNom(g[0], g[1])];
      }
      return r2;
    }
    return null;
  }
  n -= 1;
  for (let i = 0; ; i++) {
    const f = [o[0] + ligne[0] * i, o[1] + ligne[1] * i], t = [f[0] + ligne[0], f[1] + ligne[1]];
    if (pl[_psNom(f[0], f[1])] && (i < n || _psEstCase(t[0], t[1]))) {
      if (!_psEstCase(t[0], t[1])) return null;
      res[_psNom(t[0], t[1])] = pl[_psNom(f[0], f[1])];
    } else break;
  }
  return res;
}
/* Le coup d'Abalassembly equivalent a un jeton PlayStrategy, ou null. */
function _psCoupVersAba(tok, couleur){
  const o = _psPos(tok.slice(0, 2)), d = _psPos(tok.slice(2, 4));
  const ro = _psRc(tok.slice(0, 2));
  if (!ro || board[akey(ro.r, ro.c)] !== couleur) return null;
  const vx = d[0] - o[0], vy = d[1] - o[1];
  let n = _psNorme(vx, vy);
  const axe = function(a, b){ const ra = _psRc(_psNom(a[0], a[1])), rb = _psRc(_psNom(b[0], b[1]));
    if (!ra || !rb) return null; const A = rcToAxial(ra.r, ra.c), B = rcToAxial(rb.r, rb.c); return { q: B.q - A.q, r: B.r - A.r }; };
  const ligne = _PS_VOISINS.find(function(v){ return v[0] * n === vx && v[1] * n === vy; });
  let cells = [], dir = null;
  if (ligne) {
    for (let i = 0; i < 4; i++) {
      const p = [o[0] + ligne[0] * i, o[1] + ligne[1] * i];
      const rc = _psEstCase(p[0], p[1]) ? _psRc(_psNom(p[0], p[1])) : null;
      if (!rc || board[akey(rc.r, rc.c)] !== couleur) break;
      cells.push(rc);
    }
    if (!cells.length || cells.length > 3) return null;
    dir = axe(o, [o[0] + ligne[0], o[1] + ligne[1]]);
  } else {
    n -= 1;
    outer:
    for (const v of _PS_VOISINS) for (const s of _PS_VOISINS) {
      if ((s[0] === v[0] && s[1] === v[1]) || (s[0] === -v[0] && s[1] === -v[1])) continue;
      if (v[0] * n + s[0] !== vx || v[1] * n + s[1] !== vy) continue;
      const g = [];
      for (let i = 0; i <= n; i++) {
        const p = [o[0] + v[0] * i, o[1] + v[1] * i];
        const rc = _psEstCase(p[0], p[1]) ? _psRc(_psNom(p[0], p[1])) : null;
        if (!rc || board[akey(rc.r, rc.c)] !== couleur) { g.length = 0; break; }
        g.push(rc);
      }
      if (g.length) { cells = g; dir = axe(o, [o[0] + s[0], o[1] + s[1]]); break outer; }
    }
    if (!cells.length) return null;
  }
  if (!dir) return null;
  const info = validateMove(cells, dir, couleur);
  if (!info || !info.valid) return null;
  return { cells: cells, dir: dir, info: info };
}
/* Convertit une suite de coups PlayStrategy en jetons Aba-Pro verifies.
   Ne modifie jamais la partie en cours (etat sauvegarde puis restaure). */
function psConvertirSequence(coups){
  const toks = String(coups || '').match(/[a-i][1-9][a-i][1-9]/g) || [];
  const sauve = { board: board, cb: CapturedByBlack.get(), cw: CapturedByWhite.get(),
    layout: (typeof currentLayout !== 'undefined') ? currentLayout : 'standard' };
  const out = [];
  try {
    currentLayout = 'belgian'; initBoardState(); CapturedByBlack.set(0); CapturedByWhite.set(0);
    let couleur = 'black';
    const memeCoup = function(a, b){
      if (!a || !b || a.dir.q !== b.dir.q || a.dir.r !== b.dir.r || a.cells.length !== b.cells.length) return false;
      const k = function(m){ return m.cells.map(function(x){ return x.r + ',' + x.c; }).sort().join('|'); };
      return k(a) === k(b);
    };
    for (let i = 0; i < toks.length; i++) {
      const mv = _psCoupVersAba(toks[i], couleur);
      if (!mv) break;
      const cible = _psAppliquer(_psPlateauParNom(), _psPos(toks[i].slice(0, 2)), _psPos(toks[i].slice(2, 4)));
      if (!cible) break;
      const lab = (abaproOfficialLabels(mv) || []).find(function(l){ return memeCoup(resolveAbaProToken(l, couleur), mv); });
      if (!lab) break;
      applyMove(mv, couleur);
      const apres = _psPlateauParNom();
      const cles = Object.keys(apres).concat(Object.keys(cible));
      if (cles.some(function(k){ return apres[k] !== cible[k]; })) break;
      out.push(lab);
      couleur = (couleur === 'black') ? 'white' : 'black';
    }
  } catch (e) {
    /* on ne laisse jamais une conversion casser l'etat du jeu */
  } finally {
    board = sauve.board; CapturedByBlack.set(sauve.cb); CapturedByWhite.set(sauve.cw);
    if (typeof currentLayout !== 'undefined') currentLayout = sauve.layout;
  }
  return { jetons: out, total: toks.length, complet: out.length === toks.length };
}

/* Yearly Abalone Arena, PlayStrategy, 18/09/2026 -- 90 parties (3 parties
   abandonnees avant le premier coup ecartees). Publiees avec l'accord de
   Vincent. Coups deja convertis en Aba-Pro et verifies un a un : legaux pour
   le moteur d'Abalassembly, positions identiques a PlayStrategy sur les 7 705
   demi-coups, vainqueurs conformes. Chaque partie garde son identifiant
   PlayStrategy (https://playstrategy.org/<id>). Procedure de retrait : celle
   du projet, comme pour les parties MiGs. */
const PS_TOURNOI_YEARLY_2026 = [["CQYLlLVN","2026-09-18","SOLFAREMI","PST-Greedy-Tom","SOLFAREMI gagne","a1b2 i5h5 a2b3 i6h6 c2c3 a5b5 b1c2 h6g5 g7g8f6 h4g4 f6f7e5 e4f5 i8h8 f4g5 h9g8 c5c7d6 b3c3 g4g5 c4d4 h6h7 g8h9f8 g7h8 f8f7 g5f5g4 g9f8 i9i8 f8f7 h8h7 f7f6 f3g4f2 d5e5 b4b5c5 c3d3 d8d7 b2c2 f2e1 g5f5 d6c5 d3d4 b4c5 f5e5 a5b6 c2d3 b6c7 f4e4 b5b6 e3d3 c7d7 c3c4 c7b6 e4e5 a4a3 e5d5 h7i8g7 d5c5 a3a2 a5b5 e8e9 f7e7 e1e2 c4c5 g3f2 b5c6 f2e2f3 e7e8 f3f4 e9e8 h6g6g5 d3d4e4 g7g6 d2d3 e3f4 d3d4 f4g4 c7d7 h8h7 f7f6 h5h4 d5e5 h5g4 d7e7 f3f4e2 f7f6 g4g3 e6e5 e1e2d1 d4e4 h4h5 e5f5 a2b2 e3f4 i7h7i8 f5g5 g3f2 i5h5 g6g7 h6g5 d1d2c1 f6f5 f2e1 h5g4 c1d2 g5f4 c1c2 e4e3 g7h8g6 g4f4 c2c3 f3e3 b2b3 e7d7 c4b4 c6c5 c3b2 f4e4 b2a2 e3d3 a2b3 e1e2 b3c4 e2e3 g6h6 d7e7 d8d7 e6e8f6 h6g6 e3e4 g6i8g7 f6e6 h8i9h7 f8f7 c6b5 d6c5 a3a4 f6e6 d7c6 f7f6 c6d7 f6e6 b6a5 d3c3 d5c4 a2a3 d7e8 f5e5 g7g6 e5d5"],["9Tiuo7Cb","2026-09-18","PST-Greedy-Tom","SOLFAREMI","PST-Greedy-Tom gagne","i9h8 i5h5 i8h7 h4g4 a1b1 a4b4 a2b3 f4f5e4 h9h8 h4g4 g8g7 g3f3 h8h7 g4f4 f6g6 h4g4 c2c3 b6c6 c3c4 c7d7 b1b2 f4e4 b2b3 e4d4 c5b5 d6c5 b5c6 e5d5 g7g6 g3f3 c6d7 f9f8 b3b2 d4c4 d7e8d6 f8f7 h6g5 f3e3 d6d7 e3d3e4 f4f5 f7e6 d7e8 d5c5 e8e7 a5b5 i6h6 c4d5 f7e7g8 a4b4 b2b1 b6b5 b1c1 e5d4 h6g6 b5c5 h7h6 c3d4 g7g8h7 b4c5 f8g9 c4d5 h6g5 d6e7 h7h6 e7f8 g4f3 b3c4 g9h9 c4b4 h9h8 b4c5 g6g5 d6e6 h7h6 d4d3 h6g5 g6f6 f5f4 d3e4 h8h7 d5e5 e3f4 h6g6 h7i7 c5d5 i7i6 g6f5 g5g4 d6d5 i5i6 f7e6 d1e2 e6e5 h5i6g5 d5d4 c1b1 d2c2 b1a1 c4c3 g5f4 d2d3 h4g4 f5e5 f2f3 f6e6 h6i7g6 d3c3 f5e4 b3b4 g6h7f6 c2b2 a1b1 c3b3 b1c2 b2c3 c2d2 c3d4 g7g8 f8e7 g3g4 b4c5 d3e4 c5d5 d2e2 c4d5 h8g8i9 d4e5 g5f4 d6e6 d2d3 d5e6 i9h9i8 e5f6 i8i7 e6f6 e3f4 e7f7 h5g5 g8g7 g3f3 g5h6 g4g5 i7i8 f2f3g3 f7g8 f4f5 h6g6 e6d6 f6g7 e3d3 e5f6 g3g4f3 b3c4 c3d4 c4d5 g5f4 d5e5 f3f4 f8g9 d6c5 e5e6 e2e3 e6f7 e3e4 g6h6 e6f6 g9g8 f6e5 h6g6 g5f5 i8h8 f5e4 f8f7 c5d5 i9i8 c2c3 i8h8 c4c5 f8f7 c5d5 h5h6 d5e5 h5i6 d3e4 i8i9 e4f4 i9h9 f3f4 h7g7 f4g5 i7h7 f6g6 h7i8 h6g6 i8i9 i6h5 h9g9 d4f6c4 f9f8 c4d5 h9g9 c3c4 g8h8 f5g6 i8i7 h5h6 h8g8 g5h6"],["hRpeIF7O","2026-09-18","julienaba","PST-Greedy-Tom","julienaba gagne","a1b2 i5h5 a2b3 i6h6 c2c3 a5b5 g7g8f6 c7c6 b2c3 b6b5 b1c2 c6c5 c1d2 c5c4 f7f6 c3c2 b2c3 g4f3 h7h9g7 h4g4 d5e5 h5h6 g8g9f7 g6h7 f7f6 f3g3 i9h8 i8i7 g7h8f7 i5i6 e5f6d5 c4c5 f7e6 b3b2 g8f8g7 i6i7 g7f7g6 h6h7 f4f5e4 b4b5 d3e4e3 c1b1 d2f4d3 c5c6 f5e4 b1b2a1 c2c3 b5c6 d3e4 h7h8 g6f6 c6d7c7 d4d5 d8e9 f6e6 b6a5 c4c5 a5a4 d6c5 a1a3b1 e6d5 a4a5 f5e4 b3a2 e5d4 a2a1 e4d3 b1b2 d3c3 b2b1 b4b3 a3a4 b3b2 e9d8 d4c3 a5a4 d5d6 d8e9 d6c5 a3b3 b1c2 a4a5 d3c3 i8h8h7 c3b3 h7h6 b2b3 g7h7 c5b5"],["i9fS6FKO","2026-09-18","PST-Greedy-Tom","julienaba","julienaba gagne","i9h8 c5c6d5 i8h7 b4b6c4 c3b3 a4a5b4 b1b2 b6c6 a2b2 h4g4 d2d3 h6g5 h9g8 i5h5 f6f7 c6d6 h8g7 i6h5 a1b2 e6d5 a2a1 b5c6 a1b1 c6c5 a3b4a4 e5d5 c1b1 h5g5 a5b6 c4d4 a1b1 b3c4 c1c2d1 g5f4 c1c2 c4c3 c1d1 d2e2 g8f7 d6d5 d1c1 g4g5 d2d1 g5f4 b1b2a1 f3e2 e1f2 c2d2 c1b1 f2e2 a1a2b2 e3d3 b1b2a1 d3c3 a4b4 e2d2 g7f7 d2c2 b6c6 c2c3 c6d7 d4c4 d7e7 c3b2 g6g5 c4b4"],["NIT1vHjZ","2026-09-18","julienaba","PST-Greedy-Tom","julienaba gagne","c2c3d3 a5b6 b1b3c2 c5c7d5 h7g7g6 g4g5f4 i8g8h7 f5e5 a1a2b2 e5e6 b2c3 f4f3 b3c3 e6d5 c3d3 g3g4 f3e3f4 g4g5 i9h9h8 d7d6 d3e3 d6c5 d2e3 i5h5 g8g7 i7i8 g6h7 d4c3 e3f4 h5i5 f7g7 c5c4 h8h7 c3c2 h7h6 b4c5 g7g6 g4g3 f6f5 a4b4 g6h6 g3g4 i8i7 c1c2 h4g3 b4c4 e4f4 d5d6 h6h5"],["9JeHqs7m","2026-09-18","PST-Greedy-Tom","julienaba","julienaba gagne","a1b2 i5h5 a2b3 a5b5 g7g8f6 b5c5 b1b2 b6c6 d4c4 c6d6 h7h9g6 h4g4 i8i9h7 i6h5 h7g6 g4f4 h8g8 h6g5 b2b3 b6c6 c2c3 c6d6 c3c4 c7d7 h6h7 d7e7 h7g7 e4e5 f8e8g9 d4e5 h8g8 g5f4 f5g6 d2f4d3 g6h6 h5g5 c5c4 f3f4 h7i7 g7g6 a4b5 d5d6 d8e9 d7e7 f8g8 d3e3 h6h7 e4d4 e9f9 d4e5 h7i8 g5g6 i9i8 e5f6 i8i7 e6f7 i5i7h5 f5g6 h6i6 g6h7 b3c3 f6g7 g9f8 d6e7 g9f9 e7e8 h5h6 f7f8"],["lJdQmPNJ","2026-09-18","julienaba","PST-Greedy-Tom","julienaba gagne","a1b2 i5h5 a2b3 i6h6 c2c3 a5b5 b1c2 h6g5 i9h8 h4g4 h7g7 g4g5 g8f7 g5g6h6 h9g9g8 f5g6 e6f7d6 g6h7 f8e7 h6h7 h9g8 a3a4 c3c4 c7d8 e7d6 b6c7 c4c5 i8h7 b2b3 a4a3 d6c6 a3a2 c7b6 g6g7 c6c5 a2b2 c5c4 g7g8 f6f7e5 b2b1 b5b4 f4e4g5 d4c3 g8f8 b3b2"],["8NlmogtV","2026-09-18","julienaba","eobllor","eobllor gagne","a1b2 i5h5 i9h8 i6h6 h8g7 a5b5 a2b3 c5c6d6 h7g7 d7d6 f7f6 h6g6 f5e5 f4g5e4 c3c4 h4g4 h9g9 a4b5 g7g9f7 b5c6 c5d5 b4c5 f9g9 f4e4 f5e5 g4g5f4 b2b3 e4d4 c5d5 e8d7 g9f8 b5c5 f5e5 g6f5 b1c2 f4f5 d5e6 h5g5 b3c3 b4c4 a4b4 b5c6 b4b5 f6e5 f7e6 b6c6 c4d5 c3d4 f9e9 f6f7 g7f6 b3c3 b2b1 c3d4 b1c2 f6f7 f4e4 c6d6 c2d3 f9f8 d3d4 g6f6 f5e4 f6f5 i8h8 c4c3 h8g7 g8f7 c6c5 f5e5 b5a5b4 d7d6 c4c3 f7e6 c3c2 d6d5 d1d2e2 g5f5 c1c2 d8d7 a4a3 e8d7 a3b4 f5e5 c2d2 d6c5 d2e3 c5b4 f4g5f5 d7d6 e4f5 c6d6 g6h7 b4c4 h6g6 d5e5 g5g6 f8f7 h7i8h8 e4e5 e9f9 e7f7 h8h7 d6e6 i6h6h5 f5g6 i8i9h8 d4c4d5 h9h8 f7g7 h5g5g4 g7h7 h8g8g7 e5f6 e8f9e7 d5e6 g8f8 h7g7 d7d6 e6e7 g4f4 e7e8 f4e4 f6g7 e2e3 g7h8"],["wSPhiIBN","2026-09-18","SOLFAREMI","julienaba","julienaba gagne","a1b2 i5h5 a2b3 a5b5 c2c3 c6c7d6 b1c2 d7d6 g7g8f6 i6h6 f6f7e5 g4g5 i8h8 a4b5 c3c4 c7d7 h9g8 h4h5 h8g8 h6g6 f8e7 f5f6 g8f8 h5g5 c2d3 f5f6 f9e9 g5g6 b2b3c2 h7h8 i9i8 g8h8 h9g9 i8h8 g9f9 f6f7 e4e6f4 h8g8 c2d3 g8f7 c5c4 b4c5 c3d3 b5c5 c2d2 e8d7 b5b4 g6g7 d8e8 g8f8 c4b4c3 c6d6 c3d3 c5d5 b3c3 d6d5 c3c2 d5d4 f3e3 f8e8 f4e4 c4c3 c1d1 d7d6 d1e2 g7f7 d7c6 e7e8 c6c5 e8f9e7 c5c4 c2c3 c5d5 f5e5 e4d4 f7e6 b3b2 c3c4 c6d7 d8e8 d4d3 d5d6 d3d2 f8e8"],["6hfTNF1L","2026-09-18","PST-Greedy-Tom","eobllor","eobllor gagne","i9h8 a5b5 i8h7 a4b4 h7g6 i5h5 c2c3d3 g4g5f3 e5e4 b5c5 g6g7 i6h6 g9g8 f3f4 f7g7 c4d5 e4d4 c6c5 d3d4 b4c4 e4d3 c5c4 b2b3 d4e5 i9i8 f5e5 b3b4 c4d5 g8f8 f7g7 b4b5 h5h6 h9g8 g5h6 a1b1 f4f5 b5b4 f5e5 b4b5a3 e6d5 b1c2a1 g7f6 b2b3 f6e6 b3b4 e5e6 a2a3b2 e6d5 c1c2 d5c4 i8i9 e7d6 c2b2 c4b3 a3a4 c5d6b5 d3c2 c6b5 b6c7 b4a3 i9h9 a4a3"],["RbvFHPMs","2026-09-18","julienaba","PST-Greedy-Tom","julienaba gagne","a1b2 i5h5 a2b3 i6h6 g7g8f6 a5b6 h7h9g7 h6g6 g8f7 h4g4 g7f7 f5g6 i8i9h8 f4g5 h8h9g7 h7g6 b2c3 h6g5 g7f7 a4b5 g8f8 f4f5 c4d5 b5c6 f9f8 e8d7 g9f8 b6b5 b1c2 c5b4 f8e7 b4b3 d4c3 a3b4 e7d6 c7c6 f6e6 b6c7 d5d6 d8e8 f7e6 g4f4f3 c6d7 f9f8 c2c3 b5c6a5 e6d5 g8f8 d3c3 f8e8 c3b2 d8e8 c4b3 b6c6 b2b3c3 c6b6 c3c4 c7d8 d5d6 b6b5 d7c6 f8e8 a1a2 e8d8d7 a2a3"],["LkZg8brP","2026-09-18","eobllor","SOLFAREMI","eobllor gagne","a1b2 a5b5 a2b3 b6c6 b2c3 d6d5 c2c3 c6c7d6 b3c4 d6e6 i8h7 g4g5f4 c5d5 d4e4 g8g7 h5g4 h9h8 h5g4 c3d3 g4f4 d3e3 i5h4 e3f3 h4g4 h7g6 f2e2 g6h6 d3e3 c4d5 d2e3 d5e5 e2e3d2 e5f5 i5h4 h6h5 f4g4 g5f4 a4b4 i6i7h6 g4g5 h7h6 g5g6 f3f4 f7f8e7 h8g7 d2d3c2 g7f6 c2c3 f4e4 a4b5 f6e5 a1b2a2 d4d5 a2a3 e4e5 e8e9f8 f5e5 a3b4 b1c2 d7c7 e6d6 a5b5 d6c6 b5c5 c6d7 c7d8 e7e8 f9f8 c2c3 c6d6 c3c4 f7f8e6 c4c5 e5e6 c6d7 f9f8 c7d7 g6f6 e9e8 f8f7 e7d7 f6e5 b6c7 d4d5 c7d8"],["JiXBR00J","2026-09-18","eobllor","julienaba","eobllor gagne","a1b2 c5c6d5 a2b3 d6d5 i9h8 i5h5 i8h7 h5g5 c3c4 g4g5f3 h8g7 f3f4 b3c4 b5b4 c5d5 f4e4 d5c4 a5b5 c2b2 b4b6c5 a2b3 h6g5 b1b2 a4a3 b2b3 f4e4 a4b5 d7d6 b5c6 h4g4 g8g7 g3g4f3 d3e3 d6e6 c6d7d6 c3d3 e7d7 g6f6 g7g6 e4d4 h7g6 f6e6 h6g6 c6d6 e3e4 c7c6 b3c3 f3e3 f7e6 d6c6 d7d6 e7f7 g6h6 f4e3 i6h6 f7f6 e6d5 d2d3 b3c4 a3b4 c4d5 f7f6 c3c4 b6b5 d7e7 a2b2 f3g4 c6b5 g4g5 a4b5 g5h5 c6c5 f7e6 b4c5 f8f7 f4f5 c4d5 b3c4 e4e5 b5b4 d5e5 e8d7 h5h6 b4c5 h7g7 d7d6 g9f8 b4b3 g7g6 c7c6 g5f5 c6c5 f5e5 b5a5b4 f7e6 a2b2 e7d6 e3e4 c5b4 c3b3 c4b4 b2c2 f8f7 g8g7 h6g6g5 c2d3 g5g6 b3c4 b4a4c5 d2d3 g6g7 g9f8 g8f7 c4d4 d7d6 a3b3 e5d4 g4f4 b5c5 d2d3 d6e6 f4e4 b4c5 b3c4 d7e7 d3d4 c3d3 g6f5 g7f6 c3c4 c2c3 b2b3 c6d7 b3b4 e2e3 f5e4 f6f5 b4b5 e3f4 c2d3 c3d4 b5b4 f4g5 d3e4 f7f6 b4b5 d7e7 e4e3 d4e5 e3f4d3 f5f6 e4d4 f6f7 g6f6 f9f8 d6e6 e8f9 c5b5d6 g5h6 d4e4 f9f8 d3e4 g8g7 c4d5 g8g7 g4f4 i8h7 f4e4 f8e7 d3d4 f5f6 c4d5 h7g6 d4d5 g5f4 d5e6 f4f5 d6d7 f5f6"],["tF6fUtKp","2026-09-18","PST-Greedy-Tom","eobllor","eobllor gagne","i9h8 a5b5 i8h7 a4b4 h7g6 i5h5 c2c3d3 g4g5f3 e5e4 f3f4 h9g8 b5c5 g6g5 i6h6 e6f7e7 b6c6 b1c2 h6g6 a2b2 e6e5 b3b2 b4c5 f8g9e8 c4d5 d4c3 f4e4 f9e8 d6d5 d2c2 f5e4 b1b2 e4d4 b3a3 e6d5 a2a3 c5c6b4 a4a5 d5c5 g7g8f7 c5b5 d7d6 a5b5 h8g7 c2d2 d1e2 c5b4 g7f7 b5c5 b2c3b1 e5f6e4 b1c2b2 c5c4 c2b1 f5e4 f8e7 e4d3 e7d6 d2c2 d6c5 c2b2 a3a4 d4c3"],["3N2HKwFi","2026-09-18","SOLFAREMI","julienaba","julienaba gagne","a1b2 i5h5 b2c3 i6h6 a2b3 h6g6 c2c3 a5b5 b1c2 g4g5 g8g9f7 c5c7d6 b3c3 d6d8e6 d3d4e3 h5g5 c2c3d3 a4b5 d3d4 e5f6 i9h9 b5c6 d4d5 d8e8 c4d5d4 g5g6 h7i8h6 h8g7 d7d6 e7f8 i7h6 e8e7 h6g5 e7e6 h9h8 f8g8 i8h7 g9h9 h7h6 h4g4 g5f4 g8g7 e2d2 g5f5 d2c2 f5e5 b5a4 b6b5 a5a4 c6b5 a3b3 b4c5 b3c3 d5e6 f4e3 e6f6 i6h5 g6f6g5 h5h4 h6g5 h4h5 g7h8g6 g8g7 g6f5 b1b2 f5g5 b2c3 g5h5 d2c2 c5d6 f8g8 i5h5 g8g7 d6e7d5 e3d2 e6f6 b3c3 e3f4 i7i8 g6h7"],["vOlTGmoO","2026-09-18","julienaba","Reste8","julienaba gagne","a1b2 i5h5 i9h8 i6h6 h8g7 a5b5 a2b3 c5c6d6 h7g7 d7d6 f7f6 h4g4 f5e5 h5g5 g7g8f7 b4c5 f8f7 f4e4 b2b3 b6c6 c3d3 e7d6 f6e5 d6c5 f7e6 h6g6 e3f4 g4g5 f4f5 g7f7 d3d4 e4d3 b1c2 f7e7 f6e6 c3c4 f5f6 c6c5 c7c6 d7c7 f6e5 e4f5 d3c3 a4b4 d6d5 c7d7 c6d6 d7c6 a3b3 c6c5 c2d3 b6a5 f5f4 a5a4 i8h8 g6h7f6 c1c2 g5g6 b5c6 c3c4 e6d6 b2c3 e5d5 b6b5 c2d3 b3c4 c7c6 a4b5 e6d6 f6g7 d6c6 b4b5 d7c6 g7h8 c6b5 b6c6 a4b5 i9h8 c6c5 c1c2d1 b5c5 g6g7 d5d4 d1e2 f5f4 f2e1 c5c4 d7e7 b2c2 f7g8 d2e2"],["E7538XFg","2026-09-18","Reste8","PST-Greedy-Tom","Reste8 gagne","a1b2 i5h5 a2b3 i6h6 i9h9 a5b6 g7g9f6 g4g5 f8f7 h6g6 i8h8 h5g5 g8f7 h4h5 h8g8 c5c7d6 b1c2 d6d8e7 g8h9f8 e9d8 g9f8 d8e8 c3d4 d6c6 d4e5 h5g5 e7e6 h8i8 c5d5 e4f4 d5e5 i5h5i6 e5f6 b6b5 b1c2 b5b4 b1d3c1 b4a4c5 e3e4 b2b3c2 c1d2 c3b2 d2d3 c2d2 d3d4 g4f4g3 c4d4 i9h9 e3f4 i7i6 e6f7 c5c6d5 f6f5 f2e2 e4d4e3 d2d1 d3e3 d6e6 g5h6g4 d1e1 g4h5 e8f9 f3f4 f8e8 g8h8 b5c5 f4e4 e2f2 g3g4 e6d6 e3e4 d5c4 e4e5 e8f9d8 e5f5 i5h4 i6h6 h4g3 g5g4 c4c5 e6e7 e9d8 g7f7 c6c7b5 f5f6 e1e2 f8e8"],["RAk1vEa2","2026-09-18","PST-Greedy-Tom","Reste8","Reste8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 a5b6 d5c4 c5c7d5 i9h9 d5d7e5 g7g8f7 h6g6 h9g9 h4g4 h8g8 g5f5 c2d3 g4h5g5 h7i8g7 b4b6c5 b1b2 a4b5 b2c2 c5c7d6 c2d2 d8c7 f7g7 c7d7 f8g8 d7e7 i7i6 f6g6 g8h9 f4e4 c4d4 e7f7 i7i8 i6h6 h9g9 e5f6 b3b4 b6c7 b4b5c5 c7d7 c6b5 f5g6 e9e8 h7g7 i9h9 e6e7 g9f9g8 f6f7 b5c5 d6e6 d2d3e2 d7e8 d5c5d6 g5g6 e2d2 g6g7 e4d4 f7g8"],["1hs5qeXU","2026-09-18","Reste8","PST-Greedy-Tom","Reste8 gagne","a1b2 i5h5 a2b3 i6h6 i9h9 a5b6 h7g7 h6g5 i8i9 h4h5 h9g8 c5c7d5 c2c3d2 b4b6c5 c4d4 c5d6 i9h8 c7d7 h8g7 d7e7 d4e5 f4g5 e4e5 f5g6 i8i9 e8f8 e5f5 h8i8 i9h8 i8i7 h8g7 d6c6c5 b1b3c2 i7h6 c2d3 i6h6 d3e4 h7h6 g8g7 g3g4f2 c3c4d3 f2f4e1 g7g6 e1f2 d4e5 h6i6 g9g8 i8h8 d2d3 e3e2 d4e5 h8i8 d3e4e3 i6h6 f4f5 f8e8 e7e6 e2f3 g4f4 f2g3 f6f5 e1f2d1 e3f3 h5h6i5 g3g4 i9h8 e4f4 a4b4 f3g4 i6i7 g5h5 d1e2d2 g8f7 c4c3 g4h5g5 i7i8 f4f5 h8h9 e5f6 i9h9 g5g6 h9g9 g6g7 i8i7 f5f6 f9e8 g9f8 d7c7 h8g8 e9d8 g7f7 d8c7 f8e7 a3b4b3 f7e6 c3b3c2 e8d7 b6b5 d7c6 a4b4 d4d5 c2a2d3 e7d7 i7i6 c5b5"],["nZG329cf","2026-09-18","PST-Greedy-Tom","Reste8","Reste8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 a5b6 d5c4 b6c6 i9h9 b4c5 b1c2 a4a5 b2c2 d6e7d5 c4b4 h5g5 h9h8 h4g4 i8i7 c6c7d6 b3b4a3 b5a5c6 a4a3 c6d6 h6h7 h5h4 c3d4b3 f4f5 h9i9 d7d6 i7i8 h4g4 d3c3 f4e4 i8i7 b6c6 a2b3a1 e4d4 b4b3 g5f5f4 d2c1 g4e4f3 i7i8 f7f6 g9f8 e6e5 g8g7 f5e4 b1b2 g5f4 h7i8h6 f4e3 g7i9f7 c2d2 c1b1 c6c5 b3a2 e5d4 g8h9g7 f6f5 c2c1 e2d2 c1d1 e4d3 a1a2 d5c5 d1e2 e3d3 f8f7 f5e4 a4a3 e4d4 h6g6 d6d5 a3a4 c5b5 a1a2 d3c3 h8g7 a5b5 e5f6e4 b4c4 a4b4 f3e3 f4f5 d2c2 e6e7 e3e4 f6f5 d5c5 f4g5 e4d4 g7e7f6 a3b4 g5g6h5 e5d5 h5h6g5 d6c5 g6f6h7 b3b4 e2e1 c3b2 h7g7h8 d5c4 e6f6 d4c3 g8g7 b2c3 g7g8 c2b2 g5f5 d4c4"],["OC6yvZs8","2026-09-18","Reste8","PST-Greedy-Tom","Reste8 gagne","a1b2 i5h5 a2b3 i6h6 i9h9 a5b6 h9g8 h6g5 h8g7 f4g5 h7g7 h6g6 g8g9f8 h4g4 e7e6 c5b5 g7f7 a5b5 b3c4 f5g6 i8h8 f6g6 f9f8 b6c6 d4d5 h6h7 h9g8 g4g5 b2c3 d7d8 d4e5 h7h8i7 d6e6 c6c7d6 f8f7 g5f4 c3c4d3 f4f3 g6f6 c6d7b6 b1c2 d8c7 g8f8 a4a3 e6e5 e2f3f2 d3e3 g3g4 f7f6 f2e1 d4e4 h4h5i5 e4f5 c7c6 d6f8e6 h6h7 e3e4 i8i9h8 g6g7 h9h8 e4f5 i6i7 g4f4 h7h6 c2d3 c5c6d6 d5e5 h5h4 f3g4 i5h5 e5f5 h4g3 g6g5 b4b5c5 g3g4 d6d7e7 f6g7 i8h7 f5g6 b6c6 g9h9 i8i7 f7f6 e8e7 d3e3 i7i8 e3e4 i6i7 e6f6 d6d5 e4f4 e8e7 e5f5 d5e6d4 g8h8 e1e2 f6g6 a5b5 g7h8 c5c6d5 g4g5 a3b3 f4g5 b3c4 f5g5"],["euibBC6m","2026-09-18","PST-Greedy-Tom","Reste8","Reste8 gagne","a1b2 i5h5 a2b3 a5b6 i9h9 b4c5 b3c3 i6h6 b1c2 h5g5 h9h8 h4g4 c4d4 h4g4g3 f4e3 g3f3g4 b2b3 b6c6 g7f7 f4f5 g8f7 f5f6 e6e7 f6f7 f9e8 c6d6 c2d2 g4g6f4 b3b2 f4f5g5 h8h7 h4g4 h6i6 g4g5 e4f4 g5g6 g9f9 c7c6 f9e9 g7f7 e8d8 a4b5 e8f9 d6d7 d2e3 f8f7 f4g4 d5e5 g4h5g3 e7e6 h7h8 f7f6 e3d3d2 c5c6d5 f9e9f8 d8c7 f8f9 c7c6 e8e9 b5c6 f9g9 d7e8e7 g9h9 e7f7 h9i9 g8g7 h8h9 f8g8 b2d4a2 e6f7 i9i8 h9g8 b3c4b4 f5e5 b4b5a3 g5f4 d2c2d3 f7f6 i8h7 g7f6 d3c3c2 e6d5 i7h7i8 g8f7 a3b3 f7e6 b3b2 g6f5 c2c1 e3d3 b1c1 d5d4 d1e2 f5e4 i5h4 c4c3 g3f3 f4e3 e2f3 e5d4 a1a2 c5c6b4 a2a3 f6d6e5 f3f4 c1c2 e9e8 d2c2 i8h8h7 e3d3 i6h5 d4c4 a5b6 b3b4 a3b3 d3c3 h7i8 d5c5 g4f4 c3b2 e8d8 e5d4 f4e4f5 c2b1 e5f5 d4d3 g7h7 d3c3"],["TzsTIsl0","2026-09-18","Mahdit","SleepKnight8","SleepKnight8 gagne","c3d4 i5h5 b2c3 i6h6 a1b2 h6g6 d4e5 a5b5 c2c3d2 g4g5 e5d4 g5g6 g9f9 b5c5 d2d3 b6c6 d3d4 d7e7 h9h8 e6f6 i6i5 e5f6 i9h9 e7f7 d6e7 f7g8 e7d6 h9g8 b1b2 f7g7 b2b3 b6c7 i5i6 f6g6 i8i9 g7h8 b3b2 f5g5 b2b3 g5h6"],["EeyzopyX","2026-09-18","Reste8","PST-Greedy-Tom","Reste8 gagne","a1b2 i5h5 a2b3 i6h6 i9h9 a5b6 h7g7 h6g5 h8g7 h5g4 g9f8 h4g4 f6f8e5 e4f5 i8i9 h7h6 i9h9 b4c5 g7g9f6 b5c5 c2c3d2 f5e4 e7e6 g6h7 f8f7 h6h7 h9g8 b6c6 f7f6 f3e2 b1b2c2 h7i8 g8g7 g4g5h4 d2d3 e3d2 b3c4 f7f8 e5f6 i9h9 g6f6 b6b5 h8g7 a4a5 d4d3 d1e1 e6e5 e1f2 e4e3 f2g3f3 f6f5 f2g3 d3e3 d7e7 e3e2 f8f7 g7f6 f7g7 e1d1 h5i5 d1e2 h4h5 e2f3 i6h6i7 g3g4 h7g7h6 c4d5 i5i6 c2c3d3 i6i7 d6e6 h6h7 f6e6g7 i6h6 d2d3e3 i8h8 e3f4 h9h8 e4f5 c5a5c4 d4e5 h8h9 f6g6 i6i5 f5g5 c6c7d6 h5h6 i7i6 i5h5 i9h9 e5d5f6 h9g9 f3f4 f9e8 e6f7 g9f9 g8h9 d6e7d5 g4h5 a4a5 f4g5 e6e7 f5g5 f9g9 f7g8 c4b4b3 f6g7 b3b2 g8h8"],["S3RsOM82","2026-09-18","PST-Greedy-Tom","Reste8","Reste8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 a5b6 d5c4 b6c6 i9h9 b4c5 b1c2 d6e7d5 b2b3 a4b5 g7g9f6 g4g5f3 f6f7g7 h6g6 g8g7 h5g5 h9g8 h4g4 f8g9 g4f4 d3c3 f4f5 a3b4 c7d7 c3c4 d7c7e8 d4c3 f7e6 b3b4 f5e5 b5c6 b6b5 a5a4 c4d5 b4a4b3 d5e6 h9h8 e4d4 d7c6 a4b4 a3b3 d4e5 h8h7 d6e6 i8h7 b4c5 g9f9 e7e6 i6i7 e8d8e7 i7h6 d6e6 h6g5 g6f5 c2c3 c5d5 i6h5 g7f6 c3c4 f5e5 b5a5b4 d7d6 c6c7 e7d6 a3a2 f3e3 i9h8 e3d3 a3a4 b3b4 h7i8 f7e6 h5g5 e6d5 g4g5 g8f7 i8h8h7 f6f7e6 g7g6 d5c5 a1b1 e4d3 b1b2 d4c3 c1d2 e7d7 g6h7f6 d3d4 f6g7f7 c3c4 a4a3 c2b2 a1b1 b4b3 d2e3 c4c5 f5e4 c5a5c4 f7g8g7 c7c6 f9e9 d7c6 f4g5 e5d4 g5h5 d4c3 h6i7 e6d6 i7i8 c5b5 h8h9 c6c5 e3e4f4 d6c5"],["TKFGviIj","2026-09-18","SleepKnight8","mbappe29","SleepKnight8 gagne","a1b2 i5h5 a2b3 a5b6 b3c4 i6h6 i9h8 g4g5 g8g9f7 b4c5 b2c3 a4b5 i8h8 g5g6 g9f8 f5g6 b1c2 h5h6 d4e5 d7d6 e5f6 h4h5 h8g7 i9h8 h9g9 h6g6 g9f8 b5c5 e7e6 g6h7 g7f7 i8h8 e8d7 b4b5 e7d6 b5c6 c3c4 c7d7 e6d6 h8g8 b6c6 g8f8 c4d4 d8e9 c6d6 h5g4 d6e6 h6h7 c5c4 b4c5 c4d4 h4g4h5 d3d4 d7e7 d5e5 h8g8 e5f5 g8f7 f4f5"],["lcAS0sVd","2026-09-18","Reste8","horstaut63","Reste8 gagne","a1b2 g5f4 a2b3 h5g5 b3c4 a5b5 i9h8 b6c6 f6g7e6 d6d5 c2c3 c6d7 h8g7 d5d4 h7g7 d7d6 g7f7g6 h6h7 g8h9g7 d4d3 b2c3 d3d2 i8h8 g5h6 e6f6 i6i7 g8f7 h7i8 e5f6e4 a4b5a5 e7f7 d2d3 f7g7 d1d2 c5d5 d2e3 c3c4 b4b3 b1c2 a5a4 c2c3 a4a3 d5c4 a3a2 c4b3 f4f3 g6f5 f3e2 b3c3 d6d5 f5f4 e2d1 d4e4 d1c1 c3d3 h4h5 h8h7 c2c3 d3e3 c3c4 e4f4"],["BhuahBTf","2026-09-18","PST-Greedy-Tom","Reste8","PST-Greedy-Tom gagne","a1b2 i5h5 a2b3 i6h6 b3c4 a5b6 d5c4 b4c5 i9h9 a4b5 b1c2 d7d6 g7g9f6 h6g6 b2c2 b5c5 f7e7 g5f5f4 h9h8 g4f4 h8h7 f4e4 h6h5 c6c5 c2d3 d6d5 d1d2e2 d3c3 a3b4 g6f5 b4c5b5 b3c4 f7e7 c7b6 a4b4 d4c4 a4a3 c3c4 a3a2 c4c5 c7d8 f6e5 d8e8 e4e5 f8e8g9 e5e6 e9f9 d4d5 h9f9h8 d5d6 h8g8 e6e7 h7i8g7 e7e8 h8g8 d8d7 e2e3 e9d8 g8f8 d5d6 f8e8"],["hBp0qG7w","2026-09-18","Reste8","PST-Greedy-Tom","Reste8 gagne","a1b2 i5h5 a2b3 i6h6 i9h9 a5b6 g7g9f6 g4g5 f8f7 h6g6 i8h8 h5g5 g8f7 h4h5 h8g8 c5c7d6 b1c2 d6d8e7 g8h9f8 e9d8 g9f8 d8e8 e5e6 e9f9 d3d4 f4g5 d6e7 a4b5 d4d5 f6e5 f8f7 c6b5 c2c3 b5a5 e8e7 g9f9f8 d6e6 i6h5 f7f6 a5b5 b2c3 e4e3 h7g6 a4b5 g8f7 c6c7 c4d4 h4g4g3 d5d4 d7c7d6 e7f7 h7i8 e6e5 f3g4 d4e4 h4i5 c5d5 d6b6e7 c3b3d4 b4b5c5 c4d5 f8e8g9 e4e5 d7c6 e7f8 e8f9d8 d4d3 i8i7 d3e4 c6c7d6 f8g8 g9f9 e6f6 i6i7 h6g6 i5i6 d5e5 i5h4 e3f3 g3f2 f5f4 h4i5 d2e3 e2d1 f2f3 h5h4 e4f4 d6c6 f3g4 i6i7 f5g5 i8h7 e3f4e4 f9e9f8 f6f7 f9e9 e4f5 c6d7d6 f8g8 b5c6 e6f7 e9e8 e5f6 d8d7 i5h5i6 e6d6e5 g4h5 d7d6 f7g7 e8e7 g8h8 c6b6 f5g5 e5f5 f6g7"],["zYNZJXAW","2026-09-18","PST-Greedy-Tom","Reste8","Reste8 gagne","i9h8 a5b5 i8h7 a4b4 h7g6 i5h4 f5g6 b5c5 b1b2 b6c6 c3b3 c6d6 a2a3 e5d5e4 b4b3 h6g5 a3b3 e6d6e5 f6f5 c4d5 a4b4 i6h5 h9h8 h5g4 h6g6 h4g3 c3c2 f2f3 c1d2 f3f4 f7g7 e2e3 i7h6 e3d3 c2c3 g4f4f3 h8i8 f3e3 b3b4 b6c6 a1a2 c6d6 b5c6 g3f3 d2c1 d6e6 i8h8 e6f6 i6i5 h6h5 i5h4 f3g4 h7i8 e4d4 a3a4 e3e4 b4b3 d3c3 a2a3 c3b3 g7f7 a3b4 a4a5b5 e5d5 a5b6 b3b4 f7f8e7 b6b5 b1b2c2 h5g5 e8d7 f6e5 c7d7 c5c4 c1d1 e4f5e3 h4h5 b5c5 c6d6 g5f4 b2a1 f4e3 i8h8 g6f5 g8f8 g4f3 h8g7 e3e2 d1e1 f3e3 e1d1 c2d3 e8d8 d3d2 g7f6 d1d2 h5h6 e2e3 h6h5 b3c4 f6f7g7 c3d4 d7d8e8 f6e6 g8g9 c4c5 c7d7 f5e4 e7g9f7 c1c2b1 a1a2 b1b2 a2a1 d2d4c2 g7f7 b4c5 d7e8 e3e5d2 h9g9 d2c2c1 f7g8f6 e7d6 f6g7g6 d3c2 g6g7 e6d6 f8g8 d5c5 h7h8 c6b5 e8f9e7 a4a5 e7f8e6 d6d5 f7g8 d4c4 g9g8 c2b2 e6f6 a5a4 f6g7 d5c5 g6g8f6 c1b1"],["mHf11RQq","2026-09-18","PST-Greedy-Tom","Reste8","Reste8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 a5b6 d5c4 b4c5 i9h9 a4b5 b1c2 b6c6 b2c2 b5c5 d4c3 d5e6e5 b2c3 c5d5 g7g9f7 g6f6 f7f9g7 h6g6 c2b2 c7d7 h9g8 f5f6 f8f9 d7e7 i7h6 e7f7 i7h6 e6f6 i6i5 d5e5 i8h8i9 d6c6e7 f9f8 d7d6 b3c4 e5e6 d2e3 f5e5 i9h9 f4f5 f9g9 f5e5 h9g9 h5h6 e3d3f4 h4h5 e4f4 h5h7i6 f4g4 i7i6 h4h5 d5e6 g4h5 e6f7 g5h5 g7h8 c5d5 i8h8 g9f9 g6f6 e8d8 d6e7d7 d8c7 d7e8 d5c5 e5e6 b2c3 e7e8 c7b6 e9e8 e5e4 e8e7 e4d3 g8f7 d3d4 h8h9g7 c3b3 e5g7e4 c5d5 g6g5 b6b5 e6g8f6 b3c3 d6f8e6 c4d4 g8g7 e4d4 g6g5 c4d4 f6f5 c3c4 f3f4 c4c3 e6f6 e4d4 g6f5 c4d5 f4e4f3 b5c5 e3e2 h5i6h6 e2f3 i7h6 f3g4g3 i5i6 h4h5 h7g6 f4g4 i6i5 h6h5 c5b5 g3h4"],["CCMtFjXR","2026-09-18","Reste8","PST-Greedy-Tom","Reste8 gagne","a1b2 i5h5 a2b3 i6h6 i9h9 a5b6 h7g7 h6g5 i8h8 h4h5 h8g7 h6g6 h9g9 h5g4 g7f7 c5b5 g8f7 f3g4 g9f8 c7d8 f8e7 g4f4 c3d4 a5b6 c2c3 c7d8d7 f7e7 c7d8 e5e6 h5h6 c3c4 c7b6 d6d7 a4a3 d8d7 g5f5 e8e7 b4a4 f9e8 h6g5 e8d7 g5g4 e7d6 b6c7 c5c6 f6g7 c7c6 e9f9 e5d4 f5g6e5 d6c5 g7g6 e6d6 g6g7 d6c6 f9f8 d5c4 e5g7d5 b5c5 a4b5 d7c6 e6f7f6 d5c5 e3e4d2 d4c3 d3d4 c6b5"],["K0HrCQNZ","2026-09-18","PST-Greedy-Tom","Reste8","Reste8 gagne","a1b2 i5h5 a2b3 a5b6 i9h9 c5c7d5 g7g9f6 i6h6 c2c3d2 h6g6 e6e7 b4b6c5 h7h9g7 c7c6 i8h8 c6d6 b1c2 h5g5 g8f8 a4b4 g7f7 c7c6 d2c1 b4c4 b3c3 c4d4 g9g8 g4g5 d3e3 e4e5 e9f9 d4c4 h8h9 c5d6 g9h9 g5g6 e8f9d8 h4h5 g9f9 g8f8 d8c7 c4d5 i9h9i8 g7f7 f3f4g4 h5h6 e3f4 d5e5 f4g4 e6f7 h8i9 f7g8 g4f3 e5f5 h4g4 g8h9g7 f3g4 g7g6 g3h4 g6h7 h4g3 c6d7 g3f3 h8h7 c7b6 d6f8e6 i9h8 d7f9d6 f3e3 h5h6 h9i9 g4g5 h4i5g4 f5g5 i8i7 g6g5 c1c3d2 d6e6 g3f2 e7f7 d3d4e4 e6f7 i5h4 h7h6 i7h7 f8f7 e5d4 f7f6 e3d3 i6i5 e4d4 g8f7 i9i8 f7g7 i7i8 g4h5 c4d4 f4g5 b2c2 f6g7 e9e8 f5g6"],["tD3wGAYC","2026-09-18","Reste8","PST-Greedy-Tom","Reste8 gagne","a1b2 i5h5 a2b3 i6h6 h7g7 a5b6 i8h8 h4h5 h9g9 c5c7d5 i9h8 h5g5 f7f8e6 d6d5 e7e6 e4f4 g7g9f7 g4f3 h8g7 h7h6 c3c4 h5i6 g7f6 f5g6 b1c2 a4a5 f8f7 f4g5g4 d3d4 b5b6c6 c2d3 b4a3 d3d4 d8e8 f9f8 d7d8 b2b3 c3c2 f6e5 c7b6 f8f7 c6c7 c3b3 b6c7 d5d4 c7d7 d3e4 h6g5 e4f5 i8h8 b3c4 d8c7 d4d5 d8c7 f7e7 e9f9 e5e6 e9f9 d7e8 h8h9 f9e8 b6c7b5 a3b3 c6b6 h7g6 h9g9h8 e8e7 a5a4 e5d5 b6c6 f6e6 a4a3 e4g6d4 h5g5 f6e5 c2d3 c3b3 b6c7 e7d7 g4g5h4 e6d6 h8g8g7 d7c6 f5f4 c6c5 h5i6h6 e5d4 f4g4 d4c3 f3e3 d5c4 g7h7 b4b3 h6h7g6 d6c5 g6g7h6 c7b6"],["1KVMvh1t","2026-09-18","PST-Greedy-Tom","Reste8","Reste8 gagne","i9h8 a5b5 i8h7 i5h4 a1b1 a4b4 c2c3d2 b4c4 c1d1 b6c6 d1d3c1 b5c5 b1c1 g3g5f3 g8h8 f3f4 c3b3 h4h6g3 g7h7 g3g4 g7f7g8 g6f6g7 f8g9 g5e5g6 a3b3 g4f4g5 g9h9 e6d5 a2b2 d4d6e4 h7h6 e5f6 g8g9 e4f5 i7h6 f5g6 i9h9 g7f7g8 h9g9 g6e6g7 f9e8 h8g8 d1d2 g8f8 d3c3 a3b4 g5h6g4 i6h6 h5h4 b4c4 b3c3 c4c6d5 c1d2 d6d5 b2c3 e7e8 c2c3 d8e8 h4g4g3 g7g8"],["VF0mKdj8","2026-09-18","Reste8","PST-Greedy-Tom","Reste8 gagne","a1b2 i5h5 a2b3 i6h6 i9h9 a5b6 g7g9f6 g4g5 f6f8e5 h6g6 h8g8 h4h5 h7i8h8 a4b5 h9g8 h5h6 g8f7 h6h7 h9g9 g7h8 c3d4 c7c6 b3c3 g6g7 b1c2 g7g8 c2d3 h7h6 f7e6 b6c7 f5e5 b5b4 e5d4 c6b5 d3c3 i9h8 e4d4 a3a2 f6f7 g5g7f4 c3d4 a4b5 e5d5 d7c6 b3b4 a5b6 a4b5 b6c7 b5c6 c7b6 d4e5 e9f9 e5e6 h6g6 c6d7 h8g8i9 b4c5 i9h8 d5d6 h8i9 c5d6 i9g9i8 e6f7 i8h8h7 f7g8 h7g7 h9g8 f5g6 g8f7 h7g6 b1b2 a2a3 b2b3 d5e5 e7e8 g7g6 e6d6d5 f4e3 c5b4"],["4RWFSco8","2026-09-18","PST-Greedy-Tom","ocj94","ocj94 gagne","i9h8 i5h5 i8h7 h5g5 h9h8 h4g4 f6g6 g4f4 i6h6 f4e4 f6f7 f5f6 h8h7 h4g4 h6g6 g4g5f4 g8f8 d4e5c4 b3c3 f5e5 a1b1 a4b4 a2b2 b4c5 g6h7g5 d6d5 d2c2 f4e4f3 h6g6 f3e3 c1d1 e6e5 e1f2 d3e3 h5h6 d5e5 a2b3 c3d4 c4b4 b6c6 g7h8h7 d5d4 b1c2c1 a5b5 d2e2 c6d6 f7e7 d6e6 h6g5 e4f5 i8h8 d5e5 b3b4 b6c6 b4a4 c5c6d5 c1d1 f5g5 i5h4 f6g6 a4b4 g6h6 h4g4 d3e4 d1e2c1 d5c4 e1f2d1 c4d4 g4g3 g5f4 c1c2 e3f3 h4i5 e5e4 c2c3 f4e3 d1e2e1 e4e3 e1d1 h7h6 b2c2 c1d2 c2c3 d2e2 h8i9 f2g3"],["NId121Tt","2026-09-18","SleepKnight8","PST-Greedy-Tom","SleepKnight8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 i9h8 g4g5 g8g9f7 h6g6 b2c3 c5c7d6 b1c2 d6d7e7 i8h8 d8d7 c2c3 a5a4 d3d4 g5g6 c3c4 g7g8 c6d6 d7e7 d6e6 f7g8 c5d5 i6h5 d5e5 h9g8 e5f5 g9f9 f5g5 g4g3 e6f6 g3h4 f6g6 h4g3 g5g6 g9f9 h8g8 d8d7 g8g7 b4b5c5 g5h5 c5c6d5 i5i6 a3b4 e8f8 g3f3 g8g7 e9e8 c4d4 b4a4c5 d4e4 d5b5d4 f8g8 e8e7 g8h8 f3e2 h8g7 d6e7 h5g5 e6e5 g5f5 b4c5 h6g5 d5c5e6 i6i7h5 d4c4d5 h6g6 c6b5 e4e5 e8d8 g6f6 c6c5 d6e7 g9g8 e5e6 d8c7 f8e7 g8f8 e8e7 e2d2 e7e6 f7f8e7 f4f5 f9e9 h5g5h6 d2c2 g6g7 d5c5 g8f7 c4c3 d5d6 d8e8 f5f6 f9e8 g7f6 c5a5c4 h6h7g6 c3d3 d6c6d5 a4b4 f4e4g5 e9e8 g6f6 b4c4 g7f6 c2e4c1 f5e4 c3c4 e4e5 e8d7 d4e5 d7d6 g7g8 c4b4 g8f7 c4b3 f4g5f5 b3b4 d4d5 e9d8 f6e5 d7c6 f8e7 b4b5 g6f6 b6c7 f6e6 c1d2 e6d6 c7d8d7 e5d5 e8d8 d5c5"],["BqDw1N7F","2026-09-18","PST-Greedy-Tom","SleepKnight8","SleepKnight8 gagne","a1b2 i6h6 a2b3 i5h5 b3c4 h6g6 c2c3 c6c7d6 b2c3 d6d7e6 e5d5 a5b6 c3c4 c7d7 c6b5 d7e7 c5b5d6 g4g5 d6c6 g5g6 g9f9 h4h5g4 h9h8 g5f5 h8h7 e6f6 i6h5 e7f7 a4b5 f5g6 d4c4 f7g7 c6b5 e5f6 h5g4 f6g7 f9e8 e2e3 g4g3 i7h6 g3f3 d3e4 a4b4 i8h7 e3d3 i9h8 d5c5 h8g7 d3d4 h6g6 b6b5 h7g7 d4c3 g7f6 b1b2 f7f6 c3c4 g6f5 b4c5 g8f7 f3f2 f4e4 b3b4 f7f6 e8d7 f6e5 b2a2 c3d4 a2b2 c4c3 b2a2 c3d3 a2b2 f4f5 b4c4 e3f4 b2b3 f4g5 d7d6 f6e5 c5b5b4 d2d3 a4b4 f4f5 b4b3 g5h6g6 b2c3 h7g7 c4d4 f5f6 d7c6 f8e7 b6b5 f7e6 c6b5 f6g7f7 b3a3 g8f8 e5f5 g6f6 f5e4 c2d2 c3d4 d2e3 f2f3 f4f5 d4d3 e3f4 f3e3 f6e6 e5d4 c6d7 a4b5 f5e5 e3d3 f4f5 b4b5 f5e5 b5c6 d5d6 c6b5 d6d7 a5b5 d8d7 e4d4 f7e6 b3b2 b4c4 b6b5 d6e6 c3d3 e7e6 e2e3f3 e4d4 a4a5 f6e5 a5b5 c3c4 a3b3 c4c5 c7b6 e6d6 b5b6a4 e8d7 f3f4e3 d7c6"],["KVXJ1iMM","2026-09-18","SleepKnight8","PST-Greedy-Tom","SleepKnight8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 i9h8 g4g5 g8g9f7 h6g6 i8h8 h5g5g4 h8g8 f4f5 f8e8e7 a4b5 e8e7 f5f6 b1c2 f6f7 h7h6 g6g7 b2c2 f7g8 c4d5 g7g8 d5e6 h9h8 c3d4 g4h5 c2d3 h8i8 d3e4 f9e9 f5f6 f9e9e8 d4e5 d7d6 g7g8 e8d7 h6g6 c7b6 d2e3 a5a4 e3e4f4 i8i7 f4g5 a4b4 e5f5 i5h4 g6g5 g3f2 f5f4 d8c7 f4g4 i7h7 g4g5 f2e2 g5g6 c7d8 g7f7 c7b6 h4h5g4 a5a4 g4g5f4 h7i8 f4f5e4 a4b4 d7e7 d6d5 g7f6 c6b5 g6f6g5 c3b3 g9g8 a4b4 f8f7 d5c5d6 g5g6 d6c6d5 g8g7 i8h8 g7f6 c3c4 e7f7 b6c6 g6f6 b4c5 e7f7 d6d5 h7g6 b6b5 g7f6 b4c5 g6f6 b6b5 d6e6 c6d6 f4e4 b4a3 e4d4 a4b5 f6e5 d8c7 b4c4 e2f3 g6f6 c7b6 c4d4 b2b3 c3d3 f3f2 d3e3 f2e1 f3e3e2 b6c6 e4e5 c6c5 e2d2e3 b3c4 d3e4 c4d5 f4f5 f8e8 h9g8 d6e7c6 g8f7 a3a2 f5e5 b5d7b6 g5g6f4 a5a4 e3d3 b6a5 d3c3 a5a4 c5d6 e1e2 d6e6 a3b4 g6f5 e8d8e7 f5e5 b5b6 e4e5 d7e8d8 d3d4 b4a3 c5e7c6 c7b6 d5f7c5 e9f9 d6c6 f9f8 c5d6 a4a5b4 d6d7 b4b5 e8d7 a4b4 f4e4 c4b4d5 e4d4e3 b3a3c4 e7d7 a2b2 d8c7 b4a4 c7b6"],["av3mpUUF","2026-09-18","PST-Greedy-Tom","SleepKnight8","SleepKnight8 gagne","i9h8 a4b4 i8h7 i5h4 a2b3 b5c5 b1b2 b6c6 c2c3 c6c7d7 b2b3 b6c6 c5b5 g3g5f3 c3c4 f3f4 c4c5 h4h6g3 c5c6 i6h5 a5b6 h5g4 h7g6 d7d6 a1a2 d6d5 h9h8 d4e5 h8g8 d8d7 b5c6 e8e7 g8f7 e7d6 d7e7 g3f3 h7g6 g4f4 e7f7 h7h6 b6b5 c2d3 i9i8 h6h5 f7e7 h5g4 b4b3 e3e4 f8e7 g4f4 c4c3 f6e5 a1a2 f3e3 b3b2 e5d4 a1b1 g5f4 c1b1 d4c3 a3a2 c3b2 b5c6 f5e4 a2a3 e4d3 i8h8 e3d3 g6h7g5 f4e4 c6d6 f6e5 c7d7 d3c3d4 h8g8 d2b2d3 a3a4 b1a1b2 d6e7 d3d4 d7c7 c3c4 c7d8 c6d6 g8g7 c4c5 d8e9 b2b3c3 f7g7 c3d4 g6g5 d4e5 h8h7 c5d5 g5h6 d5e5 g4h5g3 d6e6 e7d7 e6f6 i7h7 e5f6 h8h7 c6c5 g3h4f3 c4c5d5 f8e8 d5d6e5 h6h7i7 e6f6 i7i9h7 f7g7 h8g8 g5g6 g9f8 f5f6 i6i5 f7g8 e9e8 g8g7 e7f8f7 g5h5 d7c6 g7h7"],["B6nOQitN","2026-09-18","SOLFAREMI","SleepKnight8","SleepKnight8 gagne","a1b2 i5h5 g7g8f6 h5g5 f6f7e6 a5b5 e7e6 a4b4 b1c2 i6h6 d3d4 e4f5 h8h9g7 h6g6 b3c3 c6c5 c2d3 g4g5 g8g9f7 h4g4 f7e6 b4c5 a2b2 b3c3 f8f7 c3d3 c2b2c3 h7h8 c1c2 c5d6 c2c3 g4h5 e4e5 e3d3f4 b3b4 e8f8 e7f7 h7h6 b4c5 f8g8 c3c4 i8h8 d4c4 h8h7 b4c5 g8g9h8 g7g8 h8g7 f3e3 g7f6 e3d3 h7g7 d3c3 h9h8 i9h9 f8e8 g8h9f8 h5g4 g9f9 g4f4 f7e7 h8h7 d7d6 g7f6 e7d7 h7g7 d7d6 d2d3e2 f8e7 e8f8 f9e8 f8f7 b4c4 g6f5 c6d6 g4f4 d3c3 e2e3d2 b2b3 d2d3 b3b4 d3d4 d8e8 h6g5 b6c7 f5e5 c7d7 h7g6 b5a5c6 f4e4 d7d8 e4d4 d8e8 b4b3 e8e7 e4d4 c6b6d7 d4d5 f6e6 c6c5 c2d3 g6f5 c7c6 b4c4 c6d6 c5b4 a4b5 g7g6 b5c5 b4b3 d8e8 b2c3 f8g8 g5f4 c5d6 g6f5 c2d2 d7c6 d2e2 c6c5 e2f3 d3d4 f6e6 f5e4 d6e6 d3d4 f3g4 f4f5 g4g5 f5e4 g5g6 c6b6 d7e8 b6b5 f9g9 b5b4 g6f6 d3d4 d7e8 e3d3 f9g9 c6b5 h9h8 b5c6 h7g6 b4b3 g9f8 d3d4 g6f6 c6b6b5 f8e8 e4d3 h8g8 b2c2 f6f7 a5a4 g7f6 a4a3 f6e6 b4c4 c6d6 b5b4 f6e6 c5d5 e8e7 c3d4 c6d7 a3b3 f9g9 b4b3 g9g8 f5g6 d6e6 c2d3 f8g8 h6g5 d8e8 g5f4 f8f7 d5e5 e8f8 b3c4 d7e8 b2b3 g5h6 d3e4 g8g7 b3c3 e8f8 d3e4 h6h7 e3e4 i8i9 g6f5 i9h9 d3d4 h7g6 e4e5 e9f9 e7e6 g6h7 d6e6 h7g7 d4e5 e7f7 c3c4d3 e8e7 h7h6 e7f7 d3e3 g9f8 h6h5 e7f8 h5g4 g6h7 f3e3 g9f8 d3e4 e7f8 e4f5 f7g7 i7h6 h7g7 e6e5 i8h7 h6g6 h7g7 e4d4 e7e8 e3e4 e8e7 e4e5 g7f7 g4f4 e7f7 e4e5 g9f8 g6f5 i9h9 e4e5 h8h7 e5e6 h7g7 d7e8"],["OBVA8Pp9","2026-09-18","SleepKnight8","SOLFAREMI","SleepKnight8 gagne","a1b2 a5b5 b2c3 b5c5 i8h7 b4c5 b1c2 b6c6 i9h8 g4g5f3 c2d3 e6e5 a2b3 h4h6g3 c3d3 g4f4 b3c4 g3g4 h9h8 e6e5 e2f3 d4e4 g8g7 g3f2 b4c4 g4f4 h8g7 e3e4 h6h7 a4b5 c4d5 e4e5 h7h6 i6h5 d3e4 h5g4 h6g5 f3e3 f4g5 g4f4 f7f6 f2e1 h6g5 c6c5 e7f7 c5d6 h4h5 e1d1 g5h5 b5c5 i5h5 e7d6 f7g7 b4c4 h7g6 d6c5 e2e3 d2c2 e3e4 d1d2 g6f5 b1b2 g5f4 d2c2 g7h8f7 e7e8d6 g8g7 f3e2 f5f4 d6c5 h5g4 d1c1 d5e5 a2b3 e2d2 d7d6 e6f6 d6d5 g6f5 b1a1 d1d2 c2b2 f4e4 d5c5 e4d4 a2b3 f3g4f4 c1c2 g5g6 c2b2 g6f6 a4a5 d2e3 d6c6 e3e4 c6b5 d3d4 a4b5 g7f7 c6b5 g5f4 a3b3 d6d5 d2c2 f4f3 a4a3 f5e4 b5a4 e4d3 b2b3 f3e3f4 c5c4 f6e5 b2b3 c1d2 a5b5 b6c6 c2b2 b1c2 b5b6 e5d4 b4b3 b1c1 b2b3 c6d6 b6b5 c1c2 b5c5 e4d4"],["GMZ0dPsg","2026-09-18","SOLFAREMI","PST-Greedy-Tom","SOLFAREMI gagne","a1b2 i5h5 b2c3 i6h6 g7g8f6 b6b5 b1c2 a5a4 a2b2 a4b4 c2d3 c6c5 b2c2 g5f5 e2e3 e5f5 f6f7e5 h4h6i5 i9h8 g4g5 h9g8 f5f6 c2d3 i5i7h4 f7e6 c3b3c2 i8h8 b5c6 h8g8 b4a4 e3d3 c2b1 c3d4 h5i6 d4e5 i9h9 h7g7 h8h9i8 d3e4 h7h6 d5e5 i5h4 e5f5 h6i7 e6f6 i5h4 e8f8 h4g3 e4f5 e1e2 d2e3 a2a3b3 f8g8 i7i6 f5g5 f2f3 f6g7 g3g4 i5h5 b2a2 g7g6 g3f3 d3e4 i6i5 f7g8f6 b1b2 f5g5 f3e3 c4d4 a2b3 i5h5 d3c3 h8g7 e3d2 g4f4 e2d2d1 g5f5 b3c4 h7g7 c3b3 h5g5 b2b3 g6g7 b4c5 h6g6 d6c5 i9h8 c1d2 i8h8 c6d6 g6f5 a4b5 g7f7 d2e2 h8h9 e2d2 d3e4 b4b5 h9g9 d6d5 g9f8 d4d5 d7e7 b5b4 g7g8 d5c5 d3e3 b3c4b2 g5g6 d1d2c1 g8f7 c3b3 g7f6 d6c6d7 g9f8 c5b4 f8e7 b4b5a4 d4e5 d7c7e8 e7d6 a3b3 f7e6 a4a3 g7f6 a3b3 f6e5 b2b3a2 g6f5 c2d2 d6c5 d2d1 e5d4 c1b1d2 c5c4 a1a2 d5d4"],["GB10JX4h","2026-09-18","SleepKnight8","PST-Greedy-Tom","SleepKnight8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 b2c3 c5c7d6 i9h8 g4g5 g8g9f7 h6g6 c2c3 d8d7 i8h8 h5g5g4 h8g8 d7d6 d2d3e3 h4g4h5 f8e8e7 b4a4b3 g8h9f8 f4f5 f9e8 g5g6 b1c2 g6g7 h7g6 f5f6 f9e9 b3a3b2 c2c3d2 d4d5 d2d3 d6d7 c5d6 f6f7 g6f6 g9f9 e3d3 e9f9 c3c4 f8f7 c5d6 d8c7 d6e6 g7g9h7 d3e4 h7i7 d4e5 a5b5 e4f5 h9h8 e6e5 i8h8i9 e8e7 c7c6 c4d4 h5h4 f8e7 f9f8 d4e4 c6c5 f4f5 f8f9g8 h6g5 g8f8 e7f7 i7i6 f5f6 f9e8 g5g6 b5b4 e6f7 g9f9 e5f6 e8f9d8 f6g7 d5d4 i9h8 b2a2c3 f6f8e6 e9d8 g6g8f6 d8c7 h7h9g6 b6c7b5 e4e5 d4d5 f8e7 b4a4 g7f7 a4b5 e8f9f8 c6b5 g6g7 c7d8 g7f7 c7c6 d7d6 b5c6b6 g9g8 a3b3 g7f6 d3e3 f6e5 b2a2 e7e6 a1a2 e4d4 b3b4 e5d5 a2b3 f7e7 b4b3 e6d5 a2b2 d4c4 a3a2 d5c4 c2b2 c4b4 e3e4 c5b5"],["iEnnqMtw","2026-09-18","PST-Greedy-Tom","SleepKnight8","SleepKnight8 gagne","a1b2 i6h6 a2b3 i5h5 b3c4 a5b6 d5c4 h6g6 i9h9 c5c7d5 c2b2 d5d7e5 g7g8f7 b4b6c5 b1b2 c5c7d5 d4c4 d5e6 g8f8 e5e6 h9h8 e6f6 f8g9g8 e7e8 c3c4 d6d7e6 b4c5 g4h5 c5d6 g5g6 d6e7 f5f6 i8h8 h6g6g5 f8g8 g9f8 f9g9 f5g6 g9h9 g5g6 i8h7 e6f7 h7h8 e8f8 i8h7 h4h5g4 h7h6 f7g8 g6h6 g7g8 a2a3 g9h9"],["EDzZBO8y","2026-09-18","SleepKnight8","PST-Greedy-Tom","SleepKnight8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 b2c3 c5c7d6 i9h8 g4g5 g8g9f7 h6g6 i8h8 b5a5c6 c2c3 f5g6 h8g8 c6d7 f9f8 f5g6 d4e5 h7h8 e6f7 a4b4 e5f6 h4h5 h8g8 d8d7 d3d4e4 i9i8 e4e5 b6c6 c3d4 h5g4 h9g9 i7h6 f8f7 i8h7 d4e4 b4b3 b1c2 d7e7 c2d3 d5d6 d3e4 h7h6 g8g7 g3h4 f7f6 h5h6i6 c5d5 d6e7 g9g8 c6d7 d5d4 f3g4f2 f4g5f3 d7e8 e4g6e3 g3f2 f4f3 f9f8 e5g7f5 i8i7 f5g5 i6h6 f2f3 h6i6 e3f4 h4g3 g6g5 i5i6 f4g5 e7f8 f3g4"],["XjzHD7EY","2026-09-18","PST-Greedy-Tom","ocj94","ocj94 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 g4g5 i9h8 h6g6 c2c3 c6c7d6 b2c3 a5b6 e5e4 a4a5 e4d3 a5b6 c3c4 c7d7 d5c5 h5g5 c5b5 b4c5 c4b4 g5f5 b4b5 f6e6 b5a4 h4g4 h9g8 g6f5 d3c3 g4f4 c3d4c2 d8c7 a4a5b4 c6c5 b4b5a4 c4d5 g8g9f8 f4f5 f8g9 d7e7 h7h6 e4f5 h6h5 e5f6 i9i8 c7d7 i8i7 d6c5 a4b5 f5e5 a5a4 e5d5 b6c6 d5c5 b1d3b2 c5c4 a4a3 a5b5 a3b3 b5c5 d4e4 e6f6 i6h5 e7e8 g9f9g8 d7e8d6 f8g8 i8h7 i7i8 f6g7 i9h9 e7e8 h9g9 g6h7 g9f8 c4c5 c7d7 d5d6 f9g9 d6d7 g4h5f4 c6d7d6 g9f9 i8h7 f9f8 b4d6c4 g8g9 h7g6 b2c3c2 c4d5 c2d3 d5e6 h9g9 g6g7 i5h4 d8d7 g5g4 d7e8"],["O6eZtcZu","2026-09-18","ocj94","SOLFAREMI","ocj94 gagne","a1b2 a5b5 a2b3 b5c5 b2c3 c5d5 i8h7 b6c6 g8g7 g3g4f3 c4d4 d5d6e6 d4e4 h5g4 c3b3d4 e7e6 b1c2 g4g3 c4c3 f3e2 d4d3 e2f2 d3d2 e6e5 c2d2 g3i5f3 g7g6 g3f3 h9h8 f6e5 h8h7 e5d4 h7h6 a4b4 f2g3 e4e3 e1f2 f3e2 g3f3 e2e3 f2e2 d1c1 b2c2 c6c5 i9i8 c1b1 i8h7 b1b2 d2c2 a2b3 g6h6 c5c4 c1d1 b4b3 b1c1 c3c2 h6g5 c1c2 e2e3 b3c3 h4h5 c4c3 h7g6 b2b1 g4f4 e5d5 h5g5 d5c4 f3f4 c4b3 d1e2 a2b3a1 g5f5 a1b1 h6g6 c3b2 g3f3 e3d3 e2e3 d1d2 f4e4 a1b1 i6h6 c4b3 h6g5 b3a2 g5f4 a2b3 e6d5 b3c3 e5e4 b2c3 g3f3 b1c2a1 f3e3 b3a3b4 g6g5 d2e2 e5e4 e1f2 f4g5f3 g3h4 f3e2"],["S6Ito2cz","2026-09-18","PST-Greedy-Tom","ocj94","ocj94 gagne","i9h8 i5h5 i8h7 i6h5 f6g6 h5g5 g6h6 h4g4 i6h6 g5f5 h9g8 a4b4 a1b1 g4f4 g8h8 f4e4 h8g7 e5e4 c2d2 c6c5 c2d2 f3e3 c1d2 c5d5 h6h7 a5b5 d2e3 c4d4 g4g3 g5f4 b3c4 b6b5 b1b2c1 d5e5 d2e2 f4g4 g3f3 c3d3 g3h4 e5f5 f2e2e1 d4c3 c2d2 g4f4 d2e2 b5c5 f6f7e5 g5g4 e2d2 f4g4 g7g6 h5g4 d1c1 h4g4 b1c2 e4e3 e5d4 b4b3 c2d2 f2g3 d2d1 e1f2 h8g7 g4f4 d1e2 e3f4 c1d2 f2g3 d2e2 g3g4 h7g7 c5d5 g7f7 g6f6 f2e1 g5f4 e2f3f2 e3f3 e1f2d1 f5g5 g3f2 f4f3 h6h7 f2f3 h7i8g7 g5f4 g8f8 d3c3d2 a2a3 g4f4 c4b4c5 h4g4 e2e1 g4f3 g7g6 f3e2 a3b4 e3e2 f8e8 e1e2 f7e6 d1d2 e7e8d6 e4d4 a4b5 e3d3 b5c5 b2a2 c5d5 d3e4 c6c5 a2b3 h8g7 b3c4 f7e7 f6e6 c5c6b5 e6d6 b6a5 d4d5 d8e8 d7c6 a4a3 c2c3 g8g7 c5b5"],["7vhKhOMi","2026-09-18","ocj94","PST-Greedy-Tom","ocj94 gagne","a1b2 i5h5 a2b3 i6h6 i9h9 a5b6 c4c3 a4b4 b2c3 b6b5 g7g9f6 b5b4 b1c2 b3b4 h7h9g7 h4h5 i8h8 c7d7 f8f7 f4g5 c2d3 g6g5 g9g8 h7h6 c3d3 b2b3 d3d2 c5c6d5 c1d2 h4h5i5 f7e6 i6h5 d4e4 h4g3 e3f3 f2e1 f3g4 i6i7 e6f6 i8h7 f5g6 i6i7 g8h8 b4c5 f6g7 b3c4c3 g7h7 e1f2 d2e3 d7e7 i8h7 g3f2 e5e4 e1f2 f5f4 c3d4c2 f4f3 d5d6e5 e3f3 b5c5 h7h6 d3e3 f2g3"],["ZhuOjqlx","2026-09-18","vincent","PST-Greedy-Tom","vincent gagne","a1b2 i5h5 b2c3 i6h6 g7g8f6 b6b5 b1c2 a5a4 c2c3 g4f4 h7h9g7 h6g6 g8f7 h4g4 a2b2 b3b4 g7f7 b6c7 e7e6 a4b5 c2d3 g6h7 c3d4 i8h8 i9i8 h5g5h6 d4e5 g6h7 e5f6 i9i8 d3e4 h7h6 e4f5 i7h6 f5g6 h6g5 g6f6f5 a3b4 h7g7g6 c7b6 f5e5 a5b6 b2c3 c7d8 i8h8h7 b5c6 h7g7 e8d8f9 c3c4 c7d8 g7f7 c7b6 e5d5 e3f4e4 c6d7 f9f8 g6f6 a5a4 f6e6 e9f9 e6d6 b4a3 c6b5 g4g5f3 d5d6"],["k5P0VQPb","2026-09-18","PST-Greedy-Tom","SleepKnight8","SleepKnight8 gagne","a1b2 i6h6 a2b3 a5b5 i8h7 b5c5 b1b2 b6c6 d4c4 c6d6 i9h8 d6d5 f6g6 h4g4 g6h6 f4f5 i6h6 c5b5d6 h8h7 i5h4 h7h6 d6e6 i6h5 f3f4 h5h6i5 e6e5 g4f3 f6e5 b2b3 g3g4 i5i6h5 e5f5 i5i6 e4f4 i6h6 h4g3 g7g8h7 c3d4d3 f3e2 d3e4 i8h8 e4f5 i8h8 g4g5 b4c5 g5g6 f8g9e8 f6g7 i9h9 g6g7 e8f9e7 g9g8 h9g9 c6d6 f8g9e8 f4f5e4 a1b2 g3g4 e7e8d7 g4h5f4 h6h5 h7g6 a4b5a3 d6e6 f9e8 g7g8f6 a3b4 f7e7 b4c5 e4e5 e9d8 f4f5 c4b4 g6f5 e8d7 g5g6 d8c7 h8g7 d7d6 f7e6 c7d7 f5e4 c6b6b5 g6f5 c2b2 d3d4 a2b3 f8e7 a3a4 g7f7 c7c6 f6e6 d8e9 e5e6 a4b4 e4f5e5 e9f9 c6d7 b3c3 f6e6 b6b5 e8f9d8 b4b5a3 d8d7 a5a4 f4e4 d3c2 e9e8 a3b3 d7d6 a4b4 d6d5 d2c1 c5c6d6 e2f3 d6e6 a2a1 f7e6 c2c3 d7e7 d1e2 c5d5 e2d1 f5f4 b4b5 f4e4 b3b4a3 e7e8d6 d1e2 d6d7c5 a4b5 c5c4 a1b1 d5d4 e2f3f2 f7f6 b1b2 f5e4 c1d1 e6e5 a3b4 e3d3 b2a1 c4b3 a3b4 e5d4 d1e1 e4d3 c5c6 d4c3"],["X0UqZIsW","2026-09-18","SleepKnight8","PST-Greedy-Tom","SleepKnight8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 i9h8 g4g5 g8g9f7 h6g6 b2c3 c5c7d6 i8h8 b5a5c6 h8g8 c6d7 h7h8 f6g7 f9f8 g7h8 d4e5 h8i8 f8f7 f4g4 d5e5 i5h5i6 c2c4d2 i8i9h7 d2d3e3 h6h7 d4d3 h9h8 d3e4 h7h6 e6f6 i6h5 f7f6 g4g3 e5f6 i9h9 e4f5 i8i9 h6h7 h5i6 f6g7 h4g3 i9h8 f2f3e1 h7g6 e2d1 g5f4 d8d7 h9h8 b4a4c5 h8h7 i6i5 h7h6 d5b5d4 g8g7 e1d1f2 g7g6 g3f2 f5g5 d7e8e7 b1c2 d4c3 g6f6f5 e1d1 e5e4 c4c3 e4e3 f2f3 f5f4 f8e7 g4f3"],["nQpOjx8i","2026-09-18","PST-Greedy-Tom","vincent","vincent gagne","i9h8 i6h6 i8h7 h5g5 a2b3 a4b4 f6g6 c6c5 c1c2d2 b4c4 d2d3 b5b6c6 g6h6 c6c7d6 h7h6 d7d6 h6h5 e5d4 a1a2 c4d4 d2d3e2 g4g5 h4h5g3 b2c3 g4h4 c3d4 g3h4 d4e5 h8g8 g5g6 f8g9e8 e5f6 h4i5g4 f6g7 a2b3 g8g7 f9g9 f5g5 g9h9 g6g5 i9h9 g5g4 i6h6 g3g4 i5h4 d5d6e5 h9g9g8 e4e6f5 b3c3 f7f6 h4g3 f6f5 f2e2 g5g4 d2d3 f3f4 h6g6 a5b5 e3d3e4 c5b5d6 c3c4 c6d6 c5d5 f4f5 f8g8 e6f7 h9h8 g8g7 e4e5 f7g7 i7h6 f6g6 i6i5 g6g7 h8h9 i8h8 g5f4 h7h8 e2e3 h6h5 f4f3 g3h4"],["h1lEB9kN","2026-09-18","vincent","PST-Greedy-Tom","vincent gagne","a1b2 i5h5 a2b3 i6h6 i9h8 c5d6 h8g7 h4h5 h9g8 f5g6 g8h8 g6h7 f7g7 i7h6 b3c4 b5c6 c2c3 c6d7 c3c4 g4g5 b1b2 d6e7 b2b3 a5b6 c4c5 e7d7 c5c6 b5a5 b3b4 e8e7 b4b5 e7d7 c6b5 c7d7 d5c5 d7d6 c5b5"],["3EfzSOWO","2026-09-18","vincent","PST-Greedy-Tom","vincent gagne","a1b2 i5h5 b2c3 i6h6 i9h8 b6b5 b1c2 a5a4 h7g7 a4b4 c2d3 c4b3 d4f6c4 b5c5 b2c3 h6g6 d3d4 b3b4 g7f7 g4g5 i8h8i7 f6g6 c3d4 g5h6 g8h9f8 f5g6 d4e5 g6h7 e7f7 i7i6 g7g6 h6i7 g6h7 i6i7 f7f8g7 i7i8 e5f6 i8i7 g7h7 h4h5i5 f6e6f5 b5c6 f5e5 b5c6b6 e4e5d3 d6e7 d4c4 a2a3b2 c4b4 b6c6 g8h8 b3c3 i7i8"],["8lZekKOO","2026-09-18","PST-Greedy-Tom","SleepKnight8","SleepKnight8 gagne","i9h8 a4b4 i8h7 i5h5 a2b3 h5g5 h9h8 h4g4 f6g6 g4f4 a1b2 f4f5 d4c4 b6c6 c4b4 h5g5g4 a4b4 g4f4 c4c3 f6e5 b2b3 d5d4 b4b5 f5e4 b1a1b2 f4e4 c1d1 d6c6 b2b3 b6c6 b3b4a3 e4d4 a3a4 d4c4 i6h6 e5d5 a2b2 d6d5 b2a1 d4c3 f6g7e6 c3b2 h7g6 a1b2a2 h6g6 b3b4 a5b6 c4c5 f7e7 b4b5"],["9xFgzNg3","2026-09-18","SleepKnight8","PST-Greedy-Tom","SleepKnight8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 b2c3 c5c7d6 i9h8 g4g5 g8g9f7 h6g6 i8h8 b5a5c6 b1c2 d6d8e7 h8g8 d8d7 c2c3 f5g6 c3d4 e7d7 d4e5 h8h7 c5d6 b6b5 d6e6 h6i7 e8e7 i7i6 g7f7 c7c6 d7e7 g5f4 f8f7 i9h8 d5e5 i5h4 f7f6 h7h8 e5f5 i5i6 f6f5 f2e2 d3e3 g3g4 g6g5 i6i7 e6e7f6 i7i8 f7g8 g3f2 f5f4 i8h7 h9g8 h7i8 f2f3 e2d2 c4d5 e9e8 d5e5 i9i8 e5f6 i7i8h6 f7g7 h6g6 e3f4 h4g3 g5g4 i9i8 g8h8 i7i6 f3g4"],["lQDTmlds","2026-09-18","PST-Greedy-Tom","Chauphuocloc","PST-Greedy-Tom gagne","a1b2 h6g5 a2b3 i6h5 i8h7 i5h4 i9h8 c5c6 h9g8 a4b5 d4c4 a5b5 b2b3 b6c6 c4b4 d6c5 a3a2 c5b4 c3b3 b4c4 a4b5a5 c4b4 a3b3 g3h4 c3b3d4"],["5PPxq86l","2026-09-18","Chauphuocloc","Phuoclocchau","Chauphuocloc gagne","c3d4 g4g5f3 c2b2d3 h4g4 b1a1c2 i5h5 d4c4 i6i5 c2c3 i5h4 c3c4 h4i5 c4c5 i5h5 b2a2b1 f4f5e4 h9h8 e4f4 h8h7 e5f5 h7h6 f4g4 h6h5 g5h6 h4h5 f3e3 h5h6 e3e2 h6h7 e2e3 h7h8"],["2kxrqkB1","2026-09-18","Phuoclocchau","Chauphuocloc","Chauphuocloc gagne","c3d4 g4g5f3 d4c3 h5g5"],["NG8BCD34","2026-09-18","Chauphuocloc","vincent","vincent gagne","b3c3 i5h5 a2b2 i6h6 c3d3 h5g5 a1b2 h6g6 b1c2 g4g5 g8g9f8 a5b5 h8h9g8 g5g6 g9f9 g8f7 f8e8 f7g7 i7i6 g6h7 e8f9f8 f6g7 f8g9g8 h7h8 e9f9 g7h8 f9g9 h9h8 g8h9 a4b4 i6i7 b4c4 i7h6 c6c5 h6i7 c5c4 g9f8 c4c3"],["BKyLYgeM","2026-09-18","PST-Greedy-Tom","Phuoclocchau","PST-Greedy-Tom gagne","a1b2 h6g5 a2b3 i6h5 i8h7 f3e3 b3c3 e3f4 i9h8 h5g4 b1c2 h6h5 e4d4 g5g4 d4c4 f3f4e3 a4a3 e4d4 a3b3 d4d5 b2b3 c6d7 b3b4 d7e8 b4b5a3 e3f3 a3a4 f3g4 h9h8 g4g5 g6h6"],["sBeKgiXH","2026-09-18","vincent","PST-Greedy-Tom","vincent gagne","a1b2 i5h5 a2b3 i6h6 i9h8 c5d6 h8g7 h4h5 h9g8 f5g6 b3c4 i8i7 d4d5 g4g5 g8f7 c6d7c7 c2c3 a5a4 c3c4 c7d8 e6d6 b4b5 d6c6 g5g6 g9f8 a4b4 f6f8e6 b4b5 e6e7 b6b5 e5d5e6 a3b3 b1b2c2 b4a3 c2d3 i7h7 c5d5 h6h7 h9g9 g6g7 c4d5 g8g7 d5e6 h9g9 d6e7 g9f9 g8f8 b3a3b4 f7f8 h8i8 e7e8"],["uEwkuWpJ","2026-09-18","PST-Greedy-Tom","vincent","vincent gagne","a1b2 a4b4 a2b3 b5c5 i8h7 i6h6 f6f5 b4c5 b3c4 c6d6 i9h9 a5b6b5 f5e4 i5h5 g7g9f7 h6g5 f7e7 g6f5 e7f8d7 g4f4 f9e8 f6e5 e8d7 e5d4 c6b5 d4c3 b4a4b3 a1b2 c4d5 b2c3 b1d3c1 e5e4 e2d2e1 f5e4 b3b4 g5f4 h9h8 d3c3 h8h7 c3b3 h7h6 f4e3 h4h5 e4e3 e6d5 e3e2 h5h7g5 d4d3 d7e8 d3d2"],["emYo7D91","2026-09-18","vincent","PST-Greedy-Tom","vincent gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 i9h8 g4g5 g8g9f7 h6g6 e6f7d6 b4b5 f8e7 c7d8 b2c3 b5b4 h8g8 b4b3 c3d4 b3b2 d4e5 h4g4 e5f6 h5g5 c4c5 c7d8d7 d5d6 b6b5 d6d7 e5e4 i8h8 i9i8 g8h8 e4f5 d8d7 f5g6 c6d7 g4g5h5 c5c6 h5h6 e8d7 h7h8 c6b5 h6g6 e6e7 h9i9 d7e8"],["KM6vRJii","2026-09-18","SleepKnight8","Chauphuocloc","SleepKnight8 gagne","a1b2 g5g4 a2b3 h6g5 b3c4 i6h5 i9h8 i5h4 h8g7 g5f4 c2c3 h5g4 c3c4 e2f3 e5d5 h5g4 d5c5 f2e2 c4c5 h4g3 f6g7e6 f2e2 e6g8d6 c2d2 e7d6 f3e3 d6c5 g3f3 b4b5"],["sV3UFCnW","2026-09-18","PST-Greedy-Tom","vincent","vincent gagne","a1b2 i5h5 a2b3 i6h6 b3c4 h5g5 c2c3 c6c7d6 b2c3 g4g5 e5d5 g5g6 c5b5 b4c5 g9f9 h6g6 b5b4 a4b5 c3c4 b5c6 f9e9 c6d7c7 i9i8 d8c7 d5c5 a5b6 b4b5 c7d8 h9i9 e8d8e7 b6b5 d7e7 i7i6 e7f7 i6i7h5 f5g6 h6h5 e6d6e5 b4b3 e5f6 c5b5d6 f6g7"],["NR95c1iD","2026-09-18","Chauphuocloc","PST-Greedy-Tom","PST-Greedy-Tom gagne","c3b3 c5b4 h7i7 g5h6 g7h7 i5i6 g8h8 a5a4 c2b2 a3b4 b3a3 c5b4 h7h8g7 b6b5 a2b2 b5b4"],["BXB0kBHy","2026-09-18","vincent","PST-Greedy-Tom","vincent gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 i9h8 g4g5 g8g9f7 h6g6 e6f7d6 b4b5 f8e7 c7d8 b2c3 b5b4 b1c2 f6g7 c2d3 b3b4a2 c3c4 g7h8 c4c5 a3a5b3 d6c6 b4b5 e5d5 a2b3b2 c5b5 b2b3 a5b5 i9h8 e7d6 g7h8f7 d5d6 f7g8 d6d7 h9h8 d8d7 g8h8 d6c6 i8h8 c7c6 f5g6 c6c5 g8h8 d3c3 a3a4 e4d4 h7h6 d4c4"],["LJJrDkbq","2026-09-18","Phuoclocchau","Chauphuocloc","Chauphuocloc gagne","c3b3 g5g6 c2c3 c5c4 b1c1 c6c5 a1b1 c5b4 c1d2 a3b4 c3d4 c5b4 d4e4 a5a4 b3c3 a3a2 e4e5 b4a4b3 c3b2 b5b4 d2c2 b6b5 c2b2 b5b4 h7g7 b4b3 a1a2 c4b3 e5d5 b1a1 a3b4 a1b1 f7e7 b1b2 e7d6 b2b3 d6c6 b3b4"],["FlUoDlzL","2026-09-18","PST-Greedy-Tom","vincent","vincent gagne","i9h8 i5h5 i8h7 h5g5 h9h8 h4g4 f6g6 g4h5 g6h6 a5b5 i6h6 a4b4 g8g7 b4c4 b1c1 g4f4 a1b2 b6c6 b3c3 c4d5 c1c2 b5c6 b2b3 d7d6 a2b3 d6e6 b3c4 d4e5 h8h7 g8g7 h6h5 g7g6 i6h5 f7g7 g4h5 f3g4 d5e6d6 g5g4 i6h5 g3f3 d2c2 g7f6 h4i5 e3f4 g4h5g3 d4e4 h4i5h5 g6g5 b2b1 e5f5 i6h6 g5h5 i9h8 e4f5 h7h6 f6g6 i6i7 g3g4 i7i8 f3g4 b1c2 g4h5 i8h8 i6h6 c3c4d4 f4f5 d4d5c3 g5g6 h8g8i9 f6g7 i9h9 h8g8 d3c2 g6g7"],["aiYfuxVE","2026-09-18","vincent","PST-Greedy-Tom","vincent gagne","a1b2 i5h5 a2b3 i6h6 i9h8 c5d6 h8g7 h4h5 d4c4d5 h5h6 e5d5 f5g6 d5c5 h7h8 f6g7 g4g5 g8h8 h6h7 g9g8 c6c7 a5b5 b6c7c6 c3b3d4 c6c7 c2b2d3 c7d7 d3d4 d7e7 i8h8 g5g6 f8g9e8 h9g8 f9e8 d8e9 d6d7 g6h6 d8d7 h6h7 d6c5 h7h8 c5b4 a4a5 c3c4 g8f7 b5c5 e6f6 a3b4 f7e7g8 b4c5 g8f8 c5d6 g9f9 d7c7 e9e8 c7d8c6 i9h9 c4d5 f9e9 c6d7 f9g9 d5e6 h9h8 d4d5 f6f5 d5d6c5 h8g7 c6e8b6 h7g6 d8c7 i9i8 a5b6 e9e8 b6d8b5 e8e9 b5c6 i8h7 c6d7c7 f6g7 f7f8 h7i7 c7d8"],["84pmAjzQ","2026-09-18","PST-Greedy-Tom","Frasco","PST-Greedy-Tom gagne","a1b2 i5h5 a2b3 a5b5 g7g8f6 i6h6 c2c3 c6c7d6 b3c4 h5g5 f7f6 h4g4 i9h9 g4g5 d5c5"],["m99zV5oU","2026-09-18","SleepKnight8","PST-Greedy-Tom","SleepKnight8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 i9h8 g4g5 g8g9f7 h6g6 i8h8 h5g5g4 b2c3 f4f5 f8f9e7 f5g6 i8h8 g6g7 g9f8 f7g8 f8e7 b4b3 e5d5 c6b6 e6d5 a2b2 d4c3 a5b6 d6e7c6 a4b4 d5d6 c7d8 d6d7 f6g7 b5c5 g7h8 b1b2 b5a5 b2b3 a3a2 d5c4 i9h8 c5b5 b6c7 c2c3 c7b6 b3b4 a1b2 c4c5 g4f3 b6c7"],["WPJWJ2a8","2026-09-18","PST-Greedy-Tom","SleepKnight8","SleepKnight8 gagne","i9h8 a4b4 i8h7 i5h4 a2b3 b5c5 b1b2 b6c6 c2c3 c6c7d7 b2b3 b6c6 c5b5 g3g5f3 c3c4 h4h6g3 c4c5 c7d7 h9h8 f3f4 g6h6 g3g4 h7g7 f4f5 c5c6 d5e6 i6i7 d8d7 g8g9 g4g5 h8g8i9 e5e6 c7c6 f5f6 f9e9 g7f6 e8f9 d6e7 f9e9e8 e5e6 a5a4 e6e7 d8c7 d5e6 c7c6 e6f6 i6i7 g5h6 i9i8 d7e7 a4b5 e8f8 h9i9 g7g9h7 c6d7c7 e9e8 c7d8c6 f7f8g7 b4c5 g8h8 b5c6 f6g7 c5d6d5 g7h7"],["EhkRTVom","2026-09-18","SleepKnight8","PST-Greedy-Tom","SleepKnight8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 i9h8 g4g5 g8g9f7 h6g6 i8h8 h5g5g4 h8g8 f4f5 f8e8e7 a4b5 e8e7 f5f6 f9e8 g6g7 b1c2 f7g8 c4d5 g7g8 d5e6 h9h8 c3d4 b5c6 d4e5 d7e8 e5f6 g9f8 c2d3c3 c6c7d7 b2c3 c5c4 h7g7 c7b6 d6e7 e8d7 f6g7 g9f9 g7f7 c7c6 g8f7 b6b5 f7f8 a5b5 f9e8 c6d6 f8e8 b4c5 d7c7 e9f9 e5e6f6 f9g9 d8e8 d5d6 i9h8 b5b4 g7g8"],["oerF4inm","2026-09-18","PST-Greedy-Tom","kumsangir","kumsangir gagne","a1b2 a5b5 a2b3 a4b5 d4c4 d7d6 b2b3 d6c5 c2c3 a4b4 a3a2 b6c6 b5c5 i5h5 d4d5 g5f5 d6c5 a3a4 c5b4 f5e5 a2a3 d5c4 a2a3 i6h6 a3b4 h6g6 a4b4 f6e5 b4c4 h4g4 b5c5 g4f4 b4c5 e5d4 b1c2 f4e4 d5d6 d8c7 a5b5 e4d4 d6c5 a3b3 b4b5 c3b2 d7d6 c7d7 h9h8 c6c7 a4b5 c7d7 i9i8 a1b2 c2c1 c4c3 c1d1 d4d3 d1e1 b2c2 b6b5 b3c3 b4c5 f8f7 g8g7 h5g5 d6e7d5 d7d6 b5b4 f7f6 d5c4 c2d3 g7g6 g4f4 i7h7 c3d4 e6d5 d4e5 g5g6 e3e2 c6b5 g8f7 b5c5 e1e2 e5d4 g5f5 d4d5 d7e7 b4b5 e7e6 b5c5 f6e6 c5d5 h5g4 h6g6 g4f4 c4d5b4 e6d5 i9h9 e2e3 h8g7 c3d3 c6b5 f7e7 h7g7 f4e4 h9g8 e4d4 a4b5 f3e3 c6b6 c3c4 b6a5 c4c5 c7d7 d5d6 d8e9 d7c6 e9f9 c6b5 g8f7 c5b5 e6e5 d6e6 f6e5 c3d3 d4e5 a4b4 f9f8 b4c4 f6e5 g5f4 f8f7 b5a5c6 g6f6 b6c6 i8h7 c6d6 g6g7 d6e6 h6h7i7 e7d6 i8h8 d2e3 i7i8 f3g4 f7g8e7 g4g5 g8f7 c3c4 h8h9 c4b4 f5e4 b4c5 f8f7 c5d6 f6f7 f9e8 f8f7 e3f4 e5f6 e8e7 f6g7 g5g6 g9h9 g6g7 g9f9 f4f5 i9i8 f6g7 i9i8 g8h8 e4d3 i8h7 f7g8 g7h7"],["PYuhGdar","2026-09-18","kumsangir","PST-Greedy-Tom","kumsangir gagne","i9h8 a5b5 a1b2 a4b4 h8g7 h4h5 h9g8 i5i6 i8h8 i6h6 a2b2 d5c4 d2d3 b5b4 d3c3 a3b4 d4c3 g4g5 g8f7 g6g7 g9f8 b4c5 f8g9e8 e7f8 c3b2 i7h7 f9e8 h6h7 e8d7 h7h8 d7c6 c4c5 c7d7 f8f7 b1b2 d6c5 a3b3 b6c6 a2b3 c5d6 a1b2 d6e7 b3c4 e7f8 d5e5 i5h5h4 e6e5 b4a4b3 c2c3 h4g3 c3c4 c7d8 b2c3 g9f8 d7d6 h9g8 b5c5 d8e8 d5c4 a2b2 c3b3 g8f7 a3b4 b2b1 b4c5 g7f7 b3c3 e8e7 c4d4 g9f8 b4c4 h8g7 d4e4 h4h5 g5g4 b1c1 g3f3 h5h6 c3d4 c1c2 c6c5 c2c1 c5c4 c1d2 c2d3 d2c1 g4f3 h6h5 e2d2 c1b1 c4c3 b1a1 d7c6 a1a2 c6c5 a2a3 d2e3 h5i6 d3e4 f7f8g8 c2d3 a3a2 f3f4 f7e7 f6g6 i6i5 c3d4 e6f7 e3e4 i5h5 e4e5 g9g8 h6g5 e8f8 c5c4 d5d7c5 c4d4 c7b6 d3e4 h7h8 f5g5 f8f7 g4g5 g8f7 g5h5 f7e6 g7g6 b6c6 d4e5 c6d6 g5g6 d6e6 i6h6i7 g9h9 i7h7 a2b2 i5h5 e6d6 e7e6 d6c6 c4d4 d5c5 g7f7 g8g7 h7h6 c6d6 e7f7 f5f6 h5g5 h9g8 e3d3 b5c6 d3e4 h7h8 g5g6 g9h9 e4f5 f6f7 f5g6 f7f8 d4e5 d6c5 e5f6"],["pZPk7kDI","2026-09-18","PST-Greedy-Tom","kumsangir","kumsangir gagne","a1b2 i5h5 a2b3 a5b5 g7g8f6 i6h6 c2c3 c6c7d6 b3c4 b6b5 b2c3c2 d7e7 h7h9g7 b5b4 b1c2 h5g5 e4d4 g5f5 d4c4 f5e5 b5a5c6 b2b3 i8i9h7 e5d5 b6c7 e6d6 g9g8 g4f4 b6c7 c6b5 c4c3 c5b5 d8e8 b3c4 g8f7 a4b4 d3d2 a5b5 d2c2 h6g5 h7g6 h4g4 h8g8 c4d4 c7d8 e3e4 d8e8 c5d6 f5f6 b5c5 f8f7 f9f8 g9h9 g5f4 f5f6 d6e7 g7f7 b4c4 h9g9 e9d8 f6e6 d7d8c6 f9e8 c6c5 c2b2b1 c7c6 g9g8 f4e3 c1d1 c3d4 d6e7 d4e5 e7f8 e3e4 h8h9 e4e5 g9f8 g4f4 b1a1c2 f4e4 g6h6 c4b4 e7f8 b4c5 h9g8 c5d6 g9f9 f8e7 e9d8 c6c5 b2c2 c5c4 c1d1 g7f6 g8f7 b3c3 e1f2 e2e3 e8f9f8 e7d6 d7d8e7 c4d4 g9f8 f4e3 c1d1 d2d3 f7e6 c2d2 f8e7 a3b3 e7e8f7 b4b3 f7e6 a2b2 d7c6 b2c2 f2g3 e3e2 c6c5 c1d2 e6f7 d3d2 c3c4 d1d2 c6d7 d3e3 g3h4 e2f3 h4i5 d2e3 f7f8e6 e3e4 c4d5 f3g4 h6g5 e1e2 g5h6 e2e3 h6h7 e3f4 e8e7 g5h5"],["er8fj0zn","2026-09-18","SleepKnight8","PST-Greedy-Tom","SleepKnight8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 b2c3 c5c7d6 b1c2 g4g5 g8g9f7 h4h6i5 i9h8 g5g6 c4d5 d6d8c5 h8g8 a4b5 c3d4 f5g6f4 d4e5 i5i7h4 e5f6 b4c5 e6f6 c7d7 c2d3 g5g4 d3e4 c6d7 h7g7 d7e8 f6f7 c7d7 f9f8 h4h6i5 f7f6 f3g4g3 f4f5g4 g3f3 e4f4 h4h5 f6f5 f3e2 d5e5 h5h6 e7f8e6 d6e7 e5f6 h6h5 e6f6 i7h7 f7g7 i6h5 g7g6 i7i6 g6g5 e7d7e6 g8g7 e2d2 g7h8 a5b5 h8h7 b5c5 h7h6 d5e6 f5g5"],["S5ZnGn8Z","2026-09-18","vincent","SleepKnight8","vincent gagne","a1b2 a4b4 a2b3 b5c5 b2c3 i6h6 i8h7 i5h4 h7g6 a5b6 b3c4 h4i5 c4d4 c5c7d6 h9g8 d8d7 i9h9 b4c4 e4e5 d7d6 g8f7 c4d4 e6e5 d6e6 c3d3 h6g5 e5e4 i5h5i6 h8g7 g3g4 d3e4 e2f3f2 f7f6 e7e6 f6f5 e6e5 g6f5 g3g4 b1c2b2 d3d4 b2c3c2 g4g5 g8g9f7 i6h6 f7f8e6 h6g6 d6c6 g6f6 c6b6c5 b3c4 c2d2 g5g6 e2f3 h7g7 f3f4 g7f7 g4f4 f7e7 c7c6 e3f3 f4e4 e6d5 c6c5 e7f8e6 e4d4 f7e6 b3a3 c3c4 c6b5 f3e3 d4e4 d7e7 d3e4 h7g7 c1d2 e7e6 g6f5 d3d4 f6f5 f3g4 d2e3 c5d5 e4f4 f5e5 f4g4"],["OFB14kWI","2026-09-18","SleepKnight8","PST-Greedy-Tom","SleepKnight8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 b2c3 c5c7d6 i9h8 g4g5 g8g9f7 h6g6 i8h8 b5a5c6 h8g8 c6d7 c3d4 f5g6 d4e5 h8h7 f8f7 d7e8 b1c2 g6h7 g8g7 i9i8 c2d3 i8h8 e4f5 i8h8 d5e5 i7h6 g7g6 i5h4 d3e4 h5h6i5 c4d4 h4g3 f6f5 f2e1 d4e4 d8e8 e4f4 i5i6h5 e6f7f6 h6h5 g6g5 h4h5i5 g3g5h4 f9f8 f4f5 f8g9 f5f6g5 g8f8 h9g8 h8i9 h5h6 i6h5 h4g4 g9f8 f3g4 i6i7 g5h6 d6d7 e5f6 b6c7 g4h5f4 c7d8 f4f5 f9e8 h7g7 c7d8 f5f6 d8d7 f6g7 e9e8 h6i7h7 e8f9d8 h7g7 c7c6 i9h8 b4c5 g9h9 e9d8 h9h8 d8c7 i8h7 e1e2 g5f5 e7d6 g6g7 d7e7 e5e6 c7c6 h7g6 e8d7 h8g7 a4b5 f5e5 d7d6 g8f7 b5c6 f7e6 c6c5 c3d3 a2b3 g6g7 d7c6 e7e6 e2f2 d3e4 b6b5 g9g8 i5i6 g6f6 b4c5 g7g8 b6b5 e6e5 b3c4 f7g8g7 c6b5 e7f7 i6h5 f8g9g8 e6d6 f7f6 h5i6 e5e4 c6d6 f6f5 c4d5 g8g7 e6f7 h9h8 f7f8 h8h7 i6i5 h7h6 g8f8f7 g7g6 f7e7f6 f5g5 c5b4 f4f3"],["kqmkoScQ","2026-09-18","PST-Greedy-Tom","SleepKnight8","SleepKnight8 gagne","a1b2 i6h6 a2b3 i5h5 b3c4 a5b6 d5c4 h6g6 i9h9 c5c7d5 c2b2 h5g5 g7g9f7 b4b6c5 b3c4a3 c7c6 c3d4c2 h4g4 b1d3c1 c4d5 i8h8 c6c5 a2a3 a5b5 h7i8 c5d6 i8h8h7 g4f4 h7g7 e4e5 h9g9 c7d7 f8g8 d7e7 g8h9 e7f7 i7i6 e5e6 e8d8 d5d6 d8e8 e6e7 g9f9g8 d6e6 g8f8 g5f5 f8e8g9 e5e6 g9f9g8 f5f6 f9g9 d8e8 i8i9 e6e7 g9f9 f6f7 a3b3 e8f8 i8i7 f7g7 b3b4 h7h8 c1d2c2 g7h8"],["7THolDP0","2026-09-18","SleepKnight8","PST-Greedy-Tom","SleepKnight8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 i9h8 g4g5 g8g9f7 h6g6 b2c3 c5c7d6 i8h8 b5a5c6 h8g8 c6d7 f9f8 f5g6 i8h8 e8d7 b1c2 h4h5 h8g8 c6d7 h9h8 h5h6 d4e5 i9i8 c3d4 h6h7 e6f7 h7h8 f7g8 d7e8 d3d4 d7c6 e5f6 b4a4c5 h8g8 d8c7 h9g8 f9e9 f6f8e5 e9d8 g7g8f6 b6b5 f7f6 c7c6 f5e5 b5b4 f6f7 b4a3 f7e6 a2b2 e6d5 a2b2 c3b3 c6b6 c5e7b5 b6c7 b3d5b4 d8e9 c5b5 g6f5 a3b4 b2a2 c5c6"],["eS1PIcA5","2026-09-18","PST-Greedy-Tom","SleepKnight8","SleepKnight8 gagne","i9h8 a4b4 i8h7 i5h5 a2b3 b5c5 b1b2 b6c6 c2c3 c6c7d7 b2b3 d6d8e6 c5b5 b6c6 h7g6 h4g3 a5b5 g3g5f2 h9g8 h5h6g4 c3c4 c7d7 h8g8 d7d6 c6b5 g4f4 f8g8 i6h5 a4a3 f4e4 a4b5 e4d4 c6c5 h5g5g4 g8g7 g4f4 a3a2 f2f3e2 f7f6 e7e8f7 h8h7 e2d2 f6f5 f2e2 f4g4 d2e3c2 a1a2 e2e3 a3a4 e3d3 a3a2 b4b3 a4b4 f7e7 a1a2 d3c3 c5b4 f8e7 a3a4 e7d6 b5a5c6 d6c5 a2a1 d4c3 f5f6 a3b4 f3f4 a1b2 f6f5 b2b3a2 g4h5 a2a3 a5b6 b4c5 c4b4 a4b5 c7d7 d4d5 d8e9 e5e6 h5g4 e7e8 f4f5 e9e8 g4f4 c2c3 g5g4 c3c4 c7d8 d5d6 f6f5 e6d6"],["UGB2McIQ","2026-09-18","SleepKnight8","CyberShredder","SleepKnight8 gagne","a1b2 g4f4 a2b3 f4g5f5 b3c4 i5h5 i9h8 f5e5 c2c3 b6b5 b1b2c1 h4g4 i8h7 c6d6 g8g7 h5i6h4 g7g6 h4h5 h9h8 a4b5 h8h7 d6e6 c3c4 i5h4 g6g5 f2f3 c4c5 f3e3 h7h6"],["tTEV8BaQ","2026-09-18","SleepKnight8","PST-Greedy-Tom","SleepKnight8 gagne","a1b2 i5h5 a2b3 i6h6 b3c4 b6c7 i9h8 g4g5 g8g9f7 h6g6 i8h8 g5f4 b2c3 f4f5 f8f9e7 f5g6 i8h8 h4h5 f8e7 h5h6 g8h9f8 a5b5 f8e7 b4b3 c3c4 c7d8 b1c2b2 h8g8 g9f8 f6f7 f9e8 b5a5 e8d7 a5a4 d6d7 a4b4 d8d7 b4b3 c6d6 b3b2 d4e5 a2a3b3 d6e6 h6h8i7 c5b5d6 d5d4 c4d5 d4d3 c3c4 g8g9 c4d5 f8f9 f5f6 f9e9 d6e7 g8h9 d5e6 b2b4c3 e6f7 i7i9h6 e7d7e6 i6i7 e5f6 c4c5 e6f6 c5c6 f6g6 c3d4 g7h8"],["kzIVST0W","2026-09-18","PST-Greedy-Tom","SleepKnight8","SleepKnight8 gagne","i9h8 a4b4 i8h7 a5b5 h7g6 i5h4 f5g6 b5c5 b1b2 b6c6 c3b3 g3g5f3 g8f7 f3f4 a1b1 h4h6g3 h9g8 c6d6 a2a3 c4d5 h9h8 i6h5 h6i7 d6e6 i7h7 f4f5 f9g9 f5f6 h8g8 h5g5 f8g8 d5c5d4 h6h7 d4e5 g8h8 e5f6 h7i7 f5f6 i9i8 e7f8 f9e9 e6f7 i6i8h5 g3g4f3 a3b3 f4g5 b2b3 b6c6 b1c2 f6f5 b3c3 f5g5 d3e3 g3g4 f3e3f4 g5h5 f4e4f5 i5h5 f5e4 g5h6 h9i9 g4h5f4 e4f5 i7i6 e5f5 f7g7 f5g5 i5i6 g5g4 i6h6 i9i8 f8g8 g4g3 g7h7"]];
let PS_GAMES = PS_TOURNOI_YEARLY_2026.slice();   // le tournoi, visible par tous des l'ouverture

/* ═══════════════════════════════════════════════════════════════
   SUIVI EN DIRECT D'UNE PARTIE PLAYSTRATEGY
   Endpoints publics, verifies dans le code source de PlayStrategy
   (Mind-Sports-Games/lila) avant d'ecrire quoi que ce soit ici :

     GET /api/stream/game/:id  -- controllers.Api.actionStream, AUCUNE portee
     GET /api/tv/channels      -- controllers.Tv.channels, AUCUNE portee
   Aucun compte, aucun jeton necessaire pour ces deux-la (contrairement au
   defi contre un bot, ou a l'import qui exige une portee OAuth).

   Chaque ligne du flux est un JSON complet {"fen": "... p", "lm": "e5e6"} :
   PlayStrategy envoie la POSITION ENTIERE a chaque coup, pas une notation a
   rejouer. C'est volontairement le chemin le plus sur : pas de generateur de
   coups a interroger, pas d'ambiguite de notation (le vrai probleme qui a
   fait echouer le tout premier essai d'import de tournoi) -- juste decoder
   une FEN et poser les billes.

   Regle du FEN, relue dans Forsyth.scala/Pos.scala et deja verifiee sur les
   7705 demi-coups du tournoi importe : les cases se lisent dans l'ordre
   y de 8 a 0, x de 0 a 8, filtrees par la validite hexagonale (deja
   disponible ici via _psEstCase) -- P1 en MAJUSCULES, toujours au trait
   en premier.

   CE QUE JE N'AI PAS PU VERIFIER : si playstrategy.org autorise les
   requetes cross-origin depuis une page hebergee ailleurs (CORS). Mon
   environnement de developpement ne pouvait pas joindre leur serveur pour
   le tester en direct. D'ou la gestion d'erreur explicite ci-dessous :
   si la connexion echoue, le message le dit plutot que de rester muet. */
function _psDecoderFen(ligne){
  const parts = String(ligne || '').trim().split(/\s+/);
  const rangs = (parts[0] || '').split('/');
  const cases = [];
  for (let y = 8; y >= 0; y--) for (let x = 0; x <= 8; x++) if (_psEstCase(x, y)) cases.push([x, y]);
  if (rangs.reduce(function(n, r){ return n + Array.from(r).reduce(function(m, ch){ return m + (/\d/.test(ch) ? parseInt(ch, 10) : 1); }, 0); }, 0) !== cases.length) return null;
  const board2 = {}; let i = 0;
  for (const rang of rangs) for (const ch of rang) {
    if (/\d/.test(ch)) { i += parseInt(ch, 10); continue; }
    const rc = _psRc(_psNom(cases[i][0], cases[i][1])); if (!rc) return null;
    board2[akey(rc.r, rc.c)] = (ch === ch.toUpperCase()) ? 'black' : 'white';
    i++;
  }
  const trait = (parts[1] === 'b') ? 'black' : (parts[1] === 'w' ? 'white' : null);
  return { board: board2, trait: trait };
}

let _psLiveLecteur = null, _psLiveActive = false;
function psLiveArreter(){
  _psLiveActive = false;
  if (_psLiveLecteur) { try { _psLiveLecteur.cancel(); } catch(e){} _psLiveLecteur = null; }
  const b = document.getElementById('ps-live-statut');
  if (b) b.textContent = 'Déconnecté.';
}
async function psLiveDemarrer(){
  const input = document.getElementById('ps-live-id');
  const statut = document.getElementById('ps-live-statut');
  if (!input || !statut) return;
  let id = input.value.trim();
  const m = id.match(/playstrategy\.org\/([A-Za-z0-9]{8})/);
  if (m) id = m[1];
  if (!/^[A-Za-z0-9]{8}$/.test(id)) { statut.textContent = "Identifiant de partie invalide (8 caractères, ou colle l'adresse complète)."; return; }
  psLiveArreter(); _psLiveActive = true;
  statut.textContent = 'Connexion…';
  let resp;
  try {
    resp = await fetch('https://playstrategy.org/api/stream/game/' + id, { headers: { 'Accept': 'application/x-ndjson' } });
  } catch (e) {
    statut.textContent = "Connexion impossible depuis ce navigateur. PlayStrategy bloque peut-être les requêtes venant d'ici (CORS), ou le réseau est indisponible.";
    return;
  }
  if (!resp.ok) { statut.textContent = resp.status === 404 ? 'Partie introuvable.' : ('Erreur du serveur (' + resp.status + ').'); return; }
  statut.textContent = 'Connecté — en attente du prochain coup…';
  const lecteur = resp.body.getReader(); _psLiveLecteur = lecteur;
  const decodeur = new TextDecoder(); let reste = '';
  try {
    while (_psLiveActive) {
      const { value, done } = await lecteur.read();
      if (done) { if (_psLiveActive) statut.textContent = 'Partie terminée — flux fermé.'; break; }
      reste += decodeur.decode(value, { stream: true });
      const lignes = reste.split('\n'); reste = lignes.pop();
      for (const l of lignes) {
        if (!l.trim()) continue;
        let evt; try { evt = JSON.parse(l); } catch(e){ continue; }
        if (!evt || typeof evt.fen !== 'string') continue;
        const pos = _psDecoderFen(evt.fen);
        if (!pos) { statut.textContent = "Ce n'est pas une partie d'Abalone."; psLiveArreter(); return; }
        board = pos.board;
        const surl = new Set();
        if (evt.lm && evt.lm.length >= 4) {
          const rc1 = _psRc(evt.lm.slice(0,2)), rc2 = _psRc(evt.lm.slice(2,4));
          if (rc1) surl.add(gymKey(rc1.r, rc1.c)); if (rc2) surl.add(gymKey(rc2.r, rc2.c));
        }
        const carte = new Map(); Object.keys(board).forEach(function(k){ carte.set(k, board[k]); });
        gymRenderBoard('ps-live-board', carte, function(){}, surl);
        statut.textContent = 'En direct — trait aux ' + (pos.trait === 'black' ? 'noirs' : 'blancs') + '.';
      }
    }
  } catch (e) {
    if (_psLiveActive) statut.textContent = 'Connexion interrompue.';
  }
}
function openPSLiveModal(){
  if (document.getElementById('ps-live-modal')) { document.getElementById('ps-live-modal').style.display = 'flex'; return; }
  const modal = document.createElement('div');
  modal.id = 'ps-live-modal';
  modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;align-items:center;justify-content:center;padding:16px';
  modal.innerHTML =
    '<div style="background:var(--surface);border-radius:12px;padding:18px;max-width:420px;width:100%;max-height:90vh;overflow:auto">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">'
    + '<strong style="color:var(--white)">🔴 Suivre une partie en direct</strong>'
    + '<button type="button" onclick="psLiveArreter();document.getElementById(\'ps-live-modal\').style.display=\'none\'" style="background:none;border:none;color:var(--muted);font-size:20px;cursor:pointer">×</button></div>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:10px">Colle un lien de partie Abalone PlayStrategy (playstrategy.org/xxxxxxxx) ou son identifiant seul.</div>'
    + '<div style="display:flex;gap:6px;margin-bottom:10px">'
    + '<input type="text" id="ps-live-id" placeholder="playstrategy.org/xxxxxxxx" style="flex:1;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:13px">'
    + '<button type="button" onclick="psLiveDemarrer()" class="ctrl-btn" style="width:auto;padding:8px 12px">Suivre</button></div>'
    + '<div id="ps-live-statut" style="font-size:12px;color:var(--muted);min-height:16px;margin-bottom:10px"></div>'
    + '<div id="ps-live-board"></div>'
    + '<div style="font-size:11px;color:var(--muted);margin-top:10px">Lecture seule : on ne peut pas jouer depuis cette fenêtre.</div>'
    + '</div>';
  document.body.appendChild(modal);
}

/* Petit indicateur : le champion Abalone actuel sur PlayStrategy, si un
   canal Abalone existe. Un seul appel, pas de flux permanent. */
async function psChampionAbaloneActuel(){
  try {
    const r = await fetch('https://playstrategy.org/api/tv/channels');
    if (!r.ok) return null;
    const chans = await r.json();
    const c = chans && (chans.Abalone || chans.abalone);
    return c && c.user ? c.user.name : null;
  } catch (e) { return null; }
}
function openPSImportModal(){
  const m = document.getElementById('ps-import-modal');
  if (!m) return;
  m.style.display = 'flex';
  renderPSGamesList();   // le tournoi prechage s'affiche des l'ouverture
  const input = document.getElementById('ps-import-usernames');
  if (input) input.focus();
}
function closePSImportModal(){
  const m = document.getElementById('ps-import-modal');
  if (m) m.style.display = 'none';
}

/* Convertit un enregistrement ndjson PlayStrategy vers le format interne
   MIGS_GAMES : [id, date, joueur1, joueur2, resultat, coups]. La chaine de
   coups PlayStrategy doit etre CONVERTIE (psConvertirSequence) : ce n'est pas
   la meme notation, malgre l'apparence. Stockee telle quelle, aucune partie
   ne se rejouait au-dela du premier coup. */
function psGameToMigsFormat(record){
  if (!record || !record.variant || String(record.variant).toLowerCase() !== 'abalone') return null;
  const p1 = (record.players && record.players.p1 && record.players.p1.user && record.players.p1.user.name) || 'Anonyme';
  const p2 = (record.players && record.players.p2 && record.players.p2.user && record.players.p2.user.name) || 'Anonyme';
  const dateStr = record.createdAt ? new Date(record.createdAt).toISOString().slice(0,10) : '';
  let result = 'Partie terminée';
  if (record.status === 'draw') result = 'Nulle';
  else if (record.winner === 'p1') result = p1 + ' gagne';
  else if (record.winner === 'p2') result = p2 + ' gagne';
  const conv = psConvertirSequence((record.moves || '').trim());
  if (!conv.jetons.length) return null;
  // Conversion arretee en route (coup non verifiable) : la partie est gardee
  // jusque-la, et c'est dit, plutot que de rejouer une suite fausse.
  if (!conv.complet) result += ' (partielle : ' + conv.jetons.length + '/' + conv.total + ' coups)';
  return [record.id, dateStr, p1, p2, result, conv.jetons.join(' ')];
}

async function fetchPSGames(){
  const ta = document.getElementById('ps-import-usernames');
  const statusEl = document.getElementById('ps-import-status');
  const listEl = document.getElementById('ps-import-list');
  const raw = (ta && ta.value || '').trim();
  const usernames = raw.split(/[\n,]+/).map(function(s){ return s.trim(); }).filter(Boolean);
  // dédoublonne les pseudos eux-mêmes (au cas où le même serait tapé deux fois)
  const uniqueUsernames = [...new Set(usernames.map(function(u){ return u.toLowerCase(); }))]
    .map(function(lu){ return usernames.find(function(u){ return u.toLowerCase() === lu; }); });

  if (!uniqueUsernames.length) { if (statusEl) statusEl.textContent = 'Entre au moins un pseudo PlayStrategy.'; return; }
  if (listEl) listEl.innerHTML = '';

  // conserve les parties déjà récupérées lors d'un appel précédent (accumulation),
  // dédoublonnées par id de partie (une partie entre 2 joueurs de la liste
  // serait sinon comptée deux fois, une par pseudo).
  const byId = {};
  PS_GAMES.forEach(function(g){ byId[g[0]] = g; });

  let totalNew = 0;
  for (let i = 0; i < uniqueUsernames.length; i++) {
    const username = uniqueUsernames[i];
    if (statusEl) statusEl.textContent = '⏳ (' + (i+1) + '/' + uniqueUsernames.length + ') ' + username + '…';

    const url = 'https://playstrategy.org/api/games/user/' + encodeURIComponent(username)
      + '?perfType=abalone&max=100&moves=true&tags=false&opening=false';

    try {
      const resp = await fetch(url, { headers: { 'Accept': 'application/x-ndjson' } });
      if (!resp.ok) continue; // pseudo introuvable ou erreur -- on continue avec les autres
      const text = await resp.text();
      const lines = text.trim().split('\n').filter(function(l){ return l.trim(); });
      lines.forEach(function(line){
        try {
          const rec = JSON.parse(line);
          const g = psGameToMigsFormat(rec);
          if (g && !byId[g[0]]) { byId[g[0]] = g; totalNew++; }
        } catch(e){ /* ligne mal formee, ignoree */ }
      });
    } catch(e){ /* erreur reseau pour ce pseudo -- on continue */ }
  }

  PS_GAMES = Object.values(byId);
  if (statusEl) {
    statusEl.textContent = PS_GAMES.length
      ? '✅ ' + PS_GAMES.length + ' partie' + (PS_GAMES.length>1?'s':'') + ' au total (+' + totalNew + ' nouvelle' + (totalNew>1?'s':'') + ').'
      : '⚠️ Aucune partie Abalone trouvée pour ces pseudos.';
  }
  renderPSGamesList();
}

function exportPSGamesJSON(){
  const statusEl = document.getElementById('ps-import-status');
  if (!PS_GAMES.length) { if (statusEl) statusEl.textContent = 'Rien à exporter — récupère des parties d\'abord.'; return; }
  const blob = new Blob([JSON.stringify(PS_GAMES, null, 0)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ps_games_export_' + PS_GAMES.length + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (statusEl) statusEl.textContent = '📥 ' + PS_GAMES.length + ' partie' + (PS_GAMES.length>1?'s':'') + ' exportée' + (PS_GAMES.length>1?'s':'') + ' en JSON.';
}

function renderPSGamesList(){
  const listEl = document.getElementById('ps-import-list');
  if (!listEl) return;
  if (!PS_GAMES.length) { listEl.innerHTML = ''; return; }
  const nbTournoi = PS_GAMES.filter(function(g){ return PS_TOURNOI_YEARLY_2026.some(function(t){ return t[0] === g[0]; }); }).length;
  const entete = nbTournoi ? '<div style="font-size:12px;color:var(--muted);margin:4px 0 10px">🏆 <a href="https://playstrategy.org/tournament/rshUi5eV" target="_blank" rel="noopener" style="color:var(--gold)">Yearly Abalone Arena</a> — PlayStrategy, 18/09/2026 · ' + nbTournoi + ' parties vérifiées</div>' : '';
  listEl.innerHTML = entete + PS_GAMES.map(function(g, idx){
    const moveCount = _migsMoveCount(g[5]);
    return '<div onclick="loadPSGame(' + idx + ')" style="padding:10px 12px;border-radius:8px;cursor:pointer;border:1px solid var(--border);margin-bottom:6px;display:flex;justify-content:space-between;align-items:center" onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\'transparent\'">'
      + '<div><div style="font-size:13px;font-weight:600;color:var(--text)">' + escapeHtml(g[2]) + ' vs ' + escapeHtml(g[3]) + '</div>'
      + '<div style="font-size:11px;color:var(--muted)">' + escapeHtml(g[1]) + ' · ' + escapeHtml(g[4]) + ' · ' + moveCount + ' plis</div></div>'
      + '<span style="color:var(--gold);font-size:12px">▶</span>'
      + '</div>';
  }).join('');
}

// Charge une partie PlayStrategy importée (Belgian Daisy standard) en mode rejeu
function loadPSGame(idx){
  const g = PS_GAMES[idx]; if (!g) return;
  if (typeof showPage === 'function') showPage('game');
  currentLayout = 'belgian'; initBoardState(); CapturedByBlack.set(0); CapturedByWhite.set(0);
  _replaySeqToSnapshots(g[5], g[2] + ' vs ' + g[3] + ' (PlayStrategy)');
  closePSImportModal();
}

// Navigateur de parties
function openMigsBrowser(){ const m=document.getElementById('migs-modal'); if(!m)return; m.style.display='flex'; const s=document.getElementById('migs-search'); if(s){s.value='';} renderMigsList(); if(s) s.focus(); }
function closeMigsBrowser(){ const m=document.getElementById('migs-modal'); if(m)m.style.display='none'; }
function _migsMoveCount(seq){
  // Nombre de PLIS (demi-coups) : compte les tokens en retirant les préfixes "N." / "N.-"
  return String(seq||'').replace(/\d+\.-?/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}
function _migsPopulateVariantFilter(){
  const sel = document.getElementById('migs-filter-variant');
  if (!sel || sel.options.length > 1) return; // déjà rempli
  const variants = new Set();
  AO_GAMES.forEach(function(g){ if (g[4]) variants.add(g[4]); });
  variants.add('belgian'); // toutes les parties MIGS
  [...variants].sort().forEach(function(v){
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v.replace('_daisy',' daisy').replace(/_/g,' ');
    sel.appendChild(opt);
  });
}
function renderMigsList(){
  const q = (document.getElementById('migs-search')?.value || '').toLowerCase().trim();
  const variantFilter = document.getElementById('migs-filter-variant')?.value || '';
  const lengthFilter = document.getElementById('migs-filter-length')?.value || '';
  const list=document.getElementById('migs-list'); if(!list)return;
  if(!AO_GAMES.length && !MIGS_GAMES.length){
    list.innerHTML='<div style="padding:20px;text-align:center;color:var(--muted)">⏳ Chargement de la bibliothèque…</div>';
    ensureGameBanks().then(function(ok){
      if(ok){ _migsPopulateVariantFilter(); renderMigsList(); }
      else list.innerHTML='<div style="padding:20px;text-align:center;color:var(--muted)">Bibliothèque indisponible (navigateur trop ancien)</div>';
    });
    return;
  }
  _migsPopulateVariantFilter();
  function lengthMatches(seq){
    if (!lengthFilter) return true;
    const n = _migsMoveCount(seq);
    if (lengthFilter === 'short') return n < 20;
    if (lengthFilter === 'medium') return n >= 20 && n <= 40;
    if (lengthFilter === 'long') return n > 40;
    return true;
  }
  let html='', a=0, m=0;
  // Variété AbalOnline d'abord (autres variantes) — max 180
  if (!variantFilter || variantFilter !== 'belgian') {
    for(let i=0;i<AO_GAMES.length && a<180;i++){
      const g=AO_GAMES[i]; // [date,x,y,win,var,start,seq]
      if(q && (g[1]+' '+g[2]+' '+g[4]).toLowerCase().indexOf(q)===-1) continue;
      if(variantFilter && g[4]!==variantFilter) continue;
      if(!lengthMatches(g[6])) continue;
      const vl=g[4].replace('_daisy',' daisy');
      html+='<div onclick="loadAOGame('+i+')" onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\'\'" style="padding:9px 12px;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between;gap:10px;font-size:13px"><span>'+escapeHtml(g[1])+' <span style="color:var(--muted)">vs</span> '+escapeHtml(g[2])+'</span><span style="color:var(--gold);font-size:11px;white-space:nowrap">'+escapeHtml(vl)+' · '+escapeHtml(g[0])+'</span></div>';
      a++;
    }
  }
  // Parties Migs (belgian) — max 120
  if (!variantFilter || variantFilter === 'belgian') {
    for(let i=0;i<MIGS_GAMES.length && m<120;i++){
      const g=MIGS_GAMES[i]; // [n,date,b,w,res,seq]
      if(q && (g[2]+' '+g[3]+' belgian').toLowerCase().indexOf(q)===-1) continue;
      if(!lengthMatches(g[5])) continue;
      html+='<div onclick="loadMigsGame('+i+')" onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\'\'" style="padding:9px 12px;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between;gap:10px;font-size:13px"><span>'+escapeHtml(g[2])+' <span style="color:var(--muted)">vs</span> '+escapeHtml(g[3])+'</span><span style="color:var(--muted);font-size:11px;white-space:nowrap">belgian · '+escapeHtml(g[1])+'</span></div>';
      m++;
    }
  }
  list.innerHTML = html || '<div style="padding:20px;color:var(--muted);text-align:center">Aucune partie.</div>';
}

/* ═══════════════════════════════════════════
   OUTILS (style manuel, inverser camps, résoudre, diagramme ASCII, nav rejeu)
═══════════════════════════════════════════ */
// Affiche les métriques de la dernière recherche IA (renvoyées par le worker)
function updateAIMetrics(m){
  if(!m) return;
  const box = document.getElementById('ai-metrics'); if(box) box.style.display='block';
  const set = function(id,v){ const el=document.getElementById(id); if(el) el.textContent=v; };
  set('m-nodes', (m.nodes||0).toLocaleString('fr-FR'));
  set('m-depth', m.depth||0);
  set('m-time', (m.time||0)+' ms');
  set('m-tt', (m.ttHit||0)+' %');
  renderCandidateMoves(m.rootMoves, m);
}
// Convertit les scores des coups en pourcentages d'« optimalité » (softmax à température adaptative)
function moveOptimalityPercents(scores){
  if(!scores.length) return [];
  const max = Math.max.apply(null, scores), min = Math.min.apply(null, scores);
  const T = Math.max(1, (max - min) / 4);   // température adaptée à l'écart des scores
  const w = scores.map(function(s){ return Math.exp((s - max) / T); });
  const sum = w.reduce(function(a,b){ return a+b; }, 0) || 1;
  return w.map(function(x){ return x / sum; });
}
// Affiche la liste des coups candidats avec une barre + un %
function renderCandidateMoves(roots, metrics){
  const box = document.getElementById('m-moves'); if(!box) return;
  if(!roots || !roots.length){ box.innerHTML=''; return; }
  const m = metrics || {};
  const pcts = moveOptimalityPercents(roots.map(function(r){ return r.score; }));
  /* Le titre dit exactement ce que la liste est : les N premiers d’un total
     connu, a une profondeur connue. Sans ca, "Coups possibles" laissait
     croire a une liste exhaustive. Le "% optimal" garde son infobulle : ce
     n’est pas une probabilite, c’est un softmax de temperature arbitraire. */
  const cadre = (m.rootDepth ? ' · profondeur ' + m.rootDepth : '')
              + (m.rootTotal ? ' · ' + roots.length + ' sur ' + m.rootTotal + ' coups légaux' : '');
  let html = '<div style="color:var(--gold);font-weight:600;margin:8px 0 4px" title="Le pourcentage est un softmax des scores du moteur (température arbitraire, égale au quart de l’écart des scores) : un ordre de grandeur relatif, pas une probabilité de gain.">Coups possibles · % optimal' + cadre + '</div>';
  let menace = false;
  roots.forEach(function(r,i){
    let lab; try{ lab = moveToABAPRO(r.cells, r.dir, r.type); }catch(e){ lab = '?'; }
    const pct = Math.round(pcts[i]*100);
    const oe = r.oppEject|0; if(oe) menace = true;
    html += '<div style="display:flex;align-items:center;gap:6px;margin-top:3px">'
      + '<span style="width:70px;font-family:monospace;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + lab + (r.eject?' ✕':'') + '</span>'
      + '<div style="flex:1;height:8px;background:var(--surface);border-radius:4px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--gold)"></div></div>'
      + '<span style="width:34px;text-align:right;color:var(--text)">'+pct+'%</span>'
      + '<span style="width:16px;text-align:center;color:var(--red)" title="'+(oe? oe+' éjection(s) immédiate(s) pour l’adversaire après ce coup (vérifié à 1 coup)' : '')+'">'+(oe?'⚠':'')+'</span>'
      + '</div>';
  });
  if(menace) html += '<div style="color:var(--muted);font-size:11px;margin-top:5px">⚠ = l’adversaire dispose d’une éjection dès le coup suivant. Compté exactement à 1 coup, ce n’est pas une prévision.</div>';
  box.innerHTML = html;
}

// ── PANNEAU D'ANALYSE DÉTAILLÉE : métriques de la position pour Noir et Blanc ──
function computeAnalysis(){
  function forColor(c){
    let n=0, distSum=0, coh=0, iso=0, edge=0;
    for(const k in board){
      if(board[k]!==c) continue;
      const p=k.split(',').map(Number);
      const ax=rcToAxial(p[0],p[1]);
      const d=axHexDist(ax, EVAL_CENTER);
      n++; distSum+=d; if(d>=4) edge++;
      let allies=0;
      for(const dir of AX_DIRS){ const nb=axialToRc(ax.q+dir.q, ax.r+dir.r); if(nb && board[nb.r+','+nb.c]===c) allies++; }
      coh+=allies; if(allies===0) iso++;
    }
    const moves = getAllMovesForColor(c);
    const pushes = moves.filter(function(m){ return m.type==='push' && !m.eject; });
    const ejects = moves.filter(function(m){ return m.eject; });
    function cat(arr){ const o={}; arr.forEach(function(m){ const key=m.cells.length+'/'+(m.info.push||1); o[key]=(o[key]||0)+1; }); return o; }
    function fmtCat(o){ const ks=Object.keys(o).sort(); return ks.length? ks.map(function(k){ return k+'×'+o[k]; }).join('  ') : '—'; }
    return {
      marbles:n, score:(c==='black'?CapturedByBlack.get():CapturedByWhite.get()),
      distAvg:(n? distSum/n : 0), cohesion:coh, isolated:iso, edge:edge,
      threats:pushes.length, ejects:ejects.length,
      ejectCat:fmtCat(cat(ejects)), pushCat:fmtCat(cat(pushes)),
      evalScore: (typeof evaluateBoard==='function'? evaluateBoard(c) : 0)
    };
  }
  return { black:forColor('black'), white:forColor('white') };
}
function showAnalysisPanel(){
  const a = computeAnalysis(); const B=a.black, W=a.white;
  function row(label, bv, wv, betterHigher){
    let bb='', wb='';
    if(betterHigher!==null && bv!==wv){
      const bBetter = betterHigher ? (parseFloat(bv)>parseFloat(wv)) : (parseFloat(bv)<parseFloat(wv));
      if(bBetter) bb='color:var(--gold);font-weight:600'; else wb='color:var(--gold);font-weight:600';
    }
    return '<div style="display:flex;align-items:center;padding:4px 0;border-bottom:1px solid var(--border)">'
      + '<span style="width:64px;text-align:right;'+bb+'">'+bv+'</span>'
      + '<span style="flex:1;text-align:center;color:var(--muted);font-size:11px">'+label+'</span>'
      + '<span style="width:64px;'+wb+'">'+wv+'</span></div>';
  }
  const html =
    '<div style="display:flex;align-items:center;padding:2px 0 6px"><span style="width:64px;text-align:right;font-weight:600">⚫ Noir</span><span style="flex:1"></span><span style="width:64px;font-weight:600">⚪ Blanc</span></div>'
    + '<div style="color:var(--gold);font-size:11px;margin:6px 0 2px">MATÉRIEL</div>'
    + row('billes', B.marbles, W.marbles, true)
    + row('billes éjectées (score)', B.score, W.score, true)
    + '<div style="color:var(--gold);font-size:11px;margin:8px 0 2px">POSITION</div>'
    + row('dist. moy. au centre', B.distAvg.toFixed(2), W.distAvg.toFixed(2), false)
    + row('compacité (cohésion)', B.cohesion, W.cohesion, true)
    + row('billes isolées', B.isolated, W.isolated, false)
    + row('billes au bord', B.edge, W.edge, false)
    + '<div style="color:var(--gold);font-size:11px;margin:8px 0 2px">ATTAQUE</div>'
    + row('menaces (poussées)', B.threats, W.threats, true)
    + row('sumitos (att/déf)', B.pushCat, W.pushCat, null)
    + row('éjections possibles', B.ejects, W.ejects, true)
    + row('éjections (att/déf)', B.ejectCat, W.ejectCat, null)
    + '<div style="color:var(--gold);font-size:11px;margin:8px 0 2px">ÉVALUATION</div>'
    + row('score d\'éval', B.evalScore, W.evalScore, true);
  const pre = document.getElementById('analysis-body'); if(pre) pre.innerHTML = html;
  const m = document.getElementById('analysis-modal'); if(m) m.style.display='flex';
}
function closeAnalysisModal(){ const m=document.getElementById('analysis-modal'); if(m) m.style.display='none'; }
function refreshAnalysisIfOpen(){ const m=document.getElementById('analysis-modal'); if(m && m.style.display!=='none') showAnalysisPanel(); }

// ── ANALYSEUR DE PARTIE POST-MORTEM : compare chaque coup joué au meilleur coup du moteur ──
let _analysisRunning = false;
function classifyLoss(loss){
  // seuils calibrés sur l'échelle d'éval (~2000 pts = une bille)
  if(loss<=0)    return {tag:'✓ Meilleur',    cls:'#4a9463'};
  if(loss<=30)   return {tag:'Précis',         cls:'#6aaf6a'};
  if(loss<=120)  return {tag:'Correct',        cls:'var(--muted)'};
  if(loss<=600)  return {tag:'📉 Imprécision',  cls:'#e0a030'};
  if(loss<=1800) return {tag:'⚠️ Erreur',       cls:'#e07030'};
  return            {tag:'❌ Gaffe',           cls:'#e05c4b'};
}
function lossToPrecision(avgLoss){ return Math.round(100 * Math.exp(-avgLoss/500)); }

function analyzeGame(){
  if(_analysisRunning) return;
  if(typeof boardSnapshots==='undefined' || boardSnapshots.length<2){ showToast('⚠️ Joue ou charge une partie d\'abord'); return; }
  const worker = (typeof getAIWorker==='function') ? getAIWorker() : null;
  if(!worker){ showToast('⚠️ Worker indisponible pour l\'analyse'); return; }
  // Position initiale (depuis la variante courante)
  const init = { board:{}, cb:0, cw:0 };
  const L = (typeof LAYOUTS!=='undefined') ? (LAYOUTS[currentLayout]||LAYOUTS.standard) : null;
  if(L){ L.black.forEach(function(p){ init.board[p[0]+','+p[1]]='black'; }); L.white.forEach(function(p){ init.board[p[0]+','+p[1]]='white'; }); }
  // Construire la liste des positions à analyser
  const jobs=[];
  for(let m=0;m<boardSnapshots.length;m++){
    const snap=boardSnapshots[m];
    if(!snap.moveInfo || !snap.moveInfo.cells || !snap.moveInfo.dir) continue;
    const before = (m===0) ? init : { board:boardSnapshots[m-1].board, cb:boardSnapshots[m-1].capturedByBlack, cw:boardSnapshots[m-1].capturedByWhite };
    jobs.push({ index:m, board:before.board, cb:before.cb, cw:before.cw, color:snap.color,
      played:{cells:snap.moveInfo.cells, dir:snap.moveInfo.dir}, label:snap.label||'?',
      eject:!!(snap.moveInfo.ejection), type:snap.moveInfo.type });
  }
  if(!jobs.length){ showToast('⚠️ Aucun coup analysable (partie chargée sans détail des coups ?)'); return; }
  _analysisRunning=true;
  const results=[]; let i=0; const depth=3;
  openReportModal('<div style="text-align:center;padding:30px;color:var(--muted)">⏳ Analyse en cours…<br><span id="report-progress">0 / '+jobs.length+'</span></div>');
  const onMsg=function(e){
    if(!e.data || !e.data.analyze) return;
    results.push({ job:jobs[i], best:e.data.best, played:e.data.played, rank:e.data.rank, total:e.data.total, bestMove:e.data.bestMove });
    i++;
    const pg=document.getElementById('report-progress'); if(pg) pg.textContent=i+' / '+jobs.length;
    if(i<jobs.length) postJob(i);
    else { worker.removeEventListener('message', onMsg); _analysisRunning=false; renderGameReport(results); }
  };
  worker.addEventListener('message', onMsg);
  function postJob(k){ const j=jobs[k]; worker.postMessage({ analyze:true, index:j.index,
    board:JSON.parse(JSON.stringify(j.board)), capturedByBlack:j.cb, capturedByWhite:j.cw,
    color:j.color, depth:depth, played:j.played,
    weights:(typeof AI_WEIGHT_PRESETS!=='undefined'?AI_WEIGHT_PRESETS.balanced:undefined) }); }
  postJob(0);
}

