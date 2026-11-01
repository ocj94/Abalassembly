"""Ecrit le carnet Colab tools/gpu/Abalassembly_GPU.ipynb (python3 tools/gpu/carnet.py).
Le carnet est genere ici pour rester relisible : chaque cellule est une chaine ci-dessous."""
import json, os

M = 'markdown'; C = 'code'
cellules = [
(M, """# Abalassembly sur carte graphique : le moteur contre lui-même

Ce carnet fait jouer le moteur d'Abalassembly contre lui-même, **des milliers de fois sur chacun des 188 départs du site**, sur une carte graphique (GPU) de Google Colab. Il répond à une question précise : **depuis chaque départ, qui gagne le plus souvent, les Noirs (qui commencent) ou les Blancs ?** Entre humains, dans les 4 580 parties du site, les Noirs gagnent 53 %.

Le moteur est celui du site, réécrit pour la carte graphique (`tools/gpu/abalone_gpu.cu`) : mêmes règles, même évaluation, même recherche. Un test le compare au moteur du site, coup par coup, sur des milliers de positions (`tools/gpu/verifier.js`).

**Mode d'emploi**
1. *Exécution → Modifier le type d'exécution →* choisir un **GPU** (T4 suffit), puis *Enregistrer*.
2. *Exécution → Tout exécuter*. Colab demande l'accès à Google Drive : les résultats y sont enregistrés au fur et à mesure (dossier **Abalassembly-GPU**), pour qu'une déconnexion ne fasse rien perdre.
3. Si la session s'arrête (Colab coupe au bout de quelques heures, ou après une longue inactivité), relancer *Tout exécuter* : la campagne reprend là où elle s'était arrêtée.
4. À la fin, le carnet télécharge un fichier `campagne-….json`. C'est lui qu'il faut envoyer à Claude, qui l'intégrera au site.
"""),
(C, """#@title 1. La carte graphique
import subprocess, sys
try:
    LISTE_GPU = subprocess.run(['nvidia-smi', '-L'], capture_output=True, text=True).stdout.strip()
except FileNotFoundError:
    LISTE_GPU = ''
if not LISTE_GPU:
    raise SystemExit("Pas de carte graphique : Exécution > Modifier le type d'exécution > GPU (T4), Enregistrer, puis Exécution > Tout exécuter.")
print(LISTE_GPU)
try:
    import cupy as cp
except ImportError:
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-q', 'cupy-cuda12x'], check=True)
    import cupy as cp
PROPS = cp.cuda.runtime.getDeviceProperties(0)
NOM_GPU = PROPS['name'].decode() if isinstance(PROPS['name'], bytes) else str(PROPS['name'])
NB_SM = PROPS['multiProcessorCount']
print('GPU :', NOM_GPU, '-', NB_SM, 'multiprocesseurs')
"""),
(M, """## Réglages

- **PROFONDEUR** : combien de demi-coups le moteur calcule avant de jouer. 2 est le réglage des duels du Labo du site ; 3 joue mieux mais coûte environ 20 fois plus cher.
- **PARTIES_PAR_DEPART** : 2 400 parties donnent la part de victoires des Noirs à ±2 % près.
- **MARGE** : 0 = le moteur joue son meilleur coup (au hasard entre les coups ex aequo). Une marge de 20 lui fait choisir au hasard parmi les coups à moins de 20 points du meilleur : plus de variété, mais un jeu un peu moins fort.
- **OUVERTURE** : nombre de demi-coups joués au hasard au début (0 : le moteur joue dès le premier coup).
- **DEMI_COUPS_MAX** : au-delà, la partie est arbitrée comme dans le Labo (avance en billes, sinon évaluation, sinon nulle).
- **TROIS_BILLES_D_AVANCE_GAGNENT** : comme dans le Labo, 3 billes d'avance gagnent la partie (dans les vraies parties du site, le camp qui mène de 3 billes gagne 94 % du temps).
- **PENALITES_DE_REPETITION** : comme dans le Labo, le moteur évite de rejouer une position déjà vue ou de faire des allers-retours.
- **DEPARTS** : `tous`, ou une liste de clés séparées par des virgules (par exemple `standard,belgian,sr_01`).
"""),
(C, """#@title 2. Réglages
PROFONDEUR = 2  #@param [1, 2, 3] {type:"raw"}
PARTIES_PAR_DEPART = 2400  #@param {type:"integer"}
MARGE = 0  #@param {type:"integer"}
OUVERTURE = 0  #@param {type:"integer"}
DEMI_COUPS_MAX = 200  #@param {type:"integer"}
TROIS_BILLES_D_AVANCE_GAGNENT = True  #@param {type:"boolean"}
PENALITES_DE_REPETITION = True  #@param {type:"boolean"}
DEPARTS = "tous"  #@param {type:"string"}
SAUVER_SUR_DRIVE = True  #@param {type:"boolean"}
GRAINE = 20261101  #@param {type:"integer"}
"""),
(C, """#@title 3. Le moteur et les départs, depuis le dépôt Abalassembly
import json, urllib.request
DEPOT = 'ocj94/Abalassembly'
SHA = json.load(urllib.request.urlopen(f'https://api.github.com/repos/{DEPOT}/commits/main'))['sha']
brut = lambda f: urllib.request.urlopen(f'https://raw.githubusercontent.com/{DEPOT}/{SHA}/tools/gpu/{f}').read().decode('utf-8')
SOURCE = brut('abalone_gpu.cu')
DEPARTS_TSV = [l.split('\\t') for l in brut('departs.tsv').splitlines() if l and not l.startswith('#')]
CLES = [d[0] for d in DEPARTS_TSV]
NOMS = {d[0]: d[1] for d in DEPARTS_TSV}; CATEGORIES = {d[0]: d[2] for d in DEPARTS_TSV}
CHOIX = CLES if DEPARTS.strip().lower() == 'tous' else [k.strip() for k in DEPARTS.split(',') if k.strip()]
inconnus = [k for k in CHOIX if k not in CLES]
assert not inconnus, 'départs inconnus : ' + ', '.join(inconnus)
print('version du dépôt :', SHA[:7], '-', len(CLES), 'départs, dont', len(CHOIX), 'choisis')
"""),
(C, """#@title 4. Compilation pour la carte graphique
import numpy as np, time
try:
    cp.cuda.runtime.deviceSetLimit(0, 32 * 1024)   # pile par fil (cudaLimitStackSize)
except Exception as e:
    print('pile par défaut :', e)
MODULE = cp.RawModule(code=SOURCE, options=('-std=c++17',))
NOYAU = MODULE.get_function('parties')
print('compilé :', getattr(NOYAU, 'num_regs', '?'), 'registres par fil,', getattr(NOYAU, 'local_size_bytes', '?'), 'octets de mémoire locale par fil')
D_DEPARTS = cp.asarray(np.array([[int(ch) for ch in d[3]] for d in DEPARTS_TSV], dtype=np.uint8))
FILS = 64; BLOCS = NB_SM * 4

REGLAGES = (PROFONDEUR, MARGE, OUVERTURE, DEMI_COUPS_MAX, int(TROIS_BILLES_D_AVANCE_GAGNENT), int(PENALITES_DE_REPETITION), GRAINE)

def lancer(tdep, tnum, reglages=None):
    # tdep : indice du départ dans departs.tsv, tnum : numéro de la partie (la graine en dépend) ; 8 entiers par partie
    prof, marge, ouv, maxp, adj3, penal, graine = reglages or REGLAGES
    n = len(tdep)
    cpt = cp.zeros(1, dtype=cp.int32); out = cp.zeros(8 * n, dtype=cp.int32)
    NOYAU((BLOCS,), (FILS,), (D_DEPARTS, np.int32(n), cp.asarray(np.asarray(tdep, dtype=np.int32)), cp.asarray(np.asarray(tnum, dtype=np.int32)),
          np.int32(prof), np.int32(marge), np.int32(ouv), np.int32(maxp), np.int32(adj3), np.int32(penal), np.uint64(graine), cpt, out))
    cp.cuda.Device(0).synchronize()
    return cp.asnumpy(out).reshape(n, 8)

# contrôle : des parties de référence, jouées sur processeur par la même source (tools/gpu/reference.json) ;
# la carte graphique doit donner exactement les mêmes parties, coup pour coup
REF = json.loads(brut('reference.json'))
nref = 0
for B in REF['blocs']:
    Rg = lancer([CLES.index(k) for k, _ in B['taches']], [n for _, n in B['taches']], tuple(B['reglages']))
    ecarts = int((Rg != np.array(B['resultats'])).any(axis=1).sum())
    assert ecarts == 0, f'{ecarts} parties de référence diffèrent : le moteur de la carte graphique ne joue pas comme prévu'
    nref += len(B['taches'])
print(f'contrôle : les {nref} parties de référence sont identiques à celles jouées sur processeur')
"""),
(C, """#@title 5. Test de vitesse (parties de test, hors campagne)
iS = CLES.index('standard'); N = NB_SM * 256
t = time.time(); R = lancer([iS] * N, list(range(10**9, 10**9 + N))); dt = time.time() - t
VITESSE = N / dt
total = len(CHOIX) * PARTIES_PAR_DEPART
print(f'{N} parties de la Standard en {dt:.1f} s : {VITESSE:.0f} parties par seconde')
print(f'campagne : {total} parties, environ {total / VITESSE / 60:.0f} minutes (la Standard est une partie plutôt longue)')
print('débordements de liste :', int(R[:, 6].sum()), '(doit être 0)')
"""),
(C, """#@title 6. La campagne (elle reprend là où elle s'était arrêtée)
import os, datetime
NOM = f'campagne-p{PROFONDEUR}-m{MARGE}-o{OUVERTURE}-d{DEMI_COUPS_MAX}-a{int(TROIS_BILLES_D_AVANCE_GAGNENT)}-r{int(PENALITES_DE_REPETITION)}-g{GRAINE}'
if SAUVER_SUR_DRIVE:
    from google.colab import drive
    drive.mount('/content/drive')
    DOSSIER = '/content/drive/MyDrive/Abalassembly-GPU'
else:
    DOSSIER = '/content/Abalassembly-GPU'
os.makedirs(DOSSIER, exist_ok=True)
CHEMIN = f'{DOSSIER}/{NOM}.npz'
PARTIES = {k: v for k, v in np.load(CHEMIN).items()} if os.path.exists(CHEMIN) else {}
print('déjà jouées :', sum(len(v) for v in PARTIES.values()), 'parties')

def wilson(k, n, z=1.96):
    if not n: return (None, None)
    p = k / n; d = 1 + z * z / n; c = (p + z * z / (2 * n)) / d; e = z * ((p * (1 - p) / n + z * z / (4 * n * n)) ** 0.5) / d
    return (round(100 * (c - e), 1), round(100 * (c + e), 1))

def resume():
    L = []
    for k in CHOIX:
        R = PARTIES.get(k)
        if R is None or not len(R): continue
        n = len(R); vN = int((R[:, 0] == 1).sum()); vB = int((R[:, 0] == 2).sum()); dec = vN + vB
        ej = R[R[:, 3] > 0, 3]
        L.append({'cle': k, 'nom': NOMS[k], 'categorie': CATEGORIES[k], 'parties': n, 'noirs': vN, 'blancs': vB, 'nulles': n - dec,
                  'part_noirs': round(100 * vN / dec, 1) if dec else None, 'ic95': wilson(vN, dec),
                  'pourquoi': {m: int((R[:, 1] == i).sum()) for i, m in enumerate(['', 'six', 'trois', 'billes', 'eval', 'nulle', 'sans_coup']) if i},
                  'demi_coups_moyen': round(float(R[:, 2].mean()), 1), 'demi_coups_median': float(np.median(R[:, 2])),
                  'premiere_ejection_moyenne': round(float(ej.mean()), 1) if len(ej) else None, 'sans_ejection': int(n - len(ej)),
                  'ejections_moyennes': round(float((R[:, 4] + R[:, 5]).mean()), 2),
                  'distinctes': int(len(np.unique(R[:, 7]))), 'debordements': int(R[:, 6].sum())})
    return L

def sauver():
    np.savez(CHEMIN + '.tmp.npz', **PARTIES); os.replace(CHEMIN + '.tmp.npz', CHEMIN)
    with open(f'{DOSSIER}/{NOM}.json', 'w', encoding='utf-8') as f:
        json.dump({'outil': 'tools/gpu/abalone_gpu.cu', 'depot': SHA, 'gpu': NOM_GPU, 'date': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'),
                   'reglages': {'profondeur': PROFONDEUR, 'parties_par_depart': PARTIES_PAR_DEPART, 'marge': MARGE, 'ouverture': OUVERTURE,
                                'demi_coups_max': DEMI_COUPS_MAX, 'trois_d_avance': TROIS_BILLES_D_AVANCE_GAGNENT,
                                'penalites': PENALITES_DE_REPETITION, 'graine': GRAINE},
                   'departs': resume()}, f, ensure_ascii=False, indent=1)

# les parties qui manquent, par paquets d'environ 2 minutes
RI = np.array([CLES.index(k) for k in CHOIX for n in range(len(PARTIES.get(k, [])), PARTIES_PAR_DEPART)], dtype=np.int32)
RN = np.array([n for k in CHOIX for n in range(len(PARTIES.get(k, [])), PARTIES_PAR_DEPART)], dtype=np.int32)
paquet = max(NB_SM * 256, int(VITESSE * 120))
t0 = time.time(); faites = 0
for i in range(0, len(RI), paquet):
    li, ln = RI[i:i + paquet], RN[i:i + paquet]
    R = lancer(li, ln)
    for gi in np.unique(li):
        k = CLES[gi]; sel = li == gi
        PARTIES[k] = np.concatenate([PARTIES[k], R[sel]]) if k in PARTIES else R[sel]
    sauver(); faites += len(li)
    v = faites / (time.time() - t0)
    print(f'{faites}/{len(RI)} parties, {v:.0f} par seconde, encore environ {(len(RI) - faites) / v / 60:.0f} minutes', flush=True)
sauver()
print('campagne terminée :', sum(len(v) for v in PARTIES.values()), 'parties')
"""),
(C, """#@title 7. Les résultats
import pandas as pd
df = pd.DataFrame(resume())
df['ecart_a_50'] = (df['part_noirs'] - 50).abs()
cols = ['nom', 'categorie', 'parties', 'part_noirs', 'ic95', 'nulles', 'demi_coups_moyen', 'premiere_ejection_moyenne', 'distinctes']
print('Part des victoires des Noirs, parmi les parties gagnées (50 = équilibré).')
print('Les départs les plus équilibrés :'); display(df.sort_values('ecart_a_50')[cols].head(25))
print('Les départs connus :'); display(df[df.categorie == 'connue'].sort_values('part_noirs')[cols])
from google.colab import files
files.download(f'{DOSSIER}/{NOM}.json')
"""),
(M, """## Et ensuite

Envoie le fichier **`campagne-….json`** à Claude (il est aussi dans Google Drive, dossier *Abalassembly-GPU*). Il contient, pour chaque départ, le nombre de parties, la part de victoires des Noirs avec sa marge d'erreur, les nulles, la longueur des parties et le moment de la première éjection.

Ce sont des parties du moteur contre lui-même, pas des parties humaines : elles classent les départs entre eux (lesquels donnent moins d'avance au premier joueur), elles ne prédisent pas exactement les parties entre humains.
"""),
]

def cellule(t, s):
    lignes = s.strip('\n').split('\n')
    src = [l + '\n' for l in lignes[:-1]] + [lignes[-1]]
    if t == M: return {'cell_type': 'markdown', 'metadata': {}, 'source': src}
    return {'cell_type': 'code', 'execution_count': None, 'metadata': {'cellView': 'form'}, 'outputs': [], 'source': src}

nb = {'nbformat': 4, 'nbformat_minor': 0,
      'metadata': {'colab': {'provenance': [], 'gpuType': 'T4', 'name': 'Abalassembly_GPU.ipynb'}, 'accelerator': 'GPU',
                   'kernelspec': {'name': 'python3', 'display_name': 'Python 3'}, 'language_info': {'name': 'python'}},
      'cells': [cellule(t, s) for t, s in cellules]}
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Abalassembly_GPU.ipynb')
with open(p, 'w', encoding='utf-8') as f: json.dump(nb, f, ensure_ascii=False, indent=1)
print('ecrit', p)
