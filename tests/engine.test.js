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

/* ─── 8. Notifications locales ─── */

test('les preferences de notification persistent vraiment', () => {
  // Avant : les trois interrupteurs ne sauvegardaient RIEN -- le bouton
  // "Enregistrer" se contentait d'afficher un message de confirmation.
  ctx.showToast = () => {};
  ctx.localStorage.removeItem('aba_notif_prefs');
  assert.strictEqual(ctx.notifPrefsCharger().monTour, true, 'actif par defaut');
  ctx.notifPrefsEnregistrer({ monTour: false, finPartie: true });
  const r = ctx.notifPrefsCharger();
  assert.strictEqual(r.monTour, false, 'le choix doit survivre a la relecture');
  assert.strictEqual(r.finPartie, true);
});

test('aucune notification si l onglet est au premier plan', () => {
  // Prevenir quelqu'un qui regarde deja l'ecran serait du bruit pur.
  ctx.showToast = () => {};
  ctx.notifPrefsEnregistrer({ monTour: true, finPartie: true });
  const envoyees = [];
  ctx.Notification = function (t, o) { envoyees.push({ t, o }); };
  ctx.Notification.permission = 'granted';
  ctx.document.hidden = false;
  assert.strictEqual(ctx.notifierSiAbsent('monTour', 'T', 'C'), false);
  assert.strictEqual(envoyees.length, 0);
  ctx.document.hidden = true;
  assert.strictEqual(ctx.notifierSiAbsent('monTour', 'T', 'C'), true);
  assert.strictEqual(envoyees.length, 1, 'mais bien envoyee en arriere-plan');
});

test('rien sans permission, rien si la preference est coupee', () => {
  ctx.showToast = () => {};
  const envoyees = [];
  ctx.Notification = function (t, o) { envoyees.push({ t, o }); };
  ctx.document.hidden = true;

  ctx.Notification.permission = 'denied';
  ctx.notifPrefsEnregistrer({ monTour: true, finPartie: true });
  assert.strictEqual(ctx.notifierSiAbsent('monTour', 'T', 'C'), false, 'permission refusee');

  ctx.Notification.permission = 'granted';
  ctx.notifPrefsEnregistrer({ monTour: false, finPartie: true });
  assert.strictEqual(ctx.notifierSiAbsent('monTour', 'T', 'C'), false, 'preference coupee');
  assert.strictEqual(ctx.notifierSiAbsent('finPartie', 'T', 'C'), true, 'l autre reste active');
});

test('aucune exception sur un navigateur sans API Notification', () => {
  ctx.showToast = () => {};
  ctx.notifPrefsEnregistrer({ monTour: true, finPartie: true });
  ctx.Notification = undefined;
  assert.doesNotThrow(() => ctx.notifierSiAbsent('monTour', 'T', 'C'));
  assert.strictEqual(ctx.notifierSiAbsent('monTour', 'T', 'C'), false);
});

test("NON-REGRESSION : l evenement public s appelle bien 'gameOver'", () => {
  // L'encapsulation de gameOver avait remplace le nom DANS le litteral :
  // _emitAbaEvent('GameOver.get()', ...) au lieu de 'gameOver'. L'evenement
  // public documente etait donc emis sous un nom errone.
  const src = ctx.triggerWin.toString();
  assert.ok(src.indexOf("_emitAbaEvent('gameOver'") !== -1, 'nom d evenement abime');
  assert.ok(src.indexOf("GameOver.get()'") === -1, 'aucun accesseur ne doit trainer dans un litteral');
});

/* ─── 10. Detection de plateau par photo : separation plateau/bille ─── */

