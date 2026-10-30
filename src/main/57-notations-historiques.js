/* ═══════════════════════════════════════════
   NOTATIONS HISTORIQUES (v2.97) : les deux systemes de la Federation
   francaise de jeu d'Abalone lies a Marc Ghigou, et le principe de
   Michael Frank. Demande d'ocj94.

   Sources lues :
   - Jeux & Strategie n° 1 (octobre 1989), « Les notations d'Abalone » : le
     systeme a 24 lettres, dit ici « 1989 », concu par Marc Ghigou d'apres le
     blog Abalone Online ;
   - Jeux & Strategie n° 6 (avril 1990) : la solution d'un exercice en
     solitaire, 28 coups dans ce systeme ;
   - Jeux & Strategie n° 7 (mai-juin 1990), « Nouveau systeme de notation »,
     signe Barlerin « avec la complicite de Marc Ghigou » : le systeme dit
     « Hemge », dit ici « 1990 » ;
   - blog Abalone Online, « Les systemes de notation » (1er mars 2017).
   Verifie par les tests (section 84) : la partie d'exemple de chaque article
   se rejoue coup pour coup avec ces tables, et chaque coup publie y est le
   SEUL coup legal qui s'ecrive ainsi.

   1989. 24 lettres sur le bord, dans le sens inverse des aiguilles d'une
   montre a partir du coin bas-gauche (A = a1). PAS DE W : la partie
   d'exemple ecrit « AYX » pour les lignes qui finissent en a1, b1 et c1, et
   « Y-N » pour la bille de b1. Les coins A E I M Q U delimitent 6 bases ;
   Noir part sur AE, Blanc sur MQ. Une case interieure porte les deux lettres
   ou aboutissent les lignes qui la relient a la base de son quartier, dans
   l'ordre alphabetique (le centre : AE).
   Medianes : le texte les rattache « a la base dont les lettres sont les
   plus proches du debut de l'alphabet » ; les exemples publies, eux,
   rattachent celle qui part de M a MQ (MO, MN, MP) et non a IM. On suit les
   exemples : une base de depart (AE, puis MQ) l'emporte sur sa voisine,
   sinon l'alphabet decide -- c'est la seule regle qui les relise tous.
   Coup : la position de la bille de queue (« au contact des doigts ») puis
   la lettre vers laquelle va le groupe (A-M). En fleche : une extremite
   « en respectant l'ordre alphabetique » -- celle dont le nom vient en
   premier, comme AC-SR et MO-AYX --, puis la lettre de chaque bille. Des
   exemples publies nomment parfois l'autre bout (E-IJK) : le systeme etait
   flou sur ce point. Une meme ecriture en fleche peut viser deux groupes
   (P-FE : i5-i6 ou i6-h5 vers le sud-est), mais jamais dans une meme
   position : la case d'arrivee de l'un est une bille de l'autre (teste).
   Ejection : « e » suivi du rang de la bille ejectee, en chiffres romains
   pour Noir, arabes pour Blanc.

   1990. 9 rangees horizontales A a I (A, base de Noir, en bas), cases
   numerotees depuis l'Ouest a partir de 1 : A1..A5, E1..E9, I1..I5. Son
   defaut, releve par le blog : E2 et F1 sont sur la meme transversale (les
   diagonales d'Aba-Pro l'ont corrige).
   Coup en ligne : la bille de queue puis la case ou elle arrive (B2-C3).
   En fleche : une extremite puis les cases d'arrivee, la sienne d'abord
   (C3-D4, D5, D6) ; on nomme celle du Sud, sinon de l'Ouest, comme les deux
   exemples de l'article. Ejection : (e).

   Michael Frank (MIT, debut des annees 1990) : un repere orthogonal, x et y,
   l'hexagone inscrit dans un carre ; il n'a pas abouti a une notation des
   coups. Rien a calculer : son principe est explique dans la fenetre.
═══════════════════════════════════════════ */
const GHIGOU89_LETTRES = 'ABCDEFGHIJKLMNOPQRSTUVXY';
const _GH_PRIORITE = ['AE', 'MQ', 'UA', 'EI', 'IM', 'QU'];
let _ghT = null;
function _ghCle(x) { return x.r + ',' + x.c; }
function _ghPas(x, d) { const a = rcToAxial(x.r, x.c); return axialToRc(a.q + d.q, a.r + d.r); }
function _ghSignes(x) { const a = rcToAxial(x.r, x.c), y = -a.q - a.r; return [a.q, y, a.r, -a.q, -y, -a.r]; }
/* La derniere case de la ligne qui part de x dans la direction d (null si x est deja au bord de ce cote). */
function _ghFin(x, d) { let n = _ghPas(x, d); if (!n) return null; let cur = n; while ((n = _ghPas(cur, d))) cur = n; return cur; }
function _ghTables() {
  if (_ghT) return _ghT;
  const cases = [];
  for (let r = 0; r < 9; r++) for (let c = 0; c < ROWS[r]; c++) cases.push({ r: r, c: c });
  const bord = cases.filter(function (x) { return AX_DIRS.some(function (d) { return !_ghPas(x, d); }); });
  const vue = function (x) { const a = rcToAxial(x.r, x.c); return Math.atan2(-a.r, a.q + a.r / 2); };
  const a0 = vue({ r: 8, c: 0 });
  const angle = function (x) { let t = vue(x) - a0; while (t < 0) t += 2 * Math.PI; return t; };
  bord.sort(function (u, v) { return angle(u) - angle(v); });
  const lettre = {};
  bord.forEach(function (x, i) { lettre[_ghCle(x)] = GHIGOU89_LETTRES[i]; });
  const bases = {};
  [0, 4, 8, 12, 16, 20].forEach(function (i) {
    const cs = [0, 1, 2, 3, 4].map(function (j) { return bord[(i + j) % 24]; });
    bases[GHIGOU89_LETTRES[i] + GHIGOU89_LETTRES[(i + 4) % 24]] =
      [0, 1, 2, 3, 4, 5].find(function (k) { return cs.every(function (x) { return _ghSignes(x)[k] === 4; }); });
  });
  const nom89 = {}, nom90 = {}, base = {};
  cases.forEach(function (x) {
    const k0 = _ghCle(x);
    nom90[k0] = 'ABCDEFGHI'[8 - x.r] + (x.c + 1);
    if (lettre[k0]) { nom89[k0] = lettre[k0]; return; }
    const s = _ghSignes(x), m = Math.max.apply(null, s);
    const b = _GH_PRIORITE.find(function (n) { return s[bases[n]] === m; }), k = bases[b];
    base[k0] = b;
    nom89[k0] = AX_DIRS.filter(function (d) { const n = _ghPas(x, d); return n && _ghSignes(n)[k] === m + 1; })
      .map(function (d) { return lettre[_ghCle(_ghFin(x, d))]; }).sort().join('');
  });
  return (_ghT = { cases: cases, lettre: lettre, nom89: nom89, nom90: nom90, base: base });
}
function caseGhigou89(r, c) { return _ghTables().nom89[r + ',' + c] || '?'; }
function caseGhigou90(r, c) { return _ghTables().nom90[r + ',' + c] || '?'; }

