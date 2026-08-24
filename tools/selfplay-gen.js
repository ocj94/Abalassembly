#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════
   GENERATEUR DE PARTIES D'AUTO-JEU (self-play) — outil de recherche
   ═══════════════════════════════════════════════════════════════════
   But : produire un jeu de donnees d'entrainement ou les positions sont
   etiquetees par l'ISSUE REELLE de la partie, le moteur jouant contre
   lui-meme -- alternative a l'entrainement actuel du NNUE, qui apprend
   sur des parties humaines.

   COMMENT L'EXECUTER
   Ce script a besoin du moteur, qui vit dans index.html (constante
   AI_WORKER_CODE) et de LAYOUTS. Extraire les deux et les concatener
   AVANT ce fichier, puis lancer :
       NGAMES=100 DEPTH=2 node selfplay-gen.js
   Sortie : /tmp/selfplay.json  {meta, data:[{b,t,y}]}
   b = plateau (81 car.), t = camp au trait, y = issue vue de ce camp
   (+1 gagne, -1 perd, 0 nulle).

   CHIFFRES REELLEMENT MESURES (profondeur 2, Belgian Daisy, 10 parties)
   -- pas des estimations :
       20,4 s par partie
       43,6 coups par partie en moyenne
       44,6 positions d'entrainement par partie
       97,8 % de positions UNIQUES  <- la randomisation d'ouverture marche
   Extrapolation depuis ces mesures :
       20 000 positions  ~  2,5 h de calcul
       50 000 positions  ~  6,3 h
      190 000 positions  ~   24 h  (volume du corpus humain actuel)

   POURQUOI LA RANDOMISATION D'OUVERTURE EST INDISPENSABLE
   Le moteur est strictement DETERMINISTE (verifie : 3 appels sur la meme
   position renvoient le meme coup). Sans les RAND_PLIES premiers coups
   joues au hasard, N parties d'auto-jeu seraient N fois LA MEME partie,
   et le jeu de donnees serait sans valeur. Le taux de positions uniques
   affiche en fin d'execution mesure directement ce risque -- le
   surveiller si l'on change les parametres.

   RESERVE HONNETE SUR LA QUALITE DES DONNEES
   Sur l'echantillon mesure, les noirs gagnent 8 fois sur 10 : fort
   desequilibre du premier joueur a cette profondeur. Un reseau entraine
   tel quel risque d'apprendre « noir gagne » plutot qu'a evaluer une
   position. A equilibrer (inverser les couleurs, ou ponderer) AVANT tout
   entrainement. Ce n'est pas resolu ici.

   Le generateur est valide (diversite mesuree, etiquetage verifie) ; la
   generation a grande echelle et l'entrainement restent a faire.
   Licence : GPL v3, comme le reste du projet.
   ═══════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const LAY = process.env.LAY || 'belgian';
const NGAMES = parseInt(process.env.NGAMES||'100',10);
const DEPTH = parseInt(process.env.DEPTH||'2',10);
const RAND_PLIES = 6;          // coups d'ouverture joues au hasard -> varie les parties
const MAX_PLIES = 100;

function newGame(){
  board = {};
  LAYOUTS[LAY].black.forEach(p => board[p[0]+','+p[1]] = 'black');
  LAYOUTS[LAY].white.forEach(p => board[p[0]+','+p[1]] = 'white');
  capturedByBlack = 0; capturedByWhite = 0;
}
function boardStr(){
  let s='';
  for(let r=0;r<9;r++) for(let c=0;c<ROWS[r];c++){ const v=board[r+','+c]; s += v?(v==='black'?'b':'w'):'-'; }
  return s;
}
// generateur pseudo-aleatoire reproductible (graine) -- rejouable a l'identique
let _seed = 12345;
function rnd(){ _seed = (_seed*1103515245+12345)&0x7fffffff; return _seed/0x7fffffff; }

const dataset = [];
const stats = { wins:{black:0,white:0}, draws:0, plies:[], reasons:{} };
const t0 = Date.now();

for (let g=0; g<NGAMES; g++){
  newGame();
  killerMoves={};historyTable={};counterMove={};TT.clear();
  let color='black', plies=0, reason='max';
  const positions = [];
  const seen = new Map();
  while (plies < MAX_PLIES){
    let mv;
    if (plies < RAND_PLIES) {                       // ouverture aleatoire -> diversite
      const all = getAllMovesForColor(color);
      if (!all.length) { reason='aucun coup'; break; }
      mv = all[Math.floor(rnd()*all.length)];
    } else {
      mv = searchBestMove(color, DEPTH, 60000, null);
      if (!mv) { reason='aucun coup'; break; }
    }
    const info = validateMove(mv.cells, mv.dir, color);
    if (!info || !info.valid) { reason='coup invalide'; break; }
    positions.push({ b: boardStr(), t: color });     // position AVANT le coup + trait
    applyMove({cells:mv.cells, dir:mv.dir, info:info}, color);
    if (info.type==='push' && info.ejection){ if(color==='white') capturedByWhite++; else capturedByBlack++; }
    const k = boardStr()+':'+color;
    seen.set(k,(seen.get(k)||0)+1);
    if (seen.get(k)>=3){ reason='repetition'; break; }
    if (capturedByBlack>=6){ reason='victoire noir'; break; }
    if (capturedByWhite>=6){ reason='victoire blanc'; break; }
    color = color==='black'?'white':'black';
    plies++;
  }
  let outcome = 0;                                   // nulle
  if (capturedByBlack>=6){ outcome = 1; stats.wins.black++; }
  else if (capturedByWhite>=6){ outcome = -1; stats.wins.white++; }
  else stats.draws++;
  stats.plies.push(plies);
  stats.reasons[reason] = (stats.reasons[reason]||0)+1;
  // etiquette chaque position par l'issue FINALE, vue du camp au trait
  positions.forEach(p => dataset.push({ b:p.b, t:p.t, y: (p.t==='black'? outcome : -outcome) }));
  if ((g+1)%25===0) console.log(`  ${g+1}/${NGAMES} parties — ${dataset.length} positions — ${((Date.now()-t0)/1000).toFixed(0)}s`);
}

const dt = (Date.now()-t0)/1000;
const avgPlies = stats.plies.reduce((a,b)=>a+b,0)/stats.plies.length;
console.log('\n=== RESULTAT REEL ===');
console.log(`Parties : ${NGAMES} (variante ${LAY}, profondeur ${DEPTH}, ${RAND_PLIES} coups d'ouverture aleatoires)`);
console.log(`Temps total : ${dt.toFixed(1)}s  →  ${(dt/NGAMES).toFixed(2)}s par partie`);
console.log(`Longueur moyenne : ${avgPlies.toFixed(1)} coups`);
console.log(`Positions generees : ${dataset.length}  (${(dataset.length/NGAMES).toFixed(1)} par partie)`);
console.log(`Issues : noir ${stats.wins.black} | blanc ${stats.wins.white} | nulles ${stats.draws}`);
console.log('Fins de partie :', JSON.stringify(stats.reasons));
const uniq = new Set(dataset.map(d=>d.b)).size;
console.log(`Positions UNIQUES : ${uniq} / ${dataset.length}  (${(uniq/dataset.length*100).toFixed(1)}% — mesure la diversite reelle)`);
fs.writeFileSync('/tmp/selfplay.json', JSON.stringify({meta:{games:NGAMES,depth:DEPTH,layout:LAY,seconds:dt}, data:dataset}));
console.log('Jeu de donnees ecrit : /tmp/selfplay.json');
