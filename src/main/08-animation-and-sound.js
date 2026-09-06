/* ═══════════════════════════════════════════
   ANIMATION D'ÉJECTION
   La bille tombe verticalement du plateau vers la gouttière (phase 1),
   puis glisse latéralement jusqu'à sa place (phase 2). ~1s, bien visible.
═══════════════════════════════════════════ */
let ejectAnim = null;  // animation en cours : {color, slotIndex, ...} ou null
let moveAnim = null;   // animation de glissement des billes {pieces:[{fromX,fromY,toX,toY,color}], start, dur}

// Billes éjectées dans la gouttière. Chaque bille garde sa VRAIE position de chute
// (x, y) à l'endroit où elle est sortie du plateau, peu importe sa couleur.
// Si plusieurs tombent au même endroit, la nouvelle pousse légèrement les précédentes.
let gutterMarbles = [];  // [{x, y, color}]

/* Mode d'affichage des billes ejectees, au choix dans les Parametres :
   'drop'   = chaque bille reste la ou elle est sortie du plateau (defaut)
   'bottom' = elles se rangent en bas de la rigole (« circuit rigole »)
   Les deux ont leurs partisans : la premiere montre par ou l'adversaire a
   perce, la seconde se lit d'un coup d'oeil. Demande de Saab, arbitree par
   Olivier en gardant les deux. */
let gutterAlign = (function(){
  try { return localStorage.getItem('abalone_gutter_align') === 'bottom' ? 'bottom' : 'drop'; }
  catch(e){ return 'drop'; }
})();
function setGutterAlign(mode) {
  gutterAlign = (mode === 'bottom') ? 'bottom' : 'drop';
  try { localStorage.setItem('abalone_gutter_align', gutterAlign); } catch(e){}
  if (typeof drawBoard === 'function') drawBoard();
}

/* Les trois cases d'affichage (fleche, menaces, rangement de la rigole) sont
   memorisees en localStorage mais aucune n'etait relue a l'ouverture des
   Parametres : la case affichait l'etat par defaut du HTML pendant que le
   reglage reel, lui, etait bien applique. On aligne l'interface sur l'etat. */
function syncDisplayToggles() {
  const a = document.getElementById('show-last-arrow-toggle');
  if (a && typeof showLastMoveArrow !== 'undefined') a.checked = !!showLastMoveArrow;
  const t = document.getElementById('show-threats-toggle');
  if (t && typeof showThreats !== 'undefined') t.checked = !!showThreats;
  const ct = document.getElementById('show-carte-tactique-toggle');
  if (ct && typeof showCarteTactique !== 'undefined') ct.checked = !!showCarteTactique;
  document.querySelectorAll('.carte-overlay-dim-btn').forEach(function(b){
    b.classList.toggle('active', b.dataset.dim === carteTactiqueOverlayDim);
  });
  const g = document.getElementById('gutter-align-toggle');
  if (g) g.checked = (gutterAlign === 'bottom');
}

// Anciennes structures conservées pour compat (puzzle, etc.)
let gutterWhite = [];
let gutterBlack = [];

// Projette un point de sortie (px,py) sur la ligne médiane de la gouttière HEXAGONALE.
// On suit la forme de l'hexagone : on trouve où le rayon (centre→sortie) croise le
// bord de l'hexagone, puis on avance vers l'extérieur de la demi-largeur de gouttière.
// 'corners' = 6 sommets de l'hexagone du plateau, 'outset' = distance bord plateau → milieu gouttière.
function projectToGutterHex(px, py, mx, my, corners, outset) {
  let dx = px - mx, dy = py - my;
  const d = Math.hypot(dx, dy) || 1;
  dx /= d; dy /= d;  // direction unitaire de sortie

  // distance du centre au bord de l'hexagone dans la direction (dx,dy) :
  // on teste l'intersection du rayon avec chacun des 6 segments de l'hexagone
  let edgeDist = Infinity;
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i], b = corners[(i+1) % corners.length];
    // segment a→b ; rayon : centre + t*(dx,dy)
    const ex = b.x - a.x, ey = b.y - a.y;
    const denom = dx * ey - dy * ex;
    if (Math.abs(denom) < 1e-9) continue;  // parallèle
    const ax = a.x - mx, ay = a.y - my;
    const t = (ax * ey - ay * ex) / denom;       // distance le long du rayon
    const u = (ax * dy - ay * dx) / denom;        // position sur le segment [0,1]
    if (t > 0 && u >= -0.01 && u <= 1.01) {
      if (t < edgeDist) edgeDist = t;
    }
  }
  if (!isFinite(edgeDist)) edgeDist = Math.hypot(corners[0].x - mx, corners[0].y - my);

  // milieu de la gouttière = bord de l'hexagone + outset, dans la direction de sortie
  const r = edgeDist + outset;
  return { x: mx + dx * r, y: my + dy * r };
}

// (ancienne version circulaire, conservée si besoin)
function projectToGutter(px, py, mx, my, ringRadius) {
  let dx = px - mx, dy = py - my;
  const d = Math.hypot(dx, dy) || 1;
  return { x: mx + dx/d * ringRadius, y: my + dy/d * ringRadius };
}

// Insère une bille à sa position de chute (x,y) dans la gouttière.
// Insère une bille dans la gouttière à son point de chute, en POUSSANT les billes
// déjà présentes pour faire de la place (comme de vraies billes physiques).
// Chaque bille est repérée par son angle ; les positions finales sont reprojetées
// sur la gouttière HEXAGONALE (corners + outset) pour rester bien centrées partout.
function insertGutterMarbleXY(x, y, color, mx, my, minGap, corners, outset) {
  const dropAngle = Math.atan2(y - my, x - mx);  // angle de chute
  // rayon de référence pour convertir l'écart linéaire en écart angulaire
  const Rref = Math.hypot(x - mx, y - my) || 1;
  const minAng = minGap / Rref;

  const newMarble = { isNew: true, color: color };
  const all = gutterMarbles.map(function(m){
    let a = Math.atan2(m.y - my, m.x - mx);
    let rel = a - dropAngle;
    while (rel > Math.PI) rel -= 2*Math.PI;
    while (rel < -Math.PI) rel += 2*Math.PI;
    return { rel: rel, color: m.color, isNew: false };
  });
  all.push({ rel: 0, color: color, isNew: true });
  all.sort(function(a,b){ return a.rel - b.rel; });

  // résolution des collisions : la nouvelle bille reste fixe, pousse ses voisines
  for (let pass = 0; pass < 50; pass++) {
    let changed = false;
    for (let i = 0; i < all.length - 1; i++) {
      const gap = all[i+1].rel - all[i].rel;
      if (gap < minAng - 1e-6) {
        const push = (minAng - gap);
        if (all[i].isNew)      all[i+1].rel += push;
        else if (all[i+1].isNew) all[i].rel -= push;
        else { all[i].rel -= push/2; all[i+1].rel += push/2; }
        changed = true;
      }
    }
    if (!changed) break;
  }

  // reprojette chaque bille sur la gouttière hexagonale (rayon variable selon l'angle)
  function pointOnGutter(ang) {
    // direction unitaire
    const dx = Math.cos(ang), dy = Math.sin(ang);
    if (corners && outset !== undefined) {
      // distance au bord de l'hexagone dans cette direction
      let edgeDist = Infinity;
      for (let i = 0; i < corners.length; i++) {
        const a = corners[i], b = corners[(i+1) % corners.length];
        const ex = b.x - a.x, ey = b.y - a.y;
        const denom = dx * ey - dy * ex;
        if (Math.abs(denom) < 1e-9) continue;
        const ax = a.x - mx, ay = a.y - my;
        const t = (ax * ey - ay * ex) / denom;
        const u = (ax * dy - ay * dx) / denom;
        if (t > 0 && u >= -0.01 && u <= 1.01 && t < edgeDist) edgeDist = t;
      }
      if (!isFinite(edgeDist)) edgeDist = Rref;
      const r = edgeDist + outset;
      return { x: mx + dx * r, y: my + dy * r };
    }
    return { x: mx + dx * Rref, y: my + dy * Rref };
  }

  gutterMarbles = all.map(function(item){
    const p = pointOnGutter(dropAngle + item.rel);
    return { x: p.x, y: p.y, color: item.color };
  });
}

