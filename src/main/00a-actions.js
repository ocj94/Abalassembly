/* ═══ Actions de la page, sans code dans le HTML (v3.22) ═══════════════════════════
   Avant, chaque bouton portait son code dans un attribut onclick (showPage('gym')). Pour que ces 1 000
   et quelques gestionnaires marchent, la CSP devait autoriser tout code écrit dans la
   page ('unsafe-inline'), donc aussi celui qu'un pseudo ou un fichier piégé y aurait
   glissé. Maintenant :

     <button data-click="showPage('gym')">          un clic
     <select data-change="setLevel(this.value)">     change, input, keydown, toggle
     <input data-entree="envoyer()">                 la touche Entrée seulement
     <div class="modal" data-fond="fermer()">        un clic sur le fond (pas sur le contenu)
     <div data-survol="border-color:var(--gold)">    un style le temps du survol

   Ces attributs sont du texte : le navigateur ne les exécute jamais. Un seul écouteur
   par type d'événement (sur le document) les lit et appelle la fonction nommée, mais
   seulement si elle est dans la liste des actions du site (_ACTIONS, écrite par
   tools/sans-inline.js, vérifiée par les tests). Les arguments ne peuvent être que des
   valeurs simples : textes entre apostrophes, nombres, true/false/null/undefined,
   this, event, this.value, this.checked, this.dataset.x, this.closest('…'),
   document.getElementById('…').value. Pas d'expression, pas d'affectation : rien à
   détourner. Plusieurs appels se séparent par « ; », et event.stopPropagation(),
   event.preventDefault() et « return false » gardent leur sens.

   Le clic remonte les éléments comme avant (un data-click dans un data-click : les
   deux, du plus profond au plus haut, sauf event.stopPropagation()). */
const _ACT_EVENEMENTS = ['click', 'change', 'input', 'keydown', 'toggle'];
const _actCache = new Map();

// découpe « f('a', 1); g(this) » en appels ; null si le texte sort de la grammaire
function _actAnalyser(src) {
  if (_actCache.has(src)) return _actCache.get(src);
  let i = 0;
  const n = src.length;
  const blanc = () => { while (i < n && /\s/.test(src[i])) i++; };
  const ident = () => { const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(i)); if (!m) return null; i += m[0].length; return m[0]; };
  const chaine = () => {
    const q = src[i]; if (q !== "'" && q !== '"') return undefined;
    let s = ''; i++;
    while (i < n && src[i] !== q) {
      if (src[i] === '\\' && i + 1 < n) { const c = src[i + 1]; s += c === 'n' ? '\n' : c === 't' ? '\t' : c; i += 2; }
      else s += src[i++];
    }
    if (src[i] !== q) throw new Error('chaîne non fermée');
    i++; return s;
  };
  const argument = () => {
    blanc();
    const c = src[i];
    if (c === "'" || c === '"') return { v: chaine() };
    const num = /^-?\d+(\.\d+)?/.exec(src.slice(i));
    if (num) { i += num[0].length; return { v: Number(num[0]) }; }
    const mot = ident();
    if (mot === 'true') return { v: true };
    if (mot === 'false') return { v: false };
    if (mot === 'null') return { v: null };
    if (mot === 'undefined') return { v: undefined };
    if (mot === 'event') return { ev: true };
    if (mot === 'this') {
      if (src[i] !== '.') return { el: true };
      i++;
      const p = ident();
      if (p === 'value' || p === 'checked') return { prop: p };
      if (p === 'dataset' && src[i] === '.') { i++; return { data: ident() }; }
      if (p === 'closest' && src[i] === '(') { i++; blanc(); const sel = chaine(); blanc(); if (src[i++] !== ')') throw new Error(')'); return { proche: sel }; }
      throw new Error('this.' + p);
    }
    if (mot === 'document' && src.slice(i, i + 16) === '.getElementById(') {
      i += 16; blanc(); const id = chaine(); blanc();
      if (src.slice(i, i + 8) !== ').value') throw new Error('getElementById(…).value');
      i += 8; return { valeurDe: id };
    }
    throw new Error('argument « ' + (mot || src.slice(i, i + 12)) + ' »');
  };
  let appels = null;
  try {
    appels = [];
    for (;;) {
      blanc();
      if (i >= n) break;
      if (src.startsWith('return false', i)) { i += 12; appels.push({ special: 'retour' }); }
      else if (src.startsWith('event.stopPropagation()', i)) { i += 23; appels.push({ special: 'arret' }); }
      else if (src.startsWith('event.preventDefault()', i)) { i += 22; appels.push({ special: 'defaut' }); }
      else {
        const nom = ident();
        if (!nom) throw new Error('nom de fonction');
        blanc();
        if (src[i++] !== '(') throw new Error('(');
        const args = [];
        blanc();
        if (src[i] === ')') i++;
        else for (;;) { args.push(argument()); blanc(); const c = src[i++]; if (c === ')') break; if (c !== ',') throw new Error(','); }
        appels.push({ nom: nom, args: args });
      }
      blanc();
      if (i < n && src[i] === ';') i++;
      else if (i < n) throw new Error('; attendu');
    }
  } catch (e) {
    console.error('[actions] « ' + src + ' » : ' + e.message);
    appels = null;
  }
  _actCache.set(src, appels);
  return appels;
}

