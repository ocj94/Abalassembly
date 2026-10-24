/* ═══════════════════════════════════════════
   LABO : LA METHODE TEXEL (v2.70)
   Demande d'Olivier : « les 6 » -- 1er outil, « apprendre des vraies parties en
   quelques minutes ». La methode des regleurs de moteurs d'echecs (Texel) :
   sur des positions de vraies parties dont on connait le gagnant, on cherche
   les poids pour lesquels l'evaluation de l'IA devine le mieux qui va gagner.
   Aucune partie a jouer : quelques secondes de calcul.

   - Les positions : 42-labo-positions.js (positions calmes, resultat connu).
     Celles des parties dont le numero finit par 0 ou 5 ne servent PAS au
     reglage : elles servent a verifier (sinon on mesurerait l'apprentissage
     par coeur).
   - evaluateBoard est lineaire en ses poids : materiel + somme poids x terme.
     Les termes sont calcules une fois, par les fils de calcul (le code exact
     du moteur), puis le reglage ne fait que des additions.
   - Prevision : p = 1 / (1 + e^(-s x eval)). L'echelle s est d'abord reglee
     sur les poids actuels, puis les poids sont ajustes (descente de gradient,
     Adam), bornes comme ceux du Labo.
   - Rien n'est adopte ici : « Verifier en duels » envoie les poids trouves au
     Labo, qui les confronte au champion (paires, SPRT) avant toute adoption.
     Mieux deviner le gagnant des parties humaines ne prouve pas qu'on joue
     mieux : seuls les duels le disent.
═══════════════════════════════════════════ */
const TEXEL_CLE = 'abaLabTexel';
let _txEnCours = false;
let _txCreerFil = function(){ return _labCreerFil(); };   // remplacable par les tests

// resultat du point de vue du camp au trait : 1 gagne, 0,5 nul, 0 perd
function _txResultatPour(i){ const r = _lpResultat(i); if (r === 3) return 0.5; return ((r === 1) === (_lpTrait(i) === 'black')) ? 1 : 0; }
function _txEval(D, i, w){ const K = w.length; let e = D.m[i]; for (let k = 0; k < K; k++) e += w[k] * D.f[i * K + k]; return e; }
function _txErreur(D, R, w, s){ let e = 0; for (let i = 0; i < R.length; i++) { const p = 1 / (1 + Math.exp(-s * _txEval(D, i, w))); e += (R[i] - p) * (R[i] - p); } return R.length ? e / R.length : 0; }
// part des positions (parties non nulles) ou l'evaluation donne le bon gagnant ; evaluation nulle : un demi
function _txJuste(D, R, w){ let n = 0, b = 0; for (let i = 0; i < R.length; i++) { if (R[i] === 0.5) continue; const e = _txEval(D, i, w); n++; if (e === 0) b += 0.5; else if ((e > 0) === (R[i] === 1)) b++; } return n ? b / n : 0; }
function _txEchelle(D, R, w){
  let lo = 1e-5, hi = 2e-2;
  for (let it = 0; it < 60; it++) { const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3; if (_txErreur(D, R, w, a) < _txErreur(D, R, w, b)) hi = b; else lo = a; }
  return (lo + hi) / 2;
}
// une etape d'Adam (moyenne des gradients sur toutes les positions d'apprentissage), poids bornes
function _txEtape(D, R, s, st){
  const K = st.w.length, g = new Array(K).fill(0), b1 = 0.9, b2 = 0.999;
  for (let i = 0; i < R.length; i++) {
    const p = 1 / (1 + Math.exp(-s * _txEval(D, i, st.w))), c = -2 * (R[i] - p) * p * (1 - p) * s;
    for (let k = 0; k < K; k++) g[k] += c * D.f[i * K + k];
  }
  st.t++;
  for (let k = 0; k < K; k++) {
    g[k] /= R.length;
    // v2.71 : rappel (reglable) vers les poids de depart, en proportion de la plage de chaque critere
    if (st.lam && st.w0) { const e = st.max[k] - st.min[k]; g[k] += 2 * st.lam * (st.w[k] - st.w0[k]) / (e * e); }
    st.m[k] = b1 * st.m[k] + (1 - b1) * g[k]; st.v[k] = b2 * st.v[k] + (1 - b2) * g[k] * g[k];
    const mh = st.m[k] / (1 - Math.pow(b1, st.t)), vh = st.v[k] / (1 - Math.pow(b2, st.t));
    st.w[k] = Math.min(st.max[k], Math.max(st.min[k], st.w[k] - st.pas[k] * mh / (Math.sqrt(vh) + 1e-12)));
  }
}
const TEXEL_ETAPES = 800;
/* v2.71, les reglages (demande d'Olivier : « plus de parametres ») : quelles positions (disposition,
   moment de la partie), la force du rappel vers les poids du champion, le nombre d'etapes. */
