# Kronk springt!

Ein Lern-Jump-Spiel mit dem Schulmaskottchen Kronk. Reines HTML, CSS und JavaScript: kein Build-Schritt, Backend, Benutzerkonto, Tracking oder externe Schriftarten. Die drei Originalbilder in `assets/` werden unverändert verwendet.

**Spielen:** https://simfischer.github.io/Kronk-Jump-2.0/

## Spielen und auswählen

1. Fach, Klassenstufe und Thema auswählen. Die nachfolgenden Felder passen sich automatisch an. Es erscheinen nur Sammlungen, deren Dateien erfolgreich geladen und geprüft wurden.
2. Denkpause wählen: **0, 1, 2, 4, 6, 8 oder 10 Sekunden**, Standard **2 Sekunden**. Bei 0 Sekunden fällt Kronk am Scheitel ohne Halt weiter; es erscheint kein Denkpausen-Countdown.
3. Kronk springt automatisch. Links oder rechts gedrückt halten, alternativ die Pfeiltasten benutzen. Die seitliche Steuerung bleibt auch in der Denkpause aktiv. Der rote Fußmarker muss auf einer richtigen Plattform landen. Bei mehreren richtigen Antworten genügt eine beliebige richtige Plattform.
4. Jede richtige Landung gibt 100 Punkte und den nächsten Sprung. Falsche Plattformen brechen. Nach einem Fehler erscheinen alle richtigen Antworten und die Erklärung, falls vorhanden.
5. Mit **Noch einmal spielen** dieselbe Sammlung neu beginnen. **Zur Themenauswahl** setzt die Runde zurück und öffnet die Auswahl. Das ist auch über die Pause möglich.

Pause über den Knopf oder **P**. Beim Verlassen des Browserfensters bzw. Wechseln des Tabs pausiert das Spiel automatisch. Über **Weiterspielen** fortsetzen. Neustart und Themenauswahl löschen Punkte, Fortschritt, Plattformen, Eingaben und Denkpause der alten Runde.

Die Frage steht in einer festen, kontrastreichen Box unterhalb des Spielfelds, direkt über der Steuerung. Sie wird nur einmal als scharfer HTML-Text angezeigt und bewegt sich nicht mit Kronk. Das Spielfeld nutzt die tatsächliche Display-Pixeldichte und passt sich bei Größenwechseln und Drehung proportional an. Plattformen und Antwortschrift sind größer. Frage und Plattformen wechseln gemeinsam. Sehr lange Fragen vergrößern den benötigten Platz; auf kleinen Displays kann die Seite dann scrollen, ohne den Text abzuschneiden.

## Vorhandene Sammlungen

| Fach | Klasse | Thema | Datei |
| --- | --- | --- | --- |
| Deutsch | 5 | Wortarten – 6 ursprüngliche Aufgaben | `aufgaben/deutsch-5-wortarten.js` |
| Deutsch | 6 | Zeitformen (Beispiel) | `aufgaben/deutsch-6-zeitformen.js` |
| Deutsch | 6 | Satzglieder (Beispiel) | `aufgaben/deutsch-6-satzglieder.js` |
| Deutsch | E | Aufklärung – 20 Fragen | `aufgaben/deutsch-e-aufklaerung.js` |
| Religion | 6 | Christliche Feste (Beispiel) | `aufgaben/religion-6-feste.js` |

Die als Beispiele gekennzeichneten Sammlungen sind kurze Demonstrationen, keine vollständigen Unterrichtsreihen.

## Ein neues Thema hinzufügen: eine Datei kopieren, eine Zeile ergänzen

### 1. Aufgabendatei kopieren

Kopiere **`aufgaben/deutsch-6-zeitformen.js`** im Ordner `aufgaben` und nenne die Kopie beispielsweise **`englisch-5-wortschatz.js`**. Verwende für Dateinamen kleine Buchstaben ohne Umlaute, Ziffern und Bindestriche; die Endung bleibt `.js`.

Ersetze den Inhalt der Kopie zum Beispiel durch:

```js
window.KRONK_SAMMLUNGEN["englisch-5-wortschatz"] = {
  mischen: true,
  fragen: [
    {
      frage: "Was bedeutet ›school‹?",
      antworten: [
        { text: "Schule", richtig: true },
        { text: "Haus", richtig: false },
        { text: "Garten", richtig: false }
      ],
      erklaerung: "School bedeutet Schule."
    }
  ]
};
```

Die Kennung in den eckigen Klammern muss eindeutig sein. Ändere sie beim Kopieren unbedingt mit.

### 2. In der zentralen Liste eintragen

Öffne **`aufgaben.js`** im Hauptverzeichnis. Ergänze innerhalb von `window.KRONK_KATALOG = [ ... ];` diesen Eintrag. Trenne die Einträge jeweils durch ein Komma:

```js
{ id: "englisch-5-wortschatz", fach: "Englisch", klasse: 5, thema: "Wortschatz", datei: "aufgaben/englisch-5-wortschatz.js" }
```

`id` muss **genau** der Kennung in der neuen Aufgabendatei entsprechen. `datei` muss **genau** den relativen Pfad inklusive Groß-/Kleinschreibung enthalten. `klasse` ist eine positive ganze Zahl ohne Anführungszeichen oder `"E"` für den E-Jahrgang. Der E-Jahrgang erscheint nach den nummerierten Klassen; die Sammlung ist unter Deutsch → E-Jahrgang → Aufklärung auswählbar. Für eine Demonstration zusätzlich `beispiel: true` ergänzen; das Spiel zeigt dann „(Beispiel)“ an.

