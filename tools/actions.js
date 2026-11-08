#!/usr/bin/env node
// La liste des actions que les boutons de la page ont le droit d'appeler (v3.22).
//
//   node tools/actions.js           écrit src/main/00b-actions-liste.js
//   node tools/actions.js --check   vérifie qu'elle est à jour (les tests le font aussi)
//
// Les boutons n'ont plus de code dans le HTML : ils portent data-click="nom(…)" (et
// data-change, data-input, data-keydown, data-toggle, data-fond, data-entree), que
// src/main/00a-actions.js lit et exécute. Il n'appelle que les fonctions de _ACTIONS :
// un attribut glissé dans la page par un pseudo ou un fichier piégé ne peut rien
// appeler d'autre. Cette liste est relevée dans les sources : chaque nom écrit dans
// un de ces attributs, plus les quelques noms que le JavaScript assemble au vol
// (EN_PLUS ci-dessous). Chaque nom doit être une fonction définie dans le jeu.
'use strict';
const fs = require('fs');
const path = require('path');

const R = path.join(__dirname, '..');
const SORTIE = path.join(R, 'src', 'main', '00b-actions-liste.js');
const ATTRS = ['click', 'change', 'input', 'keydown', 'toggle', 'fond', 'entree'];

// noms qui n'apparaissent pas en clair dans un attribut : le JS les choisit au vol
const EN_PLUS = {
  'main/02-social-features.js (cartes de l\'accueil)': ['openGameSetup', 'showPage'],
  'main/19-chat-and-analysis-ui.js (positions proches)': ['loadMigsGame', 'loadAOGame'],
  'main/44-labo-bancs.js et 45 (boutons des bancs)': ['lancerTournoiStyles', 'lancerNiveaux', 'lancerOuvertures', 'lancerContreToi'],
  'main/59-observatoire-ia.js (arbre de recherche)': ['obsOnglet', 'obsChoisir'],
  'main/20-bots-and-themes.js (cartes des billes, setAttribute)': ['setMarbleSkin']
};

function sources() {
  const l = [];
  // 00a-actions.js est exclu : ses exemples en commentaire ne sont pas des actions
  const ajouter = (d) => fs.readdirSync(d).forEach((f) => { const p = path.join(d, f); if (/\.(part|js)$/.test(f) && f !== '00b-actions-liste.js' && f !== '00a-actions.js') l.push(p); });
  ajouter(path.join(R, 'src'));
  ajouter(path.join(R, 'src', 'main'));
  return l;
}

function noms() {
  const n = new Set();
  const re = new RegExp('data-(' + ATTRS.join('|') + ')=(\\\\?["\'])', 'g');
  for (const f of sources()) {
    const s = fs.readFileSync(f, 'utf8');
    let m;
    while ((m = re.exec(s))) {
      const fin = s.indexOf(m[2], m.index + m[0].length);
      const v = s.slice(m.index + m[0].length, fin < 0 ? undefined : fin);
      // les morceaux assemblés par le JS ('+x+') ne sont pas des noms d'action
      const propre = v.replace(/\\?'\s*\+[^+]*\+\s*\\?'/g, "''").replace(/\$\{[^}]*\}/g, '');
      for (const x of propre.matchAll(/(^|[;\s(,])([A-Za-z_$][\w$]*)\s*\(/g))
        if (!['event', 'if', 'return', 'this', 'document'].includes(x[2])) n.add(x[2]);
    }
  }
  Object.values(EN_PLUS).forEach((l) => l.forEach((x) => n.add(x)));
  return [...n].sort();
}

function contenu() {
  const l = noms();
  return '/* Généré par tools/actions.js : ne pas modifier à la main. ' + l.length + ' actions.\n' +
    '   Les seules fonctions que les attributs data-click, data-change… peuvent appeler\n' +
    '   (src/main/00a-actions.js). Chaque entrée renvoie la fonction au moment du clic. */\n' +
    'const _ACTIONS = {\n' + l.map((x) => '  ' + x + ': function () { return ' + x + '; }').join(',\n') + '\n};\n';
}

if (require.main === module) {
  const c = contenu();
  if (process.argv.includes('--check')) {
    const actuel = fs.existsSync(SORTIE) ? fs.readFileSync(SORTIE, 'utf8') : '';
    if (actuel !== c) { console.error('src/main/00b-actions-liste.js n\'est pas à jour : node tools/actions.js'); process.exit(1); }
    console.log('liste des actions à jour');
  } else { fs.writeFileSync(SORTIE, c); console.log(noms().length + ' actions écrites dans src/main/00b-actions-liste.js'); }
}
module.exports = { noms, contenu, EN_PLUS, ATTRS };
