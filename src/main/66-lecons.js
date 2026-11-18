/* ═══════════════════════════════════════════
   SEPT LEÇONS DE DEUX MINUTES  (v3.46)
   Demande d'ocj94 : l'application concurrente propose sept lecons courtes a
   l'entree. Le site avait de quoi apprendre -- le carnet du vrai plateau,
   l'entraineur de finales, la formation des formateurs -- mais eparpille, et
   ecrit pour qui sait deja ce qu'il cherche. Ici : sept ecrans, dans l'ordre,
   pour quelqu'un qui n'a jamais vu le jeu.

   Chaque lecon tient en un ecran : un titre, trois paragraphes courts, un
   diagramme, et une ligne a retenir. Le diagramme est dessine ici meme
   (leconPlateau) plutot que par le plateau du jeu : il doit montrer une
   position figee avec des marques et une fleche, sans moteur, sans etat de
   partie, et sans risquer de toucher a une partie en cours.

   La progression vit dans progress.lecons = { n: date ISO }, donc elle suit la
   synchronisation des appareils comme le reste du profil.
═══════════════════════════════════════════ */
const LEC_LIGNES = [5, 6, 7, 8, 9, 8, 7, 6, 5];

const LECONS = [
  {
    id: 1, emo: '🎯', titre: 'Le plateau et le but', titreEn: 'The board and the goal',
    texte: [
      'Le plateau compte 61 cases en hexagone. Chaque camp commence avec 14 billes, noires contre blanches.',
      'Le but n’est pas de prendre les billes adverses : c’est de les faire <b>sortir du plateau</b>. Le premier à en éjecter six a gagné.',
      'Il n’y a pas de hasard, pas de dé, pas de carte. Tout est visible, des deux côtés.'
    ],
    texteEn: [
      'The board has 61 cells in a hexagon. Each side starts with 14 marbles, black against white.',
      'The goal is not to capture the opponent’s marbles: it is to push them <b>off the board</b>. The first to eject six wins.',
      'There is no luck, no dice, no cards. Everything is visible, to both sides.'
    ],
    retenir: 'Six billes adverses dehors, et c’est gagné.',
    retenirEn: 'Six enemy marbles out, and you have won.',
    plateau: { depart: 'standard' }
  },
  {
    id: 2, emo: '➡️', titre: 'Déplacer une, deux ou trois billes', titreEn: 'Moving one, two or three marbles',
    texte: [
      'À chaque tour tu déplaces <b>une, deux ou trois billes</b> de ta couleur, d’une seule case, dans l’une des six directions.',
      'Deux ou trois billes ne se déplacent ensemble que si elles sont <b>alignées et collées</b>. Jamais quatre.',
      'Le déplacement ci-contre est dit « en ligne » : les trois billes avancent dans le sens de leur propre alignement, l’une derrière l’autre.'
    ],
    texteEn: [
      'On each turn you move <b>one, two or three marbles</b> of your colour, by one cell, in one of six directions.',
      'Two or three marbles move together only if they are <b>in line and touching</b>. Never four.',
      'The move shown is called "in-line": the three marbles advance along their own line, one behind the other.'
    ],
    retenir: 'Une, deux ou trois billes alignées. Une case à la fois.',
    retenirEn: 'One, two or three marbles in line. One cell at a time.',
    plateau: { noires: ['e4', 'e5', 'e6'], marque: ['e4', 'e5', 'e6'], fleche: ['e6', 'e7'] }
  },
  {
    id: 3, emo: '↗️', titre: 'Le déplacement en flèche', titreEn: 'The broadside move',
    texte: [
      'Tes billes alignées peuvent aussi avancer <b>de côté</b>, toutes ensemble, perpendiculairement à leur ligne. On appelle ça un coup en flèche.',
      'Chaque bille avance d’une case : il faut donc que <b>toutes</b> les cases d’arrivée soient libres.',
      'Un coup en flèche ne pousse jamais. C’est un déplacement, rien d’autre — mais c’est souvent le plus utile pour se replacer.'
    ],
    texteEn: [
      'Marbles in line can also move <b>sideways</b>, all together, perpendicular to their line. This is called a broadside move.',
      'Each marble advances one cell: so <b>every</b> destination cell must be free.',
      'A broadside move never pushes. It is a displacement, nothing more — but it is often the most useful way to reposition.'
    ],
    retenir: 'En flèche, on se déplace de côté. On ne pousse pas.',
    retenirEn: 'Broadside moves go sideways. They do not push.',
    plateau: { noires: ['d4', 'd5', 'd6'], marque: ['d4', 'd5', 'd6'], fleche: ['d5', 'e6'] }
  },
  {
    id: 4, emo: '💪', titre: 'Pousser, c’est être plus nombreux', titreEn: 'Pushing means outnumbering',
    texte: [
      'Pour pousser les billes adverses, il faut être <b>plus nombreux</b> dans la ligne, et pousser dans le sens de cette ligne.',
      'Trois cas, et trois seulement : <b>2 contre 1</b>, <b>3 contre 1</b>, <b>3 contre 2</b>. Jamais 2 contre 2, jamais 3 contre 3 : à nombre égal, personne ne bouge.',
      'Et la case derrière les billes poussées doit être <b>libre</b> — ou hors du plateau.'
    ],
    texteEn: [
      'To push the opponent’s marbles you must <b>outnumber</b> them in the line, and push along that line.',
      'Three cases, and only three: <b>2 against 1</b>, <b>3 against 1</b>, <b>3 against 2</b>. Never 2 against 2, never 3 against 3: with equal numbers, nobody moves.',
      'And the cell behind the pushed marbles must be <b>free</b> — or off the board.'
    ],
    retenir: '2 contre 1, 3 contre 1, 3 contre 2. Rien d’autre ne pousse.',
    retenirEn: '2 v 1, 3 v 1, 3 v 2. Nothing else pushes.',
    plateau: { noires: ['e3', 'e4', 'e5'], blanches: ['e6', 'e7'], marque: ['e3', 'e4', 'e5'], fleche: ['e5', 'e6'] }
  },
  {
    id: 5, emo: '🚪', titre: 'Éjecter', titreEn: 'Ejecting',
    texte: [
      'Quand la bille poussée se trouve <b>au bord</b> et qu’il n’y a plus de case derrière elle, elle sort du plateau. Elle ne revient jamais.',
      'C’est le seul moyen de marquer. Six éjections, et la partie est finie.',
      'D’où la règle la plus simple du jeu : <b>ne laisse pas traîner tes billes au bord</b>, surtout seules.'
    ],
    texteEn: [
      'When the pushed marble is <b>at the edge</b> and there is no cell behind it, it leaves the board. It never comes back.',
      'This is the only way to score. Six ejections and the game is over.',
      'Hence the simplest rule of the game: <b>do not leave your marbles at the edge</b>, especially alone.'
    ],
    retenir: 'Une bille sortie ne revient pas. Le bord est dangereux.',
    retenirEn: 'A marble pushed out never comes back. The edge is dangerous.',
    plateau: { noires: ['c4', 'c5', 'c6'], blanches: ['c7'], marque: ['c7'], fleche: ['c7', null] }
  },
  {
    id: 6, emo: '🎯', titre: 'Le centre vaut mieux que le bord', titreEn: 'The centre beats the edge',
    texte: [
      'Depuis le centre, une bille peut partir dans <b>six directions</b>. Au bord, il en reste trois, et derrière elle, le vide.',
      'Occuper le centre, c’est donc avoir plus de coups que l’adversaire — et l’obliger à reculer.',
      'Les ouvertures classiques du jeu, Belge ou Allemande, ne font rien d’autre que se disputer ce centre dès le premier coup.'
    ],
    texteEn: [
      'From the centre a marble can go in <b>six directions</b>. At the edge only three remain, with emptiness behind it.',
      'Holding the centre therefore means having more moves than your opponent — and forcing them back.',
      'The game’s classic openings, Belgian or German, do nothing else but fight over that centre from the first move.'
    ],
    retenir: 'Prends le centre avant lui. Le bord se défend mal.',
    retenirEn: 'Take the centre first. The edge defends badly.',
    plateau: { noires: ['e5'], blanches: ['a1'], marque: ['e5', 'a1'] }
  },
  {
    id: 7, emo: '🧲', titre: 'Rester groupé', titreEn: 'Staying together',
    texte: [
      'Une bille isolée ne pousse rien et ne défend rien : il suffit de deux billes adverses pour la chasser.',
      'Un groupe compact, lui, offre des lignes de trois dans plusieurs directions à la fois — c’est de là que viennent les poussées.',
      'Si tu ne vois pas de plan, la réponse est presque toujours la même : <b>rapproche ta bille la plus mal placée</b> des autres.'
    ],
    texteEn: [
      'A lone marble pushes nothing and defends nothing: two enemy marbles are enough to chase it.',
      'A compact group, on the other hand, offers lines of three in several directions at once — that is where pushes come from.',
      'If you cannot see a plan, the answer is almost always the same: <b>bring your worst-placed marble</b> back to the others.'
    ],
    retenir: 'Groupé, tu menaces. Éparpillé, tu subis.',
    retenirEn: 'Together you threaten. Scattered you suffer.',
    plateau: { noires: ['d4', 'd5', 'e5', 'e6'], blanches: ['a2', 'i8'], marque: ['a2', 'i8'] }
  }
];

