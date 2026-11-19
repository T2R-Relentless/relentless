"""Relentless-Übungsfigur (weitere Übungen, freie Kamera): MakeHuman-Mensch (CC0) mit Mixamo-Skelett, Kleidung in Relentless-Farben, Zeichentrick-Schattierung
(zwei Stufen) mit feiner Kontur, orthografische Seitenansicht. Aufruf:
  Blender -b --python figur.py -- <uebung> <ausgabe> [still=<frame>]
"""
import bpy, importlib, os, sys, math
from mathutils import Vector, Quaternion, Matrix

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
EX = args[0] if args else 'deadbug'
OUT = os.path.expanduser(args[1] if len(args) > 1 else '~/Documents/Relentless-3D/out/' + EX)
HEM = float(next((a.split('=')[1] for a in args if a.startswith('hem=')), .03)); SHOE = float(next((a.split('=')[1] for a in args if a.startswith('shoe=')), .095))
FS = float(next((a.split('=')[1] for a in args if a.startswith('fs=')), -3)); FK = float(next((a.split('=')[1] for a in args if a.startswith('fk=')), 3))   # Fingerspreizung, Fingerbeugung (Vielfaches)
FAX = next((a.split('=')[1] for a in args if a.startswith('fax=')), 'z')
_th = next((a.split('=')[1] for a in args if a.startswith('th=')), 'x25'); TH = (_th[0], float(_th[1:]))
_st = next((a.split('=')[1] for a in args if a.startswith('still=')), None)   # ein Bild oder mehrere (still=1,28,46); still=blatt nimmt die Blattbilder der Übung
STILLS = [int(x) for x in _st.split(',')] if _st and _st != 'blatt' else []; STILL = STILLS[0] if STILLS else (0 if _st == 'blatt' else None)
LMIN = float(next((a.split('=')[1] for a in args if a.startswith('lmin=')), 6))
_arg = lambda k, d: float(next((a.split('=')[1] for a in args if a.startswith(k + '=')), d))
MUS, WT = _arg('mus', .45), _arg('wt', .38)   # schlanker, sportlicher Körperbau

mp = 'bl_ext.user_default.mpfb.services.'
HS = importlib.import_module(mp + 'humanservice').HumanService
DATA = os.path.expanduser('~/Library/Application Support/Blender/5.2/extensions/.user/user_default/mpfb/data/')

for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
macro = {"gender": 1.0, "age": 0.45, "muscle": MUS, "weight": WT, "height": 0.55, "proportions": 0.85,
         "cupsize": 0.5, "firmness": 0.5, "race": {"african": 0.15, "asian": 0.15, "caucasian": 0.7}}
bm = HS.create_human(macro_detail_dict=macro)
rig = HS.add_builtin_rig(bm, "mixamo")
def clothe(rel, kind="Clothes"):
    try: return HS.add_mhclo_asset(os.path.join(DATA, rel), bm, asset_type=kind, subdiv_levels=0, material_type="MAKESKIN")
    except Exception as e: print('ASSETFAIL', rel, e); return None
shirt = clothe('clothes/male_casualsuit04/male_casualsuit04.mhclo')
shoes = clothe('clothes/shoes05/shoes05.mhclo')
hair = clothe('hair/short02/short02.mhclo', 'Hair')
brows = clothe('eyebrows/eyebrow001/eyebrow001.mhclo', 'Eyebrows')
eyes = clothe('eyes/low-poly/low-poly.mhclo', 'Eyes')

# ---- Material: zwei Schattierungsstufen (Licht/Schatten) als Emission, damit es wie eine Illustration wirkt ----
def toon(name, base, shade):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    o = nt.nodes.new('ShaderNodeOutputMaterial'); d = nt.nodes.new('ShaderNodeBsdfDiffuse'); s = nt.nodes.new('ShaderNodeShaderToRGB')
    r = nt.nodes.new('ShaderNodeValToRGB'); e = nt.nodes.new('ShaderNodeEmission')
    r.color_ramp.interpolation = 'CONSTANT'; r.color_ramp.elements[0].color = (*shade, 1); r.color_ramp.elements[1].position = .42; r.color_ramp.elements[1].color = (*base, 1)
    nt.links.new(d.outputs[0], s.inputs[0]); nt.links.new(s.outputs[0], r.inputs[0]); nt.links.new(r.outputs[0], e.inputs[0]); nt.links.new(e.outputs[0], o.inputs[0])
    return m
