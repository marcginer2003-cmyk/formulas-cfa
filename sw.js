// Service worker: la app funciona sin conexión y se actualiza sola cuando hay internet
var CACHE = 'cfa-puzzle-d890403390';
var ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/apple-touch-icon.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function fromNetwork(req, cache) {
  return fetch(req).then(function (res) {
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  var isPage = req.mode === 'navigate' || req.destination === 'document';
  e.respondWith(caches.open(CACHE).then(function (cache) {
    return cache.match(req, { ignoreSearch: true }).then(function (hit) {
      if (isPage) {
        // La página: primero la red (versión más nueva); si no hay conexión en 3 s, la copia guardada
        var net = fromNetwork(req, cache);
        var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(hit); }, 3000); });
        return Promise.race([net.catch(function () { return hit; }), hit ? timeout : net]).then(function (r) { return r || hit || net; });
      }
      // El resto: copia guardada al instante y se refresca en segundo plano
      var refresh = fromNetwork(req, cache).catch(function () { return hit; });
      return hit || refresh;
    });
  }));
});
