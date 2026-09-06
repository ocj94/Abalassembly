/* ═══════════════════════════════════════════
   DÉFIS HEBDOMADAIRES (objectifs + récompenses)
═══════════════════════════════════════════ */
function weekStr() {
  // identifiant ISO de la semaine, ex. "2026-W23"
  const d = new Date();
  const day = (d.getDay() + 6) % 7;           // lundi = 0
  d.setDate(d.getDate() - day + 3);            // jeudi de la semaine
  const firstThu = new Date(d.getFullYear(), 0, 4);
  const week = 1 + Math.round(((d - firstThu) / 86400000 - 3 + ((firstThu.getDay()+6)%7)) / 7);
  return d.getFullYear() + '-W' + String(week).padStart(2,'0');
}

const WEEKLY_CHALLENGES = [
  { id:'win5',     icon:'🏆', title:'Vainqueur de la semaine', desc:'Gagne 5 parties',        goal:5, metric:'wins',    reward:200 },
  { id:'play10',   icon:'🎮', title:'Joueur assidu',           desc:'Joue 10 parties',        goal:10, metric:'games',   reward:150 },
  { id:'puzzle7',  icon:'🧩', title:'Tacticien',               desc:'Résous 7 problèmes',     goal:7, metric:'puzzles',  reward:180 },
  { id:'streak5',  icon:'🔥', title:'Régularité',              desc:'Atteins une série de 5 jours', goal:5, metric:'streak', reward:160 },
];

function currentWeekly() {
  // sélection déterministe selon la semaine
  const wk = weekStr();
  let h = 0; for (let i=0;i<wk.length;i++) h = (h*31 + wk.charCodeAt(i)) % 100000;
  const ch = WEEKLY_CHALLENGES[h % WEEKLY_CHALLENGES.length];
  // réinitialise le suivi si nouvelle semaine
  if (!progress.weekly || progress.weekly.week !== wk) {
    progress.weekly = {
      week: wk,
      id: ch.id,
      startWins: progress.gamesWon || 0,
      startGames: progress.gamesPlayed || 0,
      startPuzzles: progress.puzzlesSolved || 0,
      claimed: false
    };
    saveProgress(progress);
  }
  return ch;
}

function weeklyProgressValue(ch) {
  const w = progress.weekly;
  if (!w) return 0;
  switch (ch.metric) {
    case 'wins':    return Math.max(0, (progress.gamesWon||0)    - w.startWins);
    case 'games':   return Math.max(0, (progress.gamesPlayed||0) - w.startGames);
    case 'puzzles': return Math.max(0, (progress.puzzlesSolved||0) - w.startPuzzles);
    case 'streak':  return progress.streak || 0;
    default: return 0;
  }
}

function checkWeeklyComplete() {
  const ch = currentWeekly();
  const val = weeklyProgressValue(ch);
  if (val >= ch.goal && progress.weekly && !progress.weekly.claimed) {
    progress.weekly.claimed = true;
    saveProgress(progress);
    addXp(ch.reward, 'Défi hebdomadaire : ' + ch.title);
    awardBadge && awardBadge('weekly_' + ch.id);
    setTimeout(function(){ toastEngage('🎁 Défi hebdo réussi ! +' + ch.reward + ' XP'); }, 700);
  }
}

function renderWeeklyCard() {
  const host = document.getElementById('weekly-card');
  if (!host) return;
  const ch = currentWeekly();
  const val = Math.min(weeklyProgressValue(ch), ch.goal);
  const pct = Math.round(val / ch.goal * 100);
  const done = progress.weekly && progress.weekly.claimed;
  host.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
      '<span style="font-size:24px">' + ch.icon + '</span>' +
      '<div><div style="font-size:14px;font-weight:700;color:var(--white)">' + ch.title + '</div>' +
      '<div style="font-size:12px;color:var(--muted)">' + ch.desc + '</div></div>' +
      (done ? '<span style="margin-left:auto;color:var(--gold);font-size:18px">✓</span>' : '') +
    '</div>' +
    '<div style="background:var(--surface2);border-radius:8px;height:8px;overflow:hidden;margin-bottom:6px">' +
      '<div style="height:100%;width:' + pct + '%;background:linear-gradient(to right,#d8b860,#c8a84b);transition:width .4s"></div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)">' +
      '<span>' + val + ' / ' + ch.goal + '</span>' +
      '<span>' + (done ? 'Récompense obtenue' : '+' + ch.reward + ' XP') + '</span>' +
    '</div>';
}

