;
let _puzzleActive=null;
function _pzSig(cells,dir){ return cells.map(function(x){return x.r+','+x.c;}).sort().join('|')+'>'+dir.q+','+dir.r; }
function openPuzzles(){
  if(!PUZZLES.length){ showToast('Aucun puzzle embarqué'); return; }
  let idx=parseInt(localStorage.getItem('abaPuzzleIdx')||'0',10);
  if(isNaN(idx)||idx<0||idx>=PUZZLES.length) idx=0;
  startPuzzle(idx);
}
function startPuzzle(idx){
  const p=PUZZLES[idx]; if(!p) return;
  if(typeof botDuelMode!=='undefined' && botDuelMode && typeof stopBotDuel==='function') stopBotDuel();
  // Pose la position
  board={}; p.bm.forEach(function(k){board[k]='black';}); p.wm.forEach(function(k){board[k]='white';});
  capturedByBlack=p.cb; capturedByWhite=p.cw;
  gameOver=false; replayMode=false; selected=[]; undoStack=[]; boardSnapshots=[]; moveCount=0;
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
  if(played===pa.sig || (pa.alts&&pa.alts.indexOf(played)!==-1)){
    _puzzleActive=null;
    const solved=parseInt(localStorage.getItem('abaPuzzleSolved')||'0',10)+1;
    localStorage.setItem('abaPuzzleSolved', String(solved));
    if (typeof checkMonthlyCompletion === 'function') checkMonthlyCompletion(pa.idx);
    if (typeof checkDailyCompletion === 'function') checkDailyCompletion(pa.idx);
    const t=document.getElementById('pz-title');
    if(t) t.textContent='✅ Bravo ! Puzzle réussi ('+solved+' résolus) — ⏭ pour le suivant';
    showToast(isDef?'🛡️ Menace parée !':'✅ Coup gagnant trouvé !');
  } else {
    pa.tries++;
    doUndo();
    showToast(pa.tries>=2 ? '❌ Raté — pense à 💡 Indice ou ✅ Solution'
      : (isDef?'❌ La menace demeure, réessaie':'❌ Pas le meilleur coup, réessaie'));
  }
}
function puzzleHint(){
  const pa=_puzzleActive; if(!pa){ showToast('Puzzle déjà résolu — ⏭ Suivant'); return; }
  const p=PUZZLES[pa.idx];
  if(p.def){ showToast('💡 Menace adverse : '+p.thr+' — ta parade part de '+p.lab.slice(0,2)); return; }
  showToast('💡 Le coup part de '+p.lab.slice(0,2)+' (source : '+p.src.split('·')[0].trim()+')');
}
function puzzleSolution(){
  const pa=_puzzleActive; if(!pa){ showToast('Puzzle déjà résolu — ⏭ Suivant'); return; }
  const p=PUZZLES[pa.idx];
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
  _puzzleActive=null;
  const bar=document.getElementById('puzzle-bar'); if(bar) bar.style.display='none';
  if(typeof resetGame==='function') resetGame();
  showToast('Puzzles fermés');
}

