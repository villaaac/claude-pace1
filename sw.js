const CACHE='pace-v1';
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/','/index.html','/manifest.json'])));
  self.skipWaiting();
});
self.addEventListener('activate',e=>{ self.clients.claim(); });
self.addEventListener('fetch',e=>{
  // Never cache API calls — always hit the network for the live coach.
  if(e.request.url.includes('/api/')){ return; }
  e.respondWith(
    caches.match(e.request).then(r=>r||fetch(e.request).catch(()=>caches.match('/index.html')))
  );
});
