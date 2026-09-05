<script>
// État de la vue (2d ou 3d) et bascule
window._boardView = '2d';
window._three = null;        // module Three.js une fois chargé
window._three3d = null;      // contexte de la scène 3D

window.setBoardView = function(view) {
  if (view === window._boardView) return;
  const previousView = window._boardView;   // avant reassignation : pour detecter qu'on QUITTE la 3D
  window._boardView = view;
  /* Synchro 3D -> 2D : en quittant la 3D, on relit l'angle ou la camera se
     trouve reellement (tTheta, la cible — pas theta, qui peut etre en
     cours de rattrapage anime) et on le reporte sur boardRotation, pour
     que la 2D (ou la bascule de vue elle-meme, au prochain retour en 3D)
     reprenne exactement la ou l'utilisateur avait laisse la camera. Sans
     ce report, tourner la vue en 3D n'aurait aucun effet une fois revenu
     en 2D — exactement le decalage qu'Olivier a signale. */
  if (previousView === '3d' && window._three3d && typeof theta3DToBoardRotation === 'function') {
    window.boardRotation = theta3DToBoardRotation(window._three3d.getTheta());
  }
  const canvas2d = document.getElementById('board');
  const wrap3d = document.getElementById('board-3d');
  const btn2d = document.getElementById('view-2d-btn');
  const btn3d = document.getElementById('view-3d-btn');
  const rot2dTop = document.getElementById('rot2d-top');
  const rot2dBottom = document.getElementById('rot2d-bottom');
  // styles des boutons
  function activate(btn, on) {
    btn.style.background = on ? 'var(--gold)' : 'transparent';
    btn.style.color = on ? '#14141a' : 'var(--muted)';
  }
  const wrap1d = document.getElementById('board-1d');
  const btn1d = document.getElementById('view-1d-btn');
  /* En 2D et en 3D la bascule flotte au-dessus d'un plateau rond : elle tombe
     dans un angle vide. En 1D le plateau est un bloc de texte qui monte
     jusqu'en haut a gauche, et la bascule recouvrait les rangees I et H. On
     la colle donc dans l'angle, et le texte demarre sous elle — la decaler
     seulement vers la gauche n'aurait pas suffi sur un ecran etroit, ou elle
     est plus large que la marge disponible. Signale par Olivier. */
  const bascule = document.getElementById('view-toggle');
  if (bascule) {
    bascule.style.top  = (view === '1d') ? '30px' : '11%';
    bascule.style.left = (view === '1d') ? '4px' : '3%';
  }
  /* L'ancien decalage vertical du texte (padding-top fixe, pour degager la
     bascule 1D/2D/3D) est retire : le plateau est desormais CENTRE dans la
     fenetre (display:flex sur #board-1d), un padding fixe le pousserait hors
     du centre reel au lieu de l'y laisser. La bascule a deja ete descendue
     (30px) lors d'une demande precedente ; si un chevauchement reapparait a
     l'usage sur un ecran etroit, le reglage se fera sur la bascule elle-meme,
     pas en recreant ce hack. Signale par Olivier. */
  if (view === '3d') {
    activate(btn3d, true); activate(btn2d, false); if (btn1d) activate(btn1d, false);
    canvas2d.style.display = 'none';
    if (wrap1d) wrap1d.style.display = 'none';
    wrap3d.style.display = 'block';
    if (rot2dTop) rot2dTop.style.display = 'none';       // boutons 2D sans effet en 3D
    if (rot2dBottom) rot2dBottom.style.display = 'none';
    init3DView();
    /* Synchro 2D -> 3D : si la scene existe deja (pas la toute premiere
       ouverture — ce cas est deja couvert par l'angle de depart de
       start3DScene), on pousse la rotation 2D en cours dans la camera,
       pour qu'il n'y ait jamais de decalage visuel au changement de vue.
       Signale par Olivier. */
    if (window._three3d && typeof boardRotationToTheta3D === 'function') {
      window._three3d.setTheta(boardRotationToTheta3D(window.boardRotation || 0));
    }
  } else if (view === '1d') {
    if (btn1d) activate(btn1d, true); activate(btn2d, false); activate(btn3d, false);
    canvas2d.style.display = 'none';
    wrap3d.style.display = 'none';
    if (wrap1d) wrap1d.style.display = 'flex';   // flex, pas block : necessaire au centrage du plateau
    if (rot2dTop) rot2dTop.style.display = 'none';
    if (rot2dBottom) rot2dBottom.style.display = 'none';
    if (window._three3d) window._three3d.stop();
    window.render1D();
  } else {
    activate(btn2d, true); activate(btn3d, false); if (btn1d) activate(btn1d, false);
    wrap3d.style.display = 'none';
    if (wrap1d) wrap1d.style.display = 'none';
    canvas2d.style.display = 'block';
    if (rot2dTop) rot2dTop.style.display = '';
    if (rot2dBottom) rot2dBottom.style.display = '';
    if (window._three3d) window._three3d.stop();
    // redessine toujours a l'affichage : au retour depuis la 3D, boardRotation
    // vient d'etre mis a jour ci-dessus, et le canvas doit refleter ce nouvel
    // angle immediatement, pas rester sur le bitmap d'avant le changement.
    if (typeof drawBoard === 'function') drawBoard();
  }
};


/* ═══════════════════════════════════════════
   VUE 1D — le plateau en texte, monochrome, ET JOUABLE
   Pas de couleur, pas de skin, pas de canvas : les 61 cases en caracteres,
   comme sur une invite de commande.
   Chaque case est un <span> cliquable qui appelle handleClick(r,c) — le MEME
   point d'entree que le plateau 2D. Aucune regle du jeu n'est reecrite ici :
   la 1D ne fait que designer une case. La synchronisation avec la 2D et la 3D
   en decoule d'elle-meme, puisque handleClick termine par drawBoard(), qui
   rafraichit la 1D et la 3D. On peut donc jouer indifferemment dans l'une ou
   l'autre des trois vues, y compris en alternant en cours de partie.
   ═══════════════════════════════════════════ */

/* Memes verrous que le listener du canvas 2D : partie finie, navigation en
   replay (sauf exploration de variante), et tour de l'IA. Si l'un tombe, la
   vue reste lisible mais n'accepte plus de clic — quelle que soit la vue.
   Portee de 1D a toutes les vues : c'etait deja une regle du moteur, pas une
   regle de la 1D. window._1dCanPlay reste expose sous son ancien nom (rien
   ne devait casser une reference existante), en simple alias. */
window.canInteractWithBoard = function () {
  if (window._isProjector) return false;   // fenetre projecteur : affichage seul, jamais interactif
  if (typeof gameOver !== 'undefined' && gameOver) return false;
  if (typeof replayMode !== 'undefined' && replayMode
      && !(typeof variantMode !== 'undefined' && variantMode)) return false;
  if (typeof gameMode !== 'undefined' && gameMode === 'ai'
      && typeof currentTurn !== 'undefined' && typeof humanColor !== 'undefined'
      && currentTurn !== humanColor) return false;
  return true;
};
window._1dCanPlay = window.canInteractWithBoard;

