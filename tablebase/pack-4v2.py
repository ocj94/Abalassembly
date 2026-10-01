"""pack-4v2.py -- met en paquets les morceaux ecrits par "./tb42 shards" (dossier shards/)
pour le jeu : gzip niveau 9 SANS horodatage (sortie identique d'une fois a l'autre),
empreinte SHA-256 de chaque morceau DECOMPRESSE dans manifest.json -- le jeu la
verifie avant de se servir d'un morceau. Ecrit le tout dans tablebase/4v2/."""
import gzip, hashlib, json, os
SRC = os.path.join(os.path.dirname(__file__), 'shards')
DST = os.path.join(os.path.dirname(__file__), '4v2')
os.makedirs(DST, exist_ok=True)
noms = sorted(f for f in os.listdir(SRC) if f.startswith('s') and f.endswith('.bin'))
sha = []
for f in noms:
    brut = open(os.path.join(SRC, f), 'rb').read()
    sha.append(hashlib.sha256(brut).hexdigest())
    open(os.path.join(DST, f + '.gz'), 'wb').write(gzip.compress(brut, compresslevel=9, mtime=0))
orb = open(os.path.join(SRC, 'orbites.bin'), 'rb').read()
open(os.path.join(DST, 'orbites.bin.gz'), 'wb').write(gzip.compress(orb, compresslevel=9, mtime=0))
man = {"format": "abalassembly-4v2-v1", "K4": 44040, "NP": 1830, "orbitesParMorceau": 64, "morceaux": len(noms),
       "octet": "profondeur 1..98 si gain/perte (impair = gain du camp au trait, pair = perte), 0 si nulle",
       "orbites": hashlib.sha256(orb).hexdigest(), "sha256": sha}
json.dump(man, open(os.path.join(DST, 'manifest.json'), 'w'), indent=0)
print(len(noms), 'morceaux ecrits dans', DST)
