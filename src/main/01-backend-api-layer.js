/* ════════════════════════════════════════════════════════════════
   COUCHE API — aiguillage local / backend (feature flag)
   ----------------------------------------------------------------
   Tant que BACKEND.enabled === false : 100 % local (localStorage),
   comportement identique à aujourd'hui, aucun réseau, aucune donnée
   ne quitte l'appareil → aucune obligation RGPD.
   Le jour du déploiement : passer enabled à true + renseigner url.
   Les chemins distants sont écrits mais DORMANTS (jamais atteints
   tant que le drapeau est false).
   ════════════════════════════════════════════════════════════════ */
const BACKEND = {
  enabled: false,                         // ← L'UNIQUE INTERRUPTEUR
  url: '',                                // ex. 'https://api.abalassembly.fr' (hébergeur UE)
  timeoutMs: 8000
};
// Helper fetch avec timeout + repli local silencieux si le backend échoue
async function _apiFetch(path, opts){
  if(!BACKEND.enabled || !BACKEND.url) return null;
  const ctrl = new AbortController();
  const to = setTimeout(function(){ ctrl.abort(); }, BACKEND.timeoutMs);
  try{
    const r = await fetch(BACKEND.url.replace(/\/$/,'') + path, Object.assign({
      signal: ctrl.signal,
      headers: Object.assign({'Content-Type':'application/json'},
        (currentUser && currentUser._token) ? {'Authorization':'Bearer '+currentUser._token} : {})
    }, opts||{}));
    clearTimeout(to);
    if(!r.ok) throw new Error('HTTP '+r.status);
    const ct = r.headers.get('content-type')||'';
    return ct.indexOf('application/json')>=0 ? await r.json() : await r.text();
  }catch(e){ clearTimeout(to); if(typeof console!=='undefined') console.warn('[api] '+path+' → repli local', e.message); return null; }
}
const api = {
  get online(){ return !!(BACKEND.enabled && BACKEND.url); },
  // ── Profil / session ──
  async login(credentials){
    if(this.online){
      const res = await _apiFetch('/auth/login', {method:'POST', body:JSON.stringify(credentials)});
      if(res && res.user){ if(res.token) res.user._token=res.token; return res.user; }
    }
    return null; // null ⇒ l'appelant applique sa logique locale existante
  },
  async signup(payload){
    if(this.online){
      const res = await _apiFetch('/auth/signup', {method:'POST', body:JSON.stringify(payload)});
      if(res && res.user){ if(res.token) res.user._token=res.token; return res.user; }
    }
    return null;
  },
  async logout(){
    if(this.online){ await _apiFetch('/auth/logout', {method:'POST'}); }
    return true;
  },
  async saveProfile(user){
    if(this.online){ await _apiFetch('/profile', {method:'PUT', body:JSON.stringify(user)}); }
    return true; // le stockage local reste fait par l'appelant dans tous les cas
  },
  async fetchProfile(){
    if(this.online){ return await _apiFetch('/profile', {method:'GET'}); }
    return null;
  },
  // ── Progression / stats / XP ──
  async saveProgress(progress){
    if(this.online){ await _apiFetch('/progress', {method:'PUT', body:JSON.stringify(progress)}); }
    return true;
  },
  async fetchProgress(){
    if(this.online){ return await _apiFetch('/progress', {method:'GET'}); }
    return null;
  },
  // ── Tournoi (palmarès serveur, classements) ──
  async submitTournamentResult(result){
    if(this.online){ await _apiFetch('/tournament/result', {method:'POST', body:JSON.stringify(result)}); }
    return true;
  },
  // ── RGPD : effacement côté serveur (droit à l'oubli) ──
  async deleteAccount(){
    if(this.online){ await _apiFetch('/account', {method:'DELETE'}); }
    return true;
  },
  // ── Leaderboard mondial (lecture) ──
  async fetchLeaderboard(){
    if(this.online){ return await _apiFetch('/tournament/leaderboard', {method:'GET'}); }
    return null; // hors-ligne : pas de classement mondial
  },
  // ── RGPD : portabilité (export des données) ──
  async exportData(){
    if(this.online){ return await _apiFetch('/account/export', {method:'GET'}); }
    return null; // hors-ligne : l'appelant exporte le localStorage
  }
};

