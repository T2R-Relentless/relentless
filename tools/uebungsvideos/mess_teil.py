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
def messen(fr, kamera=None):
    """alle Hinweise für das aktuelle Bild als Textzeilen"""
    if any(a_ == 'winkel=1' for a_ in args): print('WINKEL', fr, {k: round(v) for k, v in gelenke().items()})   # Prüfhilfe: alle Winkel
    z = [f'Gelenk – {h}' for h in gelenk_hinweise(gelenke())] + [f'Durchdringung – {h}' for h in durchdringung()]
    for nm, (a, drin) in sichtbar(kamera).items():
        if not drin: z.append(f'Bild – {nm} liegt außerhalb des Bildausschnitts')
        elif a < .06: z.append(f'Bild – {nm} ist verdeckt ({a * 100:.0f} % sichtbar)')
    lw = low()
    if lw < -.02: z.append(f'Auflage – tiefster Punkt {lw * 100:.1f} cm unter der Matte')
    return [f'Bild {fr}: {x}' for x in z]
