/* ═══════════════════════════════════════════
   ABALONE BOARD ENGINE
═══════════════════════════════════════════ */
const HEX_RADIUS = 26;
const LANGUAGES = [
  { code:'FR', flag:'🇫🇷', name:'Français' },
  { code:'EN', flag:'🇬🇧', name:'English' },
  { code:'HE', flag:'🇮🇱', name:'עברית' },
  { code:'ES', flag:'🇪🇸', name:'Español' },
  { code:'DE', flag:'🇩🇪', name:'Deutsch' },
  { code:'IT', flag:'🇮🇹', name:'Italiano' },
  { code:'PT', flag:'🇵🇹', name:'Português' },
  { code:'NL', flag:'🇳🇱', name:'Nederlands' },
  { code:'PL', flag:'🇵🇱', name:'Polski' },
  { code:'RU', flag:'🇷🇺', name:'Русский' },
  { code:'ZH', flag:'🇨🇳', name:'中文' },
  { code:'JA', flag:'🇯🇵', name:'日本語' },
];
const ROWS = [5,6,7,8,9,8,7,6,5];
let board = {};
let selected = [];
let currentTurn = 'black';
let gameMode = 'ai';   // 'ai' = vs ordinateur, 'local' = 2 joueurs même écran
// Couleur contrôlée par l'humain en mode IA. 'black' par défaut.
// Devient 'white' quand on affronte le Bot Noir (qui, lui, joue les noirs).
let humanColor = 'black';
function aiColor() { return humanColor === 'black' ? 'white' : 'black'; }
/* Point de verite UNIQUE pour "quelle couleur je tiens reellement" — remplace
   trois implementations locales identiques trouvees independamment
   (_clockMine() pour l'horloge, un _mine ad-hoc pour la heatmap, un _myCol
   ad-hoc pour les metriques de style), chacune corrigeant le meme bug
   ("noir = moi" code en dur) sans jamais converger vers un seul endroit.
   En mode IA : la couleur que l'humain a choisie (humanColor). En mode 2
   joueurs locaux : convention "noir = joueur local" (les deux joueurs
   partagent le meme profil/heatmap sur cet appareil, il faut bien choisir
   un cote pour l'attribution). Purement une consolidation de lisibilite —
   aucune des trois anciennes implementations n'avait de bug actif restant. */
function monCamp() {
  if (typeof gameMode !== 'undefined' && gameMode === 'local') return 'black';
  return (typeof humanColor !== 'undefined' && humanColor) ? humanColor : 'black';
}
// "Est-ce mon tour ?" — juste une lecture de monCamp() par rapport au trait
// courant, exposee separement pour les endroits qui posent la question
// plutot que d'avoir besoin de la couleur elle-meme.
function estMonTour() { return (typeof currentTurn !== 'undefined') && currentTurn === monCamp(); }
let capturedByBlack = 0;
let capturedByWhite = 0;
let moveCount = 14;
let gameOver = false;
let timerInterval;
/* 555 et 522 — soit 09:15 et 08:42 — etaient des valeurs inventees, affichees
   comme un temps de partie reel avant meme le premier coup. Les deux horloges
   partent maintenant de la meme cadence. */
let myTime = 600, oppTime = 600;

let _replayStartBoard = null;   // position avant le coup 1, pour le rejeu
window.boardRotation = 0;   // rotation de la VUE du plateau, en degrés — propriete de window
                             // (pas "let"), pour rester la MEME variable vue depuis le bloc
                             // <script> de la 3D (start3DScene), qui a besoin de la lire/ecrire
                             // pour la synchronisation entre les deux dimensions.
/* Pas de rotation, PARTAGE entre les boutons 2D (rotateBoard) et les
   boutons Y de la 3D (orbite de la camera) — une seule valeur, deux
   consommateurs, pour qu'il n'y ait jamais deux pas differents a
   resynchroniser separement. 10° par clic, sur demande d'Olivier
   (auparavant 11,5°) — la 2D accepte n'importe quel angle (le cadre
   hexagonal ET les cases se recalculent tous deux via hexCoord(), donc
   restent coherents entre eux a n'importe quel angle). */
const BOARD_ROTATE_STEP_DEG = 10;
window.BOARD_ROTATE_STEP_DEG = BOARD_ROTATE_STEP_DEG;   // rendu explicitement global : start3DScene()
                                                          // vit dans un AUTRE bloc <script>, qui ne
                                                          // partage pas forcement la portee lexicale
                                                          // de ce const — window. leve toute ambiguite.
/* Meme angle de depart que DEFAULT_VIEW.theta dans start3DScene() (Math.PI*0.25) —
   duplique ici volontairement : les deux fonctions vivent dans des portees
   JS distinctes qui n'ont sinon aucune raison de se connaitre, la
   duplication d'une seule constante est plus sure qu'un couplage
   artificiel entre elles. Sert de reference commune pour convertir entre
   la rotation 2D (boardRotation, degres) et l'orbite 3D (theta, radians),
   afin que changer de dimension ne produise aucun decalage visuel :
   tourner le plateau en 2D puis passer en 3D doit montrer le MEME angle,
   et inversement. Signale par Olivier. */
/* 90°, PAS 45° : axPos() place la rangee sur l'axe Z et la colonne sur l'axe
   X (voir axPos plus bas, autre bloc <script>) — a theta=0 la camera est
   alignee sur l'axe des COLONNES (aucun decalage Z), pas sur celui des
   RANGEES. Avec l'ancienne valeur (Math.PI*0.25), boardRotation=0
   produisait donc une vue 3D en coin/diagonale au lieu d'etre alignee
   comme la 2D (rangee 0 en haut, rangee 8 en bas) — exactement le
   decalage signale par Olivier (« le plateau n'est pas aligne »).
   Verifie par calcul : a theta=90°, le decalage camera est purement sur Z
   (aligne avec l'axe des rangees) ; a 45°, il est diagonal (x=z). */
const THETA_DEFAULT_3D = Math.PI * 0.5;
function boardRotationToTheta3D(deg) { return THETA_DEFAULT_3D - deg * Math.PI / 180; }
function theta3DToBoardRotation(rad) {
  const deg = (THETA_DEFAULT_3D - rad) * 180 / Math.PI;
  return ((deg % 360) + 360) % 360;
}

/* Orientation « POV » : le joueur voit toujours SON camp en bas. Avec les
   blancs, la vue pivote de 180°. On ne touche qu'a l'affichage : le modele
   reste absolu, e5 designe toujours e5. Inverser les coordonnees elles-memes
   casserait l'export Aba-Pro, la bibliotheque des 4480 parties, les puzzles
   et le code de partie echange avec un adversaire. Les reperes suivent la
   rotation puisqu'ils sont traces via hexCoord, et les clics aussi, la
   detection de case passant par la meme fonction. */
function applyPovOrientation() {
  const camp = (typeof gameMode !== 'undefined' && gameMode === 'local')
    ? 'black'
    : ((typeof humanColor !== 'undefined') ? humanColor : 'black');
  boardRotation = (camp === 'white') ? 180 : 0;
  if (typeof drawBoard === 'function') drawBoard();
}
function hexCoord(row, col, ignorerRotation) {
  const rowLen = ROWS[row];
  const cx = 320;
  const cy = 320;
  const vSpacing = HEX_RADIUS * 1.73;
  const hSpacing = HEX_RADIUS * 2;
  // Chaque rangée est centrée horizontalement sur cx (losange vertical symétrique)
  let x = cx + (col - (rowLen - 1) / 2) * hSpacing;
  let y = cy + (row - 4) * vSpacing;
  /* ignorerRotation : la carte de chaleur (buildHeatmapSVG) doit rester
     FIXE, quelle que soit la rotation actuelle du plateau de jeu — c'est
     une reference statistique statique, pas une vue du plateau en cours de
     partie. Sans ce parametre, tourner le plateau (Y↺/Y↻, synchronise avec
     la 3D) faisait aussi tourner la carte de chaleur, ce qui n'a pas de
     sens pour des donnees cumulees. Signale par Olivier. */
  if (boardRotation && !ignorerRotation) {
    const a = boardRotation * Math.PI / 180;
    const dx = x - cx, dy = y - cy;
    x = cx + dx * Math.cos(a) - dy * Math.sin(a);
    y = cy + dx * Math.sin(a) + dy * Math.cos(a);
  }
  return { x, y };
}
// Pivote la vue du plateau par paliers de 60° (horaire deg>0, anti-horaire deg<0)
function rotateBoard(deg) {
  boardRotation = ((boardRotation + deg) % 360 + 360) % 360;
  if (typeof drawBoard === 'function') drawBoard();
  if (typeof showToast === 'function') showToast((deg > 0 ? '↻' : '↺') + ' Plateau pivoté (' + boardRotation + '°)');
}

/* Cote Noirs / cote Blancs, PARTAGE entre la 2D et la 3D — memes boutons
   ⚫/⚪ que ceux deja presents en 3D, ajoutes ici. Contrairement aux anciens
   prereglages 3D (qui changeaient aussi l'elevation), ceux-ci ne touchent
   QUE la rotation Y (boardRotation), exactement comme Y↺/Y↻ : la 2D n'a
   pas de notion d'elevation, et ca les rend compatibles avec le verrou
   "vue du dessus" de la 3D — toujours actifs, jamais grises. 0°/180° pour
   coincider avec applyPovOrientation() (meme convention noirs/blancs).
   Signale par Olivier. */
function setSideView(side) {
  window.boardRotation = (side === 'white') ? 180 : 0;
  if (typeof drawBoard === 'function') drawBoard();
  if (window._boardView === '3d' && window._three3d && typeof boardRotationToTheta3D === 'function') {
    window._three3d.setTheta(boardRotationToTheta3D(window.boardRotation));
  }
  if (typeof showToast === 'function') showToast(side === 'white' ? '⚪ Côté Blancs' : '⚫ Côté Noirs');
}
/* Pastilles de couleur des boutons ⚫/⚪ (2D) — la teinte REELLE du skin
   actif, meme calcul que les billes 3D (syncMarbleColors, v1.32) et les
   symboles 1D (_letter). Rappelee a chaque dessin du plateau principal
   (voir drawBoard) : un changement de skin doit se refleter immediatement,
   pas seulement au prochain clic sur ⚫/⚪. */
function syncSideButtonColors() {
  const bEl = document.getElementById('side2d-black');
  const wEl = document.getElementById('side2d-white');
  if (!bEl && !wEl) return;
  const bs = (typeof boardTheme !== 'undefined' && boardTheme.blackStops) || ['#3a3a3c','#1a1a1c','#050506'];
  const ws = (typeof boardTheme !== 'undefined' && boardTheme.whiteStops) || ['#ffffff','#e8e6e2','#c4c2c0','#9a9a9c'];
  const bc = bs[Math.floor(bs.length / 2)], wc = ws[Math.floor(ws.length / 2)];
  const pastille = function(c){
    return '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' + c
      + ';box-shadow:0 0 0 1px rgba(255,255,255,0.18)"></span>';
  };
  if (bEl) bEl.innerHTML = pastille(bc);
  if (wEl) wEl.innerHTML = pastille(wc);
}

