/* ═══════════════════════════════════════════
   PROFILS LOCAUX
   Il n'y a pas de serveur : un « compte » est un profil enregistre dans ce navigateur.
   Avant (v2.57), le mot de passe n'etait jamais verifie (n'importe lequel ouvrait n'importe
   quel nom), et taper « fightclub » connectait sous le nom d'une vraie personne avec des
   statistiques inventees (ELO 1950, 312 parties...). Desormais chaque profil garde
   l'empreinte PBKDF2 de son mot de passe (SEC.hashPassword) et la connexion la verifie.
   La progression (parties, XP, problemes) reste celle de l'appareil, quel que soit le profil.
═══════════════════════════════════════════ */
const PROFILS_KEY = 'abalone_profils';
const _PROFIL_CHAMPS = ['username', 'email', 'role', 'color', 'bio', 'country', 'joinDate', 'passwordHash', 'passwordSalt'];
function _profilCle(nom) { return String(nom || '').trim().toLowerCase(); }
function _profilsLire() {
  try {
    const o = JSON.parse(localStorage.getItem(PROFILS_KEY) || '{}');
    return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
  } catch (e) { return {}; }
}
function _profilsEcrire(o) { try { localStorage.setItem(PROFILS_KEY, JSON.stringify(o)); } catch (e) {} }
/* Enregistre (ou met a jour) le profil de u dans le registre local. */
function _profilMaj(u) {
  if (!u || !u.username) return;
  const tous = _profilsLire();
  const cle = _profilCle(u.username);
  const p = Object.assign({}, tous[cle] || {});
  _PROFIL_CHAMPS.forEach(function (k) { if (u[k] !== undefined && u[k] !== null) p[k] = u[k]; });
  tous[cle] = p;
  _profilsEcrire(tous);
}
/* Cherche un profil par nom ou par e-mail, sans tenir compte des majuscules. */
function _profilTrouver(ident) {
  const q = _profilCle(ident);
  if (!q) return null;
  const tous = _profilsLire();
  if (tous[q]) return { cle: q, profil: tous[q] };
  for (const cle in tous) {
    if (tous[cle] && tous[cle].email && _profilCle(tous[cle].email) === q) return { cle: cle, profil: tous[cle] };
  }
  return null;
}
async function profilConnexion(ident, mdp) {
  const t = _profilTrouver(ident);
  if (!t) return { ok: false, msg: _tr('Aucun profil « ' + ident + ' » dans ce navigateur : un profil reste sur l’appareil où il a été créé.',
                                       'No profile “' + ident + '” in this browser: a profile stays on the device where it was created.') };
  const p = Object.assign({}, t.profil);
  let nouveauMdp = false;
  if (p.passwordHash && p.passwordSalt) {
    const h = await SEC.hashPassword(mdp, p.passwordSalt);
    if (h.hash !== p.passwordHash) return { ok: false, msg: _tr('❌ Mot de passe incorrect', '❌ Wrong password') };
  } else {
    // profil cree avant la v2.57 (aucun mot de passe n'etait garde) : celui-ci devient le sien
    const h = await SEC.hashPassword(mdp);
    p.passwordHash = h.hash; p.passwordSalt = h.salt; nouveauMdp = true;
  }
  currentUser = p;
  await saveSession(currentUser);
  updateNavAuth();
  return { ok: true, profil: currentUser, nouveauMdp: nouveauMdp };
}
async function profilCreation(nom, email, mdp) {
  if (_profilTrouver(nom) || (email && _profilTrouver(email))) {
    return { ok: false, msg: _tr('⚠️ Ce nom ou cet e-mail a déjà un profil dans ce navigateur : connectez-vous.',
                                 '⚠️ This name or e-mail already has a profile in this browser: sign in.') };
  }
  const h = await SEC.hashPassword(mdp);
  currentUser = { username: nom, email: email || '', role: 'player', color: '#2d5a3d', bio: '', country: '',
    joinDate: new Date().toLocaleDateString(currentLang() === 'EN' ? 'en-GB' : 'fr-FR', { month: 'long', year: 'numeric' }),
    passwordHash: h.hash, passwordSalt: h.salt };
  await saveSession(currentUser);
  updateNavAuth();
  return { ok: true, profil: currentUser };
}
/* « Mot de passe oublie » : sans serveur, aucun e-mail ne peut partir. On propose d'effacer
   le profil (nom, mot de passe, couleur) pour le recreer ; la progression n'y est pas liee. */
