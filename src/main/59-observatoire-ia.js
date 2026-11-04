/* ═══════════════════════════════════════════
   OBSERVATOIRE IA (v3.05) -- voir ce que l'IA calcule, pendant la partie
   Idee d'ocj94. Un panneau a droite du plateau (en bas sur telephone), a activer, avec cinq
   onglets -- Vue generale, Recherche, Evaluation, Decision, Historique -- et trois niveaux de
   detail : Spectateur, Analyste, Developpeur.

   Regle de construction : l'Observatoire OBSERVE, il ne calcule rien en double.
   - Pendant le calcul, chaque fil de calcul envoie, au plus toutes les 150 ms, ce que le moteur
     vient de faire (voir _obsEnvoie dans AI_WORKER_CODE) : profondeur, noeuds, coupures,
     coups racine deja notes. Demande seulement quand le panneau est ouvert (observe: 150).
   - A la fin, il relit le tableau « Reflexion IA » (_detailReflexion) : suites prevues,
     criteres de l'evaluation, poids. Aucune donnee n'est inventee ; ce qui est reconstitue
     apres coup (les ecarts entre deux coups, par exemple) est etiquete comme tel.
   - Le moteur n'est pas un PVS : chaque coup racine est cherche avec une fenetre complete
     (alpha-beta, approfondissement iteratif, table de transposition, quiescence). Les scores
     racine sont donc exacts ; l'elagage se fait a l'interieur de chaque branche, et une
     branche coupee n'est pas « un mauvais coup », seulement une branche qui ne pouvait plus
     changer le resultat. L'arbre complet n'est pas garde (des milliers de positions) : on
     montre l'arbre des lignes principales des 10 meilleurs coups.
   - Un score est en points internes : une bille de plus = 1000 points, une ejection en vaut
     2000. Ce n'est pas une probabilite de gagner.

   v3.06, d'apres des maquettes envoyees par ocj94 :
   - le plateau de la partie montre en direct les 3 meilleurs coups (fleches) et entoure les
     billes en danger ou isolees (memes definitions que l'evaluation) ;
   - le bandeau « L'IA reflechit… » affiche profondeur, positions, temps et meilleur coup
     provisoire, meme panneau ferme (reglable) ;
   - l'onglet Decision dit ce que fait chaque coup un coup plus loin (type, ejections possibles
     ensuite des deux cotes, billes en danger) et compare deux variantes cote a cote ;
   - rapport telechargeable (.txt, .json) et mode plein ecran.
   v3.07 : fleches sur tout le groupe qui bouge, numerotees comme la liste ; coordonnees Aba-Pro sur
   les mini plateaux ; « Pourquoi ce coup ? / Pourquoi pas celui-la ? » pour n'importe quel coup choisi.
   v3.08 : journal de la recherche (une ligne par profondeur terminee), note de chaque coup profondeur
   apres profondeur (un coup qui menait puis recule ; un choix stable), rapport copiable.
   v3.09 : panneau reductible en une ligne (libere le plateau), frise cliquable des decisions en bas du
   panneau, courbe de la note du meilleur coup par profondeur.
   Ce qui est refuse parce que ce serait invente : « memoire utilisee » (pas mesurable de facon
   fiable dans un fil de calcul), notes de confiance ou de « performance », arbre complet noeud
   par noeud (le moteur ne le garde pas : le reconstituer voudrait dire recalculer).
═══════════════════════════════════════════ */
const OBS = { ouvert: false, niveau: 'analyste', onglet: 'general', fige: false, live: null, hist: [], rev: -1,
              sel: null, etape: -1, tout: false, surPlateau: null, minuteur: null, relance: null,
              surVrai: { fleches: true, menaces: true }, bandeau: true, grand: false, cmp: null, etapeCmp: -1, tBandeau: 0, reduit: false,
              chaleur: true, survol: null };
try {
  OBS.ouvert = localStorage.getItem('abaObs') === '1';
  const _n = localStorage.getItem('abaObsNiveau'); if (_n === 'spectateur' || _n === 'analyste' || _n === 'developpeur') OBS.niveau = _n;
  const _p = JSON.parse(localStorage.getItem('abaObsPlateau') || 'null'); if (_p) { OBS.surVrai.fleches = _p.f !== 0; OBS.surVrai.menaces = _p.m !== 0; }
  OBS.bandeau = localStorage.getItem('abaObsBandeau') !== '0';
  OBS.reduit = localStorage.getItem('abaObsReduit') === '1';
  OBS.chaleur = localStorage.getItem('abaObsChaleur') !== '0';
} catch (e) {}
/* Le moteur envoie ses mesures si le panneau est ouvert OU si le bandeau detaille est actif */
function obsDemande() { return !!(OBS.ouvert || OBS.bandeau); }
function _obsCompact(n) { n = Math.round(n || 0); return n < 10000 ? n.toLocaleString('fr-FR') : n < 1e6 ? Math.round(n / 1000) + ' k' : (n / 1e6).toFixed(1).replace('.', ',') + ' M'; }
const _OBS_ONGLETS = [['general', 'Vue générale', 'Overview'], ['recherche', 'Recherche', 'Search'], ['evaluation', 'Évaluation', 'Evaluation'],
                      ['decision', 'Décision', 'Decision'], ['historique', 'Historique', 'History']];
