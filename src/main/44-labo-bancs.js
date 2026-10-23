/* ═══════════════════════════════════════════
   LABO : LES BANCS D'ESSAI (v2.70)
   Demande d'Olivier : « les 6 ». Trois des outils sont des series de duels :
     - le tournoi entre les styles (Equilibre, Agressif, Defensif, Division, KAAH…) ;
     - la mesure des niveaux 1 a 10 (chaque niveau contre le suivant) ;
     - le test des ouvertures de la Marguerite belge ;
   et « Contre toi » (45-labo-humains.js) en est un quatrieme.
   Un banc = des matchs entre deux facons de jouer (poids + niveau), joues sur
   les fils de calcul du Labo, plusieurs parties a la fois. Comme le Labo :
     - par PAIRES : la meme position deux fois, couleurs inversees (sauf les
       ouvertures : une ligne n'a pas de « couleurs inversees ») ;
     - depuis de vraies positions du corpus (42-labo-positions.js) ;
     - arbitrage 2 : une bille d'avance a la limite de coups ne suffit pas.
   L'etat est garde (reprise apres rechargement, bouton Reprendre). Un seul banc a
   la fois, jamais en meme temps que le Labo ou le test des criteres de KAAH : ils
   partagent les memes fils de calcul.
═══════════════════════════════════════════ */
const BANCS = {};          // nom -> { cle, construire(options) -> plan, rendu(etat, msg) }
let _bancActif = null, _bancEnVol = {}, _bancDebits = [];
let _bancPlanifier = function(f, ms){ return setTimeout(f, ms); };   // remplacable par les tests

function bancEtat(nom){ const D = BANCS[nom]; if (!D) return null; try { const s = JSON.parse(localStorage.getItem(D.cle) || 'null'); if (s && s.v === 1 && s.plan) return s; } catch (e) {} return null; }
function _bancSauver(nom, s){ try { localStorage.setItem(BANCS[nom].cle, JSON.stringify(s)); } catch (e) {} }
function _bancRendre(nom, msg){ const D = BANCS[nom]; if (D && typeof D.rendu === 'function') D.rendu(bancEtat(nom), msg); }
function _bancOccupe(){
  if (typeof _labRunning !== 'undefined' && _labRunning) return 'Le Labo (auto-amélioration) tourne : mets-le en pause d’abord';
  if (typeof _testKaahEnCours !== 'undefined' && _testKaahEnCours) return 'Le test des critères de KAAH tourne : mets-le en pause d’abord';
  return '';
}
// resultats d'un match : paires (penta) ou parties seules (ouvertures)
function _bancResVide(m){ return m.solo ? { W: 0, D: 0, L: 0, faits: {} } : { penta: _labPentaVide(), half: {}, fait: {} }; }
function _bancN(m, r){ return m.solo ? (r.W + r.D + r.L) : _labPentaN(r.penta); }
function _bancTotal(m){ return m.solo ? m.departs.length : m.paires; }
function _bancMatchFini(m, r){ return _bancN(m, r) >= _bancTotal(m); }
function _bancFini(s){ return s.plan.matchs.every(function(m){ return _bancMatchFini(m, s.res[m.id]); }); }
// points de A et nombre de parties (pour les pourcentages)
function _bancPoints(m, r){ return m.solo ? { pts: r.W + r.D / 2, n: r.W + r.D + r.L } : { pts: _labPoints(r.penta), n: 2 * _labPentaN(r.penta) }; }

