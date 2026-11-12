/* ═══════════════════════════════════════════
   LES CARTES DES DONNÉES : NUAGES DE POINTS EN 2D ET EN 3D (v3.27)
   Demande d'ocj94 : « data en plusieurs dimensions et couleur pour les stats du
   Labo, du corpus et les stats perso ». Chaque partie (ou chaque mutant, ou
   chaque position) est un point dans un espace de 12 dimensions (16 pour les
   poids du Labo) ; deux méthodes le ramènent sur l'écran :
   - l'ACP (analyse en composantes principales) : instantanée, ses axes ont un
     sens (« plutôt centre », « plutôt bord ») et un nouveau point (une de tes
     parties, une position de l'Analyse) se place sur la carte déjà faite ;
   - t-SNE : regroupe les points qui se ressemblent, révèle mieux les familles ;
     ses axes n'ont pas de sens, seules les distances courtes comptent. Calculé
     dans un fil séparé (Web Worker), sur un échantillon de 1 200 points au plus.
   Le rendu est un canvas maison, en 2D ou en 3D tournante (souris, doigt,
   flèches du clavier), sans bibliothèque. Les cartes : Statistiques du jeu
   (le corpus), Mes statistiques, le Labo (tableau de bord), l'Analyse.
═══════════════════════════════════════════ */

const CARTE_TSNE_MAX = 1200;      // points au plus pour t-SNE (son coût croît comme le carré du nombre de points)
const CARTE_GRIS = '#4a524e';

/* ─── 1. Calcul : centrer-réduire, ACP, t-SNE ─── */

// X : Float64Array n*d (ligne par point). Rend la moyenne et l'écart-type de chaque colonne.
function carteMoments(X, n, d){
  const moy = new Float64Array(d), et = new Float64Array(d);
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) moy[j] += X[i * d + j];
  for (let j = 0; j < d; j++) moy[j] /= Math.max(1, n);
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) { const v = X[i * d + j] - moy[j]; et[j] += v * v; }
  for (let j = 0; j < d; j++) { et[j] = Math.sqrt(et[j] / Math.max(1, n)); if (!(et[j] > 1e-12)) et[j] = 0; }
  return { moy: moy, et: et };
}
// colonne constante (écart-type nul) : mise à zéro, elle ne pèse rien
function carteReduire(X, n, d, M){
  const Z = new Float64Array(n * d);
  for (let i = 0; i < n; i++) for (let j = 0; j < d; j++) Z[i * d + j] = M.et[j] ? (X[i * d + j] - M.moy[j]) / M.et[j] : 0;
  return Z;
}
/* ACP par la méthode de la puissance avec déflation : assez pour 3 axes sur 16 dimensions, et
   déterministe (même départ, même nombre de tours). Les variables sont centrées-réduites : chaque
   dimension pèse autant, quelle que soit son unité. Signe de chaque axe : sa plus forte composante est
   positive, pour qu'un même jeu de données donne toujours la même carte. */
function carteACP(X, n, d, k){
  k = Math.min(k || 3, d);
  const M = carteMoments(X, n, d), Z = carteReduire(X, n, d, M);
  const C = new Float64Array(d * d);
  for (let i = 0; i < n; i++) { const o = i * d; for (let a = 0; a < d; a++) { const za = Z[o + a]; if (!za) continue; for (let b = a; b < d; b++) C[a * d + b] += za * Z[o + b]; } }
  for (let a = 0; a < d; a++) for (let b = a; b < d; b++) { C[a * d + b] /= Math.max(1, n); C[b * d + a] = C[a * d + b]; }
  let total = 0; for (let a = 0; a < d; a++) total += C[a * d + a];
  const axes = [];
  for (let q = 0; q < k; q++) {
    let v = new Float64Array(d); for (let j = 0; j < d; j++) v[j] = 1 + 0.1 * j;
    let lambda = 0;
    for (let it = 0; it < 300; it++) {
      const w = new Float64Array(d);
      for (let a = 0; a < d; a++) { let s = 0; for (let b = 0; b < d; b++) s += C[a * d + b] * v[b]; w[a] = s; }
      let norme = 0; for (let a = 0; a < d; a++) norme += w[a] * w[a]; norme = Math.sqrt(norme);
      if (!(norme > 1e-15)) { lambda = 0; break; }
      let ecart = 0; for (let a = 0; a < d; a++) { const x = w[a] / norme; ecart += Math.abs(x - v[a]); v[a] = x; }
      lambda = norme;
      if (ecart < 1e-12) break;
    }
    let ip = 0; for (let a = 1; a < d; a++) if (Math.abs(v[a]) > Math.abs(v[ip])) ip = a;
    if (v[ip] < 0) for (let a = 0; a < d; a++) v[a] = -v[a];
    axes.push({ poids: v, valeur: lambda, part: total > 0 ? lambda / total : 0 });
    for (let a = 0; a < d; a++) for (let b = 0; b < d; b++) C[a * d + b] -= lambda * v[a] * v[b];   // déflation
  }
  const projeter = function(x){ const out = new Float64Array(k); for (let q = 0; q < k; q++) { let s = 0; for (let j = 0; j < d; j++) if (M.et[j]) s += (x[j] - M.moy[j]) / M.et[j] * axes[q].poids[j]; out[q] = s; } return out; };
  const Y = new Float64Array(n * k);
  for (let i = 0; i < n; i++) for (let q = 0; q < k; q++) { let s = 0; for (let j = 0; j < d; j++) s += Z[i * d + j] * axes[q].poids[j]; Y[i * k + q] = s; }
  return { Y: Y, k: k, axes: axes, moments: M, projeter: projeter };
}

/* t-SNE exact (van der Maaten et Hinton, 2008) : perplexité, exagération précoce, moments, gains.
   Fonction pure, sans rien autour : elle tourne telle quelle dans un Web Worker (son texte est envoyé
   au fil) et dans les tests. Z : données déjà centrées-réduites. Graine fixe : même entrée, même carte. */
