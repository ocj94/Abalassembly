/* ═══════════════════════════════════════════
   VARIANTS — 20 variantes officielles (galerie jouable du site : inclut les
   modes a plusieurs joueurs et les variantes de regles qui ne font pas
   partie du corpus historique — different des 13/18/19 lies aux parties
   AbalOnline/MIGS, voir docs/Architecture.md)
   Sources: 3-2-one.com · Notice Asmodee · ABA-PRO
═══════════════════════════════════════════ */
const variantsData = [
  { id:'standard', name:'Standard', emoji:'⚫', players:'2', duration:'20 min', diff:'Débutant', src:'Règle officielle',
    desc:'La configuration classique. 14 billes par camp sur 3 rangées. Les noirs commencent. Objectif : éjecter 6 billes adverses.',
    origin:'Asmodee 1987 — Michel Lalet & Laurent Levi' },
  { id:'belgian-daisy', name:'Belgian Daisy', emoji:'🌼', players:'2', duration:'20 min', diff:'Expert', src:'MSO officiel',
    desc:'Configuration officielle du Mind Sports Olympiad. Deux marguerites de 7 billes. Apprend à gérer deux groupes séparés et à les connecter.',
    origin:'Fédération Belge d\'Abalone' },
  { id:'german-daisy', name:'German Daisy', emoji:'🌸', players:'2', duration:'20 min', diff:'Expert', src:'3-2-one.com',
    desc:'Deux groupes rapprochés vers le centre. Plus défensive que la Belgian. Connexion plus rapide mais moins de liberté initiale.',
    origin:'3-2-one.com' },
  { id:'dutch-daisy', name:'Dutch Daisy', emoji:'🌷', players:'2', duration:'25 min', diff:'Expert', src:'ABA-PRO v4.7',
    desc:'Belgian Daisy avec une bille adverse bloquante au centre de chaque fleur. Force une ouverture agressive pour débloquer la configuration dès le départ.',
    origin:'ABA-PRO.HLP — Gert Schnider' },
  { id:'swiss-daisy', name:'Swiss Daisy', emoji:'🏔', players:'2', duration:'25 min', diff:'Expert', src:'ABA-PRO v4.7',
    desc:'German Daisy avec une bille adverse bloquante au centre. Tensions tactiques immédiates sur un plateau plus serré.',
    origin:'ABA-PRO.HLP — Gert Schnider' },
  { id:'face2face', name:'Face 2 Face', emoji:'⚔️', players:'2', duration:'20 min', diff:'Moyen', src:'3-2-one.com',
    desc:'Les deux camps se font face directement sur l\'axe central. Confrontation immédiate. Apprend les trois axes du plateau.',
    origin:'3-2-one.com' },
  { id:'alien-attack', name:'Alien Attack', emoji:'👾', players:'2', duration:'20 min', diff:'Moyen', src:'3-2-one.com',
    desc:'Position très ouverte. Chaque camp peut rapidement lancer une attaque ou empêcher l\'adversaire de regrouper ses forces.',
    origin:'3-2-one.com' },
  { id:'fujiyama', name:'Fujiyama', emoji:'🗻', players:'2', duration:'25 min', diff:'Expert', src:'3-2-one.com',
    desc:'Créer un maximum de dégâts avec un minimum de billes. Défendre son groupe contre une attaque organisée.',
    origin:'3-2-one.com' },
  { id:'the-wall', name:'The Wall', emoji:'🧱', players:'2', duration:'20 min', diff:'Facile', src:'3-2-one.com',
    desc:'Position ouverte — regrouper ses forces le plus vite possible. Idéal pour apprendre la cohésion de groupe.',
    origin:'3-2-one.com' },
  { id:'the-pillar', name:'The Pillar', emoji:'🏛️', players:'2', duration:'20 min', diff:'Facile', src:'3-2-one.com',
    desc:'Une bille neutre inamovible au centre. Souvent utilisée pour expliquer les mouvements aux débutants.',
    origin:'3-2-one.com' },
  { id:'abafoot', name:'Abafoot / Save Princess', emoji:'👸', players:'2', duration:'20 min', diff:'Moyen', src:'3-2-one.com',
    desc:'Éjecter la bille centrale adverse en premier pour gagner. La bille centrale est traitée comme une bille adverse.',
    origin:'3-2-one.com — 2 couleurs + 1 centrale' },
  { id:'bagdad-thief', name:'Bagdad Thief', emoji:'🗝️', players:'2', duration:'25 min', diff:'Expert', src:'3-2-one.com',
    desc:'Chaque joueur a un trésor qu\'il ne peut pas déplacer. Le trésor bouge sous l\'influence des poussées. Éjecter le trésor adverse pour gagner.',
    origin:'3-2-one.com — 4 couleurs' },
  { id:'berlin-thief', name:'The Berlin Thief', emoji:'🔍', players:'2', duration:'25 min', diff:'Expert', src:'3-2-one.com',
    desc:'Éjecter la bille-trésor adverse placée derrière son groupe. Affaiblir l\'adversaire en éjectant ses billes régulières d\'abord.',
    origin:'3-2-one.com — 4 couleurs' },
  { id:'snakes', name:'Snakes', emoji:'🐍', players:'2', duration:'20 min', diff:'Moyen', src:'ML / Laurent Bodini',
    desc:'Position en serpentin. S\'entraîner à regrouper ses forces rapidement et basculer vers la confrontation.',
    origin:'Auteur : ML — variante : Laurent Bodini' },
  { id:'blitz', name:'Concours-Blitz', emoji:'⚡', players:'2', duration:'10 min', diff:'Moyen', src:'Notice Asmodee',
    desc:'Éjecter 4 billes au lieu de 6 pour gagner. Parties plus courtes et intenses. Format de tournois rapides officiels.',
    origin:'Notice officielle Asmodee' },
  { id:'misere', name:'Misère', emoji:'💀', players:'2', duration:'20 min', diff:'Expert', src:'Variante académique',
    desc:'Règle inversée : éjecter 6 billes fait perdre. Un joueur gagne s\'il est complètement bloqué. Stratégie totalement renversée.',
    origin:'Règles académiques' },
  { id:'3-players', name:'3 Joueurs', emoji:'🔺', players:'3', duration:'30 min', diff:'Expert', src:'3-2-one.com',
    desc:'11 billes par joueur, 3 couleurs. 3 billes de même couleur peuvent pousser 2 billes de couleurs différentes. Éjecter 6 billes de n\'importe quelle couleur.',
    origin:'3-2-one.com — Fédération Belge' },
  { id:'4-players', name:'4 Joueurs (2 équipes)', emoji:'♟️', players:'4', duration:'40 min', diff:'Expert', src:'3-2-one.com',
    desc:'9 billes par joueur en losange (4-3-2). Joueurs face à face = même équipe. Inclure les billes de son coéquipier dans ses coups.',
    origin:'3-2-one.com — équipes 2v2' },
  { id:'5-players', name:'5 Joueurs', emoji:'⭐', players:'5', duration:'45 min', diff:'Expert', src:'3-2-one.com',
    desc:'Stratégie allégée mais diplomatie, alliances et trahisons. Le joueur central est handicapé d\'une bille pour équilibrer.',
    origin:'3-2-one.com' },
  { id:'6-players', name:'6 Joueurs (3 équipes)', emoji:'🌟', players:'6', duration:'60 min', diff:'Expert', src:'3-2-one.com',
    desc:'3 équipes de 2. Les membres d\'une équipe sont face à face. Chaque erreur est punie par 5 adversaires !',
    origin:'3-2-one.com / spkane.org' },
  { id:'alitration', name:'Alitration', emoji:'🌀', players:'2', duration:'25 min', diff:'Moyen', src:'onlineabalone.wordpress.com',
    desc:'Variante expérimentale créée par un joueur nommé Joey lors de la conception de MiGs. Le nom est un mot-valise : Al(ien) + (infil)tration -- un mélange des deux positions. Symétrie de rotation à 180°, jouable dès maintenant, position vérifiée en rejouant intégralement une vraie partie MiGs (122 demi-coups) jusqu\'à sa conclusion.',
    origin:'MiGs -- créée par Joey' },
];

