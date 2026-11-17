/* ═══════════════════════════════════════════
   LA VOIX DES COUPS  (v3.42)
   Demande d'ocj94 : « à chaque déplacement la voix dirait le mouvement,
   a1 en a2 ». Utile pour rejouer la partie sur un vrai plateau sans quitter
   le plateau des yeux, et utile tout court quand on ne voit pas l'écran.

   Le texte suit la notation Aba-Pro deja utilisee partout sur le site
   (coordToABAPRO) : pour un coup en ligne, le depart et l'arrivee de la bille
   de QUEUE, qui se deplace toujours d'une seule case. Rien n'est reinvente ici,
   et la voix ne peut donc jamais dire autre chose que la notation affichee.

   Prononciation : « a1 » lu tel quel donne « a-un » colle, difficile a suivre.
   On ecrit donc « A 1 » (lettre, espace, chiffre), ce qui force la synthese a
   detacher les deux. Les lettres sont dites en majuscule pour la meme raison.

   Tout passe par speechSynthesis, present dans le navigateur, sans reseau et
   sans fichier audio : rien a telecharger, et le site reste un seul fichier.
   Quand le navigateur n'en a pas, les reglages le disent au lieu de rester
   muets sans explication.
═══════════════════════════════════════════ */
const VOIX_CLE = 'abaVoix';
const VOIX_DEBITS = [[0.7, 'lent', 'slow'], [1, 'normal', 'normal'], [1.3, 'rapide', 'fast']];

let VOIX = { on: false, qui: 'tous', debit: 1, voix: '', camp: true };

function _voixLire() {
  try {
    const b = JSON.parse(localStorage.getItem(VOIX_CLE) || '{}');
    if (b && typeof b === 'object') {
      if (typeof b.on === 'boolean') VOIX.on = b.on;
      if (b.qui === 'tous' || b.qui === 'adverse' || b.qui === 'moi') VOIX.qui = b.qui;
      if (b.debit > 0) VOIX.debit = Math.min(2, Math.max(0.5, b.debit));
      if (typeof b.voix === 'string') VOIX.voix = b.voix;
      if (typeof b.camp === 'boolean') VOIX.camp = b.camp;
    }
  } catch (e) { /* stockage indisponible : on garde les valeurs par defaut */ }
  return VOIX;
}
function _voixEcrire() { try { localStorage.setItem(VOIX_CLE, JSON.stringify(VOIX)); } catch (e) { } }

function voixDisponible() {
  return typeof speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
}
/* Les voix du navigateur dans la langue du site, puis les autres. Sur certains
   navigateurs la liste arrive vide au premier appel et se remplit plus tard :
   d'ou le rafraichissement sur l'evenement voiceschanged, plus bas. */
function voixListe() {
  if (!voixDisponible()) return [];
  let L = [];
  try { L = speechSynthesis.getVoices() || []; } catch (e) { return []; }
  const pre = (typeof currentLang === 'function' && currentLang() === 'EN') ? 'en' : 'fr';
  return L.slice().sort(function (a, b) {
    const x = (a.lang || '').toLowerCase().indexOf(pre) === 0 ? 0 : 1;
    const y = (b.lang || '').toLowerCase().indexOf(pre) === 0 ? 0 : 1;
    return x - y || String(a.name).localeCompare(String(b.name));
  });
}

/* « e5 » → « E 5 » : la synthese detache la lettre du chiffre. */
function voixCase(cell) {
  if (!cell) return '';
  return String(cell).charAt(0).toUpperCase() + ' ' + String(cell).slice(1);
}

/* La phrase d'un coup, a partir de ce que le moteur donne deja a
   addMoveToHistory : { cells, dir, type, ejection }. */
