// Integrationstest: startet die App in einem simulierten Browser (jsdom) und prueft
// Speichern nach Neustart, Ansicht, Ausgangswasser, Filter/Sortierung u. a.
// Voraussetzung: npm install   (installiert jsdom)   dann: npm run test:integration
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/<link[^>]*fonts[^>]*>/g, '');
const errors = [];
let ok = true;
const chk = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) ok = false; };

function boot(store) {
  return new JSDOM(html, {
    url: 'https://example.github.io/wasserrezepte/', runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      for (const [k, v] of Object.entries(store)) w.localStorage.setItem(k, v);
      w.matchMedia = () => ({ matches: false });
      w.Element.prototype.animate = function () { return { onfinish: null }; };
      w.document.elementsFromPoint = () => [];
      w.scrollTo = () => {}; w.scrollBy = () => {}; w.alert = () => {}; w.confirm = () => true; w.requestAnimationFrame = () => 0;
      w.addEventListener('error', e => errors.push(e.message));
    },
  }).window;
}
const dump = w => { const o = {}; for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); o[k] = w.localStorage.getItem(k); } return o; };

let w = boot({}); const ev = s => w.eval(s);
chk(ev('R.length') == 3, 'Start 1: drei Vorlagen');
ev("document.querySelector('#fb').click()"); ev("document.querySelector('[data-n=\"-1\"]').click()");
ev("(()=>{const r=R.find(x=>x.id==cur);r.name='Mein Test';r.rating=3;r.notes='Notiz!';r.methods=['V60','Chemex'];r.ppm.mg=30;r.ppm.ca=40;save()})()");
let st = dump(w);
for (const n of [2, 3]) {
  w = boot(st);
  const d = JSON.parse(ev("JSON.stringify(R.find(x=>x.name=='Mein Test')||null)"));
  chk(d && d.rating == 3 && d.notes == 'Notiz!' && d.methods.join() == 'V60,Chemex', `Start ${n}: Rezept mit Bewertung, Notiz und Methoden ist noch da`);
  st = dump(w);
}
ev("S.view='grid';save()"); st = dump(w); w = boot(st);
chk(ev('S.view') == 'grid' && ev('window.pv.vw') == 1 && !!w.document.querySelector('.gv'), 'Raster-Ansicht bleibt gespeichert und wird direkt gezeigt');
ev("document.querySelector('.rc[data-o]').click()");
chk(!w.document.querySelector('#bk'), 'Rezeptseite hat kein X mehr');
ev("document.querySelector('[data-sk=\"mg\"]').value='20';document.querySelector('[data-sk=\"mg\"]').dispatchEvent(new Event('input'))");
ev("document.querySelector('#wn').value='Leitungswasser';document.querySelector('#wsb').click()");
chk(ev('S.waters.length') == 1 && ev('R.find(x=>x.id==cur).wid') == ev('S.waters[0].id'), 'Eigenes Ausgangswasser gespeichert und im Rezept gewaehlt');
st = dump(w); w = boot(st); chk(ev('S.waters.length') == 1, 'Ausgangswasser ueberlebt Neustart');
ev("S.vf={sort:'alk_asc',meth:[],amin:'',amax:''}");
const asc = JSON.parse(ev('JSON.stringify(vlist().map(r=>Math.round(calc(r).kh)))'));
chk(asc.every((v, i) => i == 0 || v >= asc[i - 1]), 'Sortierung nach Alkalinitaet aufsteigend');
const own = ev("R.map(r=>r.id).join()"); ev("S.vf={sort:'alk_desc',meth:[],amin:'',amax:''};render()");
chk(ev("R.map(r=>r.id).join()") == own, 'Eigene Reihenfolge bleibt bei Sortierung erhalten');
ev("window.sh='flt';render();document.querySelector('#frs').click()");
chk(ev('vfOn()') === false && ev("vlist().map(r=>r.id).join()") == own, 'Zuruecksetzen stellt die eigene Reihenfolge wieder her');
ev("window.sh='new';render()"); chk(w.document.querySelectorAll('[data-c]').length == ev('R.length'), 'Eigene Rezepte erscheinen in den Vorlagen');
chk(/user-scalable=no/.test(html), 'Zoom ist gesperrt');
chk(errors.length == 0, 'keine Skriptfehler' + (errors.length ? ': ' + errors.join(' | ') : ''));
process.exit(ok ? 0 : 1);
