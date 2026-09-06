';
let NNUE_WEIGHTS_CACHE = null;
async function loadNNUEWeights(){
  if (NNUE_WEIGHTS_CACHE) return NNUE_WEIGHTS_CACHE;
  try {
    const bin = Uint8Array.from(atob(NNUE_B64), c => c.charCodeAt(0));
    const ds = new DecompressionStream('deflate-raw');
    const stream = new Blob([bin]).stream().pipeThrough(ds);
    const text = await new Response(stream).text();
    NNUE_WEIGHTS_CACHE = JSON.parse(text);
    return NNUE_WEIGHTS_CACHE;
  } catch(e) { console.warn('Poids NNUE indisponibles:', e); return null; }
}

const AI_WEIGHT_PRESETS = {
  // chain/fortress : extrapolés à la main (pas SPSA-tunés comme les 4 autres poids historiques),
  // dans le même sens que cohesion pour chaque style — a affiner par le Labo si besoin.
  balanced:  { center:6, cohesion:4, edge:8,  mob:2, iso:18, dng:14, chain:10, fortress:20, label:'équilibré' },
  defensive: { center:5, cohesion:8, edge:12, mob:2, iso:14, dng:10, chain:14, fortress:26, label:'défensif' },   // vs joueur agressif
  aggressive:{ center:8, cohesion:3, edge:6,  mob:2, iso:20, dng:22, chain:6,  fortress:12, label:'agressif' },   // vs joueur passif
  divide:    { center:6, cohesion:3, edge:8,  mob:3, iso:30, dng:16, chain:8,  fortress:14, label:'division' }    // vs joueur qui s'expose
};
let aiAdaptive = true;     // profilage activé par défaut
let _aiMode = 'balanced';
let _aiForcedMode = null;   // null = profilage auto ; sinon force un style (UI manuelle)
let _engineMode = null;   // null = moteur actuel ; 'nnue-eval'/'nnue-order'/'nnue-both' = variantes experimentales (voir Parametres avances)
function setEngineMode(mode){
  _engineMode = (mode === 'actuel') ? null : mode;
  document.querySelectorAll('.engine-mode-btn').forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-engine') === mode); });
  const labels = { actuel:'Moteur actuel', 'nnue-eval':'NNUE (évaluation)', 'nnue-order':'NNUE (ordonnancement)', 'nnue-both':'NNUE (combiné)' };
  if (typeof showToast === 'function') showToast('🧪 ' + (labels[mode] || mode) + (mode !== 'actuel' ? ' — expérimental, plus faible dans nos tests' : ''));
}

// Déduit le mode de l'IA à partir du profil de l'adversaire (toi), mesuré sur tes coups.
function deriveAIMode(){
  if(!aiAdaptive) return 'balanced';
  if(!styleGame || styleGame.moves < 5) return 'balanced';   // pas assez d'infos pour profiler
  const p = computeStyleProfile(styleGame);
  if(p.edgeRisk  >= 30) return 'divide';       // tu exposes tes billes → l'IA isole/divise
  if(p.aggression >= 35) return 'defensive';   // tu attaques fort → l'IA se solidifie
  if(p.aggression <= 15) return 'aggressive';  // tu joues passif → l'IA presse
  return 'balanced';
}

// Met à jour les poids de l'IA selon le style détecté ; signale un changement de mode.
function updateAIStyle(){
  const mode = _aiForcedMode ? _aiForcedMode : deriveAIMode();
  const w = AI_WEIGHT_PRESETS[mode] || AI_WEIGHT_PRESETS.balanced;
  if(mode !== _aiMode){
    _aiMode = mode;
    if(mode !== 'balanced' && typeof showToast === 'function') showToast('🤖 IA : mode ' + w.label + (_aiForcedMode ? ' (forcé)' : ' (auto)'));
  }
  return w;
}


/* ═══════════════════════════════════════════
   LIVRE D'OUVERTURES STATISTIQUE — reconstruit sur les 4480 vraies parties
   rejouables (2589 MIGS + 1891 AbalOnline), 5 variantes. Un ancien build
   (avant qu'on découvre que le fichier KAA de 16819 lignes est une
   statistique agrégée et non des parties rejouables) portait des comptes
   gonflés (jusqu'à 14930 au premier coup, pour seulement 2589 parties
   Belgian Daisy disponibles) — remplacé ici par des comptes strictement
   bornés par le nombre réel de parties. wg/w viennent d'un vrai vainqueur
   déterminé par rejeu complet : élimination effective (≤8 billes) pour
   MIGS (1518/2589 parties concernées — les fins par abandon/temps/déco/nul
   n'ont pas de vainqueur récupérable et ne comptent pas), champ 'win' pour
   AbalOnline (1877/1891, hypothèse x=noir validée à 98,8% empiriquement).
   Format nœud: {c:total, wg:parties avec gagnant connu, w:victoires du
   joueur ayant joué ce coup, k:enfants}. Profondeur 12, élagage à 4
   occurrences minimum — même algorithme que l'ancien build.
═══════════════════════════════════════════ */
let OPENING_TREES={};  // rempli par ensureGameBanks()
const TREES_B64='