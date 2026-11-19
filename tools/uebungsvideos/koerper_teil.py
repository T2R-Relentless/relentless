# Verformung der Haut an den großen Gelenken (für alle Übungen gemeinsam, eingebunden aus basis_teil.py nach trikot_teil.py).
# 1. Gesäß bleibt am Becken: In der Grundfigur hängen Gesäß und seitliche Hüfte am Oberschenkelknochen. Beugt die Hüfte,
#    wandern sie mit dem Bein nach vorn und das Becken fällt zusammen. Oberhalb der Gesäßfalte und hinter dem Hüftgelenk wird
#    das Gewicht deshalb weich vom Oberschenkel auf das Becken umgehängt.
# 2. Glättung an Hüfte, Schulter und Knie („Corrective Smooth“): zieht die verformte Fläche rund um diese Gelenke zurück zur
#    ursprünglichen Form. Gegen Kerben am Übergang Oberschenkel–Gesäß, an Hals und Schulter bei erhobenem Arm und am Knie.
# 3. Wahlweise Volumenerhalt der Verformung (vol=1).
_aK = lambda k, d: float(next((a.split('=')[1] for a in args if a.startswith(k + '=')), d))
_smK = lambda u: (lambda x: x * x * (3 - 2 * x))(max(0.0, min(1.0, u)))
GES, GFALTE, GZ, GY0, GY = _aK('ges', 1), _aK('gfalte', .09), _aK('gz', .14), _aK('gy0', .08), _aK('gy', .12)
GCS, GCI, GCR = _aK('gcs', .85), _aK('gci', 50), _aK('gcr', .2)          # Stärke, Durchläufe, Radius an der Hüfte
GSR, GKR, GER, GNR = _aK('gsr', .24), _aK('gkr', .12), _aK('ger', 0), _aK('gnr', .1)   # … Nacken (0 = aus)               # Radius an Schulter, Knie, Ellbogen (0 = aus)
VOL = _aK('vol', 0)
for ob_ in (bm, shirt):
    if not ob_: continue
    co_ = BCO if ob_ is bm else [v.co for v in ob_.data.vertices]; gh_ = ob_.vertex_groups.get('mixamorig:Hips'); n_ = 0
    if GES > 0 and gh_:
        for sd_ in ('Left', 'Right'):
            gu_ = ob_.vertex_groups.get(f'mixamorig:{sd_}UpLeg'); hj_ = rig.data.bones[f'mixamorig:{sd_}UpLeg'].head_local
            if not gu_: continue
            for v in ob_.data.vertices:
                w_ = next((g.weight for g in v.groups if g.group == gu_.index), 0)
                if w_ <= 0: continue
                c_ = co_[v.index]; f_ = _smK((c_.z - (hj_.z - GFALTE - GZ / 2)) / GZ) * _smK((c_.y - (hj_.y - GY0)) / GY) * GES
                if f_ <= 0: continue
                gu_.add([v.index], w_ * (1 - f_), 'REPLACE'); gh_.add([v.index], w_ * f_, 'ADD'); n_ += 1
    print('GESAESS', ob_.name, n_)
    if VOL:
        for m_ in ob_.modifiers:
            if m_.type == 'ARMATURE': m_.use_deform_preserve_volume = True
    if GCS > 0:
        _bl = lambda n: rig.data.bones['mixamorig:' + n].head_local
        zent_ = [(_bl(s + 'UpLeg'), GCR) for s in ('Left', 'Right')] + [(_bl(s + 'Arm'), GSR) for s in ('Left', 'Right') if GSR > 0] \
              + [(_bl(s + 'Leg'), GKR) for s in ('Left', 'Right') if GKR > 0] + [(_bl(s + 'ForeArm'), GER) for s in ('Left', 'Right') if GER > 0] + ([(_bl('Neck'), GNR)] if GNR > 0 else [])
        vg_ = ob_.vertex_groups.new(name='ges_glatt'); n2_ = 0
        for v in ob_.data.vertices:
            c_ = co_[v.index]; w_ = max(1 - _smK(((c_ - h_).length - r_) / .08) for h_, r_ in zent_)
            if w_ > 0: vg_.add([v.index], w_, 'REPLACE'); n2_ += 1
        cs_ = ob_.modifiers.new('ges_glatt', 'CORRECTIVE_SMOOTH'); cs_.factor = GCS; cs_.iterations = int(GCI); cs_.smooth_type = 'LENGTH_WEIGHTED'
        cs_.vertex_group = 'ges_glatt'; cs_.use_only_smooth = False; cs_.use_pin_boundary = True; cs_.rest_source = 'BIND'
        bpy.context.view_layer.objects.active = ob_
        while ob_.modifiers.find('ges_glatt') > 0 and ob_.modifiers[ob_.modifiers.find('ges_glatt') - 1].type != 'ARMATURE':
            bpy.ops.object.modifier_move_up(modifier='ges_glatt')
        bpy.context.view_layer.update(); bpy.ops.object.correctivesmooth_bind(modifier='ges_glatt')
        print('GLATT', ob_.name, cs_.is_bind, n2_, [m.type for m in ob_.modifiers])
