#!/usr/bin/env node
/* Garmin für Relentless: minimaler MCP-Server (stdio, ohne Abhängigkeiten) für die Garmin Personal API.
   Nur lesend. Der Schlüssel kommt aus GARMIN_PERSONAL_API_KEY (von Claude Desktop sicher gespeichert).
   Phase 2 (F-21): Antworten werden so streng geprüft wie in der Netlify-Funktion: Zeitlimit, Listen müssen Listen sein,
   HTML- oder ungültige JSON-Antworten ergeben klare Fehler, IDs haben eine Längengrenze. */
'use strict';
const BASE = process.env.GARMIN_PERSONAL_API_BASE_URL || 'https://personal.connectapi.garmin.com';
const TOKEN_PATH = '/personalapitoken-service/personal-api/personal-api-key/token';
const KEY = (process.env.GARMIN_PERSONAL_API_KEY || '').trim();
let token = null, tokenExp = 0;
const TIMEOUT = 20000;
async function gfetch(url, opt) {
  try { return await fetch(url, { ...opt, signal: AbortSignal.timeout(TIMEOUT) }); }
  catch (e) { throw new ApiError(e && (e.name === 'TimeoutError' || e.name === 'AbortError') ? 'Garmin antwortet gerade nicht rechtzeitig.' : 'Garmin ist gerade nicht erreichbar.'); }
}

class ApiError extends Error {}
async function bearer(force) {
  if (!KEY) throw new ApiError('Kein Garmin-API-Schlüssel hinterlegt. Trag ihn in Claude unter Einstellungen > Erweiterungen > Garmin für Relentless ein.');
  if (!force && token && tokenExp - Date.now() > 3600e3) return token;
  const res = await gfetch(BASE + TOKEN_PATH, { method: 'POST', headers: { Accept: '*/*', Authorization: 'ApiKey ' + KEY } });
  if (res.status === 401 || res.status === 403) throw new ApiError('AUTH: Garmin hat den API-Schlüssel abgelehnt. Er ist abgelaufen, widerrufen oder falsch kopiert. Erstelle unter connect.garmin.com einen neuen und trag ihn in den Einstellungen der Erweiterung ein.');
  if (!res.ok) throw new ApiError('Garmin antwortet beim Anmelden mit Fehler ' + res.status + '.');
  const t = (await res.text()).trim();
  if (!t || t.length > 8192 || /\s|</.test(t)) throw new ApiError('Garmin hat beim Anmelden eine unerwartete Antwort geschickt.');
  token = t; tokenExp = Date.now() + 12 * 3600e3;
  try { const p = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); if (p.exp) tokenExp = p.exp * 1000; } catch (e) {}
  return token;
}
async function get(path, accept, retry) {
  const t = await bearer(false);
  const res = await gfetch(BASE + path, { headers: { Accept: accept || 'application/json', Authorization: 'Bearer ' + t } });
  if (res.status === 401 && !retry) { token = null; return get(path, accept, true); }
  if (res.status === 401 || res.status === 403) throw new ApiError('AUTH: Garmin hat den Zugriff abgelehnt.');
  if (res.status === 404) throw new ApiError('Diese Aktivität gibt es bei Garmin nicht (mehr).');
  if (res.status === 429) throw new ApiError('Garmin begrenzt gerade die Abrufe. Bitte später noch einmal.');
  if (!res.ok) throw new ApiError('Garmin antwortet mit Fehler ' + res.status + ' (' + path.split('?')[0] + ').');
  if (accept) { if (/text\/html/i.test(res.headers.get('content-type') || '')) throw new ApiError('Garmin hat statt der Datei eine Webseite geschickt (vermutlich Wartung).'); return Buffer.from(await res.arrayBuffer()); }
  const txt = await res.text(); if (!txt) return null;
  try { return JSON.parse(txt); } catch (e) { throw new ApiError(/^\s*</.test(txt) ? 'Garmin hat statt Daten eine Webseite geschickt (vermutlich Wartung).' : 'Garmin hat eine unerwartete Antwort geschickt.'); }
}
const KEEP = ['activityId', 'activityName', 'startTimeLocal', 'startTimeGMT', 'distance', 'duration', 'movingDuration', 'elevationGain', 'averageHR', 'maxHR', 'avgPower', 'maxPower', 'normPower', 'trainingStressScore'];
function compact(a) {
  const o = {}; if (!a || typeof a !== 'object') return null;
  for (const k of KEEP) { const v = a[k]; if (v == null) continue; if (k === 'activityName' || k === 'startTimeLocal' || k === 'startTimeGMT') { if (typeof v === 'string') o[k] = v.slice(0, 200); } else if (typeof v === 'number' && isFinite(v)) o[k] = v; }
  if (a.activityType && typeof a.activityType.typeKey === 'string') o.activityType = a.activityType.typeKey.slice(0, 60);
  return o.activityId != null ? o : null;
}
const isoDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);

