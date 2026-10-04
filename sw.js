/* sw.js -- service worker d'Abalassembly (vrai fichier, enregistre par index.html).

   Avant : le service worker etait cree a partir d'un bloc de texte (adresse
   blob:), ce que les navigateurs REFUSENT -- l'enregistrement echouait sans
   bruit, si bien qu'aucun cache hors-ligne n'existait reellement et que le
   site ne pouvait pas recevoir de fichiers partages. Constate en octobre 2026
   en cherchant pourquoi Abalassembly n'apparaissait pas dans le menu de partage.

   1. Reseau d'abord, cache en repli (meme strategie qu'avant), mais seulement
      pour les requetes GET du site lui-meme : les flux en direct de PlayStrategy
      et les polices, d'un autre domaine, ne sont jamais interceptes (mettre un
      flux sans fin en cache le bloquerait). Seules les reponses valides sont
      gardees.
   2. Cible de partage (manifest.json, share_target) : un fichier partage vers
      Abalassembly arrive ici en POST sur ./partage ; son contenu est mis de
      cote, puis la page s'ouvre sur ./?partage=1 et le reprend pour remplir
      la fenetre « Importer un historique ». */
const CACHE = 'abalassembly-v3';
const PARTAGE = 'abalassembly-partage';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.add('./')).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE && k !== PARTAGE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.method === 'POST' && url.pathname.endsWith('/partage')) { e.respondWith(recevoirPartage(req)); return; }
  if (req.method !== 'GET') return;
  e.respondWith(
    fetch(req).then(resp => {
      if (resp && resp.ok) { const copie = resp.clone(); caches.open(CACHE).then(c => c.put(req, copie)); }
      return resp;
    }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('./') : undefined)))
  );
});

async function recevoirPartage(req) {
  const recus = [];
  try {
    const fd = await req.formData();
    for (const f of fd.getAll('fichiers')) {
      if (f && typeof f.text === 'function') recus.push({ nom: f.name || 'fichier', texte: await f.text() });
    }
    const t = fd.get('text');
    if (t && String(t).trim()) recus.push({ nom: 'texte partagé', texte: String(t) });
  } catch (e) { /* contenu illisible : la page le signalera */ }
  const c = await caches.open(PARTAGE);
  await c.put('partage-en-attente', new Response(JSON.stringify(recus), { headers: { 'Content-Type': 'application/json' } }));
  // adresse complete, calculee ici plutot que laissee a la resolution du navigateur
  return Response.redirect(new URL('./?partage=1', self.location).href, 303);
}
