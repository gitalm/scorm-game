const Sound = {
    ctx: null,
    isMuted: true,

    init() {
        if (!this.ctx) {
            const AudioContext =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContext) return;

            this.ctx = new AudioContext();
        }

        if (this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    },

    play(frequency, type, duration) {
        if (!this.ctx || this.isMuted) return;

        const oscillator = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(
            frequency,
            this.ctx.currentTime
        );

        oscillator.connect(gain);
        gain.connect(this.ctx.destination);

        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.01,
            this.ctx.currentTime + duration
        );

        oscillator.start();
        oscillator.stop(this.ctx.currentTime + duration);
    }
};


// --------------------------------------------------
// HTML-Elemente
// --------------------------------------------------

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("startScreen");
const startBtn = document.getElementById("startBtn");
const questionSetSelect = document.getElementById("questionSet");

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


// --------------------------------------------------
// Spielvariablen
// --------------------------------------------------

let viewW = 0;
let viewH = 0;

let questions = [];
let curQ = null;
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


// --------------------------------------------------
// Verfügbare Fragensätze
// --------------------------------------------------

const questionSets = {
    mathe: "question/mathe.json",
    physik: "question/physik.json",
    rot1: "question/rot1.json",
    geschichte: "question/geschichte.json"
};


// --------------------------------------------------
// Hilfsfunktionen
// --------------------------------------------------

function renderLatex(text) {
    if (!window.katex || typeof text !== "string") {
        return text;
    }

    return text.replace(
        /\$(.*?)\$/g,
        (match, formula) => {
            try {
                return katex.renderToString(formula, {
                    throwOnError: false
                });
            } catch (error) {
                console.error("KaTeX-Fehler:", error);
                return match;
            }
        }
    );
}


function showQuestionText(element, text) {
    if (window.katex) {
        element.innerHTML = renderLatex(text);
    } else {
        element.innerText = text;
    }
}


function resetGame() {
    asked = 0;
    score = 0;
    selectedAnswer = -1;
    curQ = null;

    scoreDisplay.innerText = "Punkte: 0";
    astronautFeedback.style.display = "none";
    answerContainer.innerHTML = "";
}


// --------------------------------------------------
// Fenstergröße und Rakete
// --------------------------------------------------

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
    rocket.x = viewW / 2 - ROCKET_SIZE / 2;
    rocket.y = viewH * 0.65;
    rocket.angle = EMOJI_FIX;
}


// --------------------------------------------------
// Frage anzeigen
// --------------------------------------------------

function nextQuestion() {
    if (asked >= questions.length) {
        finish();
        return;
    }

    astronautFeedback.style.display = "none";

    curQ = questions[asked];
    asked++;
    selectedAnswer = -1;

    showQuestionText(
        questionDisplay,
        curQ.question
    );

    answerContainer.innerHTML = "";

    curQ.answers.forEach((answer, index) => {
        const answerBox = document.createElement("div");

        answerBox.className = "answerBox";
        answerBox.dataset.index = index;

        showQuestionText(answerBox, answer);

        answerBox.addEventListener("click", () => {
            if (gameState === "playing") {
                launch(index);
            }
        });

        answerContainer.appendChild(answerBox);
    });

    resetRocket();
    gameState = "playing";
}


// --------------------------------------------------
// Rakete starten
// --------------------------------------------------

function launch(index) {
    if (gameState !== "playing") return;

    const answerBoxes =
        document.querySelectorAll(".answerBox");

    if (!answerBoxes[index]) return;

    gameState = "flying";
    selectedAnswer = index;

    answerBoxes[index].classList.add("selected");

    const rect =
        answerBoxes[index].getBoundingClientRect();

    rocket.targetX =
        rect.left + rect.width / 2 - ROCKET_SIZE / 2;

    rocket.targetY =
        rect.top + rect.height / 2;

    const dx = rocket.targetX - rocket.x;
    const dy = rocket.targetY - rocket.y;

    rocket.angle =
        Math.atan2(dy, dx) +
        Math.PI / 2 +
        EMOJI_FIX;
}


