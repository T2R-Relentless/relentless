#!/bin/zsh
# Schnelle Probe einer Figur-Änderung an wenigen Haltungen: probe.sh <name> "<haltung bild> …" [weitere Angaben an uebungen.py]
# Ergebnis: review/probe/<name>.jpg (je Haltung eine Zeile aus Hauptkamera, 90° und 180°). Höchstens drei Läufe gleichzeitig.
setopt nullglob; N=$1; H=(${=2}); shift 2
B=~/Documents/Relentless-3D/Blender.app/Contents/MacOS/Blender; W=~/Documents/Relentless-3D/work; R=~/Documents/Relentless-3D/review/probe/$N
rm -rf $R; mkdir -p $R; cd $W; i=0
for ((k = 1; k <= ${#H}; k += 2)); do
  ( $B -b --python uebungen.py -- ${H[k]} $R/${H[k]} still=${H[k+1]} ansichten=90,180 schnell=1 "$@" 2>&1 | grep -E "MESS Bild|Traceback|Error:" | grep -v "strokes set empty" | sed "s/^/${H[k]}: /" > $R/${H[k]}.txt ) &
  i=$((i + 1)); [ $((i % 3)) -eq 0 ] && wait
done; wait
b=(); for ((k = 1; k <= ${#H}; k += 2)); do b+=($(ls $R/${H[k]}_[0-9][0-9][0-9].png) $(ls $R/${H[k]}_[0-9][0-9][0-9]_a*.png)); done
$B -b --python $W/blatt.py -- $R.jpg 3 2 $b 2>&1 | grep BLATT; cat $R/*.txt; rm -f $R/*.blend $R/*.blend1
