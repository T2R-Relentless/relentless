# Turnschuh statt „Socke“: dickere, abgesetzte Sohle mit Rand, farbiger Schaft, helles Schnürfeld auf dem Spann.
# Wird von basis_teil.py und figur.py nach dem Zuschneiden der Schuhe eingebunden. Abschalten: schuhart=0
import bmesh as _bS
from mathutils import Vector as _VS
_argS = lambda k, d: float(next((a.split('=')[1] for a in args if a.startswith(k + '=')), d))
SCHUHART = next((a.split('=')[1] for a in args if a.startswith('schuhart=')), 'a')
SCHUHNEU = bool(shoes) and SCHUHART != '0'
if SCHUHNEU:
    SHOCH, SWAND, SRAND, SLIN = _argS('shoch', .016), _argS('swand', .022), _argS('srand', .004), _argS('slin', .0015)
    _me = shoes.data; _z0 = min(v.co.z for v in _me.vertices); _z1 = _z0 + SHOCH
    # Der Schuh ist starr: Die übernommenen Gewichte hängen ihn überwiegend an den Unterschenkel, dann knickt er beim Strecken
    # und Beugen des Fußes in der Mitte ein. Deshalb folgt der ganze Schuh dem Fuß, nur die Zehenkappe dem Zehenknochen.
    _gi = {}
    for sd_ in ('Left', 'Right'):
        for bn_ in ('Foot', 'ToeBase'):
            n_ = f'mixamorig:{sd_}{bn_}'; _gi[sd_, bn_] = (shoes.vertex_groups.get(n_) or shoes.vertex_groups.new(name=n_)).index
    _mx = {x.index for x in shoes.vertex_groups if x.name.startswith('mixamorig:')}
    g = _bS.new(); g.from_mesh(_me)
    _dl = g.verts.layers.deform.verify()
    for v in g.verts:
        sd_ = 'Left' if v.co.x > 0 else 'Right'; a_ = rig.data.bones[f'mixamorig:{sd_}Foot'].head_local; b_ = rig.data.bones[f'mixamorig:{sd_}ToeBase'].head_local
        d_ = _VS((b_.x - a_.x, b_.y - a_.y)); l_ = d_.length; u_ = (_VS((v.co.x, v.co.y)) - _VS((a_.x, a_.y))).dot(d_ / l_)
        t_ = max(0.0, min(1.0, (u_ - (l_ - .012)) / .03)); t_ = t_ * t_ * (3 - 2 * t_)
        for k_ in [k for k in v[_dl].keys() if k in _mx]: del v[_dl][k_]
        v[_dl][_gi[sd_, 'Foot']] = 1 - t_
        if t_ > 0: v[_dl][_gi[sd_, 'ToeBase']] = t_
    # Ebenen zuerst anlegen: Neue Ebenen machen vorhandene Verweise auf Punkte und Kanten ungültig
    _cr = g.edges.layers.float.get('crease_edge') or g.edges.layers.float.new('crease_edge')
    _ls, _ll, _lc = g.verts.layers.float.new('sohle'), g.verts.layers.float.new('lauf'), g.verts.layers.float.new('schnur')
    # Die weiche Unterseite des Schuhs in fester Höhe abschneiden und durch eine gebaute Sohle ersetzen: kleiner Rand nach außen,
    # senkrechte Wand, ebene Lauffläche. So ist die Sohle aus jeder Richtung als Sohle zu erkennen.
    _bS.ops.bisect_plane(g, geom=g.verts[:] + g.edges[:] + g.faces[:], plane_co=(0, 0, _z1), plane_no=(0, 0, 1), clear_inner=True)
    _e0 = [e for e in g.edges if e.is_boundary and all(abs(v.co.z - _z1) < 1e-4 for v in e.verts)]
    _nb = {}
    for e in _e0:
        a_, b_ = e.verts; _nb.setdefault(a_, []).append(b_); _nb.setdefault(b_, []).append(a_)
    _seen, _loops = set(), []
    for s0_ in list(_nb):
        if s0_ in _seen: continue
        lp_ = [s0_]; _seen.add(s0_); cur_ = s0_
        while True:
            nx_ = [x for x in _nb[cur_] if x not in _seen]
            if not nx_: break
            cur_ = nx_[0]; lp_.append(cur_); _seen.add(cur_)
        if len(lp_) > 8: _loops.append(lp_)
    _ax = {}
    for sd_, sg_ in (('Left', 1), ('Right', -1)):
        a_ = rig.data.bones[f'mixamorig:{sd_}Foot'].head_local; b_ = rig.data.bones[f'mixamorig:{sd_}ToeBase'].head_local
        d_ = _VS((b_.x - a_.x, b_.y - a_.y)).normalized(); _ax[sg_] = (_VS((a_.x, a_.y)), d_, _VS((-d_.y, d_.x)), (_VS((b_.x - a_.x, b_.y - a_.y))).length)
    _s1, _s2, _v3 = set(), set(), set(); _ek = []
    _zt = max(v.co.z for v in g.verts)   # Schaftrand: Das Schnürfeld endet knapp darunter
    for lp_ in _loops:
        cen_ = sum((v.co for v in lp_), _VS()) / len(lp_); o_, d_, p_, l_ = _ax[1 if cen_.x > 0 else -1]
        us_ = [(_VS((v.co.x, v.co.y)) - o_).dot(d_) for v in lp_]; ut_, uh_ = max(us_), min(us_); r1_, r2_, r3_ = [], [], []
        for v, u_ in zip(lp_, us_):
            dr_ = v.co - cen_; dr_.z = 0; dr_.normalize()
            # Zehenspitze und Ferse der Sohle leicht hochgezogen (wie bei einem Laufschuh), die Lauffläche dazwischen bleibt eben
            zb_ = _z1 - SWAND + .009 * max(0, (u_ - (ut_ - .05)) / .05) ** 2 + .004 * max(0, ((uh_ + .03) - u_) / .03) ** 2
            a_ = g.verts.new(v.co + dr_ * SRAND + _VS((0, 0, -.002)), v); b_ = g.verts.new(_VS((v.co.x, v.co.y, zb_)) + dr_ * (SRAND + .0015), v)
            c_ = g.verts.new(_VS((v.co.x, v.co.y, zb_)) + dr_ * (SRAND - .005), v); r1_.append(a_); r2_.append(b_); r3_.append(c_)
        n_ = len(lp_)
        for ra_, rb_ in ((lp_, r1_), (r1_, r2_), (r2_, r3_)):
            for i_ in range(n_): g.faces.new((ra_[i_], ra_[(i_ + 1) % n_], rb_[(i_ + 1) % n_], rb_[i_]))
        g.faces.new(r3_); _s1 |= set(r1_); _s2 |= set(r2_); _v3 |= set(r3_)
        for rr_, cv_ in ((lp_, .5), (r1_, 1.0), (r2_, .8)):
            for i_ in range(n_): _ek.append((rr_[i_], rr_[(i_ + 1) % n_], cv_))
    for a_, b_, cv_ in _ek:
        e_ = g.edges.get((a_, b_))
        if e_: e_[_cr] = cv_
    _bS.ops.recalc_face_normals(g, faces=g.faces[:])
    for v in g.verts:
        c = v.co; v[_ls] = .004 if v in _s1 else .03 if (v in _s2 or v in _v3) else max(-.05, min(0, _z1 - c.z))
        v[_ll] = .004 if v in _v3 else -.004 if v in _s2 else -.02
        o_, d_, p_, l_ = _ax[1 if c.x > 0 else -1]; q_ = _VS((c.x, c.y)) - o_; u_, w_ = q_.dot(d_), q_.dot(p_)
        # Schnürfeld: Streifen mittig auf dem Spann, vom Schaftrand bis kurz vor die Zehen
        v[_lc] = max(-.05, min(.015 - abs(w_), u_ - .3 * l_, 1.02 * l_ - u_, c.z - (_z1 + .012), _zt - .018 - c.z))
    for f in g.faces:
        if f.material_index < 3: f.material_index = 1 if f.calc_center_median().x < 0 else 0
    g.normal_update(); g.to_mesh(_me); g.free()
    print('SCHUHNEU', SCHUHART, 'Schnitt', round(_z1, 3), 'Ringe', [len(x) for x in _loops], 'tiefster Punkt', round(min(v.co.z for v in _me.vertices), 3))
    _SF = {'a': dict(o=('#0a8a96', '#00626c'), oF=('#087783', '#00535c'), s=('#f4f7f8', '#c6d3d8'), sF=('#d3dee2', '#b3c3c9'), l=('#f4f7f8', '#c6d3d8'), lF=('#d3dee2', '#b3c3c9')),
           'b': dict(o=('#f4f7f8', '#c6d3d8'), oF=('#d3dee2', '#b3c3c9'), s=('#0a8a96', '#00626c'), sF=('#087783', '#00535c'), l=('#b9cbd1', '#9fb3ba'), lF=('#a5b8bf', '#8ea2a9')),
           'c': dict(o=('#f4f7f8', '#c6d3d8'), oF=('#d3dee2', '#b3c3c9'), s=('#1a2b5e', '#0b1c49'), sF=('#111f4a', '#08143a'), l=('#0a8a96', '#00626c'), lF=('#087783', '#00535c'))}[SCHUHART]
    def toonS(name, ob_, so_, la_, tr_, line):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear(); N = nt.nodes.new; L = nt.links.new
        o = N('ShaderNodeOutputMaterial'); d = N('ShaderNodeBsdfDiffuse'); s = N('ShaderNodeShaderToRGB'); e = N('ShaderNodeEmission'); L(d.outputs[0], s.inputs[0])
        def ramp(c):
            r = N('ShaderNodeValToRGB'); r.color_ramp.interpolation = 'CONSTANT'; r.color_ramp.elements[0].color = (*srgb(c[1]), 1); r.color_ramp.elements[1].position = .42
            r.color_ramp.elements[1].color = (*srgb(c[0]), 1); L(s.outputs[0], r.inputs[0]); return r
        def attr(n):
            a = N('ShaderNodeAttribute'); a.attribute_type = 'GEOMETRY'; a.attribute_name = n; return a
        def gt(sock, t=0.0):
            x = N('ShaderNodeMath'); x.operation = 'GREATER_THAN'; x.inputs[1].default_value = t; L(sock, x.inputs[0]); return x
        def mix(f, a, b):
            x = N('ShaderNodeMix'); x.data_type = 'RGBA'; L(f, x.inputs[0]); L(a, x.inputs[6])
            if isinstance(b, tuple): x.inputs[7].default_value = (*b, 1)
            else: L(b, x.inputs[7])
            return x.outputs[2]
        aS, aL, aC = attr('sohle'), attr('lauf'), attr('schnur')
        c = mix(gt(aC.outputs['Fac']).outputs[0], ramp(ob_).outputs[0], ramp(la_).outputs[0])
        c = mix(gt(aS.outputs['Fac']).outputs[0], c, ramp(so_).outputs[0])
        both = N('ShaderNodeMath'); both.operation = 'MULTIPLY'; L(gt(aS.outputs['Fac'], .004).outputs[0], both.inputs[0]); L(gt(aL.outputs['Fac']).outputs[0], both.inputs[1])
        c = mix(both.outputs[0], c, ramp(tr_).outputs[0])
        ab = N('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; L(aS.outputs['Fac'], ab.inputs[0]); lt = N('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = SLIN; L(ab.outputs[0], lt.inputs[0])
        c = mix(lt.outputs[0], c, line)
        L(c, e.inputs[0]); L(e.outputs[0], o.inputs[0]); return m
    _tr = ('#5b6f80', '#44566a'); _li = srgb('#0b1c49')
    shoes.data.materials[0] = toonS('schuh', _SF['o'], _SF['s'], _SF['l'], _tr, _li); shoes.data.materials[1] = toonS('schuhF', _SF['oF'], _SF['sF'], _SF['lF'], _tr, _li)
    # Fuß im Schuh (falls er durch das Obermaterial sticht) in Schaftfarbe
    M['shoe'] = toon('shoeO', srgb(_SF['o'][0]), srgb(_SF['o'][1])); M['shoeF'] = toon('shoeOF', srgb(_SF['oF'][0]), srgb(_SF['oF'][1]))
