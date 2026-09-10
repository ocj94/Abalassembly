/* generate-3v3.js -- solveur retrograde pour la classe 3v3 (mode Decouverte,
   7 billes/camp, 6 ejections = defaite).

   STATUT : calcul valide, JAMAIS deploye dans le jeu -- aucune utilite pour
   un joueur (2 positions gagnantes sur 224 721 560, le reste des nulles).
   Conserve comme etape de la chaine de dependances vers 4v3 (voir
   docs/Calcul-distribue.md) : 3v2 -> 3v3 -> 4v2 -> 4v3. Chaque capture
   depuis 3v3 est verifiee via la table 3v2 deja embarquee dans le jeu
   (tb32.bin, extrait de index.html) plutot que recalculee independamment.

   Verification : le generateur de coups a 3 billes est repris de
   generate.js (deja teste, 8 regles + cross-check contre un moteur lent) ;
   les 2 positions gagnantes trouvees ont ete revalidees independamment
   avec le vrai moteur de jeu (getAllMovesForColor/validateMove
   d'index.html), pas seulement avec ce script.

   Point de reprise : ce script sauvegarde une reprise (checkpoint) apres
   chaque niveau de resolution -- necessaire car un calcul de cette taille
   depasse la duree d'un seul appel d'outil dans l'environnement ou il a
   ete developpe. Relancer la meme commande reprend automatiquement.

   Necessite un fichier d'echange (swap) si moins de ~4 Go de RAM sont
   disponibles : voir docs/Calcul-distribue.md pour le contexte complet. */

'use strict';
/* Solveur 3v3 -- s'appuie sur la table 3v2 DEJA CALCULEE ET VALIDEE
   (position par position, contre les vraies donnees embarquees) comme
   brique de base pour les transitions par capture, dans les deux sens
   de couleur (le format 3v2 est generique : "paire faible / triplet
   fort / trait", indifferent a qui est noir ou blanc).

   3v3 est SYMETRIQUE (aucun camp n'a d'avantage materiel) -- contrairement
   a 3v2, il faut donc tester GAIN et PERTE pour les DEUX couleurs, comme
   pour 2v2. Camp noir canonise par symetrie D6 pour l'indexation (choix
   arbitraire, la table sert dans les deux sens via lookup generique). */

const L = [5,6,7,8,9,8,7,6,5];
const N = 61;
const IDX=[],RC=[]; (function(){let i=0;for(let r=0;r<9;r++){IDX[r]=[];for(let c=0;c<L[r];c++){IDX[r][c]=i;RC[i]=[r,c];i++;}}})();
function cell(r,c){if(r<0||r>8)return-1;if(c<0||c>=L[r])return-1;return IDX[r][c];}
const NBI=new Int32Array(N*6).fill(-1);
(function(){for(let i=0;i<N;i++){const r=RC[i][0],c=RC[i][1];
  const down=(r<4)?[cell(r+1,c),cell(r+1,c+1)]:[cell(r+1,c-1),cell(r+1,c)];
  const up=(r<=4)?[cell(r-1,c-1),cell(r-1,c)]:[cell(r-1,c),cell(r-1,c+1)];
  NBI[i*6+0]=cell(r,c+1);NBI[i*6+1]=down[1];NBI[i*6+2]=down[0];NBI[i*6+3]=cell(r,c-1);NBI[i*6+4]=up[0];NBI[i*6+5]=up[1];}})();

const CUBE=[]; for(let i=0;i<N;i++){const r=RC[i][0],c=RC[i][1],z=r-4,x=c+Math.max(-4,-4-z); CUBE[i]=[x,-x-z,z];}
const CIDX=new Map(); for(let i=0;i<N;i++) CIDX.set(CUBE[i].join(','),i);
const SYM=[];
{ const rot=([x,y,z])=>[-z,-x,-y], ref=([x,y,z])=>[x,z,y];
  for(let m=0;m<2;m++) for(let k=0;k<6;k++){ const perm=new Int8Array(N);
    for(let i=0;i<N;i++){ let v=CUBE[i].slice(); if(m)v=ref(v); for(let t=0;t<k;t++)v=rot(v); perm[i]=CIDX.get(v.join(',')); }
    SYM.push(perm); } }

