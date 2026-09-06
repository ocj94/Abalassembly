/* ═══════════════════════════════════════════
   MODULE OTP — saisie des chiffres de code (2FA classique + TOTP)
   Fusionne 4 fonctions quasi identiques (otpInput/otpInput2, otpBack/otpBack2)
   en une seule implementation parametree par suffixe d'id DOM. Aucun etat
   partage avec le reste du site -- uniquement du DOM local et un appel
   externe (verify2FACode) -- premier module IIFE du fichier : choisi
   precisement parce qu'il ne touche pas a currentUser/selected2FA/_fakeOTP,
   qui eux ont des racines profondes ailleurs (54 references de currentUser
   dans tout le fichier -- verifie avant de choisir ce perimetre).
   Les noms de fonctions globales (otpInput, otpBack, etc.) sont conserves
   a l'identique en fines coquilles, pour que les attributs onkeyup= déjà
   presents dans le HTML continuent de fonctionner sans aucune modification.
═══════════════════════════════════════════ */
const OtpDigitInput = (function(){
  function makeHandlers(suffix, autoSubmit){
    function input(el, idx){
      el.value = el.value.replace(/\D/g,'');
      el.classList.toggle('filled', el.value !== '');
      if (el.value && idx < 6) {
        const next = document.getElementById('2fa-digit-'+(idx+1)+suffix);
        if (next) next.focus();
      }
      if (autoSubmit && idx === 6) checkFilled(suffix);
    }
    function back(e, idx){
      if (e.key === 'Backspace' && !e.target.value && idx > 1) {
        const prev = document.getElementById('2fa-digit-'+(idx-1)+suffix);
        if (prev) prev.focus();
      }
    }
    return { input: input, back: back };
  }
  function checkFilled(suffix){
    const code = [1,2,3,4,5,6].map(function(i){
      const el = document.getElementById('2fa-digit-'+i+suffix);
      return el ? el.value : '';
    }).join('');
    if (code.length === 6 && typeof verify2FACode === 'function') verify2FACode();
  }
  const classic = makeHandlers('', true);
  const totp = makeHandlers('b', false);
  return {
    input: classic.input, back: classic.back,
    input2: totp.input, back2: totp.back,
    checkFilled: checkFilled
  };
})();
function otpInput(el, idx) { OtpDigitInput.input(el, idx); }
function otpBack(e, idx) { OtpDigitInput.back(e, idx); }
function checkOTPFilled() { OtpDigitInput.checkFilled(''); }

function verify2FACode() {
  const code = [1,2,3,4,5,6].map(i => document.getElementById('2fa-digit-'+i).value).join('');
  if (code.length < 6) { showToast('⚠️ Entrez les 6 chiffres du code'); return; }
  // Simulate: any 6-digit code works in demo
  clearInterval(resendCountdown);
  closeModal('2fa');
  loginSuccess();
}

/* TOTP */
function otpInput2(el, idx) { OtpDigitInput.input2(el, idx); }
function otpBack2(e, idx) { OtpDigitInput.back2(e, idx); }
function verifyTOTP() {
  const code = [1,2,3,4,5,6].map(i => document.getElementById('2fa-digit-'+i+'b').value).join('');
  if (code.length < 6) { showToast('⚠️ Entrez le code à 6 chiffres de votre application'); return; }
  closeModal('2fa');
  loginSuccess();
}

/* YubiKey */
function simulateYubiKey() {
  const pulse = document.getElementById('yubikey-pulse');
  pulse.innerHTML = '<div style="font-size:28px;color:var(--accent-green-light)">✅ Clé détectée !</div>';
  setTimeout(() => { closeModal('2fa'); loginSuccess(); }, 900);
}

/* Resend timer */
function startResendTimer(secs) {
  const btn   = document.getElementById('resend-btn');
  const timer = document.getElementById('resend-timer');
  btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none';
  let s = secs;
  timer.textContent = `Nouveau code dans ${s}s`;
  clearInterval(resendCountdown);
  resendCountdown = setInterval(() => {
    s--;
    timer.textContent = s > 0 ? `Nouveau code dans ${s}s` : '';
    if (s <= 0) {
      clearInterval(resendCountdown);
      btn.style.opacity = '1'; btn.style.pointerEvents = 'auto';
    }
  }, 1000);
}
function resendCode() {
  _fakeOTP = String(Math.floor(100000 + Math.random() * 900000));
  showToast(selected2FA === 'sms' ? '📱 Nouveau SMS envoyé !' : '📧 Nouvel email envoyé !');
  startResendTimer(60);
}

