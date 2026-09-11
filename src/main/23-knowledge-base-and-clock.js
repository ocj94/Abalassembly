/* ═══════════════════════════════════════════
   BASE DE CONNAISSANCES ABALONE (embarquée, hors-ligne)
   Alimente la commande /bot du chat. Aucune requête réseau.
   Sources : Wikipédia FR/EN, msodb.playstrategy.org, Asmodee, abaloneonline.
   À rafraîchir ~chaque septembre (après le MSO d'août).
═══════════════════════════════════════════ */
const ABALONE_KB_META = { updated: '2026-06', refresh: 'msodb.playstrategy.org (palmarès), Wikipédia (règles/histoire)' };

const ABALONE_KB_TOPICS = [
  { id:'histoire',
    kw:['histoire','origine','origines','creation','cree','creer','invent','auteur','auteurs','lalet','levi','1987','1988','1989','editeur','asmodee','vente','ventes','sumito','nom','vendu'],
    a:`Abalone a été conçu en <b>1987</b> par deux Français, <b>Michel Lalet</b> et <b>Laurent Lévi</b>. D'abord nommé « Sumito », il gagne le concours de créateurs de Boulogne-Billancourt en 1988 ; la société <b>Abalone S.A.</b> est fondée en janvier 1988 et le jeu sort en magasin en 1989. Le nom joue sur l'anglais <i>ab-alone</i> (« on ne joue pas seul ») et sur le coquillage. <b>Plus de 4,5 millions</b> d'exemplaires vendus dans 30+ pays ; l'exploitation passe chez <b>Asmodee</b> en 2010.` },

  { id:'recompenses',
    kw:['recompense','recompenses','prix','award','awards','distinction','as d\'or','asdor','mensa','spiel','medaille','cannes'],
    a:`Le palmarès du jeu : Coupe d'Or de Boulogne-Billancourt (1988), <b>Super As d'Or</b> à Cannes (1989), médaille de vermeil à Genève (1989), <b>Mensa Select</b> (1990) et l'<b>As d'Or – Jeu de la décennie</b> (1998).` },

  { id:'regles',
    kw:['regle','regles','jouer','comment','plateau','case','cases','bille','billes','sumito','poussee','pousser','gagner','gagne','victoire','ejection','ejecter','but','objectif','pac','deplacement','deplacer','mouvement'],
    a:`Plateau hexagonal de <b>61 cases</b>, <b>14 billes</b> par joueur, les <b>noires commencent</b>. Tu déplaces <b>1, 2 ou 3 billes alignées</b> d'une case, soit <b>en ligne</b> (dans l'axe), soit <b>en latéral</b> (de côté). Le <b>sumito</b> (poussée) se fait uniquement en ligne et en supériorité : 2c1, 3c1 ou 3c2 — jamais à égalité (« pac »), jamais 3 billes adverses, et la case derrière doit être libre ou hors plateau. <b>Objectif : éjecter 6 billes adverses.</b>` },

  { id:'ouvertures',
    kw:['ouverture','ouvertures','belgian','german','dutch','swiss','daisy','marguerite','standard','classique','depart','position'],
    a:`Position classique : <b>5-6-3</b>, mais elle mène souvent à des nulles. En tournoi, l'ouverture de référence depuis 1999 est la <b>Belgian Daisy</b> (marguerite belge, billes en losanges) — bien plus dynamique. La <b>German Daisy</b> est plus défensive/positionnelle. Il existe des dizaines d'autres marguerites (Dutch, Swiss…) et de configurations expérimentales.` },

  { id:'notation',
    kw:['notation','notations','noter','aba-pro','abapro','nacre','playstrategy','coordonnee','coordonnees','coup','transcription'],
    a:`Trois systèmes coexistent. <b>Aba-Pro</b> : départ+arrivée de la bille « moteur » (ex. <code>e5e6</code>), robuste et indépendant du plateau. <b>Nacre</b> : départ d'une bille + arrivée d'une autre (ex. <code>e5h8</code>), plus descriptive des latéraux. <b>PlayStrategy</b> : Nacre étendue avec symbole d'éjection × (ex. <code>e5×i9</code>). Coordonnées : lettres <b>A–I</b> (lignes), chiffres <b>1–9</b> (diagonales).` },

  { id:'champions',
    kw:['champion','champions','palmares','frochot','vincent','vainqueur','gagnant','mso','pearce','kang','borello','schnider','titre','mondial','monde'],
    a:`Le championnat du monde se dispute au <b>Mind Sports Olympiad (MSO)</b>, à Londres chaque août, depuis 1997. Le joueur le plus titré est de très loin le Français <b>Vincent Frochot</b> (10 titres mondiaux). Champions récents : <b>2025 David Pearce</b> (Angleterre), <b>2024 Kyungmin Kang</b> (Corée du Sud — 1re victoire coréenne), 2022-2023 Vincent Frochot, 2020-2021 Alex Borello.` },

  { id:'joueurs',
    kw:['joueur','joueurs','meilleur','meilleurs','classement','classements','elo','glicko','grandmaster','niveau','fort','forts','ranking'],
    a:`Figures du haut niveau : <b>Vincent Frochot</b> (FR, 10× champion du monde, créateur d'abal.online), <b>David Pearce</b> (Angleterre), <b>Alex Borello</b> (FR), Gert Schnider (AT), Jan Šťastna (CZ), Marc Tastet (FR). Forte montée de l'école <b>sud-coréenne</b> depuis 2019, surtout chez les juniors. Les classements se font en ELO (Board Game Arena) ou Glicko (PlayStrategy).` },

  { id:'tournois',
    kw:['tournoi','tournois','competition','competitions','championnat','mso','msodb','national','flip','parthenay','icga'],
    a:`Compétition reine : le <b>Mind Sports Olympiad</b> (championnat du monde de fait, Londres, août, format suisse ~6 rondes). Résultats officiels sur <b>msodb.playstrategy.org</b>. En 2020-2021, un championnat « online » s'est tenu sur abal.online (Covid). En France : le <b>Tournoi National Abalone</b> (Asmodee + ludothèques, finale au FLIP de Parthenay). Côté IA : 1er tournoi ICGA en 2003.` },

  { id:'sites',
    kw:['site','sites','ligne','online','plateforme','plateformes','jouer en ligne','bga','board game arena','migs','netabalone','playstrategy','abal.online','abal','playabalone','bgg','boardgamegeek','appli','application','communaute'],
    a:`Où jouer / discuter en ligne : <b>abal.online</b> (site de V. Frochot, problèmes & tournois), <b>PlayStrategy</b> (Abalone lancé le 9 janvier 2025, tournois cotés, bots), <b>Board Game Arena</b> (ELO public), les serveurs historiques <b>MiGs</b> et <b>NetAbalone</b>, le fan-site <b>playabalone.com</b> (IA 4 niveaux), l'<b>appli officielle Asmodee</b> et la fiche <b>BoardGameGeek</b>. Référence encyclopédique : le blog <i>abaloneonline</i> (peu à jour depuis 2021).` },

  { id:'variantes',
    kw:['variante','variantes','grand abalone','grand','pillar','pilier','offboard','multijoueur','junior','mode'],
    a:`Variantes connues : <b>Grand Abalone</b> (plateau plus grand, 2 coups/tour, 10 éjections pour gagner — dispo sur PlayStrategy), <b>The Pillar</b> (bille fixe au centre), <b>Offboard</b> (zones de score externes, édition 2025), le mode <b>multijoueur 3 à 6 joueurs</b>, et <b>Abalone Junior</b> (1997).` },

  { id:'actu',
    kw:['actu','actualite','actualites','news','nouveaute','nouveautes','recent','recente','2024','2025','2026','quoi de neuf','neuf'],
    a:`Du neuf (2024-2026) : Abalone a débarqué sur <b>PlayStrategy</b> le 9 janvier 2025 (développé par V. Frochot), avec tournois cotés mensuels. <b>MSO 2024</b> : 1er titre coréen (Kyungmin Kang). <b>MSO 2025</b> : David Pearce champion, podiums juniors trustés par la Corée du Sud. Nouvelles éditions Asmodee (dont premium bois) en circulation.` },
];

