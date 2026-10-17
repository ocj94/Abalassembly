/* ═══════════════════════════════════════════
   APPRENDRE SUR UN VRAI PLATEAU (v2.61)
   Pour les tout-petits (des 2 ans), loin des ecrans : demande d'Olivier,
   qui veut apprendre Abalone a deux enfants de 2 et 3 ans « sans traumas
   et sans les degouter des jeux de plateau ».
   - Securite d'abord : la boite d'Abalone ne convient pas aux moins de
     3 ans (petits elements) et vise 6-7 ans ; avant 3 ans, pas de vraies
     billes, un plateau geant au sol avec de gros objets.
   - Huit etapes courtes, chacune un petit jeu, avec un schema dessine ici
     (SVG, sans image externe), « c'est acquis quand » et « si ca coince ».
     Les schemas des etapes 7 et 8 viennent des dispositions du moteur
     (LAYOUTS.decouverte = le Mode Enfant, LAYOUTS.standard), pas d'une copie.
   - Un carnet de progres pour plusieurs enfants : les prenoms et les dates
     restent dans le localStorage de l'appareil, ils ne partent nulle part.
   - Fiche imprimable (bouton Imprimer, regles @media print dans le CSS).
   Francais et anglais : tout le texte passe par _tr(fr, en) ; la page se
   redessine quand on change de langue (setLanguage).
═══════════════════════════════════════════ */

const _VP_CLE = 'abaPlateauCarnet';
const _VP_MAX_ENFANTS = 4;
let _vpSvgN = 0;

function _vpEsc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ─── Schemas ─────────────────────────────── */

// Bois clair, trous, billes en degrade : lisible sur les themes sombres comme clairs, et a l'impression.
const _VP_BOIS = '#dcb97f', _VP_BOIS_BORD = '#9a7038', _VP_TROU = 'rgba(92,58,22,0.30)', _VP_FLECHE = '#1d5fa8';

function _vpDefs(id) {
  return '<defs>'
    + '<radialGradient id="' + id + 'n" cx="35%" cy="30%" r="72%"><stop offset="0" stop-color="#77777d"/><stop offset="0.42" stop-color="#2a2a2f"/><stop offset="1" stop-color="#0a0a0c"/></radialGradient>'
    + '<radialGradient id="' + id + 'b" cx="35%" cy="30%" r="72%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.6" stop-color="#eee8dc"/><stop offset="1" stop-color="#b8ae9c"/></radialGradient>'
    + '<marker id="' + id + 'f" viewBox="0 0 10 10" refX="6" refY="5" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="' + _VP_FLECHE + '"/></marker>'
    + '</defs>';
}

function _vpBille(x, y, r, c, id) {
  return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="url(#' + id + (c === 'b' ? 'n' : 'b') + ')" stroke="'
    + (c === 'b' ? '#000' : '#8a806f') + '" stroke-width="0.9" data-bille="' + c + '"/>';
}

// Fleche avec un liseré blanc : visible sur le bois comme sur une bille noire.
function _vpFleche(x1, y1, x2, y2, id) {
  const d = 'M' + x1.toFixed(1) + ',' + y1.toFixed(1) + ' L' + x2.toFixed(1) + ',' + y2.toFixed(1);
  return '<path d="' + d + '" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.85"/>'
    + '<path d="' + d + '" stroke="' + _VP_FLECHE + '" stroke-width="3" stroke-linecap="round" marker-end="url(#' + id + 'f)"/>';
}

/* Plateau hexagonal. o.rangees : longueurs des rangees ([3,4,5,4,3] : le petit plateau de 19 cases ;
   [5,6,7,8,9,8,7,6,5] : le vrai, 61 cases) ; o.billes : { 'r,c': 'b'|'w' } ; o.fleches : [{ de:[r,c],
   dir:'E'|'O'|'NE'|'NO'|'SE'|'SO', pas, num }] ; o.fantomes : [[r,c]] cases d'arrivee en pointille ;
   o.titre : description lue par les lecteurs d'ecran ; o.ecart : distance entre cases, en rayons de bille
   (2,45 comme un vrai plateau ; plus grand sur le petit plateau, pour laisser la place aux fleches). */
function _vpSvgHex(o) {
  const id = 'vp' + (++_vpSvgN) + '_';
  const R = o.r || 13, dx = R * (o.ecart || 2.45), dy = dx * 0.8660254, M = R + 18;
  const L = o.rangees, max = Math.max.apply(null, L), n = L.length, mid = (n - 1) / 2;
  const P = function (r, c) { return [M + ((max - L[r]) / 2 + c) * dx, M + r * dy]; };
  const W = 2 * M + (max - 1) * dx, H = 2 * M + (n - 1) * dy;
  const cx = W / 2, cy = H / 2, k = (R + 11) / 0.8660254;
  const coins = [P(0, 0), P(0, L[0] - 1), P(mid, max - 1), P(n - 1, L[n - 1] - 1), P(n - 1, 0), P(mid, 0)].map(function (p) {
    const vx = p[0] - cx, vy = p[1] - cy, d = Math.sqrt(vx * vx + vy * vy) || 1;
    return (p[0] + vx / d * k).toFixed(1) + ',' + (p[1] + vy / d * k).toFixed(1);
  });
  let s = '<svg viewBox="0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0) + '" role="img" aria-label="' + _vpEsc(o.titre || '') + '" xmlns="http://www.w3.org/2000/svg">'
    + _vpDefs(id)
    + '<polygon points="' + coins.join(' ') + '" fill="' + _VP_BOIS + '" stroke="' + _VP_BOIS_BORD + '" stroke-width="3" stroke-linejoin="round"/>';
  for (let r = 0; r < n; r++) for (let c = 0; c < L[r]; c++) {
    const p = P(r, c);
    s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + (R * 0.78).toFixed(1) + '" fill="' + _VP_TROU + '"/>';
  }
  (o.fantomes || []).forEach(function (f) {
    const p = P(f[0], f[1]);
    s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="' + R + '" fill="none" stroke="' + _VP_FLECHE + '" stroke-width="2" stroke-dasharray="4 3"/>';
  });
  Object.keys(o.billes || {}).forEach(function (cle) {
    const rc = cle.split(','), p = P(+rc[0], +rc[1]);
    s += _vpBille(p[0], p[1], R, o.billes[cle], id);
  });
  const V = { E: [1, 0], O: [-1, 0], NE: [0.5, -1], NO: [-0.5, -1], SE: [0.5, 1], SO: [-0.5, 1] };
  (o.fleches || []).forEach(function (f) {
    const p = P(f.de[0], f.de[1]), v = V[f.dir], pas = f.pas || 1;
    const ex = v[0] * dx * pas, ey = v[1] * dy * pas, lg = Math.sqrt(ex * ex + ey * ey), ux = ex / lg, uy = ey / lg;
    // du bord de la bille jusqu'au creux de la case d'arrivee
    s += _vpFleche(p[0] + ux * (R + 1), p[1] + uy * (R + 1), p[0] + ex - ux * R * 0.2, p[1] + ey - uy * R * 0.2, id);
    if (f.num) {
      const mx = p[0] + ex / 2 - uy * 13, my = p[1] + ey / 2 + ux * 13;
      s += '<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="8" fill="#fff" stroke="' + _VP_FLECHE + '" stroke-width="1.5"/>'
        + '<text x="' + mx.toFixed(1) + '" y="' + (my + 4).toFixed(1) + '" text-anchor="middle" font-size="11" font-weight="700" fill="' + _VP_FLECHE + '" font-family="sans-serif">' + _vpEsc(f.num) + '</text>';
    }
  });
  return s + '</svg>';
}

