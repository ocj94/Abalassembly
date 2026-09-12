/* ═══════════════════════════════════════════
   RADAR PERSONNEL — forces & faiblesses du joueur
   Les 6 critères sont dérivés des statistiques réelles.
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════════════
   PROFIL DE PERFORMANCE DETAILLE
   Pense pour un oeil analytique : chaque indicateur est defini, chiffre, et
   situe par rapport a un corpus reel de 2589 parties (serveur MiGs). Aucune
   valeur inventee — quand une donnee manque, le champ le dit.
   ═══════════════════════════════════════════════════════════════════════ */

/* Distribution de reference : longueur des parties MiGs, en percentiles.
   Mesuree sur les 2589 parties reelles rejouees contre le moteur.
   Lecture : au percentile p, une partie dure PERF_REF_LEN[p] coups. */
const PERF_REF_LEN = [[0,9],[5,33],[10,43],[15,51],[20,57],[25,64],[30,69],[35,75],[40,81],[45,87],[50,93],[55,99],[60,106],[65,114],[70,121],[75,130],[80,141],[85,154],[90,173],[95,197],[100,370]];

/* Reperes MiGs (medianes et quartiles), pour situer un joueur en une phrase.
   1re ejection : q25=19, med=27, q75=36. Ejections/partie : med=7.
   Part de poussees : med=41%. */
const PERF_REF = {
  firstEjection: { q25:19, med:27, q75:36 },
  ejPerGame:     { q25:5,  med:7,  q75:9  },
  pushShare:     { q25:0.363, med:0.411, q75:0.458 }
};

/* Percentile d'une valeur dans une CDF echantillonnee [[pct,val],...]. */
function _perfPercentile(cdf, v) {
  if (v <= cdf[0][1]) return 0;
  if (v >= cdf[cdf.length-1][1]) return 100;
  for (let i=1;i<cdf.length;i++){
    if (v <= cdf[i][1]){
      const [p0,v0]=cdf[i-1], [p1,v1]=cdf[i];
      return Math.round(p0 + (p1-p0)*(v-v0)/(v1-v0));
    }
  }
  return 50;
}

/* Toutes les mesures derivees, avec numerateur/denominateur exposes pour qui
   veut verifier le calcul. Rien n'est arrondi ici : l'arrondi est une decision
   d'affichage, pas de calcul. */
function computePerfMetrics() {
  const p = progress;
  const G  = p.gamesPlayed || 0;
  const M  = p.totalMoves || 0;
  const den = (x) => x > 0 ? x : null;   // null = indefini, pas 0

  const ratio = (num, d) => { const dd = den(d); return dd === null ? null : num / dd; };

  const winRate   = ratio(p.gamesWon, G);
  const drawRate  = ratio(p.gamesDraw, G);
  const lossRate  = ratio(p.gamesLost, G);
  const ejPerGame = ratio(p.totalEjections, G);
  const pushShare = ratio(p.totalPushes, M);
  const pushEff   = ratio(p.totalPushes, p.pushAttempts);
  const bestShare = ratio(p.bestMoves, M);
  const fastShare = ratio(p.fastMoves, M);
  const centerSh  = ratio(p.centerTurns, M);
  const cohesion  = ratio(p.cohesionSum, M);
  const conversion= ratio(p.leadWins, p.leadGames);
  const avgLen    = ratio(M, G);

  return {
    sample: { games: G, moves: M, wins: p.gamesWon||0, losses: p.gamesLost||0, draws: p.gamesDraw||0 },
    metrics: [
      { id:'winRate',   label:'Taux de victoire',      val:winRate,   fmt:'pct', num:p.gamesWon,     den:G, def:"Parties gagnees / parties jouees." },
      { id:'ejPerGame', label:'Ejections par partie',  val:ejPerGame, fmt:'num', num:p.totalEjections,den:G, def:"Billes adverses sorties, en moyenne par partie.", ref:PERF_REF.ejPerGame },
      { id:'pushShare', label:'Part de poussees',      val:pushShare, fmt:'pct', num:p.totalPushes,  den:M, def:"Coups qui poussent une bille adverse, sur l'ensemble des coups.", ref:PERF_REF.pushShare },
      { id:'pushEff',   label:'Efficacite des poussees',val:pushEff,  fmt:'pct', num:p.totalPushes,  den:p.pushAttempts, def:"Poussees reussies / tentatives de poussee." },
      { id:'bestShare', label:'Coups optimaux',        val:bestShare, fmt:'pct', num:p.bestMoves,    den:M, def:"Coups juges optimaux par le moteur, sur l'ensemble des coups." },
      { id:'centerSh',  label:'Controle du centre',    val:centerSh,  fmt:'pct', num:p.centerTurns,  den:M, def:"Coups ou vous dominiez le centre du plateau." },
      { id:'cohesion',  label:'Cohesion moyenne',      val:cohesion,  fmt:'pct', num:p.cohesionSum,  den:M, def:"Compacite de vos billes, moyennee sur chaque coup." },
      { id:'conversion',label:'Conversion des avantages',val:conversion,fmt:'pct',num:p.leadWins,    den:p.leadGames, def:"Parties menees ET gagnees / parties menees." },
      { id:'fastShare', label:'Coups rapides',         val:fastShare, fmt:'pct', num:p.fastMoves,    den:M, def:"Coups joues sans longue reflexion." },
      { id:'avgLen',    label:'Longueur de partie',    val:avgLen,    fmt:'num', num:M,              den:G, def:"Nombre de coups par partie, en moyenne.", cdf:PERF_REF_LEN }
    ]
  };
}

function _perfFmt(v, fmt) {
  if (v === null || v === undefined) return '—';
  if (fmt === 'pct') return (v*100).toFixed(1) + ' %';
  return v.toFixed(v < 10 ? 2 : 1);
}

/* Le tableau detaille. Chaque ligne : la valeur, sa definition, et — quand une
   reference existe — ou elle se situe dans le corpus MiGs. */
