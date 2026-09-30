/* replay-4v2-pv.js -- rejoue par le VRAI moteur du jeu la ligne principale extraite
   par "./tb42 pv ..." (pv.txt) : chaque transition doit etre un coup legal du camp
   au trait, et la derniere doit laisser le camp faible avec une seule bille. */
const { chargerMoteur } = require(require('path').join(__dirname, '..', 'tests', 'harness'));
const ctx = chargerMoteur();
const L = [5, 6, 7, 8, 9, 8, 7, 6, 5], RC = []; for (let r = 0; r < 9; r++) for (let c = 0; c < L[r]; c++) RC.push([r, c]);
const key = i => RC[i][0] + ',' + RC[i][1], nom = i => String(ctx.coordToABAPRO(RC[i][0], RC[i][1]));
const lignes = require('fs').readFileSync(require('path').join(__dirname, 'pv.txt'), 'utf8').trim().split('\n');
const pos = lignes.filter(l => /^\d/.test(l)).map(l => l.split(' ').map(Number));
const fin = lignes.find(l => l.startsWith('EJECTION')).match(/\d+/g).map(Number);   // 4 fortes | faible restante
pos.push([fin[0], fin[1], fin[2], fin[3], fin[4], -1, 1]);
const plateau = p => { const b = {}; p.slice(0, 4).forEach(i => b[key(i)] = 'black'); p.slice(4, 6).filter(i => i >= 0).forEach(i => b[key(i)] = 'white'); return b; };
const sig = b => Object.keys(b).filter(k => b[k]).sort().map(k => k + b[k]).join('|');
let ok = 0, coups = [];
for (let k = 0; k + 1 < pos.length; k++) {
  const avant = plateau(pos[k]), cible = sig(plateau(pos[k + 1])), coul = pos[k][6] === 0 ? 'black' : 'white';
  let trouve = null;
  for (const m of (ctx.board = JSON.parse(JSON.stringify(avant)), ctx.getAllMovesForColor(coul))) {
    ctx.board = JSON.parse(JSON.stringify(avant)); ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0); ctx.GameOver.set(false);
    const info = ctx.validateMove(m.cells, m.dir, coul); if (!info || !info.valid) continue;
    ctx.applyMove({ cells: m.cells, dir: m.dir, info }, coul);
    if (sig(ctx.board) === cible) { trouve = { m, info }; break; }
  }
  if (!trouve) { console.log('ECHEC au demi-coup', k + 1); process.exit(1); }
  ok++; coups.push(ctx.abaproOfficialLabels(trouve.m)[0] + (trouve.info.ejection ? ' (ejection)' : ''));
}
const dernier = plateau(pos[pos.length - 1]);
const blanches = Object.values(dernier).filter(v => v === 'white').length;
console.log('demi-coups rejoues par le moteur du jeu :', ok, '/', pos.length - 1);
console.log('position de depart : Noirs (4)', pos[0].slice(0, 4).map(nom).join(' '), '| Blancs (2)', pos[0].slice(4, 6).map(nom).join(' '), '| trait aux Noirs');
console.log('fin : il reste', blanches, 'bille blanche -> victoire des Noirs');
console.log('premiers coups :', coups.slice(0, 8).join(', '), '...');
console.log('derniers coups :', coups.slice(-4).join(', '));
require('fs').writeFileSync(require('path').join(__dirname, 'pv_abapro.txt'), coups.map((c, i) => (i % 2 === 0 ? (i / 2 + 1) + '. ' : '') + c.replace(' (ejection)', '')).join(' ') + '\n');