const ABALONE_KB_TOPICLIST = 'règles, histoire, ouvertures, notation, champions, joueurs, tournois, sites, variantes, actu';

// Recherche le meilleur topic par score de mots-clés (insensible aux accents)
function kbNorm(s){ return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function kbFindTopic(query){
  const q = ' ' + kbNorm(query) + ' ';
  let best = null, bestScore = 0;
  for (const t of ABALONE_KB_TOPICS){
    let score = 0;
    for (const k of t.kw){ if (q.indexOf(' ' + kbNorm(k)) !== -1 || q.indexOf(kbNorm(k)) !== -1) score += k.length >= 5 ? 2 : 1; }
    if (score > bestScore){ bestScore = score; best = t; }
  }
  return bestScore > 0 ? best : null;
}

// Caractères des deux bots pour habiller la réponse factuelle
const BOT_KB_FLAVOR = {
  black: {
    intros: ['Bonne question ! 😊 ', 'Avec plaisir. ', 'Ah ça, je connais. ', 'Tiens, écoute. 😊 '],
    outros: ['', ' …Continue à fouiner comme ça, tu progresses ! 👏', ' On en apprend tous les jours. 😊'],
    none: `Hmm, je n'ai pas ça sous la main. 😊 Essaie un de ces thèmes : ${ABALONE_KB_TOPICLIST}.`
  },
  white: {
    intros: ['Tu ne sais pas ça ? 🙄 ', 'Évidemment que je sais. ', 'Pff. Bon, écoute bien. 😒 ', 'Je vais faire court. '],
    outros: [' …Voilà. Tâche de retenir. 😒', ' Ne me le redemande pas.', ' C\'est pourtant dans tous les bons manuels.'],
    none: `Aucune idée de ce que tu racontes. 😒 Reformule avec : ${ABALONE_KB_TOPICLIST}.`
  }
};

// Construit la réponse d'un bot ('black'|'white') à une question, depuis la KB
function botKbReply(which, query){
  const f = BOT_KB_FLAVOR[which] || BOT_KB_FLAVOR.black;
  const t = kbFindTopic(query);
  if (!t) return f.none;
  const intro = f.intros[Math.floor(Math.random()*f.intros.length)];
  const outro = f.outros[Math.floor(Math.random()*f.outros.length)];
  return intro + t.a + outro;
}

// Texte d'aide de la commande /bot
function botKbHelp(){
  return '💡 Interroge-moi sur le jeu avec <b>/bot</b> suivi d\'un thème : '
    + '<b>/bot règles</b>, <b>/bot histoire</b>, <b>/bot ouvertures</b>, <b>/bot notation</b>, '
    + '<b>/bot champions</b>, <b>/bot tournois</b>, <b>/bot sites</b>, <b>/bot variantes</b>, <b>/bot actu</b>. '
    + 'Tu peux viser un bot précis : <b>/bot blanc champions</b> ou <b>/bot noir règles</b>.';
}

// Ajoute un message de bot (noir/blanc) dans le chat in-game, avec son avatar coloré
function appendBotChatMsg(which, html){
  const box = document.getElementById('chat-messages');
  if (!box) return;
  const isBlack = (which === 'black');
  const nm  = isBlack ? 'Bot Noir' : 'Bot Blanc';
  const icon = isBlack ? '⚫' : '⚪';
  const col = isBlack ? '#c8a84b' : '#a8c4e0';
  box.innerHTML += '<div class="chat-msg bot"><span class="chat-author" style="color:'+col+'">'+icon+' '+nm+'</span><span class="chat-text">'+html+'</span></div>';
  box.scrollTop = box.scrollHeight;
}

// Traite une commande /bot saisie dans le chat
function handleBotCommand(rawMsg, box){
  // retire le préfixe /bot
  let rest = rawMsg.replace(/^\s*\/bot\b/i, '').trim();
  // ciblage explicite d'un bot
  let which = null;
  const m = rest.match(/^(noir|black|blanc|white)\b/i);
  if (m){
    const w = m[1].toLowerCase();
    which = (w === 'noir' || w === 'black') ? 'black' : 'white';
    rest = rest.slice(m[0].length).trim();
  }
  // sinon : le conseiller actif répond, ou le Bot Noir par défaut
  if (!which){
    const adv = (typeof advisorBotColor === 'function') ? advisorBotColor() : null;
    which = adv || 'black';
  }
  // aide
  if (!rest || /^(aide|help|\?)$/i.test(rest)){
    setTimeout(function(){ appendBotChatMsg(which, botKbHelp()); }, 500);
    return;
  }
  // réponse depuis la KB (petit délai « réflexion »)
  const reply = botKbReply(which, rest);
  setTimeout(function(){ appendBotChatMsg(which, reply); }, 600 + Math.random()*700);
}


let coachEnabled = false;
try { coachEnabled = localStorage.getItem('abalone_coach') === '1'; } catch(e) {}
if (coachEnabled) {
  document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('coach-toggle-btn');
    if (btn) { btn.style.opacity = '1'; btn.textContent = '🎓 Coach activé'; }
  });
}

