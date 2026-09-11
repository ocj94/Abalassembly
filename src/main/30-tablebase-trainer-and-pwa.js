/* ═══════════════════════════════════════════
   TRAINER DE FINALES — positions REELLES tirees de tb-3v2.json
   Contrairement a generateRandomPuzzle() (position fabriquee, verifiee a
   posteriori par le moteur), chaque position ici provient d'une entree
   PROUVEE par induction retrograde exhaustive : la table dit que le camp au
   trait gagne, point. Pas de recherche, pas d'heuristique.

   Portee VOLONTAIREMENT limitee aux gains en 1 demi-coup (17 380 des
   17 575 gains, soit 98,9%). Une entree dtw=3/5/7 exige de jouer PLUSIEURS
   coups sans ejection immediate ; verifier qu'une suite entiere reste
   optimale a chaque demi-coup est un autre morceau (comparaison a
   AbaTB.probe() apres chaque coup, undo si le joueur devie), pas construit
   ici. Les 195 positions a coups multiples restent donc hors de ce trainer
   pour l'instant -- mieux vaut ne proposer que ce qui est verifie de bout
   en bout que promettre un entrainement "infini" qui ne l'est pas : sur
   12 956 400 positions de cette classe, 99,85% sont nulles.
   ═══════════════════════════════════════════ */
function decodeTB32Entry(entry) {
  // Reconstruit le plateau a partir de l'index. Meme schema que probe.js
  // (deja verifie : 17 596/17 596 entrees redecodees puis relues via
  // AbaTB._internals.lookup retrouvent exactement leur v/dtw d'origine).
  var idx = entry[0], dtw = entry[2];
  var turn = idx % 2, rest = (idx - turn) / 2;
  var NT = 35990;
  var tripletRank = rest % NT, weakRank = Math.floor(rest / NT);
  if (!window._TB32_TRIPLES) {
    // 35 990 triplets (i<j<k sur 61 cases) : construits une seule fois,
    // au premier puzzle de finale demande, pas au chargement de la page.
    var N = 61, T = [];
    for (var i = 0; i < N; i++) for (var j = i + 1; j < N; j++) for (var k = j + 1; k < N; k++) T.push([i, j, k]);
    window._TB32_TRIPLES = T;
  }
  var PAIRS = AbaTB._internals.PAIRS, RC = AbaTB._internals.RC;
  var weakPairId = window.TB32_REPS[weakRank];
  var wp = PAIRS[weakPairId], tp = window._TB32_TRIPLES[tripletRank];
  var black = [tp[0], tp[1], tp[2]].map(function (i) { return RC[i]; });   // camp fort = noir
  var white = [wp[0], wp[1]].map(function (i) { return RC[i]; });          // camp faible = blanc
  return { black: black, white: white, dtw: dtw };
}
/* ─── FINALE PROUVÉE — SÉQUENCE (dtw 3/5/7, 195 positions) ───
   Reutilise probe() TEL QUEL, y compris pour l'adversaire : la meme
   fonction, appelee pour 'white', trouve deja sa MEILLEURE DEFENSE (celle
   qui maximise son propre dtw-a-la-perte) -- confirme en lisant le corps
   de probe() : le classement 'better' prefere le dtw le PLUS GRAND pour
   une position perdante. Aucune logique de "pire defense" a reinventer.
   Une ejection reelle (verifiee par le VRAI moteur, meme chemin que le
   mode a 1 coup) est TOUJOURS une victoire, meme si ce n'est pas
   exactement le coup de la ligne prevue -- ejecter termine la position,
   point final. Un coup sans ejection doit correspondre a l'un des coups
   optimaux renvoyes par probe() depuis la position de DEPART de ce
   demi-coup ; sinon il est refuse et la position restauree, sans compter
   comme une erreur bloquante (c'est un entrainement, pas un examen). */
