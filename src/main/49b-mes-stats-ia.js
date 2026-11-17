/* ═══════════════════════════════════════════
   MES STATISTIQUES : QUATRE LECTURES DE PLUS (v3.38)
   Demande d'ocj94 (« Tout », sur dix-huit propositions ; ici les nos 11 à 14).
   Tout vient de ce qui est déjà enregistré sur l'appareil : l'historique des parties (dont les notes
   que l'IA a données coup par coup, champ evals), le rejeu de tes parties déjà fait par
   computeEjectionStats, et tes défis du jour. Aucune partie n'est rejouée en plus, rien n'est estimé.
   11. Tes parties vues par l'IA : sa note au fil de la partie, tes renversements et tes remontées.
   12. Comment finissent tes parties : la raison de la fin, et le score final, à côté du corpus.
   13. Le détail de tes poussées : 2 contre 1, 3 contre 1, 3 contre 2, face aux vrais joueurs.
   14. Ton calendrier et tes défis du jour.
   Les filtres de la page (période, type de partie) s'appliquent : _msParties() les a déjà passés.
═══════════════════════════════════════════ */
const MP_BILLE = 1000;        // points de l'évaluation : une bille (evaluateBoard, material et capScore)
const MP_AVANCE = 1500;       // « mener nettement » : une bille et demie, de quoi écarter le bruit d'évaluation
const MP_MOIS = 12;           // le calendrier couvre les 12 derniers mois

/* Les parties dont l'IA a noté au moins deux coups, vues de TON côté.
   evals[i] = [note, profondeur, ms, phase] ou 0 ; la note est du point de vue de l'IA : on la retourne. */
function _mpPartiesNotees(L) {
  return (L || []).filter(function (e) { return e && e.evals && e.mode === 'ai'; }).map(function (e) {
    const pts = [];
    e.evals.forEach(function (v, i) {
      if (!v || typeof v[0] !== 'number' || Math.abs(v[0]) >= 90000) return;
      pts.push([i, -v[0]]);   // de ton côté : positif = tu es mieux placé
    });
    if (pts.length < 2) return null;
    const notes = pts.map(function (p) { return p[1]; });
    const max = Math.max.apply(null, notes), min = Math.min.apply(null, notes);
    // le coup du basculement : le dernier passage durable d'un côté à l'autre de zéro
    let bascule = null;
    for (let i = 1; i < pts.length; i++) if ((pts[i - 1][1] > 0) !== (pts[i][1] > 0)) bascule = pts[i][0];
    const r = (typeof _msResultat === 'function') ? _msResultat(e) : null;
    return { id: e.id, date: e.date, pts: pts, max: max, min: min, fin: notes[notes.length - 1], bascule: bascule, resultat: r, coups: e.moveCount || 0 };
  }).filter(Boolean);
}