function toggleCoachMode() {
  coachEnabled = !coachEnabled;
  try { localStorage.setItem('abalone_coach', coachEnabled ? '1' : '0'); } catch(e) {}
  const btn = document.getElementById('coach-toggle-btn');
  if (btn) { btn.style.opacity = coachEnabled ? '1' : '0.6'; btn.textContent = coachEnabled ? '🎓 Coach activé' : '🎓 Coach'; }
  showToast(coachEnabled ? '🎓 Mode Coach activé — je commenterai tes coups' : 'Mode Coach désactivé');
  if (!coachEnabled) hideCoachBubble();
}

// Décompose l'évaluation en facteurs pour un côté donné (travaille sur board courant)
function evalFactors(color) {
  let myCenter=0, enCenter=0, myCohesion=0, enCohesion=0, myEdge=0, enEdge=0, myCount=0, enCount=0;
  for (const k in board) {
    const v = board[k];
    if (!v) continue;
    const parts = k.split(','); const r=+parts[0], c=+parts[1];
    const ax = rcToAxial(r,c);
    const dist = axHexDist(ax, EVAL_CENTER);
    const isEdge = dist >= 4;
    let allies = 0;
    for (const d of AX_DIRS) { const n = axialToRc(ax.q+d.q, ax.r+d.r); if (n && board[akey(n.r,n.c)]===v) allies++; }
    if (v === color) { myCount++; myCenter += (4-dist); myCohesion += allies; if(isEdge) myEdge++; }
    else             { enCount++; enCenter += (4-dist); enCohesion += allies; if(isEdge) enEdge++; }
  }
  return { center: myCenter-enCenter, cohesion: myCohesion-enCohesion, edge: myEdge, enEdge: enEdge, material: myCount-enCount };
}

