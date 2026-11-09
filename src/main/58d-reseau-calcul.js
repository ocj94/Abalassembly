/* ═══ v3.18 : Réseau de calcul — ce navigateur, exécutant de l'ordonnanceur ═══
   Le serveur (abalassembly-api, /ordo) tient des campagnes : deux jeux de poids à
   départager, en parties à profondeur fixe. Chaque partie est une mission. Ce navigateur
   peut se brancher comme exécutant : il demande des missions, les joue avec le moteur du
   jeu dans ses fils de calcul (un par cœur choisi), et rend chaque partie. Le serveur ne
   croit rien : il rejoue la partie et recherche lui-même quelques demi-coups tirés au
   hasard, qui doivent être exactement ceux du moteur (depuis la v3.18 une partie à
   profondeur fixe se refait coup pour coup). Débrancher n'importe quand ne perd rien :
   la mission repart dans la file. Rien ne tourne tant qu'on n'a pas branché, et le jeu
   reste entièrement utilisable sans serveur.
   Ce qui part vers le serveur : le compte (connexion), le nombre de cœurs choisi,
   l'empreinte du moteur, les parties jouées. Aucune autre donnée de l'appareil. */
const RESEAU = { branche: false, jeton: null, user: null, executant: null, battementS: 20, continuer: true, fils: [],
  enCours: 0, faites: 0, refusees: 0, journal: [], etat: null, moteur: null, erreur: null, bat: null, admin: null };
const RS_COEURS_CLE = 'abaReseauCoeurs';

// le serveur : celui du site (BACKEND, 01-backend-api-layer.js), le jour où il est en ligne
function _rsUrl() { return (typeof BACKEND !== 'undefined' && BACKEND.enabled && BACKEND.url) ? BACKEND.url.replace(/\/$/, '') : null; }
function _rsJeton() { return RESEAU.jeton || (typeof currentUser !== 'undefined' && currentUser && currentUser._token) || null; }
function _rsCoeursMax() { return Math.max(1, (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2); }
function _rsCoeurs() { let n = 0; try { n = parseInt(localStorage.getItem(RS_COEURS_CLE), 10) || 0; } catch (e) {} return Math.max(1, Math.min(_rsCoeursMax(), n || Math.max(1, _rsCoeursMax() - 1))); }
function rsCoeurs(v) { try { localStorage.setItem(RS_COEURS_CLE, String(v)); } catch (e) {} renderReseau(); }
const _rsDormir = (ms) => new Promise((r) => setTimeout(r, ms));
function _rsNote(t) { RESEAU.journal.unshift(new Date().toLocaleTimeString('fr-FR') + ' · ' + t); RESEAU.journal.length = Math.min(RESEAU.journal.length, 12); renderReseau(); }

async function _rsFetch(chemin, corps, methode, keepalive) {
  const url = _rsUrl(); if (!url) return { statut: 0, b: { error: 'pas de serveur' } };
  const ctrl = new AbortController(), to = setTimeout(() => ctrl.abort(), 30000);
  try {
    const j = _rsJeton();
    const r = await fetch(url + chemin, { method: methode || (corps ? 'POST' : 'GET'), signal: ctrl.signal, keepalive: !!keepalive, credentials: 'omit',
      headers: Object.assign({ 'Content-Type': 'application/json' }, j ? { Authorization: 'Bearer ' + j } : {}), body: corps ? JSON.stringify(corps) : undefined });
    let b = {}; try { b = await r.json(); } catch (e) {}
    return { statut: r.status, b: b || {} };
  } catch (e) { return { statut: 0, b: { error: 'serveur injoignable' } }; } finally { clearTimeout(to); }
}

// l'empreinte du moteur : le serveur ne confie une mission qu'à un moteur identique au sien
async function _rsEmpreinte() {
  if (RESEAU.moteur) return RESEAU.moteur;
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(AI_WORKER_CODE));
  RESEAU.moteur = Array.from(new Uint8Array(h)).map((x) => x.toString(16).padStart(2, '0')).join('');
  return RESEAU.moteur;
}

