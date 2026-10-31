/* Garmin-Vermittler für die Relentless-Web-App (Netlify Function).
   Warum: Garmins Personal API erlaubt keine Aufrufe aus Webseiten (keine CORS-Freigabe). Diese Funktion läuft auf dem
   Netlify-Server derselben Adresse wie die App, ruft Garmin dort auf und gibt das Ergebnis an die App zurück.
   - Nur lesend und nur zwei feste Garmin-Adressen (Aktivitätsliste, Originaldatei). Kein offener Proxy.
   - Der API-Schlüssel kommt bei jedem Aufruf aus dem Browser des Nutzers (Header x-garmin-key). Er wird weder gespeichert
     noch protokolliert; nur das kurzlebige Garmin-Zugangstoken bleibt für ein paar Stunden im Arbeitsspeicher. */
import { createHash } from 'node:crypto';

const BASE = 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const tokens = new Map(); /* sha256(Schlüssel) → {t, exp} */

class ApiError extends Error { constructor(status, code, msg) { super(msg); this.status = status; this.code = code; } }
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
const isoDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

async function bearer(key, force) {
  const h = createHash('sha256').update(key).digest('hex'), c = tokens.get(h);
  if (!force && c && c.exp - Date.now() > 30 * 60e3) return { t: c.t, h };
  let res;
  try { res = await fetch(BASE + TOKEN_PATH, { method: 'POST', headers: { Accept: '*/*', Authorization: 'ApiKey ' + key } }); }
  catch (e) { throw new ApiError(502, 'garmin', 'Garmin ist gerade nicht erreichbar.'); }
  if (res.status === 401 || res.status === 403) throw new ApiError(401, 'auth', 'Garmin hat den API-Schlüssel abgelehnt. Er ist abgelaufen, widerrufen oder falsch kopiert.');
  if (!res.ok) throw new ApiError(502, 'garmin', 'Garmin antwortet beim Anmelden mit Fehler ' + res.status + '.');
  const t = (await res.text()).trim(); let exp = Date.now() + 12 * 3600e3;
  try { const p = JSON.parse(Buffer.from(t.split('.')[1], 'base64url').toString('utf8')); if (p.exp) exp = p.exp * 1000; } catch (e) {}
  if (tokens.size > 500) tokens.clear();
  tokens.set(h, { t, exp }); return { t, h };
}
async function get(key, path, binary, retry) {
  const { t, h } = await bearer(key, false);
  let res;
  try { res = await fetch(BASE + path, { headers: { Accept: binary ? 'application/zip, application/x-zip-compressed, application/octet-stream' : 'application/json', Authorization: 'Bearer ' + t } }); }
  catch (e) { throw new ApiError(502, 'garmin', 'Garmin ist gerade nicht erreichbar.'); }
  if (res.status === 401 && !retry) { tokens.delete(h); return get(key, path, binary, true); }
  if (res.status === 401 || res.status === 403) throw new ApiError(401, 'auth', 'Garmin hat den Zugriff abgelehnt.');
  if (res.status === 404) throw new ApiError(404, 'notfound', 'Diese Aktivität gibt es bei Garmin nicht (mehr).');
  if (!res.ok) throw new ApiError(502, 'garmin', 'Garmin antwortet mit Fehler ' + res.status + '.');
  if (binary) return Buffer.from(await res.arrayBuffer());
  const txt = await res.text(); return txt ? JSON.parse(txt) : null;
}
const KEEP = ['activityId', 'activityName', 'startTimeLocal', 'startTimeGMT', 'distance', 'duration', 'movingDuration', 'elevationGain', 'averageHR', 'maxHR', 'avgPower', 'maxPower', 'normPower', 'trainingStressScore'];
function compact(a) { const o = {}; for (const k of KEEP) if (a[k] != null) o[k] = a[k]; if (a.activityType && a.activityType.typeKey) o.activityType = a.activityType.typeKey; return o; }

export default async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'method', message: 'Nur POST.' });
  /* Nur Aufrufe von derselben Adresse (der App selbst) annehmen */
  const origin = req.headers.get('origin');
  try { if (origin && new URL(origin).host !== new URL(req.url).host) return json(403, { error: 'origin', message: 'Nicht erlaubt.' }); } catch (e) { return json(403, { error: 'origin', message: 'Nicht erlaubt.' }); }
  let a; try { a = await req.json(); } catch (e) { return json(400, { error: 'input', message: 'Ungültige Anfrage.' }); }
  a = a && typeof a === 'object' ? a : {};
  if (a.action === 'ping') return json(200, { ok: true, service: 'relentless-garmin', version: 1 });
  const key = String(req.headers.get('x-garmin-key') || '').trim();
  if (!key || key.length > 4096 || /\s/.test(key)) return json(400, { error: 'nokey', message: 'Kein gültiger Garmin-API-Schlüssel angegeben.' });
  try {
    if (a.action === 'check') { await bearer(key, true); return json(200, { ok: true }); }
    if (a.action === 'list') {
      const start = Math.max(0, parseInt(a.start || 0, 10) || 0), limit = Math.min(50, Math.max(1, parseInt(a.limit || 20, 10) || 20));
      const q = new URLSearchParams({ start: String(start), limit: String(limit) });
      if (isoDate(a.startDate)) q.set('startDate', a.startDate); if (isoDate(a.endDate)) q.set('endDate', a.endDate);
      const rows = (await get(key, '/activitylist-service/activities/search/activities?' + q)) || [];
      const items = (Array.isArray(rows) ? rows : []).map(compact);
      return json(200, { start, returned: items.length, nextStart: items.length === limit ? start + items.length : null, activities: items });
    }
    if (a.action === 'file') {
      const id = String(a.activityId || ''); if (!/^\d{1,20}$/.test(id)) return json(400, { error: 'input', message: 'activityId muss eine Zahl sein.' });
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
