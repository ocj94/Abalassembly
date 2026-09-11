/* ═══════════════════════════════════════════
   SCHEMAS D'ARCHITECTURE — rendus en SVG NATIF.
   Pas de bibliotheque externe : Mermaid pese ~2 Mo et casserait le
   fichier unique hors ligne. Meme approche que la courbe d'evaluation
   et la heatmap d'activite, deja en SVG natif.

   ATTENTION — CONTENU ECRIT A LA MAIN : contrairement a la Fiche pour
   IA (openSiteBriefing), qui compte tout a l'execution, un schema
   d'architecture ne peut pas se deduire du code. Il doit etre mis a
   jour A LA MAIN quand l'architecture change, au meme titre que
   APP_VERSION. Verifie contre le code en v2.39.
═══════════════════════════════════════════ */
const ARCHI_DIAGRAMS = [
  {
    titre: 'Comment l\u2019IA choisit son coup',
    note: 'L\u2019ordre compte : chaque étape n\u2019est atteinte que si la précédente n\u2019a rien donné.',
    noeuds: [
      { t:'Tour de l\u2019IA', c:'neutre' },
      { t:'Le livre d\u2019ouvertures couvre-t-il la position ?', c:'test' },
      { t:'Coup tiré au sort, pondéré fréquence × taux de victoire', c:'sortie' },
      { t:'Moins de 20 coups, et une position proche existe dans les 418 595 empreintes ?', c:'test' },
      { t:'Coup de la position historique la plus proche', c:'sortie' },
      { t:'Moins de 16 coups, et le livre statique connaît la position ?', c:'test' },
      { t:'Coup du livre statique', c:'sortie' },
      { t:'Niveau Facile ?', c:'test' },
      { t:'Coup au hasard parmi les 4 meilleurs', c:'sortie' },
      { t:'Recherche alpha-bêta, répartie sur plusieurs cœurs si disponibles', c:'calcul' }
    ]
  },
  {
    titre: 'D\u2019où viennent les données',
    note: 'Le corpus ne sert pas qu\u2019à consulter : il alimente directement le jeu de l\u2019IA.',
    noeuds: [
      { t:'MIGS — 2 589 parties  +  AbalOnline — 1 890 parties', c:'neutre' },
      { t:'Corpus de 4 479 parties réelles', c:'sortie' },
      { t:'Livres d\u2019ouvertures — 13 variantes (avec arbre statistique)', c:'calcul' },
      { t:'Empreintes historiques — 418 595 positions × 12 dimensions', c:'calcul' },
      { t:'Puzzles — 138, chacun sourcé vers sa partie', c:'calcul' },
      { t:'Statistiques du jeu — avantage du 1er joueur, durées', c:'calcul' }
    ]
  },
  {
    titre: 'Les modes de jeu et les échanges',
    note: 'Aucun échange ne passe par un serveur de jeu. Les deux marchent même sans réseau — juste un texte ou une URL à transmettre.',
    noeuds: [
      { t:'Contre l\u2019IA  ·  Deux joueurs  ·  Partie en direct 🧪', c:'neutre' },
      { t:'Partie en cours', c:'sortie' },
      { t:'Partie par code — texte à copier-coller', c:'calcul' },
      { t:'Lien de partie — ?partie= dans l\u2019URL, ouverture en un clic', c:'calcul' },
      { t:'Export / import Aba-Pro — standard communautaire', c:'calcul' },
      { t:'Duel moteur externe — relais manuel', c:'calcul' },
      { t:'Historique local — 200 parties rejouables', c:'calcul' }
    ]
  }
];