const _OBS_NIVEAUX = [['spectateur', 'Spectateur', 'Spectator'], ['analyste', 'Analyste', 'Analyst'], ['developpeur', 'Développeur', 'Developer']];
function _obsT(fr, en) { return (typeof _tr === 'function') ? _tr(fr, en) : fr; }
function _obsE(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function _obsN(n) { return Math.round(n || 0).toLocaleString('fr-FR'); }
function _obsNiv() { return OBS.niveau === 'spectateur' ? 0 : OBS.niveau === 'analyste' ? 1 : 2; }
function obsActif() { return !!OBS.ouvert; }

/* ── Cles de coups : « r,c|r,c>dq,dr » (moveKey) -> cases et direction ── */
function _obsLireCle(k) {
  const p = String(k).split('>'); if (p.length !== 2) return null;
  const d = p[1].split(',').map(Number);
  return { cells: p[0].split('|').map(function (s) { const a = s.split(',').map(Number); return { r: a[0], c: a[1] }; }), dir: { q: d[0], r: d[1] } };
}
function _obsCoupsRacine(col) {
  const m = new Map();
  try { getAllMovesForColor(col).forEach(function (x) { m.set(moveKey(x), { n: (abaproOfficialLabels(x) || [])[0] || '?', eject: !!x.eject, type: x.type }); }); } catch (e) {}
  return m;
}
function _obsNom(L, k) { const x = L && L.coups && L.coups.get(k); return x ? x.n : (L && L.noms && L.noms[k]) || '?'; }

/* ═══ Reception des mesures ═══ */
function obsDebut(couleur, config) {
  if (!obsDemande()) return;
  /* v3.12, vraie pause : si l'on revoit un coup passe, la revue reste affichee pendant le calcul suivant ;
     le point qui pulse dans la frise (ou « Revenir au direct ») ramene au calcul en cours. */
  OBS.surPlateau = null;
  if (OBS.rev < 0) { OBS.sel = null; OBS.etape = -1; OBS.tout = false; OBS.cmp = null; OBS.etapeCmp = -1; }
  OBS.live = { etat: 'calcul', couleur: couleur, budget: config ? config.time : 0, t0: Date.now(), fils: {}, nFils: 1, parProf: {}, serie: [],
               racine: JSON.parse(JSON.stringify(board)), coups: _obsCoupsRacine(couleur), cle: null, source: null, top: [], journal: [], jProf: {} };
  OBS.live.journal.push({ t: 0, k: 'debut', n: OBS.live.coups.size });
  OBS.tBandeau = 0; _obsBandeau(true);
  _obsPlanifier();
}
function obsProgres(m, nFils) {
  const L = OBS.live; if (!L || L.etat !== 'calcul') return;
  L.nFils = nFils || 1; L.fils[m.w] = m;
  if (m.fin) { (L.parProf[m.d] = L.parProf[m.d] || {})[m.w] = m.roots; _obsJournalProf(L, m.d); }
  const tot = Object.keys(L.fils).reduce(function (a, k) { return a + L.fils[k].nodes; }, 0);
  L.serie.push({ t: Date.now() - L.t0, n: tot }); if (L.serie.length > 400) L.serie.splice(1, 1);
  // les 3 meilleurs coups du moment : redessines sur le plateau de la partie quand ils changent
  const top = _obsClassement(L).tous.slice(0, 3).map(function (x) { return x[0]; });
  if (top.join(';') !== (L.top || []).join(';')) { L.top = top; if (OBS.ouvert && OBS.surVrai.fleches && typeof drawBoard === 'function') drawBoard(); }
  _obsBandeau();
  _obsPlanifier();
}
function obsFin(m, couleur, config, chosen) {
  const L = OBS.live;
  if (!obsDemande() || !L || L.etat !== 'calcul' || !m) return;
  const fils = (m.parFil && m.parFil.length) ? m.parFil : [m];
  const det = (typeof _mesuresCoupIA !== 'undefined' && _mesuresCoupIA && _mesuresCoupIA.detail) ? _mesuresCoupIA.detail : null;
  // liste complete des coups racine, a la plus grande profondeur terminee par tous les fils
  let tous = null, profTous = 0;
  for (let d = 64; d >= 1 && !tous; d--) {
    if (fils.every(function (f) { return f.rootsByDepth && Array.isArray(f.rootsByDepth[d]) && f.rootsByDepth[d].length; })) {
      tous = []; fils.forEach(function (f) { f.rootsByDepth[d].forEach(function (r) { tous.push([r.key, r.score, r.k || 0, r.oppEject | 0]); }); });
      tous.sort(function (a, b) { return b[1] - a[1]; }); profTous = d;
    }
  }
  const noms = {}; L.coups.forEach(function (v, k) { noms[k] = v.n; });
  const cle = chosen ? moveKey(chosen) : null;
  // note de chaque coup de depart a chaque profondeur terminee par tous les fils (pour « profondeur apres profondeur »)
  const parProfs = {};
  for (let d = 1; d <= 64; d++) {
    if (!fils.every(function (f) { return f.rootsByDepth && Array.isArray(f.rootsByDepth[d]) && f.rootsByDepth[d].length; })) continue;
    const t = []; fils.forEach(function (f) { f.rootsByDepth[d].forEach(function (r) { t.push([r.key, Math.round(r.score)]); }); });
    parProfs[d] = t.sort(function (a, b) { return b[1] - a[1]; });
  }
  L.journal.push({ t: m.time || (Date.now() - L.t0), k: 'fin', cle: cle, s: m.bestScore, d: m.depth || 0, partiel: profTous && profTous < (m.depth || 0) });
  const e = { n: (typeof MoveCount !== 'undefined' ? MoveCount.get() : 0) + 1, couleur: couleur, cle: cle, det: det, tous: tous, profTous: profTous, noms: noms,
              racine: L.racine, prof: m.depth || 0, score: m.bestScore, ms: m.time || 0, budget: config ? config.time : 0,
              noeuds: fils.reduce(function (a, f) { return a + (f.nodes || 0); }, 0), coupures: fils.reduce(function (a, f) { return a + (f.cuts || 0); }, 0),
              tt: Math.round(fils.reduce(function (a, f) { return a + (f.ttHit || 0); }, 0) / fils.length), nFils: fils.length,
              parFil: fils.map(function (f) { return { nodes: f.nodes, cuts: f.cuts, tt: f.ttHit, depth: f.depth }; }),
              serie: L.serie.slice(), profs: _obsProfs(fils), source: null, parProfs: parProfs, journal: L.journal.slice() };
  _obsAjoutHist(e);
  L.etat = 'fini'; L.cle = cle; L.entree = e; _obsBandeau(true);
  if (OBS.surPlateau || (OBS.ouvert && L.top && L.top.length)) { OBS.surPlateau = null; if (typeof drawBoard === 'function') drawBoard(); }
  _obsPlanifier(true);
}
/* 60 coups gardes ; le plus ancien sort, et le coup en revue garde sa place (s'il sort, retour au direct) */
function _obsAjoutHist(e) {
  OBS.hist.push(e);
  if (OBS.hist.length > 60) { OBS.hist.shift(); if (OBS.rev >= 0) OBS.rev--; }
}
/* coup joue sans recherche (livre, table de finale, empreinte, niveau 1) */
function obsSource(src, couleur) {
  if (!obsDemande()) return;
  OBS.surPlateau = null;
  OBS.live = { etat: 'source', source: src, couleur: couleur, t0: Date.now(), fils: {}, parProf: {}, serie: [], coups: new Map(), nFils: 1 };
  _obsAjoutHist({ n: (typeof MoveCount !== 'undefined' ? MoveCount.get() : 0) + 1, couleur: couleur, source: src });
  _obsPlanifier(true);
}
function _obsProfs(fils) {   // par profondeur : noeuds, coupures, temps (somme / max des fils)
  const o = {};
  fils.forEach(function (f) { Object.keys(f.depthInfo || {}).forEach(function (d) { const x = f.depthInfo[d], y = o[d] = o[d] || { nodes: 0, cuts: 0, ms: 0 };
    y.nodes += x.nodes; y.cuts += x.cuts || 0; y.ms = Math.max(y.ms, x.ms); }); });
  return o;
}

/* ═══ Agregats du direct ═══ */
function _obsAgreg(L) {
  const F = Object.keys(L.fils).map(function (k) { return L.fils[k]; });
  const a = { nodes: 0, cuts: 0, tt: 0, d: 0, dFin: 0, ms: 0, nF: F.length, profs: {} };
  F.forEach(function (f) { a.nodes += f.nodes; a.cuts += f.cuts; a.tt += f.tt; a.d = Math.max(a.d, f.d); a.ms = Math.max(a.ms, f.ms);
    (f.depths || []).forEach(function (x) { const y = a.profs[x[0]] = a.profs[x[0]] || { nodes: 0, cuts: 0, ms: 0 }; y.nodes += x[1]; y.cuts += x[3]; y.ms = Math.max(y.ms, x[2]); }); });
  a.tt = F.length ? Math.round(a.tt / F.length) : 0;
  a.dFin = (F.length >= L.nFils) ? Math.min.apply(null, F.map(function (f) { return f.depths && f.depths.length ? f.depths[f.depths.length - 1][0] : 0; })) : 0;
  a.max = F.length ? F[0].max : 0;
  return a;
}
function _obsFusion(L, d) {   // coups racine d'une profondeur terminee par TOUS les fils
  const P = L.parProf[d]; if (!P || Object.keys(P).length < L.nFils) return null;
  let t = []; Object.keys(P).forEach(function (w) { t = t.concat(P[w]); });
  return t.sort(function (a, b) { return b[1] - a[1]; });
}
/* ═══ Journal de la recherche : une ligne par profondeur terminee par tous les fils ═══
   Tire des messages du moteur (pas une trace de chaque position : il y en a des centaines de milliers). */
function _obsJournalProf(L, d) {
  if (L.jProf[d]) return;
  const t = _obsFusion(L, d); if (!t || !t.length) return;
  L.jProf[d] = 1;
  const prec = L.journal.filter(function (x) { return x.k === 'prof'; }).pop(), p = _obsAgreg(L).profs[d] || {};
  L.journal.push({ t: Date.now() - L.t0, k: 'prof', d: d, cle: t[0][0], s: t[0][1], chg: prec && prec.cle !== t[0][0] ? prec.cle : null, nodes: p.nodes || 0, cuts: p.cuts || 0 });
}
function _obsJournalHTML(j, nomDe) {
  if (!j || !j.length) return '';
  const ms = function (t) { return (t / 1000).toFixed(2).replace('.', ',') + ' s'; };
  const lignes = j.map(function (x) {
    if (x.k === 'debut') return '<span class="obs-jt">' + ms(x.t) + '</span> ' + _obsT('départ : ' + x.n + ' coups de départ à noter', 'start: ' + x.n + ' first moves to score');
    if (x.k === 'prof') return '<span class="obs-jt">' + ms(x.t) + '</span> <span class="obs-jd">' + _obsT('profondeur ', 'depth ') + x.d + '</span> ' + _obsT('terminée — ', 'done — ')
      + (x.chg ? '<span class="obs-jc">' + _obsT('le meilleur change : ', 'best changes: ') + _obsE(nomDe(x.chg)) + ' → </span>' : _obsT('meilleur ', 'best ')) + '<b>' + _obsE(nomDe(x.cle)) + '</b> (' + _evalReflexionTexte(x.s) + ') · '
      + _obsN(x.nodes) + ' ' + _obsT('positions', 'positions') + ' · ' + _obsN(x.cuts) + ' ' + _obsT('coupures', 'cutoffs');
    return '<span class="obs-jt">' + ms(x.t) + '</span> ' + (x.partiel ? '<span class="obs-jc">' + _obsT('temps écoulé pendant la profondeur ' + x.d, 'time ran out during depth ' + x.d) + '</span> — ' : '')
      + _obsT('coup joué : ', 'move played: ') + '<b>' + _obsE(x.cle ? nomDe(x.cle) : '?') + '</b> (' + _evalReflexionTexte(x.s) + ')';
  });
  return '<h5>' + _obsT('Journal de la recherche', 'Search log') + '</h5><div class="obs-journal">' + lignes.map(function (l) { return '<div>› ' + l + '</div>'; }).join('') + '</div>'
    + '<div class="obs-note">' + _obsT('Une ligne par profondeur terminée par tous les fils, tirée des messages du moteur. Ce n’est pas la trace de chaque position examinée (il y en a des centaines de milliers).', 'One line per depth completed by every thread, from the engine’s messages. Not a trace of every position searched (there are hundreds of thousands).') + '</div>';
}
/* Courbe : la note du meilleur coup a chaque profondeur terminee ; point orange quand le meilleur coup change */
function _obsCourbeProf(M) {
  const W = 300, H = 74, g = 18, vals = M.map(function (x) { return x.s; }).filter(function (v) { return Math.abs(v) < 90000; });
  if (vals.length < 2) return '';
  let mn = Math.min.apply(null, vals.concat([0])), mx = Math.max.apply(null, vals.concat([0])); if (mx === mn) { mx += 1; mn -= 1; }
  const X = function (i) { return g + i * (W - 2 * g) / (M.length - 1); }, Y = function (v) { return 14 + (mx - Math.max(mn, Math.min(mx, v))) / (mx - mn) * (H - 30); };
  let s = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="obs-courbe obs-courbe-prof"><line x1="' + g + '" x2="' + (W - g) + '" y1="' + Y(0).toFixed(1) + '" y2="' + Y(0).toFixed(1) + '" stroke="rgba(255,255,255,.18)" stroke-dasharray="3 3"/>'
    + '<polyline fill="none" stroke="#c8a84b" stroke-width="2" points="' + M.map(function (x, i) { return X(i).toFixed(1) + ',' + Y(x.s).toFixed(1); }).join(' ') + '"/>';
  M.forEach(function (x, i) { const chg = i && (x.n || x.k) !== (M[i - 1].n || M[i - 1].k);
    s += '<circle cx="' + X(i).toFixed(1) + '" cy="' + Y(x.s).toFixed(1) + '" r="4" fill="' + (chg ? '#ffb74d' : '#c8a84b') + '"/>'
      + '<text x="' + X(i).toFixed(1) + '" y="' + (Y(x.s) - 7).toFixed(1) + '" font-size="9" text-anchor="middle" fill="rgba(255,255,255,.75)">' + _evalReflexionTexte(x.s) + '</text>'
      + '<text x="' + X(i).toFixed(1) + '" y="' + (H - 3) + '" font-size="9" text-anchor="middle" fill="rgba(255,255,255,.45)">' + _obsT('p', 'd') + x.d + '</text>'; });
  return s + '</svg><div class="obs-note">' + _obsT('Note du meilleur coup à chaque profondeur terminée (point orange : le meilleur coup a changé). Monter et descendre d’une profondeur à l’autre est courant en alpha-bêta : la recherche s’arrête tantôt après un coup de l’IA, tantôt après un coup de l’adversaire.',
    'Best move score at each completed depth (orange dot: the best move changed). Going up and down from one depth to the next is common in alpha-beta: the search stops after an AI move or after an opponent move.') + '</div>';
}
/* Frise des decisions de l'IA, en bas du panneau : un point par coup, cliquable ; le point du calcul en cours pulse */
function _obsFrise(V) {
  if (!OBS.hist.length && V.mode !== 'direct') return '';
  let h = '<div class="obs-frise"><button class="obs-lien" onclick="obsRevoirPas(-1)" title="' + _obsT('Coup précédent', 'Previous move') + '">◀</button><div class="obs-points">';
  let prec = null;
  OBS.hist.forEach(function (e, i) {
    const sc = typeof e.score === 'number' && Math.abs(e.score) < 90000 ? e.score : null, chute = prec != null && sc != null && prec - sc >= 200;
    const nom = e.source ? _obsT('sans calcul', 'no search') : ((e.noms && e.noms[e.cle]) || '?') + ' ' + _evalReflexionTexte(e.score);
    h += '<button class="obs-pt' + (e.source ? ' obs-pt-src' : sc != null && sc < 0 ? ' obs-pt-neg' : '') + (chute ? ' obs-pt-chute' : '') + (OBS.rev === i ? ' obs-pt-sel' : '') + '" onclick="obsRevoir(' + i + ')" title="' + _obsE(_obsT('Coup ', 'Move ') + e.n + ' : ' + nom) + '"></button>';
    if (sc != null) prec = sc;
  });
  if (V.mode === 'direct' || (OBS.live && OBS.live.etat === 'calcul')) h += '<button class="obs-pt obs-pt-live" onclick="obsRevoir(-1)" title="' + _obsT('Calcul en cours', 'Searching') + '"></button>';
  h += '</div><button class="obs-lien" onclick="obsRevoirPas(1)" title="' + _obsT('Coup suivant', 'Next move') + '">▶</button><span>' + (OBS.rev >= 0 ? _obsT('coup ', 'move ') + OBS.hist[OBS.rev].n : _obsT('direct', 'live')) + '</span></div>';
  return h;
}
/* Notes des coups de depart, profondeur par profondeur : {d: [[cle, note], ...] trie} */
function _obsParProfs(V) {
  if (V.e) return V.e.parProfs || {};
  const L = V.L, o = {}; if (!L) return o;
  Object.keys(L.parProf).forEach(function (d) { const t = _obsFusion(L, +d); if (t) o[d] = t.map(function (x) { return [x[0], Math.round(x[1])]; }); });
  return o;
}
function _obsTrajectoire(P, cle) {   // [[profondeur, note, rang]]
  return Object.keys(P).map(Number).sort(function (a, b) { return a - b; }).map(function (d) { const i = P[d].findIndex(function (x) { return x[0] === cle; }); return i < 0 ? null : [d, P[d][i][1], i + 1]; }).filter(Boolean);
}
function _obsTrajTexte(T) {
  return T.map(function (x) { return _obsT('prof. ', 'depth ') + x[0] + ' : ' + _evalReflexionTexte(x[1]) + ' <small>(' + (x[2] === 1 ? _obsT('1er', '1st') : x[2] + _obsT('e', 'th')) + ')</small>'; }).join(' → ');
}
/* Classement du direct : la derniere profondeur terminee par tous les fils, sinon ce qui est deja note */
function _obsClassement(L) {
  const a = _obsAgreg(L); let d = a.dFin, tous = d ? _obsFusion(L, d) : null;
  if (!tous) { d = 0; tous = []; Object.keys(L.fils).forEach(function (w) { tous = tous.concat(L.fils[w].roots || []); }); tous.sort(function (x, y) { return y[1] - x[1]; }); }
  return { a: a, d: d, tous: tous };
}
/* Bandeau « L'IA reflechit… » : une ligne de mesures, au plus toutes les 200 ms */
function _obsBandeau(vider) {
  if (typeof document === 'undefined') return;
  const el = document.getElementById('ai-thinking-live'); if (!el) return;
  if (vider || !OBS.bandeau) { el.textContent = ''; el.style.display = 'none'; return; }
  const L = OBS.live, now = Date.now(); if (!L || L.etat !== 'calcul' || now - OBS.tBandeau < 200) return;
  OBS.tBandeau = now;
  el.textContent = _obsLigneDirect(L, now); el.style.display = '';
}
function _obsLigneDirect(L, now) {
  const C = _obsClassement(L), a = C.a;
  let t = _obsT('prof. ', 'depth ') + a.d + (a.max ? '/' + a.max : '') + ' · ' + _obsCompact(a.nodes) + ' ' + _obsT('positions', 'positions') + ' · ' + _msTexte((now || Date.now()) - L.t0);
  if (C.tous.length) t += ' · ' + _obsT('meilleur : ', 'best: ') + _obsNom(L, C.tous[0][0]) + ' ' + _evalReflexionTexte(C.tous[0][1]);
  return t;
}
/* Panneau reduit : une seule ligne, pour liberer le plateau */
function _obsLigneHUD(V) {
  if (V.mode === 'direct') return '⏳ ' + _obsLigneDirect(V.L);
  if (V.mode === 'vide') return _obsT('En attente d’un calcul de l’IA', 'Waiting for an AI search');
  if (V.mode === 'source') return '📖 ' + _obsT('coup sans calcul', 'move without search');
  const e = V.e; if (e.source) return '📖 ' + _obsT('coup ', 'move ') + e.n + _obsT(' sans calcul', ' without search');
  return (V.mode === 'revue' ? '⏪ ' : '✓ ') + _obsT('coup ', 'move ') + e.n + ' : ' + _obsE((e.noms && e.noms[e.cle]) || '?') + ' ' + _evalReflexionTexte(e.score) + ' · ' + _obsT('prof. ', 'depth ') + e.prof + ' · ' + _msTexte(e.ms);
}
function _obsMeilleursParProf(L) {
  const out = [];
  Object.keys(L.parProf).map(Number).sort(function (a, b) { return a - b; }).forEach(function (d) { const t = _obsFusion(L, d); if (t && t.length) out.push({ d: d, k: t[0][0], s: t[0][1] }); });
  return out;
}
function _obsVitesse(serie) {   // noeuds par seconde, lisse sur ~600 ms
  const out = []; let j = 0;
  for (let i = 1; i < serie.length; i++) { while (serie[i].t - serie[j].t > 600 && j < i - 1) j++; const dt = serie[i].t - serie[j].t; if (dt >= 100) out.push((serie[i].n - serie[j].n) / dt * 1000); }
  return out;
}

/* ═══ Vue courante : direct, fin de calcul ou revue d'un coup de l'historique ═══ */
function _obsVue() {
  if (OBS.rev >= 0 && OBS.hist[OBS.rev]) return { mode: 'revue', e: OBS.hist[OBS.rev] };
  const L = OBS.live;
  if (!L) return { mode: 'vide' };
  if (L.etat === 'calcul') return { mode: 'direct', L: L };
  if (L.etat === 'source') return { mode: 'source', L: L };
  return { mode: 'fini', e: L.entree, L: L };
}

/* ═══ Petits dessins ═══ */
function _obsCourbe(vals, w, h, couleur, zero) {
  if (!vals || vals.length < 2) return '<div class="obs-vide">…</div>';
  let mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals); if (zero) { mn = Math.min(mn, 0); mx = Math.max(mx, 0); } if (mx === mn) { mx += 1; mn -= 1; }
  const pts = vals.map(function (v, i) { return (i / (vals.length - 1) * w).toFixed(1) + ',' + (h - 2 - (v - mn) / (mx - mn) * (h - 4)).toFixed(1); }).join(' ');
  const z = zero ? '<line x1="0" x2="' + w + '" y1="' + (h - 2 - (0 - mn) / (mx - mn) * (h - 4)).toFixed(1) + '" y2="' + (h - 2 - (0 - mn) / (mx - mn) * (h - 4)).toFixed(1) + '" stroke="rgba(255,255,255,.2)" stroke-dasharray="3 3"/>' : '';
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="obs-courbe">' + z + '<polyline points="' + pts + '" fill="none" stroke="' + couleur + '" stroke-width="2"/></svg>';
}
/* Fleche d'un coup : en ligne (ou 1 bille), de la derniere bille jusqu'a la case ou arrive la premiere,
   pour qu'on voie tout le groupe qui bouge ; en lateral, du milieu du groupe a son milieu d'arrivee. */
function _obsFlecheXY(cells, dir) {
  const ax = cells.map(function (s) { return rcToAxial(s.r, s.c); });
  const tri = ax.slice().sort(function (a, b) { return (a.q * dir.q + a.r * dir.r) - (b.q * dir.q + b.r * dir.r); });
  const px = function (a) { const rc = axialToRc(a.q, a.r); return rc ? hexCoord(rc.r, rc.c) : null; };
  const lateral = tri.length > 1 && ((tri[1].q - tri[0].q) * dir.r - (tri[1].r - tri[0].r) * dir.q) !== 0;
  if (lateral) {
    const m = { x: 0, y: 0 }; tri.forEach(function (a) { const p = px(a); m.x += p.x / tri.length; m.y += p.y / tri.length; });
    const t = px(tri[0]), u = px({ q: tri[0].q + dir.q, r: tri[0].r + dir.r }) || { x: t.x, y: t.y - 50 };
    return { a: m, b: { x: m.x + (u.x - t.x), y: m.y + (u.y - t.y) } };
  }
  const tete = tri[tri.length - 1], hp = px(tete), dp = px({ q: tete.q + dir.q, r: tete.r + dir.r });
  return { a: px(tri[0]), b: dp || { x: hp.x + (hp.x - px(tri[0]).x || 40) * 0.6, y: hp.y } };
}
/* Place d'une pastille de rang : au depart de la fleche, ou a mi-chemin si une autre pastille y est deja
   (plusieurs coups qui partent de la meme bille) */
function _obsPastille(xy, pris) {
  const k = Math.round(xy.a.x) + ',' + Math.round(xy.a.y);
  if (!pris[k]) { pris[k] = 1; return { x: xy.a.x, y: xy.a.y }; }
  return { x: xy.a.x + (xy.b.x - xy.a.x) * 0.55, y: xy.a.y + (xy.b.y - xy.a.y) * 0.55 };
}
/* Pointe de fleche (polygone) : pas de marker SVG, dont le remplissage « context-stroke » n'est pas partout */
function _obsPointe(a, b, t) {
  const ang = Math.atan2(b.y - a.y, b.x - a.x), f = function (d) { return (b.x - t * Math.cos(ang + d)).toFixed(1) + ',' + (b.y - t * Math.sin(ang + d)).toFixed(1); };
  return b.x.toFixed(1) + ',' + b.y.toFixed(1) + ' ' + f(-Math.PI / 6) + ' ' + f(Math.PI / 6);
}
function _obsStatutBilles(bd) {   // memes definitions que l'evaluation : danger = au bord avec 1 allie ou moins
  const o = {};
  for (const k in bd) { const v = bd[k]; if (!v) continue; const p = k.split(',').map(Number), ax = rcToAxial(p[0], p[1]);
    let al = 0; for (const d of AX_DIRS) { const n = axialToRc(ax.q + d.q, ax.r + d.r); if (n && bd[n.r + ',' + n.c] === v) al++; }
    const bord = axHexDist(ax, EVAL_CENTER) >= 4;
    o[k] = (bord && al <= 1) ? 'danger' : al === 0 ? 'isolee' : al >= 4 ? 'forte' : ''; }
  return o;
}
/* Mini plateau : billes, coups en fleches (liste {cells,dir,col,epais,num}), cases marquees, carte des billes,
   coordonnees Aba-Pro (lettres a gauche, chiffres en bas et a droite), carte de chaleur ({case: {i, t}}) */
