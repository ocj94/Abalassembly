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

test('corpus : MIGS + AbalOnline + 93 parties du tournoi + 7 de reference = 4 579', async () => {
  assert.ok(await ctx.ensureGameBanks());
  const s = await ctx.computeCorpusStats(() => {});
  assert.strictEqual(s.nMigs, 2589); assert.strictEqual(s.nAo, 1890);
  assert.strictEqual(s.nPs, 93); assert.strictEqual(s.nPsSansCoup, 3);
  assert.strictEqual(s.totalGames, 4579);
  // la duree ne compte que les parties jouees : pas de partie "a 0 coup"
  assert.strictEqual(s.nLens, 2589 + 90 + 7);
  assert.ok(s.lenMin > 0);
  const bel = s.topVariants.find(v => v[0] === 'belgian');
  assert.ok(bel && bel[1] === 98, 'Belgian Daisy : les 93 parties du tournoi + les 5 parties KAAH');
});

test("corpus : les parties importees a la volee n'y entrent pas (meme corpus pour tous)", async () => {
  ctx.PS_GAMES.push(['vol00001', '2026-09-01', 'X', 'Y', 'X gagne', 'a1b2 i5h5']);
  const s = await ctx.computeCorpusStats(() => {});
  ctx.PS_GAMES.pop();
  assert.strictEqual(s.totalGames, 4579);
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

test('bibliotheque : listee avec sa source, filtrable, et en-tete calcule (4 486 parties, 21 variantes)', async () => {
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
  assert.match(els['migs-entete'].textContent, /^4\u202f?486 parties · 21 variantes/);
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
  const i = ctx.PARTIES_REFERENCE.findIndex(g => /KAAH/.test(g[5]) && g[0] === '2026-09-28');
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
  const i = ctx.PARTIES_REFERENCE.findIndex(g => /KAAH/.test(g[5]) && g[0] === '2026-09-28');
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

/* ─── 30. Deuxieme partie KAAH (01/10/2026), et carte de chaleur des parties importees ─── */

test('KAAH 01/10/2026 : se rejoue en entier (84 demi-coups), Blancs 6 a 3, position finale = code affiche par KAAH', () => {
  ['drawBoard','updateStatus','showToast','rebuildMoveListLabels','loadSnapshot','closeMigsBrowser','resetGutterPositions','showPage'].forEach(n => { ctx[n] = () => {}; });
  const i = ctx.PARTIES_REFERENCE.findIndex(g => /KAAH/.test(g[5]) && g[0] === '2026-10-01');
  assert.ok(i >= 0);
  ctx.loadRefGame(i);
  assert.strictEqual(ctx.boardSnapshots.length, 84);
  assert.strictEqual(ctx.CapturedByWhite.get(), 6); assert.strictEqual(ctx.CapturedByBlack.get(), 3);
  // code KAAH de la position finale : 1re moitie = noires, chiffre de tete = billes ejectees
  const code = '6a2b3e7f57g8h89_3c2d235e12f3g456h4', attendu = [];
  code.split('_').forEach((m, k) => { let r = null; for (const ch of m.replace(/^\d+/, '')) { if (/[a-i]/.test(ch)) r = ch; else attendu.push(r + ch + (k ? 'w' : 'b')); } });
  const nous = [];
  for (const [kk, v] of Object.entries(ctx.boardSnapshots[83].board)) if (v) { const [r, cc] = kk.split(',').map(Number); nous.push(String(ctx.coordToABAPRO(r, cc)) + (v === 'white' ? 'w' : 'b')); }
  assert.deepStrictEqual(nous.sort(), attendu.sort());
});

const _texteKaah2 = '# 2026-10-01 · Belgian Daisy · Blanc gagne (6 éjections) · KAI++ niveau 8 (agressif v2, 30 s) vs ocj94\n1.i9h8 a5b5 2.i8h7 a4b4 3.h7g6 i5h4 4.h8g7 b4c4 5.a1b1 g3g5f2 6.c1c3d1 b5c5 7.f5g5 i5h4 8.g6g5 c5d5 9.g5g4 i6h6 10.d1e2 b6c6 11.d2e2 f4f3 12.a2b2 f2f3 13.b3c3 c6d6 14.b1d3c1 d5e5 15.e2d2 f3f4 16.g7f7 d6d5 17.h5g4 f6e5 18.b2b1 d4e4 19.f3e3 e5e4 20.d2d3 h6g6 21.d3d4 e3d3 22.d5d4 d6d5 23.d4d3 h4h5 24.d3d2 c3c4d3 25.d2e3 f5e4 26.b1a1b2 g5f4 27.d1e2 h5g5 28.d2e2 e4f5 29.f2e1 f6f5 30.e1e2 f5f4 31.g3g4h4 f2f3 32.c1d2 f5g5 33.i5i6 e4f4 34.i6h6 f4g4 35.d2e3 d4d5e4 36.h6h7 e6e5 37.e1e2d1 e4e5d4 38.d1e1 h5g4 39.b2b3 d4d3 40.d1c1 e3d2 41.h7h8 c1d2 42.f4f5 e3e2\n';
const _somme = hm => Object.values(hm || {}).reduce((a, b) => a + b, 0);
function _preparerImport(texte, pseudo) {
  const els = {}, origine = ctx.document.getElementById;
  ctx.document.getElementById = id => (els[id] || (els[id] = { value: '', textContent: '', style: {} }));
  els['bulk-history-text'] = { value: texte, style: {} }; els['bulk-history-pseudo'] = { value: pseudo, style: {} };
  els['bulk-history-status'] = { textContent: '', style: {} };
  return { els, restaurer: () => { ctx.document.getElementById = origine; } };
}

test('carte de chaleur : une partie importee (la tienne) l alimente comme une partie jouee, une seule fois', () => {
  ctx._renderHistoryList = () => {};
  ctx.localStorage.removeItem(ctx.GAME_HISTORY_KEY);
  ctx.progress.heatmaps = {};
  const r = ctx._parseBulkHistoryText(_texteKaah2, 'ocj94'), e = r[0].entry;
  // attendu : les cases de depart des billes deplacees par les Blancs, coup par coup
  const g = ctx.gameCodeParse(e.code);
  const attendu = g.moves.filter((m, k) => k % 2 === 1).reduce((a, m) => a + m.cells.length, 0);
  const io = _preparerImport(_texteKaah2, 'ocj94');
  try {
    ctx._doBulkHistoryImport();
    assert.match(io.els['bulk-history-status'].textContent, /1 partie importée.*1 ajoutée à ta carte de chaleur/);
    assert.strictEqual(_somme(ctx.progress.heatmaps['me_white']), attendu);
    assert.strictEqual(_somme(ctx.progress.heatmaps['me_white@belgian']), attendu);
    assert.strictEqual(_somme(ctx.progress.heatmaps['me_black']), 0, 'les coups noirs (l IA) ne sont pas les tiens');
    // reimport : doublon, rien n'est recompte
    ctx._doBulkHistoryImport();
    assert.match(io.els['bulk-history-status'].textContent, /déjà présente/);
    assert.doesNotMatch(io.els['bulk-history-status'].textContent, /carte de chaleur/);
    assert.strictEqual(_somme(ctx.progress.heatmaps['me_white']), attendu);
  } finally { io.restaurer(); }
});

test('carte de chaleur : une partie importee AVANT ce changement est rattrapee une fois au reimport ; une partie consultee jamais', () => {
  ctx._renderHistoryList = () => {};
  ctx.progress.heatmaps = {};
  const e = ctx._parseBulkHistoryText(_texteKaah2, 'ocj94')[0].entry;   // importee "a l'ancienne" : sans marque chaleur
  ctx.localStorage.setItem(ctx.GAME_HISTORY_KEY, JSON.stringify([e]));
  const io = _preparerImport(_texteKaah2, 'ocj94');
  try {
    ctx._doBulkHistoryImport();
    assert.match(io.els['bulk-history-status'].textContent, /1 ajoutée à ta carte de chaleur/);
    const apres1 = _somme(ctx.progress.heatmaps['me_white']); assert.ok(apres1 > 0);
    ctx._doBulkHistoryImport();
    assert.strictEqual(_somme(ctx.progress.heatmaps['me_white']), apres1, 'pas une seconde fois');
  } finally { io.restaurer(); }
  // partie consultee (ton pseudo n'y figure pas) : jamais dans ta carte
  ctx.progress.heatmaps = {};
  const consultee = ctx._parseBulkHistoryText(_texteKaah2, 'quelqu_un')[0].entry;
  assert.ok(consultee.spectateur);
  assert.strictEqual(ctx._chaleurDepuisImport(consultee), 0);
  assert.strictEqual(_somme(ctx.progress.heatmaps['me_white']) + _somme(ctx.progress.heatmaps['me_black']), 0);
});

/* ─── 31. Niveaux de l'IA numerotes de 1 a 10 ─── */

test('niveaux : 10 niveaux de plus en plus forts ; les 6 anciens conserves a l identique sous leur numero', () => {
  const C = ctx.AI_DIFFICULTY_CONFIG;
  const prof = [], temps = [];
  for (let n = 1; n <= 10; n++) { const c = C[String(n)]; assert.ok(c && c.label, 'niveau ' + n); prof.push(c.depth); temps.push(c.time); }
  for (let n = 1; n < 10; n++) {
    assert.ok(prof[n] >= prof[n - 1] && temps[n] > temps[n - 1], 'niveau ' + (n + 1) + ' au moins aussi fort que ' + n);
  }
  // anciens niveaux : exactement les memes reglages (profondeur, temps), simplement renumerotes
  const anciens = { easy: [1, 200, 1], medium: [2, 600, 3], advanced: [3, 1200, 4], hard: [4, 2500, 5], master: [6, 5000, 7], minimax: [8, 3600000, 10] };
  for (const [k, [d, ms, n]] of Object.entries(anciens)) {
    assert.strictEqual(C[k], C[String(n)], k + ' -> niveau ' + n);
    assert.deepStrictEqual([C[k].depth, C[k].time], [d, ms], k);
    assert.strictEqual(ctx._niveauIA(k), n);
  }
  assert.ok(C['1'].hasard && !C['2'].hasard, 'seul le niveau 1 joue avec du hasard');
  assert.strictEqual(ctx._niveauIA('7'), 7); assert.strictEqual(ctx._niveauIA('n\'importe'), null);
});

test('niveaux : ecran de configuration a 10 boutons numerotes, plus aucun ancien nom de niveau', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  const bloc = src.slice(src.indexOf('id="setup-diff"'), src.indexOf('id="setup-diff-info"'));
  const valeurs = [...bloc.matchAll(/setupPick\('diff','(\w+)'/g)].map(m => m[1]);
  assert.deepStrictEqual(valeurs, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
  assert.doesNotMatch(bloc, /Facile|Moyen|Avancé|Expert|Maître|Minimax/);
});

test('niveaux : l historique affiche le numero, y compris pour les anciennes parties (« Expert » -> Niveau 5)', () => {
  assert.match(ctx._historyOpponentLabel({ mode: 'ai', aiStyle: 'auto', aiDiff: 'hard' }), /— Niveau 5$/);
  assert.match(ctx._historyOpponentLabel({ mode: 'ai', aiStyle: 'auto', aiDiff: 'minimax' }), /— Niveau 10$/);
  assert.match(ctx._historyOpponentLabel({ mode: 'ai', aiStyle: 'auto', aiDiff: '9' }), /— Niveau 9$/);
});

test('niveaux : le niveau 1 (comme l ancien « Facile ») joue tout de suite, au hasard parmi les 4 premiers coups', () => {
  ctx.initBoardState(); ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0); ctx.GameOver.set(false);
  // hors des livres d'ouvertures (20 demi-coups deja joues, sans position) et sans l'historique
  // laisse par les tests precedents : seul le tirage du niveau 1 decide
  const sauve = { a: ctx.aiColor, e: ctx.executeAIMove, s: ctx.boardSnapshots, r: ctx._coupRetourEnArriere };
  ctx.boardSnapshots = Array.from({ length: 20 }, () => ({}));
  require('vm').runInContext('_bookNode = null', ctx);
  try {
    const cle = m => JSON.stringify([m.cells, m.dir]);
    const tries = () => ctx.getAllMovesForColor('white').sort((a, b) => (a.code || 9) - (b.code || 9)).map(cle);
    for (const niv of ['1', 'easy']) {
      let joue = null; ctx.aiColor = () => 'white'; ctx.executeAIMove = m => { joue = m; };
      ctx.aiDifficulty = niv; ctx.aiMove();
      assert.ok(joue, niv + ' : coup joue immediatement');
      assert.ok(tries().slice(0, 4).includes(cle(joue)), niv + ' : parmi les 4 premiers');
    }
    // v2.60 : jamais un coup qui revient en arriere -- les 4 premiers qui ne le font pas
    const T = tries(), retours = new Set(T.slice(0, 3));
    ctx._coupRetourEnArriere = m => retours.has(cle(m));
    for (let k = 0; k < 20; k++) {
      let joue = null; ctx.executeAIMove = m => { joue = m; };
      ctx.aiDifficulty = '1'; ctx.aiMove();
      assert.ok(T.slice(3, 7).includes(cle(joue)), 'parmi les 4 premiers qui ne reviennent pas en arriere');
    }
  } finally {
    ctx.aiColor = sauve.a; ctx.executeAIMove = sauve.e; ctx.boardSnapshots = sauve.s; ctx._coupRetourEnArriere = sauve.r; ctx.aiDifficulty = '3';
  }
});

/* ─── 32. Nulle : proposition reelle (IA, meme ecran, a distance) et triple repetition ─── */
function _nulleReset(mode) {
  ctx.currentLayout = 'standard'; ctx._replayStartBoard = null;   // disposition fixe : les tests precedents en changent
  ctx.initBoardState(); ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0); ctx.GameOver.set(false);
  ctx.boardSnapshots = []; ctx.MoveCount.set(0); ctx.CurrentTurn.set('black'); ctx.GameMode.set(mode || 'ai');
  ctx._nulleRefuseeAuCoup = -99; ctx.localStorage.removeItem(ctx.GAME_HISTORY_KEY);
  ctx.replayMode = false; ctx.variantMode = false; ctx.botDuelMode = false;   // une vraie partie en cours
  ['showToast', 'drawBoard', 'renderStyleCard', 'renderHeatmapCard', 'updateHeroStats', 'notifierSiAbsent', 'onGamePlayed'].forEach(n => { ctx[n] = () => {}; });
}
// joue un coup sur le vrai plateau et l'enregistre comme le jeu (instantane + compteur)
function _nulleJouer(m, couleur) {
  ctx.applyMove(m, couleur);
  ctx.boardSnapshots.push({ board: JSON.parse(JSON.stringify(ctx.board)), moveInfo: { cells: m.cells.slice(), dir: m.dir, type: m.info.type, ejection: !!m.info.ejection } });
  ctx.MoveCount.inc(); ctx.CurrentTurn.set(couleur === 'black' ? 'white' : 'black');
}
// coup designe par sa case et sa direction, cherche sur la position COURANTE
function _coup(couleur, rc, dir) {
  return ctx.getAllMovesForColor(couleur).find(x => x.cells.length === 1 && x.cells[0].r === rc.r && x.cells[0].c === rc.c && x.dir.q === dir.q && x.dir.r === dir.r);
}
function _allerRetour(couleur) {   // une bille qui avance d'un pas puis revient
  const m = ctx.getAllMovesForColor(couleur).find(x => x.cells.length === 1 && x.info.type === 'move');
  const a = ctx.rcToAxial(m.cells[0].r, m.cells[0].c), dest = ctx.axialToRc(a.q + m.dir.q, a.r + m.dir.r);
  return { depart: m.cells[0], dest: dest, dir: m.dir, inverse: { q: -m.dir.q, r: -m.dir.r } };
}

test('nulle : le bouton propose vraiment la nulle (plus de faux message)', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.doesNotMatch(src, /showToast\('🤝 Demande de nulle envoyée'\)/);
  assert.match(src, /onclick="proposerNulle\(\)"/);
});

test('nulle : triple repetition jouee coup par coup -- 3e retour de la meme position, meme camp au trait', () => {
  _nulleReset('local'); ctx._replayStartBoard = null;
  const n = _allerRetour('black'), b = _allerRetour('white');
  let nulle = false, plis = 0;
  for (let tour = 0; tour < 4 && !nulle; tour++) {
    for (const [c, rc, dir] of [['black', n.depart, n.dir], ['white', b.depart, b.dir], ['black', n.dest, n.inverse], ['white', b.dest, b.inverse]]) {
      const m = _coup(c, rc, dir); assert.ok(m, 'coup ' + (plis + 1));
      _nulleJouer(m, c); plis++;
      if (ctx._verifierRepetition()) { nulle = true; break; }
    }
  }
  assert.ok(nulle, 'nulle constatee');
  // la position de depart revient aux demi-coups 4 et 8 : avec le depart lui-meme, 3 fois
  // au 8e demi-coup -- avant la position qui suit le 1er coup noir (1, 5 et 9)
  assert.strictEqual(plis, 8, 'au 3e retour, position de depart comprise');
  assert.ok(ctx.GameOver.get());
  const h = ctx.getGameHistory()[0];
  assert.strictEqual(h.winner, null); assert.strictEqual(h.reason, 'repetition');
  assert.match(ctx._historyResultBadge({ mode: 'ai', winner: null }), /Nulle/);
});

test('nulle : une position revenue avec l AUTRE camp au trait ne compte pas', () => {
  _nulleReset('local');
  const cle = ctx._repKeyOf(ctx.board), autre = JSON.parse(JSON.stringify(ctx.board));
  // meme plateau aux instantanes 0, 2, 4... (camp au trait different de l'instantane courant)
  for (let k = 0; k < 9; k++) ctx.boardSnapshots.push({ board: k % 2 === 0 ? JSON.parse(JSON.stringify(ctx.board)) : autre });
  ctx.board = autre; ctx.boardSnapshots[8] = { board: autre };
  const comptes = [];
  for (let k = 8; k >= 0; k -= 2) comptes.push(ctx._repKeyOf(ctx.boardSnapshots[k].board) === ctx._repKeyOf(ctx.board));
  assert.ok(comptes.length >= 3);
  ctx.boardSnapshots = [];
  for (let k = 0; k < 9; k++) ctx.boardSnapshots.push({ board: { '0,0': k % 2 ? 'white' : 'black' } });   // la position "A" revient 5 fois, mais aux indices pairs
  ctx.board = { '0,0': 'white' };  ctx.boardSnapshots.push({ board: { '0,0': 'white' } });                // courant : indice 9 (impair) -> 'white' aux indices impairs : 1,3,5,7,9
  assert.strictEqual(ctx._verifierRepetition(), true, 'meme parite : nulle');
  _nulleReset('local');
  for (let k = 0; k < 9; k++) ctx.boardSnapshots.push({ board: { '0,0': k % 2 ? 'white' : 'black' } });
  ctx.board = { '0,0': 'black' }; ctx.boardSnapshots.push({ board: { '0,1': 'black' } });             // courant different : aucune repetition
  assert.strictEqual(ctx._verifierRepetition(), false);
  assert.ok(!ctx.GameOver.get());
});

test('nulle contre l IA : trop tot, refus quand elle mene, acceptation quand elle est derriere', () => {
  _nulleReset('ai'); const sauve = ctx.aiColor; ctx.aiColor = () => 'white';
  let msg = ''; ctx.showToast = m => { msg = m; };
  ctx.MoveCount.set(5); ctx.proposerNulle();
  assert.match(msg, /refuse la nulle : trop tôt/); assert.ok(!ctx.GameOver.get());
  ctx.MoveCount.set(30); ctx._nulleRefuseeAuCoup = -99; ctx.CapturedByWhite.set(2); ctx.CapturedByBlack.set(0);   // l'IA (Blancs) mene
  ctx.proposerNulle(); assert.match(msg, /elle mène aux éjections/); assert.ok(!ctx.GameOver.get());
  ctx.MoveCount.set(33); ctx.proposerNulle(); assert.match(msg, /vient de refuser/);                           // anti-harcelement
  ctx.MoveCount.set(40); ctx.CapturedByWhite.set(0); ctx.CapturedByBlack.set(2);                                // l'IA est derriere
  _nulleJouer(ctx.getAllMovesForColor('black').find(x => x.info.type === 'move'), 'black');                    // un coup, pour l'historique
  ctx.MoveCount.set(41); ctx.proposerNulle();
  assert.ok(ctx.GameOver.get(), 'l IA accepte');
  assert.strictEqual(ctx.getGameHistory()[0].reason, 'accord');
  ctx.aiColor = sauve;
});

test('nulle a deux sur le meme ecran : l autre joueur accepte ou refuse', () => {
  _nulleReset('local'); _nulleJouer(ctx.getAllMovesForColor('black').find(x => x.info.type === 'move'), 'black');
  let question = ''; ctx.confirm = q => { question = q; return false; };
  ctx.proposerNulle();
  assert.match(question, /Les Blancs proposent la nulle[\s\S]*Les Noirs acceptent-ils/); assert.ok(!ctx.GameOver.get());
  ctx.confirm = () => true; ctx.proposerNulle(); assert.ok(ctx.GameOver.get());
});

test('nulle a distance : la proposition part chez l adversaire, qui repond', () => {
  _nulleReset('local'); _nulleJouer(ctx.getAllMovesForColor('black').find(x => x.info.type === 'move'), 'black');
  const envoyes = []; ctx._rtcChannel = { readyState: 'open', send: m => envoyes.push(m) };
  try {
    ctx.proposerNulle(); assert.deepStrictEqual(envoyes, ['NULLE:offre']); assert.ok(!ctx.GameOver.get(), 'pas de decision locale');
    ctx._rtcMessageNulle('NULLE:refuse'); assert.ok(!ctx.GameOver.get());
    ctx.confirm = () => true; ctx._rtcMessageNulle('NULLE:offre');                 // proposition recue, acceptee
    assert.strictEqual(envoyes[envoyes.length - 1], 'NULLE:accepte'); assert.ok(ctx.GameOver.get());
    ctx.GameOver.set(false); ctx._rtcMessageNulle('NULLE:accepte'); assert.ok(ctx.GameOver.get());
  } finally { ctx._rtcChannel = null; }
});

/* ─── 33. Fin de partie : le camp REEL du joueur (une victoire avec les Blancs comptait comme une defaite) ─── */
function _finPartie(opts) {
  const els = {}; const origine = ctx.document.getElementById;
  ctx.document.getElementById = id => (els[id] || (els[id] = { textContent: '', classList: { add(){}, remove(){} }, style: {} }));
  // fonctions remplacees le temps du test, puis RETABLIES (sinon les tests suivants
  // heriteraient, par exemple, d'un historique qui n'enregistre plus rien)
  const _noms = ['showToast', 'soundWin', 'renderStyleCard', 'renderHeatmapCard', 'updateHeroStats', 'notifierSiAbsent', 'stopGameTimer', 'clearSavedGame', '_recordGameHistory', 'winIntegrityOK'];
  const _orig = {}; _noms.forEach(n => { _orig[n] = ctx[n]; ctx[n] = () => {}; });
  ctx.winIntegrityOK = () => true;
  let joue = null, badge = null;
  const sauveO = ctx.onGamePlayed, sauveB = ctx.awardBadge;
  ctx.onGamePlayed = r => { joue = r; }; ctx.awardBadge = b => { badge = b; };
  ctx.GameMode.set(opts.mode || 'ai'); ctx.HumanColor.set(opts.humain || 'black'); ctx.kidsMode = !!opts.enfant;
  ctx.MoveCount.set(40); ctx.GameOver.set(false);
  ctx.CapturedByBlack.set(opts.cN || 0); ctx.CapturedByWhite.set(opts.cB || 0);
  try { ctx.triggerWin(opts.gagnant, opts.raison); }
  finally { ctx.document.getElementById = origine; ctx.onGamePlayed = sauveO; ctx.awardBadge = sauveB; ctx.kidsMode = false; _noms.forEach(n => { ctx[n] = _orig[n]; }); }
  return { titre: els['win-title'].textContent, texte: els['win-sub'].textContent, victoire: joue, badge };
}

test('fin de partie : tu gagnes AVEC LES BLANCS -> « Victoire ! », comptee comme une victoire', () => {
  const r = _finPartie({ humain: 'white', gagnant: 'white', cB: 6, cN: 2 });
  assert.strictEqual(r.titre, 'Victoire !'); assert.match(r.texte, /Vous avez éjecté 6 billes adverses/);
  assert.strictEqual(r.victoire, true, 'ELO / XP / serie : une victoire');
});

test('fin de partie : tu perds avec les Blancs -> « Défaite… », comptee comme une defaite', () => {
  const r = _finPartie({ humain: 'white', gagnant: 'black', cN: 6, cB: 1 });
  assert.strictEqual(r.titre, 'Défaite…'); assert.strictEqual(r.victoire, false);
});

test('fin de partie : avec les Noirs, rien ne change (non-regression)', () => {
  assert.strictEqual(_finPartie({ humain: 'black', gagnant: 'black', cN: 6 }).titre, 'Victoire !');
  const p = _finPartie({ humain: 'black', gagnant: 'white', cB: 6 });
  assert.strictEqual(p.titre, 'Défaite…'); assert.strictEqual(p.victoire, false);
});

test('fin de partie : un abandon n est plus decrit comme « 6 billes ejectees »', () => {
  const r = _finPartie({ humain: 'black', gagnant: 'white', raison: 'resign', cN: 1, cB: 2 });
  assert.strictEqual(r.titre, 'Défaite…'); assert.strictEqual(r.texte, 'Vous avez abandonné.');
  assert.strictEqual(_finPartie({ humain: 'white', gagnant: 'white', raison: 'resign', cB: 2 }).texte, 'Votre adversaire a abandonné.');
});

test('fin de partie : a deux sur le meme ecran, le camp gagnant (ni victoire ni defaite)', () => {
  const r = _finPartie({ mode: 'local', gagnant: 'white', cB: 6 });
  assert.strictEqual(r.titre, 'Les Blancs gagnent !'); assert.match(r.texte, /Les Blancs ont éjecté 6 billes/);
});

test('fin de partie : mode Enfant et badge Blanchissage suivent aussi le camp reel', () => {
  assert.strictEqual(_finPartie({ humain: 'white', gagnant: 'white', cB: 6, enfant: true }).titre, 'Bravo, tu as gagné ! 🎉');
  assert.strictEqual(_finPartie({ humain: 'white', gagnant: 'white', cB: 6, cN: 0 }).badge, 'shutout', '6-0 avec les Blancs');
  assert.strictEqual(_finPartie({ humain: 'white', gagnant: 'white', cB: 6, cN: 1 }).badge, null);
});

test('nulle : comptee dans la progression (partie jouee, nulle), ELO neutre', () => {
  ctx.initBoardState(); ctx.GameOver.set(false); ctx.MoveCount.set(30); ctx.GameMode.set('local');
  const _noms = ['showToast', 'drawBoard', 'renderStyleCard', 'renderHeatmapCard', 'updateHeroStats', 'notifierSiAbsent', '_recordGameHistory', 'clearSavedGame', 'stopGameTimer'];
  const _orig = {}; _noms.forEach(n => { _orig[n] = ctx[n]; ctx[n] = () => {}; });
  let joue = null; const sauve = ctx.onGamePlayed; ctx.onGamePlayed = r => { joue = r; };
  try { ctx._declarerNulle('accord'); } finally { ctx.onGamePlayed = sauve; _noms.forEach(n => { ctx[n] = _orig[n]; }); }
  assert.strictEqual(joue, 'draw');
});

/* ─── 34. Pendules : Chrono, Bonus, Delai, bonus par ejection, duree de chaque coup ─── */
function _pendule(code) {
  ctx.GameMode.set('ai'); ctx.HumanColor.set('black'); ctx.GameOver.set(false); ctx.timerPaused = false;
  ctx.replayMode = false; ctx.botDuelMode = false; ctx._tourneyMatch = null;
  ['playSfx', 'showToast'].forEach(n => { ctx[n] = () => {}; });
  const k = ctx._appliquerCadence(code);
  ctx.myTime = k.base; ctx.oppTime = k.base; ctx.CurrentTurn.set('black');
  return k;
}

test('pendules : lecture des codes -- les anciennes cadences inchangees, les nouveaux modes reconnus', () => {
  const L = v => { const k = ctx._lireCadence(v); return [k.mode, k.base, k.inc, k.delai, k.ej]; };
  assert.deepStrictEqual(L(''), ['libre', 0, 0, 0, 0]);
  assert.deepStrictEqual(L('300+3'), ['bonus', 300, 3, 0, 0], 'ancienne cadence : meme sens');
  assert.deepStrictEqual(L('1200+10'), ['bonus', 1200, 10, 0, 0]);
  assert.deepStrictEqual(L('C'), ['chrono', 0, 0, 0, 0]);
  assert.deepStrictEqual(L('D300+5'), ['delai', 300, 0, 5, 0]);
  assert.deepStrictEqual(L('D300+5e10'), ['delai', 300, 0, 5, 10]);
  assert.deepStrictEqual(L('600+5e15'), ['bonus', 600, 5, 0, 15]);
  assert.deepStrictEqual(L('n importe quoi'), ['libre', 0, 0, 0, 0]);
  assert.strictEqual(ctx._decrireCadence('D300+5e10'), '5 min, délai de 5 s par coup, + 10 s par éjection');
});

test('pendules : Bonus (comportement historique) -- decompte et +bonus apres le coup', () => {
  _pendule('60+5');
  for (let i = 0; i < 3; i++) ctx.tickTimers();
  assert.strictEqual(ctx.myTime, 57);
  ctx.boardSnapshots = [{ moveInfo: { ejection: false } }]; ctx._clockInc('black');
  assert.strictEqual(ctx.myTime, 62);
});

test('pendules : Delai -- les secondes offertes ne sont pas decomptees, a chaque coup', () => {
  _pendule('D60+3');
  for (let i = 0; i < 3; i++) ctx.tickTimers();
  assert.strictEqual(ctx.myTime, 60, 'les 3 premieres secondes sont offertes');
  ctx.tickTimers(); ctx.tickTimers();
  assert.strictEqual(ctx.myTime, 58, 'puis le temps est decompte');
  ctx.boardSnapshots = [{ moveInfo: { ejection: false } }]; ctx._clockInc('black'); ctx.CurrentTurn.set('white');
  assert.strictEqual(ctx.myTime, 58, 'le delai n ajoute pas de temps');
  for (let i = 0; i < 4; i++) ctx.tickTimers();
  assert.strictEqual(ctx.oppTime, 59, 'l adversaire a lui aussi ses 3 secondes offertes');
});

test('pendules : bonus par ejection, en Bonus comme en Delai', () => {
  _pendule('D60+3e10');
  ctx.boardSnapshots = [{ moveInfo: { ejection: true } }]; ctx._clockInc('black');
  assert.strictEqual(ctx.myTime, 70);
  _pendule('60+2e10');
  ctx.boardSnapshots = [{ moveInfo: { ejection: true } }]; ctx._clockInc('white');
  assert.strictEqual(ctx.oppTime, 72, 'bonus par coup + bonus par ejection');
});

test('pendules : Chrono -- le temps de chaque joueur monte, jamais de drapeau', () => {
  _pendule('C'); let tombe = false; const sauve = ctx._flagFall; ctx._flagFall = () => { tombe = true; };
  for (let i = 0; i < 4; i++) ctx.tickTimers();
  ctx.CurrentTurn.set('white'); ctx.tickTimers(); ctx.tickTimers();
  assert.deepStrictEqual([ctx.myTime, ctx.oppTime], [4, 2]); assert.ok(!tombe);
  ctx._flagFall = sauve;
});

test('pendules : en Delai, le drapeau tombe quand le temps est epuise apres le delai', () => {
  _pendule('D60+2'); ctx.myTime = 1; ctx._delaiRestant = 0;
  let perdant = null; const sauve = ctx._flagFall; ctx._flagFall = c => { perdant = c; };
  ctx.tickTimers();
  assert.strictEqual(perdant, 'black'); ctx._flagFall = sauve;
});

test('pendules : la duree de chaque coup joue en direct est gardee et affichee', () => {
  _pendule('300+3');
  const els = {}; const origine = ctx.document.getElementById;
  ctx.document.getElementById = id => (els[id] || (els[id] = { innerHTML: '', textContent: '', classList: { add(){}, remove(){}, toggle(){} }, style: {} }));
  try {
    ctx.boardSnapshots = [{ moveInfo: { ejection: false } }];
    ctx._debutCoupMs = Date.now() - 12000; ctx._clockInc('black');
    assert.strictEqual(ctx.boardSnapshots[0].duree, 12);
    assert.strictEqual(ctx._dureeDernierCoup.black, 12);
    assert.match(els['clock-bottom-who'].innerHTML, /⏱ 12 s/);
  } finally { ctx.document.getElementById = origine; }
});

test('pendules : le formulaire « Personnaliser » construit le bon code', () => {
  const els = { 'cad-mode': { value: 'delai' }, 'cad-base': { value: '10' }, 'cad-x': { value: '5' }, 'cad-ej': { value: '10' } };
  const origine = ctx.document.getElementById;
  ctx.document.getElementById = id => els[id] || null;
  try {
    assert.strictEqual(ctx._cadencePersoCode(), 'D600+5e10');
    els['cad-mode'].value = 'bonus'; els['cad-ej'].value = '0';
    assert.strictEqual(ctx._cadencePersoCode(), '600+5');
  } finally { ctx.document.getElementById = origine; }
});

/* ─── 35. Troisieme partie KAAH (02/10/2026) ─── */
test('KAAH 02/10/2026 : se rejoue en entier (216 demi-coups), Blancs 6 a 5, position finale = code affiche par KAAH', () => {
  ['drawBoard','updateStatus','showToast','rebuildMoveListLabels','loadSnapshot','closeMigsBrowser','resetGutterPositions','showPage'].forEach(n => { ctx[n] = () => {}; });
  const i = ctx.PARTIES_REFERENCE.findIndex(g => /KAAH/.test(g[5]) && g[0] === '2026-10-02');
  assert.ok(i >= 0);
  ctx.loadRefGame(i);
  assert.strictEqual(ctx.boardSnapshots.length, 216);
  assert.strictEqual(ctx.CapturedByWhite.get(), 6); assert.strictEqual(ctx.CapturedByBlack.get(), 5);
  const code = '6b5d2e3458f56_5b34c67d34567', attendu = [];
  code.split('_').forEach((m, k) => { let r = null; for (const ch of m.replace(/^\d+/, '')) { if (/[a-i]/.test(ch)) r = ch; else attendu.push(r + ch + (k ? 'w' : 'b')); } });
  const nous = [];
  for (const [kk, v] of Object.entries(ctx.boardSnapshots[215].board)) if (v) { const [r, cc] = kk.split(',').map(Number); nous.push(String(ctx.coordToABAPRO(r, cc)) + (v === 'white' ? 'w' : 'b')); }
  assert.deepStrictEqual(nous.sort(), attendu.sort());
});

/* ─── 36. Fichiers partages vers Abalassembly (Android : « Partager » ; ordinateur : « Ouvrir avec ») ─── */
test('manifeste : cible de partage (POST, fichiers .txt / .json) et gestion de fichiers, dans le perimetre de l app', () => {
  const m = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '..', 'manifest.json'), 'utf8'));
  const s = m.share_target;
  assert.ok(s && s.method === 'POST' && s.enctype === 'multipart/form-data');
  assert.strictEqual(s.action, 'partage');                 // relatif au manifeste : ./partage, dans le perimetre "."
  const f = s.params.files[0];
  assert.strictEqual(f.name, 'fichiers');
  assert.ok(f.accept.includes('text/plain') && f.accept.includes('.txt'));
  assert.ok(m.file_handlers && m.file_handlers[0].accept['text/plain'].includes('.txt'));
});