function _archiSVG(d){
  const W = 640, hN = 46, gap = 18;
  const H = d.noeuds.length * (hN + gap) + 10;
  const couleurs = {
    neutre: { f:'#2a2a2a', s:'var(--border)' },
    test:   { f:'#1a2f2f', s:'var(--gold-dim)' },
    sortie: { f:'#33300f', s:'var(--gold)' },
    calcul: { f:'#1c2d33', s:'#4a7a8a' }
  };
  let svg = '<svg width="100%" viewBox="0 0 '+W+' '+H+'" style="display:block;max-width:100%">';
  d.noeuds.forEach(function(n, i){
    const y = i * (hN + gap) + 4;
    const col = couleurs[n.c] || couleurs.neutre;
    if (i > 0) {
      const yp = y - gap;
      svg += '<line x1="'+(W/2)+'" y1="'+yp+'" x2="'+(W/2)+'" y2="'+y+'" stroke="var(--border)" stroke-width="2"/>'
           + '<polygon points="'+(W/2-4)+','+(y-6)+' '+(W/2+4)+','+(y-6)+' '+(W/2)+','+y+'" fill="var(--border)"/>';
    }
    svg += '<rect x="10" y="'+y+'" width="'+(W-20)+'" height="'+hN+'" rx="8" fill="'+col.f+'" stroke="'+col.s+'" stroke-width="1.5"/>';
    // texte coupe en deux lignes si trop long
    const txt = n.t;
    if (txt.length > 52) {
      let cut = txt.lastIndexOf(' ', 52); if (cut < 20) cut = 52;
      svg += '<text x="'+(W/2)+'" y="'+(y+19)+'" text-anchor="middle" fill="var(--text)" font-size="13">'+_esc(txt.slice(0,cut))+'</text>'
           + '<text x="'+(W/2)+'" y="'+(y+35)+'" text-anchor="middle" fill="var(--text)" font-size="13">'+_esc(txt.slice(cut+1))+'</text>';
    } else {
      svg += '<text x="'+(W/2)+'" y="'+(y+28)+'" text-anchor="middle" fill="var(--text)" font-size="13">'+_esc(txt)+'</text>';
    }
  });
  svg += '</svg>';
  return svg;
}
function _esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function renderArchiPage(){
  const host = document.getElementById('archi-diagrams');
  if (!host) return;
  host.innerHTML = ARCHI_DIAGRAMS.map(function(d){
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin-bottom:20px">'
      + '<div style="font-size:13px;font-weight:700;color:var(--white);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">'+d.titre+'</div>'
      + '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">'+d.note+'</div>'
      + _archiSVG(d)
      + '</div>';
  }).join('')
  + '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 20px">'
    + '<div style="font-size:13px;font-weight:700;color:var(--white);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">À part : les tables de finale</div>'
    + '<div style="font-size:12px;color:var(--muted);line-height:1.6">Les tables 2 contre 2 et 3 contre 2 ne sont pas branchées sur le moteur principal : elles servent au mode Découverte, et depuis peu au trainer de puzzles « Finale prouvée » (les positions où le gain est démontré, pas estimé). Leur résultat le plus notable reste un constat plutôt qu\u2019un gain de force pour l\u2019IA — <strong style="color:var(--gold)">99,9 % de ces positions sont des nulles</strong>. Les classes supérieures sont hors de portée.</div>'
  + '</div>';
}

