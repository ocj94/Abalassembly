/* ═══════════════════════════════════════════
   LABO : COMME LES HUMAINS, ET CONTRE TOI (v2.70)
   Demande d'ocj94 : « les 6 » -- 4e et 5e outils.

   4. Comme les humains
      - Concordance : sur des positions de vraies parties, combien de fois l'IA
        de chaque niveau joue le coup que le joueur a joue.
      - Poids « humains » : les poids pour lesquels le coup humain est le plus
        probable. Modele : chaque coup legal est evalue un coup plus loin (du
        point de vue du joueur), et choisi avec une probabilite proportionnelle
        a e^(beta x evaluation) -- le modele classique de « prediction du coup ».
        beta est regle sur les poids du champion puis fixe ; les poids sont ajustes
        (maximum de vraisemblance, Adam), rappeles vers ceux du champion d'autant plus
        fort qu'il y a peu de positions. Le style
        « Humain » de la configuration joue avec ces poids, a la profondeur du
        niveau choisi.

   5. Contre toi
      - Ton clone : le meme reglage, mais sur TES coups (ton historique, parties
        importees comprises). Il donne tes priorites : ce que tu valorises.
      - Puis chaque style affronte ton clone (qui joue avec tes priorites, a la
        meme profondeur que lui), par paires depuis de vraies positions : le
        style qui le bat le mieux devient le style « Contre moi ».
═══════════════════════════════════════════ */
const HUMAIN_CLE = 'abaLabHumain', CONC_CLE = 'abaLabConcordance', CLONE_CLE = 'abaLabClone', CONTREMOI_CLE = 'abaLabContreMoi';
let _huEnCours = null;   // 'concordance' | 'humain' | 'clone' : un calcul a la fois

function _huLire(cle){ try { const r = JSON.parse(localStorage.getItem(cle) || 'null'); return (r && r.v === 1) ? r : null; } catch (e) { return null; } }
function _huEcrire(cle, r){ try { localStorage.setItem(cle, JSON.stringify(r)); } catch (e) {} }

/* ─── Le travail des fils de calcul, par lots ─── */
function _huFils(type, lots, message, surLot, surProgres){
  return new Promise(function(ok, ko){
    const nbFils = Math.max(1, Math.min(lots.length, _labNbFils()));
    const fils = [];
    for (let i = 0; i < nbFils; i++) { let x = null; try { x = _txCreerFil(); } catch (e) {} if (x && x.w) fils.push(x); }
    if (!fils.length) { ko(new Error('fil de calcul indisponible')); return; }
    let faits = 0, prochain = 0, fini = false;
    const tuer = function(){ fils.forEach(function(x){ try { x.w.onmessage = null; x.w.terminate(); } catch (e) {} try { if (x.url) URL.revokeObjectURL(x.url); } catch (e) {} }); };
    const envoyer = function(x){ if (prochain >= lots.length) return; const j = prochain++; const m = message(lots[j], j); m.id = j; x.w.postMessage(m); };
    fils.forEach(function(x){
      x.w.onmessage = function(e){
        const d = e.data; if (!d || !d[type] || fini) return;
        if (d.error) { fini = true; tuer(); ko(new Error(d.error)); return; }
        surLot(d.id, d); faits++;
        if (surProgres) surProgres(faits / lots.length);
        if (faits === lots.length) { fini = true; tuer(); ok(); return; }
        envoyer(x);
      };
      envoyer(x);
    });
  });
}
function _huLots(L, taille){ const o = []; for (let a = 0; a < L.length; a += taille) o.push(L.slice(a, a + taille)); return o; }
// un echantillon regulier (toujours le meme)
function _huEchantillon(L, n){ if (L.length <= n) return L.slice(); const o = []; for (let j = 0; j < n; j++) o.push(L[Math.floor((j + 0.5) * L.length / n)]); return o; }
function _huCoupCode(c){ return c.a | (c.b << 6) | (c.d << 12); }

/* ─── Le modele de prediction du coup ───
   D = { nb[i] coups legaux, joue[i] rang du coup joue, f (termes apres chaque coup), m (materiel) } */