function tbSeqHandleMove(boardBefore, result) {
  const msgEl = document.getElementById('puzzle-msg');
  if (result.ejected) {
    drawPuzzleBoardInteractive();
    if (msgEl) msgEl.textContent = '💥 Éjection !';
    animatePuzzleEjection(result.ejectRC, function() {
      showPuzzleResult(true);
      if (stormActive) stormPuzzleSolved();
    });
    return;
  }
  const probeBefore = AbaTB.probe(boardBefore, 'black');
  const sig = function(b){ return JSON.stringify(Object.keys(b).sort().map(function(k){ return k+':'+b[k]; })); };
  const afterSig = sig(puzzleBoard);
  const matched = probeBefore && probeBefore.moves && probeBefore.moves.some(function(m){ return sig(m.after) === afterSig; });
  if (!matched) {
    puzzleBoard = boardBefore;
    puzzleMovesMade--;
    drawPuzzleBoardInteractive();
    if (msgEl) msgEl.textContent = '➖ Coup légal, mais pas prouvé gagnant depuis cette position précise. Réessayez.';
    return;
  }
  const probeOpp = AbaTB.probe(puzzleBoard, 'white');
  if (probeOpp && probeOpp.moves && probeOpp.moves.length) {
    puzzleBoard = probeOpp.moves[Math.floor(Math.random() * probeOpp.moves.length)].after;
  }
  drawPuzzleBoardInteractive();
  if (msgEl) msgEl.textContent = '✅ Coup optimal. L\u2019adversaire résiste du mieux possible… à vous.';
}
function loadTablebaseSequencePuzzle() {
  if (typeof AbaTB === 'undefined' || !AbaTB.ready || !window.TB32_ENTRIES) {
    showToast('⚠️ Tables de finale non chargées');
    return;
  }
  // gains en 3, 5 ou 7 demi-coups : les 195 positions ou AUCUNE ejection
  // n'est disponible des le premier coup, meme contre la pire defense.
  if (!window._TB32_MULTI) window._TB32_MULTI = window.TB32_ENTRIES.filter(function (e) { return e[1] === 1 && e[2] > 1 && (e[0] % 2) === 0; });
  var pool = window._TB32_MULTI;
  if (!pool.length) { showToast('⚠️ Aucune position disponible'); return; }
  var entry = pool[Math.floor(Math.random() * pool.length)];
  var d = decodeTB32Entry(entry);
  puzzleBoard = {};
  d.black.forEach(function (p) { puzzleBoard[p[0] + ',' + p[1]] = 'black'; });
  d.white.forEach(function (p) { puzzleBoard[p[0] + ',' + p[1]] = 'white'; });
  puzzleSelected = [];
  puzzleMovesMade = 0;
  puzzleEjectedCount = 0;
  puzzleEjectAnim = null;
  currentPuzzleIdx = -3;  // -1 genere, -2 finale prouvee (1 coup), -3 finale prouvee (sequence)
  var stmt = document.getElementById('puzzle-statement');
  if (stmt) stmt.innerHTML = '<strong>FINALE PROUVÉE — SÉQUENCE</strong><br><br>⚫ Les Noirs ont le trait. Le gain est prouvé en <strong style="color:var(--gold)">' + d.dtw + ' demi-coups</strong>, même contre la meilleure défense adverse — aucune éjection n\u2019est possible avant. Après chacun de vos coups, l\u2019adversaire joue sa meilleure résistance, calculée par la même table. Un coup légal mais pas optimal ne compte pas contre vous : vous rejouez depuis la même position.<br><br><em>(1 des 195 positions à plusieurs coups de la tablebase 3v2.)</em>';
  var title = document.getElementById('puzzle-title');
  if (title) title.textContent = 'Finale prouvée — séquence';
  var dl = document.getElementById('puzzle-difficulty-label');
  if (dl) dl.textContent = '🧮 Tablebase — gain prouvé en ' + d.dtw + ' demi-coups';
  var msg = document.getElementById('puzzle-msg');
  if (msg) msg.textContent = '⚫ Sélectionnez vos billes noires';
  var ov = document.getElementById('puzzle-result-overlay');
  if (ov) ov.style.display = 'none';
  drawPuzzleBoardInteractive();
  initPuzzleInteraction();
}

