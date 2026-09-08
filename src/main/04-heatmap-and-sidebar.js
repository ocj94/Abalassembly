/* ═══════════════════════════════════════════
   HEATMAP DES COUPS — carte de chaleur du plateau
   Montre les cases où le joueur a le plus joué (du froid au chaud).
═══════════════════════════════════════════ */
/* Échelle de fausses couleurs de la carte de chaleur (façon éditeur de
   fausses couleurs) : du noir — là où le joueur joue le MOINS — au blanc,
   là où il joue le PLUS, en passant par bleu, violet, rose, orange et jaune.
   Choix d'Olivier (palette fournie en référence). */
/* Echelle de reference a 8 paliers : noir bleute, bleu, violet, rose,
   orange, dore, jaune, blanc — du moins joue au plus joue. Les couleurs
   intermediaires sont INTERPOLEES par heatColor(), ce qui donne une
   centaine de nuances continues a l'ecran : les 8 valeurs ci-dessous sont
   des points d'ancrage, pas les seules couleurs affichees.
   Choix d'Olivier, revenu a cette palette apres essai d'une version a 15
   paliers jugee trop chargee. Note : la luminance monte regulierement sauf
   entre le violet et le rose, ou elle redescend legerement (0,263 -> 0,245).
   Ecart assez faible pour rester lisible ; eclaircir le rose le corrigerait. */
/* Luminance relative de chaque palier, mesuree : 0.012, 0.117, 0.263, 0.365,
   0.440, 0.594, 0.762, 1.000 — strictement croissante. Le rose valait
   auparavant #e8536f (0.245) et REDESCENDAIT sous le violet : deux intensites
   differentes pouvaient paraitre de meme clarte, et l'ordre se lisait mal en
   niveaux de gris ou pour un oeil daltonien. #f47f92 corrige ce creux. */
const HEATMAP_SCALE = ['#1b1b2f','#3b5bb5','#9b7fc7','#f47f92','#f0a03c','#f5c518','#e9e94f','#ffffff'];
const HEATMAP_EMPTY = '#0d0d14';   // case jamais jouée

/* Couleur continue de la carte de chaleur.
   Au lieu de coller la valeur sur l'un des 8 paliers (ce qui donnait des sauts
   de couleur bien visibles), on interpole entre les deux paliers voisins : la
   palette devient un degrade continu, donc beaucoup plus nuance.
   Un leger adoucissement (gamma 0.6) etale le bas de l'echelle, sinon les
   cases peu jouees se retrouvaient toutes dans le meme bleu sombre des qu'une
   seule case dominait le maximum. Demande d'Olivier : « plus de nuance ». */
function _heatHexToRgb(hex) {
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
/* Clarte percue d'une couleur, pour choisir une encre lisible par-dessus.
   Formule de luminance relative WCAG, la meme qui a servi a verifier que
   l'echelle monte bien du sombre au clair sans redescendre. */
function _heatIsLight(css) {
  const m = /rgb\((\d+),\s*(\d+),\s*(\d+)\)/.exec(css);
  const rgb = m ? [+m[1], +m[2], +m[3]]
                : (css.charAt(0) === '#' ? _heatHexToRgb(css) : [0,0,0]);
  const lin = rgb.map(function(v){
    v /= 255; return v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4);
  });
  return (0.2126*lin[0] + 0.7152*lin[1] + 0.0722*lin[2]) > 0.42;
}

function heatColor(intensity) {
  if (!(intensity > 0)) return HEATMAP_EMPTY;
  const t = Math.max(0, Math.min(1, intensity));
  const g = Math.pow(t, 0.6);
  const pos = g * (HEATMAP_SCALE.length - 1);
  const i = Math.max(0, Math.min(HEATMAP_SCALE.length - 2, Math.floor(pos)));
  const f = pos - i;
  const a = _heatHexToRgb(HEATMAP_SCALE[i]);
  const b = _heatHexToRgb(HEATMAP_SCALE[i + 1]);
  const mix = [0,1,2].map(function(k){ return Math.round(a[k] + (b[k] - a[k]) * f); });
  return 'rgb(' + mix[0] + ',' + mix[1] + ',' + mix[2] + ')';
}

/* Legende de la carte de chaleur.
   Elle portait deux mots — « joue le moins », « joue le plus » — sans dire
   combien. On y ajoute donc les valeurs reelles et la distribution : sous le
   degrade, une barre par palier montre COMBIEN de cases tombent dedans. Une
   carte ou trente cases sont tiedes et une seule brulante ne se lit pas comme
   une carte ou l'intensite est repartie, et le degrade seul ne le disait pas.
   `counts` est optionnel : sans lui, la legende reste qualitative. */
function heatmapLegend(counts) {
  const stops = HEATMAP_SCALE.map(function(c, i){
    return c + ' ' + Math.round((i / (HEATMAP_SCALE.length - 1)) * 100) + '%';
  }).join(',');
  const bar = 'background:linear-gradient(90deg,' + HEATMAP_EMPTY + ' 0%,' + stops + ')';
  let out = '<div style="margin-top:8px">'
    + '<div style="height:10px;border-radius:5px;border:1px solid var(--border);' + bar + '"></div>';

  const vals = counts ? Object.keys(counts).map(function(k){ return counts[k]; }).filter(function(v){ return v > 0; }) : [];
  if (vals.length) {
    const max = Math.max.apply(null, vals);
    const played = vals.length;
    /* Repartition sur les memes 8 paliers que la palette, avec le meme
       adoucissement gamma : ce que montre l'histogramme correspond exactement
       a ce que montre la carte. */
    const NB = HEATMAP_SCALE.length;
    const bins = new Array(NB).fill(0);
    vals.forEach(function(v){
      const g = Math.pow(v / max, 0.6);
      bins[Math.min(NB - 1, Math.floor(g * (NB - 1) + 0.5))]++;
    });
    const peak = Math.max.apply(null, bins) || 1;
    out += '<div style="display:flex;align-items:flex-end;gap:1px;height:22px;margin-top:4px">';
    for (let i = 0; i < NB; i++) {
      const h = bins[i] ? Math.max(2, Math.round((bins[i] / peak) * 22)) : 1;
      out += '<div title="' + bins[i] + ' case(s)" style="flex:1;height:' + h + 'px;border-radius:1px;'
           + 'background:' + (bins[i] ? HEATMAP_SCALE[i] : 'var(--border)') + '"></div>';
    }
    out += '</div>';
    out += '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:4px">'
      + '<span>1 fois</span>'
      + '<span style="color:var(--text)">' + played + ' cases jouees</span>'
      + '<span>' + max + ' fois</span></div>';
  } else {
    out += '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:3px">'
      + '<span>joue le moins</span><span>joue le plus</span></div>';
  }
  return out + '</div>';
}

