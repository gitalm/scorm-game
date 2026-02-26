const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const questionDisplay = document.getElementById("questionDisplay");
const astronautFeedback = document.getElementById("astronautFeedback");
const astronautSpeech = document.getElementById("astronautSpeech");

let viewW, viewH;
let score = 0;
let questions = [];
let currentQuestion = null;
let answers = [];
let stars = [];
let feedback = null;
let gameState = "loading"; // loading, playing, flying, feedback

const ROCKET_SIZE = 50;
let rocket = {
    x: 0, y: 0,
    targetX: 0, targetY: 0,
    angle: 0,
    speed: 12,
    selectedIdx: 1
};

// Initialisierung
async function init() {
    resizeCanvas();
    await loadQuestions();
    createStars();
    requestAnimationFrame(gameLoop);
}

async function loadQuestions() {
    try {
        const res = await fetch("question.json?v=" + Date.now());
        questions = await res.json();
        nextQuestion();
    } catch (err) {
        questionDisplay.textContent = "Fehler beim Laden der Fragen!";
        console.error(err);
    }
}

function nextQuestion() {
    if (questions.length === 0) return;
    currentQuestion = questions[Math.floor(Math.random() * questions.length)];
    renderMathText(currentQuestion.question, questionDisplay);
    
    const spacing = viewW / 3;
    answers = currentQuestion.answers.map((text, i) => ({
        text,
        x: spacing * i + spacing / 2 - 60,
        y: viewH * 0.4,
        w: 120,
        h: 50,
        isCorrect: i === currentQuestion.correctAnswer
    }));
    
    resetRocket();
    gameState = "playing";
}

function resetRocket() {
    rocket.x = viewW / 2 - ROCKET_SIZE / 2;
    rocket.y = viewH - 120;
    rocket.angle = 0;
    rocket.selectedIdx = 1;
}

function renderMathText(str, element) {
    if (!window.katex) {
        element.textContent = str;
        return;
    }
    // Ersetzt $...$ durch KaTeX HTML
    const html = str.replace(/\$(.*?)\$/g, (match, formula) => {
        return katex.renderToString(formula, { throwOnError: false });
    });
    element.innerHTML = html;
}

function createStars() {
    stars = Array.from({ length: 150 }, () => ({
        x: Math.random() * viewW,
        y: Math.random() * viewH,
        s: Math.random() * 2
    }));
}

function resizeCanvas() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewW * dpr;
    canvas.height = viewH * dpr;
    canvas.style.width = viewW + "px";
    canvas.style.height = viewH + "px";
    ctx.scale(dpr, dpr);
    if (gameState !== "loading") resetRocket();
}

// Steuerung
function moveSelection(dir) {
    if (gameState !== "playing") return;
    rocket.selectedIdx = Math.max(0, Math.min(2, rocket.selectedIdx + dir));
}

function launch() {
    if (gameState !== "playing") return;
    const target = answers[rocket.selectedIdx];
    rocket.targetX = target.x + target.w / 2 - ROCKET_SIZE / 2;
    rocket.targetY = target.y + target.h;
    gameState = "flying";
}

// Game Loop
function update() {
    if (gameState === "flying") {
        const dx = rocket.targetX - rocket.x;
        const dy = rocket.targetY - rocket.y;
        const dist = Math.hypot(dx, dy);
        
        rocket.angle = Math.atan2(dy, dx) + Math.PI/2;

        if (dist > 5) {
            rocket.x += (dx / dist) * rocket.speed;
            rocket.y += (dy / dist) * rocket.speed;
        } else {
            checkResult();
        }
    }
}

function checkResult() {
    const correct = rocket.selectedIdx === currentQuestion.correctAnswer;
    if (correct) {
        score += 10;
        feedback = { icon: "⭐", color: "gold" };
        showAstronaut("Richtig! " + currentQuestion.explanation);
    } else {
        feedback = { icon: "💥", color: "red" };
        showAstronaut("Leider falsch. " + currentQuestion.explanation);
    }
    scoreDisplay.textContent = `Punkte: ${score}`;
    gameState = "feedback";
    setTimeout(nextQuestion, 3000);
}

function showAstronaut(text) {
    astronautSpeech.textContent = text;
    astronautFeedback.style.display = "block";
    setTimeout(() => astronautFeedback.style.display = "none", 4000);
}

function draw() {
    ctx.clearRect(0, 0, viewW, viewH);
    
    // Hintergrund
    ctx.fillStyle = "white";
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.s, s.s));

    // Antworten
    answers.forEach((ans, i) => {
        ctx.fillStyle = rocket.selectedIdx === i ? "rgba(255, 255, 0, 0.3)" : "rgba(255, 255, 255, 0.1)";
        ctx.strokeStyle = "white";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(ans.x, ans.y, ans.w, ans.h, 10);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = "white";
        ctx.font = "bold 18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(ans.text, ans.x + ans.w / 2, ans.y + ans.h / 2 + 6);
    });

    // Rakete
    ctx.save();
    ctx.translate(rocket.x + ROCKET_SIZE/2, rocket.y + ROCKET_SIZE/2);
    ctx.rotate(rocket.angle);
    ctx.font = "40px Arial";
    ctx.fillText("🚀", 0, 0);
    ctx.restore();

    // Feedback Effekt
    if (gameState === "feedback" && feedback) {
        ctx.font = "60px Arial";
        ctx.fillText(feedback.icon, viewW / 2, viewH / 2);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Event Listeners
window.addEventListener("resize", resizeCanvas);
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") moveSelection(-1);
    if (e.key === "ArrowRight") moveSelection(1);
    if (e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") launch();
});

document.getElementById("leftButton").onclick = () => moveSelection(-1);
document.getElementById("rightButton").onclick = () => moveSelection(1);
document.getElementById("launchButton").onclick = launch;

init();
