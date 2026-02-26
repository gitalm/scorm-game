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
let effects = []; // Für ✨ und 👽️
let gameState = "loading"; 

const ROCKET_SIZE = 50;
const ROCKET_OFFSET = -Math.PI / 4; // Korrektur, da 🚀 nach NE zeigt

let rocket = {
    x: 0, y: 0,
    targetX: 0, targetY: 0,
    angle: ROCKET_OFFSET,
    speed: 12,
    selectedIdx: 1,
    isFlying: false
};

const astronauts = ["👨‍🚀", "👩‍🚀", "🧑‍🚀"];

async function init() {
    resizeCanvas();
    await loadQuestions();
    createStars();
    requestAnimationFrame(gameLoop);
}

// Rendert Text mit KaTeX Unterstützung
function renderMath(text, element) {
    if (window.katex) {
        element.innerHTML = text.replace(/\$(.*?)\$/g, (m, f) => 
            katex.renderToString(f, { throwOnError: false })
        );
    } else {
        element.textContent = text;
    }
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
        y: viewH * 0.35, // Etwas tiefer, da Feedback jetzt oben ist
        w: 130, h: 50
    }));
    
    resetRocket();
    gameState = "playing";
}

function resetRocket() {
    rocket.x = viewW / 2 - ROCKET_SIZE / 2;
    rocket.y = viewH - 120;
    rocket.angle = ROCKET_OFFSET; 
    rocket.selectedIdx = 1;
    rocket.isFlying = false;
    effects = [];
}

function createStars() {
    stars = Array.from({ length: 100 }, () => ({
        x: Math.random() * viewW,
        y: Math.random() * viewH,
        s: Math.random() * 2 + 1,
        speed: Math.random() * 3 + 1
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

function moveSelection(dir) {
    if (gameState !== "playing" || rocket.isFlying) return;
    rocket.selectedIdx = Math.max(0, Math.min(2, rocket.selectedIdx + dir));
}

function launch() {
    if (gameState !== "playing" || rocket.isFlying) return;
    const target = answers[rocket.selectedIdx];
    rocket.targetX = target.x + target.w / 2 - ROCKET_SIZE / 2;
    rocket.targetY = target.y + target.h;
    rocket.isFlying = true;
    gameState = "flying";
}

function showFeedback(isCorrect) {
    const emoji = astronauts[Math.floor(Math.random() * astronauts.length)];
    astronautEmoji.textContent = emoji;
    
    // Effekt-Icons setzen
    const icon = isCorrect ? "✨" : "👽️";
    for(let i=0; i<8; i++) {
        effects.push({
            x: rocket.x + 25, y: rocket.y,
            vx: (Math.random()-0.5)*10, vy: (Math.random()-0.5)*10,
            char: icon, life: 1.0
        });
    }

    const prefix = isCorrect ? "✅ Richtig! " : "❌ Falsch... ";
    renderMath(prefix + currentQuestion.explanation, astronautSpeech);
    
    astronautFeedback.style.display = "flex";
    setTimeout(() => {
        astronautFeedback.style.display = "none";
        nextQuestion();
    }, 4500);
}

function update() {
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > viewH) star.y = 0;
    });

    // Partikel-Effekte updaten
    effects.forEach(e => {
        e.x += e.vx; e.y += e.vy;
        e.life -= 0.02;
    });

    if (gameState === "flying") {
        const dx = rocket.targetX - rocket.x;
        const dy = rocket.targetY - rocket.y;
        const dist = Math.hypot(dx, dy);
        
        // Winkel berechnen + Emoji-Korrektur (-45 Grad)
        rocket.angle = Math.atan2(dy, dx) + Math.PI/2 + ROCKET_OFFSET;

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
    } else if (gameState === "playing") {
        // Sanftes Schweben im Stand (kein Zittern)
        rocket.y = (viewH - 120) + Math.sin(Date.now() / 400) * 5;
        rocket.angle = ROCKET_OFFSET + Math.sin(Date.now() / 600) * 0.05;
    }
}

function draw() {
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, viewW, viewH);
    
    ctx.fillStyle = "white";
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.s, s.s));

    // Effekte zeichnen
    effects.forEach(e => {
        if(e.life > 0) {
            ctx.globalAlpha = e.life;
            ctx.font = "30px Arial";
            ctx.fillText(e.char, e.x, e.y);
        }
    });
    ctx.globalAlpha = 1.0;

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
