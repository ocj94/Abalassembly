/* ═══════════════════════════════════════════
   THEME CUSTOMIZER
═══════════════════════════════════════════ */
let boardTheme = { theme:'dark', night:false, bg1:'#1e2b28', bg2:'#131b19', blackGrad1:'#666', blackGrad2:'#0a0a0a', whiteGrad1:'#fff', whiteGrad2:'#bbb', marbleSkin:'kintsugi' };

/* ═══════════════════════════════════════════
   SKINS DE BILLES — dégradés multi-stops
   Inspirés des thèmes d'abal.online (Vincent Frochot)
   Chaque skin définit les arrêts de couleur radiaux
   pour les billes noires (b) et blanches (w)
═══════════════════════════════════════════ */
const MARBLE_SKINS = {
  kids: {
    name:'Enfant', desc:'Couleurs vives et contrastées, pensées pour les petits joueurs',
    b:['#ff9a5c','#ff6b35','#e04e1b'],
    w:['#7ee0ff','#4fc3f7','#2196c9'],
    unlock:{ type:'free' }                       // toujours disponible — nécessaire dès l'activation du mode Enfant
  },
  kintsugi: {
    name:'Kintsugi', desc:'Laque noire veinée d\u2019or · nacre lunaire', veins:true,
    b:['#3a3a3c','#1a1a1c','#050506'],
    w:['#ffffff','#e8e6e2','#c4c2c0','#9a9a9c'],
    unlock:{ type:'free' }                       // débloqué d'office (skin par défaut)
  },
  cosmic: {
    name:'Cosmique', desc:'Noir profond · blanc bleuté nacré',
    b:['#4A4A42','#2A2A22','#060600'],
    w:['#FAFAFF','#EAEAEF','#E0E0EA','#DADADF','#9F9FBC'],
    unlock:{ type:'games', value:1 }             // dès la 1re partie jouée
  },
  glass: {
    name:'Verre', desc:'Billes de verre poli brillant',
    b:['#606060','#4A4A4A','#2A2A22','#1A1A11','#060600'],
    w:['#f4f4f4','#E8E8E8','#dfdfdf','#CCC','#888888'],
    unlock:{ type:'wins', value:1 }              // après 1re victoire
  },
  fun: {
    name:'Fun', desc:'Reflet clair marqué · contraste fort',
    b:['#AAAAAF','#606066','#2A2A22','#1A1A11','#020202'],
    w:['#FFFFFF','#E6E6E6','#E6E6E6','#dadada','#888888'],
    unlock:{ type:'level', value:3 }             // niveau 3
  },
  eden: {
    name:'Eden', desc:'Gris-violet sombre · doux',
    b:['#5e5257','#2e2227','#111111'],
    w:['#f8f4f6','#e4dce0','#b8a8b0'],
    unlock:{ type:'level', value:5 }             // niveau 5
  },
  ruby: {
    name:'Rubis', desc:'Rouge profond · ivoire chaud',
    b:['#C54A4A','#B52A2A','#555555'],
    w:['#fffaf0','#e8dcc8','#c4b89a'],
    unlock:{ type:'wins', value:10 }             // 10 victoires
  },
  rosy: {
    name:'Bois rosé', desc:'Brun rosé · perle douce',
    b:['#DCAFAF','#AC7F7F','#6C3F3F'],
    w:['#fdf6f4','#e8d8d4','#bca8a4'],
    unlock:{ type:'elo', value:1200 }            // Elo 1200
  },
  emerald: {
    name:'Émeraude', desc:'Vert profond · jade clair',
    b:['#3aa05a','#1f6e3a','#0a3a1c'],
    w:['#f0fff4','#d8f0e0','#a8d0b8'],
    unlock:{ type:'level', value:10 }            // niveau 10
  },
  sapphire: {
    name:'Saphir', desc:'Bleu nuit · azur glacé',
    b:['#3a5ca0','#1f3a6e','#0a1c3a'],
    w:['#f0f4ff','#d8e0f0','#a8b8d0'],
    unlock:{ type:'elo', value:1500 }            // Elo 1500
  },
  ardoise: {
    name:'Ardoise', desc:'Pierre bleutée · craie mate — sobre et lisible',
    b:['#5a646e','#39424b','#161b20'],
    w:['#fbfbf8','#eceae3','#c6c3b8'],
    unlock:{ type:'games', value:5 }             // 5 parties jouées
  },
  cuivre: {
    name:'Cuivre', desc:'Métal chaud patiné · vert-de-gris clair',
    b:['#c08048','#8a5228','#3d2210'],
    w:['#f2f7f2','#d9e8dd','#a9c2b2'],
    unlock:{ type:'wins', value:5 }              // 5 victoires
  },
  nacre: {
    name:'Nacre', desc:'Reflets irisés · clin d\u2019\u0153il à la notation Nacre',
    b:['#6a6f86','#3d4257','#14161f'],
    w:['#ffffff','#eef3ff','#dde8f2','#c2d2e0'],
    unlock:{ type:'elo', value:1300 }            // Elo 1300
  },
  obsidienne: {
    name:'Obsidienne', desc:'Verre volcanique · cendre claire',
    b:['#2e2a33','#17141b','#050406'],
    w:['#f6f2ee','#ded7cf','#ab9f95'],
    unlock:{ type:'level', value:7 }             // niveau 7
  },
  aurore: {
    name:'Aurore', desc:'Nuit polaire · voile vert et rose',
    b:['#2b4a5e','#17303f','#081520'],
    w:['#eafff4','#cdf5e2','#f3d4ea','#b9c9e8'],
    unlock:{ type:'level', value:15 }            // niveau 15
  },
  marbre: {
    name:'Marbre', desc:'Veines minérales · pierre polie', veins:true,
    b:['#4c4c50','#2b2b2f','#101012'],
    w:['#fdfdfb','#eeeae4','#cfc8bf','#a79f96'],
    unlock:{ type:'games', value:50 }            // 50 parties jouées
  },
  lave: {
    name:'Lave', desc:'Basalte refroidi \u00b7 coul\u00e9e incandescente',
    b:['#4a3f3a','#241d1a','#0a0605'],
    w:['#fff3d6','#ffb347','#f26419','#a3320c'],
    unlock:{ type:'wins', value:25 }             // 25 victoires
  },
  banquise: {
    name:'Banquise', desc:'Glace profonde \u00b7 gel\u00e9e de surface',
    b:['#2b4756','#152a36','#04101a'],
    w:['#f2fbff','#d6f0fa','#a8d8ec','#7fb8d4'],
    unlock:{ type:'games', value:25 }            // 25 parties jou\u00e9es
  },
  encre: {
    name:'Encre', desc:'Lavis noir \u00b7 papier de riz', veins:true,
    b:['#3d3a36','#1c1a17','#070605'],
    w:['#fbf7ee','#efe6d4','#d8c9ae','#b3a288'],
    unlock:{ type:'level', value:20 }            // niveau 20
  },
  amethyste: {
    name:'Améthyste', desc:'Quartz violet profond · lilas glacé',
    b:['#8b5fb0','#5e3a82','#2e1a4a','#140a24'],
    w:['#f5eefc','#e0cdf0','#c4a8de'],
    unlock:{ type:'elo', value:1400 }            // Elo 1400 — entre Nacre (1300) et Saphir (1500)
  },
  corail: {
    name:'Corail', desc:'Récif chaud · écume claire',
    b:['#e8896a','#c85a3f','#8a3222','#3d150d'],
    w:['#fff3ea','#ffd9c2','#f0b090'],
    unlock:{ type:'wins', value:15 }             // 15 victoires — entre Rubis (10) et Lave (25)
  },
  titane: {
    name:'Titane', desc:'Métal brossé · gunmetal mat',
    b:['#8a92a0','#5a6270','#2e343e','#12151a'],
    w:['#f4f6f8','#dde2e8','#b8c0ca','#8a94a0'],
    unlock:{ type:'level', value:12 }            // niveau 12 — entre Émeraude (10) et Aurore (15)
  },
  shadow: {
    name:'Ombre d\u2019or', desc:'Noir absolu · or massif — la récompense ultime', veins:true,
    b:['#1a1a1a','#0a0a0a','#000000'],
    w:['#ffd87a','#e8b84b','#9a7820'],
    unlock:{ type:'badge', value:'shutout', label:'Réussir un blanchissage 6-0' }
  },
};

