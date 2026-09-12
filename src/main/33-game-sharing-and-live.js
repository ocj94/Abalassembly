/* ═══════════════════════════════════════════════════════════════════════
   PARTIE PAR CODE · ANALYSE D'APRES-PARTIE · PUZZLE DU JOUR
   Trois ajouts qui ne demandent aucun serveur : tout se joue, se verifie
   et se calcule dans la page. L'architecture mono-fichier reste intacte.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── 1. PARTIE PAR CODE (correspondance) ─────────────────────────────
   L'export Aba-Pro existant ne convient pas a une partie par echange :
   la notation est ambigue, un meme jeton peut designer plusieurs coups
   legaux, et les deux plateaux finissent par diverger. Le code ci-dessous
   est sans ambiguite : chaque coup y porte le nombre de billes, leurs
   cases explicites, et l'indice de direction. Le code contient toujours
   la partie entiere depuis le debut, ce qui la rend auto-synchronisante :
   celui qui le recoit rejoue tout contre le vrai moteur et refuse le code
   au premier coup illegal, au lieu de faire confiance. */

/* ═══════════════════════════════════════════
   NOMS DES JOUEURS DANS LE CODE DE PARTIE — extension du format existant.
   ABAL1:layout:body -> ABAL1:layout:nomNoir|nomBlanc:body
   Noir commence toujours (convention Abalone deja en place dans
   gameCodeLoad : turn='black' au depart) -- les noms sont ranges par
   COULEUR, pas par "qui envoie", pour eviter toute ambiguite au fil des
   echanges. Case vide si ce joueur n'a pas encore renseigne son nom
   (le premier code envoye ne connait souvent que l'expediteur).
   Noms assainis (memes caracteres que les pseudos de connexion existants :
   lettres, chiffres, espace, tiret, underscore) pour ne jamais casser le
   format -- ':' et '|' explicitement interdits car ce sont les separateurs.
   CORRECTIF : GAME_CODE_TAG et _gcDirIndex avaient ete perdues lors du
   remplacement de bloc qui a introduit cette section (v2.01) -- utilisees
   partout en dessous (gameCodeEncode notamment) mais jamais redefinies,
   ce qui aurait fait planter "Partie par code" des sa premiere utilisation
   reelle. Trouve en verifiant chaque dependance avant d'ajouter la
   fonctionnalite suivante (WebRTC) qui reutilise exactement ces memes
   fonctions -- jamais detecte par les tests precedents car le harnais de
   test Node les redefinissait manuellement au lieu d'extraire le vrai
   fichier deploye. */
const GAME_CODE_TAG = 'ABAL1';
function _gcDirIndex(dir) {
  if (!dir) return -1;
  for (let i = 0; i < AX_DIRS.length; i++) {
    if (AX_DIRS[i].q === dir.q && AX_DIRS[i].r === dir.r) return i;
  }
  return -1;
}
function _gcSanitizeName(name){
  return String(name || '').trim().replace(/[^a-zA-Z0-9 _\-À-ÿ]/g, '').slice(0, 24);
}
/* Le code entier passe par un .replace(/\s+/g,'') a l'analyse (herite de
   l'ancien format, utile pour tolerer un copier-coller avec des retours a
   la ligne) -- donc un nom contenant un espace doit etre encode SANS
   espace dans le code lui-meme. Remplace par underscore a l'encodage,
   reconverti a l'affichage. */
function _gcEncodeNameForCode(name){ return _gcSanitizeName(name).replace(/ /g, '_'); }
/* Le decodage repasse par _gcSanitizeName. A l'encodage les noms sont deja
   filtres, donc aucun code legitime n'est modifie ici -- c'est le code RECU
   qui est vise. Tant que les codes n'arrivaient que par copier-coller
   volontaire, la question restait theorique ; avec ?partie= un code arrive
   d'un simple clic sur un lien envoye par un tiers. Les noms ne sont
   aujourd'hui ecrits que via textContent (verifie ligne par ligne : aucun
   chemin innerHTML), donc rien n'est exploitable en l'etat -- ce filtre
   empeche qu'une future modification d'affichage ne le devienne. */
function _gcDecodeNameFromCode(name){ return _gcSanitizeName(String(name || '').replace(/_/g, ' ')); }

let gcMyName = '';
try { gcMyName = localStorage.getItem('abaGcMyName') || ''; } catch(e){}
function gcSetMyName(name){
  gcMyName = _gcSanitizeName(name);
  try { localStorage.setItem('abaGcMyName', gcMyName); } catch(e){}
}

let gcBlackName = '', gcWhiteName = '';

function gameCodeEncode() {
  if (typeof boardSnapshots === 'undefined' || !boardSnapshots.length) return null;
  const layout = (typeof currentLayout !== 'undefined') ? currentLayout : 'standard';
  let body = '';
  for (let i = 0; i < boardSnapshots.length; i++) {
    const mi = boardSnapshots[i].moveInfo;
    if (!mi || !mi.cells || !mi.cells.length || !mi.dir) return null;
    const di = _gcDirIndex(mi.dir);
    if (di < 0) return null;
    body += String(mi.cells.length);
    for (let k = 0; k < mi.cells.length; k++) body += coordToABAPRO(mi.cells[k].r, mi.cells[k].c);
    body += String(di);
  }
  const names = _gcEncodeNameForCode(gcBlackName) + '|' + _gcEncodeNameForCode(gcWhiteName);
  return GAME_CODE_TAG + ':' + layout + ':' + names + ':' + body;
}

/* Analyse syntaxique seule : ne touche pas au plateau.
   Accepte AUSSI l'ancien format sans noms (ABAL1:layout:body), pour ne
   jamais rejeter un code genere par une version anterieure du site. */
