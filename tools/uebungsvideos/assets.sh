#!/bin/zsh
# Freigegebenes Video und Startbild in die App kopieren: assets.sh <uebung>
EX=$1; B=~/Documents/Relentless-3D/Blender.app/Contents/MacOS/Blender; F=~/Documents/Relentless-3D/frei; A=~/Documents/Relentless/public/img/uebungen
mkdir -p $A && cp $F/$EX.mp4 $A/$EX.mp4
cd $F && $B -b $EX.blend --python-expr "import bpy; s=bpy.context.scene; s.render.resolution_x, s.render.resolution_y = 720, 450; s.render.image_settings.media_type='IMAGE'; s.render.image_settings.file_format='PNG'" -o $F/${EX}_poster_### -f 1 2>&1 | grep -c Saved
sips -s format jpeg -s formatOptions 70 $F/${EX}_poster_001.png --out $A/$EX.jpg >/dev/null && ls -la $A/$EX.*