// ═══ POSITIONS DE DÉPART ═══
// Standard + Belgian validées en rejouant des parties ABA-PRO contre le moteur.
// German/Dutch/Swiss : marguerites obtenues par rotation (14 billes/camp, cases valides,
// symétrie 180° vérifiées) — géométrie à confirmer vs variantes officielles.
const LAYOUTS = {
  standard: {
    black: [[8,0],[8,1],[8,2],[8,3],[8,4],[7,0],[7,1],[7,2],[7,3],[7,4],[7,5],[6,2],[6,3],[6,4]],
    white: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[2,2],[2,3],[2,4]]
  },
  belgian: {
    black: [[8,0],[8,1],[7,0],[7,1],[7,2],[6,1],[6,2],[0,3],[0,4],[1,3],[1,4],[1,5],[2,4],[2,5]],
    white: [[8,3],[8,4],[7,3],[7,4],[7,5],[6,4],[6,5],[0,0],[0,1],[1,0],[1,1],[1,2],[2,1],[2,2]]
  },
  german: {
    black: [[7,0],[7,1],[6,0],[6,1],[6,2],[5,1],[5,2],[3,5],[3,6],[2,4],[2,5],[2,6],[1,4],[1,5]],
    white: [[7,4],[7,5],[6,4],[6,5],[6,6],[5,5],[5,6],[3,1],[3,2],[2,0],[2,1],[2,2],[1,0],[1,1]]
  },
  dutch: {
    black: [[8,0],[8,1],[7,0],[7,2],[7,4],[6,1],[6,2],[2,4],[2,5],[1,1],[1,3],[1,5],[0,3],[0,4]],
    white: [[8,3],[8,4],[7,1],[7,3],[7,5],[6,4],[6,5],[2,1],[2,2],[1,0],[1,2],[1,4],[0,0],[0,1]]
  },
  swiss: {
    black: [[7,0],[7,1],[6,0],[6,2],[6,5],[5,1],[5,2],[3,5],[3,6],[2,1],[2,4],[2,6],[1,4],[1,5]],
    white: [[7,4],[7,5],[6,1],[6,4],[6,6],[5,5],[5,6],[3,1],[3,2],[2,0],[2,2],[2,5],[1,0],[1,1]]
  },
  decouverte: {
    // Mode Enfant : 7 billes/camp au lieu de 14 — plus facile à tenir en tête
    // pour un jeune joueur. Sous-ensemble déjà validé de la disposition belge
    // (coins opposés), pas de nouvelles coordonnées inventées à la main.
    black: [[8,0],[8,1],[7,0],[7,1],[7,2],[6,1],[6,2]],
    white: [[0,0],[0,1],[1,0],[1,1],[1,2],[2,1],[2,2]]
  },
  '69': {
    // Disposition artistique (visage souriant), pas une variante de tournoi.
    // Coordonnees relues directement sur une image fournie, position par
    // position (pas de generation automatique) : 14 billes de chaque camp,
    // aucune collision, verifie avant integration. Nommee d'apres le
    // fichier source. Corrigee une fois par Olivier apres relecture
    // precise de l'image (10 cases decalees dans le premier jet) --
    // reconverti depuis la notation Aba-Pro qu'il a fournie, pas retouche
    // a la main en interne.
    black: [[2,1],[5,2],[5,1],[5,5],[5,6],[6,0],[6,4],[6,6],[7,0],[7,1],[7,2],[7,3],[7,4],[7,5]],
    white: [[1,0],[1,1],[1,2],[1,3],[1,4],[1,5],[2,0],[2,2],[2,6],[3,2],[3,1],[3,5],[3,6],[6,5]]
  },
  fujiyama: {
    // Disposition artistique (forme de montagne, "Fujiyama" = mont Fuji),
    // symetrie centrale exacte entre les deux camps (chaque camp a une
    // "montagne" de sa couleur avec un petit triangle de la couleur
    // adverse en son centre). Coordonnees relues directement sur une
    // image fournie, position par position, PUIS converties via la vraie
    // fonction abaproToRc du site (jamais a la main) : 14 billes de
    // chaque camp, aucune collision, rendu visuel compare a l'image
    // source avant integration.
    black: [[8,0],[8,1],[8,2],[8,3],[8,4],[7,1],[7,4],[6,2],[6,4],[5,3],[5,4],[1,2],[1,3],[2,3]],
    white: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,1],[1,4],[2,2],[2,4],[3,3],[3,4],[7,2],[7,3],[6,3]]
  },
  the_wall: {
    // "The Wall" -- symetrie centrale : chaque camp forme une pointe (1),
    // une ligne de 5, puis un mur de 8. Coordonnees relues sur une image
    // fournie, PUIS converties via abaproToRc (jamais a la main) : 14
    // billes de chaque camp, aucune collision, rendu visuel compare a
    // l'image source avant integration.
    // VALIDATION INDEPENDANTE : le corpus AbalOnline contient 144 vraies
    // parties "the_wall", dont le champ de position donne litteralement
    // a3c2c3c4c5c6d1d2d3d4d5d6d7d8 (noir) et f2..f9g4g5g6g7g8i7 (blanc) --
    // exactement cette lecture, case pour case. Meme confirmation
    // independante que pour fujiyama (v2.09/v2.15).
    black: [[8,2],[6,1],[6,2],[6,3],[6,4],[6,5],[5,0],[5,1],[5,2],[5,3],[5,4],[5,5],[5,6],[5,7]],
    white: [[0,2],[2,1],[2,2],[2,3],[2,4],[2,5],[3,0],[3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[3,7]]
  },
  star: {
    // "Star" -- motif etoile radiant depuis le centre. Coordonnees lues
    // DIRECTEMENT depuis le champ de position brut du corpus AbalOnline
    // (a1b5c3c7d5e2e4e7e9f6g5g9h8i5 / a5b2c1c5d4e1e3e6e8f5g3g7h5i9),
    // rendues visuellement et comparees a l'image fournie par Olivier
    // AVANT integration -- correspondance exacte confirmee (troisieme
    // validation independante d'affilee, apres fujiyama et the_wall).
    // Convertie via la vraie fonction abaproToRc (jamais a la main).
    // 14 billes de chaque camp, aucune collision.
    black: [[8,0],[7,4],[6,2],[6,6],[5,4],[4,1],[4,3],[4,6],[4,8],[3,4],[2,2],[2,6],[1,4],[0,0]],
    white: [[8,4],[7,1],[6,0],[6,4],[5,3],[4,0],[4,2],[4,5],[4,7],[3,3],[2,0],[2,4],[1,1],[0,4]]
  },
  face_a_face: {
    // "Face a face" -- deux losanges miroir separes par un couloir
    // central, contrairement aux autres variantes artistiques qui
    // opposent le haut et le bas (fujiyama, the_wall, star), celle-ci
    // oppose la gauche et la droite. Coordonnees relues position par
    // position sur une image fournie par Olivier, PUIS converties via
    // la vraie fonction abaproToRc (jamais a la main) : 14 billes de
    // chaque camp, aucune collision, rendu visuel compare a l'image
    // source avant integration.
    white: [[2,0],[2,1],[3,0],[3,1],[3,2],[4,0],[4,1],[4,2],[4,3],[5,0],[5,1],[5,2],[6,0],[6,1]],
    black: [[2,5],[2,6],[3,5],[3,6],[3,7],[4,5],[4,6],[4,7],[4,8],[5,5],[5,6],[5,7],[6,5],[6,6]]
  },
  alliances: {
    // "Alliances" -- deux spirales imbriquees, blanc s'enroulant vers
    // noir. Coordonnees relues position par position sur une image
    // fournie par Olivier (bandes zoomees rangee par rangee pour une
    // lecture fiable), PUIS converties via abaproToRc (jamais a la
    // main), rendu visuel compare a l'image source avant integration.
    // VALIDATION INDEPENDANTE : le corpus AbalOnline contient 87 vraies
    // parties "alliances", et leur champ de position donne litteralement
    // b4b5c4c6d4d7e4e8f5f8g7g8h7h8 (noir) et
    // b2b3c2c3d2d5e2e6f3f6g4g6h5h6 (blanc) -- exactement cette lecture,
    // case pour case. Meme confirmation independante que pour fujiyama/
    // the_wall/star.
    white: [[1,1],[1,2],[2,1],[2,3],[3,1],[3,4],[4,1],[4,5],[5,1],[5,4],[6,1],[6,2],[7,1],[7,2]],
    black: [[1,3],[1,4],[2,4],[2,5],[3,3],[3,6],[4,3],[4,7],[5,3],[5,6],[6,3],[6,5],[7,3],[7,4]]
  },
  domination: {
    // "Domination" -- deux triangles opposes en symetrie de rotation a
    // 180 degres. Coordonnees relues position par position sur une image
    // fournie par Olivier (bandes zoomees rangee par rangee), PUIS
    // converties via abaproToRc (jamais a la main), rendu visuel compare
    // a l'image source avant integration.
    // VALIDATION INDEPENDANTE : le corpus AbalOnline contient 33 vraies
    // parties "domination", et leur champ de position donne litteralement
    // b1c1c2d1d2d3e4e6f7f8f9g8g9h9 (noir) et
    // b6c6c7d5d6d7d8f2f3f4f5g3g4h4 (blanc) -- exactement cette lecture,
    // case pour case. Cinquieme confirmation independante d'affilee
    // (apres fujiyama/the_wall/star/alliances).
    white: [[1,0],[2,0],[2,1],[3,0],[3,1],[3,2],[3,3],[5,4],[5,5],[5,6],[5,7],[6,5],[6,6],[7,5]],
    black: [[1,5],[2,5],[2,6],[3,5],[3,6],[3,7],[4,3],[4,5],[5,0],[5,1],[5,2],[6,0],[6,1],[7,0]]
  },
  atomouche: {
    // "Atomouche" -- motif disperse, PARTICULARITE REELLE : seulement
    // 12 billes par camp, pas 14 comme toutes les autres variantes du
    // site. Verifie deux fois par relecture attentive (24 billes au
    // total confirme, pas une erreur de comptage) puis confirme a
    // l'identique contre le corpus (voir plus bas) -- ce n'est pas une
    // approximation, c'est une caracteristique authentique de cette
    // variante telle que jouee sur AbalOnline. Coordonnees relues
    // position par position sur une image fournie par Olivier (bandes
    // zoomees rangee par rangee), PUIS converties via abaproToRc
    // (jamais a la main), rendu visuel compare a l'image source avant
    // integration.
    // VALIDATION INDEPENDANTE : le corpus AbalOnline contient 76 vraies
    // parties "atomouche", et leur champ de position donne litteralement
    // a4b2b6d1d6e4e9f2g5h7h9i5 (noir, 12 cases) et
    // a5b1b3c5d8e1e6f4f9h4h8i6 (blanc, 12 cases) -- exactement cette
    // lecture, case pour case ET meme nombre de billes. Sixieme
    // confirmation independante d'affilee (apres fujiyama/the_wall/
    // star/alliances/domination).
    white: [[8,4],[7,0],[7,2],[6,4],[5,7],[4,0],[4,5],[3,2],[3,7],[1,0],[1,4],[0,1]],
    black: [[8,3],[7,1],[7,5],[5,0],[5,5],[4,3],[4,8],[3,0],[2,2],[1,3],[1,5],[0,0]]
  },
  centrifuge: {
    // "Centrifugeuse" -- deux anneaux imbriques en symetrie de rotation
    // a 180 degres. Trouvee dans un projet tiers (gym-abalone,
    // github.com/towzeur/gym-abalone), format d'indexation orthogonale
    // 0-60 propre a ce projet, converti par une formule ecrite pour
    // l'occasion (aucune donnee de reference au moment de l'ecrire).
    // VALIDATION CROISEE : le corpus AbalOnline contient 39 vraies
    // parties "centrifugeuse", et leur champ de position donne
    // EXACTEMENT la meme lecture, sur les DEUX camps, case pour case --
    // a2a3a4c4f2f3f8f9g3g4g8g9h4h9 (noir) et
    // b1b6c1c2c6c7d1d2d7d8g6i6i7i8 (blanc). Valide en meme temps trois
    // choses : la formule de conversion, l'exactitude de la source
    // tierce, et la variante elle-meme.
    white: [[7,0],[7,5],[6,0],[6,1],[6,5],[6,6],[5,0],[5,1],[5,6],[5,7],[2,3],[0,1],[0,2],[0,3]],
    black: [[8,1],[8,2],[8,3],[6,3],[3,0],[3,1],[3,6],[3,7],[2,0],[2,1],[2,5],[2,6],[1,0],[1,5]]
  },
  snakes_variant: {
    // "Snakes variant" -- deux spirales entrelacees. Coordonnees prises
    // DIRECTEMENT dans le champ de position brut du corpus AbalOnline
    // (17 vraies parties) : d2d3d4d5d6e2f2g3h4i5i6i7i8i9 (noir) et
    // a1a2a3a4a5b6c7d8e8f4f5f6f7f8 (blanc) -- aucune image necessaire,
    // la source EST le corpus lui-meme.
    // CONFIRME UNE SECONDE FOIS par une image independante
    // (onlineabalone.wordpress.com/.../snakes-variante.png) : lecture
    // pixel par pixel identique, case pour case, sur les deux camps.
    // A NE PAS CONFONDRE avec "snakes" (ci-dessous) : deux positions
    // distinctes malgre la ressemblance des noms, verifie explicitement.
    black: [[5,1],[5,2],[5,3],[5,4],[5,5],[4,1],[3,0],[2,0],[1,0],[0,0],[0,1],[0,2],[0,3],[0,4]],
    white: [[8,0],[8,1],[8,2],[8,3],[8,4],[7,5],[6,6],[5,7],[4,7],[3,2],[3,3],[3,4],[3,5],[3,6]]
  },
  snakes: {
    // "Snakes" -- motif distinct de "snakes_variant" malgre le nom
    // proche. Coordonnees relues position par position sur une image
    // fournie par Olivier (bandes zoomees rangee par rangee), PUIS
    // converties via abaproToRc (jamais a la main).
    // VALIDATION CROISEE independante : le meme projet tiers gym-abalone
    // qui a permis de valider "centrifuge" contient une entree "snakes"
    // (distincte de sa propre "snakes-variation", ecartee -- 13 billes
    // contre 14, incoherente). Convertie avec la MEME formule deja
    // validee sur centrifuge, elle correspond EXACTEMENT a cette lecture
    // d'image, case pour case, sur les deux camps -- confirmation
    // independante malgre l'absence de partie portant ce nom exact dans
    // le corpus AbalOnline (0 partie).
    black: [[0,0],[0,1],[0,2],[0,3],[0,4],[1,0],[2,0],[3,0],[3,3],[3,4],[4,1],[4,3],[5,1],[5,2]],
    white: [[3,5],[3,6],[4,5],[4,7],[5,3],[5,4],[5,7],[6,6],[7,5],[8,0],[8,1],[8,2],[8,3],[8,4]]
  },
  alien: {
    // "Alien" -- deux figures compactes en symetrie de rotation a 180
    // degres. Coordonnees relues position par position sur une image
    // fournie par Olivier (bandes zoomees rangee par rangee), PUIS
    // converties via abaproToRc (jamais a la main), rendu visuel compare
    // a l'image source avant integration.
    // VALIDATION INDEPENDANTE : le corpus AbalOnline contient 35 vraies
    // parties "alien", et leur champ de position donne EXACTEMENT la
    // meme lecture, sur les DEUX camps, case pour case --
    // b3b4c3c5f5f6g4g6g8h5h8i5i7i9 (noir) et
    // a1a3a5b2b5c2c4c6d4d5g5g7h6h7 (blanc).
    black: [[7,2],[7,3],[6,2],[6,4],[3,3],[3,4],[2,1],[2,3],[2,5],[1,1],[1,4],[0,0],[0,2],[0,4]],
    white: [[8,0],[8,2],[8,4],[7,1],[7,4],[6,1],[6,3],[6,5],[5,3],[5,4],[2,2],[2,4],[1,2],[1,3]]
  },
  korean_daisy: {
    // "Korean Daisy" -- deux clusters en haut avec echange de couleur au
    // contact, deux blocs en bas en symetrie de rotation a 180 degres.
    // Coordonnees relues position par position sur une image fournie par
    // Olivier (source abaloneonline.wordpress.com, creditee "Hyunmin
    // KIM"), bandes zoomees rangee par rangee, PUIS converties via
    // abaproToRc (jamais a la main), rendu visuel compare a l'image
    // source avant integration.
    // Aucune partie sous ce nom (ni variantes d'orthographe testees)
    // dans le corpus AbalOnline -- signale honnetement, contrairement a
    // alliances/domination/atomouche/centrifuge/snakes_variant/alien qui
    // ont chacune une confirmation directe par de vraies parties.
    black: [[0,3],[0,4],[1,3],[1,4],[1,5],[2,2],[2,5],[6,1],[6,4],[7,0],[7,1],[7,2],[8,0],[8,1]],
    white: [[0,0],[0,1],[1,0],[1,1],[1,2],[2,1],[2,4],[6,2],[6,5],[7,3],[7,4],[7,5],[8,3],[8,4]]
  },
  anglattack: {
    // "Anglattack" -- quatre coins symetriques (rotation 180 degres),
    // une rangee mediane alternee, deux singletons isoles. Coordonnees
    // relues position par position sur une image fournie par Olivier
    // (bandes zoomees rangee par rangee), PUIS converties via
    // abaproToRc (jamais a la main), rendu visuel compare a l'image
    // source avant integration.
    // Aucune partie sous ce nom (ni variantes d'orthographe testees)
    // dans le corpus AbalOnline -- signale honnetement, meme statut que
    // korean_daisy.
    black: [[0,3],[0,4],[1,1],[1,5],[2,2],[4,1],[4,2],[4,5],[4,8],[6,2],[7,1],[7,5],[8,3],[8,4]],
    white: [[0,0],[0,1],[1,0],[1,4],[2,4],[4,0],[4,3],[4,6],[4,7],[6,4],[7,0],[7,4],[8,0],[8,1]]
  }
};

