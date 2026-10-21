#!/usr/bin/env bash

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
QUESTION_DIR="$PROJECT_DIR/question"
BUILD_DIR="$PROJECT_DIR/release-build"

RELEASE_TAG="${1:-v1.0.0}"
RELEASE_TITLE="${2:-Learnrocket $RELEASE_TAG}"

if ! command -v gh >/dev/null 2>&1; then
    echo "Fehler: Die GitHub CLI 'gh' ist nicht installiert."
    echo "Installation: sudo apt install gh"
    exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
    echo "Fehler: zip ist nicht installiert."
    echo "Installation: sudo apt install zip"
    exit 1
fi

if [[ ! -d "$QUESTION_DIR" ]]; then
    echo "Fehler: Der Ordner question/ wurde nicht gefunden."
    exit 1
fi

if [[ ! -f "$PROJECT_DIR/index.html" ]]; then
    echo "Fehler: index.html wurde nicht gefunden."
    exit 1
fi

if [[ ! -f "$PROJECT_DIR/game.js" ]]; then
    echo "Fehler: game.js wurde nicht gefunden."
    exit 1
fi

if [[ ! -f "$PROJECT_DIR/styles.css" ]]; then
    echo "Fehler: styles.css wurde nicht gefunden."
    exit 1
fi

# Prüfen, ob gh angemeldet ist
if ! gh auth status >/dev/null 2>&1; then
    echo "Fehler: Nicht bei GitHub angemeldet."
    echo "Bitte zuerst ausführen:"
    echo "  gh auth login"
    exit 1
fi

# Prüfen, ob ein GitHub-Repository erkannt wird
if ! gh repo view >/dev/null 2>&1; then
    echo "Fehler: Kein GitHub-Repository erkannt."
    exit 1
fi

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

shopt -s nullglob

QUESTION_FILES=("$QUESTION_DIR"/*.json)

if [[ ${#QUESTION_FILES[@]} -eq 0 ]]; then
    echo "Fehler: Keine JSON-Dateien in question/ gefunden."
    exit 1
fi

CREATED_PACKAGES=()

for QUESTION_FILE in "${QUESTION_FILES[@]}"; do
    FILE_NAME="$(basename "$QUESTION_FILE")"

    # Verwaltungsdatei überspringen
    if [[ "$FILE_NAME" == "sets.json" ]]; then
        continue
    fi

    SET_ID="${FILE_NAME%.json}"
    PACKAGE_NAME="learnrocket-${SET_ID}-scorm.zip"
    PACKAGE_DIR="$BUILD_DIR/$SET_ID"

    echo
    echo "Erzeuge SCORM-Paket für: $SET_ID"

    mkdir -p "$PACKAGE_DIR/question"

    # Allgemeine Dateien kopieren
    cp "$PROJECT_DIR/index.html" "$PACKAGE_DIR/"
    cp "$PROJECT_DIR/game.js" "$PACKAGE_DIR/"
    cp "$PROJECT_DIR/styles.css" "$PACKAGE_DIR/"

    # Optionale KaTeX-Dateien
    [[ -f "$PROJECT_DIR/katex.min.js" ]] &&
        cp "$PROJECT_DIR/katex.min.js" "$PACKAGE_DIR/"

    [[ -f "$PROJECT_DIR/katex.min.css" ]] &&
        cp "$PROJECT_DIR/katex.min.css" "$PACKAGE_DIR/"

    # Optionalen fonts-Ordner kopieren
    if [[ -d "$PROJECT_DIR/fonts" ]]; then
        cp -r "$PROJECT_DIR/fonts" "$PACKAGE_DIR/"
    fi

    # Ausgewählte JSON-Datei kopieren
    cp "$QUESTION_FILE" \
        "$PACKAGE_DIR/question/$FILE_NAME"

    # Dynamische sets.json für genau dieses Paket
    cat > "$PACKAGE_DIR/question/sets.json" <<EOF
{
    "$SET_ID": {
        "title": "$SET_ID",
        "file": "question/$FILE_NAME"
    }
}
EOF

    # Manifest beginnen
    cat > "$PACKAGE_DIR/imsmanifest.xml" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<manifest
    identifier="Learnrocket_${SET_ID}"
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
            <title>Learnrocket – $SET_ID</title>
            <item identifier="item_1" identifierref="res_1">
                <title>$SET_ID</title>
            </item>
        </organization>
    </organizations>

    <resources>
        <resource
            identifier="res_1"
            type="webcontent"
            adlcp:scormtype="sco"
            href="index.html">

            <file href="index.html"/>
            <file href="game.js"/>
            <file href="styles.css"/>
EOF

    [[ -f "$PACKAGE_DIR/katex.min.js" ]] &&
        echo '            <file href="katex.min.js"/>' \
        >> "$PACKAGE_DIR/imsmanifest.xml"

    [[ -f "$PACKAGE_DIR/katex.min.css" ]] &&
        echo '            <file href="katex.min.css"/>' \
        >> "$PACKAGE_DIR/imsmanifest.xml"

    cat >> "$PACKAGE_DIR/imsmanifest.xml" <<EOF
            <file href="question/sets.json"/>
            <file href="question/$FILE_NAME"/>
        </resource>
    </resources>
</manifest>
EOF

    # ZIP erzeugen
    (
        cd "$PACKAGE_DIR"
        zip -qr "$BUILD_DIR/$PACKAGE_NAME" .
    )

    CREATED_PACKAGES+=("$BUILD_DIR/$PACKAGE_NAME")

    echo "Erstellt: $BUILD_DIR/$PACKAGE_NAME"
done

shopt -u nullglob

if [[ ${#CREATED_PACKAGES[@]} -eq 0 ]]; then
    echo "Fehler: Es wurden keine Pakete erstellt."
    exit 1
fi

echo
echo "Folgende Pakete wurden erstellt:"
for PACKAGE in "${CREATED_PACKAGES[@]}"; do
    echo "  - $(basename "$PACKAGE")"
done

echo
read -r -p \
    "Release $RELEASE_TAG jetzt auf GitHub veröffentlichen? [j/N]: " \
    CREATE_RELEASE

if [[ ! "$CREATE_RELEASE" =~ ^[JjYy]$ ]]; then
    echo
    echo "Die ZIP-Dateien liegen in:"
    echo "  $BUILD_DIR"
    exit 0
fi

# Release anlegen und alle ZIP-Dateien hochladen
gh release create "$RELEASE_TAG" \
    "${CREATED_PACKAGES[@]}" \
    --title "$RELEASE_TITLE" \
    --notes "SCORM-Pakete für Learnrocket."

echo
echo "GitHub-Release erfolgreich erstellt:"
gh release view "$RELEASE_TAG" --web