function _obsPlateauSVG(bd, fleches, marques, carte, chaleur) {
  const st = carte ? _obsStatutBilles(bd) : {};
  let s = '<svg viewBox="0 0 640 640" class="obs-plateau">';
  for (let r = 0; r < 9; r++) for (let c = 0; c < ROWS[r]; c++) {
    const p = hexCoord(r, c), k = r + ',' + c, v = bd[k], z = st[k];
    const bague = z === 'danger' ? '#ef5350' : z === 'isolee' ? '#ffb74d' : z === 'forte' ? '#66bb6a' : null, ch = chaleur && chaleur[k];
    if (ch) s += '<g class="obs-chaud"><title>' + _obsE(ch.t) + '</title><circle cx="' + p.x + '" cy="' + p.y + '" r="' + (v ? 34 : 31) + '" fill="rgba(255,87,34,' + (0.14 + 0.66 * ch.i).toFixed(2) + ')"/>';
    s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="26" fill="' + (v === 'black' ? '#0c0c0c' : v === 'white' ? '#ece6d6' : 'rgba(255,255,255,.035)') + '" stroke="'
      + (bague || (marques && marques[k] ? '#c8a84b' : v === 'black' ? '#8d8d8d' : v === 'white' ? '#ffffff' : 'rgba(255,255,255,.12)')) + '" stroke-width="' + (bague || (marques && marques[k]) ? 5 : v ? 3 : 1.5) + '"/>';
    if (marques && marques[k]) s += '<text x="' + p.x + '" y="' + (p.y + 9) + '" text-anchor="middle" font-size="26" font-weight="700" fill="' + (v === 'white' ? '#1b1b1b' : '#c8a84b') + '">' + marques[k] + '</text>';
    if (ch) s += '</g>';
  }
  s += _obsCoordsSVG();
  (fleches || []).forEach(function (f) { const xy = _obsFlecheXY(f.cells, f.dir), e = f.epais || 9;
    s += '<g opacity=".92"><line x1="' + xy.a.x.toFixed(1) + '" y1="' + xy.a.y.toFixed(1) + '" x2="' + xy.b.x.toFixed(1) + '" y2="' + xy.b.y.toFixed(1) + '" stroke="' + f.col + '" stroke-width="' + e + '" stroke-linecap="round"/>'
      + '<polygon points="' + _obsPointe(xy.a, xy.b, 14 + e * 1.6) + '" fill="' + f.col + '"/></g>';
  });
  const pris = {};
  (fleches || []).filter(function (f) { return f.num; }).sort(function (x, y) { return x.num - y.num; }).forEach(function (f) { const q = _obsPastille(_obsFlecheXY(f.cells, f.dir), pris);
    s += '<circle cx="' + q.x.toFixed(1) + '" cy="' + q.y.toFixed(1) + '" r="17" fill="' + f.col + '" stroke="#111" stroke-width="2"/><text x="' + q.x.toFixed(1) + '" y="' + (q.y + 8).toFixed(1) + '" text-anchor="middle" font-size="22" font-weight="700" fill="#111">' + f.num + '</text>'; });
  return s + '</svg>';
}
/* Coordonnees : la lettre de chaque rangee a gauche de sa premiere case, chaque chiffre pres de la case
   la plus basse qui le porte, poussee vers l'exterieur du plateau. Calculees avec coordToABAPRO. */
let _obsCoordsCache = null;
function _obsCoordsSVG() {
  if (_obsCoordsCache != null) return _obsCoordsCache;
  if (typeof coordToABAPRO !== 'function') return (_obsCoordsCache = '');
  let s = '<g font-size="21" fill="rgba(255,255,255,.42)" font-family="DM Mono,monospace" text-anchor="middle">';
  const C = hexCoord(4, 4), ext = function (p, d) { const dx = p.x - C.x, dy = p.y - C.y, l = Math.hypot(dx, dy) || 1; return { x: p.x + dx / l * d, y: p.y + dy / l * d }; };
  const chiffres = {};
  for (let r = 0; r < 9; r++) {
    const p0 = hexCoord(r, 0); s += '<text x="' + (p0.x - 46).toFixed(1) + '" y="' + (p0.y + 7).toFixed(1) + '">' + coordToABAPRO(r, 0).charAt(0) + '</text>';
    for (let c = 0; c < ROWS[r]; c++) { const n = coordToABAPRO(r, c).slice(1); chiffres[n] = { r: r, c: c }; }   // la derniere rangee lue (la plus basse) l'emporte
  }
  Object.keys(chiffres).forEach(function (n) { const q = chiffres[n], p = hexCoord(q.r, q.c), t = ext(p, 50);
    s += '<text x="' + t.x.toFixed(1) + '" y="' + (t.y + 7).toFixed(1) + '">' + n + '</text>'; });
  return (_obsCoordsCache = s + '</g>');
}
function _obsFlechesDe(cles, cols, epais, nums) {
  const out = [];
  cles.forEach(function (k, i) { const x = _obsLireCle(k); if (x) out.push({ cells: x.cells, dir: x.dir, col: cols[i] || '#888', epais: epais ? epais[i] : 9, num: nums ? nums[i] : 0 }); });
  return out;
}

/* v3.12 -- Carte de chaleur : ou l'IA veut aller. Chaque case ou un coup amene une bille du groupe qui bouge
   recoit la MEILLEURE note des coups qui y menent. Couleur pleine = la case du meilleur coup ; elle palit avec
   l'ecart, jusqu'a celui du 10e coup ; les cases ou ne mene aucun des 10 premiers restent sans couleur.
   Une echelle fixe en points ne disait rien : en ouverture, les 10 premiers coups tiennent souvent en 50 points,
   et tout le camp etait colore. Que des notes de la recherche. */
const _OBS_CHALEUR_RANG = 10;
function _obsCasesVisees(x) {
  const dep = {}; x.cells.forEach(function (c) { dep[c.r + ',' + c.c] = 1; });
  const out = [];
  x.cells.forEach(function (c) { const a = rcToAxial(c.r, c.c), n = axialToRc(a.q + x.dir.q, a.r + x.dir.r); if (n && !dep[n.r + ',' + n.c]) out.push(n); });
  return out;
}
function _obsChaleur(tous, nomDe) {
  if (!tous || !tous.length) return null;
  const tri = tous.slice().sort(function (a, b) { return b[1] - a[1]; }), best = tri[0][1];
  const seuil = tri[Math.min(_OBS_CHALEUR_RANG, tri.length) - 1][1], etendue = best - seuil, par = {};
  tri.forEach(function (x) { if (x[1] < seuil) return; const m = _obsLireCle(x[0]); if (!m) return;
    _obsCasesVisees(m).forEach(function (n) { const k = n.r + ',' + n.c; if (!par[k] || x[1] > par[k].s) par[k] = { s: x[1], cle: x[0], r: n.r, c: n.c }; }); });
  const out = {};
  Object.keys(par).forEach(function (k) { const q = par[k], e = best - q.s, i = etendue > 0 ? 1 - 0.82 * e / etendue : 1;
    const ou = (typeof coordToABAPRO === 'function') ? coordToABAPRO(q.r, q.c) : k;
    out[k] = { i: Math.min(1, i), t: ou + ' : ' + nomDe(q.cle) + ' (' + _evalReflexionTexte(q.s) + (e > 0 ? ', ' + _obsT('écart ', 'gap ') + '−' + _obsN(e) : ', ' + _obsT('le meilleur', 'the best')) + ')' }; });
  return out;
}
/* v3.12 -- Apercu au survol : la position juste apres un coup de la liste, avec les regles du site sur une
   copie du plateau (rien d'autre que le coup lui-meme). Garde en memoire par position analysee. */
const _obsApercus = (typeof WeakMap === 'function') ? new WeakMap() : null;
function _obsApres(racine, couleur, cle) {
  if (!racine || typeof _avecPlateau !== 'function') return null;
  let m = _obsApercus && _obsApercus.get(racine); if (!m) { m = {}; if (_obsApercus) _obsApercus.set(racine, m); }
  if (m[cle] !== undefined) return m[cle];
  const x = _obsLireCle(cle); let res = null;
  if (x) try {
    res = _avecPlateau(JSON.parse(JSON.stringify(racine)), 0, 0, function () {
      const info = validateMove(x.cells, x.dir, couleur); if (!info || !info.valid) return null;
      applyMove({ cells: x.cells, dir: x.dir, info: info }, couleur);
      const bd = JSON.parse(JSON.stringify(board)), marques = {};
      _obsCasesVisees(x).concat(x.cells.map(function (c) { const a = rcToAxial(c.r, c.c); return axialToRc(a.q + x.dir.q, a.r + x.dir.r); })).forEach(function (n) { if (n && bd[n.r + ',' + n.c] === couleur) marques[n.r + ',' + n.c] = ' '; });
      return { board: bd, marques: marques, eject: !!info.ejection, push: info.type === 'push' ? (info.push || 0) : 0 };
    });
  } catch (e) { res = null; }
  m[cle] = res; return res;
}
function obsSurvol(cle) {
  cle = cle || null; if (cle === OBS.survol) return;
  OBS.survol = cle; _obsRendu();
}
function obsChaleur() { OBS.chaleur = !OBS.chaleur; try { localStorage.setItem('abaObsChaleur', OBS.chaleur ? '1' : '0'); } catch (e) {} _obsRendu(); }

/* Couleurs des 3 meilleurs coups : les memes sur le mini plateau, dans la liste et sur le plateau de la partie */
const _OBS_COULEURS = ['#66bb6a', '#ffb74d', '#9e9e9e'];
/* ═══ Statut d'un coup racine ═══ */
function _obsStatut(rang, ecart, retenu) {
  if (retenu) return ['obs-ok', _obsT('Retenu', 'Chosen')];
  if (ecart <= 30) return ['obs-alt', _obsT('Proche', 'Close')];
  return ['obs-no', _obsT('Écarté', 'Rejected')];
}
function _obsLignesCandidats(tous, nomDe, cleRetenue, dernier) {
  const maxk = Math.max.apply(null, tous.map(function (x) { return x[2]; }).concat([1]));
  const best = tous.length ? tous[0][1] : 0, total = tous.reduce(function (a, x) { return a + x[2]; }, 0) || 1;
  const nbMax = _obsNiv() === 0 ? 3 : ((OBS.tout || _obsNiv() === 2) ? tous.length : 10);
  let h = '<table class="obs-t"><tr><th>#</th><th>' + _obsT('Coup', 'Move') + '</th><th>' + _obsT('Note', 'Score') + '</th><th>' + _obsT('Écart', 'Gap') + '</th><th>' + _obsT('Effort', 'Effort') + '</th><th></th></tr>';
  tous.slice(0, nbMax).forEach(function (x, i) {
    const stat = (!dernier && i === 0) ? ['obs-ok', _obsT('En tête', 'Leading')] : _obsStatut(i, best - x[1], dernier && x[0] === cleRetenue);
    h += '<tr class="' + (OBS.sel === x[0] ? 'obs-sel' : '') + (OBS.survol === x[0] ? ' obs-survol' : '') + '" data-apercu="' + x[0] + '" onclick="obsChoisir(\'' + x[0] + '\')"><td>' + (i < 3 ? '<span class="obs-rang" style="background:' + _OBS_COULEURS[i] + '">' + (i + 1) + '</span>' : (i + 1)) + '</td><td class="obs-mono">' + _obsE(nomDe(x[0])) + (x[3] ? ' <span title="' + _obsT('L’adversaire a une éjection dès le coup suivant (compté à 1 coup)', 'Opponent can eject right after this move (counted 1 ply deep)') + '">⚠</span>' : '') + '</td><td>'
      + _evalReflexionTexte(x[1]) + '</td><td>' + (best - x[1] ? '−' + _obsN(best - x[1]) : '·') + '</td><td><div class="obs-barre"><i style="width:' + Math.max(2, Math.round(100 * x[2] / maxk)) + '%"></i></div></td><td><span class="obs-chip ' + stat[0] + '">' + stat[1] + '</span></td></tr>';
  });
  const ir = cleRetenue ? tous.findIndex(function (x) { return x[0] === cleRetenue; }) : -1;
  if (dernier && ir >= nbMax) { const x = tous[ir];
    h += '<tr class="' + (OBS.sel === x[0] ? 'obs-sel' : '') + '" onclick="obsChoisir(\'' + x[0] + '\')"><td>' + (ir + 1) + '</td><td class="obs-mono">' + _obsE(nomDe(x[0])) + '</td><td>' + _evalReflexionTexte(x[1]) + '</td><td>−' + _obsN(best - x[1]) + '</td><td></td><td><span class="obs-chip obs-ok">' + _obsT('Retenu', 'Chosen') + '</span></td></tr>'; }
  h += '</table>';
  if (tous.length > nbMax) h += '<button class="obs-lien" onclick="OBS.tout=true;_obsRendu()">' + _obsT('Voir les ' + tous.length + ' coups', 'Show all ' + tous.length + ' moves') + '</button>';
  return h + '<div class="obs-note">' + _obsT('« Proche » : moins de 30 points d’écart (3 % d’une bille). « Effort » : positions examinées sous ce coup. ⚠ : éjection adverse au coup suivant.',
    '“Close”: under 30 points apart (3% of a marble). “Effort”: positions searched under this move. ⚠: opponent can eject next move.') + ' ' + _obsN(total) + ' ' + _obsT('positions en tout.', 'positions in total.') + '</div>';
}