/* ── Bibliothèque de documents ────────────────────────────────────────
   Bibliographie des ouvrages, articles et documents communautaires sur
   l'Abalone. Volontairement une BIBLIOGRAPHIE (références + liens) et non
   des fichiers embarqués : intégrer les PDF en base64 ferait passer le
   fichier unique de ~2,5 Mo à plus de 12 Mo, imposé à chaque visiteur même
   sans ouvrir un seul document. Idée d'Olivier, source : son Drive.
   NOTE : les descriptions ne sont renseignées que pour les documents dont
   le contenu est établi ; les autres portent une mention neutre plutôt
   qu'un résumé inventé. */
const BIBLIO_DOCS = [
  { t:"Abalone — Rules and Strategems (v2.1)", a:"Bruno Curfs", y:"", cat:"strategy", lang:"EN", kind:"Guide", size:"3,5 Mo",
    d:"Guide de référence de la communauté sur les règles et les schémas stratégiques du jeu.", url:"" },
  { t:"Algorithmic Fun — Abalone", a:"O. Aichholzer, F. Aurenhammer, T. Werner", y:"2002", cat:"ai", lang:"EN", kind:"Article", size:"202 Ko",
    d:"Étude théorique du jeu : complexité, structures et propriétés algorithmiques.", url:"" },
  { t:"Constructing an Abalone game-playing agent", a:"N. Lemmens", y:"", cat:"ai", lang:"EN", kind:"Mémoire", size:"1,7 Mo",
    d:"Mémoire universitaire consacré à la construction d'une IA joueuse d'Abalone.", url:"" },
  { t:"Abalone — Final Report", a:"", y:"", cat:"ai", lang:"EN", kind:"Rapport", size:"564 Ko",
    d:"Rapport de projet universitaire sur Abalone.", url:"" },
  { t:"Report on Abalone", a:"", y:"", cat:"ai", lang:"EN", kind:"Rapport", size:"124 Ko",
    d:"Rapport de projet universitaire sur Abalone.", url:"" },
  { t:"ABLA (id136)", a:"", y:"", cat:"ai", lang:"EN", kind:"Article", size:"194 Ko",
    d:"Article de recherche sur Abalone.", url:"" },
  { t:"Comment coder les coups", a:"Laurent Pagli", y:"", cat:"notation", lang:"FR", kind:"Document", size:"15 Ko",
    d:"Document communautaire francophone sur la notation et le codage des coups.", url:"" },
  { t:"Codes des variantes de MiGs", a:"", y:"", cat:"notation", lang:"FR", kind:"Document", size:"10 Ko",
    d:"Codes des positions de départ des variantes MiGs.", url:"" },
  { t:"Les algorithmes utilisés", a:"", y:"", cat:"ai", lang:"FR", kind:"Document", size:"28 Ko",
    d:"Document communautaire francophone sur les algorithmes appliqués à Abalone.", url:"" }
];

