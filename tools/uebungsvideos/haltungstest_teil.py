# Haltungstest der Figur: feste Testhaltungen, an denen Verformungsfehler der Grundfigur auffallen (Schulter über Kopf, tiefe
# Hüft- und Kniebeuge, gestreckter Fuß, Sitz). Wird von uebungen.py eingebunden; Aufruf wie eine Übung, z. B.
#   Blender -b --python uebungen.py -- t_hocke <ausgabe> still=1 ansichten=90,180,270
def _arme(ober, unter, hand=None):
    for side, sx in (('Left', 1), ('Right', -1)):
        aim(side + 'Arm', Vector((sx * ober[0], ober[1], ober[2]))); aim(side + 'ForeArm', Vector((sx * unter[0], unter[1], unter[2])))
        h = hand or unter; aim(side + 'Hand', Vector((sx * h[0], h[1], h[2])))
def _beine(ober, unter, fuss):
    for side, sx in (('Left', 1), ('Right', -1)):
        aim(side + 'UpLeg', Vector((sx * ober[0], ober[1], ober[2]))); aim(side + 'Leg', Vector((sx * unter[0], unter[1], unter[2])))
        aim(side + 'Foot', Vector((sx * fuss[0], fuss[1], fuss[2])))
def t_stand(ph):
    reset(); rig.rotation_euler = (0, 0, 0); bpy.context.view_layer.update()
    _beine((.06, 0, -1), (.02, .02, -1), (.12, -1, -.45)); _arme((.14, 0, -1), (.1, -.1, -1))
def t_ueberkopf(ph):
    t_stand(0)
    for side, sx in (('Left', 1), ('Right', -1)): aim(side + 'Shoulder', Vector((sx, 0, .35)))
    _arme((.16, 0, 1), (.1, -.03, 1))
def t_hocke(ph):
    reset(); rig.rotation_euler = (0, 0, 0); bpy.context.view_layer.update()
    aim('Spine', V(0, -.3, 1)); aim('Spine1', V(0, -.32, 1)); aim('Spine2', V(0, -.3, 1)); aim('Neck', V(0, -.1, 1)); aim('Head', V(0, -.25, 1))
    _beine((.38, -.85, .22), (-.06, .42, -1), (.2, -1, -.45)); _arme((.12, -1, -.25), (.02, -1, .1))
def t_langsitz(ph):
    reset(); rig.rotation_euler = (0, 0, 0); bpy.context.view_layer.update()
    aim('Spine', V(0, .04, 1)); _beine((.08, -1, 0), (.08, -1, -.02), (.05, -.41, .91)); _arme((.2, .25, -1), (.08, -.1, -1))
def t_fersensitz(ph):
    reset(); rig.rotation_euler = (0, 0, 0); bpy.context.view_layer.update()
    _beine((.07, -1, -.5), (.0, 1, -.06), (0, 1, -.12)); _arme((.12, -.25, -1), (-.05, -1, -.35))
def t_rueckenlage(ph):
    reset(); rig.rotation_euler = (math.radians(-90), 0, 0); bpy.context.view_layer.update()
    aim('RightUpLeg', V(-.07, -1, 0)); aim('RightLeg', V(-.07, -1, 0)); aim('RightFoot', V(-.1, -.41, .91))
    aim('LeftUpLeg', V(.1, .5, 1)); aim('LeftLeg', V(.05, -1, -.12)); aim('LeftFoot', V(.08, -.5, .85)); _arme((.28, -1, 0), (.24, -1, 0))
for _n, _f, _c in (('t_stand', t_stand, V(.6, -1, .3)), ('t_ueberkopf', t_ueberkopf, V(.6, -1, .3)), ('t_hocke', t_hocke, V(.75, -1, .32)), ('t_langsitz', t_langsitz, V(.8, -1, .38)),
                   ('t_fersensitz', t_fersensitz, V(.85, -1, .32)), ('t_rueckenlage', t_rueckenlage, V(1, -.5, .45))):
    EXS[_n] = dict(pose=_f, keys=((1, 0), (2, 0)), cam=_c, zone=None, blatt=(1,))
