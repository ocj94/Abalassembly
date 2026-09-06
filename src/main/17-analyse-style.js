/* ═══════════════════════════════════════════
   ANALYSE DE STYLE (par partie, 100% hors-ligne)
   S'appuie sur evalFactors() + l'historique. Mesure UNIQUEMENT
   les coups de l'humain. Rendu : carte de fin + bulle live (voix
   d'un bot, contenu analytique). Aucune requête réseau.
═══════════════════════════════════════════ */
let styleGame = null;

function resetStyleGame(){
  styleGame = {
    moves:0, pushes:0, ejections:0, broadsides:0,
    dCenterSum:0, dCohesionSum:0, edgeSumAfter:0,
    centerPosMoves:0, cohesionPosMoves:0, edgeExposedMoves:0,
    qGood:0, qNeutral:0, qWarn:0
  };
}

// Enregistre un coup HUMAIN dans le profil de la partie en cours.
function recordStyleMove(before, after, capDelta, info){
  if(!styleGame) resetStyleGame();
  const g = styleGame;
  g.moves++;
  if(info.type==='push'){ g.pushes++; if(info.ejection) g.ejections++; }
  if(info.type==='broadside') g.broadsides++;
  const dC = after.center - before.center;
  const dCo = after.cohesion - before.cohesion;
  const dE = after.edge - before.edge;
  g.dCenterSum += dC; g.dCohesionSum += dCo; g.edgeSumAfter += after.edge;
  if(dC>=0) g.centerPosMoves++;
  if(dCo>=0) g.cohesionPosMoves++;
  if(dE>=1 && after.edge>=3) g.edgeExposedMoves++;
  // Qualité du coup : même logique que le coach/conseiller (sans relancer de recherche profonde)
  let q='neutral';
  if(capDelta>0 || dC>=3 || dCo>=3) q='good';
  else if((dE>=1 && after.edge>=3) || dC<=-3 || dCo<=-3) q='warn';
  if(q==='good') g.qGood++; else if(q==='warn') g.qWarn++; else g.qNeutral++;
  // Bulle d'analyse live (ton analytique), tous les 5 coups, jamais sur le coup gagnant
  if(capturedByBlack<6 && capturedByWhite<6 && g.moves%5===0) showStyleLiveBubble(g);
}

function clamp01(x){ return Math.max(0, Math.min(100, Math.round(x))); }

// Profil chiffré (0-100) + étiquette descriptive (purement analytique).
function computeStyleProfile(g){
  const m = Math.max(1, g.moves);
  const aggression = clamp01(100*(g.pushes + g.ejections*0.5)/m);
  const centrality = clamp01(100*g.centerPosMoves/m);
  const cohesion   = clamp01(100*g.cohesionPosMoves/m);
  const edgeRisk   = clamp01(100*g.edgeExposedMoves/m);
  const precision  = clamp01(100*(g.qGood + g.qNeutral*0.5)/m);
  let label;
  if(g.moves < 4) label = 'Profil indicatif (partie courte)';
  else {
    const aggressive = aggression>=35, central = centrality>=60;
    const cohesive = cohesion>=60, risky = edgeRisk>=30;
    if(aggressive && central) label = 'Attaquant centralisé';
    else if(aggressive && risky) label = 'Offensif et risqué';
    else if(aggressive) label = 'Joueur offensif';
    else if(central && cohesive) label = 'Positionnel — contrôle du centre';
    else if(cohesive) label = 'Défensif — jeu de cohésion';
    else if(risky) label = 'Téméraire — billes exposées';
    else label = 'Style équilibré';
  }
  return { aggression, centrality, cohesion, edgeRisk, precision, label, moves:g.moves };
}

// Le bot porteur de l'analyse : le conseiller actif, sinon le Bot Noir.
function styleBotColor(){
  const adv = (typeof advisorBotColor==='function') ? advisorBotColor() : null;
  return adv || 'black';
}

