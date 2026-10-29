/* ═══════════════════════════════════════════
   BIBLIOTHEQUE : LES PARTIES MIGS CITEES, MEME SANS LEURS COUPS (v2.87)
   Demande de l'auteur (ocj94) : « Même si nous n'avons pas les coups, marque dans
   l'historique les parties. Les numéros de parties, des pseudos et les
   dates : au moins cela laissera une trace. »
   Le serveur MiGs (moggames.net) a fermé en 2017 avec sa base de parties
   (au moins 39 517 : c'est le plus grand numero de nos 2 589). Le blog
   officiel Abalone Online en citait certaines : sa « banque abalonienne »
   et ses problemes du mois. Liste relevee sur ce blog (pseudos seulement,
   jamais de nom reel). Deux d'entre elles sont dans nos parties, avec leurs
   coups (verifiees : memes joueurs, meme date, la partie va jusqu'au coup du
   probleme ; pour la 33170, au meme score 5-5 que le blog) ; les autres n'existent plus qu'ici, en trace.
   v2.89 : 12 de plus (v2.90 : une 13e, la 21470 en Araignee), relevees sur le blog par d'autres recherches (sa
   bibliotheque des variantes, ses articles et sa rubrique Records). Leurs
   dates ont ete controlees sur notre propre numerotation : chaque numero
   tombe le jour annonce entre nos parties voisines (29331 et 29334 le
   2016-09-03 pour la 29333, 33454 le 2017-01-17 pour la 33456...). Quand le
   blog ne donne que l'annee, le mois vient de ces voisines (29345 et 29744 :
   septembre 2016). Les 3 dont le blog publie les coups (« publies ») pourront
   etre reprises et verifiees par le moteur des qu'on aura leur texte.
   [numero MiGs, date (AAAA-MM-JJ, AAAA-MM ou '' inconnue), Noirs, Blancs,
    disposition (cle de HEAT_VARIANT_LABEL, nom MiGs en clair, ou '' inconnue), source, 'publies' ?]
═══════════════════════════════════════════ */
const PARTIES_TRACES = [
  [427, '2006-11-07', 'turlututu', 'picasso', 'Marguerite irlandaise', 'variantes'],
  [614, '2006-12-14', '', '', 'Cœurs croisés', 'variantes'],
  [2218, '2009-01-29', '', '', 'Damier', 'variantes'],
  [4916, '2011-02-28', 'atto', 'Caipirinha_Lover', 'snakes', 'article', 'publies'],
  [5567, '2011-03-24', 'aploye', 'AbaIone', 'belgian', 'banque'],
  [6826, '2011-05-20', 'Olanzapine', 'Rastaman', 'belgian', 'banque'],
  [7409, '2011-07-03', 'claudie', 'Meo', 'belgian', 'banque'],
  [10537, '2012-01-03', '', '', 'Def or Attack', 'variantes'],
  [11352, '2012-02-11', '', '', 'alliances', 'variantes'],
  [12833, '2012-04-30', 'jeff costa', 'FightClub', 'belgian', 'banque'],
  [16733, '2012-11-29', 'TTTN', 'eobllor', 'belgian', 'banque'],
  [18312, '2013-02-24', 'alain', 'Cogito', 'belgian', 'banque'],
  [18416, '2013-03-03', 'boulet', 'spectateur', 'belgian', 'article', 'publies'],
  [19133, '2013-04-22', 'Pom', 'wasabi', 'belgian', 'banque'],
  [19410, '2013-05-13', 'jeff costa', 'vivelone', 'belgian', 'banque'],
  [20007, '2013-07-02', 'bulletproof', 'alain', 'belgian', 'banque'],
  [20597, '2013-09-19', 'det', 'mcdo', 'belgian', 'banque'],
  [20948, '2013-11-16', 'Gramgroum', 'claudie', 'belgian', 'banque'],
  [20969, '2013-11-21', 'jeff costa', 'xis', 'belgian', 'banque'],
  [21001, '2013-12-01', 'Milano', 'KALVINH', 'belgian', 'banque'],
  [21470, '2014-02-24', '', '', 'Araignée', 'variantes'],   // v2.90
  [21764, '2014-03-26', 'KALVINH', 'ewok', 'belgian', 'banque'],
  [21784, '2014-03-28', 'ewok', 'spectateur', 'belgian', 'banque'],
  [21823, '2014-04-01', 'Caipirinha_Lover', 'barca', 'belgian', 'banque'],
  [21830, '2014-04-02', 'Gandalf le Blanc', 'Greenfield', 'belgian', 'banque'],
  [21944, '2014-04-17', 'jeff costa', 'alain', 'belgian', 'banque'],
  [26599, '2016-06-03', 'ApocalypticA', 'boulet', 'belgian', 'Restons simples !'],
  [29001, '', 'boulet', 'MLA (IA) - max', '', 'À vous les manettes !'],
  [29333, '2016-09-03', '', '', 'Aliennage', 'variantes'],
  [29345, '2016-09', 'Gengis Khan', 'MLA (IA)', 'snakes_variant', 'variantes'],
  [29713, '2016-09-17', '', '', 'Boutonnière', 'variantes'],
  [29744, '2016-09', 'MLA (IA)', 'ccc', 'alitration', 'variantes'],
  [29844, '', '', '', '', 'Dans 10 jours, ce problème s’auto-détruira'],
  [32716, '2016-12-31', 'Gengis Khan', 'boulet', 'belgian', 'Le triangle impuissant'],
  [32792, '', 'KALVINH', 'boulet', '', ''],
  [33170, '2017-01-12', 'MLA (IA) - max', 'boulet', 'belgian', 'Il peut le faire !'],
  [33456, '2017-01-17', 'ccc', 'MLA (IA)', 'face_a_face', 'records', 'publies'],
  [39052, '2017-05-20', 'Jefferson costa', 'MLA (IA) - medium', 'star', 'Uchronie']
];
let _ptRangs = null;
// numero MiGs -> rang dans MIGS_GAMES (la partie est-elle chez nous, avec ses coups ?)
function _ptRang(n){
  if (typeof MIGS_GAMES === 'undefined' || !MIGS_GAMES.length) return -1;
  if (!_ptRangs || _ptRangs.n !== MIGS_GAMES.length) { const m = new Map(); MIGS_GAMES.forEach(function(g, i){ m.set(String(g[0]), i); }); _ptRangs = { n: MIGS_GAMES.length, m: m }; }
  const r = _ptRangs.m.get(String(n)); return r === undefined ? -1 : r;
}
function _ptTrace(n){ return PARTIES_TRACES.find(function(t){ return t[0] === +n; }) || null; }
function _ptSource(t){
  if (t[5] === 'banque') return _tr('banque abalonienne du blog', 'the blog’s Abalone bank');
  if (t[5] === 'variantes') return _tr('bibliothèque des variantes du blog', 'the blog’s variants library');
  if (t[5] === 'article') return _tr('article du blog', 'blog article');
  if (t[5] === 'records') return _tr('rubrique Records du blog', 'the blog’s Records section');
  return t[5] ? _tr('problème du mois « ', 'problem of the month “') + t[5] + _tr(' »', '”') : _tr('citée par le blog', 'cited by the blog');
}
// le petit repere des parties de la bibliotheque citees par le blog
function _ptBadge(n){
  const t = _ptTrace(n); if (!t) return '';
  return ' <span title="' + escapeHtml(_tr('Citée par le blog Abalone Online : ', 'Cited by the Abalone Online blog: ') + _ptSource(t)) + '" style="color:var(--gold);font-size:11px">📌</span>';
}
// la section des parties citees, en tete de la bibliotheque (filtrees comme le reste ; aucune longueur connue)
function _ptHtml(q, variantFilter, lengthFilter){
  if (lengthFilter) return '';
  const T = PARTIES_TRACES.filter(function(t){
    if (variantFilter && t[4] !== variantFilter) return false;
    return !q || (t[0] + ' ' + t[2] + ' ' + t[3] + ' ' + t[4] + ' ' + (HEAT_VARIANT_LABEL[t[4]] || '') + ' ' + t[5]).toLowerCase().indexOf(q) >= 0;
  });
  if (!T.length) return '';
  const avec = T.filter(function(t){ return _ptRang(t[0]) >= 0; }).length;
  let h = '<details' + (q ? ' open' : '') + ' style="margin:2px 4px 8px;border:1px solid var(--border);border-radius:8px;padding:6px 8px"><summary style="cursor:pointer;font-size:12px;color:var(--gold)">📜 '
    + _tr('Parties de MiGs citées par le blog Abalone Online', 'MiGs games cited by the Abalone Online blog') + ' · ' + T.length + (avec ? _tr(' (dont ' + avec + ' avec leurs coups)', ' (' + avec + ' with their moves)') : '') + '</summary>'
    + '<div style="font-size:11px;color:var(--muted);margin:6px 4px">' + _tr('Le serveur MiGs a fermé en 2017 avec sa base de parties : plus de 12 000 en 2012, près de 40 000 à la fin. Ces parties citées sur le blog sont gardées en trace : numéro, date, joueurs. Si leurs coups sont retrouvés, elles pourront être rejouées.',
      'The MiGs server closed in 2017 along with its game database: over 12,000 games in 2012, nearly 40,000 by the end. These games cited on the blog are kept as a trace: number, date, players. If their moves are found, they can be replayed.') + '</div>';
  T.forEach(function(t){
    const r = _ptRang(t[0]), joueurs = (t[2] || t[3]) ? escapeHtml(t[2] || '?') + ' <span style="color:var(--muted)">vs</span> ' + escapeHtml(t[3] || '?') : '<span style="color:var(--muted)">' + _tr('joueurs inconnus', 'unknown players') + '</span>';
    const date = t[1] ? t[1].split('-').reverse().join('/') : _tr('date inconnue', 'unknown date');
    // v2.89 : « perdus » seulement quand on le sait ; les coups publies sur le blog attendent d'etre repris
    const etat = t[6] === 'publies' ? _tr('coups publiés sur le blog, pas encore repris', 'moves published on the blog, not yet added')
      : t[5] === 'variantes' ? _tr('coups non retrouvés', 'moves not found') : _tr('coups perdus', 'moves lost');
    const dispo = t[4] ? (HEAT_VARIANT_LABEL[t[4]] || t[4]) : _tr('disposition inconnue', 'unknown layout');
    const droite = '<span style="color:var(--muted);font-size:11px;white-space:nowrap">N° ' + t[0] + ' · ' + escapeHtml(date) + '</span>';
    const sous = '<div style="color:var(--muted);font-size:11px">' + escapeHtml(dispo) + ' · ' + escapeHtml(_ptSource(t)) + ' · ' + (r >= 0 ? '<span style="color:var(--gold)">▶ ' + _tr('rejouable', 'replayable') + '</span>' : etat) + '</div>';
    h += r >= 0
      ? '<div class="pt-trace" onclick="loadMigsGame(' + r + ')" onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\'\'" style="padding:7px 8px;border-radius:6px;cursor:pointer;font-size:13px"><div style="display:flex;justify-content:space-between;gap:10px"><span>' + joueurs + '</span>' + droite + '</div>' + sous + '</div>'
      : '<div class="pt-trace pt-perdue" style="padding:7px 8px;font-size:13px;opacity:.75"><div style="display:flex;justify-content:space-between;gap:10px"><span>' + joueurs + '</span>' + droite + '</div>' + sous + '</div>';
  });
  return h + '</details>';
}
</script>