function initBoardState() {
  board = {};
  const name = (typeof kidsMode !== 'undefined' && kidsMode) ? 'decouverte'
             : (typeof currentLayout !== 'undefined' && currentLayout) ? currentLayout : 'standard';
  const layout = LAYOUTS[name] || LAYOUTS.standard;
  layout.black.forEach(function(p){ board[p[0]+','+p[1]] = 'black'; });
  layout.white.forEach(function(p){ board[p[0]+','+p[1]] = 'white'; });
}

/* ── Indices de coups : calcul partage entre la 2D et la 1D ──────────────
   Ce calcul vivait en clair dans drawBoard. La vue 1D en a besoin a
   l'identique : plutot que de le recopier — et de le voir diverger du moteur
   a la premiere evolution — on l'isole ici. Une vue ne decide de rien, elle
   demande. validateMove et getAllMovesForColor lisent le plateau global
   'board' : on le permute le temps du calcul, et on le restaure meme en cas
   d'exception. */
function computeMoveHints(sel, turn, boardData) {
  const out = [];
  if (!sel || !sel.length || typeof validateMove !== 'function') return out;
  const savedB = board;
  board = boardData || board;
  try {
    for (const dir of AX_DIRS) {
      const info = validateMove(sel, dir, turn);
      if (!info.valid) continue;
      const ax = sel.map(s => rcToAxial(s.r, s.c));
      if (info.type === 'broadside') {
        // coup en fleche : chaque bille avance d'une case, toutes vides
        ax.forEach(a => { const d = axialToRc(a.q+dir.q, a.r+dir.r); if (d) out.push({ r:d.r, c:d.c, push:false }); });
      } else {
        // coup en ligne : seule la case devant la bille de tete est concernee
        const sorted = ax.slice().sort((a,b)=>(a.q*dir.q+a.r*dir.r)-(b.q*dir.q+b.r*dir.r));
        const head = sorted[sorted.length-1];
        const d = axialToRc(head.q+dir.q, head.r+dir.r);
        if (d) out.push({ r:d.r, c:d.c, push: info.type==='push' });
      }
    }
  } finally { board = savedB; }
  return out;
}

/* Billes du camp au trait ayant au moins un coup legal. Memorise sur une
   signature du plateau : drawBoard peut etre rappele plusieurs fois par
   seconde (animations, halos de menace pulses) et la generation de coups
   n'a aucune raison d'etre refaite tant que rien n'a bouge. */
let _playableMemo = { key: null, set: null };
function computePlayableCells(turn, boardData) {
  const brd = boardData || board;
  if (typeof getAllMovesForColor !== 'function') return new Set();
  const key = turn + '|' + Object.keys(brd).sort().map(function(k){ return k + brd[k].charAt(0); }).join('');
  if (_playableMemo.key === key) return _playableMemo.set;
  const set = new Set();
  const savedB = board;
  board = brd;
  try {
    getAllMovesForColor(turn).forEach(function(mv){
      mv.cells.forEach(function(c){ set.add(c.r + ',' + c.c); });
    });
  } catch(e) { /* ne bloque jamais l'affichage si le calcul echoue */ }
  finally { board = savedB; }
  _playableMemo = { key: key, set: set };
  return set;
}

/* Couleurs de surface par theme de plateau (Obsidian/Ocean/Marbre/Or/Foret).
   Le bois (wood) reste a part : degrade lineaire + veines + rivieres de
   resine + coin epoxy sont des effets propres au bois, pas des couleurs
   generalisables a un simple degrade radial — voir plus bas dans
   drawBoard(). Ces 5 themes partagent en revanche exactement le meme
   TRAITEMENT que l'ancien "Obsidian" (gouttiere + contour + surface en
   degrade radial), seules les teintes changent. Exposee sur window pour
   que syncBoardTheme3D() (autre bloc <script>) puisse la reutiliser —
   memes couleurs des deux cotes, pas une seconde palette inventee.
   Signale par Olivier. */
