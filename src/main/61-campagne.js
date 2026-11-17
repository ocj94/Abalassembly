/* ═══════════════════════════════════════════
   LA CAMPAGNE  (v3.41)
   Demande d'ocj94 apres avoir vu l'application « Abalone - Play Online » :
   c'etait le seul manque serieux face a elle. Vingt-quatre adversaires nommes,
   en quatre chapitres, chacun = une disposition de depart + un niveau + un
   style + parfois une contrainte (jouer les blancs, une pendule).

   Rien de nouveau sous le capot : chaque adversaire n'est qu'une configuration
   de _setupCfg passee a startConfiguredGame(). Le site a deja 189 dispositions
   et dix niveaux ; la campagne ne fait que tracer un chemin dedans, pour qui
   ouvre le site sans savoir quoi faire.

   Le suivi vit dans progress.campagne = { id: { d: date ISO, e: essais, c: coups } },
   donc il voyage avec la synchronisation des appareils (41-synchro-appareils.js).
   L'adversaire en cours est garde a part, dans localStorage, pour survivre a un
   rechargement au milieu d'une partie.
═══════════════════════════════════════════ */
const CAMP_ENCOURS = 'abaCampagneEnCours';

/* Au-dela du niveau 7, le plafond de reflexion par defaut (30 s, puis sans
   limite) rend une partie interminable sur telephone. La campagne borne donc
   la reflexion elle-meme, et chaque carte le dit : l'adversaire est fort, mais
   il repond. */