// Bulle live (voix d'un bot, contenu analytique chiffré).
function showStyleLiveBubble(g){
  if(typeof showBotBubble!=='function') return;
  const p = computeStyleProfile(g);
  const variants = [
    'Sur ' + g.moves + ' coups : centralité ' + p.centrality + '%, cohésion ' + p.cohesion + '%.',
    (g.edgeExposedMoves>0
      ? 'Billes exposées au bord ' + g.edgeExposedMoves + '× — indice de risque ' + p.edgeRisk + '%.'
      : 'Aucune bille exposée au bord pour l\'instant — risque ' + p.edgeRisk + '%.'),
    'Agressivité ' + p.aggression + '% (' + g.pushes + ' poussées, ' + g.ejections + ' éjections) · précision ' + p.precision + '%.'
  ];
  const idx = ((Math.floor(g.moves/5) - 1) % variants.length + variants.length) % variants.length;
  showBotBubble(styleBotColor(), variants[idx]);
}

// Une barre de métrique pour la carte de fin.
function styleBar(name, val, color){
  return '<div style="margin:6px 0">'
    + '<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--muted);margin-bottom:3px">'
    + '<span>' + name + '</span><span style="color:var(--text);font-weight:600">' + val + '%</span></div>'
    + '<div style="height:7px;border-radius:4px;background:var(--surface2);overflow:hidden">'
    + '<div style="height:100%;width:' + val + '%;background:' + color + ';border-radius:4px"></div></div></div>';
}

// Remplit la carte d'analyse dans l'overlay de fin de partie.
/* ── Heatmap de la partie ──────────────────────────────────────────────
   Compte, pour chaque case du plateau, combien de fois une bille du joueur
   (noir) ou de l'adversaire (blanc) l'a occupée AU DÉPART d'un coup, sur
   toute la partie. Rend un plateau SVG en losange où l'intensité de couleur
   traduit la fréquence : là où ça a le plus / le moins joué. 100% local,
   reconstruit à partir de boardSnapshots (aucune donnée supplémentaire à
   stocker). Idée d'Olivier (fin de partie + stats). */
function computeGameHeatmap(snapshots, forColor) {
  // forColor : 'black' (le joueur) ou 'white' (l'adversaire)
  // Chaque snapshot stocke color = la couleur qui a joué CE coup, et
  // moveInfo.cells = les cases occupées au départ du coup.
  const counts = {};   // "r,c" -> nombre d'occupations
  let maxCount = 0;
  if (!snapshots || !snapshots.length) return { counts, maxCount };
  for (const snap of snapshots) {
    if (!snap || snap.color !== forColor) continue;
    const mi = snap.moveInfo;
    if (!mi || !mi.cells) continue;
    for (const c of mi.cells) {
      const k = c.r + ',' + c.c;
      counts[k] = (counts[k] || 0) + 1;
      if (counts[k] > maxCount) maxCount = counts[k];
    }
  }
  return { counts, maxCount };
}

