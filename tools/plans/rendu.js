#!/usr/bin/env node
// Dessine les plans du site (tools/plans/*.html) en images pour la documentation.
//
//   node tools/plans/rendu.js        écrit docs-img/plan-<nom>.<fr|en>.webp
//
// Les plans sont des pages HTML avec un SVG dessiné à la main, en français (*.fr.html)
// et en anglais (*.en.html) : les corriger là, puis relancer ce script. Il demande
// Playwright et Chromium (npm i -D playwright ; npx playwright install chromium),
// qui ne servent qu'ici : le jeu n'en dépend pas.
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const ICI = __dirname;
const SORTIE = path.join(ICI, '..', '..', 'docs-img');
const ECHELLE = 1.25;      // assez net pour lire les petits textes, sous 600 Ko par image (limite des tests)
const QUALITE = 0.86;

(async () => {
  const navigateur = await chromium.launch();
  for (const f of fs.readdirSync(ICI).filter((x) => /\.(fr|en)\.html$/.test(x)).sort()) {
    const html = fs.readFileSync(path.join(ICI, f), 'utf8');
    const m = /<svg[^>]*width="(\d+)" height="(\d+)"/.exec(html);
    const page = await navigateur.newPage({ viewport: { width: +m[1], height: +m[2] }, deviceScaleFactor: ECHELLE });
    await page.goto('file://' + path.join(ICI, f));
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot({ type: 'png' });
    // Chromium sait écrire du WebP : on lui fait convertir sa propre capture
    const webp = await page.evaluate(async ([b64, q]) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + b64;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = img.naturalWidth; c.height = img.naturalHeight;
      c.getContext('2d').drawImage(img, 0, 0);
      return c.toDataURL('image/webp', q).split(',')[1];
    }, [png.toString('base64'), QUALITE]);
    const nom = 'plan-' + f.replace(/\.html$/, '.webp');
    fs.writeFileSync(path.join(SORTIE, nom), Buffer.from(webp, 'base64'));
    console.log(nom + ' : ' + Math.round(Buffer.from(webp, 'base64').length / 1024) + ' Ko');
    await page.close();
  }
  await navigateur.close();
})();
