"""Weitere Übungen (Clamshell, Pallof Press, 90/90, Open Book, Thread the Needle) mit freier Kamera.
Aufruf: Blender -b --python uebungen.py -- <uebung> <ausgabe> [still=<frame>] [probe=1]
Gemeinsame Figur, Kleidung, Linien und Messfunktionen kommen aus basis_teil.py."""
import os, sys, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'basis_teil.py')).read())
from mathutils import Vector, Matrix
import bmesh

V = lambda x, y, z: Vector((x, y, z)).normalized()
def wpos(name, tail=False):
    pb = B(name); return rig.matrix_world @ (pb.tail if tail else pb.head)
def twist(name, deg, axis=None):
    """Knochen um eine Weltachse durch seinen Kopf drehen (Standard: eigene Längsachse), z. B. Brustkorb aufdrehen"""
    pb = B(name); bpy.context.view_layer.update()
    W = rig.matrix_world @ pb.matrix; t = W.translation.copy()
    ax = Vector(axis).normalized() if axis else (W.to_3x3() @ Vector((0, 1, 0))).normalized()
    R = Matrix.Rotation(math.radians(deg), 4, ax)
    pb.matrix = rig.matrix_world.inverted() @ (Matrix.Translation(t) @ R @ Matrix.Translation(-t) @ W); bpy.context.view_layer.update()
def rot_about(p, a, b, deg):
    """Punkt p um die Achse a→b drehen"""
    ax = (b - a).normalized(); return a + Matrix.Rotation(math.radians(deg), 3, ax) @ (p - a)
def lowpts(pred, objs=None):
    """tiefster Punkt (z) aller Vertices, deren Ruhelage pred(co) erfüllt"""
    deps = bpy.context.evaluated_depsgraph_get(); m = 9
    for ob in (objs or MESHES):
        e = ob.evaluated_get(deps); mw = e.matrix_world
        for v, v0 in zip(e.data.vertices, ob.data.vertices):
            if pred(v0.co, ob): m = min(m, (mw @ v.co).z)
    return m
def lowg(groups, wmin=.3):
    names = {'mixamorig:' + g for g in groups}; deps = bpy.context.evaluated_depsgraph_get(); m = 9
    for ob in MESHES:
        gi = {ob.vertex_groups[n].index for n in names if n in ob.vertex_groups}
        if not gi: continue
        e = ob.evaluated_get(deps); mw = e.matrix_world
        for v, v0 in zip(e.data.vertices, ob.data.vertices):
            if any(g.group in gi and g.weight > wmin for g in v0.groups): m = min(m, (mw @ v.co).z)
    return m

def reset():
    for pb in PB: pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    bpy.context.view_layer.update()
def sm(u): u = max(0, min(1, u)); return u * u * (3 - 2 * u)
def flat(name, sign=-1, w=1.0):
    """Hand um ihre Längsachse rollen, bis die Handfläche nach unten (sign −1) oder oben (+1) zeigt. Der Handrücken wird
    geometrisch bestimmt: (Zeigefinger- minus Kleinfingerknöchel) × Fingerrichtung, für die rechte Hand gespiegelt."""
    side = 'Left' if name.startswith('Left') else 'Right'
    M = (rig.matrix_world @ B(name).matrix).to_3x3(); d = (M @ Vector((0, 1, 0))).normalized()
    ac = wpos(side + 'HandIndex1') - wpos(side + 'HandPinky1'); zc = ac.cross(d) * (1 if side == 'Left' else -1)
    zc = zc - d * zc.dot(d); zt = Vector((0, 0, -sign)); zt = zt - d * zt.dot(d)
    if zc.length < 1e-5 or zt.length < 1e-4: return
    zc.normalize(); zt.normalize(); twist(name, math.degrees(math.atan2(d.dot(zc.cross(zt)), zc.dot(zt))) * w, d)
EXS = {}
HAND = lambda side: [side + 'Hand'] + [f'{side}Hand{f}{i}' for f in ('Index', 'Middle', 'Ring', 'Pinky', 'Thumb') for i in (1, 2, 3)]
P = {}   # automatisch bestimmte Feinwerte je Übung

# ---------------- Clamshell: Seitenlage auf der rechten Seite, Blick von vorn-oben; oberes (linkes) Knie öffnet ----------------
P['clam'] = {'arm': 0.0, 'open': 52.0, 'head': 0.0}
def clam(ph):
    reset(); rig.rotation_euler = (math.radians(-90), math.radians(-90), 0); bpy.context.view_layer.update()
    for n in ('Spine', 'Spine1', 'Spine2'): aim(n, V(0, 1, 0))
    aim('Neck', V(0, 1, 0)); aim('Head', V(0, 1, -P['clam']['head']))
    for side in ('Left', 'Right'):
        aim(side + 'UpLeg', V(-.707, -.707, 0)); aim(side + 'Leg', V(.707, -.707, 0)); aim(side + 'Foot', V(-.6, -.8, 0))
    # unterer Arm (rechts) liegt gestreckt unter dem Kopf auf der Matte, Kopf liegt mit der Schläfe auf dem Oberarm;
    # obere Hand liegt flach vorn auf dem oberen Beckenknochen
    aim('RightArm', V(-.08, 1, 0)); aim('RightForeArm', V(-.08, 1, 0)); aim('RightHand', V(-.08, 1, 0))
    T = wpos('LeftUpLeg') + Vector((-.13, .07, .07)); ik2('LeftArm', 'LeftForeArm', T, (.4, .3, 1)); aim('LeftHand', V(-.2, -.6, -.75))
    if ph:
        # oberes Knie dreht um die Linie Hüfte–Fußgelenk nach oben, Füße bleiben aufeinander
        H, K, A = wpos('LeftUpLeg'), wpos('LeftLeg'), wpos('LeftFoot')
        best = None
        for sgn in (1, -1):
            K2 = rot_about(K, H, A, sgn * P['clam']['open'] * ph)
            if best is None or K2.z > best.z: best = K2
        aim('LeftUpLeg', best - H); aim('LeftLeg', A - best); aim('LeftFoot', V(-.6, -.8, 0))