const TRIS=[], TIDX=new Int32Array(N*N*N).fill(-1);
for(let i=0;i<N;i++) for(let j=i+1;j<N;j++) for(let k=j+1;k<N;k++){ TIDX[(i*N+j)*N+k]=TRIS.length; TRIS.push([i,j,k]); }
const NT3 = TRIS.length;
const tid=(a,b,c)=>{let x=a,y=b,z=c,t; if(x>y){t=x;x=y;y=t;} if(y>z){t=y;y=z;z=t;} if(x>y){t=x;x=y;y=t;} return TIDX[(x*N+y)*N+z];};
const canonRep3=new Int32Array(NT3), canonG3=new Int8Array(NT3);
{ const repOf=new Int32Array(NT3).fill(-1), gOf=new Int8Array(NT3);
  for(let p=0;p<NT3;p++){ const [a,b,c]=TRIS[p]; let best=p,bg=0;
    for(let g=0;g<12;g++){ const q=tid(SYM[g][a],SYM[g][b],SYM[g][c]); if(q<best){best=q;bg=g;} }
    repOf[p]=best; gOf[p]=bg; }
  const reps=[...new Set(Array.from(repOf))].sort((x,y)=>x-y);
  const rank=new Map(reps.map((r,i)=>[r,i]));
  for(let p=0;p<NT3;p++){ canonRep3[p]=rank.get(repOf[p]); canonG3[p]=gOf[p]; }
  var REPS3=reps, K3=reps.length; }
console.log('triplets:',NT3,'orbites (camp reference):',K3);

// ---------- table 3v2 dejà calculee, comme service de lookup generique ----------
// (paire faible, triplet fort, trait) -> {v, dtw} -- format identique a index.html
const PAIRS = [], PIDX = new Int32Array(N*N).fill(-1);
for(let i=0;i<N;i++) for(let j=i+1;j<N;j++){ PIDX[i*N+j]=PAIRS.length; PAIRS.push([i,j]); }
const NP = PAIRS.length;
const pid = (a,b)=>a<b?PIDX[a*N+b]:PIDX[b*N+a];
const canonRep2=new Int32Array(NP), canonG2=new Int8Array(NP);
{ const repOf=new Int32Array(NP).fill(-1), gOf=new Int8Array(NP);
  for(let p=0;p<NP;p++){ const [a,b]=PAIRS[p]; let best=p,bg=0;
    for(let g=0;g<12;g++){ const q=pid(SYM[g][a],SYM[g][b]); if(q<best){best=q;bg=g;} }
    repOf[p]=best; gOf[p]=bg; }
  const reps=[...new Set(Array.from(repOf))].sort((x,y)=>x-y);
  const rank=new Map(reps.map((r,i)=>[r,i]));
  for(let p=0;p<NP;p++){ canonRep2[p]=rank.get(repOf[p]); canonG2[p]=gOf[p]; }
  var REPS2=reps, K2=reps.length; }
if (K2 !== 180) throw new Error('K2 attendu 180, obtenu '+K2+' -- geometrie/symetrie incoherente avec 3v2 deja valide');

const path = require('path'), fs = require('fs');
const TB32_CACHE = path.join(__dirname, 'tb32.cache.bin');
const TOTAL_32 = K2 * NT3 * 2;
const status32 = new Uint8Array(TOTAL_32), dtw32 = new Uint8Array(TOTAL_32);
if (fs.existsSync(TB32_CACHE)) {
  const buf32 = fs.readFileSync(TB32_CACHE);
  status32.set(new Uint8Array(buf32.buffer, buf32.byteOffset, TOTAL_32));
  dtw32.set(new Uint8Array(buf32.buffer, buf32.byteOffset + TOTAL_32, TOTAL_32));
  console.log('table 3v2 chargee depuis le cache local :', TOTAL_32.toLocaleString('fr-FR'), 'entrees');
} else {
  // extrait et decode D32 directement depuis index.html deploye -- aucun
  // fichier binaire annexe a fournir, ce script est autonome.
  console.log('cache 3v2 absent, extraction depuis index.html...');
  const idxPath = path.join(__dirname, '..', 'index.html');
  const html = fs.readFileSync(idxPath, 'utf8');
  const i = html.indexOf('var D32 = "');
  const j = html.indexOf('";', i);
  const b64 = html.slice(i + 'var D32 = "'.length, j);
  const raw = Buffer.from(b64, 'base64');
  let pos = 0, prev = 0;
  while (pos < raw.length) {
    let d = 0, s = 0, c;
    do { c = raw[pos++]; d |= (c & 127) << s; s += 7; } while (c & 128);
    prev += d;
    const p = raw[pos++];
    status32[prev] = p >> 4; dtw32[prev] = p & 15;
  }
  fs.writeFileSync(TB32_CACHE, Buffer.concat([Buffer.from(status32.buffer), Buffer.from(dtw32.buffer)]));
  console.log('table 3v2 extraite et mise en cache :', TOTAL_32.toLocaleString('fr-FR'), 'entrees');
}

