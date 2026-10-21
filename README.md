# 🚀 Learnrocket – Raketen-Quiz

Ein interaktives Schulquiz für Mathematik, Physik und weitere Fächer. Die Lernenden wählen auf der Startseite einen Fragensatz aus und fliegen mit einer Rakete zur richtigen Antwort.

Das Quiz kann online über GitHub Pages oder als **SCORM-1.2-Paket** in Moodle beziehungsweise mebis verwendet werden.

---

# Für Nutzerinnen und Nutzer

## Voraussetzungen unter Linux

Für die Skripte werden benötigt:

- Bash
- `zip`
- `jq`

Installation unter Ubuntu oder Debian:

```bash
sudo apt update
sudo apt install zip jq
```

---

## Projektstruktur

Die wichtigsten Dateien und Ordner:

```text
learnrocket/
├── index.html
├── game.js
├── styles.css
├── katex.min.js
├── katex.min.css
├── imsmanifest.xml
├── question/
│   ├── sets.json
│   ├── mathe.json
│   ├── physik.json
│   └── rot1.json
├── update-question-sets.sh
└── make-scorm.sh
```

---

## Neues Fragenset hinzufügen

Lege eine neue JSON-Datei in den Ordner `question/`.

Beispiel:

```text
question/elektrizitaet.json
```

Danach aktualisierst du automatisch die Liste:

```bash
./update-question-sets.sh
```

Das Skript:

- durchsucht den Ordner `question/`,
- findet neue JSON-Dateien,
- ergänzt fehlende Einträge in `sets.json`,
- lässt vorhandene Titel unverändert,
- erstellt eine Sicherungskopie von `sets.json`.

Falls das Skript noch nicht ausführbar ist:

```bash
chmod +x update-question-sets.sh
```

Ausführen kannst du es anschließend mit:

```bash
./update-question-sets.sh
```

Alternativ:

```bash
bash update-question-sets.sh
```

**Nicht verwenden:**

```bash
sh update-question-sets.sh
```

Das Skript verwendet Bash-Funktionen und benötigt daher Bash.

---

## SCORM-Paket erzeugen

Nachdem du neue oder geänderte Fragen hinzugefügt hast:

```bash
./update-question-sets.sh
./make-scorm.sh
```

Das Build-Skript erstellt ein ZIP-Paket, das in Moodle oder mebis hochgeladen werden kann.

Das Paket liegt anschließend beispielsweise hier:

```text
scorm-build/raketen-quiz-scorm.zip
```

Falls `make-scorm.sh` noch nicht ausführbar ist:

```bash
chmod +x make-scorm.sh
```

---

## SCORM-Paket in Moodle oder mebis hochladen

- Öffne deinen Kurs.
- Aktiviere den Bearbeitungsmodus.
- Wähle **Aktivität oder Material hinzufügen**.
- Wähle **Lernpaket (SCORM)**.
- Lade die erzeugte ZIP-Datei hoch.
- Speichere die Aktivität.
- Teste das Quiz vollständig.

Das Quiz überträgt:

- die erreichte Punktzahl,
- die Maximalpunktzahl,
- den Lernstatus,
- den Status `passed` oder `failed`.

Standardmäßig gilt das Quiz ab **66 %** als bestanden.

---

## Online-Version testen

Die Online-Version kann beispielsweise über GitHub Pages geöffnet werden:

```text
https://DEIN-ACCOUNT.github.io/DEIN-PROJEKT/
```

Die Fragensätze werden aus dieser Datei geladen:

```text
question/sets.json
```

Die Datei muss online erreichbar sein unter:

```text
https://DEIN-ACCOUNT.github.io/DEIN-PROJEKT/question/sets.json
```

---

# Allgemeine Erklärung

## Auswahl der Fragensätze

Das Dropdown-Menü in `index.html` bleibt leer:

```html
<select id="questionSet"></select>
```

Die verfügbaren Fragensätze werden beim Laden automatisch aus `question/sets.json` erzeugt.

Beispiel:

