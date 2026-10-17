
/* ═══════════════════════════════════════════
   LISTE ET COMMENTAIRES DE LA PARTIE (v2.58), comme dans Uncle Lolo's Abalone (ULA)
   Demande d'Olivier, captures d'ULA a l'appui : pendant une partie, deux onglets de plus.
   - LISTE : les coups en tableau Coup | Noir | Blanc, en Aba-Pro, avec le score apres
     chaque ejection « (2-1) » (Noirs-Blancs), comme la Liste d'ULA. Toucher un coup
     montre la position apres lui.
   - COMMENTAIRES : un bloc par demi-coup, comme le journal d'ULA (« 1x. I9H8 / somme des
     distances au centre noirs,blancs : 43,46 ... / 1y. A5B5 (suite prévue: ... évaluation16) »).
     Pour chaque coup de l'IA : sa suite prevue, son evaluation, la profondeur, le nombre de
     positions examinees et le temps ; ou d'ou vient le coup quand il n'a pas ete calcule
     (livre d'ouvertures, table de finale...). Pour chaque position, quatre mesures des deux
     camps, calculees ici et definies plus bas.
   Les notations d'ULA et du site sont les memes : la partie du journal d'ULA joint par Olivier
   (217 coups, Marguerite belge) se rejoue entierement ici, ejections aux memes coups, 6-2.
   Les mesures « compacité visuelle » et « vision vers centre » d'ULA ne sont pas reprises :
   leur definition n'est pas publiee. Le site affiche les siennes, qu'il sait calculer.
═══════════════════════════════════════════ */

/* Mesures d'une position, pour les deux camps (objet plateau « r,c » -> couleur) :
   - centre : somme des distances des billes a la case centrale e5 (plus c'est bas, plus le
     camp est central ; meme idee que la « somme des distances au centre » d'ULA) ;
   - cohesion : nombre de paires de billes voisines du meme camp ;
   - bord : billes sur le cercle exterieur du plateau ;
   - danger : billes que l'adversaire pourrait ejecter des son prochain coup (sumito 2 contre 1,
     3 contre 1 ou 3 contre 2 vers l'exterieur). */
function mesuresPosition(plateau) {
  const C = rcToAxial(4, 4);
  const m = { centre: { black: 0, white: 0 }, coh: { black: 0, white: 0 }, bord: { black: 0, white: 0 }, danger: { black: 0, white: 0 } };
  const occ = {};
  Object.keys(plateau || {}).forEach(function (k) {
    const col = plateau[k]; if (col !== 'black' && col !== 'white') return;
    const p = k.split(','), a = rcToAxial(+p[0], +p[1]);
    occ[a.q + ',' + a.r] = col;
    const d = _hexDist(a, C);
    m.centre[col] += d; if (d === 4) m.bord[col]++;
  });
  const coul = function (q, r) { return occ[q + ',' + r]; };
  // une paire comptee une fois : trois directions sur six
  const D3 = [{ q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }];
  Object.keys(occ).forEach(function (k) {
    const p = k.split(','), q = +p[0], r = +p[1], col = occ[k];
    D3.forEach(function (d) { if (coul(q + d.q, r + d.r) === col) m.coh[col]++; });
    // menacee : au bord dans la direction d, poussee par une file adverse plus longue
    const adv = col === 'black' ? 'white' : 'black';
    for (let i = 0; i < AX_DIRS.length; i++) {
      const d = AX_DIRS[i];
      if (axialToRc(q + d.q, r + d.r)) continue;          // la case suivante doit etre hors du plateau
      let n = 0, x = q, y = r;
      while (n < 3 && coul(x, y) === col) { n++; x -= d.q; y -= d.r; }
      if (n > 2) continue;                                  // trois billes ne se poussent pas
      let a = 0;
      while (a < 3 && coul(x, y) === adv) { a++; x -= d.q; y -= d.r; }
      if (a > n) { m.danger[col]++; break; }
    }
  });
  return m;
}

/* Le coup brut (cases, direction) en Aba-Pro, sans le rejouer : un groupe de deux ou trois
   billes qui ne se deplace pas dans son propre axe est un coup lateral. */
function _notationCoupBrut(cells, dir) {
  if (!cells || !cells.length || !dir) return '?';
  let type = 'move';
  if (cells.length > 1) {
    const a = rcToAxial(cells[0].r, cells[0].c), b = rcToAxial(cells[1].r, cells[1].c);
    const dq = b.q - a.q, dr = b.r - a.r;
    if (!((dq === dir.q && dr === dir.r) || (dq === -dir.q && dr === -dir.r))) type = 'broadside';
  }
  return moveToABAPRO(cells, dir, type);
}