/* Fake QR code (checkerboard pattern) */
function drawFakeQR() {
  const c = document.getElementById('qr-canvas');
  if (!c) return;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0,0,140,140);
  ctx.fillStyle = '#000000';
  const seed = 0xABBCA1;
  const cells = 21; const cell = Math.floor(140/cells);
  for (let r=0; r<cells; r++) for (let col=0; col<cells; col++) {
    const v = ((seed ^ (r*31+col*17)) % 3);
    // fixed finder patterns
    const inFinder = (r<7&&col<7)||(r<7&&col>=cells-7)||(r>=cells-7&&col<7);
    if (inFinder) {
      const inInner=(r>=1&&r<=5&&col>=1&&col<=5)||(r>=1&&r<=5&&col>=cells-6&&col<=cells-2)||(r>=cells-6&&r<=cells-2&&col>=1&&col<=5);
      const inCore =(r>=2&&r<=4&&col>=2&&col<=4)||(r>=2&&r<=4&&col>=cells-5&&col<=cells-3)||(r>=cells-5&&r<=cells-3&&col>=2&&col<=4);
      ctx.fillStyle = inCore ? '#000' : inInner ? '#fff' : '#000';
    } else { ctx.fillStyle = v===0 ? '#000' : '#fff'; }
    ctx.fillRect(col*cell, r*cell, cell, cell);
  }
  // Logo center
  ctx.fillStyle='#ffffff'; ctx.fillRect(54,54,32,32);
  ctx.fillStyle='#c8a84b'; ctx.font='bold 20px serif'; ctx.textAlign='center';
  ctx.fillText('⬡',70,75);
}

/* Login success */
async function loginSuccess() {
  const methodLabels = {
    email: 'Email (OTP 6 chiffres)',
    sms: 'SMS (OTP 6 chiffres)',
    totp: 'Authenticator (TOTP)',
    yubikey: 'YubiKey FIDO2',
  };

  // Match preset accounts
  const PRESETS = {
    'fightclub': { username:'FightClub (Frederic Garnier)', email:'fightclub@abalone.com', role:'writer', color:'#4a1c5a', bio:'Fondateur du blog Abalone Online (2013). Theoricien, encyclopediste, redacteur principal. Contact: +33 6 61 88 69 85', country:'FR', elo:1950, games:312, wins:198, streak:7, joinDate:'Decembre 2013', eloMax:2105 },
    'olivier':   { username:'ocj94', email:'', role:'player', color:'#2d5a3d', bio:'Joueur passionné et promoteur de la communauté abalonienne mondiale.', country:'FR', elo:null, games:0, wins:0, streak:0, joinDate:'', eloMax:null },
  };

  const emailVal = (document.getElementById('login-email')?.value||'').trim().toLowerCase();
  const usernameVal = (document.getElementById('signup-username')?.value||'').trim();
  const emailSignup = (document.getElementById('signup-email')?.value||'').trim().toLowerCase();

  // Chemin backend (dormant tant que BACKEND.enabled===false) : si le serveur
  // authentifie, on utilise SON utilisateur ; sinon on garde la logique locale.
  if (typeof api!=='undefined' && api.online) {
    try {
      const remote = await api.login({ email: emailVal||emailSignup, password: (document.getElementById('login-pw')?.value||'') });
      if (remote) { currentUser = remote; saveSession(currentUser); updateNavAuth();
        // Synchronise la progression depuis le serveur (source de vérité si en ligne)
        try { const rp = await api.fetchProgress(); if (rp) { saveProgress(rp); if (typeof refreshProgressUI==='function') refreshProgressUI(); } } catch(e) {}
        document.getElementById('success-username').textContent = currentUser.username;
        document.getElementById('success-2fa-method').textContent = (methodLabels[selected2FA]||'') + ' active';
        openModal('login-success'); return; }
    } catch(e) {}
  }

  let matched = null;
  for (const [k,acc] of Object.entries(PRESETS)) {
    if (emailVal === acc.email || emailVal === k || emailSignup === acc.email) { matched = acc; break; }
  }

  if (matched) {
    currentUser = {...matched};
  } else {
    const displayName = usernameVal || emailVal.split('@')[0] || 'Joueur';
    currentUser = { username:displayName, email:emailSignup||emailVal, role:'player', color:'#2d5a3d', bio:'', country:'', elo:1200, games:0, wins:0, streak:0, joinDate: new Date().toLocaleDateString('fr-FR',{month:'long',year:'numeric'}), eloMax:1200 };
  }

  saveSession(currentUser);
  updateNavAuth();

  document.getElementById('success-username').textContent = currentUser.username;
  document.getElementById('success-2fa-method').textContent = (methodLabels[selected2FA]||'') + ' active';
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
    'abalone_progress', 'abalone_session', 'abalone_a11y', 'abalone_lang',
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
          <span style="font-size:11px;color:var(--muted);font-family:'DM Mono',monospace">ELO ${currentUser.elo||1200}</span>
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
  const fields = { username:'settings-username', email:'settings-email', country:'settings-country', bio:'settings-bio' };
  for (const [key,id] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el && el.value.trim()) currentUser[key] = el.value.trim();
  }
  saveSession(currentUser);
  updateNavAuth();
  renderProfile();
  showToast('Profil mis a jour !');
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