function _lecT(fr, en) { return (typeof _tr === 'function') ? _tr(fr, en) : fr; }
function _lecE(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* ── Le diagramme ──
   Un plateau fige, dessine ici plutot que par le plateau du jeu : une lecon
   doit pouvoir montrer une position et une fleche sans moteur, sans etat de
   partie, et sans jamais toucher a une partie en cours. */
function _lecXY(r, c, Wp, R) {
  return { x: Wp / 2 + (c - (LEC_LIGNES[r] - 1) / 2) * R * 2.02, y: R + 6 + r * R * 1.75 };
}
function _lecCase(nom) {
  if (!nom || typeof abaproToRc !== 'function') return null;
  const rc = abaproToRc(nom);
  return (rc && rc.r >= 0 && rc.r < 9 && rc.c >= 0 && rc.c < LEC_LIGNES[rc.r]) ? rc : null;
}
function leconPlateau(spec, W) {
  spec = spec || {};
  const Wp = Math.min(W || 340, 340), R = Wp / 20, H = Math.round(R * 1.75 * 8 + 2 * R + 12);
  /* Une disposition de depart nommee remplit le plateau depuis le moteur : la
     lecon 1 montre ainsi la vraie position de depart, pas une recopie. */
  let noires = (spec.noires || []).slice(), blanches = (spec.blanches || []).slice();
  if (spec.depart && typeof LAYOUTS !== 'undefined' && LAYOUTS[spec.depart] && typeof coordToABAPRO === 'function') {
    /* Une disposition est { black: [[r,c], ...], white: [...] } : on la lit
       telle quelle plutot que de recopier des cases a la main. */
    noires = []; blanches = [];
    const bd = LAYOUTS[spec.depart];
    (bd.black || []).forEach(function (p) { noires.push(coordToABAPRO(p[0], p[1])); });
    (bd.white || []).forEach(function (p) { blanches.push(coordToABAPRO(p[0], p[1])); });
  }
  const occ = {};
  noires.forEach(function (n) { occ[n] = 'n'; });
  blanches.forEach(function (n) { occ[n] = 'b'; });
  const marque = {}; (spec.marque || []).forEach(function (n) { marque[n] = 1; });

  let s = '<svg viewBox="0 0 ' + Wp + ' ' + H + '" width="100%" style="display:block;max-width:' + Wp + 'px;margin:0 auto" role="img" aria-label="'
    + _lecE(spec.aria || _lecT('Position du plateau', 'Board position')) + '" xmlns="http://www.w3.org/2000/svg">';
  for (let r = 0; r < 9; r++) for (let c = 0; c < LEC_LIGNES[r]; c++) {
    const nom = (typeof coordToABAPRO === 'function') ? coordToABAPRO(r, c) : '';
    const p = _lecXY(r, c, Wp, R), q = occ[nom];
    /* Trois etats qui se distinguent sur fond sombre : une bille noire presque
       noire se confondrait avec la case vide, qui est deja sombre. */
    const fond = q === 'n' ? '#2b3036' : (q === 'b' ? '#e8e6e1' : 'rgba(255,255,255,0.03)');
    const trait = q === 'n' ? '#5d666e' : (q === 'b' ? '#b9b5ac' : 'var(--border)');
    s += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (R * 0.9).toFixed(1)
      + '" fill="' + fond + '" stroke="' + trait + '" stroke-width="1"/>';
    if (marque[nom]) {
      s += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + (R * 1.14).toFixed(1)
        + '" fill="none" stroke="var(--gold)" stroke-width="2"/>';
    }
  }
  /* La fleche : de la case de depart vers la case d'arrivee. Une arrivee nulle
     veut dire « hors du plateau » -- la lecon 5 montre une ejection. */
  if (spec.fleche) {
    const a = _lecCase(spec.fleche[0]), b = _lecCase(spec.fleche[1]);
    if (a) {
      const pa = _lecXY(a.r, a.c, Wp, R);
      let pb;
      if (b) pb = _lecXY(b.r, b.c, Wp, R);
      else {   // hors du plateau : on prolonge d'une case vers l'exterieur
        const centre = _lecXY(4, 4, Wp, R);
        const dx = pa.x - centre.x, dy = pa.y - centre.y, n = Math.sqrt(dx * dx + dy * dy) || 1;
        pb = { x: pa.x + dx / n * R * 2.1, y: pa.y + dy / n * R * 2.1 };
      }
      const dx = pb.x - pa.x, dy = pb.y - pa.y, n = Math.sqrt(dx * dx + dy * dy) || 1;
      const x1 = pa.x + dx / n * R * 1.1, y1 = pa.y + dy / n * R * 1.1;
      const x2 = pb.x - dx / n * R * 0.5, y2 = pb.y - dy / n * R * 0.5;
      s += '<defs><marker id="lec-fleche" markerWidth="6" markerHeight="6" refX="4" refY="3" orient="auto">'
        + '<path d="M0,0 L6,3 L0,6 z" fill="var(--gold)"/></marker></defs>';
      s += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1)
        + '" stroke="var(--gold)" stroke-width="2.5" marker-end="url(#lec-fleche)"/>';
    }
  }
  return s + '</svg>';
}