// une mission (protocole v1) en message pour le fil de calcul — le même que côté serveur (src/moteurIA.js)
function _rsMessage(mi) {
  const cfg = { depth: mi.profondeur, ms: 1e9 };
  return { duelGame: true, id: mi.id || 0, wA: mi.poidsA, wB: mi.poidsB, colorA: mi.couleurA, seed: mi.graine, msPerMove: 1e9, maxPlies: mi.maxPlies,
    drawWin: mi.drawWin, ouverture: mi.ouverture, equilibre: mi.equilibre, cfgA: cfg, cfgB: cfg, arbitrage: mi.arbitrage, depart: mi.depart || null };
}
function _rsResultat(d, ms) {
  return { coups: (d.moves || []).map((x) => ({ cells: x.cells.map((c) => ({ r: c.r, c: c.c })), dir: { q: x.dir.q, r: x.dir.r } })),
    vainqueur: d.result.winner, pourquoi: d.result.why, plies: d.result.plies, cb: d.result.cb, cw: d.result.cw, ms: ms };
}
function _rsJouer(k, mission) {
  return new Promise((res, rej) => {
    let f = RESEAU.fils[k];
    if (!f) { f = RESEAU.fils[k] = new Worker(URL.createObjectURL(new Blob([AI_WORKER_CODE], { type: 'application/javascript' }))); }
    const t0 = Date.now();
    f.onmessage = (e) => { const d = e.data; if (!d || !d.duelGame) return; if (d.error) rej(new Error(d.error)); else res(_rsResultat(d, Date.now() - t0)); };
    f.onerror = (ev) => rej(new Error((ev && ev.message) || 'fil de calcul arrêté'));
    f._rej = rej;
    f.postMessage(_rsMessage(mission));
  });
}

async function _rsBoucle(k) {
  while (RESEAU.branche) {
    if (!RESEAU.continuer) { await _rsDormir(RESEAU.battementS * 1000); continue; }
    const r = await _rsFetch('/ordo/missions/reclamer', { executant: RESEAU.executant.id });
    if (!RESEAU.branche) break;
    if (r.statut === 403 || r.statut === 409 || r.statut === 401) { _rsNote('✋ ' + (r.b.error || 'refusé') + ' : débranché'); reseauDebrancher(true); break; }
    if (r.statut !== 200) { RESEAU.erreur = r.b.error || ('erreur ' + r.statut); renderReseau(); await _rsDormir(30000); continue; }
    RESEAU.erreur = null;
    if (!r.b.mission) { RESEAU.attente = r.b.raison || 'pas de mission'; renderReseau(); await _rsDormir(15000); continue; }
    RESEAU.attente = null;
    const { mission, tentative } = r.b;
    RESEAU.enCours++; renderReseau();
    let res = null;
    try { res = await _rsJouer(k, mission); }
    catch (e) { if (RESEAU.branche) { _rsNote('✗ mission ' + mission.id + ' : ' + e.message); await _rsFetch('/ordo/tentatives/' + tentative.id + '/abandon', { jeton: tentative.jeton }); } }
    RESEAU.enCours = Math.max(0, RESEAU.enCours - 1);
    if (!res || !RESEAU.branche) { renderReseau(); continue; }
    const v = await _rsFetch('/ordo/tentatives/' + tentative.id + '/resultat', Object.assign({ jeton: tentative.jeton }, res));
    if (v.statut === 200) { RESEAU.faites++; _rsNote('✓ mission ' + mission.id + ' : ' + (res.vainqueur === 'D' ? 'nulle' : res.vainqueur + ' gagne') + ', ' + res.coups.length + ' demi-coups, ' + Math.round(res.ms / 1000) + ' s · vérifiée'); }
    else { RESEAU.refusees++; _rsNote('✗ mission ' + mission.id + ' refusée : ' + (v.b.error || v.statut)); }
  }
}

