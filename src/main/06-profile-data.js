/* ═══════════════════════════════════════════
   PROFILE DATA
   Avant (v2.57), ce profil lisait le compte (u.games, u.wins, u.elo, u.streak) : des champs
   que rien ne mettait jamais a jour (0 partie, ELO 1200 pour toujours), plus un « rang
   mondial » calcule a partir de l'ELO (« #1600 », « Top France ») sans aucun classement
   derriere, et des succes debloques d'office (« Premier sang », « Mondial »...). Les chiffres
   viennent maintenant de la progression reellement enregistree sur cet appareil.
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
  const p = (typeof progress !== 'undefined' && progress) ? progress : {};

  // Avatar & identity
  const avatarDisp = document.getElementById('profile-avatar-display');
  const avatarLetter = document.getElementById('profile-avatar-letter');
  if (avatarDisp) avatarDisp.style.background = u.color||'#2d5a3d';
  if (avatarLetter) avatarLetter.textContent = (u.username||'?')[0].toUpperCase();

  const nameEl = document.getElementById('profile-name-display');
  const handleEl = document.getElementById('profile-handle-display');
  if (nameEl) nameEl.textContent = u.username || '';
  if (handleEl) handleEl.textContent = '@'+(u.username||'').toLowerCase().replace(/ /g,'_')
    + (u.joinDate ? _tr(' - Depuis ', ' - Since ') + u.joinDate : '')
    + _tr(' · profil local (cet appareil)', ' · local profile (this device)');

  const elo = p.elo || 1200;
  const eloMax = Math.max(elo, ...((p.eloHistory || []).map(function(e){ return e && e.elo || 0; })));
  set('profile-elo-display', elo);
  set('profile-elo-sub', elo>=2000?'Grand Maître':elo>=1600?'Maître':elo>=1400?'Expert':'Joueur');

  const games = p.gamesPlayed||0, wins = p.gamesWon||0, losses = p.gamesLost||0, draws = p.gamesDraw||0;
  const wr = games>0 ? Math.round(wins/games*100) : 0;
  set('ps-games', games);
  set('ps-games-sub', games>0 ? _tr(wins+' V · '+losses+' D · '+draws+' N', wins+' W · '+losses+' L · '+draws+' D') : _tr('Commencez !', 'Get started!'));
  set('ps-wr', games>0 ? wr+'%' : '-');
  set('ps-wr-sub', games>0 ? wins+_tr(' gagnée'+(wins>1?'s':''), ' won') : '-');
  set('ps-elo', elo);
  set('ps-elo-sub', 'Max : '+eloMax);
  const serie = (typeof serieActuelle === 'function') ? serieActuelle() : (p.streak||0);
  set('ps-streak', serie);
  set('ps-streak-sub', _tr('Record : ', 'Best: ')+(p.bestStreak||0)+_tr(' j', ' d'));
  set('ps-puzzles', p.puzzlesSolved||0);
  const defis = (typeof defiTrouves === 'function') ? defiTrouves() : 0;
  set('ps-puzzles-sub', defis ? _tr('+ '+defis+' défi'+(defis>1?'s':'')+' du jour', '+ '+defis+' daily puzzle'+(defis>1?'s':'')) : '-');

  // Settings pre-fill
  const fieldMap = {username:'settings-username', email:'settings-email', country:'settings-country', bio:'settings-bio'};
  for (const [k,id] of Object.entries(fieldMap)) {
    const el=document.getElementById(id);
    if (el) el.value = u[k]||'';
  }
  const sp=document.getElementById('settings-avatar-preview');
  if (sp) { sp.style.background=u.color||'#2d5a3d'; sp.textContent=(u.username||'?')[0].toUpperCase(); }

  renderProfileHistory();
  renderProfileEloCard();
  if (typeof renderProfilChiffres === 'function') renderProfilChiffres();   // v2.73
}

/* Les 10 dernieres parties, tirees de l'historique local (abaGameHistory). Le texte d'avant
   annoncait que les parties n'etaient pas encore enregistrees, alors qu'elles le sont
   (page Historique). Les parties seulement consultees (tournois importes) n'y figurent pas. */
function renderProfileHistory() {
  const ghEl = document.getElementById('game-history');
  if (!ghEl) return;
  const liste = (typeof getMesParties === 'function') ? getMesParties().filter(function(e){ return e.mode !== 'import'; }).slice(0, 10) : [];
  if (!liste.length) {
    ghEl.innerHTML = '<div style="padding:18px;text-align:center;color:var(--muted);font-size:13px;'
      + 'border:1px dashed var(--border);border-radius:10px">' + _tr('Aucune partie terminée pour l’instant.', 'No finished game yet.')
      + '<br><span style="font-size:12px">' + _tr('Vos parties s’enregistrent ici dès la fin de la première.', 'Your games are saved here as soon as the first one ends.') + '</span></div>';
    return;
  }
  const EN = currentLang() === 'EN';
  ghEl.innerHTML = liste.map(function(g){
    const deuxJoueurs = g.mode === 'local' && !g.blackName && !g.whiteName;
    let cls, lettre;
    if (!g.winner) { cls = 'draw'; lettre = EN ? 'D' : 'N'; }
    else if (deuxJoueurs) { cls = 'draw'; lettre = g.winner === 'black' ? '●' : '○'; }
    else if (g.winner === g.humanColor) { cls = 'win'; lettre = EN ? 'W' : 'V'; }
    else { cls = 'loss'; lettre = EN ? 'L' : 'D'; }
    let quand = '';
    try { quand = new Date(g.date).toLocaleDateString(EN ? 'en-GB' : 'fr-FR', { day:'numeric', month:'short', year:'numeric' }); } catch(e) {}
    const coups = g.moveCount ? ' · ' + g.moveCount + _tr(' coups', ' moves') : '';
    const raison = g.reason === 'resign' ? _tr('abandon', 'resigned') : g.reason === 'temps' ? _tr('au temps', 'on time') : '';
    const qui = (typeof _historyOpponentLabel === 'function') ? _historyOpponentLabel(g) : '';
    return '<div class="game-history-item">'
      + '<div class="result-badge ' + cls + '">' + lettre + '</div>'
      + '<div class="game-opp">' + escapeHtml(qui) + '<br><span>' + escapeHtml(quand + coups) + '</span></div>'
      + '<div class="game-rating-change" style="color:var(--muted)">' + escapeHtml(raison) + '</div>'
      + '</div>';
  }).join('');
}

