#!/usr/bin/env node
/* Abalassembly — suite de regression.
 *
 * Pourquoi ce fichier existe : jusqu'ici les suites de tests vivaient dans
 * l'environnement de la session et disparaissaient avec elle. Chaque session
 * repartait donc sans filet, ce qui explique l'observation de Saab :
 * « des bugs qui fonctionnaient bien dans des versions precedentes ».
 * Ce fichier est versionne : le filet suit le depot.
 *
 * Regle : chaque bug corrige ajoute ici un test qui echoue sur l'ancien code.
 *
 * Usage :  node tests/regression.js
 * Sortie :  code 0 si tout passe, code 1 sinon.
 *
 * Piege connu : console.assert n'interrompt PAS l'execution et ne change pas
 * le code de sortie. Il n'est donc jamais utilise ici — on compte les echecs
 * et on sort explicitement avec process.exit(1).
 */

'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let passed = 0;
const failures = [];

function check(name, fn) {
  let ok = false, detail = '';
  try {
    const r = fn();
    ok = (r === true);
    if (!ok && typeof r === 'string') detail = r;
  } catch (e) {
    detail = e && e.message ? e.message : String(e);
  }
  if (ok) { passed++; console.log('  ok   ' + name); }
  else { failures.push(name + (detail ? ' — ' + detail : '')); console.log('  ECHEC ' + name + (detail ? ' — ' + detail : '')); }
}

/* ── Extraction des blocs ─────────────────────────────────────────── */

const jsBlocks = [];
const ldBlocks = [];
const re = /<script([^>]*)>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(HTML)) !== null) {
  if (/ld\+json/.test(m[1])) ldBlocks.push(m[2]);
  else jsBlocks.push(m[2]);
}

/* Corps d'une fonction nommee, accolades equilibrees. */
function functionBody(name) {
  const src = jsBlocks.join('\n');
  const start = src.indexOf('function ' + name + '(');
  if (start === -1) throw new Error('fonction introuvable : ' + name);
  const open = src.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(open, i + 1); }
  }
  throw new Error('accolades non equilibrees dans ' + name);
}

/* ── 1. Integrite structurelle ────────────────────────────────────── */

console.log('\nIntegrite du fichier');

check('3 blocs <script> JS presents', () =>
  jsBlocks.length === 3 || ('trouve ' + jsBlocks.length));

check('syntaxe JS valide (node --check sur chaque bloc)', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'abal-'));
  for (let i = 0; i < jsBlocks.length; i++) {
    const p = path.join(dir, 'b' + i + '.js');
    fs.writeFileSync(p, jsBlocks[i]);
    execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' });
  }
  return true;
});

check('JSON-LD present et valide', () => {
  if (!ldBlocks.length) return 'aucun bloc JSON-LD';
  ldBlocks.forEach(b => JSON.parse(b));
  return true;
});

check('architecture mono-fichier preservee (aucun script externe)', () =>
  !/<script[^>]+\ssrc=/i.test(HTML) || 'un <script src=...> a ete introduit');

/* ── 2. Regressions corrigees ─────────────────────────────────────── */

console.log('\nRegressions (un test par bug corrige)');

/* Bug Saab : les billes ejectees de la partie precedente reapparaissaient
   dans l'Editeur et l'Analyse. L'option hideGutter etait passee par les
   deux appelants mais n'etait jamais lue par drawGutterMarbles. */
check('hideGutter est effectivement lu par drawGutterMarbles', () =>
  /opts\.hideGutter/.test(functionBody('drawGutterMarbles')) ||
  'drawGutterMarbles ignore opts.hideGutter');

check('l\'Editeur demande bien le masquage de la gouttiere', () =>
  /hideGutter\s*:\s*true/.test(functionBody('drawEditorBoard')) ||
  'drawEditorBoard ne passe plus hideGutter');

check('l\'Analyse demande bien le masquage de la gouttiere', () =>
  /hideGutter\s*:\s*true/.test(functionBody('drawAnalysisBoard')) ||
  'drawAnalysisBoard ne passe plus hideGutter');

/* Bug Saab : le dernier coup manquait dans l'export et dans l'historique.
   Cause : cote IA, le retour anticipe sur la 6e ejection sautait
   addMoveToHistory. Le coup gagnant de l'IA n'etait donc jamais enregistre. */
check('le coup gagnant de l\'IA est enregistre avant la conclusion', () => {
  const src = jsBlocks.join('\n');
  const i = src.indexOf('ejCount >= 6');
  if (i === -1) return 'branche de victoire de l\'IA introuvable';
  const j = src.indexOf('triggerWin(ai)', i);
  if (j === -1) return 'triggerWin(ai) introuvable apres le seuil';
  return /addMoveToHistory/.test(src.slice(i, j)) ||
    'retour anticipe : addMoveToHistory est saute sur le coup gagnant';
});