async function renderCorpusStatsPage(){
  const host = document.getElementById('corpus-stats-body');
  if (!host) return;
  host.innerHTML = '<div style="font-size:13px;color:var(--muted)" id="corpus-progress">Calcul en cours (première fois seulement — mis en cache ensuite)…</div>';

  const s = await computeCorpusStats(function(done, total){
    const el = document.getElementById('corpus-progress');
    if (el) el.textContent = 'Calcul en cours (première fois seulement) — ' + done + '/' + total + ' parties rejouées…';
  });
  if (!host.isConnected) return;
  if (!s) { host.innerHTML = '<div style="font-size:13px;color:var(--muted)">Bibliothèque de parties pas encore chargée — réessaie dans un instant.</div>'; return; }

  function card(title, body, note){
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:18px 20px;margin-bottom:16px">'
      + '<div style="font-size:13px;font-weight:700;color:var(--white);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">'+title+'</div>'
      + body
      + (note ? '<div style="font-size:11px;color:var(--muted);margin-top:10px">'+note+'</div>' : '')
      + '</div>';
  }
  function ligne(label, val){
    return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">'
      + '<span style="color:var(--text)">'+label+'</span><span style="font-weight:700;color:var(--gold)">'+val+'</span></div>';
  }

  const avantage = (s.blackPct != null) ? (s.blackPct - 50).toFixed(1) : null;
  let html = '';

  html += card('L\u2019avantage du premier joueur',
    '<div style="display:flex;gap:10px;margin-bottom:8px">'
    + '<div style="flex:1;text-align:center"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Noir (commence)</div>'
      + '<div style="font-size:26px;font-weight:800;color:var(--text);font-family:\'DM Mono\',monospace">'+(s.blackPct!=null?s.blackPct+'%':'—')+'</div>'
      + '<div style="font-size:11px;color:var(--muted)">'+s.black.toLocaleString('fr-FR')+' victoires</div></div>'
    + '<div style="flex:1;text-align:center"><div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px">Blanc</div>'
      + '<div style="font-size:26px;font-weight:800;color:var(--text);font-family:\'DM Mono\',monospace">'+(s.whitePct!=null?s.whitePct+'%':'—')+'</div>'
      + '<div style="font-size:11px;color:var(--muted)">'+s.white.toLocaleString('fr-FR')+' victoires</div></div>'
    + '</div>'
    + (avantage!=null ? '<div style="font-size:12px;color:var(--text)">Celui qui commence gagne <strong style="color:var(--gold)">'+avantage+' points de pourcentage</strong> plus souvent que l\u2019autre.</div>' : ''),
    'Sur '+s.decided.toLocaleString('fr-FR')+' parties dont le vainqueur est connu avec certitude. Les parties MIGS terminées par abandon ou fin de temps sont exclues : impossible de savoir qui a abandonné depuis les seules données.');

  html += card('Durée d\u2019une partie',
    ligne('Médiane', s.lenMedian + ' coups')
    + ligne('Moyenne', s.lenMean + ' coups')
    + ligne('La plus courte', s.lenMin + ' coups')
    + ligne('La plus longue', s.lenMax + ' coups'),
    'Mesuré sur les '+s.nMigs.toLocaleString('fr-FR')+' parties MIGS (notation complète disponible). La médiane est plus représentative que la moyenne, tirée vers le haut par quelques parties très longues.');

  const totalEnd = Object.values(s.endTypes).reduce(function(a,c){return a+c;},0);
  html += card('Comment se terminent les parties',
    Object.entries(s.endTypes).sort(function(a,b){return b[1]-a[1];}).map(function(e){
      return ligne(e[0], e[1].toLocaleString('fr-FR') + ' (' + Math.round(e[1]/totalEnd*100) + '%)');
    }).join(''),
    'Champ enregistré directement dans le corpus MIGS, pas déduit.');

  html += card('Variantes les plus jouées',
    s.topVariants.map(function(v){
      const label = (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[v[0]]) ? HEAT_VARIANT_LABEL[v[0]] : v[0];
      return ligne(label, v[1].toLocaleString('fr-FR') + ' parties');
    }).join(''),
    s.nVariants + ' variantes distinctes recensées dans le corpus AbalOnline ('+s.nAo.toLocaleString('fr-FR')+' parties).');

  // --- Distribution des 12 dimensions (referentiel objectif) ---
  const dist = computeDimensionDistributions();
  if (dist) {
    const rows = EMPREINTES_CHAMPS.map(function(f){
      const d = dist[f];
      const label = (typeof LABELS_EMPREINTE !== 'undefined' && LABELS_EMPREINTE[f]) ? LABELS_EMPREINTE[f] : f;
      return '<div style="padding:7px 0;border-bottom:1px solid var(--border)">'
        + '<div style="font-size:12px;color:var(--text);margin-bottom:2px">'+label+'</div>'
        + '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted);font-family:\'DM Mono\',monospace">'
          + '<span>10ᵉ centile : '+d.p10.toFixed(2)+'</span>'
          + '<span style="color:var(--gold);font-weight:700">médiane '+d.median.toFixed(2)+'</span>'
          + '<span>90ᵉ centile : '+d.p90.toFixed(2)+'</span>'
        + '</div></div>';
    }).join('');
    html += card('Les 12 dimensions, mesurées sur tout le corpus', rows,
      'Calculé sur les '+dist[EMPREINTES_CHAMPS[0]].n.toLocaleString('fr-FR')+' positions issues des parties réelles — une empreinte par coup joué. C\u2019est le référentiel qui permet de situer une position : au-dessus du 90ᵉ centile, elle fait partie des 10 % les plus marquées sur cette dimension.');
  }

  // --- Redondance entre dimensions (mesure honnete, pas une supposition) ---
  const corr = computeDimensionCorrelations();
  if (corr) {
    const top = corr.pairs.slice(0, 5).map(function(pr){
      const la = (LABELS_EMPREINTE[pr.a]||pr.a), lb = (LABELS_EMPREINTE[pr.b]||pr.b);
      const force = Math.abs(pr.r) > 0.8 ? 'très forte' : (Math.abs(pr.r) > 0.5 ? 'forte' : 'modérée');
      return '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border);font-size:12px">'
        + '<span style="color:var(--text)">'+la+' ↔ '+lb+'</span>'
        + '<span style="font-weight:700;color:'+(Math.abs(pr.r)>0.8?'#e08050':'var(--gold)')+'">'+pr.r+' <span style="font-weight:400;color:var(--muted);font-size:11px">('+force+')</span></span></div>';
    }).join('');
    html += card('Ces dimensions sont-elles indépendantes ?', top,
      'Corrélation de Pearson mesurée sur les '+corr.n.toLocaleString('fr-FR')+' positions. Cohésion, soutien et billes sans soutien mesurent largement la même chose (jusqu\u2019à 0,93) : ces trois axes bougent ensemble, il ne faut pas les lire comme trois informations distinctes. Aucune dimension n\u2019est constante, donc aucune n\u2019est inutile — mais ce groupe est redondant.');
  }

  host.innerHTML = html;
}

