#!/usr/bin/env node
/* ═══════════════════════════════════════════
   BUILD — assemble src/*.part + src/*.js -> index.html
   ═══════════════════════════════════════════
   Concatenation PLATE, dans l'ordre du manifeste. Aucun import/export,
   aucune resolution de module : le fichier assemble doit rester
   fonctionnellement identique a la version historique en un seul bloc,
   ou tout communique par variables globales (board, currentTurn,
   humanColor, etc.) sans frontiere de module nulle part. De vrais modules
   ES6 forceraient a retracer chaque reference croisee -- le meme risque
   qu'on a deconseille de prendre sur le fichier actuel. Choix delibere,
   pas un raccourci : voir la conversation qui a motive ce chantier.

   Usage :
     node tools/build.js            -> ecrit dist/index.html
     node tools/build.js --check    -> compare aussi au index.html actuel
                                        (verifie qu'aucun octet n'a bouge)
*/
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'src');
const MANIFEST = path.join(SRC_DIR, 'MANIFEST.txt');
// Ecrit DIRECTEMENT a la racine : c'est ce que GitHub Pages sert deja
// aujourd'hui (verifie : tous les deploiements de ce projet pointent vers
// index.html a la racine du depot, jamais un sous-dossier). Un dossier
// dist/ separe aurait exige de reconfigurer Pages ou d'ajouter une copie
// manuelle -- source d'oubli evitee en ecrivant au bon endroit directement.
const OUT_FILE = path.join(__dirname, '..', 'index.html');

function build() {
  const names = fs.readFileSync(MANIFEST, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  let out = '';
  for (const name of names) {
    const p = path.join(SRC_DIR, name);
    if (!fs.existsSync(p)) {
      throw new Error('Piece manquante dans src/ : ' + name + ' (listee dans MANIFEST.txt mais absente du disque)');
    }
    out += fs.readFileSync(p, 'utf8');
  }
  return out;
}

/* v3.22 : la CSP n'autorise plus tout code écrit dans la page ('unsafe-inline') ; elle
   nomme chaque bloc <script> du fichier par son empreinte SHA-256, calculée ici à chaque
   assemblage. Un script glissé dans la page (par un pseudo, un fichier importé…) n'a pas
   d'empreinte connue : le navigateur refuse de l'exécuter. Les blocs de données
   (type="application/ld+json" ou autre type non exécutable) n'en ont pas besoin. */
const crypto = require('crypto');
const MARQUE_EMPREINTES = "'sha256-EMPREINTES-DES-SCRIPTS'";
function empreintesScripts(html) {
  const e = [];
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    if (/\ssrc\s*=/i.test(attrs)) continue;
    const type = /\stype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs);
    if (type && !/^(text\/javascript|application\/javascript|module)$/i.test(type[1])) continue;
    e.push("'sha256-" + crypto.createHash('sha256').update(m[2], 'utf8').digest('base64') + "'");
  }
  return e;
}
function signerScripts(html) {
  if (!html.includes(MARQUE_EMPREINTES)) return html;
  return html.replace(MARQUE_EMPREINTES, empreintesScripts(html).join(' '));
}

function main() {
  const out = signerScripts(build());
  const before = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : null;
  fs.writeFileSync(OUT_FILE, out, 'utf8');
  console.log('index.html ecrit :', Buffer.byteLength(out, 'utf8'), 'octets,', names_count(), 'pieces assemblees');

  if (process.argv.includes('--check')) {
    if (before === null) {
      console.log('--check : aucun index.html preexistant a comparer (premiere generation).');
    } else if (before === out) {
      console.log('--check : IDENTIQUE octet pour octet a la version precedente de index.html');
    } else {
      console.log('--check : DIFFERENT de la version precedente de index.html');
      const len = Math.min(before.length, out.length);
      let firstDiff = -1;
      for (let i = 0; i < len; i++) { if (before[i] !== out[i]) { firstDiff = i; break; } }
      if (firstDiff === -1 && before.length !== out.length) firstDiff = len;
      console.log('  longueur precedente :', before.length, '| longueur assemblee :', out.length);
      console.log('  premiere difference a l\'offset :', firstDiff);
      if (firstDiff >= 0) {
        console.log('  contexte precedent : ...' + before.slice(Math.max(0, firstDiff - 40), firstDiff + 40) + '...');
        console.log('  contexte assemble  : ...' + out.slice(Math.max(0, firstDiff - 40), firstDiff + 40) + '...');
      }
      process.exitCode = 1;
    }
  }
}
function names_count() {
  return fs.readFileSync(MANIFEST, 'utf8').split('\n').map(s => s.trim()).filter(Boolean).length;
}

if (require.main === module) main();
module.exports = { build, signerScripts, empreintesScripts };