function _actValeur(a, el, e) {
  if ('v' in a) return a.v;
  if (a.ev) return e;
  if (a.el) return el;
  if (a.prop) return el[a.prop];
  if (a.data) return el.dataset[a.data];
  if (a.proche) return el.closest(a.proche);
  if (a.valeurDe) { const x = document.getElementById(a.valeurDe); return x ? x.value : undefined; }
  return undefined;
}

// exécute le texte d'un attribut pour l'élément el ; renvoie true si la remontée doit s'arrêter
function _actExecuter(src, el, e) {
  const appels = _actAnalyser(src);
  if (!appels) return false;
  let arret = false;
  for (const ap of appels) {
    if (ap.special === 'retour') { e.preventDefault(); continue; }
    if (ap.special === 'arret') { e.stopPropagation(); arret = true; continue; }
    if (ap.special === 'defaut') { e.preventDefault(); continue; }
    const acces = (typeof _ACTIONS !== 'undefined') ? _ACTIONS[ap.nom] : null;
    if (!acces) { console.error('[actions] « ' + ap.nom + ' » n\'est pas une action du site'); continue; }
    let f;
    try { f = acces(); } catch (err) { f = undefined; }
    if (typeof f !== 'function') continue;      // fonction absente (module non chargé) : rien, comme les anciens « if (typeof f === 'function') »
    try { f.apply(el, ap.args.map(function (a) { return _actValeur(a, el, e); })); }
    catch (err) { console.error(err); }
  }
  return arret || e.cancelBubble;
}

function _actSurEvenement(type, e) {
  const attr = 'data-' + type;
  // de l'élément visé vers le haut, comme la remontée des anciens onclick
  for (let el = e.target && e.target.nodeType === 1 ? e.target : (e.target && e.target.parentElement); el && el !== document; el = el.parentElement) {
    if (type === 'click' && el.hasAttribute('data-fond') && e.target === el && _actExecuter(el.getAttribute('data-fond'), el, e)) return;
    if (type === 'keydown' && el.hasAttribute('data-entree') && e.key === 'Enter' && _actExecuter(el.getAttribute('data-entree'), el, e)) return;
    if (el.hasAttribute(attr) && _actExecuter(el.getAttribute(attr), el, e)) return;
    if (type === 'toggle') return;      // toggle ne remonte pas : seulement l'élément lui-même
  }
}