/* Le meme piege existe cote joueur humain et cote duel de bots :
   on verifie que l'ordre y reste correct. */
check('le coup gagnant du joueur reste enregistre', () => {
  const b = functionBody('handleClick');
  const hist = b.indexOf('addMoveToHistory');
  const win = b.indexOf('capturedByBlack >= 6');
  if (hist === -1 || win === -1) return 'reperes introuvables dans afterHumanMove';
  return hist < win || 'la verification de victoire precede l\'enregistrement';
});

/* Bug corrige en session 3 : la notation Aba-Pro des coups de groupe
   utilisait la bille de tete au lieu de la bille de queue. */
check('moveToABAPRO documente/utilise la bille de queue', () => {
  const b = functionBody('moveToABAPRO');
  return /queue|tail/i.test(b) || 'la convention bille de queue n\'est plus tracee';
});

/* Bug Saab : le clic-glisser ne fonctionnait pas dans les Puzzles.
   initPuzzleInteraction n'enregistrait qu'un ecouteur 'click'. */
check('le plateau de puzzle ecoute bien le glisser', () => {
  const b = functionBody('initPuzzleInteraction');
  const missing = ['mousedown', 'mousemove', 'mouseup'].filter(ev => !b.includes(ev));
  return missing.length === 0 || ('ecouteurs absents : ' + missing.join(', '));
});