function renderPerfDetail() {
  const host = document.getElementById('perf-detail');
  if (!host) return;
  const d = computePerfMetrics();

  if (!d.sample.games) {
    host.innerHTML = '<div style="padding:22px;text-align:center;color:var(--muted);font-size:13px;'
      + 'border:1px dashed var(--border);border-radius:10px">Aucune partie enregistree pour l\u0027instant.'
      + '<br><span style="font-size:12px">Jouez une partie pour alimenter votre profil.</span></div>';
    return;
  }

  let rows = '';
  d.metrics.forEach(function(m){
    let refCol = '<span style="color:var(--muted)">—</span>';
    if (m.val !== null && m.cdf) {
      const pc = _perfPercentile(m.cdf, m.val);
      refCol = '<span style="color:var(--gold)">P' + pc + '</span>'
        + '<span style="font-size:10px;color:var(--muted)"> vs MiGs</span>';
    } else if (m.val !== null && m.ref) {
      const r = m.ref, band = m.val < r.q25 ? 'sous q25' : m.val > r.q75 ? 'au-dessus q75' : 'dans l\u0027ecart median';
      const col = m.val >= r.q25 && m.val <= r.q75 ? 'var(--gold)' : 'var(--muted)';
      refCol = '<span style="color:'+col+'">'+band+'</span>'
        + '<span style="font-size:10px;color:var(--muted)"> (med '+_perfFmt(m.ref.med, m.fmt)+')</span>';
    }
    rows += '<div style="display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:baseline;'
      + 'padding:11px 0;border-bottom:1px solid var(--border)">'
      + '<div><div style="font-size:14px;color:var(--text);font-weight:600">'+m.label+'</div>'
      +   '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+m.def
      +     (m.den ? ' <span style="font-family:\'DM Mono\',monospace">['+ (m.num||0) +'/'+ m.den +']</span>' : '')
      +   '</div></div>'
      + '<div style="font-family:\'DM Mono\',monospace;font-size:16px;font-weight:700;color:var(--text);text-align:right;min-width:74px">'
      +   _perfFmt(m.val, m.fmt) + '</div>'
      + '<div style="font-size:11px;text-align:right;min-width:96px">'+refCol+'</div>'
      + '</div>';
  });

  host.innerHTML =
    '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">'
    + '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted)">Indicateurs detailles</div>'
    + '<button onclick="exportPerfJSON()" style="font-family:\'DM Mono\',monospace;font-size:10px;letter-spacing:.05em;'
    +   'background:none;border:1px solid var(--border);color:var(--text);padding:5px 10px;border-radius:4px;cursor:pointer">Exporter (JSON / CSV)</button>'
    + '</div>'
    + '<div style="font-size:11px;color:var(--muted);margin-bottom:10px">Echantillon : '
    +   d.sample.games + ' partie(s), ' + d.sample.moves + ' coups. Colonne de droite : position dans un corpus de 2589 parties reelles.</div>'
    + rows;
}

/* Export : les donnees brutes, pour qui veut les manipuler ailleurs
   (tableur, notebook). Deux formats, aucune perte. */
function exportPerfJSON() {
  const d = computePerfMetrics();
  const flat = {};
  d.metrics.forEach(function(m){ flat[m.id] = m.val; });
  const payload = {
    exportedAt: new Date().toISOString(),
    sample: d.sample,
    metrics: flat,
    raw: {
      gamesPlayed:progress.gamesPlayed, gamesWon:progress.gamesWon, gamesLost:progress.gamesLost,
      gamesDraw:progress.gamesDraw, totalMoves:progress.totalMoves, totalEjections:progress.totalEjections,
      totalPushes:progress.totalPushes, pushAttempts:progress.pushAttempts, bestMoves:progress.bestMoves,
      fastMoves:progress.fastMoves, centerTurns:progress.centerTurns, cohesionSum:progress.cohesionSum,
      leadGames:progress.leadGames, leadWins:progress.leadWins, elo:progress.elo, xp:progress.xp
    },
    reference: 'MiGs 2016-2017, 2589 parties'
  };
  const cols = Object.keys(flat);
  const csv = 'metric,value\n' + cols.map(function(k){ return k+','+(flat[k]===null?'':flat[k]); }).join('\n');

  function dl(name, text, type){
    const b = new Blob([text], {type:type});
    const u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = name; a.click();
    setTimeout(function(){ URL.revokeObjectURL(u); }, 1000);
  }
  dl('abalassembly-profil.json', JSON.stringify(payload, null, 2), 'application/json');
  dl('abalassembly-profil.csv', csv, 'text/csv');
  if (typeof showToast === 'function') showToast('Profil exporte (JSON + CSV)');
}

/* ═══ CONFORT & ACCESSIBILITE — logique ═══
   Les preferences vivent dans progress.a11y et s'appliquent au demarrage.
   Rien n'est promis de therapeutique : ce sont des reglages d'affichage et
   d'attention, offerts a qui en a besoin comme a qui les prefere. */

const A11Y_DEFAULTS = {
  calm: false,      // mouvement reduit
  quiet: false,     // mode sobre (moins de bruit ludique)
  focus: false,     // focus renforce
  contrast: false,  // contraste renforce
  oneAction: false, // une action principale a la fois
  textScale: 1,     // 1 = normal, jusqu'a 1.4
  space: 1          // 1 = normal, jusqu'a 1.6
};

function getA11y() {
  return Object.assign({}, A11Y_DEFAULTS, (progress && progress.a11y) || {});
}

function applyA11y() {
  const a = getA11y();
  const b = document.body;
  b.classList.toggle('a11y-calm', a.calm);
  b.classList.toggle('a11y-quiet', a.quiet);
  b.classList.toggle('a11y-focus', a.focus);
  b.classList.toggle('a11y-contrast', a.contrast);
  b.classList.toggle('a11y-oneaction', a.oneAction);
  b.classList.toggle('a11y-text', a.textScale !== 1);
  b.classList.toggle('a11y-space', a.space !== 1);
  document.documentElement.style.setProperty('--a11y-text-scale', a.textScale);
  document.documentElement.style.setProperty('--a11y-space', a.space);
}

function setA11y(key, value) {
  if (!progress.a11y) progress.a11y = {};
  progress.a11y[key] = value;
  saveProgress(progress);
  applyA11y();
  if (typeof renderA11yPanel === 'function') renderA11yPanel();
}

/* Au premier passage, si le systeme demande deja moins d'animations, on
   active le mode calme par defaut — sans ecraser un choix explicite. */
function initA11y() {
  if (progress.a11y === undefined) {
    progress.a11y = {};
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      progress.a11y.calm = true;
    }
    saveProgress(progress);
  }
  applyA11y();
}

