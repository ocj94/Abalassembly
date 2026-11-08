/* ═══════════════════════════════════════════
   v3.13 — TEMPS RÉELS DES NIVEAUX
   Demande d'ocj94 (« Ok go ») : faire servir les donnees de l'Observatoire au Labo.
   Le banc « Les niveaux » mesure l'Elo des niveaux avec UN fil de calcul ; sur la
   machine de mesure, les niveaux 4 a 6 ne terminaient que la profondeur 2 (v3.11).
   Ici, ce sont les coups que l'IA joue VRAIMENT contre le joueur, sur SON appareil,
   avec tous ses fils : la profondeur terminee, le temps, le temps accorde.

   - Rien n'est note sans la case cochee (Labo, onglet « Les niveaux »), et rien ne
     quitte le navigateur : localStorage seulement, 1 500 coups au plus.
   - Seulement en partie contre l'IA (pas le Labo, pas l'analyse), niveau 2 et plus,
     coups calcules (ni livre, ni table de finale).
   - « Il faudrait » : le temps qui laisserait terminer la profondeur prevue dans
     8 coups sur 10. Pour un coup qui l'a terminee, son temps reel ; sinon, le temps
     de fin de la derniere profondeur terminee, multiplie par la croissance MESUREE
     ici d'une profondeur a la suivante (mediane). Une profondeur jamais terminee sur
     cet appareil prolonge la derniere croissance mesuree : c'est marque « extrapole ».
   - Rien n'est change dans les niveaux : ce sont des mesures pour les regler.
═══════════════════════════════════════════ */
const TR_CLE = 'abaTempsReels', TR_ACTIF_CLE = 'abaTempsReelsActif', TR_MAX = 1500, TR_SANS_LIMITE = 3600000;
function trActif() { try { return localStorage.getItem(TR_ACTIF_CLE) === '1'; } catch (e) { return false; } }
function trLire() {
  try { const d = JSON.parse(localStorage.getItem(TR_CLE) || 'null'); if (d && d.v === 1 && Array.isArray(d.c)) return d; } catch (e) {}
  return { v: 1, c: [] };
}
function _trEcrire(d) { try { localStorage.setItem(TR_CLE, JSON.stringify(d)); return true; } catch (e) { return false; } }
function trBasculer() { const on = !trActif(); try { localStorage.setItem(TR_ACTIF_CLE, on ? '1' : '0'); } catch (e) {} renderTempsReels(); }
function trEffacer() { try { localStorage.removeItem(TR_CLE); } catch (e) {} renderTempsReels(); }

// temps ecoule a la fin de chaque profondeur terminee par TOUS les fils (le plus lent d'entre eux) : f[d-1]
function _trTerminees(m) {
  const fils = (m && m.parFil && m.parFil.length) ? m.parFil : [m], f = [];
  for (let d = 1; d <= 64; d++) {
    if (!fils.every(function (x) { return x && x.depthInfo && x.depthInfo[d]; })) break;
    f.push(Math.round(Math.max.apply(null, fils.map(function (x) { return x.depthInfo[d].fin || 0; }))));
  }
  return f;
}
// appele a la fin de chaque coup calcule de l'IA (17-puzzle-interaction-and-lab-start.js)
function trNoter(m, couleur, config) {
  if (!m || !config || !trActif()) return false;
  if (typeof GameMode !== 'undefined' && GameMode.get && GameMode.get() !== 'ai') return false;
  const niv = (typeof aiDifficulty !== 'undefined') ? String(aiDifficulty) : '';
  if (!niv || niv === '1') return false;
  const f = _trTerminees(m); if (!f.length) return false;
  const d = trLire();
  d.c.push({ n: niv, b: config.time || 0, D: config.depth || 0, ds: m.depth || f.length, ms: Math.round(m.time || 0), f: f,
             fils: (m.parFil && m.parFil.length) || 1, j: Math.floor(Date.now() / 864e5) });
  if (d.c.length > TR_MAX) d.c.splice(0, d.c.length - TR_MAX);
  d.coeurs = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 0;
  if (!d.depuis) d.depuis = Date.now();
  return _trEcrire(d);
}

