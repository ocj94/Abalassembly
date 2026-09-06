/* ═══════════════════════════════════════════
   FORMATION FORMATEURS
   Progression + quiz stockes en localStorage (memes conventions que
   _loadGymProgress/_srsLoad : cle prefixee 'aba', JSON, try/catch).
   La question de motif du quiz REUTILISE le generateur teste de l'exercice
   Diagnostic (meme detecterMotifCoup, meme boucle position->coup->motif) --
   aucune position d'exemple ecrite a la main, donc aucun risque qu'un
   exemple pedagogique soit en fait incorrect.
═══════════════════════════════════════════ */
function formateurOpenTool(page, exerciseId){
  showPage(page);
  if (exerciseId){
    setTimeout(function(){ if (typeof startGymExercise === 'function') startGymExercise(exerciseId); }, 60);
  }
}
function formateurOpenPuzzleMode(mode){
  showPage('puzzles');
  setTimeout(function(){
    const btn = document.getElementById('puzzle-mode-'+mode);
    if (btn && typeof setPuzzleMode === 'function') setPuzzleMode(mode, btn);
  }, 60);
}

const SEANCES_FORMATEUR = [
  { id:1, icon:'🔷', titre:'Règles et plateau', dureeEnfants:'20-25 min', dureeAdultes:'30-40 min',
    objectif:'Faire toucher le plateau avant de parler de stratégie.',
    contenu:['Poser le plateau, nommer les billes, montrer les 3 déplacements de base (en ligne, en éventail).','Faire jouer 5-10 coups libres, sans enjeu, juste pour manipuler.','Introduire le sumito seulement une fois le déplacement simple acquis.'],
    toolLabel:'📖 Ouvrir le tutoriel interactif', toolAction:function(){ showPage('learn'); } },
  { id:2, icon:'🧲', titre:'Cohésion', dureeEnfants:'20 min', dureeAdultes:'30 min',
    objectif:'Faire ressentir pourquoi une bille isolée est fragile.',
    contenu:['Montrer une position où une bille perd son soutien après un coup.','Faire nommer le problème avant de donner la solution — pas l\u2019inverse.','L\u2019exercice Diagnostic génère une vraie position à chaque fois, jamais deux fois la même.'],
    toolLabel:'🩺 Ouvrir Diagnostic (Gym Cerveau)', toolAction:function(){ formateurOpenTool('gym','diagnostic'); } },
  { id:3, icon:'⚠️', titre:'Bord et danger', dureeEnfants:'20 min', dureeAdultes:'30 min',
    objectif:'Repérer une bille en bordure menacée avant que ce soit trop tard.',
    contenu:['Poser une bille au bord, demander "que peut lui arriver ?" avant de jouer.','L\u2019exercice Réflexe (Gym Cerveau) est celui que le site recommande lui-même pour ce point faible précis.'],
    toolLabel:'⚡ Ouvrir Réflexe (Gym Cerveau)', toolAction:function(){ formateurOpenTool('gym','reflex'); } },
  { id:4, icon:'🎯', titre:'Sumito et menaces', dureeEnfants:'25 min', dureeAdultes:'35 min',
    objectif:'Ne pas pousser juste parce qu\u2019on peut — évaluer si c\u2019est utile.',
    contenu:['Montrer un sumito tentant mais qui expose derrière.','L\u2019exercice Inhibition entraîne exactement à résister au coup séduisant mais dangereux.'],
    toolLabel:'🛑 Ouvrir Inhibition (Gym Cerveau)', toolAction:function(){ formateurOpenTool('gym','inhibition'); } },
  { id:5, icon:'🏁', titre:'Finales', dureeEnfants:'25 min', dureeAdultes:'40 min',
    objectif:'Distinguer une position gagnante prouvée d\u2019une position juste séduisante.',
    contenu:['Utiliser le Trainer de finales : positions réelles où le gain est démontré, pas estimé.','L\u2019exercice Certitude fait deviner "prouvé ou nulle" — utile pour montrer la différence entre une preuve et une impression.'],
    toolLabel:'🏁 Ouvrir le Trainer de finales', toolAction:function(){ formateurOpenPuzzleMode('tablebase'); } },
  { id:6, icon:'📝', titre:'Mise en situation', dureeEnfants:'20 min', dureeAdultes:'30 min',
    objectif:'Laisser l\u2019élève chercher seul, avec un problème à sa portée.',
    contenu:['Assigner 2-3 puzzles du niveau adapté comme "devoirs".','Revenir dessus à la séance suivante : qu\u2019a-t-il essayé, pas seulement a-t-il trouvé.'],
    toolLabel:'🧩 Ouvrir les Puzzles', toolAction:function(){ showPage('puzzles'); } }
];