function voixPhrase(color, info, monTour) {
  if (!info || !info.cells || !info.cells.length || !info.dir) return '';
  if (typeof coordToABAPRO !== 'function' || typeof rcToAxial !== 'function' || typeof axialToRc !== 'function') return '';
  const T = function (fr, en) { return (typeof _tr === 'function') ? _tr(fr, en) : fr; };
  const n = info.cells.length;
  let phrase = '';
  if (VOIX.camp && !monTour) phrase += (color === 'black' ? T('Noirs, ', 'Black, ') : T('Blancs, ', 'White, '));
  if (info.type === 'broadside') {
    /* Coup en fleche : les billes avancent de front. On nomme les deux
       extremites de la rangee et la destination de la premiere, comme
       l'Aba-Pro ; la direction est dite en clair, elle est plus parlante
       qu'une troisieme coordonnee quand on a le plateau sous les yeux. */
    const coords = info.cells.map(function (s) { return { rc: s, n: coordToABAPRO(s.r, s.c) }; });
    coords.sort(function (a, b) { return a.n < b.n ? -1 : 1; });
    const a = coords[0].rc, z = coords[coords.length - 1].rc;
    const ax = rcToAxial(a.r, a.c), dest = axialToRc(ax.q + info.dir.q, ax.r + info.dir.r);
    phrase += T('en flèche, ', 'broadside, ') + voixCase(coordToABAPRO(a.r, a.c)) + ' ' + voixCase(coordToABAPRO(z.r, z.c))
      + T(', en ', ', to ') + (dest ? voixCase(coordToABAPRO(dest.r, dest.c)) : '');
  } else {
    // Coup en ligne : depart et arrivee de la bille de queue (notation Aba-Pro)
    const axs = info.cells.map(function (s) { return rcToAxial(s.r, s.c); });
    axs.sort(function (a, b) { return (a.q * info.dir.q + a.r * info.dir.r) - (b.q * info.dir.q + b.r * info.dir.r); });
    const queue = axs[0];
    const de = axialToRc(queue.q, queue.r), vers = axialToRc(queue.q + info.dir.q, queue.r + info.dir.r);
    if (n > 1) phrase += (n === 2 ? T('deux billes, ', 'two marbles, ') : T('trois billes, ', 'three marbles, '));
    phrase += (de ? voixCase(coordToABAPRO(de.r, de.c)) : '') + T(' en ', ' to ') + (vers ? voixCase(coordToABAPRO(vers.r, vers.c)) : '');
  }
  if (info.ejection) phrase += T(', éjection', ', ejection');
  else if (info.type === 'push') phrase += T(', poussée', ', push');
  return phrase;
}

/* Dit une phrase. Toute annonce en cours est coupee : en partie rapide, la
   derniere annonce est la seule qui compte, et une file d'attente finirait par
   parler d'un coup joue il y a trois tours. */
function voixDire(texte) {
  if (!texte || !voixDisponible()) return false;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.rate = VOIX.debit;
    u.lang = (typeof currentLang === 'function' && currentLang() === 'EN') ? 'en-GB' : 'fr-FR';
    if (VOIX.voix) {
      const v = voixListe().filter(function (x) { return x.name === VOIX.voix; })[0];
      if (v) { u.voice = v; u.lang = v.lang || u.lang; }
    }
    speechSynthesis.speak(u);
    return true;
  } catch (e) { return false; }
}

/* Appele par addMoveToHistory, pour tout coup reellement joue : humain, IA,
   partie en direct, duel de robots. Jamais pendant une relecture : celle-ci
   ne repasse pas par cette fonction. */
function voixCoupJoue(color, info) {
  if (!VOIX.on || !voixDisponible()) return '';
  const moi = (typeof monCamp === 'function') ? monCamp() : 'black';
  const monTour = (color === moi);
  if (VOIX.qui === 'moi' && !monTour) return '';
  if (VOIX.qui === 'adverse' && monTour) return '';
  const phrase = voixPhrase(color, info, monTour);
  if (phrase) voixDire(phrase);
  return phrase;
}

/* ── Les réglages (page Paramètres) ── */
function voixBasculer(on) { VOIX.on = !!on; _voixEcrire(); if (VOIX.on) voixTester(); }
function voixReglage(champ, valeur) {
  if (champ === 'qui') VOIX.qui = valeur;
  else if (champ === 'debit') VOIX.debit = parseFloat(valeur) || 1;
  else if (champ === 'voix') VOIX.voix = valeur || '';
  else if (champ === 'camp') VOIX.camp = !!valeur;
  _voixEcrire();
  if (champ !== 'qui') voixTester();
}
/* Un vrai coup d'exemple, pas une phrase inventee : on entend exactement ce
   que la partie dira. */