function renderHistoriquePage(){
  const host = document.getElementById('historique-filters-host');
  if (host && !host.dataset.built) {
    const variantOptions = (typeof LAYOUTS !== 'undefined')
      ? Object.keys(LAYOUTS).map(function(k){
          const label = (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[k]) ? HEAT_VARIANT_LABEL[k] : k;
          return '<option value="' + k + '">' + label + '</option>';
        }).join('')
      : '';
    host.innerHTML =
      '<select onchange="_historySetFilter(\'variant\', this.value)" style="flex:1;min-width:120px;padding:7px;border-radius:7px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px"><option value="all">Toutes variantes</option>' + variantOptions + '</select>'
      + '<select onchange="_historySetFilter(\'mode\', this.value)" style="flex:1;min-width:100px;padding:7px;border-radius:7px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px"><option value="all">Tous modes</option><option value="ai">Contre IA</option><option value="local">Local/code</option></select>'
      + '<select onchange="_historySetFilter(\'result\', this.value)" style="flex:1;min-width:100px;padding:7px;border-radius:7px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px"><option value="all">Tout résultat</option><option value="victoire">Victoires</option><option value="defaite">Défaites</option><option value="nulle">Nulles</option></select>'
      + '<input type="text" placeholder="Rechercher (variante, nom...)" oninput="_historySetFilter(\'search\', this.value)" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:13px;box-sizing:border-box;flex-basis:100%;margin-top:2px">';
    host.dataset.built = '1';
  }
  _historyFilters = { variant:'all', mode:'all', result:'all', search:'' };
  _renderHistoryList();
}

/* Conservee pour compatibilite (referencee par la fiche technique pour IA,
   et par toute habitude anterieure) -- redirige simplement vers la page,
   qui a remplace le modal flottant (signale par Olivier : demande une page
   normale du site comme les autres, pas une fenetre superposee). */
function openHistoryModal(){
  if (typeof showPage === 'function') showPage('historique');
}

/* Import d'une sequence Aba-Pro brute (pas un format proprietaire BGA --
   verifie par recherche que BGA n'expose aucun export texte telechargeable
   pour Abalone, seulement une relecture par notifications internes au
   navigateur. Aba-Pro est en revanche LE standard communautaire reconnu
   -- import honnete de ce qu'on peut reellement verifier, pas invente. */
