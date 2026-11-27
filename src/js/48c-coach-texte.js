/* ---------- F39 (18b): Persönlicher Coach, Teil 3: feste Textbausteine (coach-bausteine §5, §6) ----------
   coReport(pack, rule) baut den Bericht {insight, einheit, spruch, teaser} in der Form, die später die KI liefert (18c).
   Alle Sätze stehen hier auf Deutsch und Englisch (EN-Entwurf aus der Vorgabe). Form und Fitness erscheinen nie als Zahl,
   nur als Alltagssatz (§6.1); erlaubt sind Tage, Minuten, Stunden, Wiederholungen, Temperatur, Regenrisiko, Böen, Uhrzeiten,
   Anzahl Einheiten, Planwoche. Ein Satz mit fehlendem Platzhalter entfällt. Ruhiger Modus (R0–R2): kein Spruch, keine
   Leistungszahlen, für alle Töne gleich. Entscheidung C: „müde/sehr müde“ erst ab Tag 84, Fitness-Trend ab Tag 126. */
const CO_TON = ['kumpel', 'antreiber', 'sachlich'];
const CO_TK = {kumpel:'k', antreiber:'a', sachlich:'s'};
/* [de, en] */
const CO_TXT = {
  /* §6.3a Form-Stufen F-S: Stufe → Ton → Varianten */
  fs:{
    5:{k:[['Du bist richtig ausgeruht. Die Beine fragen schon, wann es wieder losgeht.', "You're properly rested. Your legs are already asking when it starts again."], ['Mehr ausgeruht geht kaum. Fast schon zu viel Sofa.', 'Hardly more rested than this. Bordering on too much sofa.']],
      a:[['Ausgeruht wie nach dem Urlaub. Zeit, das auf die Straße zu bringen.', 'Rested like after a holiday. Time to put it on the road.'], ['Volle Akkus. Die Frage ist nur, wofür du sie nutzt.', 'Batteries full. The only question is what you use them for.']],
      s:[['Du bist sehr ausgeruht.', "You're very well rested."], ['Im Moment ist kaum Ermüdung da, du bist vollständig erholt.', "There's hardly any fatigue at the moment, you're fully recovered."]]},
    4:{k:[['Du bist gut erholt, die Beine sind frisch.', "You're well rested, the legs feel fresh."], ['Du hast gerade richtig Saft in den Beinen.', "There's plenty of juice in your legs right now."]],
      a:[['Frische Beine. Die wollen etwas tun.', 'Fresh legs. They want something to do.'], ['Gut erholt und startklar. Besser wird die Ausgangslage nicht.', "Well rested and ready to go. It doesn't get a better starting point."]],
      s:[['Du bist gut erholt, gute Voraussetzungen für intensive Tage.', "You're well recovered, good conditions for intense days."], ['Die Ermüdung ist niedrig, du bist frisch.', "Fatigue is low, you're fresh."]]},
    3:{k:[['Du bist gut in Form, merkst die Woche aber ein bisschen in den Beinen.', "You're in good shape, though you can feel the week in your legs a little."], ['Belastung und Erholung passen gerade gut zusammen.', 'Training and recovery fit together nicely right now.'], ['Die Woche war anstrengend, aber du hast noch Reserven.', "The week has been tough, but you still have something left."]],
      a:[['Du bist gut in Form und merkst trotzdem, dass du trainiert hast. Genau so soll es sein.', "You're in good shape and can still feel the training. That's exactly how it should be."], ['Belastet, aber nicht platt. So sieht guter Aufbau aus.', "Loaded, but not flat. That's what a good build looks like."], ['Die Woche zieht, du ziehst mit.', 'The week pulls, you pull with it.']],
      s:[['Belastung und Erholung sind im Gleichgewicht.', 'Load and recovery are in balance.'], ['Du bist normal belastet, im üblichen Trainingsbereich.', 'Your load is normal, within the usual training range.'], ['Etwas Ermüdung ist da, aber nicht mehr als im Training üblich.', "There's some fatigue, but no more than usual in training."]]},
    2:{k:[['Die letzten Tage stecken dir spürbar in den Beinen, das gehört im Aufbau dazu.', "The last few days are clearly in your legs. That's part of a build."], ['Du bist mitten im Block, die Beine sind entsprechend schwer.', "You're mid-block, and the legs feel like it."], ['Gerade sammelt sich einiges an Belastung. Passt, solange die Ruhetage kommen.', 'Load is piling up a bit. Fine, as long as the rest days come.']],
      a:[['Die Beine sind schwer, das ist der Preis für den Block.', 'Heavy legs are the price of the block.'], ['Ordentlich was in den Beinen. Das Training wirkt, die Erholung macht den Rest.', 'Plenty in the legs. Training works, recovery does the rest.'], ['Mitten im Block, und das spürst du. Die Erholung ist schon eingeplant.', 'Mid-block, and you feel it. Recovery is already planned in.']],
      s:[['Die Belastung der letzten Tage ist noch nicht ganz verarbeitet. Im Aufbau ist das gewollt.', "Recent load isn't fully absorbed yet. In a build that's intended."], ['Du bist im Trainingsblock spürbar ermüdet, die geplanten Erholungstage gleichen das aus.', "You're noticeably tired in this block; the planned rest days balance it out."], ['Die Ermüdung ist erhöht, wie in einem Aufbaublock zu erwarten.', 'Fatigue is elevated, as expected in a build block.']]},
    1:{k:[['Du hast gerade ordentlich Belastung gesammelt. Die nächsten Tage sollte die Erholung Vorrang haben.', "You've built up a lot of load lately. Recovery should come first for the next few days."], ['Die Beine haben gerade viel zu tragen. Gönn ihnen bald Ruhe.', 'Your legs are carrying a lot right now. Give them some rest soon.']],
      s:[['Die Ermüdung ist hoch. Plane in den nächsten Tagen bewusst Erholung ein.', 'Fatigue is high. Plan deliberate recovery over the next few days.'], ['Du hast mehr Belastung gesammelt, als du gerade verarbeitest. Erholung hat jetzt Vorrang.', "You've built up more load than you're currently absorbing. Recovery comes first now."]]}},
  fs5s:['Bleibt das länger so, baut die Grundfitness langsam ab.', 'If it stays like this for long, base fitness slowly drops.'],
  fs2:['Nach den paar Wochen ist das aber noch eine erste Einschätzung.', 'After only a few weeks, take that as a first impression.'],
  fs5:['Die letzten Tage waren fordernd. Wie viel davon noch in den Beinen steckt, kann ich nach den ersten Wochen besser sagen.', "The last few days were demanding. How much is still in your legs I'll be able to tell after the first few weeks."],
  fog:['Wie frisch du gerade bist, kann ich nach den ersten Wochen besser sagen. Hör bis dahin auf dein Gefühl.', "I'll be able to tell how fresh you are after the first few weeks. Until then, go by feel."],
  /* Morgen-Satz (Ruhetag) */
  mo:{up:{k:['Bis morgen bist du schon deutlich frischer.', "By tomorrow you'll be noticeably fresher."], a:['Morgen bist du schon deutlich frischer.', "Tomorrow you're already a lot fresher."], s:['Bis morgen bist du wieder {mstufe}.', "By tomorrow you'll be back {mstufe}."]},
    eq:{k:['Bis morgen erholst du dich ein gutes Stück.', "By tomorrow you'll have recovered a fair bit."], a:['Heute sammeln, morgen nutzen.', 'Bank it today, use it tomorrow.'], s:['Bis morgen geht die Ermüdung weiter zurück.', 'Fatigue keeps dropping by tomorrow.']}},
  mst:{3:['im normalen Trainingsbereich', 'in your usual training range'], 4:['gut erholt', 'well recovered'], 5:['sehr ausgeruht', 'very well rested']},
  evf:{hi:['Wenn du dem Plan folgst, gehst du frisch an den Start.', "If you follow the plan, you'll start fresh."], mid:['Nach Plan gehst du ausgeruht an den Start, die letzten lockeren Tage machen den Rest.', "Following the plan, you'll start rested; the last easy days do the rest."]},
  /* Fitness-Trend F-T */
  ft:{
    pp:{k:[['{name}, deine Grundfitness ist in den letzten vier Wochen spürbar gewachsen.', '{name}, your base fitness has grown noticeably over the last four weeks.'], ['{name}, die letzten vier Wochen haben richtig was gebracht, deine Grundfitness ist ordentlich gewachsen.', '{name}, the last four weeks really paid off, your base fitness has grown a good bit.'], ['{name}, man merkt die letzten Wochen: Du bist deutlich fitter als vor einem Monat.', "{name}, the last few weeks show: you're clearly fitter than a month ago."]],
      a:[['{name}, vier Wochen dran, und das sieht man: Deine Grundfitness ist klar nach oben gegangen.', '{name}, four weeks of work and it shows: your base fitness has clearly gone up.'], ['Vier Wochen Arbeit, und deine Grundfitness hat ordentlich zugelegt, {name}. Das ist kein Zufall, das bist du.', "Four weeks of work and your base fitness has gone up a good bit, {name}. That's not luck, that's you."]],
      s:[['Deine Grundfitness ist in den letzten vier Wochen deutlich gestiegen, der Aufbau wirkt.', 'Your base fitness has risen clearly over the last four weeks; the build is working.'], ['Im Vergleich zu vor vier Wochen bist du deutlich besser trainiert.', "Compared with four weeks ago, you're clearly better trained."]]},
    p:{k:[['{name}, deine Grundfitness ist in den letzten vier Wochen ein Stück gewachsen.', '{name}, your base fitness has grown a bit over the last four weeks.'], ['{name}, langsam, aber sicher: Du bist etwas fitter als vor einem Monat.', "{name}, slow but steady: you're a bit fitter than a month ago."]],
      a:[['{name}, die Grundfitness geht nach oben. Noch nicht steil, aber in die richtige Richtung.', '{name}, your base fitness is going up. Not steep yet, but the right way.'], ['Etwas fitter als vor vier Wochen, {name}. Da geht noch mehr, und der Plan weiß, wie.', "A bit fitter than four weeks ago, {name}. There's more to come, and the plan knows how."]],
      s:[['Deine Grundfitness ist in den letzten vier Wochen leicht gestiegen.', 'Your base fitness has risen slightly over the last four weeks.'], ['Gegenüber vor vier Wochen ein leichter, stetiger Aufbau.', 'Compared with four weeks ago: a slight, steady build.']]},
    0:{k:[['{name}, deine Grundfitness hält sich seit vier Wochen gut. Stabil ist auch eine Leistung.', '{name}, your base fitness has held steady for four weeks. Stable counts too.'], ['{name}, fitnessmäßig bist du da, wo du vor einem Monat warst. Das Fundament steht.', "{name}, fitness-wise you're where you were a month ago. The foundation is solid."]],
      a:[['{name}, deine Grundfitness hält seit vier Wochen. Das Fundament steht, jetzt kommt der nächste Schritt.', '{name}, your base fitness has held for four weeks. The base is there, the next step is coming.'], ['Fitness gehalten, {name}. Gut. Jetzt bauen wir darauf auf.', 'Fitness held, {name}. Good. Now we build on it.']],
      s:[['Deine Grundfitness ist seit vier Wochen etwa unverändert.', 'Your base fitness has been roughly unchanged for four weeks.'], ['Dein Trainingsstand hält sich auf dem Niveau von vor vier Wochen.', 'Your training level is holding where it was four weeks ago.']]},
    m:{k:[['{name}, die Grundfitness ist in den letzten Wochen etwas zurückgegangen. Kein Drama, das kommt mit dem Plan wieder.', '{name}, your base fitness has dipped a little lately. No drama, the plan brings it back.'], ['{name}, du bist etwas weniger fit als vor einem Monat. Ein paar regelmäßige Wochen, und das ist wieder drin.', "{name}, you're a bit less fit than a month ago. A few steady weeks and it's back."]],
      a:[['{name}, die Grundfitness ist etwas gesunken. Der Plan bringt sie zurück, Schritt für Schritt.', '{name}, your base fitness has dropped a little. The plan brings it back, step by step.'], ['Etwas weniger fit als vor vier Wochen, {name}. Kein Grund zur Sorge, ein Grund für die nächste Einheit.', 'A bit less fit than four weeks ago, {name}. No reason to worry, a reason for the next session.']],
      s:[['Deine Grundfitness ist gegenüber vor vier Wochen leicht gesunken. Regelmäßiges Training nach Plan baut sie wieder auf.', 'Your base fitness has dropped slightly compared with four weeks ago. Regular training to plan rebuilds it.'], ['Dein Trainingsstand liegt etwas unter dem von vor vier Wochen. Der Plan gleicht das aus.', 'Your training level is a little below four weeks ago. The plan makes up for it.']]},
    mg:[['{name}, deine Grundfitness liegt etwas unter dem Stand von vor vier Wochen. Im Moment ist das gewollt: Du sammelst Frische.', "{name}, your base fitness is a little below four weeks ago. Right now that's intended: you're building freshness."], ['{name}, weniger Training, etwas weniger Grundfitness, dafür frischere Beine. Genau so ist diese Phase gedacht.', "{name}, less training, a little less base fitness, fresher legs. That's exactly how this phase is meant to work."]],
    mp:[['{name}, nach der Pause ist deine Grundfitness etwas zurückgegangen. Das ist normal, der Plan baut sie in Ruhe wieder auf.', "{name}, after the break your base fitness has dipped a little. That's normal; the plan rebuilds it calmly."], ['{name}, die Pause sieht man ein wenig an der Grundfitness. Kein Grund zur Eile, sie kommt mit regelmäßigem Training zurück.', '{name}, the break shows a little in your base fitness. No need to rush, it returns with regular training.']]},
  rtStay:[', und die bleibt auch heute.', ', and it stays today.'],
  /* §6.3 Insight */
  zeit:{k:['Diese Woche {std} Stunden im Sattel, letzte Woche {stdVor}.', '{std} hours in the saddle this week, {stdVor} last week.'], a:['{std} Stunden diese Woche, {stdVor} letzte. Die Zahlen sind ehrlich, du auch.', '{std} hours this week, {stdVor} last week. Honest numbers, honest rider.'], s:['Trainingszeit: {std} Stunden diese Woche, {stdVor} in der Vorwoche.', 'Training time: {std} hours this week, {stdVor} the week before.']},
  rtIn:{k:['Ruhetag, {name}.', 'Rest day, {name}.'], a:['Heute ist Pause, damit sich die harte Arbeit auszahlt.', 'Today is a break, so the hard work pays off.'], s:['Erholung ist heute richtig.', 'Recovery is the right call today.']},
  rt0:['Ruhetag, {name}. Heute erholen sich die Beine, deine Grundfitness bleibt.', 'Rest day, {name}. Your legs recover today, your base fitness stays.'],
  neu:['{name}, für einen Vergleich mit früher brauche ich noch etwa vier Wochen Fahrten. Mit dem Garmin-Import geht es sofort.', '{name}, I need about four weeks of rides before I can compare. With the Garmin import it works right away.'],
  luecke:['Ich sehe zu wenige Einträge, um zu sagen, wie frisch du bist. Lade deine Fahrten hoch oder hake erledigte Einheiten ab.', "I don't see enough entries to tell how fresh you are. Upload your rides or tick off completed sessions."],
  ev:{k:['Noch {evTage} Tage bis zum {ev}.', '{evTage} days to go until your {ev}.'], a:['{evTage} Tage bis zum {ev}, die Uhr läuft.', '{evTage} days to your {ev}. The clock is ticking.'], s:['Woche {wo} von {woGes}, Phase {phase}, noch {evTage} Tage bis zum {ev}.', 'Week {wo} of {woGes}, {phase} phase, {evTage} days until your {ev}.']},
  ziel:['Woche {wo} von {woGes}, Phase {phase}.', 'Week {wo} of {woGes}, {phase} phase.'],
  /* §6.4 Ruhiger Modus: [Insight, Einheit] */
  krank:[['{name}, du hast dich krank gemeldet. Heute zählt nur Erholung.', "{name}, you logged that you're ill. Today is only about recovery."], ['Wieder einsteigen, wenn du 24 Stunden fieberfrei bist, und dann zwei Tage locker. Bei anhaltenden oder starken Beschwerden lass dich ärztlich beraten.', "Return once you've been fever-free for 24 hours, then ride easy for two days. If symptoms are strong or don't go away, get medical advice."]],
  erk:[['{name}, du hast „leicht erkältet“ eingetragen.', "{name}, you logged a mild cold."], ['Der Plan ist schon angepasst: heute nur locker, wenn du dich auf dem Rad gut fühlst. Kommen Fieber oder Beschwerden unterhalb des Halses dazu, stell auf „Krank“ um.', 'The plan is already adjusted: easy only, and only if you feel good on the bike. If fever or symptoms below the neck appear, switch to "Ill".']],
  verl:[['{name}, du hast {wann} Schmerzen oder eine Verletzung eingetragen. Heute geht es nur darum, dass es besser wird.', '{name}, you logged pain or an injury {wann}. Today is only about getting better.'], ['Tut es noch weh, nimm dir den Tag frei. Werden die Schmerzen stärker oder halten sie mehrere Tage an, lass sie ärztlich oder physiotherapeutisch abklären.', 'If it still hurts, take the day off. If the pain gets worse or lasts several days, have it checked by a doctor or physiotherapist.']],
  verlHart:['Im Plan steht heute eine harte Einheit.', "Today's plan has a hard session."],
  pause:[['{name}, seit {lage} Tagen ist keine Fahrt eingetragen. Nach einer Pause ist ein sanfter Einstieg sinnvoll.', '{name}, no ride logged for {lage} days. After a break, an easy return makes sense.'], ['Die App kann diese Woche leichter planen, danach läuft der Plan normal weiter.', 'The app can make this week lighter, then the plan continues as usual.']],
  ueber:[['{name}, mehrere Zeichen deuten auf viel Belastung und wenig Erholung. Zusammen kann das bedeuten, dass die Erholung nicht mehr mitkommt.', "{name}, several signs point to a lot of load and little recovery. Together they can mean recovery isn't keeping up."], ['Eine Erholungswoche hilft meistens. Hält die Müdigkeit trotzdem an, sprich mit einer Ärztin oder einem Arzt.', 'A recovery week usually helps. If the tiredness persists, talk to a doctor.']],
  wann:{0:['heute', 'today'], 1:['gestern', 'yesterday']},
  /* §6.5 Einheit */
  e0:{k:['Heute {titel}: {kernWort}, {dauer} Minuten insgesamt.', 'Today: {titel}, {kernWort}, {dauer} minutes in total.'], a:['{titel}: {kernWort}. {dauer} Minuten, keine Diskussion.', '{titel}: {kernWort}. {dauer} minutes, no debate.'], s:['{titel}: {kernWort}, {dauer} Minuten gesamt.', '{titel}: {kernWort}, {dauer} minutes in total.']},
  e0n:{k:['Heute {titel}, {dauer} Minuten insgesamt.', 'Today: {titel}, {dauer} minutes in total.'], a:['{titel}. {dauer} Minuten, keine Diskussion.', '{titel}. {dauer} minutes, no debate.'], s:['{titel}, {dauer} Minuten gesamt.', '{titel}, {dauer} minutes in total.']},
  kw:[[56, 'ganz locker', 'very easy'], [76, 'locker, du kannst dich dabei unterhalten', 'easy, you can still chat'], [88, 'zügig, aber kontrolliert', 'brisk but controlled'], [95, 'knapp unter deiner Schwelle', 'just below your threshold'], [106, 'an deiner Schwelle', 'right at your threshold'], [121, 'deutlich über deiner Schwelle', 'well above your threshold'], [9999, 'sehr hart und kurz', 'very hard and short']],
  kwTest:['so hart, wie du es gleichmäßig durchhältst', 'as hard as you can hold evenly'],
  ivMin:['{reps} × {work} Minuten {wort}', '{reps} × {work} minutes {wort}'], ivSek:['{reps} × {work} Sekunden {wort}', '{reps} × {work} seconds {wort}'], ivRest:[', je {rest} Minuten Pause', ', {rest} minutes rest between'],
  r3:{k:['Laut Vorhersage {wx} zwischen {wxVon} und {wxBis} Uhr. Draußen ist das heute keine gute Idee: Rolle oder ein anderer Tag.', 'The forecast shows {wx} between {wxVon}:00 and {wxBis}:00. Not a day for outside: indoor trainer or another day.'], a:['{Wx} laut Vorhersage. Da fährt niemand raus, auch du nicht. Rolle oder anderer Tag.', '{Wx} in the forecast. Nobody rides out in that, you included. Trainer or another day.'], s:['Vorhersage {wxVon}–{wxBis} Uhr: {wx}. Draußen besteht Sturz- bzw. Blitzgefahr. Fahr drinnen oder verlege die Einheit.', 'Forecast {wxVon}:00–{wxBis}:00: {wx}. Crash or lightning risk outside. Ride indoors or move the session.']},
  r3ev:['Laut Vorhersage {wx}. Achte auf die Hinweise des Veranstalters.', "Forecast: {wx}. Follow the organiser's instructions."],
  wxG:['Gewitter', 'thunderstorms'], wxB:['Böen bis {boeen} km/h', 'gusts up to {boeen} km/h'],
  r4a:{hr:['Dein Ruhepuls liegt über deinem Normalbereich.', 'Your resting heart rate is above your normal range.'], hrv:['Deine HRV liegt unter deinem Normalbereich.', 'Your HRV is below your normal range.'], sleep:['Du hast schlechter geschlafen als sonst.', "Your sleep wasn't as good as usual."]},
  r4aK:['Das kann ein Zeichen sein, dass die Erholung noch nicht durch ist. Vorschlag: {titel} etwas leichter.', "That can be a sign recovery isn't complete. Suggestion: {titel}, a bit easier."],
  r4aT:{k:['Die Einheit läuft nicht weg.', "The session isn't going anywhere."], a:['Klug trainieren ist auch Training.', 'Training smart is training too.'], s:['Eine leichtere Variante erhält den Reiz.', 'An easier version keeps the stimulus.']},
  r4b:['Mehrere Morgenwerte liegen heute außerhalb deines Normalbereichs. Vorschlag: {neu} statt {titel}. Die harte Einheit musst du nicht nachholen.', "Several morning values are outside your normal range today. Suggestion: {neu} instead of {titel}. You don't need to make up the hard session."],
  r4c:['Heute steht der Fitness-Check an, deine Morgenwerte sind aber auffällig. Ein Check an so einem Tag fällt oft zu niedrig aus und verfälscht deine Trainingsbereiche. Vorschlag: verschieben.', 'Today is fitness check day, but your morning values are off. A check on a day like this often comes out too low and skews your training zones. Suggestion: move it.'],
  r5:['Du hast „{feelWort}“ eingetragen, der Plan ist schon angepasst: heute {titel}, {dauer} Minuten.', 'You logged "{feelWort}", the plan is already adjusted: today {titel}, {dauer} minutes.'],
  feelW:{tired:['etwas müde', 'a bit tired'], heavy:['richtig platt', 'wiped out']},
  r6:{k:['Die letzten Tage stecken dir ordentlich in den Beinen, und heute steht {titel} an. Das wird eher zäh als wirksam. Vorschlag: heute locker.', "The last few days are really in your legs, and {titel} is on today. That's more grind than gain. Suggestion: easy today."], a:['Deine Beine haben gerade viel zu tragen. Heute ist hart nicht mutig, sondern teuer. Vorschlag: locker, und beim nächsten Mal wieder volle Qualität.', "Your legs are carrying a lot right now. Going hard today isn't brave, it's expensive. Suggestion: easy, full quality next time."], s:['Deine Ermüdung ist gerade hoch. Eine harte Einheit bringt jetzt wenig. Vorschlag: {neu} statt {titel}.', "Your fatigue is high right now. A hard session won't add much. Suggestion: {neu} instead of {titel}."]},
  r7:['Gestern war schon {why}. Nach intensiver Belastung braucht die Erholung etwa ein bis zwei Tage. Vorschlag: heute locker statt {titel}.', 'Yesterday was already {why}. After intense efforts, recovery takes about one to two days. Suggestion: easy today instead of {titel}.'],
  r7w:{over:['über Plan', 'above plan'], extra:['eine Zusatzfahrt', 'an extra ride'], hard:['hart', 'hard']},
  r7p:['Zu deiner Zusatzfahrt gibt es schon einen Vorschlag auf der Startseite.', "There's already a suggestion for your extra ride on the home screen."],
  r8:['Bis {tempC} °C in deiner Trainingszeit. Wenn möglich früh oder spät fahren, etwas unter den Zielwerten bleiben und mehr trinken. Oder ein kühlerer Tag.', 'Up to {tempC} °C during your usual ride time. Ride early or late if you can, stay a little below the targets and drink more. Or pick a cooler day.'],
  r8T:{k:['Heute ist Schatten das beste Material.', "Shade is today's best upgrade."], a:['Schlau ist schneller als heiß.', 'Smart beats hot.']},
  r9d:['Bei {tempC} °C ist die Rolle heute die angenehmere Wahl, die Einheit bleibt gleich.', 'At {tempC} °C, the trainer is the more comfortable choice today. The session stays the same.'],
  erkNeu:['Fahr heute nur locker und kürzer, und nur, wenn du dich auf dem Rad gut fühlst. Kommen Fieber oder Beschwerden unterhalb des Halses dazu, stell auf „Krank“ um.', 'Ride only easy and shorter today, and only if you feel good on the bike. If fever or symptoms below the neck appear, switch to "Ill".'],
  r9:{k:['Bei {tempC} Grad und {regen} % Regenrisiko ist die Rolle heute die bessere Straße. Die Einheit bleibt gleich.', "At {tempC} degrees and {regen} % chance of rain, the trainer is today's better road. Same session."], a:['Draußen {tempC} Grad und {regen} % Regenrisiko: heute auf die Rolle, gleiche Einheit.', '{tempC} degrees and {regen} % rain risk outside: trainer today, same session.'], s:['Bei {tempC} °C und {regen} % Regenwahrscheinlichkeit besser auf der Rolle fahren, die Einheit bleibt gleich.', 'At {tempC} °C and {regen} % chance of rain, better ride indoors. The session stays the same.']},
  r10a:['Gestern ist die lockere Einheit ausgefallen. Nachholen musst du nichts.', "Yesterday's easy ride didn't happen. No need to make it up."],
  r10b:['Gestern ist {titelG} ausgefallen. Heute ist {lf} geplant, du kannst sie heute fahren, ohne dass zwei harte Tage aufeinanderfolgen. Musst du aber nicht.', "Yesterday's {titelG} didn't happen. Today is {lf}, so you could ride it today without two hard days in a row. You don't have to."],
  r10lf:{l:['locker', 'easy'], f:['frei', 'free']},
  rt:{k:[['Heute kein Training.', 'No training today.'], ['Morgen wartet {next}, {nextDauer} Minuten.', 'Tomorrow: {next}, {nextDauer} minutes.']], a:[['Pflichtprogramm: Beine hoch, früh ins Bett, sonst nichts.', 'Mandatory: feet up, early night, nothing else.'], ['Morgen {next}, {nextDauer} Minuten.', 'Tomorrow {next}, {nextDauer} minutes.']], s:[['Heute kein Training. Die Anpassung an das Training entsteht in der Erholung.', 'No training today. Adaptation happens during recovery.'], ['Morgen: {next}, {nextDauer} Minuten.', 'Tomorrow: {next}, {nextDauer} minutes.']]},
  rtKraft:['Im Plan steht heute {kraft}.', "Today's plan includes {kraft}."],
  kraftW:{str:['Krafttraining', 'strength training'], mob:['Mobilität', 'mobility'], stab:['Stabilität', 'stability work']},
  frage:['Wie fühlst du dich? Ein Tipp genügt, und die App passt die Einheit an, falls nötig.', 'How do you feel? One tap and the app adjusts the session if needed.'],
  vl4:['Erste Fahrt nach Schmerzen: besser locker. Wird es beim Fahren schlimmer, hör auf.', 'First ride after pain: keep it easy. If riding makes it worse, stop.'],
  neuMin:['{m} Minuten locker', '{m} minutes easy'],
  teaser:['Morgen: {next}, {nextDauer} Minuten.', 'Tomorrow: {next}, {nextDauer} minutes.'],
  evArt:{alpin:['Radmarathon', 'sportive'], huegel:['Radmarathon', 'sportive'], punch:['Rennen', 'race'], flach:['Rennen', 'race'], ultra:['Ultra-Event', 'ultra event'], event:['Event', 'event']},
  /* §6.6 Sprüche: Lage → Ton */
  /* §6.6 und §6.8 Sprüche: Lage → Ton → Varianten (SP-1: erste in 7 Tagen unbenutzte Variante) */
  sp:{
    vor:{k:[['Der Plan ist ein Vorschlag, kein Vertrag.', 'The plan is a suggestion, not a contract.'], ["Pläne mögen Flexibilität. Meistens jedenfalls.", "Plans like flexibility. Mostly."], ["Heute ein Gang leichter. Der Plan kommt damit klar.", "One gear easier today. The plan can handle it."]], a:[['Wer heute klug fährt, fährt morgen stark.', 'Ride smart today, ride strong tomorrow.'], ["Klug anpassen ist auch eine Stärke.", "Adjusting smartly is a strength too."], ["Heute geht es um morgen.", "Today is about tomorrow."]], s:[['Anpassen ist Teil des Plans.', 'Adjusting is part of the plan.'], ["Ein Vorschlag, keine Pflicht. Du entscheidest.", "A suggestion, not an obligation. You decide."], ["Training wirkt über Wochen, nicht über einen einzelnen Tag.", "Training works over weeks, not over a single day."]]},
    wetter:{k:[['Die Rolle hat noch nie über Gegenwind geklagt.', 'The trainer has never complained about headwind.'], ["Draußen macht das Wetter heute die Regeln. Drinnen machst du sie.", "Outside the weather makes the rules today. Indoors, you do."]], a:[['Drinnen gibt es keinen Gegenwind. Nur dich und die Intervalle.', 'No headwind indoors. Just you and the intervals.'], ["Drinnen ist das Wetter immer gleich. Heute ist das ein Vorteil.", "Indoors the weather never changes. Today that's an advantage."]], s:[['Das Wetter bestimmt den Ort, nicht das Training.', 'Weather decides where, not whether.'], ["Bei schlechtem Wetter ist die Rolle die sichere Wahl.", "In bad weather, the trainer is the safe choice."]]},
    rt:{k:[['Ein Spaziergang zählt. Ein heimliches Intervall zählt auch, nur leider gegen dich.', 'A walk counts. A secret interval counts too, just against you.'], ["Nichts tun ist heute die Einheit. Du schaffst das.", "Doing nothing is today's session. You've got this."], ["Das Rad hat heute frei. Du auch.", "The bike has the day off. So do you."]], a:[['Selbst dein Sofa ist beeindruckt. Gib ihm heute, was es verdient.', 'Even your sofa is impressed. Give it what it deserves today.'], ["Ruhetag heißt Ruhetag. Kein heimliches Ausrollen um den Block.", "Rest day means rest day. No sneaky spin around the block."], ["Heute ist die stärkste Einheit die, die du nicht fährst.", "Today the strongest session is the one you don't ride."]], s:[['Der Ruhetag ist Teil des Plans, nicht seine Lücke.', 'The rest day is part of the plan, not a gap in it.'], ["Ohne Erholung kein Trainingseffekt. Heute ist Erholung dran.", "No recovery, no training effect. Today is for recovery."], ["Ein freier Tag gibt dem Körper Zeit, sich an das Training anzupassen.", "A day off gives your body time to adapt to the training."]]},
    neu:{k:[['Noch keine Ausreden gesammelt. Starker Anfang.', 'No excuses collected yet. Strong start.'], ["Die ersten Tage bringen die meisten Fragen. Gut, dass du hier bist.", "The first days bring the most questions. Good to have you here."], ["Du und der Plan lernt euch gerade kennen. Läuft.", "You and the plan are just getting to know each other. So far so good."]], a:[['Tag {datentage}, null Ausreden. Dein Plan ist beeindruckt, und der ist schwer zu beeindrucken.', "Day {datentage}, zero excuses. Your plan is impressed, and it's hard to impress."], ["Der Anfang ist gemacht. Jetzt wird daraus ein Plan, der gefahren wird.", "You've started. Now let's make it a plan that gets ridden."], ["Woche eins. Die wichtigste Einheit ist die nächste.", "Week one. The most important session is the next one."]], s:[['Der Anfang ist der wichtigste Teil der Gewohnheit.', 'The start is the most important part of a habit.'], ["Am Anfang zählt Regelmäßigkeit mehr als Tempo.", "At the start, regularity matters more than pace."], ["In den ersten Wochen lieber etwas zu locker als zu hart.", "In the first weeks, rather a bit too easy than too hard."]]},
    verp:{k:[['Die Einheit von gestern schreibt noch an ihrer Entschuldigung.', "Yesterday's session is still writing its apology."], ["Gestern hatte das Rad frei. Heute geht es weiter.", "Yesterday the bike had a day off. Today it's back on."]], a:[['Gestern war gestern. Der Plan fragt nur nach heute.', 'Yesterday was yesterday. The plan only asks about today.'], ["Ein Tag fehlt, der Plan steht noch.", "One day missing, the plan still stands."]], s:[['Eine verpasste Einheit ändert wenig, die nächste zählt.', 'One missed session changes little, the next one counts.'], ["Ein ausgefallener Tag ändert an deinem Trainingsstand praktisch nichts.", "One missed day makes practically no difference to your fitness."]]},
    erf:{k:[['{erf7} Einheiten. Die Statistik grinst.', '{erf7} sessions. The stats are grinning.'], ["{erf7} Einheiten geschafft. Der Plan fühlt sich ernst genommen.", "{erf7} sessions done. The plan feels taken seriously."]], a:[['{erf7} Einheiten in sieben Tagen. Heute ist ein guter Tag, das so zu halten.', '{erf7} sessions in seven days. Good day to keep it that way.'], ["{erf7} Einheiten. So sieht ein Plan aus, der gefahren wird.", "{erf7} sessions. That's what a plan looks like when it's ridden."]], s:[['Konstanz schlägt Heldentaten. {erf7} Einheiten zeigen, dass du das verstanden hast.', 'Consistency beats heroics. {erf7} sessions show you get it.'], ["{erf7} Einheiten erledigt. Regelmäßigkeit bringt im Ausdauertraining am meisten.", "{erf7} sessions done. Regularity pays off most in endurance training."]]},
    hart:{k:[['Die Intervalle wissen noch nicht, was auf sie zukommt.', "The intervals have no idea what's coming."], ["Harte Einheit heute. Das Gute: Sie dauert nicht ewig.", "Hard session today. The good news: it doesn't last forever."], ["Zwischen den Intervallen ist Pause. Die ist eingeplant, nicht nur geduldet.", "There's rest between the intervals. It's planned, not just tolerated."]], a:[['Heute wird die Zahl im Plan zur Zahl in der Datei.', 'Today the number in the plan becomes the number in the file.'], ["Heute zählt Qualität. Jedes Intervall sauber, das letzte genauso wie das erste.", "Quality counts today. Every interval clean, the last one just like the first."], ["Du hast dich für diesen Plan entschieden. Heute zeigt er, was er kann.", "You chose this plan. Today it shows what it can do."]], s:[['Qualität vor Menge, heute zählt jedes Intervall.', 'Quality over quantity, every interval counts today.'], ["Harte Einheiten wirken nur mit ausreichender Erholung davor und danach.", "Hard sessions only work with enough recovery before and after."], ["Gleichmäßig fahren: das erste Intervall nicht zu schnell beginnen.", "Pace evenly: don't start the first interval too fast."]]},
    locker:{k:[['Locker heißt locker. Auch wenn der Wattmesser anderer Meinung ist.', 'Easy means easy. Even if the power meter disagrees.'], ["Wer heute überholt wird, macht alles richtig.", "If you get overtaken today, you're doing it right."], ["Heute ist Kaffeepausen-Tempo erlaubt. Ausdrücklich.", "Coffee-stop pace is allowed today. Officially."]], a:[['Heute langsam fahren ist die Kunst. Zeig, dass du sie kannst.', "Riding slow is the skill today. Show you've got it."], ["Locker fahren ist schwerer, als es klingt. Beweis das Gegenteil.", "Easy riding is harder than it sounds. Prove it isn't."], ["Heute gewinnt, wer sich bremsen kann.", "Today the winner is whoever can hold back."]], s:[['Lockere Einheiten bauen die Grundlage, auf der die harten wirken.', 'Easy rides build the base the hard ones work on.'], ["Locker heißt: Du könntest dich die ganze Zeit unterhalten.", "Easy means you could chat the whole time."], ["Der größte Teil der Trainingszeit ist locker. Genau dort entsteht die Ausdauer.", "Most training time is easy. That's where endurance is built."]]},
    check:{k:[['Heute misst du nur, was schon da ist. Kein Grund für Nervosität.', "Today you only measure what's already there. No need for nerves."]], a:[['Heute siehst du, was die letzten Wochen gebracht haben. Gleichmäßig einteilen.', 'Today you see what the last few weeks brought. Pace it evenly.']], s:[['Gleichmäßig einteilen gibt beim Fitness-Check das genaueste Ergebnis.', 'Even pacing gives the most accurate fitness check result.']]},
    event:{k:[['Heute ist der Tag, für den du trainiert hast. Genieß ihn.', 'Today is the day you trained for. Enjoy it.']], a:[['Das Training ist gemacht. Heute holst du es ab.', 'The training is done. Today you collect.']], s:[['Ruhig beginnen, früh verpflegen, den Rest erledigt das Training.', 'Start calmly, fuel early, the training does the rest.']]}}
};
/* §6.9 Radsport-Sprüche mit Anrede (Ton K und A). Drittes Feld: A = Anrede fest im Satz (ohne erlaubte Anrede überspringen),
   fix = festes Anrede-Wort im Satz, r9/r3 = nur bei dieser Regel. „, {anr}“ fällt ohne erlaubte Anrede einfach weg (AN-5). */
