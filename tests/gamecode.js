const h=require('./engine-harness.js'); const E=h.run(); const st=h.state;
const ROWS=[5,6,7,8,9,8,7,6,5];
function startPos(){
  const b={};
  for(let c=0;c<5;c++) b['0,'+c]='black';
  for(let c=0;c<6;c++) b['1,'+c]='black';
  for(let c=2;c<5;c++) b['2,'+c]='black';
  for(let c=2;c<5;c++) b['6,'+c]='white';
  for(let c=0;c<6;c++) b['7,'+c]='white';
  for(let c=0;c<5;c++) b['8,'+c]='white';
  return b;
}
function dirIdx(d){ for(let i=0;i<E.AX_DIRS.length;i++) if(E.AX_DIRS[i].q===d.q&&E.AX_DIRS[i].r===d.r) return i; return -1; }
function encodeMoves(ms){
  let s='';
  for(const m of ms){ s+=String(m.cells.length);
    for(const c of m.cells) s+=E.coordToABAPRO(c.r,c.c);
    s+=String(dirIdx(m.dir)); }
  return 'ABAL1:standard:'+s;
}
let rng=123456789;
function rnd(n){ rng=(Math.imul(rng,1103515245)+12345)>>>0; return rng%n; }

let games=0, plies=0, fails=[];
for(let g=0; g<40; g++){
  st.board=startPos(); st.cb=0; st.cw=0;
  let turn='black'; const played=[];
  for(let p=0;p<60;p++){
    const mv=E.getAllMovesForColor(turn);
    if(!mv.length) break;
    const m=mv[rnd(mv.length)];
    const v=E.validateMove(m.cells,m.dir,turn);
    if(!v||!v.valid) break;
    E.applyMove({cells:m.cells,dir:m.dir,info:v},turn);
    played.push({cells:m.cells.map(c=>({r:c.r,c:c.c})),dir:m.dir});
    turn=turn==='black'?'white':'black';
    if(st.cb>=6||st.cw>=6) break;
  }
  const finalBoard=JSON.stringify(st.board), fcb=st.cb, fcw=st.cw;
  // --- rejeu depuis le code ---
  const code=encodeMoves(played);
  const parsed=E.gameCodeParse(code);
  if(!parsed.ok){ fails.push('partie '+g+' : parse -> '+parsed.reason); continue; }
  if(parsed.moves.length!==played.length){ fails.push('partie '+g+' : '+parsed.moves.length+' coups relus / '+played.length); continue; }
  st.board=startPos(); st.cb=0; st.cw=0;
  let t2='black', bad=null;
  for(let i=0;i<parsed.moves.length;i++){
    const mv=parsed.moves[i];
    const v=E.validateMove(mv.cells,mv.dir,t2);
    if(!v||!v.valid){ bad='coup '+(i+1)+' refuse : '+((v&&v.reason)||'?'); break; }
    E.applyMove({cells:mv.cells,dir:mv.dir,info:v},t2);
    t2=t2==='black'?'white':'black';
  }
  if(bad){ fails.push('partie '+g+' : '+bad); continue; }
  if(JSON.stringify(st.board)!==finalBoard){ fails.push('partie '+g+' : position finale differente'); continue; }
  if(st.cb!==fcb||st.cw!==fcw){ fails.push('partie '+g+' : captures '+st.cb+'-'+st.cw+' au lieu de '+fcb+'-'+fcw); continue; }
  games++; plies+=played.length;
}
console.log('parties rejouees a l\'identique : '+games+'/40  ('+plies+' coups au total)');
if(fails.length){ console.log('ECHECS :'); fails.slice(0,6).forEach(f=>console.log(' · '+f)); process.exit(1); }

/* Refus des codes corrompus : un code faux doit etre rejete, jamais
   accepte en silence avec une position fausse. */
const mauvais=[
 ['vide','' ],
 ['prefixe absent','standard:1a10'],
 ['tronque','ABAL1:standard:3a1b2'],
 ['case illisible','ABAL1:standard:1z90'],
 ['direction hors bornes','ABAL1:standard:1a19'],
 ['nombre de billes absurde','ABAL1:standard:9a1a2a3a4a50'],
];
let refus=0;
for(const [nom,code] of mauvais){
  const r=E.gameCodeParse(code);
  if(r.ok) fails.push('code accepte a tort ('+nom+')'); else refus++;
}
console.log('codes corrompus refuses : '+refus+'/'+mauvais.length);
if(fails.length){ console.log('ECHECS :'); fails.forEach(f=>console.log(' \u00b7 '+f)); process.exit(1); }
console.log('aller-retour du code de partie : conforme au moteur');