function loadTablebasePuzzle() {
  if (typeof AbaTB === 'undefined' || !AbaTB.ready || !window.TB32_ENTRIES) {
    showToast('⚠️ Tables de finale non chargées');
    return;
  }
  // gains en 1 demi-coup, camp fort au trait (turn=0) : cf. commentaire ci-dessus.
  if (!window._TB32_DTW1) window._TB32_DTW1 = window.TB32_ENTRIES.filter(function (e) { return e[1] === 1 && e[2] === 1 && (e[0] % 2) === 0; });
  var pool = window._TB32_DTW1;
  if (!pool.length) { showToast('⚠️ Aucune position disponible'); return; }
  var entry = pool[Math.floor(Math.random() * pool.length)];
  var d = decodeTB32Entry(entry);
  puzzleBoard = {};
  d.black.forEach(function (p) { puzzleBoard[p[0] + ',' + p[1]] = 'black'; });
  d.white.forEach(function (p) { puzzleBoard[p[0] + ',' + p[1]] = 'white'; });
  puzzleSelected = [];
  puzzleMovesMade = 0;
  puzzleEjectedCount = 0;
  puzzleEjectAnim = null;
  currentPuzzleIdx = -2;  // -1 = genere par heuristique, -2 = tire d'une table prouvee
  var stmt = document.getElementById('puzzle-statement');
  if (stmt) stmt.innerHTML = '<strong>FINALE PROUVÉE</strong><br><br>⚫ Les Noirs ont le trait. Cette position est l\'une des <strong style="color:var(--gold)">17 380</strong> (sur 12 956 400, mode Découverte) où la victoire est démontrée par induction rétrograde exhaustive — pas estimée, pas calculée par le moteur : prouvée. Trouve l\'éjection forcée.<br><br><em>(Position réelle de tablebase, pas générée.)</em>';
  var title = document.getElementById('puzzle-title');
  if (title) title.textContent = 'Finale prouvée';
  var dl = document.getElementById('puzzle-difficulty-label');
  if (dl) dl.textContent = '🧮 Tablebase — gain prouvé en 1 demi-coup';
  var msg = document.getElementById('puzzle-msg');
  if (msg) msg.textContent = '⚫ Sélectionnez vos billes noires';
  var ov = document.getElementById('puzzle-result-overlay');
  if (ov) ov.style.display = 'none';
  drawPuzzleBoardInteractive();
  initPuzzleInteraction();
}

// Charge un puzzle généré dans l'interface
function loadGeneratedPuzzle() {
  const gen = generateRandomPuzzle();
  if (!gen) { showToast('⚠️ Génération échouée, réessaie'); return; }
  puzzleBoard = gen.board;
  puzzleSelected = [];
  puzzleMovesMade = 0;
  puzzleEjectedCount = 0;
  puzzleEjectAnim = null;
  currentPuzzleIdx = -1;  // indique un puzzle généré (pas dans la liste)
  // met à jour l'énoncé
  const stmt = document.getElementById('puzzle-statement');
  if (stmt) stmt.innerHTML = '<strong>PUZZLE GÉNÉRÉ</strong><br><br>⚫ Les Noirs ont le trait. Une bille blanche est exposée au bord. Trouve la poussée qui l\'éjecte !<br><br><em>(Puzzle créé automatiquement — solution garantie.)</em>';
  const title = document.getElementById('puzzle-title');
  if (title) title.textContent = 'Puzzle généré';
  drawPuzzleBoardInteractive();
  showToast('🎲 Nouveau puzzle généré !');
}

function drawPuzzleBoardInteractive() {
  // Utilise EXACTEMENT le même rendu que le jeu principal (gouttière comprise)
  drawBoard({
    canvasId: 'puzzle-board',
    hideGameOverlays: true,   // pas la fleche/menaces de la partie precedente
    board: puzzleBoard,
    selected: Array.isArray(puzzleSelected) ? puzzleSelected : [],
    showHints: true,
    turn: 'black',
    puzzleCaptured: puzzleEjectedCount,
    showCoords: puzzleShowCoords
  });
}

// Affiche/masque les coordonnées sur le plateau du puzzle
function togglePuzzleCoords() {
  puzzleShowCoords = !puzzleShowCoords;
  const btn = document.getElementById('puzzle-coords-btn');
  if (btn) btn.style.opacity = puzzleShowCoords ? '1' : '0.6';
  drawPuzzleBoardInteractive();
  showToast(puzzleShowCoords ? '🔤 Coordonnées affichées' : 'Coordonnées masquées');
}

// Override loadPuzzle to also build interactive board
const _origLoadPuzzle = loadPuzzle;
/* loadPuzzle — définie dans renderPuzzles ci-dessus */


