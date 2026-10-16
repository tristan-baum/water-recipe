# Wasserrezepte

Web-App (installierbar, offlinefähig) für Mineralisierungs-Rezepte von Kaffeewasser mit den Tropfen-Konzentraten von Lotus Coffee Products. Du siehst sofort Tropfenzahl, Härte (Hardness), Alkalinität, TDS und Ionen eines Rezepts, speicherst eigene Rezepte mit Bewertung, Notizen und Brühmethoden und vergleichst Rezepte.

> Inoffizielles Projekt. Nicht mit Lotus Coffee Products verbunden. Die Rezeptwerte der drei Vorlagen (Bright and Juicy, Rao's Recipe, Ultra Light) wurden aus dem öffentlichen Rechner der Hersteller-Website abgeleitet. Keine Gewähr.

## Funktionen

- Rezepte in ppm (als CaCO₃) mit Tropfenzahl für runde und gerade Spitze, Menge in mL, l oder gal
- Ausgangswasser: Destilliertes Wasser als Voreinstellung, eigene Wasser benennen und speichern, pro Rezept anpassbar
- Hardness-/Alkalinity-Diagramm mit Soll- und Ist-Wert (Ist = mit ganzen Tropfen)
- Rezepte vergleichen, filtern (Brühmethode, Bewertung, Hardness, Alkalinität; Bereiche mit Slidern, Abschnitte einklappbar) und sortieren (Kriterium und Richtung getrennt); die eigene Reihenfolge bleibt erhalten
- Fenster von unten schließen durch Ziehen nach unten, im Menü geht es mit Wischen nach rechts einen Schritt zurück
- Standard-Brühmethoden (Filter, AeroPress, Espresso, French Press) sind fest, eigene Methoden lassen sich anlegen und löschen
- Liegt das Ausgangswasser über dem Ziel, bleibt der Zielwert stehen und die Übersicht zeigt den höheren Wert mit Pfeil
- Tutorial: startet beim ersten Öffnen, führt durch alle Funktionen und lässt sich jederzeit im Menü neu starten
- Wischen zum Löschen, langes Halten zum Umsortieren, Hell/Dunkel/Geräteeinstellung, Deutsch und Englisch

## Veröffentlichen mit GitHub Pages

1. Neues Repository anlegen (z. B. `wasserrezepte`) und alle Dateien dieses Ordners hochladen (`index.html` muss im Hauptordner liegen).
2. *Settings → Pages → Build and deployment → Deploy from a branch → `main` / `(root)`* wählen und speichern.
3. Nach ein bis zwei Minuten ist die App unter `https://DEIN-NAME.github.io/wasserrezepte/` erreichbar.
4. iPhone: Adresse in Safari öffnen → Teilen → *Zum Home-Bildschirm*.

### Neue Version veröffentlichen

Dateien ersetzen und in `sw.js` die Zahl bei `const V='wr-v…'` erhöhen, sonst zeigt die App noch die alte Fassung aus dem Cache. Dann die App zweimal öffnen.

## Daten und Datenschutz

Rezepte, Notizen, Einstellungen und Ausgangswasser liegen nur im Browserspeicher (`localStorage`) deines Geräts, ohne Konto und ohne Server. Sie sind pro Gerät und pro Adresse getrennt; löschst du die Websitedaten oder die App vom Home-Bildschirm, sind sie weg. Über den Teilen-Button kannst du einzelne Rezepte per Link weitergeben.

Die Schriften (Inter, DotGothic16) werden beim ersten Start von Google Fonts geladen (dabei wird deine IP-Adresse an Google übertragen) und danach im Cache gehalten. Wer das vermeiden will, legt die Schriftdateien selbst ins Repository und passt den `<link>` in `index.html` an.

## Rechenmodell

- Rezeptwerte sind Ziel-ppm als CaCO₃: Mg und Ca ergeben die Härte (GH), Na und K die Alkalinität (KH).
- Tropfen = ppm / 100 × Faktor × Liter. Runde Spitze: 12 (Mg, Ca) und 25 (Na, K) Tropfen pro 100 ppm und Liter, gerade Spitze: 16/9 davon. Gerundet wird normal (.5 nach oben).
- Ausgangswasser reduziert die nötigen Tropfen: Mg und Ca werden direkt abgezogen, die Alkalinität über das Hydrogencarbonat. Liegt das Wasser über dem Ziel, erscheint ein Hinweis.
- Ionen: Mg und Ca als Chloride, Na und K als Hydrogencarbonate; für Calcium gilt eine Kalibrierung von 0,929, damit Härte und Chlorid mit dem Hersteller-Rechner übereinstimmen.
- Die Faktoren stammen aus 404 Messwerten (3 Rezepte × 2 Spitzen × 17 Mengen × 4 Minerale); `test/lotus-check.js` prüft, dass die App alle exakt reproduziert.

## Projektstruktur

```
index.html            gesamte App (HTML, CSS, JavaScript)
manifest.webmanifest  Name, Symbole, Vollbild-Modus
sw.js                 Service Worker (Offline-Cache)
icon-*.png            App-Symbole
test/                 Tests (Lotus-Werte, Speichern, Integrationstest)
```

## Tests

```
npm test                  # Lotus-Werte und Speichern nach Neustart
npm install && npm run test:integration   # Integrationstest mit jsdom
```

## Lizenz

Noch nicht festgelegt.
