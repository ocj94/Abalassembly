/* ═══════════════════════════════════════════
   FRIENDS PAGE
═══════════════════════════════════════════ */
const friendsData = {
  online: [
    { name:'FightClub', handle:'FightClub', color:'#4a1c5a', elo:1950, status:'En partie vs Gramgroum', online:true },
    { name:'Vincent F', handle:'Vincent_F', color:'#1c3d5a', elo:2189, status:'En ligne — inactif', online:true },
    { name:'Chriscool', handle:'Chriscool', color:'#3a2a4a', elo:1680, status:'Dans les menus', online:true },
  ],
  offline: [
    { name:'Gramgroum', handle:'Gramgroum', color:'#5a3a1c', elo:1780, status:'Vu il y a 2h', online:false },
    { name:'Claudie', handle:'Claudie_ABA', color:'#1c4a4a', elo:1520, status:'Vu hier', online:false },
    { name:'Gerard Ngan', handle:'GerardN', color:'#3d4a1c', elo:1340, status:'Vu il y a 3 jours', online:false },
  ],
  suggestions: [
    { name:'MarbleKing_FR', handle:'MarbleKing', color:'#3a2a2a', elo:2289, reason:'ELO proche du votre' },
    { name:'BoulePower', handle:'BoulePower', color:'#2a3a35', elo:1420, reason:'Meme pays (France)' },
  ]
};

/* Les contacts ci-dessous sont fictifs — noms, ELO, « vu il y a 2 h ». Sans
   comptes ni serveur, il ne peut pas en etre autrement ; la page le dit donc
   a l'ecran plutot que de les faire passer pour de vrais joueurs. C'est la
   meme regle que pour la page Comparer. */
function _friendsDemoNotice(){
  const host = document.getElementById('friends-online');
  if (!host || document.getElementById('friends-demo-note')) return;
  const d = document.createElement('div');
  d.id = 'friends-demo-note';
  d.style.cssText = 'margin:0 0 12px;padding:10px 14px;border:1px dashed var(--border);'
    + 'border-radius:8px;font-size:12px;color:var(--muted);text-align:center';
  d.innerHTML = "Ces contacts sont des <strong>exemples de démonstration</strong>. "
    + "Il n'y a ni comptes ni serveur : pour jouer réellement contre quelqu'un, "
    + "utilisez <strong>Partie par code</strong>.";
  host.parentNode.insertBefore(d, host);
}

function renderFriends() {
  _friendsDemoNotice();
  function friendRow(f, isSug) {
    return [
      '<div class="friend-row">',
      '<div class="friend-avatar" style="background:'+f.color+'">'+f.name[0].toUpperCase(),
      f.online!==undefined ? '<div class="'+(f.online?'online-dot':'offline-dot')+'"></div>' : '',
      '</div>',
      '<div class="friend-info">',
      '<div class="friend-name">'+f.name+' <span style="font-size:11px;color:var(--muted)">@'+f.handle+'</span></div>',
      '<div class="friend-status">'+(isSug ? '💡 '+f.reason : f.status)+'</div>',
      '</div>',
      '<span style="font-family:DM Mono,monospace;font-size:12px;color:var(--gold);margin-right:8px">'+f.elo+'</span>',
      '<button onclick="showToast(\'Invitation envoyee a @'+f.handle+'!\')" class="defy-btn">'+(isSug?'Ajouter':'Defier')+'</button>',
      '</div>'
    ].join('');
  }
  const on = document.getElementById('friends-online');
  const off = document.getElementById('friends-offline');
  const sug = document.getElementById('friends-suggestions');
  if (on && on.children.length===0)  on.innerHTML  = friendsData.online.map(function(f){return friendRow(f,false);}).join('');
  if (off && off.children.length===0) off.innerHTML = friendsData.offline.map(function(f){return friendRow(f,false);}).join('');
  if (sug && sug.children.length===0) sug.innerHTML = friendsData.suggestions.map(function(f){return friendRow(f,true);}).join('');
}