function _carteTsneCalcul(Z, n, d, dimOut, perplexite, iterations, graine, rapport){
  let s = graine >>> 0 || 1;
  const hasard = function(){ s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const gauss = function(){ let u = 0, v = 0; while (u === 0) u = hasard(); v = hasard(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const D2 = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { let t = 0; for (let c = 0; c < d; c++) { const x = Z[i * d + c] - Z[j * d + c]; t += x * x; } D2[i * n + j] = t; D2[j * n + i] = t; }
  // P conditionnelles : pour chaque point, la largeur de gaussienne qui donne la perplexité voulue
  const P = new Float64Array(n * n), cible = Math.log(perplexite);
  for (let i = 0; i < n; i++) {
    let beta = 1, bas = -Infinity, haut = Infinity;
    for (let essai = 0; essai < 60; essai++) {
      let somme = 0, sDP = 0;
      for (let j = 0; j < n; j++) { if (j === i) continue; const p = Math.exp(-D2[i * n + j] * beta); P[i * n + j] = p; somme += p; sDP += D2[i * n + j] * p; }
      if (somme === 0) somme = 1e-300;
      const H = Math.log(somme) + beta * sDP / somme;
      for (let j = 0; j < n; j++) P[i * n + j] /= somme;
      const diff = H - cible;
      if (Math.abs(diff) < 1e-5) break;
      if (diff > 0) { bas = beta; beta = haut === Infinity ? beta * 2 : (beta + haut) / 2; }
      else { haut = beta; beta = bas === -Infinity ? beta / 2 : (beta + bas) / 2; }
    }
  }
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const p = Math.max((P[i * n + j] + P[j * n + i]) / (2 * n), 1e-12); P[i * n + j] = p; P[j * n + i] = p; }
  const Y = new Float64Array(n * dimOut), G = new Float64Array(n * dimOut), U = new Float64Array(n * dimOut), gains = new Float64Array(n * dimOut).fill(1);
  for (let i = 0; i < n * dimOut; i++) Y[i] = gauss() * 1e-4;
  const Q = new Float64Array(n * n), eta = Math.max(50, n / 12);
  for (let it = 0; it < iterations; it++) {
    const exag = it < 250 ? 12 : 1, mom = it < 250 ? 0.5 : 0.8;
    let sQ = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      let t = 0; for (let c = 0; c < dimOut; c++) { const x = Y[i * dimOut + c] - Y[j * dimOut + c]; t += x * x; }
      const q = 1 / (1 + t); Q[i * n + j] = q; Q[j * n + i] = q; sQ += 2 * q;
    }
    G.fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if (i === j) continue;
      const q = Q[i * n + j], m = 4 * (exag * P[i * n + j] - q / sQ) * q;
      for (let c = 0; c < dimOut; c++) G[i * dimOut + c] += m * (Y[i * dimOut + c] - Y[j * dimOut + c]);
    }
    for (let i = 0; i < n * dimOut; i++) {
      gains[i] = (Math.sign(G[i]) !== Math.sign(U[i])) ? gains[i] + 0.2 : Math.max(0.01, gains[i] * 0.8);
      U[i] = mom * U[i] - eta * gains[i] * G[i];
      Y[i] += U[i];
    }
    // recentrer : la carte ne dérive pas
    for (let c = 0; c < dimOut; c++) { let m = 0; for (let i = 0; i < n; i++) m += Y[i * dimOut + c]; m /= n; for (let i = 0; i < n; i++) Y[i * dimOut + c] -= m; }
    if (rapport && (it % 25 === 0 || it === iterations - 1)) rapport(it + 1, iterations);
  }
  return Y;
}
// t-SNE dans un fil séparé (la page reste fluide) ; sans Web Worker, sur le fil principal
function carteTSNE(Z, n, d, dimOut, rapport){
  const iters = 600, perp = Math.max(5, Math.min(30, Math.floor((n - 1) / 3)));
  return new Promise(function(resolve, reject){
    let w = null, url = null;
    try {
      if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) throw new Error('pas de Web Worker');
      const src = 'const _carteTsneCalcul = ' + _carteTsneCalcul.toString() + ';\n'
        + 'onmessage = function(e){ const a = e.data; const Y = _carteTsneCalcul(new Float64Array(a.Z), a.n, a.d, a.k, a.perp, a.iters, 20261112, function(i, t){ postMessage({ avance: i / t }); }); postMessage({ Y: Y.buffer }, [Y.buffer]); };';
      url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
      w = new Worker(url);
    } catch (e) {
      try { resolve(_carteTsneCalcul(Z, n, d, dimOut, perp, iters, 20261112, null)); } catch (err) { reject(err); }
      return;
    }
    w.onmessage = function(e){
      if (e.data && e.data.avance != null) { if (rapport) rapport(e.data.avance); return; }
      w.terminate(); if (url) URL.revokeObjectURL(url);
      resolve(new Float64Array(e.data.Y));
    };
    w.onerror = function(e){ w.terminate(); if (url) URL.revokeObjectURL(url); reject(new Error(e && e.message || 't-SNE : erreur du fil')); };
    const copie = Float64Array.from(Z);
    w.postMessage({ Z: copie.buffer, n: n, d: d, k: dimOut, perp: perp, iters: iters }, [copie.buffer]);
  });
}
// un échantillon déterministe de m indices parmi n (pas régulier, décalé par la graine)
function carteEchantillon(n, m, graine){
  if (n <= m) { const t = []; for (let i = 0; i < n; i++) t.push(i); return t; }
  const out = [], pas = n / m, dec = ((graine || 7) % 997) / 997 * pas;
  for (let q = 0; q < m; q++) out.push(Math.min(n - 1, Math.floor(dec + q * pas)));
  return out;
}

/* Calcul d'une carte. base : { X, n, d } (les points de fond, qui font la carte) ; extra : { X, n }
   facultatif (tes parties, la partie analysée), placés sur la même carte. methode : 'acp' | 'tsne' ;
   dim : 2 | 3. Rend { base: [indices de base dessinés], Yb, Ye, k, axes (ACP) }. */
function carteCalculer(base, extra, methode, dim, rapport){
  const d = base.d, ne = extra ? extra.n : 0;
  if (methode !== 'tsne') {
    const A = carteACP(base.X, base.n, d, 3), Ye = new Float64Array(ne * 3);
    for (let i = 0; i < ne; i++) { const p = A.projeter(extra.X.subarray(i * d, (i + 1) * d)); Ye.set(p, i * 3); }
    const idx = []; for (let i = 0; i < base.n; i++) idx.push(i);
    return Promise.resolve({ base: idx, Yb: A.Y, Ye: Ye, k: 3, axes: A.axes });
  }
  const idx = carteEchantillon(base.n, Math.max(50, CARTE_TSNE_MAX - ne), 11);
  const n = idx.length + ne, X = new Float64Array(n * d);
  idx.forEach(function(i, q){ X.set(base.X.subarray(i * d, (i + 1) * d), q * d); });
  for (let i = 0; i < ne; i++) X.set(extra.X.subarray(i * d, (i + 1) * d), (idx.length + i) * d);
  // réduit avec les moments du fond seul : tes parties ne déplacent pas le centre
  const M = carteMoments(base.X, base.n, d), Z = carteReduire(X, n, d, M);
  return carteTSNE(Z, n, d, dim, rapport).then(function(Y){
    return { base: idx, Yb: Y.subarray(0, idx.length * dim), Ye: Y.subarray(idx.length * dim), k: dim, axes: null };
  });
}
// « Axe 1 (34 %) : plus de billes au centre, moins de billes au bord »
function carteDecrireAxe(axe, noms, q){
  const P = Array.from(axe.poids).map(function(v, j){ return { v: v, j: j }; }).sort(function(a, b){ return Math.abs(b.v) - Math.abs(a.v); }).slice(0, 2);
  const mot = function(x){ return (x.v > 0 ? _tr('plus de ', 'more ') : _tr('moins de ', 'less ')) + String(noms[x.j]).toLowerCase(); };
  return _tr('Axe ', 'Axis ') + (q + 1) + ' (' + grNb(100 * axe.part, 0) + ' %) : ' + P.map(mot).join(_tr(', ', ', '));
}

/* ─── 2. Le dessin : un canvas, en 2D ou en 3D tournante ─── */
const _CARTES = {};          // id -> état du dessin (points, rotation, zoom…)
let _cartesPrefs = {};
try { _cartesPrefs = JSON.parse(localStorage.getItem('abaCartes') || '{}') || {}; } catch (e) { _cartesPrefs = {}; }
function cartePref(id, cle, defaut){ const p = _cartesPrefs[id]; return (p && p[cle] != null) ? p[cle] : defaut; }
function _carteGarderPref(id, cle, v){ (_cartesPrefs[id] = _cartesPrefs[id] || {})[cle] = v; try { localStorage.setItem('abaCartes', JSON.stringify(_cartesPrefs)); } catch (e) {} }
// les réglages d'une carte (méthode, vue, couleur) : retenus, puis la carte est redessinée par son module
const _CARTE_REDESSINER = {};
function carteReglage(id, cle, v){
  _carteGarderPref(id, cle, v);
  if (_CARTE_REDESSINER[id]) _CARTE_REDESSINER[id]();
}

/* C : { id, groupes: [{ nom, couleur }], points: [{ x, y, z, g, r?, tip: [lignes], action?: function }],
         lignes?: [{ pts: [indices], couleur, nom, numeros? }], axes: [noms], aria, d3 } */