/* Une ligne du plateau, pour les poussees. o.cases : '.bbw..' ('.' vide, 'b' noire, 'w' blanche) ;
   les Noires poussent vers la droite ; o.ok : la poussee est permise (✓) ou non (✗) ;
   o.bord : le plateau s'arrete apres la derniere case, avec la « piscine » (un bol) juste apres. */
function _vpSvgLigne(o) {
  const id = 'vp' + (++_vpSvgN) + '_';
  const R = 12, dx = 29, n = o.cases.length, M = 18, haut = 30, yc = haut + R + 6;
  const x = function (i) { return M + R + i * dx; };
  const finPlateau = x(n - 1) + R + 8, piscine = o.bord ? finPlateau + 34 : 0;
  const W = (o.bord ? piscine + 30 : finPlateau + 8) + 26, H = yc + R + 22;
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + _vpEsc(o.titre || '') + '" xmlns="http://www.w3.org/2000/svg">' + _vpDefs(id)
    + '<rect x="' + (M - 4) + '" y="' + (yc - R - 8) + '" width="' + (finPlateau - M + 4) + '" height="' + (2 * R + 16) + '" rx="' + (o.bord ? 4 : 12) + '" fill="' + _VP_BOIS + '" stroke="' + _VP_BOIS_BORD + '" stroke-width="2.5"/>';
  if (o.bord) {
    // le bord du plateau, bien marque, puis le bol
    s += '<line x1="' + finPlateau + '" y1="' + (yc - R - 12) + '" x2="' + finPlateau + '" y2="' + (yc + R + 12) + '" stroke="' + _VP_BOIS_BORD + '" stroke-width="5" stroke-linecap="round"/>'
      + '<path d="M' + (piscine - 22) + ',' + (yc + 2) + ' A22,16 0 0 0 ' + (piscine + 22) + ',' + (yc + 2) + ' Z" fill="#8fd0f5" stroke="#2f86c4" stroke-width="2"/>'
      + _vpBille(piscine, yc + 6, R - 2, 'w', id);
  }
  for (let i = 0; i < n; i++) s += '<circle cx="' + x(i) + '" cy="' + yc + '" r="' + (R * 0.78).toFixed(1) + '" fill="' + _VP_TROU + '"/>';
  for (let i = 0; i < n; i++) if (o.cases[i] !== '.') {
    const part = o.bord && i === n - 1;   // la bille du bord, qui part dans le bol : pale
    s += (part ? '<g opacity="0.4">' : '') + _vpBille(x(i), yc, R, o.cases[i], id) + (part ? '</g>' : '');
  }
  const noires = [];
  for (let i = 0; i < n; i++) if (o.cases[i] === 'b') noires.push(i);
  if (noires.length) {
    // au bord, la fleche s'arrete au-dessus de la bille qui part : la courbe vers le bol prend le relais
    const a = x(noires[0]) - R * 0.4, b = o.bord ? x(n - 1) : x(noires[noires.length - 1]) + dx * (o.ok ? 0.9 : 0.55);
    s += _vpFleche(a, haut - 8, b, haut - 8, id);
  }
  if (o.bord) {
    // la bille du bord part dans le bol : une courbe en pointille
    const xb = x(n - 1);
    s += '<path d="M' + xb + ',' + (yc - R - 2) + ' Q' + ((xb + piscine) / 2 + 6) + ',' + (yc - R - 30) + ' ' + piscine + ',' + (yc - 12) + '" fill="none" stroke="#2f86c4" stroke-width="2" stroke-dasharray="4 3"/>';
  }
  const mx = W - 14;
  s += '<text x="' + mx + '" y="' + (yc + 7) + '" text-anchor="middle" font-size="22" font-weight="700" font-family="sans-serif" fill="' + (o.ok ? '#2e9d5b' : '#c0392b') + '">' + (o.ok ? '✓' : '✗') + '</text>';
  return s + '</svg>';
}

// Disposition du moteur -> { 'r,c': 'b'|'w' }
function _vpDisposition(nom) {
  const L = (typeof LAYOUTS !== 'undefined' && LAYOUTS[nom]) ? LAYOUTS[nom] : null, b = {};
  if (!L) return b;
  L.black.forEach(function (p) { b[p[0] + ',' + p[1]] = 'b'; });
  L.white.forEach(function (p) { b[p[0] + ',' + p[1]] = 'w'; });
  return b;
}

