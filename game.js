// ==================================================
// SCORM 1.2
// ==================================================

const SCORM = {
    api: null,
    initialized: false,
    finished: false,

    findAPI(currentWindow) {
        let attempts = 0;

        while (
            currentWindow &&
            !currentWindow.API &&
            currentWindow.parent &&
            currentWindow.parent !== currentWindow &&
            attempts < 500
        ) {
            attempts++;
            currentWindow = currentWindow.parent;
        }

        return currentWindow?.API || null;
    },

    init() {
        if (this.initialized) return true;

        this.api = this.findAPI(window);

        if (!this.api && window.opener) {
            this.api = this.findAPI(window.opener);
        }

        if (!this.api) {
            console.warn(
                "Keine SCORM-1.2-API gefunden. " +
                "Das Spiel läuft trotzdem weiter."
            );
            return false;
        }

        const result = this.api.LMSInitialize("");

        if (result !== "true") {
            console.warn("SCORM konnte nicht initialisiert werden.");
            return false;
        }

        this.initialized = true;

        this.api.LMSSetValue(
            "cmi.core.lesson_status",
            "incomplete"
        );

        this.api.LMSCommit("");

        return true;
    },

    setScore(score, maxScore) {
        if (!this.initialized || !this.api) return;

        const percentage =
            maxScore > 0 ? score / maxScore : 0;

        this.api.LMSSetValue(
            "cmi.core.score.min",
            "0"
        );

        this.api.LMSSetValue(
            "cmi.core.score.max",
            String(maxScore)
        );

        this.api.LMSSetValue(
            "cmi.core.score.raw",
            String(score)
        );

        this.api.LMSCommit("");

        return percentage;
    },

    finish(score, maxScore, passLimit = 0.66) {
        if (
            !this.initialized ||
            !this.api ||
            this.finished
        ) {
            return;
        }

        const percentage =
            maxScore > 0 ? score / maxScore : 0;

        this.setScore(score, maxScore);

        const status =
            percentage >= passLimit
                ? "passed"
                : "failed";

        this.api.LMSSetValue(
            "cmi.core.lesson_status",
            status
        );

        this.api.LMSSetValue(
            "cmi.core.exit",
            ""
        );

        this.api.LMSCommit("");
        this.api.LMSFinish("");

        this.finished = true;
        this.initialized = false;
    }
};


// ==================================================
// Ton
// ==================================================

const Sound = {
    ctx: null,
    isMuted: true,

    init() {
        if (!this.ctx) {
            const AudioContext =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioContext) return;

            this.ctx = new AudioContext();
        }

        if (this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    },

    play(frequency, type, duration) {
        if (!this.ctx || this.isMuted) return;

        const oscillator =
            this.ctx.createOscillator();

        const gain =
            this.ctx.createGain();

        oscillator.type = type;

        oscillator.frequency.setValueAtTime(
            frequency,
            this.ctx.currentTime
        );

        oscillator.connect(gain);
        gain.connect(this.ctx.destination);

        gain.gain.setValueAtTime(
            0.1,
            this.ctx.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.01,
            this.ctx.currentTime + duration
        );

        oscillator.start();

        oscillator.stop(
            this.ctx.currentTime + duration
        );
    }
};


// ==================================================
// HTML-Elemente
// ==================================================

const canvas =
    document.getElementById("gameCanvas");

const ctx = canvas.getContext("2d");

const startScreen =
    document.getElementById("startScreen");

const startBtn =
    document.getElementById("startBtn");

const questionSetSelect =
    document.getElementById("questionSet");

const answerContainer =
    document.getElementById("answerContainer");

const questionDisplay =
    document.getElementById("questionDisplay");

const astronautFeedback =
    document.getElementById("astronautFeedback");

const astronautSpeech =
    document.getElementById("astronautSpeech");

const scoreDisplay =
    document.getElementById("scoreDisplay");

const muteToggle =
    document.getElementById("muteToggle");


// ==================================================
// Spielvariablen
// ==================================================

let viewW = 0;
let viewH = 0;

let questions = [];
let currentQuestion = null;
let asked = 0;
let score = 0;
let selectedAnswer = -1;

let gameState = "start";

// Wird automatisch aus question/sets.json geladen
let questionSets = {};

const ROCKET_SIZE = 60;
const EMOJI_FIX = -Math.PI / 4;

const rocket = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    angle: EMOJI_FIX,
    speed: 18
};


// ==================================================
// Darstellung
// ==================================================