/* La bille de queue d'un coup en ligne (la plus en arriere dans la direction du coup). */
function _ghQueue(sel, dir) {
  return sel.slice().sort(function (a, b) {
    const x = rcToAxial(a.r, a.c), y = rcToAxial(b.r, b.c);
    return (x.q * dir.q + x.r * dir.r) - (y.q * dir.q + y.r * dir.r);
  })[0];
}
/* Les billes d'un groupe aligne, d'un bout a l'autre. */
function _ghOrdre(sel) {
  if (sel.length < 2) return sel.slice();
  const e = _nacreGroupEnds(sel), a = rcToAxial(e.a.r, e.a.c);
  return sel.slice().sort(function (u, v) { return _hexDist(a, rcToAxial(u.r, u.c)) - _hexDist(a, rcToAxial(v.r, v.c)); });
}
function _ghRomain(n) {
  let s = '';
  [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].forEach(function (p) { while (n >= p[0]) { s += p[1]; n -= p[0]; } });
  return s;
}
/* Un coup en fleche de 1989, les billes dans l'ordre donne : la premiere est la bille nommee. */
function _ghEcrire89(ordre, dir) {
  const T = _ghTables();
  return T.nom89[_ghCle(ordre[0])] + '-' + ordre.map(function (x) { const f = _ghFin(x, dir); return f ? T.lettre[_ghCle(f)] : '?'; }).join('');
}
function moveToGHIGOU89(sel, dir, type, ejection, rang, couleur) {
  if (!sel || !sel.length || !dir) return '?';
  const T = _ghTables();
  let s;
  if (type === 'broadside' && sel.length > 1) {
    let o = _ghOrdre(sel);
    if (T.nom89[_ghCle(o[o.length - 1])] < T.nom89[_ghCle(o[0])]) o = o.reverse();
    s = _ghEcrire89(o, dir);
  } else {
    s = _ghEcrire89([_ghQueue(sel, dir)], dir);
  }
  if (ejection) s += rang ? ' (e' + (couleur === 'black' ? _ghRomain(rang) : rang) + ')' : ' (e)';
  return s;
}
function moveToGHIGOU90(sel, dir, type, ejection) {
  if (!sel || !sel.length || !dir) return '?';
  const T = _ghTables(), n = function (x) { return x ? T.nom90[_ghCle(x)] : '?'; };
  let s;
  if (type === 'broadside' && sel.length > 1) {
    let o = _ghOrdre(sel);
    const a = o[0], b = o[o.length - 1];
    if (b.r > a.r || (b.r === a.r && b.c < a.c)) o = o.reverse();   // la bille du Sud, sinon de l'Ouest
    s = n(o[0]) + '-' + o.map(function (x) { return n(_ghPas(x, dir)); }).join(', ');
  } else {
    const q = _ghQueue(sel, dir);
    s = n(q) + '-' + n(_ghPas(q, dir));
  }
  return s + (ejection ? ' (e)' : '');
}

