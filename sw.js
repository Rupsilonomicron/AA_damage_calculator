// AA ダメージ計算ツール Service Worker
// 方針：本体(index.html)はネットワーク優先＝オンラインなら常に最新版。
//       オフライン時のみキャッシュにフォールバックする。
var CACHE = 'aa-calc-v2';  // アイコン等の静的アセット変更時はこの番号を上げる
var PRECACHE = [
  './',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function(c) { return c.addAll(PRECACHE); })
      .then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; })
        .map(function(k) { return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== location.origin) return;

  // ページ本体：ネットワーク優先（成功したらキャッシュを更新）→ オフライン時はキャッシュ
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    e.respondWith(
      fetch(req).then(function(res) {
        var copy = res.clone();
        caches.open(CACHE).then(function(c) { c.put('./', copy); });
        return res;
      }).catch(function() {
        return caches.match('./');
      })
    );
    return;
  }

  // その他（manifest・アイコン）：キャッシュ優先
  e.respondWith(
    caches.match(req).then(function(hit) {
      return hit || fetch(req).then(function(res) {
        var copy = res.clone();
        caches.open(CACHE).then(function(c) { c.put(req, copy); });
        return res;
      });
    })
  );
});
