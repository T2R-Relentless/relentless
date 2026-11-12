/* Relentless Service Worker
   Phase 2 (F-03, F-10, F-23):
   - Nur Dateien der eigenen Adresse werden zwischengespeichert, und nur unter festen Schlüsseln:
     die Seite selbst (immer unter "/"), das Manifest und die Icons genau mit den Pfaden aus Manifest und Seite (?v=3).
   - Anfragen mit wechselnden Query-Strings (z. B. ?t=… der Update-Prüfung), version.json, sw.js und /api/ werden nie
     zwischengespeichert. Fremde Adressen (Wetter, Zählpixel) ebenfalls nicht. Dadurch bleibt der Cache konstant klein.
   - Seitenaufrufe: zuerst Netz mit Revalidierung (ETag, 304 statt ganzer Datei), ohne Netz die gespeicherte Seite.
   - Eine neue Cache-Version löscht beim Aktivieren alle alten Caches (auch die gewachsenen Einträge von kurbelwerk-v5).
   F16: Sprachdateien (/audio/voice/*.mp3) sind nicht Teil der Installation. Sie landen beim ersten Gebrauch in einem
   eigenen Cache (cache-first) und gehen danach auch offline. Das Manifest kommt zuerst aus dem Netz. Beim Aktivieren
   bleibt nur der aktuelle Voice-Cache; daraus werden Dateien entfernt, die das aktuelle Manifest nicht mehr nennt. */
const V = 'relentless-v25', VOICE = 'relentless-voice-v1', VDIR = '/audio/voice/';
const ICONS = ['/icons/icon-192.png?v=3', '/icons/icon-512.png?v=3', '/icons/icon-maskable-512.png?v=3', '/icons/apple-touch-icon.png?v=3'];
const SHELL = ['/', '/manifest.webmanifest', ...ICONS];
const NEVER = p => p.startsWith('/api/') || p === '/version.json' || p === '/sw.js';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => Promise.all(SHELL.map(u => c.add(new Request(u, {cache:'reload'})).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V && x !== VOICE).map(x => caches.delete(x))))
    .then(() => vPrune()).catch(() => {}).then(() => self.clients.claim()));
});
/* Voice-Cache aufräumen: nur Dateien behalten, die im aktuellen Manifest stehen (legt keinen leeren Cache an) */
function vPrune(){
  return caches.has(VOICE).then(h => h && fetch(VDIR + 'manifest.json', {cache:'no-cache'}).then(r => r.ok ? r.json() : null).then(m => { if (!m || !m.items) return;
    const keep = new Set([VDIR + 'manifest.json']); Object.keys(m.items).forEach(l => Object.values(m.items[l]).forEach(v => keep.add(VDIR + l + '/' + v[0])));
    return caches.open(VOICE).then(c => c.keys().then(K => Promise.all(K.filter(q => !keep.has(new URL(q.url).pathname)).map(q => c.delete(q))))); }));
}
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  let u; try { u = new URL(r.url); } catch (x) { return; }
  if (u.origin !== self.location.origin || NEVER(u.pathname)) return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r.url, {cache:'no-cache', credentials:'same-origin'})
      .then(res => { if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put('/', cp)).catch(() => {}); } return res; })
      .catch(() => caches.match('/').then(m => m || Response.error())));
    return;
  }
  if (u.pathname.startsWith(VDIR)) {
    const vk = u.pathname;
    if (u.pathname.endsWith('.mp3')) {
      e.respondWith(caches.open(VOICE).then(c => c.match(vk).then(m => m || fetch(r).then(res => { if (res.ok && res.type === 'basic') c.put(vk, res.clone()).catch(() => {}); return res; }))));
      return;
    }
    e.respondWith(fetch(r).then(res => { if (res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(VOICE).then(c => c.put(vk, cp)).catch(() => {}); } return res; })
      .catch(() => caches.open(VOICE).then(c => c.match(vk)).then(m => m || Response.error())));
    return;
  }
  const key = u.pathname + u.search;
  if (u.search && !ICONS.includes(key)) return;            // wechselnde Query-Strings nie speichern
  e.respondWith(fetch(r)
    .then(res => { if (res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(V).then(c => c.put(key, cp)).catch(() => {}); } return res; })
    .catch(() => caches.match(key).then(m => m || Response.error())));
});
