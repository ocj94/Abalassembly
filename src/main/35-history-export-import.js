/* ═══════════════════════════════════════════
   HISTORIQUE COMPLET — export/import en Aba-Pro
   Etend exportGameAbaPro() (une seule partie, presse-papier) a tout
   l'historique local (jusqu'a 200 parties), en un FICHIER telechargeable.
   Corps en Aba-Pro pur -- un vrai standard externe (page Pionniers,
   ABA-PRO.HLP), pas un format invente pour l'occasion -- donc lisible en
   principe par tout outil qui comprend cette notation, pas seulement ce
   site. Chaque partie garde un en-tete en commentaire (date, variante,
   resultat, joueurs) pour ne rien perdre de ce que l'historique local sait
   deja.
   ═══════════════════════════════════════════ */
function _bulkResultLabel(entry){
  if (!entry.winner) return 'Nulle';
  const qui = entry.winner === 'black' ? 'Noir' : 'Blanc';
  return qui + ' gagne' + (entry.reason ? ' (' + entry.reason + ')' : '');
}
function exportFullHistoryAbaPro(){
  const history = (typeof getGameHistory === 'function') ? getGameHistory() : [];
  if (!history.length){ if (typeof showToast === 'function') showToast('Aucune partie à exporter.'); return; }
  const saveLayout = currentLayout, saveBoard = board, saveCB = capturedByBlack, saveCW = capturedByWhite;
  const blocks = [];
  let skipped = 0;
  // Ordre chronologique (l'historique local est range du plus recent au
  // plus ancien) : plus naturel a relire dans un export.
  const ordered = history.slice().reverse();
  ordered.forEach(function(entry){
    if (!entry.code) { skipped++; return; }
    const parsed = gameCodeParse(entry.code);
    if (!parsed.ok) { skipped++; return; }
    currentLayout = parsed.layout || 'standard';
    initBoardState(); capturedByBlack = 0; capturedByWhite = 0;
    let turn = 'black';
    const tokens = [];
    for (let i = 0; i < parsed.moves.length; i++) {
      const mv = parsed.moves[i];
      const v = validateMove(mv.cells, mv.dir, turn);
      if (!v || !v.valid) break; // s'arrete net plutot que d'exporter une suite fausse
      const tok = moveToABAPRO(mv.cells, mv.dir, v.type);
      if (tok && tok !== '?') tokens.push(tok);
      applyMove({ cells: mv.cells, dir: mv.dir, info: v }, turn);
      turn = (turn === 'black') ? 'white' : 'black';
    }
    if (!tokens.length) { skipped++; return; }
    const label = (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[parsed.layout]) ? HEAT_VARIANT_LABEL[parsed.layout] : parsed.layout;
    const joueurs = (parsed.blackName || parsed.whiteName) ? (parsed.blackName||'?') + ' vs ' + (parsed.whiteName||'?') : '';
    const dateStr = entry.date ? entry.date.slice(0,10) : '';
    const head = '# ' + [dateStr, label, _bulkResultLabel(entry)].concat(joueurs?[joueurs]:[]).filter(Boolean).join(' · ');
    const body = tokens.map(function(t,i){ return (i%2===0 ? (Math.floor(i/2)+1)+'.' : '') + t; }).join(' ');
    blocks.push(head + '\n' + body);
  });
  currentLayout = saveLayout; board = saveBoard; capturedByBlack = saveCB; capturedByWhite = saveCW;
  if (!blocks.length){ if (typeof showToast === 'function') showToast('Aucune partie exploitable — rien à exporter.'); return; }
  const text = '# Abalassembly — export complet de l\u2019historique (' + blocks.length + ' partie' + (blocks.length>1?'s':'') + ')\n'
    + '# Notation Aba-Pro. Chaque bloc commence par une ligne "# date · variante · résultat · joueurs".\n\n'
    + blocks.join('\n\n');
  const b = new Blob([text], {type:'text/plain'});
  const u = URL.createObjectURL(b), a = document.createElement('a');
  a.href = u; a.download = 'abalassembly-historique.txt'; a.click();
  setTimeout(function(){ URL.revokeObjectURL(u); }, 1000);
  if (typeof showToast === 'function') showToast('📤 ' + blocks.length + ' partie' + (blocks.length>1?'s':'') + ' exportée' + (blocks.length>1?'s':'') + (skipped?(' (' + skipped + ' ignorée' + (skipped>1?'s':'') + ', illisible' + (skipped>1?'s':'') + ')'):''));
}

