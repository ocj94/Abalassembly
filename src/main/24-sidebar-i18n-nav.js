/* ═══════════════════════════════════════════
   ANALYSE INTERACTIVE — bifurcation depuis le replay
   Permet, depuis n'importe quelle position du replay, de jouer un coup
   DIFFÉRENT de celui réellement joué et de voir l'IA y répondre — sans
   jamais toucher à la vraie partie ni à l'historique de replay. L'état réel
   est sauvegardé dans _variantStash et restauré exactement à la sortie,
   quel que soit ce qui s'est passé pendant l'exploration (victoire comprise).
═══════════════════════════════════════════ */
function startVariant() {
  if (!replayMode || replayCurrentIdx < 0 || !boardSnapshots[replayCurrentIdx]) {
    showToast('Ouvrez le replay et placez-vous sur un coup avant d\'essayer une variante');
    return;
  }
  const snap = boardSnapshots[replayCurrentIdx];
  _variantStash = {
    board: JSON.parse(JSON.stringify(board)),
    capturedByBlack: capturedByBlack, capturedByWhite: capturedByWhite,
    currentTurn: currentTurn, gameMode: gameMode, humanColor: humanColor, gameOver: gameOver,
    fromLive: false
  };
  variantMode = true;
  board = JSON.parse(JSON.stringify(snap.board));
  capturedByBlack = snap.capturedByBlack;
  capturedByWhite = snap.capturedByWhite;
  currentTurn = (snap.color === 'black') ? 'white' : 'black';
  humanColor = currentTurn;   // on explore en jouant le prochain coup, quel que soit le camp
  gameMode = 'ai';            // pour que l'IA réponde automatiquement au coup exploratoire
  gameOver = false;
  selected = [];
  drawBoard();
  updateCaptures();
  const btn = document.getElementById('variant-btn');
  if (btn) btn.textContent = '✕ Quitter la variante';
  showToast('🔀 Mode variante — jouez un coup différent, l\'IA répondra');
}

/* Même mécanisme que startVariant(), mais lancé DEPUIS une partie en direct
   plutôt que depuis le replay — répond directement à la demande "calculer
   plusieurs coups à l'avance PENDANT qu'on joue", pas seulement après coup.
   Le plateau n'est pas remplacé (on explore déjà depuis la position réelle
   actuelle) — seul l'état est sauvegardé pour un retour exact garanti. */
function startLiveVariant() {
  if (replayMode || variantMode) return;
  if (gameOver) { showToast('La partie est terminée — rien à essayer'); return; }
  if (gameMode === 'ai' && currentTurn !== humanColor) { showToast('Attends ton tour pour essayer un coup'); return; }
  _variantStash = {
    board: JSON.parse(JSON.stringify(board)),
    capturedByBlack: capturedByBlack, capturedByWhite: capturedByWhite,
    currentTurn: currentTurn, gameMode: gameMode, humanColor: humanColor, gameOver: gameOver,
    fromLive: true
  };
  variantMode = true;
  selected = [];
  drawBoard();
  const btn = document.getElementById('live-variant-btn');
  if (btn) btn.textContent = '✕ Revenir à ma vraie partie';
  showToast('🔮 Tu essaies un coup — il ne compte pas pour de vrai !');
}

function exitVariant() {
  if (!variantMode || !_variantStash) return;
  const wasFromLive = !!_variantStash.fromLive;
  board = _variantStash.board;
  capturedByBlack = _variantStash.capturedByBlack;
  capturedByWhite = _variantStash.capturedByWhite;
  currentTurn = _variantStash.currentTurn;
  gameMode = _variantStash.gameMode;
  humanColor = _variantStash.humanColor;
  gameOver = _variantStash.gameOver;
  variantMode = false;
  _variantStash = null;
  selected = [];
  const btn = document.getElementById('variant-btn');
  if (btn) btn.textContent = '🔀 Essayer une variante';
  const liveBtn = document.getElementById('live-variant-btn');
  if (liveBtn) liveBtn.textContent = '🔮 Et si...?';
  if (wasFromLive) {
    drawBoard();
    updateCaptures();
    showToast('◀ Retour à ta vraie partie');
  } else if (replayMode && replayCurrentIdx >= 0) {
    loadSnapshot(replayCurrentIdx);
    showToast('◀ Retour au replay');
  } else {
    drawBoard();
  }
}

