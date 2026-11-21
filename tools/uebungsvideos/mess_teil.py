# Messen statt beurteilen: schnelle Auflage-Messung (numpy), grobe Gelenkgrenzen, Durchdringung und Sichtbarkeit im Bild.
# Wird von uebungen.py eingebunden (nach den Messfunktionen low/lowpts/lowg, die hier durch schnelle Fassungen ersetzt werden).
import numpy as np

_MASKE = {}
def _welt(ob):
    """Weltkoordinaten aller Punkte des verformten Netzes als Feld (n, 3)"""
    e = ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); n = len(e.data.vertices)
    a = np.empty(n * 3, dtype=np.float32); e.data.vertices.foreach_get('co', a)
    m = np.array(e.matrix_world, dtype=np.float64); return a.reshape(n, 3).astype(np.float64) @ m[:3, :3].T + m[:3, 3]
def _maske(ob, key, fn):
    k = (ob.name, key)
    if k not in _MASKE:
        sk = _SKIP[ob.name]; _MASKE[k] = np.array([v.index not in sk and bool(fn(v)) for v in ob.data.vertices], dtype=bool)
    return _MASKE[k]
def _tief(ob, mk): return float(_welt(ob)[mk, 2].min()) if mk.any() else 9
def low(groups=None):
    """tiefster Punkt (z) der Figur oder nur der Punkte mit Gewicht > 0,3 in den genannten Knochengruppen"""
    m = 9
    for ob in MESHES:
        if groups is None: mk = _maske(ob, ('alle',), lambda v: True)
        else:
            gi = frozenset(ob.vertex_groups[g].index for g in groups if g in ob.vertex_groups)
            if not gi: continue
            mk = _maske(ob, ('low', gi), lambda v: any(g.group in gi and g.weight > .3 for g in v.groups))
        m = min(m, _tief(ob, mk))
    return m
def lowpts(pred, objs=None):
    """tiefster Punkt (z) aller Punkte, deren Ruhelage pred(co, ob) erfüllt"""
    key = ('pts', pred.__code__, tuple(c.cell_contents for c in (pred.__closure__ or ()))); m = 9
    for ob in (objs or MESHES): m = min(m, _tief(ob, _maske(ob, key, lambda v: pred(v.co, ob))))
    return m
def lowg(groups, wmin=.3):
    m = 9
    for ob in MESHES:
        gi = frozenset(ob.vertex_groups['mixamorig:' + g].index for g in groups if 'mixamorig:' + g in ob.vertex_groups)
        if not gi: continue
        m = min(m, _tief(ob, _maske(ob, ('lowg', gi, wmin), lambda v: any(g.group in gi and g.weight > wmin for g in v.groups))))
    return m

# ---------------- grobe Gelenkgrenzen (gesunde Erwachsene, großzügig gerundet) ----------------
# Die Zerlegung in Einzelwinkel ist bei kombinierten Bewegungen nur eine Näherung: Überschreitungen sind Hinweise zum Nachsehen.
GRENZEN = {'Knie Beugung': 155, 'Knie Überstreckung': 8, 'Knie verdreht': 35, 'Sprunggelenk hochgezogen': 28, 'Sprunggelenk gestreckt': 90,
           'Fuß verkantet': 35, 'Hüfte Beugung': 135, 'Hüfte Streckung': 30, 'Hüfte Abspreizen': 60, 'Hüfte Heranführen': 35,
           'Ellbogen Beugung': 155, 'Ellbogen Überstreckung': 10, 'Handgelenk': 85, 'Arm nach hinten': 65, 'Kopf geneigt': 60,
           'Kopf gedreht': 85, 'Rumpf gebeugt': 75, 'Rumpf gedreht': 60}
def _ach(name, v):
    """Weltrichtung einer Achse, die in der Ruhelage in Weltrichtung v zeigt (vorn = −Y, oben = +Z, links der Person = +X)"""
    pb = B(name); return ((rig.matrix_world @ pb.matrix).to_3x3() @ (pb.bone.matrix_local.to_3x3().inverted() @ Vector(v))).normalized()
def _w(a, b): return math.degrees(a.angle(b)) if a.length > 1e-6 and b.length > 1e-6 else 0.0
def _ruhe(a, b, c):
    """Winkel a–b–c in der Ruhelage des Skeletts"""
    h = lambda n: rig.data.bones['mixamorig:' + n].head_local
    return _w(h(a) - h(b), h(c) - h(b))