// ── 🧪 LABO D'AUTO-AMÉLIORATION RÉCURSIVE ──
// De VRAIS duels moteur contre moteur (worker dédié), protocole à seuil :
// screening (3 mutants x 6 parties) -> confirmation (24 parties, adoption si >= 56,25 %).
// Le champion adopté remplace les poids par défaut de l'IA (préset "équilibré").
let _labWorker=null,_labWorkerURL=null,_labRunning=false,_labBusy=false,_labWatchdog=null,_labRetries=0,_labPingOk=false,_labHB=null,_labGameT0=0; let _labLastDuel=null; let _labReplayWorker=null;
function applyLabChampion(){
  try{
    if(localStorage.getItem('abaLabUse')==='0') return false;
    const c=JSON.parse(localStorage.getItem('abaLabChampion')||'null');
    if(c && typeof AI_WEIGHT_PRESETS!=='undefined'){ Object.assign(AI_WEIGHT_PRESETS.balanced, c); return true; }
  }catch(e){}
  return false;
}
applyLabChampion();
// GSPRT (approximation a variance estimee, cf. fastchess/cutechess) : H0 = +0 Elo, H1 = +35 Elo
const LAB_CFG_DEFAULT={
  screenMs:350, screenPlies:60, screenDraw:400, screenTarget:6,
  confMs:600, confPlies:80, confDraw:300, confCap:60, confMin:8,
  elo0:0, elo1:35, alpha:0.05, beta:0.05,
  openingPlies:6, balanceWindow:600, maxGen:20, adaptive:1,
  mode:'sprt',                 // 'sprt' (test A/B à seuil) ou 'spsa' (optimisation continue)
  spsaA:60, spsaC:1.2, spsaAlpha:0.602, spsaGamma:0.101, spsaPairs:1, spsaIters:200,
  keys:['center','cohesion','edge','mob','iso','dng','chain','fortress']
};
let LAB_CFG=Object.assign({}, LAB_CFG_DEFAULT);
function labCfgLoad(){ try{ const s=JSON.parse(localStorage.getItem('abaLabCfg')||'null'); if(s) LAB_CFG=Object.assign({}, LAB_CFG_DEFAULT, s); }catch(e){} return LAB_CFG; }
function labCfgSave(){ try{ localStorage.setItem('abaLabCfg', JSON.stringify(LAB_CFG)); }catch(e){} }
labCfgLoad();
// Bornes SPRT dérivées de alpha/beta (Wald) : A=log((1-b)/a) borne haute, B=log(b/(1-a)) borne basse
function _labBounds(){ const a=LAB_CFG.alpha||0.05, b=LAB_CFG.beta||0.05; return { up:Math.log((1-b)/a), lo:Math.log(b/(1-a)) }; }
function _labLLR(Wn,Dn,Ln,elo0,elo1){
  var N=Wn+Dn+Ln; if(N<2) return 0;
  var s=(Wn+0.5*Dn)/N, m2=(Wn+0.25*Dn)/N, v=m2-s*s;
  if(v<1e-6) v=1e-6;
  var s0=1/(1+Math.pow(10,-elo0/400)), s1=1/(1+Math.pow(10,-elo1/400));
  return (s1-s0)*(2*s-s0-s1)*N/(2*v);
}
function _labEloVal(Wn,Dn,Ln){
  var N=Wn+Dn+Ln; if(N<1) return 0;
  var p=Math.min(0.99,Math.max(0.01,(Wn+0.5*Dn)/N));
  return -400*Math.log(1/p-1)/Math.LN10;
}
function _labEloStr(Wn,Dn,Ln){
  var N=Wn+Dn+Ln; if(N<4) return '';
  var p=Math.min(0.99,Math.max(0.01,(Wn+0.5*Dn)/N));
  var elo=-400*Math.log(1/p-1)/Math.LN10;
  var m2=(Wn+0.25*Dn)/N, v=Math.max(1e-6,m2-p*p);
  var ci=1.96*400/(Math.LN10*p*(1-p))*Math.sqrt(v/N);
  return (elo>=0?'+':'')+Math.round(elo)+' Elo \u00b1 '+Math.round(ci);
}
function _labStatus(msg,isErr){
  var el=document.getElementById('lab-live');
  if(el){ el.innerHTML=msg; el.style.color=isErr?'#e66':'var(--muted)'; }
}
function _labHBstart(){
  _labGameT0=Date.now(); clearInterval(_labHB);
  _labHB=setInterval(function(){
    var s=Math.round((Date.now()-_labGameT0)/1000);
    _labStatus('\ud83c\udfae Partie en cours \u2014 '+s+' s (\u224820-45 s la partie)');
  },1000);
}
function _labHBstop(){ clearInterval(_labHB); _labHB=null; }
function getLabWorker(){
  if(_labWorker) return _labWorker;
  try{
    const blob=new Blob([AI_WORKER_CODE],{type:'application/javascript'});
    _labWorkerURL=URL.createObjectURL(blob);
    _labWorker=new Worker(_labWorkerURL);
    _labWorker.onmessage=_labOnMsg;
    _labWorker.onerror=function(ev){ pauseLab(); _labHBstop(); _labStatus('\u274c Erreur worker : '+((ev&&ev.message)||'inconnue'),true); };
    return _labWorker;
  }catch(e){ return null; }
}
function _labKillWorker(){
  try{ if(_labWorker) _labWorker.terminate(); }catch(e){}
  try{ if(_labWorkerURL) URL.revokeObjectURL(_labWorkerURL); }catch(e){}
  _labWorker=null;_labWorkerURL=null;_labBusy=false;
}
const LAB_RECIPES=[
  ['cohesion', function(v){return v+1;}], ['edge', function(v){return Math.max(2,Math.round(v*0.75));}],
  ['mob', function(v){return v*2;}],      ['iso', function(v){return Math.max(4,Math.round(v*0.8));}],
  ['dng', function(v){return Math.round(v*1.3);}], ['center', function(v){return v+2;}],
  ['cohesion', function(v){return v+2;}], ['iso', function(v){return Math.round(v*1.3);}],
  ['edge', function(v){return Math.round(v*1.25);}],
  ['chain', function(v){return v+2;}],    ['chain', function(v){return Math.round(v*1.3);}],
  ['fortress', function(v){return v+4;}], ['fortress', function(v){return Math.max(4,Math.round(v*0.75));}]
];
function _labMkMutant(ch, key, nv){
  if(nv===ch[key] || nv<0) return null;
  const w={center:ch.center,cohesion:ch.cohesion,edge:ch.edge,mob:ch.mob,iso:ch.iso,dng:ch.dng,chain:ch.chain,fortress:ch.fortress};
  w[key]=nv;
  return {name:key+' '+ch[key]+'\u2192'+nv, w:w, key:key, done:0, target:LAB_CFG.screenTarget, score:0, W:0, D:0, L:0, stop:false};
}
function labMutants(ch, gen){
  const out=[]; const seen={};
  // 1) Recherche adaptative : si le dernier axe gagnant est connu, on pousse plus loin
  //    dans la MÊME direction (pas ×2), + son voisin opposé pour borner l'optimum.
  const st=(function(){ try{ return JSON.parse(localStorage.getItem('abaLabState')||'null'); }catch(e){ return null; } })();
  const lg = (LAB_CFG.adaptive!==0 && st && st.lastGood) ? st.lastGood : null;
  if(lg && ch[lg]!==undefined){
    const cur=ch[lg];
    const step=Math.max(1, Math.round(Math.abs(cur)*0.5)) || 1;
    [cur+step*2, cur+step, Math.max(0,cur-step)].forEach(function(nv){
      const m=_labMkMutant(ch, lg, nv);
      if(m && !seen[lg+':'+nv]){ seen[lg+':'+nv]=1; out.push(m); }
    });
  }
  // 2) Complète avec la liste de recettes tournante jusqu'à 3 candidats
  const base=((gen-2)*3)%LAB_RECIPES.length;
  for(let k=0; k<LAB_RECIPES.length && out.length<3; k++){
    const rec=LAB_RECIPES[(base+k)%LAB_RECIPES.length];
    const key=rec[0], nv=rec[1](ch[key]);
    if(seen[key+':'+nv]) continue;
    const m=_labMkMutant(ch, key, nv);
    if(m){ seen[key+':'+nv]=1; out.push(m); }
  }
  return out.slice(0,3);
}
function _spsaInit(theta){
  return { iter:0, theta:Object.assign({},theta), best:Object.assign({},theta),
           thetaHist:[{iter:0, theta:Object.assign({},theta)}], k:0,
           pending:null, wins:0, draws:0, losses:0 };
}
function _labDefaultState(){
  const champ={center:6,cohesion:4,edge:8,mob:2,iso:18,dng:14,chain:10,fortress:20};
  return { v:3, gen:2, champion:champ, phase:'screen', cands:labMutants(champ,2), confirm:null, totalGames:0,
    eloCurve:[{gen:1,elo:0}], cumElo:0, gameLog:[], lastGood:null, spsa:_spsaInit(champ),
    history:[{gen:1,type:'banc externe',name:'iso26/dng20/center9/cohesion6 test\u00e9s \u2014 finaliste cohesion 6 : 17,5/32 (54,7 %) < seuil',score:null,games:60}] };
}
function labLoad(){
  try{
    const s=JSON.parse(localStorage.getItem('abaLabState')||'null');
    if(s&&s.champion&&s.phase){
      if(s.v===3){ if(!s.spsa) s.spsa=_spsaInit(s.champion); return s; }
      if(s.v===2){ s.v=3; s.eloCurve=s.eloCurve||[{gen:1,elo:0}]; s.cumElo=s.cumElo||0; s.gameLog=s.gameLog||[]; s.lastGood=s.lastGood||null; return s; }
      const st=_labDefaultState();
      st.gen=s.gen||2; st.champion=s.champion; st.totalGames=s.totalGames||0;
      st.history=(s.history||[]);
      st.history.unshift({gen:st.gen, type:'\u2699 v2', name:'SPRT + ouvertures \u00e9quilibr\u00e9es + confirmation 600 ms', score:null, games:0});
      st.cands=labMutants(st.champion, st.gen);
      labSave(st); return st;
    }
  }catch(e){}
  return _labDefaultState();
}
function labSave(st){ try{ localStorage.setItem('abaLabState', JSON.stringify(st)); }catch(e){} }
function startLab(){
  const w=getLabWorker();
  if(!w){ renderLab(); _labStatus('\u274c Worker refus\u00e9 par ce navigateur/lecteur \u2014 ouvre le fichier dans Chrome ou Firefox, ou via le site en ligne',true); showToast('\u26a0\ufe0f Worker indisponible \u2014 Labo impossible ici'); return; }
  _labRunning=true; try{localStorage.setItem('abaLabAutoRun','1');}catch(e){}
  renderLab(); _labStatus('\u23f3 Test du worker\u2026');
  _labPingOk=false;
  try{ w.postMessage({ping:1}); }
  catch(err){ pauseLab(); _labStatus('\u274c postMessage a \u00e9chou\u00e9 : '+err.message,true); return; }
  setTimeout(function(){
    if(_labRunning && !_labPingOk){
      pauseLab();
      _labStatus('\u274c Le worker ne r\u00e9pond pas : ce navigateur ou ce lecteur de fichier le bloque. Ouvre abalone-48.html dans Chrome/Firefox, ou h\u00e9berge-le (GitHub Pages).',true);
      showToast('\u274c Worker muet \u2014 d\u00e9tail dans le panneau Labo');
    }
  },4000);
}
function pauseLab(){ _labRunning=false; _labHBstop(); try{localStorage.setItem('abaLabAutoRun','0');}catch(e){} renderLab(); _labStatus('\u23f8 En pause'); }
function resetLab(){
  if(!confirm('R\u00e9initialiser le Labo ? (champion, historique et progression effac\u00e9s ; les poids par d\u00e9faut reviennent)')) return;
  pauseLab(); _labKillWorker();
  localStorage.removeItem('abaLabState'); localStorage.removeItem('abaLabChampion'); localStorage.removeItem('abaLabAutoRun');
  if(typeof AI_WEIGHT_PRESETS!=='undefined') Object.assign(AI_WEIGHT_PRESETS.balanced,{center:6,cohesion:4,edge:8,mob:2,iso:18,dng:14,chain:10,fortress:20});
  renderLab(); showToast('Labo r\u00e9initialis\u00e9');
}
function labToggleUse(el){
  localStorage.setItem('abaLabUse', el.checked?'1':'0');
  if(el.checked){ applyLabChampion(); showToast('Poids du Labo appliqu\u00e9s \u00e0 l\u2019IA'); }
  else { if(typeof AI_WEIGHT_PRESETS!=='undefined') Object.assign(AI_WEIGHT_PRESETS.balanced,{center:6,cohesion:4,edge:8,mob:2,iso:18,dng:14,chain:10,fortress:20}); showToast('Poids par d\u00e9faut restaur\u00e9s'); }
}
function _labCurrentJob(st){
  if(st.phase==='screen'){
    const c=st.cands.find(function(x){return x.done<x.target && !x.stop;});
    if(c) return {kind:'screen', job:c, idx:st.cands.indexOf(c)};
    return null;
  }
  if(st.phase==='confirm' && st.confirm && st.confirm.done<st.confirm.target) return {kind:'confirm', job:st.confirm, idx:0};
  return null;
}
// ══ MODE SPSA : optimisation stochastique multi-dimensions (méthode des tuners d'échecs) ══
const SPSA_KEYS=['center','cohesion','edge','mob','iso','dng','chain','fortress'];
const SPSA_MIN={center:0,cohesion:0,edge:0,mob:0,iso:0,dng:0,chain:0,fortress:0};
const SPSA_MAX={center:40,cohesion:40,edge:40,mob:20,iso:60,dng:60,chain:40,fortress:60};
function _spsaClamp(w){ const o={}; SPSA_KEYS.forEach(function(k){ o[k]=Math.max(SPSA_MIN[k],Math.min(SPSA_MAX[k], Math.round(w[k]*10)/10)); }); return o; }
// Génère la perturbation ±δ (Rademacher) et les deux points θ+ / θ- à tester
function _spsaPerturb(sp){
  const k=sp.k;
  const ck = LAB_CFG.spsaC / Math.pow(k+1, LAB_CFG.spsaGamma);   // pas de perturbation décroissant
  const delta={}, plus={}, minus={};
  SPSA_KEYS.forEach(function(key){
    const d = (Math.random()<0.5? -1: 1);                        // ±1 aléatoire
    delta[key]=d;
    plus[key] = sp.theta[key] + ck*d;
    minus[key]= sp.theta[key] - ck*d;
  });
  return { ck:ck, delta:delta, plus:_spsaClamp(plus), minus:_spsaClamp(minus) };
}
// Applique le gradient estimé : θ ← θ + a_k * (score) * Δ   (score ∈ [-1,+1] = avantage de θ+)
function _spsaUpdate(sp, pert, score){
  const ak = LAB_CFG.spsaA / Math.pow(sp.k + 1 + 10, LAB_CFG.spsaAlpha); // pas d'apprentissage décroissant
  const nt=Object.assign({}, sp.theta);
  SPSA_KEYS.forEach(function(key){
    // Mise à jour SPSA canonique : θ += ak · score · Δ, mise à l'échelle par la plage
    // du poids (span/60) pour que chaque dimension avance à vitesse comparable.
    const span=(SPSA_MAX[key]-SPSA_MIN[key])/60;
    nt[key] = sp.theta[key] + ak * score * pert.delta[key] * span;
  });
  sp.theta=_spsaClamp(nt);
  sp.k++; sp.iter++;
  sp.thetaHist.push({iter:sp.iter, theta:Object.assign({},sp.theta)});
  if(sp.thetaHist.length>400) sp.thetaHist.splice(0, sp.thetaHist.length-400);
}
// Un pas SPSA = jouer spsaPairs paires (θ+ vs θ-), couleurs échangées, puis update.
function _spsaStep(st){
  const w=getLabWorker(); if(!w){ pauseLab(); return; }
  const sp=st.spsa;
  if(sp.iter>=LAB_CFG.spsaIters){ st.phase='done'; labSave(st); _labRunning=false; renderLab();
    _labStatus('\u2705 SPSA terminé ('+sp.iter+' itérations)'); return; }
  if(!sp.pending){
    const pert=_spsaPerturb(sp);
    sp.pending={ pert:pert, gamesLeft:LAB_CFG.spsaPairs*2, plusScore:0, gi:0 };
    labSave(st);
  }
  const p=sp.pending;
  const colorPlus = (p.gi%2===0)?'black':'white';   // θ+ joue Noir, puis Blanc (équité)
  const seed = sp.iter*100003 + p.gi*7;
  _labBusy=true;
  _labWatchdog=setTimeout(function(){
    _labKillWorker(); _labHBstop(); _labStatus('\u267b Partie trop longue \u2014 red\u00e9marrage\u2026'); _labRetries++;
    if(_labRetries>=3){ pauseLab(); showToast('\u26a0\ufe0f SPSA en pause : partie trop longue'); }
    else if(_labRunning) setTimeout(labStep,500);
  },120000);
  _labLastDuel={ wA:p.pert.plus, wB:p.pert.minus, colorA:colorPlus, seed:seed,
                 ms:LAB_CFG.confMs, maxPlies:LAB_CFG.confPlies, drawWin:LAB_CFG.confDraw, name:'SPSA θ+ vs θ-' };
  w.postMessage({duelGame:true, wA:p.pert.plus, wB:p.pert.minus, colorA:colorPlus, seed:seed,
                 msPerMove:LAB_CFG.confMs, maxPlies:LAB_CFG.confPlies, drawWin:LAB_CFG.confDraw, id:Date.now(), spsa:1});
  _labHBstart();
}
// Traite le résultat d'une partie SPSA
function _spsaOnResult(st, r){
  const sp=st.spsa, p=sp.pending; if(!p) return;
  // winner 'A' = θ+ gagne (+1), 'B' = θ- gagne (0 pour θ+), 'D' = 0.5
  const plusPts = r.winner==='A'?1:(r.winner==='D'?0.5:0);
  p.plusScore += plusPts; p.gi++; p.gamesLeft--;
  if(plusPts===1) sp.wins++; else if(plusPts===0.5) sp.draws++; else sp.losses++;
  st.totalGames++;
  if(p.gamesLeft<=0){
    // score net de θ+ centré sur 0 : (points/parties - 0.5)*2  ∈ [-1,+1]
    const nGames=LAB_CFG.spsaPairs*2;
    const score=((p.plusScore/nGames)-0.5)*2;
    _spsaUpdate(sp, p.pert, score);
    // point de courbe : "force" approx = itération (on trace la norme du déplacement cumulé)
    st.eloCurve=st.eloCurve||[]; 
    st.spsa.pending=null;
    // journal data
    _labDataPush({ t:Date.now(), gen:'spsa', phase:'spsa-iter'+sp.iter, mutant:'SPSA', mutKey:'',
      winner:(score>0?'A':(score<0?'B':'D')), why:'spsa', plies:'', cb:'', cw:'',
      colorA:'', seed:'', wA:sp.theta, wB:null });
    // applique θ courant à l'IA si l'utilisateur a activé "utiliser les poids"
    st.champion=Object.assign({},sp.theta);
    try{ localStorage.setItem('abaLabChampion', JSON.stringify(sp.theta)); }catch(e){}
    applyLabChampion();
  }
  labSave(st);
}

