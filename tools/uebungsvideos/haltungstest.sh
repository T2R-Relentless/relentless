#!/bin/zsh
# Haltungstest der Figur: jede Testhaltung aus vier Richtungen auf einem Blatt (review/figur/figur_haltungstest.jpg).
# Nötig nach jeder Änderung an der Figur (basis_teil.py, trikot_teil.py, schuh_teil.py), bevor Übungen gerendert werden.
setopt nullglob; B=~/Documents/Relentless-3D/Blender.app/Contents/MacOS/Blender; W=~/Documents/Relentless-3D/work; R=~/Documents/Relentless-3D/review/figur
mkdir -p $R && rm -f $R/*.png $R/*.jpg $R/*.txt; cd $W
lauf() { $B -b --python uebungen.py -- $1 $R/$1 still=$2 ansichten=90,180,270 schnell=1 2>&1 | grep -E "MESS Bild|Traceback|Error" | sed "s/^/$1: /" >> $R/figur_hinweise.txt }
# je drei Läufe gleichzeitig: mehr bremst sich gegenseitig aus
(lauf t_stand 1; lauf t_langsitz 1; lauf thread 1) & (lauf t_ueberkopf 1; lauf t_fersensitz 1; lauf clam 1) & (lauf t_hocke 1; lauf t_rueckenlage 1; lauf hip9090 28) & wait
cd $R; rm -f *.blend *.blend1 *_mess.txt(N) 2>/dev/null
b=(); for h in t_stand t_ueberkopf t_hocke t_langsitz t_fersensitz t_rueckenlage thread clam hip9090; do f=($(ls ${h}_[0-9][0-9][0-9].png)); b+=($f $(ls ${h}_[0-9][0-9][0-9]_a*.png)); done
$B -b --python $W/blatt.py -- $R/figur_haltungstest_1.jpg 4 2 ${b[1,20]} 2>&1 | grep BLATT; $B -b --python $W/blatt.py -- $R/figur_haltungstest_2.jpg 4 2 ${b[21,36]} 2>&1 | grep BLATT
cat $R/figur_hinweise.txt
