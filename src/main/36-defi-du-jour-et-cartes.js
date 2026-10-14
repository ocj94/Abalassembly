
/* ═══════════════════════════════════════════
   DÉFI DU JOUR #N — UN PUZZLE PAR JOUR, LE MÊME POUR TOUT LE MONDE (v2.57)
   Façon Wordle : chaque jour a son numéro (#1 = 14 octobre 2026), un puzzle tiré de vraies
   parties, le même pour tous sans compte ni serveur, et un résultat qui se partage sans rien
   dévoiler de la solution :
       Abalassembly — Défi du jour #12 ⭐⭐
       🟥🟨🟩 Trouvé au 2e essai, avec l'indice · ⏱ 0:42
       🔥 Série : 3 jours
       https://ocj94.github.io/Abalassembly/?defi=12
   🟥 mauvais coup · 🟨 indice · 🟩 trouvé · ⬛ solution affichée.
   Il remplace trois « défis du jour » qui coexistaient : un faux (un numéro de puzzle inventé,
   « relevé » d'un simple clic contre 50 XP), un tiré des 18 problèmes de la série, et un tiré
   des vrais puzzles qui dépendait de l'état local (deux joueurs pouvaient tomber sur deux
   puzzles différents le même jour).
   Le puzzle d'un numéro ne change jamais : il est tiré parmi les 78 puzzles à un coup (en tête
   de PUZZLES), figés -- un test vérifie leur empreinte. Chaque cycle de 78 jours est un tirage
   sans remise, toujours le même.
═══════════════════════════════════════════ */
const DEFI_DEBUT = Date.UTC(2026, 9, 14);   // #1 = 14 octobre 2026, jour civil local
const DEFI_NB = 78;                          // puzzles du tirage : les 78 à un coup (SINGLE_MOVE_PUZZLE_COUNT)
const DEFI_GARDE = 400;                      // jours gardés dans l'historique des défis
let _defiEnCours = null;                     // { n, idx, depuis } : le puzzle affiché est le défi n
let _defiMinuteur = null;

