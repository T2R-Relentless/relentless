/* ---------- Phase 2: Fokus, Dialoge, Plausibilität, Dateigrenzen, Fehlermeldungen ---------- */
/* F-11: Fokus über das Neuzeichnen retten. Jedes fokussierte Element bekommt einen Schlüssel aus ID bzw. Tag, Handler,
   Beschriftung und Text. Nach render() wird das passende Element wieder fokussiert (ohne zu scrollen). */
function fkOf(el){
  if (!el || el === document.body || el === document.documentElement || !el.tagName) return null;
  if (el.id) return {id:el.id};
  const at = n => el.getAttribute(n) || '';
  return {tag:el.tagName, h:at('onclick') || at('oninput') || at('onchange'), l:at('aria-label'), t:el.type || '', x:(el.textContent || '').trim().slice(0, 40)};
}
function fkFind(k){
  if (!k) return null; if (k.id) return document.getElementById(k.id);
  const c = [...document.querySelectorAll(k.tag)].filter(e => ((e.getAttribute('onclick') || e.getAttribute('oninput') || e.getAttribute('onchange') || '') === k.h) && (e.getAttribute('aria-label') || '') === k.l && (e.type || '') === k.t);
  return c.find(e => (e.textContent || '').trim().slice(0, 40) === k.x) || (c.length === 1 ? c[0] : null);
}
let fkDlgOpener = null, fkDlgOn = false;
const FK_SEL = 'button:not([disabled]), [href], input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), summary';
function fkDialog(){ const d = [...document.querySelectorAll('[aria-modal="true"]')].pop(); return d && d.offsetParent !== null ? d : (d || null); }
function fkAfter(prev, sel){
  const d = fkDialog();
  if (d) {
    if (!fkDlgOn) { fkDlgOn = true; fkDlgOpener = prev; }
    if (!d.contains(document.activeElement)) {
      const back = prev && fkFind(prev); if (back && d.contains(back)) { try { back.focus({preventScroll:true}); } catch (e) { elog(e); } return; }
      const f = d.querySelector(FK_SEL); if (!d.hasAttribute('tabindex')) d.setAttribute('tabindex', '-1');
      try { (f || d).focus({preventScroll:true}); } catch (e) { elog(e); }
    }
    return;
  }
  if (fkDlgOn) { fkDlgOn = false; const o = fkFind(fkDlgOpener); fkDlgOpener = null; if (o) { try { o.focus({preventScroll:true}); } catch (e) { elog(e); } return; } }
  const el = fkFind(prev); if (!el || el === document.activeElement) return;
  try { el.focus({preventScroll:true}); if (sel && 'selectionStart' in el && el.value != null && typeof el.setSelectionRange === 'function' && /^(text|search|url|tel|password)?$/.test(el.type || '')) el.setSelectionRange(sel[0], sel[1]); } catch (e) { elog(e); }
}
try { document.addEventListener('keydown', e => {
  const d = fkDialog(); if (!d) return;
  if (e.key === 'Escape') {
    if (e.defaultPrevented) return;
    const oc = d.getAttribute('onclick') || '';
    if (/event\.target\s*===\s*this/.test(oc)) { e.preventDefault(); d.click(); return; }
    const c = [...d.querySelectorAll('button')].find(b => /schließen|abbrechen|close|cancel|später|later/i.test((b.getAttribute('aria-label') || '') + ' ' + b.textContent) || /^\s*[✕×]\s*$/.test(b.textContent));
    if (c) { e.preventDefault(); c.click(); }
    return;
  }
  if (e.key === 'Tab') {
    const f = [...d.querySelectorAll(FK_SEL)].filter(x => x.offsetParent !== null); if (!f.length) { e.preventDefault(); return; }
    const a = document.activeElement, i = f.indexOf(a);
    if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
  }
}); } catch (e) { elog(e); }

/* F-14: Plausibilitätsgrenzen. Begründung siehe README:
   FTP 50–600 W (unter 50 W ist kein Radtraining planbar, über 600 W liegt über Weltklasse-Werten),
   Körpergewicht 30–200 kg, Trainingsumfang 1–30 Std. pro Woche (Profis kommen auf etwa 20–30 Std.). */
const RNG = {ftp:[50, 600, 'FTP', 'W'], weight:[30, 200, 'Körpergewicht', 'kg'], hours:[1, 30, 'Trainingsstunden pro Woche', 'Std.']};
const rngBad = (k, v) => { const r = RNG[k]; if (!r || v === '' || v == null) return null; const n = Number(v); if (!isFinite(n) || n === 0) return null; return n < r[0] || n > r[1] ? `${r[2]}: bitte einen Wert zwischen ${r[0]} und ${r[1]} ${r[3]} eintragen.` : null; };
const rngClamp = (k, v, def) => { const r = RNG[k], n = Number(v); if (!isFinite(n) || n <= 0) return def; return Math.min(r[1], Math.max(r[0], n)); };
function rngHint(k, v){
  try { document.querySelectorAll(`input[oninput*="draft('${k}'"]`).forEach(el => {
    const m = rngBad(k, v); let h = el.parentElement && el.parentElement.querySelector('.rng-msg');
    if (m) { el.setAttribute('aria-invalid', 'true'); if (!h) { h = document.createElement('span'); h.className = 'rng-msg mt-1 block text-xs'; h.style.color = '#b42318'; h.setAttribute('role', 'alert'); el.insertAdjacentElement('afterend', h); } h.textContent = m; try { postRender(h.parentElement); } catch (e) { elog(e); } }
    else { el.removeAttribute('aria-invalid'); if (h) h.remove(); }
  }); } catch (e) { elog(e); }
}
const rngFirst = d => { for (const k of Object.keys(RNG)) { if (k === 'hours' && d.perDay) continue; const m = rngBad(k, d[k]); if (m) return m; } return null; };
let formMsg = '';

/* F-18 / F-22: Dateien sicher lesen. Technische Fehler (DataView, ungültige Daten) werden zu verständlichen Meldungen,
   Archive haben Größengrenzen gegen ZIP-/GZ-Bomben. */
const RIDE_MAX_IN = 50e6, RIDE_MAX_OUT = 150e6;
const rideErr = e => (e instanceof Error && e.constructor === Error && e.message) ? e : new Error('Die Datei ist unvollständig oder beschädigt und lässt sich nicht lesen.');
{ const _w = fn => function(){ try { const r = fn.apply(this, arguments); return r && typeof r.then === 'function' ? r.catch(e => { throw rideErr(e); }) : r; } catch (e) { throw rideErr(e); } };
  parseFIT = _w(parseFIT); parseGPX = _w(parseGPX); parseTCX = _w(parseTCX); unpack = _w(unpack); }
