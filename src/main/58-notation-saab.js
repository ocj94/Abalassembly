/* ═══════════════════════════════════════════
   LA NOTATION DE SAAB (v2.98) : le code de position de KAAH et KAAWA
   Demande d'ocj94, apres l'explication de Saab (30/10/2026) :
   « ce n'est pas une notation de coup, c'est la notation de la position
   complete compressee » -- plutot « factorisee » : a1 a2 b1 b2 b3 devient
   a12b123. Devant chaque camp, le nombre de SES billes manquantes ; les deux
   camps separes par « _ ». Belgian Daisy : 0a12b123c23g78h789i89_0a45b456c56g45h456i56 ;
   en mort subite (5 billes deja perdues de chaque cote) : 5a12..._5a45...
   Deux positions qui se suivent donnent le coup, dans n'importe quelle
   notation ; une position seule s'affiche sans rejouer la partie.

   Ce que ce module ajoute (le code lui-meme, codePosition, existe depuis v2.6x) :
   - lireCodePosition : le chemin inverse, controle (cases existantes, sans doublon) ;
   - posRefKAAH : la « posRef », la forme sous laquelle KAAH range une position
     quelle que soit son orientation. Saab : « le camp qui a le plus de billes
     est toujours Noir, ensuite la position est toujours celle qui a les billes
     les plus proches de a1, sinon a2, a3, b2... ». Port exact de
     positionCanonique (KAAH, moteur/permutations.js) : parmi les 12 symetries
     -- et les camps echanges quand ils ont autant de billes --, la plus petite
     liste de cases triees ; a egalite, la premiere rencontree. Le
     « code_permut_Ref_Orig » dit laquelle des 12 y mene (0 a 11), +100 si
     les camps ont ete echanges. Compare au code de KAAH sur 480 positions de
     six dispositions : zero ecart (l'ancienne « forme canonique », le plus
     petit des 12 codes, differait dans 43 % des cas) ;
   - jouerDepuisCode : une partie qui part de n'importe quelle position, que
     l'historique et la « Partie par code » savent rejouer (le code de partie
     porte alors sa position de depart, « pos_<code> », a la place du nom
     de la disposition) ;
   - les fichiers de partie de KAAH et KAAWA (.json) : chaque coup y porte sa
     position (« pos »). A la lecture, c'est elle qui designe le coup, parmi
     les coups legaux -- exactement l'idee de Saab ; le texte Nacre ne sert
     qu'en secours. A l'ecriture, les champs que lit KAAH (Tree, pos, nacre,
     is_origin, Players, Eject, Winner, Term, Timer), verifies en relisant les
     fichiers produits avec son propre chargeur (donneesVersArbre).
═══════════════════════════════════════════ */
function _saabComprimer(noms) {
  let t = '', prec = '';
  noms.slice().sort().forEach(function (nm) { if (nm[0] !== prec) { t += nm[0]; prec = nm[0]; } t += nm.slice(1); });
  return t;
}
/* Le code d'une position -> { plateau, ejNoires, ejBlanches }, ou null s'il est illisible. */
function lireCodePosition(code) {
  const m = /^(\d)((?:[a-i]\d+)*)_(\d)((?:[a-i]\d+)*)$/.exec(String(code || '').trim().replace(/\s+/g, ''));
  if (!m) return null;
  const plateau = {};
  let ok = true;
  [[m[2], 'black'], [m[4], 'white']].forEach(function (p) {   // pas de plafond a 14 : la Sibe part a 15
    (p[0].match(/[a-i]\d+/g) || []).forEach(function (g) {
      for (const ch of g.slice(1)) {
        const rc = abaproToRc(g[0] + ch);
        if (!rc || plateau[rc.r + ',' + rc.c]) { ok = false; return; }
        plateau[rc.r + ',' + rc.c] = p[1];
      }
    });
  });
  return ok ? { plateau: plateau, ejNoires: +m[1], ejBlanches: +m[3] } : null;
}
function _saabCases(plateau, couleur) {
  return Object.keys(plateau).filter(function (k) { return plateau[k] === couleur; })
    .map(function (k) { const p = k.split(',').map(Number); return String(coordToABAPRO(p[0], p[1])); }).sort();
}
/* L'image d'une case par la symetrie n° index de KAAH (0-5 : rotations ; 6-11 : miroir puis rotation,
   affichees 10-15). Les memes que permutationsPosition, verifiees case par case contre KAAH. */
