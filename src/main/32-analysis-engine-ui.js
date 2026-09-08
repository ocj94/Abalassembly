/* ═══ Moteur de compréhension — panneau de la page Analyse ═══
   Utilise _avecPlateau (basculement synchrone de board/captures vers
   analysisBoard/analysisCapB/analysisCapW), même principe déjà utilisé
   deux fois dans cette page (analysisShowBestMove, updateAnalysisEval) —
   pas une invention, une généralisation d'un motif déjà éprouvé ici.
   Étages 1-5+7 (bon marché) dans renderComprehensionPanel, sur clic
   explicite seulement (jamais auto-rafraîchi à la navigation — même les
   étages "bon marché" génèrent de vrais coups à chaque appel). Étage 6
   (menace à N coups, une vraie recherche) dans un bouton séparé. */
let _comprehensionColor = 'black';
function setComprehensionColor(color, btn) {
  _comprehensionColor = color;
  ['comprehension-color-black','comprehension-color-white'].forEach(function(id){
    const b = document.getElementById(id);
    if (b) { b.classList.remove('active'); b.style.background = 'transparent'; b.style.border = '1px solid var(--border)'; }
  });
  if (btn) { btn.classList.add('active'); btn.style.background = 'rgba(200,168,75,0.12)'; btn.style.border = '1px solid var(--gold-dim)'; }
}
function renderComprehensionPanel() {
  if (Object.keys(analysisBoard).length === 0) { showToast('⚠️ Charge une position d\'abord'); return; }
  const host = document.getElementById('comprehension-result');
  if (host) host.innerHTML = '<span style="font-size:12px;color:var(--muted)">🧠 Calcul en cours...</span>';
  setTimeout(function() {
    const color = _comprehensionColor;
    const data = _avecPlateau(analysisBoard, analysisCapB, analysisCapW, function(){
      return {
        zones: analyzeZones(color),
        soutien: analyzeSupport(color),
        sumito: analyzeSumitoPotential(color),
        menace: analyzeMenaceImmediate(color),
        profondeur: analyzeProfondeurTactique(color),
        mobilite: analyzeMobilite2Coups(color),
        empreinte: calculerEmpreinte(color)
      };
    });
    _derniereEmpreinte = data.empreinte;
    let html = _formatComprehensionSummary(data, color) + _formatComprehensionDetail(data, color);
    if (_empreinteReference) html += _formatComparaisonEmpreinte(_empreinteReference, data.empreinte, _empreinteReferenceLabel);
    if (host) host.innerHTML = html;
    if (typeof applyTechMode === 'function') applyTechMode();
  }, 50);
}
function _formatComprehensionSummary(data, color) {
  const label = color === 'black' ? '⚫ Noir' : '⚪ Blanc';
  const bits = [
    data.soutien.nbBillesSansSoutien + ' bille(s) sans soutien réel',
    data.sumito.total + ' sumito(s) possible(s) maintenant',
    data.menace.nbCoupsMenacants + ' coup(s) adverse(s) menaçant(s)' + (data.menace.nbEjections>0 ? (' (dont ' + data.menace.nbEjections + ' éjection)') : ''),
    'mobilité à 2 coups : ' + data.mobilite.cases2Coups + ' cases'
  ];
  return '<div style="font-size:12px;color:var(--text);line-height:1.8"><strong style="color:var(--gold)">' + label + '</strong> — ' + bits.join(' · ') + '</div>';
}
function _formatComprehensionDetail(data, color) {
  const z = data.zones.moi;
  return '<div class="tech-detail" style="display:none;margin-top:10px;font-size:11px;color:var(--muted);line-height:1.8;border-top:1px solid var(--border);padding-top:10px">' +
    '<div><strong style="color:var(--text)">Zones (colonne)</strong> — cohésion : aile gauche ' + z.colonne.aileGauche.cohesion + ' · centre ' + z.colonne.centre.cohesion + ' · aile droite ' + z.colonne.aileDroite.cohesion + '</div>' +
    '<div><strong style="color:var(--text)">Zones (distance)</strong> — cohésion : cœur ' + z.distance.coeur.cohesion + ' · intermédiaire ' + z.distance.intermediaire.cohesion + ' · bord ' + z.distance.bord.cohesion + '</div>' +
    '<div><strong style="color:var(--text)">Profondeur tactique</strong> (chaîne d\'éjections si elle se lance) : ' + data.profondeur.profondeur + ' demi-coup(s)</div>' +
    '<div><strong style="color:var(--text)">Mobilité</strong> — 1 coup : ' + data.mobilite.cases1Coup + ' cases · 2 coups : ' + data.mobilite.cases2Coups + ' cases</div>' +
    '<div><strong style="color:var(--text)">Sumito</strong> — éjections : ' + data.sumito.ejections + ' · poussées : ' + data.sumito.poussees + ' (3v2 : ' + data.sumito.parType['3v2'] + ' · 3v1 : ' + data.sumito.parType['3v1'] + ' · 2v1 : ' + data.sumito.parType['2v1'] + ')</div>' +
    '</div>';
}