/* ═══════════════════════════════════════════
   DÉFI DU JOUR — PARTIE (distinct du puzzle du jour)
   Même principe que le défi hebdomadaire mais à échelle quotidienne, et
   centré sur les PARTIES (victoires, parties jouées, éjections) plutôt que
   sur un puzzle précis — le défi puzzle du jour (dailyChallenge) reste
   inchangé, celui-ci s'y ajoute sans le remplacer.
═══════════════════════════════════════════ */
const DAILY_GAME_CHALLENGES = [
  { id:'win1',    icon:'🏆', title:'Victoire du jour',  desc:'Gagne 1 partie aujourd\'hui',    goal:1, metric:'wins',      reward:40 },
  { id:'eject3',  icon:'🎯', title:'Chasseur du jour',  desc:'Éjecte 3 billes aujourd\'hui',   goal:3, metric:'ejections', reward:35 },
  { id:'play2',   icon:'🎮', title:'Assidu du jour',    desc:'Joue 2 parties aujourd\'hui',    goal:2, metric:'games',     reward:30 },
];

function currentDailyGame() {
  const day = todayStr();
  let h = 0; for (let i=0;i<day.length;i++) h = (h*31 + day.charCodeAt(i)) % 100000;
  const ch = DAILY_GAME_CHALLENGES[h % DAILY_GAME_CHALLENGES.length];
  if (!progress.dailyGame || progress.dailyGame.day !== day) {
    progress.dailyGame = {
      day: day,
      id: ch.id,
      startWins: progress.gamesWon || 0,
      startGames: progress.gamesPlayed || 0,
      startEjections: progress.totalEjections || 0,
      claimed: false
    };
    saveProgress(progress);
  }
  return ch;
}

function dailyGameProgressValue(ch) {
  const d = progress.dailyGame;
  if (!d) return 0;
  switch (ch.metric) {
    case 'wins':      return Math.max(0, (progress.gamesWon||0) - d.startWins);
    case 'games':     return Math.max(0, (progress.gamesPlayed||0) - d.startGames);
    case 'ejections': return Math.max(0, (progress.totalEjections||0) - d.startEjections);
    default: return 0;
  }
}

function checkDailyGameComplete() {
  const ch = currentDailyGame();
  const val = dailyGameProgressValue(ch);
  if (val >= ch.goal && progress.dailyGame && !progress.dailyGame.claimed) {
    progress.dailyGame.claimed = true;
    saveProgress(progress);
    addXp(ch.reward, 'Défi du jour : ' + ch.title);
    if (typeof awardBadge === 'function') awardBadge('dailygame_' + ch.id);
    setTimeout(function(){ toastEngage('🎁 Défi du jour réussi ! +' + ch.reward + ' XP'); }, 700);
  }
}

function renderDailyGameCard() {
  const host = document.getElementById('daily-game-card');
  if (!host) return;
  const ch = currentDailyGame();
  const val = Math.min(dailyGameProgressValue(ch), ch.goal);
  const pct = Math.round(val / ch.goal * 100);
  const done = progress.dailyGame && progress.dailyGame.claimed;
  host.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">' +
      '<span style="font-size:24px">' + ch.icon + '</span>' +
      '<div><div style="font-size:14px;font-weight:700;color:var(--white)">' + ch.title + '</div>' +
      '<div style="font-size:12px;color:var(--muted)">' + ch.desc + '</div></div>' +
      (done ? '<span style="margin-left:auto;color:var(--gold);font-size:18px">✓</span>' : '') +
    '</div>' +
    '<div style="background:var(--surface2);border-radius:8px;height:8px;overflow:hidden;margin-bottom:6px">' +
      '<div style="height:100%;width:' + pct + '%;background:linear-gradient(to right,#7ec8e3,#4fa8d8);transition:width .4s"></div>' +
    '</div>' +
    '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)">' +
      '<span>' + val + ' / ' + ch.goal + '</span>' +
      '<span>' + (done ? 'Récompense obtenue' : '+' + ch.reward + ' XP') + '</span>' +
    '</div>';
}

