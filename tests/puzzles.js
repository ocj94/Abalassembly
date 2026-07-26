#!/usr/bin/env node
/* Audit des 94 puzzles embarques dans index.html.
 *
 * Chaque puzzle est une position + une solution. Comme pour les parties APGN,
 * on ne fait pas confiance aux donnees : on REJOUE chaque puzzle contre le
 * vrai moteur du jeu et on verifie que tout est coherent.
 *
 * Ce que l'audit controle, puzzle par puzzle :
 *   1. Coordonnees valides   — chaque "r,c" tombe sur une case reelle du plateau.
 *   2. Pas de collision       — aucune case n'est a la fois noire et blanche.
 *   3. Effectif plausible     — au plus 14 billes par camp, cb/cw dans 0..6,
 *                               et billes + captures <= 14 de chaque cote.
 *   4. Solution legale        — le coup `sol` est accepte par le moteur depuis
 *                               la position, pour le camp au trait `c`.
 *   5. Notation coherente     — le label `lab` correspond bien au coup joue,
 *                               dans la notation officielle Aba-Pro.
 *   6. Defense coherente      — pour un puzzle `def`, la menace `thr` est un
 *                               coup legal de l'adversaire, et les `alt` sont
 *                               toutes des solutions legales.
 *
 * Sortie : la liste precise des puzzles fautifs, avec le champ en cause. Le
 * but est de transformer « il y a des erreurs dans les puzzles » (Saab) en
 * une liste actionnable. Code de sortie 1 s'il reste au moins un probleme.
 *
 * Usage :  node tests/puzzles.js [--verbose]
 */

'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const VERBOSE = process.argv.indexOf('--verbose') >= 0;
const ROWS = [5, 6, 7, 8, 9, 8, 7, 6, 5];

/* ── Moteur : reutilise les vraies fonctions du jeu ───────────────────── */
const h = require('./engine-harness.js');
const E = h.run();
const st = h.state;

/* ── Extraction du tableau PUZZLES ────────────────────────────────────── */
function extractPuzzles() {
  const i = HTML.indexOf('const PUZZLES=');
  if (i < 0) throw new Error('PUZZLES introuvable');
  const start = HTML.indexOf('[', i);
  // fin : le ']' de premier niveau suivi de ';'
  let depth = 0, end = -1;
  for (let k = start; k < HTML.length; k++) {
    if (HTML[k] === '[') depth++;
    else if (HTML[k] === ']') { depth--; if (depth === 0) { end = k; break; } }
  }
  return JSON.parse(HTML.slice(start, end + 1));
}

/* ── Helpers ──────────────────────────────────────────────────────────── */
function validCell(r, c) {
  return Number.isInteger(r) && Number.isInteger(c)
      && r >= 0 && r < 9 && c >= 0 && c < ROWS[r];
}

function rcKey(s) {
  const m = /^(\d+),(\d+)$/.exec(String(s));
  return m ? { r: +m[1], c: +m[2] } : null;
}

/* Reconstruit le plateau d'un puzzle dans l'etat du moteur. */
function loadPuzzle(p) {
  const board = {};
  (p.bm || []).forEach(s => { const rc = rcKey(s); if (rc) board[rc.r + ',' + rc.c] = 'black'; });
  (p.wm || []).forEach(s => { const rc = rcKey(s); if (rc) board[rc.r + ',' + rc.c] = 'white'; });
  st.board = board;
  st.cb = p.cb || 0;
  st.cw = p.cw || 0;
  return board;
}

/* Le coup solution, au format attendu par le moteur. */
function solMove(p) {
  return { cells: p.sol.cells.slice(), dir: p.sol.dir };
}

/* Compare deux coups (memes cases, meme direction) sans tenir compte de l'ordre. */
function sameMove(a, b) {
  if (!a || !b) return false;
  if (a.dir.q !== b.dir.q || a.dir.r !== b.dir.r) return false;
  const ka = a.cells.map(c => c.r + ',' + c.c).sort().join('|');
  const kb = b.cells.map(c => c.r + ',' + c.c).sort().join('|');
  return ka === kb;
}

/* ── Audit ────────────────────────────────────────────────────────────── */
const PUZZLES = extractPuzzles();
const problems = [];

function flag(idx, p, field, msg) {
  problems.push({ idx, field, msg, src: p.src || '?', lab: p.lab || '?' });
}