// sw.js execute dans un environnement simule (caches, fetch, evenements)
function _swSimule(enLigne) {
  const vm = require('vm'), fs = require('fs'), path = require('path');
  const magasins = new Map(), cles = u => new URL(typeof u === 'string' ? u : u.url, 'https://ocj94.github.io/Abalassembly/sw.js').href;
  const cache = nom => { if (!magasins.has(nom)) magasins.set(nom, new Map()); const m = magasins.get(nom);
    return { add: async u => { m.set(cles(u), new Response('page')); }, put: async (u, r) => { m.set(cles(u), r); },
             match: async u => (m.get(cles(u)) || undefined), delete: async u => m.delete(cles(u)) }; };
  const ecouteurs = {}, appelsReseau = [];
  const env = { self: null, caches: { open: async n => cache(n), keys: async () => [...magasins.keys()], delete: async n => magasins.delete(n),
                                      match: async u => { for (const m of magasins.values()) { const r = m.get(cles(u)); if (r) return r; } } },
    fetch: async req => { appelsReseau.push(req.url); if (!enLigne) throw new Error('hors ligne'); return new Response('frais : ' + req.url, { status: 200 }); },
    URL, Response, Request, FormData, File, Blob, console, Promise, String, JSON, setTimeout };
  env.self = { location: new URL('https://ocj94.github.io/Abalassembly/sw.js'), addEventListener: (t, f) => { ecouteurs[t] = f; }, skipWaiting() {}, clients: { claim: async () => {} } };
  vm.createContext(env); vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), env);
  const lancer = async req => { let rep = null; ecouteurs.fetch({ request: req, respondWith: p => { rep = p; } }); return rep ? await rep : null; };
  return { lancer, magasins, appelsReseau, cache };
}

test('sw.js : un fichier partage est mis de cote, puis la page s ouvre sur ./?partage=1', async () => {
  const sw = _swSimule(true);
  const fd = new FormData(); fd.append('fichiers', new File(['# 2026-10-02 · Belgian Daisy · Blanc gagne\n1.i9h8 a5b5'], 'partie-kaah.txt', { type: 'text/plain' }));
  const rep = await sw.lancer(new Request('https://ocj94.github.io/Abalassembly/partage', { method: 'POST', body: fd }));
  assert.strictEqual(rep.status, 303);
  assert.strictEqual(rep.headers.get('location'), 'https://ocj94.github.io/Abalassembly/?partage=1');
  const enAttente = await (await sw.cache('abalassembly-partage').match('partage-en-attente')).json();
  assert.deepStrictEqual(enAttente.map(x => x.nom), ['partie-kaah.txt']);
  assert.match(enAttente[0].texte, /Blanc gagne/);
});

test('sw.js : reseau d abord pour le site, repli sur le cache hors ligne, autres domaines jamais interceptes', async () => {
  const sw = _swSimule(true);
  const r1 = await sw.lancer(new Request('https://ocj94.github.io/Abalassembly/tablebase/4v2/s000.bin.gz'));
  assert.match(await r1.text(), /^frais/);
  await new Promise(r => setTimeout(r, 0));
  const ps = await sw.lancer(new Request('https://playstrategy.org/api/stream/game/abc'));
  assert.strictEqual(ps, null, 'les flux PlayStrategy ne sont pas interceptes');
  // meme environnement, reseau coupe : le morceau deja vu vient du cache
  const horsLigne = _swSimule(false); horsLigne.magasins.set('abalassembly-v3', sw.magasins.get('abalassembly-v3'));
  const r2 = await horsLigne.lancer(new Request('https://ocj94.github.io/Abalassembly/tablebase/4v2/s000.bin.gz'));
  assert.match(await r2.text(), /^frais/, 'servi depuis le cache');
});

test('page : le fichier partage remplit la fenetre « Importer un historique » (rien n est importe sans confirmation)', async () => {
  const els = {}; const origine = ctx.document.getElementById;
  ctx.document.getElementById = id => (els[id] || (els[id] = { value: '', textContent: '', style: {} }));
  let ouverte = 0, importe = 0; const sO = ctx.openBulkHistoryImportModal, sI = ctx._doBulkHistoryImport;
  ctx.openBulkHistoryImportModal = () => { ouverte++; }; ctx._doBulkHistoryImport = () => { importe++; };
  ctx.skipIntro = () => {};
  try {
    assert.ok(ctx._ouvrirImportAvecTextes([{ nom: 'partie-kaah.txt', texte: '# 2026-10-02 · Belgian Daisy\n1.i9h8 a5b5' }]));
    assert.strictEqual(ouverte, 1); assert.strictEqual(importe, 0, 'l utilisateur confirme lui-meme');
    assert.match(els['bulk-history-text'].value, /^# 2026-10-02/);
    assert.match(els['bulk-history-status'].textContent, /Reçu : partie-kaah\.txt/);
    // reprise depuis le cache, a l'ouverture sur ./?partage=1
    const stock = new Map([['partage-en-attente', new Response(JSON.stringify([{ nom: 'a.txt', texte: '# x\n1.i9h8' }]))]]);
    ctx.caches = { open: async () => ({ match: async k => stock.get(k), delete: async k => stock.delete(k) }) };
    ctx.location = { search: '?partage=1', pathname: '/Abalassembly/' }; let nettoye = null; ctx.history = { replaceState: (a, b, u) => { nettoye = u; } };
    assert.ok(await ctx._recupererPartageEnAttente());
    assert.strictEqual(nettoye, '/Abalassembly/'); assert.ok(!stock.has('partage-en-attente'), 'pris une seule fois');
    assert.strictEqual(ouverte, 2);
  } finally { ctx.document.getElementById = origine; ctx.openBulkHistoryImportModal = sO; ctx._doBulkHistoryImport = sI; }
});

/* ─── 37. Reflexion max de l'IA, reglable (vide = sans limite) ─── */
test('reflexion : le champ prend le temps habituel du niveau ; vide = sans limite ; grise au niveau 1', () => {
  const els = {}; const origine = ctx.document.getElementById;
  ctx.document.getElementById = id => (els[id] || (els[id] = { value: '', textContent: '', disabled: false, style: {} }));
  try {
    ctx._setupCfg.diff = '5'; ctx._setupReflexionDefaut('5');
    assert.strictEqual(els['setup-reflexion'].value, '2.5'); assert.strictEqual(ctx._setupCfg.reflexion, 2.5);
    assert.doesNotMatch(els['setup-diff-info'].textContent, /Réflexion réglée/, 'inchange par defaut');
    els['setup-reflexion'].value = ''; ctx._setupReflexionMaj();
    assert.strictEqual(ctx._setupCfg.reflexion, ''); assert.match(els['setup-diff-info'].textContent, /sans limite/);
    els['setup-reflexion'].value = '7,5'; ctx._setupReflexionMaj();
    assert.strictEqual(ctx._setupCfg.reflexion, 7.5); assert.match(els['setup-diff-info'].textContent, /7,5 s au plus/);
    els['setup-reflexion'].value = '99999'; ctx._setupReflexionMaj(); assert.strictEqual(ctx._setupCfg.reflexion, 3600);
    ctx._setupCfg.diff = '10'; ctx._setupReflexionDefaut('10'); assert.strictEqual(els['setup-reflexion'].value, '', 'niveau 10 : deja sans limite');
    ctx._setupCfg.diff = '1'; ctx._setupReflexionDefaut('1'); assert.ok(els['setup-reflexion'].disabled, 'niveau 1 : coup immediat');
  } finally { ctx.document.getElementById = origine; }
});

test('reflexion : l IA recoit le temps choisi -- par defaut celui du niveau, vide = sans limite, hors tournoi', () => {
  // position sans livre d'ouvertures ni table de finale : 6 billes de chaque camp
  ctx.currentLayout = 'standard'; ctx.board = {};
  ['4,0','4,1','4,2','3,0','3,1','3,2'].forEach(k => ctx.board[k] = 'black');
  ['4,6','4,7','4,8','5,5','5,6','5,7'].forEach(k => ctx.board[k] = 'white');
  ctx.CapturedByBlack.set(8); ctx.CapturedByWhite.set(8); ctx.GameOver.set(false); ctx.GameMode.set('ai');
  ctx.MoveCount.set(40); ctx.replayMode = false; ctx._tourneyMatch = null;
  const sauve = { a: ctx.aiColor, r: ctx.requestAIMovePooled, s: ctx.showAIThinking };
  let params = null; ctx.aiColor = () => 'white'; ctx.showAIThinking = () => {};
  ctx.requestAIMovePooled = (p) => { params = p; return true; };
  const temps = (reflexion, niveau) => { params = null; ctx.aiDifficulty = niveau || '5'; ctx.aiReflexionMax = reflexion; ctx.aiMove(); return params && params.time; };
  try {
    assert.strictEqual(temps(null), 2500, 'niveau 5, temps habituel');
    assert.strictEqual(temps(''), 3600000, 'sans limite (plafond de securite 1 h)');
    assert.strictEqual(temps(7.5), 7500, '7,5 s au plus');
    assert.strictEqual(temps(0.5, '8'), 500, 'aussi aux niveaux eleves');
    ctx._tourneyMatch = { cfg: { depth: 3, time: 1200 } };
    assert.strictEqual(temps(30), 1200, 'les tournois gardent leurs propres reglages');
  } finally { ctx._tourneyMatch = null; ctx.aiReflexionMax = null; ctx.aiDifficulty = '3'; ctx.aiColor = sauve.a; ctx.requestAIMovePooled = sauve.r; ctx.showAIThinking = sauve.s; }
});

test('reflexion : les robots adversaires gardent le temps de leur niveau', () => {
  ctx.aiReflexionMax = 12; ctx.showToast = () => {};
  ctx.setBotDifficulty('3', { parentElement: { querySelectorAll: () => [] }, classList: { add(){} } });
  assert.strictEqual(ctx.aiReflexionMax, null);
});

/* ─── 38. Reflexion de l'IA : releve en partie et mesure sur le corpus ─── */
test('reflexion (releve) : chaque coup de l IA contre toi est note ; jamais en tournoi ni a deux', () => {
  ctx.localStorage.removeItem(ctx.STATS_REFLEXION_KEY);
  ctx.initBoardState(); ctx.GameMode.set('ai'); ctx._tourneyMatch = null; ctx.aiDifficulty = '6'; ctx.MoveCount.set(30);
  ctx._releverReflexion({ depth: 5, time: 3400, nodes: 170000 }, { time: 3500 });
  const l = JSON.parse(ctx.localStorage.getItem(ctx.STATS_REFLEXION_KEY));
  assert.strictEqual(l.length, 1);
  assert.deepStrictEqual([l[0].n, l[0].b, l[0].t, l[0].p, l[0].k, l[0].ph], [6, 3500, 3400, 5, 170000, 'milieu']);
  ctx._tourneyMatch = { cfg: {} }; ctx._releverReflexion({ depth: 3, time: 10 }, { time: 10 }); ctx._tourneyMatch = null;
  ctx.GameMode.set('local'); ctx._releverReflexion({ depth: 3, time: 10 }, { time: 10 }); ctx.GameMode.set('ai');
  assert.strictEqual(JSON.parse(ctx.localStorage.getItem(ctx.STATS_REFLEXION_KEY)).length, 1);
});

test('reflexion (releve) : resume par niveau -- medianes, profondeur max, positions par seconde', () => {
  const r = ctx._statsReflexionResume([
    { n: 5, t: 2000, p: 4, k: 100000 }, { n: 5, t: 2500, p: 5, k: 150000 }, { n: 5, t: 2400, p: 4, k: 120000 },
    { n: 8, t: 10000, p: 7, k: 900000 }]);
  assert.strictEqual(r.length, 2);
  assert.deepStrictEqual([r[0].niveau, r[0].coups, r[0].tempsMed, r[0].profMed, r[0].profMax], [5, 3, 2400, 4, 5]);
  assert.strictEqual(r[0].parSeconde, Math.round(370000 / 6900 * 1000));
  assert.strictEqual(r[1].profMax, 7);
});

test('reflexion (mesure) : positions de vraies parties, 2 par phase, tirage reproductible', async () => {
  await ctx.ensureGameBanks();
  const a = ctx._positionsMesure(), b = ctx._positionsMesure();
  for (const ph of ['ouverture', 'milieu', 'finale']) {
    assert.strictEqual(a[ph].length, 2, ph);
    a[ph].forEach(p => { assert.strictEqual(ctx._phaseJeu(p.board, p.ply), ph); const n = Object.values(p.board).filter(Boolean).length; assert.strictEqual(n, 28 - p.cB - p.cW); });
  }
  assert.deepStrictEqual(a.milieu.map(p => [p.partie, p.ply]), b.milieu.map(p => [p.partie, p.ply]), 'meme corpus, memes positions');
});

test('reflexion (mesure) : 5 temps x 6 positions, enregistree, tableau par phase', async () => {
  const appels = [];
  const res = await ctx.mesurerProfondeurCorpus({ chercher: async (p, ms) => { appels.push(ms); return { depth: ms >= 5000 ? 7 : ms >= 1000 ? 5 : 4, nodes: ms * 50, time: ms }; } });
  assert.strictEqual(appels.length, 30);
  assert.deepStrictEqual([...new Set(appels)], [500, 1000, 2500, 5000, 10000]);
  assert.strictEqual(JSON.parse(ctx.localStorage.getItem(ctx.MESURE_CORPUS_KEY)).lignes.length, 30);
  const html = ctx._tableauMesure(res);
  assert.match(html, /<td>10 s<\/td><td>7<\/td><td>7<\/td><td>7<\/td>/);
  assert.match(html, /<td>0,5 s<\/td><td>4<\/td>/);
  assert.match(html, /6 positions de vraies parties/);
});

test('reflexion (releve) : branche dans aiMove -- les mesures du calcul sont notees au coup joue', () => {
  ctx.localStorage.removeItem(ctx.STATS_REFLEXION_KEY);
  ctx.currentLayout = 'standard'; ctx.board = {};
  ['4,0','4,1','4,2','3,0','3,1','3,2'].forEach(k => ctx.board[k] = 'black');
  ['4,6','4,7','4,8','5,5','5,6','5,7'].forEach(k => ctx.board[k] = 'white');
  ctx.CapturedByBlack.set(8); ctx.CapturedByWhite.set(8); ctx.GameOver.set(false); ctx.GameMode.set('ai'); ctx.MoveCount.set(40);
  ctx.replayMode = false; ctx._tourneyMatch = null; ctx.aiDifficulty = '4'; ctx.aiReflexionMax = null;
  const sauve = { a: ctx.aiColor, r: ctx.requestAIMovePooled, s: ctx.showAIThinking, e: ctx.executeAIMove, u: ctx.updateAIMetrics };
  ctx.aiColor = () => 'white'; ctx.showAIThinking = () => {}; ctx.executeAIMove = () => {}; ctx.updateAIMetrics = () => {};
  ctx.requestAIMovePooled = (p, fin) => { fin({ cells: [], dir: {} }, { depth: 3, time: 1100, nodes: 42000 }); return true; };
  try {
    ctx.aiMove();
    const l = JSON.parse(ctx.localStorage.getItem(ctx.STATS_REFLEXION_KEY) || '[]');
    assert.strictEqual(l.length, 1); assert.deepStrictEqual([l[0].n, l[0].b, l[0].p], [4, 1200, 3]);
  } finally { Object.assign(ctx, { aiColor: sauve.a, requestAIMovePooled: sauve.r, showAIThinking: sauve.s, executeAIMove: sauve.e, updateAIMetrics: sauve.u }); }
});

test('reflexion (mesure) : la partie a la priorite -- l IA attend la fin de la recherche de mesure, puis joue', async () => {
  ctx.currentLayout = 'standard'; ctx.board = {};
  ['4,0','4,1','4,2','3,0','3,1','3,2'].forEach(k => ctx.board[k] = 'black');
  ['4,6','4,7','4,8','5,5','5,6','5,7'].forEach(k => ctx.board[k] = 'white');
  ctx.CapturedByBlack.set(8); ctx.CapturedByWhite.set(8); ctx.GameOver.set(false); ctx.GameMode.set('ai'); ctx.MoveCount.set(40);
  ctx.replayMode = false; ctx._tourneyMatch = null; ctx.aiDifficulty = '4';
  const sauve = { a: ctx.aiColor, r: ctx.requestAIMovePooled, s: ctx.showAIThinking, t: ctx.showToast };
  let lancees = 0, liberer; ctx.aiColor = () => 'white'; ctx.showAIThinking = () => {}; ctx.showToast = () => {};
  ctx.requestAIMovePooled = () => { lancees++; return true; };
  ctx._mesureRechercheActive = new Promise(r => { liberer = r; }); ctx._mesureEnCours = {};
  try {
    ctx.aiMove();
    assert.strictEqual(lancees, 0, 'pas de calcul de partie pendant la recherche de mesure');
    assert.strictEqual(ctx._mesureEnCours, null, 'la mesure s arrete');
    ctx._mesureRechercheActive = null; liberer(); await new Promise(r => setTimeout(r, 0));
    assert.strictEqual(lancees, 1, 'puis l IA calcule son coup');
  } finally { Object.assign(ctx, { aiColor: sauve.a, requestAIMovePooled: sauve.r, showAIThinking: sauve.s, showToast: sauve.t }); }
});

/* ─── 39. Position (code KAAH) et evaluation de l'IA, coup par coup ─── */
test('code de position : identique, au caractere pres, aux codes affiches par KAAH', () => {
  ['drawBoard','updateStatus','showToast','rebuildMoveListLabels','loadSnapshot','closeMigsBrowser','resetGutterPositions','showPage'].forEach(n => { ctx[n] = () => {}; });
  const b = {}; ctx.LAYOUTS.belgian.black.forEach(p => b[p[0] + ',' + p[1]] = 'black'); ctx.LAYOUTS.belgian.white.forEach(p => b[p[0] + ',' + p[1]] = 'white');
  assert.strictEqual(ctx.codePosition(b, 0, 0), '0a12b123c23g78h789i89_0a45b456c56g45h456i56', 'depart Marguerite belge (fichier temoin de KAAH)');
  let i = ctx.PARTIES_REFERENCE.findIndex(g => /KAAH/.test(g[5]) && g[0] === '2026-09-28'); ctx.loadRefGame(i);
  let s = ctx.boardSnapshots[40];
  assert.strictEqual(ctx.codePosition(s.board, s.capturedByWhite, s.capturedByBlack), '0c256d357e34f4g56h78i7_1c34d46e56f567h56i56', 'tour 21 du 28/09');
  i = ctx.PARTIES_REFERENCE.findIndex(g => /KAAH/.test(g[5]) && g[0] === '2026-10-02'); ctx.loadRefGame(i);
  s = ctx.boardSnapshots[215];
  assert.strictEqual(ctx.codePosition(s.board, s.capturedByWhite, s.capturedByBlack), '6b5d2e3458f56_5b34c67d34567', 'fin de partie du 02/10');
});

test('evaluation : format proche de KAAH (phase, score, profondeur, temps), gain force lisible', () => {
  assert.strictEqual(ctx._formatEvalIA({ e: 1090, p: 8, t: 19000, ph: 'milieu' }), 'Mil. +1090 · prof. 8 · 19,0 s');
  assert.strictEqual(ctx._formatEvalIA({ e: -70, p: 7, t: 850, ph: 'finale' }), 'Fin -70 · prof. 7 · 850 ms');
  assert.strictEqual(ctx._formatEvalIA({ e: 99996, p: 4, t: 120, ph: 'finale' }), 'Fin gain forcé · prof. 4 · 120 ms');
});

test('evaluation : rattachee au coup de l IA, jamais a un autre coup', () => {
  const origine = ctx.document.getElementById; ctx.document.getElementById = () => null;   // pas de liste a l'ecran
  try {
    ctx.initBoardState(); ctx.boardSnapshots = []; ctx.MoveCount.set(30); ctx.GameMode.set('ai');
    ctx._noterMesuresCoupIA({ bestScore: 1090.4, depth: 8, time: 19000 }, 'white');
    ctx.addMoveToHistory('a1b1', 'white', { cells: [{ r: 8, c: 0 }], dir: { q: 1, r: 0 }, type: 'move' });
    assert.strictEqual(JSON.stringify(ctx.boardSnapshots[0].ia), JSON.stringify({ e: 1090, p: 8, t: 19000, ph: 'milieu' }));
    ctx._noterMesuresCoupIA({ bestScore: 50, depth: 6, time: 900 }, 'white');
    ctx.addMoveToHistory('i5h5', 'black', { cells: [{ r: 0, c: 0 }], dir: { q: 0, r: 1 }, type: 'move' });   // coup humain : abandonnee
    assert.strictEqual(ctx.boardSnapshots[1].ia, undefined);
    ctx.addMoveToHistory('a2b2', 'white', { cells: [{ r: 8, c: 1 }], dir: { q: 1, r: 0 }, type: 'move' });
    assert.strictEqual(ctx.boardSnapshots[2].ia, undefined, 'plus rien en attente');
  } finally { ctx.document.getElementById = origine; }
});

test('evaluation : affichee sous le coup de l IA dans la liste des coups', () => {
  const lignes = []; const liste = { querySelector: () => null, appendChild: r => lignes.push(r) };
  const sauve = ctx.document.createElement; ctx.document.createElement = () => ({ dataset: {}, style: {}, classList: { remove(){} } });
  try {
    ctx.boardSnapshots = [{ ia: { e: 1090, p: 8, t: 19000, ph: 'milieu' } }, {}];
    ctx.appendMoveRow(liste, null, 'd2b2', 'white', 1);
    ctx.appendMoveRow(liste, null, 'a2a3', 'black', 2);
    assert.match(lignes[0].innerHTML, /class="move-eval"[^>]*>Mil\. \+1090 · prof\. 8 · 19,0 s</);
    assert.doesNotMatch(lignes[1].innerHTML, /move-eval/);
  } finally { ctx.document.createElement = sauve; }
});

test('historique : les evaluations sont gardees avec la partie et retrouvees en la revoyant', () => {
  ['drawBoard','updateStatus','showToast','rebuildMoveListLabels','loadSnapshot','closeMigsBrowser','resetGutterPositions','showPage'].forEach(n => { ctx[n] = () => {}; });
  const i = ctx.PARTIES_REFERENCE.findIndex(g => /KAAH/.test(g[5]) && g[0] === '2026-10-01'); ctx.loadRefGame(i);
  ctx.replayMode = false; ctx.GameMode.set('ai');
  ctx.boardSnapshots[1].ia = { e: 35, p: 7, t: 30000, ph: 'ouverture' };
  ctx.boardSnapshots[83].ia = { e: -99996, p: 2, t: 10, ph: 'finale' };
  ctx.localStorage.removeItem(ctx.GAME_HISTORY_KEY);
  ctx._recordGameHistory('white', null);
  const e = ctx.getGameHistory()[0];
  assert.strictEqual(JSON.stringify([e.evals[0], e.evals[1], e.evals[83]]), JSON.stringify([0, [35, 7, 30000, 'o'], [-99996, 2, 10, 'f']]));
  ctx.boardSnapshots = [];
  const _gid = ctx.document.getElementById; ctx.document.getElementById = id => (id === 'move-list' ? null : _gid(id));   // pas de liste a l'ecran
  try { assert.ok(ctx._replayHistoryGame(e.code)); } finally { ctx.document.getElementById = _gid; }
  assert.strictEqual(JSON.stringify(ctx.boardSnapshots[1].ia), JSON.stringify({ e: 35, p: 7, t: 30000, ph: 'ouverture' }));
  assert.strictEqual(ctx._formatEvalIA(ctx.boardSnapshots[83].ia), 'Fin perte forcée · prof. 2 · 10 ms');
  assert.strictEqual(ctx.boardSnapshots[2].ia, undefined);
});

/* ─── 40. Permutations d'une position (numerotation de KAAH) ─── */
test('permutations : identiques, numero par numero, a celles affichees par KAAH', () => {
  const KAAH = {
    0: '2b23c23d7e468f56g56_3a2b46c4d345e35f8g7', 1: '2b45c56d4e34f456g8h8_3b6c34d567e56f9g5h7', 2: '2c3d3457e478f58h56_3c5d6e356f679g48i8',
    3: '2c45d45e246f3g78h78_3c3d2e57f567g6h46i8', 4: '2b2c2d456e67f6g45h56_3b3c5d1e45f345g67h4', 5: '2b45d25e236f3567g7_3a2c26d134e457f4g5',
    10: '2b23c23d5e67f567g4h5_3b1c45d234e45f2g7h6', 11: '2b45c56d2e246f56g67_3a4b13c4d456e57f3g5', 12: '2b23d47e478f4568g5_3a4c26d568e356f7g7',
    13: '2b5c6d345e34f5g78h78_3b4c3d8e56f678g56h9', 14: '2c34d45e468f8g45h56_3c5d7e35f456g6h79i6',
    100: '3a2b46c4d345e35f8g7_2b23c23d7e468f56g56', 101: '3b6c34d567e56f9g5h7_2b45c56d4e34f456g8h8', 110: '3b1c45d234e45f2g7h6_2b23c23d5e67f567g4h5' };
  // relit le code 0 en plateau
  const n2rc = {}; for (let r = 0; r < 9; r++) for (let c = 0; c < ctx.ROWS[r]; c++) n2rc[String(ctx.coordToABAPRO(r, c))] = r + ',' + c;
  const b = {}; KAAH[0].split('_').forEach((m, i) => { let rg = null; for (const ch of m.replace(/^\d+/, '')) { if (/[a-i]/.test(ch)) rg = ch; else b[n2rc[rg + ch]] = i ? 'white' : 'black'; } });
  const P = ctx.permutationsPosition(b, 2, 3);
  const tous = {}; P.permut.concat(P.camp).forEach(x => { tous[x.num] = x.code; });
  for (const [n, code] of Object.entries(KAAH)) assert.strictEqual(tous[n], code, 'permutation ' + n);
  assert.strictEqual(P.canonique, KAAH[10], 'forme canonique = celle que KAAH surligne');
  assert.strictEqual(P.permut.length, 12); assert.strictEqual(P.camp.length, 12);
});

test('permutations : la fenetre affiche les deux colonnes et copie tout', () => {
  ctx.initBoardState(); ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0);
  const ajoutes = []; const sB = ctx.document.body, sC = ctx.document.createElement, sG = ctx.document.getElementById;
  ctx.document.getElementById = () => null;
  ctx.document.createElement = () => ({ style: {}, dataset: {}, remove(){} });
  ctx.document.body = { appendChild: el => ajoutes.push(el) };
  try {
    const P = ctx.ouvrirPermutations();
    assert.strictEqual(ajoutes.length, 1);
    assert.match(ajoutes[0].innerHTML, /Permut<\/div>[\s\S]*Camp_Permut/);
    assert.match(ajoutes[0].dataset.tout, /^Position : /);
    assert.strictEqual(ajoutes[0].dataset.tout.split('\n').length, 25, 'position + 24 codes');
    assert.ok(ajoutes[0].innerHTML.includes(P.canonique + ' ★'));
  } finally { ctx.document.body = sB; ctx.document.createElement = sC; ctx.document.getElementById = sG; }
});

/* ─── 41. Quatrieme partie KAAH (05/10/2026) ─── */
test('KAAH 05/10/2026 : se rejoue en entier (66 demi-coups), Blancs 6 a 3, codes de depart et de fin = ceux de KAAH', () => {
  ['drawBoard','updateStatus','showToast','rebuildMoveListLabels','loadSnapshot','closeMigsBrowser','resetGutterPositions','showPage'].forEach(n => { ctx[n] = () => {}; });
  const i = ctx.PARTIES_REFERENCE.findIndex(g => /KAAH/.test(g[5]) && g[0] === '2026-10-05');
  assert.ok(i >= 0);
  ctx.loadRefGame(i);
  assert.strictEqual(ctx.boardSnapshots.length, 66);
  assert.strictEqual(ctx.CapturedByWhite.get(), 6); assert.strictEqual(ctx.CapturedByBlack.get(), 3);
  assert.strictEqual(ctx.codePosition(ctx._replayStartBoard, 0, 0), '0a12b123c23g78h789i89_0a45b456c56g45h456i56');
  const s = ctx.boardSnapshots[65];
  assert.strictEqual(ctx.codePosition(s.board, s.capturedByWhite, s.capturedByBlack), '6a4c5d345e45f6_3f578g58h5789i89');
});

/* ─── 42. Intro : embleme, puis titre, puis sous-titre ─── */
test('intro : l embleme disparait avant le titre, le titre avant le sous-titre, puis le fondu de sortie', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  const html = src.slice(src.indexOf('<div id="intro-splash"'), src.indexOf('<button id="intro-skip"'));
  assert.ok(html.indexOf('class="intro-emblem"') < html.indexOf('class="intro-title"'), 'embleme avant le titre');
  assert.match(html, /<polygon points="188,100 144,176\.2 56,176\.2 12,100 56,23\.8 144,23\.8"/, 'hexagone a faces planes en haut et en bas');
  const sec = re => { const m = src.match(re); assert.ok(m, String(re)); return parseFloat(m[1]); };
  const dureeEmbleme = sec(/\.ie-hex\s*\{ animation: ieHex ([\d.]+)s /), finEmbleme = sec(/\.ie-hex\s*\{ animation: ieHex [\d.]+s [^)]*\) ([\d.]+)s/) + dureeEmbleme;
  assert.ok(dureeEmbleme >= 2.5, 'disparition allongee a la demande d Olivier');
  const titre = sec(/\.intro-title \{[^}]*introTitleIn \.9s ease-out ([\d.]+)s/);
  const sousTitre = sec(/animation: introTaglineIn \.8s ease-out ([\d.]+)s forwards;/);
  const sortie = sec(/animation: introFadeOut \.6s ease-in ([\d.]+)s forwards;/);
  const total = sec(/\}, reduced \? 1300 : (\d+)\);/) / 1000;
  assert.ok(finEmbleme < titre && titre + 0.9 < sousTitre && sousTitre + 0.8 < sortie && sortie + 0.6 <= total,
    [finEmbleme, titre, sousTitre, sortie, total].join(' < '));
  assert.match(src, /@keyframes ieHex\s*\{ from \{ transform: rotate\(0deg\) scale\(1\)[^}]*\} to \{ transform: rotate\(360deg\) scale\(0\); opacity: 0; \} \}/, 'l hexagone tourne et disparait');
  assert.match(src, /\.intro-emblem \{ display: none; \}/, 'mouvement reduit : pas d animation de l embleme');
});

