/* ═══════════════════════════════════════════
   EXPORT D'UNE PARTIE EN NOTATION ABA-PRO LINÉAIRE
   Format : 1.a1b2 i5h5 2.a2b3 i6h6 3.c2c3 g4g5 ...
   (numéro de coup, coup des Noirs, coup des Blancs)
   Compatible avec les fichiers MiGs et la base de Graz.
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════
   PARTAGE D'UNE POSITION PAR URL
   Encode le plateau de façon compacte en base64, à coller dans un lien.
   Ex: abalassembly.com/?pos=XXXX → la position se charge au chargement.
═══════════════════════════════════════════ */
// Encode le plateau courant en chaîne compacte (61 cases : 0=vide, 1=noir, 2=blanc)
function encodePosition(brd) {
  let s = '';
  for (let r=0;r<9;r++) {
    for (let c=0;c<ROWS[r];c++) {
      const v = brd[r+','+c];
      s += (v === 'black') ? '1' : (v === 'white') ? '2' : '0';
    }
  }
  // compresse en base64 (URL-safe)
  try {
    return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  } catch(e) { return s; }
}

// Décode une chaîne en plateau
function decodePosition(str) {
  let s;
  try {
    s = atob(str.replace(/-/g,'+').replace(/_/g,'/'));
  } catch(e) { s = str; }
  if (!s || s.length < 61) return null;
  const brd = {};
  let idx = 0;
  for (let r=0;r<9;r++) {
    for (let c=0;c<ROWS[r];c++) {
      const ch = s[idx++];
      if (ch === '1') brd[r+','+c] = 'black';
      else if (ch === '2') brd[r+','+c] = 'white';
    }
  }
  return brd;
}

// Génère un lien de partage de la position courante
function sharePositionURL() {
  const code = encodePosition(board);
  const url = location.origin + location.pathname + '?pos=' + code;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function(){
      showToast('🔗 Lien de la position copié ! Colle-le sur Discord.');
    }).catch(function(){ showExportModal(url); });
  } else {
    showExportModal(url);
  }
}

// Au chargement : si l'URL contient ?pos=, charge la position dans l'éditeur
function loadPositionFromURL() {
  try {
    const params = new URLSearchParams(location.search);
    const pos = params.get('pos');
    if (!pos) return;
    const brd = decodePosition(pos);
    if (!brd || Object.keys(brd).length === 0) return;
    // charge dans l'éditeur pour visualisation/jeu
    if (typeof editorBoard !== 'undefined') {
      editorBoard = brd;
      setTimeout(function(){
        showPage('editor');
        if (typeof drawEditorBoard === 'function') drawEditorBoard();
        showToast('🔗 Position chargée depuis le lien !');
      }, 600);
    }
  } catch(e) {}
}

// Génère un lien de partage de la position de l'éditeur
function shareEditorPositionURL() {
  if (typeof editorBoard === 'undefined' || Object.keys(editorBoard).length === 0) {
    showToast('⚠️ L\'éditeur est vide — place des billes d\'abord');
    return;
  }
  const code = encodePosition(editorBoard);
  const url = location.origin + location.pathname + '?pos=' + code;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(function(){
      showToast('🔗 Lien copié ! Colle-le sur Discord pour partager cette position.');
    }).catch(function(){ showExportModal(url); });
  } else {
    showExportModal(url);
  }
}

