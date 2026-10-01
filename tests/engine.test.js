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

test('tournoi embarque : les 93 parties, dont 90 rejouables jusqu au dernier coup', () => {
  // 3 parties ont ete abandonnees avant le premier coup : coups vides, rien a
  // rejouer (0 == 0 ci-dessous), mais elles comptent dans le corpus.
  const banque = ctx.PS_TOURNOI_YEARLY_2026;
  assert.strictEqual(banque.length, 93);
  assert.strictEqual(banque.filter(e => ctx._migsMoveCount(e[5]) > 0).length, 90);
  for (const e of banque) assert.strictEqual(_rejouerJetons(e[5]), ctx._migsMoveCount(e[5]), e[0]);
});

/* ─── 14. Suivi en direct d'une partie PlayStrategy : decodeur de FEN ─── */

test('FEN de depart PlayStrategy = exactement le Belgian Daisy Abalassembly', () => {
  const FEN = "ss1SS/sssSSS/1ss1SS1/8/9/8/1SS1ss1/SSSsss/SS1ss b";
  const pos = ctx._psDecoderFen(FEN);
  assert.ok(pos, 'decodage reussi');
  assert.strictEqual(pos.trait, 'black');
  const sig = b => Object.keys(b).filter(k => b[k]).sort().map(k => k + b[k]).join('|');
  const bel = {};
  ctx.LAYOUTS.belgian.black.forEach(p2 => bel[p2[0]+','+p2[1]] = 'black');
  ctx.LAYOUTS.belgian.white.forEach(p2 => bel[p2[0]+','+p2[1]] = 'white');
  assert.strictEqual(sig(pos.board), sig(bel));
});

test('FEN : trait blanc correctement lu', () => {
  assert.strictEqual(ctx._psDecoderFen("ss1SS/sssSSS/1ss1SS1/8/9/8/1SS1ss1/SSSsss/SS1ss w").trait, 'white');
});

test('FEN : rejette un decompte de cases incorrect plutot que de planter', () => {
  assert.strictEqual(ctx._psDecoderFen("ss1SS/sssSSS/1ss1SS1/8/9/8/1SS1ss1/SSSsss/SS1s b"), null);
});

test("FEN : rejette une chaine vide ou un format etranger (echecs 8x8) sans exception", () => {
  assert.strictEqual(ctx._psDecoderFen(''), null);
  assert.strictEqual(ctx._psDecoderFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w'), null);
});

test("suivi en direct : ne se connecte jamais tout seul au chargement de la page", () => {
  assert.strictEqual(ctx._psLiveActive, false);
});

/* ─── 15. Tournois Abalone a venir sur PlayStrategy ─── */

const _T_ABALONE_1 = { id: 'aaaaaaaa', fullName: 'Weekly Abalone', variant: { key: 'abalone' }, startsAt: '2026-10-01T18:00:00Z' };
const _T_ABALONE_2 = { id: 'bbbbbbbb', fullName: 'Daily Abalone', variant: { key: 'abalone' }, startsAt: '2026-09-27T12:00:00Z' };
const _T_ECHECS   = { id: 'cccccccc', fullName: 'Blitz Battle', variant: { key: 'chess' }, startsAt: '2026-09-26T10:00:00Z' };
function _armerReponseTournois(json) { ctx.fetch = async () => ({ ok: true, json: async () => json }); }

test('tournois : seuls ceux en Abalone sont retenus, tries par date, les termines ignores', async () => {
  _armerReponseTournois({
    created: [_T_ABALONE_1, _T_ECHECS],
    started: [_T_ABALONE_2],
    finished: [{ ..._T_ABALONE_1, id: 'ffffffff' }]
  });
  const r = await ctx.psTournoisAbaloneAVenir();
  assert.strictEqual(r.enCours.length, 1); assert.strictEqual(r.enCours[0].id, 'bbbbbbbb');
  assert.strictEqual(r.aVenir.length, 1); assert.strictEqual(r.aVenir[0].id, 'aaaaaaaa');
  assert.ok(!r.enCours.concat(r.aVenir).some(t => t.id === 'ffffffff'), 'un tournoi termine ne doit jamais apparaitre');
});

test('tournois : reseau indisponible ou reponse en erreur renvoie null, jamais une exception', async () => {
  ctx.fetch = async () => { throw new Error('offline'); };
  assert.strictEqual(await ctx.psTournoisAbaloneAVenir(), null);
  ctx.fetch = async () => ({ ok: false });
  assert.strictEqual(await ctx.psTournoisAbaloneAVenir(), null);
});

test("tournois : l'affichage distingue bien 'en cours' de la date programmee", () => {
  assert.match(ctx._psTournoiLigne(_T_ABALONE_2, true), /en cours/);
  const ligne = ctx._psTournoiLigne(_T_ABALONE_1, false);
  assert.doesNotMatch(ligne, /en cours/);
  assert.match(ligne, /playstrategy\.org\/tournament\/aaaaaaaa/);
});

/* ─── 16. Import d'un tournoi par son lien, suivi en direct par pseudo ─── */

const _fauxEl = () => ({ value: '', style: {}, textContent: '', innerHTML: '', focus(){},
  classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } },
  appendChild(){}, remove(){}, querySelectorAll(){ return []; } });

test('import : lien de tournoi arena ou suisse -> route du tournoi ; pseudo -> route joueur', () => {
  assert.strictEqual(ctx._psUrlImport('https://playstrategy.org/tournament/rshUi5eV'),
    'https://playstrategy.org/api/tournament/rshUi5eV/games?moves=true&tags=false&opening=false');
  assert.match(ctx._psUrlImport('playstrategy.org/swiss/AbCd1234'), /\/api\/swiss\/AbCd1234\/games/);
  assert.match(ctx._psUrlImport('vincent'), /\/api\/games\/user\/vincent\?perfType=abalone/);
});

test('import par lien de tournoi : les parties Abalone entrent, le Grand Abalone est ecarte', async () => {
  const els = {};
  const origine = ctx.document.getElementById;
  ctx.document.getElementById = id => (els[id] || (els[id] = _fauxEl()));
  els['ps-import-usernames'] = Object.assign(_fauxEl(), { value: 'https://playstrategy.org/tournament/rshUi5eV' });
  const rec = (id, variant) => JSON.stringify({ id, variant, createdAt: Date.UTC(2026,8,18), winner: 'p1',
    status: 'mate', players: { p1: { user: { name: 'A' } }, p2: { user: { name: 'B' } } }, moves: 'a1d4 i5f5 a2c4 i6g6' });
  ctx.fetch = async () => ({ ok: true, text: async () => rec('abal0001', 'abalone') + '\n' + rec('gran0001', 'grandabalone') + '\n' });
  ctx.renderPSGamesList = () => {};
  await ctx.fetchPSGames();
  ctx.document.getElementById = origine;
  const ids = ctx.PS_GAMES.map(g => g[0]);
  assert.ok(ids.includes('abal0001'));
  assert.ok(!ids.includes('gran0001'), 'plateau incompatible, jamais importe');
});