function carteDessiner(hote, C){
  if (!hote) return;
  const ancien = _CARTES[C.id];
  const E = { C: C, rotY: ancien ? ancien.rotY : -0.6, rotX: ancien ? ancien.rotX : 0.35, zoom: 1, caches: ancien ? ancien.caches : {}, ecran: null, survol: -1 };
  _CARTES[C.id] = E;
  const W = Math.max(280, Math.min(900, grLargeur(hote, 640) - 8)), H = Math.round(Math.min(560, Math.max(300, W * 0.72)));
  const nb = {}; C.points.forEach(function(p){ nb[p.g] = (nb[p.g] || 0) + 1; });
  let h = '<div class="carte-cadre" style="position:relative">';
  h += '<canvas class="carte-canvas" id="carte-cv-' + C.id + '" width="' + W + '" height="' + H + '" style="width:' + W + 'px;height:' + H + 'px;max-width:100%;touch-action:none;cursor:' + (C.d3 ? 'grab' : 'crosshair') + '" tabindex="0" role="img" aria-label="' + grEchapper(C.aria) + '"></canvas>';
  if (C.d3) h += '<div class="carte-boutons"><button type="button" data-click="carteZoom(\'' + C.id + '\', 1.25)" aria-label="' + _tr('Rapprocher', 'Zoom in') + '">+</button><button type="button" data-click="carteZoom(\'' + C.id + '\', 0.8)" aria-label="' + _tr('Éloigner', 'Zoom out') + '">−</button><button type="button" data-click="carteTourner(\'' + C.id + '\')" aria-label="' + _tr('Remettre la vue de départ', 'Reset the view') + '">⟲</button></div>';
  h += '</div><div class="carte-legende" role="group" aria-label="' + _tr('Groupes affichés', 'Shown groups') + '">';
  C.groupes.forEach(function(g, i){
    if (!nb[i]) return;
    const cache = !!E.caches[i];
    h += '<button type="button" aria-pressed="' + (cache ? 'false' : 'true') + '" data-click="carteBasculer(\'' + C.id + '\', ' + i + ')"' + (cache ? ' class="cache"' : '') + '><i style="background:' + g.couleur + '"></i>' + grEchapper(g.nom) + ' <span>' + grNb(nb[i]) + '</span></button>';
  });
  (C.lignes || []).forEach(function(l){ h += '<span class="carte-trait"><i style="background:' + l.couleur + '"></i>' + grEchapper(l.nom) + '</span>'; });
  h += '</div>';
  hote.innerHTML = h;
  const cv = document.getElementById('carte-cv-' + C.id);
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  E.cv = cv; E.W = W; E.H = H; E.dpr = dpr;
  // l'étendue des points : 99,5 % d'entre eux tiennent dans le cadre ; les rares points extrêmes sont posés
  // sur son bord (sinon un seul point lointain tasserait tout le nuage au centre)
  const etendue = function(f){ const v = C.points.map(f).map(Math.abs).sort(function(a, b){ return a - b; }); if (!v.length) return 1; const q = v[Math.min(v.length - 1, Math.floor(0.995 * (v.length - 1)))]; return (q || v[v.length - 1] || 1) * 1.1; };
  E.dense = C.points.length > 3000;   // beaucoup de points : plus petits et plus transparents, pour voir la densité
  E.ext = [etendue(function(p){ return p.x; }), etendue(function(p){ return p.y; }), etendue(function(p){ return p.z || 0; })];
  _carteBrancher(E);
  _carteRendu(E);
}
function _carteBorne(v){ return Math.max(-1.04, Math.min(1.04, v)); }
function _carteProjeter(E, p){
  const C = E.C, W = E.W, H = E.H, m = 34;
  if (!C.d3) {
    return { x: m + (_carteBorne(p.x / E.ext[0]) + 1) / 2 * (W - 2 * m), y: H - m - (_carteBorne(p.y / E.ext[1]) + 1) / 2 * (H - 2 * m), z: 0, f: 1 };
  }
  const R = Math.max(E.ext[0], E.ext[1], E.ext[2]);
  let x = _carteBorne(p.x / R), y = _carteBorne(p.y / R), z = _carteBorne((p.z || 0) / R);
  const cy = Math.cos(E.rotY), sy = Math.sin(E.rotY), cx = Math.cos(E.rotX), sx = Math.sin(E.rotX);
  const x1 = x * cy + z * sy, z1 = -x * sy + z * cy;
  const y2 = y * cx - z1 * sx, z2 = y * sx + z1 * cx;
  const f = 2.6 / (2.6 - z2) * E.zoom, s = Math.min(W, H) * 0.36;
  return { x: W / 2 + x1 * s * f, y: H / 2 - y2 * s * f, z: z2, f: f };
}
function _carteRendu(E){
  const C = E.C, cv = E.cv; if (!cv || !document.body.contains(cv)) return;
  const ctx = cv.getContext('2d'); ctx.setTransform(E.dpr, 0, 0, E.dpr, 0, 0);
  ctx.clearRect(0, 0, E.W, E.H);
  ctx.font = '11px DM Sans, system-ui, sans-serif';
  // le repère
  ctx.strokeStyle = 'rgba(138,148,143,0.35)'; ctx.lineWidth = 1; ctx.fillStyle = '#8b948f';
  if (C.d3) {
    const R = Math.max(E.ext[0], E.ext[1], E.ext[2]);
    const o = _carteProjeter(E, { x: 0, y: 0, z: 0 });
    [[R, 0, 0], [0, R, 0], [0, 0, R]].forEach(function(v, q){
      const a = _carteProjeter(E, { x: -v[0], y: -v[1], z: -v[2] }), b = _carteProjeter(E, { x: v[0], y: v[1], z: v[2] });
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (C.axes && C.axes[q]) ctx.fillText(C.axes[q], b.x + 4, b.y - 4);
    });
    ctx.fillRect(o.x - 1, o.y - 1, 2, 2);
  } else {
    ctx.beginPath(); ctx.moveTo(34, E.H / 2); ctx.lineTo(E.W - 34, E.H / 2); ctx.moveTo(E.W / 2, 34); ctx.lineTo(E.W / 2, E.H - 34); ctx.stroke();
    if (C.axes && C.axes[0]) { ctx.textAlign = 'right'; ctx.fillText(C.axes[0] + ' →', E.W - 36, E.H / 2 - 6); ctx.textAlign = 'left'; }
    if (C.axes && C.axes[1]) ctx.fillText('↑ ' + C.axes[1], E.W / 2 + 6, 46);
  }
  // les points, du plus loin au plus près ; les points mis en avant (r) par-dessus
  const ecran = C.points.map(function(p, i){ const s = _carteProjeter(E, p); s.i = i; return s; });
  E.ecran = ecran;
  const ordre = ecran.filter(function(s){ return !E.caches[C.points[s.i].g]; }).sort(function(a, b){ return (C.points[a.i].r || 0) - (C.points[b.i].r || 0) || a.z - b.z; });
  ordre.forEach(function(s){
    const p = C.points[s.i], g = C.groupes[p.g], r = (p.r || (E.dense ? 1.7 : 2.2)) * (C.d3 ? Math.max(0.6, Math.min(1.8, s.f)) : 1);
    ctx.globalAlpha = p.r ? 1 : (C.d3 ? Math.max(0.3, Math.min(0.85, (E.dense ? 0.45 : 0.55) + s.z * 0.3)) : (E.dense ? 0.5 : 0.75));
    ctx.fillStyle = g ? g.couleur : CARTE_GRIS;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, 2 * Math.PI); ctx.fill();
    if (p.r) { ctx.globalAlpha = 1; ctx.strokeStyle = '#0d0f0e'; ctx.lineWidth = 1.5; ctx.stroke(); }
  });
  ctx.globalAlpha = 1;
  // les trajectoires (la partie analysée, le chemin du champion)
  (C.lignes || []).forEach(function(l){
    const pts = l.pts.filter(function(i){ return ecran[i] && !E.caches[C.points[i].g]; });
    if (pts.length < 2) return;
    ctx.strokeStyle = l.couleur; ctx.lineWidth = 2; ctx.beginPath();
    pts.forEach(function(i, q){ const s = ecran[i]; if (q) ctx.lineTo(s.x, s.y); else ctx.moveTo(s.x, s.y); });
    ctx.stroke();
    if (l.numeros) { ctx.fillStyle = l.couleur; pts.forEach(function(i, q){ if (q % l.numeros === 0 || q === pts.length - 1) { const s = ecran[i]; ctx.fillText(String(C.points[i].num != null ? C.points[i].num : q + 1), s.x + 6, s.y - 6); } }); }
  });
  if (E.survol >= 0 && ecran[E.survol]) { const s = ecran[E.survol]; ctx.strokeStyle = '#f5f0e6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s.x, s.y, 7, 0, 2 * Math.PI); ctx.stroke(); }
}
function _cartePlusProche(E, x, y){
  if (!E.ecran) return -1;
  let best = -1, bd = 10 * 10;
  E.ecran.forEach(function(s){ if (E.caches[E.C.points[s.i].g]) return; const dx = s.x - x, dy = s.y - y, dd = dx * dx + dy * dy; if (dd <= bd) { bd = dd; best = s.i; } });
  return best;
}
function _carteBulle(E, i, cx, cy){
  if (i < 0) { if (typeof _grCacher === 'function') _grCacher(); return; }
  const p = E.C.points[i];
  E.cv.setAttribute('data-gr-tip', (p.tip || []).join('\n') + (p.action ? '\n' + _tr('Clic : ouvrir', 'Click: open') : ''));
  if (typeof _grMontrer === 'function') _grMontrer(E.cv, cx, cy);
}
function _carteBrancher(E){
  const cv = E.cv; let glisse = null;
  const local = function(e){ const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * E.W / r.width, y: (e.clientY - r.top) * E.H / r.height }; };
  cv.addEventListener('pointerdown', function(e){ if (!E.C.d3) return; glisse = { x: e.clientX, y: e.clientY, bouge: false }; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
  cv.addEventListener('pointermove', function(e){
    if (glisse) {
      const dx = e.clientX - glisse.x, dy = e.clientY - glisse.y;
      if (Math.abs(dx) + Math.abs(dy) > 2) glisse.bouge = true;
      E.rotY += dx * 0.01; E.rotX = Math.max(-1.5, Math.min(1.5, E.rotX + dy * 0.01));
      glisse.x = e.clientX; glisse.y = e.clientY; _carteBulle(E, -1); _carteRendu(E); return;
    }
    const q = local(e), i = _cartePlusProche(E, q.x, q.y);
    if (i !== E.survol) { E.survol = i; _carteRendu(E); }
    _carteBulle(E, i, e.clientX, e.clientY);
    cv.style.cursor = i >= 0 && E.C.points[i].action ? 'pointer' : (E.C.d3 ? 'grab' : 'crosshair');
  });
  const fin = function(e){
    const etait = glisse; glisse = null; if (E.C.d3) cv.style.cursor = 'grab';
    if (e.type === 'pointerup' && (!etait || !etait.bouge)) {
      const q = local(e), i = _cartePlusProche(E, q.x, q.y);
      if (i >= 0 && E.C.points[i].action) { _carteBulle(E, -1); E.C.points[i].action(); }
    }
  };
  cv.addEventListener('pointerup', fin); cv.addEventListener('pointercancel', fin);
  cv.addEventListener('pointerleave', function(){ if (!glisse) { E.survol = -1; _carteBulle(E, -1); _carteRendu(E); } });
  // clavier : flèches pour tourner (3D) ; Tab, puis + et − pour le zoom
  cv.addEventListener('keydown', function(e){
    if (!E.C.d3) return;
    const pas = 0.15;
    if (e.key === 'ArrowLeft') E.rotY -= pas; else if (e.key === 'ArrowRight') E.rotY += pas;
    else if (e.key === 'ArrowUp') E.rotX = Math.max(-1.5, E.rotX - pas); else if (e.key === 'ArrowDown') E.rotX = Math.min(1.5, E.rotX + pas);
    else if (e.key === '+' || e.key === '=') E.zoom = Math.min(4, E.zoom * 1.25); else if (e.key === '-') E.zoom = Math.max(0.4, E.zoom * 0.8);
    else return;
    e.preventDefault(); _carteRendu(E);
  });
}
function carteZoom(id, f){ const E = _CARTES[id]; if (!E) return; E.zoom = Math.max(0.4, Math.min(4, E.zoom * f)); _carteRendu(E); }
function carteTourner(id){ const E = _CARTES[id]; if (!E) return; E.rotY = -0.6; E.rotX = 0.35; E.zoom = 1; _carteRendu(E); }
function carteBasculer(id, g){
  const E = _CARTES[id]; if (!E) return;
  E.caches[g] = !E.caches[g];
  const b = document.querySelector('[data-click="carteBasculer(\'' + id + '\', ' + g + ')"]');
  if (b) { b.classList.toggle('cache', E.caches[g]); b.setAttribute('aria-pressed', E.caches[g] ? 'false' : 'true'); }
  _carteRendu(E);
}

/* ─── 3. Le cadre commun : réglages, calcul, explication ─── */
function _carteSelect(id, cle, valeur, options, etiquette){
  return '<label>' + etiquette + ' <select data-change="carteReglage(\'' + id + '\', \'' + cle + '\', this.value)">'
    + options.map(function(o){ return '<option value="' + o[0] + '"' + (o[0] === valeur ? ' selected' : '') + '>' + grEchapper(o[1]) + '</option>'; }).join('') + '</select></label>';
}
function carteReglages(id, couleurs){
  const m = cartePref(id, 'methode', 'acp'), v = cartePref(id, 'vue', '2d'), c = cartePref(id, 'couleur', couleurs[0][0]);
  return '<div class="gr-filtres carte-reglages">'
    + _carteSelect(id, 'couleur', c, couleurs, _tr('Couleur', 'Colour'))
    + _carteSelect(id, 'methode', m, [['acp', _tr('ACP (axes expliqués)', 'PCA (explained axes)')], ['tsne', _tr('t-SNE (familles)', 't-SNE (families)')]], _tr('Méthode', 'Method'))
    + _carteSelect(id, 'vue', v, [['2d', '2D'], ['3d', _tr('3D tournante', 'Rotating 3D')]], _tr('Vue', 'View'))
    + '</div>';
}
function carteAide(methode, d3){
  return '<div class="gr-sous">' + (methode === 'tsne'
    ? _tr('t-SNE rapproche les points qui se ressemblent : les paquets sont des familles. Ses axes n’ont pas de sens et les distances entre paquets éloignés non plus.', 't-SNE brings similar points together: the clusters are families. Its axes have no meaning, nor do distances between far-apart clusters.')
    : _tr('L’ACP montre les directions où les points diffèrent le plus ; chaque axe est expliqué sous la carte.', 'PCA shows the directions in which the points differ most; each axis is explained under the map.'))
    + (d3 ? ' ' + _tr('Fais tourner la carte à la souris, au doigt ou aux flèches du clavier.', 'Rotate the map with the mouse, a finger or the arrow keys.') : '')
    + ' ' + _tr('Passe sur un point pour le détail ; clique sur un groupe de la légende pour le masquer.', 'Hover over a point for details; click a legend group to hide it.') + '</div>';
}
/* Pose une carte complète dans hote : réglages, calcul (ACP ou t-SNE), dessin, explication des axes.
   S : { id, couleurs: [[cle, nom]], noms: noms des dimensions, base: { X, n, d }, extra?, groupes(cleCouleur)
         -> [{nom, couleur}], point(estExtra, i, cleCouleur) -> { g, tip, action?, r?, num? }, lignes?(carte) -> [...],
         aria: texte, avant?: html au-dessus } */
function carteDresser(hote, S){
  if (!hote) return;
  const id = S.id, methode = cartePref(id, 'methode', 'acp'), d3 = cartePref(id, 'vue', '2d') === '3d';
  let cle = cartePref(id, 'couleur', S.couleurs[0][0]); if (!S.couleurs.some(function(c){ return c[0] === cle; })) cle = S.couleurs[0][0];
  const dim = d3 ? 3 : 2;
  hote.innerHTML = (S.avant || '') + carteReglages(id, S.couleurs) + carteAide(methode, d3) + '<div class="carte-zone" id="carte-z-' + id + '"><div class="gr-vide">' + (methode === 'tsne' ? _tr('⏳ t-SNE en cours…', '⏳ Running t-SNE…') : _tr('⏳ Calcul…', '⏳ Computing…')) + '</div></div><div class="carte-axes" id="carte-a-' + id + '"></div>';
  const jeton = (_CARTES['_jeton_' + id] = (_CARTES['_jeton_' + id] || 0) + 1);
  const zone = function(){ return document.getElementById('carte-z-' + id); };
  carteCalculer(S.base, S.extra, methode, dim, function(a){ const z = zone(); if (z && _CARTES['_jeton_' + id] === jeton) z.innerHTML = '<div class="gr-vide">⏳ t-SNE : ' + Math.round(100 * a) + ' %</div>'; })
    .then(function(R){
      if (_CARTES['_jeton_' + id] !== jeton) return;     // un réglage a changé pendant le calcul : ce résultat n'est plus voulu
      const k = R.k, groupes = S.groupes(cle), points = [];
      const enX = function(Y, q){ return { x: Y[q * k], y: Y[q * k + 1], z: dim === 3 ? Y[q * k + 2] : 0 }; };
      R.base.forEach(function(i, q){ points.push(Object.assign(enX(R.Yb, q), S.point(false, i, cle))); });
      const debutExtra = points.length;
      for (let i = 0; S.extra && i < S.extra.n; i++) points.push(Object.assign(enX(R.Ye, i), S.point(true, i, cle)));
      const axes = R.axes ? [1, 2, 3].map(function(q){ return _tr('Axe ', 'Axis ') + q; }) : null;
      carteDessiner(zone(), { id: id, groupes: groupes, points: points, d3: d3, axes: axes,
        lignes: S.lignes ? S.lignes(debutExtra, points) : null,
        aria: S.aria + ' ' + (methode === 'tsne' ? 't-SNE' : _tr('ACP', 'PCA')) + ', ' + (d3 ? '3D' : '2D') + ', ' + grNb(points.length) + _tr(' points.', ' points.') });
      const ha = document.getElementById('carte-a-' + id);
      if (ha) ha.innerHTML = R.axes ? '<div class="gr-sous">' + R.axes.slice(0, dim).map(function(a, q){ return carteDecrireAxe(a, S.noms, q); }).join('<br>') + '</div>'
        : '<div class="gr-sous">' + _tr('Échantillon : ', 'Sample: ') + grNb(R.base.length) + _tr(' points de fond sur ', ' background points out of ') + grNb(S.base.n) + (S.extra && S.extra.n ? ', + ' + grNb(S.extra.n) : '') + '.</div>';
    })
    .catch(function(e){ const z = zone(); if (z) z.innerHTML = '<div class="gr-vide">❌ ' + grEchapper(e && e.message || e) + '</div>'; });
}

/* ─── 4. Les données : les parties du corpus, en 12 dimensions ───
   Un point par camp et par partie : la moyenne des 12 dimensions de ses positions (mesurées juste
   après chacun de ses coups). Cache par jeu de filtres. */
let _carteCorpusCache = null;
function carteCorpusVecteurs(Lk){
  const K = (typeof _empCorpusDonnees === 'function') ? _empCorpusDonnees() : null, D = STATS_PARTIES;
  if (!K || !D) return null;
  const garder = new Uint8Array(D.p.length); let nGarde = 0;
  (Lk || []).forEach(function(x){ if (!garder[x.k]) { garder[x.k] = 1; nGarde++; } });
  const cle = nGarde + '|' + K.n + '|' + (Lk ? Lk.length : 0) + '|' + (Lk && Lk.length ? Lk[0].k + ':' + Lk[Lk.length - 1].k : '');
  if (_carteCorpusCache && _carteCorpusCache.cle === cle) return _carteCorpusCache.v;
  const nd = EMPREINTES_CHAMPS.length, P = EMPREINTES_HISTORIQUES, Cc = (typeof EMPREINTES_COMPLEMENT !== 'undefined' && EMPREINTES_COMPLEMENT) ? EMPREINTES_COMPLEMENT : null;
  const debut = [0, D.nb[0], D.nb[0] + D.nb[1], D.nb[0] + D.nb[1] + D.nb[2]];
  const ligne = new Int32Array(D.p.length * 2).fill(-1), sommes = [], nb = [], qui = [];
  const ajouter = function(i, k, couleur){
    if (!garder[k]) return;
    const c = k * 2 + couleur; let l = ligne[c];
    if (l < 0) { l = ligne[c] = qui.length; qui.push([k, couleur]); sommes.push(new Float64Array(nd)); nb.push(0); }
    const S = sommes[l]; for (let j = 0; j < nd; j++) S[j] += K.cols[j][i]; nb[l]++;
  };
  for (let i = 0; i < K.nP; i++) { const p = P[i]; ajouter(i, (p.s === 'MIGS' ? debut[0] : debut[1]) + p.g, p.c === 'black' ? 0 : 1); }
  for (let j = 0; Cc && j < K.nC; j++) ajouter(K.nP + j, debut[2 + Cc.source[j]] + Cc.partie[j], Cc.couleur[j]);
  const rangs = []; qui.forEach(function(q, l){ if (nb[l] >= 5) rangs.push(l); });
  const X = new Float64Array(rangs.length * nd), info = [];
  rangs.forEach(function(l, r){ for (let j = 0; j < nd; j++) X[r * nd + j] = sommes[l][j] / nb[l] / 1000; info.push({ k: qui[l][0], c: qui[l][1], n: nb[l] }); });
  const v = { X: X, n: rangs.length, d: nd, info: info };
  _carteCorpusCache = { cle: cle, v: v };
  return v;
}
const CARTE_NOMS_SOURCES = function(){ return ['MIGS', 'AbalOnline', 'PlayStrategy', _tr('Référence', 'Reference')]; };
const CARTE_LONGUEURS = [[0, 60], [60, 100], [100, 150], [150, 1e9]];
function _carteLongueur(n){ for (let q = 0; q < CARTE_LONGUEURS.length; q++) if (n < CARTE_LONGUEURS[q][1]) return q; return 3; }
function _carteNomsLongueurs(){ return [_tr('moins de 60 demi-coups', 'under 60 plies'), _tr('60 à 99', '60 to 99'), _tr('100 à 149', '100 to 149'), _tr('150 et plus', '150 and more')]; }
function _carteResultatCamp(p, couleur){ const w = p && p[0]; if (w !== 1 && w !== 2) return 2; return (w === 1) === (couleur === 0) ? 0 : 1; }
function _carteCouleursCorpus(){
  return [['resultat', _tr('Résultat du camp', 'Side’s result')], ['source', _tr('Source', 'Source')], ['camp', _tr('Camp', 'Side')], ['longueur', _tr('Longueur', 'Length')], ['joueurs', _tr('Joueurs', 'Players')]];
}
function _carteGroupesCorpus(cle){
  const S = GR_SERIES;
  if (cle === 'source') return CARTE_NOMS_SOURCES().map(function(n, q){ return { nom: n, couleur: [S[0], S[1], S[2], GR_OR][q] }; });
  if (cle === 'camp') return [{ nom: _tr('Noirs', 'Black'), couleur: '#9085e9' }, { nom: _tr('Blancs', 'White'), couleur: '#e8e4da' }];
  if (cle === 'longueur') return _carteNomsLongueurs().map(function(n, q){ return { nom: n, couleur: [S[2], S[0], S[3], S[1]][q] }; });
  if (cle === 'joueurs') return [{ nom: _tr('Humains entre eux', 'Humans only'), couleur: S[2] }, { nom: _tr('Avec un programme', 'With a program'), couleur: S[4] }];
  return [{ nom: _tr('Camp gagnant', 'Winning side'), couleur: GR_POS }, { nom: _tr('Camp perdant', 'Losing side'), couleur: GR_NEG }, { nom: _tr('Résultat inconnu', 'Unknown result'), couleur: CARTE_GRIS }];
}
function _carteGroupeCorpus(cle, k, couleur, p){
  const D = STATS_PARTIES;
  if (cle === 'source') return _cfSourceDe(k, D);
  if (cle === 'camp') return couleur;
  if (cle === 'longueur') return _carteLongueur(p ? p[1] : 0);
  if (cle === 'joueurs') return (typeof _cfCampsIA === 'function' && _cfCampsIA(k)) ? 1 : 0;
  return _carteResultatCamp(p, couleur);
}
function _carteTipCorpus(k, couleur){
  const x = (typeof _cfPartieDe === 'function') ? _cfPartieDe(k) : null, p = STATS_PARTIES.p[k];
  const r = _carteResultatCamp(p, couleur);
  return [(couleur === 0 ? _tr('⚫ Noirs : ', '⚫ Black: ') + (x ? x.noirs : '?') : _tr('⚪ Blancs : ', '⚪ White: ') + (x ? x.blancs : '?')) + ' · ' + [_tr('gagne', 'wins'), _tr('perd', 'loses'), _tr('résultat inconnu', 'unknown result')][r],
    (x ? CARTE_NOMS_SOURCES()[x.s] + ' · ' + x.date + ' · ' : '') + (x ? x.noirs + ' – ' + x.blancs : ''),
    grNb(p ? p[1] : 0) + _tr(' demi-coups', ' plies')];
}

/* Statistiques du jeu : la carte des parties (suit les filtres de la page) */
function carteCorpusRendre(){
  const hote = document.getElementById('carte-corpus'); if (!hote) return;
  _CARTE_REDESSINER.corpus = carteCorpusRendre;
  if (!STATS_PARTIES) return;
  if (typeof EMPREINTES_HISTORIQUES === 'undefined' || !EMPREINTES_HISTORIQUES.length || typeof EMPREINTES_FLAT === 'undefined' || !EMPREINTES_FLAT) {
    hote.innerHTML = '<div class="gr-vide">' + _tr('⏳ Chargement des positions mesurées…', '⏳ Loading the measured positions…') + '</div>';
    Promise.all([ensureEmpreintesHistoriques(), (typeof ensureEmpreintesComplement === 'function' ? ensureEmpreintesComplement() : true)]).then(function(){ if (EMPREINTES_HISTORIQUES && EMPREINTES_HISTORIQUES.length) carteCorpusRendre(); });
    return;
  }
  const L = (typeof _cfParties === 'function') ? _cfParties() : [], V = carteCorpusVecteurs(L);
  if (!V || V.n < 20) { hote.innerHTML = '<div class="gr-vide">' + _tr('Trop peu de parties mesurées avec ces filtres pour dessiner une carte.', 'Too few measured games with these filters to draw a map.') + '</div>'; return; }
  const noms = EMPREINTES_CHAMPS.map(_labelDimension), D = STATS_PARTIES;
  carteDresser(hote, {
    id: 'corpus', couleurs: _carteCouleursCorpus(), noms: noms, base: V,
    avant: '<div class="gr-sous">' + _tr('Chaque point : un camp dans une partie, placé selon la moyenne de ses 12 dimensions (cohésion, centre, bord, menaces…). ', 'Each point: one side in one game, placed by the average of its 12 dimensions (cohesion, centre, edge, threats…). ') + grNb(V.n) + _tr(' points, ', ' points, ') + grNb(new Set(V.info.map(function(x){ return x.k; })).size) + _tr(' parties.', ' games.') + (typeof _cfMarque === 'function' ? _cfMarque() : '') + '</div>',
    groupes: _carteGroupesCorpus,
    point: function(extra, i, cle){ const x = V.info[i], p = D.p[x.k]; return { g: _carteGroupeCorpus(cle, x.k, x.c, p), tip: _carteTipCorpus(x.k, x.c), action: function(){ if (typeof corpusRevoir === 'function') corpusRevoir(x.k); } }; },
    aria: _tr('Carte des parties du corpus.', 'Map of the corpus games.')
  });
}

/* ─── 5. Mes statistiques : mes parties sur la carte des vrais joueurs ───
   Les 12 dimensions de mes positions, partie par partie (une position sur deux, après mes coups),
   gardées sur l'appareil pour ne pas tout rejouer à chaque fois. */
const CARTE_MES_CLE = 'abaCarteMes';
let _carteMesCalcul = false;
function _carteMesCache(){ try { const o = JSON.parse(localStorage.getItem(CARTE_MES_CLE) || '{}'); return (o && o.v === 1 && o.p) ? o : { v: 1, p: {} }; } catch (e) { return { v: 1, p: {} }; } }
function _carteMesVecteur(e){
  const P = (typeof gameCodeParse === 'function') ? gameCodeParse(e.code) : null; if (!P || !P.ok) return null;
  const moi = e.humanColor === 'white' ? 'white' : 'black', nd = EMPREINTES_CHAMPS.length, S = new Float64Array(nd);
  let n = 0, tour = 'black', mesCoups = 0;
  currentLayout = P.layout || 'standard'; initBoardState(); CapturedByBlack.set(0); CapturedByWhite.set(0);
  for (let j = 0; j < P.moves.length; j++) {
    const mv = P.moves[j], v = validateMove(mv.cells, mv.dir, tour); if (!v || !v.valid) break;
    applyMove({ cells: mv.cells, dir: mv.dir, info: v }, tour);
    if (tour === moi && (mesCoups++ % 2 === 0)) { const emp = calculerEmpreinte(moi); EMPREINTES_CHAMPS.forEach(function(c, q){ S[q] += emp[c] || 0; }); n++; }
    tour = tour === 'black' ? 'white' : 'black';
    if (CapturedByBlack.get() >= 6 || CapturedByWhite.get() >= 6) break;
  }
  return n ? Array.from(S, function(x){ return Math.round(x / n * 1000) / 1000; }) : null;
}
function carteMesPreparer(L, fin){
  if (_carteMesCalcul) return;
  const cache = _carteMesCache(), aFaire = L.filter(function(e){ return e.code && !cache.p[e.id]; });
  if (!aFaire.length) { fin(cache); return; }
  _carteMesCalcul = true;
  const sauve = { layout: currentLayout, board: board, cb: CapturedByBlack.get(), cw: CapturedByWhite.get() };
  let i = 0;
  const tranche = function(){
    try {
      for (let q = 0; q < 2 && i < aFaire.length; q++, i++) { const v = _carteMesVecteur(aFaire[i]); cache.p[aFaire[i].id] = v || 0; }
    } finally { currentLayout = sauve.layout; board = sauve.board; CapturedByBlack.set(sauve.cb); CapturedByWhite.set(sauve.cw); }
    const h = document.getElementById('carte-z-mes') || document.getElementById('carte-mes');
    if (h && i < aFaire.length) h.innerHTML = '<div class="gr-vide">' + _tr('⏳ Tes parties : ', '⏳ Your games: ') + Math.round(100 * i / aFaire.length) + ' %</div>';
    if (i < aFaire.length) { setTimeout(tranche, 0); return; }
    // on ne garde que les parties encore dans l'historique
    const ids = {}; getGameHistory().forEach(function(e){ ids[e.id] = 1; });
    Object.keys(cache.p).forEach(function(id){ if (!ids[id]) delete cache.p[id]; });
    try { localStorage.setItem(CARTE_MES_CLE, JSON.stringify(cache)); } catch (e) {}
    _carteMesCalcul = false; fin(cache);
  };
  setTimeout(tranche, 0);
}
function _carteMesCouleurs(){ return [['resultat', _tr('Mon résultat', 'My result')], ['niveau', _tr('Niveau de l’IA', 'AI level')], ['couleur', _tr('Ma couleur', 'My colour')], ['periode', _tr('Quand', 'When')]]; }
function _carteMesGroupe(cle, e){
  if (cle === 'niveau') { const n = (typeof _niveauIA === 'function') ? _niveauIA(e.aiDiff) : null; return n ? Math.min(4, Math.floor((n - 1) / 2)) : 5; }
  if (cle === 'couleur') return e.humanColor === 'white' ? 1 : 0;
  if (cle === 'periode') { const j = (Date.now() - new Date(e.date).getTime()) / 86400000; return j < 7 ? 0 : j < 30 ? 1 : j < 180 ? 2 : 3; }
  const r = (typeof _histMonResultat === 'function') ? _histMonResultat(e) : null;
  return r === 'win' || r === 'V' || r === 'victoire' ? 0 : r === 'loss' || r === 'D' || r === 'defaite' ? 1 : 2;
}
function _carteMesGroupes(cle){
  const S = GR_SERIES, fond = { nom: _tr('Vrais joueurs (corpus)', 'Real players (corpus)'), couleur: CARTE_GRIS };
  let L;
  if (cle === 'niveau') L = [[_tr('IA niveaux 1–2', 'AI levels 1–2'), S[2]], [_tr('niveaux 3–4', 'levels 3–4'), S[0]], [_tr('niveaux 5–6', 'levels 5–6'), S[3]], [_tr('niveaux 7–8', 'levels 7–8'), S[1]], [_tr('niveaux 9–10', 'levels 9–10'), S[4]], [_tr('autre adversaire', 'other opponent'), '#e8e4da']];
  else if (cle === 'couleur') L = [[_tr('avec les Noirs', 'as Black'), '#9085e9'], [_tr('avec les Blancs', 'as White'), '#e8e4da']];
  else if (cle === 'periode') L = [[_tr('7 derniers jours', 'last 7 days'), S[1]], [_tr('30 derniers jours', 'last 30 days'), S[3]], [_tr('6 derniers mois', 'last 6 months'), S[0]], [_tr('plus ancien', 'older'), S[6]]];
  else L = [[_tr('victoire', 'win'), GR_POS], [_tr('défaite', 'loss'), GR_NEG], [_tr('nulle ou inachevée', 'draw or unfinished'), '#e8e4da']];
  return L.map(function(x){ return { nom: x[0], couleur: x[1] }; }).concat([fond]);
}
let _carteMesVoulue = false;
function carteMesLancer(){ _carteMesVoulue = true; carteMesRendre(); }
function carteMesRendre(){
  const hote = document.getElementById('carte-mes'); if (!hote) return;
  _CARTE_REDESSINER.mes = carteMesRendre;
  const L = (typeof _msParties === 'function') ? _msParties() : [];
  if (!L.length) { hote.innerHTML = '<div class="gr-vide">' + _tr('Aucune partie avec ces filtres.', 'No game with these filters.') + '</div>'; return; }
  // la premiere fois, rejouer les parties prend un moment : sur demande seulement
  const cache = _carteMesCache(), manque = L.filter(function(e){ return e.code && !(e.id in cache.p); }).length;
  if (manque && !_carteMesVoulue) {
    hote.innerHTML = '<div class="gr-sous">' + _tr('Tes parties placées au milieu de celles des vrais joueurs, selon les 12 dimensions de tes positions.', 'Your games placed among those of real players, by the 12 dimensions of your positions.') + '</div>'
      + '<button type="button" class="btn-secondary carte-lancer" data-click="carteMesLancer()">' + _tr('Dessiner ma carte', 'Draw my map') + ' <span>(' + grNb(manque) + _tr(' partie' + (manque > 1 ? 's' : '') + ' à mesurer, une seule fois)', ' game' + (manque > 1 ? 's' : '') + ' to measure, once)') + '</span></button>';
    return;
  }
  hote.innerHTML = '<div class="gr-vide">' + _tr('⏳ Chargement des positions des vrais joueurs…', '⏳ Loading the real players’ positions…') + '</div>';
  Promise.all([ensureStatsParties(), ensureEmpreintesHistoriques(), (typeof ensureEmpreintesComplement === 'function' ? ensureEmpreintesComplement() : true), (typeof ensureGameBanks === 'function' ? ensureGameBanks() : true)]).then(function(){
    carteMesPreparer(L, function(cache){
      const M = L.filter(function(e){ return Array.isArray(cache.p[e.id]); });
      const V = carteCorpusVecteurs(STATS_PARTIES.p.map(function(p, k){ return { k: k, p: p }; }).filter(function(x){ return x.p[2]; }));
      if (!V || !M.length) { hote.innerHTML = '<div class="gr-vide">' + _tr('Pas encore de partie mesurable : joue quelques coups de plus.', 'No measurable game yet: play a few more moves.') + '</div>'; return; }
      const nd = V.d, Xe = new Float64Array(M.length * nd);
      M.forEach(function(e, i){ Xe.set(cache.p[e.id], i * nd); });
      const nCouleurs = function(cle){ return _carteMesGroupes(cle).length - 1; };
      carteDresser(hote, {
        id: 'mes', couleurs: _carteMesCouleurs(), noms: EMPREINTES_CHAMPS.map(_labelDimension), base: V, extra: { X: Xe, n: M.length },
        avant: '<div class="gr-sous">' + _tr('Tes parties (gros points) au milieu de celles des vrais joueurs (en gris) : chaque point est la moyenne des 12 dimensions de tes positions dans une partie. Les parties proches se jouent de la même façon.', 'Your games (large dots) among those of real players (grey): each dot is the average of the 12 dimensions of your positions in one game. Nearby games are played the same way.') + '</div>',
        groupes: _carteMesGroupes,
        point: function(extra, i, cle){
          if (!extra) { const x = V.info[i]; return { g: nCouleurs(cle), tip: _carteTipCorpus(x.k, x.c), action: function(){ if (typeof corpusRevoir === 'function') corpusRevoir(x.k); } }; }
          const e = M[i], lab = (typeof _historyOpponentLabel === 'function') ? _historyOpponentLabel(e) : '';
          return { g: _carteMesGroupe(cle, e), r: 5, tip: [_tr('Ma partie du ', 'My game of ') + new Date(e.date).toLocaleDateString(typeof currentLang === 'function' && currentLang() === 'EN' ? 'en-GB' : 'fr-FR'), lab, grNb(e.moveCount || 0) + _tr(' coups', ' moves')], action: function(){ if (typeof _replayHistoryGame === 'function') _replayHistoryGame(e.code); } };
        },
        aria: _tr('Carte de mes parties parmi celles des vrais joueurs.', 'Map of my games among real players’ games.')
      });
    });
  }).catch(function(e){ hote.innerHTML = '<div class="gr-vide">❌ ' + grEchapper(e && e.message || e) + '</div>'; });
}

/* ─── 6. Le Labo : les réglages essayés, en 16 poids ───
   Les champions (et le chemin de l'un à l'autre), les mutants tranchés (st.essais, relevés depuis la
   v3.27), le chemin du SPSA et les mutants en cours de test. */
function _carteLaboPoints(st){
  const pts = [];
  (st.champions || []).forEach(function(c, i){ pts.push({ w: c.w, t: 0, nom: (c.nom || _tr('champion', 'champion')), gen: c.gen, ordre: i }); });
  (st.essais || []).forEach(function(e){ pts.push({ w: e.w, t: e.v === 'adopte' ? 1 : e.v === 'rejete' ? 2 : e.v === 'indecis' ? 3 : 4, nom: e.nom, gen: e.gen, score: e.r }); });
  ((st.spsa && st.spsa.thetaHist) || []).forEach(function(h, i){ if (i % 4 === 0) pts.push({ w: _labVecteur(h.theta), t: 5, nom: 'SPSA ' + h.iter, gen: null }); });
  (st.cands || []).forEach(function(c){ pts.push({ w: _labVecteur(c.w), t: 6, nom: c.name, gen: st.gen }); });
  if (st.confirm && st.confirm.w) pts.push({ w: _labVecteur(st.confirm.w), t: 6, nom: st.confirm.name, gen: st.gen });
  return pts.filter(function(p){ return Array.isArray(p.w) && p.w.length === SPSA_KEYS.length; });
}
function carteLaboRendre(){
  const hote = document.getElementById('carte-labo'); if (!hote) return;
  _CARTE_REDESSINER.labo = carteLaboRendre;
  const st = labLoad(), pts = _carteLaboPoints(st), d = SPSA_KEYS.length;
  if (pts.length < 4) { hote.innerHTML = '<div class="gr-vide">' + _tr('Pas encore assez de réglages essayés : lance le Labo, chaque mutant tranché s’ajoute à la carte.', 'Not enough settings tried yet: run the Lab, each decided mutant joins the map.') + '</div>'; return; }
  const X = new Float64Array(pts.length * d); pts.forEach(function(p, i){ X.set(p.w, i * d); });
  const groupes = function(){ return [[_tr('champions', 'champions'), GR_OR], [_tr('adoptés', 'adopted'), GR_POS], [_tr('rejetés', 'rejected'), GR_NEG], [_tr('indécis', 'undecided'), '#c98500'], [_tr('écartés au tri', 'screened out'), CARTE_GRIS], [_tr('chemin du SPSA', 'SPSA path'), '#9085e9'], [_tr('en cours de test', 'being tested'), '#e8e4da']].map(function(x){ return { nom: x[0], couleur: x[1] }; }); };
  const champions = []; pts.forEach(function(p, i){ if (p.t === 0) champions.push(i); });
  carteDresser(hote, {
    id: 'labo', couleurs: [['verdict', _tr('Verdict', 'Verdict')]], noms: SPSA_KEYS.map(function(k){ return (typeof LAB_NOMS !== 'undefined' && LAB_NOMS[k]) || k; }),
    base: { X: X, n: pts.length, d: d },
    avant: '<div class="gr-sous">' + _tr('Chaque point : un réglage des ', 'Each point: a setting of the ') + d + _tr(' poids de l’évaluation. Le trait doré relie les champions dans l’ordre de leur adoption. Les mutants tranchés sont relevés depuis la v3.27.', ' evaluation weights. The gold line links the champions in the order they were adopted. Decided mutants are recorded since v3.27.') + '</div>',
    groupes: groupes,
    point: function(extra, i){ const p = pts[i]; return { g: p.t, r: p.t === 0 ? 5 : (p.t === 6 ? 4 : 0), tip: [p.nom || '', (p.gen != null ? 'G' + p.gen : '') + (p.score != null ? ' · ' + grPct(p.score) + _tr(' des points', ' of the points') : '')] }; },
    lignes: function(){ return champions.length > 1 ? [{ pts: champions, couleur: GR_OR, nom: _tr('du premier au dernier champion', 'from the first to the last champion') }] : null; },
    aria: _tr('Carte des réglages essayés par le Labo.', 'Map of the settings tried by the Lab.')
  });
}

/* ─── 7. L'Analyse : la partie, position après position, parmi les positions des vrais joueurs ─── */
let _carteAnaFond = null;
function _carteAnalyseFond(){
  const K = (typeof _empCorpusDonnees === 'function') ? _empCorpusDonnees() : null; if (!K) return null;
  if (_carteAnaFond && _carteAnaFond.n0 === K.n) return _carteAnaFond;
  const nd = EMPREINTES_CHAMPS.length, idx = carteEchantillon(K.n, 4000, 5), X = new Float64Array(idx.length * nd);
  idx.forEach(function(i, r){ for (let j = 0; j < nd; j++) X[r * nd + j] = K.cols[j][i] / 1000; });
  _carteAnaFond = { n0: K.n, X: X, n: idx.length, d: nd };
  return _carteAnaFond;
}
function _carteAnalysePositions(){
  if (typeof analysisHistory === 'undefined' || analysisHistory.length < 2) return [];
  const sauve = { board: board, cb: CapturedByBlack.get(), cw: CapturedByWhite.get() }, out = [];
  try {
    for (let i = 1; i < analysisHistory.length; i++) {
      const h = analysisHistory[i], couleur = h.color || (h.turn === 'white' ? 'black' : 'white');
      board = JSON.parse(JSON.stringify(h.board)); CapturedByBlack.set(h.capB || 0); CapturedByWhite.set(h.capW || 0);
      const emp = calculerEmpreinte(couleur);
      out.push({ i: i, couleur: couleur, v: EMPREINTES_CHAMPS.map(function(c){ return emp[c] || 0; }) });
    }
  } finally { board = sauve.board; CapturedByBlack.set(sauve.cb); CapturedByWhite.set(sauve.cw); }
  return out;
}
// la partie chargee a change : la carte d'avant ne vaut plus, on propose de la redessiner
let _carteAnaSignature = '';
function _carteAnaSig(){ return (typeof analysisHistory === 'undefined' || !analysisHistory.length) ? '' : analysisHistory.length + '|' + (analysisHistory[1] && analysisHistory[1].label) + '|' + (analysisHistory[analysisHistory.length - 1].label); }
function carteAnalyseSignal(){
  const hote = document.getElementById('carte-analyse'); if (!hote) return;
  const sig = _carteAnaSig(); if (sig === _carteAnaSignature) return;
  _carteAnaSignature = sig;
  hote.innerHTML = (typeof analysisHistory === 'undefined' || analysisHistory.length < 3)
    ? '<div class="gr-vide">' + _tr('Charge une partie pour voir son chemin sur la carte des positions.', 'Load a game to see its path on the map of positions.') + '</div>'
    : '<div class="gr-sous">' + _tr('Le chemin de cette partie, position après position, parmi les positions des vrais joueurs.', 'This game’s path, position after position, among real players’ positions.') + '</div><button type="button" class="btn-secondary carte-lancer" data-click="carteAnalyseRendre()">' + _tr('Dessiner le chemin de la partie', 'Draw the game’s path') + '</button>';
}
function carteAnalyseRendre(){
  const hote = document.getElementById('carte-analyse'); if (!hote) return;
  _CARTE_REDESSINER.analyse = carteAnalyseRendre;
  _carteAnaSignature = _carteAnaSig();
  if (typeof analysisHistory === 'undefined' || analysisHistory.length < 3) { hote.innerHTML = '<div class="gr-vide">' + _tr('Charge une partie pour voir son chemin sur la carte des positions.', 'Load a game to see its path on the map of positions.') + '</div>'; return; }
  hote.innerHTML = '<div class="gr-vide">' + _tr('⏳ Chargement des positions des vrais joueurs…', '⏳ Loading the real players’ positions…') + '</div>';
  Promise.all([ensureEmpreintesHistoriques(), (typeof ensureEmpreintesComplement === 'function' ? ensureEmpreintesComplement() : true)]).then(function(){
    const F = _carteAnalyseFond(); if (!F) { hote.innerHTML = '<div class="gr-vide">' + _tr('Positions du corpus indisponibles.', 'Corpus positions unavailable.') + '</div>'; return; }
    const T = _carteAnalysePositions(), nd = F.d, Xe = new Float64Array(T.length * nd);
    T.forEach(function(t, q){ Xe.set(t.v, q * nd); });
    const groupes = function(){ return [{ nom: _tr('Noirs (cette partie)', 'Black (this game)'), couleur: '#9085e9' }, { nom: _tr('Blancs (cette partie)', 'White (this game)'), couleur: '#e8e4da' }, { nom: _tr('Positions des vrais joueurs', 'Real players’ positions'), couleur: CARTE_GRIS }]; };
    carteDresser(hote, {
      id: 'analyse', couleurs: [['camp', _tr('Camp', 'Side')]], noms: EMPREINTES_CHAMPS.map(_labelDimension), base: F, extra: { X: Xe, n: T.length },
      avant: '<div class="gr-sous">' + _tr('Le chemin de la partie chargée dans l’espace des 12 dimensions, une ligne par camp, numérotée par demi-coup, au milieu de 4 000 positions de vrais joueurs. Clique sur un point de la partie pour y aller.', 'The path of the loaded game through the space of the 12 dimensions, one line per side, numbered by ply, among 4,000 real players’ positions. Click a point of the game to go there.') + '</div>',
      groupes: groupes,
      point: function(extra, i){
        if (!extra) return { g: 2, tip: [_tr('Une position d’un vrai joueur', 'A real player’s position')] };
        const t = T[i]; return { g: t.couleur === 'black' ? 0 : 1, r: 3.5, num: t.i, tip: [_tr('Demi-coup ', 'Ply ') + t.i + ' · ' + (t.couleur === 'black' ? _tr('Noirs', 'Black') : _tr('Blancs', 'White'))], action: function(){ if (typeof analysisGoto === 'function') analysisGoto(t.i); } };
      },
      lignes: function(debut){
        const n = [], b = []; T.forEach(function(t, q){ (t.couleur === 'black' ? n : b).push(debut + q); });
        return [{ pts: n, couleur: '#9085e9', nom: _tr('chemin des Noirs', 'Black’s path'), numeros: 5 }, { pts: b, couleur: '#e8e4da', nom: _tr('chemin des Blancs', 'White’s path'), numeros: 5 }];
      },
      aria: _tr('Chemin de la partie analysée parmi les positions des vrais joueurs.', 'Path of the analysed game among real players’ positions.')
    });
  }).catch(function(e){ hote.innerHTML = '<div class="gr-vide">❌ ' + grEchapper(e && e.message || e) + '</div>'; });
}