const TOOLS = [
  { name: 'list_activities', description: 'Aktivitäten aus Garmin Connect, neueste zuerst, mit kurzer Zusammenfassung. Seiten zu höchstens 50, Filter nach Zeitraum und Typ.',
    inputSchema: { type: 'object', properties: { start: { type: 'integer', minimum: 0, default: 0 }, limit: { type: 'integer', minimum: 1, maximum: 50, default: 20 }, startDate: { type: 'string', description: 'YYYY-MM-DD' }, endDate: { type: 'string', description: 'YYYY-MM-DD' }, activityType: { type: 'string' } } },
    annotations: { readOnlyHint: true, title: 'Aktivitäten auflisten' } },
  { name: 'get_activity_recording', description: 'Die Originaldatei einer Aktivität (ZIP mit der FIT-Datei), Base64-kodiert im Feld data. Enthält jede Sekunde mit Watt, Puls, Trittfrequenz, Höhe und Position.',
    inputSchema: { type: 'object', properties: { activityId: { type: ['string', 'integer'] }, maxSamples: { type: 'integer', description: 'wird ignoriert, die Datei ist immer vollständig' } }, required: ['activityId'] },
    annotations: { readOnlyHint: true, title: 'Aktivitätsdatei laden' } },
  { name: 'check_connection', description: 'Prüft, ob der hinterlegte Garmin-Schlüssel funktioniert.',
    inputSchema: { type: 'object', properties: {} }, annotations: { readOnlyHint: true, title: 'Verbindung prüfen' } }
];
async function callTool(name, a) {
  a = a || {};
  if (name === 'check_connection') { await bearer(true); return { ok: true }; }
  if (name === 'list_activities') {
    const start = Math.min(100000, Math.max(0, parseInt(a.start || 0, 10) || 0)), limit = Math.min(50, Math.max(1, parseInt(a.limit || 20, 10) || 20));
    const q = new URLSearchParams({ start: String(start), limit: String(limit) });
    if (isoDate(a.startDate)) q.set('startDate', a.startDate); if (isoDate(a.endDate)) q.set('endDate', a.endDate); if (typeof a.activityType === 'string' && /^[a-z_]{1,40}$/.test(a.activityType)) q.set('activityType', a.activityType);
    const rows = await get('/activitylist-service/activities/search/activities?' + q);
    if (rows != null && !Array.isArray(rows)) throw new ApiError('Garmin hat eine unerwartete Antwort geschickt.');
    const items = (rows || []).map(compact).filter(Boolean);
    return { start, returned: items.length, nextStart: (rows || []).length === limit ? start + limit : null, activities: items };
  }
  if (name === 'get_activity_recording' || name === 'get_activity_fit') {
    const id = String(a.activityId ?? ''); if (!/^\d{1,20}$/.test(id)) throw new ApiError('activityId muss eine positive Zahl sein.');
    const buf = await get('/download-service/files/activity/' + id, 'application/zip, application/x-zip-compressed, application/octet-stream');
    if (!buf.length) throw new ApiError('Garmin hat eine leere Datei geliefert.');
    if (buf.length > 20e6) throw new ApiError('Die Datei ist zu groß.');
    return { activityId: id, fileName: id + '.zip', encoding: 'base64', size: buf.length, data: buf.toString('base64') };
  }
  throw new ApiError('Unbekanntes Werkzeug: ' + name);
}
function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }
async function handle(m) {
  if (!m || typeof m !== 'object' || m.id === undefined) return; /* Benachrichtigungen ignorieren */
  const ok = result => send({ jsonrpc: '2.0', id: m.id, result }), fail = (code, message) => send({ jsonrpc: '2.0', id: m.id, error: { code, message } });
  try {
    if (m.method === 'initialize') return ok({ protocolVersion: (m.params && m.params.protocolVersion) || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'garmin', version: '1.0.0' } });
    if (m.method === 'ping') return ok({});
    if (m.method === 'tools/list') return ok({ tools: TOOLS });
    if (m.method === 'tools/call') {
      const p = m.params || {};
      try { const out = await callTool(p.name, p.arguments); return ok({ content: [{ type: 'text', text: JSON.stringify(out) }], structuredContent: out }); }
      catch (e) { return ok({ isError: true, content: [{ type: 'text', text: (e && e.message) || String(e) }] }); }
    }
    return fail(-32601, 'Methode nicht unterstützt: ' + m.method);
  } catch (e) { fail(-32603, (e && e.message) || 'Interner Fehler'); }
}
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { buf += chunk; let i; while ((i = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1); if (!line) continue; let m; try { m = JSON.parse(line); } catch (e) { continue; } handle(m); } });
process.stdin.on('end', () => process.exit(0));
