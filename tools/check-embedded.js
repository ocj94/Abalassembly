#!/usr/bin/env node
'use strict';
/* ============================================================================
   VERIFICATION 2/3 — les tables embarquees == les JSON de reference
   ----------------------------------------------------------------------------
   index.html embarque les tablebases en base64 (deltas varint) pour rester un
   mono-fichier hors-ligne. tablebase/tb-2v2.json et tb-3v2.json en sont la
   source. Rien n'empeche les deux de diverger apres une edition manuelle.
   Ce controle decode le base64 embarque et le compare entree par entree.
   Sortie 1 a la moindre difference.
   ========================================================================== */
const fs = require('fs');

const html = fs.readFileSync(process.argv[2] || 'index.html', 'utf8');

function extract(name) {
  const m = html.match(new RegExp('var\\s+' + name + '\\s*=\\s*"([A-Za-z0-9+/=]*)"'));
  if (!m) { console.error('  donnee embarquee ' + name + ' INTROUVABLE dans index.html'); process.exit(1); }
  return m[1];
}
function unpack(b64) {
  const raw = Buffer.from(b64, 'base64').toString('binary');
  const out = []; let i = 0, prev = 0;
  while (i < raw.length) {
    let d = 0, s = 0, c;
    do { c = raw.charCodeAt(i++); d |= (c & 127) << s; s += 7; } while (c & 128);
    prev += d;
    const p = raw.charCodeAt(i++);
    out.push([prev, p >> 4, p & 15]);
  }
  return out;
}

const cases = [
  { name: 'D22', json: 'tablebase/tb-2v2.json', label: 'table 2v2' },
  { name: 'D32', json: 'tablebase/tb-3v2.json', label: 'table 3v2' }
];

let bad = 0;
for (const c of cases) {
  const inline = unpack(extract(c.name));
  const ref = JSON.parse(fs.readFileSync(c.json, 'utf8')).entries
    .slice().sort((a, b) => a[0] - b[0]);
  if (inline.length !== ref.length) {
    console.error(`  ${c.label} : ${inline.length} entrees embarquees contre ${ref.length} dans ${c.json}`);
    bad++; continue;
  }
  let diff = 0, first = null;
  for (let i = 0; i < ref.length; i++) {
    if (inline[i][0] !== ref[i][0] || inline[i][1] !== ref[i][1] || inline[i][2] !== ref[i][2]) {
      diff++; if (!first) first = { i, inline: inline[i], ref: ref[i] };
    }
  }
  if (diff) {
    console.error(`  ${c.label} : ${diff} entree(s) divergentes. Premiere : index ${first.i}, ` +
      `embarque=${JSON.stringify(first.inline)} reference=${JSON.stringify(first.ref)}`);
    bad++;
  } else {
    console.log(`  ${c.label} : ${ref.length.toLocaleString('fr-FR')} entrees identiques a ${c.json}`);
  }
}

// l'arbre d'ouverture doit rester un JSON valide et coherent
try {
  const tree = JSON.parse(fs.readFileSync('tablebase/opening_tree.json', 'utf8'));
  let anomalies = 0, n = 0;
  for (const key in tree) {
    n++;
    if (!/^\d[a-i]/.test(key)) { anomalies++; continue; }
    const pre = +key[0];
    let billes = 0;
    key.slice(1).replace(/([a-i])(\d+)/g, (_, L, d) => { billes += d.length; return ''; });
    if (billes !== 14 - pre) anomalies++;
  }
  if (anomalies) { console.error(`  arbre d'ouverture : ${anomalies} cle(s) incoherentes sur ${n}`); bad++; }
  else console.log(`  arbre d'ouverture : ${n} cles posRef coherentes`);
} catch (e) {
  console.error("  arbre d'ouverture illisible : " + e.message); bad++;
}

console.log(bad ? '\nDivergence detectee.' : '\nDonnees embarquees conformes aux references.');
process.exit(bad ? 1 : 0);
