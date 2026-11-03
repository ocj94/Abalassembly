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
═══════════════════════════════════════════ */
const OBS = { ouvert: false, niveau: 'analyste', onglet: 'general', fige: false, live: null, hist: [], rev: -1,
              sel: null, etape: -1, tout: false, surPlateau: null, minuteur: null, relance: null };
try {
  OBS.ouvert = localStorage.getItem('abaObs') === '1';
  const _n = localStorage.getItem('abaObsNiveau'); if (_n === 'spectateur' || _n === 'analyste' || _n === 'developpeur') OBS.niveau = _n;
} catch (e) {}
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
  if (!OBS.ouvert) return;
  OBS.surPlateau = null; OBS.rev = -1; OBS.sel = null; OBS.etape = -1; OBS.tout = false;
  OBS.live = { etat: 'calcul', couleur: couleur, budget: config ? config.time : 0, t0: Date.now(), fils: {}, nFils: 1, parProf: {}, serie: [],
               racine: JSON.parse(JSON.stringify(board)), coups: _obsCoupsRacine(couleur), cle: null, source: null };
  _obsPlanifier();
}
function obsProgres(m, nFils) {
  const L = OBS.live; if (!L || L.etat !== 'calcul') return;
  L.nFils = nFils || 1; L.fils[m.w] = m;
  if (m.fin) { (L.parProf[m.d] = L.parProf[m.d] || {})[m.w] = m.roots; }
  const tot = Object.keys(L.fils).reduce(function (a, k) { return a + L.fils[k].nodes; }, 0);
  L.serie.push({ t: Date.now() - L.t0, n: tot }); if (L.serie.length > 400) L.serie.splice(1, 1);
  _obsPlanifier();
}
function obsFin(m, couleur, config, chosen) {
  const L = OBS.live;
  if (!OBS.ouvert || !L || L.etat !== 'calcul' || !m) return;
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
  const e = { n: (typeof MoveCount !== 'undefined' ? MoveCount.get() : 0) + 1, couleur: couleur, cle: cle, det: det, tous: tous, profTous: profTous, noms: noms,
              racine: L.racine, prof: m.depth || 0, score: m.bestScore, ms: m.time || 0, budget: config ? config.time : 0,
              noeuds: fils.reduce(function (a, f) { return a + (f.nodes || 0); }, 0), coupures: fils.reduce(function (a, f) { return a + (f.cuts || 0); }, 0),
              tt: Math.round(fils.reduce(function (a, f) { return a + (f.ttHit || 0); }, 0) / fils.length), nFils: fils.length,
              parFil: fils.map(function (f) { return { nodes: f.nodes, cuts: f.cuts, tt: f.ttHit, depth: f.depth }; }),
              serie: L.serie.slice(), profs: _obsProfs(fils), source: null };
  OBS.hist.push(e); if (OBS.hist.length > 60) OBS.hist.shift();
  L.etat = 'fini'; L.cle = cle; L.entree = e;
  if (OBS.surPlateau) { OBS.surPlateau = null; if (typeof drawBoard === 'function') drawBoard(); }
  _obsPlanifier(true);
}
/* coup joue sans recherche (livre, table de finale, empreinte, niveau 1) */
function obsSource(src, couleur) {
  if (!OBS.ouvert) return;
  OBS.rev = -1; OBS.surPlateau = null;
  OBS.live = { etat: 'source', source: src, couleur: couleur, t0: Date.now(), fils: {}, parProf: {}, serie: [], coups: new Map(), nFils: 1 };
  OBS.hist.push({ n: (typeof MoveCount !== 'undefined' ? MoveCount.get() : 0) + 1, couleur: couleur, source: src }); if (OBS.hist.length > 60) OBS.hist.shift();
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
function _obsFlecheXY(cells, dir) {
  const ax = cells.map(function (s) { return rcToAxial(s.r, s.c); });
  const tri = ax.slice().sort(function (a, b) { return (a.q * dir.q + a.r * dir.r) - (b.q * dir.q + b.r * dir.r); });
  const tete = tri[tri.length - 1], hr = axialToRc(tete.q, tete.r), hp = hexCoord(hr.r, hr.c);
  const dr = axialToRc(tete.q + dir.q, tete.r + dir.r), dp = dr ? hexCoord(dr.r, dr.c) : { x: hp.x + dir.q * 40, y: hp.y };
  return { a: hp, b: dp };
}
function _obsStatutBilles(bd) {   // memes definitions que l'evaluation : danger = au bord avec 1 allie ou moins
  const o = {};
  for (const k in bd) { const v = bd[k]; if (!v) continue; const p = k.split(',').map(Number), ax = rcToAxial(p[0], p[1]);
    let al = 0; for (const d of AX_DIRS) { const n = axialToRc(ax.q + d.q, ax.r + d.r); if (n && bd[n.r + ',' + n.c] === v) al++; }
    const bord = axHexDist(ax, EVAL_CENTER) >= 4;
    o[k] = (bord && al <= 1) ? 'danger' : al === 0 ? 'isolee' : al >= 4 ? 'forte' : ''; }
  return o;
}
/* Mini plateau : billes, coups en fleches (liste {cells,dir,col}), cases marquees, carte des billes */
function _obsPlateauSVG(bd, fleches, marques, carte) {
  const st = carte ? _obsStatutBilles(bd) : {};
  let s = '<svg viewBox="0 0 640 640" class="obs-plateau"><defs><marker id="obs-pt" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>';
  for (let r = 0; r < 9; r++) for (let c = 0; c < ROWS[r]; c++) {
    const p = hexCoord(r, c), k = r + ',' + c, v = bd[k], z = st[k];
    const bague = z === 'danger' ? '#ef5350' : z === 'isolee' ? '#ffb74d' : z === 'forte' ? '#66bb6a' : null;
    s += '<circle cx="' + p.x + '" cy="' + p.y + '" r="26" fill="' + (v === 'black' ? '#0c0c0c' : v === 'white' ? '#ece6d6' : 'rgba(255,255,255,.035)') + '" stroke="'
      + (bague || (marques && marques[k] ? '#c8a84b' : v === 'black' ? '#8d8d8d' : v === 'white' ? '#ffffff' : 'rgba(255,255,255,.12)')) + '" stroke-width="' + (bague || (marques && marques[k]) ? 5 : v ? 3 : 1.5) + '"/>';
    if (marques && marques[k]) s += '<text x="' + p.x + '" y="' + (p.y + 9) + '" text-anchor="middle" font-size="26" font-weight="700" fill="' + (v === 'white' ? '#1b1b1b' : '#c8a84b') + '">' + marques[k] + '</text>';
  }
  (fleches || []).forEach(function (f) { const xy = _obsFlecheXY(f.cells, f.dir);
    s += '<line x1="' + xy.a.x + '" y1="' + xy.a.y + '" x2="' + xy.b.x + '" y2="' + xy.b.y + '" stroke="' + f.col + '" stroke-width="' + (f.epais || 9) + '" stroke-linecap="round" marker-end="url(#obs-pt)" opacity=".92"/>'; });
  return s + '</svg>';
}
function _obsFlechesDe(cles, cols, epais) {
  const out = [];
  cles.forEach(function (k, i) { const x = _obsLireCle(k); if (x) out.push({ cells: x.cells, dir: x.dir, col: cols[i] || '#888', epais: epais ? epais[i] : 9 }); });
  return out;
}

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
    h += '<tr class="' + (OBS.sel === x[0] ? 'obs-sel' : '') + '" onclick="obsChoisir(\'' + x[0] + '\')"><td>' + (i + 1) + '</td><td class="obs-mono">' + _obsE(nomDe(x[0])) + (x[3] ? ' <span title="' + _obsT('L’adversaire a une éjection dès le coup suivant (compté à 1 coup)', 'Opponent can eject right after this move (counted 1 ply deep)') + '">⚠</span>' : '') + '</td><td>'
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
  if (budget && !illim) h += '<div class="obs-prog" title="' + _obsT('Temps utilisé sur le temps accordé', 'Time used out of the allowed time') + '"><i style="width:' + Math.min(100, Math.round(100 * ms / budget)) + '%"></i></div>'
    + '<div class="obs-note">' + _obsT('Temps accordé : ', 'Time allowed: ') + _msTexte(budget) + '</div>';
  if (meilleurs.length) {
    h += '<h5>' + _obsT('Meilleur coup, profondeur après profondeur', 'Best move, depth after depth') + '</h5><div class="obs-profs">';
    meilleurs.forEach(function (x, i) { const nom = x.n || _obsNom(V.L, x.k), chg = i && meilleurs[i - 1] && (x.n || x.k) !== (meilleurs[i - 1].n || meilleurs[i - 1].k);
      h += '<span class="obs-pf' + (chg ? ' obs-chg' : '') + '" title="' + (chg ? _obsT('Le meilleur coup a changé', 'Best move changed') : '') + '"><em>' + x.d + '</em> ' + _obsE(nom) + ' <small>' + _evalReflexionTexte(x.s) + '</small></span>'; });
    h += '</div>';
  }
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
    const L = V.L, a = _obsAgreg(L);
    let d = a.dFin, tous = d ? _obsFusion(L, d) : null;
    if (!tous) { d = 0; tous = []; Object.keys(L.fils).forEach(function (w) { tous = tous.concat(L.fils[w].roots || []); }); tous.sort(function (x, y) { return y[1] - x[1]; }); d = a.d; }
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
  h += '<div class="obs-ligne">' + _obsPlateauSVG(R.racine, _obsFlechesDe(sel ? [sel].concat(top.filter(function (k) { return k !== sel; })) : top, sel ? ['#ffd54f', '#66bb6a', '#ffb74d'] : ['#66bb6a', '#ffb74d', '#9e9e9e'], sel ? [11, 6, 6] : [10, 7, 5]), null, false)
    + '<div class="obs-lege"><span style="color:#66bb6a">●</span> ' + _obsT('meilleur', 'best') + ' <span style="color:#ffb74d">●</span> ' + _obsT('2e', '2nd') + ' <span style="color:#9e9e9e">●</span> ' + _obsT('3e', '3rd') + (sel ? ' <span style="color:#ffd54f">●</span> ' + _obsT('choisi', 'selected') : '') + '</div></div>';
  h += _obsLignesCandidats(R.tous, R.nomDe, R.cleRetenue, R.dernier);
  if (V.mode === 'direct' && OBS.sel) h += '<div class="obs-note">' + _obsT('Le coup choisi est tracé sur le plateau.', 'The selected move is drawn on the board.') + '</div>';
  if (V.e) h += _obsNotePartielle(V.e);
  if (sel && R.det) h += _obsVarianteHTML(R.det, sel, R.couleur);
  if (niv >= 1 && R.det) {   // arbre des lignes principales
    const pr = R.det.prof[0], maxk = Math.max.apply(null, pr.lignes.map(function (l) { return l.k; }).concat([1]));
    h += '<h5>' + _obsT('Arbre des lignes principales', 'Tree of principal lines') + '</h5><div class="obs-arbre"><div class="obs-racine">● ' + _obsT('Position actuelle', 'Current position') + ' <small>(' + _obsN(pr.noeuds) + ' ' + _obsT('positions', 'positions') + ')</small></div>';
    pr.lignes.slice(0, niv >= 2 ? 10 : 5).forEach(function (l, i) { const cle = moveKeyDe(l), ret = cle === R.cleRetenue || (!R.cleRetenue && i === 0), ecart = pr.lignes[0].s - l.s;
      h += '<div class="obs-branche ' + (ret ? 'obs-b-ok' : ecart <= 30 ? 'obs-b-alt' : 'obs-b-no') + '" onclick="obsChoisir(\'' + cle + '\')"><span class="obs-mono">' + _obsE(l.n || '?') + '</span> <b>' + _evalReflexionTexte(l.s) + '</b>'
        + '<div class="obs-barre"><i style="width:' + Math.max(2, Math.round(100 * l.k / maxk)) + '%"></i></div>'
        + (l.suite && l.suite.length ? '<div class="obs-suite">↳ ' + l.suite.map(function (x, j) { return '<span>' + (j + 2) + '. ' + _obsE(x) + '</span>'; }).join(' ') + '</div>' : '') + '</div>'; });
    h += '</div><div class="obs-note">' + _obsT('Seuls les 10 meilleurs coups de départ gardent leur suite : l’arbre entier compte des milliers de positions et n’est pas conservé. Largeur = effort de recherche sous le coup.',
      'Only the 10 best first moves keep their line: the full tree has thousands of positions and is not stored. Width = search effort under the move.') + '</div>';
  }
  return h;
}
/* Profondeur coupee par le minuteur : le coup retenu peut venir d'elle, les tableaux montrent la derniere profondeur terminee */
function _obsNotePartielle(e) {
  if (!e || !e.profTous || !e.prof || e.profTous >= e.prof) return '';
  return '<div class="obs-note">⏱ ' + _obsT('La profondeur ' + e.prof + ' n’a pas été terminée (le temps accordé est écoulé) : les notes et comparaisons ci-dessus sont celles de la profondeur ' + e.profTous + ' terminée. Le coup retenu a la note ' + _evalReflexionTexte(e.score) + ' sur la partie explorée de la profondeur ' + e.prof + '.',
    'Depth ' + e.prof + ' was not finished (the allowed time ran out): the scores and comparisons above are those of completed depth ' + e.profTous + '. The chosen move scores ' + _evalReflexionTexte(e.score) + ' on the explored part of depth ' + e.prof + '.') + '</div>';
}
function _obsVarianteHTML(det, cle, couleur) {
  const f = _obsLigneDet(det, cle); if (!f) return '<div class="obs-note">' + _obsT('Ce coup n’est pas parmi les 10 dont la suite est gardée.', 'This move is not among the 10 with a stored line.') + '</div>';
  _notationsReflexion(det);
  const et = f.l.etapes || [], n = et.length, k = (OBS.etape >= 0 && OBS.etape < n) ? OBS.etape : n - 1;
  const num = {}; et.slice(1, k + 1).forEach(function (x, j) { x.cells.forEach(function (cel) { const a = rcToAxial(cel.r, cel.c), rc = axialToRc(a.q + x.dir.q, a.r + x.dir.r); if (rc) num[rc.r + ',' + rc.c] = j + 1; }); });
  return '<h5>' + _obsT('Variante de ', 'Line of ') + _obsE(f.l.n) + ' <small>(' + _evalReflexionTexte(f.l.s) + ')</small></h5>' + _obsPlateauSVG(et[k] ? et[k].board : det.racine.board, null, num, false)
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
  alts.slice(0, 2).forEach(function (a, i) { h += '<div class="obs-carte obs-c-alt"><span>' + _obsT('Alternative ', 'Alternative ') + (i + 1) + '</span><b class="obs-mono">' + _obsE(a.n || '?') + '</b><em>' + _evalReflexionTexte(a.s) + '</em></div>'; });
  h += '</div>';
  h += _obsPlateauSVG(e.det.racine.board, _obsFlechesDe([moveKeyDe(ret)].concat(alts.slice(0, 2).map(moveKeyDe)), ['#66bb6a', '#ffb74d', '#9e9e9e'], [11, 7, 7]), null, false);
  h += '<h5>' + _obsT('Pourquoi ' + (ret.n || 'ce coup') + ' plutôt qu’un autre ?', 'Why ' + (ret.n || 'this move') + ' rather than another?') + '</h5>';
  alts.forEach(function (a) {
    const ecart = ret.s - a.s;
    const diffs = (ret.terms && a.terms) ? CR.map(function (k) { return [k[1], (ret.terms[k[0]] || 0) - (a.terms[k[0]] || 0)]; }).filter(function (x) { return Math.abs(x[1]) >= 0.5; }).sort(function (x, y) { return Math.abs(y[1]) - Math.abs(x[1]); }).slice(0, 4) : [];
    h += '<div class="obs-vs"><b class="obs-mono">' + _obsE(ret.n) + '</b> ' + _obsT('contre', 'vs') + ' <b class="obs-mono">' + _obsE(a.n) + '</b> : ' + (ecart > 0 ? _obsT('meilleur de ', 'better by ') + _obsN(ecart) + ' ' + _obsT('points', 'points') : _obsT('à égalité (départagé par l’ordre de recherche)', 'tied (settled by search order)'));
    if (diffs.length) h += '<div class="obs-suite">' + diffs.map(function (x) { return '<span class="' + (x[1] > 0 ? 'obs-plus' : 'obs-moins') + '">' + _obsE(x[0]) + ' ' + (x[1] > 0 ? '+' : '') + String(Math.round(x[1] * 10) / 10).replace('.', ',') + '</span>'; }).join(' ') + '</div>';
    h += '<button class="obs-lien" onclick="obsChoisir(\'' + moveKeyDe(a) + '\');obsOnglet(\'recherche\')">' + _obsT('Et si l’IA avait joué ', 'What if the AI had played ') + _obsE(a.n) + ' ? →</button></div>';
  });
  if (!horsListe) h += _obsNotePartielle(e);
  if (horsListe) h += '<div class="obs-note">' + _obsT('Le coup retenu a été trouvé à la profondeur ' + e.prof + ', que le temps n’a pas laissé finir : il n’a pas de suite détaillée, et ses alternatives sont celles de la profondeur ' + (e.profTous || '') + ' terminée.',
    'The chosen move was found at depth ' + e.prof + ', which time did not let finish: it has no detailed line, and its alternatives come from the completed depth ' + (e.profTous || '') + '.') + '</div>';
  h += '<div class="obs-note">' + _obsT('Reconstitué après le calcul : les écarts de critères comparent le bout de la suite prévue de chaque coup (données du moteur). La note, elle, vient de la recherche complète, quiescence comprise : les deux peuvent différer un peu.',
    'Rebuilt after the search: criterion gaps compare the end of each move’s expected line (engine data). The score itself comes from the full search, quiescence included, so the two can differ slightly.') + '</div>';
  return h;
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
    h += '<div class="obs-carte"><b>' + _obsT('Coup ', 'Move ') + e.n + _obsT(' en revue', ' under review') + '</b> — ' + _obsT('les autres onglets montrent ce coup. ', 'the other tabs show this move. ')
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
function obsBasculer() {
  OBS.ouvert = !OBS.ouvert; try { localStorage.setItem('abaObs', OBS.ouvert ? '1' : '0'); } catch (e) {}
  if (!OBS.ouvert && OBS.surPlateau) { OBS.surPlateau = null; if (typeof drawBoard === 'function') drawBoard(); }
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
    + '.obs-btn,.obs-lien,#obs-panneau .obs-entete .obs-ic{background:rgba(200,168,75,.1);border:1px solid var(--gold-dim);color:var(--gold);border-radius:10px;padding:3px 9px;cursor:pointer;font-size:11px}.obs-lien{background:none;border:none;padding:2px 4px;text-decoration:underline}'
    + '.obs-btn:disabled{opacity:.5;cursor:default}'
    + '.obs-grille{display:grid;grid-template-columns:1fr 1fr;gap:6px}.obs-g3{grid-template-columns:repeat(3,1fr);margin-top:6px}.obs-k{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:6px 8px;display:flex;flex-direction:column}'
    + '.obs-k span,.obs-k small{color:var(--muted);font-size:10.5px}.obs-k b{font-size:17px;color:var(--white);font-family:"DM Mono",monospace}'
    + '.obs-prog,.obs-barre{height:7px;background:var(--surface2);border-radius:4px;overflow:hidden;margin:6px 0 2px}.obs-barre{margin:0;min-width:46px}.obs-prog i,.obs-barre i{display:block;height:100%;background:var(--gold)}'
    + '.obs-t{width:100%;border-collapse:collapse;font-family:"DM Mono",monospace;font-size:11.5px}.obs-t th{color:var(--muted);font-weight:400;text-align:left;padding:3px 4px}.obs-t td{padding:3px 4px;border-top:1px solid var(--border)}.obs-t tr[onclick]{cursor:pointer}.obs-t tr.obs-sel td{background:rgba(200,168,75,.16)}'
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
    + '#obs-btn-jeu{width:100%;margin-bottom:8px}'
    + '@media (max-width:900px){#obs-panneau{top:auto;left:8px;right:8px;width:auto;height:58vh;bottom:0;border-radius:14px 14px 0 0}}';
  document.head.appendChild(st);
}
function _obsRendu() {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById('obs-btn-jeu'); if (btn) btn.textContent = '🔭 ' + _obsT('Observatoire IA', 'AI Observatory') + (OBS.ouvert ? ' ✓' : '');
  let p = document.getElementById('obs-panneau');
  if (!OBS.ouvert) { if (p) p.className = ''; return; }
  _obsCss();
  if (!p) { p = document.createElement('aside'); p.id = 'obs-panneau'; document.body.appendChild(p); }
  p.className = 'obs-on';
  const corps0 = document.getElementById('obs-corps'), haut = corps0 ? corps0.scrollTop : 0;
  const V = _obsVue();
  let etat = '';
  if (V.mode === 'direct') etat = '<span class="obs-chip obs-alt">⏳ ' + _obsT('calcul en cours', 'searching') + '</span>';
  else if (V.mode === 'revue') etat = '<span class="obs-chip obs-alt">⏪ ' + _obsT('revue coup ', 'reviewing move ') + V.e.n + '</span>';
  else if (V.mode === 'fini') etat = '<span class="obs-chip obs-ok">✓ ' + _obsT('terminé', 'done') + '</span>';
  else if (V.mode === 'source') etat = '<span class="obs-chip obs-ok">📖 ' + _obsT('sans calcul', 'no search') + '</span>';
  const onglet = OBS.onglet;
  let corps = '';
  try { corps = onglet === 'general' ? _obsTabGeneral(V) : onglet === 'recherche' ? _obsTabRecherche(V) : onglet === 'evaluation' ? _obsTabEvaluation(V) : onglet === 'decision' ? _obsTabDecision(V) : _obsTabHistorique(); }
  catch (e) { corps = '<div class="obs-vide">' + _obsT('Erreur d’affichage : ', 'Display error: ') + _obsE(e && e.message) + '</div>'; }
  p.innerHTML = '<div class="obs-entete"><b>🔭 ' + _obsT('Observatoire IA', 'AI Observatory') + '</b>' + etat
    + '<span class="obs-niv">' + _OBS_NIVEAUX.map(function (n) { return '<button class="' + (OBS.niveau === n[0] ? 'obs-actif' : '') + '" onclick="obsNiveau(\'' + n[0] + '\')">' + _obsT(n[1], n[2]) + '</button>'; }).join('') + '</span>'
    + '<button class="obs-ic" onclick="obsFiger()" title="' + _obsT('Figer l’affichage pendant le calcul', 'Freeze the display while searching') + '">' + (OBS.fige ? '▶' : '⏸') + '</button>'
    + '<button class="obs-ic" onclick="obsBasculer()" title="' + _obsT('Fermer', 'Close') + '">✕</button></div>'
    + '<div class="obs-onglets" role="tablist">' + _OBS_ONGLETS.map(function (o) { return '<button class="' + (onglet === o[0] ? 'obs-actif' : '') + '" onclick="obsOnglet(\'' + o[0] + '\')">' + _obsT(o[1], o[2]) + '</button>'; }).join('') + '</div>'
    + '<div id="obs-corps">' + corps + '</div>';
  const c = document.getElementById('obs-corps'); if (c) c.scrollTop = haut;
}

/* ═══ Le coup choisi, trace sur le plateau de la partie pendant le calcul ═══ */
function _obsDessinerSurPlateau() {
  const S = OBS.surPlateau, canvas = document.getElementById('board'); if (!S || !canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d'), scale = canvas.width / 640, xy = _obsFlecheXY(S.cells, S.dir);
  ctx.save(); ctx.scale(scale, scale);
  S.cells.forEach(function (cel) { const p = hexCoord(cel.r, cel.c); ctx.beginPath(); ctx.arc(p.x, p.y, HEX_RADIUS - 4, 0, Math.PI * 2); ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 3; ctx.stroke(); });
  ctx.beginPath(); ctx.moveTo(xy.a.x, xy.a.y); ctx.lineTo(xy.b.x, xy.b.y); ctx.strokeStyle = '#ffd54f'; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
  const ang = Math.atan2(xy.b.y - xy.a.y, xy.b.x - xy.a.x);
  ctx.beginPath(); ctx.moveTo(xy.b.x, xy.b.y); ctx.lineTo(xy.b.x - 13 * Math.cos(ang - Math.PI / 6), xy.b.y - 13 * Math.sin(ang - Math.PI / 6)); ctx.lineTo(xy.b.x - 13 * Math.cos(ang + Math.PI / 6), xy.b.y - 13 * Math.sin(ang + Math.PI / 6));
  ctx.closePath(); ctx.fillStyle = '#ffd54f'; ctx.fill(); ctx.restore();
}
(function () {
  if (typeof drawBoard !== 'function') return;
  const o = drawBoard;
  drawBoard = function () { const r = o.apply(this, arguments); try { if (OBS.surPlateau) _obsDessinerSurPlateau(); } catch (e) {} return r; };
})();
if (typeof document !== 'undefined' && typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('load', function () { try { _obsRendu(); } catch (e) {} });
}
</script>