test("NON-REGRESSION : bille isolee vue sur plateau gris (l'Abalone standard)", () => {
  // L'ancienne version separait plateau et bille par la CHALEUR de teinte
  // (r-b), qui suppose un plateau chaud comme le bois. Simule sur du
  // plastique gris -- le plateau Abalone standard -- la bille reelle etait
  // manquee a quasiment chaque photo (0 a 2/20 essais dans la simulation
  // qui a motive ce correctif).
  let seed = 54321;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const bruit = (v, a) => Math.max(0, Math.min(255, v + (rnd()*2-1)*a));
  const GRIS = { r:125, g:125, b:130 }, NOIR = { r:30, g:30, b:32 }, BLANC = { r:230, g:228, b:220 };
  function genere(billes) {
    const s = [];
    for (let k = 0; k < 61; k++) {
      const vrai = billes[k] || 'empty';
      const base = vrai === 'black' ? NOIR : vrai === 'white' ? BLANC : GRIS;
      const r = bruit(base.r,12), g = bruit(base.g,12), b = bruit(base.b,12);
      s.push({ key:'k'+k, r, g, b, lum:0.299*r+0.587*g+0.114*b, vrai });
    }
    return s;
  }
  function parfait(billes, essais) {
    let ok = 0;
    for (let t = 0; t < essais; t++) {
      const s = genere(billes);
      const lab = ctx.detClassify(s);
      if (s.every(x => lab[x.key] === x.vrai)) ok++;
    }
    return ok;
  }
  assert.strictEqual(parfait({ 30:'black' }, 30), 30, 'bille isolee, 30 essais');
  assert.strictEqual(parfait({ 10:'black',11:'black',40:'white',41:'white' }, 30), 30,
    'noir ET blanc ensemble : un seuil unique engloutissait le groupe le moins contraste');
  const depart = {}; for (let i=0;i<14;i++) depart[i]='black'; for (let i=47;i<61;i++) depart[i]='white';
  assert.strictEqual(parfait(depart, 30), 30, 'position de depart complete, 14v14');
  assert.strictEqual(parfait({}, 30), 30, 'plateau vide : aucune bille fantome');
});

/* ─── 11. Balayage du menu sur telephone ─── */

test('balayage : ouverture, fermeture, et rien dans le mauvais sens', () => {
  const D = ctx.swipeDecision;
  assert.strictEqual(D(120, 10, 250, false, false), 'ouvrir');
  assert.strictEqual(D(-120, 10, 250, true, false), 'fermer');
  assert.strictEqual(D(120, 0, 250, true, false), null, 'menu deja ouvert');
  assert.strictEqual(D(-120, 0, 250, false, false), null, 'menu deja ferme');
});

test('balayage : un tap, un defilement vertical ou un glisse lent ne declenchent rien', () => {
  const D = ctx.swipeDecision;
  assert.strictEqual(D(40, 0, 150, false, false), null, 'trop court');
  assert.strictEqual(D(70, 200, 300, false, false), null, 'defilement vertical');
  assert.strictEqual(D(150, 0, 900, false, false), null, 'trop lent (selection de texte)');
});

test('balayage : en droite-a-gauche le menu est a droite, les sens s inversent', () => {
  const D = ctx.swipeDecision;
  assert.strictEqual(D(-120, 0, 250, false, true), 'ouvrir');
  assert.strictEqual(D(120, 0, 250, true, true), 'fermer');
});

test('balayage : jamais depuis une zone qui gere deja ses propres glissements', () => {
  // Le vrai risque : ouvrir le menu en plein recadrage photo ou en faisant
  // pivoter le plateau 3D. Elements factices, style calcule simule.
  const el = (tag, o = {}) => {
    const a = o.attrs || {};
    return { tagName: tag, parentElement: o.parent || null, scrollWidth: o.sw || 100,
      clientWidth: o.cw || 100, _style: o.style || {},
      hasAttribute: n => n in a, getAttribute: n => (n in a ? a[n] : null) };
  };
  ctx.getComputedStyle = n => n._style || {};
  const E = ctx.swipeCibleExclue, body = el('BODY');
  assert.strictEqual(E(el('DIV', { parent: body })), false, 'zone ordinaire autorisee');
  assert.strictEqual(E(el('CANVAS', { parent: body })), true, 'canvas (3D, AR, puzzles)');
  assert.strictEqual(E(el('INPUT', { parent: body })), true, 'champ de saisie');
  const cadre = el('DIV', { parent: body, attrs: { 'data-no-swipe': '' } });
  assert.strictEqual(E(el('DIV', { parent: cadre })), true, 'cadre de recadrage et sa poignee');
  assert.strictEqual(E(el('DIV', { parent: el('DIV', { parent: body, style: { touchAction: 'none' } }) })), true, 'touch-action:none');
  assert.strictEqual(E(el('TD', { parent: el('DIV', { parent: body, style: { overflowX: 'auto' }, sw: 900, cw: 360 }) })), true, 'defilement horizontal');
});