function coachComment(before, after, capturedDelta) {
  if (capturedDelta > 0) return { text: 'Excellent ! Tu éjectes une bille adverse. 🎯', type: 'good' };
  const dCenter = after.center - before.center;
  const dCohesion = after.cohesion - before.cohesion;
  const dMyEdge = after.edge - before.edge;
  if (dCenter >= 3) return { text: 'Bon contrôle du centre — tu gagnes du terrain. 👍', type: 'good' };
  if (dCohesion >= 3) return { text: 'Belle cohésion, tes billes se soutiennent. 🛡️', type: 'good' };
  if (dMyEdge >= 1 && after.edge >= 3) return { text: 'Attention, plusieurs de tes billes sont exposées au bord. ⚠️', type: 'warn' };
  if (dCenter <= -3) return { text: 'Tu cèdes du terrain au centre — reprends l\'initiative. 📉', type: 'warn' };
  if (dCohesion <= -3) return { text: 'Tes billes se dispersent, regroupe-les. 🔗', type: 'warn' };
  return { text: 'Coup joué. Continue à viser le centre et la cohésion.', type: 'neutral' };
}

function showCoachBubble(comment) {
  let bubble = document.getElementById('coach-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'coach-bubble';
    bubble.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2400;max-width:340px;padding:14px 18px;border-radius:12px;background:var(--surface);border:1px solid var(--gold-dim);box-shadow:0 8px 30px rgba(0,0,0,0.4);font-size:14px;line-height:1.5;display:flex;align-items:flex-start;gap:10px;transition:opacity 0.3s';
    document.body.appendChild(bubble);
  }
  const color = comment.type === 'good' ? 'var(--gold)' : comment.type === 'warn' ? '#e0a030' : 'var(--text)';
  bubble.innerHTML = '<span style="font-size:20px">🎓</span><span style="color:' + color + '">' + comment.text + '</span>';
  bubble.style.opacity = '1';
  bubble.style.display = 'flex';
  clearTimeout(bubble._hideTimer);
  bubble._hideTimer = setTimeout(hideCoachBubble, 5000);
}