function gameCodeParse(code) {
  const s = String(code || '').trim().replace(/\s+/g, '');
  const withNames = s.match(/^ABAL1:([a-z0-9_]+):([^:]*)\|([^:]*):([a-i0-9]*)$/i);
  if (withNames) {
    const layout = withNames[1].toLowerCase();
    const blackName = _gcDecodeNameFromCode(withNames[2]);
    const whiteName = _gcDecodeNameFromCode(withNames[3]);
    const body = withNames[4].toLowerCase();
    return _gcParseBody(layout, body, blackName, whiteName);
  }
  const legacy = s.match(/^ABAL1:([a-z0-9_]+):([a-i0-9]*)$/i);
  if (legacy) {
    return _gcParseBody(legacy[1].toLowerCase(), legacy[2].toLowerCase(), '', '');
  }
  return { ok: false, reason: 'format non reconnu — le code commence par ABAL1:' };
}

function _gcParseBody(layout, body, blackName, whiteName){
  const moves = [];
  let i = 0;
  while (i < body.length) {
    const n = parseInt(body.charAt(i), 10);
    const at = 'au coup ' + (moves.length + 1);
    if (!(n >= 1 && n <= 3)) return { ok: false, reason: 'nombre de billes invalide ' + at };
    const need = 1 + 2 * n + 1;
    if (i + need > body.length) return { ok: false, reason: 'code tronque ' + at };
    const cells = [];
    for (let k = 0; k < n; k++) {
      const rc = abaproToRc(body.substr(i + 1 + 2 * k, 2));
      if (!rc) return { ok: false, reason: 'case illisible ' + at };
      cells.push(rc);
    }
    const di = parseInt(body.charAt(i + need - 1), 10);
    if (!(di >= 0 && di <= 5)) return { ok: false, reason: 'direction invalide ' + at };
    moves.push({ cells: cells, dir: AX_DIRS[di] });
    i += need;
  }
  return { ok: true, layout: layout, moves: moves, blackName: blackName, whiteName: whiteName };
}

/* Rejoue le code sur le plateau, chaque coup verifie contre le moteur.
   En cas de coup illegal on s'arrete net et on le dit : mieux vaut un
   refus explicite qu'une position fausse acceptee en silence. */
function gameCodeLoad(code) {
  const parsed = gameCodeParse(code);
  if (!parsed.ok) return parsed;
  gcBlackName = parsed.blackName || gcBlackName;
  gcWhiteName = parsed.whiteName || gcWhiteName;

  const savedLayout = (typeof currentLayout !== 'undefined') ? currentLayout : 'standard';
  if (typeof currentLayout !== 'undefined') currentLayout = parsed.layout;
  if (typeof resetGame === 'function') resetGame();
  else { initBoardState(); boardSnapshots = []; CapturedByBlack.set(0); CapturedByWhite.set(0); }
  /* CORRECTIF (signale par Olivier) : gameCodeLoad() a sa propre boucle de
     rejeu, separee de _replaySeqToSnapshots() -- elle ne renseignait jamais
     _replayStartBoard, dont loadSnapshot(-1) a besoin pour afficher la
     position de depart. Sans lui, loadSnapshot(-1) ne fait RIEN (garde
     "if (!_replayStartBoard) return"), et le plateau reste a l'etat laisse
     par la boucle ci-dessous -- la partie APRES son dernier coup, pas son
     debut. Capture la position ICI, juste apres resetGame() et avant la
     boucle, meme convention que _replaySeqToSnapshots(). */
  _replayStartBoard = JSON.parse(JSON.stringify(board));

  let turn = 'black';
  for (let i = 0; i < parsed.moves.length; i++) {
    const mv = parsed.moves[i];
    const v = validateMove(mv.cells, mv.dir, turn);
    if (!v || !v.valid) {
      if (typeof currentLayout !== 'undefined') currentLayout = savedLayout;
      if (typeof resetGame === 'function') resetGame();
      return { ok: false, reason: 'coup ' + (i + 1) + ' illegal — ' + ((v && v.reason) || 'refuse par le moteur') };
    }
    applyMove({ cells: mv.cells, dir: mv.dir, info: v }, turn);
    const label = moveLabel(mv.cells, mv.dir, v.type, !!v.ejection);
    addMoveToHistory(label, turn, { cells: mv.cells.slice(), dir: mv.dir, type: v.type, ejection: !!v.ejection });
    turn = (turn === 'black') ? 'white' : 'black';
  }

  CurrentTurn.set(turn);
  MoveCount.set(parsed.moves.length);
  if (typeof updateCaptures === 'function') updateCaptures();
  if (typeof drawBoard === 'function') drawBoard();
  return { ok: true, plies: parsed.moves.length, turn: turn, layout: parsed.layout };
}

function _gcGuessMyColor(){
  // Devine une couleur de depart raisonnable : partie vierge -> noir (premier
  // a jouer) ; partie deja en cours (code recu) -> la couleur actuellement
  // au trait, puisque c'est celle qui va jouer ensuite dans CE navigateur.
  if (typeof boardSnapshots === 'undefined' || !boardSnapshots.length) return 'black';
  return (typeof CurrentTurn !== 'undefined') ? CurrentTurn.get() : 'black';
}
let _gcMyColorChoice = null;

/* Met a jour uniquement le code affiche + la ligne "vs", sans toucher au
   champ de saisie lui-meme -- reconstruire tout le modal a chaque frappe
   ferait perdre le focus et la position du curseur en pleine saisie. */
