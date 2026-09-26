/* ═══════════════════════════════════════════════════════════════
   HARNAIS DE TEST — charge le moteur du mono-fichier dans un bac a sable

   Abalassembly n'a pas de modules : tout vit dans index.html. Pour tester le
   moteur sans navigateur, on execute les blocs <script> dans un contexte vm
   avec juste ce qu'il faut de DOM factice.

   Ce n'est PAS un navigateur : rendu, evenements et reseau sont des coquilles
   vides. Les tests portent sur la LOGIQUE (regles, moteur, camps), pas sur
   l'affichage.

   DEUX PIEGES, tous deux rencontres en construisant ce fichier :

   1. Il faut charger TOUS les blocs, pas "le bloc principal". AbaTB vit dans
      un bloc ulterieur. Pire : la chaine "var AbaTB = (function" apparait
      AUSSI a l'interieur de AI_WORKER_CODE, donc reperer un bloc par ce motif
      designe le mauvais bloc.

   2. Dans un contexte vm, les declarations `const`/`let` de haut niveau ne
      deviennent PAS des proprietes du contexte (contrairement a `var` et
      `function`). Sans la passerelle plus bas, les tests liraient `undefined`
      en silence, sans qu'aucune erreur ne le signale.

   Chargement : ~8 Mo de JavaScript, quelques secondes. On ne le fait qu'une
   fois et on partage le contexte.
   ═══════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const INDEX = path.join(__dirname, '..', 'index.html');

function extraireBlocs(html) {
  const blocs = [];
  const re = /<script(?![^>]*ld\+json)[^>]*>([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html)) !== null) blocs.push(m[1]);
  if (!blocs.length) throw new Error('aucun bloc script trouve dans index.html');
  return blocs;
}

function contexteFactice() {
  const noop = () => {};
  const ctx = { console };
  ctx.window = ctx; ctx.globalThis = ctx; ctx.self = ctx;
  ctx.addEventListener = noop; ctx.scrollTo = noop;
  ctx.atob = s => Buffer.from(s, 'base64').toString('binary');
  ctx.btoa = s => Buffer.from(s, 'binary').toString('base64');
  ctx.navigator = { deviceMemory: 4, maxTouchPoints: 0, userAgent: 'node' };
  ctx.location = { search: '', href: 'http://localhost/', protocol: 'http:',
                   origin: 'http://localhost', pathname: '/' };
  const el = () => ({
    style: {}, innerHTML: '', textContent: '', value: '', checked: false,
    addEventListener: noop, removeEventListener: noop,
    getContext: () => new Proxy({}, { get: () => noop }),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
    appendChild: noop, removeChild: noop, insertBefore: noop,
    querySelectorAll: () => [], querySelector: () => null,
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    setAttribute: noop, getAttribute: () => null, removeAttribute: noop,
    children: [], dataset: {}, focus: noop, click: noop
  });
  const cache = {};
  ctx.document = {
    head: el(), body: el(), documentElement: el(), readyState: 'complete',
    getElementById: id => (cache[id] || (cache[id] = el())),
    querySelectorAll: () => [], querySelector: () => null,
    addEventListener: noop, createElement: () => el(),
    createTextNode: () => ({}), getElementsByTagName: () => []
  };
  const store = {};
  ctx.localStorage = {
    getItem: k => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: k => { delete store[k]; },
    clear: () => { for (const k in store) delete store[k]; }
  };
  ctx.sessionStorage = ctx.localStorage;
  ctx.fetch = () => Promise.reject(new Error('reseau indisponible en test'));
  ctx.requestAnimationFrame = noop;
  ctx.requestIdleCallback = fn => setTimeout(fn, 0);
  ctx.setInterval = () => 0; ctx.clearInterval = noop;
  ctx.setTimeout = (fn, ms) => setTimeout(fn, ms); ctx.clearTimeout = clearTimeout;
  ctx.performance = { now: () => Date.now() };
  ctx.Promise = Promise;
  ctx.TextDecoder = TextDecoder;
  ctx.URLSearchParams = URLSearchParams;
  ctx.URL = URL;
  ctx.Blob = typeof Blob !== 'undefined' ? Blob : undefined;
  ctx.Response = typeof Response !== 'undefined' ? Response : undefined;
  ctx.DecompressionStream = typeof DecompressionStream !== 'undefined' ? DecompressionStream : undefined;
  ctx.crypto = typeof crypto !== 'undefined' ? crypto : undefined;
  ctx.Worker = function () { return { postMessage: noop, terminate: noop, addEventListener: noop }; };
  ctx.CustomEvent = function (t, o) { return Object.assign({ type: t }, o || {}); };
  ctx.Event = ctx.CustomEvent;
  ctx.matchMedia = function () { return { matches: false, addEventListener: noop, addListener: noop }; };
  return ctx;
}

/* Passerelle : executee DANS la meme portee que le moteur, elle pose des
   accesseurs sur globalThis pour les liaisons lexicales. Lire ctx.board rend
   la vraie variable ; ecrire ctx.board = {...} la modifie.
   AbaTB n'y figure pas : declare avec `var`, il est deja expose -- le relier
   creerait un accesseur qui se lit lui-meme. */