function _variantConclude(winner) {
  showToast('🏁 Cette variante mène à une victoire de ' + (winner==='black'?'Noir':'Blanc') + ' !');
  setTimeout(exitVariant, 1500);
}

function toggleVariant() {
  if (variantMode) exitVariant(); else startVariant();
}

function toggleLiveVariant() {
  if (variantMode) exitVariant(); else startLiveVariant();
}

/* ─── DRAW BOARD with theme ─── */
/* Override drawMarble to use boardTheme colors */

/* DOMContentLoaded extras */
/* DOMContentLoaded — voir version principale ci-dessous */


/* ═══════════════════════════════════════════
   SIDEBAR — chess.com style
═══════════════════════════════════════════ */
let sidebarState = 'auto'; // 'compact' | 'expanded' | 'auto'

function initSidebar() {
  // Restore user preference
  const saved = localStorage.getItem('abalone_sidebar');
  if (saved) sidebarState = saved;
  applySidebarState();
}

function applySidebarState() {
  const sb = document.getElementById('sidebar');
  const body = document.body;
  const w = window.innerWidth;
  const rtl = (typeof isRTL === 'function') && isRTL();
  function setPad(val) {
    // padding JS = style inline, prioritaire sur le CSS [dir="rtl"] — donc on doit
    // choisir le bon côté ici même, pas seulement dans la feuille de style.
    if (rtl) { body.style.paddingLeft = '0'; body.style.paddingRight = val; }
    else { body.style.paddingRight = '0'; body.style.paddingLeft = val; }
  }

  if (w >= 1200) {
    // Large: expanded unless user forced compact
    const expand = sidebarState !== 'compact';
    sb.className = 'sidebar ' + (expand ? 'sidebar-expanded' : 'sidebar-compact');
    setPad(expand ? '220px' : '52px');
    updateExpandBtn(expand);
  } else if (w >= 600) {
    // Medium: compact icons only unless user forced expanded
    const expand = sidebarState === 'expanded';
    sb.className = 'sidebar ' + (expand ? 'sidebar-expanded' : 'sidebar-compact');
    setPad(expand ? '220px' : '52px');
    updateExpandBtn(expand);
  } else {
    // Mobile: hidden by default
    sb.className = 'sidebar sidebar-hidden';
    setPad('0');
  }
}

function updateExpandBtn(expanded) {
  const btn = document.getElementById('sidebar-expand-btn');
  if (btn) btn.title = expanded ? 'Réduire' : 'Agrandir';
}

/* ═══════════════════════════════════════════
   SÉLECTEUR DE LANGUE
═══════════════════════════════════════════ */
function currentLang() {
  try { return localStorage.getItem('abalone_lang') || 'FR'; } catch(e) { return 'FR'; }
}
// Seule langue RTL du sélecteur pour l'instant. Centralisé ici pour que tout
// le reste (CSS via [dir="rtl"], JS via cette fonction) parte d'une source unique.
function isRTL() { return currentLang() === 'HE'; }

// Restaure la langue choisie au chargement (dictionnaire nav persistant)
if (currentLang() !== 'FR') { try { applyTranslations(); } catch(e){} }

function renderLangMenu() {
  const menu = document.getElementById('lang-menu');
  if (!menu) return;
  const cur = currentLang();
  menu.innerHTML = LANGUAGES.map(function(l){
    return '<button class="lang-option'+(l.code===cur?' active':'')+'" onclick="setLanguage(\''+l.code+'\')">'+
      '<span class="lang-flag">'+l.flag+'</span><span>'+l.name+'</span></button>';
  }).join('');
  // bouton principal
  const sel = LANGUAGES.find(function(l){ return l.code===cur; }) || LANGUAGES[0];
  const fEl = document.getElementById('lang-flag');
  const cEl = document.getElementById('lang-code');
  if (fEl) fEl.textContent = sel.flag;
  if (cEl) cEl.textContent = sel.code;
}

function toggleLangMenu(ev) {
  if (ev) ev.stopPropagation();
  const menu = document.getElementById('lang-menu');
  if (menu) menu.classList.toggle('open');
}

