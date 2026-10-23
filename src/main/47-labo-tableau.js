/* ═══════════════════════════════════════════
   LABO : LE TABLEAU DE BORD (v2.71)
   Demande d'Olivier : « plus de parametres, de graphiques, de metriques ».
   Les totaux du Labo (parties, temps de calcul, tests tranches, gain mesure),
   les poids du champion au fil des adoptions, et les graphiques du journal
   des parties (les 2 000 dernieres) : parties par jour, longueur, fins,
   couleur, depart. Filtres en tete : periode et phase.
═══════════════════════════════════════════ */
const LAB_TB_PHASES = { tout: 'toutes', cand: 'tri des mutants', confirm: 'confirmation', bilan: 'bilan', spsa: 'SPSA' };
const LAB_TB_PERIODES = { 7: '7 jours', 30: '30 jours', 0: 'tout' };
const LAB_TB_FINS = [['6capt', '6 billes'], ['adj3', '3 billes d’écart'], ['adjCap', 'billes d’avance'], ['adjCap1', '1 bille, mieux placé'], ['adjEval', 'évaluations d’accord'], ['draw', 'nulle'], ['draw1', 'nulle, 1 bille d’avance'], ['noMove', 'bloqué']];
function _labTbFiltre(){ try { return Object.assign({ periode: 0, phase: 'tout' }, JSON.parse(localStorage.getItem('abaLabTbFiltre') || '{}')); } catch (e) { return { periode: 0, phase: 'tout' }; } }
function labTbFiltrer(k, v){ const f = _labTbFiltre(); f[k] = k === 'periode' ? +v : v; try { localStorage.setItem('abaLabTbFiltre', JSON.stringify(f)); } catch (e) {} renderLabTableau(); }
// les parties du journal retenues par les filtres
function _labTbParties(f){
  const depuis = f.periode ? Date.now() - f.periode * 86400000 : 0;
  return _labDataLoad().filter(function(r){ return r && r.t >= depuis && (f.phase === 'tout' || r.phase === f.phase); });
}
// parties par heure de calcul effectif : les parties sont regroupees en seances (moins de 10 min entre deux)
function _labTbDebit(L){
  if (L.length < 3) return null;
  const T = L.map(function(r){ return r.t; }).sort(function(a, b){ return a - b; });
  let duree = 0, n = 0;
  for (let i = 1; i < T.length; i++) { const d = T[i] - T[i - 1]; if (d < 600000) { duree += d; n++; } }
  return duree > 0 ? n / (duree / 3600000) : null;
}
function _labTbTests(st){
  const H = st.history || [], c = { adopte: 0, rejete: 0, indecis: 0, tri: 0, parties: 0, n: 0 };
  H.forEach(function(x){
    const t = String(x.type || '');
    if (t.indexOf('adopté') >= 0) c.adopte++; else if (t.indexOf('indécis') >= 0) c.indecis++; else if (t.indexOf('rejeté') >= 0) c.rejete++; else if (t.indexOf('tri') >= 0) c.tri++; else return;
    if (t.indexOf('tri') < 0 && x.games) { c.parties += x.games; c.n++; }
  });
  return c;
}
function _labTbHeures(ms){ const h = ms / 3600000; return h >= 10 ? grNb(h, 0) + ' h' : (h >= 1 ? grNb(h, 1) + ' h' : grNb(ms / 60000, 0) + ' min'); }

