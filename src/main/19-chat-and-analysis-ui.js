/* ═══════════════════════════════════════════
   GAME TABS
═══════════════════════════════════════════ */
function switchGameTab(tab, btn) {
  if (tab === 'chat' && typeof kidsMode !== 'undefined' && kidsMode) { showToast('🧒 Le chat n\'est pas disponible en mode Enfant'); return; }
  document.querySelectorAll('.game-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.game-tab-panel').forEach(p => { p.classList.remove('active'); p.style.display='none'; });
  btn.classList.add('active');
  const panel = document.getElementById('gpanel-'+tab);
  if (panel) { panel.style.display='flex'; panel.classList.add('active'); }
  if (tab === 'bots') renderBots();
  if (tab === 'analyse') runAnalysis();
}

/* ═══════════════════════════════════════════
   CHAT
═══════════════════════════════════════════ */
const botReplies = [
  'Intéressant...', 'Bon coup !', 'Hmm, je dois réfléchir.', 'Tu joues bien !',
  'Je ne l\u2019avais pas vu venir !', 'C\u2019est tendu !', '🤔', 'Belle pression au centre !',
];
/* ═══════════════════════════════════════════
   MODÉRATION DU CHAT — insultes, appel à la haine, violence/menaces
   Filtre local, hors-ligne (aucun appel reseau, coherent avec le principe
   du projet mono-fichier). Normalise le texte (accents, ponctuation,
   lettres repetees) avant comparaison pour limiter les contournements
   simples les plus courants ("cccooonnnnard", "c.o.n.n.a.r.d") — un vrai
   filtre exhaustif necessiterait un service serveur, hors de portee d'un
   fichier unique offline. Le Mode Enfant masque deja entierement le chat
   (voir togglePage : "chat n'est pas disponible en mode Enfant"), donc ce
   filtre protege les echanges adultes/communaute, pas les enfants
   specifiquement — deux protections differentes, pas redondantes.
   Escalade : message bloque -> avertissement ; 3 messages bloques
   d'affilee -> chat coupe 60s (meme logique de friction dissuasive que
   le rate-limit deja applique a la sortie du Mode Enfant). ═══════════════════════════════════════════ */