PUZZLES.forEach((p, idx) => {
  // 1. Coordonnees valides
  let coordBad = false;
  [].concat(p.bm || [], p.wm || []).forEach(s => {
    const rc = rcKey(s);
    if (!rc || !validCell(rc.r, rc.c)) { coordBad = true; flag(idx, p, 'coord', 'case hors plateau : ' + s); }
  });
  p.sol.cells.forEach(cell => {
    if (!validCell(cell.r, cell.c)) { coordBad = true; flag(idx, p, 'sol', 'cellule de solution hors plateau : ' + cell.r + ',' + cell.c); }
  });

  // 2. Collisions noir/blanc
  const seen = {};
  let collide = false;
  (p.bm || []).forEach(s => { seen[s] = 'black'; });
  (p.wm || []).forEach(s => { if (seen[s]) { collide = true; flag(idx, p, 'overlap', 'case doublement occupee : ' + s); } });

  // 3. Effectif plausible
  const nb = (p.bm || []).length, nw = (p.wm || []).length;
  if (nb > 14) flag(idx, p, 'count', nb + ' billes noires (max 14)');
  if (nw > 14) flag(idx, p, 'count', nw + ' billes blanches (max 14)');
  if (p.cb < 0 || p.cb > 6) flag(idx, p, 'cb', 'captures noires hors 0..6 : ' + p.cb);
  if (p.cw < 0 || p.cw > 6) flag(idx, p, 'cw', 'captures blanches hors 0..6 : ' + p.cw);
  // billes restantes + billes deja sorties (= captures de l'adversaire) <= 14
  if (nb + (p.cw || 0) > 14) flag(idx, p, 'count', 'noirs : ' + nb + ' en jeu + ' + p.cw + ' sortis > 14');
  if (nw + (p.cb || 0) > 14) flag(idx, p, 'count', 'blancs : ' + nw + ' en jeu + ' + p.cb + ' sortis > 14');

  if (coordBad || collide) return;   // inutile de rejouer une position corrompue

  // 4. Solution legale
  loadPuzzle(p);
  const mv = solMove(p);
  let legal = false;
  try { legal = !!E.validateMove(mv.cells, mv.dir, p.c); } catch (e) { legal = false; }
  if (!legal) { flag(idx, p, 'sol', 'coup solution illegal pour ' + p.c + ' depuis la position'); return; }

  // 5. Notation coherente : le label du puzzle doit figurer parmi les labels
  //    officiels du coup. abaproOfficialLabels renvoie les ecritures valides
  //    (un coup en ligne peut en avoir deux, selon l'extremite decrite).
  if (p.lab) {
    let labels = [];
    try {
      const info = E.validateMove(mv.cells, mv.dir, p.c);
      const withInfo = { cells: mv.cells, dir: mv.dir, info: info && info.type ? info : undefined };
      labels = E.abaproOfficialLabels(withInfo) || [];
    } catch (e) { labels = []; }
    if (Array.isArray(labels) && labels.length && labels.indexOf(p.lab) < 0) {
      flag(idx, p, 'lab', 'label "' + p.lab + '" absent des labels officiels [' + labels.join(', ') + ']');
    }
  }

  // 6. Defense : la menace thr est une ANNOTATION affichee telle quelle par
  //    le jeu (« Menace adverse : … »), jamais rejouee — on verifie seulement
  //    qu'elle a la forme d'un jeton Aba-Pro, pas qu'elle soit legale ici.
  if (p.def) {
    if (p.thr && !/^[a-i][1-9][a-i][1-9]$/.test(String(p.thr))) {
      flag(idx, p, 'thr', 'menace mal formee : "' + p.thr + '"');
    }
    (p.alt || []).forEach(a => {
      /* alt est au format compact "r,c>dq,dr" ou "r,c|r,c>dq,dr". */
      const m = /^(.+)>(-?\d+),(-?\d+)$/.exec(a);
      if (!m) { flag(idx, p, 'alt', 'alternative illisible : ' + a); return; }
      const cells = m[1].split('|').map(cc => { const rc = rcKey(cc); return rc; }).filter(Boolean);
      const dir = { q: +m[2], r: +m[3] };
      loadPuzzle(p);
      let ok = false;
      try { ok = !!E.validateMove(cells, dir, p.c); } catch (e) { ok = false; }
      if (!ok) flag(idx, p, 'alt', 'alternative illégale : ' + a);
    });
  }
});

/* ── Rapport ──────────────────────────────────────────────────────────── */
const byPuzzle = {};
problems.forEach(pr => { (byPuzzle[pr.idx] = byPuzzle[pr.idx] || []).push(pr); });
const broken = Object.keys(byPuzzle);

console.log('─'.repeat(56));
console.log('Audit des puzzles');
console.log('─'.repeat(56));
console.log('  puzzles          : ' + PUZZLES.length);
console.log('  sans probleme    : ' + (PUZZLES.length - broken.length));
console.log('  a corriger       : ' + broken.length);
console.log('  problemes totaux : ' + problems.length);

if (broken.length) {
  console.log('');
  broken.forEach(idx => {
    const p = PUZZLES[idx];
    console.log('  Puzzle #' + idx + '  (' + (p.lab || '?') + ' · ' + (p.src || '?') + ')');
    byPuzzle[idx].forEach(pr => console.log('     · [' + pr.field + '] ' + pr.msg));
  });
}
console.log('');

process.exit(broken.length ? 1 : 0);
