/* ═══════════════════════════════════════════
   UNE ADRESSE PAR PAGE (v2.64)
   Demande d'ocj94 : chaque entree du menu a son adresse, par exemple
   https://ocj94.github.io/Abalassembly/#corpus pour les Stats du corpus.
   - Ouvrir une page met son adresse dans la barre (history.pushState) : le
     bouton Retour du navigateur ou du telephone revient a la page d'avant.
     L'accueil garde l'adresse nue.
   - Arriver sur le site par une de ces adresses ouvre directement la page
     (l'intro est passee).
   - Adresses en francais, ou en anglais quand le site est en anglais ; les
     deux sont toujours comprises, comme les noms internes des pages
     (#corpusstats) et les accents (#problèmes).
   - Les fenetres du menu (Importer, Bibliotheque de parties, Fiche pour IA)
     ont aussi la leur ; refermees, l'adresse revient a la page dessous.
   - Une partie en cours n'est jamais recommencee par une adresse : #partie la
     remontre telle quelle (showPage('game') en relancerait une).
   - Le mode Enfant garde ses interdits (#labo, #parametres), comme au menu.
   - Les liens qui existaient passent avant : ?partie=, ?pos=, ?defi et
     ?partage ouvrent ce qu'ils ouvrent, l'adresse de page attend.
═══════════════════════════════════════════ */

// [page (ou fenetre du menu), adresse en francais, adresse en anglais] -- dans l'ordre du menu
const ADRESSES_PAGES = [
  ['home', 'accueil', 'home'], ['setup', 'jouer', 'play'], ['game', 'partie', 'game'], ['historique', 'historique', 'history'],
  ['corpusstats', 'corpus', 'corpus'], ['import', 'importer', 'import'], ['puzzles', 'problemes', 'puzzles'], ['editor', 'editeur', 'editor'],
  ['variants', 'variantes', 'variants'],
  ['aide', 'aide', 'help'], ['learn', 'regles', 'rules'], ['plateau', 'plateau', 'real-board'], ['academy', 'academy', 'academy'],
  ['openings', 'ouvertures', 'openings'], ['analysis', 'analyse', 'analysis'], ['stats', 'mes-statistiques', 'my-statistics'],
  ['gym', 'gym', 'brain-gym'], ['formateurs', 'formateurs', 'trainers'],
  ['lab', 'labo', 'lab'], ['library', 'bibliotheque', 'library'], ['tablebase', 'finales', 'endgames'], ['camera', 'photo', 'photo'],
  ['biblio', 'documentation', 'documentation'], ['github', 'github', 'github'], ['archi', 'architecture', 'architecture'],
  ['briefing', 'fiche-ia', 'ai-sheet'], ['museum', 'musee', 'museum'], ['pioneers', 'pionniers', 'pioneers'],
  ['trombi', 'trombinoscope', 'members'], ['leaderboard', 'classement', 'leaderboard'], ['observe', 'observer', 'watch'],
  ['community', 'communaute', 'community'], ['tournament', 'tournoi', 'tournament'], ['compare', 'comparer', 'compare'],
  ['friends', 'amis', 'friends'], ['profile', 'profil', 'profile'], ['settings', 'parametres', 'settings'], ['synchro', 'synchroniser', 'sync'],
  ['mentions', 'mentions', 'legal'], ['privacy', 'confidentialite', 'privacy']
];
// les noms complets du menu, tapes a la main, menent aussi a la bonne page
const _ADR_AUTRES = {
  'statistiques': 'stats', 'stats-du-corpus': 'corpusstats', 'statistiques-du-jeu': 'corpusstats', 'regles-du-jeu': 'learn',
  'sur-un-vrai-plateau': 'plateau', 'vrai-plateau': 'plateau', 'abalone-academy': 'academy', 'gym-cerveau': 'gym',
  'formation-formateurs': 'formateurs', 'labo-ia': 'lab', 'bibliotheque-de-parties': 'library', 'tables-de-finale': 'tablebase',
  'detection-photo': 'camera', 'fiche-pour-ia': 'briefing', 'game-rules': 'learn', 'corpus-stats': 'corpusstats',
  'game-library': 'library', 'endgame-tables': 'tablebase', 'ai-lab': 'lab', 'trainer-course': 'formateurs'
};
// fenetres du menu : comment les ouvrir et les fermer
const _ADR_FENETRES = {
  import:   { id: 'apgn-import-modal', ouvrir: function(){ openApgnImportModal(); }, fermer: function(el){ el.remove(); } },
  library:  { id: 'migs-modal',        ouvrir: function(){ openMigsBrowser(); },     fermer: function(){ closeMigsBrowser(); } },
  briefing: { id: 'briefing-modal',    ouvrir: function(){ openSiteBriefing(); },    fermer: function(el){ el.remove(); } },
  synchro:  { id: 'sync-modal',        ouvrir: function(){ openSyncModal(); },       fermer: function(){ closeSyncModal(); } }   // v2.69
};
const _ADR_OUVREURS = { import: 'openApgnImportModal', library: 'openMigsBrowser', briefing: 'openSiteBriefing', synchro: 'openSyncModal' };