const CO_ANR = {de:['Rakete', 'Maschine', 'Granate'], en:['rocket', 'machine', 'legend']}; /* Wort entfernen: an derselben Stelle in de und en streichen */
const CO_SP2 = {
  rt:{k:[['Rad an den Haken, Füße hoch. Auch eine {Anr} braucht Boxenstopp.', 'Bike on the hook, feet up. Even a {anr} needs a pit stop.', {A:1}], ['Heute werden Körner gesammelt, nicht verbrannt.', 'Today you save matches. No burning allowed.'], ['Die einzige Kurbel, die sich heute dreht, gehört zur Kaffeemühle.', 'The only crank turning today is on the coffee grinder.']],
    a:[['Ruhetag, {anr}. Kein Bolzen, kein „nur mal kurz“ aufs Rad.', 'Rest day, {anr}. No hammering, no "just a quick spin".'], ['Heute wird die Maschine gewartet, nicht gefahren.', 'Today the machine gets serviced, not ridden.', {fix:'Maschine'}], ['Die Körner von heute brauchst du am nächsten harten Tag.', "Today's matches are for the next hard day."]]},
  locker:{k:[['Locker rollen, Kaffee im Blick. Watt sind heute Nebensache.', "Spin the legs, eyes on the coffee stop. Watts don't matter today."], ['Lockere Grundlage ist wie Zinsen: unspektakulär, aber sie kommt, {anr}.', 'Base miles are like interest: boring, but they add up, {anr}.'], ['Kette links ist heute kein Makel, sondern Plan.', "Small ring today isn't a flaw. It's the plan."]],
    a:[['Auch eine {Anr} fährt mal im Schongang. Heute ist so ein Tag.', "Even a {anr} has an easy gear. Today's the day.", {A:1}], ['Wer heute ballert, hat am harten Tag nichts mehr übrig.', "Hammer today, and there's nothing left for the hard day."], ['Plaudertempo, {anr}. Kannst du nicht mehr reden, bist du zu schnell.', "Chatting pace, {anr}. If you can't talk, you're too fast."]]},
  hart:{k:[['Heute darf die Kette rechts liegen, aber nur in den Intervallen.', 'Big ring today, but only in the intervals.'], ['Die Körner für heute sind eingeplant. Für die Intervalle, nicht fürs Einrollen.', "Today's matches are budgeted. For the intervals, not the warm-up."], ['Intervalltag, {anr}. Der Wattmesser ist schon ganz nervös.', 'Interval day, {anr}. The power meter is already nervous.']],
    a:[['Zeit, Watt zu drücken, {anr}. Genau so viele, wie im Plan stehen.', 'Time to put the power down, {anr}. Exactly what the plan says.'], ['Heute wird gebolzt, aber nach Plan. Die Pausen gehören dazu.', 'Today we go hard, by the book. The rests are part of it.'], ['Die Maschine ist warm. Jetzt zeigt sie, was im Plan steht.', "The machine is warmed up. Now it shows what's in the plan.", {fix:'Maschine'}]]},
  wetter:{k:[['Rolle statt Regenjacke. Kein Spritzwasser, kein Gegenwind, {anr}.', 'Trainer over rain jacket. No spray, no headwind, {anr}.', {r9:1}], ['Das Rad bleibt sauber, du bleibst trocken. Klingt nach einem guten Deal.', 'The bike stays clean, you stay dry. Sounds like a deal.', {r9:1}], ['Das Wetter hat heute Vorfahrt. Dein Training kommt danach.', 'The weather has right of way today. Your session comes after.', {r3:1}]],
    a:[['Wetter egal, {anr}. Die Rolle hat heute geöffnet.', "Weather doesn't matter, {anr}. The trainer is open.", {r9:1}], ['Auch eine Maschine läuft drinnen. Heute ist Hallenbetrieb.', "Machines run indoors too. Today it's indoor season.", {r9:1, fix:'Maschine'}], ['Heldentum bei Gewitter gibt es nicht. Nur verlegte Einheiten.', 'There are no heroics in a thunderstorm. Just rescheduled sessions.', {r3:1}]]},
  check:{k:[['Heute wird gemessen, nicht gewertet. Gleichmäßig losrollen, {anr}.', 'Today is for measuring, not judging. Roll out steady, {anr}.'], ['Ruhig anfangen. Die Körner gehören ans Ende, nicht in die erste Minute.', 'Start calm. Save your matches for the end, not the first minute.']],
    a:[['Check-Tag, {anr}. Gleichmäßig treten, die letzte Minute gehört dir.', 'Test day, {anr}. Steady power, the last minute is yours.'], ['Nicht losballern. Wer zu schnell startet, misst nur seinen Start.', "Don't go out too hot. Start too fast and you only measure the start."]]},
  event:{k:[['Kette rechts, {anr}. Heute ist dein Tag.', 'Have a good one, {anr}. Today is your day.'], ['Vorne im Wind ist schön, im Windschatten ankommen auch.', 'The front is fun. Sitting on a wheel gets you there too.'], ['Am Anfang Körner sparen, hinten raus genießen.', 'Save your matches early, enjoy the second half.']],
    a:[['Die Maschine ist bereit. Ruhig starten, hinten raus Gas geben.', 'The machine is ready. Start calm, turn it up later.', {fix:'Maschine'}], ['Heute darfst du ballern, {anr}. Aber erst, wenn du warm bist.', "Today you can let rip, {anr}. Once you're warmed up."], ['Das harte Training ist erledigt. Heute fährst du die Ernte ein.', 'The hard training is done. Today is harvest day.']]},
  erf:{k:[['{erf7} Einheiten. Läuft wie eine frisch gewachste Kette, {anr}.', '{erf7} sessions. Running like a freshly waxed chain, {anr}.']], a:[['{erf7} Einheiten. Die Maschine läuft rund.', '{erf7} sessions. The machine is running smooth.', {fix:'Maschine'}]]},
  neu:{k:[['Willkommen an Bord. Jede Fahrt zählt, die lockeren auch.', 'Welcome aboard. Every ride counts, the easy ones too.']], a:[['Startschuss gefallen, {anr}. Jetzt erst mal Grundlage sammeln.', "You're off, {anr}. First up: build the base."]]},
  vor:{k:[['Ein Gang runter ist auch ein Gang. Du entscheidest.', 'Shifting down is still shifting. Your call.']], a:[['Klug fahren schlägt stur fahren. Du hast die Wahl.', 'Smart beats stubborn. Your call.']]},
  verp:{k:[['Gestern blieb die Kette sauber. Heute rollt es wieder.', 'Yesterday the chain stayed clean. Today it rolls again.']], a:[['Abgehakt. Heute zählt die Einheit, die im Plan steht.', "Done and dusted. Today it's the session in the plan."]]}};