/* Combien de billes adverses un sumito a poussees : on suit la file devant la tete du groupe,
   sur la position d'avant le coup. */
function _billesPoussees(avant, cells, dir, col) {
  if (!avant || !cells || !dir) return 0;
  const proj = function (c) { const a = rcToAxial(c.r, c.c); return a.q * dir.q + a.r * dir.r; };
  const tete = cells.slice().sort(function (x, y) { return proj(y) - proj(x); })[0];
  const adv = col === 'black' ? 'white' : 'black';
  let a = rcToAxial(tete.r, tete.c), n = 0;
  for (;;) {
    a = { q: a.q + dir.q, r: a.r + dir.r };
    const rc = axialToRc(a.q, a.r);
    if (!rc || avant[rc.r + ',' + rc.c] !== adv) break;
    n++;
  }
  return n;
}

// D'ou vient un coup de l'IA qui n'a pas ete calcule (rempli juste avant executeAIMove)
var _sourceCoupIA = null;
function _noterSourceCoupIA(src, couleur) { _sourceCoupIA = { src: src, c: couleur }; }
function _texteSourceCoupIA(src) {
  return ({
    table: _tr('Coup parfait de la table de finale (4 contre 2).', 'Perfect move from the endgame table (4 against 2).'),
    livre: _tr('Coup du livre d’ouvertures, tiré de vraies parties.', 'Opening book move, taken from real games.'),
    stat: _tr('Coup du livre d’ouvertures, tiré de vraies parties.', 'Opening book move, taken from real games.'),
    empreinte: _tr('Coup joué dans de vraies parties depuis exactement la même position.', 'Move played in real games from exactly the same position.'),
    n1: _tr('Niveau 1 : un des quatre coups les plus actifs, au hasard, sans calcul.', 'Level 1: one of the four most active moves, at random, without search.')
  })[src] || '';
}

/* ── Les donnees de la liste : un element par demi-coup ── */
function _demiCoups() {
  const S = (typeof boardSnapshots !== 'undefined' && boardSnapshots) ? boardSnapshots : [];
  const decal = (S.length && S[0].color === 'white') ? 1 : 0;   // les Blancs ont commence : « … » chez les Noirs
  return S.map(function (s, i) {
    const mi = s.moveInfo;
    let n = (mi && mi.cells && mi.dir) ? moveToABAPRO(mi.cells, mi.dir, mi.type) : String(s.label || '').split(/[^a-i0-9]+/i)[0];
    if (mi && mi.ejection) n += ' (' + s.capturedByBlack + '-' + s.capturedByWhite + ')';
    return { i: i, s: s, col: s.color, n: n, num: Math.floor((i + decal) / 2) + 1 };
  });
}
function _indexCourant() {
  const S = (typeof boardSnapshots !== 'undefined' && boardSnapshots) ? boardSnapshots : [];
  if (typeof replayMode !== 'undefined' && replayMode && typeof replayCurrentIdx === 'number') return replayCurrentIdx;
  return S.length - 1;
}

/* ── Onglet LISTE ── */
function renderListeCoups() {
  const hote = document.getElementById('liste-coups'); if (!hote) return;
  const L = _demiCoups();
  if (!L.length) { hote.innerHTML = '<div style="padding:16px 0;color:var(--muted);font-size:13px">' + _tr('Aucun coup joué pour l’instant.', 'No move played yet.') + '</div>'; hote.dataset.n = '0'; return; }
  const lignes = [];
  L.forEach(function (d) {
    let l = lignes[d.num - 1]; if (!l) l = lignes[d.num - 1] = { num: d.num, black: null, white: null };
    l[d.col] = d;
  });
  const cour = _indexCourant();
  const td = function (d) {
    if (!d) return '<td class="lc-vide">…</td>';
    return '<td class="lc-coup' + (d.i === cour ? ' lc-courant' : '') + '" data-i="' + d.i + '" onclick="_gotoMoveFromHistory(' + d.i + ')" title="' + _tr('Voir la position après ce coup', 'See the position after this move') + '">' + d.n + '</td>';
  };
  hote.innerHTML = '<table class="liste-coups"><thead><tr><th>' + _tr('Coup', 'Move') + '</th><th>' + _tr('Noir', 'Black') + '</th><th>' + _tr('Blanc', 'White') + '</th></tr></thead><tbody>'
    + lignes.filter(Boolean).map(function (l) { return '<tr><td class="lc-num">' + l.num + '</td>' + td(l.black) + td(l.white) + '</tr>'; }).join('') + '</tbody></table>';
  hote.dataset.n = String(L.length);
  _defilerVersCourant(hote, '.lc-courant');
}

