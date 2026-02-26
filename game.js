const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const questionDisplay = document.getElementById("questionDisplay");
const astronautFeedback = document.getElementById("astronautFeedback");
const astronautSpeech = document.getElementById("astronautSpeech");
const astronautEmoji = document.getElementById("astronautEmoji");

let viewW, viewH;
let score = 0;
let questions = [];
let currentQuestion = null;
let answers = [];
let stars = [];
let gameState = "loading"; 

const ROCKET_SIZE = 50;
let rocket = {
    x: 0, y: 0,
    targetX: 0, targetY: 0,
    angle: 0,
    speed: 10,
    selectedIdx: 1,
    isFlying: false
};

// Astronauten-Pool für Abwechslung
const astronauts = ["👨‍🚀", "👩‍🚀", "🧑‍🚀"];

async function init() {
    resizeCanvas();
    await loadQuestions();
    createStars();
    requestAnimationFrame(gameLoop);
}

// Hilfsfunktion für KaTeX-Rendering in HTML-Elementen
function renderMath(text, element) {
    if (!window.katex) {
        element.textContent = text;
        return;
    }
    element.innerHTML = text.replace(/\$(.*?)\$/g, (m, formula) => 
        katex.renderToString(formula, { throwOnError: false })
    );
}

async function loadQuestions() {
    try {
        const res = await fetch("question.json?v=" + Date.now());
        questions = await res.json();
        nextQuestion();
    } catch (err) {
        questionDisplay.textContent = "Fehler beim Laden!";
    }
}

function nextQuestion() {
    if (questions.length === 0) return;
    currentQuestion = questions[Math.floor(Math.random() * questions.length)];
    renderMath(currentQuestion.question, questionDisplay);
    
    const spacing = viewW / 3;
    answers = currentQuestion.answers.map((text, i) => ({
        text,
        x: spacing * i + spacing / 2 - 65,
        y: viewH * 0.3,
        w: 130, h: 50
    }));
    
    resetRocket();
    gameState = "playing";
}

function resetRocket() {
    rocket.x = viewW / 2 - ROCKET_SIZE / 2;
    rocket.y = viewH - 150;
    rocket.angle = 0; 
    rocket.selectedIdx = 1;
    rocket.isFlying = false;
}

function createStars() {
    stars = Array.from({ length: 100 }, () => ({
        x: Math.random() * viewW,
        y: Math.random() * viewH,
        s: Math.random() * 2 + 1,
        speed: Math.random() * 2 + 0.5 // Unterschiedliche Geschwindigkeiten für Tiefe
    }));
}

function resizeCanvas() {
    viewW = window.innerWidth;
    viewH = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewW * dpr;
    canvas.height = viewH * dpr;
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
    rocket.isFlying = true;
    gameState = "flying";
}

function showFeedback(isCorrect) {
    const emoji = astronauts[Math.floor(Math.random() * astronauts.length)];
    astronautEmoji.textContent = emoji;
    
    const prefix = isCorrect ? "✅ Richtig! " : "❌ Oh weh... ";
    renderMath(prefix + currentQuestion.explanation, astronautSpeech);
    
    astronautFeedback.style.display = "flex";
    setTimeout(() => {
        astronautFeedback.style.display = "none";
        nextQuestion();
    }, 4000);
}

function update() {
    // Sterne bewegen (Weltraum-Flug-Effekt)
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > viewH) star.y = 0;
    });

    if (gameState === "flying") {
        const dx = rocket.targetX - rocket.x;
        const dy = rocket.targetY - rocket.y;
        const dist = Math.hypot(dx, dy);
        
        // Rakete zum Ziel drehen (Emoji-Korrektur: Rakete zeigt meist nach oben rechts)
        // Wir addieren oder subtrahieren Winkel, bis die Spitze passt.
        rocket.angle = Math.atan2(dy, dx) + Math.PI / 4; 

        if (dist > 5) {
            rocket.x += (dx / dist) * rocket.speed;
            rocket.y += (dy / dist) * rocket.speed;
        } else {
            const correct = rocket.selectedIdx === currentQuestion.correctAnswer;
            if (correct) score += 10;
            scoreDisplay.textContent = `Punkte: ${score}`;
            gameState = "feedback";
            showFeedback(correct);
        }
    } else {
        // Leichte Schwankung im Stand
        rocket.angle = Math.sin(Date.now() / 500) * 0.1;
    }
}

function draw() {
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, viewW, viewH);
    
    // Sterne zeichnen
    ctx.fillStyle = "white";
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.s, s.s));

    // Antworten zeichnen
    answers.forEach((ans, i) => {
        const isSelected = rocket.selectedIdx === i;
        ctx.fillStyle = isSelected ? "rgba(255, 255, 0, 0.2)" : "rgba(255, 255, 255, 0.05)";
        ctx.strokeStyle = isSelected ? "yellow" : "white";
        ctx.lineWidth = isSelected ? 3 : 1;
        
        ctx.beginPath();
        ctx.roundRect(ans.x, ans.y, ans.w, ans.h, 8);
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = "white";
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.fillText(ans.text, ans.x + ans.w / 2, ans.y + ans.h / 2 + 6);
    });

    // Rakete zeichnen
    ctx.save();
    ctx.translate(rocket.x + ROCKET_SIZE/2, rocket.y + ROCKET_SIZE/2);
    ctx.rotate(rocket.angle);
    ctx.font = "50px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🚀", 0, 0);
    ctx.restore();
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Events
window.addEventListener("resize", resizeCanvas);
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") moveSelection(-1);
    if (e.key === "ArrowRight" || e.key === "d") moveSelection(1);
    if (e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") launch();
});

document.getElementById("leftButton").onclick = () => moveSelection(-1);
document.getElementById("rightButton").onclick = () => moveSelection(1);
document.getElementById("launchButton").onclick = launch;

init();
