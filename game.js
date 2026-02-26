// --- SCORM API INTEGRATION ---
const scorm = {
    active: false,
    init() {
        // Verbindung zum LMS (Moodle)
        this.api = (function findAPI(win) {
            let n = 0;
            while ((win.API == null) && (win.parent != null) && (win.parent != win)) {
                if (n++ > 10) return null; win = win.parent;
            }
            return win.API;
        })(window);

        if (this.api) {
            this.api.LMSInitialize("");
            this.active = true;
            console.log("SCORM: Verbunden.");
        }
    },
    save(score) {
        if (!this.active) return;
        this.api.LMSSetValue("cmi.core.score.raw", score.toString());
        this.api.LMSSetValue("cmi.core.score.max", "100");
        if (score >= 50) this.api.LMSSetValue("cmi.core.lesson_status", "passed");
        this.api.LMSCommit("");
    }
};

// --- SPIEL LOGIK ---
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const questionDisplay = document.getElementById("questionDisplay");
const astronautFeedback = document.getElementById("astronautFeedback");
const astronautSpeech = document.getElementById("astronautSpeech");
const astronautEmoji = document.getElementById("astronautEmoji");

let viewW, viewH, score = 0, questions = [], currentQuestion = null;
let answers = [], stars = [], effects = [], gameState = "loading"; 

const ROCKET_SIZE = 50;
const ROCKET_OFFSET = -Math.PI / 4; // Korrektur für das 45° 🚀 Emoji

let rocket = {
    x: 0, y: 0, targetX: 0, targetY: 0,
    angle: ROCKET_OFFSET, speed: 14,
    selectedIdx: 1, isFlying: false
};

const astronauts = ["👨‍🚀", "👩‍🚀", "🧑‍🚀"];

async function init() {
    scorm.init();
    resizeCanvas();
    await loadQuestions();
    createStars();
    requestAnimationFrame(gameLoop);
}

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
    } catch (err) { console.error("Ladefehler"); }
}

function nextQuestion() {
    if (questions.length === 0) return;
    
    // Feedback ausblenden
    astronautFeedback.style.display = "none";
    effects = [];
    
    currentQuestion = questions[Math.floor(Math.random() * questions.length)];
    renderMath(currentQuestion.question, questionDisplay);
    
    const spacing = viewW / 3;
    answers = currentQuestion.answers.map((text, i) => ({
        text,
        x: spacing * i + spacing / 2 - 65,
        y: viewH * 0.35,
        w: 130, h: 50
    }));
    
    rocket.isFlying = false;
    rocket.selectedIdx = 1;
    updateRocketAngle(); // Sofort ausrichten
    gameState = "playing";
}

function updateRocketAngle() {
    if (rocket.isFlying) return;
    const target = answers[rocket.selectedIdx];
    const tx = target.x + target.w / 2 - ROCKET_SIZE / 2;
    const ty = target.y + target.h;
    
    // Winkel zum Ziel berechnen + Emoji-Offset
    const dx = tx - rocket.x;
    const dy = ty - (viewH - 120);
    rocket.angle = Math.atan2(dy, dx) + Math.PI/2 + ROCKET_OFFSET;
}

function createStars() {
    stars = Array.from({ length: 80 }, () => ({
        x: Math.random() * viewW, y: Math.random() * viewH,
        s: Math.random() * 2 + 1, speed: Math.random() * 2 + 1
    }));
}

function resizeCanvas() {
    viewW = window.innerWidth; viewH = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewW * dpr; canvas.height = viewH * dpr;
    ctx.scale(dpr, dpr);
    rocket.x = viewW / 2 - ROCKET_SIZE / 2;
    rocket.y = viewH - 120;
}

function moveSelection(dir) {
    if (gameState !== "playing") return;
    rocket.selectedIdx = Math.max(0, Math.min(2, rocket.selectedIdx + dir));
    updateRocketAngle();
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
    
    const icon = isCorrect ? "✨" : "👽️";
    for(let i=0; i<10; i++) {
        effects.push({
            x: rocket.x + 25, y: rocket.y,
            vx: (Math.random()-0.5)*12, vy: (Math.random()-0.5)*12,
            char: icon, life: 1.0
        });
    }

    const prefix = isCorrect ? "✅ Richtig! " : "❌ Falsch... ";
    renderMath(prefix + currentQuestion.explanation, astronautSpeech);
    
    astronautFeedback.style.display = "flex";
    scorm.save(score);
    
    // Automatischer Wechsel nach 5 Sek, falls keine Leertaste gedrückt wird
    this.timer = setTimeout(() => { if(gameState === "feedback") nextQuestion(); }, 5000);
}

function update() {
    stars.forEach(s => { s.y += s.speed; if (s.y > viewH) s.y = 0; });
    effects.forEach(e => { e.x += e.vx; e.y += e.vy; e.life -= 0.015; });

    if (gameState === "flying") {
        const dx = rocket.targetX - rocket.x;
        const dy = rocket.targetY - rocket.y;
        const dist = Math.hypot(dx, dy);
        
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
        rocket.x = viewW / 2 - ROCKET_SIZE / 2;
        rocket.y = (viewH - 120) + Math.sin(Date.now() / 400) * 3;
    }
}

function draw() {
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.fillStyle = "white";
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.s, s.s));

    effects.forEach(e => {
        if(e.life > 0) {
            ctx.globalAlpha = e.life;
            ctx.font = "30px Arial";
            ctx.fillText(e.char, e.x, e.y);
        }
    });
    ctx.globalAlpha = 1.0;

    answers.forEach((ans, i) => {
        const sel = rocket.selectedIdx === i;
        ctx.fillStyle = sel ? "rgba(255, 255, 0, 0.2)" : "rgba(255, 255, 255, 0.05)";
        ctx.strokeStyle = sel ? "yellow" : "white";
        ctx.lineWidth = sel ? 3 : 1;
        ctx.beginPath(); ctx.roundRect(ans.x, ans.y, ans.w, ans.h, 8); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "white"; ctx.font = "18px Arial"; ctx.textAlign = "center";
        ctx.fillText(ans.text, ans.x + ans.w / 2, ans.y + ans.h / 2 + 6);
    });

    ctx.save();
    ctx.translate(rocket.x + ROCKET_SIZE/2, rocket.y + ROCKET_SIZE/2);
    ctx.rotate(rocket.angle);
    ctx.font = "50px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🚀", 0, 0);
    ctx.restore();
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }

window.addEventListener("resize", resizeCanvas);
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") moveSelection(-1);
    if (e.key === "ArrowRight" || e.key === "d") moveSelection(1);
    if (e.key === "ArrowUp" || e.key === "Enter") launch();
    if (e.key === " ") {
        if (gameState === "feedback") nextQuestion();
        else launch();
    }
});

document.getElementById("leftButton").onclick = () => moveSelection(-1);
document.getElementById("rightButton").onclick = () => moveSelection(1);
document.getElementById("launchButton").onclick = launch;

init();