function defiNumero(d) {   // numéro du défi d'un jour civil local (par défaut : aujourd'hui)
  d = d || new Date();
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - DEFI_DEBUT) / 86400000) + 1;
}
function defiIndex(n) {    // index dans PUZZLES du puzzle du défi n
  const k = Math.floor((n - 1) / DEFI_NB), i = (((n - 1) % DEFI_NB) + DEFI_NB) % DEFI_NB;
  const ordre = []; for (let j = 0; j < DEFI_NB; j++) ordre.push(j);
  let a = (20261014 + 7919 * k) >>> 0;     // mulberry32, graine fixe par cycle
  const alea = function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  for (let j = DEFI_NB - 1; j > 0; j--) { const r = Math.floor(alea() * (j + 1)); const x = ordre[j]; ordre[j] = ordre[r]; ordre[r] = x; }
  return ordre[i];
}
function _defis() { if (!progress.defis || typeof progress.defis !== 'object') progress.defis = {}; return progress.defis; }
function defiEtat(n) { return _defis()[n] || null; }
// e : la suite des essais ('x' mauvais coup, 'i' indice, 'v' trouvé, 's' solution affichée), f : fin ('v' ou 's'),
// ms : temps passé sur le puzzle (seulement pendant qu'il est affiché)
function _defiNoter(n, c) {
  const D = _defis(), e = D[n] || (D[n] = { e: '', ms: 0 });
  if (e.f) return e;                                     // terminé : plus rien ne compte
  if (c === 'i' && e.e.indexOf('i') >= 0) return e;     // l'indice ne compte qu'une fois
  e.e += c;
  if (c === 'v' || c === 's') {
    e.f = c;
    if (_defiEnCours && _defiEnCours.n === n && _defiEnCours.depuis) { e.ms = (e.ms || 0) + (Date.now() - _defiEnCours.depuis); _defiEnCours.depuis = 0; }
  }
  const cles = Object.keys(D).map(Number).sort(function (a, b) { return a - b; });
  while (cles.length > DEFI_GARDE) delete D[cles.shift()];
  if (typeof saveProgress === 'function') saveProgress(progress);
  return e;
}
function defiSerie() {     // jours d'affilée avec un défi trouvé (sans la solution), jusqu'à aujourd'hui ou hier
  const D = _defis(); let n = defiNumero();
  if (!(D[n] && D[n].f === 'v')) n--;
  let s = 0; while (D[n] && D[n].f === 'v') { s++; n--; }
  return s;
}
function defiTrouves() { const D = _defis(); return Object.keys(D).filter(function (k) { return D[k].f === 'v'; }).length; }
function _defiDuree(ms) { const s = Math.max(0, Math.round((ms || 0) / 1000)); return s >= 3600 ? Math.floor(s / 3600) + ':' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') : Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function _defiCases(e) { return (e || '').split('').map(function (c) { return { x: '🟥', i: '🟨', v: '🟩', s: '⬛' }[c] || ''; }).join(''); }
function _defiEssais(e) { return (e || '').split('').filter(function (c) { return c === 'x' || c === 'v'; }).length; }

// Phrase de résultat, sans rien dévoiler (ni case, ni direction)
function defiPhrase(e) {
  if (!e || !e.f) return _tr('En cours', 'In progress');
  const indice = e.e.indexOf('i') >= 0;
  if (e.f === 's') return _tr('Solution affichée', 'Solution shown');
  const k = _defiEssais(e.e);
  const fr = k === 1 ? 'Trouvé du premier coup' : 'Trouvé au ' + k + 'e essai';
  const en = k === 1 ? 'Solved first try' : 'Solved on try ' + k;
  return _tr(fr + (indice ? ', avec l’indice' : ''), en + (indice ? ', with the hint' : ''));
}
function _defiLien(n) { return SHARE_URL + '?defi=' + n + (currentLang() === 'EN' ? '&lang=en' : ''); }
function texteDefi(n) {
  const e = defiEtat(n), p = PUZZLES[defiIndex(n)], serie = defiSerie();
  const etoiles = p ? '⭐'.repeat(p.d || 1) : '';
  const l1 = 'Abalassembly — ' + _tr('Défi du jour', 'Daily puzzle') + ' #' + n + ' ' + etoiles;
  const l2 = _defiCases(e && e.e) + ' ' + defiPhrase(e) + (e && e.f === 'v' && e.ms ? ' · ⏱ ' + _defiDuree(e.ms) : '');
  const l3 = serie > 0 ? '🔥 ' + _tr('Série', 'Streak') + ' : '.replace(' :', currentLang() === 'EN' ? ':' : ' :') + serie + ' ' + _tr(serie > 1 ? 'jours' : 'jour', serie > 1 ? 'days' : 'day') : '';
  return [l1, l2, l3, _defiLien(n)].filter(Boolean).join('\n');
}

// Lancer le défi n (aujourd'hui par défaut). Déjà terminé : on montre le résultat.
function jouerDefi(n) {
  const auj = defiNumero();
  if (!(n >= 1 && n <= auj)) n = auj;
  const e = defiEtat(n);
  if (e && e.f) { ouvrirResultatDefi(n); return; }
  const idx = defiIndex(n);
  const D = _defis(); if (!D[n]) { D[n] = { e: '', ms: 0 }; if (typeof saveProgress === 'function') saveProgress(progress); }
  if (typeof showPage === 'function') showPage('game');   // le puzzle se joue sur le plateau de la partie
  if (typeof startPuzzle === 'function') startPuzzle(idx);
  _defiEnCours = { n: n, idx: idx, depuis: Date.now() };
  const t = document.getElementById('pz-title');
  if (t) t.textContent = '🔥 ' + _tr('Défi du jour', 'Daily puzzle') + ' #' + n + ' · ' + t.textContent.replace(/^\S+ Puzzle \d+\/\d+ · /, '');
}
function ouvrirDefi() { jouerDefi(defiNumero()); }
// Appelée par les puzzles (bonne réponse, erreur, indice, solution) : ne compte que pour le défi en cours
function _defiSurPuzzle(idx, c) {
  const d = _defiEnCours; if (!d || d.idx !== idx) return;
  const avant = defiEtat(d.n), dejaFini = !!(avant && avant.f);
  const e = _defiNoter(d.n, c);
  if (dejaFini || !e.f) return;
  if (e.f === 'v') {
    if (typeof addXp === 'function') addXp(25, 'Défi du jour #' + d.n);
    if (defiTrouves() >= 7 && typeof awardBadge === 'function') awardBadge('daily7');
  }
  _defiEnCours = null;
  if (typeof renderEngageBar === 'function') renderEngageBar();
  if (typeof renderDailyCard === 'function') renderDailyCard();
  if (typeof updateHeroDaily === 'function') updateHeroDaily();
  setTimeout(function () { ouvrirResultatDefi(d.n); }, e.f === 'v' ? 900 : 1600);
}
function _defiQuitter() {   // on quitte le puzzle sans l'avoir fini : le temps passé est gardé
  const d = _defiEnCours; if (!d) return;
  const e = defiEtat(d.n);
  if (e && !e.f && d.depuis) { e.ms = (e.ms || 0) + (Date.now() - d.depuis); if (typeof saveProgress === 'function') saveProgress(progress); }
  _defiEnCours = null;
}
function _defiProchain() {  // temps avant le prochain défi (minuit local)
  const d = new Date(), m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
  return _defiDuree(m - d).replace(/^(\d):/, '0$1:');
}

// Fenêtre de résultat (comme celle de Wordle)
function ouvrirResultatDefi(n) {
  if (n === undefined) n = defiNumero();
  const e = defiEtat(n), p = PUZZLES[defiIndex(n)], serie = defiSerie();
  let m = document.getElementById('defi-modal');
  if (!m) { m = document.createElement('div'); m.id = 'defi-modal'; m.className = 'share-modal-overlay'; document.body.appendChild(m); }
  const fini = !!(e && e.f), auj = (n === defiNumero());
  m.innerHTML = '<div class="share-modal-box" style="max-width:420px;text-align:center">'
    + '<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:var(--gold)">' + _tr('Défi du jour', 'Daily puzzle') + ' #' + n + (p ? ' · ' + '⭐'.repeat(p.d || 1) : '') + '</div>'
    + '<div style="font-size:13px;color:var(--muted);margin:4px 0 12px">' + (p && p.def ? _tr('🛡️ Parer la menace', '🛡️ Stop the threat') : _tr('🎯 Trouver le coup gagnant', '🎯 Find the winning move')) + '</div>'
    + (fini ? '<div style="font-size:34px;letter-spacing:4px;margin:6px 0">' + _defiCases(e.e) + '</div>'
      + '<div style="font-size:16px;color:var(--white);font-weight:600">' + defiPhrase(e) + (e.f === 'v' && e.ms ? ' · ⏱ ' + _defiDuree(e.ms) : '') + '</div>'
      : '<div style="font-size:14px;color:var(--text);margin:8px 0">' + _tr('Pas encore joué.', 'Not played yet.') + '</div>')
    + '<div style="display:flex;justify-content:center;gap:22px;margin:16px 0 6px">'
    + '<div><div style="font-size:24px;font-weight:800;color:var(--gold)">' + serie + '</div><div style="font-size:11px;color:var(--muted)">🔥 ' + _tr('série', 'streak') + '</div></div>'
    + '<div><div style="font-size:24px;font-weight:800;color:var(--gold)">' + defiTrouves() + '</div><div style="font-size:11px;color:var(--muted)">✅ ' + _tr('défis trouvés', 'puzzles solved') + '</div></div>'
    + '</div>'
    + (fini ? '<div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px">'
      + '<button class="share-copy" style="width:auto;padding:10px 18px;margin:0" onclick="partagerDefi(' + n + ')">📤 ' + _tr('Partager', 'Share') + '</button>'
      + '<button class="share-close" style="width:auto;padding:10px 18px;margin:0" onclick="partagerImageDefi(' + n + ')">🖼️ ' + _tr('Image', 'Image') + '</button>'
      + '</div>'
      : '<button class="share-copy" onclick="document.getElementById(\'defi-modal\').classList.remove(\'show\');jouerDefi(' + n + ')">▶ ' + _tr('Jouer le défi', 'Play the puzzle') + '</button>')
    + (auj ? '<div style="font-size:12px;color:var(--muted);margin-top:14px">' + _tr('Prochain défi dans', 'Next puzzle in') + ' <span id="defi-prochain" style="font-family:\'DM Mono\',monospace;color:var(--text)">' + _defiProchain() + '</span></div>' : '')
    + '<button class="share-close" style="margin-top:12px" onclick="fermerResultatDefi()">' + _tr('Fermer', 'Close') + '</button>'
    + '</div>';
  m.classList.add('show');
  clearInterval(_defiMinuteur);
  if (auj) _defiMinuteur = setInterval(function () {
    const s = document.getElementById('defi-prochain');
    if (!s || !m.classList.contains('show')) { clearInterval(_defiMinuteur); return; }
    s.textContent = _defiProchain();
  }, 1000);
}
function fermerResultatDefi() { const m = document.getElementById('defi-modal'); if (m) m.classList.remove('show'); clearInterval(_defiMinuteur); }

// Partage : le texte (avec le lien), par le partage du téléphone ou dans le presse-papier
function _copierTexte(t, ok) {
  try { if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t).then(function () { if (typeof showToast === 'function') showToast(ok); }); return; } } catch (e) {}
  try { const z = document.createElement('textarea'); z.value = t; document.body.appendChild(z); z.select(); document.execCommand('copy'); z.remove(); if (typeof showToast === 'function') showToast(ok); } catch (e) {}
}
function partagerDefi(n) {
  const t = texteDefi(n), ok = _tr('📋 Résultat copié — colle-le où tu veux', '📋 Result copied — paste it anywhere');
  if (navigator.share) { navigator.share({ text: t }).catch(function (err) { if (!err || err.name !== 'AbortError') _copierTexte(t, ok); }); return; }
  _copierTexte(t, ok);
}

