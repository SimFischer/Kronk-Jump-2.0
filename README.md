# Kronk springt!

Ein Lern-Jump-Spiel mit dem Schulmaskottchen Kronk. Reines HTML, CSS und JavaScript: kein Build-Schritt, Backend, Benutzerkonto, Tracking oder externe Schriftarten. Die Kronk-Bilder in `assets/` sind unveränderte Motive des Auftraggebers, für die Anzeige im Spiel auf 460 Pixel Höhe herunterskaliert.

**Spielen:** https://simfischer.github.io/Kronk-Jump-2.0/

## Zwei Spielarten

Im Startbildschirm wird oben die **Spielart** gewählt; die Wahl bleibt für das nächste Mal gespeichert.

- **Springen** – der bisherige Modus. Kronk hüpft von unten nach oben, am Sprungscheitel hält er für die eingestellte Denkpause an.
- **Landeanflug (auf Zeit)** – Kronk schwebt über den Antwortkarten und wandert seitlich, solange gehalten wird. Nach **10 Sekunden** sinkt er von allein auf die Karte unter ihm. Ist **Sofort landen erlauben** aktiv (Standard), geht es mit dem Knopf **▼**, der Taste **↓** oder der Leertaste schon vorher runter. Im Hintergrund läuft die Rundenzeit mit und steht neben den Punkten; am Ende zeigt der Abschluss die **Gesamtzeit** und die **Bestzeit** für diese Sammlung, die im Browser gespeichert wird. Eine falsche Karte beendet die Runde wie beim Springen – mit Lernpause, Lösung und der Möglichkeit, die Aufgabe zu wiederholen.

Beide Spielarten nutzen dieselben Sammlungen, dieselbe Steuerung zur Seite, dieselben Punkte und dieselbe Freischaltung der Kronk-Figuren.

## Spielen und auswählen

1. Fach, Klassenstufe und Thema auswählen. Die nachfolgenden Felder passen sich automatisch an. Es erscheinen nur Sammlungen, deren Dateien erfolgreich geladen und geprüft wurden.
2. Denkpause wählen: **0, 1, 2, 4, 6, 8 oder 10 Sekunden**, Standard **2 Sekunden**. Bei 0 Sekunden fällt Kronk am Scheitel ohne Halt weiter; es erscheint kein Denkpausen-Countdown.
3. Kronk springt automatisch. Steuern: die linke oder rechte **Hälfte des Spielfelds** gedrückt halten, die beiden Richtungstasten unten gedrückt halten, die Pfeiltasten ← → oder die **Ziffer der Antwortkarte** (1–4). Jede Karte trägt ihre Ziffer sichtbar auf der Landefläche. Die seitliche Steuerung bleibt auch in der Denkpause aktiv. Der rote Fußmarker muss auf einer richtigen Karte landen. Bei mehreren richtigen Antworten genügt eine beliebige richtige Karte.
4. Jede richtige Landung gibt 100 Punkte und den nächsten Sprung. Falsche Plattformen brechen. Nach einem Fehler erscheinen alle richtigen Antworten und die Erklärung, falls vorhanden.
5. Mit **Noch einmal spielen** dieselbe Sammlung neu beginnen. **Zur Themenauswahl** setzt die Runde zurück und öffnet die Auswahl. Das ist auch über die Pause möglich.

## Ohne Adressleiste spielen

Oben rechts sitzt ein **Vollbild**-Knopf (Tastatur: **F**), der Adressleiste, Tabs und Lesezeichen ausblendet. Er erscheint nur, wenn der Browser Vollbild wirklich beherrscht – am Laptop, auf Android und in Safari auf dem iPad. **Escape** oder ein zweiter Druck beenden das Vollbild wieder.

Safari auf dem **iPhone** kennt kein Vollbild für Webseiten; dort ist der Knopf ausgeblendet. Der zuverlässige Weg auf allen Apple-Geräten ist stattdessen die Installation: Seite in Safari öffnen, **Teilen → Zum Home-Bildschirm**. Kronk startet dann als eigene App ohne jede Browserleiste, funktioniert offline und zeigt den Vollbild-Knopf gar nicht erst an, weil er dort überflüssig ist. Auf Android und am Rechner geht dasselbe über **Installieren** bzw. das Symbol in der Adressleiste.

Pause über den Knopf oder **P**. Beim Verlassen des Browserfensters bzw. Wechseln des Tabs pausiert das Spiel automatisch. Über **Weiterspielen** fortsetzen. Neustart und Themenauswahl löschen Punkte, Fortschritt, Plattformen, Eingaben und Denkpause der alten Runde.