EXS['clam'] = dict(pose=clam, keys=((1, 0), (12, 0), (36, 1), (52, 1), (76, 0), (88, 0)), cam=V(-.55, -.35, 1), zone=None)

def ik2(upper, lower, T, pole):
    """Zwei-Gelenk-Kette (Ober-/Unterarm bzw. -schenkel) so ausrichten, dass das Ende bei T liegt; das mittlere Gelenk
    zeigt in Richtung pole (Weltrichtung)"""
    S = wpos(upper); l1 = (wpos(upper, True) - S).length; l2 = (wpos(lower, True) - wpos(lower)).length
    dv = T - S; dd = min(dv.length, l1 + l2 - 1e-4); u = dv.normalized()
    w = (Vector(pole) - u * Vector(pole).dot(u)).normalized()
    a = math.acos(max(-1, min(1, (l1 * l1 + dd * dd - l2 * l2) / (2 * l1 * dd))))
    E = S + l1 * (u * math.cos(a) + w * math.sin(a))
    aim(upper, E - S); aim(lower, (S + u * dd) - E)
def grip(side, curl=55):
    """Hand schließt sich um einen Griff"""
    for f in ('Index', 'Middle', 'Ring', 'Pinky'):
        for i in (1, 2, 3):
            pb = B(f'{side}Hand{f}{i}'); pb.rotation_mode = 'XYZ'; pb.rotation_euler = (0, 0, math.radians(curl * (1, .9, .7)[i - 1])); pb.rotation_mode = 'QUATERNION'
    bpy.context.view_layer.update()

# ---------------- Pallof Press: Stand, Band seitlich (rechts der Person) auf Brusthöhe, Arme drücken nach vorn ----------------
P['pallof'] = {}
def pallof(ph):
    reset(); rig.rotation_euler = (0, 0, 0); bpy.context.view_layer.update()
    aim('Spine', V(0, -.02, 1)); aim('Spine1', V(0, 0, 1)); aim('Spine2', V(0, 0, 1))   # Hals und Kopf bleiben in der Ruhehaltung (aufrecht, Kragen sitzt sauber)
    for side, sx in (('Left', 1), ('Right', -1)):
        aim(side + 'UpLeg', V(sx * .19, -.2, -1)); aim(side + 'Leg', V(sx * .03, .1, -1)); aim(side + 'Foot', V(sx * .12, -1, -.45))
    st = wpos('Spine2', True); cx = st.x
    T = Vector((cx, st.y - .24 - .38 * ph, st.z - .17))      # Griff vor dem Brustbein, dann gestreckt nach vorn
    for side, sx in (('Left', 1), ('Right', -1)):
        ik2(side + 'Arm', side + 'ForeArm', T + Vector((sx * .035, 0, 0)), (sx * .7, .3, -1)); aim(side + 'Hand', V(-sx * .35, -1, .05))
    if ph == 1: print('PRUEF Haende x', round((wpos('LeftHand') + wpos('RightHand')).x / 2, 3), 'Brust x', round(cx, 3), 'Schultern x', round(wpos('LeftArm').x, 3), round(wpos('RightArm').x, 3))
EXS['pallof'] = dict(pose=pallof, keys=((1, 0), (12, 0), (36, 1), (52, 1), (76, 0), (88, 0)), cam=V(.6, -1, .28), zone=None)