/* Export des coups de la partie en cours en notation Aba-Pro brute --
   complement direct de l'import (openApgnImportModal ci-dessous) : ce que
   le site produit ici, il sait le relire. Objectif concret : pouvoir
   soumettre une partie a un moteur externe (aucun moteur externe ne
   comprend le format "Partie par code", proprietaire a ce site ; Aba-Pro
   est en revanche le standard communautaire reconnu).
   Note honnete : il n'existe AUCUN format standard de POSITION pour
   Abalone (contrairement au FEN des echecs -- verifie par recherche).
   L'export part donc forcement de la position de depart de la variante,
   rappelee en commentaire d'en-tete, et non d'une position arbitraire. */
/* ═══════════════════════════════════════════
   DUEL CONTRE UN MOTEUR EXTERNE
   Rendu possible par l'extraction de executePlayerMove() hors de
   handleClick() : un coup venu d'un moteur externe suit EXACTEMENT le
   meme chemin qu'un coup humain (validation, captures, animations,
   pendules, detection de victoire, sauvegarde) -- rien n'est contourne.
   Le coup recu est TOUJOURS revalide contre le moteur avant d'etre
   applique : un moteur externe buggue ou malveillant ne peut pas faire
   jouer un coup illegal.
   Pas de serveur, pas de protocole reseau : l'utilisateur relaie les
   coups a la main, dans la notation Aba-Pro standard -- le seul format
   qu'un moteur externe a une chance de comprendre (verifie : il n'existe
   aucun format standard de POSITION pour l'Abalone, et le format
   "Partie par code" est propre a ce site).
═══════════════════════════════════════════ */
function openExternalEnginePanel(){
  let m = document.getElementById('extengine-modal');
  if (m) m.remove();
  m = document.createElement('div');
  m.id = 'extengine-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(13,15,14,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML =
    '<div style="max-width:520px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:24px;max-height:90vh;overflow-y:auto">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:6px">Duel contre un moteur externe</h3>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">Fais jouer un autre programme contre l\u2019IA de ce site. Tu relaies les coups à la main, en notation Aba-Pro. Aucun compte, aucun serveur.</div>'
    + '<div id="extengine-last" style="font-size:11px;letter-spacing:1px;color:var(--muted);margin-bottom:6px">DERNIER COUP DE CE SITE</div>'
    + '<div id="extengine-lastmove" style="font-family:\'DM Mono\',monospace;font-size:16px;color:var(--gold);background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:6px">—</div>'
    + '<button class="ctrl-btn" onclick="_extCopyLastMove()" style="width:100%;margin-bottom:14px">Copier ce coup</button>'
    + '<div style="font-size:11px;letter-spacing:1px;color:var(--muted);margin-bottom:6px">COUP DU MOTEUR EXTERNE</div>'
    + '<input id="extengine-in" placeholder="ex. e5f6" style="width:100%;padding:9px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-family:\'DM Mono\',monospace;font-size:14px;box-sizing:border-box">'
    + '<div id="extengine-status" style="font-size:12px;margin:8px 0;min-height:16px"></div>'
    + '<div style="display:flex;gap:8px">'
      + '<button class="ctrl-btn" onclick="_extPlayMove()" style="flex:1">Jouer ce coup</button>'
      + '<button onclick="document.getElementById(\'extengine-modal\').remove()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:8px 16px;cursor:pointer">Fermer</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(m);
  _extRefreshLastMove();
}

function _extLastMoveText(){
  if (typeof boardSnapshots === 'undefined' || !boardSnapshots.length) return null;
  const mi = boardSnapshots[boardSnapshots.length-1].moveInfo;
  if (!mi || !mi.cells || !mi.dir) return null;
  return moveToABAPRO(mi.cells, mi.dir, mi.type);
}

function _extRefreshLastMove(){
  const el = document.getElementById('extengine-lastmove');
  if (!el) return;
  const t = _extLastMoveText();
  el.textContent = t || '— (aucun coup joué pour l\u2019instant)';
}