function loadProgress() {
  try {
    const raw = localStorage.getItem(ENGAGE_KEY);
    if (!raw) return defaultProgress();
    return Object.assign(defaultProgress(), JSON.parse(raw));
  } catch(e) { return defaultProgress(); }
}
function saveProgress(p) {
  try { localStorage.setItem(ENGAGE_KEY, JSON.stringify(p)); } catch(e) {}
  if (typeof api!=='undefined' && api.online) { api.saveProgress(p); }  // miroir backend (dormant)
}

let progress = loadProgress();

/* ─── Niveaux : seuils d'XP cumulés ─── */
function xpForLevel(lvl) { return Math.round(50 * Math.pow(lvl, 1.6)); }
function levelFromXp(xp) {
  let lvl = 1;
  while (xp >= xpForLevel(lvl+1)) lvl++;
  return lvl;
}
function xpProgressInLevel(xp) {
  const lvl = levelFromXp(xp);
  const cur = xpForLevel(lvl), next = xpForLevel(lvl+1);
  return { lvl, cur: xp-cur, need: next-cur, pct: Math.min(100, Math.round((xp-cur)/(next-cur)*100)) };
}

/* ─── Catalogue de badges ─── */
const BADGES = [
  { id:'first_game',  icon:'🎮', name:'Premier pas',       desc:'Jouer ta première partie' },
  { id:'first_win',   icon:'🏆', name:'Première victoire',  desc:'Gagner une partie' },
  { id:'streak3',     icon:'🔥', name:'Sur la lancée',      desc:'3 jours d\u2019affilée' },
  { id:'streak7',     icon:'⚡', name:'Semaine parfaite',   desc:'7 jours d\u2019affilée' },
  { id:'streak30',    icon:'💎', name:'Inarrêtable',        desc:'30 jours d\u2019affilée' },
  { id:'puzzle10',    icon:'🧩', name:'Casse-tête',         desc:'Résoudre 10 puzzles' },
  { id:'win10',       icon:'⭐', name:'Vétéran',            desc:'Gagner 10 parties' },
  { id:'level5',      icon:'🎖️', name:'Niveau 5',          desc:'Atteindre le niveau 5' },
  { id:'level10',     icon:'👑', name:'Maître',             desc:'Atteindre le niveau 10' },
  { id:'daily7',      icon:'📅', name:'Assidu',             desc:'7 défis quotidiens' },
  { id:'shutout',     icon:'🧺', name:'Blanchissage',       desc:'Gagner 6-0 sans perdre une bille' },
];

function awardBadge(id) {
  if (!progress.badges[id]) {
    progress.badges[id] = todayStr();
    saveProgress(progress);
    const b = BADGES.find(x=>x.id===id);
    if (b) { toastEngage(b.icon + ' Badge débloqué : ' + b.name);
             if (typeof soundBadge === 'function') soundBadge(); }
    return true;
  }
  return false;
}

function checkBadges() {
  if (progress.gamesPlayed >= 1) awardBadge('first_game');
  if (progress.gamesWon >= 1) awardBadge('first_win');
  if (progress.gamesWon >= 10) awardBadge('win10');
  if (progress.streak >= 3) awardBadge('streak3');
  if (progress.streak >= 7) awardBadge('streak7');
  if (progress.streak >= 30) awardBadge('streak30');
  if (progress.puzzlesSolved >= 10) awardBadge('puzzle10');
  if (progress.level >= 5) awardBadge('level5');
  if (progress.level >= 10) awardBadge('level10');
}

