# Kraftübungen: gemeinsame Grundlage (Geräte, Kurzhantel, Stand mit festen Füßen) und erste Gerüste der Übungen.
# Wird von uebungen.py nach den vorhandenen Übungen eingebunden. Alle Namen tragen das Präfix kr_ bzw. KR_.
# Fachvorgaben: Relentless/claude/fachvorgaben-kraft-videos.md (Trainingswissenschaftler, 19.11.2026).
# Weltkoordinaten wie überall: Person schaut nach −Y, links der Person = +X, Matte Oberkante z = 0.

# ---------------- Geräte als Quader ----------------
# Die Quader gelten schon beim Stellen der Haltung (Fußflächen, Auflage, ground()); als Körper gebaut werden sie erst nach
# dem Stellen aller Bilder (kr_bauen), aber vor dem Festlegen der Strichstärke, damit ihre Kontur volle Stärke hat.
KR_GERAET = {}      # Übung → Liste der Quader
def kr_quader(name, x0, x1, y0, y1, z0, z1, art='kasten'):
    """art: kasten (Kasten, Stufe), polster (Bankauflage), gestell (Bankbeine), wand. Kasten und Polster tragen (Füße, Rücken)."""
    return dict(name=name, art=art, b=(x0, x1, y0, y1, z0, z1), traegt=art in ('kasten', 'polster'))
def kr_kasten(x, y, h, bx=.5, by=.4, name='kasten'):
    """Kasten oder Stufe mit Mitte (x, y) und Höhe h (Stufe 0,15–0,20 m, Step-up-Kasten 0,40–0,45 m)"""
    return [kr_quader(name, x - bx / 2, x + bx / 2, y - by / 2, y + by / 2, 0, h)]
def kr_bank(x, y, h=.42, laenge=1.1, breite=.3, quer=False, name='bank'):
    """Hantelbank: 6 cm Polster mit Oberkante h (0,40–0,45 m) auf zwei Beingestellen mit Fußbalken; Mitte (x, y).
    quer=False: lange Seite entlang Y (Bulgarian Split Squat), quer=True: entlang X (Hip Thrust)."""
    def q(n_, cl, hl, hq, z0, z1, art):          # Mitte entlang der Bank, halbe Länge, halbe Breite
        if quer: return kr_quader(n_, x + cl - hl, x + cl + hl, y - hq, y + hq, z0, z1, art)
        return kr_quader(n_, x - hq, x + hq, y + cl - hl, y + cl + hl, z0, z1, art)
    out = [q(name, 0, laenge / 2, breite / 2, h - .06, h, 'polster')]
    for s in (-1, 1):
        c = s * (laenge / 2 - .14)
        out += [q(name + '_bein', c, .025, breite / 2 - .05, .03, h - .06, 'gestell'), q(name + '_fuss', c, .035, breite / 2 + .03, 0, .03, 'gestell')]
    return out
def kr_wand(y, x0=-10.0, x1=10.0, h=4.0, dicke=.1, name='wand'):
    """Wand mit der Wandfläche bei y (die Person steht auf der +Y-Seite): 20 m breit und 4 m hoch, also über den Bildrand hinaus,
    ohne sichtbare Oberkante. Sie zählt nicht zum Bildausschnitt und bekommt keine Matte."""
    return [kr_quader(name, x0, x1, y - dicke, y, 0, h, 'wand')]
def kr_flaeche(x, y):
    """Höhe der tragenden Fläche unter (x, y): Oberseite eines Kastens oder Bankpolsters, sonst die Matte (0)"""
    return max([0.0] + [g['b'][5] for g in KR_GERAET.get(EX, ()) if g['traegt'] and g['b'][0] <= x <= g['b'][1] and g['b'][2] <= y <= g['b'][3]])
KR_FARBE = {'kasten': ('#b4c3cb', '#93a6b0'), 'polster': ('#3e5263', '#2a3a48'), 'gestell': ('#8796a3', '#5b6f80'), 'wand': ('#dfe9ec', '#c3d2d8')}
def kr_bauen():
    """Geräte der Übung als Körper anlegen (Toon-Material wie Pfosten und Matte, Kontur über die Freestyle-Silhouette).
    Gibt die Eckpunkte zurück (für Bildausschnitt und Matte)."""
    ecken = []; KR_OBJ.clear()
    for g in KR_GERAET.get(EX, ()):
        x0, x1, y0, y1, z0, z1 = g['b']; ob = bpy.data.objects.new(g['name'], bpy.data.meshes.new(g['name'])); sc.collection.objects.link(ob)
        g_ = bmesh.new(); bmesh.ops.create_cube(g_, size=1); bmesh.ops.scale(g_, vec=(x1 - x0, y1 - y0, z1 - z0), verts=g_.verts[:]); g_.to_mesh(ob.data); g_.free()
        ob.location = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
        if g['art'] in ('polster', 'kasten'):     # leicht gerundete Kanten (Polster weicher)
            bv = ob.modifiers.new('kante', 'BEVEL'); bv.width = .014 if g['art'] == 'polster' else .006; bv.segments = 3 if g['art'] == 'polster' else 1
        m_ = bpy.data.materials.get('kr_' + g['art']) or toon('kr_' + g['art'], srgb(KR_FARBE[g['art']][0]), srgb(KR_FARBE[g['art']][1]))
        setmat(ob, m_); KR_OBJ.append((g, ob))
        if g['art'] != 'wand': ecken += [Vector((x, y, z)) for x in (x0, x1) for y in (y0, y1) for z in (z0, z1)]
    return ecken
KR_OBJ = []
def kr_wand_sicht(kamera):
    """Wand ausblenden, wenn die Kamera hinter ihr steht (weitere Blickrichtungen im Prüfpaket), sonst verdeckt sie die Figur"""
    for g, ob in KR_OBJ:
        if g['art'] == 'wand': ob.hide_render = kamera.matrix_world.translation.y < g['b'][3]

# ---------------- Kurzhantel ----------------
KR_HANTEL = dict(griff=.13, r=.058, dicke=.045, eck=6)    # Griff zwischen den Scheiben, Scheibenradius, -dicke, Ecken (6 = sechseckig)
def kr_kurzhantel(name='hantel', **k):
    """Kurzhantel entlang der lokalen Z-Achse, Mitte im Ursprung: Griff und zwei sechseckige Scheiben, dunkelgrau"""
    p = dict(KR_HANTEL); p.update(k)
    ob = bpy.data.objects.new(name, bpy.data.meshes.new(name)); sc.collection.objects.link(ob); g_ = bmesh.new()
    bmesh.ops.create_cone(g_, cap_ends=True, segments=16, radius1=.016, radius2=.016, depth=p['griff'] + p['dicke'])
    for s in (-1, 1):
        bmesh.ops.create_cone(g_, cap_ends=True, segments=p['eck'], radius1=p['r'], radius2=p['r'], depth=p['dicke'], matrix=Matrix.Translation((0, 0, s * (p['griff'] + p['dicke']) / 2)))
    g_.to_mesh(ob.data); g_.free()
    setmat(ob, bpy.data.materials.get('kr_hantel') or toon('kr_hantel', srgb('#4a5560'), srgb('#2c353e'))); ob['kr'] = p
    return ob
def kr_handachsen(side):
    """Fingerrichtung d, Querachse der Hand ac (Kleinfinger → Zeigefinger) und Handrücken ru (Weltrichtungen)"""
    h, m = wpos(side + 'Hand'), wpos(side + 'HandMiddle1'); d = (m - h).normalized()
    ac = wpos(side + 'HandIndex1') - wpos(side + 'HandPinky1'); ac = (ac - d * ac.dot(d)).normalized()
    return d, ac, ac.cross(d) * (1 if side == 'Left' else -1)
KR_GRIFFRICHTUNG = {}
def kr_griff(side, curl=55):
    """Hand schließt sich um einen Griff, Finger beugen sicher zur Handfläche. grip() beugt mit derselben Drehung für beide
    Seiten; bei gespiegelten Knochenachsen beugt das eine Hand nach hinten. Die Richtung wird je Seite einmal gemessen."""
    if side not in KR_GRIFFRICHTUNG:
        grip(side, 30); d, ac, ru = kr_handachsen(side)
        KR_GRIFFRICHTUNG[side] = -1 if (wpos(side + 'HandMiddle3', True) - wpos(side + 'HandMiddle1')).dot(ru) > 0 else 1
        print('KR Griffrichtung', side, KR_GRIFFRICHTUNG[side])
    grip(side, curl * KR_GRIFFRICHTUNG[side])
def kr_sd_hantel(p, Mi, pt):
    """vorzeichenbehafteter Abstand (m) eines Weltpunkts zur Hantel (Griff und Scheiben als Zylinder, wie in mess_teil.py)"""
    L = Mi @ Vector(pt); rq = math.hypot(L.x, L.y)
    def zyl(R, zc, hh):
        qx, qy = rq - R, abs(L.z - zc) - hh; return min(max(qx, qy), 0) + math.hypot(max(qx, 0), max(qy, 0))
    d = zyl(.016, 0, (p['griff'] + p['dicke']) / 2)
    for sg in (-1, 1): d = min(d, zyl(p['r'] * .93, sg * (p['griff'] + p['dicke']) / 2, p['dicke'] / 2))
    return d
KR_FINGER_R = (.012, .0115, .0105, .0095)      # halbe Fingerdicke an Grund-, Mittel-, Endgelenk und Spitze (mit Haut, gemessen am Netz)
def _kr_finger_abstand(side, f, p, Mi):
    pk = [wpos(f'{side}Hand{f}{i}') for i in (2, 3)] + [wpos(f'{side}Hand{f}3', True)]
    return min(kr_sd_hantel(p, Mi, q) - r for q, r in zip(pk, KR_FINGER_R[1:]))
def kr_finger_anlegen(side, M, p, cache):
    """Finger schrittweise beugen, bis sie die Hantel berühren (keine pauschale Beugung, keine Krallen), Daumen ebenso an den Griff
    legen. M: Weltmatrix der Hantel, p: ihre Maße. Das Ergebnis (Winkel je Finger) wird in cache gemerkt und danach nur gesetzt."""
    kr_ruhe()
    if side not in KR_GRIFFRICHTUNG: kr_griff(side, 0)
    sg = KR_GRIFFRICHTUNG[side]; Mi = M.inverted()
    def setz(f, c):
        if not isinstance(c, (tuple, list)): c = (c, c * .9, c * .7)
        for i in (1, 2, 3):
            pb = B(f'{side}Hand{f}{i}'); pb.rotation_mode = 'XYZ'; pb.rotation_euler = (0, 0, math.radians(sg * c[i - 1])); pb.rotation_mode = 'QUATERNION'
        bpy.context.view_layer.update()
    def daumen(a):
        for i in (1, 2):
            pb = B(f'{side}HandThumb{i}'); pb.rotation_mode = 'XYZ'; pb.rotation_euler = (math.radians(a if i == 1 else a * .6), 0, 0); pb.rotation_mode = 'QUATERNION'
        bpy.context.view_layer.update()
    key_ = side
    if key_ not in cache:
        res = {}
        # Gelenk für Gelenk: Grundglied beugen, bis es anliegt, dann Mittelglied, dann Endglied (die Finger umschließen den Griff)
        for f in ('Index', 'Middle', 'Ring', 'Pinky'):
            c = [0, 0, 0]
            for j_, (mx, pk, rr) in enumerate(((90, lambda: [(wpos(f'{side}Hand{f}2'), KR_FINGER_R[1])], 0),
                                               (100, lambda: [(wpos(f'{side}Hand{f}3'), KR_FINGER_R[2])], 0),
                                               (80, lambda: [(wpos(f'{side}Hand{f}3', True), KR_FINGER_R[3])], 0))):
                for a_ in range(0, mx + 1, 5):
                    c[j_] = a_; setz(f, c)
                    d_ = min(kr_sd_hantel(p, Mi, q) - r for q, r in pk())
                    ganz = _kr_finger_abstand(side, f, p, Mi)
                    if ganz < -.003: c[j_] = max(0, a_ - 5); break
                    if d_ < .002: break
                else: c[j_] = min(c[j_], 45)       # dieses Glied erreicht die Hantel nicht: nur leicht gebeugt
            res[f] = tuple(c); setz(f, c)
        # Daumen: Drehung um seine Querachse, bei der Daumenglied und -spitze am nächsten am Griff liegen, ohne einzudringen
        best = None
        for a in range(-90, 61, 5):
            daumen(a); pk = [wpos(f'{side}HandThumb3'), wpos(f'{side}HandThumb3', True)]
            d_ = min(kr_sd_hantel(p, Mi, q) - r for q, r in zip(pk, (.0085, .007)))
            sc_ = abs(d_) + (10 * -d_ if d_ < -.003 else 0)
            if best is None or sc_ < best[0]: best = (sc_, a, d_)
        res['Thumb'] = best[1]; cache[key_] = res
        print('KR Finger', side, {k: v for k, v in res.items()}, 'Daumenabstand', round(best[2], 3))
    for f in ('Index', 'Middle', 'Ring', 'Pinky'): setz(f, cache[key_][f])
    daumen(cache[key_]['Thumb'])
