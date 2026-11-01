/* Ecrit tools/gpu/reference.json : des parties de reference jouees sur processeur par abalone_gpu.cu
   (mode « taches » de test_cpu.cpp). Le carnet Colab rejoue les memes sur la carte graphique et
   verifie qu'elles sont identiques, coup pour coup ; le test du site verifie que ce fichier suit la source.
     g++ -O2 -std=c++17 -fopenmp tools/gpu/test_cpu.cpp -o /tmp/abalone_cpu
     node tools/gpu/reference.js /tmp/abalone_cpu [--verifier] */
const path = require('path'), fs = require('fs'), { spawnSync } = require('child_process');
const ICI = __dirname, BIN = process.argv[2] || '/tmp/abalone_cpu';
const cles = fs.readFileSync(path.join(ICI, 'departs.tsv'), 'utf8').split('\n').filter(l => l && l[0] !== '#').map(l => l.split('\t')[0]);
const CHOIX = ['standard', 'belgian', 'german', 'eq_ruche', 'eq_archipel', 'av_german_pas_en_avant', 'sr_01', 'sr_04_av', 'ce_01', 'ce_06_av', 'the_arrow', 'atomouche'];
const BLOCS = [
  { reglages: [2, 0, 0, 200, 1, 1, 20261101], parties: 2 },   // les reglages par defaut du carnet
  { reglages: [1, 20, 2, 120, 0, 0, 7], parties: 1 }          // profondeur 1, marge, ouverture au hasard, sans arbitrage a 3 ni penalites
];
const blocs = BLOCS.map(B => {
  const taches = []; CHOIX.forEach(k => { if (cles.indexOf(k) < 0) throw new Error('depart inconnu ' + k); for (let n = 0; n < B.parties; n++) taches.push([k, n]); });
  const r = spawnSync(BIN, ['taches', path.join(ICI, 'departs.tsv'), ...B.reglages.map(String)], { input: taches.map(([k, n]) => cles.indexOf(k) + ' ' + n).join('\n') + '\n' });
  if (r.status !== 0) throw new Error(String(r.stderr));
  return { reglages: B.reglages, taches, resultats: String(r.stdout).trim().split('\n').map(l => l.split(' ').map(Number)) };
});
const texte = JSON.stringify({ note: 'ecrit par tools/gpu/reference.js ; reglages : profondeur, marge, ouverture, demi-coups max, trois d avance, penalites, graine ; resultats : gagnant, pourquoi, demi-coups, premiere ejection, ejectees par les Noirs, par les Blancs, debordement, empreinte', blocs }, null, 1) + '\n';
const f = path.join(ICI, 'reference.json');
if (process.argv.includes('--verifier')) {
  const ok = fs.readFileSync(f, 'utf8') === texte;
  console.log(ok ? 'reference.json suit la source' : 'reference.json NE SUIT PAS la source : relancer node tools/gpu/reference.js'); process.exit(ok ? 0 : 1);
}
fs.writeFileSync(f, texte);
console.log('reference.json : ' + blocs.map(b => b.taches.length + ' parties').join(' + '));