/* ═══ Comparaison de positions — étape 3 (option "sans base de données") ═══
   Capture explicite d'une position de référence, comparaison de toute
   position visitée ensuite à cette référence. Volontairement PAS de base
   de vraies parties (rejouer ~20 000 parties pour reconstruire des
   positions comparables serait un vrai chantier de données à part,
   remis à plus tard). Montre la distance brute ET, en mode technique,
   le détail par dimension — plutôt qu'une étiquette "similaire/pas
   similaire" avec des seuils inventés que je n'ai aucun moyen de
   valider sans une vraie base de comparaison. */
let _empreinteReference = null;
let _empreinteReferenceLabel = null;
let _derniereEmpreinte = null;
function capturerReference() {
  if (!_derniereEmpreinte) { showToast('⚠️ Clique d\'abord sur "Analyser cette position"'); return; }
  _empreinteReference = _derniereEmpreinte;
  _empreinteReferenceLabel = (_comprehensionColor === 'black' ? '⚫' : '⚪') + ' position #' + (analysisIdx + 1);
  showToast('📌 Position de référence enregistrée');
  renderComprehensionPanel();
}
function effacerReference() {
  _empreinteReference = null;
  _empreinteReferenceLabel = null;
  showToast('Référence effacée');
  renderComprehensionPanel();
}
function _formatComparaisonEmpreinte(ref, actuelle, label) {
  const d = distanceEmpreintes(ref, actuelle);
  let html = '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);font-size:12px;color:var(--text)">📌 Distance à <strong>' + label + '</strong> : <span style="color:var(--gold);font-family:\'DM Mono\',monospace">' + d.toFixed(2) + '</span></div>';
  html += '<div class="tech-detail" style="display:none;margin-top:6px;font-size:11px;color:var(--muted);line-height:1.6">';
  Object.keys(ref).forEach(function(k){
    const diff = (actuelle[k]||0) - (ref[k]||0);
    if (Math.abs(diff) > 0.005) {
      html += '<div>' + k + ' : ' + ref[k].toFixed(2) + ' → ' + actuelle[k].toFixed(2) + ' (Δ' + (diff>=0?'+':'') + diff.toFixed(2) + ')</div>';
    }
  });
  html += '</div>';
  return html;
}

function chercherMenaceTactique() {
  if (Object.keys(analysisBoard).length === 0) { showToast('⚠️ Charge une position d\'abord'); return; }
  const info = document.getElementById('comprehension-menace-n');
  if (info) info.textContent = '🔍 Recherche en cours...';
  setTimeout(function() {
    const color = _comprehensionColor;
    const result = _avecPlateau(analysisBoard, analysisCapB, analysisCapW, function(){
      return analyzeMenaceNCoups(color, 3);
    });
    if (!info) return;
    if (result.menaceReelle) {
      info.innerHTML = '<span style="color:var(--gold)">⚠️ Menace réelle détectée à ' + result.N + ' coups (gain tactique : ' + result.gainTactique + ')</span>';
    } else {
      info.textContent = '✅ Aucune menace significative détectée à ' + result.N + ' coups';
    }
  }, 50);
}

