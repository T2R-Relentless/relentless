# Eng anliegendes Trikot statt des weiten Shirt-Netzes (wird von basis_teil.py und figur.py eingebunden).
# Das Oberteil des Anzugs wird entfernt; der Körper selbst trägt die Trikotfarbe. Wo das Trikot endet (Halsausschnitt,
# Ärmel), bestimmt ein Abstandswert je Körperpunkt („hemd“, in Metern, > 0 = im Trikot). Das Material färbt danach und
# zeichnet am Übergang eine feine Saumlinie. So bleibt der Rand glatt, unabhängig vom Netz, und nichts sticht durch.
import bmesh as _bmT
# Wirkliche Ruhelage des Körpers: Die Körperform entsteht erst durch Formschlüssel, bm.data.vertices[].co ist nur die Grundform
_kT = bm.shape_key_add(name='_mix', from_mix=True); BCO = [d.co.copy() for d in _kT.data]; bm.shape_key_remove(_kT)
_argT = lambda k, d: float(next((a.split('=')[1] for a in args if a.startswith(k + '=')), d))
TRIKOT = bool(shirt) and _argT('eng', 1) > 0
LOGOW, LOGOZ = _argT('logow', .19), _argT('logoz', .165)   # Breite des Brustlogos und Abstand seiner Mitte unter dem Halsansatz (m)
KR0, KRY, KRR, AERMEL, SAUMW = _argT('kr0', .01), _argT('kry', -.02), _argT('krr', .085), _argT('aermel', .5), _argT('saumw', .003)
if TRIKOT:
    gT = _bmT.new(); gT.from_mesh(shirt.data)
    _bmT.ops.delete(gT, geom=[f for f in gT.faces if f.material_index == 0], context='FACES'); gT.to_mesh(shirt.data); gT.free(); shirt.data.update()
    bund = max(v.co.z for v in shirt.data.vertices)                       # Oberkante Hosenbund (Ruhelage)
    # Hosenbund anliegend: die obersten 10 cm der Hose bis auf 6 mm an den Körper ziehen (kein Blick in die Hose von oben)
    from mathutils.bvhtree import BVHTree as _BVT
    hxT = {bm.vertex_groups[n].index for n in ('HelperGeometry', 'JointCubes') if n in bm.vertex_groups}
    hvT = {v.index for v in bm.data.vertices if any(g.group in hxT and g.weight > 0 for g in v.groups)}
    bvT = _BVT.FromPolygons(BCO, [tuple(p.vertices) for p in bm.data.polygons if not any(i in hvT for i in p.vertices)])
    for v in shirt.data.vertices:
        if v.co.z > bund - .10:
            hit = bvT.find_nearest(v.co)
            if hit and hit[0] is not None:
                d_ = (v.co - hit[0]).length; w_ = min(1.0, (v.co.z - (bund - .10)) / .07); w_ = w_ * w_ * (3 - 2 * w_)
                z_ = d_ + (.006 - d_) * w_
                if d_ > 1e-6 and z_ < d_: v.co = hit[0] + (v.co - hit[0]) * (z_ / d_)
    # Der Körper wird unter dem Anzug nicht mehr ausgeblendet: Rumpf trägt die Trikotfarbe, Becken und Beine die Hosenfarbe.
    # So entsteht kein Loch, wenn die Hose bei starker Hüftbeugung verrutscht.
    for g in bm.vertex_groups:
        if g.name.startswith('Delete.male_casualsuit'): g.remove(list(range(len(BCO))))
    # Abstandswert: Halsausschnitt (Kugel um den Halsansatz, ergibt einen runden Ausschnitt) und Ärmelenden (Ebene quer zum Oberarm)
    RBt = rig.data.bones; nkT = RBt['mixamorig:Neck'].head_local
    armsT = {}
    for s_ in ('Left', 'Right'):
        a_, b_ = RBt[f'mixamorig:{s_}Arm'].head_local, RBt[f'mixamorig:{s_}ForeArm'].head_local
        armsT[s_] = (a_.copy(), (b_ - a_).normalized(), (b_ - a_).length,
                     {g.index for g in bm.vertex_groups if g.name.startswith('mixamorig:' + s_) and ('Arm' in g.name or 'Hand' in g.name)})
    valsT = []; hoseT = []
    hdT = bm.vertex_groups['mixamorig:Head'].index
    mxT = {g.index for g in bm.vertex_groups if g.name.startswith('mixamorig:')}
    from mathutils import Vector as _VT
    cK = _VT((0, nkT.y + KRY, nkT.z + KR0))                                # Mitte des runden Halsausschnitts (Kugel um den Halsansatz)
    for v in bm.data.vertices:
        c_ = BCO[v.index]; d_ = min((c_ - cK).length - KRR, cK.z + .045 - c_.z)
        tot_ = sum(g.weight for g in v.groups if g.group in mxT) or 1      # Gewichte sind nicht normiert
        if sum(g.weight for g in v.groups if g.group == hdT) / tot_ > .5: d_ = -.05      # Kopf (auch das Kinn) bleibt Haut
        for s_, (a_, dr_, L_, gi_) in armsT.items():
            if sum(g.weight for g in v.groups if g.group in gi_) / tot_ > .5: d_ = min(d_, AERMEL * L_ - (c_ - a_).dot(dr_))
        valsT.append(max(-.05, min(.05, d_)))
        # Becken ab knapp über dem Hosenbund: Hosenfarbe statt Trikot. Der sichtbare Übergang Trikot–Hose ist damit diese glatte
        # Linie auf dem Körper (mit Saumlinie), der Rand des Hosennetzes liegt darunter und kann nicht ausfransen.
        arm_ = any(sum(g.weight for g in v.groups if g.group in gi_) / tot_ > .5 for (a_, dr_, L_, gi_) in armsT.values())
        hoseT.append(-.05 if arm_ else max(-.05, min(.05, bund + .005 - c_.z)))
    atT = bm.data.attributes.new('hemd', 'FLOAT', 'POINT'); atT.data.foreach_set('value', valsT)
    atH = bm.data.attributes.new('hose', 'FLOAT', 'POINT'); atH.data.foreach_set('value', hoseT)
    # T2R-Logo auf der Brust: Schriftzug aus dem Teamlogo ausschneiden und von vorn auf die Brust projizieren (Ruhelage)
    import numpy as _np
    _lp = os.path.expanduser('~/Documents/Relentless-3D/work/t2r_brust.png')
    if not os.path.exists(_lp):
        _src = bpy.data.images.load(os.path.expanduser('~/Documents/Relentless/assets/t2r-logo-1254.png')); _w, _h = _src.size
        _px = _np.empty(_w * _h * 4, dtype=_np.float32); _src.pixels.foreach_get(_px); _px = _px.reshape(_h, _w, 4)
        _c = _px[_h - 758:_h - 512, 178:1098]          # nur „T2R“, ohne die Internetadresse darunter (Zeilen zählen von unten)
        _im = bpy.data.images.new('t2r_brust', _c.shape[1], _c.shape[0]); _im.pixels.foreach_set(_c.ravel())
        _im.filepath_raw = _lp; _im.file_format = 'PNG'; _im.save(); bpy.data.images.remove(_im); bpy.data.images.remove(_src)
    LOGOIMG = bpy.data.images.load(_lp); LOGOIMG.colorspace_settings.name = 'Non-Color'
    _lw = LOGOW; _lh = _lw * LOGOIMG.size[1] / LOGOIMG.size[0]; _lz = nkT.z - LOGOZ
    uvT = bm.data.uv_layers.new(name='logo'); nL = 0
    for p_ in bm.data.polygons:
        cs_ = [BCO[i] for i in p_.vertices]; n_ = (cs_[1] - cs_[0]).cross(cs_[-1] - cs_[0])
        n_ = n_.normalized() if n_.length > 1e-9 else n_
        vorn_ = n_.y < -.3 and all(valsT[i] > 0 and abs(c.x) < _lw and abs(c.z - _lz) < _lh * 2 and c.y < nkT.y for i, c in zip(p_.vertices, cs_))
        for li_, c in zip(p_.loop_indices, cs_):
            uvT.data[li_].uv = ((c.x + _lw / 2) / _lw, (c.z - (_lz - _lh / 2)) / _lh) if vorn_ else (-1.0, -1.0)
        nL += vorn_
    print('LOGO Flächen', nL, 'Breite', _lw, 'Höhe', round(_lh, 3), 'Mitte z', round(_lz, 3))
    print('TRIKOT Bund', round(bund, 3), 'Punkte im Trikot', sum(1 for x in valsT if x > 0))

    def toon2(name, base, shade, base2, shade2, line, base3, shade3):
        """Zwei Schattierungsstufen wie toon(); Farbe Haut (hemd < 0) oder Trikot (hemd > 0), am Übergang eine Saumlinie"""
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear(); N = nt.nodes.new; L = nt.links.new
        o = N('ShaderNodeOutputMaterial'); d = N('ShaderNodeBsdfDiffuse'); s = N('ShaderNodeShaderToRGB'); e = N('ShaderNodeEmission')
        def ramp(b_, s_):
            r = N('ShaderNodeValToRGB'); r.color_ramp.interpolation = 'CONSTANT'; r.color_ramp.elements[0].color = (*s_, 1)
            r.color_ramp.elements[1].position = .42; r.color_ramp.elements[1].color = (*b_, 1); L(s.outputs[0], r.inputs[0]); return r
        r1, r2 = ramp(base, shade), ramp(base2, shade2)
        at = N('ShaderNodeAttribute'); at.attribute_type = 'GEOMETRY'; at.attribute_name = 'hemd'
        gt = N('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = 0; L(at.outputs['Fac'], gt.inputs[0])
        ab = N('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; L(at.outputs['Fac'], ab.inputs[0])
        lt = N('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = SAUMW; L(ab.outputs[0], lt.inputs[0])
        m1 = N('ShaderNodeMix'); m1.data_type = 'RGBA'; L(gt.outputs[0], m1.inputs[0]); L(r1.outputs[0], m1.inputs[6]); L(r2.outputs[0], m1.inputs[7])
        # Brustlogo: weißer Schriftzug, nur auf dem Trikot (hemd > 0); außerhalb des Logofelds liefert das Bild nichts
        uv = N('ShaderNodeUVMap'); uv.uv_map = 'logo'; tx = N('ShaderNodeTexImage'); tx.image = LOGOIMG; tx.extension = 'CLIP'; L(uv.outputs[0], tx.inputs[0])
        r4 = ramp(srgb('#f4f7f8'), srgb('#c6d3d8')); ml = N('ShaderNodeMath'); ml.operation = 'MULTIPLY'; L(tx.outputs['Color'], ml.inputs[0]); L(gt.outputs[0], ml.inputs[1])
        m1b = N('ShaderNodeMix'); m1b.data_type = 'RGBA'; L(ml.outputs[0], m1b.inputs[0]); L(m1.outputs[2], m1b.inputs[6]); L(r4.outputs[0], m1b.inputs[7])
        m2 = N('ShaderNodeMix'); m2.data_type = 'RGBA'; L(lt.outputs[0], m2.inputs[0]); L(m1b.outputs[2], m2.inputs[6]); m2.inputs[7].default_value = (*line, 1)
        r3 = ramp(base3, shade3); ah = N('ShaderNodeAttribute'); ah.attribute_type = 'GEOMETRY'; ah.attribute_name = 'hose'
        gh = N('ShaderNodeMath'); gh.operation = 'GREATER_THAN'; gh.inputs[1].default_value = 0; L(ah.outputs['Fac'], gh.inputs[0])
        m3 = N('ShaderNodeMix'); m3.data_type = 'RGBA'; L(gh.outputs[0], m3.inputs[0]); L(m2.outputs[2], m3.inputs[6]); L(r3.outputs[0], m3.inputs[7])
        ab2 = N('ShaderNodeMath'); ab2.operation = 'ABSOLUTE'; L(ah.outputs['Fac'], ab2.inputs[0])
        lt2 = N('ShaderNodeMath'); lt2.operation = 'LESS_THAN'; lt2.inputs[1].default_value = SAUMW; L(ab2.outputs[0], lt2.inputs[0])
        m4 = N('ShaderNodeMix'); m4.data_type = 'RGBA'; L(lt2.outputs[0], m4.inputs[0]); L(m3.outputs[2], m4.inputs[6]); m4.inputs[7].default_value = (*line, 1)
        L(d.outputs[0], s.inputs[0]); L(m4.outputs[2], e.inputs[0]); L(e.outputs[0], o.inputs[0]); return m
    M['skinT'] = toon2('skinT', srgb('#e8b28c'), srgb('#c98d6a'), srgb('#0a8a96'), srgb('#00626c'), srgb('#0b1c49'), srgb('#1a2b5e'), srgb('#0b1c49'))
    M['skinFT'] = toon2('skinFT', srgb('#c99270'), srgb('#a87554'), srgb('#0a8a96'), srgb('#00626c'), srgb('#0b1c49'), srgb('#111f4a'), srgb('#08143a'))
    bm.data.materials[0] = M['skinT']; bm.data.materials[1] = M['skinFT']
