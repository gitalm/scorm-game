# 🚀 Raketen-Quiz (SCORM & Moodle/mebis)

Ein interaktives, gamifiziertes Lernspiel auf HTML5-Basis, das speziell für den Einsatz in Lernmanagementsystemen (LMS) wie **Moodle** oder **mebis (Bayerische Cloud Schule - ByCS)** entwickelt wurde.

## 🌟 Features
- **Gamification:** Steuere eine Rakete durch den Weltraum und triff die richtige Antwort.
- **Mathematik-Support:** Volle Unterstützung für Formeln durch **KaTeX**.
- **SCORM 1.2:** Automatische Übertragung der Punkte an das LMS.
- **Bestehenslogik:** Setzt den Status in Moodle/mebis automatisch auf "Bestanden", wenn mehr als 66% der Fragen korrekt beantwortet wurden.
- **Flexibilität:** Funktioniert für Mathe, Physik, Sprachen oder Sachfächer durch einfaches Austauschen einer JSON-Datei.
- **Responsive Design:** Spielbar auf PCs (Tastatur) und Tablets/Smartphones (Touch).

---

## 📂 Dateistruktur
Damit das Spiel (und der SCORM-Export) funktioniert, müssen folgende Dateien im **Hauptverzeichnis** liegen:

- `index.html` – Das Grundgerüst.
- `game.js` – Die Spiellogik & SCORM-Anbindung.
- `styles.css` – Das Design.
- `question.json` – Deine Fragen und Antworten.
- `imsmanifest.xml` – Die Steuerdatei für Moodle/mebis.
- `katex.min.js` / `katex.min.css` – Für mathematische Formeln.
- `fonts/` – (Ordner) Enthält die KaTeX-Schriftarten.

---

## ✍️ Eigene Inhalte erstellen (JSON-Prompt)

Du kannst die Inhalte des Spiels ganz einfach mit einer KI (wie ChatGPT oder ByLKI) erstellen lassen. Kopiere dazu den folgenden Prompt:

> **Prompt für die KI:**
> "Erstelle eine JSON-Datei für ein Raketen-Quiz. Das Thema ist [DEIN THEMA, z.B. Bruchrechnen]. 
> Erstelle [ANZAHL, z.B. 15] Fragen. 
> Jedes Objekt in der Liste muss folgende Felder haben:
> - 'question': Die Frage (nutze $...$ für mathematische Formeln).
> - 'answers': Eine Liste mit genau 3 Antwortmöglichkeiten.
> - 'correctAnswer': Der Index der richtigen Antwort (0, 1 oder 2).
> - 'explanation': Eine kurze Erklärung, warum die Antwort richtig ist.
> 
> **WICHTIG:** Da es eine JSON-Datei ist, verwende für alle LaTeX-Befehle doppelte Backslashes (z.B. `\\frac{1}{2}` statt `\frac{1}{2}`). Gib nur den reinen JSON-Code aus."

---

## 📦 Anleitung: Als SCORM-Paket für Moodle/mebis packen

Um das Spiel in deinen Kurs hochzuladen, musst du es als SCORM-Paket "schnüren":

1. **Dateien vorbereiten:** Stelle sicher, dass die `imsmanifest.xml` im selben Ordner wie die `index.html` liegt.
2. **Dateien markieren:** Markiere **alle** oben genannten Dateien und Ordner (index, game, styles, question, manifest, katex-files, fonts-ordner).
3. **Zippen:** 
   - *Windows:* Rechtsklick -> "Senden an" -> "ZIP-komprimierter Ordner".
   - *Mac:* Rechtsklick -> "[Anzahl] Objekte komprimieren".
   - **Wichtig:** Die `imsmanifest.xml` darf **nicht** in einem Unterordner innerhalb des Zips liegen, sondern muss direkt auf der obersten Ebene erscheinen!
4. **Hochladen:**
   - Gehe in deinen Moodle- oder mebis-Kurs.
   - Aktiviere den Bearbeitungsmodus.
   - Wähle "Aktivität oder Material hinzufügen" -> **Lernpaket (SCORM)**.
   - Lade deine erstellte `.zip`-Datei hoch und speichere.

---

## 🛠️ Anpassung der Bestehensgrenze
Standardmäßig ist die Bestehensgrenze in der `game.js` auf **66%** eingestellt. Möchtest du dies ändern, suche in der `game.js` nach folgendem Abschnitt und passe die Zahl an:

```javascript
if (percent >= 66) { 
    this.api.LMSSetValue("cmi.core.lesson_status", "passed"); 
}
```

---

## ⚠️ Bekannte Fehler & Lösungen
- **Formeln werden nicht angezeigt:** Prüfe in der `question.json`, ob du doppelte Backslashes (`\\`) verwendet hast.
- **SCORM-Fehler in Moodle:** Stelle sicher, dass die ZIP-Datei die `imsmanifest.xml` direkt im Stammverzeichnis enthält.
- **Ladefehler (JSON):** Wenn du das Spiel lokal (ohne Server) startest, blockieren Browser oft das Laden der JSON-Datei. Nutze in VS Code die Erweiterung "Live Server" oder lade es direkt in Moodle hoch, um es zu testen.

---

*Entwickelt für Lehrkräfte an bayerischen Schulen. Erstellt mit Unterstützung der ByLKI (ALP Dillingen).*