// Évaluation de la position (score noir vs blanc)
function updateAnalysisEval() {
  const evalText = document.getElementById('analysis-eval-text');
  const evalBar = document.getElementById('analysis-eval-bar');
  if (!evalText || !evalBar) return;
  // utilise evaluateBoard si dispo, sinon compte le matériel
  let score = 0;
  const savedB = board, savedCB = capturedByBlack, savedCW = capturedByWhite;
  board = analysisBoard; capturedByBlack = analysisCapB; capturedByWhite = analysisCapW;
  try {
    if (typeof evaluateBoard === 'function') score = evaluateBoard('black');
  } catch(e) { score = 0; }
  board = savedB; capturedByBlack = savedCB; capturedByWhite = savedCW;

  // position du curseur sur la barre (0% = blanc gagne, 100% = noir gagne)
  const clamped = Math.max(-2000, Math.min(2000, score));
  const pct = 50 + (clamped / 2000) * 50;
  evalBar.style.left = pct + '%';

  let txt;
  if (Math.abs(score) < 150) txt = 'Équilibré';
  else if (score > 0) txt = '⚫ Noirs +' + (score/1000).toFixed(1);
  else txt = '⚪ Blancs +' + (Math.abs(score)/1000).toFixed(1);
  evalText.textContent = txt;

  if (typeof renderEvalCurve === 'function') renderEvalCurve();
}

function renderAnalysisMoves() {
  const host = document.getElementById('analysis-moves');
  if (!host) return;
  if (analysisHistory.length <= 1) {
    host.innerHTML = '<div style="color:var(--muted);font-style:italic">Position de départ</div>';
    return;
  }
  /* moveNum et isBlack etaient calcules puis jamais utilises : la liste ne
     montrait ni le numero du coup ni le camp, seulement une notation nue.
     Signale par Saab. Noir et Blanc d'un meme tour partagent le numero
     (1,1,2,2,…), comme dans l'historique de la partie. */
  let html = '';
  for (let i = 1; i < analysisHistory.length; i++) {
    const h = analysisHistory[i];
    const active = i === analysisIdx;
    const moveNum = Math.ceil(i / 2);
    // couleur qui a joue ce coup : enregistree si disponible, sinon deduite
    // du trait qui suit (l'inverse), pour rester juste sur les anciens etats.
    const isBlack = h.color ? (h.color === 'black') : (h.turn === 'white');
    html += '<span onclick="analysisGoto(' + i + ')" title="Coup ' + moveNum + ' — ' + (isBlack ? 'Noirs' : 'Blancs') + '"'
      + ' style="display:inline-block;margin:1px 4px 1px 0;padding:2px 7px;border-radius:5px;cursor:pointer;'
      + (active ? 'background:var(--gold);color:#0d0f0e;font-weight:700;' : 'color:var(--text);')
      + '">'
      + '<span style="opacity:.55;font-size:11px">' + moveNum + '.</span>'
      + '<span style="display:inline-block;width:7px;height:7px;border-radius:50%;margin:0 4px;vertical-align:middle;'
      + 'background:' + (isBlack ? '#1a1a20' : '#e8e8ee') + ';border:1px solid var(--border)"></span>'
      + (h.label || '?')
      + (h.eject ? ' <span style="opacity:.7">✕</span>' : '')
      + '</span>';
  }
  host.innerHTML = html;
}

/* Calcule les plus grosses erreurs du JOUEUR HUMAIN dans la partie en cours
   d'analyse (analysisHistory, deja construit par analysisLoadLastGame()).
   "Erreur" = plus grosse baisse de l'evaluation statique (evaluateBoard,
   pas une recherche complete -- rapide, cout negligeable meme sur une
   partie de 60 coups) entre AVANT et APRES un coup joue par humanColor.
   Convention : evaluateBoard('black') est TOUJOURS appele du point de vue
   noir (meme convention que updateAnalysisEval() deja existant) -- la
   bascule est donc inversee pour les blancs avant d'etre comparee. */
/* ═══════════════════════════════════════════
   COURBE D'EVALUATION — fonctionnalite universelle chez les autres jeux
   (Leela/Lizzie, BadukAI, Kaya, Go Lab...) et absente ici jusqu'a
   present : un graphique de l'evaluation coup par coup, ou une CHUTE
   VERTICALE marque une erreur. Complementaire de "Revoir mes erreurs"
   (qui liste les pires coups) : la courbe montre QUAND la partie a
   bascule, pas seulement QUEL coup etait mauvais.

   Source : analysisHistory (une entree par position, deja construite par
   la page Analyse) + evaluateBoard, exactement la meme methode que
   computeGameMistakes -- aucun nouveau calcul de fond, seulement une
   presentation. Sauvegarde/restauration systematique de l'etat autour de
   l'evaluation, meme precaution que la fonction existante.

   Convention : evaluation TOUJOURS du point de vue des noirs (positif =
   noir mieux), comme computeGameMistakes -- une seule reference evite
   les inversions de signe qui ont deja pose probleme dans ce projet. */