// cree un nouveau banc (le plan est fige : la reprise rejoue exactement les memes matchs)
function bancNouveau(nom, options){
  const D = BANCS[nom]; if (!D) return null;
  if (_bancActif === nom) bancPause();
  const plan = D.construire(options || {});
  if (!plan || !plan.matchs || !plan.matchs.length) return null;
  const s = { v: 1, cree: Date.now(), plan: plan, res: {}, parties: 0, journal: [], fini: null };
  plan.matchs.forEach(function(m){ s.res[m.id] = _bancResVide(m); });
  _bancSauver(nom, s);
  return s;
}
function bancLancer(nom, options){
  if (_bancActif === nom) { bancPause(); return; }
  const occ = _bancOccupe(); if (occ) { showToast(occ); return; }
  if (_bancActif) { showToast('Un autre banc d’essai tourne : mets-le en pause d’abord'); return; }
  let s = bancEtat(nom);
  if (!s || s.fini || options) s = bancNouveau(nom, options);
  if (!s) { _bancRendre(nom, '❌ Rien à jouer'); return; }
  if (!_labFilsAssurer(_labNbFils())) { _bancRendre(nom, '❌ Fil de calcul indisponible sur cet appareil'); return; }
  _bancActif = nom; _bancEnVol = {}; _bancDebits = [];
  try { localStorage.setItem('abaBancAuto', nom); } catch (e) {}
  _bancRendre(nom, '⏳ Chargement des positions…');
  const suite = function(){ if (_bancActif === nom) { _bancPomper(); _bancRendre(nom); } };
  if (typeof ensureLaboPositions === 'function') ensureLaboPositions().then(suite); else suite();
}
function bancPause(){
  const nom = _bancActif;
  _bancActif = null; _bancEnVol = {}; _labFilsArreter();
  try { localStorage.removeItem('abaBancAuto'); } catch (e) {}
  if (nom) _bancRendre(nom, '⏸ En pause');
}
function bancEffacer(nom){
  if (_bancActif === nom) bancPause();
  try { localStorage.removeItem(BANCS[nom].cle); } catch (e) {}
  _bancRendre(nom);
}
// prochaine partie : le match qui a le moins de parties passe d'abord
function _bancTacheSuivante(nom, s){
  let best = null, bestN = Infinity;
  s.plan.matchs.forEach(function(m){
    const r = s.res[m.id]; if (_bancMatchFini(m, r)) return;
    const pre = nom + '|' + m.id;
    let enVol = 0; for (const k in _bancEnVol) if (k.indexOf(pre + '|') === 0) enVol++;
    let nx = null;
    if (m.solo) { for (let p = 0; p < m.departs.length; p++) { const cle = pre + '|' + p + '|0'; if (!r.faits[p] && !_bancEnVol[cle]) { nx = { p: p, g: 0, cle: cle }; break; } } }
    else nx = _labPartieSuivante(r, m.paires, pre, _bancEnVol);
    if (!nx) return;
    const n = (m.solo ? _bancN(m, r) : 2 * _labPentaN(r.penta) + _labDemi(r)) + enVol;
    if (n < bestN) { bestN = n; best = { m: m, nx: nx }; }
  });
  if (!best) return null;
  const m = best.m, nx = best.nx, R = s.plan.regime;
  const seed = _lpHache((s.cree % 1000003) * 7919 + _bancHacheTexte(m.id) * 131 + nx.p);
  const t = { cle: nx.cle, banc: nom, cree: s.cree, id: m.id, p: nx.p, g: nx.g, wA: m.a.w, wB: m.b.w, cfgA: m.a.cfg || null, cfgB: m.b.cfg || null,
    ms: R.ms, plies: R.plies, draw: R.draw, arbitrage: 2, nom: m.a.nom + ' contre ' + m.b.nom };
  if (m.solo) { t.depart = m.departs[nx.p]; t.colorA = m.couleurA; t.seed = nx.p + 1; }
  else { t.colorA = nx.g === 0 ? 'black' : 'white'; t.seed = seed; t.depart = _labDepart(s.plan.depart || 'belgian', seed); }
  return t;
}
function _bancHacheTexte(x){ let h = 0; x = String(x); for (let i = 0; i < x.length; i++) h = (Math.imul(h, 31) + x.charCodeAt(i)) | 0; return h >>> 0; }
function _bancPomper(){
  const nom = _bancActif; if (!nom) return;
  const s = bancEtat(nom); if (!s) { bancPause(); return; }
  _labFilsAssurer(_labNbFils());
  for (let i = 0; i < _labFils.length; i++) {
    const f = _labFils[i]; if (f.tache) continue;
    const t = _bancTacheSuivante(nom, s); if (!t) break;
    _bancEnVol[t.cle] = 1; _labFilLancer(f, t, _bancFin);
  }
  if (!_labFilsEnCours() && _bancFini(s)) {
    s.fini = Date.now(); _bancSauver(nom, s);
    _bancActif = null; _labFilsArreter();
    try { localStorage.removeItem('abaBancAuto'); } catch (e) {}
    _bancRendre(nom, '✅ Terminé');
    if (BANCS[nom].termine) BANCS[nom].termine(s);
  }
}
function _bancFin(t, d){
  delete _bancEnVol[t.cle];
  if (_bancActif !== t.banc) return;
  if (d.timeout) { _bancPlanifier(_bancPomper, 300); return; }
  if (d.error) { const nom = _bancActif; bancPause(); _bancRendre(nom, '❌ Erreur moteur : ' + d.error); return; }
  const s = bancEtat(t.banc); if (!s || s.cree !== t.cree) { _bancPlanifier(_bancPomper, 50); return; }
  const m = s.plan.matchs.find(function(x){ return x.id === t.id; }), r = s.res[t.id];
  if (!m || !r) { _bancPlanifier(_bancPomper, 50); return; }
  const res = d.result || { winner: 'D' }, sc = _labScoreA(res);
  if (m.solo) { if (r.faits[t.p]) { _bancPlanifier(_bancPomper, 50); return; } r.faits[t.p] = 1; if (sc === 1) r.W++; else if (sc === 0.5) r.D++; else r.L++; }
  else _labPaireAjouter(r, t.p, t.g, sc);
  s.parties++; s.ms = (s.ms || 0) + (t.t0 ? Date.now() - t.t0 : 0);   // v2.71 : temps de calcul (tableau de bord)
  s.journal.unshift({ nom: t.nom, w: res.winner, why: res.why || '?', plies: res.plies || 0 }); if (s.journal.length > 6) s.journal.length = 6;
  _bancDebits.push(Date.now()); if (_bancDebits.length > 30) _bancDebits.shift();
  _bancSauver(t.banc, s);
  _bancRendre(t.banc);
  _bancPlanifier(_bancPomper, 50);
}
// ligne d'etat commune : parties faites, en cours, debit, temps restant estime
function _bancLigneEtat(nom, s){
  if (!s) return '';
  const total = s.plan.matchs.reduce(function(a, m){ return a + (m.solo ? m.departs.length : 2 * m.paires); }, 0);
  const faites = s.plan.matchs.reduce(function(a, m){ return a + _bancPoints(m, s.res[m.id]).n; }, 0) + s.plan.matchs.reduce(function(a, m){ return a + (m.solo ? 0 : _labDemi(s.res[m.id])); }, 0);
  let txt = faites + ' / ' + total + ' parties';
  if (_bancActif === nom) {
    const enCours = _labFilsEnCours();
    txt += ' · ' + enCours + ' en cours sur ' + _labFils.length + ' fil' + (_labFils.length > 1 ? 's' : '');
    if (_bancDebits.length >= 3) {
      const h = (_bancDebits[_bancDebits.length - 1] - _bancDebits[0]) / 3600000;
      if (h > 0) { const par = (_bancDebits.length - 1) / h, reste = (total - faites) / par; txt += ' · ≈ ' + Math.round(par) + ' parties/heure · reste ≈ ' + _labDuree(reste * 3600000); }
    }
  } else if (s.fini) txt += ' · terminé le ' + new Date(s.fini).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  return txt;
}
function _labDuree(ms){ const m = Math.round(ms / 60000); if (m < 1) return 'moins d’une minute'; if (m < 60) return m + ' min'; const h = Math.floor(m / 60); return h + ' h ' + String(m % 60).padStart(2, '0'); }
function _bancBoutons(nom, s, libNouveau, opts){
  const enCours = _bancActif === nom;
  let h = '<div class="lab-actions">';
  if (enCours) h += '<button class="ctrl-btn" onclick="bancPause()">⏸ Pause</button>';
  else if (s && !s.fini) h += '<button class="ctrl-btn" onclick="bancLancer(\'' + nom + '\')">▶ Reprendre</button>';
  if (!enCours) h += '<button class="ctrl-btn" onclick="' + (opts || ('bancLancer(\'' + nom + '\',{})')) + '">' + (s ? '↻ ' : '▶ ') + libNouveau + '</button>';
  if (s && !enCours) h += '<button class="ctrl-btn lab-discret" onclick="bancEffacer(\'' + nom + '\')">🗑 Effacer</button>';
  return h + '</div>';
}
function _bancJournal(s){
  if (!s || !s.journal || !s.journal.length) return '';
  const why = { '6capt': '6 billes', 'adj3': '3 billes d’écart', 'adjCap': 'billes d’avance', 'adjCap1': 'une bille d’avance, mieux placé', 'adjEval': 'évaluations d’accord', 'draw': 'nulle', 'draw1': 'nulle (une bille d’avance, pas mieux placé)', 'noMove': 'bloqué' };
  return '<div class="lab-journal">' + s.journal.map(function(j){ return '<div>' + (j.w === 'A' ? '🟢' : (j.w === 'D' ? '⚪' : '🔴')) + ' ' + j.nom + ' · ' + (why[j.why] || j.why) + ', ' + j.plies + ' demi-coups</div>'; }).join('') + '</div>';
}
/* v2.71, les reglages de chaque banc (demande d'Olivier : « plus de parametres ») : temps de
   reflexion par coup, nombre de demi-coups avant l'arbitrage, positions de depart. Gardes par
   banc ; ils s'appliquent a la serie suivante (une serie commencee garde les siens). */
