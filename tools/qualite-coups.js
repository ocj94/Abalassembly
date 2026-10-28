#!/usr/bin/env node
'use strict';
/* ============================================================================
   QUALITE DES COUPS DU CORPUS (v2.78)
   ----------------------------------------------------------------------------
   Rejoue chaque partie complete embarquee (MIGS, AbalOnline, tournoi
   PlayStrategy, parties de reference) avec le VRAI moteur du site, charge
   depuis index.html, et la fonction _qcAnalyserPartie de
   src/main/50-qualite-coups.js : pour chaque coup joue, est-il proche du
   meilleur coup a un demi-coup (la mesure de la precision de Mes
   statistiques), et offre-t-il une bille a l'adversaire ? Compteurs par
   partie, par camp et par moment de la partie.
   v2.84 : aussi les positions critiques (un seul coup legal evite de perdre une
   bille au coup suivant ; le joueur l'a-t-il trouve ?), les positions sans
   issue, et pour chaque partie ses premieres positions critiques (a revoir).
   Le resultat est embarque compresse (src/main/data/15-qualite-coups.b64).

   A relancer a chaque ajout ou modification d'une partie embarquee, ou de
   l'evaluation du moteur (evaluateBoard) : un test echoue tant que la
   signature des parties ne correspond plus a celle enregistree.

   Usage :
     node tools/build.js && node tools/qualite-coups.js && node tools/build.js
   Duree : environ une heure et demie de calcul (14 ms par coup, 418 000
   coups), reparti sur les coeurs disponibles (au plus 4 processus).
   ========================================================================== */
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawn } = require('child_process');
const vm = require('vm');

const SORTIE = path.join(__dirname, '..', 'src', 'main', 'data', '15-qualite-coups.b64');
const arg = process.argv.indexOf('--morceau');
// reprise apres une interruption : chaque partie analysee est notee au fur et a mesure (une ligne JSON),
// dans un fichier propre a la signature des parties et au decoupage -- une relance repart de la
const REPRISE = path.join(os.tmpdir(), 'abalassembly-qualite-coups');

if (arg > 0) {
  // ── processus enfant : une part des parties, rang k sur n ──
  const [k, n] = process.argv[arg + 1].split('/').map(Number);
  const { chargerMoteur } = require('../tests/harness');
  const ctx = chargerMoteur();
  (async () => {
    if (!await ctx.ensureGameBanks()) throw new Error('banques de parties illisibles');
    const B = ctx._sbBanques(), out = [];
    fs.mkdirSync(REPRISE, { recursive: true });
    // v2.84 : 'f2' -- 9 compteurs et la liste des positions critiques (les reprises d'avant ne servent plus)
    const fichier = path.join(REPRISE, 'f2-' + ctx._sbSignature() + '-' + k + '-' + n + '.jsonl'), faits = new Map();
    if (fs.existsSync(fichier)) fs.readFileSync(fichier, 'utf8').split('\n').forEach(l => { if (!l) return; try { const x = JSON.parse(l); faits.set(x[0] + '|' + x[1], x); } catch (e) {} });
    if (faits.size) process.stderr.write('  [' + k + '] reprise : ' + faits.size + ' parties deja analysees\n');
    let vus = 0;
    B.forEach((banque, src) => banque.forEach((g, i) => {
      if ((vus++) % n !== k) return;
      let x = faits.get(src + '|' + i);
      if (!x) {
        const q = ctx._qcAnalyserPartie(src, g);
        x = [src, i, q ? [].concat.apply([], [].concat.apply([], JSON.parse(JSON.stringify(q)))) : 0, q ? Array.from(q.crit) : 0];
        fs.appendFileSync(fichier, JSON.stringify(x) + '\n');
      }
      out.push(x);
      if (out.length % 100 === 0) process.stderr.write('  [' + k + '] ' + out.length + ' parties\n');
    }));
    process.stdout.write(JSON.stringify(out));
  })().catch(e => { console.error(e); process.exit(1); });
} else {
  // ── processus principal : repartit, rassemble, ecrit ──
  const n = Math.max(1, Math.min(4, os.cpus().length));
  const t0 = Date.now();
  console.log('Analyse des coups de toutes les parties embarquees sur ' + n + ' processus…');
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
      if (tous.length !== attendu) throw new Error(tous.length + ' parties analysees, ' + attendu + ' attendues');
      const ev = c => vm.runInContext(c, ctx);
      const donnees = { v: 1, sig: ctx._sbSignature(), nb: B.map(b => b.length), champs: Array.from(ev('QC_CHAMPS')), moments: Array.from(ev('QC_MOMENTS')),
        seuils: [ev('SEUIL_PROCHE_MEILLEUR'), ev('SEUIL_ECART_DECISION_DISPUTEE')], p: tous.map(x => x[2]), crit: tous.map(x => x[3] || 0) };
      const b64 = zlib.deflateRawSync(Buffer.from(JSON.stringify(donnees), 'utf8'), { level: 9 }).toString('base64');
      fs.writeFileSync(SORTIE, b64);
      const NB = donnees.champs.length, coups = donnees.p.reduce((s, q) => s + (q ? q.filter((v, j) => j % NB === 0).reduce((a, b) => a + b, 0) : 0), 0);
      console.log('Ecrit ' + path.relative(process.cwd(), SORTIE) + ' : ' + donnees.p.filter(Boolean).length + ' parties completes, ' + coups + ' coups, '
        + b64.length + ' caracteres base64, ' + Math.round((Date.now() - t0) / 60000) + ' min.');
      console.log('  signature ' + donnees.sig);
      console.log('Relancer node tools/build.js pour l\'embarquer dans index.html.');
    });
  }).catch(e => { console.error(e); process.exit(1); });
}
