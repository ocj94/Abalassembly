#!/usr/bin/env node
'use strict';
/* ============================================================================
   VERIFICATION 1/3 — syntaxe des blocs <script> de index.html
   ----------------------------------------------------------------------------
   Abalassembly est un mono-fichier : une erreur de syntaxe dans n'importe quel
   bloc casse toute l'application, sans que rien ne le signale avant l'ouverture
   dans un navigateur. Ce controle passe chaque bloc au parseur de Node.
   Sortie 1 si un bloc ne compile pas.
   ========================================================================== */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const file = process.argv[2] || 'index.html';
const src = fs.readFileSync(file, 'utf8');

// blocs <script> inline. On distingue le JavaScript des donnees embarquees
// (JSON-LD, gabarits) : un bloc type="application/ld+json" contient du JSON,
// le passer au parseur JS produirait une fausse alerte.
const blocks = [], data = [];
const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
const JS_TYPES = ['text/javascript', 'application/javascript', 'module', ''];
let m;
while ((m = re.exec(src)) !== null) {
  const attrs = m[1] || '';
  const t = (attrs.match(/\btype\s*=\s*["']([^"']*)["']/i) || [, ''])[1].toLowerCase();
  const line = src.slice(0, m.index).split('\n').length;
  if (JS_TYPES.indexOf(t) >= 0) blocks.push({ code: m[2], line: line });
  else data.push({ code: m[2], line: line, type: t });
}

if (!blocks.length) {
  console.error('AUCUN bloc <script> trouve dans ' + file + " — le fichier est-il complet ?");
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'abascript-'));
let bad = 0;
blocks.forEach((b, i) => {
  const p = path.join(tmp, 'block' + i + '.js');
  fs.writeFileSync(p, b.code);
  try {
    execFileSync(process.execPath, ['--check', p], { stdio: 'pipe' });
    console.log(`  bloc ${i + 1}/${blocks.length} (ligne ${b.line}, ${b.code.length.toLocaleString('fr-FR')} car.) — OK`);
  } catch (e) {
    bad++;
    const msg = (e.stderr || '').toString().split('\n').filter(Boolean).slice(0, 4).join('\n    ');
    console.error(`  bloc ${i + 1}/${blocks.length} (ligne ${b.line}) — ERREUR DE SYNTAXE\n    ${msg}`);
  }
});

// les blocs de donnees : valides comme JSON quand c'est du JSON
data.forEach(function (b) {
  if (b.type.indexOf('json') < 0) { console.log(`  bloc de donnees ligne ${b.line} (${b.type}) — ignore`); return; }
  try {
    JSON.parse(b.code);
    console.log(`  bloc de donnees ligne ${b.line} (${b.type}) — JSON valide`);
  } catch (e) {
    bad++;
    console.error(`  bloc de donnees ligne ${b.line} (${b.type}) — JSON INVALIDE : ${e.message}`);
  }
});

console.log(bad ? `\n${bad} bloc(s) en erreur.`
                : `\n${blocks.length} blocs JavaScript + ${data.length} bloc(s) de donnees : tout est valide.`);
process.exit(bad ? 1 : 0);
