/* ═══════════════════════════════════════════
   STATS PAGE
═══════════════════════════════════════════ */
function renderStats() {
  // Statistiques par moteur : independantes de currentUser (sourcees
  // depuis l'historique de parties en localStorage, pas depuis un compte
  // en ligne) -- appelees AVANT la garde "if (!u) return" ci-dessous,
  // pour ne pas dependre d'un systeme utilisateur qui n'est pas actif
  // par defaut (backend dormant). Trouve en testant : le reste de la
  // page reste bien a blanc sans utilisateur, mais les stats moteur
  // personnelles n'ont aucune raison de l'etre.
  if (typeof renderEngineStats === 'function') renderEngineStats();
  if (typeof renderDecisionProfile === 'function') renderDecisionProfile();
  if (typeof renderActivityHeatmap === 'function') renderActivityHeatmap();
  if (typeof renderEjectionStats === 'function') renderEjectionStats();
  if (typeof renderColorStats === 'function') renderColorStats();
  const u = currentUser;
  if (!u) return;
  const el = function(id,v) { const e=document.getElementById(id); if(e) e.textContent=v; };
  el('stats-name', u.username||'Joueur');
  el('stats-handle', '@'+(u.username||'').toLowerCase().replace(/ /g,'_'));
  el('stats-elo', u.elo||1200);
  el('stats-elo-max', u.eloMax||u.elo||1200);
  el('sg-games', u.games||0);
  el('sg-wins', u.wins||0);
  el('sg-streak', u.streak||0);

  // Le reste vient de progress (compteurs reels : puzzles, XP, historique elo/xp).
  // Rien ci-dessous n'est invente : la ou aucune donnee reelle n'existe (classement,
  // temps de jeu — cote serveur, backend dormant), l'affichage reste "—" plutot
  // que de fabriquer un chiffre plausible. Voir defaultProgress() pour la liste
  // complete des champs reellement suivis.
  el('sg-puzzles', progress.puzzlesSolved||0);
  el('sg-xp', progress.xp||0);
  el('stat-streak-record', progress.bestStreak ? ('Record : '+progress.bestStreak) : '—');

  const had = (typeof getHADSummary === 'function') ? getHADSummary() : null;
  el('sg-had', had ? Math.round(had.avgLoss) : '—');
  el('stat-had-detail', had ? ('sur '+had.count+' coups') : 'pas assez de parties analysées');

  const winRate = (u.games>0) ? Math.round((u.wins||0)/u.games*100) : null;
  el('stat-winrate', winRate!==null ? (winRate+'%') : '—');

  const eh = progress.eloHistory||[];
  if (eh.length>=2) {
    const delta = (u.elo||1200) - eh[0].elo;
    el('stats-elo-delta', (delta>=0?'↑ +':'↓ ')+delta);
  } else {
    el('stats-elo-delta', '—');
  }
  if (eh.length) {
    let maxEntry = eh[0];
    eh.forEach(function(h){ if (h.elo > maxEntry.elo) maxEntry = h; });
    el('stats-elo-max-date', ((u.eloMax||0) <= maxEntry.elo) ? (maxEntry.date || '—') : '—');
  } else {
    el('stats-elo-max-date', '—');
  }

  const hist = progress.history||[];
  if (hist.length>=2) {
    const monthAgo = new Date(); monthAgo.setDate(monthAgo.getDate()-30);
    const monthAgoStr = monthAgo.getFullYear()+'-'+String(monthAgo.getMonth()+1).padStart(2,'0')+'-'+String(monthAgo.getDate()).padStart(2,'0');
    const past = hist.filter(function(h){ return h.date <= monthAgoStr; });
    const xpMonthAgo = past.length ? past[past.length-1].xp : hist[0].xp;
    const xpDelta = (progress.xp||0) - xpMonthAgo;
    el('stat-xp-delta', (xpDelta>=0?'↑ +':'↓ ')+xpDelta+' ce mois');
  } else {
    el('stat-xp-delta', '—');
  }

  const chartHost = document.getElementById('stats-elo-chart-host');
  if (chartHost && typeof sparkline === 'function') chartHost.innerHTML = sparkline(eh, 400, 100, '#c8a84b');

  const av = document.getElementById('stats-avatar');
  if (av) { av.textContent=(u.username||'?')[0].toUpperCase(); av.style.background=u.color||'#2d5a3d'; }
}

