/* ═══════════════════════════════════════════
   MODES MOTEUR EXPERIMENTAUX (NNUE) — testes hors-ligne avant integration
   avec de vraies parties issues du corpus (voir le detail complet donne a
   l'utilisateur : 2 victoires / 8 defaites / 5 nulles sur 15 parties
   equitables pour le mode evaluation seule, et resultat identique pour le
   mode combine). Exposes ici comme options EXPLICITEMENT etiquetees
   "experimental, plus faible selon nos tests" -- pas comme une
   amelioration, par honnetete envers le joueur qui les choisit.
   evaluateBoard_actuel/orderMoves_actuel gardent une reference vers les
   fonctions d'origine pour permettre de revenir dessus a chaque requete
   (le worker persiste entre plusieurs coups, il ne faut jamais le laisser
   dans un etat "commute" pour la requete suivante par erreur). */
const evaluateBoard_actuel = evaluateBoard;
const orderMoves_actuel = orderMoves;
let NNUE_W = null;
function nnueLoad(w){ NNUE_W = w; }
function nnueRelu(v){ return v.map(function(x){ return x > 0 ? x : 0; }); }
function nnueMatVec(mat, vec){
  const nOut = mat[0].length;
  const out = new Array(nOut).fill(0);
  for (let i = 0; i < vec.length; i++){
    const vi = vec[i];
    if (vi === 0) continue;
    const row = mat[i];
    for (let j = 0; j < nOut; j++) out[j] += vi * row[j];
  }
  return out;
}
function nnueAddBias(v, b){ return v.map(function(x,i){ return x + b[i]; }); }
function nnueForward(features){
  const W = NNUE_W;
  let z1 = nnueAddBias(nnueMatVec(W.W1, features), W.b1);
  let a1 = nnueRelu(z1);
  let z2 = nnueAddBias(nnueMatVec(W.W2, a1), W.b2);
  let a2 = nnueRelu(z2);
  let z3 = nnueAddBias(nnueMatVec(W.W3.map(function(w){return [w];}), a2), W.b3);
  return Math.tanh(z3[0]);
}
function encodeBoardForNNUE(color){
  const feat = new Array(61*2 + 3).fill(0);
  let idx = 0;
  for (let r = 0; r < ROWS.length; r++){
    for (let c = 0; c < ROWS[r]; c++){
      const v = board[r+','+c];
      if (v === 'black') feat[idx] = 1;
      else if (v === 'white') feat[61+idx] = 1;
      idx++;
    }
  }
  feat[122] = color === 'black' ? 1 : 0;
  feat[123] = capturedByBlack / 6;
  feat[124] = capturedByWhite / 6;
  return feat;
}
function evaluateBoard_nnue(color){ return nnueForward(encodeBoardForNNUE(color)) * 2000; }
function orderMoves_nnue_full(moves, depth, ttMove, prevKey){
  const cm = prevKey ? counterMove[prevKey] : null;
  return moves.map(function(m){
    let score = 0; const mk = moveKey(m);
    if (ttMove && mk === ttMove) score += 100000;
    score += (10 - (m.code || 9)) * 1000;
    if (killerMoves[depth] && killerMoves[depth].indexOf(mk) !== -1) score += 500;
    if (cm && mk === cm) score += 300;
    score += (historyTable[mk] || 0);
    const moverColor = board[akey(m.cells[0].r, m.cells[0].c)];
    const u = applyMove(m, moverColor);
    score += nnueForward(encodeBoardForNNUE(moverColor)) * 2000;
    undoMove(u);
    return { m: m, score: score };
  }).sort(function(a,b){ return b.score - a.score; }).map(function(x){ return x.m; });
}
/* Applique le mode moteur demande AVANT chaque recherche -- remet toujours
   explicitement evaluateBoard/orderMoves a leur valeur (NNUE ou originale),
   jamais un simple "si demande, alors commute" qui laisserait le worker
   pollue pour la requete suivante. */
