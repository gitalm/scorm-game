#!/usr/bin/env bash

set -euo pipefail

# ---------------------------------------------
# Einstellungen
# ---------------------------------------------

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUESTION_DIR="$PROJECT_DIR/question"
OUTPUT_DIR="$PROJECT_DIR/scorm-build"
PACKAGE_NAME="raketen-quiz-scorm.zip"

MANIFEST_FILE="$OUTPUT_DIR/imsmanifest.xml"
PACKAGE_DIR="$OUTPUT_DIR/package"

# ---------------------------------------------
# Prüfen, ob notwendige Dateien vorhanden sind
# ---------------------------------------------

required_files=(
    "index.html"
    "game.js"
    "styles.css"
)

for file in "${required_files[@]}"; do
    if [[ ! -f "$PROJECT_DIR/$file" ]]; then
        echo "Fehler: Datei fehlt: $file"
        exit 1
    fi
done

if [[ ! -d "$QUESTION_DIR" ]]; then
    echo "Fehler: Der Ordner 'question' wurde nicht gefunden."
    exit 1
fi

# ---------------------------------------------
# JSON-Fragensätze finden
# ---------------------------------------------

mapfile -t QUESTION_FILES < <(
    find "$QUESTION_DIR" \
        -maxdepth 1 \
        -type f \
        -iname "*.json" \
        -printf "%f\n" \
        | sort
)

