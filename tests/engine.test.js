/* ═══════════════════════════════════════════════════════════════
   TESTS UNITAIRES DU MOTEUR

   Ce que ces tests couvrent, et pourquoi ceux-la :

   1. Geometrie      — le plateau hexagonal et son voisinage reciproque.
   2. Regles         — sumito legaux et illegaux, ejection. Le coeur du jeu.
   3. Camps          — monCamp()/estMonTour() pour les DEUX couleurs. C'est la
                       famille de bugs "noir = moi" : le code suppose parfois
                       que le joueur tient les noirs, ce qui casse tout pour un
                       joueur blanc. Plusieurs bugs reels de cette famille ont
                       ete trouves a la main faute de tests ; ceux-ci existent
                       pour que ca n'arrive plus en silence.
   4. Non-regression — le bug d'annulation en blanc (requestUndo comparait a
                       'black' en dur : un joueur blanc ne pouvait JAMAIS
                       annuler contre l'IA).
   5. Interfaces     — AbaTB et AbaSolve, figees d'apres l'objet charge.

   Executer : node --test "tests/*.test.js"
   ═══════════════════════════════════════════════════════════════ */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { chargerMoteur, poserCases } = require('./harness');

const ctx = chargerMoteur();

/* ─── 1. Geometrie ─── */

test('le plateau compte 61 cases', () => {
  let n = 0;
  for (let r = 0; r < 9; r++) n += ctx.ROWS[r];
  assert.strictEqual(n, 61);
});

test('les rangees suivent la forme hexagonale 5-6-7-8-9-8-7-6-5', () => {
  assert.deepStrictEqual(Array.from(ctx.ROWS), [5, 6, 7, 8, 9, 8, 7, 6, 5]);
});

test('le voisinage est reciproque : si A voit B, B voit A', () => {
  let verifies = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < ctx.ROWS[r]; c++) {
      const ax = ctx.rcToAxial(r, c);
      for (const d of ctx.AX_DIRS) {
        const v = ctx.axialToRc(ax.q + d.q, ax.r + d.r);
        if (!v) continue;
        const vax = ctx.rcToAxial(v.r, v.c);
        const retour = ctx.axialToRc(vax.q - d.q, vax.r - d.r);
        assert.ok(retour && retour.r === r && retour.c === c,
          `voisinage non reciproque depuis ${r},${c}`);
        verifies++;
      }
    }
  }
  assert.ok(verifies > 250, 'trop peu de paires verifiees : ' + verifies);
});

/* ─── 2. Regles ─── */

test('un deplacement simple vers une case vide est legal', () => {
  poserCases(ctx, [[4, 4]], []);
  const coups = ctx.getAllMovesForColor('black');
  assert.ok(coups.length > 0, 'une bille isolee doit pouvoir bouger');
  const info = ctx.validateMove(coups[0].cells, coups[0].dir, 'black');
  assert.ok(info && info.valid);
});

test('sumito 2 contre 1 : legal', () => {
  poserCases(ctx, [[4, 2], [4, 3]], [[4, 4]]);
  const info = ctx.validateMove([{ r: 4, c: 2 }, { r: 4, c: 3 }], { q: 1, r: 0 }, 'black');
  assert.ok(info && info.valid, 'le sumito 2v1 doit etre accepte');
  assert.strictEqual(info.type, 'push');
});

test('sumito 1 contre 1 : illegal (pas de superiorite)', () => {
  poserCases(ctx, [[4, 3]], [[4, 4]]);
  const info = ctx.validateMove([{ r: 4, c: 3 }], { q: 1, r: 0 }, 'black');
  assert.ok(!info || !info.valid, 'pousser a egalite doit etre refuse');
});

test('sumito 2 contre 2 : illegal (pas de superiorite)', () => {
  poserCases(ctx, [[4, 1], [4, 2]], [[4, 3], [4, 4]]);
  const info = ctx.validateMove([{ r: 4, c: 1 }, { r: 4, c: 2 }], { q: 1, r: 0 }, 'black');
  assert.ok(!info || !info.valid, 'pousser 2 contre 2 doit etre refuse');
});