/* ─── Update DOMContentLoaded ─── */
document.addEventListener('DOMContentLoaded', function() {
  initSession();
  initSidebar();
  loadA11Y();
  applyTechMode();
  renderStreak();
  updateTopBar();
  initPWA();
  setTimeout(renderBots, 200);
  setTimeout(renderLeaderboard, 300);
  initBoardState();
  setTimeout(renderEngageBar, 250);
  renderLangMenu();
  applyTranslations();  // applique la langue mémorisée au chargement
  setTimeout(maybeShowLangBanner, 800);
  if (typeof sanitizeProgress === 'function') sanitizeProgress();
  if (typeof checkIncomingReferral === 'function') checkIncomingReferral();
  // Restaure le skin de billes sauvegardé
  try { var sv = localStorage.getItem('abalone_marble_skin'); if (sv && MARBLE_SKINS[sv]) boardTheme.marbleSkin = sv; } catch(e){}
  applyMarbleSkin();
  setTimeout(renderSkinGallery, 200);
  /* Mode Enfant : restaure l'interface si la session precedente l'avait laisse
     actif. On repasse par toggleKidsMode plutot que de dupliquer ses effets —
     une seule fonction decide de ce que le mode masque, et elle ne peut pas
     deriver de sa copie. La bascule attend kidsMode a false pour activer. */
  if (progress.kidsMode && typeof toggleKidsMode === 'function') {
    kidsMode = false;
    toggleKidsMode();
  }
  if (typeof initA11y === 'function') initA11y();
  if (typeof renderA11yPanel === 'function') renderA11yPanel();
  // Refleter l'etat courant sur les nouveaux interrupteurs de Parametres.
  if (typeof syncNotationToggles === 'function') syncNotationToggles();
  if (typeof syncSoundToggles === 'function') { var _sd=document.getElementById('settings-sound-toggle'); if(_sd) _sd.checked = (typeof soundEnabled==='undefined')||soundEnabled; }
  const activePg = document.querySelector('.page.active');
  if (!activePg) {
    const home = document.getElementById('page-home');
    if (home) home.classList.add('active');
    const nh = document.getElementById('nav-home');
    if (nh) nh.classList.add('active');
  }
});

/* ═══════════════════════════════════════════
   MODE TECHNIQUE — plusieurs niveaux de lecture
   Beaucoup de pages ont un contenu "joueur" (ce que ça veut dire pour jouer)
   et un contenu "développeur" (comment c'est calculé, les limites, les
   chiffres bruts). Plutôt que choisir un seul niveau ou tout mettre en même
   temps, un réglage global — comme A11Y ci-dessous — bascule l'affichage
   des blocs marqués class="tech-detail" (masqués par défaut).
   Usage dans une page :
     <button class="tech-toggle-btn" onclick="toggleTechMode()">...</button>
     <div class="tech-detail" style="display:none">... contenu détaillé ...</div>
   applyTechMode() gère le texte du bouton et l'affichage ; à rappeler après
   tout rendu dynamique d'une page qui contient des blocs tech-detail.
═══════════════════════════════════════════ */
function isTechMode() {
  try { return localStorage.getItem('abalone_techmode') === '1'; } catch(e) { return false; }
}
function toggleTechMode() { setTechMode(!isTechMode()); }
function setTechMode(on) {
  try { localStorage.setItem('abalone_techmode', on ? '1' : '0'); } catch(e) {}
  applyTechMode();
}
function applyTechMode() {
  const on = isTechMode();
  document.querySelectorAll('.tech-detail').forEach(function(el){ el.style.display = on ? '' : 'none'; });
  document.querySelectorAll('.tech-toggle-btn').forEach(function(btn){
    btn.textContent = on ? '👁 Vue joueur' : '🔬 Voir le détail technique';
    btn.classList.toggle('active', on);
  });
}

/* ═══════════════════════════════════════════
   ACCESSIBILITÉ & NUANCES
═══════════════════════════════════════════ */

const A11Y = {
  colorMode:'none', contrast:100, brightness:100, saturation:100,
  fontSize:100, reduceMotion:false, focusMode:false, largeBoard:false,
};

function loadA11Y() {
  try {
    const saved = JSON.parse(localStorage.getItem('abalone_a11y') || '{}');
    Object.assign(A11Y, saved);
    applyAllA11Y();
    syncA11YControls();
  } catch(e) {}
}
function saveA11Y() { try { localStorage.setItem('abalone_a11y', JSON.stringify(A11Y)); } catch(e) {} }

const COLOR_MODE_INFO = {
  none:         { label:'Standard',      desc:'Affichage par defaut — billes noires et blanches.' },
  deuteranopia: { label:'Deuteranopie',  desc:'Billes bleu saphir et jaune or — sans rouge/vert.' },
  protanopia:   { label:'Protanopie',    desc:'Billes bleu cyan et orange — deficit rouge.' },
  tritanopia:   { label:'Tritanopie',    desc:'Billes rouge et cyan — deficit bleu.' },
  monochromacy: { label:'Monochromie',   desc:'Niveaux de gris haut contraste.' },
  shapes:       { label:'Formes',        desc:'Triangle et rond — distinguables sans couleur.' },
};

