#!/usr/bin/env node
// Führt die Browser-Tests (tests/index.html) ohne Klicken aus: startet tests/serve.py und Chrome ohne Fenster,
// wartet auf runAll() und gibt das Ergebnis aus. Rückgabewert 1, wenn ein Test fehlschlägt.
//
//   node tools/test.mjs              alle Tests
//   node tools/test.mjs --nur=plan   nur Tests, deren Datei oder Name passt (wie ?nur= auf der Testseite)
//   node tools/test.mjs --neu        Vergleichsstände neu schreiben (danach git diff tests/snapshots prüfen)
//
// Ohne Abhängigkeiten: Node ab 22 (eingebautes WebSocket) und Google Chrome oder Chromium.
// Chrome wird gesucht unter $CHROME, im macOS-Programmordner und im Pfad (google-chrome, chromium).
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const only = (args.find(a => a.startsWith('--nur=')) || '').slice(6);
const update = args.includes('--neu');
const PORT = 8700 + Math.floor(Math.random() * 60);
const DBG = PORT + 100;
const TIMEOUT_MS = 10 * 60 * 1000;

function findChrome() {
  const c = [process.env.CHROME,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'].filter(Boolean);
  for (const p of c) if (existsSync(p)) return p;
  for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { return execSync(`command -v ${n}`, { encoding: 'utf8' }).trim(); } catch {}
  }
  throw new Error('Chrome nicht gefunden. Pfad über die Umgebungsvariable CHROME angeben.');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFor(fn, what, ms = 20000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { const v = await fn(); if (v) return v; } catch {} await sleep(200); }
  throw new Error(`Zeitüberschreitung: ${what}`);
}

const procs = [];
let profile;
function cleanup() {
  for (const p of procs) { try { p.kill('SIGKILL'); } catch {} }
  if (profile) { try { rmSync(profile, { recursive: true, force: true }); } catch {} }
}
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));

async function main() {
  const server = spawn('python3', [join(ROOT, 'tests', 'serve.py'), String(PORT)], { stdio: 'ignore' });
  procs.push(server);
  await waitFor(async () => (await fetch(`http://127.0.0.1:${PORT}/tests/`)).ok, 'Testserver startet');

  profile = mkdtempSync(join(tmpdir(), 'relentless-chrome-'));
  const chrome = spawn(findChrome(), ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${profile}`,
    '--lang=de-DE', '--accept-lang=de-DE,de', '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--no-sandbox', '--mute-audio',
    '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  procs.push(chrome);
  const targets = await waitFor(async () => {
    const t = await (await fetch(`http://127.0.0.1:${DBG}/json/list`)).json();
    return t.find(x => x.type === 'page') && t;
  }, 'Chrome startet');
  const ws = new WebSocket(targets.find(x => x.type === 'page').webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
  };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

  await send('Runtime.enable');
  await send('Page.enable');
  const q = new URLSearchParams({ auto: update ? 'neu' : '' });
  if (only) q.set('nur', only);
  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/tests/?${q}` });
  await waitFor(async () => (await send('Runtime.evaluate', { expression: '!!window.__run', returnByValue: true })).result?.result?.value,
    'Testseite lädt');

  const t0 = Date.now();
  const r = await Promise.race([
    send('Runtime.evaluate', { expression: 'window.__run.then(x => JSON.stringify(x))', awaitPromise: true, returnByValue: true }),
    sleep(TIMEOUT_MS).then(() => { throw new Error('Tests laufen länger als 10 Minuten'); }),
  ]);
  if (r.result?.exceptionDetails) throw new Error('runAll() ist abgebrochen: ' + (r.result.exceptionDetails.exception?.description || r.result.exceptionDetails.text));
  const { passed, failed, results } = JSON.parse(r.result.result.value);
  const sec = ((Date.now() - t0) / 1000).toFixed(1);

  for (const x of results.filter(x => !x.ok)) {
    console.log(`✗ ${x.file} › ${x.name}`);
    if (x.msg) console.log('    ' + String(x.msg).split('\n').slice(0, 12).join('\n    '));
  }
  if (failed && errors.length) console.log(`\nUnbehandelte Fehler in der Testseite (${errors.length}):\n  ` + [...new Set(errors)].slice(0, 5).join('\n  '));
  console.log(`\n${failed ? '✗' : '✓'} ${passed} bestanden, ${failed} fehlgeschlagen (${sec} s)${only ? ` – Filter „${only}“` : ''}${update ? ' – Vergleichsstände neu geschrieben' : ''}`);
  if (results.length === 0) { console.log('Keine Tests gelaufen.'); return 1; }
  return failed ? 1 : 0;
}

main().then(code => process.exit(code), e => { console.error('Fehler:', e.message); process.exit(2); });
