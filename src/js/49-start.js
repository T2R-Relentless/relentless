/* Tageswechsel bei geöffneter App: neu aufbauen, sobald ein neuer Tag beginnt oder die App wieder sichtbar wird */
let _rDay = null;
function dayTick(){ const d = lstr(new Date()); if (d === _rDay) return; const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && !document.hidden) return; render(); }
setInterval(dayTick, 60000); document.addEventListener('visibilitychange', () => { if (!document.hidden) dayTick(); }); window.addEventListener('focus', dayTick); window.addEventListener('pageshow', dayTick);
function render(){
  const _fk = fkOf(document.activeElement), _fs = (() => { try { const a = document.activeElement; return a && a.selectionStart != null ? [a.selectionStart, a.selectionEnd] : null; } catch (e) { elog(e); return null; } })();
  _rDay = lstr(new Date());
  if (S && S.lang == null) S.lang = /^de/i.test(navigator.language || 'de') ? 'de' : 'en';
  themeApply(); try { if (S.p && S.step === 0) ftpTrack(); } catch (e) { elog(e); }
  syncNames();
  try { normDays(S.d); if (S.p) normDays(S.p); } catch (e) { elog(e); }
  if (S.d && S.d.perDay && S.d.mode !== 'light' && S.d.dayMin && S.d.avail) S.d.hours = Math.max(.5, dsum(S.d) / 60);
  if (S.p && S.p.perDay && S.p.dayMin && S.p.avail) S.p.hours = Math.max(.5, dsum(S.p) / 60);
  if (S.p && S.step === 0) { S.blocked = S.blocked || {}; const w = curWeek(S.p); whSnap(w); if (S.wk !== w || !S.plan || S.v !== 3 || S.plan.some(x => HARD.includes(x.t) && !x.iv && !x.adapted)) { S.v = 3; S.blocked = {}; if (S.plan && S.wk && S.wk !== w) { S.prevPlan = {w:S.wk, plan:S.plan, done:S.done || {}}; try { lgArchive(); } catch (e) { elog(e); } } S.wk = w; S.plan = genWeek(S.p, w); S.done = {}; S.log = []; S.note = ''; S.actual = {}; save(); } }
  document.getElementById('app').innerHTML = updBanner() + storeBanner() + (formMsg && S.step ? `<div role="alert" class="text-sm" style="background:#fdecea;color:#7a1f17;padding:10px 16px">${esc(formMsg)}</div>` : '') + bkUndoBar() + instBanner() + ((S.p && S.step === 0) ? dashboard() : onboarding()) + wkModal() + exModal() + sqView() + wnModal() + goalModal() + (exeShow ? exeModal() : (nextCheer(), (m => m || bkModal() || gtModal())(cheerModal()))); glHide(); postRender(document.getElementById('app')); darkFix(document.getElementById('app')); exAnimStart(); if (S.wx) setTimeout(() => wxFetch(), 0);
  flashIdx = null; fkAfter(_fk, _fs);
}
(function(){ try { const lib = readLib(), ids = Object.keys(lib.plans);
  if (!S.p && !S.newFrom && ids.length && S.step === 1) { const e = lib.plans[lib.active] || lib.plans[ids[0]]; applySnap(e.snap); S.pid = e.id; S.pname = e.name; S.step = 0; }
  if (S.p && !S.pid) { S.pid = uid(); S.pname = planName(S.p); } save();
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { elog(e); } })();
render();
gmAuto();
try { trInit(); } catch (e) { elog(e); }
try { gtInit(); } catch (e) { elog(e); }
try { updInit(); } catch (e) { elog(e); }
try { wnBoot(); setTimeout(wnCheck, 1500); } catch (e) { elog(e); }
try { const _npHd = heroDay; heroDay = function(p){ try { return _npHd(p); } finally { npOver = null; } }; const _npDc = dayCard; dayCard = function(...a){ try { return _npDc(...a); } finally { npOver = null; } }; } catch (e) { elog(e); }
try { const _bkSave = save; save = function(){ _bkSave(); bkMirrorSoon(); }; const _bkDr = doReset; doReset = function(){ bkPre('Vor dem Zurücksetzen'); _bkDr(); bkMirrorSoon(); }; const _bkDp = doDelPlan; doDelPlan = function(id){ bkPre('Vor dem Löschen eines Plans'); _bkDp(id); }; const _bkFin = finish; finish = function(){ const st = typeof editState === 'function' ? editState() : null, r = _bkFin.apply(this, arguments); if (S.step === 0 && st !== 'same') { bkMarkChange(); try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) { elog(e); } } return r; }; bkInit(); } catch (e) { elog(e); }
if ("serviceWorker" in navigator && /^https?:/.test(location.protocol)) navigator.serviceWorker.register("/sw.js").catch(() => {});