function hideCoachBubble() {
  const bubble = document.getElementById('coach-bubble');
  if (bubble) { bubble.style.opacity = '0'; setTimeout(function(){ if(bubble) bubble.style.display='none'; }, 300); }
}

/* "Pourquoi ce coup ?" — affiche la decomposition REELLE de l'evaluation
   qui a motive le dernier coup de l'IA (calculerExplicationCoup, calculee
   AVANT que le coup soit applique au plateau reel, dans executeAIMove).
   Meme patron visuel que la bulle du mode Coach, mais un element separe :
   les deux peuvent en principe etre actifs en meme temps (l'un commente
   TES coups, l'autre EXPLIQUE ceux de l'IA — deux sujets differents). */
let aiExplainEnabled = false;
try { aiExplainEnabled = localStorage.getItem('abalone_ai_explain') === '1'; } catch(e) {}
if (aiExplainEnabled) {
  document.addEventListener('DOMContentLoaded', function() {
    const btn = document.getElementById('ai-explain-toggle-btn');
    if (btn) { btn.style.opacity = '1'; btn.textContent = '🧠 Explication activée'; }
  });
}
function toggleAIExplain() {
  aiExplainEnabled = !aiExplainEnabled;
  try { localStorage.setItem('abalone_ai_explain', aiExplainEnabled ? '1' : '0'); } catch(e) {}
  const btn = document.getElementById('ai-explain-toggle-btn');
  if (btn) { btn.style.opacity = aiExplainEnabled ? '1' : '0.6'; btn.textContent = aiExplainEnabled ? '🧠 Explication activée' : '🧠 Pourquoi ce coup ?'; }
  showToast(aiExplainEnabled ? '🧠 J\'expliquerai mes coups' : 'Explication des coups IA désactivée');
  if (!aiExplainEnabled) hideAIExplainBubble();
}
function showAIExplainBubble(explication) {
  let bubble = document.getElementById('ai-explain-bubble');
  if (!bubble) {
    bubble = document.createElement('div');
    bubble.id = 'ai-explain-bubble';
    bubble.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:2400;max-width:380px;padding:14px 18px;border-radius:12px;background:var(--surface);border:1px solid var(--gold-dim);box-shadow:0 8px 30px rgba(0,0,0,0.4);font-size:14px;line-height:1.5;display:flex;align-items:flex-start;gap:10px;transition:opacity 0.3s';
    document.body.appendChild(bubble);
  }
  const texte = formaterExplicationCoup(explication);
  bubble.innerHTML = '<span style="font-size:20px">🧠</span><span style="color:var(--text)">' + texte + '</span>';
  bubble.style.opacity = '1';
  bubble.style.display = 'flex';
  clearTimeout(bubble._hideTimer);
  bubble._hideTimer = setTimeout(hideAIExplainBubble, 6000);
}
function hideAIExplainBubble() {
  const bubble = document.getElementById('ai-explain-bubble');
  if (bubble) { bubble.style.opacity = '0'; setTimeout(function(){ if(bubble) bubble.style.display='none'; }, 300); }
}

/* ═══════════════════════════════════════════
   VARIANTE PRINCIPALE (PV) — reconstruction a posteriori
═══════════════════════════════════════════ */
/* Ne touche PAS a search()/searchBestMove() : lit seulement la table de
   transposition qu'elles remplissent deja (TT.set(h,{...,move:...}) a
   chaque noeud, pas seulement a la racine -- confirme en lisant le code
   des deux copies, thread principal et Worker, avant d'ecrire cette
   fonction). Marche APRES un appel a searchBestMove, sur le plateau
   racine (searchBestMove restaure toujours le plateau avant de
   retourner, via ses propres undoMove() -- verifie egalement).

   searchBestMove traite le PREMIER coup dans sa PROPRE boucle a la
   racine, separee de search() -- la position de DEPART n'est donc jamais
   ecrite dans TT avec un .move (verifie empiriquement). On applique donc
   firstMove (deja calcule par searchBestMove, fourni ici) AVANT de
   commencer a marcher dans TT, qui lui est bien rempli a partir de la
   position qui suit.

   Applique les coups un par un pour suivre le fil des positions (aucune
   autre facon fiable de retrouver le bon TT a chaque etape), puis annule
   TOUT dans l'ordre inverse avant de retourner -- meme discipline que
   search() elle-meme. Ne modifie jamais le plateau du point de vue de
   l'appelant, y compris en cas d'exception (finally). */