def gelenke():
    """alle gemessenen Winkel als {Name: Grad}; Seiten heißen wie bei der Person (links/rechts)"""
    w = {}; bpy.context.view_layer.update()
    pf, pd = _ach('Hips', (0, -1, 0)), _ach('Hips', (0, 0, -1)); cf, cu, pu = _ach('Spine2', (0, -1, 0)), _ach('Spine2', (0, 0, 1)), _ach('Hips', (0, 0, 1))
    for sd, nm, sx in (('Left', 'links', 1), ('Right', 'rechts', -1)):
        H, K, A, T = wpos(sd + 'UpLeg'), wpos(sd + 'Leg'), wpos(sd + 'Foot'), wpos(sd + 'ToeBase'); t = (K - H).normalized(); s = (A - K).normalized()
        kb = 180 - _w(H - K, A - K); kr = 180 - _ruhe(sd + 'UpLeg', sd + 'Leg', sd + 'Foot'); w[f'Knie Beugung {nm}'] = kb - kr
        # Überstreckung: Das Knie knickt zur Kniescheibe hin statt von ihr weg
        if kb - kr > 4 and (s - t * s.dot(t)).dot(fwd(sd + 'UpLeg')) > 0: w[f'Knie Überstreckung {nm}'] = kb - kr
        if kb - kr > 30:
            sp = -(s - t * s.dot(t)); kc = fwd(sd + 'UpLeg'); kc = kc - t * kc.dot(t); w[f'Knie verdreht {nm}'] = _w(sp, kc)
        d = _w(K - A, T - A) - _ruhe(sd + 'Leg', sd + 'Foot', sd + 'ToeBase'); w[f'Sprunggelenk {"gestreckt" if d > 0 else "hochgezogen"} {nm}'] = abs(d)
        w[f'Fuß verkantet {nm}'] = _w(_ach(sd + 'Foot', (1, 0, 0)), _ach(sd + 'Leg', (1, 0, 0)))
        pl = _ach('Hips', (sx, 0, 0)); tf, td, tl = t.dot(pf), t.dot(pd), t.dot(pl); beu = math.degrees(math.atan2(tf, td))
        w[f'Hüfte {"Beugung" if beu >= 0 else "Streckung"} {nm}'] = abs(beu)
        sei = math.degrees(math.asin(max(-1, min(1, tl))))
        if sei < 0: w[f'Hüfte Heranführen {nm}'] = -sei
        elif td > .6: w[f'Hüfte Abspreizen {nm}'] = sei     # bei gebeugter Hüfte ist seitliches Öffnen bis 90° normal
        S, E, W_, F = wpos(sd + 'Arm'), wpos(sd + 'ForeArm'), wpos(sd + 'Hand'), wpos(sd + 'HandMiddle1'); eb = 180 - _w(S - E, W_ - E)
        w[f'Ellbogen Beugung {nm}'] = eb; w[f'Handgelenk {nm}'] = _w(W_ - E, F - W_)
        a = (E - S).normalized()
        if a.dot(cf) < -.15: w[f'Arm nach hinten {nm}'] = _w(a, -cu)
    hu, hf = _ach('Head', (0, 0, 1)), _ach('Head', (0, -1, 0)); w['Kopf geneigt'] = _w(hu, cu)
    w['Kopf gedreht'] = _w(hf - cu * hf.dot(cu), cf - cu * cf.dot(cu)); w['Rumpf gebeugt'] = _w(cu, pu)
    w['Rumpf gedreht'] = _w(cf - pu * cf.dot(pu), pf - pu * pf.dot(pu))
    return w
def gelenk_hinweise(w):
    out = []
    for k, v in w.items():
        g = next((gv for gk, gv in GRENZEN.items() if k.startswith(gk)), None)
        if g is not None and v > g: out.append(f'{k}: {v:.0f}° (üblich bis {g}°)')
    return out