// ?defi ou ?defi=12 dans l'adresse : le défi s'ouvre directement (un lien partagé mène au bon puzzle)
function _defiDepuisAdresse(q) {
  const m = /[?&]defi(?:=(\d+))?(?:&|$)/.exec(q || ''); if (!m) return null;
  const auj = defiNumero(), n = m[1] ? parseInt(m[1], 10) : auj;
  return (n >= 1 && n <= auj) ? n : auj;
}
document.addEventListener('DOMContentLoaded', function () {
  const n = _defiDepuisAdresse((typeof location !== 'undefined' && location.search) || '');
  if (n) setTimeout(function () { jouerDefi(n); }, 700);
});

/* ═══════════════════════════════════════════
   CARTES À PARTAGER (IMAGES) — fin de partie et défi du jour
   Une image carrée (1080 × 1080) : le résultat, le plateau final (fin de partie) ou la grille
   du défi (sans la position : ce serait la solution), et l'adresse du site. Partagée par le
   téléphone quand il sait partager des fichiers, sinon montrée avec un bouton de téléchargement.
═══════════════════════════════════════════ */
let _finPartie = null;   // dernière fin de partie : { winner, reason, cb, cw, coups, mode, moi, niveau, adv, duree, plateau }
document.addEventListener('abalassembly:gameOver', function (ev) {
  try {
    const d = (ev && ev.detail) || {};
    const mode = (typeof GameMode !== 'undefined') ? GameMode.get() : 'ai';
    _finPartie = {
      winner: d.winner || null, reason: d.reason || null, cb: d.capturedByBlack | 0, cw: d.capturedByWhite | 0, coups: d.moveCount | 0,
      mode: mode, moi: (typeof monCamp === 'function') ? monCamp() : 'black',
      niveau: (mode === 'ai' && typeof _setupCfg !== 'undefined' && typeof _niveauIA === 'function') ? _niveauIA(_setupCfg.diff) : null,
      adv: (typeof _rtcOpponentName !== 'undefined' && _rtcOpponentName) ? String(_rtcOpponentName).slice(0, 24) : '',
      duree: (typeof gameStartTime !== 'undefined' && gameStartTime) ? Date.now() - gameStartTime : 0,
      plateau: Object.assign({}, (typeof board !== 'undefined') ? board : {}), date: new Date()
    };
  } catch (e) { _finPartie = null; }
});
// Les textes de la carte de fin de partie (testables sans canvas)
function infosFinPartie(f) {
  f = f || _finPartie; if (!f) return null;
  const local = f.mode === 'local', nul = !f.winner;
  const gagne = !nul && f.winner === f.moi;
  const nom = function (c) { return c === 'black' ? _tr('Noirs', 'Black') : _tr('Blancs', 'White'); };
  let titre;
  if (nul) titre = _tr('PARTIE NULLE', 'DRAW');
  else if (local) titre = _tr('LES ' + nom(f.winner).toUpperCase() + ' GAGNENT', nom(f.winner).toUpperCase() + ' WINS');
  else titre = gagne ? _tr('VICTOIRE', 'VICTORY') : _tr('DÉFAITE', 'DEFEAT');
  // score : billes ejectees par le gagnant (ou par moi en cas de nulle) contre billes perdues
  const ejN = f.cb, ejB = f.cw;   // CapturedByBlack = billes blanches ejectees par les Noirs
  const pour = nul ? (f.moi === 'black' ? ejN : ejB) : (f.winner === 'black' ? ejN : ejB);
  const contre = nul ? (f.moi === 'black' ? ejB : ejN) : (f.winner === 'black' ? ejB : ejN);
  let adv;
  if (local) adv = _tr('À deux sur le même appareil', 'Two players, same device');
  else if (f.mode === 'ai') adv = _tr('Contre l’IA', 'Against the AI') + (f.niveau ? ' · ' + _tr('niveau', 'level') + ' ' + f.niveau : '');
  else adv = f.adv ? _tr('Contre ', 'Against ') + f.adv : _tr('Partie en direct', 'Live game');
  const raison = f.reason === 'resign' ? _tr('par abandon', 'by resignation') : f.reason === 'temps' ? _tr('au temps', 'on time')
    : f.reason === 'repetition' ? _tr('par répétition', 'by repetition') : f.reason === 'accord' ? _tr('d’un commun accord', 'by agreement') : '';
  const details = [f.coups + ' ' + _tr('coups', 'moves')];
  if (f.duree > 0) details.push('⏱ ' + _defiDuree(f.duree));
  details.push(f.date.toLocaleDateString(currentLang() === 'EN' ? 'en-GB' : 'fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }));
  return { titre: titre, score: pour + ' – ' + contre, adv: adv, raison: raison, details: details.join(' · '), gagne: gagne, nul: nul };
}
function _carteFond(ctx, W) {
  const g = ctx.createLinearGradient(0, 0, 0, W); g.addColorStop(0, '#16191a'); g.addColorStop(1, '#0d0f0e');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, W);
  ctx.strokeStyle = 'rgba(200,168,75,0.35)'; ctx.lineWidth = 4; ctx.strokeRect(26, 26, W - 52, W - 52);
}
function _cartePied(ctx, W) {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#c8a84b'; ctx.font = '700 46px Georgia, "Playfair Display", serif'; ctx.fillText('ABALASSEMBLY', W / 2, W - 118);
  ctx.fillStyle = '#9aa39e'; ctx.font = '28px "DM Sans", Arial, sans-serif';
  ctx.fillText('ocj94.github.io/Abalassembly · ' + _tr('gratuit, sans pub, sans compte', 'free, no ads, no account'), W / 2, W - 70);
}
function _carteCanvas() { const c = document.createElement('canvas'); c.width = 1080; c.height = 1080; return c; }
function _carteBlob(c) { return new Promise(function (ok) { if (c.toBlob) c.toBlob(function (b) { ok(b); }, 'image/png'); else ok(null); }); }
function carteFinPartie() {
  const I = infosFinPartie(); if (!I) return Promise.resolve(null);
  const W = 1080, c = _carteCanvas(), ctx = c.getContext('2d'); if (!ctx) return Promise.resolve(null);
  _carteFond(ctx, W);
  ctx.textAlign = 'center';
  ctx.fillStyle = I.nul ? '#d9d4c7' : (I.gagne || _finPartie.mode === 'local' ? '#e3c672' : '#d9d4c7');
  ctx.font = '900 76px Georgia, "Playfair Display", serif'; ctx.fillText(I.titre, W / 2, 128);
  ctx.fillStyle = '#ffffff'; ctx.font = '700 56px "DM Sans", Arial, sans-serif'; ctx.fillText(I.score + (I.raison ? '  ' : ''), W / 2 - (I.raison ? 90 : 0), 200);
  if (I.raison) { ctx.fillStyle = '#9aa39e'; ctx.font = '32px "DM Sans", Arial, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(I.raison, W / 2 + 30, 198); ctx.textAlign = 'center'; }
  ctx.fillStyle = '#c9c4b6'; ctx.font = '32px "DM Sans", Arial, sans-serif'; ctx.fillText(I.adv, W / 2, 250);
  // le plateau final, dessine par le moteur de rendu 2D du site sur un canvas temporaire
  try {
    const tmp = document.createElement('canvas'); tmp.id = 'carte-plateau-tmp'; tmp.width = 640; tmp.height = 640; tmp.style.display = 'none';
    document.body.appendChild(tmp);
    drawBoard({ canvasId: 'carte-plateau-tmp', board: _finPartie.plateau, selected: [], showHints: false, hideGameOverlays: true });
    ctx.drawImage(tmp, (W - 640) / 2, 282, 640, 640);
    tmp.remove();
  } catch (e) {}
  ctx.fillStyle = '#9aa39e'; ctx.font = '28px "DM Sans", Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(I.details, W / 2, 958);
  _cartePied(ctx, W);
  return _carteBlob(c);
}
function carteDefi(n) {
  const e = defiEtat(n), p = PUZZLES[defiIndex(n)], serie = defiSerie();
  const W = 1080, c = _carteCanvas(), ctx = c.getContext('2d'); if (!ctx) return Promise.resolve(null);
  _carteFond(ctx, W);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e3c672'; ctx.font = '900 70px Georgia, "Playfair Display", serif'; ctx.fillText(_tr('DÉFI DU JOUR', 'DAILY PUZZLE') + ' #' + n, W / 2, 150);
  ctx.fillStyle = '#c9c4b6'; ctx.font = '36px "DM Sans", Arial, sans-serif';
  ctx.fillText((p && p.def ? _tr('Parer la menace', 'Stop the threat') : _tr('Trouver le coup gagnant', 'Find the winning move')) + (p ? '  ' + '★'.repeat(p.d || 1) : ''), W / 2, 215);
  // la grille, en carres de couleur (pas d'emoji dans un canvas : rendu inegal selon les appareils)
  const cases = ((e && e.e) || '').split(''), coul = { x: '#d9534f', i: '#e3b341', v: '#4caf50', s: '#3a3f3d' };
  const t = Math.min(130, Math.floor(820 / Math.max(1, cases.length)) - 16), y = 330, total = cases.length * (t + 16) - 16;
  cases.forEach(function (k, j) { ctx.fillStyle = coul[k] || '#555'; const x = (W - total) / 2 + j * (t + 16); ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, t, t, 16); else ctx.rect(x, y, t, t); ctx.fill(); });
  ctx.fillStyle = '#ffffff'; ctx.font = '700 50px "DM Sans", Arial, sans-serif'; ctx.fillText(defiPhrase(e), W / 2, y + t + 110);
  if (e && e.f === 'v' && e.ms) { ctx.fillStyle = '#c9c4b6'; ctx.font = '40px "DM Sans", Arial, sans-serif'; ctx.fillText('⏱ ' + _defiDuree(e.ms), W / 2, y + t + 175); }
  if (serie > 0) { ctx.fillStyle = '#ff8c42'; ctx.font = '700 44px "DM Sans", Arial, sans-serif'; ctx.fillText(_tr('Série : ', 'Streak: ') + serie + ' ' + _tr(serie > 1 ? 'jours' : 'jour', serie > 1 ? 'days' : 'day'), W / 2, y + t + 250); }
  ctx.fillStyle = '#9aa39e'; ctx.font = '30px "DM Sans", Arial, sans-serif'; ctx.fillText(_tr('Le même puzzle pour tout le monde, chaque jour', 'The same puzzle for everyone, every day'), W / 2, W - 190);
  _cartePied(ctx, W);
  return _carteBlob(c);
}
// Partager une image : le partage du téléphone s'il accepte les fichiers, sinon l'image avec un bouton de téléchargement
function partagerImage(blob, nom, texte) {
  if (!blob) { if (typeof showToast === 'function') showToast(_tr('⚠️ Image impossible sur cet appareil', '⚠️ Cannot make the image on this device')); return; }
  try {
    const f = (typeof File === 'function') ? new File([blob], nom, { type: 'image/png' }) : null;
    if (f && navigator.canShare && navigator.canShare({ files: [f] }) && navigator.share) {
      navigator.share({ files: [f], text: texte }).catch(function (err) { if (!err || err.name !== 'AbortError') _montrerImage(blob, nom); });
      return;
    }
  } catch (e) {}
  _montrerImage(blob, nom);
}
function _montrerImage(blob, nom) {
  const url = URL.createObjectURL(blob);
  let m = document.getElementById('image-modal');
  if (!m) { m = document.createElement('div'); m.id = 'image-modal'; m.className = 'share-modal-overlay'; document.body.appendChild(m); }
  m.innerHTML = '<div class="share-modal-box" style="max-width:460px;text-align:center">'
    + '<img src="' + url + '" alt="" style="width:100%;border-radius:10px;border:1px solid var(--border)">'
    + '<a class="share-copy" style="display:block;text-decoration:none;margin-top:12px" href="' + url + '" download="' + nom + '">⬇️ ' + _tr('Télécharger l’image', 'Download the image') + '</a>'
    + '<button class="share-close" onclick="document.getElementById(\'image-modal\').classList.remove(\'show\')">' + _tr('Fermer', 'Close') + '</button>'
    + '</div>';
  m.classList.add('show');
}
function partagerImageFin() { carteFinPartie().then(function (b) { partagerImage(b, 'abalassembly-partie.png', buildShareText() + ' ' + SHARE_URL + (currentLang() === 'EN' ? '?lang=en' : '')); }); }
function partagerImageDefi(n) { carteDefi(n).then(function (b) { partagerImage(b, 'abalassembly-defi-' + n + '.png', texteDefi(n)); }); }

</script>