# ---------------- 90/90 Hüftwechsel: Sitz, Hände hinten aufgestützt; Knie kippen über oben zur anderen Seite ----------------
# Person schaut nach −Y; rechts der Person = −X. Bild 0: Knie zur rechten Seite (linkes Bein vorn in Außenrotation,
# rechtes Bein hinten in Innenrotation), Mittelbild: beide Knie oben, Füße stehen; Bild 1 spiegelbildlich.
P['hip9090'] = {'lz': .07, 'root': -.8, 'hz': .035, 'az': .09}
def hip9090(ph):
    """Scheibenwischer: Füße stehen fest (etwa 1,5-mal hüftbreit vor dem Becken), die Knie schwenken gemeinsam über oben
    von rechts (ph 0) nach links (ph 1). Beine je Bild per IK zum festen Fußgelenk, Kniebeugung zeigt in Richtung pole."""
    reset(); rig.rotation_euler = (0, 0, 0); rig.location = (0, 0, P['hip9090']['root']); bpy.context.view_layer.update()
    aim('Spine', V(0, .12, 1)); aim('Spine1', V(0, .08, 1)); aim('Spine2', V(0, .04, 1)); aim('Neck', V(0, 0, 1)); aim('Head', V(0, -.05, 1))
    t = max(0, min(1, ph)); th = math.radians(180 - 180 * t)
    pole = Vector((math.cos(th), -.15, math.sin(th) * 1.2 + .05))
    for side, sx in (('Left', 1), ('Right', -1)):
        h = wpos(side + 'UpLeg'); A = Vector((h.x + sx * .2, h.y - .42, P['hip9090']['az']))
        # Knie nie durch die Matte: Kniebeugung so weit nach oben drehen, bis Ober- und Unterschenkel über der Matte bleiben
        lift = 0.0
        for _ in range(24):
            ik2(side + 'UpLeg', side + 'Leg', A, pole + Vector((0, 0, lift))); aim(side + 'Foot', V(sx * .35, -1, -.15))
            if not P['hip9090'].get('check'): break
            gl = lowg([side + 'UpLeg', side + 'Leg'], .5); gs = lowpts(lambda co, ob: co.x * sx > 0, [shoes])
            # bis 2 cm Einsinken der Weichteile ist erlaubt (die 3,5 cm dicke Matte deckt das ab)
            if P['hip9090'].get('dbg'): print('DBGLEG', side, round(lift, 2), round(gl, 3), round(gs, 3), round(A.z, 3))
            if gl > -.034 and gs > -.03: break
            if gl <= -.034: lift += .12
            if gs <= -.03: A.z -= gs + .03
    # Hände flach hinter dem Gesäß, Finger nach hinten; Handgelenk in der Ebene des Unterarms gebeugt (kein seitlicher Knick)
    for side, sx in (('Left', 1), ('Right', -1)):
        ik2(side + 'Arm', side + 'ForeArm', Vector((sx * .2, .4, P['hip9090']['hz'])), (sx * .4, 1, .1))
        fa = (wpos(side + 'ForeArm', True) - wpos(side + 'ForeArm')); aim(side + 'Hand', Vector((fa.x, fa.y, 0)).normalized() + Vector((0, 0, -.05)))
EXS['hip9090'] = dict(pose=hip9090, keys=((1, 0), (10, 0), (46, 1), (58, 1), (94, 0), (104, 0)), perframe=True, cam=V(.12, -1, .32), zone=None)

# ---------------- Open Book: Seitenlage rechts, Kopf auf Kissen, Hüfte/Knie 90°; oberer Arm im Bogen nach hinten ----------------
P['openbook'] = {'open': 160.0, 'th0': 0.0, 'root': 0.0}
def openbook(ph):
    q = P['openbook']
    reset(); rig.rotation_euler = (math.radians(-90), math.radians(-90), 0); rig.location = (0, 0, q['root']); bpy.context.view_layer.update()
    t = max(0, min(1, ph)); Y = Vector((0, 1, 0))
    for n in ('Spine', 'Spine1', 'Spine2'): aim(n, V(0, 1, 0))
    aim('Neck', V(0, 1, 0)); aim('Head', V(0, 1, 0))
    for side in ('Left', 'Right'):
        aim(side + 'UpLeg', V(-1, -.05, 0)); aim(side + 'Leg', V(.05, -1, 0)); aim(side + 'Foot', V(-.5, -.85, 0))
    # unterer Arm (rechts) liegt nach vorn gestreckt auf der Matte und bleibt dort liegen
    aim('RightArm', V(-1, .05, 0)); aim('RightForeArm', V(-1, .05, 0)); aim('RightHand', V(-1, .05, 0))
    if 'HR' not in q: q['HR'] = wpos('RightHand').copy()
    # Brustkorb: zu Beginn leicht nach vorn gedreht (th0), damit die obere Hand die untere erreicht; dreht dann mit dem Arm auf
    tot = -q['th0'] + (73 + q['th0']) * t
    twist('Spine1', .38 * tot, Y); twist('Spine2', .62 * tot, Y); twist('Neck', 25 * t, Y); twist('Head', 50 * t, Y)
    dr_ = q['HR'] - wpos('RightArm'); dr_.z = 0      # unterer Arm bleibt gestreckt flach auf der Matte, zeigt weiter zur selben Stelle
    aim('RightArm', dr_); aim('RightForeArm', dr_); aim('RightHand', dr_)
    # oberer Arm: Start Handfläche auf Handfläche, dann im Bogen um die Körperachse über die Decke nach hinten
    S = wpos('LeftArm'); T0 = q['HR'] + Vector((0, 0, .035))
    if 'd0' not in q or t == 0: d0 = (T0 - S).normalized()
    else: d0 = q['d0']
    if t == 0:
        q['d0'] = d0.copy(); q['gap'] = (T0 - S).length
        q['open'] = 168 - math.degrees(math.atan2(d0.z, -d0.x))   # Bogen von vorn unten über die Decke bis 12° über der Matte hinten
    d = Matrix.Rotation(math.radians(q['open'] * t), 3, Y) @ d0
    aim('LeftArm', d); aim('LeftForeArm', d); aim('LeftHand', V(-1, .05, 0).lerp(d, sm(t * 5)))
EXS['openbook'] = dict(pose=openbook, keys=((1, 0), (12, 0), (48, 1), (62, 1), (98, 0), (108, 0)), perframe=True, cam=V(-.35, .85, .6), zone=None)

if EX == 'pallof':
    # Griff mit beiden Händen: Linien zwischen den Fingern weglassen (sonst wird der Griff ein dunkles Strichknäuel)
    _fg = {g.index for g in bm.vertex_groups if any(k in g.name for k in ('HandIndex', 'HandMiddle', 'HandRing', 'HandPinky', 'HandThumb'))}
    _fv = {v.index for v in bm.data.vertices if sum(g.weight for g in v.groups if g.group in _fg) > .5 * (sum(g.weight for g in v.groups if bm.vertex_groups[g.group].name.startswith('mixamorig:')) or 1)}
    _fm = bm.data.attributes['freestyle_face']
    for f in bm.data.polygons:
        if any(i in _fv for i in f.vertices): _fm.data[f.index].value = True