function buildGameNotation(system, upToIdx) {
  /* Un export ne doit contenir QU'UN systeme de notation. Le label stocke
     dans boardSnapshots reprend l'affichage de l'historique : quand les deux
     colonnes Aba-Pro et Nacre sont cochees, il contient les deux collees, et
     l'export sortait « a2a3a1a3 » — illisible et non rejouable. Signale par
     Saab. On reconstruit donc la notation depuis moveInfo, dans le systeme
     demande (« abapro » par defaut, sinon « nacre »). */
  if (!boardSnapshots || boardSnapshots.length === 0) return '';
  var useNacre = (system === 'nacre');
  /* Borne optionnelle : en replay, on n'exporte que jusqu'au coup affiche,
     pour que la sequence et le score se rapportent au meme instant. Sans
     borne, on exporte toute la partie. Signale par Saab (v1.17). */
  var snaps = (typeof upToIdx === 'number' && upToIdx >= 0)
    ? boardSnapshots.slice(0, upToIdx + 1) : boardSnapshots;
  const moves = snaps
    .filter(function(s){ return s.color; })
    .map(function(s){
      var n = '';
      if (s.moveInfo && s.moveInfo.cells && s.moveInfo.dir) {
        try {
          n = useNacre ? moveToNACRE(s.moveInfo.cells, s.moveInfo.dir, s.moveInfo.type)
                       : moveToABAPRO(s.moveInfo.cells, s.moveInfo.dir, s.moveInfo.type);
        } catch(e) { n = ''; }
      }
      if (!n && s.label) n = String(s.label).split(/[^a-i0-9]+/i)[0] || '';
      return { notation: String(n).replace(/[^a-i0-9]/g,''), color: s.color };
    })
    .filter(function(m){ return m.notation.length > 0; });
  // assemble en paires (noir, blanc) numérotées
  let out = '';
  let moveNum = 1;
  for (let i = 0; i < moves.length; i += 2) {
    const black = moves[i] && moves[i].color === 'black' ? moves[i].notation : (moves[i] ? moves[i].notation : '');
    const white = moves[i+1] ? moves[i+1].notation : '';
    out += moveNum + '.' + black + (white ? ' ' + white : '');
    if (i + 2 < moves.length) out += ' ';
    moveNum++;
  }
  return out.trim();
}

function exportGameNotation() {
  /* Systeme exporte : celui affiche dans l'historique. Si les deux colonnes
     sont cochees, l'Aba-Pro fait foi — un fichier ne peut en contenir qu'un. */
  var system = (typeof notationNacre !== 'undefined' && notationNacre
                && !(typeof notationAbaPro !== 'undefined' && notationAbaPro)) ? 'nacre' : 'abapro';
  /* En replay, on exporte la partie telle qu'affichee : sequence ET score
     s'arretent au coup actif. Hors replay, toute la partie. Corrige
     l'incoherence signalee par Saab (score au coup actif, sequence complete). */
  var inReplay = (typeof replayMode !== 'undefined' && replayMode
                  && typeof replayCurrentIdx !== 'undefined');
  var bound = inReplay ? replayCurrentIdx : undefined;
  const notation = buildGameNotation(system, bound);
  var scB = capturedByBlack, scW = capturedByWhite;
  if (inReplay) {
    /* CORRECTIF (signale par Olivier) : au chargement d'une partie depuis
       l'historique, le replay se positionne desormais AU DEBUT (v2.30) --
       replayCurrentIdx vaut donc -1, et cette branche forçait le score a
       0-0 alors que la sequence exportee, elle, est COMPLETE. Resultat :
       une partie gagnee 6-0 s'exportait "Noirs 0 - 0 Blancs".
       Le score doit correspondre a ce que la SEQUENCE contient. A l'index
       -1 (position de depart) la sequence est deja complete via
       buildGameNotation(bound=-1) qui ne borne rien : on prend donc le
       score final de la partie, pas zero. */
    if (replayCurrentIdx >= 0 && boardSnapshots[replayCurrentIdx]) {
      scB = boardSnapshots[replayCurrentIdx].capturedByBlack;
      scW = boardSnapshots[replayCurrentIdx].capturedByWhite;
    } else if (replayCurrentIdx < 0 && boardSnapshots.length) {
      const last = boardSnapshots[boardSnapshots.length - 1];
      scB = last.capturedByBlack; scW = last.capturedByWhite;
    }
  }
  if (!notation) { showToast('⚠️ Aucun coup à exporter — jouez d\'abord'); return; }
  /* Horodatage YYMMJJhhmm : trie chronologiquement dans l'ordre alphabetique
     et distingue plusieurs parties jouees le meme jour. Suggestion de Saab. */
  const d = new Date();
  const p2 = function(v){ return String(v).padStart(2, '0'); };
  const stamp = p2(d.getFullYear() % 100) + p2(d.getMonth() + 1) + p2(d.getDate())
              + p2(d.getHours()) + p2(d.getMinutes());
  /* En-tete enrichi (demande d'Olivier) : la date, la variante, le style et
     le niveau de l'IA, le moteur utilise et le nombre de coups etaient
     affiches dans l'historique mais ABSENTS de l'export -- l'information
     etait donc perdue des qu'on partageait une partie. Chaque ligne n'est
     ajoutee que si la donnee existe reellement (une partie locale n'a pas
     d'adversaire IA), plutot que d'ecrire un champ vide ou invente.
     [Score] garde volontairement le format "Noirs X - Y Blancs" pour rester
     lisible par les autres sites, comme demande. */
  let header = '[Abalassembly] ' + stamp
             + '\n[Date] ' + p2(d.getDate()) + '/' + p2(d.getMonth()+1) + '/' + d.getFullYear()
                           + ' ' + p2(d.getHours()) + ':' + p2(d.getMinutes());
  if (typeof currentLayout !== 'undefined' && currentLayout) {
    const vlabel = (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[currentLayout]) ? HEAT_VARIANT_LABEL[currentLayout] : currentLayout;
    header += '\n[Variante] ' + vlabel;
  }
  if (typeof GameMode !== 'undefined' && GameMode.get() === 'ai') {
    const st = (typeof _setupCfg !== 'undefined' && _setupCfg.style) ? _setupCfg.style : null;
    const df = (typeof _setupCfg !== 'undefined' && _setupCfg.diff) ? _setupCfg.diff : null;
    if (st || df) header += '\n[IA] ' + [st, df].filter(Boolean).join(' — ');
    const eng = (typeof _engineMode !== 'undefined' && _engineMode) ? _engineMode : 'moteur classique';
    header += '\n[Moteur] ' + eng;
  }
  const nbCoups = (typeof boardSnapshots !== 'undefined' && boardSnapshots.length)
    ? (inReplay && replayCurrentIdx >= 0 ? replayCurrentIdx + 1 : boardSnapshots.length) : 0;
  if (nbCoups) header += '\n[Coups] ' + nbCoups;
  header += '\n[Notation] ' + (system === 'nacre' ? 'Nacre' : 'Aba-Pro')
          + '\n[Score] Noirs ' + scB + ' - ' + scW + ' Blancs\n\n';
  const full = header + notation;
  // copie dans le presse-papier
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(full).then(function(){
      showToast('📋 Partie copiée (' + (system === 'nacre' ? 'Nacre' : 'Aba-Pro') + ') !');
    }).catch(function(){
      showExportModal(full);
    });
  } else {
    showExportModal(full);
  }
}