function labStep(){
  if(!_labRunning || _labBusy) return;
  const st=labLoad();
  if(LAB_CFG.mode==='spsa'){ _spsaStep(st); return; }
  let cur=_labCurrentJob(st);
  if(!cur){ _labTransition(st); labSave(st); renderLab();
    cur=_labCurrentJob(st);
    if(!cur || st.phase==='done'){ if(st.phase==='done'){ _labRunning=false; renderLab(); } else if(_labRunning) setTimeout(labStep,300); return; }
  }
  const w=getLabWorker(); if(!w){ pauseLab(); return; }
  const cfg = st.phase==='confirm' ? {ms:LAB_CFG.confMs,maxPlies:LAB_CFG.confPlies,drawWin:LAB_CFG.confDraw} : {ms:LAB_CFG.screenMs,maxPlies:LAB_CFG.screenPlies,drawWin:LAB_CFG.screenDraw};
  const seedBase = st.phase==='confirm' ? (st.gen*100000+77000) : (st.gen*100000+cur.idx*1000);
  const seed = seedBase + Math.floor(cur.job.done/2);
  const colorA = (cur.job.done%2===0)?'black':'white';
  _labBusy=true;
  _labWatchdog=setTimeout(function(){
    _labKillWorker(); _labHBstop(); _labStatus('\u267b Partie trop longue \u2014 red\u00e9marrage du worker\u2026'); _labRetries++;
    if(_labRetries>=3){ pauseLab(); showToast('\u26a0\ufe0f Labo en pause : partie trop longue (3 \u00e9checs)'); }
    else if(_labRunning) setTimeout(labStep,500);
  }, 120000);
  _labLastDuel={ wA:cur.job.w, wB:st.champion, colorA:colorA, seed:seed, ms:cfg.ms, maxPlies:cfg.maxPlies, drawWin:cfg.drawWin, name:cur.job.name };
  w.postMessage({duelGame:true, wA:cur.job.w, wB:st.champion, colorA:colorA, seed:seed, msPerMove:cfg.ms, maxPlies:cfg.maxPlies, drawWin:cfg.drawWin, id:Date.now()});
  _labHBstart();
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
  const savedBoard = board, savedCB = capturedByBlack, savedCW = capturedByWhite;
  try {
    board = {}; capturedByBlack = 0; capturedByWhite = 0;
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
    board = savedBoard; capturedByBlack = savedCB; capturedByWhite = savedCW;
  }
}
function _labOnMsg(e){
  const d=e.data; if(!d) return;
  if(d.pong){ _labPingOk=true; if(_labRunning){ _labStatus('\u2705 Worker OK \u2014 lancement de la 1\u02b3\u1d49 partie\u2026'); labStep(); } return; }
  if(!d.duelGame) return;
  clearTimeout(_labWatchdog); _labWatchdog=null; _labBusy=false; _labRetries=0; _labHBstop();
  if(d.error){ pauseLab(); _labStatus('\u274c Erreur moteur : '+d.error,true); showToast('\u274c Labo arr\u00eat\u00e9 : erreur moteur'); return; }
  const st=labLoad();
  if(LAB_CFG.mode==='spsa'){
    _spsaOnResult(st, d.result||{winner:'D'});
    st.gameLog=st.gameLog||[]; const rr=d.result||{winner:'D'};
    st.gameLog.unshift({ phase:'spsa', name:'SPSA θ+ vs θ-', w:(rr.winner==='A'?'θ+':(rr.winner==='D'?'nulle':'θ-')), why:rr.why||'?', plies:rr.plies||0, moves:(d.moves&&d.moves.length<=90)?d.moves:null, seed:_labLastDuel?_labLastDuel.seed:null, colorA:_labLastDuel?_labLastDuel.colorA:'black' });
    if(d.moves && d.moves.length) _labMineBook(d.moves);
    if(st.gameLog.length>12) st.gameLog.length=12;
    labSave(st); renderLab();
    if(_labRunning) setTimeout(labStep,300);
    return;
  }
  const cur=_labCurrentJob(st);
  if(cur){
    const r=d.result||{winner:'D'};
    cur.job.done++; st.totalGames++;
    if(r.winner==='A'){cur.job.score+=1; cur.job.W=(cur.job.W||0)+1;}
    else if(r.winner==='D'){cur.job.score+=0.5; cur.job.D=(cur.job.D||0)+1;}
    else {cur.job.L=(cur.job.L||0)+1;}
    st.gameLog=st.gameLog||[];
    st.gameLog.unshift({ phase:st.phase, name:cur.job.name,
      w:(r.winner==='A'?'mutant':(r.winner==='D'?'nulle':'champion')),
      why:r.why||'?', plies:r.plies||0,
      seed: _labLastDuel ? _labLastDuel.seed : null,
      colorA: _labLastDuel ? _labLastDuel.colorA : 'black',
      moves: (d.moves && d.moves.length<=90) ? d.moves : null });
    if(d.moves && d.moves.length) _labMineBook(d.moves);
    if(st.gameLog.length>12) st.gameLog.length=12;
    // Journal data complet (pour analyse/export) — une ligne structurée par partie
    _labDataPush({
      t: Date.now(), gen: st.gen, phase: st.phase, mutant: cur.job.name,
      mutKey: cur.job.key||'', winner: r.winner, why: r.why||'?', plies: r.plies||0,
      cb: r.cb!=null?r.cb:'', cw: r.cw!=null?r.cw:'',
      colorA: _labLastDuel?_labLastDuel.colorA:'', seed: _labLastDuel?_labLastDuel.seed:'',
      wA: _labLastDuel?_labLastDuel.wA:null, wB: _labLastDuel?_labLastDuel.wB:null
    });
    _labTransition(st); labSave(st);
  }
  renderLab();
  if(_labRunning) setTimeout(labStep, 300);
}
function _labTransition(st){
  if(st.phase==='screen'){
    st.cands.forEach(function(c){
      if(!c.stop && c.done<c.target && (c.score + (c.target-c.done)) <= c.target/2) c.stop=true;
    });
    if(st.cands.every(function(c){return c.done>=c.target || c.stop;})){
      st.cands.sort(function(a,b){return (b.score/(b.done||1))-(a.score/(a.done||1));});
      const best=st.cands[0];
      st.confirm={name:best.name, w:best.w, done:0, target:LAB_CFG.confCap, score:0, W:0, D:0, L:0, llr:0};
      st.phase='confirm';
    }
  } else if(st.phase==='confirm' && st.confirm){
    const cf=st.confirm; const B=_labBounds();
    cf.llr=_labLLR(cf.W||0,cf.D||0,cf.L||0,LAB_CFG.elo0,LAB_CFG.elo1);
    if(cf.done>=LAB_CFG.confMin && cf.llr>=B.up){ _labAdopt(st, cf); }
    else if(cf.done>=LAB_CFG.confMin && cf.llr<=B.lo){ _labReject(st, cf, false); }
    else if(cf.done>=cf.target){ _labReject(st, cf, true); }
  }
  if(st.gen>LAB_CFG.maxGen && st.phase!=='done'){ st.phase='done'; }
}
function _labAdopt(st, cf){
  st.champion=cf.w;
  try{ localStorage.setItem('abaLabChampion', JSON.stringify(cf.w)); }catch(e){}
  applyLabChampion();
  st.history.unshift({gen:st.gen, type:'\u2705 adopt\u00e9 (SPRT)', name:cf.name, score:cf.score, games:cf.done, elo:_labEloStr(cf.W||0,cf.D||0,cf.L||0)});
  const gain=_labEloVal(cf.W||0,cf.D||0,cf.L||0);
  st.cumElo=(st.cumElo||0)+Math.max(0,gain);
  st.eloCurve=st.eloCurve||[{gen:1,elo:0}];
  st.eloCurve.push({gen:st.gen, elo:Math.round(st.cumElo)});
  st.lastGood=cf.key||null;  // mémorise l'axe muté pour l'intensifier
  showToast('\ud83e\uddea Nouveau champion : '+cf.name+' \u00b7 '+_labEloStr(cf.W||0,cf.D||0,cf.L||0)+' (cumul +'+Math.round(st.cumElo)+')');
  st.gen++; st.cands=labMutants(st.champion, st.gen); st.confirm=null; st.phase='screen';
}
function _labReject(st, cf, undecided){
  st.history.unshift({gen:st.gen, type:(undecided?'\u2753 ind\u00e9cis (cap 60)':'\u2717 rejet\u00e9 (SPRT)'), name:cf.name, score:cf.score, games:cf.done, elo:_labEloStr(cf.W||0,cf.D||0,cf.L||0)});
  st.gen++; st.cands=labMutants(st.champion, st.gen); st.confirm=null; st.phase='screen';
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
  if (typeof renderLab === 'function') renderLab();
}
/* Conservee pour les appels existants : il n'y a plus de fenetre a fermer,
   on revient simplement a l'accueil. */