/* ═══════════════════════════════════════════
   PWA — SERVICE WORKER + MANIFEST
═══════════════════════════════════════════ */
function initPWA() {
  // Create manifest blob
  const _icon = function(sz){ return "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 "+sz+" "+sz+"'><circle cx='"+(sz/2)+"' cy='"+(sz/2)+"' r='"+(sz*0.48)+"' fill='%230d0f0e'/><circle cx='"+(sz/2)+"' cy='"+(sz/2)+"' r='"+(sz*0.19)+"' fill='%23c8a84b'/></svg>"; };
  const manifest = {
    name: 'Abalassembly',
    short_name: 'Abalassembly',
    description: 'Jouer, apprendre et progresser au jeu de stratégie Abalone',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d0f0e',
    theme_color: '#0d0f0e',
    orientation: 'any',
    icons: [
      { src: _icon(192), sizes: '192x192', type: 'image/svg+xml', purpose: 'any' },
      { src: _icon(512), sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
    ]
  };
  // Le manifest statique manifest.json (start_url relatif, icônes PNG) est
  // référencé directement dans le <head> — on ne l'écrase plus par un blob,
  // les navigateurs refusent souvent les manifests blob: pour l'installation.
  void manifest;

  // Register service worker (inline)
  if ('serviceWorker' in navigator) {
    /* Ancienne version (abalone-v1) : cache-first sans purge ni versionnement --
       un visiteur deja passe sur le site continuait de recevoir la copie
       en cache indefiniment, meme apres un nouveau deploiement. Repere en
       auditant une critique externe qui affirmait a tort qu'un "kill-switch"
       de purge existait deja -- en verifiant cette affirmation, le vrai
       probleme (l'absence totale de purge) a ete trouve.
       Corrige avec 3 changements :
       1. Strategie reseau-d'abord (network-first) au lieu de cache-first :
          le contenu frais est toujours prefere quand une connexion existe,
          le cache ne sert plus que de repli hors-ligne. Resout le probleme
          pour TOUS les futurs deploiements, pas seulement celui-ci -- plus
          besoin de se souvenir d'incrementer un numero de version a chaque
          fois.
       2. self.skipWaiting() + clients.claim() : la nouvelle version prend
          effet immediatement, sans attendre que l'utilisateur ferme tous
          ses onglets ouverts sur le site.
       3. Gestionnaire 'activate' qui supprime tout cache d'un nom different
          du cache courant (nettoie l'ancien abalone-v1 residuel chez les
          visiteurs deja passes). */
    const swCode = `
const CACHE = 'abalone-v2';
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.add('/')));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => e.respondWith(
  fetch(e.request).then(resp => {
    const clone = resp.clone();
    caches.open(CACHE).then(c => c.put(e.request, clone));
    return resp;
  }).catch(() => caches.match(e.request))
));
`;
    const swBlob = new Blob([swCode], {type:'application/javascript'});
    const swUrl = URL.createObjectURL(swBlob);
    navigator.serviceWorker.register(swUrl).then(function() {
      console.log('SW registered');
    }).catch(function(e) { console.log('SW:', e); });
  }

  // Install prompt
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    showInstallBanner(deferredPrompt);
  });
}

function showInstallBanner(prompt) {
  let banner = document.getElementById('install-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:3000;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px 20px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 30px rgba(0,0,0,0.5);animation:slideUp 0.3s ease;white-space:nowrap';
    banner.innerHTML = '<span style="font-size:20px">📱</span><div><div style="font-size:13px;font-weight:600;color:var(--white)">Installer Abalone</div><div style="font-size:11px;color:var(--muted)">Accès rapide depuis votre écran d’accueil</div></div><button id="pwa-install-btn" style="padding:8px 16px;background:var(--gold);border:none;border-radius:8px;color:#0d0f0e;font-size:13px;font-weight:700;cursor:pointer;font-family:DM Sans,sans-serif">Installer</button><button onclick="this.closest(\'#install-banner\').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;padding:0 4px">×</button>';
    document.body.appendChild(banner);
    document.getElementById('pwa-install-btn').onclick = function() {
      prompt.prompt();
      prompt.userChoice.then(function() { banner.remove(); });
    };
    setTimeout(function() { if(banner.parentNode) banner.remove(); }, 8000);
  }
}