test("PIEGE : sans partie en cours, current-game renvoie la DERNIERE partie -- elle ne passe pas pour du direct", async () => {
  ctx.fetch = async () => ({ ok: true, json: async () => ({ id: 'fini0001', status: 'mate', variant: 'abalone' }) });
  assert.strictEqual((await ctx._psPartieEnCours('vincent')).enCours, false);
  ctx.fetch = async () => ({ ok: true, json: async () => ({ id: 'live0001', status: 'started', variant: 'abalone' }) });
  assert.strictEqual((await ctx._psPartieEnCours('vincent')).enCours, true);
  ctx.fetch = async () => { throw new Error('offline'); };
  assert.strictEqual(await ctx._psPartieEnCours('vincent'), null);
});

test('suivi par pseudo : partie terminee -> message clair et AUCUN flux ouvert', async () => {
  const els = {};
  const origine = ctx.document.getElementById;
  ctx.document.getElementById = id => (els[id] || (els[id] = _fauxEl()));
  els['ps-live-id'] = Object.assign(_fauxEl(), { value: 'vincent' });
  const appels = [];
  ctx.fetch = async (url) => { appels.push(url); return { ok: true, json: async () => ({ id: 'fini0001', status: 'mate', variant: 'abalone' }) }; };
  await ctx.psLiveDemarrer();
  ctx.document.getElementById = origine;
  assert.match(els['ps-live-statut'].textContent, /n'a pas de partie en cours/);
  assert.ok(!appels.some(u => /\/api\/stream\/game\//.test(u)));
});

/* ─── 17. Communaute Abalone : equipes, directs, et securite des textes ─── */

const _PIEGE_HTML = '<img src=x onerror=alert(1)>';

test('SECURITE : noms de tournoi, d equipe et titres de direct echappes -- jamais executes', () => {
  // Textes ecrits par des utilisateurs de PlayStrategy. Le premier jet de
  // l'encart des tournois les inserait tels quels (faille XSS) : corrige.
  const t = ctx._psTournoiLigne({ id: 'aaaaaaaa', fullName: _PIEGE_HTML, startsAt: '2026-10-01T18:00:00Z' }, false);
  assert.ok(!t.includes('<img') && t.includes('&lt;img'));
  assert.ok(!ctx._psEquipeLigne({ id: 'abc', name: _PIEGE_HTML, nbMembers: 3 }).includes('<img'));
  assert.ok(!ctx._psDirectLigne({ url: 'https://playstrategy.org/streamer/x', status: _PIEGE_HTML, user: { name: _PIEGE_HTML } }).includes('<img'));
});

test('SECURITE : un direct dont le lien sort de playstrategy.org est ecarte', async () => {
  ctx.fetch = async () => ({ ok: true, json: async () => ([
    { url: 'https://playstrategy.org/streamer/bon', status: 'Abalone ce soir', user: { name: 'A' } },
    { url: 'javascript:alert(1)', status: 'Abalone', user: { name: 'B' } },
    { url: 'https://site-pirate.example/', status: 'Abalone', user: { name: 'C' } }
  ]) });
  const d = await ctx.psDirectsAbalone();
  assert.deepStrictEqual(d.map(x => x.user.name), ['A']);
});

test('equipes : triees par membres, 8 au plus ; reseau coupe -> null sans exception', async () => {
  const eq = Array.from({ length: 12 }, (_, i) => ({ id: 't' + i, name: 'T' + i, nbMembers: i }));
  ctx.fetch = async () => ({ ok: true, json: async () => ({ currentPageResults: eq }) });
  const r = await ctx.psEquipesAbalone();
  assert.strictEqual(r.length, 8); assert.strictEqual(r[0].nbMembers, 11);
  ctx.fetch = async () => { throw new Error('offline'); };
  assert.strictEqual(await ctx.psEquipesAbalone(), null);
});

/* ─── 18. Stats du corpus : le tournoi PlayStrategy compte, toutes parties ─── */

test('corpus : MIGS + AbalOnline + 93 parties du tournoi + 3 de reference = 4 575', async () => {
  assert.ok(await ctx.ensureGameBanks());
  const s = await ctx.computeCorpusStats(() => {});
  assert.strictEqual(s.nMigs, 2589); assert.strictEqual(s.nAo, 1890);
  assert.strictEqual(s.nPs, 93); assert.strictEqual(s.nPsSansCoup, 3);
  assert.strictEqual(s.totalGames, 4575);
  // la duree ne compte que les parties jouees : pas de partie "a 0 coup"
  assert.strictEqual(s.nLens, 2589 + 90 + 3);
  assert.ok(s.lenMin > 0);
  const bel = s.topVariants.find(v => v[0] === 'belgian');
  assert.ok(bel && bel[1] === 94, 'Belgian Daisy : les 93 parties du tournoi + la partie KAAH');
});

test("corpus : les parties importees a la volee n'y entrent pas (meme corpus pour tous)", async () => {
  ctx.PS_GAMES.push(['vol00001', '2026-09-01', 'X', 'Y', 'X gagne', 'a1b2 i5h5']);
  const s = await ctx.computeCorpusStats(() => {});
  ctx.PS_GAMES.pop();
  assert.strictEqual(s.totalGames, 4575);
});

test('bibliotheque : une partie sans coup est annoncee, jamais chargee comme une partie jouee', () => {
  let msg = null, page = null;
  ctx.showToast = m => { msg = m; }; ctx.showPage = p => { page = p; };
  const idx = ctx.PS_GAMES.findIndex(g => g[0] === 'KUDSzpMa');
  ctx.loadPSGame(idx);
  assert.match(msg, /abandonnée avant le premier coup/);
  assert.strictEqual(page, null);
});

/* ─── 19. Variante Pyramide : position et partie de reference ─── */

// Partie publiee avec la variante (onlineabalone.wordpress.com, 25/02/2018) :
// FightClub (Noirs) contre Aba-Pro 8. Elle a servi a VERIFIER la position
// lue sur l'image avant integration : elle doit se rejouer en entier.
const PARTIE_PYRAMIDE = `1.b5c5 h4h5 2.d7d6 g4f4 3.c6d6 f3f4 4.a5c7b5 g3f2g4 5.d7d6 g4f4 6.d8e8c7 g5f4 7.c5d5 d3e4 8.b5c5 d2e2 9.d7d6 d3e4 10.h7g7 f2f3g3 11.g7f7 e2f2 12.d4e5 f2e1f3 13.d6e7 g4h4 14.d7e7 e4f4 15.c6c7d6 h7g6 16.e9e8 g4g5 17.d6e6 e4f5 18.b4c5 e2e3 19.e7e6 g6f5 20.d6e6 i6h5 21.e5f6 h5g5 22.e8f8 i8i7 23.e6f6 h4h5 24.f6g6 f3g4 25.h8g7 i6h5 26.c5d5d6 g3f3 27.g8g7 d3e4 28.g7h7 e4f5 29.i7h6 d2d3 30.h6g5 g6h7 31.f6f8g6 g3h4 32.g7g6 h5h6 33.d6e6e7 d3e4 34.d7e7 g3f3 35.f4g5 i7i6 36.e7f7 e5f5 37.h7h6 d2e3 38.f7g7 i6i7 39.g6h7 e2e3 40.g7h7 i9h8 41.h6i6 h8i9 42.i7i6`;

test('Pyramide : disposition conforme a l image source', () => {
  const noms = l => l.map(([r, c]) => String(ctx.coordToABAPRO(r, c))).sort().join(' ');
  assert.strictEqual(noms(ctx.LAYOUTS.pyramide.white), 'e1 e2 e3 e4 f2 f3 f4 f5 g3 g4 g5 h4 h5 i5');
  assert.strictEqual(noms(ctx.LAYOUTS.pyramide.black), 'a5 b5 b6 c5 c6 c7 d5 d6 d7 d8 e6 e7 e8 e9');
});

test('Pyramide : la partie de reference se rejoue en entier, une seule lecture par coup, 6e ejection au dernier', () => {
  const toks = PARTIE_PYRAMIDE.replace(/\d+\./g, ' ').trim().split(/\s+/);
  assert.strictEqual(toks.length, 83);
  ctx.board = {};
  ctx.LAYOUTS.pyramide.black.forEach(p => { ctx.board[p[0]+','+p[1]] = 'black'; });
  ctx.LAYOUTS.pyramide.white.forEach(p => { ctx.board[p[0]+','+p[1]] = 'white'; });
  ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0); ctx.GameOver.set(false);
  let col = 'black';
  toks.forEach((tk, k) => {
    assert.ok(ctx.CapturedByBlack.get() < 6 && ctx.CapturedByWhite.get() < 6, 'partie finie avant le coup ' + (k + 1));
    const c = ctx.getAllMovesForColor(col).filter(m => (ctx.abaproOfficialLabels(m) || []).includes(tk));
    assert.strictEqual(c.length, 1, 'coup ' + (k + 1) + ' ' + tk);
    ctx.applyMove({ cells: c[0].cells, dir: c[0].dir, info: ctx.validateMove(c[0].cells, c[0].dir, col) }, col);
    col = col === 'black' ? 'white' : 'black';
  });
  assert.strictEqual(ctx.CapturedByBlack.get(), 6);
  assert.strictEqual(ctx.CapturedByWhite.get(), 3);
});

/* ─── 20. Parties de reference des variantes : bibliotheque et corpus ─── */

const _stubsAffichage = () => ['drawBoard','updateStatus','showToast','rebuildMoveListLabels','loadSnapshot',
  'closeMigsBrowser','resetGutterPositions','showPage'].forEach(n => { ctx[n] = () => {}; });

test('bibliotheque : la partie Pyramide s ouvre et se rejoue jusqu au dernier coup, 6 a 3', () => {
  _stubsAffichage();
  ctx.loadRefGame(0);
  assert.strictEqual(ctx.boardSnapshots.length, 83);
  assert.strictEqual(ctx.CapturedByBlack.get(), 6);
  assert.strictEqual(ctx.CapturedByWhite.get(), 3);
});

test('bibliotheque : listee avec sa source, filtrable, et en-tete calcule (4 482 parties, 21 variantes)', async () => {
  assert.ok(await ctx.ensureGameBanks());
  const els = {}, opts = [{ value: '' }];
  const origine = ctx.document.getElementById, origineCreate = ctx.document.createElement;
  els['migs-search'] = { value: '' }; els['migs-filter-length'] = { value: '' };
  els['migs-filter-variant'] = { value: 'pyramide', options: opts, appendChild(o){ opts.push(o); } };
  els['migs-list'] = { innerHTML: '' }; els['migs-entete'] = { textContent: '' };
  ctx.document.getElementById = id => els[id] || null;
  ctx.document.createElement = () => ({});
  ctx.renderMigsList();
  ctx.document.getElementById = origine; ctx.document.createElement = origineCreate;
  assert.match(els['migs-list'].innerHTML, /loadRefGame\(0\)/);
  assert.match(els['migs-list'].innerHTML, /onlineabalone\.wordpress\.com/, 'la source est indiquee');
  assert.doesNotMatch(els['migs-list'].innerHTML, /loadAOGame|loadMigsGame/, 'jamais presentee comme AbalOnline ou MIGS');
  assert.ok(opts.some(o => o.value === 'pyramide'));
  assert.match(els['migs-entete'].textContent, /^4\u202f?482 parties · 21 variantes/);
});

/* ─── 21. Marguerite francaise : variante desequilibree ─── */

test('Marguerite francaise : disposition conforme a l image source', () => {
  const noms = l => l.map(([r, c]) => String(ctx.coordToABAPRO(r, c))).sort().join(' ');
  assert.strictEqual(noms(ctx.LAYOUTS.french.black), 'b3 b4 c3 c4 c5 d4 d5 f5 f6 g5 g6 g7 h6 h7');
  assert.strictEqual(noms(ctx.LAYOUTS.french.white), 'd2 d3 d6 d7 e2 e3 e4 e6 e7 e8 f3 f4 f7 f8');
});

test('Marguerite francaise : la partie MiGs 31299 se rejoue en entier depuis la bibliotheque, 6 a 5', () => {
  ['drawBoard','updateStatus','showToast','rebuildMoveListLabels','loadSnapshot','closeMigsBrowser',
   'resetGutterPositions','showPage'].forEach(n => { ctx[n] = () => {}; });
  const i = ctx.PARTIES_REFERENCE.findIndex(g => g[4] === 'french');
  ctx.loadRefGame(i);
  assert.strictEqual(ctx.boardSnapshots.length, 31);
  assert.strictEqual(ctx.CapturedByBlack.get(), 6);
  assert.strictEqual(ctx.CapturedByWhite.get(), 5);
});

test("Marguerite francaise : desequilibree -- aucune symetrie n'echange Noirs et Blancs, 4 contre 2 au centre", () => {
  // Verifie ce que la fiche affirme. Domination partage cette propriete (voir
  // le test "exactement 2 dispositions sur 23") -- le premier jet de ce
  // commentaire la disait unique, c'etait faux.
  const L = ctx.LAYOUTS.french, pos = {};
  L.black.forEach(p => { pos[p[0]+','+p[1]] = 'black'; }); L.white.forEach(p => { pos[p[0]+','+p[1]] = 'white'; });
  const cube = k => { const [r, c] = k.split(',').map(Number); const a = ctx.rcToAxial(r, c); return [a.q, -a.q - a.r, a.r]; };
  const cle = ([x, , z]) => { const rc = ctx.axialToRc(x, z); return rc ? rc.r + ',' + rc.c : null; };
  const rot = ([x, y, z]) => [-z, -x, -y], refl = ([x, y, z]) => [x, z, y];
  const inv = { black: 'white', white: 'black' };
  let f = p => p, echange = 0, meme = 0;
  for (let i = 0; i < 6; i++) {
    for (const t of [f, p => refl(f(p))]) {
      let m = true, e = true;
      for (const [k, v] of Object.entries(pos)) { const k2 = cle(t(cube(k))); if (pos[k2] !== v) m = false; if (pos[k2] !== inv[v]) e = false; }
      if (m) meme++; if (e) echange++;
    }
    const g = f; f = p => rot(g(p));
  }
  assert.strictEqual(meme, 4, 'identite + 3 symetries (centrale, horizontale, verticale)');
  assert.strictEqual(echange, 0, 'aucune symetrie equitable');
  const n2 = n => { for (let r = 0; r < 9; r++) for (let c = 0; c < ctx.ROWS[r]; c++) if (String(ctx.coordToABAPRO(r, c)) === n) return r + ',' + c; };
  const autour = col => ['e4','e6','d4','d5','f5','f6'].filter(n => pos[n2(n)] === col).length;
  assert.strictEqual(autour('black'), 4); assert.strictEqual(autour('white'), 2);
});

/* ─── 22. Galerie des variantes : detail sous la fiche, plateau, bouton Jouer ─── */

const _SRC_INDEX = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');


test('correspondance : 23 fiches jouables, chacune reliee a une disposition du moteur ET du menu Jouer', () => {
  const m = ctx.VARIANTE_DISPOSITION;
  assert.strictEqual(Object.keys(m).length, 23);
  assert.deepStrictEqual([...new Set(Object.values(m))].sort(), Object.keys(ctx.LAYOUTS).sort(), 'TOUTES les dispositions ont une fiche');
  for (const [id, lay] of Object.entries(m)) {
    assert.ok(ctx.variantsData.some(v => v.id === id), 'fiche ' + id);
    assert.ok(ctx.LAYOUTS[lay], 'disposition ' + lay);
    assert.ok(_SRC_INDEX.includes('<option value="' + lay + '"'), 'menu Jouer : ' + lay);
  }
});

test("miniature de la page Jouer : rendu STRICTEMENT identique a l'ancien, pour les 23 dispositions", () => {
  const ancien = key => {   // copie exacte de l'ancien code
    const lay = ctx.LAYOUTS[key], posMap = {};
    lay.black.forEach(p => posMap[p[0]+','+p[1]] = 'black'); lay.white.forEach(p => posMap[p[0]+','+p[1]] = 'white');
    const cell = 10; let html = '<div style="display:flex;flex-direction:column;align-items:center;gap:1px">';
    for (let r = 0; r < 9; r++) { html += '<div style="display:flex;gap:1px;justify-content:center">';
      for (let c = 0; c < ctx.ROWS[r]; c++) { const piece = posMap[r+','+c];
        const bg = piece ? (typeof ctx.gymMarbleGradient === 'function' ? ctx.gymMarbleGradient(piece) : (piece === 'black' ? '#1a1a1a' : '#e8e0d0')) : 'var(--border)';
        html += '<div style="width:'+cell+'px;height:'+cell+'px;border-radius:50%;background:'+bg+';opacity:'+(piece?1:0.3)+'"></div>'; }
      html += '</div>'; }
    return html + '</div>';
  };
  for (const k of Object.keys(ctx.LAYOUTS)) assert.strictEqual(ctx._miniDispositionHTML(k, 10), ancien(k), k);
});

// ── faux DOM : une grille de 3 colonnes
function monterGalerie() {
  const cartes = ctx.variantsData.map(v => ({ id: v.id, style: {}, apres: null,
    insertAdjacentElement(pos, el) { el._placeApres = this.id; } }));
  const detail = { style: { display: 'none' }, dataset: {}, scrollIntoView(){} };
  const contenu = { innerHTML: '' };
  const grid = {
    querySelector: s => cartes.find(c => s.includes('"' + c.id + '"')) || null,
    querySelectorAll: () => cartes
  };
  ctx.document.getElementById = id => ({ 'variant-detail': detail, 'variant-detail-content': contenu, 'variants-grid': grid })[id] || null;
  ctx.getComputedStyle = () => ({ gridTemplateColumns: '200px 200px 200px' });
  return { detail, contenu, cartes };
}

test('clic sur une variante jouable : explications, plateau et bouton "Jouer cette variante"', () => {
  const g = monterGalerie();
  ctx.showVariantDetail('pyramide');
  assert.strictEqual(g.detail.style.display, 'block');
  assert.match(g.contenu.innerHTML, /Jouer cette variante/);
  assert.match(g.contenu.innerHTML, /jouerVariante\('pyramide'\)/);
  const billes = (g.contenu.innerHTML.match(/opacity:1"/g) || []).length;
  assert.strictEqual(billes, 28, 'le plateau montre les 28 billes');
  assert.match(g.contenu.innerHTML, /une vraie partie/, 'les explications de la fiche');
});

test('le detail se place au bout de la rangee de la fiche cliquee (grille a 3 colonnes)', () => {
  const g = monterGalerie();
  const i = ctx.variantsData.findIndex(v => v.id === 'german-daisy');   // 3e fiche -> fin de la 1re rangee
  ctx.showVariantDetail('german-daisy');
  assert.strictEqual(g.detail._placeApres, ctx.variantsData[Math.floor(i / 3) * 3 + 2].id);
  assert.strictEqual(g.detail.style.gridColumn, '1 / -1', 'sur toute la largeur');
});

test('un second clic sur la meme fiche referme le detail', () => {
  const g = monterGalerie();
  ctx.showVariantDetail('french-daisy'); assert.strictEqual(g.detail.style.display, 'block');
  ctx.showVariantDetail('french-daisy'); assert.strictEqual(g.detail.style.display, 'none');
});

test('variante sans position jouable : pas de bouton, et c est dit', () => {
  const g = monterGalerie();
  ctx.showVariantDetail('the-pillar');
  assert.doesNotMatch(g.contenu.innerHTML, /Jouer cette variante/);
  assert.match(g.contenu.innerHTML, /reste documentée/);
});

test('"Jouer cette variante" ouvre la configuration avec la variante deja choisie', () => {
  const options = Object.keys(ctx.LAYOUTS).map(k => ({ value: k, getAttribute: () => 'titre', textContent: k }));
  const sel = { value: 'standard', options, get selectedIndex() { return options.findIndex(o => o.value === this.value); } };
  let page = null;
  const faux = () => ({ innerHTML: '', textContent: '', style: {}, value: '', classList: { add(){}, remove(){}, toggle(){}, contains(){ return false; } }, appendChild(){}, remove(){}, querySelectorAll(){ return []; } });
  ctx.document.getElementById = id => (id === 'setup-layout-select' ? sel : faux());
  ctx.sidebarNav = p => { page = p; };
  assert.strictEqual(ctx.jouerVariante('french'), true);
  assert.strictEqual(sel.value, 'french');
  assert.strictEqual(ctx._setupCfg.layout, 'french', 'la partie lancee utilisera bien cette disposition');
  assert.strictEqual(page, 'setup');
  assert.strictEqual(ctx.jouerVariante('inexistante'), false, 'disposition inconnue : aucun effet');
});

/* ─── 23. Les dix fiches ajoutees : chaque chiffre ecrit est verifie ─── */

const _AO_FICHES = { star:'star', alliances:'alliances', domination:'domination', atomouche:'atomouche', centrifuge:'centrifugeuse', snakes_variant:'snakes_variant' };
const _cubeF = k => { const [r, c] = k.split(',').map(Number); const a = ctx.rcToAxial(r, c); return [a.q, -a.q - a.r, a.r]; };
const _cleF = ([x, , z]) => { const rc = ctx.axialToRc(x, z); return rc ? rc.r + ',' + rc.c : null; };
const _rotF = ([x, y, z]) => [-z, -x, -y], _reflF = ([x, y, z]) => [x, z, y];
function _echanges(k) {
  const L = ctx.LAYOUTS[k], pos = {}, inv = { black: 'white', white: 'black' };
  L.black.forEach(p => pos[p[0]+','+p[1]] = 'black'); L.white.forEach(p => pos[p[0]+','+p[1]] = 'white');
  let f = p => p, n = 0;
  for (let i = 0; i < 6; i++) { for (const t of [f, p => _reflF(f(p))]) { let e = true;
    for (const [q, v] of Object.entries(pos)) if (pos[_cleF(t(_cubeF(q)))] !== inv[v]) { e = false; break; } if (e) n++; }
    const g = f; f = p => _rotF(g(p)); }
  return n;
}
const _carte = id => ctx.variantsData.find(v => v.id === id);

test('les chiffres du corpus ecrits dans les fiches sont EXACTS (parties, victoires, mediane)', async () => {
  assert.ok(await ctx.ensureGameBanks());
  for (const [lay, aoKey] of Object.entries(_AO_FICHES)) {
    const id = Object.keys(ctx.VARIANTE_DISPOSITION).find(k => ctx.VARIANTE_DISPOSITION[k] === lay);
    const gs = ctx.AO_GAMES.filter(g => g[4] === aoKey);
    const nb = gs.filter(g => g[3] === g[1]).length, bl = gs.filter(g => g[3] === g[2]).length;
    const lens = gs.map(g => (g[6] || '').replace(/\d+\./g, ' ').trim().split(/\s+/).filter(Boolean).length).filter(Boolean).sort((a, b) => a - b);
    const med = lens[Math.floor(lens.length / 2)];
    const d = _carte(id).desc;
    assert.ok(d.includes(gs.length + ' parties'), id + ' : ' + gs.length + ' parties');
    assert.ok(d.includes(nb + ' ') && d.includes(bl + ' '), id + ' : ' + nb + '/' + bl);
    assert.ok(d.includes(med + ' coups en médiane'), id + ' : mediane ' + med);
    assert.strictEqual(_carte(id).duration, med + ' coups (médiane)');
  }
});

test('les symetries annoncees dans les fiches sont celles que le calcul trouve', () => {
  for (const [id, lay] of Object.entries(ctx.VARIANTE_DISPOSITION)) {
    const d = _carte(id).desc, n = _echanges(lay);
    if (/Deux symétries échangent/.test(d)) assert.strictEqual(n, 2, id);
    if (/Une symétrie échange/.test(d)) assert.strictEqual(n, 1, id);
    if (/aucune symétrie n.échange|aucune qui échange les couleurs/.test(d)) assert.strictEqual(n, 0, id);
  }
});

test('exactement 2 dispositions sur 23 sans symetrie echangeant les camps : Domination et Marguerite francaise', () => {
  const sans = Object.keys(ctx.LAYOUTS).filter(k => _echanges(k) === 0).sort();
  assert.deepStrictEqual(sans, ['domination', 'french']);
});

test('nombres de billes annonces : Atomouche 12, Decouverte 7, coins de Decouverte a1 et i5', () => {
  assert.strictEqual(ctx.LAYOUTS.atomouche.black.length, 12); assert.strictEqual(ctx.LAYOUTS.atomouche.white.length, 12);
  assert.strictEqual(ctx.LAYOUTS.decouverte.black.length, 7);
  const noms = l => l.map(([r, c]) => String(ctx.coordToABAPRO(r, c)));
  assert.ok(noms(ctx.LAYOUTS.decouverte.black).includes('a1')); assert.ok(noms(ctx.LAYOUTS.decouverte.white).includes('i5'));
});

test('aucune difficulte inventee : "Non evaluee" (badge neutre) sauf Decouverte', () => {
  for (const id of ['69','star','alliances','domination','atomouche','centrifugeuse','snakes-variant','korean-daisy','anglattack'])
    assert.strictEqual(_carte(id).diff, 'Non évaluée', id);
  assert.strictEqual(_carte('decouverte').diff, 'Débutant');
});

/* ─── 24. Theme sombre declare au navigateur ─── */

test('le site DECLARE son theme sombre (sinon les navigateurs a mode sombre force re-assombrissent ses couleurs)', () => {
  // Constate sur Samsung Internet : sans cette declaration, son mode sombre
  // retouchait la page -- billes blanches grises, tuiles de l'accueil ternes.
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(src, /<meta name="color-scheme" content="dark">/);
  assert.match(src, /:root \{ color-scheme: dark; \}/);
  assert.doesNotMatch(src, /data-theme="light"|prefers-color-scheme:\s*light/, 'si un theme clair apparait un jour, la declaration devra devenir "dark light"');
});

/* ─── 25. Icones de l'application ─── */

test("icones : chaque fichier declare par le manifeste et la page existe ; l'icone masquable a son propre fichier", () => {
  const fs = require('fs'), path = require('path'), racine = path.join(__dirname, '..');
  const m = JSON.parse(fs.readFileSync(path.join(racine, 'manifest.json'), 'utf8'));
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(racine, i.src)), 'manquant : ' + i.src);
  // Une icone "maskable" doit tenir dans la zone sure (cercle de 40 %) : les
  // sommets de l'hexagone de l'icone normale en sortent, d'ou un fichier a part.
  const mask = m.icons.find(i => /maskable/.test(i.purpose));
  assert.ok(mask && !m.icons.some(i => i !== mask && i.src === mask.src), 'icone masquable distincte');
  const src = fs.readFileSync(path.join(racine, 'index.html'), 'utf8');
  for (const f of ['favicon-32.png', 'favicon-16.png', 'favicon.ico', 'apple-touch-icon.png'])
    assert.ok(src.includes('href="' + f + '"') && fs.existsSync(path.join(racine, f)), f);
});

/* ─── 26. Dernier coup : chevrons sur les billes deplacees (modele du site de Saab) ─── */

const _n2rcCh = {}; for (let r = 0; r < 9; r++) for (let c = 0; c < ctx.ROWS[r]; c++) _n2rcCh[String(ctx.coordToABAPRO(r, c))] = { r, c };
const _Kch = n => _n2rcCh[n].r + ',' + _n2rcCh[n].c;
// projection ecran simple et deterministe pour les tests
const _hexOrigine = ctx.hexCoord;
ctx.hexCoord = (r, c) => { const a = ctx.rcToAxial(r, c); return { x: 40 * (a.q + a.r / 2), y: 35 * a.r }; };
function _jouerCh(noirs, blancs, groupe, versCase, couleur, avecAvant) {
  const b = {}; noirs.forEach(n => b[_Kch(n)] = 'black'); blancs.forEach(n => b[_Kch(n)] = 'white');
  const avant = JSON.parse(JSON.stringify(b));
  ctx.board = b; ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0); ctx.GameOver.set(false);
  const cells = groupe.map(n => _n2rcCh[n]);
  const tete = groupe[groupe.length - 1], A = ctx.rcToAxial(_n2rcCh[tete].r, _n2rcCh[tete].c), B = ctx.rcToAxial(_n2rcCh[versCase].r, _n2rcCh[versCase].c);
  const dir = { q: B.q - A.q, r: B.r - A.r };
  const info = ctx.validateMove(cells, dir, couleur); assert.ok(info && info.valid, 'coup legal');
  ctx.applyMove({ cells, dir, info }, couleur);
  const snap = { board: JSON.parse(JSON.stringify(ctx.board)), moveInfo: { cells, dir, type: info.type, ejection: !!info.ejection } };
  ctx.boardSnapshots = avecAvant ? [{ board: avant }, snap] : [snap];
  ctx._replayStartBoard = null;
  // les tests precedents peuvent laisser le jeu en mode rejeu (bibliotheque) :
  // on se place explicitement en partie en direct, reglage active
  ctx.replayMode = false; ctx.showLastMoveArrow = true;
}
function _dessinerCh() {
  const traits = []; let cur = null;
  const f = { save(){}, restore(){}, beginPath(){ cur = []; }, moveTo(x, y){ cur.push([x, y]); }, lineTo(x, y){ cur.push([x, y]); },
    stroke(){ traits.push({ pts: cur, couleur: f.strokeStyle }); } };
  ctx.drawLastMoveArrow(f); return traits;
}
const _clairCh = t => /255,255,255/.test(t.couleur), _sombreCh = t => /18,18,18/.test(t.couleur);

test('coup en ligne de 3 billes noires : 3 chevrons clairs', () => {
  _jouerCh(['e1','e2','e3'], [], ['e1','e2','e3'], 'e4', 'black', true);
  const t = _dessinerCh(); assert.strictEqual(t.length, 3); assert.ok(t.every(_clairCh));
});
test('poussee 3 contre 2 : 5 chevrons, 3 clairs sur les noires, 2 sombres sur les blanches poussees', () => {
  _jouerCh(['e1','e2','e3'], ['e4','e5'], ['e1','e2','e3'], 'e4', 'black', true);
  const t = _dessinerCh(); assert.strictEqual(t.length, 5);
  assert.strictEqual(t.filter(_clairCh).length, 3); assert.strictEqual(t.filter(_sombreCh).length, 2);
});
test('PIEGE : une bille blanche immobile juste derriere la ligne poussee ne recoit PAS de chevron', () => {
  _jouerCh(['e1','e2','e3'], ['e4','e5','e7'], ['e1','e2','e3'], 'e4', 'black', true);
  const t = _dessinerCh(); assert.strictEqual(t.length, 5, 'e7 n a pas bouge');
});
test('ejection : la bille sortie du plateau n a pas de chevron', () => {
  _jouerCh(['e7','e8'], ['e9'], ['e7','e8'], 'e9', 'black', true);
  const t = _dessinerCh(); assert.strictEqual(t.length, 2); assert.ok(t.every(_clairCh));
});
test('premier coup d une partie en direct (position d avant inconnue) : seules les billes du joueur sont marquees', () => {
  _jouerCh(['e1','e2','e3'], ['e4','e5'], ['e1','e2','e3'], 'e4', 'black', false);
  const t = _dessinerCh(); assert.strictEqual(t.length, 3); assert.ok(t.every(_clairCh));
});
test('coup lateral de 2 billes blanches : 2 chevrons sombres', () => {
  _jouerCh([], ['e4','e5'], ['e4','e5'], 'f5', 'white', true);   // tete e5 -> f5 : glissement lateral
  const t = _dessinerCh(); assert.strictEqual(t.length, 2); assert.ok(t.every(_sombreCh));
});
test('la pointe de chaque chevron est tournee dans le sens du deplacement', () => {
  _jouerCh(['e1','e2','e3'], [], ['e1','e2','e3'], 'e4', 'black', true);
  const u = (() => { const a = ctx.hexCoord(_n2rcCh.e3.r, _n2rcCh.e3.c), b = ctx.hexCoord(_n2rcCh.e4.r, _n2rcCh.e4.c); const n = Math.hypot(b.x - a.x, b.y - a.y); return [(b.x - a.x) / n, (b.y - a.y) / n]; })();
  for (const [t, dest] of _dessinerCh().map((t, i) => [t, ['e2','e3','e4'][i]])) {
    const c = ctx.hexCoord(_n2rcCh[dest].r, _n2rcCh[dest].c), pointe = t.pts[1];
    const bras = [t.pts[0], t.pts[2]].map(p => (p[0] - c.x) * u[0] + (p[1] - c.y) * u[1]);
    const av = (pointe[0] - c.x) * u[0] + (pointe[1] - c.y) * u[1];
    assert.ok(av > 0 && bras.every(b => b < av), 'pointe en avant, branches en retrait');
  }
});
test('reglage desactive ou position initiale en replay : aucun chevron', () => {
  _jouerCh(['e1','e2','e3'], [], ['e1','e2','e3'], 'e4', 'black', true);
  ctx.showLastMoveArrow = false; assert.strictEqual(_dessinerCh().length, 0); ctx.showLastMoveArrow = true;
  ctx.replayMode = true; ctx.replayCurrentIdx = -1; assert.strictEqual(_dessinerCh().length, 0); ctx.replayMode = false;
});

test('chevrons : projection d ecran d origine restauree', () => { ctx.hexCoord = _hexOrigine; assert.ok(true); });

/* ─── 27. Partie jouee sur KAAH, l'application de Saab ─── */

test('KAAH : la partie s ouvre depuis la bibliotheque et se rejoue en entier (204 demi-coups), Blancs 6 a 5', () => {
  // Fournie en Aba-Pro ET en Nacre ; les deux notations ont ete rejouees
  // separement avant integration et donnent les 204 memes positions.
  ['drawBoard','updateStatus','showToast','rebuildMoveListLabels','loadSnapshot','closeMigsBrowser',
   'resetGutterPositions','showPage'].forEach(n => { ctx[n] = () => {}; });
  const i = ctx.PARTIES_REFERENCE.findIndex(g => /KAAH/.test(g[5]));
  assert.ok(i >= 0);
  ctx.loadRefGame(i);
  assert.strictEqual(ctx.boardSnapshots.length, 204);
  assert.strictEqual(ctx.CapturedByWhite.get(), 6);
  assert.strictEqual(ctx.CapturedByBlack.get(), 5);
});

test('KAAH : les positions affichees par KAAH lui-meme (tours 21 a 24) sont identiques a notre rejeu', () => {
  // Codes de position releves sur les captures d'ecran de KAAH (28/09/2026) :
  // '0' = billes noires, '1' = blanches, puis rangee et numeros. Troisieme
  // source independante, apres les notations Aba-Pro et Nacre.
  const KAAH = { 41: '0c256d357e34f4g56h78i7_1c34d46e56f567h56i56', 43: '0c2356d357e34g56h78i7_1b3c4d46e56f456h56i56',
                 45: '0b3c2356d357e4g56h78i7_1a3c4d4e567f456h56i56', 47: '0b3c2356d356e4g56h78i7_1b4c4d4e567f456h56i56' };
  const decode = code => { const o = {}; for (const part of code.split('_')) { const coul = part[0] === '0' ? 'black' : 'white'; let rg = null;
    for (const ch of part.slice(1)) { if (/[a-i]/.test(ch)) rg = ch; else o[rg + ch] = coul; } } return o; };
  const i = ctx.PARTIES_REFERENCE.findIndex(g => /KAAH/.test(g[5]));
  ctx.loadRefGame(i);
  for (const [ply, code] of Object.entries(KAAH)) {
    const nous = {};
    for (const [k, v] of Object.entries(ctx.boardSnapshots[ply - 1].board)) if (v) { const [r, cc] = k.split(',').map(Number); nous[String(ctx.coordToABAPRO(r, cc))] = v; }
    assert.deepStrictEqual(Object.keys(nous).sort().map(k => k + nous[k]), Object.entries(decode(code)).map(([k, v]) => k + v).sort(), 'demi-coup ' + ply);
  }
});

/* ─── 29. Table 4 contre 2 (mode Decouverte) : lecture et branchements dans le jeu ─── */
// Les morceaux sont lus sur disque (tablebase/4v2/) au lieu d'etre telecharges.
const _tb42Rep = require('path').join(__dirname, '..', 'tablebase', '4v2');
const _tb42L = [5, 6, 7, 8, 9, 8, 7, 6, 5], _tb42RC = [];
for (let r = 0; r < 9; r++) for (let c = 0; c < _tb42L[r]; c++) _tb42RC.push(r + ',' + c);
const _tb42Plateau = (A, B, fort) => { const b = {}; const f = fort || 'black', f2 = f === 'black' ? 'white' : 'black';
  A.forEach(x => b[_tb42RC[x]] = f); B.forEach(x => b[_tb42RC[x]] = f2); return b; };
const _tb42Place = (A, B, trait) => {   // position de Decouverte : 4 noires (fort), 2 blanches ; compteurs conformes
  ctx.board = _tb42Plateau(A, B); ctx.CapturedByBlack.set(5); ctx.CapturedByWhite.set(3); ctx.GameOver.set(false);
  ctx.CurrentTurn.set(trait);
};
ctx.AbaTB42.configurer({ chargeur: async nom => new Uint8Array(require('fs').readFileSync(require('path').join(_tb42Rep, nom))) });

test('4v2 : carte des orbites chargee et verifiee (44 040 representants, comme le solveur)', async () => {
  await ctx.AbaTB42.preparer();
  assert.strictEqual(ctx.AbaTB42.nOrbites, 44040);
});

test('4v2 : valeurs identiques au solveur C sur des positions de reference (gains, pertes, nulles)', async () => {
  // [cases fortes, cases faibles, trait (0 = fort), attendu (1 gain / 2 perte / 0 nulle du trait), profondeur]
  const REF = [[[52, 38, 45, 30], [46, 59], 0, 1, 47], [[55, 28, 32, 9], [19, 24], 0, 1, 61], [[35, 45, 44, 41], [27, 19], 0, 1, 63], [[13, 26, 20, 14], [11, 33], 0, 1, 13], [[16, 9, 8, 42], [31, 47], 1, 2, 66], [[17, 53, 49, 1], [30, 44], 1, 2, 76], [[44, 25, 11, 4], [40, 7], 1, 2, 76], [[44, 7, 33, 13], [29, 12], 1, 2, 64], [[0, 12, 9, 44], [1, 2], 1, 0, 0], [[48, 60, 27, 58], [55, 49], 1, 0, 0]];
  for (const [A, B, t, v, d] of REF) {
    const b = _tb42Plateau(A, B), tour = t === 0 ? 'black' : 'white';
    await ctx.AbaTB42.charger(ctx.AbaTB42.morceauDe(b, tour, 5, 3));
    const r = ctx.AbaTB42.valeur(b, tour, 5, 3);
    assert.strictEqual(r.wdl, v === 1 ? 'WIN' : v === 2 ? 'LOSS' : 'DRAW', JSON.stringify([A, B, t]));
    assert.strictEqual(r.dtw, d);
  }
});

test('4v2 : garde-fous -- position d editeur aux compteurs non conformes, ou pas un 4 contre 2', () => {
  const b = _tb42Plateau([0, 4, 26, 60], [47, 54]);
  assert.strictEqual(ctx.AbaTB42.valeur(b, 'black', 0, 0), null);
  assert.strictEqual(ctx.AbaTB42.lire({ '0,0': 'black' }, null, null), null);
});

test('4v2 : le jeu rejoue lui-meme la victoire la plus longue -- 97 demi-coups, chaque coup choisi par la table', async () => {
  _tb42Place([0, 4, 26, 60], [47, 54], 'black');
  let couleur = 'black', n = 0;
  for (;;) {
    await ctx._tb42Charger(couleur);
    const m = ctx._tb42MeilleurCoup(couleur);
    assert.ok(m, 'coup au demi-coup ' + (n + 1));
    ctx.applyMove(m, couleur); n++;
    const blanches = Object.values(ctx.board).filter(v => v === 'white').length;
    if (blanches <= 1) break;
    assert.ok(n < 120, 'la partie aurait du finir');
    couleur = couleur === 'black' ? 'white' : 'black';
  }
  assert.strictEqual(n, 97);
});

test('4v2 : verdict affiche -- consultation, puis "les Noirs gagnent en 97 demi-coups"', async () => {
  _tb42Place([0, 4, 26, 60], [47, 54], 'black');
  ctx.AbaTB42.oublier(); await ctx.AbaTB42.preparer();
  assert.match(ctx._tb42Verdict(), /consultation/);
  await ctx._tb42Charger('black');
  assert.strictEqual(ctx._tb42Verdict(), 'Finale 4 contre 2 : les Noirs gagnent en 97 demi-coups');
  ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0);           // compteurs d'editeur
  assert.strictEqual(ctx._tb42Verdict(), null);
});