/* ═══ Onglet 1 : Vue generale ═══ */
function _obsTabGeneral(V) {
  const niv = _obsNiv();
  if (V.mode === 'vide') return '<div class="obs-vide">' + _obsT('Le panneau se remplit quand l’IA calcule un coup. Jouez : l’IA répondra ici en direct.', 'The panel fills up when the AI searches a move. Play a move: the AI will answer here live.') + '</div>';
  if (V.mode === 'source') return '<div class="obs-carte"><b>' + _obsT('Aucun calcul pour ce coup', 'No search for this move') + '</b><p>' + _obsE((typeof _texteSourceCoupIA === 'function' && _texteSourceCoupIA(V.L.source)) || '') + '</p></div>';
  let nodes, cuts, tt, prof, profMax, ms, budget, etat, vit, fils = [], profs, meilleurs = [];
  if (V.mode === 'direct') {
    const L = V.L, a = _obsAgreg(L); nodes = a.nodes; cuts = a.cuts; tt = a.tt; prof = a.d; profMax = a.max; ms = Date.now() - L.t0; budget = L.budget; etat = 'calcul';
    vit = _obsVitesse(L.serie); fils = Object.keys(L.fils).map(function (k) { return L.fils[k]; }); profs = a.profs; meilleurs = _obsMeilleursParProf(L);
  } else {
    const e = V.e; if (!e.det && !e.noeuds) return '<div class="obs-vide">' + _obsT('Pas de mesure pour ce coup.', 'No measure for this move.') + '</div>';
    nodes = e.noeuds; cuts = e.coupures; tt = e.tt; prof = e.prof; profMax = e.prof; ms = e.ms; budget = e.budget; etat = 'fini'; vit = _obsVitesse(e.serie || []);
    fils = e.parFil.map(function (f, i) { return { w: i, nodes: f.nodes, cuts: f.cuts, tt: f.tt, d: f.depth }; }); profs = e.profs || {};
    if (e.det) { _notationsReflexion(e.det); meilleurs = e.det.prof.slice().reverse().map(function (p) { return { d: p.d, k: null, s: p.lignes[0].s, n: p.lignes[0].n }; }); }
  }
  const nps = ms > 0 ? Math.round(nodes / ms * 1000) : 0, illim = budget >= 3600000;
  const partielle = (V.mode !== 'direct' && V.e && V.e.profTous && V.e.profTous < prof) ? V.e.profTous : 0;   // la derniere profondeur a ete coupee par le temps
  let h = '<div class="obs-grille">'
    + '<div class="obs-k"><span>' + _obsT('Profondeur', 'Depth') + '</span><b>' + prof + (etat === 'calcul' && profMax ? ' / ' + profMax : '') + '</b>'
    + (partielle ? '<small>' + _obsT('dernière terminée : ', 'last completed: ') + partielle + '</small>' : '') + '</div>'
    + '<div class="obs-k"><span>' + _obsT('Positions examinées', 'Positions searched') + '</span><b>' + _obsN(nodes) + '</b></div>'
    + '<div class="obs-k"><span>' + _obsT('Temps', 'Time') + '</span><b>' + _msTexte(ms) + '</b></div>'
    + '<div class="obs-k"><span>' + _obsT('Vitesse', 'Speed') + '</span><b>' + _obsN(nps) + ' /s</b></div></div>';
  if (etat === 'calcul' && typeof forceAINow === 'function') h += '<div style="margin-top:6px"><button class="obs-btn obs-vite" onclick="forceAINow()" title="' + _obsT('Interrompre la réflexion et jouer le meilleur coup trouvé', 'Stop thinking and play the best move found') + '">⚡ ' + _obsT('Jouer maintenant', 'Play now') + '</button></div>';
  if (budget && !illim) h += '<div class="obs-prog" title="' + _obsT('Temps utilisé sur le temps accordé', 'Time used out of the allowed time') + '"><i style="width:' + Math.min(100, Math.round(100 * ms / budget)) + '%"></i></div>'
    + '<div class="obs-note">' + _obsT('Temps accordé : ', 'Time allowed: ') + _msTexte(budget) + '</div>';
  if (meilleurs.length) {
    h += '<h5>' + _obsT('Meilleur coup, profondeur après profondeur', 'Best move, depth after depth') + '</h5><div class="obs-profs">';
    meilleurs.forEach(function (x, i) { const nom = x.n || _obsNom(V.L, x.k), chg = i && meilleurs[i - 1] && (x.n || x.k) !== (meilleurs[i - 1].n || meilleurs[i - 1].k);
      h += '<span class="obs-pf' + (chg ? ' obs-chg' : '') + '" title="' + (chg ? _obsT('Le meilleur coup a changé', 'Best move changed') : '') + '"><em>' + x.d + '</em> ' + _obsE(nom) + ' <small>' + _evalReflexionTexte(x.s) + '</small></span>'; });
    h += '</div>';
    if (meilleurs.length >= 2) h += _obsCourbeProf(meilleurs);
  }
  if (niv >= 1) h += _obsJournalHTML(V.mode === 'direct' ? V.L.journal : V.e.journal, function (k) { return V.mode === 'direct' ? _obsNom(V.L, k) : ((V.e.noms && V.e.noms[k]) || '?'); });
  if (niv >= 1) {
    h += '<h5>' + _obsT('Vitesse de recherche', 'Search speed') + '</h5>' + _obsCourbe(vit, 300, 56, '#c8a84b')
      + '<div class="obs-grille obs-g3"><div class="obs-k"><span>' + _obsT('Coupures α-β', 'α-β cutoffs') + '</span><b>' + _obsN(cuts) + '</b><small>' + (nodes ? Math.round(100 * cuts / nodes) : 0) + ' % ' + _obsT('des positions', 'of positions') + '</small></div>'
      + '<div class="obs-k"><span>' + _obsT('Table de transposition', 'Transposition table') + '</span><b>' + tt + ' %</b><small>' + _obsT('positions déjà vues', 'positions seen before') + '</small></div>'
      + '<div class="obs-k"><span>' + _obsT('Fils de calcul', 'Worker threads') + '</span><b>' + (fils.length || 1) + '</b></div></div>'
      + '<div class="obs-note">' + _obsT('Algorithme : alpha-bêta avec approfondissement itératif, table de transposition, coups tueurs et quiescence. Chaque coup de départ est cherché avec une fenêtre complète : aucun élagage à la racine, les notes des coups de départ sont exactes.',
        'Algorithm: alpha-beta with iterative deepening, transposition table, killer moves and quiescence. Every first move is searched with a full window: no pruning at the root, first-move scores are exact.') + '</div>';
  }
  if (niv >= 1 && Object.keys(profs).length) {
    h += '<h5>' + _obsT('Élagage par profondeur', 'Pruning by depth') + '</h5><table class="obs-t"><tr><th>' + _obsT('Prof.', 'Depth') + '</th><th>' + _obsT('Positions', 'Positions') + '</th><th>' + _obsT('Coupures', 'Cutoffs') + '</th><th>%</th><th>' + _obsT('Temps', 'Time') + '</th></tr>';
    Object.keys(profs).map(Number).sort(function (a, b) { return a - b; }).forEach(function (d) { const p = profs[d];
      h += '<tr><td>' + d + '</td><td>' + _obsN(p.nodes) + '</td><td>' + _obsN(p.cuts) + '</td><td>' + (p.nodes ? Math.round(100 * p.cuts / p.nodes) : 0) + '</td><td>' + _msTexte(p.ms) + '</td></tr>'; });
    h += '</table><div class="obs-note">' + _obsT('Une coupure ne dit pas qu’un coup est mauvais : la branche ne pouvait plus changer le résultat.', 'A cutoff does not mean a move is bad: that branch could no longer change the result.') + '</div>';
  }
  if (niv >= 2 && fils.length) {
    h += '<h5>' + _obsT('Fil par fil', 'Thread by thread') + '</h5><table class="obs-t"><tr><th>#</th><th>' + _obsT('Prof.', 'Depth') + '</th><th>' + _obsT('Positions', 'Positions') + '</th><th>' + _obsT('Coupures', 'Cutoffs') + '</th><th>TT</th></tr>';
    fils.forEach(function (f, i) { h += '<tr><td>' + (f.w != null ? f.w + 1 : i + 1) + '</td><td>' + f.d + '</td><td>' + _obsN(f.nodes) + '</td><td>' + _obsN(f.cuts) + '</td><td>' + (f.tt != null ? f.tt : 0) + ' %</td></tr>'; });
    h += '</table><div class="obs-note">' + _obsT('Chaque fil cherche sa part des coups de départ, avec sa propre table : les notes d’un fil à l’autre ne sont pas parfaitement comparables.', 'Each thread searches its share of the first moves with its own table: scores are not perfectly comparable across threads.') + '</div>';
  }
  return h;
}

/* ═══ Onglet 2 : Recherche ═══ */
function _obsDonneesRacine(V) {   // {tous, nomDe, cleRetenue, racine, couleur, det, dernier}
  if (V.mode === 'direct') {
    const L = V.L, C = _obsClassement(L), a = C.a, tous = C.tous, d = C.d;
    return { tous: tous, prof: d, nomDe: function (k) { return _obsNom(L, k); }, cleRetenue: null, racine: L.racine, couleur: L.couleur, det: null, dernier: false,
             avance: { i: Object.keys(L.fils).reduce(function (s, w) { return s + L.fils[w].i; }, 0), n: Object.keys(L.fils).reduce(function (s, w) { return s + L.fils[w].n; }, 0), d: a.d } };
  }
  const e = V.e;
  let tous = e.tous;
  if (!tous && e.det) tous = e.det.prof[0].lignes.map(function (l) { return [moveKeyDe(l), l.s, l.k, 0]; });
  return { tous: tous || [], prof: e.profTous || e.prof, nomDe: function (k) { return (e.noms && e.noms[k]) || '?'; }, cleRetenue: e.cle, racine: e.racine || (e.det && e.det.racine.board), couleur: e.couleur, det: e.det, dernier: true };
}
function moveKeyDe(l) { return l.cells.map(function (c) { return c.r + ',' + c.c; }).sort().join('|') + '>' + l.dir.q + ',' + l.dir.r; }
function _obsLigneDet(det, cle) {   // la ligne detaillee (suite prevue, criteres) d'un coup, a la plus grande profondeur
  if (!det) return null;
  for (let i = 0; i < det.prof.length; i++) { const l = det.prof[i].lignes.find(function (x) { return moveKeyDe(x) === cle; }); if (l) return { l: l, ip: i, i: det.prof[i].lignes.indexOf(l) }; }
  return null;
}
function _obsTabRecherche(V) {
  if (V.mode === 'vide' || V.mode === 'source') return _obsTabGeneral(V);
  const R = _obsDonneesRacine(V); if (!R.tous.length) return '<div class="obs-vide">' + _obsT('Aucun coup noté pour l’instant…', 'No move scored yet…') + '</div>';
  const niv = _obsNiv(), top = R.tous.slice(0, 3).map(function (x) { return x[0]; });
  const sel = OBS.sel && R.tous.some(function (x) { return x[0] === OBS.sel; }) ? OBS.sel : null;
  let h = '';
  if (R.avance) h += '<div class="obs-prog"><i style="width:' + (R.avance.n ? Math.round(100 * R.avance.i / R.avance.n) : 0) + '%"></i></div><div class="obs-note">'
    + _obsT('Profondeur ' + R.avance.d + ' en cours : ' + R.avance.i + ' coup(s) de départ notés sur ' + R.avance.n + ' (' + (R.prof ? 'tableau : profondeur ' + R.prof + ' terminée' : 'tableau provisoire') + ').',
            'Depth ' + R.avance.d + ' running: ' + R.avance.i + ' first move(s) scored out of ' + R.avance.n + '.') + '</div>';
  const cles = sel ? [sel].concat(top.filter(function (k) { return k !== sel; })) : top, rang = function (k) { return R.tous.findIndex(function (x) { return x[0] === k; }) + 1; };
  h += _obsMiniRecherche(R, cles, sel, rang);
  h += _obsLignesCandidats(R.tous, R.nomDe, R.cleRetenue, R.dernier);
  if (V.mode === 'direct' && OBS.sel) h += '<div class="obs-note">' + _obsT('Le coup choisi est tracé sur le plateau.', 'The selected move is drawn on the board.') + '</div>';
  if (V.e) h += _obsNotePartielle(V.e);
  if (sel) h += _obsPourquoiHTML(V, R, sel);
  if (sel && R.det) h += _obsVarianteHTML(R.det, sel, R.couleur);
  if (niv >= 1 && R.det) {   // arbre des lignes principales
    const pr = R.det.prof[0], maxk = Math.max.apply(null, pr.lignes.map(function (l) { return l.k; }).concat([1]));
    h += '<h5>' + _obsT('Arbre des lignes principales', 'Tree of principal lines') + '</h5><div class="obs-arbre"><div class="obs-racine">● ' + _obsT('Position actuelle', 'Current position') + ' <small>(' + _obsN(pr.noeuds) + ' ' + _obsT('positions', 'positions') + ')</small></div>';
    pr.lignes.slice(0, niv >= 2 ? 10 : 5).forEach(function (l, i) { const cle = moveKeyDe(l), ret = cle === R.cleRetenue || (!R.cleRetenue && i === 0), ecart = pr.lignes[0].s - l.s;
      h += '<div class="obs-branche ' + (ret ? 'obs-b-ok' : ecart <= 30 ? 'obs-b-alt' : 'obs-b-no') + '" data-apercu="' + cle + '" onclick="obsChoisir(\'' + cle + '\')"><span class="obs-mono">' + _obsE(l.n || '?') + '</span> <b>' + _evalReflexionTexte(l.s) + '</b>'
        + '<div class="obs-barre"><i style="width:' + Math.max(2, Math.round(100 * l.k / maxk)) + '%"></i></div>'
        + (l.suite && l.suite.length ? '<div class="obs-suite">↳ ' + l.suite.map(function (x, j) { return '<span>' + (j + 2) + '. ' + _obsE(x) + '</span>'; }).join(' ') + '</div>' : '') + '</div>'; });
    h += '</div><div class="obs-note">' + _obsT('Seuls les 10 meilleurs coups de départ gardent leur suite : l’arbre entier compte des milliers de positions et n’est pas conservé. Largeur = effort de recherche sous le coup.',
      'Only the 10 best first moves keep their line: the full tree has thousands of positions and is not stored. Width = search effort under the move.') + '</div>';
  }
  return h;
}
/* Le mini plateau de l'onglet Recherche : les 3 meilleurs coups en fleches et la carte de chaleur, ou,
   pendant qu'on survole un coup de la liste, la position juste apres ce coup (billes deplacees cerclees). */