function closeLabModal(){
  const m=document.getElementById('lab-modal');
  if(m) m.style.display='none';
  if (typeof showPage === 'function') showPage('home');
}
// ══ Outils avancés du Labo (programmeurs) ══
function _labWeightsFromInputs(){
  const w={};
  LAB_CFG_DEFAULT.keys.forEach(function(k){
    const el=document.getElementById('lw-'+k);
    w[k]= el ? Math.max(0, parseFloat(el.value)||0) : 0;
  });
  return w;
}
function labApplyChampion(){
  const w=_labWeightsFromInputs();
  const st=labLoad(); st.champion=w;
  st.cands=labMutants(w, st.gen); st.confirm=null; st.phase='screen';
  labSave(st);
  try{ localStorage.setItem('abaLabChampion', JSON.stringify(w)); }catch(e){}
  applyLabChampion();
  showToast('\ud83c\udff3\ufe0f Champion redéfini manuellement \u2014 nouveaux mutants générés');
  renderLab();
}
function labAddCustomMutant(){
  const w=_labWeightsFromInputs();
  const st=labLoad();
  const ch=st.champion;
  const diff=LAB_CFG_DEFAULT.keys.filter(function(k){return w[k]!==ch[k];}).map(function(k){return k+' '+ch[k]+'\u2192'+w[k];});
  if(!diff.length){ showToast('Aucune différence avec le champion'); return; }
  if(st.phase!=='screen'){ showToast('Ajout possible seulement en phase screening'); return; }
  st.cands.push({name:'\ud83d\udd27 '+diff.join(', '), w:w, done:0, target:LAB_CFG.screenTarget, score:0, W:0, D:0, L:0, stop:false});
  labSave(st);
  showToast('\u2795 Mutant personnalisé ajouté au screening');
  renderLab();
}
function labResetWeightsInputs(){
  const st=labLoad();
  LAB_CFG_DEFAULT.keys.forEach(function(k){ const el=document.getElementById('lw-'+k); if(el) el.value=st.champion[k]; });
}
function labCfgSet(key, val){
  const num=parseFloat(val);
  if(!isNaN(num)){ LAB_CFG[key]=num; labCfgSave(); }
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
  const head=['iso_time','gen','phase','mutant','mut_key','winner','why','plies','cap_black','cap_white','colorA','seed']
    .concat(keys.map(function(k){return 'A_'+k;})).concat(keys.map(function(k){return 'B_'+k;}));
  const rows=[head.join(',')];
  log.forEach(function(r){
    const line=[
      new Date(r.t).toISOString(), r.gen, r.phase, '"'+String(r.mutant).replace(/"/g,'""')+'"', r.mutKey,
      r.winner, r.why, r.plies, r.cb, r.cw, r.colorA, r.seed
    ];
    keys.forEach(function(k){ line.push(r.wA?r.wA[k]:''); });
    keys.forEach(function(k){ line.push(r.wB?r.wB[k]:''); });
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
  if(m==='spsa'){ const st=labLoad(); if(!st.spsa) { st.spsa=_spsaInit(st.champion); labSave(st); } }
  showToast(m==='spsa'?'Mode SPSA activé (optimisation continue)':'Mode SPRT activé (test A/B)');
  renderLab();
}
function labSpsaReset(){
  if(!confirm('Réinitialiser SPSA ? (θ revient au champion actuel, trajectoire effacée)')) return;
  const st=labLoad(); st.spsa=_spsaInit(st.champion); labSave(st);
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
      ? 'SPSA : perturbe les '+SPSA_KEYS.length+' poids simultan\u00e9ment, joue \u03b8+ vs \u03b8-, pousse tous les poids vers l\'am\u00e9lioration. Trouve les interactions entre poids.'
      : 'SPRT : teste une mutation \u00e0 la fois avec arr\u00eat s\u00e9quentiel. Verdict binaire adopt\u00e9/rejet\u00e9.')+'</div>';

  // Bloc état SPSA (si mode actif)
  if(c.mode==='spsa' && st.spsa){
    const sp=st.spsa;
    h+='<div style="background:var(--surface);border-radius:8px;padding:8px;margin-bottom:8px">';
    h+='<div style="font-size:12px;font-weight:700">\ud83e\uddec It\u00e9ration '+sp.iter+' / '+c.spsaIters+'</div>';
    h+='<div style="font-size:11px;color:var(--muted);margin:4px 0">\u03b8 courant : <code>c'+sp.theta.center.toFixed(1)+' coh'+sp.theta.cohesion.toFixed(1)+' e'+sp.theta.edge.toFixed(1)+' m'+sp.theta.mob.toFixed(1)+' iso'+sp.theta.iso.toFixed(1)+' dng'+sp.theta.dng.toFixed(1)+' cha'+sp.theta.chain.toFixed(1)+' for'+sp.theta.fortress.toFixed(1)+'</code></div>';
    // mini-graphe : évolution d'un poids représentatif (cohesion) au fil des itérations
    const H=sp.thetaHist||[];
    if(H.length>=2){
      const W=260,HH=44,pad=4;
      SPSA_KEYS.forEach(function(key,ki){
        const cols=['#d4af37','#4a9463','#c0653b','#5b8bd4','#a069c0','#c94f6d','#4fb8a8','#e0955f'];
        const vals=H.map(function(p){return p.theta[key];});
        const mn=Math.min.apply(null,vals), mx=Math.max.apply(null,vals), sp2=Math.max(0.1,mx-mn);
        const pts=H.map(function(p,i){ const x=pad+i/(H.length-1)*(W-2*pad); const y=HH-pad-((p.theta[key]-mn)/sp2)*(HH-2*pad); return x.toFixed(1)+','+y.toFixed(1); }).join(' ');
        if(ki===0) h+='<svg viewBox="0 0 '+W+' '+HH+'" style="width:100%;height:44px;background:var(--surface2,#12161c);border-radius:6px">';
        h+='<polyline points="'+pts+'" fill="none" stroke="'+cols[ki]+'" stroke-width="1.2" opacity="0.85"/>';
        if(ki===SPSA_KEYS.length-1) h+='</svg>';
      });
      h+='<div style="font-size:9px;color:var(--muted)">trajectoire des '+SPSA_KEYS.length+' poids (normalis\u00e9e) \u00b7 W/D/L \u03b8+ : '+sp.wins+'/'+sp.draws+'/'+sp.losses+'</div>';
    }
    h+='<button class="ctrl-btn" onclick="labSpsaReset()" style="width:auto;padding:3px 10px;font-size:11px;margin-top:4px">\u21ba R\u00e9init SPSA</button>';
    h+='</div>';
  }

  // 1. Édition des poids du champion
  h+='<div style="font-size:12px;font-weight:700;margin-bottom:6px">\ud83c\udff3\ufe0f Poids du champion</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px">';
  LAB_CFG_DEFAULT.keys.forEach(function(k){
    h+='<label style="font-size:11px;color:var(--muted)">'+k+'<input type="number" id="lw-'+k+'" value="'+st.champion[k]+'" step="0.5" min="0" style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:5px;color:var(--text);padding:2px 6px;margin-top:2px"></label>';
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
  h+=_labNum('Screening : parties/mutant','screenTarget',c.screenTarget,1,2,40);
  h+=_labNum('Screening : ms/coup','screenMs',c.screenMs,50,100,5000);
  h+=_labNum('Screening : demi-coups max','screenPlies',c.screenPlies,5,20,200);
  h+=_labNum('Screening : seuil nulle','screenDraw',c.screenDraw,50,50,3000);
  h+=_labNum('Confirmation : ms/coup','confMs',c.confMs,50,100,10000);
  h+=_labNum('Confirmation : demi-coups max','confPlies',c.confPlies,5,20,200);
  h+=_labNum('Confirmation : seuil nulle','confDraw',c.confDraw,50,50,3000);
  h+=_labNum('Confirmation : cap parties','confCap',c.confCap,2,8,400);
  h+=_labNum('Confirmation : min avant verdict','confMin',c.confMin,2,2,100);
  h+=_labNum('SPRT : Elo H0','elo0',c.elo0,1,-50,50);
  h+=_labNum('SPRT : Elo H1','elo1',c.elo1,1,1,200);
  h+=_labNum('SPRT : alpha','alpha',c.alpha,0.01,0.001,0.2);
  h+=_labNum('SPRT : beta','beta',c.beta,0.01,0.001,0.2);
  h+=_labNum('Ouverture : demi-coups','openingPlies',c.openingPlies,1,0,20);
  h+=_labNum('Ouverture : fenêtre équilibre','balanceWindow',c.balanceWindow,50,100,3000);
  h+=_labNum('Générations max','maxGen',c.maxGen,1,1,500);
  h+='<label style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;margin:3px 0"><span style="color:var(--muted)">Recherche adaptative</span><input type="checkbox" '+((c.adaptive!==0)?'checked':'')+' onchange="labCfgSet(\'adaptive\', this.checked?1:0)"></label>';
  if(c.mode==='spsa'){
    h+='<div style="grid-column:1/3;font-size:11px;font-weight:700;margin-top:6px;color:var(--gold)">Hyperparamètres SPSA</div>';
    h+=_labNum('SPSA : a (pas apprentissage)','spsaA',c.spsaA,5,1,500);
    h+=_labNum('SPSA : c (pas perturbation)','spsaC',c.spsaC,0.1,0.1,10);
    h+=_labNum('SPSA : alpha','spsaAlpha',c.spsaAlpha,0.01,0.1,1);
    h+=_labNum('SPSA : gamma','spsaGamma',c.spsaGamma,0.01,0.01,1);
    h+=_labNum('SPSA : paires/itération','spsaPairs',c.spsaPairs,1,1,10);
    h+=_labNum('SPSA : itérations max','spsaIters',c.spsaIters,10,10,5000);
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

  h+='<div style="font-size:10px;color:var(--muted);margin-top:8px;line-height:1.5">\ud83d\udca1 Astuce : baisse <code>SPRT alpha/beta</code> pour des verdicts plus stricts (plus de parties), monte <code>Elo H1</code> pour ne retenir que de grosses améliorations. Édite les poids puis \u00ab Tester comme mutant \u00bb pour lancer ta propre hypothèse dans le screening en cours.</div>';

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
    const whyLabels={'6capt':'6 captures','adj3':'\u00e9cart 3','adjCap':'captures (cap)','adjEval':'\u00e9val (cap)','draw':'nulle','noMove':'bloqu\u00e9','time':'temps'};
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
    _labReplayWorker.postMessage({replayGame:true, colorA:g.colorA, seed:g.seed, moves:g.moves,
      result:{winner:(g.w==='mutant'?'A':(g.w==='nulle'?'D':'B')),plies:g.plies,why:g.why}, id:Date.now()});
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
  const winLabel = res.winner==='A'?'🟢 mutant':(res.winner==='D'?'⚪ nulle':'🔴 champion');
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

function renderLab(){
  const el=document.getElementById('lab-body'); if(!el) return;
  const st=labLoad();
  const useOn = localStorage.getItem('abaLabUse')!=='0';
  const ch=st.champion;
  let h='';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">';
  h+='<span style="font-weight:700">'+(_labRunning?'\ud83d\udd04 En cours':'\u23f8 En pause')+' \u00b7 G\u00e9n\u00e9ration '+st.gen+' \u00b7 '+(st.phase==='screen'?'Screening':(st.phase==='confirm'?'Confirmation (SPRT)':'Termin\u00e9'))+'</span>';
  h+='<span style="font-size:11px;color:var(--muted)">'+st.totalGames+' parties \u00b7 \u00e9cran ~20 s \u00b7 confirm. ~40 s/partie</span></div>';
  h+='<div id="lab-live" style="font-size:11px;margin-top:6px;color:var(--muted)"></div>';
  h+='<div style="margin:8px 0;font-size:12px">Champion actuel : <code>center '+ch.center+' \u00b7 cohesion '+ch.cohesion+' \u00b7 edge '+ch.edge+' \u00b7 mob '+ch.mob+' \u00b7 iso '+ch.iso+' \u00b7 dng '+ch.dng+' \u00b7 chain '+ch.chain+' \u00b7 fortress '+ch.fortress+'</code></div>';
  function bar(name,score,done,target){
    const pct=target?Math.round(100*done/target):0;
    const wr=done?Math.round(100*score/done):0;
    return '<div style="margin:6px 0"><div style="display:flex;justify-content:space-between;font-size:12px"><span>'+name+'</span><span>'+score+'/'+done+' ('+(done?wr:0)+'%)</span></div>'
      +'<div style="height:6px;background:var(--surface);border-radius:3px;overflow:hidden"><div style="height:100%;width:'+pct+'%;background:var(--gold)"></div></div></div>';
  }
  if(st.phase==='screen'){ st.cands.forEach(function(c){ h+=bar(c.name+(c.stop?' \u00b7 \u23f9 stopp\u00e9 (futilit\u00e9)':''),c.score,c.done,c.target); }); }
  else if(st.phase==='confirm' && st.confirm){
    const cf=st.confirm;
    h+=bar('\ud83c\udfc6 Finaliste : '+cf.name, cf.score, cf.done, cf.target);
    const llr=cf.llr||0;
    const lpct=Math.round(100*Math.min(1,Math.max(0,(llr+2.944)/5.888)));
    h+='<div style="display:flex;justify-content:space-between;font-size:11px;margin-top:4px"><span>\u2717 rejet</span><span>LLR '+llr.toFixed(2)+' / \u00b12,94</span><span>adoption \u2713</span></div>';
    h+='<div style="height:6px;background:linear-gradient(90deg,#a33,#555,#3a3);border-radius:3px;position:relative"><div style="position:absolute;left:'+lpct+'%;top:-3px;width:2px;height:12px;background:#fff"></div></div>';
    const es=_labEloStr(cf.W||0,cf.D||0,cf.L||0);
    h+='<div style="font-size:11px;color:var(--muted);margin-top:4px">'+(es?('Estimation : '+es+' \u00b7 '):'')+'arr\u00eat automatique d\u00e8s que la statistique tranche \u00b7 cap 60 parties</div>';
  }
  // ── Courbe d'\u00e9volution de l'\u00c9lo cumul\u00e9 (SVG) ──
  const curve=(st.eloCurve||[]).filter(function(p){return p;});
  if(curve.length>=2){
    const W=280,H=64,pad=6;
    const maxE=Math.max(10, Math.max.apply(null,curve.map(function(p){return p.elo;})));
    const minG=curve[0].gen, maxG=curve[curve.length-1].gen, spanG=Math.max(1,maxG-minG);
    const pts=curve.map(function(p){
      const x=pad+(p.gen-minG)/spanG*(W-2*pad);
      const y=H-pad-(p.elo/maxE)*(H-2*pad);
      return x.toFixed(1)+','+y.toFixed(1);
    }).join(' ');
    h+='<div style="margin-top:10px;font-size:12px;font-weight:700">\ud83d\udcc8 \u00c9lo cumul\u00e9 : +'+Math.round(st.cumElo||0)+'</div>';
    h+='<svg viewBox="0 0 '+W+' '+H+'" style="width:100%;height:64px;background:var(--surface);border-radius:8px;margin-top:4px">'
      +'<polyline points="'+pts+'" fill="none" stroke="var(--gold)" stroke-width="2"/>'
      +curve.map(function(p){const x=pad+(p.gen-minG)/spanG*(W-2*pad);const y=H-pad-(p.elo/maxE)*(H-2*pad);return '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.5" fill="var(--gold)"/>';}).join('')
      +'</svg>';
  }
  // ── Journal des derni\u00e8res parties ──
  if(st.gameLog && st.gameLog.length){
    h+='<div style="margin-top:10px;font-size:12px;font-weight:700">\ud83c\udf2e Derni\u00e8res parties</div>';
    st.gameLog.slice(0,6).forEach(function(g,gi){
      const icon = g.w==='mutant' ? '\ud83d\udfe2' : (g.w==='nulle' ? '\u26aa' : '\ud83d\udd34');
      const whyLabel = {'6capt':'6 captures','adj3':'\u00e9cart 3','adjCap':'captures','adjEval':'\u00e9val','time':'temps','noMove':'bloqu\u00e9','draw':'nulle'}[g.why]||g.why;
      const btn = g.moves ? '<button onclick="labReplay('+gi+')" style="background:none;border:1px solid var(--gold);color:var(--gold);border-radius:5px;font-size:10px;padding:0 6px;cursor:pointer;margin-left:6px">\u25b6 revoir</button>' : '';
      h+='<div style="display:flex;align-items:center;justify-content:space-between;font-size:11px;color:var(--muted);margin:3px 0"><span>'+icon+' '+g.name+' \u00b7 '+g.w+' ('+whyLabel+', '+g.plies+' coups)</span>'+btn+'</div>';
    });
  }
  if(st.history.length){
    h+='<div style="margin-top:10px;font-size:12px;font-weight:700">Historique</div>';
    st.history.slice(0,8).forEach(function(x){
      h+='<div style="font-size:11px;color:var(--muted);margin:2px 0">G'+x.gen+' \u00b7 '+x.type+' \u00b7 '+x.name+(x.score!==null&&x.score!==undefined?' \u00b7 '+x.score+'/'+x.games:'')+(x.elo?' \u00b7 '+x.elo:'')+'</div>';
    });
  }
  h+='<label style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:12px"><input type="checkbox" '+(useOn?'checked':'')+' onchange="labToggleUse(this)"> Utiliser les poids adopt\u00e9s pour l\u2019IA</label>';
  el.innerHTML=h;
  const bs=document.getElementById('lab-start'); if(bs) bs.textContent=_labRunning?'\u23f8 Pause':'\u25b6 D\u00e9marrer';
  if(document.getElementById('lab-adv') && document.getElementById('lab-adv').style.display!=='none') renderLabAdvanced();
}
// Reprise automatique si le Labo tournait a la derniere session
try{ if(localStorage.getItem('abaLabAutoRun')==='1'){ setTimeout(function(){ if(!_labRunning){ startLab(); if(typeof showToast==='function') showToast('\ud83e\uddea Labo repris en arri\u00e8re-plan'); } }, 4000); } }catch(e){}

// ── Crédibilité : vraies stats, vrai défi du jour, bannières honnêtes ──
function _dailyPuzzleIdx(){ try{ return Math.floor(Date.now()/86400000)%puzzlesData.length; }catch(e){ return 0; } }
function openDailyPuzzleInline(){
  try{
    const N=puzzlesData.length, idx=_dailyPuzzleIdx();
    loadPuzzle(idx);
    showToast('\ud83d\udd25 D\u00e9fi du jour \u2014 \u00ab '+puzzlesData[idx].title+' \u00bb ('+(idx+1)+'/'+N+')');
  }catch(e){}
}
function openDailyPuzzle(){
  showPage('puzzles');
  setTimeout(function(){
    document.querySelectorAll('.puzzle-mode-btn').forEach(function(b){b.classList.remove('active');});
    openDailyPuzzleInline();
  },60);
}
function updateHeroDaily(){
  const el=document.getElementById('hero-daily');
  if(el && typeof puzzlesData!=='undefined'){ el.textContent='\ud83d\udd25 D\u00e9fi du jour \u2014 Puzzle '+(_dailyPuzzleIdx()+1)+'/'+puzzlesData.length; }
}
function updateHeroStats(){
  const el=document.getElementById('hero-stats'); if(!el) return;
  let g=0,p=0;
  try{ g=parseInt(localStorage.getItem('abaGamesFinished')||'0',10)||0; }catch(e){}
  try{ p=parseInt(localStorage.getItem('abaPuzzleSolved')||'0',10)||0; }catch(e){}
  el.textContent = (g+p>0) ? ('\u26ab '+g+' parties termin\u00e9es \u00b7 \ud83e\udde9 '+p+' puzzles r\u00e9solus \u2014 sur cet appareil')
                           : '100 % hors-ligne \u00b7 aucun compte requis';
}
function _injectHonestyBanners(){
  const txt={
    'modal-login':'\ud83d\udd12 <b>Profil 100 % local</b> \u2014 stock\u00e9 uniquement sur cet appareil (localStorage). Aucun serveur, aucun envoi. N\u2019utilise pas un mot de passe sensible.',
    'modal-signup':'\ud83d\udd12 <b>Profil 100 % local</b> \u2014 stock\u00e9 uniquement sur cet appareil (localStorage). Aucun serveur, aucun envoi. N\u2019utilise pas un mot de passe sensible.'
  };
  Object.keys(txt).forEach(function(id){
    const m=document.getElementById(id); if(!m || m.querySelector('.honesty-note')) return;
    const box=m.querySelector('.modal-box')||m.firstElementChild||m;
    const b=document.createElement('div');
    b.className='honesty-note';
    b.style.cssText='font-size:11px;line-height:1.5;color:var(--muted);background:rgba(255,255,255,0.05);border:1px solid var(--border,#333);border-radius:8px;padding:8px 10px;margin:8px 0';
    b.innerHTML=txt[id];
    box.insertBefore(b, box.children[1]||null);
  });
}
window.addEventListener('load', function(){ updateHeroDaily(); updateHeroStats(); _injectHonestyBanners(); });

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
  if(CurrentTurn.get()!==HumanColor.get() && !gameOver){ setTimeout(function(){ if(typeof aiMove==='function') aiMove(); }, 700); }
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
function resignGame(){
  if(typeof gameOver!=='undefined' && gameOver){ showToast('La partie est d\u00e9j\u00e0 termin\u00e9e'); return; }
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
  if(typeof gameOver!=='undefined' && gameOver) return;
  const mover=CurrentTurn.get(), now=Date.now();
  C[mover]-=(now-C.last); C[mover]+=C.inc;
  C.run=(mover==='black'?'white':'black'); C.last=now;
  _tClockRender();
}
function _tClockFmt(ms){ ms=Math.max(0,ms); const s=Math.floor(ms/1000); return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0'); }
function _tClockRender(){
  const C=_tClock; if(!C) return;
  let b=C.black, w=C.white;
  if(!C.paused && !(typeof gameOver!=='undefined'&&gameOver)){ const el=Date.now()-C.last; if(C.run==='black') b-=el; else w-=el; }
  const eb=document.getElementById('tb-cb'), ew=document.getElementById('tb-cw');
  if(eb){ eb.textContent=_tClockFmt(b); eb.style.color=(C.run==='black'&&!C.paused)?'var(--gold)':'var(--text)'; }
  if(ew){ ew.textContent=_tClockFmt(w); ew.style.color=(C.run==='white'&&!C.paused)?'var(--gold)':'var(--text)'; }
  if(_tourneyMatch && !C.paused && !(typeof gameOver!=='undefined'&&gameOver)){
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
  const t = capturedByBlack; capturedByBlack = capturedByWhite; capturedByWhite = t;
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
  if (gameOver) return;
  // Mode moteur experimental (NNUE) : les poids doivent etre prets AVANT de
  // lancer le calcul. Meme patron que ensureGameBanks() -- charge une fois
  // (mis en cache), puis relance aiMove() automatiquement.
  if (_engineMode && !NNUE_WEIGHTS_CACHE) {
    loadNNUEWeights().then(function(){ if (!gameOver) aiMove(); });
    return;
  }
  const ai = aiColor();          // couleur jouée par l'IA (blanc par défaut, noir si on affronte le Bot Noir)
  const human = HumanColor.get();
  const moves = getAllMovesForColor(ai);
  if (!moves.length) { CurrentTurn.set(human); updateStatus(); return; }

  // ── Livre d'ouvertures STATISTIQUE (~15000 parties Migs + AbalOnline, 5 variantes, pondéré par taux de victoire) ──
  if (_bookNode && _bookNode.k) {
    const statMove = pickBookMove(_bookNode, moves);
    if (statMove) { executeAIMove(statMove); return; }
  }

  // ── Repli empreintes historiques : position exacte inconnue du livre, mais une
  //    position très proche (même trait) existe dans les 418595 empreintes réelles ──
  if (boardSnapshots.length < 20) {
    const empMove = pickEmpreinteFallbackMove(ai, moves, boardSnapshots.length);
    if (empMove) { executeAIMove(empMove); return; }
  }

  // ── Livre d'ouvertures (début de partie) : joue un coup LÉGAL connu si disponible ──
  if (boardSnapshots.length < 16) {
    const bookMove = getOpeningMove(ai, moves);
    if (bookMove) { executeAIMove(bookMove); return; }
  }

  // Profondeur et budget temps par difficulté — table partagée AI_DIFFICULTY_CONFIG
  const config = Object.assign({}, AI_DIFFICULTY_CONFIG[aiDifficulty] || AI_DIFFICULTY_CONFIG.medium);
  if (typeof _tourneyMatch!=='undefined' && _tourneyMatch && _tourneyMatch.cfg) { config.depth=_tourneyMatch.cfg.depth; config.time=_tourneyMatch.cfg.time; }

  // Niveau facile : décision immédiate (un peu d'aléatoire), pas besoin du worker
  if (aiDifficulty === 'easy' && !(typeof _tourneyMatch!=='undefined' && _tourneyMatch)) {
    moves.sort(function(a,b){ return (a.code||9)-(b.code||9); });
    executeAIMove(moves[Math.floor(Math.random()*Math.min(4,moves.length))]);
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
    capturedByWhite: capturedByWhite,
    capturedByBlack: capturedByBlack,
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
    if (metrics) updateAIMetrics(metrics);
    if (gameOver) return;
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
      if (e.data) updateAIMetrics(e.data.metrics);
      if (gameOver) return;
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
      if (gameOver) return;
      const chosen = searchBestMove(ai, config.depth, config.time, _gameHistKeys());
      if (!chosen) { CurrentTurn.set(human); updateStatus(); return; }
      executeAIMove(chosen);
    }, config.time + 4000);
    // Envoie la position au worker
    worker.postMessage({
      board: JSON.parse(JSON.stringify(board)),
      capturedByWhite: capturedByWhite,
      capturedByBlack: capturedByBlack,
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
      if (gameOver) return;
      if (!chosen) { CurrentTurn.set(human); updateStatus(); return; }
      executeAIMove(chosen);
    }, 30);
  }
}

// Affiche / masque l'indicateur "L'IA réfléchit…"
function showAIThinking(on) {
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
  if (gameOver || !chosen) return;
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
    if (ai === 'white') capturedByWhite++; else capturedByBlack++;
    updateCaptures();
    const ejCount = (ai === 'white') ? capturedByWhite : capturedByBlack;
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
  CurrentTurn.set(human); moveCount++;
  _emitAbaEvent('movePlayed', { color: (human==='black'?'white':'black'), label: label,
    moveCount: moveCount, capturedByBlack: capturedByBlack, capturedByWhite: capturedByWhite });
  if (!gameOver) playSfx('occ_change');   // 🔊 « c'est ton tour »
  updateStatus(); drawBoard();
  if (explicationIA && !gameOver) showAIExplainBubble(explicationIA);
  // Mode Coach : avertit le joueur si l'IA menace une éjection
  if (coachEnabled && !gameOver) {
    setTimeout(function() {
      const myMoves = getAllMovesForColor(ai);  // ce que l'IA pourrait faire ensuite
      const threat = myMoves.some(function(m){ return m.eject; });
      if (threat) {
        showCoachBubble({ text: 'Vigilance ! L\'adversaire menace d\'éjecter une de tes billes au prochain coup. 🛡️', type: 'warn' });
      }
    }, 300);
  }
}