const BOARD_SURFACE_THEMES = {
  dark:   { gutterOuter:'#16181a', gutGrad:['#2a2d30','#1a1c1e'], trim:'#0a0a0b', surf:['#a8a8a8','#919191','#7c7c7c'] },
  ocean:  { gutterOuter:'#0a1826', gutGrad:['#1a3a52','#0d2436'], trim:'#040d16', surf:['#5a8aa8','#3f6a88','#254a64'] },
  marble: { gutterOuter:'#2a2a2a', gutGrad:['#3a3a3a','#242424'], trim:'#141414', surf:['#d8d4cc','#c0bab0','#a8a094'] },
  gold:   { gutterOuter:'#241a08', gutGrad:['#4a3510','#2a1c08'], trim:'#120c04', surf:['#c9a24a','#a8822e','#7a5c1c'] },
  forest: { gutterOuter:'#0e1a0e', gutGrad:['#1e3a1e','#0f200f'], trim:'#060e06', surf:['#5a8258','#436843','#2c4a2c'] },
  /* 10 nouveaux thèmes (demande d'Olivier : "metal, pierre, marbre, verre...
     une dixaine, tous differents"). Même structure EXACTE que les 5
     ci-dessus (gutterOuter/gutGrad/trim/surf) — aucun nouveau champ, aucun
     traitement spécial requis côté drawBoard()/3D, juste de nouvelles
     teintes + de nouvelles recettes de couches (THEME_RECIPES plus bas). */
  metal:    { gutterOuter:'#2c2f33', gutGrad:['#4a4e54','#22252a'], trim:'#15171a', surf:['#c8ccd1','#9a9ea4','#6e7278'] },   // acier brossé
  bronze:   { gutterOuter:'#2e2010', gutGrad:['#5a3f1c','#241a0c'], trim:'#140d05', surf:['#b98a4a','#8a6530','#5c421e'] },
  cuivre:   { gutterOuter:'#3a1c10', gutGrad:['#7a3c1e','#2c150c'], trim:'#1a0d06', surf:['#c97a4a','#a85830','#7a3c1e'] },
  ardoise:  { gutterOuter:'#1c2226', gutGrad:['#323c42','#161b1e'], trim:'#0c0f11', surf:['#5c6a72','#48545a','#333c40'] },
  granite:  { gutterOuter:'#26262a', gutGrad:['#3e3e44','#1e1e22'], trim:'#111113', surf:['#8a8a90','#6e6e74','#525256'] },
  verre:    { gutterOuter:'#0e2230', gutGrad:['#1c4258','#0a1a24'], trim:'#052030', surf:['#bfe4f0','#8ec4d8','#5f9cb4'] },
  beton:    { gutterOuter:'#242422', gutGrad:['#3c3c38','#1c1c1a'], trim:'#101010', surf:['#9a988e','#807e76','#66645c'] },
  corail:   { gutterOuter:'#3a1622', gutGrad:['#6a2a3c','#2a0e16'], trim:'#1a0810', surf:['#e28a7a','#c4604e','#8e3c34'] },
  glace:    { gutterOuter:'#0e2a34', gutGrad:['#1e4a58','#0a1e26'], trim:'#04141a', surf:['#dff4f8','#b0dce8','#7fbcd0'] },
  carbone:  { gutterOuter:'#0a0a0c', gutGrad:['#1a1a1e','#050506'], trim:'#000000', surf:['#38383e','#242428','#141416'] },   // laque noire / fibre de carbone
  /* 6 themes supplementaires. Palettes reprises telles quelles d'une
     proposition externe (le format etait correct) ; les RECETTES en
     revanche etaient cassees (parametres inventes n'existant dans aucune
     fonction de LAYER_TYPES — alpha/epaisseur/turbulence/graine/couleur1/
     couleur2 au lieu des vrais alphaMin/alphaMax/largeurMin/largeurMax/
     couleur[r,g,b]) : 13 couches sur 31 plantaient a l'execution reelle,
     5 autres s'executaient en ignorant silencieusement leurs parametres.
     Verifie par execution contre le vrai LAYER_TYPES avant d'ecrire quoi
     que ce soit ici — voir test_new_material_themes.js pour la suite. */
  onyx:       { gutterOuter:'#1a0e08', gutGrad:['#2a1a0a','#0a0500'], trim:'#ff8c00', surf:['#1a0e08','#2a1a0a','#0a0500'] },   // noir + veines d'or
  jade:       { gutterOuter:'#0a1208', gutGrad:['#1a2a1a','#0a1208'], trim:'#4a8a4a', surf:['#0a1208','#1a2a1a','#0d1a0d'] },
  stardust:   { gutterOuter:'#0a0a1a', gutGrad:['#1a1a2e','#0a0a1a'], trim:'#7a8aaa', surf:['#0a0a1a','#1a1a2e','#12122a'] },
  terracotta: { gutterOuter:'#3a1a0a', gutGrad:['#7a4a2a','#3a1a0a'], trim:'#ba7a5a', surf:['#3a1a0a','#5a3a1a','#2a1005'] },
  banquise:   { gutterOuter:'#0a1a2a', gutGrad:['#1a3a5a','#0a1a2a'], trim:'#7ab0d0', surf:['#0a1a2a','#1a3a5a','#0d253a'] },
  nacre:      { gutterOuter:'#1a0a2a', gutGrad:['#3a2a4a','#1a0a2a'], trim:'#b098c8', surf:['#1a0a2a','#3a2a4a','#251535'] },
  /* 2e serie de 6 themes, meme methode : palettes reprises (correctes),
     recettes reecrites avec les vrais parametres — 23 des 37 couches
     soumises plantaient ou etaient cassees/ignorees a l'execution reelle
     (memes causes que la 1ere serie : alpha/epaisseur/turbulence/graine/
     couleur1/couleur2/amplitude/frequence n'existent dans aucune fonction
     reelle). "lava" differencie volontairement de "volcanique" (veines de
     lave en mouvement plutot que roche craquelee) et "marble_white" de
     "marble" (plus clair, grain different) — verifie par distance de
     pixels, pas suppose. */
  patina:       { gutterOuter:'#1a1a14', gutGrad:['#2a2a1a','#0a0a08'], trim:'#6a9a7a', surf:['#1a1a14','#2a2a1a','#0f0f0c'] },   // cuivre patine, vert-de-gris
  desert:       { gutterOuter:'#3a2a1a', gutGrad:['#6a4a2a','#2a1a0a'], trim:'#c89860', surf:['#3a2a1a','#5a3a1a','#1a1008'] },
  abyss:        { gutterOuter:'#080c1a', gutGrad:['#0a1a2a','#04080c'], trim:'#2a6a8a', surf:['#080c1a','#0a1a2a','#05080c'] },
  lava:         { gutterOuter:'#1a0808', gutGrad:['#3a0a0a','#0a0202'], trim:'#e86040', surf:['#1a0808','#2a0a0a','#0a0202'] },
  marble_white: { gutterOuter:'#2a2a2a', gutGrad:['#4a4a4a','#2a2a2a'], trim:'#b0b0b0', surf:['#3a3a3a','#5a5a5a','#2a2a2a'] },
  pastel:       { gutterOuter:'#1a1a20', gutGrad:['#2a2a3a','#1a1a20'], trim:'#d0b0d0', surf:['#1a1a20','#2a2a3a','#151520'] },
  /* Volcanique : PREMIER theme avec variante jour/nuit (les 5 autres n'en
     ont pas encore — "on fera les autres apres", demande d'Olivier).
     Couleurs RE-ECHANTILLONNEES directement sur la photo de reference
     fournie par Olivier (roche noire craquelee, veines de lave) — pas
     choisies a l'oeil. La premiere version etait trop chaude/brune sur la
     roche ; la vraie photo montre un gris-noir neutre, avec les veines
     nettement plus discretes le jour (ambre terne) que la nuit (rouge-
     orange vif) — l'ecart jour/nuit est plus marque que ce qu'on avait. */
  volcanique: {
    day:   { gutterOuter:'#141414', gutGrad:['#282828','#141414'], trim:'#9c6030', surf:['#383838','#282828','#141414'] },
    night: { gutterOuter:'#050505', gutGrad:['#100000','#050505'], trim:'#c01800', surf:['#180000','#0d0000','#050505'] },
  },
};
window.BOARD_SURFACE_THEMES = BOARD_SURFACE_THEMES;
/* Resout les couleurs reelles d'un theme, qu'il soit "plat" (les 5 themes
   d'origine, une seule teinte) ou "jour/nuit" (Volcanique, et les futurs
   themes qui suivront le meme motif). boardTheme.night est un booleen
   simple ; ignore silencieusement pour un theme qui n'a pas encore de
   variante nuit (repli sur day, ou sur le theme plat tel quel) — jamais
   d'erreur si on bascule le mode nuit sur un theme qui ne le gere pas
   encore. Signale par Olivier. */
function resolveThemeColors(nom, estNuit) {
  const t = BOARD_SURFACE_THEMES[nom] || BOARD_SURFACE_THEMES.dark;
  if (t.day || t.night) return (estNuit && t.night) ? t.night : (t.day || t.night);
  return t;
}
window.resolveThemeColors = resolveThemeColors;

/* Genere le TRACE des fissures de lave (marche aleatoire ramifiee) sous
   forme de DONNEES pures — un tableau de tableaux de points {x,y} en espace
   canvas 640x640 — plutot que de dessiner directement. Expose sur window
   pour etre partage entre le rendu 2D (peindreTextureTheme2D, ce bloc) et
   le rendu 3D (dessinerFissures3D + la geometrie reelle des fissures, bloc
   <script> de la 3D plus bas) : un seul generateur, plusieurs consommateurs.
   CORRIGE AU PASSAGE un vrai bug trouve en le centralisant : le halo large
   (nuit) et le trait fin par-dessus etaient dessines par DEUX appels
   independants a l'ancien dessinerFissures3D/fissures2D, chacun relancant
   Math.random() — le halo et le coeur ne suivaient donc PAS le meme tracé,
   la lueur ne "collait" pas a la fissure. En generant le tracé une seule
   fois et en le redessinant deux fois avec des styles differents, le halo
   entoure desormais reellement le trait. */
window.genererFissures = function(nb) {
  const fissures = [];
  for (let b = 0; b < nb; b++) {
    let x = Math.random() * 640, y = Math.random() * 640;
    let angle = Math.random() * Math.PI * 2;
    const pts = [{ x: x, y: y }];
    const longueur = 70 + Math.random() * 160;
    let dist = 0;
    while (dist < longueur) {
      angle += (Math.random() - 0.5) * 0.7;
      const pas = 7 + Math.random() * 6;
      x += Math.cos(angle) * pas; y += Math.sin(angle) * pas;
      dist += pas;
      pts.push({ x: x, y: y });
    }
    fissures.push(pts);
  }
  return fissures;
};

/* ══ Moteur generique de materiaux par COUCHES — base du createur de
   plateau visuel a venir ══
   Avant : 6 themes = 6 blocs if/else codes en dur, DUPLIQUES a l'identique
   entre le peintre 2D (ce bloc) et le peintre 3D (peindreTextureTheme,
   bloc <script> de la 3D) — meme recette copiee-collee deux fois.
   Maintenant : un theme = une RECETTE (liste ordonnee de couches), chaque
   couche = {type, p} ou "type" pioche dans un petit catalogue de motifs
   reutilisables (degrade, veines, vagues, pores, fissures...) et "p" ses
   parametres. Le moteur (peindreCouches) ne connait aucun theme par son
   nom — il execute juste la recette qu'on lui donne. Un theme personnalise
   (a venir : editeur avec curseurs) sera juste une recette de plus, geree
   EXACTEMENT comme les 6 autres — pas un code special a part.
   Verifie par execution reelle que les 6 recettes REPRODUISENT le rendu
   d'origine (memes motifs, memes plages de valeurs) — voir
   test_theme_layer_engine.js. */