def kr_hantel_hand_matrix(side):
    """Weltmatrix einer Kurzhantel fest in der Hand (gleiche Lage wie kr_hantel_an_hand)"""
    d, ac, ru = kr_handachsen(side); c = (wpos(side + 'HandIndex1') + wpos(side + 'HandPinky1')) / 2 + d * .015 - ru * .046   # Griff mittig quer durch die Hand, tief in der Handfläche (Kraftgriff)
    M = Matrix((d, ac.cross(d), ac)).transposed().to_4x4(); M.translation = c; return M
def kr_hantel_an_hand(ob, side, fr=1):
    """Kurzhantel fest in eine Hand (Knochen-Elternteil mixamorig:<side>Hand, folgt der Hand in jedem Bild):
    Griff quer durch die geschlossene Hand. Die Hand muss im Bild fr schon geschlossen sein (cfg['griff'])."""
    sc.frame_set(fr); bpy.context.view_layer.update(); M = kr_hantel_hand_matrix(side)
    ob.parent = rig; ob.parent_type = 'BONE'; ob.parent_bone = 'mixamorig:' + side + 'Hand'; bpy.context.view_layer.update()
    ob.matrix_world = M; bpy.context.view_layer.update()
def kr_hantel_frei(ob, lage):
    """Kurzhantel je Bild an lage() → (Mitte, Achsrichtung) setzen und als Schlüsselbild speichern (z. B. zwischen beiden Händen)"""
    ob.rotation_mode = 'QUATERNION'
    for fr in range(1, cfg['keys'][-1][0] + 1):
        sc.frame_set(fr); c, a = lage(); ob.location = c; ob.rotation_quaternion = Vector(a).normalized().to_track_quat('Z', 'Y')
        ob.keyframe_insert('location', frame=fr); ob.keyframe_insert('rotation_quaternion', frame=fr)

# ---------------- Stand mit festen Füßen ----------------
KR_RUHE = {}
def _kr_seite(sx): return lambda co, ob: co.x * sx > 0
def kr_ruhe():
    """Lage der Füße in der Ruhehaltung (aufrecht, Füße flach): Fußgelenk, Ballen auf Sohlenhöhe, Knochenlagen, Beinlängen"""
    if KR_RUHE: return
    l0, r0 = rig.location.copy(), rig.rotation_euler.copy(); rig.location = (0, 0, 0); rig.rotation_euler = (0, 0, 0); reset()
    for side, sx in (('Left', 1), ('Right', -1)):
        s0 = lowpts(_kr_seite(sx), [shoes]); b = wpos(side + 'ToeBase')
        KR_RUHE[side] = dict(a=wpos(side + 'Foot'), b=Vector((b.x, b.y, s0)), Mf=rig.matrix_world @ B(side + 'Foot').matrix, Mt=rig.matrix_world @ B(side + 'ToeBase').matrix,
                             l1=(wpos(side + 'Leg') - wpos(side + 'UpLeg')).length, l2=(wpos(side + 'Foot') - wpos(side + 'Leg')).length, h=wpos(side + 'UpLeg'))
    KR_RUHE['hips'] = wpos('Hips'); KR_RUHE['schulter'] = wpos('LeftArm'); r = KR_RUHE['Left']
    KR_RUHE['blick0'] = kr_blickwinkel()[0]      # Linie Ohr → Auge beim Blick geradeaus (Ruhehaltung)
    KR_RUHE['dir'] = {n: (rig.matrix_world.to_3x3() @ (rig.data.bones['mixamorig:' + n].matrix_local.to_3x3() @ Vector((0, 1, 0)))).normalized() for n in ('Spine', 'Spine1', 'Spine2', 'Neck', 'Head')}
    print('KR_RUHE Oberschenkel', round(r['l1'], 3), 'Unterschenkel', round(r['l2'], 3), 'Fußgelenk über Sohle', round(r['a'].z - r['b'].z, 3), 'Ballen vor Fußgelenk', round(r['a'].y - r['b'].y, 3),
          'Hüftgelenk', [round(c, 3) for c in r['h']], 'Becken', [round(c, 3) for c in KR_RUHE['hips']])
    rig.location = l0; rig.rotation_euler = r0; bpy.context.view_layer.update()
def kr_fuss(side, x, y, z=None, aussen=0.0, ferse=0.0, bezug='ballen'):
    """Lage eines aufgesetzten Fußes: (x, y) Ballen (bezug='ballen') bzw. Fußgelenk ('knoechel') im Grundriss, z Höhe der Fläche
    (Standard: Matte oder Gerät darunter), aussen Fußspitze nach außen (Grad), ferse Ferse um den Ballen gehoben (Grad, < 0 gesenkt).
    Die Sohle liegt wie in der Ruhehaltung flach; die Zehen bleiben auch bei gehobener Ferse flach auf der Fläche."""
    kr_ruhe(); r = KR_RUHE[side]; sx = 1 if side == 'Left' else -1; Rz = Matrix.Rotation(math.radians(sx * aussen), 4, 'Z')
    if bezug == 'knoechel': d = Rz.to_3x3() @ (r['a'] - r['b']); x, y = x - d.x, y - d.y
    if z is None: z = kr_flaeche(x, y)
    F = Vector((x, y, z)); Tz = Matrix.Translation(F) @ Rz @ Matrix.Translation(-r['b'])
    T = Tz @ Matrix.Translation(r['b']) @ Matrix.Rotation(math.radians(ferse), 4, 'X') @ Matrix.Translation(-r['b'])
    return dict(side=side, T=T, Tz=Tz, A=T @ r['a'], F=F, vor=Rz.to_3x3() @ Vector((0, -1, 0)))
def kr_bein(fu, pole=None):
    """Bein zum festen Fuß lösen: Ober- und Unterschenkel per IK zum Fußgelenk, Kniescheibe zeigt nach pole (Standard: Fußrichtung,
    also Knie über den Fußspitzen); Fuß und Zehen liegen danach genau wie in fu (aus kr_fuss) vorgegeben."""
    side = fu['side']; r = KR_RUHE[side]; pole = Vector(pole) if pole is not None else fu['vor'] + Vector((0, 0, .05))
    ik2(side + 'UpLeg', side + 'Leg', fu['A'], pole)
    t = (wpos(side + 'Leg') - wpos(side + 'UpLeg')).normalized(); roll_to(side + 'UpLeg', pole - t * pole.dot(t))
    aim(side + 'Leg', fu['A'] - wpos(side + 'Leg'))
    s = (fu['A'] - wpos(side + 'Leg')).normalized(); roll_to(side + 'Leg', pole - s * pole.dot(s))
    Mi = rig.matrix_world.inverted(); B(side + 'Foot').matrix = Mi @ fu['T'] @ r['Mf']; bpy.context.view_layer.update()
    Mt = fu['Tz'] @ r['Mt']; Mt.translation = wpos(side + 'ToeBase'); B(side + 'ToeBase').matrix = Mi @ Mt; bpy.context.view_layer.update()
    fehl = (wpos(side + 'Foot') - fu['A']).length
    if fehl > .01: print('PRUEF Bein', side, 'erreicht das Fußgelenk nicht, es fehlen', round(fehl, 3), 'm')
    return fehl
def kr_beinlaenge(side, knie):
    """Abstand Hüftgelenk–Fußgelenk bei knie Grad Kniebeugung"""
    kr_ruhe(); r = KR_RUHE[side]; return math.sqrt(r['l1'] ** 2 + r['l2'] ** 2 + 2 * r['l1'] * r['l2'] * math.cos(math.radians(knie)))
def kr_becken_ueber(A, H_seite, side):
    """Lage des Beckens (Kopf des Hüftknochens), wenn das Hüftgelenk der Seite bei H_seite liegt (Ruheabstand, ohne Beckenkippung)"""
    kr_ruhe(); return H_seite + (KR_RUHE['hips'] - KR_RUHE[side]['h'])
def kr_wirbel(R, namen=('Spine', 'Spine1', 'Spine2'), beug=0.0):
    """Wirbelsäule wie in der Ruhehaltung (neutral, natürliche Krümmung), als Ganzes um R gedreht (Weltdrehung, 3x3);
    beug: zusätzliche Beugung nach vorn (Grad, je Knochen gleich verteilt)"""
    kr_ruhe(); k = 0.0
    for n in namen:
        k += beug / len(namen); aim(n, R @ Matrix.Rotation(math.radians(k), 3, 'X') @ KR_RUHE['dir'][n])
def kr_kopf(blick=0.0, hals=.5, ziel=None, plus=0.0):
    """Gemeinsame Kopf- und Nackenhaltung für alle Kraftübungen: Hals und Kopf beugen bzw. strecken sich in der Körpermittelebene,
    bis der Blick den Höhenwinkel blick hat (Grad, 0 = waagerecht geradeaus, − nach unten; gemessen an der Linie Ohr → Auge
    gegenüber der Ruhehaltung). ziel: Weltpunkt, auf den der Blick fällt (z. B. Boden vor den Händen), ersetzt blick.
    hals: Anteil der Bewegung im Hals, der Rest im Kopfgelenk. Am Ende jeder Haltung aufrufen."""
    kr_ruhe()
    if any(a_ == 'kopfaus=1' for a_ in args): return None     # Prüfhilfe: Kopf wie in der Ruhehaltung
    ax = _ach('Spine2', (1, 0, 0)); g = None
    for _ in range(6):
        g, A = kr_blickwinkel(); g -= KR_RUHE['blick0']
        if ziel is not None: v = Vector(ziel) - A; blick = math.degrees(math.atan2(v.z, -v.y)) + plus
        if abs(g - blick) < .8: break
        d = (g - blick); twist('Neck', d * hals, ax); twist('Head', d * (1 - hals), ax)      # + um die Querachse = Blick senkt sich
    return g