const TEXEL_CFG_DEFAUT = { dispo: 'tout', phase: 'tout', rappel: 0, etapes: 800 };
const TEXEL_PHASES = { debut: [0, 30], milieu: [30, 70], fin: [70, 999] };
function texelCfg(){ try { return Object.assign({}, TEXEL_CFG_DEFAUT, JSON.parse(localStorage.getItem('abaLabTexelCfg') || '{}')); } catch (e) { return Object.assign({}, TEXEL_CFG_DEFAUT); } }
function texelCfgSet(k, v){ const c = texelCfg(); c[k] = (k === 'rappel' || k === 'etapes') ? +v : v; try { localStorage.setItem('abaLabTexelCfg', JSON.stringify(c)); } catch (e) {} renderTexel(); }
function _txGarder(i, c){
  if (c.dispo === 'belgian' && _lpDispo(i) !== 'belgian') return false;
  const ph = TEXEL_PHASES[c.phase]; if (ph && !(_lpPly(i) >= ph[0] && _lpPly(i) < ph[1])) return false;
  return true;
}
// la courbe de calibration : les positions rangees par gagnant prevu (10 tranches), et ce qui s'est vraiment passe
function _txCalibration(D, R, w, s){
  const B = []; for (let b = 0; b < 10; b++) B.push({ n: 0, p: 0, r: 0 });
  for (let i = 0; i < R.length; i++) { const p = 1 / (1 + Math.exp(-s * _txEval(D, i, w))), b = Math.min(9, Math.floor(p * 10)); B[b].n++; B[b].p += p; B[b].r += R[i]; }
  return B.map(function(x){ return x.n ? { n: x.n, p: x.p / x.n, r: x.r / x.n } : { n: 0 }; });
}
// de combien chaque critere fait bouger l'evaluation : poids x ecart-type du terme sur les positions
function _txImportance(D, w){
  const K = w.length, n = D.m.length, out = [];
  for (let k = 0; k < K; k++) { let m = 0, m2 = 0; for (let i = 0; i < n; i++) { const x = D.f[i * K + k]; m += x; m2 += x * x; } m /= n; out.push(Math.abs(w[k]) * Math.sqrt(Math.max(0, m2 / n - m * m))); }
  return out;
}
function _txErreurSi(D, R, w, s, garder){ let e = 0, n = 0; for (let i = 0; i < R.length; i++) { if (!garder(i)) continue; const p = 1 / (1 + Math.exp(-s * _txEval(D, i, w))); e += (R[i] - p) * (R[i] - p); n++; } return n ? e / n : null; }
function texelHistorique(){ try { return JSON.parse(localStorage.getItem('abaLabTexelHist') || '[]'); } catch (e) { return []; } }

function texelResultat(){ try { const r = JSON.parse(localStorage.getItem(TEXEL_CLE) || 'null'); return (r && r.v === 1) ? r : null; } catch (e) { return null; } }

// termes de toutes les positions, reparties sur plusieurs fils de calcul dedies
function _txTermes(indices, cles, surProgres){
  return new Promise(function(ok, ko){
    const K = cles.length, n = indices.length, f = new Float32Array(n * K), m = new Float32Array(n);
    const LOT = 1000, lots = [];
    for (let a = 0; a < n; a += LOT) lots.push(a);
    const nbFils = Math.max(1, Math.min(lots.length, _labNbFils()));
    const fils = [];
    for (let i = 0; i < nbFils; i++) { let x = null; try { x = _txCreerFil(); } catch (e) {} if (x && x.w) fils.push(x); }
    if (!fils.length) { ko(new Error('fil de calcul indisponible')); return; }
    let faits = 0, prochain = 0, fini = false;
    const tuer = function(){ fils.forEach(function(x){ try { x.w.onmessage = null; x.w.terminate(); } catch (e) {} try { if (x.url) URL.revokeObjectURL(x.url); } catch (e) {} }); };
    const envoyer = function(x){
      if (prochain >= lots.length) return;
      const a = lots[prochain++], b = Math.min(n, a + LOT);
      x.a = a;
      x.w.postMessage({ texelTermes: true, id: a, cles: cles, positions: indices.slice(a, b).map(_lpPourFil) });
    };
    fils.forEach(function(x){
      x.w.onmessage = function(e){
        const d = e.data; if (!d || !d.texelTermes || fini) return;
        if (d.error) { fini = true; tuer(); ko(new Error(d.error)); return; }
        f.set(d.f, d.id * K); m.set(d.m, d.id);
        faits++; if (surProgres) surProgres(faits / lots.length);
        if (faits === lots.length) { fini = true; tuer(); ok({ f: f, m: m }); return; }
        envoyer(x);
      };
      envoyer(x);
    });
  });
}