/* ── Le reglage : une notation historique en plus, sous chaque coup de l'historique ──
   (var et non let : appendMoveRow, plus haut dans le script, la lit.) */
var notationHistorique = '';
try { notationHistorique = localStorage.getItem('abalone_notation_historique') || ''; } catch (e) {}
if (notationHistorique !== 'ghigou89' && notationHistorique !== 'ghigou90') notationHistorique = '';
function choisirNotationHistorique(v) {
  notationHistorique = (v === 'ghigou89' || v === 'ghigou90') ? v : '';
  try { localStorage.setItem('abalone_notation_historique', notationHistorique); } catch (e) {}
  syncNotationHistorique();
  if (typeof rebuildMoveListLabels === 'function' && typeof boardSnapshots !== 'undefined' && boardSnapshots.length) rebuildMoveListLabels();
}
function syncNotationHistorique() {
  const el = document.getElementById('settings-notation-historique');
  if (el) el.value = notationHistorique;
}
/* Un coup de l'historique dans un systeme historique. snap : l'instantane APRES ce coup (ses compteurs donnent le rang d'une ejection). */
function coupGhigou(systeme, moveInfo, color, snap) {
  if (!moveInfo || !moveInfo.cells || !moveInfo.dir) return '';
  if (systeme === 'ghigou90') return moveToGHIGOU90(moveInfo.cells, moveInfo.dir, moveInfo.type, !!moveInfo.ejection);
  const rang = (moveInfo.ejection && snap) ? (color === 'black' ? snap.capturedByBlack : snap.capturedByWhite) : 0;
  return moveToGHIGOU89(moveInfo.cells, moveInfo.dir, moveInfo.type, !!moveInfo.ejection, rang, color);
}
function ligneNotationHistorique(moveInfo, color, plyNum) {
  if (!notationHistorique) return '';
  const snap = (typeof boardSnapshots !== 'undefined') ? boardSnapshots[plyNum - 1] : null;
  const s = coupGhigou(notationHistorique, moveInfo, color, snap);
  if (!s) return '';
  const titre = notationHistorique === 'ghigou90' ? _tr('Notation de Marc Ghigou, 1990', 'Marc Ghigou’s notation, 1990')
                                                  : _tr('Notation de Marc Ghigou, 1989', 'Marc Ghigou’s notation, 1989');
  return '<span class="move-hist" title="' + titre + '" style="grid-column:3 / 5;font-size:11px;color:var(--muted);margin-top:-4px">' + escapeHtml(s) + '</span>';
}
/* La partie en cours, transcrite comme dans les articles : « 1/A1-B2/I5-H5 2/... » (1990), « 1) A-M, MO-AYX ; 2) ... » (1989). */
function partieGhigou(systeme, snaps) {
  snaps = (snaps || (typeof boardSnapshots !== 'undefined' ? boardSnapshots : [])).filter(function (s) { return s && s.color && s.moveInfo; });
  const tours = [];
  snaps.forEach(function (s) {
    const t = coupGhigou(systeme, s.moveInfo, s.color, s), der = tours[tours.length - 1];
    if (s.color === 'white' && der && der.w === undefined) der.w = t;
    else if (s.color === 'white') tours.push({ b: '…', w: t });
    else tours.push({ b: t });
  });
  if (systeme === 'ghigou90') return tours.map(function (t, i) { return (i + 1) + '/' + t.b + (t.w !== undefined ? '/' + t.w : ''); }).join(' ');
  return tours.map(function (t, i) { return (i + 1) + ') ' + t.b + (t.w !== undefined ? ', ' + t.w : ''); }).join(' ; ');
}

