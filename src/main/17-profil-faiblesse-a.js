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
const PUZZLES=