const PASSERELLE = `
;(function(){
  var g = globalThis;
  function relier(nom, lire, ecrire){
    try { Object.defineProperty(g, nom, { get: lire, set: ecrire, configurable: true }); }
    catch (e) { /* deja expose par var/function : rien a faire */ }
  }
  if (typeof board !== 'undefined')            relier('board', function(){return board;}, function(v){board=v;});
  if (typeof boardSnapshots !== 'undefined')   relier('boardSnapshots', function(){return boardSnapshots;}, function(v){boardSnapshots=v;});
  if (typeof PS_TOURNOI_YEARLY_2026 !== 'undefined') relier('PS_TOURNOI_YEARLY_2026', function(){return PS_TOURNOI_YEARLY_2026;});
  if (typeof _psLiveActive !== 'undefined')    relier('_psLiveActive', function(){return _psLiveActive;});
  if (typeof PS_GAMES !== 'undefined')         relier('PS_GAMES', function(){return PS_GAMES;}, function(v){PS_GAMES=v;});
  if (typeof MIGS_GAMES !== 'undefined')       relier('MIGS_GAMES', function(){return MIGS_GAMES;}, function(v){MIGS_GAMES=v;});
  if (typeof AO_GAMES !== 'undefined')         relier('AO_GAMES', function(){return AO_GAMES;}, function(v){AO_GAMES=v;});
  if (typeof undoStack !== 'undefined')        relier('undoStack', function(){return undoStack;}, function(v){undoStack=v;});
  if (typeof selected !== 'undefined')         relier('selected', function(){return selected;}, function(v){selected=v;});
  if (typeof LAYOUTS !== 'undefined')          relier('LAYOUTS', function(){return LAYOUTS;});
  if (typeof ROWS !== 'undefined')             relier('ROWS', function(){return ROWS;});
  if (typeof AX_DIRS !== 'undefined')          relier('AX_DIRS', function(){return AX_DIRS;});
  if (typeof ABAPRO_ROWS !== 'undefined')      relier('ABAPRO_ROWS', function(){return ABAPRO_ROWS;});
  if (typeof akey !== 'undefined')             relier('akey', function(){return akey;});
  if (typeof GameMode !== 'undefined')         relier('GameMode', function(){return GameMode;});
  if (typeof HumanColor !== 'undefined')       relier('HumanColor', function(){return HumanColor;});
  if (typeof CurrentTurn !== 'undefined')      relier('CurrentTurn', function(){return CurrentTurn;});
  if (typeof CapturedByBlack !== 'undefined')  relier('CapturedByBlack', function(){return CapturedByBlack;});
  if (typeof CapturedByWhite !== 'undefined')  relier('CapturedByWhite', function(){return CapturedByWhite;});
  if (typeof MoveCount !== 'undefined')        relier('MoveCount', function(){return MoveCount;});
  if (typeof GameOver !== 'undefined')         relier('GameOver', function(){return GameOver;});
})();
`;

let _ctx = null;
/** Charge le moteur une seule fois et renvoie le contexte partage. */
function chargerMoteur() {
  if (_ctx) return _ctx;
  const html = fs.readFileSync(INDEX, 'utf8');
  const blocs = extraireBlocs(html);
  const ctx = contexteFactice();
  vm.createContext(ctx);
  blocs.forEach((b, i) => {
    try { vm.runInContext(b, ctx, { timeout: 60000 }); }
    catch (e) { throw new Error('bloc script ' + i + ' a echoue : ' + e.message); }
  });
  vm.runInContext(PASSERELLE, ctx, { timeout: 10000 });
  if (!ctx.LAYOUTS) throw new Error('moteur charge mais LAYOUTS inaccessible : passerelle a revoir');
  _ctx = ctx;
  return ctx;
}

/** Pose une position de depart nommee (cle de LAYOUTS) sur un plateau propre. */
function poserDisposition(ctx, cle) {
  const L = ctx.LAYOUTS[cle];
  if (!L) throw new Error('disposition inconnue : ' + cle);
  ctx.board = {};
  L.black.forEach(p => { ctx.board[p[0] + ',' + p[1]] = 'black'; });
  L.white.forEach(p => { ctx.board[p[0] + ',' + p[1]] = 'white'; });
  ctx.CapturedByBlack.set(0);
  ctx.CapturedByWhite.set(0);
  ctx.GameOver.set(false);
  ctx.MoveCount.set(0);
}

/** Pose une position a la main : listes de cases [r,c] par couleur. */
function poserCases(ctx, noires, blanches) {
  ctx.board = {};
  (noires || []).forEach(p => { ctx.board[p[0] + ',' + p[1]] = 'black'; });
  (blanches || []).forEach(p => { ctx.board[p[0] + ',' + p[1]] = 'white'; });
  ctx.CapturedByBlack.set(0);
  ctx.CapturedByWhite.set(0);
  ctx.GameOver.set(false);
  ctx.MoveCount.set(0);
}

module.exports = { chargerMoteur, poserDisposition, poserCases };