/* ── La fenetre : les deux plateaux, dessines a partir des tables memes, l'histoire et les regles ── */
const GH_EXEMPLE_1990 = '1/A1-B2/I5-H5 2/B2-C3/I4-H5 3/A2-B3/I3-H4 4/A3-B4/H3-G4 5/C5-D5/H4-G4';
const GH_EXEMPLE_1989 = '1) A-M, MO-AYX ; 2) B-L, MN-AYX ; 3) AB-M, M-AYX ; 4) Y-N, P-V ; 5) D-J';
function _ghPlateauSVG(systeme) {
  const T = _ghTables(), pas = 34, h = pas * 0.866, m = 30;
  const pos = function (x) { const a = rcToAxial(x.r, x.c); return { X: (a.q + a.r / 2 + 4) * pas + m, Y: (a.r + 4) * h + m }; };
  const W = 8 * pas + 2 * m, H = 8 * h + 2 * m;
  let s = '<svg viewBox="0 0 ' + W.toFixed(0) + ' ' + H.toFixed(0) + '" style="width:100%;max-width:360px;display:block;margin:0 auto" role="img" aria-label="'
    + (systeme === 'ghigou89' ? _tr('Plateau en notation de 1989', 'Board in the 1989 notation') : _tr('Plateau en notation de 1990', 'Board in the 1990 notation')) + '">';
  if (systeme === 'ghigou89') {   // les six quartiers : des coins au centre
    const c0 = pos({ r: 4, c: 4 });
    [[8, 0], [8, 4], [4, 8], [0, 4], [0, 0], [4, 0]].forEach(function (p) {
      const q = pos({ r: p[0], c: p[1] });
      s += '<line x1="' + c0.X.toFixed(1) + '" y1="' + c0.Y.toFixed(1) + '" x2="' + q.X.toFixed(1) + '" y2="' + q.Y.toFixed(1) + '" style="stroke:var(--gold);stroke-opacity:.35;stroke-width:2;stroke-dasharray:4 3"/>';
    });
  }
  T.cases.forEach(function (x) {
    const p = pos(x), k = _ghCle(x), bord = !!T.lettre[k];
    const nom = systeme === 'ghigou89' ? T.nom89[k] : T.nom90[k];
    const vif = systeme === 'ghigou89' ? bord : x.c === 0;
    s += '<circle cx="' + p.X.toFixed(1) + '" cy="' + p.Y.toFixed(1) + '" r="15" style="fill:var(--surface2);stroke:' + (vif ? 'var(--gold)' : 'var(--border)') + '"/>'
      + '<text x="' + p.X.toFixed(1) + '" y="' + (p.Y + 4).toFixed(1) + '" text-anchor="middle" style="font:' + (vif ? '700 ' : '') + (nom.length > 2 ? '10' : '11') + 'px \'DM Mono\',monospace;fill:' + (vif ? 'var(--gold)' : 'var(--text)') + '">' + nom + '</text>';
  });
  s += '<text x="' + (W / 2).toFixed(0) + '" y="' + (H - 6).toFixed(0) + '" text-anchor="middle" style="font:11px sans-serif;fill:var(--muted)">'
    + (systeme === 'ghigou89' ? _tr('Noir part sur la base AE', 'Black starts on base AE') : _tr('A : base de Noir', 'A: Black’s base')) + '</text>'
    + '<text x="' + (W / 2).toFixed(0) + '" y="14" text-anchor="middle" style="font:11px sans-serif;fill:var(--muted)">'
    + (systeme === 'ghigou89' ? _tr('Blanc part sur la base MQ', 'White starts on base MQ') : _tr('I : base de Blanc', 'I: White’s base')) + '</text>';
  return s + '</svg>';
}
function renderNotationsHistoriques() {
  const el = document.getElementById('nh-contenu');
  if (!el) return;
  const p = function (t) { return '<p style="font-size:13px;line-height:1.6;color:var(--text);margin:0 0 10px">' + t + '</p>'; };
  const h = function (t) { return '<h4 style="font-size:15px;color:var(--white);margin:20px 0 8px">' + t + '</h4>'; };
  const code = function (t) { return '<code style="font-family:\'DM Mono\',monospace;color:var(--gold)">' + escapeHtml(t) + '</code>'; };
  let s = p(_tr('Avant Aba-Pro et Nacre, la Fédération française de jeu d’Abalone a proposé deux systèmes, liés à <b>Marc Ghigou</b> et présentés dans le magazine <i>Jeux &amp; Stratégie</i>. Choisissez-en un dans Paramètres → Notation des coups : il s’affiche alors sous chaque coup de l’historique, en plus d’Aba-Pro et de Nacre. L’Aba-Pro reste la notation des exports et des imports.',
    'Before Aba-Pro and Nacre, the French Abalone federation proposed two systems, linked to <b>Marc Ghigou</b> and presented in the magazine <i>Jeux &amp; Stratégie</i>. Pick one in Settings → Move notation: it then appears under each move of the history, besides Aba-Pro and Nacre. Aba-Pro remains the notation used for exports and imports.'));
  s += h(_tr('1990 : le système « Hemgé »', '1990: the “Hemgé” system')) + _ghPlateauSVG('ghigou90');
  s += p(_tr('Présenté dans <i>Jeux &amp; Stratégie</i> n° 7 (mai-juin 1990), signé Barlerin « avec la complicité de Marc Ghigou ». Neuf rangées horizontales, de A (la base de Noir) à I (celle de Blanc) ; dans chaque rangée, les cases sont numérotées depuis l’Ouest à partir de 1.',
    'Presented in <i>Jeux &amp; Stratégie</i> no. 7 (May-June 1990), signed Barlerin “with the complicity of Marc Ghigou”. Nine horizontal rows, from A (Black’s base) to I (White’s); in each row the cells are numbered from the West, starting at 1.'));
  s += p(_tr('Coup en ligne : la bille au contact de la main, puis la case où elle arrive (' + code('B2-C3') + '). Coup en flèche : une bille d’extrémité, puis les cases d’arrivée, la sienne d’abord (' + code('C3-D4, D5, D6') + '). Une éjection : ' + code('(e)') + '. La partie de l’article : ' + code(GH_EXEMPLE_1990) + '.',
    'Inline move: the marble touching the hand, then the cell it lands on (' + code('B2-C3') + '). Broadside: an end marble, then the arrival cells, its own first (' + code('C3-D4, D5, D6') + '). An ejection: ' + code('(e)') + '. The article’s game: ' + code(GH_EXEMPLE_1990) + '.'));
  s += p(_tr('Son défaut : les diagonales n’ont pas de nom, si bien que E2 et F1 sont sur la même ligne. Les diagonales numérotées d’Aba-Pro l’ont corrigé.',
    'Its flaw: the diagonals have no name, so E2 and F1 are on the same line. Aba-Pro’s numbered diagonals fixed that.'));
  s += h(_tr('1989 : les 24 lettres', '1989: the 24 letters')) + _ghPlateauSVG('ghigou89');
  s += p(_tr('Présenté dans <i>Jeux &amp; Stratégie</i> n° 1 (octobre 1989) ; le blog Abalone Online l’attribue à Marc Ghigou. 24 lettres sur le bord, de A (en bas à gauche) dans le sens inverse des aiguilles d’une montre, sans W. Les coins A, E, I, M, Q et U découpent six bases ; Noir part sur AE, Blanc sur MQ. Une case intérieure porte les deux lettres où aboutissent les lignes qui la relient à la base de son quartier (pointillés) : ' + code('BD') + ' est en c4, le centre se nomme ' + code('AE') + '.',
    'Presented in <i>Jeux &amp; Stratégie</i> no. 1 (October 1989); the Abalone Online blog credits Marc Ghigou. 24 letters on the edge, from A (bottom left) counterclockwise, without W. The corners A, E, I, M, Q and U cut six bases; Black starts on AE, White on MQ. An inner cell bears the two letters where the lines joining it to the base of its quarter (dotted) end: ' + code('BD') + ' is c4, the centre is ' + code('AE') + '.'));
  s += p(_tr('Coup : la bille au contact des doigts, puis la lettre vers laquelle va le groupe (' + code('A-M') + '). En flèche, une bille d’extrémité puis la lettre de chaque bille (' + code('AC-SR') + '). Une éjection : « e » et le rang de la bille éjectée, en chiffres romains pour Noir (' + code('AC-S (eI)') + '), arabes pour Blanc. La partie de l’article : ' + code(GH_EXEMPLE_1989) + '.',
    'Move: the marble touching the fingers, then the letter the group heads for (' + code('A-M') + '). Broadside: an end marble, then each marble’s letter (' + code('AC-SR') + '). An ejection: “e” and the rank of the ejected marble, Roman numerals for Black (' + code('AC-S (eI)') + '), Arabic for White. The article’s game: ' + code(GH_EXEMPLE_1989) + '.'));
  s += p(_tr('Jugé trop compliqué et ambigu, il a été remplacé dès 1990. Deux points restaient flous, et Abalassembly suit les exemples publiés : une case sur une médiane va au quartier d’une base de départ (AE, puis MQ) quand elle le borde, sinon à la base la plus proche du début de l’alphabet ; en flèche, on nomme la bille d’extrémité dont le nom vient en premier. Une même écriture en flèche peut viser deux groupes différents, mais jamais dans une même position : c’est la position qui tranche.',
    'Found too complicated and ambiguous, it was replaced as early as 1990. Two points were unclear, and Abalassembly follows the published examples: a cell on a median goes to the quarter of a starting base (AE, then MQ) when it borders it, otherwise to the base closest to the start of the alphabet; in a broadside, the end marble whose name comes first is named. The same broadside writing can point to two different groups, but never in the same position: the position decides.'));
  s += h(_tr('Michael Frank (MIT, début des années 1990)', 'Michael Frank (MIT, early 1990s)'));
  s += p(_tr('Il montre qu’on peut repérer chaque case par deux nombres, x et y, en inscrivant l’hexagone dans un carré : le troisième axe n’est pas nécessaire. Remplacer ensuite les chiffres des ordonnées par des lettres, c’est le principe d’Aba-Pro (rangées a à i, diagonales 1 à 9). Pour les coups, il n’a pas abouti : l’idée de nommer les directions par les points cardinaux a été abandonnée. Il n’y a donc pas de notation de Frank à afficher ; ses échanges sont archivés au MIT : ',
    'He shows that each cell can be located by two numbers, x and y, by fitting the hexagon in a square: the third axis is not needed. Then replacing the y digits with letters is Aba-Pro’s principle (rows a to i, diagonals 1 to 9). For moves he did not get there: the idea of naming directions by compass points was dropped. So there is no Frank notation to display; his exchanges are archived at MIT: ')
    + '<a href="https://groups.csail.mit.edu/medg/ftp/abalone/" target="_blank" rel="noopener" style="color:var(--gold)">groups.csail.mit.edu/medg/ftp/abalone</a>.');
  const snaps = (typeof boardSnapshots !== 'undefined' ? boardSnapshots : []).filter(function (x) { return x && x.color && x.moveInfo; });
  if (snaps.length) {
    s += h(_tr('La partie en cours', 'The current game'));
    [['ghigou90', '1990'], ['ghigou89', '1989']].forEach(function (z) {
      s += '<div style="font-size:12px;color:var(--muted);margin:6px 0 4px">' + z[1] + '</div><textarea readonly rows="3" style="width:100%;box-sizing:border-box;font-family:\'DM Mono\',monospace;font-size:12px;background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:8px">' + escapeHtml(partieGhigou(z[0], snaps)) + '</textarea>';
    });
  }
  s += '<div style="font-size:11px;color:var(--muted);margin-top:16px;line-height:1.5">' + _tr('Sources : <i>Jeux &amp; Stratégie</i> n° 1 (octobre 1989), n° 6 (avril 1990) et n° 7 (mai-juin 1990) ; blog Abalone Online, « Les systèmes de notation », 1er mars 2017. Les parties d’exemple se rejouent coup pour coup avec ces tables (tests d’Abalassembly).',
    'Sources: <i>Jeux &amp; Stratégie</i> no. 1 (October 1989), no. 6 (April 1990) and no. 7 (May-June 1990); Abalone Online blog, “Les systèmes de notation”, 1 March 2017. The example games replay move by move with these tables (Abalassembly’s tests).') + '</div>';
  el.innerHTML = s;
}
function ouvrirNotationsHistoriques() {
  renderNotationsHistoriques();
  if (typeof openModal === 'function') openModal('notations-historiques');
}
try { syncNotationHistorique(); document.addEventListener('DOMContentLoaded', syncNotationHistorique); } catch (e) {}
</script>