def kr_rumpf(H, rumpf=0.0, kipp=None, kopf=None):
    """Stand: Becken (Kopf des Hüftknochens) an Weltpunkt H, Rumpf rumpf Grad nach vorn geneigt (gerader, neutraler Rücken),
    Becken kippt mit (Standard: halbe Rumpfneigung). Hals und Kopf folgen dem Rumpf wie in der Ruhehaltung; ausgerichtet
    werden sie am Ende der Haltung mit kr_kopf(). Vorher reset()."""
    rig.rotation_euler = (0, 0, 0); rig.location = (0, 0, 0); bpy.context.view_layer.update()
    rig.location = Vector(H) - wpos('Hips'); bpy.context.view_layer.update()
    k = rumpf * .5 if kipp is None else kipp
    if k: twist('Hips', k, (1, 0, 0))
    kr_wirbel(Matrix.Rotation(math.radians(rumpf), 3, 'X'))     # neutral wie in der Ruhehaltung, um rumpf Grad nach vorn geneigt
def kr_arme_haengen(sides=('Left', 'Right')):
    for side in sides:
        sx = 1 if side == 'Left' else -1; aim(side + 'Arm', V(sx * .1, .02, -1)); aim(side + 'ForeArm', V(sx * .06, -.04, -1)); aim(side + 'Hand', V(sx * .04, -.02, -1))
def kr_handruecken(side, ziel, w=1.0):
    """Hand um ihre Längsachse rollen, bis der Handrücken in Richtung ziel zeigt (wie flat(), aber beliebige Richtung)"""
    d, ac, zc = kr_handachsen(side); zc = zc - d * zc.dot(d); zt = Vector(ziel); zt = zt - d * zt.dot(d)
    if zc.length < 1e-5 or zt.length < 1e-4: return
    zc.normalize(); zt.normalize(); twist(side + 'Hand', math.degrees(math.atan2(d.dot(zc.cross(zt)), zc.dot(zt))) * w, d)

# ---------------- Gerüste der Übungen (Haltung nur grob, noch nicht fachlich ausgearbeitet) ----------------
KR_KEYS = ((1, 0), (12, 0), (60, 1), (84, 1), (132, 0), (144, 0))     # 2 s ab, 1 s halten, 2 s auf (24 Bilder/s)
KR_KEYS_HALTEN = ((1, 0), (10, 0), (58, 1), (130, 1), (154, 0), (162, 0))   # Plank/Seitstütz: 2 s heben, 3 s halten
KR_NAMEN_AB = {'start': 0, 'oben': 0, 'mitte': .5, 'tief': 1, 'unten': 1, 'ende': 1}     # Bewegung nach unten (Kniebeuge, Split Squat)
KR_NAMEN_AUF = {'start': 0, 'unten': 0, 'mitte': .5, 'oben': 1, 'ende': 1}             # Bewegung nach oben (Hip Thrust, Wadenheben, Plank)
def kr_mitte(A, B_): return (A + B_) / 2

# Goblet Squat: eine Kurzhantel senkrecht vor dem Brustbein; Handflächen nach oben unter der oberen Scheibe, Finger um deren
# Rand, Ellbogen unten
P['squat'] = {'fx': .16, 'aussen': 15.0, 'rumpf': 30.0, 'schien': 33.0}
def squat(ph):
    q = P['squat']; t = max(0, min(1, ph)); reset(); kr_ruhe()
    fu = {s: kr_fuss(s, sx * q['fx'], 0, 0, q['aussen']) for s, sx in (('Left', 1), ('Right', -1))}
    r = KR_RUHE['Left']; A = fu['Left']['A']
    # oben: Hüftgelenk über dem Fußgelenk, Knie 5° gebeugt; unten: Schienbein q['schien'] vor, Oberschenkel waagerecht
    d0 = kr_beinlaenge('Left', 5); H0 = Vector((r['h'].x, A.y + .02, A.z + math.sqrt(max(0, d0 ** 2 - (A.x - r['h'].x) ** 2 - .02 ** 2))))
    s_ = math.radians(q['schien']); K = A + fu['Left']['vor'] * (r['l2'] * math.sin(s_)) + Vector((0, 0, r['l2'] * math.cos(s_)))
    H1 = Vector((r['h'].x, K.y + math.sqrt(max(0, r['l1'] ** 2 - (K.x - r['h'].x) ** 2)), K.z))
    kr_rumpf(kr_becken_ueber(A, H0.lerp(H1, t), 'Left'), q['rumpf'] * t)
    for s in ('Left', 'Right'): kr_bein(fu[s])
    # Hantel: Mitte vor dem Brustbein. Die Handballen liegen unter dem seitlichen Rand der oberen Scheibe, die Handflächen umfassen
    # sie von unten und seitlich, die Finger zeigen nach oben bzw. außen um den Scheibenrand (kein Tablett-Griff); Ellbogen unten
    a = math.radians(q['rumpf'] * t); u = V(0, -math.sin(a), math.cos(a)); vo = V(0, -math.cos(a), -math.sin(a)); h_ = KR_HANTEL_GOBLET
    C = wpos('Spine2', True) - u * .17 + vo * (.13 + h_['r'])
    for side, sx in (('Left', 1), ('Right', -1)):
        d = V(sx * .2, -.15, 1); Pc = C + Vector((sx * (h_['r'] * .93 + .026), 0, h_['griff'] / 2 - .004)); W = Pc - d * .045
        ik2(side + 'Arm', side + 'ForeArm', W, (sx * .35, -.2, -1)); aim(side + 'Hand', d); kr_handruecken(side, (sx, .1, -.35))
    q['hoff'] = (kr_mitte(wpos('LeftHand'), wpos('RightHand')) - C).copy(); q['C'] = C.copy()      # Hantelmitte relativ zu den Handgelenken
    kr_kopf(-8 * t)      # Kopf neutral: im Stand geradeaus, unten leicht nach vorn unten (nicht auf die Hantel), Hals frei
KR_HANTEL_GOBLET = dict(KR_HANTEL, r=.07, dicke=.05)
def _kr_squat_griff():
    for s_ in ('Left', 'Right'): kr_finger_anlegen(s_, Matrix.Translation(P['squat']['C']), KR_HANTEL_GOBLET, P['squat'].setdefault('finger', {}))
EXS['squat'] = dict(pose=squat, kopf_linie=True, keys=KR_KEYS, perframe=True, wurzel=True, tight=True, cam=V(.9, -1, .25), zone=None, blatt=(1, 36, 60), bilder=KR_NAMEN_AB,
                    griff_kontakt=_kr_squat_griff, hanteln=('goblet',), grenzen={'Sprunggelenk hochgezogen': 36})   # Kamera 42° schräg von vorn: Tiefe, Oberschenkel und Knie über den Fußspitzen zu sehen

# Bulgarian Split Squat: hinterer Fußrücken auf der Bank (42 cm), vorderes Bein links, je eine Kurzhantel seitlich.
# Die Lage von Becken und Bankkante wird aus den Zielwinkeln berechnet (kr_bss_geometrie).
P['bss'] = {'h': .42, 'fx': .1, 'rx': -.1, 'schien1': 15.0, 'streck1': 20.0, 'knie_z': .13, 'knie0': 12.0, 'rumpf0': 8.0, 'rumpf1': 15.0, 'rz': .07, 'arm_x': .37, 'arm_y': .12}
def kr_bss_geometrie():
    """Unten: vorderes Schienbein schien1° vor, hinteres Hüftgelenk streck1° gestreckt, hinteres Kniegelenk knie_z über der Matte
    (Haut etwa 5–8 cm), Becken waagerecht. Daraus folgen Beckenlage unten, Fußgelenk hinten und die Bankkante."""
    q = P['bss']; kr_ruhe(); r = KR_RUHE['Left']; l1, l2 = r['l1'], r['l2']
    fu = kr_fuss('Left', q['fx'], 0, 0, 5); A = fu['A']; s_ = math.radians(q['schien1']); b_ = math.radians(q['streck1'])
    K = A + fu['vor'] * (l2 * math.sin(s_)) + Vector((0, 0, l2 * math.cos(s_)))
    hz = q['knie_z'] + l1 * math.cos(b_); hy = K.y + math.sqrt(max(0, l1 ** 2 - (hz - K.z) ** 2 - (K.x - r['h'].x) ** 2))
    KR_ = Vector((q['rx'], hy + l1 * math.sin(b_), q['knie_z'])); az = q['h'] + q['rz']
    ay = KR_.y + math.sqrt(max(0, l2 ** 2 - (az - KR_.z) ** 2)); q['kante'] = ay + .02; q['RA_y'] = ay
    q['H1'] = Vector((r['h'].x, hy, hz)); d0 = kr_beinlaenge('Left', q['knie0']); h0y = hy - .03
    q['H0'] = Vector((r['h'].x, h0y, A.z + math.sqrt(max(0, d0 ** 2 - (h0y - A.y) ** 2 - (A.x - r['h'].x) ** 2))))
    kn = 180 - math.degrees(math.acos(max(-1, min(1, ((Vector((q['rx'], hy, hz)) - KR_).normalized()).dot((Vector((q['rx'], ay, az)) - KR_).normalized())))))
    KR_GERAET['bss'] = kr_bank(q['rx'], q['kante'] + .55, q['h'], laenge=1.1, breite=.3)
    print('KR bss Bankkante', round(q['kante'], 3), 'vordere Ferse bis Kante', round(q['kante'] - (fu['F'].y + .2), 3), 'hinteres Knie gebeugt', round(kn), '° Hüftgelenk unten', [round(c, 3) for c in q['H1']])
def _kr_bss_hinten(q):
    """hinteres Bein: Fußgelenk über der Bankkante, Fuß gestreckt nach hinten, Fußrücken liegt auf dem Polster"""
    RA = Vector((q['rx'], q['RA_y'], q['h'] + q['rz']))
    ik2('RightUpLeg', 'RightLeg', RA, (0, -.25, -1)); aim('RightFoot', V(0, 1, -.3)); aim('RightToeBase', V(0, 1, .05))
def bss(ph):
    q = P['bss']; t = max(0, min(1, ph))
    if 'kante' not in q: kr_bss_geometrie()
    if not q.get('rz_ok'):
        # einmal messen, oben und unten: Der Fußrücken liegt auf, Unterschenkel und Hosensaum stecken nie im Polster
        q['rz_ok'] = True; rz_ = []
        for tt in (0, 1):
            bss(tt)
            for _ in range(8):
                g_ = kr_luecke('bank')
                if abs(g_) < .003: break
                q['rz'] -= g_; _kr_bss_hinten(q)
            rz_.append(q['rz'])
        q['rz0'], q['rz1'] = rz_; print('KR bss Fußgelenk über Bank oben/unten', [round(x, 3) for x in rz_])
    reset(); kr_ruhe()
    fu = kr_fuss('Left', q['fx'], 0, 0, 5)
    kr_rumpf(kr_becken_ueber(fu['A'], q['H0'].lerp(q['H1'], t), 'Left'), q['rumpf0'] + (q['rumpf1'] - q['rumpf0']) * t)
    if 'rz1' in q: q['rz'] = q['rz0'] + (q['rz1'] - q['rz0']) * t     # Fuß rollt beim Absenken etwas auf dem Polster
    kr_bein(fu); _kr_bss_hinten(q)
    for _ in range(4):     # hinterer Fußrücken liegt in jedem Bild auf dem Polster (0 bis 5 mm)
        g_ = kr_luecke('bank', ['RightFoot', 'RightToeBase'])
        if 0 <= g_ <= .005: break
        q['rz'] -= g_ - .003; _kr_bss_hinten(q)
    # Arme hängen leicht abgespreizt und etwas hinter der Körpermitte: Die Hanteln bleiben in der Tiefe neben bzw. leicht hinter dem
    # vorderen Oberschenkel, mindestens eine Handbreit entfernt
    for side, sx in (('Left', 1), ('Right', -1)):
        aim(side + 'Arm', V(sx * q['arm_x'], q['arm_y'], -1)); aim(side + 'ForeArm', V(sx * q['arm_x'] * .8, q['arm_y'] * .5, -1)); aim(side + 'Hand', V(sx * q['arm_x'] * .5, q['arm_y'] * .3, -1))
    # In der Seitenansicht liegt die hintere Hantel genau hinter der vorderen: rechte Hand auf gleiche Höhe und Tiefe wie die linke
    WL = wpos('LeftHand'); cx = (wpos('LeftArm').x + wpos('RightArm').x) / 2
    ik2('RightArm', 'RightForeArm', Vector((2 * cx - WL.x, WL.y, WL.z)), (-.3, -.3, -1)); aim('RightHand', V(-q['arm_x'] * .5, q['arm_y'] * .3, -1))
    kr_kopf(-10)     # Blick leicht nach vorn unten, Kopf in Verlängerung des leicht geneigten Rumpfs