window.render1D = function () {
  const pre = document.getElementById('board-1d-text');
  if (!pre || typeof board === 'undefined') return;
  const rows = (typeof ROWS !== 'undefined') ? ROWS : [5,6,7,8,9,8,7,6,5];
  const L = [];        // rangees du plateau + reperes de coordonnees (taille .plateau1d)
  const trait = (typeof currentTurn !== 'undefined') ? currentTurn : 'black';
  const sel = (typeof selected !== 'undefined' && Array.isArray(selected)) ? selected : [];
  const jouable = window._1dCanPlay();
  const estSel = function (r, c) {
    for (let i = 0; i < sel.length; i++) if (sel[i].r === r && sel[i].c === c) return true;
    return false;
  };

  /* Indices de coups — memes regles, memes couleurs que la 2D, et surtout
     la meme fonction de calcul : computeMoveHints. Rien n'est recalcule ici,
     la 1D ne fait que colorer ce qu'on lui repond.
       . vert  = la selection peut venir sur cette case (deplacement)
       @ rouge = la selection peut pousser cette bille (poussee)
     Seules les CASES changent de couleur. Une bille garde toujours la sienne :
     c'est elle qui dit a qui elle appartient. */
  const aideOn = (typeof showMoveHints !== 'undefined') ? showMoveHints : true;
  let hints = [];
  if (aideOn && jouable && sel.length && typeof computeMoveHints === 'function') {
    hints = computeMoveHints(sel, trait, board);
  }
  const hintAt = function (r, c) {
    for (let i = 0; i < hints.length; i++) if (hints[i].r === r && hints[i].c === c) return hints[i];
    return null;
  };

  /* ── Mise en page ────────────────────────────────────────────────────
     L'hexagone doit tomber au milieu du bloc. Il ne l'etait pas : les neuf
     rangees etaient bien regulieres (leurs cases centrees sur la colonne 11)
     mais la colonne des etiquettes n'existe qu'a gauche, si bien que le
     centre du bloc tombait 1,5 caractere plus a gauche que celui du plateau
     — et les lignes d'information, plus larges, aggravaient l'ecart.
     On procede donc dans l'autre sens : on mesure d'abord la largeur du
     bloc, on y centre le champ de 17 caracteres qu'occupent les cases, puis
     on pose chaque etiquette juste avant sa rangee. Les etiquettes suivent
     alors le bord gauche de l'hexagone, ce qui est aussi plus lisible.
     Signale par Olivier. */
  /* Largeur du bloc FIXE. Si on la deduisait des lignes d'information, elle
     changerait avec elles — la ligne d'aide n'apparait qu'une fois une bille
     choisie — et l'hexagone sauterait lateralement a chaque selection.
     BORD = 9 place le champ de 17 caracteres des cases exactement au milieu
     d'un bloc de 35 : centre du plateau et centre du bloc tombent tous deux
     sur la colonne 17. Les lignes d'information tiennent dans ces 35. */
  const CASES = 9 * 2 - 1;                        // 17 : la rangee E, la plus longue
  const BORD  = 9;                                // marge de chaque cote
  const W     = CASES + BORD * 2;                 // 35

  /* Reperes A-I et 1-9, sous le meme reglage que la 2D (« Coordonnees des
     cases », dans Aides). Les chiffres suivent la geometrie reelle de la
     notation Aba-Pro : ce sont des diagonales nord-ouest / sud-est, reperees
     par leur extremite BAS-DROITE. Concretement 1 a 5 se posent sous la
     rangee A, et 6 a 9 le long du bord bas-droit, contre les rangees B, C, D
     et E — exactement le trace que tu as entoure en rouge. */
  const coordsOn = (typeof showCoordinates !== 'undefined') ? showCoordinates : true;

  for (let r = 0; r < 9; r++) {
    let line = '';
    // etiquette de rangee, prise du meme convertisseur que le reste de l'app
    let lab = ' ';
    if (coordsOn && typeof coordToABAPRO === 'function') {
      const t = coordToABAPRO(r, 0);
      if (t) lab = String(t).charAt(0).toUpperCase();
    }
    // decalage de la rangee dans le champ des cases, puis etiquette accolee
    const creux = BORD + (9 - rows[r]);
    line += ' '.repeat(creux - 2) + lab + ' ';
    const cells = [];
    for (let c = 0; c < rows[r]; c++) {
      const v = board[r + ',' + c];
      // O = noirs, @ = blancs (convention retenue par Olivier)
      const ch = (v === 'black') ? 'O' : (v === 'white') ? '@' : '.';
      let cls = 'c1d';
      if (estSel(r, c)) {
        cls += ' sel';
      } else {
        const h = hintAt(r, c);
        if (h) cls += h.push ? ' pousse' : ' depl';
      }
      cells.push('<span class="' + cls + '" data-r="' + r + '" data-c="' + c + '">' + ch + '</span>');
    }
    line += cells.join(' ');
    // largeur VISIBLE de la ligne jusqu'ici : creux (etiquette + espaces) +
    // les cellules (1 glyphe chacune) + les espaces separateurs entre elles.
    // Ne PAS mesurer line.length : la ligne contient deja le balisage HTML
    // des <span>, dont la longueur (200-400+ caracteres) n'a aucun rapport
    // avec ce qui s'affiche reellement (1 caractere par cellule).
    let visible = creux + (2 * rows[r] - 1);
    /* Chaque chiffre se pose sur le PROLONGEMENT de sa propre diagonale, un
       cran plus bas et un cran plus a droite que sa derniere case. La
       diagonale 9 finit en e9 : son repere tombe donc au bout de la ligne de
       la rangee D, pas de celle de E. De meme 8 au bout de C, 7 au bout de B,
       6 au bout de A, et 5 en pied. Les reperes longent ainsi exactement le
       bord bas-droit du plateau. Signale par Olivier. */
    if (coordsOn && r >= 5) { line += ' ' + (14 - r); visible += 2; }
    /* Complete a largeur VISIBLE fixe (W=35 caracteres), en comptant les
       glyphes reellement affiches — pas les caracteres de la chaine HTML.
       Sans les infos, plus rien n'atteignait naturellement cette largeur :
       la boite du <pre> aurait retreci a la largeur de sa ligne la plus
       longue (~28 caracteres visibles), et le centrage flexbox aurait alors
       centre CETTE boite plus etroite, pas le vrai centre de l'hexagone
       (colonne 17) qui suppose une largeur de 35. Un espace de fin occupe
       bien une cellule dans un <pre> monospace (white-space:pre les
       preserve) : completer redonne a la boite sa largeur prevue, quel que
       soit le contenu affiche par ailleurs. Signale par Olivier — corrige
       apres avoir constate que la premiere version comparait par erreur
       W a la longueur de la chaine HTML (200-400+ caracteres a cause des
       balises <span>), qui ne declenchait donc jamais le complement. */
    if (visible < W) line += ' '.repeat(W - visible);
    L.push(line);
  }
  if (coordsOn) {
    /* Numeros 1 a 5 en pied. Chacun est pose EN BAS A DROITE de la derniere
       case de sa diagonale — un cran plus bas, un cran plus a droite — et non
       a l'aplomb de la case : c'est ainsi que les reperes sortent du plateau,
       le long du bord. Le 5 tombe alors pile dans l'angle bas-droit, dans le
       prolongement de a5. Signale par Olivier. */
    let pied = ' '.repeat(BORD + 5);
    for (let n = 1; n <= 5; n++) pied += (n > 1 ? ' ' : '') + n;
    L.push(pied.length < W ? pied + ' '.repeat(W - pied.length) : pied);
  }
  /* Le plateau est le SEUL contenu de cette vue desormais : la legende, les
     ejections, le trait, la selection et l'invite ont ete retires — demande
     d'Olivier. */
  pre.className = 'plateau1d';
  pre.innerHTML = L.join('\n');
  pre.classList.toggle('jouable', jouable);
};

/* Un seul ecouteur, pose sur le conteneur : le contenu de la 1D est reconstruit
   a chaque rendu, donc on ne peut pas attacher les ecouteurs aux cases. */
(function bind1DClicks() {
  function attach() {
    const host = document.getElementById('board-1d');
    if (!host || host._1dBound) return;
    host._1dBound = true;
    host.addEventListener('click', function (e) {
      const cell = (e.target && e.target.closest) ? e.target.closest('.c1d') : null;
      if (!cell) return;
      if (!window._1dCanPlay()) return;
      const r = parseInt(cell.getAttribute('data-r'), 10);
      const c = parseInt(cell.getAttribute('data-c'), 10);
      if (isNaN(r) || isNaN(c)) return;
      if (typeof handleClick !== 'function') return;
      handleClick(r, c);
      window.render1D();   // filet : handleClick redessine deja, mais on ne parie pas dessus
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach);
  else attach();
})();
window.refresh1DIfActive = function () {
  if (window._boardView === '1d') window.render1D();
};

// Charge Three.js une seule fois (via CDN avec repli local en premier) et
// appelle onReady(THREE). Reutilisee par la vraie vue 3D (init3DView) ET
// par l'apercu 3D du Createur de plateau — un seul point de chargement,
// une seule liste de sources, pas deux copies qui pourraient diverger.
function ensureThreeLoaded(onReady, onFail) {
  if (window._three) { onReady(window._three); return; }
  const THREE_SOURCES = [
    './vendor/three.module.js',
    'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
    'https://unpkg.com/three@0.160.0/build/three.module.js',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js'
  ];
  (function tenter(i) {
    if (i >= THREE_SOURCES.length) { if (onFail) onFail(); return; }
    import(THREE_SOURCES[i])
      .then(function(THREE) { window._three = THREE; onReady(THREE); })
      .catch(function(err) {
        console.warn('Three.js : source indisponible, essai suivant →', THREE_SOURCES[i], err);
        tenter(i + 1);
      });
  })(0);
}

// Charge Three.js dynamiquement (depuis le CDN) puis initialise la scène
function init3DView() {
  const status = document.getElementById('board-3d');
  if (window._three) { start3DScene(); return; }
  // indicateur de chargement
  let loader = document.getElementById('three-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'three-loader';
    loader.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--gold);font-size:14px;z-index:5';
    loader.textContent = '⏳ Chargement de la 3D…';
    status.appendChild(loader);
  }
  ensureThreeLoaded(
    function(THREE) { if (loader) loader.remove(); start3DScene(); },
    function() {
      if (loader) loader.innerHTML = '⚠️ 3D indisponible — la librairie Three.js n\'a pas pu être chargée,'
        + '<br>ni en local ni depuis les sources de secours. Le reste du jeu fonctionne normalement.';
      console.error('Three.js : toutes les sources ont échoué (réseau bloqué ou hors-ligne ?)');
    }
  );
}

// Construit/relance la scène 3D et synchronise avec la position courante
/* Carte de normales PROCEDURALE, generee depuis la texture peinte
   elle-meme — aucun asset externe, aucune photo, coherent avec le
   principe "un seul fichier, zero dependance". Principe : la luminance
   de chaque pixel EST deja une carte de hauteur implicite (une veine plus
   sombre = un creux, un reflet plus clair = une bosse) — un filtre de
   Sobel calcule le gradient horizontal/vertical de cette luminance, dont
   on tire un vecteur normal encode en RGB (convention standard : x=R,
   y=G, z=B, chaque composante remappee de [-1,1] vers [0,255]). C'est ce
   qui permet a l'eclairage 3D de vraiment accrocher le relief peint —
   avant cette fonction, toute la texture etait plate en 3D (juste une
   couleur diffuse), le relief n'existait qu'en illusion 2D. */
function genererNormalMap(cv, force) {
  const w = cv.width, h = cv.height;
  const src = cv.getContext('2d').getImageData(0, 0, w, h).data;
  function lum(x, y) {
    x = x < 0 ? 0 : (x >= w ? w - 1 : x);
    y = y < 0 ? 0 : (y >= h ? h - 1 : y);
    const i = (y * w + x) * 4;
    return (src[i] * 0.299 + src[i+1] * 0.587 + src[i+2] * 0.114) / 255;
  }
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const octx = out.getContext('2d');
  const imgOut = octx.createImageData(w, h);
  const dst = imgOut.data;
  const k = force || 2.6;   // force du relief — trop haut = bruit metallique, trop bas = invisible
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Noyaux de Sobel 3x3 : gradient horizontal (dx) et vertical (dy) de la luminance
      const tl = lum(x-1,y-1), tc = lum(x,y-1), tr = lum(x+1,y-1);
      const ml = lum(x-1,y),                     mr = lum(x+1,y);
      const bl = lum(x-1,y+1), bc = lum(x,y+1), br = lum(x+1,y+1);
      const dx = (tr + 2*mr + br) - (tl + 2*ml + bl);
      const dy = (bl + 2*bc + br) - (tl + 2*tc + tr);
      let nx = -dx * k, ny = -dy * k, nz = 1.0;
      const len = Math.sqrt(nx*nx + ny*ny + nz*nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const i = (y * w + x) * 4;
      dst[i]   = (nx * 0.5 + 0.5) * 255;
      dst[i+1] = (ny * 0.5 + 0.5) * 255;
      dst[i+2] = (nz * 0.5 + 0.5) * 255;
      dst[i+3] = 255;
    }
  }
  octx.putImageData(imgOut, 0, 0);
  return out;
}
/* roughness/metalness PAR THEME — jusqu'ici une seule valeur fixe (0.45 /
   0.35) pour TOUS les materiaux : le verre et la pierre avaient la meme
   rugosite physique que le metal. Ces valeurs viennent s'ajouter aux
   normal maps procedurales deja en place : ensemble, elles permettent a
   la lumiere 3D de vraiment reagir differemment selon la matiere (le
   verre accroche des reflets nets et etroits, la pierre les diffuse
   largement) — avant, seule la couleur changeait entre deux themes, la
   reponse a la lumiere restait identique. */