/* ── Onglet COMMENTAIRES ── */
function _cleMesures(s) { if (!s._mes) s._mes = mesuresPosition(s.board); return s._mes; }
function _lignesCommentaire(d, L, rep) {
  const s = d.s, mi = s.moveInfo, out = [];
  const ia = s.ia, det = ia && ia.detail;
  // un coup de l'IA porte sa reflexion (s.ia) ou sa source (livre, table...) : une partie importee
  // ou jouee a deux n'en a pas, et rien n'y est attribue a l'IA
  const estIA = !!ia || !!s.src;
  // ce que le coup a fait
  const avant = d.i > 0 ? L[d.i - 1].s.board : null;
  if (mi && mi.type === 'push' && avant) {
    const n = _billesPoussees(avant, mi.cells, mi.dir, d.col);
    if (n) out.push({ t: _tr('Sumito ' + mi.cells.length + ' contre ' + n + (mi.ejection ? ' : éjection ! Score ' + s.capturedByBlack + '-' + s.capturedByWhite + ' (Noirs-Blancs).' : '.'),
                             'Sumito ' + mi.cells.length + ' against ' + n + (mi.ejection ? ': ejection! Score ' + s.capturedByBlack + '-' + s.capturedByWhite + ' (Black-White).' : '.')), k: 'evt' });
  }
  if (rep > 1) out.push({ t: _tr('Position déjà vue : ' + rep + 'e fois.', 'Position seen before: time ' + rep + '.'), k: 'evt' });
  // la reflexion de l'IA
  if (det && det.prof && det.prof.length) {
    const p = det.prof[0], l = p.lignes[0];
    const suite = (l && l.pv && l.pv.length) ? l.pv.map(function (x) { return _notationCoupBrut(x.cells, x.dir); }).join(' - ') : '';
    const noeuds = det.prof.reduce(function (a, x) { return a + (x.noeuds || 0); }, 0);
    if (suite) out.push({ t: _tr('Suite prévue : ', 'Expected continuation: ') + suite, k: 'ia' });
    if (Math.abs(ia.e) >= 90000) out.push({ t: ia.e > 0 ? _tr('J’ai trouvé un gain forcé.', 'I found a forced win.') : _tr('Hmm… ça sent mauvais : toutes mes suites perdent.', 'Hmm… this smells bad: all my lines lose.'), k: 'ia' });
    if (p.total === 1) out.push({ t: _tr('Coup obligatoire : le seul possible.', 'Forced move: the only one possible.'), k: 'ia' });
    out.push({ t: _tr('Évaluation ', 'Evaluation ') + _evalReflexionTexte(ia.e) + _tr(' pour l’IA · profondeur ', ' for the AI · depth ') + ia.p
      + ' · ' + noeuds.toLocaleString(currentLang() === 'EN' ? 'en-GB' : 'fr-FR') + _tr(' positions · ', ' positions · ') + _msTexte(ia.t || p.fin || 0), k: 'ia' });
  } else if (ia) {
    out.push({ t: _tr('Évaluation ', 'Evaluation ') + _evalReflexionTexte(ia.e) + _tr(' pour l’IA · profondeur ', ' for the AI · depth ') + ia.p + ' · ' + _msTexte(ia.t || 0), k: 'ia' });
  } else if (s.src) {
    out.push({ t: _texteSourceCoupIA(s.src), k: 'ia' });
  }
  return { lignes: out, estIA: estIA };
}
function renderCommentaires() {
  const hote = document.getElementById('commentaires-coups'); if (!hote) return;
  const L = _demiCoups();
  const ent = document.getElementById('commentaires-entete');
  if (ent) ent.textContent = _enteteCommentaires();
  if (!L.length) { hote.innerHTML = '<div style="padding:16px 0;color:var(--muted);font-size:13px">' + _tr('Les commentaires s’écrivent ici, coup après coup.', 'Comments are written here, move after move.') + '</div>'; hote.dataset.n = '0'; return; }
  const vus = {};
  const cour = _indexCourant();
  const nom = function (c) { return c === 'black' ? '⚫' : '⚪'; };
  let h = '';
  L.forEach(function (d) {
    const cle = Object.keys(d.s.board).filter(function (k) { return d.s.board[k]; }).sort().map(function (k) { return k + d.s.board[k][0]; }).join('') + (d.col === 'black' ? 'w' : 'b');
    vus[cle] = (vus[cle] || 0) + 1;
    const C = _lignesCommentaire(d, L, vus[cle]);
    const M = _cleMesures(d.s);
    h += '<div class="cmt' + (d.i === cour ? ' cmt-courant' : '') + '" data-i="' + d.i + '" onclick="_gotoMoveFromHistory(' + d.i + ')">'
      + '<div class="cmt-tete"><span class="cmt-num">' + d.num + '.</span> ' + nom(d.col) + ' <b>' + d.n + '</b>'
      + (C.estIA ? ' <span class="cmt-qui">' + _tr('IA', 'AI') + '</span>' : '') + '</div>'
      + C.lignes.map(function (x) { return '<div class="cmt-ligne cmt-' + x.k + '">' + x.t + '</div>'; }).join('')
      + '<div class="cmt-mes">'
      + '<span></span><span>⚫</span><span>⚪</span>'
      + '<span>' + _tr('Distance au centre', 'Distance to centre') + '</span><span>' + M.centre.black + '</span><span>' + M.centre.white + '</span>'
      + '<span>' + _tr('Cohésion', 'Cohesion') + '</span><span>' + M.coh.black + '</span><span>' + M.coh.white + '</span>'
      + '<span>' + _tr('Au bord', 'On the edge') + '</span><span>' + M.bord.black + '</span><span>' + M.bord.white + '</span>'
      + '<span>' + _tr('En danger', 'In danger') + '</span><span' + (M.danger.black ? ' class="cmt-alerte"' : '') + '>' + M.danger.black + '</span><span' + (M.danger.white ? ' class="cmt-alerte"' : '') + '>' + M.danger.white + '</span>'
      + '</div></div>';
  });
  hote.innerHTML = h;
  hote.dataset.n = String(L.length);
  _defilerVersCourant(hote, '.cmt-courant');
}
function _enteteCommentaires() {
  const lay = (typeof currentLayout !== 'undefined') ? currentLayout : 'standard';
  const nomLay = (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[lay]) || lay;
  const mode = (typeof GameMode !== 'undefined') ? GameMode.get() : 'ai';
  let qui = '';
  if (mode === 'ai') {
    const niv = (typeof _niveauIA === 'function') ? _niveauIA() : null;
    const moi = (typeof HumanColor !== 'undefined') ? HumanColor.get() : 'black';
    qui = _tr(' · contre l’IA' + (niv ? ' niveau ' + niv : '') + ' · tu as les ' + (moi === 'black' ? 'Noirs' : 'Blancs'),
              ' · against the AI' + (niv ? ' level ' + niv : '') + ' · you play ' + (moi === 'black' ? 'Black' : 'White'));
  } else if (mode === 'local') qui = _tr(' · à deux sur le même écran', ' · two players, same screen');
  return nomLay + qui;
}
function _defilerVersCourant(hote, sel) {
  const el = hote.querySelector(sel); if (!el) return;
  // le conteneur qui defile est le panneau de l'onglet
  const pan = hote.closest('.game-tab-panel') || hote;
  try {
    const r = el.getBoundingClientRect(), rp = pan.getBoundingClientRect();
    if (r.top < rp.top || r.bottom > rp.bottom) pan.scrollTop += (r.top - rp.top) - pan.clientHeight / 2;
  } catch (e) {}
}

