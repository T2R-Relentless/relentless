/* ---------- Sicherheit (Phase 2, F-01/F-07): Daten aus Sicherungen, Speicher und Schnappschüssen säubern ----------
   Alles, was aus einer Datei, aus localStorage oder aus IndexedDB kommt, läuft hier durch, bevor die App es verwendet:
   - IDs (id, pid, active, evId, …) müssen /^[A-Za-z0-9_.:-]{1,64}$/ entsprechen, sonst bekommen sie eine neue ID.
     Verweise auf die alte ID werden nur in ID-Feldern und Objektschlüsseln umgestellt, nie in anderen Texten (N-02).
     Leer bleiben darf nur evId (= kein Katalog-Event). Leere Werte anderer ID-Felder (kommen in der App nicht vor) bekommen
     gemeinsam eine neue ID, damit pid, active und Bibliotheksschlüssel weiter zusammenpassen. Textfelder bleiben leer.
   - Zahlenfelder (secNumKey) müssen Zahlen sein: Zahl-Texte werden umgewandelt, leer/null bleibt, alles andere fällt weg (N-01).
   - Objektschlüssel mit Anführungszeichen, spitzen Klammern, Backslash oder Steuerzeichen werden verworfen.
   - In allen Texten werden Zeichen, mit denen man aus HTML oder JavaScript ausbrechen könnte, durch typografische
     Gegenstücke ersetzt: ' → ’, " → ”, ` → ’, < → ‹, > → ›, \ → /. Normale App-Daten enthalten diese Zeichen nicht.
     Ausnahmen nur an festen Stellen und nur nach strenger Prüfung: die Zwift-Signatur (zxExp.m.<Tag>[1]) und die
     Vergleichswerte goalSeen und zxAck, jeweils nur auf oberster Ebene des Zustands (bzw. unter state in einer Sicherung). Diese Texte werden nur verglichen, nie ausgegeben.
   - Tiefe, Länge von Listen und Texten sind begrenzt.
   Die Funktionen sind Funktionsdeklarationen, weil load() sie schon beim Start braucht. */
