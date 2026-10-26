const VERSAO = 'lacmes-v1.2.1';
const BASE = self.registration.scope;
const ESSENCIAIS = [
  '', 'index.html', 'verificar.html', 'manifest.webmanifest', 'css/app.css',
  'js/app.js', 'js/config.js', 'js/data.js', 'js/util.js', 'js/store.js', 'js/ui.js', 'js/dominio.js', 'js/editor.js', 'js/notificar.js', 'js/cert.js', 'js/seed.js',
  'js/pages/inicio.js', 'js/pages/forum.js', 'js/pages/projetos.js', 'js/pages/oportunidades.js', 'js/pages/agenda.js', 'js/pages/aulas.js',
  'js/pages/certificados.js', 'js/pages/planejamento.js', 'js/pages/documentos.js', 'js/pages/arquivosliga.js', 'js/eventos.js', 'js/arquivos.js', 'js/pages/gestao.js', 'js/pages/usuarios.js', 'js/pages/perfil.js',
  'assets/logo-lacmes.png', 'assets/icons/icon-192.png', 'assets/icons/icon-512.png', 'assets/icons/favicon-32.png'
].map(p => new URL(p, BASE).href);

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(ESSENCIAIS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (/googleapis\.com|firebaseio|gstatic\.com\/firebasejs|identitytoolkit|securetoken/.test(url.href) && !url.href.includes('fonts.')) return;
  const mesmoSite = url.origin === location.origin;
  const estatico = /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/.test(url.host) || (mesmoSite && /\/assets\//.test(url.pathname));
  if (estatico) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(resp => { const copia = resp.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); return resp; })));
    return;
  }
  if (mesmoSite) {
    e.respondWith(fetch(req).then(resp => { if (resp.ok) { const copia = resp.clone(); caches.open(VERSAO).then(c => c.put(req, copia)); } return resp; })
      .catch(() => caches.match(req).then(r => r || caches.match(new URL('index.html', BASE).href))));
  }
});

self.addEventListener('push', (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch { p = { data: { titulo: e.data && e.data.text() } }; }
  const d = p.data || {}, n = p.notification || {};
  const titulo = d.titulo || n.title || 'LACMES';
  const opts = {
    body: d.corpo || n.body || '',
    icon: new URL('assets/icons/icon-192.png', BASE).href,
    badge: new URL('assets/icons/icon-192.png', BASE).href,
    tag: d.tag || undefined, renotify: !!d.tag,
    data: { url: d.url || '#/inicio' }
  };
  e.waitUntil(self.registration.showNotification(titulo, opts));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const destino = new URL('index.html' + (e.notification.data && e.notification.data.url ? e.notification.data.url.replace(/^#?/, '#') : ''), BASE).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(lista => {
    for (const c of lista) { if (c.url.startsWith(BASE)) { c.navigate(destino); return c.focus(); } }
    return self.clients.openWindow(destino);
  }));
});