async function reseauBrancher() {
  if (RESEAU.branche) return;
  if (!_rsUrl()) return;
  if (!_rsJeton()) { RESEAU.erreur = 'se connecter d’abord'; renderReseau(); return; }
  const moteur = await _rsEmpreinte(), coeurs = _rsCoeurs();
  const r = await _rsFetch('/ordo/executants', { famille: 'navigateur', coeurs: coeurs, moteur: moteur, nom: 'navigateur' });
  if (r.statut !== 200) { RESEAU.erreur = r.b.error || ('branchement refusé (' + r.statut + ')'); renderReseau(); return; }
  Object.assign(RESEAU, { branche: true, continuer: true, executant: r.b.executant, battementS: r.b.battementS || 20, erreur: null, enCours: 0 });
  RESEAU.bat = setInterval(async function () {
    const b = await _rsFetch('/ordo/executants/' + RESEAU.executant.id + '/battement', {});
    if (b.statut === 200) { RESEAU.continuer = !!b.b.continuer; if (!b.b.actif) { _rsNote('✋ exécutant coupé par l’administrateur'); reseauDebrancher(true); } renderReseau(); }
  }, RESEAU.battementS * 1000);
  _rsNote('🔌 branché : ' + coeurs + ' cœur' + (coeurs > 1 ? 's' : ''));
  for (let k = 0; k < coeurs; k++) _rsBoucle(k);
}
async function reseauDebrancher(dejaRefuse) {
  if (!RESEAU.branche) return;
  RESEAU.branche = false; clearInterval(RESEAU.bat); RESEAU.bat = null;
  RESEAU.fils.forEach(function (f) { if (f) { try { f.terminate(); } catch (e) {} if (f._rej) f._rej(new Error('débranché')); } });
  RESEAU.fils = []; RESEAU.enCours = 0;
  if (!dejaRefuse && RESEAU.executant) { const r = await _rsFetch('/ordo/executants/' + RESEAU.executant.id + '/debrancher', {}); _rsNote('débranché' + (r.b && r.b.missionsRendues ? ' : ' + r.b.missionsRendues + ' mission(s) rendue(s) à la file' : '')); }
  renderReseau();
}
// fermer l'onglet débranche aussi (sinon : à l'expiration du bail, une minute plus tard)
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('pagehide', function () {
  if (RESEAU.branche && RESEAU.executant) _rsFetch('/ordo/executants/' + RESEAU.executant.id + '/debrancher', {}, 'POST', true);
});

async function reseauConnexion() {
  const v = function (id) { const e = document.getElementById(id); return e ? e.value.trim() : ''; };
  const corps = { email: v('rs-email'), password: (document.getElementById('rs-mdp') || {}).value || '', otp: v('rs-otp') || undefined };
  const pw = document.getElementById('rs-mdp'); if (pw) pw.value = '';
  // après des mots de passe faux pour ce compte, le serveur demande une preuve de travail (01-backend-api-layer.js)
  const r = await _authServeur(_rsUrl() || '', '/auth/login', corps, false);
  if (r.statut === 200 && r.b.token) { RESEAU.jeton = r.b.token; RESEAU.user = r.b.user || null; RESEAU.erreur = null; }   // en mémoire seulement
  else RESEAU.erreur = r.b.mfaRequired ? 'code MFA demandé' : (r.b.error || 'connexion refusée');
  reseauRafraichir();
}
function reseauDeconnexion() { reseauDebrancher(); RESEAU.jeton = null; RESEAU.user = null; RESEAU.admin = null; renderReseau(); }