let _biblioFilter = 'all';
function filterBiblio(cat, btn) {
  _biblioFilter = cat || 'all';
  try {
    const wrap = btn && btn.parentNode;
    if (wrap) Array.prototype.forEach.call(wrap.querySelectorAll('.filter-btn'), function(b){ b.classList.remove('active'); });
    if (btn) btn.classList.add('active');
  } catch(e){}
  renderBiblio();
}

function renderBiblio() {
  const grid = document.getElementById('biblio-grid');
  if (!grid) return;
  const list = BIBLIO_DOCS.filter(function(d){ return _biblioFilter === 'all' || d.cat === _biblioFilter; });
  if (!list.length) { grid.innerHTML = '<div style="padding:20px;color:var(--muted)">Aucun document dans cette catégorie.</div>'; return; }
  grid.innerHTML = list.map(function(d){
    const meta = [d.kind, d.lang, d.size].filter(Boolean).join(' · ');
    const author = d.a ? (d.a + (d.y ? ' — ' + d.y : '')) : (d.y || 'Auteur non renseigné');
    const link = d.url
      ? '<a href="' + d.url + '" target="_blank" rel="noopener noreferrer" style="color:var(--gold);text-decoration:none;font-size:12px;font-weight:700">Consulter →</a>'
      : '<span style="color:var(--muted);font-size:12px">Référence bibliographique</span>';
    return '<div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px">'
      + '<div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--muted)">' + escapeHtml(meta) + '</div>'
      + '<div style="font-size:15px;font-weight:700;color:var(--white);line-height:1.3">' + escapeHtml(d.t) + '</div>'
      + '<div style="font-size:12px;color:var(--gold-dim)">' + escapeHtml(author) + '</div>'
      + '<div style="font-size:13px;color:var(--muted);line-height:1.5;flex:1">' + escapeHtml(d.d) + '</div>'
      + '<div>' + link + '</div>'
      + '</div>';
  }).join('');
}

function renderVariants() {
  const grid = document.getElementById('variants-grid');
  if (!grid || grid.children.length > 0) return;
  grid.innerHTML = variantsData.map(function(v) {
    const dc = v.diff==='Débutant'?'#4a9463':v.diff==='Facile'?'var(--accent-green-light)':v.diff==='Moyen'?'var(--gold)':'#e05c4b';
    return '<div class="variant-card" data-players="'+v.players+'" style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:20px;cursor:pointer;transition:all 0.2s" onclick="showVariantDetail(\''+v.id+'\')" onmouseover="this.style.borderColor=\'var(--gold-dim)\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.borderColor=\'var(--border)\';this.style.transform=\'none\'">'
      +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
      +'<div style="font-size:28px">'+v.emoji+'</div>'
      +'<div style="font-size:11px;padding:2px 8px;border-radius:12px;background:rgba(0,0,0,0.3);color:'+dc+';border:1px solid '+dc+'44">'+v.diff+'</div>'
      +'</div>'
      +'<div style="font-size:15px;font-weight:700;color:var(--white);margin-bottom:4px">'+v.name+'</div>'
      +'<div style="font-size:12px;color:var(--muted);margin-bottom:10px;line-height:1.5">'+v.desc.slice(0,80)+'...</div>'
      +'<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--muted)">'
      +'<span>👥 '+v.players+' joueur'+(parseInt(v.players)>1?'s':'')+'</span>'
      +'<span>⏱ '+v.duration+'</span>'
      +'</div></div>';
  }).join('');
}

function showVariantDetail(id) {
  const v = variantsData.find(function(x){return x.id===id;});
  if (!v) return;
  const detail = document.getElementById('variant-detail');
  const dc = document.getElementById('variant-detail-content');
  if (!detail||!dc) return;
  dc.innerHTML = '<div style="display:flex;align-items:center;gap:14px;margin-bottom:16px">'
    +'<div style="font-size:36px">'+v.emoji+'</div>'
    +'<div><div style="font-size:20px;font-weight:900;color:var(--white);font-family:\'Playfair Display\',serif">'+v.name+'</div>'
    +'<div style="font-size:12px;color:var(--muted);margin-top:3px">'+v.players+' joueur'+(parseInt(v.players)>1?'s':'')+' · '+v.duration+' · '+v.diff+'</div></div>'
    +'<button onclick="document.getElementById(\'variant-detail\').style.display=\'none\'" style="margin-left:auto;background:none;border:none;color:var(--muted);cursor:pointer;font-size:20px">×</button>'
    +'</div>'
    +'<p style="font-size:14px;color:var(--text);line-height:1.7;margin-bottom:12px">'+v.desc+'</p>'
    +'<div style="font-size:12px;color:var(--muted);padding:10px 14px;background:var(--surface2);border-radius:7px">📚 Source : '+v.src+' — '+v.origin+'</div>';
  detail.style.display='block';
  detail.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function filterVariants(players, evt) {
  document.querySelectorAll('.variant-card').forEach(function(c){
    c.style.display=(players==='all'||c.dataset.players===players)?'block':'none';
  });
  document.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('active');});
  // utilise l'événement passé en paramètre, sinon retombe sur l'event global (compat)
  const e = evt || (typeof window !== 'undefined' ? window.event : null);
  if (e && e.target) e.target.classList.add('active');
}