Object.entries(CO_SP2).forEach(([l, T0]) => Object.entries(T0).forEach(([k, v]) => { CO_TXT.sp[l][k].push(...v); }));
/* AN-1 bis AN-4: Anrede nur K/A, nur ohne Regel bzw. R5a, R9, R10a, nicht nach Krankheit, Schmerzen oder Müdigkeit in den letzten 3 Tagen,
   höchstens jeder zweite Spruch, nie zwei Tage in Folge, dasselbe Wort höchstens einmal in 7 Tagen. Liefert das Wort oder null. */
function coAnr(pk, r, hist){
  try {
    if (!pk || !r || r.calm || !['kumpel', 'antreiber'].includes(pk.ton) || !['OK', 'RT', 'TP', 'EV', 'R5a', 'R9', 'R10a'].includes(r.id)) return null;
    for (let k = 0; k <= 3; k++) if (['sick', 'neck', 'inj', 'tired', 'heavy'].includes(coFeelAt(iso(-k)))) return null;
    if (pk.befinden && pk.befinden !== 'inj' && ['tired', 'heavy', 'sick', 'neck'].includes(pk.befinden)) return null;
    const mk = h => (String(h).match(/\bA:([^\s|]+)/) || [])[1], y = CO_WD[(pk._i.t + 6) % 7] + ' |';
    if (hist.length && mk(hist[hist.length - 1])) return null; if (hist.some(h => String(h).startsWith(y) && mk(h))) return null;
    const used = hist.map(mk).filter(Boolean), n = CO_ANR.de.length; if (!n) return null;
    for (let j = 0; j < n; j++) { const i = (coDay(iso(0)) + j) % n; if (!used.includes(CO_ANR.de[i])) return {de:CO_ANR.de[i], en:CO_ANR.en[i], free:CO_ANR.de.filter(w => !used.includes(w))}; }
    return null;
  } catch (e) { elog(e); return null; }
}
const coAnrIn = s => { const t = String(s || '').toLowerCase(); const i = CO_ANR.de.findIndex((w, k) => t.includes(w.toLowerCase()) || t.includes(CO_ANR.en[k].toLowerCase())); return i < 0 ? null : CO_ANR.de[i]; };
/* §5 Verbotene Wörter (Prüfung ohne Groß-/Kleinschreibung, Stämme am Wortanfang; '=' = nur als ganzes Wort; Fehlalarm-Liste in coBanHits).
   g: Gesundheit (in festen R0-Texten erlaubt), d: Druck (nur bei R3–R10 und im ruhigen Modus verboten), s: zusätzlich nur im Spruch */