/* ─── 12. Import d'un tournoi dans l'historique : ton cote, et tes statistiques ─── */

// Trois parties reelles du Yearly Abalone Arena (PlayStrategy, 18/09/2026),
// converties et verifiees coup par coup : ocj94 en blanc, ocj94 en noir, et
// une partie entre deux autres joueurs.
const ECHANTILLON_TOURNOI = "# 2026-09-18 \u00b7 Belgian Daisy \u00b7 Blanc gagne (6 \u00e9jections) \u00b7 PST-Greedy-Tom vs ocj94\n1. i9h8 i5h5 2. i8h7 h5g5 3. h9h8 h4g4 4. f6g6 g4f4 5. i6h6 f4e4 6. f6f7 f5f6 7. h8h7 h4g4 8. h6g6 g4g5f4 9. g8f8 d4e5c4 10. b3c3 f5e5 11. a1b1 a4b4 12. a2b2 b4c5 13. g6h7g5 d6d5 14. d2c2 f4e4f3 15. h6g6 f3e3 16. c1d1 e6e5 17. e1f2 d3e3 18. h5h6 d5e5 19. a2b3 c3d4 20. c4b4 b6c6 21. g7h8h7 d5d4 22. b1c2c1 a5b5 23. d2e2 c6d6 24. f7e7 d6e6 25. h6g5 e4f5 26. i8h8 d5e5 27. b3b4 b6c6 28. b4a4 c5c6d5 29. c1d1 f5g5 30. i5h4 f6g6 31. a4b4 g6h6 32. h4g4 d3e4 33. d1e2c1 d5c4 34. e1f2d1 c4d4 35. g4g3 g5f4 36. c1c2 e3f3 37. h4i5 e5e4 38. c2c3 f4e3 39. d1e2e1 e4e3 40. e1d1 h7h6 41. b2c2 c1d2 42. c2c3 d2e2 43. h8i9 f2g3\n\n# 2026-09-18 \u00b7 Belgian Daisy \u00b7 Noir gagne (6 \u00e9jections) \u00b7 ocj94 vs SOLFAREMI\n1. a1b2 a5b5 2. a2b3 b5c5 3. b2c3 c5d5 4. i8h7 b6c6 5. g8g7 g3g4f3 6. c4d4 d5d6e6 7. d4e4 h5g4 8. c3b3d4 e7e6 9. b1c2 g4g3 10. c4c3 f3e2 11. d4d3 e2f2 12. d3d2 e6e5 13. c2d2 g3i5f3 14. g7g6 g3f3 15. h9h8 f6e5 16. h8h7 e5d4 17. h7h6 a4b4 18. f2g3 e4e3 19. e1f2 f3e2 20. g3f3 e2e3 21. f2e2 d1c1 22. b2c2 c6c5 23. i9i8 c1b1 24. i8h7 b1b2 25. d2c2 a2b3 26. g6h6 c5c4 27. c1d1 b4b3 28. b1c1 c3c2 29. h6g5 c1c2 30. e2e3 b3c3 31. h4h5 c4c3 32. h7g6 b2b1 33. g4f4 e5d5 34. h5g5 d5c4 35. f3f4 c4b3 36. d1e2 a2b3a1 37. g5f5 a1b1 38. h6g6 c3b2 39. g3f3 e3d3 40. e2e3 d1d2 41. f4e4 a1b1 42. i6h6 c4b3 43. h6g5 b3a2 44. g5f4 a2b3 45. e6d5 b3c3 46. e5e4 b2c3 47. g3f3 b1c2a1 48. f3e3 b3a3b4 49. g6g5 d2e2 50. e5e4 e1f2 51. f4g5f3 g3h4 52. f3e2\n\n# 2026-09-18 \u00b7 Belgian Daisy \u00b7 Noir gagne (6 \u00e9jections) \u00b7 SOLFAREMI vs PST-Greedy-Tom\n1. a1b2 i5h5 2. a2b3 i6h6 3. c2c3 a5b5 4. b1c2 h6g5 5. g7g8f6 h4g4 6. f6f7e5 e4f5 7. i8h8 f4g5 8. h9g8 c5c7d6 9. b3c3 g4g5 10. c4d4 h6h7 11. g8h9f8 g7h8 12. f8f7 g5f5g4 13. g9f8 i9i8 14. f8f7 h8h7 15. f7f6 f3g4f2 16. d5e5 b4b5c5 17. c3d3 d8d7 18. b2c2 f2e1 19. g5f5 d6c5 20. d3d4 b4c5 21. f5e5 a5b6 22. c2d3 b6c7 23. f4e4 b5b6 24. e3d3 c7d7 25. c3c4 c7b6 26. e4e5 a4a3 27. e5d5 h7i8g7 28. d5c5 a3a2 29. a5b5 e8e9 30. f7e7 e1e2 31. c4c5 g3f2 32. b5c6 f2e2f3 33. e7e8 f3f4 34. e9e8 h6g6g5 35. d3d4e4 g7g6 36. d2d3 e3f4 37. d3d4 f4g4 38. c7d7 h8h7 39. f7f6 h5h4 40. d5e5 h5g4 41. d7e7 f3f4e2 42. f7f6 g4g3 43. e6e5 e1e2d1 44. d4e4 h4h5 45. e5f5 a2b2 46. e3f4 i7h7i8 47. f5g5 g3f2 48. i5h5 g6g7 49. h6g5 d1d2c1 50. f6f5 f2e1 51. h5g4 c1d2 52. g5f4 c1c2 53. e4e3 g7h8g6 54. g4f4 c2c3 55. f3e3 b2b3 56. e7d7 c4b4 57. c6c5 c3b2 58. f4e4 b2a2 59. e3d3 a2b3 60. e1e2 b3c4 61. e2e3 g6h6 62. d7e7 d8d7 63. e6e8f6 h6g6 64. e3e4 g6i8g7 65. f6e6 h8i9h7 66. f8f7 c6b5 67. d6c5 a3a4 68. f6e6 d7c6 69. f7f6 c6d7 70. f6e6 b6a5 71. d3c3 d5c4 72. a2a3 d7e8 73. f5e5 g7g6 74. e5d5";

