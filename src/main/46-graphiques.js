/* ═══════════════════════════════════════════
   GRAPHIQUES (v2.71) -- communs au Labo, aux Stats du corpus et a Mes statistiques
   Demande d'Olivier : « plus de parametres, de graphiques, de metriques pour le
   Labo, le corpus et les profils ».

   Regles suivies partout (methode « dataviz ») :
     - la largeur du dessin est la largeur REELLE de son conteneur, mesuree au
       rendu (redessine au redimensionnement) : une unite = un pixel, le texte
       reste a 10,5 px et plus sur telephone comme sur ordinateur ;
     - couleurs par role : une serie seule en or (l'accent du site) ; une serie
       de reference en gris ; plusieurs series dans un ordre FIXE (palette
       validee pour les fonds sombres du site : contraste >= 3:1, daltonisme
       ΔE >= 8 entre voisines) ; grandeur = une seule teinte (or), du clair au
       fonce ; signe = bleu / rouge avec un gris neutre au milieu ;
     - traits fins (2 px), barres de 24 px au plus, bout arrondi, grille en
       filets ; le texte n'est jamais de la couleur des donnees ;
     - une legende des 2 series ; une bulle au survol (et au toucher) sur chaque
       barre, case ou abscisse ; « Voir les chiffres » sous les graphiques
       principaux.
═══════════════════════════════════════════ */
const GR_SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const GR_OR = '#c8a84b', GR_REF = '#8a948f', GR_POS = '#3987e5', GR_NEG = '#e66767', GR_MILIEU = '#383835';