```json
{
    "mathe": {
        "title": "Mathematik 🍕",
        "file": "question/mathe.json"
    },
    "physik": {
        "title": "Physik 🚴‍♀️",
        "file": "question/physik.json"
    },
    "rot1": {
        "title": "Drehbewegungen 🌀",
        "file": "question/rot1.json"
    }
}
```

Die Angabe besteht aus:

- einer eindeutigen ID,
- einem sichtbaren Titel,
- dem Pfad zur JSON-Datei.

---

## Aufbau eines Fragensets

Eine JSON-Datei enthält ein Array mit Fragen:

```json
[
    {
        "question": "Berechne: $12 + (-7)$",
        "answers": [
            "$5$",
            "$-5$",
            "$19$"
        ],
        "correctAnswer": 0,
        "explanation": "$12 - 7 = 5$."
    }
]
```

### Bedeutung der Felder

| Feld | Bedeutung |
|---|---|
| `question` | Frage oder Aufgabe |
| `answers` | Genau drei Antwortmöglichkeiten |
| `correctAnswer` | Index der richtigen Antwort |
| `explanation` | Erklärung nach der Antwort |

### Werte von `correctAnswer`

```text
0 = erste Antwort
1 = zweite Antwort
2 = dritte Antwort
```

Beispiel:

```json
{
    "question": "Welche Einheit hat die Kraft?",
    "answers": [
        "Joule",
        "Newton",
        "Watt"
    ],
    "correctAnswer": 1,
    "explanation": "Die Einheit der Kraft ist Newton."
}
```

---

## Empfehlungen für gute Fragen

- Formuliere die Fragen kurz.
- Verwende möglichst Formeln, Symbole, Einheiten und kurze Berechnungen.
- Vermeide lange Sachtexte.
- Erstelle genau drei Antworten.
- Verwende genau eine richtige Antwort.
- Nutze plausible typische Fehler als falsche Antworten.
- Verteile die richtige Antwort auf unterschiedliche Positionen.
- Prüfe Zahlenwerte, Einheiten und Formelumstellungen.

---

## Mathematische Formeln

Formeln werden zwischen Dollarzeichen geschrieben:

```json
"question": "Berechne: $2 \\cdot 3 + 4$"
```

Bei LaTeX in JSON müssen Backslashes doppelt geschrieben werden:

```json
"$\\frac{1}{2}$"
```

Beispiele:

```json
"$a_z = \\frac{v^2}{r}$"
```

```json
"$F = m \\cdot a$"
```

```json
"$\\sqrt{25}$"
```

---

# Technische Details

## `game.js`

Die JavaScript-Datei übernimmt:

- Laden von `question/sets.json`,
- Erstellen des Dropdown-Menüs,
- Laden des ausgewählten Fragensatzes,
- zufällige Reihenfolge der Fragen,
- Darstellung von KaTeX-Formeln,
- Steuerung der Rakete,
- Auswertung der Antworten,
- Berechnung der Punktzahl,
- SCORM-Kommunikation.

Die Fragensätze werden nicht mehr fest in `game.js` eingetragen. Stattdessen wird die Liste dynamisch geladen:

```js
fetch("question/sets.json")
```

Dadurch reicht es aus, neue JSON-Dateien in den Ordner `question/` zu legen und anschließend das Aktualisierungsskript auszuführen.

---

## `update-question-sets.sh`

Das Skript durchsucht ausschließlich den Ordner:

```text
question/
```

Es berücksichtigt JSON-Dateien direkt in diesem Ordner. Unterordner werden nicht durchsucht.

Die Datei

```text
question/sets.json
```

wird dabei als Verwaltungsdatei ignoriert und nicht selbst als Fragensatz aufgenommen.

Vor jeder Änderung wird eine Sicherung erstellt:

```text
question/sets.json.bak-YYYYMMDD-HHMMSS
```

Beispiel:

```text
question/sets.json.bak-20261021-162200
```

Vorhandene Einträge bleiben erhalten. Neue JSON-Dateien erhalten automatisch einen Titel aus ihrem Dateinamen.

Beispiel:

```text
question/elektrizitaet.json
```

wird automatisch eingetragen als:

```json
"elektrizitaet": {
    "title": "Elektrizitaet",
    "file": "question/elektrizitaet.json"
}
```

