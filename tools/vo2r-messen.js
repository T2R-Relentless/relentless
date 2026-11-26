/* F38: Messskript für den VO2max-Trend aus Fahrten (nicht Teil der App).
   Liest alle FIT-Dateien eines Ordners mit dem Parser der App (parseFIT) und wertet sie mit vo2rKeep / vo2rRide aus.
   Ausgabe je Fahrt: Datum, Name, gespeicherte und gültige Abschnitte, Grund des Ausschlusses, Wert; danach die Streuung.

   Aufruf (Skript läuft auf der Testseite, wie tests/*):
     1. FIT-Dateien nach claude/privat/fit/ kopieren (Ordner ist in .gitignore, die Dateien bleiben im Gerät)
     2. node tools/test.mjs --skript=tools/vo2r-messen.js
        (ohne Node: tests/serve.py starten und den Inhalt in der Konsole von http://localhost:8765/tests/ als
         `await (async () => { … })()` ausführen)
   Einstellungen: vorher window.VO2R_CFG = {hm:185, kg:75, rhr:50, dir:'/claude/privat/fit/'} setzen, sonst gelten die Werte unten. */
const CFG = {hm:185, kg:75, rhr:50, sex:'m', dir:'/claude/privat/fit/', ...(window.VO2R_CFG || {})};
const list = await (await fetch(CFG.dir)).text(), files = [...list.matchAll(/href="([^"]+\.fit)"/gi)].map(m => decodeURIComponent(m[1]));
if (!files.length) return 'Keine FIT-Dateien in ' + CFG.dir;
/* 1. Dateien lesen; Uhr der App auf den Tag nach der letzten Fahrt stellen (Trend und Ruhepuls beziehen sich auf „heute“) */
const a0 = await boot(), rides = [];
for (const f of files) { try { const u = new Uint8Array(await (await fetch(CFG.dir + encodeURIComponent(f))).arrayBuffer()); const r = a0.w.parseFIT(u); const t = (r.pts.find(q => q && q.t) || {}).t; if (t) rides.push({f, r, t}); } catch (e) { rides.push({f, err:String(e && e.message || e)}); } }
const ok = rides.filter(x => x.r).sort((x, y) => x.t - y.t); if (!ok.length) return 'Keine Fahrt lesbar.\n' + rides.map(x => x.f + ': ' + x.err).join('\n');
const a = await boot({now:(ok[ok.length - 1].t + 86400) * 1000});
makePlan(a, {goal:'event', eventName:'Messung', eventDate:a.$('iso(200)'), ftp:250, hours:8, weight:CFG.kg, sex:CFG.sex, hrMax:CFG.hm});
a.$(`S.mo = {}; [1, 2, 3, 4, 5].forEach(k => { S.mo[iso(-k)] = {hr:${+CFG.rhr}}; })`);
/* 2. Jede Fahrt wie beim Einlesen ablegen (vo2rKeep), dann mit HFmax, Ruhepuls und Gewicht rechnen */
const out = [];
for (const x of ok) { a.w.__r = x.r; const id = 'f' + x.t, day = a.$(`lstr(new Date(${x.t * 1000}))`); a.$(`vo2rKeep({id:'${id}', day:'${day}'}, __r)`); x.id = id; x.day = day; }
const L = a.$('vo2rList()'), by = Object.fromEntries(L.map(o => [o.id, o])), all = a.$('S.vo2r'), pad = (s, n) => String(s).padEnd(n);
out.push(`HFmax ${CFG.hm}, Ruhepuls ${CFG.rhr}, ${CFG.kg} kg, ${ok.length} Fahrten`, '');
out.push(pad('Datum', 11) + pad('Abschn.', 8) + pad('gültig', 7) + pad('Wert', 6) + pad('Temp', 5) + pad('Entk.', 6) + 'Grund · Datei');
for (const x of ok) { const o = by[x.id] || {}, rec = all[x.id] || {}, ns = rec.s ? rec.s.split(',').length : 0;
  out.push(pad(x.day, 11) + pad(ns, 8) + pad(o.n || 0, 7) + pad(o.v != null ? o.v.toFixed(1) : '–', 6) + pad(rec.t != null ? rec.t : '–', 5) + pad(rec.dec != null ? rec.dec : '–', 6) + (o.x ? a.$(`vo2rWhy('${o.x}')`) : 'gültig') + ' · ' + x.f); }
rides.filter(x => x.err).forEach(x => out.push('nicht lesbar: ' + x.f + ' (' + x.err + ')'));
/* 3. Streuung der gültigen Fahrten und Trend */
const V = L.filter(o => !o.x && o.v != null).map(o => o.v).sort((p, q) => p - q);
if (V.length) { const m = V.reduce((p, q) => p + q, 0) / V.length, sd = Math.sqrt(V.reduce((p, q) => p + (q - m) ** 2, 0) / Math.max(1, V.length - 1)), Q = q => { const i = (V.length - 1) * q, lo = Math.floor(i); return V[lo] + (V[Math.ceil(i)] - V[lo]) * (i - lo); };
  out.push('', `Gültig: ${V.length} von ${ok.length}. Median ${Q(.5).toFixed(1)}, Mittel ${m.toFixed(1)}, SD ${sd.toFixed(1)}, IQR ${Q(.25).toFixed(1)}–${Q(.75).toFixed(1)}, Spanne ${V[0].toFixed(1)}–${V[V.length - 1].toFixed(1)}`);
  const ex = {}; L.filter(o => o.x).forEach(o => { ex[o.x] = (ex[o.x] || 0) + 1; }); out.push('Ausschlüsse: ' + (Object.entries(ex).map(([k, n]) => `${a.$(`vo2rWhy('${k}')`)} ${n}`).join(', ') || 'keine'));
  const s = a.$('vo2rSum()'); out.push(s.tr ? `Trend am ${a.$('iso(0)')}: ${s.tr.v.toFixed(1)} (wahrscheinlich ${s.tr.lo.toFixed(0)}–${s.tr.hi.toFixed(0)}, ${s.tr.n} Fahrten)` : 'Kein Trend am Ende (weniger als 3 gültige Fahrten in 42 Tagen).'); }
else out.push('', 'Keine gültige Fahrt.');
return out.join('\n');
