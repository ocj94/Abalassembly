#!/usr/bin/env node
'use strict';
/* ============================================================================
   EMPREINTES COMPLEMENTAIRES — parties PlayStrategy et parties de reference
   ----------------------------------------------------------------------------
   La banque d'empreintes embarquee (15-empreintes.b64) couvre MIGS et
   AbalOnline. La page Statistiques du jeu compte aussi le tournoi PlayStrategy
   et les parties de reference : cet outil calcule leurs empreintes, avec le
   VRAI moteur du site (calculerEmpreinte, charge depuis index.html) et la meme
   convention que la banque principale : une empreinte apres chaque coup joue,
   vue du camp qui vient de jouer (verifie : un enregistrement {m, c} de la
   banque principale redonne la position apres m+1 demi-coups, vue de c).

   A relancer a chaque ajout ou modification d'une de ces parties : un test
   (section 54 de tests/engine.test.js) echoue tant que la signature des parties
   ne correspond plus a celle enregistree dans le fichier.

   Usage :
     node tools/build.js && node tools/empreintes-complement.js && node tools/build.js
   Ecrit src/main/data/15-empreintes-complement.b64 (deflate brut + base64).
   ========================================================================== */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const { chargerMoteur } = require('../tests/harness');

const SORTIE = path.join(__dirname, '..', 'src', 'main', 'data', '15-empreintes-complement.b64');
const ctx = chargerMoteur();
const run = code => vm.runInContext(code, ctx);
const CHAMPS = Array.from(run('EMPREINTES_CHAMPS'));
const jetons = seq => String(seq || '').replace(/\d+\./g, ' ').trim().split(/\s+/).filter(Boolean);

// [source (0 PlayStrategy, 1 reference), index, disposition de depart, coups]
const parties = [];
Array.from(ctx.PS_TOURNOI_YEARLY_2026).forEach((g, i) => parties.push([0, i, 'belgian', g[5]]));   // P1 = Noirs, Marguerite belge
Array.from(ctx.PARTIES_REFERENCE).forEach((g, i) => parties.push([1, i, g[4], g[6]]));            // [date, noir, blanc, vainqueur, disposition, source, coups]

const lignes = [];
const parSource = { PS: { parties: 0, avecCoups: 0, positions: 0, coupsIllisibles: 0 }, REF: { parties: 0, avecCoups: 0, positions: 0, coupsIllisibles: 0 } };
const t0 = Date.now();
parties.forEach(([src, g, dispo, seq], k) => {
  const S = parSource[src === 0 ? 'PS' : 'REF'];
  S.parties++;
  const L = ctx.LAYOUTS[dispo];
  if (!L) throw new Error('disposition inconnue : ' + dispo + ' (partie ' + g + ')');
  ctx.board = {};
  L.black.forEach(p => { ctx.board[p[0] + ',' + p[1]] = 'black'; });
  L.white.forEach(p => { ctx.board[p[0] + ',' + p[1]] = 'white'; });
  ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0);
  const T = jetons(seq);
  let col = 'black', joues = 0;
  for (let m = 0; m < T.length; m++) {
    const mv = ctx.resolveAbaProToken(T[m], col);
    if (!mv) { S.coupsIllisibles += T.length - m; break; }   // comme le rejeu du site : arret au premier coup illisible
    ctx.applyMove(mv, col);
    const e = ctx.calculerEmpreinte(col);
    lignes.push({ sc: (src << 1) | (col === 'white' ? 1 : 0), g: g, m: m, v: CHAMPS.map(ch => Math.round(e[ch] * 1000)) });
    joues++;
    col = col === 'black' ? 'white' : 'black';
  }
  if (joues) S.avecCoups++;
  S.positions += joues;
  if ((k + 1) % 10 === 0 || k + 1 === parties.length) {
    process.stdout.write('  ' + (k + 1) + '/' + parties.length + ' parties, ' + lignes.length + ' positions, ' + Math.round((Date.now() - t0) / 1000) + ' s\n');
  }
});

const n = lignes.length;
lignes.forEach(l => l.v.forEach(x => { if (x < -32768 || x > 32767) throw new Error('valeur hors int16 : ' + x); }));
const entete = Buffer.from(JSON.stringify({ format: 1, n: n, champs: CHAMPS, sig: run('_empComplementSignature()'), sources: parSource }), 'utf8');
const buf = Buffer.alloc(4 + entete.length + n * (1 + 2 + 2 + 2 * CHAMPS.length));
let off = 0;
buf.writeUInt32LE(entete.length, off); off += 4;
entete.copy(buf, off); off += entete.length;
lignes.forEach(l => { buf.writeUInt8(l.sc, off); off += 1; });
lignes.forEach(l => { buf.writeUInt16LE(l.g, off); off += 2; });
lignes.forEach(l => { buf.writeUInt16LE(l.m, off); off += 2; });
for (let c = 0; c < CHAMPS.length; c++) lignes.forEach(l => { buf.writeInt16LE(l.v[c], off); off += 2; });
const b64 = zlib.deflateRawSync(buf, { level: 9 }).toString('base64');
fs.writeFileSync(SORTIE, b64);
console.log('Ecrit ' + path.relative(process.cwd(), SORTIE) + ' : ' + n + ' positions, ' + b64.length + ' caracteres base64.');
console.log('  PlayStrategy : ' + JSON.stringify(parSource.PS));
console.log('  Reference    : ' + JSON.stringify(parSource.REF));
console.log('Relancer node tools/build.js pour l\'embarquer dans index.html.');