function secIsId(v){ return typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,64}$/.test(v); }
function secIdKey(k){ return k === 'id' || k === 'pid' || k === 'active' || k === 'evId' || k === 'gid' || /^[a-z]+Id$/.test(k); }
function secTxt(v){
  if (v.length > 200000) return '';
  return v.replace(/['`]/g, '’').replace(/"/g, '”').replace(/</g, '‹').replace(/>/g, '›').replace(/\\/g, '/'); }
/* Zwift-Signatur (zxSig): JSON-Liste aus kurzen Kennwörtern, Zahlen, null und verschachtelten Listen davon */
function secZxSig(v){
  if (typeof v !== 'string' || v.length > 400 || /[<>`'\\]/.test(v)) return false;
  let j; try { j = JSON.parse(v); } catch (e) { elog(e); return false; }
  const ok = (x, d) => d < 4 && (x === null || (typeof x === 'number' && isFinite(x)) || (typeof x === 'string' && /^[A-Za-z0-9_-]{0,24}$/.test(x)) || (Array.isArray(x) && x.length <= 16 && x.every(y => ok(y, d + 1))));
  return Array.isArray(j) && ok(j, 0) && JSON.stringify(j) === v;
}
/* Felder, die immer Zahlen sind (Profil aus realen Zuständen; dist/hm dürfen zusätzlich leer sein) */
/* Vergleichs-Signaturen der App (S.goalSeen, S.zxAck): JSON aus harmlosen Texten, Zahlen, Wahrheitswerten und
   verschachtelten Listen/Objekten. Sie werden nur verglichen, nie ausgegeben. */
function secJsonOk(v){
  if (typeof v !== 'string' || v.length > 20000 || /[<>`'\\]/.test(v)) return false;
  let j; try { j = JSON.parse(v); } catch (e) { elog(e); return false; }
  const t = /^[^<>"'`\\\u0000-\u001f]{0,300}$/;
  const ok = (x, d) => d < 7 && (x === null || typeof x === 'boolean' || (typeof x === 'number' && isFinite(x)) || (typeof x === 'string' && t.test(x)) ||
    (Array.isArray(x) && x.length <= 500 && x.every(y => ok(y, d + 1))) ||
    (x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length <= 100 && Object.keys(x).every(k => t.test(k) && k !== '__proto__') && Object.values(x).every(y => ok(y, d + 1))));
  return j !== null && typeof j === 'object' && ok(j, 0) && JSON.stringify(j) === v;
}
function secJsonKey(k){ return k === 'goalSeen' || k === 'zxAck'; }
/* Hinweis: Sets werden erst beim ersten Aufruf gebaut, weil load() diese Funktionen vor dieser Stelle im Skript braucht */
function secNumKey(k){ return (secNumKey.s || (secNumKey.s = new Set(['dayMin', 'ftp', 'ftpStart', 'ftpTarget', 'ftpKnown', 'weight', 'hours', 'hrMax', 'lthr', 'cycLen', 'commuteMin', 'longDay', 'dist', 'hm', 'km', 'sec', 'tss', 'np', 'IF', 'hr', 'hrv', 'wk', 'rev', 'at', 'created', 'updated', 'reps', 'sets', 'work', 'rest', 'lo', 'hi', 'rlo', 'rhi', 'min', 'owedSince', 't0fix']))).has(k); }
/* Zahl prüfen: Zahl bleibt, Zahl-Text wird Zahl, leer/null bleibt, alles andere: undefined (Feld fällt weg) */
/* Pulsverteilung: Objekt mit höchstens 300 Einträgen Puls → Sekunden, alles Zahlen */
function secHrHist(v){ if (!v || typeof v !== 'object' || Array.isArray(v)) return false; const k = Object.keys(v); return k.length <= 300 && k.every(x => /^\d{1,3}$/.test(x) && typeof v[x] === 'number' && isFinite(v[x])); }
function secNum(v){
  if (typeof v === 'number') return isFinite(v) ? v : undefined;
  if (v === null || v === '') return v;
  if (typeof v === 'string' && /^\s*-?\d{1,12}(\.\d{1,6})?\s*$/.test(v)) return Number(v);
  return undefined;
}
/* Leer ist nur bei evId ein gültiger Wert ("kein Katalog-Event"). Leere Werte anderer ID-Felder erhalten gemeinsam EINE neue ID,
   damit Verweise (pid, active, Bibliotheksschlüssel) zusammenpassen; Textfelder bleiben unberührt. */
function secEmptyOk(k){ return k === 'evId'; }
function secNewId(){ return 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
/* bk = true: Sicherungsdatei. Dann gilt als oberste Ebene nur o.state, sonst nur der Zustand selbst (Phase 3.3). */
function secClean(o, bk){
  const map = new Map(); let changed = false;
  /* 1. ungültige IDs einsammeln */
  (function scan(v, d){
    if (d > 40 || !v || typeof v !== 'object') return;
    if (Array.isArray(v)) { for (let i = 0; i < Math.min(v.length, 20000); i++) scan(v[i], d + 1); return; }
    for (const k of Object.keys(v)) { const x = v[k];
      if (secIdKey(k) && typeof x === 'string' && !(x === '' && secEmptyOk(k)) && !secIsId(x) && !map.has(x)) map.set(x, secNewId());
      if (secIdKey(k) && typeof x === 'number' && isFinite(x)) continue;
      scan(x, d + 1); }
  })(o, 0);
  /* 2. säubern. k = Schlüssel des Werts (bei Listen der Schlüssel der Liste), ctx = Pfad-Kennung: 'top' (oberste Ebene), 'zxm'/'zxent'/'zxsig' (Zwift-Signatur) */
  const cl = (v, d, k, ctx) => {
    if (typeof v === 'string') {
      if (ctx === 'zxsig' && secZxSig(v)) return v;
      if (k && secJsonKey(k) && ctx === 'top' && secJsonOk(v)) return v;
      if (k && secIdKey(k)) {
        if (v === '' && secEmptyOk(k)) return v;
        if (map.has(v)) { changed = true; return map.get(v); }
      }
      const t = secTxt(v); if (t !== v) changed = true; return t;
    }
    if (typeof v === 'number') { if (!isFinite(v)) { changed = true; return 0; } return v; }
    if (v === null || typeof v === 'boolean') return v;
    if (typeof v !== 'object' || d > 40) { changed = true; return null; }
    if (Array.isArray(v)) {
      if (v.length > 20000) changed = true;
      const hmTxt = k === 'hm' && v.length > 0 && v.every(y => typeof y === 'string');
      return v.slice(0, 20000).map((x, i) => {
        /* Ausnahme: hm einer Fahrt-Bewertung ist eine Liste von Hinweistexten (Phase 3.3, Befund E: sonst wurden sie zu 0) */
        if (k && secNumKey(k) && x !== null && typeof x !== 'object' && !(k === 'hm' && hmTxt)) { const n = secNum(x); if (n !== x) changed = true; return n === undefined ? 0 : n; }
        return cl(x, d + 1, k, ctx === 'zxent' && i === 1 ? 'zxsig' : null);
      });
    }
    /* oberste Ebene: der Zustand selbst bzw. state in einer Sicherungsdatei; nur dort gelten die JSON-Ausnahmen */
    const top = bk ? d === 1 && k === 'state' : d === 0, out = {};
    for (const kk of Object.keys(v)) {
      let nk = kk; if (map.has(kk)) { nk = map.get(kk); changed = true; }
      else if (!/^[^'"`<>\\\u0000-\u001f]{1,300}$/.test(kk) || kk === '__proto__' || kk === 'constructor' || kk === 'prototype') { changed = true; continue; }
      const x = v[kk];
      /* Ausnahme: Pulsverteilung einer Fahrt-Bewertung (hr:{140:3599}, nur Zahlen) bleibt erhalten (Phase 3.3, Befund D:
         sonst fiel sie beim Laden weg). Alle anderen Werte unter Zahlenschlüsseln werden als Zahl geprüft. */
      if (kk === 'hr' && secHrHist(x)) { out[nk] = cl(x, d + 1, kk, null); continue; }
      if (secNumKey(kk) && !Array.isArray(x)) { const n = secNum(x); if (n === undefined) { changed = true; continue; } if (n !== x) changed = true; out[nk] = n; continue; }
      out[nk] = cl(x, d + 1, kk, top ? 'top' : k === 'zxExp' && ctx === 'top' && kk === 'm' ? 'zxm' : ctx === 'zxm' ? 'zxent' : null);
    }
    return out;
  };
  const v = cl(o, 0, null, null);
  /* 3. Einträge in Event-Listen brauchen eine gültige ID */
  const fixSubs = q => { if (q && Array.isArray(q.subs)) q.subs = q.subs.filter(s => s && typeof s === 'object').map(s => { if (!secIsId(s.id)) { changed = true; return {...s, id:secNewId()}; } return s; }); };
  if (v && typeof v === 'object') { fixSubs(v.d); fixSubs(v.p); if (v.snap) fixSubs(v.snap.p); if (v.plans && typeof v.plans === 'object') Object.values(v.plans).forEach(e => e && e.snap && fixSubs(e.snap.p)); }
  return {v, changed};
}
function secC(o, bk){ return secClean(o, bk).v; }
/* Sicherungsdatei prüfen (Schema) und säubern. Wirft einen Fehler mit verständlicher Meldung. */
var BK_MAX = 25e6;
function bkParse(text){
  if (typeof text !== 'string' || text.length > BK_MAX) throw new Error('Die Datei ist zu groß für eine Relentless-Sicherung.');
  let o; try { o = JSON.parse(text); } catch (e) { elog(e); throw new Error('Die Datei ist kein gültiges JSON.'); }
  const bad = m => { throw new Error('Die Datei ist keine gültige Relentless-Sicherung (' + m + ').'); };
  if (!o || typeof o !== 'object' || Array.isArray(o)) bad('kein Objekt');
  if (o.app !== 'relentless') bad('falsche Kennung');
  if (o.v != null && !(o.v === 1 || o.v === 2 || o.v === 3)) bad('unbekannte Version');
  if (!Array.isArray(o.plans)) bad('keine Planliste');
  if (o.plans.length > 500) bad('zu viele Pläne');
  if (o.plans.some(e => !e || typeof e !== 'object' || Array.isArray(e))) bad('ungültiger Planeintrag');
  if (o.state != null && (typeof o.state !== 'object' || Array.isArray(o.state))) bad('ungültiger Zustand');
  if (o.lib != null && (typeof o.lib !== 'object' || Array.isArray(o.lib) || (o.lib.plans != null && typeof o.lib.plans !== 'object'))) bad('ungültige Bibliothek');
  if (o.side != null && (typeof o.side !== 'object' || Object.values(o.side).some(x => typeof x !== 'string'))) bad('ungültige Einstellungen');
  /* Einstellungen (side) sind JSON-Texte: getrennt säubern, bevor die allgemeine Bereinigung ihre Anführungszeichen
     ersetzt (Phase 3.3, Befund C: sonst gingen z. B. ausgeschaltete Tipps beim Wiederherstellen verloren) */
  const side = o.side; delete o.side;
  const c = secC(o, true);
  c.plans = c.plans.filter(e => e && e.snap && typeof e.snap === 'object' && e.snap.p && typeof e.snap.p === 'object');
  if (side) { c.side = {}; for (const k of Object.keys(side)) { if (!/^[\w.:-]{1,80}$/.test(k)) continue; const v = String(side[k]); let j, ok = false; try { j = JSON.parse(v); ok = JSON.stringify(j) === v; } catch (e) { elog(e); }
    /* nur kanonisches JSON als JSON säubern; alles andere (z. B. ein Garmin-Schlüssel nur aus Ziffern) bleibt Text */
    c.side[k] = ok ? JSON.stringify(secC(j)) : secTxt(v).slice(0, 2000); } }
  return c;
}
/* Aktionen aus Fahrt-Bewertungen werden als Aufruftext gespeichert (z. B. 'setFtpNow(250)') und als onclick ausgegeben.
   Ausgegeben wird nur, was genau einem der Aufrufe entspricht, die die App selbst erzeugt (addRecW(), setFtpNow(Zahl[, Zahl]),
   retest(Zahl)); alles andere wird zu einem leeren Handler (Phase 3.3, Befund A). */
function exeAct(v){ return typeof v === 'string' && /^(?:addRecW\(\)|setFtpNow\(\d{1,4}(?:\.\d{1,2})?(?:, ?-?\d{1,3})?\)|retest\(-?\d{1,3}\))$/.test(v) ? v : ''; }
/* Werte für Inline-Handler (onclick="…"): nur Zahlen, Wahrheitswerte und harmlose Zeichen. Wird beim Bauen um jede
   Einsetzung in on*-Attribute gelegt, damit selbst manipulierte Werte keinen Code bilden können. */
function ja(v){
  if (typeof v === 'number') return isFinite(v) ? String(v) : '0';
  if (typeof v === 'boolean') return String(v);
  if (v === null) return 'null'; if (v === undefined) return 'undefined';
  return String(v).replace(/[^\w.:|+,\-\/ äöüÄÖÜß%]/g, '');
}
try { localStorage.setItem('relentless.probe', '1'); localStorage.removeItem('relentless.probe'); } catch (e) { storeErr = true; storeWhy = e && e.name === 'QuotaExceededError' ? 'quota' : 'blocked'; }