function toggle2FAMethod(method) {
  const btn=document.getElementById('2fa-btn-'+method);
  const status=document.getElementById('2fa-status-'+method);
  if (!btn||!status) return;
  const isActive = btn.textContent.trim()==='Desactiver';
  btn.textContent = isActive ? 'Activer' : 'Desactiver';
  btn.style.color = isActive ? 'var(--text)' : 'var(--accent-green-light)';
  status.textContent = isActive ? 'Inactif' : 'Actif';
  status.style.color = isActive ? 'var(--muted)' : 'var(--accent-green-light)';
  if (currentUser) {
    if (!currentUser.twofa) currentUser.twofa=[];
    if (isActive) currentUser.twofa=currentUser.twofa.filter(m=>m!==method);
    else if (!currentUser.twofa.includes(method)) currentUser.twofa.push(method);
    saveSession(currentUser);
  }
  showToast(isActive ? method+' desactive' : method+' active !');
}

/* showSettingsTab — voir version complète ci-dessous */




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

function buildShareText() {
  // Construit un message selon l'état de la partie
  const lvl = (typeof loadProgress === 'function') ? (loadProgress().level || 1) : 1;
  return "Je viens de gagner une partie d'Abalone sur Abalassembly ! 🏆 Niveau " + lvl + " · Venez m'affronter ⚫⚪";
}

function shareResult() {
  const text = buildShareText();
  // API native de partage (mobile surtout)
  if (navigator.share) {
    navigator.share({ title: 'Abalassembly', text: text, url: SHARE_URL })
      .catch(function(){ openShareModal(text); });
  } else {
    openShareModal(text);
  }
}

function shareInvite() {
  const text = "Rejoins-moi sur Abalassembly pour une partie d'Abalone ! ⚫⚪";
  if (navigator.share) {
    navigator.share({ title: 'Abalassembly', text: text, url: SHARE_URL })
      .catch(function(){ openShareModal(text); });
  } else {
    openShareModal(text);
  }
}

function openShareModal(text) {
  const enc = encodeURIComponent(text);
  const encUrl = encodeURIComponent(SHARE_URL);
  const links = {
    twitter:  'https://twitter.com/intent/tweet?text=' + enc + '&url=' + encUrl,
    facebook: 'https://www.facebook.com/sharer/sharer.php?u=' + encUrl + '&quote=' + enc,
    whatsapp: 'https://wa.me/?text=' + enc + '%20' + encUrl,
    telegram: 'https://t.me/share/url?url=' + encUrl + '&text=' + enc,
    reddit:   'https://www.reddit.com/submit?url=' + encUrl + '&title=' + enc,
    // Liens communauté (à remplacer par tes vraies pages)
    discord:  'https://discord.gg/abalassembly',
    youtube:  'https://www.youtube.com/@abalassembly',
    twitch:   'https://www.twitch.tv/abalassembly',
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
        '<a href="'+links.discord+'" target="_blank" rel="noopener" class="share-btn dc">Discord</a>' +
        '<a href="'+links.youtube+'" target="_blank" rel="noopener" class="share-btn yt">YouTube</a>' +
        '<a href="'+links.twitch+'" target="_blank" rel="noopener" class="share-btn tv">Twitch</a>' +
      '</div>' +
      '<button class="share-copy" onclick="copyShareLink()">🔗 Copier le lien</button>' +
      '<button class="share-close" onclick="closeShareModal()">Fermer</button>' +
    '</div>';
  modal.classList.add('show');
}

function closeShareModal() {
  const m = document.getElementById('share-modal');
  if (m) m.classList.remove('show');
}

function copyShareLink() {
  const text = buildShareText() + ' ' + SHARE_URL;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function(){ showToast('🔗 Lien copié !'); });
  } else {
    showToast('Copiez : ' + SHARE_URL);
  }
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

// Variation déterministe de l'ELO selon le mode/période (données simulées)
function lbVariant(p, mode, period) {
  let elo = p.elo, w = p.w, l = p.l, d = p.d;
  const seed = (p.name.charCodeAt(0) + p.name.length) % 7;
  if (mode === 'blitz')   { elo -= 40 + seed*8; }
  else if (mode === 'ai') { elo += 15 + seed*5; }
  else if (mode === 'classic') { elo += 5; }
  if (period === 'month') { w = Math.round(w*0.18)+seed; l = Math.round(l*0.18); d = Math.round(d*0.15); }
  else if (period === 'week') { w = Math.round(w*0.05)+1; l = Math.round(l*0.05); d = Math.round(d*0.04); }
  const games = w + l + d;
  return Object.assign({}, p, { elo, w, l, d, games: games || p.games });
}

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

