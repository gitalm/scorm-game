#!/usr/bin/env bash

set -euo pipefail

# ==================================================
# SCORM-Paket erstellen
# ==================================================

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUESTION_DIR="$PROJECT_DIR/question"

if [[ ! -d "$QUESTION_DIR" ]]; then
    echo "Fehler: Der Ordner question wurde nicht gefunden."
    exit 1
fi

# JSON-Dateien im Ordner question suchen
mapfile -t JSON_FILES < <(
    find "$QUESTION_DIR" \
        -maxdepth 1 \
        -type f \
        -name "*.json" \
        ! -name "sets.json" \
        -printf "%f\n" |
    sort
)

if [[ ${#JSON_FILES[@]} -eq 0 ]]; then
    echo "Fehler: Keine JSON-Dateien in question gefunden."
    exit 1
fi

echo
echo "=========================================="
echo " SCORM-Raketenquiz erstellen"
echo "=========================================="
echo
echo "Wähle den Fragensatz aus:"
echo

for i in "${!JSON_FILES[@]}"; do
    echo "  $((i + 1))) ${JSON_FILES[$i]}"
done

echo

while true; do
    read -r -p "Nummer auswählen [1-${#JSON_FILES[@]}]: " CHOICE

    if [[ "$CHOICE" =~ ^[0-9]+$ ]] &&
       (( CHOICE >= 1 && CHOICE <= ${#JSON_FILES[@]} )); then
        break
    fi

    echo "Ungültige Auswahl. Bitte erneut versuchen."
done

SELECTED_FILE="${JSON_FILES[$((CHOICE - 1))]}"
SOURCE_FILE="$QUESTION_DIR/$SELECTED_FILE"

echo
echo "Ausgewählt:"
echo "  $SELECTED_FILE"
echo

# Namen ohne .json für den ZIP-Dateinamen verwenden
BASE_NAME="${SELECTED_FILE%.json}"
DEFAULT_ZIP="$PROJECT_DIR/scorm-${BASE_NAME}.zip"

read -r -p \
    "Name der ZIP-Datei [$DEFAULT_ZIP]: " OUTPUT_ZIP

if [[ -z "$OUTPUT_ZIP" ]]; then
    OUTPUT_ZIP="$DEFAULT_ZIP"
elif [[ "$OUTPUT_ZIP" != /* ]]; then
    OUTPUT_ZIP="$PROJECT_DIR/$OUTPUT_ZIP"
fi

# .zip automatisch ergänzen
if [[ "$OUTPUT_ZIP" != *.zip ]]; then
    OUTPUT_ZIP="${OUTPUT_ZIP}.zip"
fi

# Temporären Exportordner anlegen
TEMP_DIR="$(mktemp -d)"

cleanup() {
    rm -rf "$TEMP_DIR"
}

trap cleanup EXIT

echo
echo "Kopiere Projektdateien ..."

# Gesamten Projektordner in den temporären Ordner kopieren
cp -R "$PROJECT_DIR"/. "$TEMP_DIR"/

# Alte ZIP-Dateien und das Erstellskript aus dem Export entfernen
find "$TEMP_DIR" \
    -maxdepth 1 \
    -type f \
    -name "*.zip" \
    -delete

rm -f "$TEMP_DIR/make-scorm.sh"

# Ausgewählte Datei als default.json einsetzen
cp "$SOURCE_FILE" \
   "$TEMP_DIR/question/default.json"

# Vorhandene Zieldatei überschreiben
rm -f "$OUTPUT_ZIP"

echo "Erstelle SCORM-Paket ..."

(
    cd "$TEMP_DIR"

    # imsmanifest.xml liegt dadurch direkt im ZIP-Hauptverzeichnis.
    zip -qr "$OUTPUT_ZIP" .
)

echo
echo "=========================================="
echo " SCORM-Paket wurde erstellt"
echo "=========================================="
echo
echo "Datei:"
echo "  $OUTPUT_ZIP"
echo
echo "Verwendete Fragen:"
echo "  $SELECTED_FILE"
echo
echo "Im Paket gespeichert als:"
echo "  question/default.json"
echo