function extractPV(rootColor, firstMove, maxLen) {
  const applied = [];
  const seenPositions = new Set([_repKeyOf(board)]);
  const pv = [];
  try {
    if (!firstMove) return pv;
    const undo0 = applyMove(firstMove, rootColor);
    applied.push(undo0);
    pv.push({ mover: rootColor, move: firstMove });
    seenPositions.add(_repKeyOf(board));
    let mover = (rootColor === 'black') ? 'white' : 'black';

    for (let i = 1; i < maxLen; i++) {
      if (capturedByBlack >= 6 || capturedByWhite >= 6) break;
      const h = hashBoard();
      const tt = TT.get(h);
      if (!tt || !tt.move) break;
      const legal = getAllMovesForColor(mover);
      const found = legal.find(function (m) { return moveKey(m) === tt.move; });
      if (!found) break; // coup enregistre mais introuvable (position perimee) : on s'arrete proprement
      const undo = applyMove(found, mover);
      applied.push(undo);
      pv.push({ mover: mover, move: found });
      const rep = _repKeyOf(board);
      if (seenPositions.has(rep)) break; // cycle : ne pas boucler indefiniment sur une position deja vue
      seenPositions.add(rep);
      mover = (mover === 'black') ? 'white' : 'black';
    }
  } finally {
    for (let i = applied.length - 1; i >= 0; i--) undoMove(applied[i]);
  }
  return pv;
}
function gameShowBestMove() {
  if (gameOver) { showToast('⛔ La partie est terminée'); return; }
  // Meme garde que les fonctions voisines (ex. la verification "attends ton
  // tour" un peu plus bas dans ce fichier) : base sur humanColor, pas sur
  // 'black'. Sans ca, un humain jouant les blancs etait bloque sur SON
  // propre tour ('Ce n'est pas votre tour' alors que si), et le coup
  // cherche ensuite (voir plus bas) etait celui des noirs -- le coup de
  // l'IA elle-meme, affiche comme si c'etait "votre" suggestion.
  if (GameMode.get() === 'ai' && CurrentTurn.get() !== HumanColor.get()) { showToast('⛔ Ce n\'est pas votre tour'); return; }
  showToast('🧠 Recherche du meilleur coup...');
  setTimeout(function() {
    // searchBestMove travaille sur la globale board (qui est déjà la position courante)
    const SEARCH_DEPTH = 2;
    let best = null;
    try { best = searchBestMove(CurrentTurn.get(), SEARCH_DEPTH, 1500); }
    catch(e) { best = null; }
    if (best && best.cells) {
      gameBestHint = { cells: best.cells, dir: best.dir };
      drawBoard();
      drawGameBestHint();
      const from = coordToABAPRO(best.cells[0].r, best.cells[0].c);
      const typeLabel = best.eject ? 'éjection !' : (best.type === 'push' ? 'poussée' : best.type === 'broadside' ? 'latéral' : 'déplacement');
      /* Suite honnête, pas inventee : extractPV() relit la table de
         transposition DEJA remplie par le searchBestMove ci-dessus (elle
         enregistre le meilleur coup a chaque position visitee, pas
         seulement a la racine), sans jamais toucher a search() elle-meme.
         Bornee a SEARCH_DEPTH demi-coups : au-dela, il n'y a tout
         simplement plus d'entree dans la table pour cette recherche precise
         -- inventer une suite plus longue reviendrait a afficher un calcul
         que le moteur n'a pas fait. */
      let replyMsg = '';
      try {
        const pv = extractPV(CurrentTurn.get(), best, SEARCH_DEPTH);
        if (pv.length > 1) {
          const reply = pv[1].move;
          const replyNotation = moveToABAPRO(reply.cells, reply.dir, reply.type);
          replyMsg = ' → adversaire probablement ' + replyNotation;
        }
      } catch(e) { /* pas de suite disponible : on affiche juste le coup, comme avant */ }
      showToast('💡 Suggestion : ' + from + ' (' + typeLabel + ')' + replyMsg);
    } else {
      showToast('Aucun coup trouvé');
    }
  }, 50);
}