if [[ ${#QUESTION_FILES[@]} -eq 0 ]]; then
    echo "Fehler: Keine JSON-Dateien im Ordner 'question' gefunden."
    exit 1
fi

echo
echo "Verfügbare Fragensätze:"
echo

for index in "${!QUESTION_FILES[@]}"; do
    filename="${QUESTION_FILES[$index]}"
    display_name="${filename%.json}"

    echo "  $((index + 1))) $display_name"
done

echo
echo "Welche Fragensätze sollen in das SCORM-Paket aufgenommen werden?"
echo
echo "  - Eine Nummer eingeben, zum Beispiel: 1"
echo "  - Mehrere Nummern mit Leerzeichen, zum Beispiel: 1 2 3"
echo "  - 'a' für alle Fragensätze"
echo

read -r -p "Auswahl: " selection

# ---------------------------------------------
# Auswahl verarbeiten
# ---------------------------------------------

SELECTED_FILES=()

if [[ "$selection" == "a" || "$selection" == "A" ]]; then
    SELECTED_FILES=("${QUESTION_FILES[@]}")
else
    for number in $selection; do
        if ! [[ "$number" =~ ^[0-9]+$ ]]; then
            echo "Fehler: Ungültige Auswahl: $number"
            exit 1
        fi

        index=$((number - 1))

        if (( index < 0 || index >= ${#QUESTION_FILES[@]} )); then
            echo "Fehler: Auswahl außerhalb des gültigen Bereichs: $number"
            exit 1
        fi

        selected_file="${QUESTION_FILES[$index]}"

        # Doppelte Auswahl vermeiden
        already_selected=false

        for existing in "${SELECTED_FILES[@]}"; do
            if [[ "$existing" == "$selected_file" ]]; then
                already_selected=true
                break
            fi
        done

        if [[ "$already_selected" == false ]]; then
            SELECTED_FILES+=("$selected_file")
        fi
    done
fi

if [[ ${#SELECTED_FILES[@]} -eq 0 ]]; then
    echo "Fehler: Kein Fragensatz ausgewählt."
    exit 1
fi

echo
echo "Ausgewählte Fragensätze:"
for file in "${SELECTED_FILES[@]}"; do
    echo "  - $file"
done

# ---------------------------------------------
# Alten Build-Ordner entfernen
# ---------------------------------------------

rm -rf "$OUTPUT_DIR"

mkdir -p "$PACKAGE_DIR/question"

# ---------------------------------------------
# Grunddateien kopieren
# ---------------------------------------------

copy_if_exists() {
    local source="$1"
    local destination="$2"

    if [[ -f "$source" ]]; then
        cp "$source" "$destination"
        echo "Kopiert: $(basename "$source")"
    fi
}

copy_if_exists "$PROJECT_DIR/index.html" "$PACKAGE_DIR/index.html"
copy_if_exists "$PROJECT_DIR/game.js" "$PACKAGE_DIR/game.js"
copy_if_exists "$PROJECT_DIR/styles.css" "$PACKAGE_DIR/styles.css"
copy_if_exists "$PROJECT_DIR/katex.min.js" "$PACKAGE_DIR/katex.min.js"
copy_if_exists "$PROJECT_DIR/katex.min.css" "$PACKAGE_DIR/katex.min.css"

# ---------------------------------------------
# Fonts-Ordner kopieren, falls vorhanden
# ---------------------------------------------

if [[ -d "$PROJECT_DIR/fonts" ]]; then
    cp -r "$PROJECT_DIR/fonts" "$PACKAGE_DIR/fonts"
    echo "Kopiert: fonts/"
fi

# ---------------------------------------------
# Ausgewählte Fragensätze kopieren
# ---------------------------------------------

for file in "${SELECTED_FILES[@]}"; do
    cp "$QUESTION_DIR/$file" "$PACKAGE_DIR/question/$file"
    echo "Kopiert: question/$file"
done

# ---------------------------------------------
# XML-Dateinamen absichern
# ---------------------------------------------

xml_escape() {
    local value="$1"

    value="${value//&/&amp;}"
    value="${value//</&lt;}"
    value="${value//>/&gt;}"
    value="${value//\"/&quot;}"
    value="${value//\'/&apos;}"

    printf '%s' "$value"
}

# ---------------------------------------------
# imsmanifest.xml erzeugen
# ---------------------------------------------

cat > "$MANIFEST_FILE" <<'XML_HEADER'
<?xml version="1.0" encoding="UTF-8"?>
<manifest
    identifier="RaketenQuiz_1"
    version="1.0"
    xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
    xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="
        http://www.imsproject.org/xsd/imscp_rootv1p1p2
        imscp_rootv1p1p2.xsd
        http://www.adlnet.org/xsd/adlcp_rootv1p2
        adlcp_rootv1p2.xsd">

    <metadata>
        <schema>ADL SCORM</schema>
        <schemaversion>1.2</schemaversion>
    </metadata>

    <organizations default="org_1">
        <organization identifier="org_1">
            <title>ByLKI Raketen Quiz</title>

            <item
                identifier="item_1"
                identifierref="res_1">

                <title>Raketen Quiz</title>
            </item>
        </organization>
    </organizations>

    <resources>
        <resource
            identifier="res_1"
            type="webcontent"
            adlcp:scormtype="sco"
            href="index.html">

XML_HEADER

# Grunddateien in das Manifest eintragen
for file in \
    "index.html" \
    "game.js" \
    "styles.css" \
    "katex.min.js" \
    "katex.min.css"; do

    if [[ -f "$PACKAGE_DIR/$file" ]]; then
        escaped_file="$(xml_escape "$file")"
        echo "            <file href=\"$escaped_file\"/>" >> "$MANIFEST_FILE"
    fi
done

# Fragensätze eintragen
for file in "${SELECTED_FILES[@]}"; do
    escaped_file="$(xml_escape "question/$file")"
    echo "            <file href=\"$escaped_file\"/>" >> "$MANIFEST_FILE"
done

# Fonts eintragen
if [[ -d "$PACKAGE_DIR/fonts" ]]; then
    while IFS= read -r -d '' font_file; do
        relative_path="${font_file#"$PACKAGE_DIR"/}"
        escaped_path="$(xml_escape "$relative_path")"

        echo "            <file href=\"$escaped_path\"/>" \
            >> "$MANIFEST_FILE"
    done < <(
        find "$PACKAGE_DIR/fonts" \
            -type f \
            -print0
    )
fi

cat >> "$MANIFEST_FILE" <<'XML_FOOTER'

        </resource>
    </resources>
</manifest>
XML_FOOTER

cp "$MANIFEST_FILE" "$PACKAGE_DIR/imsmanifest.xml"

# ---------------------------------------------
# ZIP-Datei erstellen
# ---------------------------------------------

cd "$PACKAGE_DIR"

rm -f "$OUTPUT_DIR/$PACKAGE_NAME"

zip -r "$OUTPUT_DIR/$PACKAGE_NAME" . \
    >/dev/null

cd "$PROJECT_DIR"

echo
echo "SCORM-Paket erfolgreich erstellt:"
echo
echo "  $OUTPUT_DIR/$PACKAGE_NAME"
echo
echo "Enthaltene Fragensätze:"
for file in "${SELECTED_FILES[@]}"; do
    echo "  - question/$file"
done

echo
echo "Die Datei imsmanifest.xml liegt direkt im ZIP-Stammverzeichnis."