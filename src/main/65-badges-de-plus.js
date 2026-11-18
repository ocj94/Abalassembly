/* ═══════════════════════════════════════════
   NEUF BADGES DE PLUS  (v3.45)
   Demande d'ocj94 : l'application concurrente en annonce vingt, le site en
   avait onze. Les neuf qui suivent ne sont pas des paliers de plus sur les
   memes compteurs — ils recompensent ce que les ecrans construits ces jours-ci
   savent mesurer : une remontee vue par l'IA, la campagne, la serie de defis,
   le Labo.

   Chaque badge est attribue a partir de donnees DEJA enregistrees, jamais d'un
   compteur nouveau : rien a migrer, et un badge gagne hier se debloque au
   prochain passage. La remontee, en particulier, est lue avec la fonction meme
   de « Mes statistiques » (_mpPartiesNotees) : le badge et la page ne peuvent
   donc pas se contredire.
═══════════════════════════════════════════ */
const BP_VITE = 25;        // « expeditive » : 25 coups ou moins
const BP_LONGUE = 80;      // « marathon » : 80 coups ou plus
const BP_PLATEAUX = 5;     // « touriste » : cinq dispositions gagnees
const BP_SERIE = 10;       // « dix jours de suite »
const BP_GEN = 5;          // « apprenti chercheur » : cinquieme generation du Labo
const BP_PUZZLES = 50;     // « casse-tete confirme »

const BADGES_PLUS = [
  { id: 'comeback',      icon: '🔄', name: 'Remontée',            desc: 'Gagner une partie où l’IA te voyait mené d’au moins une bille et demie' },
  { id: 'quick_win',     icon: '💨', name: 'Expéditive',          desc: 'Gagner en ' + BP_VITE + ' coups ou moins' },
  { id: 'long_game',     icon: '🏃', name: 'Marathon',            desc: 'Gagner une partie de ' + BP_LONGUE + ' coups ou plus' },
  { id: 'variantes5',    icon: '🎲', name: 'Touriste',            desc: 'Gagner sur ' + BP_PLATEAUX + ' dispositions de départ différentes' },
  { id: 'camp_chapitre', icon: '⚔️', name: 'Premier chapitre',    desc: 'Battre les six premiers adversaires de la campagne' },
  { id: 'camp_fin',      icon: '🎓', name: 'Grand Maître',        desc: 'Battre les vingt-quatre adversaires de la campagne' },
  { id: 'defi_serie10',  icon: '📆', name: 'Dix jours de suite',  desc: BP_SERIE + ' défis du jour réussis d’affilée' },
  { id: 'lab_gen5',      icon: '🧪', name: 'Apprenti chercheur',  desc: 'Le Labo atteint sa ' + BP_GEN + 'e génération' },
  { id: 'puzzle50',      icon: '🧠', name: 'Casse-tête confirmé', desc: 'Résoudre ' + BP_PUZZLES + ' problèmes' }
];

/* Les neuf rejoignent la table existante : la page du profil, le compte
   « x / 20 » et la synchronisation les traitent comme les autres, sans une
   ligne de plus ailleurs. */
(function () {
  if (typeof BADGES === 'undefined') return;
  BADGES_PLUS.forEach(function (b) {
    if (!BADGES.some(function (x) { return x.id === b.id; })) BADGES.push(b);
  });
})();

/* ── Ce qui se juge sur la partie qui vient de finir ── */
/* La partie archivee est passee en argument par triggerWin : la relire dans
   l'historique serait doublement faux -- la plus recente y est EN TETE, et si
   rien n'a ete archive (aucun coup joue) on jugerait la partie d'avant. Sans
   cet argument, donc, aucun badge de partie. */
function badgesPlusFinDePartie(jeGagne, partie) {
  if (!jeGagne || !partie || typeof awardBadge !== 'function') return [];
  const gagnes = [];
  const H = (typeof getGameHistory === 'function') ? getGameHistory() : [];
  const derniere = partie;
  const coups = derniere.moveCount || 0;

  if (coups > 0 && coups <= BP_VITE && awardBadge('quick_win')) gagnes.push('quick_win');
  if (coups >= BP_LONGUE && awardBadge('long_game')) gagnes.push('long_game');

  /* La remontee : lue avec la fonction de « Mes statistiques », pas avec une
     regle recopiee. min <= -1500 veut dire que l'IA t'a vu mene d'au moins une
     bille et demie a un moment de la partie. */
  if (derniere && typeof _mpPartiesNotees === 'function' && typeof MP_AVANCE !== 'undefined') {
    const P = _mpPartiesNotees([derniere]);
    if (P.length && P[0].min <= -MP_AVANCE && awardBadge('comeback')) gagnes.push('comeback');
  }

  /* Touriste : cinq dispositions de depart differentes gagnees. On recompte
     l'historique a chaque fois plutot que de tenir un compteur : une partie
     effacee ne doit pas laisser un badge sans justification. */
  const estMoi = (typeof estMaPartie === 'function') ? estMaPartie : function () { return true; };
  const plateaux = {};
  H.forEach(function (g) {
    if (!estMoi(g) || !g.variant) return;
    if (g.winner && g.winner === (g.humanColor || 'black')) plateaux[g.variant] = 1;
  });
  if (Object.keys(plateaux).length >= BP_PLATEAUX && awardBadge('variantes5')) gagnes.push('variantes5');
  return gagnes;
}

/* ── Ce qui se juge sur l'etat enregistre ── */
function badgesPlusCompteurs() {
  if (typeof awardBadge !== 'function') return [];
  const gagnes = [];
  if (typeof progress !== 'undefined' && progress && progress.puzzlesSolved >= BP_PUZZLES && awardBadge('puzzle50')) gagnes.push('puzzle50');
  if (typeof defiSerie === 'function' && defiSerie() >= BP_SERIE && awardBadge('defi_serie10')) gagnes.push('defi_serie10');
  /* Le Labo : on lit la generation sans passer par labLoad(), qui migre l'etat
     et le reecrit — un badge n'a pas a toucher a l'etat du Labo. */
  try {
    const s = JSON.parse(localStorage.getItem('abaLabState') || 'null');
    if (s && s.gen >= BP_GEN && awardBadge('lab_gen5')) gagnes.push('lab_gen5');
  } catch (e) { /* pas d'etat du Labo : rien a faire */ }
  if (typeof campVictoires === 'function') {
    const n = campVictoires();
    if (n >= 6 && awardBadge('camp_chapitre')) gagnes.push('camp_chapitre');
    if (typeof CAMPAGNE !== 'undefined' && n >= CAMPAGNE.length && awardBadge('camp_fin')) gagnes.push('camp_fin');
  }
  return gagnes;
}