if EX == 'thread' and TRIKOT:
    # Die Brust zeigt hier zur Matte: Vom Logo wären nur helle Splitter am Rand zu sehen, deshalb ohne Logo
    for d_ in bm.data.uv_layers['logo'].data: d_.uv = (-1.0, -1.0)
if EX == 'thread':
    # Kamera steht auf der rechten Seite der Person: abgedunkelt wird hier die linke (abgewandte) Seite
    _gl = {g.index for g in bm.vertex_groups if g.name.startswith('mixamorig:Left')}; _ga = {g.index for g in bm.vertex_groups if g.name.startswith('mixamorig:')}
    _sl = [sum(g.weight for g in v.groups if g.group in _gl) / (sum(g.weight for g in v.groups if g.group in _ga) or 1) for v in bm.data.vertices]
    for p_ in bm.data.polygons:      # Haut und Trikot: Kopf und Rumpf bleiben hell, nur linke Glieder dunkler
        if p_.material_index in (0, 1): p_.material_index = 1 if sum(_sl[i] for i in p_.vertices) / len(p_.vertices) > .5 else 0
    for ob_, pairs_ in ((bm, ((3, 4), (5, 6))), (shirt, ((1, 2),)), (shoes, ((0, 1),))):
        ms_ = ob_.data.materials
        for a_, b_ in pairs_:
            if len(ms_) > b_: ma_, mb_ = ms_[a_], ms_[b_]; ms_[a_] = mb_; ms_[b_] = ma_
if EX == 'hip9090' and TRIKOT: bm.data.materials[1] = bm.data.materials[0]   # Sicht von vorn: beide Arme im selben Hautton
if EX in ('hip9090',) and not TRIKOT:
    zs_ = [shirt.data.vertices[i].co.z for p_ in shirt.data.polygons if p_.material_index == 0 for i in p_.vertices]; zc = min(zs_) + .07
    top_ = {i for p_ in shirt.data.polygons if p_.material_index == 0 for i in p_.vertices}
    for i in top_:
        v_ = shirt.data.vertices[i]
        if v_.co.z < zc: v_.co.z = zc - (zc - v_.co.z) * .15
if EX in ('hip9090', 'openbook', 'thread') and not TRIKOT:
    so_ = shirt.modifiers.new('kragen', 'SOLIDIFY'); so_.thickness = .014; so_.offset = 1; so_.use_rim = False
    # nur am Halsausschnitt verdicken (sonst blähen sich die Ärmel auf)
    vk_ = shirt.vertex_groups.new(name='kragen'); zt_ = max(v.co.z for v in shirt.data.vertices)
    for v in shirt.data.vertices:
        if v.co.z > zt_ - .16 and abs(v.co.x) < .14: vk_.add([v.index], min(1.0, (v.co.z - (zt_ - .16)) / .06), 'REPLACE')
    so_.vertex_group = 'kragen'; so_.thickness_vertex_group = 0.0
    so_.show_viewport = False   # nur beim Rendern; Messungen laufen auf dem unveränderten Netz (gleiche Punktreihenfolge)
    while shirt.modifiers.find('kragen') > 0 and shirt.modifiers[shirt.modifiers.find('kragen') - 1].type != 'ARMATURE':
        bpy.context.view_layer.objects.active = shirt; bpy.ops.object.modifier_move_up(modifier='kragen')
