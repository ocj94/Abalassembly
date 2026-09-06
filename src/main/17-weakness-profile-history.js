/* ═══════════════════════════════════════════
   PROFIL DE FAIBLESSE PAR ZONE — construit à partir de vraies données
   d'analyse après-partie (perte réelle par coup, best - played), jamais
   inventé. Persiste entre parties (contrairement à l'analyse elle-même,
   éphémère). Nécessite un minimum d'échantillons par zone avant de
   conclure quoi que ce soit -- pas de recommandation sur un tirage trop
   petit pour être significatif.
═══════════════════════════════════════════ */
const GYM_ZONE_MIN_SAMPLES = 8;
const GYM_ZONE_MIN_GAP = 50; // écart minimal (points d'éval) pour juger la difference significative
const GYM_ZONE_EXERCISE_MAP = {
  bord: { id: 'reflex', label: 'Réflexe', why: 'repérer les billes en bordure menacées par un sumito' },
  intermediaire: { id: 'acuity', label: 'Acuité', why: 'repérer rapidement les menaces sur le plateau' },
  coeur: { id: 'flexibility', label: 'Flexibilité', why: 'garder le contrôle du centre en changeant de plan' }
};

function _moveZone(cells){
  if (!cells || !cells.length) return null;
  let sum = 0;
  for (let i = 0; i < cells.length; i++){
    const ax = rcToAxial(cells[i].r, cells[i].c);
    sum += axHexDist(ax, EVAL_CENTER);
  }
  return _zoneDistance(sum / cells.length);
}

/* Appelé après chaque "Analyser cette partie" -- accumule la perte réelle
   par zone, pour LE CAMP DU JOUEUR HUMAIN uniquement (pas les coups de
   l'IA qu'on analyserait par ailleurs). */
function updateWeaknessProfile(results){
  if (typeof monCamp !== 'function') return;
  const human = monCamp();
  let profile;
  try { profile = JSON.parse(localStorage.getItem('abaWeaknessProfile') || '{}'); } catch(e){ profile = {}; }
  ['coeur','intermediaire','bord'].forEach(function(z){ if (!profile[z]) profile[z] = { lossSum: 0, count: 0 }; });
  results.forEach(function(r){
    if (!r.job || r.job.color !== human) return;
    if (r.played == null || r.best == null) return;
    const zone = _moveZone(r.job.played.cells);
    if (!zone || !profile[zone]) return;
    profile[zone].lossSum += Math.max(0, r.best - r.played);
    profile[zone].count++;
  });
  try { localStorage.setItem('abaWeaknessProfile', JSON.stringify(profile)); } catch(e){}
}

/* Retourne la zone la plus faible SI l'écart est réellement significatif
   (assez d'échantillons + écart minimal), sinon null -- honnête plutôt
   que de forcer une conclusion sur du bruit. */
function getWeaknessSummary(){
  let profile;
  try { profile = JSON.parse(localStorage.getItem('abaWeaknessProfile') || '{}'); } catch(e){ return null; }
  const stats = ['coeur','intermediaire','bord'].map(function(z){
    const d = profile[z];
    if (!d || d.count < GYM_ZONE_MIN_SAMPLES) return null;
    return { zone: z, avgLoss: d.lossSum / d.count, count: d.count };
  }).filter(Boolean);
  if (stats.length < 2) return null;
  stats.sort(function(a,b){ return b.avgLoss - a.avgLoss; });
  const worst = stats[0], best = stats[stats.length-1];
  if (worst.avgLoss - best.avgLoss < GYM_ZONE_MIN_GAP) return null;
  return worst;
}
/* HAD (divergence humain/IA) : reprend le meme abaWeaknessProfile, mais
   cumule les 3 zones ensemble plutot que de les comparer -- une seule
   moyenne globale de "combien de points d'eval tu perds par coup en
   moyenne, par rapport au meilleur coup selon le moteur". Reutilise la
   persistance existante, aucune nouvelle collecte de donnees. */
const HAD_MIN_SAMPLES = 10;
function getHADSummary(){
  let profile;
  try { profile = JSON.parse(localStorage.getItem('abaWeaknessProfile') || '{}'); } catch(e){ return null; }
  let lossSum = 0, count = 0;
  ['coeur','intermediaire','bord'].forEach(function(z){
    const d = profile[z];
    if (!d) return;
    lossSum += d.lossSum; count += d.count;
  });
  if (count < HAD_MIN_SAMPLES) return null;
  return { avgLoss: lossSum / count, count: count };
}

function renderGameReport(results){
  if (typeof updateWeaknessProfile === 'function') updateWeaknessProfile(results);
  const side={ black:{n:0,loss:0,best:0,inacc:0,err:0,blun:0}, white:{n:0,loss:0,best:0,inacc:0,err:0,blun:0} };
  const rows=[];
  results.forEach(function(r){
    const c=r.job.color, S=side[c];
    const loss=(r.played!=null) ? Math.max(0, r.best - r.played) : 0;
    S.n++; S.loss+=loss;
    const cl=classifyLoss(loss);
    if(loss<=0) S.best++; else if(loss<=600) S.inacc++; else if(loss<=1800) S.err++; else S.blun++;
    let bestLab='?'; try{ if(r.bestMove) bestLab=moveToABAPRO(r.bestMove.cells,r.bestMove.dir,r.bestMove.type); }catch(e){}
    rows.push({ idx:r.job.index, turn:Math.ceil((r.job.index+1)/2), color:c, played:r.job.label, eject:r.job.eject, best:bestLab, loss:loss, rank:r.rank, total:r.total, cl:cl });
  });
  function prec(S){ return S.n? lossToPrecision(S.loss/S.n):0; }
  function card(name,sym,S){
    return '<div style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px;text-align:center">'
      +'<div style="font-weight:600">'+sym+' '+name+'</div>'
      +'<div style="font-size:26px;color:var(--gold);font-weight:700;margin:4px 0">'+prec(S)+'%</div>'
      +'<div style="font-size:11px;color:var(--muted)">précision · '+S.n+' coups</div>'
      +'<div style="font-size:11px;margin-top:5px">✓ '+S.best+' · 📉 '+S.inacc+' · ⚠️ '+S.err+' · ❌ '+S.blun+'</div></div>';
  }
  // Pires coups (par perte décroissante)
  const worst=rows.filter(function(x){return x.loss>120;}).sort(function(a,b){return b.loss-a.loss;}).slice(0,10);
  let html='<div style="display:flex;gap:8px;margin-bottom:12px">'+card('Noir','⚫',side.black)+card('Blanc','⚪',side.white)+'</div>';
  if(worst.length){
    html+='<div style="color:var(--gold);font-size:12px;font-weight:600;margin:10px 0 4px">Coups à revoir <span style="color:var(--muted);font-weight:400">· cliquer pour voir la position</span></div>';
    worst.forEach(function(x){
      html+='<div onclick="reportGoto('+x.idx+')" onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\'\'" style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-bottom:1px solid var(--border);font-size:12px;cursor:pointer;border-radius:4px">'
        +'<span style="width:58px;color:var(--muted)">Coup '+x.turn+' '+(x.color==='black'?'⚫':'⚪')+'</span>'
        +'<span style="width:64px;font-family:monospace">'+escapeHtml(x.played)+(x.eject?' ✕':'')+'</span>'
        +'<span style="color:var(--muted)">→ mieux :</span>'
        +'<span style="width:64px;font-family:monospace;color:var(--gold)">'+escapeHtml(x.best)+'</span>'
        +'<span style="flex:1;text-align:right;color:'+x.cl.cls+'">'+x.cl.tag+'</span></div>';
    });
  } else {
    html+='<div style="color:var(--muted);text-align:center;padding:16px">Aucune erreur notable — partie propre ! 👏</div>';
  }
  html+='<div style="font-size:10px;color:var(--muted);margin-top:10px">Analyse à profondeur 3 — indicative. « mieux » = coup que le moteur préfère ; la perte est en points d\'éval (~2000 = une bille).</div>';
  openReportModal(html);
}

function openReportModal(inner){
  const body=document.getElementById('report-body'); if(body) body.innerHTML=inner;
  const m=document.getElementById('report-modal'); if(m) m.style.display='flex';
}
function closeReportModal(){ const m=document.getElementById('report-modal'); if(m) m.style.display='none'; }
// Saute à la position AVANT un coup du rapport (la suggestion « mieux : X » s'applique à ce qu'on voit)
function reportGoto(idx){
  closeReportModal();
  if(typeof boardSnapshots==='undefined' || !boardSnapshots.length) return;
  const t=Math.max(0, Math.min(idx-1, boardSnapshots.length-1));
  replayMode=true; replayCurrentIdx=t;
  const rb=document.getElementById('replay-btn'); if(rb){ rb.style.display='block'; rb.textContent='■ Quitter replay'; }
  if(typeof loadSnapshot==='function') loadSnapshot(t);
  showToast('📍 Position avant le coup '+Math.ceil((idx+1)/2)+' — ◀ ▶ pour naviguer');
}

// ── MODE PUZZLES : positions tactiques minées dans les vraies parties (AbalOnline) ──
// Chaque puzzle : trouve le coup d'éjection nettement gagnant (vérifié moteur prof. 3).
/* SINGLE_MOVE_PUZZLE_COUNT : nombre de puzzles a 1 coup, en tete du
   tableau PUZZLES -- fixe independamment de sa longueur totale, pour que
   les tirages quotidien/mensuel (flux de resolution interactif clic-glisser,
   pense pour 1 seul coup) ne piochent jamais dans les puzzles multi-coups
   ajoutes ensuite (consultation en lecture seule, pas de resolution
   interactive pour ceux-la). */
