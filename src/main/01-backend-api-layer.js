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
/* ─── Preuve de travail : le « captcha » du serveur, sans tiers (abalassembly-api, src/preuve.js) ───
   Le serveur donne un défi signé (GET /auth/defi) ; on cherche un nombre `nonce` tel que
   SHA-256(sel + ':' + nonce) commence par `b` bits nuls — une seconde de calcul environ,
   rien à cliquer, rien à charger d'un autre site. Demandée à l'inscription, et à la
   connexion seulement après des mots de passe faux pour ce compte (le serveur répond
   alors preuveRequise). SHA-256 écrit ici, synchrone : crypto.subtle, une promesse par
   essai, serait plusieurs fois plus lent pour des centaines de milliers d'essais. */
const _SHA_K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,
  0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,
  0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,
  0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const _SHA_W = new Uint32Array(64);
function _sha256Octets(m) {          // m : Uint8Array ; renvoie les 32 octets du condensé
  const n = ((m.length + 9 + 63) >> 6) << 6, b = new Uint8Array(n);
  b.set(m); b[m.length] = 0x80;
  const bits = m.length * 8; b[n - 4] = bits >>> 24; b[n - 3] = bits >>> 16; b[n - 2] = bits >>> 8; b[n - 1] = bits;
  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a, h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const W = _SHA_W, K = _SHA_K;
  for (let o = 0; o < n; o += 64) {
    for (let i = 0; i < 16; i++) W[i] = (b[o + 4 * i] << 24) | (b[o + 4 * i + 1] << 16) | (b[o + 4 * i + 2] << 8) | b[o + 4 * i + 3];
    for (let i = 16; i < 64; i++) {
      const x = W[i - 15], y = W[i - 2];
      W[i] = (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) + W[i - 16] + (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10)) + W[i - 7];
    }
    let a = h0, c1 = h1, c2 = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let i = 0; i < 64; i++) {
      const t1 = (h + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + K[i] + W[i]) | 0;
      const t2 = ((((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & c1) ^ (a & c2) ^ (c1 & c2))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0; d = c2; c2 = c1; c1 = a; a = (t1 + t2) | 0;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + c1) | 0; h2 = (h2 + c2) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
  }
  const out = new Uint8Array(32);
  [h0, h1, h2, h3, h4, h5, h6, h7].forEach((v, i) => { out[4 * i] = v >>> 24; out[4 * i + 1] = v >>> 16; out[4 * i + 2] = v >>> 8; out[4 * i + 3] = v; });
  return out;
}
function _bitsNuls(h) {
  let n = 0;
  for (let i = 0; i < h.length; i++) { if (h[i] === 0) { n += 8; continue; } return n + Math.clz32(h[i]) - 24; }
  return n;
}
// résout un défi ; rend la main à la page tous les 4096 essais pour ne pas la figer
async function _preuveResoudre(defi) {
  const d = JSON.parse(atob(String(defi).split('.')[0].replace(/-/g, '+').replace(/_/g, '/')));
  const enc = new TextEncoder(), pre = d.s + ':';
  for (let n = 0; ; n++) {
    if (_bitsNuls(_sha256Octets(enc.encode(pre + n))) >= d.b) return { defi: defi, nonce: n };
    if ((n & 4095) === 4095) await new Promise(function (r) { setTimeout(r, 0); });
  }
}
/* Connexion / inscription au serveur `base` : { statut, b }. Joint la preuve de travail à
   l'inscription, et à la connexion quand le serveur la demande (un seul nouvel essai). */
async function _authServeur(base, chemin, corps, preuveDabord) {
  if (!base) return { statut: 0, b: { error: 'pas de serveur' } };     // rien ne part sans serveur en ligne
  const brut = async function (c, x) {
    const ctrl = new AbortController(), to = setTimeout(function () { ctrl.abort(); }, BACKEND.timeoutMs);
    try {
      const r = await fetch(base.replace(/\/$/, '') + c, { method: x ? 'POST' : 'GET', signal: ctrl.signal, credentials: 'omit',
        headers: { 'Content-Type': 'application/json' }, body: x ? JSON.stringify(x) : undefined });
      let b = {}; try { b = await r.json(); } catch (e) {}
      return { statut: r.status, b: b || {} };
    } catch (e) { return { statut: 0, b: { error: 'serveur injoignable' } }; } finally { clearTimeout(to); }
  };
  const avecPreuve = async function () {
    const d = await brut('/auth/defi');
    if (d.statut !== 200 || !d.b.defi) return null;
    return brut(chemin, Object.assign({}, corps, { preuve: await _preuveResoudre(d.b.defi) }));
  };
  if (preuveDabord) return (await avecPreuve()) || { statut: 0, b: { error: 'vérification anti-robot indisponible' } };
  const r = await brut(chemin, corps);
  if (r.statut === 401 && r.b.preuveRequise) return (await avecPreuve()) || r;
  return r;
}
const api = {
  get online(){ return !!(BACKEND.enabled && BACKEND.url); },
  // ── Profil / session ──
  async login(credentials){
    if(this.online){
      const r = await _authServeur(BACKEND.url, '/auth/login', credentials, false);
      const res = r.statut === 200 ? r.b : null;
      if(res && res.user){ if(res.token) res.user._token=res.token; return res.user; }
    }
    return null; // null ⇒ l'appelant applique sa logique locale existante
  },
  async signup(payload){
    if(this.online){
      const r = await _authServeur(BACKEND.url, '/auth/signup', payload, true);   // inscription : preuve de travail toujours
      const res = r.statut === 200 ? r.b : null;
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
  // le niveau 1 commence a 0 XP (avant : a xpForLevel(1) = 50 -- un nouveau joueur voyait « -50 / 102 XP »)
  const cur = lvl <= 1 ? 0 : xpForLevel(lvl), next = xpForLevel(lvl+1);
  return { lvl, cur: xp-cur, need: next-cur, pct: Math.max(0, Math.min(100, Math.round((xp-cur)/(next-cur)*100))) };
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
  { id:'daily7',      icon:'📅', name:'Assidu',             desc:'7 défis du jour trouvés' },
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
/* Serie EN COURS : progress.streak n'est remis a zero qu'au prochain jour joue, donc apres
   deux jours sans jouer il affichait encore l'ancienne serie. Elle est vivante tant que le
   dernier jour actif est aujourd'hui ou hier. */
function serieActuelle() {
  if (!progress || !progress.streak || !progress.lastActive) return 0;
  return daysBetween(progress.lastActive, todayStr()) <= 1 ? progress.streak : 0;
}

/* ─── Défi quotidien ───
   Avant (v2.57) : un « Puzzle #N » inventé (200 + graine % 300) que l'on « relevait » d'un simple
   clic contre 50 XP, sans rien jouer. Remplacé par le vrai Défi du jour #N
   (36-defi-du-jour-et-cartes.js). */

