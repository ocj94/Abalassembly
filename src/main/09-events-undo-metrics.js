/* ═══════════════════════════════════════════
   ÉVÉNEMENTS PUBLICS — point d'extension léger
   Émis via document.dispatchEvent(CustomEvent), l'équivalent natif du
   navigateur au système de plugins de KAA (on_move_played/on_position_changed).
   Aucune dépendance, aucun fichier supplémentaire : n'importe quel script
   externe (une extension, un enregistreur, un outil d'analyse tiers) peut
   écouter sans qu'Abalassembly ait besoin de le connaître à l'avance :

     document.addEventListener('abalassembly:movePlayed', function(e){
       console.log(e.detail.color, e.detail.label, e.detail.moveCount);
     });

   Événements émis :
   - abalassembly:movePlayed    { color, label, moveCount, capturedByBlack, capturedByWhite }
   - abalassembly:positionChanged { layout }   (nouvelle partie / position chargée)
   - abalassembly:gameOver      { winner, reason, capturedByBlack, capturedByWhite, moveCount }
═══════════════════════════════════════════ */
function _emitAbaEvent(name, detail){
  try{ document.dispatchEvent(new CustomEvent('abalassembly:'+name, { detail: detail })); }
  catch(e){ /* navigateur très ancien sans CustomEvent : silencieux, sans impact sur le jeu */ }
}

/* ── Mode commentateur : stats des deux joueurs, mises a jour en direct ──
   PUR OBSERVATEUR : ecoute uniquement les evenements publics deja emis par
   le moteur (abalassembly:movePlayed / gameOver / positionChanged, voir la
   doc juste au-dessus de _emitAbaEvent) — exactement comme le ferait un
   outil externe. Ne modifie et ne lit AUCUN etat interne du jeu directement
   pendant une partie ; capturedByBlack/capturedByWhite/myTime/oppTime sont
   lus au moment de l'affichage, pas caches. moveCount est un compteur
   GLOBAL (toutes couleurs confondues) dans le moteur — le decompte par
   joueur est donc tenu ICI, a partir du flux d'evenements, puisque rien
   d'equivalent n'existe deja cote moteur. Demande d'Olivier. */
let _commentatorOn = false;
let _commentatorMoves = { black: 0, white: 0 };
function toggleCommentatorMode() {
  _commentatorOn = !_commentatorOn;
  const panel = document.getElementById('commentator-panel');
  const btn = document.getElementById('commentator-toggle');
  if (panel) panel.style.display = _commentatorOn ? 'block' : 'none';
  if (btn) { btn.style.color = _commentatorOn ? 'var(--gold)' : 'var(--muted)'; btn.style.borderColor = _commentatorOn ? 'var(--gold)' : 'var(--border)'; }
  if (_commentatorOn) _commentatorRefresh();
}
function _commentatorLabel(id, side) {
  const el = document.getElementById(id);
  if (!el) return;
  const mine = (typeof monCamp === 'function') ? monCamp() : 'black';
  const estJoueur1 = (side === mine);
  const couleur = (typeof _skinDotColor === 'function') ? _skinDotColor(side) : (side === 'black' ? '#1a1a1c' : '#e8e6e2');
  const pastille = (typeof _dot === 'function') ? _dot(couleur) : '';
  el.innerHTML = (estJoueur1 ? 'Joueur 1' : 'Joueur 2') + pastille;
}
function _commentatorRefresh() {
  if (!_commentatorOn) return;
  const mine = (typeof monCamp === 'function') ? monCamp() : 'black';
  const opp = mine === 'black' ? 'white' : 'black';
  _commentatorLabel('commentator-p1-name', mine);
  _commentatorLabel('commentator-p2-name', opp);
  const perdues = { black: (typeof capturedByWhite !== 'undefined') ? capturedByWhite : 0, white: (typeof capturedByBlack !== 'undefined') ? capturedByBlack : 0 };
  // capturedByBlack = billes BLANCHES ejectees par les noirs (voir le
  // commentaire a sa declaration) : donc les pertes du camp BLANC, pas du
  // camp noir — inversion deliberee, pas une faute de frappe.
  const p1lost = document.getElementById('commentator-p1-lost'); if (p1lost) p1lost.textContent = perdues[mine];
  const p2lost = document.getElementById('commentator-p2-lost'); if (p2lost) p2lost.textContent = perdues[opp];
  const p1mv = document.getElementById('commentator-p1-moves'); if (p1mv) p1mv.textContent = _commentatorMoves[mine];
  const p2mv = document.getElementById('commentator-p2-moves'); if (p2mv) p2mv.textContent = _commentatorMoves[opp];
  const fmt = function(t){ if (typeof _timeCtlBase !== 'undefined' && _timeCtlBase === 0) return '—'; if (typeof t !== 'number') return '—'; const m = Math.floor(t/60), s = Math.floor(t%60); return m + ':' + (s<10?'0':'') + s; };
  const tMine = (typeof myTime !== 'undefined') ? myTime : undefined;
  const tOpp = (typeof oppTime !== 'undefined') ? oppTime : undefined;
  const p1t = document.getElementById('commentator-p1-time'); if (p1t) p1t.textContent = fmt(tMine);
  const p2t = document.getElementById('commentator-p2-time'); if (p2t) p2t.textContent = fmt(tOpp);
}
document.addEventListener('abalassembly:movePlayed', function(e){
  const d = e && e.detail; if (!d) return;
  if (d.color === 'black' || d.color === 'white') _commentatorMoves[d.color]++;
  if (_commentatorOn) {
    _commentatorRefresh();
    const last = document.getElementById('commentator-last');
    if (last) last.textContent = 'Dernier coup : ' + (d.label || '—') + ' (' + (d.color === 'black' ? 'noirs' : 'blancs') + ', coup n°' + (d.moveCount != null ? d.moveCount : '?') + ')';
  }
});
document.addEventListener('abalassembly:gameOver', function(e){
  if (!_commentatorOn) return;
  const d = e && e.detail; if (!d) return;
  _commentatorRefresh();
  const last = document.getElementById('commentator-last');
  if (last) last.textContent = 'Partie terminée — ' + (d.winner ? ('victoire ' + (d.winner === 'black' ? 'des noirs' : 'des blancs')) : 'nulle') + ' · ' + (d.moveCount != null ? d.moveCount : '?') + ' coups joués';
});
document.addEventListener('abalassembly:positionChanged', function(){
  _commentatorMoves = { black: 0, white: 0 };
  if (_commentatorOn) {
    _commentatorRefresh();
    const last = document.getElementById('commentator-last');
    if (last) last.textContent = 'En attente du premier coup…';
  }
});

