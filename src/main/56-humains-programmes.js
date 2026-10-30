/* ═══════════════════════════════════════════
   HUMAINS ET PROGRAMMES (v2.91)
   Demande d'ocj94 (« Go ») : reconnaitre les parties jouees contre un
   programme, pour pouvoir ne garder que les humains. 1 431 des 2 589 parties
   MiGs ont une IA dans un camp, et 73 des 93 parties du tournoi Yearly de
   PlayStrategy.
   Ce qui est reconnu, et d'ou on le sait :
   - PlayStrategy : l'export marque ses bots (P1Title / P2Title "BOT"). Dans
     le Yearly 2026, un seul : PST-Greedy-Tom. Les bots officiels du site
     s'appellent PS-... ou PST-... ;
   - MiGs : les comptes « MLA (IA) - max / medium / easy » et « IA de lolo »,
     qui le disent dans leur nom, et « π #0ABA10 » (un numero, 33 parties en
     9 jours, dont 8 contre MLA) -- celui-la reste a confirmer ;
   - parties de reference : Aba-Pro 8 (IA), MLAIA-max, les IA de KAAH.
   - AbalOnline : les comptes de programmes ne sont pas connus (Abadeus ?
     Trainer aba ?). Ses parties comptent comme humaines tant que Vincent ne
     l'a pas dit.
   Un compte dont le nom contient seulement « mla » (visiteurmla, mlachevrie)
   est un humain : la regle ne se fie qu'aux noms exacts ci-dessus.
═══════════════════════════════════════════ */
const IA_COMPTES = ['PST-Greedy-Tom', 'π #0ABA10', 'MLAIA-max'];
function estIA(nom){
  const n = String(nom || '');
  if (/\(IA\)/.test(n) || /^IA de /.test(n) || /^KAI\+\+ de KAAH/.test(n) || /^PST?-/.test(n)) return true;
  return IA_COMPTES.indexOf(n) >= 0;
}
// un nom de joueur pour la bibliotheque, suivi de 🤖 si c'est un programme
function _iaNom(nom){
  return escapeHtml(nom) + (estIA(nom) ? ' <span title="' + escapeHtml(_tr('Programme (IA)', 'Program (AI)')) + '">🤖</span>' : '');
}
/* Partie k de STATS_PARTIES (meme ordre que _sbBanques) : 1 si les Noirs sont un programme, 2 les Blancs,
   3 les deux, 0 aucun. Calcule une fois pour toutes les parties. */
let _iaCampsCache = null;
function _cfCampsIA(k){
  const B = _sbBanques(), cle = B.map(function(b){ return b.length; }).join('-');
  if (!_iaCampsCache || _iaCampsCache.cle !== cle) {
    const a = [];
    B.forEach(function(banque, s){ banque.forEach(function(g){
      const n = (s === 0 || s === 2) ? g[2] : g[1], b = (s === 0 || s === 2) ? g[3] : g[2];
      a.push((estIA(n) ? 1 : 0) + (estIA(b) ? 2 : 0));
    }); });
    _iaCampsCache = { cle: cle, a: a };
  }
  return _iaCampsCache.a[k] || 0;
}
/* Mes statistiques : « les vrais joueurs » ne comptent que les camps tenus par des humains -- toutes les
   parties, mais pas le camp d'un programme (sinon MLA, qui joue la moitie des parties MiGs, pesait autant que
   tous les humains reunis). Voir _sbAgreger. */
const SB_CAMPS_HUMAINS = { source: 'tout', dispo: 'tout', longueur: 'tout', periode: 'tout', joueurs: 'camps' };