function renderA11yPanel() {
  const host = document.getElementById('a11y-panel');
  if (!host) return;
  const a = getA11y();

  const toggle = function(key, label, desc) {
    const on = !!a[key];
    return '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;'
      + 'padding:13px 0;border-bottom:1px solid var(--border)">'
      + '<div style="flex:1"><div style="font-size:14px;color:var(--text);font-weight:600">'+label+'</div>'
      +   '<div style="font-size:11px;color:var(--muted);margin-top:2px">'+desc+'</div></div>'
      + '<button onclick="setA11y(\''+key+'\','+(!on)+')" role="switch" aria-checked="'+on+'" '
      +   'style="flex:0 0 auto;width:46px;height:26px;border-radius:13px;border:1px solid var(--border);cursor:pointer;'
      +   'background:'+(on?'var(--gold)':'var(--surface2)')+';position:relative;transition:background .15s">'
      +   '<span style="position:absolute;top:2px;left:'+(on?'22px':'2px')+';width:20px;height:20px;border-radius:50%;'
      +     'background:'+(on?'#0d0f0e':'var(--muted)')+';transition:left .15s"></span></button>'
      + '</div>';
  };

  const slider = function(key, label, desc, min, max, step) {
    const v = a[key];
    return '<div style="padding:13px 0;border-bottom:1px solid var(--border)">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline">'
      +   '<div style="font-size:14px;color:var(--text);font-weight:600">'+label+'</div>'
      +   '<span style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--gold)">'+Math.round(v*100)+'%</span></div>'
      + '<div style="font-size:11px;color:var(--muted);margin:2px 0 8px">'+desc+'</div>'
      + '<input type="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+v+'" '
      +   'oninput="setA11y(\''+key+'\',parseFloat(this.value))" '
      +   'style="width:100%;accent-color:var(--gold)" aria-label="'+label+'"></div>';
  };

  const anyOn = a.calm || a.quiet || a.focus || a.contrast || a.oneAction || a.textScale!==1 || a.space!==1;

  host.innerHTML =
    toggle('calm', 'Mouvement reduit', 'Coupe animations et transitions. Active automatiquement si votre systeme le demande.')
    + toggle('quiet', 'Mode sobre', 'Retire les effets ludiques (XP flottant, series, ornements) pour ne garder que le jeu et l\u0027information.')
    + toggle('focus', 'Focus renforce', 'Contour net et constant sur l\u0027element actif, au clavier comme au toucher.')
    + toggle('contrast', 'Contraste renforce', 'Fonds plus sombres, texte plus clair, bordures plus nettes.')
    + toggle('oneAction', 'Une action a la fois', 'Attenue les boutons secondaires pour qu\u0027un seul ressorte par ecran.')
    + slider('textScale', 'Taille du texte', 'Agrandit l\u0027ensemble du texte.', 1, 1.4, 0.05)
    + slider('space', 'Espacement', 'Aere l\u0027interlignage et l\u0027espacement des lettres.', 1, 1.6, 0.1)
    + (anyOn ? '<button onclick="resetA11y()" style="margin-top:14px;font-family:\'DM Mono\',monospace;font-size:11px;'
        + 'background:none;border:1px solid var(--border);color:var(--muted);padding:8px 14px;border-radius:4px;cursor:pointer">'
        + 'Tout remettre par defaut</button>' : '');
}

function resetA11y() {
  progress.a11y = {};
  saveProgress(progress);
  applyA11y();
  renderA11yPanel();
  if (typeof showToast === 'function') showToast('Reglages de confort reinitialises');
}

/* ══ Écran de configuration avant partie ══
   Un clic sur « Jouer » (menu Partie) ouvre page-setup, pas page-game.
   Les choix sont accumules dans _setupCfg puis appliques d'un coup au
   demarrage. Variante et camp ne sont modifiables qu'ici ; le reste reste
   ajustable en jeu. */
let _setupCfg = { layout:'standard', mode:'ai', first:'black', style:'auto', diff:'easy', time:'', hints:true, coords:false, engine:'actuel' };
/* Cadence choisie avant de passer en partie en direct, restauree si on
   revient sur un autre mode -- evite de perdre silencieusement le reglage. */
let _setupCfgTimeBeforeRtc;

/* Bouton parent "Deux joueurs" : deplie la sous-section (Meme appareil /
   En direct) plutot que de choisir directement un mode -- demande
   d'Olivier, ces deux choix sont des declinaisons de "jouer a deux",
   pas un troisieme mode independant au meme niveau que "Contre l'IA". */
function setupPickTwoPlayers(){
  const subSection = document.getElementById('setup-mode-2p-sub');
  if (!subSection) return;
  const dejaOuvert = subSection.style.display !== 'none';
  if (dejaOuvert) return; // deja deplie, ne rien reinitialiser
  subSection.style.display = '';
  // Choix par defaut a l'ouverture : "Meme appareil", le plus simple.
  const localBtn = document.querySelector('#setup-mode-2p-sub .setup-opt:first-child');
  if (localBtn) setupPick('mode', 'local', localBtn);
}

/* Miniature de la disposition de depart, affichee quand on choisit une
   variante en configuration. Reutilise gymMarbleGradient() TEL QUEL : les
   billes de la miniature suivent donc le VRAI skin actif choisi par la
   personne, pas un noir/blanc fixe -- Olivier a explicitement demande que
   seul l'EXPORT garde les couleurs officielles rigides, pas l'affichage. */
function setupRenderLayoutThumb(layoutKey, labelText){
  const box = document.getElementById('setup-layout-thumb');
  const labelEl = document.getElementById('setup-layout-thumb-label');
  if (!box) return;
  if (layoutKey === 'random' || typeof LAYOUTS === 'undefined' || !LAYOUTS[layoutKey]) {
    box.innerHTML = '<div style="width:98px;height:98px;display:flex;align-items:center;justify-content:center;font-size:30px">🎲</div>';
    if (labelEl) labelEl.textContent = labelText || 'Tirée au sort au lancement de la partie';
    return;
  }
  const lay = LAYOUTS[layoutKey];
  const posMap = {};
  lay.black.forEach(function(p){ posMap[p[0]+','+p[1]] = 'black'; });
  lay.white.forEach(function(p){ posMap[p[0]+','+p[1]] = 'white'; });
  const cell = 10;
  let html = '<div style="display:flex;flex-direction:column;align-items:center;gap:1px">';
  for (let r=0; r<9; r++){
    html += '<div style="display:flex;gap:1px;justify-content:center">';
    for (let c=0; c<ROWS[r]; c++){
      const piece = posMap[r+','+c];
      const bg = piece ? (typeof gymMarbleGradient==='function' ? gymMarbleGradient(piece) : (piece==='black'?'#1a1a1a':'#e8e0d0')) : 'var(--border)';
      html += '<div style="width:'+cell+'px;height:'+cell+'px;border-radius:50%;background:'+bg+';opacity:'+(piece?1:0.3)+'"></div>';
    }
    html += '</div>';
  }
  html += '</div>';
  box.innerHTML = html;
  if (labelEl) labelEl.textContent = labelText || '';
}

/* Dedie au menu deroulant des dispositions (21 entrees -- trop pour des
   boutons individuels, demande d'Olivier). Fonction SEPAREE de setupPick()
   plutot que de la reutiliser telle quelle : setupPick() attend un bouton
   avec .parentElement et des .setup-opt freres a desactiver, ce qu'un
   <select> n'a pas. Meme principe que le commentaire de setupPick() pour
   la description : le title= de l'<option> choisie reste la SEULE source,
   jamais une 2e liste qui pourrait diverger. */
