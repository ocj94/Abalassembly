#!/usr/bin/env node
/* Notation Nacre des coups lateraux — verifiee contre le vrai moteur.
 *
 * Signale par Saab le 24/07/2026 sur la v1.11 : la regle appliquee etait
 * l'inverse de la bonne. Elle ecrivait fin_groupe + destination_debut, ce
 * qui produit DEUX CASES ADJACENTES — « c3d3 » la ou le Nacre veut
 * « c2d4 ». Le commentaire du code affirmait pourtant la regle prouvee
 * contre huit coups lateraux du §11 de son manuel : elle ne l'etait pas.
 *
 * Invariant de Saab, verifie ici : les deux coordonnees ecrites sont
 * l'origine d'une extremite et l'arrivee de l'AUTRE, donc les plus
 * eloignees possibles. Jamais voisines.
 *
 * Usage :  node tests/nacre.js
 */

const h=require('./engine-harness.js');
const fs=require('fs');
const H=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const S=[...H.matchAll(/<script(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
function grab(n){const i=S.indexOf('function '+n+'(');const o=S.indexOf('{',i);let d=0;
 for(let k=o;k<S.length;k++){if(S[k]==='{')d++;else if(S[k]==='}'){d--;if(!d)return S.slice(i,k+1);}}}
const E=h.run(); const st=h.state;
const src=['_hexDist','_nacreGroupEnds','moveEndpointCells','moveToNACRE','_advResolveNacreSidestep'].map(grab).join('\n');
const F=new Function('AX_DIRS','rcToAxial','axialToRc','coordToABAPRO','akey','getAllMovesForColor','getBoard',
 "Object.defineProperty(globalThis,'board',{get:getBoard,configurable:true});\n"+src+
 '\nreturn {moveToNACRE,_hexDist,_nacreGroupEnds,moveEndpointCells,_advResolveNacreSidestep};')
 (E.AX_DIRS,E.rcToAxial,E.axialToRc,E.coordToABAPRO,E.akey,E.getAllMovesForColor,()=>st.board);
const start=()=>{const b={};for(let c=0;c<5;c++)b['0,'+c]='black';for(let c=0;c<6;c++)b['1,'+c]='black';
 for(let c=2;c<5;c++)b['2,'+c]='black';for(let c=2;c<5;c++)b['6,'+c]='white';
 for(let c=0;c<6;c++)b['7,'+c]='white';for(let c=0;c<5;c++)b['8,'+c]='white';return b;};
let rng=7; const rnd=n=>{rng=(Math.imul(rng,1103515245)+12345)>>>0;return rng%n;};
let ties=0, rtOK=0, rtBad=[], n=0;
for(let g=0;g<25;g++){
  st.board=start(); st.cb=0; st.cw=0; let t='black';
  for(let p=0;p<30;p++){
    const mv=E.getAllMovesForColor(t); if(!mv.length)break;
    for(const m of mv){
      if(m.cells.length<2) continue;
      const v=E.validateMove(m.cells,m.dir,t); if(!v||!v.valid||v.type!=='broadside') continue;
      const ends=F._nacreGroupEnds(m.cells);
      const dd=[ends.a,ends.b].map(from=>{const o=(from===ends.a)?ends.b:ends.a;
        const ax=E.rcToAxial(o.r,o.c); const de=E.axialToRc(ax.q+m.dir.q,ax.r+m.dir.r);
        return de?F._hexDist(E.rcToAxial(from.r,from.c),E.rcToAxial(de.r,de.c)):-1;});
      if(dd[0]===dd[1]) ties++;
      const lab=F.moveToNACRE(m.cells,m.dir,'broadside');
      /* La fleche du dernier coup doit relier exactement les deux cases que
         la notation nomme. Tant qu'elles etaient calculees separement, l'une
         pouvait deriver sans l'autre — c'est ce qui s'etait produit. */
      const ep=F.moveEndpointCells(m.cells,m.dir);
      const epLab=E.coordToABAPRO(ep.from.r,ep.from.c)+E.coordToABAPRO(ep.to.r,ep.to.c);
      if(epLab!==lab) rtBad.push('fleche '+epLab+' != notation '+lab);
      const A=E.rcToAxial(...Object.values(E.abaproToRc(lab.slice(0,2))));
      const B=E.rcToAxial(...Object.values(E.abaproToRc(lab.slice(2,4))));
      const back=F._advResolveNacreSidestep(lab,t,{q:A.q,r:A.r},{q:B.q,r:B.r});
      n++;
      if(back && back.cells.length===m.cells.length &&
         back.dir.q===m.dir.q && back.dir.r===m.dir.r &&
         back.cells.every(c=>m.cells.some(x=>x.r===c.r&&x.c===c.c))) rtOK++;
      else rtBad.push(lab+' -> '+(back?'coup different':'non resolu'));
    }
    const m=mv[rnd(mv.length)]; const v=E.validateMove(m.cells,m.dir,t);
    if(!v||!v.valid)break; E.applyMove({cells:m.cells,dir:m.dir,info:v},t);
    t=t==='black'?'white':'black'; if(st.cb>=6||st.cw>=6)break;
  }
}
console.log('coups lateraux testes      : '+n);
console.log('ecriture -> relecture OK   : '+rtOK+' ('+(100*rtOK/n).toFixed(1)+'%)');
console.log('paires a egalite de distance (notation ambigue) : '+ties);
rtBad.slice(0,5).forEach(x=>console.log('  · '+x));

const fails = [];
if (rtBad.length) fails.push(rtBad.length + ' aller-retours incorrects');
if (ties) fails.push(ties + ' notations ambigues (paires a egalite)');
if (n < 500) fails.push('trop peu de coups testes (' + n + ') — le harnais tourne-t-il a vide ?');
if (fails.length) { console.log('\nECHECS :'); fails.forEach(f => console.log(' \u00b7 ' + f)); process.exit(1); }
console.log('\nRegle Nacre laterale : conforme au moteur et sans ambiguite.');
process.exit(0);