const _VP_PETIT = [3, 4, 5, 4, 3], _VP_GRAND = [5, 6, 7, 8, 9, 8, 7, 6, 5];

/* ─── Contenu ─────────────────────────────── */

function _vpEtapes() {
  return [
    { n: 1, ic: '🏠', titre: _tr('Une bille par maison', 'One marble per house'),
      age: _tr('dès 2 ans, avec des objets géants', 'from age 2, with giant objects'),
      but: _tr('Découvrir le plateau, trier les deux couleurs, poser un objet par case.', 'Discover the board, sort the two colours, put one object on each spot.'),
      jeu: _tr('<b>Le plateau géant</b> : au sol, 19 cases en 5 rangées de 3, 4, 5, 4 et 3 — des assiettes en carton, des ronds de papier ou du ruban de peintre. Comme « billes » : des objets de deux couleurs <b>trop gros pour passer dans un rouleau de papier toilette</b> (gros cubes de construction, gobelets retournés, balles de tennis). <b>Le jeu</b> : « Chaque bille veut sa maison » — il pose un objet par case. Puis on trie : les noirs d’un côté, les blancs de l’autre. Dès 3 ans, le même jeu marche sur le vrai plateau, avec un adulte.',
        '<b>The giant board</b>: on the floor, 19 spots in 5 rows of 3, 4, 5, 4 and 3 — paper plates, paper circles or painter’s tape. As “marbles”: objects in two colours that are <b>too big to fit through a toilet-paper tube</b> (big building blocks, upside-down cups, tennis balls). <b>The game</b>: “Every marble wants its house” — the child puts one object on each spot. Then sort them: dark on one side, light on the other. From age 3 the same game works on the real board, with an adult.'),
      schema: function () { return _vpSvgHex({ rangees: _VP_PETIT, ecart: 2.85, billes: { '0,0': 'b', '0,2': 'w', '1,1': 'w', '2,2': 'b', '2,4': 'w', '3,0': 'b', '4,1': 'w', '4,2': 'b' },
        titre: _tr('Le petit plateau de 19 cases, quelques billes posées, une par case', 'The small 19-spot board, a few marbles placed, one per spot') }); },
      legende: _tr('Le petit plateau : 19 cases (3, 4, 5, 4, 3). Une seule bille par case.', 'The small board: 19 spots (3, 4, 5, 4, 3). Only one marble per spot.'),
      acquis: _tr('il pose un seul objet par case et sépare les deux couleurs.', 'they put only one object per spot and separate the two colours.'),
      coince: _tr('moins de cases (7 : une fleur), une seule couleur au début.', 'fewer spots (7: a flower), a single colour at first.') },

    { n: 2, ic: '🐞', titre: _tr('Un petit pas', 'One little step'),
      age: _tr('vers 2 ans ½ – 3 ans', 'around 2½–3'),
      but: _tr('Bouger une bille d’une seule case, vers une case voisine vide.', 'Move one marble by a single spot, to an empty neighbouring spot.'),
      jeu: _tr('<b>La coccinelle</b> : une bille au milieu, c’est la coccinelle. Elle fait un petit pas vers une maison voisine — il y en a 6 autour, comptez-les ensemble. Puis « la coccinelle va voir son amie » : posez une autre bille 2 ou 3 cases plus loin, il l’y amène pas à pas.',
        '<b>The ladybird</b>: one marble in the middle is the ladybird. It takes one little step to a neighbouring house — there are 6 around it, count them together. Then “the ladybird visits her friend”: put another marble 2 or 3 spots away; the child gets there step by step.'),
      schema: function () { return _vpSvgHex({ rangees: _VP_PETIT, ecart: 2.85, billes: { '2,2': 'b' }, fantomes: [[1, 1], [1, 2], [2, 1], [2, 3], [3, 1], [3, 2]],
        fleches: ['E', 'O', 'NE', 'NO', 'SE', 'SO'].map(function (d) { return { de: [2, 2], dir: d }; }),
        titre: _tr('Une bille au centre et six flèches vers ses six cases voisines', 'One marble in the centre and six arrows to its six neighbouring spots') }); },
      legende: _tr('6 maisons voisines : un seul pas à la fois.', '6 neighbouring houses: one step at a time.'),
      acquis: _tr('il avance d’une seule case à la fois, sans sauter.', 'they move one spot at a time, without jumping.'),
      coince: _tr('guidez sa main en disant « un pas » ; posez le doigt sur la case d’arrivée.', 'guide their hand saying “one step”; put your finger on the target spot.') },

    { n: 3, ic: '🔄', titre: _tr('Chacun son tour', 'Taking turns'),
      age: _tr('vers 3 ans', 'around 3'),
      but: _tr('Jouer un coup chacun, à tour de rôle.', 'Play one move each, in turn.'),
      jeu: _tr('<b>Le doudou du tour</b> : celui qui tient le doudou (ou un petit objet) fait un petit pas, puis le donne à l’autre. Une bille noire et une blanche font la course jusqu’au bord d’en face.',
        '<b>The turn teddy</b>: whoever holds the teddy (or any small object) takes one little step, then hands it over. A dark marble and a light one race to the opposite edge.'),
      schema: function () { return _vpSvgHex({ rangees: _VP_PETIT, ecart: 2.85, billes: { '4,1': 'b', '0,1': 'w' }, fantomes: [[3, 2], [1, 1]],
        fleches: [{ de: [4, 1], dir: 'NE', num: '1' }, { de: [0, 1], dir: 'SO', num: '2' }],
        titre: _tr('La bille noire fait un pas (1), puis la blanche (2)', 'The dark marble takes a step (1), then the light one (2)') }); },
      legende: _tr('① la noire fait un pas, ② puis la blanche — chacun son tour.', '① the dark one takes a step, ② then the light one — each in turn.'),
      acquis: _tr('il attend le doudou pour jouer (un petit rappel, ça compte quand même).', 'they wait for the teddy before playing (a gentle reminder still counts).'),
      coince: _tr('attendre est dur à cet âge : 3 tours chacun, puis on fête l’arrivée.', 'waiting is hard at this age: 3 turns each, then celebrate the finish.') },

    { n: 4, ic: '🚂', titre: _tr('Le petit train', 'The little train'),
      age: _tr('vers 3 – 4 ans', 'around 3–4'),
      but: _tr('Déplacer 2 ou 3 billes alignées, ensemble, d’une case.', 'Move 2 or 3 marbles in a line, together, by one spot.'),
      jeu: _tr('<b>Tchou-tchou</b> : 2 ou 3 billes en ligne forment un train. Le train avance tout droit d’une case : tous les wagons en même temps, et la bille de devant arrive dans la case vide. Un train a <b>3 wagons au maximum</b>.',
        '<b>Choo-choo</b>: 2 or 3 marbles in a line make a train. The train moves straight ahead by one spot: all the carriages at once, the front one goes into the empty spot. A train has <b>3 carriages at most</b>.'),
      schema: function () { return _vpSvgHex({ rangees: _VP_PETIT, ecart: 2.85, billes: { '2,0': 'b', '2,1': 'b', '2,2': 'b' }, fantomes: [[2, 3]],
        fleches: [{ de: [2, 2], dir: 'E' }],
        titre: _tr('Trois billes noires alignées avancent ensemble d’une case', 'Three dark marbles in a line move forward together by one spot') }); },
      legende: _tr('Le train de 3 wagons avance d’une case, tout droit.', 'The 3-carriage train moves one spot, straight ahead.'),
      acquis: _tr('il déplace un train de 2 ou 3 billes sans le casser.', 'they move a train of 2 or 3 marbles without breaking it.'),
      coince: _tr('d’abord 2 wagons ; poussez avec lui, sa main sur la dernière bille.', 'start with 2 carriages; push together, their hand on the last marble.') },

    { n: 5, ic: '💪', titre: _tr('Le plus fort pousse', 'The stronger one pushes'),
      age: _tr('vers 3 ans ½ – 4 ans', 'around 3½–4'),
      but: _tr('Comprendre qu’on pousse quand on est plus nombreux : c’est la règle-clé d’Abalone (le sumito).', 'Understand that you can push when you outnumber: the key rule of Abalone (the sumito).'),
      jeu: _tr('<b>Face à face</b> sur une ligne : son train contre vos billes. On compte avec les doigts : <b>2 contre 1</b>, <b>3 contre 1</b>, <b>3 contre 2</b> : ça pousse ! <b>1 contre 1</b>, <b>2 contre 2</b>, <b>3 contre 3</b> : bloqué, personne ne pousse. Il faut aussi de la place derrière : une case vide… ou le bord (étape 6). Laissez-le vous pousser souvent.',
        '<b>Face to face</b> on one line: their train against your marbles. Count on your fingers: <b>2 against 1</b>, <b>3 against 1</b>, <b>3 against 2</b>: it pushes! <b>1 against 1</b>, <b>2 against 2</b>, <b>3 against 3</b>: stuck, nobody pushes. There must also be room behind: an empty spot… or the edge (step 6). Let them push you often.'),
      lignes: function () { return [
        { svg: _vpSvgLigne({ cases: '.bbw..', ok: true, titre: _tr('2 noires contre 1 blanche : ça pousse', '2 dark against 1 light: it pushes') }), leg: _tr('2 contre 1 : ça pousse', '2 against 1: it pushes') },
        { svg: _vpSvgLigne({ cases: 'bbbww.', ok: true, titre: _tr('3 noires contre 2 blanches : ça pousse', '3 dark against 2 light: it pushes') }), leg: _tr('3 contre 2 : ça pousse', '3 against 2: it pushes') },
        { svg: _vpSvgLigne({ cases: '.bbww.', ok: false, titre: _tr('2 noires contre 2 blanches : bloqué', '2 dark against 2 light: stuck') }), leg: _tr('2 contre 2 : bloqué', '2 against 2: stuck') }
      ]; },
      acquis: _tr('devant « 2 contre 1 » ou « 2 contre 2 », il dit tout seul si ça pousse.', 'faced with “2 against 1” or “2 against 2”, they say on their own whether it pushes.'),
      coince: _tr('avec les mains : deux mains poussent une main ; une main contre une main, ça bloque.', 'use hands: two hands push one hand; one hand against one hand is stuck.') },

    { n: 6, ic: '💦', titre: _tr('Plouf !', 'Splash!'),
      age: _tr('vers 4 ans', 'around 4'),
      but: _tr('Pousser une bille hors du plateau — et en rire.', 'Push a marble off the board — and laugh about it.'),
      jeu: _tr('<b>La piscine</b> : un bol à côté du plateau. Mettez une de vos billes au bord : il la pousse avec son train, plouf, elle va à la piscine ! Changez de bord, recommencez. Plus tard, poussez une des siennes, très gaiement : « À toi la piscine ! Elle revient à la prochaine partie. »',
        '<b>The pool</b>: a bowl next to the board. Put one of your marbles on the edge: they push it with their train, splash, into the pool! Change edges, again. Later, push one of theirs, very cheerfully: “Off to the pool! It comes back next game.”'),
      lignes: function () { return [
        { svg: _vpSvgLigne({ cases: '..bbw', ok: true, bord: true, titre: _tr('2 noires poussent la blanche du bord dans le bol', '2 dark marbles push the light one off the edge into the bowl') }), leg: _tr('2 contre 1 au bord : plouf, à la piscine !', '2 against 1 at the edge: splash, into the pool!') }
      ]; },
      acquis: _tr('il cherche tout seul à faire plouf, et perdre une bille ne le fâche plus (ou presque).', 'they look for a splash on their own, and losing a marble no longer upsets them (or hardly).'),
      coince: _tr('s’il ne supporte pas que ses billes tombent, attendez : vous seul faites plouf pendant quelques séances.', 'if they can’t bear their marbles falling, wait: only you get splashed for a few sessions.') },

    { n: 7, ic: '🌼', titre: _tr('La mini-partie', 'The mini-game'),
      age: _tr('vers 4 – 5 ans', 'around 4–5'),
      but: _tr('Jouer une vraie petite partie, avec peu de billes.', 'Play a real little game, with few marbles.'),
      jeu: _tr('<b>7 billes chacun</b>, en fleur, comme ci-dessous : c’est la disposition « Découverte », celle du Mode Enfant du site. On gagne au premier plouf, puis au deuxième, puis au troisième quand ça devient facile. <b>Handicap pour vous</b> : jouez avec 5 billes, ou il vous faut un plouf de plus. Deux petites phrases à lui apprendre : « <b>Ensemble, on est plus forts</b> » et « <b>Au milieu, on ne tombe pas</b> ».',
        '<b>7 marbles each</b>, as a flower, as below: the “Discovery” layout, the one used by the site’s Kids mode. First splash wins, then second, then third once it gets easy. <b>A handicap for you</b>: play with 5 marbles, or you need one extra splash. Two little sayings to teach: “<b>Together we’re stronger</b>” and “<b>In the middle, you don’t fall</b>”.'),
      schema: function () { return _vpSvgHex({ rangees: _VP_GRAND, r: 11, billes: _vpDisposition('decouverte'),
        titre: _tr('Le vrai plateau, 7 billes par camp en fleur (disposition Découverte)', 'The real board, 7 marbles a side as a flower (Discovery layout)') }); },
      legende: _tr('La disposition Découverte : 7 billes chacun.', 'The Discovery layout: 7 marbles each.'),
      acquis: _tr('il joue une mini-partie entière… et en redemande une.', 'they play a whole mini-game… and ask for another.'),
      coince: _tr('revenez aux jeux des étapes 5 et 6 ; une partie peut s’arrêter au milieu, ce n’est pas grave.', 'go back to the games of steps 5 and 6; a game can stop halfway, that’s fine.') },

    { n: 8, ic: '🏆', titre: _tr('La vraie partie', 'The real game'),
      age: _tr('vers 6 – 7 ans, l’âge de la boîte', 'around 6–7, the age on the box'),
      but: _tr('La partie complète : 14 billes chacun, 6 plouf pour gagner.', 'The full game: 14 marbles each, 6 splashes to win.'),
      jeu: _tr('La position de départ classique, ci-dessous. Gardez un handicap tant que les parties ne sont pas serrées. Le déplacement « de côté » et les autres détails sont dans <a href="#" onclick="showPage(\'learn\');return false;">Règles du jeu</a>. Sur le site ensuite : le Mode Enfant, l’IA au niveau 1, puis les <a href="#" onclick="showPage(\'puzzles\');return false;">Problèmes</a> — en séances courtes, comme sur le plateau.',
        'The classic starting position, below. Keep a handicap until games are close. Moving “sideways” and the other details are in <a href="#" onclick="showPage(\'learn\');return false;">Game rules</a>. Then on the site: Kids mode, the AI at level 1, then <a href="#" onclick="showPage(\'puzzles\');return false;">Puzzles</a> — in short sessions, just like on the board.'),
      schema: function () { return _vpSvgHex({ rangees: _VP_GRAND, r: 11, billes: _vpDisposition('standard'),
        titre: _tr('Le vrai plateau, position de départ classique, 14 billes par camp', 'The real board, classic starting position, 14 marbles a side') }); },
      legende: _tr('La position de départ classique : 14 billes chacun.', 'The classic starting position: 14 marbles each.'),
      acquis: _tr('il connaît toutes les règles et vous bat parfois sans handicap.', 'they know all the rules and sometimes beat you without a handicap.'),
      coince: _tr('revenez à la mini-partie, ou jouez la vraie avec 3 plouf pour gagner.', 'go back to the mini-game, or play the real one with 3 splashes to win.') }
  ];
}