function setupPickLayoutSelect(sel) {
  const value = sel.value;
  _setupCfg.layout = value;
  const opt = sel.options[sel.selectedIndex];
  setupRenderLayoutThumb(value, (opt && opt.getAttribute('title')) || (opt && opt.textContent.trim()));
}
function setupPick(group, value, btn) {
  _setupCfg[group] = value;
  const box = btn.parentElement;
  box.querySelectorAll('.setup-opt').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  /* Reutilise le title= deja present sur chaque bouton (deja verifie
     variante par variante : compte de parties reel ou mention explicite
     "disposition artistique") plutot que d'ecrire une 2e description qui
     pourrait diverger de la premiere avec le temps. */
  if (group === 'layout') {
    setupRenderLayoutThumb(value, btn.getAttribute('title') || btn.textContent.trim());
  }
  /* En deux joueurs local, « qui commence » et le style IA n'ont pas de sens
     (les deux joueurs sont sur le meme ecran). En revanche, en partie EN
     DIRECT il faut pouvoir choisir son camp -- demande d'Olivier. */
  if (group === 'mode') {
    const isAI = value === 'ai';
    const isLocal2p = value === 'local';
    const isRtc = value === 'rtc';
    const styleCard = document.getElementById('setup-style-card');
    const engineCard = document.getElementById('setup-engine-card');
    const firstWrap = document.getElementById('setup-first-wrap');
    const firstBox = document.getElementById('setup-first');
    const firstNote = document.getElementById('setup-first-note');
    const rtcPanel = document.getElementById('setup-rtc-panel');
    if (styleCard) styleCard.style.display = isAI ? '' : 'none';
    if (engineCard) engineCard.style.display = isAI ? '' : 'none';
    if (firstWrap) firstWrap.style.display = (isAI || isRtc) ? '' : 'none';
    if (firstBox) firstBox.style.display = (isAI || isRtc) ? '' : 'none';
    if (firstNote) firstNote.style.display = (isAI || isRtc) ? '' : 'none';
    if (rtcPanel) rtcPanel.style.display = isRtc ? '' : 'none';
    /* Choisir "Meme appareil" ou "En direct" garde le bouton parent
       "Deux joueurs" visuellement actif, et referme le sous-panneau
       "Contre l'IA" le cas echeant -- les deux sous-choix sont bien des
       facons de jouer a deux, pas un troisieme mode independant. */
    const parentToggle = document.getElementById('setup-mode-2p-toggle');
    if (parentToggle) parentToggle.classList.toggle('active', isLocal2p || isRtc);
    const aiBtn = document.querySelector('#setup-mode .setup-opt:first-child');
    if (aiBtn && (isLocal2p || isRtc)) aiBtn.classList.remove('active');
    if (isAI) {
      // Retour sur "Contre l'IA" : referme le sous-panneau et deselectionne
      // ses deux choix, pour ne pas laisser un etat incoherent affiche.
      const subSection = document.getElementById('setup-mode-2p-sub');
      if (subSection) subSection.style.display = 'none';
      document.querySelectorAll('#setup-mode-2p-sub .setup-opt').forEach(function(b){ b.classList.remove('active'); });
    }
    /* Cadence : masquee et forcee en "Libre" en partie en direct. L'echange
       manuel des codes de connexion peut prendre plusieurs minutes (copier-
       coller entre deux appareils) -- une pendule qui tourne pendant ce
       temps ferait perdre au temps avant meme le premier coup. Signale par
       Olivier. Le choix est restaure des qu'on repasse sur un autre mode. */
    const timeCard = document.getElementById('setup-time-card');
    if (timeCard) timeCard.style.display = isRtc ? 'none' : '';
    if (isRtc) {
      if (_setupCfg.time !== '') _setupCfgTimeBeforeRtc = _setupCfg.time;
      _setupCfg.time = '';
      const timeBox = document.getElementById('setup-time');
      if (timeBox) {
        timeBox.querySelectorAll('.setup-opt').forEach(function(b, i){ b.classList.toggle('active', i === 0); });
      }
    } else if (typeof _setupCfgTimeBeforeRtc === 'string') {
      _setupCfg.time = _setupCfgTimeBeforeRtc;
      const timeBox = document.getElementById('setup-time');
      if (timeBox) {
        timeBox.querySelectorAll('.setup-opt').forEach(function(b){
          b.classList.toggle('active', (b.getAttribute('onclick')||'').indexOf("'"+_setupCfgTimeBeforeRtc+"'") >= 0);
        });
      }
      _setupCfgTimeBeforeRtc = undefined;
    }
    /* Le libelle du deuxieme bouton depend du contexte : face a l'IA c'est
       elle qui joue les blancs, en direct c'est l'autre joueur. */
    const advBtn = document.querySelector('#setup-first .setup-opt:nth-child(2)');
    if (advBtn) advBtn.textContent = isRtc ? '⚪ Mon adversaire' : '⚪ Adversaire';
  }
  /* Indication reelle (profondeur + budget temps) sous les boutons de niveau —
     memes chiffres EXACTS que ceux que l'IA va vraiment utiliser (meme table
     AI_DIFFICULTY_CONFIG), pas une description vague inventee a part.
     Demande d'Olivier : des niveaux plus progressifs + voir ce qui change. */
  if (group === 'diff') {
    const info = document.getElementById('setup-diff-info');
    const cfg = (typeof AI_DIFFICULTY_CONFIG !== 'undefined') ? AI_DIFFICULTY_CONFIG[value] : null;
    if (info && cfg) info.textContent = cfg.label;
  }
}

function setupToggle(key, on) { _setupCfg[key] = on; }

/* Ouvre la configuration. C'est le nouveau point d'entree de « Jouer ». */
function openGameSetup() {
  showPage('setup');
  // Affiche l'indication du niveau actif (Facile par defaut) des l'ouverture,
  // pas seulement apres un clic — meme table que la decision reelle de l'IA.
  const info = document.getElementById('setup-diff-info');
  const cfg = (typeof AI_DIFFICULTY_CONFIG !== 'undefined') ? AI_DIFFICULTY_CONFIG[_setupCfg.diff] : null;
  if (info && cfg) info.textContent = cfg.label;
  // Reflete le moteur reellement actif (choisi ici ou depuis Labo IA) plutot
  // que de toujours reafficher "Moteur actuel" par defaut -- sans ca, un
  // choix fait dans Labo IA etait silencieusement ecrase des qu'on lancait
  // une partie depuis cet ecran sans y retoucher. Trouve en testant le
  // scenario reel avant de documenter (a tort) une synchronisation qui
  // n'existait pas encore.
  const liveEngine = (typeof _engineMode !== 'undefined' && _engineMode) ? _engineMode : 'actuel';
  _setupCfg.engine = liveEngine;
  const engineBox = document.getElementById('setup-engine');
  if (engineBox) {
    engineBox.querySelectorAll('.setup-opt').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('onclick') === "setupPick('engine','" + liveEngine + "',this)");
    });
  }
}

