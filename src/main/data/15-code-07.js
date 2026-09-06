';
/* ── 📦 DÉCOMPRESSION DES BANQUES (deflate-raw natif, zéro dépendance) ──
   Les banques de parties, le book d'ouvertures et les sons sont embarqués
   compressés (≈ −2 Mo). Décompression en tâche de fond au chargement via
   DecompressionStream. Tout est dégradable : sans support navigateur, le
   jeu fonctionne — seuls bibliothèque, book et sons sont absents. */
function _inflB64(b64, asBytes){
  const bin=atob(b64), u=new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i);
  const st=new Blob([u]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return asBytes ? new Response(st).arrayBuffer() : new Response(st).text();
}
let _banksReady=null;
function ensureGameBanks(){
  if(_banksReady) return _banksReady;
  if(typeof DecompressionStream==='undefined'){ _banksReady=Promise.resolve(false); return _banksReady; }
  _banksReady=Promise.all([_inflB64(MIGS_B64),_inflB64(AO_B64),_inflB64(TREES_B64)])
    .then(function(r){ MIGS_GAMES=JSON.parse(r[0]); AO_GAMES=JSON.parse(r[1]); OPENING_TREES=JSON.parse(r[2]); return true; })
    .catch(function(){ return false; });
  return _banksReady;
}
/* Différé hors du chemin critique de rendu : OPENING_TREES est lu de façon
   synchrone par initGame() (book d'ouvertures) sans filet "chargement en
   cours", donc on garde le chargement auto — juste déplacé après le premier
   rendu plutôt que bloquant sur le parsing du script. */
(function(){
  const start = function(){ ensureGameBanks(); };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(start, {timeout: 2000});
  else setTimeout(start, 300);
})();

/* ═══════════════════════════════════════════
   EMPREINTES HISTORIQUES — 418595 positions (2589 MIGS + 1890 AO)
   reconstruites depuis les parties de tournoi réelles.
   Format : binaire en colonnes (1 octet source/couleur, 2x uint16,
   12x int16 virgule fixe /1000), compressé deflate-raw puis base64.
   Le format colonnes groupe les valeurs de même nature, ce qui
   maximise la redondance locale exploitée par deflate (~56x vs JSON brut).
═══════════════════════════════════════════ */
let EMPREINTES_HISTORIQUES=[];  // rempli par ensureEmpreintesHistoriques() — banque compressée ci-dessous
const EMPREINTES_CHAMPS=['materialDiff','cohesionMoyenne','soutienMoyen','proportionSansSoutien','zoneForteCohesion','zoneFaibleCohesion','coeurRatio','bordRatio','sumitoRatio','menaceRatio','profondeurTactique','mobilite2Ratio'];
const EMPREINTES_N=418595;
let _empreintesReady=null;
function ensureEmpreintesHistoriques(){
  if(_empreintesReady) return _empreintesReady;
  if(typeof DecompressionStream==='undefined'){ _empreintesReady=Promise.resolve(false); return _empreintesReady; }
  _empreintesReady=_inflB64(EMPREINTES_B64, true).then(function(buf){
    const n=EMPREINTES_N, dv=new DataView(buf);
    let off=0;
    const scOff=off; off+=n;
    const gOff=off; off+=n*2;
    const mOff=off; off+=n*2;
    const champOffs=[];
    for(let c=0;c<12;c++){ champOffs.push(off); off+=n*2; }
    const out=new Array(n);
    for(let i=0;i<n;i++){
      const scv=dv.getUint8(scOff+i);
      const e={};
      for(let c=0;c<12;c++) e[EMPREINTES_CHAMPS[c]]=dv.getInt16(champOffs[c]+i*2, true)/1000;
      out[i]={s:(scv<2?'MIGS':'AO'), g:dv.getUint16(gOff+i*2,true), m:dv.getUint16(mOff+i*2,true), c:((scv%2===0)?'black':'white'), e:e};
    }
    EMPREINTES_HISTORIQUES=out;
    return true;
  }).catch(function(){ return false; });
  return _empreintesReady;
}
/* Différé hors du chemin critique de rendu (pas de consommateur avec
   fallback "chargement en cours" — on garde le chargement auto, juste
   déplacé après le premier rendu). */
(function(){
  const start = function(){ ensureEmpreintesHistoriques(); };
  if (typeof requestIdleCallback === 'function') requestIdleCallback(start, {timeout: 2000});
  else setTimeout(start, 300);
})();