Die Frage steht in einer festen, kontrastreichen Box als scharfer HTML-Text und bewegt sich nicht mit Kronk. Sie sitzt in jedem Format unterhalb des Spielfelds, direkt unter den Antwortkarten und über der Steuerung – der Blickweg von der Frage zu den Antworten bleibt damit kurz. Im Querformat (iPad quer, Laptop, Beamer) rücken Kopfzeile, Fragebox und Steuerung enger zusammen, sodass ohne Scrollen alles gleichzeitig sichtbar bleibt. Das Spielfeld nutzt die tatsächliche Display-Pixeldichte und passt sich bei Größenwechseln und Drehung proportional an. Zeichenfläche, CSS-Größe und Position rasten dabei auf ganze Gerätepixel ein, damit der Browser das fertige Bild nicht nachskalieren muss – sonst wirken Karten und Text je nach Fensterbreite verschwommen. Frage und Antwortkarten wechseln gemeinsam.

## Darstellung im Spielfeld

- **Himmel statt Raster.** Der Hintergrund ist ein Farbverlauf mit zwei Wolkenebenen, die sich beim Steigen unterschiedlich schnell nach unten bewegen. Je weiter die Sammlung geschafft ist, desto tiefer wird das Blau oben. Das macht die Sprunghöhe sichtbar, die vorher als leere Fläche wirkte.
- **Antwortkarten.** Jede Antwort ist eine weiße Karte mit blauer Landefläche oben. Auf der Landefläche steht die Ziffer der Karte; nach der Landung erscheint dort `RICHTIG` (grün) oder `FALSCH` (rot, die Karte kippt und bricht).
- **Zielhilfe.** Solange Kronk fliegt, markieren ein oranger Rahmen um die angepeilte Karte und ein Landeschatten auf ihrer Landefläche, wo er aufsetzen würde. In der Denkpause nennt die Statuszeile zusätzlich Feldnummer und Antworttext – auch für Vorlesehilfen.
- **Denkpause.** Die verbleibenden Sekunden stehen als Zahl direkt unter Kronk.
- **Höhenleiste.** Rechts zeigt eine Leiste mit einer Sprosse je Aufgabe und einem Ziel-Fähnchen, wie weit die Route geschafft ist. Geschaffte Reihen bleiben als schmaler oranger Routenbalken sichtbar.
- **Serie.** Ab zwei richtigen Landungen hintereinander erscheint oben links eine Anzeige `Serie × n`.

Sehr lange Fragen vergrößern den benötigten Platz; auf kleinen Displays kann die Seite dann scrollen, ohne den Text abzuschneiden.

## Vorhandene Sammlungen

| Fach | Klasse | Thema | Datei |
| --- | --- | --- | --- |
| Deutsch | 5 | Wortarten – 6 ursprüngliche Aufgaben | `aufgaben/deutsch-5-wortarten.js` |
| Deutsch | 6 | Zeitformen (Beispiel) | `aufgaben/deutsch-6-zeitformen.js` |
| Deutsch | 6 | Satzglieder (Beispiel) | `aufgaben/deutsch-6-satzglieder.js` |
| Deutsch | E | Aufklärung – 20 Fragen | `aufgaben/deutsch-e-aufklaerung.js` |
| Religion | 6 | Christliche Feste (Beispiel) | `aufgaben/religion-6-feste.js` |
| Religion | 7 | Die Urgemeinde – 27 Fragen | `aufgaben/religion-7-urgemeinde.js` |
| Religion | 7 | Christenverfolgung und konstantinische Wende – 30 Fragen | `aufgaben/religion-7-verfolgung-wende.js` |

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
- `erklaerung` ist optionaler Text zur Aufgabe. Nach einem Fehler werden auch mit Erklärung alle richtigen Antworten angezeigt.
- `warum` ist optionaler Text **an einer falschen Antwort**. Er erscheint in der Lernpause direkt unter der eigenen Antwort und erklärt den Denkfehler, statt nur die Lösung zu zeigen. Das ist der wirksamste Zusatz je Aufgabe – ein Satz genügt:

```js
{ text: "besser", richtig: false, warum: "Das ist der Komparativ – die Vergleichsstufe, nicht die Höchststufe." }
```

  Die Beispielsammlung `aufgaben/deutsch-6-zeitformen.js` zeigt das Feld im Zusammenhang.
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
- `assets/`: Kronk-Motive (Normal, Jubel, Sprung) je Charakter, auf Anzeigegröße skaliert – zusammen rund 0,8 MB statt vorher 31,6 MB. Dazu `icon-192.png` und `icon-512.png` für den Home-Bildschirm.
- `sw.js`: Service Worker für den Offline-Betrieb.
- `manifest.json`: Angaben für den Start vom Home-Bildschirm.
- `tests/spiel.test.cjs`: automatisierte Entwicklungstests mit Node.js, optional ausführbar über `node tests/spiel.test.cjs`. Zum Spielen wird Node.js nicht benötigt.