/* ═══════════════════════════════════════════
   PUZZLE STORM
═══════════════════════════════════════════ */
let stormActive = false;
let stormTimeout = null;
let stormScore = 0;
let stormErrors = 0;
let stormSeconds = 180;

/* ═══════════════════════════════════════════
   PUZZLES DATA & RENDER
═══════════════════════════════════════════ */
const puzzlesData = [
  { title:'Première éjection', diff:'easy', label:'🟢 Difficulté Facile', source:'Initiation',
    statement:'<strong>PREMIÈRE ÉJECTION</strong><br><br>Les Noirs ont le trait. Une bille blanche est au bord droit, deux billes noires sont alignées derrière. Poussez-la hors du plateau !<br><br><em>(Sélectionnez vos 2 billes noires, puis cliquez vers la droite.)</em>',
    hint:'Sélectionnez les deux billes noires alignées, puis poussez vers la bille blanche au bord.',
    solution:'Sélectionnez les 2 billes noires (4,6 et 4,7), poussez vers la droite → la blanche est éjectée. ✅',
    black:[[4,6],[4,7]], white:[[4,8]], solved:false },
  { title:'Poussée à gauche', diff:'easy', label:'🟢 Difficulté Facile', source:'Initiation',
    statement:'<strong>POUSSÉE À GAUCHE</strong><br><br>Les Noirs ont le trait. Éjectez la bille blanche par le bord gauche avec une poussée 2 contre 1.<br><br><em>(Même principe, dans l\'autre sens.)</em>',
    hint:'Les deux billes noires poussent vers la gauche, où se trouve la bille blanche au bord.',
    solution:'Sélectionnez les 2 billes noires, poussez vers la gauche → éjection. ✅',
    black:[[4,2],[4,1]], white:[[4,0]], solved:false },
  { title:'Triple poussée', diff:'easy', label:'🟢 Difficulté Facile', source:'Initiation',
    statement:'<strong>TRIPLE POUSSÉE</strong><br><br>Les Noirs ont le trait. Trois billes noires alignées peuvent éjecter la bille blanche au bord. Trouvez la poussée.<br><br><em>(Sumito 3 contre 1.)</em>',
    hint:'Sélectionnez les trois billes noires alignées et poussez vers la bille blanche.',
    solution:'Sélectionnez les 3 billes noires (3,4 / 3,5 / 3,6), poussez vers la droite → éjection. ✅',
    black:[[3,4],[3,5],[3,6]], white:[[3,7]], solved:false },
  { title:'Sumito 3 contre 2', diff:'medium', label:'🟡 Difficulté Moyenne', source:'Intermédiaire',
    statement:'<strong>SUMITO 3 CONTRE 2</strong><br><br>Les Noirs ont le trait. Trois billes noires peuvent pousser deux billes blanches — et en éjecter une par le bord. Réalisez le sumito 3v2.<br><br><em>(Trois contre deux : autorisé !)</em>',
    hint:'Trois billes noires alignées contre deux blanches : la poussée est possible et éjecte la bille du bord.',
    solution:'Sélectionnez les 3 billes noires (4,4 / 4,5 / 4,6), poussez vers la droite → la blanche du bord sort. ✅',
    black:[[4,4],[4,5],[4,6]], white:[[4,7],[4,8]], solved:false },
  { title:'Poussée vers le haut', diff:'medium', label:'🟡 Difficulté Moyenne', source:'Intermédiaire',
    statement:'<strong>POUSSÉE VERS LE HAUT</strong><br><br>Les Noirs ont le trait. Cette fois la poussée se fait vers le haut du plateau. Éjectez la bille blanche du bord supérieur avec un sumito 3v2.<br><br><em>(La direction change, le principe reste.)</em>',
    hint:'Alignez votre regard vers le haut : trois billes noires poussent deux blanches vers le bord supérieur.',
    solution:'Sélectionnez les 3 billes noires (2,2 / 3,2 / 4,2), poussez vers le haut → éjection. ✅',
    black:[[2,2],[3,2],[4,2]], white:[[1,2],[0,2]], solved:false },
  { title:'Bord droit', diff:'easy', label:'🟢 Difficulté Facile', source:'Initiation',
    statement:'<strong>BORD DROIT</strong><br><br>Les Noirs ont le trait. Éjectez la bille blanche par le bord droit, en haut du plateau.<br><br><em>(Poussée 2 contre 1.)</em>',
    hint:'Deux billes noires alignées poussent la blanche vers le bord droit.',
    solution:'Sélectionnez les 2 billes noires, poussez vers la droite → éjection. ✅',
    black:[[1,3],[1,4]], white:[[1,5]], solved:false },
  { title:'Bord gauche bas', diff:'easy', label:'🟢 Difficulté Facile', source:'Initiation',
    statement:'<strong>BORD GAUCHE BAS</strong><br><br>Les Noirs ont le trait. Une poussée 2 contre 1 éjecte la bille blanche dans la partie basse du plateau.',
    hint:'Alignez deux billes noires et poussez la blanche au bord.',
    solution:'Sélectionnez les 2 billes noires, poussez → éjection. ✅',
    black:[[7,3],[7,4]], white:[[7,5]], solved:false },
  { title:'Triple vers le bas', diff:'easy', label:'🟢 Difficulté Facile', source:'Initiation',
    statement:'<strong>TRIPLE VERS LE BAS</strong><br><br>Les Noirs ont le trait. Trois billes alignées verticalement poussent la blanche hors du bord inférieur.<br><br><em>(Sumito 3 contre 1.)</em>',
    hint:'Trois billes noires en colonne poussent vers le bas.',
    solution:'Sélectionnez les 3 billes noires, poussez vers le bas → éjection. ✅',
    black:[[5,2],[6,2],[7,2]], white:[[8,2]], solved:false },
  { title:'Coin sud-est', diff:'easy', label:'🟢 Difficulté Facile', source:'Initiation',
    statement:'<strong>COIN SUD-EST</strong><br><br>Les Noirs ont le trait. Éjectez la bille blanche nichée dans le coin sud-est du plateau.',
    hint:'Deux billes noires suffisent pour éjecter la blanche du coin.',
    solution:'Sélectionnez les 2 billes noires, poussez vers le coin → éjection. ✅',
    black:[[6,4],[6,5]], white:[[6,6]], solved:false },
  { title:'Bord nord 2v1', diff:'easy', label:'🟢 Difficulté Facile', source:'Initiation',
    statement:'<strong>BORD NORD</strong><br><br>Les Noirs ont le trait. Éjectez la bille blanche par le sommet du plateau avec une poussée 2 contre 1.',
    hint:'Deux billes noires alignées vers le haut poussent la blanche au sommet.',
    solution:'Sélectionnez les 2 billes noires, poussez vers le haut → éjection. ✅',
    black:[[2,4],[1,4]], white:[[0,4]], solved:false },
  { title:'Coin extrême', diff:'easy', label:'🟢 Difficulté Facile', source:'Initiation',
    statement:'<strong>COIN EXTRÊME</strong><br><br>Les Noirs ont le trait. La bille blanche est tout en haut à gauche. Éjectez-la !',
    hint:'Deux billes noires poussent la blanche hors du coin supérieur.',
    solution:'Sélectionnez les 2 billes noires, poussez → éjection. ✅',
    black:[[2,1],[1,1]], white:[[0,1]], solved:false },
  { title:'Sumito 3v2 droite', diff:'medium', label:'🟡 Difficulté Moyenne', source:'Intermédiaire',
    statement:'<strong>SUMITO 3 CONTRE 2 — DROITE</strong><br><br>Les Noirs ont le trait. Trois billes noires poussent deux blanches et en éjectent une par le bord droit, en haut.',
    hint:'Trois contre deux : la poussée est autorisée et éjecte la bille du bord.',
    solution:'Sélectionnez les 3 billes noires, poussez vers la droite → éjection. ✅',
    black:[[2,2],[2,3],[2,4]], white:[[2,5],[2,6]], solved:false },
  { title:'Sumito 3v2 bas', diff:'medium', label:'🟡 Difficulté Moyenne', source:'Intermédiaire',
    statement:'<strong>SUMITO 3 CONTRE 2 — BAS</strong><br><br>Les Noirs ont le trait. Une colonne de trois billes noires pousse deux blanches vers le bas et en éjecte une.',
    hint:'Trois billes noires en colonne poussent les deux blanches vers le bord inférieur.',
    solution:'Sélectionnez les 3 billes noires, poussez vers le bas → éjection. ✅',
    black:[[4,5],[5,5],[6,5]], white:[[7,5],[8,5]], solved:false },
  { title:'Poussée diagonale', diff:'medium', label:'🟡 Difficulté Moyenne', source:'Intermédiaire',
    statement:'<strong>POUSSÉE DIAGONALE</strong><br><br>Les Noirs ont le trait. Cette fois la ligne de poussée est diagonale. Trois billes noires éjectent une blanche du bord.<br><br><em>(Pensez en diagonale !)</em>',
    hint:'Les billes noires sont alignées en diagonale — poussez le long de cet axe.',
    solution:'Sélectionnez les 3 billes noires en diagonale, poussez → éjection. ✅',
    black:[[2,5],[3,6],[4,7]], white:[[5,7],[6,6]], solved:false },
  { title:'Riposte à droite', diff:'medium', label:'🟡 Difficulté Moyenne', source:'Défense & Riposte', whiteFirst:true,
    statement:'<strong>RIPOSTE À DROITE</strong><br><br>⚪ Les Blancs viennent d\'avancer une bille jusqu\'au bord droit (en 3,7) pour menacer ta position.<br><br>⚫ À toi de jouer ! Punis cette avancée trop audacieuse : éjecte la bille blanche exposée.',
    hint:'La bille blanche avancée est isolée au bord. Tes deux billes noires alignées peuvent la pousser dehors.',
    solution:'Sélectionne tes 2 billes noires (3,5 et 3,6) et pousse vers la droite → la blanche tombe. ✅',
    black:[[3,5],[3,6]], white:[[3,7],[5,5]], solved:false },
  { title:'Riposte au sumito', diff:'medium', label:'🟡 Difficulté Moyenne', source:'Défense & Riposte', whiteFirst:true,
    statement:'<strong>RIPOSTE AU SUMITO</strong><br><br>⚪ Les Blancs ont engagé deux billes vers le bord supérieur, pensant te dominer.<br><br>⚫ Retourne la situation ! Avec trois billes, tu peux pousser les deux blanches et en éjecter une.',
    hint:'Trois contre deux : ta supériorité numérique te permet de pousser et d\'éjecter la bille du bord.',
    solution:'Sélectionne tes 3 billes noires (2,3 / 2,4 / 2,5) et pousse vers la droite → éjection. ✅',
    black:[[2,3],[2,4],[2,5]], white:[[2,6],[2,7]], solved:false },
  { title:'Riposte vers le bas', diff:'hard', label:'🔴 Difficulté Difficile', source:'Défense & Riposte', whiteFirst:true,
    statement:'<strong>RIPOSTE VERS LE BAS</strong><br><br>⚪ Une bille blanche s\'est aventurée tout en bas du plateau (en 8,2).<br><br>⚫ Saisis l\'occasion : aligne trois billes et éjecte-la par le bord inférieur.',
    hint:'Ta colonne de trois billes noires peut pousser la blanche hors du bord du bas.',
    solution:'Sélectionne tes 3 billes noires (5,2 / 6,2 / 7,2) et pousse vers le bas → éjection. ✅',
    black:[[5,2],[6,2],[7,2]], white:[[8,2],[3,3]], solved:false },
  { title:'Riposte au coin', diff:'hard', label:'🔴 Difficulté Difficile', source:'Défense & Riposte', whiteFirst:true,
    statement:'<strong>RIPOSTE AU COIN</strong><br><br>⚪ Les Blancs ont poussé une bille jusqu\'au coin supérieur (en 0,3) — une position très exposée.<br><br>⚫ Profites-en pour l\'éjecter d\'une poussée verticale.',
    hint:'La bille blanche au coin n\'a aucune échappatoire. Pousse-la vers le haut.',
    solution:'Sélectionne tes 2 billes noires (2,3 et 1,3) et pousse vers le haut → éjection. ✅',
    black:[[2,3],[1,3]], white:[[0,3],[5,5]], solved:false },
];