// Détermine si un skin est débloqué selon la progression du joueur
function isSkinUnlocked(key) {
  const sk = MARBLE_SKINS[key];
  if (!sk || !sk.unlock) return true;
  const u = sk.unlock;
  const p = progress;
  switch (u.type) {
    case 'free':  return true;
    case 'games': return (p.gamesPlayed||0) >= u.value;
    case 'wins':  return (p.gamesWon||0) >= u.value;
    case 'level': return (p.level||1) >= u.value;
    case 'elo':   return (p.elo||1000) >= u.value;
    case 'badge': return !!(p.badges && p.badges[u.value]);
    default: return true;
  }
}

// Texte décrivant la condition de déblocage d'un skin
function skinUnlockText(key) {
  const sk = MARBLE_SKINS[key];
  if (!sk || !sk.unlock) return '';
  const u = sk.unlock;
  switch (u.type) {
    case 'free':  return 'Débloqué';
    case 'games': return u.value === 1 ? 'Joue 1 partie' : 'Joue ' + u.value + ' parties';
    case 'wins':  return u.value === 1 ? 'Gagne 1 partie' : 'Gagne ' + u.value + ' parties';
    case 'level': return 'Niveau ' + u.value;
    case 'elo':   return 'Elo ' + u.value;
    case 'badge': return u.label || 'Badge requis';
    default: return '';
  }
}

function applyMarbleSkin() {
  const sk = MARBLE_SKINS[boardTheme.marbleSkin] || MARBLE_SKINS.kintsugi;
  boardTheme.blackStops = sk.b;
  boardTheme.whiteStops = sk.w;
  boardTheme.veins = !!sk.veins;
  // garde la compat avec le système 2-couleurs
  boardTheme.blackGrad1 = sk.b[0]; boardTheme.blackGrad2 = sk.b[sk.b.length-1];
  boardTheme.whiteGrad1 = sk.w[0]; boardTheme.whiteGrad2 = sk.w[sk.w.length-1];
  refreshSetupMarbleSwatches();
}

/* Les boutons "Moi/Adversaire" de l'écran de configuration utilisaient les
   emojis ⚫/⚪ fixes, qui ne reflétaient jamais le skin de billes choisi par
   la personne (Kintsugi, Rubis, Émeraude...). Remplace ces emojis par de
   petits ronds dégradés utilisant les VRAIES couleurs du skin actif (mêmes
   valeurs boardTheme.blackStops/whiteStops que le plateau réel), pour que
   la personne reconnaisse tout de suite quelle couleur elle va jouer.
   Étendu à l'Éditeur de position et à Analyse de partie (« Comprendre la
   position ») : mêmes emojis fixes noir/blanc au même défaut, et labels
   "Noir"/"Blanc" remplacés par "Joueur 1"/"Joueur 2" (demande d'Olivier —
   ces pages servent aussi à préparer des positions où "noir"/"blanc" n'a
   pas toujours de sens, ex. positions personnalisées). */