function profilOublie() {
  const champ = document.getElementById('forgot-ident');
  const ident = ((champ && champ.value) || '').trim();
  if (!ident) { shakeModal('modal-forgot'); showToast(_tr('⚠️ Indiquez le nom ou l’e-mail du profil', '⚠️ Enter the profile’s name or e-mail')); return; }
  const t = _profilTrouver(ident);
  if (!t) { shakeModal('modal-forgot'); showToast(_tr('Aucun profil « ' + ident + ' » dans ce navigateur', 'No profile “' + ident + '” in this browser')); return; }
  const ok = confirm(_tr('Effacer le profil « ' + t.profil.username + ' » de ce navigateur ?\n\nVos parties, votre XP et vos problèmes résolus restent sur cet appareil : seuls le nom, le mot de passe et la couleur du profil sont effacés. Vous pourrez le recréer tout de suite.',
                         'Delete the profile “' + t.profil.username + '” from this browser?\n\nYour games, XP and solved puzzles stay on this device: only the profile’s name, password and colour are deleted. You can create it again right away.'));
  if (!ok) return;
  const tous = _profilsLire(); delete tous[t.cle]; _profilsEcrire(tous);
  if (currentUser && _profilCle(currentUser.username) === t.cle) { clearSession(); updateNavAuth(); }
  if (champ) champ.value = '';
  closeModal('forgot');
  openModal('signup');
  const su = document.getElementById('signup-username'); if (su) su.value = t.profil.username;
  const se = document.getElementById('signup-email'); if (se) se.value = t.profil.email || '';
}
/* Chemin serveur (dormant tant que BACKEND.enabled===false) : si le serveur authentifie, on
   utilise SON utilisateur. Renvoie true si la connexion a ete faite ainsi. */
async function _connexionServeur(ident, mdp) {
  if (!(typeof api !== 'undefined' && api.online)) return false;
  try {
    const remote = await api.login({ email: ident, password: mdp });
    if (!remote) return false;
    currentUser = remote; saveSession(currentUser); updateNavAuth();
    // Synchronise la progression depuis le serveur (source de vérité si en ligne)
    try { const rp = await api.fetchProgress(); if (rp) { saveProgress(rp); if (typeof refreshProgressUI === 'function') refreshProgressUI(); } } catch (e) {}
    return true;
  } catch (e) { return false; }
}
function _bienvenue(u) {
  const el = document.getElementById('success-username');
  if (el) el.textContent = u.username;
  openModal('login-success');
}

/* ═══════════════════════════════════════════
   SÉCURITÉ — Chiffrement localStorage (AES-GCM)
   + Hachage mot de passe (PBKDF2-SHA256)
   + Token de session signé (HMAC-SHA256)
   Sans cookies, sans serveur — tout côté client
═══════════════════════════════════════════ */

const SEC = {
  // Clé de chiffrement dérivée d'un secret aléatoire local (PAS de fingerprint
  // navigateur, par respect de la vie privée) -- généré une fois par appareil
  // et stocké dans ce même localStorage. Portée honnête : ceci protège contre
  // une lecture accidentelle du stockage brut, pas contre un script capable
  // de s'exécuter sur la page (la clé est à côté des données qu'elle protège).
  _masterKey: null,
  _salt: 'abalone-sec-2026',
  async getMasterKey() {
    if (this._masterKey) return this._masterKey;
    // Secret aléatoire généré une fois par appareil, sans lire aucune
    // caractéristique du navigateur (respect de la vie privée).
    let secret;
    try { secret = localStorage.getItem('abalone_crypto_secret'); } catch(e) {}
    if (!secret) {
      secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2,'0')).join('');
      try { localStorage.setItem('abalone_crypto_secret', secret); } catch(e) {}
    }
    const raw = new TextEncoder().encode(this._salt + secret);
    const keyMaterial = await crypto.subtle.importKey('raw', raw, 'PBKDF2', false, ['deriveKey']);
    this._masterKey = await crypto.subtle.deriveKey(
      { name:'PBKDF2', salt: new TextEncoder().encode(this._salt), iterations:100000, hash:'SHA-256' },
      keyMaterial,
      { name:'AES-GCM', length:256 },
      false, ['encrypt','decrypt']
    );
    return this._masterKey;
  },

  // Chiffre une chaîne → base64
  async encrypt(data) {
    try {
      const key = await this.getMasterKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoded = new TextEncoder().encode(JSON.stringify(data));
      const ciphertext = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, key, encoded);
      const combined = new Uint8Array(iv.length + ciphertext.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(ciphertext), iv.length);
      return btoa(String.fromCharCode(...combined));
    } catch(e) { return JSON.stringify(data); } // fallback non chiffré
  },

  // Déchiffre un base64 → objet
  async decrypt(b64) {
    try {
      const key = await this.getMasterKey();
      const combined = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);
      const decrypted = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, key, ciphertext);
      return JSON.parse(new TextDecoder().decode(decrypted));
    } catch(e) {
      // Fallback: données non chiffrées (migration)
      try { return JSON.parse(b64); } catch { return null; }
    }
  },

  // Hache un mot de passe avec PBKDF2-SHA256 + sel aléatoire
  async hashPassword(password, saltHex) {
    const salt = saltHex
      ? Uint8Array.from(saltHex.match(/.{2}/g), b => parseInt(b,16))
      : crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name:'PBKDF2', salt, iterations:100000, hash:'SHA-256' },
      keyMaterial, 256
    );
    const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2,'0')).join('');
    const saltHexOut = Array.from(salt).map(b => b.toString(16).padStart(2,'0')).join('');
    return { hash: hashHex, salt: saltHexOut };
  },

  // Génère un token de session (HMAC-SHA256)
  // NOTE : sans backend, ce secret reste côté client. Il est généré
  // aléatoirement par appareil plutôt que codé en dur, mais une vraie
  // sécurité de session exige une validation côté serveur.
  async _getTokenSecret() {
    let s = null;
    try { s = localStorage.getItem('abalone_token_secret'); } catch(e) {}
    if (!s) {
      s = Array.from(crypto.getRandomValues(new Uint8Array(32)))
            .map(b => b.toString(16).padStart(2,'0')).join('');
      try { localStorage.setItem('abalone_token_secret', s); } catch(e) {}
    }
    return s;
  },
  async generateToken(userId) {
    const secretStr = await this._getTokenSecret();
    const secret = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secretStr),
      { name:'HMAC', hash:'SHA-256' }, false, ['sign']
    );
    const payload = userId + ':' + Date.now() + ':' + Math.random().toString(36).slice(2);
    const sig = await crypto.subtle.sign('HMAC', secret, new TextEncoder().encode(payload));
    const sigHex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2,'0')).join('');
    return btoa(payload + '.' + sigHex);
  },

  // Vérifie qu'un token n'est pas expiré (30 jours)
  validateToken(token) {
    try {
      const decoded = atob(token);
      const parts = decoded.split(':');
      const ts = parseInt(parts[1]);
      const age = Date.now() - ts;
      return age < 30 * 24 * 60 * 60 * 1000; // 30 jours
    } catch { return false; }
  }
};