# ---------------- Durchdringung: Glieder als Röhren, Abstand der Achsen gegen ihre Dicke ----------------
_ROHR = [('Oberschenkel links', 'LeftUpLeg', 'LeftLeg', .07), ('Oberschenkel rechts', 'RightUpLeg', 'RightLeg', .07), ('Unterschenkel links', 'LeftLeg', 'LeftFoot', .045),
         ('Unterschenkel rechts', 'RightLeg', 'RightFoot', .045), ('Oberarm links', 'LeftArm', 'LeftForeArm', .04), ('Oberarm rechts', 'RightArm', 'RightForeArm', .04),
         ('Unterarm links', 'LeftForeArm', 'LeftHand', .032), ('Unterarm rechts', 'RightForeArm', 'RightHand', .032), ('Rumpf', 'Spine', 'Neck', .12), ('Kopf', 'Head', 'HeadTop_End', .08)]
_NACHBAR = {frozenset(p) for p in (('Oberschenkel links', 'Unterschenkel links'), ('Oberschenkel rechts', 'Unterschenkel rechts'), ('Oberarm links', 'Unterarm links'),
            ('Oberarm rechts', 'Unterarm rechts'), ('Rumpf', 'Oberarm links'), ('Rumpf', 'Oberarm rechts'), ('Rumpf', 'Oberschenkel links'), ('Rumpf', 'Oberschenkel rechts'), ('Rumpf', 'Kopf'),
            ('Oberschenkel links', 'Oberschenkel rechts'))}
def _abstand(p1, q1, p2, q2):
    """kleinster Abstand zweier Strecken"""
    d1, d2, r = q1 - p1, q2 - p2, p1 - p2; a, e, f = d1.dot(d1), d2.dot(d2), d2.dot(r)
    if a < 1e-9 and e < 1e-9: return r.length
    if a < 1e-9: s, t = 0.0, max(0, min(1, f / e))
    else:
        c = d1.dot(r)
        if e < 1e-9: t, s = 0.0, max(0, min(1, -c / a))
        else:
            b = d1.dot(d2); den = a * e - b * b; s = max(0, min(1, (b * f - c * e) / den)) if den > 1e-9 else 0.0; t = (b * s + f) / e
            if t < 0: t, s = 0.0, max(0, min(1, -c / a))
            elif t > 1: t, s = 1.0, max(0, min(1, (b - c) / a))
    return ((p1 + d1 * s) - (p2 + d2 * t)).length
def durchdringung():
    out = []; seg = []
    for nm, a, b, r in _ROHR:
        if 'mixamorig:' + b in PB: seg.append((nm, wpos(a), wpos(b), r))
        else: seg.append((nm, wpos(a), wpos(a, True), r))
    for i, (n1, a1, b1, r1) in enumerate(seg):
        for n2, a2, b2, r2 in seg[i + 1:]:
            if frozenset((n1, n2)) in _NACHBAR: continue
            d = _abstand(a1, b1, a2, b2)
            if d < .5 * (r1 + r2): out.append(f'{n1} und {n2}: Achsen nur {d * 100:.0f} cm auseinander (Dicke zusammen {(r1 + r2) * 100:.0f} cm)')
    return out

# ---------------- Sichtbarkeit: Welcher Anteil von Kopf, Händen und Füßen ist aus der Kamera zu sehen? ----------------
def _teile():
    if 'teile' in _MASKE: return _MASKE['teile']
    def grp(ob, names, wmin=.5):
        gi = {ob.vertex_groups['mixamorig:' + n].index for n in names if 'mixamorig:' + n in ob.vertex_groups}
        return _maske(ob, ('teil', frozenset(gi)), lambda v: any(g.group in gi and g.weight > wmin for g in v.groups))
    t = {'Kopf': (bm, grp(bm, ['Head'])), 'Hand links': (bm, grp(bm, HAND('Left'))), 'Hand rechts': (bm, grp(bm, HAND('Right')))}
    if shoes:
        t['Fuß links'] = (shoes, _maske(shoes, ('fl',), lambda v: v.co.x > 0)); t['Fuß rechts'] = (shoes, _maske(shoes, ('fr',), lambda v: v.co.x < 0))
    _MASKE['teile'] = t; return t