/* ── Mise a jour : onglet ouvert seulement (sinon, au moment de l'ouvrir) ── */
function _ongletVisible(id) { const p = document.getElementById(id); return !!(p && p.classList && p.classList.contains('active')); }
function _majOngletsPartie() {
  _majBoutonRetour();
  if (_ongletVisible('gpanel-liste')) renderListeCoups();
  if (_ongletVisible('gpanel-commentaires')) renderCommentaires();
}
// une seule mise a jour pour une rafale de coups (partie chargee d'un coup : des centaines d'appels)
var _majOngletsMinuteur = null;
function _majOngletsPartieBientot() {
  if (_majOngletsMinuteur) return;
  _majOngletsMinuteur = setTimeout(function () { _majOngletsMinuteur = null; _majOngletsPartie(); }, 0);
}
// billes deja ejectees dans la position de depart du rejeu (un puzzle en a souvent)
var _replayStartCaptures = null;
/* Navigation, comme les fleches sous la Liste d'ULA : debut, precedent, suivant, fin, et
   retour a la partie en cours quand on la revoit en pleine partie. */
function naviguerCoups(ou) {
  const S = (typeof boardSnapshots !== 'undefined' && boardSnapshots) ? boardSnapshots : [];
  if (!S.length) { showToast(_tr('Aucun coup enregistré', 'No move recorded')); return; }
  if (ou === 'partie') { if (typeof replayMode !== 'undefined' && replayMode && typeof toggleReplay === 'function') toggleReplay(); _majOngletsPartie(); return; }
  if (ou === 'debut') { _gotoMoveFromHistory((typeof _replayStartBoard !== 'undefined' && _replayStartBoard) ? -1 : 0); return; }
  if (ou === 'fin') { _gotoMoveFromHistory(S.length - 1); return; }
  if (typeof replayMode !== 'undefined' && !replayMode) { _gotoMoveFromHistory(S.length - 1 + (ou < 0 ? -1 : 0)); return; }
  replayStep(ou);
}
function _majBoutonRetour() {
  const enRejeu = typeof replayMode !== 'undefined' && replayMode;
  document.querySelectorAll('.coups-nav-retour').forEach(function (b) { b.style.display = enRejeu ? '' : 'none'; });
}
// au fil du rejeu : seulement la mise en evidence (pas de nouveau rendu)
function _majSurbrillanceOnglets(idx) {
  _majBoutonRetour();
  [['liste-coups', 'lc-courant', '.lc-coup'], ['commentaires-coups', 'cmt-courant', '.cmt']].forEach(function (x) {
    const hote = document.getElementById(x[0]); if (!hote || !hote.querySelectorAll) return;
    hote.querySelectorAll(x[2]).forEach(function (el) { el.classList.toggle(x[1], Number(el.dataset.i) === idx); });
    if (_ongletVisible(x[0] === 'liste-coups' ? 'gpanel-liste' : 'gpanel-commentaires')) _defilerVersCourant(hote, '.' + x[1]);
  });
}

