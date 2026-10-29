#!/usr/bin/env node
/* Convertit les parties embarquees dans index.html en APGN (voir APGN.md).
 *
 * Chaque partie est REJOUEE contre le vrai moteur du jeu avant d'etre ecrite.
 * Une partie qui ne rejoue pas n'est pas exportee : elle est comptee comme
 * rejet, avec le numero du coup fautif. Un format d'echange qui accepterait
 * des parties fausses ne vaudrait rien.
 *
 * Usage :  node tools/to-apgn.js [--source migs|ao|ps|all] [--out f.apgn] [--limit N]
 *
 * --source migs : les 2589 parties du serveur MiGs, ferme le 30/05/2017.
 * --source ao   : les parties AbalOnline. NE PAS diffuser sans l'accord de
 *                 Vincent Frochot, qui administre le site.
 * --source ps   : v2.91, les 93 parties du tournoi Yearly Abalone Arena de
 *                 PlayStrategy (18/09/2026), publiees avec l'accord de
 *                 Vincent. Coups deja convertis de la notation PlayStrategy en
 *                 Aba-Pro (psConvertirSequence, verifies un a un).
 *
 * v2.91 : un camp tenu par un programme (estIA, 56-humains-programmes.js)
 * porte la balise BlackType / WhiteType "program", comme en PGN. Absente :
 * humain, ou inconnu (AbalOnline ne marque pas ses programmes).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

/* ── Moteur : on reutilise les vraies fonctions du jeu ────────────────── */