function resetGutterPositions() {
  gutterMarbles = [];
  gutterWhite = [];
  gutterBlack = [];
}

// (ancienne fonction, conservée pour le mode puzzle)
function insertGutterMarble(arr, newOffset, minGap) {
  arr.push(newOffset);
  arr.sort(function(a,b){ return a-b; });
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] - arr[i-1] < minGap) arr[i] = arr[i-1] + minGap;
  }
  return arr;
}

// Anime le glissement de billes d'une position à une autre (par-dessus le plateau)
function animateMarbleSlide(pieces, onDone) {
  if (!pieces || !pieces.length) { if (onDone) onDone(); return; }
  moveAnim = { pieces, start: performance.now(), dur: 240 };
  function step(now) {
    if (!moveAnim) { if (onDone) onDone(); return; }
    const a = moveAnim;
    const t = Math.min(1, (now - a.start) / a.dur);
    const e = 1 - (1-t)*(1-t);  // easeOut
    drawBoard({ hideAnimPieces: a.pieces });  // redessine sans les billes en mouvement
    const canvas = document.getElementById('board');
    const ctx = canvas.getContext('2d');
    const scale = canvas.width / 640;
    ctx.save();
    ctx.scale(scale, scale);
    a.pieces.forEach(function(pc) {
      const x = pc.fromX + (pc.toX - pc.fromX) * e;
      const y = pc.fromY + (pc.toY - pc.fromY) * e;
      drawMarble(ctx, x, y, pc.color, false);
    });
    ctx.restore();
    if (t < 1) requestAnimationFrame(step);
    else { moveAnim = null; drawBoard(); if (onDone) onDone(); }
  }
  requestAnimationFrame(step);
}

// Lance l'animation d'une bille éjectée depuis (fromX,fromY) sur le plateau
function animateEjection(fromX, fromY, color, slotIndex) {
  // Calcule la position finale dans la gouttière
  const canvas = document.getElementById('board');
  if (!canvas) return;
  const corners = [hexCoord(0,0),hexCoord(0,ROWS[0]-1),hexCoord(4,ROWS[4]-1),hexCoord(8,ROWS[8]-1),hexCoord(8,0),hexCoord(4,0)];
  let mx=0,my=0; corners.forEach(p=>{mx+=p.x;my+=p.y;}); mx/=6; my/=6;
  const pad = HEX_RADIUS + 22, gutterW = 46;
  const gr = HEX_RADIUS * 0.82, spacing = gr * 2.0;
  // distance du bord du plateau au milieu de la gouttière
  // (réglé pour rester dans la gouttière sans toucher le plateau ni déborder du cadre)
  const outset = pad + gutterW/2 + 2;

  // La bille reste là où elle SORT : projection sur la gouttière hexagonale.
  const target = projectToGutterHex(fromX, fromY, mx, my, corners, outset);

  ejectAnim = {
    color, gr,
    fromX, fromY,
    targetX: target.x, targetY: target.y,
    mx, my, spacing, corners, outset,
    start: performance.now(),
    dur: 1100,
    phase1: 0.45,
    lavaTrail: [],          // {x,y,vie} — uniquement pour le theme Volcanique
    explosionFaite: false,
  };
  requestAnimationFrame(ejectAnimStep);
}

