// Prüft, ob ein gespeichertes Rezept einen Neustart der App überlebt.
// Aufruf: node test/persistence-check.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const start = script.indexOf('const ld=');
const end = script.indexOf('let cur=null');
const chunk = script.slice(start, end);

const store = new Map(); // gemeinsamer "Browser-Speicher" über mehrere Starts
const start_app = () => {
  const ctx = vm.createContext({
    Math, JSON, console,
    localStorage: {
      getItem: k => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
    },
  });
  return vm.runInContext(chunk + ';({R:R,S:S})', ctx);
};

// Start 1: eigenes Rezept anlegen und speichern (so wie save() es macht)
const a = start_app();
a.R.unshift({ id: 'eigenes', name: 'Mein Rezept', ppm: { mg: 30, ca: 40, na: 10, k: 5 }, src: { mg: 0, ca: 0, na: 0, k: 0, cl: 0, hco3: 0 } });
store.set('wr_r', JSON.stringify(a.R));
store.set('wr_s', JSON.stringify(a.S));

// Starts 2 und 3: Rezept muss noch da sein
let ok = true;
for (const n of [2, 3]) {
  const b = start_app();
  const found = b.R.some(r => r.id === 'eigenes');
  console.log(`Start ${n}: ${b.R.length} Rezepte, eigenes Rezept ${found ? 'vorhanden' : 'FEHLT'}`);
  if (!found) ok = false;
  store.set('wr_r', JSON.stringify(b.R));
  store.set('wr_s', JSON.stringify(b.S));
}
console.log(ok ? 'OK: Rezepte bleiben erhalten.' : 'FEHLER: Rezepte gehen beim Neustart verloren.');
process.exit(ok ? 0 : 1);