const MODERATION_PATTERNS = {
  // Priorite : menace > haine > insulte (le motif le plus grave d'abord si plusieurs matchent)
  menace: [
    'je vais te tuer', 'je te tue\\b', 'je vais te (frapper|defoncer|niquer|eclater|buter|crever)',
    'je te retrouve', 'je sais ou tu habites', 'tu vas mourir', 'va te pendre',
    'va te suicider', 'tue toi', 'menace de mort', 'je te fais la peau',
  ],
  haine: [
    'sale (noir|arabe|juif|blanc|chinois|musulman|chretien)',
    'espece de (negre|bougnoule|youpin|bride)',
    'retourne dans ton pays', 'sale race', 'sous homme', 'negre\\b', 'bougnoule',
  ],
  insulte: [
    'conard', 'conasse', 'encule', 'enfoire', 'salope', 'pute\\b', 'batard',
    'abruti', 'cretin', 'debile', 'cone\\b', '\\bcon\\b', 'merde', 'ta gueule',
    'ferme ta gueule', 'trouduc', '\\bntm\\b', '\\bfdp\\b', 'idiot',
  ],
};
// Enleve les accents, la ponctuation, et reduit TOUTE repetition de lettre a
// une seule occurrence (des deux cotes : texte saisi ET motifs ci-dessus,
// ecrits sans doubles) — plus robuste que collapser a 2 : "coonnnnard",
// "conneeeard" ou "connnnard" convergent tous vers la meme forme "conard"
// et sont donc tous detectes, sans avoir a deviner combien de lettres
// doublees le mot original comportait.
function normaliserTexteModeration(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/(.)\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
function detecterContenuProbleme(texte) {
  const norm = normaliserTexteModeration(texte);
  for (const categorie of ['menace', 'haine', 'insulte']) {
    for (const motif of MODERATION_PATTERNS[categorie]) {
      if (new RegExp(motif.includes('\\b') || motif.includes(' ') ? motif : '\\b' + motif + '\\b', 'i').test(norm)) {
        return categorie;
      }
    }
  }
  return null;
}
let _moderationViolations = 0;
let _moderationMuteUntil = 0;
// Renvoie true si le message peut partir, false s'il a ete bloque (le
// message reste dans le champ de saisie pour que l'utilisateur puisse le
// corriger, plutot que de l'effacer purement et simplement).
function verifierMessageChat(msg) {
  const maintenant = Date.now();
  if (maintenant < _moderationMuteUntil) {
    const reste = Math.ceil((_moderationMuteUntil - maintenant) / 1000);
    showToast('⏳ Chat temporairement coupé — réessaie dans ' + reste + 's');
    return false;
  }
  const categorie = detecterContenuProbleme(msg);
  if (!categorie) { _moderationViolations = 0; return true; }
  _moderationViolations++;
  const messages = {
    menace: '🚫 Message bloqué — les menaces ne sont pas tolérées ici.',
    haine: '🚫 Message bloqué — les propos haineux ne sont pas tolérés ici.',
    insulte: '🚫 Message bloqué — merci de rester courtois.',
  };
  showToast(messages[categorie]);
  if (_moderationViolations >= 3) {
    _moderationMuteUntil = maintenant + 60000;
    _moderationViolations = 0;
    showToast('⏳ Chat coupé 60s après plusieurs messages bloqués d\'affilée');
  }
  return false;
}

function sendChatMsg(preset) {
  const input = document.getElementById('chat-input');
  const msg = preset || input.value.trim();
  if (!msg) return;
  if (!verifierMessageChat(msg)) return;
  const box = document.getElementById('chat-messages');
  const name = currentUser ? currentUser.username : 'Vous';
  box.innerHTML += '<div class="chat-msg me"><span class="chat-author">'+escapeHtml(name)+'</span><span class="chat-text">'+escapeHtml(msg)+'</span></div>';
  if (input) input.value = '';
  box.scrollTop = box.scrollHeight;
  // Commande /bot : réponse hors-ligne depuis la base de connaissances Abalone (pas de réseau)
  if (/^\s*\/bot\b/i.test(msg)) { handleBotCommand(msg, box); return; }
  // Bot auto-reply
  setTimeout(function() {
    const reply = botReplies[Math.floor(Math.random()*botReplies.length)];
    box.innerHTML += '<div class="chat-msg bot"><span class="chat-author">🤖 KosmicBot</span><span class="chat-text">'+reply+'</span></div>';
    box.scrollTop = box.scrollHeight;
  }, 800 + Math.random()*1200);
}
function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Chat général (maquette locale — sera relié au backend pour le multijoueur réel)
function sendGeneralChat() {
  const input = document.getElementById('gchat-input');
  if (!input) return;
  const msg = input.value.trim();
  if (!msg) return;
  if (!verifierMessageChat(msg)) return;
  const box = document.getElementById('gchat-messages');
  const name = currentUser ? currentUser.username : 'Vous';
  const now = new Date();
  const time = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const langCode = (typeof currentLang === 'function') ? currentLang() : 'FR';
  const flags = { FR:'🇫🇷', EN:'🇬🇧', ES:'🇪🇸', DE:'🇩🇪', IT:'🇮🇹', PT:'🇵🇹', NL:'🇳🇱', PL:'🇵🇱', RU:'🇷🇺', ZH:'🇨🇳', JA:'🇯🇵' };
  const flag = flags[langCode] || '🇫🇷';
  box.innerHTML += '<div class="gchat-msg"><div style="display:flex;align-items:baseline;gap:8px"><span style="font-weight:700;color:var(--gold);font-size:13px">'+escapeHtml(name)+'</span><span style="font-size:10px;color:var(--muted)">'+flag+' '+langCode+'</span><span style="font-size:10px;color:var(--muted)">'+time+'</span></div><div style="font-size:13px;color:var(--text);margin-top:2px">'+escapeHtml(msg)+'</div></div>';
  input.value = '';
  box.scrollTop = box.scrollHeight;
}

/* ═══════════════════════════════════════════
   GAME ANALYSIS
═══════════════════════════════════════════ */
/* Calcule les meilleurs coups de la position courante, avec le vrai moteur :
   on joue chaque coup legal, on evalue la position obtenue, puis on annule.
   Renvoie les `n` meilleurs et le pire, avec un commentaire deduit du coup
   lui-meme (capture, poussee, sortie de danger…) — jamais un texte figé. */
function computeTopMoves(color, n) {
  n = n || 3;
  var out = [];
  var moves;
  try { moves = getAllMovesForColor(color); } catch(e) { return out; }
  if (!moves || !moves.length) return out;

  var scored = [];
  for (var i = 0; i < moves.length; i++) {
    var m = moves[i], undo = null, sc = 0;
    try {
      undo = applyMove(m, color);
      sc = evaluateBoard(color);
    } catch(e) { sc = -Infinity; }
    finally { if (undo) { try { undoMove(undo); } catch(e){} } }
    scored.push({ m: m, sc: sc });
  }
  scored.sort(function(a, b){ return b.sc - a.sc; });

  function label(mv) {
    try { return moveToABAPRO(mv.cells, mv.dir, mv.type).toUpperCase(); }
    catch(e) { return '?'; }
  }
  function why(mv, rank) {
    if (mv.eject) return 'Ejecte une bille adverse';
    if (mv.type === 'push') return 'Poussee — gagne du terrain';
    if (mv.type === 'broadside') return 'Deplacement lateral — elargit le front';
    if (mv.cells && mv.cells.length >= 3) return 'Groupe de 3 — formation solide';
    if (mv.cells && mv.cells.length === 2) return 'Groupe de 2 — avance coordonnee';
    return rank === 0 ? 'Meilleur coup selon le moteur' : 'Alternative jouable';
  }

  var top = scored.slice(0, Math.min(n, scored.length));
  for (var t = 0; t < top.length; t++) {
    out.push({
      type: t === 0 ? 'best' : 'good',
      icon: t === 0 ? '\ud83d\udfe2' : '\ud83d\udfe1',
      move: label(top[t].m),
      comment: (t === 0 ? 'Meilleur coup — ' : 'Alternative — ') + why(top[t].m, t)
    });
  }
  // le pire coup n'est affiche que s'il se distingue nettement du meilleur
  if (scored.length > top.length + 1) {
    var worst = scored[scored.length - 1];
    if (top[0].sc - worst.sc > 50) {
      out.push({ type:'bad', icon:'\ud83d\udd34', move: label(worst.m), comment: '\u00c0 \u00e9viter — ' + why(worst.m, -1) });
    }
  }
  return out;
}

let _carteTactiqueVisible = false;
let _carteTactiqueDim = 'menace';
/* Navigation temps reel dans la carte tactique :
   _carteTactiqueLive=true (defaut) : suit la partie en direct, se redessine
   automatiquement a chaque coup joue (ecoute abalassembly:movePlayed).
   _carteTactiqueLive=false : figee sur un instantane precis de l'historique
   (boardSnapshots, deja alimente a chaque coup — voir addMoveToHistory),
   navigable avec ◀/▶ sans jamais toucher au plateau REEL de la partie.
   _carteTactiqueViewIdx=-1 -> position de depart, 0..N-1 -> apres le coup N. */
let _carteTactiqueLive = true;
let _carteTactiqueViewIdx = -1;
// Rebascule juste la carte tactique sans refaire tout runAnalysis (evite de re-choisir les coups)
function toggleCarteTactique(cb) {
  _carteTactiqueVisible = !!cb.checked;
  const zone = document.getElementById('carte-tactique-zone');
  if (zone) zone.style.display = _carteTactiqueVisible ? '' : 'none';
  if (_carteTactiqueVisible) dessinerCarteTactique();
}
function choisirDimCarteTactique(dim) {
  _carteTactiqueDim = dim;
  dessinerCarteTactique();
}
// Retrouve {board, color} pour l'instant demande — board de depart Belgian
// Daisy standard si idx=-1 ET qu'aucun coup n'a encore ete joue (fallback
// honnete : au tout debut d'une partie, avant le premier coup, on ne peut
// montrer que le plateau REEL courant, pas un instantane reconstitue).
function _carteTactiqueSnapshotAt(idx) {
  if (idx < 0 || typeof boardSnapshots === 'undefined' || !boardSnapshots.length) {
    return { board: board, color: currentTurn };
  }
  const clamped = Math.max(0, Math.min(idx, boardSnapshots.length - 1));
  const snap = boardSnapshots[clamped];
  // Apres le coup snap.color, c'est a l'autre camp de jouer.
  const nextColor = snap.color === 'black' ? 'white' : 'black';
  return { board: snap.board, color: nextColor };
}
function carteTactiqueTogglePlay() {
  _carteTactiqueLive = !_carteTactiqueLive;
  if (_carteTactiqueLive) _carteTactiqueViewIdx = -1;   // reprendre le direct = revenir a l'instant present
  dessinerCarteTactique();
}
function carteTactiqueStepBack() {
  _carteTactiqueLive = false;   // toute navigation manuelle met en pause
  const maxIdx = (typeof boardSnapshots !== 'undefined') ? boardSnapshots.length - 1 : -1;
  if (_carteTactiqueViewIdx === -1) _carteTactiqueViewIdx = maxIdx;   // depuis le direct, recule d'un coup depuis la fin
  else _carteTactiqueViewIdx = Math.max(-1, _carteTactiqueViewIdx - 1);
  dessinerCarteTactique();
}
function carteTactiqueStepForward() {
  _carteTactiqueLive = false;
  const maxIdx = (typeof boardSnapshots !== 'undefined') ? boardSnapshots.length - 1 : -1;
  _carteTactiqueViewIdx = Math.min(maxIdx, _carteTactiqueViewIdx + 1);
  if (_carteTactiqueViewIdx >= maxIdx) { _carteTactiqueLive = true; _carteTactiqueViewIdx = -1; }  // au bout -> reprend le direct
  dessinerCarteTactique();
}
function dessinerCarteTactique() {
  const zone = document.getElementById('carte-tactique-svg');
  if (!zone) return;
  const snap = _carteTactiqueLive ? { board: board, color: currentTurn } : _carteTactiqueSnapshotAt(_carteTactiqueViewIdx);
  zone.innerHTML = buildCarteTactiqueSVG(snap.color, _carteTactiqueDim, _carteTactiqueLive ? null : snap.board);
  document.querySelectorAll('.carte-dim-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.dim === _carteTactiqueDim);
  });
  const playBtn = document.getElementById('carte-tactique-play');
  if (playBtn) playBtn.textContent = _carteTactiqueLive ? '⏸ Direct' : '▶ Reprendre le direct';
  const posInfo = document.getElementById('carte-tactique-pos');
  if (posInfo) {
    const total = (typeof boardSnapshots !== 'undefined') ? boardSnapshots.length : 0;
    posInfo.textContent = _carteTactiqueLive ? 'Position actuelle (direct)' : ('Coup ' + (_carteTactiqueViewIdx + 1) + ' / ' + total);
  }
  const legendEl = document.getElementById('carte-tactique-legend');
  if (legendEl) {
    const stops = HEATMAP_SCALE.map(function(c, i){
      return c + ' ' + Math.round((i / (HEATMAP_SCALE.length - 1)) * 100) + '%';
    }).join(',');
    const bar = 'background:linear-gradient(90deg,' + HEATMAP_EMPTY + ' 0%,' + stops + ')';
    legendEl.innerHTML =
      '<div style="font-size:11px;color:var(--text);line-height:1.5;margin-bottom:6px">' + EXPLICATIONS_CARTE_TACTIQUE[_carteTactiqueDim] + '</div>' +
      '<div style="height:8px;border-radius:4px;border:1px solid var(--border);' + bar + '"></div>' +
      '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:3px"><span>0 / faible</span><span>élevé</span></div>' +
      '<div style="font-size:10px;color:var(--muted);margin-top:8px">⚪ Bille claire sans chiffre = bille adverse, non analysée par cette carte (seules vos billes sont mesurées ici).</div>';
  }
}
// Mise a jour automatique en temps reel : a chaque coup reellement joue,
// si la carte est visible et en mode direct, elle se redessine toute seule —
// jamais besoin de re-cliquer "Analyser cette position". Reste silencieuse
// si la carte est fermee ou en pause sur un instantane du passe.
document.addEventListener('abalassembly:movePlayed', function(){
  if (_carteTactiqueVisible && _carteTactiqueLive && typeof dessinerCarteTactique === 'function') {
    dessinerCarteTactique();
  }
});
function runAnalysis() {
  const el = document.getElementById('analyse-content');
  if (!el) return;
  // Compute simple position evaluation
  const blackPieces = Object.values(board).filter(v=>v==='black').length;
  const whitePieces = Object.values(board).filter(v=>v==='white').length;
  const blackEj = 14 - blackPieces + capturedByWhite;
  const whiteEj = 14 - whitePieces + capturedByBlack;
  const advantage = blackPieces - whitePieces + (capturedByBlack - capturedByWhite)*2;
  const advPct = Math.min(100, Math.max(0, 50 + advantage*8));
  // Coups reellement calcules sur la position courante (voir computeTopMoves).
  // Cette liste etait auparavant ecrite en dur et affichait toujours les memes
  // quatre coups, quelle que soit la partie — signale par Olivier.
  const moves = computeTopMoves(currentTurn, 3);
  // Comparaison a la base historique reconstruite (voir calculerAnalyseHistorique) :
  // percentile de la position sur quelques dimensions cles + positions reelles les
  // plus proches (memes trait), avec lien direct vers la partie source pour rejouer.
  const histo = calculerAnalyseHistorique(currentTurn, 5);
  let histoHtml;
  if (histo) {
    const dimsAffichees = ['cohesionMoyenne','mobilite2Ratio','sumitoRatio','menaceRatio','profondeurTactique'];
    histoHtml = [
      '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">Comparaison à '+histo.nTotal.toLocaleString('fr-FR')+' positions réelles ('+histo.nMigs.toLocaleString('fr-FR')+' MIGS + '+histo.nAo.toLocaleString('fr-FR')+' AbalOnline)</div>',
      histo.rarete ? '<div style="font-size:12px;color:var(--gold);margin-bottom:8px">'+histo.rarete.label+'</div>' : '',
      dimsAffichees.map(function(ch){
        const c = histo.champs[ch];
        return '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);padding:2px 0">'+
          '<span>'+LABELS_EMPREINTE[ch]+'</span><span>percentile '+(c.percentile!=null?c.percentile+'ᵉ':'—')+'</span></div>';
      }).join(''),
      '<button class="btn-ghost" style="font-size:11px;padding:5px 10px;margin-top:8px" onclick="openCorrelationsPanel()">📊 Ce que disent 150k+ positions réelles sur la victoire</button>',
      '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">Positions historiques les plus proches</div>',
      histo.similaires.length ? histo.similaires.map(function(s){
        const fn = s.s === 'MIGS' ? 'loadMigsGame' : 'loadAOGame';
        return '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:5px 0;border-bottom:1px solid var(--border)">'+
          '<span>'+s.s+' · coup '+(s.m+1)+' · distance '+s.distance.toFixed(2)+'</span>'+
          '<span style="display:flex;gap:4px">'+
          '<button class="btn-ghost" style="font-size:10px;padding:3px 8px" onclick="openTrajectoryChart(\''+s.s+'\','+s.g+')">📈 courbe</button>'+
          '<button class="btn-ghost" style="font-size:10px;padding:3px 10px" onclick="'+fn+'('+s.g+')">▶ voir</button></span></div>';
      }).join('') : '<div style="font-size:11px;color:var(--muted)">Aucune position comparable trouvée.</div>',
    ].join('');
  } else {
    histoHtml = '<div style="margin-top:16px;font-size:11px;color:var(--muted)">📚 Bibliothèque historique en cours de chargement…</div>';
  }
  // Motifs tactiques détectés sur la position actuelle (voir MOTIFS_TACTIQUES) —
  // testés pour les deux couleurs, indique en plus si la poussée est immédiatement jouable.
  let motifsHtml = '';
  Object.keys(MOTIFS_TACTIQUES).forEach(function(cle){
    const def = MOTIFS_TACTIQUES[cle];
    ['black','white'].forEach(function(couleur){
      const occ = chercherMotif(def, couleur);
      occ.forEach(function(o){
        const jouable = motifEstJouable(o, def, o.dir);
        let statLigne = '';
        if (jouable && def.statVictoire) {
          const sv = def.statVictoire;
          const total = sv.attaquantGagne + sv.attaquantPerd;
          const pct = Math.round(1000 * sv.attaquantGagne / total) / 10;
          statLigne = '<div style="font-size:10px;color:var(--muted);padding:0 0 6px;border-bottom:1px solid var(--border)">'+
            'sur '+total.toLocaleString('fr-FR')+' occurrences jouables en parties réelles, l\'attaquant gagne la partie '+pct+'% du temps (corrélation, pas causalité)</div>';
        }
        motifsHtml += '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;padding:5px 0'+(statLigne?'':';border-bottom:1px solid var(--border)')+'">'+
          '<span>'+(couleur==='black'?'⚫':'⚪')+' '+def.nom+' <span style="opacity:.5;font-size:9px">'+def.id+'</span></span>'+
          '<span style="color:'+(jouable?'var(--accent-green-light)':'var(--muted)')+'">'+(jouable?'jouable':'bloqué')+'</span></div>'+statLigne;
      });
    });
  });
  if (motifsHtml) {
    motifsHtml = '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">Motifs tactiques détectés</div>' + motifsHtml;
  }
  // Graphe des positions : la position ACTUELLE (avant le prochain coup) fait-elle partie
  // des 839 positions retrouvees dans >=5 parties reelles differentes ? Si oui, montre la
  // frequence, le taux de victoire du joueur au trait, et les coups reellement joues ensuite.
  let grapheHtml = '';
  if (typeof GRAFFE_POSITIONS !== 'undefined' && GRAFFE_POSITIONS) {
    const h = hashPositionActuelle(currentTurn);
    const noeud = GRAFFE_POSITIONS.nodes[h];
    if (noeud) {
      const pctVictoire = noeud.wg ? Math.round(1000 * noeud.w / noeud.wg) / 10 : null;
      grapheHtml = '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">Position dans le graphe réel</div>'+
        '<div style="font-size:11px;color:var(--muted);padding:2px 0">Rencontrée dans '+noeud.g.toLocaleString('fr-FR')+' parties différentes'+
        (pctVictoire!=null ? (' · le joueur au trait gagne '+pctVictoire+'% du temps ('+noeud.wg.toLocaleString('fr-FR')+' parties avec vainqueur connu)') : '')+'</div>';
      const sortants = GRAFFE_POSITIONS.edges[h];
      if (sortants) {
        const tries = Object.entries(sortants).sort(function(a,b){ return b[1].c - a[1].c; }).slice(0, 4);
        grapheHtml += tries.map(function(pair){
          return '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);padding:2px 0"><span>'+pair[0]+'</span><span>'+pair[1].c+'×</span></div>';
        }).join('');
      }
    }
  }
  // Carte tactique par case (voir calculerCarteTactique) : liste texte toujours
  // visible (peu couteux), carte visuelle optionnelle via case a cocher.
  const carteCases = calculerCarteTactique(currentTurn);
  let carteHtml = '';
  if (carteCases.length) {
    const plusMenacees = carteCases.filter(function(c){ return c.menace>0; }).sort(function(a,b){ return b.menace-a.menace; }).slice(0,3);
    const moinsMobiles = carteCases.slice().sort(function(a,b){ return a.mobilite-b.mobilite; }).slice(0,3);
    carteHtml = '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">Carte tactique par case</div>'+
      (plusMenacees.length ? ('<div style="font-size:10px;color:var(--muted);margin-bottom:3px">Billes les plus menacées</div>'+
        plusMenacees.map(function(c){ return '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);padding:1px 0"><span>case '+c.r+','+c.c+'</span><span>menacée '+c.menace+'×</span></div>'; }).join(''))
        : '<div style="font-size:11px;color:var(--muted)">Aucune bille menacée actuellement.</div>')+
      '<div style="font-size:10px;color:var(--muted);margin:8px 0 3px">Billes les moins mobiles</div>'+
      moinsMobiles.map(function(c){ return '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);padding:1px 0"><span>case '+c.r+','+c.c+'</span><span>'+c.mobilite+' coup(s)</span></div>'; }).join('')+
      '<label style="display:flex;align-items:center;gap:8px;margin-top:10px;font-size:11px;color:var(--text);cursor:pointer">'+
      '<input type="checkbox" onchange="toggleCarteTactique(this)" '+(_carteTactiqueVisible?'checked':'')+'> 🗺️ Afficher la carte visuelle</label>'+
      '<div id="carte-tactique-zone" style="display:'+(_carteTactiqueVisible?'':'none')+';margin-top:8px">'+
      '<div style="display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap">'+
      Object.keys(LABELS_CARTE_TACTIQUE).map(function(d){
        return '<button type="button" class="carte-dim-btn setup-opt'+(_carteTactiqueDim===d?' active':'')+'" style="font-size:10px;padding:4px 8px" data-dim="'+d+'" onclick="choisirDimCarteTactique(\''+d+'\')">'+LABELS_CARTE_TACTIQUE[d]+'</button>';
      }).join('')+
      '</div><div id="carte-tactique-svg" style="text-align:center"></div>'+
      '<div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-top:10px">'+
      '<button type="button" class="btn-ghost" style="font-size:14px;padding:4px 10px" onclick="carteTactiqueStepBack()" title="Coup précédent">◀</button>'+
      '<button type="button" id="carte-tactique-play" class="btn-ghost" style="font-size:11px;padding:4px 10px" onclick="carteTactiqueTogglePlay()">⏸ Direct</button>'+
      '<button type="button" class="btn-ghost" style="font-size:14px;padding:4px 10px" onclick="carteTactiqueStepForward()" title="Coup suivant">▶</button>'+
      '</div>'+
      '<div id="carte-tactique-pos" style="text-align:center;font-size:10px;color:var(--muted);margin-top:4px">Position actuelle (direct)</div>'+
      '<div id="carte-tactique-legend" style="margin-top:10px;max-width:280px;margin-left:auto;margin-right:auto;text-align:left"></div>'+
      '</div>';
  }
  // Profil de decision — mesures reelles (branching, ecart de score, coups proches
  // du meilleur), jamais fusionnees en un score "complexite X/100" fabrique.
  const profil = calculerProfilDecision(currentTurn);
  let profilHtml = '';
  if (profil) {
    profilHtml = '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin:16px 0 8px">Profil de décision</div>'+
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);padding:2px 0"><span>Coups légaux disponibles</span><span>'+profil.nbCoupsLegaux+'</span></div>'+
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);padding:2px 0"><span>Écart meilleur / pire coup</span><span>'+profil.ecartMeilleurPire+' pts</span></div>'+
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);padding:2px 0"><span>Coups à ≤'+SEUIL_PROCHE_MEILLEUR+'pts du meilleur</span><span>'+profil.nbCoupsProchesDuMeilleur+'</span></div>'+
      '<div style="font-size:10px;color:var(--muted);margin-top:4px;font-style:italic">'+
      (profil.nbCoupsProchesDuMeilleur<=2 ? 'Décision assez claire : peu de coups rivalisent avec le meilleur.' : 'Décision disputée : plusieurs coups se valent, à trancher avec attention.')+
      '</div>';
  }
  el.innerHTML = [
    '<div style="margin-bottom:14px">',
    '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);margin-bottom:4px">',
    '<span>⚫ Noir '+(advantage>=0?'+':'')+advantage+'</span>',
    '<span>⚪ Blanc</span></div>',
    '<div class="analysis-bar"><div class="analysis-fill" style="width:'+advPct+'%;background:'+(advantage>0?'var(--accent-green-light)':'#e05c4b')+'"></div></div>',
    '</div>',
    '<div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin:12px 0 8px">Meilleurs coups (position actuelle)</div>',
    moves.map(m => '<div class="analysis-move '+m.type+'"><span class="am-icon">'+m.icon+'</span><span class="am-move">'+m.move+'</span><span class="am-comment">'+m.comment+'</span></div>').join(''),
    '<div style="margin-top:12px;padding:10px;background:var(--surface2);border-radius:8px;font-size:12px;color:var(--muted);line-height:1.6">',
    '📊 Billes éjectées — Vous: '+(HumanColor.get()==='black'?capturedByBlack:capturedByWhite)+' · Adversaire: '+(HumanColor.get()==='black'?capturedByWhite:capturedByBlack),
    '<br>⚡ Coups joués: '+moveCount,
    '</div>',
    histoHtml,
    motifsHtml,
    grapheHtml,
    carteHtml,
    profilHtml,
  ].join('');
  if (_carteTactiqueVisible) dessinerCarteTactique();
}