// Traînée + explosion de lave — reservees au theme Volcanique, cosmetique
// pure : ne touche a aucune regle, juste a ejectAnimStep() deja existante.
// Reutilise les memes fonctions ease deja en place, aucun nouveau moteur.
function _volcaniqueActif() {
  return typeof boardTheme !== 'undefined' && boardTheme && boardTheme.theme === 'volcanique';
}
function _ajouterParticuleLave(a, x, y) {
  if (!_volcaniqueActif()) return;
  a.lavaTrail.push({ x: x + (Math.random()-0.5)*3, y: y + (Math.random()-0.5)*3, vie: 1, taille: 3.5 + Math.random()*3.5 });
  if (a.lavaTrail.length > 40) a.lavaTrail.shift();   // budget memoire fixe, pas de fuite sur une longue trajectoire
}
function _dessinerTraineeLave(ctx, a) {
  for (let i = a.lavaTrail.length - 1; i >= 0; i--) {
    const p = a.lavaTrail[i];
    p.vie -= 0.045;
    if (p.vie <= 0) { a.lavaTrail.splice(i, 1); continue; }
    // halo large et doux (glow) + coeur petit et vif (braise) — le halo seul
    // se confondait avec les fissures peintes du theme (meme teinte, meme
    // largeur) ; le coeur vif est ce qui rend la trainee lisible en mouvement.
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.taille * 2.2 * p.vie, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,80,10,' + (p.vie*0.35).toFixed(2) + ')';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.taille * p.vie, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,' + Math.round(200 + 55*p.vie) + ',' + Math.round(80*p.vie) + ',' + (p.vie).toFixed(2) + ')';
    ctx.fill();
  }
}
function _dessinerExplosionLave(ctx, x, y, t) {
  // t va de 0 (impact) a 1 (dissipee) sur une courte fenetre independante de la trajectoire
  const rayon = 6 + t * 30;
  const alpha = Math.max(0, 1 - t);
  const g = ctx.createRadialGradient(x, y, 0, x, y, rayon);
  g.addColorStop(0, 'rgba(255,240,180,' + alpha.toFixed(2) + ')');
  g.addColorStop(0.35, 'rgba(255,130,30,' + (alpha*0.9).toFixed(2) + ')');
  g.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.beginPath();
  ctx.arc(x, y, rayon, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
}

function easeOutQuad(t){ return 1 - (1-t)*(1-t); }
function easeInQuad(t){ return t*t; }

function ejectAnimStep(now) {
  if (!ejectAnim) return;
  const a = ejectAnim;
  const t = Math.min(1, (now - a.start) / a.dur);
  // redessine le plateau (sans la bille en cours, gérée à part)
  drawBoard();
  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');
  const scale = canvas.width / 640;
  ctx.save();
  ctx.scale(scale, scale);

  let x, y;
  if (t < a.phase1) {
    // Phase 1 : la bille quitte le plateau vers la gouttière (accélération)
    const tp = t / a.phase1;
    const e = easeInQuad(tp);
    x = a.fromX + (a.targetX - a.fromX) * e;
    y = a.fromY + (a.targetY - a.fromY) * e;
    _ajouterParticuleLave(a, x, y);
  } else {
    // Phase 2 : petit rebond/arrivée à la position finale (décélération)
    const tp = (t - a.phase1) / (1 - a.phase1);
    const e = easeOutQuad(tp);
    x = a.fromX + (a.targetX - a.fromX) * (a.phase1Done !== undefined ? 1 : easeInQuad(1));
    // interpole directement vers la cible (déjà quasi atteinte)
    x = a.targetX; y = a.targetY;
    // (la phase 2 sert juste de petite pause visuelle à l'arrivée)
    if (!a.explosionFaite) { a.explosionFaite = true; a.explosionStart = now; }
  }
  if (_volcaniqueActif()) {
    _dessinerTraineeLave(ctx, a);
    if (a.explosionFaite) {
      const te = Math.min(1, (now - a.explosionStart) / 380);
      _dessinerExplosionLave(ctx, a.targetX, a.targetY, te);
    }
  }
  drawSmallMarble(ctx, x, y, a.gr, a.color);
  ctx.restore();

  if (t < 1) {
    requestAnimationFrame(ejectAnimStep);
  } else {
    // enregistre définitivement la bille à sa position de chute (avec poussée si collision)
    insertGutterMarbleXY(a.targetX, a.targetY, a.color, a.mx, a.my, a.spacing, a.corners, a.outset);
    ejectAnim = null;
    drawBoard();  // rendu final propre
  }
}


/* Petits ronds dans les interstices entre les trous, contenant des triangles
   dont les pointes visent les grands cercles (trous) voisins.
   - Ronds intérieurs : au centre de chaque triplet de 3 trous voisins
     (équidistants → triangles parfaitement orientés vers les trous).
   - Ronds de bord : ajoutés le long du pourtour là où il n'y a que 2 trous. */
function drawBoardTriangles(ctx) {
  ctx.save();

  // Centres de trous
  const holes = [];
  for (let r=0;r<9;r++) for (let c=0;c<ROWS[r];c++) holes.push(hexCoord(r,c));

  const D = HEX_RADIUS * 2;            // distance trou→trou voisin
  const tol = HEX_RADIUS * 0.4;
  const smallR = HEX_RADIUS * 0.32;    // rayon d'un petit rond
  function near(a,b){ return Math.abs(Math.hypot(a.x-b.x, a.y-b.y) - D) < tol; }

  const junctions = [];
  const seen = new Set();
  function addJunction(x, y) {
    const key = Math.round(x/3)+','+Math.round(y/3);
    if (seen.has(key)) return;
    seen.add(key);
    junctions.push({ x, y });
  }

  // 1. Ronds intérieurs : centre de chaque triplet de 3 trous mutuellement voisins
  for (let i=0;i<holes.length;i++) {
    for (let j=i+1;j<holes.length;j++) {
      if (!near(holes[i],holes[j])) continue;
      for (let k=j+1;k<holes.length;k++) {
        if (near(holes[i],holes[k]) && near(holes[j],holes[k])) {
          addJunction((holes[i].x+holes[j].x+holes[k].x)/3, (holes[i].y+holes[j].y+holes[k].y)/3);
        }
      }
    }
  }

  // 2. Ronds de bord : pour chaque paire de trous voisins, les deux points
  //    perpendiculaires au segment, à la même distance qu'un centre-de-triangle.
  //    On ne garde que ceux situés à l'extérieur (sans 3e trou de ce côté).
  const triCenterDist = D / (2 * Math.cos(Math.PI/6));  // distance centre-triangle → trou ≈ 30
  const perpOffset = Math.sqrt(Math.max(0, triCenterDist*triCenterDist - (D/2)*(D/2)));
  for (let i=0;i<holes.length;i++) {
    for (let j=i+1;j<holes.length;j++) {
      if (!near(holes[i],holes[j])) continue;
      const mx=(holes[i].x+holes[j].x)/2, my=(holes[i].y+holes[j].y)/2;
      const dx=holes[j].x-holes[i].x, dy=holes[j].y-holes[i].y, len=Math.hypot(dx,dy);
      const px=-dy/len, py=dx/len;  // perpendiculaire
      [1,-1].forEach(function(sgn){
        const cx = mx + px*perpOffset*sgn, cy = my + py*perpOffset*sgn;
        // ce point a-t-il un 3e trou proche (≈ triCenterDist) ? si oui c'est un rond intérieur déjà placé
        let hasThird = false;
        for (const h of holes) {
          if (h===holes[i]||h===holes[j]) continue;
          if (Math.abs(Math.hypot(h.x-cx,h.y-cy) - triCenterDist) < HEX_RADIUS*0.3) { hasThird=true; break; }
        }
        // garde seulement les ronds de bord (pas de 3e trou = côté extérieur)
        if (!hasThird) addJunction(cx, cy);
      });
    }
  }

  // 3. Dessine chaque rond + triangles vers les trous voisins (à ≈ triCenterDist)
  for (const jn of junctions) {
    ctx.beginPath();
    ctx.arc(jn.x, jn.y, smallR, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(100,100,100,0.32)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(75,75,75,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    for (const h of holes) {
      const dx = h.x - jn.x, dy = h.y - jn.y;
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dist - triCenterDist) > HEX_RADIUS * 0.32) continue;  // trous voisins du rond
      const ux = dx/dist, uy = dy/dist;       // direction rond → grand cercle
      const px = -uy, py = ux;
      const tipLen = smallR * 0.95;
      const baseW  = smallR * 0.38;
      const tipX = jn.x + ux*tipLen, tipY = jn.y + uy*tipLen;
      const b1X = jn.x + px*baseW,  b1Y = jn.y + py*baseW;
      const b2X = jn.x - px*baseW,  b2Y = jn.y - py*baseW;
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(b1X, b1Y);
      ctx.lineTo(b2X, b2Y);
      ctx.closePath();
      ctx.fillStyle = 'rgba(155,155,155,0.45)';
      ctx.fill();
    }
  }
  ctx.restore();
}

function hexPath(ctx, x, y, r) {
  ctx.beginPath();
  for (let i=0;i<6;i++) {
    const angle = Math.PI/180 * (60*i-30);
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    i===0 ? ctx.moveTo(px,py) : ctx.lineTo(px,py);
  }
  ctx.closePath();
}

/* ═══════════════════════════════════════════
   SONS (Web Audio API — synthèse, aucun fichier externe)
═══════════════════════════════════════════ */
let _audioCtx = null;
let soundEnabled = true;
try { soundEnabled = localStorage.getItem('abalone_sound') !== '0'; } catch(e) {}

/* Son et vibration, GRANULAIRES PAR VUE (1D / 2D / 3D) — demande d'Olivier.
   Par defaut : la 1D est entierement silencieuse (aucune vibration non
   plus — coherente avec une vue texte pensee pour la lecture concentree),
   la 2D garde le son mais pas de vibration (le jeu "normal"), la 3D active
   les deux (l'experience la plus immersive).
   Le son garde par-dessus l'interrupteur general existant (soundEnabled,
   juste au-dessus) comme coupe-circuit global : meme une vue autorisee au
   son reste muette si l'utilisateur a coupe le son partout. La vibration
   n'avait pas d'equivalent global avant ce reglage — ces trois cases en
   deviennent le seul controle. */
let viewAVFX = { s1d: false, s2d: true, s3d: true, v1d: false, v2d: false, v3d: true };
try {
  const _savedAVFX = JSON.parse(localStorage.getItem('abalone_view_avfx') || 'null');
  if (_savedAVFX && typeof _savedAVFX === 'object') Object.assign(viewAVFX, _savedAVFX);
} catch(e) {}
function saveViewAVFX() {
  try { localStorage.setItem('abalone_view_avfx', JSON.stringify(viewAVFX)); } catch(e) {}
}
function _currentBoardView() {
  return (typeof window._boardView !== 'undefined' && window._boardView) ? window._boardView : '2d';
}
function _viewAllowsSound() { return viewAVFX['s' + _currentBoardView()] !== false; }
function _viewAllowsVibration() { return viewAVFX['v' + _currentBoardView()] === true; }
function setViewSound(view, on) { viewAVFX['s' + view] = !!on; saveViewAVFX(); }
function setViewVibration(view, on) { viewAVFX['v' + view] = !!on; saveViewAVFX(); }
function syncViewAVFXToggles() {
  ['1d', '2d', '3d'].forEach(function(v){
    const s = document.getElementById('avfx-s' + v); if (s) s.checked = viewAVFX['s' + v] !== false;
    const vb = document.getElementById('avfx-v' + v); if (vb) vb.checked = viewAVFX['v' + v] === true;
  });
}

// Systèmes de notation actifs (Aba-Pro et/ou Nacre). Aba-Pro activé par défaut.
let notationAbaPro = true;
let notationNacre = false;
try {
  const a = localStorage.getItem('abalone_notation_abapro');
  const n = localStorage.getItem('abalone_notation_nacre');
  if (a !== null) notationAbaPro = (a === '1');
  if (n !== null) notationNacre = (n === '1');
} catch(e) {}

function toggleNotationAbaPro(on) {
  notationAbaPro = !!on;
  // au moins un système doit rester actif
  if (!notationAbaPro && !notationNacre) { notationNacre = true; const nt=document.getElementById('notation-nacre-toggle'); if(nt) nt.checked = true; saveNotationPrefs(); }
  saveNotationPrefs();
  refreshMoveHistory();
}
function toggleNotationNacre(on) {
  notationNacre = !!on;
  if (!notationAbaPro && !notationNacre) { notationAbaPro = true; const at=document.getElementById('notation-abapro-toggle'); if(at) at.checked = true; saveNotationPrefs(); }
  saveNotationPrefs();
  refreshMoveHistory();
}
function saveNotationPrefs() {
  try {
    localStorage.setItem('abalone_notation_abapro', notationAbaPro ? '1' : '0');
    localStorage.setItem('abalone_notation_nacre', notationNacre ? '1' : '0');
  } catch(e) {}
}
// Réaffiche l'historique des coups avec la notation courante (recalcule depuis les snapshots)
function refreshMoveHistory() {
  if (typeof boardSnapshots === 'undefined' || !boardSnapshots.length) return;
  // les libellés sont déjà stockés ; on les recompose si on a gardé les infos de coup
  if (typeof rebuildMoveListLabels === 'function') rebuildMoveListLabels();
}

function getAudioCtx() {
  if (!_audioCtx) {
    try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { return null; }
  }
  return _audioCtx;
}

// Joue un son simple (oscillateur + enveloppe)
function playTone(freq, dur, type, vol, slideTo) {
  if (!soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
  } catch(e) {}
}

// Sons spécifiques du jeu
// Retour haptique (vibration) sur mobile — ignoré si non supporté
function vibrate(pattern) {
  try { if (navigator.vibrate) navigator.vibrate(pattern); } catch(e) {}
}
/* ═══ SONS (échantillons WAV embarqués) ═══ */
let SFX={};  // rempli par le décompresseur (Blob URLs)
const SFX_C={move:'7dNpV1MHAsbxe7MnBEIgCwkBQkjYE5Ibj8Joq4zWpWq1RXHXQUBtXXBcSqu047hwLLaKdqxtqTrWBQ966oIeh4JD6eiANDcJISwBEghkJSEkIWRP7vgR5gNwnrfPu//5fbRq+XJ7LABsKi59b8/BY9x4AADAt+OVAsCyhwCAAuKBirJjZV1vPwBwJaaOsZl7IvusSACJpJclFUJt5obUIhqVeDTidUHmF1p0/wnlXtgt4yk0vYNDryYyHccCLOyJeDA5g78n7xOxHYIhsliRuzUjgX2YgsLs8qdPjYyzh9b29sjHZFdho/Ju/1e6HAtm5kJUQCqiz0u7nDUh7JNA0kkJWSTL+iLtIv0UyRLdOVNjUeq0/aSeu/CI7F9ybu+wpn68247230EzKR0sZkZDrq2gA/JC58XX8ir565NV8cexPYEvHQkG1jBB/a4iKNsCb1bK+45o9aafXIzIc8JEIiH1n5mFwhOSfGkh1CRqzr7F1THsMTuAN55uq3O0feBOjwNWyjbL/6oyDZbpj9i+9YpRj2NrktC8rpzygjqIJg2KS/P3Cb7iSBIsuGUh3fQHxrQRmfq5IhXOhtWKqHr3yA3jAuet0Hv48wkDnEbBuXy6hC09CS0uuJzzMj03qTRWBS7wcmxMfdPgClWxXC5DyWU9gYGisdRJweyvwAqyhGnh2rJ7RKugbGmZhCwsz3yZ8nXiFkJLeKmr3iTS/tA3X7kGRsHbFIXqrcNlhn6HKKjC5lJvJt/jd+XdFUehZ1B3wd5cFe8w62XcCnSj75h96fh1jUd1Uz4oewEX9NAHkkYVlpaZ5cgwaZzemYbPnieKvi3QLmkRlmZZUw20N0RRtMndb16qq+rvUJ6DTTKb/GTvlqGcic+mWv27MG8ou9k3MlB5+eJBaBxaLZ6Xp894yubFt2GSAoqp6onvh5p6cQq77FP4urKwP6I9a17vVkYOEi/Sbqaysy4J70vE0gRou6g4O547n7Eg5jZC8/Csu0bXDpT2dMFqWa28S/UXjV+fYl/tm0RVxKWxLvKg3PsFjRBO+rvYn2fmO5JPUwtwF4Ki6ceGhuGP1Z8pSPBimK6s7LOOLDZZndvDEfz8xMMpgsyx/JUSvnQb5BVl5IjTzzJ/JieBp2aPTJ4Zmzfo6WG8LZAnT1FVDcrGOieHZ4+DYfIAszp9W05ywX6IKy2QNOebBPyU0YRb+Gio3ukw3huR9HkUUpgGf6f4Ua0dRgy10+bg17gh6iJOtiArXyeOk/4A1RZEclbx5EmkuG9Q095O20N9huYnVZVcJRuGa3pqB+6Pfmo95JkTNyduTtycuDlxc+L+X3Es5Zd9FO1eE8FVGTbiZxLCnJMCVP47Yq+EJWkWzmblczsYEDkWNM+ut/Xp3RqKulq5SdGqvKS+MfSPcYL9c+9OUEAuZgjTjmQ+y3skeqdgm5CXI+c9Zy+lenFbw37XNgswVqp5ol6nWq26rZ6veT3qM+901YS6sR0UbdI97ovMjtwr+bT8dTn7+Q9T9tNZZAmqyP/EwTLpdXs17r6H6rt9skGfVmvgTW3yAsANYnPCa/bB9JLMwpxAzqXsOEFj2p2kiviNeFek2UO3nzcc1iUP/TZwcmCdhqttGZdbAbc+GESryQEaklyXXiLIzQpkvub/wrWz5YlPY/DoJUGFiz95Z+K2bvcwcahxCNLW6veazzn+7nVGy/B7KFcZ9RxieldGE78xQ85dwVnPWEjZg1+ECHyXpkcslRNVo0LtryNsXaHearTZpt1Xg9UoEamEWsc8xfGl/Z4Op7O47ZxpppWKkC6hQ6FGj2eqyNIx8Wrs49H20X/r3zdKJiXOgFcUPYTdQb6eoGMOJ+9O3ZB2L7WS8zipNfFNbC5+AfBBoNMdtEssDwzfjmPGwYka44fWNY4sz3fBJaASPxW7MrGB+Yi9g3OFszb556TntHYKSHqD3h8p8tW6rtvbLHRTt8FiOGBabC2a4rtf+loinejviWNxWxNlDBIryKpn9TONNGN8HPkWzgwIQy9nR529dpnVad5oRlmsVpfd4WyaNQY3Aa3YLtIiii7hb3SEsYZZydhMW0r9MPYF4Tn6m+iZgMYDO69MfWTLnkyf/JOtfOoL5w4P7L8S2Y9i48ti8BQd9T+JN2n7aIJES3xPLJn0B3Yl+Fv4kL/Os8IldyyeemBnTtU4XjuVM8d9p0JtiBNtwu+LWR33SXwTNUqtoBopP8beIgnwG9DlyNmQzdflKXZXO09NV0zznc2u4IzGmxVsiWwHDRguwUyix9bHLadIKCVxbeTTpFf4Jsx2kBAdDPp8dbOPZr5wg+4lbmim2+P01gb2hQ8hh1ErsQq8iXg0ppz8gLyGvDamjfgE/z72HsqGLIy0Bi/4/+s9PSv3PPZkzwq9v/iuBf4ICaMNgBfFxYZxRwnHiB6ig1hJrCAEcEXYd9E8EI2EwpmhhsAB/31fqa/aR/Qj/rVBbaghcghZBDpRRzFPsNdxefjNeB7+Mu4h9gwmC/0A5AON0eWRxHBKqCpICYLBPwfh4LXQ1fCLiCOaCZSA5ahV6DD6KOYB5jZmJ2YcXYQ+gDoPNgBPkP4oPVodQUXawnfCreFwuCwyEfk8ykJakY3AGLARfATaQAIKh7KCz8CDIAtsByoBKtCJXEB2IcuQhUgxUoJUIfXIU0SF2JAQ8j8=',eject:'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',game_over:'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',occ_change:'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',occ_draw:'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',time_alert:'7dr5U5R1HMDxh+UQWJFzuYVlgeXc+3ieR0RlVIiOySHAqcCGQ0mIbADdbBgjh8lWhckMjBSchGoKcmw6DMtBRZ5nT/biXK7lXO77hoXs5/4Af/m8vz99P7+/fvp8khLj4+NTEeRkXOrxM/lFdBcEQaxePMaL2bEGBKEgLkh2RlHGf38E4bm4BxZFJQu3MSpeImyMyguscDmLCOePD+raupQepJlIUVq3xZrs5ti7Oc6ZARORW4JejIm3C+Oi/einXGOsdufXB9Pb+SoRqSYoymJD+cCh2bSdO/vu70+LvCtoxA7jYSIiWkZnujlRFAsNQ1PtX6reIf8kflWs64f6JTNXLVqnTX91RJzgJpaCS0SJrKKgGbd+SuVixnBxx5zqM/IekaW4oEf7H0w3bts4HfWPiTDxc7EcvFmkYAUwfnN/YJ215DPi3JmkbiBvEF6KNV1Z39SUeQvde83vx/Bi/iFMgjuJX2GTjI89Lttwl3UjtZ0P1d3kZUIj/0Q31suc8tw6S9X7uobT+M5YKZ4ifs7OD46hvWW7s3xt9EBXYKuDTEJI5bvaI71Zk8c2bzt6+14Ma+D1o2V4lTiW4xayQwuxU63Ejxm6pK0HZeeIePkV7Z2e7yYKN1QOaT4DzDjeT+jXuFH8O+ePkCeeK3a3V63NH3avthbIcgk7uat2y2gar1232Nd4H2UauAXoN7gPGsFNDS3xatmTt/bUTDWe0dTLcgi5rEbzrpE+blhj2Zu8vg/N5KJoFZ6CfstdCT3sXWEfs14y/rOxU2OWvU+Uy1iax92ZZuu19D10L9vQOc6muBIvRx15XzEt3qcdqBtHJl7reV3LlH9AnJQ1tQZ1140JV8vs3vPMDrnIeSS+gT9HJTxW2CMfoWPvBmVytqdZmyMvJBiy5NYrXeOjp1f+sa2mPQm24kjEUnwNHeQRYed9KdRfNlsmb/Ye1NXLi4kFcko918kevbU8aWP08A3+nM0TX8LDsER+ejjHT0u9tPXFFN73l25JLiWekaXqtzvPj8iXfGxoHoUMB/aE6ByejN3nL4Sb/ar3nth+Y3qoT6yPVVQRlSRd3dLxeHh7McH6hLs86CqrWnQK/xRzFZRG3PXPdWJY3Geu9z/USxX1RD7ZpBJ02A1zFy9QpG4BQfasN0Wv4j9gHwlokcn7xfuWLMYZbOCAoVvxlEggM1R17UlD2Qt1Vs9cC+il0TtCAa7EWgW1kfYBVs4tO/dmRweaDFFKIxFC2qq82msGq+b1yKZLc6Alql7og09j4UJO1N8BKudbu3lzFaaEthLlCmFDNiivt82YNHMgDsSBOBAH4kAciANxIA7EgTgQB+JAHIgDcSAOxIE4EAfiQByIA3Eg7v/iEAiCIAiCIAiCIAiCIAiCIAiCIAiCoJcabMBhAw43J3BzAuJAHIgDcSAOxIE4EAfiQByIA3EgDsSBOBAH4kAciANxIA7EgTgQ93LF/Qs='};
const _sfxCache = {};
let _sfxUnlocked = false;
function unlockSfx(){
  if(_sfxUnlocked) return; _sfxUnlocked = true;
  for(const k in SFX){
    try{
      const a = new Audio(SFX[k]); a.preload = 'auto'; _sfxCache[k] = a;
      // Déblocage réel : les navigateurs n'autorisent les LECTURES FUTURES
      // (déclenchées depuis le code, pas directement par un clic) que si un
      // play() a réellement été exécuté PENDANT un vrai geste utilisateur —
      // créer l'objet Audio seul ne débloque rien. Volume à 0 et pause
      // immédiate : aucun son audible, juste le déblocage.
      a.volume = 0;
      const p = a.play();
      if (p && p.then) p.then(function(){ a.pause(); a.currentTime = 0; a.volume = 1; }).catch(function(){ a.volume = 1; });
    }catch(e){}
  }
  // Réveille aussi le second système de son (tonalités synthétisées, playTone/getAudioCtx)
  try {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(function(){});
  } catch(e){}
}
document.addEventListener('pointerdown', unlockSfx, { once:true });
function playSfx(name){
  if(!soundEnabled) return;
  const src = SFX[name]; if(!src) return;
  try{
    let base = _sfxCache[name];
    if(!base){ base = new Audio(src); base.preload = 'auto'; _sfxCache[name] = base; }
    const a = base.cloneNode();   // clone → rejeu fiable, pas d'interruption entre deux coups rapides
    a.play().catch(function(){});
  }catch(e){}
}

/* Ces 4 fonctions correspondent aux micro-interactions DU PLATEAU — celles
   dont Olivier a demande qu'elles suivent la vue active (1D/2D/3D), pas les
   evenements globaux du jeu (partie gagnee, badge debloque...) qui restent
   uniquement sous le controle du son general (soundEnabled). */
function soundMove()    { if (_viewAllowsSound()) playSfx('move'); if (_viewAllowsVibration()) vibrate(20); }  // déplacement : clic doux + buzz (3D)
function soundPush()    { if (_viewAllowsSound()) playSfx('move'); if (_viewAllowsVibration()) vibrate(20); }  // poussée : son de mouvement + vibration
function soundEject()   { if (_viewAllowsSound()) playSfx('eject'); if (_viewAllowsVibration()) vibrate([30,40,60]); }  // éjection : descente + vibration forte
function soundSelect()  { if (_viewAllowsSound()) playTone(440, 0.05, 'sine', 0.08); }               // sélection : petit tic
/* ── Sons synthétisés supplémentaires ─────────────────────────────────
   Entièrement générés par oscillateur (Web Audio) : aucun échantillon, donc
   aucun poids ajouté au fichier et aucune ressource tierce. Chaque son est
   une courte séquence de notes jouées via playTone. Idée d'Olivier. */
function playSequence(notes) {
  // notes : [{f:fréquence, t:délai ms, d:durée s, w:forme, v:volume, to:glissando}]
  if (!soundEnabled) return;
  notes.forEach(function(n){
    setTimeout(function(){ playTone(n.f, n.d || 0.09, n.w || 'sine', n.v || 0.10, n.to); }, n.t || 0);
  });
}
// Badge débloqué : arpège majeur ascendant (do–mi–sol–do)
function soundBadge()    { playSequence([{f:523,t:0},{f:659,t:90},{f:784,t:180},{f:1047,t:270,d:0.22,v:0.12}]); }
// Montée de niveau : quinte brillante suivie d'une octave
function soundLevelUp()  { playSequence([{f:440,t:0,w:'triangle'},{f:660,t:100,w:'triangle'},{f:880,t:200,d:0.28,w:'triangle',v:0.13}]); }
// Nouveau skin débloqué : deux notes cristallines
function soundUnlock()   { playSequence([{f:988,t:0,d:0.10,v:0.09},{f:1319,t:110,d:0.22,v:0.10}]); }
// Annulation d'un coup : petite descente
function soundUndo()     { playSequence([{f:420,t:0,d:0.07,w:'sine',v:0.08,to:260}]); }
// Puzzle résolu : confirmation à deux notes
function soundPuzzleOk() { playSequence([{f:660,t:0,d:0.09,v:0.10},{f:990,t:100,d:0.20,v:0.11}]); }
// Menace détectée : avertissement grave et discret
function soundThreat()   { playSequence([{f:220,t:0,d:0.12,w:'sawtooth',v:0.05}]); }
/* Sons de synthèse ajoutés pour des actions jusque-là muettes. Entièrement
   générés par playSequence (oscillateurs) : aucun fichier audio, aucune
   ressource tierce, donc rien qui pose de question de droits. */
function soundForceAI()  { playSequence([{f:1200,t:0,d:0.05,w:'square',v:0.06,to:600},{f:700,t:60,d:0.08,w:'triangle',v:0.07}]); }  // ⚡ forcer l'IA : petit zap descendant
function soundCancel()   { playSequence([{f:520,t:0,d:0.10,w:'sine',v:0.07,to:340},{f:300,t:120,d:0.18,w:'sine',v:0.06,to:180}]); } // partie annulée : deux notes qui retombent
function soundRain()     { playSequence([{f:900,t:0,d:0.07,w:'sine',v:0.05},{f:1150,t:70,d:0.07,w:'sine',v:0.045},{f:760,t:150,d:0.09,w:'sine',v:0.04},{f:1320,t:230,d:0.10,w:'sine',v:0.05}]); } // pluie de billes : cascade légère
function soundWin()     { vibrate([60,50,60,50,120]); playSfx('game_over'); }
function soundDraw()    { vibrate([40,60,40]); playSfx('occ_draw'); }  // pattern distinct du gain -- pas une célébration, juste un accusé de fin de partie

function toggleSound(on) {
  soundEnabled = on;
  try { localStorage.setItem('abalone_sound', on ? '1' : '0'); } catch(e) {}
  if (on) soundSelect();  // petit retour sonore à l'activation
}

function toggleCoordinates(on) {
  showCoordinates = on;
  try { localStorage.setItem('abalone_show_coords', on ? '1' : '0'); } catch(e) {}
  if (typeof drawBoard === 'function') drawBoard();
}

function drawMarble(ctx, x, y, color, isSel) {
  const r = HEX_RADIUS - 6;

  // ── Ombre portée douce (sous la bille) ──
  ctx.beginPath(); ctx.arc(x+3, y+5, r*0.98, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2); ctx.clip();

  if (color === 'black') {
    // ═══ BILLE NOIRE — dégradé multi-stops selon le skin ═══
    const base = ctx.createRadialGradient(x-r*0.3, y-r*0.35, r*0.05, x+r*0.1, y+r*0.15, r*1.15);
    const bs = boardTheme.blackStops || ['#3a3a3c','#1a1a1c','#050506'];
    for (let i=0; i<bs.length; i++) base.addColorStop(i/(bs.length-1), bs[i]);
    ctx.fillStyle = base;
    ctx.fillRect(x-r, y-r, r*2, r*2);

    // Veines dorées (kintsugi) — seulement si le skin les active
    if (boardTheme.veins) {
      const seed = (Math.round(x)*31 + Math.round(y)*17) % 360;
      ctx.strokeStyle = 'rgba(200,168,75,0.55)';
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      for (let v=0; v<3; v++) {
        const a0 = (seed + v*97) * Math.PI/180;
        let px = x + Math.cos(a0)*r*0.85;
        let py = y + Math.sin(a0)*r*0.85;
        ctx.beginPath(); ctx.moveTo(px, py);
        let ang = a0 + Math.PI*0.7;
        for (let s=0; s<4; s++) {
          ang += (((seed*7 + v*53 + s*29) % 100)/100 - 0.5) * 1.8;
          const len = r*0.32;
          px += Math.cos(ang)*len;
          py += Math.sin(ang)*len;
          ctx.lineTo(px, py);
        }
        ctx.globalAlpha = 0.5 - v*0.12;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // micro-pépites d'or
      ctx.fillStyle = 'rgba(220,185,90,0.5)';
      for (let g=0; g<5; g++) {
        const ga = (seed + g*71)*Math.PI/180;
        const gr = r*(0.3 + (g*0.13));
        ctx.beginPath();
        ctx.arc(x+Math.cos(ga)*gr, y+Math.sin(ga)*gr, 0.8, 0, Math.PI*2);
        ctx.fill();
      }
    }

  } else {
    // ═══ BILLE BLANCHE — dégradé multi-stops selon le skin ═══
    const base = ctx.createRadialGradient(x-r*0.3, y-r*0.35, r*0.05, x+r*0.15, y+r*0.2, r*1.2);
    const ws = boardTheme.whiteStops || ['#ffffff','#e8e6e2','#c4c2c0','#9a9a9c'];
    for (let i=0; i<ws.length; i++) base.addColorStop(i/(ws.length-1), ws[i]);
    ctx.fillStyle = base;
    ctx.fillRect(x-r, y-r, r*2, r*2);

    // Marbrures nacrées subtiles
    const seed = (Math.round(x)*23 + Math.round(y)*41) % 360;
    ctx.globalAlpha = 0.12;
    for (let m=0; m<3; m++) {
      const ma = (seed + m*120)*Math.PI/180;
      const mx = x + Math.cos(ma)*r*0.4;
      const my = y + Math.sin(ma)*r*0.4;
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, r*0.5);
      mg.addColorStop(0, m%2 ? '#d8d4e8' : '#cfcfcf');
      mg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = mg;
      ctx.fillRect(x-r, y-r, r*2, r*2);
    }
    ctx.globalAlpha = 1;
  }

  // ── Reflet spéculaire net (haut-gauche) — commun aux deux ──
  const hi = ctx.createRadialGradient(x-r*0.38, y-r*0.42, 0, x-r*0.3, y-r*0.34, r*0.55);
  hi.addColorStop(0, color==='black' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.95)');
  hi.addColorStop(0.5, color==='black' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)');
  hi.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hi;
  ctx.fillRect(x-r, y-r, r*2, r*2);

  // Petit point de lumière concentré
  ctx.beginPath();
  ctx.arc(x-r*0.32, y-r*0.36, r*0.12, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();

  // ── Reflet de bord inférieur (rim light) ──
  const rim = ctx.createRadialGradient(x+r*0.2, y+r*0.3, r*0.7, x+r*0.15, y+r*0.25, r);
  rim.addColorStop(0, 'rgba(255,255,255,0)');
  rim.addColorStop(1, color==='black' ? 'rgba(120,120,130,0.25)' : 'rgba(255,255,255,0.3)');
  ctx.fillStyle = rim;
  ctx.fillRect(x-r, y-r, r*2, r*2);

  ctx.restore();

  // ── Contour fin ──
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.strokeStyle = color==='black' ? 'rgba(0,0,0,0.6)' : 'rgba(150,150,150,0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // ── Mode accessibilité "formes" : marqueur triangulaire sur les billes
  //    noires uniquement (les blanches restent rondes) -- une différenciation
  //    qui ne dépend d'aucune perception de couleur. Réglage existait déjà
  //    dans Paramètres > Accessibilité (amode-shapes) mais n'était jamais
  //    branché à un rendu réel : le bouton ne faisait rien sur le vrai
  //    plateau. Dessiné en surimpression, sans toucher au rendu du dégradé
  //    existant (risque de casser les skins avec un vrai changement de
  //    forme de base). */
  if (typeof A11Y !== 'undefined' && A11Y.colorMode === 'shapes' && color === 'black') {
    const tr = r * 0.42;
    ctx.beginPath();
    ctx.moveTo(x, y - tr);
    ctx.lineTo(x + tr, y + tr*0.8);
    ctx.lineTo(x - tr, y + tr*0.8);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  // ── Anneau de sélection doré ──
  if (isSel) {
    ctx.beginPath(); ctx.arc(x, y, r+3, 0, Math.PI*2);
    ctx.strokeStyle = '#c8a84b'; ctx.lineWidth = 2.5; ctx.stroke();
  }
}

function getHexAt(px, py) {
  let best = null, bestDist = Infinity;
  for (let r=0;r<9;r++) {
    for (let c=0;c<ROWS[r];c++) {
      const {x,y} = hexCoord(r,c);
      const d = Math.sqrt((px-x)**2+(py-y)**2);
      if (d < bestDist && d < HEX_RADIUS) { bestDist=d; best={r,c}; }
    }
  }
  return best;
}

/* ── Animation de transition « pluie de billes » ──────────────────────
   Au lancement d'une partie, une pluie de billes noires et blanches tombe
   sur un canvas plein écran (avec gravité, rotation et rebond léger), puis
   l'overlay se retire en fondu et la partie commence. 100% canvas, aucune
   dépendance. Idée d'Olivier. Respecte prefers-reduced-motion (accessibilité)
   et ne se déclenche qu'une fois par entrée sur la page de jeu. */
let _marbleRainActive = false;
// Point d'entrée « Jouer » : joue l'animation de pluie de billes puis ouvre
// la partie. La page s'affiche immédiatement dessous (l'overlay est
// transparent aux clics et se retire seul), donc aucune latence perçue.
function playGame() {
  /* « Jouer » ouvre desormais l'ecran de configuration, et non plus le
     plateau directement. La variante et le camp s'y choisissent avant la
     partie. On y passe par openGameSetup pour un point d'entree unique. */
  openGameSetup();
}

function playMarbleRainTransition(onDone) {
  onDone = typeof onDone === 'function' ? onDone : function(){};
  // Accessibilité : si l'utilisateur a demandé moins d'animations, on saute
  try {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { onDone(); return; }
  } catch(e){}
  if (_marbleRainActive) { onDone(); return; }
  _marbleRainActive = true;
  if (typeof soundRain === 'function') soundRain();

  let overlay, ctx, raf, marbles;
  try {
    overlay = document.createElement('canvas');
    overlay.id = 'marble-rain';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;pointer-events:none;transition:opacity 0.4s ease';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = window.innerWidth, H = window.innerHeight;
    overlay.width = W * dpr; overlay.height = H * dpr;
    overlay.style.width = W + 'px'; overlay.style.height = H + 'px';
    document.body.appendChild(overlay);
    ctx = overlay.getContext('2d');
    ctx.scale(dpr, dpr);

    // Génère les billes : moitié noires, moitié blanches, positions/timings variés
    const COUNT = Math.min(46, Math.max(24, Math.floor(W / 24)));
    marbles = [];
    for (let i = 0; i < COUNT; i++) {
      const r = 14 + Math.random() * 16;
      marbles.push({
        x: Math.random() * W,
        y: -r - Math.random() * H * 0.35,    // demarrent juste au-dessus de l'ecran, decalage modere
        vy: 3 + Math.random() * 4,
        vx: (Math.random() - 0.5) * 1.2,
        r: r,
        color: i % 2 === 0 ? 'black' : 'white',
        rot: Math.random() * Math.PI,
        vrot: (Math.random() - 0.5) * 0.15,
        landed: false,
      });
    }

    const groundY = H + 40;   // les billes sortent par le bas
    const start = Date.now();
    const MAX_MS = 2200;

    function drawMarble(m) {
      ctx.save();
      ctx.translate(m.x, m.y);
      ctx.rotate(m.rot);
      const grad = ctx.createRadialGradient(-m.r*0.35, -m.r*0.35, m.r*0.15, 0, 0, m.r);
      if (m.color === 'black') { grad.addColorStop(0, '#4a4a52'); grad.addColorStop(1, '#141418'); }
      else { grad.addColorStop(0, '#ffffff'); grad.addColorStop(1, '#c8c8d0'); }
      ctx.beginPath();
      ctx.arc(0, 0, m.r, 0, Math.PI*2);
      ctx.fillStyle = grad;
      ctx.fill();
      // reflet
      ctx.beginPath();
      ctx.arc(-m.r*0.32, -m.r*0.32, m.r*0.22, 0, Math.PI*2);
      ctx.fillStyle = 'rgba(255,255,255,' + (m.color === 'black' ? 0.25 : 0.6) + ')';
      ctx.fill();
      ctx.restore();
    }

    function frame() {
      const elapsed = Date.now() - start;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      let allGone = true;
      for (const m of marbles) {
        m.vy += 0.35;           // gravité
        m.y += m.vy;
        m.x += m.vx;
        m.rot += m.vrot;
        if (m.y < groundY) allGone = false;
        drawMarble(m);
      }
      // fondu de sortie sur les 400 dernières ms
      if (elapsed > MAX_MS - 400) overlay.style.opacity = String(Math.max(0, (MAX_MS - elapsed) / 400));
      if (allGone || elapsed > MAX_MS) { finish(); return; }
      raf = requestAnimationFrame(frame);
    }

    let finished = false;
    function finish() {
      if (finished) return; finished = true;
      if (raf) cancelAnimationFrame(raf);
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      _marbleRainActive = false;
      onDone();
    }

    raf = requestAnimationFrame(frame);
    // filet de sécurité : quoi qu'il arrive, on termine
    setTimeout(finish, MAX_MS + 500);
  } catch(e) {
    // en cas d'échec, on n'empêche jamais la partie de démarrer
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    _marbleRainActive = false;
    onDone();
  }
}

function initGame() {
  if (gameOver === 'init') return;
  // Propose de reprendre une partie sauvegardée (avant de réinitialiser)
  let savedExists = false;
  try {
    const raw = localStorage.getItem('abalone_saved_game');
    if (raw) { const s = JSON.parse(raw); savedExists = s && s.board && Object.keys(s.board).length > 0; }
  } catch(e) {}

  if (savedExists && !_resumePromptShown) {
    _resumePromptShown = true;
    showResumePrompt();
    return;  // ne reset pas tout de suite, on attend le choix
  }
  resetGame();
  // synchronise l'interrupteur d'aide visuelle avec la préférence
  const gt = document.getElementById('game-hints-toggle');
  if (gt) { gt.checked = showMoveHints; if (gt.nextElementSibling) gt.nextElementSibling.style.background = showMoveHints ? 'var(--gold)' : 'var(--border)'; }
}

let _resumePromptShown = false;

// Affiche une bannière proposant de reprendre la partie sauvegardée
function showResumePrompt() {
  let banner = document.getElementById('resume-banner');
  if (banner) banner.remove();
  banner = document.createElement('div');
  banner.id = 'resume-banner';
  banner.style.cssText = 'position:fixed;top:80px;left:50%;transform:translateX(-50%);z-index:2600;background:var(--surface);border:1px solid var(--gold);border-radius:12px;padding:16px 20px;display:flex;align-items:center;gap:16px;box-shadow:0 8px 30px rgba(0,0,0,0.4)';
  banner.innerHTML = '<span style="font-size:13px;color:var(--text)">🎮 Une partie en cours a été trouvée. La reprendre ?</span>';
  const yes = document.createElement('button');
  yes.textContent = 'Reprendre';
  yes.style.cssText = 'padding:8px 16px;background:var(--gold);border:none;border-radius:7px;color:#0d0f0e;font-weight:700;cursor:pointer;font-family:DM Sans,sans-serif;font-size:13px';
  yes.onclick = function() {
    banner.remove();
    if (loadSavedGame()) {
      // reprend le chrono à partir du temps sauvegardé
      stopGameTimer();
      gameTimerInterval = setInterval(function() { gameTimerSeconds++; updateGameTimerDisplay(); }, 1000);
      updateGameTimerDisplay();
      showToast('🎮 Partie reprise !');
    } else { resetGame(); }
  };
  const no = document.createElement('button');
  no.textContent = 'Nouvelle partie';
  no.style.cssText = 'padding:8px 16px;background:transparent;border:1px solid var(--border);border-radius:7px;color:var(--text);cursor:pointer;font-family:DM Sans,sans-serif;font-size:13px';
  /* « Nouvelle partie » doit mener a l'ecran de configuration, pas lancer
     directement une partie : resetGame() repart sur la disposition par
     defaut (standard) sans jamais montrer les choix. C'est par ce chemin que
     Saab tombait sur une partie standard sans avoir rien choisi
     (« Pas tjs la fenetre de choix, demarre sur Standard »). */
  no.onclick = function() { banner.remove(); clearSavedGame(); openGameSetup(); };
  banner.appendChild(yes); banner.appendChild(no);
  document.body.appendChild(banner);
  /* Sans reponse au bout de 12 s, meme regle : on montre les choix au lieu de
     demarrer une partie a la place du joueur. La sauvegarde est conservee —
     l'absence de reponse n'est pas un refus. */
  setTimeout(function(){ if (document.getElementById('resume-banner')) { banner.remove(); openGameSetup(); } }, 12000);
}

