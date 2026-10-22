// Service worker: guarda a app no telemovel para abrir sem internet.
const CACHE = 'caderno-obra-v2';
const FICHEIROS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './parser.js',
  './format.js',
  './store.js',
  './icons.js',
  './manifest.webmanifest',
  './icone.svg',
  './icone-192.png',
  './icone-512.png'
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHEIROS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const pedido = evento.request;
  if (pedido.method !== 'GET') return;
  evento.respondWith(
    caches.match(pedido).then(
      (guardado) =>
        guardado ||
        fetch(pedido)
          .then((resposta) => {
            const copia = resposta.clone();
            caches.open(CACHE).then((c) => c.put(pedido, copia)).catch(() => {});
            return resposta;
          })
          .catch(() => caches.match('./index.html'))
    )
  );
});