/* ─── 43. Tableau « Reflexion IA » (comme KAAH) et Academie ─── */
function vm_eval(w, code) { require('vm').runInContext(code, w); }
// le VRAI code du fil de calcul, execute a part comme dans le navigateur
function _filDeCalcul(avecContexte) {
  const vm = require('vm'); let recu = null;
  const w = { console, Date, Math, JSON, Map, Set, Object, Array, Number, String, Infinity, isFinite, parseInt, Uint8Array, Int8Array, Float32Array, Int32Array, Uint32Array, DataView, ArrayBuffer,
              navigator: { deviceMemory: 4 }, atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64') };
  w.self = w; vm.createContext(w); vm.runInContext(ctx.AI_WORKER_CODE, w);
  w.self.postMessage = m => { recu = m; };
  const f = params => { recu = null; w.self.onmessage({ data: params }); return recu; };
  return avecContexte ? { chercher: f, w } : f;
}
function _positionKaah05(ply) {
  ['drawBoard','updateStatus','showToast','rebuildMoveListLabels','loadSnapshot','closeMigsBrowser','resetGutterPositions','showPage'].forEach(n => { ctx[n] = () => {}; });
  ctx.loadRefGame(ctx.PARTIES_REFERENCE.findIndex(g => /KAAH/.test(g[5]) && g[0] === '2026-10-05'));
  return ctx.boardSnapshots[ply - 1];
}
const _POIDS_DEFAUT = { center: 6, cohesion: 4, edge: 8, mob: 2, iso: 18, dng: 14, chain: 10, fortress: 20 };

test('reflexion IA (moteur) : chiffres coherents -- positions additionnees, criteres = score, suites legales', () => {
  const s = _positionKaah05(40), fil = _filDeCalcul(true), chercher = fil.chercher, w = fil.w;
  const r = chercher({ board: s.board, capturedByWhite: s.capturedByWhite, capturedByBlack: s.capturedByBlack, color: 'black', depth: 2, time: 60000, weights: _POIDS_DEFAUT, hist: [] });
  const m = r.metrics, somme = o => Object.values(o).reduce((a, b) => a + b, 0);
  // les criteres affiches = EXACTEMENT l'evaluation du moteur, sur des positions reelles
  [10, 40, 66].forEach(ply => { const p = _positionKaah05(ply); w.board = JSON.parse(JSON.stringify(p.board));
    w.capturedByWhite = p.capturedByWhite; w.capturedByBlack = p.capturedByBlack;
    vm_eval(w, 'board=' + JSON.stringify(p.board) + ';capturedByWhite=' + p.capturedByWhite + ';capturedByBlack=' + p.capturedByBlack + ';');
    ['black', 'white'].forEach(col => assert.strictEqual(somme(w.evalDetail(col)), w.evaluateBoard(col), 'demi-coup ' + ply + ', ' + col)); });
  assert.strictEqual(m.depth, 2);
  assert.deepStrictEqual(Object.keys(m.depthInfo).sort(), ['1', '2']);
  for (const d of [1, 2]) {
    const racines = m.rootsByDepth[d];
    assert.strictEqual(racines.reduce((a, x) => a + x.k, 0), m.depthInfo[d].nodes, 'prof. ' + d + ' : positions additionnees');
    const top = racines.slice().sort((a, b) => b.score - a.score).slice(0, 10);
    top.forEach(x => {
      assert.ok(x.terms && Array.isArray(x.pv), 'suite et criteres pour les 10 meilleurs');
      assert.strictEqual(x.pv.length, d - 1, 'suite complete');
    });
  }
  assert.ok(m.posTerms && somme(m.posTerms) !== 0);
  assert.strictEqual(JSON.stringify(m.poids), JSON.stringify(_POIDS_DEFAUT));
});

test('reflexion IA (page) : fusion de plusieurs fils de calcul, profondeurs communes, la plus profonde en tete', () => {
  ctx.initBoardState(); ctx.aiDifficulty = '6';
  const fil = (scores, extra) => ({ rootsByDepth: { 1: scores.map((s, i) => ({ cells: [{ r: 0, c: i }], dir: { q: 1, r: 0 }, score: s, k: 10, ms: 1 })), 2: scores.map((s, i) => ({ cells: [{ r: 0, c: i }], dir: { q: 1, r: 0 }, score: s - 5, k: 100, ms: 2 })), ...(extra || {}) },
    depthInfo: { 1: { nodes: 10 * scores.length, ms: 3, fin: 3 }, 2: { nodes: 100 * scores.length, ms: 40, fin: 45 }, 3: { nodes: 1, ms: 1, fin: 99 } }, posTerms: { mat: 0 }, poids: _POIDS_DEFAUT });
  const a = fil([50, 20, 10, 5, 1, 0]), b = fil([60, 30, -4, -9, -20, -30], { 3: [{ cells: [], dir: {}, score: 1, k: 1, ms: 1 }] });
  const det = ctx._detailReflexion({ parFil: [a, b] }, 'black', { time: 60000 });
  assert.strictEqual(JSON.stringify(det.prof.map(p => p.d)), '[2,1]', 'prof. 3 non terminee par tous les fils : ecartee');
  const p2 = det.prof[0];
  assert.strictEqual(p2.total, 12); assert.strictEqual(p2.lignes.length, 10); assert.strictEqual(p2.noeuds, 1200); assert.strictEqual(p2.fin, 45);
  assert.strictEqual(JSON.stringify(p2.lignes.slice(0, 3).map(l => l.s)), '[55,45,25]', 'classes ensemble, tous fils confondus');
  assert.strictEqual(det.budget, 60000); assert.strictEqual(det.niveau, 6);
});

test('reflexion IA (fenetre) : notations, suite prevue, criteres, petit plateau -- et partie intacte', () => {
  const s = _positionKaah05(40), chercher = _filDeCalcul();
  const r = chercher({ board: s.board, capturedByWhite: s.capturedByWhite, capturedByBlack: s.capturedByBlack, color: 'black', depth: 2, time: 60000, weights: _POIDS_DEFAUT, hist: [] });
  ctx.board = JSON.parse(JSON.stringify(s.board)); ctx.CapturedByBlack.set(s.capturedByBlack); ctx.CapturedByWhite.set(s.capturedByWhite);
  const det = ctx._detailReflexion(r.metrics, 'black', { time: 30000 });
  const avant = JSON.stringify(ctx.board);
  ctx.boardSnapshots = [{ ia: { e: 1, p: 2, t: 3, ph: 'milieu', detail: det } }];
  const ajoutes = [], els = {}; const sB = ctx.document.body, sC = ctx.document.createElement, sG = ctx.document.getElementById;
  ctx.document.createElement = () => ({ style: {}, dataset: {}, remove(){} });
  ctx.document.body = { appendChild: el => { ajoutes.push(el); } };
  ctx.document.getElementById = id => id === 'reflexion-ia-plateau' ? (els[id] = els[id] || { innerHTML: '' }) : null;
  try {
    ctx.ouvrirReflexionIA(0);
    assert.strictEqual(JSON.stringify(ctx.board), avant, 'la position de la partie n est pas touchee');
    const h = ajoutes[0].innerHTML;
    assert.match(h, /Réflexion de l\u2019IA/); assert.match(h, /Prof\. 2 : 10 premiers coups sur \d+/); assert.match(h, /Prof\. 1 :/);
    assert.ok(h.indexOf('Prof. 2') < h.indexOf('Prof. 1'), 'la plus profonde en tete');
    assert.match(h, /Centre<br>\(6\)/); assert.match(h, /Temps<br>\(30,0 s\)/); assert.match(h, /Sous lui/);
    assert.match(h, /prises au-delà de la suite/);
    det.prof.forEach(p => p.lignes.forEach(l => { assert.notStrictEqual(l.n, '?'); assert.strictEqual(l.suite.length, p.d - 1, 'suite rejouee en entier : legale'); }));
    ctx._plateauReflexion(0, 0, 0);
    assert.match(els['reflexion-ia-plateau'].innerHTML, /<svg[\s\S]*>1<\/text>[\s\S]*>2<\/text>/, 'le coup de l IA (1) et la reponse (2) sur le plateau');
  } finally { ctx.document.body = sB; ctx.document.createElement = sC; ctx.document.getElementById = sG; }
});

test('academie : plus aucun code JavaScript affiche dans la page (10 Commandements)', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  const scripts = [...src.matchAll(/<script\b[^>]*>[\s\S]*?<\/script>/g)].map(m => [m.index, m.index + m[0].length]);
  const commentaires = [...src.matchAll(/<!--[\s\S]*?-->/g)].map(m => [m.index, m.index + m[0].length]);
  const dedans = (i, z) => z.some(([a, b]) => a <= i && i < b);
  const egares = [...src.matchAll(/\$\{/g)].map(m => m.index).filter(i => !dedans(i, scripts) && !dedans(i, commentaires));
  assert.strictEqual(egares.length, 0);
  ['Vise le centre', 'Joue et rejoue'].forEach(t => assert.match(src, new RegExp('min-width:32px">[IVX]+</div><div style="font-size:14px;color:var\\(--text\\);line-height:1.6">' + t + '<')));
});

/* ─── 44. Criteres de KAAH dans le moteur, colonnes, panneau, test au Labo ─── */
function _filKaah() {
  const vm = require('vm');
  const w = { console, Date, Math, JSON, Map, Set, Object, Array, Number, String, Infinity, isFinite, parseInt, Uint8Array, Int8Array, Float32Array, Int32Array, Uint32Array, DataView, ArrayBuffer,
              navigator: { deviceMemory: 4 }, atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64') };
  w.self = w; vm.createContext(w); vm.runInContext(ctx.AI_WORKER_CODE, w);
  const n2k = {}; for (let r = 0; r < 9; r++) for (let c = 0; c < ctx.ROWS[r]; c++) n2k[String(ctx.coordToABAPRO(r, c))] = r + ',' + c;
  const ev = code => vm.runInContext(code, w);
  const poser = (noirs, blancs, cb, cw) => { const b = {}; noirs.forEach(n => b[n2k[n]] = 'black'); blancs.forEach(n => b[n2k[n]] = 'white');
    ev('board=' + JSON.stringify(b) + ';capturedByBlack=' + (cb || 0) + ';capturedByWhite=' + (cw || 0) + ';'); };
  return { w, ev, poser };
}
const _BASE = '{center:6,cohesion:4,edge:8,mob:2,iso:18,dng:14,chain:10,fortress:20}';

test('criteres KAAH : avec les poids habituels, l evaluation est EXACTEMENT celle de l ancien moteur', () => {
  // valeurs calculees par le moteur AVANT l'ajout des criteres, sur la partie KAAH du 05/10
  const ref = { 10: [140, -140], 40: [1890, -1890], 66: [-6064, 6064] };
  const F = _filKaah();
  for (const ply of [10, 40, 66]) { const s = _positionKaah05(ply);
    F.ev('board=' + JSON.stringify(s.board) + ';capturedByWhite=' + s.capturedByWhite + ';capturedByBlack=' + s.capturedByBlack + ';EVAL_W=' + _BASE + ';');
    assert.strictEqual(F.w.evaluateBoard('black'), ref[ply][0], 'demi-coup ' + ply);
    assert.strictEqual(F.w.evaluateBoard('white'), ref[ply][1], 'demi-coup ' + ply);
    assert.strictEqual(F.ev('_kaahActif()'), false, 'criteres eteints : rien n est calcule'); }
});

test('criteres KAAH : sumito, menace, fourchette, piege (exemple de Saab), compacite -- selon leurs definitions', () => {
  const F = _filKaah(), S = c => JSON.parse(JSON.stringify(F.ev('_sumitosKaah("' + c + '")')));
  F.poser(['c5'], ['c3', 'c4']);              assert.deepStrictEqual(S('white'), { n: 1, ej: 0 }, 'poussee 2 contre 1');
  F.poser(['a5'], ['a3', 'a4']);              assert.deepStrictEqual(S('white'), { n: 1, ej: 1 }, 'poussee qui ejecte');
  F.poser(['c5', 'e5'], ['c3', 'c4', 'e3', 'e4']); assert.deepStrictEqual(S('white'), { n: 2, ej: 0 }, 'deux poussees : fourchette');
  F.poser(['c5', 'c6'], ['c3', 'c4']);        assert.deepStrictEqual(S('white'), { n: 0, ej: 0 }, '2 contre 2 interdit');
  F.poser(['c5'], ['c3', 'c4', 'c6']);        assert.deepStrictEqual(S('white'), { n: 0, ej: 0 }, 'cible calee par une bille derriere');
  F.poser(['a3'], ['b3', 'b4', 'c4']);        assert.strictEqual(F.ev('_bloqueesKaah("black")'), 1, 'a3_b34c4 : a3 ne peut plus bouger (Saab)');
  assert.strictEqual(F.ev('_bloqueesKaah("white")'), 0);
  F.poser(['a3'], []);                         assert.strictEqual(F.ev('_bloqueesKaah("black")'), 0, 'a3 seule : libre');
  F.poser(['e5', 'e6', 'd5'], ['a1', 'i9', 'e1']);
  assert.strictEqual(F.ev('_compacKaah("black")'), 1); assert.ok(F.ev('_compacKaah("white")') > 6);
});

test('criteres KAAH : avec leurs poids, le detail additionne = l evaluation du moteur ; sc. Gain selon le score', () => {
  const F = _filKaah();
  F.ev('EVAL_W=' + _BASE.replace('}', ',scGain:200,scPerte:200,cases:1,compac:20,sumito:20,menace:120,fourch:60,piege:40}') + ';');
  F.poser(['a3', 'c5', 'e5', 'd5'], ['b3', 'b4', 'c4', 'c3', 'e3', 'e4'], 1, 3);
  const d = F.ev('evalDetail("white")'), somme = Object.values(d).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(somme - F.w.evaluateBoard('white')) < 1e-9);
  assert.strictEqual(d.scGain, 600, '3 ejections : 200 x (0+1+2)'); assert.strictEqual(d.piege, 40); assert.strictEqual(d.menace, 120);
  assert.strictEqual(d.gain, 6000); assert.strictEqual(d.perte, -2000);
  // duel du Labo : le camp sans ces cles ne les herite jamais de l'autre
  F.ev('EVAL_W=' + _BASE + ';'); assert.strictEqual(F.ev('_kaahActif()'), false);
});

test('tableau : seules les colonnes des criteres utilises, dans l ordre de KAAH', () => {
  const noms = p => ctx._criteresUtilises(p).map(k => k[1]).join(',');
  assert.strictEqual(noms(ctx.AI_WEIGHT_PRESETS ? ctx.AI_WEIGHT_PRESETS.balanced : JSON.parse('{"center":6,"cohesion":4,"edge":8,"mob":2,"iso":18,"dng":14,"chain":10,"fortress":20}')),
    'Gain,Perte,Centre,Cohés.,Bord m.,Bord a.,Mobilité,Isolées,En danger,Chaînes,Forteresses');
  assert.strictEqual(noms({ center: 6, cohesion: 4, edge: 8, mob: 2, iso: 18, dng: 14, chain: 10, fortress: 20, scGain: 200, scPerte: 200, cases: 1, compac: 20, sumito: 20, menace: 120, fourch: 60, piege: 40 }),
    'Gain,sc. Gain,Perte,sc. Perte,Centre,Cases,Cohés.,Compac.,Bord m.,Bord a.,Sumito,Menace,Fourch.,Piège,Mobilité,Isolées,En danger,Chaînes,Forteresses');
});

test('panneau de la partie : le tableau du dernier coup de l IA, ouvert ou ferme', () => {
  const els = {}; const sG = ctx.document.getElementById;
  ctx.document.getElementById = id => (els[id] = els[id] || { innerHTML: '', textContent: '', style: {} });
  try {
    ctx.boardSnapshots = [{}, { ia: { e: 1, p: 1, t: 1, ph: 'milieu', detail: { racine: { board: {}, cB: 0, cW: 0 }, couleur: 'black', date: Date.now(), poids: { center: 6, edge: 8 }, pos: { gain: 0, centre: 0 }, prof: [], _notes: true } } }];
    ctx.localStorage.setItem('abaReflexionPanneau', '0'); ctx._majPanneauReflexion();
    assert.strictEqual(els['reflexion-panneau-corps'].style.display, 'none'); assert.match(els['reflexion-panneau-btn'].textContent, /^▸/);
    ctx.basculerPanneauReflexion();
    assert.strictEqual(els['reflexion-panneau-corps'].style.display, 'block'); assert.match(els['reflexion-panneau-corps'].innerHTML, /Coup 2 de l\u2019IA/);
  } finally { ctx.document.getElementById = sG; ctx.localStorage.setItem('abaReflexionPanneau', '0'); }
});

test('test au Labo : paires sur la meme ouverture (KAAH joue Noirs puis Blancs), plusieurs a la fois, resultats au bon camp, verdict par paires', () => _laboBac(({ fils, envois, vider, repondre }) => {
  ctx.LAB_CFG.threads = 2;
  ctx.lancerTestKaah();
  assert.strictEqual(fils.length, 2, 'deux fils de calcul');
  assert.strictEqual(envois.length, 2, 'deux parties lancees en meme temps');
  const [m0, m1] = envois.map(e => e.m);
  assert.strictEqual(m0.seed, m1.seed, 'meme ouverture pour la paire');
  assert.deepStrictEqual([m0.colorA, m1.colorA], ['black', 'white'], 'la version avec KAAH joue Noirs puis Blancs');
  assert.ok(m0.wA.sumito === 20 && m1.wA.sumito === 20, 'la version avec KAAH est toujours A');
  assert.strictEqual(m0.wB.sumito, 0, 'l IA actuelle seule : critere de KAAH a 0');
  // la version avec KAAH gagne tout : verdict apres 8 paires au moins
  let s, garde = 0;
  do { repondre(envois.find(e => !e.fini), 'A'); vider(); s = JSON.parse(ctx.localStorage.getItem('abaTestKaah')); } while (!s.fini && ++garde < 400);
  assert.strictEqual(s.fini, 'plus fort');
  assert.ok(ctx._labPentaN(s.penta) >= 8, 'verdict apres 8 paires au moins (' + ctx._labPentaN(s.penta) + ')');
  assert.strictEqual(s.W, s.n, 'victoires attribuees a la version avec KAAH');
  assert.strictEqual(ctx._testKaahEnCours, false); assert.strictEqual(ctx._labFils.length, 0, 'fils arretes a la fin');
}));

/* ─── 45. Cinquieme partie KAAH (08/10/2026) ─── */
test('KAAH 08/10/2026 : se rejoue en entier (172 demi-coups), Blancs 6 a 2, codes apres le 1er coup et en fin = ceux de KAAH', () => {
  ['drawBoard','updateStatus','showToast','rebuildMoveListLabels','loadSnapshot','closeMigsBrowser','resetGutterPositions','showPage'].forEach(n => { ctx[n] = () => {}; });
  const i = ctx.PARTIES_REFERENCE.findIndex(g => /KAAH/.test(g[5]) && g[0] === '2026-10-08');
  assert.ok(i >= 0);
  ctx.loadRefGame(i);
  assert.strictEqual(ctx.boardSnapshots.length, 172);
  assert.strictEqual(ctx.CapturedByWhite.get(), 6); assert.strictEqual(ctx.CapturedByBlack.get(), 2);
  const code = s => ctx.codePosition(s.board, s.capturedByWhite, s.capturedByBlack);
  assert.strictEqual(code(ctx.boardSnapshots[0]), '0a2b123c23d4g78h789i89_0a45b456c56g45h456i56');
  assert.strictEqual(code(ctx.boardSnapshots[171]), '6a5b3c67d678h7_2a1b24c125d345e467');
});

/* ─── 46. Page Aide : comment utiliser le site ─── */
test('aide : chaque libelle cite existe vraiment ailleurs dans le site (aucun bouton invente)', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  const i = src.indexOf('<div class="page" id="page-aide">'), j = src.indexOf('<div class="page" id="page-mentions">');
  assert.ok(i > 0 && j > i);
  const hors = src.slice(0, i) + src.slice(j), aide = src.slice(i, j);
  const cites = ['Configurer avant de jouer', 'Disposition de départ', 'Qui commence ?', 'Réflexion max (s)', 'Personnaliser…', 'Commencer la partie',
    '↩️ Annuler le dernier coup', '💡 Suggérer un coup', '🧠 Pourquoi ce coup ?', '🤝 Proposer nulle', 'Abandonner', '🔄 Inverser', 'Permutations',
    '▸ Réflexion de l’IA', '🔍 Analyser la partie', '⚠️ Revoir mes erreurs', '▶ Rejouer la partie', '⟨ Précédent', 'Suivant ⟩', '📤 Partager',
    '📋 Exporter la partie', '📤 Exporter tout', 'Créer une partie', 'Rejoindre', 'Partie par code', '📦 Exporter mes données (JSON)',
    '📥 Importer mes données (JSON)', 'Mode Enfant', 'Règles du jeu', 'Sur un vrai plateau', 'Abalone Academy', 'Problèmes', 'Ouvertures', 'Mes statistiques', 'Gym Cerveau',
    'Formation Formateurs', 'Bibliothèque de parties', 'Stats du corpus', 'Tables de finale', 'Labo IA', 'Détection photo / plateau', 'Observer',
    'Tournoi', 'Variantes', 'Éditeur', 'Historique', 'Paramètres', 'Belgian Daisy', 'Découverte', 'Même appareil', 'En direct'];
  const absents = cites.filter(s => aide.indexOf(s) < 0 && aide.indexOf(s.replace(/^\S+ /, '')) < 0);
  assert.deepStrictEqual(absents, [], 'libelles annonces mais absents de l aide (liste du test a revoir)');
  const inventes = cites.filter(s => hors.indexOf(s) < 0);
  assert.deepStrictEqual(inventes, [], 'libelles cites par l aide mais introuvables dans le site');
  // 11 rubriques en francais, et les memes 11 en anglais (v2.56)
  const fr = aide.slice(aide.indexOf('id="aide-rubriques"'), aide.indexOf('id="aide-rubriques-en"')), en = aide.slice(aide.indexOf('id="aide-rubriques-en"'));
  assert.strictEqual((fr.match(/<details class="aide-rub"/g) || []).length, 11);
  assert.strictEqual((en.match(/<details class="aide-rub"/g) || []).length, 11);
});

test('aide : accessible par le menu et par le menu Aide du haut', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  assert.match(src, /id="sid-aide" onclick="sidebarNav\('aide',this\)"/);
  assert.match(src, /onclick="toggleHelpMenu\(\); showPage\('aide'\)"><span>📖<\/span> Comment utiliser le site/);
});

test('aide : recherche sans accents, ouvre les rubriques trouvees, signale l absence de resultat', () => {
  const rubs = [{ textContent: 'Pendant la partie : 🤝 Proposer nulle', style: {}, open: false },
                { textContent: 'Installer l application, jouer hors ligne', style: {}, open: false },
                { textContent: 'La réflexion de l IA', style: {}, open: false }];
  const vide = { style: {} }; const sQ = ctx.document.querySelectorAll, sG = ctx.document.getElementById;
  ctx.document.querySelectorAll = () => rubs; ctx.document.getElementById = id => id === 'aide-vide' ? vide : null;
  try {
    assert.strictEqual(ctx.filtrerAide('HORS LIGNE'), 1);
    assert.deepStrictEqual(rubs.map(r => r.style.display), ['none', '', 'none']); assert.ok(rubs[1].open);
    assert.strictEqual(ctx.filtrerAide('reflexion'), 1, 'sans accent, trouve « réflexion »');
    assert.strictEqual(ctx.filtrerAide('zzzz'), 0); assert.strictEqual(vide.style.display, 'block');
    assert.strictEqual(ctx.filtrerAide(''), 3); assert.strictEqual(vide.style.display, 'none');
  } finally { ctx.document.querySelectorAll = sQ; ctx.document.getElementById = sG; }
});

/* ─── 47. Plus de fausse double authentification ─── */
test('securite : aucune double authentification simulee (interrupteurs, fenetre, code, YubiKey) ; explication honnete', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
  ['toggle2FAMethod', 'verify2FACode', 'launch2FA', 'simulateYubiKey', 'drawFakeQR', '_fakeOTP', 'id="modal-2fa"', 'success-2fa-method',
   'Simuler la détection', 'Email OTP', 'YubiKey FIDO2'].forEach(s => assert.strictEqual(src.indexOf(s), -1, 'encore present : ' + s));
  assert.match(src, /id="stab-twofa">Sécurité<\/button>/);
  assert.match(src, /Pas de double authentification, et pourquoi/);
  assert.match(src, /Profil enregistré dans ce navigateur/);
});

test('securite : le score ne compte que ce qui existe (100 points sur 3 lignes, plus rien pour une « double authentification »)', async () => {
  const els = {}; const sG = ctx.document.getElementById;
  ctx.document.getElementById = id => (els[id] = els[id] || { textContent: '', innerHTML: '', style: {} });
  const sU = ctx.currentUser, sT = ctx._testEncryptionWorks;
  try {
    ctx._testEncryptionWorks = async () => true;
    ctx.currentUser = { passwordHash: 'x', _token: null, twofa: ['email', 'yubikey'] };   // ancienne sauvegarde avec « 2FA »
    await ctx.computeSecurityScore();
    assert.doesNotMatch(els['sec-score-items'].innerHTML, /authentification|YubiKey/);
    assert.strictEqual((els['sec-score-items'].innerHTML.match(/<span>(✅|⬜)<\/span>/g) || []).length, 3);
    assert.match(els['sec-score-val'].textContent, /^67\/100/, 'mot de passe (34) + chiffrement (33) ; les anciens interrupteurs ne rapportent plus rien');
  } finally { ctx.document.getElementById = sG; ctx.currentUser = sU; ctx._testEncryptionWorks = sT; }
});


/* ─── 48. Duel Cerveau : exercices de vitesse contre un ami, en direct ─── */
function _duelBac(fn){
  const els = {}, sG = ctx.document.getElementById, sT = ctx.setTimeout, sP = ctx._duelPlanifier, sC = ctx._rtcChannel, sD = ctx._duel;
  ctx.document.getElementById = id => (els[id] = els[id] || sG.call(ctx.document, id) || { textContent: '', innerHTML: '', style: {} });
  const sPg = ctx.showPage, sTo = ctx.showToast; ctx.showPage = () => {}; ctx.showToast = () => {};
  ctx.setTimeout = () => 0;                                   // pas de vrais minuteurs pendant le test
  const file = [], envoyes = [];
  ctx._duelPlanifier = (f, ms) => { if (ms < ctx.DUEL_LIMITE_MS) file.push(f); return 0; };   // le minuteur de 30 s ne part pas
  ctx._rtcChannel = { readyState: 'open', send: s => envoyes.push(s), close: () => {} };
  ctx._duel = null; ctx.localStorage.removeItem('abaDuelsCerveau');
  const vider = () => { while (file.length) file.shift()(); };
  try { return fn({ els, envoyes, vider }); }
  finally { ctx.document.getElementById = sG; ctx.showPage = sPg; ctx.showToast = sTo; ctx.setTimeout = sT; ctx._duelPlanifier = sP; ctx._rtcChannel = sC; ctx._duel = sD; }
}

test('duel cerveau : la graine commune donne exactement le meme exercice aux deux joueurs', () => _duelBac(({ els }) => {
  const a = ctx._duelAlea(42), b = ctx._duelAlea(42);
  for (let i = 0; i < 5; i++) assert.strictEqual(a(), b());
  ctx.DUEL_EXERCICES.forEach(id => {
    ctx._duelLancerExercice(id, 123456); const p1 = els['gym-exercise-board'].innerHTML;
    ctx._duelLancerExercice(id, 123456); const p2 = els['gym-exercise-board'].innerHTML;
    assert.ok(p1.length > 100, id + ' : plateau dessine'); assert.strictEqual(p1, p2, id + ' : meme graine, meme position');
  });
  const r = Math.random; ctx._duelLancerExercice('acuity', 1); assert.strictEqual(Math.random, r, 'le vrai hasard est rendu');
}));

test('duel cerveau : defi, acceptation, 3 manches, score puis vitesse, bilan enregistre', () => _duelBac(({ els, envoyes, vider }) => {
  ctx._rtcHandleMessage('DUEL:defi:' + JSON.stringify({ graine: 99, ex: ['acuity', 'reflex', 'mat'], lvl: 3, nom: 'Laurent' }));
  assert.strictEqual(ctx._duel.etat, 'invite'); assert.match(els['duel-cerveau'].innerHTML, /Laurent te défie/);
  ctx.accepterDuelCerveau(true);
  assert.match(envoyes.pop(), /^DUEL:ok:/);
  vider();                                                   // decompte -> manche 1 lancee
  assert.strictEqual(ctx._duel.encours, 0); assert.strictEqual(ctx._gymLevel !== undefined, true);
  // manche 1 : 100 pour moi, 0 pour lui
  ctx.gymFinish('acuity', 100, 'trouvée');
  const res = JSON.parse(envoyes.pop().slice('DUEL:res:'.length)); assert.strictEqual(res.m, 0); assert.strictEqual(res.s, 100);
  ctx.gymFinish('acuity', 0, 'temps écoulé');                // l'ancien minuteur ne recompte pas la manche
  assert.strictEqual(ctx._duel.moi[0].s, 100);
  ctx._rtcHandleMessage('DUEL:res:' + JSON.stringify({ m: 0, s: 0, ms: 900 }));
  assert.match(els['duel-cerveau'].innerHTML, /Manche gagnée/);
  vider();
  // manche 2 : egalite de score, il est plus rapide
  ctx.gymFinish('reflex', 100, 'ok'); ctx._duel.moi[1].ms = 2500;
  ctx._rtcHandleMessage('DUEL:res:' + JSON.stringify({ m: 1, s: 100, ms: 1200 }));
  assert.match(els['duel-cerveau'].innerHTML, /Manche perdue/);
  vider();
  // manche 3 : son resultat arrive AVANT ma reponse
  ctx._rtcHandleMessage('DUEL:res:' + JSON.stringify({ m: 2, s: 0, ms: 30000 }));
  ctx.gymFinish('mat', 100, 'ok');
  vider();
  assert.strictEqual(ctx._duel.etat, 'fini');
  assert.match(els['duel-cerveau'].innerHTML, /Duel gagné/); assert.match(els['duel-cerveau'].innerHTML, /Revanche/);
  assert.strictEqual(JSON.parse(ctx.localStorage.getItem('abaDuelsCerveau')).g, 1);
}));

test('duel cerveau : celui qui defie tire 3 exercices distincts ; refus, occupation et deconnexion geres', () => _duelBac(({ els, envoyes }) => {
  assert.strictEqual(ctx.lancerDuelCerveau(), true);
  const d = JSON.parse(envoyes.pop().slice('DUEL:defi:'.length));
  assert.strictEqual(d.ex.length, 3); assert.strictEqual(new Set(d.ex).size, 3);
  d.ex.forEach(e => assert.ok(ctx.DUEL_EXERCICES.includes(e)));
  assert.strictEqual(ctx.lancerDuelCerveau(), false, 'pas deux duels a la fois');
  ctx._rtcHandleMessage('DUEL:defi:' + JSON.stringify(d));   // defi croise pendant l'attente
  assert.match(envoyes.pop(), /^DUEL:occupe:/);
  ctx._rtcHandleMessage('DUEL:refus:{}');
  assert.strictEqual(ctx._duel, null); assert.match(els['duel-cerveau'].innerHTML, /Défi refusé/);
  ctx.lancerDuelCerveau(); ctx._rtcHandleMessage('DUEL:ok:{"nom":"Saab"}');
  assert.strictEqual(ctx._duel.etat, 'jeu'); assert.strictEqual(ctx._duel.adv, 'Saab');
  ctx._duelSurDeconnexion();
  assert.strictEqual(ctx._duel, null); assert.match(els['duel-cerveau'].innerHTML, /Connexion perdue/);
  ctx._rtcChannel = null; assert.strictEqual(ctx.lancerDuelCerveau(), false, 'sans connexion, pas de duel');
  ctx._rtcHandleMessage('DUEL:defi:{"graine":1,"ex":["acuity","acuity","pirate"]}');
  assert.strictEqual(ctx._duel, null, 'defi mal forme ignore');
}));