async function reseauRafraichir() {
  if (!_rsUrl()) { renderReseau(); return; }
  const e = await _rsFetch('/ordo/etat'); RESEAU.etat = e.statut === 200 ? e.b : null;
  if (!RESEAU.etat) RESEAU.erreur = e.b.error || 'serveur injoignable';
  if (_rsJeton() && RESEAU.user && RESEAU.user.role === 'admin') {
    const x = await _rsFetch('/ordo/executants'); RESEAU.admin = x.statut === 200 ? x.b : { erreur: x.b.error };
  }
  renderReseau();
}
// administration (rôle admin et MFA côté serveur) : interrupteurs et campagnes
async function rsFamille(f, actif) { const r = await _rsFetch('/ordo/familles/' + f, { actif: actif }); if (r.statut !== 200) RESEAU.erreur = r.b.error; reseauRafraichir(); }
async function rsExecutant(id, actif) { const r = await _rsFetch('/ordo/executants/' + id + '/actif', { actif: actif }); if (r.statut !== 200) RESEAU.erreur = r.b.error; reseauRafraichir(); }
async function rsCampagneEtat(id, etat) { const r = await _rsFetch('/ordo/campagnes/' + id + '/etat', { etat: etat }); if (r.statut !== 200) RESEAU.erreur = r.b.error; reseauRafraichir(); }
function _rsPresets() {
  const L = [];
  if (typeof AI_WEIGHT_PRESETS !== 'undefined') Object.keys(AI_WEIGHT_PRESETS).forEach(function (k) { L.push({ id: 'p:' + k, nom: 'Style ' + k }); });
  for (let n = 2; n <= 8; n++) L.push({ id: 'n:' + n, nom: 'Poids du niveau ' + n });
  return L;
}
function _rsPoids(id) {
  const w = id.indexOf('p:') === 0 ? AI_WEIGHT_PRESETS[id.slice(2)] : _aiPoidsNiveau(+id.slice(2));
  return typeof _labComplet === 'function' ? _labComplet(w) : Object.assign({}, w);
}
async function rsCreerCampagne() {
  const v = function (id) { return (document.getElementById(id) || {}).value; };
  const auto = v('rs-c-type') === 'autojeu', n = parseInt(v('rs-c-paires'), 10) || 50;
  /* v3.24 : « auto-jeu » = A contre lui-même, une graine (donc une ouverture au hasard) par partie,
     pour constituer la base de positions d'un futur réseau de neurones « en ombre ». Ouverture de
     8 demi-coups tirés au hasard (au lieu de 6) : des parties plus variées. */
  const corps = auto
    ? { type: 'autojeu', nom: v('rs-c-nom') || 'base de positions', poidsA: _rsPoids(v('rs-c-a')), profondeur: parseInt(v('rs-c-prof'), 10) || 2, parties: n, maxPlies: 80, ouverture: 8, arbitrage: 2 }
    : { nom: v('rs-c-nom') || 'campagne', poidsA: _rsPoids(v('rs-c-a')), poidsB: _rsPoids(v('rs-c-b')),
        profondeur: parseInt(v('rs-c-prof'), 10) || 2, paires: n, maxPlies: 80, ouverture: 6, arbitrage: 2 };
  const r = await _rsFetch('/ordo/campagnes', corps);
  RESEAU.erreur = r.statut === 200 ? null : (r.b.error || ('refusé : ' + r.statut));
  if (r.statut === 200) _rsNote('campagne ' + r.b.campagne + ' créée : ' + r.b.missions + ' missions');
  reseauRafraichir();
}