function voixTester() {
  if (!voixDisponible()) return '';
  const T = function (fr, en) { return (typeof _tr === 'function') ? _tr(fr, en) : fr; };
  const phrase = (typeof abaproToRc === 'function')
    ? voixPhrase('black', { cells: [abaproToRc('e5'), abaproToRc('e6')], dir: { q: 1, r: -1 }, type: 'push', ejection: false }, true)
    : T('essai', 'test');
  voixDire(phrase);
  return phrase;
}

function voixReglagesHtml() {
  const T = function (fr, en) { return (typeof _tr === 'function') ? _tr(fr, en) : fr; };
  if (!voixDisponible()) {
    return '<div style="font-size:12px;color:var(--muted)">'
      + T('Ce navigateur n\'a pas de synthèse vocale : la voix des coups ne peut pas fonctionner ici.',
          'This browser has no speech synthesis: move announcements cannot work here.') + '</div>';
  }
  const opt = function (v, t, actuel) { return '<option value="' + v + '"' + (String(v) === String(actuel) ? ' selected' : '') + '>' + t + '</option>'; };
  let h = '<label class="setup-toggle"><span>' + T('Annoncer chaque coup à voix haute', 'Announce every move out loud') + '</span>'
    + '<input type="checkbox" id="voix-on"' + (VOIX.on ? ' checked' : '') + ' data-change="voixBasculer(this.checked);voixRendreReglages()">'
    + '<span class="setup-sw"></span></label>';
  h += '<div id="voix-detail" style="' + (VOIX.on ? '' : 'display:none') + '">';
  h += '<div class="voix-ligne"><span>' + T('Quels coups', 'Which moves') + '</span><select data-change="voixReglage(\'qui\', this.value)">'
    + opt('tous', T('tous les coups', 'every move'), VOIX.qui)
    + opt('adverse', T('ceux de l\'adversaire', 'the opponent\'s'), VOIX.qui)
    + opt('moi', T('les miens', 'mine'), VOIX.qui) + '</select></div>';
  h += '<div class="voix-ligne"><span>' + T('Débit', 'Rate') + '</span><select data-change="voixReglage(\'debit\', this.value)">'
    + VOIX_DEBITS.map(function (d) { return opt(d[0], T(d[1], d[2]), VOIX.debit); }).join('') + '</select></div>';
  const L = voixListe();
  if (L.length) {
    h += '<div class="voix-ligne"><span>' + T('Voix', 'Voice') + '</span><select data-change="voixReglage(\'voix\', this.value)">'
      + opt('', T('celle du navigateur', 'the browser\'s'), VOIX.voix)
      + L.slice(0, 40).map(function (v) { return opt(v.name, v.name + ' (' + (v.lang || '') + ')', VOIX.voix); }).join('') + '</select></div>';
  }
  h += '<label class="setup-toggle"><span>' + T('Dire le camp quand ce n\'est pas toi qui joues', 'Say the side when the move is not yours') + '</span>'
    + '<input type="checkbox"' + (VOIX.camp ? ' checked' : '') + ' data-change="voixReglage(\'camp\', this.checked)">'
    + '<span class="setup-sw"></span></label>';
  h += '<button class="voix-btn" data-click="voixTester()">🔊 ' + T('Écouter un exemple', 'Hear an example') + '</button>';
  h += '<div style="font-size:11.5px;color:var(--muted);margin-top:8px">'
    + T('La voix suit la notation Aba-Pro affichée sur le plateau : pour un groupe, le départ et l\'arrivée de la bille de queue.',
        'The voice follows the Aba-Pro notation shown on the board: for a group, the tail marble\'s departure and arrival.') + '</div>';
  return h + '</div>';
}

function voixRendreReglages() {
  const h = document.getElementById('voix-reglages');
  if (h) h.innerHTML = voixReglagesHtml();
}

(function () {
  _voixLire();
  /* La liste des voix arrive souvent apres le chargement : on redessine les
     reglages quand elle change, sinon le menu deroulant reste vide. */
  if (voixDisponible() && typeof speechSynthesis.addEventListener === 'function') {
    speechSynthesis.addEventListener('voiceschanged', function () {
      if (document.getElementById('voix-reglages')) voixRendreReglages();
    });
  }
})();
