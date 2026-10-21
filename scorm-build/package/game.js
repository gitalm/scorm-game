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

        if (currentWindow && currentWindow.API) {
            return currentWindow.API;
        }

        return null;
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
                "Das Spiel läuft trotzdem lokal weiter."
            );

            return false;
        }

        const result = this.api.LMSInitialize("");

        if (result !== "true") {
            console.warn(
                "SCORM konnte nicht initialisiert werden."
            );

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

        // Manche LMS unterstützen score.scaled auch bei SCORM 1.2.
        this.api.LMSSetValue(
            "cmi.core.score.scaled",
            String(percentage)
        );

        this.api.LMSCommit("");
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

        const status =
            percentage >= passLimit
                ? "passed"
                : "failed";

        this.setScore(score, maxScore);

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
// Verfügbare Fragensätze
// ==================================================

const questionSets = {
    mathe: "question/mathe.json",
    physik: "question/physik.json",
    rot1: "question/rot1.json",
    geschichte: "question/geschichte.json"
};


// ==================================================
// Hilfsfunktionen
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
                        "Fehler beim Rendern von KaTeX:",
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


function resetGame() {
    asked = 0;
    score = 0;
    selectedAnswer = -1;
    currentQuestion = null;

    scoreDisplay.innerText = "Punkte: 0";
    astronautFeedback.style.display = "none";
    answerContainer.innerHTML = "";
}


function shuffleQuestions(data) {
    const shuffled = [...data];

    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [
            shuffled[i],
            shuffled[j]
        ] = [
            shuffled[j],
            shuffled[i]
        ];
    }

    return shuffled;
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
// Fragen
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
// Antwort auswählen und Rakete starten
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
// Ergebnis
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

    // Punktestand laufend an Moodle übertragen
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
// Spielende und SCORM-Ergebnis
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

    // Endergebnis an Moodle übertragen
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
// Fragen laden
// ==================================================

async function loadQuestions(file) {
    const response = await fetch(file);

    if (!response.ok) {
        throw new Error(
            `Fehler beim Laden der Datei: ${response.status}`
        );
    }

    const data = await response.json();

    if (
        !Array.isArray(data) ||
        data.length === 0
    ) {
        throw new Error(
            "Der Fragensatz ist leer oder ungültig."
        );
    }

    return data;
}


async function startGame() {
    Sound.init();
    SCORM.init();

    const setName =
        questionSetSelect.value;

    const questionFile =
        questionSets[setName];

    console.log(
        "Ausgewählter Fragensatz:",
        setName
    );

    console.log(
        "Geladene Datei:",
        questionFile
    );

    if (!questionFile) {
        questionDisplay.innerText =
            "Dieser Fragensatz wurde nicht gefunden.";

        return;
    }

    startBtn.disabled = true;
    startBtn.innerText = "LÄDT ...";

    try {
        const data =
            await loadQuestions(questionFile);

        questions =
            shuffleQuestions(data);

        resetGame();

        startScreen.style.display = "none";
        gameState = "playing";

        nextQuestion();
    } catch (error) {
        console.error(error);

        startScreen.style.display = "flex";
        gameState = "start";

        questionDisplay.innerHTML = `
            <p>
                Die Fragen konnten nicht geladen werden.
            </p>
            <p>
                Überprüfte Datei:
                <strong>${questionFile}</strong>
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
// Buttons und Ereignisse
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


window.addEventListener(
    "resize",
    resize
);


// Beim Verlassen SCORM ordnungsgemäß beenden
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

resize();
loop();