function _obsMiniRecherche(R, cles, sel, rang) {
  const ap = OBS.survol && R.tous.some(function (x) { return x[0] === OBS.survol; }) ? _obsApres(R.racine, R.couleur, OBS.survol) : null;
  const ch = OBS.chaleur ? _obsChaleur(R.tous, R.nomDe) : null;
  // la legende tient sur une ligne et la note reste la meme avec ou sans apercu : la liste ne bouge pas sous la souris
  const svg = ap ? _obsPlateauSVG(ap.board, _obsFlechesDe([OBS.survol], ['rgba(255,213,79,.38)'], [5], [rang(OBS.survol)]), ap.marques, false)
                 : _obsPlateauSVG(R.racine, _obsFlechesDe(cles, sel ? ['#ffd54f', '#66bb6a', '#ffb74d'] : _OBS_COULEURS, sel ? [11, 6, 6] : [10, 7, 5], cles.map(rang)), null, false, ch);
  const lege = ap ? '👁 ' + _obsT('Après ', 'After ') + '<b class="obs-mono">' + _obsE(R.nomDe(OBS.survol)) + '</b>' + (ap.eject ? ', ' + _obsT('une bille éjectée', 'one marble ejected') : ap.push ? ', ' + _obsT('poussée', 'push') : '') + ' — ' + _obsT('billes déplacées cerclées d’or', 'moved marbles ringed in gold')
    : '<span style="color:#66bb6a">●</span> ' + _obsT('meilleur', 'best') + ' <span style="color:#ffb74d">●</span> ' + _obsT('2e', '2nd') + ' <span style="color:#9e9e9e">●</span> ' + _obsT('3e', '3rd') + (sel ? ' <span style="color:#ffd54f">●</span> ' + _obsT('choisi', 'selected') : '')
      + ' <button class="obs-lien" onclick="obsChaleur()">🔥 ' + (OBS.chaleur ? _obsT('masquer la chaleur', 'hide the heat') : _obsT('carte de chaleur', 'heat map')) + '</button>';
  return '<div class="obs-ligne obs-mini-rech">' + svg + '<div class="obs-lege">' + lege + '</div>'
    + (OBS.chaleur ? '<div class="obs-note">' + _obsT('Chaleur : où l’IA veut aller. Chaque case reçoit la meilleure note des coups qui y amènent une bille : couleur pleine pour le meilleur coup, de plus en plus pâle jusqu’au 10e.', 'Heat: where the AI wants to go. Each cell gets the best score of the moves that bring a marble there: full colour for the best move, paler down to the 10th.')
      + (_obsSurvolPossible() ? ' ' + _obsT('Survolez un coup de la liste : le plateau montre la position juste après.', 'Hover a move in the list: the board shows the position right after it.') : '') + '</div>' : '')
    + '</div>';
}
function _obsSurvolPossible() { try { return !!(typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(hover: hover)').matches); } catch (e) { return false; } }
/* « Pourquoi ce coup ? / Pourquoi pas celui-la ? » pour le coup choisi dans la liste. Que des faits : sa note
   et son ecart avec le coup de reference (retenu, ou en tete pendant le calcul), ce que montrent les regles un
   coup plus loin, et, si les deux suites sont gardees, les criteres qui different au bout de ces suites. */
function _obsPourquoiHTML(V, R, cle) {
  const i = R.tous.findIndex(function (x) { return x[0] === cle; }); if (i < 0) return '';
  const x = R.tous[i], nom = R.nomDe(cle);
  const ref = (R.cleRetenue && R.tous.find(function (y) { return y[0] === R.cleRetenue; })) || R.tous[0], nomRef = R.nomDe(ref[0]), estRef = ref[0] === cle;
  const cache = V.e ? (V.e._ana = V.e._ana || {}) : (V.L._ana = V.L._ana || {});
  if (!(cle in cache)) cache[cle] = _obsAnalyseCoup(R.racine, R.couleur, cle);
  const a = cache[cle], billes = function (p) { return (p / 1000).toFixed(2).replace('.', ','); }, faits = [];
  faits.push(_obsT('Rang ' + (i + 1) + ' sur ' + R.tous.length + ', note ' + _evalReflexionTexte(x[1]) + (R.prof ? ' (profondeur ' + R.prof + ')' : '') + '.', 'Rank ' + (i + 1) + ' of ' + R.tous.length + ', score ' + _evalReflexionTexte(x[1]) + (R.prof ? ' (depth ' + R.prof + ')' : '') + '.'));
  if (estRef && R.tous.length > 1) { const d = R.tous[i === 0 ? 1 : 0]; faits.push(_obsT((x[1] - d[1] > 0 ? _obsN(x[1] - d[1]) + ' points de plus que ' : 'même note que ') + R.nomDe(d[0]) + (x[1] - d[1] > 0 ? ' (≈ ' + billes(x[1] - d[1]) + ' bille), le suivant.' : ', le suivant : départagés par l’ordre de recherche.'),
    (x[1] - d[1] > 0 ? _obsN(x[1] - d[1]) + ' points more than ' : 'same score as ') + R.nomDe(d[0]) + (x[1] - d[1] > 0 ? ' (≈ ' + billes(x[1] - d[1]) + ' marble), the next one.' : ', the next one: settled by search order.'))); }
  if (!estRef) { const e = ref[1] - x[1];
    faits.push(e > 0 ? _obsT(_obsN(e) + ' points de moins que ' + nomRef + ' (≈ ' + billes(e) + ' bille).', _obsN(e) + ' points less than ' + nomRef + ' (≈ ' + billes(e) + ' marble).')
      : e === 0 ? _obsT('Même note que ' + nomRef + ' : départagés par l’ordre de recherche.', 'Same score as ' + nomRef + ': settled by search order.')
      : _obsT('Note plus haute que ' + nomRef + ' à cette profondeur : ' + nomRef + ' a été retenu à la profondeur suivante, que le temps n’a pas laissé finir.', 'Higher score than ' + nomRef + ' at this depth: ' + nomRef + ' was chosen at the next depth, which time did not let finish.')); }
  const T = _obsTrajectoire(_obsParProfs(V), cle);
  if (T.length >= 2) {
    faits.push(_obsT('Profondeur après profondeur : ', 'Depth after depth: ') + _obsTrajTexte(T) + '.');
    const tete = T.filter(function (y) { return y[2] === 1; }), der = T[T.length - 1];
    if (!estRef && tete.length && der[2] > 1) { const y = tete[tete.length - 1];
      faits.push(_obsT('Était en tête à la profondeur ' + y[0] + ' (' + _evalReflexionTexte(y[1]) + ') : en cherchant plus loin, le moteur lui a trouvé une meilleure réponse adverse.', 'Was leading at depth ' + y[0] + ' (' + _evalReflexionTexte(y[1]) + '): searching further, the engine found a better reply for the opponent.')); }
    if (estRef) { let n = 0; for (let k = T.length - 1; k >= 0 && T[k][2] === 1; k--) n++;
      if (n >= 2) faits.push(_obsT('En tête aux ' + n + ' dernières profondeurs terminées : le choix n’a pas changé en cherchant plus loin.', 'Leading at the last ' + n + ' completed depths: the choice did not change when searching further.')); }
  }
  if (x[3]) faits.push(_obsT('⚠ La recherche a vu une éjection adverse juste après ce coup.', '⚠ The search saw an opponent ejection right after this move.'));
  if (a) {
    faits.push(_obsT('Type : ', 'Type: ') + _obsTypeTexte(a) + '.');
    faits.push(_obsT('Un coup plus loin : ', 'One move ahead: ') + (a.menace ? _obsT(a.menace + ' éjection(s) préparée(s) si l’adversaire ne réagit pas', a.menace + ' ejection(s) set up if the opponent does not react') : _obsT('aucune éjection préparée', 'no ejection set up'))
      + ' ; ' + (a.risque ? _obsT(a.risque + ' éjection(s) possible(s) pour l’adversaire', a.risque + ' ejection(s) available to the opponent') : _obsT('aucune éjection pour l’adversaire', 'no ejection for the opponent'))
      + ' ; ' + _obsT('billes en danger : IA ' + a.dangerIA + ', adversaire ' + a.dangerAdv + '.', 'marbles in danger: AI ' + a.dangerIA + ', opponent ' + a.dangerAdv + '.'));
  }
  if (!estRef && R.det && typeof _criteresUtilises === 'function') {
    const f1 = _obsLigneDet(R.det, cle), f0 = _obsLigneDet(R.det, ref[0]);
    if (f1 && f0 && f1.l.terms && f0.l.terms) {
      const D = _criteresUtilises(R.det.poids).map(function (k) { return [k[1], (f0.l.terms[k[0]] || 0) - (f1.l.terms[k[0]] || 0)]; }).filter(function (y) { return Math.abs(y[1]) >= 0.5; }).sort(function (p, q) { return Math.abs(q[1]) - Math.abs(p[1]); }).slice(0, 4);
      if (D.length) faits.push(_obsT('Au bout des deux suites prévues, ' + nomRef + ' fait mieux en : ', 'At the end of both expected lines, ' + nomRef + ' does better on: ')
        + D.map(function (y) { return '<span class="' + (y[1] > 0 ? 'obs-plus' : 'obs-moins') + '">' + _obsE(y[0]) + ' ' + (y[1] > 0 ? '+' : '') + String(Math.round(y[1] * 10) / 10).replace('.', ',') + '</span>'; }).join(' ') + '.');
    }
  }
  return '<div class="obs-carte obs-pourquoi"><b>' + (estRef ? (R.dernier ? _obsT('Pourquoi ' + nom + ' a été retenu', 'Why ' + nom + ' was chosen') : _obsT(nom + ' est en tête pour l’instant', nom + ' is leading for now')) : _obsT('Pourquoi pas ' + nom + ' ?', 'Why not ' + nom + '?')) + '</b>'
    + '<ul>' + faits.map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul>'
    + '<div class="obs-note">' + _obsT('Chaque coup de départ est noté en entier (pas d’élagage à la racine) : un coup est écarté pour sa note, pas parce que sa branche a été coupée. Type, éjections et billes en danger : regardés un coup plus loin avec les règles du jeu, sans recherche.',
      'Every first move is fully scored (no pruning at the root): a move is set aside for its score, not because its branch was cut. Type, ejections and marbles in danger: looked at one move ahead with the game rules, without search.') + '</div></div>';
}
/* Profondeur coupee par le minuteur : le coup retenu peut venir d'elle, les tableaux montrent la derniere profondeur terminee */
function _obsNotePartielle(e) {
  if (!e || !e.profTous || !e.prof || e.profTous >= e.prof) return '';
  return '<div class="obs-note">⏱ ' + _obsT('La profondeur ' + e.prof + ' n’a pas été terminée (le temps accordé est écoulé) : les notes et comparaisons ci-dessus sont celles de la profondeur ' + e.profTous + ' terminée. Le coup retenu a la note ' + _evalReflexionTexte(e.score) + ' sur la partie explorée de la profondeur ' + e.prof + '.',
    'Depth ' + e.prof + ' was not finished (the allowed time ran out): the scores and comparisons above are those of completed depth ' + e.profTous + '. The chosen move scores ' + _evalReflexionTexte(e.score) + ' on the explored part of depth ' + e.prof + '.') + '</div>';
}
/* Le plateau d'une suite prevue a l'etape k (k < 0 : la fin), billes deplacees numerotees */
function _obsPlateauEtape(det, l, k) {
  const et = (l && l.etapes) || [], n = et.length; k = (k >= 0 && k < n) ? k : n - 1;
  const num = {}; et.slice(1, k + 1).forEach(function (x, j) { x.cells.forEach(function (cel) { const a = rcToAxial(cel.r, cel.c), rc = axialToRc(a.q + x.dir.q, a.r + x.dir.r); if (rc) num[rc.r + ',' + rc.c] = j + 1; }); });
  return { svg: _obsPlateauSVG(et[k] ? et[k].board : det.racine.board, null, num, false), k: k, n: n };
}
function _obsVarianteHTML(det, cle, couleur) {
  const f = _obsLigneDet(det, cle); if (!f) return '<div class="obs-note">' + _obsT('Ce coup n’est pas parmi les 10 dont la suite est gardée.', 'This move is not among the 10 with a stored line.') + '</div>';
  _notationsReflexion(det);
  const P = _obsPlateauEtape(det, f.l, OBS.etape), n = P.n, k = P.k;
  return '<h5>' + _obsT('Variante de ', 'Line of ') + _obsE(f.l.n) + ' <small>(' + _evalReflexionTexte(f.l.s) + ')</small></h5>' + P.svg
    + '<div class="obs-etapes"><button class="obs-lien" onclick="obsEtape(-1)">⏮</button><button class="obs-lien" onclick="obsEtape(' + (k - 1) + ')">‹</button><span>' + k + ' / ' + (n - 1) + '</span><button class="obs-lien" onclick="obsEtape(' + (k + 1) + ')">›</button><button class="obs-lien" onclick="obsEtape(' + (n - 1) + ')">⏭</button></div>'
    + '<div class="obs-note">' + _obsT('Suite prévue par le moteur : ', 'Line expected by the engine: ') + _obsE([f.l.n].concat(f.l.suite || []).join(' ')) + '</div>';
}

/* ═══ Onglet 3 : Evaluation ═══ */
function _obsTabEvaluation(V) {
  if (V.mode === 'vide' || V.mode === 'source') return _obsTabGeneral(V);
  if (V.mode === 'direct') return '<div class="obs-vide">' + _obsT('La décomposition de la note apparaît à la fin du calcul.', 'The score breakdown appears when the search is finished.') + '</div>'
    + '<h5>' + _obsT('Carte des billes (position analysée)', 'Marble map (analysed position)') + '</h5>' + _obsPlateauSVG(V.L.racine, null, null, true) + _obsLegendeCarte();
  const e = V.e, det = e.det; if (!det || !det.pos) return '<div class="obs-vide">' + _obsT('Pas de décomposition pour ce coup.', 'No breakdown for this move.') + '</div>';
  const CR = _criteresUtilises(det.poids), pos = det.pos, tot = Object.keys(pos).reduce(function (a, k) { return a + pos[k]; }, 0);
  const sel = OBS.sel ? _obsLigneDet(det, OBS.sel) : null, niv = _obsNiv();
  const mx = Math.max.apply(null, CR.map(function (k) { return Math.abs(pos[k[0]] || 0); }).concat([1]));
  let h = '<div class="obs-grille"><div class="obs-k"><span>' + _obsT('Note de la position', 'Position score') + '</span><b>' + _evalReflexionTexte(tot) + '</b><small>' + _obsT('du point de vue de l’IA', 'from the AI’s side') + '</small></div>'
    + '<div class="obs-k"><span>' + _obsT('Après la suite prévue', 'After the expected line') + '</span><b>' + _evalReflexionTexte(e.score) + '</b><small>' + _obsT('note retenue', 'score kept') + '</small></div></div>';
  h += '<h5>' + _obsT('Ce qui compose la note', 'What makes up the score') + '</h5><table class="obs-t"><tr><th>' + _obsT('Critère', 'Criterion') + '</th><th>' + _obsT('Valeur', 'Value') + '</th><th></th>' + (sel ? '<th>' + _obsT('Avec ', 'With ') + _obsE(sel.l.n) + '</th>' : '') + (niv >= 2 ? '<th>' + _obsT('Poids', 'Weight') + '</th>' : '') + '</tr>';
  CR.forEach(function (k) { const v = pos[k[0]] || 0, d = sel && sel.l.terms ? (sel.l.terms[k[0]] - v) : null;
    h += '<tr><td>' + _obsE(k[1]) + '</td><td>' + (Math.abs(v) < 0.05 ? '·' : (v > 0 ? '+' : '') + String(Math.round(v * 10) / 10).replace('.', ',')) + '</td><td><div class="obs-bipol"><i class="' + (v >= 0 ? 'obs-pos' : 'obs-neg') + '" style="width:' + Math.round(50 * Math.abs(v) / mx) + '%;' + (v >= 0 ? 'left:50%' : 'right:50%') + '"></i></div></td>'
      + (sel ? '<td class="' + (d > 0.05 ? 'obs-plus' : d < -0.05 ? 'obs-moins' : '') + '">' + (d == null || Math.abs(d) < 0.05 ? '·' : (d > 0 ? '+' : '') + String(Math.round(d * 10) / 10).replace('.', ',')) + '</td>' : '')
      + (niv >= 2 ? '<td>' + (k[3] || (det.poids && det.poids[k[2]]) || '') + '</td>' : '') + '</tr>'; });
  h += '</table><div class="obs-note">' + _obsT('Unités : points internes. Une bille de plus vaut 1000 points, une éjection 2000. Ce n’est pas une probabilité de gagner. Sélectionnez un coup dans « Recherche » pour voir ce qu’il change : la colonne montre l’écart entre la position et le bout de sa suite prévue.',
    'Units: internal points. One marble ahead is worth 1000, an ejection 2000. This is not a win probability. Select a move in “Search” to see what it changes: the column shows the gap between the position and the end of its expected line.') + '</div>';
  h += '<h5>' + _obsT('Carte des billes', 'Marble map') + '</h5>' + _obsPlateauSVG(det.racine.board, null, null, true) + _obsLegendeCarte();
  return h;
}
function _obsLegendeCarte() {
  return '<div class="obs-lege"><span style="color:#ef5350">●</span> ' + _obsT('en danger (bord, 1 allié ou moins)', 'in danger (edge, ≤1 ally)') + ' <span style="color:#ffb74d">●</span> ' + _obsT('isolée', 'isolated') + ' <span style="color:#66bb6a">●</span> ' + _obsT('forteresse (4+ alliés)', 'fortress (4+ allies)') + '</div>'
    + '<div class="obs-note">' + _obsT('Mêmes définitions que celles de l’évaluation du moteur.', 'Same definitions as the engine’s evaluation.') + '</div>';
}

/* ═══ Onglet 4 : Decision ═══ */
function _obsTabDecision(V) {
  if (V.mode === 'vide' || V.mode === 'source') return _obsTabGeneral(V);
  if (V.mode === 'direct') return '<div class="obs-vide">' + _obsT('Le moteur n’a pas encore choisi : la comparaison apparaît à la fin du calcul.', 'The engine has not chosen yet: the comparison appears when the search is finished.') + '</div>';
  const e = V.e; if (!e.det) return '<div class="obs-vide">' + _obsT('Pas de comparaison pour ce coup.', 'No comparison for this move.') + '</div>';
  const pr = e.det.prof[0], CR = _criteresUtilises(e.det.poids);
  let ret = pr.lignes.find(function (l) { return moveKeyDe(l) === e.cle; }), horsListe = false;
  if (!ret) {   // choisi a la profondeur suivante, coupee par le temps : pas de suite detaillee
    const t = (e.tous || []).find(function (x) { return x[0] === e.cle; }), x = _obsLireCle(e.cle) || { cells: [], dir: { q: 0, r: 0 } };
    ret = { n: (e.noms && e.noms[e.cle]) || '?', s: typeof e.score === 'number' ? e.score : (t ? t[1] : 0), cells: x.cells, dir: x.dir, terms: null, suite: [] }; horsListe = true;
  }
  const alts = pr.lignes.filter(function (l) { return l !== ret; }).slice(0, 3);
  _notationsReflexion(e.det);
  let h = '<div class="obs-decide"><div class="obs-carte obs-c-ok"><span>' + _obsT('Coup retenu', 'Chosen move') + '</span><b class="obs-mono">' + _obsE(ret.n || '?') + '</b><em>' + _evalReflexionTexte(ret.s) + '</em></div>';
  alts.slice(0, 2).forEach(function (a, i) { h += '<div class="obs-carte ' + (i ? 'obs-c-gris' : 'obs-c-alt') + '"><span>' + _obsT('Alternative ', 'Alternative ') + (i + 1) + '</span><b class="obs-mono">' + _obsE(a.n || '?') + '</b><em>' + _evalReflexionTexte(a.s) + '</em></div>'; });
  h += '</div>';
  h += _obsPlateauSVG(e.det.racine.board, _obsFlechesDe([moveKeyDe(ret)].concat(alts.slice(0, 2).map(moveKeyDe)), ['#66bb6a', '#ffb74d', '#9e9e9e'], [11, 7, 7]), null, false);
  h += _obsTableCoups(e, [ret].concat(alts), moveKeyDe(ret));
  h += '<h5>' + _obsT('Pourquoi ' + (ret.n || 'ce coup') + ' plutôt qu’un autre ?', 'Why ' + (ret.n || 'this move') + ' rather than another?') + '</h5>';
  alts.forEach(function (a) {
    const ecart = ret.s - a.s;
    const diffs = (ret.terms && a.terms) ? CR.map(function (k) { return [k[1], (ret.terms[k[0]] || 0) - (a.terms[k[0]] || 0)]; }).filter(function (x) { return Math.abs(x[1]) >= 0.5; }).sort(function (x, y) { return Math.abs(y[1]) - Math.abs(x[1]); }).slice(0, 4) : [];
    h += '<div class="obs-vs"><b class="obs-mono">' + _obsE(ret.n) + '</b> ' + _obsT('contre', 'vs') + ' <b class="obs-mono">' + _obsE(a.n) + '</b> : ' + (ecart > 0 ? _obsT('meilleur de ', 'better by ') + _obsN(ecart) + ' ' + _obsT('points', 'points') : _obsT('à égalité (départagé par l’ordre de recherche)', 'tied (settled by search order)'));
    const Ta = _obsTrajectoire(_obsParProfs(V), moveKeyDe(a)), Tr = _obsTrajectoire(_obsParProfs(V), moveKeyDe(ret));
    if (Ta.length >= 2) h += '<div class="obs-note">' + _obsE(a.n) + ' : ' + _obsTrajTexte(Ta) + (Tr.length >= 2 ? '<br>' + _obsE(ret.n) + ' : ' + _obsTrajTexte(Tr) : '') + '</div>';
    if (diffs.length) h += '<div class="obs-suite">' + diffs.map(function (x) { return '<span class="' + (x[1] > 0 ? 'obs-plus' : 'obs-moins') + '">' + _obsE(x[0]) + ' ' + (x[1] > 0 ? '+' : '') + String(Math.round(x[1] * 10) / 10).replace('.', ',') + '</span>'; }).join(' ') + '</div>';
    h += '<button class="obs-lien" onclick="obsChoisir(\'' + moveKeyDe(a) + '\');obsOnglet(\'recherche\')">' + _obsT('Et si l’IA avait joué ', 'What if the AI had played ') + _obsE(a.n) + ' ? →</button></div>';
  });
  h += _obsComparer(e, ret, alts);
  if (!horsListe) h += _obsNotePartielle(e);
  if (horsListe) h += '<div class="obs-note">' + _obsT('Le coup retenu a été trouvé à la profondeur ' + e.prof + ', que le temps n’a pas laissé finir : il n’a pas de suite détaillée, et ses alternatives sont celles de la profondeur ' + (e.profTous || '') + ' terminée.',
    'The chosen move was found at depth ' + e.prof + ', which time did not let finish: it has no detailed line, and its alternatives come from the completed depth ' + (e.profTous || '') + '.') + '</div>';
  h += '<div class="obs-note">' + _obsT('Reconstitué après le calcul : les écarts de critères comparent le bout de la suite prévue de chaque coup (données du moteur). La note, elle, vient de la recherche complète, quiescence comprise : les deux peuvent différer un peu.',
    'Rebuilt after the search: criterion gaps compare the end of each move’s expected line (engine data). The score itself comes from the full search, quiescence included, so the two can differ slightly.') + '</div>';
  return h;
}

/* Ce que fait un coup, regarde UN coup plus loin sur le plateau (sans recherche) : son type, les
   ejections possibles ensuite des deux cotes, les billes en danger. Les regles du jeu du site
   (validateMove, applyMove, getAllMovesForColor) sur une copie du plateau (_avecPlateau). */
function _obsAnalyseCoup(racine, couleur, cle) {
  const x = _obsLireCle(cle); if (!x || !racine || typeof _avecPlateau !== 'function') return null;
  const adv = couleur === 'black' ? 'white' : 'black';
  try {
    return _avecPlateau(JSON.parse(JSON.stringify(racine)), 0, 0, function () {
      const info = validateMove(x.cells, x.dir, couleur); if (!info || !info.valid) return null;
      const type = info.type === 'push' ? (info.ejection ? 'eject' : 'push') : info.type === 'broadside' ? 'lateral' : 'ligne';
      const u = applyMove({ cells: x.cells, dir: x.dir, info: info }, couleur);
      try {
        const st = _obsStatutBilles(board); let dIA = 0, dAdv = 0;
        for (const k in st) if (st[k] === 'danger') { if (board[k] === couleur) dIA++; else dAdv++; }
        return { type: type, n: x.cells.length, push: info.push || 0,
                 menace: getAllMovesForColor(couleur).filter(function (m) { return m.eject; }).length,
                 risque: getAllMovesForColor(adv).filter(function (m) { return m.eject; }).length,
                 dangerIA: dIA, dangerAdv: dAdv };
      } finally { undoMove(u); }
    });
  } catch (err) { return null; }
}
function _obsTypeTexte(a) {
  if (!a) return '?';
  if (a.type === 'eject') return _obsT('éjection (' + a.n + ' contre ' + a.push + ')', 'ejection (' + a.n + ' vs ' + a.push + ')');
  if (a.type === 'push') return _obsT('poussée ' + a.n + ' contre ' + a.push, 'push ' + a.n + ' vs ' + a.push);
  if (a.type === 'lateral') return _obsT('latéral, ' + a.n + ' billes', 'broadside, ' + a.n + ' marbles');
  return a.n === 1 ? _obsT('1 bille', '1 marble') : _obsT('en ligne, ' + a.n + ' billes', 'inline, ' + a.n + ' marbles');
}
function _obsTableCoups(e, lignes, cleRet) {
  const racine = e.racine || (e.det && e.det.racine.board); if (!racine) return '';
  e._ana = e._ana || {};
  let h = '<h5>' + _obsT('Ce que chaque coup change, un coup plus loin', 'What each move changes, one move ahead') + '</h5><table class="obs-t"><tr><th>' + _obsT('Coup', 'Move') + '</th><th>' + _obsT('Note', 'Score') + '</th><th>' + _obsT('Type', 'Type') + '</th>'
    + '<th title="' + _obsT('Poussées de l’IA qui éjecteraient au coup suivant si l’adversaire ne réagit pas', 'AI pushes that would eject next move if the opponent does not react') + '">' + _obsT('Éj. IA', 'AI ej.') + '</th>'
    + '<th title="' + _obsT('Éjections que l’adversaire peut jouer tout de suite', 'Ejections the opponent can play right away') + '">' + _obsT('Éj. adv.', 'Opp. ej.') + '</th>'
    + '<th title="' + _obsT('Billes en danger (au bord, un allié ou moins) : IA / adversaire', 'Marbles in danger (edge, one ally or fewer): AI / opponent') + '">' + _obsT('Danger', 'Danger') + '</th></tr>';
  lignes.forEach(function (l) {
    const cle = moveKeyDe(l); if (!(cle in e._ana)) e._ana[cle] = _obsAnalyseCoup(racine, e.couleur, cle);
    const a = e._ana[cle];
    h += '<tr class="' + (cle === cleRet ? 'obs-sel' : '') + '"><td>' + _obsE(l.n || '?') + '</td><td>' + _evalReflexionTexte(l.s) + '</td><td style="font-family:DM Sans,sans-serif">' + _obsE(_obsTypeTexte(a)) + '</td>'
      + (a ? '<td class="' + (a.menace ? 'obs-plus' : '') + '">' + a.menace + '</td><td class="' + (a.risque ? 'obs-moins' : '') + '">' + a.risque + '</td><td>' + a.dangerIA + ' / ' + a.dangerAdv + '</td>' : '<td>·</td><td>·</td><td>·</td>') + '</tr>';
  });
  return h + '</table><div class="obs-note">' + _obsT('Reconstitué après le calcul, avec les règles du jeu, un coup plus loin et sans recherche : « Éj. IA » compte les poussées qui éjecteraient ensuite si l’adversaire ne réagit pas, « Éj. adv. » ce que l’adversaire peut éjecter tout de suite, « Danger » les billes au bord avec un allié ou moins (IA / adversaire). La note, elle, vient de la recherche.',
    'Rebuilt after the search with the game rules, one move ahead and without search: “AI ej.” counts pushes that would eject next if the opponent does not react, “Opp. ej.” what the opponent can eject right away, “Danger” marbles on the edge with one ally or fewer (AI / opponent). The score comes from the search.') + '</div>';
}
/* Deux variantes cote a cote, avancees ensemble pas a pas */
function _obsComparer(e, ret, alts) {
  const det = e.det; if (!det) return '';
  const cands = [ret].concat(alts).filter(function (l) { return l && l.etapes && l.etapes.length > 1; });
  if (cands.length < 2) return '';
  const g = cands[0], d = cands.slice(1).find(function (l) { return moveKeyDe(l) === OBS.cmp; }) || cands[1];
  const nMax = Math.max(g.etapes.length, d.etapes.length), k = (OBS.etapeCmp >= 0 && OBS.etapeCmp < nMax) ? OBS.etapeCmp : nMax - 1;
  _notationsReflexion(det);
  function colonne(l, cls) {
    const P = _obsPlateauEtape(det, l, Math.min(k, l.etapes.length - 1)), noms = [l.n].concat(l.suite || []);
    return '<div class="obs-carte ' + cls + '"><span>' + (l === ret ? _obsT('Coup retenu', 'Chosen move') : _obsT('Alternative', 'Alternative')) + '</span><b class="obs-mono">' + _obsE(l.n || '?') + '</b> <em>' + _evalReflexionTexte(l.s) + '</em>' + P.svg
      + '<div class="obs-suite">' + noms.map(function (x, j) { return '<span' + (j === P.k - 1 ? ' class="obs-ici"' : '') + '>' + (j + 1) + '. ' + _obsE(x) + '</span>'; }).join(' ') + '</div></div>';
  }
  let h = '<h5>' + _obsT('Comparer deux variantes', 'Compare two lines') + '</h5>';
  if (cands.length > 2) h += '<div class="obs-suite">' + _obsT('Comparer avec : ', 'Compare with: ') + cands.slice(1).map(function (l) { const c = moveKeyDe(l);
    return '<button class="obs-btn' + (l === d ? ' obs-actif' : '') + '" onclick="obsComparerAvec(\'' + c + '\')">' + _obsE(l.n || '?') + '</button>'; }).join(' ') + '</div>';
  h += '<div class="obs-duo">' + colonne(g, g === ret ? 'obs-c-ok' : 'obs-c-alt') + colonne(d, 'obs-c-alt') + '</div>'
    + '<div class="obs-etapes"><button class="obs-lien" onclick="obsEtapeCmp(0)">⏮</button><button class="obs-lien" onclick="obsEtapeCmp(' + Math.max(0, k - 1) + ')">‹</button><span>' + k + ' / ' + (nMax - 1) + '</span><button class="obs-lien" onclick="obsEtapeCmp(' + Math.min(nMax - 1, k + 1) + ')">›</button><button class="obs-lien" onclick="obsEtapeCmp(' + (nMax - 1) + ')">⏭</button></div>'
    + '<div class="obs-note">' + _obsT('Les deux suites prévues par le moteur, avancées ensemble. Les chiffres sur les billes : à quel coup de la suite elles ont bougé.', 'Both lines expected by the engine, stepped together. Numbers on marbles: at which move of the line they moved.') + '</div>';
  return h;
}

/* ═══ Rapport telechargeable (hors ligne) ═══ */
function _obsRapportDonnees() {
  return { application: 'Abalassembly ' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''), outil: 'Observatoire IA', date: new Date().toISOString(),
    unites: 'points internes : une bille de plus = 1000, une éjection = 2000 ; pas une probabilité de gagner',
    coups: OBS.hist.map(function (e) {
      if (e.source) return { n: e.n, couleur: e.couleur, sansCalcul: e.source };
      const nom = function (k) { return (e.noms && e.noms[k]) || '?'; }, f = e.det && e.cle ? _obsLigneDet(e.det, e.cle) : null;
      return { n: e.n, couleur: e.couleur, coup: nom(e.cle), note: Math.round(e.score || 0), profondeur: e.prof, profondeurTerminee: e.profTous || e.prof,
        ms: Math.round(e.ms || 0), tempsAccorde: e.budget || 0, positions: e.noeuds || 0, coupures: e.coupures || 0, tableTransposition: e.tt || 0, fils: e.nFils || 1,
        suitePrevue: f ? [f.l.n].concat(f.l.suite || []) : [],
        meilleurParProfondeur: Object.keys(e.parProfs || {}).map(Number).sort(function (a, b) { return a - b; }).map(function (d) { const x = e.parProfs[d][0]; return { profondeur: d, coup: nom(x[0]), note: x[1] }; }),
        candidats: (e.tous || []).slice(0, 10).map(function (x) { return { coup: nom(x[0]), note: Math.round(x[1]), effort: x[2] || 0, ejectionAdverseEnsuite: !!x[3] }; }) };
    }) };
}
function _obsRapportTexte() {
  const D = _obsRapportDonnees(), cTxt = function (c) { return c === 'white' ? _obsT('Blancs', 'White') : _obsT('Noirs', 'Black'); };
  const L = [D.application + ' — ' + _obsT('Observatoire IA : rapport', 'AI Observatory: report'), _obsT('Date : ', 'Date: ') + new Date().toLocaleString('fr-FR'),
    _obsT('Unités : ', 'Units: ') + D.unites, ''];
  if (!D.coups.length) L.push(_obsT('Aucun coup de l’IA enregistré pour l’instant.', 'No AI move recorded yet.'));
  D.coups.forEach(function (c) {
    if (c.sansCalcul) { L.push(_obsT('Coup ', 'Move ') + c.n + ' (' + cTxt(c.couleur) + ') — ' + _obsT('sans calcul : ', 'no search: ') + c.sansCalcul); return; }
    L.push(_obsT('Coup ', 'Move ') + c.n + ' (' + cTxt(c.couleur) + ') — ' + c.coup + ' — ' + _obsT('note ', 'score ') + _evalReflexionTexte(c.note) + ' — ' + _obsT('profondeur ', 'depth ') + c.profondeur
      + (c.profondeurTerminee < c.profondeur ? ' (' + c.profondeurTerminee + _obsT(' terminée)', ' completed)') : '') + ' — ' + _msTexte(c.ms) + ' — ' + _obsN(c.positions) + ' positions — '
      + _obsT('coupures ', 'cutoffs ') + (c.positions ? Math.round(100 * c.coupures / c.positions) : 0) + ' % — TT ' + c.tableTransposition + ' %');
    if (c.suitePrevue.length) L.push('  ' + _obsT('Suite prévue : ', 'Expected line: ') + c.suitePrevue.join(' '));
    if (c.meilleurParProfondeur && c.meilleurParProfondeur.length) L.push('  ' + _obsT('Meilleur coup par profondeur : ', 'Best move by depth: ') + c.meilleurParProfondeur.map(function (x) { return x.profondeur + ':' + x.coup + ' ' + _evalReflexionTexte(x.note); }).join('  '));
    if (c.candidats.length) L.push('  ' + _obsT('Meilleurs coups : ', 'Best moves: ') + c.candidats.slice(0, 5).map(function (x, i) { return (i + 1) + '. ' + x.coup + ' ' + _evalReflexionTexte(x.note) + (x.ejectionAdverseEnsuite ? ' ⚠' : ''); }).join('  '));
  });
  L.push('', _obsT('⚠ : l’adversaire a une éjection juste après ce coup. Les notes viennent de la recherche du moteur ; rien n’est estimé à part.', '⚠: the opponent has an ejection right after this move. Scores come from the engine search; nothing is estimated separately.'));
  return L.join('\n') + '\n';
}
function obsCopier() {
  const t = _obsRapportTexte(), ok = function () { if (typeof showToast === 'function') showToast('📋 ' + _obsT('Rapport copié', 'Report copied')); };
  const secours = function () { try { const z = document.createElement('textarea'); z.value = t; z.style.position = 'fixed'; z.style.opacity = '0'; document.body.appendChild(z); z.select(); document.execCommand('copy'); z.remove(); ok(); } catch (e) {} };
  try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, secours); else secours(); } catch (e) { secours(); }
  return t;
}
function obsExporter(fmt) {
  const j = new Date(), z = function (n) { return (n < 10 ? '0' : '') + n; };
  const nom = 'observatoire-ia-' + j.getFullYear() + '-' + z(j.getMonth() + 1) + '-' + z(j.getDate()) + '_' + z(j.getHours()) + 'h' + z(j.getMinutes()) + (fmt === 'json' ? '.json' : '.txt');
  const texte = fmt === 'json' ? JSON.stringify(_obsRapportDonnees(), null, 1) : _obsRapportTexte();
  if (typeof _scanDownload === 'function') _scanDownload(nom, texte, fmt === 'json' ? 'application/json' : 'text/plain;charset=utf-8');
  if (typeof showToast === 'function') showToast('💾 ' + nom);
  return texte;
}