/* ─── Hooks appelés par le jeu ─── */
function onGamePlayed(result) {
  // result : true/'win' = victoire, false/'loss' = défaite, 'draw' = nul
  const res = (result === true) ? 'win' : (result === false) ? 'loss' : result;
  progress.gamesPlayed += 1;
  if (res === 'win') {
    progress.gamesWon += 1;
    progress.elo += 12 + Math.floor(Math.random()*8);
  } else if (res === 'draw') {
    progress.gamesDraw = (progress.gamesDraw || 0) + 1;
    // nul : variation d'ELO neutre
  } else {
    progress.gamesLost = (progress.gamesLost || 0) + 1;
    progress.elo = Math.max(100, progress.elo - (8 + Math.floor(Math.random()*6)));
  }
  const t = todayStr();
  const lastE = progress.eloHistory[progress.eloHistory.length-1];
  if (lastE && lastE.date === t) lastE.elo = progress.elo;
  else progress.eloHistory.push({ date:t, elo:progress.elo });
  if (progress.eloHistory.length > 60) progress.eloHistory.shift();
  saveProgress(progress);
  touchStreak();
  addXp(res === 'win' ? 30 : (res === 'draw' ? 15 : 10),
        res === 'win' ? 'Victoire !' : (res === 'draw' ? 'Match nul' : 'Partie jouée'));
  checkWeeklyComplete();
  checkDailyGameComplete();
}
function onPuzzleSolved() {
  progress.puzzlesSolved += 1;
  saveProgress(progress);
  touchStreak();
  addXp(20, 'Puzzle résolu');
  checkWeeklyComplete();
}

/* ═══════════════════════════════════════════
   PARRAINAGE — invite des amis, gagne des récompenses
═══════════════════════════════════════════ */
const REFERRAL_REWARD = 100;  // XP par parrainage réussi

function getReferralCode() {
  if (!progress.referralCode) {
    // génère un code court basé sur le hasard + temps
    const base = (Math.random().toString(36).slice(2,6) + Date.now().toString(36).slice(-3)).toUpperCase();
    progress.referralCode = 'ABA-' + base;
    saveProgress(progress);
  }
  return progress.referralCode;
}

function referralLink() {
  return SHARE_URL + '?ref=' + encodeURIComponent(getReferralCode());
}

// Au chargement : détecte un code de parrainage dans l'URL
function checkIncomingReferral() {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && !progress.referredBy && ref !== progress.referralCode) {
      progress.referredBy = ref;
      saveProgress(progress);
      // bonus de bienvenue pour le filleul
      addXp(50, 'Bienvenue ! Parrainé par un ami');
      // On mémorise localement le crédit du parrain (simulation sans backend)
      try {
        const pending = JSON.parse(localStorage.getItem('abalone_referral_credits') || '{}');
        pending[ref] = (pending[ref] || 0) + 1;
        localStorage.setItem('abalone_referral_credits', JSON.stringify(pending));
      } catch(e) {}
    }
    // Crédite le parrain de ses parrainages en attente (même appareil/démo)
    creditPendingReferrals();
  } catch(e) {}
}

function creditPendingReferrals() {
  try {
    const code = progress.referralCode;
    if (!code) return;
    const pending = JSON.parse(localStorage.getItem('abalone_referral_credits') || '{}');
    if (pending[code] && pending[code] > progress.referrals) {
      const gained = pending[code] - progress.referrals;
      progress.referrals = pending[code];
      saveProgress(progress);
      addXp(REFERRAL_REWARD * gained, gained + ' parrainage' + (gained>1?'s':'') + ' réussi' + (gained>1?'s':'') + ' !');
      if (progress.referrals >= 3 && typeof awardBadge === 'function') awardBadge('referral3');
    }
  } catch(e) {}
}