/* ── Session sécurisée ── */
function initSession() {
  try {
    const saved = localStorage.getItem('abalone_session');
    if (!saved) return;
    // Support sessions chiffrées et non chiffrées (migration)
    SEC.decrypt(saved).then(function(data) {
      if (!data) return;
      // Valider le token si présent
      if (data._token && !SEC.validateToken(data._token)) {
        console.log('[SEC] Token expiré — session supprimée');
        localStorage.removeItem('abalone_session');
        return;
      }
      currentUser = data;
      // Masquer le mot de passe en mémoire si stocké en clair (migration)
      if (currentUser.password && !currentUser.passwordHash) {
        currentUser.password = '***'; // ne plus stocker en clair
      }
      // session ouverte avant la v2.57 : son profil rejoint le registre local
      if (currentUser.username && !_profilTrouver(currentUser.username)) _profilMaj(currentUser);
      updateNavAuth();
    }).catch(function() {
      // Fallback non chiffré
      try { currentUser = JSON.parse(saved); updateNavAuth(); } catch {}
    });
  } catch(e) { currentUser = null; }
}

async function saveSession(u) {
  try {
    // Générer un token si pas encore présent
    if (!u._token) {
      u._token = await SEC.generateToken(u.username || 'user');
      u._tokenTs = Date.now();
    }
    // Hasher le mot de passe si encore en clair
    if (u.password && u.password !== '***' && !u.passwordHash) {
      const hashed = await SEC.hashPassword(u.password);
      u.passwordHash = hashed.hash;
      u.passwordSalt = hashed.salt;
      u.password = '***'; // supprimer le clair
    }
    const encrypted = await SEC.encrypt(u);
    localStorage.setItem('abalone_session', encrypted);
  } catch(e) {
    // Fallback non chiffré si Web Crypto indisponible
    try { localStorage.setItem('abalone_session', JSON.stringify(u)); } catch {}
  }
  _profilMaj(u);   // le registre des profils locaux suit chaque changement (nom, couleur, mot de passe)
}

function clearSession() {
  try { localStorage.removeItem('abalone_session'); } catch(e) {}
  currentUser = null;
  SEC._masterKey = null; // reset clé
}

let currentUser = null;

function logout() {
  if (typeof api!=='undefined' && api.online) { api.logout(); }  // notifie le backend (dormant)
  clearSession();
  updateNavAuth();
  showPage('home');
  showToast('👋 Vous avez été déconnecté·e');
}

/* Réinitialise TOUTES les données locales (progression, stats, historique, préférences) */
// ── RGPD : export de mes données (portabilité art. 20) ──
async function exportMyData() {
  let bundle = null;
  if (typeof api!=='undefined' && api.online) {
    try { bundle = await api.exportData(); } catch(e) {}
  }
  if (!bundle) {
    // Hors-ligne : rassemble tout le localStorage de l'application
    const data = {};
    for (let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i);
      if (k && (k.indexOf('aba')===0 || k.indexOf('abalone')===0)) {
        try { data[k]=JSON.parse(localStorage.getItem(k)); } catch(e){ data[k]=localStorage.getItem(k); }
      }
    }
    bundle = { exportedAt:new Date().toISOString(), format:'abalassembly-local-export-v1', source:'localStorage', data };
  }
  try {
    const blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url; a.download='mes-donnees-abalassembly.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
    showToast('\ud83d\udce6 Tes donn\u00e9es ont \u00e9t\u00e9 export\u00e9es (JSON)');
  } catch(e){ showToast('Export impossible sur ce navigateur'); }
}

/* Import de progression -- miroir d'exportMyData(). Meme filtre de securite
   sur les cles (prefixe aba ou abalone) qu'a l'export, pour ne jamais ecrire
   de cle arbitraire dans localStorage depuis un fichier externe. Confirmation
   avant ecrasement, meme pattern que resetAllData() (action destructive). */