/* ── Copier, pour garder ou partager (comme le journal d'ULA, en texte) ── */
function copierListeCoups() {
  const L = _demiCoups(); if (!L.length) { showToast(_tr('Aucun coup à copier', 'No move to copy')); return; }
  const lignes = [];
  L.forEach(function (d) { let l = lignes[d.num - 1]; if (!l) l = lignes[d.num - 1] = { num: d.num, black: '…', white: '' }; l[d.col] = d.n; });
  const t = _tr('Coup\tNoir\tBlanc', 'Move\tBlack\tWhite') + '\n' + lignes.filter(Boolean).map(function (l) { return l.num + '\t' + l.black + '\t' + l.white; }).join('\n');
  _copierTexte(t, _tr('📋 Liste copiée', '📋 List copied'));
}
function texteCommentaires() {
  const L = _demiCoups(), vus = {};
  const out = ['Abalassembly — ' + _enteteCommentaires()];
  L.forEach(function (d) {
    const cle = Object.keys(d.s.board).filter(function (k) { return d.s.board[k]; }).sort().map(function (k) { return k + d.s.board[k][0]; }).join('') + (d.col === 'black' ? 'w' : 'b');
    vus[cle] = (vus[cle] || 0) + 1;
    const C = _lignesCommentaire(d, L, vus[cle]), M = _cleMesures(d.s);
    out.push(d.num + (d.col === 'black' ? 'x' : 'y') + '. ' + d.n + (C.estIA ? ' (' + _tr('IA', 'AI') + ')' : ''));
    C.lignes.forEach(function (x) { out.push('  ' + x.t); });
    out.push('  ' + _tr('distance au centre noirs,blancs : ', 'distance to centre black,white: ') + M.centre.black + ', ' + M.centre.white
      + _tr(' · cohésion : ', ' · cohesion: ') + M.coh.black + ', ' + M.coh.white
      + _tr(' · au bord : ', ' · on the edge: ') + M.bord.black + ', ' + M.bord.white
      + _tr(' · en danger : ', ' · in danger: ') + M.danger.black + ', ' + M.danger.white);
  });
  return out.join('\n');
}
function copierCommentaires() {
  if (!_demiCoups().length) { showToast(_tr('Aucun commentaire à copier', 'No comment to copy')); return; }
  _copierTexte(texteCommentaires(), _tr('📋 Commentaires copiés', '📋 Comments copied'));
}