/* ═══ Onglet 5 : Historique et replay ═══ */
function _obsTabHistorique() {
  if (!OBS.hist.length) return '<div class="obs-vide">' + _obsT('Les décisions de l’IA de cette partie s’afficheront ici, coup par coup.', 'The AI’s decisions for this game will be listed here, move by move.') + '</div>';
  const sc = OBS.hist.filter(function (e) { return typeof e.score === 'number' && Math.abs(e.score) < 90000; }).map(function (e) { return e.score; });
  let h = '<h5>' + _obsT('Note de l’IA au fil de la partie', 'AI score over the game') + '</h5>' + _obsCourbe(sc, 300, 60, '#c8a84b', true)
    + '<div class="obs-note">' + _obsT('Au-dessus de la ligne : l’IA estime être mieux placée. Une chute brutale marque un retournement.', 'Above the line: the AI thinks it is better. A sharp drop marks a turning point.') + '</div>';
  h += '<table class="obs-t"><tr><th>#</th><th>' + _obsT('Coup', 'Move') + '</th><th>' + _obsT('Note', 'Score') + '</th><th>' + _obsT('Prof.', 'Depth') + '</th><th>' + _obsT('Temps', 'Time') + '</th><th></th></tr>';
  let prec = null;
  OBS.hist.forEach(function (e, i) {
    const nom = e.source ? ({ table: _obsT('table', 'table'), livre: _obsT('livre', 'book'), stat: _obsT('livre', 'book'), empreinte: _obsT('empreinte', 'fingerprint'), n1: _obsT('niv. 1', 'lvl 1') })[e.source] || e.source : (e.noms && e.noms[e.cle]) || '?';
    const chute = (prec != null && typeof e.score === 'number' && prec - e.score >= 200);
    h += '<tr class="' + (OBS.rev === i ? 'obs-sel' : '') + '" onclick="obsRevoir(' + i + ')"><td>' + e.n + '</td><td class="obs-mono">' + _obsE(nom) + '</td><td>' + (e.source ? '·' : _evalReflexionTexte(e.score)) + '</td><td>' + (e.source ? '·' : e.prof) + '</td><td>' + (e.source ? '·' : _msTexte(e.ms)) + '</td><td>' + (chute ? '<span class="obs-chip obs-no" title="' + _obsT('La note a chuté d’au moins 200 points depuis le coup précédent', 'Score dropped by 200+ points since the previous move') + '">↓</span>' : '') + '</td></tr>';
    if (typeof e.score === 'number') prec = e.score;
  });
  h += '</table>';
  if (OBS.rev >= 0) {
    const e = OBS.hist[OBS.rev], R = OBS.relance;
    h += '<div class="obs-carte"><b>' + _obsT('Coup ', 'Move ') + e.n + _obsT(' en revue', ' under review') + '</b> — ' + _obsT('les autres onglets montrent ce coup, et restent dessus pendant que l’IA joue la suite. ', 'the other tabs show this move, and stay on it while the AI plays on. ')
      + '<button class="obs-lien" onclick="obsRevoir(-1)">' + _obsT('Revenir au direct', 'Back to live') + '</button>';
    if (e.det) {
      h += '<div style="margin-top:6px"><button class="obs-btn" onclick="obsReanalyser(' + OBS.rev + ')"' + (R && R.etat === 'calcul' ? ' disabled' : '') + '>' + _obsT('Rejouer ce calcul plus profond', 'Re-run this search deeper') + '</button></div>';
      if (R && R.i === OBS.rev) h += R.etat === 'calcul' ? '<div class="obs-note">⏳ ' + _obsT('Calcul en cours (8 s au plus)…', 'Searching (8 s max)…') + '</div>'
        : '<div class="obs-note"><b>' + _obsT('Profondeur ', 'Depth ') + R.prof + ' :</b> ' + _obsT('meilleur coup ', 'best move ') + '<span class="obs-mono">' + _obsE(R.nom) + '</span> (' + _evalReflexionTexte(R.score) + ') — '
          + (R.nom === ((e.noms && e.noms[e.cle]) || '?') ? _obsT('le même coup qu’à la profondeur ', 'same move as at depth ') + e.prof : _obsT('autre que le coup joué (profondeur ' + e.prof + ')', 'differs from the move played (depth ' + e.prof + ')')) + '. '
          + _obsT('Sans l’historique des répétitions de la partie.', 'Without the game’s repetition history.') + '</div>';
    }
    h += '</div>';
  }
  h += '<h5>' + _obsT('Rapport', 'Report') + '</h5><div class="obs-suite"><button class="obs-btn" onclick="obsCopier()">📋 ' + _obsT('Copier', 'Copy') + '</button> <button class="obs-btn" onclick="obsExporter(\'txt\')">⬇ ' + _obsT('Rapport lisible (.txt)', 'Readable report (.txt)') + '</button>'
    + (_obsNiv() >= 2 ? ' <button class="obs-btn" onclick="obsExporter(\'json\')">⬇ ' + _obsT('Données (.json)', 'Data (.json)') + '</button>' : '') + '</div>'
    + '<div class="obs-note">' + _obsT('Le fichier est créé dans le navigateur : rien n’est envoyé.', 'The file is made in the browser: nothing is sent.') + '</div>';
  return h;
}

