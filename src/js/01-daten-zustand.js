/* ---------- Daten & Zustand ---------- */
const K = 'kurbelwerk.v2';
/* Lokales Kalenderdatum (F-02). Mittag als Anker, damit Sommer-/Winterzeit keinen Tag verschiebt. */
const iso = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + (n || 0)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
/* Reines Datum (JJJJ-MM-TT) als lokale Mittagszeit lesen, nie als UTC-Mitternacht (F-13) */
const dOnly = x => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x) ? new Date(x + 'T12:00:00') : new Date(x);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAYS = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
const todayIdx = () => (new Date().getDay() + 6) % 7;

const TYPES = {
  com:  {l:'Pendeln',IF:.55,c:'#2dd4bf'},
  rest: {l:'Ruhetag',   IF:0,   c:'#8d9aa8'},
  rec:  {l:'Rekom',     IF:.55, c:'#34d399'},
  base: {l:'Grundlage', IF:.66, c:'#62c7ff'},
  long: {l:'Long Ride',IF:.70,c:'#818cf8'},
  sst:  {l:'Sweet Spot',IF:.89, c:'#fbbf24'},
  thr:  {l:'Schwelle',  IF:.96, c:'#fb923c'},
  vo2:  {l:'VO2max',    IF:1.0, c:'#f87171'},
  race: {l:'Zwischenevent', IF:.85, c:'#0b1c49'},
  test: {l:'Fitness-Check', IF:.88, c:'#e11d74'}
};
const HARD = ['sst','thr','vo2'];