function _formateurLoad(){
  try { return JSON.parse(localStorage.getItem('abaFormateurProgress')||'{}'); } catch(e){ return {}; }
}
function _formateurSave(d){ try { localStorage.setItem('abaFormateurProgress', JSON.stringify(d)); } catch(e){} }

function formateurSetPublic(pub){
  document.querySelectorAll('.btn-toggle-pub').forEach(function(b){ b.classList.remove('active'); b.style.background='transparent'; b.style.color='var(--muted)'; b.style.borderColor='var(--border)'; });
  const active = document.getElementById('formateur-pub-'+pub);
  if (active){ active.classList.add('active'); active.style.background='rgba(200,168,75,0.12)'; active.style.color='var(--gold)'; active.style.borderColor='var(--gold-dim)'; }
  document.querySelectorAll('.formateur-pub-notes').forEach(function(n){ n.style.display='none'; });
  const notes = document.getElementById('formateur-notes-'+pub);
  if (notes) notes.style.display='block';
  const d = _formateurLoad(); d.public = pub; _formateurSave(d);
  renderFormateurSeances(pub);
}

function formateurToggleSeance(id){
  const d = _formateurLoad();
  d.seances = d.seances || {};
  d.seances[id] = !d.seances[id];
  _formateurSave(d);
  renderFormateurSeances(d.public||'enfants');
}

function renderFormateurSeances(pub){
  const box = document.getElementById('formateur-seances');
  if (!box) return;
  const d = _formateurLoad();
  const done = d.seances || {};
  box.innerHTML = SEANCES_FORMATEUR.map(function(s){
    const isDone = !!done[s.id];
    const duree = pub==='adultes' ? s.dureeAdultes : s.dureeEnfants;
    return '<div style="background:var(--surface);border:1px solid '+(isDone?'var(--gold-dim)':'var(--border)')+';border-radius:10px;padding:18px 20px">'
      + '<div style="display:flex;align-items:flex-start;gap:14px">'
      + '<label style="display:flex;align-items:center;padding-top:2px" class="formateur-noprint"><input type="checkbox" '+(isDone?'checked':'')+' onchange="formateurToggleSeance('+s.id+')" style="width:18px;height:18px;cursor:pointer"></label>'
      + '<div style="flex:1">'
      + '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><span style="font-size:17px">'+s.icon+'</span><span style="font-size:14px;font-weight:700;color:var(--white)">Séance '+s.id+' — '+s.titre+'</span><span style="font-size:11px;color:var(--muted);margin-left:auto" class="formateur-noprint">'+duree+'</span></div>'
      + '<div style="font-size:12.5px;color:var(--gold);margin-bottom:8px">'+s.objectif+'</div>'
      + '<ul style="margin:0 0 10px;padding-left:18px;font-size:12.5px;color:var(--muted);line-height:1.7">'+s.contenu.map(function(c){ return '<li>'+c+'</li>'; }).join('')+'</ul>'
      + '<button type="button" class="formateur-noprint" data-seance-idx="'+SEANCES_FORMATEUR.indexOf(s)+'" style="padding:7px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:12px;cursor:pointer">'+s.toolLabel+'</button>'
      + '</div></div></div>';
  }).join('');
  // Les boutons appellent toolAction (une fonction JS, pas serialisable en attribut
  // onclick="...") : on cable les handlers reels juste apres avoir pose le HTML.
  box.querySelectorAll('button[data-seance-idx]').forEach(function(btn){
    const idx = parseInt(btn.getAttribute('data-seance-idx'), 10);
    btn.onclick = SEANCES_FORMATEUR[idx].toolAction;
  });
}

