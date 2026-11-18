/* ═══════════════════════════════════════════
   LE CALENDRIER  (v3.44)
   Demande d'ocj94, d'apres la grille « ChessTV Schedule » de chess.com :
   des jours en colonnes, des heures en lignes, et des blocs colores.

   Ce que le site peut y mettre, sans rien inventer :
   - les parties, qui portent une date complete -> placees a leur heure ;
   - les seances du Labo, reconstituees du journal comme en v3.37 (une seance
     se coupe apres dix minutes sans partie) -> un bloc du debut a la fin ;
   - les defis du jour, qui n'ont qu'un jour et pas d'heure -> une bande en
     tete de colonne, comme les evenements en haut de la grille de chess.com.

   Les jours a venir ne sont pas vides : le defi d'un jour se calcule
   (defiNumero / defiIndex sont deterministes depuis DEFI_DEBUT), donc le
   calendrier annonce les prochains defis au lieu de s'arreter a aujourd'hui.

   La grille ne montre pas les 24 heures : elle se cale sur l'amplitude de ce
   qui s'est passe, avec six lignes au minimum. Une grille de minuit a minuit
   serait vide aux trois quarts.
═══════════════════════════════════════════ */
const CAL_CLE = 'abaCalendrier';
const CAL_SEANCE = 600000;       // meme coupure qu'au Labo : dix minutes
const CAL_H_MIN = 6;             // au moins six lignes d'heures
const CAL_JOURS_FR = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const CAL_JOURS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CAL_MOIS_FR = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const CAL_MOIS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let _calDecalage = 0;            // en jours, 0 = la fenetre qui finit aujourd'hui + 2

function _calT(fr, en) { return (typeof _tr === 'function') ? _tr(fr, en) : fr; }
function _calE(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
/* La cle d'un jour civil LOCAL. Les dates sont stockees en ISO (UTC) : passer
   par une cle locale evite qu'une partie de 00h30 compte pour la veille. */
function calJour(d) { return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); }
function calDate(cle) { return new Date(Math.floor(cle / 10000), Math.floor(cle / 100) % 100 - 1, cle % 100); }

/* Combien de colonnes : trois sur un telephone, sept sur un ecran large. */
function calNbJours() {
  const l = (typeof window !== 'undefined' && window.innerWidth) ? window.innerWidth : 1280;
  return l < 700 ? 3 : (l < 1100 ? 5 : 7);
}
/* La fenetre affichee : elle se termine deux jours apres aujourd'hui, pour que
   les prochains defis soient visibles sans avoir a avancer. */
function calFenetre(n, decalage) {
  const fin = new Date(); fin.setHours(12, 0, 0, 0);
  fin.setDate(fin.getDate() + 2 + (decalage || 0));
  const jours = [];
  for (let i = n - 1; i >= 0; i--) { const d = new Date(fin); d.setDate(fin.getDate() - i); jours.push(d); }
  return jours;
}

/* ── Ce qu'il y a a montrer ── */
/* Les parties : une entree par partie, a son heure. */
function calParties() {
  if (typeof getGameHistory !== 'function') return [];
  const out = [];
  getGameHistory().forEach(function (g) {
    const t = Date.parse(g.date); if (!t) return;
    const d = new Date(t);
    out.push({
      genre: 'partie', t: t, jour: calJour(d), h: d.getHours() + d.getMinutes() / 60, duree: 0.5,
      titre: (g.mode === 'ai' ? _calT('Partie contre l\'IA', 'Game vs AI') : _calT('Partie', 'Game')),
      detail: (g.moveCount || 0) + _calT(' coups', ' moves')
        + (g.winner ? ' · ' + (g.winner === (g.humanColor || 'black') ? _calT('gagnée', 'won') : _calT('perdue', 'lost')) : ''),
      heure: d
    });
  });
  return out;
}
/* Les seances du Labo : on recolle les entrees du journal separees de moins de
   dix minutes, et le bloc va du debut a la fin de la seance. */