/* ── La progression ── */
function lecEtat() {
  if (typeof progress === 'undefined' || !progress) return {};
  if (!progress.lecons || typeof progress.lecons !== 'object') progress.lecons = {};
  return progress.lecons;
}
function lecFaite(n) { return !!lecEtat()[n]; }
function lecFaites() { let k = 0; LECONS.forEach(function (l) { if (lecFaite(l.id)) k++; }); return k; }
function lecProchaine() { for (let i = 0; i < LECONS.length; i++) if (!lecFaite(LECONS[i].id)) return LECONS[i].id; return 0; }

function lecMarquer(n) {
  const st = lecEtat();
  if (!st[n]) { st[n] = new Date().toISOString(); if (typeof saveProgress === 'function') saveProgress(progress); }
  const suite = n + 1;
  if (suite <= LECONS.length) lecOuvrir(suite);
  else { _lecOuverte = 0; renderLeconsPage(); if (typeof showToast === 'function') showToast('🎓 ' + _lecT('Les sept leçons sont faites. Bonne partie !', 'All seven lessons done. Enjoy the game!')); }
}

let _lecOuverte = 0;
function lecOuvrir(n) { _lecOuverte = n; renderLeconsPage(); const h = document.getElementById('lecons-corps'); if (h && h.scrollIntoView) h.scrollIntoView({ block: 'start' }); }
function lecFermer() { _lecOuverte = 0; renderLeconsPage(); }