/* ═══ Replay plus profond : un fil temporaire, sans toucher aux fils de la partie ═══ */
function obsReanalyser(i) {
  const e = OBS.hist[i]; if (!e || !e.det || (OBS.relance && OBS.relance.etat === 'calcul')) return;
  let url, w;
  try { url = URL.createObjectURL(new Blob([AI_WORKER_CODE], { type: 'application/javascript' })); w = new Worker(url); } catch (x) { return; }
  const prof = Math.min(8, (e.prof || 3) + 2);
  OBS.relance = { i: i, etat: 'calcul', prof: prof };
  w.onmessage = function (ev) {
    if (ev.data && ev.data.progress) return;
    const mv = ev.data && ev.data.move, m = ev.data && ev.data.metrics;
    OBS.relance = { i: i, etat: 'fini', prof: (m && m.depth) || prof, nom: mv ? ((abaproOfficialLabels(Object.assign({}, mv)) || [])[0] || '?') : '?', score: m ? m.bestScore : 0 };
    try { w.terminate(); URL.revokeObjectURL(url); } catch (x) {}
    _obsPlanifier(true);
  };
  w.postMessage({ board: JSON.parse(JSON.stringify(e.det.racine.board)), capturedByWhite: e.det.racine.cW, capturedByBlack: e.det.racine.cB, color: e.couleur, depth: prof, time: 8000, hist: null, weights: e.det.poids || undefined });
  _obsRendu();
}

/* ═══ Interactions ═══ */
function obsChoisir(cle) {
  OBS.sel = (OBS.sel === cle) ? null : cle; OBS.etape = -1;
  const L = OBS.live;
  if (L && L.etat === 'calcul' && OBS.sel) { const x = _obsLireCle(OBS.sel); OBS.surPlateau = x ? { cells: x.cells, dir: x.dir } : null; } else OBS.surPlateau = null;
  if (typeof drawBoard === 'function') drawBoard();
  _obsRendu();
}
function obsEtape(k) { OBS.etape = k; _obsRendu(); }
function obsOnglet(o) { OBS.onglet = o; _obsRendu(); }
function obsNiveau(n) { OBS.niveau = n; try { localStorage.setItem('abaObsNiveau', n); } catch (e) {} _obsRendu(); }
function obsRevoir(i) { OBS.rev = i; OBS.sel = null; OBS.etape = -1; OBS.tout = false; OBS.surPlateau = null; if (typeof drawBoard === 'function') drawBoard(); _obsRendu(); }
function obsFiger() { OBS.fige = !OBS.fige; _obsRendu(); }
function obsRevoirPas(d) {
  if (!OBS.hist.length) return;
  let i = OBS.rev < 0 ? OBS.hist.length + (d < 0 ? -1 : 0) : OBS.rev + d;
  if (OBS.rev < 0 && d > 0) return;                       // deja au direct
  if (i >= OBS.hist.length) i = -1; else if (i < 0) i = 0;
  obsRevoir(i);
}
function obsReduire() { OBS.reduit = !OBS.reduit; try { localStorage.setItem('abaObsReduit', OBS.reduit ? '1' : '0'); } catch (e) {} if (OBS.reduit) OBS.grand = false; _obsRendu(); }
function obsComparerAvec(cle) { OBS.cmp = cle; _obsRendu(); }
function obsEtapeCmp(k) { OBS.etapeCmp = k; _obsRendu(); }
function obsGrand() { OBS.grand = !OBS.grand; _obsRendu(); const c = document.getElementById('obs-corps'); if (c) c.scrollTop = 0; }
function obsOption(k) {
  if (k === 'bandeau') { OBS.bandeau = !OBS.bandeau; try { localStorage.setItem('abaObsBandeau', OBS.bandeau ? '1' : '0'); } catch (e) {} if (!OBS.bandeau) _obsBandeau(true); }
  else if (k === 'fleches' || k === 'menaces') {
    OBS.surVrai[k] = !OBS.surVrai[k];
    try { localStorage.setItem('abaObsPlateau', JSON.stringify({ f: OBS.surVrai.fleches ? 1 : 0, m: OBS.surVrai.menaces ? 1 : 0 })); } catch (e) {}
    if (typeof drawBoard === 'function') drawBoard();
  }
  _obsRendu();
}
function obsBasculer() {
  OBS.ouvert = !OBS.ouvert; try { localStorage.setItem('abaObs', OBS.ouvert ? '1' : '0'); } catch (e) {}
  if (!OBS.ouvert) { OBS.surPlateau = null; OBS.grand = false; }
  if (typeof drawBoard === 'function') drawBoard();   // fleches et billes menacees : affichees seulement panneau ouvert
  _obsRendu();
}

