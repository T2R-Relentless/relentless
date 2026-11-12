#!/usr/bin/env python3
"""Liest out/simulation.json und gibt die Wochentabellen als Markdown aus (out/tabellen.md)."""
import json, os
D = os.path.dirname(os.path.abspath(__file__))
S = json.load(open(os.path.join(D, 'out', 'simulation.json'), encoding='utf-8'))
PH = {'base':'Basis','build':'Aufbau','peak':'Spitze','taper':'Taper'}
o = []
def h(m): return f"{int(m//60)}:{int(round(m%60)):02d}"
for k, s in S.items():
    if 'err' in s: o.append(f"## {k}: FEHLER {s['err']}"); continue
    o.append(f"\n### Profil {k} – {s['label']}\n")
    o.append(f"Start {s['start']}, {s['tot']} Wochen, Start-CTL (Annahme) {s['ctl0']}. Phasen: " + ', '.join(f"{p['name']} W{p['from']}–{p['to']}" for p in s['phases']) + f". Fitness-Checks in Woche {s['testWeeks']}.\n")
    o.append('| W | Phase | Std. | TSS App | TSS Struktur | Z1–2 % | Z3/SST % | Z4+ % | harte Tage | längste | CTL | ΔCTL | Form min | Kraft |')
    o.append('|--:|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|')
    for w in s['weeks']:
        z = w['z']; t = max(1, z['lo']+z['mid']+z['hi'])
        o.append(f"| {w['w']} | {PH.get(w['ph'], w['ph'])}{' (E)' if w['rec'] else ''}{' T' if w['test'] else ''} | {w['h']:.1f} | {w['tssApp']:.0f} | {w['tssReal']:.0f} | {z['lo']/t*100:.0f} | {z['mid']/t*100:.0f} | {z['hi']/t*100:.0f} | {w['hard']} | {h(w['maxSes'])} | {w['ctlReal']:.0f} | {w['rampReal']:+.1f} | {w['tsbMinReal']:+.0f} | {w['str']} |")
    W = s['weeks']; nt = [w for w in W if w['ph'] != 'taper']
    zs = {a: sum(w['z'][a] for w in nt) for a in ('lo','mid','hi')}; zt = sum(zs.values())
    o.append(f"\nKennzahlen: Ø {sum(w['h'] for w in nt)/len(nt):.1f} Std./Woche (ohne Taper), Verteilung gesamt Z1–2 {zs['lo']/zt*100:.0f} % / Z3–SST {zs['mid']/zt*100:.0f} % / Z4+ {zs['hi']/zt*100:.0f} %. "
             f"Höchster CTL-Anstieg in einer Woche: {max(w['rampReal'] for w in W):+.1f} (Struktur), {max(w['rampApp'] for w in W):+.1f} (App). "
             f"Größter Sprung der Wochenstunden: {max((W[i]['h']-W[i-1]['h'], W[i]['w']) for i in range(1,len(W)) if not W[i-1]['rec'])}. "
             f"Harte Tage direkt hintereinander: {s['consec']['hardHard']}, Schlüsseltage (inkl. Long Ride) hintereinander: {s['consec']['keyKey']}. "
             f"Kraft: {s['strength']['n']} Einheiten, davon {s['strength']['dayBeforeHard']} am Tag vor einer harten Radeinheit, {s['strength']['sameDayHard']} am selben Tag.")
    for e in s['events']:
        o.append(f"- {e['n']} (W{e['w']}): Form {e['tsbReal']:+.0f} (App-Rechnung {e['tsbApp']:+.0f}), CTL {e['ctlReal']:.0f} bei Höchstwert {e['peakReal']:.0f} (App {e['ctlApp']:.0f}/{e['peakApp']:.0f})")
    o.append(f"- FTP-Prognose: " + ', '.join(f"{p['weeks']} W: {p['mid']} W ({p['lo']}–{p['hi']})" for p in s['ftpProj']))
    o.append(f"- Zielprüfung: {s['evCheck']}; Plan-Check: {s['planCheck']}")
    o.append(f"- Event-Profil: {s['evProfile']}; Prognose: {s['forecast']}")
    o.append(f"- Doppeltage: {s['consec']['pairs'][:12]}")
    seen = set(); o.append('\nBeispielwochen (Mo–So):')
    for w in W:
        tag = (w['ph'], w['rec'], w['budget'])
        if tag in seen and w['w'] != s['tot']: continue
        seen.add(tag); o.append(f"- W{w['w']} {PH.get(w['ph'])}{' Entlastung' if w['rec'] else ''} ({w['budget']} h Budget, {w['nDays']} Tage): " + ' | '.join(w['ses']))
open(os.path.join(D, 'out', 'tabellen.md'), 'w', encoding='utf-8').write('\n'.join(o) + '\n')
print('\n'.join(o))