/* ═══════════════════════════════════════════
   TUTORIEL INTERACTIF
   Guide le débutant pas à pas : sélection, déplacement, poussée, éjection.
   Chaque étape utilise un mini-plateau et attend l'action correcte du joueur.
═══════════════════════════════════════════ */
let tutoStep = 0;
let tutoBoard = {};
let tutoSelected = [];
let tutoDone = false;  // l'objectif de l'étape est atteint

const TUTORIAL_STEPS = [
  {
    title: 'Bienvenue dans Abalone !',
    text: 'Le but : éjecter 6 billes adverses hors du plateau. Tu joues les billes noires ⚫. Ce tutoriel te guide pas à pas. Clique sur "Suivant" pour commencer.',
    setup: function() { tutoBoard = { '4,4':'black', '4,5':'black', '4,6':'black', '2,2':'white', '2,3':'white' }; tutoSelected = []; },
    action: null,  // pas d'action, juste lecture
  },
  {
    title: 'Étape 1 — Sélectionner une bille',
    text: 'Clique sur une bille noire ⚫ pour la sélectionner. Elle se cerclera de doré.',
    setup: function() { tutoBoard = { '4,4':'black', '4,5':'black', '4,6':'black' }; tutoSelected = []; },
    check: function() { return tutoSelected.length >= 1; },
    success: 'Parfait ! La bille est sélectionnée. ✅',
  },
  {
    title: 'Étape 2 — Déplacer une bille',
    text: 'Sélectionne une bille noire, puis clique sur une case vide adjacente pour la déplacer.',
    setup: function() { tutoBoard = { '4,4':'black' }; tutoSelected = []; },
    check: function() { return Object.keys(tutoBoard).length === 1 && !tutoBoard['4,4']; },
    success: 'Bravo ! Tu sais déplacer une bille. ✅',
  },
  {
    title: 'Étape 3 — Déplacer plusieurs billes',
    text: 'Sélectionne 2 ou 3 billes alignées (clique-les une à une), puis clique une case vide dans leur prolongement ou sur le côté.',
    setup: function() { tutoBoard = { '4,3':'black', '4,4':'black', '4,5':'black' }; tutoSelected = []; },
    check: function() { return tutoMovedGroup; },
    success: 'Excellent ! Le déplacement de groupe est la clé d\'Abalone. ✅',
  },
  {
    title: 'Étape 4 — La poussée (Sumito) et l\'éjection',
    text: 'Tes 2 billes noires peuvent pousser 1 bille blanche au bord. Sélectionne les 2 noires alignées, puis pousse vers la blanche pour l\'éjecter !',
    setup: function() { tutoBoard = { '4,6':'black', '4,7':'black', '4,8':'white' }; tutoSelected = []; },
    check: function() { return tutoEjected; },
    success: '🎉 Éjection réussie ! Continue, il reste quelques leçons clés.',
  },
  {
    title: 'Étape 5 — La majorité décide (Sumito 3 contre 2)',
    text: 'Pour pousser 2 billes adverses, il faut être plus nombreux : 3 contre 2. Sélectionne tes 3 billes noires alignées et pousse les 2 blanches vers la droite.',
    setup: function() { tutoBoard = { '4,1':'black', '4,2':'black', '4,3':'black', '4,4':'white', '4,5':'white' }; tutoSelected = []; },
    check: function() { return tutoPushed3v2; },
    success: '💪 Bien joué ! 3 contre 2, la majorité l\'emporte. C\'est le cœur de la stratégie.',
  },
  {
    title: 'Étape 6 — La barrière imprenable',
    text: '⚠️ Leçon défensive ! 3 billes alignées NE PEUVENT PAS être poussées : c\'est une barrière. Essaie de pousser ces 3 billes blanches avec tes 2 noires (vers la droite) — tu verras, c\'est bloqué. C\'est ça, une défense solide.',
    setup: function() { tutoBoard = { '4,2':'black', '4,3':'black', '4,4':'white', '4,5':'white', '4,6':'white' }; tutoSelected = []; },
    check: checkBarrierStep,
    success: '🛡️ Tu as compris ! 2 ne peuvent jamais pousser 3. Aligne tes billes par 3 et tu seras imprenable.',
  },
  {
    title: 'Étape 7 — Le mouvement de côté (broadside)',
    text: 'On peut aussi déplacer 2-3 billes latéralement (sur le côté). Sélectionne tes 3 billes noires alignées, puis clique une case vide sur le côté (au-dessus ou en-dessous) pour les décaler ensemble.',
    setup: function() { tutoBoard = { '4,3':'black', '4,4':'black', '4,5':'black' }; tutoSelected = []; },
    check: function() { return tutoBroadside; },
    success: '↔️ Parfait ! Le mouvement de côté sert à repositionner ta formation sans t\'exposer.',
  },
  {
    title: 'Étape 8 — Riposter quand l\'adversaire attaque',
    text: '⚪ Les Blancs ont avancé une bille jusqu\'au bord inférieur. ⚫ À toi de réagir ! Punis cette avancée : aligne tes 2 billes noires et pousse la blanche vers le bas pour l\'éjecter.',
    setup: function() { tutoBoard = { '6,3':'black', '7,3':'black', '8,3':'white', '2,2':'white' }; tutoSelected = []; },
    check: function() { return tutoEjected; },
    success: '🏆 Parfait ! Tu sais maintenant attaquer, défendre ET riposter. Tu es prêt pour de vraies parties !',
  },
];