Individuelle Titel können anschließend direkt in `sets.json` angepasst werden.

---

## `make-scorm.sh`

Das Build-Skript erstellt aus dem Projekt ein SCORM-1.2-Paket.

Es kopiert unter anderem:

- `index.html`,
- `game.js`,
- `styles.css`,
- KaTeX-Dateien,
- `question/sets.json`,
- alle JSON-Fragensätze,
- den Ordner `fonts/`, falls vorhanden.

Außerdem erzeugt es eine passende `imsmanifest.xml`.

Die Datei `imsmanifest.xml` liegt anschließend direkt im Stammverzeichnis der ZIP-Datei:

```text
raketen-quiz-scorm.zip
├── imsmanifest.xml
├── index.html
├── game.js
├── styles.css
└── question/
    ├── sets.json
    ├── mathe.json
    └── physik.json
```

---

## SCORM 1.2

Das Spiel verwendet die SCORM-1.2-API.

Beim Start wird der Status gesetzt:

```text
incomplete
```

Während des Spiels wird die Punktzahl übertragen. Am Ende wird der Status gesetzt:

```text
passed
```

oder:

```text
failed
```

Die Bestehensgrenze liegt standardmäßig bei:

```text
66 %
```

In `game.js` wird sie beispielsweise so verwendet:

```js
SCORM.finish(score, maxScore, 0.66);
```

Eine Bestehensgrenze von 50 % würde so aussehen:

```js
SCORM.finish(score, maxScore, 0.50);
```

---

## SCORM-Manifest

Ein Fragensatz muss im SCORM-Paket enthalten und im Manifest aufgeführt sein:

```xml
<file href="question/sets.json"/>
<file href="question/mathe.json"/>
<file href="question/physik.json"/>
```

Wenn `make-scorm.sh` das Manifest automatisch erstellt, müssen diese Einträge nicht von Hand gepflegt werden.

---

## Lokales Testen

Beim direkten Öffnen von `index.html` per Doppelklick kann der Browser das Laden von JSON-Dateien blockieren.

Nicht ideal:

```text
file:///home/name/learnrocket/index.html
```

Besser ist ein lokaler Webserver, zum Beispiel mit PHP:

```bash
php -S localhost:8000
```

Danach im Browser öffnen:

```text
http://localhost:8000
```

Alternativ kann das Projekt direkt über GitHub Pages oder als SCORM-Paket in Moodle getestet werden.

---

## Fehlerbehebung

### Dropdown ist leer

Prüfe, ob diese Datei existiert:

```text
question/sets.json
```

Teste sie direkt im Browser:

```text
https://DEIN-ACCOUNT.github.io/DEIN-PROJEKT/question/sets.json
```

Führe anschließend aus:

```bash
./update-question-sets.sh
```

### Neue Fragen erscheinen nicht online

Prüfe:

- Wurde die JSON-Datei zu GitHub hochgeladen?
- Wurde `sets.json` aktualisiert?
- Stimmt die Groß- und Kleinschreibung?
- Wurde der Browsercache geleert?
- Wurde die richtige Version des SCORM-Pakets hochgeladen?

### SCORM lädt alte Fragen

Erstelle das Paket neu:

```bash
./update-question-sets.sh
./make-scorm.sh
```

Lade anschließend eine neue ZIP-Datei in Moodle hoch, zum Beispiel:

```text
raketen-quiz-scorm-v2.zip
```

### Punktzahl wird nicht übertragen

Prüfe:

- Wird das Quiz tatsächlich als SCORM-Aktivität geöffnet?
- Liegt `imsmanifest.xml` direkt im ZIP-Stammverzeichnis?
- Enthält `game.js` die SCORM-Funktionen?
- Wird das Quiz bis zum Ende durchgeführt?
- Unterstützt das verwendete LMS SCORM 1.2?

---

## Kurzablauf

Ein neues Fragenset wird so eingebunden:

```bash
cp neues-thema.json question/
./update-question-sets.sh
./make-scorm.sh
```

Danach liegt das fertige SCORM-Paket im Build-Ordner und kann in Moodle oder mebis hochgeladen werden.