test('sumito 3 contre 2 : legal', () => {
  poserCases(ctx, [[4, 0], [4, 1], [4, 2]], [[4, 3], [4, 4]]);
  const info = ctx.validateMove(
    [{ r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 }], { q: 1, r: 0 }, 'black');
  assert.ok(info && info.valid, 'le sumito 3v2 doit etre accepte');
});

test('un groupe de 4 billes ne peut pas se deplacer en ligne', () => {
  poserCases(ctx, [[4, 0], [4, 1], [4, 2], [4, 3]], []);
  const info = ctx.validateMove(
    [{ r: 4, c: 0 }, { r: 4, c: 1 }, { r: 4, c: 2 }, { r: 4, c: 3 }], { q: 1, r: 0 }, 'black');
  assert.ok(!info || !info.valid, 'un groupe de 4 doit etre refuse');
});

test('les 162 motifs de mat au bord sont tous des ejections valides', () => {
  // Engendres par geometrie (54 directions sortantes x 3 formes de sumito),
  // puis valides un a un par le moteur : aucun n'est ecrit a la main.
  const motifs = ctx.gymBuildMatPatterns();
  assert.strictEqual(motifs.length, 162, 'le generateur doit produire 162 motifs');
  for (const p of motifs) {
    poserCases(ctx, p.noirs.map(k => p.ligne[k]), p.blancs.map(k => p.ligne[k]));
    const cells = p.noirs.map(k => ({ r: p.ligne[k][0], c: p.ligne[k][1] }));
    const info = ctx.validateMove(cells, p.dir, 'black');
    assert.ok(info && info.valid && info.ejection,
      'motif de mat non reconnu comme ejection en ' + JSON.stringify(p.ligne[0]));
  }
});

test('une ejection incremente le bon compteur', () => {
  const p = ctx.gymBuildMatPatterns()[0];
  poserCases(ctx, p.noirs.map(k => p.ligne[k]), p.blancs.map(k => p.ligne[k]));
  const cells = p.noirs.map(k => ({ r: p.ligne[k][0], c: p.ligne[k][1] }));
  const info = ctx.validateMove(cells, p.dir, 'black');
  ctx.applyMove({ cells, dir: p.dir, info }, 'black');
  assert.strictEqual(ctx.CapturedByBlack.get(), 1, 'noir doit avoir capture 1 bille');
  assert.strictEqual(ctx.CapturedByWhite.get(), 0, 'blanc ne doit rien avoir capture');
});

/* ─── 3. Camps : la famille de bugs "noir = moi" ─── */

test('monCamp() suit HumanColor en mode IA, pour les deux couleurs', () => {
  ctx.GameMode.set('ai');
  ctx.HumanColor.set('black');
  assert.strictEqual(ctx.monCamp(), 'black');
  ctx.HumanColor.set('white');
  assert.strictEqual(ctx.monCamp(), 'white', 'un joueur blanc ne doit pas etre ramene aux noirs');
});

test('aiColor() est toujours l oppose du joueur', () => {
  ctx.GameMode.set('ai');
  ctx.HumanColor.set('black');
  assert.strictEqual(ctx.aiColor(), 'white');
  ctx.HumanColor.set('white');
  assert.strictEqual(ctx.aiColor(), 'black');
});

test('estMonTour() est correct pour un joueur NOIR', () => {
  ctx.GameMode.set('ai'); ctx.HumanColor.set('black');
  ctx.CurrentTurn.set('black');
  assert.strictEqual(ctx.estMonTour(), true);
  ctx.CurrentTurn.set('white');
  assert.strictEqual(ctx.estMonTour(), false);
});

