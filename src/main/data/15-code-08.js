';
/* ═══════════════════════════════════════════
   EMPREINTES COMPLEMENTAIRES (v2.59)
   La page Statistiques du jeu compte toutes les parties embarquees : MIGS,
   AbalOnline, le tournoi PlayStrategy et les parties de reference. La banque
   d'empreintes ne couvrait que les deux premieres : les 12 dimensions
   portaient donc sur moins de parties que la page n'en annoncait. Ce
   complement couvre les autres, avec la meme fonction (calculerEmpreinte) et
   la meme convention : une empreinte apres chaque coup joue, vue du camp qui
   vient de jouer.
   Format (tools/empreintes-complement.js) : uint32 taille de l'en-tete, en-tete
   JSON (n, champs, signature des parties couvertes), puis en colonnes : 1 octet
   (bit 0 : les Blancs viennent de jouer ; bits suivants : 0 PlayStrategy,
   1 reference), uint16 partie, uint16 demi-coup, 12 x int16 (valeur x 1000).
   Il ne nourrit QUE les statistiques du corpus : l'IA et le panneau d'analyse
   restent sur la banque principale.
═══════════════════════════════════════════ */
let EMPREINTES_COMPLEMENT = null;
let _empComplementPret = null;
function ensureEmpreintesComplement(){
  if (_empComplementPret) return _empComplementPret;
  if (typeof DecompressionStream === 'undefined' || !EMPREINTES_COMPLEMENT_B64) { _empComplementPret = Promise.resolve(false); return _empComplementPret; }
  _empComplementPret = _inflB64(EMPREINTES_COMPLEMENT_B64, true).then(function(buf){
    const dv = new DataView(buf), H = dv.getUint32(0, true);
    const entete = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, H)));
    const n = entete.n, D = EMPREINTES_CHAMPS.length;
    if (!Array.isArray(entete.champs) || entete.champs.join() !== EMPREINTES_CHAMPS.join()) return false;
    let off = 4 + H;
    const couleur = new Uint8Array(n), source = new Uint8Array(n), partie = new Uint16Array(n), m = new Uint16Array(n), flat = new Float32Array(n * D);
    for (let i = 0; i < n; i++) { const b = dv.getUint8(off + i); couleur[i] = b & 1; source[i] = b >> 1; }
    off += n;
    for (let i = 0; i < n; i++) partie[i] = dv.getUint16(off + i * 2, true);
    off += n * 2;
    for (let i = 0; i < n; i++) m[i] = dv.getUint16(off + i * 2, true);
    off += n * 2;
    for (let c = 0; c < D; c++) { for (let i = 0; i < n; i++) flat[i * D + c] = dv.getInt16(off + i * 2, true) / 1000; off += n * 2; }
    EMPREINTES_COMPLEMENT = { n: n, sig: entete.sig, entete: entete, couleur: couleur, source: source, partie: partie, m: m, flat: flat };
    return true;
  }).catch(function(){ return false; });
  return _empComplementPret;
}
/* Signature des parties que le complement doit couvrir. Une partie ajoutee ou
   modifiee sans relancer tools/empreintes-complement.js ne correspond plus :
   un test le signale, et la page dit combien de parties ne sont pas comptees. */
function _empComplementSignature(){
  const PS = (typeof PS_TOURNOI_YEARLY_2026 !== 'undefined') ? PS_TOURNOI_YEARLY_2026 : [];
  const REF = (typeof PARTIES_REFERENCE !== 'undefined') ? PARTIES_REFERENCE : [];
  let h = 2166136261;
  const fnv = function(s){ for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } };
  PS.forEach(function(g){ fnv('PS|' + g[0] + '|' + (g[5] || '') + '\n'); });
  REF.forEach(function(g){ fnv('REF|' + g[4] + '|' + (g[6] || '') + '\n'); });
  return 'ps' + PS.length + '-ref' + REF.length + '-' + h.toString(16);
}