const SRC = [...HTML.matchAll(/<script(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)]
  .map(m => m[1]).join('\n');

function grabFn(name) {
  const i = SRC.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('fonction introuvable : ' + name);
  const o = SRC.indexOf('{', i);
  let d = 0;
  for (let k = o; k < SRC.length; k++) {
    if (SRC[k] === '{') d++;
    else if (SRC[k] === '}') { d--; if (!d) return SRC.slice(i, k + 1); }
  }
  throw new Error('accolades : ' + name);
}
function grabConstDecl(name) {
  const i = SRC.indexOf('const ' + name + ' =') >= 0
    ? SRC.indexOf('const ' + name + ' =') : SRC.indexOf('const ' + name + '=');
  const e = SRC.indexOf(';', i);
  return SRC.slice(i, e + 1);
}
function grabB64(name) {
  const i = HTML.indexOf('const ' + name + '=');
  const j = HTML.indexOf("'", i), k = HTML.indexOf("'", j + 1);
  return HTML.slice(j + 1, k);
}

const ROWS = [5, 6, 7, 8, 9, 8, 7, 6, 5];

let board = {}, capturedByBlack = 0, capturedByWhite = 0;

const ENG = (function () {
  const parts = [
    grabConstDecl('AX_DIRS'), grabConstDecl('akey'), grabConstDecl('ABAPRO_ROWS'),
    grabFn('rcToAxial'), grabFn('axialToRc'), grabFn('selectionLine'),
    grabFn('validateMove'), grabFn('abApplyMove'), grabFn('applyMove'),
    grabFn('coordToABAPRO'), grabFn('abaproToRc'), grabFn('getAllMovesForColor'),
    grabFn('resolveAbaProToken'), grabFn('abaproOfficialLabels')
  ].join('\n\n');
  const f = new Function('ROWS', 'getB', 'setB', 'getC', 'setC', `
    Object.defineProperty(globalThis,'board',{get:getB,set:setB,configurable:true});
    Object.defineProperty(globalThis,'capturedByBlack',{get:()=>getC('b'),set:v=>setC('b',v),configurable:true});
    Object.defineProperty(globalThis,'capturedByWhite',{get:()=>getC('w'),set:v=>setC('w',v),configurable:true});
    // v2.91 : le moteur compte desormais les billes par deux objets (07-board-engine-core.js) -- l'outil
    // ne rejouait plus rien depuis ; memes compteurs, sous leur nouvelle forme
    const _compteur = k => ({ get: () => getC(k), set: v => setC(k, v),
      inc: () => { setC(k, getC(k) + 1); return getC(k); }, dec: () => { setC(k, getC(k) - 1); return getC(k); } });
    const CapturedByBlack = _compteur('b'), CapturedByWhite = _compteur('w');
    ${parts}
    return { validateMove, applyMove, coordToABAPRO, abaproToRc,
             resolveAbaProToken, getAllMovesForColor };
  `);
  return f(ROWS, () => board, v => { board = v; },
    k => (k === 'b' ? capturedByBlack : capturedByWhite),
    (k, v) => { if (k === 'b') capturedByBlack = v; else capturedByWhite = v; });
})();

/* ── Dispositions ─────────────────────────────────────────────────────── */

const LAYOUTS = (function () {
  const i = HTML.indexOf('const LAYOUTS');
  const j = HTML.indexOf('};', i);
  const body = HTML.slice(HTML.indexOf('{', i), j + 1);
  return eval('(' + body + ')');
})();

function boardFromLayout(name) {
  const L = LAYOUTS[name] || LAYOUTS.standard;
  const b = {};
  L.black.forEach(p => { b[p[0] + ',' + p[1]] = 'black'; });
  L.white.forEach(p => { b[p[0] + ',' + p[1]] = 'white'; });
  return b;
}

/* Positions AbalOnline : "<ejectN><cases noires>,<ejectN><cases blanches>" */
function boardFromAOStart(startStr) {
  const b = {};
  const parts = String(startStr).split(',');
  if (parts.length !== 2) return null;
  let ejB = 0, ejW = 0;
  function place(p, col) {
    const m = p.match(/^(\d)(.*)$/);
    if (!m) return null;
    const cells = m[2].match(/[a-i][1-9]/g) || [];
    for (const cc of cells) {
      const rc = ENG.abaproToRc(cc);
      if (!rc) return null;
      b[rc.r + ',' + rc.c] = col;
    }
    return parseInt(m[1], 10);
  }
  ejB = place(parts[0], 'black');
  ejW = place(parts[1], 'white');
  if (ejB === null || ejW === null) return null;
  return { board: b, capturedByWhite: ejB, capturedByBlack: ejW };
}

/* ── Position APGN : rangees i -> a, chiffres pour les cases vides ────── */

function positionString(b, turn, ejB, ejW) {
  const rows = [];
  for (let r = 0; r < 9; r++) {
    let out = '', gap = 0;
    for (let c = 0; c < ROWS[r]; c++) {
      const v = b[r + ',' + c];
      if (!v) { gap++; continue; }
      if (gap) { out += gap; gap = 0; }
      out += (v === 'black' ? 'b' : 'w');
    }
    if (gap) out += gap;
    rows.push(out || String(ROWS[r]));
  }
  /* Score : billes deja ejectees, ecrites -<nb>b<nb>w avant le trait. Omis si
     aucune ejection (proposition de Saab). */
  const ej = ((ejB || 0) > 0 || (ejW || 0) > 0) ? '-' + (ejB || 0) + 'b' + (ejW || 0) + 'w' : '';
  return rows.join('/') + ej + ' ' + (turn === 'black' ? 'b' : 'w');
}

/* ── Rejeu et validation ──────────────────────────────────────────────── */

function replay(startBoard, seq, cb, cw) {
  board = JSON.parse(JSON.stringify(startBoard));
  capturedByBlack = cb || 0;
  capturedByWhite = cw || 0;
  const tokens = String(seq).replace(/\d+\.-?/g, ' ').trim().split(/\s+/).filter(Boolean);
  let color = 'black';
  const played = [];
  for (let i = 0; i < tokens.length; i++) {
    const mv = ENG.resolveAbaProToken(tokens[i], color);
    if (!mv) return { ok: false, ply: i + 1, token: tokens[i], played: played };
    ENG.applyMove(mv, color);
    played.push(tokens[i]);
    color = (color === 'black') ? 'white' : 'black';
  }
  return { ok: true, played: played, capB: capturedByBlack, capW: capturedByWhite };
}

function movetext(tokens, result) {
  const out = [];
  for (let i = 0; i < tokens.length; i += 2) {
    let s = (i / 2 + 1) + '. ' + tokens[i];
    if (tokens[i + 1]) s += ' ' + tokens[i + 1];
    out.push(s);
  }
  let line = '', lines = [];
  for (const chunk of out) {
    if (line.length + chunk.length + 1 > 78) { lines.push(line); line = ''; }
    line += (line ? ' ' : '') + chunk;
  }
  if (line) lines.push(line);
  if (lines.length) lines[lines.length - 1] += ' ' + result; else lines.push(result);
  return lines.join('\n');
}

function tag(k, v) { return '[' + k + ' "' + String(v).replace(/"/g, "'") + '"]'; }

/* v2.91 : les programmes, avec la regle du jeu lui-meme */
const estIA = new Function(grabConstDecl('IA_COMPTES') + '\n' + grabFn('estIA') + '\nreturn estIA;')();
function typesCamps(noir, blanc) {
  const t = [];
  if (estIA(noir)) t.push(tag('BlackType', 'program'));
  if (estIA(blanc)) t.push(tag('WhiteType', 'program'));
  return t;
}
/* un tableau litteral du jeu (const NOM = [ ... ];), lu crochet par crochet en sautant les chaines */
function grabArray(name) {
  const i = SRC.indexOf('const ' + name + ' = [');
  if (i < 0) throw new Error('tableau introuvable : ' + name);
  const o = SRC.indexOf('[', i);
  let d = 0, q = null;
  for (let k = o; k < SRC.length; k++) {
    const c = SRC[k];
    if (q) { if (c === '\\') k++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '[') d++;
    else if (c === ']') { d--; if (!d) return JSON.parse(SRC.slice(o, k + 1)); }
  }
  throw new Error('crochets : ' + name);
}

/* ── Conversion ───────────────────────────────────────────────────────── */

const args = process.argv.slice(2);
const outPath = (args.indexOf('--out') >= 0) ? args[args.indexOf('--out') + 1]
  : path.join(ROOT, 'games', 'abalassembly.apgn');
const limit = (args.indexOf('--limit') >= 0) ? parseInt(args[args.indexOf('--limit') + 1], 10) : Infinity;
const source = (args.indexOf('--source') >= 0) ? args[args.indexOf('--source') + 1] : 'all';
if (['migs', 'ao', 'ps', 'all'].indexOf(source) < 0) {
  console.error("--source doit valoir migs, ao, ps ou all"); process.exit(2);
}

const MIGS = JSON.parse(zlib.inflateRawSync(Buffer.from(grabB64('MIGS_B64'), 'base64')).toString('utf8'));
const AO = JSON.parse(zlib.inflateRawSync(Buffer.from(grabB64('AO_B64'), 'base64')).toString('utf8'));

const games = [];
const rejected = [];
let n = 0;

/* MIGS — [id, date, noir, blanc, fin, sequence], disposition belge. */
for (const g of ((source === 'migs' || source === 'all') ? MIGS : [])) {
  if (n++ >= limit) break;
  const start = boardFromLayout('belgian');
  const r = replay(start, g[5], 0, 0);
  if (!r.ok) { rejected.push({ src: 'MIGS ' + g[0], ply: r.ply, token: r.token }); continue; }
  const res = (r.capB >= 6) ? '1-0' : (r.capW >= 6) ? '0-1' : '*';
  games.push([
    tag('Event', 'MIGS ' + g[0]),
    tag('Date', String(g[1]).replace(/-/g, '.')),
    tag('Black', g[2]), tag('White', g[3]),
    tag('Variant', 'belgian'),
    tag('Result', res),
    tag('Notation', 'Aba-Pro'),
    tag('Termination', g[4]),
    tag('Plies', r.played.length),
    tag('Source', 'MIGS')
  ].concat(typesCamps(g[2], g[3])).join('\n') + '\n\n' + movetext(r.played, res));
}

/* AbalOnline — [date, j1, j2, vainqueur, variante, depart, sequence]. */
for (const g of ((source === 'ao' || source === 'all') ? AO : [])) {
  if (n++ >= limit) break;
  const v = String(g[4]).replace('_daisy', '_daisy');
  const st = boardFromAOStart(g[5]);
  if (!st) { rejected.push({ src: 'AO ' + g[0], ply: 0, token: 'position de depart illisible' }); continue; }
  const r = replay(st.board, g[6], st.capturedByBlack, st.capturedByWhite);
  if (!r.ok) { rejected.push({ src: 'AO ' + g[0] + ' ' + g[1] + '/' + g[2], ply: r.ply, token: r.token }); continue; }
  const res = (String(g[3]) === String(g[1])) ? '1-0' : (String(g[3]) === String(g[2])) ? '0-1' : '*';
  const known = Object.prototype.hasOwnProperty.call(LAYOUTS, v);
  const hdr = [
    tag('Event', 'AbalOnline'),
    tag('Date', String(g[0]).replace(/-/g, '.')),
    tag('Black', g[1]), tag('White', g[2]),
    tag('Variant', known ? v : 'custom'),
    tag('Result', res),
    tag('Notation', 'Aba-Pro'),
    tag('SetUp', '1'),
    tag('Position', positionString(st.board, 'black', st.capturedByWhite, st.capturedByBlack)),
    tag('Plies', r.played.length),
    tag('Source', 'AbalOnline')
  ].concat(typesCamps(g[1], g[2]));
  games.push(hdr.join('\n') + '\n\n' + movetext(r.played, res));
}

/* PlayStrategy (v2.91) — [id, date, noir, blanc, "X gagne", sequence Aba-Pro], disposition belge
   (« Abalone » sur PlayStrategy : verifie sur les 7 705 demi-coups du tournoi). Le resultat est celui
   enregistre par PlayStrategy ; la fin se lit dans le rejeu : 6 billes = au score, sinon abandon
   (dont 3 parties sans un seul coup). « Normal » chez PlayStrategy ne veut pas dire 6 billes. */
const PS = (source === 'ps' || source === 'all') ? grabArray('PS_TOURNOI_YEARLY_2026') : [];
for (const g of PS) {
  if (n++ >= limit) break;
  const r = replay(boardFromLayout('belgian'), g[5], 0, 0);
  if (!r.ok) { rejected.push({ src: 'PlayStrategy ' + g[0], ply: r.ply, token: r.token }); continue; }
  const res = (g[4] === g[2] + ' gagne') ? '1-0' : (g[4] === g[3] + ' gagne') ? '0-1' : '*';
  const fin = (r.capB >= 6 || r.capW >= 6) ? 'Au score' : 'Abandon';
  if (fin === 'Au score' && res !== (r.capB >= 6 ? '1-0' : '0-1')) { rejected.push({ src: 'PlayStrategy ' + g[0], ply: r.played.length, token: 'resultat contraire au rejeu' }); continue; }
  games.push([
    tag('Event', 'Yearly Abalone Arena (PlayStrategy ' + g[0] + ')'),
    tag('Date', String(g[1]).replace(/-/g, '.')),
    tag('Black', g[2]), tag('White', g[3]),
    tag('Variant', 'belgian'),
    tag('Result', res),
    tag('Notation', 'Aba-Pro'),
    tag('Termination', fin),
    tag('Plies', r.played.length),
    tag('Source', 'PlayStrategy')
  ].concat(typesCamps(g[2], g[3])).join('\n') + '\n\n' + movetext(r.played, res));
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, games.join('\n\n') + '\n');

const total = n;
console.log('parties lues      : ' + total);
console.log('parties exportees : ' + games.length);
console.log('parties rejetees  : ' + rejected.length +
  (rejected.length ? ' (ne rejouent pas contre le moteur)' : ''));
rejected.slice(0, 8).forEach(r =>
  console.log('   · ' + r.src + ' — coup ' + r.ply + ' : ' + r.token));
console.log('ecrit             : ' + path.relative(ROOT, outPath) +
  ' (' + (fs.statSync(outPath).size / 1024).toFixed(0) + ' Ko)');