function openReferralModal() {
  const code = getReferralCode();
  const link = referralLink();
  let modal = document.getElementById('referral-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'referral-modal';
    modal.className = 'share-modal-overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML =
    '<div class="share-modal-box">' +
      '<div class="share-modal-title">🎁 Parrainez vos amis</div>' +
      '<div class="share-modal-text">Gagnez <strong style="color:var(--gold)">' + REFERRAL_REWARD + ' XP</strong> par ami qui rejoint Abalassembly avec votre lien. Votre filleul reçoit aussi un bonus de bienvenue !</div>' +
      '<div style="background:var(--surface2);border-radius:10px;padding:14px;margin-bottom:14px;text-align:center">' +
        '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Votre code</div>' +
        '<div style="font-family:\'DM Mono\',monospace;font-size:22px;font-weight:700;color:var(--gold);letter-spacing:2px">' + code + '</div>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-around;margin-bottom:16px">' +
        '<div style="text-align:center"><div style="font-size:24px;font-weight:800;color:var(--text)">' + (progress.referrals||0) + '</div><div style="font-size:11px;color:var(--muted)">parrainages</div></div>' +
        '<div style="text-align:center"><div style="font-size:24px;font-weight:800;color:var(--gold)">' + ((progress.referrals||0)*REFERRAL_REWARD) + '</div><div style="font-size:11px;color:var(--muted)">XP gagnés</div></div>' +
      '</div>' +
      '<button class="share-copy" onclick="copyReferralLink()">🔗 Copier mon lien d\'invitation</button>' +
      '<button class="share-copy" style="background:#5865f2;color:#fff" onclick="shareInvite()">📨 Partager</button>' +
      '<button class="share-close" onclick="closeReferralModal()">Fermer</button>' +
    '</div>';
  modal.classList.add('show');
}

function closeReferralModal() {
  const m = document.getElementById('referral-modal');
  if (m) m.classList.remove('show');
}

function copyReferralLink() {
  const link = referralLink();
  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(function(){ showToast('🔗 Lien de parrainage copié !'); });
  } else {
    showToast('Copiez : ' + link);
  }
}

/* ═══════════════════════════════════════════
   TOURNOI MENSUEL — inscription, prix, compte à rebours
═══════════════════════════════════════════ */
const MONTH_NAMES = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function currentTournamentId() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}

function isRegisteredForTournament() {
  try {
    return localStorage.getItem('abalone_tournament_' + currentTournamentId()) === '1';
  } catch(e) { return false; }
}

function toggleTournamentRegister() {
  const id = currentTournamentId();
  const key = 'abalone_tournament_' + id;
  try {
    if (isRegisteredForTournament()) {
      localStorage.removeItem(key);
      showToast('Inscription annulée.');
    } else {
      localStorage.setItem(key, '1');
      showToast('✅ Inscrit au tournoi mensuel ! Bonne chance 🏆');
      if (typeof addXp === 'function') addXp(20, 'Inscription au tournoi');
    }
  } catch(e) {}
  renderTournamentState();
}

/* ═══════════════════════════════════════════
   RÈGLES DE TOURNOI (définies par l'organisateur)
   Chaque règle : 'on' (autorisé) | 'off' (interdit) | 'random' (aléatoire)
═══════════════════════════════════════════ */
const TOURNAMENT_RULE_DEFS = [
  { key:'hints',  icon:'💡', label:'Aide visuelle',  desc:'Indiquer les coups possibles sur le plateau' },
  { key:'undo',   icon:'↩️', label:'Annulation',     desc:'Annuler le dernier coup (avec accord adverse)' },
  { key:'pause',  icon:'⏸️', label:'Pause du timer',  desc:'Demander une pause d\'1 minute' },
  { key:'coords', icon:'🔤', label:'Coordonnées',     desc:'Afficher les coordonnées des cases (notation A-I / 1-9)' },
];

function defaultTournamentRules() {
  return { hints:'off', undo:'off', pause:'on', coords:'on' };  // compétitif par défaut
}