## Offline und Home-Bildschirm

Beim ersten Aufruf über den Weblink legt ein Service Worker Spiel und Aufgaben im Browser ab. Danach startet das Spiel auch ohne Netz – praktisch bei wackeligem Schul-WLAN. Code und Aufgabendateien werden bevorzugt frisch geladen, damit eine neue Sammlung sofort erscheint; Bilder kommen aus dem Speicher. Die Liste der Aufgabendateien liest der Service Worker aus `aufgaben.js`, eine neue Sammlung wird also ohne Änderung an `sw.js` mitgespeichert.

Auf dem iPad in Safari über **Teilen → Zum Home-Bildschirm** ablegen: Das Spiel startet dann ohne Safari-Leiste im Vollbild. Beim direkten Öffnen von `index.html` auf dem Computer (`file://`) ist kein Offline-Betrieb möglich; dort wird der Service Worker nicht angemeldet.

Nach einem Update genügt einmaliges Neuladen. Erscheint noch die alte Fassung, hilft ein Neuladen mit Strg+Shift+R bzw. Cmd+Shift+R.

## Bedienung ohne Blick aufs Spielfeld

Unterhalb des Spielfelds liegt je Antwort ein echter Knopf. Sie sind nicht sichtbar, erscheinen aber, sobald man sie mit der Tabulatortaste anspringt, und tragen die Beschriftung „Antwort 2 von 3: Ich spiele." Damit lässt sich dieselbe Runde mit Tastatur oder Screenreader spielen: Frage anhören, Knopf auslösen, Kronk landet auf dieser Karte. Frage und Statuszeile melden sich über `aria-live` von selbst.

GitHub Pages verwendet weiterhin die vorhandene Konfiguration. Alle Spielpfade sind relativ und funktionieren unter der Projektadresse `/Kronk-Jump-2.0/`. Auf dem Computer lässt sich `index.html` auch direkt öffnen; auf dem iPad den veröffentlichten Weblink verwenden, optional über Safari zum Home-Bildschirm hinzufügen. Kein Offline-/Service-Worker-Modus.

Die Physik rechnet mit festen Schritten von 1/120 Sekunde. `GRAVITY = 600`, `JUMP = 700`, `SPEED = 480`. Die aktive Antwortreihe liegt bei `ROW_Y = 410`, also 60 Spieleinheiten tiefer als zuvor. Kronks Absprungposition bleibt bei `START_Y = 515`; Sprungkraft und Sprunghöhe ändern sich nicht. Daraus ergibt sich ein Plattformabstand von `GAP = 105`. Die Flugzeit bis zur nächsten Plattform beträgt ohne Denkpause etwa 2,17 Sekunden. Für die gesamte steuerbare Breite von 544 Einheiten werden rund 1,13 Sekunden benötigt; damit sind alle Plattformen auch von den Rändern erreichbar. Die Kamera wechselt nur mit der Aufgabe. Kronk bleibt auch am höchsten Punkt vollständig sichtbar.

## Prüfungen und Grenzen

Automatisiert geprüft: abhängige Auswahl und Inhalte, alle sieben Denkzeiten, 18 Querwechsel zwischen beiden Randpositionen und jeder Plattformmitte bei 2–4 Antworten ohne Denkpause, Tastatur- und Pointer-Ereignisse, Denkpause mit seitlicher Steuerung, manuelle und automatische Pause, richtige/falsche/verfehlte Landungen, Sieg, Neustart, Themenrückkehr sowie fehlende/fehlerhafte Aufgabendateien.

Zusätzlich im Chromium-Browser bei 1440 × 900, 1280 × 720 sowie den iPad-ähnlichen Ansichten 768 × 1024 und 1024 × 768 geprüft; in allen vier Größen ist die Seite ohne Scrollen vollständig sichtbar. Das ersetzt keinen Praxistest auf einem echten iPad mit Safari und echten Mehrfinger-Touchgesten. Keine Bestenliste. Punkte, freigeschaltete Charaktere und Fehlerfragen liegen im `localStorage` des jeweiligen Geräts.

## Rechte

Die Kronk-Bilder wurden vom Auftraggeber bereitgestellt. Es wird keine freie Lizenz für das Maskottchen behauptet. Die Rechte an den Originalbildern bleiben unberührt. Keine Schülerdaten erforderlich.