// Dessine la suggestion sur le plateau de jeu (billes entourées + flèche)
function drawGameBestHint() {
  const canvas = document.getElementById('board');
  if (!canvas || !gameBestHint) return;
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / 640;
  ctx.save();
  ctx.scale(scale, scale);
  gameBestHint.cells.forEach(function(cell){
    const p = hexCoord(cell.r, cell.c);
    ctx.beginPath();
    ctx.arc(p.x, p.y, HEX_RADIUS - 4, 0, Math.PI*2);
    ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 3; ctx.stroke();
  });
  const ax = gameBestHint.cells.map(function(s){return rcToAxial(s.r,s.c);});
  const sorted = ax.slice().sort(function(a,b){return (a.q*gameBestHint.dir.q+a.r*gameBestHint.dir.r)-(b.q*gameBestHint.dir.q+b.r*gameBestHint.dir.r);});
  const head = sorted[sorted.length-1];
  const headRc = axialToRc(head.q, head.r);
  const headP = hexCoord(headRc.r, headRc.c);
  const destAx = { q: head.q + gameBestHint.dir.q, r: head.r + gameBestHint.dir.r };
  const destRc = axialToRc(destAx.q, destAx.r);
  const destP = destRc ? hexCoord(destRc.r, destRc.c) : { x: headP.x + gameBestHint.dir.q*40, y: headP.y };
  ctx.beginPath();
  ctx.moveTo(headP.x, headP.y); ctx.lineTo(destP.x, destP.y);
  ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 4; ctx.stroke();
  const angle = Math.atan2(destP.y - headP.y, destP.x - headP.x);
  ctx.beginPath();
  ctx.moveTo(destP.x, destP.y);
  ctx.lineTo(destP.x - 12*Math.cos(angle - Math.PI/6), destP.y - 12*Math.sin(angle - Math.PI/6));
  ctx.lineTo(destP.x - 12*Math.cos(angle + Math.PI/6), destP.y - 12*Math.sin(angle + Math.PI/6));
  ctx.closePath(); ctx.fillStyle = '#f0c040'; ctx.fill();
  ctx.restore();
}

/* ═══════════════════════════════════════════
   CHRONOMÈTRE DE PARTIE
═══════════════════════════════════════════ */
let gameTimerInterval = null;
let gameTimerSeconds = 0;          // secondes RESTANTES (decompte)
let gameTimerBudget = 1200;        // budget par defaut : 20 minutes

/* Le chronometre est un DECOMPTE : on veut savoir combien de temps il reste,
   pas combien s'est ecoule. Le budget suit la cadence choisie quand il y en a
   une (« 10 min + 5 s » -> 600 s) ; sinon 20 minutes par defaut.
   Demande d'Olivier. */
function _gameTimerBudgetFromControl() {
  try {
    var sel = document.getElementById('time-ctl-select');
    if (sel && sel.value) {
      var base = parseInt(String(sel.value).split('+')[0], 10);
      if (base > 0) return base;
    }
  } catch(e){}
  return 1200;
}

function startGameTimer() {
  stopGameTimer();
  const box = document.getElementById('game-timer-box');
  // Cadence libre (_timeCtlBase===0) : pas de decompte a afficher, la pendule
  // ne fait rien perdre au temps dans ce mode — l'afficher quand meme
  // laissait croire a une limite qui n'existe pas. Signale par Olivier.
  if (typeof _timeCtlBase !== 'undefined' && _timeCtlBase === 0) {
    if (box) box.style.display = 'none';
    return;
  }
  if (box) box.style.display = 'flex';
  gameTimerBudget = _gameTimerBudgetFromControl();
  gameTimerSeconds = gameTimerBudget;
  updateGameTimerDisplay();
  gameTimerInterval = setInterval(function() {
    if (gameTimerSeconds > 0) gameTimerSeconds--;
    updateGameTimerDisplay();
    if (gameTimerSeconds <= 0) stopGameTimer();
  }, 1000);
}

