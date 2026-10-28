/* ═══════════════════════════════════════════
   PAGE ARCHITECTURE — quatre cartes ecrites en HTML (v2.66)
   Demande d'Olivier : « la partie Architecture correspond toujours ? ».
   Non : verifiee pour la derniere fois en v2.39, elle ignorait la table de
   finale 4 contre 2 (branchee sur l'IA depuis la v2.49), les parties
   PlayStrategy et de reference, les statistiques des v2.63-v2.65, les liens
   ?defi= et ?pos=, PlayStrategy (qui passe par un serveur), et son lien vers
   la documentation menait a une page introuvable (le fichier vit dans docs-fr/
   et docs-en/). Ses schemas etaient des
   SVG de 640 px dont le texte tombait a ~7 px sur un telephone, et la suite
   de boites laissait croire que chaque reponse menait a la question suivante.
   Maintenant : du HTML qui passe a la ligne, chaque question de l'IA avec sa
   branche « oui », une version anglaise, et le lien vers docs-fr / docs-en.

   ATTENTION — CONTENU ECRIT A LA MAIN : contrairement a la Fiche pour IA
   (openSiteBriefing), qui compte tout a l'execution, ces cartes ne se
   deduisent pas du code. Verifiees contre le code en v2.66 (synchro ajoutee en v2.69). Les CHIFFRES sont
   regroupes dans ARCHI_CHIFFRES, et un test les compare aux donnees
   embarquees : une partie ou un probleme de plus, et le test demande la mise
   a jour. Le reste (l'ordre des questions de l'IA, les echanges) se relit a
   la main a chaque changement d'architecture, avec docs-fr/Architecture.fr.md
   et docs-en/Architecture.en.md.
═══════════════════════════════════════════ */
const ARCHI_CHIFFRES = {
  migs: 2589, ao: 1890, ps: 93, ref: 8,        // parties de chaque source (_sbBanques)
  empreintes: 427272,                           // positions mesurees : EMPREINTES_HISTORIQUES + EMPREINTES_COMPLEMENT
  dispositionsLivre: 13,                        // dispositions de l'arbre d'ouvertures (OPENING_TREES)
  puzzles: 138,                                 // PUZZLES
  historique: 200,                              // HIST_MAX
  positions4v2: 140575680, demiCoups4v2: 97     // tablebase/RESULTS.md
};
function _archiN(x){ return '<b class="archi-chiffre">' + _dimNb(x) + '</b>'; }
function _archiFleche(){ return '<div class="archi-fleche" aria-hidden="true">↓</div>'; }
// la branche d'une boite : a droite sur ordinateur (« oui → »), en retrait dessous sur telephone (« ↳ oui »)
function _archiBranche(mot, cible, classe){
  return '<div class="archi-branche"><div class="archi-oui"><span class="archi-etroit" aria-hidden="true">↳ </span>' + mot + '<span class="archi-large" aria-hidden="true"> →</span></div>'
    + '<div class="archi-boite ' + classe + '">' + cible + '</div></div>';
}
function _archiCarte(titre, note, corps){
  return '<section class="archi-carte"><h3 class="archi-titre">' + titre + '</h3>' + (note ? '<p class="archi-note">' + note + '</p>' : '') + corps + '</section>';
}

/* 1. Comment l'IA choisit son coup -- l'ordre de aiMove() */
function _archiCarteIA(){
  const etapes = [
    [_tr('Partie de Découverte arrivée à 4 billes contre 2, hors niveau 1 ?', 'A Discovery game down to 4 marbles against 2, not at level 1?'),
     _tr('Coup parfait, lu dans la table de finale 4 contre 2 : gagner au plus vite, sinon tenir la nulle, sinon résister le plus longtemps', 'Perfect move, read from the 4-against-2 endgame table: win as fast as possible, otherwise hold the draw, otherwise resist as long as possible')],
    [_tr('Le livre d’ouvertures suit-il encore la partie ?', 'Is the opening book still following the game?'),
     _tr('Coup tiré au sort parmi ceux des vraies parties, pondéré par fréquence × taux de victoire', 'A move drawn from those of real games, weighted by frequency × win rate')],
    [_tr('Moins de 20 coups joués, et la même position existe dans une vraie partie MIGS ou AbalOnline, vérifiée en la rejouant ?', 'Fewer than 20 moves played, and the same position exists in a real MIGS or AbalOnline game, checked by replaying it?'),
     _tr('Le coup joué ensuite dans cette partie', 'The move played next in that game')],
    [_tr('Moins de 16 coups, et le livre statique connaît la position (à défaut, celui appris au Labo IA) ?', 'Fewer than 16 moves, and the static book knows the position (failing that, the one learned in the AI Lab)?'),
     _tr('Coup du livre', 'Book move')],
    [_tr('Niveau 1 ?', 'Level 1?'),
     _tr('Un coup au hasard parmi les 4 premiers de la liste : éjections, puis poussées, puis déplacements', 'A random move among the first 4 of the list: ejections, then pushes, then plain moves')]
  ];
  let h = '<div class="archi-flux"><div class="archi-boite archi-depart">' + _tr('Tour de l’IA', 'The AI’s turn') + '</div>' + _archiFleche();
  etapes.forEach(function(e, i){
    h += '<div class="archi-etape">'
      + '<div class="archi-boite archi-q"><span class="archi-num">' + (i + 1) + '</span>' + e[0] + '</div>'
      + _archiBranche(_tr('oui', 'yes'), e[1], 'archi-r') + '</div>'
      + '<div class="archi-non"><span>' + _tr('non', 'no') + ' <span aria-hidden="true">↓</span></span></div>';
  });
  h += '<div class="archi-boite archi-c">' + _tr('Sinon : recherche alpha-bêta, avec les poids du style de l’IA (choisi, ou déduit de ta façon de jouer), répartie sur plusieurs cœurs si l’appareil en a',
                                                 'Otherwise: alpha-beta search, with the weights of the AI’s style (chosen, or deduced from how you play), spread over several cores if the device has them') + '</div></div>'
    + '<p class="archi-regle">' + _tr('Aux questions 2 à 4, jamais un coup qui revient en arrière (une position déjà vue, un aller-retour) ; au niveau 1, seulement s’il n’y a pas d’autre choix. Depuis la v2.60.',
                                      'For questions 2 to 4, never a move that goes backwards (a position already seen, a back-and-forth); at level 1, only when there is no other choice. Since v2.60.') + '</p>';
  return _archiCarte(_tr('Comment l’IA choisit son coup', 'How the AI picks its move'),
    _tr('Les questions sont posées dans l’ordre : dès qu’une réponse est oui, l’IA joue le coup trouvé ; sinon, elle passe à la suivante.', 'The questions are asked in order: as soon as an answer is yes, the AI plays the move found; otherwise it moves on to the next one.'), h);
}

/* 2. D'ou viennent les donnees */
function _archiCarteDonnees(){
  const C = ARCHI_CHIFFRES, total = C.migs + C.ao + C.ps + C.ref;
  const sources = [['MIGS', C.migs], ['AbalOnline', C.ao], [_tr('Tournoi PlayStrategy 2026', 'PlayStrategy tournament 2026'), C.ps], [_tr('Parties de référence', 'Reference games'), C.ref]];
  let h = '<div class="archi-puces">' + sources.map(function(s){ return '<div class="archi-boite">' + s[0] + '<br>' + _archiN(s[1]) + ' ' + _tr('parties', 'games') + '</div>'; }).join('') + '</div>'
    + _archiFleche()
    + '<div class="archi-boite archi-r archi-centre">' + _tr('Corpus : ' + _archiN(total) + ' parties réelles, embarquées dans le fichier', 'Corpus: ' + _archiN(total) + ' real games, embedded in the file') + '</div>'
    + _archiFleche();
  const usages = [
    [_tr('Livres d’ouvertures : l’arbre de ' + _archiN(C.dispositionsLivre) + ' dispositions et le livre statique, tirés des parties MIGS et AbalOnline', 'Opening books: the tree of ' + _archiN(C.dispositionsLivre) + ' layouts and the static book, drawn from the MIGS and AbalOnline games'),
     _tr('L’IA, questions 2 et 4', 'The AI, questions 2 and 4')],
    [_tr('Empreintes : ' + _archiN(C.empreintes) + ' positions mesurées sur 12 dimensions', 'Fingerprints: ' + _archiN(C.empreintes) + ' positions measured on 12 dimensions'),
     _tr('L’IA (question 3), l’analyse de partie, les 12 dimensions des Statistiques du jeu', 'The AI (question 3), game analysis, the 12 dimensions of Game statistics')],
    [_tr('Chaque partie rejouée coup par coup, hors ligne : billes tombées, sortes de coups, camps comparés', 'Every game replayed move by move, offline: marbles pushed off, kinds of moves, sides compared'),
     _tr('Statistiques du jeu, Mes statistiques, l’écran de fin de partie', 'Game statistics, My statistics, the end-of-game screen')],
    [_tr('Positions du Labo : des positions calmes avec le coup joué et le résultat, et des positions de départ pour les duels', 'Lab positions: quiet positions with the move played and the result, and starting positions for the duels'),
     _tr('Labo IA : duels, méthode Texel, comme les humains', 'AI Lab: duels, Texel method, like humans')],
    [_tr(_archiN(C.puzzles) + ' problèmes, chacun avec sa partie d’origine', _archiN(C.puzzles) + ' puzzles, each with the game it comes from'),
     _tr('Problèmes, Défi du jour', 'Puzzles, Daily puzzle')],
    [_tr('Les parties elles-mêmes', 'The games themselves'),
     _tr('Bibliothèque de parties : rejouer, filtrer', 'Game library: replay, filter')]
  ];
  h += '<div class="archi-usages">' + usages.map(function(u){
    return '<div class="archi-usage"><div class="archi-boite archi-c">' + u[0] + '</div>' + _archiBranche('', u[1], 'archi-dest') + '</div>';
  }).join('') + '</div>';
  return _archiCarte(_tr('D’où viennent les données', 'Where the data comes from'),
    _tr('Tout part des vraies parties embarquées dans le fichier : elles ne servent pas qu’à être consultées, elles nourrissent l’IA, l’analyse et les statistiques.', 'Everything starts from the real games embedded in the file: they are not only there to be browsed, they feed the AI, the analysis and the statistics.'), h);
}