function buildGameHeatmapSVG(snapshots, forColor, size) {
  size = size || 260;
  const { counts, maxCount } = computeGameHeatmap(snapshots, forColor);
  // Géométrie losange : mêmes ROWS que le plateau réel, mais normalisée sur `size`
  const ROWS_LOCAL = (typeof ROWS !== 'undefined') ? ROWS : [5,6,7,8,9,8,7,6,5];
  const R = size / 22;                 // rayon d'une case
  const hSpacing = R * 2, vSpacing = R * 1.73;
  const cx = size / 2, cy = size / 2;
  const base = (forColor === 'black') ? [200,168,75] : [168,196,224];  // or / bleu
  let cells = '';
  for (let row = 0; row < ROWS_LOCAL.length; row++) {
    const rowLen = ROWS_LOCAL[row];
    for (let col = 0; col < rowLen; col++) {
      const x = cx + (col - (rowLen - 1) / 2) * hSpacing;
      const y = cy + (row - 4) * vSpacing;
      const k = row + ',' + col;
      const n = counts[k] || 0;
      const intensity = maxCount > 0 ? n / maxCount : 0;
      // Même échelle de fausses couleurs que la carte du profil, pour la cohérence
      const fill = (typeof heatColor === 'function')
        ? heatColor(n === 0 ? 0 : intensity)
        : ((typeof HEATMAP_EMPTY !== 'undefined') ? HEATMAP_EMPTY : '#0d0d14');
      /* La couleur seule ne suffisait pas : sur un ecran de telephone, deux
         paliers voisins se distinguent mal. Le RAYON porte donc la meme
         information — une case peu jouee est petite, une case chaude est
         pleine. Deux canaux valent mieux qu'un, et celui-ci reste lisible
         en niveaux de gris. */
      const rad = R * (n === 0 ? 0.62 : 0.72 + 0.28 * Math.pow(intensity, 0.6));
      cells += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + rad.toFixed(1) + '"'
        + ' fill="' + fill + '" stroke="rgba(255,255,255,0.10)" stroke-width="0.5"></circle>';
      if (n > 0 && maxCount >= 2) {
        /* Le compteur etait ecrit en sombre, ce qui allait tant qu'il ne
           s'affichait que sur les cases brulantes. Maintenant qu'il apparait
           des la premiere occupation, il doit rester lisible sur un fond
           sombre : on choisit l'encre selon la clarte reelle de la case. */
        const ink = _heatIsLight(fill) ? '#0d0f0e' : 'rgba(255,255,255,0.92)';
        cells += '<text x="' + x.toFixed(1) + '" y="' + (y+R*0.32).toFixed(1) + '" text-anchor="middle" font-size="'
          + (R*0.85).toFixed(1) + '" fill="' + ink + '" font-weight="700">' + n + '</text>';
      }
    }
  }
  return '<svg viewBox="0 0 ' + size + ' ' + size + '" width="100%" style="max-width:' + size + 'px" xmlns="http://www.w3.org/2000/svg">' + cells + '</svg>';
}

/* Affiche la heatmap de fin de partie, avec bascule Vous / Adversaire.
   Reconstruite depuis boardSnapshots — aucune donnée supplémentaire stockée. */
let _heatmapColor = null;
function renderHeatmapCard(){
  const host = document.getElementById('heatmap-card');
  if(!host) return;
  if(typeof boardSnapshots === 'undefined' || !boardSnapshots.length){ host.innerHTML=''; return; }
  /* Les onglets suivent humanColor. « Vous » designait auparavant les noirs
     en dur : des que le joueur tenait les blancs, les deux cartes etaient
     inversees. En mode 2 joueurs, aucun camp n'est « l'adversaire ». */
  const hc = (typeof humanColor !== 'undefined') ? humanColor : 'black';
  const opp = (hc === 'black') ? 'white' : 'black';
  const localGame = (typeof gameMode !== 'undefined' && gameMode === 'local');
  if (_heatmapColor !== 'black' && _heatmapColor !== 'white') _heatmapColor = localGame ? 'black' : hc;
  const forColor = _heatmapColor;
  const { maxCount } = computeGameHeatmap(boardSnapshots, forColor);
  const svg = buildGameHeatmapSVG(boardSnapshots, forColor, 240);
  const label = localGame
    ? (forColor === 'black' ? 'Le joueur noir' : 'Le joueur blanc')
    : (forColor === hc ? 'Joueur 1' : 'Joueur 2');
  const tabBtn = (c, txt) =>
    '<button onclick="_heatmapColor=\'' + c + '\';renderHeatmapCard()" style="'
    + 'padding:5px 12px;font-size:12px;font-weight:600;border-radius:7px;cursor:pointer;border:1px solid var(--border);'
    + (c === forColor ? 'background:var(--gold);color:#0d0f0e' : 'background:none;color:var(--muted)') + '">' + txt + '</button>';
  host.innerHTML =
    '<div style="margin-top:14px;width:min(320px,90vw);text-align:center;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px">'
    + '<div style="font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:var(--muted);margin-bottom:4px">🔥 Carte de chaleur</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:10px">Où ' + label + ' a le plus joué durant la partie</div>'
    + '<div style="display:flex;gap:8px;justify-content:center;margin-bottom:12px">' + (localGame ? tabBtn('black','Noir') + tabBtn('white','Blanc') : tabBtn(hc,'Joueur 1') + tabBtn(opp,'Joueur 2')) + '</div>'
    + (maxCount > 0 ? svg : '<div style="font-size:12px;color:var(--muted);padding:20px">Pas encore assez de coups joués</div>')
    + (maxCount > 0 ? '<div style="font-size:11px;color:var(--muted);margin-top:8px">Plus c\'est vif, plus la case a été occupée (max : ' + maxCount + '×)</div>' : '')
    + '</div>';
}