const CAMPAGNE = [
  // ── Chapitre 1 : premiers pas ──
  { id: 'galet',      nom: 'Galet',        en: 'Pebble',        emo: '🪨', niv: '1',  style: 'auto',      plateau: 'decouverte',
    mot: 'Sept billes chacun, le temps de prendre le plateau en main.',          motEn: 'Seven marbles each, just to get a feel for the board.',
    tip: 'Pousse toujours avec plus de billes que l\'autre : deux contre une, trois contre deux.', tipEn: 'Always push with more marbles than the other side: two against one, three against two.' },
  { id: 'brindille',  nom: 'Brindille',    en: 'Twig',          emo: '🌱', niv: '1',  style: 'balanced',  plateau: 'standard',
    mot: 'La vraie disposition, mais un adversaire qui ne regarde qu\'un coup devant.', motEn: 'The real layout, but an opponent that looks only one move ahead.',
    tip: 'Reste groupé. Une bille seule au bord est une bille perdue.',          tipEn: 'Stay together. A lone marble at the edge is a lost marble.' },
  { id: 'meche',      nom: 'Mèche',        en: 'Fuse',          emo: '🔥', niv: '2',  style: 'aggressive', plateau: 'standard',
    mot: 'Il attaque tout de suite. À toi de tenir.',                            motEn: 'It attacks straight away. Hold your ground.',
    tip: 'Contre un joueur pressé, laisse-le venir : il se déséquilibre tout seul.', tipEn: 'Against a hasty player, let them come: they unbalance themselves.' },
  { id: 'marguerite', nom: 'Marguerite',   en: 'Daisy',         emo: '🌼', niv: '2',  style: 'defensive', plateau: 'belgian',
    mot: 'La Belgian Daisy : quatre paquets, tout se joue au centre.',           motEn: 'The Belgian Daisy: four clumps, everything happens in the centre.',
    tip: 'Occupe le centre avant lui. Depuis le centre, on pousse dans six directions.', tipEn: 'Take the centre first. From the centre you push in six directions.' },
  { id: 'boussole',   nom: 'Boussole',     en: 'Compass',       emo: '🧭', niv: '3',  style: 'balanced',  plateau: 'german',
    mot: 'La German Daisy, plus écartée : les distances comptent.',              motEn: 'The German Daisy, more spread out: distances matter.',
    tip: 'Compte tes lignes de trois avant de bouger : ce sont elles qui poussent.', tipEn: 'Count your lines of three before moving: they are what pushes.' },
  { id: 'muraille',   nom: 'Muraille',     en: 'Rampart',       emo: '🧱', niv: '3',  style: 'divide',    plateau: 'the_wall',
    mot: 'Deux murs face à face. Il cherche à te couper en deux.',               motEn: 'Two walls facing each other. It tries to cut you in half.',
    tip: 'Un groupe coupé en deux ne pousse plus rien. Garde un pont entre tes moitiés.', tipEn: 'A group cut in two pushes nothing. Keep a bridge between your halves.' },
  // ── Chapitre 2 : le camp d'entraînement ──
  { id: 'tulipe',     nom: 'Tulipe',       en: 'Tulip',         emo: '🌷', niv: '4',  style: 'aggressive', plateau: 'dutch',
    mot: 'La Dutch Daisy. Il voit trois coups devant et il en profite.',         motEn: 'The Dutch Daisy. It sees three moves ahead and uses them.',
    tip: 'Avant de pousser, regarde ce qu\'il pousse en retour au coup suivant.', tipEn: 'Before pushing, look at what it pushes back on the next move.' },
  { id: 'edelweiss',  nom: 'Edelweiss',    en: 'Edelweiss',     emo: '🏔️', niv: '4',  style: 'defensive', plateau: 'swiss',
    mot: 'La Swiss Daisy, et un adversaire qui ne lâche rien.',                  motEn: 'The Swiss Daisy, and an opponent that gives nothing away.',
    tip: 'Contre une défense, vise le bord : une bille adverse au bord vaut une menace permanente.', tipEn: 'Against a defence, aim for the edge: an enemy marble at the edge is a standing threat.' },
  { id: 'cratere',    nom: 'Cratère',      en: 'Crater',        emo: '🌋', niv: '5',  style: 'balanced',  plateau: 'fujiyama',
    mot: 'Fujiyama : une montagne de billes au milieu.',                         motEn: 'Fujiyama: a mountain of marbles in the middle.',
    tip: 'Un gros tas est lourd à déplacer. Prends les côtés pendant qu\'il se dénoue.', tipEn: 'A big heap is slow to move. Take the sides while it untangles.' },
  { id: 'vipere',     nom: 'Vipère',       en: 'Viper',         emo: '🐍', niv: '5',  style: 'divide',    plateau: 'snakes', blancs: true,
    mot: 'Tu joues les blancs : c\'est lui qui ouvre.',                          motEn: 'You play White: it opens.',
    tip: 'Jouer second, c\'est répondre. Regarde son premier coup avant de choisir ton plan.', tipEn: 'Playing second means answering. Watch its first move before choosing a plan.' },
  { id: 'etoile',     nom: 'Étoile',       en: 'Star',          emo: '⭐', niv: '5',  style: 'aggressive', plateau: 'star',
    mot: 'Une étoile à six branches, et un joueur qui frappe.',                  motEn: 'A six-pointed star, and a player that strikes.',
    tip: 'Les branches sont des lignes toutes faites : sers-t\'en avant qu\'il les casse.', tipEn: 'The points are ready-made lines: use them before it breaks them.' },
  { id: 'pacte',      nom: 'Pacte',        en: 'Pact',          emo: '🤝', niv: '6',  style: 'defensive', plateau: 'alliances',
    mot: 'Alliances : des groupes mêlés dès le départ.',                         motEn: 'Alliances: groups already tangled at the start.',
    tip: 'Quand tout est mêlé, compte d\'abord les poussées possibles contre toi.', tipEn: 'When everything is tangled, first count the pushes available against you.' },
  // ── Chapitre 3 : les tacticiens ──
  { id: 'suzerain',   nom: 'Suzerain',     en: 'Overlord',      emo: '🛡️', niv: '6',  style: 'divide',    plateau: 'domination',
    mot: 'Domination. Il veut le centre, et il le veut tout de suite.',          motEn: 'Domination. It wants the centre, and it wants it now.',
    tip: 'Céder le centre n\'est pas perdre : une bille au centre adverse est encerclée.', tipEn: 'Giving up the centre is not losing: a marble in their centre is surrounded.' },
  { id: 'obelisque',  nom: 'Obélisque',    en: 'Obelisk',       emo: '🔺', niv: '6',  style: 'balanced',  plateau: 'pyramide', cadence: '300+0',
    mot: 'Cinq minutes chacun. La pendule tourne.',                              motEn: 'Five minutes each. The clock is running.',
    tip: 'À la pendule, joue vite les coups évidents : garde ton temps pour les positions serrées.', tipEn: 'On the clock, play obvious moves fast: save your time for the tight positions.' },
  { id: 'duel',       nom: 'Duel',         en: 'Duel',          emo: '⚔️', niv: '7',  style: 'aggressive', plateau: 'face_a_face', reflexion: 8,
    mot: 'Face à face, sans détour. Il réfléchit 8 secondes au plus.',           motEn: 'Face to face, no detour. It thinks for 8 seconds at most.',
    tip: 'Dans un choc frontal, celui qui ajoute la troisième bille à sa ligne gagne la poussée.', tipEn: 'In a head-on clash, whoever adds the third marble to their line wins the push.' },
  { id: 'atome',      nom: 'Atome',        en: 'Atom',          emo: '⚛️', niv: '7',  style: 'defensive', plateau: 'atomouche', reflexion: 8,
    mot: 'Atomouche : des billes éparpillées, rien d\'évident.',                 motEn: 'Atomouche: scattered marbles, nothing obvious.',
    tip: 'Billes éparpillées : regroupe avant d\'attaquer, même si ça coûte trois coups.', tipEn: 'Scattered marbles: regroup before attacking, even if it costs three moves.' },
  { id: 'tourbillon', nom: 'Tourbillon',   en: 'Whirl',         emo: '🌀', niv: '7',  style: 'divide',    plateau: 'centrifuge', blancs: true, reflexion: 8,
    mot: 'Centrifugeuse, et tu joues les blancs.',                               motEn: 'Centrifuge, and you play White.',
    tip: 'Tout part vers l\'extérieur : la première bille qui revient au centre prend l\'avantage.', tipEn: 'Everything drifts outward: the first marble back to the centre takes the edge.' },
  { id: 'dedale',     nom: 'Dédale',       en: 'Maze',          emo: '🧩', niv: '8',  style: 'balanced',  plateau: 'labyrinth', reflexion: 8,
    mot: 'Labyrinthe. Huit coups devant, huit secondes de réflexion.',           motEn: 'Labyrinth. Eight moves ahead, eight seconds of thought.',
    tip: 'Quand tu ne vois pas de plan, améliore la bille la plus mal placée.',  tipEn: 'When you see no plan, improve your worst-placed marble.' },
  // ── Chapitre 4 : les maîtres ──
  { id: 'margueritedor', nom: 'Marguerite d\'or', en: 'Golden Daisy', emo: '🏵️', niv: '8', style: 'aggressive', plateau: 'true_daisy', cadence: '180+2', reflexion: 8,
    mot: 'True Daisy, trois minutes et deux secondes par coup. Blitz.',          motEn: 'True Daisy, three minutes plus two seconds a move. Blitz.',
    tip: 'En blitz, une règle simple vaut mieux qu\'un calcul : pousse, regroupe, recommence.', tipEn: 'In blitz, a simple rule beats calculation: push, regroup, repeat.' },
  { id: 'vitrail',    nom: 'Vitrail',      en: 'Stained Glass', emo: '🪟', niv: '8',  style: 'divide',    plateau: 'mosaic', reflexion: 8,
    mot: 'Mosaïque : un damier de billes, et il cherche la faille.',             motEn: 'Mosaic: a checkerboard of marbles, and it hunts for the crack.',
    tip: 'Un damier n\'a presque pas de lignes de trois. Construis-en une, tu auras l\'initiative.', tipEn: 'A checkerboard has almost no lines of three. Build one and you hold the initiative.' },
  { id: 'diademe',    nom: 'Diadème',      en: 'Diadem',        emo: '💎', niv: '9',  style: 'defensive', plateau: 'crown', reflexion: 10,
    mot: 'Couronne. Neuvième niveau : il ne fait plus de cadeau.',               motEn: 'Crown. Ninth level: no more gifts.',
    tip: 'À ce niveau, une bille perdue ne se rattrape pas. Ne pousse que si tu as compté la réponse.', tipEn: 'At this level a lost marble never comes back. Push only once you have counted the reply.' },
  { id: 'citadelle',  nom: 'Citadelle',    en: 'Citadel',       emo: '🏰', niv: '9',  style: 'balanced',  plateau: 'eq_citadelle', blancs: true, reflexion: 10,
    mot: 'Une position équilibrée, et tu joues second.',                         motEn: 'A balanced position, and you play second.',
    tip: 'Position équilibrée : la partie se gagne sur une seule erreur. Ne te presse pas.', tipEn: 'Balanced position: the game turns on a single mistake. Take your time.' },
  { id: 'comete',     nom: 'Comète',       en: 'Comet',         emo: '☄️', niv: '9',  style: 'aggressive', plateau: 'eq_comete', reflexion: 10,
    mot: 'Le dernier avant le maître. Il attaque et il calcule.',                motEn: 'The last one before the master. It attacks and it calculates.',
    tip: 'Contre une attaque calculée, cherche l\'échange : une bille contre une bille te convient.', tipEn: 'Against a calculated attack, seek the trade: one marble for one suits you.' },
  { id: 'vieuxmaitre', nom: 'Le Vieux Maître', en: 'The Old Master', emo: '🎓', niv: '10', style: 'auto', plateau: 'standard', blancs: true, cadence: '300+0', reflexion: 15,
    mot: 'Disposition standard, rien à cacher. Tu joues les blancs, cinq minutes, et il réfléchit quinze secondes par coup.', motEn: 'Standard layout, nothing hidden. You play White, five minutes, and it thinks fifteen seconds a move.',
    tip: 'Il n\'y a pas de truc. Joue ta meilleure partie, et relis-la ensuite dans l\'Observatoire.', tipEn: 'There is no trick. Play your best game, then read it back in the Observatory.' }
];

