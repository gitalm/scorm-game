# 🚀 Raketen-Quiz  
## Anleitung für Lehrkräfte und Erstellung eigener Fragen

Ein interaktives, gamifiziertes Lernspiel auf HTML5-Basis für den Einsatz im Unterricht und in Lernmanagementsystemen wie **Moodle** oder **mebis**.

Die Lernenden steuern eine Rakete durch den Weltraum und wählen die richtige Antwort aus. Das Quiz kann für **Mathematik, Physik, Sprachen und weitere Fächer** verwendet werden.

---

## 🌟 Funktionen

- **Gamification:** Eine Rakete fliegt zur ausgewählten Antwort.
- **Mathematik und Physik:** Unterstützung für Formeln durch **KaTeX**.
- **SCORM 1.2:** Übertragung des Ergebnisses an Moodle oder mebis.
- **Bestehensgrenze:** Standardmäßig gilt das Quiz ab 66 % als bestanden.
- **Zufällige Fragen:** Die Reihenfolge der Fragen kann zufällig festgelegt werden.
- **Mehrere Fragensätze:** Unterschiedliche JSON-Dateien können über die URL geladen werden.
- **Responsive Design:** Geeignet für Computer, Tablets und Smartphones.
- **Tastatursteuerung:** Nutzung der Pfeiltasten und der Leertaste am Computer.
- **Touchsteuerung:** Auswahl der Antworten durch Antippen.

---

## 📂 Dateistruktur

Eine mögliche Dateistruktur sieht so aus:

```text
raketen-quiz/
├── index.html
├── game.js
├── styles.css
├── question/
│   ├── mathe.json
│   ├── physik.json
│   └── geschichte.json
├── imsmanifest.xml
├── katex.min.js
├── katex.min.css
└── fonts/
```

### Wichtige Dateien

| Datei oder Ordner | Funktion |
|---|---|
| `index.html` | Grundgerüst des Spiels |
| `game.js` | Spiellogik und SCORM-Anbindung |
| `styles.css` | Gestaltung des Spiels |
| `question/` | Ordner mit den Fragensätzen |
| `mathe.json` | Fragen für Mathematik |
| `physik.json` | Fragen für Physik |
| `imsmanifest.xml` | Steuerdatei für SCORM |
| `katex.min.js` | Darstellung mathematischer Formeln |
| `katex.min.css` | Gestaltung der KaTeX-Formeln |
| `fonts/` | Schriftarten für KaTeX |

---

## 🧩 Mehrere Fragensätze verwenden

In der JavaScript-Datei wird festgelegt, welche Fragensätze zur Verfügung stehen:

```js
const questionSets = {
    mathe: "question/mathe.json",
    physik: "question/physik.json",
    geschichte: "question/geschichte.json"
};
```

Ein Fragensatz kann anschließend über die URL geladen werden:

```text
index.html?set=mathe
```

```text
index.html?set=physik
```

```text
index.html?set=geschichte
```

Wenn kein Fragensatz angegeben wird, wird automatisch der Standard-Fragensatz geladen, zum Beispiel:

```js
const setName = params.get("set") || "mathe";
```

Nicht erlaubte oder unbekannte Namen werden auf den Standard-Fragensatz zurückgesetzt.

---

## 📝 Aufbau einer JSON-Datei

Jede JSON-Datei enthält eine Liste mit Fragen. Jede Frage benötigt diese vier Felder:

```json
[
    {
        "question": "Berechne: $12 + (-7)$",
        "answers": [
            "5",
            "-5",
            "19"
        ],
        "correctAnswer": 0,
        "explanation": "12 - 7 = 5. Das Ergebnis lautet daher 5."
    }
]
```

### Bedeutung der Felder

| Feld | Bedeutung |
|---|---|
| `question` | Frage oder Aufgabe |
| `answers` | Genau drei Antwortmöglichkeiten |
| `correctAnswer` | Position der richtigen Antwort |
| `explanation` | Kurze Erklärung zur Lösung |

### Werte für `correctAnswer`

Der Index beginnt bei `0`:

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

Die richtige Antwort ist hier die zweite Antwort. Deshalb lautet der Wert:

```json
"correctAnswer": 1
```

### Hinweise

- Jede Frage muss genau drei Antworten enthalten.
- Genau eine Antwort darf richtig sein.
- Die Reihenfolge der Antworten kann manuell verändert werden.
- Nach einer Änderung der Reihenfolge muss auch `correctAnswer` angepasst werden.
- Die Datei muss gültiges JSON enthalten.
- Zwischen den Objekten müssen Kommas stehen, nach dem letzten Objekt jedoch nicht.

---

## 📐 Mathematische Formeln mit KaTeX

Mathematische Formeln werden zwischen Dollarzeichen geschrieben:

```json
{
    "question": "Berechne: $2 \\cdot 3 + 4$",
    "answers": [
        "$10$",
        "$14$",
        "$12$"
    ],
    "correctAnswer": 0,
    "explanation": "$2 \\cdot 3 + 4 = 10$."
}
```

### Wichtig bei LaTeX in JSON