function renderText(element, text) {
    if (
        window.katex &&
        typeof text === "string"
    ) {
        element.innerHTML = text.replace(
            /\$(.*?)\$/g,
            (match, formula) => {
                try {
                    return katex.renderToString(
                        formula,
                        {
                            throwOnError: false
                        }
                    );
                } catch (error) {
                    console.error(
                        "KaTeX-Fehler:",
                        error
                    );

                    return match;
                }
            }
        );
    } else {
        element.innerText = text;
    }
}


function shuffleArray(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [
            result[i],
            result[j]
        ] = [
            result[j],
            result[i]
        ];
    }

    return result;
}


function resetGame() {
    asked = 0;
    score = 0;
    selectedAnswer = -1;
    currentQuestion = null;

    scoreDisplay.innerText = "Punkte: 0";
    astronautFeedback.style.display = "none";
    answerContainer.innerHTML = "";
}


// ==================================================
// Fragensätze dynamisch laden
// ==================================================

async function loadQuestionSetList() {
    if (!questionSetSelect) {
        throw new Error(
            "Das Auswahlfeld #questionSet wurde nicht gefunden."
        );
    }

    const file = "question/sets.json";

    try {
        const response = await fetch(
            `${file}?v=${Date.now()}`
        );

        if (!response.ok) {
            throw new Error(
                `HTTP-Fehler ${response.status}: ${file}`
            );
        }

        const data = await response.json();

        if (
            !data ||
            typeof data !== "object" ||
            Array.isArray(data) ||
            Object.keys(data).length === 0
        ) {
            throw new Error(
                "sets.json enthält keine gültigen Fragensätze."
            );
        }

        questionSets = data;
        questionSetSelect.innerHTML = "";

        Object.entries(questionSets).forEach(
            ([id, set]) => {
                const option =
                    document.createElement("option");

                option.value = id;

                if (
                    typeof set === "object" &&
                    set !== null &&
                    set.title &&
                    set.file
                ) {
                    option.textContent = set.title;
                } else {
                    option.textContent = id;
                }

                questionSetSelect.appendChild(option);
            }
        );

        console.log(
            "Fragensätze erfolgreich geladen:",
            questionSets
        );
    } catch (error) {
        console.error(
            "Fehler beim Laden der Fragensätze:",
            error
        );

        questionSetSelect.innerHTML = "";

        const option =
            document.createElement("option");

        option.value = "";
        option.textContent =
            "Keine Fragensätze verfügbar";

        questionSetSelect.appendChild(option);

        startBtn.disabled = true;

        throw error;
    }
}


function getSelectedQuestionFile() {
    const setName =
        questionSetSelect.value;

    const selectedSet =
        questionSets[setName];

    if (!selectedSet) {
        return null;
    }

    // Unterstützt dieses Format:
    // "mathe": "question/mathe.json"
    if (typeof selectedSet === "string") {
        return {
            id: setName,
            title: setName,
            file: selectedSet
        };
    }

    // Unterstützt dieses Format:
    // "mathe": {
    //     "title": "Mathematik",
    //     "file": "question/mathe.json"
    // }
    return {
        id: setName,
        title: selectedSet.title || setName,
        file: selectedSet.file
    };
}


// ==================================================
// Fragen laden mit Fallback auf default.json
// ==================================================

async function loadQuestions(questionFile) {
    const defaultFile =
        questionSets.default?.file ||
        "question/default.json";

    try {
        const response = await fetch(
            `${questionFile}?v=${Date.now()}`
        );

        if (!response.ok) {
            throw new Error(
                `Fragen-Datei konnte nicht geladen werden: ${
                    response.status
                }`
            );
        }

        const data = await response.json();

        if (
            !Array.isArray(data) ||
            data.length === 0
        ) {
            throw new Error(
                "Die Fragen-Datei ist leer oder ungültig."
            );
        }

        return data;

    } catch (error) {
        console.warn(
            `Die Datei ${questionFile} konnte nicht geladen werden.`
        );

        console.warn(
            `Fallback wird verwendet: ${defaultFile}`
        );

        // Verhindert einen unnötigen zweiten Versuch,
        // wenn bereits default.json geladen werden sollte.
        if (questionFile === defaultFile) {
            throw new Error(
                "Auch question/default.json konnte nicht geladen werden."
            );
        }

        const fallbackResponse = await fetch(
            `${defaultFile}?v=${Date.now()}`
        );

        if (!fallbackResponse.ok) {
            throw new Error(
                `Auch die Standarddatei konnte nicht geladen werden: ${
                    fallbackResponse.status
                }`
            );
        }

        const fallbackData =
            await fallbackResponse.json();

        if (
            !Array.isArray(fallbackData) ||
            fallbackData.length === 0
        ) {
            throw new Error(
                "question/default.json ist leer oder ungültig."
            );
        }

        return fallbackData;
    }
}