function importMyData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json';
  input.onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(ev) {
      let bundle;
      try { bundle = JSON.parse(ev.target.result); }
      catch(err) { showToast('⚠️ Fichier illisible — pas un JSON valide'); return; }
      if (!bundle || typeof bundle.data !== 'object' || !bundle.data) {
        showToast('⚠️ Format non reconnu — ce n\'est pas un export Abalassembly');
        return;
      }
      const keys = Object.keys(bundle.data).filter(function(k){
        return k.indexOf('aba') === 0 || k.indexOf('abalone') === 0;
      });
      if (!keys.length) { showToast('⚠️ Fichier vide, rien à importer'); return; }
      const ok = confirm('⚠️ Importer ces données remplacera ta progression actuelle sur cet appareil (' + keys.length + ' élément(s) : XP, parties, réglages...).\n\nContinuer ?');
      if (!ok) return;
      let imported = 0;
      keys.forEach(function(k){
        try {
          const v = bundle.data[k];
          localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          imported++;
        } catch(e){}
      });
      showToast('✅ ' + imported + ' élément(s) importé(s). Rechargement…');
      setTimeout(function(){ location.reload(); }, 1200);
    };
    reader.readAsText(file);
  };
  input.click();
}

function resetAllData() {
  // Si connecté à un backend : demander aussi la suppression serveur (droit à l'oubli)
  try{ if(typeof api!=='undefined' && api.online && typeof currentUser!=='undefined' && currentUser){ api.deleteAccount(); } }catch(e){}
  const ok = confirm('⚠️ Réinitialiser toutes vos données ?\n\nCela effacera définitivement :\n• Votre progression (XP, niveau, ELO)\n• Vos statistiques (victoires, défaites, radar)\n• Votre historique de parties\n• Vos préférences et votre session\n\nCette action est irréversible.');
  if (!ok) return;

  // Toutes les clés de stockage de l'application
  const keys = [
    'abalone_progress', 'abalone_session', 'abalone_profils', 'abalone_a11y', 'abalone_lang',
    'abalone_lang_banner_dismissed', 'abalone_marble_skin', 'abalone_referral_credits',
    'abalone_sidebar', 'abalone_token_secret', 'abalone_welcome_seen'
  ];
  try {
    keys.forEach(function(k){ localStorage.removeItem(k); });
    // Clés dynamiques (tournois inscrits : abalone_tournament_AAAA-MM)
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key.indexOf('abalone_tournament_') === 0) localStorage.removeItem(key);
    }
  } catch(e) {}

  // Réinitialise l'état en mémoire
  if (typeof defaultProgress === 'function') {
    progress = defaultProgress();
    saveProgress(progress);
  }
  currentUser = null;
  try { clearSession(); } catch(e) {}

  showToast('🗑️ Toutes vos données ont été réinitialisées');
  // Recharge la page pour repartir d'un état propre
  setTimeout(function(){ location.reload(); }, 1200);
}


function updateNavAuth() {
  const zone = document.getElementById('nav-auth-zone');
  if (!zone) return;
  if (currentUser) {
    const init = (currentUser.username||'?')[0].toUpperCase();
    const roleTag = currentUser.role==='writer'
      ? '<span style="font-size:9px;padding:2px 6px;background:rgba(138,114,210,0.2);color:#b89ef0;border-radius:8px;font-weight:700;margin-left:4px">REDACTEUR</span>'
      : '<span style="font-size:9px;padding:2px 6px;background:rgba(200,168,75,0.2);color:var(--gold);border-radius:8px;font-weight:700;margin-left:4px">JOUEUR</span>';
    zone.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="showPage('profile')">
        <div style="width:34px;height:34px;border-radius:50%;background:${currentUser.color||'#2d5a3d'};display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:900;font-family:'Playfair Display',serif;color:var(--gold);border:2px solid var(--border)">${init}</div>
        <div style="line-height:1.2">
          <span style="font-size:13px;font-weight:600;color:var(--white)">${escapeHtml(currentUser.username)}${roleTag}</span><br>
          <span style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace">ELO ${(typeof progress !== 'undefined' && progress && progress.elo) || 1200}</span>
        </div>
      </div>
      <button onclick="logout()" style="padding:6px 12px;background:none;border:1px solid rgba(192,57,43,0.3);color:#e05c4b;border-radius:6px;cursor:pointer;font-size:12px;font-family:'DM Sans',sans-serif">Deco</button>`;
  } else {
    zone.innerHTML = `
      <button class="btn-ghost" onclick="openModal('login')">Se connecter</button>
      <button class="btn-gold" onclick="openModal('signup')">S\'enregistrer</button>`;
  }
  const guest = document.getElementById('profile-guest');
  const logged = document.getElementById('profile-logged');
  if (guest) guest.style.display = currentUser ? 'none' : 'flex';
  if (logged) logged.style.display = currentUser ? 'block' : 'none';
}

function setAvatarColor(col) {
  if (!currentUser) return;
  currentUser.color = col;
  saveSession(currentUser);
  const disp = document.getElementById('profile-avatar-display');
  if (disp) disp.style.background = col;
  const sp = document.getElementById('settings-avatar-preview');
  if (sp) sp.style.background = col;
  updateNavAuth();
  showToast('Couleur avatar mise a jour');
}