/* 3. Les modes de jeu et les echanges */
function _archiCarteEchanges(){
  const modes = [_tr('Contre l’IA', 'Against the AI'), _tr('Deux joueurs, même appareil', 'Two players, same device'), _tr('Partie en direct, deux appareils 🧪', 'Live game, two devices 🧪'), _tr('Découverte : 7 billes par camp', 'Discovery: 7 marbles a side')];
  const libres = [
    _tr('Code de partie : un texte à copier-coller', 'Game code: a text to copy and paste'),
    _tr('Liens : <code>?partie=</code> une partie, <code>?pos=</code> une position, <code>?defi=</code> un défi', 'Links: <code>?partie=</code> a game, <code>?pos=</code> a position, <code>?defi=</code> a puzzle of the day'),
    _tr('Image à partager, dessinée sur l’appareil', 'Image to share, drawn on the device'),
    _tr('Export et import Aba-Pro, import APGN : les formats de la communauté', 'Aba-Pro export and import, APGN import: the community formats'),
    _tr('Fichier de parties envoyé vers le site (Android : Partager ; ordinateur : Ouvrir avec)', 'Games file sent to the site (Android: Share; computer: Open with)'),
    _tr('Historique local : ' + _archiN(ARCHI_CHIFFRES.historique) + ' parties, rejouables, exportables en fichier', 'Local history: ' + _archiN(ARCHI_CHIFFRES.historique) + ' games, replayable, exportable as a file'),
    _tr('Duel contre un moteur externe : coups relayés à la main', 'Duel against an outside engine: moves relayed by hand'),
    _tr('Synchroniser mes appareils par fichier : historique et progression fusionnés, rien compté deux fois', 'Sync my devices with a file: history and progress merged, nothing counted twice')
  ];
  let h = '<div class="archi-puces">' + modes.map(function(m){ return '<div class="archi-boite">' + m + '</div>'; }).join('') + '</div>'
    + _archiFleche()
    + '<div class="archi-boite archi-r archi-centre">' + _tr('Partie en cours', 'Game in progress') + '</div>'
    + _archiFleche()
    + '<div class="archi-groupe"><div class="archi-groupe-titre">' + _tr('Sans aucun serveur', 'Without any server') + '</div>'
    + '<div class="archi-liste">' + libres.map(function(t){ return '<div class="archi-boite archi-c">' + t + '</div>'; }).join('') + '</div></div>'
    + '<div class="archi-groupe"><div class="archi-groupe-titre">' + _tr('Partie en direct', 'Live game') + '</div>'
    + '<div class="archi-boite archi-c">' + _tr('Connexion directe entre les deux navigateurs (WebRTC). Les codes de connexion s’échangent à la main ; un serveur public (STUN) aide seulement les deux appareils à se trouver. La synchro en direct de tes appareils passe par le même chemin.',
                                               'Direct connection between the two browsers (WebRTC). The connection codes are exchanged by hand; a public server (STUN) only helps the two devices find each other. Syncing your devices live takes the same path.') + '</div></div>'
    + '<div class="archi-groupe"><div class="archi-groupe-titre">' + _tr('Avec un serveur extérieur, en lecture seule', 'With an outside server, read-only') + '</div>'
    + '<div class="archi-boite archi-ext">' + _tr('PlayStrategy : suivre une partie en direct, voir les tournois, en importer un. Le site lit les parties, il n’envoie rien d’autre qu’un pseudo ou un lien.',
                                                 'PlayStrategy: follow a game live, see the tournaments, import one. The site reads the games; it sends nothing but a username or a link.') + '</div></div>';
  return _archiCarte(_tr('Les modes de jeu et les échanges', 'Game modes and exchanges'),
    _tr('Le site n’a pas de serveur de jeu : une partie se transmet par un texte, une adresse, une image ou un fichier, que tu envoies toi-même.', 'The site has no game server: a game travels as a text, an address, an image or a file, which you send yourself.'), h);
}

/* 4. Les tables de finale */
function _archiCarteTables(){
  const C = ARCHI_CHIFFRES;
  const lignes = [
    [_tr('2 contre 2 et 3 contre 2', '2 against 2 and 3 against 2'),
     _tr('99,9 % de nulles. Elles servent en Découverte, sur la page Tables de finale et au trainer « Finale prouvée » (des positions où le gain est démontré, pas estimé).', '99.9 % draws. They are used in Discovery, on the Endgame tables page and by the “Proven endgame” trainer (positions where the win is proven, not estimated).')],
    [_tr('4 contre 2', '4 against 2'),
     _tr('Résolue et prouvée en v2.49 : ' + _archiN(C.positions4v2) + ' positions, toutes recontrôlées. Avec le trait, le camp fort gagne toujours, en ' + C.demiCoups4v2 + ' demi-coups au plus. En Découverte, l’IA y joue parfaitement (question 1) et le verdict s’affiche. La table est chargée par morceaux depuis le site, au besoin, chacun vérifié ; sans réseau, l’IA habituelle prend le relais.',
         'Solved and proven in v2.49: ' + _archiN(C.positions4v2) + ' positions, all re-checked. With the move, the strong side always wins, in ' + C.demiCoups4v2 + ' plies at most. In Discovery, the AI plays it perfectly (question 1) and the verdict is shown. The table is loaded piece by piece from the site when needed, each piece checked; without a network, the usual AI takes over.')],
    [_tr('3 contre 3 et au-delà', '3 against 3 and beyond'),
     _tr('3 contre 3 a été calculée : 2 positions gagnantes sur 224 millions, elle n’est donc pas mise en ligne. Les tables plus grandes sont hors de portée d’un site en un seul fichier.', '3 against 3 was computed: 2 winning positions out of 224 million, so it is not put online. Larger tables are out of reach for a single-file site.')]
  ];
  const h = '<div class="archi-tables">' + lignes.map(function(l){ return '<div class="archi-table"><div class="archi-table-nom">' + l[0] + '</div><div class="archi-table-txt">' + l[1] + '</div></div>'; }).join('') + '</div>';
  return _archiCarte(_tr('Les tables de finale', 'Endgame tables'),
    _tr('Une partie normale (14 billes par camp) n’arrive jamais à ces finales : elle s’arrête dès qu’un camp a perdu 6 billes. Elles servent au mode Découverte, où l’on joue avec 7 billes.', 'A normal game (14 marbles a side) never reaches these endgames: it stops as soon as one side has lost 6 marbles. They serve the Discovery mode, played with 7 marbles.'), h);
}

function renderArchiPage(){
  const host = document.getElementById('archi-diagrams');
  if (!host) return;
  const lien = currentLang() === 'EN'
    ? '<a href="https://github.com/ocj94/Abalassembly/blob/main/docs-en/Architecture.en.md" target="_blank" rel="noopener noreferrer">docs-en/Architecture.en.md</a>'
    : '<a href="https://github.com/ocj94/Abalassembly/blob/main/docs-fr/Architecture.fr.md" target="_blank" rel="noopener noreferrer">docs-fr/Architecture.fr.md</a>';
  host.innerHTML = '<p class="archi-intro">' + _tr('Quatre cartes pour comprendre le fonctionnement interne, vérifiées contre le code en v2.66. Version détaillée, avec les schémas : ' + lien + ' sur le dépôt.',
                                                  'Four cards to understand how it works inside, checked against the code in v2.66. Detailed version, with the diagrams: ' + lien + ' in the repository.') + '</p>'
    + _archiCarteIA() + _archiCarteDonnees() + _archiCarteEchanges() + _archiCarteTables();
}

/* ═══ REFLEXION DE L'IA : PROFONDEUR ATTEINTE SELON LE TEMPS ═══
   Demande d'Olivier, en deux volets :
   1. RELEVE EN PARTIE -- chaque coup de l'IA contre toi est note (niveau, temps
      regle, temps reel, profondeur atteinte, positions examinees, phase) ;
      statistiques cumulees par niveau. Les tournois (reglages a part) ne sont
      pas comptes.
   2. MESURE SUR LE CORPUS -- 6 positions tirees de vraies parties MIGS (2 en
      ouverture, 2 en milieu, 2 en finale), l'IA reflechit 0,5 / 1 / 2,5 / 5 /
      10 s sur chacune, sur CET appareil, style equilibre, par les memes fils de
      calcul qu'en partie. Le tirage depend du contenu du corpus. */
const STATS_REFLEXION_KEY = 'abaStatsReflexion', MESURE_CORPUS_KEY = 'abaMesureCorpus';
const MESURE_BUDGETS_S = [0.5, 1, 2.5, 5, 10];
function _phaseJeu(plateau, ply) {
  let n = 0; for (const k in plateau) if (plateau[k]) n++;
  return n <= 22 ? 'finale' : (ply < 20 ? 'ouverture' : 'milieu');   // 22 billes : 6 ejections au total
}
function _releverReflexion(m, config) {
  if (!m || typeof m.depth !== 'number') return;
  if ((typeof _tourneyMatch !== 'undefined' && _tourneyMatch) || (typeof GameMode !== 'undefined' && GameMode.get() !== 'ai')) return;
  let l = []; try { l = JSON.parse(localStorage.getItem(STATS_REFLEXION_KEY) || '[]'); } catch (e) {}
  l.push({ n: _niveauIA() || 0, b: config ? config.time : 0, t: m.time || 0, p: m.depth, k: m.nodes || 0,
           ph: _phaseJeu(board, (typeof MoveCount !== 'undefined') ? MoveCount.get() : 0), d: Date.now() });
  if (l.length > 3000) l = l.slice(-3000);
  try { localStorage.setItem(STATS_REFLEXION_KEY, JSON.stringify(l)); } catch (e) {}
}
const _mediane = function(v){ if (!v.length) return 0; const s = v.slice().sort(function(a,b){ return a - b; }), i = s.length >> 1; return s.length % 2 ? s[i] : (s[i-1] + s[i]) / 2; };
function _statsReflexionResume(l) {
  const par = {};
  (l || []).forEach(function(e){ (par[e.n] = par[e.n] || []).push(e); });
  return Object.keys(par).map(Number).sort(function(a,b){ return a - b; }).map(function(n){
    const v = par[n], t = v.map(function(e){ return e.t; }), p = v.map(function(e){ return e.p; });
    const noeuds = v.reduce(function(a,e){ return a + e.k; }, 0), ms = v.reduce(function(a,e){ return a + e.t; }, 0);
    return { niveau: n, coups: v.length, tempsMed: _mediane(t), profMed: _mediane(p), profMax: Math.max.apply(null, p), parSeconde: ms ? Math.round(noeuds / ms * 1000) : 0 };
  });
}
/* Position d'une partie MIGS (Marguerite belge) apres `ply` demi-coups, rejouee hors
   de la partie en cours (plateau et compteurs sauvegardes puis restaures). */