// ==================================================
// Fenstergröße und Rakete
// ==================================================

function resize() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;

    canvas.width = viewW;
    canvas.height = viewH;

    if (
        gameState === "playing" ||
        gameState === "flying"
    ) {
        resetRocket();
    }
}


function resetRocket() {
    rocket.x =
        viewW / 2 - ROCKET_SIZE / 2;

    rocket.y =
        viewH * 0.65;

    rocket.angle = EMOJI_FIX;
}


// ==================================================
// Fragen anzeigen
// ==================================================

function nextQuestion() {
    if (asked >= questions.length) {
        finishGame();
        return;
    }

    astronautFeedback.style.display = "none";

    currentQuestion = questions[asked];
    asked++;
    selectedAnswer = -1;

    renderText(
        questionDisplay,
        currentQuestion.question
    );

    answerContainer.innerHTML = "";

    currentQuestion.answers.forEach(
        (answer, index) => {
            const answerBox =
                document.createElement("div");

            answerBox.className = "answerBox";
            answerBox.dataset.index = index;

            renderText(answerBox, answer);

            answerBox.addEventListener(
                "click",
                () => {
                    if (gameState === "playing") {
                        launch(index);
                    }
                }
            );

            answerContainer.appendChild(answerBox);
        }
    );

    resetRocket();
    gameState = "playing";
}


// ==================================================
// Antwort auswählen
// ==================================================

function launch(index) {
    if (gameState !== "playing") return;

    const answerBoxes =
        document.querySelectorAll(".answerBox");

    if (!answerBoxes[index]) return;

    selectedAnswer = index;
    gameState = "flying";

    answerBoxes[index].classList.add("selected");

    const rect =
        answerBoxes[index].getBoundingClientRect();

    rocket.targetX =
        rect.left +
        rect.width / 2 -
        ROCKET_SIZE / 2;

    rocket.targetY =
        rect.top +
        rect.height / 2;

    const dx =
        rocket.targetX - rocket.x;

    const dy =
        rocket.targetY - rocket.y;

    rocket.angle =
        Math.atan2(dy, dx) +
        Math.PI / 2 +
        EMOJI_FIX;
}


// ==================================================
// Ergebnis anzeigen
// ==================================================

function showResult(isCorrect) {
    gameState = "feedback";

    if (isCorrect) {
        score += 10;
        Sound.play(500, "sine", 0.3);
    } else {
        Sound.play(150, "sawtooth", 0.4);
    }

    scoreDisplay.innerText =
        "Punkte: " + score;

    SCORM.setScore(
        score,
        questions.length * 10
    );

    astronautFeedback.style.display = "flex";

    const feedbackText =
        (
            isCorrect
                ? "✅ Richtig! "
                : "❌ Falsch... "
        ) + currentQuestion.explanation;

    renderText(
        astronautSpeech,
        feedbackText
    );
}


// ==================================================
// Spiel beenden
// ==================================================

function finishGame() {
    gameState = "end";

    const maxScore =
        questions.length * 10;

    const percentage =
        maxScore > 0
            ? Math.round(
                (score / maxScore) * 100
            )
            : 0;

    const passed =
        percentage >= 66;

    SCORM.finish(
        score,
        maxScore,
        0.66
    );

    questionDisplay.innerHTML = `
        <h2>Mission Ende!</h2>
        <p>Erfolg: ${percentage}%</p>
        <p>
            Status:
            ${passed ? "Bestanden" : "Nicht bestanden"}
        </p>
        <button
            class="main-btn"
            id="restartBtn">
            Neustart
        </button>
    `;

    answerContainer.innerHTML = "";

    const restartBtn =
        document.getElementById("restartBtn");

    restartBtn.addEventListener(
        "click",
        () => {
            location.reload();
        }
    );
}


// ==================================================
// Spiel starten
// ==================================================

