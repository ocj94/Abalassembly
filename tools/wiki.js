#!/usr/bin/env node
// Recopie la documentation du dépôt (docs-fr/*.fr.md) dans le wiki GitHub.
//
//   git clone https://github.com/ocj94/Abalassembly.wiki.git /tmp/wiki
//   node tools/wiki.js /tmp/wiki
//   cd /tmp/wiki && git add -A && git commit -m "..." && git push
//
// La CI le fait toute seule à chaque poussée qui touche docs-fr/ (.github/workflows/wiki.yml).
//
// La source est le dépôt : chaque page recopiée le dit en bas, pour qu'on la
// corrige dans docs-fr/ et pas dans le wiki (elle serait écrasée à la copie
// suivante). Les liens sont réécrits pour le wiki :
//   Page.fr.md            → Page           (page du wiki)
//   ../docs-img/x.webp    → l'image servie par raw.githubusercontent.com
//   ../docs-en/X.en.md    → la version anglaise, dans le dépôt
//   ../autre/chemin       → le fichier ou le dossier, dans le dépôt
// Les pages propres au wiki (sans équivalent dans docs-fr) ne sont pas touchées ;
// l'accueil les liste à la suite des pages du dépôt (WIKI_SEULEMENT ci-dessous).
'use strict';
const fs = require('fs');
const path = require('path');

const DEPOT = 'https://github.com/ocj94/Abalassembly';
const BRUT = 'https://raw.githubusercontent.com/ocj94/Abalassembly/main';
const RACINE = path.join(__dirname, '..');
const DOCS = path.join(RACINE, 'docs-fr');
const MARQUE = 'Page recopiée de';

// pages écrites directement dans le wiki, avec leur ligne pour l'accueil
const WIKI_SEULEMENT = [
  ['Duel-Cerveau', 'Duel Cerveau', 'exercices de vitesse contre un ami, en direct : même position pour les deux, le meilleur score puis le plus rapide gagne'],
  ['Notation-Reference', 'Référence des notations', 'AbaPro, Nacre (KAA), format de position compacte KAA, format interne AO'],
  ['Verification', 'Vérification continue', 'les contrôles qui tournent à chaque poussée'],
  ['Ouvertures', 'Ouvertures', 'posRef vérifié par croisement, arbre de 90 positions avec taux de gain réels'],
  ['Solveur', 'Solveur d\'éjection forcée', 'l\'équivalent Abalone d\'un solveur de mat ; a révélé 6 puzzles cassés dans le jeu'],
  ['Labo-IA', 'Labo IA (moteur en jeu)', 'evaluateBoard, minimax, « Pourquoi ce coup ? », test des critères de KAAH'],
  ['Vues-du-plateau', 'Vues du plateau', '1D, 2D, 3D : un seul point d\'entrée, le picking 3D, et comment ajouter une vue'],
  ['Regles-materiel-et-victoire', 'Règles : matériel et victoire', '14 − 6 = perdant à 8 billes ; mode Découverte ; Abalone+'],
  ['Tablebases', 'Tablebases de finale', '2v2, 3v2 et 4v2 résolues exhaustivement, méthode, formats, utilisation en jeu'],
  ['Architecture-historique', 'Architecture : notes d\'août 2026', 'les deux dépôts, détection hors ligne, posRef, conventions (v1.48 à v1.50, non mises à jour)']
];

function lien(cible, depuis) {
  if (/^(https?:|mailto:|#)/.test(cible) || cible === '') return cible;
  const [chemin, ancre] = cible.split('#');
  const suite = ancre !== undefined ? '#' + ancre : '';
  const m = /^([A-Za-z0-9-]+)\.fr\.md$/.exec(chemin);
  if (m) return m[1] + suite;
  const absolu = path.posix.normalize(path.posix.join('docs-fr', chemin));
  if (absolu.startsWith('docs-img/')) return BRUT + '/' + absolu;
  return DEPOT + (chemin.endsWith('/') ? '/tree/main/' : '/blob/main/') + absolu + suite;
}

function convertir(texte, fichier) {
  return texte.replace(/(!?\[[^\]]*\])\(([^)\s]*)\)/g, (_, txt, cible) => txt + '(' + lien(cible, fichier) + ')');
}

function main() {
  const wiki = process.argv[2];
  if (!wiki || !fs.existsSync(path.join(wiki, '.git'))) {
    console.error('usage : node tools/wiki.js <clone du wiki>   (git clone ' + DEPOT + '.wiki.git)');
    process.exit(2);
  }
  // une fois : l'ancienne page Architecture du wiki (août 2026) n'a pas d'équivalent dans
  // docs-fr, qui a sa propre Architecture ; on la garde, renommée et marquée
  const ancienne = path.join(wiki, 'Architecture.md'), historique = path.join(wiki, 'Architecture-historique.md');
  if (!fs.existsSync(historique) && fs.existsSync(ancienne) && !fs.readFileSync(ancienne, 'utf8').includes(MARQUE)) {
    fs.writeFileSync(historique, fs.readFileSync(ancienne, 'utf8').replace(/^# Architecture technique/m,
      '# Architecture : notes d\'août 2026\n\n> Notes écrites entre les versions 1.48 et 1.50 (août 2026), gardées pour l\'historique et **non mises à jour** : ' +
      'le Labo, le serveur et le moteur ont beaucoup changé depuis. La page à jour est [Architecture](Architecture) ; ' +
      'le réseau de calcul actuel est décrit dans [Calcul distribué](Calcul-distribue).'));
  }
  const pages = fs.readdirSync(DOCS).filter((f) => f.endsWith('.fr.md')).sort();
  for (const f of pages) {
    const nom = f.replace(/\.fr\.md$/, '');
    let texte = convertir(fs.readFileSync(path.join(DOCS, f), 'utf8'), f).replace(/\s+$/, '');
    if (nom === 'Home') {
      texte += '\n\n## Autres pages du wiki\n\nÉcrites directement ici, sans équivalent dans le dépôt :\n\n' +
        WIKI_SEULEMENT.map(([p, titre, desc]) => '- **[' + titre + '](' + p + ')** — ' + desc + '.').join('\n') +
        '\n\n## Liens utiles\n\n- 🎮 [Jouer maintenant](https://ocj94.github.io/Abalassembly/)\n' +
        '- ❓ Aide dans le jeu : menu ☰ → Progresser → **Aide** (hors ligne)\n' +
        '- 📜 [Journal des modifications](' + DEPOT + '/blob/main/CHANGELOG.md)\n' +
        '- 🔧 [Serveur (pas encore en ligne)](https://github.com/ocj94/abalassembly-api)';
    }
    texte += '\n\n---\n_' + MARQUE + ' [`docs-fr/' + f + '`](' + DEPOT + '/blob/main/docs-fr/' + f + ') : la corriger dans le dépôt, la copie suivante écraserait une modification faite ici._\n';
    fs.writeFileSync(path.join(wiki, nom + '.md'), texte);
  }
  for (const [p] of WIKI_SEULEMENT)
    if (!fs.existsSync(path.join(wiki, p + '.md'))) console.warn('attention : page du wiki absente : ' + p);
  console.log(pages.length + ' pages recopiées dans ' + wiki);
}

if (require.main === module) main();
module.exports = { lien, convertir, WIKI_SEULEMENT };