const BANC_TEMPS = [300, 600, 1000, 2000], BANC_PLIES = [60, 80, 120, 160];
const BANC_DEPARTS = { belgian: 'Marguerite belge', corpus: 'toutes les dispositions', hasard: 'Standard + 6 coups au hasard' };
function _bancReglagesLus(nom){
  let t = {}; try { t = (JSON.parse(localStorage.getItem('abaBancReglages') || '{}') || {})[nom] || {}; } catch (e) {}
  const R = _labRegime('confirm');
  return { ms: BANC_TEMPS.indexOf(t.ms) >= 0 ? t.ms : R.ms, plies: BANC_PLIES.indexOf(t.plies) >= 0 ? t.plies : R.plies, depart: BANC_DEPARTS[t.depart] ? t.depart : (LAB_CFG.depart || 'belgian') };
}
function bancReglageSet(nom, k, v){
  let t = {}; try { t = JSON.parse(localStorage.getItem('abaBancReglages') || '{}') || {}; } catch (e) {}
  t[nom] = t[nom] || {}; t[nom][k] = (k === 'depart') ? v : +v;
  try { localStorage.setItem('abaBancReglages', JSON.stringify(t)); } catch (e) {}
}
function _bancReglages(nom, sans){
  sans = sans || {}; const r = _bancReglagesLus(nom);
  const sel = function(k, L, lib){ return '<select onchange="bancReglageSet(\'' + nom + '\',\'' + k + '\',this.value)">' + L.map(function(v){ return '<option value="' + v + '"' + (String(r[k]) === String(v) ? ' selected' : '') + '>' + lib(v) + '</option>'; }).join('') + '</select>'; };
  let h = '<div class="gr-filtres">';
  if (!sans.ms) h += '<label>Temps par coup ' + sel('ms', BANC_TEMPS, function(v){ return grNb(v / 1000, v < 1000 ? 1 : 0) + ' s'; }) + '</label>';
  if (!sans.plies) h += '<label>Demi-coups avant arbitrage ' + sel('plies', BANC_PLIES, function(v){ return v; }) + '</label>';
  if (!sans.depart) h += '<label>Départ ' + sel('depart', Object.keys(BANC_DEPARTS), function(v){ return BANC_DEPARTS[v]; }) + '</label>';
  return h + '</div>';
}
function _bancRegimeDe(o, nom){ const r = _bancReglagesLus(nom), R = _labRegime('confirm'); return { ms: o.ms || r.ms, plies: o.plies || r.plies, draw: R.draw }; }
function _bancLigneReglages(s){ const R = s.plan.regime || {}; return 'Cette série : ' + (R.ms ? grNb(R.ms / 1000, R.ms < 1000 ? 1 : 0) + ' s par coup · ' : '') + (R.plies ? R.plies + ' demi-coups avant arbitrage' : '') + (s.plan.depart ? ' · départ : ' + (BANC_DEPARTS[s.plan.depart] || s.plan.depart) : ''); }
// marge a 95 % de chaque Elo d'un tournoi (information de Fisher du modele de Bradley-Terry ; approximative)
function _bancEloMarges(noms, matchs, res, elo){
  const n = noms.length, I = new Array(n).fill(0);
  matchs.forEach(function(m){
    const i = noms.indexOf(m.a.nom), j = noms.indexOf(m.b.nom); if (i < 0 || j < 0) return;
    const N = _bancPoints(m, res[m.id]).n; if (!N) return;
    const p = 1 / (1 + Math.pow(10, (elo[j] - elo[i]) / 400)), q = N * p * (1 - p);
    I[i] += q; I[j] += q;
  });
  return I.map(function(x){ return x > 0 ? Math.round(1.96 * 400 / Math.LN10 / Math.sqrt(x)) : null; });
}
// Elo des participants d'un tournoi (Bradley-Terry, demi-points pour les nulles), le premier a 0
function _bancElo(noms, matchs, res){
  const n = noms.length, pts = new Array(n).fill(0), N = [];
  for (let i = 0; i < n; i++) N.push(new Array(n).fill(0));
  matchs.forEach(function(m){
    const i = noms.indexOf(m.a.nom), j = noms.indexOf(m.b.nom); if (i < 0 || j < 0) return;
    const p = _bancPoints(m, res[m.id]); pts[i] += p.pts; pts[j] += p.n - p.pts; N[i][j] += p.n; N[j][i] += p.n;
  });
  let g = new Array(n).fill(1);
  for (let it = 0; it < 300; it++) {
    const ng = g.map(function(gi, i){ let d = 0; for (let j = 0; j < n; j++) if (N[i][j]) d += N[i][j] / (gi + g[j]); return d > 0 ? Math.max(1e-6, (pts[i] + 0.5) / (d + 1 / (gi + 1))) : gi; });
    const moy = Math.exp(ng.reduce(function(a, x){ return a + Math.log(x); }, 0) / n); g = ng.map(function(x){ return x / moy; });
  }
  const e = g.map(function(x){ return 400 * Math.log10(x); }), ref = e[0];
  return e.map(function(x){ return Math.round(x - ref); });
}