def sichtbar(kamera=None):
    """{Teil: (Anteil sichtbarer Punkte, im Bildausschnitt?)}; ein frei sichtbares Teil erreicht etwa 0,4–0,5 (die Rückseite zählt nie)"""
    k = kamera or sc.camera; d = (k.matrix_world.to_3x3() @ Vector((0, 0, 1))).normalized(); Mi = k.matrix_world.inverted()
    bw = k.data.ortho_scale / 2; bh = bw * sc.render.resolution_y / sc.render.resolution_x; out = {}
    pkt = {nm: _welt(ob)[mk] for nm, (ob, mk) in _teile().items()}
    # Hilfsgeometrie der Grundfigur (Hüllen um Kopf und Körper) für die Sichtprüfung ausblenden, sonst verdeckt sie alles
    mm = [m for ob in MESHES for m in ob.modifiers if m.type == 'MASK' and not m.show_viewport]
    for m in mm: m.show_viewport = True
    bpy.context.view_layer.update(); deps = bpy.context.evaluated_depsgraph_get()
    for nm, P_ in pkt.items():
        if not len(P_): continue
        P_ = P_[::max(1, len(P_) // 80)]; frei = 0; drin = 0
        for p in P_:
            v = Vector(p); l = Mi @ v; drin += abs(l.x) <= bw and abs(l.y) <= bh
            frei += not sc.ray_cast(deps, v + d * .006, d)[0]
        out[nm] = (frei / len(P_), drin / len(P_) > .9)
    for m in mm: m.show_viewport = False
    bpy.context.view_layer.update(); return out
# ---------------- Geräte (Kraftübungen): tragende Flächen, Auflage und Durchdringung ----------------
# Die Quader stehen in KR_GERAET[EX] (kraft_teil.py). Ohne Geräte ändert sich an den Messungen nichts.
def _kr_quader(): return globals().get('KR_GERAET', {}).get(EX, [])
def _kr_alle():
    return np.concatenate([_welt(ob)[_maske(ob, ('alle',), lambda v: True)] for ob in MESHES])
def kr_stuetze(P_):
    """Höhe der tragenden Fläche unter jedem Punkt (n, 3): Oberseite eines Kastens oder Bankpolsters, wenn der Punkt über dessen
    Grundfläche und über dessen Unterkante liegt (unter dem Bankpolster ist frei), sonst die Matte (0)"""
    s = np.zeros(len(P_))
    for g in _kr_quader():
        if not g['traegt']: continue
        x0, x1, y0, y1, z0, z1 = g['b']
        m = (P_[:, 0] >= x0) & (P_[:, 0] <= x1) & (P_[:, 1] >= y0) & (P_[:, 1] <= y1) & (P_[:, 2] > z0)
        s = np.where(m, np.maximum(s, z1), s)
    return s
def kr_abstand():
    """kleinster Abstand der Figur zur tragenden Fläche darunter (Matte oder Gerät); < 0: sinkt ein"""
    P_ = _kr_alle(); return float((P_[:, 2] - kr_stuetze(P_)).min())
def _kr_gruppe(ob, groups, wmin=.5):
    gi = frozenset(ob.vertex_groups['mixamorig:' + g].index for g in groups if 'mixamorig:' + g in ob.vertex_groups)
    return _maske(ob, ('lowg', gi, wmin), lambda v: any(g.group in gi and g.weight > wmin for g in v.groups)) if gi else None
def kr_hoechst(groups, wmin=.5):
    """höchster Punkt (z) der Punkte in den Knochengruppen"""
    m = -9
    for ob in MESHES:
        mk = _kr_gruppe(ob, groups, wmin)
        if mk is not None and mk.any(): m = max(m, float(_welt(ob)[mk, 2].max()))
    return m
def kr_luecke(name, groups=None, voll=False):
    """Abstand der Figur (oder der Knochengruppen) zur Oberseite des Geräts name, nur über dessen Grundfläche; 9: nichts darüber.
    voll: das Gerät gilt bis zum Boden als massiv (auch Punkte unter dem Polster zählen, z. B. der Rücken an der Bankkante)"""
    g = next((g for g in _kr_quader() if g['name'] == name), None)
    if g is None: return 9
    x0, x1, y0, y1, z0, z1 = g['b']; m = 9
    for ob in MESHES:
        mk = _maske(ob, ('alle',), lambda v: True) if groups is None else _kr_gruppe(ob, groups, .3)
        if mk is None or not mk.any(): continue
        P_ = _welt(ob)[mk]; s = (P_[:, 0] >= x0) & (P_[:, 0] <= x1) & (P_[:, 1] >= y0) & (P_[:, 1] <= y1) & (P_[:, 2] > (0 if voll else z0))
        if s.any(): m = min(m, float((P_[s, 2] - z1).min()))
    return m
def kr_eindringen():
    """je Gerät und Netz (Körper, Hose, Schuhe, Haare): größte Eindringtiefe (m), Zahl der Punkte mehr als 1 cm im Quader, tiefster Punkt"""
    out = []
    for ob in MESHES:
        P_ = _welt(ob)[_maske(ob, ('alle',), lambda v: True)]
        for g in _kr_quader():
            x0, x1, y0, y1, z0, z1 = g['b']
            t = np.minimum.reduce([P_[:, 0] - x0, x1 - P_[:, 0], P_[:, 1] - y0, y1 - P_[:, 1], P_[:, 2] - z0, z1 - P_[:, 2]])
            if (t > .01).any(): k = int(t.argmax()); out.append((g['name'], ob.name, float(t[k]), int((t > .01).sum()), P_[k]))
    return out
def kr_hinweise():
    z = [f'Gerät – {o} steckt bis {d * 100:.1f} cm in {n} ({k} Punkte, tiefster bei {p[0]:.2f} {p[1]:.2f} {p[2]:.2f})' for n, o, d, k, p in kr_eindringen()]
    for n in globals().get('cfg', {}).get('auflage', ()):
        l_ = kr_luecke(n)
        if l_ > .012: z.append(f'Auflage – {n}: Figur {"liegt nicht darüber" if l_ >= 9 else f"{l_ * 100:.1f} cm über der Fläche"} (soll aufliegen)')
    return z
# ---------------- Kopf in Verlängerung des Rumpfs (Kraftübungen) ----------------
def kopf_linie():
    """Kopf in Verlängerung des Rumpfs: Winkel (Grad) der Linie Schulter → Ohr gegen die Rumpflinie Hüfte → Schulter, in
    Weltkoordinaten (Schulter, Hüfte: Mitte der Gelenke; Ohr: Mitte der Ohrpunkte). 0 = Ohr, Schulter und Hüfte auf einer Linie,
    + Kopf nach vorn bzw. zum Boden gesenkt, − Kopf in den Nacken gelegt."""
    eg = bm.vertex_groups.get('ears')
    mk = _maske(bm, ('ohr',), lambda v: any(g.group == eg.index and g.weight > .5 for g in v.groups))
    O = Vector(_welt(bm)[mk].mean(axis=0)); S = (wpos('LeftArm') + wpos('RightArm')) / 2; H = (wpos('LeftUpLeg') + wpos('RightUpLeg')) / 2
    t = (S - H).normalized(); k = O - S; vorn = _ach('Spine2', (0, -1, 0)); vorn = (vorn - t * vorn.dot(t)).normalized()
    w = math.degrees(math.atan2(k.dot(vorn), k.dot(t)))
    if any(a_ == 'kopfdbg=1' for a_ in args): print('KOPFDBG Ohr', [round(c, 3) for c in O], 'Schulter', [round(c, 3) for c in S], 'Hüfte', [round(c, 3) for c in H], 'w', round(w, 1))
    return w
def kr_blickwinkel():
    """Höhenwinkel (Grad) der Linie Ohr → Auge in der Körpermittelebene (Person schaut nach −Y): + nach oben, − nach unten"""
    eg = bm.vertex_groups.get('ears'); mk = _maske(bm, ('ohr',), lambda v: any(g.group == eg.index and g.weight > .5 for g in v.groups))
    f = Vector(_welt(eyes).mean(axis=0)) - Vector(_welt(bm)[mk].mean(axis=0)); return math.degrees(math.atan2(f.z, -f.y)), Vector(_welt(eyes).mean(axis=0))
def kopf_kontur(von='fuss'):
    """Kopf über die Kontur: Mittelpunkt aller Kopfpunkte (Netz) gegen die Gerade Fuß–Schulter (Mitte der Fußgelenke → Mitte der
    Schultergelenke; von='huefte': Hüfte–Schulter, wenn der Körper in der Hüfte abknickt). Gibt den senkrechten Versatz (Vektor, m) zurück."""
    Hc = Vector(_kr_punkte(['Head'], .5).mean(axis=0)); S_ = (wpos('LeftArm') + wpos('RightArm')) / 2
    A = (wpos('LeftFoot') + wpos('RightFoot')) / 2 if von == 'fuss' else (wpos('LeftUpLeg') + wpos('RightUpLeg')) / 2
    t = (S_ - A).normalized(); d = Hc - A; return d - t * d.dot(t)
def kopf_hinweise():
    w = kopf_linie(); z = []
    if abs(w) >= 10: z.append(f'Kopf – Ohr {abs(w):.0f}° {"vor bzw. unter" if w > 0 else "hinter bzw. über"} der Linie Hüfte–Schulter (soll in Verlängerung des Rumpfs liegen)')
    return z
    return []

# ---------------- Hanteln: Hand am Gerät, Durchdringung mit dem Körper ----------------
def _kr_hanteln(): return globals().get('KR_HANTELN', [])
def _kr_hantel_sd(ob, P_):
    """vorzeichenbehafteter Abstand (m) der Punkte P_ (n, 3) zur Hantel ob (Griff und Scheiben als Zylinder; < 0: im Gerät)"""
    p = dict(ob['kr']); M = np.array(ob.matrix_world.inverted(), dtype=np.float64); L = P_ @ M[:3, :3].T + M[:3, 3]
    rq = np.hypot(L[:, 0], L[:, 1]); z = L[:, 2]
    def zyl(R, zc, hh):
        qx = rq - R; qy = np.abs(z - zc) - hh
        return np.minimum(np.maximum(qx, qy), 0) + np.hypot(np.maximum(qx, 0), np.maximum(qy, 0))
    rs = p['r'] * .93          # Sechseck als Zylinder mit mittlerem Radius
    d = zyl(.016, 0.0, (p['griff'] + p['dicke']) / 2)
    for sg in (-1, 1): d = np.minimum(d, zyl(rs, sg * (p['griff'] + p['dicke']) / 2, p['dicke'] / 2))
    return d
def _kr_punkte(groups, wmin=.5):
    gi = frozenset(bm.vertex_groups['mixamorig:' + g].index for g in groups if 'mixamorig:' + g in bm.vertex_groups)
    mk = _maske(bm, ('lowg', gi, wmin), lambda v: any(g.group in gi and g.weight > wmin for g in v.groups)); return _welt(bm)[mk]
def hand_geraet():
    """je Hantel und greifender Hand: Abstand der Handfläche zur Hantel, Abstand und Eindringen der Fingerspitzen (m)"""
    out = []
    for ob, sides in _kr_hanteln():
        for sd in sides:
            pa = _kr_hantel_sd(ob, _kr_punkte([sd + 'Hand'], .05))   # Handfläche: Gewichte der Hand sind in dieser Figur höchstens 0,2
            sp = {}; sp = {}
            for f in ('Thumb', 'Index', 'Middle', 'Ring', 'Pinky'):
                d = _kr_hantel_sd(ob, _kr_punkte([sd + 'Hand' + f + '3'], .5))
                if len(d): sp[f] = (float(d.min()), float(d.max()))
            out.append((ob.name, sd, float(pa.min()) if len(pa) else 9, sp))
    return out
_FINGER = {'Thumb': 'Daumen', 'Index': 'Zeigefinger', 'Middle': 'Mittelfinger', 'Ring': 'Ringfinger', 'Pinky': 'kleiner Finger'}
def hand_hinweise():
    z = []
    for nm, sd, pa, sp in hand_geraet():
        hd = 'linke' if sd == 'Left' else 'rechte'
        if pa > .015: z.append(f'Griff – {hd} Hand: Handfläche {pa * 100:.1f} cm von {nm} entfernt (soll anliegen)')
        if pa < -.01: z.append(f'Griff – {hd} Hand: Handfläche steckt {-pa * 100:.1f} cm in {nm}')
        tief = [f'{_FINGER[f]} {-a * 100:.1f} cm' for f, (a, b) in sp.items() if a < -.005]
        weg = [f'{_FINGER[f]} {a * 100:.1f} cm' for f, (a, b) in sp.items() if a > .015 and f != 'Thumb']
        if tief: z.append(f'Griff – {hd} Hand: Fingerspitzen stecken in {nm}: ' + ', '.join(tief))
        if len(weg) >= 2: z.append(f'Griff – {hd} Hand: Finger liegen nicht an {nm} an (Abstand {", ".join(weg)})')
    return z
_KR_TEIL = [('Oberschenkel links', ['LeftUpLeg']), ('Oberschenkel rechts', ['RightUpLeg']), ('Unterschenkel links', ['LeftLeg']), ('Unterschenkel rechts', ['RightLeg']),
            ('Rumpf', ['Hips', 'Spine', 'Spine1', 'Spine2']), ('Unterarm links', ['LeftForeArm']), ('Unterarm rechts', ['RightForeArm']), ('Oberarm links', ['LeftArm']), ('Oberarm rechts', ['RightArm']), ('Kopf', ['Head'])]
def hantel_durchdringung():
    """Hantel gegen Körper (ohne die greifenden Hände): größte Eindringtiefe je Körperteil; Kleidung zählt mit"""
    z = []
    for ob, sides in _kr_hanteln():
        for nm, gr in _KR_TEIL:
            pk = [_kr_punkte(gr)]
            if shirt:
                gi = frozenset(shirt.vertex_groups['mixamorig:' + g].index for g in gr if 'mixamorig:' + g in shirt.vertex_groups)
                if gi: pk.append(_welt(shirt)[_maske(shirt, ('lowg', gi, .5), lambda v: any(g.group in gi and g.weight > .5 for g in v.groups))])
            P_ = np.concatenate([x for x in pk if len(x)]) if any(len(x) for x in pk) else None
            if P_ is None: continue
            d = _kr_hantel_sd(ob, P_)
            if d.min() < -.005: z.append(f'Durchdringung – {ob.name} steckt bis {-d.min() * 100:.1f} cm in {nm}')
            elif d.min() < globals().get('cfg', {}).get('hantel_abstand', .02) and nm.startswith(('Oberschenkel', 'Unterschenkel')): z.append(f'Abstand – {ob.name} nur {d.min() * 100:.1f} cm von {nm}')
    return z
def rumpf_oberschenkel(side='Left'):
    """kleinster Abstand (m) der Bauch- und Brustfläche (Knochen Spine, Spine1) zur Oberfläche des Oberschenkels der Seite
    (Achse Hüfte–Knie mit 7,5 cm Halbmesser); < 0: der Oberschenkel dringt in den Rumpf ein"""
    P_ = _kr_punkte(['Spine', 'Spine1'], .5); A = np.array(wpos(side + 'UpLeg')); B_ = np.array(wpos(side + 'Leg')); d = B_ - A
    u = np.clip(((P_ - A) @ d) / d.dot(d), 0, 1); return float((np.linalg.norm(P_ - (A + np.outer(u, d)), axis=1) - .075).min())
def messen(fr, kamera=None):
    """alle Hinweise für das aktuelle Bild als Textzeilen"""
    if any(a_ == 'winkel=1' for a_ in args): print('WINKEL', fr, {k: round(v) for k, v in gelenke().items()})   # Prüfhilfe: alle Winkel
    z = [f'Gelenk – {h}' for h in gelenk_hinweise(gelenke())] + [f'Durchdringung – {h}' for h in durchdringung()]
    for nm, (a, drin) in sichtbar(kamera).items():
        if not drin: z.append(f'Bild – {nm} liegt außerhalb des Bildausschnitts')
        elif a < .06: z.append(f'Bild – {nm} ist verdeckt ({a * 100:.0f} % sichtbar)')
    if _kr_quader(): z += kr_hinweise()
    if _kr_hanteln(): z += hand_hinweise() + hantel_durchdringung()
    if globals().get('cfg', {}).get('kopf_linie'): z += kopf_hinweise()
    if globals().get('cfg', {}).get('messwerte'): z += [f'Messwert – {m}' for m in cfg['messwerte']()]
    if globals().get('cfg', {}).get('rumpf_bein'):
        g_ = rumpf_oberschenkel(); print('MESSWERT Bild', fr, 'Rumpf–Oberschenkel links', round(g_ * 100, 1), 'cm')
        if g_ < .005: z.append(f'Durchdringung – Rumpf und Oberschenkel links: {"Abstand nur" if g_ >= 0 else "dringen"} {abs(g_) * 100:.1f} cm{"" if g_ >= 0 else " ineinander"}')
    lw = low()
    if lw < -.02: z.append(f'Auflage – tiefster Punkt {lw * 100:.1f} cm unter der Matte')
    return [f'Bild {fr}: {x}' for x in z]