function lancerTexel(){
  if (_txEnCours) return;
  _txEnCours = true;
  renderTexel('⏳ Chargement des positions…');
  ensureLaboPositions().then(function(ok){
    if (!ok) throw new Error('positions du corpus illisibles sur ce navigateur');
    const cfg = texelCfg(), I0 = _lpTexelIndices(), cles = _labCles();
    const I = { app: I0.app.filter(function(i){ return _txGarder(i, cfg); }), ctl: I0.ctl.filter(function(i){ return _txGarder(i, cfg); }) };
    if (I.app.length < 500 || I.ctl.length < 100) throw new Error('trop peu de positions avec ces réglages (' + I.app.length + ' + ' + I.ctl.length + ')');
    const tous = I.app.concat(I.ctl), nApp = I.app.length;
    renderTexel('⏳ Calcul des termes de l’évaluation sur ' + tous.length.toLocaleString('fr-FR') + ' positions…');
    return _txTermes(tous, cles, function(x){ renderTexel('⏳ Calcul des termes de l’évaluation : ' + Math.round(100 * x) + ' %'); }).then(function(T){
      const K = cles.length;
      const A = { f: T.f.subarray(0, nApp * K), m: T.m.subarray(0, nApp) }, C = { f: T.f.subarray(nApp * K), m: T.m.subarray(nApp) };
      const RA = I.app.map(_txResultatPour), RC = I.ctl.map(_txResultatPour);
      const ch = _labComplet(labLoad().champion), w0 = cles.map(function(k){ return ch[k]; });
      const s = _txEchelle(A, RA, w0);
      const etapes = cfg.etapes || TEXEL_ETAPES;
      const st = { w: w0.slice(), w0: w0, lam: cfg.rappel || 0, m: new Array(K).fill(0), v: new Array(K).fill(0), t: 0,
        min: cles.map(function(k){ return SPSA_MIN[k]; }), max: cles.map(function(k){ return SPSA_MAX[k]; }),
        pas: cles.map(function(k){ return (SPSA_MAX[k] - SPSA_MIN[k]) / 400; }) };
      // l'ajustement par tranches : la page reste utilisable pendant le calcul
      return new Promise(function(fin){
        const tranche = function(){
          for (let j = 0; j < 20 && st.t < etapes; j++) _txEtape(A, RA, s, st);
          renderTexel('⏳ Ajustement des poids : ' + Math.round(100 * st.t / etapes) + ' %');
          if (st.t < etapes) setTimeout(tranche, 0); else fin();
        };
        tranche();
      }).then(function(){
        const zero = new Array(K).fill(0);
        const res = { v: 1, date: Date.now(), cles: cles, s: s, nApp: RA.length, nCtl: RC.length, cfg: cfg,
          w0: w0, w: st.w.map(function(x){ return Math.round(x * 10) / 10; }),
          avant: { app: _txErreur(A, RA, w0, s), ctl: _txErreur(C, RC, w0, s), juste: _txJuste(C, RC, w0) },
          materiel: { ctl: _txErreur(C, RC, zero, s), juste: _txJuste(C, RC, zero) } };
        res.apres = { app: _txErreur(A, RA, res.w, s), ctl: _txErreur(C, RC, res.w, s), juste: _txJuste(C, RC, res.w) };
        // v2.71 : calibration, importance des criteres, erreur selon le moment de la partie (positions de controle)
        res.calib = { avant: _txCalibration(C, RC, w0, s), apres: _txCalibration(C, RC, res.w, s) };
        res.importance = { avant: _txImportance(C, w0), apres: _txImportance(C, res.w) };
        res.phases = {};
        Object.keys(TEXEL_PHASES).forEach(function(ph){ const b = TEXEL_PHASES[ph], g = function(j){ const p = _lpPly(I.ctl[j]); return p >= b[0] && p < b[1]; };
          res.phases[ph] = { avant: _txErreurSi(C, RC, w0, s, g), apres: _txErreurSi(C, RC, res.w, s, g) }; });
        try { localStorage.setItem(TEXEL_CLE, JSON.stringify(res)); } catch (e) {}
        try { const H = texelHistorique(); H.unshift({ date: res.date, cfg: cfg, n: res.nApp + res.nCtl, juste: [res.avant.juste, res.apres.juste], err: [res.avant.ctl, res.apres.ctl] }); localStorage.setItem('abaLabTexelHist', JSON.stringify(H.slice(0, 12))); } catch (e) {}
        _txEnCours = false;
        renderTexel();
      });
    });
  }).catch(function(e){ _txEnCours = false; renderTexel('❌ ' + (e && e.message || e)); });
}