function _vpReglesDor() {
  return [
    ['⏱️', _tr('Court et joyeux', 'Short and happy'), _tr('5 minutes suffisent, parfois moins. On s’arrête quand c’est encore drôle, sur une réussite — jamais sur un échec ou des pleurs.', '5 minutes is enough, sometimes less. Stop while it’s still fun, on a success — never on a failure or tears.')],
    ['🙋', _tr('L’enfant choisit', 'The child chooses'), _tr('Sa couleur, le jeu du jour, le moment d’arrêter. Jamais imposé, jamais une punition ni un marché (« si tu ranges ta chambre… »).', 'Their colour, today’s game, when to stop. Never forced, never a punishment or a bargain (“if you tidy your room…”).')],
    ['🏆', _tr('Il gagne souvent', 'They win often'), _tr('Au début, presque toujours. Ensuite vous jouez « pour de vrai », mais avec un handicap (moins de billes pour vous, un plouf de plus à faire) pour que ça reste serré.', 'At first, almost always. Then you play “for real”, but with a handicap (fewer marbles for you, one extra splash to make) so it stays close.')],
    ['👏', _tr('Féliciter ce qu’il a fait', 'Praise what they did'), _tr('« Tu as vu que tes 3 billes pouvaient pousser mes 2 ! » plutôt que « Tu es trop fort ». Il apprend que chercher, ça marche.', '“You saw your 3 marbles could push my 2!” rather than “You’re so clever”. They learn that looking pays off.')],
    ['🤝', _tr('Montrer comment perdre', 'Show how to lose'), _tr('« Oh, tu m’as eu ! Bravo. On en refait une ? », et on se tape dans la main. Il copiera votre façon de perdre.', '“Oh, you got me! Well done. Another one?”, and a high five. They will copy the way you lose.')],
    ['💦', _tr('Plouf, c’est la fête', 'Splash is a party'), _tr('Une bille poussée dehors va « à la piscine » et revient à la partie suivante. Jamais une bille « morte » ou « tuée ».', 'A marble pushed off goes “to the pool” and comes back next game. Never a “dead” or “killed” marble.')],
    ['👫', _tr('Frère et sœur dans la même équipe', 'Siblings on the same team'), _tr('Pas l’un contre l’autre au début, et aucune comparaison (« ta sœur, elle, y arrive »). Ensemble contre vous ; chacun avance à son rythme dans le carnet.', 'Not against each other at first, and no comparing (“your sister can do it”). Together against you; each one moves at their own pace in the notebook.')],
    ['🫂', _tr('Les larmes, c’est normal', 'Tears are normal'), _tr('Un câlin, une pause, pas de leçon. On range sans commentaire et on reviendra un autre jour.', 'A hug, a break, no lecture. Put it away without comment and come back another day.')],
    ['🙊', _tr('Pas de « Non ! »', 'No “No!”'), _tr('Quand il se trompe, montrez : « Regarde, mon train a 3 wagons, le tien 2. » Et s’il invente une règle, jouez-la parfois : c’est aussi jouer.', 'When they get it wrong, show them: “Look, my train has 3 carriages, yours 2.” And if they invent a rule, play it sometimes: that’s playing too.')]
  ];
}