function _huParPosition(D, w, beta, cb){
  const K = w.length; let o = 0;
  for (let i = 0; i < D.nb.length; i++) {
    const n = D.nb[i];
    if (D.joue[i] >= 0 && n > 0) {
      const z = new Float64Array(n); let mx = -Infinity;
      for (let k = 0; k < n; k++) { let e = D.m[o + k]; for (let j = 0; j < K; j++) e += w[j] * D.f[(o + k) * K + j]; z[k] = e; if (beta * e > mx) mx = beta * e; }
      cb(i, o, n, z, mx);
    }
    o += n;
  }
}
function _huMesures(D, w, beta){
  let nll = 0, top = 0, n = 0;
  _huParPosition(D, w, beta, function(i, o, nb, z, mx){
    let s = 0, best = 0; for (let k = 0; k < nb; k++) { s += Math.exp(beta * z[k] - mx); if (z[k] > z[best]) best = k; }
    nll += -(beta * z[D.joue[i]] - mx - Math.log(s)); if (best === D.joue[i]) top++; n++;
  });
  return { nll: n ? nll / n : 0, top1: n ? top / n : 0, n: n };
}
function _huGradient(D, w, beta){
  const K = w.length, g = new Array(K).fill(0); let gb = 0, n = 0;
  _huParPosition(D, w, beta, function(i, o, nb, z, mx){
    const p = new Float64Array(nb); let s = 0; for (let k = 0; k < nb; k++) { p[k] = Math.exp(beta * z[k] - mx); s += p[k]; }
    let ez = 0; for (let k = 0; k < nb; k++) { p[k] /= s; ez += p[k] * z[k]; }
    const h = D.joue[i];
    for (let j = 0; j < K; j++) { let ef = 0; for (let k = 0; k < nb; k++) ef += p[k] * D.f[(o + k) * K + j]; g[j] += -beta * (D.f[(o + h) * K + j] - ef); }
    gb += -(z[h] - ez); n++;
  });
  for (let j = 0; j < K; j++) g[j] /= Math.max(1, n);
  return { g: g, gb: gb / Math.max(1, n) };
}
// beta : la meilleure vraisemblance avec les poids du champion, puis FIXE -- sinon beta et les poids
// peuvent grandir ou retrecir ensemble sans rien changer aux probabilites (mesure : avec 529 coups,
// les poids partaient aux bornes). Le rappel vers les poids du champion (lambda) est d'autant plus fort
// qu'il y a peu de positions.
function _huBetaDepart(D, w){ let lo = Math.log(1e-5), hi = Math.log(0.05); for (let it = 0; it < 40; it++) { const a = lo + (hi - lo) / 3, b = hi - (hi - lo) / 3; if (_huMesures(D, w, Math.exp(a)).nll < _huMesures(D, w, Math.exp(b)).nll) hi = b; else lo = a; } return Math.exp((lo + hi) / 2); }
const HU_ETAPES = 300, HU_LAMBDA = 0.2;
function _huLambda(n){ return Math.min(1, HU_LAMBDA * Math.sqrt(2500 / Math.max(1, n))); }
// ajuste les poids par tranches (la page reste utilisable) ; renvoie une promesse
function _huAjuster(D, cles, w0, surProgres){
  const K = cles.length, beta = _huBetaDepart(D, w0), lam = _huLambda(D.nb.length);
  const st = { w: w0.slice(), m: new Array(K).fill(0), v: new Array(K).fill(0), t: 0 };
  const min = cles.map(function(k){ return SPSA_MIN[k]; }), max = cles.map(function(k){ return SPSA_MAX[k]; }), pas = cles.map(function(k){ return (SPSA_MAX[k] - SPSA_MIN[k]) / 300; });
  return new Promise(function(fin){
    const tranche = function(){
      for (let r = 0; r < 5 && st.t < HU_ETAPES; r++) {
        const G = _huGradient(D, st.w, beta), b1 = 0.9, b2 = 0.999; st.t++;
        for (let j = 0; j < K; j++) {
          const g = G.g[j] + 2 * lam * (st.w[j] - w0[j]) / ((max[j] - min[j]) * (max[j] - min[j]));
          st.m[j] = b1 * st.m[j] + (1 - b1) * g; st.v[j] = b2 * st.v[j] + (1 - b2) * g * g;
          const mh = st.m[j] / (1 - Math.pow(b1, st.t)), vh = st.v[j] / (1 - Math.pow(b2, st.t));
          st.w[j] = Math.min(max[j], Math.max(min[j], st.w[j] - pas[j] * mh / (Math.sqrt(vh) + 1e-12)));
        }
      }
      if (surProgres) surProgres(st.t / HU_ETAPES);
      if (st.t < HU_ETAPES) setTimeout(tranche, 0); else fin({ w: st.w, beta: beta, beta0: beta, lambda: lam });
    };
    tranche();
  });
}
// termes de chaque coup legal, pour des positions {s,t,cb,cw} et le code du coup joue
function _huDonnees(positions, coups, cles, surProgres){
  const lots = _huLots(positions.map(function(p, i){ return i; }), 150), parts = [];
  return _huFils('coupsTermes', lots, function(L){ return { coupsTermes: true, cles: cles, positions: L.map(function(i){ return positions[i]; }), coups: L.map(function(i){ return coups[i]; }) }; },
    function(j, d){ parts[j] = d; }, surProgres).then(function(){
    const K = cles.length; let tot = 0; parts.forEach(function(p){ tot += p.m.length; });
    const D = { nb: [], joue: [], f: new Float32Array(tot * K), m: new Float32Array(tot) }; let o = 0;
    parts.forEach(function(p){ D.nb = D.nb.concat(p.nb); D.joue = D.joue.concat(p.joue); D.f.set(p.f, o * K); D.m.set(p.m, o); o += p.m.length; });
    return D;
  });
}
function _huSousEnsemble(D, garder, K){
  // garde les positions i ou garder(i) est vrai
  const out = { nb: [], joue: [], f: null, m: null }, fs = [], ms = []; let o = 0;
  for (let i = 0; i < D.nb.length; i++) { const n = D.nb[i]; if (garder(i)) { out.nb.push(n); out.joue.push(D.joue[i]); fs.push(D.f.subarray(o * K, (o + n) * K)); ms.push(D.m.subarray(o, o + n)); } o += n; }
  let tot = 0; ms.forEach(function(x){ tot += x.length; });
  out.f = new Float32Array(tot * K); out.m = new Float32Array(tot); let p = 0;
  for (let q = 0; q < ms.length; q++) { out.f.set(fs[q], p * K); out.m.set(ms[q], p); p += ms[q].length; }
  return out;
}
// regle un modele sur des positions (apprentissage / controle) ; renvoie le resultat a enregistrer
function _huRegler(positions, coups, controle, surEtat){
  const cles = _labCles(), K = cles.length;
  surEtat('⏳ Termes de chaque coup possible sur ' + positions.length + ' positions…');
  return _huDonnees(positions, coups, cles, function(x){ surEtat('⏳ Termes de chaque coup possible : ' + Math.round(100 * x) + ' %'); }).then(function(D){
    const A = _huSousEnsemble(D, function(i){ return !controle[i]; }, K), C = _huSousEnsemble(D, function(i){ return controle[i]; }, K);
    const ch = _labComplet(labLoad().champion), w0 = cles.map(function(k){ return ch[k]; });
    return _huAjuster(A, cles, w0, function(x){ surEtat('⏳ Ajustement : ' + Math.round(100 * x) + ' %'); }).then(function(R){
      return { v: 1, date: Date.now(), cles: cles, w: R.w.map(function(x){ return Math.round(x * 10) / 10; }), beta: R.beta, w0: w0, beta0: R.beta0, lambda: R.lambda,
        nApp: A.nb.length, nCtl: C.nb.length, avant: _huMesures(C, w0, R.beta0), apres: _huMesures(C, R.w, R.beta) };
    });
  });
}

