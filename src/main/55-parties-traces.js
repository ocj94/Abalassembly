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
   [numero MiGs, date (AAAA-MM-JJ, '' inconnue), Noirs, Blancs, disposition ('' inconnue), source]
═══════════════════════════════════════════ */
const PARTIES_TRACES = [
  [5567, '2011-03-24', 'aploye', 'AbaIone', 'belgian', 'banque'],
  [6826, '2011-05-20', 'Olanzapine', 'Rastaman', 'belgian', 'banque'],
  [7409, '2011-07-03', 'claudie', 'Meo', 'belgian', 'banque'],
  [12833, '2012-04-30', 'jeff costa', 'FightClub', 'belgian', 'banque'],
  [16733, '2012-11-29', 'TTTN', 'eobllor', 'belgian', 'banque'],
  [18312, '2013-02-24', 'alain', 'Cogito', 'belgian', 'banque'],
  [19133, '2013-04-22', 'Pom', 'wasabi', 'belgian', 'banque'],
  [19410, '2013-05-13', 'jeff costa', 'vivelone', 'belgian', 'banque'],
  [20007, '2013-07-02', 'bulletproof', 'alain', 'belgian', 'banque'],
  [20597, '2013-09-19', 'det', 'mcdo', 'belgian', 'banque'],
  [20948, '2013-11-16', 'Gramgroum', 'claudie', 'belgian', 'banque'],
  [20969, '2013-11-21', 'jeff costa', 'xis', 'belgian', 'banque'],
  [21001, '2013-12-01', 'Milano', 'KALVINH', 'belgian', 'banque'],
  [21764, '2014-03-26', 'KALVINH', 'ewok', 'belgian', 'banque'],
  [21784, '2014-03-28', 'ewok', 'spectateur', 'belgian', 'banque'],
  [21823, '2014-04-01', 'Caipirinha_Lover', 'barca', 'belgian', 'banque'],
  [21830, '2014-04-02', 'Gandalf le Blanc', 'Greenfield', 'belgian', 'banque'],
  [21944, '2014-04-17', 'jeff costa', 'alain', 'belgian', 'banque'],
  [26599, '2016-06-03', 'ApocalypticA', 'boulet', 'belgian', 'Restons simples !'],
  [29001, '', 'boulet', 'MLA (IA) - max', '', 'À vous les manettes !'],
  [29844, '', '', '', '', 'Dans 10 jours, ce problème s’auto-détruira'],
  [32716, '2016-12-31', 'Gengis Khan', 'boulet', 'belgian', 'Le triangle impuissant'],
  [32792, '', 'KALVINH', 'boulet', '', ''],
  [33170, '2017-01-12', 'MLA (IA) - max', 'boulet', 'belgian', 'Il peut le faire !'],
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
    return !q || (t[0] + ' ' + t[2] + ' ' + t[3] + ' ' + t[4] + ' ' + t[5]).toLowerCase().indexOf(q) >= 0;
  });
  if (!T.length) return '';
  const avec = T.filter(function(t){ return _ptRang(t[0]) >= 0; }).length;
  let h = '<details' + (q ? ' open' : '') + ' style="margin:2px 4px 8px;border:1px solid var(--border);border-radius:8px;padding:6px 8px"><summary style="cursor:pointer;font-size:12px;color:var(--gold)">📜 '
    + _tr('Parties de MiGs citées par le blog Abalone Online', 'MiGs games cited by the Abalone Online blog') + ' · ' + T.length + (avec ? _tr(' (dont ' + avec + ' avec leurs coups)', ' (' + avec + ' with their moves)') : '') + '</summary>'
    + '<div style="font-size:11px;color:var(--muted);margin:6px 4px">' + _tr('Le serveur MiGs a fermé en 2017 avec sa base de parties. Ces parties citées sur le blog sont gardées en trace : numéro, date, joueurs. Si la base est retrouvée un jour, elles pourront être rejouées.',
      'The MiGs server closed in 2017 along with its game database. These games cited on the blog are kept as a trace: number, date, players. If the database is ever found, they can be replayed.') + '</div>';
  T.forEach(function(t){
    const r = _ptRang(t[0]), joueurs = (t[2] || t[3]) ? escapeHtml(t[2] || '?') + ' <span style="color:var(--muted)">vs</span> ' + escapeHtml(t[3] || '?') : '<span style="color:var(--muted)">' + _tr('joueurs inconnus', 'unknown players') + '</span>';
    const date = t[1] ? t[1].split('-').reverse().join('/') : _tr('date inconnue', 'unknown date');
    const dispo = t[4] ? (HEAT_VARIANT_LABEL[t[4]] || t[4]) : _tr('disposition inconnue', 'unknown layout');
    const droite = '<span style="color:var(--muted);font-size:11px;white-space:nowrap">N° ' + t[0] + ' · ' + escapeHtml(date) + '</span>';
    const sous = '<div style="color:var(--muted);font-size:11px">' + escapeHtml(dispo) + ' · ' + escapeHtml(_ptSource(t)) + ' · ' + (r >= 0 ? '<span style="color:var(--gold)">▶ ' + _tr('rejouable', 'replayable') + '</span>' : _tr('coups perdus', 'moves lost')) + '</div>';
    h += r >= 0
      ? '<div class="pt-trace" onclick="loadMigsGame(' + r + ')" onmouseover="this.style.background=\'var(--surface2)\'" onmouseout="this.style.background=\'\'" style="padding:7px 8px;border-radius:6px;cursor:pointer;font-size:13px"><div style="display:flex;justify-content:space-between;gap:10px"><span>' + joueurs + '</span>' + droite + '</div>' + sous + '</div>'
      : '<div class="pt-trace pt-perdue" style="padding:7px 8px;font-size:13px;opacity:.75"><div style="display:flex;justify-content:space-between;gap:10px"><span>' + joueurs + '</span>' + droite + '</div>' + sous + '</div>';
  });
  return h + '</details>';
}
</script>