// lookup32(paireFaible[2], tripletFort[3], trait 0=fort/1=faible) -> {v,dtw} ; v=0 nulle,1 gain du trait,2 perte du trait
function lookup32(weakPair, strongTri, turn) {
  const wp = pid(weakPair[0], weakPair[1]);
  const g = canonG2[wp], S = SYM[g];
  const idx = (canonRep2[wp]*NT3 + tid(S[strongTri[0]],S[strongTri[1]],S[strongTri[2]]))*2 + turn;
  return { v: status32[idx], dtw: dtw32[idx] };
}
// auto-test rapide : au moins une entree non nulle relue correctement (sanite avant de batir dessus)
{ let nonZero=0; for(let i=0;i<TOTAL_32 && nonZero<1;i++) if(status32[i]!==0) nonZero++;
  if (!nonZero) throw new Error('table 3v2 chargee mais entierement a zero -- fichier probablement corrompu'); }
console.log('sanite table 3v2 : au moins une entree non nulle presente -- OK');

// ---------- generateur de coups rapide 3 contre 3 (reprend generate.js, deja teste) ----------
const occ = new Int8Array(N);
const OWN = new Int32Array(256*3), OPP = new Int32Array(256*3), EJ = new Uint8Array(256);
function succ(own,no,opp,nop,me){
  for(let i=0;i<no;i++) occ[own[i]]=1;
  for(let i=0;i<nop;i++) occ[opp[i]]=2;
  let cnt=0;
  const put=(cells,n,oppCells,m,eject)=>{ for(let i=0;i<3;i++)OWN[cnt*3+i]=i<n?cells[i]:-1; for(let i=0;i<3;i++)OPP[cnt*3+i]=i<m?oppCells[i]:-1; EJ[cnt]=eject?1:0; cnt++; };
  const nc=[0,0,0], mc=[0,0,0];
  for (let gi=0; gi<no; gi++) {
    const i = own[gi];
    for (let d=0; d<6; d++) {
      const t = NBI[i*6+d]; if (t===-1||occ[t]!==0) continue;
      let k=0; for(let s=0;s<no;s++) if(own[s]!==i) nc[k++]=own[s];
      nc[k]=t; for(let s=0;s<nop;s++) mc[s]=opp[s];
      put(nc,no,mc,nop,false);
    }
    for (let a=0; a<3; a++) {
      const j = NBI[i*6+a]; if (j===-1||occ[j]!==1) continue;
      const k3 = NBI[j*6+a];
      const groups = [[i,j]]; if (k3!==-1&&occ[k3]===1) groups.push([i,j,k3]);
      for (const G of groups) {
        const n = G.length;
        for (let d=0; d<6; d++) {
          if (d===a || d===(a+3)%6) {
            const head = (d===a) ? G[n-1] : G[0];
            const front = NBI[head*6+d]; if (front===-1) continue;
            if (occ[front]===1) continue;
            if (occ[front]===0) {
              let k=0; for(let s=0;s<no;s++){ if(!G.includes(own[s])) nc[k++]=own[s]; }
              for (const c of G) { if (c!==((d===a)?G[0]:G[n-1])) nc[k++]=c; }
              nc[k++]=front; for(let s=0;s<nop;s++) mc[s]=opp[s];
              put(nc,no,mc,nop,false); continue;
            }
            let kk=0, p=front;
            while (p!==-1 && occ[p]===2 && kk<3) { kk++; p=NBI[p*6+d]; }
            if (kk>=n||kk>2) continue;
            if (p!==-1 && occ[p]!==0) continue;
            const pushed=[]; let q=front;
            for (let s=0;s<kk;s++){ pushed.push(q); q=NBI[q*6+d]; }
            let m=0, ejected=false;
            for (let s=0;s<nop;s++) {
              const idx = pushed.indexOf(opp[s]);
              if (idx===-1) { mc[m++]=opp[s]; continue; }
              const to = NBI[opp[s]*6+d];
              if (to===-1) ejected=true; else mc[m++]=to;
            }
            let k2=0; for(let s=0;s<no;s++){ if(!G.includes(own[s])) nc[k2++]=own[s]; }
            for (const c of G) { if (c!==((d===a)?G[0]:G[n-1])) nc[k2++]=c; }
            nc[k2++]=front; put(nc,no,mc,m,ejected);
          } else {
            let ok=true;
            for (const c of G) { const t=NBI[c*6+d]; if(t===-1||occ[t]!==0){ok=false;break;} }
            if (!ok) continue;
            let k2=0; for(let s=0;s<no;s++){ if(!G.includes(own[s])) nc[k2++]=own[s]; }
            for (const c of G) nc[k2++]=NBI[c*6+d];
            for (let s=0;s<nop;s++) mc[s]=opp[s];
            put(nc,no,mc,nop,false);
          }
        }
      }
    }
  }
  for(let i=0;i<no;i++) occ[own[i]]=0;
  for(let i=0;i<nop;i++) occ[opp[i]]=0;
  return cnt;
}

