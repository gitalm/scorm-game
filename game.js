const Sound = {
    ctx: null,
    isMuted: true,

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
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


// HTML-Elemente
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const answerContainer = document.getElementById("answerContainer");
const questionDisplay = document.getElementById("questionDisplay");
const astronautFeedback = document.getElementById("astronautFeedback");
const astronautSpeech = document.getElementById("astronautSpeech");
const scoreDisplay = document.getElementById("scoreDisplay");


// Spielvariablen
let viewW;
let viewH;

let questions = [];
let curQ = null;
let asked = 0;
let score = 0;
let selectedAnswer = -1;

let gameState = "start";

const ROCKET_SIZE = 60;
const EMOJI_FIX = -Math.PI / 4;

let rocket = {
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    angle: EMOJI_FIX,
    speed: 18
};


// Fragensätze
const questionSets = {
    mathe: "question/mathe.json",
    physik: "question/physik.json",
    geschichte: "question/geschichte.json"
};


// Fenstergröße anpassen
function resize() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;

    canvas.width = viewW;
    canvas.height = viewH;

    if (gameState === "playing") {
        resetRocket();
    }
}


// Rakete zurücksetzen
function resetRocket() {
    rocket.x = viewW / 2 - ROCKET_SIZE / 2;
    rocket.y = viewH * 0.65;
    rocket.angle = EMOJI_FIX;
}


// Nächste Frage anzeigen
function nextQuestion() {
    if (asked >= questions.length) {
        finish();
        return;
    }

    astronautFeedback.style.display = "none";

    curQ = questions[asked];
    asked++;
    selectedAnswer = -1;

    // Frage mit optionalem KaTeX rendern
    if (window.katex) {
        questionDisplay.innerHTML = curQ.question.replace(
            /\$(.*?)\$/g,
            (match, formula) => katex.renderToString(formula)
        );
    } else {
        questionDisplay.innerText = curQ.question;
    }

    answerContainer.innerHTML = "";

    curQ.answers.forEach((answer, index) => {
        const answerBox = document.createElement("div");
        answerBox.className = "answerBox";

        if (window.katex) {
            answerBox.innerHTML = answer.replace(
                /\$(.*?)\$/g,
                (match, formula) => katex.renderToString(formula)
            );
        } else {
            answerBox.innerText = answer;
        }

        answerBox.onclick = () => {
            if (gameState === "playing") {
                launch(index);
            }
        };

        answerContainer.appendChild(answerBox);
    });

    resetRocket();
    gameState = "playing";
}


// Rakete zur ausgewählten Antwort starten
function launch(index) {
    if (gameState !== "playing") return;

    gameState = "flying";
    selectedAnswer = index;

    const answerBoxes = document.querySelectorAll(".answerBox");
    answerBoxes[index].classList.add("selected");

    const rect = answerBoxes[index].getBoundingClientRect();

    rocket.targetX =
        rect.left + rect.width / 2 - ROCKET_SIZE / 2;

    rocket.targetY =
        rect.top + rect.height / 2;

    const dx = rocket.targetX - rocket.x;
    const dy = rocket.targetY - rocket.y;

    rocket.angle =
        Math.atan2(dy, dx) + Math.PI / 2 + EMOJI_FIX;
}


// Ergebnis anzeigen
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

    const text =
        (isCorrect ? "✅ Richtig! " : "❌ Falsch... ") +
        curQ.explanation;

    if (window.katex) {
        astronautSpeech.innerHTML = text.replace(
            /\$(.*?)\$/g,
            (match, formula) => katex.renderToString(formula)
        );
    } else {
        astronautSpeech.innerText = text;
    }
}


// Spiel beenden
function finish() {
    gameState = "end";

    const percentage =
        questions.length > 0
            ? Math.round((score / (questions.length * 10)) * 100)
            : 0;

    questionDisplay.innerHTML = `
        <h2>Mission Ende!</h2>
        <p>Erfolg: ${percentage}%</p>
        <button class="main-btn" onclick="location.reload()">
            Neustart
        </button>
    `;

    answerContainer.innerHTML = "";
}


// Animationsschleife
function loop() {
    ctx.clearRect(0, 0, viewW, viewH);

    // Sterne zeichnen
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
            rocket.x += (dx / distance) * rocket.speed;
            rocket.y += (dy / distance) * rocket.speed;
        } else {
            // correctAnswer muss der nullbasierte Index sein:
            // 0 = erste Antwort, 1 = zweite Antwort usw.
            const isCorrect =
                selectedAnswer === curQ.correctAnswer;

            showResult(isCorrect);
        }
    }

    // Rakete zeichnen
    if (gameState !== "start" && gameState !== "end") {
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


// Zum nächsten Schritt wechseln
function globalProgress() {
    if (gameState === "feedback") {
        nextQuestion();
    }
}


// Klick außerhalb der Bedienelemente
window.addEventListener("pointerdown", (event) => {
    if (
        event.target.closest(".ui-icon") ||
        event.target.closest(".main-btn") ||
        event.target.closest(".answerBox")
    ) {
        return;
    }

    globalProgress();
});


// Tastatursteuerung
window.addEventListener("keydown", (event) => {
    if (gameState === "feedback") {
        nextQuestion();
        return;
    }

    if (gameState !== "playing") return;

    if (event.key === "ArrowLeft") {
        launch(0);
    }

    if (event.key === "ArrowUp" || event.key === " ") {
        launch(1);
    }

    if (event.key === "ArrowRight") {
        launch(2);
    }
});


// Start-Button
document.getElementById("startBtn").onclick = () => {
    Sound.init();

    const select = document.getElementById("questionSet");
    const setName = select.value;
    const questionFile = questionSets[setName];

    if (!questionFile) {
        questionDisplay.innerText =
            "Dieser Fragensatz wurde nicht gefunden.";
        return;
    }

    gameState = "playing";
    document.getElementById("startScreen").style.display = "none";

    fetch(questionFile)
        .then(response => {
            if (!response.ok) {
                throw new Error(
                    `Fragensatz konnte nicht geladen werden: ${response.status}`
                );
            }

            return response.json();
        })
        .then(data => {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error(
                    "Der Fragensatz ist leer oder ungültig."
                );
            }

            questions = data.sort(() => Math.random() - 0.5);
            nextQuestion();
        })
        .catch(error => {
            console.error(error);

            // Startbildschirm wieder anzeigen
            document.getElementById("startScreen").style.display = "flex";
            gameState = "start";

            questionDisplay.innerHTML = `
                <p>Die Fragen konnten nicht geladen werden.</p>
                <p>
                    Überprüfte Datei:
                    <strong>${questionFile}</strong>
                </p>
            `;
        });
};


// Ton ein- und ausschalten
document.getElementById("muteToggle").onclick = (event) => {
    Sound.init();

    Sound.isMuted = !Sound.isMuted;
    event.target.innerText = Sound.isMuted ? "🔇" : "🔊";
};


// Ereignisse
window.addEventListener("resize", resize);


// Initialisierung
resize();
loop();