/* ── Mode projecteur : plusieurs fenetres du meme appareil, synchronisees
   en direct via BroadcastChannel — API native du navigateur, aucune
   dependance, aucun serveur (les fenetres doivent juste partager la meme
   origine, ce qui est toujours le cas ici puisque c'est le MEME fichier
   ouvert plusieurs fois). La fenetre principale EMET l'etat a chaque
   redessin du plateau principal (accroche a drawBoard(), meme point
   d'entree deja utilise par refresh3DIfActive/refresh1DIfActive/
   syncSideButtonColors) ; chaque fenetre projecteur RECOIT et redessine
   sa propre vue (1D, 2D ou 3D choisie via ?projector=1d|2d|3d dans l'URL),
   en lecture seule (window._isProjector bloque l'interaction — voir
   canInteractWithBoard, le clic 2D principal, et pointerDown).

   Place ICI deliberement (meme bloc <script> que "let board"/"let
   boardTheme") : ce sont des declarations lexicales (let/const), pas des
   "var" — inaccessibles via window.board/window.boardTheme depuis un
   AUTRE bloc <script>. Un identifiant nu (board = ...) ne fonctionne de
   facon fiable que dans ce meme bloc. window._isProjector et
   window.boardRotation, eux, sont deja des proprietes explicites de
   window (voir plus haut) et restent lisibles depuis n'importe ou.
   Signale par Olivier. */
let _projectorChannel = null;
function _getProjectorChannel() {
  if (_projectorChannel) return _projectorChannel;
  try { _projectorChannel = new BroadcastChannel('abalassembly-projector'); }
  catch(e) { _projectorChannel = null; /* navigateur sans BroadcastChannel : mode projecteur simplement indisponible */ }
  return _projectorChannel;
}

/* Ouvre une fenetre projecteur pour la dimension demandee (bouton dans
   l'interface principale). Le fichier est le MEME (index.html) — seul le
   parametre ?projector= change son comportement au chargement. */
function openProjectorWindow(dim) {
  const url = location.pathname + '?projector=' + dim;
  const w = window.open(url, '_blank', 'width=900,height=900');
  if (!w) { if (typeof showToast === 'function') showToast('⚠️ Fenêtre bloquée par le navigateur — autorisez les popups pour ouvrir un projecteur'); return; }
  if (typeof showToast === 'function') showToast('📺 Fenêtre projecteur ouverte (' + dim.toUpperCase() + ') — à glisser sur un autre écran');
}

/* Bascule REELLEMENT la page en mode projecteur : deplace #board-stage (le
   MEME element, jamais un clone — conserve tous ses ecouteurs et
   references JS existantes) dans un conteneur plein ecran dedie, force la
   vue demandee, et se met a l'ecoute des mises a jour de la fenetre
   principale. Appelee une seule fois, au chargement, si l'URL contient
   ?projector=. */
function _enterProjectorMode(dim) {
  const root = document.createElement('div');
  root.id = 'projector-root';
  document.body.appendChild(root);
  const stage = document.getElementById('board-stage');
  if (stage) root.appendChild(stage);   // reparente : deplace, ne clone pas
  if (typeof setBoardView === 'function') setBoardView(dim);
  const ch = _getProjectorChannel();
  if (!ch) return;
  ch.onmessage = function(e){
    const d = e.data;
    if (!d || d.type !== 'state') return;
    board = d.board || board;
    selected = d.selected || [];
    currentTurn = d.currentTurn || currentTurn;
    if (typeof d.boardRotation === 'number') window.boardRotation = d.boardRotation;
    if (d.boardTheme && typeof boardTheme !== 'undefined') Object.assign(boardTheme, d.boardTheme);
    if (typeof drawBoard === 'function') drawBoard();   // redessine 2D, et rafraichit 1D/3D via ses propres accroches internes
  };
}
if (window._isProjector) {
  // DOMContentLoaded peut deja etre passe si ce script s'execute tard —
  // readyState le couvre dans les deux cas.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ _enterProjectorMode(window._projectorDim); });
  else _enterProjectorMode(window._projectorDim);
}

/* Emet l'etat courant vers les fenetres projecteur — appelee depuis
   drawBoard() (voir plus bas), uniquement pour le plateau PRINCIPAL, et
   jamais depuis une fenetre projecteur elle-meme (qui ne doit jamais
   re-emettre ce qu'elle vient de recevoir). */
function _broadcastProjectorState() {
  if (window._isProjector) return;
  const ch = _getProjectorChannel();
  if (!ch) return;
  try {
    ch.postMessage({
      type: 'state',
      board: board, selected: selected, currentTurn: currentTurn,
      boardRotation: window.boardRotation,
      boardTheme: (typeof boardTheme !== 'undefined') ? {
        marbleSkin: boardTheme.marbleSkin, blackStops: boardTheme.blackStops, whiteStops: boardTheme.whiteStops,
        wood: boardTheme.wood, theme: boardTheme.theme
      } : null,
    });
  } catch(e) { /* postMessage peut echouer sur un objet non serialisable — ne doit jamais casser le jeu principal */ }
}