function calSeances() {
  if (typeof _labDataLoad !== 'function') return [];
  const L = _labDataLoad().filter(function (e) { return e && e.t; }).sort(function (a, b) { return a.t - b.t; });
  const out = []; let debut = null, fin = null, n = 0;
  const poser = function () {
    if (debut == null) return;
    const a = new Date(debut), b = new Date(fin);
    const hA = a.getHours() + a.getMinutes() / 60;
    // une seance qui passe minuit est coupee a la fin du jour : une colonne = un jour
    const hB = (calJour(b) === calJour(a)) ? b.getHours() + b.getMinutes() / 60 : 24;
    out.push({
      genre: 'labo', t: debut, jour: calJour(a), h: hA, duree: Math.max(0.5, hB - hA),
      titre: _calT('Séance du Labo', 'Lab session'),
      /* La duree se lit dans le texte plutot que dans la hauteur du bloc : une
         case = une heure, un bloc qui deborderait ne serait pas lisible. */
      detail: '→ ' + ((calJour(b) === calJour(a)) ? (b.getHours() + ':' + (b.getMinutes() < 10 ? '0' : '') + b.getMinutes()) : '24:00')
        + ' · ' + n + _calT(' parties', ' games'), heure: a, fin: b
    });
  };
  L.forEach(function (e) {
    if (debut != null && e.t - fin > CAL_SEANCE) { poser(); debut = null; }
    if (debut == null) { debut = e.t; n = 0; }
    fin = e.t; n++;
  });
  poser();
  return out;
}
/* Les defis : un par jour de la fenetre, passe ou a venir. */
function calDefis(jours) {
  if (typeof defiNumero !== 'function') return {};
  const faits = (typeof progress !== 'undefined' && progress && progress.defis) ? progress.defis : {};
  const aujourdhui = calJour(new Date());
  const out = {};
  jours.forEach(function (d) {
    const k = calJour(d), n = defiNumero(d), e = faits[n];
    let etat = 'avenir';
    if (k < aujourdhui || k === aujourdhui) {
      if (e && e.f === 'v' && e.j === n) etat = 'reussi';
      else if (e) etat = 'manque';
      else etat = (k === aujourdhui) ? 'aujourdhui' : 'nonjoue';
    }
    out[k] = { n: n, etat: etat, ms: (e && e.ms) || 0 };
  });
  return out;
}

/* L'amplitude d'heures a dessiner : ce qui est occupe, plus une ligne de marge,
   et six lignes au minimum. */
function calAmplitude(evts) {
  // bornes exclusives : [14, 20] fait bien six lignes, de 14 h a 19 h
  if (!evts.length) return [14, 14 + CAL_H_MIN];
  let a = 24, b = 0;
  evts.forEach(function (e) { a = Math.min(a, Math.floor(e.h)); b = Math.max(b, Math.ceil(e.h + e.duree)); });
  a = Math.max(0, a - 1); b = Math.min(24, b + 1);
  while (b - a < CAL_H_MIN) { if (a > 0) a--; else if (b < 24) b++; else break; }
  return [a, b];
}

/* ── La page ── */
function _calEtiquetteJour(d) {
  const fr = (typeof currentLang !== 'function' || currentLang() !== 'EN');
  return (fr ? CAL_JOURS_FR : CAL_JOURS_EN)[d.getDay()] + ' ' + d.getDate() + ' ' + (fr ? CAL_MOIS_FR : CAL_MOIS_EN)[d.getMonth()];
}
function _calHeure(h) { return (h < 10 ? '0' : '') + Math.floor(h) + ':00'; }