/* ═══ 11. Tes parties vues par l'IA ═══ */
function _mpHtmlVueIA(L, W) {
  const P = _mpPartiesNotees(L);
  let h = '<div class="gr-titre">' + _tr('Tes parties vues par l’IA', 'Your games as the AI saw them') + '</div>';
  if (!P.length) return h + '<div class="gr-vide">' + _tr('Aucune partie contre l’IA avec ses notes. Joue une partie contre elle : chaque coup qu’elle calcule laisse sa note.',
    'No game against the AI with its scores. Play a game against it: every move it works out leaves its score.') + '</div>';
  const perdues = P.filter(function (p) { return p.resultat === 'defaite' && p.max >= MP_AVANCE; });
  const gagnees = P.filter(function (p) { return p.resultat === 'victoire' && p.min <= -MP_AVANCE; });
  const bascules = P.map(function (p) { return p.bascule; }).filter(function (x) { return x != null; });
  h += '<div class="gr-sous">' + _tr('L’IA note chaque position pendant qu’elle réfléchit. Ces notes sont gardées avec la partie ; les voici de ton côté : au-dessus de zéro, l’IA te voyait mieux placé. Mille points valent une bille.',
    'The AI scores every position while it thinks. Those scores are kept with the game; here they are from your side: above zero, the AI saw you as better placed. A thousand points are worth one marble.') + '</div>';
  h += grTuiles([
    { lab: _tr('Parties notées', 'Scored games'), v: grNb(P.length), sous: _tr('sur ', 'out of ') + grNb(L.length) + _tr(' parties retenues par les filtres', ' games kept by the filters') },
    { lab: _tr('Avance perdue', 'Lead thrown away'), v: grNb(perdues.length), sous: _tr('tu menais d’au moins une bille et demie, et tu as perdu', 'you led by at least a marble and a half, and lost') },
    { lab: _tr('Remontées', 'Comebacks'), v: grNb(gagnees.length), sous: _tr('tu étais mené d’autant, et tu as gagné', 'you were behind by as much, and won') },
    { lab: _tr('Le coup qui bascule', 'The move that tips it'), v: bascules.length ? grNb(grQuantile(bascules.slice().sort(function (a, b) { return a - b; }), 0.5), 0) : '—',
      sous: _tr('médiane du dernier changement de camp', 'median of the last change of side') }
  ]);
  // la dernière partie notée, coup par coup
  const d = P[0];
  h += '<div class="gr-sous" style="margin-top:8px">' + _tr('Ta dernière partie notée, le ', 'Your last scored game, ') + new Date(d.date).toLocaleDateString(currentLang() === 'EN' ? 'en-GB' : 'fr-FR')
    + (d.resultat ? ' (' + _tr(d.resultat === 'victoire' ? 'gagnée' : (d.resultat === 'defaite' ? 'perdue' : 'nulle'), d.resultat === 'victoire' ? 'won' : (d.resultat === 'defaite' ? 'lost' : 'drawn')) + ')' : '') + '</div>';
  h += grLignes(W, [{ nom: _tr('Note de l’IA, de ton côté', 'AI score, from your side'), couleur: d.resultat === 'defaite' ? GR_NEG : GR_POS, pts: d.pts, points: d.pts.length <= 40 }],
    { h: 150, zero: true, gauche: 44, nomX: _tr('Demi-coup', 'Ply'), fmtY: function (v) { return grNb(v / MP_BILLE, 1); },
      fmtTip: function (v, sr, x) { return _tr('demi-coup ', 'ply ') + x + _dimDp() + (v > 0 ? '+' : '') + grNb(v / MP_BILLE, 2) + _tr(' bille', ' marble'); },
      aria: _tr('Note de l’IA au fil de ta dernière partie', 'AI score over your last game') });
  h += '<div class="gr-sous">' + _tr('En billes : +1 veut dire que l’IA t’estimait une bille devant. Elle ne note que les positions qu’elle a calculées : un coup joué depuis son livre d’ouvertures ne laisse pas de note.',
    'In marbles: +1 means the AI reckoned you a marble ahead. It only scores the positions it has worked out: a move played from its opening book leaves no score.') + '</div>';
  // ta meilleure et ta pire note, partie par partie
  if (P.length >= 2) {
    const O = P.slice().reverse();   // de la plus ancienne à la plus récente
    h += '<div class="gr-titre">' + _tr('Ton meilleur et ton pire moment, partie par partie', 'Your best and worst moment, game by game') + '</div>'
      + grLignes(W, [
        { nom: _tr('ton meilleur moment', 'your best moment'), couleur: GR_POS, pts: O.map(function (p, i) { return [i + 1, Math.round(p.max / MP_BILLE * 100) / 100]; }), points: O.length <= 40 },
        { nom: _tr('ton pire moment', 'your worst moment'), couleur: GR_NEG, pts: O.map(function (p, i) { return [i + 1, Math.round(p.min / MP_BILLE * 100) / 100]; }), points: O.length <= 40 }
      ], { h: 150, zero: true, gauche: 40, nomX: _tr('Partie', 'Game'), fmtX: function (v) { return '#' + v; }, fmtY: function (v) { return grNb(v, 1); },
        aria: _tr('Meilleure et pire note par partie', 'Best and worst score per game') })
      + '<div class="gr-sous">' + _tr('En billes, de ton côté. Deux courbes qui se resserrent autour de zéro : des parties plus équilibrées.',
        'In marbles, from your side. Two curves closing in on zero: more balanced games.') + '</div>';
  }
  return h;
}