/* Applique toute la configuration puis bascule sur le plateau. */
function startConfiguredGame() {
  const c = _setupCfg;
  /* Chaque etape est isolee : un reglage secondaire qui echoue ne doit pas
     empecher la partie de demarrer. Le bug precedent laissait le joueur
     bloque « en attente du coup adverse » quand une etape levait une
     exception avant meme resetGame. */
  const step = (fn) => { try { fn(); } catch (e) { if (window.console) console.warn('config:', e && e.message); } };

  step(function(){
    if (typeof currentLayout !== 'undefined') {
      if (c.layout === 'random') {
        // Tire une vraie disposition au hasard parmi celles reellement
        // disponibles (Object.keys(LAYOUTS)) -- jamais une liste ecrite a
        // la main qui deviendrait perimee des le prochain ajout de variante.
        // "decouverte" est exclue explicitement : ce n'est pas une variante
        // a essayer au hasard, c'est le plateau reduit (7 billes/camp) du
        // Mode Enfant -- un joueur qui clique "Aleatoire" ne s'attend pas a
        // tomber dessus sans contexte.
        const keys = Object.keys(LAYOUTS).filter(function(k){ return k !== 'decouverte'; });
        currentLayout = keys[Math.floor(Math.random() * keys.length)];
      } else {
        currentLayout = c.layout;
      }
    }
  });
  step(function(){
    document.querySelectorAll('[id^="layout-"]').forEach(function(b){
      b.classList.toggle('active', b.id === 'layout-' + c.layout);
    });
  });
  /* Le moteur ne connait que 'ai' et 'local'. Le mode 'rtc' (partie en
     direct) est un mode local du point de vue du jeu -- aucune IA ne joue --
     mais avec un camp choisi et le panneau de connexion ouvert au
     lancement. Demande d'Olivier : le choisir comme un adversaire, pas
     comme une action en cours de partie. */
  const _isRtc = (c.mode === 'rtc');
  step(function(){ if (typeof GameMode !== 'undefined') GameMode.set(_isRtc ? 'local' : c.mode); });
  step(function(){
    ['mode-ai','mode-local'].forEach(function(id){
      var b = document.getElementById(id); if (b) b.classList.toggle('active', id === 'mode-' + (_isRtc ? 'local' : c.mode));
    });
  });

  /* Camp : en IA, l'humain tient la couleur choisie ; les noirs jouent
     toujours le premier coup. Si l'humain a choisi de jouer second, il
     prend les blancs et l'IA (noire) ouvre. */
  /* Camp : en IA, l'humain tient la couleur choisie ; les noirs jouent
     toujours le premier coup. « random » tire le camp au sort au lancement,
     de sorte que ni le joueur ni l'IA ne sait a l'avance qui ouvre. */
  let _first = c.first;
  if ((c.mode === 'ai' || _isRtc) && _first === 'random') {
    _first = (Math.random() < 0.5) ? 'black' : 'white';
    if (typeof showToast === 'function') {
      showToast(_first === 'black' ? '🎲 Vous jouez les noirs' : '🎲 Vous jouez les blancs');
    }
  }
  HumanColor.set((c.mode === 'ai' || _isRtc) ? _first : 'black');
  step(function(){ if (typeof applyPovOrientation === 'function') applyPovOrientation(); });

  if (c.mode === 'ai') {
    step(function(){ if (typeof setAIStyle === 'function') setAIStyle(c.style); });
    step(function(){ if (typeof aiDifficulty !== 'undefined') aiDifficulty = c.diff; });
    step(function(){
      document.querySelectorAll('[id^="diff-"]').forEach(function(b){
        b.classList.toggle('active', b.id === 'diff-' + c.diff);
      });
    });
    step(function(){ if (typeof _engineMode !== 'undefined') _engineMode = (c.engine === 'actuel') ? null : c.engine; });
  }

  /* Cadence : jamais de pendule en partie en direct, quelle que soit la
     valeur restee dans la configuration -- garde de securite en plus du
     masquage de la carte, pour que l'echange de codes ne fasse jamais
     perdre au temps. */
  step(function(){ if (typeof setTimeControl === 'function') setTimeControl(_isRtc ? '' : c.time); });
  step(function(){ var t = document.getElementById('time-ctl-select'); if (t) t.value = _isRtc ? '' : c.time; });
  step(function(){ if (typeof toggleMoveHints === 'function') toggleMoveHints(c.hints); });
  step(function(){ var h = document.getElementById('game-hints-toggle'); if (h) h.checked = c.hints; });
  step(function(){ if (typeof toggleCoordinates === 'function') toggleCoordinates(c.coords); });
  step(function(){ if (typeof syncCoordsToggles === 'function') syncCoordsToggles(c.coords); });

  // Le plateau, puis la partie
  showPage('game');
  if (typeof resetGame === 'function') resetGame();

  /* Declenchement de l'IA aligne sur le reste du jeu (meme forme qu'apres un
     coup humain et en tournoi) : si ce n'est pas au tour de l'humain, l'IA
     joue. Robuste quel que soit le camp choisi. */
  if (c.mode === 'ai' && typeof CurrentTurn !== 'undefined'
      && CurrentTurn.get() !== HumanColor.get() && !GameOver.get() && typeof aiMove === 'function') {
    setTimeout(function(){ if (!GameOver.get() && CurrentTurn.get() !== HumanColor.get()) aiMove(); }, 700);
  }

  /* Partie en direct : ouvre le panneau de connexion apres le lancement,
     SAUF si la connexion a deja ete etablie pendant la configuration
     (nouveau chemin, la connexion peut desormais se faire avant meme de
     lancer la partie) -- sinon un second panneau redondant s'ouvrirait
     par-dessus une connexion deja active. */
  if (_isRtc && typeof openRtcPanel === 'function'
      && !(typeof _rtcChannel !== 'undefined' && _rtcChannel && _rtcChannel.readyState === 'open')) {
    setTimeout(function(){ openRtcPanel(); }, 400);
  }
}

/* Coordonnees : un seul etat pour les trois interrupteurs (config, jeu,
   parametres). Tous suivent. */
