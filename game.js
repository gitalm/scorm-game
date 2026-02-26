// Canvas und Kontext
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const questionDisplay = document.getElementById("questionDisplay");

// Spielvariablen
let score = 0;
let rocket = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 100,
    width: 50,
    height: 50,
    speed: 8,
    rotation: 0, // 0 = gerade, -30° = links, 30° = rechts
    targetX: null,
    targetY: null,
    isFlying: false
};
let answers = [];
let currentQuestion = null;
let feedback = null;
let questions = [];
let selectedAnswerIndex = 1; // Standardmäßig mittige Antwort ausgewählt (0=links, 1=mitte, 2=rechts)

// Fragen laden
async function loadQuestions() {
    const response = await fetch('questions.json');
    questions = await response.json();
    placeAnswers();
}

// Funktion, um eine zufällige Frage auszuwählen
function getRandomQuestion() {
    return questions[Math.floor(Math.random() * questions.length)];
}

// Funktion, um Antworten zu platzieren (links, mitte, rechts)
function placeAnswers() {
    answers = [];
    const question = getRandomQuestion();
    currentQuestion = question;

    // Frage anzeigen (mit KaTeX oder einfachem Text)
    questionDisplay.innerHTML = question.question;

    // Antworten platzieren
    const answerWidth = 100;
    const answerHeight = 40;
    const y = canvas.height / 2;
    const spacing = canvas.width / 4;

    question.answers.forEach((answer, index) => {
        answers.push({
            text: answer,
            x: spacing + (index * spacing) - (answerWidth / 2),
            y: y,
            width: answerWidth,
            height: answerHeight,
            isCorrect: index === question.correctAnswer
        });
    });
}

// Funktion, um die Rakete als Emoji zu zeichnen (mit Rotation)
function drawRocket() {
    ctx.save();
    ctx.translate(rocket.x + rocket.width / 2, rocket.y + rocket.height / 2);
    ctx.rotate(rocket.rotation);
    ctx.font = "50px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText("🚀", 0, 0);
    ctx.restore();
}

// Funktion, um Antworten zu zeichnen
function drawAnswers() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    answers.forEach((answer, index) => {
        // Aktuell ausgewählte Antwort hervorheben
        ctx.strokeStyle = selectedAnswerIndex === index ? "yellow" : "transparent";
        ctx.lineWidth = 2;
        ctx.strokeRect(answer.x, answer.y, answer.width, answer.height);
        ctx.fillRect(answer.x, answer.y, answer.width, answer.height);

        ctx.fillStyle = "black";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(answer.text, answer.x + answer.width / 2, answer.y + answer.height / 2 + 6);
        ctx.fillStyle = "white";
    });
}

// Funktion, um Feedback zu zeichnen
function drawFeedback() {
    if (!feedback) return;

    ctx.font = "30px Arial";
    if (feedback.type === "correct") {
        ctx.fillStyle = "gold";
        ctx.fillText("⭐", feedback.x, feedback.y);
    } else {
        ctx.fillStyle = "red";
        ctx.fillText("💥", feedback.x, feedback.y);
    }
}

// Funktion, um die Rakete zu bewegen
function moveRocket() {
    if (rocket.isFlying) {
        const dx = rocket.targetX - rocket.x;
        const dy = rocket.targetY - rocket.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1) {
            rocket.x += (dx / distance) * rocket.speed;
            rocket.y += (dy / distance) * rocket.speed;
        } else {
            rocket.x = rocket.targetX;
            rocket.y = rocket.targetY;
            rocket.isFlying = false;

            // Kollision mit Antwort prüfen
            answers.forEach((answer, index) => {
                if (
                    rocket.x < answer.x + answer.width &&
                    rocket.x + rocket.width > answer.x &&
                    rocket.y < answer.y + answer.height &&
                    rocket.y + rocket.height > answer.y
                ) {
                    if (answer.isCorrect) {
                        score++;
                        scoreDisplay.textContent = `Punkte: ${score}`;
                        feedback = { type: "correct", x: answer.x + answer.width / 2, y: answer.y };
                    } else {
                        feedback = { type: "wrong", x: answer.x + answer.width / 2, y: answer.y };
                    }

                    // Neue Frage nach 1 Sekunde
                    setTimeout(() => {
                        feedback = null;
                        placeAnswers();
                        rocket.x = canvas.width / 2 - 25;
                        rocket.y = canvas.height - 100;
                        rocket.rotation = 0;
                    }, 1000);
                }
            });
        }
    }
}

// Funktion, um die Rakete auszurichten (mit Cursortasten)
function handleKeyDown(e) {
    if (rocket.isFlying) return;

    if (e.key === "ArrowLeft" && selectedAnswerIndex > 0) {
        selectedAnswerIndex--;
        rocket.rotation = -0.5; // Leichte Linksneigung
    } else if (e.key === "ArrowRight" && selectedAnswerIndex < 2) {
        selectedAnswerIndex++;
        rocket.rotation = 0.5; // Leichte Rechtsneigung
    } else if (e.key === "ArrowUp" || e.key === " ") {
        // Leertaste oder Pfeil nach oben: Rakete fliegt zur ausgewählten Antwort
        if (answers[selectedAnswerIndex]) {
            rocket.isFlying = true;
            rocket.targetX = answers[selectedAnswerIndex].x + answers[selectedAnswerIndex].width / 2 - rocket.width / 2;
            rocket.targetY = answers[selectedAnswerIndex].y;
        }
    }
}

// Hauptspielschleife
function drawGame() {
    // Hintergrund (Sterne + UFOs)
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    for (let i = 0; i < 200; i++) {
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }

    // UFOs zeichnen
    ctx.font = "20px Arial";
    ctx.fillStyle = "white";
    for (let i = 0; i < 5; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * (canvas.height - 100);
        ctx.fillText(["🛸", "👽", "👾"][Math.floor(Math.random() * 3)], x, y);
    }

    // Spielobjekte zeichnen
    drawAnswers();
    drawRocket();
    drawFeedback();
    moveRocket();

    requestAnimationFrame(drawGame);
}

// Event-Listener
document.addEventListener("keydown", handleKeyDown);

// Spiel starten
loadQuestions();
drawGame();