// Construit le SVG d'une heatmap pour un ensemble de données de cases
function buildHeatmapSVG(heat) {
  let maxCount = 0;
  for (const k in heat) if (heat[k] > maxCount) maxCount = heat[k];
  const SIZE = 280;
  const scale = SIZE / 640;
  const cellR = HEX_RADIUS * scale * 0.92;
  let cells = '';
  for (let r=0;r<9;r++) {
    for (let c=0;c<ROWS[r];c++) {
      const p = hexCoord(r, c, true);   // true : ignore la rotation du plateau, carte de chaleur toujours fixe
      const x = p.x * scale, y = p.y * scale;
      const count = heat[r+','+c] || 0;
      const intensity = maxCount > 0 ? count / maxCount : 0;
      // Fausses couleurs continues : noir = joue le moins, blanc = joue le plus
      const fill = heatColor(count === 0 ? 0 : intensity);
      cells += '<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="'+cellR.toFixed(1)+'" fill="'+fill+'" stroke="rgba(255,255,255,0.10)" stroke-width="1"/>';
      if (count > 0) {
        // texte lisible quel que soit le fond : sombre sur les cases claires
        const darkText = intensity >= 0.45;
        cells += '<text x="'+x.toFixed(1)+'" y="'+(y+3).toFixed(1)+'" text-anchor="middle" font-size="9" fill="'+(darkText?'rgba(0,0,0,0.75)':'rgba(255,255,255,0.85)')+'" font-weight="700">'+count+'</text>';
      }
    }
  }
  return '<svg viewBox="0 0 '+SIZE+' '+SIZE+'" width="'+SIZE+'" height="'+SIZE+'" xmlns="http://www.w3.org/2000/svg">'+cells+'</svg>';
}

// Calcule l'insight (centre vs bord) pour un jeu de données
function heatmapInsight(heat) {
  const total = Object.values(heat).reduce(function(a,b){ return a+b; }, 0);
  if (total === 0) return null;
  let centerPlays = 0;
  for (const k in heat) {
    const parts = k.split(','); const r=+parts[0], c=+parts[1];
    const ax = rcToAxial(r,c);
    const dist = (Math.abs(ax.q) + Math.abs(ax.q+ax.r) + Math.abs(ax.r)) / 2;
    if (dist < 3) centerPlays += heat[k];
  }
  const centerPct = Math.round(centerPlays/total*100);
  return { total: total, centerPct: centerPct, edgePct: 100 - centerPct };
}

// Rend une carte (titre + svg + insight) pour un joueur
function renderOneHeatmapCard(title, subtitle, heat, isYou) {
  const ins = heatmapInsight(heat);
  if (!ins) {
    return '<div style="flex:1;min-width:260px">'+
      '<div style="font-size:13px;font-weight:700;color:var(--white);margin-bottom:8px">'+title+'</div>'+
      '<div style="padding:24px;text-align:center;color:var(--muted);font-size:12px;background:var(--surface2);border:1px solid var(--border);border-radius:12px">Aucun coup enregistré pour l\'instant.</div>'+
      '</div>';
  }
  let insightTxt;
  const who = isYou ? 'Tu joues' : 'Joue';
  if (ins.centerPct >= 60) insightTxt = who + ' surtout au <strong style="color:var(--gold)">centre</strong> ('+ins.centerPct+'%) 👍';
  else if (ins.edgePct >= 60) insightTxt = who + ' beaucoup sur les <strong style="color:#e0a030">bords</strong> ('+ins.edgePct+'%) ⚠️';
  else insightTxt = 'Jeu équilibré : centre '+ins.centerPct+'% / bords '+ins.edgePct+'%';
  return '<div style="flex:1;min-width:260px">'+
    '<div style="font-size:13px;font-weight:700;color:var(--white);margin-bottom:2px">'+title+'</div>'+
    '<div style="font-size:11px;color:var(--muted);margin-bottom:8px">'+subtitle+'</div>'+
    '<div style="display:flex;justify-content:center;background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px">'+buildHeatmapSVG(heat)+'</div>'+
    '<div style="margin-top:10px;padding:10px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;font-size:12px;color:var(--text);line-height:1.5">'+insightTxt+'<br><span style="font-size:11px;color:var(--muted)">'+ins.total+' coups enregistrés</span></div>'+
    '</div>';
}

/* ── Import d'un historique de parties ────────────────────────────────
   Permet d'alimenter la carte de chaleur et le profil avec des parties
   jouees ailleurs. Accepte les formats que le site sait deja lire :
   l'export d'Abalassembly (« 1.a1b2 c3d4 2.… », avec ou sans en-tetes
   [Abalassembly] / [Score]) et la notation brute Aba-Pro ou Nacre.

   Les jetons sont resolus CONTRE LE VRAI MOTEUR : pour chaque coup on
   genere les coups legaux de la position courante et on retient celui dont
   la notation correspond. Un jeton qui ne correspond a aucun coup legal est
   signale au lieu d'etre devine — mieux vaut un import partiel et honnete
   qu'un historique invente.

   L'etat de la partie en cours est sauvegarde puis restaure : importer ne
   perturbe jamais une partie ouverte. Demande d'Olivier. */