// Fenêtre de secours si le presse-papier n'est pas accessible
function showExportModal(text) {
  let modal = document.getElementById('export-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'export-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(13,15,14,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML = '<div style="max-width:480px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:24px">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:12px">📋 Notation de la partie</h3>'
    + '<textarea readonly style="width:100%;height:160px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:12px;font-family:\'DM Mono\',monospace;font-size:13px;resize:none">' + text + '</textarea>'
    + '<div style="display:flex;gap:8px;margin-top:14px;justify-content:flex-end">'
    + '<button onclick="document.getElementById(\'export-modal\').remove()" style="padding:9px 20px;background:var(--gold);border:none;border-radius:7px;color:#0d0f0e;font-weight:700;cursor:pointer;font-family:DM Sans,sans-serif">Fermer</button>'
    + '</div></div>';
  document.body.appendChild(modal);
  // sélectionne le texte pour copie manuelle facile
  const ta = modal.querySelector('textarea');
  if (ta) { ta.focus(); ta.select(); }
}

/* ═══════════════════════════════════════════
   SUGGESTION DU MEILLEUR COUP (jeu principal)
═══════════════════════════════════════════ */
let gameBestHint = null;  // {cells, dir} suggéré

// Mode focus : masque toute l'UI pour ne montrer que le plateau
function toggleFullscreenBoard() {
  document.body.classList.toggle('focus-mode');
  const on = document.body.classList.contains('focus-mode');
  const btn = document.getElementById('focus-btn');
  if (btn) btn.textContent = on ? '✕' : '⛶';
  // redessine le plateau (la taille a pu changer)
  setTimeout(function(){ if (typeof drawBoard === 'function') drawBoard(); }, 50);
  showToast(on ? '⛶ Mode plein écran — clique ✕ pour quitter' : 'Mode normal');
}

/* ═══════════════════════════════════════════
   BOTS CONSEILLERS — Noir (gentil/malin) et Blanc (dur/humain)
   Concept yin-yang inversé :
   - Bot NOIR = foncièrement BON, avec une pointe de malice.
   - Bot BLANC = DUR, avec une touche d'humanité.
   Règle : quand tu joues CONTRE l'un, c'est l'AUTRE qui t'accompagne.
   - Tu joues contre BLANC → le NOIR t'aide gentiment.
   - Tu joues contre NOIR → le BLANC se moque, puis te dit quoi faire.
═══════════════════════════════════════════ */

// SVG des têtes (versions compactes, sans le cou, pour les bulles)
const BOT_SVG_BLACK = '<svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bbH" cx="38%" cy="30%" r="78%"><stop offset="0%" stop-color="#5c5c64"/><stop offset="45%" stop-color="#2a2a30"/><stop offset="100%" stop-color="#08080c"/></radialGradient><radialGradient id="bbE" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="#fff0c0"/><stop offset="55%" stop-color="#e8b84b"/><stop offset="100%" stop-color="#9a7820"/></radialGradient></defs><path d="M 70 44 Q 60 24 74 16" stroke="#6a707a" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="75" cy="14" r="6" fill="#ffffff" stroke="#c0c0c8" stroke-width="0.8"/><path d="M 130 44 Q 140 24 126 16" stroke="#6a707a" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="125" cy="14" r="6" fill="#ffffff" stroke="#c0c0c8" stroke-width="0.8"/><circle cx="100" cy="108" r="74" fill="url(#bbH)" stroke="#000" stroke-width="2"/><ellipse cx="74" cy="80" rx="26" ry="18" fill="#fff" opacity="0.16"/><path d="M 62 110 Q 80 92 98 110 Q 80 120 62 110 Z" fill="url(#bbE)"/><path d="M 102 110 Q 120 92 138 110 Q 120 120 102 110 Z" fill="url(#bbE)"/><circle cx="80" cy="106" r="4" fill="#fff8e8"/><circle cx="120" cy="106" r="4" fill="#fff8e8"/><path d="M 76 144 Q 100 156 132 140" stroke="#e8b84b" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M 124 143 L 128 152 L 132 141 Z" fill="#fff0c0"/></svg>';

const BOT_SVG_WHITE = '<svg viewBox="0 0 200 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="bwH" cx="38%" cy="30%" r="78%"><stop offset="0%" stop-color="#fff"/><stop offset="55%" stop-color="#e0e0e6"/><stop offset="100%" stop-color="#b0b0ba"/></radialGradient><radialGradient id="bwE" cx="50%" cy="45%" r="55%"><stop offset="0%" stop-color="#eaf2ff"/><stop offset="50%" stop-color="#8fb4d8"/><stop offset="100%" stop-color="#4a6a8a"/></radialGradient></defs><line x1="76" y1="46" x2="72" y2="14" stroke="#888e98" stroke-width="4" stroke-linecap="round"/><circle cx="71" cy="12" r="6" fill="#0a0a0c" stroke="#333" stroke-width="0.8"/><line x1="124" y1="46" x2="128" y2="14" stroke="#888e98" stroke-width="4" stroke-linecap="round"/><circle cx="129" cy="12" r="6" fill="#0a0a0c" stroke="#333" stroke-width="0.8"/><circle cx="100" cy="108" r="74" fill="url(#bwH)" stroke="#9098a2" stroke-width="2"/><ellipse cx="74" cy="80" rx="26" ry="18" fill="#fff" opacity="0.6"/><path d="M 60 84 L 92 95" stroke="#7a828e" stroke-width="5" stroke-linecap="round"/><path d="M 140 84 L 108 95" stroke="#7a828e" stroke-width="5" stroke-linecap="round"/><path d="M 64 110 L 96 110 L 92 119 L 68 119 Z" fill="url(#bwE)"/><path d="M 104 110 L 136 110 L 132 119 L 108 119 Z" fill="url(#bwE)"/><circle cx="80" cy="114" r="2.6" fill="#ffcf6a"/><circle cx="120" cy="114" r="2.6" fill="#ffcf6a"/><path d="M 74 146 L 120 146 Q 132 146 136 140" stroke="#7a828e" stroke-width="5" fill="none" stroke-linecap="round"/></svg>';

// Phrases du bot NOIR (gentil, encourageant, avec une petite pointe taquine)
const BOT_BLACK_LINES = {
  good: [
    'Joli coup ! Je savais que tu avais ça en toi. 😊',
    'Bien vu ! Continue comme ça et tu vas le coincer.',
    'Élégant. Presque aussi malin que moi, dis donc. 😏',
    'Voilà ! Tu prends le centre, c\'est exactement ça.',
    'Excellent. Tu commences à comprendre le jeu. 👏'
  ],
  warn: [
    'Attention petit, tes billes s\'exposent un peu là… 🤔',
    'Hmm, je ferais gaffe au bord si j\'étais toi.',
    'Doucement ! Regroupe tes billes avant de foncer.',
    'Tu cèdes du terrain… reprends le centre, allez.',
    'Pas mal, mais tu peux mieux faire. Je crois en toi. 💪'
  ],
  neutral: [
    'Coup correct. Garde un œil sur le centre.',
    'OK. Pense à garder tes billes soudées.',
    'On continue. Vise toujours le cœur du plateau.'
  ],
  hintIntro: 'Petit conseil entre nous : ',
};

// Phrases du bot BLANC (dur, moqueur, mais finit toujours par aider — sa touche d'humanité)
const BOT_WHITE_LINES = {
  good: [
    'Tss. Un bon coup. Ne t\'habitue pas. 😒',
    'Bon. Même une horloge cassée a raison deux fois par jour.',
    'Acceptable. Pour une fois.',
    'Hmph. Tu as eu de la chance, là.'
  ],
  warn: [
    'Sérieusement ? Tu appelles ça un coup ? 🙄',
    'Pathétique. Tu viens d\'offrir une bille.',
    'Ah, magnifique. Tu joues pour me faire gagner ?',
    'Je soupire. Tu as vraiment fait ça.',
    'C\'est… un choix. Un mauvais, mais un choix.'
  ],
  neutral: [
    'Mouais. Sans plus.',
    'Coup quelconque. Comme toi.',
    'Bof. On a vu pire. Rarement.'
  ],
  // sa touche d'humanité : après s'être moqué, il explique ce qu'il aurait fallu faire
  hintIntro: '…Bon. Allez, je ne suis pas un monstre. Tu aurais dû jouer : ',
};

function pickLine(arr) { return arr[Math.floor(Math.random()*arr.length)]; }

// État : quel bot est l'adversaire ('black' ou 'white'), et le conseiller est l'opposé.
// Par défaut : pas de bot conseiller actif (mode classique).
let opponentBot = null;     // 'black' | 'white' | null
let advisorEnabled = false; // le conseiller (bot opposé) commente-t-il tes coups ?

function advisorBotColor() {
  // le conseiller est l'opposé de l'adversaire
  if (opponentBot === 'white') return 'black';  // contre Blanc → Noir aide
  if (opponentBot === 'black') return 'white';  // contre Noir → Blanc se moque
  return null;
}

// Remplit les vignettes SVG des bots dans l'onglet Bots (appelé à l'ouverture de l'onglet)
function fillBotSVGs() {
  const map = {
    'bot-card-black-svg': BOT_SVG_BLACK, 'bot-card-white-svg': BOT_SVG_WHITE,
    'bot-duel-black-svg': BOT_SVG_BLACK, 'bot-duel-white-svg': BOT_SVG_WHITE
  };
  for (const id in map) { const el = document.getElementById(id); if (el && !el.innerHTML) el.innerHTML = map[id]; }
}

// Lance une partie contre un bot ('black' = bienveillant, 'white' = sévère).
// Le joueur garde les billes noires ; le bot adverse (IA) joue les blanches.
// L'identité du bot adverse détermine le conseiller (l'opposé).
function startBotGame(botColor) {
  opponentBot = botColor;
  advisorEnabled = true;
  botDuelMode = false;
  GameMode.set('ai');
  // Le bot joue SA couleur : contre Bot Blanc tu as les noirs, contre Bot Noir tu as les blancs.
  humanColor = (botColor === 'black') ? 'white' : 'black';
  resetGame();
  applyPovOrientation();
  const advisor = advisorBotColor();
  const oppName = (botColor === 'black') ? 'Bot Noir 😊' : 'Bot Blanc 😒';
  const advName = (advisor === 'black') ? 'Bot Noir' : 'Bot Blanc';
  const myColorName = (humanColor === 'black') ? 'les Noirs ⚫' : 'les Blancs ⚪';
  showToast('⚔️ Tu joues ' + myColorName + ' contre le ' + oppName + ' — le ' + advName + ' t\'accompagne');
  // message d'accueil du conseiller
  setTimeout(function(){
    if (advisor === 'black') showBotBubble('black', 'Salut ! Tu joues les blancs, je gère les conseils. On va le battre, ce Bot Blanc ! 😊');
    else showBotBubble('white', 'Tiens, tu prends les noirs contre le Bot Noir ? Hmph. Je regarde… et je commenterai. Ne me déçois pas trop. 😒');
  }, 600);
  // Si l'humain joue les blancs, c'est l'IA (noirs) qui commence
  if (humanColor === 'white' && currentTurn === 'black') {
    setTimeout(aiMove, 1400);
  }
}

// Lance un duel automatique entre les deux bots (le joueur regarde)
let botDuelMode = false;
let botDuelTimer = null;
function startBotDuel() {
  opponentBot = null;
  advisorEnabled = false;
  botDuelMode = true;
  GameMode.set('ai');
  resetGame();
  showToast('👁️ Duel des bots — Noir ⚫ vs Blanc ⚪');
  showBotBubble('black', 'Prépare-toi à perdre, mon cher Blanc. 😏');
  setTimeout(function(){ showBotBubble('white', 'C\'est ce qu\'on va voir. Commence donc. 😒'); }, 1500);
  showDuelStopBtn(true);
  // démarre la boucle de duel (noir joue en premier)
  setTimeout(runBotDuelStep, 2800);
}

// Un pas du duel : fait jouer le côté au trait par son bot, puis enchaîne.
// Indépendant de humanColor : les deux couleurs sont jouées directement par l'IA.
// Calcul DANS LE WORKER → l'interface ne se fige pas pendant la réflexion.
let _duelGen = 0;
function duelDelay() { return 700; }   // pause entre deux coups pour que le spectateur suive
function runBotDuelStep() {
  if (!botDuelMode || gameOver) return;
  // Règle officielle anti-blocage : la même position revient une 3e fois → nulle
  if (boardSnapshots.length > 8) {
    const curKey = _repKeyOf(board);
    let occ = 0;
    for (const s of boardSnapshots) { if (_repKeyOf(s.board) === curKey) occ++; }
    if (occ >= 3) {
      gameOver = true;
      showToast('🤝 Nulle par triple répétition — duel terminé');
      stopBotDuel();
      return;
    }
  }
  const side = currentTurn;  // 'black' ou 'white'
  const moves = getAllMovesForColor(side);
  if (!moves.length) {
    currentTurn = (side === 'black') ? 'white' : 'black';
    updateStatus();
    botDuelTimer = setTimeout(runBotDuelStep, 600);
    return;
  }
  const next = function(){ if (!gameOver && botDuelMode) botDuelTimer = setTimeout(runBotDuelStep, duelDelay()); };
  // Livre d'ouvertures : coup connu joué tout de suite (réaliste, sans solliciter le worker)
  if (_bookNode && _bookNode.k) {
    const bm = pickBookMove(_bookNode, moves);
    if (bm) { applyDuelMove(bm, side); next(); return; }
  }
  // Repli empreintes historiques (voir aiMove pour le detail du raisonnement)
  if (boardSnapshots.length < 20) {
    const empBm = pickEmpreinteFallbackMove(side, moves, boardSnapshots.length);
    if (empBm) { applyDuelMove(empBm, side); next(); return; }
  }
  const depth = botDuelDepth(), time = botDuelTime();
  const rnd = function(){ return moves[Math.floor(Math.random()*moves.length)]; };
  const worker = getAIWorker();
  if (worker) {
    const gen = ++_duelGen;
    let done = false;
    const finish = function(chosen){
      if (done) return; done = true;
      worker.removeEventListener('message', onResult);
      if (gen !== _duelGen || !botDuelMode || gameOver) return;   // arrêté / périmé / partie finie
      applyDuelMove((chosen && chosen.cells) ? chosen : rnd(), side);
      next();
    };
    var onResult = function(e){ if(e.data) updateAIMetrics(e.data.metrics); finish(e.data && e.data.move); };
    worker.addEventListener('message', onResult);
    // filet de sécurité : worker muet → repli synchrone
    setTimeout(function(){ if (done) return; let b=null; try{ b=searchBestMove(side, depth, time, _gameHistKeys()); }catch(e){} finish(b); }, time + 4000);
    worker.postMessage({
      board: JSON.parse(JSON.stringify(board)),
      capturedByWhite: capturedByWhite, capturedByBlack: capturedByBlack,
      color: side, depth: depth, time: time,
      weights: (typeof AI_WEIGHT_PRESETS !== 'undefined' && AI_WEIGHT_PRESETS.balanced) ? AI_WEIGHT_PRESETS.balanced : undefined,
      hist: _gameHistKeys()
    });
  } else {
    let best = null; try { best = searchBestMove(side, depth, time, _gameHistKeys()); } catch(e){}
    applyDuelMove((best && best.cells) ? best : rnd(), side);
    next();
  }
}

// Arrête le duel et nettoie
function stopBotDuel() {
  botDuelMode = false;
  _duelGen++;                       // invalide tout résultat worker en attente
  if (botDuelTimer) { clearTimeout(botDuelTimer); botDuelTimer = null; }
  showDuelStopBtn(false);
  showToast('⏹ Duel arrêté');
}

// Bouton flottant ⏹ pendant le duel
function showDuelStopBtn(show) {
  let b = document.getElementById('duel-stop-btn');
  if (show) {
    if (!b) {
      b = document.createElement('button');
      b.id = 'duel-stop-btn';
      b.textContent = '⏹ Arrêter le duel';
      b.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:2600;'
        + 'background:var(--surface);border:1px solid var(--gold-dim);border-radius:24px;padding:10px 20px;'
        + 'box-shadow:0 6px 24px rgba(0,0,0,0.5);font-size:14px;color:var(--text);cursor:pointer';
      b.onclick = stopBotDuel;
      document.body.appendChild(b);
    }
    b.style.display = 'block';
  } else if (b) { b.style.display = 'none'; }
}

function botDuelDepth() { return ({easy:1,medium:2,hard:3}[botDifficulty]||2); }
function botDuelTime()  { return ({easy:200,medium:600,hard:1500}[botDifficulty]||600); }

// Applique un coup de duel (pour l'un ou l'autre côté) avec son + animation d'éjection
function applyDuelMove(mv, color) {
  const info = validateMove(mv.cells, mv.dir, color);
  if (!info.valid) return;
  abApplyMove(mv.cells, mv.dir, color, info);
  if (info.type === 'push' && info.ejection) {
    // anime la bille adverse éjectée vers la gouttière
    let ejX = null, ejY = null;
    if (info.oppStart) {
      let cur = { ...info.oppStart };
      for (let s=0; s<info.push-1; s++) cur = { q:cur.q+mv.dir.q, r:cur.r+mv.dir.r };
      const rc = axialToRc(cur.q, cur.r);
      if (rc) { const p = hexCoord(rc.r, rc.c); ejX = p.x; ejY = p.y; }
    }
    const victim = (color === 'black') ? 'white' : 'black';
    if (color === 'black') capturedByBlack++; else capturedByWhite++;
    const ejCount = (color === 'black') ? capturedByBlack : capturedByWhite;
    soundEject();
    if (ejX!==null) animateEjection(ejX, ejY, victim, ejCount-1);
  } else if (info.type === 'push') {
    soundPush();
  } else {
    soundMove();
  }
  const label = moveLabel(mv.cells, mv.dir, info.type, !!info.ejection);
  addMoveToHistory(label, color, { cells: mv.cells.slice(), dir: mv.dir, type: info.type, ejection: !!info.ejection });
  currentTurn = (color === 'black') ? 'white' : 'black';
  moveCount++;
  updateStatus(); updateCaptures(); drawBoard();
  if (capturedByBlack >= 6) { triggerWin('black'); botDuelMode=false; showDuelStopBtn(false); }
  if (capturedByWhite >= 6) { triggerWin('white'); botDuelMode=false; showDuelStopBtn(false); }
}

let botDifficulty = 'easy';
function setBotDifficulty(level, btn) {
  botDifficulty = level;
  aiDifficulty = (level === 'hard') ? 'hard' : level;  // synchronise avec l'IA existante
  document.querySelectorAll('.bot-diff-btn').forEach(function(b){ b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  showToast('Niveau des bots : ' + (level==='easy'?'Facile':level==='medium'?'Moyen':'Expert'));
}



// Affiche une bulle de conseil d'un bot (noir ou blanc) avec son SVG et son texte
function showBotBubble(which, text) {
  let bubble = document.getElementById('bot-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'bot-bubble';
    bubble.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2400;max-width:380px;padding:14px 18px 14px 14px;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,0.45);font-size:14px;line-height:1.5;display:flex;align-items:center;gap:12px;transition:opacity 0.3s';
    document.body.appendChild(bubble);
  }
  const isBlack = (which === 'black');
  const svg = isBlack ? BOT_SVG_BLACK : BOT_SVG_WHITE;
  // Le Bot NOIR parle sur fond BLANC avec texte NOIR.
  // Le Bot BLANC parle sur fond NOIR avec texte BLANC.
  const bg     = isBlack ? '#f4f4f6' : '#0e0e12';
  const fg     = isBlack ? '#15151a' : '#f4f4f6';
  const border = isBlack ? '#d0d0d6' : '#3a3a42';
  const accent = isBlack ? '#9a7820' : '#a8c4e0';   // couleur du nom
  // Disque derrière la tête pour qu'elle contraste TOUJOURS avec le fond de la bulle :
  // tête noire → disque sombre ; tête blanche → disque clair (l'inverse du fond).
  const headDisc = isBlack ? '#1a1a20' : '#e8e8ee';
  bubble.style.background = bg;
  bubble.style.border = '1px solid ' + border;
  bubble.innerHTML =
    '<div style="width:54px;height:54px;flex-shrink:0;border-radius:50%;background:' + headDisc + ';display:flex;align-items:center;justify-content:center;padding:3px;box-sizing:border-box">' + svg + '</div>' +
    '<div style="color:' + fg + '"><div style="font-size:11px;color:' + accent + ';font-weight:700;margin-bottom:2px">' +
    (isBlack ? 'Bot Noir' : 'Bot Blanc') + '</div>' + text + '</div>';
  bubble.style.opacity = '1';
  bubble.style.display = 'flex';
  clearTimeout(bubble._hideTimer);
  bubble._hideTimer = setTimeout(function(){
    if (bubble) { bubble.style.opacity = '0'; setTimeout(function(){ if(bubble) bubble.style.display='none'; }, 300); }
  }, 7000);
}

// Génère le commentaire d'un bot conseiller selon le coup du joueur.
// which = 'black' (gentil) ou 'white' (dur). before/after = evalFactors, capDelta = billes gagnées.
function botAdvisorComment(which, before, after, capDelta) {
  const lines = (which === 'black') ? BOT_BLACK_LINES : BOT_WHITE_LINES;
  // détermine la qualité du coup (même logique que coachComment)
  let quality = 'neutral';
  if (capDelta > 0) quality = 'good';
  else {
    const dC = after.center - before.center, dCo = after.cohesion - before.cohesion;
    const dE = after.edge - before.edge;
    if (dC >= 3 || dCo >= 3) quality = 'good';
    else if ((dE >= 1 && after.edge >= 3) || dC <= -3 || dCo <= -3) quality = 'warn';
  }
  let text = pickLine(lines[quality]);
  // Le bot BLANC, après s'être moqué (sur un mauvais coup), donne le bon coup (son humanité)
  if (which === 'white' && quality === 'warn') {
    let best = null;
    try { best = searchBestMove(humanColor, 2, 800); } catch(e) {}
    if (best && best.cells) {
      const from = coordToABAPRO(best.cells[0].r, best.cells[0].c);
      const tip = best.eject ? from + ' (éjection !)' : from + (best.type==='push'?' (poussée)':best.type==='broadside'?' (latéral)':'');
      text += '<br><span style="color:#a8c4e0">' + lines.hintIntro + '<b>' + tip + '</b></span>';
    }
  }
  // Le bot NOIR glisse parfois un petit conseil bonus quand le coup est moyen/mauvais
  else if (which === 'black' && quality !== 'good') {
    let best = null;
    try { best = searchBestMove(humanColor, 2, 800); } catch(e) {}
    if (best && best.cells && Math.random() < 0.7) {
      const from = coordToABAPRO(best.cells[0].r, best.cells[0].c);
      const tip = best.eject ? from + ' (éjection !)' : from + (best.type==='push'?' (poussée)':best.type==='broadside'?' (latéral)':'');
      text += '<br><span style="color:#9a7820">' + lines.hintIntro + '<b>' + tip + '</b></span>';
    }
  }
  return text;
}