/* Referme l'ecran de fin sans relancer de partie : le plateau, le dernier
   coup joue et le Replay redeviennent accessibles. Demande de Saab. */
function hideWinOverlay() {
  const wo = document.getElementById('win-overlay');
  if (wo) wo.classList.remove('show');
  if (typeof drawBoard === 'function') drawBoard();
}

function resetGame() {
  if (typeof progress !== 'undefined') { progress.__firstEjDone = false; progress.__hadLead = false; }
  gameOver = false;
  selected = [];
  capturedByBlack = 0;
  capturedByWhite = 0;
  moveCount = 0;
  currentTurn = 'black';
  // _timeCtlBase===0 (cadence Libre) est un "faux" en JS : "_timeCtlBase || 600"
  // retombait donc sur 600s (10:00) meme en Libre, ce que le panneau
  // Commentateur affichait tel quel avant sa propre verification. Comparaison
  // explicite pour que 0 reste 0. Signale par Olivier (capture d'ecran :
  // "Temps restant 10:00" affiche pour les deux joueurs en cadence Libre).
  myTime = (_timeCtlBase > 0) ? _timeCtlBase : 0;
  oppTime = (_timeCtlBase > 0) ? _timeCtlBase : 0;
  if (!_timeCtlBase && typeof _clockPaintFree === 'function') { _clockPaintFree(); }
  if (typeof _clockPaint === 'function') _clockPaint(estMonTour());
  boardSnapshots = [];
  _bookNode = (typeof OPENING_TREES !== 'undefined' && typeof currentLayout !== 'undefined' && OPENING_TREES[currentLayout]) ? OPENING_TREES[currentLayout] : null;
  resetGutterPositions();  // vide la gouttière (positions des billes éjectées)
  undoStack = [];
  timerPaused = false;
  if (typeof pauseCountdown !== 'undefined') clearInterval(pauseCountdown);
  replayMode = false;
  replayCurrentIdx = -1;
  initBoardState();
  drawBoard();
  updateCaptures();
  updateStatus();
  const wo = document.getElementById('win-overlay');
  if (wo) wo.classList.remove('show');
  const ml = document.getElementById('move-list');
  if (ml) ml.innerHTML = '<div class="move-head"><span></span><span></span><span>Aba-Pro</span><span>Nacre</span></div>';
  const rb = document.getElementById('replay-btn');
  if (rb) { rb.textContent = '▶ Rejouer la partie'; }
  gameBestHint = null;  // efface toute suggestion
  startGameTimer();     // démarre le chronomètre
  clearSavedGame();     // nouvelle partie = efface l'ancienne sauvegarde
  clearInterval(timerInterval);
  timerInterval = setInterval(tickTimers, 1000);
  gameOver = false;
  gameStartTime = Date.now();
  lastMoveTime = Date.now();
  resetStyleGame();   // remet à zéro le profil de style pour la nouvelle partie
  _aiGen++;               // invalide tout calcul IA en cours (résultats périmés ignorés)
  terminateAIWorker(); terminateAIWorkerPool();    // worker(s) neuf(s) à la prochaine partie : pas de fuite, pas de coup fantôme
  showAIThinking(false);  // masque l'indicateur si l'IA réfléchissait encore
  if (typeof armInactivityCancel === 'function') armInactivityCancel();  // annule la partie si personne ne joue dans la 1re minute
  _emitAbaEvent('positionChanged', { layout: (typeof currentLayout !== 'undefined') ? currentLayout : null });
}

/* Annulation de partie pour inactivité — idée d'Olivier : si aucun coup n'est
   joué durant la première minute, la partie est annulée (aucun ELO retiré,
   aucune stat comptée, puisque moveCount vaut toujours 0). Le minuteur est
   armé à chaque nouvelle partie et désarmé dès le premier coup. */
let _inactivityTimer = null;
function armInactivityCancel() {
  clearTimeout(_inactivityTimer);
  _inactivityTimer = setTimeout(function() {
    // Ne s'applique qu'à une partie encore vierge et en cours
    if (typeof gameOver !== 'undefined' && gameOver) return;
    if (typeof moveCount !== 'undefined' && moveCount > 0) return;
    if (typeof replayMode !== 'undefined' && replayMode) return;
    if (typeof _tourneyMatch !== 'undefined' && _tourneyMatch) return;  // pas en tournoi
    // Annule proprement : pas de vainqueur, pas d'ELO, retour à l'accueil
    if (typeof gameOver !== 'undefined') gameOver = true;
    if (typeof clearInterval === 'function' && typeof timerInterval !== 'undefined') clearInterval(timerInterval);
    if (typeof stopGameTimer === 'function') stopGameTimer();
    if (typeof clearSavedGame === 'function') clearSavedGame();
    if (typeof soundCancel === 'function') soundCancel();
    if (typeof showToast === 'function') showToast('⏳ Partie annulée — aucun coup joué en 1 minute. Aucun ELO retiré.');
    if (typeof showPage === 'function') showPage('home');
  }, 60000);   // 1 minute
}
function disarmInactivityCancel() {
  clearTimeout(_inactivityTimer);
  _inactivityTimer = null;
}

/* Quelle horloge tourne ? Celle du camp au trait, rapporte a la couleur que
   le JOUEUR tient reellement — voir monCamp(), point de verite unique
   defini plus haut avec humanColor/aiColor(). */

