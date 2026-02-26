// Canvas und Kontext
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const questionDisplay = document.getElementById("questionDisplay");
const astronautFeedback = document.getElementById("astronautFeedback");
const astronautSpeech = document.getElementById("astronautSpeech");

// Touch-Buttons
const leftButton = document.getElementById("leftButton");
const middleButton = document.getElementById("middleButton");
const rightButton = document.getElementById("rightButton");

// Spielvariablen
let score = 0;
let rocket = {
    x: canvas.width / 2 - 25,
    y: canvas.height - 100,
    width: 50,
    height: 50,
    speed: 8,
    rotation: 0,
    targetX: null,
    targetY: null,
    isFlying: false
};
let answers = [];
let currentQuestion = null;
let feedback = null;
let questions = [];
let selectedAnswerIndex = 1; // 0=links, 1=mitte, 2=rechts
let astronautImage = new Image();
astronautImage.src = "astronaut.png"; // Optional: Astronaut-Bild

// Fragen laden
async function loadQuestions() {
    const response = await fetch('questions.json');
    questions = await response.json();
    placeAnswers();
}

// Astronaut-Feedback anzeigen
function showAstronautFeedback(text) {
    astronautSpeech.textContent = text;
    astronautFeedback.style.display = "block";
    setTimeout(() => {
        astronautFeedback.style.display = "none";
    }, 5000);
}

// Funktion, um eine zufällige Frage auszuwählen
function getRandomQuestion() {
    return questions[Math.floor(Math.random() * questions.length)];
}

// Funktion, um Antworten zu platzieren
function placeAnswers() {
    answers = [];
    const question = getRandomQuestion();
    currentQuestion = question;

    // Frage mit KaTeX rendern
    katex.render(question.question, questionDisplay, { throwOnError: false });

    // Antworten platzieren
    const answerWidth = 100;
    const answerHeight = 40;
    const y = canvas.height / 2;
    const spacing = canvas.width / 4;

    question.answers.forEach((answer, index) => {
        answers.push({
            text: answer,
            x: spacing * (index + 0.5) - (answerWidth / 2),
            y: y,
            width: answerWidth,
            height: answerHeight,
            isCorrect: index === question.correctAnswer
        });
    });

    // Astronaut gibt Tipps
    showAstronautFeedback("Tipp: " + question.explanation);
}

// Funktion, um die Rakete zu zeichnen
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

// Funktion, um den Astronauten zu zeichnen
function drawAstronaut() {
    ctx.drawImage(astronautImage, 20, canvas.height - 120, 80, 80);
    // Falls kein Bild: Emoji verwenden
    if (astronautImage.complete === false) {
        ctx.font = "40px Arial";
        ctx.fillText("👨‍🚀", 60, canvas.height - 70);
    }
}

// Funktion, um Antworten zu zeichnen
function drawAnswers() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    answers.forEach((answer, index) => {
        ctx.strokeStyle = selectedAnswerIndex === index ? "yellow" : "transparent";
        ctx.lineWidth = 2;
        ctx.strokeRect(answer.x, answer.y, answer.width, answer.height);
        ctx.fillRect(answer.x, answer.y, answer.width, answer.height);

        ctx.fillStyle = "black";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        katex.render(answer.text, {
            element: document.createElement("div"),
            output: "html"
        }).then((html) => {
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = html;
            ctx.fillText(tempDiv.textContent || answer.text, answer.x + answer.width / 2, answer.y + answer.height / 2 + 6);
        });
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
                        showAstronautFeedback("Richtig! " + currentQuestion.explanation);
                    } else {
                        feedback = { type: "wrong", x: answer.x + answer.width / 2, y: answer.y };
                        showAstronautFeedback("Falsch. " + currentQuestion.explanation);
                    }

                    setTimeout(() => {
                        feedback = null;
                        placeAnswers();
                        rocket.x = canvas.width / 2 - 25;
                        rocket.y = canvas.height - 100;
                        rocket.rotation = 0;
                    }, 2000);
                }
            });
        }
    }
}

// Funktion, um die Rakete auszurichten
function setRocketDirection(direction) {
    if (rocket.isFlying) return;

    if (direction === "left" && selectedAnswerIndex > 0) {
        selectedAnswerIndex--;
        rocket.rotation = -0.5;
    } else if (direction === "right" && selectedAnswerIndex < 2) {
        selectedAnswerIndex++;
        rocket.rotation = 0.5;
    } else if (direction === "middle") {
        selectedAnswerIndex = 1;
        rocket.rotation = 0;
    }
}

// Funktion, um die Rakete abzufeuern
function launchRocket() {
    if (rocket.isFlying || !answers[selectedAnswerIndex]) return;

    rocket.isFlying = true;
    rocket.targetX = answers[selectedAnswerIndex].x + answers[selectedAnswerIndex].width / 2 - rocket.width / 2;
    rocket.targetY = answers[selectedAnswerIndex].y;
}

// Tastatursteuerung
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") setRocketDirection("left");
    else if (e.key === "ArrowRight") setRocketDirection("right");
    else if (e.key === "ArrowUp" || e.key === " ") launchRocket();
});

// Touch-Steuerung
leftButton.addEventListener("click", () => setRocketDirection("left"));
middleButton.addEventListener("click", () => setRocketDirection("middle"));
rightButton.addEventListener("click", () => setRocketDirection("right"));
document.addEventListener("dblclick", launchRocket);

// Canvas-Größe anpassen
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    rocket.x = canvas.width / 2 - 25;
    rocket.y = canvas.height - 100;
    if (answers.length > 0) placeAnswers();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Hauptspielschleife
function drawGame() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Sterne zeichnen
    ctx.fillStyle = "white";
    for (let i = 0; i < 200; i++) {
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }

    // UFOs zeichnen
    ctx.font = "20px Arial";
    for (let i = 0; i < 5; i++) {
        ctx.fillText(["🛸", "👽", "👾"][Math.floor(Math.random() * 3)],
                    Math.random() * canvas.width,
                    Math.random() * (canvas.height - 100));
    }

    // Spielobjekte zeichnen
    drawAnswers();
    drawRocket();
    drawAstronaut();
    drawFeedback();
    moveRocket();

    requestAnimationFrame(drawGame);
}

// Spiel starten
loadQuestions();
drawGame();
