// Integrationstest: startet die App in einem simulierten Browser (jsdom) und prueft
// Speichern nach Neustart, Ansicht, Basiswasser, Filter/Sortierung u. a.
// Voraussetzung: npm install   (installiert jsdom)   dann: npm run test:integration
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/<link[^>]*fonts[^>]*>/g, '');
const errors = [];
let ok = true;
const chk = (c, m) => { console.log((c ? 'OK   ' : 'FEHLER ') + m); if (!c) ok = false; };

function boot(store, url) {
  return new JSDOM(html, {
    url: url || 'https://example.github.io/wasserrezepte/', runScripts: 'dangerously', pretendToBeVisual: true,
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
ev("(()=>{const r=R.find(x=>x.id==cur);r.name='Mein Test';r.rating=3;r.notes='Notiz!';r.methods=['Filter','AeroPress'];r.ppm.mg=30;r.ppm.ca=40;save()})()");
let st = dump(w);
for (const n of [2, 3]) {
  w = boot(st);
  const d = JSON.parse(ev("JSON.stringify(R.find(x=>x.name=='Mein Test')||null)"));
  chk(d && d.rating == 3 && d.notes == 'Notiz!' && d.methods.join() == 'Filter,AeroPress', `Start ${n}: Rezept mit Bewertung, Notiz und Methoden ist noch da`);
  st = dump(w);
}
ev("S.view='grid';save()"); st = dump(w); w = boot(st);
chk(ev('S.view') == 'grid' && ev('window.pv.vw') == 1 && !!w.document.querySelector('.gv'), 'Raster-Ansicht bleibt gespeichert und wird direkt gezeigt');
ev("document.querySelector('.rc[data-o]').click()");
chk(!w.document.querySelector('#bk'), 'Rezeptseite hat kein X mehr');
ev("document.querySelector('[data-sk=\"mg\"]').value='20';document.querySelector('[data-sk=\"mg\"]').dispatchEvent(new Event('input'))");
ev("document.querySelector('#wn').value='Leitungswasser';document.querySelector('#wsb').click()");
chk(ev('S.waters.length') == 1 && ev('R.find(x=>x.id==cur).wid') == ev('S.waters[0].id'), 'Eigenes Basiswasser gespeichert und im Rezept gewaehlt');
st = dump(w); w = boot(st); chk(ev('S.waters.length') == 1, 'Basiswasser ueberlebt Neustart');
ev("S.vf={sort:'alk_asc',meth:[],amin:'',amax:''}");
const asc = JSON.parse(ev('JSON.stringify(vlist().map(r=>Math.round(calc(r).kh)))'));
chk(asc.every((v, i) => i == 0 || v >= asc[i - 1]), 'Sortierung nach Alkalinitaet aufsteigend');
const own = ev("R.map(r=>r.id).join()"); ev("S.vf={sort:'alk_desc',meth:[],amin:'',amax:''};render()");
chk(ev("R.map(r=>r.id).join()") == own, 'Eigene Reihenfolge bleibt bei Sortierung erhalten');
ev("window.sh='flt';render();document.querySelector('#frs').click()");
chk(ev('vfOn()') === false && ev("vlist().map(r=>r.id).join()") == own, 'Zuruecksetzen stellt die eigene Reihenfolge wieder her');
ev("window.sh='new';render()"); chk(w.document.querySelectorAll('[data-c]').length == ev('R.length'), 'Eigene Rezepte erscheinen in den Vorlagen');

// --- neue Prüfungen (Runde 3)
chk(ev("S.methods.includes('Filter')&&!S.methods.includes('V60')&&!S.methods.includes('Chemex')"), 'Standardmethoden: Filter statt V60/Kalita Wave/Chemex');
ev("S.methods.push('Mein Test');save();window.sh='meth';render()");
chk(w.document.querySelectorAll('[data-m]').length == 1, 'Nur eigene Methoden haben einen Löschen-Knopf');
ev("document.querySelector('[data-m]').click()");
chk(!!w.document.querySelector('#dmy'), 'Löschen einer eigenen Methode fragt nach');
ev("document.querySelector('#dmy').click()");
chk(!ev("S.methods.includes('Mein Test')") && ev("S.methods.includes('Filter')"), 'Eigene Methode entfernt, Standardmethoden bleiben');
ev("R.forEach((r,i)=>{r.rating=i+1});S.vf={sort:'rt_desc',meth:[],amin:'',amax:''}");
const rt = JSON.parse(ev('JSON.stringify(vlist().map(r=>r.rating))'));
chk(rt.every((v, i) => i == 0 || v <= rt[i - 1]), 'Sortierung nach Bewertung absteigend');
ev("S.vf={sort:'hd_asc',meth:[],amin:'',amax:'',hmin:'',hmax:'',rmin:2}");
const hd = JSON.parse(ev('JSON.stringify(vlist().map(r=>tg(r).gh))'));
chk(hd.every((v, i) => i == 0 || v >= hd[i - 1]) && ev('vlist().every(r=>r.rating>=2)'), 'Hardness-Sortierung und Mindestbewertung');
ev("S.vf={sort:'own',meth:[],amin:'',amax:'',hmin:'',hmax:'',rmin:0};R[0].sc=true;R[0].src={mg:100,ca:0,na:0,k:0,cl:0,hco3:0};window.sh='';render()");
chk(w.document.querySelectorAll('.rc .ov').length >= 1 && /^\+\d+$/.test(w.document.querySelector('.rc .ov').textContent), 'Basiswasser über dem Ziel ist in der Übersicht als +Differenz markiert');
chk(ev('Math.round(tg(R[0]).gh)') == ev('Math.round(R[0].ppm.mg+0.929*R[0].ppm.ca)'), 'Zielwert bleibt unverändert');
ev("window.sh='new';render()");
const nm = JSON.parse(ev("JSON.stringify([...document.querySelectorAll('[data-c]')].map(b=>b.textContent))"));
chk(nm.every((v, i) => i == 0 || nm[i - 1].localeCompare(v, 'de', { sensitivity: 'base', numeric: true }) <= 0), 'Eigene Rezepte alphabetisch');
chk(!!w.document.querySelector('.sh .grab') && ev("document.documentElement.classList.contains('lk')"), 'Schließen-Balken vorhanden und Hintergrund gesperrt');

// --- Tutorial
ev("window.sh='menu';render()");
chk(!!w.document.querySelector('#ot'), 'Menü enthält „Tutorial starten“');
ev("window.sh='';render();startTut()");
chk(!!w.document.querySelector('#tut') && ev('ACT.length') == 18, 'Tutorial startet mit allen 18 Schritten');
let tg2 = 0; while (w.document.querySelector('#tut') && tg2++ < 40) w.document.querySelector('#tunx').click();
chk(!w.document.querySelector('#tut') && ev('S.tut') == 1 && ev('mode') == "list", 'Tutorial lässt sich durchklicken und merkt sich, dass es gesehen wurde');

// --- Flaschennamen nur in der Tropfen-Box englisch
ev("cur=R[0].id;mode='d';render()");
const tn = JSON.parse(ev("JSON.stringify([...document.querySelectorAll('#dp .tn')].map(e=>e.textContent))"));
chk(tn.join() == 'Magnesium,Calcium,Sodium,Potassium', 'Tropfen-Box: englische Namen wie auf den Flaschen');
chk(ev("[...document.querySelectorAll('.tg')][0].textContent").includes('Natrium'), 'Zielwerte: Namen in der eingestellten Sprache');
ev("document.querySelector('#inf').click()");
chk(!!w.document.querySelector('.ifo'), 'Info-Fenster zu den Flaschennamen öffnet');
ev("document.querySelector('.ifo button').click()");
chk(!w.document.querySelector('.ifo'), 'Info-Fenster schließt');
ev("mode='list';cur=null;render()");

// --- Duplizieren, Teilen, Importieren
ev("window.sh='';mode='list';cur=null;render()");
ev("cur=R[0].id;mode='d';render();document.querySelector('#du').click()");
chk(ev("R[0].name.endsWith('(2)')") && w.document.activeElement && w.document.activeElement.classList.contains('hn'), 'Duplizieren: neues Rezept offen, Name ausgewählt');
ev("mode='list';cur=null;render()");
const code = ev("b64e(Object.assign({},R[0],{id:undefined}))");
chk(!/[+\/=]/.test(code), 'Teilen-Link ist URL-sicher');
const link = ev("'https://example.github.io/wasserrezepte/#r='+b64e(Object.assign({},R[0],{name:'Geteilt',id:undefined,notes:'<b>x</b>'}))");
const w2 = boot({}, link);
chk(w2.eval("R.some(r=>r.name=='Geteilt')") && w2.location.hash === '', 'Link öffnen: Rezept wird gespeichert und Link bereinigt');
chk(w2.eval("R[0].ppm.mg==" + ev('R[0].ppm.mg') + "&&R[0].drop=='" + ev('R[0].drop') + "'"), 'Importiertes Rezept hat dieselben Werte');
const n0 = ev('R.length');
ev("window.sh='imp';render()");
w.document.querySelector('#imt').value = 'Schau mal: ' + link + ' Viel Spaß';
ev("document.querySelector('#imb').click()");
chk(ev('R.length') == n0 + 1 && ev("R[0].name=='Geteilt'"), 'Import per Einfügen (ganze Nachricht)');
ev("window.sh='imp';render()");
w.document.querySelector('#imt').value = 'kein rezept';
ev("document.querySelector('#imb').click()");
chk(ev('R.length') == n0 + 1 && !w.document.querySelector('#imr').hidden, 'Ungültiger Text wird abgelehnt');
chk(ev("parseShare('#r='+b64e({ppm:{mg:'x',ca:-5,na:99999,k:null},unit:'zz',drop:'evil',name:'a'.repeat(500)}))") && ev("(()=>{const r=parseShare('#r='+b64e({ppm:{mg:'x',ca:-5,na:99999,k:null},unit:'zz',drop:'evil',name:'a'.repeat(500)}));return r.ppm.mg===0&&r.ppm.ca===0&&r.ppm.na===2000&&r.unit=='l'&&r.drop=='round'&&r.name.length==60})()"), 'Import bereinigt ungültige Werte');
ev("window.sh='';mode='list';cur=null;render()");

// --- Cupping, Mülleimer, Glossar
chk(ev("S.methods.includes('Cupping')&&DM.includes('Cupping')"), 'Cupping ist Standardmethode');
ev("window.sh='';mode='list';cur=null;render();window.sh='menu';render()");
chk(!!w.document.querySelector('#otr') && !!w.document.querySelector('#og'), 'Menü enthält Mülleimer und Glossar');
ev("window.sh='';render()");
const nR = ev('R.length'), nm3 = ev('R[R.length-1].name');
ev("window.dl=R[R.length-1].id;window.sh='del';render();document.querySelector('#dy').click()");
chk(ev('R.length') == nR - 1 && ev('S.trash.length') == 1, 'Gelöschtes Rezept landet im Mülleimer');
ev("window.sh='trash';render()");
chk(w.document.querySelectorAll('[data-tr]').length == 1 && /Noch 10 Tage/.test(w.document.querySelector('.sh').textContent), 'Mülleimer zeigt Rezept mit Restzeit');
ev("document.querySelector('[data-tr]').click()");
chk(ev('R.length') == nR && ev('S.trash.length') == 0 && ev('R[0].name') == nm3, 'Wiederherstellen bringt das Rezept zurück');
ev("S.trash=[{r:JSON.parse(JSON.stringify(R[0])),t:Date.now()-11*864e5},{r:JSON.parse(JSON.stringify(R[1])),t:Date.now()-9*864e5}]");
chk(ev('purgeTrash()') === true && ev('S.trash.length') == 1, 'Nach 10 Tagen leert sich der Mülleimer selbst');
ev("S.trash=[];window.sh='gloss';render()");
chk(w.document.querySelectorAll('.gl').length >= 10, 'Glossar zeigt Begriffe');
ev("window.sh='';mode='list';cur=null;render()");

// --- Wischen zum Löschen: rote Fläche bleibt, Abbrechen / Löschen
ev("window.dl=R[0].id;window.sh='del';render()");
chk(ev("document.querySelector('.swc[data-w=\"'+R[0].id+'\"] .rc').style.transform") == 'translateX(-96px)' && ev("document.querySelector('.swc[data-w=\"'+R[0].id+'\"] .dlb').style.opacity") == '1', 'Rückfrage offen: Karte bleibt aufgeschoben, rote Fläche sichtbar');
ev("document.querySelector('#dn').click()");
chk(ev("window.sh") === '' && ev("document.querySelector('.rc').style.transform") === '', 'Abbrechen: Karte kehrt an ihren Platz zurück');
const nR2 = ev('R.length');
ev("window.dl=R[0].id;window.sh='del';render();document.querySelector('#dy').click()");
chk(ev('R.length') == nR2 - 1 && ev('S.trash.length') >= 1, 'Löschen bestätigt: Rezept entfernt und im Mülleimer');
ev("S.trash=[];window.sh='';mode='list';cur=null;render()");

// --- Rückfrage ohne Neuzeichnen der Liste
ev("window.sh='';mode='list';cur=null;render()");
ev("window.__cardEl=document.querySelector('.swc');document.querySelector('.rc').style.transform='translateX(-96px)';document.querySelector('.dlb').style.opacity=1;delOpen(document.querySelector('.swc').dataset.w)");
chk(ev("window.sh")=='del' && !!w.document.querySelector('.sh #dy') && ev("document.querySelector('.swc')===window.__cardEl"), 'Rückfrage erscheint, ohne die Liste neu zu zeichnen');
ev("document.querySelector('#dn').click()");
chk(ev("window.sh")==='' && ev("document.querySelector('.swc')===window.__cardEl") && ev("document.querySelector('.rc').style.transform")==='', 'Abbrechen ohne Neuzeichnen: dieselbe Karte schwingt zurück');

// --- Gewischtes Rezept liegt im Vordergrund
ev("window.sh='';mode='list';cur=null;render();window.dl=R[0].id;window.sh='del';render()");
chk(ev("document.querySelector('.swc[data-w=\"'+R[0].id+'\"]').style.zIndex") == '5', 'Gewischtes Rezept liegt vor den Nachbarkarten');
ev("document.querySelector('#dn').click()");
ev("window.sh='';mode='list';cur=null;render()");

// --- Filter: einklappbar, Slider, getrennte Sortierung
ev("window.sh='';mode='list';cur=null;S.vf={sort:'own',dir:'asc',meth:[],amin:'',amax:'',hmin:'',hmax:'',rmin:0,rmax:''};render();window.sh='flt';render()");
chk(w.document.querySelectorAll('.rs').length == 3 && w.document.querySelectorAll('[data-fs]').length == 5, 'Filter: drei Slider und fünf einklappbare Bereiche');
ev("document.querySelector('[data-fs=\"m\"]').click()");
chk(ev('S.fc.m') === true && w.document.querySelector('[data-fs="m"]').nextElementSibling.classList.contains('c'), 'Filterbereich lässt sich zuklappen');
ev("document.querySelector('[data-fs=\"m\"]').click()");
chk(ev('S.fc.m') === false, 'Filterbereich lässt sich wieder aufklappen');
chk(w.document.querySelectorAll('[data-sc]').length == 4 && w.document.querySelectorAll('[data-sdr]').length == 2, 'Sortierung: Kriterium und Richtung getrennt');
ev("document.querySelector('[data-sc=\"hd\"]').click()");
ev("document.querySelector('[data-sdr=\"desc\"]').click()");
chk(ev('S.vf.sort') == 'hd_desc', 'Sortierung: Hardness absteigend aus zwei getrennten Auswahlen');
ev("document.querySelector('[data-sc=\"own\"]').click()");
chk(ev('S.vf.sort') == 'own' && w.document.querySelector('[data-sdr]').classList.contains('dis'), 'Eigene Reihenfolge: Richtung ist deaktiviert');
{
  const inp = w.document.querySelectorAll('.rs[data-rk="h"] input');
  inp[0].value = '60'; inp[0].dispatchEvent(new w.Event('input')); inp[0].dispatchEvent(new w.Event('change'));
}
chk(ev('S.vf.hmin') == 60 && ev('vlist().every(r=>tg(r).gh>=60)'), 'Hardness-Slider setzt den Mindestwert und filtert');
{
  const inp = w.document.querySelectorAll('.rs[data-rk="r"] input');
  inp[1].value = '3'; inp[1].dispatchEvent(new w.Event('input')); inp[1].dispatchEvent(new w.Event('change'));
}
chk(ev('S.vf.rmax') == 3 && ev('vlist().every(r=>(r.rating||0)<=3)'), 'Bewertungs-Slider setzt den Höchstwert und filtert');
ev("document.querySelector('#frs').click()");
chk(ev('vfOn()') === false, 'Zurücksetzen leert alle Slider-Filter');
ev("window.sh='';mode='list';render()");
chk(w.document.querySelectorAll('.rc .nm .w').length >= 3, 'Rezeptnamen bestehen aus einzelnen Wörtern und dürfen umbrechen');
chk(ev("(()=>{const m=snap();vflip(m);return Object.keys(m).length>0&&Array.isArray(m[Object.keys(m)[0]].w)})()"), 'Ansichtswechsel animiert die Wörter an ihre neue Position');

// --- Fenster: Wischen
ev("window.cm=true;sel=[R[0].id,R[1].id];window.sh='cmp';render()");
ev("sheetDone()");
chk(ev('window.cm') === false && ev('sel.length') === 0 && ev('window.sh') === '', 'Schließen des Vergleichs deaktiviert den Vergleich');
const touch = (el, type, x, y) => { const e = new w.Event(type, { bubbles: true, cancelable: true }); e.touches = [{ clientX: x, clientY: y }]; el.dispatchEvent(e); };
ev("window.sh='water';render()");
{
  const sheet = w.document.querySelector('.sh');
  touch(sheet, 'touchstart', 20, 200); touch(sheet, 'touchmove', 140, 205); touch(sheet, 'touchend', 140, 205);
}
chk(ev('window.sh') == 'menu', 'Nach rechts wischen geht im Menü einen Schritt zurück');
{
  const sheet = w.document.querySelector('.sh');
  touch(sheet, 'touchstart', 20, 200); touch(sheet, 'touchmove', 140, 205); touch(sheet, 'touchend', 140, 205);
}
chk(ev('window.sh') == 'menu', 'Im Hauptmenü gibt es kein Zurück per Wischen');
ev("window.sh='';mode='list';render()");

// --- Menü: Höhe und Inhalt werden beim Wechsel animiert
ev("window.sh='';mode='list';cur=null;render();window.sh='menu';render()");
ev("window.sh='meth';render()");
chk(w.document.querySelectorAll('.sh.gs > .cpb').length == 2, 'Menüwechsel: alter Inhalt blendet aus, neuer gleitet ein');
ev("window.sh='menu';render()");
chk(w.document.querySelectorAll('.sh.gs > .cpb').length == 2, 'Zurück ins Menü wird ebenfalls animiert');
ev("window.sh='';mode='list';render()");

// --- Grafik: kein grüner Punkt, gestrichelter Ring in Grün über dem Ziel
ev("cur=R[0].id;mode='d';render()");
{
  const svg = w.document.querySelector('#ch svg').innerHTML;
  chk(!/r="14"/.test(svg) && /stroke:var\(--ac\)/.test(svg) && /stroke-dasharray="2 3"/.test(svg) && /stroke-linecap="round"/.test(svg) && !/stroke-opacity="\.25"/.test(svg), 'Grafik: grüner gestrichelter Ring, kein grüner Punkt');
  chk(svg.indexOf('r="5"') < svg.indexOf('r="7.5"'), 'Grafik: Ring liegt über dem Zielpunkt');
}
ev("mode='list';cur=null;render()");
chk(/user-scalable=no/.test(html), 'Zoom ist gesperrt');
chk(errors.length == 0, 'keine Skriptfehler' + (errors.length ? ': ' + errors.join(' | ') : ''));
process.exit(ok ? 0 : 1);