srgb = lambda h: tuple(((int(h[i:i + 2], 16) / 255 + .055) / 1.055) ** 2.4 for i in (1, 3, 5))
M = {'skinF': toon('skinF', srgb('#c99270'), srgb('#a87554')), 'pantsF': toon('pantsF', srgb('#111f4a'), srgb('#08143a')),
     'shoeF': toon('shoeF', srgb('#d3dee2'), srgb('#b3c3c9')),
     'skin': toon('skin', srgb('#e8b28c'), srgb('#c98d6a')), 'shirt': toon('shirt', srgb('#0a8a96'), srgb('#00626c')),
     'pants': toon('pants', srgb('#1a2b5e'), srgb('#0b1c49')), 'shoe': toon('shoe', srgb('#f4f7f8'), srgb('#c6d3d8')),
     'hair': toon('hair', srgb('#3a2a24'), srgb('#24191a')), 'brow': toon('brow', srgb('#3a2a24'), srgb('#24191a'))}
def setmat(obj, mat):
    if not obj: return
    obj.data.materials.clear(); obj.data.materials.append(mat)
setmat(bm, M['skin']); setmat(hair, M['hair']); setmat(brows, M['skin']); setmat(shoes, M['shoe']); setmat(eyes, M['skin'])   # Gesicht ohne Augen und Brauen
def far_faces(ob, slot):
    """Flächen, deren Vertices überwiegend an Knochen der rechten Körperseite hängen (von der Kamera abgewandt), bekommen slot"""
    if not ob: return
    right = {g.index for g in ob.vertex_groups if g.name.startswith('mixamorig:Right')}
    def side(v):
        r = sum(g.weight for g in v.groups if g.group in right); t = sum(g.weight for g in v.groups if g.group in {x.index for x in ob.vertex_groups if x.name.startswith('mixamorig:')}) or 1
        return r / t
    sv = [side(v) for v in ob.data.vertices]
    for p in ob.data.polygons:
        if sum(sv[i] for i in p.vertices) / len(p.vertices) > .5: p.material_index = slot
bm.data.materials.append(M['skinF']); far_faces(bm, 1)
if shoes:
    shoes.data.materials.append(M['shoeF'])
    for p in shoes.data.polygons: p.material_index = 1 if p.center.x < 0 else 0
    # Socken entfernen: alles oberhalb des Schuhschafts (Ruhelage) löschen, damit nichts unter dem Hosensaum hervorschaut
    import bmesh as _bm
    zs = [v.co.z for v in shoes.data.vertices]; z0 = min(zs); cut = z0 + SHOE; print('SCHUH', round(z0, 3), round(cut, 3))
    g = _bm.new(); g.from_mesh(shoes.data); dl = [f for f in g.faces if sum(v.co.z for v in f.verts) / len(f.verts) > cut]
    _bm.ops.delete(g, geom=dl, context='FACES')
    # Schuhöffnung schließen: kein Blick ins Innere, die Kontur bleibt durchgehend
    _nf0 = len(g.faces); _bm.ops.holes_fill(g, edges=[e for e in g.edges if e.is_boundary], sides=0); g.faces.ensure_lookup_table()
    # Deckel der Schuhöffnung in Hosenfarbe: Von vorn sieht man sonst ein weißes Feld zwischen Hosensaum und Schuh
    for f_ in list(g.faces)[_nf0:]: f_.material_index = 4 if f_.calc_center_median().x < 0 else 3
    g.to_mesh(shoes.data); g.free(); print('SOCKEN_GELOESCHT', len(dl))
    shoes.data.materials.append(toon('sohle', srgb('#5b6f80'), srgb('#44566a'))); shoes.data.materials.append(M['pants']); shoes.data.materials.append(M['pantsF'])   # Plätze 2, 3, 4
    # Sohle farbig absetzen: Der Schuh ist dadurch in jeder Ansicht als Schuh lesbar (sonst wirkt er von vorn wie ein Klotz)
    SOHLE = float(next((a.split('=')[1] for a in args if a.startswith('sohle=')), .02))
    if SOHLE > 0:
        for p in shoes.data.polygons:
            if p.center.z < z0 + SOHLE and p.material_index < 3: p.material_index = 2