test('4v2 : l IA joue le coup parfait (hors niveau facile), et l IA habituelle si la table est indisponible', async () => {
  _tb42Place([0, 4, 26, 60], [47, 54], 'black');
  await ctx._tb42Charger('black');
  const attendu = ctx._tb42MeilleurCoup('black');
  let joue = null; const sauve = { a: ctx.aiColor, e: ctx.executeAIMove };
  ctx.aiColor = () => 'black'; ctx.executeAIMove = m => { joue = m; };
  ctx.aiDifficulty = 'medium'; ctx._tb42Indispo = false;
  ctx.aiMove();
  assert.ok(joue && JSON.stringify(joue.cells) === JSON.stringify(attendu.cells) && joue.dir.q === attendu.dir.q && joue.dir.r === attendu.dir.r);
  ctx.aiColor = sauve.a; ctx.executeAIMove = sauve.e;
});

test('4v2 : adresse -> position -> adresse (tirage des positions du Trainer)', async () => {
  await ctx.AbaTB42.preparer();
  let seed = 5150; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let n = 0; n < 500; n++) {
    const s = new Set(); while (s.size < 6) s.add(Math.floor(rnd() * 61));
    const a = [...s], t = rnd() < 0.5 ? 0 : 1, ad = ctx.AbaTB42.adresse(a.slice(0, 4), a.slice(4), t);
    const p = ctx.AbaTB42.positionDe(ad.morceau, ad.decalage);
    assert.ok(p && p.trait === t);
    assert.strictEqual(ctx.AbaTB42.adresse(p.A, p.B, p.trait).index, ad.index);
  }
});

