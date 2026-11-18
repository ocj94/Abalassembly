/* ═══════════════════════════════════════════
   LE MENU EN CATÉGORIES  (v3.43)
   Demande d'ocj94, d'apres les captures de chess.com : sept categories dans la
   barre, et un volet qui s'ouvre a cote avec les entrees de la categorie.

   Le menu avait pris 38 entrees a plat, separees par trois intitules de groupe.
   A la hauteur d'un telephone, la moitie etait sous la ligne de flottaison.

   Principe : LE HTML NE BOUGE PAS. Les boutons existants, avec leurs
   identifiants et leurs data-click, sont DEPLACES (appendChild, pas de copie)
   dans le volet. Tout ce qui les vise continue donc de fonctionner sans rien
   savoir des categories : showPage() met toujours « active » sur #sid-<page>,
   les traductions trouvent toujours leurs data-i18n, et une entree oubliee dans
   le tableau ci-dessous tombe dans « Autre » plutot que de disparaitre.
═══════════════════════════════════════════ */
const MENU_CATS = [
  { id: 'jouer', fr: 'Jouer', en: 'Play',
    items: ['sid-home', 'sid-game', 'sid-campagne', 'sid-variants', 'sid-history', 'sid-import'] },
  { id: 'problemes', fr: 'Problèmes', en: 'Puzzles',
    items: ['sid-puzzles', 'sid-tablebase', 'sid-gym', 'sid-editor'] },
  { id: 'apprendre', fr: 'Apprendre', en: 'Learn',
    items: ['sid-learn', 'sid-academy', 'sid-openings', 'sid-plateau', 'sid-formateurs', 'sid-aide'] },
  { id: 'analyser', fr: 'Analyser', en: 'Analyse',
    items: ['sid-analysis', 'sid-stats', 'sid-corpusstats', 'sid-library', 'sid-camera'] },
  { id: 'explorer', fr: 'Explorer', en: 'Explore',
    items: ['sid-lab', 'sid-archi', 'sid-briefing', 'sid-biblio', 'sid-github'] },
  { id: 'communaute', fr: 'Communauté', en: 'Community',
    items: ['sid-leaderboard', 'sid-observe', 'sid-community', 'sid-tournament', 'sid-compare', 'sid-friends',
            'sid-blog', 'sid-abaonline', 'sid-discord'] },
  { id: 'autre', fr: 'Autre', en: 'Other',
    items: ['sid-museum', 'sid-pioneers', 'sid-trombi'] }
];

let _menuOuvert = '';      // la categorie ouverte, '' si le volet est ferme
let _menuRange = false;    // les entrees ont-elles deja ete deplacees

function menuCatDe(idEntree) {
  for (let i = 0; i < MENU_CATS.length; i++) if (MENU_CATS[i].items.indexOf(idEntree) >= 0) return MENU_CATS[i].id;
  return '';
}
function menuCatNom(c) { return (typeof _tr === 'function') ? _tr(c.fr, c.en) : c.fr; }

/* Deplace chaque entree dans le groupe de sa categorie. Appele une fois, au
   chargement ; les entrees qu'aucune categorie ne reclame rejoignent « Autre »,
   pour qu'une entree ajoutee plus tard reste atteignable meme si on oublie de
   la ranger ici. */
function menuCategories() {
  const volet = document.getElementById('menu-volet'), liste = document.querySelector('.sidebar-items');
  if (!volet || !liste || _menuRange) return false;
  const restantes = [];
  liste.querySelectorAll('.sidebar-item').forEach(function (b) {
    if (!b.classList.contains('menu-cat')) restantes.push(b);
  });
  volet.innerHTML = '';
  MENU_CATS.forEach(function (c) {
    const g = document.createElement('div');
    g.className = 'menu-groupe'; g.id = 'mgrp-' + c.id; g.hidden = true;
    const t = document.createElement('div');
    t.className = 'menu-groupe-titre'; t.textContent = menuCatNom(c);
    g.appendChild(t);
    c.items.forEach(function (id) {
      const el = document.getElementById(id);
      if (el) g.appendChild(el);   // deplacement : l'element garde tout
    });
    volet.appendChild(g);
  });
  // ce qui n'a ete reclame par personne : dans « Autre », jamais perdu
  const autre = document.getElementById('mgrp-autre');
  restantes.forEach(function (b) { if (b.parentElement === liste && autre) autre.appendChild(b); });
  // les intitules de groupe et separateurs d'avant n'ont plus d'objet
  liste.querySelectorAll('.sidebar-group-label, .sidebar-sep, details.sidebar-collapse').forEach(function (n) { n.remove(); });
  _menuRange = true;
  menuSuivreActif();
  return true;
}