exec(open(os.path.expanduser('~/Documents/Relentless-3D/work/schuh_teil.py')).read())   # Turnschuh: Sohle, Schaftfarbe, Schnürfeld
# Anzug: T-Shirt und Hose sind getrennte Netzteile. Teile über verbundene Kanten bestimmen; jedes Teil bekommt als Ganzes
# Shirt- oder Hosenfarbe (nach mittlerer Höhe), so entsteht am Saum keine Treppe
if shirt:
    shirt.data.materials.clear(); shirt.data.materials.append(M['shirt']); shirt.data.materials.append(M['pants'])
    me = shirt.data; par = list(range(len(me.vertices)))
    def fnd(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    for e in me.edges:
        a, b = fnd(e.vertices[0]), fnd(e.vertices[1])
        if a != b: par[a] = b
    isl = {}
    for v in me.vertices: isl.setdefault(fnd(v.index), []).append(v.co.z)
    zall = [v.co.z for v in me.vertices]; mid = (min(zall) + max(zall)) / 2
    top = {r for r, zz in isl.items() if sum(zz) / len(zz) > mid}
    print('INSELN', len(isl), 'oben', len(top))
    for p in me.polygons: p.material_index = 0 if fnd(p.vertices[0]) in top else 1
    shirt.data.materials.append(M['pantsF'])
    # Hosensaum: unterste 2,5 cm abschneiden (dort liegt ein umgeschlagener Saum, der über den Schuh absteht)
    import bmesh as _bm2
    # Hosensaum gerade abschneiden: Ebene quer durch den umgeschlagenen Saum, alles darunter weg (glatte Kante statt Treppe)
    pz = [me.vertices[i].co.z for p in me.polygons if p.material_index == 1 for i in p.vertices]; hem = min(pz) + HEM
    g2 = _bm2.new(); g2.from_mesh(me)
    _bm2.ops.bisect_plane(g2, geom=g2.verts[:] + g2.edges[:] + g2.faces[:], plane_co=(0, 0, hem), plane_no=(0, 0, 1), clear_inner=True)
    g2.to_mesh(me); g2.free(); print('SAUM', round(min(pz), 3), round(hem, 3))
    # rechtes Hosenbein (Ruhelage x < 0) als Ganzes dunkler: eine klare Farbe je Bein, keine Flecken am Saum
    for p in me.polygons:
        if p.material_index == 1 and p.center.x < 0: p.material_index = 2

exec(open(os.path.expanduser('~/Documents/Relentless-3D/work/trikot_teil.py')).read())   # eng anliegendes Trikot
exec(open(os.path.expanduser('~/Documents/Relentless-3D/work/koerper_teil.py')).read())   # Gesäß am Becken, Glättung an Hüfte, Schulter, Knie

# Haut unter der Kleidung in Kleidungsfarbe: Sticht bei starker Beugung Haut durch Shirt oder Hose, fällt das nicht auf.
# Unter dem Hosensaum läuft die Hosenfarbe bis zum Schuh weiter (kein Hautstreifen am Knöchel).
if shirt:
    from mathutils.kdtree import KDTree
    me_ = shirt.data; bnd = set()
    import bmesh as _bm4
    g4 = _bm4.new(); g4.from_mesh(me_); g4.verts.ensure_lookup_table()
    for e_ in g4.edges:
        if e_.is_boundary: bnd.update(v.index for v in e_.verts)
    ring = set(bnd)
    for e_ in g4.edges:
        a_, b_ = e_.verts[0].index, e_.verts[1].index
        if a_ in bnd or b_ in bnd: ring.update((a_, b_))
    vmat = {}
    for p_ in me_.polygons:
        for i_ in p_.vertices: vmat[i_] = p_.material_index
    g4.free()
    kd = KDTree(len(me_.vertices))
    for v in me_.vertices: kd.insert(v.co, v.index)
    kd.balance()
    hemz = min(me_.vertices[i].co.z for i, m_ in vmat.items() if m_ in (1, 2))
    ztop_ = max(v.co.z for v in me_.vertices); col_ = [me_.vertices[i].co.z for i in bnd if me_.vertices[i].co.z > ztop_ - .15 and abs(me_.vertices[i].co.x) < .12]
    colz = (min(col_) if col_ else ztop_) - .025      # Shirtfarbe nur klar unterhalb des Kragenrands, der Hals bleibt Haut
    legs_ = {bm.vertex_groups[n_].index for n_ in ('mixamorig:LeftUpLeg', 'mixamorig:RightUpLeg', 'mixamorig:LeftLeg', 'mixamorig:RightLeg', 'mixamorig:LeftFoot', 'mixamorig:RightFoot', 'mixamorig:LeftToeBase', 'mixamorig:RightToeBase') if n_ in bm.vertex_groups}
    flag = {}
    for v in bm.data.vertices:
        vc_ = BCO[v.index]; co, idx, dist = kd.find(vc_)
        if dist < .03 and idx not in ring:
            if vmat.get(idx, 0) != 0: flag[v.index] = 'pants'
            elif vc_.z < colz: flag[v.index] = 'shirt'
        elif dist < .03 and vmat.get(idx, 0) in (1, 2) and vc_.z < hemz + .06: flag[v.index] = 'pants'
        elif sum(g.weight for g in v.groups if g.group in legs_) > .5: flag[v.index] = 'pants'   # ganzes Bein: auch im weiten Hosenbein und am Knöchel keine Haut
    bm.data.materials.append(M['shirt']); bm.data.materials.append(M['pants']); bm.data.materials.append(M['pantsF'])   # Plätze 2, 3, 4
    n_s = n_p = 0
    for p_ in bm.data.polygons:
        fl_ = [flag.get(i) for i in p_.vertices]
        if all(f_ == 'shirt' for f_ in fl_): p_.material_index = 2; n_s += 1
        elif all(f_ in ('shirt', 'pants') for f_ in fl_): p_.material_index = 4 if p_.center.x < 0 else 3; n_p += 1
    print('HAUT_UNTER_KLEIDUNG Shirt', n_s, 'Hose', n_p)
    if shoes:
        # Fuß im Schuh in Schuhfarbe (kein Hautstreifen, falls der Fuß durch das Obermaterial sticht)
        ks = KDTree(len(shoes.data.vertices))
        for v in shoes.data.vertices: ks.insert(v.co, v.index)
        ks.balance(); zsh_ = min(x.co.z for x in shoes.data.vertices) + SHOE - .01; inshoe = {i for i, c in enumerate(BCO) if c.z < zsh_ and ks.find(c)[2] < .028}
        bm.data.materials.append(M['shoe']); bm.data.materials.append(M['shoeF'])   # Plätze 5, 6
        for p_ in bm.data.polygons:
            if any(i in inshoe for i in p_.vertices) and all(i in inshoe or flag.get(i) == 'pants' for i in p_.vertices): p_.material_index = 6 if p_.center.x < 0 else 5

# Glättung: eine Unterteilungsstufe nach der Verformung, damit Säume und Umrisse rund werden
for ob in (bm, shirt, shoes):
    if ob:
        for m in list(ob.modifiers):
            if m.type == 'SUBSURF': ob.modifiers.remove(m)
        sm = ob.modifiers.new('glatt', 'SUBSURF'); sm.levels = 1; sm.render_levels = 1
# ---- Pose: Knochen in Weltrichtungen ausrichten (kleinste Drehung, Rolle bleibt natürlich) ----
bpy.context.view_layer.objects.active = rig; bpy.ops.object.mode_set(mode='POSE')
PB = rig.pose.bones
B = lambda n: PB['mixamorig:' + n]
def aim(name, d):
    pb = B(name); bpy.context.view_layer.update()
    cur = (rig.matrix_world @ pb.matrix).to_3x3() @ Vector((0, 1, 0))
    q = cur.normalized().rotation_difference(Vector(d).normalized())
    W = rig.matrix_world @ pb.matrix; R = q.to_matrix().to_4x4()
    t = W.translation.copy(); W2 = R @ Matrix.Translation(-t) @ W; W2 = Matrix.Translation(t) @ W2
    pb.matrix = rig.matrix_world.inverted() @ W2; bpy.context.view_layer.update()
def dirv(deg, up=0.0):
    """Richtung in der Bildebene der Seitenansicht: 0° = zum Kopfende/vorn (+Y), 90° = nach oben (+Z)"""
    a = math.radians(deg); return (0, math.cos(a), math.sin(a))
def reset():
    for pb in PB: pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    bpy.context.view_layer.update()
def key(frame):
    for pb in PB: pb.keyframe_insert('rotation_quaternion', frame=frame); pb.keyframe_insert('location', frame=frame)


def relax_hands():
    # Daumen an die Hand legen (Achse/Winkel über Parameter th=<achse><grad>, z. B. x25)
    for side in ('Left', 'Right'):
        for i in (1, 2):
            pb = B(f'{side}HandThumb{i}'); pb.rotation_mode = 'XYZ'
            ang_ = math.radians(TH[1] if i == 1 else TH[1] * .4); pb.rotation_euler = {'x': (ang_, 0, 0), 'y': (0, ang_, 0), 'z': (0, 0, ang_)}[TH[0]]; pb.rotation_mode = 'QUATERNION'
    for side in ('Left', 'Right'):
        for f in ('Index', 'Middle', 'Ring', 'Pinky'):
            for i in (1, 2, 3):
                # entspannte Hand: Finger fast gestreckt, leicht gebeugt und eng beieinander (nicht gespreizt)
                sp = {'Index': FS, 'Middle': 0, 'Ring': -FS, 'Pinky': -2 * FS}[f] if i == 1 else 0
                pb = B(f'{side}Hand{f}{i}'); pb.rotation_mode = 'XYZ'; c = math.radians((2, 4, 3)[i - 1] * FK); a = math.radians(sp); pb.rotation_euler = (a, 0, c) if FAX == 'z' else (c, 0, a) if FAX == 'x' else (0, c, a); pb.rotation_mode = 'QUATERNION'



# ---- Szene: Licht, Kamera, Boden, Kontur ----
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sc.collection.objects.link(sun)
sun.rotation_euler = (math.radians(35), math.radians(-30), math.radians(60)); sun.data.energy = 3
w = sc.world or bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (*srgb('#eaf3f5'), 1); w.node_tree.nodes['Background'].inputs[1].default_value = 1
sc.render.film_transparent = False; sc.view_settings.view_transform = 'Standard'
sc.render.use_freestyle = True; sc.render.line_thickness_mode = 'ABSOLUTE'; sc.render.line_thickness = 1.1
ls = sc.view_layers[0].freestyle_settings.linesets[0]; ls.linestyle.color = srgb('#0b1c49'); ls.select_by_visibility = True
ls.select_silhouette = True; ls.select_border = False; ls.select_crease = False
noline = bpy.data.collections.new('ohne_kontur'); sc.collection.children.link(noline)
for ob in (hair, brows, eyes, shoes):
    if ob:
        for c in list(ob.users_collection): c.objects.unlink(ob)
        noline.objects.link(ob)
ls.select_by_collection = True; ls.collection = noline; ls.collection_negation = 'EXCLUSIVE'
# Gesicht: keine Innenlinien (Augenhöhle, Ohr); Kopf bekommt nur die Außenkontur
hg = bm.vertex_groups.get('ears'); hidx = hg.index if hg else -1
fm = bm.data.attributes.get('freestyle_face') or bm.data.attributes.new('freestyle_face', 'BOOLEAN', 'FACE')
# Gesichtsfeld (Augen, Nase, Mund) ebenfalls ohne Innenlinien: ruhiges Gesicht wie in flachen Illustrationen, keine „Schlitzaugen“
def _gv(name):
    gi_ = bm.vertex_groups[name].index; return [v.co for v in bm.data.vertices if any(g.group == gi_ and g.weight > .5 for g in v.groups)]
_ey = _gv('helper-l-eye') + _gv('helper-r-eye'); _lp = _gv('lips')
_ez = sum(v.z for v in _ey) / len(_ey); _ex = max(abs(v.x) for v in _ey); _eyf = min(v.y for v in _ey); _lz = min(v.z for v in _lp)
_hdi = bm.vertex_groups['mixamorig:Head'].index
_chz = min(v.co.z for v in bm.data.vertices if abs(v.co.x) < .03 and v.co.y < _eyf + .05 and any(g.group == _hdi and g.weight > .5 for g in v.groups))   # Kinnspitze
# Gesichtsfeld samt Kinn und Kieferunterseite: Die Kinnkante vor dem Hals würde von vorn wie ein aufgemalter Mund wirken
GENG = _arg('geng', 1)   # 1: nur Augen, Nase, Mund und Kinnmitte ohne Linien; Wange und Kiefer behalten ihre Kontur (sonst fehlt sie vor Matte oder Arm)
# Kinnmitte ohne Linie nur, wo das Gesicht von vorn zu sehen ist (dort wirkt die Kinnkante wie ein Mund); liegt der Kopf, braucht das Kinn seine Kontur
KINN = _arg('kinn', 1 if EX in ('hip9090', 'pallof', 't_stand', 't_ueberkopf', 't_hocke', 't_langsitz', 't_fersensitz') else 0)
_face = (lambda c: (abs(c.x) < _ex + .005 and _lz - .015 < c.z < _ez + .03 and c.y < _eyf + .03) or (KINN and abs(c.x) < .035 and _chz - .012 < c.z <= _lz and c.y < _eyf + .11)) if GENG else \
        (lambda c: (abs(c.x) < _ex + .03 and _lz - .015 < c.z < _ez + .04 and c.y < _eyf + .035) or (abs(c.x) < _ex + .05 and _chz - .012 < c.z <= _lz and c.y < _eyf + .11))
for f in bm.data.polygons:
    fm.data[f.index].value = GENG < 2 and (_face(f.center) or any(any(g.group == hidx and g.weight > .5 for g in bm.data.vertices[i].groups) for i in f.vertices))   # geng=2: Prüfhilfe ohne Markierung
ls.select_by_face_marks = True; ls.face_mark_negation = 'EXCLUSIVE'; ls.face_mark_condition = 'ONE'
# Punktförmige Strichreste (unter 4 Pixel) bei den Innenlinien weglassen; längere Stücke bleiben, sonst reißt der Umriss auf
_lsA = ls.linestyle.copy(); ls.linestyle.use_length_min = True; ls.linestyle.length_min = LMIN
ls2 = sc.view_layers[0].freestyle_settings.linesets.new('aussen'); ls2.linestyle = _lsA
ls2.select_by_visibility = True; ls2.select_by_edge_types = True; ls2.select_silhouette = False; ls2.select_border = False; ls2.select_crease = False
ls2.select_external_contour = True
# Säume (Ärmel, Hosenbein, Shirtrand, Schuhrand): offene Kanten der Kleidung als durchgehende Linie
kl = bpy.data.collections.new('kleidung'); sc.collection.children.link(kl)
for ob in (shirt,):
    if ob:
        for c in list(ob.users_collection): c.objects.unlink(ob)
        kl.objects.link(ob)
ls3 = sc.view_layers[0].freestyle_settings.linesets.new('saeume'); ls3.linestyle = _lsA
ls3.select_by_visibility = True; ls3.select_by_edge_types = True; ls3.select_silhouette = False; ls3.select_border = True; ls3.select_crease = False
ls3.select_by_collection = True; ls3.collection = kl; ls3.collection_negation = 'INCLUSIVE'
HAARLINIE = _arg('haarlinie', 30)   # Umriss der Haare: nur lange Striche (Pixel), damit vor Matte oder Arm eine Kontur bleibt, ohne Strähnen-Gekritzel
if hair and HAARLINIE > 0:
    hk_ = bpy.data.collections.new('haar'); sc.collection.children.link(hk_)
    for c in list(hair.users_collection): c.objects.unlink(hair)
    hk_.objects.link(hair)
    ls5 = sc.view_layers[0].freestyle_settings.linesets.new('haar'); ls5.linestyle = _lsA.copy(); ls5.linestyle.use_length_min = True; ls5.linestyle.length_min = HAARLINIE
    ls5.select_by_visibility = True; ls5.select_by_edge_types = True; ls5.select_silhouette = True; ls5.select_border = False; ls5.select_crease = False
    ls5.select_by_collection = True; ls5.collection = hk_; ls5.collection_negation = 'INCLUSIVE'
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'; cam.location = (6, 0, .6); cam.rotation_euler = (math.radians(90), 0, math.radians(90))
sc.render.resolution_x, sc.render.resolution_y = 960, 600


MESHES = [o for o in (bm, shirt, shoes, hair) if o]
def low(groups=None):
    """tiefster Punkt (z) der Figur oder nur der Vertices mit Gewicht > 0,3 in den genannten Knochengruppen"""
    deps = bpy.context.evaluated_depsgraph_get(); m = 9
    for ob in MESHES:
        gi = None if groups is None else {ob.vertex_groups[g].index for g in groups if g in ob.vertex_groups}
        if gi is not None and not gi: continue
        e = ob.evaluated_get(deps); mw = e.matrix_world
        for v, v0 in zip(e.data.vertices, ob.data.vertices):
            if gi is not None and not any(g.group in gi and g.weight > .3 for g in v0.groups): continue
            m = min(m, (mw @ v.co).z)
    return m