test('Trainer 4v2 : position tiree (gain en 9 a 25), coup optimal salue, defense parfaite', async () => {
  ['drawPuzzleBoardInteractive', 'initPuzzleInteraction', 'showToast', 'animatePuzzleEjection', 'showPuzzleResult'].forEach(n => { ctx[n] = () => {}; });
  for (let essai = 0; essai < 3; essai++) {
    await ctx.loadTablebase42Puzzle();
    assert.strictEqual(ctx.currentPuzzleIdx, -4);
    const d0 = ctx._tb42PuzzleDtw;
    assert.ok(d0 >= 9 && d0 <= 25 && (d0 & 1));
    const vals = Object.values(ctx.puzzleBoard);
    assert.strictEqual(vals.filter(v => v === 'black').length, 4); assert.strictEqual(vals.filter(v => v === 'white').length, 2);
    assert.strictEqual(ctx.AbaTB42.valeur(ctx.puzzleBoard, 'black', 5, 3).dtw, d0);
    const m = ctx._tb42MeilleurCoup('black', ctx.puzzleBoard, 5, 3);
    const avant = JSON.parse(JSON.stringify(ctx.puzzleBoard));
    ctx._tb42Avec(ctx.puzzleBoard, 5, 3, () => ctx.applyMove(m, 'black'));
    await ctx.tb42SeqHandleMove(avant, { valid: true, ejected: false });
    if (ctx.currentPuzzleIdx === -4) assert.strictEqual(ctx._tb42PuzzleDtw, d0 - 2);   // optimal, puis defense parfaite
    else assert.strictEqual(ctx.currentPuzzleIdx, -3);                                // la defense a ejecte : 3 contre 2
  }
});