const CAMP_CHAPITRES = [
  { debut: 0,  nom: 'Premiers pas',            en: 'First steps' },
  { debut: 6,  nom: 'Le camp d\'entraînement', en: 'Training camp' },
  { debut: 12, nom: 'Les tacticiens',          en: 'The tacticians' },
  { debut: 18, nom: 'Les maîtres',             en: 'The masters' }
];

function _campT(fr, en) { return (typeof _tr === 'function') ? _tr(fr, en) : fr; }
function _campE(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function _campNom(a) { return _campT(a.nom, a.en || a.nom); }

/* Le nom lisible d'une disposition. Les variantes historiques ont leur libelle
   dans HEAT_VARIANT_LABEL ; les dispositions inventees (eq_, av_, sr_, ce_) ont
   le leur dans les tables de 21-variants-and-puzzles.js. On cherche dans les
   deux plutot que de recopier un nom qui pourrait diverger. */
function campNomPlateau(cle) {
  if (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[cle]) return HEAT_VARIANT_LABEL[cle];
  const tables = [];
  if (typeof DEPARTS_INVENTES !== 'undefined') tables.push(DEPARTS_INVENTES);
  if (typeof DEPARTS_AVANCE !== 'undefined') tables.push(DEPARTS_AVANCE);
  if (typeof DEPARTS_V304 !== 'undefined') tables.push(DEPARTS_V304);
  for (let t = 0; t < tables.length; t++) {
    for (let i = 0; i < tables[t].length; i++) if (tables[t][i] && tables[t][i].cle === cle) return tables[t][i].nom;
  }
  return cle;
}

/* L'etat de la campagne, toujours un objet. Il vit dans progress pour suivre la
   synchronisation des appareils ; sanitizeProgress() n'a pas besoin de le connaitre. */
function campEtat() {
  if (typeof progress === 'undefined' || !progress) return {};
  if (!progress.campagne || typeof progress.campagne !== 'object') progress.campagne = {};
  return progress.campagne;
}
function campFait(id) { const e = campEtat()[id]; return !!(e && e.d); }
function campIndex(id) { for (let i = 0; i < CAMPAGNE.length; i++) if (CAMPAGNE[i].id === id) return i; return -1; }
/* Ouvert = le precedent est battu. Le premier l'est toujours. */
function campOuvert(i) { return i <= 0 || campFait(CAMPAGNE[i - 1].id); }
function campVictoires() { let n = 0; for (let i = 0; i < CAMPAGNE.length; i++) if (campFait(CAMPAGNE[i].id)) n++; return n; }
/* Le prochain adversaire a battre, ou null quand la campagne est finie. */
function campProchain() { for (let i = 0; i < CAMPAGNE.length; i++) if (!campFait(CAMPAGNE[i].id)) return CAMPAGNE[i]; return null; }

function campEnCours() { try { return localStorage.getItem(CAMP_ENCOURS) || ''; } catch (e) { return ''; } }
function _campPoserEnCours(id) { try { if (id) localStorage.setItem(CAMP_ENCOURS, id); else localStorage.removeItem(CAMP_ENCOURS); } catch (e) { } }

/* Lance la partie contre un adversaire : rien de plus qu'une configuration
   normale, celle de l'ecran « Jouer », remplie d'office. */
function campLancer(id) {
  const i = campIndex(id); if (i < 0) return;
  const a = CAMPAGNE[i];
  if (!campOuvert(i)) { if (typeof showToast === 'function') showToast('🔒 ' + _campT('Bats d\'abord l\'adversaire précédent.', 'Beat the previous opponent first.')); return; }
  if (typeof _setupCfg === 'undefined' || typeof startConfiguredGame !== 'function') return;
  _setupCfg.layout = a.plateau;
  _setupCfg.mode = 'ai';
  _setupCfg.first = a.blancs ? 'white' : 'black';
  _setupCfg.style = a.style;
  _setupCfg.diff = a.niv;
  _setupCfg.time = a.cadence || '';
  _setupCfg.reflexion = (a.reflexion === undefined) ? undefined : a.reflexion;
  _setupCfg.engine = 'actuel';
  _campPoserEnCours(id);
  startConfiguredGame();
  if (typeof showToast === 'function') showToast(a.emo + ' ' + _campT('Campagne : ', 'Campaign: ') + _campNom(a));
}

/* Appele a la fin de chaque partie par triggerWin(). Une partie ne compte que
   si elle a vraiment ete jouee contre CET adversaire : meme disposition, meme
   niveau, contre l'IA, au moins un coup. Sinon on ne compte rien — pas meme un
   essai — plutot que de créditer une victoire qui n'a pas eu lieu. */
function campagneFinDePartie(jeGagne) {
  const id = campEnCours(); if (!id) return null;
  _campPoserEnCours('');
  const i = campIndex(id); if (i < 0) return null;
  const a = CAMPAGNE[i];
  const mode = (typeof GameMode !== 'undefined') ? GameMode.get() : 'ai';
  const plateau = (typeof currentLayout !== 'undefined') ? currentLayout : '';
  const coups = (typeof MoveCount !== 'undefined') ? MoveCount.get() : 0;
  if (mode !== 'ai' || plateau !== a.plateau || coups < 1) return null;
  if (typeof _setupCfg !== 'undefined' && String(_setupCfg.diff) !== String(a.niv)) return null;
  const st = campEtat(), e = st[id] || { e: 0 };
  e.e = (e.e || 0) + 1;
  if (jeGagne && !e.d) { e.d = new Date().toISOString(); e.c = coups; }
  st[id] = e;
  if (typeof saveProgress === 'function') saveProgress(progress);
  if (jeGagne) {
    const suite = CAMPAGNE[i + 1];
    if (typeof showToast === 'function') {
      showToast(suite ? ('🏅 ' + _campT('Campagne : ', 'Campaign: ') + _campNom(a) + _campT(' est battu. Prochain : ', ' is beaten. Next: ') + _campNom(suite))
                      : ('🎓 ' + _campT('Campagne terminée : les vingt-quatre sont battus.', 'Campaign complete: all twenty-four are beaten.')));
    }
  }
  return e;
}

/* ── La page ── */
function _campHtmlCarte(a, i, premierFerme) {
  const ouvert = campOuvert(i), fait = campFait(a.id), e = campEtat()[a.id] || {};
  const niv = _campT('niveau ', 'level ') + a.niv;
  const style = { auto: _campT('auto', 'auto'), balanced: _campT('équilibré', 'balanced'), aggressive: _campT('agressif', 'aggressive'),
                  defensive: _campT('défensif', 'defensive'), divide: _campT('division', 'divide') }[a.style] || a.style;
  const nomPlateau = campNomPlateau(a.plateau);
  const marques = [];
  if (a.blancs) marques.push(_campT('tu joues les blancs', 'you play White'));
  if (a.cadence) marques.push(_campT('pendule ', 'clock ') + a.cadence.replace('+', ' + ').replace(/^(\d+)/, function (m) { return (parseInt(m, 10) / 60) + ' min'; }));
  if (a.reflexion) marques.push(_campT('réflexion ', 'thinking ') + a.reflexion + ' s');
  let h = '<div class="camp-carte' + (fait ? ' camp-fait' : '') + (ouvert ? '' : ' camp-ferme') + '">';
  h += '<div class="camp-tete"><span class="camp-emo">' + (ouvert ? a.emo : '🔒') + '</span>';
  h += '<span class="camp-nom">' + _campE(ouvert ? _campNom(a) : _campT('Verrouillé', 'Locked')) + '</span>';
  h += '<span class="camp-niv">' + _campE(nomPlateau + ' · ' + niv + ' · ' + style) + '</span></div>';
  if (ouvert) {
    h += '<div class="camp-mot">' + _campE(_campT(a.mot, a.motEn || a.mot)) + '</div>';
    if (marques.length) h += '<div class="camp-marques">' + marques.map(function (m) { return '<span class="camp-marque">' + _campE(m) + '</span>'; }).join('') + '</div>';
    h += '<div class="camp-tip">💡 ' + _campE(_campT(a.tip, a.tipEn || a.tip)) + '</div>';
    if (fait) {
      h += '<div class="camp-bilan">✅ ' + _campT('Battu', 'Beaten')
        + (e.c ? _campT(' en ', ' in ') + e.c + _campT(' coups', ' moves') : '')
        + (e.e > 1 ? _campT(', en ', ', in ') + e.e + _campT(' essais', ' tries') : '') + '.</div>';
    } else if (e.e) {
      h += '<div class="camp-bilan camp-essais">' + e.e + ' ' + (e.e > 1 ? _campT('essais', 'tries') : _campT('essai', 'try')) + _campT(', pas encore battu.', ', not beaten yet.') + '</div>';
    }
    h += '<button class="camp-btn" data-click="campLancer(\'' + a.id + '\')">'
      + (fait ? _campT('Rejouer', 'Play again') : _campT('Jouer', 'Play')) + '</button>';
  } else if (premierFerme) {
    /* La consigne une seule fois, sur le premier verrou : repetee sur vingt-trois
       cartes, elle ne disait plus rien et noyait la page. */
    h += '<div class="camp-mot">' + _campT('Bats l\'adversaire précédent pour l\'ouvrir.', 'Beat the previous opponent to unlock.') + '</div>';
  }
  return h + '</div>';
}

function campagneHtml() {
  const n = campVictoires(), tot = CAMPAGNE.length, suivant = campProchain();
  let h = '<div class="camp-resume">';
  h += '<div class="camp-score">' + n + ' / ' + tot + '</div>';
  h += '<div class="camp-barre"><span style="width:' + Math.round(n * 100 / tot) + '%"></span></div>';
  h += '<div class="camp-suite">' + (suivant
    ? _campT('Prochain adversaire : ', 'Next opponent: ') + _campE(suivant.emo + ' ' + _campNom(suivant))
    : _campT('Les vingt-quatre sont battus. 🎓', 'All twenty-four are beaten. 🎓')) + '</div>';
  h += '</div>';
  /* Le premier adversaire encore ferme : le seul a porter la consigne. */
  let premier = -1;
  for (let i = 0; i < CAMPAGNE.length; i++) if (!campOuvert(i)) { premier = i; break; }
  CAMP_CHAPITRES.forEach(function (ch, k) {
    const fin = (k + 1 < CAMP_CHAPITRES.length) ? CAMP_CHAPITRES[k + 1].debut : CAMPAGNE.length;
    let faits = 0; for (let i = ch.debut; i < fin; i++) if (campFait(CAMPAGNE[i].id)) faits++;
    h += '<div class="camp-chapitre">' + _campE(_campT(ch.nom, ch.en)) + ' <span>' + faits + '/' + (fin - ch.debut) + '</span></div>';
    h += '<div class="camp-grille">';
    for (let i = ch.debut; i < fin; i++) h += _campHtmlCarte(CAMPAGNE[i], i, i === premier);
    h += '</div>';
  });
  return h;
}

function renderCampagnePage() {
  const hote = document.getElementById('campagne-corps');
  if (hote) hote.innerHTML = campagneHtml();
}

/* Une ligne pour le profil : ou en est la campagne, sans ouvrir la page. */
function campagneLigneProfil() {
  const n = campVictoires(), suivant = campProchain();
  return '<div class="camp-ligne" data-click="showPage(\'campagne\')">'
    + '<span class="camp-ligne-t">⚔️ ' + _campT('Campagne', 'Campaign') + '</span>'
    + '<span class="camp-ligne-n">' + n + ' / ' + CAMPAGNE.length + '</span>'
    + '<span class="camp-ligne-s">' + (suivant ? _campE(suivant.emo + ' ' + _campNom(suivant)) : '🎓') + '</span></div>';
}