let currentPuzzleIdx = 0;
let puzzleStartCaptured = 0;  // captures au début du puzzle (pour détecter la résolution)

/* Persistance des puzzles résolus (Entraînement, puzzlesData) — clé stable :
   le titre de chaque puzzle (tous uniques). Sans ceci, l'état "solved" en
   mémoire se réinitialisait à chaque rechargement de page, rendant toute
   barre de progression fausse dès le premier F5. */
function _loadSolvedPuzzleTitles(){
  try { return JSON.parse(localStorage.getItem('abaSolvedPuzzleTitles') || '[]'); }
  catch(e){ return []; }
}
function _saveSolvedPuzzleTitle(title){
  const solved = _loadSolvedPuzzleTitles();
  if (solved.indexOf(title) === -1) {
    solved.push(title);
    try { localStorage.setItem('abaSolvedPuzzleTitles', JSON.stringify(solved)); } catch(e){}
  }
}
function updatePuzzleProgressBar(){
  const bar = document.getElementById('puzzle-progress-bar');
  const label = document.getElementById('puzzle-progress-label');
  if (!bar || !label) return;
  const total = puzzlesData.length;
  const done = puzzlesData.filter(function(p){ return p.solved; }).length;
  label.textContent = done + ' / ' + total + ' résolus';
  bar.style.width = (total ? (done / total * 100) : 0) + '%';
}