EXS['bss'] = dict(pose=bss, kopf_linie=True, keys=KR_KEYS, perframe=True, wurzel=True, cam=V(1, 0, .02), zone=None, blatt=(1, 36, 60), bilder=KR_NAMEN_AB,
                  griff_kontakt=lambda: [kr_finger_anlegen(s_, kr_hantel_hand_matrix(s_), KR_HANTEL, P['bss'].setdefault('finger', {})) for s_ in ('Left', 'Right')],
                  hanteln=('hand_l', 'hand_r'), auflage=('bank',), hantel_abstand=.08)

# Wadenheben beidbeinig auf der Stufe (18 cm): Ballen an der Kante, Fersen frei, linke Hand gleitet flach an der Wand in etwa Schulterhöhe
# (Wand 44 cm vor der Stufenkante, damit der Ellbogen etwa 30° gebeugt ist: weiter weg reicht der Arm bei aufrechtem Rumpf nur gestreckt), ohne Hantel; Rumpf und Kopf neutral wie in der Ruhehaltung
P['calf'] = {'h': .18, 'kante': 0.0, 'fx': .1, 'ferse0': -18.0, 'ferse1': 35.0, 'knie': 5.0, 'wand': .44, 'ellbogen': 25.0, 'hoch': .08}
KR_GERAET['calf'] = kr_kasten(0, P['calf']['kante'] - .15, P['calf']['h'], bx=.7, by=.3, name='stufe') + kr_wand(P['calf']['kante'] - P['calf']['wand'], dicke=.3)   # 30 cm dick: in der Seitenansicht als Wandfläche zu sehen
def calf(ph):
    q = P['calf']; t = max(0, min(1, ph)); reset(); kr_ruhe()
    fe = q['ferse0'] + (q['ferse1'] - q['ferse0']) * t
    fu = {s: kr_fuss(s, sx * q['fx'], q['kante'] - .006, q['h'] + q.setdefault('dz', {}).get(round(fe), 0.0), 4, fe) for s, sx in (('Left', 1), ('Right', -1))}   # Ballen auf der Stufenkante
    r = KR_RUHE['Left']; A = fu['Left']['A']; d = kr_beinlaenge('Left', q['knie'])
    H = Vector((r['h'].x, A.y, A.z + math.sqrt(max(0, d ** 2 - (A.x - r['h'].x) ** 2))))
    kr_rumpf(kr_becken_ueber(A, H, 'Left'), 0, 0, 0)
    for s in ('Left', 'Right'): kr_bein(fu[s])
    # rechter Arm hängt eng am Körper: In der Seitenansicht liegt er ganz hinter Rumpf und Becken
    aim('RightArm', V(-.06, .01, -1)); aim('RightForeArm', V(-.02, -.02, -1)); aim('RightHand', V(0, -.02, -1))
    # Hand gleitet mit dem Körper an der Wand: Handgelenk in Schulterhöhe, mindestens 6 cm seitlich, Ellbogen über die ganze Bewegung
    # q['ellbogen'] Grad gebeugt. Steht der Körper weiter von der Wand weg, neigt sich die Hand zur Wand (Fingerkuppen und
    # Handfläche liegen leicht an); steht er näher, gleitet die Hand etwas über Schulterhöhe
    S = wpos('LeftArm'); l1 = (wpos('LeftArm', True) - S).length; l2 = (wpos('LeftForeArm', True) - wpos('LeftForeArm')).length
    rr = math.sqrt(l1 ** 2 + l2 ** 2 + 2 * l1 * l2 * math.cos(math.radians(q['ellbogen']))); wf = q['kante'] - q['wand']
    W = Vector((S.x + .06, max(wf + .03, S.y - math.sqrt(max(0, rr ** 2 - .06 ** 2))), S.z))
    # nah an der Wand: Die Hand gleitet bis q['hoch'] über Schulterhöhe und den Rest seitlich nach außen, der Ellbogen bleibt gleich
    dz_ = min(q['hoch'], math.sqrt(max(0, rr ** 2 - .06 ** 2 - (S.y - W.y) ** 2))); W.z += dz_
    W.x = S.x + math.sqrt(max(.06 ** 2, rr ** 2 - (S.y - W.y) ** 2 - dz_ ** 2))
    ik2('LeftArm', 'LeftForeArm', W, (.6, .2, -.8)); kr_kopf(0)     # Kopf geradeaus
    k_ = round(fe); g_ = kr_luecke('stufe', ['LeftFoot', 'LeftToeBase', 'RightFoot', 'RightToeBase'])
    if not (.003 <= g_ <= .006) and q.setdefault('dz_n', {}).get(k_, 0) < 4:     # Sohle liegt auf der Stufe (roh 4–8 mm, geglättet etwa 0–5 mm), je Fersenwinkel eingemessen
        q['dz_n'][k_] = q['dz_n'].get(k_, 0) + 1; q['dz'][k_] = q['dz'].get(k_, 0.0) + .0045 - g_; return calf(ph)
    hl = (wpos('LeftHandMiddle3', True) - wpos('LeftHand')).length; ne = math.asin(max(0, min(.9, (W.y - wf - .03) / hl)))
    aim('LeftHand', Vector((.05, -math.sin(ne) - .1 * math.cos(ne), math.cos(ne)))); kr_handruecken('Left', (0, 1, 0))
EXS['calf'] = dict(pose=calf, kopf_linie=True, keys=KR_KEYS, perframe=True, wurzel=True, cam=V(1, 0, 0), zone=None, blatt=(1, 36, 60), bilder=KR_NAMEN_AUF, auflage=('stufe',))

# Hip Thrust: Bank quer (40 cm), unterer Schulterblattrand auf der Kante, Kurzhantel quer in der Hüftbeuge (Hände greifen die
# Scheiben von außen), Nacken gebeugt, Blick zu den Knien. Oben liegen Schulter, Hüfte und Knie auf einer Linie, Schienbein senkrecht.
P['thrust'] = {'h': .40, 'kante': 0.0, 'unten': .075, 'roll': .12, 'fx': .13, 'nacken': 35.0, 'kopf': 25.0}   # unten: Gesäß 7,5 cm über der Matte
KR_GERAET['thrust'] = kr_bank(0, P['thrust']['kante'] + .16, P['thrust']['h'], laenge=1.1, breite=.32, quer=True)
def _kr_thrust_rumpf(al):
    """Rückenlage, Kopf nach +Y; Rumpf al Grad über der Waagerechten (zum Kopf ansteigend), Wirbelsäule neutral.
    Nacken gebeugt (Kinn zur Brust, Blick zu den Knien). Gibt Rumpfrichtung u und Vorderseite n zurück."""
    q = P['thrust']; R = Matrix.Rotation(math.radians(-90 + al), 3, 'X')
    rig.rotation_euler = (math.radians(-90 + al), 0, 0); a = math.radians(al)
    u = V(0, math.cos(a), math.sin(a)); n = V(0, -math.sin(a), math.cos(a))
    kr_wirbel(R); aim('Neck', R @ Matrix.Rotation(math.radians(q['nacken']), 3, 'X') @ KR_RUHE['dir']['Neck'])
    aim('Head', R @ Matrix.Rotation(math.radians(q['nacken'] + q['kopf']), 3, 'X') @ KR_RUHE['dir']['Head'])
    return u, n
def kr_thrust_hantel():
    """Mitte der Hantel in der Hüftbeuge (aus Lage und Drehung des Beckens) und ihre Achse (quer)"""
    q = P['thrust']; n = _ach('Hips', (0, -1, 0)); u = _ach('Hips', (0, 0, 1))
    return wpos('Hips') + n * (q['dh'] + KR_HANTEL['r'] + q.get('hn', 0.0)) - u * q.get('hv', .08), Vector((1, 0, 0))
def thrust(ph):
    q = P['thrust']; t = max(0, min(1, ph)); reset(); kr_ruhe()
    if 'Lb' not in q:
        # einmal messen: Abstand Becken → unterer Schulterblattrand (etwa 17 cm unter dem Schultergelenk) und Rückendicke
        rig.location = (0, 0, 0); _kr_thrust_rumpf(0); hz = wpos('Hips').z
        q['Lb'] = KR_RUHE['schulter'].z - .17 - KR_RUHE['hips'].z; q['d'] = hz - lowg(['Spine1', 'Spine2'], .5); q['db'] = hz - lowg(['Hips'], .5); q['dh'] = kr_hoechst(['Hips']) - hz
        q['C'] = Vector((0, q['kante'] + .01, q['h'])); reset()
    def oberkoerper(al, w=1.0):
        # w: 1 = oben (unterer Schulterblattrand auf der Kante), 0 = unten: der Rücken rollt über die Kante, die Auflage wandert
        # q['roll'] weiter zu den Schultern; die Hantel rückt etwas zum Bauch, weil die Oberschenkel in die Hüftbeuge kommen
        reset(); rig.location = (0, 0, 0); u, n = _kr_thrust_rumpf(al); bpy.context.view_layer.update(); Lb_ = q['Lb'] + q['roll'] * (1 - w)
        q['hv'] = .08 - .14 * (1 - w)     # unten liegt die Hantel weiter oben auf dem Unterbauch: die Oberschenkel schließen die Hüftbeuge, die Arme reichen sonst nicht
        rig.location = (q['C'] - u * Lb_ + n * q['d']) - wpos('Hips') + rig.location; bpy.context.view_layer.update()   # Rückenfläche liegt d hinter der Wirbelsäule (−n)
        q['hn'] = 0.0; _kr_thrust_arme(u, n)
        for _ in range(8):     # Rücken liegt genau auf der Bank auf (die Beine stehen hier noch in Ruhelage, vor der Bank)
            g_ = kr_luecke('bank', ['Spine', 'Spine1', 'Spine2', 'LeftShoulder', 'RightShoulder', 'Neck'], True)   # nur der Rücken; die Bank gilt als massiv, der Rücken liegt an ihrer Kante
            if abs(g_) < .002 or abs(g_) > .3: break
            rig.location.z -= g_; bpy.context.view_layer.update()
        return u, n
    if 'al1' not in q:
        # oben: Oberschenkel in Verlängerung des Rumpfs (Hüfte gestreckt), Schienbein senkrecht → Rumpfwinkel al1 und Fußlage
        r = KR_RUHE['Left']; ah = r['a'].z - r['b'].z
        def f_(al):
            u, n = oberkoerper(al); hj = wpos('LeftUpLeg'); return hj.z - u.z * r['l1'] - r['l2'] - ah, hj, u
        lo, hi = -30.0, 15.0
        for _ in range(20):
            mi = (lo + hi) / 2
            if f_(mi)[0] > 0: lo = mi
            else: hi = mi
        _, hj, u = f_(lo); q['al1'] = lo; q['fy'] = (hj - u * r['l1']).y
        # unten: Rumpf so weit geneigt, dass das Gesäß (gemessen, Beine noch in Ruhelage) q['unten'] über der Matte ist
        lo, hi = 0.0, 75.0
        for _ in range(16):
            mi = (lo + hi) / 2; oberkoerper(mi, 0.0)
            if lowg(['Hips'], .5) > q['unten']: lo = mi
            else: hi = mi
        q['al0'] = lo
        print('KR thrust Rücken', round(q['Lb'], 3), round(q['d'], 3), 'Gesäß', round(q['db'], 3), 'Rumpfwinkel unten', round(q['al0'], 1), 'oben', round(q['al1'], 1), 'Fußgelenk y', round(q['fy'], 3))
    u, n = oberkoerper(q['al0'] + (q['al1'] - q['al0']) * t, t)
    for side, sx in (('Left', 1), ('Right', -1)): kr_bein(kr_fuss(side, sx * q['fx'], q['fy'], 0, 5, 0, 'knoechel'), (0, -.3, 1))
    for _ in range(12):     # Hantel (so wie sie aus den Handgelenken gebaut wird) liegt auf der Hüftbeuge, ohne in die Beine einzudringen
        d_ = kr_hantel_netzabstand(_kr_thrust_griffmatrix().inverted())
        if d_ >= .003: break
        q['hn'] += (.004 - d_) * .5; q['hv'] -= (.004 - d_); _kr_thrust_arme(u, n)     # etwas höher und zum Bauch hin (weg vom Oberschenkel)
    q['hn_end'] = q['hn']
    q['t'] = t