/* ═══════════════════════════════════════════
   SYSTÈME DE TRADUCTION (i18n)
   Chaque élément à traduire porte un attribut data-i18n="clé".
   applyTranslations() remplace son texte selon la langue choisie.
   Pour étendre : ajouter les clés dans TRANSLATIONS et les data-i18n dans le HTML.
═══════════════════════════════════════════ */
const TRANSLATIONS = {
  EN: {
    'nav.home': 'Home',
    'nav.play': 'Play',
    'nav.puzzles': 'Puzzles',
    'nav.editor': 'Editor',
    'nav.analysis': 'Analysis',
    'nav.rules': 'Game Rules',
    'nav.academy': 'Abalone Academy',
    'nav.variants': 'Variants',
    'nav.github': 'GitHub Insights',
    'nav.leaderboard': 'Leaderboard',
    'nav.observe': 'Watch',
    'nav.community': 'Community',
    'nav.tournament': 'Tournament',
    'nav.trombi': 'Members',
    'nav.museum': 'Museum',
    'nav.pioneers': 'Pioneers',
    'nav.camera': 'AI Detection',
    'nav.stats': 'My Statistics',
    'nav.compare': 'Compare',
    'nav.friends': 'Friends',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'header.login': 'Sign in',
    'header.signup': 'Sign up',
  },
  HE: {
    'nav.home': 'בית',
    'nav.play': 'שחק',
    'nav.puzzles': 'חידות',
    'nav.editor': 'עורך',
    'nav.analysis': 'ניתוח',
    'nav.rules': 'חוקי המשחק',
    'nav.academy': 'אקדמיית אבלון',
    'nav.variants': 'גרסאות',
    'nav.github': 'תובנות GitHub',
    'nav.leaderboard': 'לוח מובילים',
    'nav.observe': 'צפייה',
    'nav.community': 'קהילה',
    'nav.tournament': 'טורניר',
    'nav.trombi': 'חברי הקהילה',
    'nav.museum': 'מוזיאון',
    'nav.pioneers': 'חלוצים',
    'nav.camera': 'זיהוי בבינה מלאכותית',
    'nav.stats': 'סטטיסטיקות',
    'nav.compare': 'השוואה',
    'nav.friends': 'ידידים',
    'nav.profile': 'פרופיל',
    'nav.settings': 'הגדרות',
    'header.login': 'התחברות',
    'header.signup': 'הרשמה',
  },
};

// Applique la traduction à tous les éléments [data-i18n] selon la langue courante.
// La langue FR utilise le texte original déjà présent dans le HTML.
function applyTranslations() {
  const lang = currentLang();
  document.documentElement.dir = isRTL() ? 'rtl' : 'ltr';
  const dict = TRANSLATIONS[lang];
  // Éléments texte simple
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    const key = el.getAttribute('data-i18n');
    if (lang === 'FR') {
      if (el.hasAttribute('data-i18n-fr')) el.textContent = el.getAttribute('data-i18n-fr');
      return;
    }
    if (dict && dict[key] !== undefined) {
      if (!el.hasAttribute('data-i18n-fr')) el.setAttribute('data-i18n-fr', el.textContent);
      el.textContent = dict[key];
    }
  });
  // Éléments avec HTML interne (balises <br>, <span>, etc.)
  document.querySelectorAll('[data-i18n-html]').forEach(function(el) {
    const key = el.getAttribute('data-i18n-html');
    if (lang === 'FR') {
      if (el.hasAttribute('data-i18n-fr-html')) el.innerHTML = el.getAttribute('data-i18n-fr-html');
      return;
    }
    if (dict && dict[key] !== undefined) {
      if (!el.hasAttribute('data-i18n-fr-html')) el.setAttribute('data-i18n-fr-html', el.innerHTML);
      el.innerHTML = dict[key];
    }
  });
  // Attributs placeholder
  document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
    const key = el.getAttribute('data-i18n-ph');
    if (lang === 'FR') {
      if (el.hasAttribute('data-i18n-fr-ph')) el.setAttribute('placeholder', el.getAttribute('data-i18n-fr-ph'));
      return;
    }
    if (dict && dict[key] !== undefined) {
      if (!el.hasAttribute('data-i18n-fr-ph')) el.setAttribute('data-i18n-fr-ph', el.getAttribute('placeholder') || '');
      el.setAttribute('placeholder', dict[key]);
    }
  });
}