function renderPuzzles() {
  const list = document.getElementById('puzzle-list');
  if (!list) return;
  if (list.children.length > 0) return; // already rendered
  const solvedTitles = _loadSolvedPuzzleTitles();
  puzzlesData.forEach(function(p){ if (solvedTitles.indexOf(p.title) !== -1) p.solved = true; });
  list.innerHTML = puzzlesData.map(function(p, i) {
    return '<div class="puzzle-card' + (i===0?' active-puzzle':'') + '" onclick="loadPuzzle('+i+')" id="pcard-'+i+'" style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;transition:all 0.15s">' +
      '<div style="display:flex;align-items:center;gap:10px;padding:12px 14px">' +
      '<div style="width:28px;height:28px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:' + (p.diff==='easy'?'rgba(74,148,99,0.15)':p.diff==='hard'?'rgba(192,57,43,0.1)':'rgba(200,168,75,0.15)') + ';color:' + (p.diff==='easy'?'var(--accent-green-light)':p.diff==='hard'?'#e05c4b':'var(--gold)') + '">' + (p.diff==='easy'?'★':p.diff==='medium'?'★★':'★★★') + '</div>' +
      '<div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--white)">' + p.title + '</div><div style="font-size:11px;color:var(--muted)">' + p.source + '</div></div>' +
      '<div id="psolved-'+i+'" style="font-size:16px">' + (p.solved?'✅':'') + '</div>' +
      '</div></div>';
  }).join('');
  updatePuzzleProgressBar();
  // Load first puzzle
  loadPuzzle(0);
}

function loadPuzzle(idx) {
  currentPuzzleIdx = idx;
  puzzleMovesMade = 0;
  puzzleSelected = [];
  buildPuzzleBoard(idx);
  const p = puzzlesData[idx];
  if (!p) return;
  const dl = document.getElementById('puzzle-difficulty-label');
  const st = document.getElementById('puzzle-statement');
  const ov = document.getElementById('puzzle-result-overlay');
  const ht = document.getElementById('puzzle-hint');
  const sl = document.getElementById('puzzle-solution');
  if (dl) dl.textContent = p.label;
  if (st) st.innerHTML = p.statement;
  if (ov) ov.style.display = 'none';
  if (ht) { ht.style.display='none'; ht.innerHTML=''; }
  if (sl) sl.style.display = 'none';
  const msg = document.getElementById('puzzle-msg');
  if (msg) msg.textContent = '⚫ Sélectionnez une bille noire';
  // Update active card
  document.querySelectorAll('.puzzle-card').forEach(function(c,i){
    c.classList.toggle('active-puzzle', i===idx);
    c.style.borderColor = i===idx ? 'var(--gold)' : 'var(--border)';
  });
  drawPuzzleBoardInteractive();
  initPuzzleInteraction();
}

