<script>
/* ═══════════════════════════════════════════
   BLOC ANTICIPE : LANGUE ET VERSION ANGLAISE
   Petit bloc a part, place juste apres l'intro et AVANT le reste de la page : en anglais,
   l'observateur est deja branche quand le navigateur lit le menu et les pages, et il traduit
   chaque morceau avant qu'il soit affiche. Mesure : dans le script principal (7 Mo, long a
   analyser), le francais restait visible jusqu'a ~1,7 s sur un telephone moyen ; place juste
   avant ce script, encore ~0,7 s ; ici, plus du tout. Ses fonctions et constantes sont
   globales : le script principal s'en sert (currentLang, _tr, _i18nAppliquerTout...).
═══════════════════════════════════════════ */
function currentLang() {
  // ?lang=en (ou fr) dans l'adresse : retenu au premier appel, pour qu'un lien partage en anglais
  // ouvre le site en anglais ; un choix fait ensuite dans le menu l'emporte. Sans parametre ni choix :
  // francais (la langue d'origine du site) ; un bandeau propose l'anglais aux navigateurs etrangers.
  if (!currentLang._lu) {
    currentLang._lu = true;
    try {
      const m = /[?&]lang=(en|fr)(?:&|$)/i.exec((typeof location !== 'undefined' && location.search) || '');
      if (m) { currentLang._param = m[1].toUpperCase(); localStorage.setItem('abalone_lang', currentLang._param); }
    } catch (e) {}
  }
  try { const s = localStorage.getItem('abalone_lang'); if (s) return s; } catch(e) {}
  return currentLang._param || 'FR';
}

