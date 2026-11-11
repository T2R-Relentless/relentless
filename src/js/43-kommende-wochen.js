/* ---------- B4: Änderungen an kommenden Wochen (Variante, Verschieben) ----------
   Kommende Wochen werden bei jedem Anzeigen aus dem Plan erzeugt (genWeek). Damit eine gewählte Variante oder eine
   Verschiebung erhalten bleibt, liegt sie als Änderungsliste in S.ov[w].ops (neben off/com der Woche) und wird beim
   Erzeugen der Woche der Reihe nach wieder angewendet – auch wenn die Woche zur laufenden Woche wird.
   var: {op:'var', i, vk, base, unit} – base ist die Signatur der ursprünglichen Einheit. Passt sie noch (z. B. nach
     einer FTP-Änderung, Wattwerte entstehen erst beim Anzeigen), wird die gespeicherte Variante übernommen. Hat sich
     die Einheit geändert (z. B. Zeitbudget), wird dieselbe Variante neu auf die Einheit angepasst und auf
     Gleichwertigkeit (±10 %) geprüft; klappt das nicht, bleibt das Original und die Karte zeigt einen Vorschlag.
   mv:  {op:'mv', i, j, mode, easy} – wie beim Verschieben in der laufenden Woche.
   Bearbeitet der Nutzer die laufende Woche direkt, gelten deren gespeicherte Änderungen als übernommen (woClearCur). */
function woOps(w){ const o = S.ov && S.ov[w]; return o && Array.isArray(o.ops) ? o.ops : []; }
function woAdd(w, op){ const o = ovw(w); o.ops = woOps(w).concat([op]); }
function woDel(w, k){ const o = S.ov && S.ov[w]; if (!o || !Array.isArray(o.ops)) return; o.ops = o.ops.filter((_, j) => j !== k); if (!o.ops.length) delete o.ops; try { if (!Object.keys(o.off || {}).length && !Object.keys(o.com || {}).length && !o.ops) delete S.ov[w]; } catch (e) { elog(e); } }
function woClearCur(){ const o = S.ov && S.ov[S.wk]; if (o && o.ops) { delete o.ops; try { cleanOv(S.wk); } catch (e) { elog(e); } } }
const woTpl = k => { for (const L of Object.values(VA_LIB)) { const T = L.find(t => t.k === k); if (T) return T; } return null; };
function woApply(P, w){
  const ops = woOps(w); if (!ops.length || !Array.isArray(P)) return P;
  let Q = P.map(x => ({...x})); const lost = [];
  ops.forEach((op, k) => { try {
    if (op.op === 'var') { if (!op.unit) return;
      /* Tag finden: gleiche Stelle mit derselben Einheit, sonst dieselbe Einheit an anderer Stelle (z. B. nach einer
         Budgetänderung), sonst eine Einheit mit demselben Reiz. Gibt es keine, bleibt die Woche unverändert und es
         erscheint ein Hinweis (kein stilles Überschreiben). */
      const own = q => q ? (q.vOrig ? q.vOrig : unsplit(q)) : null, same = j => { const b = own(Q[j]); return b && !Q[j].varOf && vaStim(b) && (op.bn ? b.n === op.bn : true); };
      let i = same(op.i) ? op.i : [0, 1, 2, 3, 4, 5, 6].find(same);
      if (i == null && op.st) i = [0, 1, 2, 3, 4, 5, 6].find(j => Q[j] && !Q[j].varOf && vaStim(own(Q[j])) === op.st);
      if (i == null) { lost.push({k, n:op.unit.n, bn:op.bn || ''}); return; }
      const g = Q[i], base = own(g), st = vaStim(base);
      if (paSig(base) === op.base) { Q[i] = {...op.unit, vOrig:base, varOf:base.n, ovk:k, ...(g.moved ? {moved:true, from:g.from} : {})}; return; }
      const T = woTpl(op.vk), y = T && st ? vaBuild(base, T, st) : null;
      Q[i] = y ? {...y, vOrig:base, varOf:base.n, ovk:k, vaRe:1, ...(g.moved ? {moved:true, from:g.from} : {})} : {...g, vaLost:op.unit.n, ovk:k};
    } else if (op.op === 'mv') { if (!Q[op.i] || !Q[op.j] || mvLocked(Q[op.i]) || mvLocked(Q[op.j])) return;
      Q = mvSimP(Q, op.i, op.j, op.mode); if (op.easy != null && Q[op.easy] && paHard(Q[op.easy])) Q[op.easy] = mvEasy(Q[op.easy]); }
  } catch (e) { elog(e); } });
  if (lost.length) Q.woLost = lost;
  return Q;
}
/* Hinweis über der Woche, wenn eine Variante nach einer Änderung keinen passenden Tag mehr hat */
function woNote(P, w){
  const L = P && P.woLost; if (!L || !L.length || !(S.wk && w >= S.wk)) return '';
  return L.map(x => `<div class="panel p-3 text-sm" style="border-left:3px solid var(--teal)"><p>Deine Variante „<span data-noi18n>${esc(x.n)}</span>“${x.bn ? ` (statt „<span data-noi18n>${esc(x.bn)}</span>“)` : ''} passt nach der Änderung nicht mehr in diese Woche. Die Woche bleibt, wie sie jetzt geplant ist. Wähle bei Bedarf an einem Tag eine neue Variante.</p><button class="ghost mt-2 !w-auto !px-3 text-sm" style="min-height:44px" onclick="woDel(${ja(w)},${ja(x.k)});save();render()">Hinweis entfernen</button></div>`).join('');
}
/* Tageskarte in kommenden Wochen: Verschieben, Andere Variante, Original, Hinweise */
function woCtl(x, i){
  const w = typeof strWeek === 'number' ? strWeek : 0; if (!(S.wk && w > S.wk) || !x) return '';
  const b = (fn, l) => `<button onclick="${fn}" class="ghost !py-2 text-sm">${l}</button>`;
  let h = '';
  if (x.vaLost) h += `<p class="w-full text-sm" style="color:var(--mute)">Deine Variante „<span data-noi18n>${esc(x.vaLost)}</span>“ passt nach der Änderung nicht mehr zu dieser Einheit. Wähle eine neue Variante oder behalte das Original.</p>`;
  else if (x.vaRe) h += `<p class="w-full text-sm" style="color:var(--mute)">Deine Variante wurde an die geänderte Einheit angepasst (gleicher Reiz, Belastung innerhalb von ±10 %).</p>`;
  if (x.m > 0 && !mvLocked(x) && mvTargets(i, w).length) h += b(`mvAskGo(${ja(i)})`, 'Verschieben');
  if (vaStim(x.vOrig || x)) h += b(`vaOpen(${ja(i)})`, 'Andere Variante');
  if (x.ovk != null && (x.vOrig || x.vaLost)) h += b(`vaReset(${ja(i)},${ja(w)})`, x.vaLost ? 'Original behalten' : 'Zurück zum Original');
  return h;
}