function tickTimers() {
  if (gameOver) return;
  if (timerPaused) return;   // timer en pause
  // Cadence libre : aucune horloge ne tourne, aucun temps ne s'affiche.
  if (!_timeCtlBase || _clockExempt()) { _clockPaintFree(); return; }
  const _mine = monCamp();
  if (currentTurn === _mine) {
    myTime = Math.max(0, myTime-1);
    if (myTime === 30 || myTime === 10) playSfx('time_alert');   // 🔊 alerte temps
    document.getElementById('timer-me').textContent = formatTime(myTime);
    if (myTime === 0 && _timeCtlBase && !_clockExempt()) { _flagFall(_mine); return; }
  } else {
    oppTime = Math.max(0, oppTime-1);
    if (oppTime === 30 || oppTime === 10) playSfx('time_alert');
    document.getElementById('timer-opponent').textContent = formatTime(oppTime);
    if (oppTime === 0 && _timeCtlBase && !_clockExempt()) { _flagFall(_mine === 'black' ? 'white' : 'black'); return; }
  }
  _clockPaint(currentTurn === _mine);
}

/* ── ⏱️ PENDULE RÉELLE (parties normales) ──
   Cadence « base + incrément » à la manière des échecs. « Libre » (défaut) =
   comportement historique : la pendule décompte à titre informatif, sans défaite
   au temps. Exclusions : tournoi (sa propre pendule 10+5), puzzles, duels de
   bots, replay. */
let _timeCtlBase=0, _timeCtlInc=0;   // 0 = pendule informative
(function(){
  try{
    const v=localStorage.getItem('abaTimeCtl')||'';
    if(v){ const p=v.split('+'); _timeCtlBase=parseInt(p[0],10)||0; _timeCtlInc=parseInt(p[1],10)||0; }
    const sel=document.getElementById('time-ctl-select'); if(sel) sel.value=v;
  }catch(e){}
})();
function setTimeControl(v){
  try{ localStorage.setItem('abaTimeCtl', v||''); }catch(e){}
  const p=(v||'').split('+'); _timeCtlBase=parseInt(p[0],10)||0; _timeCtlInc=parseInt(p[1],10)||0;
  showToast(v ? ('⏱️ Cadence '+Math.round(_timeCtlBase/60)+' min + '+_timeCtlInc+' s — dès la prochaine partie')
              : '⏱️ Pendule libre — pas de défaite au temps');
}
/* Un seul endroit decide de l'affichage des horloges : les deux blocs de la
   colonne laterale et les deux barres autour du plateau. Tant qu'ils etaient
   peints separement, l'un pouvait rester allume pendant que l'autre s'eteignait. */
/* Les libelles des deux barres, calcules au meme endroit pour les deux modes
   de peinture : en cadence libre comme en cadence chronometree, ils doivent
   dire la meme chose. */
/* Pastille de couleur reprenant EXACTEMENT le calcul des billes 3D
   (syncMarbleColors) : la teinte du milieu du degrade du skin actif — pas
   une couleur figee. Un skin Kids donnera orange/bleu, un skin Rubis
   rouge/ivoire, etc. La meme fonction pourrait alimenter les deux usages
   (3D et ces pastilles), mais ils vivent dans des portees JS distinctes
   (start3DScene() vs le reste du script) ; la duplication de cette formule
   courte est plus sure qu'un couplage artificiel entre deux zones du
   fichier qui n'ont sinon aucune raison de se connaitre. */
function _skinDotColor(side) {
  const stops = (side === 'black')
    ? ((typeof boardTheme !== 'undefined' && boardTheme.blackStops) || ['#3a3a3c','#1a1a1c','#050506'])
    : ((typeof boardTheme !== 'undefined' && boardTheme.whiteStops) || ['#ffffff','#e8e6e2','#c4c2c0','#9a9a9c']);
  return stops[Math.floor(stops.length / 2)];
}
function _dot(color) {
  return '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;'
    + 'background:' + color + ';vertical-align:middle;margin-left:7px;'
    + 'box-shadow:0 0 0 1px rgba(255,255,255,0.18)"></span>';
}
/* En 1D, la pastille ronde detonne : cette vue est du texte monochrome, sans
   rien de rond ni de colore par ailleurs. On y reprend plutot le symbole
   REEL du plateau — O pour les noirs, @ pour les blancs, exactement comme
   dans la grille elle-meme (« O = noirs, @ = blancs » sous le plateau) —
   plutot qu'une forme qui n'existe nulle part ailleurs dans cette vue.
   La couleur du skin reste appliquee AU CARACTERE, pour ne pas perdre
   l'information : seule sa forme change entre les vues, pas ce qu'elle dit.

   Joueur 1 = O, Joueur 2 = @, FIXE — pas suivant humanColor. « Joueur 1 »
   designe un siege (la barre du bas, vous), pas une couleur ; le symbole
   qui l'accompagne suit desormais cette meme logique plutot que la couleur
   reellement jouee. Signale par Olivier. */
function _letter(ch) {
  const color = ch === 'O' ? _skinDotColor('black') : _skinDotColor('white');
  /* Taille mesuree sur le VRAI plateau (getComputedStyle de #board-1d-text,
     qui porte .plateau1d et sa taille en cqw) plutot que redupliquee en dur :
     une valeur recopiee aurait divergé du plateau au moindre reglage futur
     de cette taille (deja ajustee deux fois cette session). Repli a 16px si
     le plateau n'est pas encore dans le DOM (peinture avant la 1D active). */
  let taille = '16px';
  try {
    const board = document.getElementById('board-1d-text');
    if (board && typeof getComputedStyle === 'function') taille = getComputedStyle(board).fontSize || taille;
  } catch(e) {}
  return '<span style="font-family:\'DM Mono\',ui-monospace,\'Courier New\',monospace;'
    + 'font-weight:700;margin-left:7px;font-size:' + taille + ';color:' + color + '">' + ch + '</span>';
}
/* « Joueur 1 » / « Joueur 2 » remplace Vous/Adversaire/Joueur noir/Joueur
   blanc/Bot Noir/Bot Blanc — trois formulations differentes selon le mode
   de jeu, unifiees en une seule. Joueur 1 = vous (la barre du bas), Joueur
   2 = l'adversaire (la barre du haut), quel que soit le mode. La pastille
   dit la couleur reelle ; le texte n'a plus besoin de repeter "(noirs)" /
   "(blancs)". Signale par Olivier. */