function _marbleSwatch(stops, size) {
  size = size || 12;
  return '<span style="display:inline-block;width:' + size + 'px;height:' + size + 'px;border-radius:50%;' +
    'background:radial-gradient(circle at 35% 35%, ' + stops + ');' +
    'box-shadow:inset -1px -1px 2px rgba(0,0,0,0.5),0 1px 2px rgba(0,0,0,0.3);' +
    'vertical-align:-1px;margin-right:4px"></span>';
}
function refreshSetupMarbleSwatches() {
  const bStops = (boardTheme.blackStops || MARBLE_SKINS.kintsugi.b).join(', ');
  const wStops = (boardTheme.whiteStops || MARBLE_SKINS.kintsugi.w).join(', ');
  const btnMoi = document.querySelector('#setup-first button[onclick*="\'black\'"]');
  const btnAdv = document.querySelector('#setup-first button[onclick*="\'white\'"]');
  if (btnMoi) btnMoi.innerHTML = _marbleSwatch(bStops) + 'Moi';
  if (btnAdv) btnAdv.innerHTML = _marbleSwatch(wStops) + 'Adversaire';

  // Éditeur de position — palette de placement
  const edB = document.getElementById('edtool-black');
  const edW = document.getElementById('edtool-white');
  if (edB) { const sw = edB.querySelector('span'); if (sw) sw.style.background = 'radial-gradient(circle at 35% 35%, ' + bStops + ')'; }
  if (edW) { const sw = edW.querySelector('span'); if (sw) sw.style.background = 'radial-gradient(circle at 35% 35%, ' + wStops + ')'; }
  updateEditorStatus();

  // Analyse de partie — sélecteur de couleur "Comprendre la position"
  const cB = document.getElementById('comprehension-color-black');
  const cW = document.getElementById('comprehension-color-white');
  if (cB) cB.innerHTML = _marbleSwatch(bStops) + 'Joueur 1';
  if (cW) cW.innerHTML = _marbleSwatch(wStops) + 'Joueur 2';
  if (typeof updateAnalysisScore === 'function') updateAnalysisScore();
}

/* ═══════════════════════════════════════════
   MODE ENFANT — plateau adapté, restrictions de sécurité
   Conçu pour être sûr pour N'IMPORTE QUEL enfant, pas seulement les vôtres :
   aucune donnée personnelle, aucune configuration liée à une famille précise.
   Chat, Labo, réglages et liens externes verrouillés à la fois visuellement
   (CSS) ET fonctionnellement (garde dans chaque fonction concernée) — un
   appel direct ne contourne jamais la restriction visuelle seule.
   Sortie protégée par un calcul simple généré aléatoirement (verrou
   parental léger, pas une sécurité cryptographique — juste assez de
   friction pour qu'un enfant seul ne quitte pas le mode par accident).
═══════════════════════════════════════════ */
/* Le mode Enfant ne survivait pas a un rechargement : un simple rafraichissement
   rouvrait le chat, le Labo et les reglages alors qu'un enfant tenait le
   telephone. Il est donc conserve dans progress, au meme titre que le reste,
   et restaure au demarrage. La sortie reste protegee par l'addition. */
let kidsMode = !!(typeof progress !== 'undefined' && progress.kidsMode);
let _kidsPrevSkin = null;
let _kidsExitAnswer = null;
// Rate-limit sur la sortie du Mode Enfant : le calcul seul se devine vite
// par tâtonnement (un enfant curieux qui tape des nombres au hasard finit
// par tomber juste en une dizaine d'essais). 3 essais puis 5s de blocage
// ajoute juste assez de friction pour que ça reste peu pratique sans gêner
// un adulte qui se trompe une fois de frappe.
const KIDS_EXIT_MAX_ATTEMPTS = 3;
const KIDS_EXIT_COOLDOWN_MS = 5000;
let _kidsExitAttempts = 0;
let _kidsExitLockedUntil = 0;
let _kidsExitCooldownTimer = null;

function toggleKidsMode() {
  if (kidsMode) { _kidsExitPrompt(); return; }
  kidsMode = true;
  progress.kidsMode = true; saveProgress(progress);
  document.body.classList.add('kids-mode');
  _kidsPrevSkin = boardTheme.marbleSkin;
  boardTheme.marbleSkin = 'kids';
  applyMarbleSkin();
  selected = [];
  if (typeof initBoardState === 'function') initBoardState();  // recharge avec la disposition Découverte (7 billes/camp)
  capturedByBlack = 0; capturedByWhite = 0;
  if (typeof updateCaptures === 'function') updateCaptures();
  if (typeof drawBoard === 'function') drawBoard();
  // si le chat était affiché, on bascule sur l'onglet Jeu (jamais laisser le chat visible)
  if (typeof switchGameTab === 'function') {
    const chatPanel = document.getElementById('gpanel-chat');
    if (chatPanel && chatPanel.style.display !== 'none') {
      const gameTabBtn = document.querySelector('.game-tab[onclick*="\'game\'"]');
      switchGameTab('game', gameTabBtn || null);
    }
  }
  const statusEl = document.getElementById('kids-mode-status');
  if (statusEl) statusEl.innerHTML = 'Actuellement : <strong style="color:#5ab48c">activé 🧒</strong>';
  const btn = document.getElementById('kids-mode-toggle-btn');
  if (btn) { btn.textContent = 'Désactiver'; btn.classList.remove('allow'); btn.classList.add('deny'); }
  showToast('🧒 Mode Enfant activé — plateau adapté, chat/Labo/réglages/liens externes masqués');
}

function _kidsExitPrompt() {
  const a = 3 + Math.floor(Math.random() * 7);   // 3..9
  const b = 2 + Math.floor(Math.random() * 8);   // 2..9
  _kidsExitAnswer = a + b;
  const q = document.getElementById('kids-exit-question');
  if (q) q.textContent = a + ' + ' + b + ' = ?';
  const err = document.getElementById('kids-exit-error');
  if (err) err.style.display = 'none';
  const inp = document.getElementById('kids-exit-answer');
  if (inp) { inp.value = ''; }
  const m = document.getElementById('kids-exit-modal');
  if (m) { m.style.display = 'flex'; }
  // Si un blocage est en cours (fenêtre ouverte/fermée pendant le cooldown),
  // on le montre tout de suite au lieu de laisser croire que le champ marche.
  if (Date.now() < _kidsExitLockedUntil) {
    _kidsExitShowLock();
  } else {
    _kidsExitSetLocked(false);
    if (inp) setTimeout(function(){ inp.focus(); }, 50);
  }
}