const SINGLE_MOVE_PUZZLE_COUNT = 78;
const PUZZLES=[{"bm":["3,4","3,6","5,6","4,6","4,5","6,0","8,0","0,0","3,3","3,2"],"wm":["3,1","7,2","4,7","5,1","4,2","6,1","7,1","6,2","2,0","3,0"],"cb":4,"cw":4,"c":"black","sol":{"cells":[{"r":3,"c":4},{"r":3,"c":3},{"r":3,"c":2}],"dir":{"q":-1,"r":0}},"lab":"f6f5","d":1,"gap":3950,"src":"vincent vs Seohee Park · custom · 2022-04-26","mv":17},{"bm":["6,4","6,1","1,4","1,2","7,4","0,4","2,2","6,3","1,5","7,2","7,5","2,1","4,4","3,3"],"wm":["2,3","6,2","2,4","7,0","1,3","2,5","7,3","8,3","1,1","5,4","6,5","5,3","1,0","0,0"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":2,"c":2},{"r":3,"c":3},{"r":4,"c":4}],"dir":{"q":0,"r":-1}},"lab":"e5f5","d":1,"gap":3882,"src":"Vind313 vs Guru_Ajna · custom · 2022-04-16","mv":7},{"bm":["1,3","7,5","6,5","4,4","3,4","6,4","7,4","8,4","7,1","6,2","5,2","4,3","3,3","5,3"],"wm":["0,4","1,4","4,5","0,1","4,1","4,2","2,1","2,4","2,3","1,1","2,2","7,0","6,1","3,2"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":3,"c":3},{"r":4,"c":3},{"r":5,"c":2}],"dir":{"q":-1,"r":1}},"lab":"f5e4","d":1,"gap":3864,"src":"Gramgroum vs Morchel · standard · 2022-04-10","mv":41},{"bm":["8,1","4,5","6,1","3,3","4,3","1,4","2,2","2,4","2,3","7,5","6,4","6,3","6,2","5,3"],"wm":["8,0","0,0","4,4","5,4","4,6","7,1","8,3","3,5","3,4","4,2","5,2","7,3","6,5","7,4"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":6,"c":3},{"r":5,"c":3},{"r":4,"c":3}],"dir":{"q":0,"r":1}},"lab":"e4d4","d":2,"gap":2014,"src":"Abadeus vs Vind313 · custom · 2022-08-09","mv":27},{"bm":["6,4","6,5","4,6","4,4","3,3","7,2","6,3","4,7","5,7","5,6"],"wm":["4,5","8,3","7,4","2,3","3,5","2,4","3,4","5,3","5,5","5,4"],"cb":4,"cw":4,"c":"black","sol":{"cells":[{"r":6,"c":5},{"r":5,"c":6},{"r":4,"c":7}],"dir":{"q":-1,"r":1}},"lab":"e8d7","d":2,"gap":2012,"src":"vincent vs Seohee Park · custom · 2022-04-28","mv":11},{"bm":["3,3","7,3","7,4","2,5","4,5","4,6","8,0","2,4","3,4","4,4","3,5"],"wm":["3,6","0,2","1,3","6,4","7,2","6,3","8,2","6,2","5,4","6,1","1,4","7,1"],"cb":2,"cw":3,"c":"black","sol":{"cells":[{"r":2,"c":4},{"r":3,"c":5},{"r":4,"c":6}],"dir":{"q":0,"r":-1}},"lab":"e7f7","d":2,"gap":2002,"src":"Seohee Park vs vincent · custom · 2022-04-28","mv":13},{"bm":["6,2","3,4","4,2","6,1","6,4","4,6","5,5","5,3","8,0","6,3","5,4","4,5","7,0"],"wm":["4,1","5,6","6,6","4,7","4,3","3,3","2,3","2,5","2,4","3,5","7,3","8,1","7,2","7,1"],"cb":0,"cw":1,"c":"black","sol":{"cells":[{"r":6,"c":3},{"r":5,"c":4},{"r":4,"c":5}],"dir":{"q":-1,"r":1}},"lab":"e6d5","d":2,"gap":2002,"src":"Air vs Shot · custom · 2021-08-26","mv":9},{"bm":["6,4","6,5","5,5","4,2","4,3","5,3","4,4","7,3","7,4","6,2","6,3","7,2","5,4"],"wm":["5,6","2,5","1,4","4,5","1,3","2,4","2,3","3,5","3,4","3,3","4,7","4,6","3,2","5,7"],"cb":0,"cw":1,"c":"black","sol":{"cells":[{"r":5,"c":5},{"r":5,"c":4},{"r":5,"c":3}],"dir":{"q":1,"r":0}},"lab":"d4d5","d":2,"gap":2000,"src":"Simon Galli vs stonge · the_wall · 2021-04-13","mv":29},{"bm":["3,3","2,4","3,6","4,6","2,5","5,3","3,4","2,3","4,4","4,3","6,5","7,4","7,3","6,6"],"wm":["7,1","5,1","1,1","1,2","2,2","4,2","3,2","5,4","6,3","7,2","6,2","6,4","5,5","4,5"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":6,"c":4},{"r":6,"c":3},{"r":6,"c":2}],"dir":{"q":1,"r":0}},"lab":"c3c4","d":2,"gap":1996,"src":"saabalone vs Egnots13 · alliances · 2022-01-15","mv":12},{"bm":["6,6","5,2","6,1","7,2","7,0","6,0","6,4","5,4","3,1","4,2","6,5","8,3","7,3","7,4"],"wm":["5,5","6,2","1,1","2,2","2,5","2,4","3,5","3,3","2,3","3,4","6,3","5,3","4,3","4,4"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":6,"c":3},{"r":5,"c":3},{"r":4,"c":3}],"dir":{"q":0,"r":1}},"lab":"e4d4","d":2,"gap":1990,"src":"chan vs kihece · standard · 2020-10-22","mv":42},{"bm":["2,6","1,0","1,1","3,6","6,3","2,5","3,5","3,3","7,4","4,3","4,4","5,3","5,6","6,5"],"wm":["5,1","0,0","3,4","2,4","5,4","7,1","3,0","7,2","6,2","4,6","4,5","2,2","2,3"],"cb":1,"cw":0,"c":"white","sol":{"cells":[{"r":2,"c":4},{"r":2,"c":3},{"r":2,"c":2}],"dir":{"q":1,"r":0}},"lab":"g5g6","d":2,"gap":1988,"src":"saabalone vs ocj94 · alliances · 2020-09-22","mv":18},{"bm":["5,6","1,2","7,5","6,5","3,0","3,1","4,1","0,4","0,2","0,3","3,2","5,3","6,4","2,2"],"wm":["5,7","5,4","5,5","6,2","7,1","8,0","7,3","6,3","4,4","4,5","3,4","3,5"],"cb":2,"cw":0,"c":"white","sol":{"cells":[{"r":5,"c":5},{"r":4,"c":5},{"r":3,"c":4}],"dir":{"q":0,"r":1}},"lab":"f6e6","d":2,"gap":1976,"src":"Echo vs Simon Galli · snakes_variant · 2021-04-30","mv":26},{"bm":["3,6","6,4","7,4","3,7","2,4","2,3","2,5","1,5","5,6","4,5","4,6","4,4","6,3","5,3"],"wm":["3,5","5,4","1,1","4,7","3,3","2,2","2,0","6,1","6,2","5,2","2,1","4,1","5,1","3,4"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":3,"c":5},{"r":3,"c":4},{"r":3,"c":3}],"dir":{"q":1,"r":0}},"lab":"f5f6","d":2,"gap":1974,"src":"saabalone vs stonge · alliances · 2020-11-20","mv":18},{"bm":["7,0","8,2","8,1","7,1","7,3","3,2","6,2","6,1","6,3","5,3","7,2"],"wm":["1,4","4,2","1,3","4,3","2,1","3,1","4,1","2,4","2,3","5,2","5,1","5,0","3,3","3,4"],"cb":0,"cw":3,"c":"white","sol":{"cells":[{"r":5,"c":2},{"r":4,"c":3},{"r":3,"c":3}],"dir":{"q":-1,"r":1}},"lab":"f5e4","d":2,"gap":1970,"src":"ACT vs kihece · standard · 2021-12-12","mv":54},{"bm":["2,6","4,3","7,3","5,3","4,7","1,3","2,4","1,4","2,5","3,6","6,6","6,5","4,4","5,6"],"wm":["5,1","3,1","1,1","7,2","6,2","7,1","3,4","4,5","2,3","2,2","2,1","5,4","6,4","6,3"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":6,"c":4},{"r":6,"c":3},{"r":6,"c":2}],"dir":{"q":1,"r":0}},"lab":"c3c4","d":2,"gap":1966,"src":"panpanpoum vs Talh · alliances · 2020-11-07","mv":10},{"bm":["4,5","3,4","5,3","3,6","3,5","0,3","4,2","1,3","5,4","2,4","4,4"],"wm":["4,6","7,3","6,3","5,2","4,1","6,2","7,1","3,2","4,3","6,5","7,5","2,3","2,2","3,3"],"cb":0,"cw":3,"c":"white","sol":{"cells":[{"r":4,"c":3},{"r":3,"c":3},{"r":2,"c":3}],"dir":{"q":1,"r":-1}},"lab":"e4f5","d":2,"gap":1962,"src":"Alex50.4 vs vincent · custom · 2021-01-12","mv":38},{"bm":["5,1","8,3","7,3","2,4","4,6","5,5","4,4","3,4","3,5","4,5","6,5","6,4","5,4"],"wm":["6,0","4,2","4,1","3,1","4,3","7,1","1,1","7,2","5,2","6,3","6,2","6,1","5,3"],"cb":1,"cw":1,"c":"white","sol":{"cells":[{"r":6,"c":3},{"r":5,"c":3},{"r":4,"c":3}],"dir":{"q":0,"r":1}},"lab":"e4d4","d":2,"gap":1956,"src":"Alex50.4 vs vincent · custom · 2021-01-04","mv":20},{"bm":["5,1","6,1","7,0","7,1","8,0","6,2","5,2","6,4","8,4","7,3","8,1","7,4","4,2","8,3"],"wm":["6,3","4,3","4,4","3,1","2,1","1,1","3,3","1,3","2,3","3,4","5,4","4,5","1,5","5,3"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":6,"c":3},{"r":5,"c":3},{"r":4,"c":3}],"dir":{"q":0,"r":1}},"lab":"e4d4","d":2,"gap":1956,"src":"SuBlaZe vs Tal · standard · 2022-04-21","mv":28},{"bm":["5,6","7,0","6,2","6,3","5,3","6,4","5,5","3,4","3,6","3,5","4,3","4,4","4,5","5,4"],"wm":["4,6","0,1","1,1","2,3","2,2","3,3","2,5","1,2","1,5","1,4","1,3","4,1","4,2","3,2"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":3,"c":5},{"r":4,"c":5},{"r":5,"c":4}],"dir":{"q":1,"r":-1}},"lab":"d5e6","d":2,"gap":1954,"src":"saabalone vs tuvok · standard · 2020-12-08","mv":37},{"bm":["6,1","4,1","3,3","3,4","4,5","6,4","8,0","8,4","7,3","5,2","5,3","5,4","6,3"],"wm":["1,4","1,0","2,1","8,1","6,2","7,2","2,4","1,3","1,2","3,2","0,1","4,3","5,1","4,4"],"cb":0,"cw":1,"c":"black","sol":{"cells":[{"r":4,"c":5},{"r":5,"c":4},{"r":6,"c":3}],"dir":{"q":-1,"r":1}},"lab":"e6d5","d":2,"gap":1952,"src":"Air vs ocj94 · fujiyama · 2021-12-11","mv":19},{"bm":["5,5","0,0","5,3","2,2","3,3","1,2","0,1","2,3","3,0","2,0","4,2","4,3","1,0","4,4"],"wm":["3,4","4,5","4,7","6,4","5,6","6,5","8,3","4,6","3,6","6,2","6,3","2,1","3,2","5,4"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":2,"c":1},{"r":3,"c":2}],"dir":{"q":0,"r":-1}},"lab":"f4g4","d":3,"gap":1944,"src":"Abadeus vs SuperTal · snakes_variant · 2020-09-30","mv":14},{"bm":["4,1","7,2","6,1","5,2","6,2","5,3","6,5","4,5","6,4","4,4","5,5","6,6","5,6","5,4"],"wm":["0,2","1,3","2,3","3,3","1,1","2,2","1,4","2,5","1,5","4,6","3,5","2,4","3,4"],"cb":1,"cw":0,"c":"white","sol":{"cells":[{"r":2,"c":4},{"r":3,"c":5},{"r":4,"c":6}],"dir":{"q":0,"r":1}},"lab":"g7f7","d":3,"gap":1944,"src":"LEX vs Alex50.4 · the_wall · 2020-11-26","mv":34},{"bm":["3,2","2,6","6,4","4,4","5,4","6,1","2,3","3,4","4,5","2,5","3,6","4,7","4,3","5,3"],"wm":["3,3","0,0","2,2","2,1","1,1","3,5","3,1","4,2","0,2","1,3","1,2","0,3","1,4","2,4"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":4,"c":7},{"r":3,"c":6},{"r":2,"c":5}],"dir":{"q":0,"r":-1}},"lab":"e8f8","d":3,"gap":1942,"src":"saabalone vs Milliwauwau · standard · 2020-11-08","mv":43},{"bm":["1,0","2,3","2,4","0,4","4,2","4,3","4,4","3,3"],"wm":["5,3","5,2","5,1","1,4","2,6","2,5","4,0","4,1","1,5"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":4,"c":2},{"r":4,"c":3},{"r":4,"c":4}],"dir":{"q":-1,"r":0}},"lab":"e5e4","d":3,"gap":1940,"src":"Alex50.4 vs vincent · custom · 2020-12-19","mv":11},{"bm":["3,1","4,3","3,3","5,1","4,1","6,2","5,3","4,4","4,2"],"wm":["6,0","8,1","5,2","7,2","6,1","7,4","6,4","5,4","5,6","7,1","5,5"],"cb":2,"cw":4,"c":"black","sol":{"cells":[{"r":5,"c":1},{"r":4,"c":2}],"dir":{"q":-1,"r":1}},"lab":"e3d2","d":3,"gap":1940,"src":"vincent vs Tal · custom · 2022-02-28","mv":9},{"bm":["2,1","1,2","2,3","3,4","6,1","4,3","4,4","7,2","6,2"],"wm":["3,2","8,2","2,2","3,3","5,5","5,3","7,4","6,3","4,2","6,4"],"cb":3,"cw":4,"c":"black","sol":{"cells":[{"r":7,"c":2},{"r":6,"c":2}],"dir":{"q":0,"r":1}},"lab":"c3b3","d":3,"gap":1932,"src":"vincent vs Tal · custom · 2022-02-28","mv":25},{"bm":["3,6","5,2","3,4","1,1","4,3","0,4","5,0","6,1","4,1","5,1","4,2","1,5","3,2"],"wm":["1,2","8,4","3,3","2,3","2,1","1,3","0,1","1,0","0,0","2,5","3,5","2,2"],"cb":2,"cw":1,"c":"white","sol":{"cells":[{"r":3,"c":5},{"r":2,"c":5}],"dir":{"q":1,"r":-1}},"lab":"f7g8","d":3,"gap":1932,"src":"Alex50.4 vs vincent · custom · 2021-01-06","mv":20},{"bm":["4,4","5,5","0,3","5,3","5,4","4,5","3,5","4,3","3,4"],"wm":["5,1","1,2","4,6","5,6","1,4","2,4","2,2","2,3","1,3"],"cb":1,"cw":1,"c":"white","sol":{"cells":[{"r":2,"c":3},{"r":1,"c":3}],"dir":{"q":1,"r":-1}},"lab":"g6h7","d":3,"gap":1928,"src":"Tal vs Jeff · custom · 2022-09-16","mv":64},{"bm":["3,2","3,5","4,5","2,5","6,2","3,3","1,3","0,4","2,3","1,4"],"wm":["2,2","7,2","4,4","5,4","6,4","6,3","0,1","2,4","0,3","3,4"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":2,"c":4},{"r":3,"c":4},{"r":4,"c":4}],"dir":{"q":1,"r":-1}},"lab":"e5f6","d":3,"gap":1920,"src":"Jeff vs Tal · custom · 2022-09-16","mv":34},{"bm":["7,5","7,3","5,6","7,2","5,2","7,4","5,5","6,5","8,1","6,1","6,2","5,3","4,3","7,1"],"wm":["0,4","1,5","1,4","3,3","6,3","3,4","2,4","4,4","4,5","1,3","2,3","1,0","1,1","5,4"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":6,"c":3},{"r":5,"c":4},{"r":4,"c":5}],"dir":{"q":-1,"r":1}},"lab":"e6d5","d":3,"gap":1920,"src":"cicikoko vs kihece · standard · 2020-12-08","mv":18},{"bm":["7,2","4,4","7,4","7,5","2,4","3,4","3,3","1,4","1,5","6,5","6,4","6,1","4,3","2,3"],"wm":["5,4","6,3","6,2","7,3","2,2","2,1","1,1","2,5","5,6","4,6","7,0","3,5","1,3","0,3"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":4,"c":3},{"r":3,"c":3},{"r":2,"c":3}],"dir":{"q":1,"r":-1}},"lab":"e4f5","d":3,"gap":1914,"src":"Tal vs Vind · custom · 2022-08-15","mv":17},{"bm":["5,6","6,2","4,3","6,4","6,3","5,1","3,2","3,1","4,2","4,5","3,5","5,2"],"wm":["5,4","7,1","5,0","4,4","5,3","0,1","4,6","5,5","1,1","1,2","1,3","2,3","3,3"],"cb":1,"cw":2,"c":"black","sol":{"cells":[{"r":5,"c":1},{"r":5,"c":2}],"dir":{"q":-1,"r":0}},"lab":"d3d2","d":3,"gap":1912,"src":"Guru_Ajna vs Air · fujiyama · 2021-08-04","mv":61},{"bm":["8,2","2,1","3,1","3,2","2,2"],"wm":["3,0","8,0"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":3,"c":1},{"r":3,"c":2}],"dir":{"q":-1,"r":0}},"lab":"f4f3","d":3,"gap":1910,"src":"Alex50.4 vs vincent · custom · 2020-12-15","mv":43},{"bm":["6,4","6,3","5,4","7,4","5,7","3,6","1,4","2,5","3,3","4,4","2,2","2,3","2,4","1,3"],"wm":["4,3","4,5","3,4","3,2","0,2","5,3","6,1","4,6","4,1","1,1","5,2","3,1","2,1","4,2"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":2,"c":4},{"r":1,"c":3}],"dir":{"q":0,"r":-1}},"lab":"g7h7","d":3,"gap":1908,"src":"Claudie vs Simon Galli · alliances · 2021-03-09","mv":21},{"bm":["8,4","1,3","0,1","5,4","8,0","8,2","8,1","4,5","5,5","6,5","5,3","6,2","1,4"],"wm":["0,2","0,3","2,2","8,3","1,5","0,4","3,3","7,2","7,3","2,3","2,4","4,4","3,4"],"cb":1,"cw":1,"c":"black","sol":{"cells":[{"r":1,"c":3},{"r":1,"c":4}],"dir":{"q":1,"r":0}},"lab":"h7h8","d":3,"gap":1908,"src":"LEX vs Alex50.4 · fujiyama · 2020-09-23","mv":9},{"bm":["2,4","7,5","2,2","2,3","4,4","5,4","5,2","4,2","5,6","5,3","6,3","6,1","5,5"],"wm":["1,3","3,5","3,4","3,1","6,4","6,5","3,3","4,3","3,2","2,1","5,1","4,1","7,4","7,3"],"cb":0,"cw":1,"c":"white","sol":{"cells":[{"r":7,"c":4},{"r":7,"c":3}],"dir":{"q":1,"r":0}},"lab":"b4b5","d":3,"gap":1906,"src":"Vind313 vs Kihece · custom · 2022-02-19","mv":54},{"bm":["8,2","5,5","5,6","7,3","5,3","4,4","3,3","2,3","1,4","3,6","1,3","2,5","7,4","2,4"],"wm":["3,4","5,1","4,1","1,1","3,1","2,1","6,3","7,2","7,1","1,2","2,2","6,4","5,4","6,2"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":7,"c":2},{"r":6,"c":2}],"dir":{"q":0,"r":1}},"lab":"c3b3","d":3,"gap":1904,"src":"Jeff vs Egnots13 · alliances · 2021-08-13","mv":12},{"bm":["6,4","1,4","6,2","5,4","5,3","6,1","8,1","7,5","1,2","2,1","2,2","2,3","1,5","0,4"],"wm":["6,5","7,0","8,0","1,3","7,3","7,2","7,1","1,0","3,4","1,1","0,0","2,5","2,4","6,3"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":7,"c":2},{"r":6,"c":3}],"dir":{"q":-1,"r":1}},"lab":"c4b3","d":3,"gap":1902,"src":"saabalone vs Vind313 · custom · 2022-03-05","mv":8},{"bm":["3,3","6,3","4,2","4,4","7,4","4,5","6,4","5,3","5,4","7,1","6,1","3,4"],"wm":["4,3","1,0","2,1","3,2","5,5","2,4","0,4","1,4","0,1","0,2","0,3","6,2","8,1","5,2"],"cb":0,"cw":2,"c":"black","sol":{"cells":[{"r":7,"c":1},{"r":6,"c":1}],"dir":{"q":0,"r":1}},"lab":"c2b2","d":3,"gap":1900,"src":"Talh vs Balthabar · fujiyama · 2020-12-04","mv":19},{"bm":["3,6","5,4","2,0","2,3","4,5","4,4","3,2","4,3","3,4","1,2","3,3"],"wm":["7,5","5,6","1,4","4,2","0,0","2,1","4,1","4,0","1,1","1,0","6,3","6,4","2,2"],"cb":1,"cw":3,"c":"white","sol":{"cells":[{"r":2,"c":1},{"r":2,"c":2}],"dir":{"q":-1,"r":0}},"lab":"g5g4","d":3,"gap":1898,"src":"Alex50.4 vs vincent · custom · 2021-02-04","mv":42},{"bm":["3,3","1,3","7,5","6,2","2,6","4,4","5,3","4,6","6,3","3,5","1,4","4,7","6,5","5,6"],"wm":["3,1","1,1","7,1","6,1","4,5","5,4","4,1","5,1","2,3","2,2","2,4","3,4","7,4","7,3"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":7,"c":4},{"r":7,"c":3}],"dir":{"q":1,"r":0}},"lab":"b4b5","d":3,"gap":1898,"src":"saabalone vs grizzz · alliances · 2022-09-27","mv":10},{"bm":["8,0","8,4","8,2","6,2","0,1","2,3","4,5","5,3","2,2","6,4","7,4","7,1","8,3","8,1"],"wm":["0,4","0,2","4,4","3,4","2,4","5,4","3,3","3,2","7,3","6,3","2,1","1,0"],"cb":2,"cw":0,"c":"white","sol":{"cells":[{"r":7,"c":3},{"r":6,"c":3}],"dir":{"q":0,"r":1}},"lab":"c4b4","d":3,"gap":1898,"src":"ocj94 vs Jesuis · fujiyama · 2021-10-08","mv":8},{"bm":["5,5","7,4","6,5","5,7","3,5","4,5","5,6","2,5","2,4","3,7","3,6"],"wm":["3,4","3,2","4,6","3,3","6,4","3,1","4,4","2,3","2,6","1,2"],"cb":1,"cw":0,"c":"black","sol":{"cells":[{"r":2,"c":4},{"r":2,"c":5}],"dir":{"q":1,"r":0}},"lab":"g7g8","d":3,"gap":1896,"src":"Gramgroum vs Claudie · custom · 2021-05-15","mv":7},{"bm":["7,0","6,2","4,7","7,2","6,5","6,6","3,4","5,6","7,1","6,1","2,3","3,3","5,5"],"wm":["2,2","0,0","1,1","1,4","1,2","0,1","2,4","4,5","5,7","5,3","4,6","5,4","1,3","4,4"],"cb":0,"cw":1,"c":"black","sol":{"cells":[{"r":5,"c":6},{"r":5,"c":5}],"dir":{"q":1,"r":0}},"lab":"d6d7","d":3,"gap":1896,"src":"Vind313 vs kihece · fujiyama · 2022-02-16","mv":19},{"bm":["7,3","2,1","3,5","1,0","1,4","2,4","2,3","3,4","4,2","4,3","8,3","5,6","5,5","4,4"],"wm":["7,1","1,1","2,2","3,3","1,3","4,6","6,4","4,5","5,4","6,3","7,4","6,5","4,7","3,7"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":7,"c":4},{"r":6,"c":5}],"dir":{"q":-1,"r":1}},"lab":"c6b5","d":3,"gap":1894,"src":"vincent vs icannotchat · custom · 2022-03-17","mv":22},{"bm":["8,2","1,1","7,5","4,4","6,2","7,1","6,1","5,3","7,4","6,4","5,4","8,0","1,2"],"wm":["2,4","2,3","2,2","3,4","0,1","7,3","1,5","0,4","1,4","7,2","6,3","1,0","0,3"],"cb":1,"cw":1,"c":"black","sol":{"cells":[{"r":1,"c":1},{"r":1,"c":2}],"dir":{"q":-1,"r":0}},"lab":"h6h5","d":3,"gap":1892,"src":"Kalvinh vs ocj94 · fujiyama · 2021-10-31","mv":11},{"bm":["1,3","2,2","1,1"],"wm":["0,4","4,2","0,0","2,1"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":2,"c":2},{"r":1,"c":1}],"dir":{"q":0,"r":-1}},"lab":"g5h5","d":3,"gap":1888,"src":"Libor vs vincent · custom · 2022-04-25","mv":7},{"bm":["8,1","5,0","5,1","4,2","5,2","1,0","7,1","6,2","4,0","4,1"],"wm":["2,4","1,4","6,1","5,5","3,2","5,3","4,4","4,3","4,5","8,0","5,4"],"cb":3,"cw":4,"c":"black","sol":{"cells":[{"r":7,"c":1},{"r":6,"c":2}],"dir":{"q":-1,"r":1}},"lab":"c3b2","d":3,"gap":1884,"src":"LEX vs Alex50.4 · custom · 2021-05-14","mv":9},{"bm":["5,7","4,5","4,3","6,1","7,1","4,4","6,4","5,4","6,2","5,2","7,2","4,1","6,3"],"wm":["5,3","2,5","4,7","0,2","3,4","3,3","5,5","3,0","4,2","3,2","3,1","2,1","6,6","5,6"],"cb":0,"cw":1,"c":"white","sol":{"cells":[{"r":5,"c":5},{"r":5,"c":6}],"dir":{"q":1,"r":0}},"lab":"d6d7","d":3,"gap":1880,"src":"Cuc vs ocj94 · the_wall · 2020-08-31","mv":16},{"bm":["0,0","4,1","8,2","8,4","6,1","6,2","5,3","7,4","6,5","3,2","2,2","1,3","2,3","1,1"],"wm":["3,0","1,2","0,2","5,2","5,1","4,2","3,4","1,4","0,3","2,4"],"cb":4,"cw":0,"c":"black","sol":{"cells":[{"r":1,"c":3},{"r":2,"c":3}],"dir":{"q":1,"r":-1}},"lab":"g6h7","d":3,"gap":1876,"src":"Kihece vs jarbak · standard · 2022-02-11","mv":43},{"bm":["4,2","0,4","5,2","4,3","5,3","4,7","6,5","2,3","1,2","5,6"],"wm":["5,1","2,2","2,1","0,2","1,3","2,4","4,5","3,6","3,5","1,4"],"cb":4,"cw":4,"c":"white","sol":{"cells":[{"r":2,"c":4},{"r":1,"c":4}],"dir":{"q":1,"r":-1}},"lab":"g7h8","d":3,"gap":1874,"src":"saabalone vs Air · custom · 2021-11-17","mv":22},{"bm":["5,5","4,3","7,3","5,6","8,2","3,5","7,1","1,4","2,4","3,4","6,3","5,4","6,6","4,5"],"wm":["4,6","2,5","4,4","6,2","5,3","5,2","4,2","5,1","1,0","3,3","6,5","6,4","3,2","3,1"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":6,"c":4},{"r":6,"c":5}],"dir":{"q":1,"r":0}},"lab":"c5c6","d":3,"gap":1872,"src":"Simon Galli vs Tabasco · alliances · 2021-04-16","mv":28},{"bm":["5,7","7,3","3,1","5,4","5,1","5,5","6,5","5,6","5,2","3,3","4,3","5,0","6,0","4,2"],"wm":["2,5","1,2","3,5","4,5","3,4","4,4","5,3","2,3","3,0","4,1","2,2","2,1","4,0","3,2"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":5,"c":0},{"r":6,"c":0}],"dir":{"q":0,"r":-1}},"lab":"c1d1","d":3,"gap":1872,"src":"stoffer vs ocj94 · the_wall · 2021-08-13","mv":15},{"bm":["3,7","4,8","1,0","1,2","2,2","7,0","7,1","3,2","5,3","4,3","5,6","4,6","6,2","6,1"],"wm":["8,3","7,5","5,4","6,4","4,4","2,4","5,1","4,2","1,4","2,5","3,5","3,0","4,0","3,6"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":3,"c":5},{"r":3,"c":6}],"dir":{"q":1,"r":0}},"lab":"f7f8","d":3,"gap":1870,"src":"Babouh vs Gramgroum · custom · 2021-05-14","mv":16},{"bm":["3,2","5,5","6,2","5,2","4,3","5,4","4,5","1,0","1,1","3,3","1,2","2,6","2,2"],"wm":["6,5","4,4","2,1","7,3","5,7","3,4","2,5","3,5","3,6","4,6","7,2","8,2"],"cb":2,"cw":1,"c":"white","sol":{"cells":[{"r":4,"c":6},{"r":3,"c":6}],"dir":{"q":1,"r":-1}},"lab":"e7f8","d":3,"gap":1868,"src":"vincent vs Alex50.4 · custom · 2021-02-05","mv":30},{"bm":["2,4","6,4","1,2","0,2","3,2","1,4","4,2","5,2","4,5","3,6","4,6","3,4"],"wm":["4,3","3,5","1,3","5,4","6,2","2,3","5,6","4,7","6,3","5,3","2,2","3,3","2,6","4,4"],"cb":0,"cw":2,"c":"black","sol":{"cells":[{"r":4,"c":6},{"r":3,"c":6}],"dir":{"q":1,"r":-1}},"lab":"e7f8","d":3,"gap":1866,"src":"saabalone vs pouledentee · custom · 2022-05-02","mv":21},{"bm":["8,1","7,0","2,0","7,5","7,4","6,4","4,5","5,4","6,2","6,3","4,4","5,3","1,3","2,3"],"wm":["7,2","3,1","0,2","0,1","0,0","1,1","2,2","3,3","3,4","2,4","1,4","2,5","4,2","4,3"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":3,"c":1},{"r":4,"c":2}],"dir":{"q":0,"r":-1}},"lab":"e3f3","d":3,"gap":1864,"src":"LEX vs Claudie · fujiyama · 2020-11-20","mv":18},{"bm":["8,2","7,5","5,0","5,1","5,2","4,4","4,3","5,3","6,5","6,4","6,3","5,4","5,7","4,5"],"wm":["3,7","0,2","3,4","2,2","3,3","2,1","2,5","3,2","3,0","3,1","3,5","5,6","5,5","4,6"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":5,"c":5},{"r":5,"c":6}],"dir":{"q":1,"r":0}},"lab":"d6d7","d":3,"gap":1864,"src":"Simon Galli vs Tabasco · the_wall · 2021-04-12","mv":8},{"bm":["4,5","5,4","6,2","4,6","2,3","3,3","2,2","1,1","3,1","1,5","3,2","2,1"],"wm":["5,5","7,4","5,2","5,3","4,4","3,4","3,6","2,4","2,5","3,5","4,3"],"cb":3,"cw":2,"c":"white","sol":{"cells":[{"r":3,"c":5},{"r":2,"c":5}],"dir":{"q":1,"r":-1}},"lab":"f7g8","d":3,"gap":1862,"src":"Seohee Park vs vincent · custom · 2022-03-29","mv":8},{"bm":["6,4","4,1","4,5","4,7","1,3","2,4","2,1","2,0","5,3","5,2","6,2","3,6"],"wm":["4,3","3,4","3,5","4,6","5,6","5,7","3,2","4,4","3,3","1,2","4,2","2,3"],"cb":2,"cw":2,"c":"black","sol":{"cells":[{"r":4,"c":7},{"r":3,"c":6}],"dir":{"q":0,"r":1}},"lab":"f8e8","d":3,"gap":1860,"src":"Air vs vincent · custom · 2022-03-13","mv":29},{"bm":["3,3","6,2","2,6","4,2","5,2","4,4","6,4","2,4","2,3","2,5","4,3","4,7","8,1","4,6"],"wm":["4,5","5,5","2,2","1,1","4,1","3,1","2,1","6,0","5,3","6,3","7,3","7,1","6,1","5,4"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":7,"c":1},{"r":6,"c":1}],"dir":{"q":0,"r":1}},"lab":"c2b2","d":3,"gap":1860,"src":"saabalone vs ocj94 · alliances · 2020-09-22","mv":30},{"bm":["3,2","5,5","6,5","0,3","3,5","3,4","2,2","3,3","6,1","5,4","6,2","4,4","5,2"],"wm":["5,3","6,3","2,1","3,1","4,2","1,3","2,4","0,1","0,0","4,5","4,6","4,7","2,3"],"cb":1,"cw":1,"c":"white","sol":{"cells":[{"r":1,"c":3},{"r":2,"c":3}],"dir":{"q":1,"r":-1}},"lab":"g6h7","d":3,"gap":1850,"src":"Alex50.4 vs vincent · custom · 2021-02-06","mv":8},{"bm":["6,4","6,0","0,4","4,0","2,1","0,0","2,5","2,3","3,6","7,1","6,2","0,2","4,6","4,5"],"wm":["2,0","4,1","6,3","2,2","0,1","2,4","0,3","4,8","6,5","2,6","5,5","5,4","6,1","7,0"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":3,"c":6},{"r":4,"c":6}],"dir":{"q":1,"r":-1}},"lab":"e7f8","d":3,"gap":1832,"src":"Ahmed mughis vs Gramgroum · custom · 2021-05-01","mv":11},{"bm":["3,5","3,3","4,7","2,5","6,4","2,6","3,6","1,3","5,4","5,5","1,2","2,4","5,3"],"wm":["2,0","8,3","4,5","2,3","3,4","4,3","4,4","7,2","6,3","5,7","5,6"],"cb":2,"cw":1,"c":"white","sol":{"cells":[{"r":5,"c":7}],"dir":{"q":-1,"r":1}},"lab":"d8c7","thr":"e8d8","d":1,"def":1,"src":"Tal vs vincent · custom · 2022-03-13","mv":50,"alt":["5,7>1,-1","5,6|5,7>-1,1"]},{"bm":["5,1","2,1","3,3","3,2","4,3","5,2","5,3","4,4","3,4","1,5","2,6","3,6"],"wm":["5,4","4,5","5,6","4,2","4,1","2,5","4,6","5,5","6,4","2,3","1,0","6,3","2,4"],"cb":1,"cw":2,"c":"black","sol":{"cells":[{"r":2,"c":6}],"dir":{"q":0,"r":1}},"lab":"g9f9","thr":"g8g9","d":1,"def":1,"src":"saabalone vs Boulet · german_daisy · 2021-09-22","mv":29,"alt":["1,5|2,6>0,-1","2,6|3,6>0,1"]},{"bm":["6,1","1,4","0,0","1,1","1,3","2,4","3,5","3,0","2,2"],"wm":["4,7","8,2","5,4","5,3","5,5","3,4","4,5","7,0","7,1","3,2","4,1","4,2","3,1","0,2"],"cb":0,"cw":5,"c":"white","sol":{"cells":[{"r":0,"c":2}],"dir":{"q":-1,"r":1}},"lab":"i7h6","thr":"h7i7","d":1,"def":1,"src":"Abalw vs Kihece · standard · 2020-11-07","mv":124,"alt":["0,2>1,0","0,2>-1,0"]},{"bm":["0,4","6,1","6,3","8,0","7,1","7,0","7,3","5,3","4,0","7,2"],"wm":["5,6","4,6","4,7","3,4","2,4","2,5","5,1","4,1","6,2","5,2","4,2","4,3","8,3"],"cb":1,"cw":4,"c":"white","sol":{"cells":[{"r":8,"c":3}],"dir":{"q":1,"r":-1}},"lab":"a4b5","thr":"b4a4","d":1,"def":1,"src":"vincent vs Seohee Park · custom · 2022-06-23","mv":8,"alt":["8,3>1,0","8,3>-1,0"]},{"bm":["6,0","5,1","5,3","5,2","3,1","3,2","4,4","3,3","2,2","2,3","2,4","4,2","3,5","2,5"],"wm":["2,1","4,3","8,3","3,4","2,0","6,4","1,2","1,3","1,4","5,4","5,6","5,5","4,5"],"cb":1,"cw":0,"c":"white","sol":{"cells":[{"r":2,"c":1},{"r":2,"c":0}],"dir":{"q":1,"r":-1},"type":"broadside"},"lab":"g3g4h4","d":2,"gap":0,"src":"ApocalypticA vs Warlordess · MIGS · 2016-10-25","mv":16,"def":1},{"bm":["2,4","3,5","1,5","2,5","1,4","4,6","3,6","6,2","6,1","4,2","4,3","7,0","6,0","5,0"],"wm":["7,5","2,1","1,0","1,1","3,1","6,3","6,5","6,4","2,2","3,2","5,1","5,2","5,3","4,1"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":7,"c":0},{"r":6,"c":0},{"r":5,"c":0}],"dir":{"q":0,"r":1}},"lab":"d1c1","thr":"e2d1","d":2,"def":1,"src":"Kihece vs Gio · german_daisy · 2020-12-03","mv":13,"alt":["5,0>0,-1"]},{"bm":["1,5","0,3","7,1","6,1","6,2","1,3","6,4","5,5","5,3","5,4","4,6","3,6","3,5","3,4"],"wm":["0,1","2,3","1,2","2,2","8,3","7,3","7,4","3,1","2,1","4,7","2,4","4,5","4,4","3,7"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":3,"c":7}],"dir":{"q":0,"r":1},"type":"move"},"lab":"f9e9","d":2,"gap":0,"src":"Aglaé vs aze · MIGS · 2016-10-25","mv":40,"def":1},{"bm":["6,2","7,2","1,4","2,5","1,5","3,6","5,6","4,6","3,5","4,2","4,3","6,0","5,0"],"wm":["3,1","2,0","1,0","1,1","2,1","3,2","7,5","6,3","6,4","6,5","5,1","5,2","5,3","4,1"],"cb":0,"cw":1,"c":"black","sol":{"cells":[{"r":6,"c":0},{"r":5,"c":0}],"dir":{"q":0,"r":1}},"lab":"d1c1","thr":"e2d1","d":2,"def":1,"src":"Pouleadents vs Ahmed mughis · german_daisy · 2022-11-05","mv":15,"alt":["5,0>0,-1"]},{"bm":["2,2","5,5","3,1","8,1","7,0","6,1","5,2","7,2","7,3","3,6","3,4","3,5","1,0"],"wm":["2,1","5,3","4,4","6,3","5,4","4,3","2,3","6,2","3,2","3,3","1,1","1,2","1,3"],"cb":1,"cw":1,"c":"black","sol":{"cells":[{"r":1,"c":0}],"dir":{"q":-1,"r":1}},"lab":"h4g3","thr":"g4h4","d":2,"def":1,"src":"alnan31 vs Claudie · standard · 2020-09-16","mv":51,"alt":["1,0>1,-1"]},{"bm":["8,1","0,4","1,3","1,5","4,3","6,1","4,4","5,3","3,3","3,4","3,5","4,2","1,4","2,6"],"wm":["7,5","1,0","7,4","1,1","1,2","3,2","4,7","4,6","4,5","5,4","6,4","2,5","2,4","2,3"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":2,"c":6}],"dir":{"q":0,"r":1},"type":"move"},"lab":"g9f9","d":3,"gap":0,"src":"Aglaé vs aze · MIGS · 2016-04-18","mv":19,"def":1},{"bm":["3,3","5,4","1,5","3,5","1,4","7,0","6,1","7,1","6,2","4,3","5,3","2,1","2,2","2,3"],"wm":["8,3","4,5","1,2","7,5","4,4","3,4","6,5","6,4","5,5","3,0","3,1","3,2","1,1","2,0"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":3,"c":0},{"r":2,"c":0}],"dir":{"q":-1,"r":1},"type":"move"},"lab":"g3f2","d":3,"gap":0,"src":"ApocalypticA vs pervers pépère 2 · MIGS · 2016-09-13","mv":28,"def":1},{"bm":["7,0","6,1","0,3","6,3","7,2","4,5","4,7","4,4","3,7","4,6","3,6","5,6","4,3","5,3"],"wm":["8,3","8,4","7,3","2,3","3,3","3,4","2,2","3,2","2,1","6,4","6,6","6,5","5,5","5,4"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":7,"c":3},{"r":6,"c":4},{"r":5,"c":5}],"dir":{"q":1,"r":-1},"type":"push"},"lab":"b4c5","d":3,"gap":0,"src":"Aglaé vs saabalone · MIGS · 2016-04-18","mv":52,"def":1},{"bm":["7,2","6,1","1,1","2,2","3,5","4,5","5,6","6,5","5,5","6,4","4,4","5,4","8,0"],"wm":["4,0","0,4","1,5","8,2","7,1","8,1","7,3","6,2","6,3","8,3","5,7","5,3","4,6","7,4"],"cb":0,"cw":1,"c":"black","sol":{"cells":[{"r":8,"c":0}],"dir":{"q":0,"r":-1}},"lab":"a1b1","thr":"a2a1","d":3,"def":1,"src":"Gramgroum vs Patate · custom · 2021-05-14","mv":47},{"bm":["7,1","6,2","2,6","5,2","6,1","2,5","5,1","2,3","2,4","3,1","3,2","3,3","4,0","4,1"],"wm":["5,6","7,4","6,4","2,2","1,1","2,1","5,4","4,2","4,4","4,3","1,0","2,0","3,0"],"cb":1,"cw":0,"c":"white","sol":{"cells":[{"r":1,"c":0},{"r":2,"c":0},{"r":3,"c":0}],"dir":{"q":1,"r":-1}},"lab":"f2g3","thr":"e2f2","d":3,"def":1,"src":"vincent vs kihece · german_daisy · 2020-09-14","mv":14},{"bm":["7,0","6,1","1,5","5,3","6,2","7,1","6,3","7,2","3,4","1,4","2,3","1,3","4,5","4,6"],"wm":["6,5","0,0","0,1","1,0","1,1","1,2","6,6","7,5","4,4","5,4","3,2","3,3","5,5","6,4"],"cb":0,"cw":0,"c":"white","sol":{"cells":[{"r":1,"c":0},{"r":1,"c":1},{"r":1,"c":2}],"dir":{"q":-1,"r":1},"type":"broadside"},"lab":"h4h6g3","d":3,"gap":0,"src":"ApocalypticA vs KALVINH · MIGS · 2016-06-04","mv":38,"def":1},{"bm":["8,2","4,2","4,3","2,3","3,2","2,2","7,4","7,3","7,1","5,4","7,2","6,4","1,3","2,4"],"wm":["0,0","1,1","5,2","3,3","5,3","4,4","6,3","6,2","6,1","5,1","3,4","4,5","5,5","1,2"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":4,"c":2},{"r":3,"c":2},{"r":2,"c":2}],"dir":{"q":1,"r":-1}},"multi":true,"seq":[{"cells":[{"r":4,"c":2},{"r":3,"c":2},{"r":2,"c":2}],"dir":{"q":1,"r":-1}},{"cells":[{"r":0,"c":0}],"dir":{"q":1,"r":0}},{"cells":[{"r":1,"c":2},{"r":2,"c":2},{"r":3,"c":2}],"dir":{"q":1,"r":-1}}],"lab":"e3f4","lab2":"f4g5","d":2,"src":"abbelgriebsch vs budgie · MIGS · 2016-09-19","mv":44},{"bm":["0,3","1,3","1,5","6,2","7,1","6,3","6,4","6,1","3,2","3,3","3,4","5,5","5,4","5,3"],"wm":["8,3","7,3","0,1","1,2","7,4","2,3","2,2","2,1","3,1","4,3","4,4","4,5","4,7","4,6"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":6,"c":4},{"r":5,"c":5}],"dir":{"q":-1,"r":1}},"multi":true,"seq":[{"cells":[{"r":6,"c":4},{"r":5,"c":5}],"dir":{"q":-1,"r":1}},{"cells":[{"r":0,"c":1}],"dir":{"q":1,"r":0}},{"cells":[{"r":5,"c":3},{"r":6,"c":3},{"r":7,"c":3}],"dir":{"q":0,"r":1}}],"lab":"d6c5","lab2":"d4c4","d":2,"src":"Aglaé vs aze · MIGS · 2016-10-25","mv":20},{"bm":["1,4","1,0","1,1","5,3","6,3","7,2","3,6","4,2","3,2","2,5","2,4","2,3","3,3"],"wm":["7,5","4,7","4,5","4,4","5,4","6,4","6,2","5,2","5,5","2,2","1,3","4,1","3,1"],"cb":1,"cw":1,"c":"black","sol":{"cells":[{"r":3,"c":3},{"r":2,"c":3}],"dir":{"q":1,"r":-1}},"multi":true,"seq":[{"cells":[{"r":3,"c":3},{"r":2,"c":3}],"dir":{"q":1,"r":-1}},{"cells":[{"r":7,"c":5}],"dir":{"q":-1,"r":0}},{"cells":[{"r":1,"c":4},{"r":2,"c":5},{"r":3,"c":6}],"dir":{"q":0,"r":-1}}],"lab":"f5g6","lab2":"f8g8","d":2,"src":"Aglaé vs aze · MIGS · 2016-04-18","mv":48},{"bm":["7,0","0,3","1,3","1,5","5,4","1,4","5,5","3,3","3,5","6,0","6,1","6,2","5,3","4,4"],"wm":["7,3","7,5","1,0","1,1","4,5","2,3","2,4","4,3","3,2","6,3","6,4","7,1","6,5","7,4"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":6,"c":2},{"r":5,"c":3},{"r":4,"c":4}],"dir":{"q":-1,"r":1}},"multi":true,"seq":[{"cells":[{"r":6,"c":2},{"r":5,"c":3},{"r":4,"c":4}],"dir":{"q":-1,"r":1}},{"cells":[{"r":4,"c":5}],"dir":{"q":1,"r":0}},{"cells":[{"r":7,"c":1},{"r":6,"c":2},{"r":5,"c":3}],"dir":{"q":-1,"r":1}}],"lab":"e5d4","lab2":"d4c3","d":2,"src":"Aglaé vs MLA (IA) - max · MIGS · 2016-04-10","mv":20},{"bm":["1,5","3,4","3,5","5,4","3,6","2,5","5,3","7,4","2,3","6,5","6,4","6,3","6,2","4,2"],"wm":["2,4","3,2","2,2","3,1","4,4","4,5","5,2","4,3","3,3","5,5","8,2","7,2","5,6","2,1"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":5,"c":4},{"r":6,"c":3}],"dir":{"q":-1,"r":1}},"multi":true,"seq":[{"cells":[{"r":5,"c":4},{"r":6,"c":3}],"dir":{"q":-1,"r":1}},{"cells":[{"r":2,"c":4}],"dir":{"q":0,"r":-1}},{"cells":[{"r":6,"c":2},{"r":7,"c":2}],"dir":{"q":0,"r":1}}],"lab":"d5c4","lab2":"c3b3","d":2,"src":"Aglaé vs KALVINH · MIGS · 2016-07-08","mv":40},{"bm":["4,5","1,5","6,3","2,3","4,6","5,1","4,4","2,4","3,6","3,5","3,4","4,2"],"wm":["7,5","6,5","2,5","6,6","5,3","5,5","7,4","6,4","5,4","7,1","5,2","6,2"],"cb":2,"cw":2,"c":"black","sol":{"cells":[{"r":2,"c":3},{"r":2,"c":4}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":2,"c":3},{"r":2,"c":4}],"dir":{"q":1,"r":0}},{"cells":[{"r":7,"c":5}],"dir":{"q":-1,"r":1}},{"cells":[{"r":3,"c":6},{"r":4,"c":6}],"dir":{"q":1,"r":-1}}],"lab":"g6g7","lab2":"e7f8","d":2,"src":"Aglaé vs saabalone · MIGS · 2016-04-18","mv":104},{"bm":["3,3","4,4","3,4","4,2","2,3","2,4","1,5","1,4","2,5","4,3","3,2","2,2","1,2"],"wm":["1,3","7,4","4,6","5,5","4,7","6,5","6,4","6,3","5,4","4,5","3,1"],"cb":3,"cw":1,"c":"black","sol":{"cells":[{"r":2,"c":3},{"r":3,"c":3},{"r":4,"c":3}],"dir":{"q":1,"r":-1}},"multi":true,"seq":[{"cells":[{"r":2,"c":3},{"r":3,"c":3},{"r":4,"c":3}],"dir":{"q":1,"r":-1}},{"cells":[{"r":3,"c":1}],"dir":{"q":-1,"r":0}},{"cells":[{"r":1,"c":3},{"r":2,"c":3},{"r":3,"c":3}],"dir":{"q":1,"r":-1}}],"lab":"e4f5","lab2":"f5g6","d":2,"src":"amir-ajmi vs phildemon · MIGS · 2016-07-07","mv":84},{"bm":["6,2","3,1","4,2","4,4","3,3","5,2","1,1","2,2","3,2","4,3","5,3"],"wm":["1,4","3,4","4,7","2,5","2,4","2,6","3,6","4,6","3,5","4,5","2,1","6,4"],"cb":2,"cw":3,"c":"black","sol":{"cells":[{"r":3,"c":2},{"r":4,"c":3},{"r":5,"c":3}],"dir":{"q":0,"r":-1}},"multi":true,"seq":[{"cells":[{"r":3,"c":2},{"r":4,"c":3},{"r":5,"c":3}],"dir":{"q":0,"r":-1}},{"cells":[{"r":6,"c":4}],"dir":{"q":1,"r":0}},{"cells":[{"r":2,"c":1},{"r":3,"c":2},{"r":4,"c":3}],"dir":{"q":0,"r":-1}}],"lab":"d4e4","lab2":"e4f4","d":2,"src":"ApocalypticA vs KALVINH · MIGS · 2016-06-04","mv":108},{"bm":["3,3","3,6","7,1","4,2","1,4","3,5","5,2","5,4","5,0","6,2","6,1","3,2","4,3","1,1"],"wm":["8,4","4,4","2,4","4,6","4,5","3,4","5,1","5,5","6,4","6,3","1,0","2,1","3,1"],"cb":1,"cw":0,"c":"black","sol":{"cells":[{"r":4,"c":2},{"r":3,"c":2}],"dir":{"q":-1,"r":1}},"multi":true,"seq":[{"cells":[{"r":4,"c":2},{"r":3,"c":2}],"dir":{"q":-1,"r":1}},{"cells":[{"r":8,"c":4}],"dir":{"q":-1,"r":0}},{"cells":[{"r":6,"c":1},{"r":6,"c":2}],"dir":{"q":-1,"r":0}}],"lab":"f4e3","lab2":"c3c2","d":2,"src":"ApocalypticA vs KALVINH · MIGS · 2016-06-02","mv":40},{"bm":["7,0","6,1","1,5","5,3","7,1","6,3","5,2","6,2","1,4","3,2","3,3","2,2","2,3","2,4"],"wm":["8,3","1,0","4,5","5,5","6,5","4,4","5,4","6,4","1,1","4,3","1,2","2,1","4,2","3,1"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":2,"c":2},{"r":2,"c":3},{"r":2,"c":4}],"dir":{"q":-1,"r":0}},"multi":true,"seq":[{"cells":[{"r":2,"c":2},{"r":2,"c":3},{"r":2,"c":4}],"dir":{"q":-1,"r":0}},{"cells":[{"r":8,"c":3}],"dir":{"q":1,"r":0}},{"cells":[{"r":2,"c":1},{"r":2,"c":2},{"r":2,"c":3}],"dir":{"q":-1,"r":0}}],"lab":"g7g6","lab2":"g6g5","d":2,"src":"ApocalypticA vs Warlordess · MIGS · 2016-10-25","mv":16},{"bm":["7,0","0,3","1,3","5,3","7,1","6,3","7,2","3,4","2,4","1,4","5,1","5,2","4,5","3,5"],"wm":["8,3","7,3","7,5","0,0","0,1","4,4","5,4","3,2","5,6","5,5","2,1","2,2","4,3","3,3"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":7,"c":0},{"r":7,"c":1},{"r":7,"c":2}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":7,"c":0},{"r":7,"c":1},{"r":7,"c":2}],"dir":{"q":1,"r":0}},{"cells":[{"r":0,"c":1}],"dir":{"q":1,"r":0}},{"cells":[{"r":1,"c":3},{"r":2,"c":4},{"r":3,"c":5}],"dir":{"q":0,"r":-1}}],"lab":"b1b2","lab2":"f7g7","d":2,"src":"ApocalypticA vs kelk1 · MIGS · 2016-10-31","mv":12},{"bm":["6,3","1,2","5,3","2,3","2,5","4,5","5,4","4,4","3,3","7,3","7,2","6,2","3,6","4,6"],"wm":["3,4","1,4","3,5","2,4","4,3","2,1","4,2","3,2","7,4","4,1","3,7","4,7","5,6","1,5"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":4,"c":4},{"r":4,"c":5},{"r":4,"c":6}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":4,"c":4},{"r":4,"c":5},{"r":4,"c":6}],"dir":{"q":1,"r":0}},{"cells":[{"r":5,"c":6}],"dir":{"q":1,"r":0}},{"cells":[{"r":2,"c":5},{"r":3,"c":6},{"r":4,"c":7}],"dir":{"q":0,"r":1}}],"lab":"e5e6","lab2":"g8f8","d":2,"src":"ApocalypticA vs pervers pépère 2 · MIGS · 2016-09-13","mv":60},{"bm":["5,4","2,3","4,4","3,3","3,4","4,3","3,2","1,2","3,1","4,2","7,2","6,3","2,2","2,1"],"wm":["4,5","4,6","5,5","5,7","3,5","2,5","4,7","5,6","6,5","7,4","1,1","6,2"],"cb":2,"cw":0,"c":"black","sol":{"cells":[{"r":4,"c":4},{"r":3,"c":3},{"r":2,"c":2}],"dir":{"q":0,"r":-1}},"multi":true,"seq":[{"cells":[{"r":4,"c":4},{"r":3,"c":3},{"r":2,"c":2}],"dir":{"q":0,"r":-1}},{"cells":[{"r":6,"c":2}],"dir":{"q":-1,"r":0}},{"cells":[{"r":1,"c":1},{"r":2,"c":2},{"r":3,"c":3}],"dir":{"q":0,"r":-1}}],"lab":"e5f5","lab2":"f5g5","d":2,"src":"ApocalypticA vs aze · MIGS · 2016-07-31","mv":68},{"bm":["7,0","1,5","7,2","4,5","4,4","6,4","6,3","6,2","4,6","5,2","2,5","1,4","6,5","5,6"],"wm":["8,3","7,5","0,1","1,0","1,1","2,2","5,3","5,4","5,5","3,6","3,5","1,3","2,4","4,7"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":6,"c":4},{"r":6,"c":5}],"dir":{"q":-1,"r":1}},"multi":true,"seq":[{"cells":[{"r":6,"c":4},{"r":6,"c":5}],"dir":{"q":-1,"r":1}},{"cells":[{"r":8,"c":3}],"dir":{"q":1,"r":0}},{"cells":[{"r":7,"c":2},{"r":7,"c":3},{"r":7,"c":4}],"dir":{"q":1,"r":0}}],"lab":"c5c6b4","lab2":"b3b4","d":2,"src":"ApocalypticA vs aze · MIGS · 2016-05-26","mv":24},{"bm":["0,3","5,4","3,6","2,3","3,4","4,4","6,5","6,4","6,3","2,4","3,5","4,6","7,2","7,1"],"wm":["1,1","2,2","3,1","3,3","4,5","5,5","7,5","7,3","1,3","5,3","4,3","3,2","7,4"],"cb":1,"cw":0,"c":"black","sol":{"cells":[{"r":4,"c":4},{"r":5,"c":4},{"r":6,"c":4}],"dir":{"q":0,"r":1}},"multi":true,"seq":[{"cells":[{"r":4,"c":4},{"r":5,"c":4},{"r":6,"c":4}],"dir":{"q":0,"r":1}},{"cells":[{"r":4,"c":5}],"dir":{"q":-1,"r":0}},{"cells":[{"r":7,"c":4},{"r":6,"c":4},{"r":5,"c":4}],"dir":{"q":0,"r":1}}],"lab":"e5d5","lab2":"d5c5","d":2,"src":"ApocalypticA vs aze · MIGS · 2016-05-26","mv":28},{"bm":["0,4","6,4","6,6","6,3","4,6","4,7","3,5","4,5","5,5","6,5","7,1","6,2"],"wm":["5,4","5,7","2,5","7,2","1,3","5,6","3,6","7,4","2,3","5,3","4,4","3,4"],"cb":2,"cw":2,"c":"black","sol":{"cells":[{"r":6,"c":4},{"r":5,"c":5},{"r":4,"c":6}],"dir":{"q":1,"r":-1}},"multi":true,"seq":[{"cells":[{"r":6,"c":4},{"r":5,"c":5},{"r":4,"c":6}],"dir":{"q":1,"r":-1}},{"cells":[{"r":7,"c":2}],"dir":{"q":1,"r":0}},{"cells":[{"r":3,"c":6},{"r":4,"c":6},{"r":5,"c":5}],"dir":{"q":1,"r":-1}}],"lab":"c5d6","lab2":"d6e7","d":2,"src":"ApocalypticA vs MLA (IA) - max · MIGS · 2016-08-22","mv":60},{"bm":["7,0","6,1","5,3","6,2","7,1","6,3","7,2","1,4","2,5","2,4","4,4","4,6","4,7","5,5"],"wm":["8,3","8,4","7,3","7,4","7,5","6,4","5,4","2,2","2,1","4,3","3,5","3,3","4,5","3,4"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":4,"c":6},{"r":5,"c":5}],"dir":{"q":0,"r":1}},"multi":true,"seq":[{"cells":[{"r":4,"c":6},{"r":5,"c":5}],"dir":{"q":0,"r":1}},{"cells":[{"r":5,"c":4}],"dir":{"q":1,"r":0}},{"cells":[{"r":4,"c":7},{"r":5,"c":6},{"r":6,"c":5}],"dir":{"q":-1,"r":1}}],"lab":"d6e7c6","lab2":"e8d7","d":2,"src":"ApocalypticA vs MLA (IA) - max · MIGS · 2016-08-22","mv":16},{"bm":["6,1","6,2","7,1","5,5","6,3","2,2","1,3","1,2","2,3","3,3","3,4","1,0","2,1","3,2"],"wm":["1,1","4,4","2,4","4,6","2,5","0,0","6,4","4,5","4,2","3,1"],"cb":4,"cw":0,"c":"black","sol":{"cells":[{"r":1,"c":3},{"r":1,"c":2}],"dir":{"q":0,"r":-1}},"multi":true,"seq":[{"cells":[{"r":1,"c":3},{"r":1,"c":2}],"dir":{"q":0,"r":-1}},{"cells":[{"r":1,"c":1}],"dir":{"q":1,"r":0}},{"cells":[{"r":0,"c":2},{"r":0,"c":1}],"dir":{"q":-1,"r":0}}],"lab":"h6h7i6","lab2":"i7i6","d":2,"src":"ApocalypticA vs Kouigna-man · MIGS · 2016-07-19","mv":44},{"bm":["0,3","4,4","4,3","5,3","4,7","6,5","4,5","5,4","6,3","4,6","5,5"],"wm":["8,1","2,4","5,2","2,1","3,2","5,6","2,5","3,5","3,6","6,4"],"cb":4,"cw":3,"c":"black","sol":{"cells":[{"r":5,"c":3},{"r":5,"c":4},{"r":5,"c":5}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":5,"c":3},{"r":5,"c":4},{"r":5,"c":5}],"dir":{"q":1,"r":0}},{"cells":[{"r":8,"c":1}],"dir":{"q":1,"r":0}},{"cells":[{"r":5,"c":6},{"r":5,"c":5},{"r":5,"c":4}],"dir":{"q":1,"r":0}}],"lab":"d4d5","lab2":"d5d6","d":2,"src":"ApocalypticA vs culcul · MIGS · 2016-10-03","mv":72},{"bm":["7,0","6,2","8,2","2,6","6,4","3,5","7,5","4,5","5,5","5,4","1,4","2,4","3,4"],"wm":["7,2","4,6","2,5","3,3","2,3","3,2","2,2","1,1","0,3"],"cb":5,"cw":1,"c":"black","sol":{"cells":[{"r":3,"c":5},{"r":4,"c":5},{"r":5,"c":4}],"dir":{"q":1,"r":-1}},"multi":true,"seq":[{"cells":[{"r":3,"c":5},{"r":4,"c":5},{"r":5,"c":4}],"dir":{"q":1,"r":-1}},{"cells":[{"r":7,"c":2}],"dir":{"q":1,"r":0}},{"cells":[{"r":2,"c":5},{"r":3,"c":5},{"r":4,"c":5}],"dir":{"q":1,"r":-1}}],"lab":"d5e6","lab2":"e6f7","d":2,"src":"ApocalypticA vs cardea · MIGS · 2016-06-03","mv":56},{"bm":["5,4","2,4","5,2","1,4","7,2","7,1","3,5","3,4","1,1","2,2","3,3","3,2","4,3"],"wm":["8,3","2,3","1,5","2,5","1,3","1,2","5,5","0,3","3,6","0,1","4,4","4,5","4,6"],"cb":1,"cw":1,"c":"black","sol":{"cells":[{"r":3,"c":5},{"r":2,"c":4}],"dir":{"q":0,"r":-1}},"multi":true,"seq":[{"cells":[{"r":3,"c":5},{"r":2,"c":4}],"dir":{"q":0,"r":-1}},{"cells":[{"r":8,"c":3}],"dir":{"q":1,"r":0}},{"cells":[{"r":1,"c":4},{"r":1,"c":3}],"dir":{"q":1,"r":0}}],"lab":"f7g7","lab2":"h7h8","d":2,"src":"ApocalypticA vs culcul · MIGS · 2016-10-03","mv":56},{"bm":["7,0","0,3","1,3","1,5","2,5","7,2","1,4","3,5","4,4","5,3","5,5","6,4","6,3","6,2"],"wm":["8,3","8,4","7,3","7,4","7,5","1,0","2,1","5,4","3,3","4,5","3,4","2,3","5,7","5,6"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":5,"c":5},{"r":6,"c":4}],"dir":{"q":-1,"r":1}},"multi":true,"seq":[{"cells":[{"r":5,"c":5},{"r":6,"c":4}],"dir":{"q":-1,"r":1}},{"cells":[{"r":5,"c":4}],"dir":{"q":1,"r":0}},{"cells":[{"r":5,"c":3},{"r":6,"c":3},{"r":7,"c":3}],"dir":{"q":0,"r":1}}],"lab":"d6c5","lab2":"d4c4","d":2,"src":"ApocalypticA vs Jefferson costa · MIGS · 2016-10-03","mv":12},{"bm":["1,3","3,3","4,4","4,3","5,3","1,2","3,4","4,2","3,2","2,2","2,3"],"wm":["3,7","5,6","4,8","4,7","4,6","3,6","5,5","6,5","4,5","3,5","2,5","6,6","1,1"],"cb":1,"cw":3,"c":"black","sol":{"cells":[{"r":4,"c":4},{"r":3,"c":3},{"r":2,"c":2}],"dir":{"q":0,"r":-1}},"multi":true,"seq":[{"cells":[{"r":4,"c":4},{"r":3,"c":3},{"r":2,"c":2}],"dir":{"q":0,"r":-1}},{"cells":[{"r":3,"c":7}],"dir":{"q":0,"r":-1}},{"cells":[{"r":1,"c":1},{"r":2,"c":2},{"r":3,"c":3}],"dir":{"q":0,"r":-1}}],"lab":"e5f5","lab2":"f5g5","d":2,"src":"ApocalypticA vs KALVINH · MIGS · 2016-06-13","mv":64},{"bm":["5,1","5,4","4,5","6,4","4,7","2,5","5,5","4,6","3,6","6,3","7,1"],"wm":["4,4","6,5","3,7","3,3","5,2","4,2","5,6","6,0","6,1","6,2","5,3","4,3","7,3"],"cb":1,"cw":3,"c":"black","sol":{"cells":[{"r":6,"c":4},{"r":6,"c":3}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":6,"c":4},{"r":6,"c":3}],"dir":{"q":1,"r":0}},{"cells":[{"r":3,"c":7}],"dir":{"q":0,"r":-1}},{"cells":[{"r":3,"c":6},{"r":4,"c":6},{"r":5,"c":5}],"dir":{"q":1,"r":-1}}],"lab":"c4c5","lab2":"d6e7","d":2,"src":"ApocalypticA vs KALVINH · MIGS · 2016-06-12","mv":40},{"bm":["7,0","0,3","1,3","7,1","4,4","4,5","6,4","6,3","6,2","3,5","2,5","5,1","5,5","4,6"],"wm":["8,3","7,3","3,3","7,4","2,4","2,2","3,4","2,3","6,5","5,2","5,3","5,4","1,2","1,1"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":6,"c":4},{"r":5,"c":5},{"r":4,"c":6}],"dir":{"q":-1,"r":1}},"multi":true,"seq":[{"cells":[{"r":6,"c":4},{"r":5,"c":5},{"r":4,"c":6}],"dir":{"q":-1,"r":1}},{"cells":[{"r":5,"c":2}],"dir":{"q":0,"r":-1}},{"cells":[{"r":7,"c":3},{"r":6,"c":4},{"r":5,"c":5}],"dir":{"q":-1,"r":1}}],"lab":"e7d6","lab2":"d6c5","d":2,"src":"ApocalypticA vs IA de lolo · MIGS · 2016-07-18","mv":20},{"bm":["7,0","0,3","1,3","5,3","1,4","4,5","3,3","3,4","3,5","5,4","6,4","6,3","5,5","6,5"],"wm":["1,1","1,2","2,4","2,3","2,2","4,7","4,6","8,4","4,4","5,6","7,4","7,3","2,1"],"cb":1,"cw":0,"c":"black","sol":{"cells":[{"r":5,"c":3},{"r":6,"c":3}],"dir":{"q":0,"r":1}},"multi":true,"seq":[{"cells":[{"r":5,"c":3},{"r":6,"c":3}],"dir":{"q":0,"r":1}},{"cells":[{"r":4,"c":4}],"dir":{"q":-1,"r":0}},{"cells":[{"r":7,"c":3},{"r":6,"c":3}],"dir":{"q":0,"r":1}}],"lab":"d4c4","lab2":"c4b4","d":2,"src":"ApocalypticA vs Fredo_ · MIGS · 2016-07-25","mv":28},{"bm":["5,1","4,7","3,3","1,4","2,4","3,4","5,5","4,6","3,6","5,4"],"wm":["5,2","6,2","5,6","0,2","1,2","2,3","2,2","0,3","6,4","4,5","3,5","2,5"],"cb":2,"cw":4,"c":"black","sol":{"cells":[{"r":5,"c":4},{"r":5,"c":5}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":5,"c":4},{"r":5,"c":5}],"dir":{"q":1,"r":0}},{"cells":[{"r":6,"c":4}],"dir":{"q":1,"r":0}},{"cells":[{"r":4,"c":7},{"r":3,"c":6}],"dir":{"q":0,"r":1}}],"lab":"d5d6","lab2":"f8e8","d":2,"src":"ApocalypticA vs boulet · MIGS · 2016-09-30","mv":96},{"bm":["5,1","6,4","1,5","6,1","3,1","4,5","5,5","5,4","2,3","2,5","1,3","2,4","3,4"],"wm":["5,2","4,2","6,5","6,2","7,0","7,1","4,3","3,2","2,1","3,5","1,4","4,4","3,3","2,2"],"cb":0,"cw":1,"c":"black","sol":{"cells":[{"r":3,"c":4},{"r":2,"c":4}],"dir":{"q":1,"r":-1}},"multi":true,"seq":[{"cells":[{"r":3,"c":4},{"r":2,"c":4}],"dir":{"q":1,"r":-1}},{"cells":[{"r":3,"c":5}],"dir":{"q":1,"r":0}},{"cells":[{"r":1,"c":4},{"r":2,"c":4}],"dir":{"q":1,"r":-1}}],"lab":"f6g7","lab2":"g7h8","d":2,"src":"ApocalypticA vs KALVINH · MIGS · 2016-06-12","mv":40},{"bm":["0,4","4,4","4,5","4,3","5,3","5,4","5,5","6,3","6,2","6,1","4,6","4,7"],"wm":["1,0","2,4","7,2","5,2","3,6","3,5","3,4","0,3","1,3","6,4","6,6","5,6","6,5"],"cb":1,"cw":2,"c":"black","sol":{"cells":[{"r":5,"c":5},{"r":5,"c":4},{"r":5,"c":3}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":5,"c":5},{"r":5,"c":4},{"r":5,"c":3}],"dir":{"q":1,"r":0}},{"cells":[{"r":1,"c":0}],"dir":{"q":1,"r":0}},{"cells":[{"r":5,"c":6},{"r":5,"c":5},{"r":5,"c":4}],"dir":{"q":1,"r":0}}],"lab":"d4d5","lab2":"d5d6","d":2,"src":"ApocalypticA vs phildemon · MIGS · 2016-07-04","mv":36},{"bm":["5,4","7,1","6,4","5,2","6,2","4,4","4,5","4,6","7,3","5,6","6,6"],"wm":["5,5","1,5","2,5","6,1","5,7","4,2","6,3","5,3","4,7","2,4","3,3","3,4"],"cb":2,"cw":3,"c":"black","sol":{"cells":[{"r":4,"c":4},{"r":4,"c":5},{"r":4,"c":6}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":4,"c":4},{"r":4,"c":5},{"r":4,"c":6}],"dir":{"q":1,"r":0}},{"cells":[{"r":5,"c":5}],"dir":{"q":0,"r":1}},{"cells":[{"r":4,"c":7},{"r":4,"c":6},{"r":4,"c":5}],"dir":{"q":1,"r":0}}],"lab":"e5e6","lab2":"e6e7","d":2,"src":"ApocalypticA vs boulet · MIGS · 2016-06-03","mv":84},{"bm":["3,3","4,8","5,2","3,1","4,5","4,3","3,2","3,4","4,4","0,1","2,2","2,3"],"wm":["4,7","5,5","3,5","1,5","0,2","1,0","1,1","1,2","2,1","2,5","1,4"],"cb":3,"cw":2,"c":"black","sol":{"cells":[{"r":2,"c":3},{"r":2,"c":2}],"dir":{"q":-1,"r":0}},"multi":true,"seq":[{"cells":[{"r":2,"c":3},{"r":2,"c":2}],"dir":{"q":-1,"r":0}},{"cells":[{"r":4,"c":7}],"dir":{"q":-1,"r":0}},{"cells":[{"r":4,"c":3},{"r":3,"c":2},{"r":2,"c":1}],"dir":{"q":0,"r":-1}}],"lab":"g6g5","lab2":"e4f4","d":2,"src":"ApocalypticA vs mcdo · MIGS · 2016-07-19","mv":68},{"bm":["0,3","1,3","3,3","6,4","4,3","7,1","6,2","4,5","2,2","5,4","5,3","3,5","4,6","3,6"],"wm":["8,3","3,2","4,4","6,3","7,3","5,6","7,4","1,1","2,4","3,4","2,3","1,2","5,5","4,7"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":4,"c":5},{"r":4,"c":6}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":4,"c":5},{"r":4,"c":6}],"dir":{"q":1,"r":0}},{"cells":[{"r":6,"c":3}],"dir":{"q":-1,"r":1}},{"cells":[{"r":4,"c":7},{"r":4,"c":6}],"dir":{"q":1,"r":0}}],"lab":"e6e7","lab2":"e7e8","d":2,"src":"ApocalypticA vs KALVINH · MIGS · 2016-06-03","mv":36},{"bm":["2,1","3,4","2,3","3,3","7,3","4,2","5,2","5,3","6,2","6,3","3,5","4,5"],"wm":["4,4","2,4","4,3","4,6","1,3","3,2","2,2","5,1","7,2","6,1","2,5","5,5","6,4"],"cb":1,"cw":2,"c":"black","sol":{"cells":[{"r":4,"c":2},{"r":5,"c":2},{"r":6,"c":2}],"dir":{"q":0,"r":1}},"multi":true,"seq":[{"cells":[{"r":4,"c":2},{"r":5,"c":2},{"r":6,"c":2}],"dir":{"q":0,"r":1}},{"cells":[{"r":2,"c":5}],"dir":{"q":1,"r":0}},{"cells":[{"r":7,"c":2},{"r":6,"c":2},{"r":5,"c":2}],"dir":{"q":0,"r":1}}],"lab":"e3d3","lab2":"d3c3","d":2,"src":"ApocalypticA vs boulet · MIGS · 2016-08-01","mv":124},{"bm":["3,3","2,3","4,1","2,4","2,1","3,2","4,3","7,2","6,2","5,2","5,3","1,1","1,2"],"wm":["3,4","4,4","4,5","3,5","4,6","2,2","8,3","7,3","6,3","4,2","3,1","5,1","3,0","2,0"],"cb":0,"cw":1,"c":"black","sol":{"cells":[{"r":5,"c":3},{"r":5,"c":2}],"dir":{"q":-1,"r":0}},"multi":true,"seq":[{"cells":[{"r":5,"c":3},{"r":5,"c":2}],"dir":{"q":-1,"r":0}},{"cells":[{"r":4,"c":4}],"dir":{"q":0,"r":1}},{"cells":[{"r":4,"c":1},{"r":5,"c":1}],"dir":{"q":0,"r":-1}}],"lab":"d4d3","lab2":"d2e2","d":2,"src":"ApocalypticA vs KALVINH · MIGS · 2016-06-02","mv":48},{"bm":["7,0","6,1","0,3","1,3","1,5","6,2","7,1","1,4","4,5","5,4","6,4","5,5","4,6","4,3"],"wm":["8,4","7,4","1,0","1,1","2,4","3,4","2,3","4,4","3,3","6,5","5,6","8,2","5,3","6,3"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":4,"c":5},{"r":5,"c":5}],"dir":{"q":0,"r":1}},"multi":true,"seq":[{"cells":[{"r":4,"c":5},{"r":5,"c":5}],"dir":{"q":0,"r":1}},{"cells":[{"r":5,"c":6}],"dir":{"q":1,"r":0}},{"cells":[{"r":6,"c":5},{"r":5,"c":5}],"dir":{"q":0,"r":1}}],"lab":"e6d6","lab2":"d6c6","d":2,"src":"ApocalypticA vs IA de lolo · MIGS · 2016-05-26","mv":16},{"bm":["7,0","0,3","1,3","1,5","1,4","3,5","3,6","4,5","5,4","5,2","6,0","6,1","6,2","5,3"],"wm":["8,3","7,3","1,0","3,3","1,1","2,4","2,2","3,4","2,3","6,3","6,4","7,1","6,6","6,5"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":5,"c":3},{"r":6,"c":2}],"dir":{"q":-1,"r":1}},"multi":true,"seq":[{"cells":[{"r":5,"c":3},{"r":6,"c":2}],"dir":{"q":-1,"r":1}},{"cells":[{"r":6,"c":6}],"dir":{"q":0,"r":-1}},{"cells":[{"r":7,"c":0},{"r":6,"c":0}],"dir":{"q":0,"r":1}}],"lab":"d4c3","lab2":"c1b1","d":2,"src":"ApocalypticA vs MLA (IA) - max · MIGS · 2016-06-03","mv":16},{"bm":["6,0","5,4","3,4","3,5","5,2","1,5","4,6","4,5","4,4","6,3","6,4","6,5","4,3"],"wm":["8,3","5,7","5,5","7,4","5,6","2,5","2,4","1,4","4,7","5,3","6,2","3,3","2,3"],"cb":1,"cw":1,"c":"black","sol":{"cells":[{"r":4,"c":4},{"r":5,"c":4},{"r":6,"c":4}],"dir":{"q":0,"r":1}},"multi":true,"seq":[{"cells":[{"r":4,"c":4},{"r":5,"c":4},{"r":6,"c":4}],"dir":{"q":0,"r":1}},{"cells":[{"r":5,"c":7}],"dir":{"q":1,"r":-1}},{"cells":[{"r":7,"c":4},{"r":6,"c":4},{"r":5,"c":4}],"dir":{"q":0,"r":1}}],"lab":"e5d5","lab2":"d5c5","d":2,"src":"ApocalypticA vs boulet · MIGS · 2016-06-19","mv":44},{"bm":["7,0","0,3","7,1","7,2","4,4","4,6","3,6","4,5","6,4","6,3","6,2","3,5","2,4","5,2"],"wm":["8,3","7,3","2,2","1,1","2,3","1,2","2,1","3,4","3,3","7,4","6,5","5,3","5,4","5,5"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":7,"c":0},{"r":7,"c":1},{"r":7,"c":2}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":7,"c":0},{"r":7,"c":1},{"r":7,"c":2}],"dir":{"q":1,"r":0}},{"cells":[{"r":1,"c":1}],"dir":{"q":-1,"r":0}},{"cells":[{"r":7,"c":3},{"r":7,"c":2},{"r":7,"c":1}],"dir":{"q":1,"r":0}}],"lab":"b1b2","lab2":"b2b3","d":2,"src":"ApocalypticA vs mcdo · MIGS · 2016-07-19","mv":16},{"bm":["7,0","1,5","7,2","5,4","4,6","4,7","6,3","6,4","5,3","6,2","7,1","2,3","1,3","5,5"],"wm":["8,3","8,4","7,3","7,4","7,5","6,6","3,4","2,4","3,3","5,2","4,5","4,4","4,3"],"cb":1,"cw":0,"c":"black","sol":{"cells":[{"r":4,"c":6},{"r":5,"c":5},{"r":6,"c":4}],"dir":{"q":-1,"r":1}},"multi":true,"seq":[{"cells":[{"r":4,"c":6},{"r":5,"c":5},{"r":6,"c":4}],"dir":{"q":-1,"r":1}},{"cells":[{"r":6,"c":6}],"dir":{"q":-1,"r":0}},{"cells":[{"r":5,"c":3},{"r":6,"c":3},{"r":7,"c":3}],"dir":{"q":0,"r":1}}],"lab":"e7d6","lab2":"d4c4","d":2,"src":"ApocalypticA vs IA de lolo · MIGS · 2016-05-26","mv":24},{"bm":["6,1","0,3","1,5","6,2","4,5","6,4","4,3","5,3","5,4","5,5","4,6","7,3","7,2","7,1"],"wm":["4,4","6,3","5,2","2,4","2,3","2,2","3,5","3,4","3,3","6,6","7,5","4,7","5,6","6,5"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":5,"c":3},{"r":5,"c":4},{"r":5,"c":5}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":5,"c":3},{"r":5,"c":4},{"r":5,"c":5}],"dir":{"q":1,"r":0}},{"cells":[{"r":6,"c":3}],"dir":{"q":0,"r":-1}},{"cells":[{"r":5,"c":6},{"r":5,"c":5},{"r":5,"c":4}],"dir":{"q":1,"r":0}}],"lab":"d4d5","lab2":"d5d6","d":2,"src":"ApocalypticA vs IA de lolo · MIGS · 2016-07-18","mv":28},{"bm":["1,5","2,5","2,4","1,3","5,2","3,2","3,3","5,4","6,4","6,3","6,2","3,4","7,0","7,1"],"wm":["8,3","8,4","4,4","4,3","5,3","3,1","4,5","1,1","2,2","2,3","1,2","7,2","7,3","7,4"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":5,"c":4},{"r":6,"c":3}],"dir":{"q":-1,"r":1}},"multi":true,"seq":[{"cells":[{"r":5,"c":4},{"r":6,"c":3}],"dir":{"q":-1,"r":1}},{"cells":[{"r":5,"c":3}],"dir":{"q":1,"r":0}},{"cells":[{"r":7,"c":2},{"r":6,"c":3}],"dir":{"q":-1,"r":1}}],"lab":"d5c4","lab2":"c4b3","d":2,"src":"ApocalypticA vs boulet · MIGS · 2016-08-01","mv":20},{"bm":["5,3","5,4","7,3","2,4","4,7","2,5","1,3","5,2","3,6","3,5","6,4","6,3","6,2","3,7"],"wm":["6,6","3,2","2,2","3,1","4,4","5,6","4,3","3,3","4,6","3,4","4,5","5,5","4,8","7,5"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":2,"c":5}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":2,"c":5}],"dir":{"q":1,"r":0}},{"cells":[{"r":5,"c":6}],"dir":{"q":1,"r":0}},{"cells":[{"r":4,"c":7},{"r":3,"c":6}],"dir":{"q":0,"r":1}}],"lab":"g8g9","lab2":"f8e8","d":2,"src":"ApocalypticA vs KALVINH · MIGS · 2016-09-08","mv":44},{"bm":["1,5","6,4","6,3","4,4","2,5","5,3","3,4","2,3","7,0","1,2","2,4","3,5","5,2"],"wm":["2,2","7,2","7,3","5,5","5,4","4,5","3,2","6,1","6,5","1,3","3,3","4,3","7,5","7,4"],"cb":0,"cw":1,"c":"black","sol":{"cells":[{"r":3,"c":5},{"r":2,"c":4}],"dir":{"q":0,"r":-1}},"multi":true,"seq":[{"cells":[{"r":3,"c":5},{"r":2,"c":4}],"dir":{"q":0,"r":-1}},{"cells":[{"r":6,"c":1}],"dir":{"q":1,"r":0}},{"cells":[{"r":1,"c":3},{"r":2,"c":4}],"dir":{"q":0,"r":-1}}],"lab":"f7g7","lab2":"g7h7","d":2,"src":"ApocalypticA vs Gengis Khan · MIGS · 2016-10-31","mv":32},{"bm":["7,0","6,1","0,3","5,3","6,2","7,1","6,3","7,2","4,4","4,6","5,5","3,5","3,6","3,7"],"wm":["7,3","7,5","2,1","5,4","6,4","2,2","3,3","3,2","4,5","3,4","2,3","5,6","6,5","7,4"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":5,"c":3},{"r":6,"c":3}],"dir":{"q":0,"r":1}},"multi":true,"seq":[{"cells":[{"r":5,"c":3},{"r":6,"c":3}],"dir":{"q":0,"r":1}},{"cells":[{"r":2,"c":1}],"dir":{"q":-1,"r":0}},{"cells":[{"r":7,"c":1},{"r":7,"c":2},{"r":7,"c":3}],"dir":{"q":1,"r":0}}],"lab":"d4c4","lab2":"b2b3","d":2,"src":"ApocalypticA vs lagroute · MIGS · 2016-07-25","mv":16},{"bm":["0,3","2,2","5,4","6,3","4,2","6,0","6,1","6,4","5,5","7,2","8,1","5,6","4,6","3,5"],"wm":["8,4","2,3","6,5","1,2","5,2","2,1","4,3","3,3","3,2","6,2","5,3","4,4","7,4","7,3"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":6,"c":4},{"r":5,"c":5},{"r":4,"c":6}],"dir":{"q":-1,"r":1}},"multi":true,"seq":[{"cells":[{"r":6,"c":4},{"r":5,"c":5},{"r":4,"c":6}],"dir":{"q":-1,"r":1}},{"cells":[{"r":8,"c":4}],"dir":{"q":-1,"r":0}},{"cells":[{"r":7,"c":3},{"r":6,"c":4},{"r":5,"c":5}],"dir":{"q":-1,"r":1}}],"lab":"e7d6","lab2":"d6c5","d":2,"src":"ApocalypticA vs Gengis Khan · MIGS · 2016-10-31","mv":36},{"bm":["0,3","1,3","6,3","3,6","6,1","3,2","5,0","2,3","3,4","6,4","4,4","4,3","5,5"],"wm":["8,3","8,4","3,1","7,1","7,3","6,2","2,4","1,2","3,3","2,2","4,5","5,4","5,3","5,2"],"cb":0,"cw":1,"c":"black","sol":{"cells":[{"r":5,"c":5},{"r":6,"c":4}],"dir":{"q":-1,"r":1}},"multi":true,"seq":[{"cells":[{"r":5,"c":5},{"r":6,"c":4}],"dir":{"q":-1,"r":1}},{"cells":[{"r":3,"c":1}],"dir":{"q":-1,"r":0}},{"cells":[{"r":6,"c":3},{"r":7,"c":3}],"dir":{"q":0,"r":1}}],"lab":"d6c5","lab2":"c4b4","d":2,"src":"ApocalypticA vs KALVINH · MIGS · 2016-06-12","mv":32},{"bm":["1,5","2,3","2,4","2,5","5,7","5,6","4,6","3,6","3,5","4,5","5,5","6,5","7,4"],"wm":["4,4","6,3","3,2","4,7","5,4","5,3","6,4","3,4","8,2","7,2","6,2","7,3"],"cb":2,"cw":1,"c":"black","sol":{"cells":[{"r":5,"c":6},{"r":6,"c":5},{"r":7,"c":4}],"dir":{"q":1,"r":-1}},"multi":true,"seq":[{"cells":[{"r":5,"c":6},{"r":6,"c":5},{"r":7,"c":4}],"dir":{"q":1,"r":-1}},{"cells":[{"r":3,"c":2}],"dir":{"q":1,"r":0}},{"cells":[{"r":4,"c":7},{"r":5,"c":6},{"r":6,"c":5}],"dir":{"q":1,"r":-1}}],"lab":"b5c6","lab2":"c6d7","d":2,"src":"ApocalypticA vs marzipan71 · MIGS · 2016-09-13","mv":44},{"bm":["0,4","1,4","4,4","5,3","6,2","1,5","0,2","5,2","6,1","3,3","2,3","5,4","6,3","5,1"],"wm":["8,3","0,1","1,0","2,0","2,1","1,1","2,4","0,3","4,5","5,5","3,4","4,3","4,2","3,2"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":1,"c":4},{"r":1,"c":5}],"dir":{"q":-1,"r":0}},"multi":true,"seq":[{"cells":[{"r":1,"c":4},{"r":1,"c":5}],"dir":{"q":-1,"r":0}},{"cells":[{"r":2,"c":4}],"dir":{"q":1,"r":0}},{"cells":[{"r":3,"c":3},{"r":2,"c":3},{"r":1,"c":3}],"dir":{"q":1,"r":-1}}],"lab":"h9h8","lab2":"f5g6","d":2,"src":"Ashitaka vs Gohatto · MIGS · 2016-03-31","mv":24},{"bm":["6,2","6,1","6,6","4,6","4,5","5,6","5,5","5,4","2,5","1,4"],"wm":["7,3","7,5","3,2","3,5","2,6","3,6","2,4","4,7","1,3","1,2","1,1"],"cb":3,"cw":4,"c":"black","sol":{"cells":[{"r":4,"c":6},{"r":4,"c":5}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":4,"c":6},{"r":4,"c":5}],"dir":{"q":1,"r":0}},{"cells":[{"r":7,"c":3}],"dir":{"q":1,"r":0}},{"cells":[{"r":4,"c":7},{"r":4,"c":6}],"dir":{"q":1,"r":0}}],"lab":"e6e7","lab2":"e7e8","d":2,"src":"Ashitaka vs phildemon · MIGS · 2016-03-31","mv":40},{"bm":["7,2","4,4","4,5","3,7","3,5","5,3","4,3","5,2","6,0","6,1","5,5","4,6","6,5"],"wm":["1,1","7,4","6,6","5,4","2,1","3,4","3,3","2,5","2,4","2,3","8,2","7,3","6,4","6,3"],"cb":0,"cw":1,"c":"black","sol":{"cells":[{"r":3,"c":5},{"r":4,"c":6}],"dir":{"q":0,"r":1}},"multi":true,"seq":[{"cells":[{"r":3,"c":5},{"r":4,"c":6}],"dir":{"q":0,"r":1}},{"cells":[{"r":8,"c":2}],"dir":{"q":1,"r":0}},{"cells":[{"r":5,"c":6},{"r":4,"c":6}],"dir":{"q":0,"r":1}}],"lab":"f7e7","lab2":"e7d7","d":2,"src":"Ashitaka vs eobllor · MIGS · 2016-03-30","mv":28},{"bm":["6,4","6,3","6,2","6,0","6,1","3,1","2,2","1,2","1,4","3,3","2,3","1,3"],"wm":["8,3","7,2","7,3","7,4","5,4","4,5","1,1","2,1","5,2","4,3","5,3","4,4","3,4"],"cb":1,"cw":2,"c":"black","sol":{"cells":[{"r":2,"c":2},{"r":3,"c":3}],"dir":{"q":0,"r":-1}},"multi":true,"seq":[{"cells":[{"r":2,"c":2},{"r":3,"c":3}],"dir":{"q":0,"r":-1}},{"cells":[{"r":2,"c":1}],"dir":{"q":-1,"r":0}},{"cells":[{"r":1,"c":1},{"r":2,"c":2}],"dir":{"q":0,"r":-1}}],"lab":"f5g5","lab2":"g5h5","d":2,"src":"assistant vs MLA (IA) - max · MIGS · 2016-12-31","mv":36},{"bm":["7,0","1,4","2,4","2,5","7,1","7,2","1,3","2,6","1,5","5,4","4,5","6,6","6,5","6,4"],"wm":["8,4","7,4","7,5","4,4","3,3","2,2","3,2","2,1","3,4","2,3","6,3","7,3"],"cb":2,"cw":0,"c":"black","sol":{"cells":[{"r":4,"c":5},{"r":5,"c":4}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":4,"c":5},{"r":5,"c":4}],"dir":{"q":1,"r":0}},{"cells":[{"r":7,"c":4}],"dir":{"q":-1,"r":1}},{"cells":[{"r":6,"c":5},{"r":5,"c":5}],"dir":{"q":0,"r":1}}],"lab":"d5e6d6","lab2":"d6c6","d":2,"src":"assistant vs MLA (IA) - max · MIGS · 2017-01-12","mv":16},{"bm":["7,5","6,3","4,3","5,4","4,5","4,6","3,6","3,5","3,4"],"wm":["1,0","6,2","5,1","0,3","4,4","2,4","2,3","1,4","4,7"],"cb":5,"cw":5,"c":"black","sol":{"cells":[{"r":4,"c":5},{"r":4,"c":6}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":4,"c":5},{"r":4,"c":6}],"dir":{"q":1,"r":0}},{"cells":[{"r":1,"c":0}],"dir":{"q":1,"r":0}},{"cells":[{"r":4,"c":7},{"r":4,"c":6}],"dir":{"q":1,"r":0}}],"lab":"e6e7","lab2":"e7e8","d":2,"src":"assistant vs LucianFreud · MIGS · 2016-12-17","mv":80},{"bm":["7,0","6,1","0,3","6,2","7,1","6,3","7,2","0,1","2,0","2,1","1,3","1,2","1,1","5,2"],"wm":["8,3","8,4","7,3","7,4","3,1","0,2","5,3","5,4","5,5"],"cb":5,"cw":0,"c":"black","sol":{"cells":[{"r":7,"c":0},{"r":7,"c":1},{"r":7,"c":2}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":7,"c":0},{"r":7,"c":1},{"r":7,"c":2}],"dir":{"q":1,"r":0}},{"cells":[{"r":3,"c":1}],"dir":{"q":1,"r":0}},{"cells":[{"r":7,"c":3},{"r":7,"c":2},{"r":7,"c":1}],"dir":{"q":1,"r":0}}],"lab":"b1b2","lab2":"b2b3","d":2,"src":"Athanase vs mascotte · MIGS · 2016-08-14","mv":24},{"bm":["7,0","0,3","0,4","1,3","1,4","1,5","6,4","5,4","6,3","3,4","3,5","4,4","5,3","6,2"],"wm":["8,4","7,5","1,0","7,3","1,2","5,6","5,5","4,5","3,3","1,1","2,4","2,3","2,2","6,5"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":6,"c":3},{"r":5,"c":3}],"dir":{"q":0,"r":1}},"multi":true,"seq":[{"cells":[{"r":6,"c":3},{"r":5,"c":3}],"dir":{"q":0,"r":1}},{"cells":[{"r":4,"c":5}],"dir":{"q":1,"r":0}},{"cells":[{"r":7,"c":3},{"r":6,"c":3}],"dir":{"q":0,"r":1}}],"lab":"d4c4","lab2":"c4b4","d":2,"src":"automne vs jackywoo · MIGS · 2016-10-17","mv":12},{"bm":["7,0","6,1","1,5","5,3","6,2","7,1","3,4","1,4","2,6","2,5","2,3","1,3","4,5","5,4"],"wm":["7,4","6,4","6,5","1,0","1,1","7,3","2,4","3,3","0,1","6,6","7,5","3,5","3,2","2,2"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":1,"c":5},{"r":1,"c":4},{"r":1,"c":3}],"dir":{"q":-1,"r":0}},"multi":true,"seq":[{"cells":[{"r":1,"c":5},{"r":1,"c":4},{"r":1,"c":3}],"dir":{"q":-1,"r":0}},{"cells":[{"r":3,"c":2}],"dir":{"q":-1,"r":0}},{"cells":[{"r":3,"c":4},{"r":2,"c":3},{"r":1,"c":2}],"dir":{"q":0,"r":-1}}],"lab":"h9h8","lab2":"f6g6","d":2,"src":"automne vs jackywoo · MIGS · 2016-10-17","mv":12},{"bm":["7,0","6,1","0,3","1,3","1,5","6,2","7,1","6,3","7,2","4,4","3,3","3,4","3,5","5,2"],"wm":["8,3","7,3","0,1","1,0","1,2","7,4","1,1","2,3","2,2","5,7","3,2","5,3","5,4","5,5"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":7,"c":0},{"r":7,"c":1},{"r":7,"c":2}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":7,"c":0},{"r":7,"c":1},{"r":7,"c":2}],"dir":{"q":1,"r":0}},{"cells":[{"r":1,"c":0}],"dir":{"q":1,"r":-1}},{"cells":[{"r":7,"c":3},{"r":7,"c":2},{"r":7,"c":1}],"dir":{"q":1,"r":0}}],"lab":"b1b2","lab2":"b2b3","d":2,"src":"automne vs spectateur · MIGS · 2016-10-02","mv":12},{"bm":["7,0","6,1","0,3","1,3","1,5","5,3","6,2","7,1","6,3","7,2","4,4","3,3","3,4","3,5"],"wm":["8,3","7,3","5,4","7,4","2,2","1,1","2,3","1,2","5,7","5,6","5,5","4,3","3,2","2,1"],"cb":0,"cw":0,"c":"black","sol":{"cells":[{"r":7,"c":0},{"r":7,"c":1},{"r":7,"c":2}],"dir":{"q":1,"r":0}},"multi":true,"seq":[{"cells":[{"r":7,"c":0},{"r":7,"c":1},{"r":7,"c":2}],"dir":{"q":1,"r":0}},{"cells":[{"r":5,"c":7}],"dir":{"q":0,"r":-1}},{"cells":[{"r":5,"c":3},{"r":6,"c":3},{"r":7,"c":3}],"dir":{"q":0,"r":1}}],"lab":"b1b2","lab2":"d4c4","d":2,"src":"automne vs spectateur · MIGS · 2016-10-02","mv":12},{"bm":["4,1","8,3","6,5","2,3","2,5","3,5","6,3","4,6","4,5","5,5","6,4"],"wm":["2,2","3,3","3,1","5,1","3,6","4,2","4,4","3,4","2,4","4,3","3,2","2,1","1,2"],"cb":1,"cw":3,"c":"black","sol":{"cells":[{"r":4,"c":6},{"r":5,"c":5},{"r":6,"c":4}],"dir":{"q":1,"r":-1}},"multi":true,"seq":[{"cells":[{"r":4,"c":6},{"r":5,"c":5},{"r":6,"c":4}],"dir":{"q":1,"r":-1}},{"cells":[{"r":3,"c":1}],"dir":{"q":-1,"r":0}},{"cells":[{"r":3,"c":6},{"r":4,"c":6},{"r":5,"c":5}],"dir":{"q":1,"r":-1}}],"lab":"c5d6","lab2":"d6e7","d":2,"src":"automne vs culcul · MIGS · 2016-10-31","mv":92},{"bm":["1,5","1,3","6,1","3,7","1,0","2,1","3,2","3,1","4,2","2,2","3,3","2,3","1,2"],"wm":["1,1","4,3","5,3","4,1","0,4","1,4","4,4","5,4","6,2","6,3","6,4"],"cb":3,"cw":1,"c":"black","sol":{"cells":[{"r":2,"c":1},{"r":3,"c":1}],"dir":{"q":1,"r":-1}},"multi":true,"seq":[{"cells":[{"r":2,"c":1},{"r":3,"c":1}],"dir":{"q":1,"r":-1}},{"cells":[{"r":4,"c":1}],"dir":{"q":-1,"r":0}},{"cells":[{"r":1,"c":2},{"r":2,"c":3}],"dir":{"q":0,"r":-1}}],"lab":"f3g4","lab2":"g6h6","d":2,"src":"automne vs lojjib · MIGS · 2016-10-26","mv":40}];
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
  humanColor=p.c; currentTurn=p.c; _bookNode=null; gameBestHint=null;
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
  gameMode='ai';
  humanColor=M.human;
  const bar=document.getElementById('tourney-bar'); if(bar) bar.style.display='flex';
  const t=document.getElementById('tb-title');
  if(t) t.textContent='\ud83c\udfc6 '+M.name+' \u2014 vs '+M.opp+' \u00b7 tu joues les '+(M.human==='black'?'\u26ab Noirs':'\u26aa Blancs');
  _tClockStart();
  updateStatus();
  if(currentTurn!==humanColor && !gameOver){ setTimeout(function(){ if(typeof aiMove==='function') aiMove(); }, 700); }
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
  const loser=currentTurn, winner=(loser==='black'?'white':'black');
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
  const mover=currentTurn, now=Date.now();
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
  const side = (typeof currentTurn !== 'undefined' && currentTurn) ? currentTurn : 'black';
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
  const human = humanColor;
  const moves = getAllMovesForColor(ai);
  if (!moves.length) { currentTurn=human; updateStatus(); return; }

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
    if (!chosen) { currentTurn=human; updateStatus(); return; }
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
      if (!chosen) { currentTurn=human; updateStatus(); return; }
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
      if (!chosen) { currentTurn=human; updateStatus(); return; }
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
      if (!chosen) { currentTurn=human; updateStatus(); return; }
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
  const human = humanColor;          // couleur de l'humain (= victime des éjections de l'IA)
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
  currentTurn=human; moveCount++;
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

/* ═══════════════════════════════════════════
   ANTI-TRICHE / INTÉGRITÉ
   Vérifie la cohérence de l'état avant de valider
   une victoire ou de créditer de l'XP. Empêche les
   manipulations triviales (console, édition du score).
═══════════════════════════════════════════ */
let gameStartTime = Date.now();

function countMarbles() {
  let black = 0, white = 0;
  for (const k in board) {
    if (board[k] === 'black') black++;
    else if (board[k] === 'white') white++;
  }
  return { black, white };
}

function boardIntegrityOK() {
  const { black, white } = countMarbles();
  // Jamais plus de 14 billes par couleur, et le compte éjecté doit concorder
  if (black > 14 || white > 14) return false;
  if (black + capturedByWhite > 14) return false;   // blancs ont éjecté des noirs
  if (white + capturedByBlack > 14) return false;
  if (capturedByBlack < 0 || capturedByWhite < 0) return false;
  if (capturedByBlack > 6 || capturedByWhite > 6) return false;
  return true;
}

function winIntegrityOK(winner) {
  // Une vraie victoire exige 6 éjections et un minimum de coups/temps
  const caps = winner === 'black' ? capturedByBlack : capturedByWhite;
  if (caps < 6) return false;
  // Il faut au moins 6 coups pour éjecter 6 billes (en réalité bien plus)
  if (moveCount < 6) return false;
  // Partie anormalement instantanée (< 3 s) = manipulation probable
  if (Date.now() - gameStartTime < 3000) return false;
  return boardIntegrityOK();
}

function progressIntegrityOK(p) {
  if (!p) return false;
  // Bornes de cohérence
  if (p.gamesWon > p.gamesPlayed) return false;
  if ((p.gamesWon||0) + (p.gamesLost||0) + (p.gamesDraw||0) > p.gamesPlayed) return false;
  if (p.xp < 0 || p.level < 1) return false;
  if (p.elo < 0 || p.elo > 4000) return false;        // ELO plausible
  if (p.streak < 0 || p.streak > 3650) return false;
  // Le niveau doit correspondre à l'XP (tolérance ±1)
  if (typeof levelFromXp === 'function') {
    const expected = levelFromXp(p.xp);
    if (Math.abs(p.level - expected) > 1) return false;
  }
  return true;
}

function sanitizeProgress() {
  // Recale la progression si une incohérence est détectée
  if (!progressIntegrityOK(progress)) {
    if (progress.gamesWon > progress.gamesPlayed) progress.gamesPlayed = progress.gamesWon;
    if (progress.xp < 0) progress.xp = 0;
    if (typeof levelFromXp === 'function') progress.level = levelFromXp(progress.xp);
    progress.elo = Math.min(4000, Math.max(0, progress.elo || 1000));
    progress.streak = Math.max(0, Math.min(3650, progress.streak || 0));
    saveProgress(progress);
  }
}

/* ═══════════════════════════════════════════
   HISTORIQUE DE PARTIES — consultable, filtrable, rejouable.
   Reutilise gameCodeEncode() pour stocker chaque partie de facon compacte
   (le meme format que "Partie par code", deja teste et fiable) plutot que
   de sauvegarder les snapshots complets du plateau a chaque coup -- une
   partie de 60 coups tient en quelques centaines d'octets, pas des
   dizaines de kilo-octets.
   Plafonne a HIST_MAX parties (les plus recentes) pour eviter une
   croissance illimitee de localStorage. */
const GAME_HISTORY_KEY = 'abaGameHistory';
const HIST_MAX = 200;

function _historyOpponentLabel(entry){
  if (entry.mode === 'import') return 'Partie importée' + ((entry.blackName || entry.whiteName) ? ' — ' + (entry.blackName||'?') + ' vs ' + (entry.whiteName||'?') : '');
  if (entry.mode === 'local') return (entry.blackName || entry.whiteName) ? 'Partie par code/direct' : 'Local (même écran)';
  const styleLabels = { auto:'Auto', aggressive:'Agressif', defensive:'Défensif', divide:'Division', balanced:'Équilibré' };
  const diffLabels = { easy:'Facile', medium:'Moyen', advanced:'Avancé', hard:'Expert', master:'Maître', minimax:'Minimax' };
  const style = styleLabels[entry.aiStyle] || entry.aiStyle || '?';
  const diff = diffLabels[entry.aiDiff] || entry.aiDiff || '?';
  return 'IA ' + style + ' — ' + diff;
}

function _recordGameHistory(winner, reason){
  try {
    if (typeof gameCodeEncode !== 'function') return;
    const code = gameCodeEncode();
    if (!code) return; // aucun coup joue -- rien a enregistrer
    const mode = (typeof gameMode !== 'undefined') ? gameMode : 'ai';
    const entry = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2,7),
      date: new Date().toISOString(),
      variant: (typeof currentLayout !== 'undefined') ? currentLayout : 'standard',
      mode: mode,
      humanColor: (typeof humanColor !== 'undefined') ? humanColor : 'black',
      winner: winner || null,
      reason: reason || null,
      moveCount: (typeof moveCount !== 'undefined') ? moveCount : 0,
      aiStyle: (mode === 'ai' && typeof _setupCfg !== 'undefined') ? _setupCfg.style : null,
      aiDiff: (mode === 'ai' && typeof _setupCfg !== 'undefined') ? _setupCfg.diff : null,
      // 'actuel' si _engineMode est vide (null/undefined), meme convention que
      // _setupCfg.engine -- necessaire pour les stats moteur personnelles.
      engine: (mode === 'ai') ? ((typeof _engineMode !== 'undefined' && _engineMode) ? _engineMode : 'actuel') : null,
      blackName: (typeof gcBlackName !== 'undefined') ? gcBlackName : '',
      whiteName: (typeof gcWhiteName !== 'undefined') ? gcWhiteName : '',
      code: code
    };
    let list = [];
    try { list = JSON.parse(localStorage.getItem(GAME_HISTORY_KEY) || '[]'); } catch(e){ list = []; }
    list.unshift(entry); // la plus recente en tete
    if (list.length > HIST_MAX) list = list.slice(0, HIST_MAX);
    localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(list));
  } catch(e) { /* stockage indisponible ou plein -- ne bloque jamais la fin de partie pour autant */ }
}