function setColorMode(mode, el) {
  A11Y.colorMode = mode;
  document.querySelectorAll('.access-mode-card').forEach(function(c){ c.classList.remove('active'); });
  if (el) el.classList.add('active');
  document.body.className = document.body.className.replace(/\bcm-\S+/g,'').trim();
  if (mode !== 'none' && mode !== 'shapes') document.body.classList.add('cm-'+mode);
  const bts = {
    none:         ['#5a5a5a','#0a0a0a','#ffffff','#b0b0b0'],
    deuteranopia: ['#4477cc','#1133aa','#ffcc44','#cc8800'],
    protanopia:   ['#0088cc','#004488','#ffaa00','#cc6600'],
    tritanopia:   ['#cc2244','#880022','#00ccaa','#008877'],
    monochromacy: ['#111111','#000000','#eeeeee','#aaaaaa'],
    shapes:       ['#444444','#111111','#eeeeee','#bbbbbb'],
  }[mode] || ['#5a5a5a','#0a0a0a','#ffffff','#b0b0b0'];
  boardTheme.blackGrad1=bts[0]; boardTheme.blackGrad2=bts[1];
  boardTheme.whiteGrad1=bts[2]; boardTheme.whiteGrad2=bts[3];
  window._a11yShapes = (mode==='shapes');
  if (typeof drawBoard==='function') drawBoard();
  if (typeof drawPuzzleBoardInteractive==='function') drawPuzzleBoardInteractive();
  const info = COLOR_MODE_INFO[mode] || COLOR_MODE_INFO.none;
  const lbl = document.getElementById('access-mode-label');
  const dsc = document.getElementById('access-mode-desc');
  if (lbl) lbl.textContent = info.label;
  if (dsc) dsc.textContent = info.desc;
  drawA11YPreview(mode);
  saveA11Y();
  showToast('Mode ' + info.label + ' active');
}

function applyAccessibility() {
  const c = parseInt(document.getElementById('contrast-range')?.value||100);
  const b = parseInt(document.getElementById('brightness-range')?.value||100);
  const s = parseInt(document.getElementById('saturation-range')?.value||100);
  A11Y.contrast=c; A11Y.brightness=b; A11Y.saturation=s;
  const cv=document.getElementById('contrast-val');   if(cv) cv.textContent=c+'%';
  const bv=document.getElementById('brightness-val'); if(bv) bv.textContent=b+'%';
  const sv=document.getElementById('saturation-val'); if(sv) sv.textContent=s+'%';
  applyAllA11Y(); saveA11Y();
}

function applyAllA11Y() {
  const filters = [];
  if (A11Y.contrast!==100)   filters.push('contrast('+A11Y.contrast/100+')');
  if (A11Y.brightness!==100) filters.push('brightness('+A11Y.brightness/100+')');
  if (A11Y.saturation!==100) filters.push('saturate('+A11Y.saturation/100+')');
  // Keep SVG filter from class, add CSS filters
  const svgF = document.body.style.filter.match(/url\([^)]+\)/)?.[0]||'';
  document.body.style.filter = [svgF, filters.join(' ')].filter(Boolean).join(' ')||'';
  document.documentElement.style.fontSize = (A11Y.fontSize/100*16)+'px';
  document.body.classList.toggle('reduce-motion', A11Y.reduceMotion);
  document.body.classList.toggle('focus-mode', A11Y.focusMode);
}

function setFontSize(pct, btn) {
  A11Y.fontSize=pct;
  document.querySelectorAll('.font-size-btn').forEach(function(b){b.classList.remove('active');});
  if(btn) btn.classList.add('active');
  applyAllA11Y(); saveA11Y();
  showToast('Aa Taille : '+pct+'%');
}

function toggleReduceMotion(val) {
  A11Y.reduceMotion=val;
  const t=document.getElementById('reduce-motion-track');
  if(t) t.style.background=val?'var(--gold)':'var(--border)';
  applyAllA11Y(); saveA11Y();
  showToast(val?'Animations reduites':'Animations reactives');
}

function toggleFocusMode(val) {
  A11Y.focusMode=val;
  const t=document.getElementById('focus-mode-track');
  if(t) t.style.background=val?'var(--gold)':'var(--border)';
  applyAllA11Y(); saveA11Y();
  showToast(val?'Mode focus active':'Mode focus desactive');
}

function toggleLargeBoard(val) {
  A11Y.largeBoard=val; window._largeBoard=val;
  if(typeof drawBoard==='function') drawBoard();
  saveA11Y();
  showToast(val?'Plateau agrandi':'Plateau taille normale');
}