def _kr_thrust_arme(u, n):
    """Hände greifen die Hantelscheiben von außen, Handflächen nach innen; Oberarme seitlich, Ellbogen zur Bank"""
    D, ax_ = kr_thrust_hantel(); ra = KR_HANTEL['griff'] / 2 + KR_HANTEL['dicke']
    for side, sx in (('Left', 1), ('Right', -1)):
        ik2(side + 'Arm', side + 'ForeArm', D + ax_ * sx * (ra + .045) + u * .04, (sx, .1, -.25)); aim(side + 'Hand', -u + n * .15); kr_handruecken(side, (sx, 0, 0))
def _kr_thrust_griffmatrix():
    """Lage der Hantel aus den Handgelenken, wie sie später gebaut wird"""
    D = kr_mitte(wpos('LeftHand'), wpos('RightHand')) - _ach('Hips', (0, 0, 1)) * .04; M = Vector((1, 0, 0)).to_track_quat('Z', 'Y').to_matrix().to_4x4(); M.translation = D; return M
def kr_thrust_hantel_matrix():
    D, ax_ = kr_thrust_hantel(); M = ax_.to_track_quat('Z', 'Y').to_matrix().to_4x4(); M.translation = D; return M
def kr_mw_thrust():
    q = P['thrust']; u_ = _ach('Spine', (0, 0, 1)); S_ = wpos('Hips') + u_ * q['Lb'] - _ach('Spine', (0, -1, 0)) * q['d']    # Rückenpunkt am unteren Schulterblattrand
    k_ = kopf_kontur('huefte'); vo_ = _ach('Spine2', (0, -1, 0))
    return [f'Gesäß {lowg(["Hips"], .5) * 100:.1f} cm über der Matte', f'unterer Schulterblattrand {(S_.y - q["kante"]) * 100:+.1f} cm hinter der Bankkante, {(S_.z - q["h"]) * 100:+.1f} cm über ihrer Oberkante',
            f'Schienbein {kr_mw_schien("Left"):.0f}° gegen die Senkrechte', f'Kopfmitte {k_.dot(vo_) * 100:+.1f} cm vor (+) der Linie Hüfte–Schulter (Kinn zur Brust)',
            f'Rücken–Bank: {kr_luecke("bank", ["Spine", "Spine1", "Spine2", "LeftShoulder", "RightShoulder"], True) * 100:.1f} cm']
EXS['thrust'] = dict(pose=thrust, keys=KR_KEYS, perframe=True, wurzel=True, cam=V(1, -.15, .15), zone=None, blatt=(1, 36, 60), bilder=KR_NAMEN_AUF, kopf_linie=True,
                     griff_kontakt=lambda: [kr_finger_anlegen(s_, _kr_thrust_griffmatrix(), KR_HANTEL, P['thrust'].setdefault('finger', {}).setdefault(round(P['thrust'].get('t', 0) * 8), {})) for s_ in ('Left', 'Right')],   # Griff je Stufe der Bewegung neu angelegt
                     hanteln=('huefte',), auflage=('bank',), hantel_abstand=-1, messwerte=kr_mw_thrust)

# Plank (Unterarmstütz): Start Bauchlage auf den Unterarmen, dann Körper heben (Linie Ohr–Knöchel), Kopf in Verlängerung des
# Rumpfs (Blick auf den Boden vor den Händen)
P['plank'] = {'kopf_plus': float(next((a.split('=')[1] for a in args if a.startswith('kopfplus=')), 35))}   # 35°: im Bild liegt der Hinterkopf dann in Linie mit dem oberen Rücken (20° sah weiter hängend aus)
def _kr_plank(a, b, p):
    """Bauchlage, Kopf nach −Y: Rumpf a Grad über der Waagerechten, Beine b Grad (zum Fuß abfallend), Becken p Grad"""
    reset(); rig.rotation_euler = (math.radians(90 - p), 0, 0); rig.location = (0, 0, 0); bpy.context.view_layer.update()
    rb = math.radians(b); lg = Vector((0, math.cos(rb), -math.sin(rb)))
    kr_wirbel(Matrix.Rotation(math.radians(90 - a), 3, 'X'), ('Spine', 'Spine1', 'Spine2', 'Neck', 'Head'))
    for side, sx in (('Left', 1), ('Right', -1)):
        aim(side + 'UpLeg', lg + Vector((sx * .02, 0, 0))); aim(side + 'Leg', lg + Vector((sx * .01, 0, 0))); aim(side + 'Foot', V(0, .3, -1)); aim(side + 'ToeBase', V(0, -1, -.15))
        aim(side + 'Arm', V(sx * .02, 0, -1)); aim(side + 'ForeArm', V(0, -1, -.08)); aim(side + 'Hand', V(0, -1, .02)); flat(side + 'Hand', -1)   # Unterarm liegt vom Ellbogen bis zum Handgelenk auf
    if P['plank'].get('kopf', True):      # Blick auf den Boden 10 cm vor den Händen: weiter vorn läge das Ohr über der Rumpflinie
        # Kopf 20° über dem Blick 10 cm vor die Hände (Prüfer Runde 4): Ohr auf der Linie Schulter–Hüfte–Knöchel, Blick zum Boden
        hm = (wpos('LeftHand') + wpos('RightHand')) / 2; kr_kopf(ziel=(0, hm.y - .10, hm.z - .02), plus=P['plank'].get('kopf_plus', 20))     # Matte etwa 2 cm unter dem Handgelenk
    relax_hands(); kr_haende_flach()      # Hände wie im fertigen Bild, bevor auf die Matte gesetzt wird (sonst trägt der Daumen)
    ground()
_KR_ARM = ['LeftArm', 'LeftForeArm', 'RightArm', 'RightForeArm']      # Ellbogen und Unterarme (Auflage der Stütze)
def plank(ph):
    q = P['plank']; t = max(0, min(1, ph))
    if 'a1' not in q:
        # Start: Becken und Oberschenkel liegen, Unterarme auf der Matte; Ende: Unterarme und Fußspitzen tragen, Körper gerade.
        # Beine (b0) und Rumpf (a0) im Wechsel einstellen, bis Becken/Oberschenkel, Unterarme und Fußspitzen gleich hoch aufliegen
        _hb = lambda: lowg(['Hips', 'LeftUpLeg', 'RightUpLeg'], .5); q['b0'], a_ = 0.0, 20.0
        for _r in range(3):
            lo, hi = -15.0, 30.0
            for _ in range(12):
                mi = (lo + hi) / 2; _kr_plank(a_, mi, 0)
                if lowpts(lambda co, ob: True, [shoes]) > .003: lo = mi
                else: hi = mi
            q['b0'] = lo; lo, hi = 0.0, 45.0
            for _ in range(12):
                mi = (lo + hi) / 2; _kr_plank(mi, q['b0'], 0)
                if lowg(_KR_ARM, .3) > _hb(): hi = mi
                else: lo = mi
            a_ = lo
        lo = a_
        q['a0'] = lo; lo, hi = -5.0, 30.0
        for _ in range(12):
            mi = (lo + hi) / 2; _kr_plank(mi, mi, mi)
            if lowg(['LeftForeArm', 'RightForeArm'], .5) > lowpts(lambda co, ob: True, [shoes]): hi = mi
            else: lo = mi
        q['a1'] = lo; lo, hi = q['a1'] - 5, q['a1'] + 5     # Ende: Beine minimal nachneigen, bis die Fußspitzen wie die Unterarme aufliegen
        for _ in range(12):
            mi = (lo + hi) / 2; _kr_plank(q['a1'], mi, q['a1'])
            if lowpts(lambda co, ob: True, [shoes]) < .003: hi = mi
            else: lo = mi
        q['b1'] = lo; print('KR plank Rumpf Start', round(q['a0'], 1), 'Beine Start', round(q['b0'], 1), 'Ende', round(q['a1'], 1), 'Beine Ende', round(q['b1'], 1))
    _kr_plank(q['a0'] + (q['a1'] - q['a0']) * t, q['b0'] + (q['b1'] - q['b0']) * t, q['a1'] * t)
def kr_haende_flach(sides=('Left', 'Right')):
    """Finger gestreckt und geschlossen (Hand liegt flach auf), Daumen wie in der Ruhehaltung"""
    for side in sides:
        for f in ('Index', 'Middle', 'Ring', 'Pinky'):
            for i in (1, 2, 3): pb = B(f'{side}Hand{f}{i}'); pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0)
    bpy.context.view_layer.update()
EXS['plank'] = dict(griff_kontakt=kr_haende_flach, pose=plank, kopf_linie=True, keys=KR_KEYS_HALTEN, perframe=True, wurzel=True, cam=V(1, -.15, .3), zone=None, blatt=(1, 34, 58), bilder=KR_NAMEN_AUF)

