// Prüft, ob die Rezeptwerte und Faktoren in index.html alle Tropfenzahlen des Lotus-Rechners reproduzieren.
// Aufruf:  node test/lotus-check.js   (oder: npm test)
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const data = require('./lotus-data.json');

const grab = (re, name) => {
  const m = html.match(re);
  if (!m) { console.error('Nicht gefunden in index.html:', name); process.exit(2); }
  return m[1];
};
const TPL = new Function('return ' + grab(/const TPL=(\[\[.*?\]\]);/, 'TPL'))();
const D = new Function('return ' + grab(/const D=(\{.*?\});/, 'D'))();
const rd = new Function('return ' + grab(/const rd=(.*?);\n/, 'rd'))();
const keys = ['mg', 'ca', 'na', 'k'];

let total = 0, bad = 0;
for (const [name, droppers] of Object.entries(data.rezepte)) {
  const t = TPL.find(x => x[0] === name);
  if (!t) { console.error('Vorlage fehlt:', name); process.exit(2); }
  for (const [dropper, rows] of Object.entries(droppers)) {
    rows.forEach((row, j) => row.forEach((expected, i) => {
      if (expected === null) return;
      total++;
      const got = rd(t[i + 1] / 100 * D[dropper][keys[i]] * data.volumen_liter[j]);
      if (got !== expected) {
        bad++;
        console.log(`ABWEICHUNG ${name} / ${dropper} / ${data.volumen_liter[j]} L / ${keys[i]}: Lotus ${expected}, App ${got}`);
      }
    }));
  }
}
console.log(`${total} Werte geprüft, ${bad} Abweichungen.`);
process.exit(bad ? 1 : 0);
