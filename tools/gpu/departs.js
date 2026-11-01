/* Ecrit tools/gpu/departs.tsv : les positions de depart du site (LAYOUTS), une par ligne, pour le
   carnet Colab et test_cpu.cpp : cle, nom de la fiche, categorie, plateau (61 chiffres, 0 vide,
   1 noir, 2 blanc, cases dans l'ordre (r,c) du site). Decouverte (7 billes, plateau du mode Enfant)
   n'y est pas : ses fins de partie passent par les tables de finale, que le moteur GPU n'a pas.
   Usage : node tools/gpu/departs.js   (apres node tools/build.js) ; --verifier : compare sans ecrire. */
const path = require('path'), fs = require('fs');
process.chdir(path.join(__dirname, '..', '..'));
const { chargerMoteur } = require('../../tests/harness');
const ctx = chargerMoteur();
const ROWS = [5, 6, 7, 8, 9, 8, 7, 6, 5], DEB = [0, 5, 11, 18, 26, 35, 43, 50, 56];
const nomDe = {}, catDe = {};
for (const [id, k] of Object.entries(ctx.VARIANTE_DISPOSITION)) {
  const v = ctx.variantsData.find(x => x.id === id); if (!v) continue;
  nomDe[k] = v.name; catDe[k] = v.inventee ? v.categorie : 'connue';
}
const lignes = ['# cle\tnom\tcategorie\tplateau (61 cases, 0 vide 1 noir 2 blanc) -- ecrit par tools/gpu/departs.js'];
for (const k of Object.keys(ctx.LAYOUTS)) {
  if (k === 'decouverte') continue;
  const L = ctx.LAYOUTS[k], b = new Array(61).fill(0);
  L.black.forEach(([r, c]) => { b[DEB[r] + c] = 1; }); L.white.forEach(([r, c]) => { b[DEB[r] + c] = 2; });
  if (L.black.some(([r, c]) => c >= ROWS[r]) || L.white.some(([r, c]) => c >= ROWS[r])) throw new Error('case hors plateau : ' + k);
  lignes.push([k, (nomDe[k] || k).replace(/\t/g, ' '), catDe[k] || 'connue', b.join('')].join('\t'));
}
const f = path.join(__dirname, 'departs.tsv'), texte = lignes.join('\n') + '\n';
if (process.argv.includes('--verifier')) {   // le test du site : le fichier suit-il LAYOUTS ?
  const ok = fs.existsSync(f) && fs.readFileSync(f, 'utf8') === texte;
  console.log(ok ? 'departs.tsv suit LAYOUTS' : 'departs.tsv NE SUIT PAS LAYOUTS : relancer node tools/gpu/departs.js'); process.exit(ok ? 0 : 1);
}
fs.writeFileSync(f, texte);
console.log((lignes.length - 1) + ' departs ecrits dans tools/gpu/departs.tsv');
