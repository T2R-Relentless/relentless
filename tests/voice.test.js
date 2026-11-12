/* Sprachansagen: Zu jedem Satz, den die App sprechen kann, gibt es eine Datei im Manifest und auf der Platte */
R.file = 'voice';

test('Jeder Satz hat eine Sprachdatei (Deutsch und Englisch)', async () => {
  const a = await boot(); await a.w.i18nLoad();
  const man = await (await fetch('../public/audio/voice/manifest.json', {cache:'no-store'})).json();
  eq(man.voice, a.$('VC_VOICE'), 'gleiche Stimmen wie in der App');
  const cat = a.w.sqCatalog(), miss = [];
  for (const [l, en] of [['de', false], ['en', true]]) for (const t of cat[l]) if (!man.items[l][a.$('vcKey')(t, en)]) miss.push(l + ': ' + t);
  eq(miss, [], 'Sätze ohne Datei (neue Sätze brauchen neue Aufnahmen)');
  eq(Object.keys(man.items.de).length, cat.de.length, 'keine überzähligen deutschen Dateien');
  eq(Object.keys(man.items.en).length, cat.en.length, 'keine überzähligen englischen Dateien');
});

test('Alle Dateien aus dem Manifest sind vorhanden und abspielbar', async () => {
  const man = await (await fetch('../public/audio/voice/manifest.json', {cache:'no-store'})).json(), ctx = new OfflineAudioContext(1, 1, 24000), bad = [];
  for (const l of ['de', 'en']) for (const [k, [f, ms]] of Object.entries(man.items[l])) {
    const r = await fetch(`../public/audio/voice/${l}/${f}`); if (!r.ok) { bad.push(`${l}/${f}: HTTP ${r.status}`); continue; }
    try { const b = await ctx.decodeAudioData(await r.arrayBuffer()); if (Math.abs(b.duration * 1000 - ms) > 30) bad.push(`${l}/${f}: Dauer ${Math.round(b.duration * 1000)} statt ${ms} ms`); } catch (e) { bad.push(`${l}/${f}: nicht lesbar`); }
  }
  eq(bad, []);
});

test('Satzkatalog (Grundlage für tools/tts/generate.py)', async () => {
  /* Ändert sich ein gesprochener Satz, schlägt dieser Test an. Dann: Vergleichsstände neu schreiben und
     .tools/venv/bin/python tools/tts/generate.py ausführen (erzeugt fehlende Dateien, siehe LIESMICH). */
  const a = await boot(); await a.w.i18nLoad(); await snap('voice-katalog', 'katalog', a.w.sqCatalog());
});