function saveGeneralSettings() {
  if (!currentUser) return;
  const ancien = currentUser.username;
  const nomEl = document.getElementById('settings-username');
  const nouveau = ((nomEl && nomEl.value) || '').trim();
  if (nouveau && _profilCle(nouveau) !== _profilCle(ancien)) {
    if (nouveau.length < 3 || nouveau.length > 24 || !/^[\p{L}\p{N} _.\-]+$/u.test(nouveau)) { showToast(_tr('⚠️ Nom : 3 à 24 lettres, chiffres, espaces, - _ .', '⚠️ Name: 3 to 24 letters, digits, spaces, - _ .')); return; }
    if (_profilTrouver(nouveau)) { showToast(_tr('⚠️ Ce nom a déjà un profil dans ce navigateur', '⚠️ This name already has a profile in this browser')); return; }
  }
  const fields = { username:'settings-username', email:'settings-email', country:'settings-country', bio:'settings-bio' };
  for (const [key,id] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el && el.value.trim()) currentUser[key] = el.value.trim();
  }
  // renomme : l'ancienne entree du registre disparait, la nouvelle est ecrite par saveSession
  if (_profilCle(currentUser.username) !== _profilCle(ancien)) {
    const tous = _profilsLire(); delete tous[_profilCle(ancien)]; _profilsEcrire(tous);
  }
  saveSession(currentUser);
  updateNavAuth();
  renderProfile();
  showToast(_tr('Profil mis à jour !', 'Profile updated!'));
}

async function savePassword() {
  const cur = document.getElementById('pw-current')?.value;
  const nw  = document.getElementById('pw-new')?.value;
  const cf  = document.getElementById('pw-confirm')?.value;
  if (!cur) { showToast('⚠️ Entrez votre mot de passe actuel'); return; }
  if (!nw || nw.length < 8) { showToast('⚠️ Nouveau mot de passe trop court (min. 8 car.)'); return; }
  if (nw !== cf) { showToast('⚠️ Les mots de passe ne correspondent pas'); return; }

  // Vérifier l'ancien mot de passe si stocké hashé
  if (currentUser) {
    if (currentUser.passwordHash) {
      const check = await SEC.hashPassword(cur, currentUser.passwordSalt);
      if (check.hash !== currentUser.passwordHash) {
        showToast('❌ Mot de passe actuel incorrect');
        return;
      }
    }
    // Hasher le nouveau mot de passe
    const hashed = await SEC.hashPassword(nw);
    currentUser.passwordHash = hashed.hash;
    currentUser.passwordSalt = hashed.salt;
    currentUser.password = '***';
    await saveSession(currentUser);
    showToast('🔐 Mot de passe mis à jour et hashé PBKDF2 !');
    ['pw-current','pw-new','pw-confirm'].forEach(function(id){
      const el = document.getElementById(id); if(el) el.value='';
    });
  }
}

/* showSettingsTab : dans 29-security-score-and-puzzles-state.js */




/* Modal shake animation on error */
function shakeModal(id) {
  const m = document.querySelector(`#${id} .modal`);
  m.style.animation = 'shake 0.4s ease';
  setTimeout(() => m.style.animation = '', 400);
}

/* Shake keyframes (injected once) */
const shakeStyle = document.createElement('style');
shakeStyle.textContent = '@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}';
document.head.appendChild(shakeStyle);

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
}

/* ═══════════════════════════════════════════
   PARTAGE SUR LES RÉSEAUX SOCIAUX
═══════════════════════════════════════════ */
// ⚠️ CANONICAL_URL — voir le marqueur identique dans le <head> : à remplacer
// par 'https://www.abalassembly.com/' le jour où le domaine est configuré.
const SHARE_URL = 'https://ocj94.github.io/Abalassembly/';

function _lienSite() { return SHARE_URL + (currentLang() === 'EN' ? '?lang=en' : ''); }

/* Le message de fin de partie. Avant (v2.57) : toujours un message de victoire (« ... gagner
   une partie d'Abalone ! 🏆 »), meme apres une defaite. Il suit maintenant la vraie fin de partie
   (_finPartie, relevee par l'evenement abalassembly:gameOver) : victoire, defaite, nulle, ou
   partie a deux sur le meme ecran, avec le score, l'adversaire et le nombre de coups. */
function buildShareText() {
  const f = (typeof _finPartie !== 'undefined') ? _finPartie : null;
  if (!f) return _tr('Une partie d’Abalone ? Gratuit, sans pub, sans compte ⚫⚪', 'Fancy a game of Abalone? Free, no ads, no account ⚫⚪');
  const nom = function (c) { return c === 'black' ? _tr('Noirs', 'Black') : _tr('Blancs', 'White'); };
  const ej = function (c) { return c === 'black' ? f.cb : f.cw; };          // billes ejectees PAR ce camp
  const autre = function (c) { return c === 'black' ? 'white' : 'black'; };
  const coups = f.coups + ' ' + _tr('coups', 'moves');
  const raison = f.reason === 'resign' ? _tr(' par abandon', ' by resignation') : f.reason === 'temps' ? _tr(' au temps', ' on time') : '';
  const adv = f.mode === 'ai' ? _tr('l’IA' + (f.niveau ? ' niveau ' + f.niveau : ''), 'the AI' + (f.niveau ? ' (level ' + f.niveau + ')' : ''))
            : (f.adv || _tr('mon adversaire', 'my opponent'));
  if (!f.winner) {
    return _tr('Partie nulle à Abalone' + (f.mode === 'local' ? '' : ' contre ' + adv) + ' (' + ej('black') + '-' + ej('white') + ', ' + coups + ') ⚫⚪',
               'Drawn game of Abalone' + (f.mode === 'local' ? '' : ' against ' + adv) + ' (' + ej('black') + '-' + ej('white') + ', ' + coups + ') ⚫⚪');
  }
  const score = ej(f.winner) + '-' + ej(autre(f.winner));
  if (f.mode === 'local') {
    return _tr('Partie d’Abalone à deux : les ' + nom(f.winner) + ' gagnent ' + score + raison + ' en ' + coups + ' ⚫⚪',
               'Two-player game of Abalone: ' + nom(f.winner) + ' wins ' + score + raison + ' in ' + coups + ' ⚫⚪');
  }
  if (f.winner === f.moi) {
    return _tr('J’ai battu ' + adv + ' à Abalone : ' + score + raison + ', en ' + coups + ' 🏆',
               'I beat ' + adv + ' at Abalone: ' + score + raison + ', in ' + coups + ' 🏆');
  }
  const monScore = ej(f.moi) + '-' + ej(autre(f.moi));
  return _tr('Battu par ' + adv + ' à Abalone (' + monScore + raison + ', ' + coups + '). Revanche ? ⚫⚪',
             'Beaten by ' + adv + ' at Abalone (' + monScore + raison + ', ' + coups + '). Rematch? ⚫⚪');
}