test('estMonTour() est correct pour un joueur BLANC', () => {
  ctx.GameMode.set('ai'); ctx.HumanColor.set('white');
  ctx.CurrentTurn.set('white');
  assert.strictEqual(ctx.estMonTour(), true, 'le joueur blanc doit reconnaitre son tour');
  ctx.CurrentTurn.set('black');
  assert.strictEqual(ctx.estMonTour(), false);
});

/* ─── 4. Non-regression : bug d'annulation en blanc ─── */

test('NON-REGRESSION : un joueur BLANC peut demander une annulation', () => {
  // Bug reel : requestUndo() testait `requester !== 'black'` en dur. Un humain
  // tenant les blancs recevait "Seul vous pouvez demander une annulation"
  // alors qu'il EST le joueur -- la fonction lui etait inaccessible.
  const messages = [];
  ctx.showToast = m => messages.push(String(m));
  ctx.confirm = () => true;
  ctx.drawBoard = () => {}; ctx.updateStatus = () => {};
  ctx.tournamentGame = null; ctx.tournamentActiveRules = null;

  function demander(humain, trait) {
    messages.length = 0;
    ctx.GameMode.set('ai');
    ctx.HumanColor.set(humain);
    ctx.CurrentTurn.set(trait);
    ctx.GameOver.set(false);
    ctx.undoStack = [{ board: {}, capturedByBlack: 0, capturedByWhite: 0,
                       moveCount: 1, currentTurn: trait, player: trait }];
    ctx.requestUndo();
    return messages.join(' | ');
  }

  // l'humain vient de jouer : c'est a l'adversaire, il peut donc demander
  const blanc = demander('white', 'black');
  assert.ok(!/Seul vous pouvez/.test(blanc),
    'le joueur blanc ne doit pas etre refuse : ' + blanc);

  const noir = demander('black', 'white');
  assert.ok(!/Seul vous pouvez/.test(noir),
    'le joueur noir ne doit pas regresser : ' + noir);
});

/* ─── 5. Interfaces publiques ─── */

test('la tablebase expose bien son interface publique', () => {
  // Interface REELLE, relevee dans l'objet charge et non supposee :
  //   probe(...)    fonction  — le point d'entree de consultation
  //   loadFrom(...) fonction  — decodage des tables embarquees
  //   ready         BOOLEEN   — un drapeau, pas une fonction
  //   _internals    objet     — expose pour les outils, pas pour le jeu
  // Deux premieres versions de ce test se sont trompees (un .lookup()
  // inexistant, puis ready() traite comme une fonction). D'ou ce rappel :
  // verifier l'objet, pas sa reputation.
  assert.ok(ctx.AbaTB, 'AbaTB doit exister');
  assert.strictEqual(typeof ctx.AbaTB.probe, 'function', 'probe() est le point d entree');
  assert.strictEqual(typeof ctx.AbaTB.loadFrom, 'function');
  assert.strictEqual(typeof ctx.AbaTB.ready, 'boolean', 'ready est un drapeau, pas une fonction');
  assert.ok(ctx.AbaTB._internals && typeof ctx.AbaTB._internals === 'object');
});

test('le solveur de preuves expose son interface complete', () => {
  // Piege de methode, vecu : chercher /AbaSolve\.[a-z]+/ dans index.html ne
  // donne QUE les points d'appel. threat() y est absent — non parce qu'il
  // n'existe pas, mais parce que rien ne l'appelle encore. Conclure de cette
  // absence qu'il n'existe pas est faux. Lire l'objet charge.
  assert.ok(ctx.AbaSolve, 'AbaSolve doit exister');
  for (const nom of ['win', 'gain', 'threat', 'describe', 'ready']) {
    assert.strictEqual(typeof ctx.AbaSolve[nom], 'function',
      'AbaSolve.' + nom + ' doit etre une fonction');
  }
});

/* ─── 6. Integrite des dispositions ─── */

