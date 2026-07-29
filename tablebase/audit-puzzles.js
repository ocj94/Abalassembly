'use strict';
/* ============================================================================
   ABALASSEMBLY — AUDIT DES PUZZLES PAR PREUVE          node tablebase/audit-puzzles.js
   ----------------------------------------------------------------------------
   Les puzzles sont extraits des parties reelles sur un ecart d'evaluation (`gap`).
   Un ecart d'evaluation n'est pas une preuve : il dit que le moteur PREFERE un
   coup, pas qu'il gagne par la force. Ce script rejoue chaque puzzle avec le
   solveur et le classe :

     OFFENSIF CERTIFIE  le camp au trait gagne une bille par la force (horizon 3)
     DEFENSIF CERTIFIE  il ne gagne rien, mais au moins un coup evite la perte,
                        et la solution enregistree en fait partie
     SANS SOLUTION      aucun coup n'evite la perte : le puzzle n'a pas de reponse
     SOLUTION FAUSSE    des coups evitent la perte, mais pas celui enregistre
     TRIVIAL            plus de la moitie des coups conviennent : puzzle sans interet

   Usage : node audit-puzzles.js [index.html] [--baseline fichier.json]

   Avec --baseline, la sortie vaut 1 seulement si un puzzle NON reference casse,
   ou si un puzzle de la reference a ete corrige sans mettre la reference a jour.
   C'est ce mode qu'utilise l'integration continue : on interdit de reculer,
   sans bloquer sur les cas connus au moment ou l'audit a ete introduit.
   ========================================================================== */
const fs = require('fs');
const argv = process.argv.slice(2);
const bi = argv.indexOf('--baseline');
const baselinePath = bi >= 0 ? argv[bi + 1] : null;
const path = argv.filter((a, i) => a !== '--baseline' && (bi < 0 || i !== bi + 1))[0] || 'index.html';
const src = fs.readFileSync(path, 'utf8');

// --- moteur : on reutilise celui du Web Worker, seule source de verite ---
const i0 = src.indexOf('const AI_WORKER_CODE = `') + 'const AI_WORKER_CODE = `'.length;
const engine = src.slice(i0, src.indexOf('\n`;', i0)).replace('self.onmessage', 'var _off; var _unused');
const solver = fs.readFileSync(__dirname + '/solver.js', 'utf8')
  .replace("if (typeof module !== 'undefined') module.exports = AbaSolve;", '');
const api = new Function(engine + '\n' + solver + `
  return { AbaSolve, getAllMovesForColor, applyMove, undoMove,
           set board(v){ board = v; }, get board(){ return board; },
           set cb(v){ capturedByBlack = v; }, set cw(v){ capturedByWhite = v; } };`)();

// --- corpus ---
const iP = src.indexOf('const PUZZLES=[');
const PUZ = JSON.parse(src.slice(iP + 'const PUZZLES='.length,
  src.lastIndexOf(']', src.indexOf('\n', src.indexOf('}]', iP))) + 1));
console.log('puzzles embarques :', PUZ.length, '\n');

const setup = p => {
  const b = {};
  p.bm.forEach(k => b[k] = 'black');
  p.wm.forEach(k => b[k] = 'white');
  api.board = b; api.cb = p.cb | 0; api.cw = p.cw | 0;
};
const same = (m, s) => m.dir.q === s.dir.q && m.dir.r === s.dir.r &&
  m.cells.length === s.cells.length &&
  m.cells.map(c => c.r + ',' + c.c).sort().join('|') === s.cells.map(c => c.r + ',' + c.c).sort().join('|');

const HORIZON = 3, report = [];
let nOff = 0, nDef = 0, nBad = 0, nTriv = 0;

PUZ.forEach((p, idx) => {
  setup(p);
  const foe = p.c === 'black' ? 'white' : 'black';
  if (api.AbaSolve.gain(p.c, HORIZON, 1, { timeMs: 5000 }).proved) {
    nOff++; report.push({ idx, lab: p.lab, src: p.src, verdict: 'OFFENSIF CERTIFIE' });
    return;
  }
  const moves = api.getAllMovesForColor(p.c);
  let safe = 0, solSafe = false;
  for (const m of moves) {
    const u = api.applyMove(m, p.c);
    const lost = api.AbaSolve.gain(foe, HORIZON, 1, { timeMs: 3000 }).proved;
    api.undoMove(u);
    if (!lost) { safe++; if (same(m, p.sol)) solSafe = true; }
  }
  let verdict;
  if (safe === 0) { verdict = 'SANS SOLUTION'; nBad++; }
  else if (!solSafe) { verdict = 'SOLUTION FAUSSE'; nBad++; }
  else if (safe > moves.length / 2) { verdict = 'TRIVIAL'; nTriv++; }
  else { verdict = 'DEFENSIF CERTIFIE'; nDef++; }
  report.push({ idx, lab: p.lab, src: p.src, verdict, safe, moves: moves.length });
});

report.filter(r => r.verdict !== 'OFFENSIF CERTIFIE').forEach(r =>
  console.log(`  #${String(r.idx).padStart(3)} ${String(r.lab).padEnd(7)} ${r.verdict.padEnd(18)} ` +
    (r.safe !== undefined ? `${r.safe}/${r.moves} coups saufs   ` : '') + `partie : ${r.src || '?'}`));

console.log(`\n  offensifs certifies : ${nOff}`);
console.log(`  defensifs certifies : ${nDef}`);
console.log(`  triviaux            : ${nTriv}`);
console.log(`  A CORRIGER          : ${nBad}`);
fs.writeFileSync('audit-puzzles.json', JSON.stringify({ horizon: HORIZON, total: PUZ.length, report }, null, 1));
console.log('\nrapport detaille : audit-puzzles.json');

if (!baselinePath) process.exit(nBad ? 1 : 0);

// ── comparaison a la reference des cas connus ──
const base = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const known = new Set(base.known_broken.map(x => x.idx + ':' + x.verdict));
const now = new Set(report.filter(r => r.verdict === 'SANS SOLUTION' || r.verdict === 'SOLUTION FAUSSE')
                          .map(r => r.idx + ':' + r.verdict));
const nouveaux = [...now].filter(k => !known.has(k));
const corriges = [...known].filter(k => !now.has(k));

console.log('\n── comparaison a ' + baselinePath + ' ──');
if (nouveaux.length) {
  console.error('  REGRESSION : ' + nouveaux.length + ' puzzle(s) casse(s) hors reference');
  nouveaux.forEach(k => {
    const r = report.find(x => x.idx + ':' + x.verdict === k);
    console.error('    #' + r.idx + ' ' + r.lab + ' — ' + r.verdict + ' (partie : ' + (r.src || '?') + ')');
  });
}
if (corriges.length) {
  console.error('  ' + corriges.length + ' puzzle(s) de la reference ne cassent plus : mets a jour ' + baselinePath);
  corriges.forEach(k => console.error('    ' + k));
}
if (!nouveaux.length && !corriges.length) {
  console.log('  aucun changement : ' + known.size + ' cas connus, aucune regression.');
}
process.exit((nouveaux.length || corriges.length) ? 1 : 0);