function _trMediane(L) { return _trQuantile(L, 0.5); }
function _trQuantile(L, q) {
  if (!L.length) return null;
  const s = L.slice().sort(function (a, b) { return a - b; }), x = (s.length - 1) * q, i = Math.floor(x);
  return i + 1 < s.length ? s[i] + (s[i + 1] - s[i]) * (x - i) : s[i];
}
// croissance mesuree : pour chaque profondeur d >= 2, mediane de (fin de d) / (fin de d-1), sur 5 coups au moins
function _trCroissance(C) {
  const par = {};
  C.forEach(function (e) { for (let d = 2; d <= e.f.length; d++) { const a = e.f[d - 2], b = e.f[d - 1]; if (a >= 20 && b >= a) (par[d] = par[d] || []).push(b / a); } });
  const R = {}; Object.keys(par).forEach(function (d) { if (par[d].length >= 5) R[d] = _trMediane(par[d]); });
  return R;
}
// temps qu'il aurait fallu a ce coup pour terminer la profondeur D (null si rien pour l'estimer)
function _trEstime(e, D, R) {
  if (!D) return null;
  if (e.f.length >= D) return { t: e.f[D - 1], extrap: false };
  const connues = Object.keys(R).map(Number).sort(function (a, b) { return a - b; });
  if (!connues.length || !e.f.length) return null;
  let t = e.f[e.f.length - 1], extrap = false;
  for (let d = e.f.length + 1; d <= D; d++) {
    let r = R[d];
    if (!r) { r = R[connues[connues.length - 1]]; extrap = true; }   // jamais mesuree ici : on prolonge la derniere croissance
    t *= r;
  }
  return { t: t, extrap: extrap };
}
function trResume(d) {
  const C = (d && d.c) || [], R = _trCroissance(C), G = {};
  C.forEach(function (e) { const k = e.n + '|' + e.b; (G[k] = G[k] || { n: e.n, b: e.b, D: e.D, L: [] }).L.push(e); });
  const groupes = Object.keys(G).map(function (k) {
    const g = G[k], L = g.L, nb = L.length, dist = {};
    L.forEach(function (e) { dist[e.f.length] = (dist[e.f.length] || 0) + 1; });
    const est = []; let extrap = false;
    L.forEach(function (e) { const x = _trEstime(e, g.D, R); if (x) { est.push(x.t); if (x.extrap) extrap = true; } });
    return { n: g.n, b: g.b, D: g.D, nb: nb, dist: dist,
             atteinte: L.filter(function (e) { return e.f.length >= g.D; }).length / nb,
             ms: _trMediane(L.map(function (e) { return e.ms; })),
             depasse: g.b >= TR_SANS_LIMITE ? 0 : L.filter(function (e) { return e.ms > g.b * 1.15 + 100; }).length / nb,
             besoin80: (nb >= 10 && est.length >= 0.8 * nb) ? _trQuantile(est, 0.8) : null, extrap: extrap,
             fils: _trMediane(L.map(function (e) { return e.fils; })) };
  }).sort(function (a, b) { return (+a.n - +b.n) || (a.b - b.b); });
  return { R: R, groupes: groupes, n: C.length };
}