/* ── La page ── */
function _lecHtmlUne(l) {
  const W = (typeof grLargeur === 'function') ? Math.min(grLargeur('lecons-corps') || 340, 340) : 340;
  let h = '<div class="lec-fiche">';
  h += '<div class="lec-fil">' + _lecT('Leçon ', 'Lesson ') + l.id + ' / ' + LECONS.length + '</div>';
  h += '<h3 class="lec-titre">' + l.emo + ' ' + _lecE(_lecT(l.titre, l.titreEn)) + '</h3>';
  h += '<div class="lec-corps"><div class="lec-texte">';
  _lecT(l.texte, l.texteEn).forEach(function (p) { h += '<p>' + p + '</p>'; });
  h += '<div class="lec-retenir">💡 ' + _lecE(_lecT(l.retenir, l.retenirEn)) + '</div>';
  h += '</div><div class="lec-diag">' + leconPlateau(l.plateau, W) + '</div></div>';
  h += '<div class="lec-boutons">';
  if (l.id > 1) h += '<button class="lec-btn" data-click="lecOuvrir(' + (l.id - 1) + ')">← ' + _lecT('Précédente', 'Previous') + '</button>';
  h += '<button class="lec-btn lec-btn-or" data-click="lecMarquer(' + l.id + ')">'
    + (l.id < LECONS.length ? _lecT('Compris, suivante →', 'Got it, next →') : _lecT('Compris, terminer', 'Got it, finish')) + '</button>';
  h += '<button class="lec-btn" data-click="lecFermer()">' + _lecT('Fermer', 'Close') + '</button>';
  h += '</div></div>';
  return h;
}