function calendrierHtml() {
  const n = calNbJours(), jours = calFenetre(n, _calDecalage);
  const cles = jours.map(calJour), premier = cles[0], dernier = cles[cles.length - 1];
  const tous = calParties().concat(calSeances()).filter(function (e) { return e.jour >= premier && e.jour <= dernier; });
  const defis = calDefis(jours);
  const [hA, hB] = calAmplitude(tous);
  const aujourdhui = calJour(new Date());

  let h = '<div class="cal-barre">';
  h += '<button class="cal-fleche" data-click="calDeplacer(-' + n + ')" aria-label="' + _calT('jours précédents', 'previous days') + '">◀</button>';
  h += '<span class="cal-periode">' + _calE(_calEtiquetteJour(jours[0]) + ' — ' + _calEtiquetteJour(jours[n - 1])) + '</span>';
  h += '<button class="cal-fleche" data-click="calDeplacer(' + n + ')" aria-label="' + _calT('jours suivants', 'next days') + '">▶</button>';
  if (_calDecalage !== 0) h += '<button class="cal-auj" data-click="calDeplacer(0, true)">' + _calT('Aujourd\'hui', 'Today') + '</button>';
  h += '</div>';

  h += '<div class="cal-grille" style="grid-template-columns:52px repeat(' + n + ',1fr)">';
  // en-tete
  h += '<div class="cal-coin"></div>';
  jours.forEach(function (d) {
    const k = calJour(d);
    h += '<div class="cal-tete' + (k === aujourdhui ? ' cal-auj-col' : '') + '">' + _calE(_calEtiquetteJour(d)) + '</div>';
  });
  // bande des defis, hors de la grille horaire puisqu'un defi n'a pas d'heure
  h += '<div class="cal-h cal-h-bande">' + _calT('défi', 'daily') + '</div>';
  jours.forEach(function (d) {
    const k = calJour(d), f = defis[k];
    if (!f) { h += '<div class="cal-bande"></div>'; return; }
    const mots = { reussi: ['✅', _calT('Défi n° ', 'Challenge #')], manque: ['❌', _calT('Défi n° ', 'Challenge #')],
                   aujourdhui: ['🎯', _calT('Défi du jour n° ', 'Today\'s challenge #')], nonjoue: ['—', _calT('Défi n° ', 'Challenge #')],
                   avenir: ['📅', _calT('Défi n° ', 'Challenge #')] }[f.etat];
    h += '<div class="cal-bande"><span class="cal-defi cal-defi-' + f.etat + '">' + mots[0] + ' ' + _calE(mots[1] + f.n) + '</span></div>';
  });
  // grille horaire
  for (let hh = hA; hh < hB; hh++) {
    h += '<div class="cal-h">' + _calHeure(hh) + '</div>';
    jours.forEach(function (d) {
      const k = calJour(d);
      const dedans = tous.filter(function (e) { return e.jour === k && Math.floor(e.h) === hh; });
      h += '<div class="cal-case' + (k === aujourdhui ? ' cal-auj-col' : '') + '">';
      dedans.forEach(function (e) {
        const hauteur = Math.max(1, Math.round(e.duree * 10) / 10);
        h += '<div class="cal-bloc cal-' + e.genre + '" style="min-height:' + (18 * hauteur) + 'px" title="'
          + _calE(e.titre + ' · ' + e.detail) + '">'
          + '<b>' + _calE(e.titre) + '</b><span>' + _calE(_calHeure(e.h).replace(':00', ':' + (e.heure.getMinutes() < 10 ? '0' : '') + e.heure.getMinutes()) + ' · ' + e.detail) + '</span></div>';
      });
      h += '</div>';
    });
  }
  h += '</div>';

  const nbP = tous.filter(function (e) { return e.genre === 'partie'; }).length;
  const nbL = tous.filter(function (e) { return e.genre === 'labo'; }).length;
  h += '<div class="cal-pied">' + nbP + _calT(' partie', ' game') + (nbP > 1 ? 's' : '')
    + ' · ' + nbL + _calT(' séance', ' session') + (nbL > 1 ? 's' : '') + _calT(' du Labo', ' in the Lab')
    + _calT(' sur ces ', ' over these ') + n + _calT(' jours.', ' days.') + '</div>';
  if (!tous.length) {
    h += '<div class="cal-vide">' + _calT('Rien de joué sur cette période. Les jours à venir annoncent quand même leur défi : il est calculé d\'avance, pas tiré au sort.',
      'Nothing played in this period. Coming days still announce their challenge: it is computed ahead, not drawn at random.') + '</div>';
  }
  return h;
}

function calDeplacer(n, remiseAZero) {
  _calDecalage = remiseAZero ? 0 : _calDecalage + n;
  try { localStorage.setItem(CAL_CLE, String(_calDecalage)); } catch (e) { }
  renderCalendrierPage();
}

function renderCalendrierPage() {
  const hote = document.getElementById('calendrier-corps');
  if (hote) hote.innerHTML = calendrierHtml();
}