/* ─── Les presets des styles « Humain » et « Contre moi » (configuration de partie) ─── */
function _huPreset(nom, label, cles, w){
  const p = _labComplet(AI_WEIGHT_PRESETS.balanced);
  cles.forEach(function(k, j){ p[k] = w[j]; });
  p.label = label; AI_WEIGHT_PRESETS[nom] = p;
}
function laboStylesSetup(){
  const h = _huLire(HUMAIN_CLE), c = _huLire(CONTREMOI_CLE);
  if (h) _huPreset('humain', 'Humain (Labo)', h.cles, h.w); else delete AI_WEIGHT_PRESETS.humain;
  if (c) _huPreset('contremoi', 'Contre moi (Labo)', c.cles, c.w); else delete AI_WEIGHT_PRESETS.contremoi;
  const bh = document.getElementById('setup-style-humain'), bc = document.getElementById('setup-style-contremoi');
  if (bh) bh.style.display = h ? '' : 'none';
  if (bc) bc.style.display = c ? '' : 'none';
}

/* ─── 4a. Concordance par niveau ─── */
const CONC_POSITIONS = 200;
function lancerConcordance(){
  if (_huEnCours) return;
  const el = document.getElementById('lab-conc-haut'), haut = el ? parseInt(el.value, 10) : 4;
  _huEnCours = 'concordance'; renderHumains('⏳ Chargement des positions…');
  ensureLaboPositions().then(function(ok){
    if (!ok) throw new Error('positions du corpus illisibles sur ce navigateur');
    const L = []; for (let i = 0; i < _lpN(); i++) if (!_lpEstDepart(i) && _lpPartie(i) % 5 === 0) L.push(i);
    const P = _huEchantillon(L, CONC_POSITIONS), pos = P.map(_lpPourFil), humains = P.map(function(i){ return _huCoupCode(_lpCoup(i)); });
    const facons = [];
    for (let n = 1; n <= haut; n++) facons.push({ nom: 'Niveau ' + n, w: _labComplet(_aiPoidsNiveau(n)), cfg: _niveauCfg(n) });   // v2.75 : les poids du niveau
    if (AI_WEIGHT_PRESETS.humain) facons.push({ nom: 'Humain, niveau 3', w: _labComplet(AI_WEIGHT_PRESETS.humain), cfg: _niveauCfg(3) });
    const lots = []; facons.forEach(function(f, fi){ _huLots(pos.map(function(p, i){ return i; }), 20).forEach(function(L2){ lots.push({ fi: fi, L: L2 }); }); });
    const egal = facons.map(function(){ return 0; }), vus = facons.map(function(){ return 0; });
    return _huFils('choixCoups', lots, function(lot){ const f = facons[lot.fi]; return { choixCoups: true, positions: lot.L.map(function(i){ return pos[i]; }), w: f.w, cfg: f.cfg, seed: 17 + lot.fi }; },
      function(j, d){ const lot = lots[j]; d.coups.forEach(function(c, k){ vus[lot.fi]++; if (c === humains[lot.L[k]]) egal[lot.fi]++; }); },
      function(x){ renderHumains('⏳ Chaque niveau cherche son coup sur ' + P.length + ' positions : ' + Math.round(100 * x) + ' %'); }).then(function(){
      _huEcrire(CONC_CLE, { v: 1, date: Date.now(), n: P.length, facons: facons.map(function(f, i){ return { nom: f.nom, egal: egal[i], vus: vus[i] }; }) });
      _huEnCours = null; renderHumains();
    });
  }).catch(function(e){ _huEnCours = null; renderHumains('❌ ' + (e && e.message || e)); });
}

