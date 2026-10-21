#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUESTION_DIR="$PROJECT_DIR/question"
SETS_FILE="$QUESTION_DIR/sets.json"

if [[ ! -d "$QUESTION_DIR" ]]; then
    echo "Fehler: Der Ordner question/ wurde nicht gefunden."
    exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
    echo "Fehler: jq ist nicht installiert."
    echo "Installation:"
    echo "  sudo apt install jq"
    exit 1
fi

# sets.json anlegen, falls noch nicht vorhanden
if [[ ! -f "$SETS_FILE" ]]; then
    echo "{}" > "$SETS_FILE"
fi

# sets.json auf gültiges JSON prüfen
if ! jq empty "$SETS_FILE" >/dev/null 2>&1; then
    echo "Fehler: $SETS_FILE enthält ungültiges JSON."
    exit 1
fi

if [[ "$(jq -r 'type' "$SETS_FILE")" != "object" ]]; then
    echo "Fehler: sets.json muss ein JSON-Objekt enthalten."
    exit 1
fi

# Sicherung erstellen
BACKUP_FILE="$SETS_FILE.bak-$(date +%Y%m%d-%H%M%S)"
cp "$SETS_FILE" "$BACKUP_FILE"

TEMP_FILE="$(mktemp)"
cp "$SETS_FILE" "$TEMP_FILE"

FOUND=0
ADDED=0

# Nur JSON-Dateien direkt im Ordner question/ durchsuchen
shopt -s nullglob

for JSON_FILE in "$QUESTION_DIR"/*.json; do
    FILE_NAME="$(basename "$JSON_FILE")"

    # sets.json ist kein Fragensatz
    if [[ "$FILE_NAME" == "sets.json" ]]; then
        continue
    fi

    FOUND=$((FOUND + 1))

    SET_ID="${FILE_NAME%.json}"
    QUESTION_PATH="question/$FILE_NAME"

    # Prüfen, ob der Eintrag bereits vorhanden ist
    EXISTING_ENTRY="$(
        jq -r --arg id "$SET_ID" '
            has($id)
        ' "$TEMP_FILE"
    )"

    if [[ "$EXISTING_ENTRY" == "true" ]]; then
        echo "Bereits vorhanden: $FILE_NAME"
        continue
    fi

    # Automatischen Titel erzeugen
    SET_TITLE="$SET_ID"
    SET_TITLE="${SET_TITLE//_/ }"
    SET_TITLE="${SET_TITLE//-/ }"

    # Ersten Buchstaben großschreiben
    SET_TITLE="$(printf '%s' "$SET_TITLE" | sed 's/^./\U&/')"

    NEXT_TEMP="$(mktemp)"

    jq \
        --arg id "$SET_ID" \
        --arg title "$SET_TITLE" \
        --arg file "$QUESTION_PATH" \
        '.[$id] = {
            title: $title,
            file: $file
        }' \
        "$TEMP_FILE" > "$NEXT_TEMP"

    mv "$NEXT_TEMP" "$TEMP_FILE"

    echo "Ergänzt: $FILE_NAME"
    ADDED=$((ADDED + 1))
done

shopt -u nullglob

# Aktualisierte sets.json übernehmen
mv "$TEMP_FILE" "$SETS_FILE"

echo
echo "=========================================="
echo " sets.json aktualisiert"
echo "=========================================="
echo
echo "Gefundene JSON-Dateien: $FOUND"
echo "Neue Einträge:          $ADDED"
echo "Sicherung:              $BACKUP_FILE"
echo
echo "Aktuelle Fragensätze:"
echo

jq -r '
    to_entries[] |
    "  - \(.key): \(.value.title) -> \(.value.file)"
' "$SETS_FILE"