/* ─── Carnet de progres (sur cet appareil seulement) ─── */

function _vpCarnetLire() {
  let c = null;
  try { c = JSON.parse(localStorage.getItem(_VP_CLE) || 'null'); } catch (e) { c = null; }
  const ok = c && Array.isArray(c.enfants) && c.enfants.length;
  const enfants = ok ? c.enfants.slice(0, _VP_MAX_ENFANTS) : [{}, {}];
  return { v: 1, enfants: enfants.map(function (e) {
    const acquis = {};
    if (e && e.acquis && typeof e.acquis === 'object') Object.keys(e.acquis).forEach(function (k) {
      if (/^[1-8]$/.test(k) && typeof e.acquis[k] === 'string') acquis[k] = e.acquis[k].slice(0, 10);
    });
    return { nom: String((e && e.nom) || '').slice(0, 24), acquis: acquis };
  }) };
}

function _vpCarnetEcrire(c) {
  try { localStorage.setItem(_VP_CLE, JSON.stringify(c)); return true; } catch (e) { return false; }
}

function _vpAujourdhui() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function _vpDateLisible(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  return currentLang() === 'EN' ? m[1] + '-' + m[2] + '-' + m[3] : m[3] + '/' + m[2] + '/' + m[1];
}

function _vpCarnetHTML() {
  const c = _vpCarnetLire(), E = _vpEtapes();
  let h = '';
  c.enfants.forEach(function (e, i) {
    const prochaine = E.filter(function (x) { return !e.acquis[x.n]; })[0];
    h += '<div class="vp-enfant">'
      + '<div class="vp-enfant-tete"><input type="text" class="vp-prenom" maxlength="24" value="' + _vpEsc(e.nom) + '" placeholder="' + _vpEsc(_tr('Enfant ', 'Child ') + (i + 1)) + '"'
      + ' aria-label="' + _vpEsc(_tr('Prénom de l’enfant ', 'Name of child ') + (i + 1)) + '" oninput="vpRenommer(' + i + ', this.value)">'
      + (c.enfants.length > 1 ? '<button type="button" class="vp-retirer vp-noprint" onclick="vpRetirerEnfant(' + i + ')" title="' + _vpEsc(_tr('Retirer', 'Remove')) + '" aria-label="' + _vpEsc(_tr('Retirer cet enfant du carnet', 'Remove this child from the notebook')) + '">✕</button>' : '')
      + '</div><div class="vp-etoiles">';
    E.forEach(function (x) {
      const d = e.acquis[x.n];
      const titre = x.n + '. ' + x.titre + (d ? ' — ' + _tr('acquise le ', 'done on ') + _vpDateLisible(d) : '');
      h += '<button type="button" class="vp-etoile" aria-pressed="' + (d ? 'true' : 'false') + '" title="' + _vpEsc(titre) + '" aria-label="' + _vpEsc(titre) + '"'
        + ' onclick="vpBasculerAcquis(' + i + ',' + x.n + ')">' + (d ? '⭐' : x.n) + '</button>';
    });
    h += '</div><div class="vp-prochaine">' + (prochaine
      ? _tr('Prochaine étape : ', 'Next step: ') + '<a href="#" onclick="vpAller(' + prochaine.n + ');return false;">' + prochaine.n + ' · ' + prochaine.ic + ' ' + _vpEsc(prochaine.titre) + '</a>'
      : _tr('🏆 Toutes les étapes sont acquises !', '🏆 Every step is done!')) + '</div></div>';
  });
  if (c.enfants.length < _VP_MAX_ENFANTS) h += '<button type="button" class="vp-bouton vp-noprint" onclick="vpAjouterEnfant()">＋ ' + _tr('Ajouter un enfant', 'Add a child') + '</button>';
  return h;
}