const THEME_PHYSIQUE = {
  dark:{roughness:0.55,metalness:0.10}, ocean:{roughness:0.40,metalness:0.10}, marble:{roughness:0.35,metalness:0.05},
  gold:{roughness:0.25,metalness:0.85}, forest:{roughness:0.60,metalness:0.05}, volcanique:{roughness:0.50,metalness:0.15},
  metal:{roughness:0.35,metalness:0.85}, bronze:{roughness:0.30,metalness:0.75}, cuivre:{roughness:0.30,metalness:0.80},
  ardoise:{roughness:0.75,metalness:0.05}, granite:{roughness:0.65,metalness:0.05}, verre:{roughness:0.05,metalness:0.05},
  beton:{roughness:0.85,metalness:0.02}, corail:{roughness:0.60,metalness:0.05}, glace:{roughness:0.12,metalness:0.05},
  carbone:{roughness:0.30,metalness:0.40},
  onyx:{roughness:0.30,metalness:0.30}, jade:{roughness:0.35,metalness:0.05}, stardust:{roughness:0.50,metalness:0.10},
  terracotta:{roughness:0.80,metalness:0.02}, banquise:{roughness:0.15,metalness:0.05}, nacre:{roughness:0.25,metalness:0.15},
  patina:{roughness:0.60,metalness:0.40}, desert:{roughness:0.85,metalness:0.02}, abyss:{roughness:0.30,metalness:0.10},
  lava:{roughness:0.45,metalness:0.10}, marble_white:{roughness:0.30,metalness:0.05}, pastel:{roughness:0.50,metalness:0.05},
};
const PHYSIQUE_PAR_DEFAUT = { roughness: 0.45, metalness: 0.35 };   // ancienne valeur fixe, repli si theme inconnu
const PHYSIQUE_BOIS = { roughness: 0.55, metalness: 0.05 };

/* ═══════════════════════════════════════════
   APERCU 3D DU CREATEUR DE PLATEAU
   Mini-scene independante de la vraie vue 3D (elle reste ouverte meme
   quand on est sur 1D/2D), mais qui reutilise TOUT ce qui existe deja :
   - ensureThreeLoaded() : meme chargement Three.js que la vraie vue,
     aucune deuxieme liste de CDN
   - le canvas peint par creatorUpdate() (2D, autre bloc <script>) EST
     directement reutilise comme texture diffuse ET comme source pour
     genererNormalMap() — jamais repeint une deuxieme fois avec un code
     different
   - THEME_PHYSIQUE / PHYSIQUE_PAR_DEFAUT : les memes valeurs
     roughness/metalness que le vrai plateau, pas des valeurs inventees
     pour l'apercu
   Un seul point d'entree expose sur window (creatorUpdate3DPreview),
   appele par creatorUpdate() dans l'autre bloc <script> — meme
   convention deja utilisee ailleurs dans ce fichier pour parler entre
   blocs (voir les commentaires "autre bloc <script>" plus haut). ═══════════════════════════════════════════ */
let _creator3D = null;   // { scene, camera, renderer, mesh, raf }
function creatorInit3DPreview() {
  const canvas = document.getElementById('creator-preview-3d-canvas');
  const loaderEl = document.getElementById('creator-3d-loader');
  if (!canvas) return;
  if (_creator3D) { if (loaderEl) loaderEl.style.display = 'none'; return; }   // deja construit
  ensureThreeLoaded(function(THREE) {
    if (loaderEl) loaderEl.remove();
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x14141a);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
    camera.position.set(0, 2.6, 3.4);
    camera.lookAt(0, 0, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const key = new THREE.DirectionalLight(0xfff0d8, 2.0);
    key.position.set(3, 5, 2);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x88aaff, 0.6);
    rim.position.set(-3, 2, -2);
    scene.add(rim);
    // Un simple disque (pas le vrai contour hexagonal) : suffisant pour
    // juger l'apparence de la matiere sous eclairage reel, sans dupliquer
    // toute la geometrie du plateau uniquement pour un apercu 200x200.
    const geo = new THREE.CylinderGeometry(1.5, 1.5, 0.25, 48);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.45, metalness: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
    _creator3D = { THREE: THREE, scene: scene, camera: camera, renderer: renderer, mesh: mesh, raf: null };
    function boucle() {
      _creator3D.raf = requestAnimationFrame(boucle);
      mesh.rotation.y += 0.006;
      renderer.render(scene, camera);
    }
    boucle();
    if (typeof window.creatorApplyPending3D === 'function') window.creatorApplyPending3D();
  }, function() {
    if (loaderEl) loaderEl.textContent = '⚠️ 3D indisponible dans cet aperçu (le reste du créateur fonctionne normalement)';
  });
}
// Applique le canvas 2D deja peint (off, 640x640) comme texture diffuse +
// normal map du disque d'apercu, avec le roughness/metalness du theme de
// base choisi — appele par creatorUpdate() (autre bloc <script>) juste
// apres avoir peint "off", jamais recalcule independamment.
function creatorUpdate3DPreview(offCanvas, baseTheme) {
  if (!_creator3D) { window._creatorPending3D = { off: offCanvas, base: baseTheme }; return; }
  const THREE = _creator3D.THREE;
  const mat = _creator3D.mesh.material;
  if (mat.map) mat.map.dispose();
  if (mat.normalMap) mat.normalMap.dispose();
  mat.map = new THREE.CanvasTexture(offCanvas);
  mat.normalMap = new THREE.CanvasTexture(genererNormalMap(offCanvas, 2.0));
  mat.normalScale.set(0.8, 0.8);
  const physique = THEME_PHYSIQUE[baseTheme] || PHYSIQUE_PAR_DEFAUT;
  mat.roughness = physique.roughness;
  mat.metalness = physique.metalness;
  mat.color.set('#ffffff');
  mat.needsUpdate = true;
}
// Si creatorUpdate() (2D) tourne AVANT que la scene 3D ait fini de
// charger (l'utilisateur bouge un curseur pendant le chargement), on
// memorise la derniere demande et on l'applique des que la scene existe.
window.creatorApplyPending3D = function() {
  if (window._creatorPending3D) { creatorUpdate3DPreview(window._creatorPending3D.off, window._creatorPending3D.base); window._creatorPending3D = null; }
};
window.creatorInit3DPreview = creatorInit3DPreview;
window.creatorUpdate3DPreview = creatorUpdate3DPreview;