let tutoMovedGroup = false;
let tutoEjected = false;
let tutoPushed3v2 = false;      // a poussé 2 billes avec 3 (sumito 3v2)
let tutoTriedBlockedPush = false; // a tenté de pousser une barrière de 3 (échec = leçon)
let tutoBroadside = false;      // a fait un mouvement de côté

// Validation de l'étape "barrière imprenable" : réussie dès que le joueur
// a tenté de pousser la barrière (et que ça a échoué, ce qui est la leçon).
function checkBarrierStep() { return tutoTriedBlockedPush; }

function startTutorial() {
  tutoStep = 0;
  tutoDone = false;
  document.getElementById('tutorial-overlay').style.display = 'flex';
  loadTutorialStep();
}

function closeTutorial() {
  document.getElementById('tutorial-overlay').style.display = 'none';
}

function loadTutorialStep() {
  const step = TUTORIAL_STEPS[tutoStep];
  tutoMovedGroup = false;
  tutoEjected = false;
  tutoPushed3v2 = false;
  tutoTriedBlockedPush = false;
  tutoBroadside = false;
  tutoDone = !step.check;  // étape sans objectif = déjà "validée"
  step.setup();
  document.getElementById('tuto-step-label').textContent = 'Étape ' + (tutoStep+1) + ' / ' + TUTORIAL_STEPS.length;
  document.getElementById('tuto-title').textContent = step.title;
  document.getElementById('tuto-text').textContent = step.text;
  document.getElementById('tuto-feedback').textContent = '';
  document.getElementById('tuto-prev').style.visibility = tutoStep === 0 ? 'hidden' : 'visible';
  const nextBtn = document.getElementById('tuto-next');
  nextBtn.textContent = (tutoStep === TUTORIAL_STEPS.length - 1) ? 'Terminer ✓' : 'Suivant ⟩';
  drawTutorialBoard();
}

function tutorialNext() {
  if (tutoStep === TUTORIAL_STEPS.length - 1) {
    closeTutorial();
    showToast('🎓 Tutoriel terminé — bonne partie !');
    return;
  }
  tutoStep++;
  loadTutorialStep();
}

function tutorialPrev() {
  if (tutoStep > 0) { tutoStep--; loadTutorialStep(); }
}

function drawTutorialBoard() {
  drawBoard({
    canvasId: 'tuto-board',
    hideGameOverlays: true,
    board: tutoBoard,
    selected: tutoSelected,
    showHints: true,
    turn: 'black',
    hideGutter: true,
  });
}

// Clic sur le plateau du tutoriel
(function initTutorialClick() {
  document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('tuto-board');
    if (!canvas) return;
    canvas.addEventListener('click', function(e) {
      const step = TUTORIAL_STEPS[tutoStep];
      if (!step || !step.check) return;  // étape sans action
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / 640;
      const px = (e.clientX - rect.left) * (canvas.width / rect.width);
      const py = (e.clientY - rect.top) * (canvas.height / rect.height);
      // trouve la case cliquée
      let best = null, bestD = Infinity;
      for (let r=0;r<9;r++) for (let c=0;c<ROWS[r];c++) {
        const p = hexCoord(r,c);
        const d = Math.hypot(px - p.x*scale, py - p.y*scale);
        if (d < bestD && d < HEX_RADIUS*scale) { bestD = d; best = {r,c}; }
      }
      if (!best) return;
      handleTutorialClick(best.r, best.c);
    });
  });
})();