function _vpCarnetRafraichir() {
  const el = document.getElementById('vp-carnet');
  if (el) el.innerHTML = _vpCarnetHTML();
}

function vpBasculerAcquis(i, n) {
  const c = _vpCarnetLire(), e = c.enfants[i];
  if (!e || !(n >= 1 && n <= 8)) return;
  if (e.acquis[n]) delete e.acquis[n]; else e.acquis[n] = _vpAujourdhui();
  _vpCarnetEcrire(c);
  _vpCarnetRafraichir();
  if (e.acquis[n] && typeof showToast === 'function') showToast(_tr('⭐ Étape ' + n + ' acquise — bravo !', '⭐ Step ' + n + ' done — well done!'));
}

// Pas de redessin pendant la saisie : le champ garde le curseur.
function vpRenommer(i, nom) {
  const c = _vpCarnetLire();
  if (!c.enfants[i]) return;
  c.enfants[i].nom = String(nom || '').slice(0, 24);
  _vpCarnetEcrire(c);
}

function vpAjouterEnfant() {
  const c = _vpCarnetLire();
  if (c.enfants.length >= _VP_MAX_ENFANTS) return;
  c.enfants.push({ nom: '', acquis: {} });
  _vpCarnetEcrire(c);
  _vpCarnetRafraichir();
}

