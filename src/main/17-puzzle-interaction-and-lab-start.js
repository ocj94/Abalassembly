;
let _puzzleActive=null;
function _pzSig(cells,dir){ return cells.map(function(x){return x.r+','+x.c;}).sort().join('|')+'>'+dir.q+','+dir.r; }
function openPuzzles(){
  if(!PUZZLES.length){ showToast('Aucun puzzle embarqué'); return; }
  let idx=parseInt(localStorage.getItem('abaPuzzleIdx')||'0',10);
  if(isNaN(idx)||idx<0||idx>=PUZZLES.length) idx=0;
  startPuzzle(idx);
}
/* Ouvre un puzzle sur le plateau de la partie depuis une autre page (defi du jour, probleme du
   mois). Avant (v2.57), showPage('game') demarrait d'abord une partie neuve : la partie en cours
   sauvegardee etait effacee (ou la fenetre « Reprendre ? » s'ouvrait par-dessus le puzzle), la
   pluie de billes tombait, et une minute plus tard « Partie annulée — aucun coup joué » renvoyait
   a l'accueil en plein puzzle. Le drapeau dit a la page de jeu de ne rien demarrer. */
var _puzzleOuverture = false;
function ouvrirPuzzleSurPlateau(idx){
  _puzzleOuverture = true;
  try { showPage('game'); } finally { _puzzleOuverture = false; }
  startPuzzle(idx);
}
/* Ferme le mode puzzle sans toucher au plateau (nouvelle partie, partie reprise, tournoi) :
   sinon chaque coup de la partie suivante etait compare a la solution du puzzle, et annule. */
function _puzzleFermer(){
  if(typeof _defiQuitter==='function') _defiQuitter();
  if(!_puzzleActive) return;
  _puzzleActive=null;
  const bar=document.getElementById('puzzle-bar'); if(bar) bar.style.display='none';
}
function startPuzzle(idx){
  const p=PUZZLES[idx]; if(!p) return;
  if(typeof botDuelMode!=='undefined' && botDuelMode && typeof stopBotDuel==='function') stopBotDuel();
  if(typeof _defiQuitter==='function') _defiQuitter();   // un autre puzzle : le defi en cours garde son temps
  if(typeof disarmInactivityCancel==='function') disarmInactivityCancel();   // un puzzle n'est pas une partie a annuler
  // Pose la position
  board={}; p.bm.forEach(function(k){board[k]='black';}); p.wm.forEach(function(k){board[k]='white';});
  CapturedByBlack.set(p.cb); CapturedByWhite.set(p.cw);
  GameOver.set(false); replayMode=false; selected=[]; undoStack=[]; boardSnapshots=[]; MoveCount.set(0);
  _replayStartBoard = JSON.parse(JSON.stringify(board));
  if (typeof _replayStartCaptures !== 'undefined') _replayStartCaptures = { b: p.cb || 0, w: p.cw || 0 };
  const _ml = document.getElementById('move-list'); if (_ml && typeof MOVE_LIST_HEADER !== 'undefined') _ml.innerHTML = MOVE_LIST_HEADER;
  if (typeof _majOngletsPartieBientot === 'function') _majOngletsPartieBientot();
  HumanColor.set(p.c); CurrentTurn.set(p.c); _bookNode=null; gameBestHint=null;
  const rb=document.getElementById('replay-btn'); if(rb) rb.style.display='none';
  _puzzleActive={ idx:idx, sig:_pzSig(p.sol.cells,p.sol.dir), alts:(p.alt||[]), tries:0 };
  localStorage.setItem('abaPuzzleIdx', String(idx));
  updateCaptures(); drawBoard(); updateStatus();
  const bar=document.getElementById('puzzle-bar'); if(bar) bar.style.display='flex';
  const t=document.getElementById('pz-title');
  if(t) t.textContent=(p.def?'🛡️':'🧩')+' Puzzle '+(idx+1)+'/'+PUZZLES.length+' · '+'⭐'.repeat(p.d)+' — '
        +(p.c==='black'?'Noirs':'Blancs')+(p.def?' jouent et parent la menace !':' jouent et éjectent !');
  showToast(p.def?('🛡️ Pare la menace d\'éjection ('+(p.c==='black'?'⚫ Noirs':'⚪ Blancs')+')')
               :('🧩 Trouve le meilleur coup ('+(p.c==='black'?'⚫ Noirs':'⚪ Blancs')+')'));
}
function checkPuzzleMove(){
  const pa=_puzzleActive; if(!pa) return;
  const snap=boardSnapshots[boardSnapshots.length-1];
  if(!snap || !snap.moveInfo){ return; }
  const played=_pzSig(snap.moveInfo.cells, snap.moveInfo.dir);
  const isDef=!!(PUZZLES[pa.idx]&&PUZZLES[pa.idx].def);
  const nDefi=(typeof _defiEnCours!=='undefined' && _defiEnCours && _defiEnCours.idx===pa.idx) ? _defiEnCours.n : 0;
  if(played===pa.sig || (pa.alts&&pa.alts.indexOf(played)!==-1)){
    _puzzleActive=null;
    const solved=parseInt(localStorage.getItem('abaPuzzleSolved')||'0',10)+1;
    localStorage.setItem('abaPuzzleSolved', String(solved));
    if (typeof checkMonthlyCompletion === 'function') checkMonthlyCompletion(pa.idx);
    if (typeof _defiSurPuzzle === 'function') _defiSurPuzzle(pa.idx, 'v');
    const t=document.getElementById('pz-title');
    if(t) t.textContent = nDefi ? _tr('✅ Défi du jour #'+nDefi+' trouvé !', '✅ Daily puzzle #'+nDefi+' solved!')
                                : '✅ Bravo ! Puzzle réussi ('+solved+' résolus) — ⏭ pour le suivant';
    showToast(isDef?'🛡️ Menace parée !':'✅ Coup gagnant trouvé !');
  } else {
    pa.tries++;
    if (typeof _defiSurPuzzle === 'function') _defiSurPuzzle(pa.idx, 'x');
    doUndo();
    showToast(pa.tries>=2 ? '❌ Raté — pense à 💡 Indice ou ✅ Solution'
      : (isDef?'❌ La menace demeure, réessaie':'❌ Pas le meilleur coup, réessaie'));
  }
}
function puzzleHint(){
  const pa=_puzzleActive; if(!pa){ showToast('Puzzle déjà résolu — ⏭ Suivant'); return; }
  const p=PUZZLES[pa.idx];
  if (typeof _defiSurPuzzle === 'function') _defiSurPuzzle(pa.idx, 'i');
  if(p.def){ showToast('💡 Menace adverse : '+p.thr+' — ta parade part de '+p.lab.slice(0,2)); return; }
  showToast('💡 Le coup part de '+p.lab.slice(0,2)+' (source : '+p.src.split('·')[0].trim()+')');
}
function puzzleSolution(){
  const pa=_puzzleActive; if(!pa){ showToast('Puzzle déjà résolu — ⏭ Suivant'); return; }
  const p=PUZZLES[pa.idx];
  if (typeof _defiSurPuzzle === 'function') _defiSurPuzzle(pa.idx, 's');
  selected = p.sol.cells.map(function(x){ return {r:x.r,c:x.c}; });
  drawBoard();
  showToast('✅ Solution : '+p.lab+' — joue-la !');
}
function puzzleNext(){
  let idx=(_puzzleActive ? _puzzleActive.idx : parseInt(localStorage.getItem('abaPuzzleIdx')||'0',10));
  idx=(idx+1)%PUZZLES.length;
  startPuzzle(idx);
}
function puzzleQuit(){
  _puzzleFermer();
  if(typeof resetGame==='function') resetGame();
  showToast('Puzzles fermés');
}

// ── 🧪 LABO D'AUTO-AMÉLIORATION RÉCURSIVE ──
// De VRAIS duels moteur contre moteur, dans des fils de calcul dedies (plusieurs a la fois).
// v4 (demande d'Olivier : « ameliorer le Labo » -- verdicts fiables, plus rapide, criteres de KAAH) :
//  - PAIRES d'ouvertures : chaque ouverture tiree au sort est jouee deux fois, couleurs
//    inversees, et le verdict compte des PAIRES (0, ½, 1, 1½ ou 2 points) -- l'avantage
//    qu'une ouverture donne a une couleur s'annule dans la paire ;
//  - verdict SPRT « pentanomial » (la methode de Fishtest, le banc d'essai de Stockfish),
//    avec un a priori de Jeffreys (½ paire fictive par case) : l'ancien verdict par partie
//    tombait sur 8 victoires de suite (variance mesuree nulle), et s'arretait a 60 parties --
//    beaucoup trop peu pour trancher : 97 % des tests finissaient « indecis » (simulation) ;
//  - les parties trop longues sont arbitrees par CONSENSUS des deux evaluations (cote moteur) ;
//  - SPSA ne touche plus aux poids de l'IA a chaque iteration : son resultat est VERIFIE par
//    un SPRT contre le champion avant toute adoption ;
//  - gain REEL mesure apres chaque adoption (le champion contre les poids d'origine), a la
//    place de l'ancien « Elo cumule » qui additionnait les estimations les plus chanceuses ;
//  - plusieurs parties en parallele (la moitie des coeurs, 4 au plus ; reglable) ;
//  - les 8 criteres de KAAH sont reglables par le Labo (mutants et SPSA).
let _labRunning=false,_labPingOk=false,_labHB=null,_labRetries=0; let _labLastDuel=null; let _labReplayWorker=null;
const LAB_CLES_BASE=['center','cohesion','edge','mob','iso','dng','chain','fortress'];
const LAB_CLES_KAAH=['scGain','scPerte','cases','compac','sumito','menace','fourch','piege'];
const LAB_ORIGINE={center:6,cohesion:4,edge:8,mob:2,iso:18,dng:14,chain:10,fortress:20,scGain:0,scPerte:0,cases:0,compac:0,sumito:0,menace:0,fourch:0,piege:0};
// valeurs de KAAH (son profil « Normal ») : la valeur d'un critere quand le Labo l'allume
const LAB_KAAH_REF={scGain:200,scPerte:200,cases:1,compac:20,sumito:20,menace:120,fourch:60,piege:40};
const LAB_NOMS={center:'centre',cohesion:'cohésion',edge:'bord',mob:'mobilité',iso:'isolement',dng:'danger',chain:'alignements',fortress:'forteresse',
  scGain:'sc. Gain',scPerte:'sc. Perte',cases:'cases',compac:'compacité',sumito:'sumito',menace:'menace',fourch:'fourchette',piege:'piège'};
// poids complets (16 cles) : une cle absente ou invalide prend la valeur d'origine (0 pour KAAH)
function _labComplet(w){
  const o={};
  LAB_CLES_BASE.concat(LAB_CLES_KAAH).forEach(function(k){ const v=w?w[k]:undefined; o[k]=(typeof v==='number' && isFinite(v) && v>=0) ? v : LAB_ORIGINE[k]; });
  return o;
}
function _labPoidsOrigineIA(){ if(typeof AI_WEIGHT_PRESETS!=='undefined') Object.assign(AI_WEIGHT_PRESETS.balanced, LAB_ORIGINE); }
function applyLabChampion(){
  try{
    if(localStorage.getItem('abaLabUse')==='0') return false;
    const c=JSON.parse(localStorage.getItem('abaLabChampion')||'null');
    if(c && typeof AI_WEIGHT_PRESETS!=='undefined'){ Object.assign(AI_WEIGHT_PRESETS.balanced, _labComplet(c)); return true; }
  }catch(e){}
  return false;
}
applyLabChampion();
const LAB_CFG_DEFAULT={
  screenMs:350, screenPlies:60, screenDraw:400, screenTarget:6,
  confMs:600, confPlies:80, confDraw:300, confCapPaires:250, confMinPaires:6,
  elo0:0, elo1:35, alpha:0.05, beta:0.05,
  bilanPaires:25, threads:0, kaah:1,
  openingPlies:6, balanceWindow:600, maxGen:20, adaptive:1,
  mode:'sprt',                 // 'sprt' (test A/B a seuil) ou 'spsa' (optimisation continue, verifiee avant adoption)
  // v2.70 : d'ou partent les parties ('belgian' : vraies positions de Marguerite belge du corpus ;
  // 'corpus' : toutes ses dispositions ; 'hasard' : l'ancien depart, Standard + coups au hasard)
  // et l'arbitrage a la limite de coups (2 : une bille d'avance ne suffit plus, voir playDuelGame)
  depart:'belgian', arbitrage:2,
  spsaA:60, spsaC:1.2, spsaAlpha:0.602, spsaGamma:0.101, spsaPairs:1, spsaIters:200, spsaVerif:50
};
let LAB_CFG=Object.assign({}, LAB_CFG_DEFAULT);
function labCfgLoad(){
  try{ const s=JSON.parse(localStorage.getItem('abaLabCfg')||'null'); if(s) LAB_CFG=Object.assign({}, LAB_CFG_DEFAULT, s); }catch(e){}
  // anciens reglages : cap et minimum etaient en PARTIES (60 et 8) -- remplaces par des paires
  delete LAB_CFG.confCap; delete LAB_CFG.confMin; delete LAB_CFG.keys;
  return LAB_CFG;
}
function labCfgSave(){ try{ localStorage.setItem('abaLabCfg', JSON.stringify(LAB_CFG)); }catch(e){} }
labCfgLoad();
function _labCles(){ return LAB_CFG.kaah ? LAB_CLES_BASE.concat(LAB_CLES_KAAH) : LAB_CLES_BASE.slice(); }
// Bornes SPRT derivees de alpha/beta (Wald) : A=log((1-b)/a) borne haute, B=log(b/(1-a)) borne basse
function _labBounds(){ const a=LAB_CFG.alpha||0.05, b=LAB_CFG.beta||0.05; return { up:Math.log((1-b)/a), lo:Math.log(b/(1-a)) }; }

// ── Statistiques par PAIRES (« pentanomial ») ──
// c[i] = nombre de paires ou A a marque i/2 point(s) : 0, ½, 1, 1½ ou 2.
const LAB_A_PRIORI=0.5;   // a priori de Jeffreys : ½ paire fictive dans chacune des 5 cases
function _labPentaVide(){ return [0,0,0,0,0]; }
function _labPentaN(c){ return c ? (c[0]+c[1]+c[2]+c[3]+c[4]) : 0; }
function _labPoints(c){ return c ? (0.5*c[1]+c[2]+1.5*c[3]+2*c[4]) : 0; }   // points de A sur ses paires
function _labPentaMoments(c, apriori){
  const k=[0,0.25,0.5,0.75,1]; let N=0,m=0,m2=0;
  for(let i=0;i<5;i++){ const n=((c&&c[i])||0)+apriori; N+=n; m+=n*k[i]; m2+=n*k[i]*k[i]; }
  if(N<=0) return { m:0.5, v:0.0625 };
  m/=N; m2/=N; return { m:m, v:Math.max(1e-9, m2-m*m) };
}
function _labScoreLogistique(elo){ return 1/(1+Math.pow(10,-elo/400)); }
// GSPRT (approximation de Van den Bergh, celle de Fishtest) sur les moyennes de paires
function _labLLRp(c, elo0, elo1){
  const n=_labPentaN(c); if(n<1) return 0;
  const M=_labPentaMoments(c, LAB_A_PRIORI), s0=_labScoreLogistique(elo0), s1=_labScoreLogistique(elo1);
  return (s1-s0)*(2*M.m-s0-s1)*n/(2*M.v);
}
// Elo de A et marge a 95 % : moyenne observee, variance regularisee (jamais une marge nulle)
function _labEloP(c){
  const n=_labPentaN(c); if(n<1) return null;
  const brut=_labPentaMoments(c, 0), reg=_labPentaMoments(c, LAB_A_PRIORI);
  const s=Math.min(0.99, Math.max(0.01, brut.m));
  const elo=-400*Math.log(1/s-1)/Math.LN10;
  const ci=1.96*Math.sqrt(reg.v/n)*400/(Math.LN10*s*(1-s));
  return { elo:elo, ci:ci, n:n };
}
function _labEloStrP(c){ const e=_labEloP(c); if(!e || e.n<2) return ''; return (e.elo>=0?'+':'')+Math.round(e.elo)+' Elo ± '+Math.round(e.ci); }
function _labScoreA(r){ return r && r.winner==='A' ? 1 : (r && r.winner==='D' ? 0.5 : 0); }
// enregistre le resultat d'UNE partie de la paire p (g = 0 : A a les Noirs, 1 : les Blancs) ;
// renvoie true quand la paire est complete
function _labPaireAjouter(job, p, g, s){
  job.half=job.half||{}; job.fait=job.fait||{}; job.penta=job.penta||_labPentaVide();
  if(job.fait[p]) return false;
  const h=job.half[p]||[null,null]; if(h[g]!==null) return false;
  h[g]=s; job.half[p]=h;
  if(h[0]!==null && h[1]!==null){ job.penta[Math.round((h[0]+h[1])*2)]++; job.fait[p]=1; delete job.half[p]; return true; }
  return false;
}
// prochaine partie a lancer d'un travail par paires : ni jouee, ni en cours
function _labPartieSuivante(job, maxPaires, prefixe, vol){
  for(let p=0;p<maxPaires;p++){
    if(job.fait && job.fait[p]) continue;
    const h=(job.half && job.half[p]) || [null,null];
    for(let g=0;g<2;g++){
      if(h[g]!==null) continue;
      const cle=prefixe+'|'+p+'|'+g;
      if(vol[cle]) continue;
      return { p:p, g:g, cle:cle };
    }
  }
  return null;
}

