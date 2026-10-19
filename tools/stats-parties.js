#!/usr/bin/env node
'use strict';
/* ============================================================================
   STATISTIQUES DES PARTIES — evenements de chaque partie du corpus (v2.63)
   ----------------------------------------------------------------------------
   Rejoue chaque partie embarquee (MIGS, AbalOnline, tournoi PlayStrategy,
   parties de reference) avec le VRAI moteur du site, charge depuis index.html,
   et la fonction _sbRejouerPartie de src/main/39-statistiques-billes.js :
   ejections (demi-coup, case, camp), types de coups, occasions d'ejection, et
   aux 20e, 40e et 60e demi-coups la comparaison des 12 dimensions des deux camps.
   Le resultat est embarque compresse (src/main/data/15-stats-parties.b64) ;
   les pages Statistiques du jeu et Mes statistiques, et l'ecran de fin de
   partie, n'ont plus qu'a additionner.

   A relancer a chaque ajout ou modification d'une partie embarquee : un test
   (section 57 de tests/engine.test.js) echoue tant que la signature des parties
   ne correspond plus a celle enregistree dans le fichier.

   Usage :
     node tools/build.js && node tools/stats-parties.js && node tools/build.js
   Duree : quelques minutes (le calcul des 12 dimensions domine) ; le travail
   est reparti sur les coeurs disponibles (au plus 4 processus).
   ========================================================================== */
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawn } = require('child_process');
const vm = require('vm');

const SORTIE = path.join(__dirname, '..', 'src', 'main', 'data', '15-stats-parties.b64');
const arg = process.argv.indexOf('--morceau');

if (arg > 0) {
  // ── processus enfant : une part des parties, rang k sur n ──
  const [k, n] = process.argv[arg + 1].split('/').map(Number);
  const { chargerMoteur } = require('../tests/harness');
  const ctx = chargerMoteur();
  (async () => {
    if (!await ctx.ensureGameBanks()) throw new Error('banques de parties illisibles');
    const B = ctx._sbBanques(), out = [];
    let vus = 0;
    B.forEach((banque, src) => banque.forEach((g, i) => {
      if ((vus++) % n !== k) return;
      const rec = ctx._sbRejouerPartie(src, g, true);
      if (!rec) throw new Error('depart illisible : ' + vm.runInContext('_SB_SOURCES', ctx)[src] + ' ' + i);
      out.push([src, i, ctx._sbDispo(src, g), JSON.parse(JSON.stringify(rec))]);
      if (out.length % 200 === 0) process.stderr.write('  [' + k + '] ' + out.length + ' parties\n');
    }));
    process.stdout.write(JSON.stringify(out));
  })().catch(e => { console.error(e); process.exit(1); });
} else {
  // ── processus principal : repartit, rassemble, ecrit ──
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
      const tous = [].concat.apply([], parts).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
      const attendu = B.reduce((s, b) => s + b.length, 0);
      if (tous.length !== attendu) throw new Error(tous.length + ' parties rejouees, ' + attendu + ' attendues');
      const dispos = [], p = [];
      const bilan = { complets: 0, decides: 0, nonFinies: 0 };
      tous.forEach(([src, i, dispo, rec]) => {
        let d = dispos.indexOf(dispo); if (d < 0) { dispos.push(dispo); d = dispos.length - 1; }
        p.push(ctx._sbEncoder(rec, d));
        if (rec.complet) bilan.complets++;
        if (rec.g === 1 || rec.g === 2) bilan.decides++;
        if (rec.n < rec.nj && rec.cb < 6 && rec.cw < 6) bilan.nonFinies++;   // coup illisible avant la fin
      });
      const donnees = { v: 1, sig: ctx._sbSignature(), nb: B.map(b => b.length), etapes: Array.from(vm.runInContext('_SB_ETAPES', ctx)),
        champs: Array.from(vm.runInContext('EMPREINTES_CHAMPS', ctx)), dispos: dispos, p: p };
      const b64 = zlib.deflateRawSync(Buffer.from(JSON.stringify(donnees), 'utf8'), { level: 9 }).toString('base64');
      fs.writeFileSync(SORTIE, b64);
      console.log('Ecrit ' + path.relative(process.cwd(), SORTIE) + ' : ' + p.length + ' parties, ' + b64.length + ' caracteres base64, '
        + Math.round((Date.now() - t0) / 1000) + ' s.');
      console.log('  ' + JSON.stringify(bilan) + ' · signature ' + donnees.sig);
      console.log('Relancer node tools/build.js pour l\'embarquer dans index.html.');
    });
  }).catch(e => { console.error(e); process.exit(1); });
}