function setLanguage(code) {
  try { localStorage.setItem('abalone_lang', code); } catch(e) {}
  renderLangMenu();
  const menu = document.getElementById('lang-menu');
  if (menu) menu.classList.remove('open');
  const sel = LANGUAGES.find(function(l){ return l.code===code; });
  if (!sel) return;
  // Applique le dictionnaire intégré (navigation) : instantané, sans navigateur.
  // currentLang() lit le localStorage qu'on vient d'écrire.
  if (typeof applyTranslations === 'function') applyTranslations();
  // Re-applique la sidebar : le padding du <body> est un style inline (JS), pas
  // seulement du CSS, donc un simple [dir="rtl"] ne suffit pas à le faire basculer
  // — sans cet appel, passer HE↔LTR ne bascule le bon côté qu'après un resize.
  if (typeof applySidebarState === 'function') applySidebarState();
  // Le français est la langue native du site → pas de traduction nécessaire
  if (code === 'FR') {
    if (typeof showToast === 'function') showToast(sel.flag + ' Français');
    return;
  }
  // Pour les autres langues, on s'appuie sur la traduction intégrée du navigateur
  // (gratuite, complète, dans toutes les langues). On guide le visiteur.
  showBrowserTranslateHint(sel);
}

// Affiche une aide expliquant comment activer la traduction du navigateur
function showBrowserTranslateHint(lang) {
  // détecte le navigateur pour donner la bonne instruction
  const ua = navigator.userAgent;
  let instruction;
  if (/Edg\//.test(ua)) {
    instruction = 'Cliquez sur l\'icône de traduction 🌐 dans la barre d\'adresse, ou faites un clic droit → « Traduire ».';
  } else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) {
    instruction = 'Faites un clic droit n\'importe où sur la page → « Traduire en ' + lang.name + ' », ou cliquez sur l\'icône 🌐 dans la barre d\'adresse.';
  } else if (/Firefox\//.test(ua)) {
    instruction = 'Firefox propose la traduction via l\'icône de traduction dans la barre d\'adresse (ou installez l\'extension officielle de traduction).';
  } else if (/Safari\//.test(ua)) {
    instruction = 'Cliquez sur l\'icône de traduction 🅰 dans la barre d\'adresse Safari → « Traduire en ' + lang.name + ' ».';
  } else {
    instruction = 'Utilisez la fonction « Traduire la page » de votre navigateur (souvent via un clic droit ou une icône dans la barre d\'adresse).';
  }

  const overlay = document.getElementById('translate-hint-overlay');
  if (!overlay) return;
  document.getElementById('translate-hint-flag').textContent = lang.flag;
  document.getElementById('translate-hint-lang').textContent = lang.name;
  document.getElementById('translate-hint-text').textContent = instruction;
  overlay.style.display = 'flex';
}

function closeTranslateHint() {
  const o = document.getElementById('translate-hint-overlay');
  if (o) o.style.display = 'none';
}

// Ferme le menu si on clique ailleurs
document.addEventListener('click', function(e){
  const sel = document.getElementById('lang-select');
  const menu = document.getElementById('lang-menu');
  if (sel && menu && !sel.contains(e.target)) menu.classList.remove('open');
  const hsel = document.getElementById('help-select');
  const hmenu = document.getElementById('help-menu');
  if (hsel && hmenu && !hsel.contains(e.target)) hmenu.classList.remove('open');
});

/* ─── Menu d'aide ─── */
function toggleHelpMenu(ev) {
  if (ev) ev.stopPropagation();
  const menu = document.getElementById('help-menu');
  if (menu) menu.classList.toggle('open');
}
function openHelp(type) {
  const menu = document.getElementById('help-menu');
  if (menu) menu.classList.remove('open');
  const titles = { question:'Question', suggestion:'Suggestion', bug:'Bug', abuse:'Signalement' };
  const t = titles[type] || 'Aide';
  try { window.open('https://github.com/ocj94/Abalassembly/issues/new?title='+encodeURIComponent('['+t+'] '), '_blank'); } catch(e) {}
  if (typeof showToast === 'function') showToast('\ud83d\udc19 Ouverture de GitHub Issues \u2014 merci pour ton retour !');
}