// ── Les fils de calcul : plusieurs parties a la fois ──
let _labFils=[];
let _labPlanifier=function(f, ms){ return setTimeout(f, ms); };   // remplacable par les tests
let _labCreerFil=function(){ const url=URL.createObjectURL(new Blob([AI_WORKER_CODE],{type:'application/javascript'})); return { w:new Worker(url), url:url }; };
// la moitie des coeurs (4 au plus) : il en reste pour jouer pendant que le Labo tourne
function _labNbFils(){
  const n=LAB_CFG.threads|0; if(n>0) return Math.min(8, n);
  const c=(typeof navigator!=='undefined' && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 2;
  return Math.max(1, Math.min(4, Math.floor(c/2)));
}
function _labFilTuer(f){ clearTimeout(f.chien); try{ f.w.onmessage=null; f.w.terminate(); }catch(e){} try{ if(f.url) URL.revokeObjectURL(f.url); }catch(e){} f.tache=null; }
function _labFilsAssurer(n){
  while(_labFils.length<n){ let f=null; try{ f=_labCreerFil(); }catch(e){ f=null; } if(!f || !f.w) break; f.tache=null; f.chien=null; _labFils.push(f); }
  for(let i=_labFils.length-1; i>=0 && _labFils.length>n; i--){ if(!_labFils[i].tache){ _labFilTuer(_labFils[i]); _labFils.splice(i,1); } }
  return _labFils.length;
}
function _labFilsArreter(){ _labFils.forEach(_labFilTuer); _labFils=[]; }
function _labFilsEnCours(){ return _labFils.filter(function(f){ return f.tache; }).length; }
function _labFilLancer(f, t, surFin){
  f.tache=t; t.t0=Date.now();
  f.w.onmessage=function(e){ const d=e.data; if(!d || !d.duelGame || f.tache!==t) return; clearTimeout(f.chien); f.tache=null; surFin(t, d); };
  f.w.onerror=function(ev){ if(f.tache!==t) return; clearTimeout(f.chien); f.tache=null; surFin(t, { duelGame:true, error:(ev && ev.message) || 'fil de calcul en erreur' }); };
  const delai=Math.max(120000, Math.round(3*t.plies*t.ms)+30000);
  f.chien=_labPlanifier(function(){
    if(f.tache!==t) return;
    // partie anormalement longue : ce fil est remplace par un neuf, la partie sera relancee
    const i=_labFils.indexOf(f); _labFilTuer(f);
    if(i>=0){ let n=null; try{ n=_labCreerFil(); }catch(e){} if(n && n.w){ n.tache=null; n.chien=null; _labFils[i]=n; } else _labFils.splice(i,1); }
    surFin(t, { duelGame:true, timeout:true });
  }, delai);
  f.w.postMessage({ duelGame:true, wA:t.wA, wB:t.wB, colorA:t.colorA, seed:t.seed, msPerMove:t.ms, maxPlies:t.plies, drawWin:t.draw,
    ouverture:LAB_CFG.openingPlies, equilibre:LAB_CFG.balanceWindow, depart:t.depart||null, cfgA:t.cfgA||null, cfgB:t.cfgB||null,
    arbitrage:(t.arbitrage!=null ? t.arbitrage : (LAB_CFG.arbitrage|0)||1), id:Date.now() });
}

// ── Mutants (mode SPRT) ──
// recettes sur les 8 poids historiques, et sur les criteres de KAAH (allumer un critere
// a la valeur de KAAH, puis l'augmenter ou le baisser) -- les deux listes alternent
const LAB_RECETTES_BASE=[
  ['cohesion', function(v){return v+1;}], ['edge', function(v){return Math.max(2,Math.round(v*0.75));}],
  ['mob', function(v){return v*2;}],      ['iso', function(v){return Math.max(4,Math.round(v*0.8));}],
  ['dng', function(v){return Math.round(v*1.3);}], ['center', function(v){return v+2;}],
  ['cohesion', function(v){return v+2;}], ['iso', function(v){return Math.round(v*1.3);}],
  ['edge', function(v){return Math.round(v*1.25);}],
  ['chain', function(v){return v+2;}],    ['chain', function(v){return Math.round(v*1.3);}],
  ['fortress', function(v){return v+4;}], ['fortress', function(v){return Math.max(4,Math.round(v*0.75));}]
];
function _labRecetteKaah(k, f){ return [k, function(v){ return v ? Math.round(v*f*10)/10 : (f>1 ? LAB_KAAH_REF[k] : -1); }]; }
const LAB_RECETTES_KAAH=[
  _labRecetteKaah('sumito',1.5), _labRecetteKaah('menace',1.5), _labRecetteKaah('piege',1.5), _labRecetteKaah('fourch',1.5),
  _labRecetteKaah('compac',1.5), _labRecetteKaah('scGain',1.5), _labRecetteKaah('cases',1.5), _labRecetteKaah('scPerte',1.5),
  _labRecetteKaah('menace',0.6), _labRecetteKaah('sumito',0.6), _labRecetteKaah('fourch',0.6), _labRecetteKaah('piege',0.6)
];
const LAB_RECIPES=(function(){ const o=[]; for(let i=0;i<Math.max(LAB_RECETTES_BASE.length, LAB_RECETTES_KAAH.length);i++){ if(LAB_RECETTES_BASE[i]) o.push(LAB_RECETTES_BASE[i]); if(LAB_RECETTES_KAAH[i]) o.push(LAB_RECETTES_KAAH[i]); } return o; })();
function _labMkMutant(ch, key, nv){
  if(typeof nv!=='number' || !isFinite(nv) || nv<0 || nv===ch[key]) return null;
  const w=_labComplet(ch); w[key]=nv;
  return { name:(LAB_NOMS[key]||key)+' '+ch[key]+'→'+nv, w:w, key:key, penta:_labPentaVide(), half:{}, fait:{}, stop:false };
}
function labMutants(ch, gen, lastGood){
  ch=_labComplet(ch);
  const cles=_labCles(), out=[], seen={};
  // 1) recherche adaptative : le dernier axe gagnant est pousse plus loin dans la MEME
  //    direction, plus son voisin oppose pour borner l'optimum
  const lg=(LAB_CFG.adaptive!==0 && lastGood && cles.indexOf(lastGood)>=0) ? lastGood : null;
  if(lg){
    const cur=ch[lg], step=Math.max(lg==='cases'?0.5:1, Math.round(Math.abs(cur)*0.5));
    [cur+step*2, cur+step, Math.max(0,cur-step)].forEach(function(nv){
      const m=_labMkMutant(ch, lg, nv);
      if(m && !seen[lg+':'+nv]){ seen[lg+':'+nv]=1; out.push(m); }
    });
  }
  // 2) complete avec la liste tournante de recettes jusqu'a 3 candidats
  const rec=LAB_RECIPES.filter(function(r){ return cles.indexOf(r[0])>=0; });
  const base=(((gen-2)*3)%rec.length+rec.length)%rec.length;
  for(let k=0; k<rec.length && out.length<3; k++){
    const r=rec[(base+k)%rec.length], key=r[0], nv=r[1](ch[key]);
    if(seen[key+':'+nv]) continue;
    const m=_labMkMutant(ch, key, nv);
    if(m){ seen[key+':'+nv]=1; out.push(m); }
  }
  return out.slice(0,3);
}

// ── SPSA : optimisation de tous les poids a la fois (methode des regleurs de moteurs d'echecs) ──
const SPSA_MIN={center:0,cohesion:0,edge:0,mob:0,iso:0,dng:0,chain:0,fortress:0,scGain:0,scPerte:0,cases:0,compac:0,sumito:0,menace:0,fourch:0,piege:0};
const SPSA_MAX={center:40,cohesion:40,edge:40,mob:20,iso:60,dng:60,chain:40,fortress:60,scGain:400,scPerte:400,cases:5,compac:60,sumito:60,menace:300,fourch:150,piege:120};
const SPSA_KEYS=LAB_CLES_BASE.concat(LAB_CLES_KAAH);
function _spsaClamp(w){ const o=_labComplet(w); SPSA_KEYS.forEach(function(k){ o[k]=Math.max(SPSA_MIN[k], Math.min(SPSA_MAX[k], Math.round(o[k]*100)/100)); }); return o; }
function _spsaInit(theta){
  const t=_labComplet(theta);
  // critere de KAAH eteint : depart a la moitie de la valeur de KAAH, sinon θ− reste colle a 0
  if(LAB_CFG.kaah) LAB_CLES_KAAH.forEach(function(k){ if(!t[k]) t[k]=LAB_KAAH_REF[k]/2; });
  return { iter:0, k:0, lance:0, theta:t, thetaHist:[{iter:0, theta:Object.assign({},t)}], wins:0, draws:0, losses:0, prochVerif:LAB_CFG.spsaVerif||50 };
}
// perturbation ±δ (Rademacher), a l'echelle de la plage de chaque poids
function _spsaPerturb(sp){
  const ck=LAB_CFG.spsaC/Math.pow(sp.k+1, LAB_CFG.spsaGamma);
  const delta={}, plus=Object.assign({}, sp.theta), minus=Object.assign({}, sp.theta);
  _labCles().forEach(function(key){
    const d=(Math.random()<0.5? -1: 1), ech=(SPSA_MAX[key]-SPSA_MIN[key])/60;
    delta[key]=d; plus[key]=sp.theta[key]+ck*d*ech; minus[key]=sp.theta[key]-ck*d*ech;
  });
  return { ck:ck, delta:delta, plus:_spsaClamp(plus), minus:_spsaClamp(minus) };
}
// θ ← θ + a_k · score · Δ · plage/60   (score ∈ [−1, +1] = avantage de θ+)
function _spsaUpdate(sp, pert, score){
  const ak=LAB_CFG.spsaA/Math.pow(sp.k+1+10, LAB_CFG.spsaAlpha);
  const nt=Object.assign({}, sp.theta);
  Object.keys(pert.delta).forEach(function(key){ nt[key]=sp.theta[key]+ak*score*pert.delta[key]*(SPSA_MAX[key]-SPSA_MIN[key])/60; });
  sp.theta=_spsaClamp(nt);
  sp.k++; sp.iter++;
  sp.thetaHist.push({iter:sp.iter, theta:Object.assign({}, sp.theta)});
  if(sp.thetaHist.length>400) sp.thetaHist.splice(0, sp.thetaHist.length-400);
}

// ── Etat persistant (v4) ──
function _labPhasePrincipale(){ return LAB_CFG.mode==='spsa' ? 'spsa' : 'screen'; }
function _labDefaultState(){
  const champ=_labComplet(LAB_ORIGINE);
  return { v:5, gen:2, epoch:1, champion:champ, championGen:1, phase:_labPhasePrincipale(), departMode:LAB_CFG.depart||'belgian', cands:labMutants(champ,2,null), candsGen:2,
    champions:[{ gen:1, t:null, w:_labVecteur(champ), nom:'poids d’origine' }], msTotal:0,
    confirm:null, bilan:null, totalGames:0, gameLog:[], lastGood:null, spsa:_spsaInit(champ), mesures:[],
    history:[{gen:1,type:'banc externe',name:'iso26/dng20/center9/cohesion6 testés — finaliste cohesion 6 : 17,5/32 (54,7 %) < seuil',score:null,games:60}] };
}
// etat v1 a v3 : on garde le champion, l'historique et les compteurs ; le test en cours repart
// sur les nouvelles regles (ses parties comptaient une par une, pas par paires)
function _labMigrer(s){
  const st=_labDefaultState();
  st.gen=s.gen||2; st.champion=_labComplet(s.champion); st.totalGames=s.totalGames||0;
  st.gameLog=(s.gameLog||[]).slice(0,12); st.lastGood=s.lastGood||null;
  st.history=(s.history||[]).slice(0,60);
  if(typeof s.cumElo==='number') st.ancienCumul=Math.round(s.cumElo);
  if(s.spsa && s.spsa.theta){
    st.spsa=_spsaInit(st.champion); st.spsa.theta=_spsaClamp(s.spsa.theta);
    st.spsa.iter=s.spsa.iter||0; st.spsa.k=s.spsa.k||0; st.spsa.lance=st.spsa.iter;
    st.spsa.thetaHist=(s.spsa.thetaHist||[]).slice(-400).map(function(h){ return { iter:h.iter, theta:_labComplet(h.theta) }; });
    st.spsa.wins=s.spsa.wins||0; st.spsa.draws=s.spsa.draws||0; st.spsa.losses=s.spsa.losses||0;
    st.spsa.prochVerif=st.spsa.iter+(LAB_CFG.spsaVerif||50);
  }
  st.history.unshift({gen:st.gen, type:'⚙ v4', name:'paires d’ouvertures, verdict par paires, arbitrage par consensus, SPSA vérifié, critères de KAAH, plusieurs parties à la fois', score:null, games:0});
  st.cands=labMutants(st.champion, st.gen, st.lastGood); st.candsGen=st.gen;
  st.phase=(s.phase==='done') ? 'done' : _labPhasePrincipale();
  labSave(st); return st;
}
/* v2.70 : les parties partent de vraies positions et sont arbitrees autrement. Le champion,
   l'historique et les mesures restent ; le test en cours repart sur les nouvelles regles
   (ses parties ne se melangent pas avec les anciennes). */
function _labMigrerV5(s){
  s.v=5; s.epoch=(s.epoch||1)+1; s.departMode=LAB_CFG.depart||'belgian';
  (s.cands||[]).forEach(function(c){ c.penta=_labPentaVide(); c.half={}; c.fait={}; c.stop=false; });
  if(s.confirm){ s.confirm.penta=_labPentaVide(); s.confirm.half={}; s.confirm.fait={}; s.confirm.llr=0; }
  if(s.bilan){ s.bilan.penta=_labPentaVide(); s.bilan.half={}; s.bilan.fait={}; }
  s.history=s.history||[];
  s.history.unshift({gen:s.gen||2, type:'⚙ v5', name:'parties depuis de vraies positions du corpus (Marguerite belge), une bille d’avance ne suffit plus à gagner ; le test en cours repart', score:null, games:0});
  labSave(s); return s;
}
function labLoad(){
  try{
    const s=JSON.parse(localStorage.getItem('abaLabState')||'null');
    if(s && s.champion && s.phase){
      const t = (s.v===5) ? s : (s.v===4 ? _labMigrerV5(s) : _labMigrerV5(_labMigrer(s)));
      // v2.71 : l'historique des champions commence aux poids d'origine (et au champion actuel s'il en differe)
      if(!t.champions){
        t.champions=[{ gen:1, t:null, w:_labVecteur(LAB_ORIGINE), nom:'poids d’origine' }];
        if(_labVecteur(t.champion).join()!==t.champions[0].w.join()) t.champions.push({ gen:t.championGen||t.gen, t:null, w:_labVecteur(t.champion), nom:'champion avant la v2.71' });
      }
      return t;
    }
  }catch(e){}
  return _labDefaultState();
}
function labSave(st){ try{ localStorage.setItem('abaLabState', JSON.stringify(st)); }catch(e){} }
function _labStatus(msg,isErr){
  var el=document.getElementById('lab-live');
  if(el){ el.innerHTML=msg; el.style.color=isErr?'#e66':'var(--muted)'; }
}
let _labDebits=[];   // instants de fin des dernieres parties (debit affiche)
function _labMajStatut(){
  if(!_labRunning || !_labPingOk) return;
  const enCours=_labFils.filter(function(f){ return f.tache; });
  const ancienne=enCours.length ? Math.round(Math.max.apply(null, enCours.map(function(f){ return Date.now()-f.tache.t0; }))/1000) : 0;
  let debit='';
  if(_labDebits.length>=3){ const h=(_labDebits[_labDebits.length-1]-_labDebits[0])/3600000; if(h>0) debit=' · ≈ '+Math.round((_labDebits.length-1)/h)+' parties/heure'; }
  _labStatus('🎮 '+enCours.length+' partie'+(enCours.length>1?'s':'')+' en cours sur '+_labFils.length+' fil'+(_labFils.length>1?'s':'')+' de calcul'
    +(ancienne?' (la plus ancienne : '+ancienne+' s)':'')+debit);
}
function _labHBstart(){ clearInterval(_labHB); _labHB=setInterval(_labMajStatut, 1000); }
function _labHBstop(){ clearInterval(_labHB); _labHB=null; }
let _labEnVol={};   // parties lancees, pas encore revenues (en memoire : perdues au rechargement, donc relancees)
let _spsaVol=[];    // iterations SPSA en cours (en memoire)

/* v2.70 : les positions du corpus sont chargees AVANT la premiere partie -- sinon les deux
   parties d'une paire pourraient partir de positions differentes. Chargement impossible
   (navigateur trop ancien) : l'ancien depart, Standard + coups au hasard. */
function _labPositionsPuis(suite){
  if(LAB_CFG.depart==='hasard' || typeof ensureLaboPositions!=='function' || (typeof LABO_POS!=='undefined' && LABO_POS)){ suite(); return; }
  ensureLaboPositions().then(function(ok){ if(!ok) _labStatus('⚠️ Positions du corpus illisibles ici : départ Standard + coups au hasard'); suite(); });
}
function startLab(){
  if(typeof _testKaahEnCours!=='undefined' && _testKaahEnCours){ showToast('Le test des critères de KAAH tourne : mets-le en pause d’abord'); return; }
  if(typeof _bancActif!=='undefined' && _bancActif){ showToast('Un banc d’essai du Labo tourne : mets-le en pause d’abord'); return; }
  const n=_labFilsAssurer(_labNbFils());
  if(!n){ renderLab(); _labStatus('❌ Fil de calcul refusé par ce navigateur/lecteur — ouvre le site dans Chrome ou Firefox, ou via le site en ligne',true); showToast('⚠️ Fil de calcul indisponible — Labo impossible ici'); return; }
  _labRunning=true; _labRetries=0; _labEnVol={}; _spsaVol=[]; try{localStorage.setItem('abaLabAutoRun','1');}catch(e){}
  renderLab(); _labStatus('⏳ Test des fils de calcul…');
  _labPingOk=false;
  const f=_labFils[0];
  f.w.onmessage=function(e){ if(e.data && e.data.pong && !_labPingOk){ _labPingOk=true; if(_labRunning){ _labStatus('✅ '+_labFils.length+' fil'+(_labFils.length>1?'s':'')+' de calcul prêt'+(_labFils.length>1?'s':'')+' — lancement des parties…'); _labPositionsPuis(function(){ if(_labRunning){ _labHBstart(); _labPomper(); } }); } } };
  try{ f.w.postMessage({ping:1}); }
  catch(err){ pauseLab(); _labStatus('❌ postMessage a échoué : '+err.message,true); return; }
  _labPlanifier(function(){
    if(_labRunning && !_labPingOk){
      pauseLab();
      _labStatus('❌ Le fil de calcul ne répond pas : ce navigateur ou ce lecteur de fichier le bloque. Ouvre le site dans Chrome/Firefox, ou en ligne (GitHub Pages).',true);
      showToast('❌ Fil de calcul muet — détail dans le panneau Labo');
    }
  },4000);
}
// la pause arrete les fils tout de suite (les parties en cours seront rejouees a la reprise)
function pauseLab(){ _labRunning=false; _labHBstop(); _labFilsArreter(); _labEnVol={}; _spsaVol=[]; try{localStorage.setItem('abaLabAutoRun','0');}catch(e){} renderLab(); _labStatus('⏸ En pause'); }
function resetLab(){
  if(!confirm('Réinitialiser le Labo ? (champion, historique et progression effacés ; les poids par défaut reviennent)')) return;
  pauseLab();
  localStorage.removeItem('abaLabState'); localStorage.removeItem('abaLabChampion'); localStorage.removeItem('abaLabAutoRun');
  _labPoidsOrigineIA();
  renderLab(); showToast('Labo réinitialisé');
}
function labToggleUse(el){
  localStorage.setItem('abaLabUse', el.checked?'1':'0');
  if(el.checked){ applyLabChampion(); showToast('Poids du Labo appliqués à l’IA'); }
  else { _labPoidsOrigineIA(); showToast('Poids par défaut restaurés'); }
}

// ── Ordonnanceur ──
function _labRegime(phase){ return phase==='screen' ? {ms:LAB_CFG.screenMs, plies:LAB_CFG.screenPlies, draw:LAB_CFG.screenDraw} : {ms:LAB_CFG.confMs, plies:LAB_CFG.confPlies, draw:LAB_CFG.confDraw}; }
function _labPairesTri(){ return Math.max(1, Math.ceil((LAB_CFG.screenTarget||6)/2)); }
// v2.70 : la position de depart d'une partie (null : l'ancien depart, Standard + coups au hasard)
function _labDepart(mode, seed){
  if(mode==='hasard' || typeof _lpDepartPour!=='function' || typeof LABO_POS==='undefined' || !LABO_POS) return null;
  return _lpDepartPour(seed, mode);
}
function _labTache(st, job, idx, nx, wA, wB, seed, R, nom){
  return { cle:nx.cle, epoch:st.epoch, job:job, idx:idx, p:nx.p, g:nx.g, wA:wA, wB:wB, colorA:(nx.g===0?'black':'white'),
    seed:seed, ms:R.ms, plies:R.plies, draw:R.draw, nom:nom, depart:_labDepart(st.departMode||LAB_CFG.depart, seed) };
}
function _labVolPour(prefixe){ let n=0; for(const k in _labEnVol){ if(k.indexOf(prefixe+'|')===0) n++; } return n; }
function _labDemi(job){ let n=0; for(const p in (job.half||{})){ const h=job.half[p]; if(h[0]!==null) n++; if(h[1]!==null) n++; } return n; }
function _labTacheSuivante(st){
  const ph=st.phase;
  if(ph==='screen'){
    if(!st.cands || !st.cands.length) return null;
    // les mutants jouent les MEMES ouvertures (comparaison plus juste) ; celui qui a le moins
    // de parties lancees passe d'abord
    const P=_labPairesTri(), R=_labRegime('screen'); let best=null, bestN=Infinity;
    st.cands.forEach(function(c, i){
      if(c.stop || _labPentaN(c.penta)>=P) return;
      const pre='e'+st.epoch+'|c'+i, nx=_labPartieSuivante(c, P, pre, _labEnVol); if(!nx) return;
      const n=2*_labPentaN(c.penta)+_labDemi(c)+_labVolPour(pre);
      if(n<bestN){ bestN=n; best={ c:c, i:i, nx:nx }; }
    });
    if(!best) return null;
    return _labTache(st, 'cand', best.i, best.nx, best.c.w, st.champion, st.gen*100000+1000+best.nx.p, R, best.c.name);
  }
  if(ph==='confirm' && st.confirm){
    const nx=_labPartieSuivante(st.confirm, LAB_CFG.confCapPaires, 'e'+st.epoch+'|cf', _labEnVol); if(!nx) return null;
    return _labTache(st, 'confirm', 0, nx, st.confirm.w, st.champion, st.gen*100000+77000+nx.p, _labRegime('confirm'), st.confirm.name);
  }
  if(ph==='bilan' && st.bilan){
    const nx=_labPartieSuivante(st.bilan, st.bilan.pairs, 'e'+st.epoch+'|bl', _labEnVol); if(!nx) return null;
    return _labTache(st, 'bilan', 0, nx, st.bilan.wA, LAB_ORIGINE, st.gen*100000+55000+nx.p, _labRegime('confirm'), st.bilan.name);
  }
  if(ph==='spsa') return _spsaTacheSuivante(st);
  return null;
}
function _spsaTache(st, it, g){
  const R=_labRegime('confirm');
  const seed=5000000+it.id*101+Math.floor(g/2);
  return { cle:'e'+st.epoch+'|s'+it.id+'|'+g, epoch:st.epoch, job:'spsa', idx:it.id, p:Math.floor(g/2), g:g%2, wA:it.pert.plus, wB:it.pert.minus,
    colorA:(g%2===0?'black':'white'), seed:seed, ms:R.ms, plies:R.plies, draw:R.draw, nom:'SPSA θ+ contre θ−', depart:_labDepart(st.departMode||LAB_CFG.depart, seed) };
}
// SPSA asynchrone (comme les regleurs distribues) : chaque iteration part du θ du moment,
// et sa mise a jour s'applique des que ses parties sont revenues
function _spsaTacheSuivante(st){
  const sp=st.spsa, n=2*Math.max(1, LAB_CFG.spsaPairs|0);
  for(const it of _spsaVol){ if(it.epoch===st.epoch && it.aLancer.length){ return _spsaTache(st, it, it.aLancer.shift()); } }
  const plafond=Math.min(LAB_CFG.spsaIters, sp.prochVerif||LAB_CFG.spsaIters);
  const enCours=_spsaVol.filter(function(it){ return it.epoch===st.epoch; }).length;
  if(sp.iter+enCours>=plafond) return null;
  const it={ id:sp.lance++, epoch:st.epoch, pert:_spsaPerturb(sp), aLancer:[], faits:0, plus:0, n:n };
  for(let g=0; g<n; g++) it.aLancer.push(g);
  _spsaVol.push(it);
  return _spsaTache(st, it, it.aLancer.shift());
}
function _labNouvellePhase(st, phase){
  st.phase=phase; st.epoch=(st.epoch||1)+1; st.departMode=LAB_CFG.depart||'belgian';
  _spsaVol=_spsaVol.filter(function(it){ return it.epoch===st.epoch; });
}
function _labRetourPrincipal(st){
  if(LAB_CFG.mode==='spsa'){
    const sp=st.spsa; if(sp.iter>=LAB_CFG.spsaIters){ _labNouvellePhase(st,'done'); return; }
    if(!(sp.prochVerif>sp.iter)) sp.prochVerif=sp.iter+(LAB_CFG.spsaVerif||50);
    _labNouvellePhase(st,'spsa'); return;
  }
  if(st.gen>LAB_CFG.maxGen){ _labNouvellePhase(st,'done'); return; }
  if(!st.cands || st.candsGen!==st.gen){ st.cands=labMutants(st.champion, st.gen, st.lastGood); st.candsGen=st.gen; }
  _labNouvellePhase(st,'screen');
}
function _labFinTri(st){
  const ratio=function(c){ const n=_labPentaN(c.penta); return n ? _labPoints(c.penta)/(2*n) : 0; };
  const tries=st.cands.slice().sort(function(a,b){ return ratio(b)-ratio(a); }), best=tries[0];
  if(!best || ratio(best)<0.5){
    // aucun mutant a 50 % au tri : inutile de lancer une confirmation de plusieurs heures
    st.history.unshift({gen:st.gen, type:'✗ tri', name:'aucun mutant à 50 % ('+st.cands.map(function(c){ return c.name+' : '+Math.round(100*ratio(c))+' %'; }).join(', ')+')', score:null,
      games:st.cands.reduce(function(s,c){ return s+2*_labPentaN(c.penta); },0)});
    st.gen++; _labRetourPrincipal(st); return;
  }
  _labNouvellePhase(st,'confirm');
  st.confirm={ name:best.name, w:best.w, key:best.key||null, penta:_labPentaVide(), half:{}, fait:{}, llr:0, source:'sprt' };
}
// v2.71 : l'historique des champions (tableau de bord : les poids au fil des generations)
function _labVecteur(w){ const c=_labComplet(w); return SPSA_KEYS.map(function(k){ return Math.round(c[k]*10)/10; }); }
function _labNoterChampion(st, nom){
  st.champions=st.champions||[];
  st.champions.push({ gen:st.championGen||st.gen, t:Date.now(), w:_labVecteur(st.champion), nom:nom||'' });
  if(st.champions.length>200) st.champions.splice(1, st.champions.length-200);
}
function _labAdopt(st, cf){
  st.champion=_labComplet(cf.w); st.championGen=st.gen;
  _labNoterChampion(st, cf.name);
  try{ localStorage.setItem('abaLabChampion', JSON.stringify(st.champion)); }catch(e){}
  applyLabChampion();
  st.history.unshift({gen:st.gen, type:'✅ adopté (SPRT)', name:cf.name, score:_labPoints(cf.penta), games:2*_labPentaN(cf.penta), elo:_labEloStrP(cf.penta)});
  st.lastGood=cf.key||null;
  if(typeof showToast==='function') showToast('🧪 Nouveau champion : '+cf.name+' · '+_labEloStrP(cf.penta));
  st.gen++; st.confirm=null;
  if((LAB_CFG.bilanPaires|0)>0){
    _labNouvellePhase(st,'bilan');
    st.bilan={ name:'Bilan : champion G'+st.championGen+' contre les poids d’origine', wA:st.champion, gen:st.championGen, penta:_labPentaVide(), half:{}, fait:{}, pairs:LAB_CFG.bilanPaires|0 };
  } else _labRetourPrincipal(st);
}
function _labReject(st, cf, undecided){
  st.history.unshift({gen:st.gen, type:(undecided?'❓ indécis (plafond '+LAB_CFG.confCapPaires+' paires)':'✗ rejeté (SPRT)'), name:cf.name, score:_labPoints(cf.penta), games:2*_labPentaN(cf.penta), elo:_labEloStrP(cf.penta)});
  st.gen++; st.confirm=null; _labRetourPrincipal(st);
}
function _labFinBilan(st){
  const b=st.bilan, e=_labEloP(b.penta);
  st.mesures=st.mesures||[];
  if(e) st.mesures.push({ gen:b.gen, elo:Math.round(e.elo), ci:Math.round(e.ci), paires:e.n, t:Date.now() });
  if(st.mesures.length>50) st.mesures.splice(0, st.mesures.length-50);
  st.history.unshift({gen:b.gen, type:'📏 bilan', name:'contre les poids d’origine : '+_labEloStrP(b.penta), score:_labPoints(b.penta), games:2*_labPentaN(b.penta)});
  st.bilan=null; _labRetourPrincipal(st);
}
function _spsaVerifier(st){
  const sp=st.spsa;
  _labNouvellePhase(st,'confirm');
  st.confirm={ name:'SPSA θ après '+sp.iter+' itérations', w:_labComplet(sp.theta), key:null, penta:_labPentaVide(), half:{}, fait:{}, llr:0, source:'spsa' };
}
// verifie si la phase en cours est tranchee (apres chaque resultat, et quand plus rien ne bouge)
function _labVerifierPhase(st){
  const ph=st.phase;
  if(ph==='screen' && st.cands){
    const P=_labPairesTri();
    // futilite : un mutant qui ne peut plus atteindre 50 % meme en gagnant tout s'arrete
    st.cands.forEach(function(c){ const n=_labPentaN(c.penta); if(!c.stop && n<P && _labPoints(c.penta)+2*(P-n)<P) c.stop=true; });
    if(st.cands.every(function(c){ return c.stop || _labPentaN(c.penta)>=P; })) _labFinTri(st);
  } else if(ph==='confirm' && st.confirm){
    const cf=st.confirm, n=_labPentaN(cf.penta), B=_labBounds();
    cf.llr=_labLLRp(cf.penta, LAB_CFG.elo0, LAB_CFG.elo1);
    if(n>=LAB_CFG.confMinPaires && cf.llr>=B.up) _labAdopt(st, cf);
    else if(n>=LAB_CFG.confMinPaires && cf.llr<=B.lo) _labReject(st, cf, false);
    else if(n>=LAB_CFG.confCapPaires) _labReject(st, cf, true);
  } else if(ph==='bilan' && st.bilan){
    if(_labPentaN(st.bilan.penta)>=st.bilan.pairs) _labFinBilan(st);
  } else if(ph==='spsa'){
    const sp=st.spsa, enCours=_spsaVol.some(function(it){ return it.epoch===st.epoch; });
    if(!enCours && sp.iter>=Math.min(LAB_CFG.spsaIters, sp.prochVerif||LAB_CFG.spsaIters)) _spsaVerifier(st);
  }
}
function _labPomper(){
  if(!_labRunning || !_labPingOk) return;
  _labFilsAssurer(_labNbFils());
  const st=labLoad();
  if(st.phase==='done'){ _labRunning=false; _labHBstop(); _labFilsArreter(); try{localStorage.setItem('abaLabAutoRun','0');}catch(e){} renderLab(); _labStatus('✅ Terminé'); return; }
  let lance=0, change=false;
  for(let i=0;i<_labFils.length;i++){
    const f=_labFils[i]; if(f.tache) continue;
    const t=_labTacheSuivante(st); if(!t) break;
    if(t.job==='spsa') change=true;
    _labEnVol[t.cle]=1; _labLastDuel=t; _labFilLancer(f, t, _labFinPartie); lance++;
  }
  if(change) labSave(st);
  if(!lance && !_labFilsEnCours()){
    // plus rien a lancer ni en cours : la phase est tranchee, on passe a la suivante
    const avant=st.phase+'|'+st.epoch; _labVerifierPhase(st);
    if(st.phase+'|'+st.epoch!==avant){ labSave(st); renderLab(); _labPlanifier(_labPomper, 50); }
  }
}
function labStep(){ _labPomper(); }   // ancien nom, garde pour les appels existants
function _labFinPartie(t, d){
  delete _labEnVol[t.cle];
  if(!_labRunning) return;
  if(d.timeout){
    _labRetries++;
    if(_labRetries>=3){ pauseLab(); if(typeof showToast==='function') showToast('⚠️ Labo en pause : parties trop longues (3 fois de suite)'); return; }
    // partie SPSA abandonnee : elle retourne dans la file de son iteration (sinon l'iteration ne finirait jamais)
    if(t.job==='spsa'){ const it=_spsaVol.find(function(x){ return x.id===t.idx && x.epoch===t.epoch; }); if(it) it.aLancer.unshift(2*t.p+t.g); }
    _labPlanifier(_labPomper, 300); return;
  }
  if(d.error){ pauseLab(); _labStatus('❌ Erreur moteur : '+d.error,true); if(typeof showToast==='function') showToast('❌ Labo arrêté : erreur moteur'); return; }
  _labRetries=0; _labDebits.push(Date.now()); if(_labDebits.length>40) _labDebits.shift();
  const st=labLoad();
  if(t.epoch!==st.epoch){ _labPlanifier(_labPomper, 50); return; }   // la phase est deja tranchee : resultat ignore
  const r=d.result||{winner:'D'}, s=_labScoreA(r);
  st.totalGames++;
  t.ms=t.t0 ? Date.now()-t.t0 : 0; st.msTotal=(st.msTotal||0)+t.ms;   // v2.71 : temps de calcul (tableau de bord)
  _labJournal(st, t, r, d.moves);
  if(t.job==='spsa') _spsaResultat(st, t, s);
  else {
    const job=t.job==='cand' ? st.cands[t.idx] : (t.job==='confirm' ? st.confirm : st.bilan);
    if(job) _labPaireAjouter(job, t.p, t.g, s);
  }
  _labVerifierPhase(st);
  labSave(st); renderLab();
  _labPlanifier(_labPomper, 50);
}
function _spsaResultat(st, t, s){
  const it=_spsaVol.find(function(x){ return x.id===t.idx && x.epoch===t.epoch; }); if(!it) return;
  const sp=st.spsa; it.faits++; it.plus+=s;
  if(s===1) sp.wins++; else if(s===0.5) sp.draws++; else sp.losses++;
  if(it.faits<it.n) return;
  _spsaVol.splice(_spsaVol.indexOf(it), 1);
  _spsaUpdate(sp, it.pert, (it.plus/it.n-0.5)*2);   // le θ de l'IA ne change PAS : il sera verifie d'abord
}
// journal data : les poids nuls ne sont pas stockes (l'export les remet a 0) -- 2000 lignes de 16 poids
// pesaient sinon pres d'1 Mo dans le stockage du navigateur
function _labSansZeros(w){ const o={}; if(w) for(const k in w){ if(typeof w[k]==='number' && w[k]!==0) o[k]=w[k]; } return o; }
function _labJournal(st, t, r, moves){
  const qui = t.job==='spsa' ? (r.winner==='A'?'θ+':(r.winner==='D'?'nulle':'θ−'))
    : (t.job==='bilan' ? (r.winner==='A'?'champion':(r.winner==='D'?'nulle':'origine'))
    : (r.winner==='A'?'mutant':(r.winner==='D'?'nulle':'champion')));
  st.gameLog=st.gameLog||[];
  st.gameLog.unshift({ phase:t.job, name:t.nom, w:qui, res:r.winner, why:r.why||'?', plies:r.plies||0, seed:t.seed, colorA:t.colorA, moves:(moves && moves.length<=200) ? moves : null,
    depart:t.depart ? { s:t.depart.s, t:t.depart.t, cb:t.depart.cb, cw:t.depart.cw, ref:t.depart.ref||'' } : null });
  if(st.gameLog.length>12) st.gameLog.length=12;
  if(moves && moves.length && !t.depart) _labMineBook(moves);   // le book du Labo part de la position Standard : seulement l'ancien depart
  _labDataPush({ t:Date.now(), gen:st.gen, phase:t.job, mutant:t.nom, mutKey:(t.job==='cand' && st.cands && st.cands[t.idx] && st.cands[t.idx].key) || '',
    winner:r.winner, why:r.why||'?', plies:r.plies||0, cb:r.cb!=null?r.cb:'', cw:r.cw!=null?r.cw:'', colorA:t.colorA, seed:t.seed, paire:t.p, wA:_labSansZeros(t.wA), wB:_labSansZeros(t.wB),
    depart:t.depart ? (t.depart.ref||'corpus') : 'hasard', ms:t.ms||0 });
}
// mesure du gain reel a la demande : le champion contre les poids d'origine
function labMesurerGain(){
  const st=labLoad();
  if(st.phase==='confirm' || st.phase==='bilan'){ showToast('Attends la fin du test en cours'); return; }
  const ch=_labComplet(st.champion);
  if(SPSA_KEYS.every(function(k){ return ch[k]===LAB_ORIGINE[k]; })){ showToast('Le champion est encore celui d’origine : rien à mesurer'); return; }
  _labNouvellePhase(st,'bilan');
  st.bilan={ name:'Bilan : champion G'+(st.championGen||st.gen)+' contre les poids d’origine', wA:ch, gen:st.championGen||st.gen, penta:_labPentaVide(), half:{}, fait:{}, pairs:Math.max(5, LAB_CFG.bilanPaires|0||25) };
  labSave(st); renderLab();
  showToast(_labRunning ? '📏 Mesure lancée' : '📏 Mesure programmée : démarre le Labo');
  if(_labRunning) _labPlanifier(_labPomper, 50);
}
// Book issu du Labo — couche SEPAREE du OPENING_BOOK historique (mine des
// vraies parties AO/MIGS), jamais melangee a lui. Consultee uniquement en
// repli quand le book historique n'a rien pour la position (voir
// getOpeningMove). Les 6 premiers coups de chaque partie du Labo sont un
// tirage ALEATOIRE (diversification voulue, pas un choix de qualite) — les
// enregistrer quand meme est necessaire pour que les cles s'alignent avec
// celles du book historique (qui partent du ply 0), mais leur valeur en tant
// que "theorie" reste faible. D'ou la separation stricte : jamais fusionne
// aux frequences reelles, seulement un dernier recours.
const LAB_BOOK_KEY = 'abaLabBookLearned';
const LAB_BOOK_MAX_PLY = 10;   // meme profondeur que le book historique
function _labMineBook(moves) {
  if (!moves || !moves.length) return;
  const savedBoard = board, savedCB = CapturedByBlack.get(), savedCW = CapturedByWhite.get();
  try {
    board = {}; CapturedByBlack.set(0); CapturedByWhite.set(0);
    // Meme position de depart standard que _duelSetup (cote worker) — verifiee
    // par decodage direct de sa chaine de depart : NOIR est en bas (lignes 6-8),
    // BLANC en haut (lignes 0-2). Sens inverse de ce a quoi on pourrait s'attendre
    // par habitude — corrige apres l'avoir eu a l'envers au premier jet, attrape
    // par le test unitaire (le coup mine ne correspondait a aucun coup legal reel).
    const rowsBlack=["6,2","6,3","6,4","7,0","7,1","7,2","7,3","7,4","7,5","8,0","8,1","8,2","8,3","8,4"];
    const rowsWhite=["0,0","0,1","0,2","0,3","0,4","1,0","1,1","1,2","1,3","1,4","1,5","2,2","2,3","2,4"];
    rowsBlack.forEach(function(k){ board[k]='black'; }); rowsWhite.forEach(function(k){ board[k]='white'; });

    let overlay = {};
    try { overlay = JSON.parse(localStorage.getItem(LAB_BOOK_KEY) || '{}'); } catch(e) { overlay = {}; }
    if (!overlay.standard) overlay.standard = {};

    const playedLabels = [];
    for (let i = 0; i < moves.length && i < LAB_BOOK_MAX_PLY; i++) {
      const mv = moves[i];
      const info = validateMove(mv.cells, mv.dir, mv.col);
      if (!info || !info.valid) break;
      const label = moveToPlayStrategy(mv.cells, mv.dir, info.type);
      if (!label) break;
      const key = playedLabels.join(',');
      if (!overlay.standard[key]) overlay.standard[key] = {};
      overlay.standard[key][label] = (overlay.standard[key][label] || 0) + 1;
      playedLabels.push(label);
      applyMove({ cells: mv.cells, dir: mv.dir, info: info, type: info.type, eject: info.ejection }, mv.col);
    }
    try { localStorage.setItem(LAB_BOOK_KEY, JSON.stringify(overlay)); } catch(e) {}
  } catch(e) {
    // jamais bloquant pour le Labo — une erreur de minage ne doit pas arreter les duels
  } finally {
    board = savedBoard; CapturedByBlack.set(savedCB); CapturedByWhite.set(savedCW);
  }
}
/* Le Labo s'ouvre desormais comme une page a part entiere, pas comme une
   fenetre : sur telephone, une boite de 520 px plafonnee a 84vh rendait les
   tableaux illisibles. Le contenu est deplace une seule fois du modal vers la
   page, et les styles propres a la fenetre sont neutralises. */
function _labMigrateToPage(){
  const modal=document.getElementById('lab-modal');
  const host=document.getElementById('page-lab-host');
  if(!modal||!host) return false;
  const box=modal.firstElementChild;
  if(box && !host.firstElementChild){
    box.style.maxWidth='none'; box.style.width='auto'; box.style.maxHeight='none';
    box.style.border='none'; box.style.background='transparent'; box.style.padding='0';
    box.style.overflow='visible';
    // le titre et la croix de fermeture font double emploi avec l'en-tete de page
    const head=box.firstElementChild;
    if(head) head.style.display='none';
    host.appendChild(box);
  }
  return !!host.firstElementChild;
}
function openLabModal(){
  if (typeof kidsMode !== 'undefined' && kidsMode) { showToast('🧒 Le Labo IA n\'est pas disponible en mode Enfant'); return; }
  _labMigrateToPage();
  if (typeof showPage === 'function') showPage('lab');
  if (typeof laboOnglet === 'function') laboOnglet(_laboOngletMemo());   // v2.70 : le dernier onglet ouvert
  else if (typeof renderLab === 'function') renderLab();
}
/* Conservee pour les appels existants : il n'y a plus de fenetre a fermer,
   on revient simplement a l'accueil. */
function closeLabModal(){
  const m=document.getElementById('lab-modal');
  if(m) m.style.display='none';
  if (typeof showPage === 'function') showPage('home');
}
// ══ Outils avancés du Labo (programmeurs) ══
// les champs absents (criteres de KAAH masques) gardent la valeur du champion
function _labWeightsFromInputs(){
  const w=_labComplet(labLoad().champion);
  SPSA_KEYS.forEach(function(k){
    const el=document.getElementById('lw-'+k);
    if(el) w[k]=Math.max(0, parseFloat(el.value)||0);
  });
  return w;
}
function labApplyChampion(){
  const w=_labWeightsFromInputs();
  const st=labLoad(); st.champion=w; st.championGen=st.gen;
  _labNoterChampion(st, 'défini à la main');
  st.cands=labMutants(w, st.gen, st.lastGood); st.candsGen=st.gen; st.confirm=null; st.bilan=null;
  if(LAB_CFG.mode==='spsa') st.spsa=_spsaInit(w);
  _labNouvellePhase(st, _labPhasePrincipale());
  labSave(st);
  try{ localStorage.setItem('abaLabChampion', JSON.stringify(w)); }catch(e){}
  applyLabChampion();
  showToast('\ud83c\udff3\ufe0f Champion redéfini manuellement \u2014 nouveaux mutants générés');
  renderLab();
}
function labAddCustomMutant(){
  const w=_labWeightsFromInputs();
  const st=labLoad();
  const ch=_labComplet(st.champion);
  const diff=SPSA_KEYS.filter(function(k){return w[k]!==ch[k];}).map(function(k){return (LAB_NOMS[k]||k)+' '+ch[k]+'\u2192'+w[k];});
  if(!diff.length){ showToast('Aucune différence avec le champion'); return; }
  if(st.phase!=='screen'){ showToast('Ajout possible seulement pendant le tri des mutants (mode SPRT)'); return; }
  st.cands.push({name:'\ud83d\udd27 '+diff.join(', '), w:w, key:null, penta:_labPentaVide(), half:{}, fait:{}, stop:false});
  labSave(st);
  showToast('\u2795 Mutant personnalisé ajouté au tri');
  renderLab();
}
function labResetWeightsInputs(){
  const ch=_labComplet(labLoad().champion);
  SPSA_KEYS.forEach(function(k){ const el=document.getElementById('lw-'+k); if(el) el.value=ch[k]; });
}
function labCfgSet(key, val){
  const num=parseFloat(val);
  if(isNaN(num)) return;
  LAB_CFG[key]=num; labCfgSave();
  if(key==='kaah' && typeof showToast==='function') showToast(num ? 'Critères de KAAH réglés par le Labo à partir de la prochaine génération' : 'Le Labo ne règle plus les critères de KAAH (prochaine génération)');
  if(key==='threads'){ if(_labRunning) _labPlanifier(_labPomper, 50); renderLab(); }
}
function labCfgReset(){
  LAB_CFG=Object.assign({}, LAB_CFG_DEFAULT); labCfgSave();
  showToast('\u2699 Paramètres réinitialisés');
  renderLab();
}
// ══ JOURNAL DATA (analyse) : historique complet des parties, persistant ══
const LAB_DATA_KEY='abaLabDataLog', LAB_DATA_MAX=2000;
function _labDataLoad(){ try{ return JSON.parse(localStorage.getItem(LAB_DATA_KEY)||'[]'); }catch(e){ return []; } }
function _labDataPush(row){
  try{
    const log=_labDataLoad(); log.push(row);
    if(log.length>LAB_DATA_MAX) log.splice(0, log.length-LAB_DATA_MAX);
    localStorage.setItem(LAB_DATA_KEY, JSON.stringify(log));
  }catch(e){}
}
function _labDataClear(){ try{ localStorage.removeItem(LAB_DATA_KEY); }catch(e){} showToast('\ud83d\uddd1 Journal data effac\u00e9'); renderLab(); }
function _dl(filename, text, mime){
  try{
    const blob=new Blob([text],{type:mime||'text/plain'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
    return true;
  }catch(e){ try{ navigator.clipboard.writeText(text); showToast('\ud83d\udccb Copi\u00e9 (t\u00e9l\u00e9chargement indisponible)'); }catch(e2){} return false; }
}
// Export CSV : une ligne par partie, colonnes plates (les poids A et B \u00e9clat\u00e9s)
function labExportCSV(){
  const log=_labDataLoad();
  if(!log.length){ showToast('Aucune partie \u00e0 exporter \u2014 lance le Labo'); return; }
  const keys=SPSA_KEYS;
  const head=['iso_time','gen','phase','mutant','mut_key','winner','why','plies','cap_black','cap_white','colorA','seed','pair']
    .concat(keys.map(function(k){return 'A_'+k;})).concat(keys.map(function(k){return 'B_'+k;}));
  const rows=[head.join(',')];
  log.forEach(function(r){
    const line=[
      new Date(r.t).toISOString(), r.gen, r.phase, '"'+String(r.mutant).replace(/"/g,'""')+'"', r.mutKey,
      r.winner, r.why, r.plies, r.cb, r.cw, r.colorA, r.seed, (r.paire!=null?r.paire:'')
    ];
    keys.forEach(function(k){ line.push(r.wA?(r.wA[k]!=null?r.wA[k]:0):''); });
    keys.forEach(function(k){ line.push(r.wB?(r.wB[k]!=null?r.wB[k]:0):''); });
    rows.push(line.join(','));
  });
  _dl('abalab-parties-'+new Date().toISOString().slice(0,10)+'.csv', rows.join('\n'), 'text/csv');
  showToast('\ud83d\udcca '+log.length+' parties export\u00e9es en CSV');
}
// Export JSON brut du journal (pour pandas/jq)
function labExportDataJSON(){
  const log=_labDataLoad();
  if(!log.length){ showToast('Aucune partie \u00e0 exporter'); return; }
  _dl('abalab-parties-'+new Date().toISOString().slice(0,10)+'.json', JSON.stringify(log,null,2), 'application/json');
  showToast('\ud83d\udce6 '+log.length+' parties (JSON)');
}
// ── Statistiques agr\u00e9g\u00e9es pour le tableau de bord ──
function _labStats(){
  const log=_labDataLoad();
  const s={ n:log.length, winA:0, draw:0, winB:0, byColorAwin:{black:0,white:0}, byColorAn:{black:0,white:0},
            whyCount:{}, plies:[], byGen:{} };
  log.forEach(function(r){
    if(r.winner==='A')s.winA++; else if(r.winner==='D')s.draw++; else s.winB++;
    if(r.colorA==='black'||r.colorA==='white'){ s.byColorAn[r.colorA]++; if(r.winner==='A')s.byColorAwin[r.colorA]++; }
    s.whyCount[r.why]=(s.whyCount[r.why]||0)+1;
    if(typeof r.plies==='number')s.plies.push(r.plies);
    s.byGen[r.gen]=s.byGen[r.gen]||{w:0,n:0}; s.byGen[r.gen].n++; if(r.winner==='A')s.byGen[r.gen].w++;
  });
  s.plies.sort(function(a,b){return a-b;});
  s.pliesMed = s.plies.length? s.plies[Math.floor(s.plies.length/2)] : 0;
  s.pliesMean = s.plies.length? (s.plies.reduce(function(a,b){return a+b;},0)/s.plies.length) : 0;
  s.pliesMin = s.plies.length? s.plies[0] : 0;
  s.pliesMax = s.plies.length? s.plies[s.plies.length-1] : 0;
  return s;
}

function labExport(){
  const dump={ state:labLoad(), cfg:LAB_CFG, champion:(function(){try{return JSON.parse(localStorage.getItem('abaLabChampion')||'null');}catch(e){return null;}})() };
  const txt=JSON.stringify(dump,null,2);
  try{
    const blob=new Blob([txt],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='abalab-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
    showToast('\ud83d\udcbe État du Labo exporté');
  }catch(e){
    try{ navigator.clipboard.writeText(txt); showToast('\ud83d\udccb État copié dans le presse-papier'); }
    catch(e2){ showToast('Export impossible sur ce navigateur'); }
  }
}
function labImportPrompt(){
  const el=document.getElementById('lab-import-file'); if(el) el.click();
}
function labImportFile(input){
  const f=input.files&&input.files[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload=function(){
    try{
      const d=JSON.parse(rd.result);
      if(d.cfg){ LAB_CFG=Object.assign({}, LAB_CFG_DEFAULT, d.cfg); labCfgSave(); }
      if(d.state && d.state.champion && d.state.phase){ labSave(d.state); }
      if(d.champion){ localStorage.setItem('abaLabChampion', JSON.stringify(d.champion)); }
      applyLabChampion();
      showToast('\ud83d\udce5 État du Labo importé');
      renderLab();
    }catch(e){ showToast('\u274c Fichier invalide'); }
  };
  rd.readAsText(f);
  input.value='';
}
function labToggleAdvanced(){
  const el=document.getElementById('lab-adv');
  if(el){ el.style.display = (el.style.display==='none'||!el.style.display) ? 'block':'none'; }
}
function _labNum(id,key,val,step,min,max){
  return '<label style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;margin:3px 0">'
    +'<span style="color:var(--muted)">'+id+'</span>'
    +'<input type="number" value="'+val+'" step="'+(step||1)+'"'+(min!=null?' min="'+min+'"':'')+(max!=null?' max="'+max+'"':'')
    +' onchange="labCfgSet(\''+key+'\',this.value)" style="width:72px;background:var(--surface);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:2px 6px"></label>';
}
function labSetMode(m){
  LAB_CFG.mode=m; labCfgSave();
  const st=labLoad();
  if(!st.spsa || !st.spsa.theta) st.spsa=_spsaInit(st.champion);
  // un test en cours (confirmation, bilan) va a son terme ; sinon on passe tout de suite au nouveau mode
  if(st.phase==='screen' || st.phase==='spsa'){ _labRetourPrincipal(st); }
  labSave(st);
  showToast(m==='spsa'?'Mode SPSA activé (optimisation continue, vérifiée avant adoption)':'Mode SPRT activé (test A/B)');
  renderLab();
  if(_labRunning) _labPlanifier(_labPomper, 50);
}
function labSpsaReset(){
  if(!confirm('Réinitialiser SPSA ? (θ revient au champion actuel, trajectoire effacée)')) return;
  const st=labLoad(); st.spsa=_spsaInit(st.champion);
  if(st.phase==='spsa') _labNouvellePhase(st,'spsa');
  labSave(st);
  showToast('SPSA réinitialisé'); renderLab();
}
function renderLabAdvanced(){
  const el=document.getElementById('lab-adv'); if(!el) return;
  const st=labLoad(); const c=LAB_CFG;
  let h='<div style="border-top:1px solid var(--border);margin-top:12px;padding-top:10px">';

  // 0. Mode d'optimisation
  h+='<div style="font-size:12px;font-weight:700;margin-bottom:6px">\u2699 Mode d\'optimisation</div>';
  h+='<div style="display:flex;gap:6px;margin-bottom:4px">'
    +'<button class="ctrl-btn" onclick="labSetMode(\'sprt\')" style="flex:1;padding:5px;font-size:11px;'+(c.mode!=='spsa'?'border-color:var(--gold);color:var(--gold)':'')+'">SPRT (test A/B)</button>'
    +'<button class="ctrl-btn" onclick="labSetMode(\'spsa\')" style="flex:1;padding:5px;font-size:11px;'+(c.mode==='spsa'?'border-color:var(--gold);color:var(--gold)':'')+'">SPSA (continu)</button></div>';
  h+='<div style="font-size:10px;color:var(--muted);margin-bottom:8px">'
    +(c.mode==='spsa'
      ? 'SPSA : perturbe les '+_labCles().length+' poids simultan\u00e9ment, joue \u03b8+ contre \u03b8\u2212, pousse tous les poids vers l\'am\u00e9lioration. Trouve les interactions entre poids. Toutes les '+c.spsaVerif+' it\u00e9rations, \u03b8 est v\u00e9rifi\u00e9 contre le champion (SPRT par paires) : l\u2019IA ne l\u2019utilise qu\u2019apr\u00e8s adoption.'
      : 'SPRT : teste une mutation \u00e0 la fois, par paires d\u2019ouvertures, avec arr\u00eat s\u00e9quentiel. Verdict adopt\u00e9 / rejet\u00e9 / ind\u00e9cis.')+'</div>';

  // Bloc état SPSA (si mode actif)
  if(c.mode==='spsa' && st.spsa){
    const sp=st.spsa;
    h+='<div style="background:var(--surface);border-radius:8px;padding:8px;margin-bottom:8px">';
    h+='<div style="font-size:12px;font-weight:700">\ud83e\uddec It\u00e9ration '+sp.iter+' / '+c.spsaIters+' \u00b7 prochaine v\u00e9rification : '+Math.min(c.spsaIters, sp.prochVerif||c.spsaIters)+'</div>';
    h+='<div style="font-size:11px;color:var(--muted);margin:4px 0">\u03b8 courant : '+_labPoidsTexte(sp.theta)+'</div>';
    // mini-graphe : évolution d'un poids représentatif (cohesion) au fil des itérations
    const H=sp.thetaHist||[];
    if(H.length>=2){
      const W=260,HH=44,pad=4;
      const clesT=_labCles();
      clesT.forEach(function(key,ki){
        const cols=['#d4af37','#4a9463','#c0653b','#5b8bd4','#a069c0','#c94f6d','#4fb8a8','#e0955f','#b8b04a','#7a8fd4','#d47a9b','#5fb86a','#c9a06b','#8ad4c9','#d4c25b','#9b7ad4'];
        const vals=H.map(function(p){return p.theta[key];});
        const mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals), sp2=Math.max(0.1,mx-mn);
        const pts=H.map(function(p,i){ const x=pad+i/(H.length-1)*(W-2*pad); const y=HH-pad-((p.theta[key]-mn)/sp2)*(HH-2*pad); return x.toFixed(1)+','+y.toFixed(1); }).join(' ');
        if(ki===0) h+='<svg viewBox="0 0 '+W+' '+HH+'" style="width:100%;height:44px;background:var(--surface2,#12161c);border-radius:6px">';
        h+='<polyline points="'+pts+'" fill="none" stroke="'+cols[ki]+'" stroke-width="1.2" opacity="0.85"/>';
        if(ki===clesT.length-1) h+='</svg>';
      });
      h+='<div style="font-size:9px;color:var(--muted)">trajectoire des '+clesT.length+' poids (normalis\u00e9e) \u00b7 W/D/L \u03b8+ : '+sp.wins+'/'+sp.draws+'/'+sp.losses+'</div>';
    }
    h+='<button class="ctrl-btn" onclick="labSpsaReset()" style="width:auto;padding:3px 10px;font-size:11px;margin-top:4px">\u21ba R\u00e9init SPSA</button>';
    h+='</div>';
  }

  // 1. Édition des poids du champion
  h+='<div style="font-size:12px;font-weight:700;margin-bottom:6px">\ud83c\udff3\ufe0f Poids du champion</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">';
  const chAv=_labComplet(st.champion);
  _labCles().forEach(function(k){
    h+='<label style="font-size:11px;color:var(--muted)">'+(LAB_NOMS[k]||k)+' <span style="opacity:.6">'+k+'</span><input type="number" id="lw-'+k+'" value="'+chAv[k]+'" step="'+(k==='cases'?0.1:0.5)+'" min="0" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:2px 6px;margin-top:2px"></label>';
  });
  h+='</div>';
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">';
  h+='<button class="ctrl-btn" onclick="labApplyChampion()" style="width:auto;padding:4px 10px;font-size:11px">Définir comme champion</button>';
  h+='<button class="ctrl-btn" onclick="labAddCustomMutant()" style="width:auto;padding:4px 10px;font-size:11px">\u2795 Tester comme mutant</button>';
  h+='<button class="ctrl-btn" onclick="labResetWeightsInputs()" style="width:auto;padding:4px 10px;font-size:11px">\u21ba</button>';
  h+='</div>';

  // 2. Paramètres SPRT / duels
  h+='<div style="font-size:12px;font-weight:700;margin:12px 0 6px">\u2699 Protocole & duels</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:2px 16px">';
  h+=_labNum('Fils de calcul (0 = auto : '+(function(){ const s=c.threads; c.threads=0; const n=_labNbFils(); c.threads=s; return n; })()+')','threads',c.threads,1,0,8);
  h+=_labNum('Tri : parties/mutant (par paires)','screenTarget',c.screenTarget,2,2,40);
  h+=_labNum('Tri : ms/coup','screenMs',c.screenMs,50,100,5000);
  h+=_labNum('Tri : demi-coups max','screenPlies',c.screenPlies,5,20,200);
  h+=_labNum('Tri : seuil nulle','screenDraw',c.screenDraw,50,50,3000);
  h+=_labNum('Confirmation : ms/coup','confMs',c.confMs,50,100,10000);
  h+=_labNum('Confirmation : demi-coups max','confPlies',c.confPlies,5,20,200);
  h+=_labNum('Confirmation : seuil nulle','confDraw',c.confDraw,50,50,3000);
  h+=_labNum('Confirmation : paires max','confCapPaires',c.confCapPaires,10,10,2000);
  h+=_labNum('Confirmation : paires min avant verdict','confMinPaires',c.confMinPaires,1,1,100);
  h+=_labNum('Bilan : paires (0 = jamais)','bilanPaires',c.bilanPaires,5,0,500);
  h+=_labNum('SPRT : Elo H0','elo0',c.elo0,1,-50,50);
  h+=_labNum('SPRT : Elo H1','elo1',c.elo1,1,1,200);
  h+=_labNum('SPRT : alpha','alpha',c.alpha,0.01,0.001,0.2);
  h+=_labNum('SPRT : beta','beta',c.beta,0.01,0.001,0.2);
  h+=_labNum('Ouverture : demi-coups','openingPlies',c.openingPlies,1,0,20);
  h+=_labNum('Ouverture : fenêtre équilibre','balanceWindow',c.balanceWindow,50,100,3000);
  h+=_labNum('Générations max','maxGen',c.maxGen,1,1,500);
  h+='<label style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;margin:3px 0"><span style="color:var(--muted)">Recherche adaptative</span><input type="checkbox" '+((c.adaptive!==0)?'checked':'')+' onchange="labCfgSet(\'adaptive\', this.checked?1:0)"></label>';
  h+='<label style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;margin:3px 0"><span style="color:var(--muted)">R\u00e9gler aussi les crit\u00e8res de KAAH</span><input type="checkbox" '+(c.kaah?'checked':'')+' onchange="labCfgSet(\'kaah\', this.checked?1:0);renderLabAdvanced()"></label>';
  if(c.mode==='spsa'){
    h+='<div style="grid-column:1/3;font-size:11px;font-weight:700;margin-top:6px;color:var(--gold)">Hyperparamètres SPSA</div>';
    h+=_labNum('SPSA : a (pas apprentissage)','spsaA',c.spsaA,5,1,500);
    h+=_labNum('SPSA : c (pas perturbation)','spsaC',c.spsaC,0.1,0.1,10);
    h+=_labNum('SPSA : alpha','spsaAlpha',c.spsaAlpha,0.01,0.1,1);
    h+=_labNum('SPSA : gamma','spsaGamma',c.spsaGamma,0.01,0.01,1);
    h+=_labNum('SPSA : paires/itération','spsaPairs',c.spsaPairs,1,1,10);
    h+=_labNum('SPSA : itérations max','spsaIters',c.spsaIters,10,10,5000);
    h+=_labNum('SPSA : vérifier toutes les … itérations','spsaVerif',c.spsaVerif,10,5,1000);
  }
  h+='</div>';
  const B=_labBounds();
  h+='<div style="font-size:11px;color:var(--muted);margin-top:4px">Bornes SPRT dérivées : adoption si LLR \u2265 '+B.up.toFixed(2)+', rejet si \u2264 '+B.lo.toFixed(2)+'</div>';

  // 3. Import / export / reset config
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">';
  h+='<button class="ctrl-btn" onclick="labExport()" style="width:auto;padding:4px 10px;font-size:11px">\ud83d\udcbe Exporter JSON</button>';
  h+='<button class="ctrl-btn" onclick="labImportPrompt()" style="width:auto;padding:4px 10px;font-size:11px">\ud83d\udce5 Importer</button>';
  h+='<button class="ctrl-btn" onclick="labCfgReset()" style="width:auto;padding:4px 10px;font-size:11px">\u2699 Params par défaut</button>';
  h+='<input type="file" id="lab-import-file" accept="application/json,.json" style="display:none" onchange="labImportFile(this)">';
  h+='</div>';

  h+='<div style="font-size:10px;color:var(--muted);margin-top:8px;line-height:1.5">\ud83d\udca1 Astuce : baisse <code>SPRT alpha/beta</code> pour des verdicts plus stricts (plus de parties), monte <code>Elo H1</code> pour ne retenir que de grosses améliorations (beaucoup moins de parties). Édite les poids puis \u00ab Tester comme mutant \u00bb pour lancer ta propre hypothèse dans le tri en cours. Les parties trop longues sont arbitrées par consensus : la victoire n\u2019est donnée que si les deux évaluations sont d\u2019accord.</div>';

  // ── 4. Données & statistiques (pour analystes / data) ──
  const S=_labStats();
  h+='<div style="font-size:12px;font-weight:700;margin:14px 0 6px;border-top:1px solid var(--border);padding-top:10px">\ud83d\udcca Donn\u00e9es & statistiques ('+S.n+' parties)</div>';
  if(S.n===0){
    h+='<div style="font-size:11px;color:var(--muted)">Lance le Labo : chaque partie alimente un journal analysable (export CSV/JSON ci-dessous).</div>';
  } else {
    function pct(x,n){ return n? Math.round(100*x/n) : 0; }
    // Bandeau r\u00e9sultats
    h+='<div style="display:flex;gap:6px;margin:6px 0">'
      +'<div style="flex:'+Math.max(1,S.winA)+';background:#3a7a4a;height:22px;border-radius:4px 0 0 4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff">'+pct(S.winA,S.n)+'%</div>'
      +'<div style="flex:'+Math.max(1,S.draw)+';background:#555;height:22px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff">'+pct(S.draw,S.n)+'%</div>'
      +'<div style="flex:'+Math.max(1,S.winB)+';background:#8a3a3a;height:22px;border-radius:0 4px 4px 0;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff">'+pct(S.winB,S.n)+'%</div></div>';
    h+='<div style="font-size:10px;color:var(--muted);display:flex;justify-content:space-between"><span>\ud83d\udfe2 mutant '+S.winA+'</span><span>\u26aa nulle '+S.draw+'</span><span>\ud83d\udd34 champion '+S.winB+'</span></div>';
    // Biais premier joueur (colorA)
    const wbB=pct(S.byColorAwin.black,S.byColorAn.black), wbW=pct(S.byColorAwin.white,S.byColorAn.white);
    h+='<div style="font-size:11px;margin-top:8px"><b>Win-rate mutant selon sa couleur</b> (d\u00e9tecte un biais 1er joueur) :<br>'
      +'\u26ab Noirs : '+wbB+'% ('+S.byColorAn.black+' parties) \u00b7 \u26aa Blancs : '+wbW+'% ('+S.byColorAn.white+' parties)</div>';
    // Longueur des parties
    h+='<div style="font-size:11px;margin-top:8px"><b>Longueur (demi-coups)</b> : min '+S.pliesMin+' \u00b7 m\u00e9diane '+S.pliesMed+' \u00b7 moy '+S.pliesMean.toFixed(1)+' \u00b7 max '+S.pliesMax+'</div>';
    // Histogramme raisons de fin
    h+='<div style="font-size:11px;margin-top:8px"><b>Raisons de fin</b></div>';
    const whyLabels={'6capt':'6 captures','adj3':'\u00e9cart 3','adjCap':'captures (cap)','adjCap1':'1 bille, mieux plac\u00e9 (cap)','adjEval':'\u00e9val (cap)','draw':'nulle','draw1':'nulle, 1 bille (cap)','noMove':'bloqu\u00e9','time':'temps'};
    Object.keys(S.whyCount).sort(function(a,b){return S.whyCount[b]-S.whyCount[a];}).forEach(function(k){
      const c=S.whyCount[k], p=pct(c,S.n);
      h+='<div style="display:flex;align-items:center;gap:6px;margin:2px 0;font-size:10px"><span style="width:90px;color:var(--muted)">'+(whyLabels[k]||k)+'</span>'
        +'<div style="flex:1;background:var(--surface);border-radius:3px;height:12px;overflow:hidden"><div style="height:100%;width:'+p+'%;background:var(--gold)"></div></div>'
        +'<span style="width:52px;text-align:right">'+c+' ('+p+'%)</span></div>';
    });
  }
  // Boutons export data
  h+='<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px">';
  h+='<button class="ctrl-btn" onclick="labExportCSV()" style="width:auto;padding:4px 10px;font-size:11px">\ud83d\udcca Export CSV (parties)</button>';
  h+='<button class="ctrl-btn" onclick="labExportDataJSON()" style="width:auto;padding:4px 10px;font-size:11px">\ud83d\udce6 Export JSON (parties)</button>';
  h+='<button class="ctrl-btn" onclick="_labDataClear()" style="width:auto;padding:4px 10px;font-size:11px">\ud83d\uddd1 Vider le journal</button>';
  h+='</div>';
  h+='<div style="font-size:10px;color:var(--muted);margin-top:6px">Une ligne par partie : mutant, poids A/B \u00e9clat\u00e9s, couleur, seed, r\u00e9sultat, coups, raison. Pr\u00eat pour pandas / R / tableur.</div>';

  h+='</div>';
  el.innerHTML=h;
}
// ══ REPLAY des parties du Labo (rejoue le duel déterministe et affiche les positions) ══
let _labReplayFrames=null, _labReplayPos=0, _labReplayTimer=null;
function labReplay(logIdx){
  const st=labLoad();
  const g=(st.gameLog||[])[logIdx];
  if(!g || !g.moves){ showToast('Partie non rejouable (ancienne entrée)'); return; }
  const modal=document.getElementById('lab-replay-modal'); if(modal) modal.style.display='flex';
  const info=document.getElementById('lr-info'); if(info) info.textContent='⏳ Rejeu de la partie…';
  // worker dédié au replay (ne perturbe pas le Labo qui tourne)
  try{
    if(!_labReplayWorker){
      const blob=new Blob([AI_WORKER_CODE],{type:'application/javascript'});
      _labReplayWorker=new Worker(URL.createObjectURL(blob));
      _labReplayWorker.onmessage=function(e){
        const d=e.data; if(!d||!d.replayGame) return;
        if(d.error){ if(info) info.textContent='❌ '+d.error; return; }
        _labReplayFrames=d.frames||[]; _labReplayPos=0;
        _labReplayMeta={ name:g.name, result:d.result, w:g.w };
        _labReplayRender();
      };
    }
    _labReplayWorker.postMessage({replayGame:true, colorA:g.colorA, seed:g.seed, moves:g.moves, depart:g.depart||null,
      result:{winner:(g.res||(g.w==='mutant'?'A':(g.w==='nulle'?'D':'B'))),plies:g.plies,why:g.why}, id:Date.now()});
  }catch(e){ if(info) info.textContent='❌ Replay indisponible sur ce navigateur'; }
}
let _labReplayMeta=null;
function _labReplayRender(){
  const cv=document.getElementById('lr-canvas'); const info=document.getElementById('lr-info');
  if(!cv || !_labReplayFrames || !_labReplayFrames.length) return;
  const f=_labReplayFrames[_labReplayPos];
  _labDrawFrame(cv, f);
  const total=_labReplayFrames.length-1;
  const meta=_labReplayMeta||{};
  const res=meta.result||{};
  const winLabel = (res.winner==='A'?'🟢 ':(res.winner==='D'?'⚪ ':'🔴 '))+(meta.w||(res.winner==='A'?'mutant':(res.winner==='D'?'nulle':'champion')));
  if(info) info.textContent='Coup '+_labReplayPos+'/'+total+' · '+(meta.name||'')+' · capt ⚫'+f.cb+' ⚪'+f.cw+(_labReplayPos===total?(' · '+winLabel):'');
}
function _labDrawFrame(cv, frame){
  const ctx=cv.getContext('2d'); const W=cv.width, H=cv.height;
  ctx.clearRect(0,0,W,H);
  const ROWS=[5,6,7,8,9,8,7,6,5];
  const R=Math.min(W,H)/22;
  const cx=W/2, cy=H/2;
  const pos=function(r,c){ return { x: cx + (c-(ROWS[r]-1)/2)*(R*2.05), y: cy + (r-4)*(R*1.8) }; };
  // ── Plateau bois (même palette que le plateau principal) ──
  const corners=[pos(0,0),pos(0,4),pos(4,8),pos(8,4),pos(8,0),pos(4,0)];
  let mx=0,my=0; corners.forEach(function(p){mx+=p.x;my+=p.y;}); mx/=6; my/=6;
  function ring(padding,rad){
    ctx.beginPath();
    const pts=corners.map(function(p){ const dx=p.x-mx,dy=p.y-my,d=Math.hypot(dx,dy); return {x:p.x+dx/d*padding,y:p.y+dy/d*padding}; });
    for(let i=0;i<pts.length;i++){
      const cur=pts[i], next=pts[(i+1)%pts.length];
      if(i===0){ const prev=pts[pts.length-1], d1=Math.hypot(cur.x-prev.x,cur.y-prev.y);
        ctx.moveTo(cur.x+(prev.x-cur.x)/d1*rad, cur.y+(prev.y-cur.y)/d1*rad); }
      ctx.arcTo(cur.x,cur.y,next.x,next.y,rad);
    }
    ctx.closePath();
  }
  // contour sombre
  ctx.save(); ring(R+14,10);
  ctx.fillStyle='#3a2614'; ctx.shadowColor='rgba(0,0,0,0.55)'; ctx.shadowBlur=14; ctx.shadowOffsetY=3; ctx.fill();
  ctx.restore();
  // surface bois + veines
  ring(R+7,8);
  const wood=ctx.createLinearGradient(mx-140,my-130,mx+140,my+130);
  wood.addColorStop(0,'#cda472'); wood.addColorStop(0.5,'#a9763f'); wood.addColorStop(1,'#85562d');
  ctx.fillStyle=wood; ctx.fill();
  ctx.save(); ring(R+7,8); ctx.clip();
  ctx.lineWidth=1.4; ctx.globalAlpha=0.15;
  for(let g=0;g<16;g++){
    const y0=my-120+g*16;
    ctx.strokeStyle=(g%2)?'#6b4222':'#dcb888';
    ctx.beginPath();
    for(let x=mx-160;x<=mx+160;x+=9){
      const yy=y0+Math.sin((x+g*37)/40)*4+Math.sin(x/90)*6;
      if(x===mx-160)ctx.moveTo(x,yy); else ctx.lineTo(x,yy);
    }
    ctx.stroke();
  }
  ctx.globalAlpha=1; ctx.restore();
  // ── Cases creusées + billes ──
  const canRealMarbles=(typeof drawMarble==='function' && typeof HEX_RADIUS!=='undefined');
  const k=canRealMarbles ? (R-1)/(HEX_RADIUS-6) : 1;
  for(let r=0;r<9;r++){
    for(let c=0;c<ROWS[r];c++){
      const p=pos(r,c);
      // creux de la case
      const hole=ctx.createRadialGradient(p.x,p.y-R*0.2,R*0.1,p.x,p.y,R*0.95);
      hole.addColorStop(0,'rgba(0,0,0,0.34)'); hole.addColorStop(0.85,'rgba(0,0,0,0.22)'); hole.addColorStop(1,'rgba(255,235,200,0.10)');
      ctx.beginPath(); ctx.arc(p.x,p.y,R*0.92,0,Math.PI*2); ctx.fillStyle=hole; ctx.fill();
      const v=frame.b[r+','+c];
      if(!v) continue;
      if(canRealMarbles){
        ctx.save(); ctx.scale(k,k);
        drawMarble(ctx, p.x/k, p.y/k, v==='b'?'black':'white', false);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x,p.y,R-2,0,Math.PI*2);
        ctx.fillStyle = v==='b' ? '#1a1a1a' : '#f0ebe0'; ctx.fill();
        ctx.strokeStyle='rgba(212,175,55,0.5)'; ctx.lineWidth=1; ctx.stroke();
      }
    }
  }
}
function labReplayStep(dir){
  if(!_labReplayFrames) return;
  _labReplayPos=Math.max(0,Math.min(_labReplayFrames.length-1,_labReplayPos+dir));
  _labReplayRender();
}
function labReplayPlay(){
  if(!_labReplayFrames) return;
  if(_labReplayTimer){ clearInterval(_labReplayTimer); _labReplayTimer=null; document.getElementById('lr-play').textContent='▶'; return; }
  document.getElementById('lr-play').textContent='⏸';
  _labReplayTimer=setInterval(function(){
    if(_labReplayPos>=_labReplayFrames.length-1){ clearInterval(_labReplayTimer); _labReplayTimer=null; document.getElementById('lr-play').textContent='▶'; return; }
    _labReplayPos++; _labReplayRender();
  }, 600);
}
function closeLabReplay(){
  const m=document.getElementById('lab-replay-modal'); if(m) m.style.display='none';
  if(_labReplayTimer){ clearInterval(_labReplayTimer); _labReplayTimer=null; }
}

/* ═══ TEST AU LABO : LES CRITERES DE KAAH RENDENT-ILS L'IA PLUS FORTE ? ═══
   Demande d'Olivier (« les integrer au moteur, tests au Labo »). Duels moteur contre
   moteur (le meme duelGame que le Labo, sur ses fils de calcul -- jamais en meme temps
   que lui) : « IA actuelle + criteres de KAAH » contre « IA actuelle seule ».
   v4 : par PAIRES sur la meme ouverture (la version avec KAAH joue Noirs puis Blancs),
   plusieurs parties a la fois, verdict SPRT par paires avec les seuils du Labo
   (H0 = +0 Elo, H1 = +35 Elo, alpha = beta = 5 %) apres 8 paires au moins, ou « indecis »
   apres 200 paires. Plus besoin d'alterner les roles A et B : l'arbitrage des parties trop
   longues se fait desormais par consensus des deux evaluations. Rien n'est adopte
   automatiquement. */
const TEST_KAAH_KEY = 'abaTestKaah', TEST_KAAH_MAX_PAIRES = 200, TEST_KAAH_MIN_PAIRES = 8;
const KAAH_POIDS = { scGain: 200, scPerte: 200, cases: 1, compac: 20, sumito: 20, menace: 120, fourch: 60, piege: 40 };
let _testKaahEnCours = false, _testKaahEnVol = {};
let _testKaahPlanifier = function(f, ms){ return setTimeout(f, ms); };   // remplacable par les tests
function _testKaahVide() { return { v: 2, penta: _labPentaVide(), half: {}, fait: {}, W: 0, D: 0, L: 0, n: 0, fini: null, log: [], depart: LAB_CFG.depart || 'belgian', arbitrage: LAB_CFG.arbitrage || 1 }; }
// l'ancien format (cycles de 4 parties, roles alternes) ne se convertit pas en paires : le test repart
function _testKaahEtat() { try { const s = JSON.parse(localStorage.getItem(TEST_KAAH_KEY) || 'null'); if (s && s.v === 2) return s; } catch (e) {} return _testKaahVide(); }
function _testKaahSauver(s) { try { localStorage.setItem(TEST_KAAH_KEY, JSON.stringify(s)); } catch (e) {} }
// « IA actuelle » = ses poids complets (y compris des criteres de KAAH deja regles par le Labo)
function _testKaahPoids() { const base = _labComplet(AI_WEIGHT_PRESETS.balanced); return { base: base, kaah: Object.assign({}, base, KAAH_POIDS) }; }
function _testKaahBornes() { const B = _labBounds(); return { haut: B.up, bas: B.lo }; }
function _testKaahArreter() { _testKaahEnCours = false; _labFilsArreter(); _testKaahEnVol = {}; }
function lancerTestKaah() {
  if (_testKaahEnCours) { _testKaahArreter(); renderTestKaah('En pause.'); return; }
  if (typeof _labRunning !== 'undefined' && _labRunning) { if (typeof showToast === 'function') showToast('Le Labo tourne déjà : mets-le en pause d’abord'); return; }
  if (typeof _bancActif !== 'undefined' && _bancActif) { if (typeof showToast === 'function') showToast('Un banc d’essai du Labo tourne : mets-le en pause d’abord'); return; }
  if (_testKaahEtat().fini) _testKaahSauver(_testKaahVide());
  if (!_labFilsAssurer(_labNbFils())) { renderTestKaah('Fil de calcul indisponible sur cet appareil.'); return; }
  _testKaahEnCours = true; _testKaahEnVol = {}; renderTestKaah();
  _labPositionsPuis(function(){ if (_testKaahEnCours) _testKaahPomper(); });
}
function _testKaahPomper() {
  if (!_testKaahEnCours) return;
  const s = _testKaahEtat(), P = _testKaahPoids();
  for (let i = 0; i < _labFils.length; i++) {
    const f = _labFils[i]; if (f.tache) continue;
    const nx = _labPartieSuivante(s, TEST_KAAH_MAX_PAIRES, 'k', _testKaahEnVol); if (!nx) break;
    _testKaahEnVol[nx.cle] = 1;
    const graine = 10007 * nx.p + 13;
    _labFilLancer(f, { cle: nx.cle, job: 'kaah', p: nx.p, g: nx.g, wA: P.kaah, wB: P.base, colorA: nx.g === 0 ? 'black' : 'white',
      seed: graine, ms: LAB_CFG.confMs, plies: LAB_CFG.confPlies, draw: LAB_CFG.confDraw, depart: _labDepart(s.depart || 'hasard', graine), arbitrage: s.arbitrage || 1 }, _testKaahFin);
  }
  renderTestKaah();
}
function _testKaahFin(t, d) {
  delete _testKaahEnVol[t.cle];
  if (!_testKaahEnCours) return;
  if (d.timeout) { _testKaahPlanifier(_testKaahPomper, 500); return; }
  if (d.error) { _testKaahArreter(); renderTestKaah('Erreur moteur : ' + d.error); return; }
  const r = d.result || { winner: 'D' }, st = _testKaahEtat(), sc = _labScoreA(r);
  if (st.fini) return;
  if (sc === 1) st.W++; else if (sc === 0.5) st.D++; else st.L++;
  st.n++; st.log.unshift({ k: sc === 1 ? 'K' : (sc === 0.5 ? 'D' : 'B'), why: r.why || '', plies: r.plies || 0 }); if (st.log.length > 10) st.log.length = 10;
  if (_labPaireAjouter(st, t.p, t.g, sc)) {
    const n = _labPentaN(st.penta), llr = _labLLRp(st.penta, LAB_CFG.elo0, LAB_CFG.elo1), B = _testKaahBornes();
    if (n >= TEST_KAAH_MIN_PAIRES && llr >= B.haut) st.fini = 'plus fort';
    else if (n >= TEST_KAAH_MIN_PAIRES && llr <= B.bas) st.fini = 'pas plus fort';
    else if (n >= TEST_KAAH_MAX_PAIRES) st.fini = 'indécis';
  }
  _testKaahSauver(st);
  if (st.fini) _testKaahArreter();
  renderTestKaah();
  if (_testKaahEnCours) _testKaahPlanifier(_testKaahPomper, 50);
}
function renderTestKaah(msg) {
  const hote = document.getElementById('test-kaah-host'); if (!hote) return;
  const s = _testKaahEtat(), B = _testKaahBornes(), llr = _labLLRp(s.penta, LAB_CFG.elo0, LAB_CFG.elo1), n = _labPentaN(s.penta), enCours = _labFilsEnCours();
  const verdict = s.fini === 'plus fort' ? '✅ Verdict : avec les critères de KAAH, l’IA est plus forte.'
    : s.fini === 'pas plus fort' ? '✗ Verdict : les critères de KAAH ne rendent pas l’IA plus forte (dans ce régime de test).'
    : s.fini === 'indécis' ? '❓ Indécis après ' + TEST_KAAH_MAX_PAIRES + ' paires : l’écart, s’il existe, est faible.' : '';
  hote.innerHTML = '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px;margin-top:18px">'
    + '<div style="font-size:13px;font-weight:700;color:var(--white);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Test : les critères de KAAH</div>'
    + '<div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:10px">« IA actuelle + critères de KAAH » (sumito, menace, fourchette, piège, compacité, cases, gain et perte selon le score) contre « IA actuelle seule ». '
    + 'Chaque ouverture est jouée deux fois, couleurs inversées, et le verdict compte les paires ; plusieurs parties à la fois ; ' + LAB_CFG.confMs + ' ms par coup, ' + LAB_CFG.confPlies + ' coups au plus — un régime de recherche courte : le verdict porte sur lui. '
    + 'Rien n’est adopté automatiquement. Pour <b>régler</b> ces critères plutôt que les tester en bloc, le Labo ci-dessus les essaie un par un (case « critères de KAAH » des réglages avancés).</div>'
    + '<div style="font-size:14px;color:var(--text)">' + s.n + ' parties (' + n + ' paires complètes) · avec KAAH : <b>' + s.W + '</b> victoires, ' + s.D + ' nulles, ' + s.L + ' défaites'
    + (s.n ? ' · ' + Math.round(100 * (s.W + s.D / 2) / s.n) + ' %' : '') + (n >= 2 ? ' · ' + _labEloStrP(s.penta) : '') + '</div>'
    + '<div style="font-size:11px;color:var(--muted);margin:4px 0">LLR ' + llr.toFixed(2) + ' (verdict à ≥ ' + B.haut.toFixed(2) + ' ou ≤ ' + B.bas.toFixed(2) + ', après ' + TEST_KAAH_MIN_PAIRES + ' paires au moins)</div>'
    + (verdict ? '<div style="font-size:13px;color:var(--gold);margin:8px 0">' + verdict + '</div>' : '')
    + (msg ? '<div style="font-size:12px;color:var(--muted);margin:6px 0">' + msg + '</div>' : '')
    + '<button class="ctrl-btn" onclick="lancerTestKaah()" style="width:auto;padding:6px 14px;margin-top:6px">'
    + (_testKaahEnCours ? '⏸ Pause' : (s.fini ? '↻ Recommencer le test' : (s.n ? '▶ Reprendre' : '▶ Lancer le test'))) + '</button>'
    + (_testKaahEnCours ? ' <span style="font-size:11px;color:var(--muted)">' + enCours + ' partie' + (enCours > 1 ? 's' : '') + ' en cours sur ' + _labFils.length + ' fil' + (_labFils.length > 1 ? 's' : '') + ' de calcul…</span>' : '')
    + '</div>';
}
// v2.70 : les noms en francais (avant : « center 6 · cohesion 4 », les cles du code)
function _labPoidsTexte(w){
  const ch=_labComplet(w), v=function(k){ return (LAB_NOMS[k]||k)+' '+String(Math.round(ch[k]*10)/10).replace('.',','); };
  return LAB_CLES_BASE.map(v).join(' · ') + LAB_CLES_KAAH.filter(function(k){ return ch[k]; }).map(function(k){ return ' · '+v(k); }).join('');
}
// d'ou partent les parties (v2.70) : le choix s'applique au test suivant
const LAB_DEPARTS={ belgian:'Vraies positions de Marguerite belge (recommandé)', corpus:'Vraies positions, toutes les dispositions du corpus', hasard:'Ancien départ : Standard + 6 coups au hasard' };
function labDepartSet(v){
  if(!LAB_DEPARTS[v]) return;
  LAB_CFG.depart=v; labCfgSave();
  showToast('Départ des parties : '+LAB_DEPARTS[v].toLowerCase()+' — à partir du prochain test');
  renderLab();
}
// courbe du gain reel mesure (champion contre les poids d'origine), avec la marge a 95 %
function _labCourbeMesures(M){
  const W=280, H=80, pad=8;
  const hauts=M.map(function(m){ return m.elo+m.ci; }), bas=M.map(function(m){ return m.elo-m.ci; });
  const mx=Math.max(20, Math.max.apply(null,hauts)), mn=Math.min(-20, Math.min.apply(null,bas)), sp=mx-mn;
  const x=function(i){ return M.length<2 ? W/2 : pad+i/(M.length-1)*(W-2*pad); }, y=function(v){ return H-pad-(v-mn)/sp*(H-2*pad); };
  let s='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:80px;background:var(--surface);border-radius:8px;margin-top:4px">';
  s+='<line x1="'+pad+'" x2="'+(W-pad)+'" y1="'+y(0).toFixed(1)+'" y2="'+y(0).toFixed(1)+'" stroke="var(--muted)" stroke-dasharray="3,3" stroke-width="1"/>';
  M.forEach(function(m,i){ s+='<line x1="'+x(i).toFixed(1)+'" x2="'+x(i).toFixed(1)+'" y1="'+y(m.elo+m.ci).toFixed(1)+'" y2="'+y(m.elo-m.ci).toFixed(1)+'" stroke="var(--gold)" stroke-width="1.5" opacity="0.55"/>'; });
  if(M.length>=2) s+='<polyline points="'+M.map(function(m,i){ return x(i).toFixed(1)+','+y(m.elo).toFixed(1); }).join(' ')+'" fill="none" stroke="var(--gold)" stroke-width="2"/>';
  M.forEach(function(m,i){ s+='<circle cx="'+x(i).toFixed(1)+'" cy="'+y(m.elo).toFixed(1)+'" r="3" fill="var(--gold)"/>'; });
  return s+'</svg>';
}
function renderLab(){
  const el=document.getElementById('lab-body'); if(!el) return;
  const st=labLoad();
  const useOn = localStorage.getItem('abaLabUse')!=='0';
  const ch=_labComplet(st.champion), B=_labBounds();
  const phaseNom={screen:'Tri des mutants', confirm:'Confirmation (SPRT)', bilan:'Bilan contre les poids d’origine', spsa:'SPSA', done:'Terminé'}[st.phase]||st.phase;
  let h='';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">';
  h+='<span style="font-weight:700">'+(_labRunning?'🔄 En cours':'⏸ En pause')+' · Génération '+st.gen+' · '+phaseNom+'</span>';
  h+='<span style="font-size:11px;color:var(--muted)">'+st.totalGames+' parties · '+_labNbFils()+' fil'+(_labNbFils()>1?'s':'')+' de calcul'+((LAB_CFG.threads|0)>0?'':' (auto)')+'</span></div>';
  h+='<div id="lab-live" style="font-size:11px;margin-top:6px;color:var(--muted)"></div>';
  h+='<div style="margin:8px 0;font-size:12px">Champion actuel : '+_labPoidsTexte(ch)+'</div>';
  h+='<label class="lab-options" style="margin:4px 0 10px">Les parties partent de <select onchange="labDepartSet(this.value)">'
    +Object.keys(LAB_DEPARTS).map(function(k){ return '<option value="'+k+'"'+((LAB_CFG.depart||'belgian')===k?' selected':'')+'>'+LAB_DEPARTS[k]+'</option>'; }).join('')+'</select></label>';
  if((st.departMode||'belgian')!==(LAB_CFG.depart||'belgian')) h+='<div class="lab-note">Le test en cours garde son départ ('+(LAB_DEPARTS[st.departMode||'belgian']||'').toLowerCase()+') jusqu’à son verdict.</div>';
  function bar(name, pts, n, target, note){
    const pct=target?Math.round(100*n/target):0, wr=n?Math.round(100*pts/(2*n)):0;
    return '<div style="margin:6px 0"><div style="display:flex;justify-content:space-between;gap:8px;font-size:12px"><span>'+name+(note||'')+'</span><span style="white-space:nowrap">'+(n?wr+' % · ':'')+n+'/'+target+' paires</span></div>'
      +'<div style="height:6px;background:var(--surface);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+Math.min(100,pct)+'%;background:var(--gold)"></div></div></div>';
  }
  if(st.phase==='screen' && st.cands){
    const P=_labPairesTri();
    h+='<div style="font-size:11px;color:var(--muted)">Chaque mutant joue '+P+' paires (les mêmes ouvertures pour tous) ; le meilleur, s’il atteint 50 %, passe en confirmation.</div>';
    st.cands.forEach(function(c){ h+=bar(c.name, _labPoints(c.penta), _labPentaN(c.penta), P, c.stop?' · ⏹ arrêté (ne peut plus atteindre 50 %)':''); });
  } else if(st.phase==='confirm' && st.confirm){
    const cf=st.confirm, n=_labPentaN(cf.penta), llr=_labLLRp(cf.penta, LAB_CFG.elo0, LAB_CFG.elo1);
    h+=bar('🏆 Finaliste : '+cf.name, _labPoints(cf.penta), n, LAB_CFG.confCapPaires);
    const lpct=Math.round(100*Math.min(1,Math.max(0,(llr-B.lo)/(B.up-B.lo))));
    h+='<div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px"><span>✗ rejet ('+B.lo.toFixed(2)+')</span><span>LLR '+llr.toFixed(2)+'</span><span>adoption ('+B.up.toFixed(2)+') ✓</span></div>';
    h+='<div style="height:6px;background:linear-gradient(90deg,#a33,#555,#3a3);border-radius:3px;position:relative"><div style="position:absolute;left:'+lpct+'%;top:-3px;width:2px;height:12px;background:#fff"></div></div>';
    const es=_labEloStrP(cf.penta);
    h+='<div style="font-size:11px;color:var(--muted);margin-top:4px">'+(es?('Estimation : '+es+' · '):'')+'paires : '+cf.penta.join(' / ')+' (0 à 2 points) · verdict dès que la statistique tranche, après '+LAB_CFG.confMinPaires+' paires au moins · « indécis » après '+LAB_CFG.confCapPaires+'</div>';
  } else if(st.phase==='bilan' && st.bilan){
    const b=st.bilan, n=_labPentaN(b.penta);
    h+=bar('📏 '+b.name, _labPoints(b.penta), n, b.pairs);
    const es=_labEloStrP(b.penta); if(es) h+='<div style="font-size:11px;color:var(--muted)">Pour l’instant : '+es+'</div>';
  } else if(st.phase==='spsa' && st.spsa){
    const sp=st.spsa;
    h+='<div style="font-size:12px;margin:6px 0">🧬 SPSA : itération '+sp.iter+' / '+LAB_CFG.spsaIters+' · vérification contre le champion à l’itération '+Math.min(LAB_CFG.spsaIters, sp.prochVerif||LAB_CFG.spsaIters)+'</div>';
    h+='<div style="font-size:11px;color:var(--muted)">θ en cours (pas encore utilisé par l’IA) : '+_labPoidsTexte(sp.theta)+'</div>';
  }
  // ── Gain reel mesure ──
  const M=(st.mesures||[]).filter(function(m){ return m && typeof m.elo==='number'; });
  h+='<div style="margin-top:10px;font-size:12px;font-weight:700">📈 Gain réel mesuré (champion contre les poids d’origine)</div>';
  if(M.length){
    const d=M[M.length-1];
    h+='<div style="font-size:12px;margin-top:2px">'+(d.elo>=0?'+':'')+d.elo+' Elo ± '+d.ci+' <span style="color:var(--muted);font-size:11px">(champion G'+d.gen+', '+d.paires+' paires, marge à 95 %)</span></div>';
    h+=_labCourbeMesures(M.slice(-20));
  } else {
    h+='<div style="font-size:11px;color:var(--muted)">Pas encore mesuré : se mesure après chaque adoption ('+(LAB_CFG.bilanPaires|0)+' paires).'
      +(typeof st.ancienCumul==='number'?' L’ancien « Élo cumulé » (+'+st.ancienCumul+') additionnait les estimations les plus chanceuses : il est remplacé par cette mesure.':'')+'</div>';
  }
  h+='<button class="ctrl-btn" onclick="labMesurerGain()" style="width:auto;padding:3px 10px;font-size:11px;margin-top:4px">📏 Mesurer maintenant</button>';
  // ── Journal des dernieres parties ──
  if(st.gameLog && st.gameLog.length){
    h+='<div style="margin-top:10px;font-size:12px;font-weight:700">🌮 Dernières parties</div>';
    st.gameLog.slice(0,6).forEach(function(g,gi){
      const res=g.res || (g.w==='mutant'||g.w==='θ+' ? 'A' : (g.w==='nulle' ? 'D' : 'B'));
      const icon = res==='A' ? '🟢' : (res==='D' ? '⚪' : '🔴');
      const whyLabel = {'6capt':'6 captures','adj3':'écart 3','adjCap':'captures','adjCap1':'une bille d’avance, mieux placé','adjEval':'éval (les deux d’accord)','time':'temps','noMove':'bloqué','draw':'nulle','draw1':'nulle : une bille d’avance, pas mieux placé'}[g.why]||g.why;
      const btn = g.moves ? '<button onclick="labReplay('+gi+')" style="background:none;border:1px solid var(--gold);color:var(--gold);border-radius:5px;font-size:10px;padding:0 6px;cursor:pointer;margin-left:6px;white-space:nowrap;flex-shrink:0">▶ revoir</button>' : '';
      h+='<div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--muted);margin:3px 0"><span>'+icon+' '+g.name+' · '+g.w+' ('+whyLabel+', '+g.plies+' coups)</span>'+btn+'</div>';
    });
  }
  if(st.history.length){
    h+='<div style="margin-top:10px;font-size:12px;font-weight:700">Historique</div>';
    st.history.slice(0,8).forEach(function(x){
      h+='<div style="font-size:11px;color:var(--muted);margin:2px 0">G'+x.gen+' · '+x.type+' · '+x.name+(x.score!==null&&x.score!==undefined?' · '+x.score+'/'+x.games:'')+(x.elo?' · '+x.elo:'')+'</div>';
    });
  }
  h+='<label style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:12px"><input type="checkbox" '+(useOn?'checked':'')+' onchange="labToggleUse(this)"> Utiliser les poids adoptés pour l’IA</label>';
  el.innerHTML=h;
  if(_labRunning) _labMajStatut();
  const bs=document.getElementById('lab-start'); if(bs) bs.textContent=_labRunning?'⏸ Pause':'▶ Démarrer';
  // pas de nouveau rendu des reglages pendant qu'on y tape une valeur (une partie se termine toutes les quelques secondes)
  const adv=document.getElementById('lab-adv');
  if(adv && adv.style.display!=='none' && !(adv.contains && document.activeElement && adv.contains(document.activeElement))) renderLabAdvanced();
  if (typeof renderTestKaah === 'function') renderTestKaah();
}
// Reprise automatique si le Labo tournait a la derniere session
try{ if(localStorage.getItem('abaLabAutoRun')==='1'){ setTimeout(function(){ if(!_labRunning){ startLab(); if(typeof showToast==='function') showToast('\ud83e\uddea Labo repris en arri\u00e8re-plan'); } }, 4000); } }catch(e){}

// ── Crédibilité : vraies stats, vrai défi du jour, bannières honnêtes ──
/* Le « défi du jour » d'ici (un des 18 problèmes de la série, selon la date UTC) est remplacé
   par le Défi du jour #N (36-defi-du-jour-et-cartes.js) : un seul défi, le même pour tous. */
function openDailyPuzzle(){ if (typeof ouvrirDefi === 'function') ouvrirDefi(); }
function updateHeroDaily(){
  const el=document.getElementById('hero-daily');
  if(!el || typeof defiNumero!=='function') return;
  const n=defiNumero(), e=defiEtat(n);
  el.textContent='🔥 '+_tr('Défi du jour','Daily puzzle')+' #'+n+(e&&e.f==='v' ? ' ✅' : e&&e.f==='s' ? ' ⬛' : '');
}
function updateHeroStats(){
  const el=document.getElementById('hero-stats'); if(!el) return;
  let g=0,p=0;
  try{ g=parseInt(localStorage.getItem('abaGamesFinished')||'0',10)||0; }catch(e){}
  try{ p=parseInt(localStorage.getItem('abaPuzzleSolved')||'0',10)||0; }catch(e){}
  el.textContent = (g+p>0) ? ('\u26ab '+g+' parties termin\u00e9es \u00b7 \ud83e\udde9 '+p+' puzzles r\u00e9solus \u2014 sur cet appareil')
                           : '100 % hors-ligne \u00b7 aucun compte requis';
}
/* _injectHonestyBanners() ajoutait une note « Profil 100 % local » en haut des fenetres de
   connexion : elle est maintenant ecrite dans ces fenetres (v2.57), avec le reste des explications. */
window.addEventListener('load', function(){ updateHeroDaily(); updateHeroStats(); });

// ── 🏆 TOURNOI MENSUEL RÉEL : élimination directe vs bots, pendule 10+5, prix décernés ──
let _tourneyMatch=null;
let _tClock=null,_tClockTimer=null;
const TOURNEY_ROUNDS=[
  { name:'Quart de finale', opp:'\ud83e\udd0d Bot Blanc',  cfg:{depth:2,time:700},  human:'black' },
  { name:'Demi-finale',     opp:'\ud83d\udda4 Bot Noir',   cfg:{depth:3,time:1400}, human:'white' },
  { name:'Finale',          opp:'\ud83d\udc51 ULA',        cfg:{depth:4,time:2500}, human:'black' }
];
function _tourneyRunKey(){ return 'abaTourneyRun_'+currentTournamentId(); }
function tourneyRunLoad(){
  try{ const s=JSON.parse(localStorage.getItem(_tourneyRunKey())||'null'); if(s) return s; }catch(e){}
  return { stage:0, out:false, champion:false, results:[] };
}
function tourneyRunSave(r){ try{ localStorage.setItem(_tourneyRunKey(), JSON.stringify(r)); }catch(e){} }
function _tourneyPalmares(){ try{ return JSON.parse(localStorage.getItem('abaTourneyPalmares')||'[]'); }catch(e){ return []; } }
function _tourneyAward(kind){
  const id=currentTournamentId();
  const map={ champ:{label:'\ud83e\udd47 Champion', xp:1000}, final:{label:'\ud83e\udd48 Finaliste', xp:500}, part:{label:'\ud83c\udf96\ufe0f Participant', xp:100} };
  const a=map[kind];
  try{ if(typeof addXp==='function') addXp(a.xp, 'Tournoi '+id+' \u2014 '+a.label); }catch(e){}
  // Miroir backend (dormant tant que BACKEND.enabled===false)
  try{ if(typeof api!=='undefined' && api.online){ api.submitTournamentResult({ tournamentId:id, result:(kind==='champ'?'champion':(kind==='final'?'finaliste':'participant')), xpAwarded:a.xp }); } }catch(e){}
  try{
    const pal=_tourneyPalmares();
    if(!pal.some(function(x){return x.id===id;})){ pal.unshift({id:id, result:a.label, xp:a.xp}); localStorage.setItem('abaTourneyPalmares', JSON.stringify(pal.slice(0,24))); }
    const badges=JSON.parse(localStorage.getItem('abaBadges')||'[]');
    badges.push({id:'tourney-'+id, label:a.label+' '+id});
    localStorage.setItem('abaBadges', JSON.stringify(badges));
  }catch(e){}
  if(typeof toastEngage==='function') toastEngage(a.label+' \u2014 +'+a.xp+' XP !');
}
function startTournamentMatch(){
  if(!isRegisteredForTournament()){ showToast('\ud83d\udcdd Inscris-toi d\u2019abord au tournoi (bouton en haut)'); return; }
  const run=tourneyRunLoad();
  if(run.champion){ showToast('\ud83e\udd47 D\u00e9j\u00e0 champion ce mois-ci \u2014 reviens le mois prochain !'); return; }
  if(run.out){ showToast('\u274c \u00c9limin\u00e9 ce mois-ci \u2014 le tournoi revient le mois prochain'); return; }
  if(typeof botDuelMode!=='undefined' && botDuelMode && typeof stopBotDuel==='function') stopBotDuel();
  if(typeof _puzzleActive!=='undefined') _puzzleActive=null;
  const R=TOURNEY_ROUNDS[run.stage];
  _tourneyMatch={ round:run.stage, cfg:R.cfg, name:R.name, opp:R.opp, human:R.human };
  startTournamentGame();  // applique les règles, reset, page jeu, puis appelle _tourneyAfterStart()
}
function _tourneyAfterStart(){
  const M=_tourneyMatch; if(!M) return;
  GameMode.set('ai');
  HumanColor.set(M.human);
  const bar=document.getElementById('tourney-bar'); if(bar) bar.style.display='flex';
  const t=document.getElementById('tb-title');
  if(t) t.textContent='\ud83c\udfc6 '+M.name+' \u2014 vs '+M.opp+' \u00b7 tu joues les '+(M.human==='black'?'\u26ab Noirs':'\u26aa Blancs');
  _tClockStart();
  updateStatus();
  if(CurrentTurn.get()!==HumanColor.get() && !GameOver.get()){ setTimeout(function(){ if(typeof aiMove==='function') aiMove(); }, 700); }
}
function tourneyMatchEnd(winner, reason){
  const M=_tourneyMatch; if(!M) return;
  _tourneyMatch=null; _tClockStop();
  const bar=document.getElementById('tourney-bar'); if(bar) bar.style.display='none';
  if(typeof exitTournamentMode==='function') exitTournamentMode();
  const run=tourneyRunLoad();
  const won = (winner===M.human);
  run.results.push({round:M.round, won:won, reason:reason||'6capt'});
  if(won){
    run.stage++;
    if(run.stage>=TOURNEY_ROUNDS.length){ run.champion=true; tourneyRunSave(run); _tourneyAward('champ'); }
    else { tourneyRunSave(run); showToast('\u2705 '+M.name+' gagn\u00e9e ! Prochain tour : '+TOURNEY_ROUNDS[run.stage].name); }
  } else {
    run.out=true; tourneyRunSave(run);
    _tourneyAward(M.round>=2 ? 'final' : 'part');
    showToast('\u274c \u00c9limin\u00e9 en '+M.name+' \u2014 r\u00e9sultat enregistr\u00e9 au palmar\u00e8s');
  }
  renderTournamentState();
}
/* ═══ NULLE ═══
   Avant : le bouton « Proposer nulle » affichait « Demande de nulle envoyee »
   et ne faisait RIEN d'autre -- aucune proposition, aucune nulle possible (seul
   le duel de robots constatait la triple repetition, sans l'enregistrer).
   Maintenant (demande d'Olivier, sur le modele de KAAH) :
   - proposer la nulle : contre l'IA, elle accepte si elle n'a pas l'avantage ;
     a deux sur le meme ecran, l'autre joueur repond ; a distance, la proposition
     part chez l'adversaire (messages NULLE:offre / accepte / refuse) ;
   - nulle par TRIPLE REPETITION : la meme position, avec le meme camp au trait,
     revient une 3e fois -- constatee automatiquement, dans toute partie.
   Une nulle termine la partie comme une victoire (pendules, historique, ecran
   de fin) mais ne change pas l'ELO. L'historique et les statistiques savaient
   deja compter les nulles a part. */
let _nulleRefuseeAuCoup = -99;   // apres un refus de l'IA, nouvelle proposition 10 demi-coups plus tard
function _declarerNulle(raison) {
  if (GameOver.get()) return;
  GameOver.set(true);
  if (typeof disarmInactivityCancel === 'function') disarmInactivityCancel();
  _emitAbaEvent('gameOver', { winner: null, reason: raison,
    capturedByBlack: CapturedByBlack.get(), capturedByWhite: CapturedByWhite.get(), moveCount: MoveCount.get() });
  if (typeof notifierSiAbsent === 'function') notifierSiAbsent('finPartie', 'Partie terminée', 'Partie nulle.');
  if (typeof updateHeroStats === 'function') updateHeroStats();
  clearInterval(timerInterval);
  if (typeof stopGameTimer === 'function') stopGameTimer();
  _recordGameHistory(null, raison);      // archive AVANT d'effacer la sauvegarde de reprise
  if (typeof clearSavedGame === 'function') clearSavedGame();
  const overlay = document.getElementById('win-overlay'), title = document.getElementById('win-title'), sub = document.getElementById('win-sub');
  if (title) title.textContent = (typeof kidsMode !== 'undefined' && kidsMode) ? 'Match nul ! 🤝' : 'Partie nulle';
  if (sub) sub.textContent = raison === 'repetition'
    ? 'La même position est revenue une 3e fois, avec le même camp au trait.'
    : 'Nulle acceptée d\u2019un commun accord.';
  if (overlay) overlay.classList.add('show');
  if (typeof renderStyleCard === 'function') renderStyleCard();
  if (typeof renderHeatmapCard === 'function') renderHeatmapCard();
  // comptee comme partie jouee (et nulle) dans la progression, ELO neutre
  if (typeof onGamePlayed === 'function' && MoveCount.get() > 0) onGamePlayed('draw');
  if (typeof showToast === 'function') showToast('🤝 Partie nulle — ELO inchangé');
}
/* Triple repetition. A appeler juste APRES l'enregistrement d'un coup : la
   position courante est alors la derniere de boardSnapshots. Meme camp au
   trait = un instantane sur deux en remontant. Renvoie true si nulle. */
function _verifierRepetition() {
  if (GameOver.get()) return false;
  if ((typeof variantMode !== 'undefined' && variantMode) || (typeof replayMode !== 'undefined' && replayMode)) return false;
  if ((typeof _tourneyMatch !== 'undefined' && _tourneyMatch) || (typeof botDuelMode !== 'undefined' && botDuelMode)) return false;
  const n = (typeof boardSnapshots !== 'undefined') ? boardSnapshots.length : 0;
  if (n < 8) return false;
  const cle = _repKeyOf(board); let occ = 0;
  for (let k = n - 1; k >= 0; k -= 2) if (_repKeyOf(boardSnapshots[k].board) === cle) occ++;
  /* La position de DEPART compte aussi (comme aux echecs) : Noirs au trait, donc
     meme camp que la position courante quand le nombre de coups joues est pair.
     Meme reference que le code de partie : la disposition de la partie. */
  if (n % 2 === 0) { const dep = _positionDeDepartPartie(); if (dep && _repKeyOf(dep) === cle) occ++; }
  if (occ >= 3) { _declarerNulle('repetition'); return true; }
  return false;
}
function _positionDeDepartPartie() {
  if (typeof _replayStartBoard !== 'undefined' && _replayStartBoard) return _replayStartBoard;
  const L = (typeof LAYOUTS !== 'undefined') ? LAYOUTS[(typeof currentLayout !== 'undefined') ? currentLayout : 'standard'] : null;
  if (!L) return null;
  const b = {}; L.black.forEach(function(x){ b[x[0] + ',' + x[1]] = 'black'; }); L.white.forEach(function(x){ b[x[0] + ',' + x[1]] = 'white'; });
  return b;
}
/* L'IA accepte la nulle si elle n'a pas l'avantage : derriere aux ejections,
   ou a egalite d'ejections avec une position qu'elle n'estime pas meilleure.
   Pas avant le 20e demi-coup : trop tot pour juger. Regle volontairement
   simple et annoncee au joueur. */
function _iaAccepteNulle(ia) {
  if (MoveCount.get() < 20) return { ok: false, pourquoi: 'trop tôt dans la partie' };
  const adv = ia === 'black' ? 'white' : 'black';
  const sesEj = ia === 'black' ? CapturedByBlack.get() : CapturedByWhite.get();
  const tesEj = adv === 'black' ? CapturedByBlack.get() : CapturedByWhite.get();
  if (sesEj > tesEj) return { ok: false, pourquoi: 'elle mène aux éjections' };
  if (sesEj < tesEj) return { ok: true };
  return evaluateBoard(ia) > 0 ? { ok: false, pourquoi: 'elle estime avoir l\u2019avantage' } : { ok: true };
}
function proposerNulle() {
  if (GameOver.get()) { showToast('La partie est déjà terminée'); return; }
  if ((typeof variantMode !== 'undefined' && variantMode) || (typeof replayMode !== 'undefined' && replayMode)) { showToast('Pas de nulle en mode « Et si » ni en rejeu'); return; }
  if (typeof _tourneyMatch !== 'undefined' && _tourneyMatch) { showToast('Pas de nulle en tournoi'); return; }
  if (!MoveCount.get()) { showToast('Aucun coup joué — rien à annuler par une nulle'); return; }
  const camp = function(x){ return x === 'black' ? 'Noirs' : 'Blancs'; };
  if (typeof _rtcChannel !== 'undefined' && _rtcChannel && _rtcChannel.readyState === 'open') {
    _rtcChannel.send('NULLE:offre');
    showToast('🤝 Nulle proposée — en attente de la réponse de votre adversaire');
    return;
  }
  if (GameMode.get() === 'ai') {
    if (MoveCount.get() - _nulleRefuseeAuCoup < 10) { showToast('L\u2019IA vient de refuser — reproposez dans quelques coups'); return; }
    const r = _iaAccepteNulle(aiColor());
    if (r.ok) { showToast('🤝 L\u2019IA accepte la nulle'); _declarerNulle('accord'); }
    else { _nulleRefuseeAuCoup = MoveCount.get(); showToast('🙅 L\u2019IA refuse la nulle : ' + r.pourquoi); }
    return;
  }
  // deux joueurs sur le meme ecran : l'autre joueur repond
  const prop = CurrentTurn.get(), autre = prop === 'black' ? 'white' : 'black';
  if (confirm('Les ' + camp(prop) + ' proposent la nulle.\n\nLes ' + camp(autre) + ' acceptent-ils ?')) _declarerNulle('accord');
  else showToast('Nulle refusée — la partie continue');
}
// Partie a distance : reponse a une proposition recue, et issue de la sienne
function _rtcMessageNulle(data) {
  if (data === 'NULLE:offre') {
    if (GameOver.get()) return true;
    const ok = confirm('Votre adversaire propose la nulle.\n\nAcceptez-vous ?');
    if (_rtcChannel && _rtcChannel.readyState === 'open') _rtcChannel.send(ok ? 'NULLE:accepte' : 'NULLE:refuse');
    if (ok) _declarerNulle('accord');
    return true;
  }
  if (data === 'NULLE:accepte') { showToast('🤝 Votre adversaire accepte la nulle'); _declarerNulle('accord'); return true; }
  if (data === 'NULLE:refuse') { showToast('Votre adversaire refuse la nulle — la partie continue'); return true; }
  return false;
}

function resignGame(){
  if(typeof GameOver!=='undefined' && GameOver.get()){ showToast('La partie est d\u00e9j\u00e0 termin\u00e9e'); return; }
  if(!confirm('Abandonner la partie ?')) return;
  const loser=CurrentTurn.get(), winner=(loser==='black'?'white':'black');
  showToast('\ud83c\udff3\ufe0f Abandon \u2014 victoire des '+(winner==='black'?'Noirs':'Blancs'));
  triggerWin(winner,'resign');
}
// ── Pendule 10+5 (tournoi uniquement) ──
function _tClockStart(){
  _tClock={ black:600000, white:600000, inc:5000, run:'black', last:Date.now(), paused:false, pausesLeft:1 };
  const pb=document.getElementById('tb-pause');
  if(pb){ const ok=(typeof tournamentActiveRules!=='undefined'&&tournamentActiveRules&&tournamentActiveRules.pause); pb.style.display=ok?'':'none'; pb.textContent='\u23f8 Pause (1)'; pb.disabled=false; }
  clearInterval(_tClockTimer);
  _tClockTimer=setInterval(_tClockRender,300);
  _tClockRender();
}
function _tClockStop(){ clearInterval(_tClockTimer); _tClockTimer=null; _tClock=null; }
function _tClockTick(){
  const C=_tClock; if(!C||C.paused) return;
  if(typeof GameOver!=='undefined' && GameOver.get()) return;
  const mover=CurrentTurn.get(), now=Date.now();
  C[mover]-=(now-C.last); C[mover]+=C.inc;
  C.run=(mover==='black'?'white':'black'); C.last=now;
  _tClockRender();
}
function _tClockFmt(ms){ ms=Math.max(0,ms); const s=Math.floor(ms/1000); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
function _tClockRender(){
  const C=_tClock; if(!C) return;
  let b=C.black, w=C.white;
  if(!C.paused && !(typeof GameOver!=='undefined'&&GameOver.get())){ const el=Date.now()-C.last; if(C.run==='black') b-=el; else w-=el; }
  const eb=document.getElementById('tb-cb'), ew=document.getElementById('tb-cw');
  if(eb){ eb.textContent=_tClockFmt(b); eb.style.color=(C.run==='black'&&!C.paused)?'var(--gold)':'var(--text)'; }
  if(ew){ ew.textContent=_tClockFmt(w); ew.style.color=(C.run==='white'&&!C.paused)?'var(--gold)':'var(--text)'; }
  if(_tourneyMatch && !C.paused && !(typeof GameOver!=='undefined'&&GameOver.get())){
    if(b<=0){ triggerWin('white','time'); showToast('\u23f1\ufe0f Temps \u00e9coul\u00e9 \u2014 les Blancs gagnent'); }
    else if(w<=0){ triggerWin('black','time'); showToast('\u23f1\ufe0f Temps \u00e9coul\u00e9 \u2014 les Noirs gagnent'); }
  }
}
function tourneyPause(){
  const C=_tClock; if(!C) return;
  const pb=document.getElementById('tb-pause');
  if(!C.paused){
    if(C.pausesLeft<=0){ showToast('Plus de pause disponible'); return; }
    C.pausesLeft--; C.paused=true;
    const el=Date.now()-C.last; if(C.run==='black') C.black-=el; else C.white-=el;
    if(pb) pb.textContent='\u25b6 Reprendre';
    showToast('\u23f8 Pause (60 s max)');
    setTimeout(function(){ if(C.paused) tourneyPause(); },60000);
  } else {
    C.paused=false; C.last=Date.now();
    if(pb){ pb.textContent='\u23f8 Pause (0)'; pb.disabled=true; }
  }
}
// ── Rendu du parcours / palmarès sur la page tournoi ──
function renderTourneyRun(){
  const bd=document.getElementById('bracket-display');
  const sc=document.getElementById('tournament-schedule');
  const run=tourneyRunLoad();
  if(bd){
    let h='<div style="display:flex;flex-direction:column;gap:10px">';
    TOURNEY_ROUNDS.forEach(function(R,i){
      let state, col;
      if(run.champion || i<run.stage){ state='\u2714 Gagn\u00e9'; col='var(--accent-green-light)'; }
      else if(run.out && i===run.stage){ state='\u2716 \u00c9limin\u00e9'; col:'#e66'; col='#e66'; }
      else if(!run.out && i===run.stage){ state='\u25b6 \u00c0 jouer'; col='var(--gold)'; }
      else { state='\ud83d\udd12'; col='var(--muted)'; }
      h+='<div style="display:flex;justify-content:space-between;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 16px">'
        +'<span style="font-size:13px;font-weight:700">'+R.name+' \u00b7 vs '+R.opp+' \u00b7 <span style="font-size:11px;color:var(--muted)">tu joues les '+(R.human==='black'?'Noirs \u26ab':'Blancs \u26aa')+'</span></span>'
        +'<span style="font-size:12px;font-weight:700;color:'+col+'">'+state+'</span></div>';
    });
    h+='</div>';
    bd.innerHTML=h;
  }
  if(sc){
    let h='';
    if(run.champion) h='<div style="font-size:14px;color:var(--gold);font-weight:700">\ud83e\udd47 Champion du mois \u2014 f\u00e9licitations ! Prochain tournoi le mois prochain.</div>';
    else if(run.out) h='<div style="font-size:13px;color:var(--muted)">\u00c9limin\u00e9 ce mois-ci. Le tournoi de mois prochain t\u2019attend \u2014 entra\u00eene-toi d\u2019ici l\u00e0 !</div>';
    else if(!isRegisteredForTournament()) h='<div style="font-size:13px;color:var(--muted)">Inscris-toi (gratuit) pour d\u00e9bloquer ton parcours : 3 victoires cons\u00e9cutives = titre de Champion.</div>';
    else h='<div style="font-size:13px">Prochain match : <b>'+TOURNEY_ROUNDS[run.stage].name+'</b> contre '+TOURNEY_ROUNDS[run.stage].opp+' \u00b7 pendule 10+5 \u00b7 une d\u00e9faite = \u00e9limination.</div>';
    const pal=_tourneyPalmares();
    if(pal.length){
      h+='<div style="margin-top:14px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--muted)">Palmar\u00e8s</div>';
      pal.slice(0,6).forEach(function(x){ h+='<div style="font-size:12px;color:var(--text);margin-top:4px">'+x.id+' \u2014 '+x.result+' (+'+x.xp+' XP)</div>'; });
    }
    sc.innerHTML=h;
  }
}

// Sélecteur de style IA manuel (par-dessus le profilage auto)
function setAIStyle(mode){
  _aiForcedMode = (mode === 'auto') ? null : mode;
  if(mode === 'auto') aiAdaptive = true;
  document.querySelectorAll('.style-btn').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-style') === mode); });
  const labels = { auto:'Auto', balanced:'Équilibré', aggressive:'Agressif', defensive:'Défensif', divide:'Division' };
  if(typeof showToast === 'function') showToast('🎚️ Style IA : ' + (labels[mode] || mode));
}

// Inverser les camps (noir↔blanc) sur le plateau courant
function switchSide(){
  const nb = {};
  for(const k in board){ if(board[k]==='black') nb[k]='white'; else if(board[k]==='white') nb[k]='black'; }
  board = nb;
  const t = CapturedByBlack.get(); CapturedByBlack.set(capturedByWhite); CapturedByWhite.set(t);
  if(typeof drawBoard==='function') drawBoard();
  if(typeof updateCaptures==='function') updateCaptures();
  if(typeof showToast==='function') showToast('🔄 Camps inversés');
}

// Résoudre : meilleur coup de la position courante (recherche synchrone, profondeur modérée)
function solveProblem(){
const side = (typeof CurrentTurn !== 'undefined' && CurrentTurn.get()) ? CurrentTurn.get() : 'black';
  if(typeof showToast==='function') showToast('🧩 Recherche du meilleur coup…');
  setTimeout(function(){
    let best = null;
    try { best = searchBestMove(side, 5, 2500); } catch(e){}
    if(best && best.cells){
      const lab = best.cells.map(function(c){ return coordToABAPRO(c.r,c.c); }).join('');
      if(typeof selected !== 'undefined'){ selected = best.cells.map(function(c){ return {r:c.r,c:c.c}; }); if(typeof drawBoard==='function') drawBoard(); }
      if(typeof showToast==='function') showToast('🧩 Meilleur coup : ' + lab + (best.eject ? ' (éjection !)' : ''));
    } else if(typeof showToast==='function') showToast('Aucun coup trouvé');
  }, 60);
}

// Diagramme ASCII de la position (style ABA-PRO)
function generateAbaloneDiagram(bd, title){
  const RW=[5,6,7,8,9,8,7,6,5]; const letters='abcdefghi'; const out=[];
  if(title){ out.push('  '+title); out.push(''); }
  for(let r=0;r<9;r++){
    const len=RW[r]; const indent=Math.floor((9-len)*1.5);
    let line = letters[8-r]+'  ' + '   '.repeat(indent);
    for(let c=0;c<len;c++){ const p=bd[r+','+c]; line += (p==='white'?'o':p==='black'?'x':'.') + '  '; }
    out.push(line);
  }
  let footer='   '; for(let c=0;c<9;c++) footer += (c+1)+'  '; out.push(''); out.push(footer);
  return out.join('\n');
}
function showAsciiDiagram(){
  const pre = document.getElementById('ascii-pre');
  if(pre) pre.textContent = generateAbaloneDiagram(board, 'Position (x=noir, o=blanc)');
  const m = document.getElementById('ascii-modal'); if(m) m.style.display='flex';
}
function closeAsciiModal(){ const m=document.getElementById('ascii-modal'); if(m) m.style.display='none'; }
function copyAsciiDiagram(){
  const pre=document.getElementById('ascii-pre'); if(!pre)return;
  if(navigator.clipboard) navigator.clipboard.writeText(pre.textContent).then(function(){ showToast('📋 Diagramme copié'); });
}

// Navigation du rejeu : flèches clavier + molette (sans rotation, qui entrerait en conflit avec la sélection)
document.addEventListener('keydown', function(e){
  if(e.target && (e.target.tagName==='INPUT' || e.target.tagName==='TEXTAREA')) return;
  if(typeof replayMode==='undefined' || !replayMode) return;
  if(e.key==='ArrowLeft'){ e.preventDefault(); replayStep(-1); }
  else if(e.key==='ArrowRight'){ e.preventDefault(); replayStep(1); }
});
(function(){
  const cv = document.getElementById('board');
  if(cv) cv.addEventListener('wheel', function(e){
    if(typeof replayMode==='undefined' || !replayMode) return;   // n'intercepte la molette qu'en mode rejeu
    e.preventDefault();
    replayStep(e.deltaY > 0 ? 1 : -1);
  }, { passive:false });
})();

function aiMove() {
  /* Une mesure de reflexion (page Stats du corpus) utilise les memes fils de calcul :
     la partie a la priorite -- la mesure s'arrete, et l'IA attend la fin de la
     recherche de mesure en cours (10 s au plus) pour ne jamais la croiser. */
  if (typeof _mesureRechercheActive !== 'undefined' && _mesureRechercheActive) {
    _mesureEnCours = null;
    if (typeof showToast === 'function') showToast('Mesure de réflexion interrompue : ta partie a la priorité');
    const g0 = _aiGen;
    _mesureRechercheActive.then(function(){ if (g0 === _aiGen && !GameOver.get()) aiMove(); });
    return;
  }
  if (GameOver.get()) return;
  // Mode moteur experimental (NNUE) : les poids doivent etre prets AVANT de
  // lancer le calcul. Meme patron que ensureGameBanks() -- charge une fois
  // (mis en cache), puis relance aiMove() automatiquement.
  if (_engineMode && !NNUE_WEIGHTS_CACHE) {
    loadNNUEWeights().then(function(){ if (!GameOver.get()) aiMove(); });
    return;
  }
  const ai = aiColor();          // couleur jouée par l'IA (blanc par défaut, noir si on affronte le Bot Noir)
  const human = HumanColor.get();
  const moves = getAllMovesForColor(ai);
  if (!moves.length) { CurrentTurn.set(human); updateStatus(); return; }

  // ── Finale 4 contre 2 (mode Decouverte) : jeu PARFAIT tire de la table, sauf au
  //    niveau 1. Morceaux absents : on les charge puis on relance aiMove (meme
  //    patron que les poids NNUE) ; chargement impossible : IA habituelle. ──
  if (_niveauIA() !== 1 && !_tb42Indispo && _tb42Applicable()) {
    const parfait = _tb42MeilleurCoup(ai);
    if (parfait) { if (typeof _noterSourceCoupIA === 'function') _noterSourceCoupIA('table', ai); executeAIMove(parfait); return; }
    const genTb = _aiGen;
    showAIThinking(true);
    _tb42Charger(ai).then(function(){ showAIThinking(false); if (genTb === _aiGen && !GameOver.get()) aiMove(); })
      .catch(function(){ _tb42Indispo = true; showAIThinking(false); if (genTb === _aiGen && !GameOver.get()) aiMove(); });
    return;
  }

  // ── Livre d'ouvertures STATISTIQUE (~15000 parties Migs + AbalOnline, 5 variantes, pondéré par taux de victoire) ──
  if (_bookNode && _bookNode.k) {
    const statMove = pickBookMove(_bookNode, moves);
    if (statMove) { if (typeof _noterSourceCoupIA === 'function') _noterSourceCoupIA('stat', ai); executeAIMove(statMove); return; }
  }

  // ── Repli parties réelles : l'arbre a perdu la trace de la partie, mais la MÊME
  //    position (même trait, vérifiée en rejouant la partie) existe dans le corpus
  //    — jamais un coup qui revient en arrière (v2.60, voir pickEmpreinteFallbackMove) ──
  if (boardSnapshots.length < 20) {
    const empMove = pickEmpreinteFallbackMove(ai, moves, boardSnapshots.length);
    if (empMove) { if (typeof _noterSourceCoupIA === 'function') _noterSourceCoupIA('empreinte', ai); executeAIMove(empMove); return; }
  }

  // ── Livre d'ouvertures (début de partie) : joue un coup LÉGAL connu si disponible ──
  if (boardSnapshots.length < 16) {
    const bookMove = getOpeningMove(ai, moves);
    if (bookMove) { if (typeof _noterSourceCoupIA === 'function') _noterSourceCoupIA('livre', ai); executeAIMove(bookMove); return; }
  }

  // Profondeur et budget temps par difficulté — table partagée AI_DIFFICULTY_CONFIG
  const config = Object.assign({}, AI_DIFFICULTY_CONFIG[aiDifficulty] || AI_DIFFICULTY_CONFIG['3']);
  if (typeof _tourneyMatch!=='undefined' && _tourneyMatch && _tourneyMatch.cfg) { config.depth=_tourneyMatch.cfg.depth; config.time=_tourneyMatch.cfg.time; }
  else if (aiReflexionMax !== null) config.time = (aiReflexionMax === '') ? 3600000 : Math.max(100, Math.round(aiReflexionMax * 1000));   // reflexion choisie (plafond de securite 1 h si sans limite)

  // Niveau 1 : décision immédiate (un peu d'aléatoire), pas besoin du worker
  if (_niveauIA() === 1 && !(typeof _tourneyMatch!=='undefined' && _tourneyMatch)) {
    moves.sort(function(a,b){ return (a.code||9)-(b.code||9); });
    // v2.60 : tiré parmi les 4 premiers qui ne reviennent pas en arrière (aller-retour,
    // position déjà vue) ; s'il n'y en a aucun, parmi les 4 premiers comme avant
    const choix = [];
    for (let i = 0; i < moves.length && choix.length < 4; i++) if (!_coupRetourEnArriere(moves[i], ai)) choix.push(moves[i]);
    const parmi = choix.length ? choix : moves.slice(0, 4);
    if (typeof _noterSourceCoupIA === 'function') _noterSourceCoupIA('n1', ai);
    executeAIMove(parmi[Math.floor(Math.random()*parmi.length)]);
    return;
  }

  // Affiche l'indicateur de réflexion
  showAIThinking(true);
  const gen = _aiGen;   // capture la génération : si reset pendant la réflexion, ce calcul sera abandonné
  const aiW = updateAIStyle();   // poids d'éval adaptés à ton style (profilage adverse)

  // Recherche multi-worker si l'appareil a plus d'un cœur utile à offrir
  // (voir detectAIWorkerCount) — repli automatique et silencieux sur le
  // chemin mono-worker existant si non disponible ou pas avantageux.
  const pooledParams = {
    board: JSON.parse(JSON.stringify(board)),
    capturedByWhite: CapturedByWhite.get(),
    capturedByBlack: CapturedByBlack.get(),
    color: ai,
    depth: config.depth,
    time: config.time,
    weights: aiW,
    hist: _gameHistKeys(),
    engineMode: _engineMode,
    nnueWeights: _engineMode ? NNUE_WEIGHTS_CACHE : undefined
  };
  const pooledStarted = (typeof requestAIMovePooled === 'function') && requestAIMovePooled(pooledParams, function(chosen, metrics) {
    showAIThinking(false);
    if (gen !== _aiGen) return;   // partie réinitialisée entre-temps → résultat périmé, ignoré
    if (metrics) { updateAIMetrics(metrics); _releverReflexion(metrics, config); _noterMesuresCoupIA(metrics, ai, config); }
    if (GameOver.get()) return;
    if (!chosen) { CurrentTurn.set(human); updateStatus(); return; }
    executeAIMove(chosen);
  });
  if (pooledStarted) return;

  const worker = getAIWorker();
  if (worker) {
    // ── Calcul dans le thread séparé (interface fluide) ──
    let done = false;
    const onResult = function(e) {
      if (done) return;
      done = true;
      worker.removeEventListener('message', onResult);
      showAIThinking(false);
      if (gen !== _aiGen) return;   // partie réinitialisée entre-temps → résultat périmé, ignoré
      const chosen = e.data && e.data.move;
      if (e.data) { updateAIMetrics(e.data.metrics); _releverReflexion(e.data.metrics, config); _noterMesuresCoupIA(e.data.metrics, ai, config); }
      if (GameOver.get()) return;
      if (!chosen) { CurrentTurn.set(human); updateStatus(); return; }
      executeAIMove(chosen);
    };
    worker.addEventListener('message', onResult);
    // Sécurité : si le worker ne répond pas à temps, on bascule en synchrone
    setTimeout(function() {
      if (done) return;
      done = true;
      worker.removeEventListener('message', onResult);
      showAIThinking(false);
      if (gen !== _aiGen) return;   // reset entre-temps → on ne joue pas sur la nouvelle partie
      if (GameOver.get()) return;
      const chosen = searchBestMove(ai, config.depth, config.time, _gameHistKeys());
      if (!chosen) { CurrentTurn.set(human); updateStatus(); return; }
      executeAIMove(chosen);
    }, config.time + 4000);
    // Envoie la position au worker
    worker.postMessage({
      board: JSON.parse(JSON.stringify(board)),
      capturedByWhite: CapturedByWhite.get(),
      capturedByBlack: CapturedByBlack.get(),
      color: ai,
      depth: config.depth,
      time: config.time,
      weights: aiW,
      hist: _gameHistKeys(),
      engineMode: _engineMode,
      nnueWeights: _engineMode ? NNUE_WEIGHTS_CACHE : undefined
    });
  } else {
    // ── Fallback : pas de worker disponible, calcul synchrone ──
    // Cas tres rare (navigateur sans support Worker). Le mode moteur
    // experimental (NNUE) n'est branche que dans le worker (voir
    // AI_WORKER_CODE) -- ce repli utilise toujours le moteur standard,
    // meme si un mode NNUE est selectionne, plutot que dupliquer tout le
    // code d'inference dans le thread principal pour un chemin aussi rare.
    // setTimeout pour laisser l'indicateur s'afficher avant de bloquer
    setTimeout(function() {
      const chosen = searchBestMove(ai, config.depth, config.time, _gameHistKeys());
      showAIThinking(false);
      if (gen !== _aiGen) return;   // reset pendant le calcul → résultat périmé
      if (GameOver.get()) return;
      if (!chosen) { CurrentTurn.set(human); updateStatus(); return; }
      executeAIMove(chosen);
    }, 30);
  }
}

// Affiche / masque l'indicateur "L'IA réfléchit…"
let _iaReflechit = false;   // l'IA calcule un coup de partie (la mesure de reflexion ne demarre pas pendant ce temps)
function showAIThinking(on) {
  _iaReflechit = !!on;
  let el = document.getElementById('ai-thinking');
  if (on) {
    if (!el) {
      el = document.createElement('div');
      el.id = 'ai-thinking';
      el.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2500;'
        + 'background:var(--surface);border:1px solid var(--gold-dim);border-radius:24px;padding:10px 20px;'
        + 'display:flex;align-items:center;gap:10px;box-shadow:0 6px 24px rgba(0,0,0,0.5);font-size:14px;color:var(--text)';
      el.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2px solid var(--gold-dim);'
        + 'border-top-color:var(--gold);border-radius:50%;animation:ai-spin 0.7s linear infinite"></span>'
        + '<span>L\'IA réfléchit…</span>'
        + '<button onclick="forceAINow()" title="Interrompre la réflexion et jouer le meilleur coup trouvé" '
        + 'style="margin-left:6px;background:var(--gold);color:#0d0f0e;border:none;border-radius:14px;'
        + 'padding:5px 12px;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">⚡ Jouer maintenant</button>';
      document.body.appendChild(el);
      // injecte l'animation si absente
      if (!document.getElementById('ai-spin-style')) {
        const st = document.createElement('style');
        st.id = 'ai-spin-style';
        st.textContent = '@keyframes ai-spin{to{transform:rotate(360deg)}}';
        document.head.appendChild(st);
      }
    }
    el.style.display = 'flex';
  } else if (el) {
    el.style.display = 'none';
  }
}

// Exécute le coup choisi par l'IA (partie commune worker / synchrone)
function executeAIMove(chosen) {
  if (GameOver.get() || !chosen) return;
  const ai = aiColor();              // couleur de l'IA
  const human = HumanColor.get();          // couleur de l'humain (= victime des éjections de l'IA)
  // Calculee ICI, AVANT abApplyMove : calculerExplicationCoup simule le coup
  // avec applyMove/undoMove, qui exigent le plateau dans son etat D'AVANT
  // le coup (sans quoi la comparaison avant/apres n'aurait pas de sens).
  const explicationIA = aiExplainEnabled ? calculerExplicationCoup(chosen, ai) : null;
  pushUndoState();
  abApplyMove(chosen.cells, chosen.dir, ai, chosen.info);
  if (chosen.info.type === 'push' && chosen.info.ejection) {
    // position écran de la bille humaine éjectée
    let ejX = null, ejY = null;
    if (chosen.info.oppStart) {
      let cur = { ...chosen.info.oppStart };
      for (let s=0; s<chosen.info.push-1; s++) cur = { q:cur.q+chosen.dir.q, r:cur.r+chosen.dir.r };
      const rc = axialToRc(cur.q, cur.r);
      if (rc) { const p = hexCoord(rc.r, rc.c); ejX = p.x; ejY = p.y; }
    }
    soundEject();  // 🔊
    if (ai === 'white') CapturedByWhite.inc(); else CapturedByBlack.inc();
    updateCaptures();
    const ejCount = (ai === 'white') ? CapturedByWhite.get() : CapturedByBlack.get();
    if (ejX!==null) animateEjection(ejX, ejY, human, ejCount-1);
    /* Le coup gagnant doit etre ENREGISTRE avant de conclure. Le retour
       anticipe sautait addMoveToHistory : le 6e coup d'ejection de l'IA
       n'apparaissait ni dans l'historique ni dans l'export. Signale par Saab. */
    if (ejCount >= 6) {
      const _winLabel = moveLabel(chosen.cells, chosen.dir, chosen.type, !!chosen.eject);
      if (!variantMode) addMoveToHistory(_winLabel, ai, { cells: chosen.cells.slice(), dir: chosen.dir, type: chosen.type, ejection: !!chosen.eject });
      if (typeof recordOpponentHeat === 'function') recordOpponentHeat(chosen.cells);
      if (variantMode) { _variantConclude(ai); return; }
      triggerWin(ai); return;
    }
  } else if (chosen.info.type === 'push') {
    soundPush();   // 🔊
  } else {
    soundMove();   // 🔊
  }
  // Libellé du coup de l'IA selon les systèmes de notation activés
  const label = moveLabel(chosen.cells, chosen.dir, chosen.type, !!chosen.eject);
  if (!variantMode) addMoveToHistory(label, ai, { cells: chosen.cells.slice(), dir: chosen.dir, type: chosen.type, ejection: !!chosen.eject });
  // Heatmap : enregistre le coup de l'IA sous 'opponent'
  if (typeof recordOpponentHeat === 'function') recordOpponentHeat(chosen.cells);
  _clockInc(human==='black'?'white':'black');   // ⏱️ incrément pour l'IA qui vient de jouer
  CurrentTurn.set(human); MoveCount.inc();
  if (_verifierRepetition()) { drawBoard(); updateStatus(); return; }
  _emitAbaEvent('movePlayed', { color: (human==='black'?'white':'black'), label: label,
    moveCount: MoveCount.get(), capturedByBlack: CapturedByBlack.get(), capturedByWhite: CapturedByWhite.get() });
  if (!GameOver.get()) playSfx('occ_change');   // 🔊 « c'est ton tour »
  /* Meme evenement, mais pour qui a quitte l'onglet pendant le calcul :
     notifierSiAbsent() ne fait rien si la page est au premier plan. */
  if (!GameOver.get()) notifierSiAbsent('monTour', 'À vous de jouer', "L'adversaire a joué son coup.");
  updateStatus(); drawBoard();
  if (explicationIA && !GameOver.get()) showAIExplainBubble(explicationIA);
  // Mode Coach : avertit le joueur si l'IA menace une éjection
  if (coachEnabled && !GameOver.get()) {
    setTimeout(function() {
      const myMoves = getAllMovesForColor(ai);  // ce que l'IA pourrait faire ensuite
      const threat = myMoves.some(function(m){ return m.eject; });
      if (threat) {
        showCoachBubble({ text: 'Vigilance ! L\'adversaire menace d\'éjecter une de tes billes au prochain coup. 🛡️', type: 'warn' });
      }
    }, 300);
  }
}

