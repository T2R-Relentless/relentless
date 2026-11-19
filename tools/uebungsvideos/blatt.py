# Bilder zu einem Blatt zusammensetzen: blender -b --python blatt.py -- <ausgabe.jpg> <spalten> <verkleinerung 1|2> <bild>…
import bpy, sys
import numpy as np
a = sys.argv[sys.argv.index('--') + 1:]; out, cols, DS, files = a[0], int(a[1]), int(a[2]), a[3:]; ims = []
for f in files:
    im = bpy.data.images.load(f); w, h = im.size; px = np.empty(w * h * 4, dtype=np.float32); im.pixels.foreach_get(px); px = px.reshape(h, w, 4)
    if DS > 1: px = px[:h - h % DS, :w - w % DS].reshape(h // DS, DS, w // DS, DS, 4).mean(axis=(1, 3))     # sauber verkleinern (Mittelwert)
    ims.append(px)
h = max(i.shape[0] for i in ims); w = max(i.shape[1] for i in ims); rows = -(-len(ims) // cols); g = 6
cv = np.ones((rows * h + (rows - 1) * g, cols * w + (cols - 1) * g, 4), dtype=np.float32)
for i, im in enumerate(ims):
    r, c = divmod(i, cols); y0 = (rows - 1 - r) * (h + g) + (h - im.shape[0]); x0 = c * (w + g); cv[y0:y0 + im.shape[0], x0:x0 + im.shape[1]] = im
o = bpy.data.images.new('m', cv.shape[1], cv.shape[0]); o.pixels.foreach_set(cv.ravel())
sc = bpy.context.scene; sc.view_settings.view_transform = 'Standard'; sc.render.image_settings.file_format = 'JPEG'; sc.render.image_settings.quality = 88
o.save_render(out, scene=sc); print('BLATT', out, cv.shape[1], 'x', cv.shape[0])
