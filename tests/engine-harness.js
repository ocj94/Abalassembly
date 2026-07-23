/* Harnais Node : extrait les vraies fonctions du moteur depuis index.html
   et rejoue le format de code de partie contre elles. */
const fs=require('fs');
const H=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const S=[...H.matchAll(/<script(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');

function grab(kind,name){
  const pat = kind==='fn' ? ('function '+name+'(') : (name+' =');
  const i = S.indexOf(kind==='fn'?pat:('const '+name+' ='));
  if(i<0) throw new Error('introuvable: '+name);
  if(kind==='const'){ const e=S.indexOf(';',i); return S.slice(i,e+1); }
  const o=S.indexOf('{',i); let d=0;
  for(let k=o;k<S.length;k++){ if(S[k]==='{')d++; else if(S[k]==='}'){d--; if(!d) return S.slice(i,k+1);} }
  throw new Error('accolades: '+name);
}
const parts=[];
for(const c of ['ROWS','ABAPRO_ROWS','AX_DIRS','akey']) parts.push(grab('const',c));
for(const f of ['rcToAxial','axialToRc','selectionLine','validateMove','abApplyMove',
                'applyMove','undoMove','getAllMovesForColor','coordToABAPRO','abaproToRc',
                'gameCodeParse','_gcDirIndex']) parts.push(grab('fn',f));

let board={}, capturedByBlack=0, capturedByWhite=0;
const ctx={board:null};
const code=parts.join('\n\n');
const run=new Function('getBoard','setBoard','getCap','setCap', `
  Object.defineProperty(globalThis,'board',{get:getBoard,set:setBoard,configurable:true});
  Object.defineProperty(globalThis,'capturedByBlack',{get:()=>getCap('b'),set:v=>setCap('b',v),configurable:true});
  Object.defineProperty(globalThis,'capturedByWhite',{get:()=>getCap('w'),set:v=>setCap('w',v),configurable:true});
  ${code}
  return {validateMove,applyMove,undoMove,getAllMovesForColor,coordToABAPRO,abaproToRc,gameCodeParse,AX_DIRS,akey,rcToAxial,axialToRc};
`);
module.exports={run:()=> run(()=>board,v=>{board=v},k=>k==='b'?capturedByBlack:capturedByWhite,
  (k,v)=>{ if(k==='b')capturedByBlack=v; else capturedByWhite=v; }),
  state:{get board(){return board}, set board(v){board=v},
         get cb(){return capturedByBlack}, set cb(v){capturedByBlack=v},
         get cw(){return capturedByWhite}, set cw(v){capturedByWhite=v}}};