function grEchapper(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function grLargeur(el, defaut){ const w = el && el.clientWidth ? el.clientWidth : (defaut || 600); return Math.max(260, Math.min(760, Math.round(w))); }
function grNb(x, dec){ if (x == null || !isFinite(x)) return '—'; const d = dec == null ? (Math.abs(x) >= 100 || Number.isInteger(x) ? 0 : 1) : dec; return Number(x).toLocaleString(currentLang() === 'EN' ? 'en-GB' : 'fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function grPct(x, dec){ return x == null || !isFinite(x) ? '—' : grNb(100 * x, dec == null ? 0 : dec) + ' %'; }
/* v2.77 (audit des statistiques, point 1) : la marge d'erreur d'une proportion, g sur n -- intervalle de
   Wilson a 95 %, plus juste que « p ± 1,96 ecart-type » pour les petits effectifs et pres de 0 ou 100 %.
   La vraie valeur (sur toutes les parties qu'on aurait pu jouer) a 95 chances sur 100 d'etre dedans,
   si les parties du corpus sont representatives. Moins de GR_PEU parties : chiffre fragile, signale. */
const GR_PEU = 100;
function grWilson(g, n){
  if (!n) return null;
  const z = 1.96, p = g / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, e = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return { p: p, bas: Math.max(0, c - e), haut: Math.min(1, c + e) };
}
// « ± 1,7 » : la demi-largeur de l'intervalle, en points de pourcentage
function grMarge(g, n){ const w = grWilson(g, n); return w ? '± ' + grNb(100 * (w.haut - w.bas) / 2, 1) : ''; }
// « entre 52 et 55 % »
function grFourchette(g, n){ const w = grWilson(g, n); return w ? _tr('entre ', 'between ') + grNb(100 * w.bas, 0) + _tr(' et ', ' and ') + grPct(w.haut) : ''; }
function grPeu(n){ return n < GR_PEU ? ' · ⚠ ' + _tr('peu de parties', 'few games') : ''; }
function grCompact(x){ const a = Math.abs(x); if (a >= 1e6) return grNb(x / 1e6, 1) + ' M'; if (a >= 1e4) return grNb(x / 1e3, 0) + ' k'; return grNb(x); }

// graduations « rondes » entre a et b (environ n)
function grGraduations(a, b, n){
  if (!(b > a)) { b = a + 1; }
  const brut = (b - a) / Math.max(1, n || 5), p = Math.pow(10, Math.floor(Math.log10(brut))), r = brut / p;
  const pas = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * p;
  const t = []; for (let v = Math.ceil(a / pas - 1e-9) * pas; v <= b + 1e-9; v += pas) t.push((Math.round(v / pas) * pas) || 0);   // || 0 : jamais « -0 »
  return t;
}
function _grTip(lignes){ return ' data-gr-tip="' + grEchapper(lignes.join('\n')) + '" tabindex="0"'; }
function _grPolice(){ return 'font-family:\'DM Sans\',system-ui,sans-serif'; }

/* ─── La bulle (une seule pour toute la page) ─── */
let _grBulle = null;
function _grMontrer(cible, x, y){
  if (!_grBulle) { _grBulle = document.createElement('div'); _grBulle.className = 'gr-bulle'; _grBulle.setAttribute('role', 'status'); document.body.appendChild(_grBulle); }
  const lignes = String(cible.getAttribute('data-gr-tip') || '').split('\n');
  _grBulle.textContent = '';
  lignes.forEach(function(l, i){ const d = document.createElement('div'); d.textContent = l; if (i === 0) d.className = 'gr-bulle-t'; _grBulle.appendChild(d); });
  _grBulle.style.display = 'block';
  const bw = _grBulle.offsetWidth, bh = _grBulle.offsetHeight, vw = window.innerWidth;
  _grBulle.style.left = Math.max(6, Math.min(vw - bw - 6, x + 12)) + 'px';
  _grBulle.style.top = Math.max(6, y - bh - 12) + 'px';
}
function _grCacher(){ if (_grBulle) _grBulle.style.display = 'none'; }
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('mouseover', function(e){ const c = e.target && e.target.closest ? e.target.closest('[data-gr-tip]') : null; if (c) _grMontrer(c, e.clientX, e.clientY); else _grCacher(); });
  document.addEventListener('focusin', function(e){ const c = e.target && e.target.closest ? e.target.closest('[data-gr-tip]') : null; if (c) { const r = c.getBoundingClientRect(); _grMontrer(c, r.left + r.width / 2, r.top); } });
  document.addEventListener('focusout', _grCacher);
  document.addEventListener('touchstart', function(e){ const c = e.target && e.target.closest ? e.target.closest('[data-gr-tip]') : null; if (c && e.touches && e.touches[0]) _grMontrer(c, e.touches[0].clientX, e.touches[0].clientY); else _grCacher(); }, { passive: true });
  document.addEventListener('scroll', _grCacher, { passive: true, capture: true });
}

/* ─── Redessiner a la bonne largeur ─── */
const _GR_REDIM = {};
function grSurRedim(cle, hoteId, f){ const el = document.getElementById(hoteId); _GR_REDIM[cle] = { id: hoteId, f: f, w: el ? el.clientWidth : 0 }; }
if (typeof window !== 'undefined' && window.addEventListener) {
  let _grMinuteur = null;
  window.addEventListener('resize', function(){
    clearTimeout(_grMinuteur);
    _grMinuteur = setTimeout(function(){
      Object.keys(_GR_REDIM).forEach(function(k){
        const r = _GR_REDIM[k], el = document.getElementById(r.id);
        if (!el || !el.isConnected || !el.offsetParent) return;
        if (Math.abs(el.clientWidth - r.w) > 40) { r.w = el.clientWidth; try { r.f(); } catch (e) {} }
      });
    }, 200);
  });
}

/* ─── Courbes : series = [{ nom, couleur, pts: [[x, y], ...], bande: [[x, bas, haut], ...], points }] ─── */
function grLignes(W, series, o){
  o = o || {};
  const H = o.h || 210, haut = 12, bas = o.titreX ? 34 : 24, g = o.gauche || 44, d = 14;
  const xs = [], ys = [];
  series.forEach(function(s){ (s.pts || []).forEach(function(p){ xs.push(p[0]); ys.push(p[1]); }); (s.bande || []).concat(s.barres || []).forEach(function(b){ ys.push(b[1], b[2]); }); });
  if (!xs.length) return '<div class="gr-vide">' + (o.vide || _tr('Pas encore de données.', 'No data yet.')) + '</div>';
  let x0 = o.xMin != null ? o.xMin : Math.min.apply(null, xs), x1 = o.xMax != null ? o.xMax : Math.max.apply(null, xs);
  let y0 = o.yMin != null ? o.yMin : Math.min.apply(null, ys), y1 = o.yMax != null ? o.yMax : Math.max.apply(null, ys);
  if (o.zero) { y0 = Math.min(y0, 0); y1 = Math.max(y1, 0); }
  if (x1 === x0) { x0 -= 1; x1 += 1; }
  if (y1 === y0) { y0 -= 1; y1 += 1; }
  const ty = grGraduations(y0, y1, o.nbY || 4);
  // l'axe s'arrete sur des graduations rondes, au-dela des donnees (sauf bornes imposees)
  if (ty.length > 1) { const pas = ty[1] - ty[0];
    if (o.yMin == null) while (ty[0] > y0 + 1e-9) ty.unshift((ty[0] - pas) || 0);
    if (o.yMax == null) while (ty[ty.length - 1] < y1 - 1e-9) ty.push((ty[ty.length - 1] + pas) || 0); }
  y0 = Math.min(y0, ty[0]); y1 = Math.max(y1, ty[ty.length - 1]);
  const lw = W - g - d, lh = H - haut - bas;
  const X = function(v){ return g + (v - x0) / (x1 - x0) * lw; }, Y = function(v){ return haut + lh - (v - y0) / (y1 - y0) * lh; };
  const fy = o.fmtY || function(v){ return grNb(v); }, fx = o.fmtX || function(v){ return grNb(v); };
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + grEchapper(o.aria || '') + '" xmlns="http://www.w3.org/2000/svg" style="display:block;' + _grPolice() + '">';
  ty.forEach(function(v){ const y = Y(v).toFixed(1); s += '<line x1="' + g + '" x2="' + (W - d) + '" y1="' + y + '" y2="' + y + '" class="gr-grille"/><text x="' + (g - 6) + '" y="' + (+y + 3.5) + '" text-anchor="end" class="gr-axe">' + fy(v) + '</text>'; });
  if (o.zero && y0 < 0 && y1 > 0) s += '<line x1="' + g + '" x2="' + (W - d) + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" class="gr-base"/>';
  const tx = o.ticksX || grGraduations(x0, x1, Math.max(2, Math.min(8, Math.floor(lw / 70))));
  tx.forEach(function(v){ if (v < x0 - 1e-9 || v > x1 + 1e-9) return; s += '<text x="' + X(v).toFixed(1) + '" y="' + (haut + lh + 15) + '" text-anchor="middle" class="gr-axe">' + fx(v) + '</text>'; });
  if (o.titreX) s += '<text x="' + (W - d) + '" y="' + (H - 3) + '" text-anchor="end" class="gr-axe">' + grEchapper(o.titreX) + '</text>';
  if (o.titreY) s += '<text x="' + (g + 4) + '" y="' + (haut + 10) + '" class="gr-axe">' + grEchapper(o.titreY) + '</text>';
  if (o.diag) s += '<line x1="' + X(Math.max(x0, y0)).toFixed(1) + '" y1="' + Y(Math.max(x0, y0)).toFixed(1) + '" x2="' + X(Math.min(x1, y1)).toFixed(1) + '" y2="' + Y(Math.min(x1, y1)).toFixed(1) + '" class="gr-base"/>';
  series.forEach(function(sr, i){
    const c = sr.couleur || GR_SERIES[i % GR_SERIES.length];
    if (sr.bande && sr.bande.length > 1) {
      const hautB = sr.bande.map(function(b){ return X(b[0]).toFixed(1) + ',' + Y(b[2]).toFixed(1); }), basB = sr.bande.slice().reverse().map(function(b){ return X(b[0]).toFixed(1) + ',' + Y(b[1]).toFixed(1); });
      s += '<polygon points="' + hautB.concat(basB).join(' ') + '" fill="' + c + '" fill-opacity="0.12"/>';
    }
    if (sr.barres) sr.barres.forEach(function(b){ s += '<line x1="' + X(b[0]).toFixed(1) + '" x2="' + X(b[0]).toFixed(1) + '" y1="' + Y(b[1]).toFixed(1) + '" y2="' + Y(b[2]).toFixed(1) + '" stroke="' + c + '" stroke-width="2" stroke-linecap="round" opacity="0.55"/>'; });
    const P = (sr.pts || []).filter(function(p){ return p[1] != null && isFinite(p[1]); });
    if (P.length > 1) s += '<polyline points="' + P.map(function(p){ return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1); }).join(' ') + '" fill="none" stroke="' + c + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>';
    if (sr.points || P.length === 1) P.forEach(function(p){ s += '<circle cx="' + X(p[0]).toFixed(1) + '" cy="' + Y(p[1]).toFixed(1) + '" r="4" fill="' + c + '" stroke="var(--surface)" stroke-width="2"/>'; });
  });
  // le survol : une bande verticale par abscisse, qui donne toutes les series
  const toutesX = []; series.forEach(function(sr){ (sr.pts || []).forEach(function(p){ if (toutesX.indexOf(p[0]) < 0) toutesX.push(p[0]); }); });
  toutesX.sort(function(a, b){ return a - b; });
  toutesX.forEach(function(x, k){
    const xa = k ? (X(toutesX[k - 1]) + X(x)) / 2 : g, xb = k < toutesX.length - 1 ? (X(x) + X(toutesX[k + 1])) / 2 : W - d;
    const lignes = [(o.nomX ? o.nomX + ' ' : '') + fx(x)];
    series.forEach(function(sr){ const p = (sr.pts || []).find(function(q){ return q[0] === x; }); if (p && p[1] != null) lignes.push((sr.nom ? sr.nom + _dimDp() : '') + (o.fmtTip || fy)(p[1], sr, x)); });
    s += '<rect x="' + xa.toFixed(1) + '" y="' + haut + '" width="' + Math.max(1, xb - xa).toFixed(1) + '" height="' + lh + '" fill="transparent" class="gr-cible"' + _grTip(lignes) + '/>';
  });
  s += '</svg>';
  return '<div class="gr">' + s + (series.length >= 2 ? grLegende(series.map(function(sr, i){ return { nom: sr.nom, couleur: sr.couleur || GR_SERIES[i % GR_SERIES.length], trait: true }; })) : '') + '</div>';
}
function grLegende(L){ return '<div class="gr-legende">' + L.map(function(l){ return '<span><i class="' + (l.trait ? 'gr-cle-trait' : 'gr-cle') + '" style="background:' + l.couleur + '"></i>' + grEchapper(l.nom) + '</span>'; }).join('') + '</div>'; }

/* ─── Colonnes : items = [{ lab, v, tip, couleur }] ─── */
function grColonnes(W, items, o){
  o = o || {};
  if (!items.length) return '<div class="gr-vide">' + (o.vide || _tr('Pas encore de données.', 'No data yet.')) + '</div>';
  const H = o.h || 180, haut = 18, bas = o.titreX ? 34 : 22, g = o.gauche || 40, d = 8;
  const lw = W - g - d, lh = H - haut - bas, pas = lw / items.length, bw = Math.max(3, Math.min(24, pas - 2));
  const max = o.max || Math.max.apply(null, items.map(function(i){ return i.v; })) || 1;
  const ty = grGraduations(0, max, 4), top = Math.max(max, ty[ty.length - 1]);
  const fy = o.fmtY || function(v){ return grNb(v); };
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="100%" role="img" aria-label="' + grEchapper(o.aria || '') + '" xmlns="http://www.w3.org/2000/svg" style="display:block;' + _grPolice() + '">';
  ty.forEach(function(v){ const y = (haut + lh - v / top * lh).toFixed(1); s += '<line x1="' + g + '" x2="' + (W - d) + '" y1="' + y + '" y2="' + y + '" class="gr-grille"/><text x="' + (g - 6) + '" y="' + (+y + 3.5) + '" text-anchor="end" class="gr-axe">' + fy(v) + '</text>'; });
  const chaque = Math.max(1, Math.ceil(items.length / Math.max(1, Math.floor(lw / 34))));
  items.forEach(function(it, i){
    const h = Math.max(0, it.v / top * lh), x = g + i * pas + (pas - bw) / 2, y = haut + lh - h, r = Math.min(4, bw / 2, h);
    if (h > 0) s += '<path d="M' + x.toFixed(1) + ',' + (haut + lh) + 'V' + (y + r).toFixed(1) + 'Q' + x.toFixed(1) + ',' + y.toFixed(1) + ' ' + (x + r).toFixed(1) + ',' + y.toFixed(1) + 'H' + (x + bw - r).toFixed(1) + 'Q' + (x + bw).toFixed(1) + ',' + y.toFixed(1) + ' ' + (x + bw).toFixed(1) + ',' + (y + r).toFixed(1) + 'V' + (haut + lh) + 'Z" fill="' + (it.couleur || GR_OR) + '"/>';
    s += '<rect x="' + (g + i * pas).toFixed(1) + '" y="' + haut + '" width="' + pas.toFixed(1) + '" height="' + lh + '" fill="transparent" class="gr-cible"' + _grTip([it.tip || (it.lab + _dimDp() + fy(it.v))]) + '/>';
    if (i % chaque === 0) s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (haut + lh + 14) + '" text-anchor="middle" class="gr-axe">' + grEchapper(it.lab) + '</text>';
    if (o.valeurs && h > 0 && bw >= 18) s += '<text x="' + (x + bw / 2).toFixed(1) + '" y="' + (y - 4).toFixed(1) + '" text-anchor="middle" class="gr-val">' + (o.fmtV || fy)(it.v) + '</text>';
  });
  s += '<line x1="' + g + '" x2="' + (W - d) + '" y1="' + (haut + lh) + '" y2="' + (haut + lh) + '" class="gr-base"/>';
  if (o.titreX) s += '<text x="' + (W - d) + '" y="' + (H - 3) + '" text-anchor="end" class="gr-axe">' + grEchapper(o.titreX) + '</text>';
  return '<div class="gr">' + s + '</svg></div>';
}

/* ─── Barres horizontales (HTML : lisibles a toute largeur) ───
   items = [{ lab, v, couleur, txt, tip, bas, haut, ref }] ; o.max, o.min (barres signees autour de 0), o.fmt */
function grBarres(items, o){
  o = o || {};
  if (!items.length) return '<div class="gr-vide">' + (o.vide || _tr('Pas encore de données.', 'No data yet.')) + '</div>';
  const fmt = o.fmt || function(v){ return grNb(v); };
  let mn = o.min != null ? o.min : 0, mx = o.max != null ? o.max : 0;
  items.forEach(function(it){ mx = Math.max(mx, it.haut != null ? it.haut : it.v, it.ref || 0); mn = Math.min(mn, it.bas != null ? it.bas : it.v); });
  if (mx === mn) mx = mn + 1;
  const P = function(v){ return (v - mn) / (mx - mn) * 100; }, z = P(0);
  let h = '<div class="gr-barres">';
  items.forEach(function(it){
    const a = Math.min(z, P(it.v)), b = Math.max(z, P(it.v));
    const c = it.couleur || (mn < 0 ? (it.v >= 0 ? GR_POS : GR_NEG) : GR_OR);
    h += '<div class="gr-barre"' + _grTip([it.tip || (it.lab + _dimDp() + (it.txt || fmt(it.v)))]) + '><span class="gr-barre-lab">' + grEchapper(it.lab) + '</span>'
      + '<span class="gr-barre-piste">'
      + (mn < 0 ? '<i class="gr-zero" style="left:' + z.toFixed(1) + '%"></i>' : '')
      + '<i class="gr-barre-v" style="left:' + a.toFixed(1) + '%;width:' + Math.max(0.6, b - a).toFixed(1) + '%;background:' + c + '"></i>'
      + (it.bas != null && it.haut != null ? '<i class="gr-moustache" style="left:' + P(it.bas).toFixed(1) + '%;width:' + Math.max(0.4, P(it.haut) - P(it.bas)).toFixed(1) + '%"></i>' : '')
      + (it.ref != null ? '<i class="gr-repere" style="left:' + P(it.ref).toFixed(1) + '%"></i>' : '')
      + '</span><span class="gr-barre-val">' + (it.txt || fmt(it.v)) + '</span></div>';
  });
  return h + _grAxeLigne(o.axe) + '</div>';
}
// v2.81 : une ligne d'axe sous les pistes, dans la meme grille (memes colonnes) : [gauche, milieu ou null, droite]
function _grAxeLigne(A){
  if (!A) return '';
  return '<div class="gr-barre gr-axe-l" aria-hidden="true"><span></span><span class="gr-axe-piste"><span>' + A[0] + '</span>' + (A[1] != null ? '<span class="gr-axe-m">' + A[1] + '</span>' : '') + '<span>' + A[2] + '</span></span><span></span></div>';
}

/* ─── Boites a moustaches (v2.80) : items = [{ lab, vals: [nombres], tip }] -- une ligne par item, comme
   grBarres. La boite : du 1er au 3e quartile ; le trait : la mediane ; les moustaches : du 10e au 90e
   centile (pas du minimum au maximum : une seule partie de 370 coups ecraserait tout). ─── */
function grQuantile(tri, q){ if (!tri.length) return null; const i = (tri.length - 1) * q, a = Math.floor(i), b = Math.ceil(i); return tri[a] + (tri[b] - tri[a]) * (i - a); }
function grBoites(items, o){
  o = o || {};
  const S = items.map(function(it){ const t = it.vals.slice().sort(function(a, b){ return a - b; });
    return { it: it, n: t.length, p10: grQuantile(t, 0.1), q1: grQuantile(t, 0.25), med: grQuantile(t, 0.5), q3: grQuantile(t, 0.75), p90: grQuantile(t, 0.9) }; }).filter(function(x){ return x.n; });
  if (!S.length) return '<div class="gr-vide">' + (o.vide || _tr('Pas encore de données.', 'No data yet.')) + '</div>';
  const fmt = o.fmt || function(v){ return grNb(v, 0); };
  let mn = o.min != null ? o.min : Math.min.apply(null, S.map(function(x){ return x.p10; })), mx = o.max != null ? o.max : Math.max.apply(null, S.map(function(x){ return x.p90; }));
  if (mx === mn) mx = mn + 1;
  const P = function(v){ return ((v - mn) / (mx - mn) * 100).toFixed(1); };
  let h = '<div class="gr-barres gr-boites">';
  S.forEach(function(x){
    const tip = x.it.tip || (x.it.lab + _dimDp() + _tr('médiane ', 'median ') + fmt(x.med) + _tr(', la moitié des parties entre ', ', half of the games between ') + fmt(x.q1) + _tr(' et ', ' and ') + fmt(x.q3) + _tr(', 8 sur 10 entre ', ', 8 in 10 between ') + fmt(x.p10) + _tr(' et ', ' and ') + fmt(x.p90) + ' (' + x.n + _tr(' parties)', ' games)'));
    h += '<div class="gr-barre"' + _grTip([tip]) + '><span class="gr-barre-lab">' + grEchapper(x.it.lab) + '</span><span class="gr-barre-piste">'
      + '<i class="gr-boite-m" style="left:' + P(x.p10) + '%;width:' + Math.max(0.4, P(x.p90) - P(x.p10)).toFixed(1) + '%"></i>'
      + '<i class="gr-boite-q" style="left:' + P(x.q1) + '%;width:' + Math.max(0.6, P(x.q3) - P(x.q1)).toFixed(1) + '%"></i>'
      + '<i class="gr-boite-med" style="left:' + P(x.med) + '%"></i>'
      + (o.ref != null ? '<i class="gr-repere" style="left:' + P(o.ref) + '%"></i>' : '')
      + '</span><span class="gr-barre-val">' + fmt(x.med) + '</span></div>';
  });
  return h + _grAxeLigne([fmt(mn), null, fmt(mx)]) + '</div>';   // v2.81 : l'axe dans la grille des boites (meme largeur de piste)
}

/* ─── Barre empilee a 100 % : segments = [{ nom, v }] (couleurs dans l'ordre fixe) ─── */
function grPile(segments, o){
  o = o || {};
  const tot = segments.reduce(function(a, s){ return a + s.v; }, 0);
  if (!tot) return '<div class="gr-vide">' + _tr('Pas encore de données.', 'No data yet.') + '</div>';
  let h = '<div class="gr-pile">';
  segments.forEach(function(sg, i){ if (!sg.v) return; h += '<i style="flex:' + sg.v + ';background:' + (sg.couleur || GR_SERIES[i % GR_SERIES.length]) + '"' + _grTip([sg.nom + _dimDp() + grNb(sg.v) + ' (' + grPct(sg.v / tot) + ')']) + '></i>'; });
  h += '</div><div class="gr-legende">' + segments.map(function(sg, i){ return sg.v ? '<span><i class="gr-cle" style="background:' + (sg.couleur || GR_SERIES[i % GR_SERIES.length]) + '"></i>' + grEchapper(sg.nom) + ' · ' + grPct(sg.v / tot) + '</span>' : ''; }).join('') + '</div>';
  return h;
}

/* ─── Carte de chaleur (tableau HTML) : f(i, j) -> { v, txt, tip } ou null ───
   o.echelle : 'or' (grandeur, 0 -> max) ou 'signe' (o.centre au milieu, bleu au-dessus, rouge en dessous) */
function grCarte(lignes, colonnes, f, o){
  o = o || {};
  const vals = [];
  lignes.forEach(function(l, i){ colonnes.forEach(function(c, j){ const x = f(i, j); if (x && x.v != null && isFinite(x.v)) vals.push(x.v); }); });
  const mx = o.max != null ? o.max : Math.max.apply(null, vals.concat([0])), mn = o.min != null ? o.min : Math.min.apply(null, vals.concat([0]));
  const centre = o.centre != null ? o.centre : 0, ecart = Math.max(Math.abs(mx - centre), Math.abs(mn - centre)) || 1;
  const fond = function(v){
    if (o.echelle === 'signe') { const t = Math.min(1, Math.abs(v - centre) / ecart); return { c: v >= centre ? 'rgba(57,135,229,' + (0.12 + 0.78 * t).toFixed(2) + ')' : 'rgba(230,103,103,' + (0.12 + 0.78 * t).toFixed(2) + ')', fort: t > 0.55 }; }
    const t = mx > 0 ? Math.max(0, v) / mx : 0; return { c: 'rgba(200,168,75,' + (0.06 + 0.86 * t).toFixed(2) + ')', fort: t > 0.55 };
  };
  let h = '<div class="gr-carte-cadre"><table class="gr-carte"><thead><tr><th></th>' + colonnes.map(function(c){ return '<th>' + grEchapper(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
  lignes.forEach(function(l, i){
    h += '<tr><th>' + grEchapper(l) + '</th>';
    colonnes.forEach(function(c, j){
      const x = f(i, j);
      if (!x || x.v == null || !isFinite(x.v)) { h += '<td class="gr-carte-vide">' + (x && x.txt ? grEchapper(x.txt) : '') + '</td>'; return; }
      const fd = fond(x.v);
      h += '<td style="background:' + fd.c + ';color:' + (fd.fort ? '#0d0f0e' : 'var(--text)') + '"' + _grTip([x.tip || (l + ' · ' + c + _dimDp() + (x.txt || grNb(x.v)))]) + '>' + grEchapper(x.txt != null ? x.txt : grNb(x.v)) + '</td>';
    });
    h += '</tr>';
  });
  h += '</tbody></table></div>';
  if (o.legende) h += '<div class="gr-echelle"><span>' + grEchapper(o.legende[0]) + '</span><i class="' + (o.echelle === 'signe' ? 'gr-echelle-signe' : 'gr-echelle-or') + '"></i><span>' + grEchapper(o.legende[1]) + '</span></div>';
  return h;
}

/* ─── Le plateau en carte de chaleur : val(r, c) -> nombre ─── */
function grPlateau(W, val, o){
  o = o || {};
  const L = [5, 6, 7, 8, 9, 8, 7, 6, 5], Wp = Math.min(W, o.max || 420), R = Wp / 20, H = Math.round(R * 1.75 * 8 + 2 * R + 8);
  let mx = 0; for (let r = 0; r < 9; r++) for (let c = 0; c < L[r]; c++) mx = Math.max(mx, val(r, c) || 0);
  let s = '<svg viewBox="0 0 ' + Wp + ' ' + H + '" width="100%" style="display:block;max-width:' + Wp + 'px;margin:0 auto;' + _grPolice() + '" role="img" aria-label="' + grEchapper(o.aria || '') + '" xmlns="http://www.w3.org/2000/svg">';
  for (let r = 0; r < 9; r++) for (let c = 0; c < L[r]; c++) {
    const v = val(r, c) || 0, t = mx ? v / mx : 0;
    const x = Wp / 2 + (c - (L[r] - 1) / 2) * R * 2.02, y = R + 4 + r * R * 1.75;
    s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (R * 0.92).toFixed(1) + '" fill="' + (v ? 'rgba(200,168,75,' + (0.08 + 0.88 * t).toFixed(2) + ')' : 'var(--surface2)') + '" stroke="var(--border)" stroke-width="1"'
      + _grTip([coordToABAPRO(r, c) + _dimDp() + (o.fmt ? o.fmt(v) : grNb(v))]) + '/>';
  }
  s += '</svg>';
  if (o.legende !== false) s += '<div class="gr-echelle"><span>0</span><i class="gr-echelle-or"></i><span>' + (o.fmt ? o.fmt(mx) : grNb(mx)) + '</span></div>';
  return '<div class="gr">' + s + '</div>';
}

/* ─── Petits multiples : une petite courbe par element (meme forme, meme couleur) ───
   La grille se fait en CSS (autant de colonnes de 140 px que la place le permet) ; chaque courbe garde
   sa hauteur, quelle que soit sa largeur (trait non deforme). */
function grMultiples(W, items, o){
  o = o || {};
  const w = 140, h = o.h || 56;
  let s = '<div class="gr-multiples">';
  items.forEach(function(it){
    const P = it.pts || []; let mn = Infinity, mx = -Infinity; P.forEach(function(p){ mn = Math.min(mn, p[1]); mx = Math.max(mx, p[1]); });
    if (it.min != null) mn = Math.min(mn, it.min);
    if (it.max != null) mx = Math.max(mx, it.max);
    if (!(mx > mn)) { mx = (isFinite(mx) ? mx : 0) + 1; mn = (isFinite(mn) ? mn : 0) - 1; }
    const x0 = P.length ? P[0][0] : 0, x1 = P.length ? P[P.length - 1][0] : 1, ex = (x1 - x0) || 1;
    const X = function(x){ return 2 + (x - x0) / ex * (w - 4); }, Y = function(y){ return 5 + (1 - (y - mn) / (mx - mn)) * (h - 10); };
    let svg = '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" width="100%" height="' + h + '" xmlns="http://www.w3.org/2000/svg" style="display:block">';
    if (P.length > 1) { let d = ''; P.forEach(function(p, k){ d += (k ? 'H' + X(p[0]).toFixed(1) + 'V' : 'M' + X(p[0]).toFixed(1) + ',') + Y(p[1]).toFixed(1); }); svg += '<path d="' + d + '" fill="none" stroke="' + GR_OR + '" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>'; }
    else if (P.length === 1) svg += '<line x1="2" x2="' + (w - 2) + '" y1="' + Y(P[0][1]).toFixed(1) + '" y2="' + Y(P[0][1]).toFixed(1) + '" stroke="' + GR_OR + '" stroke-width="2" vector-effect="non-scaling-stroke"/>';
    svg += '</svg>';
    s += '<div class="gr-multiple"' + _grTip([it.nom].concat(P.map(function(p){ return (o.nomX || '') + grNb(p[0]) + _dimDp() + grNb(p[1]); }).slice(-8))) + '><div class="gr-multiple-t"><span>' + grEchapper(it.nom) + '</span><b>' + (P.length ? grNb(P[P.length - 1][1]) : '—') + '</b></div>' + svg + '</div>';
  });
  return s + '</div>';
}

/* ─── Tuiles de chiffres et tableau des chiffres ─── */
function grTuiles(T){ return '<div class="gr-tuiles">' + T.map(function(t){ return '<div class="gr-tuile"><span>' + grEchapper(t.lab) + '</span><b>' + t.v + '</b>' + (t.sous ? '<small>' + t.sous + '</small>' : '') + '</div>'; }).join('') + '</div>'; }
function grChiffres(entetes, lignes){
  return '<details class="gr-chiffres"><summary>' + _tr('Voir les chiffres', 'See the numbers') + '</summary><div class="gr-carte-cadre"><table><thead><tr>' + entetes.map(function(e){ return '<th>' + grEchapper(e) + '</th>'; }).join('') + '</tr></thead><tbody>'
    + lignes.map(function(l){ return '<tr>' + l.map(function(c){ return '<td>' + grEchapper(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></details>';
}