/* ═══ 12. Comment finissent tes parties ═══ */
const MP_FINS = [['capture', 'six billes éjectées', 'six marbles pushed off'], ['resign', 'abandon', 'resignation'], ['timeout', 'temps écoulé', 'time out'],
  ['draw', 'nulle', 'draw'], ['repetition', 'position répétée', 'repeated position'], ['stop', 'partie arrêtée', 'game stopped']];
function _mpHtmlFins(L, W) {
  let h = '<div class="gr-titre">' + _tr('Comment finissent tes parties', 'How your games end') + '</div>';
  const F = {}; let n = 0;
  L.forEach(function (e) { if (!e.reason && !e.winner) return; const k = String(e.reason || 'autre'); F[k] = (F[k] || 0) + 1; n++; });
  if (!n) return h + '<div class="gr-vide">' + _tr('Aucune partie terminée dans la période choisie.', 'No finished game in the chosen period.') + '</div>';
  const connues = MP_FINS.filter(function (x) { return F[x[0]]; }).map(function (x) { return { nom: _tr(x[1], x[2]), v: F[x[0]] }; });
  const reste = Object.keys(F).filter(function (k) { return !MP_FINS.some(function (x) { return x[0] === k; }); }).reduce(function (a, k) { return a + F[k]; }, 0);
  h += grPile(connues.concat(reste ? [{ nom: _tr('autre', 'other'), v: reste }] : []), {});
  // le score final : tes billes faites contre tes billes perdues, d'après le rejeu déjà fait
  const ej = (typeof _msDernier !== 'undefined' && _msDernier.ej) ? _msDernier.ej : null;
  const P = (ej && ej.parties) || [];
  if (P.length) {
    const ids = {}; L.forEach(function (e) { ids[e.id] = 1; });
    const Q = P.filter(function (x) { return ids[x.id]; });
    if (Q.length) {
      const G = []; for (let i = 0; i < 7; i++) { G.push([]); for (let j = 0; j < 7; j++) G[i].push(0); }
      Q.forEach(function (x) { G[Math.min(6, x.faites || 0)][Math.min(6, x.subies || 0)]++; });
      const et = ['0', '1', '2', '3', '4', '5', '6'];
      h += '<div class="gr-titre">' + _tr('Ton score final', 'Your final score') + '</div><div class="gr-sous">'
        + _tr('Les billes que tu as fait tomber (lignes) contre celles que tu as perdues (colonnes), sur ' + grNb(Q.length) + ' parties rejouées.',
          'The marbles you pushed off (rows) against those you lost (columns), over ' + grNb(Q.length) + ' replayed games.') + '</div>'
        + grCarte(et, et, function (i, j) {
          const v = G[i][j];
          return { v: v, txt: v ? grNb(v) : '', tip: _tr('Tu fais ', 'You take ') + i + _tr(', tu perds ', ', you lose ') + j + _dimDp() + grNb(v) + _tr(' parties', ' games') };
        }, { legende: [_tr('rare', 'rare'), _tr('fréquent', 'frequent')] });
      // les parties gagnées 6-x, à côté du corpus
      const mes = [0, 0, 0, 0, 0, 0]; let nG = 0;
      Q.forEach(function (x) { if ((x.faites || 0) >= 6 && (x.subies || 0) < 6) { mes[Math.min(5, x.subies || 0)]++; nG++; } });
      const v = (typeof _sbAgreger === 'function') ? _sbAgreger() : null;
      const tot = v && v.finals ? v.finals.reduce(function (a, b) { return a + b; }, 0) : 0;
      if (nG >= 3 && tot) {
        h += '<div class="gr-sous" style="margin-top:8px">' + _tr('Quand tu gagnes à six billes : combien l’adversaire en avait pris, à côté des vraies parties du corpus.',
          'When you win at six marbles: how many the opponent had taken, next to the real corpus games.') + '</div>'
          + grLignes(W, [
            { nom: _tr('toi', 'you'), couleur: GR_OR, pts: mes.map(function (x, i) { return [i, Math.round(1000 * x / nG) / 10]; }), points: true },
            { nom: _tr('vrais joueurs', 'real players'), couleur: GR_REF, pts: v.finals.map(function (x, i) { return [i, Math.round(1000 * x / tot) / 10]; }), points: true }
          ], { h: 150, gauche: 38, yMin: 0, ticksX: [0, 1, 2, 3, 4, 5], nomX: _tr('billes du perdant', 'loser’s marbles'), fmtY: function (x) { return grNb(x) + ' %'; },
            aria: _tr('Score des parties gagnées à six billes', 'Score of games won at six marbles') })
          + '<div class="gr-sous">' + grNb(nG) + _tr(' de tes parties gagnées à six billes · corpus : ', ' of your games won at six marbles · corpus: ') + grNb(tot) + _tr(' parties', ' games') + grPeu(nG) + '</div>';
      }
    }
  }
  return h;
}