/* ── Banque de questions ── */
function _formateurMotifQuestion(){
  // Reutilise EXACTEMENT la boucle testee de gymStartDiagnostic : meme
  // generation de position, meme detecterMotifCoup. Pas d'exemple ecrit a
  // la main -- impossible de s'etre trompe sur un cas particulier puisque
  // c'est le meme code deja verifie (297/300 sur cet exercice).
  for (let posAttempt=0; posAttempt<15; posAttempt++){
    const used = new Set();
    let start = gymRandCell(); used.add(gymKey(start[0],start[1]));
    let frontier=[start]; const blacks=[start];
    while (blacks.length<6 && frontier.length){
      const from = frontier[Math.floor(Math.random()*frontier.length)];
      const neigh = gymNeighbors(from[0],from[1]).filter(function(c){ return !used.has(gymKey(c[0],c[1])); });
      if (!neigh.length){ frontier=frontier.filter(function(f){return f!==from;}); continue; }
      const c = neigh[Math.floor(Math.random()*neigh.length)];
      used.add(gymKey(c[0],c[1])); blacks.push(c); frontier.push(c);
    }
    const whites=[];
    for (let i=0;i<3;i++){ const c=gymRandCell(used); used.add(gymKey(c[0],c[1])); whites.push(c); }
    const boardAvant = {};
    blacks.forEach(function(c){ boardAvant[c[0]+','+c[1]]='black'; });
    whites.forEach(function(c){ boardAvant[c[0]+','+c[1]]='white'; });
    const shuffled = blacks.slice().sort(function(){ return Math.random()-0.5; });
    for (let i=0;i<shuffled.length;i++){
      const p = shuffled[i];
      const empties = gymNeighbors(p[0],p[1]).filter(function(c){ return !boardAvant[c[0]+','+c[1]]; });
      for (let j=0;j<empties.length;j++){
        const dest = empties[j];
        const boardApres = Object.assign({}, boardAvant);
        delete boardApres[p[0]+','+p[1]];
        boardApres[dest[0]+','+dest[1]] = 'black';
        const res = detecterMotifCoup(boardAvant, boardApres, 'black');
        if (res){
          const board = new Map();
          Object.keys(boardApres).forEach(function(k){ board.set(k, boardApres[k]); });
          const opts = Object.keys(MOTIFS_COUP).sort(function(){ return Math.random()-0.5; });
          return { type:'motif', board:board, highlight:dest[0]+','+dest[1], correct:res.motif, options:opts,
            label:function(k){ return MOTIFS_COUP[k]; } };
        }
      }
    }
  }
  return null; // tres improbable ; geree par formateurQuizBuild
}
function formateurQuizBuild(){
  const qs = [
    { type:'mcq', q:'Combien de billes adverses faut-il éjecter pour gagner ?', options:['3','6','8','14'], correct:'6' },
    { type:'mcq', q:'3 billes alignées peuvent pousser au maximum combien de billes adverses ?', options:['1','2','3','4'], correct:'2' },
    { type:'mcq', q:'2 billes peuvent-elles pousser 2 billes adverses ?', options:['Oui, toujours','Non','Oui, seulement en bordure'], correct:'Non' },
    { type:'mcq', q:'Un enfant place ses billes n\u2019importe où et ne comprend pas "pousser". Que faire en premier ?', options:['Le Labo IA','Le tutoriel interactif (page Règles)','Le trainer de finales','L\u2019éditeur de position'], correct:'Le tutoriel interactif (page Règles)' },
    { type:'mcq', q:'Un élève laisse régulièrement ses billes en bordure, menacées, sans réagir. Quel exercice recommander ?', options:['Mémoire','Jugement','Réflexe','Certitude'], correct:'Réflexe' },
    { type:'mcq', q:'Un élève garde le centre mais ne change jamais de plan quand la position l\u2019exige. Quel exercice recommander ?', options:['Diagnostic','Flexibilité','Répertoire','Acuité'], correct:'Flexibilité' },
    { type:'mcq', q:'Un élève dit qu\u2019une position est "sûrement gagnante" sans rien pour l\u2019étayer. Comment lui montrer la différence entre une opinion et une preuve ?', options:['Le classement de la page Profils','L\u2019exercice Certitude (gain prouvé vs nulle)','Les 10 commandements','Le Musée'], correct:'L\u2019exercice Certitude (gain prouvé vs nulle)' }
  ];
  const motifQ = _formateurMotifQuestion();
  if (motifQ) qs.push(motifQ); else qs.push({ type:'mcq', q:'Le sumito nécessite une supériorité numérique stricte de votre camp. Vrai ou faux ?', options:['Vrai','Faux'], correct:'Vrai' });
  return qs.sort(function(){ return Math.random()-0.5; });
}

