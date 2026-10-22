#!/usr/bin/env node
'use strict';
/* ============================================================================
   POSITIONS DU CORPUS POUR LE LABO (v2.70)
   ----------------------------------------------------------------------------
   Rejoue chaque partie embarquee (MIGS, AbalOnline, tournoi PlayStrategy,
   parties de reference) avec le VRAI moteur du site, charge depuis index.html,
   et la fonction _lpExtrairePartie de src/main/42-labo-positions.js : pour
   chaque partie complete, jusqu'a 6 positions calmes (coup joue + resultat) et
   une position de depart pour les duels. Le resultat est embarque compresse
   (src/main/data/15-labo-positions.b64).

   A relancer a chaque ajout ou modification d'une partie embarquee : un test
   (tests/engine.test.js) echoue tant que la signature des parties ne
   correspond plus a celle enregistree dans le fichier.

   Usage :
     node tools/build.js && node tools/labo-positions.js && node tools/build.js
   Duree : quelques minutes ; le travail est reparti sur les coeurs disponibles
   (au plus 4 processus).
   ========================================================================== */
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawn } = require('child_process');
const vm = require('vm');

const SORTIE = path.join(__dirname, '..', 'src', 'main', 'data', '15-labo-positions.b64');
const arg = process.argv.indexOf('--morceau');

function numeros(B){
  // numero global de chaque partie : banques dans l'ordre, puis rang dans la banque
  const o = []; let n = 0;
  B.forEach((banque, src) => banque.forEach((g, i) => o.push([src, i, n++])));
  return o;
}

if (arg > 0) {
  // ── processus enfant : une part des parties, rang k sur n ──
  const [k, n] = process.argv[arg + 1].split('/').map(Number);
  const { chargerMoteur } = require('../tests/harness');
  const ctx = chargerMoteur();
  (async () => {
    if (!await ctx.ensureGameBanks()) throw new Error('banques de parties illisibles');
    const B = ctx._sbBanques(), out = [];
    numeros(B).forEach(([src, i, num]) => {
      if (num % n !== k) return;
      const g = B[src][i];
      const recs = ctx._lpExtrairePartie(src, g, num, 0);
      out.push([num, ctx._sbDispo(src, g), recs ? recs.map(r => Buffer.from(r).toString('base64')) : null]);
      if (out.length % 400 === 0) process.stderr.write('  [' + k + '] ' + out.length + ' parties\n');
    });
    process.stdout.write(JSON.stringify(out));
  })().catch(e => { console.error(e); process.exit(1); });
} else {
  const n = Math.max(1, Math.min(4, os.cpus().length));
  const t0 = Date.now();
  console.log('Rejeu de toutes les parties embarquees sur ' + n + ' processus…');
  Promise.all(Array.from({ length: n }, (_, k) => new Promise((ok, ko) => {
    const p = spawn(process.execPath, [__filename, '--morceau', k + '/' + n], { stdio: ['ignore', 'pipe', 'inherit'] });
    const morceaux = [];
    p.stdout.on('data', d => morceaux.push(d));
    p.on('close', code => code === 0 ? ok(JSON.parse(Buffer.concat(morceaux).toString('utf8'))) : ko(new Error('processus ' + k + ' : code ' + code)));
  }))).then(parts => {
    const { chargerMoteur } = require('../tests/harness');
    const ctx = chargerMoteur();
    return ctx.ensureGameBanks().then(ok => {
      if (!ok) throw new Error('banques de parties illisibles');
      const B = ctx._sbBanques();
      const tous = [].concat.apply([], parts).sort((a, b) => a[0] - b[0]);
      const attendu = B.reduce((s, b) => s + b.length, 0);
      if (tous.length !== attendu) throw new Error(tous.length + ' parties rejouees, ' + attendu + ' attendues');
      const dispos = [], recs = [];
      const bilan = { parties: 0, calmes: 0, departs: 0, resultatConnu: 0 };
      tous.forEach(([num, dispo, rs]) => {
        if (!rs) return;
        let d = dispos.indexOf(dispo); if (d < 0) { dispos.push(dispo); d = dispos.length - 1; }
        bilan.parties++;
        rs.forEach(b64 => {
          const r = Buffer.from(b64, 'base64');
          r[16] = d;
          if (r[13] & 8) bilan.departs++; else { bilan.calmes++; if ((r[13] >> 1) & 3) bilan.resultatConnu++; }
          recs.push(r);
        });
      });
      const h = { v: 1, taille: vm.runInContext('_LP_TAILLE', ctx), sig: ctx._sbSignature(), dispos: dispos, n: recs.length, bilan: bilan };
      const tete = Buffer.from(JSON.stringify(h), 'utf8');
      const lg = Buffer.alloc(4); lg.writeUInt32LE(tete.length, 0);
      const brut = Buffer.concat([lg, tete].concat(recs));
      const b64 = zlib.deflateRawSync(brut, { level: 9 }).toString('base64');
      fs.writeFileSync(SORTIE, b64);
      console.log('Ecrit ' + path.relative(process.cwd(), SORTIE) + ' : ' + recs.length + ' positions (' + brut.length + ' octets bruts), '
        + b64.length + ' caracteres base64, ' + Math.round((Date.now() - t0) / 1000) + ' s.');
      console.log('  ' + JSON.stringify(bilan) + ' · signature ' + h.sig);
      console.log('Relancer node tools/build.js pour l\'embarquer dans index.html.');
    });
  }).catch(e => { console.error(e); process.exit(1); });
}