function drawA11YPreview(mode) {
  const canvas=document.getElementById('access-preview-canvas');
  if(!canvas) return;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,120,120);
  const bg=ctx.createRadialGradient(60,60,0,60,60,56);
  bg.addColorStop(0,'#1e2b28'); bg.addColorStop(1,'#131b19');
  ctx.beginPath(); ctx.arc(60,60,56,0,Math.PI*2); ctx.fillStyle=bg; ctx.fill();
  const pal = {
    none:         {b:['#555','#0a0a0a'], w:['#fff','#bbb']},
    deuteranopia: {b:['#4477cc','#1133aa'], w:['#ffcc44','#cc8800']},
    protanopia:   {b:['#0088cc','#004488'], w:['#ffaa00','#cc6600']},
    tritanopia:   {b:['#cc2244','#880022'], w:['#00ccaa','#008877']},
    monochromacy: {b:['#111','#000'], w:['#eee','#aaa']},
    shapes:       {b:['#444','#111'], w:['#eee','#bbb']},
  }[mode] || {b:['#555','#0a0a0a'], w:['#fff','#bbb']};
  const isShapes = mode==='shapes';
  [[25,40,'b'],[50,40,'b'],[75,40,'b'],[25,80,'w'],[50,80,'w'],[75,80,'w']].forEach(function(m){
    const cx=m[0], cy=m[1], t=m[2];
    const cl = t==='b' ? pal.b : pal.w;
    const r=13;
    if(isShapes && t==='b') {
      ctx.beginPath(); ctx.moveTo(cx,cy-r); ctx.lineTo(cx+r,cy+r); ctx.lineTo(cx-r,cy+r);
      ctx.closePath(); ctx.fillStyle=cl[0]; ctx.fill();
    } else {
      ctx.beginPath(); ctx.arc(cx+1,cy+2,r,0,Math.PI*2); ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fill();
      const g=ctx.createRadialGradient(cx-4,cy-4,0.5,cx,cy,r);
      g.addColorStop(0,cl[0]); g.addColorStop(1,cl[1]);
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
      const h=ctx.createRadialGradient(cx-5,cy-5,0,cx-3,cy-3,r*0.6);
      h.addColorStop(0,'rgba(255,255,255,0.45)'); h.addColorStop(1,'rgba(255,255,255,0)');
      ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=h; ctx.fill();
    }
  });
  if(isShapes) {
    ctx.fillStyle='rgba(200,168,75,0.6)'; ctx.font='bold 8px sans-serif'; ctx.textAlign='center';
    ctx.fillText('N', 100,44); ctx.fillText('B', 100,84);
  }
}

function resetAccessibility() {
  Object.assign(A11Y,{colorMode:'none',contrast:100,brightness:100,saturation:100,fontSize:100,reduceMotion:false,focusMode:false,largeBoard:false});
  document.body.className = document.body.className.replace(/\bcm-\S+|\breduce-motion\b|\bfocus-mode\b/g,'').trim();
  document.body.style.filter='';
  document.documentElement.style.fontSize='16px';
  boardTheme.blackGrad1='#5a5a5a'; boardTheme.blackGrad2='#0a0a0a';
  boardTheme.whiteGrad1='#ffffff'; boardTheme.whiteGrad2='#b0b0b0';
  window._a11yShapes=false; window._largeBoard=false;
  if(typeof drawBoard==='function') drawBoard();
  syncA11YControls(); saveA11Y();
  showToast('Accessibilite reinitialisee');
}

function syncA11YControls() {
  ['contrast','brightness','saturation'].forEach(function(k){
    const r=document.getElementById(k+'-range'); if(r) r.value=A11Y[k];
    const v=document.getElementById(k+'-val');   if(v) v.textContent=A11Y[k]+'%';
  });
  document.querySelectorAll('.access-mode-card').forEach(function(c){c.classList.remove('active');});
  const ac=document.getElementById('amode-'+A11Y.colorMode); if(ac) ac.classList.add('active');
  const rm=document.getElementById('reduce-motion'); if(rm) rm.checked=A11Y.reduceMotion;
  const rmt=document.getElementById('reduce-motion-track'); if(rmt) rmt.style.background=A11Y.reduceMotion?'var(--gold)':'var(--border)';
  const fm=document.getElementById('focus-mode'); if(fm) fm.checked=A11Y.focusMode;
  const fmt=document.getElementById('focus-mode-track'); if(fmt) fmt.style.background=A11Y.focusMode?'var(--gold)':'var(--border)';
  drawA11YPreview(A11Y.colorMode);
}

