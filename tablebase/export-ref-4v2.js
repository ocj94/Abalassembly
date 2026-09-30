/* export-ref-4v2.js -- ecrit ref.bin pour generate-4v2.c : geometrie, symetries,
   canonisation des paires et table 3v2, tires du code DEJA VALIDE de
   generate-3v3.js (repris tel quel ci-dessous) et de la table embarquee dans
   index.html. Ecrit aussi deux jeux de controle de la consultation 3v2 :
   lookup_ref.txt (aleatoire) et lookup_nonnul.txt (gains et pertes reels,
   sous symetrie aleatoire). */
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


// ---- export binaire pour le solveur C 4v2 : geometrie, symetries, canon des paires, table 3v2 ----
{
  const out = [];
  const nbi = Buffer.alloc(N*6); for (let i=0;i<N*6;i++) nbi.writeInt8(NBI[i], i); out.push(nbi);
  const sym = Buffer.alloc(12*N); for (let g=0;g<12;g++) for (let i=0;i<N;i++) sym.writeInt8(SYM[g][i], g*N+i); out.push(sym);
  const cr2 = Buffer.alloc(NP*2); for (let p=0;p<NP;p++) cr2.writeInt16LE(canonRep2[p], p*2); out.push(cr2);
  const cg2 = Buffer.alloc(NP); for (let p=0;p<NP;p++) cg2.writeInt8(canonG2[p], p); out.push(cg2);
  out.push(Buffer.from(status32.buffer)); out.push(Buffer.from(dtw32.buffer));
  require('fs').writeFileSync(path.join(__dirname, 'ref.bin'), Buffer.concat(out));
  let w=0,l=0,md=0; for (let i=0;i<TOTAL_32;i++){ if(status32[i]===1){w++; if(dtw32[i]>md) md=dtw32[i];} else if(status32[i]===2) l++; }
  console.log('ref.bin ecrit | NP', NP, '| NT3', NT3, '| K2', K2, '| table 3v2 : gains', w, 'pertes', l, 'DTW max', md);
  // quelques consultations 3v2 de reference, pour verifier le lookup cote C
  const ex = []; let seed = 7; const rnd = () => (seed = (seed*1103515245+12345) & 0x7fffffff) / 0x7fffffff;
  while (ex.length < 3000) { const c = new Set(); while (c.size < 5) c.add(Math.floor(rnd()*N)); const a = [...c];
    const t = rnd() < 0.5 ? 0 : 1; const r = lookup32([a[0],a[1]], [a[2],a[3],a[4]], t); ex.push([a[0],a[1],a[2],a[3],a[4],t,r.v,r.dtw].join(' ')); }
  // + toutes les positions non nulles retrouvees par consultation aleatoire ne suffisent pas : on ajoute des cas non nuls connus
  require('fs').writeFileSync(path.join(__dirname, 'lookup_ref.txt'), ex.join('\n') + '\n');
}

// ---- controle : consultations 3v2 NON nulles, sous symetrie aleatoire ----
{
let seed = 99; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const out = [];
for (let idx = 0; idx < TOTAL_32 && out.length < 4000; idx++) {
  if (!status32[idx]) continue;
  const turn = idx & 1, base = (idx - turn) / 2, ri = Math.floor(base / NT3), ti = base % NT3;
  const P = PAIRS[REPS2[ri]], T = TRIS[ti];
  if (T.includes(P[0]) || T.includes(P[1])) continue;
  const S = SYM[Math.floor(rnd() * 12)];
  const w = P.map(x => S[x]), s = T.map(x => S[x]);
  const r = lookup32(w, s, turn);
  if (r.v !== status32[idx] || r.dtw !== dtw32[idx]) throw new Error('lookup JS incoherent');
  out.push([w[0], w[1], s[0], s[1], s[2], turn, r.v, r.dtw].join(' '));
}
require('fs').writeFileSync(path.join(__dirname, 'lookup_nonnul.txt'), out.join('\n') + '\n');
console.log('entrees 3v2 non nulles preparees :', out.length);
}