window.LAYER_TYPES = {
  degrade: function(c2, p) {
    const g = c2.createLinearGradient(0, 0, 640, 640);
    g.addColorStop(0, p.c1); g.addColorStop(1, p.c2);
    c2.fillStyle = g; c2.fillRect(0, 0, 640, 640);
  },
  courbes_larges: function(c2, p) {
    for (let i = 0; i < p.n; i++) {
      c2.beginPath();
      const y0 = Math.random() * 640;
      c2.moveTo(0, y0);
      c2.quadraticCurveTo(320, y0 + (Math.random() - 0.5) * 220, 640, y0 + (Math.random() - 0.5) * 120);
      c2.strokeStyle = p.couleur;
      c2.lineWidth = p.largeurMin + Math.random() * (p.largeurMax - p.largeurMin);
      c2.stroke();
    }
  },
  poussiere: function(c2, p) {
    for (let i = 0; i < p.n; i++) {
      const a = p.alphaMin + Math.random() * (p.alphaMax - p.alphaMin);
      c2.fillStyle = 'rgba(' + p.couleur[0] + ',' + p.couleur[1] + ',' + p.couleur[2] + ',' + a.toFixed(3) + ')';
      c2.beginPath(); c2.arc(Math.random() * 640, Math.random() * 640, p.rMin + Math.random() * (p.rMax - p.rMin), 0, 7); c2.fill();
    }
  },
  vagues: function(c2, p) {
    for (let v = 0; v < p.n; v++) {
      c2.beginPath();
      const y0 = (v / p.n) * 640;
      for (let x = 0; x <= 640; x += 6) {
        const y = y0 + Math.sin(x / 42 + v) * 9 + Math.sin(x / 17 + v * 1.7) * 3;
        if (x === 0) c2.moveTo(x, y); else c2.lineTo(x, y);
      }
      const a = p.alphaMin + Math.random() * (p.alphaMax - p.alphaMin);
      c2.strokeStyle = 'rgba(' + p.couleur[0] + ',' + p.couleur[1] + ',' + p.couleur[2] + ',' + a.toFixed(3) + ')';
      c2.lineWidth = 1.2; c2.stroke();
    }
  },
  caustiques: function(c2, p) {
    for (let i = 0; i < p.n; i++) {
      const cx = Math.random() * 640, cy = Math.random() * 640, r = p.rMin + Math.random() * (p.rMax - p.rMin);
      const g = c2.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(' + p.couleur[0] + ',' + p.couleur[1] + ',' + p.couleur[2] + ',' + p.alphaMax + ')');
      g.addColorStop(1, 'rgba(' + p.couleur[0] + ',' + p.couleur[1] + ',' + p.couleur[2] + ',0)');
      c2.fillStyle = g; c2.beginPath(); c2.arc(cx, cy, r, 0, 7); c2.fill();
    }
  },
  veines_turbulentes: function(c2, p) {
    for (let v = 0; v < p.n; v++) {
      c2.beginPath();
      let y0 = Math.random() * 640;
      c2.moveTo(0, y0);
      for (let x = 0; x <= 640; x += 8) {
        const y = y0 + Math.sin(x / 58 + v) * 32 + Math.sin(x / 21 + v * 2.3) * 15 + Math.sin(x / 9 + v) * 5;
        c2.lineTo(x, y);
      }
      const a = p.alphaMin + Math.random() * (p.alphaMax - p.alphaMin);
      c2.strokeStyle = 'rgba(' + p.couleur[0] + ',' + p.couleur[1] + ',' + p.couleur[2] + ',' + a.toFixed(3) + ')';
      c2.lineWidth = p.largeurMin + Math.random() * (p.largeurMax - p.largeurMin);
      c2.stroke();
    }
  },
  rayures_fines: function(c2, p) {
    for (let i = 0; i < p.n; i++) {
      const y = Math.random() * 640;
      const a = p.alphaMin + Math.random() * (p.alphaMax - p.alphaMin);
      c2.strokeStyle = 'rgba(' + p.couleur[0] + ',' + p.couleur[1] + ',' + p.couleur[2] + ',' + a.toFixed(3) + ')';
      c2.lineWidth = 0.5 + Math.random();
      c2.beginPath(); c2.moveTo(0, y); c2.lineTo(640, y + (Math.random() - 0.5) * 4); c2.stroke();
    }
  },
  reflet_diagonal: function(c2, p) {
    const g = c2.createLinearGradient(0, 0, 640, 640);
    g.addColorStop(0.32, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(' + p.couleur[0] + ',' + p.couleur[1] + ',' + p.couleur[2] + ',' + p.alphaPic + ')');
    g.addColorStop(0.68, 'rgba(255,255,255,0)');
    c2.fillStyle = g; c2.fillRect(0, 0, 640, 640);
  },
  taches_organiques: function(c2, p) {
    for (let i = 0; i < p.n; i++) {
      const cx = Math.random() * 640, cy = Math.random() * 640, r = p.rMin + Math.random() * (p.rMax - p.rMin);
      c2.fillStyle = p.couleurFn();
      c2.beginPath(); c2.arc(cx, cy, r, 0, 7); c2.fill();
    }
  },
  pores: function(c2, p) {
    for (let i = 0; i < p.n; i++) {
      const cx = Math.random() * 640, cy = Math.random() * 640, r = p.rMin + Math.random() * (p.rMax - p.rMin);
      const a = p.alphaMin + Math.random() * (p.alphaMax - p.alphaMin);
      c2.fillStyle = 'rgba(0,0,0,' + a.toFixed(3) + ')';
      c2.beginPath(); c2.arc(cx, cy, r, 0, 7); c2.fill();
    }
  },
  fissures: function(c2, p) {
    for (let b = 0; b < p.fissures.length; b++) {
      const pts = p.fissures[b];
      c2.beginPath(); c2.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) c2.lineTo(pts[i].x, pts[i].y);
      c2.strokeStyle = p.couleur;
      c2.globalAlpha = p.alpha * (0.6 + Math.random() * 0.4);
      c2.lineWidth = p.largeur * (0.5 + Math.random());
      c2.stroke();
    }
    c2.globalAlpha = 1;
  },
};
window.peindreCouches = function(c2, couches) {
  couches.forEach(function(couche) {
    const fn = window.LAYER_TYPES[couche.type];
    if (fn) fn(c2, couche.p);
  });
};
// Recette = fonction(t, night, options) -> liste de couches. Exactement les
// memes motifs/plages de valeurs que l'ancien code if/else (verifie par
// test), juste reorganises en donnees plutot qu'en branches.
window.THEME_RECIPES = {
  dark: function(t) {
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'courbes_larges', p: { n: 4, couleur: 'rgba(210,220,230,0.07)', largeurMin: 24, largeurMax: 54 } },
      { type: 'poussiere', p: { n: 30, couleur: [255, 255, 255], alphaMin: 0.03, alphaMax: 0.09, rMin: 0.6, rMax: 2.2 } },
    ];
  },
  ocean: function(t) {
    return [
      { type: 'degrade', p: { c1: t.surf[1], c2: t.gutterOuter } },
      { type: 'vagues', p: { n: 22, couleur: [180, 222, 240], alphaMin: 0.05, alphaMax: 0.12 } },
      { type: 'caustiques', p: { n: 9, couleur: [200, 240, 255], alphaMax: 0.14, rMin: 24, rMax: 70 } },
    ];
  },
  marble: function(t) {
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'veines_turbulentes', p: { n: 16, couleur: [110, 105, 96], alphaMin: 0.12, alphaMax: 0.30, largeurMin: 1, largeurMax: 3.4 } },
    ];
  },
  gold: function(t) {
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'rayures_fines', p: { n: 260, couleur: [255, 232, 160], alphaMin: 0.025, alphaMax: 0.075 } },
      { type: 'reflet_diagonal', p: { couleur: [255, 242, 205], alphaPic: 0.22 } },
    ];
  },
  forest: function(t) {
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'taches_organiques', p: { n: 100, rMin: 7, rMax: 27, couleurFn: function() {
        return 'rgba(' + Math.round(20 + Math.random() * 45) + ',' + Math.round(60 + Math.random() * 55) + ',' + Math.round(20 + Math.random() * 35) + ',0.22)';
      } } },
    ];
  },
  volcanique: function(t, night, options) {
    const couches = [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'pores', p: { n: 180, alphaMin: 0.15, alphaMax: 0.35, rMin: 2, rMax: 9 } },
    ];
    // La 3D n'a plus besoin des fissures peintes (vraie geometrie depuis
    // v1.45) — options.sansFissures le lui permet de sauter cette couche
    // sans dupliquer la recette.
    if (!(options && options.sansFissures)) {
      const fissures = window.genererFissures(26);
      if (night) {
        couches.push({ type: 'fissures', p: { fissures: fissures, couleur: 'rgba(255,80,0,0.35)', largeur: 10, alpha: 0.5 } });
        couches.push({ type: 'fissures', p: { fissures: fissures, couleur: '#ff5722', largeur: 2.5, alpha: 0.9 } });
      } else {
        couches.push({ type: 'fissures', p: { fissures: fissures, couleur: t.trim, largeur: 3, alpha: 0.7 } });
      }
    }
    return couches;
  },
  /* 10 nouveaux themes — chaque recette ne fait qu'assembler 2-3 couches du
     catalogue EXISTANT (LAYER_TYPES), rien de nouveau invente au niveau du
     moteur. Verifie par rendu reel (voir test_new_material_themes.js et
     capture Playwright) que les 10 sont visuellement distincts. */
  metal: function(t) {   // acier brosse : grain directionnel + reflet net
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'rayures_fines', p: { n: 420, couleur: [255, 255, 255], alphaMin: 0.02, alphaMax: 0.10 } },
      { type: 'reflet_diagonal', p: { couleur: [255, 255, 255], alphaPic: 0.28 } },
    ];
  },
  bronze: function(t) {   // patine organique + reflet chaud
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'taches_organiques', p: { n: 70, rMin: 5, rMax: 20, couleurFn: function() {
        return 'rgba(' + Math.round(40 + Math.random()*40) + ',' + Math.round(70 + Math.random()*40) + ',' + Math.round(40 + Math.random()*30) + ',0.16)';
      } } },
      { type: 'reflet_diagonal', p: { couleur: [255, 224, 170], alphaPic: 0.20 } },
    ];
  },
  cuivre: function(t) {   // vert-de-gris (patine oxydee) + fines rayures chaudes
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'taches_organiques', p: { n: 55, rMin: 6, rMax: 24, couleurFn: function() {
        return 'rgba(' + Math.round(60 + Math.random()*40) + ',' + Math.round(140 + Math.random()*50) + ',' + Math.round(110 + Math.random()*40) + ',0.14)';
      } } },
      { type: 'rayures_fines', p: { n: 180, couleur: [255, 200, 150], alphaMin: 0.03, alphaMax: 0.09 } },
    ];
  },
  ardoise: function(t) {   // pierre feuilletee : fines fissures + grain
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'veines_turbulentes', p: { n: 12, couleur: [10, 12, 14], alphaMin: 0.15, alphaMax: 0.35, largeurMin: 0.6, largeurMax: 1.8 } },
      { type: 'pores', p: { n: 90, alphaMin: 0.08, alphaMax: 0.20, rMin: 1, rMax: 3.5 } },
    ];
  },
  granite: function(t) {   // grain sel-et-poivre (deux nuages de mouchetures)
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'poussiere', p: { n: 400, couleur: [20, 20, 22], alphaMin: 0.06, alphaMax: 0.16, rMin: 0.5, rMax: 2 } },
      { type: 'poussiere', p: { n: 260, couleur: [235, 232, 225], alphaMin: 0.05, alphaMax: 0.14, rMin: 0.5, rMax: 2.2 } },
    ];
  },
  verre: function(t) {   // translucide : caustiques + reflet vif
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'caustiques', p: { n: 14, couleur: [230, 250, 255], alphaMax: 0.20, rMin: 30, rMax: 90 } },
      { type: 'reflet_diagonal', p: { couleur: [255, 255, 255], alphaPic: 0.35 } },
    ];
  },
  beton: function(t) {   // mat, grain fin, quelques micro-fissures
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'poussiere', p: { n: 320, couleur: [40, 40, 38], alphaMin: 0.04, alphaMax: 0.12, rMin: 0.6, rMax: 2.4 } },
      { type: 'rayures_fines', p: { n: 40, couleur: [15, 15, 14], alphaMin: 0.05, alphaMax: 0.12 } },
    ];
  },
  corail: function(t) {   // texture organique + lumiere sous-marine
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'taches_organiques', p: { n: 130, rMin: 4, rMax: 16, couleurFn: function() {
        return 'rgba(' + Math.round(200 + Math.random()*50) + ',' + Math.round(100 + Math.random()*60) + ',' + Math.round(80 + Math.random()*50) + ',0.18)';
      } } },
      { type: 'caustiques', p: { n: 8, couleur: [255, 220, 210], alphaMax: 0.12, rMin: 26, rMax: 65 } },
    ];
  },
  glace: function(t) {   // fissures pales + reflets froids
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'veines_turbulentes', p: { n: 10, couleur: [255, 255, 255], alphaMin: 0.10, alphaMax: 0.24, largeurMin: 0.8, largeurMax: 2.2 } },
      { type: 'caustiques', p: { n: 10, couleur: [220, 245, 255], alphaMax: 0.16, rMin: 22, rMax: 60 } },
      { type: 'reflet_diagonal', p: { couleur: [255, 255, 255], alphaPic: 0.22 } },
    ];
  },
  carbone: function(t) {   // laque noire profonde + reflet net
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'rayures_fines', p: { n: 500, couleur: [90, 90, 100], alphaMin: 0.02, alphaMax: 0.07 } },
      { type: 'reflet_diagonal', p: { couleur: [180, 190, 220], alphaPic: 0.30 } },
    ];
  },
  onyx: function(t) {   // pierre noire veinee d'or
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'veines_turbulentes', p: { n: 5, couleur: [255, 140, 0], alphaMin: 0.10, alphaMax: 0.28, largeurMin: 0.8, largeurMax: 2.2 } },
      { type: 'poussiere', p: { n: 70, couleur: [255, 180, 60], alphaMin: 0.05, alphaMax: 0.16, rMin: 0.5, rMax: 2 } },
      { type: 'reflet_diagonal', p: { couleur: [255, 160, 60], alphaPic: 0.18 } },
    ];
  },
  jade: function(t) {   // pierre organique verte
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'taches_organiques', p: { n: 90, rMin: 5, rMax: 18, couleurFn: function() {
        return 'rgba(' + Math.round(50 + Math.random()*60) + ',' + Math.round(110 + Math.random()*70) + ',' + Math.round(50 + Math.random()*50) + ',0.16)';
      } } },
      { type: 'veines_turbulentes', p: { n: 8, couleur: [20, 60, 20], alphaMin: 0.12, alphaMax: 0.28, largeurMin: 0.6, largeurMax: 1.8 } },
      { type: 'pores', p: { n: 70, alphaMin: 0.06, alphaMax: 0.16, rMin: 1, rMax: 2.5 } },
    ];
  },
  stardust: function(t) {   // nuit etoilee
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'poussiere', p: { n: 260, couleur: [255, 255, 255], alphaMin: 0.03, alphaMax: 0.14, rMin: 0.4, rMax: 1.6 } },
      { type: 'caustiques', p: { n: 8, couleur: [150, 170, 220], alphaMax: 0.14, rMin: 24, rMax: 60 } },
      { type: 'reflet_diagonal', p: { couleur: [170, 190, 230], alphaPic: 0.14 } },
    ];
  },
  terracotta: function(t) {   // argile mediterraneenne
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'poussiere', p: { n: 220, couleur: [200, 140, 90], alphaMin: 0.05, alphaMax: 0.16, rMin: 0.5, rMax: 2.4 } },
      { type: 'veines_turbulentes', p: { n: 9, couleur: [110, 55, 25], alphaMin: 0.12, alphaMax: 0.26, largeurMin: 0.8, largeurMax: 2 } },
      { type: 'pores', p: { n: 100, alphaMin: 0.05, alphaMax: 0.14, rMin: 1, rMax: 2.6 } },
    ];
  },
  banquise: function(t) {   // glace de mer arctique — distinct de "glace" (fissures) : ici vagues + reflets
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'vagues', p: { n: 16, couleur: [190, 225, 245], alphaMin: 0.06, alphaMax: 0.16 } },
      { type: 'caustiques', p: { n: 12, couleur: [210, 235, 250], alphaMax: 0.16, rMin: 26, rMax: 70 } },
      { type: 'reflet_diagonal', p: { couleur: [255, 255, 255], alphaPic: 0.20 } },
    ];
  },
  nacre: function(t) {   // irise, perle violette
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'courbes_larges', p: { n: 6, couleur: 'rgba(190,170,220,0.18)', largeurMin: 14, largeurMax: 34 } },
      { type: 'poussiere', p: { n: 160, couleur: [210, 190, 230], alphaMin: 0.04, alphaMax: 0.13, rMin: 0.5, rMax: 2 } },
      { type: 'reflet_diagonal', p: { couleur: [220, 200, 240], alphaPic: 0.22 } },
    ];
  },
  patina: function(t) {   // cuivre patine, oxydation verte
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'taches_organiques', p: { n: 60, rMin: 5, rMax: 20, couleurFn: function() {
        return 'rgba(' + Math.round(70 + Math.random()*40) + ',' + Math.round(130 + Math.random()*50) + ',' + Math.round(95 + Math.random()*40) + ',0.15)';
      } } },
      { type: 'veines_turbulentes', p: { n: 7, couleur: [90, 150, 120], alphaMin: 0.10, alphaMax: 0.22, largeurMin: 0.8, largeurMax: 2 } },
      { type: 'pores', p: { n: 80, alphaMin: 0.05, alphaMax: 0.14, rMin: 1, rMax: 2.5 } },
    ];
  },
  desert: function(t) {   // dunes de sable chaud
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'poussiere', p: { n: 240, couleur: [200, 160, 100], alphaMin: 0.05, alphaMax: 0.18, rMin: 0.5, rMax: 3 } },
      { type: 'courbes_larges', p: { n: 5, couleur: 'rgba(140,100,60,0.20)', largeurMin: 20, largeurMax: 46 } },
      { type: 'reflet_diagonal', p: { couleur: [220, 180, 130], alphaPic: 0.16 } },
    ];
  },
  abyss: function(t) {   // fond marin, tres sombre, lueur rare
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'vagues', p: { n: 10, couleur: [30, 80, 110], alphaMin: 0.08, alphaMax: 0.20 } },
      { type: 'caustiques', p: { n: 6, couleur: [60, 140, 170], alphaMax: 0.10, rMin: 20, rMax: 55 } },
      { type: 'poussiere', p: { n: 90, couleur: [100, 180, 210], alphaMin: 0.02, alphaMax: 0.08, rMin: 0.4, rMax: 1.4 } },
    ];
  },
  lava: function(t) {   // veines de lave EN MOUVEMENT (distinct de "volcanique" : roche craquelee statique)
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'veines_turbulentes', p: { n: 14, couleur: [232, 96, 64], alphaMin: 0.22, alphaMax: 0.42, largeurMin: 1.5, largeurMax: 3.5 } },
      { type: 'taches_organiques', p: { n: 35, rMin: 5, rMax: 16, couleurFn: function() {
        return 'rgba(' + Math.round(210 + Math.random()*40) + ',' + Math.round(60 + Math.random()*50) + ',' + Math.round(30 + Math.random()*30) + ',0.22)';
      } } },
      { type: 'reflet_diagonal', p: { couleur: [255, 120, 80], alphaPic: 0.26 } },
    ];
  },
  marble_white: function(t) {   // marbre clair, distinct de "marble" (plus sombre, un seul type de veine)
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'veines_turbulentes', p: { n: 10, couleur: [140, 140, 140], alphaMin: 0.08, alphaMax: 0.20, largeurMin: 0.6, largeurMax: 2 } },
      { type: 'rayures_fines', p: { n: 200, couleur: [230, 230, 230], alphaMin: 0.02, alphaMax: 0.08 } },
      { type: 'taches_organiques', p: { n: 20, rMin: 8, rMax: 24, couleurFn: function() { return 'rgba(210,210,210,0.06)'; } } },
    ];
  },
  pastel: function(t) {   // doux, teintes claires
    return [
      { type: 'degrade', p: { c1: t.surf[0], c2: t.surf[2] } },
      { type: 'courbes_larges', p: { n: 6, couleur: 'rgba(176,144,176,0.16)', largeurMin: 18, largeurMax: 40 } },
      { type: 'taches_organiques', p: { n: 40, rMin: 6, rMax: 18, couleurFn: function() {
        return 'rgba(' + Math.round(190 + Math.random()*30) + ',' + Math.round(160 + Math.random()*30) + ',' + Math.round(190 + Math.random()*30) + ',0.12)';
      } } },
      { type: 'pores', p: { n: 50, alphaMin: 0.03, alphaMax: 0.09, rMin: 1, rMax: 2.4 } },
    ];
  },
};