test('duel cerveau : barre face a face aux couleurs du theme de chacun, billes du sumito au front, « a déjà répondu »', () => _duelBac(({ els, envoyes, vider }) => {
  ctx._rtcHandleMessage('DUEL:defi:' + JSON.stringify({ graine: 5, ex: ['acuity', 'reflex', 'mat'], lvl: 2, nom: 'Saab', coul: '#5a8aa8' }));
  ctx.accepterDuelCerveau(true);
  const ok = JSON.parse(envoyes.pop().slice('DUEL:ok:'.length));
  assert.match(ok.coul, /^#[0-9a-f]{3,8}$/i, 'ma couleur de theme part avec l’acceptation');
  vider();
  const b = () => els['duel-barres'], P = () => ctx._duelPoussee(ctx._duel);
  assert.strictEqual(b().style.display, 'block');
  assert.match(b().innerHTML, /background:#5a8aa8/, 'son camp a la couleur de SON theme');
  assert.match(b().innerHTML, new RegExp('background:' + ok.coul), 'mon camp a la couleur de mon theme');
  assert.deepStrictEqual([P().pct, P().billesMoi, P().billesAdv], [50, 1, 1], '0 a 0 : front au milieu, 1 bille contre 1');
  ctx._rtcHandleMessage('DUEL:res:' + JSON.stringify({ m: 0, s: 100, ms: 800 }));
  assert.match(b().innerHTML, /title="a déjà répondu"/, 'il a repondu avant moi : pression');
  assert.ok(P().advEnAvance && !P().moiEnAvance);
  assert.deepStrictEqual([P().pct, P().billesMoi, P().billesAdv], [16, 1, 3], 'il mene largement : 3 billes contre 1, front pres de mon bord');
  ctx.gymFinish('acuity', 60, 'ok');
  assert.doesNotMatch(b().innerHTML, /a déjà répondu/);
  assert.deepStrictEqual([P().pct, P().billesMoi, P().billesAdv], [38, 1, 2], '60 contre 100 : 2 billes contre 1');
  vider(); ctx.gymFinish('reflex', 100, 'ok'); ctx._rtcHandleMessage('DUEL:res:' + JSON.stringify({ m: 1, s: 0, ms: 900 }));
  assert.deepStrictEqual([P().pct, P().billesMoi, P().billesAdv], [62, 2, 1], '160 contre 100 : je pousse a 2 contre 1');
  assert.ok(P().pct >= 16 && P().pct <= 84);
  ctx._duel = null; ctx._rtcHandleMessage('DUEL:defi:' + JSON.stringify({ graine: 5, ex: ['acuity', 'reflex', 'mat'], coul: 'red;background:url(x)' }));
  assert.strictEqual(ctx._duel.coulAdv, '#8a8a90', 'couleur non conforme remplacee');
}));

/* ─── 49. Labo v4 : paires, verdict fiable, fils paralleles, criteres de KAAH ─── */
// Bac a sable du Labo : faux fils de calcul (chaque partie attend qu'on lui reponde),
// minuteurs courts executes a la demande, minuteurs longs (chien de garde) gardes a part.
function _laboBac(fn){
  const els = {}, sG = ctx.document.getElementById, sTo = ctx.showToast, sCf = ctx.confirm;
  ctx.document.getElementById = id => (els[id] = els[id] || sG.call(ctx.document, id) || { textContent: '', innerHTML: '', style: {} });
  ctx.showToast = () => {}; ctx.confirm = () => true;
  const sCreer = ctx._labCreerFil, sPlan = ctx._labPlanifier, sTk = ctx._testKaahPlanifier, sCfg = Object.assign({}, ctx.LAB_CFG), sBal = Object.assign({}, ctx.AI_WEIGHT_PRESETS.balanced);
  const fils = [], envois = [], file = [], longs = [];
  ctx._labCreerFil = () => { const w = { postMessage: m => { if (!m.ping) envois.push({ w, m, fini: false }); }, terminate: () => { w.mort = true; } }; fils.push(w); return { w }; };
  ctx._labPlanifier = (f, ms) => { (ms < 1000 ? file : longs).push(f); return 0; };
  ctx._testKaahPlanifier = (f, ms) => { if (ms < 1000) file.push(f); return 0; };
  ['abaLabState', 'abaLabChampion', 'abaLabCfg', 'abaLabAutoRun', 'abaLabUse', 'abaTestKaah', 'abaLabDataLog', 'abaLabBookLearned'].forEach(k => ctx.localStorage.removeItem(k));
  ctx.LAB_CFG = Object.assign({}, ctx.LAB_CFG_DEFAULT);
  ctx._labRunning = false; ctx._labPingOk = false; ctx._labFils = []; ctx._labEnVol = {}; ctx._spsaVol = []; ctx._testKaahEnCours = false; ctx._testKaahEnVol = {};
  const vider = () => { let n = 0; while (file.length && n++ < 10000) file.shift()(); };
  // repond a une partie en attente : r = 'A' (A gagne), 'B' ou 'D', ou un objet resultat complet
  const repondre = (e, r) => { e.fini = true; e.w.onmessage({ data: { duelGame: true, result: typeof r === 'string' ? { winner: r, why: r === 'D' ? 'draw' : '6capt', plies: 40 } : r, moves: [] } }); };
  const attente = () => envois.filter(e => !e.fini && !e.w.mort);
  const demarrer = () => { ctx.startLab(); longs.length = 0; fils[0].onmessage({ data: { pong: 1 } }); vider(); };   // (le minuteur de 4 s du test des fils est ecarte)
  try { return fn({ els, fils, envois, file, longs, vider, repondre, attente, demarrer }); }
  finally {
    try { ctx._testKaahEnCours = false; ctx._labRunning = false; ctx._labFils = []; ctx._labEnVol = {}; ctx._spsaVol = []; } catch (e) {}
    ctx.document.getElementById = sG; ctx.showToast = sTo; ctx.confirm = sCf;
    ctx._labCreerFil = sCreer; ctx._labPlanifier = sPlan; ctx._testKaahPlanifier = sTk; ctx.LAB_CFG = sCfg;
    Object.keys(ctx.AI_WEIGHT_PRESETS.balanced).forEach(k => { delete ctx.AI_WEIGHT_PRESETS.balanced[k]; }); Object.assign(ctx.AI_WEIGHT_PRESETS.balanced, sBal);
    ['abaLabState', 'abaLabChampion', 'abaLabCfg', 'abaLabAutoRun', 'abaLabUse', 'abaTestKaah', 'abaLabDataLog', 'abaLabBookLearned'].forEach(k => ctx.localStorage.removeItem(k));
  }
}

test('labo : verdict par paires -- pas de conclusion sur une courte serie chanceuse, marge jamais nulle', () => {
  const B = ctx._labBounds();
  assert.ok(ctx._labLLRp([0, 0, 0, 0, 8], 0, 35) < B.up, '8 paires gagnees 2-0 (16 victoires) ne suffisent pas');
  assert.ok(ctx._labLLRp([0, 0, 0, 0, 11], 0, 35) >= B.up, '11 paires gagnees 2-0 suffisent');
  assert.ok(ctx._labLLRp([3, 10, 25, 10, 3], 0, 35) < 0, 'egalite parfaite : le LLR penche vers le rejet');
  assert.ok(ctx._labLLRp([3, 10, 25, 10, 3], 0, 35) > B.lo, '... sans conclure apres 51 paires');
  const e = ctx._labEloP([0, 0, 0, 0, 5]);
  assert.ok(e.ci > 50, 'marge non nulle meme sur des paires toutes gagnees (' + Math.round(e.ci) + ')');
  assert.match(ctx._labEloStrP([3, 10, 25, 10, 3]), /^\+0 Elo ± \d+$/);
  assert.strictEqual(ctx._labPoints([1, 2, 3, 4, 5]), 0 + 1 + 3 + 6 + 10);
  // une paire : les deux parties de la meme ouverture
  const job = { penta: ctx._labPentaVide(), half: {}, fait: {} };
  assert.strictEqual(ctx._labPaireAjouter(job, 0, 1, 1), false);
  assert.strictEqual(ctx._labPaireAjouter(job, 0, 1, 0), false, 'un doublon ne compte pas');
  assert.strictEqual(ctx._labPaireAjouter(job, 0, 0, 0.5), true);
  assert.strictEqual(JSON.stringify(job.penta), '[0,0,0,1,0]', 'nulle + victoire = 1½ point');
});

test('labo : plusieurs parties a la fois ; tri par paires sur les memes ouvertures pour tous les mutants', () => _laboBac(({ fils, envois, attente, demarrer }) => {
  ctx.LAB_CFG.threads = 3;
  demarrer();
  assert.strictEqual(fils.length, 3, 'trois fils de calcul');
  const a = attente(); assert.strictEqual(a.length, 3, 'trois parties en cours');
  const st = ctx.labLoad();
  assert.strictEqual(JSON.stringify(a.map(e => e.m.wA)), JSON.stringify(st.cands.map(c => c.w)), 'un mutant par fil');
  assert.strictEqual(new Set(a.map(e => e.m.seed)).size, 1, 'les mutants jouent la meme ouverture');
  assert.ok(a.every(e => e.m.colorA === 'black' && JSON.stringify(e.m.wB) === JSON.stringify(st.champion)), 'mutant = A, Noirs ; champion = B');
  assert.ok(a.every(e => e.m.msPerMove === 350 && e.m.maxPlies === 60 && e.m.ouverture === 6 && e.m.equilibre === 600), 'regime du tri, reglages d ouverture transmis');
  assert.strictEqual(ctx._labNbFils(), 3);
  ctx.LAB_CFG.threads = 0; const sN = ctx.navigator.hardwareConcurrency;
  ctx.navigator.hardwareConcurrency = 8; assert.strictEqual(ctx._labNbFils(), 4, 'auto : la moitie des coeurs, 4 au plus');
  ctx.navigator.hardwareConcurrency = 2; assert.strictEqual(ctx._labNbFils(), 1);
  ctx.navigator.hardwareConcurrency = sN;
}));

test('labo : tri -> confirmation (nouvelles ouvertures) -> adoption -> bilan contre les poids d origine -> generation suivante', () => _laboBac(({ envois, attente, vider, repondre, demarrer }) => {
  ctx.LAB_CFG.threads = 2;
  demarrer();
  const st0 = ctx.labLoad(), gagnant = st0.cands[1].name;
  // tri : le 2e mutant gagne tout, les autres perdent tout
  let garde = 0;
  while (ctx.labLoad().phase === 'screen' && garde++ < 100) { const e = attente()[0]; repondre(e, e.m.wA === undefined ? 'B' : (JSON.stringify(e.m.wA) === JSON.stringify(st0.cands[1].w) ? 'A' : 'B')); vider(); }
  let st = ctx.labLoad();
  assert.strictEqual(st.phase, 'confirm'); assert.strictEqual(st.confirm.name, gagnant);
  assert.strictEqual(st0.cands.filter((c, i) => i !== 1).length, 2);
  const triSeeds = new Set(envois.filter(e => e.m.maxPlies === 60).map(e => e.m.seed));
  const enAttente = attente().filter(e => e.m.msPerMove === 600);
  assert.ok(enAttente.length >= 1 && enAttente.every(e => !triSeeds.has(e.m.seed) && e.m.maxPlies === 80), 'confirmation : regime long, ouvertures neuves');
  // confirmation : le finaliste gagne tout -> adoption apres 11 paires (pas avant)
  const avant = JSON.stringify(ctx.AI_WEIGHT_PRESETS.balanced);
  garde = 0;
  while (ctx.labLoad().phase === 'confirm' && garde++ < 200) {
    const n = ctx._labPentaN(ctx.labLoad().confirm.penta);
    assert.ok(n < 11, 'pas de verdict avant 11 paires');
    repondre(attente()[0], 'A'); vider();
  }
  st = ctx.labLoad();
  assert.strictEqual(st.phase, 'bilan', 'apres adoption : mesure du gain reel');
  assert.match(st.history[0].type, /adopt/); assert.strictEqual(st.history[0].name, gagnant);
  assert.deepStrictEqual(st.champion, st0.cands[1].w);
  assert.notStrictEqual(JSON.stringify(ctx.AI_WEIGHT_PRESETS.balanced), avant, 'l IA utilise le nouveau champion');
  ctx.SPSA_KEYS.forEach(k => assert.strictEqual(ctx.AI_WEIGHT_PRESETS.balanced[k], st.champion[k]));
  // les parties de la confirmation encore en cours reviennent : ignorees
  const bilanAvant = JSON.stringify(st.bilan.penta);
  attente().filter(e => e.m.msPerMove === 600 && JSON.stringify(e.m.wB) !== JSON.stringify(ctx.LAB_ORIGINE)).forEach(e => repondre(e, 'A')); vider();
  assert.strictEqual(JSON.stringify(ctx.labLoad().bilan.penta), bilanAvant, 'resultat d une phase deja tranchee ignore');
  // bilan : champion contre les poids d'origine, 25 paires
  assert.ok(attente().every(e => JSON.stringify(e.m.wB) === JSON.stringify(ctx.LAB_ORIGINE)));
  garde = 0; let k = 0;
  while (ctx.labLoad().phase === 'bilan' && garde++ < 200) { repondre(attente()[0], (k++ % 3) ? 'A' : 'B'); vider(); }
  st = ctx.labLoad();
  assert.strictEqual(st.phase, 'screen'); assert.strictEqual(st.gen, st0.gen + 1);
  assert.strictEqual(st.mesures.length, 1); assert.strictEqual(st.mesures[0].paires, 25);
  assert.ok(st.mesures[0].elo > 0 && st.mesures[0].ci > 0, 'gain reel mesure, avec sa marge');
  assert.match(st.history[0].type, /bilan/);
}));

test('labo : un mutant qui ne gagne pas est rejete ; aucun mutant a 50 % au tri -> pas de confirmation', () => _laboBac(({ attente, vider, repondre, demarrer }) => {
  ctx.LAB_CFG.threads = 4;
  demarrer();
  const gen0 = ctx.labLoad().gen; let garde = 0;
  while (ctx.labLoad().gen === gen0 && garde++ < 200) { repondre(attente()[0], 'B'); vider(); }
  const st = ctx.labLoad();
  assert.strictEqual(st.phase, 'screen'); assert.match(st.history[0].type, /tri/);
  assert.match(st.history[0].name, /aucun mutant à 50 %/);
  assert.ok(st.cands.length && st.candsGen === gen0 + 1, 'nouveaux mutants');
  // futilite : apres 2 paires perdues 0-2 sur 3, le mutant est arrete
  const job = { penta: [2, 0, 0, 0, 0], half: {}, fait: {}, stop: false };
  const s2 = ctx.labLoad(); s2.cands = [job]; ctx._labVerifierPhase(s2);
  assert.strictEqual(job.stop, true);
}));

test('labo SPSA : les poids de l IA ne changent pas pendant les iterations ; theta verifie par SPRT avant adoption', () => _laboBac(({ attente, vider, repondre, demarrer }) => {
  ctx.LAB_CFG.mode = 'spsa'; ctx.LAB_CFG.spsaVerif = 3; ctx.LAB_CFG.threads = 2;
  const ia0 = JSON.stringify(ctx.AI_WEIGHT_PRESETS.balanced);
  demarrer();
  let st = ctx.labLoad(); assert.strictEqual(st.phase, 'spsa');
  assert.strictEqual(st.spsa.theta.sumito, ctx.LAB_KAAH_REF.sumito / 2, 'critere de KAAH : depart a la moitie de la valeur de KAAH');
  const a = attente(); assert.strictEqual(a.length, 2);
  assert.strictEqual(a[0].m.seed, a[1].m.seed, 'iteration = une paire (meme ouverture)');
  assert.deepStrictEqual([a[0].m.colorA, a[1].m.colorA], ['black', 'white']);
  const champ0 = JSON.stringify(st.champion);
  let garde = 0;
  while (ctx.labLoad().phase === 'spsa' && garde++ < 100) {
    repondre(attente()[0], 'A'); vider();
    assert.strictEqual(JSON.stringify(ctx.AI_WEIGHT_PRESETS.balanced), ia0, 'l IA garde ses poids pendant SPSA');
    assert.strictEqual(ctx.localStorage.getItem('abaLabChampion'), null);
  }
  st = ctx.labLoad();
  assert.strictEqual(st.phase, 'confirm'); assert.strictEqual(st.confirm.source, 'spsa');
  assert.match(st.confirm.name, /3 itérations/); assert.strictEqual(st.spsa.iter, 3);
  assert.strictEqual(JSON.stringify(st.champion), champ0);
  assert.deepStrictEqual(st.confirm.w, ctx._labComplet(st.spsa.theta));
  // theta perd la verification : rejete, SPSA reprend
  garde = 0;
  while (ctx.labLoad().phase === 'confirm' && garde++ < 300) { repondre(attente()[0], 'B'); vider(); }
  st = ctx.labLoad();
  assert.strictEqual(st.phase, 'spsa'); assert.match(st.history[0].type, /rejet/);
  assert.strictEqual(st.spsa.prochVerif, 6); assert.strictEqual(JSON.stringify(st.champion), champ0);
  assert.strictEqual(JSON.stringify(ctx.AI_WEIGHT_PRESETS.balanced), ia0);
}));

test('labo : criteres de KAAH dans les mutants (16 poids), case pour les exclure, retour aux poids d origine sans KAAH', () => _laboBac(() => {
  const ch = ctx._labComplet(ctx.LAB_ORIGINE);
  const tous = []; for (let g = 2; g < 12; g++) ctx.labMutants(ch, g, null).forEach(m => tous.push(m));
  assert.ok(tous.some(m => ctx.LAB_CLES_KAAH.indexOf(m.key) >= 0), 'des mutants allument des criteres de KAAH');
  const sum = tous.find(m => m.key === 'sumito'); assert.strictEqual(sum.w.sumito, 20); assert.match(sum.name, /^sumito 0→20$/);
  assert.ok(tous.every(m => Object.keys(m.w).length === 16), 'poids complets (16 cles)');
  ctx.LAB_CFG.kaah = 0;
  const sans = []; for (let g = 2; g < 12; g++) ctx.labMutants(ch, g, null).forEach(m => sans.push(m));
  assert.ok(sans.length && sans.every(m => ctx.LAB_CLES_KAAH.indexOf(m.key) < 0), 'case decochee : plus de mutant KAAH');
  ctx.LAB_CFG.kaah = 1;
  // champion avec sumito adopte, puis « ne pas utiliser les poids du Labo » : sumito revient a 0
  ctx.localStorage.setItem('abaLabChampion', JSON.stringify(Object.assign({}, ch, { sumito: 20 })));
  ctx.applyLabChampion(); assert.strictEqual(ctx.AI_WEIGHT_PRESETS.balanced.sumito, 20);
  ctx.labToggleUse({ checked: false }); assert.strictEqual(ctx.AI_WEIGHT_PRESETS.balanced.sumito, 0, 'critere de KAAH remis a 0');
  assert.strictEqual(ctx.AI_WEIGHT_PRESETS.balanced.label, 'équilibré');
  ctx.labToggleUse({ checked: true }); assert.strictEqual(ctx.AI_WEIGHT_PRESETS.balanced.sumito, 20);
  ctx.resetLab(); assert.strictEqual(ctx.AI_WEIGHT_PRESETS.balanced.sumito, 0);
  // poids incomplets ou invalides : completes
  const c2 = ctx._labComplet({ center: 7, mob: -3, sumito: 'x' });
  assert.deepStrictEqual([c2.center, c2.mob, c2.sumito, c2.piege], [7, 2, 0, 0]);
}));

test('labo : un etat de l ancien Labo (v3) est repris -- champion, historique, SPSA ; plus l ancien Elo cumule', () => _laboBac(() => {
  ctx.localStorage.setItem('abaLabState', JSON.stringify({ v: 3, gen: 7, champion: { center: 6, cohesion: 6, edge: 8, mob: 2, iso: 18, dng: 14, chain: 10, fortress: 20 },
    phase: 'confirm', cands: [{ name: 'x', done: 3, target: 6, score: 2, W: 2, D: 0, L: 1 }], confirm: { name: 'edge 8→10', done: 12, target: 60, score: 9, W: 9, D: 0, L: 3, llr: 1.2 },
    totalGames: 321, eloCurve: [{ gen: 1, elo: 0 }, { gen: 5, elo: 88 }], cumElo: 88, gameLog: [], lastGood: 'cohesion',
    history: [{ gen: 5, type: '✅ adopté (SPRT)', name: 'cohesion 4→6', score: 7, games: 8, elo: '+240 Elo ± 0' }],
    spsa: { iter: 12, k: 12, theta: { center: 6.5, cohesion: 5, edge: 8, mob: 2, iso: 18, dng: 14, chain: 10, fortress: 20 }, thetaHist: [], wins: 5, draws: 1, losses: 6 } }));
  const st = ctx.labLoad();
  assert.strictEqual(st.v, 4); assert.strictEqual(st.gen, 7); assert.strictEqual(st.totalGames, 321);
  assert.strictEqual(st.champion.cohesion, 6); assert.strictEqual(st.champion.sumito, 0);
  assert.strictEqual(st.phase, 'screen', 'le test en cours repart sur les nouvelles regles');
  assert.ok(st.cands.every(c => Array.isArray(c.penta)));
  assert.strictEqual(st.ancienCumul, 88);
  assert.match(st.history[0].type, /v4/); assert.strictEqual(st.history[1].name, 'cohesion 4→6');
  assert.strictEqual(st.spsa.iter, 12); assert.strictEqual(st.spsa.theta.center, 6.5);
  assert.strictEqual(JSON.parse(ctx.localStorage.getItem('abaLabState')).v, 4, 'migration enregistree');
}));

test('labo : partie trop longue -> fil remplace, partie relancee ; 3 fois de suite -> pause', () => _laboBac(({ fils, longs, attente, demarrer, vider }) => {
  ctx.LAB_CFG.threads = 1;
  demarrer();
  const e0 = attente()[0]; assert.ok(e0);
  assert.strictEqual(longs.length, 1, 'chien de garde arme');
  longs.shift()(); vider();
  assert.strictEqual(e0.w.mort, true, 'le fil bloque est arrete');
  assert.strictEqual(fils.length, 2, 'un fil neuf le remplace');
  const e1 = attente()[0];
  assert.strictEqual(e1.m.seed, e0.m.seed); assert.deepStrictEqual(e1.m.wA, e0.m.wA); assert.strictEqual(e1.m.colorA, e0.m.colorA);
  longs.shift()(); vider(); longs.shift()(); vider();
  assert.strictEqual(ctx._labRunning, false, 'en pause apres 3 parties trop longues');
}));

test('labo, cote moteur : arbitrage par CONSENSUS des deux evaluations (avant : celle du mutant seul)', () => {
  const { w, ev } = _filKaah();
  // position : Noirs au centre, Blancs au bord, autant de billes ; aucune ouverture, aucune partie : arbitrage direct
  ev(`_duelSetup=function(){ board={'4,4':'black','4,3':'black','4,5':'black','0,0':'white','0,4':'white','8,0':'white'}; capturedByBlack=0; capturedByWhite=0; };`);
  const zero = { center: 0, cohesion: 0, edge: 0, mob: 0, iso: 0, dng: 0, chain: 0, fortress: 0 };
  const gonfle = Object.assign({}, zero, { center: 400 }), neutre = zero;
  const r1 = w.playDuelGame(gonfle, neutre, 'black', 1, 30, 0, 300, 0, 1e9);
  assert.strictEqual(r1.winner, 'D', 'A se voit gagnant, B non : nulle (avant : victoire de A)');
  const r2 = w.playDuelGame(gonfle, gonfle, 'black', 1, 30, 0, 300, 0, 1e9);
  assert.deepStrictEqual([r2.winner, r2.why], ['A', 'adjEval'], 'les deux d accord : victoire');
  const r3 = w.playDuelGame(gonfle, gonfle, 'white', 1, 30, 0, 300, 0, 1e9);
  assert.strictEqual(r3.winner, 'B', 'A a les Blancs : les deux evaluations donnent les Noirs (B) gagnants');
});

test('labo, cote moteur : le rejeu (« revoir ») redonne exactement la partie jouee, ouverture comprise', () => {
  const { w, ev } = _filKaah();
  let msg = null; w.postMessage = m => { msg = m; };
  const base = { center: 6, cohesion: 4, edge: 8, mob: 2, iso: 18, dng: 14, chain: 10, fortress: 20 };
  w.self.onmessage({ data: { duelGame: true, wA: Object.assign({}, base, { mob: 4 }), wB: base, colorA: 'black', seed: 4242, msPerMove: 25, maxPlies: 14, drawWin: 300, ouverture: 4, equilibre: 600, id: 1 } });
  const r = msg.result, coups = msg.moves;
  assert.strictEqual(coups.length, r.plies, 'coups enregistres = ouverture (4) + partie');
  assert.ok(r.plies <= 18);
  const fin = ev('JSON.stringify(Object.keys(board).sort().map(function(k){ return k + board[k]; }))');
  w.self.onmessage({ data: { replayGame: true, colorA: 'black', seed: 4242, moves: coups, id: 2 } });
  const frames = msg.frames, der = frames[frames.length - 1];
  assert.strictEqual(frames.length, coups.length + 1, 'une position par coup, plus la position de depart');
  assert.strictEqual(Object.keys(frames[0].b).length, 28, 'la 1re image est la position de depart (14 contre 14)');
  assert.strictEqual(JSON.stringify(Object.keys(der.b).sort().map(k => k + (der.b[k] === 'b' ? 'black' : 'white'))), fin, 'position finale identique a la partie');
  assert.deepStrictEqual([der.cb, der.cw], [r.cb, r.cw]);
});

test('labo SPSA : une partie abandonnee (trop longue) est rejouee, l iteration se termine', () => _laboBac(({ fils, longs, attente, vider, repondre, demarrer }) => {
  ctx.LAB_CFG.mode = 'spsa'; ctx.LAB_CFG.spsaVerif = 2; ctx.LAB_CFG.threads = 2;
  demarrer();
  const [a, b] = attente(); assert.ok(a && b);
  repondre(b, 'A'); vider();                       // la partie en Blancs revient
  // la partie en Noirs ne revient jamais : chien de garde
  const chien = longs.shift(); chien(); vider();
  const relance = attente().find(e => e.m.seed === a.m.seed && e.m.colorA === 'black');
  assert.ok(relance, 'la partie abandonnee est relancee (meme ouverture, meme couleur)');
  repondre(relance, 'A'); vider();
  assert.strictEqual(ctx.labLoad().spsa.iter >= 1, true, 'l iteration se termine');
  let garde = 0;
  while (ctx.labLoad().phase === 'spsa' && garde++ < 50) { const e = attente()[0]; if (!e) break; repondre(e, 'B'); vider(); }
  assert.strictEqual(ctx.labLoad().phase, 'confirm', 'verification atteinte : rien n est reste bloque');
  // le journal ne stocke pas les poids nuls
  const ligne = JSON.parse(ctx.localStorage.getItem('abaLabDataLog'))[0];
  assert.ok(ligne.wA.center > 0 && !('piege' in ligne.wB && ligne.wB.piege === 0));
}));

/* ─── 50. Honnetete : rien d'invente sur le site ─── */
const _SRC = () => require('fs').readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
test('honnetete : les chiffres de l accueil sont ceux du code (parties, puzzles), plus les chiffres BGA non dates', async () => {
  const src = _SRC();
  const nb = id => { const m = src.match(new RegExp('id="' + id + '">([^<]+)<')); return m ? parseInt(m[1].replace(/\s/g, ''), 10) : null; };
  assert.strictEqual(nb('hero-nb-puzzles'), ctx.PUZZLES.length, 'puzzles annonces = puzzles du jeu');
  assert.ok(ctx.PUZZLES.every(p => / vs /.test(p.src || '')), 'chaque puzzle vient d une vraie partie');
  assert.ok(await ctx.ensureGameBanks());
  const s = await ctx.computeCorpusStats(() => {});
  assert.strictEqual(nb('hero-nb-parties'), s.totalGames, 'parties annoncees = corpus reel');
  ['>48K<', '>2.3M<', '>127<', 'chiffres communauté (source : BGA)'].forEach(x => assert.strictEqual(src.indexOf(x), -1, 'encore present : ' + x));
});

test('honnetete : la page Ouvertures annonce le vrai nombre de parties (2 126 a la racine, pas 16 819)', () => {
  const LAY = { black: [[8,0],[8,1],[7,0],[7,1],[7,2],[6,1],[6,2],[0,3],[0,4],[1,3],[1,4],[1,5],[2,4],[2,5]],
                white: [[8,3],[8,4],[7,3],[7,4],[7,5],[6,4],[6,5],[0,0],[0,1],[1,0],[1,1],[1,2],[2,1],[2,2]] };
  const b = {}; LAY.black.forEach(p => b[p[0] + ',' + p[1]] = 'black'); LAY.white.forEach(p => b[p[0] + ',' + p[1]] = 'white');
  const r = ctx.AbaOpening.probe(b, 'black');
  const racine = r.moves.reduce((s, m) => s + m.games, 0);
  assert.strictEqual(racine, 2126);
  const src = _SRC();
  assert.ok(src.indexOf('Ce que 2 126 parties de tournoi') > 0);
  assert.strictEqual(src.indexOf('16 819 parties de tournoi'), -1);
  assert.strictEqual(src.indexOf('dans les 16819 parties'), -1);
});

test('honnetete : aucun numero de telephone ; demonstrations sous des noms clairement fictifs (plus de vrais joueurs)', () => {
  const src = _SRC();
  assert.doesNotMatch(src, /\+33\s?[1-9](\s?\d{2}){4}/, 'numero de telephone');
  assert.doesNotMatch(src, /\b0[67](\s?\d{2}){4}\b/, 'numero de portable');
  const reels = ['Gramgroum', 'Vincent_F', 'Vincent F', 'SaaBalone', 'Chriscool', 'Claudie_ABA', 'GerardN', 'Gerard Ngan', 'MarbleKing_FR', 'BoulePower', 'KosmicKnight', 'AbaloneMaster'];
  const amis = JSON.stringify(ctx.friendsData), profils = JSON.stringify(Object.keys(ctx.compareProfiles));
  reels.forEach(n => { assert.strictEqual(amis.indexOf(n), -1, 'page Amis : ' + n); assert.strictEqual(profils.indexOf(n), -1, 'page Comparer : ' + n); });
  ['online', 'offline', 'suggestions'].forEach(k => ctx.friendsData[k].forEach(f => assert.match(f.name, /\(démo\)$/)));
  const chatGeneral = src.slice(src.indexOf('id="gchat-messages"'), src.indexOf('id="gchat-input"'));
  reels.forEach(n => assert.strictEqual(chatGeneral.indexOf('>' + n + '<'), -1, 'chat general : ' + n));
  assert.ok(src.indexOf('FightClub, handle') < 0 && src.indexOf("status:'En partie vs Gramgroum'") < 0);
});

test('honnetete : le chat ne fait plus parler le joueur ; plus d actualites ni de dates inventees', () => {
  const src = _SRC();
  const chat = src.slice(src.indexOf('id="chat-messages"'), src.indexOf('id="chat-quick"'));
  assert.strictEqual(chat.indexOf('chat-msg me'), -1, 'aucun message « Vous » ecrit d avance');
  assert.strictEqual(chat.indexOf('Merci, à toi aussi'), -1);
  assert.strictEqual(src.indexOf('MSO 2026 — Résultats Ronde 1'), -1);
  assert.doesNotMatch(src.replace(/<!--[\s\S]*?-->/g, ''), /[Ii]l y a (\d+ (jours?|semaines?)|1 semaine)</, 'date relative figee dans le HTML');
});

test('honnetete : classement sans donnees -> etat vide honnete, et plus aucun chiffre simule par filtre', () => {
  const els = {}, sG = ctx.document.getElementById;
  ctx.document.getElementById = id => (els[id] = els[id] || { style: {}, innerHTML: '' });
  try {
    ctx.renderLeaderboard();
    assert.strictEqual(els['lb-vide'].style.display, 'block'); assert.strictEqual(els['lb-donnees'].style.display, 'none');
    const p = { name: 'X', elo: 1500, w: 10, l: 5, d: 1, games: 16 };
    assert.strictEqual(JSON.stringify(ctx.lbVariant(p, 'blitz', 'week')), JSON.stringify(p), 'un filtre ne fabrique plus de chiffres');
  } finally { ctx.document.getElementById = sG; }
});

/* ─── 51. Version anglaise (v2.56) ─── */
const _faux = (tag, attrs, enfants) => {
  const el = { nodeType: 1, tagName: tag.toUpperCase(), _a: Object.assign({}, attrs || {}), childNodes: [], parentNode: null,
    get firstChild() { return this.childNodes[0] || null; },
    getAttribute(n) { return n in this._a ? this._a[n] : null; }, setAttribute(n, v) { this._a[n] = String(v); }, hasAttribute(n) { return n in this._a; },
    closest(sel) { assert.strictEqual(sel, '[translate="no"]'); for (let e = this; e && e.nodeType === 1; e = e.parentNode) if (e._a.translate === 'no') return e; return null; } };
  (enfants || []).forEach(c => { c.parentNode = el; el.childNodes.push(c); });
  return el;
};
const _texte = v => ({ nodeType: 3, nodeValue: v, parentNode: null });
// parcours en ordre du document, sous-arbre saute quand le filtre le rejette (2), comme un vrai TreeWalker
const _marcheur = (racine, quoi, filtre) => {
  const l = [];
  (function f(n) { n.childNodes.forEach(c => { if (c.nodeType === 1) { if (filtre && filtre.acceptNode(c) === 2) return; l.push(c); f(c); } else l.push(c); }); })(racine);
  let i = 0; return { nextNode: () => (i < l.length ? l[i++] : null) };
};

test('anglais : dictionnaire et motifs -- textes exacts, espaces conserves, nombres et noms repris, inconnu = rien', () => {
  assert.strictEqual(ctx._i18nEN('  Abandonner\n  '), '  Resign\n  ');
  assert.strictEqual(ctx._i18nEN('Commencer   la\npartie'), 'Start the game', 'espaces interieurs normalises');
  assert.strictEqual(ctx._i18nEN('À votre tour — Coup 14'), 'Your turn — Move 14');
  assert.strictEqual(ctx._i18nEN('À votre tour — Coup 40 — gain en 9'), 'Your turn — Move 40 — gain en 9', 'seul le debut connu est traduit');
  assert.strictEqual(ctx._i18nEN('Joueur Blanc : sélectionnez vos billes'), 'White player: select your marbles');
  assert.strictEqual(ctx._i18nEN('Case E5, bille noire, sélectionnée'), 'Cell E5, black marble, selected');
  assert.strictEqual(ctx._i18nEN('⛔ Poussée bloquée'), '⛔ Push blocked');
  assert.strictEqual(ctx._i18nEN('⛔ Poussée bloquée — réessaie'), '⛔ Push blocked — try again');
  assert.strictEqual(ctx._i18nEN('⛔ Raison inconnue'), null, 'motif sans traduction du reste : rien');
  assert.strictEqual(ctx._i18nEN('🛡️ Puzzle 64/138 · ⭐⭐ — Blancs jouent et parent la menace !'), '🛡️ Puzzle 64/138 · ⭐⭐ — White to play and stop the threat!');
  assert.strictEqual(ctx._i18nEN('+20 XP · Puzzle résolu'), '+20 XP · Puzzle solved');
  assert.strictEqual(ctx._i18nEN('Bille éjectée — résolu en 1 coup !'), 'Marble ejected — solved in 1 move!');
  assert.strictEqual(ctx._i18nEN('Variante communautaire reelle, 76 parties enregistrees sur AbalOnline -- seulement 12 billes par camp'),
    'Real community variant, 76 games recorded on AbalOnline — only 12 marbles per side');
  assert.strictEqual(ctx._i18nEN('Un texte que personne n a traduit'), null);
  assert.strictEqual(ctx._i18nEN('   '), null);
  // chaque motif a son mot-cle (essaye avant l'expression reguliere : la page compte des milliers de textes sans motif)
  ctx.I18N_EN_MOTIFS.forEach(m => assert.ok(typeof m[2] === 'string' ? m[2].length > 0 : Array.isArray(m[2]) && m[2].length > 0, 'motif sans mot-cle : ' + m[0]));
  assert.strictEqual(ctx._i18nEN('· TRAIT :'), '· TO MOVE:');
  assert.strictEqual(ctx._i18nEN('Prof. 8 : 10 premiers coups sur 44, 1 234 positions, 3,2 s (finie à 4,1 s)'), 'Depth 8: 10 first moves out of 44, 1 234 positions, 3,2 s (done at 4,1 s)');
});

test('anglais : chaque cle du dictionnaire existe vraiment dans le site (aucune traduction morte)', () => {
  const src = _SRC();
  const debut = src.indexOf('const I18N_EN = {'), fin = src.indexOf('function _i18nCle(');
  assert.ok(debut > 0 && fin > debut);
  const norm = x => x.replace(/\\u2019/g, '’').replace(/\\u2014/g, '—').replace(/\\u00e9/g, 'é').replace(/\\'/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&#10;/g, ' ').replace(/\s+/g, ' ');
  const hors = norm(src.slice(0, debut) + src.slice(fin));
  // textes composes par le code (morceaux concatenes) : verifies piece par piece
  const composes = { '▾ Réflexion de l’IA': [' Réflexion de l’IA', "'▾'"], '▸ Réflexion de l’IA': [' Réflexion de l’IA', "'▸'"], 'jours': ["jour'+(serieActuelle()>1?'s':'')"],
    'Les Noirs gagnent !': ["'Les ' + nomCamp(winner) + ' gagnent !'", "'Noirs'"], 'Les Blancs gagnent !': ["' gagnent !'", "'Blancs'"],
    'Les Noirs ont éjecté 6 billes adverses.': ["' ont éjecté 6 billes adverses.'"], 'Les Blancs ont éjecté 6 billes adverses.': ["' ont éjecté 6 billes adverses.'"],
    'Les Noirs ont abandonné.': ["' ont abandonné.'"], 'Les Blancs ont abandonné.': ["' ont abandonné.'"],
    '🧠 Mémoire': ["name: 'Mémoire'", "icon: '🧠'"], '👁️ Acuité': ["name: 'Acuité'"], '⚡ Réflexe': ["name: 'Réflexe'"], '🧩 Flexibilité': ["name: 'Flexibilité'"],
    '⚖️ Certitude': ["name: 'Certitude'"], '📖 Répertoire': ["name: 'Répertoire'"], '🎚️ Jugement': ["name: 'Jugement'"], '🎯 Mat au bord': ["name: 'Mat au bord'"] };
  const morts = Object.keys(ctx.I18N_EN).filter(k => {
    if (composes[k]) return composes[k].some(m => hors.indexOf(norm(m)) < 0);
    return hors.indexOf(k) < 0;
  });
  assert.deepStrictEqual(morts, [], 'cles introuvables dans le site (texte change ou faute de frappe)');
  assert.ok(Object.keys(ctx.I18N_EN).length > 500, 'dictionnaire suffisant : ' + Object.keys(ctx.I18N_EN).length);
  Object.keys(ctx.I18N_EN).forEach(k => assert.strictEqual(k, ctx._i18nCle(k), 'cle non normalisee : ' + k));
});

test('anglais : la page se traduit et se remet en francais ; zones de saisie, options-valeurs et translate="no" intactes', () => {
  const bouton = _faux('button', { title: 'Abandonner' }, [_texte('  Abandonner  ')]);
  const statut = _faux('span', {}, [_texte('À votre tour — Coup 14')]);
  const saisie = _faux('textarea', {}, [_texte('Abandonner')]);
  const opt1 = _faux('option', {}, [_texte('Variantes')]), opt2 = _faux('option', { value: 'v' }, [_texte('Variantes')]);
  const protege = _faux('div', { translate: 'no' }, [_faux('b', {}, [_texte('Abandonner')])]);
  const inconnu = _faux('p', {}, [_texte('Texte inconnu')]);
  const caseP = _faux('div', { 'aria-label': 'Case E5, bille noire' }, []);
  const racine = _faux('div', {}, [bouton, statut, saisie, _faux('select', {}, [opt1, opt2]), protege, inconnu, caseP]);
  const sW = ctx.document.createTreeWalker; ctx.document.createTreeWalker = _marcheur;
  try {
    ctx._i18nSousArbre(racine, true);
    assert.strictEqual(bouton.childNodes[0].nodeValue, '  Resign  '); assert.strictEqual(bouton.getAttribute('title'), 'Resign');
    assert.strictEqual(statut.childNodes[0].nodeValue, 'Your turn — Move 14');
    assert.strictEqual(saisie.childNodes[0].nodeValue, 'Abandonner', 'contenu d une zone de saisie');
    assert.strictEqual(opt1.childNodes[0].nodeValue, 'Variantes', 'option sans valeur : son texte EST sa valeur');
    assert.strictEqual(opt2.childNodes[0].nodeValue, 'Variants');
    assert.strictEqual(protege.childNodes[0].childNodes[0].nodeValue, 'Abandonner', 'translate="no"');
    assert.strictEqual(inconnu.childNodes[0].nodeValue, 'Texte inconnu');
    assert.strictEqual(caseP.getAttribute('aria-label'), 'Cell E5, black marble');
    ctx._i18nSousArbre(racine, true);   // deux fois de suite : rien ne bouge
    assert.strictEqual(statut.childNodes[0].nodeValue, 'Your turn — Move 14');
    statut.childNodes[0].nodeValue = 'Réécrit par le site';   // le site a change le texte entre-temps
    ctx._i18nSousArbre(racine, false);
    assert.strictEqual(bouton.childNodes[0].nodeValue, '  Abandonner  '); assert.strictEqual(bouton.getAttribute('title'), 'Abandonner');
    assert.strictEqual(opt2.childNodes[0].nodeValue, 'Variantes'); assert.strictEqual(caseP.getAttribute('aria-label'), 'Case E5, bille noire');
    assert.strictEqual(statut.childNodes[0].nodeValue, 'Réécrit par le site', 'un texte reecrit par le site n est pas ecrase');
  } finally { ctx.document.createTreeWalker = sW; }
});

test('anglais : choisie par ?lang=en ou par le menu, jamais imposee ; titre, langue de la page, evaluations', () => {
  const loc = ctx.location.search, avant = ctx.localStorage.getItem('abalone_lang'), doc = ctx.document.documentElement;
  const remettre = () => { ctx.currentLang._lu = false; ctx.currentLang._param = undefined; };
  try {
    ctx.localStorage.removeItem('abalone_lang'); remettre();
    assert.strictEqual(ctx.currentLang(), 'FR', 'sans parametre ni choix : francais');
    ctx.location.search = '?x=1&lang=en'; remettre();
    assert.strictEqual(ctx.currentLang(), 'EN'); assert.strictEqual(ctx.localStorage.getItem('abalone_lang'), 'EN', 'retenu');
    ctx.localStorage.setItem('abalone_lang', 'FR');
    assert.strictEqual(ctx.currentLang(), 'FR', 'un choix fait ensuite dans le menu l emporte');
    ctx.localStorage.setItem('abalone_lang', 'EN');
    assert.strictEqual(ctx._tr('oui', 'yes'), 'yes');
    assert.strictEqual(ctx._formatEvalIA({ e: 1090, p: 8, t: 19000, ph: 'milieu' }), 'Mid. +1090 · depth 8 · 19.0 s');
    assert.strictEqual(ctx._formatEvalIA({ e: 99996, p: 4, t: 120, ph: 'finale' }), 'End forced win · depth 4 · 120 ms');
    assert.strictEqual(ctx.directionName({ q: 1, r: 0 }), 'the right (east)');
    ctx.document.title = 'Abalassembly — Jouer'; ctx.I18N_TITRE.FR = null;
    ctx._i18nAppliquerTout('EN');
    assert.strictEqual(doc.lang, 'en'); assert.strictEqual(ctx.document.title, ctx.I18N_TITRE.EN);
    ctx._i18nAppliquerTout('FR');
    assert.strictEqual(doc.lang, 'fr'); assert.strictEqual(ctx.document.title, 'Abalassembly — Jouer');
    ctx.localStorage.setItem('abalone_lang', 'FR');
    assert.strictEqual(ctx._tr('oui', 'yes'), 'oui');
    assert.strictEqual(ctx._formatEvalIA({ e: 1090, p: 8, t: 19000, ph: 'milieu' }), 'Mil. +1090 · prof. 8 · 19,0 s', 'le francais ne change pas');
  } finally {
    ctx.location.search = loc; remettre();
    if (avant === null) ctx.localStorage.removeItem('abalone_lang'); else ctx.localStorage.setItem('abalone_lang', avant);
  }
});

test('anglais : l aide anglaise cite les libelles traduits du site ; menu de langue visible ; message « gratuit pour toujours »', () => {
  const src = _SRC();
  const en = src.slice(src.indexOf('id="aide-rubriques-en"'), src.indexOf('<div class="page" id="page-mentions">'));
  const valeurs = Object.values(ctx.I18N_EN).concat(Object.values(ctx.TRANSLATIONS.EN));
  const existe = l => valeurs.some(v => v === l || v.endsWith(' ' + l) || v.startsWith(l + ' '));
  const cites = ['Play', 'Set up your game', 'Starting layout', 'Opponent', 'Who starts?', 'Level', 'AI style', 'Max thinking time (s)', 'Time control', 'Aids',
    'Start the game', 'Customize…', 'Clock', 'Against the AI', 'Same device', 'Discovery', '↩️ Undo last move', '💡 Suggest a move', '🧠 Why this move?', '🤝 Offer a draw',
    'Resign', '🔄 Flip', 'Copy', 'Permutations', '📋 List', '📝 Comments', '📋 Copy', '▸ AI reasoning', 'Eval.', 'Time', 'Under it', 'Expected line', '🔍 Analyze the game', '⚠️ Review my mistakes',
    '▶ Replay the game', '⟨ Previous', 'Next ⟩', '📤 Share', '📋 Export the game', 'History', '📤 Export all (Aba-Pro)', '📥 Import', '📦 Export my data (JSON)',
    '📥 Import my data (JSON)', 'Create a game', 'Join', 'Game by code', 'Game rules', 'On a real board', 'Puzzles', 'Openings', 'Analysis', 'My statistics', 'Brain Gym',
    '⚔️ Brain Duel', 'Connect to a friend', 'Start a duel', 'Trainer course', 'Game library', 'Corpus stats', 'Endgame tables', 'AI Lab',
    'Photo / board detection', 'Watch', 'Tournament', 'Variants', 'Editor', 'Settings', 'Kids mode'];
  const absents = cites.filter(l => en.indexOf(l) < 0);
  assert.deepStrictEqual(absents, [], 'libelles annonces mais absents de l aide anglaise');
  const inventes = cites.filter(l => !existe(l));
  assert.deepStrictEqual(inventes, [], 'libelles de l aide anglaise qui ne sont pas ceux du site traduit');
  assert.match(src, /<div class="lang-select" id="lang-select"><!--/, 'menu de langue visible');
  assert.match(src, /<p class="hero-libre">Gratuit pour toujours\. Sans pub, sans compte obligatoire, sans mesure d’audience\. Code ouvert \(GPL\)\.<\/p>/);
  assert.strictEqual(ctx._i18nEN('Gratuit pour toujours. Sans pub, sans compte obligatoire, sans mesure d’audience. Code ouvert (GPL).'), 'Free forever. No ads, no account needed, no analytics. Open source (GPL).');
  assert.match(src, /html\[lang="en"\] \.fr-only \{ display: none !important; \}/);
  assert.match(src, /<span data-i18n="learn\.le">Le<\/span> <strong/); assert.strictEqual(ctx.TRANSLATIONS.EN['learn.le'], 'The');
});

test('regles : chiffres verifiables (4,5 millions, Mensa Select 1990) et mise en place exacte (5 + 6 + 3 billes)', () => {
  const src = _SRC();
  assert.strictEqual(src.indexOf('plus de 5 millions'), -1); assert.strictEqual(src.indexOf('Prix du Jouet Éducatif'), -1);
  assert.ok(src.indexOf('plus de 4,5 millions d\'exemplaires') > 0 && src.indexOf('premiers prix Mensa Select') > 0);
  assert.strictEqual(src.indexOf('dite "Belgique"'), -1, 'la disposition standard n est pas la « Belgique »');
  assert.ok(src.indexOf('(5 et 6 billes) et les 3 cases centrales de la troisième') > 0);
  // la disposition standard du moteur : 5 + 6 + 3 billes par camp, rangees du milieu vides
  const L = ctx.LAYOUTS.standard || ctx.LAYOUTS.classic;
  if (L && L.black) {
    const parRangee = {}; L.black.forEach(p => { parRangee[p[0]] = (parRangee[p[0]] || 0) + 1; });
    assert.deepStrictEqual(Object.values(parRangee).sort((a, b) => a - b), [3, 5, 6]);
  }
});

test('problemes : chaque bille sur le plateau, une ejection existe, la solution nomme la bille vraiment ejectee', () => {
  const els = {}, sG = ctx.document.getElementById, b0 = ctx.board, cb = ctx.CapturedByBlack.get(), cw = ctx.CapturedByWhite.get(), idx0 = ctx.currentPuzzleIdx;
  const resolus = ctx.puzzlesData.map(p => p.solved), titres = ctx.localStorage.getItem('abaSolvedPuzzleTitles');
  ctx.document.getElementById = id => (els[id] = els[id] || { style: {}, innerHTML: '', textContent: '' });
  const coup = ctx.showToast; ctx.showToast = () => {};
  try {
    ctx.puzzlesData.forEach((p, i) => {
      p.black.concat(p.white).forEach(([r, c]) => assert.ok(r >= 0 && r < 9 && c >= 0 && c < ctx.ROWS[r], 'puzzle ' + (i + 1) + ' : bille hors du plateau ' + r + ',' + c));
      const b = {}; p.black.forEach(([r, c]) => b[r + ',' + c] = 'black'); p.white.forEach(([r, c]) => b[r + ',' + c] = 'white');
      const sol = ctx.findEjectingMoveOn(b);
      assert.ok(sol, 'puzzle ' + (i + 1) + ' : aucune ejection possible');
      // le coup joue pour de vrai : quelle blanche disparait ?
      ctx.board = Object.assign({}, b);
      const info = ctx.validateMove(sol.cells, sol.dir, 'black');
      ctx.applyMove({ cells: sol.cells, dir: sol.dir, info: info }, 'black');
      const restantes = Object.keys(ctx.board).filter(k => ctx.board[k] === 'white').length;
      assert.strictEqual(restantes, p.white.length - 1, 'puzzle ' + (i + 1) + ' : une seule blanche en moins');
      // la blanche ejectee : celle dont la case d origine n a plus de blanche ET qui n a pas ete simplement poussee d un cran
      const avant = new Set(p.white.map(([r, c]) => r + ',' + c)), apres = new Set(Object.keys(ctx.board).filter(k => ctx.board[k] === 'white'));
      const disparues = [...avant].filter(k => !apres.has(k)), arrivees = [...apres].filter(k => !avant.has(k));
      assert.ok(disparues.length >= 1 && disparues.length - arrivees.length === 1);
      ctx.currentPuzzleIdx = i; ctx.showPuzzleSolution();
      const m = /La bille blanche \(([a-i]\d)\) est éjectée/.exec(els['puzzle-solution-text'].textContent);
      assert.ok(m, 'puzzle ' + (i + 1) + ' : solution sans bille nommee');
      // la bille nommee etait la plus avancee de la file poussee : une blanche d origine qui a disparu, en bord de plateau
      const nommee = p.white.find(([r, c]) => ctx.coordToABAPRO(r, c) === m[1]);
      assert.ok(nommee, 'puzzle ' + (i + 1) + ' : la bille nommee (' + m[1] + ') n est pas une blanche du puzzle');
      const ax = ctx.rcToAxial(nommee[0], nommee[1]);
      assert.strictEqual(ctx.axialToRc(ax.q + sol.dir.q, ax.r + sol.dir.r), null, 'puzzle ' + (i + 1) + ' : ' + m[1] + ' n est pas au bord dans le sens de la poussee');
      ctx.board = b0; ctx.CapturedByBlack.set(cb); ctx.CapturedByWhite.set(cw);
    });
  } finally {
    ctx.document.getElementById = sG; ctx.showToast = coup; ctx.board = b0; ctx.CapturedByBlack.set(cb); ctx.CapturedByWhite.set(cw); ctx.currentPuzzleIdx = idx0;
    ctx.puzzlesData.forEach((p, i) => { p.solved = resolus[i]; });
    if (titres === null) ctx.localStorage.removeItem('abaSolvedPuzzleTitles'); else ctx.localStorage.setItem('abaSolvedPuzzleTitles', titres);
  }
});

test('honnetete : la carte du joueur ne montre plus « Olivier » a tout le monde ; la couleur annoncee est celle tenue', () => {
  assert.strictEqual(_SRC().indexOf('>Vous (Olivier)<'), -1);
  const els = {}, sG = ctx.document.getElementById, u = ctx.currentUser, c = ctx.HumanColor.get();
  ctx.document.getElementById = id => (els[id] = els[id] || { style: {}, textContent: '' });
  try {
    ctx.currentUser = null; ctx.HumanColor.set('white'); ctx._majCarteJoueur();
    assert.strictEqual(els['me-name-lg'].textContent, 'Vous'); assert.strictEqual(els['me-billes-lg'].textContent, 'Vos billes: Blanches ○');
    ctx.currentUser = { username: 'Alex' }; ctx.HumanColor.set('black'); ctx._majCarteJoueur();
    assert.strictEqual(els['me-name-lg'].textContent, 'Vous (Alex)'); assert.strictEqual(els['me-avatar-lg'].textContent, 'A');
    assert.strictEqual(els['me-billes-lg'].textContent, 'Vos billes: Noires ●');
    assert.strictEqual(ctx._i18nEN('Vous (Alex)'), 'You (Alex)'); assert.strictEqual(ctx._i18nEN('Vos billes: Blanches ○'), 'Your marbles: White ○');
  } finally { ctx.document.getElementById = sG; ctx.currentUser = u; ctx.HumanColor.set(c); }
});

/* ─── 52. v2.57 : ce qui ne marchait pas (Parametres, profil, partage, comptes), et le Defi du jour #N ─── */
const _sansScripts = src => src.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<!--[\s\S]*?-->/g, '');

test('v2.57 parametres : chaque onglet a son panneau, et le changement d onglet ne tourne plus en boucle', () => {
  const src = _SRC();
  assert.strictEqual(src.indexOf('_origShowSettingsTab'), -1, 'l ancienne enveloppe qui s appelait elle-meme');
  const onglets = Array.from(new Set((src.match(/showSettingsTab\('([a-z]+)'\)/g) || []).map(m => m.slice(17, -2))));
  assert.ok(onglets.length >= 5, 'onglets : ' + onglets.join(','));
  onglets.forEach(t => assert.ok(src.indexOf('id="spanel-' + t + '"') > 0, 'onglet sans panneau : ' + t));
  // dans un faux DOM : un seul onglet et un seul panneau actifs, ceux demandes
  const mk = id => ({ id: id, classList: { on: false, toggle(c, v) { this.on = !!v; }, add() { this.on = true; }, remove() { this.on = false; }, contains() { return this.on; } } });
  const tabs = onglets.map(t => mk('stab-' + t)), panels = onglets.map(t => mk('spanel-' + t));
  const sQ = ctx.document.querySelectorAll, sG = ctx.document.getElementById;
  ctx.document.querySelectorAll = sel => sel === '.settings-tab' ? tabs : sel === '.settings-panel' ? panels : [];
  ctx.document.getElementById = id => panels.find(p => p.id === id) || tabs.find(p => p.id === id) || sG.call(ctx.document, id);
  try {
    ['accessibility', 'permissions', 'general'].forEach(t => {
      if (onglets.indexOf(t) < 0) return;
      ctx.showSettingsTab(t);
      assert.deepStrictEqual(panels.filter(p => p.classList.on).map(p => p.id), ['spanel-' + t]);
      assert.deepStrictEqual(tabs.filter(p => p.classList.on).map(p => p.id), ['stab-' + t]);
    });
    ctx.showSettingsTab('inexistant');   // rien ne casse
  } finally { ctx.document.querySelectorAll = sQ; ctx.document.getElementById = sG; }
});

test('v2.57 pages : chaque page ferme ses balises <div> (le profil et les Parametres debordaient sur les pages suivantes)', () => {
  const html = _sansScripts(_SRC());
  const debuts = []; const re = /<div class="page"[^>]*id="(page-[^"]+)"/g; let m;
  while ((m = re.exec(html))) debuts.push({ i: m.index, id: m[1] });
  assert.ok(debuts.length > 30);
  const fins = html.indexOf('</main>') > 0 ? html.indexOf('</main>') : html.length;
  debuts.forEach((d, k) => {
    const bout = html.slice(d.i, k + 1 < debuts.length ? debuts[k + 1].i : fins);
    const ouvre = (bout.match(/<div\b/g) || []).length, ferme = (bout.match(/<\/div>/g) || []).length;
    if (k + 1 < debuts.length) assert.strictEqual(ouvre - ferme, 0, d.id + ' : ' + ouvre + ' <div> pour ' + ferme + ' </div>');
  });
});

