#!/bin/zsh
# Standbild-Blatt einer Übung (Start, Mitte, Ende) – der schnelle erste Schritt, vor jedem Video:
#   blatt.sh <uebung>                 Blatt für den Nutzer:   review/<uebung>/<uebung>_blatt.jpg
#   blatt.sh <uebung> pruef           Prüfpaket für die Prüfer: zusätzlich weitere Blickrichtungen, Nahaufnahmen, Bildstreifen, Messprotokoll
# Weitere Angaben werden an uebungen.py durchgereicht (z. B. cam=.5,-1,.4 oder schnell=1 zum Ausprobieren).
setopt nullglob; EX=$1; shift; MODUS=blatt; [ "$1" = pruef ] && { MODUS=pruef; shift }
B=~/Documents/Relentless-3D/Blender.app/Contents/MacOS/Blender; W=~/Documents/Relentless-3D/work; R=~/Documents/Relentless-3D/review/$EX; P=$R/$EX
mkdir -p $R && rm -f $R/${EX}_*.png $R/${EX}_*.jpg $R/${EX}_mess.txt
ZUS=(); [ $MODUS = pruef ] && ZUS=(ansichten=90,180,270 nah=1 streifen=8)
cd $W && $B -b --python uebungen.py -- $EX $P still=blatt $ZUS "$@" 2>&1 | grep -E "TIEFSTER|PRUEF|MESS|Traceback|Error|FERTIG"
cd $R || exit 1
haupt=($(ls ${EX}_[0-9][0-9][0-9].png 2>/dev/null)); [ ${#haupt} -eq 0 ] && { echo "keine Bilder"; exit 1 }
$B -b --python $W/blatt.py -- $P"_blatt.jpg" ${#haupt} $([ $MODUS = pruef ] && echo 1 || echo 2) $haupt 2>&1 | grep BLATT
if [ $MODUS = pruef ]; then
  an=($(ls ${EX}_[0-9][0-9][0-9]_a*.png 2>/dev/null)); [ ${#an} -gt 0 ] && $B -b --python $W/blatt.py -- $P"_ansichten.jpg" 3 2 $an 2>&1 | grep BLATT
  nah=($(ls ${EX}_[0-9][0-9][0-9]_n_*.png 2>/dev/null)); [ ${#nah} -gt 0 ] && $B -b --python $W/blatt.py -- $P"_nah.jpg" 5 2 $nah 2>&1 | grep BLATT
  st=($(ls ${EX}_s[0-9]*.png 2>/dev/null)); [ ${#st} -gt 0 ] && $B -b --python $W/blatt.py -- $P"_streifen.jpg" 6 1 $st 2>&1 | grep BLATT
fi
rm -f $P.blend1; ls $R | grep -E "jpg|txt"
