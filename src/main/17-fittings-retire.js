/* ═══════════════════════════════════════════
   LECTEUR DE FITTINGS — retiré.
   Les séquences de "fittings" de fightclub99 (et les parties externes type
   PlayStrategy) ne sont pas rejouables directement : le repère de coordonnées
   et l'orientation du plateau de ce jeu diffèrent du standard Aba-Pro/PlayStrategy,
   et les fittings eux-mêmes sont des repositionnements coopératifs (pas des coups
   légaux). L'import de parties externes nécessiterait de recaler tout le système
   de coordonnées sur le standard officiel, ce qui n'est pas envisagé pour l'instant.
   La notation Aba-Pro/Nacre interne du jeu, elle, fonctionne parfaitement.
═══════════════════════════════════════════ */


// Notation NACRE : pour les coups latéraux, on note la 1re bille de la rangée
// + l'arrivée de la DERNIÈRE bille (4 caractères au lieu de 6). Pour les coups en
// ligne, identique à Aba-Pro. C'est le système utilisé par PlayStrategy.
/* Distance hexagonale en coordonnees axiales. */
function _hexDist(a, b) {
  if (!a || !b) return -1;
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

/* Extremites NOMMEES d'un coup : origine d'un bout du groupe, arrivee de
   l'autre bout. C'est la paire que le Nacre ecrit, et ce sont aussi les deux
   points de la fleche du dernier coup — Saab l'a confirme en constatant que
   la fleche c2d4 etait juste alors que la notation ecrivait c3d3.
   Une seule source pour les deux : tant qu'elles etaient calculees
   separement, l'une pouvait deriver sans que l'autre bouge. */
function moveEndpointCells(cells, dir) {
  if (!cells || !cells.length || !dir) return null;
  if (cells.length === 1) {
    const ax = rcToAxial(cells[0].r, cells[0].c);
    const dest = axialToRc(ax.q + dir.q, ax.r + dir.r);
    return dest ? { from: cells[0], to: dest } : null;
  }
  const ends = _nacreGroupEnds(cells);
  if (!ends) return null;
  const cand = [ends.a, ends.b].map(function(from){
    const other = (from === ends.a) ? ends.b : ends.a;
    const ax = rcToAxial(other.r, other.c);
    const dest = axialToRc(ax.q + dir.q, ax.r + dir.r);
    if (!dest) return null;
    return { from: from, to: dest, d: _hexDist(rcToAxial(from.r, from.c), rcToAxial(dest.r, dest.c)) };
  }).filter(Boolean);
  if (!cand.length) return null;
  cand.sort(function(x, y){ return y.d - x.d; });
  return cand[0];
}

/* Les deux extremites d'un groupe aligne (la bille du milieu, s'il y en a
   une, ne sert jamais a la notation). */
function _nacreGroupEnds(sel) {
  if (!sel || sel.length < 2) return null;
  let best = null;
  for (let i = 0; i < sel.length; i++) {
    for (let j = i + 1; j < sel.length; j++) {
      const d = _hexDist(rcToAxial(sel[i].r, sel[i].c), rcToAxial(sel[j].r, sel[j].c));
      if (!best || d > best.d) best = { a: sel[i], b: sel[j], d: d };
    }
  }
  return best;
}

function moveToNACRE(sel, dir, type) {
  if (!sel || !sel.length || !dir) return '?';
  if (type === 'broadside') {
    /* Correction du 24/07/2026, signalee par Saab sur la v1.11.
       La regle appliquee ici etait l'inverse de la bonne : elle ecrivait
       fin_groupe + destination_debut, ce qui donne DEUX CASES ADJACENTES.
       Sur son exemple, le groupe [c2,c3] produisait « c3d3 » au lieu de
       « c2d4 ». Le Nacre note l'origine d'une extremite et l'arrivee de
       l'AUTRE extremite : les deux coordonnees ecrites sont donc les plus
       eloignees possibles, jamais voisines. Sa note sur la v1.7.2 le
       confirme independamment — il y ecrit que le coup « a1b3 » provient
       de billes en a1,a2.

       Le commentaire precedent affirmait la regle prouvee contre huit
       coups lateraux du §11 de son manuel. Elle ne l'etait pas : l'invariant
       de distance maximale ci-dessous est verifie par test sur tous les
       coups lateraux legaux de centaines de positions, ecriture ET relecture.

       On ne trie plus alphabetiquement — un ordre alphabetique n'a aucun
       rapport avec la geometrie du plateau et ne garantit pas la paire la
       plus eloignee. On construit les deux paires candidates et on garde
       celle dont les extremites sont le plus distantes. */
    const ep = moveEndpointCells(sel, dir);
    if (!ep) return '?';
    return coordToABAPRO(ep.from.r, ep.from.c) + coordToABAPRO(ep.to.r, ep.to.c);
  } else {
    // Coup en ligne : queue AVANT le coup + destination de la TÊTE après le
    // coup — distance = taille du groupe, jamais figée à 1 case contrairement
    // à Aba-Pro. Formule prouvée le 19/07/2026 contre les 5 coups d'une
    // vraie solution de puzzle KAA (Pzl_M_0021) rejoués par le vrai moteur —
    // voir _advResolveNacreToken, qui fait exactement l'opération inverse.
    const ax = sel.map(function(s){ return rcToAxial(s.r,s.c); });
    const sorted = ax.slice().sort(function(a,b){ return (a.q*dir.q+a.r*dir.r)-(b.q*dir.q+b.r*dir.r); });
    const tail = sorted[0];
    const head = sorted[sorted.length-1];
    const tailRc = axialToRc(tail.q, tail.r);
    const headDest = axialToRc(head.q + dir.q, head.r + dir.r);
    const from = tailRc ? coordToABAPRO(tailRc.r, tailRc.c) : '';
    const to = headDest ? coordToABAPRO(headDest.r, headDest.c) : '';
    return from + to;  // ex: d5d7 (groupe de 2 : [d5,d6] avant → [d6,d7] après)
  }
}

// Construit le libellé d'un coup selon les systèmes de notation activés (réglages).
// Affiche Aba-Pro et/ou Nacre selon les préférences ; si les deux et qu'ils diffèrent,
// montre les deux séparés par " · ".
function moveLabel(sel, dir, type, ejection) {
  const showAba = (typeof notationAbaPro === 'undefined') ? true : notationAbaPro;
  const showNacre = (typeof notationNacre === 'undefined') ? false : notationNacre;
  const aba = moveToABAPRO(sel, dir, type);
  const nacre = moveToNACRE(sel, dir, type);
  const suffix = ejection ? ' ✕' : '';
  let core;
  if (showAba && showNacre) {
    core = (aba === nacre) ? aba : (aba + ' · ' + nacre);
  } else if (showNacre) {
    core = nacre;
  } else {
    core = aba;  // Aba-Pro par défaut si rien n'est coché
  }
  return core + suffix;
}

function moveToABAPRO(sel, dir, type) {
  if (!sel || !sel.length || !dir) return '?';
  if (type === 'broadside') {
    // Coup en flèche : 2 extrémités de la rangée + position finale de la première bille
    // (notation en ordre alphanumérique, ex: e6e8f6)
    const coords = sel.map(function(s){ return { rc:s, notation: coordToABAPRO(s.r,s.c) }; });
    coords.sort(function(a,b){ return a.notation < b.notation ? -1 : 1; });
    const first = coords[0].rc;
    const last = coords[coords.length-1].rc;
    const firstAx = rcToAxial(first.r, first.c);
    const firstDest = axialToRc(firstAx.q + dir.q, firstAx.r + dir.r);
    const fromA = coordToABAPRO(first.r, first.c);
    const fromB = coordToABAPRO(last.r, last.c);
    const toA = firstDest ? coordToABAPRO(firstDest.r, firstDest.c) : '';
    return fromA + fromB + toA;  // ex: e6e8f6
  } else {
    /* Coup en ligne : depart et arrivee de la bille de QUEUE (ex: e5e6).
       L'Aba-Pro decrit le deplacement de la bille arriere du groupe, qui se
       deplace toujours d'une seule case — c'est ce qui distingue cette
       notation du Nacre, lequel note la queue puis la DESTINATION DE LA TETE
       (donc une distance egale a la taille du groupe).
       Le code utilisait ici la bille de tete pour les deux extremites : tous
       les coups en ligne de plus d'une bille etaient donc faux. Verifie
       contre les sequences de reference de Saab (21/07/2026) : pour un groupe
       [a1,a2] avance vers a3, l'Aba-Pro correct est « a1a2 » et non « a2a3 ».
       Sur une bille seule, queue et tete se confondent : rien ne change. */
    const ax = sel.map(function(s){ return rcToAxial(s.r,s.c); });
    const sorted = ax.slice().sort(function(a,b){ return (a.q*dir.q+a.r*dir.r)-(b.q*dir.q+b.r*dir.r); });
    const tail = sorted[0];
    const tailRc = axialToRc(tail.q, tail.r);
    const tailDest = axialToRc(tail.q + dir.q, tail.r + dir.r);
    const from = tailRc ? coordToABAPRO(tailRc.r, tailRc.c) : '';
    const to = tailDest ? coordToABAPRO(tailDest.r, tailDest.c) : '';
    return from + to;  // ex: e5e6
  }
}

// Ancienne signature conservée pour compatibilité (non utilisée)
function formatMoveABAPRO(fromR, fromC, toR, toC, type) {
  const from = coordToABAPRO(fromR, fromC);
  const to   = coordToABAPRO(toR, toC);
  if (type === 'broadside') return from + '->' + to;
  return from + to;
}

function addMoveToHistory(move, color, moveInfo) {
  if (typeof disarmInactivityCancel === 'function') disarmInactivityCancel();  // un coup a été joué → plus d'annulation auto
  if (typeof _tClockTick==='function') _tClockTick();
  // Save snapshot for replay (avec les infos du coup pour recalculer la notation)
  boardSnapshots.push({
    board: JSON.parse(JSON.stringify(board)),
    capturedByBlack: capturedByBlack,
    capturedByWhite: capturedByWhite,
    moveCount: moveCount,
    label: move, color: color,
    moveInfo: moveInfo || null   // {cells, dir, type, ejection} pour re-notation
  });
  if (_bookNode) bookDescend(moveInfo);   // suit l'ouverture jouée
  const replayBtn = document.getElementById('replay-btn');
  if (replayBtn && boardSnapshots.length > 1) replayBtn.style.display = 'block';

  const list = document.getElementById('move-list');
  if (!list) return;
  appendMoveRow(list, moveInfo, move, color, boardSnapshots.length);
  scrollMoveListToEnd();
}

/* Defile l'historique jusqu'au dernier coup.
   #move-list n'a pas de barre de defilement : c'est son parent .move-history
   qui porte overflow-y:auto. list.scrollTop = list.scrollHeight n'avait donc
   aucun effet, et il fallait scroller a la main pour voir le score
   d'ejection affiche sur le dernier coup. Signale par Saab. */
function scrollMoveListToEnd() {
  const list = document.getElementById('move-list');
  if (!list) return;
  /* Strictement borne au panneau d'historique. La premiere version
     remontait le DOM jusqu'a trouver un ancetre defilable : quand
     .move-history n'en etait pas un (cas frequent en affichage etroit,
     ou le panneau s'etire au lieu de defiler), la boucle continuait
     jusqu'a un conteneur de page et faisait sauter tout l'ecran apres
     chaque coup. Le repli scrollIntoView avait le meme defaut : il
     deplace aussi la fenetre. On ne touche donc qu'au panneau, et
     seulement s'il defile vraiment. */
  const box = list.closest('.move-history');
  if (!box) return;
  const st = window.getComputedStyle(box).overflowY;
  if (st !== 'auto' && st !== 'scroll') return;
  if (box.scrollHeight <= box.clientHeight) return;
  box.scrollTop = box.scrollHeight;
}

// En-tête de la liste (colonnes Aba-Pro / Nacre)
const MOVE_LIST_HEADER = '<div class="move-head"><span></span><span></span><span>Aba-Pro</span><span>Nacre</span></div>';

// Ajoute une ligne de coup : numéro · pastille couleur · Aba-Pro (gauche) · Nacre (droite)
function appendMoveRow(list, moveInfo, fallbackLabel, color, plyNum) {
  const cur = list.querySelector('.move-item.current');
  if (cur) cur.classList.remove('current');
  let aba, nac, ejx = '';
  if (moveInfo && moveInfo.cells && moveInfo.dir) {
    aba = moveToABAPRO(moveInfo.cells, moveInfo.dir, moveInfo.type);
    nac = moveToNACRE(moveInfo.cells, moveInfo.dir, moveInfo.type);
    // Score traditionnel (captures par Noir-captures par Blanc), affiché
    // uniquement sur le coup qui vient d'éjecter — idée de Saab, en
    // s'appuyant sur les compteurs déjà stockés dans le snapshot correspondant
    // (fiable aussi bien en direct qu'au réaffichage de l'historique).
    if (moveInfo.ejection) {
      const snap = (typeof boardSnapshots !== 'undefined') ? boardSnapshots[plyNum - 1] : null;
      const cb = snap ? snap.capturedByBlack : (typeof capturedByBlack !== 'undefined' ? capturedByBlack : 0);
      const cw = snap ? snap.capturedByWhite : (typeof capturedByWhite !== 'undefined' ? capturedByWhite : 0);
      ejx = ' (' + cb + '-' + cw + ')';
    }
  } else { aba = nac = fallbackLabel || ''; }
  const dot = (color === 'black') ? '#1a1a20' : '#e8e8ee';
  const turnNum = Math.ceil(plyNum / 2);   // noir et blanc d'un même tour partagent le numéro (1,1,2,2,…)
  const row = document.createElement('div');
  row.className = 'move-item current';
  /* Ligne cliquable : affiche la position APRES ce coup sur le plateau
     (demande d'Olivier). Reutilise loadSnapshot(), deja utilise par la
     navigation replay -- aucun nouveau chemin d'affichage, donc aucun
     risque de divergence entre les deux facons de naviguer.
     plyNum est le rang du coup (1-based) alors que boardSnapshots est
     indexe a partir de 0 : d'ou le -1. */
  row.dataset.ply = plyNum;
  row.style.cursor = 'pointer';
  row.title = 'Afficher la position après ce coup';
  row.onclick = function(){ _gotoMoveFromHistory(plyNum - 1); };
  row.innerHTML = '<span class="move-num">' + turnNum + '</span>'
    + '<span class="move-dot" style="background:' + dot + '"></span>'
    + '<span class="move-aba">' + aba + ejx + '</span>'
    + '<span class="move-nacre">' + nac + ejx + '</span>';
  list.appendChild(row);
}

/* Saut a un coup depuis l'historique des coups (clic sur une ligne).
   Bascule en mode replay si necessaire -- sinon loadSnapshot() modifierait
   le plateau d'une partie EN COURS, ce qui serait une perte de donnees.
   Reutilise entierement loadSnapshot() et le mecanisme replay existants. */
function _gotoMoveFromHistory(idx){
  if (typeof boardSnapshots === 'undefined' || !boardSnapshots.length) return;
  idx = Math.max(-1, Math.min(boardSnapshots.length - 1, idx));
  if (typeof replayMode !== 'undefined' && !replayMode) {
    /* Relecture possible MEME en pleine partie (demande d'Olivier).
       L'etat reel est mis de cote AVANT de charger l'instantane, et
       restaure a la sortie du replay -- sans quoi la partie en cours
       serait perdue (bug preexistant sur toggleReplay, corrige en meme
       temps). Le bouton "Quitter replay" ramene a la position reelle. */
    if (typeof gameOver !== 'undefined' && !gameOver) {
      _stashLive();
      if (typeof showToast === 'function') showToast('📽 Relecture — « Quitter replay » pour revenir à ta partie');
      const btn = document.getElementById('replay-btn');
      if (btn) { btn.style.display = 'block'; btn.textContent = '■ Quitter replay'; }
    }
    replayMode = true;
  }
  replayCurrentIdx = idx;
  if (typeof loadSnapshot === 'function') loadSnapshot(idx);
  if (typeof _highlightMoveRow === 'function') _highlightMoveRow(idx);
}

/* Met en evidence la ligne correspondant au coup affiche. */
function _highlightMoveRow(idx){
  const list = document.getElementById('move-list');
  if (!list) return;
  list.querySelectorAll('.move-item').forEach(function(el){
    el.classList.toggle('current', Number(el.dataset.ply) === idx + 1);
  });
}

// Recalcule tous les libellés de l'historique selon les systèmes de notation actifs.
// Utilise les infos de coup stockées dans chaque snapshot.
function rebuildMoveListLabels() {
  const list = document.getElementById('move-list');
  if (!list || typeof boardSnapshots === 'undefined') return;
  list.innerHTML = MOVE_LIST_HEADER;
  boardSnapshots.forEach(function(snap, idx){
    const isLast = (idx === boardSnapshots.length - 1);
    appendMoveRow(list, snap.moveInfo, snap.label, snap.color, idx + 1);
    if (!isLast) {
      const cur = list.querySelector('.move-item.current');
      if (cur) cur.classList.remove('current');
    }
  });
  scrollMoveListToEnd();
}

// Auto-init board on canvas ready
/* DOMContentLoaded — géré dans la section principale ci-dessous */