const CO_BAN = {
  de:{k:['Gewicht', '=Kilo', 'Kilogramm', 'abnehm', 'zunehm', 'Bauch', 'Figur', 'schlank', '=dick', 'Speck', 'Hüftgold', 'Körperfett', 'BMI', 'Kalorie', 'kcal', 'Diät', 'Fasten', 'Waage', 'Wampe', '=alt', '=alter', '=altes', 'Jahrgang', 'Oldie', '=Opa', '=Oma', 'Rentner', 'Senior', 'Greis', '=jung', 'Jugend', 'in deinem Alter', 'Masters', '=Mann', '=Männer', '=Frau', '=Frauen', 'Mädchen', '=Junge', 'männlich', 'weiblich', 'Zyklus', 'Periode', 'Hormon', 'Testosteron', 'Medikament', 'Tablette', 'Schmerzmittel', 'Ibuprofen', 'Aspirin', 'Koffein', '=mg', '=Gramm', 'Supplement', 'Nahrungsergänzung', 'Kreatin', '=Eisen', 'Vitamin', 'Serie', 'in Folge', 'Rekord', 'Bestwert', 'Bestzeit', 'Bestleistung', 'Streak', '=Team', '=andere', 'alle anderen', 'Durchschnitt', 'besser als', 'schlechter als', '=Rang', '=Platz', '=Arbeit', '=Job', '=Chef', 'Kinder', 'Familie', 'Partner', 'Stress', 'TSB', 'CTL', 'ATL', 'TSS', 'Punkte', 'Formwert', 'Fitnesswert', '=FTP'],
    g:['krank', 'Krankheit', 'Infekt', 'Grippe', 'Covid', 'Corona', 'Fieber', 'Entzündung', 'Verletzung', 'Zerrung', '=Sehne', '=Bänder', '=Knie', 'Rücken', '=Herz', 'Blutdruck', 'Asthma', 'Diabetes', 'Depression', 'Burnout', 'übertrainiert', 'Übertraining', 'Erschöpfungssyndrom', 'ärztlich', 'Schmerz'],
    d:['Weichei', '=faul', '=schwach', 'Schwäche', 'Versager', 'schäm', 'quäl dich', 'no pain', 'zieh durch', 'keine Ausreden'],
    s:['Schlaf', 'müde', 'platt', 'erkältet', 'Schmerz']},
  en:{k:['weight', '=kilo', 'kilogram', '=pound', '=lbs', 'lose weight', '=belly', '=figure', '=slim', '=fat', 'chubby', 'body fat', '=BMI', 'calorie', '=kcal', '=diet', 'fasting', '=scale', '=old', '=older', '=age', '=aged', 'grandpa', 'grandma', 'pensioner', '=senior', 'veteran', '=young', '=youth', 'at your age', '=masters', '=man', '=men', '=woman', '=women', '=girl', '=boy', '=male', '=female', '=cycle', '=period', 'hormone', 'testosterone', 'medication', '=pill', 'painkiller', 'ibuprofen', 'aspirin', 'caffeine', '=mg', '=grams', 'supplement', 'creatine', '=iron', 'vitamin', 'streak', 'in a row', '=record', 'personal best', '=PB', '=PR', '=team', '=others', 'everyone else', 'average', 'better than', 'worse than', '=rank', '=place', '=work', '=job', '=boss', '=kids', 'family', 'partner', 'stress', 'TSB', 'CTL', 'ATL', 'TSS', '=points', '=FTP'],
    g:['sick', 'illness', 'infection', '=flu', 'covid', 'fever', 'inflammation', 'injury', 'strain', 'tendon', 'ligament', '=knee', 'back pain', '=heart', 'blood pressure', 'asthma', 'diabetes', 'depression', 'burnout', 'overtrained', 'overtraining', 'doctor', 'medical', '=pain', '=ill'],
    d:['wimp', '=lazy', '=weak', 'weakness', 'loser', 'shame', 'no pain', 'push through', 'no excuses'],
    s:['sleep', 'tired', 'wiped', '=cold', 'pain']}};
