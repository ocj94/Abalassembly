#!/usr/bin/env node
/* ═══════════════════════════════════════════
   SCAN-SECRETS — le filet avant le commit  (v3.47)

   Pourquoi deux filets et pas un : le crochet avant-commit arrete la cle AVANT
   qu'elle entre dans l'historique, l'integration continue rattrape celui qui a
   saute le crochet. Un commit efface ne « des-fuite » rien : une cle poussee
   une fois doit etre revoquee, pas cachee. D'ou le crochet, qui coute une
   seconde, plutot que le nettoyage, qui coute une journee (on l'a fait).

   Celui-ci est volontairement petit et SANS DEPENDANCE : il tourne partout ou
   Node tourne, y compris dans un Codespace vide. L'integration continue, elle,
   passe le vrai gitleaks sur tout l'historique -- il connait des centaines de
   formats que ce fichier n'aura jamais.

   Usage :
     node tools/scan-secrets.js --staged     ce qui est sur le point d'etre commite
     node tools/scan-secrets.js fichier...   des fichiers nommes
   Sortie 1 si quelque chose est trouve.
═══════════════════════════════════════════ */
'use strict';
const { execSync } = require('child_process');
const fs = require('fs'), path = require('path');

/* Des motifs precis plutot que nombreux : chacun doit pouvoir etre explique.
   « entropie » demande en plus que la chaine ne soit pas un mot. */
const MOTIFS = [
  { nom: 'jeton GitHub', re: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b/ },
  { nom: 'jeton GitHub (format long)', re: /\bgithub_pat_[A-Za-z0-9_]{22,}\b/ },
  { nom: 'clé AWS', re: /\b(AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { nom: 'clé privée', re: /-----BEGIN (RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/ },
  { nom: 'jeton Slack', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
  { nom: 'clé Google', re: /\bAIza[0-9A-Za-z_\-]{35}\b/ },
  { nom: 'jeton Stripe', re: /\b(sk|rk)_(live|test)_[A-Za-z0-9]{20,}\b/ },
  { nom: 'jeton JWT', re: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/ },
  { nom: 'secret affecté', re: /(?:api[_-]?key|apikey|secret|token|passwd|password|mot_?de_?passe)\s*[:=]\s*['"]([^'"\s]{20,})['"]/i, entropie: 3.5 }
];

/* Ce qui n'est pas du code a nous, ou ce qui est manifestement un exemple. */
const IGNORES = [/^index\.html$/, /^node_modules\//, /^docs-(fr|en)\//, /^CHANGELOG(\.en)?\.md$/, /\.(png|jpg|jpeg|webp|gif|ico|woff2?|mp3|ogg|zip|b64)$/i];
const EXEMPLES = /(exemple|example|placeholder|votre|your|xxxx|<[a-z-]+>|\.\.\.|REDACTED|changeme|dummy|fake|sample|test[_-]?key)/i;

function entropie(s) {
  const n = {}; for (const c of s) n[c] = (n[c] || 0) + 1;
  let h = 0; for (const k in n) { const p = n[k] / s.length; h -= p * Math.log2(p); }
  return h;
}

function fichiersIndexes() {
  const out = execSync('git diff --cached --name-only --diff-filter=ACM', { encoding: 'utf8' });
  return out.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
}

function examiner(f) {
  if (IGNORES.some(function (r) { return r.test(f); })) return [];
  let texte;
  try {
    const st = fs.statSync(f);
    if (!st.isFile() || st.size > 2 * 1024 * 1024) return [];   // au-dela, ce n'est pas du code
    texte = fs.readFileSync(f, 'utf8');
  } catch (e) { return []; }
  if (texte.indexOf('\u0000') >= 0) return [];                  // binaire
  const trouves = [];
  texte.split('\n').forEach(function (ligne, i) {
    if (ligne.length > 2000) return;                            // une ligne minifiee n'est pas du code ecrit a la main
    MOTIFS.forEach(function (m) {
      const r = m.re.exec(ligne);
      if (!r) return;
      const valeur = r[1] || r[0];
      if (EXEMPLES.test(ligne)) return;
      if (m.entropie && entropie(valeur) < m.entropie) return;
      trouves.push({ fichier: f, ligne: i + 1, quoi: m.nom, apercu: valeur.slice(0, 4) + '…' + valeur.slice(-2) });
    });
  });
  return trouves;
}

function main() {
  const args = process.argv.slice(2);
  const cibles = (args[0] === '--staged' || !args.length) ? fichiersIndexes() : args;
  let trouves = [];
  cibles.forEach(function (f) { trouves = trouves.concat(examiner(f)); });
  if (!trouves.length) {
    if (args.indexOf('--silencieux') < 0) console.log('🔒 Aucun secret repéré dans ' + cibles.length + ' fichier(s).');
    return 0;
  }
  console.error('\n🚨 SECRET POSSIBLE — commit interrompu\n');
  trouves.forEach(function (t) {
    console.error('  ' + t.fichier + ':' + t.ligne + '  ' + t.quoi + '  (' + t.apercu + ')');
  });
  console.error('\nSi c’en est un : NE LE COMMITE PAS, et RÉVOQUE-LE.');
  console.error('Effacer le commit ne dés-fuite rien : la clé a existé, il faut la remplacer.');
  console.error('Si c’est un faux positif : « git commit --no-verify », et ajoute le motif aux exemples.\n');
  return 1;
}

if (require.main === module) process.exit(main());
module.exports = { examiner, entropie, MOTIFS };
