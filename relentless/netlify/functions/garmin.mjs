/* Garmin-Vermittler für die Relentless-Web-App (Netlify Function).
   Warum: Garmins Personal API erlaubt keine Aufrufe aus Webseiten (keine CORS-Freigabe). Diese Funktion läuft auf dem
   Netlify-Server derselben Adresse wie die App, ruft Garmin dort auf und gibt das Ergebnis an die App zurück.
   - Nur lesend und nur zwei feste Garmin-Adressen (Aktivitätsliste, Originaldatei). Kein offener Proxy.
   - Der API-Schlüssel kommt bei jedem Aufruf aus dem Browser des Nutzers (Header x-garmin-key). Er wird weder gespeichert
     noch protokolliert; nur das kurzlebige Garmin-Zugangstoken bleibt für ein paar Stunden im Arbeitsspeicher.
   Phase 2 (F-16, F-17):
   - Aufrufe nur aus der App selbst: Origin derselben Adresse oder Sec-Fetch-Site "same-origin". Das hält fremde Webseiten
     ab, ist aber keine Authentifizierung: Programme außerhalb eines Browsers können Header frei setzen. Schutz für
     Garmin-Daten bleibt der persönliche Schlüssel, den nur der Nutzer kennt.
   - Ratenbegrenzung pro IP (bestmöglich, im Arbeitsspeicher der jeweiligen Funktionsinstanz).
   - Zeitlimit für Garmin, klare Fehler bei HTML-Seiten, ungültigem JSON oder unerwarteter Struktur. */
import { createHash } from 'node:crypto';

const BASE = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const TIMEOUT = 20000, RATE_N = 120, RATE_WIN = 60e3, MAX_BODY = 4096;
const tokens = new Map(); /* sha256(Schlüssel) → {t, exp} */
const hits = new Map();   /* IP → {n, t0} */

class ApiError extends Error { constructor(status, code, msg) { super(msg); this.status = status; this.code = code; } }
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
const isoDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

async function gfetch(url, opt) {
  try { return await fetch(url, { ...opt, signal: AbortSignal.timeout(TIMEOUT) }); }
  catch (e) {
    if (e && (e.name === 'TimeoutError' || e.name === 'AbortError')) throw new ApiError(504, 'timeout', 'Garmin antwortet gerade nicht rechtzeitig.');
    throw new ApiError(502, 'garmin', 'Garmin ist gerade nicht erreichbar.');
  }
}
async function bearer(key, force) {
  const h = createHash('sha256').update(key).digest('hex'), c = tokens.get(h);
  if (!force && c && c.exp - Date.now() > 30 * 60e3) return { t: c.t, h };
  const res = await gfetch(BASE + TOKEN_PATH, { method: 'POST', headers: { Accept: '*/*', Authorization: 'ApiKey ' + key } });
  if (res.status === 401 || res.status === 403) throw new ApiError(401, 'auth', 'Garmin hat den API-Schlüssel abgelehnt. Er ist abgelaufen, widerrufen oder falsch kopiert.');
  if (!res.ok) throw new ApiError(502, 'garmin', 'Garmin antwortet beim Anmelden mit Fehler ' + res.status + '.');
  const t = (await res.text()).trim();
  if (!t || t.length > 8192 || /\s|</.test(t)) throw new ApiError(502, 'format', 'Garmin hat beim Anmelden eine unerwartete Antwort geschickt.');
  let exp = Date.now() + 12 * 3600e3;
  try { const p = JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString('utf8')); if (p.exp) exp = p.exp * 1000; } catch (e) {}
  if (tokens.size > 500) tokens.clear();
  tokens.set(h, { t, exp }); return { t, h };
}
async function get(key, path, binary, retry) {
  const { t, h } = await bearer(key, false);
  const res = await gfetch(BASE + path, { headers: { Accept: binary ? 'application/zip, application/x-zip-compressed, application/octet-stream' : 'application/json', Authorization: 'Bearer ' + t } });
  if (res.status === 401 && !retry) { tokens.delete(h); return get(key, path, binary, true); }
  if (res.status === 401 || res.status === 403) throw new ApiError(401, 'auth', 'Garmin hat den Zugriff abgelehnt.');
  if (res.status === 404) throw new ApiError(404, 'notfound', 'Diese Aktivität gibt es bei Garmin nicht (mehr).');
  if (res.status === 429) throw new ApiError(429, 'rate', 'Garmin begrenzt gerade die Abrufe. Bitte später noch einmal.');
  if (!res.ok) throw new ApiError(502, 'garmin', 'Garmin antwortet mit Fehler ' + res.status + '.');
  if (binary) {
    const ct = res.headers.get('content-type') || '';
    if (/text\/html/i.test(ct)) throw new ApiError(502, 'format', 'Garmin hat statt der Datei eine Webseite geschickt (vermutlich Wartung).');
    return Buffer.from(await res.arrayBuffer());
  }
  const txt = await res.text(); if (!txt) return null;
  try { return JSON.parse(txt); } catch (e) { throw new ApiError(502, 'format', /^\s*</.test(txt) ? 'Garmin hat statt Daten eine Webseite geschickt (vermutlich Wartung).' : 'Garmin hat eine unerwartete Antwort geschickt.'); }
}
const KEEP = ['activityId', 'activityName', 'startTimeLocal', 'startTimeGMT', 'distance', 'duration', 'movingDuration', 'elevationGain', 'averageHR', 'maxHR', 'avgPower', 'maxPower', 'normPower', 'trainingStressScore'];
function compact(a) {
  const o = {}; if (!a || typeof a !== 'object') return null;
  for (const k of KEEP) { const v = a[k]; if (v == null) continue; if (k === 'activityName' || k === 'startTimeLocal' || k === 'startTimeGMT') { if (typeof v === 'string') o[k] = v.slice(0, 200); } else if (typeof v === 'number' && isFinite(v)) o[k] = v; }
  if (a.activityType && typeof a.activityType.typeKey === 'string') o.activityType = a.activityType.typeKey.slice(0, 60);
  return o.activityId != null ? o : null;
}
function sameOrigin(req) {
  const origin = req.headers.get('origin'), site = req.headers.get('sec-fetch-site');
  if (origin) { try { return new URL(origin).host === new URL(req.url).host; } catch (e) { return false; } }
  return site === 'same-origin';
}
function limited(ip) {
  const now = Date.now(), e = hits.get(ip);
  if (!e || now - e.t0 > RATE_WIN) { if (hits.size > 5000) hits.clear(); hits.set(ip, { n: 1, t0: now }); return false; }
  e.n++; return e.n > RATE_N;
}