def kr_hanteln_anlegen():
    """Kurzhanteln der Übung anlegen (nach dem Stellen aller Bilder): goblet (senkrecht zwischen den Händen vor der Brust),
    huefte (quer in der Hüftbeuge), hand_l / hand_r (fest in einer Hand)"""
    for art in cfg.get('hanteln', ()):
        if art in ('hand_l', 'hand_r'):
            sd = 'Left' if art == 'hand_l' else 'Right'; ob = kr_kurzhantel('hantel_' + art); kr_hantel_an_hand(ob, sd); KR_HANTELN.append((ob, (sd,)))
        elif art == 'goblet':
            ob = kr_kurzhantel('hantel_goblet', **{k: v for k, v in KR_HANTEL_GOBLET.items() if k in ('r', 'dicke')})
            kr_hantel_frei(ob, lambda: (kr_mitte(wpos('LeftHand'), wpos('RightHand')) - P['squat']['hoff'], (0, 0, 1))); KR_HANTELN.append((ob, ('Left', 'Right')))
        elif art == 'huefte':      # Mitte aus den Handgelenken (die Hände sitzen fest an der Hantel), Achse quer
            ob = kr_kurzhantel('hantel_huefte'); kr_hantel_frei(ob, lambda: (_kr_thrust_griffmatrix().translation.copy(), Vector((1, 0, 0)))); KR_HANTELN.append((ob, ('Left', 'Right')))
KR_HANTELN = []     # (Hantel, greifende Hände) für die Messungen in mess_teil.py

# ======================= Weitere Kraftübungen (Gerüste): rdl, slrdl, stepup, bridge, sidep =======================
from mathutils import Euler
def kr_sohle_glatt(sx):
    """tiefster Punkt (z) des Schuhs der Seite sx (+1 links, −1 rechts, nach Welt-x) mit Glättung wie beim Rendern"""
    ms_ = [m for m in shoes.modifiers if m.type == 'SUBSURF']
    for m in ms_: m.show_viewport = True
    bpy.context.view_layer.update(); e = shoes.evaluated_get(bpy.context.evaluated_depsgraph_get()); n = len(e.data.vertices)
    a_ = np.empty(n * 3, dtype=np.float32); e.data.vertices.foreach_get('co', a_); M = np.array(shoes.matrix_world, dtype=np.float64)
    P_ = a_.reshape(n, 3).astype(np.float64) @ M[:3, :3].T + M[:3, 3]; P_ = P_[P_[:, 0] * sx > 0]
    for m in ms_: m.show_viewport = False
    bpy.context.view_layer.update(); return float(P_[:, 2].min())
def kr_huefte_setzen(H, side='Left'):
    """nach kr_rumpf: Skelett so verschieben, dass das Hüftgelenk der Seite genau bei H liegt (die Beckenkippung verschiebt es)"""
    rig.location += Vector(H) - wpos(side + 'UpLeg'); bpy.context.view_layer.update()
def kr_huefte_aus_bein(fu, knie, schien):
    """Lage des Hüftgelenks über einem festen Fuß: Schienbein schien Grad nach vorn, Knie knie Grad gebeugt, Oberschenkel nach
    hinten geneigt (Körpermittelebene). Liefert das Hüftgelenk der Fußseite."""
    r = KR_RUHE[fu['side']]; s_ = math.radians(schien); th = math.radians(knie - schien); v = Vector((0, fu['vor'].y, 0)).normalized()
    K = fu['A'] + v * (r['l2'] * math.sin(s_)) + Vector((0, 0, r['l2'] * math.cos(s_)))
    H = K - v * (r['l1'] * math.sin(th)) + Vector((0, 0, r['l1'] * math.cos(th))); H.x = r['h'].x; return H
_KR_BEINACHSEN = (('UpLeg', 'Leg', .125, .075), ('Leg', 'Foot', .065, .05))     # Halbmesser mit Hose (am Netz nachgemessen: Hantel stak sonst 1,6 cm im Oberschenkel)
def kr_arm_senkrecht(side, vor=0.0, frei=.012, hantel=True, seitlich=False, neutral=False, max_frei=None, netz=False):
    """Arm hängt senkrecht aus der Schulter (fast gestreckt), Handrücken nach vorn (Obergriff). Mit Hantel rückt die Hand so weit
    nach vorn, dass die Hantel frei vor den Beinen hängt (Abstand frei, etwa anliegend)."""
    sx = 1 if side == 'Left' else -1; S = wpos(side + 'Arm'); L = (wpos(side + 'Arm', True) - S).length + (wpos(side + 'ForeArm', True) - wpos(side + 'ForeArm')).length
    aus = 0.0 if neutral else .03     # seitlich: Hand rückt nach außen statt nach vorn (Hanteln neben den Beinen, z. B. Step-up)
    for it_ in range(14):
        ik2(side + 'Arm', side + 'ForeArm', S + Vector((sx * aus, -vor, -L * .985)), (sx * .4, 1, 0))
        aim(side + 'Hand', V(sx * .02, -.04, -1)); kr_handruecken(side, (sx, 0, 0) if neutral else (0, -1, 0))   # neutral: Handflächen zum Körper, Hantel längs
        if not hantel: return
        Mi = kr_hantel_hand_matrix(side).inverted(); d = 9
        if netz: d = kr_hantel_netzabstand(Mi)
        for sd in (() if netz else ('Left', 'Right')):
            for a_, b_, r0, r1 in _KR_BEINACHSEN:
                A_, B_ = wpos(sd + a_), wpos(sd + b_)
                for k in range(6): u_ = k / 5; d = min(d, kr_sd_hantel(KR_HANTEL, Mi, A_.lerp(B_, u_)) - (r0 + (r1 - r0) * u_))
        if max_frei is not None and d > max_frei + .003 and not seitlich and it_ < 10: vor -= (d - max_frei) * .7; continue   # Hantel höchstens max_frei vor dem Bein (Arm dafür minimal schräg)
        if d >= frei - .003: return
        if seitlich: aus += frei - d + .002
        else: vor += frei - d + .002
def kr_hantel_netzabstand(Mi, p=None):
    """kleinster Abstand (m) der Hantel (Kehrmatrix Mi) zu Ober- und Unterschenkeln am Netz mit Hose (wie die Messung)"""
    p = p or KR_HANTEL; M = np.array(Mi, dtype=np.float64); gr = ('LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg')
    P_ = [_kr_punkte(list(gr))]
    if shirt:
        gi = frozenset(shirt.vertex_groups['mixamorig:' + g].index for g in gr if 'mixamorig:' + g in shirt.vertex_groups)
        P_.append(_welt(shirt)[_maske(shirt, ('lowg', gi, .5), lambda v: any(g.group in gi and g.weight > .5 for g in v.groups))])
    P_ = np.concatenate(P_); L = P_ @ M[:3, :3].T + M[:3, 3]; rq = np.hypot(L[:, 0], L[:, 1]); z = L[:, 2]
    def zyl(R, zc, hh):
        qx = rq - R; qy = np.abs(z - zc) - hh; return np.minimum(np.maximum(qx, qy), 0) + np.hypot(np.maximum(qx, 0), np.maximum(qy, 0))
    d = zyl(.016, 0.0, (p['griff'] + p['dicke']) / 2)
    for sg in (-1, 1): d = np.minimum(d, zyl(p['r'] * .93, sg * (p['griff'] + p['dicke']) / 2, p['dicke'] / 2))
    return float(d.min())
def kr_griff_hanteln(sides, cache):
    for s_ in sides: kr_finger_anlegen(s_, kr_hantel_hand_matrix(s_), KR_HANTEL, cache)

# Rumänisches Kreuzheben: zwei Kurzhanteln, Arme senkrecht an den Oberschenkeln, Füße hüftbreit; Hüfte schiebt nach hinten (Kniewinkel
# als Vorgabe für die Geometrie; gemessen gegen die Ruhehaltung sind es etwa 6° weniger),
# Knie 12° → 18°, Schienbein fast senkrecht, Rumpf bis 70° vor, Rücken neutral (Becken kippt mit)
P['rdl'] = {'fx': .1, 'aussen': 5.0, 'knie0': 18.0, 'knie1': 24.0, 'schien': -4.0, 'rumpf0': 6.0, 'rumpf1': 70.0, 'kipp': .85, 'kopf': .75}
def rdl(ph):
    q = P['rdl']; t = max(0, min(1, ph)); reset(); kr_ruhe()
    fu = {s: kr_fuss(s, sx * q['fx'], 0, .003, q['aussen']) for s, sx in (('Left', 1), ('Right', -1))}     # Sohle 3 mm über der Matte
    k = q['knie0'] + (q['knie1'] - q['knie0']) * t; r_ = q['rumpf0'] + (q['rumpf1'] - q['rumpf0']) * t
    sch = q['knie0'] * .5 * (1 - t) + q['schien'] * t      # Start: Schienbein und Oberschenkel je um die halbe Kniebeugung geneigt (Hüfte über dem Fußgelenk)
    H = kr_huefte_aus_bein(fu['Left'], k, sch); kr_rumpf(kr_becken_ueber(fu['Left']['A'], H, 'Left'), r_, kipp=r_ * q['kipp']); kr_huefte_setzen(H)
    for s in ('Left', 'Right'): kr_bein(fu[s])
    for s in ('Left', 'Right'): kr_arm_senkrecht(s, frei=.004, max_frei=.03, netz=True)     # Hanteln liegen an den Oberschenkeln an
    kr_kopf(-r_ * q['kopf'])      # Kopf in Verlängerung des Rumpfs: Blick mit dem Rumpf schräg nach unten
EXS['rdl'] = dict(pose=rdl, kopf_linie=True, keys=KR_KEYS, perframe=True, wurzel=True, cam=V(1, 0, 0), zone=None, blatt=(1, 36, 60), bilder=KR_NAMEN_AB,
                  griff_kontakt=lambda: kr_griff_hanteln(('Left', 'Right'), P['rdl'].setdefault('finger', {})), hanteln=('hand_l', 'hand_r'), hantel_abstand=-1)   # Hanteln liegen an den Oberschenkeln an: nur Eindringen zählt

# Einbeiniges Kreuzheben: Standbein links, Hantel rechts; freies Bein gestreckt in Linie mit dem Rumpf, Fußspitze nach unten,
# Becken waagerecht; Kamera auf der Standbeinseite, 15° von oben
P['slrdl'] = {'fx': .09, 'knie0': 8.0, 'knie1': 25.0, 'schien': 3.0, 'rumpf0': 3.0, 'rumpf1': 80.0, 'kipp': .84, 'kopf': .75}
def slrdl(ph):
    q = P['slrdl']; t = max(0, min(1, ph)); reset(); kr_ruhe()
    fu = kr_fuss('Left', q['fx'], 0, 0, 3)
    k = q['knie0'] + (q['knie1'] - q['knie0']) * t; r_ = q['rumpf0'] + (q['rumpf1'] - q['rumpf0']) * t
    H = kr_huefte_aus_bein(fu, k, q['schien'] * t); kr_rumpf(kr_becken_ueber(fu['A'], H, 'Left'), r_, kipp=r_ * q['kipp']); kr_huefte_setzen(H)
    kr_bein(fu)
    # freies Bein: aus leicht hinter der Senkrechten in die Verlängerung des Rumpfs, gestreckt; Fuß im rechten Winkel, Spitze nach unten
    a = math.radians(r_); u = Vector((0, -math.sin(a), math.cos(a))); d = V(0, .015, -1).lerp(-u, sm(t)).normalized()
    f = Matrix.Rotation(math.radians(-80), 3, 'X') @ d
    # Start: rechter Fuß steht flach neben dem linken (3 mm über der Matte); er löst sich in den ersten 55 % der Bewegung und
    # geht über in das gestreckte freie Bein (Fußgelenk-Ziel gleitend, Kniescheibe nach vorn)
    w_ = sm(min(1.0, t / .55)); fr_ = kr_fuss('Right', -q['fx'], 0, .003, 3)
    if w_ <= 1e-4: kr_bein(fr_)
    else:
        HR = wpos('RightUpLeg'); L = (kr_beinlaenge('Right', 0)) * .998; A_ = fr_['A'].lerp(HR + d * L, w_)
        A_.z = max(A_.z, fr_['A'].z + .10 * math.sin(math.pi * min(1.0, w_ * 1.3)))     # Fußgelenk nie tiefer als im Stand, der Fuß hebt sich kurz ab
        wf_ = sm((w_ - .4) / .6)
        for _ in range(5):     # Fuß setzen; sinkt er (geglättet gemessen, wie im Bild) in die Matte, das Fußgelenk-Ziel anheben
            if w_ < .999: ik2('RightUpLeg', 'RightLeg', A_, (0, -1, .1))
            else: aim('RightUpLeg', d + Vector((-.02, 0, 0))); aim('RightLeg', d + Vector((-.01, 0, 0)))
            aim('RightFoot', V(0, -1, -.45).lerp(f, wf_)); aim('RightToeBase', V(0, -1, -.1).lerp(f, wf_))   # Fußspitze senkt sich erst, wenn der Fuß frei ist
            g_ = kr_sohle_glatt(-1)
            if g_ >= .002 or w_ >= .999: break
            A_ = A_ + Vector((0, 0, .005 - g_))
    kr_arm_senkrecht('Right'); kr_arm_senkrecht('Left', hantel=False)
    kr_kopf(-r_ * q['kopf'])