/* Les sons ont un interrupteur en jeu et un dans Parametres : le meme etat. */
function syncSoundToggles(on) {
  ['game-sound-toggle','settings-sound-toggle'].forEach(function(id){
    var el = document.getElementById(id);
    if (el && el.type === 'checkbox') {
      el.checked = on;
      var sw = el.nextElementSibling;
      if (sw && sw.style) sw.style.background = on ? 'var(--gold)' : 'var(--border)';
    }
  });
}

/* La notation vit en jeu et dans Parametres. On reflete l'etat reel des deux
   systemes sur les quatre interrupteurs. */
function syncNotationToggles() {
  var ap = document.getElementById('notation-abapro-toggle');
  var na = document.getElementById('notation-nacre-toggle');
  var apOn = ap ? ap.checked : true;
  var naOn = na ? na.checked : false;
  [['settings-abapro-toggle', apOn], ['notation-abapro-toggle', apOn],
   ['settings-nacre-toggle', naOn], ['notation-nacre-toggle', naOn]].forEach(function(pair){
    var el = document.getElementById(pair[0]);
    if (el && el.type === 'checkbox') {
      el.checked = pair[1];
      var sw = el.nextElementSibling;
      if (sw && sw.style) sw.style.background = pair[1] ? 'var(--gold)' : 'var(--border)';
    }
  });
}

function syncCoordsToggles(on) {
  ['setup-coords','game-coords-toggle','settings-coords-toggle','show-coords-toggle','coords-toggle-acc'].forEach(function(id){
    var el = document.getElementById(id);
    if (el && el.type === 'checkbox') {
      el.checked = on;
      var sw = el.nextElementSibling;
      if (sw && sw.style) sw.style.background = on ? 'var(--gold)' : 'var(--border)';
    }
  });
}

/* Le Labo quitte le panneau de jeu pour devenir une entree du menu. Il reste
   un modal (le plateau tourne derriere), mais on l'atteint desormais sans etre
   deja en partie. Refuse en mode Enfant, comme toutes les entrees masquees. */
function openLabFromMenu(btn) {
  if (typeof kidsMode !== 'undefined' && kidsMode) {
    if (typeof showToast === 'function') showToast('Le Labo n\'est pas disponible en mode Enfant');
    return;
  }
  document.querySelectorAll('.sidebar-item').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  if (window.innerWidth < 600 && typeof closeSidebarMobile === 'function') closeSidebarMobile();
  if (typeof openLabModal === 'function') openLabModal();
}

function computePlayerRadar() {
  const p = progress;
  const games = Math.max(1, p.gamesPlayed || 0);
  const moves = Math.max(1, p.totalMoves || 0);
  const wr = (p.gamesPlayed ? p.gamesWon / p.gamesPlayed : 0); // 0..1

  // — Fondamentaux —
  const aggr = Math.min(100, Math.round(((p.totalEjections||0) + (p.totalPushes||0)) / games * 18 + wr*20));
  const lossRate = (p.gamesPlayed ? (p.gamesLost||0)/p.gamesPlayed : 0);
  const def = Math.min(100, Math.round((1 - lossRate) * 70 + 15));
  const speed = Math.min(100, Math.round((p.fastMoves||0) / moves * 100));
  const prec = Math.min(100, Math.round((p.bestMoves||0) / moves * 100));

  // — Spécifiques Abalone —
  // Contrôle du centre : part des tours avec domination centrale
  const center = Math.min(100, Math.round((p.centerTurns||0) / moves * 100));
  // Cohésion : moyenne des scores de cohésion par coup
  const cohesion = Math.min(100, Math.round((p.cohesionSum||0) / moves * 100));
  // Efficacité des poussées : poussées réussies / tentatives
  const pushEff = Math.min(100, Math.round((p.pushAttempts ? (p.totalPushes||0)/p.pushAttempts : 0) * 100));
  // Taux de conversion : parties menées transformées en victoires
  const conversion = Math.min(100, Math.round((p.leadGames ? (p.leadWins||0)/p.leadGames : 0) * 100));

  return {
    agressivite: Math.max(aggr, 12),
    defense:     Math.max(def, 12),
    rapidite:    Math.max(speed, 10),
    precision:   Math.max(prec, 10),
    centre:      Math.max(center, 10),
    cohesion:    Math.max(cohesion, 10),
    poussee:     Math.max(pushEff, 10),
    conversion:  Math.max(conversion, 10),
  };
}