function _rsStyle() {
  if (document.getElementById('rs-style')) return;
  const st = document.createElement('style'); st.id = 'rs-style';
  st.textContent = '#lab-reseau-host .ctrl-btn{display:inline-block;width:auto;padding:5px 12px;margin:2px 4px 2px 0;font-size:12.5px}'
    + '#lab-reseau-host .lab-options{display:flex;flex-wrap:wrap;align-items:center;gap:6px}#lab-reseau-host td .ctrl-btn{margin:0 0 0 8px;padding:2px 8px;font-size:11.5px}'
    + '#lab-reseau-host input,#lab-reseau-host select{background:var(--surface2);color:var(--text);border:1px solid var(--border);border-radius:6px;padding:4px 6px}';
  document.head.appendChild(st);
}
function renderReseau() {
  const hote = document.getElementById('lab-reseau-host'); if (!hote) return;
  _rsStyle();
  const url = _rsUrl(), E = RESEAU.etat;
  let h = '<p class="lab-intro">Prêter la puissance de cet appareil au Labo : le serveur distribue des parties à jouer entre deux réglages de l’IA, à profondeur fixe, à tous les appareils branchés (navigateurs, PC avec l’exécutant Node). '
    + 'Chaque partie rendue est <b>vérifiée</b> : le serveur la rejoue et recalcule lui-même des coups tirés au hasard, qui doivent être exactement ceux du moteur. Débrancher n’importe quand ne perd rien : la partie en cours repart dans la file.</p>';
  if (!url) {
    h += '<div class="lab-etat">Le serveur de calcul n’est pas encore en ligne. Ce réglage s’activera le jour où il le sera ; d’ici là, rien ne quitte cet appareil.</div>';
    hote.innerHTML = h; return;
  }
  if (E) {
    h += '<table class="lab-poids"><thead><tr><th>Famille</th><th>État</th><th>Branchés</th></tr></thead><tbody>';
    E.familles.forEach(function (f) {
      const adm = RESEAU.user && RESEAU.user.role === 'admin';
      h += '<tr><td>' + f.famille + '</td><td>' + (f.actif ? '🟢 ON' : '⚪ OFF') + (adm ? ' <button class="ctrl-btn lab-discret" data-click="rsFamille(\'' + f.famille + '\',' + !f.actif + ')">' + (f.actif ? 'débrancher' : 'brancher') + '</button>' : '') + '</td><td>' + f.branches + '</td></tr>';
    });
    h += '</tbody></table><div class="lab-note">Missions : ' + ['en_file', 'attribuee', 'faite'].map(function (k) { return ({ en_file: 'en attente', attribuee: 'en cours', faite: 'faites' })[k] + ' ' + ((E.missions && E.missions[k]) || 0); }).join(' · ') + '</div>';
    (E.campagnes || []).forEach(function (c) {
      const b = c.bilan, auto = c.type === 'autojeu';
      h += '<div class="lab-etat">' + (auto ? '🧠' : '📋') + ' <b>' + _obsE(c.nom) + '</b> (' + (auto ? 'auto-jeu, ' : '') + 'profondeur ' + c.profondeur + ', ' + c.paires + (auto ? ' parties' : ' paires') + (c.etat === 'pause' ? ', en pause' : '') + ') : ' + b.parties + ' partie' + (b.parties > 1 ? 's' : '') + ' faite' + (b.parties > 1 ? 's' : '')
        + (auto ? ' — ' + (b.positions || 0).toLocaleString('fr-FR') + ' positions · Noirs ' + b.noir + ' · nulles ' + b.nulles + ' · Blancs ' + b.blanc
          : ' — A ' + b.W + ' · nulles ' + b.D + ' · B ' + b.L + (b.elo != null ? ' · A ' + (b.elo >= 0 ? '+' : '') + b.elo + ' ± ' + b.marge + ' Elo' : '') + ' · SPRT : ' + b.sprt)
        + (RESEAU.user && RESEAU.user.role === 'admin' ? ' <button class="ctrl-btn lab-discret" data-click="rsCampagneEtat(' + c.id + ',\'' + (c.etat === 'pause' ? 'active' : 'pause') + '\')">' + (c.etat === 'pause' ? 'reprendre' : 'pause') + '</button> <button class="ctrl-btn lab-discret" data-click="rsCampagneEtat(' + c.id + ',\'finie\')">finir</button>' : '') + '</div>';
    });
  }
  if (!_rsJeton()) {
    h += '<h4>Se connecter au serveur de calcul</h4><div class="lab-options"><input id="rs-email" type="email" placeholder="adresse" autocomplete="username"> <input id="rs-mdp" type="password" placeholder="mot de passe" autocomplete="current-password"> <input id="rs-otp" inputmode="numeric" maxlength="6" placeholder="code MFA (si activé)" style="width:9em"> <button class="ctrl-btn" data-click="reseauConnexion()">Connexion</button></div>'
      + '<div class="lab-note">Un compte suffit (le serveur compte les parties de chacun). La connexion reste en mémoire : elle s’oublie en fermant la page.</div>';
  } else {
    const max = _rsCoeursMax(), n = _rsCoeurs();
    h += '<h4>Cet appareil</h4><div class="lab-options">'
      + '<label>Cœurs prêtés <select data-change="rsCoeurs(this.value)"' + (RESEAU.branche ? ' disabled' : '') + '>' + Array.from({ length: max }, function (_, i) { return '<option' + (i + 1 === n ? ' selected' : '') + '>' + (i + 1) + '</option>'; }).join('') + '</select> sur ' + max + '</label> '
      + (RESEAU.branche ? '<button class="ctrl-btn" data-click="reseauDebrancher()">⏹ Débrancher</button>' : '<button class="ctrl-btn" data-click="reseauBrancher()">🔌 Brancher</button>')
      + ' <button class="ctrl-btn lab-discret" data-click="reseauDeconnexion()">se déconnecter</button></div>';
    h += '<div class="lab-etat">' + (RESEAU.branche ? '🟢 Branché' + (RESEAU.continuer ? '' : ' — en pause : l’ordonnanceur ne donne plus de mission à cet appareil') + ' · ' + RESEAU.enCours + ' partie' + (RESEAU.enCours > 1 ? 's' : '') + ' en cours' + (RESEAU.attente && !RESEAU.enCours ? ' · ' + _obsE(RESEAU.attente) : '') : '⚪ Débranché')
      + ' · ' + RESEAU.faites + ' vérifiée' + (RESEAU.faites > 1 ? 's' : '') + (RESEAU.refusees ? ' · ' + RESEAU.refusees + ' refusée' + (RESEAU.refusees > 1 ? 's' : '') : '') + '</div>'
      + '<div class="lab-note">Un téléphone met en pause les pages en arrière-plan : la partie en cours repart alors dans la file au bout d’une minute. Garder la page ouverte pour prêter sa puissance.</div>';
    if (RESEAU.journal.length) h += '<div class="lab-note" style="font-family:\'DM Mono\',monospace;white-space:pre-line">' + RESEAU.journal.map(_obsE).join('\n') + '</div>';
    if (RESEAU.user && RESEAU.user.role === 'admin') {
      const P = _rsPresets(), opt = function (sel) { return P.map(function (p) { return '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' + _obsE(p.nom) + '</option>'; }).join(''); };
      h += '<h4>Administration</h4><div class="lab-options">Nouvelle campagne : <select id="rs-c-type" data-change="rsTypeCampagne(this.value)"><option value="duel">duel A contre B</option><option value="autojeu">auto-jeu (base de positions)</option></select>'
        + ' <input id="rs-c-nom" placeholder="nom" maxlength="60" style="width:10em"> A <select id="rs-c-a">' + opt('p:texel') + '</select><span id="rs-c-contre"> contre B <select id="rs-c-b">' + opt('n:3') + '</select></span>'
        + ' profondeur <select id="rs-c-prof"><option>1</option><option selected>2</option><option>3</option><option>4</option></select> <span id="rs-c-unite">paires</span> <input id="rs-c-paires" type="number" min="1" max="5000" value="50" style="width:5em"> <button class="ctrl-btn" data-click="rsCreerCampagne()">Créer</button></div>'
        + '<div class="lab-note" id="rs-c-aide" style="display:none">Auto-jeu : A joue contre lui-même, chaque partie depuis sa propre ouverture tirée au hasard (8 demi-coups). Les parties sont vérifiées comme les autres ; le serveur en tire la base de positions d’un futur réseau de neurones (<code>scripts/exporter-positions.js</code>), qui jouera « en ombre » à côté du juge actuel, sans le remplacer.</div>';
      const X = RESEAU.admin && RESEAU.admin.executants;
      if (X && X.length) {
        h += '<table class="lab-poids"><thead><tr><th>Exécutant</th><th>Compte</th><th>Cœurs</th><th>Faites</th><th>Refusées</th><th>Expirées</th><th>Vitesse</th><th></th></tr></thead><tbody>';
        X.slice(0, 30).forEach(function (x) {
          h += '<tr><td>' + x.famille + (x.branche ? '' : ' (débranché)') + '</td><td>' + _obsE(x.username || '') + '</td><td>' + x.coeurs + '</td><td>' + x.faites + '</td><td>' + x.rejetees + '</td><td>' + x.expirees + '</td><td>' + (x.ms_par_coup ? Math.round(x.ms_par_coup) + ' ms/coup (prof. ' + x.prof_mesure + ')' : '—') + '</td>'
            + '<td><button class="ctrl-btn lab-discret" data-click="rsExecutant(\'' + x.id + '\',' + !x.actif + ')">' + (x.actif ? '🟢 couper' : '⚪ rétablir') + '</button></td></tr>';
        });
        h += '</tbody></table>';
      } else if (RESEAU.admin && RESEAU.admin.erreur) h += '<div class="lab-note">' + _obsE(RESEAU.admin.erreur) + '</div>';
    }
  }
  if (RESEAU.erreur) h += '<div class="lab-note" style="color:#ef9a9a">' + _obsE(RESEAU.erreur) + '</div>';
  h += '<div class="lab-note">Ce qui part vers le serveur : le compte, le nombre de cœurs choisi, l’empreinte du moteur de l’IA et les parties jouées. Rien d’autre sur l’appareil.</div>';
  hote.innerHTML = h;
}
function renderLabReseau() { renderReseau(); if (_rsUrl() && !RESEAU.etat) reseauRafraichir(); }

// v3.24 : le formulaire de campagne selon son type (duel : A contre B en paires ; auto-jeu : A seul, en parties)
function rsTypeCampagne(type) {
  const auto = type === 'autojeu';
  const el = function (id) { return document.getElementById(id); };
  if (el('rs-c-contre')) el('rs-c-contre').style.display = auto ? 'none' : '';
  if (el('rs-c-unite')) el('rs-c-unite').textContent = auto ? 'parties' : 'paires';
  if (el('rs-c-aide')) el('rs-c-aide').style.display = auto ? '' : 'none';
  if (el('rs-c-paires') && auto && +el('rs-c-paires').value === 50) el('rs-c-paires').value = 1000;
}