function _importerEchantillon(pseudo) {
  const els = {};
  const faux = () => ({ value: '', style: {}, textContent: '', innerHTML: '',
    classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
    appendChild(){}, remove(){}, querySelectorAll(){ return []; } });
  const origine = ctx.document.getElementById;
  ctx.document.getElementById = id => (els[id] || (els[id] = faux()));
  els['bulk-history-text'] = Object.assign(faux(), { value: ECHANTILLON_TOURNOI });
  els['bulk-history-pseudo'] = Object.assign(faux(), { value: pseudo });
  ctx._renderHistoryList = () => {};
  ctx.localStorage.setItem('abaGameHistory', '[]');
  ctx._doBulkHistoryImport();
  ctx.document.getElementById = origine;
  return ctx.getGameHistory();
}

test('import avec pseudo : tes parties de TON cote, meme quand tu jouais blanc', () => {
  // Avant : humanColor 'black' code en dur -- une victoire en blanc etait
  // enregistree comme une defaite en noir.
  const h = _importerEchantillon('ocj94');
  const miennes = h.filter(e => !e.spectateur);
  assert.strictEqual(miennes.length, 2);
  assert.ok(miennes.some(e => e.humanColor === 'white'), 'la partie jouee en blanc');
  assert.ok(miennes.some(e => e.humanColor === 'black'), 'la partie jouee en noir');
  assert.ok(miennes.every(e => e.winner === e.humanColor), 'deux victoires, de ton point de vue');
});