/* erlaubte Wendungen aus der Vorgabe („harte Arbeit“ ist keine Ursache aus dem Alltag; „two hard days in a row“ ist keine Serie) */
const CO_OK = ['harte arbeit', 'wochen arbeit', 'hard work', 'of work', 'two hard days in a row', 'ein anderer tag', 'anderer tag', 'resting heart rate', 'work on', 'to work', 'only work'];
function coBanHits(text, L, opt){
  opt = opt || {}; const B = CO_BAN[L === 'en' ? 'en' : 'de'], low = ' ' + String(text || '').toLowerCase().replace(/[.,:;!?“”„"()–-]/g, ' ').replace(/\s+/g, ' ') + ' ';
  let s = low; CO_OK.forEach(q => { s = s.split(' ' + q + ' ').join(' ~ '); });
  const L2 = [...B.k, ...(opt.health ? [] : B.g), ...(opt.press ? B.d : []), ...(opt.spruch ? [...B.s, ...B.g] : [])];
  return L2.filter(w => { const whole = w[0] === '=', q = (whole ? w.slice(1) : w).toLowerCase().replace(/­/g, ''); return whole ? s.includes(' ' + q + ' ') : s.includes(' ' + q); });
}
/* ---------- Zusammenbau ---------- */
const coWords = s => String(s || '').trim().split(/\s+/).filter(Boolean).length;
function coFill(str, v){
  let miss = false; const out = str.replace(/\{(\w+)\}/g, (m, k) => { const x = v[k]; if (x == null || x === '' || (typeof x === 'number' && !isFinite(x))) { miss = true; return ''; } return String(x); });
  return miss ? '' : out;
}
const coCap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
/* Name aus einem Satz nehmen (er steht nur einmal, im ersten Satz) */
const coNoName = s => coCap(String(s).replace(/^\{name\},\s*/, '').replace(/,\s*\{name\}(?=[.,!?])/, '').replace(/\{name\},?\s*/, ''));
const CO_NOUN = /^(Belastung|Woche|Trainingszeit|Ruhetag|Fitness|Erholung|Ermüdung|Vorhersage|Grundfitness|Mehrere|Gestern)\b/;
function coNameFirst(list, name, L){
  const S0 = list.filter(Boolean); if (!S0.length) return S0;
  if (!name) return S0.map(coNoName);
  const out = S0.map((s, k) => k === 0 ? s : coNoName(s));
  if (!/\{name\}/.test(out[0])) { const f = out[0], low = L === 'en' ? (/^I\b/.test(f) ? f : f[0].toLowerCase() + f.slice(1)) : CO_NOUN.test(f) || /^\d/.test(f) ? f : f[0].toLowerCase() + f.slice(1); out[0] = '{name}, ' + low; }
  return out;
}
/* Stufen nach der App (14-ftp-wattmesser.js, „>“ wie dort; F5 aus VZ_BANDS) */
const coFS = v => v > 25 ? 5 : v > 10 ? 4 : v > -10 ? 3 : v > -25 ? 2 : 1;
const coFT = d => d >= 6 ? 'pp' : d >= 3 ? 'p' : d > -3 ? '0' : 'm';
const coKw = (lo, hi) => { const m = (lo + hi) / 2; return CO_TXT.kw.find(r => m < r[0]); };
function coNum(v, L){ if (v == null) return null; const r = Math.round(v * 2) / 2; return L === 'en' ? String(r) : String(r).replace('.', ','); }
function coTr(s, L){ try { return L === 'en' && s && typeof trS === 'function' ? trS(s) : s; } catch (e) { elog(e); return s; } }
/* Variante: reihum nach Tag, nie dieselbe wie am Vortag, „Neu formulieren“ nimmt die nächste (TZ-6) */
function coVar(tab, n, ctx){
  if (n <= 1) return 0; const d = ctx.dn, lv = (ctx.lv || {})[tab]; let i = ((d % n) + n) % n;
  const prev = lv ? (lv.d === ctx.today ? lv.p : lv.i) : null; if (prev === i) i = (i + 1) % n;
  i = (i + (ctx.alt || 0)) % n; if (ctx.alt && prev === i && n > 2) i = (i + 1) % n;
  ctx.used[tab] = {d:ctx.today, i, p:prev}; return i;
}
function coReport(pk, r, o){
  o = o || {}; if (!pk || !r) return null;
  const L = pk.sprache === 'en' ? 1 : 0, Lc = L ? 'en' : 'de', tk = CO_TK[pk.ton] || 'k', T = CO_TXT, I = pk._i, e = pk.einheit, f = pk.form, dt = pk.datentage, c = S.coach || {};
  const today = iso(0), ctx = {dn:coDay(today), today, lv:o.lv || c.lv || {}, alt:o.alt != null ? o.alt : (c.alt && c.alt.d === today ? c.alt.n : 0), used:{}};
  const g = a => a ? a[L] : '', gt = (m, k) => m ? (m[k] || m.s || m.k) : null, vv = (tab, arr) => arr && arr.length ? arr[coVar(tab, arr.length, ctx)] : null;
  const name = pk.vorname ? pk.vorname : '';
  const evT = pk.plan.eventInTagen, ev = pk.plan.eventArt ? g(T.evArt[pk.plan.eventArt] || T.evArt.event) : null;
  const tn = s => s ? String(s).replace(/(\d)\s*×\s*(\d)/g, '$1 × $2') : s, qq = s => s ? (L ? '“' + s + '”' : '„' + s + '“') : s;
  const titelR = e ? tn(coTr(e.titel, Lc)) : null, titel0 = qq(titelR);
  const V = {name:'{name}', wo:pk.plan.woche, woGes:pk.plan.wochenGesamt, phase:coTr(pk.plan.phase, Lc), evTage:evT != null && evT >= 1 ? evT : null, ev, datentage:dt};
  const fin = (ins, ein, spr, calm) => {
    const nameIn = s => s.replace(/\{name\}/g, name);
    const rep = {insight:nameIn(ins.filter(Boolean).join(' ')), einheit:nameIn(ein.filter(Boolean).join(' ')), spruch:calm ? '' : spr || '', teaser:''};
    if (!calm && pk.naechste) rep.teaser = coFill(g(T.teaser), {next:qq(tn(coTr(pk.naechste.titel, Lc))), nextDauer:pk.naechste.dauerMin});
    if (evT === 1 && rep.insight) rep.insight = L ? rep.insight.replace(/\b1 days\b/, '1 day') : rep.insight.replace(/\b1 Tage\b/, '1 Tag');
    rep.calm = !!calm; rep.rule = r.id; rep.anr = calm ? null : coAnrIn(rep.spruch); rep.used = ctx.used; rep.words = coWords(rep.insight) + coWords(rep.einheit) + coWords(rep.spruch);
    return rep;
  };
  /* ---- Ruhiger Modus (R0–R2), für alle Töne gleich ---- */
  if (r.calm) {
    const C = {R0k:T.krank, R0e:T.erk, R0v:T.verl, R1:T.pause, R2:T.ueber}[r.id];
    const wann = r.id === 'R0v' ? (r.wann === 0 || r.wann === 1 ? g(T.wann[r.wann]) : (L ? 'on ' : 'am ') + coTr(DAYS[(todayIdx() - r.wann + 70) % 7], Lc)) : null;
    const ins = coNameFirst([coFill(g(C[0]), {name:'{name}', wann, lage:r.lage})], name, Lc);
    const ein = [r.id === 'R0v' && e && e.hart && !I.xAd ? g(T.verlHart) : '', r.erkNeu ? g(T.erkNeu) : g(C[1])];
    return fin(ins, ein, '', true);
  }
  /* ---- Insight: (1) Trend bzw. Neuling/Lücke/Stunden, (2) Form (+ Morgen am Ruhetag), (3) Ausblick ---- */
  const rest = !e, stg = f && f.frische != null ? coFS(f.frische) : null, lim84 = dt < 84, quiet = I.taper || I.rec;
  let s1 = '', s2 = '', s2a = '', s2b = '', s3 = '';
  if (I.lucke) s1 = g(T.luecke);
  else if (dt < 7) s1 = g(T.neu);
  else if (dt >= 126 && f && f.fitnessVor28Tagen != null) {
    const d = f.fitness - f.fitnessVor28Tagen; let k = coFT(d); if (k === 'pp' && I.noData) k = 'p';
    const r01 = c.r01 && ddiff(c.r01, today) <= 21;
    const arr = k === 'm' && quiet ? T.ft.mg : k === 'm' && r01 ? T.ft.mp : gt(T.ft[k], tk);
    s1 = g(vv('ft', arr)); if (rest && tk === 'k' && (k === 'pp' || k === 'p')) s1 = s1.replace(/\.$/, g(T.rtStay));
  } else if (dt >= 14 && pk.zeit && pk.zeit.stdLetzteWoche != null) s1 = coFill(g(gt(T.zeit, tk)), {std:coNum(pk.zeit.stdDieseWoche, Lc), stdVor:coNum(pk.zeit.stdLetzteWoche, Lc)});
  if (!I.lucke && dt >= 7) {
    if (dt < 28 || stg == null) s2 = g(T.fog);
    else if (r.id === 'R6') s2 = '';
    else if (stg <= 2 && lim84) s2 = g(T.fs5);
    else { const arr = stg === 1 && tk === 'a' ? T.fs[1].s : gt(T.fs[stg], tk); s2 = g(vv('fs', arr)); if (stg === 5 && tk === 's' && !quiet) s2 += ' ' + g(T.fs5s); if (dt <= 41) s2a = g(T.fs2); }
    if (rest && dt >= 28 && stg != null && f.frischeMorgen != null && !(stg <= 2 && lim84)) { const sm = coFS(f.frischeMorgen); const M = sm > stg ? T.mo.up : sm === stg ? T.mo.eq : null; if (M) s2b = coFill(g(M[tk]), {mstufe:T.mst[sm] ? g(T.mst[sm]) : null}); }
  }
  if (V.evTage != null) { s3 = coFill(g(gt(T.ev, tk)), V); if (dt >= 42 && evT <= 14 && pk.plan.formAmEvent != null) { const se = coFS(pk.plan.formAmEvent); if (se >= 4) s3 += ' ' + g(T.evf.hi); else if (se === 3) s3 += ' ' + g(T.evf.mid); } }
  else s3 = coFill(g(T.ziel), V);
  /* Teile mit Rolle: 1 Trend/Neuling/Stunden, 2 Form und Morgen, 3 Ausblick, 0 Einleitung am Ruhetag */
  let parts;
  if (rest) {
    if (dt < 28) parts = [[0, g(T.rt0)], [1, s1], [3, s3]];
    else if (tk === 'k') parts = [[0, g(T.rtIn.k)], [1, s1], [2, s2], [5, s2a], [2, s2b], [3, s3]];
    else parts = [[1, s1], [2, s2], [5, s2a], [0, g(T.rtIn[tk])], [2, s2b], [3, s3]];
  } else parts = [[1, s1], [2, s2], [5, s2a], [3, s3]];
  parts = parts.filter(q => q[1]);
  const insOf = P => coNameFirst(P.map(q => q[1]), name, Lc);
  let ins = insOf(parts);
  /* ---- Einheit ---- */
  const act = r.kn && CO_PLAN.includes(r.kn), aTone = tk === 'a' && (act || /^R(3|4|6|7|8|9|10)/.test(r.id)) ? 's' : tk;
  let ein = [];
  const neu = e ? coFill(g(T.neuMin), {m:Math.max(30, Math.min(60, e.dauerMin || 60))}) : null;
  if (e) {
    let kern = null, titel = titelR;
    if (e.test) kern = g(T.kwTest);
    else if (e.iv && !e.iv.seq && e.iv.reps > 0) { const kw = coKw(e.iv.lo, e.iv.hi), wk = e.iv.work, sek = wk < 1, n = (e.iv.sets || 1) > 1 ? e.iv.sets + ' × ' + e.iv.reps : e.iv.reps;
      kern = coFill(g(sek ? T.ivSek : T.ivMin), {reps:n, work:sek ? Math.round(wk * 60) : coNum(wk, Lc), wort:kw ? kw[1 + L] : null}) + (aTone === 's' && e.iv.rest >= 1 ? coFill(g(T.ivRest), {rest:coNum(e.iv.rest, Lc)}) : '');
      titel = String(titel || '').replace(/\s+\d+(?:\s*[×x/]\s*\d+)+(?:\s*(?:Sek\.|Min\.|sec|min|s))?\s*$/, '') || titel; }
    else if (e.iv && e.iv.lo) { const kw = coKw(e.iv.lo, e.iv.hi); kern = kw ? kw[1 + L] : null; }
    else if (e.lo > 0 && e.hi > 0 && e.t !== 'race') { const kw = coKw(e.lo, e.hi); kern = kw ? kw[1 + L] : null; }
    titel = qq(titel);
    if (r.id !== 'R5') ein.push(kern ? coFill(g(T.e0[aTone]), {titel, kernWort:kern, dauer:e.dauerMin}) : coFill(g(T.e0n[aTone]), {titel, dauer:e.dauerMin}));
  } else {
    const RT = T.rt[tk]; ein.push(g(RT[0])); if (pk.naechste) ein.push(coFill(g(RT[1]), {next:qq(tn(coTr(pk.naechste.titel, Lc))), nextDauer:pk.naechste.dauerMin}));
    if (pk.kraft) ein.push(coFill(g(T.rtKraft), {kraft:g(T.kraftW[pk.kraft])}));
  }
  const w = pk.wetter || {}, wxw = w.gewitter ? g(T.wxG) : coFill(g(T.wxB), {boeen:w.boeen});
  const add = s => { if (s) ein.push(s); };
  if (r.id === 'R3') add(I.evDay ? coFill(g(T.r3ev), {wx:wxw}) : coFill(g(T.r3[tk]), {wx:wxw, Wx:coCap(wxw), wxVon:w.wxVon, wxBis:w.wxBis}));
  else if (r.id === 'R4a') { add(r.mk && r.mk[0] ? g(T.r4a[r.mk[0]]) + ' ' + coFill(g(T.r4aK), {titel:titel0}) : ''); add(g(T.r4aT[tk])); }
  else if (r.id === 'R4b') add(coFill(g(T.r4b), {neu, titel:titel0}));
  else if (r.id === 'R4c') add(g(T.r4c));
  else if (r.id === 'R5') add(coFill(g(T.r5), {feelWort:T.feelW[pk.befinden] ? g(T.feelW[pk.befinden]) : null, titel:titel0, dauer:e && e.dauerMin}));
  else if (r.id === 'R6') add(coFill(g(T.r6[tk]), {titel:titel0, neu}));
  else if (r.id === 'R7') add(coFill(g(T.r7), {why:g(T.r7w[r.why]), titel:titel0}));
  else if (r.id === 'R7p') add(g(T.r7p));
  else if (r.id === 'R8') { add(coFill(g(T.r8), {tempC:w.tmax})); if (T.r8T[tk]) add(g(T.r8T[tk])); }
  else if (r.id === 'R9') add(w.regenProzent != null && w.regenProzent < 30 ? coFill(g(T.r9d), {tempC:w.tempC}) : coFill(g(T.r9[tk]), {tempC:w.tempC, regen:w.regenProzent}));
  else if (r.id === 'R10a') add(g(T.r10a));
  else if (r.id === 'R10b') add(coFill(g(T.r10b), {titelG:qq(tn(coTr(I.yd.titel, Lc))), lf:g(T.r10lf[r.frei ? 'f' : 'l'])}));
  else if (r.id === 'VL4') add(g(T.vl4));
  if (r.id === 'R5a') add(g(T.frage));
  /* ---- Spruch: Lage nach Rang, kein Spruch zweimal in 7 Tagen ---- */
  const sug = act || /^(R3|R4|R6|R7|R8|R9|VL4)/.test(r.id), cands = [];
  const kind = !e ? '' : e.test ? 'check' : e.eventTag ? 'event' : e.hart ? 'hart' : 'locker';
  if (sug) cands.push(/^R(3|9)/.test(r.id) ? 'wetter' : 'vor');
  if (rest) cands.push('rt');
  if (dt < 7) cands.push('neu');
  if (I.yd.miss) cands.push('verp');
  if (w.nass || (w.gefuehlt != null && w.gefuehlt < 5)) cands.push('wetter');
  if (kind === 'check' || kind === 'event') cands.push(kind);
  if (dt >= 7 && pk.erfuellung.letzte7Tage && pk.erfuellung.letzte28TageProzent >= 85) cands.push('erf');
  if (kind) cands.push(kind);
  /* SP-1: erste Variante der Lage, die in den letzten 7 Tagen nicht vorkam; SP-2: sonst nur in eine verträgliche Lage ausweichen;
     sind alle benutzt, die am längsten zurückliegende der Lage. Bei aktivem Auslöser R3–R10 kein Druck-Wort (§5, T2). */
  const hist = (c.hist || []).filter(h => !String(h).startsWith(pk.wochentag + ' |')), lastUse = s => { let k = -1; hist.forEach((h, i) => { if (String(h).includes(s.slice(0, 30))) k = i; }); return k; };
  const press = /^R(3|4|6|7|8|9|10)/.test(r.id), vals = {erf7:pk.erfuellung.letzte7Tage, datentage:dt >= 1 ? dt : null};
  const anr = coAnr(pk, r, hist);
  const one = (L1, v) => { const o = v[2] || {}; if ((o.r9 && r.id !== 'R9') || (o.r3 && r.id !== 'R3')) return ''; let s = g(v);
    if (/\{[Aa]nr\}/.test(s) || o.fix) { const ok = anr && L1 !== 'vor' && L1 !== 'verp' && (!o.fix || anr.free.includes(o.fix) && CO_ANR.de.includes(o.fix));
      if (!ok) { if (o.A || o.fix) return ''; s = s.replace(/,\s*\{[Aa]nr\}/g, ''); if (/\{[Aa]nr\}/.test(s)) return ''; }
      else if (!o.fix) s = s.replace(/\{[Aa]nr\}/g, anr[Lc]); }
    return coFill(s, vals); };
  const vars = L0 => ((T.sp[L0] || {})[tk] || []).map(v => one(L0, v)).filter(s => s && (!press || !coBanHits(s, Lc, {press:true}).length));
  const SP2 = {vor:['wetter'], wetter:['vor'], verp:['vor'], erf:[kind], neu:[kind === 'hart' || kind === 'locker' ? kind : '']};
  const L0 = cands[0]; let spr = '';
  if (L0) { spr = vars(L0).find(s => lastUse(s) < 0) || '';
    if (!spr) (SP2[L0] || []).filter(Boolean).some(L1 => (spr = vars(L1).find(s => lastUse(s) < 0) || ''));
    if (!spr) spr = vars(L0).sort((x, y) => lastUse(x) - lastUse(y))[0] || ''; }
  /* ---- Länge: über 80 Wörter fällt zuerst (2), dann (1) weg; der Ausblick bleibt ---- */
  let rep = fin(ins, ein, spr, false);
  /* der Anhang „erste Einschätzung“ (5) hängt am Formsatz und fällt nur mit ihm weg */
  for (const drop of [2, 1]) { if (rep.words <= 80) break; if (!parts.some(q => q[0] === drop)) continue; parts = parts.filter(q => q[0] !== drop && !(drop === 2 && q[0] === 5)); rep = fin(insOf(parts), ein, spr, false); }
  /* Unter 60 Wörtern: Kraft/Mobilität und die Einheit von morgen ergänzen (nur Platzhalter aus dem Paket) */
  if (rep.words < 60 && e && r.id !== 'VL4') { const more = []; if (pk.kraft) more.push(coFill(g(T.rtKraft), {kraft:g(T.kraftW[pk.kraft])})); if (pk.naechste) more.push(coFill(g(T.rt[tk][1]), {next:qq(tn(coTr(pk.naechste.titel, Lc))), nextDauer:pk.naechste.dauerMin}));
    for (const m of more) { if (rep.words >= 60 || !m) break; const i = ein.length - (r.id === 'R5a' ? 1 : 0), E2 = ein.slice(); E2.splice(i, 0, m); const r2 = fin(insOf(parts), E2, spr, false); if (r2.words <= 80) { ein = E2; rep = r2; } } }
  return rep;
}