function _saabImage(nom, index) {
  const rc = abaproToRc(nom), c0 = rcToAxial(4, 4), a = rcToAxial(rc.r, rc.c);
  const b = _symAxiale(index < 6 ? index : index + 4)({ q: a.q - c0.q, r: a.r - c0.r });
  const t = axialToRc(b.q + c0.q, b.r + c0.r);
  return String(coordToABAPRO(t.r, t.c));
}
function posRefKAAH(code) {
  const L = lireCodePosition(code);
  if (!L) return null;
  let A = _saabCases(L.plateau, 'black'), B = _saabCases(L.plateau, 'white'), eA = L.ejNoires, eB = L.ejBlanches, inv = false;
  if (B.length > A.length) { const t = A; A = B; B = t; const e = eA; eA = eB; eB = e; inv = true; }   // le camp qui a le plus de billes devant
  const sym = [];
  for (let i = 0; i < 12; i++) sym.push({ p: A.map(function (n) { return _saabImage(n, i); }).sort(), s: B.map(function (n) { return _saabImage(n, i); }).sort(), i: i });
  const cand = sym.map(function (x) { return { p: x.p, s: x.s, i: x.i, inv: false }; });
  if (A.length === B.length) sym.forEach(function (x) { cand.push({ p: x.s, s: x.p, i: x.i, inv: true }); });
  let best = null;
  cand.forEach(function (c) { c.cle = c.p.join('') + '_' + c.s.join(''); if (!best || c.cle < best.cle) best = c; });
  const invF = inv || best.inv, ej = best.inv ? [eB, eA] : [eA, eB];
  return { posRef: ej[0] + _saabComprimer(best.p) + '_' + ej[1] + _saabComprimer(best.s),
           index: best.i, inverses: invF, codePermut: best.i + (invF ? 100 : 0) };
}

/* ── Une partie depuis n'importe quelle position ── */
var departPosition = null;   // le code de la position de depart de la partie en cours, si ce n'est pas une disposition (remis a null par resetGame)
function _saabPoser(L, code) {
  board = JSON.parse(JSON.stringify(L.plateau));
  CapturedByWhite.set(L.ejNoires); CapturedByBlack.set(L.ejBlanches);   // billes noires perdues = score de Blanc
  _replayStartBoard = JSON.parse(JSON.stringify(board));
  if (typeof _replayStartCaptures !== 'undefined') _replayStartCaptures = { b: L.ejBlanches, w: L.ejNoires };
  if (typeof _bookNode !== 'undefined') _bookNode = null;   // le livre d'ouvertures ne connait pas cette position
  departPosition = code;
}
function _saabRaisonCode(L) {
  if (!L) return _tr('Code de position illisible (format : 0a12b123..._0a45b456...)', 'Unreadable position code (format: 0a12b123..._0a45b456...)');
  const v = Object.values(L.plateau);
  if (v.indexOf('black') < 0 || v.indexOf('white') < 0) return _tr('Il faut des billes des deux couleurs', 'Both colours need marbles');
  if (L.ejNoires >= 6 || L.ejBlanches >= 6) return _tr('Six billes perdues : cette partie est déjà finie', 'Six marbles lost: this game is already over');
  return '';
}
function jouerDepuisCode(code) {
  code = String(code || '').trim().replace(/\s+/g, '');
  const L = lireCodePosition(code), raison = _saabRaisonCode(L);
  if (raison) { if (typeof showToast === 'function') showToast('⚠️ ' + raison); return false; }
  ['permut-modal', 'apgn-import-modal'].forEach(function (id) { const m = document.getElementById(id); if (m && m.remove) m.remove(); });
  if (typeof showPage === 'function') showPage('game');
  if (typeof resetGame === 'function') resetGame();
  _saabPoser(L, code);
  selected = [];
  if (typeof drawBoard === 'function') drawBoard();
  if (typeof updateCaptures === 'function') updateCaptures();
  if (typeof updateStatus === 'function') updateStatus();
  if (typeof _majCodePosition === 'function') _majCodePosition();
  if (typeof GameMode !== 'undefined' && GameMode.get() === 'ai' && CurrentTurn.get() !== HumanColor.get() && typeof aiMove === 'function')
    setTimeout(function () { if (!GameOver.get() && CurrentTurn.get() !== HumanColor.get()) aiMove(); }, 700);
  if (typeof showToast === 'function') showToast(_tr('▶ Position chargée — les noirs jouent', '▶ Position loaded — Black to play'));
  return true;
}