EXS['slrdl'] = dict(pose=slrdl, kopf_linie=True, keys=KR_KEYS, perframe=True, wurzel=True, cam=V(1, 0, .27), zone=None, blatt=(1, 36, 60), bilder=KR_NAMEN_AB,
                    griff_kontakt=lambda: (kr_griff_hanteln(('Right',), P['slrdl'].setdefault('finger', {})), kr_griff('Left', 16)), hanteln=('hand_r',), rumpf_bein=True, hantel_abstand=-1)

# Step-up auf einen Kasten (40 cm): linker Fuß ganz auf dem Kasten, rechter am Boden mit gehobener Ferse; über das vordere Bein
# hochdrücken, der hintere Fuß setzt neben dem vorderen auf; je eine Kurzhantel seitlich; Kamera etwa 30° schräg von vorn
P['stepup'] = {'h': .40, 'fx': .1, 'fx_h': .2, 'fx_e': .07, 'yb': -.44, 'knie0': 92.0, 'schien0': 14.0, 'rumpf0': 15.0, 'hinten': .97}
KR_GERAET['stepup'] = kr_kasten(.06, -.36, P['stepup']['h'], bx=.48, by=.4)   # schmal unter dem linken Fuß: der hintere Fuß bleibt von schräg vorn sichtbar
def _kr_rechts_offset():
    return KR_RUHE['Right']['h'] - KR_RUHE['Left']['h']
def stepup(ph):
    q = P['stepup']; t = max(0, min(1, ph)); reset(); kr_ruhe()
    fl = kr_fuss('Left', q['fx'], q['yb'], None, 4)
    if 'H0' not in q:
        q['H0'] = kr_huefte_aus_bein(fl, q['knie0'], q['schien0']); r = KR_RUHE['Left']; d5 = kr_beinlaenge('Left', 5); A = fl['A']
        q['H1'] = Vector((r['h'].x, A.y + .02, A.z + math.sqrt(max(0, d5 ** 2 - (A.x - r['h'].x) ** 2 - .02 ** 2))))
        # hinterer Fuß am Boden: Ballen so weit hinten, dass das hintere Bein fast gestreckt ist (Ferse 30° gehoben)
        HR = q['H0'] + _kr_rechts_offset(); yb = HR.y + .3; L = kr_beinlaenge('Right', 8)
        for _ in range(6):
            fr = kr_fuss('Right', -q['fx_h'], yb, 0, 4, 30); dv = fr['A'] - HR; yb += math.sqrt(max(0, L ** 2 - dv.z ** 2 - dv.x ** 2)) - (fr['A'].y - HR.y)
        q['yr'] = yb; print('KR stepup Hüftgelenk Start', [round(c, 3) for c in q['H0']], 'Ende', [round(c, 3) for c in q['H1']], 'hinterer Ballen y', round(yb, 3))
    w = sm(t); H = q['H0'].lerp(q['H1'], w)
    kr_rumpf(kr_becken_ueber(fl['A'], H, 'Left'), q['rumpf0'] * (1 - w) + 2 * w); kr_huefte_setzen(H)
    kr_bein(fl)
    # hinterer Fuß: bleibt am Boden, solange das Bein reicht (sonst hebt er ab und folgt), ab der Hälfte schwingt er auf den Kasten
    HR = wpos('RightUpLeg'); Lm = kr_beinlaenge('Right', 2) * .995
    def am_boden(tt):
        fr = kr_fuss('Right', -q['fx_h'], q['yr'], .011, 4, 30 + 30 * sm(tt / .5)); return fr      # Sohle etwa 3 mm über der Matte (die Ferse dreht um den Ballen): keine Schnittkante unter dem Schuh
    if t < .5:
        fr = am_boden(t); dv = fr['A'] - HR
        if dv.length > Lm:     # reicht das Bein nicht mehr: Fuß hebt senkrecht ab (rutscht nicht zum Kasten)
            h2 = Lm ** 2 - dv.x ** 2 - dv.y ** 2
            fr['A'] = Vector((fr['A'].x, fr['A'].y, HR.z - math.sqrt(h2))) if h2 > 0 else HR + dv.normalized() * Lm
        kr_bein(fr, (0, -.4, .2))
    else:
        u2 = sm((t - .5) / .5); fb = kr_fuss('Right', -q['fx_e'], q['yb'], None, 4)
        A0 = am_boden(.5)['A']; A1 = fb['A']; P_ = A0.lerp(A1, sm(min(1, u2 * 1.3) * .999)); P_.z = A0.z + (A1.z - A0.z) * sm(min(1, u2 * 2.2)) + .12 * math.sin(math.pi * u2)   # Fuß hebt früh und hoch genug über die Kastenkante
        ik2('RightUpLeg', 'RightLeg', P_, (0, -1, .1))
        if u2 >= .999: kr_bein(fb)
        else: aim('RightFoot', V(0, -.15 - .85 * u2, -1 + .55 * u2))     # Fußspitze zeigt beim Abheben nach unten, flacht über dem Kasten ab
    for s in ('Left', 'Right'): kr_arm_senkrecht(s, frei=.005, seitlich=True, neutral=True)   # Arme locker am Rumpf, Hanteln senkrecht unter der Schulter
    kr_kopf(-8 * (1 - w))
EXS['stepup'] = dict(pose=stepup, kopf_linie=True, keys=KR_KEYS, perframe=True, wurzel=True, cam=V(-.27, -1, .3), zone=None, blatt=(1, 36, 60), bilder=KR_NAMEN_AUF,
                     griff_kontakt=lambda: kr_griff_hanteln(('Left', 'Right'), P['stepup'].setdefault('finger', {})), hanteln=('hand_l', 'hand_r'), auflage=('kasten',))

# Einbeinige Glute Bridge: Rückenlage, Standbein links (Ferse 25–30 cm vor dem Gesäß), rechtes Bein gestreckt in Verlängerung des
# Oberschenkels, Arme neben dem Körper; Kamera auf der Standbeinseite, leicht von oben
P['bridge'] = {'fx': .1, 'unten': .035, 'flach': 25.0, 'weiter': .04, 'kinn': 30.0, 'knie_r': 7.0}   # weiter: Fuß 4 cm weiter vom Gesäß (Ferse–Gesäß), Schienbein oben dann etwa 4° schräg
def _kr_rueckenlage(al):
    """Rückenlage, Kopf nach +Y, Rumpf al Grad gegen die Waagerechte (negativ: Becken höher als die Schultern), Wirbelsäule, Hals
    und Kopf wie in der Ruhehaltung. Gibt Rumpfrichtung u (Becken → Schultern) zurück."""
    R = Matrix.Rotation(math.radians(-90 + al), 3, 'X'); rig.rotation_euler = (math.radians(-90 + al), 0, 0); bpy.context.view_layer.update()
    kr_wirbel(R, ('Spine', 'Spine1', 'Spine2', 'Neck', 'Head')); a = math.radians(al); return Vector((0, math.cos(a), math.sin(a)))
def bridge(ph):
    q = P['bridge']; t = max(0, min(1, ph)); reset(); kr_ruhe()
    def oberkoerper(al):
        reset(); rig.location = (0, 0, 0); u = _kr_rueckenlage(al)
        ax_ = _ach('Spine2', (1, 0, 0)); twist('Neck', q['kinn'] * .5, ax_); twist('Head', q['kinn'] * .5, ax_)    # Kinn leicht zur Brust, Hinterkopf auf der Matte
        for side, sx in (('Left', 1), ('Right', -1)):      # Arme liegen neben dem Körper, Handflächen auf der Matte
            for az in (-.14, -.1, -.06, -.02, .02):
                aim(side + 'Arm', V(sx * .16, -1, az)); aim(side + 'ForeArm', V(sx * .08, -1, az * .5)); aim(side + 'Hand', V(sx * .04, -1, -.04)); flat(side + 'Hand', -1)
                if 'S' not in q or lowg([side + 'Arm', side + 'ForeArm'], .5) - lowg(['Spine2', 'LeftShoulder', 'RightShoulder'], .5) > -.005: break
        bpy.context.view_layer.update()
        g = min(lowg(['Spine2', 'LeftShoulder', 'RightShoulder', 'Neck', 'Head'], .5), lowg(['LeftArm', 'RightArm', 'LeftForeArm', 'RightForeArm'], .5))
        rig.location.z -= g; bpy.context.view_layer.update()
        S = (wpos('LeftArm') + wpos('RightArm')) / 2
        if 'S' not in q: q['S'] = S.y
        rig.location.y += q['S'] - S.y; bpy.context.view_layer.update(); return u
    if 'al1' not in q:
        r = KR_RUHE['Left']; ah = r['a'].z - r['b'].z; oberkoerper(0)
        def f_(al):
            u = oberkoerper(al); hj = wpos('LeftUpLeg'); return hj.z - u.z * r['l1'] - r['l2'] - ah, hj, u
        lo, hi = -60.0, 0.0
        for _ in range(18):
            mi = (lo + hi) / 2
            if f_(mi)[0] > 0: lo = mi
            else: hi = mi
        _, hj, u = f_(lo); q['al1'] = lo; q['fy'] = (hj - u * r['l1']).y
        lo, hi = q['al1'], 0.0
        for _ in range(14):
            mi = (lo + hi) / 2; oberkoerper(mi)
            if lowg(['Hips'], .5) > q['unten']: lo = mi
            else: hi = mi
        q['al0'] = lo
        print('KR bridge Rumpfwinkel Start', round(q['al0'], 1), 'Ende', round(q['al1'], 1), 'Fußgelenk y', round(q['fy'], 3))
    oberkoerper(q['al0'] + (q['al1'] - q['al0']) * t)
    kr_bein(kr_fuss('Left', q['fx'], q['fy'] - q['weiter'], 0, 5, 0, 'knoechel'), (0, -.3, 1))
    d = (wpos('LeftLeg') - wpos('LeftUpLeg')).normalized()
    d = Matrix.Rotation(math.radians(q['flach'] * (1 - t)), 3, 'X') @ d      # im Start liegt der Oberschenkel des freien Beins flacher (nicht senkrecht)
    aim('RightUpLeg', d + Vector((-.03, 0, 0)))
    aim('RightLeg', Matrix.Rotation(math.radians(-q['knie_r']), 3, _ach('RightUpLeg', (1, 0, 0))) @ (d + Vector((-.03, 0, 0))))   # Knie gerade (ohne die 7° Überstreckung der Ruhehaltung)
    pf = Vector((0, abs(d.z), abs(d.y))).normalized()      # senkrecht zum Bein, zur Vorderseite (oben): Fuß im rechten Winkel
    aim('RightFoot', pf * .9 + d * .35); aim('RightToeBase', pf * .9 + d * .35)