/* ─── 4b. Les poids « humains » ─── */
const HU_APP = 2500, HU_CTL = 800;
function lancerPoidsHumains(){
  if (_huEnCours) return;
  _huEnCours = 'humain'; renderHumains('⏳ Chargement des positions…');
  ensureLaboPositions().then(function(ok){
    if (!ok) throw new Error('positions du corpus illisibles sur ce navigateur');
    const app = [], ctl = [];
    for (let i = 0; i < _lpN(); i++) { if (_lpEstDepart(i)) continue; (_lpPartie(i) % 5 === 0 ? ctl : app).push(i); }
    const P = _huEchantillon(app, HU_APP).concat(_huEchantillon(ctl, HU_CTL));
    const controle = P.map(function(i, j){ return j >= Math.min(app.length, HU_APP); });
    return _huRegler(P.map(_lpPourFil), P.map(function(i){ return _huCoupCode(_lpCoup(i)); }), controle, renderHumains).then(function(r){
      _huEcrire(HUMAIN_CLE, r); laboStylesSetup(); _huEnCours = null; renderHumains();
    });
  }).catch(function(e){ _huEnCours = null; renderHumains('❌ ' + (e && e.message || e)); });
}
function effacerPoidsHumains(){ try { localStorage.removeItem(HUMAIN_CLE); } catch (e) {} laboStylesSetup(); renderHumains(); }