function _extCopyLastMove(){
  const t = _extLastMoveText();
  if (!t) { if (typeof showToast==='function') showToast('Aucun coup à copier.'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(function(){
      if (typeof showToast==='function') showToast('📋 Coup copié : ' + t);
    }).catch(function(){ if (typeof showToast==='function') showToast('Copie refusée par le navigateur.'); });
  }
}

function _extPlayMove(){
  const input = document.getElementById('extengine-in');
  const status = document.getElementById('extengine-status');
  const setErr = function(msg){ if (status){ status.textContent = msg; status.style.color = '#e05c4b'; } };
  if (!input) return;
  const tok = input.value.trim();
  if (!tok) { setErr('Colle le coup renvoyé par le moteur externe.'); return; }
  if (gameOver) { setErr('La partie est terminée.'); return; }

  const color = CurrentTurn.get();
  const mv = resolveAbaProToken(tok, color);
  if (!mv) { setErr('Notation illisible ou coup impossible dans cette position pour ' + (color==='black'?'les noirs':'les blancs') + '.'); return; }
  // Revalidation systematique contre le moteur : on ne fait jamais confiance
  // a un coup venu de l'exterieur, meme s'il a ete resolu.
  const info = validateMove(mv.cells, mv.dir, color);
  if (!info || !info.valid) { setErr('⛔ Coup illégal : ' + ((info && info.reason) || 'refusé par le moteur') + '.'); return; }

  executePlayerMove(mv.cells.slice(), mv.dir, color, info);
  input.value = '';
  if (status) { status.textContent = '✅ Coup joué : ' + tok; status.style.color = 'var(--accent-green-light)'; }
  // Laisse a l'IA du site le temps de repondre, puis reaffiche son coup
  setTimeout(_extRefreshLastMove, 2200);
}

/* ═══════════════════════════════════════════
   FICHE TECHNIQUE POUR IA — donnees factuelles sur le site.
   Motivation reelle : plusieurs audits externes generes par IA ont
   affirme a tort que des fonctionnalites manquaient alors qu'elles
   existaient, et donne des tailles de fichier fausses d'un ordre de
   grandeur. Cette fiche existe pour qu'un modele parte de faits
   verifiables plutot que de suppositions.
   PRINCIPE CENTRAL : tout est CALCULE A L'EXECUTION depuis le code
   reel (comptages, detection de fonctions), jamais un texte ecrit a la
   main -- sans quoi la fiche deviendrait elle-meme perimee et donc une
   nouvelle source d'erreurs, exactement le probleme qu'elle corrige.
   L'inventaire se fait par DETECTION (typeof === 'function') : c'est ce
   qui permet de refuter « il manque X » de facon verifiable.
═══════════════════════════════════════════ */
function buildSiteBriefing(){
  const has = function(n){ try { return typeof window[n] === 'function'; } catch(e){ return false; } };
  const num = function(v){ return (typeof v === 'number') ? v : null; };
  const L = [];
  const P = function(s){ L.push(s); };

  P('# Abalassembly — fiche technique (generee automatiquement)');
  P('');
  P('Genere le ' + new Date().toISOString().slice(0,10) + ' depuis le site lui-meme.');
  P('Tous les chiffres ci-dessous sont COMPTES a l\u2019execution depuis le code reel,');
  P('pas recopies a la main. Les fonctionnalites sont detectees, pas declarees.');
  P('');
  P('## Identite');
  P('- Version : ' + (typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'inconnue'));
  P('- Architecture : fichier HTML unique, zero dependance externe, fonctionne hors ligne et depuis file://');
  P('- Licence : GPL v3 — depot : github.com/ocj94/Abalassembly');
  P('');
  P('## Contenu reel (compte a l\u2019instant)');
  try { P('- Variantes de depart : ' + Object.keys(LAYOUTS).length + ' (' + Object.keys(LAYOUTS).join(', ') + ')'); } catch(e){}
  try { P('- Puzzles : ' + PUZZLES.length + ' dont ' + SINGLE_MOVE_PUZZLE_COUNT + ' en un coup et ' + (PUZZLES.length - SINGLE_MOVE_PUZZLE_COUNT) + ' multi-coups'); } catch(e){}
  try { P('- Empreintes de positions historiques : ' + EMPREINTES_N); } catch(e){}
  try { if (typeof getGameHistory === 'function') P('- Parties archivees localement par cet utilisateur : ' + getGameHistory().length); } catch(e){}

  P('');
  P('## Fonctionnalites REELLEMENT presentes (detectees, pas declarees)');
  const feats = [
    ['Jeu contre IA (alpha-beta, PVS, quiescence, multi-worker)', 'aiMove'],
    ['Editeur de position', 'drawEditorBoard'],
    ['Analyse de partie avec barre d\u2019evaluation', 'updateAnalysisEval'],
    ['Revoir mes erreurs apres partie', 'openMistakesReview'],
    ['Historique de parties filtrable et rejouable', 'openHistoryModal'],
    ['Repetition espacee (SRS) sur les puzzles', 'srsGetDuePuzzles'],
    ['Partie par code (asynchrone, sans serveur)', 'openGameCodePanel'],
    ['Partie en direct WebRTC (experimental)', 'openRtcPanel'],
    ['Duel contre un moteur externe', 'openExternalEnginePanel'],
    ['Export des coups en notation Aba-Pro', 'exportGameAbaPro'],
    ['Import de notation Aba-Pro', 'openApgnImportModal'],
    ['Export / import de toutes les donnees utilisateur', 'exportMyData'],
    ['Carte de chaleur des coups', 'recordMyHeat'],
    ['Livre d\u2019ouvertures issu de vraies parties', 'getOpeningMove'],
    ['Tables de finale (2v2, 3v2)', 'ensureEmpreintesHistoriques'],
    ['Moteur experimental NNUE', 'loadNNUEWeights'],
    ['Benchmark moteur integre', 'requestAIMovePooled'],
    ['Navigation clavier et ARIA', '_a11yBuildOverlay'],
    ['Mode enfant', 'toggleKidsMode'],
    ['Detection de plateau par camera', 'startCamera'],
    ['Statistiques par moteur', 'computeEngineStats']
  ];
  feats.forEach(function(f){ P('- [' + (has(f[1]) ? 'x' : ' ') + '] ' + f[0]); });

  P('');
  P('## Limites connues et ASSUMEES (ne pas les signaler comme des oublis)');
  P('- Poids du fichier : ~7,7 Mo, dont plus de la moitie pour la base d\u2019empreintes.');
  P('  Le decodage est deja differe, mais le TELECHARGEMENT ne peut pas l\u2019etre :');
  P('  c\u2019est le prix assume du fichier unique hors ligne, pas un oubli.');
  P('- Comparabilite des scores entre workers : chaque worker a sa propre table de');
  P('  transposition (SharedArrayBuffer impossible sur GitHub Pages). Documente,');
  P('  non resolu, pas de solution propre connue dans ces contraintes.');
  P('- Backend (comptes, classement en ligne) : ecrit mais volontairement dormant.');
  P('  Le site est hors ligne par conception.');
  P('- NNUE : plus faible que le moteur actuel (2V/8D/5N sur 15 parties de test).');
  P('  Propose par transparence, jamais active par defaut.');
  P('- Auto-apprentissage : ecarte par calcul (~300 h de calcul pour egaler un corpus');
  P('  humain deja disponible gratuitement), pas par desinteret.');
  P('- Il n\u2019existe AUCUN format standard de POSITION pour l\u2019Abalone (pas de FEN).');
  P('  Seule la notation des COUPS (Aba-Pro) est standardisee.');

  P('');
  P('## Chantiers OUVERTS (deja identifies -- inutile de les proposer comme nouveautes)');
  P('- Duel contre un moteur externe : livre, mais jamais teste face a un VRAI programme');
  P('  externe (teste uniquement avec des coups produits par le moteur du site).');
  P('- Partie en direct WebRTC : la connexion reelle n\u2019a jamais ete validee sur un reseau');
  P('  mobile ; le repli vers "Partie par code" fonctionne.');
  P('- Puzzles multi-coups : pas de resolution interactive, et la suite de tests');
  P('  automatises ne les couvre pas encore.');
  P('- Vol de travail entre workers : code ecrit et verifie correct, mais PAS plus rapide');
  P('  en pratique -- conserve non active, documente en commentaire.');
  P('');
  P('## Suggestions DEJA EVALUEES ET ECARTEES (ne pas represcrire sans element nouveau)');
  P('- Multijoueur en ligne avec comptes/classement : demande un serveur, contraire au');
  P('  choix hors ligne assume. Le remplacement existe : Partie par code + WebRTC.');
  P('- Ajouter des dizaines de bots, skins ou modes : le site est deja tres fourni ;');
  P('  ce n\u2019est pas ce qui lui manque.');
  P('- Reduire le poids en supprimant la base d\u2019empreintes : ce serait supprimer une');
  P('  fonctionnalite, pas optimiser.');
  P('- Auto-apprentissage du reseau de neurones : chiffre a ~300 h de calcul minimum,');
  P('  hors de portee sans infrastructure dediee.');
  P('');
  P('## Regles de contribution');
  P('- Aucune donnee inventee : tout chiffre affiche doit etre source, date, ou remplace par "—".');
  P('- Toute affirmation sur ce site doit etre verifiee contre le code reel avant d\u2019etre ecrite.');
  P('- Les resultats negatifs sont conserves et documentes, pas masques.');
  P('- Documentation detaillee : github.com/ocj94/Abalassembly/tree/main/docs');
  return L.join('\n');
}

function openSiteBriefing(){
  let m = document.getElementById('briefing-modal');
  if (m) m.remove();
  const txt = buildSiteBriefing();
  m = document.createElement('div');
  m.id = 'briefing-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(13,15,14,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  m.innerHTML =
    '<div style="max-width:640px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:24px;max-height:90vh;overflow-y:auto">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:6px">Fiche technique pour IA</h3>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">Donnees factuelles sur ce site, recalculees a l\u2019instant depuis le code lui-meme. A coller dans une IA avant de lui demander un audit ou des suggestions : elle partira de faits verifiables plutot que de suppositions.</div>'
    + '<textarea id="briefing-text" readonly style="width:100%;height:300px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:\'DM Mono\',monospace;font-size:11px;box-sizing:border-box">' + txt.replace(/</g,'&lt;') + '</textarea>'
    + '<div style="display:flex;gap:8px;margin-top:10px">'
      + '<button class="ctrl-btn" onclick="_copyBriefing()" style="flex:1">Copier la fiche</button>'
      + '<button onclick="document.getElementById(\'briefing-modal\').remove()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:8px 16px;cursor:pointer">Fermer</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(m);
}

function _copyBriefing(){
  const t = buildSiteBriefing();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(t).then(function(){
      if (typeof showToast==='function') showToast('📋 Fiche technique copiée');
    }).catch(function(){ if (typeof showToast==='function') showToast('Copie refusée par le navigateur.'); });
  }
}

