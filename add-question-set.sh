#!/usr/bin/env bash

set -euo pipefail

# ==================================================
# Neues JSON-Fragenset hinzufügen
# - kopiert eine JSON-Datei nach question/
# - ergänzt den Eintrag in question/sets.json
# - erstellt vorher eine Sicherung von sets.json
# ==================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUESTION_DIR="$PROJECT_DIR/question"
SETS_FILE="$QUESTION_DIR/sets.json"

if [[ ! -d "$QUESTION_DIR" ]]; then
    echo "Fehler: Der Ordner question wurde nicht gefunden."
    exit 1
fi

if [[ ! -f "$SETS_FILE" ]]; then
    echo "Fehler: question/sets.json wurde nicht gefunden."
    exit 1
fi

echo
echo "=========================================="
echo " Neues Fragenset hinzufügen"
echo "=========================================="
echo

read -r -p "Pfad zur JSON-Datei: " SOURCE_FILE

if [[ -z "$SOURCE_FILE" ]]; then
    echo "Fehler: Es wurde keine Datei angegeben."
    exit 1
fi

if [[ "$SOURCE_FILE" != /* ]]; then
    SOURCE_FILE="$PROJECT_DIR/$SOURCE_FILE"
fi

if [[ ! -f "$SOURCE_FILE" ]]; then
    echo "Fehler: Datei nicht gefunden:"
    echo "  $SOURCE_FILE"
    exit 1
fi

if [[ "${SOURCE_FILE##*.}" != "json" ]]; then
    echo "Fehler: Die Datei muss die Endung .json besitzen."
    exit 1
fi

# Dateiname ohne Endung als Vorschlag verwenden
SOURCE_NAME="$(basename "$SOURCE_FILE")"
DEFAULT_ID="${SOURCE_NAME%.json}"

read -r -p "ID [$DEFAULT_ID]: " SET_ID

if [[ -z "$SET_ID" ]]; then
    SET_ID="$DEFAULT_ID"
fi

# Nur einfache, sichere IDs erlauben
if [[ ! "$SET_ID" =~ ^[A-Za-z0-9_-]+$ ]]; then
    echo "Fehler: Die ID darf nur Buchstaben, Zahlen, _ und - enthalten."
    exit 1
fi

read -r -p "Titel des Fragensets [$SET_ID]: " SET_TITLE

if [[ -z "$SET_TITLE" ]]; then
    SET_TITLE="$SET_ID"
fi

TARGET_FILE="$QUESTION_DIR/$SET_ID.json"
QUESTION_PATH="question/$SET_ID.json"

if [[ -f "$TARGET_FILE" ]]; then
    echo
    echo "Die Datei existiert bereits:"
    echo "  $TARGET_FILE"

    read -r -p "Überschreiben? [j/N]: " OVERWRITE

    if [[ ! "$OVERWRITE" =~ ^[JjYy]$ ]]; then
        echo "Vorgang abgebrochen."
        exit 0
    fi
fi

# Prüfen, ob die JSON-Datei gültig ist
if ! python3 - "$SOURCE_FILE" <<'PY'
import json
import sys

filename = sys.argv[1]

try:
    with open(filename, "r", encoding="utf-8") as file:
        data = json.load(file)

    if not isinstance(data, list) or len(data) == 0:
        raise ValueError(
            "Die Datei muss ein nicht-leeres JSON-Array enthalten."
        )

except Exception as error:
    print(f"Ungültige JSON-Datei: {error}")
    sys.exit(1)
PY
then
    exit 1
fi

# Prüfen, ob die ID bereits in sets.json vorhanden ist
if ! python3 - "$SETS_FILE" "$SET_ID" <<'PY'
import json
import sys

sets_file = sys.argv[1]
set_id = sys.argv[2]

with open(sets_file, "r", encoding="utf-8") as file:
    data = json.load(file)

if set_id in data:
    print(f"Die ID '{set_id}' ist bereits in sets.json vorhanden.")
    sys.exit(1)
PY
then
    read -r -p "Trotzdem fortfahren? [j/N]: " CONTINUE

    if [[ ! "$CONTINUE" =~ ^[JjYy]$ ]]; then
        echo "Vorgang abgebrochen."
        exit 0
    fi
fi

# JSON-Datei kopieren
cp "$SOURCE_FILE" "$TARGET_FILE"

# Sicherung erstellen
BACKUP_FILE="$SETS_FILE.bak-$(date +%Y%m%d-%H%M%S)"
cp "$SETS_FILE" "$BACKUP_FILE"

# sets.json mit Python sicher aktualisieren
python3 - "$SETS_FILE" "$SET_ID" "$SET_TITLE" "$QUESTION_PATH" <<'PY'
import json
import sys

sets_file = sys.argv[1]
set_id = sys.argv[2]
set_title = sys.argv[3]
question_path = sys.argv[4]

with open(sets_file, "r", encoding="utf-8") as file:
    data = json.load(file)

if not isinstance(data, dict):
    raise ValueError("sets.json muss ein JSON-Objekt enthalten.")

data[set_id] = {
    "title": set_title,
    "file": question_path
}

with open(sets_file, "w", encoding="utf-8") as file:
    json.dump(data, file, ensure_ascii=False, indent=4)
    file.write("\n")
PY

echo
echo "=========================================="
echo " Fragenset erfolgreich hinzugefügt"
echo "=========================================="
echo
echo "JSON-Datei:"
echo "  $TARGET_FILE"
echo
echo "Eintrag in sets.json:"
echo "  \"$SET_ID\": {"
echo "      \"title\": \"$SET_TITLE\","
echo "      \"file\": \"$QUESTION_PATH\""
echo "  }"
echo
echo "Sicherung:"
echo "  $BACKUP_FILE"
echo