/* « Progression ELO (30 jours) » : c'etait un dessin fixe (« +24 pts », « 1388 », « 1489 »,
   « 1 Avr ... 1 Mai »). Courbe et chiffres viennent maintenant de progress.eloHistory
   (un point par jour joue, voir onGamePlayed). */
function renderProfileEloCard() {
  const host = document.getElementById('profile-elo-card');
  if (!host) return;
  const diffEl = document.getElementById('profile-elo-diff');
  const p = (typeof progress !== 'undefined' && progress) ? progress : {};
  const auj = todayStr();
  const hist = (p.eloHistory || []).filter(function(e){ return e && e.date && typeof e.elo === 'number'; });
  const dans = hist.filter(function(e){ return daysBetween(e.date, auj) <= 30; });
  const avant = hist.filter(function(e){ return daysBetween(e.date, auj) > 30; }).pop();
  // point de depart : l'ELO tel qu'il etait au debut de la fenetre, s'il est connu
  const d0 = new Date(); d0.setDate(d0.getDate() - 30);
  const debut = d0.getFullYear()+'-'+String(d0.getMonth()+1).padStart(2,'0')+'-'+String(d0.getDate()).padStart(2,'0');
  const pts = (avant ? [{ date: debut, elo: avant.elo }] : []).concat(dans);
  const EN = currentLang() === 'EN';
  const jour = function(ds){ try { return new Date(ds + 'T12:00:00').toLocaleDateString(EN ? 'en-GB' : 'fr-FR', { day:'numeric', month:'short' }); } catch(e) { return ds; } };
  const ligne = function(lab, val, coul){
    return '<div style="display:flex;justify-content:space-between;margin-bottom:12px"><span style="font-size:13px;color:var(--muted)">' + lab + '</span>'
      + '<span style="font-family:\'DM Mono\',monospace;color:' + (coul || 'var(--text)') + '">' + val + '</span></div>';
  };
  if (pts.length < 2) {
    if (diffEl) diffEl.textContent = '';
    host.innerHTML = '<div style="padding:18px;text-align:center;color:var(--muted);font-size:13px;border:1px dashed var(--border);border-radius:10px">'
      + _tr('La courbe apparaît après deux journées de jeu.', 'The curve appears after two days of play.') + '</div>'
      + '<div style="margin-top:20px">' + ligne(_tr('ELO actuel', 'Current ELO'), p.elo || 1200, 'var(--gold)') + '</div>';
    return;
  }
  const x0 = pts[0].date;
  const etendue = Math.max(1, daysBetween(x0, auj));
  const vals = pts.map(function(e){ return e.elo; });
  const lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  const ech = Math.max(10, hi - lo);
  const xy = pts.map(function(e){
    const x = Math.round(daysBetween(x0, e.date) / etendue * 260);
    const y = Math.round(90 - (e.elo - lo) / ech * 80);
    return x + ',' + y;
  });
  const ligneSvg = 'M' + xy.join(' L');
  const dernier = xy[xy.length - 1].split(',')[0];
  const diff = vals[vals.length - 1] - vals[0];
  if (diffEl) {
    diffEl.textContent = (diff > 0 ? '+' : '') + diff + ' pts';
    diffEl.style.color = diff > 0 ? 'var(--accent-green-light)' : diff < 0 ? '#e05c4b' : 'var(--muted)';
  }
  host.innerHTML = '<div class="rating-chart"><svg viewBox="0 0 260 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">'
    + '<defs><linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#c8a84b" stop-opacity="0.3"/><stop offset="100%" stop-color="#c8a84b" stop-opacity="0"/></linearGradient></defs>'
    + '<path d="' + ligneSvg + '" fill="none" stroke="#c8a84b" stroke-width="2" stroke-linecap="round" vector-effect="non-scaling-stroke"/>'
    + '<path d="' + ligneSvg + ' L' + dernier + ',100 L' + xy[0].split(',')[0] + ',100 Z" fill="url(#chartGrad)"/>'
    + '</svg></div>'
    + '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-top:8px;font-family:\'DM Mono\',monospace">'
    + '<span>' + jour(x0) + '</span><span>' + _tr('Auj.', 'Today') + '</span></div>'
    + '<div style="margin-top:20px">'
    + ligne(_tr('ELO au ', 'ELO on ') + jour(pts[0].date), vals[0])
    + ligne(_tr('ELO maximum', 'Highest ELO'), hi, 'var(--gold)')
    + ligne(_tr('ELO actuel', 'Current ELO'), p.elo || vals[vals.length - 1])
    + '</div>';
}