test("import avec pseudo : la partie d'autres joueurs est consultee, hors statistiques", () => {
  const h = _importerEchantillon('ocj94');
  assert.strictEqual(h.filter(e => e.spectateur).length, 1);
  assert.strictEqual(ctx.getMesParties().length, 2);
  const s = ctx.computeColorStats();
  assert.strictEqual(s.black.games + s.white.games, 2, 'les stats ne comptent que tes parties');
});

test('import sans pseudo : comportement historique conserve', () => {
  const h = _importerEchantillon('');
  assert.strictEqual(h.filter(e => e.spectateur).length, 0);
  assert.strictEqual(h.length, 3);
});

/* ─── 13. Import PlayStrategy : conversion de notation verifiee ─── */

// Deux parties REELLES du Yearly Abalone Arena, en notation PlayStrategy brute.
const PS_BRUTES = ["a1d4 i5f5 a2c4 i6g6 c2c7 a5d5 b1c2 h6f4 g8f6 h4e4 f7e5 e4i8 i8g8 f4h6 h9f7 c5d8 b3d3 g4g7 c4e4 h6h9 h9f8 g7i9 f8f6 f5g4 g9f8 i9i8 f8f5 h8h6 f7f3 g4f2 d5g5 b4c6 c3e3 d8d5 b2d2 f2e1 g5b5 d6b4 d3d6 b4e7 f5a5 a5c7 c2d3 b6d8 f4c4 b5b6 e3c3 c7f7 c3c7 c7a5 e4e8 a4a3 e5b5 i8g7 d5a5 a3a2 a5d5 e8e9 f7c7 e1e2 c4c7 g3f2 b5e8 f2e3 e7e9 f3f4 e9e7 h6f5 d3e5 g7g6 d2d3 e3h6 d3d4 f4g4 c7f7 h8h7 f7f4 h5h4 d5h5 h5f3 d7f7 f4e2 f7f4 g4g3 e6e1 e1d2 d4g4 h4h5 e5i5 a2b2 e3i7 i7h8 f5i5 g3f2 i5f5 g6g7 h6e3 d1c2 f6f3 f2e1 h5e2 c1d2 g5c1 c1c3 e4e1 h8g6 g4e4 c2c4 f3d3 b2b3 e7d7 c4b4 c6c4 c3b2 f4d4 b2a2 e3c3 a2d5 e1e3 b3e6 e2e5 g6h6 d7e7 d8d7 e8f6 h6g6 e3e6 g6i9 f6c6 i9h7 f8f6 c6b5 d6a3 a3a4 f6d6 d7c6 f7f6 c6d7 f6c6 b6a5 d3b3 d5a2 a2a3 d7e8 f5d5 g7g6 e5a5", "i9f6 i5f5 i8g6 h4f4 a1c1 a4c4 a2d5 f4e5 h9h4 h4f4 g8g3 g3f3 h8h4 g4d4 f6i6 h4g4 c2c7 b6d6 c3c7 c7d7 b1b6 f4a4 b2b6 e4a4 c5a5 d6c5 b5e8 e5b5 g7g3 g3e3 c6f9 f9f8 b3b2 d4a4 e8d6 f8f7 h6f4 f3d3 d6d7 e3d4 f4f5 f7e6 d7e8 d5a5 e8e5 a5d5 i6h6 c4f7 e7g8 a4c4 b2b1 b6b3 b1d1 e5c3 h6f6 b5e5 h7h6 c3g7 g8h7 b4d6 f8g9 c4f7 h6f4 d6e7 h7h6 e7f8 g4f3 b3c4 g9h9 c4b4 h9h7 b4d6 g6g4 d6g6 h7h4 d4d3 h6e3 g6d6 f5f2 d3f5 h8h7 d5i5 e3h6 h6g6 h7i7 c5d5 i7i6 g6d3 g5g3 d6d4 i5i7 f7c4 d1e2 e6e3 i6g5 d5d2 c1b1 d2c2 b1a1 c4c3 g5d2 d2d5 h4c4 f5c5 f2f5 f6e6 i7g6 d3b3 f5d3 b3b4 h7f6 c2b2 a1b1 c3b3 b1c2 b2c3 c2d2 c3h8 g7g8 f8e7 g3g5 b4d6 d3f5 c5h5 d2f2 c4f7 g8i9 d4g7 g5d2 d6g6 d2d3 d5g8 h9i8 e5i9 i8i7 e6h6 e3g5 e7h7 h5e5 g8g3 g3e3 g5i7 g4g5 i7i8 f2g4 f7g8 f4f7 h6e6 e6d6 f6i9 e3c3 e5f6 g3f4 b3c4 c3d4 c4d5 g5e3 d5e5 f3f8 f8g9 d6c5 e5e6 e2e5 e6h9 e3e6 g6h6 e6g6 g9g5 f6c3 h6f6 g5d5 i8f8 f5c2 f8f5 c5g5 i9i8 c2c4 i8f8 c4c5 f8f3 c5h5 h5h6 d5h5 h5i6 d3i8 i8i9 e4g4 i9g9 f3f8 h7e7 f4i7 i7h7 f6i6 h7i8 h6f6 i8i9 i6h5 h9f9 f6c4 f9f6 c4h9 h9f9 c3c4 g8i8 f5h7 i8i7 h5h6 h8g8 g5i7"];