function buildRadarSVG(dataObj, keys, labels, size) {
  size = size || 300;
  const vals = keys.map(k => dataObj[k]);
  const maxVal = 100;
  const cx = size/2, cy = size/2, r = size*0.30;
  const rings = [20,40,60,80,100].map(pct => {
    const rr = r * pct / 100;
    const pts = keys.map((_, i) => {
      const a = (Math.PI*2*i/keys.length) - Math.PI/2;
      return `${cx + rr*Math.cos(a)},${cy + rr*Math.sin(a)}`;
    }).join(' ');
    return `<polygon points="${pts}" fill="none" stroke="rgba(200,168,75,0.12)" stroke-width="1"/>`;
  }).join('');
  const axes = keys.map((_, i) => {
    const a = (Math.PI*2*i/keys.length) - Math.PI/2;
    return `<line x1="${cx}" y1="${cy}" x2="${cx + r*Math.cos(a)}" y2="${cy + r*Math.sin(a)}" stroke="rgba(200,168,75,0.18)" stroke-width="1"/>`;
  }).join('');
  const dataPts = vals.map((v,i) => {
    const a = (Math.PI*2*i/vals.length) - Math.PI/2;
    const d = r * v / maxVal;
    return `${cx + d*Math.cos(a)},${cy + d*Math.sin(a)}`;
  }).join(' ');
  const valDots = vals.map((v,i) => {
    const a = (Math.PI*2*i/vals.length) - Math.PI/2;
    const d = r * v / maxVal;
    const px = cx + d*Math.cos(a), py = cy + d*Math.sin(a);
    return `<circle cx="${px}" cy="${py}" r="3" fill="#c8a84b"/><text x="${px+5}" y="${py-5}" fill="#e8c96e" font-size="9" font-family="DM Mono,monospace">${v}</text>`;
  }).join('');
  const lblSvg = labels.map((l,i) => {
    const a = (Math.PI*2*i/labels.length) - Math.PI/2;
    const lx = cx + (r+22)*Math.cos(a), ly = cy + (r+22)*Math.sin(a);
    const anchor = lx < cx-5 ? 'end' : lx > cx+5 ? 'start' : 'middle';
    return `<text x="${lx}" y="${ly}" fill="#c8a84b" font-size="10" text-anchor="${anchor}" dominant-baseline="middle" font-family="DM Sans,sans-serif">${l}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    ${rings}${axes}
    <polygon points="${dataPts}" fill="rgba(200,168,75,0.18)" stroke="#c8a84b" stroke-width="2"/>
    ${valDots}${lblSvg}
  </svg>`;
}

/* ═══════════════════════════════════════════════════════════════════════
   RADAR A 15 AXES, NORMALISE PAR PERCENTILE
   Chaque axe est situe contre le corpus reel de 2589 parties MiGs : la
   valeur affichee est un PERCENTILE, pas un score brut. « 100 » veut donc
   dire « au niveau des meilleurs du corpus », non « peu de donnees ».
   C'etait le defaut de l'ancien radar : trois axes saturaient a 100 sur
   quelques parties. Ici, sans reference disponible pour un axe, on marque
   la valeur comme non calibree plutot que de la gonfler.
   ═══════════════════════════════════════════════════════════════════════ */

/* References MiGs : pour chaque axe, les deciles q10/med/q90 (ou l'echelle
   naturelle 0..1 quand la mesure est deja bornee). `invert:true` = plus la
   valeur brute est PETITE, meilleur c'est (compacite, groupes subis). */
const RADAR_AXES = [
  { key:'aggression', label:'Agressivité',      def:"Éjections + poussées par partie.",                    ref:{q10:0.5,med:3.0,q90:6.5} },
  { key:'defense',    label:'Défense',          def:"Part de parties non perdues.",                        ref:{q10:0.2,med:0.5,q90:0.8} },
  { key:'speed',      label:'Rapidité',         def:"Part de coups joués sans longue réflexion.",          ref:{q10:0.1,med:0.35,q90:0.7} },
  { key:'precision',  label:'Précision',        def:"Part de coups jugés optimaux par le moteur.",         ref:{q10:0.15,med:0.4,q90:0.7} },
  { key:'center',     label:'Contrôle centre',  def:"Part de coups avec domination du centre.",            ref:{q10:0.2,med:0.45,q90:0.75} },
  { key:'cohesion',   label:'Cohésion',         def:"Compacité moyenne des billes.",                       ref:{q10:0.35,med:0.6,q90:0.85} },
  { key:'pushEff',    label:'Poussées',         def:"Poussées réussies / tentatives.",                     ref:{q10:0.2,med:0.5,q90:0.8} },
  { key:'conversion', label:'Conversion',       def:"Parties menées ET gagnées / parties menées.",         ref:{q10:0.3,med:0.6,q90:0.9} },
  /* ── cinq axes issus de la littérature (Schmittberger, ABA-PRO, arXiv) ── */
  { key:'compact',    label:'Compacité géo.',   def:"Distance moyenne au centre de masse — la mesure d'ABA-PRO. Plus petit = plus resserré.", ref:{q10:1.94,med:2.26,q90:2.63}, invert:true },
  { key:'tempo',      label:"Tempo d'attaque",  def:"Coup de la première éjection. Le corpus attaque au coup 27 en médiane.",                ref:{q10:13,med:27,q90:48}, invert:true },
  { key:'flank',      label:'Jeu de flanc',     def:"Part de coups latéraux (broadside) plutôt qu'en ligne. Attaquer de côté, non de face.",  ref:{q10:0.048,med:0.09,q90:0.154} },
  { key:'fragment',   label:'Fragmentation',    def:"Nombre de groupes séparés imposés à l'adversaire. Diviser pour régner.",                 ref:{q10:2.0,med:3.0,q90:4.19} },
  { key:'sacrifice',  label:'Sacrifice',        def:"Billes cédées suivies d'un gain net — sacrifice calculé.",                               ref:{q10:0,med:0.5,q90:2} },
  /* ── deux axes de méta-jeu, calibrés sur les compteurs existants ── */
  { key:'discipline', label:'Discipline déf.',  def:"Billes atteignant le bord sans être perdues vs éjectées.",                               ref:{q10:0.2,med:0.5,q90:0.8} },
  { key:'activity',   label:'Activité',         def:"Longueur de partie : mène-t-on des parties longues et travaillées ?",                    cdf:PERF_REF_LEN }
];

/* Position en percentile (0..100) d'une valeur brute dans une reference. */
function _axisPercentile(ax, v) {
  if (v === null || v === undefined) return null;
  if (ax.cdf) return _perfPercentile(ax.cdf, v);
  const r = ax.ref;
  if (!r) return null;
  /* Interpolation lineaire par morceaux sur q10/med/q90, extrapolee aux bords. */
  let p;
  if (v <= r.q10)      p = 10 * (v - (r.q10 - (r.med-r.q10))) / Math.max(1e-9, (r.med-r.q10));
  else if (v <= r.med) p = 10 + 40 * (v - r.q10) / Math.max(1e-9, (r.med - r.q10));
  else if (v <= r.q90) p = 50 + 40 * (v - r.med) / Math.max(1e-9, (r.q90 - r.med));
  else                 p = 90 + 10 * (v - r.q90) / Math.max(1e-9, (r.q90 - r.med));
  p = Math.max(0, Math.min(100, p));
  return Math.round(ax.invert ? 100 - p : p);
}

/* Valeurs BRUTES de chaque axe depuis progress. null = donnee absente. */
function computeRadarRaw() {
  const p = progress;
  const G = p.gamesPlayed || 0, M = p.totalMoves || 0;
  const r = (num, den) => den > 0 ? num / den : null;
  return {
    aggression: r((p.totalEjections||0)+(p.totalPushes||0), G),
    defense:    r((p.gamesPlayed||0)-(p.gamesLost||0), G),
    speed:      r(p.fastMoves, M),
    precision:  r(p.bestMoves, M),
    center:     r(p.centerTurns, M),
    cohesion:   r(p.cohesionSum, M),
    pushEff:    r(p.totalPushes, p.pushAttempts),
    conversion: r(p.leadWins, p.leadGames),
    compact:    (p.compactSum ? r(p.compactSum, p.compactSamples||M) : null),
    tempo:      (p.firstEjSum && p.firstEjGames ? r(p.firstEjSum, p.firstEjGames) : null),
    flank:      (p.broadsideMoves != null ? r(p.broadsideMoves, M) : null),
    fragment:   (p.oppGroupSum ? r(p.oppGroupSum, p.oppGroupSamples||M) : null),
    sacrifice:  (p.sacrifices != null ? r(p.sacrifices, G) : null),
    discipline: (p.edgeSurvived != null ? r(p.edgeSurvived, (p.edgeSurvived+(p.gamesLost?0:0))||1) : null),
    activity:   r(M, G)
  };
}

/* Percentiles par axe, prets pour le trace. */
function computeRadarPercentiles() {
  const raw = computeRadarRaw();
  const out = {};
  RADAR_AXES.forEach(ax => { out[ax.key] = { pct:_axisPercentile(ax, raw[ax.key]), raw:raw[ax.key] }; });
  return out;
}

let _radarSelected = null;   // axe mis en valeur au clic

function buildRadar15(size) {
  size = size || 380;
  const data = computeRadarPercentiles();
  const n = RADAR_AXES.length;
  const cx = size/2, cy = size/2, R = size*0.32;
  const ptAt = (i, rad) => {
    const a = (Math.PI*2*i/n) - Math.PI/2;
    return [cx + rad*Math.cos(a), cy + rad*Math.sin(a)];
  };

  // toile
  let grid = '';
  [20,40,60,80,100].forEach(pct => {
    const pts = RADAR_AXES.map((_,i)=>ptAt(i, R*pct/100).map(x=>x.toFixed(1)).join(',')).join(' ');
    grid += '<polygon points="'+pts+'" fill="none" stroke="var(--border)" stroke-width="0.6" opacity="0.5"/>';
  });
  RADAR_AXES.forEach((ax,i)=>{
    const [x,y]=ptAt(i,R);
    grid += '<line x1="'+cx+'" y1="'+cy+'" x2="'+x.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="var(--border)" stroke-width="0.6" opacity="0.4"/>';
  });

  // aire (les axes non calibres sont poses a 0 pour ne pas fausser le trace)
  const poly = RADAR_AXES.map((ax,i)=>{
    const pc = data[ax.key].pct; const v = (pc==null?0:pc);
    return ptAt(i, R*v/100).map(x=>x.toFixed(1)).join(',');
  }).join(' ');

  // sommets + libelles cliquables
  let dots='', labs='';
  RADAR_AXES.forEach((ax,i)=>{
    const d=data[ax.key]; const pc=d.pct; const v=(pc==null?0:pc);
    const [px,py]=ptAt(i, R*v/100);
    const sel = _radarSelected===ax.key;
    const uncal = pc==null;
    const col = uncal ? 'var(--muted)' : sel ? '#fff' : 'var(--gold)';
    dots += '<circle cx="'+px.toFixed(1)+'" cy="'+py.toFixed(1)+'" r="'+(sel?5:3)+'" fill="'+col+'"'
         + (uncal?' opacity="0.4"':'')+'/>';
    if(sel){ dots += '<text x="'+px.toFixed(1)+'" y="'+(py-9).toFixed(1)+'" text-anchor="middle" '
      + 'font-family="\'DM Mono\',monospace" font-size="12" font-weight="700" fill="#fff">'+(uncal?'—':('P'+pc))+'</text>'; }
    const [lx,ly]=ptAt(i, R*1.16);
    const anchor = Math.abs(lx-cx)<8 ? 'middle' : (lx<cx?'end':'start');
    labs += '<text x="'+lx.toFixed(1)+'" y="'+ly.toFixed(1)+'" text-anchor="'+anchor+'" '
      + 'font-family="\'DM Sans\',sans-serif" font-size="11" fill="'+(sel?'var(--gold)':'var(--muted)')+'" '
      + (sel?'font-weight="700" ':'')+'style="cursor:pointer" onclick="selectRadarAxis(\''+ax.key+'\')">'+ax.label+'</text>';
  });

  return '<svg viewBox="0 0 '+size+' '+size+'" width="100%" style="max-width:'+size+'px" xmlns="http://www.w3.org/2000/svg">'
    + grid
    + '<polygon points="'+poly+'" fill="rgba(217,164,65,0.16)" stroke="var(--gold)" stroke-width="1.5"/>'
    + dots + labs + '</svg>';
}

function selectRadarAxis(key) {
  _radarSelected = (_radarSelected===key ? null : key);
  renderPersonalRadar();
}

function renderPersonalRadar() {
  const host = document.getElementById('personal-radar');
  if (!host) return;
  if (!(progress.gamesPlayed > 0)) {
    host.innerHTML = '<div style="padding:22px;text-align:center;color:var(--muted);font-size:13px;'
      + 'border:1px dashed var(--border);border-radius:10px">Aucune partie enregistree pour l\'instant.'
      + '<br><span style="font-size:12px">Le radar se remplit des votre premiere partie.</span></div>';
    return;
  }
  const data = computeRadarPercentiles();
  /* Point fort / point faible parmi les seuls axes CALIBRES : un axe sans
     reference ne peut pas etre declare fort ou faible sans mentir. */
  const cal = RADAR_AXES.filter(a => data[a.key].pct !== null);
  let best=null, worst=null;
  cal.forEach(a => {
    const pc = data[a.key].pct;
    if (!best || pc > data[best.key].pct) best = a;
    if (!worst || pc < data[worst.key].pct) worst = a;
  });

  let detail = '';
  if (_radarSelected) {
    const ax = RADAR_AXES.find(a => a.key === _radarSelected);
    const d = data[ax.key];
    const rawTxt = d.raw==null ? 'donnee absente'
      : (Math.abs(d.raw) < 2 ? (d.raw*100).toFixed(1)+' %' : d.raw.toFixed(2));
    detail = '<div style="margin-top:12px;padding:12px 14px;border:1px solid var(--gold);border-radius:8px;background:rgba(217,164,65,0.06)">'
      + '<div style="font-size:14px;font-weight:700;color:var(--gold)">'+ax.label+'</div>'
      + '<div style="font-size:12px;color:var(--text);margin:4px 0">'+ax.def+'</div>'
      + '<div style="font-family:\'DM Mono\',monospace;font-size:12px;color:var(--muted)">'
      +   'Valeur : '+rawTxt+' &middot; '+(d.pct==null?'<span style="color:var(--muted)">non calibre (pas de reference)</span>':'<span style="color:var(--gold)">P'+d.pct+' vs 2589 parties MiGs</span>')+'</div></div>';
  } else {
    detail = '<div style="margin-top:12px;font-size:11px;color:var(--muted);text-align:center">'
      + 'Touchez le nom d\'un axe pour le mettre en valeur et voir son detail.</div>';
  }

  host.innerHTML =
    buildRadar15(380)
    + '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:6px">'
    +   (best ? '<span style="font-size:11px;color:var(--muted)">Point fort : <b style="color:var(--gold)">'+best.label+'</b> (P'+data[best.key].pct+')</span>' : '')
    +   (worst && worst!==best ? '<span style="font-size:11px;color:var(--muted)">A travailler : <b style="color:var(--text)">'+worst.label+'</b> (P'+data[worst.key].pct+')</span>' : '')
    + '</div>'
    + detail;
}

function toggleRadarVisibility(show) {
  progress.showRadar = !!show;
  saveProgress(progress);
  renderPersonalRadar();
  if (typeof renderPerfDetail === 'function') renderPerfDetail();
  showToast(show ? '📊 Radar de performance affiché' : '📊 Radar masqué');
}