function _huTableauPoids(r, titre){
  let h = '<table class="lab-poids"><thead><tr><th>Critère</th><th>Champion</th><th>' + titre + '</th><th></th></tr></thead><tbody>';
  r.cles.forEach(function(k, j){
    const a = r.w0[j], b = r.w[j], max = SPSA_MAX[k] || 1;
    h += '<tr><td>' + (LAB_NOMS[k] || k) + '</td><td>' + _labNombre(a) + '</td><td' + (Math.abs(b - a) > 0.05 * max ? ' class="lab-change"' : '') + '>' + _labNombre(b) + '</td>'
      + '<td class="lab-barres"><span style="width:' + Math.round(100 * a / max) + '%"></span><span class="b" style="width:' + Math.round(100 * b / max) + '%"></span></td></tr>';
  });
  return h + '</tbody></table>';
}
function _huPct(x){ return (Math.round(1000 * x) / 10).toLocaleString('fr-FR') + ' %'; }
function renderHumains(msg){
  const hote = document.getElementById('lab-humains-host'); if (!hote) return;
  const c = _huLire(CONC_CLE), r = _huLire(HUMAIN_CLE);
  let h = '<h4 class="lab-sous">Combien de fois l’IA joue-t-elle le coup du joueur ?</h4>'
    + '<p class="lab-intro">Sur ' + CONC_POSITIONS + ' positions de vraies parties (des parties qui ne servent à aucun réglage), chaque niveau de l’IA cherche son coup, avec sa vraie profondeur et son vrai temps. On compte les fois où c’est celui que le joueur a joué.</p>';
  const hautConc = (function(){ const el = document.getElementById('lab-conc-haut'); return el && el.value ? parseInt(el.value, 10) : 4; })();
  h += '<div class="lab-options"><label>Jusqu’au niveau <select id="lab-conc-haut">' + [3, 4, 5, 6].map(function(n){ return '<option' + (n === hautConc ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label></div>';
  h += '<div class="lab-actions"><button class="ctrl-btn" onclick="lancerConcordance()"' + (_huEnCours ? ' disabled' : '') + '>' + (_huEnCours === 'concordance' ? '⏳ Mesure en cours…' : (c ? '↻ Mesurer à nouveau' : '▶ Mesurer')) + '</button></div>';
  if (msg && _huEnCours === 'concordance') h += '<div class="lab-etat">' + msg + '</div>';
  if (c) {
    h += '<table class="lab-poids"><thead><tr><th>Façon de jouer</th><th>Même coup que le joueur</th><th></th></tr></thead><tbody>';
    c.facons.forEach(function(f){ const p = f.vus ? f.egal / f.vus : 0; h += '<tr><td>' + f.nom + '</td><td>' + _huPct(p) + '<small> (' + f.egal + '/' + f.vus + ')</small></td><td class="lab-barres"><span class="b" style="width:' + Math.round(100 * p) + '%"></span></td></tr>'; });
    h += '</tbody></table><div class="lab-note">Mesuré le ' + new Date(c.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) + '. Une position a souvent plusieurs bons coups : 100 % n’est ni possible ni souhaitable.</div>';
  }
  h += '<h4 class="lab-sous">Des poids « humains »</h4>'
    + '<p class="lab-intro">On cherche les réglages pour lesquels <b>le coup que le joueur a vraiment joué</b> est le plus probable : chaque coup possible est évalué, et un coup est d’autant plus probable que son évaluation est bonne. ' + HU_APP + ' positions pour le réglage, ' + HU_CTL + ' d’autres parties pour vérifier. Le résultat devient le style <b>« Humain (Labo) »</b> dans la configuration de partie : l’IA y cherche à la profondeur du niveau choisi, avec les priorités des joueurs.</p>';
  h += '<div class="lab-actions"><button class="ctrl-btn" onclick="lancerPoidsHumains()"' + (_huEnCours ? ' disabled' : '') + '>' + (_huEnCours === 'humain' ? '⏳ Calcul en cours…' : (r ? '↻ Recalculer' : '▶ Lancer le réglage')) + '</button>'
    + (r && !_huEnCours ? '<button class="ctrl-btn lab-discret" onclick="effacerPoidsHumains()">🗑 Retirer le style Humain</button>' : '') + '</div>';
  if (msg && _huEnCours === 'humain') h += '<div class="lab-etat">' + msg + '</div>';
  if (r) {
    h += '<div class="lab-chiffres"><div><span>Coup du joueur deviné du premier coup</span><b>' + _huPct(r.avant.top1) + ' → ' + _huPct(r.apres.top1) + '</b><small>positions de contrôle, un coup d’avance</small></div>'
      + '<div><span>Vraisemblance (plus bas = mieux)</span><b>' + r.avant.nll.toFixed(3).replace('.', ',') + ' → ' + r.apres.nll.toFixed(3).replace('.', ',') + '</b><small>' + r.nApp + ' + ' + r.nCtl + ' positions</small></div></div>';
    h += _huTableauPoids(r, 'Humain');
  }
  if (msg && !_huEnCours) h += '<div class="lab-etat">' + msg + '</div>';
  hote.innerHTML = h;
}

/* ─── 5. Contre toi ─── */
const CLONE_MIN_COUPS = 120;
// tes coups dans ton historique : la position avant chaque coup que TU as joue
function _huMesCoups(){
  const out = { positions: [], coups: [], partie: [], parties: 0 };
  const L = (typeof getMesParties === 'function') ? getMesParties() : [];
  L.forEach(function(e, gi){
    if (!(e.humanColor === 'black' || e.humanColor === 'white')) return;
    if (!(e.mode === 'ai' || e.mode === 'import')) return;
    const p = (typeof gameCodeParse === 'function') ? gameCodeParse(e.code) : null;
    if (!p || !p.ok || !LAYOUTS[p.layout]) return;
    const bd = {}; LAYOUTS[p.layout].black.forEach(function(x){ bd[x[0] + ',' + x[1]] = 'black'; }); LAYOUTS[p.layout].white.forEach(function(x){ bd[x[0] + ',' + x[1]] = 'white'; });
    const sauve = board; let col = 'black', cb = 0, cw = 0, n = 0;
    try {
      board = bd;
      for (let k = 0; k < p.moves.length; k++) {
        const mv = p.moves[k], info = validateMove(mv.cells, mv.dir, col);
        if (!info || !info.valid) break;
        if (col === e.humanColor && k >= 4) {
          let s = ''; for (let i = 0; i < 61; i++) { const v = board[_LP_CLES[i]]; s += v === 'black' ? 'b' : (v === 'white' ? 'w' : '.'); }
          out.positions.push({ s: s, t: col, cb: cb, cw: cw }); out.coups.push(_lpCoderCoup(mv)); out.partie.push(gi); n++;
        }
        if (abApplyMove(mv.cells, mv.dir, col, info).ejected) { if (col === 'black') cb++; else cw++; }
        col = col === 'black' ? 'white' : 'black';
        if (cb >= 6 || cw >= 6) break;
      }
    } finally { board = sauve; }
    if (n) out.parties++;
  });
  return out;
}
function lancerClone(){
  if (_huEnCours) return;
  const M = _huMesCoups();
  if (M.positions.length < CLONE_MIN_COUPS) { renderContreToi('Il faut au moins ' + CLONE_MIN_COUPS + ' coups joués par toi dans ton historique (parties contre l’IA ou importées) : il y en a ' + M.positions.length + '.'); return; }
  _huEnCours = 'clone';
  // controle : une partie sur 5 (au moins une), sinon un coup sur 5
  const ids = []; M.partie.forEach(function(g){ if (ids.indexOf(g) < 0) ids.push(g); });
  const controle = M.partie.map(function(g, i){ return ids.length >= 5 ? (ids.indexOf(g) % 5 === 4) : (i % 5 === 4); });
  _huRegler(M.positions, M.coups, controle, renderContreToi).then(function(r){
    r.parties = M.parties; r.coups = M.positions.length;
    _huEcrire(CLONE_CLE, r); _huEnCours = null; renderContreToi();
  }).catch(function(e){ _huEnCours = null; renderContreToi('❌ ' + (e && e.message || e)); });
}
BANCS.contremoi = {
  cle: 'abaLabContreToi',
  construire: function(o){
    const cl = _huLire(CLONE_CLE); if (!cl) return null;
    const clone = _labComplet(AI_WEIGHT_PRESETS.balanced); cl.cles.forEach(function(k, j){ clone[k] = cl.w[j]; });
    const paires = Math.max(1, Math.min(20, (o.paires | 0) || 6));
    const P = _styleParticipants().filter(function(p){ return p.nom !== 'Contre moi'; });
    return { matchs: P.map(function(p, i){ return { id: 's' + i, a: p, b: { nom: 'ton clone', w: clone }, paires: paires }; }), paires: paires, depart: o.depart || _bancReglagesLus('contremoi').depart, regime: _bancRegimeDe(o, 'contremoi') };
  },
  rendu: function(s, msg){ renderContreToi(msg); }
};
function lancerContreToi(){ const el = document.getElementById('lab-ct-paires'); bancLancer('contremoi', Object.assign(_bancReglagesLus('contremoi'), { paires: el ? parseInt(el.value, 10) : 6 })); }
function _ctMeilleur(s){
  let best = null;
  s.plan.matchs.forEach(function(m){ const x = _bancPoints(m, s.res[m.id]); if (!x.n) return; const sc = x.pts / x.n; if (!best || sc > best.sc) best = { m: m, sc: sc, x: x }; });
  return best;
}
function adopterContreMoi(){
  const s = bancEtat('contremoi'); if (!s) return;
  const b = _ctMeilleur(s); if (!b) return;
  const cles = LAB_CLES_BASE.concat(LAB_CLES_KAAH);
  _huEcrire(CONTREMOI_CLE, { v: 1, date: Date.now(), nom: b.m.a.nom, cles: cles, w: cles.map(function(k){ return b.m.a.w[k]; }), score: b.sc });
  laboStylesSetup(); renderContreToi();
  showToast('🎯 Style « Contre moi (Labo) » prêt dans la configuration de partie : ' + b.m.a.nom);
}
function retirerContreMoi(){ try { localStorage.removeItem(CONTREMOI_CLE); } catch (e) {} laboStylesSetup(); renderContreToi(); }
function renderContreToi(msg){
  const hote = document.getElementById('lab-contretoi-host'); if (!hote) return;
  const cl = _huLire(CLONE_CLE), s = bancEtat('contremoi'), adopte = _huLire(CONTREMOI_CLE);
  let h = '<p class="lab-intro"><b>1. Ton clone.</b> Le même réglage que les poids « humains », mais sur <b>tes</b> coups : ceux de ton historique (parties contre l’IA et parties importées, KAAH compris). Il donne tes priorités : ce que tu valorises sur le plateau.</p>';
  h += '<div class="lab-actions"><button class="ctrl-btn" onclick="lancerClone()"' + (_huEnCours ? ' disabled' : '') + '>' + (_huEnCours === 'clone' ? '⏳ Calcul en cours…' : (cl ? '↻ Refaire mon clone' : '▶ Faire mon clone')) + '</button></div>';
  if (msg && (_huEnCours === 'clone' || !s)) h += '<div class="lab-etat">' + msg + '</div>';
  if (cl) {
    h += '<div class="lab-chiffres"><div><span>Ton coup deviné du premier coup</span><b>' + _huPct(cl.avant.top1) + ' → ' + _huPct(cl.apres.top1) + '</b><small>sur tes coups gardés pour vérifier</small></div>'
      + '<div><span>D’après</span><b>' + cl.coups + ' coups</b><small>' + cl.parties + ' parties · ' + new Date(cl.date).toLocaleDateString('fr-FR') + '</small></div></div>';
    h += _huTableauPoids(cl, 'Toi');
    h += '<p class="lab-intro"><b>2. Qui te bat le mieux ?</b> Chaque style affronte ton clone (tes priorités, à la même profondeur que lui), par paires depuis de vraies positions de Marguerite belge. Le meilleur peut devenir le style <b>« Contre moi (Labo) »</b> de la configuration de partie.</p>';
    h += '<div class="lab-options"><label>Paires par style <select id="lab-ct-paires">' + [4, 6, 10].map(function(n){ return '<option' + (n === ((s && s.plan.paires) || 6) ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label></div>';
    h += _bancReglages('contremoi');
    h += _bancBoutons('contremoi', s, 'Nouveaux duels', 'lancerContreToi()');
    if (msg && s) h += '<div class="lab-etat">' + msg + '</div>';
    if (s) {
      h += '<div class="lab-etat">' + _bancLigneEtat('contremoi', s) + '</div>';
      const lignes = s.plan.matchs.map(function(m){ const x = _bancPoints(m, s.res[m.id]); return { m: m, x: x, sc: x.n ? x.pts / x.n : -1 }; }).sort(function(a, b){ return b.sc - a.sc; });
      h += '<table class="lab-poids lab-classement"><thead><tr><th>Style</th><th>Contre ton clone</th><th>Elo</th></tr></thead><tbody>';
      lignes.forEach(function(l){ const es = _labEloStrP(s.res[l.m.id].penta); h += '<tr><td>' + l.m.a.nom + '</td><td>' + (l.x.n ? _labNombre(l.x.pts) + ' / ' + l.x.n + ' (' + Math.round(100 * l.sc) + ' %)' : '…') + '</td><td>' + (es || '') + '</td></tr>'; });
      h += '</tbody></table><div class="lab-note">' + _bancLigneReglages(s) + '.</div>';
      // v2.71 : le score de chaque style contre ton clone, avec sa marge
      h += '<div class="gr-titre">Contre ton clone</div><div class="gr-sous">Score de chaque style ; le trait marque 50 %, le trait fin la marge à 95 %.</div>';
      h += grBarres(lignes.filter(function(l){ return l.x.n; }).map(function(l){ const e = _labEloP(s.res[l.m.id].penta), m = e ? Math.min(0.5, 1.96 * Math.sqrt(Math.max(1e-6, l.sc * (1 - l.sc)) / Math.max(1, l.x.n))) : null;
        return { lab: l.m.a.nom, v: l.sc, ref: 0.5, bas: m != null ? Math.max(0, l.sc - m) : null, haut: m != null ? Math.min(1, l.sc + m) : null, txt: grPct(l.sc), tip: l.m.a.nom + ' contre ton clone' + _dimDp() + grNb(l.x.pts) + ' / ' + l.x.n }; }), { max: 1 });
      const b = _ctMeilleur(s);
      if (b && s.fini) h += '<div class="lab-actions"><button class="ctrl-btn" onclick="adopterContreMoi()">🎯 Faire de « ' + b.m.a.nom + ' » mon style « Contre moi »</button></div>';
      h += _bancJournal(s);
    }
  }
  if (adopte) h += '<div class="lab-etat">🎯 Style « Contre moi (Labo) » : ' + adopte.nom + ' (' + Math.round(100 * adopte.score) + ' % contre ton clone), dans la configuration de partie. <button class="ctrl-btn lab-discret" onclick="retirerContreMoi()">Retirer</button></div>';
  hote.innerHTML = h;
}
/* ─── Les onglets de la page Labo ─── */
const LAB_ONGLETS = ['tableau', 'auto', 'texel', 'styles', 'niveaux', 'humains', 'contretoi', 'ouvertures', 'outils'];
function _laboOngletMemo(){ try { const o = localStorage.getItem('abaLabOnglet'); return LAB_ONGLETS.indexOf(o) >= 0 ? o : 'auto'; } catch (e) { return 'auto'; } }
function laboOnglet(nom){
  if (LAB_ONGLETS.indexOf(nom) < 0) nom = 'auto';
  try { localStorage.setItem('abaLabOnglet', nom); } catch (e) {}
  document.querySelectorAll('#lab-onglets button').forEach(function(b){ b.classList.toggle('actif', b.getAttribute('data-onglet') === nom); });
  document.querySelectorAll('#page-lab .lab-zone').forEach(function(z){ z.hidden = z.getAttribute('data-onglet') !== nom; });
  laboRendreOnglet(nom);
}
function laboRendreOnglet(nom){
  const r = { tableau: 'renderLabTableau', auto: 'renderLab', texel: 'renderTexel', styles: 'renderTournoiStyles', niveaux: 'renderNiveaux', humains: 'renderHumains',
    contretoi: 'renderContreToi', ouvertures: 'renderOuvertures', outils: 'renderTestKaah' }[nom];
  if (r && typeof window[r] === 'function') window[r]();
}
// les styles du Labo dans la configuration de partie, des le chargement
laboStylesSetup();
// un banc d'essai qui tournait reprend apres un rechargement (le Labo a sa propre reprise)
try {
  const banc = localStorage.getItem('abaBancAuto');
  if (banc && BANCS[banc] && localStorage.getItem('abaLabAutoRun') !== '1') setTimeout(function(){ if (!_bancActif && !_labRunning) { bancLancer(banc); showToast('🧪 Banc d’essai du Labo repris en arrière-plan'); } }, 5000);
} catch (e) {}