function computeEvalCurve(){
  if (typeof analysisHistory === 'undefined' || analysisHistory.length < 2) return null;
  const savedB = board, savedCB = capturedByBlack, savedCW = capturedByWhite;
  const evals = analysisHistory.map(function(snap){
    board = snap.board; capturedByBlack = snap.capB; capturedByWhite = snap.capW;
    let s = 0;
    try { s = evaluateBoard('black'); } catch(e){ s = 0; }
    return s;
  });
  board = savedB; capturedByBlack = savedCB; capturedByWhite = savedCW;
  return evals;
}

/* Classification des coups par ampleur de la perte d'evaluation.
   SEUILS ARBITRAIRES, ASSUMES COMME TELS : aucun standard n'existe pour
   l'Abalone (aux echecs meme, Chess.com et Lichess utilisent des seuils
   differents). Calibres ici sur SEUIL_PROCHE_MEILLEUR (30 points), deja
   etabli ailleurs dans ce code pour la meme notion -- pas une nouvelle
   valeur inventee pour l'occasion. Affiches dans l'interface pour que le
   joueur sache ce qu'il lit. */
const SEUILS_QUALITE_COUP = [
  { max: 30,   cle:'bon',         label:'Bon',          couleur:'var(--accent-green-light)' },
  { max: 80,   cle:'imprecision', label:'Imprécision',  couleur:'#d9c05a' },
  { max: 200,  cle:'erreur',      label:'Erreur',       couleur:'#e08050' },
  { max: Infinity, cle:'gaffe',   label:'Gaffe',        couleur:'#e05c4b' }
];
function classifierCoup(perte){
  for (let i=0;i<SEUILS_QUALITE_COUP.length;i++){
    if (perte <= SEUILS_QUALITE_COUP[i].max) return SEUILS_QUALITE_COUP[i];
  }
  return SEUILS_QUALITE_COUP[SEUILS_QUALITE_COUP.length-1];
}

/* Classe chaque coup de la partie analysee, pour les deux camps.
   perte = de combien l'evaluation a baissé DU POINT DE VUE DU JOUEUR qui
   vient de jouer (0 ou negatif = il n'a rien perdu). */
function computeMoveQuality(){
  const evals = computeEvalCurve();
  if (!evals) return null;
  const out = [];
  for (let i = 1; i < analysisHistory.length; i++){
    const moverColor = (analysisHistory[i].turn === 'black') ? 'white' : 'black';
    const rawSwing = evals[i] - evals[i-1];
    const swingForMover = (moverColor === 'black') ? rawSwing : -rawSwing;
    const perte = Math.max(0, -swingForMover);
    out.push({ idx:i, color:moverColor, perte:perte, classe:classifierCoup(perte), label: analysisHistory[i].label });
  }
  return out;
}

/* Rendu SVG natif de la courbe (aucune dependance externe -- meme
   principe que la heatmap d'activite et les courbes de trajectoire).
   Chaque point est cliquable et amene directement a ce coup, comme dans
   les outils de Go. */