async function startGame() {
    Sound.init();
    SCORM.init();

    const selectedSet =
        getSelectedQuestionFile();

    if (!selectedSet || !selectedSet.file) {
        alert(
            "Kein gültiger Fragensatz ausgewählt."
        );
        return;
    }

    const questionFile =
        selectedSet.file;

    console.log(
        "Ausgewählter Fragensatz:",
        selectedSet.id
    );

    console.log(
        "Geladene Datei:",
        questionFile
    );

    startBtn.disabled = true;
    startBtn.innerText = "LÄDT ...";

    try {
        const data =
            await loadQuestions(questionFile);

        questions =
            shuffleArray(data);

        resetGame();

        startScreen.style.display = "none";
        gameState = "playing";

        nextQuestion();
    } catch (error) {
        console.error(error);

        gameState = "start";
        startScreen.style.display = "flex";

        questionDisplay.innerHTML = `
            <p>
                Die Fragen konnten nicht geladen werden.
            </p>
            <p>
                Fragensatz:
                <strong>${selectedSet.title}</strong>
            </p>
            <p>
                Datei:
                <strong>${questionFile}</strong>
            </p>
            <p>
                Auch <strong>question/default.json</strong>
                konnte nicht geladen werden.
            </p>
        `;
    } finally {
        startBtn.disabled = false;
        startBtn.innerText = "START";
    }
}


// ==================================================
// Animation
// ==================================================

function loop() {
    ctx.clearRect(
        0,
        0,
        viewW,
        viewH
    );

    // Sterne
    ctx.fillStyle = "white";

    for (let i = 0; i < 30; i++) {
        ctx.fillRect(
            (i * 137) % viewW,
            (i * 243) % viewH,
            1,
            1
        );
    }

    // Rakete bewegen
    if (gameState === "flying") {
        const dx =
            rocket.targetX - rocket.x;

        const dy =
            rocket.targetY - rocket.y;

        const distance =
            Math.hypot(dx, dy);

        if (distance > 10) {
            rocket.x +=
                (dx / distance) * rocket.speed;

            rocket.y +=
                (dy / distance) * rocket.speed;
        } else {
            const isCorrect =
                selectedAnswer ===
                currentQuestion.correctAnswer;

            showResult(isCorrect);
        }
    }

    // Rakete zeichnen
    if (
        gameState !== "start" &&
        gameState !== "end"
    ) {
        ctx.save();

        ctx.translate(
            rocket.x + ROCKET_SIZE / 2,
            rocket.y + ROCKET_SIZE / 2
        );

        ctx.rotate(rocket.angle);

        ctx.font =
            ROCKET_SIZE + "px serif";

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText("🚀", 0, 0);

        ctx.restore();
    }

    requestAnimationFrame(loop);
}


// ==================================================
// Eingaben
// ==================================================

function globalProgress() {
    if (gameState === "feedback") {
        nextQuestion();
    }
}


window.addEventListener(
    "pointerdown",
    event => {
        if (
            event.target.closest(".ui-icon") ||
            event.target.closest(".main-btn") ||
            event.target.closest(".answerBox") ||
            event.target.closest("select") ||
            event.target.closest("label")
        ) {
            return;
        }

        globalProgress();
    }
);


window.addEventListener(
    "keydown",
    event => {
        if (gameState === "feedback") {
            nextQuestion();
            return;
        }

        if (gameState !== "playing") return;

        if (event.key === "ArrowLeft") {
            launch(0);
        }

        if (
            event.key === "ArrowUp" ||
            event.key === " "
        ) {
            launch(1);
        }

        if (event.key === "ArrowRight") {
            launch(2);
        }
    }
);


// ==================================================
// Buttons
// ==================================================

startBtn.addEventListener(
    "click",
    startGame
);


muteToggle.addEventListener(
    "click",
    event => {
        Sound.init();

        Sound.isMuted =
            !Sound.isMuted;

        event.currentTarget.innerText =
            Sound.isMuted
                ? "🔇"
                : "🔊";
    }
);


// ==================================================
// SCORM beim Verlassen beenden
// ==================================================

window.addEventListener(
    "beforeunload",
    () => {
        if (
            SCORM.initialized &&
            !SCORM.finished
        ) {
            SCORM.finish(
                score,
                questions.length * 10,
                0.66
            );
        }
    }
);


// ==================================================
// Initialisierung
// ==================================================

async function initializeGame() {
    resize();
    loop();

    try {
        await loadQuestionSetList();
    } catch (error) {
        console.error(error);

        questionSetSelect.innerHTML = `
            <option value="">
                Keine Fragensätze verfügbar
            </option>
        `;

        startBtn.disabled = true;

        questionDisplay.innerHTML = `
            <p>
                Die Fragensätze konnten nicht geladen werden.
            </p>
            <p>
                Bitte prüfe die Datei:
                <strong>question/sets.json</strong>
            </p>
        `;
    }
}

initializeGame();