test('Trainer 4v2 : un coup qui laisse echapper le gain est refuse, la position rendue', async () => {
  // Position trouvee par le solveur (mode "perdant") : gain en 17, mais un coup noir
  // laisse aux Blancs une ejection vers un 3 contre 2 nul.
  const pb = _tb42Plateau([0, 1, 2, 6], [5, 11]);
  ctx.puzzleBoard = pb; ctx.currentPuzzleIdx = -4; ctx._tb42PuzzleDtw = 17;
  await ctx._tb42Charger('black', pb, 5, 3);
  assert.strictEqual(ctx.AbaTB42.valeur(pb, 'black', 5, 3).dtw, 17);
  const suites = ctx._tb42Avec(pb, 5, 3, () => ctx._tb42Suites('black'));
  const mauvais = suites.find(s => { const v = ctx.AbaTB42.valeur(s.apres, 'white', 5, 3); return v && v.wdl !== 'LOSS'; });
  assert.ok(mauvais, 'le coup perdant existe');
  const avant = JSON.parse(JSON.stringify(pb)); ctx.puzzleBoard = mauvais.apres; ctx.puzzleMovesMade = 1;
  await ctx.tb42SeqHandleMove(avant, { valid: true, ejected: false });
  assert.deepStrictEqual(ctx.puzzleBoard, avant);
  assert.strictEqual(ctx.puzzleMovesMade, 0);
  assert.strictEqual(ctx.currentPuzzleIdx, -4);
});
