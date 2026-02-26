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
    speed: 5,
    isMovingToAnswer: false,
    targetX: null,
    targetY: null,
    rotation: 0 // Rotation der Rakete
};
let answers = [];
let currentQuestion = null;
let feedback = { type: null, x: null, y: null, timer: 0 };
let ufos = []; // UFOs im Hintergrund
let gameRunning = true;

const questions = [
    {
        question: "\\frac{1}{2} + \\frac{1}{2} = ?",
        answers: ["\\frac{1}{4}", "1"],
        correctAnswer: "1"
    },
    {
        question: "x^2 = 16 \\Rightarrow x = ?",
        answers: ["4", "\\pm 4"],
        correctAnswer: "\\pm 4"
    },
    {
        question: "\\sqrt{25} = ?",
        answers: ["4", "5"],
        correctAnswer: "5"
    },
    {
        question: "\\int_0^1 x \\, dx = ?",
        answers: ["\\frac{1}{2}", "1"],
        correctAnswer: "\\frac{1}{2}"
    }
];


// Funktion, um eine zufällige Frage auszuwählen
function getRandomQuestion() {
    return questions[Math.floor(Math.random() * questions.length)];
}

// Funktion, um Antworten links und rechts zu platzieren
function placeAnswers() {
    answers = [];
    const question = getRandomQuestion();
    currentQuestion = question;
    questionDisplay.textContent = question.question;

    // Antworten links und rechts platzieren
    const answerWidth = 100;
    const answerHeight = 40;
    const leftX = canvas.width / 4 - answerWidth / 2;
    const rightX = (3 * canvas.width) / 4 - answerWidth / 2;
    const y = canvas.height / 2;

    question.answers.forEach((answer, index) => {
        answers.push({
            text: answer,
            x: index === 0 ? leftX : rightX,
            y: y,
            width: answerWidth,
            height: answerHeight,
            isCorrect: answer === question.correctAnswer
        });
    });
}

// Funktion, um die Rakete als Emoji zu zeichnen
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

// Funktion, um UFOs zu zeichnen
function drawUFOs() {
    ufos.forEach(ufo => {
        ctx.font = `${ufo.size}px Arial`;
        ctx.fillStyle = "white";
        ctx.fillText(ufo.emoji, ufo.x, ufo.y);
    });
}

// Funktion, um Antworten zu zeichnen
function drawAnswers() {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    answers.forEach(answer => {
        ctx.fillRect(answer.x, answer.y, answer.width, answer.height);
        ctx.fillStyle = "black";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(answer.text, answer.x + answer.width / 2, answer.y + answer.height / 2 + 6);
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.textAlign = "left";
    });
}

// Funktion, um Feedback (Punkt oder Feind) zu zeichnen
function drawFeedback() {
    if (feedback.type) {
        if (feedback.type === "point") {
            ctx.font = "24px Arial";
            ctx.fillStyle = "gold";
            ctx.fillText("⭐", feedback.x, feedback.y);
            ctx.fillStyle = "black";
            ctx.fillText("+1", feedback.x + 20, feedback.y);
        } else if (feedback.type === "enemy") {
            ctx.font = "24px Arial";
            ctx.fillStyle = "red";
            ctx.fillText("💥", feedback.x, feedback.y);
        }
        feedback.timer--;
        if (feedback.timer <= 0) {
            feedback.type = null;
        }
    }
}

// Funktion, um die Rakete zur Antwort zu bewegen
function moveRocketToAnswer(targetX, targetY) {
    rocket.isMovingToAnswer = true;
    rocket.targetX = targetX;
    rocket.targetY = targetY;
}

// Funktion, um die Rakete zurück zur Mittelposition zu bewegen
function returnRocketToCenter() {
    rocket.isMovingToAnswer = true;
    rocket.targetX = canvas.width / 2 - rocket.width / 2;
    rocket.targetY = canvas.height - 100;
}

// Funktion, um Kollisionen zu überprüfen
function checkCollisions() {
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
                feedback = { type: "point", x: answer.x + answer.width / 2, y: answer.y, timer: 30 };
            } else {
                feedback = { type: "enemy", x: answer.x + answer.width / 2, y: answer.y, timer: 30 };
            }
            setTimeout(() => {
                placeAnswers();
                returnRocketToCenter();
            }, 1000);
        }
    });
}

// Funktion, um die Rakete zu bewegen und zu rotieren
function moveRocket() {
    if (rocket.isMovingToAnswer) {
        const dx = rocket.targetX - rocket.x;
        const dy = rocket.targetY - rocket.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 1) {
            rocket.x += (dx / distance) * rocket.speed;
            rocket.y += (dy / distance) * rocket.speed;

            // Rotation der Rakete in Bewegungsrichtung
            rocket.rotation = Math.atan2(dy, dx);
        } else {
            rocket.x = rocket.targetX;
            rocket.y = rocket.targetY;
            rocket.rotation = 0;
            rocket.isMovingToAnswer = false;
        }
    }
}

// Funktion, um UFOs zu bewegen
function moveUFOs() {
    ufos.forEach((ufo, index) => {
        ufo.x += ufo.speedX;
        ufo.y += ufo.speedY;

        // UFOs, die den Bildschirm verlassen, werden entfernt
        if (ufo.x < 0 || ufo.x > canvas.width || ufo.y < 0 || ufo.y > canvas.height) {
            ufos.splice(index, 1);
        }
    });

    // Neue UFOs hinzufügen
    if (Math.random() < 0.02 && ufos.length < 10) {
        const ufoEmojis = ["🛸", "👽", "👾"];
        ufos.push({
            emoji: ufoEmojis[Math.floor(Math.random() * ufoEmojis.length)],
            x: Math.random() < 0.5 ? 0 : canvas.width,
            y: Math.random() * canvas.height,
            size: 20 + Math.random() * 20,
            speedX: (Math.random() - 0.5) * 2,
            speedY: (Math.random() - 0.5) * 2
        });
    }
}

// Funktion, um das Spiel zu zeichnen
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sterne im Hintergrund
    ctx.fillStyle = "white";
    for (let i = 0; i < 100; i++) {
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }

    drawUFOs();
    drawAnswers();
    drawRocket();
    drawFeedback();
    moveRocket();
    moveUFOs();
    checkCollisions();

    if (gameRunning) {
        requestAnimationFrame(drawGame);
    }
}

// Tastatursteuerung für die Rakete
document.addEventListener("keydown", (e) => {
    if (rocket.isMovingToAnswer) return;

    if (e.key === "ArrowLeft" && answers.length > 0) {
        moveRocketToAnswer(answers[0].x, answers[0].y);
    } else if (e.key === "ArrowRight" && answers.length > 0) {
        moveRocketToAnswer(answers[1].x, answers[1].y);
    }
});

// Spiel starten
function placeAnswers() {
    answers = [];
    const question = getRandomQuestion();
    currentQuestion = question;

    // KaTeX zum Rendern der Frage verwenden
    katex.render(question.question, questionDisplay, {
        throwOnError: false
    });

    // Antworten links und rechts platzieren
    const answerWidth = 100;
    const answerHeight = 40;
    const leftX = canvas.width / 4 - answerWidth / 2;
    const rightX = (3 * canvas.width) / 4 - answerWidth / 2;
    const y = canvas.height / 2;

    question.answers.forEach((answer, index) => {
        answers.push({
            text: answer,
            x: index === 0 ? leftX : rightX,
            y: y,
            width: answerWidth,
            height: answerHeight,
            isCorrect: answer === question.correctAnswer
        });
    });
}

drawGame();
