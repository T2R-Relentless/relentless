#!/bin/zsh
# Video rendern und Prüfbilder (große Standbilder) für die Fachprüfung erzeugen: render_review.sh <uebung> <frames...>
EX=$1; shift
B=~/Documents/Relentless-3D/Blender.app/Contents/MacOS/Blender; O=~/Documents/Relentless-3D/out; R=~/Documents/Relentless-3D/review/$EX
SCRIPT=uebungen.py   # Dead Bug läuft seit 19.11.2026 auch über uebungen.py
cd ~/Documents/Relentless-3D/work && $B -b --python $SCRIPT -- $EX $O/$EX 2>&1 | grep -E "TIEFSTER|_HAND|PRUEF|Traceback|Error|FERTIG" | tail -6
mkdir -p $R && rm -f $R/*
fl=(); for f in "$@"; do fl+=(-f $f); done
cd $O && $B -b $EX.blend --python-expr "import bpy; s=bpy.context.scene; s.render.resolution_x, s.render.resolution_y = 960, 600; s.render.image_settings.media_type='IMAGE'; s.render.image_settings.file_format='PNG'" -o $R/${EX}_### "${fl[@]}" 2>&1 | grep -c Saved
cp $O/$EX.mp4 $R/ ; ls $R
