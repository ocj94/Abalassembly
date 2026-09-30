/* verify-4v2-engine.js -- compare le generateur de coups de generate-4v2.c au VRAI
   moteur du jeu (index.html) : memes positions resultantes, coup par coup.
   Deux jeux : 4 000 positions au hasard, et 6 000 construites pour EJECTER
   (une bille au bord, une ligne adverse alignee derriere). Resultat publie :
   10 000 positions identiques, dont 5 263 ejections. */
const { chargerMoteur } = require(require('path').join(__dirname, '..', 'tests', 'harness'));
const ctx = chargerMoteur();
const { execFileSync } = require('child_process');
const L = [5, 6, 7, 8, 9, 8, 7, 6, 5], RC = [];
for (let r = 0; r < 9; r++) for (let c = 0; c < L[r]; c++) RC.push([r, c]);
if (JSON.stringify(ctx.ROWS) !== JSON.stringify(L)) throw new Error('rangees differentes du moteur');
const key = (r, c) => r + ',' + c, IX = {}; RC.forEach(([r, c], i) => IX[key(r, c)] = i);
let seed = 4242; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const posAlea = [];
while (posAlea.length < 4000) {
  const s = new Set(); while (s.size < 6) s.add(Math.floor(rnd() * 61));
  const a = [...s]; posAlea.push({ A: a.slice(0, 4), B: a.slice(4), t: rnd() < 0.5 ? 0 : 1 });
}
const voisin = (i, d) => { const [r, c] = RC[i]; const a = ctx.rcToAxial(r, c), D = ctx.AX_DIRS[d]; const rc = ctx.axialToRc(a.q + D.q, a.r + D.r); return rc ? IX[key(rc.r, rc.c)] : -1; };
const posBord = [];
while (posBord.length < 6000) {
  const e = Math.floor(rnd() * 61), dirs = [0,1,2,3,4,5].filter(d => voisin(e, d) === -1);
  if (!dirs.length) continue;
  const d = dirs[Math.floor(rnd() * dirs.length)], od = (d + 3) % 6;
  const ligne = [e]; for (let k = 0; k < 5; k++) { const n = voisin(ligne[ligne.length - 1], od); if (n === -1) break; ligne.push(n); }
  const cas = Math.floor(rnd() * 3); let A = [], B = [], t = 0;
  if (cas === 0 && ligne.length >= 4) { B = [ligne[0]]; A = [ligne[1], ligne[2], ligne[3]]; t = 0; }          // 3 forts poussent 1 faible
  else if (cas === 1 && ligne.length >= 5) { B = [ligne[0], ligne[1]]; A = [ligne[2], ligne[3], ligne[4]]; t = 0; } // 3 forts poussent 2 faibles
  else if (ligne.length >= 3) { A = [ligne[0]]; B = [ligne[1], ligne[2]]; t = 1; }                              // 2 faibles poussent 1 fort
  else continue;
  const pris = new Set([...A, ...B]);
  while (A.length < 4) { const x = Math.floor(rnd() * 61); if (!pris.has(x)) { pris.add(x); A.push(x); } }
  while (B.length < 2) { const x = Math.floor(rnd() * 61); if (!pris.has(x)) { pris.add(x); B.push(x); } }
  posBord.push({ A, B, t });
}
function comparer(nom, pos) {
// cote C
const sortie = execFileSync(require('path').join(__dirname, 'tb42'), ['gen'], { maxBuffer: 1 << 30, input: pos.map(p => [...p.A, ...p.B, p.t].join(' ')).join('\n') + '\n', stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim().split('\n');
const cle = (S, W) => S.slice().sort((x, y) => x - y).join(',') + '|' + W.slice().sort((x, y) => x - y).join(',');
let ok = 0, ko = 0, nCoups = 0, nEj = 0; const ecarts = [];
pos.forEach((p, k) => {
  const partsC = sortie[k].split(' |').slice(1).map(s => { const [o, x] = s.split(' /'); const own = o.trim() ? o.trim().split(' ').map(Number) : [], opp = x.trim() ? x.trim().split(' ').map(Number) : [];
    return p.t === 0 ? cle(own, opp) : cle(opp, own); });
  const setC = new Set(partsC);
  // cote moteur du jeu
  const b = {}; p.A.forEach(i => b[key(...RC[i])] = 'black'); p.B.forEach(i => b[key(...RC[i])] = 'white');
  const coul = p.t === 0 ? 'black' : 'white', setE = new Set();
  ctx.board = JSON.parse(JSON.stringify(b)); ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0); ctx.GameOver.set(false);
  for (const m of ctx.getAllMovesForColor(coul)) {
    ctx.board = JSON.parse(JSON.stringify(b)); ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0); ctx.GameOver.set(false);
    const info = ctx.validateMove(m.cells, m.dir, coul); if (!info || !info.valid) continue;
    ctx.applyMove({ cells: m.cells, dir: m.dir, info }, coul);
    const S = [], W = []; for (const [k2, v] of Object.entries(ctx.board)) if (v) (v === 'black' ? S : W).push(IX[k2]);
    setE.add(cle(S, W)); if (info.ejection) nEj++;
  }
  nCoups += setE.size;
  const pareil = setC.size === setE.size && [...setC].every(x => setE.has(x));
  if (pareil) ok++; else { ko++; if (ecarts.length < 3) ecarts.push({ p, enTrop: [...setC].filter(x => !setE.has(x)), manquants: [...setE].filter(x => !setC.has(x)) }); }
});
console.log(nom, ': positions 4v2 comparees :', pos.length, '| identiques :', ok, '| differentes :', ko, '| coups distincts :', nCoups, '| dont ejections :', nEj);
ecarts.forEach(e => console.log(JSON.stringify(e)));
  return ko;

}
const ko = comparer('au hasard', posAlea) + comparer('construites pour ejecter', posBord);
process.exit(ko ? 1 : 0);