# ---------------- Thread the Needle: Vierfüßlerstand, Kopf nach −Y; linker Arm dreht zur Decke auf (ph 0), kommt zurück
# zur Matte (ph 0,5) und fädelt unter dem rechten Stützarm durch (ph 1); Schulter und Schläfe sinken auf die Matte ----------------
P['thread'] = {'root': -.45, 'st': 0.0, 's1': 0.0, 'hz': .03, 'sgn': 1, 'open': 55.0, 'thr': 38.0}
def thread(ph):
    q = P['thread']; t = max(0, min(1, ph)); dr = sm((t - .5) / .5); up = 1 - sm(t / .5); Y_ = (0, -1, 0)
    rot = (q['open'] * up if t < .5 else -q['thr'] * dr) * q['sgn']
    def build(cx, cz):
        reset(); rig.rotation_euler = (math.radians(90), 0, 0); rig.location = (0, 0, q['root']); bpy.context.view_layer.update()
        sz = q['st'] - q['s1'] * dr + cz
        # beim Durchfädeln sinkt der Oberkörper nach vorn unten und leicht zur Seite des bewegten Arms
        for n_ in ('Spine', 'Spine1', 'Spine2'): aim(n_, V(cx + .45 * dr, -1, sz))
        aim('Neck', V(cx + .6 * dr, -1, sz - .3 * dr)); aim('Head', V(cx + .6 * dr, -1, sz - .05 - .3 * dr))
        for side in ('Left', 'Right'):
            aim(side + 'UpLeg', V(0, 0, -1)); aim(side + 'Leg', V(0, 1, 0)); aim(side + 'Foot', V(0, 1, -.12))
        if 'HL' not in q:   # Hände stehen unter den Schultern der neutralen Haltung
            for side in ('Left', 'Right'): S_ = wpos(side + 'Arm'); q['H' + side[0]] = Vector((S_.x, S_.y - .01, q['hz'])); q['S' + side[0]] = S_.copy()
        twist('Spine1', .4 * rot, Y_); twist('Spine2', .6 * rot, Y_); twist('Neck', .25 * rot, Y_); twist('Head', .25 * rot, Y_)
    build(0, 0)
    if t < .5 and 'SR' in q:
        # Aufdrehen: Die Stützschulter bleibt über der Stützhand (der Rumpf dreht um die Stützschulter, der Arm bleibt gestreckt)
        cx = cz = 0.0
        for _ in range(5):
            e_ = wpos('RightArm') - q['SR']
            if e_.length < .008: break
            cx -= e_.x / .5; cz -= e_.z / .5; build(cx, cz)
    # Stützarm (rechts): Hand bleibt stehen; beim Durchfädeln beugt der Ellbogen nach außen
    ik2('RightArm', 'RightForeArm', q['HR'], (-1, .25, .2)); aim('RightHand', V(0, -1, -.05)); flat('RightHand', -1)
    # bewegter Arm (links)
    S_ = wpos('LeftArm'); La = (wpos('LeftArm', True) - S_).length + (wpos('LeftForeArm', True) - wpos('LeftForeArm')).length
    Tup = S_ + V(.15, -.05, 1) * La * .985; Tthr = Vector((q['HR'].x - .3, q['HR'].y + .13, q['hz']))
    if t < .5:
        # Arm schwingt im seitlichen Bogen zwischen Decke und Matte, dabei fast gestreckt (kein eingeknickter Ellbogen)
        w_ = sm(t / .5); d0_ = (Tup - S_); d1_ = (q['HL'] - S_); dm_ = V(1, -.1, .1)
        dd_ = (d0_.normalized() * (1 - w_) ** 2 + dm_ * 2 * w_ * (1 - w_) + d1_.normalized() * w_ ** 2).normalized()
        T = S_ + dd_ * (d0_.length + (d1_.length - d0_.length) * w_) * (1 - .03 * math.sin(math.pi * w_)); pole = Vector((1, 0, .2))
    else: w_ = dr; T = q['HL'].lerp(Tthr, w_); T.z = q['hz'] + .075 * math.sin(math.pi * sm(w_ * 2)) + .02 * sm(w_ * 2); pole = Vector((1, 0, .2)).lerp(Vector((.1, .7, .7)), w_)   # beim Umdrehen der Hand kurz anheben
    ik2('LeftArm', 'LeftForeArm', T, pole)
    fa = wpos('LeftForeArm', True) - wpos('LeftForeArm')
    if t <= .5:
        # in der Luft folgt die Hand dem Unterarm, zum Aufsetzen dreht sie flach nach vorn (Handfläche unten, Finger nach vorn)
        wf = sm((t - .2) / .25); aim('LeftHand', fa.normalized().lerp(Vector((0, -1, -.05)), wf)); flat('LeftHand', -1, wf)
    else:
        # Hand dreht beim Durchfädeln auf: Handfläche nach oben, Handrücken gleitet über die Matte, Finger gestreckt
        wu = sm(w_ * 2); aim('LeftHand', Vector((0, -1, -.05)).lerp(Vector((fa.x, fa.y, 0)).normalized(), wu)); flat('LeftHand', -1); twist('LeftHand', 180 * wu)
        # Handfläche leicht zum Betrachter neigen (liegt entspannt auf der Kleinfingerseite), damit sie von schräg vorn als offene Hand lesbar ist
        if wu > 0:
            def pn():
                M_ = (rig.matrix_world @ B('LeftHand').matrix).to_3x3(); d_ = (M_ @ Vector((0, 1, 0))).normalized()
                return -((wpos('LeftHandIndex1') - wpos('LeftHandPinky1')).cross(d_)).normalized()
            twist('LeftHand', 42 * wu)
            if pn().y > -.1: twist('LeftHand', -84 * wu)
EXS['thread'] = dict(pose=thread, keys=((1, 0), (14, 0), (62, 1), (78, 1), (126, 0), (138, 0)), perframe=True, tight=True, zoom=True, cam=V(-1, -.55, .4), zone=None)   # seitliche Sicht: Rumpf im Profil statt als breite Fläche

# Schuhe hier wieder mit Silhouette (stehende und kniende Übungen), ferner Schuh etwas dunkler als die Matte
for c in list(shoes.users_collection): c.objects.unlink(shoes)
sc.collection.objects.link(shoes)
shoes.data.materials[1] = toon('shoeF2', srgb('#b4c3cb'), srgb('#93a6b0'))
# Messungen (tiefster Punkt je Knochengruppe) brauchen die ursprüngliche Punktreihenfolge: Glättung und Hilfsgeometrie-
# Maske nur beim Rendern; Hilfsgeometrie (Würfel an Gelenken, Kleidungshilfen) wird beim Messen übersprungen
for ob_ in MESHES:
    for m_ in ob_.modifiers:
        if m_.type in ('SUBSURF', 'MASK'): m_.show_viewport = False
_SKIP = {}
for ob_ in MESHES:
    hg_ = {ob_.vertex_groups[n].index for n in ('HelperGeometry', 'JointCubes') if n in ob_.vertex_groups}
    _SKIP[ob_.name] = {v.index for v in ob_.data.vertices if any(g.group in hg_ and g.weight > 0 for g in v.groups)} if hg_ else set()