console.log('espace 3v3 :', (K3*NT3*2).toLocaleString('fr-FR'), 'positions');

const TOTAL = K3 * NT3 * 2;
const status = new Uint8Array(TOTAL), dtw = new Uint8Array(TOTAL);

// index d'une position 3v3 : camp de REFERENCE canonise (celui qu'on appelle
// toujours "A" pour l'indexation, quelle que soit sa couleur reelle au moment du lookup)
function idx33(triA, triB, turn) {
  const g = canonG3[tid(triA[0],triA[1],triA[2])], S = SYM[g];
  const ga = tid(triA[0],triA[1],triA[2]);
  return (canonRep3[ga]*NT3 + tid(S[triB[0]],S[triB[1]],S[triB[2]]))*2 + turn;
}

const unMax = K3 * NT3 * 2;
const unBuf = new Int32Array(unMax);
let unCount = 0;
for (let ri = 0; ri < K3; ri++) {
  const [a,b,c] = TRIS[REPS3[ri]];
  for (let wi = 0; wi < NT3; wi++) {
    const T = TRIS[wi];
    if (T[0]===a||T[1]===a||T[2]===a||T[0]===b||T[1]===b||T[2]===b||T[0]===c||T[1]===c||T[2]===c) continue;
    unBuf[unCount++] = (ri*NT3+wi)*2+0; unBuf[unCount++] = (ri*NT3+wi)*2+1;
  }
}
let un = unBuf.subarray(0, unCount);
console.log('positions 3v3 legales :', un.length.toLocaleString('fr-FR'));