function getGameHistory(){
  try { return JSON.parse(localStorage.getItem(GAME_HISTORY_KEY) || '[]'); } catch(e) { return []; }
}

function deleteGameHistoryEntry(id){
  try {
    const list = getGameHistory().filter(function(e){ return e.id !== id; });
    localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(list));
  } catch(e){}
}

function clearGameHistory(){
  try { localStorage.removeItem(GAME_HISTORY_KEY); } catch(e){}
}

/* Filtre en memoire -- pas besoin d'index, HIST_MAX=200 parties suffit
   largement pour un filtrage lineaire instantane. */
function filterGameHistory(opts){
  opts = opts || {};
  return getGameHistory().filter(function(e){
    if (opts.variant && opts.variant !== 'all' && e.variant !== opts.variant) return false;
    if (opts.mode && opts.mode !== 'all' && e.mode !== opts.mode) return false;
    if (opts.result && opts.result !== 'all') {
      const isAI = e.mode === 'ai';
      const won = isAI && e.winner === e.humanColor;
      const lost = isAI && e.winner && e.winner !== e.humanColor;
      const draw = !e.winner;
      if (opts.result === 'victoire' && !won) return false;
      if (opts.result === 'defaite' && !lost) return false;
      if (opts.result === 'nulle' && !draw) return false;
    }
    if (opts.search) {
      const q = opts.search.toLowerCase();
      const hay = [e.variant, e.blackName, e.whiteName, e.date].join(' ').toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  });
}

function triggerWin(winner, reason) {
  // ── Garde anti-triche : refuse une victoire incohérente ──
  if (!reason && !winIntegrityOK(winner)) {
    if (!boardIntegrityOK()) {
      showToast('⚠️ Incohérence détectée — partie réinitialisée');
      resetGame();
      return;
    }
    // sinon on ignore simplement le déclenchement suspect
    return;
  }
  gameOver = true;
  if (typeof disarmInactivityCancel === 'function') disarmInactivityCancel();
  try{ localStorage.setItem('abaGamesFinished', String((parseInt(localStorage.getItem('abaGamesFinished')||'0',10)||0)+1)); }catch(e){}
  _emitAbaEvent('gameOver', { winner: winner, reason: reason || null,
    capturedByBlack: capturedByBlack, capturedByWhite: capturedByWhite, moveCount: moveCount });
  if (typeof updateHeroStats==='function') updateHeroStats();
  if (typeof _tourneyMatch!=='undefined' && _tourneyMatch && typeof tourneyMatchEnd==='function') { tourneyMatchEnd(winner, reason); }
  clearInterval(timerInterval);
  stopGameTimer();      // arrête le chronomètre de partie
  _recordGameHistory(winner, reason);   // archive AVANT d'effacer la sauvegarde de reprise
  clearSavedGame();     // partie terminée = efface la sauvegarde
  soundWin();  // 🔊 fanfare de victoire
  const overlay = document.getElementById('win-overlay');
  const title = document.getElementById('win-title');
  const sub = document.getElementById('win-sub');
  if (typeof kidsMode !== 'undefined' && kidsMode) {
    // Mode Enfant : jamais de vocabulaire "défaite" — on valide toujours
    // l'effort, on invite à rejouer, peu importe le résultat.
    if (winner === 'black') {
      title.textContent = 'Bravo, tu as gagné ! 🎉';
      sub.textContent = 'Belle partie, bien joué !';
    } else {
      title.textContent = 'Belle partie ! 💪';
      sub.textContent = 'Cette fois c\'est l\'autre camp qui gagne — à toi de rejouer !';
    }
  } else if (winner === 'black') {
    title.textContent = 'Victoire !';
    sub.textContent = `Vous avez éjecté 6 billes adverses !`;
  } else {
    title.textContent = 'Défaite…';
    sub.textContent = 'L\'adversaire a éjecté 6 de vos billes.';
  }
  overlay.classList.add('show');
  if (typeof renderStyleCard === 'function') renderStyleCard();   // carte d'analyse de style
  if (typeof renderHeatmapCard === 'function') renderHeatmapCard();   // carte de chaleur de la partie
  // ── Hook engagement : XP, streak, ELO, badges ──
  sanitizeProgress();
  // ── Taux de conversion : le joueur a-t-il mené puis gagné ? ──
  if ((progress.__hadLead || capturedByBlack > 0) && !(typeof moveCount !== 'undefined' && moveCount === 0)) {
    progress.leadGames = (progress.leadGames||0) + 1;
    if (winner === 'black') progress.leadWins = (progress.leadWins||0) + 1;
    progress.__hadLead = false;
    saveProgress(progress);
  }
  if (typeof onGamePlayed === 'function' && !(typeof moveCount !== 'undefined' && moveCount === 0)) {
    onGamePlayed(winner === 'black');
  }
  // Partie sans aucun coup joué (abandon immédiat, annulation) : aucun ELO
  // retiré, aucune stat comptée — idée d'Olivier. On informe juste discrètement.
  if (typeof moveCount !== 'undefined' && moveCount === 0) {
    if (typeof showToast === 'function') showToast('Partie annulée — aucun coup joué, ELO inchangé');
  }
  // Badge Blanchissage : le joueur gagne 6-0 sans avoir perdu une seule bille
  if (winner === 'black' && capturedByWhite === 0 && typeof awardBadge === 'function') {
    awardBadge('shutout');
    showToast('🧺 Blanchissage ! Victoire 6-0 sans perdre une bille !');
  }
}



/* ═══════════════════════════════════════════
   ANALYSE DE STYLE (par partie, 100% hors-ligne)
   S'appuie sur evalFactors() + l'historique. Mesure UNIQUEMENT
   les coups de l'humain. Rendu : carte de fin + bulle live (voix
   d'un bot, contenu analytique). Aucune requête réseau.
═══════════════════════════════════════════ */
let styleGame = null;

function resetStyleGame(){
  styleGame = {
    moves:0, pushes:0, ejections:0, broadsides:0,
    dCenterSum:0, dCohesionSum:0, edgeSumAfter:0,
    centerPosMoves:0, cohesionPosMoves:0, edgeExposedMoves:0,
    qGood:0, qNeutral:0, qWarn:0
  };
}

// Enregistre un coup HUMAIN dans le profil de la partie en cours.
function recordStyleMove(before, after, capDelta, info){
  if(!styleGame) resetStyleGame();
  const g = styleGame;
  g.moves++;
  if(info.type==='push'){ g.pushes++; if(info.ejection) g.ejections++; }
  if(info.type==='broadside') g.broadsides++;
  const dC = after.center - before.center;
  const dCo = after.cohesion - before.cohesion;
  const dE = after.edge - before.edge;
  g.dCenterSum += dC; g.dCohesionSum += dCo; g.edgeSumAfter += after.edge;
  if(dC>=0) g.centerPosMoves++;
  if(dCo>=0) g.cohesionPosMoves++;
  if(dE>=1 && after.edge>=3) g.edgeExposedMoves++;
  // Qualité du coup : même logique que le coach/conseiller (sans relancer de recherche profonde)
  let q='neutral';
  if(capDelta>0 || dC>=3 || dCo>=3) q='good';
  else if((dE>=1 && after.edge>=3) || dC<=-3 || dCo<=-3) q='warn';
  if(q==='good') g.qGood++; else if(q==='warn') g.qWarn++; else g.qNeutral++;
  // Bulle d'analyse live (ton analytique), tous les 5 coups, jamais sur le coup gagnant
  if(capturedByBlack<6 && capturedByWhite<6 && g.moves%5===0) showStyleLiveBubble(g);
}

function clamp01(x){ return Math.max(0, Math.min(100, Math.round(x))); }

// Profil chiffré (0-100) + étiquette descriptive (purement analytique).
function computeStyleProfile(g){
  const m = Math.max(1, g.moves);
  const aggression = clamp01(100*(g.pushes + g.ejections*0.5)/m);
  const centrality = clamp01(100*g.centerPosMoves/m);
  const cohesion   = clamp01(100*g.cohesionPosMoves/m);
  const edgeRisk   = clamp01(100*g.edgeExposedMoves/m);
  const precision  = clamp01(100*(g.qGood + g.qNeutral*0.5)/m);
  let label;
  if(g.moves < 4) label = 'Profil indicatif (partie courte)';
  else {
    const aggressive = aggression>=35, central = centrality>=60;
    const cohesive = cohesion>=60, risky = edgeRisk>=30;
    if(aggressive && central) label = 'Attaquant centralisé';
    else if(aggressive && risky) label = 'Offensif et risqué';
    else if(aggressive) label = 'Joueur offensif';
    else if(central && cohesive) label = 'Positionnel — contrôle du centre';
    else if(cohesive) label = 'Défensif — jeu de cohésion';
    else if(risky) label = 'Téméraire — billes exposées';
    else label = 'Style équilibré';
  }
  return { aggression, centrality, cohesion, edgeRisk, precision, label, moves:g.moves };
}

// Le bot porteur de l'analyse : le conseiller actif, sinon le Bot Noir.
function styleBotColor(){
  const adv = (typeof advisorBotColor==='function') ? advisorBotColor() : null;
  return adv || 'black';
}

// Bulle live (voix d'un bot, contenu analytique chiffré).
function showStyleLiveBubble(g){
  if(typeof showBotBubble!=='function') return;
  const p = computeStyleProfile(g);
  const variants = [
    'Sur ' + g.moves + ' coups : centralité ' + p.centrality + '%, cohésion ' + p.cohesion + '%.',
    (g.edgeExposedMoves>0
      ? 'Billes exposées au bord ' + g.edgeExposedMoves + '× — indice de risque ' + p.edgeRisk + '%.'
      : 'Aucune bille exposée au bord pour l\'instant — risque ' + p.edgeRisk + '%.'),
    'Agressivité ' + p.aggression + '% (' + g.pushes + ' poussées, ' + g.ejections + ' éjections) · précision ' + p.precision + '%.'
  ];
  const idx = ((Math.floor(g.moves/5) - 1) % variants.length + variants.length) % variants.length;
  showBotBubble(styleBotColor(), variants[idx]);
}

// Une barre de métrique pour la carte de fin.
function styleBar(name, val, color){
  return '<div style="margin:6px 0">'
    + '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:3px">'
    + '<span>' + name + '</span><span style="color:var(--text);font-weight:600">' + val + '%</span></div>'
    + '<div style="height:7px;border-radius:4px;background:var(--surface2);overflow:hidden">'
    + '<div style="height:100%;width:' + val + '%;background:' + color + ';border-radius:4px"></div></div></div>';
}

// Remplit la carte d'analyse dans l'overlay de fin de partie.
/* ── Heatmap de la partie ──────────────────────────────────────────────
   Compte, pour chaque case du plateau, combien de fois une bille du joueur
   (noir) ou de l'adversaire (blanc) l'a occupée AU DÉPART d'un coup, sur
   toute la partie. Rend un plateau SVG en losange où l'intensité de couleur
   traduit la fréquence : là où ça a le plus / le moins joué. 100% local,
   reconstruit à partir de boardSnapshots (aucune donnée supplémentaire à
   stocker). Idée d'Olivier (fin de partie + stats). */
function computeGameHeatmap(snapshots, forColor) {
  // forColor : 'black' (le joueur) ou 'white' (l'adversaire)
  // Chaque snapshot stocke color = la couleur qui a joué CE coup, et
  // moveInfo.cells = les cases occupées au départ du coup.
  const counts = {};   // "r,c" -> nombre d'occupations
  let maxCount = 0;
  if (!snapshots || !snapshots.length) return { counts, maxCount };
  for (const snap of snapshots) {
    if (!snap || snap.color !== forColor) continue;
    const mi = snap.moveInfo;
    if (!mi || !mi.cells) continue;
    for (const c of mi.cells) {
      const k = c.r + ',' + c.c;
      counts[k] = (counts[k] || 0) + 1;
      if (counts[k] > maxCount) maxCount = counts[k];
    }
  }
  return { counts, maxCount };
}

function buildGameHeatmapSVG(snapshots, forColor, size) {
  size = size || 260;
  const { counts, maxCount } = computeGameHeatmap(snapshots, forColor);
  // Géométrie losange : mêmes ROWS que le plateau réel, mais normalisée sur `size`
  const ROWS_LOCAL = (typeof ROWS !== 'undefined') ? ROWS : [5,6,7,8,9,8,7,6,5];
  const R = size / 22;                 // rayon d'une case
  const hSpacing = R * 2, vSpacing = R * 1.73;
  const cx = size / 2, cy = size / 2;
  const base = (forColor === 'black') ? [200,168,75] : [168,196,224];  // or / bleu
  let cells = '';
  for (let row = 0; row < ROWS_LOCAL.length; row++) {
    const rowLen = ROWS_LOCAL[row];
    for (let col = 0; col < rowLen; col++) {
      const x = cx + (col - (rowLen - 1) / 2) * hSpacing;
      const y = cy + (row - 4) * vSpacing;
      const k = row + ',' + col;
      const n = counts[k] || 0;
      const intensity = maxCount > 0 ? n / maxCount : 0;
      // Même échelle de fausses couleurs que la carte du profil, pour la cohérence
      const fill = (typeof heatColor === 'function')
        ? heatColor(n === 0 ? 0 : intensity)
        : ((typeof HEATMAP_EMPTY !== 'undefined') ? HEATMAP_EMPTY : '#0d0d14');
      /* La couleur seule ne suffisait pas : sur un ecran de telephone, deux
         paliers voisins se distinguent mal. Le RAYON porte donc la meme
         information — une case peu jouee est petite, une case chaude est
         pleine. Deux canaux valent mieux qu'un, et celui-ci reste lisible
         en niveaux de gris. */
      const rad = R * (n === 0 ? 0.62 : 0.72 + 0.28 * Math.pow(intensity, 0.6));
      cells += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + rad.toFixed(1) + '"'
        + ' fill="' + fill + '" stroke="rgba(255,255,255,0.10)" stroke-width="0.5"></circle>';
      if (n > 0 && maxCount >= 2) {
        /* Le compteur etait ecrit en sombre, ce qui allait tant qu'il ne
           s'affichait que sur les cases brulantes. Maintenant qu'il apparait
           des la premiere occupation, il doit rester lisible sur un fond
           sombre : on choisit l'encre selon la clarte reelle de la case. */
        const ink = _heatIsLight(fill) ? '#0d0f0e' : 'rgba(255,255,255,0.92)';
        cells += '<text x="' + x.toFixed(1) + '" y="' + (y+R*0.32).toFixed(1) + '" text-anchor="middle" font-size="'
          + (R*0.85).toFixed(1) + '" fill="' + ink + '" font-weight="700">' + n + '</text>';
      }
    }
  }
  return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="100%" style="max-width:' + size + 'px" xmlns="http://www.w3.org/2000/svg">' + cells + '</svg>';
}

/* Affiche la heatmap de fin de partie, avec bascule Vous / Adversaire.
   Reconstruite depuis boardSnapshots — aucune donnée supplémentaire stockée. */
let _heatmapColor = null;
function renderHeatmapCard(){
  const host = document.getElementById('heatmap-card');
  if(!host) return;
  if(typeof boardSnapshots === 'undefined' || !boardSnapshots.length){ host.innerHTML=''; return; }
  /* Les onglets suivent humanColor. « Vous » designait auparavant les noirs
     en dur : des que le joueur tenait les blancs, les deux cartes etaient
     inversees. En mode 2 joueurs, aucun camp n'est « l'adversaire ». */
  const hc = (typeof humanColor !== 'undefined') ? humanColor : 'black';
  const opp = (hc === 'black') ? 'white' : 'black';
  const localGame = (typeof gameMode !== 'undefined' && gameMode === 'local');
  if (_heatmapColor !== 'black' && _heatmapColor !== 'white') _heatmapColor = localGame ? 'black' : hc;
  const forColor = _heatmapColor;
  const { maxCount } = computeGameHeatmap(boardSnapshots, forColor);
  const svg = buildGameHeatmapSVG(boardSnapshots, forColor, 240);
  const label = localGame
    ? (forColor === 'black' ? 'Le joueur noir' : 'Le joueur blanc')
    : (forColor === hc ? 'Joueur 1' : 'Joueur 2');
  const tabBtn = (c, txt) =>
    '<button onclick="_heatmapColor=\'' + c + '\';renderHeatmapCard()" style="'
    + 'padding:5px 12px;font-size:12px;font-weight:600;border-radius:7px;cursor:pointer;border:1px solid var(--border);'
    + (c === forColor ? 'background:var(--gold);color:#0d0f0e' : 'background:none;color:var(--muted)') + '">' + txt + '</button>';
  host.innerHTML =
    '<div style="margin-top:14px;width:min(320px,90vw);text-align:center;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px">'
    + '<div style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">🔥 Carte de chaleur</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:10px">Où ' + label + ' a le plus joué durant la partie</div>'
    + '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">' + (localGame ? tabBtn('black','Noir') + tabBtn('white','Blanc') : tabBtn(hc,'Joueur 1') + tabBtn(opp,'Joueur 2')) + '</div>'
    + (maxCount > 0 ? svg : '<div style="font-size:12px;color:var(--muted);padding:20px">Pas encore assez de coups joués</div>')
    + (maxCount > 0 ? '<div style="font-size:11px;color:var(--muted);margin-top:8px">Plus c\'est vif, plus la case a été occupée (max : ' + maxCount + '×)</div>' : '')
    + '</div>';
}

function renderStyleCard(){
  const host = document.getElementById('style-card');
  if(!host) return;
  if(!styleGame || styleGame.moves===0){ host.innerHTML=''; return; }
  const p = computeStyleProfile(styleGame);
  const which = styleBotColor();
  const isBlack = (which==='black');
  const svg = isBlack ? (typeof BOT_SVG_BLACK!=='undefined'?BOT_SVG_BLACK:'') : (typeof BOT_SVG_WHITE!=='undefined'?BOT_SVG_WHITE:'');
  const headDisc = isBlack ? '#1a1a20' : '#e8e8ee';
  const accent = isBlack ? '#c8a84b' : '#a8c4e0';
  host.innerHTML =
    '<div style="margin-top:18px;width:min(420px,90vw);text-align:left;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
    + '<div style="width:42px;height:42px;flex-shrink:0;border-radius:50%;background:' + headDisc + ';display:flex;align-items:center;justify-content:center;padding:3px;box-sizing:border-box">' + svg + '</div>'
    + '<div><div style="font-size:11px;color:' + accent + ';font-weight:700;letter-spacing:0.5px">ANALYSE DE TA PARTIE</div>'
    + '<div style="font-size:16px;font-weight:700;color:var(--text)">' + p.label + '</div></div></div>'
    + styleBar('Centralité', p.centrality, '#c8a84b')
    + styleBar('Cohésion', p.cohesion, '#6fae6f')
    + styleBar('Agressivité', p.aggression, '#d9774a')
    + styleBar('Risque au bord', p.edgeRisk, '#c0556a')
    + styleBar('Précision', p.precision, '#7eccd8')
    + '<div style="font-size:10px;color:var(--muted);margin-top:10px;line-height:1.4">Mesuré sur ' + p.moves + ' de tes coups. Précision = part de tes coups jugés bons par le moteur (centre / cohésion / éjection).</div>'
    + '</div>';
}


/* ─── NOTATION ABA-PRO ─────────────────────────────
   Format: a1b2 (inline) ou c2c3d3 (broadside)
   Source: ABA-PRO.HLP — "Every location on the board is
   denoted by [a-i][1-9]. A move string has the form a1b2."
   Lettres = rangées horizontales (a=bas, i=haut)
   Chiffres = colonnes diagonales
─────────────────────────────────────────────────── */
const ABAPRO_ROWS = ['a','b','c','d','e','f','g','h','i'];

function coordToABAPRO(r, c) {
  // Notation officielle Abalone : lettres A-I (rangées, A en bas, I en haut),
  // chiffres 1-9 (diagonales nord-ouest/sud-est, alignées en bas-droite).
  // Interne : r=0 = haut (rangée I), r=8 = bas (rangée A).
  const letter = ABAPRO_ROWS[8 - r];
  // Les rangées au-dessus du milieu (r<4) sont décalées sur les diagonales :
  // leur première case ne commence pas à 1 mais à (1 + décalage).
  const offset = r < 4 ? (4 - r) : 0;
  const num = c + 1 + offset;
  return letter + num;
}

// Notation Aba-Pro d'un coup (conforme au standard officiel)
// sel = billes sélectionnées [{r,c}], dir = {q,r}, type = 'move'|'push'|'broadside'

// ── INVERSE de coordToABAPRO : "e5" → {r,c} ──
function abaproToRc(cell) {
  if (!cell || cell.length < 2) return null;
  const letter = cell[0].toLowerCase();
  const num = parseInt(cell.slice(1), 10);
  if (isNaN(num)) return null;
  const idx = ABAPRO_ROWS.indexOf(letter);   // position de la lettre dans a..i
  if (idx < 0) return null;
  const r = 8 - idx;                          // r interne (r=0 haut)
  const offset = r < 4 ? (4 - r) : 0;
  const c = num - 1 - offset;
  if (r < 0 || r > 8 || c < 0 || c >= ROWS[r]) return null;
  return { r: r, c: c };
}

/* ═══════════════════════════════════════════
   LECTEUR DE FITTINGS — retiré.
   Les séquences de "fittings" de fightclub99 (et les parties externes type
   PlayStrategy) ne sont pas rejouables directement : le repère de coordonnées
   et l'orientation du plateau de ce jeu diffèrent du standard Aba-Pro/PlayStrategy,
   et les fittings eux-mêmes sont des repositionnements coopératifs (pas des coups
   légaux). L'import de parties externes nécessiterait de recaler tout le système
   de coordonnées sur le standard officiel, ce qui n'est pas envisagé pour l'instant.
   La notation Aba-Pro/Nacre interne du jeu, elle, fonctionne parfaitement.
═══════════════════════════════════════════ */


// Notation NACRE : pour les coups latéraux, on note la 1re bille de la rangée
// + l'arrivée de la DERNIÈRE bille (4 caractères au lieu de 6). Pour les coups en
// ligne, identique à Aba-Pro. C'est le système utilisé par PlayStrategy.
/* Distance hexagonale en coordonnees axiales. */
function _hexDist(a, b) {
  if (!a || !b) return -1;
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

/* Extremites NOMMEES d'un coup : origine d'un bout du groupe, arrivee de
   l'autre bout. C'est la paire que le Nacre ecrit, et ce sont aussi les deux
   points de la fleche du dernier coup — Saab l'a confirme en constatant que
   la fleche c2d4 etait juste alors que la notation ecrivait c3d3.
   Une seule source pour les deux : tant qu'elles etaient calculees
   separement, l'une pouvait deriver sans que l'autre bouge. */
function moveEndpointCells(cells, dir) {
  if (!cells || !cells.length || !dir) return null;
  if (cells.length === 1) {
    const ax = rcToAxial(cells[0].r, cells[0].c);
    const dest = axialToRc(ax.q + dir.q, ax.r + dir.r);
    return dest ? { from: cells[0], to: dest } : null;
  }
  const ends = _nacreGroupEnds(cells);
  if (!ends) return null;
  const cand = [ends.a, ends.b].map(function(from){
    const other = (from === ends.a) ? ends.b : ends.a;
    const ax = rcToAxial(other.r, other.c);
    const dest = axialToRc(ax.q + dir.q, ax.r + dir.r);
    if (!dest) return null;
    return { from: from, to: dest, d: _hexDist(rcToAxial(from.r, from.c), rcToAxial(dest.r, dest.c)) };
  }).filter(Boolean);
  if (!cand.length) return null;
  cand.sort(function(x, y){ return y.d - x.d; });
  return cand[0];
}

/* Les deux extremites d'un groupe aligne (la bille du milieu, s'il y en a
   une, ne sert jamais a la notation). */
function _nacreGroupEnds(sel) {
  if (!sel || sel.length < 2) return null;
  let best = null;
  for (let i = 0; i < sel.length; i++) {
    for (let j = i + 1; j < sel.length; j++) {
      const d = _hexDist(rcToAxial(sel[i].r, sel[i].c), rcToAxial(sel[j].r, sel[j].c));
      if (!best || d > best.d) best = { a: sel[i], b: sel[j], d: d };
    }
  }
  return best;
}

function moveToNACRE(sel, dir, type) {
  if (!sel || !sel.length || !dir) return '?';
  if (type === 'broadside') {
    /* Correction du 24/07/2026, signalee par Saab sur la v1.11.
       La regle appliquee ici etait l'inverse de la bonne : elle ecrivait
       fin_groupe + destination_debut, ce qui donne DEUX CASES ADJACENTES.
       Sur son exemple, le groupe [c2,c3] produisait « c3d3 » au lieu de
       « c2d4 ». Le Nacre note l'origine d'une extremite et l'arrivee de
       l'AUTRE extremite : les deux coordonnees ecrites sont donc les plus
       eloignees possibles, jamais voisines. Sa note sur la v1.7.2 le
       confirme independamment — il y ecrit que le coup « a1b3 » provient
       de billes en a1,a2.

       Le commentaire precedent affirmait la regle prouvee contre huit
       coups lateraux du §11 de son manuel. Elle ne l'etait pas : l'invariant
       de distance maximale ci-dessous est verifie par test sur tous les
       coups lateraux legaux de centaines de positions, ecriture ET relecture.

       On ne trie plus alphabetiquement — un ordre alphabetique n'a aucun
       rapport avec la geometrie du plateau et ne garantit pas la paire la
       plus eloignee. On construit les deux paires candidates et on garde
       celle dont les extremites sont le plus distantes. */
    const ep = moveEndpointCells(sel, dir);
    if (!ep) return '?';
    return coordToABAPRO(ep.from.r, ep.from.c) + coordToABAPRO(ep.to.r, ep.to.c);
  } else {
    // Coup en ligne : queue AVANT le coup + destination de la TÊTE après le
    // coup — distance = taille du groupe, jamais figée à 1 case contrairement
    // à Aba-Pro. Formule prouvée le 19/07/2026 contre les 5 coups d'une
    // vraie solution de puzzle KAA (Pzl_M_0021) rejoués par le vrai moteur —
    // voir _advResolveNacreToken, qui fait exactement l'opération inverse.
    const ax = sel.map(function(s){ return rcToAxial(s.r,s.c); });
    const sorted = ax.slice().sort(function(a,b){ return (a.q*dir.q+a.r*dir.r)-(b.q*dir.q+b.r*dir.r); });
    const tail = sorted[0];
    const head = sorted[sorted.length-1];
    const tailRc = axialToRc(tail.q, tail.r);
    const headDest = axialToRc(head.q + dir.q, head.r + dir.r);
    const from = tailRc ? coordToABAPRO(tailRc.r, tailRc.c) : '';
    const to = headDest ? coordToABAPRO(headDest.r, headDest.c) : '';
    return from + to;  // ex: d5d7 (groupe de 2 : [d5,d6] avant → [d6,d7] après)
  }
}

// Construit le libellé d'un coup selon les systèmes de notation activés (réglages).
// Affiche Aba-Pro et/ou Nacre selon les préférences ; si les deux et qu'ils diffèrent,
// montre les deux séparés par " · ".
function moveLabel(sel, dir, type, ejection) {
  const showAba = (typeof notationAbaPro === 'undefined') ? true : notationAbaPro;
  const showNacre = (typeof notationNacre === 'undefined') ? false : notationNacre;
  const aba = moveToABAPRO(sel, dir, type);
  const nacre = moveToNACRE(sel, dir, type);
  const suffix = ejection ? ' ✕' : '';
  let core;
  if (showAba && showNacre) {
    core = (aba === nacre) ? aba : (aba + ' · ' + nacre);
  } else if (showNacre) {
    core = nacre;
  } else {
    core = aba;  // Aba-Pro par défaut si rien n'est coché
  }
  return core + suffix;
}

function moveToABAPRO(sel, dir, type) {
  if (!sel || !sel.length || !dir) return '?';
  if (type === 'broadside') {
    // Coup en flèche : 2 extrémités de la rangée + position finale de la première bille
    // (notation en ordre alphanumérique, ex: e6e8f6)
    const coords = sel.map(function(s){ return { rc:s, notation: coordToABAPRO(s.r,s.c) }; });
    coords.sort(function(a,b){ return a.notation < b.notation ? -1 : 1; });
    const first = coords[0].rc;
    const last = coords[coords.length-1].rc;
    const firstAx = rcToAxial(first.r, first.c);
    const firstDest = axialToRc(firstAx.q + dir.q, firstAx.r + dir.r);
    const fromA = coordToABAPRO(first.r, first.c);
    const fromB = coordToABAPRO(last.r, last.c);
    const toA = firstDest ? coordToABAPRO(firstDest.r, firstDest.c) : '';
    return fromA + fromB + toA;  // ex: e6e8f6
  } else {
    /* Coup en ligne : depart et arrivee de la bille de QUEUE (ex: e5e6).
       L'Aba-Pro decrit le deplacement de la bille arriere du groupe, qui se
       deplace toujours d'une seule case — c'est ce qui distingue cette
       notation du Nacre, lequel note la queue puis la DESTINATION DE LA TETE
       (donc une distance egale a la taille du groupe).
       Le code utilisait ici la bille de tete pour les deux extremites : tous
       les coups en ligne de plus d'une bille etaient donc faux. Verifie
       contre les sequences de reference de Saab (21/07/2026) : pour un groupe
       [a1,a2] avance vers a3, l'Aba-Pro correct est « a1a2 » et non « a2a3 ».
       Sur une bille seule, queue et tete se confondent : rien ne change. */
    const ax = sel.map(function(s){ return rcToAxial(s.r,s.c); });
    const sorted = ax.slice().sort(function(a,b){ return (a.q*dir.q+a.r*dir.r)-(b.q*dir.q+b.r*dir.r); });
    const tail = sorted[0];
    const tailRc = axialToRc(tail.q, tail.r);
    const tailDest = axialToRc(tail.q + dir.q, tail.r + dir.r);
    const from = tailRc ? coordToABAPRO(tailRc.r, tailRc.c) : '';
    const to = tailDest ? coordToABAPRO(tailDest.r, tailDest.c) : '';
    return from + to;  // ex: e5e6
  }
}

// Ancienne signature conservée pour compatibilité (non utilisée)
function formatMoveABAPRO(fromR, fromC, toR, toC, type) {
  const from = coordToABAPRO(fromR, fromC);
  const to   = coordToABAPRO(toR, toC);
  if (type === 'broadside') return from + '->' + to;
  return from + to;
}

function addMoveToHistory(move, color, moveInfo) {
  if (typeof disarmInactivityCancel === 'function') disarmInactivityCancel();  // un coup a été joué → plus d'annulation auto
  if (typeof _tClockTick==='function') _tClockTick();
  // Save snapshot for replay (avec les infos du coup pour recalculer la notation)
  boardSnapshots.push({
    board: JSON.parse(JSON.stringify(board)),
    capturedByBlack: capturedByBlack,
    capturedByWhite: capturedByWhite,
    moveCount: moveCount,
    label: move, color: color,
    moveInfo: moveInfo || null   // {cells, dir, type, ejection} pour re-notation
  });
  if (_bookNode) bookDescend(moveInfo);   // suit l'ouverture jouée
  const replayBtn = document.getElementById('replay-btn');
  if (replayBtn && boardSnapshots.length > 1) replayBtn.style.display = 'block';

  const list = document.getElementById('move-list');
  if (!list) return;
  appendMoveRow(list, moveInfo, move, color, boardSnapshots.length);
  scrollMoveListToEnd();
}

/* Defile l'historique jusqu'au dernier coup.
   #move-list n'a pas de barre de defilement : c'est son parent .move-history
   qui porte overflow-y:auto. list.scrollTop = list.scrollHeight n'avait donc
   aucun effet, et il fallait scroller a la main pour voir le score
   d'ejection affiche sur le dernier coup. Signale par Saab. */
function scrollMoveListToEnd() {
  const list = document.getElementById('move-list');
  if (!list) return;
  /* Strictement borne au panneau d'historique. La premiere version
     remontait le DOM jusqu'a trouver un ancetre defilable : quand
     .move-history n'en etait pas un (cas frequent en affichage etroit,
     ou le panneau s'etire au lieu de defiler), la boucle continuait
     jusqu'a un conteneur de page et faisait sauter tout l'ecran apres
     chaque coup. Le repli scrollIntoView avait le meme defaut : il
     deplace aussi la fenetre. On ne touche donc qu'au panneau, et
     seulement s'il defile vraiment. */
  const box = list.closest('.move-history');
  if (!box) return;
  const st = window.getComputedStyle(box).overflowY;
  if (st !== 'auto' && st !== 'scroll') return;
  if (box.scrollHeight <= box.clientHeight) return;
  box.scrollTop = box.scrollHeight;
}

// En-tête de la liste (colonnes Aba-Pro / Nacre)
const MOVE_LIST_HEADER = '<div class="move-head"><span></span><span></span><span>Aba-Pro</span><span>Nacre</span></div>';

// Ajoute une ligne de coup : numéro · pastille couleur · Aba-Pro (gauche) · Nacre (droite)
function appendMoveRow(list, moveInfo, fallbackLabel, color, plyNum) {
  const cur = list.querySelector('.move-item.current');
  if (cur) cur.classList.remove('current');
  let aba, nac, ejx = '';
  if (moveInfo && moveInfo.cells && moveInfo.dir) {
    aba = moveToABAPRO(moveInfo.cells, moveInfo.dir, moveInfo.type);
    nac = moveToNACRE(moveInfo.cells, moveInfo.dir, moveInfo.type);
    // Score traditionnel (captures par Noir-captures par Blanc), affiché
    // uniquement sur le coup qui vient d'éjecter — idée de Saab, en
    // s'appuyant sur les compteurs déjà stockés dans le snapshot correspondant
    // (fiable aussi bien en direct qu'au réaffichage de l'historique).
    if (moveInfo.ejection) {
      const snap = (typeof boardSnapshots !== 'undefined') ? boardSnapshots[plyNum - 1] : null;
      const cb = snap ? snap.capturedByBlack : (typeof capturedByBlack !== 'undefined' ? capturedByBlack : 0);
      const cw = snap ? snap.capturedByWhite : (typeof capturedByWhite !== 'undefined' ? capturedByWhite : 0);
      ejx = ' (' + cb + '-' + cw + ')';
    }
  } else { aba = nac = fallbackLabel || ''; }
  const dot = (color === 'black') ? '#1a1a20' : '#e8e8ee';
  const turnNum = Math.ceil(plyNum / 2);   // noir et blanc d'un même tour partagent le numéro (1,1,2,2,…)
  const row = document.createElement('div');
  row.className = 'move-item current';
  /* Ligne cliquable : affiche la position APRES ce coup sur le plateau
     (demande d'Olivier). Reutilise loadSnapshot(), deja utilise par la
     navigation replay -- aucun nouveau chemin d'affichage, donc aucun
     risque de divergence entre les deux facons de naviguer.
     plyNum est le rang du coup (1-based) alors que boardSnapshots est
     indexe a partir de 0 : d'ou le -1. */
  row.dataset.ply = plyNum;
  row.style.cursor = 'pointer';
  row.title = 'Afficher la position après ce coup';
  row.onclick = function(){ _gotoMoveFromHistory(plyNum - 1); };
  row.innerHTML = '<span class="move-num">' + turnNum + '</span>'
    + '<span class="move-dot" style="background:' + dot + '"></span>'
    + '<span class="move-aba">' + aba + ejx + '</span>'
    + '<span class="move-nacre">' + nac + ejx + '</span>';
  list.appendChild(row);
}

/* Saut a un coup depuis l'historique des coups (clic sur une ligne).
   Bascule en mode replay si necessaire -- sinon loadSnapshot() modifierait
   le plateau d'une partie EN COURS, ce qui serait une perte de donnees.
   Reutilise entierement loadSnapshot() et le mecanisme replay existants. */
function _gotoMoveFromHistory(idx){
  if (typeof boardSnapshots === 'undefined' || !boardSnapshots.length) return;
  idx = Math.max(-1, Math.min(boardSnapshots.length - 1, idx));
  if (typeof replayMode !== 'undefined' && !replayMode) {
    /* Relecture possible MEME en pleine partie (demande d'Olivier).
       L'etat reel est mis de cote AVANT de charger l'instantane, et
       restaure a la sortie du replay -- sans quoi la partie en cours
       serait perdue (bug preexistant sur toggleReplay, corrige en meme
       temps). Le bouton "Quitter replay" ramene a la position reelle. */
    if (typeof gameOver !== 'undefined' && !gameOver) {
      _stashLive();
      if (typeof showToast === 'function') showToast('📽 Relecture — « Quitter replay » pour revenir à ta partie');
      const btn = document.getElementById('replay-btn');
      if (btn) { btn.style.display = 'block'; btn.textContent = '■ Quitter replay'; }
    }
    replayMode = true;
  }
  replayCurrentIdx = idx;
  if (typeof loadSnapshot === 'function') loadSnapshot(idx);
  if (typeof _highlightMoveRow === 'function') _highlightMoveRow(idx);
}

/* Met en evidence la ligne correspondant au coup affiche. */
function _highlightMoveRow(idx){
  const list = document.getElementById('move-list');
  if (!list) return;
  list.querySelectorAll('.move-item').forEach(function(el){
    el.classList.toggle('current', Number(el.dataset.ply) === idx + 1);
  });
}

// Recalcule tous les libellés de l'historique selon les systèmes de notation actifs.
// Utilise les infos de coup stockées dans chaque snapshot.
function rebuildMoveListLabels() {
  const list = document.getElementById('move-list');
  if (!list || typeof boardSnapshots === 'undefined') return;
  list.innerHTML = MOVE_LIST_HEADER;
  boardSnapshots.forEach(function(snap, idx){
    const isLast = (idx === boardSnapshots.length - 1);
    appendMoveRow(list, snap.moveInfo, snap.label, snap.color, idx + 1);
    if (!isLast) {
      const cur = list.querySelector('.move-item.current');
      if (cur) cur.classList.remove('current');
    }
  });
  scrollMoveListToEnd();
}

// Auto-init board on canvas ready
/* DOMContentLoaded — géré dans la section principale ci-dessous */