test('v2.57 profil : plus rien d ecrit en dur (serie de 18 jours, parties d ocj94, courbe « 1388 → 1489 », rang mondial, succes offerts)', () => {
  const src = _SRC();
  ['Série de 18 jours', 'abal.online · ocj94', 'Victoire vs fargokayogi', 'ELO départ (1 Avr)', '>1489<', 'Rang mondial', "name:'Premier sang'",
   "u ? (u.streak||0) : 18", 'Les parties jouées ne sont pas encore enregistrées', 'id="top-streak"', '⚡ 14 928'].forEach(t => assert.strictEqual(src.indexOf(t), -1, 'encore present : ' + t));
  // la serie : la vraie, et les jours coches seulement s'ils en font partie
  const els = {}, crees = [], sG = ctx.document.getElementById, sC = ctx.document.createElement, avant = JSON.stringify(ctx.progress);
  ctx.document.getElementById = id => (els[id] = els[id] || { id: id, textContent: '', innerHTML: '', style: {}, appendChild(x) { crees.push(x); } });
  ctx.document.createElement = () => ({ className: '', title: '', textContent: '' });
  try {
    const auj = ctx.todayStr(), il_y_a = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    Object.assign(ctx.progress, { streak: 3, lastActive: auj, bestStreak: 5 });
    ctx.renderStreak();
    assert.strictEqual(els['streak-title'].textContent, 'Série de 3 jours');
    assert.match(els['streak-sub'].textContent, /Série tenue aujourd’hui/); assert.match(els['streak-sub'].textContent, /Record : 5 jours/);
    assert.strictEqual(crees.length, 7);
    assert.deepStrictEqual(crees.map(x => /done/.test(x.className)), [false, false, false, false, true, true, true]);
    crees.length = 0;
    Object.assign(ctx.progress, { streak: 4, lastActive: il_y_a(3) });   // pas joue depuis 3 jours : la serie est rompue
    assert.strictEqual(ctx.serieActuelle(), 0);
    ctx.renderStreak();
    assert.strictEqual(els['streak-title'].textContent, 'Pas de série en cours');
    assert.deepStrictEqual(crees.map(x => /done/.test(x.className)), [true, true, true, true, false, false, false], 'les 4 jours joues restent coches, pas les suivants');
    // la courbe ELO : tiree de l'historique, ou vide
    Object.assign(ctx.progress, { elo: 1010, eloHistory: [{ date: il_y_a(40), elo: 1000 }, { date: il_y_a(10), elo: 1030 }, { date: il_y_a(2), elo: 1010 }] });
    ctx.renderProfileEloCard();
    assert.match(els['profile-elo-card'].innerHTML, /<path d="M0,\d+ L\d+,\d+ L\d+,\d+"/);
    assert.match(els['profile-elo-card'].innerHTML, /ELO maximum<\/span><span[^>]*>1030</);
    assert.strictEqual(els['profile-elo-diff'].textContent, '+10 pts');
    Object.assign(ctx.progress, { eloHistory: [] });
    ctx.renderProfileEloCard();
    assert.match(els['profile-elo-card'].innerHTML, /La courbe apparaît après deux journées de jeu/);
  } finally {
    ctx.document.getElementById = sG; ctx.document.createElement = sC;
    const p0 = JSON.parse(avant); Object.keys(ctx.progress).forEach(k => { if (!(k in p0)) delete ctx.progress[k]; }); Object.assign(ctx.progress, p0);
  }
});

test('v2.57 partage : le message suit la vraie fin de partie (plus de « Je viens de gagner » apres une defaite), et aucun lien invente', () => {
  const src = _SRC();
  ['Je viens de gagner une partie', 'discord.gg/abalassembly', 'youtube.com/@abalassembly', 'twitch.tv/abalassembly'].forEach(t => assert.strictEqual(src.indexOf(t), -1, 'encore present : ' + t));
  const f0 = ctx._finPartie;
  try {
    const fin = o => Object.assign({ winner: 'black', reason: null, cb: 6, cw: 2, coups: 48, mode: 'ai', moi: 'black', niveau: 4, adv: '', duree: 0, plateau: {}, date: new Date(2026, 9, 15) }, o);
    ctx._finPartie = fin({});
    assert.strictEqual(ctx.buildShareText(), 'J’ai battu l’IA niveau 4 à Abalone : 6-2, en 48 coups 🏆');
    ctx._finPartie = fin({ winner: 'white', cb: 2, cw: 6 });
    assert.strictEqual(ctx.buildShareText(), 'Battu par l’IA niveau 4 à Abalone (2-6, 48 coups). Revanche ? ⚫⚪');
    ctx._finPartie = fin({ winner: 'black', moi: 'white', cb: 6, cw: 3, reason: 'resign' });
    assert.strictEqual(ctx.buildShareText(), 'Battu par l’IA niveau 4 à Abalone (3-6 par abandon, 48 coups). Revanche ? ⚫⚪');
    ctx._finPartie = fin({ mode: 'local', winner: 'white', cb: 1, cw: 6 });
    assert.strictEqual(ctx.buildShareText(), 'Partie d’Abalone à deux : les Blancs gagnent 6-1 en 48 coups ⚫⚪');
    ctx._finPartie = fin({ winner: null, cb: 3, cw: 3, mode: 'live', adv: 'Alex' });
    assert.strictEqual(ctx.buildShareText(), 'Partie nulle à Abalone contre Alex (3-3, 48 coups) ⚫⚪');
    const I = ctx.infosFinPartie(fin({ winner: 'white', cb: 2, cw: 6 }));
    assert.strictEqual(I.titre, 'DÉFAITE'); assert.strictEqual(I.score, '2 – 6', 'du point de vue du joueur');
    assert.strictEqual(ctx.infosFinPartie(fin({ mode: 'local', winner: 'white', cb: 1, cw: 6 })).score, '6 – 1', 'a deux : du point de vue du gagnant');
    ctx._finPartie = null;
    assert.doesNotMatch(ctx.buildShareText(), /gagn|battu/i, 'sans partie terminee, aucune victoire annoncee');
  } finally { ctx._finPartie = f0; }
});

test('v2.57 comptes : un profil local a un vrai mot de passe ; plus de compte « fightclub », de Google ou Discord factices, ni d e-mail « envoye »', async () => {
  const src = _SRC();
  ["'fightclub':", 'FightClub (Frederic Garnier)', 'Email de réinitialisation envoyé', "showToast('🔗 Connexion Google", "showToast('🔗 Inscription Discord",
   'Visible par les autres joueurs', 'Rejoignez Abalone', 'compte Abalone', 'id="spanel-writer"', 'function publishArticle'].forEach(t => assert.strictEqual(src.indexOf(t), -1, 'encore present : ' + t));
  const u0 = ctx.currentUser, sess = ctx.localStorage.getItem('abalone_session'), reg = ctx.localStorage.getItem('abalone_profils');
  try {
    ctx.localStorage.removeItem('abalone_profils');
    let r = await ctx.profilCreation('Alex', 'alex@exemple.org', 'motdepasse1');
    assert.ok(r.ok); assert.strictEqual(ctx.currentUser.username, 'Alex');
    const p = JSON.parse(ctx.localStorage.getItem('abalone_profils')).alex;
    assert.ok(p && /^[0-9a-f]{64}$/.test(p.passwordHash), 'empreinte PBKDF2 gardee'); assert.strictEqual(p.password, undefined, 'jamais le mot de passe lui-meme');
    r = await ctx.profilCreation('ALEX', '', 'autremotdepasse'); assert.ok(!r.ok, 'meme nom : refuse');
    r = await ctx.profilConnexion('alex', 'mauvais'); assert.ok(!r.ok); assert.match(r.msg, /Mot de passe incorrect/);
    r = await ctx.profilConnexion('Inconnu', 'x'); assert.ok(!r.ok); assert.match(r.msg, /Aucun profil « Inconnu »/);
    r = await ctx.profilConnexion('ALEX@exemple.org', 'motdepasse1'); assert.ok(r.ok, 'par l e-mail aussi, sans tenir compte des majuscules');
    // un profil d'avant (aucun mot de passe garde) : le premier mot de passe donne devient le sien
    const tous = JSON.parse(ctx.localStorage.getItem('abalone_profils')); tous.ancien = { username: 'Ancien', color: '#2d5a3d' };
    ctx.localStorage.setItem('abalone_profils', JSON.stringify(tous));
    r = await ctx.profilConnexion('ancien', 'premier123'); assert.ok(r.ok && r.nouveauMdp);
    r = await ctx.profilConnexion('ancien', 'autre'); assert.ok(!r.ok, 'ensuite il est verifie');
  } finally {
    ctx.currentUser = u0;
    if (sess === null) ctx.localStorage.removeItem('abalone_session'); else ctx.localStorage.setItem('abalone_session', sess);
    if (reg === null) ctx.localStorage.removeItem('abalone_profils'); else ctx.localStorage.setItem('abalone_profils', reg);
  }
});

test('v2.57 parrainage : plus de « 100 XP par ami » impossible a tenir sans serveur ; l ami garde son bonus', () => {
  const src = _SRC();
  assert.strictEqual(src.indexOf('XP</strong> par ami qui rejoint'), -1);
  assert.strictEqual(src.indexOf("localStorage.setItem('abalone_referral_credits'"), -1, 'plus de « simulation sans backend »');
  const m = { innerHTML: '', style: {}, classList: { add() {}, remove() {} } }, sG = ctx.document.getElementById;
  ctx.document.getElementById = id => id === 'referral-modal' ? m : sG.call(ctx.document, id);
  try {
    ctx.openReferralModal();
    assert.match(m.innerHTML, /\+50 XP<\/strong> de bienvenue/); assert.match(m.innerHTML, /pas de récompense pour vous/);
  } finally { ctx.document.getElementById = sG; }
});

test('v2.57 defi du jour : un numero par jour civil, un tirage sans remise par cycle de 78 jours, des puzzles figes', () => {
  assert.strictEqual(ctx.DEFI_NB, 78); assert.strictEqual(ctx.SINGLE_MOVE_PUZZLE_COUNT, 78);
  assert.strictEqual(ctx.defiNumero(new Date(2026, 9, 14, 0, 5)), 1, '#1 = 14 octobre 2026, jour de la v2.57');
  assert.strictEqual(ctx.defiNumero(new Date(2026, 9, 14, 23, 59)), 1);
  assert.strictEqual(ctx.defiNumero(new Date(2026, 9, 15, 0, 1)), 2, 'nouveau defi a minuit');
  assert.strictEqual(ctx.defiNumero(new Date(2026, 9, 13, 12)), 1, 'jamais avant #1');
  assert.strictEqual(ctx.defiNumero(new Date(2026, 11, 31, 12)), 79);
  assert.strictEqual(ctx.defiNumero(new Date(2027, 0, 1, 12)), 80, 'le cycle suivant commence au #79');
  const cycle = k => { const v = []; for (let n = 1 + 78 * k; n <= 78 * (k + 1); n++) v.push(ctx.defiIndex(n)); return v; };
  const c0 = cycle(0), c1 = cycle(1);
  assert.deepStrictEqual(c0.slice().sort((a, b) => a - b), Array.from({ length: 78 }, (_, i) => i), 'chaque puzzle une fois par cycle');
  assert.deepStrictEqual(c1.slice().sort((a, b) => a - b), Array.from({ length: 78 }, (_, i) => i));
  assert.notDeepStrictEqual(c0, c1, 'un autre ordre au cycle suivant');
  // FIGE : un numero designe le meme puzzle pour tout le monde, aujourd'hui et dans un an. Changer ces valeurs
  // changerait les defis deja joues et partages (« #12 ⭐⭐ 🟩 ») : ne pas les modifier.
  assert.deepStrictEqual(c0.slice(0, 10), [11, 39, 61, 51, 37, 1, 50, 0, 77, 62]);
  assert.deepStrictEqual(c1.slice(0, 5), [65, 47, 63, 77, 73]);
  const emp = require('crypto').createHash('sha256').update(JSON.stringify(ctx.PUZZLES.slice(0, 78).map(p =>
    [p.c, p.bm, p.wm, p.cb, p.cw, p.sol.cells.map(x => [x.r, x.c]), [p.sol.dir.q, p.sol.dir.r], !!p.def]))).digest('hex');
  assert.strictEqual(emp, 'cbdd6abe1d6ba7969ec19b6648b69c916c6c08b21f60720dc941dfc3c4c8313b',
    'les 78 puzzles du defi ont change : un nouveau puzzle s ajoute APRES eux, jamais au milieu');
  assert.strictEqual(ctx._defiDepuisAdresse('?defi=1'), 1);
  assert.strictEqual(ctx._defiDepuisAdresse('?lang=en&defi'), ctx.defiNumero());
  assert.strictEqual(ctx._defiDepuisAdresse('?defi=999999'), ctx.defiNumero(), 'un defi futur : celui du jour');
  assert.strictEqual(ctx._defiDepuisAdresse('?ref=ABA-1'), null);
});

test('v2.57 defi du jour : grille 🟥🟨🟩⬛, phrase et texte a partager, sans rien devoiler de la solution', () => {
  const avant = JSON.stringify(ctx.progress), sT = ctx.setTimeout, en0 = ctx._defiEnCours, plus = [];
  const sX = ctx.addXp, sB = ctx.awardBadge, sR = ctx.renderEngageBar, sD = ctx.renderDailyCard, sH = ctx.updateHeroDaily;
  ctx.setTimeout = () => 0; ctx.addXp = (n, r) => plus.push(n + ' ' + r); ctx.awardBadge = () => {}; ctx.renderEngageBar = () => {}; ctx.renderDailyCard = () => {}; ctx.updateHeroDaily = () => {};
  try {
    ctx.progress.defis = {};
    const n = ctx.defiNumero(), idx = ctx.defiIndex(n), P = ctx.PUZZLES[idx];
    ctx._defiEnCours = { n: n, idx: idx, depuis: Date.now() - 42000 };
    ctx._defiSurPuzzle(idx + 1, 'x');                    // un autre puzzle : ne compte pas
    assert.strictEqual(ctx.defiEtat(n), null);
    ['x', 'i', 'i', 'v'].forEach(c => ctx._defiSurPuzzle(idx, c));
    const e = ctx.defiEtat(n);
    assert.strictEqual(e.e, 'xiv', 'l indice ne compte qu une fois'); assert.strictEqual(e.f, 'v');
    assert.ok(e.ms >= 42000 && e.ms < 44000, 'temps passe : ' + e.ms);
    assert.strictEqual(ctx._defiEnCours, null);
    assert.deepStrictEqual(plus, ['25 Défi du jour #' + n]);
    ctx._defiSurPuzzle(idx, 'x');                         // termine : plus rien ne compte
    assert.strictEqual(ctx.defiEtat(n).e, 'xiv');
    const t = ctx.texteDefi(n).split('\n');
    assert.strictEqual(t[0], 'Abalassembly — Défi du jour #' + n + ' ' + '⭐'.repeat(P.d || 1));
    assert.strictEqual(t[1], '🟥🟨🟩 Trouvé au 2e essai, avec l’indice · ⏱ 0:42');
    assert.strictEqual(t[2], '🔥 Série : 1 jour');
    assert.strictEqual(t[3], ctx.SHARE_URL + '?defi=' + n);
    assert.strictEqual(ctx.texteDefi(n).indexOf(P.lab), -1, 'la solution n apparait pas');
    assert.doesNotMatch(ctx.texteDefi(n), /\b[a-i][1-9]\b/, 'aucune case nommee');
    // la veille aussi trouvee : serie de 2 ; la solution affichee casse la serie
    assert.strictEqual(e.j, n, 'fini le jour meme');
    ctx.progress.defis[n - 1] = { e: 'v', f: 'v', ms: 5000, j: n - 1 };
    assert.strictEqual(ctx.defiSerie(), n > 1 ? 2 : 1);
    ctx.progress.defis[n - 1].j = n;                     // rejoue plus tard par son lien : ne compte pas dans la serie
    assert.strictEqual(ctx.defiSerie(), 1);
    ctx.progress.defis[n - 1].j = n - 1;
    ctx.progress.defis[n] = { e: 'xs', f: 's', ms: 0 };
    assert.strictEqual(ctx.defiPhrase(ctx.defiEtat(n)), 'Solution affichée');
    assert.strictEqual(ctx._defiCases('xs'), '🟥⬛');
    assert.strictEqual(ctx.defiSerie(), n > 1 ? 1 : 0, 'la serie d hier tient encore aujourd hui, mais ne compte pas le defi vu');
    assert.strictEqual(ctx.defiPhrase({ e: 'v', f: 'v' }), 'Trouvé du premier coup');
  } finally {
    ctx.setTimeout = sT; ctx._defiEnCours = en0; ctx.addXp = sX; ctx.awardBadge = sB; ctx.renderEngageBar = sR; ctx.renderDailyCard = sD; ctx.updateHeroDaily = sH;
    const p0 = JSON.parse(avant); Object.keys(ctx.progress).forEach(k => { if (!(k in p0)) delete ctx.progress[k]; }); Object.assign(ctx.progress, p0);
  }
});