/* ─── Bannière de langue ─── */
function dismissLangBanner() {
  const b = document.getElementById('lang-banner');
  if (b) b.style.display = 'none';
  try { localStorage.setItem('abalone_lang_banner_dismissed', '1'); } catch(e) {}
}
function maybeShowLangBanner() {
  try {
    if (localStorage.getItem('abalone_lang_banner_dismissed')) return;
  } catch(e) {}
  // Langue du navigateur vs langue choisie sur le site
  const cur = currentLang();
  const nav = (navigator.language || 'fr').slice(0,2).toUpperCase();
  if (nav === cur) return;  // déjà cohérent
  const navLang = LANGUAGES.find(function(l){ return l.code === nav; });
  if (!navLang) return;  // langue non supportée
  const banner = document.getElementById('lang-banner');
  const flag = document.getElementById('lang-banner-flag');
  const text = document.getElementById('lang-banner-text');
  const action = document.getElementById('lang-banner-action');
  if (!banner) return;
  flag.textContent = navLang.flag;
  text.textContent = 'Consulter Abalassembly en ' + navLang.name + ' ?';
  action.onclick = function(){ setLanguage(nav); dismissLangBanner(); };
  banner.style.display = 'flex';
}

function toggleSidebarExpand() {
  const sb = document.getElementById('sidebar');
  const isExpanded = sb.classList.contains('sidebar-expanded');
  sidebarState = isExpanded ? 'compact' : 'expanded';
  localStorage.setItem('abalone_sidebar', sidebarState);
  applySidebarState();
}

function toggleSidebar() {
  // Mobile: show/hide
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  const w = window.innerWidth;
  if (w < 600) {
    const isOpen = sb.classList.contains('sidebar-mobile-open');
    if (isOpen) {
      sb.classList.remove('sidebar-mobile-open', 'sidebar-expanded');
      sb.classList.add('sidebar-hidden');
      if (overlay) overlay.classList.remove('visible');
    } else {
      sb.className = 'sidebar sidebar-mobile-open sidebar-expanded';
      if (overlay) overlay.classList.add('visible');
    }
  } else {
    // Medium/large: toggle expand
    toggleSidebarExpand();
  }
}

function closeSidebarMobile() {
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sb.className = 'sidebar sidebar-hidden';
  if (overlay) overlay.classList.remove('visible');
}

function sidebarNav(page, btn) {
  if (typeof page === 'string' && page === 'openings' && typeof opRenderRoot === 'function') { setTimeout(opRenderRoot, 30); setTimeout(opExploreReset, 30); }
  // Highlight
  document.querySelectorAll('.sidebar-item').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  // Navigate
  showPage(page);
  // Close mobile sidebar
  if (window.innerWidth < 600) closeSidebarMobile();
}

// Sync sidebar highlight with showPage
const _origShowPageSidebar = showPage;
showPage = function(name) {
  _origShowPageSidebar(name);
  document.querySelectorAll('.sidebar-item').forEach(function(b) { b.classList.remove('active'); });
  const sid = document.getElementById('sid-' + name);
  if (sid) sid.classList.add('active');
};

// Resize handler
window.addEventListener('resize', function() {
  if (sidebarState !== 'compact' && sidebarState !== 'expanded') {
    applySidebarState();
  } else {
    applySidebarState();
  }
});


/* ═══════════════════════════════════════════
   NAVIGATION — showPage + sync bottom nav
═══════════════════════════════════════════ */