Mehr ist nicht nötig: **keine Änderung an `index.html` oder `spiel.js`**. Beide Dateien in GitHub speichern/committen, die Veröffentlichung unter **Actions** abwarten und den Spiellink neu laden. Zum Entfernen einer Sammlung genügt es, ihren Eintrag aus `aufgaben.js` zu entfernen.

### Regeln für Aufgaben

- Mindestens eine Frage je Datei; pro Frage **2 bis 4 Antworten**.
- Mindestens eine Antwort mit `richtig: true`. Mehrere richtige Antworten sind erlaubt; jede trägt Kronk.
- `frage` und `text` enthalten nichtleeren Text, `richtig` ist `true` oder `false` ohne Anführungszeichen.
- `mischen: true` mischt die Fragen; `false` erhält ihre Reihenfolge. Antwortpositionen werden immer gemischt.
- `erklaerung` ist optionaler Text. Nach einem Fehler werden auch mit Erklärung alle richtigen Antworten angezeigt.
- Kurze Antwortwörter oder Wortgruppen passen am besten auf Plattformen. Für längere Antworten zwei Plattformen verwenden. Fragen dürfen mehrzeilig sein und werden vollständig umgebrochen.
- Anführungszeichen, Kommas und Klammern beibehalten. Keine Schülernamen oder anderen personenbezogenen Daten eintragen.

### Fehlermeldungen

Eine fehlende, ungültige oder falsch registrierte Sammlung erscheint mit Dateinamen und verständlicher Fehlermeldung im Startbildschirm. Andere gültige Sammlungen bleiben spielbar. Die fehlerhafte Sammlung wird nicht angeboten. Bei fehlerhafter zentraler Liste, fehlenden Kronk-Bildern oder ausschließlich ungültigen Sammlungen bleibt der Start gesperrt. Dateien korrigieren, committen und nach der Veröffentlichung die Seite neu laden.

## Dateien und Technik

- `index.html`: Oberfläche und Auswahlfelder.
- `style.css`: Layout, Fragebox, große Touchflächen und responsive Darstellung.
- `aufgaben.js`: zentrale Liste der Sammlungen.
- `aufgaben/`: eine JavaScript-Datei je Sammlung. Dynamisches Laden über lokale Script-Tags funktioniert auch ohne Backend.
- `spiel.js`: Laden, Schema-Prüfung, Steuerung, Physik, Kollisionen und Spielzustände.
- `assets/`: unveränderte Originalbilder (Normal, Jubel, Sprung).
- `tests/spiel.test.cjs`: automatisierte Entwicklungstests mit Node.js, optional ausführbar über `node tests/spiel.test.cjs`. Zum Spielen wird Node.js nicht benötigt.

GitHub Pages verwendet weiterhin die vorhandene Konfiguration. Alle Spielpfade sind relativ und funktionieren unter der Projektadresse `/Kronk-Jump-2.0/`. Auf dem Computer lässt sich `index.html` auch direkt öffnen; auf dem iPad den veröffentlichten Weblink verwenden, optional über Safari zum Home-Bildschirm hinzufügen. Kein Offline-/Service-Worker-Modus.

Die Physik rechnet mit festen Schritten von 1/120 Sekunde. `GRAVITY = 600`, `JUMP = 700`, `SPEED = 480`. Die aktive Antwortreihe liegt bei `ROW_Y = 410`, also 60 Spieleinheiten tiefer als zuvor. Kronks Absprungposition bleibt bei `START_Y = 515`; Sprungkraft und Sprunghöhe ändern sich nicht. Daraus ergibt sich ein Plattformabstand von `GAP = 105`. Die Flugzeit bis zur nächsten Plattform beträgt ohne Denkpause etwa 2,17 Sekunden. Für die gesamte steuerbare Breite von 544 Einheiten werden rund 1,13 Sekunden benötigt; damit sind alle Plattformen auch von den Rändern erreichbar. Die Kamera wechselt nur mit der Aufgabe. Kronk bleibt auch am höchsten Punkt vollständig sichtbar.

## Prüfungen und Grenzen

Automatisiert geprüft: abhängige Auswahl und Inhalte, alle sieben Denkzeiten, 18 Querwechsel zwischen beiden Randpositionen und jeder Plattformmitte bei 2–4 Antworten ohne Denkpause, Tastatur- und Pointer-Ereignisse, Denkpause mit seitlicher Steuerung, manuelle und automatische Pause, richtige/falsche/verfehlte Landungen, Sieg, Neustart, Themenrückkehr sowie fehlende/fehlerhafte Aufgabendateien.

Zusätzlich im Chrome-Browser mit iPad-ähnlichen Ansichten (768 × 1024 und 1024 × 768) geprüft. Das ersetzt keinen Praxistest auf einem echten iPad mit Safari und echten Mehrfinger-Touchgesten. Kein gespeicherter Lernstand oder Bestenliste; das Canvas-Spiel bietet keine vollständig gleichwertige Screenreader-Spielweise.

## Rechte

Die Kronk-Bilder wurden vom Auftraggeber bereitgestellt. Es wird keine freie Lizenz für das Maskottchen behauptet. Die Rechte an den Originalbildern bleiben unberührt. Keine Schülerdaten erforderlich.
