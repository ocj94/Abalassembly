/* ═══ Pseudos retirés des parties publiées (v3.26, RGPD) ════════════════════════════════
   Le site publie des milliers de parties d'archives (MiGs, Abalone Online, tournois
   PlayStrategy, parties de référence) avec le pseudo de leurs joueurs. Un pseudo est une
   donnée personnelle : on les publie au titre de l'intérêt légitime (archives de parties
   jouées en public, utiles à l'étude du jeu), et chaque joueur peut s'y opposer
   (RGPD, art. 21), sans avoir à se justifier.

   Pour retirer un joueur : ajouter son pseudo, tel qu'il apparaît, à PSEUDOS_RETIRES
   (majuscules et accents ignorés), reconstruire le site (node tools/build.js). Partout où
   le site affiche ces parties, il devient « Joueur retiré ». Les coups restent : la partie
   ne dit plus qui l'a jouée. Penser aussi aux fichiers du dossier games/ (games/README.md). */
const PSEUDOS_RETIRES = [
  // 'pseudo',   // date de la demande
];
const PSEUDO_RETIRE = 'Joueur retiré';
function _pseudoCle(n) { return String(n == null ? '' : n).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase(); }
let _pseudosRetiresSet = null;
function pseudoEstRetire(n) {
  if (!_pseudosRetiresSet) _pseudosRetiresSet = new Set(PSEUDOS_RETIRES.map(_pseudoCle).filter(Boolean));
  return !!n && _pseudosRetiresSet.has(_pseudoCle(n));
}
/* Remplace, dans chaque partie de liste, les pseudos retirés des colonnes indices ; dans les
   colonnes textes (« X gagne »…), le pseudo est remplacé là où il apparaît. Deux joueurs
   retirés dans la même partie restent distincts (« Joueur retiré », « Joueur retiré 2 »),
   pour que le vainqueur reste juste. Renvoie le nombre de champs changés. */
function anonymiserParties(liste, indices, textes) {
  if (!Array.isArray(liste) || !PSEUDOS_RETIRES.length) return 0;
  let n = 0;
  liste.forEach(function (g) {
    if (!Array.isArray(g)) return;
    const vus = new Map();
    const etiquette = function (v) {
      const k = _pseudoCle(v);
      if (!vus.has(k)) vus.set(k, vus.size ? PSEUDO_RETIRE + ' ' + (vus.size + 1) : PSEUDO_RETIRE);
      return vus.get(k);
    };
    indices.forEach(function (i) {
      if (typeof g[i] === 'string' && pseudoEstRetire(g[i])) { const v = etiquette(g[i]); if (v !== g[i]) { g[i] = v; n++; } }
    });
    (textes || []).forEach(function (i) {
      if (typeof g[i] !== 'string') return;
      let t = g[i];
      PSEUDOS_RETIRES.forEach(function (p) {
        // le pseudo entier seulement (« Bob » ne touche pas « Bobby »)
        const re = new RegExp('(?<![\\p{L}\\p{N}_])' + String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?![\\p{L}\\p{N}_])', 'giu');
        if (re.test(t)) t = t.replace(re, etiquette(p));
      });
      if (t !== g[i]) { g[i] = t; n++; }
    });
  });
  return n;
}