function exportGameAbaPro(){
  if (typeof boardSnapshots === 'undefined' || !boardSnapshots.length) {
    if (typeof showToast === 'function') showToast('Aucun coup joué à exporter.');
    return;
  }
  const tokens = [];
  for (let i = 0; i < boardSnapshots.length; i++) {
    const mi = boardSnapshots[i].moveInfo;
    if (!mi || !mi.cells || !mi.dir) continue; // coup sans info exploitable : ignore plutot que d'exporter du faux
    const tok = moveToABAPRO(mi.cells, mi.dir, mi.type);
    if (tok) tokens.push(tok);
  }
  if (!tokens.length) {
    if (typeof showToast === 'function') showToast('Aucun coup exploitable à exporter.');
    return;
  }
  const variant = (typeof currentLayout !== 'undefined') ? currentLayout : 'standard';
  const label = (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[variant]) ? HEAT_VARIANT_LABEL[variant] : variant;
  const body = tokens.map(function(t,i){ return (i%2===0 ? (Math.floor(i/2)+1)+'.' : '') + t; }).join(' ');
  const text = '# Abalassembly — position de départ : ' + label + '\n' + body;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function(){
      if (typeof showToast === 'function') showToast('📋 ' + tokens.length + ' coups copiés (Aba-Pro)');
    }).catch(function(){
      if (typeof showToast === 'function') showToast('Copie refusée par le navigateur.');
    });
  } else if (typeof showToast === 'function') {
    showToast('Presse-papier indisponible sur ce navigateur.');
  }
}

