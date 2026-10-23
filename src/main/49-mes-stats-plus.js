/* ═══════════════════════════════════════════
   MES STATISTIQUES : FILTRES, RESULTATS DETAILLES, PROGRESSION, MOI CONTRE LE CORPUS (v2.73)
   Demande d'Olivier : « plus de parametres, de graphiques, de metriques… pour
   les profils ». Troisieme partie, apres le Labo (v2.71) et le corpus (v2.72).
   - Les filtres : la periode (les onglets 7 jours… Tout, qui ne faisaient
     qu'afficher un message) et le type de partie (contre l'IA, importees, a
     deux). Ils s'appliquent a toute la page pendant son rendu (getMesParties).
   - Resultats detailles : par niveau, style, couleur, disposition,
     adversaire ; le taux de victoire glissant.
   - Ma progression : precision, billes faites et perdues, longueur, partie
     par partie ; quand tu joues (jours et heures).
   - Moi contre le corpus : tes 12 dimensions face aux vrais joueurs, tes
     ouvertures face au livre.
   - Export CSV de tes parties, avec leurs chiffres.
═══════════════════════════════════════════ */
var _msFiltreApplique = false;            // vrai pendant le rendu de Mes statistiques (var : lisible avant meme ce module)
var _msDernier = { ej: null, profil: null };
const MS_TYPES = { tout: 'Toutes', ai: 'Contre l’IA', import: 'Importées', local: 'À deux' };
let _msFiltre = { periode: 0, type: 'tout' };
try { const f = JSON.parse(localStorage.getItem('abaMsFiltre') || 'null'); if (f) _msFiltre = Object.assign(_msFiltre, f); } catch (e) {}
function _msGarder(e){
  const f = _msFiltre;
  if (f.type !== 'tout' && e.mode !== f.type) return false;
  if (f.periode) { const t = Date.parse(e.date); if (!(t >= Date.now() - f.periode * 86400000)) return false; }
  return true;
}
function _msFiltrer(L){ return _msFiltreApplique ? L.filter(_msGarder) : L; }
function msFiltrer(k, v){
  _msFiltre[k] = (k === 'periode') ? +v : v;
  try { localStorage.setItem('abaMsFiltre', JSON.stringify(_msFiltre)); } catch (e) {}
  if (typeof renderStats === 'function') renderStats();
}
// mes parties retenues, de la plus ancienne a la plus recente
function _msParties(){ const L = getGameHistory().filter(estMaPartie).filter(_msGarder); return L.slice().sort(function(a, b){ return Date.parse(a.date) - Date.parse(b.date); }); }
function _msResultat(e){ return (typeof _histMonResultat === 'function') ? _histMonResultat(e) : null; }
function _msScore(L){ let p = 0, n = 0, v = 0, d = 0, nl = 0; L.forEach(function(e){ const r = _msResultat(e); if (!r) return; n++; if (r === 'victoire') { p++; v++; } else if (r === 'nulle') { p += 0.5; nl++; } else d++; }); return { p: p, n: n, v: v, d: d, nl: nl }; }
function _msAdversaire(e){
  if (e.mode === 'ai') return null;
  const nom = e.humanColor === 'black' ? e.whiteName : (e.humanColor === 'white' ? e.blackName : '');
  return nom ? String(nom).trim() : null;
}
// barres « score par groupe » : groupe(e) -> nom ou null
function _msParGroupe(L, groupe, ordre){
  const G = {};
  L.forEach(function(e){ const g = groupe(e); if (g == null || g === '') return; (G[g] = G[g] || []).push(e); });
  let cles = Object.keys(G).filter(function(g){ return _msScore(G[g]).n; });
  cles = ordre ? cles.sort(ordre) : cles.sort(function(a, b){ return G[b].length - G[a].length; });
  return cles.map(function(g){ const s = _msScore(G[g]); return { lab: g, v: s.p / s.n, ref: 0.5, txt: grPct(s.p / s.n) + ' · ' + s.n + _tr(' partie', ' game') + (s.n > 1 ? 's' : ''), tip: g + _dimDp() + s.v + _tr(' V, ', ' W, ') + s.nl + _tr(' N, ', ' D, ') + s.d + _tr(' D', ' L') + ' (' + grPct(s.p / s.n) + ')' }; });
}