function renderEvalCurve(){
  const host = document.getElementById('analysis-eval-curve');
  if (!host) return;
  const evals = computeEvalCurve();
  if (!evals || evals.length < 2) {
    host.innerHTML = '<div style="font-size:12px;color:var(--muted);padding:10px 0">Charge une partie pour voir sa courbe d\u2019évaluation.</div>';
    return;
  }
  const quality = computeMoveQuality() || [];
  const w = 600, h = 130, pad = 6;
  const maxAbs = Math.max(60, Math.max.apply(null, evals.map(function(v){ return Math.abs(v); })));
  const x = function(i){ return pad + (i/(evals.length-1)) * (w - 2*pad); };
  const y = function(v){ return h/2 - (v/maxAbs) * (h/2 - pad); };

  let svg = '<svg width="100%" viewBox="0 0 '+w+' '+h+'" preserveAspectRatio="none" style="display:block;cursor:pointer" onclick="_evalCurveClick(event, this)">';
  // fond : moitie haute = avantage noir, moitie basse = avantage blanc
  svg += '<rect x="0" y="0" width="'+w+'" height="'+(h/2)+'" fill="#2a2a2a" opacity="0.5"/>';
  svg += '<rect x="0" y="'+(h/2)+'" width="'+w+'" height="'+(h/2)+'" fill="#e8e8e8" opacity="0.10"/>';
  svg += '<line x1="0" y1="'+(h/2)+'" x2="'+w+'" y2="'+(h/2)+'" stroke="var(--border)" stroke-width="1"/>';
  // aire sous la courbe
  const pts = evals.map(function(v,i){ return x(i).toFixed(1)+','+y(v).toFixed(1); });
  svg += '<polyline points="'+pts.join(' ')+'" fill="none" stroke="var(--gold)" stroke-width="2" stroke-linejoin="round"/>';
  // marqueurs sur les coups faibles (erreurs et gaffes uniquement, pour ne pas surcharger)
  quality.forEach(function(q){
    if (q.classe.cle === 'erreur' || q.classe.cle === 'gaffe') {
      // Motif nomme (perte de cohesion, menace, bord, mobilite) plutot
      // que le seul score -- calcule depuis les deux instantanes reels
      // encadrant ce coup, silencieux si aucune degradation nette ne
      // se distingue (mieux vaut ne rien dire qu'inventer une raison).
      let motifTxt = '';
      try {
        const motif = detecterMotifCoup(analysisHistory[q.idx-1].board, analysisHistory[q.idx].board, q.color);
        if (motif) motifTxt = ' — ' + motif.phrase;
      } catch(e){}
      svg += '<circle cx="'+x(q.idx).toFixed(1)+'" cy="'+y(evals[q.idx]).toFixed(1)+'" r="3.5" fill="'+q.classe.couleur+'">'
        + '<title>Coup '+q.idx+' ('+(q.color==='black'?'noir':'blanc')+') — '+q.classe.label+', '+Math.round(q.perte)+' pts perdus'+motifTxt+'</title></circle>';
    }
  });
  svg += '</svg>';

  // recapitulatif par camp
  const recap = ['black','white'].map(function(c){
    const mine = quality.filter(function(q){ return q.color===c; });
    if (!mine.length) return '';
    const counts = {};
    mine.forEach(function(q){ counts[q.classe.cle] = (counts[q.classe.cle]||0)+1; });
    const parts = SEUILS_QUALITE_COUP.map(function(s){
      const n = counts[s.cle]||0;
      return n ? '<span style="color:'+s.couleur+'">'+n+' '+s.label.toLowerCase()+(n>1&&s.cle!=='imprecision'?'s':'')+'</span>' : null;
    }).filter(Boolean).join(' · ');
    return '<div style="font-size:11px;color:var(--muted);margin-top:4px">'+(c==='black'?'⚫ Noir':'⚪ Blanc')+' : '+(parts||'—')+'</div>';
  }).join('');

  host.innerHTML = svg
    + '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-top:2px"><span>début</span><span>avantage noir en haut · blanc en bas</span><span>coup '+(evals.length-1)+'</span></div>'
    + recap
    + '<div style="font-size:10px;color:var(--muted);margin-top:6px">Seuils de classification (choix assumé, aucun standard n\u2019existe pour l\u2019Abalone) : bon ≤ 30 pts perdus · imprécision ≤ 80 · erreur ≤ 200 · gaffe au-delà.</div>';
}

/* Clic sur la courbe -> saute au coup correspondant, comme dans les
   outils d'analyse de Go. */
function _evalCurveClick(ev, svgEl){
  if (typeof analysisHistory === 'undefined' || !analysisHistory.length) return;
  const rect = svgEl.getBoundingClientRect();
  const frac = (ev.clientX - rect.left) / rect.width;
  const idx = Math.round(frac * (analysisHistory.length - 1));
  if (typeof analysisGoto === 'function') analysisGoto(Math.max(0, Math.min(analysisHistory.length-1, idx)));
}