function applyEngineMode(mode, weights){
  if (mode === 'nnue-eval' || mode === 'nnue-both') {
    if (weights) nnueLoad(weights);
    evaluateBoard = evaluateBoard_nnue;
  } else {
    evaluateBoard = evaluateBoard_actuel;
  }
  if (mode === 'nnue-order' || mode === 'nnue-both') {
    if (weights) nnueLoad(weights);
    orderMoves = orderMoves_nnue_full;
  } else {
    orderMoves = orderMoves_actuel;
  }
}
self.onmessage=function(e){
  const d=e.data;
  if(d.ping){ self.postMessage({pong:1}); return; }
  if(d.replayGame){
    try{ var rr=replayFromMoves(d.colorA,d.seed,d.moves||[]); self.postMessage({replayGame:true,id:d.id,frames:rr.frames,result:d.result||null}); }
    catch(err){ self.postMessage({replayGame:true,id:d.id,error:String(err&&err.message||err)}); }
    return; }
  if(d.duelGame){
    try{ _recMoves=[]; var r=playDuelGame(d.wA,d.wB,d.colorA,d.seed,d.msPerMove,d.maxPlies,d.drawWin); var mv=_recMoves; _recMoves=null; self.postMessage({duelGame:true,id:d.id,result:r,moves:mv}); }
    catch(err){ _recMoves=null; self.postMessage({duelGame:true,id:d.id,error:String(err&&err.message||err)}); }
    return; }
  board=d.board;capturedByWhite=d.capturedByWhite;capturedByBlack=d.capturedByBlack;
  if(d.weights)EVAL_W=d.weights;
  applyEngineMode(d.engineMode||null, d.nnueWeights||null);
  if(d.analyze){
    const r=analyzePosition(d.color, d.depth||3, d.played);
    self.postMessage({analyze:true,index:d.index,best:r.bestScore,played:r.playedScore,rank:r.rank,total:r.total,bestMove:r.bestMove});
    return;
  }
  if(d.singleMove){
    /* Mode "vol de travail" : calcule UN SEUL coup racine, puis rend la main
       immediatement -- le thread principal redistribue le coup suivant a
       n'importe quel worker libre, au lieu d'un lot fige au depart (voir
       requestAIMovePooledStealing). resetTables une seule fois par worker
       pour TOUTE la session de reflexion (TT/killer/historique restent
       utiles d'un coup racine a l'autre ET d'une profondeur a l'autre,
       exactement comme searchBestMove qui ne les videait qu'une fois avant
       sa boucle de profondeur) -- mais _nodes/_ttLk/_ttHit sont TOUJOURS
       remis a zero, sinon le compteur rapporte pour "ce coup" serait en
       realite le cumul de tous les coups precedents traites par ce worker.
       Aucun element de la fenetre alpha-beta n'est partage entre coups
       racine ici -- verifie avant de construire que ce n'etait deja PAS le
       cas dans searchBestMove (chaque coup racine y est deja cherche avec
       une fenetre pleine -Infinity,+Infinity, la variable alpha locale
       n'etait jamais reinjectee) : cette restructuration ne perd donc aucun
       elagage croise qui existait avant. */
    if(d.resetTables){killerMoves={};historyTable={};counterMove={};TT.clear();}
    _nodes=0;_ttLk=0;_ttHit=0;
    const repCount=_repCountMap(d.hist);
    const mk=moveKey(d.move);
    const u=applyMove(d.move,d.color);
    let s=search(d.depth-1,-Infinity,Infinity,false,d.color,mk);
    if(repCount){const rc=repCount.get(_repKeyOf(board));if(rc)s-=140*rc*rc;}
    undoMove(u);
    self.postMessage({move:d.move,score:s,nodes:_nodes});
    return;
  }
  const move=searchBestMove(d.color, d.depth, d.time, d.hist, d.workerIndex, d.workerCount);
  self.postMessage({move:move, metrics:_metrics});
};
`;

let _aiWorker = null;
let _aiWorkerURL = null;
let _aiGen = 0;            // génération de calcul IA : incrémentée à chaque reset pour invalider les callbacks périmés
function getAIWorker() {
  if (_aiWorker) return _aiWorker;
  try {
    const blob = new Blob([AI_WORKER_CODE], { type: 'application/javascript' });
    _aiWorkerURL = URL.createObjectURL(blob);
    _aiWorker = new Worker(_aiWorkerURL);
    return _aiWorker;
  } catch(e) {
    return null;  // Worker indisponible → fallback synchrone
  }
}
// Termine le worker IA et libère l'URL blob (évite fuite mémoire et résultats périmés)
function terminateAIWorker() {
  if (_aiWorker) { try { _aiWorker.terminate(); } catch(e){} _aiWorker = null; }
  if (_aiWorkerURL) { try { URL.revokeObjectURL(_aiWorkerURL); } catch(e){} _aiWorkerURL = null; }
}

/* ═══════════════════════════════════════════
   RECHERCHE MULTI-WORKER (partage de racines, même appareil)
   Pas de Lazy SMP (mémoire partagée) — bloqué par l'absence des en-têtes
   COOP/COEP sur GitHub Pages, nécessaires à SharedArrayBuffer. Ceci est plus
   simple : plusieurs Workers indépendants (postMessage, pas de mémoire
   partagée), chacun explore une tranche différente des coups racine sur SA
   PROPRE table de transposition. S'adapte à l'appareil (téléphone/tablette/
   PC) via navigator.hardwareConcurrency — un appareil à 2 cœurs ne lance
   qu'1 worker (= comportement actuel, inchangé) ; un PC à 8+ cœurs en lance
   jusqu'à 4 (plafonné volontairement : rendements décroissants + chaleur/
   batterie sur portable).
═══════════════════════════════════════════ */
let _aiWorkerPool = [];
/* ═══════════════════════════════════════════
   BENCHMARK MOTEUR — mesure réelle avant toute promesse de gain.
   Position de test fixe (Belgian Daisy standard, reproductible), 1 worker
   puis le nombre réellement utilisé en jeu (detectAIWorkerCount()).
   Contrairement à requestAIMovePooled() (qui ne garde que les métriques du
   MEILLEUR coup pour jouer vite), ici on récupère les métriques de TOUS les
   workers pour mesurer le travail total réellement abattu, pas juste le
   résultat gagnant.
═══════════════════════════════════════════ */
function _benchBuildStartBoard(){
  const b = {};
  const layout = LAYOUTS.belgian;
  layout.black.forEach(function(p){ b[p[0]+','+p[1]] = 'black'; });
  layout.white.forEach(function(p){ b[p[0]+','+p[1]] = 'white'; });
  return b;
}

function _benchRunWorkers(board, depth, workerCount){
  return new Promise(function(resolve){
    const workers = getAIWorkerPool(workerCount);
    if (!workers.length){ resolve(null); return; }
    const n = Math.min(workerCount, workers.length);
    const results = new Array(n).fill(null);
    let remaining = n;
    const t0 = performance.now();
    function finish(){
      resolve({ wallMs: performance.now() - t0, results: results });
    }
    const timeoutId = setTimeout(finish, 30000); // filet de securite
    for (let i = 0; i < n; i++){
      const w = workers[i];
      w.onmessage = function(e){
        results[i] = e.data.metrics || null;
        remaining--;
        if (remaining <= 0){ clearTimeout(timeoutId); finish(); }
      };
      w.postMessage({
        board: board, capturedByWhite: 0, capturedByBlack: 0,
        color: 'black', depth: depth, time: 20000, hist: null,
        workerIndex: i, workerCount: n
      });
    }
  });
}

async function runEngineBenchmark(){
  const statusEl = document.getElementById('bench-status');
  const resultsEl = document.getElementById('bench-results');
  const depthSel = document.getElementById('bench-depth');
  const depth = parseInt(depthSel && depthSel.value || '4', 10);
  const board = _benchBuildStartBoard();
  const multiN = detectAIWorkerCount();

  if (resultsEl) resultsEl.style.display = 'none';
  if (statusEl) statusEl.textContent = '⏳ 1 worker, profondeur ' + depth + '…';

  const single = await _benchRunWorkers(board, depth, 1);
  if (!single || !single.results[0]){
    if (statusEl) statusEl.textContent = '❌ Worker indisponible sur cet appareil — benchmark impossible.';
    return;
  }
  const singleMetrics = single.results[0];
  const singleNodes = singleMetrics.nodes || 0;
  const singleTimeS = Math.max(0.001, single.wallMs / 1000);
  const singleNPS = Math.round(singleNodes / singleTimeS);

  if (multiN <= 1){
    if (statusEl) statusEl.textContent = '✅ Terminé — cet appareil ne lance qu\'1 worker utile (peu de cœurs détectés), pas de comparaison possible.';
    const singleEl = document.getElementById('bench-single-nps');
    if (singleEl) singleEl.textContent = singleNPS.toLocaleString('fr-FR');
    const singleDetail = document.getElementById('bench-single-detail');
    if (singleDetail) singleDetail.textContent = singleNodes.toLocaleString('fr-FR') + ' nœuds en ' + Math.round(single.wallMs) + ' ms · TT ' + (singleMetrics.ttHit||0) + '%';
    if (resultsEl) resultsEl.style.display = 'block';
    const multiLabel = document.getElementById('bench-multi-label');
    if (multiLabel) multiLabel.textContent = 'N/A';
    return;
  }

  if (statusEl) statusEl.textContent = '⏳ ' + multiN + ' workers, profondeur ' + depth + '…';
  const multi = await _benchRunWorkers(board, depth, multiN);
  if (!multi){
    if (statusEl) statusEl.textContent = '❌ Échec de la mesure multi-worker.';
    return;
  }
  const validResults = multi.results.filter(function(r){ return r; });
  const multiTotalNodes = validResults.reduce(function(s,r){ return s + (r.nodes||0); }, 0);
  const multiTimeS = Math.max(0.001, multi.wallMs / 1000);
  const multiNPS = Math.round(multiTotalNodes / multiTimeS);
  const avgTTHit = validResults.length
    ? Math.round(validResults.reduce(function(s,r){ return s + (r.ttHit||0); }, 0) / validResults.length)
    : 0;

  // Efficacite reelle : combien de fois plus vite le TRAVAIL TOTAL est-il abattu,
  // vs le nombre de workers (ideal = multiN, en pratique moins a cause du
  // desequilibre entre coups racine).
  const speedupVsSingleTime = singleTimeS / multiTimeS; // gain de temps mur reel
  const efficiencyPct = Math.round((speedupVsSingleTime / multiN) * 100);

  const singleEl = document.getElementById('bench-single-nps');
  if (singleEl) singleEl.textContent = singleNPS.toLocaleString('fr-FR');
  const singleDetail = document.getElementById('bench-single-detail');
  if (singleDetail) singleDetail.textContent = singleNodes.toLocaleString('fr-FR') + ' nœuds en ' + Math.round(single.wallMs) + ' ms · TT ' + (singleMetrics.ttHit||0) + '%';

  const multiLabel = document.getElementById('bench-multi-label');
  if (multiLabel) multiLabel.textContent = multiN + ' workers';
  const multiEl = document.getElementById('bench-multi-nps');
  if (multiEl) multiEl.textContent = multiNPS.toLocaleString('fr-FR');
  const multiDetail = document.getElementById('bench-multi-detail');
  if (multiDetail) multiDetail.textContent = multiTotalNodes.toLocaleString('fr-FR') + ' nœuds (total) en ' + Math.round(multi.wallMs) + ' ms · TT ' + avgTTHit + '% (moy.)';

  const effEl = document.getElementById('bench-efficiency');
  if (effEl){
    effEl.textContent = 'temps divisé par ' + speedupVsSingleTime.toFixed(1) + ' avec ' + multiN + ' workers ('
      + efficiencyPct + '% de l\'idéal théorique). '
      + (efficiencyPct >= 70 ? 'Bon équilibrage.' : efficiencyPct >= 40 ? 'Équilibrage moyen — les coups racine ne se valent pas tous en profondeur de calcul.' : 'Équilibrage faible — vérifier le vol de travail entre workers avant d\'ajouter plus de cœurs.');
  }
  if (resultsEl) resultsEl.style.display = 'block';
  if (statusEl) statusEl.textContent = '✅ Terminé.';
}

function detectAIWorkerCount() {
  const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : 2;
  return Math.max(1, Math.min(cores - 1, 4));
}
function getAIWorkerPool(n) {
  while (_aiWorkerPool.length < n) {
    try {
      const blob = new Blob([AI_WORKER_CODE], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const w = new Worker(url);
      w._blobUrl = url;
      _aiWorkerPool.push(w);
    } catch(e) { break; }   // Worker indisponible → on rend ce qu'on a (peut être vide)
  }
  return _aiWorkerPool.slice(0, n);
}
function terminateAIWorkerPool() {
  _aiWorkerPool.forEach(function(w){
    try { w.onmessage = null; w.terminate(); } catch(e){}
    try { URL.revokeObjectURL(w._blobUrl); } catch(e){}
  });
  _aiWorkerPool = [];
}
/* Lance une recherche partagée entre plusieurs workers pour UNE position.
   Retourne true si le calcul a démarré (onDone sera appelé plus tard) ;
   retourne false si le partage n'est pas possible (appareil à 1 cœur utile,
   ou Worker indisponible) — l'appelant doit alors utiliser le chemin
   mono-worker existant, inchangé. */
function requestAIMovePooled(params, onDone) {
  /* LIMITE CONNUE, NON RESOLUE (different du bug bestScore/lastRoots deja
     corrige juste au-dessus, dans searchBestMove) : chaque worker a sa
     PROPRE table de transposition/coups tueurs/historique, jamais partagee
     entre eux (pas de SharedArrayBuffer possible sur GitHub Pages, confirme
     par ailleurs cette session). Un coup evalue "a froid" (tables vides,
     contexte independant) peut recevoir un score radicalement different du
     MEME coup evalue "a chaud" (avec du contexte accumule par des
     recherches precedentes liees). Verifie concretement en investiguant le
     vol de travail (voir requestAIMovePooledStealing plus bas) : un coup
     objectivement bon (score 32 en recherche a un seul thread, tous les
     coups dans le meme contexte continu) tombait a 0 quand recherche seul,
     tables fraiches -- un ecart de 32 points sur la MEME position. Ce
     n'est pas un bug de calcul localise, c'est une consequence directe de
     la conception (alpha-beta + TT + heuristiques d'ordonnancement qui
     s'ameliorent avec le contexte accumule). Comparer les "bestScore"
     rapportes par des workers independants ci-dessous n'est donc PAS
     fiable a 100% : le worker qui a eu la sequence de coups la plus
     favorable pour accumuler du contexte utile peut rapporter un score
     artificiellement plus flatteur qu'un autre worker moins chanceux, sur
     un coup objectivement equivalent ou meme moins bon.
     Piste explorée et ABANDONNEE (pas concluante) : un tri en deux phases
     (triage rapide et parallele, puis verification des finalistes dans un
     contexte unique) -- echoue car le triage "a froid" de la phase 1 peut
     deja ecarter a tort le vrai meilleur coup avant meme d'atteindre la
     phase de verification (l'ecart a froid peut depasser ce qu'un
     raisonnable nombre de finalistes peut absorber).
     Pas de correctif propre trouve pour l'instant avec les contraintes de
     cet hebergement (pas de memoire partagee). Document ici par honnetete
     plutot que de pretendre que cette repartition produit toujours le
     choix objectivement optimal -- en pratique le systeme reste
     globalement fonctionnel (les differences de score sont rarement assez
     grandes pour changer la HIERARCHIE des coups, seulement leur valeur
     absolue rapportee), mais le risque existe et n'est pas nul. */
  const n = detectAIWorkerCount();
  if (n <= 1) return false;
  const workers = getAIWorkerPool(n);
  if (workers.length <= 1) return false;

  const results = new Array(workers.length).fill(null);
  let remaining = workers.length, doneFlag = false;

  function finish() {
    if (doneFlag) return; doneFlag = true;
    clearTimeout(timeoutId);
    workers.forEach(function(w){ w.onmessage = null; });
    let best = null, bestScore = -Infinity, bestMetrics = null;
    for (const r of results) {
      if (!r || !r.move) continue;
      // metrics.bestScore (pas rootMoves[0].score) : le score qui correspond
      // reellement au coup choisi, meme si la derniere profondeur a ete coupee
      // par le minuteur avant que rootMoves ne soit mis a jour vers elle (voir
      // le commentaire dans searchBestMove).
      const sc = (r.metrics && typeof r.metrics.bestScore === 'number') ? r.metrics.bestScore : -Infinity;
      if (sc > bestScore) { bestScore = sc; best = r.move; bestMetrics = r.metrics; }
    }
    /* FUSION DES COUPS RACINE (different du choix du coup ci-dessus, qui lui
       etait deja correct). Avant : bestMetrics.rootMoves ne contenait que les
       coups du worker gagnant, soit 1/N des coups legaux -- le panneau
       "Coups possibles" affichait donc jusqu'a 5 coups pris dans un seul lot
       en omettant silencieusement tous les autres, et les pourcentages
       etaient normalises sur ce sous-ensemble. Un coup objectivement 2e
       pouvait ne pas apparaitre du tout. On fusionne ici les listes de tous
       les workers, a la profondeur atteinte par TOUS (comparer des scores de
       profondeurs differentes n'aurait aucun sens). La reserve documentee en
       tete de fonction reste entiere : tables de transposition independantes,
       donc la valeur absolue des scores n'est pas parfaitement comparable
       d'un worker a l'autre -- la hierarchie l'est en pratique, pas la
       precision au point pres. */
    if (bestMetrics) {
      const maps = results
        .filter(function(r){ return r && r.metrics && r.metrics.rootsByDepth && Object.keys(r.metrics.rootsByDepth).length; })
        .map(function(r){ return r.metrics.rootsByDepth; });
      let common = 0;
      for (let d = 1; d <= 64; d++) {
        if (maps.length && maps.every(function(m){ return Array.isArray(m[d]) && m[d].length; })) common = d;
      }
      if (common > 0) {
        let all = [];
        maps.forEach(function(m){ all = all.concat(m[common]); });
        all.sort(function(a,b){ return b.score - a.score; });
        bestMetrics = Object.assign({}, bestMetrics, {
          rootMoves: all.slice(0, 5), rootDepth: common, rootTotal: all.length
        });
      }
    }
    onDone(best, bestMetrics);
  }
  const timeoutId = setTimeout(finish, (params.time || 2000) + 4000);

  workers.forEach(function(w, i) {
    w.onmessage = function(e) {
      if (doneFlag) return;
      results[i] = e.data;
      remaining--;
      if (remaining <= 0) finish();
    };
    w.postMessage(Object.assign({}, params, { workerIndex: i, workerCount: workers.length }));
  });
  return true;
}

/* ═══════════════════════════════════════════
   VOL DE TRAVAIL — distribution dynamique des coups racine.
   NON UTILISE ACTUELLEMENT (aiMove() appelle toujours requestAIMovePooled
   ci-dessus, pas cette fonction) -- conserve comme piste documentee,
   testee, mais pas deployee, plutot que supprimee. Voici pourquoi.

   Constat de depart (benchmark moteur, mesure par Olivier sur son
   appareil) : la division fixe (requestAIMovePooled) n'atteint que 15-18%
   de l'efficacite theorique a profondeur 4-6. Hypothese testee : un
   worker rapide reste les bras croises pendant qu'un autre rame sur son
   lot fige, faute de redistribution. Cette fonction corrige exactement
   ca : chaque worker ne recoit qu'UN SEUL coup a la fois, redemande
   immediatement le suivant des qu'il a fini.

   Verifie CORRECT contre une reference a un seul thread (meme position,
   meme coup, meme score exact) -- la logique de distribution elle-meme
   est fiable.

   Mais verifie PAS CLAIREMENT PLUS RAPIDE en pratique : sur des tests
   reels avec de vrais threads (Node worker_threads, pas une simulation),
   parfois plus LENT que la division fixe (ex. 8.6s contre 6.7s a
   profondeur 3) -- le surcout des nombreux petits messages (jusqu'a 150+
   pour 52 coups sur 3 profondeurs, contre 4 messages pour la division
   fixe) peut depasser le gain d'equilibrage sur les profondeurs peu
   profondes ou chaque tache individuelle est trop courte pour amortir ce
   cout fixe.

   Et surtout : cette restructuration ne resout PAS la limite plus
   profonde documentee au-dessus de requestAIMovePooled (comparabilite des
   scores entre workers a contexte independant) -- vol de travail ou
   division fixe, aucun des deux ne partage la table de transposition
   entre workers, donc aucun des deux ne peut garantir des scores
   directement comparables. Ce chantier ne repondait donc pas a la
   question la plus importante decouverte en le construisant.

   Garde ici, testee et documentee, au cas ou une future session voudrait
   repartir de cette base -- notamment si un jour SharedArrayBuffer
   redevient possible sur cet hebergement, ou si le message overhead peut
   etre reduit davantage. */
function requestAIMovePooledStealing(params, onDone) {
  const n = detectAIWorkerCount();
  if (n <= 1) return false;
  const workers = getAIWorkerPool(n);
  if (workers.length <= 1) return false;
  if (typeof getAllMovesForColor !== 'function') return false;

  const rootMoves = getAllMovesForColor(params.color);
  if (!rootMoves.length) { onDone(null, null); return true; }

  const startTime = Date.now();
  const timeLimit = params.time || 2000;
  const maxDepth = params.depth;
  let doneFlag = false;
  let bestMove = null, bestScore = -Infinity, reachedDepth = 0, totalNodes = 0, lastCompleteRoots = null;
  const workerReset = workers.map(function(){ return false; }); // une seule remise a zero par worker, pour toute la session

  function finish() {
    if (doneFlag) return; doneFlag = true;
    clearTimeout(safetyTimeout);
    workers.forEach(function(w){ w.onmessage = null; });
    onDone(bestMove, { nodes: totalNodes, depth: reachedDepth, time: Date.now() - startTime,
      ttHit: 0, bestScore: bestScore, rootMoves: lastCompleteRoots });
  }
  const safetyTimeout = setTimeout(finish, timeLimit + 4000);

  function runDepth(d, currentMoves) {
    if (doneFlag) return;
    if (Date.now() - startTime > timeLimit || d > maxDepth) { finish(); return; }

    const results = new Array(currentMoves.length).fill(null);
    let nextIdx = 0, completed = 0, cutThisDepth = false;
    let nodesThisDepth = 0;

    function assignNext(worker, workerPos) {
      if (doneFlag || cutThisDepth) return;
      if (Date.now() - startTime > timeLimit) { cutThisDepth = true; maybeFinishDepth(); return; }
      if (nextIdx >= currentMoves.length) return;
      const idx = nextIdx++;
      const move = currentMoves[idx];
      const needsReset = !workerReset[workerPos];
      workerReset[workerPos] = true;
      worker.onmessage = function(e) {
        if (doneFlag) return;
        results[idx] = e.data;
        nodesThisDepth += (e.data.nodes || 0);
        completed++;
        maybeFinishDepth();
        if (!doneFlag && !cutThisDepth) assignNext(worker, workerPos);
      };
      worker.postMessage(Object.assign({}, params, {
        singleMove: true, move: move, depth: d, resetTables: needsReset
      }));
    }

    function maybeFinishDepth() {
      if (doneFlag) return;
      if (completed >= currentMoves.length) {
        // profondeur entierement terminee : devient la reference
        totalNodes += nodesThisDepth;
        const scored = currentMoves.map(function(m, i){ return Object.assign({}, m, { score: results[i].score }); });
        scored.sort(function(a,b){ return b.score - a.score; });
        bestMove = scored[0]; bestScore = scored[0].score; reachedDepth = d;
        lastCompleteRoots = scored.slice(0,5).map(function(m){ return { cells:m.cells, dir:m.dir, type:m.type, eject:m.eject, score:m.score }; });
        if (d >= maxDepth || Date.now() - startTime > timeLimit) { finish(); return; }
        runDepth(d+1, scored.map(function(m){ return { cells:m.cells, dir:m.dir, type:m.type, eject:m.eject }; }));
      } else if (cutThisDepth && completed >= nextIdx) {
        // coupe par le minuteur avant que tous les coups distribues ne
        // repondent tous : cette profondeur ne compte pas, on s'arrete sur
        // la precedente (deja complete)
        finish();
      }
    }

    workers.forEach(function(w, i){ assignNext(w, i); });
  }

  runDepth(1, rootMoves);
  return true;
}


/* Force l'IA à jouer maintenant — idée de Saab : quand la recherche prend
   du temps (surtout en mode α-β), ce bouton interrompt le calcul en cours et
   joue immédiatement un coup jouable (recherche éclair profondeur 1). La
   recherche du moteur étant synchrone à l'intérieur du worker, on ne peut pas
   « récupérer » proprement son meilleur coup partiel ; on termine donc le
   worker et on relance une recherche minimale dans le thread principal. En
   incrémentant _aiGen, tout résultat tardif du worker terminé est ignoré
   (évite qu'il joue un second coup par-dessus). */
let _aiForcing = false;
function forceAINow() {
  if (gameOver) return;
  if (typeof aiColor !== 'function') return;
  const ai = aiColor();
  // on n'agit que si c'est bien à l'IA de jouer et qu'elle réfléchit
  const thinking = document.getElementById('ai-thinking');
  if (!thinking || thinking.style.display === 'none') return;
  if (_aiForcing) return;
  _aiForcing = true;

  // Invalide tout callback en cours (worker ou setTimeout de secours)
  if (typeof soundForceAI === 'function') soundForceAI();
  if (typeof _aiGen !== 'undefined') _aiGen++;
  terminateAIWorker();
  if (typeof terminateAIWorkerPool === 'function') terminateAIWorkerPool();
  showAIThinking(false);

  try {
    const moves = getAllMovesForColor(ai);
    if (!moves.length) { if (typeof HumanColor!=='undefined'){ currentTurn = HumanColor.get(); updateStatus(); } _aiForcing = false; return; }
    // recherche éclair : profondeur 1, budget minimal → coup immédiat mais légal
    let chosen = null;
    try { chosen = searchBestMove(ai, 1, 120, (typeof _gameHistKeys==='function'?_gameHistKeys():null)); } catch(e){ chosen = null; }
    if (!chosen) {
      // dernier recours : le coup le mieux « codé » (heuristique de tri déjà existante)
      moves.sort(function(a,b){ return (a.code||9)-(b.code||9); });
      chosen = moves[0];
    }
    if (chosen && typeof executeAIMove === 'function') executeAIMove(chosen);
  } catch(e) {
    // en cas d'échec total, ne fige pas la partie : rend la main au joueur
    if (typeof HumanColor!=='undefined'){ currentTurn = HumanColor.get(); updateStatus(); }
  }
  _aiForcing = false;
}