check('puzzleHexAt existe (case sous le curseur)', () =>
  /function puzzleHexAt\s*\(/.test(jsBlocks.join('\n')) || 'fonction absente');

/* Bug Saab : il fallait scroller a la main pour voir le score d'ejection.
   L'auto-defilement ciblait #move-list, qui n'a pas de barre de defilement :
   c'est .move-history qui porte overflow-y:auto. */
check('l\'historique defile sur le conteneur scrollable', () => {
  const src = jsBlocks.join('\n');
  if (!/function scrollMoveListToEnd\s*\(/.test(src)) return 'scrollMoveListToEnd absente';
  /* On retire les commentaires : la note expliquant l'ancien bug contient
     la formule fautive et declenchait un faux positif. */
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
  return !/list\.scrollTop\s*=\s*list\.scrollHeight/.test(code) ||
    'un defilement cible encore #move-list directement';
});

check('.move-history reste le conteneur a defilement', () =>
  /\.move-history\s*\{[^}]*overflow-y:\s*auto/.test(HTML) ||
  'overflow-y:auto a disparu de .move-history');

/* Regression introduite par le correctif precedent : la recherche du
   conteneur remontait le DOM sans borne et finissait par faire defiler la
   page entiere apres chaque coup. Le defilement doit rester confine. */
check('le defilement de l\'historique ne sort pas du panneau', () => {
  /* Comme plus haut : on retire les commentaires, la note expliquant
     l'ancien bug cite les tournures fautives. */
  const b = functionBody('scrollMoveListToEnd')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
  if (!/closest\(['"]\.move-history['"]\)/.test(b)) return 'le panneau n\'est pas cible par closest()';
  if (/scrollIntoView/.test(b)) return 'scrollIntoView deplace aussi la fenetre';
  if (/while\s*\(|parentElement/.test(b)) return 'la remontee libre du DOM est revenue';
  return true;
});

/* ── 3. Nouvelles fonctionnalites ─────────────────────────────────── */

console.log('\nFonctionnalites');

check('code de partie : aller-retour verifie contre le moteur', () => {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'gamecode.js')],
    { stdio: 'pipe', encoding: 'utf8' });
  /* On lit le resultat, pas seulement l'absence d'erreur : un test qui ne
     joue aucun coup afficherait « tout passe » sans rien avoir verifie. */
  const m = out.match(/\((\d+) coups au total\)/);
  if (!m || parseInt(m[1], 10) < 100) return 'le harnais n\'a joue aucun coup reel';
  return true;
});

/* Bug Saab (24/07/2026) : la notation Nacre des coups lateraux ecrivait
   deux cases adjacentes au lieu des deux extremites. */
check('notation Nacre laterale : conforme au moteur', () => {
  const out = execFileSync(process.execPath, [path.join(__dirname, 'nacre.js')],
    { stdio: 'pipe', encoding: 'utf8' });
  const m = out.match(/coups lateraux testes\s*:\s*(\d+)/);
  if (!m || parseInt(m[1], 10) < 500) return 'le harnais n\'a teste aucun coup lateral';
  return true;
});

check('Nacre lateral : jamais deux cases adjacentes', () => {
  const b = functionBody('moveToNACRE')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1');
  if (/notation\s*<\s*b\.notation/.test(b)) return 'le tri alphabetique est revenu';
  return /moveEndpointCells/.test(b) || 'la notation n\'utilise plus la source partagee';
});

/* La fleche du dernier coup et la notation doivent nommer les MEMES cases.
   Calculees separement, l'une avait derive sans l'autre. */
check('fleche et notation partagent la meme source', () => {
  const a = functionBody('drawLastMoveArrow');
  if (!/moveEndpointCells/.test(a)) return 'la fleche recalcule ses extremites de son cote';
  return !/const p0 = avg\(before\)/.test(a) || 'la fleche repart du barycentre du groupe';
});

/* Le rejeu doit montrer le coup affiche, pas le dernier de la partie. */
check('replay : la fleche suit la position affichee', () => {
  const a = functionBody('drawLastMoveArrow');
  return /replayCurrentIdx/.test(a) || 'la fleche vise toujours le dernier coup';
});

check('replay : la position de depart existe', () => {
  const src = jsBlocks.join('\n');
  if (!/_replayStartBoard/.test(src)) return 'aucune position de depart conservee';
  return /replayCurrentIdx\s*=\s*-1/.test(src) || 'le rejeu ne commence pas avant le coup 1';
});

check('replay : la gouttiere est remise a zero', () => {
  const b = functionBody('_replaySeqToSnapshots');
  return /resetGutterPositions/.test(b) || 'les billes ejectees precedentes persistent';
});

check('puzzle du jour : deterministe par la date', () =>
  /function daySeed\s*\(/.test(jsBlocks.join('\n')) &&
  /function currentDailyPuzzle\s*\(/.test(jsBlocks.join('\n')) ||
  'les fonctions du puzzle quotidien sont absentes');

check('puzzle du jour : carte presente dans la page Problemes', () =>
  /id="daily-puzzle-card"/.test(HTML) || 'la carte n\'est pas dans le HTML');

check('puzzle du jour : completion branchee sur la resolution', () =>
  /checkDailyCompletion\(pa\.idx\)/.test(jsBlocks.join('\n')) ||
  'la resolution d\'un puzzle ne met pas a jour le puzzle du jour');

check('analyse d\'apres-partie : calculee sur les vraies positions', () => {
  const b = functionBody('postGameReview');
  return /boardSnapshots/.test(b) && /evaluateBoard/.test(b) ||
    'l\'analyse n\'utilise pas les instantanes et l\'evaluation du moteur';
});

check('analyse d\'apres-partie : l\'etat du jeu est restaure', () => {
  const b = functionBody('postGameReview');
  return /finally/.test(b) || 'pas de restauration garantie de board / captures';
});

/* Bug Saab/Olivier : quand le joueur tenait les blancs, l'onglet « Vous »
   de la carte de fin de partie affichait la carte du bot, et inversement.
   Tout le pipeline supposait « noir = moi ». */
check('carte de fin de partie : les onglets suivent humanColor', () => {
  const b = functionBody('renderHeatmapCard');
  if (!/humanColor/.test(b)) return 'renderHeatmapCard ignore humanColor';
  return !/tabBtn\('black'\s*,\s*'Vous'\)/.test(b) ||
    '« Vous » est de nouveau code en dur sur les noirs';
});

check('metriques joueur : plus de couleur codee en dur', () => {
  const b = functionBody('recordPlayerMove');
  const dur = [/centerControl\('black'\)/, /cohesionScore\('black'\)/, /recordMyHeat\('black'/]
    .filter(re => re.test(b));
  return dur.length === 0 || (dur.length + ' mesure(s) encore calculee(s) sur le noir');
});

check('les coups de l\'IA ne vont pas dans la carte personnelle', () => {
  const src = jsBlocks.join('\n');
  return !/recordWhiteHeatmap\(chosen\.cells\)/.test(src) ||
    'un coup de l\'IA est encore range via recordWhiteHeatmap (qui ecrit dans me_white)';
});

check('recordOpponentHeat n\'ecrit jamais dans la carte personnelle', () => {
  const b = functionBody('recordOpponentHeat');
  return !/recordMyHeat/.test(b) || 'recordOpponentHeat appelle recordMyHeat';
});

/* Le mode Enfant ne survivait pas a un rechargement : un rafraichissement
   rouvrait le chat et les reglages alors qu'un enfant tenait l'appareil. */
check('mode Enfant : l\'etat est conserve', () => {
  const src = jsBlocks.join('\n');
  if (!/progress\.kidsMode\s*=\s*true/.test(src)) return 'l\'activation n\'est pas enregistree';
  if (!/progress\.kidsMode\s*=\s*false/.test(src)) return 'la desactivation n\'est pas enregistree';
  return /kidsMode = !!\(typeof progress/.test(src) || 'l\'etat n\'est pas relu au demarrage';
});

check('mode Enfant : l\'interface est restauree au chargement', () => {
  const src = jsBlocks.join('\n');
  return /progress\.kidsMode && typeof toggleKidsMode/.test(src) ||
    'aucune restauration branchee sur DOMContentLoaded';
});

check('mode Enfant : la sortie reste protegee', () => {
  const b = functionBody('_kidsExitCheck');
  return /_kidsExitAnswer/.test(b) || 'la verification de la reponse a disparu';
});

/* L'echelle de la carte de chaleur doit monter du sombre au clair sans
   redescendre, sinon deux intensites differentes paraissent identiques. */
check('carte de chaleur : luminance strictement croissante', () => {
  const m = jsBlocks.join('\n').match(/const HEATMAP_SCALE = \[([^\]]+)\]/);
  if (!m) return 'echelle introuvable';
  const cols = m[1].split(',').map(x => x.trim().replace(/'/g, ''));
  const lum = h => {
    const c = [1,3,5].map(i => parseInt(h.slice(i,i+2),16)/255)
      .map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
    return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2];
  };
  for (let i = 1; i < cols.length; i++) {
    if (lum(cols[i]) <= lum(cols[i-1])) {
      return 'la luminance redescend en ' + cols[i] + ' (palier ' + i + ')';
    }
  }
  return true;
});

check('carte de chaleur : le compteur reste lisible sur fond sombre', () => {
  const b = functionBody('buildGameHeatmapSVG');
  return /_heatIsLight/.test(b) || 'l\'encre du compteur ne s\'adapte pas au fond';
});

check('carte de chaleur : la legende chiffre la distribution', () => {
  const b = functionBody('heatmapLegend');
  return /counts/.test(b) && /cases jouees/.test(b) ||
    'la legende est redevenue purement qualitative';
});

/* Le mode Enfant est une fonction de PROTECTION : un parent doit pouvoir
   savoir qu'elle existe sans lire le code. Elle n'etait documentee nulle part. */
check('mode Enfant : documente dans le README', () => {
  const rd = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  if (!/##\s*Mode Enfant/.test(rd)) return 'aucune section dediee';
  if (!/Param[eè]tres/.test(rd)) return 'le chemin d\'acces n\'est pas indique';
  return /addition|sortie/i.test(rd) || 'la protection de sortie n\'est pas mentionnee';
});

check('le README suit les fonctionnalites livrees', () => {
  const rd = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
  const manquants = [
    ['APGN', /APGN/],
    ['partie par code', /[Pp]artie par code/],
    ['puzzle du jour', /[Pp]uzzle du jour/],
    ['suite de tests', /tests\/regression\.js/]
  ].filter(e => !e[1].test(rd)).map(e => e[0]);
  return manquants.length === 0 || ('non documente : ' + manquants.join(', '));
});

/* ── 4. Garde-fous de credibilite ─────────────────────────────────── */

console.log('\nGarde-fous');

/* Le nombre 1766 etait un ELO invente, affiche comme un fait a neuf
   endroits. Tant qu'aucune partie n'est conservee, il n'y a pas de
   classement a montrer : « non classe » est la seule reponse honnete.
   Les commentaires sont ignores — celui qui documente le retrait cite
   forcement l'ancienne valeur. */
check('aucun ELO fictif code en dur (1766)', () => {
  const code = HTML
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  return !/\b1766\b/.test(code) || 'la valeur 1766 est reapparue';
});

/* Le compte du joueur ne doit porter aucune statistique inventee. */
check('aucune statistique de compte inventee', () => {
  const code = HTML.replace(/\/\*[\s\S]*?\*\//g, ' ');
  const bad = ['games:247', 'wins:133', 'puzzles:89'].filter(x => code.includes(x));
  return bad.length === 0 || ('valeurs fictives : ' + bad.join(', '));
});

/* Les profils de comparaison sont fictifs : la page doit le dire. */
check('les profils de demonstration sont annonces comme tels', () =>
  /exemples de d[ée]monstration/i.test(HTML) ||
  'la page Comparer presente des profils inventes sans le signaler');

check('le backend reste dormant', () =>
  !/BACKEND\s*\.?\s*enabled\s*[:=]\s*true/.test(HTML) ||
  'BACKEND.enabled est passe a true');

check('aucun ${...} orphelin dans le HTML statique', () => {
  const htmlOnly = HTML.replace(re, '');
  const bad = htmlOnly.match(/\$\{[^}]{1,60}\}/g);
  return !bad || ('interpolations brutes affichees : ' + bad.slice(0, 3).join(', '));
});

/* ── Bilan ────────────────────────────────────────────────────────── */

const total = passed + failures.length;
console.log('\n' + '─'.repeat(52));
console.log('  ' + passed + ' / ' + total + ' tests passes');
if (failures.length) {
  console.log('\n  Echecs :');
  failures.forEach(f => console.log('   · ' + f));
  console.log('');
  process.exit(1);
}
console.log('  Tout passe.\n');
process.exit(0);