test('v2.57 defi et probleme du mois : ouverts sur le plateau de la partie, sans nouvelle partie ; une nouvelle partie quitte le mode puzzle', () => {
  const src = _SRC();
  assert.ok(/function playMonthlyPuzzle\(\) \{[^}]*ouvrirPuzzleSurPlateau\(mc\.idx\)/.test(src), 'le probleme du mois ne restait pas sur la page Problemes');
  assert.ok(/function resetGame\(\) \{\s*try \{ if \(typeof _puzzleFermer === 'function'\) _puzzleFermer\(\); \}/.test(src));
  const sP = ctx.showPage, sS = ctx.startPuzzle, vus = [];
  ctx.showPage = nom => vus.push(nom + (ctx._puzzleOuverture ? ' (puzzle)' : ''));
  ctx.startPuzzle = idx => vus.push('puzzle ' + idx);
  try {
    ctx.ouvrirPuzzleSurPlateau(7);
    assert.deepStrictEqual(vus, ['game (puzzle)', 'puzzle 7']);
    assert.strictEqual(ctx._puzzleOuverture, false);
  } finally { ctx.showPage = sP; ctx.startPuzzle = sS; }
  const pa0 = ctx._puzzleActive, sG = ctx.document.getElementById, bar = { style: { display: 'flex' } };
  ctx.document.getElementById = id => id === 'puzzle-bar' ? bar : sG.call(ctx.document, id);
  try {
    ctx._puzzleActive = { idx: 3, sig: 'x', alts: [], tries: 0 };
    ctx._puzzleFermer();
    assert.strictEqual(ctx._puzzleActive, null); assert.strictEqual(bar.style.display, 'none');
  } finally { ctx._puzzleActive = pa0; ctx.document.getElementById = sG; }
});

/* ─── 53. v2.58 : Liste et Commentaires de la partie, comme dans Uncle Lolo's Abalone (ULA) ─── */
// La partie du journal d'ULA joint par Olivier (Marguerite belge, ULA niveau 3, 217 coups, 6-2) :
// les coups seuls, dans l'ordre final (coups repris compris)
const ULA_PARTIE = [
  'i9h8 a5b5 i8h7 a4b4 a1b1 i5h5 h8g7 h4h5 h9g8 g4g5f3 h8g8 i6h5 c1c3d2 c5c6d6 b1b3c1 b5b6c5',
  'g6f6 h5g5 g8f7 h6g5 d2c2 g4g5 b2a2b1 b4c4 f7e6 a2b3a3 f8e7 b4c5 g7f7 c5d6 g9g8 f8e7',
  'g8f8 a3b4 a1b2 c5d6 g9g8 b4a4 c3c4 f8e7 f6e5 c6d6 g8f8 a4b5 b2b3 e3f4 c1d2 d7e8',
  'd2e3 d6c5 b1b2 c5b4 c4c5 a3b4 b3c4 h6g5 b2b3 e3f4 d2e3 b4a4 f6g7 f3f4 g7f7 a4b5a3',
  'd4e5 h6g5 d2d3 e3f3 d4d5 d8e8 d7e7 i7h6 e5d5 b4b5 d5c5 e8f8 h8g7 f8e8 e7f8 h6h5',
  'b5c5 g8h8 e4e5 h7g6 e6e5 h8h7 g7f7 d7d8 f7g8 f3f4 d6d5 f4f5 d4e5 a5b6 e5f6 b6c7c6',
  'f9g9 h8h7 d3e4d4 c6d6 c2d3 h6g6 e5e6 f6f7 f9e8 c6d6 e8e7 h7g6 d7e8 g6f5 d4d5 g5f5',
  'g9g8 e9f9 c5d6 d5d4 g6g7 h5g5 g8f8 a3b4 b5c5 d3c3 a3a4 b4b3 a4b4 b3c3 c4c5 d4d5',
  'b4b5 b2c3 g7g8 g5f4 g8h9 d4e5 c6d6 f4e4 h9g9 d7c6 g9f9 c3d4 f9e8 f5g5 h8g8 g6f5',
  'c2c3 g5f4 c3c4 f4e4 b4b5 c4d4 b6a5 f4e4 g7g8 c4d4 e9d8 e4f5 e8e7 e3d3 e7e6 e3f4',
  'g9f8 c3c4 g8f8 f4g5 b5b4 c6b5 e8d7 c4d4 e7e6 f7f6 f8f7 f4f5 f3f4 f6f5 c6d6 h6g6h7',
  'f8e7 e3d3 f3e3 g5f4 a5b6 e3f4 b6c6 b5a4 c6c5 a4b5 c4c5 g5f4 d2c2 e3f3 c2b2 f3e3',
  'b2b3 e3d3 a3a4 b3c4 c7c6 c2b2 c6c5 b2b3 e5f6 h8g8 e4e5 c2d3 e7e6 b3b2 c3b3 e3d3',
  'b3b4 b6c6 c4c5 f4g5 c5c6 d4d5c4 c7d7 c3c4d4 g7f6 b2c3b3 d7e7 g7g6 f7f6 b3c4 f7f6 f3e3',
  'a4b5 e3d2 d7e7 g8h8 e7f7 h8i8 f7g7 i7h6 e5f5 d5c5 a5b6 h5h6 d8d7 d3c3 d7d6 i8h7',
  'd5d4 d1e2 d3c2 b5c5 c2d2 f2f3 e2d2e3 h7g6 d3e3 g3g4 e3f4 i7h7 f6e5 c3c4 c7d7 e6f6',
  'd6d7e6 c4d5 e7f7 i7i6 h8h7 c5d6 c2d3 d6c6 d3d4 c6b6c5 b4c4 d6d7 g7f7 d7c6 e7d6 c6b5',
  'f7e7 a4b4 d4e5 g7f7 h7g7 g6f5 f6g6 d3e4 f3f4 c5b4 e5d5 f6e6 d5c5 a5b6 g7f6 f7e6',
  'b5c5 b6b5 d5c5 a5b6 h5g5 a3a2 e5d4 d6d5 d3c3 e6e5 c3b3 a2b2 e7d6 d4d5 h7h6 e4e5',
  'f5e4 e6e5 f6f5 b2c3 b3c4 c3d4 c4d5 e4e5 f5e4 g4f3 f4g4 f7e6 g4h5 g6f5 i6i5 f3f4',
  'b5c6 b6b5 c6d7 b5b4 c5c4 f4f5 i5g5h4 b4c5 d7e7 c5d6 e8f8 e7e6 e2e3d2 d6d5 d1d2e2 f6f5',
  'f9f8 b3b4 h4g4h5 d4e5 c3d4 b4c5 f3e3 e6e5 e1e2d1 d5e5 h5h6 e5f6 h8g8 f4f5 f9e8 g5g6',
  'd7e8d6 c5d5 c4d4 f7e6 d1d2c1 f4f5 i5h5 f5e5 h5h6g4 e3f4 g5f5 d5e5 f8e7 e6e5 c5d5 f7e6',
  'e3d3 b3b4 c1c2 g7f6 d3c3 g6f6 c2c3 d6e6 e7d6 g6f6 b6b5 e4f5 g4g5 e6f6 h6g5 e3e4',
  'g8f7 g7g6 f7e6 g6g5 g3f3 g4g5 h7g7 g6h6 f3e3 h6g6 e3d3 g6f5 c2b2 d3e4 a2a3 g6g5',
  'g7f7 g4g5 f7e7 g6g7 e6e7 e4e5 b3c4 g7f7 c4d5 g8g7 b2c3b3 g7g6 d7d8 f6f5 f3e3 g6f5',
  'e3d3 f4f5 d8e8 e4e3 e8f9 e3e4 f9f8 d6e7 f6f7 f9e8 g9f8 e8d8 f7e7 f4e3 c6d7 e3f4',
  'f8e8'
].join(' ');

function _bacPartie(fn) {
  const sauve = { b: ctx.board, s: ctx.boardSnapshots, l: ctx.currentLayout, cb: ctx.CapturedByBlack.get(), cw: ctx.CapturedByWhite.get(), go: ctx.GameOver.get(),
    rm: ctx.replayMode, ri: ctx.replayCurrentIdx, mc: ctx.MoveCount.get() };
  const stubs = {}; ['showToast', 'rebuildMoveListLabels', 'loadSnapshot', 'closeMigsBrowser', 'updateCaptures', 'updateStatus', 'drawBoard'].forEach(k => { stubs[k] = ctx[k]; ctx[k] = () => {}; });
  try { return fn(); } finally {
    Object.keys(stubs).forEach(k => { ctx[k] = stubs[k]; });
    ctx.board = sauve.b; ctx.boardSnapshots = sauve.s; ctx.currentLayout = sauve.l; ctx.CapturedByBlack.set(sauve.cb); ctx.CapturedByWhite.set(sauve.cw);
    ctx.GameOver.set(sauve.go); ctx.replayMode = sauve.rm; ctx.replayCurrentIdx = sauve.ri; ctx.MoveCount.set(sauve.mc);
  }
}

test('v2.58 import : la Liste et le journal d ULA se collent tels quels (majuscules, numeros, scores, coups repris)', () => {
  assert.deepStrictEqual(Array.from(ctx._jetonsAbaPro('Coup\tNoir\tBlanc\n54\tE8E7\tH7G6\n59\tG6G7(1-1)\tH5G5')), ['e8e7', 'h7g6', 'g6g7', 'h5g5']);
  assert.deepStrictEqual(Array.from(ctx._jetonsAbaPro('1.e5f6 c3b2 2.d1e3')), ['e5f6', 'c3b2', 'd1e3'], 'l export du site reste lisible');
  const journal = ['1x. I9H8', 'somme des distances au centre noirs,blancs : 43 ,46', 'Temps : 0,4 s',
    '1y. A5B5 (suite prévue: I8H7 - A4B4 - C2C3D3 -  évaluation16)', '2x. I8H7', '2y. A4B4 (suite prévue: A1B1 - G4G5F4 - G7G8F7 -  évaluation13)',
    '2x. A1B1', 'Répétition trouvée, on évite le coup F7F6'].join('\r\n');
  assert.deepStrictEqual(Array.from(ctx._jetonsAbaPro(journal)), ['i9h8', 'a5b5', 'a1b1'], 'seuls les coups joues ; le 2x repris remplace la suite');
});

test('v2.58 liste : la partie d ULA se rejoue en entier ; le score apres chaque ejection est celui de la Liste d ULA', () => _bacPartie(() => {
  ctx.currentLayout = 'belgian'; ctx.initBoardState(); ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0);
  ctx._replaySeqToSnapshots(ULA_PARTIE, 'ULA', 'black');
  const S = ctx.boardSnapshots;
  assert.strictEqual(S.length, 433); assert.strictEqual(S[432].capturedByBlack + '-' + S[432].capturedByWhite, '6-2');
  const L = ctx._demiCoups();
  const avecScore = L.filter(d => /\(/.test(d.n)).map(d => d.num + (d.col === 'black' ? 'x' : 'y') + ' ' + d.n);
  // tels quels dans la Liste d'ULA : 26y C5B4(0-1), 59x G6G7(1-1), 60x G8F8(2-1), 70x G9F9(3-1), 107x C5C6(4-1), 132y D6C6(4-2), 159x G4H5(5-2), 217x F8E8(6-2)
  assert.deepStrictEqual(Array.from(avecScore), ['26y c5b4 (0-1)', '59x g6g7 (1-1)', '60x g8f8 (2-1)', '70x g9f9 (3-1)', '107x c5c6 (4-1)', '132y d6c6 (4-2)', '159x g4h5 (5-2)', '217x f8e8 (6-2)']);
  // le tableau : 217 lignes Coup | Noir | Blanc ; la derniere sans coup blanc
  const hote = { innerHTML: '', dataset: {}, querySelector: () => null, closest: () => null };
  const sG = ctx.document.getElementById; ctx.document.getElementById = id => id === 'liste-coups' ? hote : sG.call(ctx.document, id);
  try { ctx.renderListeCoups(); } finally { ctx.document.getElementById = sG; }
  const lignes = hote.innerHTML.match(/<tr>/g).length - 1;
  assert.strictEqual(lignes, 217);
  assert.match(hote.innerHTML, /<td class="lc-num">1<\/td><td class="lc-coup[^"]*" data-i="0"[^>]*>i9h8<\/td><td class="lc-coup[^"]*" data-i="1"[^>]*>a5b5<\/td>/);
  assert.match(hote.innerHTML, /<td class="lc-num">217<\/td><td [^>]*data-i="432"[^>]*>f8e8 \(6-2\)<\/td><td class="lc-vide">…<\/td>/);
  // la distance au centre : celle d'ULA dans les positions calmes (ses sept premiers chiffres)
  ctx.currentLayout = 'belgian'; ctx.initBoardState();
  const ula = [[43, 46], [43, 43], [41, 43], [41, 41], [41, 41], [41, 38], [38, 38]];
  ula.forEach((v, i) => { const m = ctx.mesuresPosition(S[i].board); assert.deepStrictEqual([m.centre.black, m.centre.white], v, 'demi-coup ' + (i + 1)); });
}));

test('v2.58 mesures : distance au centre, cohesion, bord, billes en danger', () => {
  // trois noires alignees au centre : distances 0 + 1 + 1, deux paires voisines, aucune au bord
  let m = ctx.mesuresPosition({ '4,4': 'black', '4,3': 'black', '4,5': 'black' });
  assert.strictEqual(m.centre.black, 2); assert.strictEqual(m.coh.black, 2); assert.strictEqual(m.bord.black, 0); assert.strictEqual(m.danger.black, 0);
  // une blanche au bord, deux noires derriere elle dans l'axe : ejectable (2 contre 1)
  m = ctx.mesuresPosition({ '4,0': 'white', '4,1': 'black', '4,2': 'black' });
  assert.strictEqual(m.bord.white, 1); assert.strictEqual(m.danger.white, 1); assert.strictEqual(m.danger.black, 0);
  // deux blanches au bord contre deux noires : pas de sumito, pas de danger
  m = ctx.mesuresPosition({ '4,0': 'white', '4,1': 'white', '4,2': 'black', '4,3': 'black' });
  assert.strictEqual(m.danger.white, 0);
  // trois contre deux : danger
  m = ctx.mesuresPosition({ '4,0': 'white', '4,1': 'white', '4,2': 'black', '4,3': 'black', '4,4': 'black' });
  assert.strictEqual(m.danger.white, 1, 'une seule sort au prochain coup : celle du bord');
});

test('v2.58 commentaires : la suite prevue et l evaluation de l IA, la source d un coup non calcule, rien d attribue a l IA dans une partie importee', () => _bacPartie(() => {
  ctx.currentLayout = 'standard'; ctx.initBoardState(); ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0);
  const jouer = (col, k) => {
    const mv = ctx.getAllMovesForColor(col)[k]; const avant = JSON.parse(JSON.stringify(ctx.board));
    ctx.applyMove({ cells: mv.cells, dir: mv.dir, info: mv.info }, col);
    return { mv: mv, s: { board: JSON.parse(JSON.stringify(ctx.board)), avant: avant, color: col, capturedByBlack: 0, capturedByWhite: 0,
      moveInfo: { cells: mv.cells, dir: mv.dir, type: mv.info.type, ejection: false }, label: '' } };
  };
  const a = jouer('black', 0), b = jouer('white', 0), c = jouer('black', 1), d = jouer('white', 1), e = jouer('black', 2);
  // le coup blanc b est « calcule » : suite prevue = c puis d puis e
  b.s.ia = { e: 16, p: 4, t: 412, detail: { prof: [{ d: 4, total: 40, noeuds: 5000, fin: 400, lignes: [{ pv: [c.mv, d.mv, e.mv].map(x => ({ cells: x.cells, dir: x.dir })) }] }] } };
  d.s.src = 'livre';
  ctx.boardSnapshots = [a.s, b.s, c.s, d.s, e.s];
  const L = ctx._demiCoups();
  const cb = ctx._lignesCommentaire(L[1], L, 1);
  assert.ok(cb.estIA);
  const txt = cb.lignes.map(x => x.t).join(' | ');
  assert.ok(txt.indexOf('Suite prévue : ' + [c, d, e].map(x => ctx.moveToABAPRO(x.mv.cells, x.mv.dir, x.mv.info.type)).join(' - ')) === 0, txt);
  assert.match(txt, /Évaluation \+16 pour l’IA · profondeur 4 · 5\s000 positions · 412 ms/);
  assert.match(ctx._lignesCommentaire(L[3], L, 1).lignes[0].t, /Coup du livre d’ouvertures/);
  // sans reflexion ni source (partie importee, ou a deux) : pas « IA »
  assert.strictEqual(ctx._lignesCommentaire(L[2], L, 1).estIA, false);
  assert.strictEqual(ctx._lignesCommentaire(L[4], L, 1).estIA, false);
  // le texte a copier : la numerotation d'ULA (1x, 1y...)
  const t = ctx.texteCommentaires().split('\n');
  assert.match(t[1], /^1x\. /); assert.match(t.find(l => /^1y\. /.test(l)), /\(IA\)$/); assert.ok(t.some(l => /^\s+distance au centre noirs,blancs : \d+, \d+/.test(l)));
}));

test('v2.58 annulation : le coup annule quitte la liste, les commentaires et l historique', () => _bacPartie(() => {
  ctx.currentLayout = 'standard'; ctx.initBoardState();
  const s0 = ctx.undoStack;
  try {
    ctx.boardSnapshots = [{ color: 'black' }, { color: 'white' }, { color: 'black' }];
    ctx.MoveCount.set(3);
    ctx.undoStack = [{ board: JSON.parse(JSON.stringify(ctx.board)), capturedByBlack: 0, capturedByWhite: 0, moveCount: 2, currentTurn: 'black', myTime: 0, oppTime: 0 }];
    ctx.replayMode = false;
    ctx.doUndo();
    assert.strictEqual(ctx.boardSnapshots.length, 2);
    // en rejeu ou en variante, l'historique de la partie n'est jamais raccourci
    ctx.boardSnapshots = [{}, {}, {}]; ctx.MoveCount.set(3); ctx.replayMode = true;
    ctx.undoStack = [{ board: JSON.parse(JSON.stringify(ctx.board)), capturedByBlack: 0, capturedByWhite: 0, moveCount: 1, currentTurn: 'black', myTime: 0, oppTime: 0 }];
    ctx.doUndo();
    assert.strictEqual(ctx.boardSnapshots.length, 3);
  } finally { ctx.undoStack = s0; }
}));

/* ─── 54. v2.59 : les 12 dimensions sur toutes les parties de la page, expliquées, par camp ─── */
// Demande d'Olivier : le dessin qui explique les centiles dans la page Statistiques du jeu, un
// graphique pour les deux camps, un pour les Noirs, un pour les Blancs, toujours accordés au
// nombre de parties. Les parties PlayStrategy et de référence n'avaient pas d'empreintes : elles
// en ont (tools/empreintes-complement.js), et ces tests échouent si une partie change sans elles.
const _vm54 = require('vm');
const _r54 = code => _vm54.runInContext(code, ctx);
const _jetons54 = seq => String(seq || '').replace(/\d+\./g, ' ').trim().split(/\s+/).filter(Boolean);
async function _charger54() {
  assert.ok(await ctx.ensureGameBanks()); assert.ok(await ctx.ensureEmpreintesHistoriques());
  assert.strictEqual(await _r54('ensureEmpreintesComplement()'), true, 'complement embarque et lisible');
}
async function _enFrancais54(fn) {
  const avant = ctx.localStorage.getItem('abalone_lang');
  ctx.localStorage.setItem('abalone_lang', 'FR');
  try { return await fn(); } finally { if (avant === null) ctx.localStorage.removeItem('abalone_lang'); else ctx.localStorage.setItem('abalone_lang', avant); }
}
// Des tests plus haut laissent leur faux document.getElementById (sections 21-22) : ces tests-ci
// ont le leur, qui garde chaque element, le temps du test.
async function _dom54(fn) {
  const origine = ctx.document.getElementById, els = {};
  ctx.document.getElementById = id => (els[id] || (els[id] = { id, innerHTML: '', textContent: '', style: {}, isConnected: true, clientWidth: 900,
    setAttribute() {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } }));
  try { return await fn(els); } finally { ctx.document.getElementById = origine; }
}

test('v2.59 complement : chaque partie PlayStrategy et de référence a ses empreintes, à jour (sinon : node tools/empreintes-complement.js)', async () => {
  await _charger54();
  const C = _r54('EMPREINTES_COMPLEMENT');
  assert.strictEqual(C.sig, _r54('_empComplementSignature()'),
    'parties PlayStrategy ou de reference modifiees : node tools/build.js && node tools/empreintes-complement.js && node tools/build.js');
  // une position par demi-coup de chaque partie, ni plus ni moins
  const parPartie = new Map();
  for (let i = 0; i < C.n; i++) { const k = C.source[i] + ':' + C.partie[i]; parPartie.set(k, (parPartie.get(k) || 0) + 1); }
  Array.from(ctx.PS_TOURNOI_YEARLY_2026).forEach((g, i) => assert.strictEqual(parPartie.get('0:' + i) || 0, _jetons54(g[5]).length, 'PlayStrategy ' + i));
  Array.from(ctx.PARTIES_REFERENCE).forEach((g, i) => assert.strictEqual(parPartie.get('1:' + i) || 0, _jetons54(g[6]).length, 'reference ' + i));
});

test('v2.59 complement : même convention que la banque -- la position après le coup m, vue du camp qui vient de jouer', async () => {
  await _charger54();
  const C = _r54('EMPREINTES_COMPLEMENT'), CH = Array.from(_r54('EMPREINTES_CHAMPS'));
  let vus = 0;
  _bacPartie(() => {
    const ps = ctx.PS_TOURNOI_YEARLY_2026[1], ref = ctx.PARTIES_REFERENCE[2];
    for (const [src, gi, dispo, seq] of [[0, 1, 'belgian', ps[5]], [1, 2, ref[4], ref[6]]]) {
      const T = _jetons54(seq);
      for (let i = 0; i < C.n; i++) {
        if (C.source[i] !== src || C.partie[i] !== gi || C.m[i] > 5) continue;
        ctx.currentLayout = dispo; ctx.initBoardState(); ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0);
        let col = 'black';
        for (let k = 0; k <= C.m[i]; k++) { ctx.applyMove(ctx.resolveAbaProToken(T[k], col), col); col = col === 'black' ? 'white' : 'black'; }
        const e = ctx.calculerEmpreinte(C.couleur[i] ? 'white' : 'black');
        let sq = 0; CH.forEach((f, c) => { const d = e[f] - C.flat[i * CH.length + c]; sq += d * d; });
        assert.ok(Math.sqrt(sq) < 0.002, 'source ' + src + ', partie ' + gi + ', coup ' + C.m[i] + ' : ' + Math.sqrt(sq));
        vus++;
      }
    }
  });
  assert.strictEqual(vus, 12);
});

test('v2.59 les 12 dimensions : toutes les parties de la page, par camp, centiles calculés comme avant', async () => {
  await _charger54();
  const K = _r54('_empCorpusDonnees()'), nP = _r54('EMPREINTES_HISTORIQUES.length'), C = _r54('EMPREINTES_COMPLEMENT');
  const ps = Array.from(ctx.PS_TOURNOI_YEARLY_2026), ref = Array.from(ctx.PARTIES_REFERENCE);
  assert.strictEqual(K.n, nP + C.n);
  assert.strictEqual(K.nNoirs + K.nBlancs, K.n);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(K.parties)),
    { MIGS: ctx.MIGS_GAMES.length, AO: ctx.AO_GAMES.length, PS: ps.filter(g => _jetons54(g[5]).length).length, REF: ref.length });
  const cv = _r54('_dimCouverture()');
  assert.strictEqual(cv.manque, 0); assert.strictEqual(cv.perime, false);
  // les parties comptees par la page (computeCorpusStats.totalGames), sauf celles abandonnees avant le premier coup
  assert.strictEqual(cv.parties + cv.sansCoup, ctx.MIGS_GAMES.length + ctx.AO_GAMES.length + ps.length + ref.length);
  // la regle d'avant (valeur de rang floor(n x p) apres tri), sur toutes les positions, et par camp
  const D = 12, CH = Array.from(_r54('EMPREINTES_CHAMPS'));
  for (const f of ['coeurRatio', 'materialDiff', 'mobilite2Ratio']) {
    const c = CH.indexOf(f), tous = [], noirs = [];
    const P = _r54(`EMPREINTES_HISTORIQUES.map(function(p){ return [p.e['${f}'], p.c === 'black' ? 1 : 0]; })`);
    P.forEach(x => { tous.push(x[0]); if (x[1]) noirs.push(x[0]); });
    for (let i = 0; i < C.n; i++) { const v = Math.round(C.flat[i * D + c] * 1000) / 1000; tous.push(v); if (!C.couleur[i]) noirs.push(v); }
    for (const [vals, vue] of [[tous, 'tous'], [noirs, 'black']]) {
      vals.sort((a, b) => a - b);
      const q = p => vals[Math.min(vals.length - 1, Math.floor(vals.length * p))];
      const d = _r54(`distributionDimension('${f}', '${vue}')`);
      assert.deepStrictEqual([d.n, d.min, d.p10, d.median, d.p90, d.max], [vals.length, vals[0], q(0.1), q(0.5), q(0.9), vals[vals.length - 1]], f + ' / ' + vue);
    }
  }
  // la part des positions sous une valeur
  const d = _r54(`distributionDimension('coeurRatio', 'tous')`);
  assert.strictEqual(ctx.pourcentEnDessous(d, d.min), 0);
  assert.strictEqual(ctx.pourcentEnDessous(d, d.max + 1), 100);
  const p90 = ctx.pourcentEnDessous(d, d.p90 + 0.001);
  assert.ok(p90 >= 89 && p90 <= 100, String(p90));
  // l'ancienne fonction garde sa forme, sur les memes positions
  const dist = _r54('computeDimensionDistributions()');
  assert.deepStrictEqual(Object.keys(dist), CH);
  assert.strictEqual(dist.coeurRatio.n, K.n);
  assert.strictEqual(_r54('computeDimensionCorrelations()').n, K.n);
});

test('v2.59 page Statistiques du jeu : explication, trois graphiques (deux camps, Noirs, Blancs), curseur, tableau par camp', () => _enFrancais54(() => _dom54(async () => {
  await _charger54();
  try {
    _r54("_dimChamp = 'coeurRatio'; _dimVueTable = 'tous'; _dimValeur = null;");
    _r54('_dimsRendre()');
    const K = _r54('_empCorpusDonnees()'), nb = x => _r54('_dimNb(' + x + ')');
    let html = ctx.document.getElementById('dims-carte').innerHTML;
    assert.strictEqual((html.match(/class="dims-barre"/g) || []).length, 300, '3 graphiques de 100 barres');
    assert.match(html, /Comment lire ce tableau/);
    assert.ok(html.indexOf('Mesuré sur <b>' + nb(K.n) + ' positions</b> de <b>' + nb(_r54('_dimCouverture()').parties) + ' parties</b>') >= 0, 'les nombres viennent des donnees');
    ['Les deux camps · ' + nb(K.n), 'Noirs · ' + nb(K.nNoirs), 'Blancs · ' + nb(K.nBlancs)].forEach(t => assert.ok(html.indexOf(t) >= 0, t));
    assert.strictEqual((html.match(/class="dims-ligne"/g) || []).length, 12);
    assert.match(html, /▸ Billes au cœur/);
    // le curseur : 0,43 au cœur, au-dessus du 90e centile dans les trois files
    _r54('_dimsSituer(0.43)');
    const lec = ctx.document.getElementById('dims-lecture').innerHTML;
    assert.strictEqual((lec.match(/au-dessus du 90ᵉ centile : parmi les 10 % les plus marquées/g) || []).length, 3);
    // une dimension en nombres entiers : curseur au pas de 1
    _r54("_dimChoisir('materialDiff')");
    html = ctx.document.getElementById('dims-carte').innerHTML;
    assert.match(html, /id="dims-curseur" min="-?\d+" max="\d+" step="1"/);
    assert.match(html, /▸ Différence matérielle/);
    // le tableau des Noirs : leurs propres valeurs
    await _r54("_dimVue('black')");
    html = ctx.document.getElementById('dims-carte').innerHTML;
    const dN = _r54("distributionDimension('cohesionMoyenne', 'black')"), dT = _r54("distributionDimension('cohesionMoyenne', 'tous')");
    assert.notStrictEqual(dN.median, dT.median, 'les Noirs ne sont pas les deux camps');
    assert.ok(html.indexOf('médiane ' + _r54('_dimDec(' + dN.median + ')')) >= 0);
    // la redondance, mesuree ici : plus de « 0,93 » ecrit a la main
    _r54('_dimsCorrelations()');
    const corr = _r54('computeDimensionCorrelations()'), g = ['cohesionMoyenne', 'soutienMoyen', 'proportionSansSoutien'];
    const rMax = Math.max(...corr.pairs.filter(p => g.includes(p.a) && g.includes(p.b)).map(p => Math.abs(p.r)));
    assert.ok(ctx.document.getElementById('dims-corr').innerHTML.indexOf('jusqu’à ' + _r54('_dimDec(' + rMax + ')') + ')') >= 0);
  } finally { _r54("_dimChamp = 'coeurRatio'; _dimVueTable = 'tous'; _dimValeur = null;"); }
})));

test('v2.59 les graphiques suivent les données : des parties sans mesures sont comptées et signalées, jamais oubliées en silence', () => _enFrancais54(() => _dom54(async () => {
  await _charger54();
  const C = _r54('EMPREINTES_COMPLEMENT'), nP = _r54('EMPREINTES_HISTORIQUES.length');
  try {
    _r54('EMPREINTES_COMPLEMENT = null');
    const K = _r54('_empCorpusDonnees()');
    assert.strictEqual(K.n, nP, 'recalcule des que les donnees changent');
    const cv = _r54('_dimCouverture()');
    assert.strictEqual(cv.manque, cv.attendu.PS + cv.attendu.REF);
    _r54('_dimsRendre()');
    const html = ctx.document.getElementById('dims-carte').innerHTML;
    assert.ok(html.indexOf('⚠ ' + cv.manque + ' parties de cette page n’ont pas encore leurs mesures') >= 0);
    assert.ok(html.indexOf('Les deux camps · ' + _r54('_dimNb(' + nP + ')') + ' positions') >= 0);
  } finally { ctx.__c54 = C; _r54('EMPREINTES_COMPLEMENT = __c54'); }
  // une partie modifiee sans relancer l'outil : signalee aussi
  const sig = C.sig;
  try {
    C.sig = 'autre';
    assert.strictEqual(_r54('_dimCouverture()').perime, true);
  } finally { C.sig = sig; }
  assert.strictEqual(_r54('_empCorpusDonnees()').n, nP + C.n, 'et tout revient avec le complement');
  _r54('_dimsRendre()');
})));
/* ─── 55. v2.60 : plus d'allers-retours de l'IA en debut de partie ─── */
// Le repli « empreintes » prenait la position historique la plus proche, sans seuil, avec le
// mauvais camp au trait, et rejouait un coup tire d'une autre partie : h9g8 puis g8h9 contre
// l'IA niveau 3. Il ne joue plus que depuis une position IDENTIQUE, verifiee en rejouant la
// partie reelle, et aucun coup joue sans calcul ne revient en arriere.
const _vm55 = require('vm');
const _r55 = code => _vm55.runInContext(code, ctx);
const _jetons55 = seq => String(seq).replace(/\d+\.-?/g, ' ').trim().split(/\s+/).filter(Boolean);
function _bac55(fn) {
  const depart = ctx._replayStartBoard;
  try { return _bacPartie(fn); } finally { ctx._replayStartBoard = depart; }
}
// pose une position en rejouant des jetons Aba-Pro depuis une disposition, historique compris ; rend le camp au trait
function _poser55(layout, jetons) {
  ctx.currentLayout = layout; ctx.initBoardState(); ctx.CapturedByBlack.set(0); ctx.CapturedByWhite.set(0);
  ctx._replayStartBoard = JSON.parse(JSON.stringify(ctx.board));
  ctx.boardSnapshots = [];
  let col = 'black';
  for (const t of jetons) {
    const mv = ctx.resolveAbaProToken(t, col);
    assert.ok(mv, 'jeton illisible : ' + t);
    ctx.applyMove(mv, col);
    ctx.boardSnapshots.push({ board: JSON.parse(JSON.stringify(ctx.board)), color: col, capturedByBlack: ctx.CapturedByBlack.get(), capturedByWhite: ctx.CapturedByWhite.get() });
    col = col === 'black' ? 'white' : 'black';
  }
  return col;
}
const _coup55 = (col, label) => ctx.getAllMovesForColor(col).find(m => ctx.moveToABAPRO(m.cells, m.dir, m.type) === label);

test('v2.60 empreintes : un enregistrement {m, c} decrit la position apres m+1 demi-coups, vue du camp c qui vient de jouer', async () => {
  assert.ok(await ctx.ensureGameBanks()); assert.ok(await ctx.ensureEmpreintesHistoriques());
  _bac55(() => {
    const g = 77, jetons = _jetons55(ctx.MIGS_GAMES[g][5]);
    const recs = _r55(`EMPREINTES_HISTORIQUES.filter(function(p){ return p.s === 'MIGS' && p.g === ${g} && p.m < 6; })`);
    assert.strictEqual(recs.length, 6);
    recs.forEach(r => {
      _poser55('belgian', jetons.slice(0, r.m + 1));
      assert.strictEqual(r.c, r.m % 2 === 0 ? 'black' : 'white');
      assert.ok(ctx.distanceEmpreintes(ctx.calculerEmpreinte(r.c), r.e) < 0.002, 'm=' + r.m + ' : la meme position, a l arrondi du stockage pres');
    });
  });
});

test('v2.60 repli : depuis une position de vraie partie, il joue un coup reellement joue depuis CETTE position', async () => {
  assert.ok(await ctx.ensureGameBanks()); assert.ok(await ctx.ensureEmpreintesHistoriques());
  _bac55(() => {
    for (const [g, n] of [[10, 6], [120, 9], [1500, 12]]) {
      const col = _poser55('belgian', _jetons55(ctx.MIGS_GAMES[g][5]).slice(0, n));
      const mv = ctx.pickEmpreinteFallbackMove(col, ctx.getAllMovesForColor(col), n);
      assert.ok(mv, 'partie ' + g + ' apres ' + n + ' demi-coups : position du corpus, un coup attendu');
      // les parties rejouees pour verifier : le coup rendu est une reponse jouee depuis exactement cette position
      const ici = ctx._empCle(ctx.board, ctx.CapturedByBlack.get(), ctx.CapturedByWhite.get());
      const reponses = new Set();
      _r55('_empRejeux').forEach(r => r.cles.forEach((k, i) => {
        if (k !== ici || !r.jetons[i + 1]) return;
        const m = ctx.resolveAbaProToken(r.jetons[i + 1], col); if (m) reponses.add(ctx.canonId(m));
      }));
      assert.ok(reponses.has(ctx.canonId(mv)), 'partie ' + g + ' : ' + ctx.moveToABAPRO(mv.cells, mv.dir, mv.type) + ' doit etre une reponse reelle');
    }
  });
});

test('v2.60 repli : une position absente des parties reelles ne donne rien -- la recherche decide', async () => {
  assert.ok(await ctx.ensureGameBanks()); assert.ok(await ctx.ensureEmpreintesHistoriques());
  _bac55(() => {
    // trois coups inhabituels en disposition standard : aucune partie reelle ne passe par la.
    // Avant la v2.60, la position historique « la plus proche » donnait quand meme son coup,
    // et c'etait g8h9 -- l'aller-retour juste apres h9g8, comme contre l'IA niveau 3.
    const col = _poser55('standard', ['c3c2', 'h9g8', 'b5c5c6']);
    assert.strictEqual(ctx.pickEmpreinteFallbackMove(col, ctx.getAllMovesForColor(col), 3), null);
    assert.strictEqual(ctx._coupRetourEnArriere(_coup55('white', 'g8h9'), 'white'), true, 'g8h9 serait un aller-retour');
    // pas de coup joue : rien a comparer
    _poser55('standard', []);
    assert.strictEqual(ctx.pickEmpreinteFallbackMove('black', ctx.getAllMovesForColor('black'), 0), null);
  });
});