function setStatsPeriod(days, btn) {
  document.querySelectorAll('.period-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  showToast('📊 Période : ' + (days===0 ? 'Tout le temps' : days+' jours'));
}

/* ═══════════════════════════════════════════
   COMPARE PAGE
═══════════════════════════════════════════ */
/* Profils de DEMONSTRATION. Ces joueurs n'existent pas et leurs chiffres sont
   inventes : la page de comparaison le dit explicitement a l'ecran. Le compte
   du joueur, lui, affiche des zeros tant qu'aucune partie n'est conservee —
   il portait auparavant un ELO de 1766 et 247 parties, presentes comme des
   faits. */
const compareProfiles = {
  'SumitoPro':    { color:'#2a3a32', elo:2341, games:502, wins:412, streak:31, puzzles:1200 },
  'MarbleKing_FR':{ color:'#3a2a2a', elo:2289, games:478, wins:389, streak:18, puzzles:980 },
  'FightClub':    { color:'#4a1c5a', elo:1950, games:312, wins:198, streak:7,  puzzles:450 },
  'Gramgroum':    { color:'#5a3a1c', elo:1780, games:245, wins:155, streak:5,  puzzles:320 },
  /* Compte de demonstration : les compteurs sont a zero tant qu'aucune partie
     n'est conservee. Les valeurs precedentes — 1766 d'ELO, 247 parties, 133
     victoires — etaient inventees et affichees comme des faits. */
  'Olivier_CJ':   { color:'#2d5a3d', elo:null, games:0, wins:0, streak:0, puzzles:0 },
  'Vincent_F':    { color:'#1c3d5a', elo:2189, games:430, wins:340, streak:12, puzzles:750 },
};

function searchComparePlayer() {
  const val = document.getElementById('cmp-search').value.trim();
  const match = Object.entries(compareProfiles).find(function(e){ return e[0].toLowerCase().includes(val.toLowerCase()); });
  if (match) showCompareResult(match[0], match[1]);
}

function showCompareResult(name, profile) {
  const u = currentUser || { elo:null, games:0, wins:0, streak:0, puzzles:0 };
  const av2 = document.getElementById('cmp-avatar2');
  if (av2) { av2.textContent=name[0].toUpperCase(); av2.style.background=profile.color; av2.style.fontSize='24px'; }
  const n2 = document.getElementById('cmp-search');
  if (n2) n2.value = name;

  const rows = [
    { label:'ELO', v1:u.elo||1200, v2:profile.elo, fmt:function(v){return v;} },
    { label:'Parties', v1:u.games||0, v2:profile.games, fmt:function(v){return v;} },
    { label:'Victoires', v1:u.wins||0, v2:profile.wins, fmt:function(v){return v;} },
    { label:'Win %', v1:u.games>0?Math.round((u.wins/u.games)*100):0, v2:Math.round((profile.wins/profile.games)*100), fmt:function(v){return v+'%';} },
    { label:'Série active', v1:u.streak||0, v2:profile.streak, fmt:function(v){return v+' jours';} },
    { label:'Puzzles', v1:u.puzzles||89, v2:profile.puzzles, fmt:function(v){return v;} },
  ];

  const wrap = document.getElementById('compare-rows');
  if (!wrap) return;
  wrap.innerHTML = rows.map(function(r) {
    const w1 = r.v1 >= r.v2 ? 'winner' : '';
    const w2 = r.v2 >  r.v1 ? 'winner' : '';
    const max = Math.max(r.v1, r.v2, 1);
    const pct1 = Math.round(r.v1/max*100);
    const pct2 = Math.round(r.v2/max*100);
    return [
      '<div class="compare-row">',
      '<div style="text-align:right">',
      '<div class="compare-val left '+w1+'">'+r.fmt(r.v1)+'</div>',
      '<div class="compare-bar"><div class="compare-bar-fill" style="width:'+pct1+'%;background:'+(w1?'var(--gold)':'var(--muted)')+'"></div></div>',
      '</div>',
      '<div style="text-align:center"><div class="compare-label">'+r.label+'</div></div>',
      '<div>',
      '<div class="compare-val right '+w2+'">'+r.fmt(r.v2)+'</div>',
      '<div class="compare-bar"><div class="compare-bar-fill" style="width:'+pct2+'%;background:'+(w2?'var(--gold)':'var(--muted)')+'"></div></div>',
      '</div>',
      '</div>'
    ].join('');
  }).join('');
}

const GYM_ZONES = [
  { id: 'memory',      icon: '🧠', name: 'Mémoire',      zone: 'Hippocampe',      desc: 'Mémoriser une position brève puis la reconstituer.' },
  { id: 'acuity',      icon: '👁️', name: 'Acuité',       zone: 'Cortex visuel',   desc: 'Repérer rapidement une bille ou une menace précise.' },
  { id: 'reflex',      icon: '⚡', name: 'Réflexe',      zone: 'Vitesse de traitement', desc: 'Réagir à une menace sous contrainte de temps.' },
  { id: 'anticipation',icon: '🔮', name: 'Anticipation', zone: 'Préfrontal',      desc: 'Prévoir une position après plusieurs coups.' },
  { id: 'inhibition',  icon: '🛑', name: 'Inhibition',   zone: 'Contrôle',        desc: 'Résister au coup évident quand il est mauvais.' },
  { id: 'flexibility', icon: '🧩', name: 'Flexibilité',  zone: 'Shift cognitif',  desc: 'Changer de plan ou de camp à la demande.' },
  { id: 'spatial',     icon: '🌀', name: 'Spatial',      zone: 'Parietal',        desc: 'Se reperer dans les relations entre billes sur le plateau.' },
  { id: 'diagnostic',  icon: '🩺', name: 'Diagnostic',   zone: 'Frontal',         desc: 'Identifier ce qu\u2019un coup vient d\u2019abimer dans sa position.' },
  { id: 'certitude',   icon: '⚖️', name: 'Certitude',    zone: 'Métacognition',   desc: 'Distinguer un gain prouvé d\u2019une position juste séduisante.' },
  { id: 'repertoire',  icon: '📖', name: 'Répertoire',   zone: 'Temporal',        desc: 'Reconnaître ce que jouent les forts en ouverture, sur des vraies parties.' },
  { id: 'jugement',    icon: '🎚️', name: 'Jugement',     zone: 'Parietal',        desc: 'Comparer deux positions sur un critère précis.' },
  { id: 'mat',         icon: '🎯', name: 'Mat au bord',  zone: 'Reconnaissance de motif', desc: 'Trouver l\u2019éjection qui gagne immédiatement (attaque, pas défense).' }
];

function _loadGymProgress(){
  try { return JSON.parse(localStorage.getItem('abaGymCerveau') || '{}'); }
  catch(e){ return {}; }
}
function _saveGymProgress(data){
  try { localStorage.setItem('abaGymCerveau', JSON.stringify(data)); } catch(e){}
}

