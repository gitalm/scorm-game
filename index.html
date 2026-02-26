// Canvas und Kontext
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const questionDisplay = document.getElementById("questionDisplay");

// Spielvariablen
let score = 0;
let rocket = { x: canvas.width / 2, y: canvas.height - 50, width: 30, height: 50, speed: 5 };
let answers = [];
let currentQuestion = null;
let asteroids = [];
let gameRunning = true;

// Fragen und Antworten
const questions = [
    {
        question: "Was ist 2 + 2?",
        answers: ["3", "4", "5"],
        correctAnswer: "4"
    },
    {
        question: "Was ist 5 * 3?",
        answers: ["10", "15", "20"],
        correctAnswer: "15"
    },
    {
        question: "Was ist 10 - 7?",
        answers: ["2", "3", "4"],
        correctAnswer: "3"
    }
];

// Funktion, um eine zufällige Frage auszuwählen
function getRandomQuestion() {
    return questions[Math.floor(Math.random() * questions.length)];
}

// Funktion, um Antworten im Weltall zu platzieren
function placeAnswers() {
    answers = [];
    const question = getRandomQuestion();
    currentQuestion = question;
    questionDisplay.textContent = question.question;
    questionDisplay.style.display = "block";

    // Antworten an zufälligen Positionen platzieren
    question.answers.forEach((answer, index) => {
        answers.push({
            text: answer,
            x: Math.random() * (canvas.width - 100) + 50,
            y: Math.random() * (canvas.height - 200) + 50,
            width: 80,
            height: 30,
            isCorrect: answer === question.correctAnswer
        });
    });
}

// Funktion, um die Rakete zu zeichnen
function drawRocket() {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.moveTo(rocket.x, rocket.y);
    ctx.lineTo(rocket.x + rocket.width / 2, rocket.y - rocket.height);
    ctx.lineTo(rocket.x + rocket.width, rocket.y);
    ctx.closePath();
    ctx.fill();
}

// Funktion, um Antworten zu zeichnen
function drawAnswers() {
    ctx.fillStyle = "white";
    answers.forEach(answer => {
        ctx.fillRect(answer.x, answer.y, answer.width, answer.height);
        ctx.fillStyle = "black";
        ctx.fillText(answer.text, answer.x + 10, answer.y + 20);
        ctx.fillStyle = "white";
    });
}

// Funktion, um Asteroiden zu zeichnen
function drawAsteroids() {
    ctx.fillStyle = "gray";
    asteroids.forEach(asteroid => {
        ctx.beginPath();
        ctx.arc(asteroid.x, asteroid.y, asteroid.radius, 0, Math.PI * 2);
        ctx.fill();
    });
}

// Funktion, um Kollisionen zu überprüfen
function checkCollisions() {
    // Kollision mit Antworten
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
            } else {
                // Falsche Antwort: Asteroiden erscheinen
                for (let i = 0; i < 3; i++) {
                    asteroids.push({
                        x: Math.random() * canvas.width,
                        y: 0,
                        radius: 15 + Math.random() * 10,
                        speed: 2 + Math.random() * 3
                    });
                }
            }
            // Neue Frage und Antworten platzieren
            placeAnswers();
            // Kollision entfernen
            answers.splice(index, 1);
        }
    });

    // Kollision mit Asteroiden
    asteroids.forEach((asteroid, index) => {
        if (
            rocket.x < asteroid.x + asteroid.radius &&
            rocket.x + rocket.width > asteroid.x - asteroid.radius &&
            rocket.y < asteroid.y + asteroid.radius &&
            rocket.y + rocket.height > asteroid.y - asteroid.radius
        ) {
            // Spiel beendet oder Punkte abziehen
            score = Math.max(0, score - 1);
            scoreDisplay.textContent = `Punkte: ${score}`;
            asteroids.splice(index, 1);
        }
    });
}

// Funktion, um Asteroiden zu bewegen
function moveAsteroids() {
    asteroids.forEach(asteroid => {
        asteroid.y += asteroid.speed;
    });
    // Asteroiden entfernen, die den Bildschirm verlassen
    asteroids = asteroids.filter(asteroid => asteroid.y < canvas.height);
}

// Funktion, um das Spiel zu zeichnen
function drawGame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Sterne im Hintergrund
    ctx.fillStyle = "white";
    for (let i = 0; i < 100; i++) {
        ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1, 1);
    }

    drawRocket();
    drawAnswers();
    drawAsteroids();
    checkCollisions();
    moveAsteroids();

    if (gameRunning) {
        requestAnimationFrame(drawGame);
    }
}

// Tastatursteuerung für die Rakete
document.addEventListener("keydown", (e) => {
    switch (e.key) {
        case "ArrowLeft":
            rocket.x = Math.max(0, rocket.x - rocket.speed);
            break;
        case "ArrowRight":
            rocket.x = Math.min(canvas.width - rocket.width, rocket.x + rocket.speed);
            break;
        case "ArrowUp":
            rocket.y = Math.max(0, rocket.y - rocket.speed);
            break;
        case "ArrowDown":
            rocket.y = Math.min(canvas.height - rocket.height, rocket.y + rocket.speed);
            break;
    }
});

// Spiel starten
placeAnswers();
drawGame();