function leconsHtml() {
  if (_lecOuverte) {
    const l = LECONS.filter(function (x) { return x.id === _lecOuverte; })[0];
    if (l) return _lecHtmlUne(l);
  }
  const n = lecFaites(), suivante = lecProchaine();
  let h = '<div class="lec-resume"><div class="lec-score">' + n + ' / ' + LECONS.length + '</div>';
  h += '<div class="lec-barre"><span style="width:' + Math.round(n * 100 / LECONS.length) + '%"></span></div>';
  h += '<div class="lec-suite">' + (suivante
    ? _lecT('Deux minutes par leçon. Commence par la ', 'Two minutes a lesson. Start with number ') + suivante + '.'
    : _lecT('Les sept sont faites. Tu peux les relire quand tu veux.', 'All seven done. You can read them again any time.')) + '</div></div>';
  h += '<div class="lec-liste">';
  LECONS.forEach(function (l) {
    const fait = lecFaite(l.id);
    h += '<div class="lec-carte' + (fait ? ' lec-fait' : '') + '" data-click="lecOuvrir(' + l.id + ')" role="button" tabindex="0" data-entree="lecOuvrir(' + l.id + ')">';
    h += '<span class="lec-num">' + (fait ? '✅' : l.id) + '</span>';
    h += '<span class="lec-nom">' + l.emo + ' ' + _lecE(_lecT(l.titre, l.titreEn)) + '</span>';
    h += '<span class="lec-mot">' + _lecE(_lecT(l.retenir, l.retenirEn)) + '</span></div>';
  });
  h += '</div>';
  h += '<div class="lec-apres">' + _lecT('Après ça : ', 'After that: ')
    + '<a data-click="showPage(\'learn\')" role="button" tabindex="0">' + _lecT('les règles complètes', 'the full rules') + '</a>'
    + ' · <a data-click="showPage(\'campagne\')" role="button" tabindex="0">' + _lecT('la campagne', 'the campaign') + '</a>'
    + ' · <a data-click="showPage(\'puzzles\')" role="button" tabindex="0">' + _lecT('les problèmes', 'the puzzles') + '</a></div>';
  return h;
}

function renderLeconsPage() {
  const hote = document.getElementById('lecons-corps');
  if (hote) hote.innerHTML = leconsHtml();
}