function loadTournamentRules() {
  try {
    const raw = localStorage.getItem('abalone_tournament_rules');
    if (raw) return Object.assign(defaultTournamentRules(), JSON.parse(raw));
  } catch(e){}
  return defaultTournamentRules();
}

let tournamentRules = loadTournamentRules();

function renderTournamentRules() {
  const host = document.getElementById('tournament-rules');
  if (!host) return;
  const states = [
    { v:'on',     label:'Autorisé',  color:'var(--accent-green-light)' },
    { v:'off',    label:'Interdit',  color:'#e05c4b' },
    { v:'random', label:'Aléatoire', color:'var(--gold)' },
  ];
  host.innerHTML = TOURNAMENT_RULE_DEFS.map(function(rule){
    const cur = tournamentRules[rule.key];
    const btns = states.map(function(s){
      const active = cur === s.v;
      return '<button onclick="setTournamentRule(\''+rule.key+'\',\''+s.v+'\')" '
        + 'style="padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;'
        + 'border:1px solid '+(active?s.color:'var(--border)')+';'
        + 'background:'+(active?s.color:'transparent')+';'
        + 'color:'+(active?'#0d0f0e':'var(--muted)')+'">'+s.label+'</button>';
    }).join('');
    return '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid var(--border);flex-wrap:wrap">'
      + '<span style="font-size:20px">'+rule.icon+'</span>'
      + '<div style="flex:1;min-width:160px"><div style="font-size:14px;font-weight:600;color:var(--white)">'+rule.label+'</div>'
      + '<div style="font-size:12px;color:var(--muted)">'+rule.desc+'</div></div>'
      + '<div style="display:flex;gap:6px">'+btns+'</div>'
      + '</div>';
  }).join('');
}

function setTournamentRule(key, value) {
  tournamentRules[key] = value;
  renderTournamentRules();
}

function saveTournamentRules() {
  try { localStorage.setItem('abalone_tournament_rules', JSON.stringify(tournamentRules)); } catch(e){}
  showToast('✅ Règles du tournoi enregistrées');
}

// Résout une règle pour une partie donnée : 'random' est tiré au sort
function resolveTournamentRule(key) {
  const v = tournamentRules[key];
  if (v === 'random') return Math.random() < 0.5;
  return v === 'on';
}

// Démarre une partie en contexte tournoi : applique les règles
function startTournamentGame() {
  tournamentRules = loadTournamentRules();
  tournamentActiveRules = {
    hints: resolveTournamentRule('hints'),
    undo:  resolveTournamentRule('undo'),
    pause: resolveTournamentRule('pause'),
    coords: resolveTournamentRule('coords'),
  };
  tournamentGame = true;
  // Applique l'aide visuelle imposée
  showMoveHints = tournamentActiveRules.hints;
  // Applique l'affichage des coordonnées imposé
  showCoordinates = tournamentActiveRules.coords;

  // Récapitulatif des règles tirées
  const parts = [];
  parts.push('💡 Aide ' + (tournamentActiveRules.hints ? 'autorisée' : 'interdite'));
  parts.push('↩️ Annulation ' + (tournamentActiveRules.undo ? 'autorisée' : 'interdite'));
  parts.push('⏸️ Pause ' + (tournamentActiveRules.pause ? 'autorisée' : 'interdite'));

  showPage('game');
  setTimeout(function(){
    resetGame();
    if (typeof drawBoard === 'function') drawBoard();
    // verrouille les interrupteurs selon les règles
    applyTournamentLocks();
    if (typeof _tourneyAfterStart==='function') _tourneyAfterStart();
    showToast('🏆 Partie de tournoi — ' + parts.join(' · '));
  }, 300);
}

// Désactive visuellement les boutons interdits pendant une partie de tournoi
function applyTournamentLocks() {
  if (!tournamentGame || !tournamentActiveRules) return;
  const ht = document.getElementById('game-hints-toggle');
  if (ht) { ht.checked = tournamentActiveRules.hints; ht.disabled = true;
    if (ht.nextElementSibling) ht.nextElementSibling.style.opacity = '0.5'; }
}

