/* ═══════════════════════════════════════════
   SYNCHRONISER MES APPAREILS (v2.69)
   Demande d'Olivier : « comment faire pour que tous les navigateurs aient les
   memes donnees ? ». Le site n'a ni compte ni serveur : chaque navigateur garde
   ses donnees (localStorage). Ici, deux appareils FUSIONNENT les leurs :
   - en direct : les deux ouverts, un code dans chaque sens (comme la Partie en
     direct), puis une connexion directe entre les navigateurs (WebRTC) ;
   - par fichier : un fichier de synchro, fusionne sur l'autre appareil (si la
     connexion directe ne passe pas, par exemple entre deux reseaux).
   Ce qui voyage : les donnees de jeu (SYNC_CLES). Le reste -- reglages
   d'affichage et de son, compte local et securite, Labo IA, caches et mesures
   propres a l'appareil, partie en cours -- reste sur chaque appareil.

   LA FUSION (_syncFusionner) : rien n'est ecrase.
   - historique : l'union des parties (meme code = meme partie) ; une partie
     supprimee sur un appareil l'est aussi sur l'autre (SYNC_SUPPRIMEES_CLE) ;
   - ensembles (badges, problemes resolus) : l'union ;
   - COMPTEURS (XP, parties jouees, cartes de chaleur...) : chaque appareil
     garde ce qu'il sait de la part de chacun (SYNC_COMPTEURS_CLE, un compteur
     « G-counter ») et le total est la somme des parts. Sa propre part, un
     appareil la deduit : son total moins ce qui vient des autres. Synchroniser
     deux fois ne change rien, trois appareils synchronises deux a deux tombent
     juste, et rien n'est compte deux fois. Une seule prudence : a la toute
     premiere rencontre de deux appareils qui n'ont jamais synchronise et qui
     partagent deja des parties jouees ici (l'un est la copie de l'autre, par
     l'ancien export JSON), on garde le plus grand des deux totaux plutot que
     leur somme ;
   - le reste, regle par regle : l'ELO et la serie du cote le plus recemment
     actif, la meilleure serie au maximum, les defis du jour au plus avance, les
     defis de la semaine et du jour sans jamais compter pour la periode en cours
     ce qui vient de l'autre appareil...
   Toutes ces fonctions prennent un « stock » (localStorage, ou un faux stock
   dans les tests) : deux appareils se simulent sans navigateur.
═══════════════════════════════════════════ */
const SYNC_FORMAT = 'abalassembly-synchro-v1';
const SYNC_APPAREIL_CLE = 'abaSyncAppareil';      // l'identite de CET appareil : ne voyage jamais
const SYNC_COMPTEURS_CLE = 'abaSyncCompteurs';    // { appareil: { chemin: part } } -- la part de chacun dans chaque compteur
const SYNC_SUPPRIMEES_CLE = 'abaSyncSupprimees';  // { code de partie: { d: date, x: 1 supprimee | 0 revenue } } -- la plus recente l'emporte
const SYNC_DERNIERE_CLE = 'abaSyncDerniere';      // { date, avec } -- la derniere synchro de cet appareil
const SYNC_CLES = {
  abaGameHistory: 'historique', abalone_progress: 'progression',
  abaPuzzleSolved: 'nombre', abaGamesFinished: 'nombre',
  abaSolvedPuzzleTitles: 'ensemble', abaBadges: 'ensemble',
  abaSrsPuzzles: 'revision', abaGymCerveau: 'gym',
  abaDuelsCerveau: 'arbre', abaWeaknessProfile: 'arbre',
  abaFormateurProgress: 'formation', abaTourneyPalmares: 'palmares',
  abaPlateauCarnet: 'carnet', abaScannedGames: 'liste', abaGcMyName: 'texte'
};
// les compteurs de la progression (abalone_progress) : des totaux qui ne font que monter
const _SYNC_PROG_COMPTEURS = ['xp', 'gamesPlayed', 'gamesWon', 'gamesLost', 'gamesDraw', 'totalMoves', 'totalEjections', 'totalPushes',
  'pushAttempts', 'bestMoves', 'fastMoves', 'centerTurns', 'cohesionSum', 'leadGames', 'leadWins', 'broadsideMoves', 'firstEjSum',
  'firstEjGames', 'compactSum', 'compactSamples', 'oppGroupSum', 'oppGroupSamples', 'puzzlesSolved'];
const _SYNC_PROG_CARTES = ['heatmaps', 'heatmap', 'heatmapWhite'];   // cartes de chaleur : chaque case est un compteur
const _SYNC_PROG_LOCAUX = ['kidsMode', 'showRadar', 'referralCode', 'referredBy', 'referrals', '__hadLead', '__firstEjDone'];   // propres a l'appareil
const _SYNC_DEBUTS = { startWins: 'gamesWon', startGames: 'gamesPlayed', startPuzzles: 'puzzlesSolved', startEjections: 'totalEjections' };
const _SYNC_SEP = '\u001f';
const _SYNC_SUPPRIMEES_GARDE = 600;

