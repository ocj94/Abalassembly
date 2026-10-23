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
  divide:    { center:6, cohesion:3, edge:8,  mob:3, iso:30, dng:16, chain:8,  fortress:14, label:'division' },   // vs joueur qui s'expose
  // Les criteres de KAAH (poids de son profil « Normal ») AJOUTES aux poids equilibres. Experimental :
  // jamais choisi par le profilage automatique, seulement a la demande, en attendant le verdict du Labo
  // (test « Criteres de KAAH », page Labo).
  kaah:      { center:6, cohesion:4, edge:8,  mob:2, iso:18, dng:14, chain:10, fortress:20,
               scGain:200, scPerte:200, cases:1, compac:20, sumito:20, menace:120, fourch:60, piege:40, label:'KAAH (expérimental)' },
  /* v2.75 (choix d'Olivier, « solution 2 ») : les poids trouves par la methode Texel du Labo, avec ses
     reglages par defaut -- 15 036 positions calmes de vraies parties pour regler, 3 819 pour verifier
     (refaire le calcul : node tools/texel-poids.js -- memes positions, meme methode que le Labo).
     Ils devinent mieux le gagnant (73,1 % -> 75,8 % des positions de controle) et, surtout, gagnent
     leurs duels contre « equilibre », par paires depuis de vraies positions : voir AI_TEXEL_DUELS.
     Leur evaluation est plus lourde (criteres de KAAH : environ 17 % de positions de moins par seconde) :
     a temps egal, elle voit souvent un demi-coup de moins que « equilibre » -- et gagne quand meme.
     Utilises a partir du niveau 4 (AI_NIVEAU_TEXEL), en style Auto ou Equilibre : voir _aiPoidsTexel. */
  texel:     { center:24.3, cohesion:0, edge:4.1, mob:3, iso:11, dng:0, chain:0.7, fortress:0,
               scGain:8, scPerte:0, cases:0.8, compac:60, sumito:19.4, menace:0, fourch:5.5, piege:12.7, label:'Texel (vraies parties)' }
};
const AI_NIVEAU_TEXEL = 4;
// les duels qui ont decide (Elo des poids Texel contre « equilibre », marge a 95 %) -- affiches dans le Labo
const AI_TEXEL_DUELS = [
  { cadre: 'profondeur 2', paires: 24, points: 42, sur: 48, elo: 338, marge: 145 },
  { cadre: 'niveau 4', paires: 16, points: 27.5, sur: 32, elo: 314, marge: 198 },
  { cadre: 'niveau 5', paires: 16, points: 29, sur: 32, elo: 394, marge: 250 },
  { cadre: 'niveau 6', paires: 10, points: 17.5, sur: 20, elo: 338, marge: 278 }
];
/* l'echelle autour du changement (chaque niveau contre le precedent, 10 paires, memes departs) : avant,
   les niveaux 3 et 4 etaient a egalite ; le gain des poids Texel tombe donc sur cette marche */
const AI_TEXEL_MARCHES = [
  { marche: '2 → 3', elo: 191, marge: 146 },
  { marche: '3 → 4', avant: { elo: 17, marge: 114 }, elo: 382, marge: 299 },
  { marche: '4 → 5', elo: 127, marge: 163 }
];
// un champion du Labo adopte sur cet appareil (case « utiliser les poids du Labo ») : le choix de son proprietaire
function _labChampionAdopte(){ try { return localStorage.getItem('abaLabUse') !== '0' && !!JSON.parse(localStorage.getItem('abaLabChampion') || 'null'); } catch (e) { return false; } }
/* v2.75 : les poids Texel pour ce coup ? Niveau 4 et plus, style Auto (le profilage ne change plus les
   poids a ces niveaux : Texel bat aussi les styles qu'il choisissait -- duels a profondeur 2, 8 paires
   chacun : Agressif +163 ± 168, Defensif +338 ± 310, Division +163 ± 155 Elo)
   ou Equilibre choisi. Jamais : un autre style choisi a la main, le tournoi du mois (meme difficulte pour
   tout le mois, pour tout le monde), ni quand un champion du Labo est adopte sur l'appareil. */
function _aiPoidsTexel(mode){
  if (_aiForcedMode && mode !== 'balanced') return false;
  if (typeof _tourneyMatch !== 'undefined' && _tourneyMatch) return false;
  const n = (typeof _niveauIA === 'function') ? _niveauIA() : null;
  return !!n && n >= AI_NIVEAU_TEXEL && !_labChampionAdopte();
}
// les poids d'un niveau, tels qu'en partie en style Auto (bancs d'essai du Labo)
function _aiPoidsNiveau(n){ return (n >= AI_NIVEAU_TEXEL && !_labChampionAdopte()) ? AI_WEIGHT_PRESETS.texel : AI_WEIGHT_PRESETS.balanced; }
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
  let mode = _aiForcedMode ? _aiForcedMode : deriveAIMode();
  if (_aiPoidsTexel(mode)) mode = 'texel';   // v2.75 : niveaux 4 et plus
  const w = AI_WEIGHT_PRESETS[mode] || AI_WEIGHT_PRESETS.balanced;
  if(mode !== _aiMode){
    _aiMode = mode;
    if(mode !== 'balanced' && mode !== 'texel' && typeof showToast === 'function') showToast('🤖 IA : mode ' + w.label + (_aiForcedMode ? ' (forcé)' : ' (auto)'));
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