/* ═══════════════════════════════════════════
   BOTS
═══════════════════════════════════════════ */
const botsData = [
  { id:'random', name:'MiniMarble', emoji:'🐣', desc:'Débutant — joue au hasard', elo:400, diff:'easy', color:'#2a4a2a' },
  { id:'center', name:'CentroBot', emoji:'⭐', desc:'Intermédiaire — vise le centre', elo:800, diff:'medium', color:'#2a2a4a' },
  { id:'smart',  name:'SumitoAI', emoji:'🧠', desc:'Avancé — calcule les poussées', elo:1200, diff:'medium', color:'#4a2a2a' },
  { id:'expert', name:'GrandMaster-9', emoji:'👑', desc:'Expert — stratégie complète', elo:1800, diff:'hard', color:'#2a3a2a' },
  { id:'blitz',  name:'BlitzBot', emoji:'⚡', desc:'Très rapide — répond en 0.2s', elo:1500, diff:'hard', color:'#3a2a4a' },
  { id:'fightclub', name:'FightClub Bot', emoji:'📝', desc:'Style du fondateur — équilibré', elo:1950, diff:'hard', color:'#4a1c5a' },
];
let selectedBot = 'smart';

function renderBots() {
  // nouveau système : remplit les vignettes SVG des deux bots (Noir/Blanc)
  if (typeof fillBotSVGs === 'function') fillBotSVGs();
}