/* ─── La barre des filtres et l'export ─── */
function _msHtmlFiltres(n){
  const f = _msFiltre;
  return '<div class="gr-filtres"><label>' + _tr('Parties', 'Games') + ' <select onchange="msFiltrer(\'type\',this.value)">' + Object.keys(MS_TYPES).map(function(k){ return '<option value="' + k + '"' + (f.type === k ? ' selected' : '') + '>' + _tr(MS_TYPES[k], { tout: 'All', ai: 'Against the AI', import: 'Imported', local: 'Two players' }[k]) + '</option>'; }).join('') + '</select></label>'
    + '<span>' + grNb(n) + _tr(' partie' + (n > 1 ? 's' : '') + ' retenue' + (n > 1 ? 's' : ''), ' game' + (n > 1 ? 's' : '') + ' selected') + (f.periode ? ' · ' + _tr(f.periode + ' derniers jours', 'last ' + f.periode + ' days') : '') + '</span>'
    + '<button class="ctrl-btn ms-export" onclick="msExporterCSV()">📊 ' + _tr('Exporter (CSV)', 'Export (CSV)') + '</button></div>';
}
function msExporterCSV(){
  const L = _msParties();
  if (!L.length) { showToast(_tr('Aucune partie à exporter avec ces filtres', 'No game to export with these filters')); return; }
  const ej = {}, pr = {};
  ((_msDernier.ej && _msDernier.ej.parties) || []).forEach(function(x){ ej[x.id] = x; });
  ((_msDernier.profil && _msDernier.profil.parties) || []).forEach(function(x){ pr[x.id] = x; });
  const q = function(v){ v = v == null ? '' : String(v); return /[",;\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const lignes = [['date', 'type', 'disposition', 'couleur', 'adversaire', 'niveau_ia', 'style_ia', 'resultat', 'coups', 'billes_faites', 'billes_perdues', 'coups_analyses', 'coups_proches_du_meilleur'].join(',')];
  L.forEach(function(e){
    const a = ej[e.id] || {}, p = pr[e.id] || {};
    lignes.push([e.date, e.mode, e.variant, e.humanColor, _msAdversaire(e) || '', e.mode === 'ai' ? (_niveauIA(e.aiDiff) || '') : '', e.mode === 'ai' ? (e.aiStyle || '') : '', _msResultat(e) || '', e.moveCount || '', a.faites != null ? a.faites : '', a.subies != null ? a.subies : '', p.coups || '', p.proches != null ? p.proches : ''].map(q).join(','));
  });
  _dl('abalassembly-mes-parties-' + new Date().toISOString().slice(0, 10) + '.csv', lignes.join('\n'), 'text/csv');
  showToast('📊 ' + L.length + _tr(' parties exportées', ' games exported'));
}

/* ─── 1. Resultats detailles ─── */
function _msHtmlResultats(L, W){
  const S = _msScore(L);
  let h = grTuiles([
    { lab: _tr('Parties au résultat connu', 'Games with a known result'), v: grNb(S.n), sous: grNb(L.length) + _tr(' retenues en tout', ' selected in all') },
    { lab: _tr('Score', 'Score'), v: S.n ? grPct(S.p / S.n) : '—', sous: S.v + _tr(' victoires · ', ' wins · ') + S.nl + _tr(' nulles · ', ' draws · ') + S.d + _tr(' défaites', ' losses') },
    { lab: _tr('Coups par partie', 'Moves per game'), v: L.length ? grNb(L.reduce(function(a, e){ return a + (e.moveCount || 0); }, 0) / L.length, 0) : '—', sous: _tr('en moyenne', 'on average') }
  ]);
  // le taux glissant : les 10 dernieres parties au resultat connu, partie apres partie
  const R = L.filter(function(e){ return _msResultat(e); }), pts = [];
  for (let i = 0; i < R.length; i++) { const f = R.slice(Math.max(0, i - 9), i + 1), s = _msScore(f); pts.push([i + 1, Math.round(1000 * s.p / s.n) / 10]); }
  if (pts.length >= 3) {
    h += '<div class="gr-titre">' + _tr('Ton score, partie après partie', 'Your score, game after game') + '</div><div class="gr-sous">' + _tr('Sur tes 10 dernières parties à chaque fois (moins au début).', 'Over your last 10 games each time (fewer at the start).') + '</div>'
      + grLignes(W, [{ nom: _tr('Score', 'Score'), couleur: GR_OR, pts: pts }], { yMin: 0, yMax: 100, fmtY: function(v){ return v + ' %'; }, nomX: _tr('Partie', 'Game'), fmtX: function(v){ return '#' + v; }, aria: _tr('Score glissant', 'Rolling score') });
  }
  const ai = L.filter(function(e){ return e.mode === 'ai'; });
  const blocs = [
    [_tr('Contre l’IA, par niveau', 'Against the AI, by level'), _msParGroupe(ai, function(e){ const n = _niveauIA(e.aiDiff); return n ? _tr('Niveau ', 'Level ') + n : null; }, function(a, b){ return parseInt(a.replace(/\D/g, ''), 10) - parseInt(b.replace(/\D/g, ''), 10); })],
    [_tr('Contre l’IA, par style', 'Against the AI, by style'), _msParGroupe(ai, function(e){ const s = { auto: 'Auto', aggressive: _tr('Agressif', 'Aggressive'), defensive: _tr('Défensif', 'Defensive'), divide: _tr('Division', 'Divide'), balanced: _tr('Équilibré', 'Balanced'), kaah: 'KAAH', humain: _tr('Humain (Labo)', 'Human-like (Lab)'), contremoi: _tr('Contre moi (Labo)', 'Against me (Lab)') }; return s[e.aiStyle] || e.aiStyle || null; })],
    [_tr('Par couleur', 'By colour'), _msParGroupe(L, function(e){ return e.humanColor === 'black' ? _tr('Noirs', 'Black') : (e.humanColor === 'white' ? _tr('Blancs', 'White') : null); })],
    [_tr('Par disposition', 'By layout'), _msParGroupe(L, function(e){ return (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[e.variant]) || e.variant || null; })],
    [_tr('Par adversaire (parties importées ou à deux)', 'By opponent (imported or two-player games)'), _msParGroupe(L, _msAdversaire).slice(0, 10)]
  ];
  blocs.forEach(function(b){ if (b[1].length) h += '<div class="gr-titre">' + b[0] + '</div>' + grBarres(b[1], { max: 1 }); });
  h += '<div class="gr-sous">' + _tr('Score : victoire 1, nulle ½. Le trait marque 50 %.', 'Score: win 1, draw ½. The tick marks 50%.') + '</div>';
  return h;
}

/* ─── 2. Ma progression ─── */
function _msHtmlProgression(L, W){
  const ids = {}; L.forEach(function(e, i){ ids[e.id] = i + 1; });
  const pr = ((_msDernier.profil && _msDernier.profil.parties) || []).filter(function(x){ return ids[x.id]; }).sort(function(a, b){ return ids[a.id] - ids[b.id]; });
  const ej = ((_msDernier.ej && _msDernier.ej.parties) || []).filter(function(x){ return ids[x.id]; }).sort(function(a, b){ return ids[a.id] - ids[b.id]; });
  let h = '';
  if (pr.length >= 2) h += '<div class="gr-titre">' + _tr('Précision', 'Accuracy') + '</div><div class="gr-sous">' + _tr('Part de tes coups proches du meilleur choix disponible, partie par partie.', 'Share of your moves close to the best available choice, game by game.') + '</div>'
    + grLignes(W, [{ nom: _tr('Précision', 'Accuracy'), couleur: GR_OR, pts: pr.map(function(x){ return [ids[x.id], Math.round(1000 * x.proches / x.coups) / 10]; }), points: pr.length <= 40 }], { yMin: 0, yMax: 100, fmtY: function(v){ return v + ' %'; }, nomX: _tr('Partie', 'Game'), fmtX: function(v){ return '#' + v; }, fmtTip: function(v, sr, x){ const p = pr.find(function(q){ return ids[q.id] === x; }); return v + ' %' + (p ? ' (' + p.proches + ' / ' + p.coups + ')' : ''); }, aria: _tr('Précision par partie', 'Accuracy per game') });
  if (ej.length >= 2) h += '<div class="gr-titre">' + _tr('Billes faites et perdues', 'Marbles taken and lost') + '</div>'
    + grLignes(W, [{ nom: _tr('faites', 'taken'), couleur: GR_SERIES[0], pts: ej.map(function(x){ return [ids[x.id], x.faites]; }), points: ej.length <= 40 }, { nom: _tr('perdues', 'lost'), couleur: GR_SERIES[1], pts: ej.map(function(x){ return [ids[x.id], x.subies]; }), points: ej.length <= 40 }], { yMin: 0, nomX: _tr('Partie', 'Game'), fmtX: function(v){ return '#' + v; }, aria: _tr('Billes par partie', 'Marbles per game') });
  if (L.length >= 2) h += '<div class="gr-titre">' + _tr('Longueur des parties', 'Game length') + '</div>'
    + grColonnes(W, L.map(function(e, i){ const r = _msResultat(e); return { lab: '#' + (i + 1), v: e.moveCount || 0, couleur: r === 'victoire' ? GR_SERIES[0] : (r === 'defaite' ? GR_SERIES[1] : GR_REF), tip: '#' + (i + 1) + ' · ' + new Date(e.date).toLocaleDateString(currentLang() === 'EN' ? 'en-GB' : 'fr-FR') + _dimDp() + (e.moveCount || 0) + _tr(' coups', ' moves') + (r ? ' · ' + _tr({ victoire: 'victoire', defaite: 'défaite', nulle: 'nulle' }[r], { victoire: 'win', defaite: 'loss', nulle: 'draw' }[r]) : '') }; }), { aria: _tr('Longueur des parties', 'Game length') })
    + grLegende([{ nom: _tr('victoire', 'win'), couleur: GR_SERIES[0] }, { nom: _tr('défaite', 'loss'), couleur: GR_SERIES[1] }, { nom: _tr('nulle ou inconnu', 'draw or unknown'), couleur: GR_REF }]);
  // quand tu joues : jours x tranches de 4 heures (parties dont on connait l'heure)
  const J = [[], [], [], [], [], [], []].map(function(){ return [0, 0, 0, 0, 0, 0]; }); let nh = 0;
  L.forEach(function(e){ if (typeof _histSansHeure === 'function' && _histSansHeure(e)) return; const d = new Date(e.date); if (isNaN(d)) return; J[(d.getDay() + 6) % 7][Math.floor(d.getHours() / 4)]++; nh++; });
  if (nh) {
    const jours = currentLang() === 'EN' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.'];
    h += '<div class="gr-titre">' + _tr('Quand tu joues', 'When you play') + '</div><div class="gr-sous">' + _tr('Tes parties par jour de la semaine et par tranche de 4 heures (heure de ton appareil).', 'Your games by day of the week and 4-hour slot (your device’s time).') + '</div>'
      + grCarte(jours, ['0-4 h', '4-8 h', '8-12 h', '12-16 h', '16-20 h', '20-24 h'], function(i, j){ const v = J[i][j]; return v ? { v: v, txt: String(v), tip: jours[i] + ' ' + (4 * j) + '-' + (4 * j + 4) + ' h' + _dimDp() + v + _tr(' parties', ' games') } : { v: null, txt: '' }; }, { echelle: 'or' });
  }
  return h || '<div class="gr-vide">' + _tr('Il faut au moins deux parties pour dessiner une progression.', 'At least two games are needed to draw a progression.') + '</div>';
}

/* ─── 3. Moi contre le corpus ───
   Tes 12 dimensions : apres chacun de tes coups, la position mesuree comme dans le corpus
   (calculerEmpreinte, du cote du camp qui vient de jouer), placee dans la distribution des
   vrais joueurs ; on fait la moyenne de ces centiles (50 = comme les vrais joueurs).
   Tes ouvertures : tes coups des 12 premiers demi-coups, face au livre (OPENING_TREES). */
let _msCorpus = null, _msCorpusEnCours = false;
/* Le centile « au milieu des egalites » : la part des positions en dessous, plus la moitie de celles
   qui ont exactement la meme valeur. Sans cette moitie, les dimensions aux valeurs souvent egales
   (l'ecart de billes, la profondeur tactique, souvent 0) tombaient trop bas : verifie sur 3 891
   positions du corpus, qui doivent donner 50 en moyenne -- 39 et 24 avant, 50 et 51 apres. */
function _msCentile(d, v){ const a = pourcentEnDessous(d, v), b = pourcentEnDessous(d, v + 0.0005); return (a == null || b == null) ? null : (a + b) / 2; }
function msComparerAuCorpus(){
  if (_msCorpusEnCours) return;
  _msCorpusEnCours = true; _msRendreCorpus(_tr('⏳ Chargement des positions des vrais joueurs…', '⏳ Loading the real players’ positions…'));
  Promise.all([ensureEmpreintesHistoriques(), (typeof ensureEmpreintesComplement === 'function' ? ensureEmpreintesComplement() : true), (typeof ensureGameBanks === 'function' ? ensureGameBanks() : true)]).then(function(){
    const L = _msParties(), champs = EMPREINTES_CHAMPS, dist = champs.map(function(c){ return distributionDimension(c, 'tous'); });
    const somme = champs.map(function(){ return 0; }); let n = 0;
    const ouv = { coups: 0, livre: 0, premier: 0, tauxChoisi: 0, tauxMeilleur: 0, nTaux: 0 };
    const sauve = { layout: currentLayout, board: board, cb: CapturedByBlack.get(), cw: CapturedByWhite.get() };
    let i = 0;
    return new Promise(function(fin){
      const tranche = function(){
        try {
          for (let k = 0; k < 4 && i < L.length; k++, i++) {
            const e = L[i], P = gameCodeParse(e.code); if (!P || !P.ok) continue;
            const moi = e.humanColor === 'white' ? 'white' : 'black';
            currentLayout = P.layout || 'standard'; initBoardState(); CapturedByBlack.set(0); CapturedByWhite.set(0);
            let tour = 'black', noeud = (typeof OPENING_TREES !== 'undefined' && OPENING_TREES[currentLayout]) ? OPENING_TREES[currentLayout] : null;
            for (let j = 0; j < P.moves.length; j++) {
              const mv = P.moves[j], v = validateMove(mv.cells, mv.dir, tour); if (!v || !v.valid) break;
              const id = canonId(mv);
              if (tour === moi && j < 12 && noeud && noeud.k) {
                ouv.coups++;
                const fils = Object.keys(noeud.k);
                if (noeud.k[id]) {
                  ouv.livre++;
                  const top = fils.sort(function(a, b){ return noeud.k[b].c - noeud.k[a].c; })[0]; if (top === id) ouv.premier++;
                  const taux = function(x){ return x.wg ? x.w / x.wg : null; }, tc = taux(noeud.k[id]);
                  const meilleur = fils.filter(function(f){ return noeud.k[f].wg >= 10; }).reduce(function(m, f){ const t = taux(noeud.k[f]); return t != null && (m == null || t > m) ? t : m; }, null);
                  if (tc != null && meilleur != null && noeud.k[id].wg >= 10) { ouv.tauxChoisi += tc; ouv.tauxMeilleur += meilleur; ouv.nTaux++; }
                }
              }
              applyMove({ cells: mv.cells, dir: mv.dir, info: v }, tour);
              if (noeud) noeud = (noeud.k && noeud.k[id]) ? noeud.k[id] : null;
              if (tour === moi) { const emp = calculerEmpreinte(moi); champs.forEach(function(c, q){ const p = _msCentile(dist[q], emp[c]); if (p != null) somme[q] += p; }); n++; }
              tour = tour === 'black' ? 'white' : 'black';
              if (CapturedByBlack.get() >= 6 || CapturedByWhite.get() >= 6) break;
            }
          }
        } finally { currentLayout = sauve.layout; board = sauve.board; CapturedByBlack.set(sauve.cb); CapturedByWhite.set(sauve.cw); }
        _msRendreCorpus(_tr('⏳ Tes positions : ', '⏳ Your positions: ') + Math.round(100 * i / Math.max(1, L.length)) + ' %');
        if (i < L.length) setTimeout(tranche, 0);
        else fin({ n: n, parties: L.length, centiles: somme.map(function(x){ return n ? x / n : null; }), ouv: ouv, date: Date.now() });
      };
      tranche();
    });
  }).then(function(r){ _msCorpus = r; _msCorpusEnCours = false; _msRendreCorpus(); })
    .catch(function(e){ _msCorpusEnCours = false; _msRendreCorpus('❌ ' + (e && e.message || e)); });
}
function _msRendreCorpus(msg){
  const hote = document.getElementById('ms-corpus'); if (!hote) return;
  const r = _msCorpus;
  let h = '<div class="gr-sous">' + _tr('Après chacun de tes coups, ta position est mesurée sur les 12 dimensions et placée parmi les 427 000 positions des vrais joueurs ; 50 = comme eux en moyenne. Et tes 12 premiers demi-coups, face au livre d’ouvertures.', 'After each of your moves, your position is measured on the 12 dimensions and placed among the 427,000 positions of real players; 50 = like them on average. And your first 12 plies, against the opening book.') + '</div>';
  h += '<div class="lab-actions"><button class="ctrl-btn" onclick="msComparerAuCorpus()"' + (_msCorpusEnCours ? ' disabled' : '') + '>' + (_msCorpusEnCours ? '⏳' : (r ? '↻ ' : '▶ ')) + _tr(r ? 'Recalculer' : 'Me comparer aux vrais joueurs', r ? 'Recompute' : 'Compare me with real players') + '</button></div>';
  if (msg) h += '<div class="lab-etat">' + msg + '</div>';
  if (r && r.n) {
    h += '<div class="gr-titre">' + _tr('Tes 12 dimensions', 'Your 12 dimensions') + '</div><div class="gr-sous">' + _tr('Centile moyen de tes positions, moins 50 : à droite, plus que les vrais joueurs ; à gauche, moins. ', 'Average percentile of your positions, minus 50: right, more than real players; left, less. ') + grNb(r.n) + _tr(' positions, ', ' positions, ') + r.parties + _tr(' parties.', ' games.') + '</div>';
    h += grBarres(EMPREINTES_CHAMPS.map(function(c, q){ const v = r.centiles[q]; return { lab: _labelDimension(c), v: v != null ? v - 50 : 0, txt: v != null ? _tr('centile ', 'percentile ') + grNb(v, 0) : '—', tip: _labelDimension(c) + _dimDp() + _tr('tes positions sont en moyenne au ', 'your positions are on average at percentile ') + grNb(v, 0) + _tr('ᵉ centile des vrais joueurs', ' of real players') }; }), { min: -50, max: 50 });
    const o = r.ouv;
    if (o.coups) {
      h += '<div class="gr-titre">' + _tr('Tes ouvertures', 'Your openings') + '</div>' + grTuiles([
        { lab: _tr('Coups connus du livre', 'Moves known to the book'), v: grPct(o.livre / o.coups), sous: o.livre + ' / ' + o.coups + _tr(' de tes coups des 12 premiers demi-coups', ' of your moves in the first 12 plies') },
        { lab: _tr('Le coup le plus joué', 'The most played move'), v: o.livre ? grPct(o.premier / o.livre) : '—', sous: _tr('de tes coups connus sont le choix n° 1 des humains', 'of your known moves are humans’ first choice') },
        { lab: _tr('Taux de victoire de tes choix', 'Win rate of your choices'), v: o.nTaux ? grPct(o.tauxChoisi / o.nTaux) : '—', sous: o.nTaux ? _tr('chez les humains ; le meilleur coup possible : ', 'among humans; the best possible move: ') + grPct(o.tauxMeilleur / o.nTaux) : _tr('pas assez de coups fréquents', 'not enough frequent moves') }
      ]);
    }
  }
  hote.innerHTML = h;
}

/* ─── La page ─── */
function renderMesStatsPlus(){
  const hf = document.getElementById('ms-filtres'), hp = document.getElementById('ms-plus');
  const L = _msParties();
  // l'onglet de periode actif suit le filtre garde
  document.querySelectorAll('#stats-period .period-tab').forEach(function(b){ const m = String(b.getAttribute('onclick') || '').match(/setStatsPeriod\((\d+)/); if (m) b.classList.toggle('active', +m[1] === (_msFiltre.periode || 0)); });
  if (hf) hf.innerHTML = _msHtmlFiltres(L.length);
  if (!hp) return;
  const W = grLargeur(hp, 640) - 40;
  const carte = function(t, c, id){ return '<div class="ms-carte"' + (id ? ' id="' + id + '"' : '') + '><div class="ms-carte-t">' + t + '</div>' + c + '</div>'; };
  if (!L.length) { hp.innerHTML = carte(_tr('Résultats détaillés', 'Detailed results'), '<div class="gr-vide">' + _tr('Aucune partie avec ces filtres.', 'No game with these filters.') + '</div>'); return; }
  hp.innerHTML = carte(_tr('Résultats détaillés', 'Detailed results'), _msHtmlResultats(L, W))
    + carte(_tr('Ma progression', 'My progress'), _msHtmlProgression(L, W))
    + carte(_tr('Moi contre le corpus', 'Me against the corpus'), '<div id="ms-corpus"></div>');
  _msRendreCorpus();
  grSurRedim('messtats', 'ms-plus', function(){ _msFiltreApplique = true; try { renderMesStatsPlus(); } finally { _msFiltreApplique = false; } });
}

/* ─── Le Profil : mes chiffres en bref ─── */
function renderProfilChiffres(){
  const hote = document.getElementById('profil-chiffres'); if (!hote) return;
  const L = getGameHistory().filter(estMaPartie).slice().sort(function(a, b){ return Date.parse(a.date) - Date.parse(b.date); });
  const R = L.filter(function(e){ return _msResultat(e); });
  if (!R.length) { hote.innerHTML = ''; return; }
  const S = _msScore(R), D = _msScore(R.slice(-10));
  let serie = 0, record = 0; R.forEach(function(e){ if (_msResultat(e) === 'victoire') { serie++; record = Math.max(record, serie); } else serie = 0; });
  let niv = 0; R.forEach(function(e){ if (e.mode === 'ai' && _msResultat(e) === 'victoire') niv = Math.max(niv, _niveauIA(e.aiDiff) || 0); });
  const W = grLargeur(hote, 600) - 40, pts = [];
  for (let i = 0; i < R.length; i++) { const s = _msScore(R.slice(Math.max(0, i - 9), i + 1)); pts.push([i + 1, Math.round(1000 * s.p / s.n) / 10]); }
  hote.innerHTML = '<div class="ms-carte"><div class="ms-carte-t">📊 ' + _tr('Mes chiffres', 'My numbers') + '</div>'
    + grTuiles([
      { lab: _tr('Score', 'Score'), v: grPct(S.p / S.n), sous: S.n + _tr(' parties au résultat connu', ' games with a known result') },
      { lab: _tr('10 dernières', 'Last 10'), v: grPct(D.p / D.n), sous: D.v + _tr(' victoires', ' wins') },
      { lab: _tr('Meilleure série', 'Best streak'), v: grNb(record), sous: _tr('victoires de suite', 'wins in a row') },
      { lab: _tr('Plus haut niveau battu', 'Highest level beaten'), v: niv ? _tr('niveau ', 'level ') + niv : '—', sous: _tr('contre l’IA', 'against the AI') }
    ])
    + (pts.length >= 3 ? grLignes(W, [{ nom: _tr('Score', 'Score'), couleur: GR_OR, pts: pts }], { h: 150, yMin: 0, yMax: 100, fmtY: function(v){ return v + ' %'; }, nomX: _tr('Partie', 'Game'), fmtX: function(v){ return '#' + v; }, aria: _tr('Score glissant', 'Rolling score') }) + '<div class="gr-sous">' + _tr('Ton score sur tes 10 dernières parties, partie après partie.', 'Your score over your last 10 games, game after game.') + '</div>' : '')
    + '<div class="lab-actions"><button class="ctrl-btn" onclick="showPage(\'stats\')">' + _tr('Toutes mes statistiques →', 'All my statistics →') + '</button></div></div>';
}
</script>