def low(groups=None):
    deps = bpy.context.evaluated_depsgraph_get(); m = 9
    for ob in MESHES:
        gi = None if groups is None else {ob.vertex_groups[g].index for g in groups if g in ob.vertex_groups}
        if gi is not None and not gi: continue
        e = ob.evaluated_get(deps); mw = e.matrix_world; sk = _SKIP[ob.name]
        for v, v0 in zip(e.data.vertices, ob.data.vertices):
            if v0.index in sk: continue
            if gi is not None and not any(g.group in gi and g.weight > .3 for g in v0.groups): continue
            m = min(m, (mw @ v.co).z)
    return m
def lowpts(pred, objs=None):
    deps = bpy.context.evaluated_depsgraph_get(); m = 9
    for ob in (objs or MESHES):
        e = ob.evaluated_get(deps); mw = e.matrix_world; sk = _SKIP[ob.name]
        for v, v0 in zip(e.data.vertices, ob.data.vertices):
            if v0.index not in sk and pred(v0.co, ob): m = min(m, (mw @ v.co).z)
    return m
def lowg(groups, wmin=.3):
    names = {'mixamorig:' + g for g in groups}; deps = bpy.context.evaluated_depsgraph_get(); m = 9
    for ob in MESHES:
        gi = {ob.vertex_groups[n].index for n in names if n in ob.vertex_groups}
        if not gi: continue
        e = ob.evaluated_get(deps); mw = e.matrix_world; sk = _SKIP[ob.name]
        for v, v0 in zip(e.data.vertices, ob.data.vertices):
            if v0.index not in sk and any(g.group in gi and g.weight > wmin for g in v0.groups): m = min(m, (mw @ v.co).z)
    return m
# ------------------------------------------------ Ablauf ------------------------------------------------
cfg = EXS[EX]
_cv = next((a.split('=')[1] for a in args if a.startswith('cam=')), None)        # Kamerarichtung zum Ausprobieren: cam=x,y,z
if _cv: cfg['cam'] = V(*[float(x) for x in _cv.split(',')])
def pose(ph):
    cfg['pose'](ph); relax_hands()
    if EX == 'pallof': grip('Left'); grip('Right')
    bpy.context.view_layer.update()
def ground():
    rig.location.z = 0; bpy.context.view_layer.update(); m = low(); rig.location.z = -m; bpy.context.view_layer.update()
if EX == 'thread':
    q = P['thread']
    pose(.5); z0 = wpos('LeftArm').z; twist('Spine2', 10, (0, -1, 0)); q['sgn'] = 1 if wpos('LeftArm').z > z0 else -1
    for _ in range(25):
        q.pop('HL', None); pose(.5)
        gl = min(lowg(['LeftLeg', 'RightLeg'], .5), lowpts(lambda co, ob: True, [shoes])); gh = lowg(HAND('Left') + HAND('Right'))
        S_ = wpos('RightArm'); La = (wpos('RightArm', True) - S_).length + (wpos('RightForeArm', True) - wpos('RightForeArm')).length
        gap = (S_ - wpos('RightHand')).length - La * .975      # > 0: Arm überstreckt (Schulter zu hoch), < 0: Ellbogen zu stark gebeugt
        print('VIERFUSS root', round(q['root'], 3), 'Knie', round(gl, 3), 'Hände', round(gh, 3), 'Armspalt', round(gap, 3), 'st', round(q['st'], 3))
        if abs(gl) < .004 and abs(gh) < .005 and abs((S_.z - q['hz']) - La * .975) < .012: break
        q['root'] -= gl; q['hz'] -= gh * .8; q['st'] -= ((S_.z - q['hz']) - La * .975) * 1.2
    for _ in range(25):
        pose(1); g_ = min(lowg(['Head'], .5), lowg(['LeftShoulder', 'LeftArm'], .5))
        print('FAEDELN s1', round(q['s1'], 3), 'Kopf/Schulter', round(g_, 3))
        if g_ < .012 or q['s1'] > 1.3: break
        q['s1'] += max(.03, g_ * 1.4)
elif EX == 'hip9090':
    # Sitzhöhe: Becken so tief, dass das Gesäß auf der Matte sitzt (Beine und Hände werden danach je Bild neu gesetzt)
    for _ in range(20):
        pose(0); g = lowg(['Hips', 'LeftUpLeg', 'RightUpLeg']); gh = lowg(HAND('Left') + HAND('Right')); gs = lowpts(lambda co, ob: True, [shoes])
        print('SITZ', round(P['hip9090']['root'], 3), round(g, 3), 'Hände', round(gh, 3), 'Füße', round(gs, 3))
        if abs(g) < .003 and abs(gh) < .004 and abs(gs) < .004: break
        P['hip9090']['root'] -= g; P['hip9090']['hz'] -= gh * .8; P['hip9090']['az'] -= gs * .8
else:
    pose(0); ground()