In JSON müssen Backslashes doppelt geschrieben werden:

```json
"$\\frac{1}{2}$"
```

Nicht korrekt wäre:

```json
"$\frac{1}{2}$"
```

Weitere Beispiele:

```json
"$x^2$"
```

```json
"$\\sqrt{25}$"
```

```json
"$\\frac{3}{4}$"
```

```json
"$F = m \\cdot a$"
```

---

## 🤖 Prompt zur Erstellung neuer Fragen

Den folgenden Prompt kannst du in einem KI-Assistenten verwenden. Im Hilfsbereich kannst du zusätzlich den passenden **Lehrplan** und geeignete **inhaltliche Links** hinterlegen.

```text
Du erstellst fachlich korrekte Quizfragen für ein digitales Schulquiz.

## Grundlage

Orientiere dich vorrangig an:

- dem im Hilfsbereich hinterlegten Lehrplan,
- den im Hilfsbereich angegebenen fachlichen Links,
- dem angegebenen Fach,
- der angegebenen Klassenstufe,
- dem gewünschten Thema,
- dem gewünschten Schwierigkeitsgrad.

Verwende keine Inhalte, die über den angegebenen Lehrplan oder die bereitgestellten Materialien hinausgehen, sofern dies nicht ausdrücklich gewünscht ist.

Wenn Lehrplan und Links unterschiedliche oder widersprüchliche Angaben enthalten, orientiere dich am Lehrplan und weise auf die Abweichung nur hin, wenn sie für die fachliche Richtigkeit wichtig ist.

## Angaben

Fach: [Mathematik oder Physik]

Klassenstufe: [z. B. 7]

Thema: [z. B. Rechnen mit ganzen Zahlen oder Kräfte]

Unterthema: [optional]

Schwierigkeitsgrad: [leicht, mittel oder schwer]

Anzahl der Fragen: [Anzahl]

Fragentyp: [Berechnung, Verständnisfrage, Anwendung oder gemischt]

Weitere Vorgaben: [optional]

## Anforderungen an die Fragen

- Erstelle genau die angegebene Anzahl an Fragen.
- Die Fragen müssen zur Klassenstufe passen.
- Formuliere jede Frage eindeutig und verständlich.
- Erstelle pro Frage genau drei Antwortmöglichkeiten.
- Genau eine Antwort darf richtig sein.
- Die falschen Antworten sollen typische Fehler abbilden.
- Die richtige Antwort darf nicht immer an derselben Position stehen.
- Verteile die richtigen Antworten möglichst gleichmäßig auf die Positionen 0, 1 und 2.
- Verwende keine Antworten wie „Alle Antworten sind richtig“.
- Prüfe bei Rechenaufgaben jeden Rechenschritt.
- Prüfe bei Physikaufgaben Größen, Einheiten, Vorzeichen und Formeln.
- Verwende nur geeignete Begriffe und Verfahren für die angegebene Klassenstufe.
- Gib zu jeder Frage eine kurze und verständliche Erklärung.
- Verwende mathematische Formeln zwischen Dollarzeichen.
- Schreibe in JSON-LaTeX alle Backslashes doppelt. Beispiel:
  "$\\frac{1}{2}$"

## Ausgabeformat

Gib ausschließlich gültiges JSON aus.

Verwende keine Überschrift, keinen Markdown-Codeblock und keine zusätzlichen Erklärungen außerhalb des JSON.

Das JSON muss genau dieses Format haben:

[
    {
        "question": "Frage oder Aufgabe",
        "answers": [
            "Antwort 1",
            "Antwort 2",
            "Antwort 3"
        ],
        "correctAnswer": 0,
        "explanation": "Kurze Erklärung der richtigen Lösung."
    }
]

## Bedeutung von correctAnswer

- 0 bedeutet: Die erste Antwort ist richtig.
- 1 bedeutet: Die zweite Antwort ist richtig.
- 2 bedeutet: Die dritte Antwort ist richtig.

## Prüfung vor der Ausgabe

Prüfe vor der Ausgabe:

- Ist jede Frage fachlich korrekt?
- Passt jede Frage zum Lehrplan und zur Klassenstufe?
- Gibt es genau drei Antworten?
- Ist genau eine Antwort richtig?
- Stimmt correctAnswer mit der richtigen Antwort überein?
- Sind die richtigen Antworten unterschiedlich positioniert?
- Sind alle Formeln gültige LaTeX-Formeln?
- Sind die Backslashes im JSON korrekt verdoppelt?
- Ist das Ergebnis gültiges JSON?
```

### Beispiel für eine konkrete Eingabe

```text
Erstelle 10 Fragen für Mathematik, Klassenstufe 7.

Thema: Rechnen mit ganzen Zahlen

Unterthemen:
- Addition und Subtraktion
- Multiplikation und Division
- Rechenregeln

Schwierigkeitsgrad: leicht bis mittel

Fragentyp: gemischt

Orientiere dich am hinterlegten Lehrplan. Gib ausschließlich gültiges JSON im vorgegebenen Format aus.
```

Für Physik:

```text
Erstelle 10 Fragen für Physik, Klassenstufe 8.

Thema: Kräfte

Unterthemen:
- Kraftwirkungen
- Kraftpfeile
- Einheit Newton
- Gewichtskraft

Schwierigkeitsgrad: mittel

Fragentyp: Verständnisfragen und einfache Berechnungen

Nutze ausschließlich Inhalte, die durch den hinterlegten Lehrplan und die angegebenen Links abgedeckt sind. Gib ausschließlich gültiges JSON aus.
```

---

## 📦 Als SCORM-Paket für Moodle oder mebis verpacken

### Dateien vorbereiten

Stelle sicher, dass alle benötigten Dateien vorhanden sind:

- `index.html`
- `game.js`
- `styles.css`
- der Ordner `question/`
- `imsmanifest.xml`
- KaTeX-Dateien
- der Ordner `fonts/`

### ZIP-Datei erstellen

Markiere alle Dateien und Ordner und erstelle daraus eine ZIP-Datei.

Unter Windows:

- Alle Dateien markieren.
- Rechtsklick auf die Auswahl.
- **Senden an → ZIP-komprimierter Ordner**

Unter macOS:

- Alle Dateien markieren.
- Rechtsklick.
- **Objekte komprimieren**

### Wichtig

Die Datei `imsmanifest.xml` muss direkt auf der obersten Ebene der ZIP-Datei liegen:

```text
richtig:
quiz.zip
├── imsmanifest.xml
├── index.html
└── game.js
```

Nicht korrekt:

```text
quiz.zip
└── raketen-quiz/
    ├── imsmanifest.xml
    ├── index.html
    └── game.js
```

### In Moodle oder mebis hochladen

- Öffne deinen Kurs.
- Aktiviere den Bearbeitungsmodus.
- Wähle **Aktivität oder Material hinzufügen**.
- Wähle **Lernpaket (SCORM)**.
- Lade die ZIP-Datei hoch.
- Speichere die Aktivität.

---

## 🎯 Bestehensgrenze anpassen

Standardmäßig gilt das Quiz ab 66 % als bestanden. Die entsprechende Stelle findest du in `game.js`:

```js
if (percent >= 66) {
    this.api.LMSSetValue(
        "cmi.core.lesson_status",
        "passed"
    );
}
```

Beispiel für eine Bestehensgrenze von 50 %:

```js
if (percent >= 50) {
    this.api.LMSSetValue(
        "cmi.core.lesson_status",
        "passed"
    );
}
```

---

## ⚠️ Fehlerbehebung

### Formeln werden nicht richtig angezeigt

Prüfe:

- Sind `katex.min.js` und `katex.min.css` eingebunden?
- Ist der Ordner `fonts/` vorhanden?
- Werden Backslashes in der JSON-Datei doppelt geschrieben?
- Stehen die Formeln zwischen Dollarzeichen?

Beispiel:

```json
"question": "Berechne $\\frac{2}{3} + \\frac{1}{3}$."
```

### Die richtige Antwort wird nicht erkannt

Prüfe den Wert von `correctAnswer`:

```text
0 = erste Antwort
1 = zweite Antwort
2 = dritte Antwort
```

### Eine JSON-Datei wird nicht geladen

Prüfe:

- Ist der Pfad korrekt?
- Existiert der Ordner `question/`?
- Stimmt der Name in `questionSets`?
- Wird das Quiz über einen Webserver oder Moodle geöffnet?

Beispiel:

```js
const questionSets = {
    mathe: "question/mathe.json",
    physik: "question/physik.json"
};
```

Das Quiz sollte lokal nicht direkt per Doppelklick auf `index.html` geöffnet werden, da Browser das Laden von JSON-Dateien aus Sicherheitsgründen blockieren können. Verwende zum Testen beispielsweise einen lokalen Webserver oder lade das Paket in Moodle beziehungsweise mebis hoch.

### SCORM funktioniert nicht

Prüfe:

- Liegt `imsmanifest.xml` direkt im Stammverzeichnis der ZIP-Datei?
- Wurde die gesamte ZIP-Datei hochgeladen?
- Sind alle Dateipfade korrekt?
- Ist die SCORM-Version in der Manifest-Datei korrekt angegeben?

---

## ✅ Checkliste vor dem Einsatz

- [ ] `index.html` funktioniert.
- [ ] `game.js` ist eingebunden.
- [ ] Die JSON-Datei ist gültig.
- [ ] Jede Frage enthält drei Antworten.
- [ ] `correctAnswer` verweist auf die richtige Antwort.
- [ ] Die Antworten sind nicht immer gleich angeordnet.
- [ ] Die Formeln werden korrekt angezeigt.
- [ ] Alle Fragensätze liegen im Ordner `question/`.
- [ ] Die URL lädt den gewünschten Fragensatz.
- [ ] `imsmanifest.xml` liegt direkt im ZIP-Stammverzeichnis.
- [ ] Das SCORM-Paket wurde in Moodle oder mebis getestet.

---

*Entwickelt für den Einsatz im schulischen Unterricht. Das Projekt kann für Mathematik, Physik und weitere Fächer angepasst werden.*