// envoie les poids trouves au Labo : confrontation au champion (paires, SPRT) avant toute adoption
function texelEnDuels(){
  const r = texelResultat(); if (!r) return;
  const st = labLoad();
  if (st.phase === 'confirm' || st.phase === 'bilan') { showToast('Un test est déjà en cours au Labo : attends son verdict'); return; }
  const w = _labComplet(st.champion);
  r.cles.forEach(function(k, j){ w[k] = r.w[j]; });
  _labNouvellePhase(st, 'confirm');
  st.confirm = { name: 'Méthode Texel du ' + new Date(r.date).toLocaleDateString('fr-FR'), w: w, key: null, penta: _labPentaVide(), half: {}, fait: {}, llr: 0, source: 'texel' };
  labSave(st);
  if (typeof laboOnglet === 'function') laboOnglet('auto');
  renderLab();
  if (!_labRunning) startLab(); else _labPlanifier(_labPomper, 50);
  showToast('⚔️ Les poids Texel affrontent le champion');
}

const TEXEL_LIBELLES = { dispo: { tout: 'toutes les dispositions', belgian: 'Marguerite belge' }, phase: { tout: 'toute la partie', debut: 'début (demi-coups 10 à 29)', milieu: 'milieu (30 à 69)', fin: 'fin (70 et plus)' },
  rappel: { 0: 'aucun', 0.05: 'léger', 0.2: 'moyen', 1: 'fort' }, etapes: { 400: '400', 800: '800', 1600: '1 600' } };