function _clockNames(){
  const mine = monCamp();
  const opp = mine === 'black' ? 'white' : 'black';
  const en1D = _currentBoardView() === '1d';
  const wt = document.getElementById('clock-top-who');
  if (wt) wt.innerHTML = 'Joueur 2' + (en1D ? _letter('@') : _dot(_skinDotColor(opp)));
  const wb = document.getElementById('clock-bottom-who');
  if (wb) wb.innerHTML = 'Joueur 1' + (en1D ? _letter('O') : _dot(_skinDotColor(mine)));
}

function _clockPaintFree(){
  // Cadence libre : pas de temps. On affiche un tiret neutre.
  ['timer-me','timer-opponent','clock-bottom-time','clock-top-time'].forEach(function(id){
    const t=document.getElementById(id); if(t) t.textContent='–';
  });
  _clockNames();
  /* Le trait, lui, reste indispensable : sans horloge qui tourne, le lisere
     dore est le seul repere disant a qui de jouer. On garde donc exactement
     la meme mise en evidence que les cadences chronometrees, simplement sans
     chiffres. Demande d'Olivier.
     Aucun trait n'est marque hors partie vivante : replay, puzzle, match de
     tournoi ou partie terminee — marquer un camp y serait trompeur. */
  const vivante = !((typeof gameOver !== 'undefined' && gameOver) || _clockExempt());
  const mienActif = vivante && estMonTour();
  const advActif  = vivante && !mienActif;
  [['clock-bottom', mienActif], ['clock-top', advActif]].forEach(function(p){
    const b=document.getElementById(p[0]);
    if(b){ b.classList.toggle('active', p[1]); b.classList.remove('low'); }
  });
  const tm=document.getElementById('timer-me'), to=document.getElementById('timer-opponent');
  if(tm) tm.classList.toggle('active', mienActif);
  if(to) to.classList.toggle('active', advActif);
}

function _clockPaint(mineActive){
  const pairs = [
    ['timer-me', null, myTime, mineActive],
    ['timer-opponent', null, oppTime, !mineActive],
    ['clock-bottom-time', 'clock-bottom', myTime, mineActive],
    ['clock-top-time', 'clock-top', oppTime, !mineActive]
  ];
  pairs.forEach(function(p){
    const t = document.getElementById(p[0]);
    if (t) t.textContent = formatTime(p[2]);
    const box = p[1] ? document.getElementById(p[1]) : t;
    if (box) {
      box.classList.toggle('active', p[3]);
      box.classList.toggle('low', _timeCtlBase > 0 && p[2] <= 30);
    }
  });
  _clockNames();
}

function _clockExempt(){
  return (typeof _tourneyMatch!=='undefined' && _tourneyMatch)
      || (typeof _puzzleActive!=='undefined' && _puzzleActive)
      || (typeof botDuelMode!=='undefined' && botDuelMode)
      || (typeof replayMode!=='undefined' && replayMode);
}
function _clockInc(mover){
  if(!_timeCtlInc || gameOver || _clockExempt()) return;
  if(mover===monCamp()){ myTime+=_timeCtlInc; const el=document.getElementById('timer-me'); if(el) el.textContent=formatTime(myTime); }
  else { oppTime+=_timeCtlInc; const el=document.getElementById('timer-opponent'); if(el) el.textContent=formatTime(oppTime); }
}
function _flagFall(loser){
  if(gameOver) return;
  const winner = loser==='black' ? 'white' : 'black';
  triggerWin(winner, 'temps');
  const ti=document.getElementById('win-title'), sub=document.getElementById('win-sub');
  if(typeof GameMode!=='undefined' && GameMode.get()==='local'){
    if(ti) ti.textContent='Au temps !';
    if(sub) sub.textContent='⏱️ Les '+(loser==='black'?'Noirs':'Blancs')+' ont dépassé leur temps.';
  } else {
    const humanLost = (typeof humanColor!=='undefined') ? (loser===humanColor) : (loser==='black');
    if(ti) ti.textContent = humanLost ? 'Défaite au temps…' : 'Victoire au temps !';
    if(sub) sub.textContent = humanLost ? '⏱️ Votre temps est écoulé.' : '⏱️ Le temps de l\'adversaire est écoulé.';
  }
}

/* ═══════════════════════════════════════════
   ANNULATION DE COUP & PAUSE (avec accord de l'adversaire)
═══════════════════════════════════════════ */
// Sauvegarde l'état complet avant un coup
function pushUndoState() {
  undoStack.push({
    board: JSON.parse(JSON.stringify(board)),
    capturedByBlack, capturedByWhite, moveCount,
    currentTurn, myTime, oppTime,
    player: currentTurn   // qui s'apprête à jouer
  });
  if (undoStack.length > 20) undoStack.shift();
}