// Quitte le contexte tournoi (partie libre)
function exitTournamentMode() {
  tournamentGame = false;
  tournamentActiveRules = null;
  const ht = document.getElementById('game-hints-toggle');
  if (ht) { ht.disabled = false; if (ht.nextElementSibling) ht.nextElementSibling.style.opacity = '1'; }
}

function renderTournamentState() {
  renderTournamentRules();
  if (typeof renderTourneyRun==='function') renderTourneyRun();
  const d = new Date();
  const title = document.getElementById('tourney-title');
  const btn = document.getElementById('tourney-register-btn');
  const countdown = document.getElementById('tourney-countdown');
  if (title) title.textContent = 'Tournoi mensuel — ' + MONTH_NAMES[d.getMonth()] + ' ' + d.getFullYear();
  if (countdown) {
    // jours restants avant la fin du mois
    const lastDay = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    const remaining = lastDay - d.getDate();
    countdown.textContent = remaining > 0 ? ('Clôture dans ' + remaining + ' jour' + (remaining>1?'s':'')) : 'Dernier jour !';
  }
  if (btn) {
    if (isRegisteredForTournament()) {
      btn.textContent = '✓ Inscrit — Se retirer';
      btn.style.background = 'var(--surface2)';
      btn.style.color = 'var(--text)';
    } else {
      btn.textContent = 'S\'inscrire — Gratuit';
      btn.style.background = '';
      btn.style.color = '';
    }
  }
}

/* ─── Toast d'engagement (notification flottante) ─── */
function toastEngage(msg) {
  let host = document.getElementById('engage-toast-host');
  if (!host) {
    host = document.createElement('div');
    host.id = 'engage-toast-host';
    host.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:99999;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none';
    document.body.appendChild(host);
  }
  const el = document.createElement('div');
  el.style.cssText = 'background:linear-gradient(135deg,rgba(200,168,75,0.95),rgba(180,148,55,0.95));color:#1a1208;font-weight:700;font-size:14px;padding:12px 22px;border-radius:30px;box-shadow:0 8px 30px rgba(200,168,75,0.4);opacity:0;transform:translateY(20px);transition:all .35s cubic-bezier(.2,.8,.2,1);white-space:nowrap';
  el.textContent = msg;
  host.appendChild(el);
  requestAnimationFrame(function(){ el.style.opacity='1'; el.style.transform='translateY(0)'; });
  setTimeout(function(){
    el.style.opacity='0'; el.style.transform='translateY(-10px)';
    setTimeout(function(){ el.remove(); }, 400);
  }, 2600);
}