test('v2.60 : un coup joue sans calcul ne revient jamais en arriere (aller-retour, position deja vue)', () => _bac55(() => {
  // h9g8 puis g8h9 : les blanches reviennent la ou elles etaient
  _poser55('standard', ['c3d3', 'h9g8', 'c4d4']);
  assert.strictEqual(ctx._coupRetourEnArriere(_coup55('white', 'g8h9'), 'white'), true, 'aller-retour');
  assert.strictEqual(ctx._coupRetourEnArriere(_coup55('white', 'g7f7'), 'white'), false, 'coup normal');
  // les noirs aussi reviennent : la position de depart reviendrait
  _poser55('standard', ['c3d3', 'h9g8', 'd3c3']);
  assert.strictEqual(ctx._coupRetourEnArriere(_coup55('white', 'g8h9'), 'white'), true, 'position deja vue');
  // le livre statistique ne tire jamais un tel coup, meme tres frequent
  _poser55('standard', ['c3d3', 'h9g8', 'c4d4']);
  const legaux = ctx.getAllMovesForColor('white');
  const node = { k: {} };
  node.k[ctx.canonId(_coup55('white', 'g8h9'))] = { c: 1000, w: 10, wg: 10 };
  node.k[ctx.canonId(_coup55('white', 'g7f7'))] = { c: 1, w: 0, wg: 0 };
  for (let i = 0; i < 30; i++) {
    const m = ctx.pickBookMove(node, legaux);
    assert.strictEqual(ctx.moveToABAPRO(m.cells, m.dir, m.type), 'g7f7');
  }
  // et la position ne bouge pas pendant ces verifications
  assert.strictEqual(ctx._repKeyOf(ctx.board), ctx._repKeyOf(ctx.boardSnapshots[2].board));
}));

test('v2.60 recherche : un coup qui remet mes billes comme avant mon coup precedent coute 140, puis 560 si je recommence', () => _bac55(() => {
  const cles = () => ctx.boardSnapshots.map(s => ctx._repKeyOf(s.board));
  const W = 'white', scores = (hist) => {
    const r = _filDeCalcul()({ board: ctx.board, capturedByWhite: 0, capturedByBlack: 0, color: W, depth: 1, time: 60000, weights: _POIDS_DEFAUT, hist: hist });
    return new Map(r.metrics.rootsByDepth[1].map(x => [x.key, x.score]));
  };
  const cleCoup = label => { const m = _coup55(W, label); return m.cells.map(c => c.r + ',' + c.c).sort().join('|') + '>' + m.dir.q + ',' + m.dir.r; };
  // h9g8, l'adversaire avance ailleurs : g8h9 serait un aller-retour (la position complete, elle, est nouvelle)
  _poser55('standard', ['c3d3', 'h9g8', 'c4d4']);
  let ref = ctx._allerRetourRef(cles(), W);
  assert.strictEqual(ref.n, 1);
  let sans = scores([]), avec = scores(cles());
  const ar = cleCoup('g8h9');
  assert.ok(sans.has(ar));
  for (const [k, v] of sans) assert.strictEqual(avec.get(k), k === ar ? v - 140 : v, k);
  // deuxieme aller-retour de suite : 140 x 2 x 2
  _poser55('standard', ['c3d3', 'h9g8', 'c4d4', 'g8h9', 'c5d5']);
  ref = ctx._allerRetourRef(cles(), W);
  assert.strictEqual(ref.n, 2);
  sans = scores([]); avec = scores(cles());
  const ar2 = cleCoup('h9g8');
  for (const [k, v] of sans) assert.strictEqual(avec.get(k), k === ar2 ? v - 560 : v, k);
  // la page (recherche sans fil de calcul) suit la meme regle que le fil de calcul
  const w = _filDeCalcul(true).w;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(w._allerRetourRef(cles(), W))), JSON.parse(JSON.stringify(ref)));
  // trop peu d'historique : rien
  assert.strictEqual(ctx._allerRetourRef(cles().slice(0, 2), W), null);
  // au quatrieme aller-retour de suite, toujours 140 x 3 x 3 = 1260 : jamais le prix d'une bille (~2000)
  _poser55('standard', ['c3d3', 'h9g8', 'c4d4', 'g8h9', 'c5d5', 'h9g8', 'b2c2', 'g8h9', 'b3c3']);
  ref = ctx._allerRetourRef(cles(), W);
  assert.strictEqual(ref.n, 3);
  assert.deepStrictEqual(JSON.parse(JSON.stringify(w._allerRetourRef(cles(), W))), JSON.parse(JSON.stringify(ref)));
  sans = scores([]); avec = scores(cles());
  const ar3 = cleCoup('h9g8');
  for (const [k, v] of sans) assert.strictEqual(avec.get(k), k === ar3 ? v - 1260 : v, k);
}));

test('v2.60 recherche coupée par le temps : jamais pire que le meilleur coup de la profondeur précédente', async () => {
  assert.ok(await ctx.ensureGameBanks());
  // le vrai fil de calcul, avec une horloge factice : chaque lecture avance d'un cran,
  // donc la coupure tombe toujours au meme endroit (avant : a 2 crans pres, e8e7 au lieu de h9h8, -1952)
  let tic = 0, recu = null;
  const Horloge = function () { return new Date(); }; Horloge.now = () => ++tic;
  const w = { console, Date: Horloge, Math, JSON, Map, Set, Object, Array, Number, String, Infinity, isFinite, parseInt, Uint8Array, Int8Array, Float32Array, Int32Array, Uint32Array, DataView, ArrayBuffer,
              navigator: { deviceMemory: 4 }, atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64') };
  w.self = w; require('vm').createContext(w); require('vm').runInContext(ctx.AI_WORKER_CODE, w);
  w.self.postMessage = m => { recu = m; };
  const chercher = p => { recu = null; w.self.onmessage({ data: p }); return recu; };
  const cle = m => m.cells.map(c => c.r + ',' + c.c).sort().join('|') + '>' + m.dir.q + ',' + m.dir.r;
  let coupees = 0;
  _bac55(() => {
    for (const [g, n] of [[5, 10], [77, 20]]) {
      const col = _poser55('belgian', _jetons55(ctx.MIGS_GAMES[g][5]).slice(0, n));
      const base = { board: ctx.board, capturedByWhite: ctx.CapturedByWhite.get(), capturedByBlack: ctx.CapturedByBlack.get(), color: col, weights: _POIDS_DEFAUT, hist: ctx._gameHistKeys() };
      const ref = chercher(Object.assign({}, base, { depth: 3, time: 1e12 }));
      const s3 = new Map(ref.metrics.rootsByDepth[3].map(x => [x.key, x.score]));
      const pv2 = cle(chercher(Object.assign({}, base, { depth: 2, time: 1e12 })).move);
      for (const extra of [2, 6, 12]) {
        const r = chercher(Object.assign({}, base, { depth: 3, time: ref.metrics.depthInfo[2].fin + extra }));
        if (r.metrics.depth !== 3 || r.metrics.rootsByDepth[3]) continue;   // pas coupee pendant la profondeur 3
        coupees++;
        assert.ok(s3.get(cle(r.move)) >= s3.get(pv2), 'partie ' + g + ' apres ' + n + ', +' + extra + ' : ' + s3.get(cle(r.move)) + ' < ' + s3.get(pv2));
      }
    }
  });
  assert.ok(coupees >= 4, coupees + ' recherches coupees');
});

// ═══════════════════════════════════════════
// 56. v2.61 : apprendre sur un vrai plateau (a partir de 3 ans depuis v2.62, sans ecran)
// ═══════════════════════════════════════════
async function _vp56(lang, fn) {
  const avant = ctx.localStorage.getItem('abalone_lang'), carnet = ctx.localStorage.getItem('abaPlateauCarnet');
  ctx.localStorage.setItem('abalone_lang', lang);
  ctx.localStorage.removeItem('abaPlateauCarnet');
  try { return await _dom54(fn); } finally {
    if (avant === null) ctx.localStorage.removeItem('abalone_lang'); else ctx.localStorage.setItem('abalone_lang', avant);
    if (carnet === null) ctx.localStorage.removeItem('abaPlateauCarnet'); else ctx.localStorage.setItem('abaPlateauCarnet', carnet);
  }
}
// le morceau de page d'une etape
const _carte56 = (h, n) => { const i = h.indexOf('id="vp-etape-' + n + '"'); assert.ok(i > 0, 'etape ' + n); const j = h.indexOf('</section>', i); return h.slice(i, j); };
const _billes56 = (h, c) => (h.match(new RegExp('data-bille="' + c + '"', 'g')) || []).length;

test('v2.61 vrai plateau : page, entrée du menu (Progresser), dessin à l’ouverture, impression, aide FR et EN', () => {
  const src = _SRC();
  assert.match(src, /<div class="page" id="page-plateau">[\s\S]{0,400}<h2>Apprendre sur un vrai plateau<\/h2>[\s\S]{0,200}id="plateau-corps"/);
  const prog = src.slice(src.indexOf('<div class="sidebar-group-label">📖 Progresser</div>'), src.indexOf('<div class="sidebar-group-label">🧪 Explorer</div>'));
  assert.match(prog, /id="sid-plateau" onclick="sidebarNav\('plateau',this\)">\s*<span class="s-icon">🧸<\/span><span class="s-label">Sur un vrai plateau<\/span>/);
  assert.ok(src.indexOf("plateau:    function(){ if (typeof renderPlateauPage === 'function') renderPlateauPage(); }") > 0, 'dessinee a l ouverture');
  assert.ok(src.indexOf("if (pp && pp.classList.contains('active') && typeof renderPlateauPage === 'function') renderPlateauPage();") > 0, 'redessinee au changement de langue');
  assert.ok(src.indexOf('#page-plateau, #page-plateau * { visibility:visible; }') > 0, 'fiche imprimable');
  assert.strictEqual(ctx.I18N_EN['Sur un vrai plateau'], 'On a real board');
  assert.strictEqual(ctx.I18N_EN['Apprendre sur un vrai plateau'], 'Learning on a real board');
  const aide = src.slice(src.indexOf('<div class="page" id="page-aide">'), src.indexOf('<div class="page" id="page-mentions">'));
  assert.ok(aide.indexOf('<li><b>Sur un vrai plateau</b> : apprendre Abalone aux enfants à partir de 3 ans, sans écran') > 0);
  assert.ok(aide.indexOf('<li><b>On a real board</b>: teaching Abalone to children from age 3, screen-free') > 0);
  assert.match(src, /<div class="page" id="page-plateau">\s*<div class="page-header"[^>]*>\s*<div class="section-label">À partir de 3 ans · en famille, sans écran<\/div>/);
  assert.strictEqual(ctx.I18N_EN['À partir de 3 ans · en famille, sans écran'], 'From age 3 · as a family, screen-free');
});

test('v2.61 vrai plateau : sécurité d’abord, 8 étapes dans l’ordre, chacune avec son schéma, « acquis quand » et « si ça coince »', () => _vp56('FR', async els => {
  ctx.renderPlateauPage();
  const h = els['plateau-corps'].innerHTML;
  // la securite vient avant tout le reste
  const sec = h.indexOf('id="vp-securite"');
  assert.ok(sec > 0 && sec < h.indexOf('Les règles d’or') && sec < h.indexOf('id="vp-etape-1"'));
  ['Pour apprendre Abalone aux enfants <b>à partir de 3 ans</b> (pas avant', '<b>À partir de 3 ans, pas avant.</b>', 'rouleau de papier toilette vide', '4,4 cm',
   '(14 noires + 14 blanches = 28)', '<b>Un plus petit de moins de 3 ans à la maison ?</b> Il ne joue pas encore']
    .forEach(t => assert.ok(h.indexOf(t) > 0, t));
  ['https://www.canada.ca/fr/sante-canada/services/securite-jouets/petites-pieces-jouets.html', 'https://www.inspq.qc.ca/mieux-vivre/enfant/securite/prevenir-etouffements',
   'https://www.cpsc.gov/s3fs-public/pdfs/blk_media_cspa.pdf'].forEach(u => assert.ok(h.indexOf('href="' + u + '" target="_blank" rel="noopener"') > 0, u));
  assert.strictEqual((h.match(/<div class="vp-regle">/g) || []).length, 9 + 3, '9 regles d or + 3 habitudes');
  const titres = ['Une bille par maison', 'Un petit pas', 'Chacun son tour', 'Le petit train', 'Le plus fort pousse', 'Plouf !', 'La mini-partie', 'La vraie partie'];
  let avant = 0;
  titres.forEach((t, i) => {
    const c = _carte56(h, i + 1);
    assert.ok(h.indexOf('id="vp-etape-' + (i + 1) + '"') > avant); avant = h.indexOf('id="vp-etape-' + (i + 1) + '"');
    assert.ok(c.indexOf(t) > 0, t);
    assert.ok(c.indexOf('<svg') > 0 && c.indexOf('role="img" aria-label="') > 0, 'schema decrit : ' + t);
    assert.ok(c.indexOf('<b>C’est acquis quand</b>') > 0 && c.indexOf('<b>Si ça coince</b> : ') > 0, t);
  });
  assert.strictEqual((h.match(/<section class="vp-carte"/g) || []).length, 8);
  assert.strictEqual((h.match(/<svg /g) || []).length, 10, '8 schemas, dont 3 lignes pour « le plus fort pousse »');
  // les poussees : 2 contre 1 et 3 contre 2 passent, 2 contre 2 bloque
  const c5 = _carte56(h, 5);
  assert.deepStrictEqual((c5.match(/[✓✗]<\/text>/g) || []).map(x => x[0]), ['✓', '✓', '✗']);
  // un seul bon age sur la boite : 6 ou 7 ans, pas 3
  assert.ok(h.indexOf('la boîte indique « à partir de 6 ou 7 ans »') > 0);
  // v2.62 : rien avant 3 ans -- ni age plus bas, ni plateau geant pour les moins de 3 ans ; chaque etape a 3 ans ou plus
  ['2 ans', 'géant', 'tout-petits', 'objets géants'].forEach(t => assert.strictEqual(h.indexOf(t), -1, 'reste d avant 3 ans : ' + t));
  titres.forEach((t, i) => {
    const age = /<span class="vp-age">([^<]*)<\/span>/.exec(_carte56(h, i + 1))[1], n = +(age.match(/\d+/) || [0])[0];
    assert.ok(n >= 3, 'etape ' + (i + 1) + ' : ' + age);
  });
  assert.strictEqual(/<span class="vp-age">([^<]*)<\/span>/.exec(_carte56(h, 1))[1], 'dès 3 ans');
}));

test('v2.61 vrai plateau : les schémas des étapes 7 et 8 sont les dispositions du moteur (Découverte = Mode Enfant, classique)', () => _vp56('FR', async els => {
  ctx.renderPlateauPage();
  const h = els['plateau-corps'].innerHTML, c7 = _carte56(h, 7), c8 = _carte56(h, 8);
  assert.strictEqual(ctx.LAYOUTS.decouverte.black.length, 7);
  assert.strictEqual(_billes56(c7, 'b'), 7); assert.strictEqual(_billes56(c7, 'w'), 7);
  assert.strictEqual(_billes56(c8, 'b'), 14); assert.strictEqual(_billes56(c8, 'w'), 14);
  // 61 trous sur le vrai plateau, 19 sur le petit
  const trous = c => (c.match(/fill="rgba\(92,58,22,0\.30\)"/g) || []).length;
  assert.strictEqual(trous(c7), 61); assert.strictEqual(trous(c8), 61); assert.strictEqual(trous(_carte56(h, 1)), 19);
  // dessin identique d'une fois sur l'autre (identifiants de degrades remis a zero)
  const premier = h; ctx.renderPlateauPage(); assert.strictEqual(els['plateau-corps'].innerHTML, premier);
}));

test('v2.61 vrai plateau : schémas justes -- tout tient dans le cadre, les 6 flèches de « un petit pas » visent les 6 cases voisines', () => _vp56('FR', async els => {
  ctx.renderPlateauPage();
  const h = els['plateau-corps'].innerHTML;
  (h.match(/<svg [\s\S]*?<\/svg>/g) || []).forEach((svg, k) => {
    const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg), W = +vb[1], H = +vb[2];
    for (const m of svg.matchAll(/<circle cx="([\d.-]+)" cy="([\d.-]+)" r="([\d.]+)"/g)) {
      const x = +m[1], y = +m[2], r = +m[3];
      assert.ok(x - r >= 0 && x + r <= W && y - r >= 0 && y + r <= H, 'schema ' + k + ' : cercle hors cadre ' + m[0]);
    }
  });
  const c2 = _carte56(h, 2);
  const fantomes = [...c2.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="13" fill="none"/g)].map(m => [+m[1], +m[2]]);
  const pointes = [...c2.matchAll(/<path d="M[\d.]+,[\d.]+ L([\d.]+),([\d.]+)" stroke="#1d5fa8"/g)].map(m => [+m[1], +m[2]]);
  assert.strictEqual(fantomes.length, 6); assert.strictEqual(pointes.length, 6);
  const centre = [...c2.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="13" fill="url/g)].map(m => [+m[1], +m[2]]);
  assert.strictEqual(centre.length, 1);
  fantomes.forEach(f => {
    assert.ok(pointes.some(p => Math.hypot(p[0] - f[0], p[1] - f[1]) < 4), 'une fleche vise ' + f);
    // une case voisine : a une distance d'un pas exactement, la meme pour les 6
    assert.ok(Math.abs(Math.hypot(f[0] - centre[0][0], f[1] - centre[0][1]) - 13 * 2.85) < 0.2);
  });
}));

test('v2.61 vrai plateau : en anglais, tout le texte de la page est anglais (ponctuation anglaise comprise)', () => _vp56('EN', async els => {
  ctx.renderPlateauPage();
  const h = els['plateau-corps'].innerHTML;
  ['Safety first', 'A little one under 3 at home?', 'One marble per house', 'The stronger one pushes', 'Splash!', 'Where are they up to?', 'Child 1', 'Next step: ',
   '<b>Aim</b>: ', '<b>If it’s not working</b>: ', 'Sources for the safety box: '].forEach(t => assert.ok(h.indexOf(t) > 0, t));
  ['Sécurité', 'Une bille par maison', 'Prochaine étape', 'Enfant 1', 'C’est acquis', 'Si ça coince', ' : '].forEach(t => assert.strictEqual(h.indexOf(t), -1, 'francais oublie : ' + t));
  ['age 2', '2½', 'giant', 'toddler'].forEach(t => assert.strictEqual(h.indexOf(t), -1, 'reste d avant 3 ans : ' + t));
  assert.ok(h.indexOf('<b>From age 3, not before.</b>') > 0 && h.indexOf('children <b>from age 3</b>') > 0);
}));

test('v2.61 vrai plateau : carnet de progrès sur l’appareil -- étoiles datées, prénoms échappés, 1 à 4 enfants, données abîmées ignorées', () => _vp56('FR', async els => {
  const lire = () => JSON.parse(ctx.localStorage.getItem('abaPlateauCarnet'));
  // rien d'enregistre : deux enfants vides
  ctx.renderPlateauPage();
  assert.strictEqual((els['plateau-corps'].innerHTML.match(/class="vp-enfant"/g) || []).length, 2);
  assert.ok(els['plateau-corps'].innerHTML.indexOf('placeholder="Enfant 2"') > 0);
  // une etoile : la date du jour, retiree au second appui
  ctx.vpBasculerAcquis(0, 3);
  const d = new Date(), jour = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  assert.deepStrictEqual(lire().enfants[0].acquis, { 3: jour });
  assert.ok(els['vp-carnet'].innerHTML.indexOf('aria-pressed="true"') > 0);
  assert.ok(els['vp-carnet'].innerHTML.indexOf('Prochaine étape : <a href="#" onclick="vpAller(1);return false;">1 · 🏠 Une bille par maison</a>') > 0, 'la premiere non acquise');
  ctx.vpBasculerAcquis(0, 3);
  assert.deepStrictEqual(lire().enfants[0].acquis, {});
  ctx.vpBasculerAcquis(0, 9); ctx.vpBasculerAcquis(7, 1);
  assert.deepStrictEqual(lire().enfants[0].acquis, {}, 'etape ou enfant inexistant : rien');
  // un prenom n'est jamais du HTML
  ctx.vpRenommer(1, '<img src=x onerror=a()>"');
  assert.strictEqual(lire().enfants[1].nom, '<img src=x onerror=a()>"');
  ctx.vpRenommer(0, 'x'.repeat(40)); assert.strictEqual(lire().enfants[0].nom.length, 24, '24 caracteres au plus');
  ctx._vpCarnetRafraichir();
  assert.strictEqual(els['vp-carnet'].innerHTML.indexOf('<img'), -1);
  assert.ok(els['vp-carnet'].innerHTML.indexOf('value="&lt;img src=x onerror=a()&gt;&quot;"') > 0);
  // 4 enfants au plus, toujours au moins 1
  for (let i = 0; i < 5; i++) ctx.vpAjouterEnfant();
  assert.strictEqual(lire().enfants.length, 4);
  assert.strictEqual(els['vp-carnet'].innerHTML.indexOf('Ajouter un enfant'), -1);
  for (let i = 0; i < 6; i++) ctx.vpRetirerEnfant(0);
  assert.strictEqual(lire().enfants.length, 1);
  assert.strictEqual(els['vp-carnet'].innerHTML.indexOf('vpRetirerEnfant'), -1, 'pas de bouton pour retirer le dernier');
  // donnees abimees : ignorees sans planter
  ctx.localStorage.setItem('abaPlateauCarnet', '{pas du json');
  assert.strictEqual(ctx._vpCarnetLire().enfants.length, 2);
  ctx.localStorage.setItem('abaPlateauCarnet', JSON.stringify({ enfants: [{ nom: 'Alex', acquis: { 2: '2026-10-17', 9: '2026-10-17', x: 1, 4: 5 } }] }));
  assert.deepStrictEqual(JSON.parse(JSON.stringify(ctx._vpCarnetLire().enfants)), [{ nom: 'Alex', acquis: { 2: '2026-10-17' } }]);
}));

// ═══════════════════════════════════════════
// 57. v2.63 : les billes qui tombent, ce qui fait gagner, comment jouent les vrais joueurs
// ═══════════════════════════════════════════
const _r57 = code => require('vm').runInContext(code, ctx);
async function _charger57() {
  assert.ok(await ctx.ensureGameBanks(), 'banques de parties');
  assert.ok(await ctx.ensureStatsParties(), 'evenements des parties (STATS_PARTIES_B64)');
  return _r57('STATS_PARTIES');
}
// rang dans les donnees embarquees de la partie i de la source src
const _rang57 = (src, i) => ctx._sbBanques().slice(0, src).reduce((a, b) => a + b.length, 0) + i;
// une partie MIGS au format d'import, du cote de « Alex »
const _texte57 = (g, gagnant, alexNoir) => '# 2026-10-01 · Belgian Daisy · ' + (gagnant === 1 ? 'Noir gagne' : 'Blanc gagne') + ' (6 éjections) · '
  + (alexNoir ? 'Alex vs Bob' : 'Bob vs Alex') + '\n' + g[5];

test('v2.63 événements des parties : signature à jour (sinon : node tools/build.js && node tools/stats-parties.js && node tools/build.js), toutes les parties, mêmes dimensions', async () => {
  const D = await _charger57();
  assert.strictEqual(D.v, 1);
  assert.strictEqual(D.sig, ctx._sbSignature(), 'parties embarquees modifiees : relancer tools/stats-parties.js');
  const B = ctx._sbBanques();
  assert.deepStrictEqual(Array.from(D.nb), Array.from(B, b => b.length));
  assert.strictEqual(D.p.length, B.reduce((a, b) => a + b.length, 0));
  assert.deepStrictEqual(Array.from(D.etapes), [20, 40, 60]);
  assert.deepStrictEqual(Array.from(D.champs), Array.from(_r57('EMPREINTES_CHAMPS')));
  // chaque partie : vainqueur connu ou non, demi-coups, ejections par paires, 8 compteurs par camp
  D.p.forEach((p, k) => {
    assert.ok([0, 1, 2, 3].includes(p[0]) && p[1] >= 0 && (p[2] === 0 || p[2] === 1) && D.dispos[p[3]], 'partie ' + k);
    assert.ok(p[4].length % 2 === 0 && p[4].length <= 22 && p[5].length === 8 && p[6].length === 8, 'partie ' + k);
    for (let i = 0; i < p[4].length; i += 2) assert.ok(p[4][i] >= 1 && p[4][i] <= p[1] && (p[4][i + 1] >> 1) < 61, 'ejection lisible, partie ' + k);
  });
});

test('v2.63 événements : un échantillon de vraies parties, rejouées ici, redonne exactement les données embarquées', async () => {
  const D = await _charger57();
  const B = ctx._sbBanques(), avant = JSON.stringify(ctx.board);
  const echantillon = [[0, 0], [0, 1], [0, 2], [0, 777], [0, 1500], [0, 2588], [1, 0], [1, 5], [1, 100], [1, 1000], [1, 1889], [2, 0], [2, 46], [2, 92], [3, 0], [3, 2], [3, 6]];
  for (const [src, i] of echantillon) {
    const g = B[src][i], rec = ctx._sbRejouerPartie(src, g, true);
    const enc = JSON.parse(JSON.stringify(ctx._sbEncoder(rec, D.dispos.indexOf(ctx._sbDispo(src, g)))));
    assert.deepStrictEqual(enc, JSON.parse(JSON.stringify(D.p[_rang57(src, i)])), ['MIGS', 'AO', 'PS', 'REF'][src] + ' ' + i);
  }
  assert.strictEqual(JSON.stringify(ctx.board), avant, 'le rejeu ne touche pas au plateau du jeu');
  // les deux facons de lire un coup donnent le meme coup (liste des coups legaux fournie ou non)
  const { poserDisposition } = require('./harness'); poserDisposition(ctx, 'belgian');
  const legal = ctx.getAllMovesForColor('black');
  ['i9h8', 'a1b1', 'h8g7', 'a5b5'].forEach(t => assert.strictEqual(JSON.stringify(ctx.resolveAbaProToken(t, 'black', legal)), JSON.stringify(ctx.resolveAbaProToken(t, 'black')), t));
});

test('v2.63 additions : sur des parties construites à la main, chaque chiffre est le bon', async () => {
  await _charger57();
  const vrai = _r57('STATS_PARTIES'), C = Array.from(_r57('EMPREINTES_CHAMPS'));
  const z = () => [0, 0, 0, 0, 0, 0, 0, 0];
  const faux = { v: 1, sig: 'test', nb: [], etapes: [20, 40, 60], champs: C, dispos: ['belgian', 'standard'], p: [
    // Noirs gagnent ; Noirs ejectent en premier (case 0), Blancs (case 60), Noirs (case 4)
    [1, 30, 1, 0, [10, 1, 15, 120, 20, 9], [1, 2, 3, 4, 5, 6, 7, 8], [1, 1, 1, 1, 1, 1, 1, 1], ['+-=+-=+-=+-=', '', '++++++++++++']],
    // Blancs gagnent 6-2 : billes noires aux cases 5, 11, 17, 26, 35, 42 ; blanches aux cases 6 et 25
    [2, 30, 1, 1, [5, 10, 9, 13, 12, 22, 14, 34, 20, 51, 22, 52, 25, 70, 30, 84], z(), z(), 0],
    // partie commencee sur une position de probleme : jamais comptee
    [1, 4, 0, 0, [1, 1, 2, 3], [9, 9, 9, 9, 9, 9, 9, 9], z(), 0],
    // vainqueur inconnu : compte pour « quand » et la carte, pas pour les remontees
    [0, 8, 1, 0, [3, 1], z(), z(), 0],
    // nulle sans ejection
    [3, 50, 1, 0, [], z(), z(), 0]
  ] };
  try {
    _r57('STATS_PARTIES = ' + JSON.stringify(faux) + '; _sbCache = null;');
    const v = JSON.parse(JSON.stringify(ctx._sbAgreger()));
    assert.strictEqual(v.nParties, 5); assert.strictEqual(v.nComplets, 4); assert.strictEqual(v.nDecides, 2); assert.strictEqual(v.nAvecEj, 3);
    assert.deepStrictEqual(v.premiere, { n: 2, gagne: 2 });
    assert.deepStrictEqual(v.quand, [3, 5, 10]);
    assert.deepStrictEqual(v.remontees, { '1-0': { n: 2, g: 2 }, '2-1': { n: 2, g: 2 }, '3-1': { n: 1, g: 1 }, '3-2': { n: 1, g: 1 }, '4-2': { n: 1, g: 1 }, '5-2': { n: 1, g: 1 } });
    assert.deepStrictEqual(v.finals, [0, 0, 1, 0, 0, 0]);
    // la carte : vue du joueur qui perd la bille (bille blanche -> plateau retourne : case i -> 60 - i)
    const carte = (pairs) => { const c = new Array(61).fill(0); pairs.forEach(([i, n]) => { c[i] = n; }); return c; };
    assert.deepStrictEqual(v.cartes.belgian, carte([[60, 3], [56, 1]]));
    assert.deepStrictEqual(v.cartes.standard, carte([[5, 1], [11, 1], [17, 1], [26, 1], [35, 2], [42, 1], [54, 1]]));
    assert.deepStrictEqual(v.cartes['*'], carte([[60, 3], [56, 1], [5, 1], [11, 1], [17, 1], [26, 1], [35, 2], [42, 1], [54, 1]]));
    assert.deepStrictEqual(v.types, [2, 3, 4, 5, 6, 7, 8, 9]);
    assert.deepStrictEqual(v.camp, { ej: 12, camps: 8, premiereSomme: 42, premiereN: 5, phases: { ouverture: 3, milieu: 5, finale: 4 } });
    assert.deepStrictEqual(v.nDimsParties, [1, 0, 1]);
    v.dims[0].forEach((t, j) => assert.deepStrictEqual(t, [{ n: 1, g: 1 }, { n: 1, g: 0 }, { n: 0, g: 0 }][j % 3], 'dimension ' + j));
    v.dims[2].forEach(t => assert.deepStrictEqual(t, { n: 1, g: 1 }));
    assert.strictEqual(ctx._sbTauxRemontee(1, 0), null, 'moins de 30 parties : pas de taux');
  } finally {
    require('vm').runInContext('STATS_PARTIES = __sbVrai; _sbCache = null;', Object.assign(ctx, { __sbVrai: vrai }));
  }
});

test('v2.63 page Statistiques du jeu : les trois sections, leurs chiffres viennent des additions, en français et en anglais', async () => {
  await _charger57();
  const v = ctx._sbAgreger();
  const nb = x => Number(x).toLocaleString('fr-FR');
  await _enFrancais54(() => _dom54(async () => {
    const h = ctx._sbHtmlBilles(v);
    ['Les billes qui tombent', 'Qui fait tomber la première bille gagne-t-il ?', 'À quel coup tombent les billes', 'Le tableau des remontées', 'Le score final', 'La carte des éjections']
      .forEach(t => assert.ok(h.indexOf(t) > 0, t));
    assert.ok(h.indexOf(String(Math.round(v.premiere.gagne / v.premiere.n * 100))) > 0, 'le pourcentage de la premiere bille');
    assert.ok(h.indexOf('Sur ' + nb(v.premiere.n) + ' parties dont on connaît le vainqueur') > 0);
    assert.ok(h.indexOf('<b>' + nb(v.nComplets) + ' parties</b>') > 0);
    assert.ok(h.indexOf('id="sb-histo"') > 0 && h.indexOf('id="sb-score"') > 0);
    assert.strictEqual((h.match(/class="sb-g-case"/g) || []).length, 15, '15 scores du tableau des remontees, tous a 30 parties ou plus');
    assert.ok(h.indexOf('<b>coup ' + ctx._sbMediane(v.quand) + '</b>') > 0, 'la mediane');
    assert.doesNotMatch(h, /NaN|undefined|Infinity/);
    const g = ctx._sbHtmlGagner(v);
    assert.ok(g.indexOf('Ce qui fait gagner') > 0 && g.indexOf('Au 40ᵉ coup') > 0);
    assert.strictEqual((g.match(/class="sb-div-l"/g) || []).length, 12, 'les 12 dimensions');
    assert.doesNotMatch(g, /NaN|undefined/);
    // triees de la plus parlante a la moins parlante
    const pcts = [...g.matchAll(/class="sb-div-val" role="cell">([\d,]+) %/g)].map(m => Math.abs(parseFloat(m[1].replace(',', '.')) - 50));
    assert.strictEqual(pcts.length, 12);
    for (let i = 1; i < pcts.length; i++) assert.ok(pcts[i] <= pcts[i - 1] + 1, 'tri : ' + pcts.join(' '));
    const j = ctx._sbHtmlJeu(v);
    ['1 bille', '2 billes en ligne', '3 billes en ligne', '2 billes de côté', '3 billes de côté'].forEach(t => assert.ok(j.indexOf('<span class="sb-hb-nom">' + t + '</span>') > 0, t));
    assert.strictEqual((j.match(/class="sb-tuile"/g) || []).length, 3);
    assert.doesNotMatch(j, /NaN|undefined/);
  }));
  const avant = ctx.localStorage.getItem('abalone_lang');
  ctx.localStorage.setItem('abalone_lang', 'EN');
  try {
    await _dom54(async () => {
      const t = ctx._sbHtmlBilles(v) + ctx._sbHtmlGagner(v) + ctx._sbHtmlJeu(v);
      ['Falling marbles', 'When the marbles fall', 'The comeback table', 'What wins games', 'How real players play', 'The ejection map'].forEach(x => assert.ok(t.indexOf(x) > 0, x));
      ['Les billes', 'parties dont', 'Au 40ᵉ coup', 'billes en ligne', 'remontées'].forEach(x => assert.strictEqual(t.indexOf(x), -1, 'francais oublie : ' + x));
    });
  } finally { if (avant === null) ctx.localStorage.removeItem('abalone_lang'); else ctx.localStorage.setItem('abalone_lang', avant); }
});

