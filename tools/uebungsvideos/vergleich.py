# Bilder vergleichen (Rückfalltest: hat sich die Figur ungewollt verändert?): blender -b --python vergleich.py -- <bild a> <bild b> [<a> <b> …]
import bpy, sys
import numpy as np
a = sys.argv[sys.argv.index('--') + 1:]
def lade(f):
    im = bpy.data.images.load(f); w, h = im.size; px = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(px); return px.reshape(h, w, 4)[:, :, :3]
for f1, f2 in zip(a[::2], a[1::2]):
    x, y = lade(f1), lade(f2)
    if x.shape != y.shape: print('VERGLEICH', f1.split('/')[-1], 'unterschiedliche Größe', x.shape, y.shape); continue
    d = np.abs(x - y).max(axis=2); print('VERGLEICH', f1.split('/')[-1], f'abweichende Pixel {100 * (d > .02).mean():.3f} %', f'größte Abweichung {d.max():.3f}')