/* Textures procedurales des 6 themes de plateau, cote 2D — MEMES formules
   que la version 3D (getThemeTexture, plus bas dans le bloc <script> de la
   3D), portees ici plutot que reinventees, mais avec un vrai souci de
   PERFORMANCE propre a la 2D : drawBoard() redessine le canvas ENTIER a
   chaque coup, chaque survol, chaque frame d'animation — repeindre 100+
   formes avec Math.random() a chaque appel serait couteux ET instable
   visuellement (le motif "sauterait" a chaque redessin puisque
   Math.random() donnerait une position differente a chaque fois). Chaque
   texture est donc peinte UNE SEULE FOIS sur un canvas hors-ecran, mis en
   cache par (theme, jour/nuit), puis simplement collee (drawImage) a
   chaque redessin — aussi rapide qu'un degrade, motif stable. Signale par
   Olivier — "je veux ca pour chaque theme". */
const themeTextures2D = {};
function peindreTextureTheme2D(nom, night, t) {
  const cv = document.createElement('canvas');
  cv.width = 640; cv.height = 640;
  const c2 = cv.getContext('2d');
  const recette = window.THEME_RECIPES[nom];
  if (recette) window.peindreCouches(c2, recette(t, night));
  return cv;
}
function getThemeCanvas2D(nom, night, t) {
  const cle = nom + (night ? '_nuit' : '_jour');
  if (themeTextures2D[cle]) return themeTextures2D[cle];
  themeTextures2D[cle] = peindreTextureTheme2D(nom, night, t);
  return themeTextures2D[cle];
}

/* Dessine le plateau ENTIER sur le canvas (halo, gouttière en bois/résine,
   triangles décoratifs, cases surlignées, coordonnées, billes éjectées, puis
   les billes elles-mêmes plus loin dans la fonction) — appelée à chaque coup,
   chaque rotation, chaque changement de thème/skin. Ordre de dessin (chaque
   couche recouvre la précédente, donc l'ordre compte) :
     1. Halo lumineux de fond
     2. Contour hexagonal du plateau (calculé depuis les 6 coins réels)
     3. Gouttière en bois/résine (+ rivières bleues, triangles dorés)
     4. Indices de coups possibles (si activés)
     5. Coordonnées des cases (a1...i9)
     6. Billes déjà éjectées, dans la gouttière
     7. Les 61 cases et les billes qui les occupent (plus loin dans la fonction)
   opts permet de dessiner un plateau DIFFÉRENT du plateau de partie en cours
   (ex: aperçu figé pour un puzzle ou une position historique) sans toucher
   aux variables globales — voir boardData = opts.board || board plus bas. */