function computeGameMistakes(humanColor, topN){
  if (typeof analysisHistory === 'undefined' || analysisHistory.length < 2) return [];
  const savedB = board, savedCB = capturedByBlack, savedCW = capturedByWhite;
  const evals = analysisHistory.map(function(snap){
    board = snap.board; capturedByBlack = snap.capB; capturedByWhite = snap.capW;
    let s = 0;
    try { s = evaluateBoard('black'); } catch(e){ s = 0; }
    return s;
  });
  board = savedB; capturedByBlack = savedCB; capturedByWhite = savedCW;

  const mistakes = [];
  for (let i = 1; i < analysisHistory.length; i++){
    const moverColor = (analysisHistory[i].turn === 'black') ? 'white' : 'black';
    if (moverColor !== humanColor) continue;
    const rawSwing = evals[i] - evals[i-1];
    const swingForMover = (moverColor === 'black') ? rawSwing : -rawSwing;
    mistakes.push({ idx: i, swing: swingForMover, label: analysisHistory[i].label });
  }
  mistakes.sort(function(a,b){ return a.swing - b.swing; }); // plus negatif = pire, en tete
  return mistakes.slice(0, topN || 3);
}

/* Modal "Revoir mes erreurs" -- reutilise analysisLoadLastGame() (deja
   existant) pour reconstruire analysisHistory depuis la partie qui vient
   de se terminer, calcule les 3 plus grosses erreurs du joueur humain,
   et propose de sauter directement dessus dans l'onglet Analyse. */