function togglePuzzleHint() {
  const h = document.getElementById('puzzle-hint');
  if (!h) return;
  if (h.style.display === 'block') { h.style.display='none'; return; }
  const pz = puzzlesData[currentPuzzleIdx];
  let hintText = pz ? pz.hint : 'Cherche une poussée gagnante.';
  // ajoute les coordonnées officielles des billes noires concernées
  if (pz) {
    const blackCoords = pz.black.map(function(p){ return coordToABAPRO(p[0], p[1]); }).join(', ');
    hintText += '<br><br><span style="color:var(--muted)">Tes billes noires : <strong style="color:var(--gold)">' + blackCoords + '</strong></span>';
  }
  h.innerHTML = '<strong style="color:var(--gold)">💡 Indice :</strong> ' + hintText;
  h.style.display = 'block';
}

function showPuzzleSolution() {
  const sl = document.getElementById('puzzle-solution');
  const st = document.getElementById('puzzle-solution-text');
  if (!sl || !st) return;
  const pz = puzzlesData[currentPuzzleIdx];
  // Génère la solution avec la notation officielle à partir des positions
  let solText = '';
  if (pz) {
    const blackCoords = pz.black.map(function(p){ return coordToABAPRO(p[0], p[1]); });
    const targetWhite = pz.white.map(function(p){ return coordToABAPRO(p[0], p[1]); });
    // détermine le coup gagnant via le moteur
    const tmpBoard = {};
    pz.black.forEach(function(p){ tmpBoard[p[0]+','+p[1]]='black'; });
    pz.white.forEach(function(p){ tmpBoard[p[0]+','+p[1]]='white'; });
    const sol = findEjectingMoveOn(tmpBoard);
    if (sol) {
      const selCoords = sol.cells.map(function(c){ return coordToABAPRO(c.r, c.c); }).join(' + ');
      const dirName = directionName(sol.dir);
      solText = '1. Sélectionne ' + selCoords + '\n2. Pousse vers ' + dirName + '\n→ La bille blanche (' + targetWhite[targetWhite.length-1] + ') est éjectée ✅';
    } else {
      solText = pz.solution || 'Cherche la poussée gagnante.';
    }
  }
  st.textContent = solText;
  sl.style.display = 'block';
  if (pz) {
    pz.solved = true;
    _saveSolvedPuzzleTitle(pz.title);
    updatePuzzleProgressBar();
    const si = document.getElementById('psolved-'+currentPuzzleIdx);
    if (si) si.textContent = '✅';
  }
  showToast('✅ Solution affichée — essayez de la rejouer sur le plateau !');
}

// Nom lisible d'une direction axiale (pour les solutions)
function directionName(dir) {
  if (dir.q===1 && dir.r===0) return 'la droite (Est)';
  if (dir.q===-1 && dir.r===0) return 'la gauche (Ouest)';
  if (dir.q===0 && dir.r===-1) return 'le haut-droite (Nord-Est)';
  if (dir.q===0 && dir.r===1) return 'le bas-gauche (Sud-Ouest)';
  if (dir.q===1 && dir.r===-1) return 'le haut (Nord)';
  if (dir.q===-1 && dir.r===1) return 'le bas (Sud)';
  return 'la direction indiquée';
}

function nextPuzzle() {
  const overlay = document.getElementById('puzzle-result-overlay');
  if (overlay) overlay.style.display = 'none';
  /* Avant la correction du plantage dans showPuzzleResult() (puzzlesData[-1]
     n'existe pas), cette superposition n'etait jamais atteinte pour un
     puzzle genere ou de tablebase : le clic sur "Puzzle suivant" n'avait
     donc jamais ete exerce pour ces modes. Sans ce branchement, il aurait
     saute dans le catalogue fixe (puzzlesData[0]) au lieu de tirer une
     nouvelle position du meme mode -- change de mode sans le dire. */
  if (currentPuzzleIdx === -1) { loadGeneratedPuzzle(); return; }
  if (currentPuzzleIdx === -2) { loadTablebasePuzzle(); return; }
  if (currentPuzzleIdx === -3) { loadTablebaseSequencePuzzle(); return; }
  currentPuzzleIdx = (currentPuzzleIdx + 1) % puzzlesData.length;
  loadPuzzle(currentPuzzleIdx);
}

function setPuzzleMode(mode, el) {
  document.querySelectorAll('.puzzle-mode-btn').forEach(b=>b.classList.remove('active'));
  el.classList.add('active');
  const stormUI = document.getElementById('storm-ui');
  if (stormUI) stormUI.style.display = mode==='storm' ? 'block' : 'none';
  if (mode==='daily') {
    openDailyPuzzleInline();
  }
  if (mode==='generated') {
    loadGeneratedPuzzle();
  }
  if (mode==='tablebase') {
    loadTablebasePuzzle();
  }
  if (mode==='tablebase-seq') {
    loadTablebaseSequencePuzzle();
  }
  if (mode==='storm' && !stormActive) {
    stormScore=0; stormErrors=0; stormSeconds=180;
    updateStormUI();
  }
}