// Détecte les skins de billes nouvellement débloqués et félicite le joueur.
// On mémorise les skins déjà annoncés pour ne pas répéter la notification.
function checkSkinUnlocks() {
  if (typeof MARBLE_SKINS === 'undefined') return;
  if (!progress.skinsSeen) progress.skinsSeen = {};
  let newlyUnlocked = [];
  Object.keys(MARBLE_SKINS).forEach(function(key){
    if (isSkinUnlocked(key) && !progress.skinsSeen[key]) {
      progress.skinsSeen[key] = true;
      // ne pas annoncer les skins gratuits/de départ
      const sk = MARBLE_SKINS[key];
      if (sk.unlock && sk.unlock.type !== 'free') newlyUnlocked.push(sk);
    }
  });
  if (newlyUnlocked.length) {
    saveProgress(progress);
    newlyUnlocked.forEach(function(sk, i){
      setTimeout(function(){
        toastEngage('🎨 Nouveau skin débloqué : ' + sk.name + ' !');
      }, 400 + i*1200);
    });
    // rafraîchit la galerie si elle est ouverte
    if (typeof renderSkinGallery === 'function') renderSkinGallery();
  }
}

/* ─── Gain d'XP ─── */
function addXp(amount, reason) {
  const oldLvl = progress.level;
  progress.xp += amount;
  progress.level = levelFromXp(progress.xp);

  // historique journalier
  const t = todayStr();
  const last = progress.history[progress.history.length-1];
  if (last && last.date === t) last.xp = progress.xp;
  else progress.history.push({ date:t, xp:progress.xp });
  if (progress.history.length > 60) progress.history.shift();

  saveProgress(progress);
  if (reason) toastEngage('+' + amount + ' XP · ' + reason);
  if (progress.level > oldLvl) {
    setTimeout(function(){ toastEngage('🎉 Niveau ' + progress.level + ' atteint !'); }, 600);
  }
  checkBadges();
  checkSkinUnlocks();
  renderEngageBar();
}

/* ─── Streak quotidien ─── */
function touchStreak() {
  const t = todayStr();
  if (progress.lastActive === t) return; // déjà compté aujourd'hui
  if (progress.lastActive) {
    const gap = daysBetween(progress.lastActive, t);
    if (gap === 1) progress.streak += 1;        // jour consécutif
    else if (gap > 1) progress.streak = 1;      // streak cassé
  } else {
    progress.streak = 1;
  }
  progress.lastActive = t;
  if (progress.streak > progress.bestStreak) progress.bestStreak = progress.streak;
  saveProgress(progress);
  checkBadges();
}

/* ─── Défi quotidien (déterministe selon la date) ─── */
function dailySeed() {
  const t = todayStr();
  let h = 0;
  for (let i=0;i<t.length;i++) h = (h*31 + t.charCodeAt(i)) >>> 0;
  return h;
}
function dailyChallenge() {
  const seed = dailySeed();
  const num = 200 + (seed % 300);  // numéro de puzzle "du jour"
  const types = [
    {t:'Éjection en 2 coups', icon:'🎯'},
    {t:'Sumito 3v2 gagnant', icon:'💪'},
    {t:'Défense imprenable', icon:'🛡️'},
    {t:'Contrôle du centre', icon:'⊕'},
    {t:'Double menace', icon:'⚔️'}
  ];
  const type = types[seed % types.length];
  return { num, type, done: progress.dailyDone === todayStr() };
}
function completeDailyChallenge() {
  if (progress.dailyDone === todayStr()) {
    toastEngage('✅ Défi du jour déjà complété !');
    return;
  }
  progress.dailyDone = todayStr();
  // compteur de défis quotidiens
  progress._dailyCount = (progress._dailyCount||0) + 1;
  if (progress._dailyCount >= 7) awardBadge('daily7');
  saveProgress(progress);
  touchStreak();
  addXp(50, 'Défi du jour');
  renderEngageBar();
  renderDailyCard();
}

