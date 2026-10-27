// Service worker: guarda a app no telemovel para abrir sem internet.
// Estratégia: responde logo com a cópia guardada e atualiza-a em segundo plano.
// Uma nova versão só entra quando o utilizador aceita (mensagem SKIP_WAITING vinda da app).
const CACHE = 'caderno-obra-v3';
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
  evento.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHEIROS)));
});

self.addEventListener('message', (evento) => {
  if (evento.data === 'SKIP_WAITING') self.skipWaiting();
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
  if (new URL(pedido.url).origin !== self.location.origin) return;

  const navegacao = pedido.mode === 'navigate';
  evento.respondWith(
    caches.match(navegacao ? './index.html' : pedido, { ignoreSearch: true }).then((guardado) => {
      const rede = fetch(pedido).then((resposta) => {
        // só se guarda respostas completas e bem-sucedidas (nem 404, nem 206)
        if (resposta.status === 200 && resposta.type === 'basic') {
          caches.open(CACHE).then((c) => c.put(pedido, resposta.clone())).catch(() => {});
        }
        return resposta;
      });

      if (guardado) {
        rede.catch(() => {});
        return guardado;
      }
      // sem cópia: navegações caem no index.html; recursos em falta ficam em falta
      return rede.catch(() => (navegacao ? caches.match('./index.html') : Response.error()));
    })
  );
});