function _importExtractTokens(text) {
  return String(text || '')
    .split('\n')
    .filter(function(l){ return !/^\s*\[/.test(l); })   // ignore les en-tetes [..]
    .join(' ')
    .replace(/\d+\s*\./g, ' ')                          // retire les numeros de coup
    .split(/[\s,;]+/)
    .map(function(t){ return t.replace(/[^a-i0-9]/gi, '').toLowerCase(); })
    // 2 paires = coup en ligne (« c4d4 »), 3 paires = coup lateral, qui note
    // aussi la fin du groupe (« g5g7f4 »). Les deux formes sont valides.
    .filter(function(t){ return /^([a-i][1-9]){2,3}$/.test(t); });
}

function _importCandidates(tok, color) {
  var out = [], moves;
  try { moves = getAllMovesForColor(color); } catch(e) { return out; }
  if (!moves) return out;
  for (var i = 0; i < moves.length; i++) {
    try { if (moveToABAPRO(moves[i].cells, moves[i].dir, moves[i].type) === tok) out.push(moves[i]); } catch(e){}
  }
  if (!out.length) {
    for (var j = 0; j < moves.length; j++) {
      try { if (moveToNACRE(moves[j].cells, moves[j].dir, moves[j].type) === tok) out.push(moves[j]); } catch(e){}
    }
  }
  return out;
}

function importHistoryFromText(text, myColor, variant) {
  var tokens = _importExtractTokens(text);
  if (!tokens.length) return { ok:false, reason:'aucun coup reconnu', moves:0, mine:0, total:0, failedAt:-1 };

  var saved = {
    board: JSON.parse(JSON.stringify(board)),
    cb: capturedByBlack, cw: capturedByWhite,
    layout: (typeof currentLayout !== 'undefined') ? currentLayout : 'standard'
  };
  var best = { path: [], depth: 0 };
  var budget = 20000;   // garde-fou : jamais d'explosion combinatoire

  /* La notation Aba-Pro est ambigue : un meme jeton peut correspondre a
     plusieurs coups legaux differents. Choisir au hasard fait diverger la
     position et casse l'import quelques coups plus loin, silencieusement.
     On explore donc les possibilites avec retour arriere, en gardant la plus
     longue sequence coherente trouvee. */
  function explore(i, turn, path) {
    if (path.length > best.depth) { best = { path: path.slice(), depth: path.length }; }
    if (i >= tokens.length || budget <= 0) return i >= tokens.length;
    var cands = _importCandidates(tokens[i], turn);
    var other = (turn === 'black') ? 'white' : 'black';
    for (var c = 0; c < cands.length; c++) {
      if (budget-- <= 0) return false;
      var undo = applyMove(cands[c], turn);
      path.push({ color: turn, cells: cands[c].cells });
      if (explore(i + 1, other, path)) return true;
      path.pop();
      undoMove(undo);
    }
    return false;
  }

  try {
    if (typeof currentLayout !== 'undefined' && HEAT_VARIANTS.indexOf(variant) >= 0) currentLayout = variant;
    initBoardState();
    capturedByBlack = 0; capturedByWhite = 0;
    explore(0, 'black', []);
  } catch(e) {
    // on ne laisse jamais l'import casser l'etat
  } finally {
    board = saved.board; capturedByBlack = saved.cb; capturedByWhite = saved.cw;
    if (typeof currentLayout !== 'undefined') currentLayout = saved.layout;
  }

  // enregistrement une fois l'etat restaure, uniquement pour mes coups
  var mine = 0;
  for (var k = 0; k < best.path.length; k++) {
    if (best.path[k].color !== myColor) continue;
    recordHeatmapForPlayer('me_' + myColor, best.path[k].cells);
    if (HEAT_VARIANTS.indexOf(variant) >= 0) recordHeatmapForPlayer('me_' + myColor + '@' + variant, best.path[k].cells);
    mine++;
  }
  return {
    ok: best.path.length > 0,
    moves: best.path.length,
    mine: mine,
    total: tokens.length,
    failedAt: best.path.length < tokens.length ? best.path.length : -1
  };
}

function runHistoryImport() {
  var ta = document.getElementById('import-history-text');
  var col = document.getElementById('import-history-color');
  var vr = document.getElementById('import-history-variant');
  if (!ta) return;
  var res = importHistoryFromText(ta.value, col ? col.value : 'black', vr ? vr.value : 'standard');
  if (!res.ok) { showToast('\u26a0\ufe0f Aucun coup reconnu \u2014 verifie le format'); return; }
  var msg = '\u2705 ' + res.mine + ' de tes coups importes (' + res.moves + '/' + res.total + ' coups lus)';
  if (res.failedAt >= 0) msg += ' \u2014 arret au coup ' + (res.failedAt + 1) + ', non reconnu';
  showToast(msg);
  ta.value = '';
  if (typeof renderHeatmap === 'function') renderHeatmap();
}

function renderImportCard() {
  var host = document.getElementById('import-history-host');
  if (!host) return;
  var opts = HEAT_VARIANTS.map(function(v){
    return '<option value="' + v + '">' + (HEAT_VARIANT_LABEL[v] || v) + '</option>';
  }).join('');
  host.innerHTML =
    '<details style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:14px">'
    + '<summary style="cursor:pointer;font-size:12px;font-weight:700;color:var(--gold)">\ud83d\udce5 Importer des parties jouees ailleurs</summary>'
    + '<div style="font-size:11px;color:var(--muted);line-height:1.5;margin:10px 0">Colle ici une partie au format Abalassembly (« 1.a1b2 c3d4 \u2026 ») ou une suite de coups en notation Aba-Pro ou Nacre. Les coups sont verifies un a un contre le moteur : ceux qui ne correspondent a aucun coup legal sont signales, jamais devines. \u00c0 noter : la notation Aba-Pro est ambigu\u00eb \u2014 un m\u00eame code peut d\u00e9signer plusieurs coups l\u00e9gaux. La partie est donc reconstitu\u00e9e de fa\u00e7on coh\u00e9rente avec la notation, sans garantie qu\'il s\'agisse exactement de la s\u00e9quence d\'origine.</div>'
    + '<textarea id="import-history-text" placeholder="1.a1b2 c3d4 2.e5f6 g7h8 \u2026" style="width:100%;height:90px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:\'DM Mono\',monospace;font-size:12px;resize:vertical"></textarea>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px">'
    + '<label style="font-size:11px;color:var(--muted)">Je jouais&nbsp;'
    + '<select id="import-history-color" style="background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:4px 8px;font-size:11px"><option value="black">les noirs</option><option value="white">les blancs</option></select></label>'
    + '<label style="font-size:11px;color:var(--muted)">Variante&nbsp;'
    + '<select id="import-history-variant" style="background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:4px 8px;font-size:11px">' + opts + '</select></label>'
    + '<button onclick="runHistoryImport()" style="padding:6px 14px;background:var(--gold);color:#0d0f0e;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer">Importer</button>'
    + '</div></details>';
}

let _heatVariant = 'all';
function renderHeatmap() {
  const host = document.getElementById('heatmap-host');
  if (!host) return;

  // Migration douce : si d'anciennes données existent mais pas la nouvelle structure, on les copie
  if (progress) {
    if (!progress.heatmaps) progress.heatmaps = {};
    if (progress.heatmap && !progress.heatmaps['me']) progress.heatmaps['me'] = Object.assign({}, progress.heatmap);
    if (progress.heatmapWhite && !progress.heatmaps['opponent']) progress.heatmaps['opponent'] = Object.assign({}, progress.heatmapWhite);
  }

  // Profil PERSONNEL : les deux cartes montrent le jeu du joueur, selon la
  // couleur qu'il tenait — jamais celui de l'adversaire.
  // Reprise douce de l'historique : l'ancienne carte 'me' correspondait aux
  // coups noirs du joueur, on l'utilise comme base de « mes noires ».
  if (!progress.heatmaps['me_black'] || !Object.keys(progress.heatmaps['me_black']).length) {
    const legacy = progress.heatmaps[localPlayerId()];
    if (legacy && Object.keys(legacy).length) progress.heatmaps['me_black'] = Object.assign({}, legacy);
  }

  // Filtre de variante : cumul global, ou une position de depart precise
  const vSel = (typeof _heatVariant !== 'undefined') ? _heatVariant : 'all';
  const suffix = (vSel === 'all') ? '' : ('@' + vSel);
  const scopeLabel = (vSel === 'all') ? 'toutes variantes confondues'
                                      : ('variante ' + (HEAT_VARIANT_LABEL[vSel] || vSel));

  const blackHeat = getPlayerHeatmap('me_black' + suffix);
  const whiteHeat = getPlayerHeatmap('me_white' + suffix);
  const blackTotal = Object.values(blackHeat).reduce(function(a,b){ return a+b; }, 0);
  const whiteTotal = Object.values(whiteHeat).reduce(function(a,b){ return a+b; }, 0);

  // Onglets de variante : on n'affiche que celles reellement jouees, plus « Toutes »
  const played = HEAT_VARIANTS.filter(function(v){
    const b = progress.heatmaps['me_black@' + v], w = progress.heatmaps['me_white@' + v];
    return (b && Object.keys(b).length) || (w && Object.keys(w).length);
  });
  const tabs = ['all'].concat(played).map(function(v){
    const on = (v === vSel);
    return '<button onclick="_heatVariant=\'' + v + '\';renderHeatmap()" style="'
      + 'padding:4px 11px;font-size:11px;font-weight:600;border-radius:7px;cursor:pointer;border:1px solid var(--border);'
      + (on ? 'background:var(--gold);color:#0d0f0e' : 'background:none;color:var(--muted)') + '">'
      + (v === 'all' ? 'Toutes' : (HEAT_VARIANT_LABEL[v] || v)) + '</button>';
  }).join('');
  const tabsHtml = (played.length > 0)
    ? '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">' + tabs + '</div>' : '';

  if (blackTotal === 0 && whiteTotal === 0) {
    host.innerHTML = tabsHtml + '<div id="import-history-host" style="margin-bottom:14px"></div>'
      + '<div style="padding:30px;text-align:center;color:var(--muted);font-size:13px;background:var(--surface2);border:1px solid var(--border);border-radius:12px">🔥 '
      + (vSel === 'all' ? 'Joue quelques parties pour voir tes cartes de chaleur appara\u00eetre ici.'
                        : 'Aucune partie enregistr\u00e9e sur cette variante pour le moment.') + '</div>';
    if (typeof renderImportCard === 'function') renderImportCard();
    return;
  }

  /* "Joueur 1"/"Joueur 2" plutot que "noires"/"blanches", avec une pastille
     de couleur reelle (pas ⚫/⚪ figes) — meme raisonnement et memes
     fonctions que les bandeaux joueur (_skinDotColor/_dot) : le skin des
     billes va changer, un rond noir fixe ne representerait plus la vraie
     couleur jouee des qu'un skin colore est actif. Signale par Olivier. */
  const blackCard = renderOneHeatmapCard(_dot(_skinDotColor('black')) + ' Mes billes en tant que joueur 1', 'Cumul de tes parties en tant que joueur 1 \u00b7 ' + scopeLabel, blackHeat, true);
  const whiteCard = renderOneHeatmapCard(_dot(_skinDotColor('white')) + ' Mes billes en tant que joueur 2', 'Cumul de tes parties en tant que joueur 2 \u00b7 ' + scopeLabel, whiteHeat, true);

  host.innerHTML = tabsHtml +
    '<div id="import-history-host" style="margin-bottom:14px"></div>'+
    '<div style="display:flex;gap:16px;flex-wrap:wrap">'+blackCard+whiteCard+'</div>'+
    heatmapLegend(Object.assign({}, blackHeat, whiteHeat))+
    '<div style="margin-top:12px;padding:10px 14px;background:rgba(200,168,75,0.06);border:1px solid rgba(200,168,75,0.2);border-radius:8px;font-size:11px;color:var(--muted);line-height:1.5">ℹ️ Ces deux cartes montrent <strong>ton</strong> jeu, selon la couleur que tu tenais. La carte « blanches » se remplit quand tu joues les blancs (ou en mode 2 joueurs sur le même écran).</div>';
  if (typeof renderImportCard === 'function') renderImportCard();
}

function syncRadarToggle() {
  const t = document.getElementById('radar-toggle');
  if (t) {
    t.checked = progress.showRadar !== false;
    if (t.nextElementSibling) t.nextElementSibling.style.background = t.checked ? 'var(--gold)' : 'var(--border)';
  }
}

function renderProfileProgression() {
  const host = document.getElementById('profile-progression');
  if (!host) return;
  const xpp = xpProgressInLevel(progress.xp);

  // Badges
  /* Aucun emoji « machine à laver » n'existe en Unicode : pour le badge
     Blanchissage, on dessine donc une vraie machine à laver en SVG. Le champ
     b.icon (emoji) reste utilisé pour les notifications, qui sont en texte brut. */
  const BADGE_SVG = {
    shutout: '<svg viewBox="0 0 32 32" width="28" height="28" aria-label="Machine à laver" role="img">'
      + '<rect x="4" y="3" width="24" height="26" rx="3" fill="#d8d8e0" stroke="#8a8a99" stroke-width="1.5"/>'
      + '<rect x="4" y="3" width="24" height="6" rx="3" fill="#b9b9c6"/>'
      + '<circle cx="9" cy="6" r="1.1" fill="#6c6c7a"/><circle cx="12.5" cy="6" r="1.1" fill="#6c6c7a"/>'
      + '<rect x="21" y="4.6" width="5" height="2.8" rx="1.2" fill="#6c6c7a"/>'
      + '<circle cx="16" cy="19" r="8" fill="#9aa7b8" stroke="#6c6c7a" stroke-width="1.2"/>'
      + '<circle cx="16" cy="19" r="6" fill="#e8f2ff"/>'
      + '<path d="M10 20.5c1.6-1.6 3.1 1.2 4.7-.4s3.1 1.2 4.7-.4" fill="none" stroke="#7fb4e8" stroke-width="1.5" stroke-linecap="round"/>'
      + '<circle cx="13" cy="16" r="1.1" fill="#ffffff"/><circle cx="19" cy="17" r="0.8" fill="#ffffff"/>'
      + '</svg>'
  };

  let badgesHtml = '';
  BADGES.forEach(function(b){
    const got = !!progress.badges[b.id];
    badgesHtml +=
      '<div title="'+b.desc+'" style="display:flex;flex-direction:column;align-items:center;gap:6px;padding:14px 10px;border-radius:12px;text-align:center;'+
        (got ? 'background:linear-gradient(135deg,rgba(200,168,75,0.12),rgba(200,168,75,0.04));border:1px solid rgba(200,168,75,0.3)' : 'background:var(--surface2);border:1px solid var(--border);opacity:0.45;filter:grayscale(1)')+'">'+
        '<div style="font-size:28px;line-height:1;display:flex;align-items:center;justify-content:center;height:28px">'+(BADGE_SVG[b.id]||b.icon)+'</div>'+
        '<div style="font-size:11px;font-weight:700;color:'+(got?'var(--gold)':'var(--muted)')+'">'+b.name+'</div>'+
        '<div style="font-size:9px;color:var(--muted);line-height:1.3">'+b.desc+'</div>'+
      '</div>';
  });
  const gotCount = Object.keys(progress.badges).length;

  host.innerHTML =
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:16px">'+

    // Niveau + XP
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
        '<div style="font-size:13px;font-weight:700;color:var(--white)">🎖️ Niveau '+progress.level+'</div>'+
        '<div style="font-size:12px;color:var(--muted)">'+progress.xp+' XP total</div>'+
      '</div>'+
      '<div style="height:10px;background:var(--surface2);border-radius:5px;overflow:hidden;margin-bottom:6px">'+
        '<div style="height:100%;width:'+xpp.pct+'%;background:linear-gradient(90deg,var(--gold),#e8dcb4);border-radius:5px;transition:width .6s"></div>'+
      '</div>'+
      '<div style="font-size:11px;color:var(--muted)">'+xpp.cur+' / '+xpp.need+' XP vers niveau '+(progress.level+1)+'</div>'+
    '</div>'+

    // Courbe ELO
    '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">'+
        '<div style="font-size:13px;font-weight:700;color:var(--white)">📈 Progression ELO</div>'+
        '<div style="font-size:18px;font-weight:800;color:var(--gold);font-family:\'DM Mono\',monospace">'+progress.elo+'</div>'+
      '</div>'+
      sparkline(progress.eloHistory, 240, 50, 'var(--gold)')+
    '</div>'+

  '</div>'+

  // Badges
  '<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:20px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">'+
      '<div style="font-size:13px;font-weight:700;color:var(--white)">🏅 Badges <span style="color:var(--muted);font-weight:400">'+gotCount+' / '+BADGES.length+'</span></div>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(100px,1fr));gap:10px">'+badgesHtml+'</div>'+
  '</div>';
}





/* ─── DIFFICULTY ─── */
function setDifficulty(level, btn) {
  aiDifficulty = level;
  ['diff-easy','diff-medium','diff-hard','diff-minimax'].forEach(function(id){
    var b = document.getElementById(id); if (b) b.classList.remove('active');
  });
  btn.classList.add('active');
  const labels = {
    easy:    '🎲 Facile — coups aléatoires',
    medium:  '🧠 Moyen — Alpha-Bêta profondeur 2',
    hard:    '💪 Expert — Alpha-Bêta profondeur 4',
    minimax: '♟ α-β — profondeur 8, sans limite de temps (peut prendre plusieurs minutes par coup)'
  };
  showToast('🤖 IA : ' + (labels[level]||level));
}

/* ─── MODE DE JEU ─── */
function setGameMode(mode, btn) {
  GameMode.set(mode);
  // Mode classique : l'humain joue les noirs, pas de bot conseiller ni de duel.
  humanColor = 'black';
  if (typeof applyPovOrientation === 'function') applyPovOrientation();
  opponentBot = null;
  advisorEnabled = false;
  botDuelMode = false;
  if (typeof showDuelStopBtn === 'function') showDuelStopBtn(false);
  ['mode-ai','mode-local'].forEach(function(id){
    var b = document.getElementById(id); if (b) b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
  // Masque le choix de difficulté en mode 2 joueurs
  const diffRow = document.getElementById('difficulty-row');
  if (diffRow) diffRow.style.display = (mode === 'local') ? 'none' : 'flex';
  showToast(mode === 'local' ? '👥 Mode 2 joueurs (même écran)' : '🤖 Mode contre l\u2019ordinateur');
  resetGame();
}

/* ─── TOURNAMENT ─── */
const tournamentData = {
  rounds: []  // Aucun match — le tournoi se remplira avec de vrais participants
};

function renderTournament() {
  renderTournamentState();
  const bracket = document.getElementById('bracket-display');
  if (!bracket || bracket.children.length > 0) return;

  if (!tournamentData.rounds.length) {
    bracket.innerHTML = '<div style="padding:50px 20px;text-align:center;color:var(--muted)">'
      + '<div style="font-size:40px;margin-bottom:12px">🏆</div>'
      + '<div style="font-size:15px;font-weight:600;color:var(--text);margin-bottom:6px">Aucun match pour l\'instant</div>'
      + '<div style="font-size:13px">Le bracket s\'affichera une fois les inscriptions closes et le tournoi démarré.</div>'
      + '</div>';
    const sched0 = document.getElementById('tournament-schedule');
    if (sched0) sched0.innerHTML = '<div style="padding:30px;text-align:center;color:var(--muted);font-size:13px">Aucune rencontre programmée pour le moment.</div>';
    return;
  }

  let html = "";
  tournamentData.rounds.forEach(function(round) {
    html += '<div class="bracket-round">';
    html += '<div class="bracket-round-title">' + round.name + '</div>';
    round.matches.forEach(function(m) {
      const liveStyle = m.live ? "border-color:rgba(200,168,75,0.5);box-shadow:0 0 12px rgba(200,168,75,0.1)" : "";
      const liveBadge = m.live ? '<div style="font-size:10px;padding:4px 12px;background:rgba(200,168,75,0.1);color:var(--gold);font-weight:700;text-align:center;border-bottom:1px solid var(--border)">&#9679; EN DIRECT</div>' : "";
      const w1 = m.done && m.s1 > m.s2 ? "winner" : "";
      const w2 = m.done && m.s2 > m.s1 ? "winner" : "";
      html += '<div class="bracket-match" style="' + liveStyle + '">' + liveBadge;
      html += '<div class="bracket-player ' + w1 + '">'
           + '<span class="bp-seed">' + (m.p1.seed||"") + '</span>'
           + '<span style="margin-right:4px">' + m.p1.country + '</span>'
           + '<span class="bp-name">' + escapeHtml(m.p1.name) + '</span>'
           + '<span class="bp-score">' + (m.s1!==null?m.s1:"") + '</span></div>';
      html += '<div class="bracket-player ' + w2 + '">'
           + '<span class="bp-seed">' + (m.p2.seed||"") + '</span>'
           + '<span style="margin-right:4px">' + m.p2.country + '</span>'
           + '<span class="bp-name">' + escapeHtml(m.p2.name) + '</span>'
           + '<span class="bp-score">' + (m.s2!==null?m.s2:"") + '</span></div>';
      html += "</div>";
    });
    html += "</div>";
  });
  bracket.innerHTML = html;
}


let trombiFilter = 'all';
let trombiSearch = '';
let trombiData = [];

function renderTrombi() { applyTrombiFilter(); }

function filterTrombiCat(cat, btn) {
  trombiFilter = cat;
  document.querySelectorAll('#trombi-filters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyTrombiFilter();
}

function filterTrombi() {
  trombiSearch = (document.getElementById('trombi-search')?.value || '').toLowerCase();
  applyTrombiFilter();
}

function applyTrombiFilter() {
  const grid = document.getElementById('trombi-grid');
  if (!grid) return;
  const filtered = trombiData.filter(p => {
    const matchCat = trombiFilter === 'all' || p.cat === trombiFilter;
    const matchSearch = !trombiSearch || p.name.toLowerCase().includes(trombiSearch) || p.handle.toLowerCase().includes(trombiSearch);
    return matchCat && matchSearch;
  });
  if (!filtered.length) { grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:48px;color:var(--muted)">Aucun joueur trouvé</div>'; return; }
  grid.innerHTML = filtered.map((p,i) => `
    <div class="trombi-card" onclick="showTrombiModal(${trombiData.indexOf(p)})">
      <div class="trombi-avatar" style="background:${p.color}">${escapeHtml(p.name[0].toUpperCase())}</div>
      <div class="trombi-name">${escapeHtml(p.name)}</div>
      <div class="trombi-handle">@${escapeHtml(p.handle)} ${escapeHtml(p.country)}</div>
      <div class="trombi-elo">ELO ${escapeHtml(String(p.elo))}</div>
      <div class="trombi-role" style="background:${p.roleBg};color:${p.roleColor};border:1px solid ${p.roleColor}40">${escapeHtml(p.role)}</div>
    </div>`).join('');
}

function showTrombiModal(idx) {
  const p = trombiData[idx];
  let overlay = document.getElementById('trombi-modal');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'trombi-modal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:3000;background:rgba(0,0,0,0.75);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
    overlay.addEventListener('click', e => { if(e.target===overlay) overlay.style.display='none'; });
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:36px;width:440px;max-width:94vw;position:relative;animation:slideUp 0.3s ease">
      <button onclick="document.getElementById('trombi-modal').style.display='none'" style="position:absolute;top:14px;right:16px;background:none;border:none;font-size:22px;color:var(--muted);cursor:pointer">x</button>
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:22px">
        <div style="width:68px;height:68px;border-radius:50%;background:${p.color};display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:900;font-family:'Playfair Display',serif;color:var(--gold);border:2px solid rgba(200,168,75,0.3);flex-shrink:0">${escapeHtml(p.name[0].toUpperCase())}</div>
        <div>
          <div style="font-family:'Playfair Display',serif;font-size:20px;font-weight:900;color:var(--white)">${escapeHtml(p.name)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:3px">@${escapeHtml(p.handle)} ${escapeHtml(p.country)}</div>
          <span class="trombi-role" style="background:${p.roleBg};color:${p.roleColor};border:1px solid ${p.roleColor}40;margin-top:6px">${escapeHtml(p.role)}</span>
        </div>
      </div>
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px 16px;font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:16px">${escapeHtml(p.bio)}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;text-align:center">
          <div style="font-family:'DM Mono',monospace;font-size:22px;font-weight:700;color:var(--gold)">${p.elo}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px;text-transform:uppercase;letter-spacing:1px">ELO</div>
        </div>
        <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:14px;text-align:center">
          <div style="font-size:28px">${p.country}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px;text-transform:uppercase;letter-spacing:1px">Pays</div>
        </div>
      </div>
      <button onclick="document.getElementById('trombi-modal').style.display='none';showToast('Invitation!')" style="width:100%;padding:12px;background:var(--gold);border:none;border-radius:8px;color:#0d0f0e;font-size:14px;font-weight:700;cursor:pointer;font-family:'DM Sans',sans-serif">Defier ce joueur</button>
    </div>`;
  overlay.style.display = 'flex';
}


/* ═══════════════════════════════════════════
   LEARN SIDEBAR
═══════════════════════════════════════════ */
function showLearnSection(id, el) {
  document.querySelectorAll('.learn-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
  document.getElementById('learn-'+id).classList.add('active');
  el.classList.add('active');
}

/* ═══════════════════════════════════════════
   PERMISSIONS SYSTEM
═══════════════════════════════════════════ */

// Permission state storage
const PERM_KEY = 'abalone_permissions';
let permState = {};

function loadPermState() {
  try { permState = JSON.parse(localStorage.getItem(PERM_KEY) || '{}'); } catch(e) { permState = {}; }
}
function savePermState() {
  try { localStorage.setItem(PERM_KEY, JSON.stringify(permState)); } catch(e) {}
}

// Check if welcome popup should show (first visit)
function checkFirstVisit() {
  loadPermState();
  const seen = localStorage.getItem('abalone_welcome_seen');
  if (!seen) {
    setTimeout(() => showWelcomePopup(), 800);
  } else {
    // Silently check real browser permission states
    checkAllPermissions(true);
  }
}

function showWelcomePopup() {
  const existing = document.getElementById('welcome-overlay');
  if (existing) { existing.style.display = 'flex'; return; }

  const overlay = document.createElement('div');
  overlay.id = 'welcome-overlay';
  overlay.className = 'welcome-overlay';
  overlay.innerHTML = `
    <div class="welcome-modal">
      <div class="welcome-header">
        <div class="welcome-logo" style="display:flex;align-items:center;justify-content:center;margin-bottom:4px">
          <span style="font-family:'Playfair Display',serif;font-size:26px;font-weight:900;letter-spacing:3px;background:linear-gradient(to right,#ffffff 0%,#ffffff 38%,#f0e3c0 50%,#d8b860 70%,#c8a84b 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;color:transparent">ABALASSEMBLY</span>
        </div>
        <div class="welcome-title">Bienvenue sur Abalassembly !</div>
        <div class="welcome-sub">Pour une expérience optimale, nous aimerions accéder aux éléments suivants. Vous pouvez modifier ces choix à tout moment dans les Paramètres.</div>
      </div>
      <div class="welcome-perms">

        <div class="welcome-perm-row" onclick="toggleWelcomePerm('camera',this)">
          <div class="wp-icon" style="background:rgba(200,168,75,0.1)">📷</div>
          <div class="wp-text">
            <div class="wp-name">Caméra</div>
            <div class="wp-desc">Détecter les billes de votre plateau physique en temps réel</div>
          </div>
          <button class="wp-toggle on" id="wp-camera" onclick="event.stopPropagation();toggleWelcomePerm('camera',this.closest('.welcome-perm-row'))"></button>
        </div>

        <div class="welcome-perm-row" onclick="toggleWelcomePerm('micro',this)">
          <div class="wp-icon" style="background:rgba(74,148,99,0.1)">🎙️</div>
          <div class="wp-text">
            <div class="wp-name">Microphone</div>
            <div class="wp-desc">Commandes vocales pour jouer mains libres</div>
          </div>
          <button class="wp-toggle" id="wp-micro" onclick="event.stopPropagation();toggleWelcomePerm('micro',this.closest('.welcome-perm-row'))"></button>
        </div>

        <div class="welcome-perm-row" onclick="toggleWelcomePerm('contacts',this)">
          <div class="wp-icon" style="background:rgba(180,100,200,0.1)">👥</div>
          <div class="wp-text">
            <div class="wp-name">Contacts</div>
            <div class="wp-desc">Inviter des amis et retrouver des joueurs que vous connaissez</div>
          </div>
          <button class="wp-toggle" id="wp-contacts" onclick="event.stopPropagation();toggleWelcomePerm('contacts',this.closest('.welcome-perm-row'))"></button>
        </div>

        <div class="welcome-perm-row" onclick="toggleWelcomePerm('notif',this)">
          <div class="wp-icon" style="background:rgba(220,160,60,0.1)">🔔</div>
          <div class="wp-text">
            <div class="wp-name">Notifications</div>
            <div class="wp-desc">Alertes pour vos parties, invitations et événements</div>
          </div>
          <button class="wp-toggle on" id="wp-notif" onclick="event.stopPropagation();toggleWelcomePerm('notif',this.closest('.welcome-perm-row'))"></button>
        </div>

      </div>
      <div class="welcome-footer">
        <button class="welcome-accept" onclick="applyWelcomePerms()">
          Continuer avec ces autorisations →
        </button>
        <button class="welcome-skip" onclick="skipWelcome()">
          Passer — configurer plus tard dans les Paramètres
        </button>
        <div style="font-size:11px;color:var(--muted);text-align:center;line-height:1.5">
          🔒 Vos données restent sur votre appareil. Aucune autorisation n'est partagée avec des tiers.<br>
          Conforme RGPD · Paramètres modifiables à tout moment
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

// Welcome popup toggle
const _welcomeState = { camera:true, micro:false, location:false, contacts:false, notif:true };
function toggleWelcomePerm(key, row) {
  _welcomeState[key] = !_welcomeState[key];
  const btn = document.getElementById('wp-'+key);
  if (btn) btn.classList.toggle('on', _welcomeState[key]);
  if (row) row.style.opacity = _welcomeState[key] ? '1' : '0.5';
}

function applyWelcomePerms() {
  localStorage.setItem('abalone_welcome_seen', '1');
  const overlay = document.getElementById('welcome-overlay');

  // Request real browser permissions for those toggled ON
  const requests = [];
  if (_welcomeState.camera)   requests.push(requestPermReal('camera'));
  if (_welcomeState.micro)    requests.push(requestPermReal('micro'));
  if (_welcomeState.location) requests.push(requestPermReal('location'));
  if (_welcomeState.notif)    requests.push(requestPermReal('notif'));
  // Contacts API not available in browsers — mark as simulated
  if (_welcomeState.contacts) {
    permState.contacts = 'granted';
    savePermState();
  }
  // Mark refused ones
  ['camera','micro','location','contacts','notif'].forEach(k => {
    if (!_welcomeState[k]) { permState[k] = 'denied'; }
  });
  savePermState();

  Promise.allSettled(requests).then(() => {
    if (overlay) overlay.style.display = 'none';
    checkAllPermissions(true);
    showToast('✅ Autorisations enregistrées !');
  });
}

function skipWelcome() {
  localStorage.setItem('abalone_welcome_seen', '1');
  const overlay = document.getElementById('welcome-overlay');
  if (overlay) overlay.style.display = 'none';
  showToast('⚙️ Configurez vos autorisations dans Paramètres → Autorisations');
}

// Real browser permission requests
async function requestPermReal(key) {
  try {
    if (key === 'camera') {
      const s = await navigator.mediaDevices.getUserMedia({video:true});
      s.getTracks().forEach(t => t.stop());
      permState.camera = 'granted';
    } else if (key === 'micro') {
      const s = await navigator.mediaDevices.getUserMedia({audio:true});
      s.getTracks().forEach(t => t.stop());
      permState.micro = 'granted';
    } else if (key === 'notif') {
      const r = await Notification.requestPermission();
      permState.notif = r === 'granted' ? 'granted' : 'denied';
    }
    savePermState();
  } catch(e) {
    permState[key] = 'denied';
    savePermState();
  }
}

// Button-triggered permission request
async function requestPerm(key) {
  updatePermUI(key, 'prompt');
  showToast(`🔐 Demande d'autorisation ${key}…`);
  await requestPermReal(key);
  updatePermUI(key, permState[key]);
  const label = {camera:'Caméra',micro:'Microphone',location:'Localisation',contacts:'Contacts',notif:'Notifications'}[key];
  showToast(permState[key]==='granted' ? `✅ ${label} autorisé·e !` : `❌ ${label} refusé·e — vérifiez les paramètres navigateur`);
}

function denyPerm(key) {
  permState[key] = 'denied';
  savePermState();
  updatePermUI(key, 'denied');
  const label = {camera:'Caméra',micro:'Microphone',location:'Localisation',contacts:'Contacts',notif:'Notifications'}[key];
  showToast(`🚫 ${label} refusé·e`);
}

// Check all permissions and update UI
async function checkAllPermissions(silent) {
  loadPermState();
  const checks = ['camera','microphone','notifications'];
  // Use Permissions API where available
  if (navigator.permissions) {
    for (const name of checks) {
      try {
        const r = await navigator.permissions.query({name});
        const key = {camera:'camera',microphone:'micro',notifications:'notif'}[name];
        if (key) {
          permState[key] = r.state; // 'granted'|'denied'|'prompt'
          savePermState();
          updatePermUI(key, r.state);
          // Listen for changes
          r.onchange = () => { permState[key]=r.state; savePermState(); updatePermUI(key,r.state); };
        }
      } catch(e) {}
    }
  }
  // Contacts: always simulated
  updatePermUI('contacts', permState.contacts || 'prompt');
  if (!silent) showToast('🔄 Autorisations vérifiées');
}

function updatePermUI(key, state) {
  const statusEl = document.getElementById('perm-status-'+key);
  const cardEl   = document.getElementById('perm-card-'+key);
  if (!statusEl) return;

  const labels = { granted:'✅ Autorisé', denied:'❌ Refusé', prompt:'⏳ En attente', default:'⏳ Non demandé' };
  const text = labels[state] || '⏳ Non vérifié';
  statusEl.textContent = text;
  statusEl.className = 'perm-status ' + (state === 'granted' ? 'granted' : state === 'denied' ? 'denied' : 'prompt');
  if (cardEl) cardEl.className = 'perm-card ' + (state === 'granted' ? 'granted' : state === 'denied' ? 'denied' : '');
}


/* ═══════════════════════════════════════════
   MODALS
═══════════════════════════════════════════ */
function openModal(name) {
  document.getElementById('modal-'+name).classList.add('open');
}
function closeModal(name) {
  const el = document.getElementById('modal-'+name);
  if (el) el.classList.remove('open');
}
document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => { if (e.target === o) o.classList.remove('open'); });
});

/* ── Mobile hamburger ── */


// Close on outside tap
document.addEventListener('click', e => {
  const menu = document.getElementById('mobile-menu');
  const btn  = document.getElementById('hamburger');
  if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
    menu.classList.remove('open');
    btn.classList.remove('open');
  }
});

/* ── Toggle password visibility ── */
function togglePw(id, btn) {
  const inp = document.getElementById(id);
  if (inp.type === 'password') { inp.type = 'text'; btn.textContent = '🙈'; }
  else { inp.type = 'password'; btn.textContent = '👁'; }
}

/* ── Password strength ── */
function checkPwStrength(val) {
  const fill = document.getElementById('pw-strength-fill');
  const label = document.getElementById('pw-strength-label');
  if (!fill) return;
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const levels = [
    { w:'15%', c:'#e05c4b', t:'Très faible' },
    { w:'35%', c:'#e08040', t:'Faible' },
    { w:'60%', c:'#c8a84b', t:'Moyen' },
    { w:'80%', c:'#6aaa7a', t:'Fort' },
    { w:'100%',c:'#4a9463', t:'Très fort ✓' },
  ];
  const lvl = levels[score] || levels[0];
  fill.style.width = lvl.w; fill.style.background = lvl.c;
  label.style.color = lvl.c; label.textContent = val ? lvl.t : '';
}

/* ────────────────────────────────────────────
   LOGIN FLOW
──────────────────────────────────────────── */
let _loginEmail = '';

function submitLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pw    = document.getElementById('login-pw').value;
  if (!email || !pw) { shakeModal('modal-login'); showToast('⚠️ Veuillez remplir tous les champs'); return; }
  _loginEmail = email;
  closeModal('login');
  // Reset 2FA modal state
  show2FAMethodSelect();
  selected2FA = null;
  document.querySelectorAll('.tfa-method-card').forEach(c => c.classList.remove('selected'));
  const btn = document.getElementById('2fa-continue-btn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
  document.getElementById('2fa-desc').textContent = 'Choisissez votre méthode de double authentification pour sécuriser votre connexion.';
  loginSuccess(); // 2FA simule retire : profil local, aucune verification reelle
}

/* ────────────────────────────────────────────
   SIGNUP FLOW
──────────────────────────────────────────── */
function submitSignup() {
  const username = document.getElementById('signup-username').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const pw       = document.getElementById('signup-pw').value;
  const terms    = document.getElementById('signup-terms').checked;
  if (!username || username.length < 3) { showToast('⚠️ Nom d\'utilisateur trop court (min. 3 caractères)'); return; }
  if (username.length > 24) { showToast('⚠️ Nom d\'utilisateur trop long (max. 24 caractères)'); return; }
  // Caractères autorisés : lettres, chiffres, espace, tiret, underscore, point (anti-injection)
  if (!/^[\p{L}\p{N} _.\-]+$/u.test(username)) { showToast('⚠️ Le nom contient des caractères non autorisés'); return; }
  if (!email || !email.includes('@')) { showToast('⚠️ Adresse email invalide'); return; }
  if (!pw || pw.length < 8) { showToast('⚠️ Mot de passe trop court (min. 8 caractères)'); return; }
  if (!terms) { showToast('⚠️ Veuillez accepter les conditions d\'utilisation'); return; }
  _loginEmail = email;
  closeModal('signup');
  // After signup, also ask for 2FA setup
  show2FAMethodSelect();
  selected2FA = null;
  document.querySelectorAll('.tfa-method-card').forEach(c => c.classList.remove('selected'));
  const btn = document.getElementById('2fa-continue-btn');
  if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }
  document.getElementById('2fa-desc').textContent = 'Sécurisez votre nouveau compte en activant la double authentification.';
  loginSuccess(); // 2FA simule retire : profil local, aucune verification reelle
}

/* ────────────────────────────────────────────
   2FA ENGINE
──────────────────────────────────────────── */
let selected2FA = null;
let resendCountdown = null;
let _fakeOTP = ''; // simulated code

function select2FAMethod(method) {
  selected2FA = method;
  document.querySelectorAll('.tfa-method-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('tfa-' + method).classList.add('selected');
  const btn = document.getElementById('2fa-continue-btn');
  btn.disabled = false; btn.style.opacity = '1';
}

function show2FAMethodSelect() {
  document.getElementById('2fa-method-select').style.display = 'block';
  document.getElementById('2fa-code-input').style.display = 'none';
  document.getElementById('2fa-yubikey-prompt').style.display = 'none';
  document.getElementById('2fa-totp-setup').style.display = 'none';
}

function launch2FA() {
  if (!selected2FA) return;
  document.getElementById('2fa-method-select').style.display = 'none';

  if (selected2FA === 'yubikey') {
    document.getElementById('2fa-yubikey-prompt').style.display = 'block';
    return;
  }

  if (selected2FA === 'totp') {
    document.getElementById('2fa-totp-setup').style.display = 'block';
    // Génère une clé TOTP aléatoire (base32) propre à ce compte
    var b32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    var rnd = crypto.getRandomValues(new Uint8Array(16));
    var key = '';
    for (var i=0;i<16;i++) { key += b32[rnd[i] % 32]; if ((i+1)%4===0 && i<15) key += ' '; }
    var secEl = document.getElementById('totp-secret');
    if (secEl) secEl.textContent = key;
    drawFakeQR();
    return;
  }

  // email or sms — show code input
  _fakeOTP = String(Math.floor(100000 + Math.random() * 900000));
  /* Aucun email ni SMS n'est reellement envoye (pas de backend — voir le
     commentaire "2FA simule retire" plus haut). Le code etait jusqu'ici
     visible UNIQUEMENT dans la console (console.log 'dev only'), ce qui le
     rendait a la fois trompeur (ca ressemble a de la vraie 2FA) ET
     inutilisable pour quiconque n'ouvre pas les outils de developpement.
     Affiche desormais directement dans le message a l'ecran, etiquete
     "demo" sans ambiguite — signale par Olivier. */
  const msgs = {
    email: `Code envoyé à ${maskEmail(_loginEmail)} (démo — aucun email réel n'est envoyé : code ${_fakeOTP})`,
    sms: `Code envoyé par SMS sur votre numéro enregistré (démo — aucun SMS réel n'est envoyé : code ${_fakeOTP})`,
  };
  document.getElementById('2fa-send-msg').textContent = msgs[selected2FA];
  document.getElementById('2fa-code-label').textContent = selected2FA === 'email' ? 'Code reçu par email' : 'Code reçu par SMS';
  [1,2,3,4,5,6].forEach(i => {
    const el = document.getElementById('2fa-digit-'+i);
    el.value = ''; el.classList.remove('filled');
  });
  document.getElementById('2fa-code-input').style.display = 'block';
  setTimeout(() => document.getElementById('2fa-digit-1').focus(), 100);
  startResendTimer(60);
  if (selected2FA === 'email') showToast(`📧 Code envoyé — vérifiez vos emails`);
  if (selected2FA === 'sms') showToast(`📱 Code SMS envoyé !`);
}

function maskEmail(email) {
  if (!email.includes('@')) return email;
  const [user, domain] = email.split('@');
  return user[0] + '***' + user[user.length-1] + '@' + domain;
}

/* OTP digit inputs */