function _txSelect(k, c){ const L = TEXEL_LIBELLES[k]; return '<select onchange="texelCfgSet(\'' + k + '\', this.value)"' + (_txEnCours ? ' disabled' : '') + '>' + Object.keys(L).map(function(v){ return '<option value="' + v + '"' + (String(c[k]) === v ? ' selected' : '') + '>' + L[v] + '</option>'; }).join('') + '</select>'; }
// v2.75 : les poids Texel sont dans l'IA a partir du niveau 4 -- ce qu'ont dit les duels
function _txHtmlDansIA(){
  if (typeof AI_WEIGHT_PRESETS === 'undefined' || !AI_WEIGHT_PRESETS.texel) return '';
  const D = (typeof AI_TEXEL_DUELS !== 'undefined') ? AI_TEXEL_DUELS : [];
  let h = '<div class="lab-note lab-texel-ia">✅ <b>Dans l’IA depuis la v2.75</b> : à partir du <b>niveau ' + AI_NIVEAU_TEXEL + '</b>, en style Auto ou Équilibré, l’IA juge les positions avec les poids Texel calculés ici avec les réglages par défaut. '
    + 'Duels contre les anciens poids, par paires depuis de vraies positions : '
    + D.map(function(d){ return d.cadre + ' <b>' + (d.elo >= 0 ? '+' : '') + d.elo + ' ± ' + d.marge + ' Elo</b> (' + String(d.points).replace('.', ',') + ' points sur ' + d.sur + ')'; }).join(' ; ') + '.';
  const M = (typeof AI_TEXEL_MARCHES !== 'undefined') ? AI_TEXEL_MARCHES : [];
  const e = function(x){ return (x.elo >= 0 ? '+' : '') + x.elo + ' ± ' + x.marge; };
  if (M.length) h += ' Les marches entre niveaux (Elo) : ' + M.map(function(m){ return m.marche + ' <b>' + e(m) + '</b>' + (m.avant ? ' (avant : ' + e(m.avant) + ')' : ''); }).join(' ; ') + '.';
  h += ' Le Labo (onglet Auto-amélioration) part de ces poids : ce qu’il adopte les remplace à ces niveaux, sur ton appareil.';
  if (_labChampionAdopte()) h += ' <b>C’est le cas ici</b> : ton champion du Labo joue à partir du niveau ' + AI_NIVEAU_TEXEL + '.';
  return h + '</div>';
}
function renderTexel(msg){
  const hote = document.getElementById('lab-texel-host'); if (!hote) return;
  const r = texelResultat(), c = texelCfg(), W = grLargeur(hote, 640);
  const pct = function(x){ return grPct(x, 1); };
  const err = function(x){ return x == null ? '—' : x.toFixed(4).replace('.', ','); };
  let h = '<p class="lab-intro">On prend des positions de vraies parties dont on connaît le gagnant, et on cherche les réglages pour lesquels l’évaluation de l’IA <b>devine le mieux qui va gagner</b>. C’est la « méthode Texel », celle des moteurs d’échecs. Pas de partie à jouer : un peu de calcul, sur ton appareil.</p>'
    + '<p class="lab-intro">Les parties dont le numéro finit par 0 ou 5 ne servent pas au réglage : on les garde pour <b>vérifier</b>. Et deviner le gagnant ne prouve pas qu’on joue mieux : le bouton « Vérifier en duels » fait affronter les poids trouvés au champion, et rien n’est adopté sans ce verdict.</p>';
  h += _txHtmlDansIA();
  h += '<div class="gr-filtres"><label>Positions de ' + _txSelect('dispo', c) + '</label><label>Moment ' + _txSelect('phase', c) + '</label><label>Rappel vers le champion ' + _txSelect('rappel', c) + '</label><label>Étapes ' + _txSelect('etapes', c) + '</label></div>';
  h += '<div class="lab-actions"><button class="ctrl-btn" onclick="lancerTexel()"' + (_txEnCours ? ' disabled' : '') + '>' + (_txEnCours ? '⏳ Calcul en cours…' : (r ? '↻ Recalculer' : '▶ Lancer le réglage')) + '</button>'
    + (r && !_txEnCours ? '<button class="ctrl-btn" onclick="texelEnDuels()">⚔️ Vérifier en duels contre le champion</button>' : '') + '</div>';
  if (msg) h += '<div class="lab-etat">' + msg + '</div>';
  if (r) {
    const rc = r.cfg || TEXEL_CFG_DEFAUT;
    h += '<div class="lab-note">Dernier réglage : ' + TEXEL_LIBELLES.dispo[rc.dispo] + ', ' + TEXEL_LIBELLES.phase[rc.phase] + ', rappel ' + TEXEL_LIBELLES.rappel[rc.rappel] + ', ' + TEXEL_LIBELLES.etapes[rc.etapes] + ' étapes · ' + new Date(r.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) + '</div>';
    h += grTuiles([
      { lab: 'Bon gagnant deviné', v: pct(r.avant.juste) + ' → ' + pct(r.apres.juste), sous: 'positions de contrôle, parties non nulles' },
      { lab: 'Erreur de prévision', v: err(r.avant.ctl) + ' → ' + err(r.apres.ctl), sous: (r.apres.ctl < r.avant.ctl ? '−' + Math.round(100 * (1 - r.apres.ctl / r.avant.ctl)) + ' %' : 'pas d’amélioration') + ' · billes seules : ' + err(r.materiel.ctl) },
      { lab: 'Positions', v: grNb(r.nApp) + ' + ' + grNb(r.nCtl), sous: 'réglage + contrôle' },
      { lab: 'Écart d’apprentissage', v: err(r.apres.app) + ' / ' + err(r.apres.ctl), sous: 'erreur réglage / contrôle : proches = pas de par-cœur' }
    ]);
    if (r.calib) {
      const serie = function(B){ return B.filter(function(x){ return x.n >= 20; }).map(function(x){ return [Math.round(1000 * x.p) / 10, Math.round(1000 * x.r) / 10]; }); };
      h += '<div class="gr-titre">Gagnant prévu, gagnant réel</div><div class="gr-sous">Les positions de contrôle, rangées par chances de gagner prévues (en abscisse) ; en ordonnée, la part vraiment gagnée. Sur la diagonale, la prévision est juste.</div>';
      h += grLignes(W, [{ nom: 'Champion', couleur: GR_REF, pts: serie(r.calib.avant), points: true }, { nom: 'Texel', couleur: GR_OR, pts: serie(r.calib.apres), points: true }],
        { xMin: 0, xMax: 100, yMin: 0, yMax: 100, diag: true, fmtX: function(v){ return v + ' %'; }, fmtY: function(v){ return v + ' %'; }, titreX: 'chances de gagner prévues', nomX: 'Prévu', aria: 'Courbe de calibration' });
      h += grChiffres(['Prévu (champion)', 'Réel', 'Positions', 'Prévu (Texel)', 'Réel', 'Positions'], r.calib.avant.map(function(x, i){ const y = r.calib.apres[i]; return [x.n ? grPct(x.p, 1) : '—', x.n ? grPct(x.r, 1) : '—', x.n || 0, y.n ? grPct(y.p, 1) : '—', y.n ? grPct(y.r, 1) : '—', y.n || 0]; }));
    }
    if (r.importance) {
      h += '<div class="gr-titre">De combien chaque critère fait bouger l’évaluation</div><div class="gr-sous">Poids × écart-type du critère sur les positions, en points d’évaluation (une bille vaut 2 000). Gris : champion ; or : Texel.</div>';
      const it = []; r.cles.forEach(function(k, j){ const a = r.importance.avant[j], b = r.importance.apres[j]; if (a < 0.5 && b < 0.5) return;
        it.push({ lab: LAB_NOMS[k] || k, v: a, couleur: GR_REF, tip: (LAB_NOMS[k] || k) + ' · champion : ' + grNb(a) + ' points' }, { lab: '', v: b, couleur: GR_OR, tip: (LAB_NOMS[k] || k) + ' · Texel : ' + grNb(b) + ' points' }); });
      h += grBarres(it, { fmt: function(v){ return grNb(v); } }) + grLegende([{ nom: 'Champion', couleur: GR_REF }, { nom: 'Texel', couleur: GR_OR }]);
    }
    if (r.phases) {
      h += '<div class="gr-titre">Erreur selon le moment de la partie</div><div class="gr-sous">Plus bas = mieux. Positions de contrôle de chaque moment.</div>';
      const it = []; ['debut', 'milieu', 'fin'].forEach(function(ph){ const x = r.phases[ph]; if (!x || x.avant == null) return;
        it.push({ lab: { debut: 'Début', milieu: 'Milieu', fin: 'Fin' }[ph], v: x.avant, couleur: GR_REF, txt: err(x.avant) }, { lab: '', v: x.apres, couleur: GR_OR, txt: err(x.apres) }); });
      h += grBarres(it, {}) + grLegende([{ nom: 'Champion', couleur: GR_REF }, { nom: 'Texel', couleur: GR_OR }]);
    }
    h += '<div class="gr-titre">Les poids</div><table class="lab-poids"><thead><tr><th>Critère</th><th>Champion</th><th>Texel</th><th></th></tr></thead><tbody>';
    r.cles.forEach(function(k, j){
      const a = r.w0[j], b = r.w[j], max = SPSA_MAX[k] || 1;
      h += '<tr><td>' + (LAB_NOMS[k] || k) + '</td><td>' + _labNombre(a) + '</td><td' + (Math.abs(b - a) > 0.05 * max ? ' class="lab-change"' : '') + '>' + _labNombre(b) + '</td>'
        + '<td class="lab-barres"><span style="width:' + Math.round(100 * a / max) + '%"></span><span class="b" style="width:' + Math.round(100 * b / max) + '%"></span></td></tr>';
    });
    h += '</tbody></table><div class="lab-note">Barres : champion en haut, Texel en bas, sur toute la plage permise pour ce critère.</div>';
    const H = texelHistorique();
    if (H.length > 1) {
      h += '<div class="gr-titre">Tes réglages précédents</div><div class="gr-carte-cadre"><table class="lab-poids"><thead><tr><th>Quand</th><th>Réglages</th><th>Bon gagnant</th><th>Erreur</th></tr></thead><tbody>'
        + H.map(function(x){ const q = x.cfg || TEXEL_CFG_DEFAUT; return '<tr><td>' + new Date(x.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) + '</td><td><small>' + TEXEL_LIBELLES.dispo[q.dispo] + ', ' + TEXEL_LIBELLES.phase[q.phase] + ', rappel ' + TEXEL_LIBELLES.rappel[q.rappel] + ', ' + q.etapes + ' ét.</small></td><td>' + pct(x.juste[0]) + ' → ' + pct(x.juste[1]) + '</td><td>' + err(x.err[0]) + ' → ' + err(x.err[1]) + '</td></tr>'; }).join('')
        + '</tbody></table></div>';
    }
  }
  hote.innerHTML = h;
  grSurRedim('texel', 'lab-texel-host', function(){ renderTexel(); });
}
function _labNombre(x){ return (Math.round(x * 10) / 10).toLocaleString('fr-FR'); }