if EX == 'openbook':
    q = P['openbook']
    for _ in range(60):
        q.pop('HR', None); pose(0); m_ = low(); La = (wpos('LeftArm', True) - wpos('LeftArm')).length + (wpos('LeftForeArm', True) - wpos('LeftForeArm')).length
        print('OPENBOOK th0', q['th0'], 'Abstand', round(q['gap'], 3), 'Armlänge', round(La, 3), 'Boden', round(m_, 3))
        if abs(m_) > .003: q['root'] -= m_; continue
        if q['gap'] <= La + .005 or q['th0'] >= 30: break
        q['th0'] += 1.5
    q.pop('HR', None); pose(0)
    hz = lowg(['Head'], .5)
    deps_ = bpy.context.evaluated_depsgraph_get(); e_ = bm.evaluated_get(deps_); hi_ = bm.vertex_groups['mixamorig:Head'].index
    hv_ = [bm.matrix_world @ v.co for v, v0 in zip(e_.data.vertices, bm.data.vertices) if v0.index not in _SKIP[bm.name] and any(g.group == hi_ and g.weight > .5 for g in v0.groups)]
    lo_ = [q for q in hv_ if q.z < hz + .04]; hp = sum(lo_, Vector()) / len(lo_)   # Auflagestelle des Kopfes (Schläfe)
    print('KISSEN unter', [round(c, 3) for c in hp])
    pil = bpy.data.objects.new('kissen', bpy.data.meshes.new('kissen')); sc.collection.objects.link(pil)
    # Kissen: Quader mit je einem Zwischenschnitt, dann geglättet → weiche, kissenartige Form ohne Kantenartefakte
    g = bmesh.new(); bmesh.ops.create_cube(g, size=1); bmesh.ops.scale(g, vec=(.48, .4, hz * 1.08), verts=g.verts[:])
    bmesh.ops.subdivide_edges(g, edges=g.edges[:], cuts=2, use_grid_fill=True); g.to_mesh(pil.data); g.free()
    for f in pil.data.polygons: f.use_smooth = True
    sp_ = pil.modifiers.new('weich', 'SUBSURF'); sp_.levels = 2; sp_.render_levels = 2
    pil.location = (hp.x + .12, hp.y - .12, hz * 1.08 / 2); setmat(pil, toon('kissen', srgb('#f4f7f8'), srgb('#c6d3d8')))
    print('KISSEN Hoehe', round(hz, 3))
if EX == 'clam':
    # Kopf in Verlängerung der Wirbelsäule; nur so weit zur Matte neigen, bis die Schläfe auf dem unteren Oberarm liegt
    def head_gap():
        deps = bpy.context.evaluated_depsgraph_get(); e = bm.evaluated_get(deps); mw = e.matrix_world
        hi = bm.vertex_groups['mixamorig:Head'].index; ai = bm.vertex_groups['mixamorig:RightArm'].index
        hz = min((mw @ v.co).z for v, v0 in zip(e.data.vertices, bm.data.vertices) if any(g.group == hi and g.weight > .5 for g in v0.groups))
        az = max((mw @ v.co).z for v, v0 in zip(e.data.vertices, bm.data.vertices) if any(g.group == ai and g.weight > .5 for g in v0.groups))
        return hz - az
    for _ in range(30):
        pose(0); ground(); hg = head_gap(); print('CLAM_KOPF', round(P['clam']['head'], 2), round(hg, 3))
        if hg <= .01 or P['clam']['head'] >= .35: break
        P['clam']['head'] += .02
if cfg.get('perframe'):
    K = cfg['keys']
    def ph_at(fr):
        for (f0, p0), (f1, p1) in zip(K, K[1:]):
            if f0 <= fr <= f1:
                u = 0 if f1 == f0 else (fr - f0) / (f1 - f0); u = u * u * (3 - 2 * u); return p0 + (p1 - p0) * u
        return K[-1][1]
    P.setdefault(EX, {})['check'] = True
    for fr in range(1, K[-1][0] + 1): pose(ph_at(fr)); key(fr)
    P[EX]['check'] = False
else:
    for fr, ph in cfg['keys']: pose(ph); key(fr)
sc.frame_start, sc.frame_end = 1, cfg['keys'][-1][0] - 1; sc.render.fps = 24
# Prüfung aller Bilder: tiefster Punkt; Punkte für Ausschnitt sammeln
pts, worst = [], 9
for fr in range(1, cfg['keys'][-1][0], 3):
    sc.frame_set(fr); deps = bpy.context.evaluated_depsgraph_get()
    for ob in MESHES:
        e = ob.evaluated_get(deps); mw = e.matrix_world; sk = _SKIP[ob.name]
        for v, v0 in list(zip(e.data.vertices, ob.data.vertices))[::6]:
            if v0.index in sk: continue
            p = mw @ v.co; pts.append(p); worst = min(worst, p.z)
print('TIEFSTER_PUNKT', round(worst, 4))
for fr in range(1, cfg['keys'][-1][0], 3):
    sc.frame_set(fr); lw = low()
    if lw < -.01: print('PRUEF unter Matte Bild', fr, round(lw, 3), {n: round(lowpts(lambda co, ob: True, [o]), 3) for n, o in (('Körper', bm), ('Hose', shirt), ('Schuhe', shoes))}, 'Hände', round(lowg(HAND('Left') + HAND('Right')), 3), 'Becken', round(lowg(['Hips', 'LeftUpLeg', 'RightUpLeg']), 3), 'Unterschenkel', round(lowg(['LeftLeg', 'RightLeg']), 3))
