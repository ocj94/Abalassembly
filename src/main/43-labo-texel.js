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
    st.m[k] = b1 * st.m[k] + (1 - b1) * g[k]; st.v[k] = b2 * st.v[k] + (1 - b2) * g[k] * g[k];
    const mh = st.m[k] / (1 - Math.pow(b1, st.t)), vh = st.v[k] / (1 - Math.pow(b2, st.t));
    st.w[k] = Math.min(st.max[k], Math.max(st.min[k], st.w[k] - st.pas[k] * mh / (Math.sqrt(vh) + 1e-12)));
  }
}
const TEXEL_ETAPES = 800;

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
    const I = _lpTexelIndices(), cles = _labCles();
    const tous = I.app.concat(I.ctl), nApp = I.app.length;
    renderTexel('⏳ Calcul des termes de l’évaluation sur ' + tous.length.toLocaleString('fr-FR') + ' positions…');
    return _txTermes(tous, cles, function(x){ renderTexel('⏳ Calcul des termes de l’évaluation : ' + Math.round(100 * x) + ' %'); }).then(function(T){
      const K = cles.length;
      const A = { f: T.f.subarray(0, nApp * K), m: T.m.subarray(0, nApp) }, C = { f: T.f.subarray(nApp * K), m: T.m.subarray(nApp) };
      const RA = I.app.map(_txResultatPour), RC = I.ctl.map(_txResultatPour);
      const ch = _labComplet(labLoad().champion), w0 = cles.map(function(k){ return ch[k]; });
      const s = _txEchelle(A, RA, w0);
      const st = { w: w0.slice(), m: new Array(K).fill(0), v: new Array(K).fill(0), t: 0,
        min: cles.map(function(k){ return SPSA_MIN[k]; }), max: cles.map(function(k){ return SPSA_MAX[k]; }),
        pas: cles.map(function(k){ return (SPSA_MAX[k] - SPSA_MIN[k]) / 400; }) };
      // l'ajustement par tranches : la page reste utilisable pendant le calcul
      return new Promise(function(fin){
        const tranche = function(){
          for (let j = 0; j < 20 && st.t < TEXEL_ETAPES; j++) _txEtape(A, RA, s, st);
          renderTexel('⏳ Ajustement des poids : ' + Math.round(100 * st.t / TEXEL_ETAPES) + ' %');
          if (st.t < TEXEL_ETAPES) setTimeout(tranche, 0); else fin();
        };
        tranche();
      }).then(function(){
        const zero = new Array(K).fill(0);
        const res = { v: 1, date: Date.now(), cles: cles, s: s, nApp: RA.length, nCtl: RC.length,
          w0: w0, w: st.w.map(function(x){ return Math.round(x * 10) / 10; }),
          avant: { app: _txErreur(A, RA, w0, s), ctl: _txErreur(C, RC, w0, s), juste: _txJuste(C, RC, w0) },
          materiel: { ctl: _txErreur(C, RC, zero, s), juste: _txJuste(C, RC, zero) } };
        res.apres = { app: _txErreur(A, RA, res.w, s), ctl: _txErreur(C, RC, res.w, s), juste: _txJuste(C, RC, res.w) };
        try { localStorage.setItem(TEXEL_CLE, JSON.stringify(res)); } catch (e) {}
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

function renderTexel(msg){
  const hote = document.getElementById('lab-texel-host'); if (!hote) return;
  const r = texelResultat();
  const pct = function(x){ return (Math.round(1000 * x) / 10).toLocaleString('fr-FR') + ' %'; };
  const err = function(x){ return x.toFixed(4).replace('.', ','); };
  let h = '<p class="lab-intro">On prend des positions de vraies parties dont on connaît le gagnant, et on cherche les réglages pour lesquels l’évaluation de l’IA <b>devine le mieux qui va gagner</b>. C’est la « méthode Texel », celle des moteurs d’échecs. Pas de partie à jouer : un peu de calcul, sur ton appareil.</p>'
    + '<p class="lab-intro">Les parties dont le numéro finit par 0 ou 5 ne servent pas au réglage : on les garde pour <b>vérifier</b>. Et deviner le gagnant ne prouve pas qu’on joue mieux : le bouton « Vérifier en duels » fait affronter les poids trouvés au champion, et rien n’est adopté sans ce verdict.</p>';
  h += '<div class="lab-actions"><button class="ctrl-btn" onclick="lancerTexel()"' + (_txEnCours ? ' disabled' : '') + '>' + (_txEnCours ? '⏳ Calcul en cours…' : (r ? '↻ Recalculer' : '▶ Lancer le réglage')) + '</button>'
    + (r && !_txEnCours ? '<button class="ctrl-btn" onclick="texelEnDuels()">⚔️ Vérifier en duels contre le champion</button>' : '') + '</div>';
  if (msg) h += '<div class="lab-etat">' + msg + '</div>';
  if (r) {
    h += '<div class="lab-chiffres">'
      + '<div><span>Bon gagnant deviné</span><b>' + pct(r.avant.juste) + ' → ' + pct(r.apres.juste) + '</b><small>positions de contrôle, parties non nulles</small></div>'
      + '<div><span>Erreur de prévision</span><b>' + err(r.avant.ctl) + ' → ' + err(r.apres.ctl) + '</b><small>' + (r.apres.ctl < r.avant.ctl ? '−' + Math.round(100 * (1 - r.apres.ctl / r.avant.ctl)) + ' %' : 'pas d’amélioration') + ' · billes seules : ' + err(r.materiel.ctl) + '</small></div>'
      + '<div><span>Positions</span><b>' + r.nApp.toLocaleString('fr-FR') + ' + ' + r.nCtl.toLocaleString('fr-FR') + '</b><small>réglage + contrôle · ' + new Date(r.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) + '</small></div>'
      + '</div>';
    h += '<table class="lab-poids"><thead><tr><th>Critère</th><th>Champion</th><th>Texel</th><th></th></tr></thead><tbody>';
    r.cles.forEach(function(k, j){
      const a = r.w0[j], b = r.w[j], max = SPSA_MAX[k] || 1;
      h += '<tr><td>' + (LAB_NOMS[k] || k) + '</td><td>' + _labNombre(a) + '</td><td' + (Math.abs(b - a) > 0.05 * max ? ' class="lab-change"' : '') + '>' + _labNombre(b) + '</td>'
        + '<td class="lab-barres"><span style="width:' + Math.round(100 * a / max) + '%"></span><span class="b" style="width:' + Math.round(100 * b / max) + '%"></span></td></tr>';
    });
    h += '</tbody></table><div class="lab-note">Barres : champion en haut, Texel en bas, sur toute la plage permise pour ce critère.</div>';
  }
  hote.innerHTML = h;
}
function _labNombre(x){ return (Math.round(x * 10) / 10).toLocaleString('fr-FR'); }