function _kidsExitSetLocked(locked) {
  const inp = document.getElementById('kids-exit-answer');
  const btn = document.getElementById('kids-exit-submit');
  if (inp) inp.disabled = locked;
  if (btn) { btn.disabled = locked; btn.style.opacity = locked ? '0.45' : ''; btn.style.cursor = locked ? 'not-allowed' : ''; }
}

function _kidsExitShowLock() {
  _kidsExitSetLocked(true);
  const err = document.getElementById('kids-exit-error');
  clearInterval(_kidsExitCooldownTimer);
  const tick = function() {
    const remaining = Math.max(0, Math.ceil((_kidsExitLockedUntil - Date.now()) / 1000));
    if (remaining <= 0) {
      clearInterval(_kidsExitCooldownTimer);
      _kidsExitAttempts = 0;
      if (err) err.style.display = 'none';
      _kidsExitSetLocked(false);
      const inp = document.getElementById('kids-exit-answer');
      if (inp) inp.focus();
      return;
    }
    if (err) { err.textContent = '⏳ Trop d\'essais — réessaie dans ' + remaining + 's.'; err.style.display = 'block'; }
  };
  tick();
  _kidsExitCooldownTimer = setInterval(tick, 250);
}

function _kidsExitCancel() {
  const m = document.getElementById('kids-exit-modal');
  if (m) m.style.display = 'none';
  _kidsExitAnswer = null;
  clearInterval(_kidsExitCooldownTimer);
}

function _kidsExitCheck() {
  if (Date.now() < _kidsExitLockedUntil) return;   // bouton normalement désactivé, filet de sécurité
  const inp = document.getElementById('kids-exit-answer');
  const given = inp ? parseInt(inp.value, 10) : NaN;
  if (given !== _kidsExitAnswer) {
    _kidsExitAttempts++;
    if (_kidsExitAttempts >= KIDS_EXIT_MAX_ATTEMPTS) {
      _kidsExitLockedUntil = Date.now() + KIDS_EXIT_COOLDOWN_MS;
      _kidsExitShowLock();
    } else {
      const err = document.getElementById('kids-exit-error');
      if (err) { err.textContent = 'Ce n\'est pas la bonne réponse — réessaie.'; err.style.display = 'block'; }
    }
    return;
  }
  _kidsExitAttempts = 0;
  _kidsExitLockedUntil = 0;
  clearInterval(_kidsExitCooldownTimer);
  _kidsExitCancel();
  kidsMode = false;
  progress.kidsMode = false; saveProgress(progress);
  document.body.classList.remove('kids-mode');
  boardTheme.marbleSkin = _kidsPrevSkin || 'kintsugi';
  applyMarbleSkin();
  selected = [];
  if (typeof initBoardState === 'function') initBoardState();  // revient à la disposition normale (currentLayout)
  capturedByBlack = 0; capturedByWhite = 0;
  if (typeof updateCaptures === 'function') updateCaptures();
  if (typeof drawBoard === 'function') drawBoard();
  const statusEl = document.getElementById('kids-mode-status');
  if (statusEl) statusEl.innerHTML = 'Actuellement : <strong>désactivé</strong>';
  const btn = document.getElementById('kids-mode-toggle-btn');
  if (btn) { btn.textContent = 'Activer'; btn.classList.remove('deny'); btn.classList.add('allow'); }
  showToast('Mode Enfant désactivé');
}