function stopGameTimer() {
  if (gameTimerInterval) { clearInterval(gameTimerInterval); gameTimerInterval = null; }
}

function updateGameTimerDisplay() {
  const el = document.getElementById('game-timer');
  if (!el) return;
  const left = Math.max(0, gameTimerSeconds);
  const m = Math.floor(left / 60);
  const s = left % 60;
  el.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  // alerte visuelle quand le temps se termine
  el.style.color = (left <= 30) ? '#e05050' : (left <= 120 ? '#f0a030' : 'var(--gold)');
}

/* ═══════════════════════════════════════════
   SAUVEGARDE AUTOMATIQUE DE LA PARTIE
═══════════════════════════════════════════ */
function saveGameState() {
  try {
    const state = {
      board: board,
      turn: CurrentTurn.get(),
      capB: capturedByBlack,
      capW: capturedByWhite,
      timer: gameTimerSeconds,
      mode: (typeof GameMode !== 'undefined') ? GameMode.get() : 'ai',
      ts: Date.now()
    };
    localStorage.setItem('abalone_saved_game', JSON.stringify(state));
  } catch(e) {}
}

function loadSavedGame() {
  try {
    const raw = localStorage.getItem('abalone_saved_game');
    if (!raw) return false;
    const state = JSON.parse(raw);
    if (!state.board || Object.keys(state.board).length === 0) return false;
    board = state.board;
    CurrentTurn.set(state.turn || 'black');
    capturedByBlack = state.capB || 0;
    capturedByWhite = state.capW || 0;
    gameTimerSeconds = state.timer || 0;
    gameOver = false;
    selected = [];
    updateGameTimerDisplay();
    drawBoard();
    if (typeof updateStatus === 'function') updateStatus();
    if (typeof updateCaptures === 'function') updateCaptures();
    return true;
  } catch(e) { return false; }
}

function clearSavedGame() {
  try { localStorage.removeItem('abalone_saved_game'); } catch(e) {}
}

function replayStep(dir) {
  if (boardSnapshots.length === 0) { showToast('Aucun coup enregistré'); return; }
  if (!replayMode) {
    replayMode = true;
    replayCurrentIdx = boardSnapshots.length - 1;
    const btn = document.getElementById('replay-btn');
    if (btn) btn.style.display = 'block';
  }
  const _min = _replayStartBoard ? -1 : 0;   // -1 seulement si une position de depart est connue
  replayCurrentIdx = Math.max(_min, Math.min(boardSnapshots.length - 1, replayCurrentIdx + dir));
  loadSnapshot(replayCurrentIdx);
  // Garde l'historique des coups synchronise avec la navigation replay,
  // pour que les deux facons de naviguer montrent la meme ligne active.
  if (typeof _highlightMoveRow === 'function') _highlightMoveRow(replayCurrentIdx);
}

function loadSnapshot(idx) {
  // Index -1 : position de depart, avant le premier coup.
  if (idx === -1) {
    if (!_replayStartBoard) return;
    board = JSON.parse(JSON.stringify(_replayStartBoard));
    capturedByBlack = 0; capturedByWhite = 0;
    drawBoard(); updateCaptures();
    document.querySelectorAll('.move-item').forEach(function(el){ el.classList.remove('current'); });
    const st0 = document.getElementById('game-status-text');
    if (st0) st0.textContent = 'Replay — position de depart (0/' + boardSnapshots.length + ')';
    return;
  }
  if (!boardSnapshots[idx]) return;
  const snap = boardSnapshots[idx];
  board = JSON.parse(JSON.stringify(snap.board));
  capturedByBlack = snap.capturedByBlack;
  capturedByWhite = snap.capturedByWhite;
  drawBoard();
  updateCaptures();
  // Highlight current move in list
  document.querySelectorAll('.move-item').forEach(function(el, i) {
    el.classList.toggle('current', i === idx);
  });
  const statusEl = document.getElementById('game-status-text');
  if (statusEl) statusEl.textContent = 'Replay — Coup ' + (idx+1) + '/' + boardSnapshots.length + ': ' + snap.label;
}