/* ─── Rendu du bandeau d'engagement (accueil) ─── */
function renderEngageBar() {
  const host = document.getElementById('engage-bar');
  if (!host) return;
  const xpp = xpProgressInLevel(progress.xp);
  const dc = dailyChallenge();
  const winRate = progress.gamesPlayed ? Math.round(progress.gamesWon/progress.gamesPlayed*100) : 0;

  // 5 derniers jours pour la mini-frise de streak
  const days = ['D','L','M','M','J','V','S'];
  let streakDots = '';
  for (let i=4; i>=0; i--) {
    const d = new Date(); d.setDate(d.getDate()-i);
    const ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    const active = progress.lastActive && daysBetween(ds, progress.lastActive) >= 0 && daysBetween(ds, progress.lastActive) < progress.streak;
    const isToday = ds === todayStr();
    const todayActive = isToday && progress.lastActive === todayStr();
    const on = todayActive || (active && daysBetween(ds, todayStr()) < progress.streak);
    streakDots += '<div title="'+ds+'" style="width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;'+
      (on ? 'background:linear-gradient(135deg,#ff8c42,#ff5722);color:#fff;box-shadow:0 2px 8px rgba(255,87,34,0.4)' : 'background:var(--surface2);color:var(--muted);border:1px solid var(--border)')+
      '">'+days[d.getDay()]+'</div>';
  }

  // Raccourcis rapides façon a2one (Play / Puzzles / Learn / Watch / Social)
  const quickLinks = [
    { page:'game',      icon:'<span class="marble-gold"></span>', label:'Jouer',     color:'#4a9463' },
    { page:'puzzles',   icon:'🧩', label:'Problèmes', color:'#6299ff' },
    { page:'learn',     icon:'📖', label:'Apprendre', color:'#c8a84b' },
    { page:'observe',   icon:'👁', label:'Observer',  color:'#b06fd0' },
    { page:'community', icon:'👥', label:'Communauté',color:'#e08050' },
  ];
  let quickHtml = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:10px;margin-bottom:14px">';
  quickLinks.forEach(function(q){
    // "Jouer" doit passer par la configuration de partie (openGameSetup),
    // pas sauter dessus -- meme comportement que le lien equivalent dans
    // la barre laterale (sidebarNav('setup',...)). Signale par Olivier :
    // la carte d'accueil demarrait une partie directement avec les
    // derniers reglages, sans jamais repasser par l'ecran de configuration.
    const handler = (q.page === 'game') ? 'openGameSetup()' : ('showPage(\''+q.page+'\')');
    quickHtml +=
      '<button onclick="'+handler+'" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:6px;padding:16px 10px;border-radius:14px;background:var(--surface);border:1px solid var(--border);transition:transform .15s,border-color .15s" '+
      'onmouseover="this.style.transform=\'translateY(-3px)\';this.style.borderColor=\''+q.color+'\'" '+
      'onmouseout="this.style.transform=\'\';this.style.borderColor=\'var(--border)\'">'+
        '<span style="font-size:26px">'+q.icon+'</span>'+
        '<span style="font-size:13px;font-weight:700;color:var(--text)">'+q.label+'</span>'+
      '</button>';
  });
  quickHtml += '</div>';

  host.innerHTML =
  quickHtml +
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">'+

    // ── Carte STREAK ──
    '<div style="background:linear-gradient(135deg,rgba(255,140,66,0.08),rgba(255,87,34,0.04));border:1px solid rgba(255,140,66,0.2);border-radius:14px;padding:18px 20px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
        '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)">Série</div>'+
        '<div style="font-size:13px">🔥</div>'+
      '</div>'+
      '<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:12px">'+
        '<span style="font-size:34px;font-weight:900;font-family:\'DM Mono\',monospace;color:#ff8c42">'+progress.streak+'</span>'+
        '<span style="font-size:13px;color:var(--muted)">jour'+(progress.streak>1?'s':'')+'</span>'+
      '</div>'+
      '<div style="display:flex;gap:6px">'+streakDots+'</div>'+
    '</div>'+

    // ── Carte NIVEAU / XP ──
    '<div style="background:linear-gradient(135deg,rgba(200,168,75,0.08),rgba(200,168,75,0.03));border:1px solid rgba(200,168,75,0.2);border-radius:14px;padding:18px 20px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
        '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)">Niveau</div>'+
        '<div style="font-size:13px">🎖️</div>'+
      '</div>'+
      '<div style="display:flex;align-items:baseline;gap:6px;margin-bottom:10px">'+
        '<span style="font-size:34px;font-weight:900;font-family:\'DM Mono\',monospace;color:var(--gold)">'+progress.level+'</span>'+
        '<span style="font-size:12px;color:var(--muted)">'+xpp.cur+' / '+xpp.need+' XP</span>'+
      '</div>'+
      '<div style="height:8px;background:var(--surface2);border-radius:4px;overflow:hidden">'+
        '<div style="height:100%;width:'+xpp.pct+'%;background:linear-gradient(90deg,var(--gold),#e8dcb4);border-radius:4px;transition:width .6s"></div>'+
      '</div>'+
    '</div>'+

    // ── Carte DÉFI DU JOUR ──
    '<div onclick="completeDailyChallenge()" style="cursor:pointer;background:linear-gradient(135deg,rgba(74,148,99,0.1),rgba(45,90,61,0.05));border:1px solid rgba(74,148,99,0.25);border-radius:14px;padding:18px 20px;transition:transform .15s" onmouseover="this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.transform=\'\'">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
        '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)">Défi du jour</div>'+
        '<div style="font-size:13px">'+(dc.done?'✅':dc.type.icon)+'</div>'+
      '</div>'+
      '<div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px">'+dc.type.t+'</div>'+
      '<div style="font-size:12px;color:'+(dc.done?'var(--accent-green-light)':'var(--gold)')+'">'+
        (dc.done ? 'Complété · +50 XP' : 'Puzzle #'+dc.num+' · clique pour relever')+
      '</div>'+
    '</div>'+

    // ── Carte STATS ──
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'+
        '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--muted)">Mes stats</div>'+
        '<div style="font-size:13px">📊</div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;gap:6px;flex-wrap:wrap">'+
        '<div style="text-align:center;flex:1;min-width:48px"><div style="font-size:20px;font-weight:800;color:var(--text);font-family:\'DM Mono\',monospace">'+progress.elo+'</div><div style="font-size:10px;color:var(--muted)">ELO</div></div>'+
        '<div style="text-align:center;flex:1;min-width:48px"><div style="font-size:20px;font-weight:800;color:var(--accent-green-light);font-family:\'DM Mono\',monospace">'+progress.gamesWon+'</div><div style="font-size:10px;color:var(--muted)">Victoires</div></div>'+
        '<div style="text-align:center;flex:1;min-width:48px"><div style="font-size:20px;font-weight:800;color:#e05c4b;font-family:\'DM Mono\',monospace">'+(progress.gamesLost||0)+'</div><div style="font-size:10px;color:var(--muted)">Défaites</div></div>'+
        '<div style="text-align:center;flex:1;min-width:48px"><div style="font-size:20px;font-weight:800;color:var(--muted);font-family:\'DM Mono\',monospace">'+(progress.gamesDraw||0)+'</div><div style="font-size:10px;color:var(--muted)">Nuls</div></div>'+
        '<div style="text-align:center;flex:1;min-width:48px"><div style="font-size:20px;font-weight:800;color:var(--gold);font-family:\'DM Mono\',monospace">'+winRate+'%</div><div style="font-size:10px;color:var(--muted)">Taux</div></div>'+
      '</div>'+
    '</div>'+

  '</div>' +
  // ── Carte DÉFI HEBDOMADAIRE (pleine largeur) ──
  '<div style="background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:18px 20px;margin-top:14px">'+
    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--gold);margin-bottom:12px">🎁 Défi de la semaine</div>'+
    '<div id="weekly-card"></div>'+
  '</div>' +
  // ── Carte DÉFI DU JOUR — PARTIE (distincte du puzzle du jour) ──
  '<div style="background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:18px 20px;margin-top:14px">'+
    '<div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--gold);margin-bottom:12px">⚡ Défi du jour — partie</div>'+
    '<div id="daily-game-card"></div>'+
  '</div>';
  setTimeout(renderWeeklyCard, 0);
  setTimeout(renderDailyGameCard, 0);
}