export default async (req, context) => {
  if (req.method !== 'POST') return json(405, { error: 'method', message: 'Nur POST.' });
  if (!sameOrigin(req)) return json(403, { error: 'origin', message: 'Nicht erlaubt.' });
  const ip = (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || 'unbekannt';
  if (limited(ip)) return json(429, { error: 'rate', message: 'Zu viele Abrufe in kurzer Zeit. Bitte in einer Minute noch einmal.' });
  if (+(req.headers.get('content-length') || 0) > MAX_BODY) return json(413, { error: 'input', message: 'Anfrage zu groß.' });
  let a; try { const txt = await req.text(); if (txt.length > MAX_BODY) return json(413, { error: 'input', message: 'Anfrage zu groß.' }); a = JSON.parse(txt); } catch (e) { return json(400, { error: 'input', message: 'Ungültige Anfrage.' }); }
  a = a && typeof a === 'object' && !Array.isArray(a) ? a : {};
  if (a.action === 'ping') return json(200, { ok: true, service: 'relentless-garmin', version: 2 });
  const key = String(req.headers.get('x-garmin-key') || '').trim();
  if (!key || key.length > 4096 || /\s/.test(key)) return json(400, { error: 'nokey', message: 'Kein gültiger Garmin-API-Schlüssel angegeben.' });
  try {
    if (a.action === 'check') { await bearer(key, true); return json(200, { ok: true }); }
    if (a.action === 'list') {
      const start = Math.min(100000, Math.max(0, parseInt(a.start || 0, 10) || 0)), limit = Math.min(50, Math.max(1, parseInt(a.limit || 20, 10) || 20));
      const q = new URLSearchParams({ start: String(start), limit: String(limit) });
      if (isoDate(a.startDate)) q.set('startDate', a.startDate); if (isoDate(a.endDate)) q.set('endDate', a.endDate);
      const rows = await get(key, '/activitylist-service/activities/search/activities?' + q);
      if (rows != null && !Array.isArray(rows)) throw new ApiError(502, 'format', 'Garmin hat eine unerwartete Antwort geschickt.');
      const items = (rows || []).map(compact).filter(Boolean);
      return json(200, { start, returned: items.length, nextStart: (rows || []).length === limit ? start + limit : null, activities: items });
    }
    if (a.action === 'file') {
      const id = String(a.activityId ?? ''); if (!/^\d{1,20}$/.test(id)) return json(400, { error: 'input', message: 'activityId muss eine Zahl sein.' });
      const buf = await get(key, '/download-service/files/activity/' + id, true);
      if (!buf.length) throw new ApiError(502, 'garmin', 'Garmin hat eine leere Datei geliefert.');
      if (buf.length > 4.2e6) throw new ApiError(413, 'large', 'Die Datei ist zu groß für die Übertragung.');
      return json(200, { activityId: id, fileName: id + '.zip', encoding: 'base64', size: buf.length, data: buf.toString('base64') });
    }
    return json(400, { error: 'input', message: 'Unbekannte Aktion.' });
  } catch (e) {
    if (e instanceof ApiError) return json(e.status, { error: e.code, message: e.message });
    return json(500, { error: 'server', message: 'Interner Fehler.' });
  }
};
export const config = { path: '/api/garmin' };