/* ═══ 13. Le détail de tes poussées ═══ */
const MP_POUSSEES = [['2 contre 1', '2 against 1'], ['3 contre 1', '3 against 1'], ['3 contre 2', '3 against 2']];
function _mpHtmlPoussees(W) {
  const ej = (typeof _msDernier !== 'undefined' && _msDernier.ej) ? _msDernier.ej : null;
  const p = ej && ej.poussees;
  let h = '<div class="gr-titre">' + _tr('Le détail de tes poussées', 'Your pushes in detail') + '</div>';
  const tot = p ? p[0] + p[1] + p[2] : 0;
  if (!tot) return h + '<div class="gr-vide">' + _tr('Aucune poussée dans tes parties rejouées.', 'No push in your replayed games.') + '</div>';
  const v = (typeof _sbAgreger === 'function') ? _sbAgreger() : null;
  const C = v && v.poussees ? v.poussees.types : null, totC = C ? C[0] + C[1] + C[2] : 0;
  h += '<div class="gr-sous">' + _tr('Une poussée pousse une ou deux billes adverses. Voici comment les tiennes se répartissent, et combien éjectent.',
    'A push shoves one or two opposing marbles. Here is how yours break down, and how many push a marble off.') + '</div>';
  h += grBarres(MP_POUSSEES.map(function (x, i) {
    return { lab: _tr(x[0], x[1]), v: p[i] / tot, couleur: GR_SERIES[i], txt: grPct(p[i] / tot) + ' · ' + grNb(p[i]) + (C ? ' · ' + _tr('corpus ', 'corpus ') + grPct(C[i] / totC) : ''),
      ref: C ? C[i] / totC : null, tip: _tr(x[0], x[1]) + _dimDp() + grNb(p[i]) + _tr(' poussées, dont ', ' pushes, of which ') + grNb(p[i + 3]) + _tr(' éjectent', ' push a marble off') };
  }), { max: 1 });
  h += '<div class="gr-titre">' + _tr('Celles qui éjectent', 'The ones that push a marble off') + '</div>'
    + grBarres(MP_POUSSEES.map(function (x, i) {
      const r = p[i] ? p[i + 3] / p[i] : 0, rc = (C && C[i]) ? C[i + 3] / C[i] : null;
      return { lab: _tr(x[0], x[1]), v: r, couleur: GR_SERIES[i], ref: rc, txt: grPct(r) + (rc != null ? ' · ' + _tr('corpus ', 'corpus ') + grPct(rc) : ''),
        tip: _tr(x[0], x[1]) + _dimDp() + grNb(p[i + 3]) + _tr(' éjections sur ', ' ejections out of ') + grNb(p[i]) + _tr(' poussées', ' pushes') };
    }), { max: 1 });
  h += '<div class="gr-sous">' + (C ? _tr('Le repère sur chaque barre : les vrais joueurs du corpus (camps humains). ', 'The mark on each bar: the corpus’s real players (human sides). ') : '')
    + _tr('Une poussée à 3 contre 1 ne peut pas être contrée ; à 2 contre 1 et 3 contre 2, l’adversaire peut souvent se dégager.',
      'A 3-against-1 push cannot be met; at 2 against 1 and 3 against 2, the opponent can often get clear.') + '</div>';
  return h;
}