function renderStyleCard(){
  const host = document.getElementById('style-card');
  if(!host) return;
  if(!styleGame || styleGame.moves===0){ host.innerHTML=''; return; }
  const p = computeStyleProfile(styleGame);
  const which = styleBotColor();
  const isBlack = (which==='black');
  const svg = isBlack ? (typeof BOT_SVG_BLACK!=='undefined'?BOT_SVG_BLACK:'') : (typeof BOT_SVG_WHITE!=='undefined'?BOT_SVG_WHITE:'');
  const headDisc = isBlack ? '#1a1a20' : '#e8e8ee';
  const accent = isBlack ? '#c8a84b' : '#a8c4e0';
  host.innerHTML =
    '<div style="margin-top:18px;width:min(420px,90vw);text-align:left;background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px">'
    + '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
    + '<div style="width:42px;height:42px;flex-shrink:0;border-radius:50%;background:' + headDisc + ';display:flex;align-items:center;justify-content:center;padding:3px;box-sizing:border-box">' + svg + '</div>'
    + '<div><div style="font-size:11px;color:' + accent + ';font-weight:700;letter-spacing:0.5px">ANALYSE DE TA PARTIE</div>'
    + '<div style="font-size:16px;font-weight:700;color:var(--text)">' + p.label + '</div></div></div>'
    + styleBar('Centralité', p.centrality, '#c8a84b')
    + styleBar('Cohésion', p.cohesion, '#6fae6f')
    + styleBar('Agressivité', p.aggression, '#d9774a')
    + styleBar('Risque au bord', p.edgeRisk, '#c0556a')
    + styleBar('Précision', p.precision, '#7eccd8')
    + '<div style="font-size:10px;color:var(--muted);margin-top:10px;line-height:1.4">Mesuré sur ' + p.moves + ' de tes coups. Précision = part de tes coups jugés bons par le moteur (centre / cohésion / éjection).</div>'
    + '</div>';
}


/* ─── NOTATION ABA-PRO ─────────────────────────────
   Format: a1b2 (inline) ou c2c3d3 (broadside)
   Source: ABA-PRO.HLP — "Every location on the board is
   denoted by [a-i][1-9]. A move string has the form a1b2."
   Lettres = rangées horizontales (a=bas, i=haut)
   Chiffres = colonnes diagonales
─────────────────────────────────────────────────── */
const ABAPRO_ROWS = ['a','b','c','d','e','f','g','h','i'];

function coordToABAPRO(r, c) {
  // Notation officielle Abalone : lettres A-I (rangées, A en bas, I en haut),
  // chiffres 1-9 (diagonales nord-ouest/sud-est, alignées en bas-droite).
  // Interne : r=0 = haut (rangée I), r=8 = bas (rangée A).
  const letter = ABAPRO_ROWS[8 - r];
  // Les rangées au-dessus du milieu (r<4) sont décalées sur les diagonales :
  // leur première case ne commence pas à 1 mais à (1 + décalage).
  const offset = r < 4 ? (4 - r) : 0;
  const num = c + 1 + offset;
  return letter + num;
}

// Notation Aba-Pro d'un coup (conforme au standard officiel)
// sel = billes sélectionnées [{r,c}], dir = {q,r}, type = 'move'|'push'|'broadside'

// ── INVERSE de coordToABAPRO : "e5" → {r,c} ──
function abaproToRc(cell) {
  if (!cell || cell.length < 2) return null;
  const letter = cell[0].toLowerCase();
  const num = parseInt(cell.slice(1), 10);
  if (isNaN(num)) return null;
  const idx = ABAPRO_ROWS.indexOf(letter);   // position de la lettre dans a..i
  if (idx < 0) return null;
  const r = 8 - idx;                          // r interne (r=0 haut)
  const offset = r < 4 ? (4 - r) : 0;
  const c = num - 1 - offset;
  if (r < 0 || r > 8 || c < 0 || c >= ROWS[r]) return null;
  return { r: r, c: c };
}

