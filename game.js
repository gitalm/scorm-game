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
    targetY: null
};
let answers = [];
let currentQuestion = null;
let feedback = { type: null, x: null, y: null, timer: 0 };
let gameRunning = true;

// Fragen und Antworten
const questions = [
    {
        question: "Was ist 2 + 2?",
        answers: ["3", "4"],
        correctAnswer: "4"
    },
    {
        question: "Was ist 5 * 3?",
        answers: ["15", "20"],
        correctAnswer: "15"
    },
    {
        question: "Was ist 10 - 7?",
        answers: ["2", "3"],
        correctAnswer: "3"
    },
    {
        question: "Was ist 8 / 2?",
        answers: ["3", "4"],
        correctAnswer: "4"
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

// Funktion, um die Rakete zu zeichnen
function drawRocket() {
    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.moveTo(rocket.x + rocket.width / 2, rocket.y);
    ctx.lineTo(rocket.x, rocket.y + rocket.height);
    ctx.lineTo(rocket.x + rocket.width, rocket.y + rocket.height);
    ctx.closePath();
    ctx.fill();
}

// Funktion, um Antworten zu zeichnen
function drawAnswers() {
    ctx.fillStyle = "white";
    answers.forEach(answer => {
        ctx.fillRect(answer.x, answer.y, answer.width, answer.height);
        ctx.fillStyle = "black";
        ctx.font = "16px Arial";
        ctx.fillText(answer.text, answer.x + 10, answer.y + 25);
        ctx.fillStyle = "white";
    });
}

// Funktion, um Feedback (Punkt oder Feind) zu zeichnen
function drawFeedback() {
    if (feedback.type) {
        if (feedback.type === "point") {
            ctx.fillStyle = "gold";
            ctx.beginPath();
            ctx.arc(feedback.x, feedback.y, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "black";
            ctx.font = "16px Arial";
            ctx.fillText("+1", feedback.x - 8, feedback.y + 5);
        } else if (feedback.type === "enemy") {
            ctx.fillStyle = "gray";
            ctx.beginPath();
            ctx.arc(feedback.x, feedback.y, 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "red";
            ctx.font = "16px Arial";
            ctx.fillText("X", feedback.x - 5, feedback.y + 5);
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
                returnRocketToCent