function vpRetirerEnfant(i) {
  const c = _vpCarnetLire();
  if (c.enfants.length <= 1 || !c.enfants[i]) return;
  const qui = c.enfants[i].nom || (_tr('Enfant ', 'Child ') + (i + 1));
  if (typeof confirm === 'function' && !confirm(_tr('Retirer « ' + qui + ' » du carnet ? Ses étoiles seront effacées.', 'Remove “' + qui + '” from the notebook? Their stars will be erased.'))) return;
  c.enfants.splice(i, 1);
  _vpCarnetEcrire(c);
  _vpCarnetRafraichir();
}

function vpAller(n) {
  const el = document.getElementById('vp-etape-' + n);
  if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function vpImprimer() { if (typeof window !== 'undefined' && window.print) window.print(); }

/* ─── Page ─────────────────────────────── */

function renderPlateauPage() {
  const el = document.getElementById('plateau-corps');
  if (!el) return;
  _vpSvgN = 0;
  const E = _vpEtapes(), dp = _tr(' : ', ': ');   // deux-points : espace avant en francais seulement
  let h = '<p class="vp-intro">' + _tr(
    'Pour apprendre Abalone à de tout jeunes enfants, sur un vrai plateau, loin des écrans. Le but n’est pas qu’ils jouent tout de suite une vraie partie : la boîte indique « à partir de 6 ou 7 ans ». Le but, c’est qu’ils aiment ce plateau, ces billes et ces moments avec vous — c’est ça qui fera de grands joueurs plus tard. Huit petites étapes, chacune un jeu de quelques minutes. Les âges sont des repères, pas des objectifs : chaque enfant va à son rythme, et rester des semaines sur une étape, c’est normal.',
    'For teaching Abalone to very young children, on a real board, away from screens. The aim is not a real game straight away: the box says “from age 6 or 7”. The aim is for them to love this board, these marbles and this time with you — that is what makes strong players later. Eight small steps, each a game lasting a few minutes. The ages are landmarks, not targets: every child goes at their own pace, and staying on one step for weeks is normal.') + '</p>'
    + '<div class="vp-noprint" style="margin:14px 0 6px"><button type="button" class="vp-bouton" onclick="vpImprimer()">🖨️ ' + _tr('Imprimer la fiche', 'Print the guide') + '</button></div>';

  // Securite
  h += '<div class="vp-encadre vp-securite" id="vp-securite"><div class="vp-encadre-titre">🛡️ ' + _tr('La sécurité d’abord', 'Safety first') + '</div><ul>'
    + '<li>' + _tr('<b>Moins de 3 ans : pas de vraies billes.</b> La boîte prévient que le jeu ne convient pas aux moins de 3 ans (petits éléments). Avant 3 ans, un enfant ne devrait avoir en main que de grands objets ; repère simple : <b>ce qui passe dans un rouleau de papier toilette vide peut l’étouffer</b>. Aux États-Unis, les balles de 4,4 cm de diamètre ou moins sont même interdites dans les jouets pour les moins de 3 ans. Pour le plus petit : le plateau géant au sol (étape 1), avec de gros objets.',
        '<b>Under 3: no real marbles.</b> The box warns that the game is not suitable for children under 3 (small parts). Before 3, a child should only handle large objects; a simple check: <b>anything that fits through an empty toilet-paper tube can choke them</b>. In the United States, balls 1.75 in (4.4 cm) across or smaller are even banned from toys for under-3s. For the little one: the giant floor board (step 1), with big objects.') + '</li>'
    + '<li>' + _tr('<b>Dès 3 ans, avec les vraies billes</b> : toujours un adulte assis à côté, à table. On compte les billes en les sortant et en les rangeant (14 noires + 14 blanches = 28). La boîte se range hors de portée. S’il porte encore les objets à la bouche, on reste au plateau géant.',
        '<b>From 3, with the real marbles</b>: always an adult sitting next to them, at a table. Count the marbles when you take them out and put them away (14 dark + 14 light = 28). The box goes out of reach afterwards. If the child still puts things in their mouth, stay with the giant board.') + '</li>'
    + '<li>' + _tr('<b>Les deux ensemble</b> : tant que le plus jeune a moins de 3 ans, les séances à deux se font sur le plateau géant. Les vraies billes, c’est pour l’aîné, quand le petit n’est pas là (pendant la sieste, par exemple).',
        '<b>Both together</b>: while the younger one is under 3, joint sessions happen on the giant board. The real marbles are for the older child, when the little one is not around (during nap time, for example).') + '</li>'
    + '</ul></div>';

  // Regles d'or
  h += '<h3 class="vp-h3">💛 ' + _tr('Les règles d’or, pour qu’ils aiment le jeu toute leur vie', 'Golden rules, so they love the game for life') + '</h3><div class="vp-regles">';
  _vpReglesDor().forEach(function (r) { h += '<div class="vp-regle"><span class="vp-regle-titre">' + r[0] + ' ' + r[1] + '</span>' + r[2] + '</div>'; });
  h += '</div>';

  // Seance type
  h += '<h3 class="vp-h3">⏱️ ' + _tr('Une séance type : 5 à 10 minutes', 'A typical session: 5 to 10 minutes') + '</h3><ol class="vp-seance">'
    + '<li>' + _tr('<b>Sortir ensemble</b> (1 min) : il porte la boîte fermée, vous l’ouvrez ; on compte les billes en les posant.', '<b>Get it out together</b> (1 min): the child carries the closed box, you open it; count the marbles as you set them down.') + '</li>'
    + '<li>' + _tr('<b>Un jeu qu’il connaît déjà</b> (2 min) : réussite assurée, c’est l’étape d’avant.', '<b>A game they already know</b> (2 min): guaranteed success, the previous step.') + '</li>'
    + '<li>' + _tr('<b>Un petit bout de nouveau</b> (2 à 3 min) : quelques essais de l’étape en cours, pas plus.', '<b>A little bit of new</b> (2 to 3 min): a few tries of the current step, no more.') + '</li>'
    + '<li>' + _tr('<b>Ranger et se féliciter</b> (1 min) : on compte en rangeant, puis on se tape dans la main.', '<b>Tidy up and celebrate</b> (1 min): count while putting away, then a high five.') + '</li>'
    + '</ol>';

  // Carnet
  h += '<h3 class="vp-h3">📒 ' + _tr('Où en sont-ils ?', 'Where are they up to?') + '</h3>'
    + '<p class="vp-note">' + _tr('Touchez une étape quand elle est acquise ; touchez-la encore pour l’enlever. Les prénoms et les dates restent sur cet appareil : ils ne sont envoyés nulle part.', 'Tap a step once it is done; tap it again to undo. Names and dates stay on this device: they are never sent anywhere.') + '</p>'
    + '<div class="vp-carnet" id="vp-carnet">' + _vpCarnetHTML() + '</div>';

  // Etapes
  h += '<h3 class="vp-h3">🪜 ' + _tr('Les 8 étapes', 'The 8 steps') + '</h3><div class="vp-sommaire vp-noprint">';
  E.forEach(function (x) { h += '<a href="#" class="vp-puce" onclick="vpAller(' + x.n + ');return false;">' + x.n + ' ' + x.ic + ' ' + _vpEsc(x.titre) + '</a>'; });
  h += '</div>';
  E.forEach(function (x) {
    let fig;
    if (x.lignes) {
      const lg = x.lignes();
      fig = '<div class="vp-lignes' + (lg.length === 1 ? ' vp-une' : '') + '">' + lg.map(function (l) { return '<figure class="vp-schema">' + l.svg + '<figcaption>' + _vpEsc(l.leg) + '</figcaption></figure>'; }).join('') + '</div>';
    } else {
      fig = '<figure class="vp-schema">' + x.schema() + '<figcaption>' + _vpEsc(x.legende) + '</figcaption></figure>';
    }
    h += '<section class="vp-carte" id="vp-etape-' + x.n + '"><div class="vp-texte">'
      + '<div class="vp-carte-tete"><span class="vp-num">' + x.n + '</span><span class="vp-carte-titre">' + x.ic + ' ' + _vpEsc(x.titre) + '</span><span class="vp-age">' + _vpEsc(x.age) + '</span></div>'
      + '<p class="vp-but"><b>' + _tr('But', 'Aim') + '</b>' + dp + x.but + '</p>'
      + '<p>' + x.jeu + '</p>'
      + '<div class="vp-acquis">✅ <b>' + _tr('C’est acquis quand', 'Done when') + '</b> ' + x.acquis + '</div>'
      + '<div class="vp-coince">🧩 <b>' + _tr('Si ça coince', 'If it’s not working') + '</b>' + dp + x.coince + '</div>'
      + '</div><div class="vp-figure">' + fig + '</div></section>';
  });

  // Machines de guerre
  h += '<h3 class="vp-h3">⚔️ ' + _tr('Et pour en faire des « machines de guerre » ?', 'And to turn them into “war machines”?') + '</h3>'
    + '<p class="vp-note" style="font-size:14px">' + _tr('La force viendra plus tard — et elle viendra d’autant mieux qu’ils auront d’abord aimé le jeu. À cet âge, trois habitudes préparent les futurs champions ; dites-les comme des petites phrases, pendant le jeu :',
      'Strength comes later — and all the better if they loved the game first. At this age, three habits prepare future champions; say them as little sayings, during play:') + '</p>'
    + '<div class="vp-regles">'
    + '<div class="vp-regle"><span class="vp-regle-titre">👀 ' + _tr('« Je regarde avant de toucher »', '“I look before I touch”') + '</span>' + _tr('Observer tout le plateau avant de jouer : l’habitude la plus précieuse des bons joueurs, à Abalone comme ailleurs.', 'Look at the whole board before playing: the most precious habit of good players, in Abalone as elsewhere.') + '</div>'
    + '<div class="vp-regle"><span class="vp-regle-titre">🤝 ' + _tr('« Ensemble, on est plus forts »', '“Together we’re stronger”') + '</span>' + _tr('Des billes collées se protègent : une bille seule se fait pousser, un groupe pousse. C’est le premier principe de la stratégie.', 'Marbles that stick together protect each other: a lone marble gets pushed, a group pushes. The first principle of strategy.') + '</div>'
    + '<div class="vp-regle"><span class="vp-regle-titre">🎯 ' + _tr('« Au milieu, on ne tombe pas »', '“In the middle, you don’t fall”') + '</span>' + _tr('Le centre protège, le bord fait tomber : le second principe.', 'The centre protects, the edge makes you fall: the second principle.') + '</div>'
    + '</div>';

  // Sources
  h += '<p class="vp-sources">' + _tr('Sources de l’encadré sécurité', 'Sources for the safety box') + dp
    + '<a href="https://www.natureetdecouvertes.com/enfant/jeux-societe/jeux-plateau/jeu-de-societe-abalone-91053072" target="_blank" rel="noopener">' + _tr('fiche du jeu Abalone (âge, avertissement)', 'Abalone product page (age, warning)') + '</a> · '
    + '<a href="https://www.canada.ca/fr/sante-canada/services/securite-jouets/petites-pieces-jouets.html" target="_blank" rel="noopener">' + _tr('Santé Canada, petites pièces', 'Health Canada, small parts') + '</a> · '
    + '<a href="https://www.inspq.qc.ca/mieux-vivre/enfant/securite/prevenir-etouffements" target="_blank" rel="noopener">' + _tr('INSPQ et Société canadienne de pédiatrie, rouleau de papier toilette', 'INSPQ and Canadian Paediatric Society, toilet-paper tube') + '</a> · '
    + '<a href="https://www.cpsc.gov/s3fs-public/pdfs/blk_media_cspa.pdf" target="_blank" rel="noopener">' + _tr('CPSC, loi sur les petites balles', 'CPSC, small balls law') + '</a>.</p>';

  el.innerHTML = h;
}

</script>