test('les dispositions de depart ont toutes le meme nombre de billes par camp', () => {
  const cles = Object.keys(ctx.LAYOUTS);
  assert.ok(cles.length >= 20, 'au moins 20 dispositions attendues, trouve ' + cles.length);
  for (const k of cles) {
    const L = ctx.LAYOUTS[k];
    assert.strictEqual(L.black.length, L.white.length,
      'disposition desequilibree : ' + k + ' (' + L.black.length + ' vs ' + L.white.length + ')');
  }
});

test('aucune disposition ne place deux billes sur la meme case', () => {
  for (const k of Object.keys(ctx.LAYOUTS)) {
    const vues = new Set();
    for (const p of ctx.LAYOUTS[k].black.concat(ctx.LAYOUTS[k].white)) {
      const cle = p[0] + ',' + p[1];
      assert.ok(!vues.has(cle), 'case dupliquee dans ' + k + ' : ' + cle);
      vues.add(cle);
    }
  }
});

/* ─── 7. Non-regression : selection pendant le tour de l'IA ─── */

test('NON-REGRESSION : on ne peut pas selectionner les billes adverses pendant que l IA reflechit', () => {
  // Bug reel signale en partie : pendant le calcul de l'IA, le joueur pouvait
  // selectionner ET deplacer les billes ADVERSES. handleClick comparait la
  // case au camp AU TRAIT (`piece === CurrentTurn.get()`), or pendant le tour
  // de l'IA ce camp est le sien. La garde existait sur le clic canevas et le
  // glisser-deposer, mais pas sur les autres entrees (clavier/ARIA, vue 1D,
  // plateau du commentateur) : elle est desormais dans handleClick lui-meme.
  ctx.drawBoard = () => {}; ctx.updateStatus = () => {}; ctx.showToast = () => {};
  ctx.soundSelect = () => {};
  const poser = () => { poserCases(ctx, [[6,2],[6,3]], [[2,2],[2,3]]); ctx.selected = []; };

  poser();
  ctx.GameMode.set('ai'); ctx.HumanColor.set('black'); ctx.CurrentTurn.set('white');
  ctx.handleClick(2, 2);
  assert.strictEqual(ctx.selected.length, 0, 'aucune bille adverse selectionnable pendant le tour de l IA');

  poser();
  ctx.CurrentTurn.set('black');
  ctx.handleClick(6, 2);
  assert.strictEqual(ctx.selected.length, 1, 'le joueur doit pouvoir selectionner les siennes a son tour');
});

test('NON-REGRESSION : la garde vaut aussi pour un joueur BLANC', () => {
  ctx.drawBoard = () => {}; ctx.updateStatus = () => {}; ctx.soundSelect = () => {};
  poserCases(ctx, [[6,2],[6,3]], [[2,2],[2,3]]); ctx.selected = [];
  ctx.GameMode.set('ai'); ctx.HumanColor.set('white'); ctx.CurrentTurn.set('black');
  ctx.handleClick(6, 2);
  assert.strictEqual(ctx.selected.length, 0, 'pas de selection pendant le tour de l IA');
  ctx.CurrentTurn.set('white');
  ctx.handleClick(2, 2);
  assert.strictEqual(ctx.selected.length, 1, 'le joueur blanc selectionne bien les siennes');
});

test('le mode 2 joueurs sur le meme ecran n est PAS bloque par la garde', () => {
  // La garde ne s'applique qu'au mode IA : a deux sur un ecran, les deux
  // camps jouent a tour de role et doivent rester selectionnables.
  ctx.drawBoard = () => {}; ctx.updateStatus = () => {}; ctx.soundSelect = () => {};
  poserCases(ctx, [[6,2],[6,3]], [[2,2],[2,3]]); ctx.selected = [];
  ctx.GameMode.set('local');
  ctx.CurrentTurn.set('black');
  ctx.handleClick(6, 2);
  assert.strictEqual(ctx.selected.length, 1, 'noir joue');
  ctx.selected = [];
  ctx.CurrentTurn.set('white');
  ctx.handleClick(2, 2);
  assert.strictEqual(ctx.selected.length, 1, 'blanc joue aussi');
});
