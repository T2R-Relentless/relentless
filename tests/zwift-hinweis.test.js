/* Fix: Nach einer erledigten (abgeschlossenen oder hochgeladenen) Einheit kein Hinweis „Zwift-Workouts neu exportieren“ */
R.file = 'zwift-hinweis';
test('Erledigte Einheit von heute löst keinen Neu-Export-Hinweis aus, echte Planänderung schon', async () => {
  const a = await boot(); makePlan(a, {goal:'ftp', ftpTarget:280});
  const t = a.$('todayIdx()');
  a.$(`S.plan[${t}] = {...S.plan[${t}], t:'thr', m:60, n:'Schwelle 3×10', lo:95, hi:105, iv:{reps:3, work:600, rest:300, lo:95, hi:105}}; save();`);
  a.$(`S.zxExp = {at:Date.now(), kind:'all', range:'all', last:zxItems('all','all').slice(-1)[0].day, m:zxMap(zxItems('all','all'))}; save();`);
  eq(a.$('zxDiff()'), null, 'direkt nach dem Export kein Hinweis');
  ok(a.$(`Object.keys(S.zxExp.m).includes(iso(0))`), 'heutige Einheit war im Export');
  a.$(`S.done[${t}] = true; zxMemo = {k:null, v:null}; save(); render();`);
  eq(a.$('zxDiff()'), null, 'nach „erledigt“ kein Hinweis');
  ok(!/neu exportieren/.test(a.page('home')), 'Startseite ohne Hinweis');
  const k = a.$(`zxItems('all','all').find(q => q.day > iso(0)).i`), w = a.$(`zxItems('all','all').find(q => q.day > iso(0)).w`);
  if (w === a.$('S.wk')) { a.$(`S.plan[${k}] = {...S.plan[${k}], m:S.plan[${k}].m + 30}; save();`); ok(a.$('zxDiff()') !== null, 'echte Änderung meldet weiter'); }
  a.noErrors();
});