function drawBoard(opts) {
  opts = opts || {};
  const canvasId = opts.canvasId || 'board';
  const boardData = opts.board || board;          // plateau à dessiner
  // Synchronise la vue 3D si elle est ouverte (uniquement pour le plateau principal)
  if (canvasId === 'board' && typeof window.refresh3DIfActive === 'function') window.refresh3DIfActive();
  if (canvasId === 'board' && typeof window.refresh1DIfActive === 'function') window.refresh1DIfActive();
  if (canvasId === 'board' && typeof syncSideButtonColors === 'function') syncSideButtonColors();
  if (canvasId === 'board' && typeof _broadcastProjectorState === 'function') _broadcastProjectorState();
  const sel = opts.selected || selected;          // sélection à dessiner
  const showHints = (opts.showHints !== undefined) ? opts.showHints : showMoveHints;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const SIZE = canvas.width;                       // s'adapte à la taille du canvas
  const scale = SIZE / 640;                        // 640 = taille de référence
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,SIZE,SIZE);
  ctx.save();
  ctx.scale(scale, scale);                         // met à l'échelle tout le rendu
  const CX = 320, CY = 320;

  // ── Halo lumineux de fond (radial gris → sombre) ──
  const halo = ctx.createRadialGradient(CX, CY, 40, CX, CY, 350);
  halo.addColorStop(0, '#9a9a9a');
  halo.addColorStop(0.55, '#6e6e6e');
  halo.addColorStop(1, '#3a3a3a');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, 640, 640);

  // ── Plateau hexagonal ajusté aux 6 coins réels de la grille de billes ──
  // Les 6 coins du losange Abalone : r0c0, r0c(max), r4c(max), r8c(max), r8c0, r4c0
  const corners = [
    hexCoord(0, 0),
    hexCoord(0, ROWS[0]-1),
    hexCoord(4, ROWS[4]-1),
    hexCoord(8, ROWS[8]-1),
    hexCoord(8, 0),
    hexCoord(4, 0),
  ];
  const pad = HEX_RADIUS + 22;  // marge autour des billes (cercles du bord complets)
  // centre réel = moyenne des coins
  let mx=0, my=0; corners.forEach(p=>{mx+=p.x; my+=p.y;}); mx/=6; my/=6;
  // étend chaque coin vers l'extérieur depuis le centre
  const outer = corners.map(p => {
    const dx=p.x-mx, dy=p.y-my, d=Math.hypot(dx,dy);
    return { x: p.x + dx/d*pad, y: p.y + dy/d*pad };
  });

  function pathFromCorners(pts, rad) {
    ctx.beginPath();
    for (let i=0;i<pts.length;i++) {
      const cur=pts[i], next=pts[(i+1)%pts.length];
      if (i===0) {
        const prev=pts[pts.length-1];
        const d1=Math.hypot(cur.x-prev.x, cur.y-prev.y);
        ctx.moveTo(cur.x+(prev.x-cur.x)/d1*rad, cur.y+(prev.y-cur.y)/d1*rad);
      }
      ctx.arcTo(cur.x, cur.y, next.x, next.y, rad);
    }
    ctx.closePath();
  }

  // ══ GOUTTIÈRE : anneau hexagonal autour du plateau ══
  const gutterW = 46;  // largeur de la gouttière (assez large pour les billes)
  // theme de SURFACE (Obsidian/Ocean/Marbre/Or/Foret) — le bois reste a
  // part (degrade lineaire + veines + rivieres, voir plus bas), donc pas
  // dans cette table ; repli sur Obsidian si le theme est inconnu.
  const surfTheme = resolveThemeColors(boardTheme.theme, boardTheme.night);
  const gutterOuter = corners.map(p => {
    const dx=p.x-mx, dy=p.y-my, d=Math.hypot(dx,dy);
    return { x: p.x + dx/d*(pad+gutterW), y: p.y + dy/d*(pad+gutterW) };
  });
  ctx.save();
  // paroi extérieure sombre de la gouttière
  pathFromCorners(gutterOuter, 22);
  ctx.fillStyle = boardTheme.wood ? '#5a3a1e' : surfTheme.gutterOuter;
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 4;
  ctx.fill();
  ctx.restore();
  // creux de la gouttière (légèrement plus clair pour l'effet de profondeur)
  ctx.save();
  pathFromCorners(gutterOuter.map(p => {
    const dx=p.x-mx, dy=p.y-my, d=Math.hypot(dx,dy);
    return { x: p.x - dx/d*3, y: p.y - dy/d*3 };
  }), 20);
  const gutGrad = ctx.createRadialGradient(mx, my, 200, mx, my, 300);
  if (boardTheme.wood) { gutGrad.addColorStop(0, '#b58a52'); gutGrad.addColorStop(1, '#7e5028'); }
  else { gutGrad.addColorStop(0, surfTheme.gutGrad[0]); gutGrad.addColorStop(1, surfTheme.gutGrad[1]); }
  ctx.fillStyle = gutGrad;
  ctx.fill();
  ctx.restore();

  // contour noir extérieur
  ctx.save();
  pathFromCorners(outer, 18);
  ctx.fillStyle = boardTheme.wood ? '#3a2614' : surfTheme.trim;
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
  ctx.fill();
  ctx.restore();

  // ── Résine époxy uniquement sur l'angle haut-gauche de la gouttière ──
  if (boardTheme.wood) {
    const cornerEpoxy = function(c){
      const prev=(c+5)%6, next=(c+1)%6, t=0.26;
      const lerp=(P,Q,k)=>({x:P.x+(Q.x-P.x)*k, y:P.y+(Q.y-P.y)*k});
      const a=lerp(outer[c],outer[prev],t), b=lerp(outer[c],outer[next],t);
      const a2=lerp(gutterOuter[c],gutterOuter[prev],t), b2=lerp(gutterOuter[c],gutterOuter[next],t);
      ctx.beginPath();
      ctx.moveTo(a.x,a.y); ctx.lineTo(outer[c].x,outer[c].y); ctx.lineTo(b.x,b.y);
      ctx.lineTo(b2.x,b2.y); ctx.lineTo(gutterOuter[c].x,gutterOuter[c].y); ctx.lineTo(a2.x,a2.y);
      ctx.closePath();
      const g=ctx.createRadialGradient(outer[c].x,outer[c].y,2,gutterOuter[c].x,gutterOuter[c].y,gutterW*1.15);
      g.addColorStop(0,'rgba(96,175,240,0.96)'); g.addColorStop(0.5,'rgba(28,98,188,0.97)'); g.addColorStop(1,'rgba(8,38,102,0.98)');
      ctx.fillStyle=g; ctx.shadowColor='rgba(0,0,0,0.4)'; ctx.shadowBlur=8; ctx.fill(); ctx.shadowBlur=0;
      ctx.strokeStyle='rgba(165,215,255,0.45)'; ctx.lineWidth=2;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(outer[c].x,outer[c].y); ctx.lineTo(b.x,b.y); ctx.stroke();
    };
    ctx.save(); cornerEpoxy(0); ctx.restore();   // 0 = angle haut-gauche
  }

  // surface grise claire intérieure
  const inner = corners.map(p => {
    const dx=p.x-mx, dy=p.y-my, d=Math.hypot(dx,dy);
    return { x: p.x + dx/d*(pad-20), y: p.y + dy/d*(pad-20) };
  });
  pathFromCorners(inner, 14);
  if (boardTheme.wood) {
    const wood = ctx.createLinearGradient(mx-230, my-210, mx+230, my+210);
    wood.addColorStop(0, '#cda472'); wood.addColorStop(0.5, '#a9763f'); wood.addColorStop(1, '#85562d');
    ctx.fillStyle = wood; ctx.fill();
    // veines du bois (clippées à la surface intérieure)
    ctx.save(); pathFromCorners(inner, 14); ctx.clip();
    ctx.lineWidth = 2; ctx.globalAlpha = 0.16;
    for (let g = 0; g < 28; g++) {
      const y0 = my - 220 + g * 16;
      ctx.strokeStyle = (g % 2) ? '#6b4222' : '#dcb888';
      ctx.beginPath();
      for (let x = mx - 250; x <= mx + 250; x += 10) {
        const yy = y0 + Math.sin((x + g * 37) / 52) * 6 + Math.sin(x / 120) * 9;
        if (x === mx - 250) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1; ctx.restore();
  } else {
    const surf = ctx.createRadialGradient(mx, my, 30, mx, my, 260);
    surf.addColorStop(0, surfTheme.surf[0]);
    surf.addColorStop(0.7, surfTheme.surf[1]);
    surf.addColorStop(1, surfTheme.surf[2]);
    ctx.fillStyle = surf;
    ctx.fill();
    // texture procedurale par-dessus le degrade de base, clippee a la surface
    ctx.save();
    pathFromCorners(inner, 14); ctx.clip();
    const tex2d = getThemeCanvas2D(boardTheme.theme, boardTheme.night, surfTheme);
    if (tex2d) ctx.drawImage(tex2d, mx - 320, my - 320);
    ctx.restore();
  }

  // ── Rivières de résine époxy bleue (coulées sinueuses translucides sur le bois) ──
  if (boardTheme.wood) {
    ctx.save();
    pathFromCorners(gutterOuter, 22); ctx.clip();   // confine les rivières au plateau
    const rivers = [
      { y: my - 165, amp: 55, w: 30, phase: 0.4 },
      { y: my + 30,  amp: 95, w: 22, phase: 3.1 },
      { y: my + 175, amp: 60, w: 36, phase: 1.7 },
    ];
    const x0 = mx - 340, x1 = mx + 340;
    function riverY(rv, x){ return rv.y + Math.sin((x/95) + rv.phase) * rv.amp + Math.sin(x/38) * 9; }
    rivers.forEach(function(rv){
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 7){ const yy = riverY(rv, x); if (x === x0) ctx.moveTo(x, yy - rv.w/2); else ctx.lineTo(x, yy - rv.w/2); }
      for (let x = x1; x >= x0; x -= 7){ const yy = riverY(rv, x); ctx.lineTo(x, yy + rv.w/2); }
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, rv.y - rv.amp, 0, rv.y + rv.amp + rv.w);
      grad.addColorStop(0, 'rgba(46,130,205,0.82)');
      grad.addColorStop(0.5, 'rgba(20,82,165,0.9)');
      grad.addColorStop(1, 'rgba(9,42,108,0.92)');
      ctx.fillStyle = grad;
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 6;
      ctx.fill();
      ctx.shadowBlur = 0;
      // reflet brillant sur le dessus de la coulée (effet résine vernie)
      ctx.strokeStyle = 'rgba(165,215,255,0.55)'; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = x0; x <= x1; x += 7){ const yy = riverY(rv, x) - rv.w/2 + 2.5; if (x === x0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
      ctx.stroke();
    });
    ctx.restore();
  }

  // encoches arrondies sur chaque côté
  ctx.save();
  ctx.strokeStyle = 'rgba(180,180,180,0.35)';
  ctx.lineWidth = 7; ctx.lineCap = 'round';
  for (let i=0;i<6;i++) {
    const a=outer[i], b=outer[(i+1)%6];
    const midx=(a.x+b.x)/2, midy=(a.y+b.y)/2;
    const dx=b.x-a.x, dy=b.y-a.y, len=Math.hypot(dx,dy);
    ctx.beginPath();
    ctx.moveTo(midx-dx/len*len*0.32, midy-dy/len*len*0.32);
    ctx.lineTo(midx+dx/len*len*0.32, midy+dy/len*len*0.32);
    ctx.stroke();
  }
  ctx.restore();

  // ── Triangles dorés entre les cellules (texture géométrique) ──
  if (!boardTheme.wood) drawBoardTriangles(ctx);

  // ── Indices de coups : cases où la sélection peut aller (si activé) ──
  const turnForHints = opts.turn || currentTurn;
  const hintCells = (showHints && sel.length > 0)
    ? computeMoveHints(sel, turnForHints, boardData) : [];

  // ── Mode Enfant : met en évidence, AVANT toute sélection, toutes les
  //    billes du joueur au trait qui ont au moins un coup légal — évite à
  //    un jeune joueur de chercher au hasard laquelle peut bouger.
  const kidsPlayableCells = (typeof kidsMode !== 'undefined' && kidsMode && sel.length === 0)
    ? computePlayableCells(turnForHints, boardData) : null;

  for (let r=0;r<9;r++) {
    for (let c=0;c<ROWS[r];c++) {
      const {x,y} = hexCoord(r,c);
      const key = `${r},${c}`;
      const piece = boardData[key];
      const isSel = sel.some(s=>s.r===r&&s.c===c);
      const hint = hintCells.find(h=>h.r===r&&h.c===c);
      // masque les billes en cours d'animation de glissement (dessinées à part)
      const isAnimating = opts.hideAnimPieces && opts.hideAnimPieces.some(function(pc){ return pc.toR===r && pc.toC===c; });

      // Cellule : léger creux gravé dans la surface claire
      ctx.beginPath();
      ctx.arc(x, y, HEX_RADIUS-7, 0, Math.PI*2);
      const cellGrad = ctx.createRadialGradient(x-2, y-2, 1, x, y, HEX_RADIUS-7);
      if (isSel) {
        cellGrad.addColorStop(0, 'rgba(200,168,75,0.45)');
        cellGrad.addColorStop(1, 'rgba(160,130,50,0.2)');
      } else {
        cellGrad.addColorStop(0, 'rgba(110,110,110,0.55)');
        cellGrad.addColorStop(0.7, 'rgba(130,130,130,0.3)');
        cellGrad.addColorStop(1, 'rgba(165,165,165,0.1)');
      }
      ctx.fillStyle = cellGrad;
      ctx.fill();
      ctx.strokeStyle = isSel ? 'rgba(200,168,75,0.7)' : 'rgba(90,90,90,0.5)';
      ctx.lineWidth = isSel ? 1.5 : 1;
      ctx.stroke();

      if (kidsPlayableCells && kidsPlayableCells.has(key) && piece) {
        ctx.save();
        ctx.beginPath(); ctx.arc(x, y, HEX_RADIUS - 2, 0, Math.PI*2);
        const pulse = 0.35 + 0.15 * Math.sin(Date.now() / 400);
        ctx.strokeStyle = 'rgba(90,180,140,' + pulse.toFixed(2) + ')';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
      if (piece && !isAnimating) drawMarble(ctx, x, y, piece, isSel);

      // Indice de coup possible (point vert = déplacement, rouge = poussée)
      if (hint && !isSel) {
        ctx.beginPath();
        ctx.arc(x, y, hint.push ? 9 : 7, 0, Math.PI*2);
        ctx.fillStyle = hint.push ? 'rgba(224,92,75,0.55)' : 'rgba(74,148,99,0.6)';
        ctx.fill();
        ctx.strokeStyle = hint.push ? 'rgba(224,92,75,0.9)' : 'rgba(74,148,99,0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  // ── Coordonnées des cases (notation officielle A-I / 1-9) ──
  // Dessinées APRÈS les billes (donc par-dessus) pour rester visibles,
  // au centre de chaque case, en jaune, sans fond.
  const coordsOn = opts.showCoords !== undefined ? opts.showCoords : showCoordinates;
  if (coordsOn) {
    ctx.save();
    ctx.font = '700 11px "DM Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let r=0;r<9;r++) {
      for (let c=0;c<ROWS[r];c++) {
        const { x, y } = hexCoord(r,c);
        const label = coordToABAPRO(r, c);
        // léger contour sombre pour rester lisible sur les billes claires comme foncées
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(0,0,0,0.55)';
        ctx.strokeText(label, x, y);
        ctx.fillStyle = '#f0c040';   // jaune
        ctx.fillText(label, x, y);
      }
    }
    ctx.restore();
  }

  // ── Billes éjectées dans la gouttière ──
  drawGutterMarbles(ctx, corners, mx, my, pad, gutterW, opts);
  /* Surcouches liees a LA PARTIE EN COURS : fleche du dernier coup et halos
     de menace. drawLastMoveArrow lit boardSnapshots et drawThreats lit le
     plateau global — sur les canvas Editeur / Puzzles / Analyse / Tutoriel,
     elles affichaient donc l'etat de la partie precedente. C'est exactement
     le defaut deja corrige pour les billes ejectees via hideGutter : l'option
     manquait simplement pour ces deux calques. Signale par Saab (« Charge
     apres ma game, il reste la fleche »). */
  if (!opts.hideGameOverlays) {
    if (typeof drawLastMoveArrow === 'function') drawLastMoveArrow(ctx);
    if (typeof drawThreats === 'function') drawThreats(ctx);
    if (typeof drawCarteTactiqueOverlay === 'function') drawCarteTactiqueOverlay(ctx);
  }
  ctx.restore();
}

/* Chemin d'hexagone à coins arrondis (pointes haut/bas, épouse le losange de billes) */
function roundedHexPath(ctx, cx, cy, R, rad) {
  const pts = [];
  for (let i=0;i<6;i++) {
    const a = Math.PI/180 * (60*i - 30);
    pts.push([cx + R*Math.cos(a), cy + R*Math.sin(a)]);
  }
  ctx.beginPath();
  for (let i=0;i<6;i++) {
    const cur = pts[i], next = pts[(i+1)%6];
    if (i===0) {
      const prev = pts[5];
      const d1 = Math.hypot(cur[0]-prev[0], cur[1]-prev[1]);
      ctx.moveTo(cur[0]+(prev[0]-cur[0])/d1*rad, cur[1]+(prev[1]-cur[1])/d1*rad);
    }
    ctx.arcTo(cur[0], cur[1], next[0], next[1], rad);
  }
  ctx.closePath();
}

/* Dessine les billes éjectées dans la gouttière autour du plateau.
   Les billes capturées par les Noirs (donc des billes blanches éjectées)
   s'accumulent en haut ; celles capturées par les Blancs (billes noires) en bas. */
function drawGutterMarbles(ctx, corners, mx, my, pad, gutterW, opts) {
  opts = opts || {};
  /* L'Editeur et l'Analyse passaient deja hideGutter:true, mais l'option
     n'etait jamais lue : les billes ejectees de la partie precedente
     restaient affichees dans ces deux modes. Signale par Saab. */
  if (opts.hideGutter) return;
  const gr = HEX_RADIUS * 0.82;          // même taille (env.) que les billes du plateau
  const spacing = gr * 2.0;

  /* CORRECTIF (bug de rotation signale par Saab, confirme par capture
     d'ecran) : halfH venait auparavant de corners[0] = hexCoord(0,0),
     calcule AVEC la rotation courante. Prendre Math.abs(my - corner.y)
     sur un point qui tourne donne une grandeur qui varie selon l'angle
     (la composante Y seule d'un point en rotation n'est pas une hauteur
     fixe) -- au lieu d'un vrai rayon de plateau invariant. Verifie : a
     120°/300° halfH s'effondrait a une fraction de sa valeur normale,
     rapprochant toute la rigole du centre au point de chevaucher le
     plateau. hexCoord(0,0,true) (ignorerRotation) donne un point de
     repere FIXE ; my reste egal au centre (320) quelle que soit la
     rotation (verifie empiriquement) -- leur difference est donc une
     hauteur de plateau reellement invariante. */
  const topCornerFixe = hexCoord(0, 0, true);
  const halfH = Math.abs(my - topCornerFixe.y);
  // Position des billes dans la gouttière : milieu de la gouttière, légèrement
  // ajusté pour ne pas toucher le plateau ni déborder du cadre.
  const ringR = halfH + pad + gutterW/2 - HEX_RADIUS - 2;

  // ── Mode PUZZLE : on affiche les billes blanches éjectées du puzzle (en bas) ──
  if (opts.puzzleCaptured !== undefined) {
    let shown = opts.puzzleCaptured;
    // exclut la bille en cours d'animation
    if (puzzleEjectAnim) shown = Math.max(0, shown - 1);
    for (let i=0; i<shown && i<6; i++) {
      const offset = (i - (Math.min(opts.puzzleCaptured,6)-1)/2) * spacing;
      drawSmallMarble(ctx, mx + offset, my + ringR, gr, 'white');
    }
    return;
  }

  /* Rangee alignee en bas de la gouttiere, dans l'ordre noir puis blanc.
     Sert a trois usages : le replay, le plateau d'analyse, et le mode
     d'affichage « alignees en bas » choisi dans les Parametres.
     L'ecartement se resserre au-dela de 6 billes pour ne jamais deborder.
     CORRECTIF (signale par Saab, confirme par capture d'ecran) : mx/my
     sont le CENTRE GEOMETRIQUE du plateau -- par construction, un centre
     ne bouge jamais sous sa propre rotation. Utiliser "my + ringR" comme
     decalage plaçait donc les billes ejectees a un point fixe de l'ECRAN
     (toujours plein sud), jamais du PLATEAU -- en tournant le plateau
     (Jouer 3D, Y↺/Y↻), la rigole restait immobile et finissait par se
     superposer aux cases qui avaient, elles, correctement tourne (via
     hexCoord). Le vecteur de decalage (dx, ringR) est maintenant tourne
     du meme angle boardRotation que hexCoord applique aux cases, autour
     du meme centre (mx, my) -- la rigole suit desormais le plateau. */
  function drawBottomRow(colors) {
    const n = colors.length;
    if (!n) return;
    const sp = (n > 6) ? spacing * 6 / n : spacing;
    const rot = (typeof boardRotation === 'number' && boardRotation) ? boardRotation * Math.PI / 180 : 0;
    const cosR = Math.cos(rot), sinR = Math.sin(rot);
    for (let i = 0; i < n; i++) {
      const dx = (i - (n-1)/2) * sp, dy = ringR;
      const rx = dx * cosR - dy * sinR, ry = dx * sinR + dy * cosR;
      drawSmallMarble(ctx, mx + rx, my + ry, gr, colors[i]);
    }
  }
  function colorsFromCounts(cnt) {
    const out = [];
    for (let i = 0; i < (cnt.black|0); i++) out.push('black');
    for (let i = 0; i < (cnt.white|0); i++) out.push('white');
    return out;
  }

  // ── Comptes explicites (plateau d'analyse) ──
  // gutterMarbles est global a la partie en cours : un plateau qui a ses
  // propres compteurs (l'Analyse) doit pouvoir imposer ce qu'il affiche.
  if (opts.gutterCounts) { drawBottomRow(colorsFromCounts(opts.gutterCounts)); return; }

  /* ── Mode REPLAY ──
     gutterMarbles n'est vide que par resetGutterPositions(), appele en debut
     de partie : il contenait donc toujours le total final, quel que soit le
     coup affiche. La colonne de gauche disait 0-0 pendant que la rigole en
     montrait 6. On la reconstruit ici depuis les compteurs du snapshot
     courant, seule source exacte pour la position affichee. Signale par Saab
     (« eject colonne gauche -0b3w OK / Rigole -0b6w ?? »).
     Note : capturedByBlack = billes BLANCHES ejectees par les Noirs. */
  if (typeof replayMode !== 'undefined' && replayMode) {
    const snap = (typeof replayCurrentIdx !== 'undefined' && replayCurrentIdx >= 0
                  && typeof boardSnapshots !== 'undefined') ? boardSnapshots[replayCurrentIdx] : null;
    drawBottomRow(snap ? colorsFromCounts({ black: snap.capturedByWhite, white: snap.capturedByBlack })
                       : []);   // index -1 = position de depart : rigole vide
    return;
  }

  // ── Mode JEU normal ──
  if (gutterAlign === 'bottom') {
    // Les billes se rangent en bas de la rigole (« circuit rigole »).
    drawBottomRow(gutterMarbles.map(function(m){ return m.color; }));
    return;
  }
  // Chaque bille éjectée est dessinée à sa VRAIE position de chute (x,y),
  // là où elle est sortie du plateau, quelle que soit sa couleur.
  // La bille en cours d'animation est exclue (ajoutée à la fin de l'anim).
  for (let i = 0; i < gutterMarbles.length; i++) {
    const m = gutterMarbles[i];
    drawSmallMarble(ctx, m.x, m.y, gr, m.color);
  }
}

// Petite bille pour la gouttière (version simplifiée de drawMarble)
function drawSmallMarble(ctx, x, y, r, color) {
  ctx.save();
  // ombre portée
  ctx.beginPath();
  ctx.arc(x, y+1, r, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fill();
  // corps de la bille — suit le thème courant (mêmes couleurs que sur le plateau)
  const stops = (color === 'white')
    ? (boardTheme.whiteStops || ['#ffffff','#e8e6e2','#c4c2c0','#9a9a9c'])
    : (boardTheme.blackStops || ['#4a4a4a','#262626','#0d0d0d']);
  const grad = ctx.createRadialGradient(x-r*0.35, y-r*0.35, r*0.1, x, y, r);
  for (let i = 0; i < stops.length; i++) grad.addColorStop(i/(stops.length-1), stops[i]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.fillStyle = grad;
  ctx.fill();
  // reflet
  ctx.beginPath();
  ctx.arc(x-r*0.3, y-r*0.3, r*0.28, 0, Math.PI*2);
  ctx.fillStyle = color === 'white' ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)';
  ctx.fill();
  ctx.restore();
}