/* Ouvre, ferme ou bascule une categorie. */
function menuCat(id, btn) {
  if (!_menuRange) menuCategories();
  const volet = document.getElementById('menu-volet');
  if (!volet) return;
  if (_menuOuvert === id) { menuFermerVolet(); return; }
  _menuOuvert = id;
  MENU_CATS.forEach(function (c) {
    const g = document.getElementById('mgrp-' + c.id);
    if (g) g.hidden = (c.id !== id);
  });
  document.querySelectorAll('.menu-cat').forEach(function (b) {
    const ouvert = (b.id === 'mcat-' + id);
    b.classList.toggle('menu-cat-ouverte', ouvert);
    b.setAttribute('aria-expanded', ouvert ? 'true' : 'false');
  });
  volet.hidden = false;
  menuPlacerVolet(btn || document.getElementById('mcat-' + id));
}

function menuFermerVolet() {
  const volet = document.getElementById('menu-volet');
  if (volet) volet.hidden = true;
  _menuOuvert = '';
  document.querySelectorAll('.menu-cat').forEach(function (b) {
    b.classList.remove('menu-cat-ouverte'); b.setAttribute('aria-expanded', 'false');
  });
}

/* Le volet se colle au bord droit de la barre, a la hauteur de la categorie
   cliquee, et se recale s'il deborderait en bas de la fenetre. */
function menuPlacerVolet(btn) {
  const volet = document.getElementById('menu-volet'), barre = document.getElementById('sidebar');
  if (!volet || !barre) return;
  const b = barre.getBoundingClientRect();
  /* Sous 600 px le volet va jusqu'au bord de l'ecran (right:0 dans la feuille
     de style) : sans ca, barre 220 px + volet 236 px depassent un telephone. */
  volet.style.left = Math.max(0, Math.min(b.right, window.innerWidth - 150)) + 'px';
  const haut = btn ? btn.getBoundingClientRect().top : b.top;
  volet.style.top = Math.max(b.top, Math.min(haut, window.innerHeight - volet.offsetHeight - 8)) + 'px';
}

/* La categorie de la page ouverte reste allumee, meme volet ferme : sinon on ne
   sait plus ou l'on est. showPage() pose deja « active » sur #sid-<page>. */
function menuSuivreActif() {
  const a = document.querySelector('#menu-volet .sidebar-item.active');
  const cat = a ? menuCatDe(a.id) || 'autre' : '';
  document.querySelectorAll('.menu-cat').forEach(function (b) {
    b.classList.toggle('menu-cat-active', !!cat && b.id === 'mcat-' + cat);
  });
}

(function () {
  function demarrer() {
    if (!menuCategories()) return;
    // un clic sur une entree ferme le volet : on vient de naviguer
    const volet = document.getElementById('menu-volet');
    if (volet) volet.addEventListener('click', function (e) {
      if (e.target.closest('.sidebar-item')) setTimeout(function () { menuFermerVolet(); menuSuivreActif(); }, 0);
    });
    // un clic ailleurs, ou Echap, ferme aussi
    document.addEventListener('click', function (e) {
      if (!_menuOuvert) return;
      if (e.target.closest('#menu-volet') || e.target.closest('.menu-cat')) return;
      menuFermerVolet();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && _menuOuvert) menuFermerVolet(); });
    window.addEventListener('resize', function () { if (_menuOuvert) menuPlacerVolet(document.getElementById('mcat-' + _menuOuvert)); });
    if (typeof showPage === 'function') {
      const avant = showPage;
      showPage = function (n) { avant(n); menuSuivreActif(); };
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();
})();