function _gcRefreshCodeDisplay(){
  const out = document.getElementById('gamecode-out');
  if (out) out.value = gameCodeEncode() || '';
  const lien = document.getElementById('gamecode-link');
  if (lien) lien.value = gameShareLink() || '';
  const vsLine = document.getElementById('gamecode-vs-line');
  if (vsLine) {
    if (gcBlackName || gcWhiteName) {
      vsLine.style.display = '';
      const vb = document.getElementById('gc-vs-black'); if (vb) vb.textContent = gcBlackName || '?';
      const vw = document.getElementById('gc-vs-white'); if (vw) vw.textContent = gcWhiteName || '?';
    } else {
      vsLine.style.display = 'none';
    }
  }
}
function gcOnNameInput(){
  const input = document.getElementById('gamecode-myname');
  if (!input) return;
  gcSetMyName(input.value);
  if (_gcMyColorChoice === 'black') gcBlackName = gcMyName; else if (_gcMyColorChoice === 'white') gcWhiteName = gcMyName;
  _gcRefreshCodeDisplay();
}
function gcSetMyColor(color){
  _gcMyColorChoice = color;
  const bEl = document.getElementById('gc-color-black'), wEl = document.getElementById('gc-color-white');
  if (bEl) bEl.style.cssText = 'cursor:pointer;font-size:22px;line-height:1;padding:4px;border-radius:50%;' + (color==='black' ? 'background:rgba(200,168,75,0.25)' : 'opacity:.35');
  if (wEl) wEl.style.cssText = 'cursor:pointer;font-size:22px;line-height:1;padding:4px;border-radius:50%;' + (color==='white' ? 'background:rgba(200,168,75,0.25)' : 'opacity:.35');
  if (color === 'black') gcBlackName = gcMyName; else gcWhiteName = gcMyName;
  _gcRefreshCodeDisplay();
}

/* ═══════════════════════════════════════════
   PARTIE EN DIRECT (WebRTC) — connexion pair-a-pair, une seule fois au
   debut (echange manuel de code de connexion, meme principe que "Partie
   par code"), puis les coups circulent en temps reel sans plus rien
   copier-coller. Repli automatique sur "Partie par code" en cas d'echec
   ou de deconnexion -- jamais une partie perdue, juste un retour au mode
   differe.
   Seule dependance externe reelle : un serveur STUN public (aide chaque
   navigateur a decouvrir son adresse reseau derriere sa box -- aucune
   donnee de partie n'y transite, juste la decouverte reseau initiale).
   Non testable en direct dans un environnement sans navigateur reel :
   la logique de protocole (encodage/decodage des coups, compression du
   SDP) est testee isolement ; l'etablissement de connexion lui-meme doit
   etre verifie en conditions reelles, deux onglets ou deux appareils.
═══════════════════════════════════════════ */
const RTC_STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];
let _rtcPeer = null, _rtcChannel = null, _rtcRole = null, _rtcApplyingRemote = false;
let _rtcOpponentName = '';

