#!/usr/bin/env node
// Assemble les planches en un seul PDF, une planche par page.
//
//   node tools/plans/pdf.js            écrit docs-img/abalassembly-plans.fr.pdf
//   node tools/plans/pdf.js en         ... .en.pdf
//
// Chaque page est exactement a la taille de sa planche : pas de marge, pas de
// mise a l'echelle, donc rien n'est coupe et le texte reste net a n'importe quel
// zoom (c'est du vectoriel, pas une image). Demande Playwright, comme rendu.js.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ICI = __dirname;
const SORTIE = path.join(ICI, '..', '..', 'docs-img');
// l'ordre des planches, celui du cartouche
const ORDRE = ['vue-ensemble', 'reseau-de-calcul', 'fonctionnement-ia', 'labo', 'observatoire'];

(async () => {
  const lg = (process.argv[2] === 'en') ? 'en' : 'fr';
  /* Une seule page HTML qui contient les cinq SVG, chacun sur sa feuille, et
     une seule impression : Chromium ne sait pas empiler des PDF, et recoller du
     PDF a la main serait fragile pour rien. */
  const feuilles = ORDRE.filter(function (n) { return fs.existsSync(path.join(ICI, n + '.' + lg + '.html')); });
  let doc = '<!doctype html><html lang="' + lg + '"><head><meta charset="utf-8"><style>'
    + '@page{margin:0}html,body{margin:0;padding:0;background:#0b2a4a}'
    + '.feuille{page-break-after:always;break-after:page;margin:0;padding:0;line-height:0}'
    + '.feuille:last-child{page-break-after:auto;break-after:auto}'
    + 'svg{display:block}</style>';
  // les styles des planches sont identiques : on prend ceux de la premiere
  const premier = fs.readFileSync(path.join(ICI, feuilles[0] + '.' + lg + '.html'), 'utf8');
  doc += (premier.match(/<style>[\s\S]*?<\/style>/) || [''])[0].replace('<style>', '<style>');
  doc += '</head><body>';
  let largeurMax = 0;
  const tailles = [];
  feuilles.forEach(function (n) {
    const html = fs.readFileSync(path.join(ICI, n + '.' + lg + '.html'), 'utf8');
    const svg = html.slice(html.indexOf('<svg'), html.lastIndexOf('</svg>') + 6);
    const m = /width="(\d+)" height="(\d+)"/.exec(svg);
    tailles.push([+m[1], +m[2]]);
    largeurMax = Math.max(largeurMax, +m[1]);
    doc += '<div class="feuille">' + svg + '</div>';
  });
  doc += '</body></html>';

  const tmp = path.join(SORTIE, '.plans-' + lg + '.html');
  fs.writeFileSync(tmp, doc, 'utf8');
  const nav2 = await chromium.launch();
  const p2 = await nav2.newPage({ viewport: { width: largeurMax, height: 1200 } });
  await p2.goto('file://' + tmp);
  await p2.waitForTimeout(800);
  /* Une seule taille de page pour tout le document : la plus grande planche.
     Les plus petites sont centrees dessus plutot qu'etirees. */
  const h = Math.max.apply(null, tailles.map(function (t) { return Math.round(t[1] * largeurMax / t[0]); }));
  await p2.addStyleTag({ content: '.feuille{width:' + largeurMax + 'px;height:' + h + 'px;display:flex;align-items:center;justify-content:center}'
    + '.feuille svg{width:100%;height:100%}' });   // le SVG garde ses proportions tout seul
  const dest = path.join(SORTIE, 'abalassembly-plans.' + lg + '.pdf');
  await p2.pdf({ path: dest, width: largeurMax + 'px', height: h + 'px', printBackground: true, margin: { top: '0', bottom: '0', left: '0', right: '0' } });
  await nav2.close();
  fs.unlinkSync(tmp);
  const ko = Math.round(fs.statSync(dest).size / 1024);
  console.log('PDF ecrit : ' + path.basename(dest) + ' — ' + feuilles.length + ' planches, ' + ko + ' Ko');
})();