// Le joueur courant demande à annuler son dernier coup.
// C'est l'ADVERSAIRE (celui dont c'est le tour maintenant) qui accepte/refuse.
function requestUndo() {
  if (gameOver) { showToast('La partie est terminée.'); return; }
  if (tournamentGame && tournamentActiveRules && !tournamentActiveRules.undo) {
    showToast('⛔ Annulation interdite dans ce tournoi'); return;
  }
  if (undoStack.length === 0) { showToast('Aucun coup à annuler.'); return; }

  // Celui qui demande = celui qui vient de jouer = l'adversaire du tour courant
  const requester = currentTurn === 'black' ? 'white' : 'black';
  const requesterName = requester === 'black' ? 'Les Noirs' : 'Les Blancs';

  if (GameMode.get() === 'ai') {
    // Le joueur humain (noir) demande, l'IA (blanc) décide aléatoirement
    if (requester !== 'black') { showToast('Seul vous pouvez demander une annulation.'); return; }
    showToast('⏳ Demande d\'annulation envoyée à l\'adversaire…');
    setTimeout(function() {
      // L'IA accepte ~60% du temps, comme une personne
      if (Math.random() < 0.6) {
        doUndo();
        showToast('✅ L\'adversaire a accepté l\'annulation');
      } else {
        showToast('❌ L\'adversaire a refusé l\'annulation');
      }
    }, 1200);
  } else {
    // 2 joueurs : l'adversaire (joueur courant) accepte via confirm
    const opponentName = currentTurn === 'black' ? 'Joueur Noir' : 'Joueur Blanc';
    const ok = confirm(requesterName + ' demandent à annuler leur dernier coup.\n\n'
      + opponentName + ', acceptez-vous ?\n\n(OK = accepter, Annuler = refuser)');
    if (ok) { doUndo(); showToast('✅ Annulation acceptée'); }
    else showToast('❌ Annulation refusée');
  }
}

// Restaure l'état précédent
function doUndo() {
  if (typeof tournamentGame!=='undefined' && tournamentGame && tournamentActiveRules && !tournamentActiveRules.undo) { showToast('↩️ Annulation interdite par les règles du tournoi'); return; }
  if (undoStack.length === 0) return;
  const st = undoStack.pop();
  board = st.board;
  capturedByBlack = st.capturedByBlack;
  capturedByWhite = st.capturedByWhite;
  moveCount = st.moveCount;
  currentTurn = st.currentTurn;
  myTime = st.myTime;
  oppTime = st.oppTime;
  selected = [];
  updateCaptures();
  updateStatus();
  drawBoard();
}

// Demande de pause du timer (1 minute), accordée par l'adversaire
function requestPause() {
  if (gameOver) { showToast('La partie est terminée.'); return; }
  if (tournamentGame && tournamentActiveRules && !tournamentActiveRules.pause) {
    showToast('⛔ Pause interdite dans ce tournoi'); return;
  }
  if (timerPaused) { showToast('⏸️ Le jeu est déjà en pause.'); return; }

  const requesterName = currentTurn === 'black' ? 'Joueur Noir' : 'Joueur Blanc';

  if (GameMode.get() === 'ai') {
    showToast('⏳ Demande de pause envoyée à l\'adversaire…');
    setTimeout(function() {
      if (Math.random() < 0.7) {  // l'IA accepte ~70%
        startPause();
        showToast('✅ Pause accordée (1 min)');
      } else {
        showToast('❌ L\'adversaire a refusé la pause');
      }
    }, 1000);
  } else {
    const opponentName = currentTurn === 'black' ? 'Joueur Blanc' : 'Joueur Noir';
    const ok = confirm(requesterName + ' demande une pause d\'1 minute.\n\n'
      + opponentName + ', acceptez-vous ?\n\n(OK = accepter, Annuler = refuser)');
    if (ok) { startPause(); showToast('✅ Pause accordée (1 min)'); }
    else showToast('❌ Pause refusée');
  }
}

let pauseCountdown = null;
function startPause() {
  timerPaused = true;
  let remaining = 60;
  const btn = document.getElementById('pause-btn');
  if (btn) btn.textContent = '⏸️ Pause : 60s';
  clearInterval(pauseCountdown);
  pauseCountdown = setInterval(function() {
    remaining--;
    if (btn) btn.textContent = '⏸️ Pause : ' + remaining + 's';
    if (remaining <= 0) {
      endPause();
    }
  }, 1000);
}
function endPause() {
  timerPaused = false;
  clearInterval(pauseCountdown);
  const btn = document.getElementById('pause-btn');
  if (btn) btn.textContent = '⏸️ Pause (1 min)';
  showToast('▶️ Reprise du jeu');
}