async function _rtcCompress(str){
  const enc = new TextEncoder().encode(str);
  const cs = new CompressionStream('deflate-raw');
  const stream = new Blob([enc]).stream().pipeThrough(cs);
  const buf = await new Response(stream).arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
async function _rtcDecompress(b64){
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([bytes]).stream().pipeThrough(ds);
  return await new Response(stream).text();
}

/* Encode/decode un coup pour le canal de donnees -- meme convention
   compacte que "Partie par code" (coordToABAPRO/_gcDirIndex/AX_DIRS),
   teste isolement. */
function rtcEncodeMove(cells, dir){
  const di = _gcDirIndex(dir);
  if (di < 0) return null;
  let body = String(cells.length);
  for (let k = 0; k < cells.length; k++) body += coordToABAPRO(cells[k].r, cells[k].c);
  body += String(di);
  return 'MOVE:' + body;
}
function rtcDecodeMove(data){
  if (typeof data !== 'string' || data.indexOf('MOVE:') !== 0) return null;
  const body = data.slice(5);
  if (!body.length) return null;
  const n = parseInt(body.charAt(0), 10);
  if (!(n >= 1 && n <= 3)) return null;
  const need = 1 + 2 * n + 1;
  if (body.length !== need) return null;
  const cells = [];
  for (let k = 0; k < n; k++) {
    const rc = abaproToRc(body.substr(1 + 2 * k, 2));
    if (!rc) return null;
    cells.push(rc);
  }
  const di = parseInt(body.charAt(need - 1), 10);
  if (!(di >= 0 && di <= 5)) return null;
  return { cells: cells, dir: AX_DIRS[di] };
}

function _rtcWaitIceGathering(peer){
  return new Promise(function(resolve){
    if (peer.iceGatheringState === 'complete') { resolve(); return; }
    const timeout = setTimeout(resolve, 4000); // filet de securite : n'attend jamais indefiniment
    function check(){
      if (peer.iceGatheringState === 'complete') {
        clearTimeout(timeout);
        peer.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    }
    peer.addEventListener('icegatheringstatechange', check);
  });
}

function _rtcSetupChannelHandlers(ch){
  ch.onopen = function(){
    _rtcUpdateStatus('🟢 Connecté' + (_rtcOpponentName ? (' à ' + _rtcOpponentName) : '') + ' — coups en temps réel');
    if (typeof showToast === 'function') showToast('🟢 Connexion en direct établie');
  };
  ch.onclose = function(){ _rtcOnDisconnect(); };
  ch.onerror = function(){ _rtcOnDisconnect(); };
  ch.onmessage = function(e){ _rtcHandleMessage(e.data); };
}
function _rtcSetupPeerHandlers(peer){
  /* CORRECTIF (signale par Olivier, teste sur deux vrais telephones) :
     "Connexion perdue" s'affichait alors qu'AUCUNE connexion n'avait jamais
     ete etablie. Cause : 'disconnected' etait traite comme un echec
     definitif et declenchait rtcClose(), qui detruit le peer -- or c'est un
     etat TRANSITOIRE NORMAL pendant l'etablissement d'une connexion WebRTC
     (et aussi lors d'une micro-coupure reseau, ou la pile tente de se
     reconnecter seule). Le code tuait donc la connexion precisement pendant
     qu'elle essayait de s'etablir.
     Desormais : seul 'failed' est definitif. 'disconnected' laisse 8
     secondes a la reconnexion automatique -- si l'etat n'est toujours pas
     revenu a 'connected' passe ce delai, on abandonne alors vraiment. */
  peer.onconnectionstatechange = function(){
    const st = peer.connectionState;
    if (st === 'failed') { _rtcOnDisconnect(); return; }
    if (st === 'connected') {
      if (_rtcDisconnectTimer) { clearTimeout(_rtcDisconnectTimer); _rtcDisconnectTimer = null; }
      return;
    }
    if (st === 'disconnected') {
      if (_rtcDisconnectTimer) return;   // deja en attente
      _rtcUpdateStatus('🟠 Connexion instable — tentative de reconnexion…');
      _rtcDisconnectTimer = setTimeout(function(){
        _rtcDisconnectTimer = null;
        if (_rtcPeer && _rtcPeer.connectionState !== 'connected') _rtcOnDisconnect();
      }, 8000);
    }
  };
}
let _rtcDisconnectTimer = null;
function _rtcOnDisconnect(){
  if (_rtcDisconnectTimer) { clearTimeout(_rtcDisconnectTimer); _rtcDisconnectTimer = null; }
  if (!_rtcPeer) return; // deja nettoye
  _rtcUpdateStatus('🔴 Connexion perdue — utilise "Partie par code" pour continuer');
  if (typeof showToast === 'function') showToast('🔴 Connexion en direct perdue — repli sur "Partie par code"');
  rtcClose();
}
function rtcClose(){
  if (_rtcChannel) { try { _rtcChannel.close(); } catch(e){} _rtcChannel = null; }
  if (_rtcPeer) { try { _rtcPeer.close(); } catch(e){} _rtcPeer = null; }
  _rtcRole = null;
}

/* Hote : prepare l'offre, attend la fin de la collecte ICE (evite d'avoir
   a echanger les candidats un par un -- un seul code contient tout). */
async function rtcCreateOffer(){
  rtcClose();
  _rtcRole = 'host';
  _rtcPeer = new RTCPeerConnection({ iceServers: RTC_STUN_SERVERS });
  _rtcChannel = _rtcPeer.createDataChannel('abalone');
  _rtcSetupChannelHandlers(_rtcChannel);
  _rtcSetupPeerHandlers(_rtcPeer);
  const offer = await _rtcPeer.createOffer();
  await _rtcPeer.setLocalDescription(offer);
  await _rtcWaitIceGathering(_rtcPeer);
  const compressed = await _rtcCompress(_rtcPeer.localDescription.sdp);
  return 'WEBRTC1:offer:' + compressed;
}

/* Invite : recoit l'offre, prepare la reponse. */
async function rtcAcceptOffer(code){
  const m = String(code || '').trim().match(/^WEBRTC1:offer:(.+)$/s);
  if (!m) return { ok: false, reason: 'code non reconnu — attend un code commençant par WEBRTC1:offer:' };
  rtcClose();
  _rtcRole = 'guest';
  _rtcPeer = new RTCPeerConnection({ iceServers: RTC_STUN_SERVERS });
  _rtcPeer.ondatachannel = function(e){ _rtcChannel = e.channel; _rtcSetupChannelHandlers(_rtcChannel); };
  _rtcSetupPeerHandlers(_rtcPeer);
  let sdp;
  try { sdp = await _rtcDecompress(m[1]); } catch(e){ return { ok: false, reason: 'code illisible (corrompu au copier-coller ?)' }; }
  await _rtcPeer.setRemoteDescription({ type: 'offer', sdp: sdp });
  const answer = await _rtcPeer.createAnswer();
  await _rtcPeer.setLocalDescription(answer);
  await _rtcWaitIceGathering(_rtcPeer);
  const compressed = await _rtcCompress(_rtcPeer.localDescription.sdp);
  return { ok: true, code: 'WEBRTC1:answer:' + compressed };
}

/* Hote : recoit la reponse de l'invite, la connexion s'etablit ensuite
   automatiquement (evenements onconnectionstatechange / ondatachannel). */
async function rtcAcceptAnswer(code){
  const m = String(code || '').trim().match(/^WEBRTC1:answer:(.+)$/s);
  if (!m) return { ok: false, reason: 'code non reconnu — attend un code commençant par WEBRTC1:answer:' };
  if (!_rtcPeer) return { ok: false, reason: 'aucune offre en cours — clique d\'abord "Créer"' };
  let sdp;
  try { sdp = await _rtcDecompress(m[1]); } catch(e){ return { ok: false, reason: 'code illisible (corrompu au copier-coller ?)' }; }
  await _rtcPeer.setRemoteDescription({ type: 'answer', sdp: sdp });
  return { ok: true };
}

function rtcSendMove(cells, dir){
  if (!_rtcChannel || _rtcChannel.readyState !== 'open') return false;
  const msg = rtcEncodeMove(cells, dir);
  if (!msg) return false;
  _rtcChannel.send(msg);
  return true;
}

/* Applique un coup recu -- jamais faire confiance : revalide contre le
   moteur exactement comme gameCodeLoad(), un coup illegal est rejete
   silencieusement plutot que d'accepter une position corrompue. */
function _rtcHandleMessage(data){
  const decoded = rtcDecodeMove(data);
  if (!decoded) return;
  const color = CurrentTurn.get();
  const v = validateMove(decoded.cells, decoded.dir, color);
  if (!v || !v.valid) return;
  _rtcApplyingRemote = true;
  applyMove({ cells: decoded.cells, dir: decoded.dir, info: v }, color);
  const label = moveLabel(decoded.cells, decoded.dir, v.type, !!v.ejection);
  addMoveToHistory(label, color, { cells: decoded.cells.slice(), dir: decoded.dir, type: v.type, ejection: !!v.ejection });
  CurrentTurn.set((color === 'black') ? 'white' : 'black');
  if (typeof updateCaptures === 'function') updateCaptures();
  if (typeof drawBoard === 'function') drawBoard();
  if (typeof updateStatus === 'function') updateStatus();
  _rtcApplyingRemote = false;
}

/* Envoie automatiquement chaque coup local des qu'il est joue -- le drapeau
   _rtcApplyingRemote evite de renvoyer en echo un coup qu'on vient de
   recevoir (sinon boucle infinie coup recu -> re-emis -> recu ailleurs...). */
document.addEventListener('abalassembly:movePlayed', function(){
  if (_rtcApplyingRemote) return;
  if (!_rtcChannel || _rtcChannel.readyState !== 'open') return;
  if (typeof boardSnapshots === 'undefined' || !boardSnapshots.length) return;
  const last = boardSnapshots[boardSnapshots.length - 1];
  if (!last || !last.moveInfo) return;
  rtcSendMove(last.moveInfo.cells, last.moveInfo.dir);
});

function _rtcUpdateStatus(text){
  const el = document.getElementById('rtc-status');
  if (el) el.textContent = text;
}

function openRtcPanel(){
  let modal = document.getElementById('rtc-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'rtc-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(13,15,14,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML =
    '<div style="max-width:520px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:24px;max-height:90vh;overflow-y:auto">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:6px">Partie en direct <span style="font-size:11px;color:var(--muted);font-weight:400">(expérimental)</span></h3>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">Connexion directe entre deux navigateurs, sans compte ni serveur de jeu — juste un serveur public pour aider les deux appareils à se trouver. Un seul échange de code au début, puis les coups circulent tout seuls.</div>'
    + '<div id="rtc-status" style="font-size:13px;color:var(--gold);margin-bottom:14px;min-height:18px">⚪ Non connecté</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:14px">'
    + '<button class="ctrl-btn" onclick="_rtcUiCreateOffer()" style="flex:1">Créer une partie</button>'
    + '<button class="ctrl-btn" onclick="_rtcUiShowJoin()" style="flex:1">Rejoindre</button>'
    + '</div>'
    + '<div id="rtc-ui-body"></div>'
    + '<div style="display:flex;gap:8px;margin-top:14px;justify-content:space-between">'
    + '<button class="ctrl-btn" onclick="openGameCodePanel()" style="width:auto;padding:8px 12px;font-size:12px" title="Solution de repli fiable si la connexion directe ne marche pas">Utiliser « Partie par code » à la place</button>'
    + '<button class="ctrl-btn" onclick="document.getElementById(\'rtc-modal\').remove()" style="width:auto;padding:8px 16px">Fermer</button>'
    + '</div></div>';
  document.body.appendChild(modal);
}

async function _rtcUiCreateOffer(){
  const body = document.getElementById('rtc-ui-body');
  if (body) body.innerHTML = '<div style="font-size:12px;color:var(--muted)">Préparation du code…</div>';
  let code;
  try {
    code = await rtcCreateOffer();
  } catch(e) {
    if (body) body.innerHTML = '<div style="color:#e05c4b;font-size:12px">Échec de la préparation de la connexion (réseau ou pare-feu). Utilise « Partie par code » ci-dessous — ça marche toujours.</div>';
    _rtcUpdateStatus('🔴 Échec — utilise "Partie par code"');
    return;
  }
  if (!body) return;
  body.innerHTML =
    '<div style="font-size:11px;letter-spacing:1px;color:var(--muted);margin-bottom:6px">1. ENVOIE CE CODE À TON ADVERSAIRE</div>'
    + '<textarea readonly style="width:100%;height:70px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:\'DM Mono\',monospace;font-size:11px;word-break:break-all" onclick="this.select()">' + code + '</textarea>'
    + '<button class="ctrl-btn" onclick="navigator.clipboard&&navigator.clipboard.writeText(\'' + code.replace(/'/g,"\\'") + '\').then(()=>showToast(\'Code copié\'))" style="width:100%;margin-top:6px">Copier</button>'
    + '<div style="font-size:11px;letter-spacing:1px;color:var(--muted);margin:14px 0 6px">2. COLLE SA RÉPONSE ICI</div>'
    + '<textarea id="rtc-answer-in" placeholder="WEBRTC1:answer:..." style="width:100%;height:70px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:\'DM Mono\',monospace;font-size:11px"></textarea>'
    + '<button class="ctrl-btn" onclick="_rtcUiAcceptAnswer()" style="width:100%;margin-top:6px">Se connecter</button>';
}

function _rtcUiShowJoin(){
  const body = document.getElementById('rtc-ui-body');
  if (!body) return;
  body.innerHTML =
    '<div style="font-size:11px;letter-spacing:1px;color:var(--muted);margin-bottom:6px">COLLE LE CODE REÇU</div>'
    + '<textarea id="rtc-offer-in" placeholder="WEBRTC1:offer:..." style="width:100%;height:70px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:\'DM Mono\',monospace;font-size:11px"></textarea>'
    + '<button class="ctrl-btn" onclick="_rtcUiAcceptOffer()" style="width:100%;margin-top:6px">Générer ma réponse</button>'
    + '<div id="rtc-answer-out-wrap"></div>';
}

async function _rtcUiAcceptOffer(){
  const input = document.getElementById('rtc-offer-in');
  if (!input) return;
  const wrap = document.getElementById('rtc-answer-out-wrap');
  let result;
  try {
    result = await rtcAcceptOffer(input.value);
  } catch(e) {
    if (wrap) wrap.innerHTML = '<div style="color:#e05c4b;font-size:12px;margin-top:8px">Échec de la connexion (réseau ou pare-feu). Utilise « Partie par code » ci-dessous — ça marche toujours.</div>';
    return;
  }
  if (!wrap) return;
  if (!result.ok) { wrap.innerHTML = '<div style="color:#e05c4b;font-size:12px;margin-top:8px">' + result.reason + '</div>'; return; }
  wrap.innerHTML =
    '<div style="font-size:11px;letter-spacing:1px;color:var(--muted);margin:14px 0 6px">RENVOIE CE CODE À TON ADVERSAIRE</div>'
    + '<textarea readonly style="width:100%;height:70px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:\'DM Mono\',monospace;font-size:11px;word-break:break-all" onclick="this.select()">' + result.code + '</textarea>'
    + '<button class="ctrl-btn" onclick="navigator.clipboard&&navigator.clipboard.writeText(\'' + result.code.replace(/'/g,"\\'") + '\').then(()=>showToast(\'Code copié\'))" style="width:100%;margin-top:6px">Copier</button>'
    + '<div style="font-size:11px;color:var(--muted);margin-top:8px">Connexion en cours d\'établissement dès que ton adversaire aura collé ce code chez lui…</div>';
}

async function _rtcUiAcceptAnswer(){
  const input = document.getElementById('rtc-answer-in');
  if (!input) return;
  let result;
  try {
    result = await rtcAcceptAnswer(input.value);
  } catch(e) {
    _rtcUpdateStatus('🔴 Échec de la connexion — utilise "Partie par code"');
    return;
  }
  if (!result.ok) { _rtcUpdateStatus('🔴 ' + result.reason); return; }
  _rtcUpdateStatus('🟡 Réponse acceptée — connexion en cours…');
}

/* Recharge une partie de l'historique en mode relecture (lecture seule,
   navigation coup par coup) -- reutilise gameCodeLoad() + addMoveToHistory()
   qui construit deja boardSnapshots correctement, meme mecanisme deja
   teste que "Partie par code". */
function _replayHistoryGame(code){
  const result = gameCodeLoad(code);
  if (!result.ok) { if (typeof showToast === 'function') showToast('⚠️ Partie illisible : ' + result.reason); return false; }
  // Anciennement : fermait le modal d'historique (obsolete depuis que
  // l'historique est une page normale du site, plus un modal flottant).
  // Sentinelle deja prevue dans initGame() ("if (GameOver.get() === 'init') return;")
  // mais jamais exploitee avant : sans elle, showPage('game') declenche
  // initGame() -> resetGame() qui ecrase tout ce qu'on vient de charger.
  // On la pose AVANT de naviguer, puis on finalise l'etat replay APRES --
  // trouve et corrige en testant en conditions reelles (Chromium headless),
  // pas suppose correct depuis la seule lecture du code.
  GameOver.set('init');
  if (typeof showPage === 'function') showPage('game');
  GameOver.set(true);
  replayMode = true; replayCurrentIdx = -1;
  const rb = document.getElementById('replay-btn');
  if (rb) { rb.style.display = 'block'; rb.textContent = '■ Quitter replay'; }
  if (typeof loadSnapshot === 'function') loadSnapshot(-1);
  return true;
}

let _historyFilters = { variant:'all', mode:'all', result:'all', search:'' };

/* Statistiques personnelles par moteur, calculees depuis l'historique de
   parties (uniquement les parties contre l'IA -- une partie locale n'a
   pas de "moteur" a proprement parler). "engine" absent (parties
   enregistrees avant l'ajout de ce champ) est compte sous 'actuel', qui
   est la valeur par defaut reelle de _engineMode a cette epoque. */
function computeEngineStats(){
  const history = getGameHistory().filter(function(e){ return e.mode === 'ai'; });
  const stats = {};
  history.forEach(function(e){
    const eng = e.engine || 'actuel';
    if (!stats[eng]) stats[eng] = { games:0, wins:0, losses:0, draws:0 };
    stats[eng].games++;
    if (!e.winner) stats[eng].draws++;
    else if (e.winner === e.humanColor) stats[eng].wins++;
    else stats[eng].losses++;
  });
  return stats;
}

const ENGINE_LABELS = { actuel:'Moteur actuel', 'nnue-eval':'NNUE — évaluation', 'nnue-order':'NNUE — ordonnancement', 'nnue-both':'NNUE — combiné' };

/* Panneau "Profil de decision personnel" -- agrege computeDecisionProfile()
   sur toutes les parties archivees. Meme famille que les stats moteur
   juste au-dessus : calcule a l'execution, jamais un chiffre ecrit a la
   main. Le seuil "decision disputee" (100 points) est signale comme un
   choix arbitraire mais documente, pas une valeur calibree -- coherent
   avec SEUIL_PROCHE_MEILLEUR (30 points) deja etabli ailleurs dans le
   code pour la meme raison. */
/* Heatmap d'activite -- seule chose reellement nouvelle identifiee apres
   audit d'un document externe (toutes les autres suggestions existaient
   deja : puzzles mines de vraies parties, bots par style, multi-worker,
   NNUE, tablebases -- verifie avant de construire quoi que ce soit).
   Calculee depuis getGameHistory() (deja utilise ailleurs), jamais une
   nouvelle source de donnees. */
function computeActivityHeatmap(weeks){
  weeks = weeks || 12;
  if (typeof getGameHistory !== 'function') return null;
  const history = getGameHistory();
  const counts = {};
  history.forEach(function(e){
    if (!e.date) return;
    const day = e.date.slice(0,10);
    counts[day] = (counts[day]||0) + 1;
  });
  const today = new Date();
  const totalDays = weeks*7;
  const days = [];
  let col = 0;
  for (let i = totalDays-1; i >= 0; i--){
    const d = new Date(today);
    d.setDate(d.getDate()-i);
    const key = d.toISOString().slice(0,10);
    const dow = d.getDay();
    if (days.length && dow === 0) col++;
    days.push({ date:key, count: counts[key]||0, dow: dow, col: col });
  }
  let maxCount = 1;
  days.forEach(function(d){ if (d.count > maxCount) maxCount = d.count; });
  return { days: days, maxCount: maxCount, nbCols: col+1, totalGames: history.length };
}

function renderEjectionStats(){
  const host = document.getElementById('ejection-stats-personal');
  if (!host) return;
  const s = computeEjectionStats();
  if (!s) {
    host.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:16px 0">Aucune partie archivée pour l\u2019instant.</div>';
    return;
  }
  const rows = [
    ['Éjections réalisées', s.realisees],
    ['Éjections subies', s.subies],
    ['Ratio', s.ratio!=null ? s.ratio : '— (0 subie)'],
    ['Par partie', s.parPartie],
    ['Efficacité (réalisées / occasions)', s.efficacite!=null ? s.efficacite+'%' : '— (0 occasion)'],
    ['1ʳᵉ éjection en moyenne', s.premiereEjectionMoyenne!=null ? 'coup '+s.premiereEjectionMoyenne : '—'],
    ['Meilleure partie', s.meilleurePartie]
  ];
  let html = rows.map(function(r){
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">'
      + '<span style="color:var(--text)">'+r[0]+'</span><span style="font-weight:700;color:var(--gold)">'+r[1]+'</span></div>';
  }).join('');
  const tot = s.byPhase.ouverture+s.byPhase.milieu+s.byPhase.finale;
  if (tot) {
    html += '<div style="font-size:11px;color:var(--muted);margin-top:10px">Par phase (ouverture = avant toute perte · milieu = après la 1ʳᵉ perte · finale = un camp a déjà perdu 3 billes ou plus) : '
      + 'ouverture '+Math.round(s.byPhase.ouverture/tot*100)+'% · milieu '+Math.round(s.byPhase.milieu/tot*100)+'% · finale '+Math.round(s.byPhase.finale/tot*100)+'%</div>';
  }
  host.innerHTML = html;
}

function renderColorStats(){
  const host = document.getElementById('color-stats-personal');
  if (!host) return;
  const s = computeColorStats();
  if (!s || (s.black.games+s.white.games)===0) {
    host.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:16px 0">Aucune partie archivée pour l\u2019instant.</div>';
    return;
  }
  function ligne(label, c){
    return '<div style="flex:1;text-align:center">'
      + '<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">'+label+'</div>'
      + '<div style="font-size:22px;font-weight:800;color:var(--text);font-family:\'DM Mono\',monospace">'+(c.winRate!=null?c.winRate+'%':'—')+'</div>'
      + '<div style="font-size:11px;color:var(--muted)">'+c.games+' partie'+(c.games>1?'s':'')+' · '+c.wins+'V '+c.losses+'D '+c.draws+'N</div>'
      + '</div>';
  }
  host.innerHTML = '<div style="display:flex;gap:10px">'+ligne('Noir', s.black)+ligne('Blanc', s.white)+'</div>';
}

function renderActivityHeatmap(){
  const host = document.getElementById('activity-heatmap');
  if (!host) return;
  const data = computeActivityHeatmap(12);
  if (!data || !data.totalGames) {
    host.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:16px 0">Aucune partie archivée pour l\u2019instant.</div>';
    return;
  }
  const cell = 12, gap = 3;
  const w = data.nbCols * (cell+gap);
  const h = 7 * (cell+gap);
  let svg = '<svg width="100%" viewBox="0 0 '+w+' '+h+'" style="display:block">';
  data.days.forEach(function(d){
    const x = d.col * (cell+gap), y = d.dow * (cell+gap);
    const alpha = d.count ? (0.25 + 0.75 * (d.count/data.maxCount)) : 0.08;
    svg += '<rect x="'+x+'" y="'+y+'" width="'+cell+'" height="'+cell+'" rx="2" fill="var(--gold)" fill-opacity="'+alpha.toFixed(2)+'">'
      + '<title>'+d.date+' — '+d.count+' partie'+(d.count>1?'s':'')+'</title></rect>';
  });
  svg += '</svg>';
  host.innerHTML = svg
    + '<div style="font-size:11px;color:var(--muted);margin-top:6px">'+data.totalGames+' partie'+(data.totalGames>1?'s':'')+' archivée'+(data.totalGames>1?'s':'')+' au total · 12 dernières semaines</div>';
}

function renderDecisionProfile(){
  const host = document.getElementById('decision-profile-personal');
  if (!host) return;
  const profil = computeDecisionProfile();
  if (!profil) {
    host.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:16px 0">Aucune partie archivée pour l\u2019instant.</div>';
    return;
  }
  const rows = [
    ['Coups proches du meilleur choix disponible', profil.tauxProcheMeilleur + '%', profil.totalMoves + ' coups analysés'],
    ['Nombre moyen de coups légaux par position', profil.brancheMoyenne, null],
  ];
  let html = rows.map(function(r){
    return '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:1px solid var(--border)">'
      + '<div><div style="font-size:12px;color:var(--text)">'+r[0]+'</div>'+(r[2]?'<div style="font-size:11px;color:var(--muted)">'+r[2]+'</div>':'')+'</div>'
      + '<div style="font-weight:700;color:var(--gold)">'+r[1]+'</div></div>';
  }).join('');
  if (profil.easyCount || profil.hardCount) {
    html += '<div style="font-size:11px;color:var(--muted);margin-top:10px">Décisions faciles (un choix se détachait nettement, écart > '+SEUIL_ECART_DECISION_DISPUTEE+' pts) : '
      + (profil.easyFoundPct!=null ? profil.easyFoundPct+'% trouvées' : '—') + ' sur ' + profil.easyCount + '<br>'
      + 'Décisions disputées (coups proches en valeur) : '
      + (profil.hardFoundPct!=null ? profil.hardFoundPct+'% trouvées' : '—') + ' sur ' + profil.hardCount + '</div>';
  }
  host.innerHTML = html;
}

function renderEngineStats(){
  const host = document.getElementById('engine-stats-personal');
  if (!host) return;
  const stats = computeEngineStats();
  const engines = Object.keys(stats);
  if (!engines.length) {
    host.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:16px 0">Aucune partie contre l\u2019IA enregistrée pour l\u2019instant.</div>';
    return;
  }
  // Le plus joue en premier -- l'echantillon le plus fiable statistiquement
  engines.sort(function(a,b){ return stats[b].games - stats[a].games; });
  host.innerHTML = engines.map(function(eng){
    const s = stats[eng];
    const label = ENGINE_LABELS[eng] || eng;
    const winRate = s.games ? Math.round(s.wins / s.games * 100) : 0;
    const small = s.games < 10;
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 8px;border-bottom:1px solid var(--border);font-size:13px">'
      + '<div style="flex:1">'
        + '<div style="color:var(--text)">' + label + '</div>'
        + '<div style="font-size:11px;color:var(--muted)">' + s.games + ' partie' + (s.games>1?'s':'') + (small ? ' — échantillon réduit' : '') + '</div>'
      + '</div>'
      + '<div style="text-align:right;font-size:12px;color:var(--muted)">' + s.wins + 'V ' + s.losses + 'D ' + s.draws + 'N</div>'
      + '<div style="width:50px;text-align:right;font-weight:700;color:var(--gold)">' + winRate + '%</div>'
    + '</div>';
  }).join('');
}

function _historyResultBadge(e){
  if (e.mode !== 'ai') return '<span style="color:var(--muted)">—</span>';
  if (!e.winner) return '<span style="color:var(--muted)">Nulle</span>';
  const won = e.winner === e.humanColor;
  return won ? '<span style="color:var(--accent-green-light)">Victoire</span>' : '<span style="color:#e05c4b">Défaite</span>';
}

function _historyDateLabel(iso){
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit', year:'2-digit' }) + ' ' + d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  } catch(e) { return iso; }
}

function _renderHistoryList(){
  const box = document.getElementById('history-list');
  if (!box) return;
  const results = filterGameHistory(_historyFilters);
  if (!results.length) {
    box.innerHTML = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:24px 0">Aucune partie ne correspond.</div>';
    return;
  }
  box.innerHTML = results.map(function(e){
    const label = (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[e.variant]) ? HEAT_VARIANT_LABEL[e.variant] : e.variant;
    return '<div style="display:flex;align-items:center;gap:10px;padding:10px 8px;border-bottom:1px solid var(--border);font-size:13px">'
      + '<div style="flex:1;min-width:0">'
        + '<div style="color:var(--text)">' + _historyDateLabel(e.date) + ' · ' + label + '</div>'
        + '<div style="color:var(--muted);font-size:12px">' + _historyOpponentLabel(e) + ' · ' + e.moveCount + ' coups</div>'
      + '</div>'
      + '<div style="width:70px;text-align:right;font-size:12px">' + _historyResultBadge(e) + '</div>'
      + '<button class="ctrl-btn" onclick="_replayHistoryGame(\'' + e.code.replace(/'/g,"\\'") + '\')" style="width:auto;padding:6px 10px;font-size:12px">Revoir</button>'
      + '<button onclick="deleteGameHistoryEntry(\'' + e.id + '\');_renderHistoryList()" title="Supprimer" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:2px 6px">✕</button>'
    + '</div>';
  }).join('');
}

function _historySetFilter(key, value){
  _historyFilters[key] = value;
  _renderHistoryList();
}

/* Remplit les filtres (variantes/mode/resultat/recherche) dans le host
   dedie de la page Historique. Genere dynamiquement depuis LAYOUTS --
   jamais une liste ecrite a la main, qui deviendrait perimee des le
   prochain ajout de variante (deja vu plusieurs fois cette session). */
/* Rendu de la page "Statistiques du jeu". Asynchrone : la determination
   des vainqueurs MIGS demande un rejeu complet la premiere fois (~78s,
   mis en cache ensuite -- voir ensureMigsWinners). Affiche une
   progression honnete pendant ce calcul plutot que de figer la page. */