/* ═══ 14. Ton calendrier et tes défis du jour ═══ */
// Le calendrier : une case par jour sur les 12 derniers mois, le nombre de parties de ce jour-là.
function _mpCalendrier(L) {
  const J = {};
  L.forEach(function (e) {
    const d = new Date(e.date); if (isNaN(d)) return;
    const k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    J[k] = (J[k] || 0) + 1;
  });
  return J;
}
function _mpHtmlCalendrier(L, W) {
  const J = _mpCalendrier(L), jours = Object.keys(J).length;
  let h = '<div class="gr-titre">' + _tr('Ton calendrier', 'Your calendar') + '</div>';
  if (!jours) return h + '<div class="gr-vide">' + _tr('Aucune partie datée dans la période choisie.', 'No dated game in the chosen period.') + '</div>';
  // les 12 derniers mois, en lignes ; les jours du mois en colonnes
  const maint = new Date(), lignes = [], cles = [];
  for (let m = MP_MOIS - 1; m >= 0; m--) {
    const d = new Date(maint.getFullYear(), maint.getMonth() - m, 1);
    lignes.push(d.toLocaleDateString(currentLang() === 'EN' ? 'en-GB' : 'fr-FR', { month: 'short', year: '2-digit' }));
    cles.push([d.getFullYear(), d.getMonth()]);
  }
  const colonnes = []; for (let j = 1; j <= 31; j++) colonnes.push(j % 5 === 0 || j === 1 ? String(j) : '');
  const total = L.length;
  h += '<div class="gr-sous">' + _tr('Une case par jour sur les 12 derniers mois : ' + grNb(total) + ' parties sur ' + grNb(jours) + ' jours.',
    'One cell per day over the last 12 months: ' + grNb(total) + ' games on ' + grNb(jours) + ' days.') + '</div>';
  h += '<div class="mp-cal">' + grCarte(lignes, colonnes, function (i, j) {
    const a = cles[i][0], m = cles[i][1], jour = j + 1;
    const d = new Date(a, m, jour);
    if (d.getMonth() !== m) return { v: null, txt: '' };   // ce mois n'a pas ce jour
    const k = a + '-' + String(m + 1).padStart(2, '0') + '-' + String(jour).padStart(2, '0');
    const v = J[k] || 0;
    return { v: v || null, txt: '', tip: d.toLocaleDateString(currentLang() === 'EN' ? 'en-GB' : 'fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + _dimDp() + grNb(v) + _tr(' parties', ' games') };
  }, { echelle: 'or', legende: [_tr('aucune partie', 'no game'), _tr('beaucoup', 'many')] }) + '</div>';
  return h;
}
function _mpHtmlDefis(W) {
  let h = '<div class="gr-titre">' + _tr('Tes défis du jour', 'Your daily challenges') + '</div>';
  const D = (typeof progress !== 'undefined' && progress && progress.defis) ? progress.defis : null;
  const N = D ? Object.keys(D).map(Number).filter(function (n) { return D[n] && D[n].f; }) : [];
  if (!N.length) return h + '<div class="gr-vide">' + _tr('Aucun défi terminé pour l’instant.', 'No challenge finished yet.') + '</div>';
  const trouves = N.filter(function (n) { return D[n].f === 'v'; });
  const sansIndice = trouves.filter(function (n) { return D[n].e.indexOf('i') < 0; });
  const duPremier = trouves.filter(function (n) { return D[n].e.indexOf('x') < 0 && D[n].e.indexOf('i') < 0; });
  const ms = trouves.map(function (n) { return D[n].ms; }).filter(function (x) { return x > 0; }).sort(function (a, b) { return a - b; });
  h += grTuiles([
    { lab: _tr('Défis terminés', 'Challenges finished'), v: grNb(N.length), sous: grNb(trouves.length) + _tr(' trouvés · ', ' solved · ') + grNb(N.length - trouves.length) + _tr(' solutions affichées', ' solutions shown') },
    { lab: _tr('Du premier coup', 'First try'), v: trouves.length ? grPct(duPremier.length / trouves.length) : '—', sous: _tr('sans erreur ni indice', 'no mistake, no hint') },
    { lab: _tr('Sans indice', 'Without a hint'), v: trouves.length ? grPct(sansIndice.length / trouves.length) : '—', sous: grNb(sansIndice.length) + _tr(' défis sur ', ' challenges out of ') + grNb(trouves.length) },
    { lab: _tr('Temps médian', 'Median time'), v: ms.length ? _msTexte(grQuantile(ms, 0.5)) : '—', sous: _tr('passé sur le puzzle, quand il est affiché', 'spent on the puzzle, while it is shown') }
  ]);
  // combien d'essais avant de trouver
  const B = [0, 0, 0, 0, 0];
  trouves.forEach(function (n) { const x = (D[n].e.match(/x/g) || []).length; B[Math.min(4, x)]++; });
  h += '<div class="gr-sous">' + _tr('Combien de mauvais coups avant de trouver.', 'How many wrong moves before finding it.') + '</div>'
    + grColonnes(W, B.map(function (v, i) {
      return { lab: i === 4 ? '4+' : String(i), v: v, tip: (i === 4 ? _tr('4 erreurs ou plus', '4 mistakes or more') : i + _tr(' erreur', ' mistake') + (i > 1 ? 's' : '')) + _dimDp() + grNb(v) + _tr(' défis', ' challenges') };
    }), { h: 130, gauche: 30, titreX: _tr('mauvais coups', 'wrong moves'), aria: _tr('Erreurs avant de trouver le défi', 'Mistakes before solving the challenge') });
  // la série en cours, si la fonction du module des défis est là
  if (typeof defiSerie === 'function') {
    const s = defiSerie();
    h += '<div class="gr-sous">' + _tr('Série en cours : ', 'Current streak: ') + grNb(s) + _tr(' jour', ' day') + (s > 1 ? 's' : '')
      + _tr(' d’affilée avec le défi du jour trouvé, sans afficher la solution.', ' in a row with the day’s challenge solved, without showing the solution.') + '</div>';
  }
  return h;
}

/* ═══ Le bloc entier, posé par renderMesStatsPlus ═══ */
let _mpCorpusDemande = false;
function mesStatsIaHtml(L, W) {
  // les comparaisons au corpus (score final, poussées) ont besoin des statistiques des parties :
  // chargées à la demande, une seule fois, puis la page se redessine avec elles
  if (!_mpCorpusDemande && typeof ensureStatsParties === 'function' && (typeof STATS_PARTIES === 'undefined' || !STATS_PARTIES)) {
    _mpCorpusDemande = true;
    try {
      ensureStatsParties().then(function (ok) {
        const hote = document.getElementById('ms-ia');
        if (!ok || !hote) return;
        const W2 = grLargeur(document.getElementById('ms-plus'), 640) - 40;
        hote.innerHTML = '<div class="ms-carte-t">' + _tr('Mes parties, vues de plus près', 'My games, looked at more closely') + '</div>' + mesStatsIaHtml(_msParties(), W2);
      });
    } catch (e) {}
  }
  return _mpHtmlVueIA(L, W) + _mpHtmlFins(L, W) + _mpHtmlPoussees(W) + _mpHtmlCalendrier(L, W) + _mpHtmlDefis(W);
}
