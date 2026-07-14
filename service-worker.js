// Service worker « kill-switch » — remplace l'ancien SW cache-first.
// Purge tous les caches, se désenregistre, puis recharge les onglets ouverts :
// les visiteurs coincés sur une vieille version en cache récupèrent le site à jour.
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.registration.unregister(); })
      .then(function(){ return self.clients.matchAll({ type:'window' }); })
      .then(function(cs){ cs.forEach(function(c){ try{ c.navigate(c.url); }catch(err){} }); })
  );
});
