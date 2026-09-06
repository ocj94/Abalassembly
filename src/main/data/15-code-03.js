';
let _bookNode = null;

// id canonique d'un coup (identique à celui ayant servi à bâtir l'arbre)
// Identifiant canonique et stable d'un coup : les cellules impliquees (triees,
// pour que l'ordre de decouverte du groupe n'ait pas d'importance) + la direction.
// Sert de cle pour comparer/dedupliquer des coups (livre d'ouvertures, securite
// "ce coup propose est-il bien present dans les coups legaux actuels ?", etc.)
// — deux coups avec le meme canonId deplacent exactement le meme groupe de
// billes dans la meme direction, donc sont le meme coup au sens du jeu.
function canonId(mv){
  return mv.cells.map(function(c){ return '' + c.r + c.c; }).sort().join('') + '>' + mv.dir.q + '' + mv.dir.r;
}
// descend dans l'arbre selon le coup joué (sort du livre si inconnu)
// Fait avancer le pointeur dans l'arbre du livre (_bookNode) au fur et a mesure
// que la partie se joue reellement, coup par coup — que le coup vienne de
// l'humain ou de l'IA. Si la position sort du livre (coup jamais vu a cet
// endroit, ou _bookNode.k absent), on "sort du livre" une bonne fois pour
// toutes (_bookNode=null) : au-dela, ni pickBookMove ni le livre ne seront
// plus consultes pour le reste de la partie — la recherche prend le relais.
function bookDescend(moveInfo){
  if(!_bookNode || !_bookNode.k){ _bookNode = null; return; }
  if(!moveInfo || !moveInfo.cells || !moveInfo.dir){ _bookNode = null; return; }
  _bookNode = _bookNode.k[canonId(moveInfo)] || null;
}
// choisit une continuation du livre (tirage pondéré par fréquence × taux de victoire) qui soit LÉGALE
function pickBookMove(node, legalMoves){
  if(!node || !node.k) return null;
  const ids = Object.keys(node.k);
  if(!ids.length) return null;
  // poids = fréquence × (0.5 + taux de victoire du joueur ayant joué ce coup), borné
  // Le "0.5 +" evite qu'un coup jamais gagnant (wr=0) ait un poids nul (donc
  // jamais choisi) : meme un coup rare avec un mauvais historique garde une
  // petite chance d'etre tire, pondere par sa frequence relle (n.c).
  function weight(n){
    const wr = (n.wg > 0) ? (n.w / n.wg) : 0.5;   // taux de victoire, 0.5 si inconnu
    return n.c * (0.5 + wr);
  }
  // Tirage pondere classique : chaque candidat occupe une "tranche" proportionnelle
  // a son poids sur [0, total], on tire un nombre au hasard dedans et on regarde
  // dans quelle tranche il tombe (roulette).
  let total = 0; for(const id of ids) total += weight(node.k[id]);
  let pick = Math.random()*total, chosen = ids[0];
  for(const id of ids){ pick -= weight(node.k[id]); if(pick <= 0){ chosen = id; break; } }
  // Verification de securite indispensable : l'arbre a pu etre construit sur un
  // plateau legerement different (transposition, variante) — on ne rend le coup
  // que s'il correspond REELLEMENT a un coup legal ICI, jamais a l'aveugle.
  for(const m of legalMoves){ if(canonId(m) === chosen) return m; }  // sécurité : doit être légal
  return null;
}

/* Repli "livre" par empreintes historiques : quand la position exacte n'est
   pas connue de OPENING_TREES, on cherche parmi les 418595 empreintes
   reconstruites la plus proche PARTAGEANT LE MEME TRAIT et un nombre de
   coups comparable. Dans l'enregistrement trouve (ply m, couleur c), le
   coup que ce meme camp a rejoue ENSUITE dans cette partie reelle se
   trouve a l'indice m+2 de la sequence (m est son propre coup, m+1 la
   reponse adverse, m+2 son coup suivant). On ne le propose QUE s'il est
   verifie legal sur le plateau actuel (resolveAbaProToken) — jamais
   fabrique, jamais applique aveuglement. Ne touche pas evaluateBoard :
   la Lab a etabli qu'ajouter des criteres a la fonction d'evaluation
   degrade ses performances ; ce repli reste un choix de coup en amont
   de la recherche, pas une modification des poids d'evaluation. */
function pickEmpreinteFallbackMove(color, legalMoves, moveCountActuel){
  if (typeof EMPREINTES_HISTORIQUES === 'undefined' || !EMPREINTES_HISTORIQUES.length) return null;
  if (!legalMoves || !legalMoves.length) return null;
  const emp = calculerEmpreinte(color);
  let meilleur = null, meilleureDist = Infinity;
  for (let i = 0; i < EMPREINTES_HISTORIQUES.length; i++) {
    const p = EMPREINTES_HISTORIQUES[i];
    if (p.c !== color) continue;
    if (Math.abs(p.m - moveCountActuel) > 6) continue;
    const d = distanceEmpreintes(emp, p.e);
    if (d < meilleureDist) { meilleureDist = d; meilleur = p; }
  }
  if (!meilleur) return null;
  const jeu = meilleur.s === 'MIGS' ? MIGS_GAMES[meilleur.g] : AO_GAMES[meilleur.g];
  if (!jeu) return null;
  const seq = meilleur.s === 'MIGS' ? jeu[5] : jeu[6];
  const tokens = String(seq).replace(/\d+\.-?/g, ' ').trim().split(/\s+/).filter(Boolean);
  const token = tokens[meilleur.m + 2];
  if (!token) return null;
  const mv = resolveAbaProToken(token, color);
  for (const m of legalMoves) { if (mv && canonId(m) === canonId(mv)) return m; }  // sécurité : doit être légal ici
  return null;
}


/* ═══════════════════════════════════════════
   PARTIES MIGS — 2589 parties Belgian Daisy (notation ABA-PRO)
   [n°, date, noir, blanc, résultat, séquence]
═══════════════════════════════════════════ */
let MIGS_GAMES=[];  // rempli par ensureGameBanks() — banque compressée ci-dessous
const MIGS_B64='