function renderDailyCard() { renderEngageBar(); }

/* ─── Section progression du profil (niveau, courbe ELO, badges) ─── */
function sparkline(data, w, h, color) {
  if (!data || data.length < 2) {
    return '<div style="height:'+h+'px;display:flex;align-items:center;justify-content:center;color:var(--muted);font-size:12px">Joue quelques parties pour voir ta progression</div>';
  }
  const vals = data.map(d=>d.elo!==undefined?d.elo:d.xp);
  const min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
  const range = (max-min) || 1;
  const pts = vals.map(function(v,i){
    const x = (i/(vals.length-1))*w;
    const y = h - ((v-min)/range)*(h-10) - 5;
    return x.toFixed(1)+','+y.toFixed(1);
  });
  const last = vals[vals.length-1], first = vals[0];
  const delta = last - first;
  return '<svg width="100%" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" style="display:block">'+
    '<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+color+'" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>'+
    '<circle cx="'+pts[pts.length-1].split(',')[0]+'" cy="'+pts[pts.length-1].split(',')[1]+'" r="4" fill="'+color+'"/>'+
    '</svg>'+
    '<div style="font-size:11px;color:'+(delta>=0?'var(--accent-green-light)':'#e08050')+';margin-top:4px">'+(delta>=0?'▲ +':'▼ ')+delta+' depuis le début</div>';
}