function startPuzzleStorm() {
  if (stormActive) return;
  stormActive=true;
  stormScore=0; stormErrors=0; stormSeconds=180;
  document.getElementById('storm-btn').textContent='En cours…';
  document.getElementById('storm-btn').disabled=true;
  stormTick();
  showToast('⚡ Puzzle Storm démarré — 3 minutes !');
}

function stormTick() {
  if (!stormActive) return;
  stormSeconds--;
  updateStormUI();
  if (stormSeconds<=0) { endStorm(); return; }
  stormTimeout = setTimeout(stormTick, 1000);
}

function updateStormUI() {
  const m=Math.floor(stormSeconds/60), s=stormSeconds%60;
  const timeEl=document.getElementById('storm-timer');
  const barEl=document.getElementById('storm-bar');
  const scoreEl=document.getElementById('storm-score');
  const errEl=document.getElementById('storm-errors');
  if(timeEl) timeEl.textContent = m+':'+(s<10?'0':'')+s;
  if(timeEl) timeEl.style.color = stormSeconds<30 ? '#e05c4b' : 'var(--gold)';
  if(barEl) barEl.style.width = (stormSeconds/180*100)+'%';
  if(scoreEl) scoreEl.textContent = stormScore;
  if(errEl) errEl.textContent = stormErrors;
}

function endStorm() {
  stormActive=false;
  clearTimeout(stormTimeout);
  const btn=document.getElementById('storm-btn');
  if(btn) { btn.textContent='▶ Rejouer'; btn.disabled=false; }
  showToast('⚡ Storm terminé ! Score: '+stormScore+' puzzles résolus, '+stormErrors+' erreur(s)');
}

/* hook into puzzle solve to update storm score */
const _origVerify = typeof verify2FACode !== 'undefined' ? verify2FACode : null;
function stormPuzzleSolved() {
  if (stormActive) { stormScore++; updateStormUI(); }
}

/* ─── REPLAY SYSTEM ─── */
let boardSnapshots = [];
let undoStack = [];        // états avant chaque coup, pour l'annulation
let timerPaused = false;   // pause du timer en cours
let tournamentGame = false;     // partie en contexte tournoi ?
let tournamentActiveRules = null; // règles résolues pour la partie en cours
let replayMode = false;
let replayCurrentIdx = -1;
let variantMode = false;   // exploration interactive depuis une position du replay
let _variantStash = null;  // état réel sauvegardé pendant l'exploration (jamais touché tant qu'on explore)

/* Etat reel de la partie, mis de cote pendant une relecture lancee alors
   que la partie n'est PAS terminee. Sans lui, sortir du replay laissait le
   plateau a la position relue au lieu de la position reelle : le tour et le
   compteur de coups restaient corrects mais le plateau non, donc un etat
   incoherent (bug preexistant, trouve en testant avant d'ouvrir la
   relecture en pleine partie). Meme principe que _variantStash, deja en
   place pour l'exploration de variantes. */
let _liveStash = null;

function _stashLive(){
  if (_liveStash) return;   // deja mis de cote, ne pas ecraser
  _liveStash = {
    board: JSON.parse(JSON.stringify(board)),
    capB: capturedByBlack, capW: capturedByWhite,
    turn: CurrentTurn.get(), moveCount: moveCount
  };
}
function _restoreLive(){
  if (!_liveStash) return false;
  board = _liveStash.board;
  capturedByBlack = _liveStash.capB; capturedByWhite = _liveStash.capW;
  CurrentTurn.set(_liveStash.turn); moveCount = _liveStash.moveCount;
  _liveStash = null;
  return true;
}

function toggleReplay() {
  if (boardSnapshots.length < 2) { showToast('Jouez d\u2019abord quelques coups !'); return; }
  if (variantMode) exitVariant();   // ne jamais quitter le replay en laissant une variante en cours
  replayMode = !replayMode;
  /* Le replay doit s'ouvrir sur la position AVANT le coup 1, pas sur le
     plateau d'apres le coup 1. loadSnapshot(-1) sait deja restituer cette
     position de depart via _replayStartBoard, et replayStep() autorise deja
     l'index -1 : toggleReplay etait le seul a ne jamais s'en servir.
     Signale par Saab (« Pas sur la posStart, tjs mv1 joue »). */
  replayCurrentIdx = replayMode ? (_replayStartBoard ? -1 : 0) : -1;
  const btn = document.getElementById('replay-btn');
  if (btn) btn.textContent = replayMode ? '■ Quitter replay' : '▶ Rejouer';
  if (replayMode) {
    /* Partie non terminee : on met l'etat reel de cote AVANT de charger un
       instantane, pour pouvoir y revenir intact en sortant. */
    if (typeof gameOver !== 'undefined' && !gameOver) _stashLive();
    showToast('📽 Mode replay — utilisez Précédent/Suivant');
    loadSnapshot(replayCurrentIdx);
  } else {
    // Restaure la position REELLE si la partie etait en cours
    const restored = _restoreLive();
    drawBoard();
    if (typeof updateStatus === 'function') updateStatus();
    if (typeof _highlightMoveRow === 'function') _highlightMoveRow(boardSnapshots.length - 1);
    showToast(restored ? '▶ Retour à la partie en cours' : '▶ Retour à la partie');
  }
}