function _positionMigs(i, ply) {
  const g = (typeof MIGS_GAMES !== 'undefined') ? MIGS_GAMES[i] : null; if (!g) return null;
  const jetons = String(g[5] || '').replace(/\d+\./g, ' ').trim().split(/\s+/).filter(Boolean);
  if (jetons.length < ply) return null;
  const sauve = { b: board, cb: CapturedByBlack.get(), cw: CapturedByWhite.get(), go: GameOver.get() };
  try {
    board = {}; LAYOUTS.belgian.black.forEach(function(p){ board[p[0] + ',' + p[1]] = 'black'; }); LAYOUTS.belgian.white.forEach(function(p){ board[p[0] + ',' + p[1]] = 'white'; });
    CapturedByBlack.set(0); CapturedByWhite.set(0); GameOver.set(false);
    let col = 'black';
    for (let k = 0; k < ply; k++) {
      const mv = resolveAbaProToken(jetons[k], col); if (!mv) return null;
      const info = validateMove(mv.cells, mv.dir, col); if (!info || !info.valid) return null;
      applyMove({ cells: mv.cells, dir: mv.dir, info: info }, col);
      if (CapturedByBlack.get() >= 6 || CapturedByWhite.get() >= 6) return null;
      col = col === 'black' ? 'white' : 'black';
    }
    return { board: JSON.parse(JSON.stringify(board)), cB: CapturedByBlack.get(), cW: CapturedByWhite.get(), couleur: col, partie: i, ply: ply, longueur: jetons.length };
  } catch (e) { return null; }
  finally { board = sauve.b; CapturedByBlack.set(sauve.cb); CapturedByWhite.set(sauve.cw); GameOver.set(sauve.go); }
}
// 2 positions par phase, tirage determine par le contenu du corpus
function _positionsMesure() {
  const N = (typeof MIGS_GAMES !== 'undefined') ? MIGS_GAMES.length : 0, out = { ouverture: [], milieu: [], finale: [] };
  let graine = N * 2654435761 % 4294967296;
  const hasard = function(){ graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
  for (let essai = 0; essai < 400 && (out.ouverture.length < 2 || out.milieu.length < 2 || out.finale.length < 2); essai++) {
    const i = Math.floor(hasard() * N), g = MIGS_GAMES[i]; if (!g) continue;
    const L = String(g[5] || '').replace(/\d+\./g, ' ').trim().split(/\s+/).filter(Boolean).length;
    if (out.ouverture.length < 2 && L > 30) { const p = _positionMigs(i, 12); if (p) { out.ouverture.push(p); continue; } }
    if (out.milieu.length < 2 && L > 80) { const p = _positionMigs(i, Math.round(L * 0.45)); if (p && _phaseJeu(p.board, p.ply) === 'milieu') { out.milieu.push(p); continue; } }
    if (out.finale.length < 2 && L > 60) { const p = _positionMigs(i, L - 4); if (p && _phaseJeu(p.board, p.ply) === 'finale') out.finale.push(p); }
  }
  return out;
}
// Une recherche limitee en temps, par les fils de calcul du jeu ; renvoie ses mesures
function _rechercheMesuree(pos, ms) {
  return new Promise(function(fin){
    const params = { board: pos.board, capturedByWhite: pos.cW, capturedByBlack: pos.cB, color: pos.couleur, depth: 40, time: ms,
                     weights: AI_WEIGHT_PRESETS.balanced, hist: [], engineMode: false };
    if (typeof requestAIMovePooled === 'function' && requestAIMovePooled(params, function(mv, m){ fin(m || null); })) return;
    const w = (typeof getAIWorker === 'function') ? getAIWorker() : null;
    if (!w) { fin(null); return; }
    const sur = function(e){ w.removeEventListener('message', sur); fin(e.data && e.data.metrics ? e.data.metrics : null); };
    w.addEventListener('message', sur); w.postMessage(params);
  });
}
let _mesureEnCours = null, _mesureRechercheActive = null;
async function mesurerProfondeurCorpus(opts) {
  opts = opts || {};
  const chercher = opts.chercher || _rechercheMesuree, progres = opts.progres || function(){};
  if (typeof ensureGameBanks === 'function') await ensureGameBanks();
  const pos = _positionsMesure(), lignes = [];
  const liste = [].concat(pos.ouverture.map(function(p){ return ['ouverture', p]; }), pos.milieu.map(function(p){ return ['milieu', p]; }), pos.finale.map(function(p){ return ['finale', p]; }));
  const jeton = {}; _mesureEnCours = jeton;
  let fait = 0; const total = liste.length * MESURE_BUDGETS_S.length;
  for (const [phase, p] of liste) for (const s of MESURE_BUDGETS_S) {
    if (_mesureEnCours !== jeton) return null;                  // annulee
    progres(fait, total, phase, s);
    _mesureRechercheActive = chercher(p, Math.round(s * 1000));
    const m = await _mesureRechercheActive; _mesureRechercheActive = null;
    if (m) lignes.push({ ph: phase, s: s, p: m.depth || 0, k: m.nodes || 0, t: m.time || 0 });
    fait++;
  }
  _mesureEnCours = null;
  const res = { date: Date.now(), corpus: (typeof MIGS_GAMES !== 'undefined') ? MIGS_GAMES.length : 0,
                fils: (typeof detectAIWorkerCount === 'function') ? detectAIWorkerCount() : 1, positions: liste.length, lignes: lignes };
  try { localStorage.setItem(MESURE_CORPUS_KEY, JSON.stringify(res)); } catch (e) {}
  return res;
}
function _tableauMesure(res) {
  if (!res || !res.lignes || !res.lignes.length) return '<div style="font-size:12px;color:var(--muted)">' + _tr('Pas encore de mesure sur cet appareil.', 'No measurement on this device yet.') + '</div>';
  const cell = function(s, ph){ const v = res.lignes.filter(function(l){ return l.s === s && (!ph || l.ph === ph); }).map(function(l){ return l.p; }); return v.length ? _dimDec(_mediane(v), 1).replace(/[.,]0$/, '') : '—'; };
  const vitesse = function(s){ const v = res.lignes.filter(function(l){ return l.s === s; }); const k = v.reduce(function(a,l){ return a + l.k; }, 0), t = v.reduce(function(a,l){ return a + l.t; }, 0); return t ? _dimNb(Math.round(k / t * 1000)) : '—'; };
  let h = '<table style="width:100%;font-size:12px;border-collapse:collapse"><tr style="color:var(--muted);text-align:left"><th>' + _tr('Temps', 'Time') + '</th><th>' + _tr('Ouverture', 'Opening') + '</th><th>' + _tr('Milieu', 'Middlegame') + '</th><th>' + _tr('Finale', 'Endgame') + '</th><th>Positions/s</th></tr>';
  MESURE_BUDGETS_S.forEach(function(s){ h += '<tr><td>' + _dimDec(s, 1).replace(/[.,]0$/, '') + ' s</td><td>' + cell(s, 'ouverture') + '</td><td>' + cell(s, 'milieu') + '</td><td>' + cell(s, 'finale') + '</td><td>' + vitesse(s) + '</td></tr>'; });
  const quand = new Date(res.date).toLocaleDateString(currentLang() === 'EN' ? 'en-GB' : 'fr-FR');
  return h + '</table><div style="font-size:11px;color:var(--muted);margin-top:6px">' + _tr(
      'Profondeur médiane atteinte (demi-coups), sur ' + res.positions + ' positions de vraies parties ; mesuré le ' + quand + ' sur cet appareil (' + res.fils + ' fil' + (res.fils > 1 ? 's' : '') + ' de calcul), corpus MIGS de ' + _dimNb(res.corpus) + ' parties.',
      'Median depth reached (plies), over ' + res.positions + ' positions from real games; measured on ' + quand + ' on this device (' + res.fils + ' thread' + (res.fils > 1 ? 's' : '') + '), MIGS corpus of ' + _dimNb(res.corpus) + ' games.') + '</div>';
}
function renderReflexionStats() {
  const host = document.getElementById('reflexion-stats-body'); if (!host) return;
  let l = []; try { l = JSON.parse(localStorage.getItem(STATS_REFLEXION_KEY) || '[]'); } catch (e) {}
  let mesure = null; try { mesure = JSON.parse(localStorage.getItem(MESURE_CORPUS_KEY) || 'null'); } catch (e) {}
  const r = _statsReflexionResume(l), fmt = function(ms){ return ms >= 1000 ? _dimDec(ms / 1000, 1) + ' s' : Math.round(ms) + ' ms'; };
  let h = '<div style="font-size:13px;font-weight:700;color:var(--white);text-transform:uppercase;letter-spacing:1px;margin:28px 0 10px">' + _tr('Réflexion de l\u2019IA : profondeur selon le temps', 'AI thinking: depth by time') + '</div>';
  h += '<div style="font-size:12px;color:var(--white);margin:6px 0">' + _tr('Mesurée sur des positions du corpus', 'Measured on corpus positions') + '</div>' + _tableauMesure(mesure);
  h += '<div style="margin:8px 0 18px"><button class="ctrl-btn" id="mesure-btn" onclick="lancerMesureCorpus()" style="width:auto;padding:6px 12px;font-size:12px">' + (mesure ? _tr('Refaire la mesure', 'Measure again') : _tr('Lancer la mesure', 'Start the measurement')) + ' (≈ 2 min)</button> <span id="mesure-progres" style="font-size:11px;color:var(--muted)"></span></div>';
  h += '<div style="font-size:12px;color:var(--white);margin:6px 0">' + _tr('Relevée pendant tes parties contre l\u2019IA', 'Recorded during your games against the AI') + '</div>';
  if (!r.length) h += '<div style="font-size:12px;color:var(--muted)">' + _tr('Aucun coup relevé pour l\u2019instant : joue contre l\u2019IA, ses coups seront notés ici.', 'No move recorded yet: play against the AI and its moves will be logged here.') + '</div>';
  else {
    h += '<table style="width:100%;font-size:12px;border-collapse:collapse"><tr style="color:var(--muted);text-align:left"><th>' + _tr('Niveau', 'Level') + '</th><th>' + _tr('Coups', 'Moves') + '</th><th>' + _tr('Temps médian', 'Median time') + '</th><th>' + _tr('Profondeur médiane (max)', 'Median depth (max)') + '</th><th>Positions/s</th></tr>';
    r.forEach(function(x){ h += '<tr><td>' + x.niveau + '</td><td>' + _dimNb(x.coups) + '</td><td>' + fmt(x.tempsMed) + '</td><td>' + _dimDec(x.profMed, 1).replace(/[.,]0$/, '') + ' (' + x.profMax + ')</td><td>' + _dimNb(x.parSeconde) + '</td></tr>'; });
    h += '</table><div style="font-size:11px;color:var(--muted);margin-top:6px">' + _tr(_dimNb(l.length) + ' coups relevés (les 3 000 derniers sont gardés).', _dimNb(l.length) + ' moves recorded (the last 3,000 are kept).') + ' <a href="#" onclick="if(confirm(_tr(\'Effacer les coups relevés ?\',\'Delete the recorded moves?\'))){localStorage.removeItem(STATS_REFLEXION_KEY);renderReflexionStats();}return false;" style="color:var(--muted)">' + _tr('Effacer', 'Delete') + '</a></div>';
  }
  host.innerHTML = h;
}
async function lancerMesureCorpus() {
  const btn = document.getElementById('mesure-btn'), pr = document.getElementById('mesure-progres');
  if (_mesureEnCours) { _mesureEnCours = null; if (pr) pr.textContent = _tr('Mesure annulée.', 'Measurement cancelled.'); if (btn) btn.textContent = _tr('Lancer la mesure', 'Start the measurement') + ' (≈ 2 min)'; return; }
  if (_iaReflechit) { if (pr) pr.textContent = _tr('L\u2019IA réfléchit dans ta partie : relance la mesure après son coup.', 'The AI is thinking in your game: start the measurement again after its move.'); return; }
  if (btn) btn.textContent = _tr('Annuler la mesure', 'Cancel the measurement');
  const PHASE_EN = { ouverture: 'opening', milieu: 'middlegame', finale: 'endgame' };
  const res = await mesurerProfondeurCorpus({ progres: function(f, t, ph, s){ if (pr) pr.textContent = _tr('Mesure ', 'Measurement ') + (f + 1) + '/' + t + ' — ' + _tr(ph, PHASE_EN[ph] || ph) + ', ' + _dimDec(s, 1).replace(/[.,]0$/, '') + ' s…'; } });
  if (res) renderReflexionStats();
}

/* Les types de fin du corpus MIGS sont des libelles francais enregistres tels quels (« Au score »
   = 6 billes ejectees) ; en anglais, leur traduction. Une valeur inconnue s'affiche telle quelle. */
const FINS_MIGS_EN = { 'Au score': 'Six marbles off', 'Abandon': 'Resigned', 'Déco': 'Disconnected', 'Au temps': 'On time', 'Match nul': 'Draw' };
function _nomFinMigs(k){ return currentLang() === 'EN' && FINS_MIGS_EN[k] ? FINS_MIGS_EN[k] : k; }
// nom d'une disposition du corpus (cles AbalOnline, du site ou des parties de reference), dans la langue du site
function _nomVarianteCorpus(d){
  if (typeof _sbNomDispo === 'function') return _sbNomDispo(d);
  return (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[d]) ? HEAT_VARIANT_LABEL[d] : d;
}
// v2.77 : les doublons exacts, dits une fois en tete de page
function _corpusPhraseDoublons(s, langue){
  const n = s.nDoublons, ao = s.nDoublonsAO === n;
  return langue === 'EN'
    ? n + ' exact duplicate' + (n > 1 ? 's' : '') + (ao ? ' in AbalOnline' : '') + ' (the same game recorded twice) count' + (n > 1 ? '' : 's') + ' only once: ' + _dimNb(s.totalGames - n) + ' distinct games.'
    : n + ' doublon' + (n > 1 ? 's' : '') + ' exact' + (n > 1 ? 's' : '') + (ao ? ' d’AbalOnline' : '') + ' (la même partie enregistrée deux fois) ne compte' + (n > 1 ? 'nt' : '') + ' qu’une fois : ' + _dimNb(s.totalGames - n) + ' parties distinctes.';
}
async function renderCorpusStatsPage(){
  if (typeof renderReflexionStats === 'function') renderReflexionStats();
  const host = document.getElementById('corpus-stats-body');
  if (!host) return;
  /* Les 12 dimensions n'attendent pas le reste : le premier calcul des
     vainqueurs MIGS prend plus d'une minute, leur carte s'affiche avant. */
  /* v2.63 : les billes qui tombent (apres « qui gagne, duree, fins de partie »), puis les
     variantes, ce qui fait gagner (juste apres les 12 dimensions), comment jouent les vrais
     joueurs (a la fin). Hotes poses ici, remplis par 39-statistiques-billes.js sans attendre. */
  // v2.72 : les filtres et le resume en tete ; gagner selon l'avance, premiers coups, ou sont les billes apres les billes qui tombent (48-corpus-plus.js)
  host.innerHTML = '<div id="corpus-filtres"></div><div id="corpus-resume"></div>'
    + '<div id="corpus-autres"><div style="font-size:13px;color:var(--muted);margin-bottom:16px" id="corpus-progress">' + _tr('Calcul en cours (première fois seulement — mis en cache ensuite)…', 'Computing (first time only — cached afterwards)…') + '</div></div>'
    + '<div id="corpus-trait"></div><div id="corpus-annees"></div>'   // v2.81 : apres l'avantage du premier joueur (dans corpus-autres)
    + '<div id="billes-section"></div><div id="corpus-tempsmorts"></div><div id="corpus-avance"></div><div id="corpus-explorateur"></div><div id="corpus-ouvertures"></div><div id="corpus-explorateur-ouv"></div><div id="corpus-sortie"></div><div id="corpus-dejavues"></div><div id="corpus-occupation"></div><div id="corpus-variantes"></div>'
    + '<div id="dims-carte">' + _carteStats(_tr('Les 12 dimensions, mesurées sur tout le corpus', 'The 12 dimensions, measured over the whole corpus'),
      '<div style="font-size:12px;color:var(--muted)">' + _tr('Chargement des positions mesurées…', 'Loading the measured positions…') + '</div>') + '</div>'
    + '<div id="gagner-section"></div><div id="dims-corr"></div><div id="jeu-section"></div><div id="corpus-premieres"></div><div id="corpus-repetitions"></div><div id="corpus-branchement"></div><div id="corpus-seules"></div><div id="corpus-contacts"></div><div id="corpus-avantperte"></div><div id="corpus-qualite"></div><div id="corpus-critiques"></div>';   // v2.84 : les positions critiques
  if (typeof _sbRendreCorpus === 'function') _sbRendreCorpus().catch(function(e){ console.warn('billes qui tombent :', e); });
  if (typeof corpusPlusRendre === 'function') corpusPlusRendre().catch(function(e){ console.warn('filtres du corpus :', e); });
  /* Les dimensions d'abord (moins d'une seconde une fois les positions chargees),
     PUIS le reste : le rejeu des parties MIGS rend la main au navigateur par
     paquets de 40 parties, et chaque etape des dimensions attendait derriere
     (mesure : 23 s avant d'afficher la carte). 4 s au plus, puis le reste demarre. */
  const dimsPret = _dimsPreparer().catch(function(e){ console.warn('12 dimensions :', e); });   // jamais bloquant pour le reste
  await Promise.race([dimsPret, new Promise(function(r){ setTimeout(r, 4000); })]);
  const autres = document.getElementById('corpus-autres') || host;

  const s = await computeCorpusStats(function(done, total){
    const el = document.getElementById('corpus-progress');
    if (el) el.textContent = _tr('Calcul en cours (première fois seulement) — ' + done + '/' + total + ' parties rejouées…', 'Computing (first time only) — ' + done + '/' + total + ' games replayed…');
  });
  if (!host.isConnected) return;
  if (!s) { autres.innerHTML = '<div style="font-size:13px;color:var(--muted);margin-bottom:16px">' + _tr('Bibliothèque de parties pas encore chargée — réessaie dans un instant.', 'Game library not loaded yet — try again in a moment.') + '</div>'; return; }

  function card(title, body, note){
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin-bottom:16px">'
      + '<div style="font-size:13px;font-weight:700;color:var(--white);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">'+title+'</div>'
      + body
      + (note ? '<div style="font-size:11px;color:var(--muted);margin-top:10px">'+note+'</div>' : '')
      + '</div>';
  }
  function ligne(label, val){
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">'
      + '<span style="color:var(--text)">'+label+'</span><span style="font-weight:700;color:var(--gold)">'+val+'</span></div>';
  }

  // Le titre suit le vrai total au lieu d'un nombre ecrit en dur.
  const titre = document.getElementById('corpus-stats-titre');
  // v2.77 : les parties distinctes (un doublon exact ne compte qu'une fois)
  const distinctes = s.totalGames - (s.nDoublons || 0);
  if (titre) titre.textContent = _tr('Ce que disent ' + _dimNb(distinctes) + ' vraies parties', 'What ' + _dimNb(distinctes) + ' real games say');

  /* v2.74 : tout le texte de ces cartes en francais ou en anglais (signale par Olivier : en
     anglais, la page restait en francais). Nombres a la mode de la langue (_dimNb, _dimDec). */
  const nb = _dimNb, pc = function(p){ return p != null ? _dimDec(p, 1) + ' %' : '—'; };
  const avantage = (s.blackPct != null) ? _dimDec(s.blackPct - 50, 1) : null;
  let html = '';
  html += '<div style="font-size:12px;color:var(--muted);margin-bottom:16px;line-height:1.6">' + _tr(
      'Sources : MIGS (' + nb(s.nMigs) + ' parties), AbalOnline (' + nb(s.nAo) + ')'
      + (s.nPs ? ', Yearly Abalone Arena de PlayStrategy (' + s.nPs + (s.nPsSansCoup ? ', dont ' + s.nPsSansCoup + ' abandonnées avant le premier coup' : '') + ')' : '') + (s.nRef ? ', parties de référence des variantes (' + s.nRef + ')' : '') + '. Toutes les parties comptent, même abandonnées.'
      + (s.nPs ? ' Le livre d’ouvertures reste calculé sur MIGS et AbalOnline (précalculé hors ligne).' : '')
      + (s.nDoublons ? ' ' + _corpusPhraseDoublons(s, 'FR') : ''),
      'Sources: MIGS (' + nb(s.nMigs) + ' games), AbalOnline (' + nb(s.nAo) + ')'
      + (s.nPs ? ', PlayStrategy’s Yearly Abalone Arena (' + s.nPs + (s.nPsSansCoup ? ', including ' + s.nPsSansCoup + ' resigned before the first move' : '') + ')' : '') + (s.nRef ? ', reference games of the variants (' + s.nRef + ')' : '') + '. Every game counts, even resigned ones.'
      + (s.nPs ? ' The opening book is still computed on MIGS and AbalOnline (precomputed offline).' : '')
      + (s.nDoublons ? ' ' + _corpusPhraseDoublons(s, 'EN') : '')) + '</div>';

  const camp = function(nom, pct, n){
    return '<div style="flex:1;text-align:center"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">' + nom + '</div>'
      + '<div style="font-size:26px;font-weight:800;color:var(--text);font-family:\'DM Mono\',monospace">' + pc(pct) + '</div>'
      + '<div style="font-size:11px;color:var(--muted)">' + nb(n) + ' ' + _tr('victoires', 'wins') + '</div></div>';
  };
  html += card(_tr('L’avantage du premier joueur', 'The first player’s advantage'),
    '<div style="display:flex;gap:10px;margin-bottom:8px">' + camp(_tr('Noir (commence)', 'Black (moves first)'), s.blackPct, s.black) + camp(_tr('Blanc', 'White'), s.whitePct, s.white) + '</div>'
    // l'ecart a 50 %, pas l'ecart entre les deux camps (qui est le double) : « plus souvent que l'autre » le laissait croire
    + (avantage != null ? '<div style="font-size:12px;color:var(--text)">' + _tr('Celui qui commence gagne <strong style="color:var(--gold)">' + avantage + ' points de pourcentage</strong> de plus qu’un partage égal (50 %).',
                                                                              'The side that moves first wins <strong style="color:var(--gold)">' + avantage + ' percentage points</strong> more than an even split (50 %).') + '</div>' : ''),
    _tr('Sur ' + nb(s.decided) + ' parties dont le vainqueur est connu avec certitude. Les parties MIGS terminées par abandon ou fin de temps sont exclues : impossible de savoir qui a abandonné depuis les seules données.' + (s.nPs ? ' Les ' + s.nPs + ' parties du tournoi PlayStrategy comptent avec le résultat enregistré par le serveur, abandons compris.' : ''),
        'Over ' + nb(s.decided) + ' games whose winner is known for certain. MIGS games that ended by resignation or on time are left out: the data alone cannot tell who resigned.' + (s.nPs ? ' The ' + s.nPs + ' games of the PlayStrategy tournament count with the result recorded by the server, resignations included.' : '')));

  const coups = function(n){ return n == null ? '—' : (typeof n === 'number' && n % 1 ? _dimDec(n, 1) : nb(n)) + ' ' + _tr('coups', 'moves'); };
  html += card(_tr('Durée d’une partie', 'Length of a game'),
    ligne(_tr('Médiane', 'Median'), coups(s.lenMedian))
    + ligne(_tr('Moyenne', 'Mean'), coups(s.lenMean))
    + ligne(_tr('La plus courte', 'Shortest'), coups(s.lenMin))
    + ligne(_tr('La plus longue', 'Longest'), coups(s.lenMax)),
    _tr('Mesuré sur les ' + nb(s.nLens) + ' parties MIGS' + (s.nPs ? ', PlayStrategy' : '') + (s.nRef ? ' et de référence' : '') + ' (notation complète disponible). La médiane est plus représentative que la moyenne, tirée vers le haut par quelques parties très longues.',
        'Measured over the ' + nb(s.nLens) + ' MIGS' + (s.nPs ? ', PlayStrategy' : '') + (s.nRef ? ' and reference' : '') + ' games (full notation available). The median is more representative than the mean, which a few very long games pull upwards.'));

  const totalEnd = Object.values(s.endTypes).reduce(function(a,c){return a+c;},0);
  html += card(_tr('Comment se terminent les parties', 'How games end'),
    Object.entries(s.endTypes).sort(function(a,b){return b[1]-a[1];}).map(function(e){
      return ligne(_nomFinMigs(e[0]), nb(e[1]) + ' (' + Math.round(e[1]/totalEnd*100) + ' %)');
    }).join(''),
    _tr('Champ enregistré directement dans le corpus MIGS, pas déduit.', 'Field recorded directly in the MIGS corpus, not inferred.'));

  // v2.63 : apres les billes qui tombent, dans son propre hote
  let htmlVariantes = card(_tr('Variantes les plus jouées', 'Most played variants'),
    s.topVariants.map(function(v){
      return ligne(_nomVarianteCorpus(v[0]), nb(v[1]) + ' ' + _tr('parties', 'games'));
    }).join(''),
    _tr(s.nVariants + ' variantes distinctes recensées dans le corpus AbalOnline (' + nb(s.nAo) + ' parties)' + (s.nPs ? ', plus le Belgian Daisy du tournoi PlayStrategy (' + s.nPs + ' parties)' : '') + '.',
        s.nVariants + ' distinct variants recorded in the AbalOnline corpus (' + nb(s.nAo) + ' games)' + (s.nPs ? ', plus the Belgian Daisy of the PlayStrategy tournament (' + s.nPs + ' games)' : '') + '.'));

  // Les 12 dimensions et leur redondance suivent, dans leurs propres cartes (v2.59, voir _dimsPreparer)
  autres.innerHTML = html;
  const hv = document.getElementById('corpus-variantes');
  if (hv) hv.innerHTML = htmlVariantes; else autres.innerHTML += htmlVariantes;
}

/* ═══════════════════════════════════════════
   LES 12 DIMENSIONS : EXPLICATION ET GRAPHIQUES (v2.59)
   Demande d'Olivier : mettre dans la page le dessin qui explique les centiles,
   un graphique pour les deux camps ensemble, un pour les Noirs, un pour les
   Blancs, toujours accordes au nombre de parties. Tout est calcule ici, a
   l'ouverture de la page, a partir des positions chargees (banque principale
   + complement) : aucun chiffre ecrit a la main. Si des parties de la page
   n'ont pas encore leurs mesures, la carte le dit et donne leur nombre.
   Sur un ecran etroit (telephone), le dessin a sa propre mise en page :
   reduit tel quel, son texte tombait a 6 pixels.
═══════════════════════════════════════════ */
let _dimChamp = 'coeurRatio', _dimVueTable = 'tous', _dimValeur = null, _dimL = null, _dimEtroitRendu = null;
const _DIM_VUES = ['tous', 'black', 'white'];
const _DIM_COUL = { bas: '#2f9e7f', milieu: '#8f8d84', haut: '#d9773f', repere: '#7f77dd' };
function _carteStats(titre, corps, note){
  return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin-bottom:16px">'
    + '<div style="font-size:13px;font-weight:700;color:var(--white);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">' + titre + '</div>'
    + corps + (note ? '<div style="font-size:11px;color:var(--muted);margin-top:10px">' + note + '</div>' : '') + '</div>';
}
function _dimNomVue(v){ return v === 'black' ? _tr('Noirs', 'Black') : (v === 'white' ? _tr('Blancs', 'White') : _tr('Les deux camps', 'Both sides')); }
function _dimNb(x){ return Number(x).toLocaleString(currentLang() === 'EN' ? 'en-GB' : 'fr-FR'); }
function _dimDec(x, k){ const t = Number(x).toFixed(k === undefined ? 2 : k); return currentLang() === 'EN' ? t : t.replace('.', ','); }
function _dimPct(p){ return ((p >= 10 || p === 0) ? String(Math.round(p)) : _dimDec(p, 1)) + ' %'; }
function _dimDp(){ return currentLang() === 'EN' ? ': ' : ' : '; }   // deux-points : espace avant en francais seulement
function _dimEtroit(){ const h = document.getElementById('dims-carte'); return !!(h && h.clientWidth && h.clientWidth < 520); }
// les trois reperes, en long (ecran large) ou en court (telephone)
function _dimReperes(etroit){
  return etroit
    ? [[10, 'p10', _tr('10ᵉ', '10th')], [50, 'median', _tr('méd.', 'med.')], [90, 'p90', _tr('90ᵉ', '90th')]]
    : [[10, 'p10', _tr('10ᵉ centile', '10th percentile')], [50, 'median', _tr('médiane', 'median')], [90, 'p90', _tr('90ᵉ centile', '90th percentile')]];
}
// Parties que la page compte, par source, et celles qui ont leurs mesures
function _dimCouverture(){
  const K = _empCorpusDonnees(); if (!K) return null;
  const PS = (typeof PS_TOURNOI_YEARLY_2026 !== 'undefined') ? PS_TOURNOI_YEARLY_2026 : [];
  const REF = (typeof PARTIES_REFERENCE !== 'undefined') ? PARTIES_REFERENCE : [];
  const avecCoups = function(seq){ return !!String(seq || '').replace(/\d+\./g, ' ').trim(); };
  const attendu = { MIGS: MIGS_GAMES.length, AO: AO_GAMES.length,
    PS: PS.filter(function(g){ return avecCoups(g[5]); }).length, REF: REF.filter(function(g){ return avecCoups(g[6]); }).length };
  let manque = 0;
  Object.keys(attendu).forEach(function(k){ manque += Math.max(0, attendu[k] - (K.parties[k] || 0)); });
  const C = (typeof EMPREINTES_COMPLEMENT !== 'undefined') ? EMPREINTES_COMPLEMENT : null;
  const perime = !!(C && typeof _empComplementSignature === 'function' && C.sig !== _empComplementSignature());
  return { K: K, attendu: attendu, manque: manque, perime: perime,
    parties: K.parties.MIGS + K.parties.AO + K.parties.PS + K.parties.REF,
    sansCoup: (PS.length - attendu.PS) + (REF.length - attendu.REF) };
}
async function _dimsPreparer(){
  const host = document.getElementById('dims-carte'); if (!host) return;
  const titre = _tr('Les 12 dimensions, mesurées sur tout le corpus', 'The 12 dimensions, measured over the whole corpus');
  const ok = (typeof ensureEmpreintesHistoriques === 'function') ? await ensureEmpreintesHistoriques() : false;
  if (typeof ensureEmpreintesComplement === 'function') await ensureEmpreintesComplement();
  if (!host.isConnected) return;
  if (!ok || !_empCorpusDonnees()) {
    host.innerHTML = _carteStats(titre, '<div style="font-size:12px;color:var(--muted)">' + _tr('Les positions mesurées n’ont pas pu être chargées (navigateur trop ancien ?).', 'The measured positions could not be loaded (browser too old?).') + '</div>');
    return;
  }
  // d'un seul tenant (mesure : ~0,3 s pour les 15 distributions) : des pauses entre
  // chaque etape laissaient passer devant d'autres calculs de la page, bien plus longs
  await new Promise(function(r){ setTimeout(r, 0); });
  if (!host.isConnected) return;
  _dimsRendre();
  await new Promise(function(r){ setTimeout(r, 0); });
  _dimsCorrelations();
}
// Les trois bandes (deux camps, Noirs, Blancs) de la dimension choisie : chaque barre = 1 % des positions
function _dimSVG(champ, etroit){
  const L = etroit ? { W: 360, x0: 10, pas: 3.4, bw: 2.5, H1: 100, ft: 11, fr: 10.5 } : { W: 640, x0: 20, pas: 6, bw: 4.6, H1: 112, ft: 12, fr: 11 };
  L.yb = L.H1 - 10; L.haut = L.H1 - 46; _dimL = L;
  const ds = _DIM_VUES.map(function(v){ return distributionDimension(champ, v); });
  const barres = ds.map(function(d){ const b = []; for (let i = 0; i < 100; i++) b.push(d.q[i * 10 + 5]); return b; });
  let lo = Infinity, hi = -Infinity;
  barres.forEach(function(b){ b.forEach(function(v){ if (v < lo) lo = v; if (v > hi) hi = v; }); });
  if (hi === lo) hi = lo + 1;
  const couleur = function(i){ return i < 10 ? _DIM_COUL.bas : (i >= 90 ? _DIM_COUL.haut : _DIM_COUL.milieu); };
  let s = '<svg id="dims-svg" viewBox="0 0 ' + L.W + ' ' + (3 * L.H1 + 4) + '" width="100%" role="img" aria-label="' + _tr('Positions rangées par valeur : les deux camps, les Noirs, les Blancs', 'Positions ranked by value: both sides, Black, White') + '" style="display:block;margin:6px 0 4px">';
  ds.forEach(function(d, k){
    const y0 = k * L.H1, yb = y0 + L.yb, vue = _DIM_VUES[k];
    s += '<text x="' + L.x0 + '" y="' + (y0 + L.ft + 1) + '" style="font-size:' + L.ft + 'px;fill:var(--text);font-weight:' + (vue === _dimVueTable ? 700 : 400) + '">' + _dimNomVue(vue) + ' · ' + _dimNb(d.n) + ' positions</text>';
    for (let i = 0; i < 100; i++) {
      const h = 3 + (barres[k][i] - lo) / (hi - lo) * (L.haut - 3);
      s += '<rect class="dims-barre" x="' + (L.x0 + L.pas * i).toFixed(1) + '" y="' + (yb - h).toFixed(1) + '" width="' + L.bw + '" height="' + h.toFixed(1) + '" rx="0.8" fill="' + couleur(i) + '"/>';
    }
    _dimReperes(etroit).forEach(function(m){
      const x = (L.x0 + L.pas * m[0] - (L.pas - L.bw) / 2).toFixed(1);
      s += '<line x1="' + x + '" y1="' + (yb - L.haut - 2) + '" x2="' + x + '" y2="' + yb + '" style="stroke:var(--muted)" stroke-width="1" stroke-dasharray="3 3"/>';
      s += '<text x="' + x + '" y="' + (yb - L.haut - 7) + '" text-anchor="middle" style="font-size:' + L.fr + 'px;fill:var(--muted);font-family:\'DM Mono\',monospace">' + m[2] + _dimDp() + _dimDec(d[m[1]]) + '</text>';
    });
    s += '<line x1="' + L.x0 + '" y1="' + (yb + 0.5) + '" x2="' + (L.x0 + L.pas * 100) + '" y2="' + (yb + 0.5) + '" style="stroke:var(--border)" stroke-width="1"/>';
    s += '<line id="dims-rep-' + k + '" x1="0" y1="' + (yb - L.haut - 2) + '" x2="0" y2="' + yb + '" stroke="' + _DIM_COUL.repere + '" stroke-width="2.5" visibility="hidden"/>';
    s += '<polygon id="dims-tri-' + k + '" points="0,0 0,0 0,0" fill="' + _DIM_COUL.repere + '" visibility="hidden"/>';
  });
  return s + '</svg>';
}
function _dimLegende(){
  const carre = function(c){ return '<span style="width:9px;height:9px;border-radius:2px;background:' + c + ';display:inline-block;margin-right:5px"></span>'; };
  return '<div style="display:flex;flex-wrap:wrap;justify-content:space-between;gap:4px 12px;font-size:11px;color:var(--muted);margin-bottom:8px">'
    + '<span>' + carre(_DIM_COUL.bas) + _tr('10 % les moins marquées', '10 % least marked') + '</span>'
    + '<span>' + carre(_DIM_COUL.milieu) + _tr('80 % : la zone normale', '80 %: the normal range') + '</span>'
    + '<span>' + carre(_DIM_COUL.haut) + _tr('10 % les plus marquées', '10 % most marked') + '</span></div>';
}
function _dimsRendre(){
  const host = document.getElementById('dims-carte'); if (!host) return;
  const cv = _dimCouverture(); if (!cv) return;
  const K = cv.K, champ = _dimChamp, dT = distributionDimension(champ, 'tous'), etroit = _dimEtroit();
  _dimEtroitRendu = etroit;
  const entiers = [0, 250, 500, 750, 1000].every(function(k){ return Number.isInteger(dT.q[k]); });
  if (_dimValeur === null || _dimValeur < dT.min || _dimValeur > dT.max) _dimValeur = dT.median;
  const s = function(n){ return n > 1 ? 's' : ''; };
  let h = '';
  // 1. sur quoi c'est mesure : toujours les parties reellement chargees
  h += '<div id="dims-couverture" style="font-size:12px;color:var(--text);line-height:1.6;margin-bottom:12px">'
    + _tr('Mesuré sur <b>' + _dimNb(K.n) + ' positions</b> de <b>' + _dimNb(cv.parties) + ' parties</b> : MIGS ' + _dimNb(K.parties.MIGS) + ', AbalOnline ' + _dimNb(K.parties.AO) + ', PlayStrategy ' + _dimNb(K.parties.PS) + ', référence ' + _dimNb(K.parties.REF)
          + ' — une mesure après chaque coup joué, du côté du camp qui vient de jouer. Tout est calculé à partir des parties chargées dans le site : quand des parties s’ajoutent, les chiffres et les graphiques suivent.',
          'Measured over <b>' + _dimNb(K.n) + ' positions</b> from <b>' + _dimNb(cv.parties) + ' games</b>: MIGS ' + _dimNb(K.parties.MIGS) + ', AbalOnline ' + _dimNb(K.parties.AO) + ', PlayStrategy ' + _dimNb(K.parties.PS) + ', reference ' + _dimNb(K.parties.REF)
          + ' — one measure after each move, for the side that has just moved. Everything is computed from the games loaded in the site: when games are added, the numbers and the charts follow.')
    + (cv.sansCoup ? ' ' + _tr(cv.sansCoup + ' partie' + s(cv.sansCoup) + ' de la page, abandonnée' + s(cv.sansCoup) + ' avant le premier coup, n’' + (cv.sansCoup > 1 ? 'ont' : 'a') + ' aucune position.',
                               cv.sansCoup + ' game' + s(cv.sansCoup) + ' on this page, abandoned before the first move, ' + (cv.sansCoup > 1 ? 'have' : 'has') + ' no position.') : '')
    + (cv.manque ? '<div style="color:' + _DIM_COUL.haut + ';margin-top:4px">⚠ ' + _tr(cv.manque + ' partie' + s(cv.manque) + ' de cette page n’' + (cv.manque > 1 ? 'ont' : 'a') + ' pas encore leurs mesures : elle' + s(cv.manque) + ' n’' + (cv.manque > 1 ? 'y sont' : 'y est') + ' pas comptée' + s(cv.manque) + '.',
                                                                                 cv.manque + ' game' + s(cv.manque) + ' on this page ' + (cv.manque > 1 ? 'are' : 'is') + ' not measured yet, so not counted here.') + '</div>'
      : (cv.perime ? '<div style="color:' + _DIM_COUL.haut + ';margin-top:4px">⚠ ' + _tr('Des parties PlayStrategy ou de référence ont changé depuis le calcul de leurs mesures.', 'Some PlayStrategy or reference games changed since their measures were computed.') + '</div>' : ''))
    + '</div>';
  // 2. comment lire
  h += '<div style="background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:12px;color:var(--text);line-height:1.65">'
    + '<div style="font-weight:700;margin-bottom:4px">' + _tr('Comment lire ce tableau', 'How to read this table') + '</div>'
    + _tr('Chaque dimension est un nombre mesuré dans chaque position des vraies parties. Range toutes ces positions de la plus petite valeur à la plus grande : dans les graphiques, chaque barre en représente 1 %.',
          'Each dimension is a number measured in every position of the real games. Line up all these positions from the smallest value to the largest: in the charts, each bar stands for 1 % of them.')
    + '<ul style="margin:6px 0 6px 18px;padding:0">'
    + '<li>' + _tr('<b>10ᵉ centile</b> : la valeur au premier dixième de la file — environ 10 % des positions ont moins.', '<b>10th percentile</b>: the value one tenth of the way along the line — about 10 % of positions are lower.') + '</li>'
    + '<li>' + _tr('<b>Médiane</b> : la valeur du milieu — la moitié des positions ont moins, l’autre moitié plus.', '<b>Median</b>: the middle value — half of the positions are lower, half higher.') + '</li>'
    + '<li>' + _tr('<b>90ᵉ centile</b> : environ 90 % des positions ont moins, et 10 % seulement ont plus.', '<b>90th percentile</b>: about 90 % of positions are lower, and only 10 % higher.') + '</li>'
    + '</ul>'
    + _tr('Entre le 10ᵉ et le 90ᵉ centile se trouvent 80 % des positions : la zone normale. Au-dessus du 90ᵉ centile, une position fait partie des 10 % les plus marquées sur cette dimension ; en dessous du 10ᵉ, des 10 % les moins marquées. Quand beaucoup de positions ont exactement la même valeur (souvent 0), plusieurs centiles tombent sur cette valeur.',
          'Between the 10th and the 90th percentile lie 80 % of positions: the normal range. Above the 90th percentile, a position is among the 10 % most marked on that dimension; below the 10th, among the 10 % least marked. When many positions share exactly the same value (often 0), several percentiles fall on that value.')
    + '</div>';
  // 3. les trois graphiques de la dimension choisie
  h += '<div style="font-size:13px;font-weight:700;color:var(--gold)">' + _labelDimension(champ) + '</div>'
    + '<div style="font-size:11px;color:var(--muted)">' + _tr('Les deux camps ensemble, puis les Noirs (positions juste après un coup des Noirs), puis les Blancs. Clique sur une ligne du tableau pour changer de dimension.', 'Both sides together, then Black (positions just after a Black move), then White. Click a row of the table to change dimension.') + '</div>'
    + _dimSVG(champ, etroit) + _dimLegende();
  // 4. situer une valeur
  h += '<div style="display:flex;align-items:center;gap:10px;margin:6px 0;font-size:12px;color:var(--text)">'
    + '<span style="display:inline-flex;align-items:center;gap:6px;white-space:nowrap"><span style="width:10px;height:10px;border-radius:2px;background:' + _DIM_COUL.repere + ';display:inline-block"></span>' + _tr('Situer une valeur', 'Place a value') + '</span>'
    + '<input type="range" id="dims-curseur" min="' + dT.min + '" max="' + dT.max + '" step="' + (entiers ? 1 : 0.01) + '" value="' + _dimValeur + '" oninput="_dimsSituer(this.value)" style="flex:1;min-width:80px" aria-label="' + _tr('Valeur à situer', 'Value to place') + '">'
    + '<span id="dims-valeur" style="min-width:48px;text-align:right;font-weight:700;font-family:\'DM Mono\',monospace"></span></div>'
    + '<div id="dims-lecture" style="font-size:12px;line-height:1.8;margin-bottom:14px"></div>';
  // 5. le tableau, pour le camp choisi
  const vues = _DIM_VUES.map(function(v){
    const actif = v === _dimVueTable;
    return '<button onclick="_dimVue(\'' + v + '\')" style="padding:4px 10px;font-size:11px;border-radius:6px;cursor:pointer;border:1px solid ' + (actif ? 'var(--gold)' : 'var(--border)') + ';background:' + (actif ? 'rgba(201,168,76,0.15)' : 'transparent') + ';color:' + (actif ? 'var(--gold)' : 'var(--text)') + '">' + _dimNomVue(v) + '</button>';
  }).join(' ');
  h += '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:4px 0 6px;font-size:12px;color:var(--muted)">' + _tr('Valeurs du tableau', 'Table values') + _dimDp() + vues + '</div>';
  const rep = _dimReperes(etroit);
  h += EMPREINTES_CHAMPS.map(function(f){
    const d = distributionDimension(f, _dimVueTable), choisi = f === champ;
    return '<div class="dims-ligne" role="button" tabindex="0" onclick="_dimChoisir(\'' + f + '\')" onkeydown="if(event.key===\'Enter\')_dimChoisir(\'' + f + '\')" style="padding:7px 8px;border-bottom:1px solid var(--border);cursor:pointer;border-radius:6px;' + (choisi ? 'background:rgba(201,168,76,0.10);' : '') + '">'
      + '<div style="font-size:12px;color:' + (choisi ? 'var(--gold)' : 'var(--text)') + ';margin-bottom:2px;font-weight:' + (choisi ? 700 : 400) + '">' + (choisi ? '▸ ' : '') + _labelDimension(f) + '</div>'
      + '<div style="display:flex;justify-content:space-between;gap:6px;font-size:11px;color:var(--muted);font-family:\'DM Mono\',monospace;white-space:nowrap">'
        + '<span>' + rep[0][2] + _dimDp() + _dimDec(d.p10) + '</span>'
        + '<span style="color:var(--gold);font-weight:700">' + rep[1][2] + ' ' + _dimDec(d.median) + '</span>'
        + '<span>' + rep[2][2] + _dimDp() + _dimDec(d.p90) + '</span>'
      + '</div></div>';
  }).join('');
  host.innerHTML = _carteStats(_tr('Les 12 dimensions, mesurées sur tout le corpus', 'The 12 dimensions, measured over the whole corpus'), h,
    _tr('C’est le référentiel qui permet de situer une position : au-dessus du 90ᵉ centile, elle fait partie des 10 % les plus marquées sur cette dimension.',
        'This is the yardstick for placing a position: above the 90th percentile, it is among the 10 % most marked on that dimension.'));
  _dimsSituer(_dimValeur);
}
// Le curseur : ou tombe une valeur dans chacune des trois files
function _dimsSituer(val){
  const v = Number(val); if (!isFinite(v)) return;
  _dimValeur = v;
  const out = document.getElementById('dims-valeur'); if (out) out.textContent = _dimDec(v);
  const L = _dimL || { x0: 20, pas: 6, bw: 4.6, H1: 112, yb: 102 };
  const lignes = [];
  _DIM_VUES.forEach(function(vue, k){
    const d = distributionDimension(_dimChamp, vue); if (!d) return;
    const p = pourcentEnDessous(d, v), x = (L.x0 + L.pas * p - (L.pas - L.bw) / 2).toFixed(1), yb = k * L.H1 + L.yb;
    const l = document.getElementById('dims-rep-' + k), t = document.getElementById('dims-tri-' + k);
    if (l && l.setAttribute) { l.setAttribute('x1', x); l.setAttribute('x2', x); l.setAttribute('visibility', 'visible'); }
    if (t && t.setAttribute) { t.setAttribute('points', (x - 6) + ',' + (yb + 9) + ' ' + (+x + 6) + ',' + (yb + 9) + ' ' + x + ',' + (yb + 1)); t.setAttribute('visibility', 'visible'); }
    let verdict, fond, coul;
    if (v < d.p10) { verdict = _tr('sous le 10ᵉ centile : parmi les 10 % les moins marquées', 'below the 10th percentile: among the 10 % least marked'); fond = 'rgba(47,158,127,0.15)'; coul = _DIM_COUL.bas; }
    else if (v > d.p90) { verdict = _tr('au-dessus du 90ᵉ centile : parmi les 10 % les plus marquées', 'above the 90th percentile: among the 10 % most marked'); fond = 'rgba(217,119,63,0.15)'; coul = _DIM_COUL.haut; }
    else { verdict = _tr('entre le 10ᵉ et le 90ᵉ centile : la zone normale', 'between the 10th and 90th percentiles: the normal range'); fond = 'transparent'; coul = 'var(--muted)'; }
    lignes.push('<div><b>' + _dimNomVue(vue) + '</b>' + _dimDp() + _tr('au-dessus de ' + _dimPct(p) + ' des positions', 'higher than ' + _dimPct(p) + ' of positions')
      + ' <span style="padding:1px 8px;border-radius:6px;background:' + fond + ';color:' + coul + '">' + verdict + '</span></div>');
  });
  const lec = document.getElementById('dims-lecture'); if (lec) lec.innerHTML = lignes.join('');
}
function _dimChoisir(champ){
  if (EMPREINTES_CHAMPS.indexOf(champ) < 0) return;
  _dimChamp = champ; _dimValeur = null;
  _dimsRendre();
}
async function _dimVue(vue){
  _dimVueTable = (vue === 'black' || vue === 'white') ? vue : 'tous';
  for (const f of EMPREINTES_CHAMPS) {
    const K = _empCorpusDonnees();
    if (K && !K.dist[_dimVueTable + ':' + f]) { distributionDimension(f, _dimVueTable); await new Promise(function(r){ setTimeout(r, 0); }); }
  }
  _dimsRendre();
}
// Ecran tourne ou fenetre redimensionnee : la mise en page etroite / large suit
window.addEventListener('resize', function(){
  clearTimeout(_dimsRendre._t);
  _dimsRendre._t = setTimeout(function(){
    const host = document.getElementById('dims-carte');
    if (host && host.isConnected && document.getElementById('dims-svg') && _dimEtroit() !== _dimEtroitRendu) _dimsRendre();
  }, 250);
});
// Redondance entre dimensions (mesure honnete, pas une supposition) -- sur les memes positions
function _dimsCorrelations(){
  const host = document.getElementById('dims-corr'); if (!host) return;
  const corr = computeDimensionCorrelations(); if (!corr) return;
  const top = corr.pairs.slice(0, 5).map(function(pr){
    const force = Math.abs(pr.r) > 0.8 ? _tr('très forte', 'very strong') : (Math.abs(pr.r) > 0.5 ? _tr('forte', 'strong') : _tr('modérée', 'moderate'));
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">'
      + '<span style="color:var(--text)">' + _labelDimension(pr.a) + ' ↔ ' + _labelDimension(pr.b) + '</span>'
      + '<span style="font-weight:700;color:' + (Math.abs(pr.r) > 0.8 ? '#e08050' : 'var(--gold)') + '">' + _dimDec(pr.r, 3) + ' <span style="font-weight:400;color:var(--muted);font-size:11px">(' + force + ')</span></span></div>';
  }).join('');
  // le plus fort lien du groupe cohesion / soutien / billes sans soutien, mesure ici (plus ecrit a la main)
  const groupe = ['cohesionMoyenne', 'soutienMoyen', 'proportionSansSoutien'];
  let rMax = 0;
  corr.pairs.forEach(function(pr){ if (groupe.indexOf(pr.a) >= 0 && groupe.indexOf(pr.b) >= 0) rMax = Math.max(rMax, Math.abs(pr.r)); });
  host.innerHTML = _carteStats(_tr('Ces dimensions sont-elles indépendantes ?', 'Are these dimensions independent?'), top,
    _tr('Corrélation de Pearson mesurée sur les ' + _dimNb(corr.n) + ' positions. Cohésion, soutien et billes sans soutien mesurent largement la même chose (jusqu’à ' + _dimDec(rMax) + ') : ces trois axes bougent ensemble, il ne faut pas les lire comme trois informations distinctes. Aucune dimension n’est constante, donc aucune n’est inutile — mais ce groupe est redondant.',
        'Pearson correlation measured over the ' + _dimNb(corr.n) + ' positions. Cohesion, support and unsupported marbles largely measure the same thing (up to ' + _dimDec(rMax) + '): these three axes move together and should not be read as three separate pieces of information. No dimension is constant, so none is useless — but this group is redundant.'));
}

function renderHistoriquePage(){
  const host = document.getElementById('historique-filters-host');
  if (host && !host.dataset.built) {
    const variantOptions = (typeof LAYOUTS !== 'undefined')
      ? Object.keys(LAYOUTS).map(function(k){
          const label = (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[k]) ? HEAT_VARIANT_LABEL[k] : k;
          return '<option value="' + k + '">' + label + '</option>';
        }).join('')
      : '';
    host.innerHTML =
      '<select onchange="_historySetFilter(\'variant\', this.value)" style="flex:1;min-width:120px;padding:7px;border-radius:7px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px"><option value="all">Toutes variantes</option>' + variantOptions + '</select>'
      + '<select onchange="_historySetFilter(\'mode\', this.value)" style="flex:1;min-width:100px;padding:7px;border-radius:7px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px"><option value="all">Tous modes</option><option value="ai">Contre IA</option><option value="local">Local/code</option></select>'
      + '<select onchange="_historySetFilter(\'result\', this.value)" style="flex:1;min-width:100px;padding:7px;border-radius:7px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px"><option value="all">Tout résultat</option><option value="victoire">Victoires</option><option value="defaite">Défaites</option><option value="nulle">Nulles</option></select>'
      + '<input type="text" placeholder="Rechercher (variante, nom...)" oninput="_historySetFilter(\'search\', this.value)" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:13px;box-sizing:border-box;flex-basis:100%;margin-top:2px">';
    host.dataset.built = '1';
  }
  _historyFilters = { variant:'all', mode:'all', result:'all', search:'' };
  _renderHistoryList();
}

/* Conservee pour compatibilite (referencee par la fiche technique pour IA,
   et par toute habitude anterieure) -- redirige simplement vers la page,
   qui a remplace le modal flottant (signale par Olivier : demande une page
   normale du site comme les autres, pas une fenetre superposee). */
function openHistoryModal(){
  if (typeof showPage === 'function') showPage('historique');
}

/* Import d'une sequence Aba-Pro brute (pas un format proprietaire BGA --
   verifie par recherche que BGA n'expose aucun export texte telechargeable
   pour Abalone, seulement une relecture par notifications internes au
   navigateur. Aba-Pro est en revanche LE standard communautaire reconnu
   -- import honnete de ce qu'on peut reellement verifier, pas invente. */
/* Export des coups de la partie en cours en notation Aba-Pro brute --
   complement direct de l'import (openApgnImportModal ci-dessous) : ce que
   le site produit ici, il sait le relire. Objectif concret : pouvoir
   soumettre une partie a un moteur externe (aucun moteur externe ne
   comprend le format "Partie par code", proprietaire a ce site ; Aba-Pro
   est en revanche le standard communautaire reconnu).
   Note honnete : il n'existe AUCUN format standard de POSITION pour
   Abalone (contrairement au FEN des echecs -- verifie par recherche).
   L'export part donc forcement de la position de depart de la variante,
   rappelee en commentaire d'en-tete, et non d'une position arbitraire. */
/* ═══════════════════════════════════════════
   DUEL CONTRE UN MOTEUR EXTERNE
   Rendu possible par l'extraction de executePlayerMove() hors de
   handleClick() : un coup venu d'un moteur externe suit EXACTEMENT le
   meme chemin qu'un coup humain (validation, captures, animations,
   pendules, detection de victoire, sauvegarde) -- rien n'est contourne.
   Le coup recu est TOUJOURS revalide contre le moteur avant d'etre
   applique : un moteur externe buggue ou malveillant ne peut pas faire
   jouer un coup illegal.
   Pas de serveur, pas de protocole reseau : l'utilisateur relaie les
   coups a la main, dans la notation Aba-Pro standard -- le seul format
   qu'un moteur externe a une chance de comprendre (verifie : il n'existe
   aucun format standard de POSITION pour l'Abalone, et le format
   "Partie par code" est propre a ce site).
═══════════════════════════════════════════ */
function openExternalEnginePanel(){
  let m = document.getElementById('extengine-modal');
  if (m) m.remove();
  m = document.createElement('div');
  m.id = 'extengine-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(13,15,14,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML =
    '<div style="max-width:520px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:24px;max-height:90vh;overflow-y:auto">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:6px">Duel contre un moteur externe</h3>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">Fais jouer un autre programme contre l\u2019IA de ce site. Tu relaies les coups à la main, en notation Aba-Pro. Aucun compte, aucun serveur.</div>'
    + '<div id="extengine-last" style="font-size:11px;letter-spacing:1px;color:var(--muted);margin-bottom:6px">DERNIER COUP DE CE SITE</div>'
    + '<div id="extengine-lastmove" style="font-family:\'DM Mono\',monospace;font-size:16px;color:var(--gold);background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:6px">—</div>'
    + '<button class="ctrl-btn" onclick="_extCopyLastMove()" style="width:100%;margin-bottom:14px">Copier ce coup</button>'
    + '<div style="font-size:11px;letter-spacing:1px;color:var(--muted);margin-bottom:6px">COUP DU MOTEUR EXTERNE</div>'
    + '<input id="extengine-in" placeholder="ex. e5f6" style="width:100%;padding:9px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:\'DM Mono\',monospace;font-size:14px;box-sizing:border-box">'
    + '<div id="extengine-status" style="font-size:12px;margin:8px 0;min-height:16px"></div>'
    + '<div style="display:flex;gap:8px">'
      + '<button class="ctrl-btn" onclick="_extPlayMove()" style="flex:1">Jouer ce coup</button>'
      + '<button onclick="document.getElementById(\'extengine-modal\').remove()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:8px 16px;cursor:pointer">Fermer</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(m);
  _extRefreshLastMove();
}

function _extLastMoveText(){
  if (typeof boardSnapshots === 'undefined' || !boardSnapshots.length) return null;
  const mi = boardSnapshots[boardSnapshots.length-1].moveInfo;
  if (!mi || !mi.cells || !mi.dir) return null;
  return moveToABAPRO(mi.cells, mi.dir, mi.type);
}

function _extRefreshLastMove(){
  const el = document.getElementById('extengine-lastmove');
  if (!el) return;
  const t = _extLastMoveText();
  el.textContent = t || '— (aucun coup joué pour l\u2019instant)';
}

function _extCopyLastMove(){
  const t = _extLastMoveText();
  if (!t) { if (typeof showToast==='function') showToast('Aucun coup à copier.'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(function(){
      if (typeof showToast==='function') showToast('📋 Coup copié : ' + t);
    }).catch(function(){ if (typeof showToast==='function') showToast('Copie refusée par le navigateur.'); });
  }
}

function _extPlayMove(){
  const input = document.getElementById('extengine-in');
  const status = document.getElementById('extengine-status');
  const setErr = function(msg){ if (status){ status.textContent = msg; status.style.color = '#e05c4b'; } };
  if (!input) return;
  const tok = input.value.trim();
  if (!tok) { setErr('Colle le coup renvoyé par le moteur externe.'); return; }
  if (GameOver.get()) { setErr('La partie est terminée.'); return; }

  const color = CurrentTurn.get();
  const mv = resolveAbaProToken(tok, color);
  if (!mv) { setErr('Notation illisible ou coup impossible dans cette position pour ' + (color==='black'?'les noirs':'les blancs') + '.'); return; }
  // Revalidation systematique contre le moteur : on ne fait jamais confiance
  // a un coup venu de l'exterieur, meme s'il a ete resolu.
  const info = validateMove(mv.cells, mv.dir, color);
  if (!info || !info.valid) { setErr('⛔ Coup illégal : ' + ((info && info.reason) || 'refusé par le moteur') + '.'); return; }

  executePlayerMove(mv.cells.slice(), mv.dir, color, info);
  input.value = '';
  if (status) { status.textContent = '✅ Coup joué : ' + tok; status.style.color = 'var(--accent-green-light)'; }
  // Laisse a l'IA du site le temps de repondre, puis reaffiche son coup
  setTimeout(_extRefreshLastMove, 2200);
}

/* ═══════════════════════════════════════════
   FICHE TECHNIQUE POUR IA — donnees factuelles sur le site.
   Motivation reelle : plusieurs audits externes generes par IA ont
   affirme a tort que des fonctionnalites manquaient alors qu'elles
   existaient, et donne des tailles de fichier fausses d'un ordre de
   grandeur. Cette fiche existe pour qu'un modele parte de faits
   verifiables plutot que de suppositions.
   PRINCIPE CENTRAL : tout est CALCULE A L'EXECUTION depuis le code
   reel (comptages, detection de fonctions), jamais un texte ecrit a la
   main -- sans quoi la fiche deviendrait elle-meme perimee et donc une
   nouvelle source d'erreurs, exactement le probleme qu'elle corrige.
   L'inventaire se fait par DETECTION (typeof === 'function') : c'est ce
   qui permet de refuter « il manque X » de facon verifiable.
═══════════════════════════════════════════ */
function buildSiteBriefing(){
  const has = function(n){ try { return typeof window[n] === 'function'; } catch(e){ return false; } };
  const num = function(v){ return (typeof v === 'number') ? v : null; };
  const L = [];
  const P = function(s){ L.push(s); };

  P('# Abalassembly — fiche technique (generee automatiquement)');
  P('');
  P('Genere le ' + new Date().toISOString().slice(0,10) + ' depuis le site lui-meme.');
  P('Tous les chiffres ci-dessous sont COMPTES a l\u2019execution depuis le code reel,');
  P('pas recopies a la main. Les fonctionnalites sont detectees, pas declarees.');
  P('');
  P('## Identite');
  P('- Version : ' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'inconnue'));
  P('- Architecture : fichier HTML unique, zero dependance externe, fonctionne hors ligne et depuis file://');
  P('- Licence : GPL v3 — depot : github.com/ocj94/Abalassembly');
  P('');
  P('## Contenu reel (compte a l\u2019instant)');
  try { P('- Variantes de depart : ' + Object.keys(LAYOUTS).length + ' (' + Object.keys(LAYOUTS).join(', ') + ')'); } catch(e){}
  try { P('- Puzzles : ' + PUZZLES.length + ' dont ' + SINGLE_MOVE_PUZZLE_COUNT + ' en un coup et ' + (PUZZLES.length - SINGLE_MOVE_PUZZLE_COUNT) + ' multi-coups'); } catch(e){}
  try { P('- Empreintes de positions historiques : ' + EMPREINTES_N); } catch(e){}
  try { if (typeof getGameHistory === 'function') P('- Parties archivees localement par cet utilisateur : ' + getGameHistory().length); } catch(e){}

  P('');
  P('## Fonctionnalites REELLEMENT presentes (detectees, pas declarees)');
  const feats = [
    ['Jeu contre IA (alpha-beta, PVS, quiescence, multi-worker)', 'aiMove'],
    ['Editeur de position', 'drawEditorBoard'],
    ['Analyse de partie avec barre d\u2019evaluation', 'updateAnalysisEval'],
    ['Revoir mes erreurs apres partie', 'openMistakesReview'],
    ['Historique de parties filtrable et rejouable', 'openHistoryModal'],
    ['Repetition espacee (SRS) sur les puzzles', 'srsGetDuePuzzles'],
    ['Partie par code (asynchrone, sans serveur)', 'openGameCodePanel'],
    ['Partie en direct WebRTC (experimental)', 'openRtcPanel'],
    ['Duel contre un moteur externe', 'openExternalEnginePanel'],
    ['Export des coups en notation Aba-Pro', 'exportGameAbaPro'],
    ['Import de notation Aba-Pro', 'openApgnImportModal'],
    ['Export / import de toutes les donnees utilisateur', 'exportMyData'],
    ['Carte de chaleur des coups', 'recordMyHeat'],
    ['Livre d\u2019ouvertures issu de vraies parties', 'getOpeningMove'],
    ['Tables de finale (2v2, 3v2)', 'ensureEmpreintesHistoriques'],
    ['Moteur experimental NNUE', 'loadNNUEWeights'],
    ['Benchmark moteur integre', 'requestAIMovePooled'],
    ['Navigation clavier et ARIA', '_a11yBuildOverlay'],
    ['Mode enfant', 'toggleKidsMode'],
    ['Detection de plateau par camera', 'startCamera'],
    ['Statistiques par moteur', 'computeEngineStats']
  ];
  feats.forEach(function(f){ P('- [' + (has(f[1]) ? 'x' : ' ') + '] ' + f[0]); });

  P('');
  P('## Limites connues et ASSUMEES (ne pas les signaler comme des oublis)');
  P('- Poids du fichier : ~7,7 Mo, dont plus de la moitie pour la base d\u2019empreintes.');
  P('  Le decodage est deja differe, mais le TELECHARGEMENT ne peut pas l\u2019etre :');
  P('  c\u2019est le prix assume du fichier unique hors ligne, pas un oubli.');
  P('- Comparabilite des scores entre workers : chaque worker a sa propre table de');
  P('  transposition (SharedArrayBuffer impossible sur GitHub Pages). Documente,');
  P('  non resolu, pas de solution propre connue dans ces contraintes.');
  P('- Backend (comptes, classement en ligne) : ecrit mais volontairement dormant.');
  P('  Le site est hors ligne par conception.');
  P('- NNUE : plus faible que le moteur actuel (2V/8D/5N sur 15 parties de test).');
  P('  Propose par transparence, jamais active par defaut.');
  P('- Auto-apprentissage : ecarte par calcul (~300 h de calcul pour egaler un corpus');
  P('  humain deja disponible gratuitement), pas par desinteret.');
  P('- Il n\u2019existe AUCUN format standard de POSITION pour l\u2019Abalone (pas de FEN).');
  P('  Seule la notation des COUPS (Aba-Pro) est standardisee.');

  P('');
  P('## Chantiers OUVERTS (deja identifies -- inutile de les proposer comme nouveautes)');
  P('- Duel contre un moteur externe : livre, mais jamais teste face a un VRAI programme');
  P('  externe (teste uniquement avec des coups produits par le moteur du site).');
  P('- Partie en direct WebRTC : la connexion reelle n\u2019a jamais ete validee sur un reseau');
  P('  mobile ; le repli vers "Partie par code" fonctionne.');
  P('- Puzzles multi-coups : pas de resolution interactive, et la suite de tests');
  P('  automatises ne les couvre pas encore.');
  P('- Vol de travail entre workers : code ecrit et verifie correct, mais PAS plus rapide');
  P('  en pratique -- conserve non active, documente en commentaire.');
  P('');
  P('## Suggestions DEJA EVALUEES ET ECARTEES (ne pas represcrire sans element nouveau)');
  P('- Multijoueur en ligne avec comptes/classement : demande un serveur, contraire au');
  P('  choix hors ligne assume. Le remplacement existe : Partie par code + WebRTC.');
  P('- Ajouter des dizaines de bots, skins ou modes : le site est deja tres fourni ;');
  P('  ce n\u2019est pas ce qui lui manque.');
  P('- Reduire le poids en supprimant la base d\u2019empreintes : ce serait supprimer une');
  P('  fonctionnalite, pas optimiser.');
  P('- Auto-apprentissage du reseau de neurones : chiffre a ~300 h de calcul minimum,');
  P('  hors de portee sans infrastructure dediee.');
  P('');
  P('## Regles de contribution');
  P('- Aucune donnee inventee : tout chiffre affiche doit etre source, date, ou remplace par "—".');
  P('- Toute affirmation sur ce site doit etre verifiee contre le code reel avant d\u2019etre ecrite.');
  P('- Les resultats negatifs sont conserves et documentes, pas masques.');
  P('- Documentation detaillee : github.com/ocj94/Abalassembly/tree/main/docs');
  return L.join('\n');
}

function openSiteBriefing(){
  let m = document.getElementById('briefing-modal');
  if (m) m.remove();
  const txt = buildSiteBriefing();
  m = document.createElement('div');
  m.id = 'briefing-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(13,15,14,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML =
    '<div style="max-width:640px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:24px;max-height:90vh;overflow-y:auto">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:6px">Fiche technique pour IA</h3>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">Donnees factuelles sur ce site, recalculees a l\u2019instant depuis le code lui-meme. A coller dans une IA avant de lui demander un audit ou des suggestions : elle partira de faits verifiables plutot que de suppositions.</div>'
    + '<textarea id="briefing-text" readonly style="width:100%;height:300px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:\'DM Mono\',monospace;font-size:11px;box-sizing:border-box">' + txt.replace(/</g,'&lt;') + '</textarea>'
    + '<div style="display:flex;gap:8px;margin-top:10px">'
      + '<button class="ctrl-btn" onclick="_copyBriefing()" style="flex:1">Copier la fiche</button>'
      + '<button onclick="document.getElementById(\'briefing-modal\').remove()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:8px 16px;cursor:pointer">Fermer</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(m);
}

function _copyBriefing(){
  const t = buildSiteBriefing();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(function(){
      if (typeof showToast==='function') showToast('📋 Fiche technique copiée');
    }).catch(function(){ if (typeof showToast==='function') showToast('Copie refusée par le navigateur.'); });
  }
}