/* ═══ Rendu ═══ */
function _obsPlanifier(maintenant) {
  if (!OBS.ouvert || OBS.fige) return;
  if (maintenant) { clearTimeout(OBS.minuteur); OBS.minuteur = null; _obsRendu(); return; }
  if (OBS.minuteur) return;
  OBS.minuteur = setTimeout(function () { OBS.minuteur = null; _obsRendu(); }, 220);
}
function _obsCss() {
  if (typeof document === 'undefined' || document.getElementById('obs-style')) return;
  const st = document.createElement('style'); st.id = 'obs-style';
  st.textContent = '#obs-panneau{position:fixed;top:64px;right:8px;bottom:8px;width:min(400px,calc(100vw - 16px));z-index:2400;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;display:none;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.55);font-size:12px;color:var(--text)}'
    + '#obs-panneau.obs-on{display:flex}#obs-panneau .obs-entete{display:flex;align-items:center;gap:6px;padding:8px 10px;border-bottom:1px solid var(--border);flex-wrap:wrap}'
    + '#obs-panneau .obs-entete b{font-family:"Playfair Display",serif;color:var(--gold);font-size:14px;margin-right:auto}'
    + '#obs-panneau .obs-onglets{display:flex;gap:2px;padding:6px 8px 0;overflow-x:auto;border-bottom:1px solid var(--border)}'
    + '#obs-panneau .obs-onglets button{background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);padding:5px 8px;cursor:pointer;font-size:12px;white-space:nowrap}#obs-panneau .obs-onglets button.obs-actif{color:var(--gold);border-bottom-color:var(--gold)}'
    + '#obs-corps{flex:1;overflow:auto;padding:10px 12px}#obs-corps h5{margin:12px 0 5px;color:var(--gold);font-size:12px;font-weight:600}'
    + '.obs-niv{display:inline-flex;border:1px solid var(--border);border-radius:12px;overflow:hidden}.obs-niv button{background:none;border:none;color:var(--muted);padding:3px 8px;cursor:pointer;font-size:11px}.obs-niv button.obs-actif{background:rgba(200,168,75,.2);color:var(--gold)}'
    + '.obs-btn,.obs-lien,#obs-panneau .obs-entete .obs-ic{background:rgba(200,168,75,.1);border:1px solid var(--gold-dim);color:var(--gold);border-radius:10px;padding:3px 9px;cursor:pointer;font-size:11px}.obs-lien{background:none;border:none;padding:2px 4px;text-decoration:underline}#obs-panneau .obs-entete .obs-ic{padding:2px 7px}#obs-panneau .obs-entete{gap:4px}'
    + '.obs-btn:disabled{opacity:.5;cursor:default}'
    + '.obs-grille{display:grid;grid-template-columns:1fr 1fr;gap:6px}.obs-g3{grid-template-columns:repeat(3,1fr);margin-top:6px}.obs-k{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 8px;display:flex;flex-direction:column}'
    + '.obs-k span,.obs-k small{color:var(--muted);font-size:10.5px}.obs-k b{font-size:17px;color:var(--white);font-family:"DM Mono",monospace}'
    + '.obs-prog,.obs-barre{height:7px;background:var(--surface2);border-radius:4px;overflow:hidden;margin:6px 0 2px}.obs-barre{margin:0;min-width:46px}.obs-prog i,.obs-barre i{display:block;height:100%;background:var(--gold)}'
    + '.obs-t{width:100%;border-collapse:collapse;font-family:"DM Mono",monospace;font-size:11.5px}.obs-t th{color:var(--muted);font-weight:400;text-align:left;padding:3px 4px}.obs-t td{padding:3px 4px;border-top:1px solid var(--border)}.obs-t tr[onclick]{cursor:pointer}.obs-t tr.obs-survol td{background:rgba(255,213,79,.07)}.obs-mini-rech .obs-lege{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:1.6em}.obs-t tr.obs-sel td{background:rgba(200,168,75,.16)}'
    + '.obs-mono{font-family:"DM Mono",monospace}.obs-note{color:var(--muted);font-size:10.5px;margin:5px 0 2px;line-height:1.4}.obs-vide{color:var(--muted);padding:14px 4px;text-align:center}'
    + '.obs-chip{padding:1px 7px;border-radius:9px;font-size:10.5px;font-family:"DM Sans",sans-serif;white-space:nowrap}.obs-ok{background:rgba(102,187,106,.2);color:#81c784}.obs-alt{background:rgba(255,183,77,.18);color:#ffb74d}.obs-no{background:rgba(239,83,80,.15);color:#ef9a9a}'
    + '.obs-plateau{width:min(300px,86%);display:block;margin:6px auto}.obs-lege{text-align:center;font-size:10.5px;color:var(--muted)}.obs-courbe{width:100%;height:56px;display:block}'
    + '.obs-profs{display:flex;flex-wrap:wrap;gap:4px}.obs-pf{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:2px 7px;font-family:"DM Mono",monospace;font-size:11px}.obs-pf em{color:var(--gold);font-style:normal}.obs-pf small{color:var(--muted)}.obs-pf.obs-chg{border-color:#ffb74d}'
    + '.obs-arbre{border-left:2px solid var(--gold-dim);margin-left:4px;padding-left:8px}.obs-racine{margin-bottom:4px}.obs-branche{margin:4px 0;padding:4px 6px;border-radius:6px;background:var(--surface2);cursor:pointer;border-left:3px solid #9e9e9e}.obs-b-ok{border-left-color:#66bb6a}.obs-b-alt{border-left-color:#ffb74d}'
    + '.obs-suite{margin-top:3px;color:var(--muted);font-size:11px;display:flex;flex-wrap:wrap;gap:6px;font-family:"DM Mono",monospace}.obs-etapes{display:flex;justify-content:center;align-items:center;gap:8px}'
    + '.obs-decide{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.obs-carte{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 8px;margin:6px 0}.obs-decide .obs-carte{margin:0;display:flex;flex-direction:column}'
    + '.obs-carte span{font-size:10px;color:var(--muted)}.obs-carte b{font-size:15px}.obs-carte em{font-style:normal;color:var(--muted)}.obs-c-ok{border-color:#66bb6a}.obs-c-alt{border-color:#ffb74d}'
    + '.obs-vs{margin:8px 0;padding:6px 8px;background:var(--surface2);border-radius:8px}.obs-plus{color:#81c784}.obs-moins{color:#ef9a9a}'
    + '.obs-bipol{position:relative;height:8px;min-width:80px;background:var(--surface2);border-radius:4px}.obs-bipol i{position:absolute;top:0;bottom:0;border-radius:4px}.obs-pos{background:#66bb6a}.obs-neg{background:#ef5350}'
    + '#obs-panneau.obs-reduit{top:64px;bottom:auto;height:auto;width:min(470px,calc(100vw - 16px))}#obs-panneau.obs-reduit .obs-entete{border-bottom:none;flex-wrap:nowrap}#obs-panneau.obs-reduit .obs-entete b{margin-right:0}'
    + '.obs-hud{flex:1;min-width:0;font-family:"DM Mono",monospace;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer}'
    + '.obs-frise{display:flex;align-items:center;gap:4px;padding:5px 8px;border-top:1px solid var(--border);font-size:10.5px;color:var(--muted)}.obs-points{flex:1;display:flex;flex-wrap:wrap;gap:3px;align-items:center;min-width:0}'
    + '.obs-pt{width:11px;height:11px;border-radius:50%;border:2px solid transparent;background:#81c784;padding:0;cursor:pointer}.obs-pt-neg{background:#ef9a9a}.obs-pt-src{background:none;border-color:var(--muted)}.obs-pt-chute{border-color:#ffb74d}.obs-pt-sel{box-shadow:0 0 0 2px var(--gold)}'
    + '.obs-pt-live{background:var(--gold);animation:obs-pouls 1.1s ease-in-out infinite}@keyframes obs-pouls{50%{opacity:.35}}@media (prefers-reduced-motion:reduce){.obs-pt-live{animation:none}}'
    + '.obs-journal{font-family:"DM Mono",monospace;font-size:10.5px;line-height:1.55;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 8px;max-height:150px;overflow:auto}.obs-jt{color:var(--muted)}.obs-jd{color:var(--gold)}.obs-jc{color:#ffb74d}'
    + '.obs-rang{display:inline-block;min-width:17px;height:17px;line-height:17px;border-radius:5px;text-align:center;color:#111;font-weight:700;font-size:11px}.obs-c-gris{border-color:#9e9e9e}'
    + '.obs-pourquoi{border-left:3px solid var(--gold)}#obs-panneau .obs-pourquoi>b{font-size:13px;color:var(--gold)}#obs-panneau .obs-pourquoi li span{font-size:inherit}#obs-panneau .obs-pourquoi .obs-plus{color:#81c784}#obs-panneau .obs-pourquoi .obs-moins{color:#ef9a9a}.obs-pourquoi ul{margin:5px 0 2px 16px;padding:0}.obs-pourquoi li{margin:2px 0;line-height:1.4}'
    + '.obs-opts{display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:5px 8px;border-bottom:1px solid var(--border);font-size:10.5px;color:var(--muted)}'
    + '.obs-opt{background:none;border:1px solid var(--border);color:var(--muted);border-radius:10px;padding:2px 8px;cursor:pointer;font-size:10.5px}.obs-opt.obs-actif{border-color:var(--gold-dim);color:var(--gold);background:rgba(200,168,75,.1)}'
    + '.obs-btn.obs-vite{background:var(--gold);color:#0d0f0e;font-weight:700}.obs-sep{margin-left:6px}.obs-btn.obs-actif{background:rgba(200,168,75,.32)}'
    + '.obs-duo{display:grid;grid-template-columns:1fr 1fr;gap:6px}.obs-duo .obs-carte{margin:0;min-width:0;display:flex;flex-direction:column}.obs-duo .obs-plateau{width:100%;margin:4px 0}.obs-ici{color:var(--gold);font-weight:700}'
    + '#obs-panneau.obs-grand{left:8px;width:auto}.obs-dash{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:10px;align-items:start}'
    + '.obs-bloc{background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:8px 10px;min-width:0}.obs-bloc h4{margin:0 0 6px;font-family:"Playfair Display",serif;color:var(--gold);font-size:14px}'
    + '.obs-bloc .obs-k,.obs-bloc .obs-carte,.obs-bloc .obs-vs,.obs-bloc .obs-branche,.obs-bloc .obs-pf,.obs-bloc .obs-prog,.obs-bloc .obs-barre,.obs-bloc .obs-bipol{background:var(--surface)}'
    + '#obs-btn-jeu{width:100%;margin-bottom:8px}'
    // grand ecran seulement (en dessous, la mise en page de la partie ne se resserre pas : le panneau la recouvre comme avant) ; !important : la barre laterale du site ecrit padding-right:0 dans le style du body ; en hebreu (de droite a gauche) le panneau passe a gauche
    + '@media (min-width:1800px){body.obs-place{padding-right:416px!important}html[dir=rtl] body.obs-place{padding-left:416px!important}html[dir=rtl] #obs-panneau:not(.obs-grand){right:auto;left:8px}}'
    + '@media (max-width:900px){#obs-panneau{top:auto;left:8px;right:8px;width:auto;height:58vh;bottom:0;border-radius:14px 14px 0 0}#obs-panneau.obs-grand{top:56px;height:auto}#obs-panneau.obs-reduit{top:60px;bottom:auto;height:auto;border-radius:14px}body.obs-tiroir #ai-thinking{bottom:calc(58vh + 8px)!important}.obs-dash{grid-template-columns:1fr}}';
  document.head.appendChild(st);
}
function _obsOptionsHTML() {
  const ch = function (k, on, txt, tit) { return '<button class="obs-opt' + (on ? ' obs-actif' : '') + '" onclick="obsOption(\'' + k + '\')" title="' + tit + '">' + (on ? '✓ ' : '') + txt + '</button>'; };
  return '<div class="obs-opts"><span>' + _obsT('Détail :', 'Detail:') + '</span><span class="obs-niv">' + _OBS_NIVEAUX.map(function (n) { return '<button class="' + (OBS.niveau === n[0] ? 'obs-actif' : '') + '" onclick="obsNiveau(\'' + n[0] + '\')">' + _obsT(n[1], n[2]) + '</button>'; }).join('') + '</span>'
    + '<span class="obs-sep">' + _obsT('Afficher :', 'Show:') + '</span>'
    + ch('fleches', OBS.surVrai.fleches, _obsT('flèches', 'arrows'), _obsT('Sur le plateau, pendant le calcul : les 3 meilleurs coups du moment. Vert = meilleur, orange = 2e, gris = 3e : vert = meilleur, orange = 2e, gris = 3e', 'While searching: green = best, orange = 2nd, grey = 3rd'))
    + ch('menaces', OBS.surVrai.menaces, _obsT('menaces', 'threats'), _obsT('Sur le plateau. Rouge : au bord avec un allié ou moins. Orange : isolée. Les deux camps.', 'Red: on the edge with one ally or fewer. Orange: isolated. Both sides.'))
    + ch('bandeau', OBS.bandeau, _obsT('bandeau', 'banner'), _obsT('« L’IA réfléchit… » affiche profondeur, positions, temps et meilleur coup, même panneau fermé', '“AI is thinking…” shows depth, positions, time and best move, even with the panel closed'))
    + '</div>';
}
function _obsCorpsGrand(V) {   // plein ecran : tous les onglets a la fois, en tableau de bord
  const blocs = [['general', _obsTabGeneral], ['recherche', _obsTabRecherche], ['decision', _obsTabDecision], ['evaluation', _obsTabEvaluation], ['historique', _obsTabHistorique]];
  return '<div class="obs-dash">' + blocs.map(function (b) {
    const o = _OBS_ONGLETS.find(function (x) { return x[0] === b[0]; });
    let c = ''; try { c = b[1](V); } catch (e) { c = '<div class="obs-vide">' + _obsE(e && e.message) + '</div>'; }
    if (b[0] !== 'general' && b[0] !== 'historique' && (V.mode === 'vide' || V.mode === 'source')) c = '<div class="obs-vide">…</div>';   // pas cinq fois le meme message
    return '<section class="obs-bloc obs-bloc-' + b[0] + '"><h4>' + _obsT(o[1], o[2]) + '</h4>' + c + '</section>';
  }).join('') + '</div>';
}
/* Sur ordinateur, le panneau prend sa place a droite au lieu de couvrir le plateau */
function _obsPlace(on) {
  const b = document.body; if (!b || !b.classList || b.classList.contains('obs-place') === !!on) return;
  b.classList.toggle('obs-place', !!on);
  try { window.dispatchEvent(new Event('resize')); } catch (e) {}
}
function _obsRendu() {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById('obs-btn-jeu'); if (btn) btn.textContent = '🔭 ' + _obsT('Observatoire IA', 'AI Observatory') + (OBS.ouvert ? ' ✓' : '');
  let p = document.getElementById('obs-panneau');
  _obsPlace(OBS.ouvert && !OBS.grand && !OBS.reduit);
  // sur telephone, le bandeau « L'IA reflechit… » passe au-dessus du tiroir au lieu de le cacher
  if (document.body && document.body.classList) document.body.classList.toggle('obs-tiroir', !!(OBS.ouvert && !OBS.grand && !OBS.reduit));
  if (!OBS.ouvert) { if (p) p.className = ''; return; }
  _obsCss();
  if (!p) {
    p = document.createElement('aside'); p.id = 'obs-panneau'; document.body.appendChild(p);
    // apercu au survol : souris seulement (au doigt, toucher un coup le choisit, comme avant)
    if (_obsSurvolPossible() && p.addEventListener) {
      p.addEventListener('mouseover', function (ev) { const t = ev.target && ev.target.closest ? ev.target.closest('[data-apercu]') : null; obsSurvol(t ? t.getAttribute('data-apercu') : null); });
      p.addEventListener('mouseleave', function () { obsSurvol(null); });
    }
  }
  p.className = 'obs-on' + (OBS.grand ? ' obs-grand' : '') + (OBS.reduit ? ' obs-reduit' : '');
  const corps0 = document.getElementById('obs-corps'), haut = corps0 ? corps0.scrollTop : 0;
  const V = _obsVue();
  let etat = '';
  if (V.mode === 'direct') etat = '<span class="obs-chip obs-alt">⏳ ' + _obsT('calcul', 'searching') + '</span>';
  else if (V.mode === 'revue') etat = '<span class="obs-chip obs-alt" title="' + _obsT('Revue d’un coup passé', 'Reviewing a past move') + '">⏪ ' + _obsT('coup ', 'move ') + V.e.n + '</span>';
  else if (V.mode === 'fini') etat = '<span class="obs-chip obs-ok">✓ ' + _obsT('terminé', 'done') + '</span>';
  else if (V.mode === 'source') etat = '<span class="obs-chip obs-ok">📖 ' + _obsT('sans calcul', 'no search') + '</span>';
  if (OBS.reduit) {   // une ligne : titre, mesures, rouvrir, fermer
    p.innerHTML = '<div class="obs-entete"><b>🔭</b><span class="obs-hud" onclick="obsReduire()" title="' + _obsT('Rouvrir le panneau', 'Open the panel again') + '">' + _obsLigneHUD(V) + '</span>'
      + '<button class="obs-ic" onclick="obsReduire()" title="' + _obsT('Rouvrir le panneau', 'Open the panel again') + '">▢</button><button class="obs-ic" onclick="obsBasculer()" title="' + _obsT('Fermer', 'Close') + '">✕</button></div>';
    return;
  }
  const onglet = OBS.onglet;
  let corps = '';
  try {
    corps = OBS.grand ? _obsCorpsGrand(V)
      : onglet === 'general' ? _obsTabGeneral(V) : onglet === 'recherche' ? _obsTabRecherche(V) : onglet === 'evaluation' ? _obsTabEvaluation(V) : onglet === 'decision' ? _obsTabDecision(V) : _obsTabHistorique();
  } catch (e) { corps = '<div class="obs-vide">' + _obsT('Erreur d’affichage : ', 'Display error: ') + _obsE(e && e.message) + '</div>'; }
  p.innerHTML = '<div class="obs-entete"><b>🔭 ' + _obsT('Observatoire IA', 'AI Observatory') + '</b>' + etat
    + '<button class="obs-ic" onclick="obsFiger()" title="' + _obsT('Figer l’affichage pendant le calcul', 'Freeze the display while searching') + '">' + (OBS.fige ? '▶' : '⏸') + '</button>'
    + '<button class="obs-ic" onclick="obsExporter(\'txt\')" title="' + _obsT('Télécharger le rapport de la partie (.txt)', 'Download the game report (.txt)') + '">⬇</button>'
    + '<button class="obs-ic" onclick="obsReduire()" title="' + _obsT('Réduire à une ligne (libère le plateau)', 'Shrink to one line (frees the board)') + '">—</button>'
    + '<button class="obs-ic" onclick="obsGrand()" title="' + (OBS.grand ? _obsT('Revenir au panneau', 'Back to the panel') : _obsT('Plein écran : tous les onglets à la fois', 'Full screen: all tabs at once')) + '">' + (OBS.grand ? '⤡' : '⤢') + '</button>'
    + '<button class="obs-ic" onclick="obsBasculer()" title="' + _obsT('Fermer', 'Close') + '">✕</button></div>'
    + (OBS.grand ? '' : '<div class="obs-onglets" role="tablist">' + _OBS_ONGLETS.map(function (o) { return '<button class="' + (onglet === o[0] ? 'obs-actif' : '') + '" onclick="obsOnglet(\'' + o[0] + '\')">' + _obsT(o[1], o[2]) + '</button>'; }).join('') + '</div>')
    + _obsOptionsHTML()
    + '<div id="obs-corps">' + corps + '</div>' + _obsFrise(V);
  const c = document.getElementById('obs-corps'); if (c) c.scrollTop = haut;
}

/* ═══ Le plateau de la partie : 3 meilleurs coups en direct, coup choisi, billes menacees ═══
   Seulement panneau ouvert, en partie contre l'IA, et sur le plateau principal (pas sur les
   autres canevas que drawBoard sait dessiner). */
function _obsFlecheCanvas(ctx, cells, dir, col, w, bague) {
  const xy = _obsFlecheXY(cells, dir);
  if (bague) cells.forEach(function (cel) { const p = hexCoord(cel.r, cel.c); ctx.beginPath(); ctx.arc(p.x, p.y, HEX_RADIUS - 4, 0, Math.PI * 2); ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke(); });
  ctx.beginPath(); ctx.moveTo(xy.a.x, xy.a.y); ctx.lineTo(xy.b.x, xy.b.y); ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.stroke();
  const ang = Math.atan2(xy.b.y - xy.a.y, xy.b.x - xy.a.x), t = 8 + w * 1.4;
  ctx.beginPath(); ctx.moveTo(xy.b.x, xy.b.y); ctx.lineTo(xy.b.x - t * Math.cos(ang - Math.PI / 6), xy.b.y - t * Math.sin(ang - Math.PI / 6)); ctx.lineTo(xy.b.x - t * Math.cos(ang + Math.PI / 6), xy.b.y - t * Math.sin(ang + Math.PI / 6));
  ctx.closePath(); ctx.fillStyle = col; ctx.fill();
}
function _obsPastilleCanvas(ctx, q, col, num) {
  ctx.beginPath(); ctx.arc(q.x, q.y, 13, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#111'; ctx.stroke();
  ctx.fillStyle = '#111'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(num), q.x, q.y + 1);
}
function _obsDessinerSurPlateau(opts) {
  if (!OBS.ouvert || (opts && opts.canvasId && opts.canvasId !== 'board')) return;
  if (typeof GameMode !== 'undefined' && GameMode.get && GameMode.get() !== 'ai') return;
  const canvas = document.getElementById('board'); if (!canvas || !canvas.getContext) return;
  const bd = (opts && opts.board) || board, L = OBS.live;
  const fleches = [];
  if (OBS.surVrai.fleches && L && L.etat === 'calcul' && L.top && !(opts && opts.board)) {
    const ep = [6, 4.5, 3.5];
    L.top.slice().reverse().forEach(function (k) { const i = L.top.indexOf(k), x = _obsLireCle(k); if (x && k !== (OBS.sel || '')) fleches.push([x.cells, x.dir, _OBS_COULEURS[i], ep[i], i === 0, i + 1]); });
  }
  if (OBS.surPlateau) fleches.push([OBS.surPlateau.cells, OBS.surPlateau.dir, '#ffd54f', 5, true]);
  const st = OBS.surVrai.menaces ? _obsStatutBilles(bd) : {};
  const anneaux = Object.keys(st).filter(function (k) { return st[k] === 'danger' || st[k] === 'isolee'; });
  if (!fleches.length && !anneaux.length) return;
  const ctx = canvas.getContext('2d'), scale = canvas.width / 640;
  ctx.save(); ctx.scale(scale, scale);
  anneaux.forEach(function (k) { const q = k.split(',').map(Number), p = hexCoord(q[0], q[1]);
    ctx.beginPath(); ctx.arc(p.x, p.y, HEX_RADIUS - 1, 0, Math.PI * 2); ctx.setLineDash(st[k] === 'danger' ? [6, 4] : [2, 4]);
    ctx.strokeStyle = st[k] === 'danger' ? '#ef5350' : '#ffb74d'; ctx.lineWidth = st[k] === 'danger' ? 3.5 : 2.5; ctx.stroke(); });
  ctx.setLineDash([]);
  fleches.forEach(function (f) { _obsFlecheCanvas(ctx, f[0], f[1], f[2], f[3], f[4]); });
  const pris = {};
  fleches.filter(function (f) { return f[5]; }).sort(function (x, y) { return x[5] - y[5]; }).forEach(function (f) { _obsPastilleCanvas(ctx, _obsPastille(_obsFlecheXY(f[0], f[1]), pris), f[2], f[5]); });
  ctx.restore();
}
(function () {
  if (typeof drawBoard !== 'function') return;
  const o = drawBoard;
  drawBoard = function (opts) { const r = o.apply(this, arguments); try { _obsDessinerSurPlateau(opts); } catch (e) {} return r; };
})();
if (typeof document !== 'undefined' && typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('load', function () { try { _obsRendu(); } catch (e) {} });
}
</script>