function _syncStock(ls){
  ls = ls || localStorage;
  return { lire: function(k){ try { return ls.getItem(k); } catch (e) { return null; } },
           ecrire: function(k, v){ ls.setItem(k, v); },
           effacer: function(k){ try { ls.removeItem(k); } catch (e) {} } };
}
function _syncJson(st, k, defaut){ try { const t = st.lire(k); return t == null ? defaut : JSON.parse(t); } catch (e) { return defaut; } }
function _syncIdentite(st){
  let id = st.lire(SYNC_APPAREIL_CLE);
  if (!id) { id = 'app-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); try { st.ecrire(SYNC_APPAREIL_CLE, id); } catch (e) {} }
  return id;
}
function _syncLireDonnees(st){
  const d = {};
  Object.keys(SYNC_CLES).forEach(function(cle){
    const t = st.lire(cle); if (t == null) return;
    const type = SYNC_CLES[cle];
    if (type === 'texte') d[cle] = t;
    else if (type === 'nombre') d[cle] = Number(t) || 0;
    else { try { d[cle] = JSON.parse(t); } catch (e) {} }
  });
  return d;
}

/* ─── Les compteurs : { chemin: valeur } pour une cle ─── */
function _syncChemin(segments){ return segments.join(_SYNC_SEP); }
function _syncFeuilles(o, pref, out){   // toutes les feuilles numeriques d'un arbre
  if (typeof o === 'number') { if (isFinite(o)) out[_syncChemin(pref)] = o; return out; }
  if (o && typeof o === 'object' && !Array.isArray(o)) Object.keys(o).forEach(function(k){ _syncFeuilles(o[k], pref.concat(k), out); });
  return out;
}
function _syncCompteurs(cle, v){
  const out = {}, type = SYNC_CLES[cle];
  if (v == null) return out;
  if (type === 'nombre') { out[_syncChemin([cle])] = Number(v) || 0; return out; }
  if (type === 'arbre') return _syncFeuilles(v, [cle], out);
  if (type === 'gym' && typeof v === 'object') { Object.keys(v).forEach(function(ex){ if (v[ex] && typeof v[ex].sessions === 'number') out[_syncChemin([cle, ex, 'sessions'])] = v[ex].sessions; }); return out; }
  if (type === 'progression' && typeof v === 'object') {
    _SYNC_PROG_COMPTEURS.forEach(function(k){ if (typeof v[k] === 'number' && isFinite(v[k])) out[_syncChemin([cle, k])] = v[k]; });
    _SYNC_PROG_CARTES.forEach(function(k){ if (v[k] && typeof v[k] === 'object') _syncFeuilles(v[k], [cle, k], out); });
  }
  return out;
}
function _syncTotaux(donnees){
  const t = {};
  Object.keys(SYNC_CLES).forEach(function(cle){ Object.assign(t, _syncCompteurs(cle, donnees[cle])); });
  return t;
}
// la part de CET appareil : son total moins ce qu'il sait venir des autres (jamais negative)
function _syncMaPart(totaux, connu, moi){
  const part = {};
  Object.keys(totaux).forEach(function(c){
    let autres = 0;
    Object.keys(connu || {}).forEach(function(d){ if (d !== moi) autres += (connu[d][c] || 0); });
    part[c] = Math.max(0, totaux[c] - autres);
  });
  return part;
}
function _syncMajConnaissance(st){
  st = st || _syncStock();
  const moi = _syncIdentite(st), connu = _syncJson(st, SYNC_COMPTEURS_CLE, {}) || {};
  const part = _syncMaPart(_syncTotaux(_syncLireDonnees(st)), connu, moi), m = connu[moi] || (connu[moi] = {});
  Object.keys(part).forEach(function(c){ m[c] = Math.max(m[c] || 0, part[c]); });
  try { st.ecrire(SYNC_COMPTEURS_CLE, JSON.stringify(connu)); } catch (e) {}
  return connu;
}
// Ce qu'un appareil envoie (ou met dans le fichier de synchro)
function _syncPaquet(st){
  st = st || _syncStock();
  return { format: SYNC_FORMAT, appareil: _syncIdentite(st), date: new Date().toISOString(), version: (typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''),
           donnees: _syncLireDonnees(st), connu: _syncMajConnaissance(st), supprimees: _syncJson(st, SYNC_SUPPRIMEES_CLE, {}) || {} };
}

/* ─── Fusions, cle par cle (a : cet appareil, b : l'autre) ─── */
function _syncMaxTexte(x, y){ return (x == null) ? y : (y == null ? x : (String(y) > String(x) ? y : x)); }
function _syncUnion(x, y){
  const out = Array.isArray(x) ? x.slice() : [];
  (Array.isArray(y) ? y : []).forEach(function(v){ if (out.indexOf(v) < 0) out.push(v); });
  return out;
}
function _syncUnionPar(x, y, cleDe, garde){
  const out = [], vus = new Set();
  [].concat(Array.isArray(x) ? x : [], Array.isArray(y) ? y : []).forEach(function(e){ const k = cleDe(e); if (vus.has(k)) return; vus.add(k); out.push(e); });
  return garde ? out.slice(0, garde) : out;
}
function _syncSansHeure(e){ return (typeof _histSansHeure === 'function') ? _histSansHeure(e) : false; }
function _syncFusionPartie(x, y){
  const r = Object.assign({}, y, x);                     // la fiche d'ici l'emporte, l'autre la complete
  if (_syncSansHeure(x) && !_syncSansHeure(y)) { r.date = y.date; r.heureInconnue = false; }
  if (x.chaleur || y.chaleur) r.chaleur = true;          // ses coups sont deja dans une carte de chaleur : ils voyagent avec les compteurs
  if (x.spectateur && !y.spectateur) { r.spectateur = y.spectateur; r.humanColor = y.humanColor; }   // ta partie d'un cote : ta partie
  return r;
}
function _syncFusionHistorique(a, b, supprimees){
  const parCode = new Map();
  const ajouter = function(e){
    if (!e || !e.code || _syncEstSupprimee(supprimees[e.code])) return;
    const d = parCode.get(e.code);
    parCode.set(e.code, d ? _syncFusionPartie(d, e) : Object.assign({}, e));
  };
  (Array.isArray(a) ? a : []).forEach(ajouter); (Array.isArray(b) ? b : []).forEach(ajouter);
  let liste = Array.from(parCode.values()).sort(function(x, y){ return (new Date(y.date).getTime() || 0) - (new Date(x.date).getTime() || 0); });
  const max = (typeof HIST_MAX !== 'undefined') ? HIST_MAX : 200;
  // plafond : les parties consultees partent les premieres (les plus anciennes d'abord), puis les plus anciennes
  for (let i = liste.length - 1; liste.length > max && i >= 0; i--) if (liste[i].spectateur) liste.splice(i, 1);
  if (liste.length > max) liste = liste.slice(0, max);
  return liste;
}
function _syncFusionDefis(a, b){
  const r = {}, fini = function(e){ return !!(e && e.f); };
  Object.keys(Object.assign({}, a || {}, b || {})).forEach(function(n){
    const x = (a || {})[n], y = (b || {})[n];
    let c;
    if (!x || !y) c = x || y;
    else if (fini(x) !== fini(y)) c = fini(x) ? x : y;
    else if (fini(x)) c = ((x.j || 0) <= (y.j || 0)) ? x : y;      // trouve des deux cotes : le premier jour
    else c = (String(x.e || '').length >= String(y.e || '').length) ? x : y;
    r[n] = Object.assign({}, c, { ms: Math.max((x && x.ms) || 0, (y && y.ms) || 0) });
  });
  const garde = (typeof DEFI_GARDE !== 'undefined') ? DEFI_GARDE : 400, cles = Object.keys(r).map(Number).sort(function(p, q){ return p - q; });
  while (cles.length > garde) delete r[cles.shift()];
  return r;
}
// defi de la semaine, du jour, puzzle du mois : la periode la plus recente ; meme periode : reclame d'un cote = reclame
function _syncFusionPeriode(x, y, champ){
  if (!x || !y) return { v: x || y, src: x ? 'a' : 'b' };
  if (String(x[champ]) !== String(y[champ])) return String(y[champ]) > String(x[champ]) ? { v: y, src: 'b' } : { v: x, src: 'a' };
  const v = Object.assign({}, x);
  ['claimed', 'solved', 'revealed'].forEach(function(k){ if (x[k] || y[k]) v[k] = true; });
  return { v: v, src: 'a' };
}
function _syncParDate(x, y, champ, preferY, garde){
  const parDate = {};
  (Array.isArray(x) ? x : []).forEach(function(e){ if (e && e.date) parDate[e.date] = e; });
  (Array.isArray(y) ? y : []).forEach(function(e){
    if (!e || !e.date) return;
    const d = parDate[e.date];
    if (!d) parDate[e.date] = e;
    else if (champ === 'xp') parDate[e.date] = (e.xp || 0) > (d.xp || 0) ? e : d;
    else if (preferY) parDate[e.date] = e;
  });
  const out = Object.keys(parDate).sort().map(function(k){ return parDate[k]; });
  return out.slice(Math.max(0, out.length - garde));
}
function _syncFusionProgression(a, b){
  a = a || {}; b = b || {};
  const recentB = String(b.lastActive || '') > String(a.lastActive || '');
  const R = recentB ? b : a, r = Object.assign({}, b, a), sources = {};
  ['elo', 'streak'].forEach(function(k){ if (R[k] != null) r[k] = R[k]; });
  r.bestStreak = Math.max(a.bestStreak || 0, b.bestStreak || 0);
  r.lastActive = _syncMaxTexte(a.lastActive, b.lastActive);
  r.dailyDone = _syncMaxTexte(a.dailyDone, b.dailyDone);
  if (a.eloHistory || b.eloHistory) r.eloHistory = _syncParDate(a.eloHistory, b.eloHistory, 'elo', recentB, 365);
  if (a.history || b.history) r.history = _syncParDate(a.history, b.history, 'xp', false, 60);
  if (a.badges || b.badges) {
    r.badges = Object.assign({}, b.badges || {}, a.badges || {});
    Object.keys(b.badges || {}).forEach(function(k){ if (a.badges && a.badges[k] && String(b.badges[k]) < String(a.badges[k])) r.badges[k] = b.badges[k]; });   // obtenu le plus tot
  }
  if (a.skinsSeen || b.skinsSeen) r.skinsSeen = Object.assign({}, b.skinsSeen || {}, a.skinsSeen || {});
  if (a.defis || b.defis) r.defis = _syncFusionDefis(a.defis, b.defis);
  [['weekly', 'week'], ['dailyGame', 'day'], ['monthly', 'month']].forEach(function(p){
    if (!a[p[0]] && !b[p[0]]) return;
    const f = _syncFusionPeriode(a[p[0]], b[p[0]], p[1]);
    r[p[0]] = Object.assign({}, f.v); sources[p[0]] = f.src;
  });
  _SYNC_PROG_LOCAUX.forEach(function(k){ if (a[k] === undefined) delete r[k]; else r[k] = a[k]; });
  return { v: r, sources: sources };
}
function _syncFusionGym(a, b){
  const r = {};
  Object.keys(Object.assign({}, a || {}, b || {})).forEach(function(ex){
    const x = (a || {})[ex] || {}, y = (b || {})[ex] || {};
    r[ex] = Object.assign({}, y, x, { best: Math.max(x.best || 0, y.best || 0) });
    if (x.last == null && y.last != null) r[ex].last = y.last;
  });
  return r;
}
function _syncFusionArbre(a, b){   // structure : l'union des cles (les nombres sont poses ensuite, par les compteurs)
  if (a && typeof a === 'object' && !Array.isArray(a) && b && typeof b === 'object' && !Array.isArray(b)) {
    const r = {};
    Object.keys(Object.assign({}, b, a)).forEach(function(k){ r[k] = (k in a) ? (k in b ? _syncFusionArbre(a[k], b[k]) : a[k]) : b[k]; });
    return r;
  }
  return (a === undefined) ? b : a;
}
function _syncFusionFormation(a, b){
  a = a || {}; b = b || {};
  const r = Object.assign({}, b, a);
  if (a.seances || b.seances) { r.seances = Object.assign({}, b.seances || {}, a.seances || {}); Object.keys(b.seances || {}).forEach(function(k){ if (b.seances[k]) r.seances[k] = true; }); }
  const qa = typeof a.quizScore === 'number' ? a.quizScore : -1, qb = typeof b.quizScore === 'number' ? b.quizScore : -1;
  if (qb > qa) { r.quizScore = b.quizScore; r.quizTotal = b.quizTotal; r.quizDate = b.quizDate; }   // la meilleure evaluation
  return r;
}
function _syncFusionCarnet(a, b){
  const ea = (a && Array.isArray(a.enfants)) ? a.enfants : [], eb = (b && Array.isArray(b.enfants)) ? b.enfants : [];
  const nom = function(e){ return String(e && e.nom || '').trim().toLowerCase(); };
  const r = ea.map(function(e){ return Object.assign({}, e, { acquis: Object.assign({}, e.acquis || {}) }); });
  eb.forEach(function(e){
    const d = r.filter(function(x){ return nom(x) === nom(e); })[0];
    if (!d) { if (r.length < 4) r.push(Object.assign({}, e, { acquis: Object.assign({}, e.acquis || {}) })); return; }
    Object.keys(e.acquis || {}).forEach(function(k){ if (!d.acquis[k] || String(e.acquis[k]) < String(d.acquis[k])) d.acquis[k] = e.acquis[k]; });   // acquis le plus tot
  });
  return Object.assign({}, b || {}, a || {}, { enfants: r });
}
function _syncFusionRevision(a, b){
  const r = Object.assign({}, b || {}, a || {});
  Object.keys(b || {}).forEach(function(k){ if (a && a[k] && String((b[k] || {}).nextReview || '') > String(a[k].nextReview || '')) r[k] = b[k]; });
  return r;
}
// pose une valeur a un chemin (en creant les objets intermediaires)
function _syncPoser(o, segments, v){
  let x = o;
  for (let i = 0; i < segments.length - 1; i++) { if (!x[segments[i]] || typeof x[segments[i]] !== 'object') x[segments[i]] = {}; x = x[segments[i]]; }
  x[segments[segments.length - 1]] = v;
}
function _syncPartiesCommunes(a, b){   // parties jouees ICI (pas importees) presentes des deux cotes
  const ha = Array.isArray(a) ? a : [], hb = Array.isArray(b) ? b : [];
  const codes = new Set(ha.filter(function(e){ return e && e.mode !== 'import'; }).map(function(e){ return e.code; }));
  return hb.filter(function(e){ return e && e.mode !== 'import' && codes.has(e.code); }).length;
}

/* ─── LA FUSION : A (cet appareil), B (l'autre) -> les donnees communes ─── */
function _syncFusionner(A, B){
  // copies : la fusion ne modifie jamais les paquets recus
  const idA = A.appareil, idB = B.appareil, dA = JSON.parse(JSON.stringify(A.donnees || {})), dB = JSON.parse(JSON.stringify(B.donnees || {}));
  // 1. les compteurs : la part de chacun
  const KA = A.connu || {}, KB = B.connu || {}, totA = _syncTotaux(dA), totB = _syncTotaux(dB);
  const premiere = !Object.keys(KA).some(function(d){ return d !== idA; }) && !Object.keys(KB).some(function(d){ return d !== idB; });
  const copie = premiere && _syncPartiesCommunes(dA.abaGameHistory, dB.abaGameHistory) > 0;
  const K = {};
  [KA, KB].forEach(function(src){ Object.keys(src).forEach(function(d){ const k = K[d] || (K[d] = {}); Object.keys(src[d] || {}).forEach(function(c){ k[c] = Math.max(k[c] || 0, src[d][c] || 0); }); }); });
  const pA = _syncMaPart(totA, KA, idA), pB = _syncMaPart(totB, KB, idB);
  K[idA] = K[idA] || {}; K[idB] = K[idB] || {};
  Object.keys(pA).forEach(function(c){ K[idA][c] = Math.max(K[idA][c] || 0, pA[c]); });
  Object.keys(pB).forEach(function(c){ K[idB][c] = Math.max(K[idB][c] || 0, pB[c]); });
  const chemins = new Set(Object.keys(totA).concat(Object.keys(totB)));
  Object.keys(K).forEach(function(d){ Object.keys(K[d]).forEach(function(c){ chemins.add(c); }); });
  const somme = function(c, sauf){ let s = 0; Object.keys(K).forEach(function(d){ if (d !== sauf) s += (K[d][c] || 0); }); return s; };
  const total = {};
  chemins.forEach(function(c){
    if (copie) { total[c] = Math.max(totA[c] || 0, totB[c] || 0); K[idB][c] = Math.max(0, total[c] - somme(c, idB)); }
    else total[c] = somme(c);
  });
  // 2. les suppressions de parties : pour chaque partie, la marque la plus recente (supprimee, ou revenue par un import)
  const sup = {};
  [B.supprimees || {}, A.supprimees || {}].forEach(function(src){ Object.keys(src).forEach(function(c){
    // v2.82 : a date egale, la partie revient (x = 0) -- ne jamais perdre une partie sur une egalite
    const m = _syncMarque(src[c]); if (!sup[c] || String(m.d) > String(sup[c].d) || (String(m.d) === String(sup[c].d) && m.x < sup[c].x)) sup[c] = m;
  }); });
  const supprimees = {};
  Object.keys(sup).sort(function(x, y){ return String(sup[y].d).localeCompare(String(sup[x].d)); }).slice(0, _SYNC_SUPPRIMEES_GARDE).forEach(function(c){ supprimees[c] = sup[c]; });
  // 3. les donnees, cle par cle
  const donnees = {};
  let sourcesProg = {};
  Object.keys(SYNC_CLES).forEach(function(cle){
    const a = dA[cle], b = dB[cle], type = SYNC_CLES[cle];
    if (a === undefined && b === undefined) return;
    let v;
    if (type === 'historique') v = _syncFusionHistorique(a, b, supprimees);
    else if (type === 'progression') { const f = _syncFusionProgression(a, b); v = f.v; sourcesProg = f.sources; }
    else if (type === 'nombre') v = 0;
    else if (type === 'ensemble') v = _syncUnion(a, b);
    else if (type === 'revision') v = _syncFusionRevision(a, b);
    else if (type === 'gym') v = _syncFusionGym(a, b);
    else if (type === 'arbre') v = _syncFusionArbre(a, b);
    else if (type === 'formation') v = _syncFusionFormation(a, b);
    else if (type === 'palmares') v = _syncUnionPar(a, b, function(e){ return e && e.id; }, 24);
    else if (type === 'carnet') v = _syncFusionCarnet(a, b);
    else if (type === 'liste') v = _syncUnionPar(a, b, function(e){ return (e && e.id) || JSON.stringify(e); });
    else if (type === 'texte') v = (a != null && String(a).trim()) ? a : b;
    else v = (a === undefined) ? b : a;
    donnees[cle] = v;
  });
  // 4. les compteurs, poses a leur total
  chemins.forEach(function(c){
    const seg = c.split(_SYNC_SEP), cle = seg[0];
    if (!(cle in donnees)) return;
    if (SYNC_CLES[cle] === 'nombre') donnees[cle] = total[c];
    else _syncPoser(donnees[cle], seg.slice(1), total[c]);
  });
  // 5. la progression : niveau tire de l'XP ; defis de periode sans compter ce qui vient de l'autre appareil
  const P = donnees.abalone_progress;
  if (P) {
    if (typeof levelFromXp === 'function' && typeof P.xp === 'number') P.level = levelFromXp(P.xp);
    Object.keys(sourcesProg).forEach(function(k){
      const src = sourcesProg[k] === 'a' ? (dA.abalone_progress || {}) : (dB.abalone_progress || {}), per = P[k];
      if (!per) return;
      Object.keys(_SYNC_DEBUTS).forEach(function(s){
        const champ = _SYNC_DEBUTS[s];
        if (typeof per[s] === 'number' && typeof P[champ] === 'number') per[s] += P[champ] - (src[champ] || 0);
      });
    });
  }
  return { format: SYNC_FORMAT, donnees: donnees, connu: K, supprimees: supprimees, entre: [idA, idB], copie: copie };
}

/* ─── Appliquer la fusion sur un appareil ─── */
function _syncResume(d){
  const p = d.abalone_progress || {};
  return { parties: (d.abaGameHistory || []).length, xp: Math.round(p.xp || 0), jouees: p.gamesPlayed || 0,
           problemes: Math.max(d.abaPuzzleSolved || 0, p.puzzlesSolved || 0) };
}
function _syncAppliquer(st, fusion, autre){
  st = st || _syncStock();
  const local = _syncLireDonnees(st), avant = _syncResume(local);
  Object.keys(fusion.donnees).forEach(function(cle){
    let v = fusion.donnees[cle];
    const type = SYNC_CLES[cle];
    if (!type) return;                                   // jamais une cle hors de la liste
    // la fusion a ete calculee sur l'autre appareil : ce qui est propre a CELUI-CI y reste
    if (type === 'progression' && v && typeof v === 'object') {
      v = Object.assign({}, v);
      const p = local.abalone_progress || {};
      _SYNC_PROG_LOCAUX.forEach(function(k){ if (p[k] === undefined) delete v[k]; else v[k] = p[k]; });
    }
    if (type === 'texte' && local[cle] != null && String(local[cle]).trim()) v = local[cle];
    st.ecrire(cle, (type === 'texte') ? String(v) : (type === 'nombre') ? String(Math.round(v)) : JSON.stringify(v));
  });
  st.ecrire(SYNC_COMPTEURS_CLE, JSON.stringify(fusion.connu || {}));
  st.ecrire(SYNC_SUPPRIMEES_CLE, JSON.stringify(fusion.supprimees || {}));
  st.ecrire(SYNC_DERNIERE_CLE, JSON.stringify({ date: new Date().toISOString(), avec: autre || null }));
  return { avant: avant, apres: _syncResume(_syncLireDonnees(st)) };
}
// Les marques de suppression : { d: date, x: 1 } supprimee, { d: date, x: 0 } revenue (importee a nouveau)
function _syncMarque(m){ return (m && typeof m === 'object') ? { d: String(m.d || ''), x: m.x ? 1 : 0 } : { d: String(m || ''), x: 1 }; }
function _syncEstSupprimee(m){ return !!m && _syncMarque(m).x === 1; }
function _syncMarquer(codes, x, st){
  st = st || _syncStock();
  const s = _syncJson(st, SYNC_SUPPRIMEES_CLE, {}) || {}, t = new Date().toISOString();
  /* v2.82 : une marque posee ici est toujours plus recente que la precedente pour la meme partie, meme dans la
     meme milliseconde. Sinon « supprimee » puis « revenue » portaient la meme date, et a la synchro la
     suppression de l'autre appareil pouvait l'emporter : la partie reimportee disparaissait. Trouve par les
     annotations de la CI (v2.78) : c'etait l'echec intermittent des tests (v2.73, v2.76, v2.77, v2.81). */
  (codes || []).forEach(function(c){
    if (!c) return;
    const avant = s[c] ? _syncMarque(s[c]).d : '', ms = Date.parse(avant);
    s[c] = { d: (avant && avant >= t && isFinite(ms)) ? new Date(ms + 1).toISOString() : t, x: x };
  });
  const cles = Object.keys(s).sort(function(p, q){ return String(_syncMarque(s[q]).d).localeCompare(String(_syncMarque(s[p]).d)); });
  cles.slice(_SYNC_SUPPRIMEES_GARDE).forEach(function(c){ delete s[c]; });
  try { st.ecrire(SYNC_SUPPRIMEES_CLE, JSON.stringify(s)); } catch (e) {}
}
// Une partie supprimee ici l'est aussi sur l'autre appareil a la prochaine synchro
function _syncNoterSuppression(codes, st){ _syncMarquer(codes, 1, st); }
// Une partie importee (a nouveau, volontairement) : elle revient, meme si un autre appareil l'avait supprimee avant
function _syncOublierSuppression(code, st){ _syncMarquer([code], 0, st); }

/* ═══ TRANSPORT 1 : EN DIRECT (WebRTC, codes echanges a la main) ═══
   Meme mecanique que la Partie en direct (_rtcCompress, serveur STUN public),
   avec sa propre connexion pour ne jamais la croiser. Protocole : l'appareil
   qui a cree le code (« hote ») recoit le paquet de l'autre, fusionne, envoie
   la fusion ; l'autre l'applique et repond « ok » ; l'hote l'applique a son
   tour. Les deux finissent avec les memes donnees. Messages de plus de
   16 000 caracteres decoupes en morceaux. */
let _syncPeer = null, _syncCanal = null, _syncRole = null, _syncMorceaux = null, _syncFusionEnAttente = null;
const _SYNC_MORCEAU = 16000;
function _syncDecouper(obj){
  const t = JSON.stringify(obj), n = Math.max(1, Math.ceil(t.length / _SYNC_MORCEAU)), out = [];
  for (let i = 0; i < n; i++) out.push(JSON.stringify({ m: i, n: n, d: t.slice(i * _SYNC_MORCEAU, (i + 1) * _SYNC_MORCEAU) }));
  return out;
}
function _syncRecoller(etat, brut){   // renvoie l'objet complet quand le dernier morceau arrive, sinon null
  const p = JSON.parse(brut);
  if (!etat.parts || p.m === 0) { etat.parts = []; etat.n = p.n; }
  etat.parts[p.m] = p.d;
  if (etat.parts.filter(function(x){ return x !== undefined; }).length < etat.n) return null;
  const t = etat.parts.join(''); etat.parts = null;
  return JSON.parse(t);
}
function _syncEnvoyer(obj){ if (_syncCanal && _syncCanal.readyState === 'open') _syncDecouper(obj).forEach(function(m){ _syncCanal.send(m); }); }
function _syncFermer(){
  try { if (_syncCanal) _syncCanal.close(); } catch (e) {}
  try { if (_syncPeer) _syncPeer.close(); } catch (e) {}
  _syncPeer = null; _syncCanal = null; _syncRole = null; _syncMorceaux = null; _syncFusionEnAttente = null;
}
function _syncBrancherCanal(ch){
  _syncCanal = ch; _syncMorceaux = {};
  ch.onopen = function(){
    _syncEtat(_tr('🟢 Connectés — échange des données…', '🟢 Connected — exchanging data…'));
    if (_syncRole === 'invite') _syncEnvoyer({ t: 'paquet', paquet: _syncPaquet() });
  };
  ch.onmessage = function(e){
    let msg; try { msg = _syncRecoller(_syncMorceaux, e.data); } catch (err) { _syncEtat(_tr('⚠️ Message illisible : synchro interrompue.', '⚠️ Unreadable message: sync stopped.'), true); return; }
    if (msg) _syncRecevoir(msg);
  };
  ch.onerror = function(){ if (_syncPeer) _syncEtat(_tr('⚠️ La connexion a été coupée.', '⚠️ The connection was cut.'), true); };
}
function _syncRecevoir(msg){
  if (msg.t === 'paquet' && _syncRole === 'hote') {
    const local = _syncPaquet();
    if (!msg.paquet || msg.paquet.format !== SYNC_FORMAT) { _syncEtat(_tr('⚠️ L’autre appareil n’a pas la même version du site : recharge-le.', '⚠️ The other device has a different version of the site: reload it.'), true); return; }
    if (msg.paquet.appareil === local.appareil) { _syncEtat(_tr('⚠️ C’est le même navigateur des deux côtés.', '⚠️ It is the same browser on both sides.'), true); return; }
    _syncFusionEnAttente = { fusion: _syncFusionner(local, msg.paquet), autre: msg.paquet.appareil };
    _syncEnvoyer({ t: 'fusion', fusion: _syncFusionEnAttente.fusion, autre: local.appareil });
  } else if (msg.t === 'fusion' && _syncRole === 'invite') {
    const bilan = _syncAppliquer(_syncStock(), msg.fusion, msg.autre);
    _syncEnvoyer({ t: 'ok' });
    _syncTermine(bilan);
  } else if (msg.t === 'ok' && _syncRole === 'hote' && _syncFusionEnAttente) {
    const bilan = _syncAppliquer(_syncStock(), _syncFusionEnAttente.fusion, _syncFusionEnAttente.autre);
    _syncTermine(bilan);
  }
}
async function syncCreerCode(){
  _syncFermer();
  _syncRole = 'hote';
  _syncPeer = new RTCPeerConnection({ iceServers: RTC_STUN_SERVERS });
  _syncBrancherCanal(_syncPeer.createDataChannel('abasync', { ordered: true }));
  await _syncPeer.setLocalDescription(await _syncPeer.createOffer());
  await _rtcWaitIceGathering(_syncPeer);
  return 'ABASYNC1:' + await _rtcCompress(JSON.stringify(_syncPeer.localDescription));
}
async function syncRepondre(code){
  const m = /ABASYNC1:([A-Za-z0-9+/=]+)/.exec(String(code || '').replace(/\s+/g, ''));
  if (!m) throw new Error(_tr('Ce n’est pas un code de synchro.', 'This is not a sync code.'));
  _syncFermer();
  _syncRole = 'invite';
  _syncPeer = new RTCPeerConnection({ iceServers: RTC_STUN_SERVERS });
  _syncPeer.ondatachannel = function(e){ _syncBrancherCanal(e.channel); };
  await _syncPeer.setRemoteDescription(JSON.parse(await _rtcDecompress(m[1])));
  await _syncPeer.setLocalDescription(await _syncPeer.createAnswer());
  await _rtcWaitIceGathering(_syncPeer);
  return 'ABASYNC1R:' + await _rtcCompress(JSON.stringify(_syncPeer.localDescription));
}
async function syncConnecter(code){
  const m = /ABASYNC1R:([A-Za-z0-9+/=]+)/.exec(String(code || '').replace(/\s+/g, ''));
  if (!m) throw new Error(_tr('Ce n’est pas un code réponse.', 'This is not a reply code.'));
  if (!_syncPeer || _syncRole !== 'hote') throw new Error(_tr('Crée d’abord un code sur cet appareil.', 'Create a code on this device first.'));
  await _syncPeer.setRemoteDescription(JSON.parse(await _rtcDecompress(m[1])));
}

/* ═══ TRANSPORT 2 : PAR FICHIER ═══ */
function syncExporterFichier(){
  const p = _syncPaquet(), b = new Blob([JSON.stringify(p)], { type: 'application/json' });
  const u = URL.createObjectURL(b), a = document.createElement('a'), jour = (typeof todayStr === 'function') ? todayStr() : p.date.slice(0, 10);
  a.href = u; a.download = 'abalassembly-synchro-' + jour + '.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(u); }, 1000);
  _syncEtat(_tr('📤 Fichier créé. Ouvre-le sur l’autre appareil avec « Fusionner un fichier de synchro ».', '📤 File created. Open it on the other device with “Merge a sync file”.'));
}
function syncFusionnerTexte(texte){
  let p;
  try { p = JSON.parse(texte); } catch (e) { throw new Error(_tr('Fichier illisible.', 'Unreadable file.')); }
  if (!p || p.format !== SYNC_FORMAT || !p.donnees) throw new Error(_tr('Ce n’est pas un fichier de synchro d’Abalassembly.', 'This is not an Abalassembly sync file.'));
  const st = _syncStock(), local = _syncPaquet(st);
  if (p.appareil === local.appareil) throw new Error(_tr('C’est le fichier de cet appareil-ci : ouvre-le sur l’autre.', 'This is this device’s own file: open it on the other one.'));
  return _syncAppliquer(st, _syncFusionner(local, p), p.appareil);
}
function syncChoisirFichier(){
  const input = document.createElement('input');
  input.type = 'file'; input.accept = 'application/json,.json';
  input.onchange = function(){
    const f = input.files && input.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = function(){ try { _syncTermine(syncFusionnerTexte(r.result)); } catch (e) { _syncEtat('⚠️ ' + e.message, true); } };
    r.readAsText(f);
  };
  input.click();
}

/* ═══ LA FENETRE ═══ */
function _syncEtat(t, erreur){
  const el = document.getElementById('sync-etat');
  if (el) { el.textContent = t; el.style.color = erreur ? '#e05c4b' : 'var(--gold)'; }
}
function _syncTermine(bilan){
  _syncFermer();
  const nb = function(x){ return (typeof _dimNb === 'function') ? _dimNb(x) : String(x); };
  const dp = (typeof _dimDp === 'function') ? _dimDp() : ' : ';   // « : » precede d'une espace en francais seulement
  const ligne = function(nom, a, b){ return '<li>' + nom + dp + nb(a) + (a !== b ? ' → <b>' + nb(b) + '</b>' : ' ' + _tr('(inchangé)', '(unchanged)')) + '</li>'; };
  const el = document.getElementById('sync-bilan');
  if (el) el.innerHTML = '<div class="sync-ok">' + _tr('✅ Synchronisé. Sur cet appareil :', '✅ Synced. On this device:') + '</div><ul class="sync-liste">'
    + ligne(_tr('Parties dans l’historique', 'Games in the history'), bilan.avant.parties, bilan.apres.parties)
    + ligne(_tr('XP', 'XP'), bilan.avant.xp, bilan.apres.xp)
    + ligne(_tr('Parties jouées', 'Games played'), bilan.avant.jouees, bilan.apres.jouees)
    + ligne(_tr('Problèmes résolus', 'Puzzles solved'), bilan.avant.problemes, bilan.apres.problemes) + '</ul>'
    + '<div class="sync-note">' + _tr('La page se recharge pour tout afficher…', 'The page reloads to show everything…') + '</div>';
  _syncEtat(_tr('✅ Terminé', '✅ Done'));
  // en memoire, la progression d'avant ne doit plus jamais etre sauvegardee par-dessus
  try { if (typeof loadProgress === 'function') progress = loadProgress(); } catch (e) {}
  setTimeout(function(){ try { location.reload(); } catch (e) {} }, 3500);
}
function _syncDerniereTexte(){
  const d = _syncJson(_syncStock(), SYNC_DERNIERE_CLE, null);
  if (!d || !d.date) return _tr('Jamais synchronisé depuis cet appareil.', 'Never synced from this device.');
  const t = new Date(d.date);
  return _tr('Dernière synchro : ', 'Last sync: ') + t.toLocaleDateString(currentLang() === 'EN' ? 'en-GB' : 'fr-FR') + ' ' + t.toLocaleTimeString(currentLang() === 'EN' ? 'en-GB' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function _syncBoutonsCode(id){
  return '<div class="sync-rang"><button class="ctrl-btn sync-petit" onclick="_syncCopier(\'' + id + '\')">' + _tr('📋 Copier', '📋 Copy') + '</button>'
    + ((navigator && navigator.share) ? '<button class="ctrl-btn sync-petit" onclick="_syncPartager(\'' + id + '\')">' + _tr('📤 Partager', '📤 Share') + '</button>' : '') + '</div>';
}
function _syncCopier(id){
  const ta = document.getElementById(id); if (!ta) return;
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(function(){ showToast(_tr('Code copié', 'Code copied')); }).catch(function(){ ta.select(); });
  else ta.select();
}
function _syncPartager(id){
  const ta = document.getElementById(id); if (!ta || !navigator.share) return;
  navigator.share({ title: 'Abalassembly', text: ta.value }).catch(function(){});
}
async function _syncUiCreer(){
  const corps = document.getElementById('sync-direct');
  corps.innerHTML = '<div class="sync-note">' + _tr('Préparation du code…', 'Preparing the code…') + '</div>';
  let code;
  try { code = await syncCreerCode(); } catch (e) { corps.innerHTML = ''; _syncEtat(_tr('⚠️ Impossible de préparer la connexion sur ce navigateur : passe par le fichier ci-dessous.', '⚠️ Cannot prepare the connection in this browser: use the file below.'), true); return; }
  corps.innerHTML = '<div class="sync-etape">' + _tr('1. Envoie ce code à l’autre appareil (copie-le ou partage-le), puis ouvre-y « Synchroniser mes appareils » → « J’ai reçu un code ».', '1. Send this code to the other device (copy or share it), then open “Sync my devices” there → “I received a code”.') + '</div>'
    + '<textarea id="sync-code-hote" class="sync-code" readonly>' + code + '</textarea>' + _syncBoutonsCode('sync-code-hote')
    + '<div class="sync-etape">' + _tr('2. Colle ici le code réponse qu’il te donne :', '2. Paste here the reply code it gives you:') + '</div>'
    + '<textarea id="sync-code-reponse" class="sync-code" placeholder="ABASYNC1R:…"></textarea>'
    + '<button class="ctrl-btn" onclick="_syncUiConnecter()">' + _tr('Connecter et synchroniser', 'Connect and sync') + '</button>';
  _syncEtat(_tr('⚪ En attente du code réponse', '⚪ Waiting for the reply code'));
}
function _syncUiRecu(){
  document.getElementById('sync-direct').innerHTML = '<div class="sync-etape">' + _tr('Colle le code reçu de l’autre appareil :', 'Paste the code received from the other device:') + '</div>'
    + '<textarea id="sync-code-recu" class="sync-code" placeholder="ABASYNC1:…"></textarea>'
    + '<button class="ctrl-btn" onclick="_syncUiRepondre()">' + _tr('Créer le code réponse', 'Create the reply code') + '</button>';
}
async function _syncUiRepondre(){
  const ta = document.getElementById('sync-code-recu'), corps = document.getElementById('sync-direct');
  let rep;
  try { rep = await syncRepondre(ta ? ta.value : ''); } catch (e) { _syncEtat('⚠️ ' + e.message, true); return; }
  corps.innerHTML = '<div class="sync-etape">' + _tr('Renvoie ce code réponse au premier appareil et colle-le là-bas. La synchro démarre toute seule.', 'Send this reply code back to the first device and paste it there. The sync starts by itself.') + '</div>'
    + '<textarea id="sync-code-mien" class="sync-code" readonly>' + rep + '</textarea>' + _syncBoutonsCode('sync-code-mien');
  _syncEtat(_tr('⚪ En attente de l’autre appareil…', '⚪ Waiting for the other device…'));
}
async function _syncUiConnecter(){
  const ta = document.getElementById('sync-code-reponse');
  try { await syncConnecter(ta ? ta.value : ''); _syncEtat(_tr('⏳ Connexion…', '⏳ Connecting…')); }
  catch (e) { _syncEtat('⚠️ ' + e.message, true); return; }
  setTimeout(function(){ if (_syncPeer && (!_syncCanal || _syncCanal.readyState !== 'open')) _syncEtat(_tr('⚠️ Pas de connexion après 20 s : les deux appareils sont peut-être sur des réseaux qui la bloquent. Passe par le fichier ci-dessous.', '⚠️ No connection after 20 s: the two devices may be on networks that block it. Use the file below.'), true); }, 20000);
}
function closeSyncModal(){ _syncFermer(); const m = document.getElementById('sync-modal'); if (m) m.remove(); }
function openSyncModal(){
  let modal = document.getElementById('sync-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'sync-modal';
  modal.className = 'sync-fond';
  modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-labelledby', 'sync-titre');
  modal.innerHTML = '<div class="sync-boite">'
    + '<h3 id="sync-titre" class="sync-titre">' + _tr('🔄 Synchroniser mes appareils', '🔄 Sync my devices') + '</h3>'
    + '<p class="sync-note">' + _tr('Fusionne les données de jeu de deux appareils, ou de deux navigateurs : rien n’est écrasé, rien n’est compté deux fois. Aucun compte, aucun serveur.', 'Merges the game data of two devices, or two browsers: nothing is overwritten, nothing is counted twice. No account, no server.') + '</p>'
    + '<details class="sync-quoi"><summary>' + _tr('Ce qui est synchronisé', 'What is synced') + '</summary><p>'
    + _tr('<b>Voyagent</b> : historique des parties (une partie supprimée l’est aussi sur l’autre appareil), progression (XP, niveau, ELO, badges, séries), statistiques, cartes de chaleur, problèmes et défis du jour, Gym Cerveau, Formation Formateurs, carnet du plateau, ton pseudo. <b>Restent sur chaque appareil</b> : réglages d’affichage et de son, compte local, Labo IA, partie en cours.',
          '<b>Synced</b>: game history (a game deleted on one device is deleted on the other), progress (XP, level, ELO, badges, streaks), statistics, heat maps, puzzles and daily puzzles, Brain Gym, Trainer course, real-board notebook, your username. <b>Stay on each device</b>: display and sound settings, local account, AI Lab, game in progress.') + '</p></details>'
    + '<p class="sync-note">' + _syncDerniereTexte() + '</p>'
    + '<div id="sync-etat" class="sync-etat" role="status" aria-live="polite"></div>'
    + '<div id="sync-bilan"></div>'
    + '<h4 class="sync-sous">' + _tr('En direct — les deux appareils ouverts', 'Live — both devices open') + '</h4>'
    + '<div class="sync-rang"><button class="ctrl-btn" onclick="_syncUiCreer()">' + _tr('Créer un code', 'Create a code') + '</button>'
    + '<button class="ctrl-btn" onclick="_syncUiRecu()">' + _tr('J’ai reçu un code', 'I received a code') + '</button></div>'
    + '<div id="sync-direct"></div>'
    + '<h4 class="sync-sous">' + _tr('Par fichier', 'With a file') + '</h4>'
    + '<p class="sync-note">' + _tr('Si la connexion directe ne passe pas. Crée le fichier ici, ouvre-le sur l’autre appareil avec « Fusionner ». Pour que les deux soient identiques, fais-le dans les deux sens.', 'If the direct connection does not work. Create the file here and open it on the other device with “Merge”. For both to end up identical, do it both ways.') + '</p>'
    + '<div class="sync-rang"><button class="ctrl-btn" onclick="syncExporterFichier()">' + _tr('📤 Créer mon fichier de synchro', '📤 Create my sync file') + '</button>'
    + '<button class="ctrl-btn" onclick="syncChoisirFichier()">' + _tr('📥 Fusionner un fichier de synchro', '📥 Merge a sync file') + '</button></div>'
    + '<div class="sync-rang sync-fin"><button class="ctrl-btn sync-petit" onclick="closeSyncModal()">' + _tr('Fermer', 'Close') + '</button></div>'
    + '</div>';
  modal.addEventListener('click', function(e){ if (e.target === modal) closeSyncModal(); });
  modal.addEventListener('keydown', function(e){ if (e.key === 'Escape') closeSyncModal(); });
  document.body.appendChild(modal);
  const t = modal.querySelector('button'); if (t) try { t.focus(); } catch (e) {}
}
