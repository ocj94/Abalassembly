#!/usr/bin/env node
'use strict';
/* ============================================================================
   LES POIDS TEXEL DE L'IA (v2.75)
   ----------------------------------------------------------------------------
   Refait, hors du navigateur, le calcul de l'onglet « Methode Texel » du Labo
   (src/main/43-labo-texel.js, lancerTexel) avec ses reglages par defaut :
   positions calmes des vraies parties (src/main/data/15-labo-positions.b64),
   termes de l'evaluation calcules par le code exact du moteur (fil de calcul),
   echelle reglee sur les poids de depart, puis 800 etapes d'Adam, poids bornes.

   Les poids obtenus sont ceux de AI_WEIGHT_PRESETS.texel
   (src/main/data/15-code-02.js), utilises a partir du niveau 4. Le script
   dit s'ils correspondent encore ; sinon, il donne la ligne a recopier.

   Usage :
     node tools/build.js && node tools/texel-poids.js
   Duree : une quinzaine de secondes.
============================================================================ */
const vm = require('vm');
const { chargerMoteur } = require('../tests/harness');

const ctx = chargerMoteur();
const ev = code => vm.runInContext(code, ctx);
const fil = { console, Date, Math, JSON, Map, Set, Object, Array, Number, String, Infinity, isFinite, parseInt,
  Uint8Array, Int8Array, Float32Array, Int32Array, Uint32Array, DataView, ArrayBuffer,
  navigator: { deviceMemory: 4 }, atob: s => Buffer.from(s, 'base64').toString('binary') };
fil.self = fil; vm.createContext(fil); vm.runInContext(ctx.AI_WORKER_CODE, fil);

(async () => {
  if (!(await ctx.ensureLaboPositions())) { console.error('positions du Labo illisibles'); process.exit(1); }
  const cfg = Object.assign({}, ev('TEXEL_CFG_DEFAUT')), I0 = ctx._lpTexelIndices(), cles = ctx._labCles();
  const I = { app: I0.app.filter(i => ctx._txGarder(i, cfg)), ctl: I0.ctl.filter(i => ctx._txGarder(i, cfg)) };
  const tous = I.app.concat(I.ctl), nApp = I.app.length, K = cles.length;
  const T = fil.texelTermes(tous.map(i => JSON.parse(JSON.stringify(ctx._lpPourFil(i)))), cles);
  const A = { f: T.f.subarray(0, nApp * K), m: T.m.subarray(0, nApp) }, C = { f: T.f.subarray(nApp * K), m: T.m.subarray(nApp) };
  const RA = I.app.map(ctx._txResultatPour), RC = I.ctl.map(ctx._txResultatPour);
  // les poids de depart : ceux d'origine (le champion d'un Labo neuf)
  const depart = ctx._labComplet(ev('LAB_ORIGINE')), w0 = cles.map(k => depart[k]);
  const s = ctx._txEchelle(A, RA, w0), MIN = ev('SPSA_MIN'), MAX = ev('SPSA_MAX');
  const st = { w: w0.slice(), w0, lam: cfg.rappel || 0, m: new Array(K).fill(0), v: new Array(K).fill(0), t: 0,
    min: cles.map(k => MIN[k]), max: cles.map(k => MAX[k]), pas: cles.map(k => (MAX[k] - MIN[k]) / 400) };
  while (st.t < (cfg.etapes || ev('TEXEL_ETAPES'))) ctx._txEtape(A, RA, s, st);
  const w = st.w.map(x => Math.round(x * 10) / 10);
  const pct = x => (100 * x).toFixed(1).replace('.', ',') + ' %';
  console.log(RA.length + ' positions pour regler, ' + RC.length + ' pour verifier');
  console.log('gagnant devine (controle) : ' + pct(ctx._txJuste(C, RC, w0)) + ' -> ' + pct(ctx._txJuste(C, RC, w)));
  const ligne = cles.map((k, j) => k + ':' + w[j]).join(', ');
  const embarque = ev('AI_WEIGHT_PRESETS.texel');
  const ecarts = cles.filter((k, j) => embarque[k] !== w[j]);
  if (!ecarts.length) console.log('AI_WEIGHT_PRESETS.texel : identique au calcul.');
  else { console.log('AI_WEIGHT_PRESETS.texel differe sur : ' + ecarts.join(', ')); console.log('calcul : { ' + ligne + ' }'); process.exitCode = 2; }
})();