function _trS(ms) { return ms == null ? '—' : ms >= TR_SANS_LIMITE ? 'sans limite' : (ms < 1000 ? Math.round(ms) + ' ms' : (Math.round(ms / 100) / 10).toLocaleString('fr-FR') + ' s'); }
function _trPct(x) { return Math.round(100 * x) + ' %'; }
function renderTempsReels() {
  const hote = document.getElementById('lab-temps-host'); if (!hote) return;
  const actif = trActif(), d = trLire(), S = trResume(d);
  let h = '<h4>⏱ En vraie partie, sur cet appareil</h4>'
    + '<p class="lab-intro">Le banc ci-dessus fait jouer les niveaux entre eux sur un seul fil de calcul. Ici, ce sont les coups que l’IA joue <b>vraiment contre vous</b>, sur cet appareil, avec tous ses fils : jusqu’où elle va dans le temps accordé. Rien ne quitte ce navigateur.</p>'
    + '<div class="lab-options"><label><input type="checkbox" id="lab-tr-actif"' + (actif ? ' checked' : '') + ' data-change="trBasculer()"> Noter les temps de calcul de l’IA dans mes parties</label>'
    + (S.n ? '<span class="lab-note">' + S.n.toLocaleString('fr-FR') + ' coup' + (S.n > 1 ? 's' : '') + ' notés' + (d.depuis ? ' depuis le ' + new Date(d.depuis).toLocaleDateString('fr-FR') : '') + (d.coeurs ? ' · ' + d.coeurs + ' cœurs' : '') + '</span> <button class="ctrl-btn" style="width:auto;flex:0 0 auto;padding:4px 14px" data-click="trEffacer()">Effacer</button>' : '') + '</div>';
  if (!S.n) {
    h += '<div class="lab-note">' + (actif ? 'Aucun coup noté pour l’instant : jouez une partie contre l’IA (niveau 2 ou plus). Les coups du livre d’ouvertures et des tables de finale ne comptent pas.' : 'Cochez la case puis jouez contre l’IA : chaque coup calculé sera noté ici.') + '</div>';
    hote.innerHTML = h; return;
  }
  h += '<table class="lab-poids lab-temps"><thead><tr><th>Niveau</th><th>Prévu</th><th>Coups</th><th>Profondeur terminée</th><th>Prévue atteinte</th><th>Temps médian</th><th>Dépasse</th><th>Il faudrait</th></tr></thead><tbody>';
  S.groupes.forEach(function (g) {
    const dist = Object.keys(g.dist).map(Number).sort(function (a, b) { return a - b; }).map(function (p) { return p + ' : ' + _trPct(g.dist[p] / g.nb); }).join(' · ');
    const choisi = (typeof AI_DIFFICULTY_CONFIG !== 'undefined' && AI_DIFFICULTY_CONFIG[g.n] && AI_DIFFICULTY_CONFIG[g.n].time !== g.b) ? ' <small>(réflexion choisie)</small>' : '';
    h += '<tr><td>' + g.n + '</td><td>prof. ' + g.D + ' · ' + _trS(g.b) + choisi + '</td><td>' + g.nb + '</td><td>' + dist + '</td>'
      + '<td' + (g.atteinte < 0.5 ? ' style="color:#ef9a9a"' : '') + '>' + _trPct(g.atteinte) + '</td><td>' + _trS(g.ms) + '</td><td>' + (g.b >= TR_SANS_LIMITE ? '—' : _trPct(g.depasse)) + '</td>'
      + '<td>' + (g.atteinte >= 0.8 ? 'déjà atteinte' : g.besoin80 == null ? (g.nb < 10 ? 'trop peu de coups' : '—') : '≈ ' + _trS(g.besoin80) + (g.extrap ? ' <small>(extrapolé)</small>' : '')) + '</td></tr>';
  });
  h += '</tbody></table>';
  const pas = Object.keys(S.R).map(Number).sort(function (a, b) { return a - b; });
  if (pas.length) h += '<div class="lab-note">Croissance mesurée ici d’une profondeur à la suivante (médiane) : ' + pas.map(function (p) { return (p - 1) + ' → ' + p + ' × ' + (Math.round(S.R[p] * 10) / 10).toLocaleString('fr-FR'); }).join(' ; ') + '.</div>';
  h += '<div class="lab-note"><b>Profondeur terminée</b> : la dernière profondeur que tous les fils ont finie, en part des coups. <b>Dépasse</b> : coups qui ont pris plus de 15 % au-delà du temps accordé (le minuteur n’arrête la recherche qu’entre deux coups de départ). '
    + '<b>Il faudrait</b> : le temps qui laisserait terminer la profondeur prévue dans 8 coups sur 10, estimé à partir des coups notés ; « extrapolé » quand cette profondeur n’a jamais été terminée ici. Rien n’est changé dans les niveaux : ce sont des mesures pour les régler.</div>';
  hote.innerHTML = h;
}