let _adrMode = null;          // null : l'utilisateur navigue (nouvelle entree d'historique) ; 'adresse' : on suit la barre d'adresse (on corrige sans empiler)
let _adrPret = false;         // rien n'est ecrit dans l'adresse avant d'avoir lu celle d'arrivee
let _adrFenetre = null, _adrObs = null;

function _adrNorm(s){
  let t = String(s == null ? '' : s).replace(/^#/, '');
  try { t = decodeURIComponent(t); } catch (e) {}
  return t.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[\s_]+/g, '-');
}
// adresse -> page (ou fenetre), null si inconnue
function _adrLire(h){
  const s = _adrNorm(h);
  if (!s) return null;
  for (let i = 0; i < ADRESSES_PAGES.length; i++) {
    const l = ADRESSES_PAGES[i];
    if (s === l[1] || s === l[2] || s === l[0].toLowerCase()) return l[0];
  }
  return _ADR_AUTRES[s] || null;
}
// page -> adresse dans la langue du site ('' pour l'accueil : l'adresse nue)
function _adrPour(page){
  if (page === 'home') return '';
  for (let i = 0; i < ADRESSES_PAGES.length; i++) {
    const l = ADRESSES_PAGES[i];
    if (l[0] === page) return (typeof currentLang === 'function' && currentLang() === 'EN') ? l[2] : l[1];
  }
  return null;
}
function _adrPageActive(){
  const pg = (typeof document !== 'undefined' && document.querySelector) ? document.querySelector('.page.active') : null;
  return pg && pg.id ? pg.id.replace(/^page-/, '') : 'home';
}
function _adrFenetreOuverte(cle){
  const f = _ADR_FENETRES[cle], el = f && document.getElementById(f.id);
  if (!el || el.isConnected === false) return false;
  if (el.style && el.style.display === 'none') return false;
  try { return getComputedStyle(el).display !== 'none'; } catch (e) { return true; }
}
// ecrit l'adresse : nouvelle entree d'historique (navigation) ou remplacement (correction)
function _adrPoser(adresse, remplacer){
  if (adresse === null || adresse === undefined) return;
  if (typeof history === 'undefined' || !history.pushState || typeof location === 'undefined') return;
  const actuelle = String(location.hash || '').replace(/^#/, '');
  if (actuelle === adresse) return;
  const url = location.pathname + (location.search || '') + (adresse ? '#' + adresse : '');
  try { history[remplacer ? 'replaceState' : 'pushState'](null, '', url); } catch (e) {}
}
// l'adresse suit ce qui est vraiment a l'ecran : une fenetre du menu ouverte, sinon la page
function _adrSuivre(remplacer){
  if (!_adrPret) return;
  const cle = (_adrFenetre && _adrFenetreOuverte(_adrFenetre)) ? _adrFenetre : _adrPageActive();
  _adrPoser(_adrPour(cle), remplacer || _adrMode === 'adresse');
}

// #partie : une partie deja la (en cours ou finie : ses coups sont dans boardSnapshots) est
// remontree telle quelle ; sinon une partie sauvegardee est proposee a la reprise ; sinon la
// page pour en preparer une. (Pas MoveCount : il vaut 14 au demarrage, valeur historique.)
function _adrPartie(){
  if (typeof boardSnapshots !== 'undefined' && boardSnapshots && boardSnapshots.length > 0) {
    document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
    const pg = document.getElementById('page-game'); if (pg) pg.classList.add('active');
    document.querySelectorAll('.sidebar-item').forEach(function(b){ b.classList.remove('active'); });
    if (typeof window.scrollTo === 'function') window.scrollTo(0, 0);
    try { if (typeof drawBoard === 'function') drawBoard(); } catch (e) {}
    return;
  }
  let sauvee = false;
  try { const raw = localStorage.getItem('abalone_saved_game'), s = raw && JSON.parse(raw); sauvee = !!(s && s.board && Object.keys(s.board).length); } catch (e) {}
  showPage(sauvee ? 'game' : 'setup');
}
// ouvre la page (ou la fenetre) d'une adresse, sans empiler d'entree d'historique
function _adrAller(cible){
  const avant = _adrMode; _adrMode = 'adresse';
  try {
    if (_ADR_FENETRES[cible]) _ADR_FENETRES[cible].ouvrir();
    else if (cible === 'lab') { if (typeof openLabFromMenu === 'function') openLabFromMenu(document.getElementById('sid-lab')); }
    else if (cible === 'game') _adrPartie();
    else if (typeof sidebarNav === 'function') sidebarNav(cible, null);
    else showPage(cible);
  } finally {
    _adrSuivre(true);     // l'adresse dit ce qui s'est vraiment ouvert (refus du mode Enfant, nom de page a mettre au propre)
    _adrMode = avant;
  }
}
// une fenetre du menu vient de s'ouvrir : son adresse, et on guette sa fermeture
function _adrFenetreSuivie(cle){
  if (!_adrFenetreOuverte(cle)) return;
  _adrFenetre = cle;
  if (_adrPret) _adrPoser(_adrPour(cle), _adrMode === 'adresse');
  if (_adrObs) { _adrObs.disconnect(); _adrObs = null; }
  if (typeof MutationObserver === 'undefined' || !document.body) return;
  _adrObs = new MutationObserver(function(){
    if (_adrFenetreOuverte(cle)) return;
    if (_adrObs) { _adrObs.disconnect(); _adrObs = null; }
    if (_adrFenetre === cle) { _adrFenetre = null; _adrSuivre(true); }   // refermee : l'adresse revient a la page dessous
  });
  _adrObs.observe(document.body, { childList: true });
  const el = document.getElementById(_ADR_FENETRES[cle].id);
  if (el) _adrObs.observe(el, { attributes: true, attributeFilter: ['style'] });
}
// Retour, Avance, ou adresse tapee a la main
function _adrSurChangement(){
  if (!_adrPret || typeof location === 'undefined') return;
  const brut = String(location.hash || '');
  if (!brut && /#$/.test(String(location.href || ''))) return;   // un « # » seul : rien a ouvrir
  const cible = brut ? _adrLire(brut) : 'home';
  if (!cible) return;                                             // adresse inconnue : on ne bouge pas
  if (_adrFenetre && _adrFenetre !== cible && _adrFenetreOuverte(_adrFenetre)) {
    const f = _ADR_FENETRES[_adrFenetre]; _adrFenetre = null;
    f.fermer(document.getElementById(f.id));
  }
  if (_ADR_FENETRES[cible] ? _adrFenetreOuverte(cible) : (cible === _adrPageActive())) { _adrSuivre(true); return; }   // deja la
  _adrAller(cible);
}
// a l'arrivee sur le site
function _adrAuChargement(){
  if (typeof location === 'undefined') { _adrPret = true; return; }
  const brut = String(location.hash || '');
  const autreLien = /[?&](partie|pos|defi|partage)(=|&|$)/.test(location.search || '');
  _adrPret = true;
  if (!brut || autreLien) return;
  const cible = _adrLire(brut);
  if (!cible) return;
  if (typeof skipIntro === 'function') skipIntro();   // venu pour une page : directement la page
  if (cible === 'home') { _adrPoser('', true); return; }
  _adrAller(cible);
}

/* Branchements : apres chaque page ouverte, apres chaque fenetre du menu
   ouverte, et au changement de langue (l'adresse passe dans l'autre langue). */
(function(){
  if (typeof showPage === 'function') {
    const precedent = showPage;
    showPage = function(){ const r = precedent.apply(this, arguments); _adrSuivre(false); return r; };
  }
  Object.keys(_ADR_OUVREURS).forEach(function(cle){
    const nom = _ADR_OUVREURS[cle], avant = window[nom];
    if (typeof avant !== 'function') return;
    window[nom] = function(){ const r = avant.apply(this, arguments); _adrFenetreSuivie(cle); return r; };
  });
  if (typeof setLanguage === 'function') {
    const avantLangue = setLanguage;
    setLanguage = function(){ const r = avantLangue.apply(this, arguments); _adrSuivre(true); return r; };
  }
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('popstate', _adrSurChangement);
    window.addEventListener('hashchange', _adrSurChangement);
  }
  if (typeof document !== 'undefined' && document.addEventListener) {
    // apres tous les autres reglages de demarrage (mode Enfant, liens ?partie= ...)
    const go = function(){ setTimeout(_adrAuChargement, 0); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }
})();
