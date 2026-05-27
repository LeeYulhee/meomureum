// 머무름 PWA — Service Worker
// Cache-first 전략으로 오프라인에서도 작동하도록 정적 자산을 캐싱.

const CACHE_NAME = 'meomureum-v3';

// scope-relative paths (works both at root and in subdirectory deployments)
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Install: 캐시에 자산 미리 저장
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: 이전 버전 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: 캐시 우선, 실패 시 네트워크
self.addEventListener('fetch', event => {
  // GET 요청만 처리
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 동일 출처(앱 자체 자산)는 cache-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          // 정상 응답이면 캐시에 추가
          if (response && response.status === 200 && response.type === 'basic') {
            const respClone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
          }
          return response;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // 외부 자원(예: Pretendard 폰트 CDN)은 stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(cached => {
      const networkFetch = fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const respClone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
        }
        return response;
      }).catch(() => cached);
      return cached || networkFetch;
    })
  );
});