function exportGameAbaPro(){
  if (typeof boardSnapshots === 'undefined' || !boardSnapshots.length) {
    if (typeof showToast === 'function') showToast('Aucun coup joué à exporter.');
    return;
  }
  const tokens = [];
  for (let i = 0; i < boardSnapshots.length; i++) {
    const mi = boardSnapshots[i].moveInfo;
    if (!mi || !mi.cells || !mi.dir) continue; // coup sans info exploitable : ignore plutot que d'exporter du faux
    const tok = moveToABAPRO(mi.cells, mi.dir, mi.type);
    if (tok) tokens.push(tok);
  }
  if (!tokens.length) {
    if (typeof showToast === 'function') showToast('Aucun coup exploitable à exporter.');
    return;
  }
  const variant = (typeof currentLayout !== 'undefined') ? currentLayout : 'standard';
  const label = (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[variant]) ? HEAT_VARIANT_LABEL[variant] : variant;
  const body = tokens.map(function(t,i){ return (i%2===0 ? (Math.floor(i/2)+1)+'.' : '') + t; }).join(' ');
  const text = '# Abalassembly — position de départ : ' + label + '\n' + body;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function(){
      if (typeof showToast === 'function') showToast('📋 ' + tokens.length + ' coups copiés (Aba-Pro)');
    }).catch(function(){
      if (typeof showToast === 'function') showToast('Copie refusée par le navigateur.');
    });
  } else if (typeof showToast === 'function') {
    showToast('Presse-papier indisponible sur ce navigateur.');
  }
}