// Sync bottom nav highlight with showPage
const _origShowPageRef = showPage;
function showPage(name) {
  if (name === 'settings' && typeof kidsMode !== 'undefined' && kidsMode) {
    showToast('🧒 Les réglages ne sont pas disponibles en mode Enfant');
    name = 'game';
  }
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nav-links a').forEach(function(a){ a.classList.remove('active'); });
  const pg = document.getElementById('page-'+name);
  if (!pg) { console.warn('Page not found: page-'+name); return; }
  pg.classList.add('active');
  const navEl = document.getElementById('nav-'+name);
  if (navEl) navEl.classList.add('active');
  // Sync bottom nav
  const bnav = document.getElementById('bnav-'+name);
  if (bnav) bnav.classList.add('active');
  window.scrollTo(0,0);
  // Page-specific init
  const inits = {
    home:       function(){ renderEngageBar(); },
    setup:      function(){
      if (typeof setupRenderLayoutThumb === 'function' && typeof _setupCfg !== 'undefined') {
        const activeBtn = document.querySelector('#setup-layout .setup-opt.active');
        setupRenderLayoutThumb(_setupCfg.layout, activeBtn ? (activeBtn.getAttribute('title') || activeBtn.textContent.trim()) : '');
      }
    },
    game:       function(){ if(!tournamentGame && typeof exitTournamentMode==='function') exitTournamentMode(); initGame();
      // Pluie de billes : uniquement quand une NOUVELLE partie demarre,
      // pas au retour sur une partie deja engagee.
      if (typeof playMarbleRainTransition === 'function'
          && (typeof moveCount === 'undefined' || moveCount === 0)
          && !(typeof replayMode !== 'undefined' && replayMode)) { playMarbleRainTransition(); } setTimeout(function(){ if(typeof maybeAskHintsPreference==='function') maybeAskHintsPreference(); }, 400);
      setTimeout(function(){ if (typeof _a11yBuildOverlay === 'function') _a11yBuildOverlay(); }, 100); },
    leaderboard:function(){ renderLeaderboard(); },
    profile:    function(){ renderProfile(); renderStreak(); },
    camera:     function(){ setupDragDrop(); },
    variants:   function(){ renderVariants(); },
    biblio:     function(){ renderBiblio(); },
    // renderMuseum() n'existe pas encore : garde pour éviter un plantage de la
    // page (ReferenceError) et afficher un état vide honnête à la place.
    museum:     function(){
      if (typeof renderMuseum === 'function') { renderMuseum(); return; }
      const g = document.getElementById('museum-grid');
      if (g && !g.innerHTML.trim()) g.innerHTML = '<div style="padding:24px;color:var(--muted);grid-column:1/-1">Contenu du musée en cours de préparation.</div>';
    },
    tournament: function(){ renderTournament(); },
    trombi:     function(){ renderTrombi(); },
    settings:   function(){ renderProfile(); if(typeof syncRadarToggle==='function') syncRadarToggle(); if(typeof syncDisplayToggles==='function') syncDisplayToggles(); if(typeof syncViewAVFXToggles==='function') syncViewAVFXToggles(); },
    stats:      function(){ renderStats(); },
    gym:        function(){ if (typeof renderGymCerveau === 'function') renderGymCerveau(); },
    formateurs: function(){ if (typeof renderFormateurs === 'function') renderFormateurs(); },
    historique: function(){ if (typeof renderHistoriquePage === 'function') renderHistoriquePage(); },
    corpusstats:function(){ if (typeof renderCorpusStatsPage === 'function') renderCorpusStatsPage(); },
    archi:      function(){ if (typeof renderArchiPage === 'function') renderArchiPage(); },
    compare:    function(){ renderCompare(); },
    friends:    function(){ renderFriends(); },
    editor:     function(){ if(Object.keys(editorBoard).length===0) loadEditorPreset('standard'); else drawEditorBoard(); setEditorTool('black'); },
    analysis:   function(){ if(analysisHistory.length===0) analysisFromStandard(); else drawAnalysisBoard(); },
    puzzles:    function(){
      // Certifie une seule fois (mise en cache localStorage) -- rapide (verification
      // directe, pas de recherche recursive), donc sans impact sensible au premier
      // affichage de la page.
      if (typeof isPuzzleCertified === 'function') {
        let hasCache = false;
        try { hasCache = Object.keys(JSON.parse(localStorage.getItem('abaPuzzleCertified')||'{}')).length > 0; } catch(e){}
        if (!hasCache && typeof certifyAllPuzzles === 'function') certifyAllPuzzles();
      }
      renderPuzzles();
      if (typeof renderMonthlyCard === 'function') renderMonthlyCard();
      if (typeof renderDailyCard === 'function') renderDailyCard();
      if (typeof renderSrsReviewCard === 'function') renderSrsReviewCard();
      setTimeout(function(){
        if(typeof buildPuzzleBoard==='function') buildPuzzleBoard(currentPuzzleIdx||0);
        if(typeof drawPuzzleBoardInteractive==='function') drawPuzzleBoardInteractive();
        if(typeof initPuzzleInteraction==='function') initPuzzleInteraction();
      }, 80);
    },
  };
  if (inits[name]) inits[name]();
}

/* ═══════════════════════════════════════════
   MOBILE TOP BAR SYNC
═══════════════════════════════════════════ */
function updateTopBar() {
  const u = currentUser;
  const streakEl = document.getElementById('top-streak');
  const avatarEl = document.getElementById('top-avatar');
  if (streakEl) streakEl.textContent = '🔥 ' + (u ? (u.streak||0) : 18);
  if (avatarEl) {
    avatarEl.textContent = u ? (u.username||'?')[0].toUpperCase() : '?';
    avatarEl.style.background = u ? (u.color||'#2d5a3d') : '#2d5a3d';
  }
}