// --------------------------------------------------
// Ergebnis anzeigen
// --------------------------------------------------

function showResult(isCorrect) {
    gameState = "feedback";

    if (isCorrect) {
        score += 10;
        Sound.play(500, "sine", 0.3);
    } else {
        Sound.play(150, "sawtooth", 0.4);
    }

    scoreDisplay.innerText = "Punkte: " + score;

    astronautFeedback.style.display = "flex";

    const feedbackText =
        (isCorrect ? "✅ Richtig! " : "❌ Falsch... ") +
        curQ.explanation;

    showQuestionText(
        astronautSpeech,
        feedbackText
    );
}


// --------------------------------------------------
// Spiel beenden
// --------------------------------------------------

function finish() {
    gameState = "end";

    const percentage =
        questions.length > 0
            ? Math.round(
                (score / (questions.length * 10)) * 100
            )
            : 0;

    questionDisplay.innerHTML = `
        <h2>Mission Ende!</h2>
        <p>Erfolg: ${percentage}%</p>
        <button class="main-btn" id="restartBtn">
            Neustart
        </button>
    `;

    answerContainer.innerHTML = "";

    const restartBtn =
        document.getElementById("restartBtn");

    restartBtn.addEventListener("click", () => {
        location.reload();
    });
}


// --------------------------------------------------
// Fragensatz laden
// --------------------------------------------------

async function loadQuestions(questionFile) {
    const response = await fetch(questionFile);

    if (!response.ok) {
        throw new Error(
            `Datei konnte nicht geladen werden: ${response.status}`
        );
    }

    const data = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
        throw new Error(
            "Der Fragensatz ist leer oder ungültig."
        );
    }

    return data;
}


async function startGame() {
    Sound.init();

    const setName = questionSetSelect.value;
    const questionFile = questionSets[setName];

    console.log("Ausgewählter Fragensatz:", setName);
    console.log("Geladene Datei:", questionFile);

    if (!questionFile) {
        questionDisplay.innerText =
            "Dieser Fragensatz wurde nicht gefunden.";
        return;
    }

    startBtn.disabled = true;
    startBtn.innerText = "LÄDT ...";

    try {
        const data = await loadQuestions(questionFile);

        questions = data.sort(
            () => Math.random() - 0.5
        );

        resetGame();

        startScreen.style.display = "none";
        gameState = "playing";

        nextQuestion();
    } catch (error) {
        console.error(error);

        gameState = "start";
        startScreen.style.display = "flex";

        questionDisplay.innerHTML = `
            <p>Die Fragen konnten nicht geladen werden.</p>
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


// --------------------------------------------------
// Animation
// --------------------------------------------------

function loop() {
    ctx.clearRect(0, 0, viewW, viewH);

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
        const dx = rocket.targetX - rocket.x;
        const dy = rocket.targetY - rocket.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 10) {
            rocket.x +=
                (dx / distance) * rocket.speed;

            rocket.y +=
                (dy / distance) * rocket.speed;
        } else {
            const isCorrect =
                selectedAnswer === curQ.correctAnswer;

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

        ctx.font = ROCKET_SIZE + "px serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        ctx.fillText("🚀", 0, 0);

        ctx.restore();
    }

    requestAnimationFrame(loop);
}


// --------------------------------------------------
// Eingaben
// --------------------------------------------------

function globalProgress() {
    if (gameState === "feedback") {
        nextQuestion();
    }
}


window.addEventListener("pointerdown", event => {
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
});


window.addEventListener("keydown", event => {
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
});


// --------------------------------------------------
// Buttons
// --------------------------------------------------

startBtn.addEventListener("click", startGame);


muteToggle.addEventListener("click", event => {
    Sound.init();

    Sound.isMuted = !Sound.isMuted;
    event.currentTarget.innerText =
        Sound.isMuted ? "🔇" : "🔊";
});


// --------------------------------------------------
// Initialisierung
// --------------------------------------------------

window.addEventListener("resize", resize);

resize();
loop();