function openMistakesReview(){
  if (typeof analysisLoadLastGame !== 'function' || typeof computeGameMistakes !== 'function') return;
  const humanC = (typeof HumanColor !== 'undefined') ? HumanColor.get() : 'black';
  analysisLoadLastGame();
  const mistakes = computeGameMistakes(humanC, 3);

  if (typeof hideWinOverlay === 'function') hideWinOverlay();
  const analyseTab = document.getElementById('gtab-analyse');
  if (typeof switchGameTab === 'function' && analyseTab) switchGameTab('analyse', analyseTab);

  let modal = document.getElementById('mistakes-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'mistakes-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(13,15,14,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';

  let bodyHtml;
  if (!mistakes.length) {
    bodyHtml = '<div style="text-align:center;color:var(--muted);font-size:13px;padding:20px 0">Aucun coup notable à revoir — belle partie !</div>';
  } else {
    bodyHtml = mistakes.map(function(m){
      const loss = Math.abs(m.swing) / 1000; // meme echelle que la barre d'evaluation existante
      return '<div onclick="analysisGoto(' + m.idx + ');document.getElementById(\'mistakes-modal\').remove()" '
        + 'style="cursor:pointer;padding:12px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center" '
        + 'onmouseover="this.style.borderColor=\'var(--gold-dim)\'" onmouseout="this.style.borderColor=\'var(--border)\'">'
        + '<div><div style="font-size:13px;color:var(--text)">Coup ' + m.idx + ' — ' + m.label + '</div>'
        + '<div style="font-size:11px;color:var(--muted)">Perte d\u2019évaluation estimée (évaluation statique, pas une recherche complète)</div></div>'
        + '<div style="color:#e05c4b;font-weight:700;font-size:14px;white-space:nowrap;margin-left:12px">-' + loss.toFixed(1) + '</div>'
        + '</div>';
    }).join('');
  }

  modal.innerHTML =
    '<div style="max-width:480px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:24px">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:6px">Tes coups à revoir</h3>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">Clique un coup pour l\u2019examiner dans l\u2019onglet Analyse.</div>'
    + bodyHtml
    + '<button class="ctrl-btn" onclick="document.getElementById(\'mistakes-modal\').remove()" style="width:100%;margin-top:8px">Fermer</button>'
    + '</div>';
  document.body.appendChild(modal);
}

function analysisGoto(idx) {
  if (analysisHistory.length === 0) return;
  if (idx === -1) idx = analysisHistory.length - 1;  // -1 = fin
  analysisIdx = Math.max(0, Math.min(analysisHistory.length - 1, idx));
  const snap = analysisHistory[analysisIdx];
  analysisBoard = JSON.parse(JSON.stringify(snap.board));
  analysisCapB = snap.capB; analysisCapW = snap.capW;
  analysisTurn = snap.turn;
  analysisSelected = [];
  analysisBestHint = null;  // efface la suggestion en changeant de position
  drawAnalysisBoard();
  updateAnalysisPositionInfo();
  renderAnalysisMoves();
}

function analysisStep(dir) {
  analysisGoto(analysisIdx + dir);
}

function updateAnalysisPositionInfo() {
  const info = document.getElementById('analysis-position-info');
  if (!info) return;
  if (analysisHistory.length === 0) { info.textContent = 'Aucune partie chargée'; return; }
  const total = analysisHistory.length - 1;
  info.textContent = analysisIdx === 0 ? 'Position de départ' : 'Coup ' + analysisIdx + ' / ' + total
    + '  ·  ' + (analysisTurn === 'black' ? '⚫ aux Noirs' : '⚪ aux Blancs');
}

// Initialise l'analyse avec une position de départ
function analysisInit(startBoard, turn) {
  analysisBoard = JSON.parse(JSON.stringify(startBoard));
  analysisCapB = 0; analysisCapW = 0;
  analysisTurn = turn || 'black';
  analysisSelected = [];
  analysisHistory = [{ board: JSON.parse(JSON.stringify(startBoard)), capB:0, capW:0, label:'Départ', turn:analysisTurn }];
  analysisIdx = 0;
  drawAnalysisBoard();
  updateAnalysisPositionInfo();
  renderAnalysisMoves();
}

// Charger : position standard
function analysisFromStandard() {
  if (typeof initBoardState === 'function') {
    const saved = board;
    initBoardState();
    const std = JSON.parse(JSON.stringify(board));
    board = saved;
    analysisInit(std, 'black');
  }
  showToast('🔄 Position standard chargée');
}

// Charger : position de l'éditeur
function analysisFromEditor() {
  if (Object.keys(editorBoard).length === 0) {
    showToast('⚠️ L\'éditeur est vide — place des billes d\'abord');
    return;
  }
  analysisInit(editorBoard, 'black');
  showToast('✏️ Position de l\'éditeur chargée');
}

// Charger : la dernière partie jouée (depuis les snapshots)
function analysisLoadLastGame() {
  if (typeof boardSnapshots === 'undefined' || !boardSnapshots || boardSnapshots.length < 2) {
    showToast('⚠️ Aucune partie récente — joue d\'abord une partie');
    return;
  }
  /* Reconstruit l'historique d'analyse depuis les snapshots de la partie.
     ATTENTION au decalage : boardSnapshots demarre VIDE et recoit un element
     par coup joue. boardSnapshots[0] est donc l'etat APRES le premier coup,
     avec pour label la notation de ce premier coup — ce n'est pas la position
     de depart. L'ancien code etiquetait cet element « Depart », ce qui
     decalait toute la liste d'un cran : le coup 1 n'etait jamais affiche et
     chaque case montrait le coup suivant. Signale par Olivier.
     On insere donc la vraie position de depart en tete, puis chaque snapshot
     conserve son propre label. */
  var startBoard = {};
  try {
    var _savedBoard = board;
    initBoardState();
    startBoard = JSON.parse(JSON.stringify(board));
    board = _savedBoard;
  } catch(e) { startBoard = JSON.parse(JSON.stringify(boardSnapshots[0].board)); }

  analysisHistory = [{
    board: startBoard, capB: 0, capW: 0, label: 'Départ', turn: 'black'
  }].concat(boardSnapshots.map(function(snap, i) {
    return {
      board: JSON.parse(JSON.stringify(snap.board)),
      capB: snap.capturedByBlack || 0,
      capW: snap.capturedByWhite || 0,
      label: snap.label || ('Coup ' + (i + 1)),
      // apres le coup i+1 : c'est au camp oppose de jouer
      turn: (i % 2 === 0) ? 'white' : 'black',
    };
  }));
  analysisIdx = 0;
  analysisGoto(0);
  showToast('🎮 Dernière partie chargée (' + (analysisHistory.length-1) + ' coups)');
}

// Jeu libre sur le plateau d'analyse (explorer des variantes)
function handleAnalysisClick(r, c) {
  const key = r + ',' + c;
  const piece = analysisBoard[key];
  const me = analysisTurn;

  // Sélection d'une bille de la couleur au trait
  if (piece === me) {
    const i = analysisSelected.findIndex(function(s){return s.r===r&&s.c===c;});
    if (i !== -1) analysisSelected.splice(i,1);
    else {
      const cand = analysisSelected.concat([{r,c}]);
      if (selectionLine(cand)) analysisSelected.push({r,c});
      else analysisSelected = [{r,c}];
    }
    soundSelect();
    drawAnalysisBoard();
    return;
  }

  // Jouer un coup (variante)
  if (analysisSelected.length > 0) {
    const targetAx = rcToAxial(r, c);
    let dir = null;
    for (const s of analysisSelected) {
      const sAx = rcToAxial(s.r, s.c);
      for (const d of AX_DIRS) {
        if (sAx.q+d.q===targetAx.q && sAx.r+d.r===targetAx.r) { dir = d; break; }
      }
      if (dir) break;
    }
    if (!dir) { analysisSelected = []; drawAnalysisBoard(); return; }

    // applique via le moteur
    const savedB = board, savedCB = capturedByBlack, savedCW = capturedByWhite;
    board = analysisBoard; capturedByBlack = analysisCapB; capturedByWhite = analysisCapW;
    const info = validateMove(analysisSelected, dir, me);
    if (info.valid) {
      const ejated = !!(info.type === 'push' && info.ejection);
      // copie des cases AVANT application : la notation se calcule sur la
      // position de depart, et analysisSelected est vide plus bas.
      const _movedCells = analysisSelected.map(function(s){ return {r:s.r, c:s.c}; });
      abApplyMove(analysisSelected, dir, me, info);
      if (ejated) { if (me === 'black') capturedByBlack++; else capturedByWhite++; soundEject(); }
      else if (info.type === 'push') soundPush();
      else soundMove();
      analysisBoard = board; analysisCapB = capturedByBlack; analysisCapW = capturedByWhite;
      board = savedB; capturedByBlack = savedCB; capturedByWhite = savedCW;

      // tronque l'historique après la position courante (nouvelle variante)
      analysisHistory = analysisHistory.slice(0, analysisIdx + 1);
      analysisTurn = (me === 'black') ? 'white' : 'black';
      /* L'historique n'affichait que la case de depart de la PREMIERE bille
         selectionnee (« a1 » au lieu de « a1b2 »), ce qui ne designe aucun
         coup de facon unique. On reutilise moteur commun moveToABAPRO —
         celui de la partie et de l'export — plutot que de reconstruire une
         notation ici : c'est lui qui connait la regle de la bille de queue
         et le cas des coups en fleche. Signale par Saab. */
      let label;
      try { label = moveToABAPRO(_movedCells, dir, info.type); }
      catch(e) { label = coordToABAPRO(_movedCells[0].r, _movedCells[0].c); }
      analysisHistory.push({
        board: JSON.parse(JSON.stringify(analysisBoard)),
        capB: analysisCapB, capW: analysisCapW,
        label: label, turn: analysisTurn, color: me, eject: ejated,
      });
      analysisIdx = analysisHistory.length - 1;
      analysisSelected = [];
      drawAnalysisBoard();
      updateAnalysisPositionInfo();
      renderAnalysisMoves();
    } else {
      board = savedB; capturedByBlack = savedCB; capturedByWhite = savedCW;
      analysisSelected = [];
      drawAnalysisBoard();
      showToast('⛔ ' + (info.reason || 'Coup invalide'));
    }
    return;
  }
}

// Clic sur le plateau d'analyse
document.addEventListener('DOMContentLoaded', function() {
  const canvas = document.getElementById('analysis-board');
  if (!canvas) return;
  canvas.addEventListener('click', function(e) {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / 640;
    const px = (e.clientX - rect.left) * (canvas.width / rect.width);
    const py = (e.clientY - rect.top) * (canvas.height / rect.height);
    let best = null, bestD = Infinity;
    for (let r=0;r<9;r++) for (let c=0;c<ROWS[r];c++) {
      const p = hexCoord(r,c);
      const d = Math.hypot(px - p.x*scale, py - p.y*scale);
      if (d < bestD && d < HEX_RADIUS*scale) { bestD = d; best = {r,c}; }
    }
    if (best) handleAnalysisClick(best.r, best.c);
  });
});

// Au chargement complet : vérifie si une position est passée dans l'URL (?pos=...)
document.addEventListener('DOMContentLoaded', function() {
  if (typeof loadPositionFromURL === 'function') loadPositionFromURL();
  if (typeof loadGameFromURL === 'function') loadGameFromURL();
  // synchronise les cases à cocher de notation avec les préférences sauvegardées
  const at = document.getElementById('notation-abapro-toggle');
  const nt = document.getElementById('notation-nacre-toggle');
  if (at) { at.checked = notationAbaPro; at.nextElementSibling.style.background = notationAbaPro ? 'var(--gold)' : 'var(--border)'; }
  if (nt) { nt.checked = notationNacre; nt.nextElementSibling.style.background = notationNacre ? 'var(--gold)' : 'var(--border)'; }
});

