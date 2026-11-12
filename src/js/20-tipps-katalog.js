/* ---------- F20: „Tipp zu heute“ – Katalog mit Tags und Wechsel ohne schnelle Wiederholung ----------
   Jeder Tipp: [id, Kategorie, Tags, Deutsch, Englisch, Quellen, Wissen-Abschnitt für „Mehr dazu“].
   Tags (leer = passt immer): d: Tagesart (rest, rec, base, int, long, str, ev7, race, post), ph: Phase (base, build, peak,
   taper), s: Jahreszeit (w = Nov–Feb, s = Jun–Aug), wx: Wetter des Tages, wenn aktiviert (hot ≥ 25 °C, cold ≤ 5 °C, wet),
   lv: Erfahrung (new, amb). Mehrere Werte je Tag-Art mit Komma. Zahlen nur mit Quelle (TIP_SRC); Platzhalter {eiw}
   (Eiweiß je Mahlzeit, 0,3–0,4 g/kg) und {fl} (Trinken 2–4 h vorher, 5–7 ml/kg) rechnet die App mit dem Körpergewicht aus.
   Auswahl (tipPick): passende Tipps, zuerst nie gezeigte, dann die am längsten nicht gezeigten, frühestens nach 60 Tagen.
   Gezeigte Tipps stehen in S.tips (Zustand, Spiegel, Sicherung). */
const TIP_SRC = {
  jeu14:'Jeukendrup AE (2014): A step towards personalized sports nutrition: carbohydrate intake during exercise. Sports Med 44(S1):S25–S33',
  acsm16:'Thomas DT, Erdman KA, Burke LM (2016): ACSM/AND/DC Joint Position Statement: Nutrition and Athletic Performance. Med Sci Sports Exerc 48(3):543–568',
  issn17:'Jäger R et al. (2017): ISSN Position Stand: protein and exercise. J Int Soc Sports Nutr 14:20',
  acsm07:'Sawka MN et al. (2007): ACSM Position Stand: Exercise and fluid replacement. Med Sci Sports Exerc 39(2):377–390',
  burke11:'Burke LM et al. (2011): Carbohydrates for training and competition. J Sports Sci 29(S1):S17–S27',
  nsf15:'Hirshkowitz M et al. (2015): National Sleep Foundation’s sleep time duration recommendations. Sleep Health 1:40–43',
  mah11:'Mah CD et al. (2011): The effects of sleep extension on athletic performance. Sleep 34(7):943–950',
  seiler10:'Seiler S (2010): What is best practice for training intensity and duration distribution in endurance athletes? Int J Sports Physiol Perform 5:276–291',
  coggan:'Allen H, Coggan A (2019): Training and Racing with a Power Meter, 3. Aufl.',
  bosq07:'Bosquet L et al. (2007): Effects of tapering on performance: a meta-analysis. Med Sci Sports Exerc 39(8):1358–1365',
  ronn14:'Rønnestad BR, Mujika I (2014): Optimizing strength training for running and cycling endurance performance. Scand J Med Sci Sports 24:603–612',
  foss04:'Foss Ø, Hallén J (2004): The most economical cadence increases with increasing workload. Eur J Appl Physiol 92:443–451',
  blocken18:'Blocken B et al. (2018): Aerodynamic drag in cycling pelotons. J Wind Eng Ind Aerodyn 179:319–337',
  guest21:'Guest NS et al. (2021): ISSN position stand: caffeine and exercise performance. J Int Soc Sports Nutr 18:1',
  jeu17:'Jeukendrup AE (2017): Training the gut for athletes. Sports Med 47(S1):101–110',
  baker17:'Baker LB (2017): Sweating rate and sweat sodium concentration in athletes. Sports Med 47(S1):111–128',
  meeu13:'Meeusen R et al. (2013): Prevention, diagnosis and treatment of the overtraining syndrome. Eur J Sport Sci 13(1):1–24',
  barnes14:'Barnes MJ (2014): Alcohol: impact on sports performance and recovery in male athletes. Sports Med 44:909–919',
  bini11:'Bini R et al. (2011): Effects of bicycle saddle height on knee injury risk and cycling performance. Sports Med 41(6):463–476',
  olivier17:'Olivier J, Creighton P (2017): Bicycle injuries and helmet use: a systematic review and meta-analysis. Int J Epidemiol 46(1):278–292',
  stvo:'Straßenverkehrs-Ordnung (StVO) § 5 Abs. 4: Überholabstand zu Radfahrenden innerorts mindestens 1,5 m, außerorts 2 m',
  periard15:'Périard JD et al. (2015): Adaptations and mechanisms of human heat acclimation. Scand J Med Sci Sports 25(S1):20–38',
  marcora09:'Marcora SM et al. (2009): Mental fatigue impairs physical performance in humans. J Appl Physiol 106:857–864',
  blanch14:'Blanchfield AW et al. (2014): Talking yourself out of exhaustion: the effects of self-talk on endurance performance. Med Sci Sports Exerc 46(5):998–1007',
  mount18:'Mountjoy M et al. (2018): IOC consensus statement on Relative Energy Deficiency in Sport (RED-S). Br J Sports Med 52:687–697',
  park:'Park Tool: Chain Wear and Replacement (Kettenverschleiß: 0,5 % bei 11- und 12-fach, 0,75 % bei 10-fach und weniger)',
  behm16:'Behm DG et al. (2016): Acute effects of muscle stretching on physical performance, range of motion, and injury incidence. Appl Physiol Nutr Metab 41(1):1–11',
  stellingwerff:'Stellingwerff T, Cox GR (2014): Systematic review: carbohydrate supplementation on exercise performance or capacity of varying durations. Appl Physiol Nutr Metab 39:998–1011',
  hydration_urine:'Armstrong LE et al. (1994): Urinary indices of hydration status. Int J Sport Nutr 4(3):265–279',
  issn_cr:'Kerksick CM et al. (2018): ISSN exercise & sports nutrition review update. J Int Soc Sports Nutr 15:38',
  vit_d:'Owens DJ et al. (2018): Vitamin D and the athlete: current perspectives and new challenges. Sports Med 48(S1):3–16',
  coldex:'Castellani JW, Young AJ (2016): Human physiological responses to cold exposure. Auton Neurosci 196:63–74',
  warmup:'Bishop D (2003): Warm up II: performance changes following active warm up and how to structure the warm up. Sports Med 33(7):483–498',
  bike_light:'Straßenverkehrs-Zulassungs-Ordnung (StVZO) § 67: Beleuchtung an Fahrrädern'
};
/* [id, Kategorie, Tags, de, en, Quellen, Wissen] – Kategorien: trn Training, erh Erholung/Schlaf, ern Ernährung/Trinken,
   tec Technik, mat Material/Pflege, men Mental, sic Sicherheit, wet Wetter/Kleidung, evt Event/Renntag */