/* ─── 1. Le tournoi entre les styles ─── */
function _styleParticipants(){
  const P = [], pr = AI_WEIGHT_PRESETS;
  const w = function(x){ return _labComplet(x); };
  P.push({ nom: 'Équilibré', w: w(pr.balanced) });
  P.push({ nom: 'Agressif', w: w(pr.aggressive) });
  P.push({ nom: 'Défensif', w: w(pr.defensive) });
  P.push({ nom: 'Division', w: w(pr.divide) });
  P.push({ nom: 'KAAH', w: w(pr.kaah) });
  if (pr.humain) P.push({ nom: 'Humain', w: w(pr.humain) });
  const tx = (typeof texelResultat === 'function') ? texelResultat() : null;
  if (tx) { const t = _labComplet(pr.balanced); tx.cles.forEach(function(k, j){ t[k] = tx.w[j]; }); P.push({ nom: 'Texel', w: t }); }
  return P;
}
BANCS.styles = {
  cle: 'abaLabTournoiStyles',
  construire: function(o){
    const P = _styleParticipants(), paires = Math.max(1, Math.min(20, (o.paires | 0) || 4)), matchs = [];
    for (let i = 0; i < P.length; i++) for (let j = i + 1; j < P.length; j++) matchs.push({ id: i + '-' + j, a: P[i], b: P[j], paires: paires });
    return { matchs: matchs, noms: P.map(function(p){ return p.nom; }), paires: paires, depart: o.depart || _bancReglagesLus('styles').depart, regime: _bancRegimeDe(o, 'styles') };
  },
  rendu: function(s, msg){ renderTournoiStyles(msg); }
};
function lancerTournoiStyles(){ const el = document.getElementById('lab-styles-paires'); bancLancer('styles', Object.assign(_bancReglagesLus('styles'), { paires: el ? parseInt(el.value, 10) : 4 })); }
function renderTournoiStyles(msg){
  const hote = document.getElementById('lab-styles-host'); if (!hote) return;
  const s = bancEtat('styles');
  let h = '<p class="lab-intro">Tous les styles de l’IA s’affrontent deux à deux : Équilibré (avec ce que le Labo a adopté), Agressif, Défensif, Division, KAAH, et les poids Texel ou Humain s’ils existent. Chaque match se joue par paires — la même vraie position deux fois, couleurs inversées. À la fin, un classement Elo.</p>';
  h += '<div class="lab-options"><label>Paires par match <select id="lab-styles-paires">' + [2, 4, 8, 12].map(function(n){ return '<option value="' + n + '"' + (n === ((s && s.plan.paires) || 4) ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>'
    + '<span class="lab-note">' + _styleParticipants().length + ' styles → ' + (function(){ const k = _styleParticipants().length; return k * (k - 1) / 2; })() + ' matchs</span></div>';
  h += _bancReglages('styles');
  h += _bancBoutons('styles', s, 'Nouveau tournoi', 'lancerTournoiStyles()');
  if (msg) h += '<div class="lab-etat">' + msg + '</div>';
  if (s) {
    h += '<div class="lab-etat">' + _bancLigneEtat('styles', s) + '</div>';
    const noms = s.plan.noms, elo = _bancElo(noms, s.plan.matchs, s.res);
    const tot = noms.map(function(nm){ let p = 0, n = 0; s.plan.matchs.forEach(function(m){ const x = _bancPoints(m, s.res[m.id]); if (m.a.nom === nm) { p += x.pts; n += x.n; } else if (m.b.nom === nm) { p += x.n - x.pts; n += x.n; } }); return { p: p, n: n }; });
    const ordre = noms.map(function(nm, i){ return i; }).sort(function(a, b){ return elo[b] - elo[a]; });
    h += '<table class="lab-poids lab-classement"><thead><tr><th>#</th><th>Style</th><th>Elo</th><th>Points</th></tr></thead><tbody>';
    ordre.forEach(function(i, r){ h += '<tr><td>' + (r + 1) + '</td><td>' + noms[i] + '</td><td>' + (tot[i].n ? (elo[i] >= 0 ? '+' : '') + elo[i] : '—') + '</td><td>' + (tot[i].n ? _labNombre(tot[i].p) + ' / ' + tot[i].n + ' (' + Math.round(100 * tot[i].p / tot[i].n) + ' %)' : '—') + '</td></tr>'; });
    h += '</tbody></table><div class="lab-note">' + _bancLigneReglages(s) + '.</div>';
    // v2.71 : l'Elo de chaque style avec sa marge, et le tableau croise des matchs
    const marges = _bancEloMarges(noms, s.plan.matchs, s.res, elo);
    h += '<div class="gr-titre">Elo de chaque style</div><div class="gr-sous">Relatif à Équilibré (0), avec sa marge à 95 % (le trait fin) : deux styles dont les marges se recouvrent ne sont pas départagés.</div>';
    h += grBarres(ordre.filter(function(i){ return tot[i].n; }).map(function(i){ return { lab: noms[i], v: elo[i], bas: marges[i] != null ? elo[i] - marges[i] : null, haut: marges[i] != null ? elo[i] + marges[i] : null,
      txt: (elo[i] >= 0 ? '+' : '') + elo[i] + (marges[i] != null ? ' ± ' + marges[i] : ''), tip: noms[i] + _dimDp() + (elo[i] >= 0 ? '+' : '') + elo[i] + ' Elo' + (marges[i] != null ? ' ± ' + marges[i] : '') + ' · ' + grNb(tot[i].p) + ' / ' + tot[i].n }; }), {});
    h += '<div class="gr-titre">Qui bat qui</div><div class="gr-sous">Le score du style de la ligne contre celui de la colonne. Bleu : il gagne plus qu’il ne perd ; rouge : l’inverse ; gris : à égalité.</div>';
    const scoreDe = function(i, j){ const m = s.plan.matchs.find(function(x){ return (x.a.nom === noms[i] && x.b.nom === noms[j]) || (x.a.nom === noms[j] && x.b.nom === noms[i]); }); if (!m) return null; const x = _bancPoints(m, s.res[m.id]); if (!x.n) return null; return { p: m.a.nom === noms[i] ? x.pts : x.n - x.pts, n: x.n }; };
    h += grCarte(ordre.map(function(i){ return noms[i]; }), ordre.map(function(i){ return noms[i]; }), function(a, b){
      const i = ordre[a], j = ordre[b]; if (i === j) return { v: null, txt: '—' }; const x = scoreDe(i, j); if (!x) return { v: null, txt: '…' };
      const pc = 100 * x.p / x.n; return { v: pc, txt: Math.round(pc) + ' %', tip: noms[i] + ' contre ' + noms[j] + _dimDp() + grNb(x.p) + ' / ' + x.n + ' (' + Math.round(pc) + ' %)' };
    }, { echelle: 'signe', centre: 50, min: 0, max: 100, legende: ['perd tout', 'gagne tout'] });
    h += '<details class="lab-details"><summary>Détail des matchs</summary><table class="lab-poids"><tbody>';
    s.plan.matchs.forEach(function(m){ const r = s.res[m.id], x = _bancPoints(m, r), es = _labEloStrP(r.penta);
      h += '<tr><td>' + m.a.nom + ' – ' + m.b.nom + '</td><td>' + (x.n ? _labNombre(x.pts) + ' – ' + _labNombre(x.n - x.pts) : '…') + '</td><td>' + (es || '') + '</td></tr>'; });
    h += '</tbody></table></details>' + _bancJournal(s);
  }
  hote.innerHTML = h;
}

/* ─── 2. Les niveaux 1 a 10 ───
   Chaque niveau contre le suivant, avec sa vraie profondeur et son vrai temps de reflexion
   (AI_DIFFICULTY_CONFIG), sur un seul fil de calcul (en partie, l'IA peut en utiliser
   plusieurs : les hauts niveaux y sont un peu plus forts). Le niveau 1 tire au sort parmi
   les 4 premiers coups, comme en partie. Les niveaux 9 et 10 (30 s par coup, sans limite)
   demanderaient des jours : hors de portee. */
const NIVEAUX_MAX_MESURABLE = 8;
function _niveauCfg(n){ const c = AI_DIFFICULTY_CONFIG[String(n)]; if (!c) return null; return c.hasard ? { mode: 'hasard' } : { depth: c.depth, ms: c.time }; }
BANCS.niveaux = {
  cle: 'abaLabNiveaux',
  construire: function(o){
    const haut = Math.max(2, Math.min(NIVEAUX_MAX_MESURABLE, (o.jusqua | 0) || 6)), paires = Math.max(1, Math.min(20, (o.paires | 0) || 6)), w = _labComplet(AI_WEIGHT_PRESETS.balanced), matchs = [];
    for (let n = 1; n < haut; n++) matchs.push({ id: 'n' + n, a: { nom: 'Niveau ' + (n + 1), w: w, cfg: _niveauCfg(n + 1) }, b: { nom: 'Niveau ' + n, w: w, cfg: _niveauCfg(n) }, paires: paires, bas: n });
    const R = _bancRegimeDe(o, 'niveaux');
    return { matchs: matchs, haut: haut, paires: paires, depart: o.depart || _bancReglagesLus('niveaux').depart, regime: { ms: 400, plies: R.plies, draw: LAB_CFG.confDraw || 300 } };
  },
  rendu: function(s, msg){ renderNiveaux(msg); }
};
function lancerNiveaux(){
  const a = document.getElementById('lab-niv-haut'), b = document.getElementById('lab-niv-paires');
  bancLancer('niveaux', Object.assign(_bancReglagesLus('niveaux'), { jusqua: a ? parseInt(a.value, 10) : 6, paires: b ? parseInt(b.value, 10) : 6 }));
}
// duree estimee d'une partie entre deux niveaux (la moitie des coups chacun, le temps plein au pire)
function _niveauDureePartie(n, plies){ const t = function(k){ const c = AI_DIFFICULTY_CONFIG[String(k)]; return c && !c.hasard ? c.time : 20; }; return (plies / 2) * (t(n) + t(n + 1)); }
function renderNiveaux(msg){
  const hote = document.getElementById('lab-niveaux-host'); if (!hote) return;
  const s = bancEtat('niveaux');
  // le choix en cours dans les listes (sinon celui de la derniere mesure)
  const lu = function(id){ const el = document.getElementById(id); return el && el.value ? parseInt(el.value, 10) : 0; };
  const haut = lu('lab-niv-haut') || (s && s.plan.haut) || 6, paires = lu('lab-niv-paires') || (s && s.plan.paires) || 6;
  let h = '<p class="lab-intro">Chaque niveau affronte le suivant (1 contre 2, 2 contre 3…), avec sa vraie profondeur et son vrai temps de réflexion, par paires depuis de vraies positions. On voit la <b>hauteur de chaque marche</b> en Elo : des marches régulières, c’est une progression agréable.</p>';
  let est = 0; for (let n = 1; n < haut; n++) est += 2 * paires * _niveauDureePartie(n, _bancReglagesLus('niveaux').plies);
  h += '<div class="lab-options"><label>Jusqu’au niveau <select id="lab-niv-haut" onchange="renderNiveaux()">' + [4, 5, 6, 7, 8].map(function(n){ return '<option' + (n === haut ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>'
    + '<label>Paires par marche <select id="lab-niv-paires" onchange="renderNiveaux()">' + [4, 6, 10, 16].map(function(n){ return '<option' + (n === paires ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label>'
    + '<span class="lab-note">au pire ≈ ' + _labDuree(est / Math.max(1, _labNbFils())) + ' sur ' + _labNbFils() + ' fil' + (_labNbFils() > 1 ? 's' : '') + ' (souvent bien moins : la profondeur est atteinte avant le temps)</span></div>';
  h += _bancReglages('niveaux', { ms: true });
  h += _bancBoutons('niveaux', s, 'Nouvelle mesure', 'lancerNiveaux()');
  if (msg) h += '<div class="lab-etat">' + msg + '</div>';
  if (s) {
    h += '<div class="lab-etat">' + _bancLigneEtat('niveaux', s) + '</div>';
    let cumul = 0, maxAbs = 50;
    const lignes = s.plan.matchs.map(function(m){ const e = _labEloP(s.res[m.id].penta); if (e) maxAbs = Math.max(maxAbs, Math.abs(e.elo) + e.ci); return { m: m, e: e }; });
    h += '<table class="lab-poids lab-niveaux"><thead><tr><th>Marche</th><th>Écart</th><th></th><th>Échelle</th></tr></thead><tbody>';
    h += '<tr><td>Niveau 1</td><td></td><td></td><td>0</td></tr>';
    lignes.forEach(function(x){
      const e = x.e, n = x.m.bas;
      if (e) cumul += e.elo;
      const larg = e ? Math.round(50 * Math.max(-1, Math.min(1, e.elo / maxAbs))) : 0;
      h += '<tr><td>' + n + ' → ' + (n + 1) + '</td><td>' + (e && e.n >= 2 ? (e.elo >= 0 ? '+' : '') + Math.round(e.elo) + ' ± ' + Math.round(e.ci) : '…') + '</td>'
        + '<td class="lab-marche"><span style="' + (larg >= 0 ? 'left:50%;width:' + larg + '%' : 'left:' + (50 + larg) + '%;width:' + (-larg) + '%') + '"></span></td>'
        + '<td>' + (e ? (cumul >= 0 ? '+' : '') + Math.round(cumul) : '…') + '</td></tr>';
    });
    h += '</tbody></table><div class="lab-note">Écart : ce que le niveau supérieur gagne sur l’autre, en Elo, avec sa marge à 95 %. Échelle : la somme depuis le niveau 1. Les niveaux 9 et 10 (30 s par coup, sans limite) demanderaient des jours de calcul. Une marche trop haute ou trop basse se corrige en changeant le temps ou la profondeur du niveau : demande-le, une fois la mesure faite. ' + _bancLigneReglages(s).replace(/^Cette série : [^·]*· /, 'Cette série : ') + '.</div>';
    // v2.71 : l'echelle en courbe, avec sa marge cumulee (les marges des marches s'ajoutent en quadrature)
    let c2 = 0, v2 = 0; const pts = [[1, 0]], bande = [[1, 0, 0]];
    lignes.forEach(function(x){ if (!x.e || x.e.n < 2) return; c2 += x.e.elo; v2 += x.e.ci * x.e.ci; const m = Math.sqrt(v2); pts.push([x.m.bas + 1, Math.round(c2)]); bande.push([x.m.bas + 1, Math.round(c2 - m), Math.round(c2 + m)]); });
    if (pts.length > 1) {
      h += '<div class="gr-titre">L’échelle des niveaux</div><div class="gr-sous">Elo de chaque niveau, le niveau 1 à 0 ; la zone claire, la marge à 95 %.</div>';
      h += grLignes(grLargeur(hote, 640), [{ nom: 'Elo', couleur: GR_OR, pts: pts, bande: bande, points: true }], { ticksX: pts.map(function(p){ return p[0]; }), fmtX: function(v){ return 'N' + v; }, nomX: 'Niveau', zero: true, aria: 'Échelle des niveaux' });
    }
    h += _bancJournal(s);
  }
  hote.innerHTML = h;
  grSurRedim('niveaux', 'lab-niveaux-host', function(){ renderNiveaux(); });
}

/* ─── 3. Les ouvertures de la Marguerite belge ───
   Les lignes du livre (OPENING_TREES.belgian) : les premiers coups des Noirs joues au moins
   10 fois, et les reponses des Blancs au coup principal jouees au moins 25 fois. Pour chaque
   ligne, des positions un peu plus loin, en suivant ce que les vrais joueurs ont joue ensuite
   (2 a 4 demi-coups, tires au sort selon leur frequence) : l'IA joue les deux camps a partir
   de la, avec les memes poids. Le score est celui du camp qui a joue la ligne. */
const OUV_MIN_PREMIER = 10, OUV_MIN_REPONSE = 25;
function _ouvAppliquer(bd, mvId, col){
  const sauve = board;
  try {
    board = bd;
    const legal = getAllMovesForColor(col);
    const mv = legal.find(function(m){ return canonId(m) === mvId; });
    if (!mv) return null;
    const ej = abApplyMove(mv.cells, mv.dir, col, mv.info).ejected;
    return { ej: !!ej, mv: mv };
  } finally { board = sauve; }
}
function _ouvLignes(){
  const T = (typeof OPENING_TREES !== 'undefined') ? OPENING_TREES.belgian : null;
  if (!T || !T.k) return [];
  const L = [];
  const fils = function(n){ return Object.keys(n.k || {}).map(function(id){ return [id, n.k[id]]; }).sort(function(a, b){ return b[1].c - a[1].c; }); };
  const premiers = fils(T);
  premiers.forEach(function(x){ if (x[1].c >= OUV_MIN_PREMIER) L.push({ chemin: [x[0]], noeud: x[1] }); });
  if (premiers.length) fils(premiers[0][1]).forEach(function(x){ if (x[1].c >= OUV_MIN_REPONSE) L.push({ chemin: [premiers[0][0], x[0]], noeud: x[1] }); });
  return L;
}
// nom d'un coup du livre dans la notation du site (Aba-Pro), comme la liste des coups
function _ouvNom(chemin){
  return chemin.map(function(id){
    const p = id.split('>'), cells = (p[0].match(/../g) || []).map(function(rc){ return { r: +rc.charAt(0), c: +rc.charAt(1) }; });
    const d = (p[1] || '').match(/^(-?\d)(-?\d)$/);
    return d ? _notationCoupBrut(cells, { q: +d[1], r: +d[2] }) : id;
  }).join(' ');
}
function _ouvPositions(ligne, n){
  const Lb = LAYOUTS.belgian, depart = {};
  Lb.black.forEach(function(p){ depart[p[0] + ',' + p[1]] = 'black'; }); Lb.white.forEach(function(p){ depart[p[0] + ',' + p[1]] = 'white'; });
  const out = [];
  for (let k = 0; k < n * 3 && out.length < n; k++) {
    const bd = Object.assign({}, depart); let col = 'black', noeud = OPENING_TREES.belgian, ok = true, cb = 0, cw = 0;
    const jouer = function(id){ const r = _ouvAppliquer(bd, id, col); if (!r) return false; if (r.ej) { if (col === 'black') cb++; else cw++; } col = col === 'black' ? 'white' : 'black'; return true; };
    for (const id of ligne.chemin) { if (!jouer(id)) { ok = false; break; } noeud = noeud.k[id]; }
    if (!ok) break;
    const rnd = _mb32Lab(_lpHache(k * 104729 + ligne.chemin.length * 7 + _bancHacheTexte(ligne.chemin.join('|'))));
    const suite = 2 + (k % 3);
    for (let j = 0; j < suite && noeud && noeud.k; j++) {
      const ids = Object.keys(noeud.k); if (!ids.length) break;
      let tot = 0; ids.forEach(function(id){ tot += noeud.k[id].c; });
      let x = rnd() * tot, choix = ids[0];
      for (const id of ids) { x -= noeud.k[id].c; if (x <= 0) { choix = id; break; } }
      if (!jouer(choix)) break;
      noeud = noeud.k[choix];
    }
    let s = ''; for (let i = 0; i < 61; i++) { const v = bd[_LP_CLES[i]]; s += v === 'black' ? 'b' : (v === 'white' ? 'w' : '.'); }
    if (out.some(function(p){ return p.s === s && p.t === col; })) continue;   // meme position deja retenue
    out.push({ s: s, t: col, cb: cb, cw: cw });
  }
  return out;
}
function _mb32Lab(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
BANCS.ouvertures = {
  cle: 'abaLabOuvertures',
  construire: function(o){
    const n = Math.max(4, Math.min(24, (o.parties | 0) || 10)), w = _labComplet(AI_WEIGHT_PRESETS.balanced), matchs = [];
    _ouvLignes().forEach(function(l, i){
      const dep = _ouvPositions(l, n); if (!dep.length) return;
      const joueur = l.chemin.length % 2 === 1 ? 'black' : 'white';
      matchs.push({ id: 'l' + i, solo: true, chemin: l.chemin, nom: _ouvNom(l.chemin), joueur: joueur, couleurA: joueur, departs: dep,
        humains: { c: l.noeud.c, wg: l.noeud.wg, w: l.noeud.w },
        a: { nom: (joueur === 'black' ? 'Noirs' : 'Blancs'), w: w }, b: { nom: (joueur === 'black' ? 'Blancs' : 'Noirs'), w: w } });
    });
    return { matchs: matchs, parties: n, regime: _bancRegimeDe(o, 'ouvertures') };
  },
  rendu: function(s, msg){ renderOuvertures(msg); },
  termine: function(){ _ouvVersLivre(); }
};
function lancerOuvertures(){
  const el = document.getElementById('lab-ouv-parties');
  const o = Object.assign(_bancReglagesLus('ouvertures'), { parties: el ? parseInt(el.value, 10) : 10 });
  if (typeof ensureGameBanks === 'function') ensureGameBanks().then(function(){ bancLancer('ouvertures', o); });
  else bancLancer('ouvertures', o);
}
/* Dans le livre de l'IA (option) : le taux de victoire d'un coup teste melange celui des
   humains et celui des duels, au prorata du nombre de parties. Rien ne change sans la case. */
function ouverturesDansLeLivre(){ try { return localStorage.getItem('abaLabOuvLivre') === '1'; } catch (e) { return false; } }
function ouverturesBasculerLivre(el){ try { localStorage.setItem('abaLabOuvLivre', el.checked ? '1' : '0'); } catch (e) {} _ouvVersLivre(); showToast(el.checked ? 'Le livre de l’IA tient compte des duels' : 'Le livre de l’IA revient aux seules parties humaines'); }
function _ouvVersLivre(){
  const T = (typeof OPENING_TREES !== 'undefined') ? OPENING_TREES.belgian : null; if (!T) return;
  const s = bancEtat('ouvertures');
  const marquer = function(chemin, val){ let n = T; for (const id of chemin) { n = n && n.k ? n.k[id] : null; } if (n) { if (val) n.lab = val; else delete n.lab; } };
  if (s) s.plan.matchs.forEach(function(m){ const r = s.res[m.id], nb = r.W + r.D + r.L; marquer(m.chemin, (ouverturesDansLeLivre() && nb) ? { n: nb, pts: r.W + r.D / 2 } : null); });
}
// taux de victoire d'un coup du livre (pickBookMove)
function _ouvTaux(n){
  const h = n.wg > 0 ? n.w / n.wg : 0.5;
  if (!n.lab || !n.lab.n) return h;
  return ((n.wg > 0 ? n.w : 0) + n.lab.pts) / ((n.wg > 0 ? n.wg : 0) + n.lab.n);
}
function renderOuvertures(msg){
  const hote = document.getElementById('lab-ouvertures-host'); if (!hote) return;
  const s = bancEtat('ouvertures');
  let h = '<p class="lab-intro">Les débuts de partie du livre, en Marguerite belge : les premiers coups des Noirs joués au moins ' + OUV_MIN_PREMIER + ' fois dans le corpus, et les réponses des Blancs au coup principal jouées au moins ' + OUV_MIN_REPONSE + ' fois. Pour chacun, l’IA joue les deux camps depuis des positions un peu plus loin, en suivant ce que les vrais joueurs ont joué ensuite. On compare son score à celui des humains.</p>';
  h += '<div class="lab-options"><label>Parties par ligne <select id="lab-ouv-parties">' + [6, 10, 16, 24].map(function(n){ return '<option' + (n === ((s && s.plan.parties) || 10) ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label></div>';
  h += _bancReglages('ouvertures', { depart: true });
  h += _bancBoutons('ouvertures', s, 'Nouveau test', 'lancerOuvertures()');
  if (msg) h += '<div class="lab-etat">' + msg + '</div>';
  if (s) {
    h += '<div class="lab-etat">' + _bancLigneEtat('ouvertures', s) + '</div>';
    h += '<table class="lab-poids"><thead><tr><th>Ligne</th><th>Humains</th><th>IA contre IA</th></tr></thead><tbody>';
    s.plan.matchs.forEach(function(m){
      const r = s.res[m.id], nb = r.W + r.D + r.L, hm = m.humains;
      h += '<tr><td>' + (m.chemin.length === 2 ? '↳ ' : '') + m.nom + '<small> · ' + m.a.nom + '</small></td>'
        + '<td>' + (hm.wg ? Math.round(100 * hm.w / hm.wg) + ' %<small> sur ' + hm.wg + '</small>' : '—') + '</td>'
        + '<td>' + (nb ? Math.round(100 * (r.W + r.D / 2) / nb) + ' %<small> sur ' + nb + ' (' + r.W + '-' + r.D + '-' + r.L + ')</small>' : '…') + '</td></tr>';
    });
    h += '</tbody></table><div class="lab-note">Score du camp qui joue la ligne (les coups en notation Aba-Pro, comme la liste des coups). Peu de parties par ligne : un écart de moins de 20 points n’est pas significatif. ' + _bancLigneReglages(s) + '.</div>';
    // v2.71 : humains et IA cote a cote, ligne par ligne
    const it = [];
    s.plan.matchs.forEach(function(m){
      const r = s.res[m.id], nb = r.W + r.D + r.L, hm = m.humains, lab = (m.chemin.length === 2 ? '↳ ' : '') + m.nom;
      it.push({ lab: lab, v: hm.wg ? hm.w / hm.wg : 0, couleur: GR_REF, txt: hm.wg ? grPct(hm.w / hm.wg) : '—', tip: lab + ' · humains' + _dimDp() + (hm.wg ? grPct(hm.w / hm.wg) + ' sur ' + hm.wg : '—') });
      it.push({ lab: '', v: nb ? (r.W + r.D / 2) / nb : 0, couleur: GR_OR, txt: nb ? grPct((r.W + r.D / 2) / nb) : '…', tip: lab + ' · IA contre IA' + _dimDp() + (nb ? grPct((r.W + r.D / 2) / nb) + ' sur ' + nb : 'pas encore jouée') });
    });
    h += '<div class="gr-titre">Humains et IA, ligne par ligne</div><div class="gr-sous">Score du camp qui joue la ligne ; le trait marque 50 %.</div>'
      + grBarres(it.map(function(x){ x.ref = 0.5; return x; }), { max: 1 }) + grLegende([{ nom: 'Humains', couleur: GR_REF }, { nom: 'IA contre IA', couleur: GR_OR }]);
    h += '<label class="lab-case"><input type="checkbox"' + (ouverturesDansLeLivre() ? ' checked' : '') + ' onchange="ouverturesBasculerLivre(this)"> Le livre de l’IA tient compte de ces duels (le taux de victoire d’un coup mélange humains et duels)</label>';
    h += _bancJournal(s);
  }
  hote.innerHTML = h;
}
// le livre tient compte des duels des le chargement des arbres, si la case est cochee
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('load', function(){ try { if (ouverturesDansLeLivre() && typeof ensureGameBanks === 'function') ensureGameBanks().then(_ouvVersLivre); } catch (e) {} });