function shareResult() {
  const text = buildShareText();
  // API native de partage (mobile surtout)
  if (navigator.share) {
    navigator.share({ title: 'Abalassembly', text: text, url: _lienSite() })
      .catch(function(err){ if (!err || err.name !== 'AbortError') openShareModal(text); });
  } else {
    openShareModal(text);
  }
}

function shareInvite() {
  const text = _tr('Rejoins-moi sur Abalassembly pour une partie d’Abalone ! ⚫⚪', 'Join me on Abalassembly for a game of Abalone! ⚫⚪');
  const url = (typeof referralLink === 'function') ? referralLink() : _lienSite();
  if (navigator.share) {
    navigator.share({ title: 'Abalassembly', text: text, url: url })
      .catch(function(err){ if (!err || err.name !== 'AbortError') openShareModal(text, url); });
  } else {
    openShareModal(text, url);
  }
}

/* Avant (v2.57), la fenetre proposait aussi Discord, YouTube et Twitch, vers des adresses
   « abalassembly » qui n'existent pas (« à remplacer par tes vraies pages ») : retirees. */
let _partageMessage = '';   // le message de la fenetre de partage ouverte (texte + adresse)
function openShareModal(text, url) {
  url = url || _lienSite();
  _partageMessage = text + ' ' + url;
  const enc = encodeURIComponent(text);
  const encUrl = encodeURIComponent(url);
  const links = {
    twitter:  'https://twitter.com/intent/tweet?text=' + enc + '&url=' + encUrl,
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encUrl + '&quote=' + enc,
    whatsapp: 'https://wa.me/?text=' + enc + '%20' + encUrl,
    telegram: 'https://t.me/share/url?url=' + encUrl + '&text=' + enc,
    reddit:   'https://www.reddit.com/submit?url=' + encUrl + '&title=' + enc,
  };
  let modal = document.getElementById('share-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'share-modal';
    modal.className = 'share-modal-overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML =
    '<div class="share-modal-box">' +
      '<div class="share-modal-title">📤 Partager</div>' +
      '<div class="share-modal-text">' + text.replace(/</g,'&lt;') + '</div>' +
      '<div class="share-btns">' +
        '<a href="'+links.twitter+'" target="_blank" rel="noopener" class="share-btn tw">𝕏 / Twitter</a>' +
        '<a href="'+links.facebook+'" target="_blank" rel="noopener" class="share-btn fb">Facebook</a>' +
        '<a href="'+links.whatsapp+'" target="_blank" rel="noopener" class="share-btn wa">WhatsApp</a>' +
        '<a href="'+links.telegram+'" target="_blank" rel="noopener" class="share-btn tg">Telegram</a>' +
        '<a href="'+links.reddit+'" target="_blank" rel="noopener" class="share-btn rd">Reddit</a>' +
      '</div>' +
      '<button class="share-copy" onclick="copyShareLink()">📋 ' + _tr('Copier le message', 'Copy the message') + '</button>' +
      '<button class="share-close" onclick="closeShareModal()">Fermer</button>' +
    '</div>';
  modal.classList.add('show');
}

function closeShareModal() {
  const m = document.getElementById('share-modal');
  if (m) m.classList.remove('show');
}

function copyShareLink() {
  const text = _partageMessage || (buildShareText() + ' ' + _lienSite());
  _copierTexte(text, _tr('📋 Message copié', '📋 Message copied'));
}

/* ═══════════════════════════════════════════
   LEADERBOARD DATA
═══════════════════════════════════════════ */
const lbData = [];  // Classement vide — se remplira avec de vrais joueurs

const speedColor = { 'Très rapide':'#e05c4b', 'Rapide':'#c8a84b', 'Moyen':'#4a9463', 'Lent':'#8898e0', 'Très lent':'#a078c8' };

function openPlayerStats(idx) {
  const p = lbData[idx];
  const modal = document.getElementById('stats-modal');
  const keys = ['attaque','defense','vitesse','precision','endurance','ouverture'];
  const labels = ['Attaque','Défense','Vitesse','Précision','Endurance','Ouverture'];
  const vals = keys.map(k => p.radar[k]);
  const maxVal = 100;
  const cx = 150, cy = 150, r = 110;
  const points = vals.map((v, i) => {
    const angle = (Math.PI * 2 * i / vals.length) - Math.PI/2;
    const d = r * v / maxVal;
    return { x: cx + d * Math.cos(angle), y: cy + d * Math.sin(angle) };
  });
  const labelPts = labels.map((l, i) => {
    const angle = (Math.PI * 2 * i / labels.length) - Math.PI/2;
    return { x: cx + (r+24) * Math.cos(angle), y: cy + (r+24) * Math.sin(angle), l };
  });
  const rings = [20,40,60,80,100].map(pct => {
    const rr = r * pct / 100;
    const pts = keys.map((_, i) => {
      const angle = (Math.PI * 2 * i / keys.length) - Math.PI/2;
      return `${cx + rr * Math.cos(angle)},${cy + rr * Math.sin(angle)}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="rgba(200,168,75,0.12)" stroke-width="1"/>`;
  }).join('');
  const axes = keys.map((_, i) => {
    const angle = (Math.PI * 2 * i / keys.length) - Math.PI/2;
    return `<line x1="${cx}" y1="${cy}" x2="${cx + r * Math.cos(angle)}" y2="${cy + r * Math.sin(angle)}" stroke="rgba(200,168,75,0.18)" stroke-width="1"/>`;
  }).join('');
  const dataPolygon = points.map(p => `${p.x},${p.y}`).join(' ');
  const lblSvg = labelPts.map(lp => {
    const anchor = lp.x < cx - 5 ? 'end' : lp.x > cx + 5 ? 'start' : 'middle';
    return `<text x="${lp.x}" y="${lp.y}" fill="#c8a84b" font-size="10" text-anchor="${anchor}" dominant-baseline="middle" font-family="DM Sans,sans-serif">${lp.l}</text>`;
  }).join('');
  const valLabels = vals.map((v, i) => {
    const angle = (Math.PI * 2 * i / vals.length) - Math.PI/2;
    const d = r * v / maxVal;
    const px = cx + d * Math.cos(angle);
    const py = cy + d * Math.sin(angle);
    return `<circle cx="${px}" cy="${py}" r="3" fill="#c8a84b"/><text x="${px+5}" y="${py-5}" fill="#e8c96e" font-size="9" font-family="DM Mono,monospace">${v}</text>`;
  }).join('');
  const radarSvg = `<svg viewBox="0 0 300 300" width="300" height="300" xmlns="http://www.w3.org/2000/svg">
    ${rings}${axes}
    <polygon points="${dataPolygon}" fill="rgba(200,168,75,0.18)" stroke="#c8a84b" stroke-width="2"/>
    ${valLabels}${lblSvg}
  </svg>`;
  const wr = Math.round(p.w / p.games * 100);
  document.getElementById('stats-modal-content').innerHTML = `
    <div style="display:flex;align-items:center;gap:18px;margin-bottom:28px">
      <div style="width:56px;height:56px;border-radius:50%;background:${p.color};color:var(--cream);display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;border:2px solid var(--border)">${escapeHtml(p.init)}</div>
      <div>
        <div style="font-family:'Playfair Display',serif;font-size:24px;font-weight:900;color:var(--white)">${escapeHtml(p.name)}</div>
        <div style="font-size:13px;color:var(--muted)">${escapeHtml(p.country)} · <span class="badge-gm ${p.badge}">${escapeHtml(p.label)}</span></div>
      </div>
      <div style="margin-left:auto;text-align:right">
        <div style="font-family:'DM Mono',monospace;font-size:28px;font-weight:700;color:var(--gold)">${p.elo}</div>
        <div style="font-size:11px;color:var(--muted)">ELO</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
      <div>
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:16px">Graphique Radar</div>
        <div style="display:flex;justify-content:center;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px">${radarSvg}</div>
      </div>
      <div>
        <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--muted);margin-bottom:16px">Statistiques détaillées</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${[
            ['⚔️ Victoires',`${p.w} (${wr}%)`,'var(--accent-green-light)'],
            ['🛡 Défaites',`${p.l}`,'#e05c4b'],
            ['🤝 Nulles',`${p.d}`,'var(--gold)'],
            ['🎮 Total parties',`${p.games}`,'var(--text)'],
            ['⏱ Temps moy./partie',p.avgTime,'var(--text)'],
            ['💥 Billes éjectées/partie',p.ejPerGame.toFixed(1),'#e8c96e'],
            ['⚡ Vitesse de jeu',p.speed,speedColor[p.speed]||'var(--text)'],
            ['🕐 Sec./coup moyen',`${p.secPerMove}s`,'var(--text)'],
          ].map(([label,val,col])=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:6px">
              <span style="font-size:13px;color:var(--muted)">${label}</span>
              <span style="font-family:'DM Mono',monospace;font-size:14px;font-weight:600;color:${col}">${val}</span>
            </div>`).join('')}
        </div>
        <div style="margin-top:16px;padding:14px;background:rgba(200,168,75,0.06);border:1px solid rgba(200,168,75,0.2);border-radius:8px;font-size:12px;color:var(--muted)">
          📝 Données issues de la communauté <a href="https://onlineabalone.wordpress.com/" target="_blank" rel="noopener noreferrer" style="color:var(--gold)">Abalone Online</a>
        </div>
      </div>
    </div>`;
  modal.style.display = 'flex';
}

/* ─── Filtres du classement ─── */
let lbFilters = { mode:'all', region:'world', period:'all' };

const COUNTRY_REGION = {
  '🇩🇪':'europe', '🇫🇷':'europe', '🇧🇪':'europe', '🇪🇸':'europe', '🇮🇹':'europe',
  '🇷🇺':'europe', '🇬🇧':'europe', '🇳🇱':'europe', '🇵🇱':'europe',
  '🇯🇵':'asia', '🇰🇷':'asia', '🇨🇳':'asia',
  '🇺🇸':'americas', '🇨🇦':'americas', '🇧🇷':'americas'
};

function playerRegion(p) {
  const flag = (p.country || '').trim().split(' ')[0];
  return COUNTRY_REGION[flag] || 'other';
}

/* Les filtres Blitz / vs IA / ce mois / cette semaine FABRIQUAIENT des chiffres a partir des
   donnees de base (« variation deterministe… donnees simulees ») : un ELO blitz inventé, des
   victoires du mois inventees. Supprime : un filtre ne montrera que ce que les donnees contiennent. */
function lbVariant(p) { return Object.assign({}, p); }

function getFilteredLeaderboard() {
  let rows = lbData.slice();
  // Filtre région
  if (lbFilters.region !== 'world') {
    rows = rows.filter(p => playerRegion(p) === lbFilters.region);
  }
  // Applique les variantes de mode/période
  rows = rows.map(p => lbVariant(p, lbFilters.mode, lbFilters.period));
  // Re-trie par ELO et réassigne les rangs
  rows.sort((a,b) => b.elo - a.elo);
  rows.forEach((p,i) => p.rank = i+1);
  return rows;
}

function setLbMode(mode, btn) {
  lbFilters.mode = mode;
  document.querySelectorAll('.lb-mode').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderLeaderboard();
}
function setLbRegion(region, btn) {
  lbFilters.region = region;
  document.querySelectorAll('.lb-region').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderLeaderboard();
}
function setLbPeriod(period, btn) {
  lbFilters.period = period;
  document.querySelectorAll('.lb-period').forEach(b=>b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderLeaderboard();
}

function renderLeaderboard() {
  const tbody = document.getElementById('lb-body');
  // aucune donnee reelle : l'etat vide honnete, pas un tableau vide avec des filtres inutiles
  const vide = document.getElementById('lb-vide'), donnees = document.getElementById('lb-donnees');
  if (vide) vide.style.display = lbData.length ? 'none' : 'block';
  if (donnees) donnees.style.display = lbData.length ? '' : 'none';
  if (!lbData.length) return;
  const rows = getFilteredLeaderboard();
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;padding:40px;color:var(--muted)">Aucun joueur pour ce filtre.</td></tr>';
    return;
  }
  tbody.innerHTML = rows.map((p) => {
    const idx = lbData.findIndex(x => x.name === p.name);  // index réel pour le radar
    const rankClass = p.rank === 1 ? 'top1' : p.rank === 2 ? 'top2' : p.rank === 3 ? 'top3' : '';
    const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : p.rank;
    const wr = p.games ? Math.round(p.w / p.games * 100) : 0;
    const sc = speedColor[p.speed] || 'var(--text)';
    return `
    <tr>
      <td><span class="lb-rank ${rankClass}">${medal}</span></td>
      <td>
        <div class="lb-player">
          <div class="lb-avatar" style="background:${p.color};color:var(--cream)">${escapeHtml(p.init)}</div>
          <div>
            <div class="lb-name">${escapeHtml(p.name)}</div>
            <div class="lb-country">${escapeHtml(p.country)}</div>
          </div>
        </div>
      </td>
      <td><span class="lb-rating">${p.elo}</span></td>
      <td><span class="badge-gm ${p.badge}">${escapeHtml(p.label)}</span></td>
      <td><span class="lb-winrate"><span>${p.w}V</span> / ${p.l}N / ${p.d}D — <span>${wr}%</span></span></td>
      <td><span class="lb-games">${p.games}</span></td>
      <td><span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--text)">${p.avgTime}</span></td>
      <td>
        <span style="font-family:'DM Mono',monospace;font-size:14px;font-weight:600;color:#e8c96e">${p.ejPerGame.toFixed(1)}</span>
        <span style="font-size:11px;color:var(--muted)">/partie</span>
      </td>
      <td><span style="font-size:12px;font-weight:600;color:${sc}">${p.speed}</span><br><span style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace">${p.secPerMove}s/coup</span></td>
      <td>
        <button onclick="openPlayerStats(${idx})" style="background:rgba(200,168,75,0.1);border:1px solid rgba(200,168,75,0.25);color:var(--gold);padding:5px 12px;border-radius:5px;font-size:12px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all 0.2s" onmouseover="this.style.background='rgba(200,168,75,0.2)'" onmouseout="this.style.background='rgba(200,168,75,0.1)'">
          📊 Radar
        </button>
      </td>
    </tr>`;
  }).join('');
}

