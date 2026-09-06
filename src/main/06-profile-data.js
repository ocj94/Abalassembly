/* ═══════════════════════════════════════════
   PROFILE DATA
═══════════════════════════════════════════ */
function renderProfile() {
  const u = currentUser;
  const guest = document.getElementById('profile-guest');
  const logged = document.getElementById('profile-logged');
  if (!u) {
    if (guest) { guest.style.display='flex'; }
    if (logged) logged.style.display='none';
    return;
  }
  if (guest) guest.style.display='none';
  if (logged) logged.style.display='block';
  if (typeof renderProfileProgression === 'function') renderProfileProgression();
  if (typeof renderPersonalRadar === 'function') renderPersonalRadar();
  if (typeof renderHeatmap === 'function') renderHeatmap();

  const set = (id,v) => { const el=document.getElementById(id); if(el) el.textContent=v; };

  // Avatar & identity
  const avatarDisp = document.getElementById('profile-avatar-display');
  const avatarLetter = document.getElementById('profile-avatar-letter');
  if (avatarDisp) avatarDisp.style.background = u.color||'#2d5a3d';
  if (avatarLetter) avatarLetter.textContent = (u.username||'?')[0].toUpperCase();

  const nameEl = document.getElementById('profile-name-display');
  const handleEl = document.getElementById('profile-handle-display');
  const roleTag = u.role==='writer'
    ? ' <span style="font-size:10px;padding:2px 8px;background:rgba(138,114,210,0.2);color:#b89ef0;border-radius:8px;font-weight:700">REDACTEUR</span>'
    : '';
  if (nameEl) nameEl.innerHTML = escapeHtml(u.username) + roleTag;
  if (handleEl) handleEl.textContent = '@'+(u.username||'').toLowerCase().replace(/ /g,'_')+' - Depuis '+(u.joinDate||'2024');

  set('profile-elo-display', u.elo||1200);
  set('profile-elo-sub', u.elo>=2000?'Grand Maitre':u.elo>=1600?'Maitre':u.elo>=1400?'Expert':'Joueur');

  const games=u.games||0, wins=u.wins||0;
  const wr = games>0 ? Math.round(wins/games*100) : 0;
  set('ps-games', games);
  set('ps-games-sub', games>0 ? '+'+Math.max(1,Math.round(games*0.05))+' ce mois' : 'Commencez !');
  set('ps-wr', games>0 ? wr+'%' : '-');
  set('ps-wr-sub', games>0 ? wins+' gagnees' : '-');
  set('ps-elo', u.elo||1200);
  set('ps-elo-sub', 'Max: '+(u.eloMax||u.elo||1200));
  set('ps-streak', u.streak||0);
  set('ps-rank', u.elo>=2000 ? '#<50' : '#'+Math.round(1000+(2000-(u.elo||1200))*3));
  set('ps-rank-sub', u.country==='FR' ? 'Top France' : 'Non classe');

  // Settings pre-fill
  const fieldMap = {username:'settings-username', email:'settings-email', country:'settings-country', bio:'settings-bio'};
  for (const [k,id] of Object.entries(fieldMap)) {
    const el=document.getElementById(id);
    if (el) el.value = u[k]||'';
  }
  const sp=document.getElementById('settings-avatar-preview');
  if (sp) { sp.style.background=u.color||'#2d5a3d'; sp.textContent=(u.username||'?')[0].toUpperCase(); }

  // Writer tab visibility
  const wTab=document.getElementById('stab-writer');
  if (wTab) wTab.style.display = u.role==='writer'?'block':'none';

  /* Historique des parties.
     Cette liste etait inventee de bout en bout : une dizaine d'adversaires
     fictifs, leur ELO, la variation de classement et « il y a 2h ». Elle
     s'affichait comme l'historique reel du joueur. Aucune partie n'etant
     conservee a ce jour, la seule reponse honnete est un etat vide qui
     annonce ce qui manque. Le stockage des parties (voir games/ et le
     format APGN) est ce qui remplira cette liste. */
  const history = [];
  const resLabel={win:'V',loss:'D',draw:'N'};
  const ghEl=document.getElementById('game-history');
  if (ghEl && !history.length) {
    ghEl.innerHTML = '<div style="padding:18px;text-align:center;color:var(--muted);font-size:13px;'
      + 'border:1px dashed var(--border);border-radius:10px">Aucune partie conservée pour l\'instant.'
      + '<br><span style="font-size:12px">Les parties jouées ne sont pas encore enregistrées.</span></div>';
  } else if (ghEl) ghEl.innerHTML = history.map(g=>`
    <div class="game-history-item">
      <div class="result-badge ${g.res}">${resLabel[g.res]}</div>
      <div class="game-opp">${g.opp} <span>(${g.elo} ELO)</span><br><span>${g.ago}</span></div>
      <div class="game-rating-change ${g.res==='loss'?'neg':'pos'}">${g.change}</div>
    </div>`).join('');

  // Achievements
  const baseAchs = [
    { icon:'T', name:'Premier sang',  desc:'1ere ejection',           locked:false },
    { icon:'S', name:'Sumito x3',     desc:'3 poussees en 1 partie',  locked:false },
    { icon:'F', name:'Serie de 10',   desc:'10 victoires consec.',    locked:(u.streak||0)<10 },
    { icon:'P', name:'Precision',     desc:'90% coups optimaux',      locked:true },
    { icon:'K', name:'Maitre',        desc:'Atteindre ELO 1500',      locked:(u.elo||1200)<1500 },
    { icon:'G', name:'Mondial',       desc:'Jouer 5 nationalites',    locked:false },
    { icon:'B', name:'Blitz King',    desc:'Gagner en < 5 min',       locked:true },
    { icon:'D', name:'Grand Maitre',  desc:'Atteindre ELO 2000',      locked:(u.elo||1200)<2000 },
  ];
  const writerAchs = [
    { icon:'P', name:'1er article',    desc:'Premier article publie',  locked:false },
    { icon:'E', name:'Encyclopediste', desc:'10 articles rediges',     locked:false },
    { icon:'F', name:'Fondateur',      desc:'Createur du blog 2013',   locked:false },
    { icon:'R', name:'Reference',      desc:'Source francophone n1',   locked:false },
    { icon:'T', name:'Theoricien',     desc:'Articles de theorie',     locked:false },
    { icon:'C', name:'Compositeur',    desc:'Problemes mensuels',      locked:false },
    { icon:'A', name:'Academy',        desc:'Abalone Academy',         locked:false },
    { icon:'M', name:'Musee',          desc:'Catalogue complet',       locked:false },
  ];
  const achs = u.role==='writer' ? writerAchs : baseAchs;
  const achEl=document.getElementById('achievements');
  if (achEl) achEl.innerHTML = achs.map(a=>`
    <div class="achievement ${a.locked?'locked':''}">
      <div class="ach-icon">${a.icon}</div>
      <div class="ach-name">${a.name}</div>
      <div class="ach-desc">${a.desc}</div>
    </div>`).join('');
}