/* ═══════════════════════════════════════════
   VERSION ANGLAISE (v2.56)
   Le site est ecrit en francais. En anglais, chaque texte francais CONNU est
   remplace a l'affichage par sa traduction :
   - I18N_EN : texte francais exact (espaces normalises) -> anglais ;
   - I18N_EN_MOTIFS : textes qui contiennent des nombres ou des noms
     (« À votre tour — Coup 14 ») ;
   - un observateur traduit aussi ce que le site ecrit apres coup (statut de la
     partie, fenetres, ecran de fin, messages) ;
   - les textes longs faits de plusieurs morceaux (page Aide) ont une version
     anglaise complete dans des blocs .en-only ; les blocs .fr-only sont masques.
   Ce qui n'est pas encore traduit reste en francais ; repasser en francais remet
   les textes d'origine. Jamais traduits : scripts, styles, zones de saisie,
   options sans valeur (leur texte EST leur valeur) et tout ce qui porte
   translate="no". Un test verifie que chaque cle existe bien dans la page et que
   les libelles cites par l'aide anglaise sont ceux du dictionnaire.
═══════════════════════════════════════════ */
const I18N_EN = {
  // ── en-tete, menus ──
  'Aide': 'Help', 'Comment utiliser le site': 'How to use the site', 'Poser une question': 'Ask a question',
  'Inviter un ami': 'Invite a friend', 'Faire une suggestion': 'Make a suggestion', 'Signaler un bug': 'Report a bug',
  'Signaler un abus': 'Report abuse', 'Se connecter': 'Connect', 'Langue': 'Language', 'Changer de langue': 'Change language',
  '🎮 Jouer': '🎮 Play', 'Accueil': 'Home', 'Jouer': 'Play', 'Historique': 'History', 'Stats du corpus': 'Corpus stats', 'Statistiques du jeu': 'Game statistics', 'Importer': 'Import',
  'Problèmes': 'Puzzles', 'Éditeur': 'Editor', 'Variantes': 'Variants', '📖 Progresser': '📖 Improve', 'Règles du jeu': 'Game rules',
  'Ouvertures': 'Openings', 'Analyse': 'Analysis', 'Mes statistiques': 'My statistics',
  'Sur un vrai plateau': 'On a real board', 'Apprendre sur un vrai plateau': 'Learning on a real board', 'À partir de 3 ans · en famille, sans écran': 'From age 3 · as a family, screen-free',
  'Gym Cerveau': 'Brain Gym', 'Formation Formateurs': 'Trainer course', '🧪 Explorer': '🧪 Explore', 'Labo IA': 'AI Lab',
  "Comment c'est construit": 'How it’s built',   // page Architecture (v2.66) : le reste est ecrit par renderArchiPage, en francais ou en anglais
  'Bibliothèque de parties': 'Game library', 'Tables de finale': 'Endgame tables', 'Détection photo / plateau': 'Photo / board detection',
  'Insights GitHub': 'GitHub insights', 'Fiche pour IA': 'Sheet for AIs', 'Musée': 'Museum', 'Pionniers': 'Pioneers', 'Trombinoscope': 'Members',
  '🌐 En ligne (bientôt)': '🌐 Online (coming soon)', 'Classement': 'Leaderboard', 'Observer': 'Watch', 'Communauté': 'Community', 'Tournoi': 'Tournament',
  'Comparer': 'Compare', 'Amis': 'Friends', 'Profil': 'Profile', 'Paramètres': 'Settings', 'Mode Enfant': 'Kids mode',
  // ── accueil ──
  '100 % hors-ligne · aucun compte requis': '100 % offline · no account needed', 'Maîtrisez': 'Master', "l'art de": 'the art of',
  "l'Abalone !": 'Abalone!',
  "La plateforme de référence pour jouer, apprendre et progresser au jeu de stratégie Abalone. Jouez hors-ligne, contre l'IA ou à deux sur le même appareil — aucune connexion requise.":
    'Play, learn and improve at Abalone, the strategy game. Play offline against the AI, or with a friend on the same device — no connection needed.',
  'Gratuit pour toujours. Sans pub, sans compte obligatoire, sans mesure d’audience. Code ouvert (GPL).': 'Free forever. No ads, no account needed, no analytics. Open source (GPL).',
  '🎮 Jouer maintenant': '🎮 Play now', '📖 Apprendre les règles': '📖 Learn the rules',
  'Abalassembly en chiffres — tous vérifiables': 'Abalassembly in numbers — all verifiable', 'Vraies parties rejouables': 'Real replayable games',
  'Puzzles tirés de vraies parties': 'Puzzles from real games', 'Hors ligne': 'Offline', "Compte, pub ou mesure d'audience": 'Accounts, ads or analytics',
  'Stratégie': 'Strategy', 'Chance': 'Luck', 'Complexité': 'Complexity', 'Durée': 'Length', '2 joueurs': '2 players', 'Auteurs': 'Authors',
  'Fonctionnalités': 'Features', 'Depuis 1987': 'Since 1987', 'OFFICIEL': 'OFFICIAL', 'Tout pour progresser': 'Everything to improve', "et s'amuser": 'and have fun',
  "Une plateforme complète, conçue pour les débutants comme les grands maîtres de l'Abalone.": 'A complete platform, for beginners and Abalone masters alike.',
  'Matchmaking intelligent': 'Smart matchmaking', 'Bientôt': 'Soon',
  "Un algorithme ELO trouvera l'adversaire idéal à votre niveau pour des parties équilibrées. Disponible avec le jeu en ligne.":
    'An ELO algorithm will find the right opponent for your level. Available with online play.',
  'Cours interactifs': 'Interactive lessons', 'Des tutoriels pas à pas, des puzzles tactiques et des analyses de parties pour progresser efficacement.':
    'Step-by-step tutorials, tactical puzzles and game analysis to improve efficiently.',
  'Tournoi mensuel': 'Monthly tournament',
  'Un parcours en 3 tours contre des IA de force croissante, chaque mois. Solo, entièrement local — disponible dès maintenant, aucun compte requis.':
    'Three rounds against stronger and stronger AIs, every month. Solo and fully local — available now, no account needed.',
  'Analyse de parties': 'Game analysis', 'Revivez chaque coup après la partie. Identifiez vos erreurs et découvrez les meilleurs enchaînements possibles.':
    'Replay every move after the game. Spot your mistakes and discover the best continuations.',
  'Communauté mondiale': 'Worldwide community',
  'Multi-plateforme': 'Cross-platform', 'Jouez depuis votre navigateur, sur ordinateur, téléphone ou tablette. Le jeu fonctionne même hors ligne.':
    'Play in your browser, on computer, phone or tablet. The game even works offline.',
  'Jeu': 'Game', 'Apprendre': 'Learn', 'Explorer': 'Explore', 'Ressources': 'Resources', 'Règle officielle': 'Official rules',
  'Variantes du jeu': 'Game variants', 'Mentions légales': 'Legal notice', 'Politique de confidentialité': 'Privacy policy',
  'Fiche du jeu — Source:': 'Game sheet — Source:', '🎲 Jouer sur BGA': '🎲 Play on BGA',
  'Le classement mondial nécessite un serveur (pas encore déployé). En attendant, rejoins la vraie communauté Abalone sur Discord — parties, discussions, événements. ↗':
    'A world ranking needs a server (not deployed yet). Meanwhile, join the real Abalone community on Discord — games, discussions, events. ↗',
  'Jouer, apprendre et progresser au jeu de stratégie Abalone — hors-ligne, gratuit, sans compte.': 'Play, learn and improve at Abalone — offline, free, no account.',
  'Événements live': 'Live events', 'Source de référence communautaire :': 'Community reference source:',
  "— Le blog de référence sur l'Abalone (règles, variantes, Academy, événements)": '— the reference blog about Abalone (rules, variants, Academy, events)',
  '— projet de fan, non affilié à Abalone S.A.': '— a fan project, not affiliated with Abalone S.A.',
  // ── bandeau d'engagement, defis ──
  'Série': 'Streak', 'jour': 'day', 'jours': 'days', 'Niveau': 'Level', 'Défi du jour': 'Daily puzzle', 'Mes stats': 'My stats',
  '🔥 Défi du jour': '🔥 Daily puzzle', '🎁 Défi de la semaine': '🎁 Weekly challenge', '⚡ Défi du jour — partie': '⚡ Daily challenge — game',
  'Victoires': 'Wins', 'Défaites': 'Losses', 'Nuls': 'Draws', 'Taux': 'Rate', 'Récompense obtenue': 'Reward claimed',
  'Contrôle du centre': 'Center control',
  'Vainqueur de la semaine': 'Winner of the week', 'Joueur assidu': 'Regular player', 'Tacticien': 'Tactician', 'Régularité': 'Consistency',
  'Gagne 5 parties': 'Win 5 games', 'Joue 10 parties': 'Play 10 games', 'Résous 7 problèmes': 'Solve 7 puzzles', 'Atteins une série de 5 jours': 'Reach a 5-day streak',
  'Victoire du jour': 'Win of the day', 'Chasseur du jour': 'Hunter of the day', 'Assidu du jour': 'Player of the day',
  "Gagne 1 partie aujourd'hui": 'Win 1 game today', "Éjecte 3 billes aujourd'hui": 'Eject 3 marbles today', "Joue 2 parties aujourd'hui": 'Play 2 games today',
  // ── onglets Liste et Commentaires de la partie (v2.58) ──
  '📋 Liste': '📋 List', '📝 Commentaires': '📝 Comments', 'Liste des coups': 'Move list', 'Commentaires': 'Comments', '📋 Copier': '📋 Copy',
  'Copie le tableau (à coller dans un tableur ou un message)': 'Copies the table (to paste into a spreadsheet or a message)',
  'Copie tous les commentaires en texte': 'Copies all the comments as text',
  'Notation Aba-Pro. (2-1) : le score après une éjection, Noirs-Blancs. Touchez un coup pour revoir la position.':
    'Aba-Pro notation. (2-1): the score after an ejection, Black-White. Tap a move to see the position again.',
  'Position de départ': 'Starting position', 'Coup précédent': 'Previous move', 'Coup suivant': 'Next move', 'Dernier coup': 'Last move',
  '↩ Partie en cours': '↩ Current game', 'Que mesurent ces chiffres ?': 'What do these numbers measure?',
  '🎮 Une partie en cours a été trouvée. La reprendre ?': '🎮 A game in progress was found. Resume it?', 'Reprendre': 'Resume',
  'Distance au centre': 'Distance to centre', ": somme des distances des billes à la case centrale e5 (plus c'est bas, plus le camp tient le centre).":
    ': sum of the distances of the marbles to the central cell e5 (the lower, the more central the side).',
  'Cohésion': 'Cohesion', ': paires de billes voisines du même camp.': ': pairs of neighbouring marbles of the same side.', 'Au bord': 'On the edge',
  ': billes sur le cercle extérieur.': ': marbles on the outer ring.', 'En danger': 'In danger',
  ": billes que l'adversaire peut éjecter dès son prochain coup. Pour les coups de l'IA : sa suite prévue (le coup attendu en réponse, puis les suivants), son évaluation de la position, la profondeur atteinte, les positions examinées et le temps.":
    ': marbles the opponent can eject with its next move. For the AI’s moves: its expected continuation (the expected reply, then the next moves), its evaluation of the position, the depth reached, the positions examined and the time.',
  // ── profil local et fenetres de connexion (v2.57) ──
  'Votre profil': 'Your profile', 'Créer un profil': 'Create a profile', 'Créer mon profil →': 'Create my profile →',
  'Parties': 'Games', 'ELO actuel': 'Current ELO', 'Joueur': 'Player', 'JOUEUR': 'PLAYER', 'Deco': 'Sign out', 'Jouer maintenant': 'Play now', 'Historique récent': 'Recent games',
  'Maître': 'Master', 'Grand Maître': 'Grandmaster',
  'Créez un profil (ou connectez-vous) pour voir vos statistiques, votre série et vos dernières parties. Tout reste dans ce navigateur, sur cet appareil.':
    'Create a profile (or sign in) to see your statistics, your streak and your latest games. Everything stays in this browser, on this device.',
  'Problèmes résolus': 'Puzzles solved', 'Jouez une partie ou résolvez un problème pour démarrer une série.': 'Play a game or solve a puzzle to start a streak.',
  "Tout l'historique →": 'Full history →', 'Progression ELO (30 jours)': 'ELO progress (30 days)', 'Déconnexion': 'Sign out', '⚙ Paramètres': '⚙ Settings',
  'Bon retour !': 'Welcome back!', 'Retrouvez votre profil local.': 'Open your local profile.',
  'Pas de serveur : votre profil, vos parties et votre progression restent': 'No server: your profile, your games and your progress stay',
  'dans ce navigateur, sur cet appareil': 'in this browser, on this device',
  ". Rien n'est envoyé, aucun e-mail ne vous sera écrit. N'y mettez pas un mot de passe qui vous sert ailleurs. Pour changer d'appareil : Paramètres → Exporter mes données.": '. Nothing is sent, and no e-mail will ever be written to you. Do not use a password you use elsewhere. To change devices: Settings → Export my data.',
  "Nom d'utilisateur ou e-mail": 'Username or e-mail', 'Mot de passe': 'Password', 'Mot de passe oublié ?': 'Forgot your password?',
  'Continuer →': 'Continue →', 'Pas encore de profil ?': 'No profile yet?', "C'est fait !": 'Done!', 'Bienvenue,': 'Welcome,',
  'Profil enregistré dans ce navigateur': 'Profile saved in this browser', 'Accéder à mon profil →': 'Go to my profile →',
  "Un nom, un mot de passe, et c'est parti. Le profil est facultatif : on peut jouer sans.": 'A name, a password, and off you go. A profile is optional: you can play without one.',
  '3 à 24 caractères · affiché sur cet appareil': '3 to 24 characters · shown on this device', 'Adresse e-mail (facultatif)': 'E-mail address (optional)',
  'Sert seulement à vous reconnecter ici.': 'Only used to sign in again here.', 'Au moins 8 caractères': 'At least 8 characters', 'vous@exemple.com': 'you@example.com',
  "J'accepte les": 'I accept the', 'mentions légales': 'legal notice', 'et la': 'and the', 'politique de confidentialité': 'privacy policy',
  'Déjà un profil dans ce navigateur ?': 'Already have a profile in this browser?', 'Mot de passe oublié': 'Forgotten password',
  'Sans serveur, aucun e-mail ne peut vous être envoyé. Mais votre progression (parties, XP, problèmes) ne dépend pas du mot de passe : elle reste sur cet appareil. Vous pouvez effacer le profil et le recréer aussitôt.':
    'Without a server, no e-mail can be sent to you. But your progress (games, XP, puzzles) does not depend on the password: it stays on this device. You can delete the profile and create it again right away.',
  "Nom d'utilisateur ou e-mail du profil": 'Username or e-mail of the profile', 'Effacer ce profil et le recréer': 'Delete this profile and create it again',
  '← Retour à la connexion': '← Back to sign in', 'Afficher le mot de passe': 'Show the password',
  'Une image carrée du résultat et du plateau final': 'A square image of the result and the final board',
  // ── configuration de partie ──
  'Nouvelle partie': 'New game', 'Configurer avant de jouer': 'Set up your game', 'Configuration': 'Setup', 'Disposition de départ': 'Starting layout',
  'Configuration officielle : 14 billes par camp sur 3 rangées': 'Official layout: 14 marbles per side on 3 rows',
  'Plateau réduit du Mode Enfant : 7 billes par camp, pour débuter -- choisi explicitement ici, toujours exclu du tirage aléatoire':
    'The Kids mode board: 7 marbles per side, for beginners — only when chosen here, never drawn at random',
  'Motif distinct de Snakes variant -- aucune partie sous ce nom exact dans le corpus, confirme par une source tierce independante':
    'Distinct from Snakes variant — no game under this exact name in the corpus, confirmed by an independent source',
  'Tire une vraie disposition au hasard parmi celles disponibles': 'Picks a real layout at random among those available',
  'Aux noirs de jouer le premier coup. « Adversaire » vous fait jouer les blancs. « Aléatoire » tire votre camp au sort au lancement.':
    'Black moves first. “Opponent” gives you White. “Random” draws your side when the game starts.',
  'Connexion directe entre deux navigateurs, sans compte ni serveur de jeu (experimental)': 'Direct connection between two browsers, no account and no game server (experimental)',
  'Standard': 'Standard', 'Découverte (7 billes, débutants)': 'Discovery (7 marbles, beginners)', '🎲 Aléatoire': '🎲 Random',
  'Adversaire': 'Opponent', "🤖 Contre l'IA": '🤖 Against the AI', '👥 Deux joueurs': '👥 Two players', '📱 Même appareil': '📱 Same device', '📡 En direct 🧪': '📡 Live 🧪',
  'Connexion directe entre deux navigateurs, sans compte ni serveur de jeu — juste un serveur public pour aider les deux appareils à se trouver. Un seul échange de code au début, puis les coups circulent tout seuls.':
    'A direct connection between two browsers, with no account and no game server — just a public server that helps the two devices find each other. One code exchange at the start, then moves flow by themselves.',
  '⚪ Non connecté': '⚪ Not connected', 'Créer une partie': 'Create a game', 'Rejoindre': 'Join', 'Utiliser « Partie par code » à la place': 'Use “Game by code” instead',
  'Qui commence ?': 'Who starts?', 'Moi': 'Me',
  "Style de l'IA": 'AI style', 'Auto': 'Auto', 'Agressif': 'Aggressive', 'Défensif': 'Defensive', 'Division': 'Divide', 'Équilibré': 'Balanced',
  'KAAH (expérimental)': 'KAAH (experimental)', 'Humain (Labo)': 'Human-like (Lab)', 'Contre moi (Labo)': 'Against me (Lab)',
  'Les priorités des vrais joueurs, réglées au Labo (Comme les humains)': 'The priorities of real players, tuned in the AI Lab (Like humans)',
  'Le style qui bat le mieux ton clone, choisi au Labo (Contre toi)': 'The style that beats your clone best, chosen in the AI Lab (Against you)',
  'Réflexion max (s)': 'Max thinking time (s)', 'sans limite': 'no limit', 'Moteur': 'Engine', '(expérimental)': '(experimental)',
  "vide = l'IA réfléchit jusqu'à trouver": 'empty = the AI thinks until it finds a move',
  "Les critères d'évaluation de KAAH (sumito, menace, fourchette, piège, compacité…) ajoutés au moteur — expérimental, en cours de test au Labo":
    'KAAH’s evaluation criteria (sumito, threat, fork, trap, compactness…) added to the engine — experimental, being tested in the AI Lab',
  "Sur 15 parties de test équitables, le moteur actuel gagne 8, le NNUE gagne 2, 5 nulles — proposé par transparence sur ce qu'on a essayé, pas comme une amélioration.":
    'Over 15 fair test games the current engine won 8 and the NNUE 2, with 5 draws — offered to show what was tried, not as an improvement.',
  'Moteur actuel': 'Current engine', 'NNUE — évaluation': 'NNUE — evaluation', 'NNUE — ordonnancement': 'NNUE — move ordering', 'NNUE — combiné': 'NNUE — combined',
  '2 victoires / 8 défaites / 5 nulles sur 15 parties de test': '2 wins / 8 losses / 5 draws over 15 test games',
  "+2,7% de nœuds explorés à résultat égal — pas d'amélioration mesurée": '+2.7% nodes searched for the same result — no measured improvement',
  'Résultat quasi identique au mode évaluation seule': 'Almost the same result as evaluation alone', 'Compte le temps de chaque joueur, sans limite': 'Counts each player’s time, with no limit', 'Cadence': 'Time control', 'Libre': 'Untimed', 'Chrono': 'Clock', 'Personnaliser…': 'Customize…',
  'Bonus par coup': 'Increment per move', 'Délai par coup': 'Delay per move', 'Temps initial': 'Initial time', 'Bonus par éjection': 'Bonus per ejection', 'Aides': 'Aids',
  'Indiquer les coups possibles': 'Show possible moves', 'Coordonnées des cases': 'Board coordinates', 'Commencer la partie': 'Start the game',
  'Met en évidence les billes jouables.': 'Highlights the marbles you can move.', 'Affiche les repères a1…i9. Aussi dans Paramètres.': 'Shows the a1…i9 labels. Also in Settings.',
  // ── partie ──
  'Billes capturées': 'Captured marbles', 'Vous': 'You', 'Joueur 1': 'Player 1', 'Joueur 2': 'Player 2',
  'Aide visuelle': 'Visual aid', 'Voulez-vous que le plateau': 'Should the board', 'indique les cases': 'show the cells',
  'où vos billes sélectionnées peuvent se déplacer ?': 'your selected marbles can move to?', '● vert': '● green', '= déplacement ·': '= move ·',
  '● rouge': '● red', '= poussée': '= push', 'Vous pourrez changer ce réglage à tout moment dans la configuration de la partie.': 'You can change this at any time in the game setup.',
  "Oui, m'aider": 'Yes, help me', 'Non merci, je joue sans': 'No thanks, I’ll play without', '100 %': '100%',
  'non classé': 'unrated', 'Non classé': 'Unrated', 'Vos billes perdues': 'Your lost marbles', 'Votre temps': 'Your time',
  'Vos billes: Noires ●': 'Your marbles: Black ●', 'Vos billes: Blanches ○': 'Your marbles: White ○',
  "Aucune partie n'est encore conservee : le classement sera calcule quand l'historique existera": 'No game saved yet: the rating will be computed once there is a history',
  'Mode plein écran (plateau seul)': 'Full screen (board only)', 'Rotation (votre côté)': 'Rotation (your side)', 'Côté Blancs': 'White side',
  'Côté Noirs (0° exactement — pas par incréments, contrairement à Y↺/Y↻)': 'Black side (exactly 0° — not in steps, unlike Y↺/Y↻)',
  'Fermer et revoir la partie': 'Close and review the game',
  'Code de la position affichée (format KAAH/KAAWA) : billes noires puis blanches, chacune précédée du nombre de billes éjectées':
    'Code of the position shown (KAAH/KAAWA format): black marbles then white ones, each preceded by the number of marbles ejected',
  "Les 12 symétries de la position et l'échange des camps": 'The 12 symmetries of the position, and the colour swap',
  "Affiche les composantes de l'évaluation qui ont motivé le coup de l'IA": 'Shows the parts of the evaluation behind the AI’s move',
  "Depuis une position du replay, joue un coup différent et voit l'IA y répondre": 'From a replay position, play a different move and see the AI answer',
  'Jouer par echange de code, sans compte ni serveur': 'Play by exchanging codes, no account and no server',
  'Copie les coups de la partie en notation Aba-Pro standard, lisible par un moteur externe': 'Copies the moves in standard Aba-Pro notation, readable by an external engine',
  'Colle une sequence de coups en notation Aba-Pro pour la rejouer -- raccourci vers le meme import que dans le menu': 'Paste a sequence of moves in Aba-Pro notation to replay it — a shortcut to the same import as in the menu',
  'Faire jouer un autre programme contre l IA de ce site, en relayant les coups a la main': 'Have another program play this site’s AI, relaying the moves by hand',
  'Ou la partie a bascule': 'Where the game turned', 'Essaie un autre coup et vois ce qui se passe — ça ne compte pas pour de vrai': 'Try another move and see what happens — it doesn’t count',
  'Copie la séquence de coups (Aba-Pro ou Nacre) dans le presse-papier': 'Copies the move sequence (Aba-Pro or Nacre) to the clipboard',
  'Message… (ou /bot règles, /bot champions…)': 'Message… (or /bot règles, /bot champions…)',
  '🔀 Essayer une variante': '🔀 Try a variation', 'Copier les coups (Aba-Pro)': 'Copy the moves (Aba-Pro)', 'Importer une partie (Aba-Pro)': 'Import a game (Aba-Pro)',
  "Analyse d'apres-partie": 'Post-game analysis', '🧩 Résoudre': '🧩 Solve', '📊 Analyse de la position': '📊 Position analysis',
  '🧩 Puzzles (vraies parties)': '🧩 Puzzles (real games)', '🔮 Et si...?': '🔮 What if…?',
  'Cliquez sur vos billes pour les sélectionner': 'Tap your marbles to select them', "Attendre le coup de l'adversaire…": 'Waiting for the opponent’s move…',
  'Direction invalide': 'Invalid direction', 'Billes non alignées': 'Marbles not aligned', 'Sortie de ses propres billes interdite': 'You cannot push your own marbles off',
  'Bloqué par une bille alliée': 'Blocked by one of your own marbles', 'Poussée bloquée': 'Push blocked', 'Mouvement hors plateau': 'Move off the board',
  'Mouvement bloqué': 'Move blocked', 'Coup invalide': 'Invalid move',
  'Victoire !': 'Victory!', 'Défaite…': 'Defeat…', 'Vous avez éjecté 6 billes adverses !': 'You ejected 6 opposing marbles!', 'Vous avez éjecté 6 billes adverses': 'You ejected 6 opposing marbles',
  "L'adversaire a éjecté 6 de vos billes.": 'Your opponent ejected 6 of your marbles.', 'Votre adversaire a abandonné.': 'Your opponent resigned.', 'Vous avez abandonné.': 'You resigned.',
  'Les Noirs gagnent !': 'Black wins!', 'Les Blancs gagnent !': 'White wins!', 'Les Noirs ont éjecté 6 billes adverses.': 'Black ejected 6 opposing marbles.',
  'Les Blancs ont éjecté 6 billes adverses.': 'White ejected 6 opposing marbles.', 'Les Noirs ont abandonné.': 'Black resigned.', 'Les Blancs ont abandonné.': 'White resigned.',
  'Partie nulle': 'Draw', 'La même position est revenue une 3e fois, avec le même camp au trait.': 'The same position came back a third time, with the same side to move.',
  'Nulle acceptée d’un commun accord.': 'Draw agreed by both players.', 'Défaite au temps…': 'Lost on time…', 'Victoire au temps !': 'Won on time!',
  '⏱️ Votre temps est écoulé.': '⏱️ Your time ran out.', "⏱️ Le temps de l'adversaire est écoulé.": '⏱️ Your opponent’s time ran out.',
  '🤝 Partie nulle — ELO inchangé': '🤝 Draw — rating unchanged',
  'Bravo, tu as gagné ! 🎉': 'Well done, you won! 🎉', 'Belle partie, bien joué !': 'Great game, well played!', 'Belle partie ! 💪': 'Nice game! 💪',
  "Cette fois c'est l'autre camp qui gagne — à toi de rejouer !": 'This time the other side wins — play again!', 'Match nul ! 🤝': 'It’s a draw! 🤝',
  '📤 Partager': '📤 Share', '🔍 Revoir la partie': '🔍 Review the game', '⚠️ Revoir mes erreurs': '⚠️ Review my mistakes',
  '🧺 Blanchissage ! Victoire 6-0 sans perdre une bille !': '🧺 Whitewash! A 6-0 win without losing a single marble!', 'Partie': 'Game', '💬 Chat': '💬 Chat', '📊 Analyse': '📊 Analysis', '🤖 Bots': '🤖 Bots',
  'Historique des coups': 'Move list', 'Copier': 'Copy', 'Permutations': 'Permutations',
  '▸ Réflexion de l’IA': '▸ AI reasoning', '▾ Réflexion de l’IA': '▾ AI reasoning', '💡 Suggérer un coup': '💡 Suggest a move',
  '🧠 Pourquoi ce coup ?': '🧠 Why this move?', '⟨ Précédent': '⟨ Previous', 'Suivant ⟩': 'Next ⟩', '▶ Rejouer la partie': '▶ Replay the game',
  '📋 Exporter la partie': '📋 Export the game', 'Partie par code': 'Game by code',
  'Partie en direct 🧪': 'Live game 🧪', '🔄 Inverser': '🔄 Flip', '🔍 Analyser la partie': '🔍 Analyze the game',
  '↩️ Annuler le dernier coup': '↩️ Undo last move', '🤝 Proposer nulle': '🤝 Offer a draw', 'Abandonner': 'Resign', '🔄 Nouvelle partie': '🔄 New game', '🤖 Aide': '🤖 Help',
  '👋 Bonne chance': '👋 Good luck', '👏 Beau coup': '👏 Nice move', '🎉 Bien joué': '🎉 Well played',
  'Temps restant': 'Time left', '🎙️ Mode commentateur': '🎙️ Commentator mode', '📺 Projeter :': '📺 Project:', 'Position :': 'Position:',
  'Duel moteur externe 🧪': 'External engine duel 🧪', 'Style IA': 'AI style', '🔤 Diagramme': '🔤 Diagram',
  // ── tutoriel interactif ──
  'Bienvenue !': 'Welcome!', 'Terminer ✓': 'Finish ✓', 'Bravo ! ✅': 'Well done! ✅', '🎓 Tutoriel terminé — bonne partie !': '🎓 Tutorial done — enjoy your game!',
  'Bienvenue dans Abalone !': 'Welcome to Abalone!',
  'Le but : éjecter 6 billes adverses hors du plateau. Tu joues les billes noires ⚫. Ce tutoriel te guide pas à pas. Clique sur "Suivant" pour commencer.':
    'The goal: push 6 opposing marbles off the board. You play the black marbles ⚫. This tutorial guides you step by step. Tap "Next" to begin.',
  'Étape 1 — Sélectionner une bille': 'Step 1 — Select a marble',
  'Clique sur une bille noire ⚫ pour la sélectionner. Elle se cerclera de doré.': 'Tap a black marble ⚫ to select it. It gets a gold ring.',
  'Parfait ! La bille est sélectionnée. ✅': 'Perfect! The marble is selected. ✅',
  'Étape 2 — Déplacer une bille': 'Step 2 — Move a marble',
  'Sélectionne une bille noire, puis clique sur une case vide adjacente pour la déplacer.': 'Select a black marble, then tap an empty neighbouring cell to move it.',
  'Bravo ! Tu sais déplacer une bille. ✅': 'Well done! You can move a marble. ✅',
  'Étape 3 — Déplacer plusieurs billes': 'Step 3 — Move several marbles',
  'Sélectionne 2 ou 3 billes alignées (clique-les une à une), puis clique une case vide dans leur prolongement ou sur le côté.':
    'Select 2 or 3 aligned marbles (tap them one by one), then tap an empty cell in line with them or to the side.',
  "Excellent ! Le déplacement de groupe est la clé d'Abalone. ✅": 'Excellent! Moving groups is the key to Abalone. ✅',
  "Étape 4 — La poussée (Sumito) et l'éjection": 'Step 4 — Pushing (Sumito) and ejecting',
  "Tes 2 billes noires peuvent pousser 1 bille blanche au bord. Sélectionne les 2 noires alignées, puis pousse vers la blanche pour l'éjecter !":
    'Your 2 black marbles can push 1 white marble that sits on the edge. Select the 2 aligned black marbles, then push toward the white one to eject it!',
  '🎉 Éjection réussie ! Continue, il reste quelques leçons clés.': '🎉 Ejected! Keep going, a few key lessons are left.',
  'Étape 5 — La majorité décide (Sumito 3 contre 2)': 'Step 5 — The majority wins (Sumito 3 against 2)',
  'Pour pousser 2 billes adverses, il faut être plus nombreux : 3 contre 2. Sélectionne tes 3 billes noires alignées et pousse les 2 blanches vers la droite.':
    'To push 2 opposing marbles you must outnumber them: 3 against 2. Select your 3 aligned black marbles and push the 2 white ones to the right.',
  "💪 Bien joué ! 3 contre 2, la majorité l'emporte. C'est le cœur de la stratégie.": '💪 Well played! 3 against 2: the majority wins. That is the heart of the strategy.',
  'Étape 6 — La barrière imprenable': 'Step 6 — The unbreakable wall',
  "⚠️ Leçon défensive ! 3 billes alignées NE PEUVENT PAS être poussées : c'est une barrière. Essaie de pousser ces 3 billes blanches avec tes 2 noires (vers la droite) — tu verras, c'est bloqué. C'est ça, une défense solide.":
    '⚠️ Defensive lesson! 3 aligned marbles CANNOT be pushed: they form a wall. Try to push these 3 white marbles with your 2 black ones (to the right) — you will see, it is blocked. That is a solid defense.',
  '🛡️ Tu as compris ! 2 ne peuvent jamais pousser 3. Aligne tes billes par 3 et tu seras imprenable.': '🛡️ You got it! 2 can never push 3. Line your marbles up in threes and you will be unbreakable.',
  'Étape 7 — Le mouvement de côté (broadside)': 'Step 7 — The side-step (broadside)',
  'On peut aussi déplacer 2-3 billes latéralement (sur le côté). Sélectionne tes 3 billes noires alignées, puis clique une case vide sur le côté (au-dessus ou en-dessous) pour les décaler ensemble.':
    'You can also move 2 or 3 marbles sideways. Select your 3 aligned black marbles, then tap an empty cell to the side (above or below) to shift them together.',
  "↔️ Parfait ! Le mouvement de côté sert à repositionner ta formation sans t'exposer.": '↔️ Perfect! The side-step repositions your formation without exposing it.',
  "Étape 8 — Riposter quand l'adversaire attaque": 'Step 8 — Strike back when attacked',
  "⚪ Les Blancs ont avancé une bille jusqu'au bord inférieur. ⚫ À toi de réagir ! Punis cette avancée : aligne tes 2 billes noires et pousse la blanche vers le bas pour l'éjecter.":
    '⚪ White has moved a marble to the bottom edge. ⚫ Your turn to react! Punish it: line up your 2 black marbles and push the white one down to eject it.',
  '🏆 Parfait ! Tu sais maintenant attaquer, défendre ET riposter. Tu es prêt pour de vraies parties !': '🏆 Perfect! You can now attack, defend AND strike back. You are ready for real games!',
  'Fermer': 'Close', 'Code copié': 'Code copied',
  // ── problemes (page Problemes, puzzles de vraies parties) ──
  'Problèmes tactiques': 'Tactical puzzles', 'Le défi du jour': 'The daily puzzle', 'Le problème du mois': 'Puzzle of the month',
  'TROUVER LE COUP GAGNANT': 'FIND THE WINNING MOVE', 'PARER LA MENACE': 'STOP THE THREAT', '🏅 Certifié': '🏅 Certified',
  'Coup vérifié directement contre le moteur du site': 'Move checked directly against the site’s engine',
  'NIVEAU :': 'LEVEL:', 'TRAIT :': 'TO MOVE:', 'OBJECTIF :': 'GOAL:', 'FACILE': 'EASY', 'MOYEN': 'MEDIUM', 'DIFFICILE': 'HARD', 'NOIR': 'BLACK', 'BLANC': 'WHITE',
  '▶ Jouer le problème du mois': '▶ Play the puzzle of the month', '👁 Voir la solution': '👁 Show the solution',
  '📋 Exporter (APGN)': '📋 Export (APGN)', 'Copie la position et la solution au format Aba-Pro': 'Copies the position and the solution in Aba-Pro format',
  '✅ Résolu ce mois-ci': '✅ Solved this month', '🏆 Problème du mois résolu ! +80 XP': '🏆 Puzzle of the month solved! +80 XP',
  'À réviser': 'To review', 'Réviser maintenant': 'Review now',
  'Entraînement': 'Training', 'À votre rythme': 'At your own pace', '3 min chrono': '3-minute clock', 'Le même pour tous': 'The same for everyone',
  'Puzzle infini': 'Endless puzzles', "Généré par l'IA": 'Generated by the AI', 'Finale prouvée': 'Proven endgame', '1 sur 12,96M': '1 in 12.96M',
  'Finale prouvée — séquence': 'Proven endgame — sequence', '3, 5 ou 7 coups, adversaire optimal': '3, 5 or 7 moves, perfect opponent',
  'Finale 4 contre 2': 'Endgame 4 against 2', 'gain en 9 à 25 coups, défense parfaite': 'win in 9 to 25 moves, perfect defense',
  'résolus': 'solved', 'erreurs': 'errors', 'En cours…': 'Running…', '⚡ Puzzle Storm démarré — 3 minutes !': '⚡ Puzzle Storm started — 3 minutes!',
  'Chargement du puzzle...': 'Loading the puzzle…', '⚫ Sélectionnez une bille noire': '⚫ Select a black marble', '⚫ Sélectionnez vos billes noires': '⚫ Select your black marbles',
  'Bravo !': 'Well done!', 'Puzzle résolu !': 'Puzzle solved!', 'Puzzle suivant →': 'Next puzzle →', 'Pas tout à fait...': 'Not quite…',
  'Essayez encore ou consultez l’indice.': 'Try again, or check the hint.',
  '💡 Indice': '💡 Hint', '🔤 Coordonnées': '🔤 Coordinates', '⟩ Suivant': '⟩ Next', '⏭ Suivant': '⏭ Next', 'Solution :': 'Solution:', 'Série de problèmes': 'Puzzle series',
  '💡 Indice :': '💡 Hint:', 'Tes billes noires :': 'Your black marbles:',
  '✅ Solution affichée — essayez de la rejouer sur le plateau !': '✅ Solution shown — try playing it on the board!',
  'Cherche une poussée gagnante.': 'Look for a winning push.', 'Cherche la poussée gagnante.': 'Look for the winning push.',
  'PUZZLE GÉNÉRÉ': 'GENERATED PUZZLE', "⚫ Les Noirs ont le trait. Une bille blanche est exposée au bord. Trouve la poussée qui l'éjecte !": '⚫ Black to move. A white marble is exposed on the edge. Find the push that ejects it!',
  '(Puzzle créé automatiquement — solution garantie.)': '(Puzzle created automatically — solution guaranteed.)',
  'FINALE PROUVÉE': 'PROVEN ENDGAME', "⚫ Les Noirs ont le trait. Cette position est l'une des": '⚫ Black to move. This position is one of the',
  "(sur 12 956 400, mode Découverte) où la victoire est démontrée par induction rétrograde exhaustive — pas estimée, pas calculée par le moteur : prouvée. Trouve l'éjection forcée.":
    '(out of 12,956,400, Discovery mode) where the win is shown by exhaustive retrograde analysis — not estimated, not computed by the engine: proven. Find the forced ejection.',
  '(Position réelle de tablebase, pas générée.)': '(A real tablebase position, not generated.)',
  'FINALE PROUVÉE — SÉQUENCE': 'PROVEN ENDGAME — SEQUENCE', '⚫ Les Noirs ont le trait. Le gain est prouvé en': '⚫ Black to move. The win is proven in',
  ', même contre la meilleure défense adverse — aucune éjection n’est possible avant. Après chacun de vos coups, l’adversaire joue sa meilleure résistance, calculée par la même table. Un coup légal mais pas optimal ne compte pas contre vous : vous rejouez depuis la même position.':
    ', even against the best defense — no ejection is possible before that. After each of your moves, the opponent plays its best resistance, computed by the same table. A legal but non-optimal move does not count against you: you replay from the same position.',
  '(1 des 195 positions à plusieurs coups de la tablebase 3v2.)': '(1 of the 195 multi-move positions of the 3-against-2 tablebase.)',
  'FINALE 4 CONTRE 2': 'ENDGAME 4 AGAINST 2', '⚫ Les Noirs ont le trait. La table prouve le gain en': '⚫ Black to move. The table proves the win in',
  'contre la meilleure défense. Éjectez une bille blanche : les Blancs, réduits à une bille, auront perdu.': 'against the best defense. Eject a white marble: White, down to one marble, will have lost.',
  '💥 Éjection — les Blancs n’ont plus qu’une bille !': '💥 Ejected — White has only one marble left!',
  '🛡️ Menace parée !': '🛡️ Threat stopped!', '✅ Coup gagnant trouvé !': '✅ Winning move found!', '❌ Raté — pense à 💡 Indice ou ✅ Solution': '❌ Missed — try 💡 Hint or ✅ Solution',
  '❌ La menace demeure, réessaie': '❌ The threat is still there, try again', '❌ Pas le meilleur coup, réessaie': '❌ Not the best move, try again',
  'Puzzle déjà résolu — ⏭ Suivant': 'Puzzle already solved — ⏭ Next', 'Puzzles fermés': 'Puzzles closed', 'Aucun puzzle embarqué': 'No puzzle included',
  'Puzzle résolu': 'Puzzle solved', 'Problème du mois résolu': 'Puzzle of the month solved',
  // les 18 problemes de la serie (titres, enonces, indices, solutions de secours)
  'Première éjection': 'First ejection', '🟢 Difficulté Facile': '🟢 Difficulty: easy', '🟡 Difficulté Moyenne': '🟡 Difficulty: medium', '🔴 Difficulté Difficile': '🔴 Difficulty: hard',
  'Initiation': 'Beginner', 'Intermédiaire': 'Intermediate', 'Défense & Riposte': 'Defense & counter',
  'PREMIÈRE ÉJECTION': 'FIRST EJECTION',
  'Les Noirs ont le trait. Une bille blanche est au bord droit, deux billes noires sont alignées derrière. Poussez-la hors du plateau !':
    'Black to move. A white marble sits on the right edge, with two black marbles lined up behind it. Push it off the board!',
  '(Sélectionnez vos 2 billes noires, puis cliquez vers la droite.)': '(Select your 2 black marbles, then tap toward the right.)',
  'Sélectionnez les deux billes noires alignées, puis poussez vers la bille blanche au bord.': 'Select the two aligned black marbles, then push toward the white marble on the edge.',
  'Sélectionnez les 2 billes noires (e7 et e8), poussez vers la droite → la blanche est éjectée. ✅': 'Select the 2 black marbles (e7 and e8), push to the right → the white one is ejected. ✅',
  'Poussée à gauche': 'Push to the left', 'POUSSÉE À GAUCHE': 'PUSH TO THE LEFT',
  'Les Noirs ont le trait. Éjectez la bille blanche par le bord gauche avec une poussée 2 contre 1.': 'Black to move. Eject the white marble over the left edge with a 2-against-1 push.',
  "(Même principe, dans l'autre sens.)": '(Same idea, the other way.)',
  'Les deux billes noires poussent vers la gauche, où se trouve la bille blanche au bord.': 'The two black marbles push to the left, where the white marble sits on the edge.',
  'Sélectionnez les 2 billes noires, poussez vers la gauche → éjection. ✅': 'Select the 2 black marbles, push to the left → ejection. ✅',
  'Triple poussée': 'Triple push', 'TRIPLE POUSSÉE': 'TRIPLE PUSH',
  'Les Noirs ont le trait. Trois billes noires alignées peuvent éjecter la bille blanche au bord. Trouvez la poussée.': 'Black to move. Three aligned black marbles can eject the white marble on the edge. Find the push.',
  '(Sumito 3 contre 1.)': '(Sumito 3 against 1.)',
  'Sélectionnez les trois billes noires alignées et poussez vers la bille blanche.': 'Select the three aligned black marbles and push toward the white one.',
  'Sélectionnez les 3 billes noires (f6 / f7 / f8), poussez vers la droite → éjection. ✅': 'Select the 3 black marbles (f6 / f7 / f8), push to the right → ejection. ✅',
  'Sumito 3 contre 2': 'Sumito 3 against 2', 'SUMITO 3 CONTRE 2': 'SUMITO 3 AGAINST 2',
  'Les Noirs ont le trait. Trois billes noires peuvent pousser deux billes blanches — et en éjecter une par le bord. Réalisez le sumito 3v2.':
    'Black to move. Three black marbles can push two white ones — and eject one over the edge. Play the 3-against-2 sumito.',
  '(Trois contre deux : autorisé !)': '(Three against two: allowed!)',
  'Trois billes noires alignées contre deux blanches : la poussée est possible et éjecte la bille du bord.': 'Three aligned black marbles against two white ones: the push is legal and ejects the marble on the edge.',
  'Sélectionnez les 3 billes noires (e5 / e6 / e7), poussez vers la droite → la blanche du bord sort. ✅': 'Select the 3 black marbles (e5 / e6 / e7), push to the right → the white one on the edge goes off. ✅',
  'Poussée vers le haut': 'Push upward', 'POUSSÉE VERS LE HAUT': 'PUSH UPWARD',
  'Les Noirs ont le trait. Cette fois la poussée se fait vers le haut du plateau. Éjectez la bille blanche du bord supérieur avec un sumito 3v2.':
    'Black to move. This time the push goes toward the top of the board. Eject the white marble from the top edge with a 3-against-2 sumito.',
  '(La direction change, le principe reste.)': '(The direction changes, the idea stays.)',
  'Alignez votre regard vers le haut : trois billes noires poussent deux blanches vers le bord supérieur.': 'Look upward: three black marbles push two white ones toward the top edge.',
  'Sélectionnez les 3 billes noires (g5 / f4 / e3), poussez vers le haut → éjection. ✅': 'Select the 3 black marbles (g5 / f4 / e3), push upward → ejection. ✅',
  'Bord droit': 'Right edge', 'BORD DROIT': 'RIGHT EDGE',
  'Les Noirs ont le trait. Éjectez la bille blanche par le bord droit, en haut du plateau.': 'Black to move. Eject the white marble over the right edge, at the top of the board.',
  '(Poussée 2 contre 1.)': '(Push 2 against 1.)', 'Deux billes noires alignées poussent la blanche vers le bord droit.': 'Two aligned black marbles push the white one toward the right edge.',
  'Sélectionnez les 2 billes noires, poussez vers la droite → éjection. ✅': 'Select the 2 black marbles, push to the right → ejection. ✅',
  'Bord gauche bas': 'Lower left edge', 'BORD GAUCHE BAS': 'LOWER LEFT EDGE',
  'Les Noirs ont le trait. Une poussée 2 contre 1 éjecte la bille blanche dans la partie basse du plateau.': 'Black to move. A 2-against-1 push ejects the white marble in the lower part of the board.',
  'Alignez deux billes noires et poussez la blanche au bord.': 'Line up two black marbles and push the white one on the edge.',
  'Sélectionnez les 2 billes noires, poussez → éjection. ✅': 'Select the 2 black marbles, push → ejection. ✅',
  'Triple vers le bas': 'Triple downward', 'TRIPLE VERS LE BAS': 'TRIPLE DOWNWARD',
  'Les Noirs ont le trait. Trois billes alignées verticalement poussent la blanche hors du bord inférieur.': 'Black to move. Three marbles in a column push the white one off the bottom edge.',
  'Trois billes noires en colonne poussent vers le bas.': 'Three black marbles in a column push downward.',
  'Sélectionnez les 3 billes noires, poussez vers le bas → éjection. ✅': 'Select the 3 black marbles, push downward → ejection. ✅',
  'Coin sud-est': 'South-east corner', 'COIN SUD-EST': 'SOUTH-EAST CORNER',
  'Les Noirs ont le trait. Éjectez la bille blanche nichée dans le coin sud-est du plateau.': 'Black to move. Eject the white marble tucked into the south-east corner of the board.',
  'Deux billes noires suffisent pour éjecter la blanche du coin.': 'Two black marbles are enough to eject the white one from the corner.',
  'Sélectionnez les 2 billes noires, poussez vers le coin → éjection. ✅': 'Select the 2 black marbles, push toward the corner → ejection. ✅',
  'Bord nord 2v1': 'North edge 2v1', 'BORD NORD': 'NORTH EDGE',
  'Les Noirs ont le trait. Éjectez la bille blanche par le sommet du plateau avec une poussée 2 contre 1.': 'Black to move. Eject the white marble over the top of the board with a 2-against-1 push.',
  'Deux billes noires alignées vers le haut poussent la blanche au sommet.': 'Two black marbles lined up toward the top push the white one at the summit.',
  'Sélectionnez les 2 billes noires, poussez vers le haut → éjection. ✅': 'Select the 2 black marbles, push upward → ejection. ✅',
  'Coin extrême': 'Far corner', 'COIN EXTRÊME': 'FAR CORNER',
  'Les Noirs ont le trait. La bille blanche est tout en haut à gauche. Éjectez-la !': 'Black to move. The white marble is in the top-left corner. Eject it!',
  'Deux billes noires poussent la blanche hors du coin supérieur.': 'Two black marbles push the white one out of the top corner.',
  'Sumito 3v2 droite': 'Sumito 3v2 right', 'SUMITO 3 CONTRE 2 — DROITE': 'SUMITO 3 AGAINST 2 — RIGHT',
  'Les Noirs ont le trait. Trois billes noires poussent deux blanches et en éjectent une par le bord droit, en haut.': 'Black to move. Three black marbles push two white ones and eject one over the right edge, at the top.',
  'Trois contre deux : la poussée est autorisée et éjecte la bille du bord.': 'Three against two: the push is legal and ejects the marble on the edge.',
  'Sumito 3v2 bas': 'Sumito 3v2 down', 'SUMITO 3 CONTRE 2 — BAS': 'SUMITO 3 AGAINST 2 — DOWN',
  'Les Noirs ont le trait. Une colonne de trois billes noires pousse deux blanches vers le bas et en éjecte une.': 'Black to move. A column of three black marbles pushes two white ones down and ejects one.',
  'Trois billes noires en colonne poussent les deux blanches vers le bord inférieur.': 'Three black marbles in a column push the two white ones toward the bottom edge.',
  'Poussée diagonale': 'Diagonal push', 'POUSSÉE DIAGONALE': 'DIAGONAL PUSH',
  'Les Noirs ont le trait. Cette fois la ligne de poussée est diagonale. Trois billes noires éjectent une blanche du bord.': 'Black to move. This time the line of the push is diagonal. Three black marbles eject a white one from the edge.',
  '(Pensez en diagonale !)': '(Think diagonally!)', 'Les billes noires sont alignées en diagonale — poussez le long de cet axe.': 'The black marbles are lined up diagonally — push along that line.',
  'Sélectionnez les 3 billes noires en diagonale, poussez → éjection. ✅': 'Select the 3 diagonal black marbles, push → ejection. ✅',
  'Riposte à droite': 'Counter to the right', 'RIPOSTE À DROITE': 'COUNTER TO THE RIGHT',
  "⚪ Les Blancs viennent d'avancer une bille jusqu'au bord droit (en f9) pour menacer ta position.": '⚪ White has just moved a marble up to the right edge (on f9) to threaten your position.',
  '⚫ À toi de jouer ! Punis cette avancée trop audacieuse : éjecte la bille blanche exposée.': '⚫ Your move! Punish that bold advance: eject the exposed white marble.',
  'La bille blanche avancée est isolée au bord. Tes deux billes noires alignées peuvent la pousser dehors.': 'The advanced white marble is alone on the edge. Your two aligned black marbles can push it off.',
  'Sélectionne tes 2 billes noires (f7 et f8) et pousse vers la droite → la blanche tombe. ✅': 'Select your 2 black marbles (f7 and f8) and push to the right → the white one falls. ✅',
  'Riposte au sumito': 'Sumito counter', 'RIPOSTE AU SUMITO': 'SUMITO COUNTER',
  '⚪ Les Blancs ont engagé deux billes vers le bord supérieur, pensant te dominer.': '⚪ White has committed two marbles toward the top edge, thinking it has the upper hand.',
  '⚫ Retourne la situation ! Avec trois billes, tu peux pousser les deux blanches et en éjecter une.': '⚫ Turn the tables! With three marbles you can push the two white ones and eject one.',
  "Trois contre deux : ta supériorité numérique te permet de pousser et d'éjecter la bille du bord.": 'Three against two: your extra marble lets you push and eject the marble on the edge.',
  'Sélectionne tes 3 billes noires (g5 / g6 / g7) et pousse vers la droite → éjection. ✅': 'Select your 3 black marbles (g5 / g6 / g7) and push to the right → ejection. ✅',
  'Riposte vers le bas': 'Counter downward', 'RIPOSTE VERS LE BAS': 'COUNTER DOWNWARD',
  "⚪ Une bille blanche s'est aventurée tout en bas du plateau (en a3).": '⚪ A white marble has wandered to the very bottom of the board (on a3).',
  "⚫ Saisis l'occasion : aligne trois billes et éjecte-la par le bord inférieur.": '⚫ Seize the chance: line up three marbles and eject it over the bottom edge.',
  'Ta colonne de trois billes noires peut pousser la blanche hors du bord du bas.': 'Your column of three black marbles can push the white one off the bottom edge.',
  'Sélectionne tes 3 billes noires (d3 / c3 / b3) et pousse vers le bas → éjection. ✅': 'Select your 3 black marbles (d3 / c3 / b3) and push downward → ejection. ✅',
  'Riposte au coin': 'Corner counter', 'RIPOSTE AU COIN': 'CORNER COUNTER',
  "⚪ Les Blancs ont poussé une bille jusqu'au coin supérieur (en i8) — une position très exposée.": '⚪ White has pushed a marble into the top corner (on i8) — a very exposed spot.',
  "⚫ Profites-en pour l'éjecter d'une poussée verticale.": '⚫ Make the most of it: eject it with a vertical push.',
  "La bille blanche au coin n'a aucune échappatoire. Pousse-la vers le haut.": 'The white marble in the corner has no way out. Push it upward.',
  'Sélectionne tes 2 billes noires (g6 et h7) et pousse vers le haut → éjection. ✅': 'Select your 2 black marbles (g6 and h7) and push upward → ejection. ✅',
  // ── classement, historique ──
  "Un classement honnête demande des parties vérifiées entre comptes ; le site n'a ni comptes ni serveur. Il n'affiche donc ni noms ni ELO inventés.":
    'An honest leaderboard needs verified games between accounts; the site has neither accounts nor a server. So it shows no made-up names or ratings.',
  '🏁 En attendant': '🏁 Meanwhile', 'Joue contre un ami, en direct': 'Play a friend, live', '— un code à échanger, sans compte.': '— one code to exchange, no account.',
  'Le tournoi mensuel': 'The monthly tournament', "contre l'IA, avec palmarès.": 'against the AI, with a record of wins.', 'Tes statistiques': 'Your statistics',
  'sur cet appareil.': 'on this device.', 'Voir': 'View',
  'Tes parties': 'Your games', 'Toutes tes parties terminées, stockées sur cet appareil. Clique « Revoir » pour rejouer coup par coup depuis le début.':
    'All your finished games, stored on this device. Tap “Review” to replay them move by move from the start.',
  'Aucune partie ne correspond.': 'No game matches.', 'Revoir': 'Review',
  // ── la reflexion de l'IA (tableau) ──
  'Le tableau apparaîtra après le prochain coup calculé par l’IA.': 'The table will appear after the AI’s next computed move.',
  '1er coup': '1st move', 'Éval.': 'Eval.', 'Temps': 'Time', 'Sous lui': 'Under it', 'Suite prévue': 'Expected line', 'Gagne': 'Wins', 'Perd': 'Loses',
  'Perte': 'Loss', 'sc. Perte': 'sc. Loss', 'Centre': 'Center', 'Cases': 'Cells', 'Cohés.': 'Cohes.', 'Menace': 'Threat', 'Fourch.': 'Fork', 'Piège': 'Trap',
  'Mobilité': 'Mobility', 'Isolées': 'Isolated', 'En danger': 'In danger', 'Chaînes': 'Chains', 'Forteresses': 'Fortresses',
  'Temps : moment où le coup a été fini ; Sous lui : temps passé sur ce coup. Scores exacts : aucun élagage à la racine. Critères : écart entre la position et le bout de la suite prévue, du point de vue de l’IA ; seuls ceux qu’utilise ce style sont montrés. * : le score tient compte de prises au-delà de la suite. Touche un coup : sa suite sur un plateau.':
    'Time: when the move was finished; Under it: time spent on this move. Exact scores: no pruning at the root. Criteria: difference between the position and the end of the expected line, from the AI’s point of view; only the ones this style uses are shown. *: the score counts captures beyond the line. Tap a move to see its line on a board.',
  // ── partie en direct (fenetre) ──
  'Partie en direct': 'Live game', '1. ENVOIE CE CODE À TON ADVERSAIRE': '1. SEND THIS CODE TO YOUR OPPONENT', '2. COLLE SA RÉPONSE ICI': '2. PASTE THEIR ANSWER HERE',
  'COLLE LE CODE REÇU': 'PASTE THE CODE YOU RECEIVED', 'Générer ma réponse': 'Generate my answer', 'RENVOIE CE CODE À TON ADVERSAIRE': 'SEND THIS CODE BACK TO YOUR OPPONENT',
  "Connexion en cours d'établissement dès que ton adversaire aura collé ce code chez lui…": 'The connection will open as soon as your opponent pastes this code on their side…',
  'Préparation du code…': 'Preparing the code…', 'Solution de repli fiable si la connexion directe ne marche pas': 'Reliable fallback if the direct connection fails',
  'Échec de la préparation de la connexion (réseau ou pare-feu). Utilise « Partie par code » ci-dessous — ça marche toujours.':
    'Could not prepare the connection (network or firewall). Use “Game by code” below — it always works.',
  'Échec de la connexion (réseau ou pare-feu). Utilise « Partie par code » ci-dessous — ça marche toujours.':
    'Connection failed (network or firewall). Use “Game by code” below — it always works.',
  '🔴 Échec — utilise "Partie par code"': '🔴 Failed — use "Game by code"', '🔴 Échec de la connexion — utilise "Partie par code"': '🔴 Connection failed — use "Game by code"',
  '🟠 Connexion instable — tentative de reconnexion…': '🟠 Unstable connection — trying to reconnect…',
  '🔴 Connexion perdue — utilise "Partie par code" pour continuer': '🔴 Connection lost — use "Game by code" to continue',
  '🟡 Réponse acceptée — connexion en cours…': '🟡 Answer accepted — connecting…',
  // ── Duel Cerveau ──
  '⚔️ Duel Cerveau': '⚔️ Brain Duel', 'Se connecter à un ami': 'Connect to a friend', 'Lancer un duel': 'Start a duel', 'Revanche': 'Rematch',
  'Accepter': 'Accept', 'Refuser': 'Decline', 'Manche': 'Round', 'Toi': 'You',
  'Exercices de vitesse contre un ami, en direct : 3 manches, mêmes positions pour les deux, le meilleur score puis le plus rapide gagne.':
    'Speed exercises against a friend, live: 3 rounds, the same positions for both of you; best score wins, then fastest.',
  '⚪ Pas connecté — un code à échanger une fois avec ton ami, sans compte': '⚪ Not connected — one code to exchange with your friend, no account',
  'Connecte-toi d’abord à un ami (« Se connecter »)': 'Connect to a friend first (“Connect”)', 'Duel perdu — revanche ?': 'Duel lost — rematch?',
  'Défi envoyé : en attente de la réponse de ton adversaire…': 'Challenge sent: waiting for your opponent’s answer…', 'Défi refusé par ton adversaire.': 'Your opponent declined the challenge.',
  'Défi refusé.': 'Challenge declined.', 'Réponse envoyée — en attente de ton adversaire…': 'Answer sent — waiting for your opponent…',
  'Ton adversaire est déjà en duel.': 'Your opponent is already in a duel.', 'Un duel est déjà en cours': 'A duel is already running',
  '✅ Manche gagnée !': '✅ Round won!', '❌ Manche perdue': '❌ Round lost', '🏆 Duel gagné !': '🏆 Duel won!', '🤝 Duel nul': '🤝 Duel drawn', '🤝 Manche nulle': '🤝 Round drawn',
  '🔴 Connexion perdue : duel interrompu.': '🔴 Connection lost: duel interrupted.', '🟢 Connecté': '🟢 Connected', 'temps écoulé': 'time up',
  // ── Gym Cerveau (page et zones ; les exercices eux-memes restent en francais pour l'instant) ──
  "Abalone sollicite plusieurs capacités à la fois : mémoire, repérage visuel, anticipation, contrôle de l'impulsion, changement de plan. Chaque exercice ci-dessous isole l'une d'elles avec une petite tâche mesurable, basée sur de vraies positions et sur le moteur du site.":
    'Abalone draws on several abilities at once: memory, visual search, anticipation, impulse control, changing plans. Each exercise below isolates one of them in a small measurable task, built on real positions and on the site’s engine.',
  "🔒 Ce sont des exercices de jeu, pas un outil médical : ils ne diagnostiquent ni ne traitent rien. Les scores mesurent la performance à l'exercice précis, pas une capacité générale.":
    '🔒 These are game exercises, not a medical tool: they diagnose and treat nothing. Scores measure performance on that exact exercise, not a general ability.',
  '🧠 Les schémas de cerveau sont illustratifs et simplifiés — pas une image médicale précise, juste un repère visuel de la zone généralement associée à chaque capacité.':
    '🧠 The brain diagrams are simplified illustrations — not an accurate medical image, just a visual cue for the area usually associated with each ability.',
  'Choisis une zone ci-dessus pour commencer.': 'Pick an area above to start.',
  '🧠 Mémoire': '🧠 Memory', '👁️ Acuité': '👁️ Acuity', '⚡ Réflexe': '⚡ Reflex', '🧩 Flexibilité': '🧩 Flexibility', '⚖️ Certitude': '⚖️ Certainty',
  '📖 Répertoire': '📖 Repertoire', '🎚️ Jugement': '🎚️ Judgment', '🎯 Mat au bord': '🎯 Edge mate',
  'Mémoire': 'Memory', 'Acuité': 'Acuity', 'Réflexe': 'Reflex', 'Flexibilité': 'Flexibility', 'Certitude': 'Certainty', 'Répertoire': 'Repertoire', 'Jugement': 'Judgment', 'Mat au bord': 'Edge mate',
  'Hippocampe': 'Hippocampus', 'Cortex visuel': 'Visual cortex', 'Vitesse de traitement': 'Processing speed', 'Préfrontal': 'Prefrontal', 'Contrôle': 'Control',
  'Shift cognitif': 'Cognitive shift', 'Métacognition': 'Metacognition', 'Reconnaissance de motif': 'Pattern recognition',
  'Mémoriser une position brève puis la reconstituer.': 'Memorize a position briefly, then rebuild it.', 'Repérer rapidement une bille ou une menace précise.': 'Quickly spot a given marble or threat.',
  'Réagir à une menace sous contrainte de temps.': 'React to a threat against the clock.', 'Prévoir une position après plusieurs coups.': 'Foresee a position several moves ahead.',
  'Résister au coup évident quand il est mauvais.': 'Resist the obvious move when it is bad.', 'Changer de plan ou de camp à la demande.': 'Switch plans or sides on demand.',
  'Se reperer dans les relations entre billes sur le plateau.': 'Find your way among the relations between marbles on the board.',
  'Identifier ce qu’un coup vient d’abimer dans sa position.': 'Spot what a move has just damaged in your position.',
  'Distinguer un gain prouvé d’une position juste séduisante.': 'Tell a proven win from a merely attractive position.',
  'Reconnaître ce que jouent les forts en ouverture, sur des vraies parties.': 'Recognize what strong players play in the opening, from real games.',
  'Comparer deux positions sur un critère précis.': 'Compare two positions on one precise criterion.',
  'Trouver l’éjection qui gagne immédiatement (attaque, pas défense).': 'Find the ejection that wins at once (attack, not defense).',
  // ── regles (chapitres essentiels) ──
  "Qu'est-ce qu'Abalone ?": 'What is Abalone?', 'Mise en place': 'Setup', 'Objectif du jeu': 'Goal of the game', 'Règles': 'Rules',
  'Types de déplacements': 'Types of moves', 'La poussée (Sumito)': 'Pushing (Sumito)', 'Éjection de billes': 'Ejecting marbles', 'Variantes de jeu': 'Game variants',
  '👥 Règles à 3 et 4 joueurs': '👥 3- and 4-player rules', 'Égalité : le PAC': 'Equal forces: the PAC', 'Formations clés': 'Key formations',
  'Attaque et défense': 'Attack and defense', 'Guide stratégique': 'Strategy guide', '🟢 Débutant — fondamentaux': '🟢 Beginner — fundamentals', '♟️ Ouvertures': '♟️ Openings',
  '🔶 Tactiques avancées': '🔶 Advanced tactics', '🏁 Fin de partie': '🏁 Endgame', "🤖 Jouer contre l'IA": '🤖 Playing the AI', 'BGA & Ressources': 'BGA & resources',
  '📖 Mots clés officiels': '📖 Official keywords', '💡 Astuces BGA': '💡 BGA tips', '⚔️ Sumito détaillé': '⚔️ Sumito in detail', '🔗 Ressources': '🔗 Resources',
  '🎓 Nouveau ? Apprends en jouant !': '🎓 New? Learn by playing!', 'Un tutoriel interactif te guide pas à pas : sélection, déplacement, poussée et éjection.':
    'An interactive tutorial guides you step by step: selecting, moving, pushing and ejecting.', '▶ Lancer le tutoriel': '▶ Start the tutorial',
  'Abalone est un jeu de société stratégique abstrait créé en 1987 par Michel Lalet et Laurent Levi. Il se joue sur un plateau hexagonal entre deux joueurs, chacun disposant de 14 billes de couleur (noires ou blanches).':
    'Abalone is an abstract strategy board game created in 1987 by Michel Lalet and Laurent Levi. Two players face off on a hexagonal board, each with 14 marbles (black or white).',
  "Considéré comme l'un des jeux de stratégie les plus élégants jamais créés, Abalone combine la puissance brute de la poussée et la subtilité du positionnement. Le but est simple — éjecter 6 billes adverses hors du plateau — mais la profondeur tactique est immense.":
    'Often called one of the most elegant strategy games ever made, Abalone combines the raw power of pushing with the subtlety of positioning. The goal is simple — push 6 opposing marbles off the board — but the tactical depth is huge.',
  'Joueurs': 'Players', "Abalone se joue en face à face, Noir contre Blanc, chacun cherchant à déstabiliser l'autre.": 'Abalone is played head to head, Black against White, each trying to break the other.',
  'Billes par joueur': 'Marbles per player', 'Chaque joueur commence avec 14 billes disposées sur les rangées de son côté du plateau.': 'Each player starts with 14 marbles on the rows of their side of the board.',
  'Billes à éjecter': 'Marbles to eject', 'Le premier joueur à éjecter 6 billes adverses hors du plateau hexagonal remporte la partie.': 'The first player to push 6 opposing marbles off the hexagonal board wins.',
  '💡 Le saviez-vous ?': '💡 Did you know?',
  "Abalone s'est vendu à plus de 4,5 millions d'exemplaires et se vendait en 2011 dans plus de trente pays. L'année de sa sortie, en 1990, il a reçu l'un des premiers prix Mensa Select.":
    'Abalone has sold more than 4.5 million copies and, as of 2011, was sold in more than thirty countries. In 1990, the year it came out, it received one of the first Mensa Select awards.',
  'Cases hexagonales': 'Hexagonal cells', 'Le plateau comporte 61 espaces hexagonaux disposés en cercles concentriques.': 'The board has 61 hexagonal cells arranged in concentric rings.',
  'Disposition initiale': 'Starting position',
  'Les 14 billes noires occupent les deux rangées les plus proches du joueur noir (5 et 6 billes) et les 3 cases centrales de la troisième ; les blanches font de même en face. Les trois rangées du milieu restent vides.':
    'The 14 black marbles fill the two rows nearest to Black (5 and 6 marbles) and the 3 central cells of the third row; White does the same on the other side. The three middle rows stay empty.',
  "La disposition standard (dite classique) place les billes en blocs compacts. D'autres dispositions de départ existent pour varier les ouvertures : la Marguerite belge, la Marguerite allemande ou l'Alien.":
    'The standard (classic) layout places the marbles in compact blocks. Other starting layouts vary the openings: the Belgian Daisy, the German Daisy or the Alien.',
  '⚡ Disposition classique :': '⚡ Classic layout:', 'Noir commence toujours en premier dans la configuration standard. Le joueur avec les billes noires effectue le premier mouvement.':
    'Black always moves first in the standard setup. The player with the black marbles makes the first move.',
  'Objectif': 'Goal', 'Remporter la partie': 'Winning the game',
  "L'objectif est d'éjecter 6 billes adverses hors du plateau hexagonal. Dès que la 6ème bille adverse est poussée à l'extérieur, la partie s'arrête et vous êtes déclaré vainqueur.":
    'The goal is to push 6 opposing marbles off the hexagonal board. As soon as the 6th opposing marble goes off, the game stops and you win.',
  "Chaque bille éjectée tombe dans le creux entourant le plateau. Un compteur suit les billes perdues par chaque camp. La victoire s'obtient en éjectant 6 billes adverses ; une partie peut aussi se conclure par une nulle, par accord entre les deux joueurs ou par répétition de position — comme en tournoi.":
    'Each ejected marble falls into the gutter around the board. A counter tracks the marbles each side has lost. You win by ejecting 6 opposing marbles; a game can also end in a draw, by agreement between the players or by repetition of position — as in tournaments.',
  'Camp': 'Side', 'Billes de départ': 'Starting marbles', 'Billes éjectées': 'Ejected marbles', 'Billes restantes': 'Marbles left', 'Vainqueur': 'Winner', 'Perdant': 'Loser',
  '0 à 5': '0 to 5', '9 à 14': '9 to 14',
  '📊 En chiffres :': '📊 In numbers:', "chaque camp démarre avec 14 billes. La partie s'arrête dès la 6ème éjection — le perdant termine donc toujours avec 8 billes sur le plateau, jamais moins.":
    'each side starts with 14 marbles. The game stops at the 6th ejection — so the loser always ends with 8 marbles on the board, never fewer.',
  "À chaque tour, vous déplacez 1, 2 ou 3 de vos billes d'une case dans l'une des 6 directions possibles. Il existe deux grandes familles de mouvements :":
    'Each turn you move 1, 2 or 3 of your marbles one cell in one of the 6 directions. There are two kinds of moves:',
  'Déplacement "en ligne" (In-line)': 'In-line move',
  "Vous déplacez 1 à 3 billes dans la direction de leur axe. C'est ce mouvement qui permet de pousser les billes adverses. Une colonne de 3 billes peut pousser au maximum 2 billes adverses, de 2 billes peut en pousser 1.":
    'You move 1 to 3 marbles along their own line. This is the move that pushes opposing marbles: a column of 3 can push at most 2, a column of 2 can push 1.',
  'Déplacement "latéral" (Side-step / Broadside)': 'Side-step (broadside) move',
  'Vous déplacez 2 ou 3 billes alignées perpendiculairement à leur axe. Ce mouvement ne peut pas pousser de billes adverses — il sert à repositionner votre groupe, changer de formation ou esquiver une attaque.':
    'You move 2 or 3 aligned marbles sideways, out of their line. This move cannot push — it repositions your group, changes formation or dodges an attack.',
  '📌 Règle fondamentale :': '📌 Basic rule:', "Vous ne pouvez jamais déplacer vos billes sur une case occupée par l'une de vos propres billes. La destination doit être vide ou contenir des billes adverses (dans le cas d'une poussée légale).":
    'You can never move onto a cell occupied by one of your own marbles. The destination must be empty, or hold opposing marbles in a legal push.',
  'La poussée — Sumito': 'Pushing — Sumito', "est la règle centrale d'Abalone : un groupe de billes peut en pousser un groupe adverse plus petit.": 'is the central rule of Abalone: a group of marbles can push a smaller opposing group.',
  '3 contre 1': '3 against 1', "Trois de vos billes alignées peuvent pousser une bille adverse. C'est la poussée la plus facile à réaliser mais aussi la plus souvent anticipée.":
    'Three of your aligned marbles can push one opposing marble. The easiest push — and the most often seen coming.',
  '3 contre 2': '3 against 2', 'Trois de vos billes peuvent pousser deux billes adverses alignées dans le même axe. Très puissant pour progresser vers le bord.':
    'Three of your marbles can push two opposing marbles on the same line. Very strong for driving toward the edge.',
  '2 contre 1': '2 against 1', 'Deux de vos billes peuvent pousser une seule bille adverse. Utile pour des actions rapides en milieu de partie.': 'Two of your marbles can push a single opposing marble. Handy for quick actions in the middlegame.',
  'Poussées illégales': 'Illegal pushes', "Il est interdit de pousser si la force est égale (2v2, 3v3) ou si l'adversaire a plus de billes (1v2, etc.). Le déplacement est simplement impossible dans ce cas.":
    'You cannot push with equal force (2v2, 3v3) or when the opponent has more marbles (1v2, etc.). The move is simply impossible.',
  "Une bille est éjectée lorsqu'elle est poussée au-delà du bord du plateau hexagonal. Elle tombe dans le creux entourant le plateau et n'y retourne jamais.":
    'A marble is ejected when it is pushed over the edge of the board. It falls into the gutter and never comes back.',
  "Le compteur de billes éjectées est crucial : c'est le seul indicateur direct de progression vers la victoire. Chaque éjection est donc un moment fort de la partie.":
    'The ejection count is crucial: it is the only direct measure of progress toward victory, so every ejection is a big moment.',
  '🎯 Conseil :': '🎯 Tip:', "Ne cherchez pas à éjecter des billes à tout prix — construire une position solide au centre est souvent plus important. Les éjections viendront naturellement d'une bonne domination du plateau.":
    'Don’t chase ejections at any cost — a solid position in the center usually matters more. Ejections come naturally once you dominate the board.',
  // ── aide (en-tete) et classement ──
  "Comment utiliser Abalassembly. Touche une rubrique pour l'ouvrir, ou cherche un mot.": 'How to use Abalassembly. Tap a topic to open it, or search for a word.',
  'Rechercher (ex. importer, nulle, hors ligne…)': 'Search (e.g. import, draw, offline…)', 'Aucune rubrique ne contient ce mot.': 'No topic contains this word.',
  '📤 Exporter tout (Aba-Pro)': '📤 Export all (Aba-Pro)', '📥 Importer': '📥 Import', '📦 Exporter mes données (JSON)': '📦 Export my data (JSON)', '🔄 Synchroniser mes appareils': '🔄 Sync my devices', 'Fusionne ton historique et ta progression avec un autre appareil ou un autre navigateur': 'Merges your history and progress with another device or another browser', '📥 Importer mes données (JSON)': '📥 Import my data (JSON)',
  'Pas encore de classement': 'No leaderboard yet', 'entre joueurs': 'between players',
  // v2.97 : notations historiques
  'Notation historique': 'Historical notation', '(sous chaque coup)': '(under each move)', 'Aucune': 'None',
  "📜 Les notations d'avant Aba-Pro : plateaux et histoire": '📜 Notations from before Aba-Pro: boards and history',
  'Notations historiques': 'Historical notations',
  // v2.98 : la notation de Saab
  'Ou un code de position (KAAH) :': 'Or a position code (KAAH):', 'Charger': 'Load', '💾 Fichier KAAH (.json)': '💾 KAAH file (.json)',
  'Ou une position, dans la notation de Saab (KAAH) :': 'Or a position, in Saab’s notation (KAAH):', '▶ Jouer': '▶ Play',
  '📂 Fichier de partie KAAH / KAAWA (.json)': '📂 KAAH / KAAWA game file (.json)'
};
function _i18nCle(s) { const t = String(s).trim(); return /\s\s|[\t\n\r\u00a0\u202f]/.test(t) ? t.replace(/\s+/g, ' ') : t; }
function _i18nDict(k) { return Object.prototype.hasOwnProperty.call(I18N_EN, k) ? I18N_EN[k] : null; }
// textes avec des nombres ou des noms : [motif, remplacement (texte ou fonction, comme String.replace), mot-cle].
// Le mot-cle (ou l'un des mots-cles) doit figurer dans le texte pour que le motif soit essaye : la page compte des
// milliers de textes qui ne correspondent a aucun motif, et les essayer tous ralentissait le chargement.
const I18N_EN_MOTIFS = [
  [/^À votre tour — Coup (\d+)/, 'Your turn — Move $1', 'À votre tour'],
  [/^Adversaire réfléchit — Coup (\d+)/, 'Opponent thinking — Move $1', 'Adversaire réfléchit'],
  [/^Tour des Noirs ⚫ — Coup (\d+)/, 'Black ⚫ to move — Move $1', 'Tour des Noirs'],
  [/^Tour des Blancs ⚪ — Coup (\d+)/, 'White ⚪ to move — Move $1', 'Tour des Blancs'],
  [/^Cliquez sur vos billes (⚫|⚪) pour les sélectionner$/, 'Tap your $1 marbles to select them', 'Cliquez sur vos billes'],
  [/^Vous \((.+)\)$/, 'You ($1)', 'Vous ('],
  [/^Étape (\d+) \/ (\d+)$/, 'Step $1 / $2', 'Étape '],
  [/^⛔ (.+) — réessaie$/, function (_, r) { const t = _i18nDict(r); return t === null ? _ : '⛔ ' + t + ' — try again'; }, '— réessaie'],
  [/^Joueur (Noir|Blanc) : sélectionnez vos billes$/, function (_, c) { return (c === 'Noir' ? 'Black' : 'White') + ' player: select your marbles'; }, 'sélectionnez vos billes'],
  [/^(⛔|⚠️) (.+)$/, function (_, e, r) { const t = _i18nDict(r); return t === null ? _ : e + ' ' + t; }, ['⛔', '⚠️']],
  [/^(\d+) \/ (\d+) résolus$/, '$1 / $2 solved', ' résolus'],
  [/^Bille éjectée — résolu en (\d+) coups? !$/, function (_, n) { return 'Marble ejected — solved in ' + n + (n === '1' ? ' move!' : ' moves!'); }, 'Bille éjectée'],
  [/^(\d+) demi-coups?$/, function (_, n) { return n + (n === '1' ? ' half-move' : ' half-moves'); }, 'demi-coup'],
  [/^🧮 Tablebase — gain prouvé en (\d+) demi-coups?$/, function (_, n) { return '🧮 Tablebase — proven win in ' + n + (n === '1' ? ' half-move' : ' half-moves'); }, '🧮 Tablebase'],
  [/^🧮 Table 4 contre 2 — gain prouvé en (\d+) demi-coups$/, '🧮 4-against-2 table — proven win in $1 half-moves', '🧮 Table 4'],
  [/^⚠️ Table 4 contre 2 indisponible \(connexion requise\) : (.*)$/, '⚠️ 4-against-2 table unavailable (connection needed): $1', '⚠️ Table 4'],
  [/^(🧩|🛡️) Puzzle (\d+)\/(\d+) · (⭐+) — (Noirs|Blancs) jouent et (éjectent|parent la menace) !$/, function (_, e, i, n, st, c, o) {
    return e + ' Puzzle ' + i + '/' + n + ' · ' + st + ' — ' + (c === 'Noirs' ? 'Black' : 'White') + (o === 'éjectent' ? ' to play and eject!' : ' to play and stop the threat!'); }, ' jouent et '],
  [/^🛡️ Pare la menace d'éjection \((⚫ Noirs|⚪ Blancs)\)$/, function (_, c) { return '🛡️ Stop the ejection threat (' + (c === '⚫ Noirs' ? '⚫ Black' : '⚪ White') + ')'; }, 'Pare la menace'],
  [/^🧩 Trouve le meilleur coup \((⚫ Noirs|⚪ Blancs)\)$/, function (_, c) { return '🧩 Find the best move (' + (c === '⚫ Noirs' ? '⚫ Black' : '⚪ White') + ')'; }, 'Trouve le meilleur coup'],
  [/^✅ Bravo ! Puzzle réussi \((\d+) résolus\) — ⏭ pour le suivant$/, '✅ Well done! Puzzle solved ($1 solved) — ⏭ for the next one', 'Puzzle réussi'],
  [/^💡 Menace adverse : (.+) — ta parade part de (\S+)$/, '💡 Opponent’s threat: $1 — your defense starts from $2', 'Menace adverse'],
  [/^💡 Le coup part de (\S+) \(source : (.+)\)$/, '💡 The move starts from $1 (source: $2)', 'Le coup part de'],
  [/^✅ Solution : (.+) — joue-la !$/, '✅ Solution: $1 — play it!', '✅ Solution :'],
  [/^\+(\d+) XP · (.+)$/, function (_, x, r) { const t = _i18nEN(r); return t === null ? _ : '+' + x + ' XP · ' + t; }, ' XP · '],
  [/^Défi hebdomadaire : (.+)$/, function (_, t) { return 'Weekly challenge: ' + (_i18nDict(t) || t); }, 'Défi hebdomadaire :'],
  [/^Défi du jour : (.+)$/, function (_, t) { return 'Daily challenge: ' + (_i18nDict(t) || t); }, 'Défi du jour :'],
  [/^🎉 Niveau (\d+) atteint !$/, '🎉 Level $1 reached!', 'atteint !'],
  [/^(· )?(NIVEAU|TRAIT|OBJECTIF) :$/, function (_, sep, e) { return (sep || '') + ({ NIVEAU: 'LEVEL:', TRAIT: 'TO MOVE:', OBJECTIF: 'GOAL:' })[e]; }, ['NIVEAU :', 'TRAIT :', 'OBJECTIF :']],
  [/^Case ([A-I]\d), (bille noire|bille blanche|case vide)(, sélectionnée)?$/, function (_, c, b, s) {
    return 'Cell ' + c + ', ' + ({ 'bille noire': 'black marble', 'bille blanche': 'white marble', 'case vide': 'empty' })[b] + (s ? ', selected' : ''); }, 'Case '],
  [/^Ouvrir la vue (\dD) dans une fenêtre séparée$/, 'Open the $1 view in a separate window', 'Ouvrir la vue'],
  [/^Disposition artistique \((visage souriant|forme de montagne|deux losanges face a face)\), pas une variante de tournoi$/, function (_, d) {
    return 'Artistic layout (' + ({ 'visage souriant': 'smiling face', 'forme de montagne': 'mountain shape', 'deux losanges face a face': 'two diamonds face to face' })[d] + '), not a tournament variant'; }, 'Disposition artistique'],
  [/^Variante communautaire reelle, (\d+) parties enregistrees sur AbalOnline(?: -- seulement (\d+) billes par camp)?$/, function (_, n, b) {
    return 'Real community variant, ' + n + ' games recorded on AbalOnline' + (b ? ' — only ' + b + ' marbles per side' : ''); }, 'Variante communautaire'],
  [/^Disposition attestee \(([^)]*)\) -- (.+)$/, function (_, src, suite) {
    src = src.replace(', creee par Joey pour MiGs', ', created by Joey for MiGs');
    let m = /^aucune partie sous ce nom dans le corpus AbalOnline$/.exec(suite);
    if (m) return 'Documented layout (' + src + ') — no game under this name in the AbalOnline corpus';
    m = /^(variante DESEQUILIBREE en faveur des Noirs -- )?verifiee en rejouant integralement une vraie partie (MiGs )?\((\d+) demi-coups\)( depuis cette position jusqu'a sa conclusion)?$/.exec(suite);
    if (m) return 'Documented layout (' + src + ')' + (m[1] ? ' — UNBALANCED variant favouring Black' : '') + ' — checked by replaying a whole real ' + (m[2] ? 'MiGs ' : '') + 'game (' + m[3] + ' plies)' + (m[4] ? ' from this position to its end' : '');
    return _; }, 'Disposition attestee'],
  [/^Complété · \+(\d+) XP$/, 'Completed · +$1 XP', 'Complété'],
  [/^🎁 Défi hebdo réussi ! \+(\d+) XP$/, '🎁 Weekly challenge done! +$1 XP', 'Défi hebdo réussi'],
  [/^🎁 Défi du jour réussi ! \+(\d+) XP$/, '🎁 Daily challenge done! +$1 XP', 'Défi du jour réussi'],
  [/^Coup (\d+) de l’IA$/, 'AI move $1', ' de l’IA'],
  [/^(.+) te défie !$/, '$1 challenges you!', ' te défie !'],
  [/^Prof\. (\d+) : (\d+) premiers coups sur (\d+), (.+) positions, (.+) \(finie à (.+)\)$/, 'Depth $1: $2 first moves out of $3, $4 positions, $5 (done at $6)', 'premiers coups sur'],
  [/^Niveau (\d+) · style (.+)$/, 'Level $1 · style $2', ' · style '],
  [/^🟢 Connecté(?: à (.+))? — coups en temps réel$/, function (_, n) { return '🟢 Connected' + (n ? ' to ' + n : '') + ' — moves in real time'; }, '🟢 Connecté'],
  // v2.57 : statistiques de l'accueil, historique des parties
  [/^⚫ (\d+) parties terminées · 🧩 (\d+) puzzles résolus — sur cet appareil$/, '⚫ $1 games finished · 🧩 $2 puzzles solved — on this device', 'parties terminées'],
  [/^IA (Auto|Agressif|Défensif|Division|Équilibré|KAAH|Humain \(Labo\)|Contre moi \(Labo\)) — (?:Niveau (\d+)|(.+))$/, function (_, s, n, autre) {
    return 'AI ' + ({ Auto: 'Auto', Agressif: 'Aggressive', 'Défensif': 'Defensive', Division: 'Divide', 'Équilibré': 'Balanced', KAAH: 'KAAH', 'Humain (Labo)': 'Human-like (Lab)', 'Contre moi (Labo)': 'Against me (Lab)' })[s] + ' — ' + (n ? 'Level ' + n : autre); }, 'IA '],
  [/^Local \(même écran\)$/, 'Local (same screen)', 'Local (même écran)'],
  [/^✅ Partie importée : (\d+) coups?$/, function (_, n) { return '✅ Game imported: ' + n + (n === '1' ? ' move' : ' moves'); }, 'Partie importée']
];
// traduction d'un texte francais, ou null s'il est inconnu (espaces de debut et de fin conserves)
function _i18nEN(fr) {
  const k = _i18nCle(fr); if (!k) return null;
  let en = _i18nDict(k);
  if (en === null) {
    for (let i = 0; i < I18N_EN_MOTIFS.length; i++) {
      const m = I18N_EN_MOTIFS[i], j = m[2];
      if (typeof j === 'string' ? k.indexOf(j) < 0 : !j.some(function (x) { return k.indexOf(x) >= 0; })) continue;   // mot-cle absent : motif inutile
      if (!m[0].test(k)) continue;
      const r = k.replace(m[0], m[1]); if (r !== k) { en = r; break; }
    }
  }
  if (en === null) return null;
  const s = String(fr); return s.match(/^\s*/)[0] + en + s.match(/\s*$/)[0];
}
// zones jamais traduites : leur texte sert de donnee (saisie, valeur d'option) ou l'auteur l'a demande
function _i18nExcluSeul(el) {   // l'element lui-meme
  const t = el.tagName;
  return t === 'SCRIPT' || t === 'STYLE' || t === 'TEXTAREA' || (t === 'OPTION' && !el.hasAttribute('value')) || el.getAttribute('translate') === 'no';
}
function _i18nExclu(el) {       // l'element ou l'un de ses ancetres
  if (!el || el.nodeType !== 1) return false;
  if (_i18nExcluSeul(el)) return true;
  return !!(el.closest && el.closest('[translate="no"]'));
}
function _i18nNoeud(n, versEN) {
  if (versEN) {
    if (n.__i18nFr !== undefined && n.nodeValue === n.__i18nEn) return;          // deja traduit
    const en = _i18nEN(n.nodeValue); if (en === null) { n.__i18nFr = undefined; return; }
    n.__i18nFr = n.nodeValue; n.__i18nEn = en; n.nodeValue = en;
  } else if (n.__i18nFr !== undefined) {
    if (n.nodeValue === n.__i18nEn) n.nodeValue = n.__i18nFr;                    // sinon le site l'a reecrit entre-temps
    n.__i18nFr = undefined; n.__i18nEn = undefined;
  }
}
const I18N_ATTRS = ['placeholder', 'title', 'aria-label'];
function _i18nAttrs(el, versEN) {
  if (!el.getAttribute) return;
  for (let i = 0; i < I18N_ATTRS.length; i++) {
    const a = I18N_ATTRS[i], v = el.getAttribute(a); if (!v) continue;
    const fr = '__i18nFr_' + a, en = '__i18nEn_' + a;
    if (versEN) {
      if (el[fr] !== undefined && v === el[en]) continue;
      const t = _i18nEN(v); if (t === null) { el[fr] = undefined; continue; }
      el[fr] = v; el[en] = t; el.setAttribute(a, t);
    } else if (el[fr] !== undefined) {
      if (v === el[en]) el.setAttribute(a, el[fr]);
      el[fr] = undefined; el[en] = undefined;
    }
  }
}
const _I18N_FILTRE = { acceptNode: function (n) { return n.nodeType === 1 && _i18nExcluSeul(n) ? 2 : 1; } };   // 2 = sauter tout le sous-arbre
function _i18nSousArbre(racine, versEN, lot) {
  if (!racine) return;
  if (lot) racine.__i18nLot = lot;
  if (racine.nodeType === 3) {
    const v = racine.nodeValue; if (!v || (versEN && !v.trim())) return;   // blancs entre balises : la moitie des noeuds de la page
    if (!_i18nExclu(racine.parentNode)) _i18nNoeud(racine, versEN); return;
  }
  if (racine.nodeType !== 1) return;
  if (_i18nExclu(racine)) return;
  _i18nAttrs(racine, versEN);
  if (!racine.firstChild || typeof document.createTreeWalker !== 'function') return;   // element encore vide (lecture de la page en cours)
  const w = document.createTreeWalker(racine, 1 | 4, _I18N_FILTRE); let n;   // elements et textes
  while ((n = w.nextNode())) { if (lot) n.__i18nLot = lot; if (n.nodeType === 3) _i18nNoeud(n, versEN); else _i18nAttrs(n, versEN); }
}
let _i18nObs = null, _i18nLot = 0;
function _i18nTraiter(muts) {
  // Pendant la lecture de la page, chaque element arrive dans son propre changement ; quand l'observateur les
  // recoit, l'element contient deja tous ses descendants, eux-memes annonces juste apres. Un noeud deja parcouru
  // dans ce lot (avec un ancetre) n'est pas reparcouru : sans cela, chaque niveau de la page etait relu.
  const lot = ++_i18nLot;
  for (let i = 0; i < muts.length; i++) {
    const m = muts[i];
    if (m.type === 'characterData') { if (!_i18nExclu(m.target.parentNode)) _i18nNoeud(m.target, true); }
    else if (m.type === 'attributes') { if (!_i18nExclu(m.target)) _i18nAttrs(m.target, true); }
    else if (m.addedNodes.length && !_i18nExclu(m.target)) {
      for (let j = 0; j < m.addedNodes.length; j++) { const x = m.addedNodes[j]; if (x.__i18nLot !== lot) _i18nSousArbre(x, true, lot); }
    }
  }
}
function _i18nObserver(actif) {
  // les changements deja survenus mais pas encore remis a l'observateur seraient perdus en le debranchant
  if (_i18nObs) { _i18nTraiter(_i18nObs.takeRecords()); _i18nObs.disconnect(); _i18nObs = null; }
  if (!actif || typeof MutationObserver === 'undefined' || !document.body) return;
  _i18nObs = new MutationObserver(_i18nTraiter);
  _i18nObs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: I18N_ATTRS });
}
const I18N_TITRE = { FR: null, EN: 'Abalassembly — play Abalone: AI, puzzles, live games, real game library' };
let _i18nDejaEN = false;    // tant que la page n'a jamais ete en anglais, il n'y a rien a remettre en francais
let _i18nPageEN = false;    // toute la page est deja en anglais, et l'observateur la suit depuis
function _i18nAppliquerTout(lang) {
  const en = (lang === 'EN');
  try { document.documentElement.lang = en ? 'en' : 'fr'; } catch (e) {}
  if (I18N_TITRE.FR === null) I18N_TITRE.FR = document.title;
  try { if (I18N_TITRE.FR) document.title = en ? I18N_TITRE.EN : I18N_TITRE.FR; } catch (e) {}
  if (en) _i18nDejaEN = true;
  // deja en anglais et suivie par l'observateur : la reparcourir entierement ne changerait rien (et coute cher)
  if (document.body && _i18nDejaEN && !(en && _i18nPageEN)) _i18nSousArbre(document.body, en);
  _i18nPageEN = en && !!document.body && typeof MutationObserver !== 'undefined';
  _i18nObserver(en);
}
// pour les textes construits par le code : le francais, ou l'anglais si le site est en anglais
function _tr(fr, en) { return currentLang() === 'EN' ? en : fr; }
// le texte francais d'origine d'un element, meme si ses morceaux ont deja ete traduits
function _i18nTexteOrigine(el) {
  let t = '';
  for (let i = 0; i < el.childNodes.length; i++) { const n = el.childNodes[i]; t += (n.nodeType === 3 && n.__i18nFr !== undefined) ? n.__i18nFr : n.textContent; }
  return t;
}
// En anglais : ce qui est deja lu est traduit tout de suite ; l'observateur traduira la suite au fil de la lecture.
if (currentLang() === 'EN') { try { _i18nAppliquerTout('EN'); } catch (e) {} }
</script>