const TIPS = [
  /* ---- Training ---- */
  ['t01', 'trn', 'd:base', 'Grundlage im Gesprächstempo: Wenn du noch ganze Sätze sprechen kannst, passt die Intensität.', 'Endurance at conversation pace: if you can still speak in full sentences, the intensity is right.', '', 'w-train'],
  ['t02', 'trn', 'd:base,long', 'Ausdauersportler auf hohem Niveau trainieren etwa 80 % ihrer Einheiten locker und nur rund 20 % hart.', 'High-level endurance athletes do roughly 80% of their sessions easy and only about 20% hard.', 'seiler10', 'w-zonen'],
  ['t03', 'trn', 'd:int', 'Intervalle wirken nur, wenn die Pausen locker sind. Fahr die Erholungsphasen bewusst ruhig.', 'Intervals only work if the recoveries are easy. Ride the rest periods deliberately calmly.', '', 'w-zonen'],
  ['t04', 'trn', 'd:int', 'Starte das erste Intervall eher am unteren Ende des Zielbereichs. Gleichmäßig ist besser als zu schnell begonnen.', 'Start the first interval at the lower end of the target range. Even pacing beats starting too fast.', '', 'w-zonen'],
  ['t05', 'trn', 'd:int', 'Wenn die Wattwerte im letzten Intervall deutlich einbrechen, beende die Serie. Qualität vor Menge.', 'If your power drops clearly in the last interval, end the set. Quality over quantity.', '', 'w-train'],
  ['t06', 'trn', 'd:rec', 'Rekom heißt wirklich locker: kleiner Gang, niedriger Puls. Zu schnell gefahren bringt nur Ermüdung.', 'Recovery means truly easy: small gear, low heart rate. Riding it too fast only adds fatigue.', '', 'w-erh'],
  ['t07', 'trn', 'd:long', 'Lange Ausfahrt: Fahr die erste Stunde bewusst ruhig. Die Reserve brauchst du am Ende.', 'Long ride: take the first hour deliberately easy. You will need the reserve at the end.', '', 'w-train'],
  ['t08', 'trn', 'd:long', 'Plane die Strecke so, dass du nach etwa der Hälfte Wasser nachfüllen kannst.', 'Plan your route so you can refill water at about halfway.', '', 'w-waehrend'],
  ['t09', 'trn', 'ph:build', 'In der Aufbauphase zählt Regelmäßigkeit mehr als einzelne Heldentage. Lieber jede Woche solide als eine Woche alles.', 'In the build phase, consistency matters more than single heroic days. Better solid every week than everything in one week.', '', 'w-train'],
  ['t10', 'trn', 'ph:base', 'In der Basisphase legst du das Fundament: viel locker, etwas Kraft, wenig Intensität. Das zahlt sich im Frühjahr aus.', 'In the base phase you lay the foundation: lots of easy riding, some strength, little intensity. It pays off in spring.', '', 'w-train'],
  ['t11', 'trn', 'ph:peak', 'In der Spitzenphase gilt: Der Umfang bleibt, die Intensität wird eventspezifisch. Jetzt nichts Neues ausprobieren.', 'In the peak phase, volume stays and intensity becomes event-specific. Do not try anything new now.', '', 'w-race'],
  ['t12', 'trn', 'ph:taper', 'Im Tapering sinkt der Umfang um etwa 40 bis 60 %, die Intensität bleibt. Die Form kommt mit der Erholung.', 'During the taper, volume drops by about 40 to 60% while intensity stays. Form arrives with recovery.', 'bosq07', 'w-race'],
  ['t13', 'trn', 'ph:taper', 'Unruhe im Tapering ist normal. Die zusätzliche Frische ist gewollt, nicht verlorene Fitness.', 'Restlessness during the taper is normal. The extra freshness is intended, not lost fitness.', '', 'w-race'],
  ['t14', 'trn', '', 'Steigere die Belastung langsam: Die Fitness (CTL) sollte pro Woche nur um wenige Punkte steigen, etwa 5 bis 8.', 'Increase load gradually: fitness (CTL) should rise by only a few points per week, about 5 to 8.', 'coggan', 'w-train'],
  ['t15', 'trn', 'd:str', 'Krafttraining verbessert bei Radfahrern Ökonomie und Spritzigkeit. Schwere Lasten mit wenigen Wiederholungen wirken am besten.', 'Strength training improves economy and punch in cyclists. Heavy loads with few repetitions work best.', 'ronn14', ''],
  ['t16', 'trn', 'd:str', 'Leg Kraft und harte Radeinheit möglichst nicht direkt hintereinander. Mindestens einige Stunden Abstand helfen beiden.', 'Avoid putting strength and hard bike sessions directly back to back. A gap of at least a few hours helps both.', 'ronn14', ''],
  ['t17', 'trn', 'd:str', 'Technik vor Gewicht: Eine saubere Ausführung schützt vor Verletzungen und bringt mehr Kraftzuwachs.', 'Technique before load: clean execution protects against injury and builds more strength.', '', ''],
  ['t18', 'trn', 's:w', 'Winter ist Grundlagenzeit. Auf der Rolle reichen oft kürzere Einheiten, weil es keine Pausen an Ampeln gibt.', 'Winter is base season. Indoors, shorter sessions often suffice because there are no stops at traffic lights.', '', 'w-train'],
  ['t19', 'trn', 'd:int,base', 'Auf der Rolle wird es schnell heiß. Ein Ventilator senkt die Körpertemperatur und damit den Puls bei gleicher Leistung.', 'It gets hot quickly on the trainer. A fan lowers body temperature and therefore heart rate at the same power.', '', ''],
  ['t20', 'trn', 'lv:new', 'Am Anfang zählt vor allem regelmäßiges Fahren. Schon drei lockere Einheiten pro Woche bringen spürbare Fortschritte.', 'At the start, regular riding matters most. Even three easy sessions a week bring noticeable progress.', '', 'w-train'],
  ['t21', 'trn', 'lv:amb', 'Prüfe alle 6 bis 8 Wochen deine Zonen mit einem Fitness-Check. Veraltete Zonen machen Intervalle zu leicht oder zu hart.', 'Check your zones with a fitness test every 6 to 8 weeks. Outdated zones make intervals too easy or too hard.', 'coggan', 'w-zonen'],
  ['t22', 'trn', 'd:base', 'Auch Grundlage darf mal hügelig sein. Fahr die Anstiege dann im oberen Grundlagenbereich, nicht im roten Bereich.', 'Endurance rides can be hilly. Ride the climbs at the upper end of endurance, not in the red.', '', 'w-zonen'],
  ['t23', 'trn', 'd:int', 'Wärm dich vor harten Intervallen 10 bis 15 Minuten locker auf, mit ein, zwei kurzen Steigerungen.', 'Warm up for 10 to 15 minutes before hard intervals, with one or two short efforts.', 'warmup', 'w-train'],
  ['t24', 'trn', '', 'Halte die Pulswerte und dein Gefühl im Blick. Wenn beides nicht zur Leistung passt, ist der Körper oft noch müde.', 'Keep an eye on heart rate and how you feel. If neither matches the power, your body is often still tired.', '', 'w-erh'],
  ['t25', 'trn', 'd:long', 'Ab drei Stunden sinkt die Leistung, die du halten kannst. Fahr die langen Einheiten deshalb mit Plan für Essen und Pausen.', 'After three hours, the power you can sustain declines. Ride long sessions with a plan for food and breaks.', '', 'w-waehrend'],
  /* ---- Erholung und Schlaf ---- */
  ['e01', 'erh', 'd:rest', 'Ruhetag: Heute wächst deine Form. Training setzt den Reiz, besser wirst du in der Erholung.', 'Rest day: today your form grows. Training sets the stimulus, you improve during recovery.', '', 'w-erh'],
  ['e02', 'erh', '', 'Erwachsene brauchen 7 bis 9 Stunden Schlaf. Bei viel Training eher am oberen Ende.', 'Adults need 7 to 9 hours of sleep. With a lot of training, aim for the upper end.', 'nsf15', 'w-erh'],
  ['e03', 'erh', 'd:int,long', 'In einer Studie verbesserte längerer Schlaf (Ziel 10 Stunden im Bett) bei Sportlern Sprintzeit und Treffsicherheit.', 'In one study, longer sleep (aiming for 10 hours in bed) improved athletes’ sprint times and accuracy.', 'mah11', 'w-erh'],
  ['e04', 'erh', 'd:rest,rec', 'Ein kurzer Mittagsschlaf, unter einer halben Stunde, kann Erholung und Konzentration verbessern, ohne den Nachtschlaf zu stören.', 'A short nap, under half an hour, can improve recovery and focus without disturbing night sleep.', '', 'w-erh'],
  ['e05', 'erh', '', 'Bildschirm aus, Zimmer kühl und dunkel: Die letzte Stunde vor dem Schlafen entscheidet viel über die Erholung.', 'Screens off, room cool and dark: the last hour before bed decides a lot about recovery.', '', 'w-erh'],
  ['e06', 'erh', 'd:int,long', 'Nach harten Einheiten am Abend: Iss danach trotzdem etwas Kohlenhydrate und Eiweiß. Hunger stört den Schlaf.', 'After hard evening sessions, still eat some carbohydrates and protein afterwards. Hunger disturbs sleep.', '', 'w-nach'],
  ['e07', 'erh', '', 'Anhaltend schlechte Leistung, Schlafprobleme und Lustlosigkeit können Zeichen von Übertraining sein. Dann lieber ein paar Tage Pause.', 'Persistently poor performance, sleep problems and low motivation can be signs of overtraining. Better take a few days off.', 'meeu13', 'w-erh'],
  ['e08', 'erh', 'd:rest', 'Lockere Bewegung am Ruhetag, etwa Spazierengehen, fördert die Erholung mehr als den ganzen Tag zu sitzen.', 'Light movement on a rest day, such as walking, helps recovery more than sitting all day.', '', 'w-erh'],
  ['e09', 'erh', '', 'Alkohol am Abend verschlechtert Schlafqualität und Regeneration. Nach harten Tagen besser verzichten.', 'Alcohol in the evening worsens sleep quality and recovery. Better skip it after hard days.', 'barnes14', 'w-erh'],
  ['e10', 'erh', 'd:rest,rec', 'Mobilität am Ruhetag: Halte Dehnungen 30 bis 60 Sekunden. Vor harten Einheiten lieber dynamisch mobilisieren.', 'Mobility on rest days: hold stretches for 30 to 60 seconds. Before hard sessions, prefer dynamic mobilisation.', 'behm16', ''],
  ['e11', 'erh', '', 'Stress im Alltag zählt mit. In anstrengenden Wochen lieber eine Einheit lockerer fahren als die Erholung zu verlieren.', 'Everyday stress counts too. In demanding weeks, better ride one session easier than lose recovery.', '', 'w-erh'],
  ['e12', 'erh', 'd:post', 'Nach dem Event: Ein, zwei Tage nur locker oder gar nicht fahren. Der Körper braucht Zeit, die Speicher wieder zu füllen.', 'After the event: ride only easy or not at all for a day or two. Your body needs time to refill its stores.', '', 'w-erh'],
  ['e13', 'erh', '', 'Morgens ein höherer Ruhepuls als sonst ist ein einfaches Signal für Müdigkeit oder einen beginnenden Infekt.', 'A higher-than-usual resting heart rate in the morning is a simple signal of fatigue or an approaching infection.', '', 'w-erh'],
  ['e14', 'erh', 'd:rest', 'Ruhetage sind keine verlorenen Tage. Ohne sie bleibt die Anpassung an das Training aus.', 'Rest days are not lost days. Without them, adaptation to training does not happen.', '', 'w-erh'],
  ['e15', 'erh', 's:w', 'Im Winter kommen viele Infekte. Händewaschen, genug Schlaf und keine harten Einheiten bei ersten Anzeichen helfen.', 'Winter brings many infections. Washing hands, enough sleep and no hard sessions at the first signs help.', '', 'w-erh'],
  ['e16', 'erh', '', 'Bei Fieber oder Beschwerden unterhalb des Halses: kein Training. Erst wenn du einen Tag fieberfrei bist, locker beginnen.', 'With fever or symptoms below the neck: no training. Only start easy once you have been fever-free for a day.', '', 'w-erh'],
  ['e17', 'erh', 'd:long,int', 'Beine hochlegen nach langen Einheiten tut gut. Wichtiger sind aber Essen, Trinken und Schlaf.', 'Putting your legs up after long sessions feels good. Food, fluids and sleep matter more though.', '', 'w-nach'],
  ['e18', 'erh', 's:w', 'Wenig Sonne im Winter: Ein Vitamin-D-Mangel ist bei Sportlern häufig. Lass den Wert bei Bedarf ärztlich prüfen.', 'Little sun in winter: vitamin D deficiency is common in athletes. Have your level checked by a doctor if needed.', 'vit_d', 'w-supp'],
  /* ---- Ernährung und Trinken ---- */
  ['n01', 'ern', 'd:int,long', 'Iss 1 bis 4 Stunden vor einer harten oder langen Einheit eine kohlenhydratreiche Mahlzeit.', 'Eat a carbohydrate-rich meal 1 to 4 hours before a hard or long session.', 'acsm16', 'w-vor'],
  ['n02', 'ern', 'd:long', 'Bei 1 bis 2,5 Stunden reichen meist 30 bis 60 g Kohlenhydrate pro Stunde. Bei längeren Fahrten bis 90 g.', 'For 1 to 2.5 hours, 30 to 60 g of carbohydrates per hour is usually enough. On longer rides, up to 90 g.', 'jeu14', 'w-waehrend'],
  ['n03', 'ern', 'd:long', 'Über 60 g Kohlenhydrate pro Stunde nimmt der Körper besser auf, wenn Glukose und Fruktose kombiniert sind.', 'Above 60 g of carbohydrates per hour, your body absorbs them better when glucose and fructose are combined.', 'jeu14', 'w-waehrend'],
  ['n04', 'ern', 'd:long', 'Iss ab Minute 20 regelmäßig, nicht erst bei Hunger. Kleine Portionen alle 20 bis 30 Minuten.', 'Eat regularly from minute 20, not only when hungry. Small portions every 20 to 30 minutes.', 'jeu14', 'w-waehrend'],
  ['n05', 'ern', 'd:int,long,race', 'Nach harten Einheiten Eiweiß: etwa {eiw} pro Mahlzeit, verteilt über den Tag alle 3 bis 4 Stunden.', 'Protein after hard sessions: about {eiw} per meal, spread across the day every 3 to 4 hours.', 'issn17', 'w-nach'],
  ['n06', 'ern', 'd:rest', 'Auch am Ruhetag: Eiweiß über den Tag verteilt, etwa {eiw} pro Mahlzeit, unterstützt die Erholung.', 'Even on rest days, protein spread over the day, about {eiw} per meal, supports recovery.', 'issn17', 'w-alltag'],
  ['n07', 'ern', '', 'Sportler brauchen etwa 1,2 bis 2,0 g Eiweiß pro kg Körpergewicht und Tag.', 'Athletes need about 1.2 to 2.0 g of protein per kg body weight per day.', 'acsm16', 'w-alltag'],
  ['n08', 'ern', 'd:int,long', 'Trinke 2 bis 4 Stunden vor dem Training etwa {fl}. Dann bleibt Zeit, Überschüssiges wieder loszuwerden.', 'Drink about {fl} 2 to 4 hours before training. That leaves time to get rid of the excess.', 'acsm07', 'w-vor'],
  ['n09', 'ern', 'd:long,race', 'Mehr als 2 % Gewichtsverlust durch Schwitzen kann die Ausdauerleistung senken. Trink unterwegs nach Plan.', 'Losing more than 2% of body weight through sweat can reduce endurance performance. Drink to a plan on the ride.', 'acsm07', 'w-waehrend'],
  ['n10', 'ern', 'wx:hot', 'Heute wird es warm: Wiege dich vor und nach der Fahrt. Jedes Kilo weniger entspricht etwa einem Liter Schweiß.', 'It will be warm today: weigh yourself before and after the ride. Every kilo lost is roughly a litre of sweat.', 'acsm07', 'w-waehrend'],
  ['n11', 'ern', 'wx:hot', 'Salz geht mit dem Schweiß verloren, bei manchen Menschen sehr viel. Bei langen, heißen Fahrten Sportgetränk statt Wasser.', 'Salt is lost in sweat, a lot for some people. On long, hot rides, choose sports drink over water.', 'baker17', 'w-waehrend'],
  ['n12', 'ern', 'd:long', 'Trainiere die Verpflegung: Der Darm gewöhnt sich an höhere Kohlenhydratmengen, wenn du sie regelmäßig übst.', 'Train your fuelling: the gut adapts to higher carbohydrate amounts if you practise them regularly.', 'jeu17', 'w-waehrend'],
  ['n13', 'ern', 'd:base,rec', 'An lockeren Tagen brauchst du weniger Kohlenhydrate als an harten. Iss nach Bedarf, nicht nach Plan des Vortags.', 'On easy days you need fewer carbohydrates than on hard ones. Eat to demand, not to yesterday’s plan.', 'burke11', 'w-alltag'],
  ['n14', 'ern', 'd:int', 'Harte Tage brauchen Energie: Je nach Umfang 5 bis 10 g Kohlenhydrate pro kg Körpergewicht am Tag.', 'Hard days need energy: depending on volume, 5 to 10 g of carbohydrates per kg body weight per day.', 'burke11', 'w-alltag'],
  ['n15', 'ern', 'd:ev7', 'Vor langen Events lohnt Kohlenhydratladen: 36 bis 48 Stunden vorher 10 bis 12 g pro kg und Tag.', 'Before long events, carb loading pays off: 10 to 12 g per kg per day for 36 to 48 hours beforehand.', 'burke11', 'w-race'],
  ['n16', 'ern', 'd:ev7', 'Beim Kohlenhydratladen ballaststoffarm essen: Weißbrot, Reis, Nudeln. Das schont den Magen am Renntag.', 'Eat low-fibre food while carb loading: white bread, rice, pasta. It spares your stomach on race day.', '', 'w-race'],
  ['n17', 'ern', 'd:race', 'Renntag: Frühstücke 3 bis 4 Stunden vor dem Start, etwas, das du kennst und gut verträgst.', 'Race day: have breakfast 3 to 4 hours before the start, something you know and tolerate well.', 'acsm16', 'w-race'],
  ['n18', 'ern', 'd:race,ev7', 'Koffein kann die Ausdauerleistung verbessern: 3 bis 6 mg pro kg etwa eine Stunde vor dem Start. Vorher im Training testen.', 'Caffeine can improve endurance performance: 3 to 6 mg per kg about an hour before the start. Test it in training first.', 'guest21', 'w-supp'],
  ['n19', 'ern', 'd:int,long', 'Nach dem Training die Speicher auffüllen: in den ersten Stunden etwa 1 g Kohlenhydrate pro kg und Stunde, wenn die nächste harte Einheit bald folgt.', 'Refill your stores after training: about 1 g of carbohydrates per kg per hour in the first hours if the next hard session is soon.', 'acsm16', 'w-nach'],
  ['n20', 'ern', '', 'Zu wenig Energie über längere Zeit schadet Hormonen, Knochen und Leistung (RED-S). Abnehmen nie in der harten Trainingsphase.', 'Too little energy over a long time harms hormones, bones and performance (RED-S). Never diet during hard training phases.', 'mount18', 'w-energie'],
  ['n21', 'ern', '', 'Heller Urin ist ein einfaches Zeichen für gute Flüssigkeitsversorgung. Sehr dunkler Urin: mehr trinken.', 'Pale urine is a simple sign of good hydration. Very dark urine: drink more.', 'hydration_urine', 'w-alltag'],
  ['n22', 'ern', 'd:long', 'Neben Gels: Reiskuchen, Bananen und belegte Brote sind gute Verpflegung für lange, lockere Fahrten.', 'Besides gels, rice cakes, bananas and sandwiches make good food for long, easy rides.', '', 'w-waehrend'],
  ['n23', 'ern', 'd:int', 'Vor kurzen, harten Einheiten keine große, fettreiche Mahlzeit. Sie liegt schwer im Magen.', 'No big, fatty meal before short, hard sessions. It sits heavily in the stomach.', '', 'w-vor'],
  ['n24', 'ern', 'd:base', 'Grundlage auf nüchternen Magen ist kein Muss. Für gute Trainingsqualität lieber vorher eine Kleinigkeit essen.', 'Fasted endurance riding is not a must. For good training quality, better eat something small beforehand.', '', 'w-vor'],
  ['n25', 'ern', '', 'Wiege Verpflegung nicht nur ab, teste sie. Was im Training nicht funktioniert, funktioniert im Rennen erst recht nicht.', 'Do not just plan your fuelling, test it. What does not work in training works even less in a race.', '', 'w-race'],
  ['n26', 'ern', 's:s', 'Im Sommer schneller Durst: Nimm auf langen Fahrten zwei Flaschen mit und plane Nachfüllstopps.', 'Thirst comes quickly in summer: take two bottles on long rides and plan refill stops.', '', 'w-waehrend'],
  ['n27', 'ern', 'd:str', 'Nach dem Krafttraining Eiweiß: etwa {eiw} innerhalb von ein, zwei Stunden unterstützt den Muskelaufbau.', 'Protein after strength training: about {eiw} within an hour or two supports muscle building.', 'issn17', 'w-nach'],
  ['n28', 'ern', '', 'Kreatin wirkt vor allem bei kurzen, sehr intensiven Belastungen. Für reine Ausdauer ist der Nutzen gering.', 'Creatine works mainly for short, very intense efforts. For pure endurance the benefit is small.', 'issn_cr', 'w-supp'],
  ['n29', 'ern', 'd:post', 'Nach dem Event: Iss in den ersten Stunden kohlenhydratreich und mit Eiweiß, auch wenn der Appetit fehlt.', 'After the event, eat carbohydrate-rich food with protein in the first hours, even if your appetite is missing.', '', 'w-nach'],
  ['n30', 'ern', 'd:race', 'Am Renntag nichts Neues: kein neues Gel, kein neues Getränk, kein ungewohntes Frühstück.', 'Nothing new on race day: no new gel, no new drink, no unfamiliar breakfast.', '', 'w-race'],
  /* ---- Technik ---- */
  ['k01', 'tec', 'd:base,rec', 'Die meisten Radfahrer fahren am ökonomischsten mit 80 bis 100 Umdrehungen pro Minute. Bei mehr Leistung eher höher.', 'Most cyclists ride most economically at 80 to 100 rpm. At higher power, rather higher.', 'foss04', ''],
  ['k02', 'tec', 'd:base', 'Rund treten: Denk an einen Fußabstreifer unten und ziehe die Ferse über den unteren Totpunkt.', 'Pedal in circles: think of wiping your shoes at the bottom and pull your heel through bottom dead centre.', '', ''],
  ['k03', 'tec', 'd:base,long', 'In der Kurve den äußeren Fuß unten, Gewicht auf das äußere Pedal, Blick zum Kurvenausgang.', 'In a corner, outside foot down, weight on the outside pedal, look towards the exit.', '', ''],
  ['k04', 'tec', '', 'Bremsen vor der Kurve, nicht in ihr. In der Kurve rollen lassen, dann wieder antreten.', 'Brake before the corner, not in it. Roll through the corner, then pedal again.', '', ''],
  ['k05', 'tec', 'd:long,race', 'Im Windschatten sparst du viel Kraft. In großen Feldern kann der Luftwiderstand in der Mitte auf einen Bruchteil sinken.', 'Drafting saves a lot of energy. In large bunches, drag in the middle can drop to a fraction.', 'blocken18', 'w-race'],
  ['k06', 'tec', 'd:long,race', 'In der Gruppe: gleichmäßig fahren, nicht ruckartig bremsen und Hindernisse rechtzeitig mit Handzeichen anzeigen.', 'In a group, ride smoothly, do not brake suddenly and signal obstacles in time with hand signals.', '', ''],
  ['k07', 'tec', 'd:long', 'Führungswechsel in der Gruppe: kurz und gleichmäßig führen, nicht beschleunigen, wenn du nach vorne kommst.', 'Pulls in a group: keep turns short and steady, do not accelerate when you reach the front.', '', ''],
  ['k08', 'tec', '', 'Am Berg rechtzeitig schalten, bevor der Druck aufs Pedal zu groß wird. Unter Last schalten verschleißt die Kette.', 'Shift early on climbs, before pedal pressure gets too high. Shifting under load wears the chain.', '', ''],
  ['k09', 'tec', '', 'Im Wiegetritt das Rad locker unter dir pendeln lassen und den Oberkörper ruhig halten.', 'When standing, let the bike sway loosely beneath you and keep your upper body calm.', '', ''],
  ['k10', 'tec', 'd:base', 'Locker greifen: Ein entspannter Griff am Lenker schont Unterarme, Schultern und Nacken.', 'Grip lightly: a relaxed hold on the bars spares forearms, shoulders and neck.', '', ''],
  ['k11', 'tec', 'd:base,rec', 'Übe einhändig trinken und Gänge wechseln auf ruhigen Strecken. Das macht dich in der Gruppe sicherer.', 'Practise drinking one-handed and shifting on quiet roads. It makes you safer in a group.', '', ''],
  ['k12', 'tec', '', 'Bergab: tief im Unterlenker, Pedale waagerecht, Blick weit voraus. Mehr Kontrolle, weniger Luftwiderstand.', 'Descending: low in the drops, pedals level, look far ahead. More control, less drag.', '', ''],
  ['k13', 'tec', 'd:int', 'Sprint: aus dem Sattel, Hände im Unterlenker, Rad pendeln lassen. Kurz und explosiv statt lange halb.', 'Sprint: out of the saddle, hands in the drops, let the bike sway. Short and explosive instead of long and half-hearted.', '', ''],
  ['k14', 'tec', 'lv:new', 'Klickpedale: Übe das Ein- und Ausklicken zuerst im Stehen an einer Wand, dann auf einem ruhigen Platz.', 'Clipless pedals: practise clipping in and out first standing against a wall, then in a quiet square.', '', ''],
  ['k15', 'tec', '', 'Eine gute Sitzhöhe beugt Knieschmerzen vor: Unten ist das Knie noch leicht gebeugt, etwa 25 bis 30 Grad.', 'A good saddle height prevents knee pain: at the bottom, the knee is still slightly bent, about 25 to 30 degrees.', 'bini11', ''],
  ['k16', 'tec', 'wx:wet', 'Bei Nässe: früher bremsen, Kurven weiter und aufrechter fahren, weiße Markierungen und Gullydeckel meiden.', 'In the wet: brake earlier, take corners wider and more upright, avoid white road markings and manhole covers.', '', ''],
  ['k17', 'tec', 'd:race', 'Beim Massenstart: vorne einordnen, die ersten Kilometer ruhig bleiben und Abstand zum Vordermann halten.', 'At a mass start, line up near the front, stay calm in the first kilometres and keep a gap to the rider ahead.', '', 'w-race'],
  ['k18', 'tec', '', 'Atme tief in den Bauch, besonders an Anstiegen. Flache, schnelle Atmung macht unruhig.', 'Breathe deeply into your belly, especially on climbs. Shallow, fast breathing makes you tense.', '', ''],
  ['k19', 'tec', 'd:int', 'Bei Schwellenintervallen hilft eine etwas höhere Trittfrequenz, die Beine zu entlasten.', 'In threshold intervals, a slightly higher cadence helps take load off your legs.', '', 'w-zonen'],
  ['k20', 'tec', 'd:long', 'Wechsle auf langen Fahrten öfter die Griffposition. Das entlastet Hände, Nacken und Rücken.', 'Change your hand position often on long rides. It relieves hands, neck and back.', '', ''],
  /* ---- Material und Pflege ---- */
  ['m01', 'mat', '', 'Prüfe vor jeder Fahrt den Reifendruck. Zu wenig Luft erhöht das Pannenrisiko, zu viel kostet Grip.', 'Check tyre pressure before every ride. Too little air raises the risk of flats, too much costs grip.', '', ''],
  ['m02', 'mat', 'wx:wet', 'Nach Regenfahrten Kette abwischen und neu ölen. Sonst rostet sie schnell und verschleißt.', 'After wet rides, wipe and re-oil the chain. Otherwise it rusts and wears quickly.', '', ''],
  ['m03', 'mat', '', 'Miss regelmäßig die Kettenlängung. Eine rechtzeitig getauschte Kette schont Kassette und Kettenblätter.', 'Measure chain stretch regularly. A chain replaced in time spares the cassette and chainrings.', 'park', ''],
  ['m04', 'mat', '', 'Tausche die Kette bei 0,5 % Längung (11- und 12-fach) bzw. 0,75 % bei älteren Antrieben.', 'Replace the chain at 0.5% stretch (11- and 12-speed) or 0.75% on older drivetrains.', 'park', ''],
  ['m05', 'mat', 'd:rest', 'Ruhetag ist Pflegetag: Rad putzen, Kette ölen, Schrauben und Bremsbeläge prüfen.', 'Rest day is care day: clean the bike, oil the chain, check bolts and brake pads.', '', ''],
  ['m06', 'mat', '', 'Nimm immer Ersatzschlauch, Reifenheber, Pumpe oder CO₂ und ein Multitool mit.', 'Always carry a spare tube, tyre levers, a pump or CO₂ and a multitool.', '', ''],
  ['m07', 'mat', '', 'Bei Tubeless-Reifen die Dichtmilch etwa alle paar Monate prüfen. Eingetrocknete Milch dichtet nicht mehr.', 'With tubeless tyres, check the sealant every few months. Dried-out sealant no longer seals.', '', ''],
  ['m08', 'mat', '', 'Hört dein Rad sich anders an, schau nach. Knacken und Schleifen kündigen oft Verschleiß an.', 'If your bike sounds different, check it. Creaks and rubbing often announce wear.', '', ''],
  ['m09', 'mat', 'd:ev7', 'Vor dem Event: Rad ein paar Tage vorher checken lassen, nicht am Vorabend. So bleibt Zeit für Ersatzteile.', 'Before the event, have the bike checked a few days beforehand, not the evening before. That leaves time for spare parts.', '', 'w-race'],
  ['m10', 'mat', 'd:race', 'Am Renntag nichts am Rad verändern. Neue Teile und Einstellungen vorher testen.', 'Do not change anything on the bike on race day. Test new parts and settings beforehand.', '', 'w-race'],
  ['m11', 'mat', '', 'Bremsbeläge regelmäßig prüfen: Ist die Belagstärke gering, sinkt die Bremsleistung deutlich.', 'Check brake pads regularly: when the pad is thin, braking power drops noticeably.', '', ''],
  ['m12', 'mat', '', 'Zieh Schrauben an Carbonteilen nur mit Drehmomentschlüssel an. Die Werte stehen auf dem Bauteil.', 'Tighten bolts on carbon parts only with a torque wrench. The values are printed on the part.', '', ''],
  ['m13', 'mat', 's:w', 'Streusalz greift das Rad an. Nach Winterfahrten mit klarem Wasser abspülen und die Kette ölen.', 'Road salt attacks the bike. After winter rides, rinse with clear water and oil the chain.', '', ''],
  ['m14', 'mat', '', 'Lade Radcomputer, Licht und Schaltung am Vorabend. Ein leerer Akku beendet sonst die Ausfahrt.', 'Charge your bike computer, lights and electronic shifting the evening before. A flat battery can end the ride.', '', ''],
  ['m15', 'mat', 'd:long', 'Für lange Fahrten: Sattel und Hose passen? Scheuerstellen kündigen sich früh an. Sitzcreme kann helfen.', 'For long rides: do saddle and shorts fit? Chafing announces itself early. Chamois cream can help.', '', ''],
  /* ---- Mental ---- */
  ['p01', 'men', 'd:int', 'Teile harte Intervalle im Kopf in kleine Abschnitte. Nur bis zur nächsten Minute denken.', 'Split hard intervals into small chunks in your head. Only think as far as the next minute.', '', ''],
  ['p02', 'men', 'd:int,race', 'Positive Selbstgespräche („Ich schaff das“) verbesserten in einer Studie die Ausdauerleistung messbar.', 'Positive self-talk (“I can do this”) measurably improved endurance performance in a study.', 'blanch14', ''],
  ['p03', 'men', 'd:int', 'Geistige Müdigkeit macht harte Einheiten schwerer. Leg harte Intervalle nicht direkt nach einem langen Arbeitstag, wenn es anders geht.', 'Mental fatigue makes hard sessions harder. Avoid hard intervals straight after a long workday when you can.', 'marcora09', ''],
  ['p04', 'men', '', 'Setze dir Prozessziele: gleichmäßig pacen, nach Plan essen. Die erledigen sich leichter als reine Ergebnisziele.', 'Set process goals: pace evenly, eat to plan. They are easier to achieve than pure outcome goals.', '', ''],
  ['p05', 'men', 'd:ev7', 'Geh die Strecke vor dem Event im Kopf durch: Anstiege, Verpflegung, kritische Stellen. Das senkt die Nervosität.', 'Run through the course in your head before the event: climbs, feed zones, critical spots. It reduces nerves.', '', 'w-race'],
  ['p06', 'men', 'd:race', 'Nervosität am Start ist normal und zeigt, dass es dir wichtig ist. Ruhig atmen und den Plan abrufen.', 'Nerves at the start are normal and show that it matters to you. Breathe calmly and recall your plan.', '', 'w-race'],
  ['p07', 'men', '', 'Ein schlechter Trainingstag sagt wenig über deine Form. Entscheidend ist der Trend über Wochen.', 'One bad training day says little about your form. The trend over weeks is what counts.', '', ''],
  ['p08', 'men', '', 'Freu dich über Fortschritte: Schau ab und zu auf deine Bestwerte und die Formkurve.', 'Enjoy your progress: look at your best efforts and the form curve now and then.', '', ''],
  ['p09', 'men', 'd:long', 'Lange Fahrten werden leichter mit Zwischenzielen: das nächste Dorf, die nächste Verpflegung.', 'Long rides get easier with intermediate goals: the next village, the next feed stop.', '', ''],
  ['p10', 'men', 'lv:new', 'Vergleiche dich nicht mit den Zahlen anderer. Dein Weg zählt, nicht deren Zahlen.', 'Do not compare yourself with others in apps. Your path counts, not their numbers.', '', ''],
  ['p11', 'men', '', 'Motivation kommt oft erst beim Fahren. Nimm dir an zähen Tagen vor, nur zehn Minuten zu fahren.', 'Motivation often only comes once you are riding. On sluggish days, commit to riding just ten minutes.', '', ''],
  ['p12', 'men', 'd:post', 'Nach dem Event kurz zurückblicken: Was lief gut, was nimmst du mit? Dann bewusst Pause machen.', 'After the event, look back briefly: what went well, what do you take away? Then take a deliberate break.', '', ''],
  /* ---- Sicherheit ---- */
  ['x01', 'sic', '', 'Mit Helm sinkt das Risiko schwerer Kopfverletzungen bei Radunfällen deutlich, laut einer Meta-Analyse um rund zwei Drittel.', 'Wearing a helmet clearly reduces the risk of serious head injury in bike crashes, by about two thirds according to a meta-analysis.', 'olivier17', ''],
  ['x02', 'sic', '', 'Autos müssen beim Überholen innerorts mindestens 1,5 m und außerorts 2 m Abstand halten. Fahr nicht im Rinnstein.', 'Cars must keep at least 1.5 m when overtaking in town and 2 m outside town. Do not ride in the gutter.', 'stvo', ''],
  ['x03', 'sic', 's:w', 'Licht an, auch tagsüber im Winter. Am Rennrad ist eine abnehmbare Beleuchtung erlaubt, sie muss aber dabei sein, wenn es dunkel wird.', 'Lights on, even during the day in winter. Detachable lights are allowed on road bikes, but they must be fitted when it gets dark.', 'bike_light', ''],
  ['x04', 'sic', '', 'Sag jemandem, wohin du fährst und wann du zurück bist, besonders bei langen Solo-Touren.', 'Tell someone where you are riding and when you will be back, especially on long solo rides.', '', ''],
  ['x05', 'sic', '', 'Trage eine Notfallkarte oder Notfallinfos im Handy mit: Name, Kontakt, Allergien.', 'Carry an emergency card or emergency info on your phone: name, contact, allergies.', '', ''],
  ['x06', 'sic', 'd:long,race', 'In der Gruppe immer vorausschauen, nicht nur aufs Hinterrad vor dir. So siehst du Bremsungen früher.', 'In a group, always look ahead, not just at the wheel in front. That way you see braking earlier.', '', ''],
  ['x07', 'sic', 'wx:wet', 'Bei Regen sind Bremswege länger und du wirst schlechter gesehen. Helle Kleidung und Licht helfen.', 'In the rain, braking distances are longer and you are harder to see. Bright clothing and lights help.', '', ''],
  ['x08', 'sic', '', 'Fahr vorausschauend an Einmündungen: Rechne damit, übersehen zu werden.', 'Ride defensively at junctions: expect to be overlooked.', '', ''],
  ['x09', 'sic', 'd:int', 'Harte Intervalle besser auf übersichtlichen Strecken oder auf der Rolle. Im roten Bereich sinkt die Aufmerksamkeit.', 'Hard intervals are better on clear roads or indoors. In the red zone, attention drops.', '', ''],
  ['x10', 'sic', '', 'Nach einem Sturz mit Kopfanprall: Helm tauschen, auch wenn er heil aussieht, und bei Beschwerden ärztlich abklären lassen.', 'After a crash with a head impact, replace the helmet even if it looks intact, and see a doctor if you have symptoms.', '', ''],
  ['x11', 'sic', 's:s', 'Sonnencreme auch auf Nacken, Ohren und Waden. Auf langen Fahrten nachcremen.', 'Sunscreen on neck, ears and calves too. Reapply on long rides.', '', ''],
  ['x12', 'sic', 'd:race', 'Im Rennen gilt die Straßenverkehrsordnung, wenn die Strecke nicht gesperrt ist. Halte dich an die Hinweise der Veranstalter.', 'Traffic rules apply in a race unless the course is closed. Follow the organisers’ instructions.', '', 'w-race'],
  /* ---- Wetter und Kleidung ---- */
  ['w01', 'wet', 'wx:cold', 'Kalt heute: Zwiebelprinzip statt einer dicken Jacke. Lieber leicht frösteln beim Start als nach kurzer Zeit schwitzen.', 'Cold today: layers instead of one thick jacket. Better slightly chilly at the start than sweating shortly after.', '', ''],
  ['w02', 'wet', 'wx:cold', 'Hände und Füße kühlen zuerst aus. Überschuhe und warme Handschuhe machen bei Kälte den größten Unterschied.', 'Hands and feet cool first. Overshoes and warm gloves make the biggest difference in the cold.', 'coldex', ''],
  ['w03', 'wet', 'wx:cold', 'Bei Kälte vor harten Intervallen länger einfahren. Kalte Muskeln leisten weniger.', 'In the cold, warm up longer before hard intervals. Cold muscles perform worse.', 'warmup', ''],
  ['w04', 'wet', 'wx:hot', 'Hitze: Fahr früh am Morgen und plane die Intensität etwas niedriger. Der Puls liegt bei gleicher Leistung höher.', 'Heat: ride early in the morning and plan slightly lower intensity. Heart rate is higher at the same power.', '', ''],
  ['w05', 'wet', 'wx:hot', 'An Hitze gewöhnt sich der Körper in etwa 10 bis 14 Tagen mit regelmäßigem Training in der Wärme.', 'The body adapts to heat in about 10 to 14 days of regular training in warm conditions.', 'periard15', ''],
  ['w06', 'wet', 'wx:wet', 'Regen: Eine leichte Regenjacke und Schutzbleche machen die Fahrt deutlich angenehmer.', 'Rain: a light rain jacket and mudguards make the ride much more pleasant.', '', ''],
  ['w07', 'wet', 's:w', 'Winter: Ein Buff oder eine dünne Mütze unter dem Helm halten viel Wärme. Über den Kopf geht viel Wärme verloren.', 'Winter: a buff or thin cap under the helmet keeps a lot of warmth in.', '', ''],
  ['w08', 'wet', '', 'Wind von vorn auf dem Hinweg ist besser als auf dem Rückweg, wenn du schon müde bist.', 'A headwind on the way out is better than on the way back, when you are already tired.', '', ''],
  ['w09', 'wet', 's:w', 'Nasse Kleidung kühlt stark aus. Nimm auf kühlen Fahrten eine Windweste für Abfahrten und Pausen mit.', 'Wet clothing chills you fast. On cool rides, take a wind vest for descents and stops.', '', ''],
  ['w10', 'wet', 's:s', 'Helle, luftige Trikots und ein guter Helm mit Belüftung helfen bei Wärme mehr als weniger Kleidung.', 'Light, airy jerseys and a well-ventilated helmet help more in the heat than wearing less.', '', ''],
  ['w11', 'wet', '', 'Unter „Kleidung“ bei der heutigen Einheit zeigt die App, was du bei diesem Wetter anziehen solltest.', 'Under “Clothing” for today’s session, the app shows what to wear in this weather.', '', ''],
  ['w12', 'wet', 'wx:cold', 'Bergab wird es schnell kalt. Für Abfahrten eine Jacke griffbereit in der Trikottasche.', 'It gets cold quickly on descents. Keep a jacket handy in your jersey pocket for downhills.', '', ''],
  /* ---- Event und Renntag ---- */
  ['v01', 'evt', 'd:ev7', 'Die letzte Woche vor dem Event: Umfang runter, ein paar kurze, schnelle Reize behalten. Nichts nachholen.', 'The last week before the event: volume down, keep a few short, fast efforts. Do not try to catch up.', 'bosq07', 'w-race'],
  ['v02', 'evt', 'd:ev7', 'Pack deine Tasche zwei Tage vorher mit Checkliste: Startnummer, Verpflegung, Ersatzschlauch, Kleidung für jedes Wetter.', 'Pack your bag two days before with a checklist: race number, food, spare tube, clothes for any weather.', '', 'w-race'],
  ['v03', 'evt', 'd:ev7', 'Schau dir die Strecke vorher an: Wo sind die Anstiege, Verpflegungsstellen und kritischen Abfahrten?', 'Look at the course beforehand: where are the climbs, feed stations and critical descents?', '', 'w-race'],
  ['v04', 'evt', 'd:race', 'Fahr die ersten Kilometer bewusst ruhig und iss früh. Die Kraft brauchst du hinten raus.', 'Ride the first kilometres deliberately easy and eat early. You will need the strength later on.', '', 'w-race'],
  ['v05', 'evt', 'd:race', 'Pacing nach Plan: An Anstiegen nicht über deine Grenze, im Flachen im Windschatten bleiben.', 'Pace to plan: do not go beyond your limit on climbs, stay in the draft on the flat.', '', 'w-race'],
  ['v06', 'evt', 'd:race', 'Sei rechtzeitig am Start: Startnummer abholen, Toilette, kurz einfahren. Hektik kostet Kraft.', 'Arrive at the start in good time: collect your number, toilet, short warm-up. Rushing costs energy.', '', 'w-race'],
  ['v07', 'evt', 'd:ev7', 'Am Vortag kurz locker fahren mit zwei, drei kurzen Steigerungen. Das macht die Beine wach.', 'The day before, ride easy for a short while with two or three short efforts. It wakes up your legs.', '', 'w-race'],
  ['v08', 'evt', 'd:ev7', 'Schlaf in der Nacht vor dem Rennen ist oft unruhig. Wichtiger ist der Schlaf zwei Nächte vorher.', 'Sleep the night before a race is often restless. Sleep two nights before matters more.', '', 'w-race'],
  ['v09', 'evt', 'd:race', 'Verpflegung im Rennen: Iss, bevor du Hunger hast, und trink an jeder Verpflegungsstelle.', 'Fuelling in the race: eat before you are hungry and drink at every feed station.', '', 'w-race'],
  ['v10', 'evt', 'd:post', 'Tag nach dem Event: lockere Bewegung, viel essen und trinken. Muskelkater ist normal und vergeht in ein paar Tagen.', 'The day after the event: light movement, eat and drink plenty. Muscle soreness is normal and passes in a few days.', '', 'w-erh'],
  ['v11', 'evt', 'd:ev7', 'Vor dem Event kein neues Material und keine neue Sitzposition. Alles muss im Training erprobt sein.', 'No new equipment or new position before the event. Everything must be tested in training.', '', 'w-race'],
  ['v12', 'evt', 'd:race', 'Zieh dich für den Start lieber etwas wärmer an und lege eine Schicht in der ersten Stunde ab.', 'Dress a bit warmer for the start and take off a layer in the first hour.', '', 'w-race'],
  ['v13', 'evt', 'd:ev7', 'Plane die Anreise so, dass du am Vortag ankommst und Zeit für die Startunterlagen hast.', 'Plan your travel so you arrive the day before and have time to collect your race pack.', '', 'w-race'],
  ['v14', 'evt', 'd:post', 'Nach einem großen Event folgt eine kurze Übergangszeit. Gönn dir Abwechslung, bevor du das nächste Ziel planst.', 'After a big event comes a short transition period. Enjoy some variety before planning your next goal.', '', 'w-erh'],
  ['v15', 'evt', 'ph:peak', 'Teste in der Spitzenphase einmal alles wie am Renntag: Frühstück, Kleidung, Verpflegung und Pacing.', 'In the peak phase, test everything once as on race day: breakfast, clothing, fuelling and pacing.', '', 'w-race'],
  ['v16', 'evt', 'd:race', 'Wenn es im Rennen nicht läuft: Tempo rausnehmen, essen, trinken. Viele Krisen gehen vorbei.', 'If the race is not going well, ease off, eat and drink. Many crises pass.', '', 'w-race']
];
const TIP_CAT = {trn:'Training', erh:'Erholung', ern:'Ernährung', tec:'Technik', mat:'Material', men:'Kopfsache', sic:'Sicherheit', wet:'Wetter', evt:'Event'};
/* Tags eines Tipps als Objekt {d:[...], ph:[...], …} */
const tipTags = t => { const o = {}; String(t[2] || '').split(/\s+/).filter(Boolean).forEach(x => { const [k, v] = x.split(':'); o[k] = (v || '').split(',').filter(Boolean); }); return o; };
/* Tageskontext: Tagesart, Phase, Jahreszeit, Wetter, Erfahrung */
function tipCtx(day){
  const p = S.p, i = todayIdx(), x = (S.plan || [])[i] || {}, d = [];
  if (!x.m) d.push('rest'); else if (x.t === 'rec' || x.t === 'com') d.push('rec'); else if (x.t === 'base') d.push('base'); else if (HARD.includes(x.t) || x.t === 'test') d.push('int'); else if (x.t === 'long') d.push('long'); else if (x.t === 'race') d.push('race');
  try { if (strMap && strMap[i]) d.push('str'); } catch (e) { elog(e); }
  try { const ev = efList(p).map(q => q.date); const dd = ev.map(e => Math.round((dOnly(e) - dOnly(day)) / 864e5));
    if (dd.some(n => n === 0)) d.push('race'); if (dd.some(n => n >= 1 && n <= 7)) d.push('ev7'); if (dd.some(n => n === -1)) d.push('post'); } catch (e) { elog(e); }
  let ph = null; try { const P = phases(p).find(q => S.wk >= q.from && S.wk <= q.to); ph = P ? P.key : null; } catch (e) { elog(e); }
  const mo = dOnly(day).getMonth(), s = [10, 11, 0, 1].includes(mo) ? 'w' : [5, 6, 7].includes(mo) ? 's' : '';
  const wx = []; try { const w = wxDay(day, i, x); if (w && w.src === 'api') { if (w.tmax >= 25) wx.push('hot'); if (w.tmin <= 5) wx.push('cold'); if (w.wet) wx.push('wet'); } } catch (e) { elog(e); }
  return {d, ph, s, wx, lv:p.lvl === 'new' ? 'new' : p.lvl === 'amb' ? 'amb' : ''};
}
/* Passt ein Tipp? Jede angegebene Tag-Art muss treffen; Wert = Anzahl getroffener Tag-Arten (spezifischer = besser) */
function tipFit(t, c){
  const g = tipTags(t); let sc = 0;
  for (const [k, vs] of Object.entries(g)) { const have = k === 'd' ? c.d : k === 'ph' ? [c.ph] : k === 's' ? [c.s] : k === 'wx' ? c.wx : k === 'lv' ? [c.lv] : [];
    if (!vs.some(v => have.includes(v))) return -1; sc++; }
  return sc;
}
const tipHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
/* Tipp für einen Tag wählen (rein, ohne zu speichern). st = {seen:{id:Tag}, off:[ids]} */
function tipChoose(c, day, st, skip){
  const seen = (st && st.seen) || {}, off = new Set((st && st.off) || []), age = id => seen[id] ? Math.round((dOnly(day) - dOnly(seen[id])) / 864e5) : Infinity;
  const L = TIPS.map(t => ({t, f:tipFit(t, c)})).filter(o => o.f >= 0 && !off.has(o.t[0]) && !(skip || []).includes(o.t[0]));
  const fresh = L.filter(o => !seen[o.t[0]]), old = L.filter(o => seen[o.t[0]] && age(o.t[0]) >= 60);
  const pool = fresh.length ? fresh : old.sort((a, b) => age(b.t[0]) - age(a.t[0])).slice(0, 8);
  if (!pool.length) return null;
  pool.sort((a, b) => b.f - a.f || tipHash(a.t[0] + day) - tipHash(b.t[0] + day));
  return pool[0].t;
}
/* Tipp des Tages: bleibt den Tag über gleich, „Nächster Tipp“ wählt einen anderen. Gespeichert in S.tips. */
function tipToday(next){
  const day = iso(0); S.tips = S.tips && typeof S.tips === 'object' ? S.tips : {}; const st = S.tips; st.seen = st.seen || {};
  if (!next && st.day === day && st.id && TIPS.some(t => t[0] === st.id)) return TIPS.find(t => t[0] === st.id);
  const t = tipChoose(tipCtx(day), day, st, next ? [st.id] : []); if (!t) return null;
  st.day = day; st.id = t[0]; st.seen[t[0]] = day;
  if (!next) setTimeout(() => { try { save(); } catch (e) { elog(e); } }, 0); /* gezeigt = gespeichert, auch ohne weitere Aktion */
  return t;
}
/* Platzhalter mit dem Körpergewicht ausrechnen */
function tipText(t, en){
  const kg = kgOf(S.p), a = Math.round(kg * .3), b = Math.round(kg * .4), f1x = Math.round(kg * 5 / 50) * 50, f2x = Math.round(kg * 7 / 50) * 50;
  return String(en ? t[4] : t[3]).replace('{eiw}', en ? `${a} to ${b} g` : `${a} bis ${b} g`).replace('{fl}', en ? `${f1x} to ${f2x} ml` : `${f1x} bis ${f2x} ml`);
}
function tipNext(){ tipToday(true); save(); render(); }
function tipHide(){ const st = S.tips || {}; if (st.id) { st.off = [...new Set([...(st.off || []), st.id])]; tipToday(true); save(); } render(); }