function handleTutorialClick(r, c) {
  const key = r + ',' + c;
  const piece = tutoBoard[key];

  // Clic sur une bille noire → sélection
  if (piece === 'black') {
    const i = tutoSelected.findIndex(function(s){return s.r===r&&s.c===c;});
    if (i !== -1) tutoSelected.splice(i,1);
    else {
      const cand = tutoSelected.concat([{r,c}]);
      if (selectionLine(cand)) tutoSelected.push({r,c});
      else tutoSelected = [{r,c}];
    }
    soundSelect();
    drawTutorialBoard();
    checkTutorialStep();
    return;
  }

  // Clic sur une case (vide/blanche) avec sélection → coup via le moteur
  if (tutoSelected.length > 0) {
    const targetAx = rcToAxial(r, c);
    let dir = null;
    for (const s of tutoSelected) {
      const sAx = rcToAxial(s.r, s.c);
      for (const d of AX_DIRS) {
        if (sAx.q+d.q===targetAx.q && sAx.r+d.r===targetAx.r) { dir = d; break; }
      }
      if (dir) break;
    }
    if (!dir) { tutoSelected = []; drawTutorialBoard(); return; }

    // applique via le moteur (bascule board)
    const savedB = board, savedCW = CapturedByWhite.get(), savedCB = CapturedByBlack.get();
    board = tutoBoard;
    const info = validateMove(tutoSelected, dir, 'black');
    if (info.valid) {
      const wasGroup = tutoSelected.length >= 2;
      const ejects = !!(info.type === 'push' && info.ejection);
      // Sumito 3 contre 2 : poussée réussie de 2 billes adverses
      if (info.type === 'push' && info.push >= 2) tutoPushed3v2 = true;
      abApplyMove(tutoSelected, dir, 'black', info);
      tutoBoard = board;
      if (ejects) { tutoEjected = true; soundEject(); }
      else if (info.type === 'push') soundPush();
      else { soundMove(); if (wasGroup) tutoMovedGroup = true; }
      if (info.type === 'broadside' && wasGroup) { tutoMovedGroup = true; tutoBroadside = true; }
      tutoSelected = [];
    } else {
      board = savedB; CapturedByWhite.set(savedCW); CapturedByBlack.set(savedCB);
      // Cas spécial "barrière imprenable" : la tentative de pousser 3 billes
      // ÉCHOUE volontairement — c'est justement la leçon à apprendre.
      const step = TUTORIAL_STEPS[tutoStep];
      if (step && step.check === checkBarrierStep) {
        // le joueur a bien tenté de pousser la barrière → leçon validée
        if (tutoSelected.length >= 1 && (info.reason || '').length) {
          tutoTriedBlockedPush = true;
          drawTutorialBoard();
          checkTutorialStep();
          return;
        }
      }
      document.getElementById('tuto-feedback').textContent = '⛔ ' + (info.reason || 'Coup invalide') + ' — réessaie';
      document.getElementById('tuto-feedback').style.color = '#e05c4b';
      return;
    }
    board = savedB; CapturedByWhite.set(savedCW); CapturedByBlack.set(savedCB);
    drawTutorialBoard();
    checkTutorialStep();
    return;
  }
}

function checkTutorialStep() {
  const step = TUTORIAL_STEPS[tutoStep];
  if (!step.check || tutoDone) return;
  if (step.check()) {
    tutoDone = true;
    const fb = document.getElementById('tuto-feedback');
    fb.textContent = step.success || 'Bravo ! ✅';
    fb.style.color = 'var(--gold)';
    // avance automatiquement après un court délai
    setTimeout(function() {
      if (tutoStep < TUTORIAL_STEPS.length - 1) tutorialNext();
      else document.getElementById('tuto-next').textContent = 'Terminer ✓';
    }, 1400);
  }
}