function setMarbleSkin(skin, btn) {
  // Empêche de sélectionner un skin encore verrouillé
  if (!isSkinUnlocked(skin)) {
    showToast('🔒 Skin verrouillé — ' + skinUnlockText(skin));
    return;
  }
  if (btn) {
    const wrap = btn.closest('.skin-grid') || document;
    wrap.querySelectorAll('.skin-swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
  }
  boardTheme.marbleSkin = MARBLE_SKINS[skin] ? skin : 'kintsugi';
  applyMarbleSkin();
  try { localStorage.setItem('abalone_marble_skin', boardTheme.marbleSkin); } catch(e){}
  drawBoard();
  const sk = MARBLE_SKINS[boardTheme.marbleSkin];
  showToast('⚫ Billes : ' + sk.name);
}

/* Construit la galerie de skins dans le personnalisateur (avec verrouillage) */
function renderSkinGallery() {
  const grid = document.querySelector('.skin-grid');
  if (!grid) return;
  grid.innerHTML = '';
  Object.keys(MARBLE_SKINS).forEach(function(key){
    const sk = MARBLE_SKINS[key];
    const unlocked = isSkinUnlocked(key);
    const bGrad = 'radial-gradient(circle at 35% 35%, '+sk.b.join(', ')+')';
    const wGrad = 'radial-gradient(circle at 35% 35%, '+sk.w.join(', ')+')';
    const active = boardTheme.marbleSkin === key ? ' active' : '';
    const card = document.createElement('button');
    card.className = 'skin-swatch'+active+(unlocked?'':' locked');
    card.setAttribute('onclick', "setMarbleSkin('"+key+"',this)");
    const borderColor = active ? 'var(--gold)' : (unlocked ? 'var(--border)' : 'rgba(255,255,255,0.06)');
    card.style.cssText = 'position:relative;display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:12px;cursor:'+(unlocked?'pointer':'not-allowed')+';text-align:left;background:var(--surface2);border:2px solid '+borderColor+';transition:border-color .15s'+(unlocked?'':';opacity:0.55');
    const lockBadge = unlocked ? '' :
      '<div style="position:absolute;top:8px;right:8px;font-size:14px">🔒</div>';
    const conditionLine = unlocked
      ? (sk.unlock && sk.unlock.type==='free' ? '<div style="font-size:10px;color:var(--muted)">Débloqué</div>' : '<div style="font-size:10px;color:#7ac77a">✓ Débloqué</div>')
      : '<div style="font-size:10px;color:var(--gold);font-weight:600">🔒 '+skinUnlockText(key)+'</div>';
    card.innerHTML =
      lockBadge +
      '<div style="display:flex;gap:8px;justify-content:center;align-items:center'+(unlocked?'':';filter:grayscale(0.7)')+'">'+
        '<span style="width:34px;height:34px;border-radius:50%;background:'+bGrad+';box-shadow:inset -2px -2px 5px rgba(0,0,0,0.5),0 2px 4px rgba(0,0,0,0.4)'+(sk.veins?';outline:1px solid rgba(200,168,75,0.4)':'')+'"></span>'+
        '<span style="width:34px;height:34px;border-radius:50%;background:'+wGrad+';box-shadow:inset -2px -2px 5px rgba(0,0,0,0.25),0 2px 4px rgba(0,0,0,0.3)"></span>'+
      '</div>'+
      '<div style="font-size:13px;font-weight:700;color:var(--text)">'+sk.name+(sk.veins?' <span style="color:var(--gold);font-size:10px">✦ or</span>':'')+'</div>'+
      '<div style="font-size:10px;color:var(--muted);line-height:1.3">'+sk.desc+'</div>'+
      conditionLine;
    grid.appendChild(card);
  });
}

function setBoardTheme(theme, btn) {
  document.querySelectorAll('.bg-swatch').forEach(s => s.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const themes = {
    dark:   { bg1:'#1e2b28', bg2:'#131b19' },
    forest: { bg1:'#1a2e1a', bg2:'#0d1a0d' },
    ocean:  { bg1:'#0d1a2e', bg2:'#071020' },
    marble: { bg1:'#2a2a2a', bg2:'#1a1a1a' },
    gold:   { bg1:'#2e200a', bg2:'#1a1005' },
    wood:   { bg1:'#2a1c10', bg2:'#150d06' },
    metal:   { bg1:'#3a3d42', bg2:'#1e2024' },
    bronze:  { bg1:'#3a2810', bg2:'#1c1408' },
    cuivre:  { bg1:'#4a2412', bg2:'#22100a' },
    ardoise: { bg1:'#242c30', bg2:'#12161a' },
    granite: { bg1:'#303034', bg2:'#18181a' },
    verre:   { bg1:'#123044', bg2:'#08161e' },
    beton:   { bg1:'#2e2e2a', bg2:'#161614' },
    corail:  { bg1:'#4a1e2c', bg2:'#200c12' },
    glace:   { bg1:'#183842', bg2:'#0a1a20' },
    carbone: { bg1:'#141416', bg2:'#020202' },
    onyx:       { bg1:'#2a1a0a', bg2:'#140a04' },
    jade:       { bg1:'#1a2a1a', bg2:'#0a1208' },
    stardust:   { bg1:'#1a1a2e', bg2:'#0a0a1a' },
    terracotta: { bg1:'#5a3a1a', bg2:'#2a1005' },
    banquise:   { bg1:'#1a3a5a', bg2:'#0a1a2a' },
    nacre:      { bg1:'#3a2a4a', bg2:'#1a0a2a' },
    patina:       { bg1:'#2a2a1a', bg2:'#0a0a08' },
    desert:       { bg1:'#6a4a2a', bg2:'#2a1a0a' },
    abyss:        { bg1:'#0a1a2a', bg2:'#04080c' },
    lava:         { bg1:'#3a0a0a', bg2:'#0a0202' },
    marble_white: { bg1:'#4a4a4a', bg2:'#2a2a2a' },
    pastel:       { bg1:'#2a2a3a', bg2:'#1a1a20' },
  };
  Object.assign(boardTheme, themes[theme] || (theme === 'perso' && BOARD_SURFACE_THEMES.perso ? { bg1: BOARD_SURFACE_THEMES.perso.surf[0], bg2: BOARD_SURFACE_THEMES.perso.gutterOuter } : themes.dark));
  boardTheme.theme = theme;   // nom du theme, pas seulement le booleen bois — necessaire pour BOARD_SURFACE_THEMES
  boardTheme.wood = (theme === 'wood');
  if (theme === 'wood') {
    // billes bleu résine / blanc nacré (comme le plateau en photo)
    boardTheme.blackStops = ['#6aa0dd','#2f63b0','#16407e','#0a2752'];
    boardTheme.whiteStops = ['#ffffff','#eef0f2','#cfd2d6','#a6abb2'];
    boardTheme.veins = false;
    boardTheme.blackGrad1 = boardTheme.blackStops[0]; boardTheme.blackGrad2 = boardTheme.blackStops[3];
    boardTheme.whiteGrad1 = boardTheme.whiteStops[0]; boardTheme.whiteGrad2 = boardTheme.whiteStops[3];
  } else if (typeof applyMarbleSkin === 'function') {
    applyMarbleSkin();   // restaure le skin de billes courant en quittant le bois
  }
  drawBoard();
  showToast(theme === 'wood' ? '🌳 Plateau bois & résine époxy' : theme === 'volcanique' ? '🌋 Plateau volcanique' : theme === 'perso' ? '🧪 Thème personnalisé appliqué' : '🎨 Plateau mis à jour !');
}

/* ══ CREATEUR DE PLATEAU ══
   Principe : un theme perso n'est JAMAIS du nouveau code — c'est une
   recette de plus (nom de base + couleurs + deux facteurs d'echelle),
   executee par le meme window.peindreCouches/window.THEME_RECIPES que les
   16 themes integres. "densite" multiplie le nombre d'elements (n) de
   chaque couche, "intensite" multiplie les canaux alpha — deux operations
   generiques qui marchent identiquement sur N'IMPORTE QUELLE recette,
   sans code special par theme. Persiste dans localStorage comme donnees
   pures (jamais une fonction serialisee) ; reconstruit une vraie fonction
   recette au chargement. */
function creatorScaleLayers(couches, densite, intensite) {
  return couches.map(function(couche) {
    const p2 = Object.assign({}, couche.p);
    if (typeof p2.n === 'number') p2.n = Math.max(1, Math.round(p2.n * densite));
    ['alpha', 'alphaMin', 'alphaMax', 'alphaPic'].forEach(function(cle) {
      if (typeof p2[cle] === 'number') p2[cle] = Math.min(1, Math.max(0, p2[cle] * intensite));
    });
    return { type: couche.type, p: p2 };
  });
}
function creatorBuildRecipe(baseName, densite, intensite) {
  return function(t, night, options) {
    const base = window.THEME_RECIPES[baseName];
    if (!base) return [];
    const couches = base(t, night, options);
    return creatorScaleLayers(couches, densite, intensite);
  };
}
function creatorReadControls() {
  const base = document.getElementById('creator-base').value;
  const c1 = document.getElementById('creator-c1').value;
  const c2 = document.getElementById('creator-c2').value;
  const gutter = document.getElementById('creator-gutter').value;
  const densite = (+document.getElementById('creator-densite').value) / 100;
  const intensite = (+document.getElementById('creator-intensite').value) / 100;
  return { base, c1, c2, gutter, densite, intensite };
}
function creatorInitControls() {
  const sel = document.getElementById('creator-base');
  if (!sel) return;
  const saved = creatorLoadSaved();
  const base = (saved && saved.base) || 'metal';
  sel.value = base;
  const t = window.BOARD_SURFACE_THEMES[base] || window.BOARD_SURFACE_THEMES.dark;
  document.getElementById('creator-c1').value = (saved && saved.c1) || t.surf[0];
  document.getElementById('creator-c2').value = (saved && saved.c2) || t.surf[2];
  document.getElementById('creator-gutter').value = (saved && saved.gutter) || t.gutterOuter;
  document.getElementById('creator-densite').value = saved ? Math.round(saved.densite * 100) : 100;
  document.getElementById('creator-intensite').value = saved ? Math.round(saved.intensite * 100) : 100;
  creatorUpdate();
}
// Repeint juste l'apercu (jamais le vrai plateau) — appele a chaque
// changement de curseur, doit rester rapide : un seul canvas 200x200,
// aucun cache necessaire vu la frequence d'usage (curseur, pas drawBoard()).
function creatorUpdate() {
  const ctrl = creatorReadControls();
  document.getElementById('creator-densite-val').textContent = Math.round(ctrl.densite * 100) + '%';
  document.getElementById('creator-intensite-val').textContent = Math.round(ctrl.intensite * 100) + '%';
  const canvas = document.getElementById('creator-preview');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const t = { surf: [ctrl.c1, ctrl.c1, ctrl.c2], gutterOuter: ctrl.gutter, gutGrad: [ctrl.c1, ctrl.gutter], trim: ctrl.gutter };
  const recette = creatorBuildRecipe(ctrl.base, ctrl.densite, ctrl.intensite);
  const off = document.createElement('canvas'); off.width = 640; off.height = 640;
  const offCtx = off.getContext('2d');
  window.peindreCouches(offCtx, recette(t, false));
  ctx.clearRect(0, 0, 200, 200);
  ctx.drawImage(off, 0, 0, 640, 640, 0, 0, 200, 200);
  if (typeof window.creatorUpdate3DPreview === 'function') window.creatorUpdate3DPreview(off, ctrl.base);
  creatorSaveToStorage(ctrl);
}
function creatorSaveToStorage(ctrl) {
  try { localStorage.setItem('abalone_custom_theme', JSON.stringify(ctrl)); } catch (e) {}
}
function creatorLoadSaved() {
  try { const raw = localStorage.getItem('abalone_custom_theme'); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
// Enregistre le theme "perso" dans les DEUX registres globaux (couleurs +
// recette) — a partir de la, "perso" est un theme comme les 16 autres pour
// tout le reste du code (2D, 3D, setBoardTheme), aucune branche speciale
// ailleurs.
function creatorRegisterPerso(ctrl) {
  window.BOARD_SURFACE_THEMES.perso = { gutterOuter: ctrl.gutter, gutGrad: [ctrl.c1, ctrl.gutter], trim: ctrl.gutter, surf: [ctrl.c1, ctrl.c1, ctrl.c2] };
  window.THEME_RECIPES.perso = creatorBuildRecipe(ctrl.base, ctrl.densite, ctrl.intensite);
}
function creatorEnsurePersoSwatch() {
  if (document.getElementById('perso-swatch-wrap')) return;
  const wrap = document.createElement('div');
  wrap.id = 'perso-swatch-wrap';
  wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;width:60px';
  wrap.innerHTML = '<button onclick="setBoardTheme(\'perso\',this)" class="bg-swatch" id="perso-swatch-btn" title="Mon thème personnalisé"></button>' +
    '<span style="font-size:10px;color:var(--muted);text-align:center;line-height:1.2">Perso</span>';
  const carbBtn = document.querySelector('.bg-swatch[title="Carbone (laque noire)"]');
  const host = carbBtn && carbBtn.closest('div[style*="flex-direction:column"]') && carbBtn.closest('div[style*="flex-direction:column"]').parentElement;
  if (host) host.appendChild(wrap); else return;
  creatorRefreshSwatchGradient();
}
function creatorRefreshSwatchGradient() {
  const btn = document.getElementById('perso-swatch-btn');
  const ctrl = creatorReadControls();
  if (btn && ctrl.c1 && ctrl.c2) btn.style.background = 'linear-gradient(135deg,' + ctrl.c1 + ',' + ctrl.c2 + ')';
}
function creatorApply() {
  const ctrl = creatorReadControls();
  creatorRegisterPerso(ctrl);
  creatorSaveToStorage(ctrl);
  creatorEnsurePersoSwatch();
  creatorRefreshSwatchGradient();
  const btn = document.getElementById('perso-swatch-btn');
  setBoardTheme('perso', btn);
}
function creatorReset() {
  try { localStorage.removeItem('abalone_custom_theme'); } catch (e) {}
  document.getElementById('creator-base').value = 'metal';
  creatorInitControls();
  showToast('↺ Créateur réinitialisé');
}
// Au chargement : si un theme perso a deja ete sauvegarde, l'enregistrer
// tout de suite dans THEME_RECIPES/BOARD_SURFACE_THEMES (sans l'appliquer
// automatiquement — l'utilisateur garde le theme actif choisi la derniere
// fois via boardTheme.theme, deja restaure ailleurs) pour que le bouton
// "Perso" fonctionne des l'ouverture du panneau.
(function creatorBootstrap() {
  const saved = creatorLoadSaved();
  if (saved && saved.base) {
    try { creatorRegisterPerso(saved); } catch (e) {}
  }
})();
document.addEventListener('DOMContentLoaded', function() {
  const saved = creatorLoadSaved();
  if (saved && saved.base) creatorEnsurePersoSwatch();
  const sel = document.getElementById('creator-base');
  if (sel) creatorInitControls();
});

/* Bascule jour/nuit pour le theme de plateau ACTUELLEMENT actif. Ne fait
   rien (avec message clair) si ce theme n'a pas encore de variante nuit —
   seul Volcanique en a une pour l'instant, les 5 autres viendront plus
   tard un par un. Redessine 2D et resynchronise la 3D si elle est ouverte,
   comme n'importe quel autre changement de theme. Signale par Olivier. */
function toggleThemeNight() {
  const t = BOARD_SURFACE_THEMES[boardTheme.theme];
  if (!t || !t.night) { showToast('🌞 Ce thème n\'a pas encore de variante nuit'); return; }
  boardTheme.night = !boardTheme.night;
  drawBoard();
  showToast(boardTheme.night ? '🌙 Mode nuit' : '🌞 Mode jour');
}

// Legacy — conservé pour ne rien casser ailleurs
function setMarbleColor(piece, style, btn) {
  if (btn) {
    btn.closest('div').querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
    btn.classList.add('active');
  }
  const styles = {
    classic: piece==='black' ? {g1:'#666',g2:'#0a0a0a'} : {g1:'#fff',g2:'#bbb'},
    blue:    { g1:'#4466aa', g2:'#0a0a2a' },
    red:     { g1:'#aa4444', g2:'#2a0a0a' },
    green:   { g1:'#446644', g2:'#0a1a0a' },
    pearl:   { g1:'#ffeeff', g2:'#ccaacc' },
    gold:    { g1:'#f0d080', g2:'#c8a84b' },
    ivory:   { g1:'#fffff0', g2:'#d4cdb0' },
  };
  const s = styles[style] || styles.classic;
  if (piece==='black') { boardTheme.blackGrad1=s.g1; boardTheme.blackGrad2=s.g2; boardTheme.blackStops=[s.g1,s.g2]; }
  else                 { boardTheme.whiteGrad1=s.g1; boardTheme.whiteGrad2=s.g2; boardTheme.whiteStops=[s.g1,s.g2]; }
  boardTheme.veins = false;
  drawBoard();
}

let showMoveHints = (function(){ try { const v = localStorage.getItem('abalone_show_hints'); return v === null ? true : v === '1'; } catch(e){ return true; } })();
let showCoordinates = (function(){ try { return localStorage.getItem('abalone_show_coords') === '1'; } catch(e){ return false; } })();
let showLastMoveArrow = (function(){ try { const v = localStorage.getItem('abalone_show_last_arrow'); return v === null ? true : v === '1'; } catch(e){ return true; } })();
let showThreats = (function(){ try { return localStorage.getItem('abalone_show_threats') === '1'; } catch(e){ return false; } })();

function toggleThreats(v) {
  showThreats = v;
  try { localStorage.setItem('abalone_show_threats', v ? '1' : '0'); } catch(e){}
  if (typeof drawBoard === 'function') drawBoard();
}

/* ═══════════════════════════════════════════
   CARTE TACTIQUE EN OVERLAY — mêmes 4 dimensions réelles que le panneau
   Analyse (calculerCarteTactique), affichées ici directement sur le plateau
   de jeu plutôt qu'en mini-carte à part. Une seule dimension à la fois,
   jamais fusionnées. Suit le même patron que showThreats/drawThreats.
═══════════════════════════════════════════ */
let showCarteTactique = (function(){ try { return localStorage.getItem('abalone_show_carte_tactique') === '1'; } catch(e){ return false; } })();
let carteTactiqueOverlayDim = (function(){ try { return localStorage.getItem('abalone_carte_tactique_dim') || 'menace'; } catch(e){ return 'menace'; } })();
function toggleCarteTactiqueOverlay(v) {
  showCarteTactique = v;
  try { localStorage.setItem('abalone_show_carte_tactique', v ? '1' : '0'); } catch(e){}
  if (typeof drawBoard === 'function') drawBoard();
}
function setCarteTactiqueOverlayDim(dim) {
  carteTactiqueOverlayDim = dim;
  try { localStorage.setItem('abalone_carte_tactique_dim', dim); } catch(e){}
  document.querySelectorAll('.carte-overlay-dim-btn').forEach(function(b){ b.classList.toggle('active', b.dataset.dim === dim); });
  if (typeof drawBoard === 'function') drawBoard();
}
// Dessine un halo colore + la valeur numerique sur chaque bille du joueur au
// trait, pour la dimension choisie — meme echelle de couleur (heatColor) que
// la heatmap personnelle et la mini-carte du panneau Analyse, pour rester
// coherent visuellement dans toute l'appli.
function drawCarteTactiqueOverlay(ctx) {
  if (!showCarteTactique) return;
  if (typeof gameOver !== 'undefined' && gameOver) return;
  if (typeof calculerCarteTactique !== 'function' || typeof currentTurn === 'undefined') return;
  let cases;
  try { cases = calculerCarteTactique(currentTurn); } catch(e) { return; }
  if (!cases || !cases.length) return;
  const dim = carteTactiqueOverlayDim;
  let maxVal = 0;
  cases.forEach(function(c){ if (c[dim] > maxVal) maxVal = c[dim]; });
  ctx.save();
  cases.forEach(function(c){
    const v = c[dim];
    const intensite = maxVal > 0 ? v / maxVal : (v > 0 ? 1 : 0);
    const p = hexCoord(c.r, c.c);
    ctx.beginPath();
    ctx.arc(p.x, p.y, HEX_RADIUS - 2, 0, Math.PI * 2);
    ctx.strokeStyle = heatColor(v === 0 ? 0 : intensite);
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.85;
    ctx.stroke();
    if (v > 0) {
      ctx.globalAlpha = 1;
      ctx.font = 'bold ' + (HEX_RADIUS * 0.6).toFixed(0) + 'px sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(0,0,0,0.8)'; ctx.shadowBlur = 3;
      ctx.fillText(String(v), p.x, p.y - HEX_RADIUS * 0.9);
      ctx.shadowBlur = 0;
    }
  });
  ctx.restore();
}

function toggleLastMoveArrow(v) {
  showLastMoveArrow = v;
  try { localStorage.setItem('abalone_show_last_arrow', v ? '1' : '0'); } catch(e){}
  if (typeof drawBoard === 'function') drawBoard();
}

/* Ecrivait dans showBoardCoords, que rien ne lisait : drawBoard consulte
   showCoordinates. Les deux cases « coordonnees » de l'accessibilite etaient
   donc sans effet. On delegue au seul reglage reel. */
function toggleBoardCoords(v) { toggleCoordinates(v); syncCoordsToggles(v); }
function toggleMoveHints(v)   {
  showMoveHints = v;
  try { localStorage.setItem('abalone_show_hints', v ? '1' : '0'); } catch(e){}
  // synchronise les deux interrupteurs (jeu + paramètres accessibilité)
  ['game-hints-toggle','show-hints-toggle','hints-toggle-acc'].forEach(function(id){
    const el = document.getElementById(id);
    if (el && el.checked !== v) {
      el.checked = v;
      if (el.nextElementSibling && el.nextElementSibling.style) el.nextElementSibling.style.background = v ? 'var(--gold)' : 'var(--border)';
    }
  });
  if (typeof drawBoard === 'function') drawBoard();
}

// Demande au tout premier lancement si le joueur veut voir les coups possibles
function maybeAskHintsPreference() {
  let asked = false;
  try { asked = localStorage.getItem('abalone_hints_asked') === '1'; } catch(e){}
  if (asked) return;
  let modal = document.getElementById('hints-ask-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'hints-ask-modal';
    modal.className = 'share-modal-overlay';
    document.body.appendChild(modal);
  }
  modal.innerHTML =
    '<div class="share-modal-box" style="max-width:420px">' +
      '<div style="font-size:40px;text-align:center;margin-bottom:8px">💡</div>' +
      '<div class="share-modal-title">Aide visuelle</div>' +
      '<div class="share-modal-text">Voulez-vous que le plateau <strong>indique les cases</strong> où vos billes sélectionnées peuvent se déplacer ?<br><br>' +
      '<span style="color:var(--accent-green-light)">● vert</span> = déplacement &nbsp;·&nbsp; <span style="color:#e05c4b">● rouge</span> = poussée<br><br>' +
      '<span style="font-size:12px;color:var(--muted)">Vous pourrez changer ce réglage à tout moment dans la configuration de la partie.</span></div>' +
      '<button class="share-copy" onclick="answerHintsPreference(true)">Oui, m\'aider</button>' +
      '<button class="share-close" onclick="answerHintsPreference(false)">Non merci, je joue sans</button>' +
    '</div>';
  modal.classList.add('show');
}

function answerHintsPreference(yes) {
  try { localStorage.setItem('abalone_hints_asked', '1'); } catch(e){}
  toggleMoveHints(yes);
  const m = document.getElementById('hints-ask-modal');
  if (m) m.classList.remove('show');
}

/* ═══════════════════════════════════════════
   STREAK / DAILY CHALLENGE
═══════════════════════════════════════════ */
function renderStreak() {
  const u = currentUser;
  const streak = u ? (u.streak||0) : 18;
  const el = document.getElementById('streak-title');
  if (el) el.textContent = 'Série de '+streak+' jours';
  const daysEl = document.getElementById('streak-days');
  if (!daysEl) return;
  daysEl.innerHTML = '';
  const days = ['L','M','M','J','V','S','D'];
  const today = new Date().getDay();
  days.forEach(function(d,i) {
    const div = document.createElement('div');
    div.className = 'streak-day ' + (i < today ? 'done' : i === today ? 'today' : 'missed');
    div.textContent = d;
    daysEl.appendChild(div);
  });
}

/* ═══════════════════════════════════════════
   IA INSIGHTS — Academic references
   Sources:
   - Campos & Langlois, "Abalearn" (INESC-ID Lisbonne)
     Risk-seeking RL, κ=-1, TD(λ), beat ELO 1448 online
   - Pascal Chorus, "AIBA" (Maastricht Univ., 2009)
     Alpha-Beta >> Monte-Carlo (60-0 in tests)
     Eval: ±1000 material, ±400 center, ±320 grouping, ±40 attacks
     Avg game: 87 plies, branching: 60, complexity: 5×10^154
   - Optimal strategy: occupy center FIRST, attack SECOND
═══════════════════════════════════════════ */