function start3DScene() {
  const THREE = window._three;
  if (!THREE) return;
  const canvas = document.getElementById('board-3d-canvas');
  if (window._three3d) { window._three3d.start(); window._three3d.sync(); if (window._three3d.resize) window._three3d.resize(); return; }

  // ─── Renderer ───
  const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x14141a);
  scene.fog = new THREE.Fog(0x14141a, 28, 60);

  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);

  // ─── Lumières ───
  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.2);
  key.position.set(8, 16, 9); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1; key.shadow.camera.far = 60;
  key.shadow.camera.left = -16; key.shadow.camera.right = 16;
  key.shadow.camera.top = 16; key.shadow.camera.bottom = -16;
  key.shadow.bias = -0.0004; scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.8);
  rim.position.set(-10, 6, -8); scene.add(rim);
  const fill = new THREE.PointLight(0xc8a84b, 0.5, 40);
  fill.position.set(0, 8, 0); scene.add(fill);

  // ─── Géométrie hexagonale (doit suivre les coordonnées internes r,c) ───
  // Conversion case interne (r,c) → axial (q,r) → position 3D
  const CELL = 1.32, BALL_R = 0.56;
  // ROWS et akey existent déjà globalement dans le jeu
  function rcToAx(r, c) { return { q: r <= 4 ? c - r : c - 4, r: r - 4 }; }
  function axPos(ax) {
    return new THREE.Vector3(CELL * Math.sqrt(3) * (ax.q + ax.r/2), 0, CELL * 1.5 * ax.r);
  }
  function cellPos3(r, c) { return axPos(rcToAx(r, c)); }

  // toutes les cases internes
  const allCells = [];
  for (let r = 0; r < ROWS.length; r++) for (let c = 0; c < ROWS[r]; c++) allCells.push({ r, c });

  // ─── Contour hexagonal du plateau, dérivé des 6 cases-coins réelles ───
  // (et non un cercle générique : le vrai plateau Abalone est un hexagone,
  // orienté exactement comme la grille de cases — jamais de décalage possible)
  const cornerCells = [{r:0,c:0},{r:0,c:ROWS[0]-1},{r:4,c:8},{r:8,c:ROWS[8]-1},{r:8,c:0},{r:4,c:0}];
  const cornerPts = cornerCells.map(function(cc){ return cellPos3(cc.r, cc.c); });
  let cx0 = 0, cz0 = 0;
  cornerPts.forEach(function(p){ cx0 += p.x; cz0 += p.z; });
  cx0 /= 6; cz0 /= 6;
  const RIM_PAD = 1.28; // le bord physique déborde des cases extrêmes (comme un vrai plateau)
  const hexOuter = cornerPts.map(function(p){ return { x: cx0+(p.x-cx0)*RIM_PAD, z: cz0+(p.z-cz0)*RIM_PAD }; });
  let maxR = 0;
  allCells.forEach(function(cc){ const p = cellPos3(cc.r, cc.c); maxR = Math.max(maxR, Math.hypot(p.x, p.z)); });
  const baseR = maxR * RIM_PAD; // conservé pour le sol/brouillard, non utilisé pour la forme du plateau

  function hexShape(pts, shrink) {
    shrink = shrink || 1;
    const s = new THREE.Shape();
    pts.forEach(function(p, i){
      const x = cx0 + (p.x-cx0)*shrink, z = cz0 + (p.z-cz0)*shrink;
      if (i === 0) s.moveTo(x, z); else s.lineTo(x, z);
    });
    s.closePath();
    return s;
  }

  const group = new THREE.Group();
  scene.add(group);

  // socle (hexagone épais, légèrement plus large que le dessus pour l'effet "plateau posé")
  const baseShape = hexShape(hexOuter, 1.045);
  const baseGeo = new THREE.ExtrudeGeometry(baseShape, { depth: 1.1, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2 });
  baseGeo.rotateX(Math.PI/2);
  const base = new THREE.Mesh(baseGeo, new THREE.MeshStandardMaterial({ color: 0x2a2d35, roughness: 0.6, metalness: 0.3 }));
  base.position.y = -0.45; base.castShadow = true; base.receiveShadow = true; group.add(base);  // span [-1.55,-0.45]

  // dessus du plateau (hexagone, surface de jeu)
  const topShape = hexShape(hexOuter, 1);
  const topGeo = new THREE.ExtrudeGeometry(topShape, { depth: 0.35, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.04, bevelSegments: 2 });
  topGeo.rotateX(Math.PI/2);
  const top = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ color: 0x363a44, roughness: 0.45, metalness: 0.35, emissive: 0x000000, emissiveIntensity: 0 }));
  top.position.y = -0.10; top.receiveShadow = true; group.add(top);  // span [-0.45,-0.10] — touche le socle exactement

  // liseré doré : cadre hexagonal fin (hexagone plein moins un hexagone légèrement plus petit)
  const trimOuterPts = hexOuter.map(function(p){ return { x: cx0+(p.x-cx0)*1.015, z: cz0+(p.z-cz0)*1.015 }; });
  const trimShape = hexShape(trimOuterPts, 1);
  const trimHole = new THREE.Path();
  hexOuter.forEach(function(p, i){
    const x = cx0 + (p.x-cx0)*0.965, z = cz0 + (p.z-cz0)*0.965;
    if (i === 0) trimHole.moveTo(x, z); else trimHole.lineTo(x, z);
  });
  trimHole.closePath();
  trimShape.holes.push(trimHole);
  const trimGeo = new THREE.ExtrudeGeometry(trimShape, { depth: 0.14, bevelEnabled: false });
  trimGeo.rotateX(Math.PI/2);
  const ring = new THREE.Mesh(trimGeo, new THREE.MeshStandardMaterial({ color: 0xc8a84b, roughness: 0.3, metalness: 0.9 }));
  ring.position.y = 0.04; group.add(ring);  // span [-0.10,0.04] — touche le dessus, légèrement en saillie

  // creux
  const holeGeo = new THREE.CylinderGeometry(BALL_R*0.96, BALL_R*0.7, 0.28, 20);
  const holeMat = new THREE.MeshStandardMaterial({ color: 0x1e2128, roughness: 0.8, metalness: 0.2 });
  const holeMeshes = [];
  /* Cibles de picking DEDIEES, invisibles — un plan par case, tague (r,c).
     Ne servent qu'au raycasting, jamais au rendu visible (visible=false n'empeche
     pas Three.js de les tester : verifie explicitement avant d'ecrire ce code).
     Deux raisons de ne pas raycaster directement les trous/billes visibles :
     1) une case vide et une case occupee ont des geometries differentes (creux
        vs sphere) ; une cible unique et constante evite de recombiner
        holeMeshes+ballMeshes a chaque clic, et reste valable meme si sync()
        n'a pas encore tourne.
     2) le creux est un cylindre a capuchon en eventail de triangles, qui
        partagent un sommet central : un rayon visant EXACTEMENT le centre
        mathematique d'une case (le cas le plus frequent, puisque l'oeil vise
        le centre) peut echouer sur ce sommet singulier par un pur artefact
        flottant. Un plan (2 triangles sur 4 sommets de coin, aucun sommet
        partage au centre) n'a pas ce defaut. Trouve en testant le picking
        avec la vraie bibliotheque Three.js avant de l'ecrire ici. */
  const pickGeo = new THREE.PlaneGeometry(BALL_R*2.1, BALL_R*2.1);
  const pickMat = new THREE.MeshBasicMaterial({ visible: false });
  const pickMeshes = [];
  allCells.forEach(function(cc){
    const p = cellPos3(cc.r, cc.c);
    const h = new THREE.Mesh(holeGeo, holeMat);
    h.position.set(p.x, 0, p.z); h.receiveShadow = true; h.userData = { r: cc.r, c: cc.c };
    group.add(h); holeMeshes.push(h);

    const pk = new THREE.Mesh(pickGeo, pickMat);
    pk.rotation.x = -Math.PI/2;                    // couche le plan a plat (a l'horizontale)
    pk.position.set(p.x, BALL_R + 0.05, p.z);       // hauteur d'une bille : cible confortable, occupee ou non
    pk.userData = { r: cc.r, c: cc.c };
    group.add(pk); pickMeshes.push(pk);
  });

  // sol (ombres) — dimensionné proportionnellement au vrai rayon du plateau
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(baseR*10, baseR*10), new THREE.ShadowMaterial({ opacity: 0.35 }));
  ground.rotation.x = -Math.PI/2; ground.position.y = -1.65; ground.receiveShadow = true; scene.add(ground);  // sous le socle (-1.55), évite le z-fighting

  // matériaux billes
  /* Les couleurs suivent le skin actif — le MEME que la 2D — au lieu d'un
     noir/blanc fige. MARBLE_SKINS/boardTheme sont la source unique deja
     utilisee par drawMarble() en 2D (boardTheme.blackStops/whiteStops) :
     on lit cette meme source plutot que de redefinir des couleurs a part,
     qui auraient fini par diverger au premier nouveau skin ajoute.
     Un digrade 2D (3 a 5 teintes, du clair pres du reflet simule au sombre
     dans l'ombre simulee) n'a pas d'equivalent direct en 3D : ici la vraie
     lumiere de la scene cree le relief, il suffit d'une couleur de base
     plausible. On prend la teinte du milieu du degrade — plus proche de la
     couleur "propre" du skin que ses deux extremes, qui sont des artifices
     du degrade 2D (reflet simule / ombre simulee) que la vraie lumiere 3D
     recree deja par elle-meme. Les veines dorees (kintsugi) et le nacrage
     restent des effets 2D uniquement — hors de portee d'une simple couleur
     de base. Signale par Olivier. */
  const matBlack = new THREE.MeshStandardMaterial({ color: 0x16161a, roughness: 0.22, metalness: 0.15 });
  const matWhite = new THREE.MeshStandardMaterial({ color: 0xeceff4, roughness: 0.22, metalness: 0.1 });
  function syncMarbleColors() {
    const bs = (typeof boardTheme !== 'undefined' && boardTheme.blackStops) || ['#3a3a3c','#1a1a1c','#050506'];
    const ws = (typeof boardTheme !== 'undefined' && boardTheme.whiteStops) || ['#ffffff','#e8e6e2','#c4c2c0','#9a9a9c'];
    matBlack.color.set(bs[Math.floor(bs.length / 2)]);
    matWhite.color.set(ws[Math.floor(ws.length / 2)]);
  }
  syncMarbleColors();
  const ballGeo = new THREE.SphereGeometry(BALL_R, 40, 40);
  const ballMeshes = [];

  /* ── Marqueurs de sélection et d'indices, PARTAGES avec la 2D et la 1D ──
     Meme principe que documente dans le wiki (« Vues du plateau ») : la 3D
     ne reimplemente aucune regle, elle appelle les memes fonctions,
     computeMoveHints, et lit le meme tableau global 'selected'.
     Aucune bille n'est JAMAIS teintee ni surlignee — sa couleur reste
     reservee a dire noire ou blanche. La selection et les indices sont donc
     des ANNEAUX ou des DISQUES poses a cote/autour, jamais une recoloration
     du materiau de la bille elle-meme. C'est l'exact analogue 3D de la regle
     posee en 1D (voir plus bas dans ce fichier). */
  const ringGeo = new THREE.TorusGeometry(BALL_R*1.12, 0.045, 8, 32);
  ringGeo.rotateX(Math.PI/2);   // le tore est vertical par defaut : on le couche a plat
  const selRingMat  = new THREE.MeshBasicMaterial({ color: 0xc8a84b });   // or — identique a la 2D
  const pushRingMat = new THREE.MeshBasicMaterial({ color: 0xe05c4b });   // rouge — poussee possible
  const moveDiscGeo = new THREE.CircleGeometry(BALL_R*0.42, 24);
  const moveDiscMat = new THREE.MeshBasicMaterial({ color: 0x4a9463, transparent: true, opacity: 0.6, side: THREE.DoubleSide }); // vert — déplacement possible
  let overlayMeshes = [];

  function syncOverlays() {
    overlayMeshes.forEach(function(m){ group.remove(m); });
    overlayMeshes.length = 0;

    const sel = (typeof selected !== 'undefined' && Array.isArray(selected)) ? selected : [];
    sel.forEach(function(s){
      const p = cellPos3(s.r, s.c);
      const ring = new THREE.Mesh(ringGeo, selRingMat);
      ring.position.set(p.x, BALL_R + 0.05, p.z);
      group.add(ring); overlayMeshes.push(ring);
    });

    // Indices de coups : memes regles que la 1D — computeMoveHints est le
    // moteur commun, on ne colore que ce qu'il renvoie.
    const aideOn = (typeof showMoveHints !== 'undefined') ? showMoveHints : true;
    const hints = (aideOn && sel.length && typeof computeMoveHints === 'function' && typeof currentTurn !== 'undefined')
      ? computeMoveHints(sel, currentTurn, board) : [];
    hints.forEach(function(h){
      if (sel.some(function(s){ return s.r === h.r && s.c === h.c; })) return;  // jamais sur une case deja selectionnee
      const p = cellPos3(h.r, h.c);
      if (h.push) {
        const ring = new THREE.Mesh(ringGeo, pushRingMat);
        ring.position.set(p.x, BALL_R + 0.05, p.z);
        group.add(ring); overlayMeshes.push(ring);
      } else {
        const disc = new THREE.Mesh(moveDiscGeo, moveDiscMat);
        disc.rotation.x = -Math.PI/2;
        disc.position.set(p.x, 0.16, p.z);
        group.add(disc); overlayMeshes.push(disc);
      }
    });
  }

  // synchronise les billes 3D avec le tableau 'board' du jeu
  // ─── Caméra orbitale ───
  // theta = azimut (rotation autour de Y, horizontale), phi = elevation
  // (incline autour de X), radius = distance (zoom). roll s'y ajoute : une
  // rotation autour de Z (l'axe de visee lui-meme), absente jusqu'ici — la
  // camera ne pouvait tourner que sur 2 des 3 axes. Demande d'Olivier.
  /* Angle de depart : derive de window.boardRotation (la rotation 2D en
     cours), pas d'une valeur fixe — si le plateau a deja ete pivote en 2D
     avant la toute premiere ouverture de la 3D, la camera doit demarrer
     sur ce MEME angle plutot que sur l'orientation par defaut, sinon un
     decalage apparaitrait des la premiere fois. boardRotationToTheta3D est
     declare dans l'autre bloc <script> (function = toujours globale,
     window. inutile pour la lire). Signale par Olivier. */
  let theta = (typeof boardRotationToTheta3D === 'function') ? boardRotationToTheta3D(window.boardRotation || 0) : Math.PI*0.25;
  /* Verrou "vue du dessus", ACTIF PAR DEFAUT : phi et radius demarrent donc
     sur les valeurs du preregle ⬆ Vue de dessus (0.12 / 26), pas sur la vue
     cavaliere habituelle — puisque le verrou commence engage, la camera
     doit deja s'y trouver, pas juste l'autoriser plus tard. theta n'est PAS
     touche : il reste sur l'angle synchronise avec la 2D (ci-dessus), seul
     axe que le verrou laisse toujours libre, avec le zoom. Signale par
     Olivier. */
  let topLocked = true;
  let phi = topLocked ? 0.12 : Math.PI*0.34, radius = topLocked ? 26 : 22, roll = 0;
  let tTheta = theta, tPhi = phi, tRadius = radius, tRoll = 0;
  /* auto=false par defaut : le bouton 🔄 qui permettait de (re)activer la
     rotation automatique a ete retire du panneau (v1.36, sur demande
     d'Olivier). Depuis, plus AUCUN code ne remet jamais auto a true — seul
     ce point de depart le faisait, ce qui faisait tourner le plateau tout
     seul a chaque nouvelle partie, sans aucun moyen de l'arreter avant de
     cliquer sur autre chose. Signale par Olivier. */
  let auto = false, running = true;
  /* Boutons ⚫/⚪ (cote Noirs/Blancs) et leur synchro de couleur : declares
     ICI (portee de start3DScene, pas a l'interieur du bloc de construction
     du panneau) pour que sync() — une fonction SOEUR, pas une fonction
     imbriquee dans ce bloc — puisse aussi les rafraichir a chaque
     resynchronisation. Un "function" declare a l'interieur d'un bloc if{}
     est scope A CE BLOC en JS moderne, invisible depuis sync(). */
  let btnNoir3D = null, btnBlanc3D = null;
  function syncSideButtonColors3D() {
    if (!btnNoir3D || !btnBlanc3D) return;
    const bs = (typeof boardTheme !== 'undefined' && boardTheme.blackStops) || ['#3a3a3c','#1a1a1c','#050506'];
    const ws = (typeof boardTheme !== 'undefined' && boardTheme.whiteStops) || ['#ffffff','#e8e6e2','#c4c2c0','#9a9a9c'];
    const pastille = function(c){
      return '<span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:' + c
        + ';box-shadow:0 0 0 1px rgba(255,255,255,0.18)"></span>';
    };
    btnNoir3D.innerHTML = pastille(bs[Math.floor(bs.length / 2)]);
    btnBlanc3D.innerHTML = pastille(ws[Math.floor(ws.length / 2)]);
  }
  /* Skin du PLATEAU (pas des billes) — vue de dessus. BOARD_SURFACE_THEMES
     (dark/ocean/marble/gold/forest) est defini dans l'AUTRE bloc <script>
     (avec drawBoard, 2D) et expose sur window pour etre relu ici — memes
     couleurs des deux cotes, pas une seconde palette inventee. Le bois
     reste un CAS A PART (comme en 2D) : un traitement plus riche (grain,
     rivieres de resine) qui ne se resume pas a deux couleurs. Signale par
     Olivier — complete une base deja posee (BOARD_SURFACE_THEMES,
     boardTheme.theme) mais dont seule la 2D avait ete cablee jusqu'ici. */
  /* Texture procedurale bois + rivieres d'epoxy pour la VRAIE surface du
     plateau (top, l'hexagone extrude qui sert de plan de jeu — pas les
     trous ni le fond de scene). Meme esprit que le rendu 2D (grain
     sinusoidal, rivieres translucides bleues, accent d'angle) mais reproduit
     ici en canvas 2D puis converti en THREE.CanvasTexture, coherent avec la
     contrainte zero-dependance du fichier (aucune image externe). Construite
     UNE SEULE FOIS et mise en cache (woodTexture) : sync() tourne a chaque
     coup, refaire ce dessin a chaque fois serait couteux pour rien — seul
     un changement REEL de theme doit la (re)generer. Signale par Olivier. */
  let woodTexture = null;
  let woodNormalMap = null;

  function getWoodTexture() {
    if (woodTexture) return woodTexture;
    /* 640x640, mx=my=320 : EXACTEMENT le canvas et le centre de reference du
       rendu 2D (hexCoord utilise cx=cy=320) — le grain occupe donc les
       memes proportions du plateau des deux cotes. Les rivieres d'epoxy ne
       sont PLUS peintes ici : une texture plate n'est pas un relief, ce
       qu'Olivier a signale a raison. Elles sont desormais une vraie
       geometrie 3D, voir getRiverMeshes() juste en dessous. */
    const cv = document.createElement('canvas');
    cv.width = 640; cv.height = 640;
    const c2 = cv.getContext('2d');
    const mx = 320, my = 320;

    const wood = c2.createLinearGradient(mx - 230, my - 210, mx + 230, my + 210);
    wood.addColorStop(0, '#cda472'); wood.addColorStop(0.5, '#a9763f'); wood.addColorStop(1, '#85562d');
    c2.fillStyle = wood; c2.fillRect(0, 0, 640, 640);

    // veines du bois : EXACTEMENT la boucle 2D (28 lignes, memes sinusoides)
    c2.lineWidth = 2; c2.globalAlpha = 0.16;
    for (let g = 0; g < 28; g++) {
      const y0 = my - 220 + g * 16;
      c2.strokeStyle = (g % 2) ? '#6b4222' : '#dcb888';
      c2.beginPath();
      for (let x = mx - 250; x <= mx + 250; x += 10) {
        const yy = y0 + Math.sin((x + g * 37) / 52) * 6 + Math.sin(x / 120) * 9;
        if (x === mx - 250) c2.moveTo(x, yy); else c2.lineTo(x, yy);
      }
      c2.stroke();
    }
    c2.globalAlpha = 1;

    woodTexture = new THREE.CanvasTexture(cv);
    woodTexture.needsUpdate = true;
    woodNormalMap = new THREE.CanvasTexture(genererNormalMap(cv, 2.2));
    woodNormalMap.needsUpdate = true;
    return woodTexture;
  }
  function getWoodNormalMap() {
    if (!woodNormalMap) getWoodTexture();   // genere les deux ensemble, la normal map depend du meme canvas peint
    return woodNormalMap;
  }
  /* Textures procedurales des 6 themes de plateau (une par matiere : verre
     volcanique lisse, ondulations d'eau, veines de marbre, metal brosse,
     mousse organique, roche fissuree + lave) — une vraie texture peinte au
     lieu d'un degrade uni, meme esprit que le grain du bois ci-dessus.
     Verifiees d'abord dans un apercu Three.js reel (deux allers-retours :
     couleurs re-echantillonnees sur une vraie photo pour Volcanique, puis
     les 6 textures ensemble). Signale par Olivier — "je veux ca pour
     chaque theme".
     Generees par le meme moteur generique a couches que la 2D
     (window.THEME_RECIPES / window.peindreCouches, definis dans le bloc
     <script> du haut) plutot que par des blocs if/else propres a la 3D :
     les DEUX peintres (2D et 3D) executent exactement la meme recette par
     theme, aucune duplication a maintenir en double.
     Mises en cache par (theme, jour/nuit) : sync() tourne a chaque coup,
     jamais de raison de repeindre une texture identique. */
  const themeTextures = {};
  const themeNormalMaps = {};
  function peindreTextureTheme(nom, night) {
    const cv = document.createElement('canvas');
    cv.width = 640; cv.height = 640;
    const c2 = cv.getContext('2d');
    const t = resolveThemeColors(nom, night);
    const recette = window.THEME_RECIPES[nom];
    /* Roche + pores seulement pour Volcanique en 3D — les fissures de lave
       ne sont plus peintes a plat sur cette texture : elles sont
       desormais une VRAIE geometrie 3D (tubes emissifs, voir
       getLavaCrackMeshes plus bas), exactement comme les rivieres
       d'epoxy du bois ont remplace une texture peinte par une geometrie
       en relief. Le canvas 2D (peindreTextureTheme2D, autre bloc
       <script>) continue lui de les peindre a plat : la vue 2D n'a pas
       de geometrie. */
    if (recette) window.peindreCouches(c2, recette(t, night, nom === 'volcanique' ? { sansFissures: true } : undefined));
    const tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    const cle = nom + (night ? '_nuit' : '_jour');
    const normTex = new THREE.CanvasTexture(genererNormalMap(cv));
    normTex.needsUpdate = true;
    themeNormalMaps[cle] = normTex;
    return tex;
  }
  function getThemeTexture(nom, night) {
    const cle = nom + (night ? '_nuit' : '_jour');
    if (themeTextures[cle]) return themeTextures[cle];
    themeTextures[cle] = peindreTextureTheme(nom, night);
    return themeTextures[cle];
  }
  function getThemeNormalMap(nom, night) {
    const cle = nom + (night ? '_nuit' : '_jour');
    if (!themeNormalMaps[cle]) getThemeTexture(nom, night);   // genere les deux ensemble
    return themeNormalMaps[cle];
  }
  /* Rivieres d'epoxy : VRAIE geometrie 3D (un ruban extrude par riviere),
     pas une texture plate — corrige une premiere version qui les peignait
     sur la surface, signalee a raison par Olivier ("il faut des sinusoides
     d'epoxy EN 3D"). Meme tracé sinusoïdal EXACT que la 2D (memes y/amp/w/
     phase, meme formule riverY), converti de l'espace pixel 2D (canvas
     640x640, centre 320,320) vers l'espace monde 3D par un simple facteur
     d'echelle (rayon reel du plateau / demi-largeur du canvas de reference)
     — les rivieres occupent exactement les MEMES proportions du plateau
     qu'en 2D. Construites une seule fois et mises en cache, comme la
     texture de grain : sync() tourne a chaque coup, pas de raison de
     reconstruire une geometrie identique a chaque fois. Verifiees d'abord
     dans un apercu Three.js reel avant d'etre integrees ici. */
  let riverMeshes = null;
  function getRiverMeshes() {
    if (riverMeshes) return riverMeshes;
    const echelle = baseR / 320;   // baseR = rayon reel du plateau 3D, deja calcule plus haut
    const mx = 320, my = 320;
    const rivers = [
      { y: my - 165, amp: 55, w: 30, phase: 0.4 },
      { y: my + 30,  amp: 95, w: 22, phase: 3.1 },
      { y: my + 175, amp: 60, w: 36, phase: 1.7 },
    ];
    const x0px = mx - 340, x1px = mx + 340;
    function riverY(rv, xpx) { return rv.y + Math.sin((xpx / 95) + rv.phase) * rv.amp + Math.sin(xpx / 38) * 9; }
    const hauteur = 0.10;   // saillie du relief, en unites monde — valeur validee sur l'apercu
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x2a72c8, roughness: 0.08, metalness: 0.05,
      transmission: 0.55, thickness: 0.4, clearcoat: 1, clearcoatRoughness: 0.05,
      transparent: true, opacity: 0.92,
    });
    riverMeshes = rivers.map(function(rv) {
      const shape = new THREE.Shape();
      let premier = true;
      for (let xpx = x0px; xpx <= x1px; xpx += 7) {
        const ypx = riverY(rv, xpx) - rv.w / 2;
        const X = (xpx - mx) * echelle, Z = (ypx - my) * echelle;
        if (premier) { shape.moveTo(X, Z); premier = false; } else shape.lineTo(X, Z);
      }
      for (let xpx = x1px; xpx >= x0px; xpx -= 7) {
        const ypx = riverY(rv, xpx) + rv.w / 2;
        const X = (xpx - mx) * echelle, Z = (ypx - my) * echelle;
        shape.lineTo(X, Z);
      }
      shape.closePath();
      const geo = new THREE.ExtrudeGeometry(shape, { depth: hauteur, bevelEnabled: true, bevelThickness: hauteur * 0.3, bevelSize: hauteur * 0.2, bevelSegments: 3 });
      geo.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geo, glassMat);
      mesh.position.y = 0.075;   // affleure le dessus du plateau (top), en legere saillie — valeur validee sur l'apercu
      mesh.castShadow = true; mesh.receiveShadow = true;
      return mesh;
    });
    return riverMeshes;
  }
  /* Fissures de lave : VRAIE geometrie 3D (un tube emissif par fissure),
     remplace l'ancienne texture peinte a plat — meme logique que les
     rivieres d'epoxy pour le bois. Le trace vient de window.genererFissures,
     PARTAGE avec le rendu 2D (peindreTextureTheme2D, autre bloc <script>) :
     un seul generateur de marche aleatoire ramifiee, deux consommateurs.
     Converti de l'espace canvas 2D (640x640, centre 320,320) vers l'espace
     monde 3D par le meme facteur d'echelle que les rivieres (baseR/320).
     Mis en cache par jour/nuit (comme la texture de theme, getThemeTexture)
     car la couleur/intensite emissive differe — jamais reconstruit sur un
     appel repete avec le meme etat jour/nuit. */
  const lavaCrackMeshesCache = {};
  function getLavaCrackMeshes(night) {
    const cle = night ? 'nuit' : 'jour';
    if (lavaCrackMeshesCache[cle]) return lavaCrackMeshesCache[cle];
    const echelle = baseR / 320;
    const mx = 320, my = 320;
    const fissures = window.genererFissures(26);
    const couleur = night ? 0xff3300 : 0xff5722;
    const intensite = night ? 2.2 : 0.6;
    const rayon = (night ? 3.2 : 2.4) * echelle;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x1a0a05, emissive: couleur, emissiveIntensity: intensite,
      roughness: 0.6, metalness: 0,
    });
    const meshes = fissures.map(function(pts) {
      if (pts.length < 2) return null;
      const pts3D = pts.map(function(p) {
        return new THREE.Vector3((p.x - mx) * echelle, 0.03, (p.y - my) * echelle);
      });
      const curve = new THREE.CatmullRomCurve3(pts3D);
      const geo = new THREE.TubeGeometry(curve, Math.max(2, pts3D.length), rayon, 5, false);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = false; mesh.receiveShadow = false;
      return mesh;
    }).filter(function(m) { return m !== null; });
    lavaCrackMeshesCache[cle] = meshes;
    return meshes;
  }
  let lavaCracksActive = null;

  function syncBoardTheme3D() {
    const bois = typeof boardTheme !== 'undefined' && !!boardTheme.wood;
    if (bois) {
      holeMat.color.set('#4a2e18');
      scene.background = new THREE.Color('#241a10');
      if (scene.fog) scene.fog.color.set('#241a10');
      top.material.map = getWoodTexture();
      top.material.normalMap = getWoodNormalMap();
      top.material.normalScale.set(0.7, 0.7);
      top.material.roughness = PHYSIQUE_BOIS.roughness;
      top.material.metalness = PHYSIQUE_BOIS.metalness;
      top.material.color.set('#ffffff');   // laisse la texture porter la couleur, pas de teinte multiplicative dessus
      top.material.needsUpdate = true;
      base.material.map = null;
      base.material.color.set('#3a2614');   // meme teinte que le contour bois en 2D
      base.material.needsUpdate = true;
      getRiverMeshes().forEach(function(m){ if (!m.parent) group.add(m); });
      if (lavaCracksActive) { lavaCracksActive.forEach(function(m){ if (m.parent) group.remove(m); }); lavaCracksActive = null; }
      return;
    }
    const nom = (typeof boardTheme !== 'undefined' && boardTheme.theme) || 'dark';
    const estNuit = typeof boardTheme !== 'undefined' && !!boardTheme.night;
    const resolveur = typeof window !== 'undefined' && window.resolveThemeColors;
    const t = (resolveur && resolveur(nom, estNuit)) || { trim: '#0a0a0b', gutterOuter: '#16181a', surf: ['#a8a8a8','#919191','#7c7c7c'] };
    holeMat.color.set(t.trim);
    scene.background = new THREE.Color(t.gutterOuter);
    if (scene.fog) scene.fog.color.set(t.gutterOuter);
    top.material.map = getThemeTexture(nom, estNuit);
    top.material.normalMap = getThemeNormalMap(nom, estNuit);
    top.material.normalScale.set(0.9, 0.9);
    const physique = THEME_PHYSIQUE[nom] || PHYSIQUE_PAR_DEFAUT;
    top.material.roughness = physique.roughness;
    top.material.metalness = physique.metalness;
    top.material.color.set('#ffffff');   // laisse la texture porter la couleur, comme le bois
    /* Lueur (emissive) : Volcanique seulement pour l'instant (les 5 autres
       themes n'en ont pas — meme logique progressive que jour/nuit, "on
       fera les autres apres"). Jour discret, nuit intense — valeurs
       reprises de la proposition d'Olivier (0.25 / 1.2), verifiees d'abord
       dans l'apercu avant d'etre integrees ici. */
    if (nom === 'volcanique') {
      top.material.emissive.set(estNuit ? '#ff3300' : '#ff2200');
      top.material.emissiveIntensity = estNuit ? 1.2 : 0.25;
      const nouvellesFissures = getLavaCrackMeshes(estNuit);
      if (lavaCracksActive !== nouvellesFissures) {
        if (lavaCracksActive) lavaCracksActive.forEach(function(m){ if (m.parent) group.remove(m); });
        nouvellesFissures.forEach(function(m){ if (!m.parent) group.add(m); });
        lavaCracksActive = nouvellesFissures;
      }
    } else {
      top.material.emissive.set('#000000');
      top.material.emissiveIntensity = 0;
      if (lavaCracksActive) { lavaCracksActive.forEach(function(m){ if (m.parent) group.remove(m); }); lavaCracksActive = null; }
    }
    top.material.needsUpdate = true;
    base.material.map = null;
    base.material.color.set(t.gutterOuter);
    if (riverMeshes) riverMeshes.forEach(function(m){ if (m.parent) group.remove(m); });
    base.material.needsUpdate = true;
  }
  /* Enroule un angle dans (-pi, pi]. Declaree ICI (portee englobante) et pas
     seulement pres des boutons : updateCam() en a aussi besoin, pour
     interpoler par le chemin le plus court (voir plus bas). */
  function wrapAngle(a){ return ((a + Math.PI) % (Math.PI*2) + Math.PI*2) % (Math.PI*2) - Math.PI; }

  function sync() {
    /* Reappliquee a CHAQUE synchro (pas seulement a la creation) : le skin
       peut changer dans Parametres pendant que la 3D n'est pas affichee —
       sync() tourne aussi bien au premier affichage qu'au retour dans cette
       vue (voir l'appel window._three3d.sync() plus bas), donc les billes
       reprennent toujours le skin reellement actif, jamais celui d'une
       visite precedente. */
    syncMarbleColors();
    syncSideButtonColors3D();
    syncBoardTheme3D();
    // retire les anciennes
    ballMeshes.forEach(function(m){ group.remove(m); });
    ballMeshes.length = 0;
    for (let r = 0; r < ROWS.length; r++) for (let c = 0; c < ROWS[r]; c++) {
      const v = board[akey(r, c)];
      if (!v) continue;
      const p = cellPos3(r, c);
      const m = new THREE.Mesh(ballGeo, v === 'black' ? matBlack : matWhite);
      m.position.set(p.x, BALL_R + 0.05, p.z);
      m.castShadow = true; m.receiveShadow = true;
      m.userData = { r: r, c: c };
      group.add(m); ballMeshes.push(m);
    }
    syncOverlays();
  }
  sync();



  function updateCam() {
    /* L'ecart brut (tTheta - theta) peut valoir pres de 2*pi si les deux
       valeurs se trouvent de part et d'autre de la frontiere +-180° — meme
       si l'angle REEL a parcourir est petit. Un clic Y pres de cette
       frontiere pouvait ainsi declencher un ecart de -348° au lieu des 11.5°
       reellement demandes : la camera partait presque a l'oppose avant de
       revenir, ce qui ressemblait a un retour a l'etat initial. Enrouler
       l'ecart lui-meme (pas seulement theta) force l'interpolation a
       toujours prendre le chemin le plus court. Signale par Olivier. */
    theta += wrapAngle(tTheta-theta)*0.1; phi += (tPhi-phi)*0.1; radius += (tRadius-radius)*0.1;
    /* Meme raisonnement pour le roulis (roll) : tRoll s'enroule aussi dans
       (-pi, pi] (voir les boutons Z↶/Z↷), donc sujet exactement au meme
       defaut d'interpolation a sa propre frontiere +-180°. */
    roll += wrapAngle(tRoll-roll)*0.1;
    camera.position.set(
      radius*Math.sin(phi)*Math.cos(theta),
      radius*Math.cos(phi),
      radius*Math.sin(phi)*Math.sin(theta));
    camera.lookAt(0, 0, 0);
    /* lookAt() recalcule l'orientation avec un "up" par defaut a chaque
       frame — le roll doit donc etre reapplique APRES, en rotation autour
       de l'axe Z local de la camera (son propre axe de visee). C'est bien
       la valeur ABSOLUE de roll qui est appliquee, pas un increment : sans
       cela, le roll s'accumulerait de travers a chaque frame. */
    camera.rotateZ(roll);
  }

  // interactions
  /* Meme seuil que le glisser-deposer 2D (DRAG_THRESHOLD, defini dans une
     autre fonction — on ne peut pas le reutiliser directement, donc on
     recopie la meme valeur en expliquant pourquoi). En-deca, un pointerdown
     suivi d'un pointerup est un TAP : on tente une selection/un coup. Au-dela,
     c'est un glisser de camera, et aucun clic n'est envoye au moteur — on ne
     veut pas qu'une simple rotation de vue selectionne une bille au passage. */
  const TAP_THRESHOLD_3D = 18;
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  /* Resout un point d'ecran (client X/Y) en case (r,c) du plateau, en
     raycastant contre les cibles de picking dediees (pickMeshes) — un plan
     invisible par case, constant, jamais reconstruit. Independant de l'etat
     des billes : pas besoin de recombiner deux tableaux a chaque clic, et
     valable meme entre deux appels de sync(). */
  function handleBoardTap3D(clientX, clientY) {
    if (typeof window.canInteractWithBoard === 'function' && !window.canInteractWithBoard()) return;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);
    const hits = raycaster.intersectObjects(pickMeshes, false);
    if (!hits.length) return;
    const cell = hits[0].object.userData;
    if (!cell || cell.r === undefined || cell.c === undefined) return;
    if (typeof handleClick === 'function') handleClick(cell.r, cell.c);
  }

  let drag = false, lx = 0, ly = 0;
  let downX = 0, downY = 0, movedDist = 0;   // distance parcourue depuis le pointerdown
  canvas.addEventListener('pointerdown', function(e){
    drag = true; lx = e.clientX; ly = e.clientY;
    downX = e.clientX; downY = e.clientY; movedDist = 0;
    auto = false; canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('pointerup', function(e){
    const wasDragging = drag;    // capture avant reinitialisation : un pointerup errant
    drag = false; canvas.style.cursor = 'grab';   // (ex. relache d'un bouton voisin) ne doit pas jouer un coup
    if (wasDragging && movedDist <= TAP_THRESHOLD_3D) handleBoardTap3D(e.clientX, e.clientY);
  });
  window.addEventListener('pointermove', function(e){
    if (!drag) return;
    movedDist = Math.max(movedDist, Math.hypot(e.clientX-downX, e.clientY-downY));
    /* Le verrou "vue du dessus" bloque desormais TOUT deplacement de la
       camera au doigt — theta (Y) ET phi — pas seulement l'inclinaison.
       Sans ca, un simple glisser horizontal suffisait a faire tourner le
       plateau meme verrouille, en contournant totalement le sens du
       cadenas : "on ne peut pas le bouger en le touchant". Y↺/Y↻
       restent le SEUL moyen de tourner sous le verrou — deliberes, pas
       accidentels. movedDist, lui, continue d'etre suivi meme verrouille :
       necessaire a la distinction tap/glisser pour la selection d'une
       bille au relachement, sans rapport avec la camera. Signale par
       Olivier. */
    if (!topLocked) {
      tTheta -= (e.clientX-lx)*0.008;
      tPhi = Math.max(0.15, Math.min(Math.PI*0.49, tPhi - (e.clientY-ly)*0.008));
    }
    lx = e.clientX; ly = e.clientY;
  });
  canvas.addEventListener('wheel', function(e){
    e.preventDefault();
    tRadius = Math.max(12, Math.min(40, tRadius + e.deltaY*0.02));
  }, { passive: false });

  // ─── Angles de vue préréglés, sur le côté du plateau ───
  // (mêmes coordonnées que le drag manuel : theta = azimut, phi = hauteur)
  const DEFAULT_VIEW = { theta: Math.PI*0.25, phi: Math.PI*0.34, radius: 22 };
  /* ⟲ (vue cavaliere), 🔄 (rotation auto) et ⬆ (vue de dessus) retires —
     demande d'Olivier. ⬆ etait devenu redondant : le verrou "vue du
     dessus" impose deja exactement les memes valeurs (tPhi=0.12,
     tRadius=26, voir plus bas) des qu'il est active, ce qui est le cas par
     defaut. */

  /* ── Un seul panneau, 3 colonnes utilisees, en bas a gauche ──
     Zoom/rotation (colonnes 1-2, 4 rangees) et angles de vue (colonne 3)
     partagent UNE seule grille, avec placement EXPLICITE (grid-column/
     grid-row) — deux grilles cote a cote ne peuvent pas s'aligner de facon
     fiable des que leur nombre de boutons differe. Disposition actuelle,
     apres retrait de ⟲/🔄/⬆ :
       🔍+  🔍−   ⚫
       X↑   X↓    ⚪
       Y↺   Y↻    🔒
       Z↶   Z↷        */
  if (!document.getElementById('view3d-nav')) {
    const PHI_MIN = 0.15, PHI_MAX = Math.PI*0.49;     // memes bornes que le drag (evite un plateau vu par en-dessous)
    const RADIUS_MIN = 12, RADIUS_MAX = 40;            // memes bornes que la molette
    // wrapAngle est declaree plus haut, avec la camera — reutilisee ici (pas
    // de seconde copie) pour que le meme enroulement serve aussi bien aux
    // boutons qu'a l'interpolation d'updateCam().
    const wrap = wrapAngle;

    const nav = document.createElement('div');
    nav.id = 'view3d-nav';
    nav.className = 'rot-ctl';
    nav.style.display = 'grid';
    nav.style.gridTemplateColumns = 'repeat(3, 34px)';   // 3 colonnes : la 4e n'est plus utilisee depuis le retrait de ⬆
    nav.style.gap = '6px';
    nav.style.left = '8px'; nav.style.right = 'auto'; nav.style.bottom = '8px'; nav.style.top = 'auto';
    nav.title = 'Zoom, rotation (X, Y, Z) et angles de vue';

    function poser(label, title, colonne, rangee, taille, onclick) {
      const b = document.createElement('button');
      b.className = 'rot-btn'; b.style.fontSize = taille;
      b.style.gridColumn = String(colonne); b.style.gridRow = String(rangee);
      b.textContent = label; b.title = title;
      b.onclick = onclick;
      nav.appendChild(b);
      return b;
    }

    // colonnes 1-2 : zoom et rotation X/Y/Z
    // X et Z sont BLOQUES par le verrou "vue du dessus" (topLocked) ; zoom et
    // Y restent toujours actifs, quel que soit l'etat du verrou — Y parce
    // qu'il reste synchronise avec la rotation 2D (voir boardRotationToTheta3D
    // plus haut), zoom parce qu'il ne fait jamais sortir de la vue du dessus.
    const lockableBtns = [];
    [
      { label: '🔍+', title: 'Zoom avant',  action: function(){ auto = false; tRadius = Math.max(RADIUS_MIN, tRadius - 3); }, verrouillable: false },
      { label: '🔍−', title: 'Zoom arrière', action: function(){ auto = false; tRadius = Math.min(RADIUS_MAX, tRadius + 3); }, verrouillable: false },
      { label: 'X↑', title: 'Rotation X (incliner vers le haut)', action: function(){ if (topLocked) return; auto = false; tPhi = Math.max(PHI_MIN, tPhi - 0.12); if (typeof showToast === 'function') showToast('⬆ Inclinaison (' + Math.round(tPhi * 180 / Math.PI) + '°)'); }, verrouillable: true },
      { label: 'X↓', title: 'Rotation X (incliner vers le bas)',  action: function(){ if (topLocked) return; auto = false; tPhi = Math.min(PHI_MAX, tPhi + 0.12); if (typeof showToast === 'function') showToast('⬇ Inclinaison (' + Math.round(tPhi * 180 / Math.PI) + '°)'); }, verrouillable: true },
      { label: 'Y↺', title: 'Rotation Y (pivoter à gauche)', action: function(){ auto = false; tTheta = wrap(tTheta - window.BOARD_ROTATE_STEP_DEG * Math.PI / 180); if (typeof showToast === 'function' && typeof theta3DToBoardRotation === 'function') showToast('↺ Plateau pivoté (' + Math.round(theta3DToBoardRotation(tTheta)) + '°)'); }, verrouillable: false },
      { label: 'Y↻', title: 'Rotation Y (pivoter à droite)', action: function(){ auto = false; tTheta = wrap(tTheta + window.BOARD_ROTATE_STEP_DEG * Math.PI / 180); if (typeof showToast === 'function' && typeof theta3DToBoardRotation === 'function') showToast('↻ Plateau pivoté (' + Math.round(theta3DToBoardRotation(tTheta)) + '°)'); }, verrouillable: false },
      { label: 'Z↶', title: 'Rotation Z (roulis anti-horaire)', action: function(){ if (topLocked) return; auto = false; tRoll = wrap(tRoll - 10 * Math.PI / 180); if (typeof showToast === 'function') showToast('↶ Roulis (' + Math.round(tRoll * 180 / Math.PI) + '°)'); }, verrouillable: true },
      { label: 'Z↷', title: 'Rotation Z (roulis horaire)',      action: function(){ if (topLocked) return; auto = false; tRoll = wrap(tRoll + 10 * Math.PI / 180); if (typeof showToast === 'function') showToast('↷ Roulis (' + Math.round(tRoll * 180 / Math.PI) + '°)'); }, verrouillable: true },
    ].forEach(function(it, i){
      const b = poser(it.label, it.title, (i % 2) + 1, Math.floor(i / 2) + 1, '13px', it.action);
      if (it.verrouillable) lockableBtns.push(b);
    });

    /* colonne 3 : ⚫ (cote Noirs, rangee 1), ⚪ (cote Blancs, rangee 2) —
       PARTAGES avec la 2D (memes boutons dans le panneau lateral 2D, voir
       setSideView()/boardRotation). Contrairement aux anciens prereglages,
       ils ne touchent QUE theta (comme Y↺/Y↻) — la 2D n'a pas de notion
       d'elevation, donc plus de raison de faire bouger phi/radius ici non
       plus. TOUJOURS ACTIFS, jamais grises par le verrou : meme categorie
       que Y. Colores selon le skin actif (pas noir/blanc fige) — voir
       syncSideButtonColors3D(). Signale par Olivier. */
    function actionCote(side) {
      return function(){
        auto = false;
        window.boardRotation = (side === 'white') ? 180 : 0;
        tTheta = boardRotationToTheta3D(window.boardRotation);
      };
    }
    const btnNoir = poser('', 'Côté Noirs (0° exactement — pas par incréments, contrairement à Y↺/Y↻)', 3, 1, '13px', actionCote('black'));
    const btnBlanc = poser('', 'Côté Blancs', 3, 2, '13px', actionCote('white'));
    btnNoir3D = btnNoir; btnBlanc3D = btnBlanc;   // publie vers la portee englobante (voir plus haut, pour sync())
    syncSideButtonColors3D();

    /* ── Verrou "vue du dessus" — colonne 3, rangee 3 ──
       Actif PAR DEFAUT (topLocked = true, déclaré plus haut avec la caméra) :
       la camera demarre deja en vue de dessus, et X/Z sont bloques des
       l'ouverture. Zoom, Y et ⚫/⚪ restent toujours actifs, verrouille ou
       non — Y et ⚫/⚪ parce qu'ils ne touchent que theta, reste synchronise
       avec la 2D ; zoom parce qu'il ne fait jamais sortir de la vue du dessus.
       Cliquer le bouton :
       - deverrouille -> libere X/Z, sans toucher a l'angle actuel (la
         camera reste ou elle est, simplement plus rien ne l'empeche de
         bouger sur X/Z desormais) ;
       - reverrouille -> impose a nouveau phi/radius de la vue de dessus
         (theta n'est pas touche, il reste synchronise avec la 2D), et
         regrise les boutons concernes.
       Place a l'emplacement libre (colonne 3, rangee 3, sous ⚪) plutot que
       colonne 4 : ⬆ (vue de dessus), qui occupait la colonne 4, a ete
       retire — redondant avec ce que le verrou impose deja par defaut.
       Signale par Olivier. */
    function applyLockUI() {
      lockableBtns.forEach(function(b){
        b.style.opacity = topLocked ? '0.35' : '1';
        b.style.pointerEvents = topLocked ? 'none' : 'auto';
      });
      lockBtn.textContent = topLocked ? '🔒' : '🔓';
      lockBtn.title = topLocked
        ? 'Vue du dessus verrouillée — cliquer pour déverrouiller (X, Z)'
        : 'Vue du dessus déverrouillée — cliquer pour reverrouiller (zoom, Y et côtés restent toujours libres)';
    }
    const lockBtn = poser('🔒', 'Vue du dessus verrouillée — cliquer pour déverrouiller', 3, 3, '15px', function(){
      topLocked = !topLocked;
      if (topLocked) { auto = false; tPhi = 0.12; tRadius = 26; }   // reverrouille : reimpose la vue de dessus (theta intact)
      applyLockUI();
    });
    applyLockUI();   // etat visuel initial coherent avec topLocked = true

    document.getElementById('board-3d').appendChild(nav);
  }

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w/h; camera.updateProjectionMatrix();
  }

  // Resize piloté par ResizeObserver (focus/plein écran, rotation mobile, changement d'écran).
  // → on ne lit plus le layout à chaque frame : meilleure perf, surtout sur mobile.
  const host3d = document.getElementById('board-3d');
  let _ro = null;
  if (typeof ResizeObserver !== 'undefined' && host3d) {
    _ro = new ResizeObserver(function(){ resize(); });
    _ro.observe(host3d);
  }

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    if (auto) tTheta += 0.0022;
    if (!_ro) resize();   // fallback : navigateurs sans ResizeObserver
    updateCam();
    renderer.render(scene, camera);
  }
  resize();   // dimensionnement initial
  loop();

  // expose l'API
  window._three3d = {
    sync: sync,
    resize: resize,
    start: function(){ if (!running) { running = true; loop(); } },
    stop: function(){ running = false; },
    /* Pour la synchronisation avec la rotation 2D au moment de changer de
       vue (voir setBoardView) : getTheta lit l'angle CIBLE (tTheta, pas le
       theta amorti — c'est la ou l'utilisateur a reellement vise, meme si
       l'animation n'a pas fini de le rattraper), setTheta l'impose et coupe
       la rotation automatique (comme le ferait n'importe quelle navigation
       manuelle). */
    getTheta: function(){ return tTheta; },
    setTheta: function(rad){ tTheta = rad; auto = false; }
  };
}

// Quand on joue en 2D, mettre à jour la 3D si elle est ouverte
window.refresh3DIfActive = function() {
  if (window._boardView === '3d' && window._three3d) window._three3d.sync();
};
</script>