EXS['bridge'] = dict(pose=bridge, kopf_linie=True, keys=KR_KEYS, perframe=True, wurzel=True, cam=V(1, 0, .3), zone=None, blatt=(1, 36, 60), bilder=KR_NAMEN_AUF)

# Seitstütz: auf dem rechten Unterarm (Ellbogen unter der Schulter), Füße übereinander, linke Hand auf der Hüfte; Start mit Hüfte
# am Boden, dann Becken heben bis Kopf–Schulter–Hüfte–Knöchel eine Linie bilden; Kamera frontal auf Brust und Bauch
P['sidep'] = {}
_KR_SEITE = Euler((math.radians(-90), math.radians(-90), 0)).to_matrix()     # Seitenlage rechts, Kopf nach +Y, Vorderseite nach −X
def _kr_sidep(a, b, p):
    reset(); Rx = lambda e: Matrix.Rotation(math.radians(e), 3, 'X')
    rig.rotation_euler = (Rx(p) @ _KR_SEITE).to_euler('XYZ'); rig.location = (0, 0, 0); bpy.context.view_layer.update()
    R = Rx(a) @ _KR_SEITE; kr_wirbel(R, ('Spine', 'Spine1', 'Spine2', 'Neck', 'Head'))
    Rb = Rx(b) @ _KR_SEITE
    for side, sx in (('Left', 1), ('Right', -1)):      # Beine gestreckt, Füße übereinander (Knöchel 4–5 cm auseinander)
        aim(side + 'UpLeg', Rb @ Vector((-sx * .058, 0, -1))); aim(side + 'Leg', Rb @ Vector((-sx * .03, 0, -1))); aim(side + 'Foot', Rb @ Vector((sx * .05, -1, -.45)))
    aim('RightArm', V(0, 0, -1)); aim('RightForeArm', V(-.4, .92, -.08)); aim('RightHand', V(-.4, .92, .02)); flat('RightHand', -1)   # Unterarm quer flach auf der Matte: von vorn als Winkel aus Ober- und Unterarm lesbar
    u = R @ Vector((0, 0, 1)); lat = R @ Vector((1, 0, 0)); hin = R @ Vector((0, 1, 0))
    W = wpos('LeftUpLeg') + u * .1 + lat * .06 + hin * .02
    ik2('LeftArm', 'LeftForeArm', W, lat * 1 + hin * .35); aim('LeftHand', -u * 1 - hin * .3); kr_handruecken('Left', lat)
    # Kopf in Verlängerung der Körperlinie, gemessen über die Kontur: Mitte des Kopfes auf der Geraden Fuß–Schulter
    # (die Gelenkmitten zeigten den zur Matte hängenden Kopf nicht). Drehung in der Frontalebene um die Blickachse
    vo = R @ Vector((0, -1, 0)); lat = R @ Vector((1, 0, 0)); sg = 1.0
    if P['sidep'].get('kopf', True):
        for _ in range(6):
            e = kopf_kontur('huefte').dot(lat); L_ = (Vector(_kr_punkte(['Head'], .5).mean(axis=0)) - wpos('Neck')).length
            if abs(e) < .006: break
            w_ = math.degrees(math.atan2(e, L_)) * sg; twist('Neck', -w_ * .6, vo); twist('Head', -w_ * .4, vo)
            if abs(kopf_kontur('huefte').dot(lat)) > abs(e): sg = -sg; twist('Neck', w_ * .6, vo); twist('Head', w_ * .4, vo)
    relax_hands(); kr_haende_flach(('Right',))     # Hände wie im fertigen Bild, bevor auf die Matte gesetzt wird (der Daumen lag sonst 3 cm tiefer)
    ground()
_KR_ARMAUF = ['RightArm', 'RightForeArm']
def _kr_sidep_arm(): return lowg(_KR_ARMAUF, .3)        # Ellbogen und Unterarm (tiefster Punkt der Stütze)
def _kr_sidep_huefte(): return lowg(['Hips', 'RightUpLeg'], .5)
def _kr_sidep_fuss(): return lowpts(lambda co, ob: True, [shoes])
def sidep(ph):
    q = P['sidep']; t = max(0, min(1, ph))
    if 'a1' not in q:
        # Start: Hüftseite, Füße und Unterarm auf der Matte. Beine so weit abwärts (b), dass die Füße aufliegen, dann den Rumpf (a)
        # so weit heben, dass Ellbogen und Unterarm aufliegen. Ende: Körper gerade (a = b = Becken), Unterarm und Füße tragen.
        lo, hi = -5.0, 25.0
        for _ in range(12):
            mi = (lo + hi) / 2; _kr_sidep(20, mi, 0)
            if _kr_sidep_fuss() > _kr_sidep_huefte(): lo = mi
            else: hi = mi
        q['b0'] = lo; lo, hi = 0.0, 50.0
        for _ in range(12):
            mi = (lo + hi) / 2; _kr_sidep(mi, q['b0'], 0)
            if _kr_sidep_arm() > _kr_sidep_huefte(): hi = mi
            else: lo = mi
        q['a0'] = lo; lo, hi = -5.0, 40.0
        for _ in range(12):
            mi = (lo + hi) / 2; _kr_sidep(mi, mi, mi)
            if _kr_sidep_arm() > _kr_sidep_fuss(): hi = mi
            else: lo = mi
        q['a1'] = lo; print('KR sidep Beine Start', round(q['b0'], 1), 'Rumpf Start', round(q['a0'], 1), 'Ende', round(q['a1'], 1))
    _kr_sidep(q['a0'] + (q['a1'] - q['a0']) * t, q['b0'] + (q['a1'] - q['b0']) * t, q['a1'] * t)
EXS['sidep'] = dict(griff_kontakt=lambda: kr_haende_flach(('Right',)), pose=sidep, kopf_linie=True, keys=KR_KEYS_HALTEN, perframe=True, wurzel=True, cam=V(-1, -.25, .24), zone=None, blatt=(1, 34, 58), bilder=KR_NAMEN_AUF, matte_rand=.25)

# ---------------- Messwerte für die Prüfprotokolle (stehen als „Messwert – …“ in <id>_mess.txt) ----------------
def kr_mw_schien(side):
    """Schienbeinwinkel gegen die Senkrechte (Grad, + nach vorn, − nach hinten; Person schaut nach −Y)"""
    v = wpos(side + 'Leg') - wpos(side + 'Foot'); return math.degrees(math.atan2(-v.y, v.z))
def kr_mw_hantel_bein(ob):
    """kleinster Abstand der Hantel zu Ober- und Unterschenkeln (Netz mit Hose, m)"""
    P_ = np.concatenate([_kr_punkte([g]) for g in ('LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg')])
    if shirt:
        gi = frozenset(shirt.vertex_groups['mixamorig:' + g].index for g in ('LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg') if 'mixamorig:' + g in shirt.vertex_groups)
        P_ = np.concatenate([P_, _welt(shirt)[_maske(shirt, ('lowg', gi, .5), lambda v: any(g.group in gi and g.weight > .5 for g in v.groups))]])
    return float(_kr_hantel_sd(ob, P_).min())
def kr_mw_rdl():
    S = (wpos('LeftArm') + wpos('RightArm')) / 2; fm = (wpos('LeftFoot') + wpos('LeftToeBase')) / 2
    z = [f'Schulter {abs(S.y - fm.y) * 100:.0f} cm {"vor" if S.y < fm.y else "hinter"} der Fußmitte', f'Schienbein {kr_mw_schien("Left"):.0f}° (+ vorn)']
    for ob, sd in KR_HANTELN:
        z.append(f'{ob.name}: {kr_mw_hantel_bein(ob) * 100:.1f} cm vor dem Bein, Mitte {(ob.matrix_world.translation.z - wpos(sd[0] + "Leg").z) * 100:.0f} cm über dem Kniegelenk')
    return z
def kr_mw_bridge():
    hl = max(v[1] for v in _welt(shoes)[_maske(shoes, ('fl',), lambda v: v.co.x > 0)]); gs = float(_kr_punkte(['Hips'])[:, 1].min())
    return [f'Schienbein Standbein {kr_mw_schien("Left"):.0f}° gegen die Senkrechte', f'Ferse–Gesäß {(gs - hl) * 100:.0f} cm', f'Gesäß {lowg(["Hips"], .5) * 100:.1f} cm über der Matte']
def kr_gier(name):
    """Blickrichtung des Knochens im Grundriss (Grad; 0 = nach vorn −Y, + zur linken Körperseite)"""
    f = _ach(name, (0, -1, 0)); return math.degrees(math.atan2(f.x, -f.y))
def kr_mw_stepup():
    return [f'Schienbein vorn {kr_mw_schien("Left"):.0f}°', f'Kopf gegen Brustkorb (Spine2) gedreht {kr_gier("Head") - kr_gier("Spine2"):.1f}°, Brustkorb gegen Becken {kr_gier("Spine2") - kr_gier("Hips"):.1f}°'] + [f'{ob.name}: {kr_mw_hantel_bein(ob) * 100:.1f} cm vom Bein' for ob, sd in KR_HANTELN]
def kr_mw_sidep():
    vo = _ach('Spine2', (0, -1, 0)); t_ = ((wpos('LeftArm') + wpos('RightArm')) / 2 - (wpos('LeftUpLeg') + wpos('RightUpLeg')) / 2).normalized(); h_ = (wpos('Head', True) - wpos('Neck')).normalized()
    w_ = math.degrees(math.atan2(vo.dot(t_.cross(h_)), t_.dot(h_))); e = wpos('RightForeArm') - wpos('RightArm')
    k_ = kopf_kontur('huefte'); lat_ = _ach('Spine2', (1, 0, 0))
    kt = f'Auflage: Ellbogen/Unterarm {lowg(["RightArm", "RightForeArm"], .3) * 100:.1f} cm, Unterarm Mitte {lowg(["RightForeArm"], .5) * 100:.1f} cm, Hand {lowg(HAND("Right"), .3) * 100:.1f} cm, Hüftseite {lowg(["Hips", "RightUpLeg"], .5) * 100:.1f} cm, Füße {lowpts(lambda co, ob: True, [shoes]) * 100:.1f} cm über der Matte'
    return [kt, f'Kopf seitlich {w_:.0f}° gegen die Linie Hüfte–Schulter', f'Kopfmitte {abs(k_.dot(lat_)) * 100:.1f} cm {"unter" if k_.dot(lat_) < 0 else "über"} der Geraden Hüfte–Schulter (Kontur; im Endbild liegen Fuß, Hüfte und Schulter auf einer Geraden)', f'Ellbogen {math.hypot(e.x, e.y) * 100:.0f} cm neben der Senkrechten unter der Schulter']
def kr_mw_slrdl():
    return [f'Schienbein Standbein {kr_mw_schien("Left"):.0f}°']
for _k, _f in (('rdl', kr_mw_rdl), ('bridge', kr_mw_bridge), ('stepup', kr_mw_stepup), ('sidep', kr_mw_sidep), ('slrdl', kr_mw_slrdl)): EXS[_k]['messwerte'] = _f