console.time('resolution 3v3');
const CKPT = require('path').join(__dirname, 'tb33_checkpoint.bin');
const nextBuf = new Int32Array(un.length);
let unresolved = un, startLevel = 1;
if (require('fs').existsSync(CKPT)) {
  const ck = require('fs').readFileSync(CKPT);
  startLevel = ck.readUInt32LE(0);
  const nUnresolved = ck.readUInt32LE(4);
  status.set(new Uint8Array(ck.buffer, ck.byteOffset+8, TOTAL));
  dtw.set(new Uint8Array(ck.buffer, ck.byteOffset+8+TOTAL, TOTAL));
  unresolved = new Int32Array(ck.buffer, ck.byteOffset+8+TOTAL*2, nUnresolved).slice();
  console.log('REPRISE depuis le niveau', startLevel, '--', nUnresolved.toLocaleString('fr-FR'), 'positions non resolues au dernier checkpoint');
}
const DEADLINE = Date.now() + 250000; // marge sure sous la limite externe de l'outil
for (let d = startLevel; d <= 200; d++) {
  const t0 = Date.now();
  let nextCount = 0;
  let nW=0, nL=0;
  for (const p of unresolved) {
    const turn = p & 1, base = (p - turn) / 2;
    const ri = Math.floor(base / NT3), wi = base % NT3;
    const A = TRIS[REPS3[ri]], B = TRIS[wi]; // A=noir (camp de reference), B=blanc
    const mine = turn===0 ? A : B, his = turn===0 ? B : A;

    const c = succ(mine, 3, his, 3, 1);
    let resolved = 0, maxD = 0, allOppWin = true;

    // 1) verifie chaque coup : gain immediat (via 3v2, apres capture) ou gain a d via propre table 3v3
    for (let s=0;s<c;s++) {
      const myNew = [OWN[s*3],OWN[s*3+1],OWN[s*3+2]];
      if (EJ[s]) {
        const hisNew = [OPP[s*3],OPP[s*3+1]]; // adversaire tombe a 2 : transition vers 3v2
        const r = lookup32(hisNew, myNew, 1); // adversaire (faible, 2) au trait ensuite
        if (r.v === 2) { resolved = 1; break; } // adversaire force a perdre depuis 3v2 -> gain immediat pour moi
        continue;
      }
      const hisNew = [OPP[s*3],OPP[s*3+1],OPP[s*3+2]]; // reste 3v3, materiel intact
      const newA = turn===0 ? myNew : hisNew, newB = turn===0 ? hisNew : myNew;
      const ci = idx33(newA, newB, turn===0?1:0);
      if (status[ci]===2 && dtw[ci]===d-1) { resolved = 1; break; }
    }
    if (!resolved) {
      // 2) perte forcee : TOUS les coups menent a une position ou l'ADVERSAIRE gagne, dtw max = d-1
      allOppWin = true; maxD = 0;
      for (let s=0;s<c;s++) {
        const myNew = [OWN[s*3],OWN[s*3+1],OWN[s*3+2]];
        if (EJ[s]) {
          // j'ejecte : ne peut jamais etre une perte pour moi (au pire, l'adversaire pourrait gagner
          // depuis 3v2, mais ejecter reduit TOUJOURS le materiel adverse -- verifie via lookup, pas suppose)
          const hisNew = [OPP[s*3],OPP[s*3+1]];
          const r = lookup32(hisNew, myNew, 1);
          if (r.v === 1) { if (r.dtw > maxD) maxD = r.dtw; }
          else { allOppWin = false; break; }
          continue;
        }
        const hisNew = [OPP[s*3],OPP[s*3+1],OPP[s*3+2]];
        const newA = turn===0 ? myNew : hisNew, newB = turn===0 ? hisNew : myNew;
        const ci = idx33(newA, newB, turn===0?1:0);
        if (status[ci]===1) { if (dtw[ci]>maxD) maxD=dtw[ci]; }
        else { allOppWin = false; break; }
      }
      if (allOppWin && c>0 && maxD===d-1) resolved = 2;
    }
    if (resolved===1) { status[p]=1; dtw[p]=d; nW++; }
    else if (resolved===2) { status[p]=2; dtw[p]=d; nL++; }
    else nextBuf[nextCount++] = p;
  }
  console.log(`  niveau ${String(d).padStart(3)} : +${nW} gains +${nL} pertes  reste ${nextCount.toLocaleString('fr-FR')}  (${((Date.now()-t0)/1000).toFixed(1)}s)`);
  unresolved = nextBuf.subarray(0, nextCount);
  if (nW+nL===0) { require('fs').unlinkSync(CKPT); break; }
  // checkpoint apres CHAQUE niveau : reprise possible depuis le tout dernier point sauvegarde
  {
    const header = Buffer.alloc(8);
    header.writeUInt32LE(d+1, 0); header.writeUInt32LE(nextCount, 4);
    require('fs').writeFileSync(CKPT+'.tmp', Buffer.concat([header, Buffer.from(status.buffer), Buffer.from(dtw.buffer), Buffer.from(unresolved.buffer, unresolved.byteOffset, nextCount*4)]));
    require('fs').renameSync(CKPT+'.tmp', CKPT); // ecriture atomique : jamais de checkpoint a moitie ecrit
  }
  if (Date.now() > DEADLINE) { console.log('TEMPS ECOULE POUR CET APPEL -- checkpoint sauvegarde au niveau', d+1, ', relancer la meme commande pour reprendre.'); process.exit(0); }
}
console.timeEnd('resolution 3v3');

let W=0,Lc=0,D=0,maxd=0;
for (const p of un) { if(status[p]===1){W++;if(dtw[p]>maxd)maxd=dtw[p];} else if(status[p]===2)Lc++; else D++; }
console.log('gains:',W,'pertes:',Lc,'nulles:',D,'DTW max:',maxd);
require('fs').writeFileSync(require('path').join(__dirname, 'tb33.bin'), Buffer.concat([Buffer.from(status.buffer), Buffer.from(dtw.buffer)]));
console.log('table ecrite : tb33.bin');