function openBulkHistoryImportModal(){
  let modal = document.getElementById('bulk-history-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'bulk-history-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(13,15,14,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML =
    '<div style="max-width:520px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:24px;max-height:90vh;overflow-y:auto">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:6px">Importer un historique</h3>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">Un fichier exporté depuis cet appareil ou un autre (« 📤 Exporter tout »). Les parties déjà présentes ici ne sont pas dupliquées ; celles qu\u2019un coup rend illisibles sont ignorées et comptées à part.</div>'
    + '<input type="file" id="bulk-history-file" accept=".txt" style="width:100%;margin-bottom:10px;font-size:12px;color:var(--muted)">'
    + '<div style="font-size:11px;color:var(--muted);margin:4px 0">— ou colle le contenu directement —</div>'
    + '<textarea id="bulk-history-text" placeholder="# 2026-01-01 · Standard · Noir gagne...\n1.a1b2 c3d4 ..." style="width:100%;height:110px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:\'DM Mono\',monospace;font-size:11px;box-sizing:border-box"></textarea>'
    + '<div id="bulk-history-status" style="font-size:12px;margin:8px 0;min-height:16px"></div>'
    + '<div style="display:flex;gap:8px">'
      + '<button class="ctrl-btn" onclick="_doBulkHistoryImport()" style="flex:1">Importer</button>'
      + '<button onclick="document.getElementById(\'bulk-history-modal\').remove()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:8px 16px;cursor:pointer">Fermer</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(modal);
  const fileInput = document.getElementById('bulk-history-file');
  if (fileInput) fileInput.addEventListener('change', function(){
    const f = fileInput.files && fileInput.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = function(){ const ta = document.getElementById('bulk-history-text'); if (ta) ta.value = String(reader.result||''); };
    reader.readAsText(f);
  });
}

/* Rejoue chaque bloc depuis la position INITIALE de sa variante (jamais le
   plateau en cours) et reconstruit un code ABAL1 segment par segment avec
   les MEMES primitives que gameCodeEncode() (coordToABAPRO, _gcDirIndex) --
   aucune logique d'encodage reinventee ici. Un token illisible arrete la
   partie a cet endroit (import partiel) plutot que d'accepter une suite
   fausse en silence : meme principe que gameCodeLoad(). */
function _parseBulkHistoryText(text){
  const blocks = String(text||'').split(/\n(?=#)/).map(function(s){ return s.trim(); }).filter(Boolean);
  const saveLayout = currentLayout, saveBoard = board, saveCB = capturedByBlack, saveCW = capturedByWhite;
  const results = [];
  blocks.forEach(function(block){
    const lines = block.split('\n');
    const headLine = lines[0] || '';
    const bodyLines = lines.slice(1).join(' ');
    // en-tete "# date · variante · resultat[ · joueurs]" -- tolerant : les
    // champs manquants ou en trop ne bloquent pas l'import, ils sont juste
    // absents du resultat.
    const parts = headLine.replace(/^#\s*/, '').split('·').map(function(s){ return s.trim(); });
    const dateStr = (parts[0] && /^\d{4}-\d{2}-\d{2}/.test(parts[0])) ? parts[0] : null;
    let variantLabel = parts[1] || null;
    const resultLabel = parts[2] || null;
    const joueursLabel = parts[3] || null;
    // retrouve la cle de variante depuis son libelle (HEAT_VARIANT_LABEL
    // est cle->libelle ; on inverse). A defaut : standard, jamais un plantage.
    let layout = 'standard';
    if (variantLabel && typeof HEAT_VARIANT_LABEL !== 'undefined'){
      const hit = Object.keys(HEAT_VARIANT_LABEL).find(function(k){ return HEAT_VARIANT_LABEL[k]===variantLabel; });
      if (hit) layout = hit;
    } else if (typeof LAYOUTS !== 'undefined' && variantLabel && LAYOUTS[variantLabel]) layout = variantLabel;

    const tokens = bodyLines.replace(/\d+\./g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!tokens.length){ results.push({ok:false, reason:'bloc sans coup lisible'}); return; }

    currentLayout = layout; initBoardState(); capturedByBlack = 0; capturedByWhite = 0;
    let turn = 'black', body = '', played = 0;
    for (let i = 0; i < tokens.length; i++) {
      const mv = resolveAbaProToken(tokens[i], turn);
      if (!mv) break; // token illisible ou coup illegal ici : import partiel, pas de plantage
      const v = validateMove(mv.cells, mv.dir, turn);
      if (!v || !v.valid) break;
      const di = _gcDirIndex(mv.dir);
      if (di < 0) break;
      body += String(mv.cells.length);
      for (let k = 0; k < mv.cells.length; k++) body += coordToABAPRO(mv.cells[k].r, mv.cells[k].c);
      body += String(di);
      applyMove({ cells: mv.cells, dir: mv.dir, info: v }, turn);
      turn = (turn === 'black') ? 'white' : 'black';
      played++;
    }
    if (!played){ results.push({ok:false, reason:'aucun coup exploitable'}); return; }
    let blackName = '', whiteName = '';
    if (joueursLabel){ const m = joueursLabel.split(' vs '); blackName = (m[0]||'').trim(); whiteName = (m[1]||'').trim(); if(blackName==='?')blackName=''; if(whiteName==='?')whiteName='';}
    let winner = null, reason = null;
    if (resultLabel && resultLabel !== 'Nulle'){
      winner = resultLabel.indexOf('Noir')===0 ? 'black' : (resultLabel.indexOf('Blanc')===0 ? 'white' : null);
      const rm = resultLabel.match(/\(([^)]+)\)/); if (rm) reason = rm[1];
    }
    const names = _gcEncodeNameForCode(blackName) + '|' + _gcEncodeNameForCode(whiteName);
    const code = GAME_CODE_TAG + ':' + layout + ':' + names + ':' + body;
    results.push({
      ok: true, partial: played < tokens.length,
      entry: {
        id: 'import_' + Date.now() + '_' + Math.random().toString(36).slice(2,7),
        date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        variant: layout, mode: 'import', humanColor: 'black',
        winner: winner, reason: reason, moveCount: played,
        aiStyle: null, aiDiff: null, engine: null,
        blackName: blackName, whiteName: whiteName, code: code
      }
    });
  });
  currentLayout = saveLayout; board = saveBoard; capturedByBlack = saveCB; capturedByWhite = saveCW;
  return results;
}
function _doBulkHistoryImport(){
  const ta = document.getElementById('bulk-history-text');
  const status = document.getElementById('bulk-history-status');
  const text = ta ? ta.value : '';
  if (!text || !text.trim()){ if (status){ status.style.color='#e05c4b'; status.textContent = 'Colle un texte ou choisis un fichier.'; } return; }
  const results = _parseBulkHistoryText(text);
  if (!results.length){ if (status){ status.style.color='#e05c4b'; status.textContent = 'Aucun bloc reconnu (attendu : une ligne "# ..." par partie).'; } return; }

  let history = (typeof getGameHistory === 'function') ? getGameHistory() : [];
  const existingCodes = new Set(history.map(function(e){ return e.code; }));
  let added = 0, dupes = 0, partial = 0, failed = 0;
  results.forEach(function(r){
    if (!r.ok){ failed++; return; }
    if (existingCodes.has(r.entry.code)){ dupes++; return; }
    existingCodes.add(r.entry.code);
    history.unshift(r.entry);
    added++;
    if (r.partial) partial++;
  });
  if (history.length > HIST_MAX) history = history.slice(0, HIST_MAX);
  try { localStorage.setItem(GAME_HISTORY_KEY, JSON.stringify(history)); } catch(e){
    if (status){ status.style.color='#e05c4b'; status.textContent = 'Stockage indisponible ou plein.'; } return;
  }
  if (status){
    status.style.color = added ? 'var(--gold)' : '#e05c4b';
    status.textContent = added + ' partie' + (added>1?'s':'') + ' importée' + (added>1?'s':'')
      + (dupes?(', ' + dupes + ' déjà présente' + (dupes>1?'s':'')):'')
      + (partial?(', ' + partial + ' partielle' + (partial>1?'s':'') + ' (coup illisible en route)'):'')
      + (failed?(', ' + failed + ' illisible' + (failed>1?'s':'')):'');
  }
  if (typeof _renderHistoryList === 'function') _renderHistoryList();
}

function openApgnImportModal(){
  let modal = document.getElementById('apgn-import-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'apgn-import-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(13,15,14,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';

  // Object.keys(LAYOUTS) placerait '69' en premier (les cles numeriques
  // sont toujours enumerees avant les cles textuelles en JS, quel que soit
  // l'ordre d'insertion) -- ce qui selectionnait silencieusement la
  // variante "69" par defaut au lieu de "standard", faisant echouer tout
  // import d'une sequence classique. Trouve en testant en conditions
  // reelles (Chromium headless), pas suppose correct. "standard" est donc
  // trie explicitement en tete de liste.
  const variantKeys = (typeof LAYOUTS !== 'undefined') ? Object.keys(LAYOUTS).sort(function(a,b){
    if (a === 'standard') return -1; if (b === 'standard') return 1; return 0;
  }) : [];
  const variantOptions = variantKeys.map(function(k){
    const label = (typeof HEAT_VARIANT_LABEL !== 'undefined' && HEAT_VARIANT_LABEL[k]) ? HEAT_VARIANT_LABEL[k] : k;
    return '<option value="' + k + '">' + label + '</option>';
  }).join('');

  modal.innerHTML =
    '<div style="max-width:520px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:24px;max-height:90vh;overflow-y:auto">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:6px">Importer une notation Aba-Pro</h3>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">Colle une séquence de coups en notation Aba-Pro (ex. « e5f6 c3b2 »), avec ou sans numéros de coup — la notation la plus répandue dans la communauté Abalone, pas un format propriétaire d\u2019un site en particulier.</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:10px">'
      + '<select id="apgn-import-variant" style="flex:1;padding:7px;border-radius:7px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px">' + variantOptions + '</select>'
      + '<select id="apgn-import-first" style="flex:1;padding:7px;border-radius:7px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:12px"><option value="black">Noir commence</option><option value="white">Blanc commence</option></select>'
    + '</div>'
    + '<textarea id="apgn-import-text" placeholder="e5f6 c3b2 d1e3..." style="width:100%;height:100px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:\'DM Mono\',monospace;font-size:12px;box-sizing:border-box"></textarea>'
    + '<div id="apgn-import-status" style="font-size:12px;margin:8px 0;min-height:16px"></div>'
    + '<div style="display:flex;gap:8px">'
      + '<button class="ctrl-btn" onclick="_doApgnImport()" style="flex:1">Importer</button>'
      + '<button onclick="document.getElementById(\'apgn-import-modal\').remove()" style="background:none;border:1px solid var(--border);color:var(--muted);border-radius:8px;padding:8px 16px;cursor:pointer">Fermer</button>'
    + '</div>'
    + '</div>';
  document.body.appendChild(modal);
}

/* Retire les lignes d'en-tete entre crochets ([Abalassembly], [Score],
   [Variante]...) avant de parser les coups. Sans ça, coller un export
   COMPLET du site echouait : le parseur s'arretait au premier jeton
   illisible, c'est-a-dire des la premiere ligne d'en-tete. L'export et
   l'import doivent former un aller-retour, d'autant plus depuis que
   l'en-tete s'est enrichi (date, variante, IA, moteur). */
function _stripApgnHeaders(text){
  return String(text).split('\n')
    .filter(function(l){ return !/^\s*\[[^\]]*\]/.test(l); })
    .join('\n').trim();
}

function _doApgnImport(){
  const textEl = document.getElementById('apgn-import-text');
  const status = document.getElementById('apgn-import-status');
  const raw = textEl ? textEl.value.trim() : '';
  if (!raw) { if (status){ status.textContent = 'Colle une séquence de coups d\u2019abord.'; status.style.color = '#e05c4b'; } return; }
  const text = _stripApgnHeaders(raw);
  if (!text) { if (status){ status.textContent = 'Aucun coup trouvé — le texte ne contient que des en-têtes.'; status.style.color = '#e05c4b'; } return; }

  const tokens = text.replace(/\d+\./g,' ').trim().split(/\s+/).filter(Boolean);
  const variant = document.getElementById('apgn-import-variant').value;
  const first = document.getElementById('apgn-import-first').value;

  // Meme ordre que loadMigsGame()/loadAOGame() (deja en place, deja teste) :
  // showPage('game') D'ABORD, puis mise en place du plateau, puis rejeu --
  // evite que le plateau reste invisible si on importe depuis une autre page.
  if (typeof showPage === 'function') showPage('game');
  currentLayout = variant;
  if (typeof initBoardState === 'function') initBoardState();
  capturedByBlack = 0; capturedByWhite = 0;
  _replaySeqToSnapshots(text, 'Partie importée', first);

  const played = boardSnapshots.length;
  const modal = document.getElementById('apgn-import-modal');
  if (played === 0) {
    if (status) { status.textContent = 'Aucun coup reconnu — vérifie la notation ou la variante choisie.'; status.style.color = '#e05c4b'; }
    return;
  }
  if (modal) modal.remove();
  if (played < tokens.length) {
    if (typeof showToast === 'function') showToast('⚠️ Importé partiellement : ' + played + '/' + tokens.length + ' coups reconnus');
  } else {
    if (typeof showToast === 'function') showToast('✅ Partie importée : ' + played + ' coups');
  }
}

function openGameCodePanel() {
  const code = gameCodeEncode();
  const myColorGuess = _gcGuessMyColor();
  if (!_gcMyColorChoice) _gcMyColorChoice = myColorGuess;
  let modal = document.getElementById('gamecode-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'gamecode-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(13,15,14,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  modal.innerHTML =
    '<div style="max-width:520px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:24px;max-height:90vh;overflow-y:auto">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:6px">Partie par code</h3>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">Joue ton coup, copie le code, envoie-le. Ton adversaire le colle, joue, et te renvoie le sien. Aucun compte, aucun serveur.</div>'
    + '<div id="gamecode-vs-line" style="font-size:13px;color:var(--gold);margin-bottom:12px;' + ((gcBlackName || gcWhiteName) ? '' : 'display:none') + '">⚫ <span id="gc-vs-black">' + (gcBlackName || '?') + '</span>  vs  ⚪ <span id="gc-vs-white">' + (gcWhiteName || '?') + '</span></div>'
    + '<div style="font-size:11px;letter-spacing:1px;color:var(--muted);margin-bottom:6px">TON NOM (optionnel, apparait dans le code, s\'applique en tapant)</div>'
    + '<div style="display:flex;gap:8px;margin-bottom:14px;align-items:center">'
    + '<input id="gamecode-myname" oninput="gcOnNameInput()" value="' + (gcMyName || '').replace(/"/g,'&quot;') + '" placeholder="Ton prenom" maxlength="24" style="flex:1;padding:8px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:13px">'
    + '<span id="gc-color-black" onclick="gcSetMyColor(\'black\')" style="cursor:pointer;font-size:22px;line-height:1;padding:4px;border-radius:50%;' + (_gcMyColorChoice==='black' ? 'background:rgba(200,168,75,0.25)' : 'opacity:.35') + '" title="Je joue noir">⚫</span>'
    + '<span id="gc-color-white" onclick="gcSetMyColor(\'white\')" style="cursor:pointer;font-size:22px;line-height:1;padding:4px;border-radius:50%;' + (_gcMyColorChoice==='white' ? 'background:rgba(200,168,75,0.25)' : 'opacity:.35') + '" title="Je joue blanc">⚪</span>'
    + '</div>'
    + '<div style="font-size:11px;letter-spacing:1px;color:var(--muted);margin-bottom:6px">TON CODE'
    + (code ? '' : ' — aucun coup joue pour l\'instant') + '</div>'
    + '<textarea id="gamecode-out" readonly style="width:100%;height:80px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:\'DM Mono\',monospace;font-size:12px;word-break:break-all">'
    + (code || '') + '</textarea>'
    + '<div style="display:flex;gap:8px;margin-top:8px">'
    + '<button class="ctrl-btn" onclick="copyGameCode()" style="flex:1">Copier</button>'
    + '</div>'
    + '<div style="font-size:11px;letter-spacing:1px;color:var(--muted);margin:14px 0 6px">LIEN DIRECT'
    + (location.protocol === 'file:' ? ' — hors ligne : ce lien n\'ouvre que sur cet appareil' : '') + '</div>'
    + '<input id="gamecode-link" readonly value="' + ((gameShareLink() || '').replace(/"/g, '&quot;')) + '" style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:\'DM Mono\',monospace;font-size:11px">'
    + '<div style="display:flex;gap:8px;margin-top:8px;margin-bottom:18px">'
    + '<button class="ctrl-btn" onclick="copyGameLink()" style="flex:1">Copier le lien</button>'
    + '</div>'
    + '<div style="font-size:11px;letter-spacing:1px;color:var(--muted);margin-bottom:6px">CODE RECU</div>'
    + '<textarea id="gamecode-in" placeholder="ABAL1:standard:..." style="width:100%;height:80px;background:var(--bg);border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:\'DM Mono\',monospace;font-size:12px"></textarea>'
    + '<div id="gamecode-msg" style="font-size:12px;margin-top:8px;min-height:18px"></div>'
    + '<div style="display:flex;gap:8px;margin-top:10px;justify-content:flex-end">'
    + '<button class="ctrl-btn" onclick="document.getElementById(\'gamecode-modal\').remove()">Fermer</button>'
    + '<button class="ctrl-btn" onclick="submitGameCode()">Charger la partie</button>'
    + '</div></div>';
  document.body.appendChild(modal);
}

function copyGameCode() {
  const ta = document.getElementById('gamecode-out');
  if (!ta || !ta.value) { showToast('Aucun coup a envoyer — joue d\'abord'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(ta.value).then(function(){ showToast('Code copie'); })
      .catch(function(){ ta.select(); });
  } else { ta.select(); }
}

/* ─── LIEN PARTAGEABLE D'UNE PARTIE (?partie=) ───────────────────────
   ?pos= transporte deja une POSITION vers l'editeur ; celui-ci transporte une
   PARTIE entiere. Le contenu est exactement le code ABAL1 produit par
   gameCodeEncode, place tel quel dans l'URL : aucun base64, aucune
   compression. Le lien reste donc lisible a l'oeil, et surtout un lien
   trafique est rejete par la MEME regex stricte que le copier-coller manuel,
   sans second chemin d'analyse a maintenir. En file:// le lien pointe vers le
   fichier local : il fonctionne sur cet appareil et nulle part ailleurs, ce
   que l'interface dit explicitement plutot que de fabriquer une URL publique
   que ce fichier n'a aucun moyen de connaitre. */
function gameShareLink() {
  const code = (typeof gameCodeEncode === 'function') ? gameCodeEncode() : null;
  if (!code) return null;
  const base = (location.origin && location.origin !== 'null')
    ? location.origin + location.pathname
    : String(location.href).split('?')[0].split('#')[0];
  return base + '?partie=' + encodeURIComponent(code);
}
function copyGameLink() {
  const url = gameShareLink();
  if (!url) { showToast('Aucun coup a partager — joue d\'abord'); return; }
  const local = (location.protocol === 'file:');
  const dit = function(){ showToast(local ? 'Lien copie — local a cet appareil' : 'Lien copie'); };
  const champ = document.getElementById('gamecode-link');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(dit).catch(function(){ if (champ) champ.select(); });
  } else if (champ) { champ.select(); dit(); }
}
/* Au chargement : si l'URL contient ?partie=, charge la partie et la rejoue. */
function loadGameFromURL() {
  try {
    const code = new URLSearchParams(location.search).get('partie');
    if (!code) return;
    const res = gameCodeLoad(code);
    if (!res || !res.ok) { showToast('Lien de partie illisible' + (res && res.reason ? ' : ' + res.reason : '')); return; }
    /* Le parametre est retire de la barre d'adresse une fois charge, sinon un
       rechargement ou un retour arriere ecraserait la partie en cours par
       celle du lien. replaceState echoue sur certains file:// : sans
       consequence, la partie est deja chargee. */
    try { history.replaceState(null, '', String(location.href).split('?')[0].split('#')[0]); } catch(e) {}
    showToast(res.plies + ' coups charges depuis le lien');
  } catch(e) { /* URL illisible : on demarre normalement */ }
}

function submitGameCode() {
  const ta = document.getElementById('gamecode-in');
  const msg = document.getElementById('gamecode-msg');
  if (!ta) return;
  const res = gameCodeLoad(ta.value);
  if (!res.ok) {
    if (msg) { msg.style.color = '#e05c4b'; msg.textContent = res.reason; }
    return;
  }
  const modal = document.getElementById('gamecode-modal');
  if (modal) modal.remove();
  showToast(res.plies + ' coups charges — trait aux ' + (res.turn === 'black' ? 'Noirs' : 'Blancs'));
}

/* ── 2. ANALYSE D'APRES-PARTIE ───────────────────────────────────────
   Le Coach commente en direct, l'evaluation donne un chiffre a l'instant
   present, mais rien ne disait ou la partie avait bascule. On rejoue les
   instantanes deja stockes et on regarde ou l'evaluation s'effondre. */

function postGameReview(myColor) {
  if (typeof boardSnapshots === 'undefined' || boardSnapshots.length < 2) return null;
  const me = myColor || (typeof humanColor !== 'undefined' ? humanColor : 'black');
  const saved = { b: board, cb: capturedByBlack, cw: capturedByWhite };
  const evals = [];
  let firstLoss = -1;
  try {
    for (let i = 0; i < boardSnapshots.length; i++) {
      const s = boardSnapshots[i];
      board = s.board;
      capturedByBlack = s.capturedByBlack;
      capturedByWhite = s.capturedByWhite;
      evals.push(evaluateBoard(me));
      const lost = (me === 'black') ? s.capturedByWhite : s.capturedByBlack;
      if (firstLoss < 0 && lost > 0) firstLoss = i + 1;
    }
  } catch (e) {
    return null;
  } finally {
    board = saved.b; capturedByBlack = saved.cb; capturedByWhite = saved.cw;
  }

  /* Coup charniere : la plus forte chute d'evaluation entre deux positions
     consecutives. On l'attribue au coup qui precede la chute. */
  let worst = { ply: -1, drop: 0 };
  for (let i = 1; i < evals.length; i++) {
    const drop = evals[i - 1] - evals[i];
    if (drop > worst.drop) worst = { ply: i + 1, drop: drop };
  }
  return {
    color: me,
    plies: boardSnapshots.length,
    firstLossPly: firstLoss,
    turning: worst.ply > 0 ? worst : null,
    turningLabel: worst.ply > 0 ? (boardSnapshots[worst.ply - 1].label || '') : '',
    evalStart: evals[0],
    evalEnd: evals[evals.length - 1]
  };
}

function showPostGameReview() {
  const r = postGameReview();
  if (!r) { showToast('Pas assez de coups pour une analyse'); return; }
  let modal = document.getElementById('review-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'review-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:3500;background:rgba(13,15,14,0.92);backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;padding:20px';
  const line = function(k, v) {
    return '<div style="display:flex;justify-content:space-between;gap:12px;padding:7px 0;border-bottom:1px solid var(--border)">'
      + '<span style="color:var(--muted);font-size:13px">' + k + '</span>'
      + '<span style="color:var(--text);font-size:13px;font-family:\'DM Mono\',monospace">' + v + '</span></div>';
  };
  modal.innerHTML =
    '<div style="max-width:460px;width:100%;background:var(--surface);border:1px solid var(--gold-dim);border-radius:14px;padding:24px">'
    + '<h3 style="font-family:\'Playfair Display\',serif;color:var(--white);margin-bottom:4px">Apres la partie</h3>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:14px">Calcule a partir des positions reelles de la partie, avec la meme evaluation que l\'IA.</div>'
    + line('Coups joues', r.plies)
    + line('Premiere bille perdue', r.firstLossPly > 0 ? ('coup ' + r.firstLossPly) : 'aucune')
    + line('Position basculee au', r.turning ? ('coup ' + r.turning.ply + (r.turningLabel ? ' (' + r.turningLabel + ')' : '')) : 'pas de bascule nette')
    + line('Evaluation debut → fin', Math.round(r.evalStart) + ' → ' + Math.round(r.evalEnd))
    + '<div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end">'
    + '<button class="ctrl-btn" onclick="document.getElementById(\'review-modal\').remove()">Fermer</button>'
    + '</div></div>';
  document.body.appendChild(modal);
}

/* ── 3. PUZZLE DU JOUR ───────────────────────────────────────────────
   Le probleme du mois donne une raison de revenir le mois prochain.
   Celui-ci en donne une pour demain. Deterministe par la date : tout le
   monde a le meme, sans compte ni serveur. */

function dayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0')
       + '-' + String(d.getDate()).padStart(2, '0');
}
function daySeed() {
  const s = dayStr();
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

function currentDailyPuzzle() {
  const day = dayStr();
  if (!progress.daily || progress.daily.day !== day) {
    let idx = daySeed() % SINGLE_MOVE_PUZZLE_COUNT;
    /* Evite de servir le meme que le probleme du mois le jour ou ils tombent
       ensemble : deux cartes identiques sur la meme page font negligé. */
    if (progress.monthly && progress.monthly.idx === idx) idx = (idx + 1) % SINGLE_MOVE_PUZZLE_COUNT;
    const prevStreak = (progress.daily && progress.daily.solved
      && daysBetween(progress.daily.day, day) === 1) ? (progress.daily.streak || 0) : 0;
    progress.daily = { day: day, idx: idx, solved: false, streak: prevStreak };
    saveProgress(progress);
  }
  const p = PUZZLES[progress.daily.idx];
  return {
    idx: progress.daily.idx, puzzle: p,
    niveau: MONTHLY_LEVEL_LABEL[p.d] || 'MOYEN',
    trait: p.c === 'black' ? 'NOIR' : 'BLANC',
    objectif: p.def ? 'PARER LA MENACE' : 'TROUVER LE COUP GAGNANT',
    solved: !!progress.daily.solved,
    streak: progress.daily.streak || 0
  };
}

function playDailyPuzzle() {
  const dc = currentDailyPuzzle();
  showPage('puzzles');
  if (typeof startPuzzle === 'function') startPuzzle(dc.idx);
}

function checkDailyCompletion(solvedIdx) {
  const dc = currentDailyPuzzle();
  if (solvedIdx !== dc.idx || progress.daily.solved) return;
  progress.daily.solved = true;
  progress.daily.streak = (progress.daily.streak || 0) + 1;
  saveProgress(progress);
  addXp(25, 'Puzzle du jour resolu');
  setTimeout(function(){
    showToast('Puzzle du jour resolu ! +25 XP'
      + (progress.daily.streak > 1 ? ' — ' + progress.daily.streak + ' jours d\'affilee' : ''));
  }, 700);
  renderDailyCard();
}

function renderDailyCard() {
  const host = document.getElementById('daily-puzzle-card');
  if (!host) return;
  const dc = currentDailyPuzzle();
  const certified = (typeof isPuzzleCertified === 'function') && isPuzzleCertified(dc.idx);
  host.innerHTML =
    '<div style="font-size:11px;letter-spacing:1px;color:var(--muted);margin-bottom:10px">'
      + 'NIVEAU : <strong style="color:var(--gold)">' + dc.niveau + '</strong> &nbsp;&nbsp; '
      + 'TRAIT : <strong style="color:var(--gold)">' + dc.trait + '</strong> &nbsp;&nbsp; '
      + 'OBJECTIF : <strong style="color:var(--gold)">' + dc.objectif + '</strong>'
      + (certified ? ' &nbsp;&nbsp; <span style="color:#5ab48c" title="Coup vérifié directement contre le moteur du site">🏅 Certifié</span>' : '')
    + '</div>'
    + (dc.solved
        ? '<div style="color:#5ab48c;font-size:13px;margin-bottom:10px">Resolu aujourd\'hui'
          + (dc.streak > 1 ? ' — ' + dc.streak + ' jours d\'affilee' : '') + '</div>'
        : (dc.streak > 0
            ? '<div style="font-size:13px;color:var(--muted);margin-bottom:10px">Serie en cours : ' + dc.streak + ' jour(s)</div>'
            : ''))
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<button class="ctrl-btn" onclick="playDailyPuzzle()">Jouer le puzzle du jour</button>'
    + '<button class="ctrl-btn" onclick="exportPuzzleAPGN(' + dc.idx + ')" title="Copie la position et la solution au format Aba-Pro">📋 Exporter (APGN)</button>'
    + '</div>';
}


</script>