function _rejouerJetons(seq) {
  ['drawBoard','updateStatus','showToast','rebuildMoveListLabels','loadSnapshot','closeMigsBrowser',
   'resetGutterPositions','closePSImportModal','showPage'].forEach(n => { ctx[n] = () => {}; });
  const b = {};
  ctx.LAYOUTS.belgian.black.forEach(p => { b[p[0]+','+p[1]] = 'black'; });
  ctx.LAYOUTS.belgian.white.forEach(p => { b[p[0]+','+p[1]] = 'white'; });
  ctx.board = b; ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0); ctx.GameOver.set(false);
  ctx._replaySeqToSnapshots(seq, 'test');
  return ctx.boardSnapshots.length;
}

test("NON-REGRESSION : la notation PlayStrategy brute ne se rejoue PAS telle quelle", () => {
  // L'ancien import stockait les coups PlayStrategy tels quels, en croyant la
  // notation identique. Mesure : 3 demi-coups rejoues sur 7 705. Ce test fige
  // le constat, pour que personne ne "simplifie" la conversion.
  const n = PS_BRUTES[0].split(' ').length;
  assert.ok(_rejouerJetons(PS_BRUTES[0]) < n, 'la chaine brute doit echouer');
});

test('conversion PlayStrategy : parties reelles converties et rejouees en entier', () => {
  for (const brute of PS_BRUTES) {
    const conv = ctx.psConvertirSequence(brute);
    assert.strictEqual(conv.complet, true);
    assert.strictEqual(_rejouerJetons(conv.jetons.join(' ')), brute.split(' ').length);
  }
});

test('conversion PlayStrategy : coup impossible = arret net, jamais une suite fausse', () => {
  const coups = PS_BRUTES[1].split(' ').slice(0, 20);
  coups[10] = 'a9a8';   // a9 n'existe pas
  const conv = ctx.psConvertirSequence(coups.join(' '));
  assert.strictEqual(conv.complet, false);
  assert.strictEqual(conv.jetons.length, 10);
});

test('conversion PlayStrategy : la partie en cours reste intacte', () => {
  ctx.board = { '6,2': 'black', '2,2': 'white' };
  ctx.CapturedByBlack.set(3); ctx.CapturedByWhite.set(1);
  const ref = JSON.stringify(ctx.board);
  ctx.psConvertirSequence(PS_BRUTES[0]);
  assert.strictEqual(JSON.stringify(ctx.board), ref);
  assert.strictEqual(ctx.CapturedByBlack.get(), 3);
});

test('tournoi embarque : 90 parties, toutes rejouables jusqu au dernier coup', () => {
  const banque = ctx.PS_TOURNOI_YEARLY_2026;
  assert.strictEqual(banque.length, 90);
  for (const e of banque) assert.strictEqual(_rejouerJetons(e[5]), ctx._migsMoveCount(e[5]), e[0]);
});