function renderLabTableau(){
  const hote = document.getElementById('lab-tableau-host'); if (!hote) return;
  const st = labLoad(), f = _labTbFiltre(), L = _labTbParties(f), W = grLargeur(hote, 640);
  const bancs = Object.keys(BANCS).map(function(n){ return bancEtat(n); }).filter(Boolean);
  const partiesBancs = bancs.reduce(function(a, s){ return a + (s.parties || 0); }, 0), msBancs = bancs.reduce(function(a, s){ return a + (s.ms || 0); }, 0);
  const kaah = (typeof _testKaahEtat === 'function') ? _testKaahEtat() : null, partiesKaah = kaah ? (kaah.n || 0) : 0;
  const T = _labTbTests(st), M = (st.mesures || []).filter(function(m){ return m && typeof m.elo === 'number'; }), dern = M[M.length - 1];
  const debit = _labTbDebit(L), tranches = T.adopte + T.rejete + T.indecis;
  let h = '<p class="lab-intro">Les chiffres du Labo sur cet appareil : ce qu’il a joué, ce qu’il a décidé, ce qu’il a gagné. Les graphiques du bas viennent du journal des parties (les 2 000 dernières), filtrées ici.</p>';
  h += grTuiles([
    { lab: 'Parties jouées', v: grNb((st.totalGames || 0) + partiesBancs + partiesKaah), sous: grNb(st.totalGames || 0) + ' au Labo · ' + grNb(partiesBancs) + ' aux bancs · ' + grNb(partiesKaah) + ' test KAAH' },
    { lab: 'Temps de calcul', v: _labTbHeures((st.msTotal || 0) + msBancs), sous: 'cumulé sur les fils de calcul, compté depuis la v2.71' },
    { lab: 'Parties par heure', v: debit ? grNb(debit, 0) : '—', sous: 'pendant que le Labo tourne (filtres ci-dessous)' },
    { lab: 'Tests tranchés', v: grNb(tranches), sous: T.adopte + ' adoptés · ' + T.rejete + ' rejetés · ' + T.indecis + ' indécis · ' + T.tri + ' tris sans finaliste' },
    { lab: 'Taux d’adoption', v: tranches ? grPct(T.adopte / tranches) : '—', sous: T.n ? 'un test tranché : ' + grNb(T.parties / T.n, 0) + ' parties en moyenne' : 'aucun test tranché' },
    { lab: 'Gain réel mesuré', v: dern ? (dern.elo >= 0 ? '+' : '') + dern.elo + ' Elo' : '—', sous: dern ? '± ' + dern.ci + ' · champion G' + dern.gen + ' contre les poids d’origine' : 'mesuré après chaque adoption' }
  ]);
  if (M.length) {
    h += '<div class="gr-titre">Le gain réel, bilan après bilan</div><div class="gr-sous">Le champion contre les poids d’origine, en Elo, avec sa marge à 95 %. Au-dessus de 0 : le Labo a rendu l’IA plus forte.</div>';
    h += grLignes(W, [{ nom: 'Gain', couleur: GR_OR, pts: M.map(function(m, i){ return [i + 1, m.elo]; }), barres: M.map(function(m, i){ return [i + 1, m.elo - m.ci, m.elo + m.ci]; }), points: true }],
      { zero: true, ticksX: M.length <= 12 ? M.map(function(m, i){ return i + 1; }) : null, fmtX: function(v){ return '#' + v; }, nomX: 'Bilan', fmtTip: function(v, sr, x){ const m = M[x - 1]; return (v >= 0 ? '+' : '') + v + ' Elo ± ' + m.ci + ' (G' + m.gen + ', ' + m.paires + ' paires)'; }, aria: 'Gain réel mesuré' });
  }
  const C = st.champions || [];
  if (C.length) {
    const cles = SPSA_KEYS.filter(function(k, j){ return C.some(function(c){ return c.w[j]; }); });
    h += '<div class="gr-titre">Les poids du champion, adoption après adoption</div><div class="gr-sous">' + C.length + ' champion' + (C.length > 1 ? 's' : '') + ' depuis les poids d’origine ; la dernière valeur à droite.' + (C.length < 2 ? ' Les courbes se dessinent aux prochaines adoptions.' : '') + '</div>';
    h += grMultiples(W, cles.map(function(k){ const j = SPSA_KEYS.indexOf(k); return { nom: LAB_NOMS[k] || k, pts: C.map(function(c, i){ return [i, c.w[j]]; }) }; }), { nomX: 'n° ' });
    if (C.length > 1) h += grChiffres(['#', 'Génération', 'Quand', 'Changement'], C.map(function(c, i){ return [i, 'G' + c.gen, c.t ? new Date(c.t).toLocaleDateString('fr-FR') : '—', c.nom || '']; }));
  }
  // les filtres du journal, puis ses graphiques
  const sel = function(k, O){ return '<select onchange="labTbFiltrer(\'' + k + '\',this.value)">' + Object.keys(O).map(function(v){ return '<option value="' + v + '"' + (String(f[k]) === v ? ' selected' : '') + '>' + O[v] + '</option>'; }).join('') + '</select>'; };
  h += '<div class="gr-titre">Le journal des parties</div>';
  h += '<div class="gr-filtres"><label>Période ' + sel('periode', LAB_TB_PERIODES) + '</label><label>Phase ' + sel('phase', LAB_TB_PHASES) + '</label><span>' + grNb(L.length) + ' partie' + (L.length > 1 ? 's' : '') + '</span></div>';
  if (!L.length) { h += '<div class="gr-vide">Aucune partie dans le journal pour ces filtres : lance le Labo.</div>'; hote.innerHTML = h; grSurRedim('tableau', 'lab-tableau-host', renderLabTableau); return; }
  // parties par jour
  const jours = {}; L.forEach(function(r){ const d = new Date(r.t); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); jours[k] = (jours[k] || 0) + 1; });
  const nbJ = f.periode || 30, J = [];
  for (let i = nbJ - 1; i >= 0; i--) { const d = new Date(Date.now() - i * 86400000); const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); J.push({ lab: String(d.getDate()), v: jours[k] || 0, tip: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) + _dimDp() + (jours[k] || 0) + ' parties' }); }
  h += '<div class="gr-titre">Parties par jour</div><div class="gr-sous">Les ' + nbJ + ' derniers jours.</div>' + grColonnes(W, J, { aria: 'Parties par jour' });
  // longueur
  const B = []; for (let b = 0; b < 16; b++) B.push(0);
  L.forEach(function(r){ B[Math.min(15, Math.floor((r.plies || 0) / 10))]++; });
  const moy = L.reduce(function(a, r){ return a + (r.plies || 0); }, 0) / L.length;
  h += '<div class="gr-titre">Longueur des parties</div><div class="gr-sous">En demi-coups joués après le départ ; moyenne ' + grNb(moy, 0) + '.</div>'
    + grColonnes(W, B.map(function(v, b){ return { lab: b === 15 ? '150+' : String(b * 10), v: v, tip: (b === 15 ? '150 demi-coups et plus' : (b * 10) + ' à ' + (b * 10 + 9) + ' demi-coups') + _dimDp() + v + ' parties' }; }), { titreX: 'demi-coups', aria: 'Longueur des parties' });
  // fins
  const fins = {}; L.forEach(function(r){ fins[r.why] = (fins[r.why] || 0) + 1; });
  h += '<div class="gr-titre">Comment finissent les parties</div>' + grPile(LAB_TB_FINS.map(function(x){ return { nom: x[1], v: fins[x[0]] || 0 }; }).concat(Object.keys(fins).filter(function(k){ return !LAB_TB_FINS.some(function(x){ return x[0] === k; }); }).length ? [{ nom: 'autre', v: Object.keys(fins).filter(function(k){ return !LAB_TB_FINS.some(function(x){ return x[0] === k; }); }).reduce(function(a, k){ return a + fins[k]; }, 0) }] : []));
  // couleur et depart
  const parCouleur = { black: { p: 0, n: 0 }, white: { p: 0, n: 0 } };
  L.forEach(function(r){ const c = parCouleur[r.colorA]; if (!c) return; c.n++; c.p += r.winner === 'A' ? 1 : (r.winner === 'D' ? 0.5 : 0); });
  h += '<div class="gr-titre">Le camp testé selon sa couleur</div><div class="gr-sous">Score du mutant (ou de θ+, du champion au bilan) quand il a les Noirs, puis les Blancs. Un grand écart signale un avantage au premier joueur dans ces positions ; les paires l’annulent.</div>'
    + grBarres(['black', 'white'].map(function(c){ const x = parCouleur[c]; return { lab: c === 'black' ? 'Noirs' : 'Blancs', v: x.n ? x.p / x.n : 0, ref: 0.5, txt: x.n ? grPct(x.p / x.n) + ' sur ' + x.n : '—' }; }), { max: 1 });
  const dep = { corpus: { n: 0, p: 0 }, hasard: { n: 0, p: 0 } };
  L.forEach(function(r){ const k = (r.depart && r.depart !== 'hasard') ? 'corpus' : 'hasard'; dep[k].n++; dep[k].p += r.plies || 0; });
  h += '<div class="gr-titre">D’où partent les parties</div>' + grBarres([{ lab: 'Vraies positions', v: dep.corpus.n, txt: grNb(dep.corpus.n) + (dep.corpus.n ? ' · ' + grNb(dep.corpus.p / dep.corpus.n, 0) + ' demi-coups en moyenne' : '') },
    { lab: 'Standard + hasard', v: dep.hasard.n, couleur: GR_REF, txt: grNb(dep.hasard.n) + (dep.hasard.n ? ' · ' + grNb(dep.hasard.p / dep.hasard.n, 0) + ' demi-coups en moyenne' : '') }], {});
  h += grChiffres(['Jour', 'Parties'], J.filter(function(x){ return x.v; }).map(function(x){ return [x.tip.split(_dimDp())[0], x.v]; }));
  hote.innerHTML = h;
  grSurRedim('tableau', 'lab-tableau-host', renderLabTableau);
}
</script>