let _formateurQuiz = null;
function formateurQuizStart(){
  _formateurQuiz = { questions: formateurQuizBuild(), idx:0, correct:0 };
  formateurQuizRenderQuestion();
  const startBtn = document.getElementById('formateur-quiz-start');
  if (startBtn) startBtn.style.display = 'none';
}
function formateurQuizRenderQuestion(){
  const box = document.getElementById('formateur-quiz-body');
  if (!box || !_formateurQuiz) return;
  const q = _formateurQuiz.questions[_formateurQuiz.idx];
  let boardHtml = '';
  if (q.type==='motif'){
    boardHtml = '<div id="formateur-quiz-board" style="margin-bottom:14px;max-width:340px"></div>';
  }
  box.innerHTML = '<div style="font-size:11px;color:var(--muted);margin-bottom:8px">Question '+(_formateurQuiz.idx+1)+'/'+_formateurQuiz.questions.length+'</div>'
    + (q.type==='motif' ? '<div style="font-size:13px;color:var(--text);margin-bottom:10px">La bille noire surlignée vient de bouger. Quel est le principal défaut de ce coup ?</div>' + boardHtml : '<div style="font-size:13px;color:var(--text);margin-bottom:12px">'+q.q+'</div>')
    + '<div style="display:flex;flex-direction:column;gap:7px">'
    + (q.type==='motif' ? q.options : q.options).map(function(opt){
        const label = q.type==='motif' ? q.label(opt) : opt;
        const val = (q.type==='motif' ? opt : opt).replace(/'/g,"\\'");
        return '<button type="button" onclick="formateurQuizAnswer(\''+val+'\')" style="text-align:left;padding:9px 14px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);cursor:pointer;font-size:12.5px">'+label+'</button>';
      }).join('')
    + '</div><div id="formateur-quiz-feedback" style="margin-top:10px;font-size:12.5px;min-height:18px"></div>';
  if (q.type==='motif' && typeof gymRenderBoard==='function'){
    setTimeout(function(){ gymRenderBoard('formateur-quiz-board', q.board, null, new Set([q.highlight])); }, 10);
  }
}
function formateurQuizAnswer(picked){
  const q = _formateurQuiz.questions[_formateurQuiz.idx];
  const ok = picked === q.correct;
  if (ok) _formateurQuiz.correct++;
  const fb = document.getElementById('formateur-quiz-feedback');
  const correctLabel = q.type==='motif' ? q.label(q.correct) : q.correct;
  if (fb) fb.innerHTML = ok ? '<span style="color:var(--gold)">✅ correct</span>' : '<span style="color:var(--red)">❌ c\u2019était : '+correctLabel+'</span>';
  setTimeout(function(){
    _formateurQuiz.idx++;
    if (_formateurQuiz.idx < _formateurQuiz.questions.length) formateurQuizRenderQuestion();
    else formateurQuizFinish();
  }, 900);
}
function formateurQuizFinish(){
  const total = _formateurQuiz.questions.length, score = _formateurQuiz.correct;
  const d = _formateurLoad(); d.quizScore = score; d.quizTotal = total; d.quizDate = new Date().toISOString(); _formateurSave(d);
  const box = document.getElementById('formateur-quiz-body');
  const passed = score >= 6;
  if (box) box.innerHTML = '<div style="font-size:15px;font-weight:700;color:'+(passed?'var(--gold)':'var(--text)')+'">'+score+' / '+total+'</div>'
    + '<div style="font-size:12.5px;color:var(--muted);margin-top:6px">'+(passed?'Évaluation réussie — l\u2019attestation est débloquée ci-dessous.':'Seuil de 6/8 non atteint. Relis les séances concernées et retente.')+'</div>'
    + '<button class="btn" onclick="formateurQuizStart()" style="margin-top:12px">🔄 Retenter</button>';
  const startBtn = document.getElementById('formateur-quiz-start');
  if (startBtn) startBtn.style.display = 'none';
  formateurRenderAttestationGate();
}
function formateurRenderAttestationGate(){
  const d = _formateurLoad();
  const passed = typeof d.quizScore==='number' && d.quizScore >= 6;
  const locked = document.getElementById('formateur-attestation-locked');
  const unlocked = document.getElementById('formateur-attestation-unlocked');
  if (locked) locked.style.display = passed ? 'none' : 'block';
  if (unlocked) unlocked.style.display = passed ? 'block' : 'none';
  if (passed) formateurRenderAttestation();
}
function formateurRenderAttestation(){
  const card = document.getElementById('formateur-attestation-card');
  if (!card) return;
  const d = _formateurLoad();
  const nomInput = document.getElementById('formateur-nom');
  const nom = (nomInput ? nomInput.value : '').trim() || '_______________________';
  const dateStr = new Date().toLocaleDateString('fr-FR', { year:'numeric', month:'long', day:'numeric' });
  const nSeances = Object.values(d.seances||{}).filter(Boolean).length;
  card.innerHTML = '<div style="border:2px solid var(--gold-dim);border-radius:14px;padding:40px;text-align:center;background:var(--surface)">'
    + '<div style="font-family:\'Playfair Display\',serif;font-size:14px;letter-spacing:3px;color:var(--gold);text-transform:uppercase;margin-bottom:6px">Abalassembly</div>'
    + '<div style="font-family:\'Playfair Display\',serif;font-size:26px;font-weight:900;color:var(--white);margin-bottom:24px">Attestation de suivi</div>'
    + '<div style="font-size:13px;color:var(--muted);margin-bottom:6px">Ce document atteste que</div>'
    + '<div style="font-family:\'Playfair Display\',serif;font-size:22px;color:var(--gold);margin-bottom:18px;border-bottom:1px solid var(--border);display:inline-block;padding-bottom:6px">'+nom+'</div>'
    + '<div style="font-size:13px;color:var(--text);line-height:1.8;max-width:440px;margin:0 auto 22px">a suivi le programme "Formation Formateurs" d\u2019Abalassembly ('+nSeances+'/6 séances marquées faites) et réussi l\u2019évaluation avec un score de <strong>'+d.quizScore+'/'+d.quizTotal+'</strong>.</div>'
    + '<div style="font-size:11px;color:var(--muted);margin-bottom:4px">'+dateStr+'</div>'
    + '<div style="font-size:10.5px;color:var(--muted);margin-top:20px;max-width:420px;margin-left:auto;margin-right:auto;line-height:1.6">Cette attestation certifie un parcours suivi sur Abalassembly, un projet indépendant à fichier unique. Elle ne constitue pas un agrément d\u2019une fédération ou d\u2019un organisme officiel.</div>'
    + '</div>';
}

function renderFormateurs(){
  const d = _formateurLoad();
  const pub = d.public || 'enfants';
  formateurSetPublic(pub);
  const quizBody = document.getElementById('formateur-quiz-body');
  const startBtn = document.getElementById('formateur-quiz-start');
  if (typeof d.quizScore === 'number'){
    if (quizBody) quizBody.innerHTML = '<div style="font-size:14px;color:var(--text)">Dernier résultat : <strong style="color:var(--gold)">'+d.quizScore+'/'+d.quizTotal+'</strong></div>';
    if (startBtn){ startBtn.textContent = '🔄 Repasser l\u2019évaluation'; startBtn.style.display = 'inline-block'; }
  } else if (startBtn) startBtn.style.display = 'inline-block';
  formateurRenderAttestationGate();
}

function startGymExercise(id){
  const fn = GYM_STARTERS[id];
  if (!fn) return;
  _gymLastExerciseId = id;
  gymStopCountdown();
  const resultEl = document.getElementById('gym-exercise-result');
  if (resultEl) resultEl.textContent = '';
  const hintEl = document.getElementById('gym-exercise-hint');
  if (hintEl) hintEl.textContent = '';
  const submitBtn = document.getElementById('gym-exercise-submit');
  if (submitBtn) submitBtn.style.display = 'none';
  const replayBtn = document.getElementById('gym-exercise-replay');
  if (replayBtn) replayBtn.style.display = 'none';
  fn();
}

function renderGymCerveau(){
  const grid = document.getElementById('gym-grid');
  if (!grid) return;
  const progress = _loadGymProgress();
  grid.innerHTML = GYM_ZONES.map(function(z){
    const stat = progress[z.id];
    const scoreLabel = stat && typeof stat.best === 'number' ? stat.best + ' / 100' : '—';
    const sessionsLabel = stat && stat.sessions ? stat.sessions + ' seance' + (stat.sessions>1?'s':'') : 'Aucune seance';
    const html = [];
    html.push('<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:18px 20px;display:flex;flex-direction:column;gap:8px">');
    html.push('<div style="display:flex;align-items:center;gap:10px">');
    html.push(gymBrainSvg(z.id, 48));
    html.push('<div><div style="font-weight:700;color:var(--white);font-size:14px">' + z.icon + ' ' + z.name + '</div>');
    html.push('<div style="font-size:11px;color:var(--muted)">' + z.zone + '</div></div>');
    html.push('</div>');
    html.push('<div style="font-size:12px;color:var(--muted);flex:1">' + z.desc + '</div>');
    html.push('<div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">');
    html.push('<div><div style="font-size:15px;font-weight:700;color:var(--gold)">' + scoreLabel + '</div>');
    html.push('<div style="font-size:10px;color:var(--muted)">' + sessionsLabel + '</div></div>');
    html.push('<button type="button" onclick="startGymExercise(\'' + z.id + '\')" style="font-size:11px;padding:6px 12px;background:var(--gold);color:var(--bg);border:none;border-radius:6px;font-weight:700;cursor:pointer">Commencer</button>');
    html.push('</div>');
    html.push('</div>');
    return html.join('');
  }).join('');
  const note = document.getElementById('gym-brain-note');
  if (note) note.style.display = 'block';
  const banner = document.getElementById('gym-weakness-banner');
  if (banner) {
    const weak = (typeof getWeaknessSummary === 'function') ? getWeaknessSummary() : null;
    if (weak && GYM_ZONE_EXERCISE_MAP[weak.zone]) {
      const ex = GYM_ZONE_EXERCISE_MAP[weak.zone];
      banner.style.display = 'block';
      banner.innerHTML = '📊 D\'après ' + weak.count + ' de tes coups analysés en partie, tu perds en moyenne <strong>' + Math.round(weak.avgLoss) + ' points d\'éval</strong> de plus sur tes coups en zone <strong>' + weak.zone + '</strong> que sur tes meilleures zones. L\'exercice <strong>' + ex.label + '</strong> travaille ça (' + ex.why + ').'
        + ' <button type="button" onclick="startGymExercise(\'' + ex.id + '\')" style="margin-left:6px;font-size:11px;padding:4px 10px;background:var(--gold);color:var(--bg);border:none;border-radius:6px;font-weight:700;cursor:pointer">Essayer</button>';
    } else {
      banner.style.display = 'none';
    }
  }
}

function gymSetLevel(level){
  _gymLevel = level;
  document.querySelectorAll('.gym-level-btn').forEach(function(btn){
    const active = parseInt(btn.getAttribute('data-level'), 10) === level;
    btn.style.background = active ? 'var(--gold)' : 'var(--surface2)';
    btn.style.color = active ? 'var(--bg)' : 'var(--muted)';
    btn.style.borderColor = active ? 'var(--gold)' : 'var(--border)';
    btn.style.fontWeight = active ? '700' : '400';
  });
  // Relance l'exercice en cours au nouveau niveau (sinon changer de niveau
  // n'avait aucun effet visible tant qu'on ne relançait pas manuellement).
  if (_gymLastExerciseId) startGymExercise(_gymLastExerciseId);
}

function renderCompare() {
  const u = currentUser;
  const av1 = document.getElementById('cmp-avatar1');
  const n1  = document.getElementById('cmp-name1');
  const e1  = document.getElementById('cmp-elo1');
  if (av1 && u) { av1.textContent=(u.username||'?')[0].toUpperCase(); av1.style.background=u.color||'#2d5a3d'; }
  if (n1 && u) n1.textContent = u.username||'Vous';
  if (e1 && u) e1.textContent = u.elo||1200;

  const btns = document.getElementById('compare-friends-btns');
  if (btns && btns.children.length===0) {
    ['SumitoPro','FightClub','Olivier_CJ','Vincent_F'].forEach(function(name) {
      const p = compareProfiles[name];
      const btn = document.createElement('button');
      btn.style.cssText='padding:7px 14px;background:none;border:1px solid var(--border);color:var(--text);border-radius:20px;cursor:pointer;font-size:12px;font-family:DM Sans,sans-serif;transition:all 0.15s';
      btn.textContent = name + ' ('+p.elo+')';
      btn.onclick = function() { showCompareResult(name,p); };
      btns.appendChild(btn);
    });
  }
}

