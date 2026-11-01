/* Compare le moteur GPU (abalone_gpu.cu, compile pour le processeur) au moteur du site, position par
   position : la liste des coups, l'evaluation des deux camps, et la note de CHAQUE coup a profondeur
   1 et 2 (searchBestMove, _metrics.rootsByDepth), penalites de repetition et d'aller-retour comprises.
   Positions : des parties tirees au hasard depuis les departs du site, et des va-et-vient pour
   les penalites.
     g++ -O2 -std=c++17 -fopenmp tools/gpu/test_cpu.cpp -o /tmp/abalone_cpu
     node tools/gpu/verifier.js /tmp/abalone_cpu [positions a profondeur 1] [dont a profondeur 2]
   Ecrit « Tout concorde » si rien ne differe. */
const path = require('path'), fs = require('fs'), vm = require('vm'), { spawnSync } = require('child_process');
process.chdir(path.join(__dirname, '..', '..'));
const { chargerMoteur } = require('../../tests/harness');
const ctx = chargerMoteur();
const w = { console, Date, Math, JSON, Map, Set, Object, Array, Number, String, Infinity, isFinite, parseInt, Uint8Array, Int8Array, Float32Array, Int32Array, Uint32Array, DataView, ArrayBuffer,
  navigator: { deviceMemory: 4 }, atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64') };
w.self = w; vm.createContext(w); vm.runInContext(ctx.AI_WORKER_CODE, w);
const ev = c => vm.runInContext(c, w);
const BIN = process.argv[2] || '/tmp/abalone_cpu', N1 = +(process.argv[3] || 2000), N2 = +(process.argv[4] || 400);
const ROWS = [5, 6, 7, 8, 9, 8, 7, 6, 5], DEB = [0, 5, 11, 18, 26, 35, 43, 50, 56];
let graine = 20261101; const rnd = () => { graine = (graine + 0x6D2B79F5) >>> 0; let t = graine; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const cles = Object.keys(ctx.LAYOUTS).filter(k => k !== 'decouverte');
const poser = (b, cb, cw) => { const o = {}; for (let r = 0; r < 9; r++) for (let c = 0; c < ROWS[r]; c++) { const v = b[DEB[r] + c]; if (v) o[r + ',' + c] = v === 1 ? 'black' : 'white'; }
  w.__b = o; ev('board = __b; capturedByBlack = ' + cb + '; capturedByWhite = ' + cw + ';'); };
const lire = () => { const o = JSON.parse(ev('JSON.stringify(board)')), b = new Array(61).fill(0);
  for (const k in o) { const [r, c] = k.split(',').map(Number); b[DEB[r] + c] = o[k] === 'black' ? 1 : 2; } return b; };
const cleRep = b => b.map(v => v ? (v === 1 ? 'b' : 'w') : '-').join('');   // _repKeyOf
const NOM = { 1: 'black', 2: 'white' };
// une position : une partie au hasard (poussees et ejections plus souvent), parfois finie par des va-et-vient
function position() {
  const k = cles[Math.floor(rnd() * cles.length)], L = ctx.LAYOUTS[k], b0 = new Array(61).fill(0);
  L.black.forEach(([r, c]) => { b0[DEB[r] + c] = 1; }); L.white.forEach(([r, c]) => { b0[DEB[r] + c] = 2; });
  poser(b0, 0, 0); let col = 1; const hist = [];
  const plies = Math.floor(rnd() * 70);
  for (let p = 0; p < plies; p++) {
    const ms = JSON.parse(ev('JSON.stringify(getAllMovesForColor("' + NOM[col] + '").map(m => m.type))'));
    if (!ms.length) break;
    const fortes = ms.map((t, i) => t === 'push' ? i : -1).filter(i => i >= 0);
    const i = fortes.length && rnd() < 0.4 ? fortes[Math.floor(rnd() * fortes.length)] : Math.floor(rnd() * ms.length);
    ev('applyMove(getAllMovesForColor("' + NOM[col] + '")[' + i + '], "' + NOM[col] + '")');
    if (ev('capturedByBlack') >= 5 || ev('capturedByWhite') >= 5) { hist.push(cleRep(lire())); col = 3 - col; break; }
    hist.push(cleRep(lire())); col = 3 - col;
  }
  // va-et-vient : chaque camp avance une bille puis la ramene, 1 a 3 fois
  if (rnd() < 0.35) {
    const pas = {};
    for (const c of [col, 3 - col]) {
      const ms = JSON.parse(ev('JSON.stringify(getAllMovesForColor("' + NOM[c] + '").map(m => [m.type, m.cells.length]))'));
      const simples = ms.map((m, i) => m[0] === 'move' && m[1] === 1 ? i : -1).filter(i => i >= 0);
      if (!simples.length) { pas[c] = null; continue; }
      pas[c] = JSON.parse(ev('JSON.stringify((m => ({ r: m.cells[0].r, c: m.cells[0].c, q: m.dir.q, s: m.dir.r }))(getAllMovesForColor("' + NOM[c] + '")[' + simples[Math.floor(rnd() * simples.length)] + ']))'));
    }
    const fois = 1 + Math.floor(rnd() * 3), arret = Math.floor(rnd() * 4);
    if (pas[col] && pas[3 - col]) {
      // la bille de chaque camp va puis revient ; on joue le coup par sa case de depart et sa direction
      const jouer1 = (c, aller) => { const m = pas[c];
        const code = '(function(){ const a = rcToAxial(' + m.r + ',' + m.c + '); let src = { r:' + m.r + ', c:' + m.c + ' }, d = { q:' + m.q + ', r:' + m.s + ' };'
          + (aller ? '' : 'const t = axialToRc(a.q + d.q, a.r + d.r); src = t; d = { q:-d.q, r:-d.r };')
          + 'const info = validateMove([src], d, "' + NOM[c] + '"); if (!info.valid) return false; applyMove({ cells:[src], dir:d, info:info }, "' + NOM[c] + '"); return true; })()';
        return ev(code); };
      let n = 0;
      for (let f = 0; f < fois; f++) for (const aller of [true, false]) for (const c of [col, 3 - col]) {
        if (f === fois - 1 && !aller && n >= 2 + arret) continue;
        if (!jouer1(c, aller)) continue;
        hist.push(cleRep(lire())); n++;
      }
      if (n % 2) col = 3 - col;
    }
  }
  return { b: lire(), cb: ev('capturedByBlack'), cw: ev('capturedByWhite'), col, hist: hist.slice(-60) };
}
const cas = [];
for (let i = 0; i < N1; i++) { const p = position(); if (p.cb >= 6 || p.cw >= 6) continue; p.prof = i < N2 ? 2 : 1; cas.push(p); }
// le moteur du site
const t0 = Date.now(); let maxCoups = 0;
for (const p of cas) {
  poser(p.b, p.cb, p.cw);
  p.js = { coups: JSON.parse(ev('JSON.stringify(getAllMovesForColor("' + NOM[p.col] + '").map(moveKey))')).sort(),
    evN: ev('evaluateBoard("black")'), evB: ev('evaluateBoard("white")') };
  maxCoups = Math.max(maxCoups, p.js.coups.length);
  w.__h = p.hist;   // cles _repKeyOf du site : meme ordre de cases que le notre
  ev('searchBestMove("' + NOM[p.col] + '", ' + p.prof + ', 1e12, __h)');
  const R = JSON.parse(ev('JSON.stringify(_metrics.rootsByDepth)'));
  for (let d = 1; d <= p.prof; d++) { p.js['notes' + d] = {}; (R[d] || []).forEach(x => { p.js['notes' + d][x.key] = x.score; }); }
}
const msJs = Date.now() - t0;
// le moteur GPU, sur le processeur
const entree = cas.map(p => [p.b.join(''), p.cb, p.cw, p.col, p.prof, p.hist.length,
  ...p.hist.map(k => k.split('').map(ch => ch === 'b' ? 1 : ch === 'w' ? 2 : 0).join(''))].join(' ')).join('\n') + '\n';
const t1 = Date.now();
const r = spawnSync(BIN, ['verif'], { input: entree, maxBuffer: 1 << 30 });
if (r.status !== 0) { console.error(String(r.stderr)); process.exit(1); }
const msCpu = Date.now() - t1;
const sorties = String(r.stdout).trim().split('\n').map(l => JSON.parse(l));
if (sorties.length !== cas.length) { console.error('nombre de sorties', sorties.length, '!=', cas.length); process.exit(1); }
let ecarts = 0, notes = 0, penal = 0; const ex = [];
cas.forEach((p, i) => {
  const s = sorties[i], err = m => { ecarts++; if (ex.length < 8) ex.push('#' + i + ' ' + m); };
  if (s.debord) err('debordement de liste');
  if (s.coups !== p.js.coups.join(' ')) err('coups ' + s.n + ' contre ' + p.js.coups.length);
  if (s.evN !== p.js.evN || s.evB !== p.js.evB) err('evaluation ' + s.evN + '/' + s.evB + ' contre ' + p.js.evN + '/' + p.js.evB);
  for (let d = 1; d <= p.prof; d++) {
    const a = s['notes' + d], b = p.js['notes' + d];
    for (const k of Object.keys(b)) { notes++; if (a[k] !== b[k]) err('profondeur ' + d + ' ' + k + ' : ' + a[k] + ' contre ' + b[k]); }
    if (Object.keys(a).length !== Object.keys(b).length) err('profondeur ' + d + ' : nombre de coups');
    if (s['best' + d] !== Math.max(...Object.values(b))) err('meilleure note ' + d);
  }
});
// les penalites ont-elles servi ? les memes positions sans historique, cote GPU : combien de notes changent
const r2 = spawnSync(BIN, ['verif'], { input: cas.map(p => [p.b.join(''), p.cb, p.cw, p.col, 1, 0].join(' ')).join('\n') + '\n', maxBuffer: 1 << 30 });
String(r2.stdout).trim().split('\n').map(l => JSON.parse(l)).forEach((s, i) => { const a = sorties[i].notes1; for (const k in a) if (a[k] !== s.notes1[k]) penal++; });
const avecRep = cas.filter(p => new Set(p.hist).size < p.hist.length).length;
console.log(cas.length + ' positions (' + cas.filter(p => p.prof === 2).length + ' a profondeur 2), ' + notes + ' notes de coups comparees ; ' + avecRep + ' positions avec une repetition dans l historique, ' + penal + ' notes changees par les penalites');
console.log('coups au plus dans une position : ' + maxCoups + ' (MAXC = 160)');
console.log('temps : moteur du site ' + (msJs / 1000).toFixed(1) + ' s, moteur GPU sur processeur ' + (msCpu / 1000).toFixed(1) + ' s');
if (ecarts) { console.log(ecarts + ' ECARTS'); ex.forEach(x => console.log('  ' + x)); process.exit(1); }
console.log('Tout concorde.');