test('v2.63 Mes statistiques : tes remontées, tes billes tombées et tes coups, comptés comme dans le corpus', async () => {
  const D = await _charger57();
  const M = ctx.MIGS_GAMES;
  // trois parties MIGS « Au score » : Alex aux Noirs, aux Blancs, aux Noirs
  const idx = []; for (let i = 0; i < M.length && idx.length < 3; i++) if (M[i][4] === 'Au score' && [1, 2].includes(D.p[i][0])) idx.push(i);
  const texte = idx.map((i, k) => _texte57(M[i], D.p[i][0], k !== 1)).join('\n');
  const entrees = ctx._parseBulkHistoryText(texte, 'Alex').map(r => { assert.ok(r.ok); return r.entry; });
  const sauve = ctx.localStorage.getItem(ctx.GAME_HISTORY_KEY);
  try {
    ctx.localStorage.setItem(ctx.GAME_HISTORY_KEY, JSON.stringify(entrees));
    const s = JSON.parse(JSON.stringify(ctx.computeEjectionStats()));
    // attendu, depuis les evenements embarques des memes parties
    const carte = new Array(61).fill(0), sortes = [0, 0, 0, 0, 0, 0, 0, 0], prem = { perdue: { n: 0, g: 0 }, faite: { n: 0, g: 0 } };
    idx.forEach((i, k) => {
      const p = D.p[i], alexNoir = k !== 1, alex = alexNoir ? 1 : 2;
      (alexNoir ? p[5] : p[6]).forEach((x, j) => { sortes[j] += x; });
      for (let e = 0; e < p[4].length; e += 2) {
        const code = p[4][e + 1], blancheTombe = code & 1, c = code >> 1;
        if (alexNoir && !blancheTombe) carte[c]++;
        if (!alexNoir && blancheTombe) carte[60 - c]++;   // aux Blancs : vue de son cote, plateau retourne
      }
      if (p[4].length) {
        const premier = (p[4][1] & 1) ? 1 : 2, b = premier === alex ? prem.faite : prem.perdue;
        b.n++; if (p[0] === alex) b.g++;
      }
    });
    assert.deepStrictEqual(s.carteSubies, carte);
    assert.deepStrictEqual(s.sortes, sortes);
    assert.deepStrictEqual(s.premiere, prem);
    assert.strictEqual(s.realisees, sortes[6]); assert.strictEqual(s.opportunites, sortes[7]);
    // la carte Ejections : les trois blocs, avec les chiffres des vrais joueurs
    await _enFrancais54(() => _dom54(async els => {
      ctx.renderEjectionStats();
      const h = els['ejection-stats-personal'].innerHTML;
      ['Tes remontées', 'Toi face aux vrais joueurs', 'Où tombent tes billes', 'Victoires après avoir perdu la 1ʳᵉ bille', 'Occasions d’éjection saisies'].forEach(t => assert.ok(h.indexOf(t) > 0, t));
      assert.doesNotMatch(h, /NaN|undefined|…/);
      const v = ctx._sbAgreger();
      assert.ok(h.indexOf(ctx._dimDec(v.camp.ej / v.camp.camps, 2)) > 0, 'ejections par partie des vrais joueurs');
    }));
  } finally { if (sauve === null) ctx.localStorage.removeItem(ctx.GAME_HISTORY_KEY); else ctx.localStorage.setItem(ctx.GAME_HISTORY_KEY, sauve); }
});

test('v2.63 fin de partie : une ligne tirée des vraies parties (remontée, avance perdue, première bille), jamais en mode Enfant', async () => {
  await _charger57();
  const t31 = ctx._sbTauxRemontee(3, 1), p = ctx._sbAgreger().premiere;
  const pct = x => ctx._dimPct(x).replace(' %', ' %');
  // [billes tombees chez les Blancs (= score des Noirs), chez les Noirs (= score des Blancs)] apres chaque coup
  const poser = suite => { ctx.boardSnapshots = suite.map(([n, b], i) => ({ board: {}, capturedByBlack: n, capturedByWhite: b, moveCount: i + 1 })); };
  const avantLang = ctx.localStorage.getItem('abalone_lang'), avantKids = ctx.kidsMode, avantSnaps = ctx.boardSnapshots;
  ctx.localStorage.setItem('abalone_lang', 'FR');
  try {
    ctx.kidsMode = false;
    // les Blancs, menes 1 a 3, gagnent 6-3
    poser([[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2], [3, 3], [3, 4], [3, 5], [3, 6]]);
    assert.strictEqual(ctx._sbRepereFinDePartie('white', 'white', false), 'Belle remontée ! Vous étiez mené 1 à 3. Dans les vraies parties, le camp mené 1 à 3 ne gagne que ' + pct(100 - t31.pct) + ' du temps.');
    assert.strictEqual(ctx._sbRepereFinDePartie('white', 'black', false), 'Vous meniez 3 à 1. Dans les vraies parties, celui qui mène 3 à 1 gagne ' + pct(t31.pct) + ' du temps : l’adversaire a réussi une remontée rare.');
    assert.strictEqual(ctx._sbRepereFinDePartie('white', 'black', true), 'Les Blancs ont remonté un retard de 1 à 3. Dans les vraies parties, le camp mené 1 à 3 ne gagne que ' + pct(100 - t31.pct) + ' du temps.');
    // les Noirs menent de bout en bout
    poser([[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1]]);
    assert.strictEqual(ctx._sbRepereFinDePartie('black', 'black', false), 'Vous avez fait tomber la première bille. Dans les vraies parties, le camp qui fait tomber la première bille gagne ' + pct(p.gagne / p.n * 100) + ' du temps.');
    assert.strictEqual(ctx._sbRepereFinDePartie('black', 'white', false), 'L’adversaire a fait tomber la première bille. Dans les vraies parties, le camp qui fait tomber la première bille gagne ' + pct(p.gagne / p.n * 100) + ' du temps.');
    // rien a dire : aucune bille tombee, partie commencee avec un score, mode Enfant
    poser([[0, 0], [0, 0], [0, 0]]);
    assert.strictEqual(ctx._sbRepereFinDePartie('black', 'black', false), '');
    poser([[3, 2], [4, 2], [5, 2], [6, 2]]);
    assert.strictEqual(ctx._sbRepereFinDePartie('black', 'black', false), '');
    poser([[0, 0], [1, 0], [2, 0], [6, 0]]);
    ctx.kidsMode = true;
    assert.strictEqual(ctx._sbRepereFinDePartie('black', 'black', false), '');
  } finally {
    ctx.kidsMode = avantKids; ctx.boardSnapshots = avantSnaps;
    if (avantLang === null) ctx.localStorage.removeItem('abalone_lang'); else ctx.localStorage.setItem('abalone_lang', avantLang);
  }
  // l'ecran de fin de partie a sa place pour cette ligne
  assert.match(_SRC(), /<div class="win-sub" id="win-sub">[^<]*<\/div>\s*<!--[^>]*-->\s*<div class="win-repere" id="win-repere" aria-live="polite"><\/div>/);
});

test('v2.63 vainqueurs MIGS : lus dans les événements pré-calculés (plus de minute de rejeu), identiques au rejeu sur un échantillon', async () => {
  const D = await _charger57();
  _r57('_migsWinnersCache = null');
  const W = await ctx.ensureMigsWinners();
  const M = ctx.MIGS_GAMES;
  assert.strictEqual(W.size, M.filter((g, i) => g[4] === 'Au score' && [1, 2].includes(D.p[i][0])).length);
  const { poserDisposition } = require('./harness');
  let vus = 0;
  for (let i = 0; i < M.length && vus < 15; i += 97) {
    if (M[i][4] !== 'Au score') continue;
    poserDisposition(ctx, 'belgian');
    let col = 'black';
    for (const t of M[i][5].replace(/\d+\./g, ' ').trim().split(/\s+/)) {
      const mv = ctx.resolveAbaProToken(t, col); if (!mv) break;
      const info = ctx.validateMove(mv.cells, mv.dir, col); if (!info.valid) break;
      ctx.applyMove({ cells: mv.cells, dir: mv.dir, info: info }, col);
      col = col === 'black' ? 'white' : 'black';
    }
    const attendu = ctx.CapturedByBlack.get() >= 6 ? 'black' : (ctx.CapturedByWhite.get() >= 6 ? 'white' : undefined);
    assert.strictEqual(W.get(i), attendu, 'MIGS ' + i);
    vus++;
  }
  assert.strictEqual(vus, 15);
});

// ═══════════════════════════════════════════
// 58. v2.64 : une adresse par page (#corpus, #regles...)
// ═══════════════════════════════════════════
const _r58 = code => require('vm').runInContext(code, ctx);
// faux historique : chaque adresse ecrite est notee, et location.hash suit
function _historique58() {
  const journal = [];
  const loc = { pathname: '/Abalassembly/', search: '', hash: '', href: 'https://ocj94.github.io/Abalassembly/' };
  const ecrire = (mode) => (s, t, url) => { journal.push([mode, url]); const i = url.indexOf('#'); loc.hash = i >= 0 ? url.slice(i) : ''; loc.href = 'https://ocj94.github.io' + url; };
  return { journal, loc, hist: { pushState: ecrire('push'), replaceState: ecrire('replace') } };
}
async function _avecAdresses58(fn) {
  const sauve = { location: ctx.location, history: ctx.history, page: ctx._adrPageActive, nav: ctx.sidebarNav, show: ctx.showPage, pret: _r58('_adrPret'), lang: ctx.localStorage.getItem('abalone_lang') };
  const h = _historique58();
  ctx.location = h.loc; ctx.history = h.hist; _r58('_adrPret = true');
  ctx.localStorage.setItem('abalone_lang', 'FR');
  try { return await fn(h); } finally {
    ctx.location = sauve.location; ctx.history = sauve.history; ctx._adrPageActive = sauve.page; ctx.sidebarNav = sauve.nav; ctx.showPage = sauve.show;
    _r58('_adrPret = ' + sauve.pret);
    if (sauve.lang === null) ctx.localStorage.removeItem('abalone_lang'); else ctx.localStorage.setItem('abalone_lang', sauve.lang);
  }
}

test('v2.64 adresses : chaque entrée du menu et chaque page ont la leur, unique, sans accent, en français et en anglais', () => {
  const src = _SRC(), T = Array.from(_r58('ADRESSES_PAGES'), l => Array.from(l));
  const pages = [...src.matchAll(/<div class="page[^"]*" id="page-([a-z0-9_-]+)"/g)].map(m => m[1]);
  assert.ok(pages.length >= 35);
  pages.forEach(p => assert.ok(T.some(l => l[0] === p), 'page sans adresse : ' + p));
  // le menu : pages (sidebarNav / showPage) et fenetres (Importer, Bibliotheque, Fiche pour IA, Labo)
  const debut = src.indexOf('<div class="sidebar-group-label">🎮 Jouer</div>'), fin = src.indexOf('nav.settings">Paramètres</span>');
  const menu = src.slice(debut, fin + 40);
  const cibles = [...menu.matchAll(/onclick="(?:sidebarNav|showPage)\('([a-z]+)'/g)].map(m => m[1]);
  assert.ok(cibles.length >= 30, cibles.length + ' entrees');   // 32 pages au menu (v2.64), plus 4 fenetres ci-dessous
  cibles.forEach(c => assert.ok(T.some(l => l[0] === c), 'entree du menu sans adresse : ' + c));
  ['openApgnImportModal', 'openMigsBrowser', 'openSiteBriefing', 'openLabFromMenu'].forEach(f => assert.ok(menu.indexOf(f + '(') > 0, f));
  ['import', 'library', 'briefing', 'lab'].forEach(c => assert.ok(T.some(l => l[0] === c), c));
  // uniques, lisibles, et aucune ne designe deux pages
  const toutes = new Map();
  T.forEach(l => [l[1], l[2], l[0].toLowerCase()].forEach(a => {
    assert.match(a, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'adresse : ' + a);
    assert.ok(!toutes.has(a) || toutes.get(a) === l[0], a + ' : ' + toutes.get(a) + ' et ' + l[0]);
    toutes.set(a, l[0]);
  }));
  // aucune n'est aussi l'id d'un element (le navigateur sauterait dessus)
  T.forEach(l => [l[1], l[2]].forEach(a => assert.strictEqual(src.indexOf('id="' + a + '"'), -1, 'id ' + a)));
  assert.strictEqual(_r58("_adrLire('corpus')"), 'corpusstats', 'l exemple d Olivier : #corpus');
});

test('v2.64 adresses : lecture tolérante (accents, majuscules, espaces, encodage, noms internes), écriture dans la langue du site', () => {
  const lire = h => ctx._adrLire(h);
  assert.strictEqual(lire('#corpus'), 'corpusstats');
  assert.strictEqual(lire('#problèmes'), 'puzzles'); assert.strictEqual(lire('#probl%C3%A8mes'), 'puzzles'); assert.strictEqual(lire('#PROBLEMES'), 'puzzles');
  assert.strictEqual(lire('#Règles du jeu'), 'learn'); assert.strictEqual(lire('#rules'), 'learn'); assert.strictEqual(lire('#learn'), 'learn');
  assert.strictEqual(lire('#corpusstats'), 'corpusstats'); assert.strictEqual(lire('#stats'), 'stats'); assert.strictEqual(lire('#mes-statistiques'), 'stats');
  assert.strictEqual(lire('#bibliotheque'), 'library'); assert.strictEqual(lire('#paramètres'), 'settings'); assert.strictEqual(lire('#accueil'), 'home');
  assert.strictEqual(lire('#n-importe-quoi'), null); assert.strictEqual(lire('#'), null); assert.strictEqual(lire(''), null);
  const avant = ctx.localStorage.getItem('abalone_lang');
  try {
    ctx.localStorage.setItem('abalone_lang', 'FR');
    assert.strictEqual(ctx._adrPour('corpusstats'), 'corpus'); assert.strictEqual(ctx._adrPour('learn'), 'regles'); assert.strictEqual(ctx._adrPour('home'), '');
    ctx.localStorage.setItem('abalone_lang', 'EN');
    assert.strictEqual(ctx._adrPour('learn'), 'rules'); assert.strictEqual(ctx._adrPour('stats'), 'my-statistics'); assert.strictEqual(ctx._adrPour('home'), '');
    assert.strictEqual(ctx._adrPour('inconnue'), null);
  } finally { if (avant === null) ctx.localStorage.removeItem('abalone_lang'); else ctx.localStorage.setItem('abalone_lang', avant); }
});

test('v2.64 adresses : naviguer empile une entrée (bouton Retour), suivre la barre d’adresse remplace sans empiler', () => _avecAdresses58(async ({ journal, loc }) => {
  let active = 'home';
  ctx._adrPageActive = () => active;
  // l'utilisateur ouvre une page : nouvelle entree
  active = 'corpusstats'; ctx._adrSuivre(false);
  assert.deepStrictEqual(journal.pop(), ['push', '/Abalassembly/#corpus']);
  ctx._adrSuivre(false); assert.strictEqual(journal.length, 0, 'meme page : rien de plus');
  // retour a l'accueil : l'adresse nue
  active = 'home'; ctx._adrSuivre(false);
  assert.deepStrictEqual(journal.pop(), ['push', '/Abalassembly/']);
  // la barre d'adresse change (Retour, adresse tapee) : la page suit, l'historique ne s'allonge pas
  const vus = [];
  ctx.sidebarNav = (p) => { vus.push(p); active = p; ctx._adrSuivre(false); };
  loc.hash = '#regles'; ctx._adrSurChangement();
  assert.deepStrictEqual(vus, ['learn']);
  assert.ok(journal.every(e => e[0] === 'replace'), JSON.stringify(journal));
  // un alias est remis au propre, sans empiler
  journal.length = 0; loc.hash = '#learn'; ctx._adrSurChangement();
  assert.deepStrictEqual(journal, [['replace', '/Abalassembly/#regles']]);
  assert.deepStrictEqual(vus, ['learn'], 'deja sur la page : pas de nouvelle ouverture');
  // adresse inconnue, ou « # » seul : on ne bouge pas
  journal.length = 0; loc.hash = '#n-importe-quoi'; ctx._adrSurChangement();
  loc.hash = ''; loc.href = 'https://ocj94.github.io/Abalassembly/#'; ctx._adrSurChangement();
  assert.deepStrictEqual(vus, ['learn']); assert.strictEqual(journal.length, 0);
  // plus d'adresse du tout (Retour jusqu'a l'arrivee) : l'accueil
  loc.href = 'https://ocj94.github.io/Abalassembly/'; ctx._adrSurChangement();
  assert.deepStrictEqual(vus, ['learn', 'home']);
}));

test('v2.64 adresses : #partie ne recommence jamais une partie ; arrivée sur le site ; les liens ?partie= ?pos= ?defi passent avant', () => _avecAdresses58(async ({ journal, loc }) => {
  const ouvertes = [];
  ctx.showPage = (p) => { ouvertes.push(p); };
  ctx._adrPageActive = () => 'home';
  const snaps = ctx.boardSnapshots, sauvee = ctx.localStorage.getItem('abalone_saved_game');
  try {
    ctx.boardSnapshots = [{ board: {}, capturedByBlack: 0, capturedByWhite: 0, moveCount: 1 }]; ctx._adrPartie();
    assert.deepStrictEqual(ouvertes, [], 'partie en cours : remontree telle quelle, sans showPage(game)');
    ctx.boardSnapshots = []; ctx.MoveCount.set(14);   // 14 : la valeur de depart du compteur, sans partie
    ctx.localStorage.removeItem('abalone_saved_game'); ctx._adrPartie();
    assert.deepStrictEqual(ouvertes, ['setup'], 'aucune partie : la page pour en preparer une');
    ctx.localStorage.setItem('abalone_saved_game', JSON.stringify({ board: { '4,4': 'black' } })); ctx._adrPartie();
    assert.deepStrictEqual(ouvertes, ['setup', 'game'], 'une partie sauvegardee : proposee a la reprise');
  } finally {
    ctx.boardSnapshots = snaps;
    if (sauvee === null) ctx.localStorage.removeItem('abalone_saved_game'); else ctx.localStorage.setItem('abalone_saved_game', sauvee);
  }
  // arrivee : la page de l'adresse s'ouvre, sans intro
  const vus = []; ctx.sidebarNav = (p) => vus.push(p);
  _r58('_adrPret = false'); loc.hash = '#formateurs'; ctx._adrAuChargement();
  assert.deepStrictEqual(vus, ['formateurs']); assert.strictEqual(_r58('_adrPret'), true);
  // un lien de partie, de position ou de defi : il ouvre sa page lui-meme
  for (const q of ['?partie=ABAL1:standard:', '?pos=abc', '?defi=12', '?defi']) {
    _r58('_adrPret = false'); loc.search = q; loc.hash = '#corpus'; ctx._adrAuChargement();
    assert.deepStrictEqual(vus, ['formateurs'], q);
  }
  loc.search = '';
}));

test('v2.64 adresses : branchées sur showPage, les fenêtres du menu et le changement de langue ; expliquées dans l’aide', () => {
  // (d'autres tests remplacent showPage par un faux : on verifie le branchement dans le code du site)
  const src = _SRC();
  assert.ok(src.indexOf("showPage = function(){ const r = precedent.apply(this, arguments); _adrSuivre(false); return r; };") > 0);
  assert.ok(src.indexOf("window[nom] = function(){ const r = avant.apply(this, arguments); _adrFenetreSuivie(cle); return r; };") > 0);
  assert.ok(src.indexOf("setLanguage = function(){ const r = avantLangue.apply(this, arguments); _adrSuivre(true); return r; };") > 0);
  assert.deepStrictEqual(Object.keys(_r58('_ADR_OUVREURS')).sort(), ['briefing', 'import', 'library']);
  ['openApgnImportModal', 'openMigsBrowser', 'openSiteBriefing'].forEach(f => assert.strictEqual(typeof ctx[f], 'function', f));
  assert.ok(src.indexOf('<li><b>Une adresse par page</b> : chaque entrée du menu a la sienne') > 0);
  assert.ok(src.indexOf('<li><b>One address per page</b>: every menu entry has its own') > 0);
  assert.ok(src.indexOf('<code>…/Abalassembly/#corpus</code>') > 0);
});

// ═══════════════════════════════════════════
// 59. v2.65 : a quel coup tombent les billes (toutes, de la 1re a la derniere) ; graduations de l'echelle de couleurs
// ═══════════════════════════════════════════
test('v2.65 additions : le coup où tombe chaque bille, de la 1re à la 11e, et la dernière (la 6e du vainqueur)', async () => {
  await _charger57();
  const vrai = _r57('STATS_PARTIES'), C = Array.from(_r57('EMPREINTES_CHAMPS'));
  const z = () => [0, 0, 0, 0, 0, 0, 0, 0];
  const faux = { v: 1, sig: 'test', nb: [], etapes: [20, 40, 60], champs: C, dispos: ['belgian', 'standard'], p: [
    [1, 30, 1, 0, [10, 1, 15, 120, 20, 9], z(), z(), 0],                                          // 3 billes, partie arretee avant 6
    [2, 30, 1, 1, [5, 10, 9, 13, 12, 22, 14, 34, 20, 51, 22, 52, 25, 70, 30, 84], z(), z(), 0],   // 6-2 : 8 billes, la 6e noire au coup 30
    [1, 4, 0, 0, [1, 1, 2, 3], z(), z(), 0],                                                      // commencee sur une position de probleme : jamais comptee
    [0, 8, 1, 0, [3, 1], z(), z(), 0],                                                            // vainqueur inconnu : une bille
    [3, 50, 1, 0, [], z(), z(), 0],                                                               // aucune bille
    // 6-5 : 11 billes, une de chaque camp a tour de role ; la 6e blanche, la derniere, au coup 60
    [1, 60, 1, 0, [4, 1, 8, 0, 12, 3, 16, 2, 20, 5, 24, 4, 28, 7, 32, 6, 36, 9, 40, 8, 60, 11], z(), z(), 0]
  ] };
  try {
    _r57('STATS_PARTIES = ' + JSON.stringify(faux) + '; _sbCache = null;');
    assert.strictEqual(_r57('(function(){ const v = _sbAgreger(); return v.quand === v.billes[0] && v.quandParDispo.belgian === v.billesParDispo.belgian[0]; })()'), true, 'la 1re bille : les listes d’avant');
    const v = JSON.parse(JSON.stringify(ctx._sbAgreger()));
    assert.deepStrictEqual(v.billes, [[3, 4, 5, 10], [8, 9, 15], [12, 12, 20], [14, 16], [20, 20], [22, 24], [25, 28], [30, 32], [36], [40], [60], [30, 60]]);
    assert.deepStrictEqual(v.billesParDispo.belgian, [[3, 4, 10], [8, 15], [12, 20], [16], [20], [24], [28], [32], [36], [40], [60], [60]]);
    assert.deepStrictEqual(v.billesParDispo.standard, [[5], [9], [12], [14], [20], [22], [25], [30], [], [], [], [30]]);
    assert.deepStrictEqual(v.quandParDispo, { belgian: [3, 4, 10], standard: [5] });
    assert.deepStrictEqual(v.finals, [0, 0, 1, 0, 0, 1], 'les deux parties gagnees 6-x sont celles de « la derniere »');
    // les billes montrees : tombees dans au moins 50 parties (la 1re des qu'il y en a une)
    assert.deepStrictEqual(Array.from(ctx._sbLignesBilles(ctx._sbAgreger())), [0]);
  } finally {
    require('vm').runInContext('STATS_PARTIES = __sbVrai; _sbCache = null;', Object.assign(ctx, { __sbVrai: vrai }));
  }
  // les vraies parties : chaque bille tombe plus tard que la precedente, dans moins de parties
  const v = ctx._sbAgreger();
  assert.deepStrictEqual(Array.from(ctx._sbLignesBilles(v)), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  for (let k = 1; k <= 10; k++) {
    assert.ok(v.billes[k].length <= v.billes[k - 1].length, 'moins de parties : bille ' + (k + 1));
    assert.ok(ctx._sbMediane(v.billes[k]) > ctx._sbMediane(v.billes[k - 1]), 'plus tard : bille ' + (k + 1));
  }
  assert.ok(v.billes[11].length >= v.finals.reduce((a, b) => a + b, 0) && v.billes[11].length <= v.billes[5].length, 'la derniere : les parties gagnees en faisant tomber 6 billes');
});

test('v2.65 page Statistiques du jeu : une ligne par bille, la bille choisie en détail, les mêmes axes pour toutes', async () => {
  await _charger57();
  const v = ctx._sbAgreger(), med = k => ctx._sbMediane(v.billes[k]), avant = _r57('_sbBille'), nbAvant = _r57('JSON.stringify(STATS_PARTIES.nb)');
  const boutons = h => [...h.matchAll(/<button type="button" class="sb-cad-l" id="sb-bille-(\d+)" aria-pressed="(true|false)"[\s\S]*?<\/button>/g)];
  const histo = h => { const i = h.indexOf('<svg id="sb-histo"'); return h.slice(i, h.indexOf('</svg>', i)); };
  const axes = h => [...histo(h).matchAll(/>([^<]*)<\/text>/g)].map(m => m[1]).filter(t => !/médiane|median|coup où|move on/.test(t));
  try {
    await _enFrancais54(() => _dom54(async els => {
      _r57('_sbBille = 0');
      const h = ctx._sbHtmlBilles(v), b = boutons(h);
      assert.deepStrictEqual(b.map(m => Number(m[1])), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 'la 1re a la 11e, puis la derniere');
      b.forEach(m => assert.ok(m[0].indexOf('<span class="sb-cad-val">coup ' + med(Number(m[1])) + '</span>') > 0, 'mediane de la bille ' + m[1]));
      assert.deepStrictEqual(b.filter(m => m[2] === 'true').map(m => Number(m[1])), [0]);
      ['1ʳᵉ', '2ᵉ', '11ᵉ', 'Dernière'].forEach(t => assert.ok(h.indexOf('<span class="sb-cad-nom">' + t + '</span>') > 0, t));
      assert.ok(h.indexOf('La 1ʳᵉ bille tombe vers le <b>coup ' + med(0) + '</b> (médiane), puis il en tombe une autre à peu près tous les ' + Math.round((med(10) - med(0)) / 10)
        + ' coups : la 6ᵉ vers le coup ' + med(5) + ', la 11ᵉ vers le coup ' + med(10) + '. La dernière, la 6ᵉ du vainqueur, celle qui finit la partie, tombe vers le <b>coup ' + med(11) + '</b>.') > 0, 'la phrase d’ensemble');
      assert.ok(h.indexOf('La 1ʳᵉ bille en détail') > 0 && h.indexOf('La moitié des parties ont leur première éjection avant le <b>coup ' + med(0) + '</b>') > 0);
      assert.ok(h.indexOf(ctx._dimNb(v.billes[0].length) + ' pour la 1ʳᵉ, ' + ctx._dimNb(v.billes[10].length) + ' pour la 11ᵉ') > 0, 'la note : combien de parties');
      // choisir la 5e : son detail ; l'alerte des parties pas encore comptees reste apres le choix
      _r57('STATS_PARTIES.nb = [0, 0, 0, 0]');
      ctx._sbChoisirBille(4);
      const h5 = els['billes-section'].innerHTML;
      assert.strictEqual(_r57('_sbBille'), 4);
      assert.deepStrictEqual(boutons(h5).filter(m => m[2] === 'true').map(m => Number(m[1])), [4]);
      assert.ok(h5.indexOf('La 5ᵉ bille en détail') > 0);
      assert.ok(h5.indexOf('Dans les ' + ctx._dimNb(v.billes[4].length) + ' parties où au moins 5 billes sont tombées, la 5ᵉ tombe avant le <b>coup ' + med(4) + '</b> une fois sur deux') > 0);
      assert.ok(histo(h5).indexOf('médiane : coup ' + med(4)) > 0 && histo(h5).indexOf('>coup où tombe la 5ᵉ bille<') > 0);
      assert.ok(h5.indexOf('pas encore comptées') > 0, 'l’alerte reste apres un choix');
      // la derniere
      ctx._sbChoisirBille(11);
      const hD = els['billes-section'].innerHTML;
      assert.ok(hD.indexOf('La dernière bille en détail') > 0);
      assert.ok(hD.indexOf('Dans les ' + ctx._dimNb(v.billes[11].length) + ' parties gagnées en faisant tomber 6 billes, la dernière, celle qui fait gagner, tombe avant le <b>coup ' + med(11) + '</b>') > 0);
      // les memes axes pour toutes les billes : memes graduations en %, meme axe des coups
      assert.deepStrictEqual(axes(h5), axes(h)); assert.deepStrictEqual(axes(hD), axes(h));
      ['0 %', '0', '50', '100', '150', '200', '231+'].forEach(t => assert.ok(axes(h).includes(t), t));
      [h, h5, hD].forEach(x => assert.doesNotMatch(x, /NaN|undefined|Infinity/));
    }));
    // en anglais
    const avantL = ctx.localStorage.getItem('abalone_lang');
    ctx.localStorage.setItem('abalone_lang', 'EN');
    try {
      await _dom54(async () => {
        _r57('_sbBille = 2');
        const h = ctx._sbHtmlBilles(v), c = h.slice(h.indexOf('id="sb-carte-quand"'), h.indexOf('The comeback table'));
        ['When the marbles fall', '>1st<', '>2nd<', '>3rd<', '>4th<', '>11th<', '>Last<', 'The 3rd marble in detail', '>move on which the 3rd marble falls<',
          'In the ' + ctx._dimNb(v.billes[2].length) + ' games in which at least 3 marbles fell, the 3rd falls before <b>move ' + med(2) + '</b>'].forEach(t => assert.ok(c.indexOf(t) > 0, t));
        // le texte vu et lu (pas les id ni les onclick, qui gardent leurs noms francais)
        const lu = c.replace(/<[^>]*>/g, ' ') + [...c.matchAll(/(?:aria-label|title)="([^"]*)"/g)].map(m => m[1]).join(' ');
        assert.doesNotMatch(lu, /bille|coup |Dernière|médiane|parties|détail/);
      });
    } finally { if (avantL === null) ctx.localStorage.removeItem('abalone_lang'); else ctx.localStorage.setItem('abalone_lang', avantL); }
  } finally { _r57('_sbBille = ' + avant + '; STATS_PARTIES.nb = ' + nbAvant); }
});

test('v2.65 carte des éjections : sous l’échelle de couleurs, des traits et leurs nombres, de 0 au maximum, placés comme les couleurs', async () => {
  const G = m => Array.from(ctx._sbGraduations(m));
  assert.deepStrictEqual(G(0), [0]);
  assert.deepStrictEqual(G(1), [0, 1]);
  assert.deepStrictEqual(G(4), [0, 1, 2, 3, 4]);
  assert.deepStrictEqual(G(6), [0, 1, 2, 3, 4, 5, 6]);
  assert.deepStrictEqual(G(1767), [0, 200, 500, 1000, 1767], 'la carte « Toutes » du corpus');
  assert.deepStrictEqual(G(1274), [0, 100, 500, 800, 1274], 'Belgian Daisy : 1 000 toucherait le maximum, 800 le remplace');
  assert.deepStrictEqual(G(223), [0, 20, 50, 100, 223], 'Standard');
  for (let m = 1; m <= 5000; m++) {
    const g = G(m);
    assert.ok(g[0] === 0 && g[g.length - 1] === m && g.length >= Math.min(m + 1, 4) && g.length <= 7, m + ' : ' + g.join(' '));
    for (let i = 1; i < g.length; i++) assert.ok(Number.isInteger(g[i]) && g[i] > g[i - 1], m + ' : ' + g.join(' '));
  }
  // chaque trait est la ou heatColor met la couleur de son nombre : la legende et la carte disent la meme chose
  const S = Array.from(_r57('HEATMAP_SCALE')).map(c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)));
  const couleurEn = p => { const x = p * (S.length - 1), i = Math.min(S.length - 2, Math.floor(x)), f = x - i; return 'rgb(' + [0, 1, 2].map(k => Math.round(S[i][k] + (S[i + 1][k] - S[i][k]) * f)).join(',') + ')'; };
  [1, 7, 200, 500, 1000, 1767].forEach(c => assert.strictEqual(ctx.heatColor(c / 1767), couleurEn(ctx._sbPosEchelle(c, 1767)), 'couleur de ' + c));
  await _enFrancais54(async () => {
    const L = ctx._sbLegendeCarte(1767);
    const nbs = [...L.matchAll(/<span class="sb-leg-nb" style="([^"]*)">([^<]*)<\/span>/g)];
    assert.deepStrictEqual(nbs.map(m => m[2]), ['0', '200', '500', ctx._dimNb(1000), ctx._dimNb(1767)]);
    assert.strictEqual((L.match(/class="sb-leg-trait"/g) || []).length, 5);
    assert.ok(nbs[0][1].startsWith('left:0.00%'), 'le 0 a gauche');
    [200, 500, 1000].forEach((c, i) => assert.ok(nbs[i + 1][1].startsWith('left:' + (Math.pow(c / 1767, 0.6) * 100).toFixed(2) + '%;transform:translateX(-50%)'), 'place de ' + c));
    assert.ok(nbs[4][1].startsWith('right:0'), 'le maximum a droite');
    assert.ok(L.indexOf('linear-gradient(90deg,#0d0d14 0%,#1b1b2f 0.00%,#3b5bb5 14.29%,') > 0 && L.indexOf('#ffffff 100.00%)') > 0, 'le degrade : les couleurs de heatColor, aux memes places');
    assert.ok(L.indexOf('billes tombées de la case') > 0 && L.indexOf('aria-label="Échelle des couleurs : de 0 à ' + ctx._dimNb(1767) + ' billes tombées d’une même case"') > 0);
    // la carte du corpus : les nombres de l'onglet montre
    const v = (await _charger57(), ctx._sbAgreger());
    await _dom54(async () => {
      const h = ctx._sbHtmlBilles(v), max = Math.max(...v.cartes[_r57('_sbOngletCarte')]);
      const vus = [...h.slice(h.indexOf('id="sb-carte-carte"')).matchAll(/<span class="sb-leg-nb"[^>]*>([^<]*)<\/span>/g)].map(m => m[1]);
      assert.deepStrictEqual(vus, G(max).map(c => ctx._dimNb(c)));
    });
    // et la carte « Où tombent tes billes » de Mes statistiques
    const carte = new Array(61).fill(0); carte[56] = 3; carte[50] = 1; carte[4] = 2;
    const p = ctx._sbHtmlPerso({ carteSubies: carte, premiere: { perdue: { n: 0, g: 0 }, faite: { n: 0, g: 0 } }, sortes: [0, 0, 0, 0, 0, 0, 0, 0], byPhase: { ouverture: 0, milieu: 0, finale: 0 }, parPartie: 0 });
    assert.deepStrictEqual([...p.matchAll(/<span class="sb-leg-nb"[^>]*>([^<]*)<\/span>/g)].map(m => m[1]), ['0', '1', '2', '3']);
  });
  const avantL = ctx.localStorage.getItem('abalone_lang');
  ctx.localStorage.setItem('abalone_lang', 'EN');
  try {
    const L = ctx._sbLegendeCarte(3);
    assert.ok(L.indexOf('marbles pushed off from the spot') > 0 && L.indexOf('aria-label="Color scale: from 0 to 3 marbles pushed off from one spot"') > 0);
    assert.doesNotMatch(L, /bille|case|Échelle/);
  } finally { if (avantL === null) ctx.localStorage.removeItem('abalone_lang'); else ctx.localStorage.setItem('abalone_lang', avantL); }
});