// survol : le style donné le temps que la souris est sur l'élément, puis celui d'avant
function _actSurvol(e, entre) {
  const el = e.target && e.target.closest ? e.target.closest('[data-survol]') : null;
  if (!el) return;
  if (e.relatedTarget && el.contains(e.relatedTarget)) return;   // on reste dedans (passage sur un enfant)
  const regles = String(el.getAttribute('data-survol')).split(';').map(function (r) { return r.split(':'); })
    .filter(function (r) { return r.length >= 2 && r[0].trim(); });
  if (entre) {
    if (!el._actAvant) el._actAvant = regles.map(function (r) { return [r[0].trim(), el.style.getPropertyValue(r[0].trim())]; });
    regles.forEach(function (r) { el.style.setProperty(r[0].trim(), r.slice(1).join(':').trim()); });
  } else if (el._actAvant) {
    el._actAvant.forEach(function (r) { if (r[1]) el.style.setProperty(r[0], r[1]); else el.style.removeProperty(r[0]); });
    el._actAvant = null;
  }
}

if (typeof document !== 'undefined' && document.addEventListener) {
  _ACT_EVENEMENTS.forEach(function (type) {
    // toggle ne remonte pas : on l'écoute à la descente (capture)
    document.addEventListener(type, function (e) { _actSurEvenement(type, e); }, type === 'toggle');
  });
  document.addEventListener('mouseover', function (e) { _actSurvol(e, true); });
  document.addEventListener('mouseout', function (e) { _actSurvol(e, false); });
}

/* Petites actions qui remplaçaient du code écrit dans les attributs */
function ouvrirLien(url) { window.open(url, '_blank', 'noopener,noreferrer'); }
function imprimer() { window.print(); }
function cacher(id) { const el = document.getElementById(id); if (el) el.style.display = 'none'; }
function basculerAffichage(id) { const el = document.getElementById(id); if (el) el.style.display = el.style.display === 'block' ? 'none' : 'block'; }
function retirer(id) { const el = document.getElementById(id); if (el) el.remove(); }
function cliquer(id) { const el = document.getElementById(id); if (el) el.click(); }
function retirerClasse(id, classe) { const el = document.getElementById(id); if (el) el.classList.remove(classe); }
function selectionner(el) { if (el && el.select) el.select(); }
function fermerMenuMobile() { if (window.innerWidth < 600 && typeof closeSidebarMobile === 'function') closeSidebarMobile(); }
// interrupteur maison (case cochée + pastille juste après) : la couleur de la pastille
function interrupteurCouleur(el) { if (el && el.nextElementSibling) el.nextElementSibling.style.background = el.checked ? 'var(--gold)' : 'var(--border)'; }
function copierDansPressePapier(texte) {
  if (navigator.clipboard) navigator.clipboard.writeText(String(texte)).then(function () { if (typeof showToast === 'function') showToast(_tr('Code copié', 'Code copied')); });
}
// boutons qui avaient une expression plutôt qu'un appel
function tournerPlateau(sens) { rotateBoard(sens * BOARD_ROTATE_STEP_DEG); }
function creatorApercu3DSiOuvert(el) { if (el.open && typeof creatorInit3DPreview === 'function') creatorInit3DPreview(); }
function gouttiereDepuisCase(el) { setGutterAlign(el.checked ? 'bottom' : 'drop'); }
function basculerIndicesCoups(el) { showMoveHints = el.checked; if (typeof drawBoard === 'function') drawBoard(); interrupteurCouleur(el); }
function basculerTraductionChat(el) { interrupteurCouleur(el); showToast(el.checked ? '🌐 Traduction automatique activée' : 'Traduction désactivée'); }
function viderHistoriqueConfirme() { if (confirm('Effacer tout l\'historique de parties ? Irréversible.')) { clearGameHistory(); _renderHistoryList(); } }
function setA11yNombre(cle, valeur) { setA11y(cle, parseFloat(valeur)); }
