#!/usr/bin/env node
// Polices hébergées par le site, plus chargées depuis Google Fonts (v3.21).
//
//   node tools/polices.js        puis   node tools/build.js
//
// Avant, chaque visite appelait fonts.googleapis.com et fonts.gstatic.com : Google
// recevait l'adresse IP et le navigateur de chaque visiteur, alors que la politique de
// confidentialité dit qu'aucune donnée ne quitte le navigateur ; et hors ligne, le
// site retombait sur des polices de secours.
//
// Les fichiers sont dans fonts/ (woff2, sous-ensemble « latin » de Fontsource 5.3.0 :
// français, anglais, ponctuation, €), avec leur licence SIL Open Font License 1.1.
// Ce script écrit :
//   - src/01b-polices.part : les polices du jeu, embarquées en data: dans index.html
//     (le fichier unique reste complet hors ligne, sans rien chercher ailleurs) ;
//   - fonts/ecosysteme.css : celles de la page ecosysteme.html, servies depuis fonts/.
'use strict';
const fs = require('fs');
const path = require('path');

const R = path.join(__dirname, '..');
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

const JEU = [['Playfair Display', 'playfair-display', [400, 700, 900]], ['DM Sans', 'dm-sans', [300, 400, 500, 600]], ['DM Mono', 'dm-mono', [400, 500]]];
const ECOSYSTEME = [['Fraunces', 'fraunces', [300, 600, 900]], ['Archivo', 'archivo', [400, 500, 700]], ['Spline Sans Mono', 'spline-sans-mono', [400, 600]]];

const fichier = (slug, w) => slug + '-latin-' + w + '-normal.woff2';
function regles(familles, source) {
  const r = [];
  for (const [nom, slug, poids] of familles)
    for (const w of poids)
      r.push("@font-face{font-family:'" + nom + "';font-style:normal;font-weight:" + w + ';font-display:swap;src:' + source(slug, w) + " format('woff2');unicode-range:" + LATIN + '}');
  return r.join('\n');
}

function main() {
  const jeu = regles(JEU, (slug, w) => 'url(data:font/woff2;base64,' + fs.readFileSync(path.join(R, 'fonts', fichier(slug, w))).toString('base64') + ')');
  fs.writeFileSync(path.join(R, 'src', '01b-polices.part'),
    '<!-- Polices du jeu, embarquees (genere par tools/polices.js depuis fonts/ ; SIL Open Font License 1.1, voir fonts/) -->\n<style>\n' + jeu + '\n</style>\n');
  fs.writeFileSync(path.join(R, 'fonts', 'ecosysteme.css'),
    '/* Polices de ecosysteme.html (genere par tools/polices.js ; SIL Open Font License 1.1, voir OFL-*.txt) */\n' +
    regles(ECOSYSTEME, (slug, w) => "url('" + fichier(slug, w) + "')") + '\n');
  console.log('src/01b-polices.part : ' + Math.round(jeu.length / 1024) + ' Ko ; fonts/ecosysteme.css écrit');
}

if (require.main === module) main();
module.exports = { JEU, ECOSYSTEME, fichier };