/* ── Les fichiers de partie de KAAH et KAAWA (.json) ── */
function _saabCodeApres(m, couleur) {
  const undo = applyMove(m, couleur);
  try { return codePosition(board, CapturedByWhite.get(), CapturedByBlack.get()); } finally { undoMove(undo); }
}
/* Lit un fichier de partie (l'objet JSON) : la ligne reellement jouee (les noeuds is_origin), chaque coup
   retrouve par la position qu'il produit. Ne touche pas a la partie en cours. */
function lirePartieKAAH(d) {
  if (!d || !d.Tree || typeof d.Tree.pos !== 'string') return { ok: false, raison: _tr('ce n’est pas un fichier de partie KAAH ou KAAWA (pas de Tree.pos)', 'this is not a KAAH or KAAWA game file (no Tree.pos)') };
  const depart = d.Tree.pos.trim(), L = lireCodePosition(depart);
  if (!L) return { ok: false, raison: _tr('position de départ illisible', 'unreadable starting position') };
  const sb = board, scb = CapturedByBlack.get(), scw = CapturedByWhite.get(), coups = [];
  let noeud = d.Tree, couleur = 'black', raison = '';
  try {
    board = JSON.parse(JSON.stringify(L.plateau)); CapturedByWhite.set(L.ejNoires); CapturedByBlack.set(L.ejBlanches);
    for (let i = 0; i < 1000; i++) {
      const enf = Array.isArray(noeud.children) ? noeud.children : [];
      if (!enf.length) break;
      const suiv = enf.find(function (e) { return e && e.is_origin; }) || enf[0];
      const ms = getAllMovesForColor(couleur);
      let m = null;
      if (typeof suiv.pos === 'string') { const p = suiv.pos.trim(); m = ms.find(function (x) { return _saabCodeApres(x, couleur) === p; }) || null; }
      if (!m && suiv.nacre) m = ms.find(function (x) { return moveToNACRE(x.cells, x.dir, x.info.type) === String(suiv.nacre).toLowerCase(); }) || null;
      if (!m) { raison = _tr('coup ', 'move ') + (i + 1) + ' (' + (suiv.nacre || '?') + ') ' + _tr('introuvable dans la position', 'not found in the position'); break; }
      coups.push({ cells: m.cells, dir: m.dir, type: m.info.type, ejection: !!(m.info.type === 'push' && m.info.ejection), aba: moveToABAPRO(m.cells, m.dir, m.info.type) });
      applyMove(m, couleur);
      couleur = couleur === 'black' ? 'white' : 'black';
      noeud = suiv;
    }
  } finally { board = sb; CapturedByBlack.set(scb); CapturedByWhite.set(scw); }
  const J = d.Players || {};
  return { ok: !raison, raison: raison, depart: depart, coups: coups,
           noir: String(J.P1_black || ''), blanc: String(J.P2_white || ''), date: String(d.Date || ''), evenement: String(d.Event || ''),
           term: String(d.Term || ''), vainqueur: String(d.Winner || '') };
}
/* Ouvre un fichier de partie dans le rejeu, comme une partie de la bibliotheque. */
function chargerPartieKAAH(d) {
  const P = lirePartieKAAH(d);
  if (!P.coups.length && !P.ok) { if (typeof showToast === 'function') showToast('⚠️ ' + P.raison); return P; }
  ['apgn-import-modal'].forEach(function (id) { const m = document.getElementById(id); if (m && m.remove) m.remove(); });
  if (typeof showPage === 'function') showPage('game');
  const L = lireCodePosition(P.depart);
  if (typeof resetGame === 'function') resetGame();
  _saabPoser(L, P.depart);
  if (typeof gcBlackName !== 'undefined') { gcBlackName = P.noir; gcWhiteName = P.blanc; }
  const titre = (P.noir || _tr('Noirs', 'Black')) + ' vs ' + (P.blanc || _tr('Blancs', 'White')) + ' (KAAH' + (P.date ? ' · ' + P.date : '') + ')';
  _replaySeqToSnapshots(P.coups.map(function (c) { return c.aba; }).join(' '), titre, 'black');
  departPosition = P.depart;
  if (!P.ok && typeof showToast === 'function') setTimeout(function () { showToast('⚠️ ' + P.raison); }, 1200);
  return P;
}
function importerFichierKAAH(input) {
  const f = input && input.files && input.files[0];
  if (!f) return;
  const lr = new FileReader();
  lr.onload = function () {
    let d = null;
    try { d = JSON.parse(String(lr.result)); } catch (e) { showToast('⚠️ ' + _tr('Fichier illisible (JSON attendu)', 'Unreadable file (JSON expected)')); return; }
    chargerPartieKAAH(d);
  };
  lr.readAsText(f);
  input.value = '';
}
function _saabStamp(d) {
  const p2 = function (v) { return String(v).padStart(2, '0'); };
  return p2(d.getFullYear() % 100) + p2(d.getMonth() + 1) + p2(d.getDate()) + p2(d.getHours()) + p2(d.getMinutes());
}
function _saabNom(n) { return String(n || '').replace(/[,\n\r]/g, ' ').trim(); }
/* La partie affichee, au format des fichiers de KAAWA (ligne jouee seulement, sans pendule). */
function partieVersKAAH(snaps, opts) {
  opts = opts || {};
  snaps = (snaps || (typeof boardSnapshots !== 'undefined' ? boardSnapshots : [])).filter(function (s) { return s && s.color && s.moveInfo && s.moveInfo.cells; });
  const b0 = opts.depart || (typeof _replayStartBoard !== 'undefined' && _replayStartBoard) || board;
  const c0 = opts.departCaptures || (typeof _replayStartCaptures !== 'undefined' && _replayStartCaptures) || { b: 0, w: 0 };
  const ia = (typeof GameMode !== 'undefined' && GameMode.get() === 'ai') ? (typeof HumanColor !== 'undefined' && HumanColor.get() === 'black' ? 'white' : 'black') : null;
  const noir = _saabNom(opts.noir !== undefined ? opts.noir : ((typeof gcBlackName !== 'undefined' && gcBlackName) || (ia === 'black' ? 'Abalassembly (IA)' : 'Noirs')));
  const blanc = _saabNom(opts.blanc !== undefined ? opts.blanc : ((typeof gcWhiteName !== 'undefined' && gcWhiteName) || (ia === 'white' ? 'Abalassembly (IA)' : 'Blancs')));
  const racine = { pos: codePosition(b0, c0.w, c0.b), nacre: 'START', comment: '', children: [], is_origin: true, index: 0, eject_b: c0.w, eject_w: c0.b, clock: [0, 0], date: '' };
  let cur = racine, ejN = c0.w, ejB = c0.b, fin = '_', vainqueur = 'None';
  snaps.forEach(function (s, i) {
    const n = { nacre: moveToNACRE(s.moveInfo.cells, s.moveInfo.dir, s.moveInfo.type), index: i + 1, children: [], is_origin: true,
                pos: codePosition(s.board, s.capturedByWhite, s.capturedByBlack), eject_b: s.capturedByWhite, eject_w: s.capturedByBlack, comment: '', date: '' };
    ejN = s.capturedByWhite; ejB = s.capturedByBlack;
    if (fin === '_' && (ejN >= 6 || ejB >= 6)) { fin = 'N'; vainqueur = ejB >= 6 ? noir : blanc; n.term_status = 'N'; n.winner = vainqueur; }
    cur.children.push(n); cur = n;
  });
  const lay = (typeof currentLayout !== 'undefined' && currentLayout) || 'standard';
  const nomDispo = departPosition ? 'Position' : ((typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[lay]) || lay);
  return { Date: opts.date || _saabStamp(new Date()), Event: 'Abalassembly', VariantName: _saabNom(nomDispo),
           Players: { P1_black: noir, P2_white: blanc }, History: [racine.pos], Tree: racine,
           Winner: vainqueur, Eject: { P1: ejN, P2: ejB }, Term: fin,
           Timer: { mode: 'chrono', durations: snaps.map(function () { return 0; }),
                    settings: { p1_initial: 0, p2_initial: 0, p1_bonus: 0, p2_bonus: 0, p1_bonus_eject: 0, p2_bonus_eject: 0 } },
           Chrono: { total_p1_remaining: 0, total_p2_remaining: 0 } };
}
function telechargerPartieKAAH() {
  const snaps = (typeof boardSnapshots !== 'undefined' ? boardSnapshots : []).filter(function (s) { return s && s.color && s.moveInfo; });
  if (!snaps.length) { showToast('⚠️ ' + _tr('Aucun coup à exporter — jouez d’abord', 'No move to export — play first')); return null; }
  const d = partieVersKAAH(snaps);
  const nom = 'partie_abalassembly_' + d.Date + '.json';
  if (typeof _scanDownload === 'function') _scanDownload(nom, JSON.stringify(d), 'application/json');
  showToast('💾 ' + nom + ' — ' + _tr('fichier de partie au format de KAAH', 'game file in KAAH’s format'));
  return d;
}
</script>