function formatTime(s) {
  const m = Math.floor(s/60);
  const sec = s%60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

function updateCaptures() {
  const myDiv = document.getElementById('captured-by-me');
  const oppDiv = document.getElementById('captured-by-opp');
  myDiv.innerHTML = '';
  oppDiv.innerHTML = '';
  for (let i=0;i<capturedByBlack;i++) {
    const d = document.createElement('div');
    d.className='cap-marble w'; myDiv.appendChild(d);
  }
  for (let i=0;i<capturedByWhite;i++) {
    const d = document.createElement('div');
    d.className='cap-marble b'; oppDiv.appendChild(d);
  }
  // met à jour la gouttière du plateau
  if (typeof drawBoard === 'function') drawBoard();
}

function updateStatus() {
  if (typeof refreshAnalysisIfOpen === 'function') refreshAnalysisIfOpen();
  let txt, msg;
  if (GameMode.get() === 'local') {
    // Mode 2 joueurs : on nomme la couleur active
    const who = currentTurn === 'black' ? 'Noirs ⚫' : 'Blancs ⚪';
    txt = `Tour des ${who} — Coup ${moveCount+1}`;
    msg = `Joueur ${currentTurn === 'black' ? 'Noir' : 'Blanc'} : sélectionnez vos billes`;
  } else {
    // Base sur humanColor, pas sur 'black' code en dur : un humain qui joue
    // les blancs (Bot Noir, ou tout mode ou humanColor='white') voyait ce
    // message totalement inverse -- "Adversaire reflechit" pendant SON
    // propre tour, et "A votre tour, cliquez vos billes noires" pendant que
    // l'IA reflechissait. Bug en direct, atteignable des qu'on joue blanc
    // contre l'IA.
    const monTour = currentTurn === humanColor;
    const monEmoji = humanColor === 'black' ? '⚫' : '⚪';
    txt = monTour
      ? `À votre tour — Coup ${moveCount+1}`
      : `Adversaire réfléchit — Coup ${moveCount+1}`;
    msg = monTour
      ? `Cliquez sur vos billes ${monEmoji} pour les sélectionner`
      : 'Attendre le coup de l\'adversaire…';
  }
  document.getElementById('game-status-text').textContent = txt;
  document.getElementById('board-msg').textContent = msg;
}

// Directions: [dr_topleft, dr_topright, dr_right, dr_bottomright, dr_bottomleft, dr_left]
// Simplified 6 neighbors
function neighbors(r,c) {
  const row = ROWS[r];
  const nbrs = [];
  // Up-left, Up-right
  if (r > 0) {
    const pr = ROWS[r-1];
    if (pr < row) { // going to shorter row
      nbrs.push({r:r-1, c:c-1});
      nbrs.push({r:r-1, c:c});
    } else { // going to longer row
      nbrs.push({r:r-1, c:c});
      nbrs.push({r:r-1, c:c+1});
    }
  }
  // Right, Left
  if (c > 0) nbrs.push({r, c:c-1});
  if (c < row-1) nbrs.push({r, c:c+1});
  // Down
  if (r < 8) {
    const nr = ROWS[r+1];
    if (nr > row) { // going to longer row
      nbrs.push({r:r+1, c:c});
      nbrs.push({r:r+1, c:c+1});
    } else {
      nbrs.push({r:r+1, c:c-1});
      nbrs.push({r:r+1, c:c});
    }
  }
  return nbrs.filter(n=>n.r>=0&&n.r<9&&n.c>=0&&n.c<ROWS[n.r]);
}

const canvas = document.getElementById('board');
if (canvas) {
  /* ═══ GESTION DES INTERACTIONS ═══
     - Sur ordinateur (souris) : tap pour sélectionner + glisser-déposer (drag & drop).
     - Sur tablette/téléphone (tactile) : tap simple uniquement (sélection bille par bille,
       puis tap sur la destination). Le drag est désactivé sur tactile pour fiabilité,
       et la page reste défilable normalement. */

  // Détecte un appareil tactile (téléphone / tablette)
  const IS_TOUCH = (('ontouchstart' in window) || (navigator.maxTouchPoints > 0));

  let dragData = null;
  const DRAG_THRESHOLD = 18;  // px : au-delà = glissement, en deçà = clic (souris uniquement)

  function canvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  }

  // Vecteur pixel d'une direction axiale depuis une case d'origine
  function dirPixelVec(originRc, d) {
    const o = rcToAxial(originRc.r, originRc.c);
    const nRc = axialToRc(o.q + d.q, o.r + d.r);
    const oP = hexCoord(originRc.r, originRc.c);
    let nP;
    if (nRc) nP = hexCoord(nRc.r, nRc.c);
    else {
      const back = axialToRc(o.q - d.q, o.r - d.r);
      if (!back) return null;
      const bP = hexCoord(back.r, back.c);
      nP = { x: oP.x + (oP.x - bP.x), y: oP.y + (oP.y - bP.y) };
    }
    return { dx: nP.x - oP.x, dy: nP.y - oP.y };
  }

  function bestDragDir(originRc, vx, vy) {
    const len = Math.hypot(vx, vy);
    if (len < 8) return null;
    let best = null, bestDot = 0.3;
    for (const d of AX_DIRS) {
      const pv = dirPixelVec(originRc, d);
      if (!pv) continue;
      const pl = Math.hypot(pv.dx, pv.dy);
      const dot = (vx*pv.dx + vy*pv.dy) / (len*pl);
      if (dot > bestDot) { bestDot = dot; best = d; }
    }
    return best;
  }

  function computeDragMove(origin, dir, me, steps) {
    const oAx = rcToAxial(origin.r, origin.c);
    const aligned = [origin];
    let cur = { q: oAx.q, r: oAx.r };
    for (let i = 1; i < 3; i++) {
      cur = { q: cur.q + dir.q, r: cur.r + dir.r };
      const rc = axialToRc(cur.q, cur.r);
      if (rc && board[akey(rc.r, rc.c)] === me) aligned.push(rc);
      else break;
    }
    let take = Math.max(1, Math.min(aligned.length, steps));
    for (let n = take; n >= 1; n--) {
      const sel = aligned.slice(0, n);
      const info = validateMove(sel, dir, me);
      if (info.valid) {
        const headAx = rcToAxial(sel[sel.length-1].r, sel[sel.length-1].c);
        const nextRc = axialToRc(headAx.q + dir.q, headAx.r + dir.r);
        return { sel: sel, dir: dir, valid: true, type: info.ejection ? 'eject' : info.type, next: nextRc };
      }
    }
    return { sel: aligned.slice(0, take), dir: dir, valid: false, type: 'none', next: null };
  }

  // Calcule un coup à partir d'une sélection DÉJÀ faite (plusieurs billes) et d'une direction.
  // Gère les mouvements EN LIGNE et DE CÔTÉ (broadside) : le moteur validateMove teste les deux.
  function computeDragFromSelection(sel, dir, me) {
    const info = validateMove(sel, dir, me);
    if (!info.valid) return { sel: sel, dir: dir, valid: false, type: 'none', next: null };
    // case d'arrivée à afficher : pour un broadside, on montre où va la bille la plus
    // proche du curseur ; pour un coup en ligne, la case devant la tête.
    let refCell;
    if (info.type === 'broadside') {
      // toutes les billes avancent d'une case dans 'dir' → on montre l'arrivée de la 1re
      refCell = sel[0];
    } else {
      refCell = sel[sel.length - 1];  // la tête
    }
    const refAx = rcToAxial(refCell.r, refCell.c);
    const nextRc = axialToRc(refAx.q + dir.q, refAx.r + dir.r);
    return { sel: sel, dir: dir, valid: true, type: info.ejection ? 'eject' : info.type, next: nextRc, broadside: info.type === 'broadside' };
  }

  // Renvoie l'axe (direction) d'une sélection de billes alignées, ou null si 1 seule bille.
  function selectionAxis(sel) {
    if (sel.length < 2) return null;
    const a0 = rcToAxial(sel[0].r, sel[0].c);
    const a1 = rcToAxial(sel[1].r, sel[1].c);
    return { q: a1.q - a0.q, r: a1.r - a0.r };
  }

  function drawDragHint(mv) {
    const ctx = canvas.getContext('2d');
    const scale = canvas.width / 640;
    ctx.save();
    if (mv && mv.next && mv.valid) {
      const p = hexCoord(mv.next.r, mv.next.c);
      const color = (mv.type === 'push' || mv.type === 'eject') ? '#e05c4b' : '#4a9463';
      ctx.beginPath();
      ctx.arc(p.x*scale, p.y*scale, HEX_RADIUS*scale*0.45, 0, Math.PI*2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.stroke();
    }
    ctx.restore();
  }

  // ── Début du geste (souris ou doigt) ──
  function pointerDown(clientX, clientY, e) {
    if (window._isProjector) return;   // fenetre projecteur : jamais interactif
    canvas._dragJustEnded = false;   // nouvelle interaction : on repart propre
    if (gameOver) return;
    if (GameMode.get() === 'ai' && currentTurn !== humanColor) return;
    const pos = canvasPos(clientX, clientY);
    const hex = getHexAt(pos.x, pos.y);
    if (!hex) return;
    // Le glissement part-il d'une bille DÉJÀ sélectionnée (avec une sélection multiple) ?
    const onSelected = selected.some(function(s){ return s.r === hex.r && s.c === hex.c; });
    dragData = {
      startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y,
      hex: hex, moved: false, lastMove: null,
      onOwnPiece: (board[akey(hex.r, hex.c)] === currentTurn),
      // si on tire depuis une sélection multiple existante, on la mémorise (pour broadside)
      fromSelection: (onSelected && selected.length >= 2) ? selected.slice() : null
    };
    if (e && e.cancelable) e.preventDefault();
  }

  // ── Mouvement du geste : SÉLECTION par balayage ──
  // Glisser depuis une bille à soi, en passant sur 1 ou 2 billes alignées,
  // construit la sélection (2 ou 3 billes). L'ORDRE se donne ensuite par un clic.
  function pointerMove(clientX, clientY, e) {
    if (!dragData) return;
    const pos = canvasPos(clientX, clientY);
    dragData.curX = pos.x; dragData.curY = pos.y;
    const vx = pos.x - dragData.startX, vy = pos.y - dragData.startY;
    if (Math.hypot(vx, vy) > DRAG_THRESHOLD) dragData.moved = true;
    if (!dragData.moved || !dragData.onOwnPiece) {
      if (e && e.cancelable) e.preventDefault();
      return;
    }
    // Au 1er franchissement du seuil : démarre une sélection fraîche depuis la bille de départ
    if (!dragData.selecting) {
      dragData.selecting = true;
      selected = [{ r: dragData.hex.r, c: dragData.hex.c }];
      drawBoard();
    }
    // Ajoute la bille survolée si : elle est à soi, alignée/contiguë, et moins de 3 sélectionnées
    const hex = getHexAt(pos.x, pos.y);
    if (hex && board[akey(hex.r, hex.c)] === currentTurn) {
      const already = selected.some(function(s){ return s.r === hex.r && s.c === hex.c; });
      if (!already && selected.length < 3) {
        const candidate = selected.concat([{ r: hex.r, c: hex.c }]);
        if (selectionLine(candidate)) {
          selected.push({ r: hex.r, c: hex.c });
          soundSelect();
          drawBoard();
        }
      }
    }
    if (e && e.cancelable) e.preventDefault();
  }

  // ── Fin du geste SOURIS : on CONSERVE la sélection (l'ordre se donne au clic suivant) ──
  function pointerUp(e) {
    if (!dragData) return;
    const d = dragData;
    dragData = null;
    if (d.moved && d.onOwnPiece) {
      // fin d'un balayage : on garde la sélection et on neutralise le 'click' parasite qui suit
      canvas._dragJustEnded = true;
      drawBoard();
    }
    // simple clic (non déplacé) : laissé au listener 'click' natif (sélection / ordre)
  }

  // ── CLIC / TAP (fonctionne souris ET tactile nativement) ──
  // L'événement 'click' est déclenché par un clic souris ET par un tap sur écran tactile.
  // C'est la méthode la plus fiable et universelle pour la sélection.
  canvas.addEventListener('click', e => {
    if (window._isProjector) return;   // fenetre projecteur : jamais interactif (voir canInteractWithBoard)
    if (canvas._dragJustEnded) { canvas._dragJustEnded = false; return; }
    if (gameOver) return;
    if (replayMode && !variantMode) return;   // navigation replay = lecture seule, sauf en exploration de variante
    if (GameMode.get() === 'ai' && currentTurn !== humanColor) return;
    const pos = canvasPos(e.clientX, e.clientY);
    const hex = getHexAt(pos.x, pos.y);
    if (!hex) return;
    handleClick(hex.r, hex.c);
  });

  // ── GLISSER-DÉPOSER : souris uniquement (ordinateur) ──
  // Sur tactile, on s'appuie sur le 'click' ci-dessus (tap) et on laisse la page défiler.
  if (!IS_TOUCH) {
    canvas.addEventListener('mousedown', e => pointerDown(e.clientX, e.clientY, e));
    canvas.addEventListener('mousemove', e => pointerMove(e.clientX, e.clientY, e));
    canvas.addEventListener('mouseup',   e => pointerUp(e));
    canvas.addEventListener('mouseleave', e => { if (dragData) pointerUp(e); });
  }
}

