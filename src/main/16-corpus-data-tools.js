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
  gameOver=true;
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
let PS_GAMES = [];

function openPSImportModal(){
  const m = document.getElementById('ps-import-modal');
  if (!m) return;
  m.style.display = 'flex';
  const input = document.getElementById('ps-import-usernames');
  if (input) input.focus();
}
function closePSImportModal(){
  const m = document.getElementById('ps-import-modal');
  if (m) m.style.display = 'none';
}

/* Convertit un enregistrement ndjson PlayStrategy vers le format interne
   MIGS_GAMES : [id, date, joueur1, joueur2, resultat, coups]. La chaine
   de coups PlayStrategy (notation Aba-Pro, espacee) est utilisable telle
   quelle par _replaySeqToSnapshots() -- meme systeme de notation. */
function psGameToMigsFormat(record){
  if (!record || !record.variant || String(record.variant).toLowerCase() !== 'abalone') return null;
  const p1 = (record.players && record.players.p1 && record.players.p1.user && record.players.p1.user.name) || 'Anonyme';
  const p2 = (record.players && record.players.p2 && record.players.p2.user && record.players.p2.user.name) || 'Anonyme';
  const dateStr = record.createdAt ? new Date(record.createdAt).toISOString().slice(0,10) : '';
  let result = 'Partie terminée';
  if (record.status === 'draw') result = 'Nulle';
  else if (record.winner === 'p1') result = p1 + ' gagne';
  else if (record.winner === 'p2') result = p2 + ' gagne';
  const moves = (record.moves || '').trim();
  if (!moves) return null;
  return [record.id, dateStr, p1, p2, result, moves];
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
  listEl.innerHTML = PS_GAMES.map(function(g, idx){
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

