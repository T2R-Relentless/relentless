#!/usr/bin/env python3
"""Vergleicht zwei Simulationsstände: python3 vergleich.py out/simulation-v177.json out/simulation.json"""
import json, re, sys
O, N = json.load(open(sys.argv[1])), json.load(open(sys.argv[2]))
def row(s):
    W = s['weeks']; ld = [w for w in W if w['ph'] != 'taper' and not w['rec'] and w['w'] > 1]; inv = 0
    for w in W:
        ms = [(x, int(re.search(r"(\d+)′", x).group(1))) for x in w['ses'] if '′' in x]
        lg = [m for x, m in ms if x.startswith(('Long Ride', 'Eventsim'))]; bs = [m for x, m in ms if x.startswith('Grundlage')]
        if lg and bs and max(bs) > lg[0]: inv += 1
    ba = [w for w in W if w['ph'] == 'base' and not w['rec'] and w['w'] > 4]; ev = s['events'][-1]
    z = lambda v: sum(x['z']['mid'] + x['z']['hi'] for x in v) / max(1, sum(x['z']['lo'] + x['z']['mid'] + x['z']['hi'] for x in v)) * 100
    return dict(nutz=sum(w['h'] / w['budget'] for w in ld) / len(ld) * 100, h=sum(w['h'] for w in ld) / len(ld), hartB=sum(w['hard'] for w in ba) / max(1, len(ba)), inv=inv,
                ramp=max(w['rampReal'] for w in W[:-1]), tsb=min(w['tsbMinReal'] for w in W), ctl=ev['ctlReal'], form=ev['tsbReal'], lang=max(w['maxSes'] for w in W[:-1]), zq=z(ld))
print('| Profil | Stand | Budgetnutzung | Std./Woche | harte Tage Basis (ab W5) | Grundlage länger als Long Ride | Zeit über Z2 | längste Einheit | max. ΔCTL | tiefste Form | Fitness am Event | Form am Event |')
print('|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|')
for k in 'ABCDE':
    for lab, s in (('vorher', O[k]), ('jetzt', N[k])):
        r = row(s); print(f"| {k} | {lab} | {r['nutz']:.0f} % | {r['h']:.1f} | {r['hartB']:.1f} | {r['inv']} Wochen | {r['zq']:.0f} % | {int(r['lang']//60)}:{int(r['lang']%60):02d} | {r['ramp']:+.1f} | {r['tsb']:+.0f} | {r['ctl']:.0f} | {r['form']:+.0f} |")