if EX == 'pallof':
    def cyl(name, r, mat):
        ob = bpy.data.objects.new(name, bpy.data.meshes.new(name)); sc.collection.objects.link(ob)
        g = bmesh.new(); bmesh.ops.create_cone(g, cap_ends=True, segments=24, radius1=r, radius2=r, depth=1); g.to_mesh(ob.data); g.free()
        for f in ob.data.polygons: f.use_smooth = True
        setmat(ob, mat); return ob
    grey = toon('pfosten', srgb('#8796a3'), srgb('#5b6f80')); bandm = toon('band', srgb('#00bcb3'), srgb('#00897f')); dark = toon('griff', srgb('#1a2b5e'), srgb('#0b1c49'))
    sc.frame_set(1); h0 = (wpos('LeftHand') + wpos('RightHand')) / 2
    AX = Vector((h0.x - 1.05, h0.y, h0.z))                      # Befestigung 1 m rechts neben der Person auf Griffhöhe
    post = cyl('pfosten', .03, grey); post.scale = (1, 1, 1.75); post.location = (AX.x - .03, AX.y, .875)
    foot = cyl('fuss', .16, grey); foot.scale = (1, 1, .03); foot.location = (AX.x - .03, AX.y, .015)
    band = cyl('band', .011, bandm); handle = cyl('griff', .018, dark)
    for fr in range(1, cfg['keys'][-1][0] + 1):
        sc.frame_set(fr); L, R = wpos('LeftHand'), wpos('RightHand'); hc = (L + R) / 2 + (L - wpos('LeftForeArm')).normalized() * .045
        handle.location = hc; handle.rotation_euler = (L - R).to_track_quat('Z', 'Y').to_euler(); handle.scale = (1, 1, max(.05, (L - R).length - .01))   # Griff kaum länger als die Hände breit: kein Klotz am Handgelenk
        v = hc - AX; band.location = (hc + AX) / 2; band.rotation_euler = v.to_track_quat('Z', 'Y').to_euler(); band.scale = (1, 1, v.length)
        for ob in (handle, band): ob.keyframe_insert('location', frame=fr); ob.keyframe_insert('rotation_euler', frame=fr); ob.keyframe_insert('scale', frame=fr)
    pts += [Vector((AX.x - .2, AX.y, 0)), Vector((AX.x, AX.y, 1.75))]
# Matte unter der Figur (Oberkante z = 0, 3,5 cm dick)
xs = [p.x for p in pts]; ys = [p.y for p in pts]
floor = bpy.data.objects.new('mat', bpy.data.meshes.new('mat')); sc.collection.objects.link(floor)
g = bmesh.new(); bmesh.ops.create_cube(g, size=1); g.to_mesh(floor.data); g.free()
floor.scale = (max(xs) - min(xs) + .24, max(ys) - min(ys) + .3, .035); floor.location = ((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, -.0175)
setmat(floor, toon('mat', srgb('#cfdde2'), srgb('#b9cbd1')))
# Kamera: orthografisch aus Richtung cfg['cam'], Ausschnitt eng um Figur und Matte
d = cfg['cam']; cen = sum(pts, Vector()) / len(pts)
cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler(); cam.location = cen + d * 8; bpy.context.view_layer.update()
Mi = cam.matrix_world.inverted(); fl = [floor.matrix_world @ Vector((sx * .5, sy * .5, .5)) for sx in (-1, 1) for sy in (-1, 1)]
loc = [Mi @ p for p in pts + ([] if cfg.get('tight') else fl)]; X = [q.x for q in loc]; Y = [q.y for q in loc]   # tight: eng um die Figur, die Matte darf angeschnitten sein
asp = sc.render.resolution_x / sc.render.resolution_y; cx, cy = (max(X) + min(X)) / 2, (max(Y) + min(Y)) / 2
cam.location = cam.matrix_world @ Vector((cx, cy, 0)); cam.data.ortho_scale = max(max(X) - min(X), (max(Y) - min(Y)) * asp) * (1.16 if cfg.get('tight') else 1.08)
if cfg.get('zoom'):
    # Die Kamera fährt weich näher heran, sobald der Arm unten ist (sonst wäre die Figur in der Endposition zu klein)
    K_ = cfg['keys']; locA, scA = cam.location.copy(), cam.data.ortho_scale; pB = []
    for fr in range(1, K_[-1][0], 2):
        if ph_at(fr) < .5: continue
        sc.frame_set(fr); deps = bpy.context.evaluated_depsgraph_get()
        for ob in MESHES:
            e = ob.evaluated_get(deps); mw = e.matrix_world; sk = _SKIP[ob.name]
            pB += [mw @ v.co for v, v0 in list(zip(e.data.vertices, ob.data.vertices))[::6] if v0.index not in sk]
    Mi = cam.matrix_world.inverted(); lb = [Mi @ p for p in pB]; Xb = [q.x for q in lb]; Yb = [q.y for q in lb]
    locB = cam.matrix_world @ Vector(((max(Xb) + min(Xb)) / 2, (max(Yb) + min(Yb)) / 2, 0)); scB = max(max(Xb) - min(Xb), (max(Yb) - min(Yb)) * asp) * 1.3
    for fr in range(1, K_[-1][0] + 1):
        w_ = sm((ph_at(fr) - .3) / .22); cam.location = locA.lerp(locB, w_); cam.data.ortho_scale = scA + (scB - scA) * w_
        cam.keyframe_insert('location', frame=fr); cam.data.keyframe_insert('ortho_scale', frame=fr)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
if STILL is not None:
    sc.frame_set(STILL); sc.render.filepath = OUT + f'_{STILL:03d}.png'; bpy.ops.render.render(write_still=True)
else:
    sc.render.resolution_x, sc.render.resolution_y = 720, 450
    sc.render.filepath = OUT + '.mp4'; sc.render.image_settings.media_type = 'VIDEO'; sc.render.image_settings.file_format = 'FFMPEG'; sc.render.ffmpeg.format = 'MPEG4'
    sc.render.ffmpeg.codec = 'H264'; sc.render.ffmpeg.constant_rate_factor = 'MEDIUM'; sc.render.ffmpeg.gopsize = 24
    bpy.ops.render.render(animation=True)
bpy.ops.wm.save_as_mainfile(filepath=OUT + '.blend')
print('FERTIG', OUT)
