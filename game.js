// --- SCORM API (für Moodle) ---
const scorm = {
    active: false,
    init() {
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

// --- SPIEL-VARIABLEN ---
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
// Das Emoji 🚀 zeigt standardmäßig nach "Nord-Ost" (45°). 
// Um es nach Norden (0°) zu drehen, müssen wir es um -45° ( -PI/4 ) korrigieren.
const EMOJI_FIX = -Math.PI / 4; 

let rocket = {
    x: 0, y: 0, targetX: 0, targetY: 0,
    angle: EMOJI_FIX, speed: 15,
    selectedIdx: 1, isFlying: false
};

const astronauts = ["👨‍🚀", "👩‍🚀", "🧑‍🚀"];

// --- FUNKTIONEN ---

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
    } catch (err) { console.error("Fehler beim Laden der JSON"); }
}

function nextQuestion() {
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
    updateRocketAngle(); // Initial ausrichten
    gameState = "playing";
}

function updateRocketAngle() {
    if (rocket.isFlying) return;
    const target = answers[rocket.selectedIdx];
    const tx = target.x + target.w / 2;
    const ty = target.y + target.h;
    
    // Berechne den Winkel von der Raketenbasis zum Ziel
    const dx = tx - (rocket.x + ROCKET_SIZE / 2);
    const dy = ty - (rocket.y + ROCKET_SIZE / 2);
    
    // atan2 gibt den Winkel im Bogenmaß. Wir addieren 90° (PI/2), 
    // damit "vorne" oben ist, und ziehen den EMOJI_FIX ab.
    rocket.angle = Math.atan2(dy, dx) + Math.PI/2 + EMOJI_FIX;
}

function createStars() {
    stars = Array.from({ length: 100 }, () => ({
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
    rocket.y = viewH - 140;
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
    
    // Belohnungseffekte ✨ oder Aliens 👽️
    const char = isCorrect ? "✨" : "👽️";
    for(let i=0; i<12; i++) {
        effects.push({
            x: rocket.x + ROCKET_SIZE/2, y: rocket.y,
            vx: (Math.random()-0.5) * 10,
            vy: (Math.random()-0.5) * 10,
            char: char, life: 1.0
        });
    }

    const prefix = isCorrect ? "✅ Richtig! " : "❌ Falsch... ";
    renderMath(prefix + currentQuestion.explanation, astronautSpeech);
    
    astronautFeedback.style.display = "flex";
    scorm.save(score);
}

function update() {
    // Hintergrundbewegung
    stars.forEach(s => { s.y += s.speed; if (s.y > viewH) s.y = 0; });
    
    // Partikelbewegung
    effects.forEach(e => { 
        e.x += e.vx; e.y += e.vy; 
        e.life -= 0.02; 
    });

    if (gameState === "flying") {
        const dx = rocket.targetX - rocket.x;
        const dy = rocket.targetY - rocket.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist > 5) {
            rocket.x += (dx / dist) * rocket.speed;
            rocket.y += (dy / dist) * rocket.speed;
        } else {
            const isCorrect = rocket.selectedIdx === currentQuestion.correctAnswer;
            if (isCorrect) score += 10;
            scoreDisplay.textContent = `Punkte: ${score}`;
            gameState = "feedback";
            showFeedback(isCorrect);
        }
    } else if (gameState === "playing") {
        // Sanftes Schweben im Stand
        rocket.y = (viewH - 140) + Math.sin(Date.now() / 400) * 4;
    }
}

function draw() {
    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, viewW, viewH);

    // Sterne
    ctx.fillStyle = "white";
    stars.forEach(s => ctx.fillRect(s.x, s.y, s.s, s.s));

    // Belohnung / Fehler Partikel
    effects.forEach(e => {
        if(e.life > 0) {
            ctx.globalAlpha = e.life;
            ctx.font = "24px Arial";
            ctx.fillText(e.char, e.x, e.y);
        }
    });
    ctx.globalAlpha = 1.0;

    // Antworten
    answers.forEach((ans, i) => {
        const sel = rocket.selectedIdx === i;
        ctx.fillStyle = sel ? "rgba(255, 255, 0, 0.2)" : "rgba(255, 255, 255, 0.05)";
        ctx.strokeStyle = sel ? "yellow" : "white";
        ctx.lineWidth = sel ? 3 : 1;
        ctx.beginPath(); ctx.roundRect(ans.x, ans.y, ans.w, ans.h, 8); ctx.fill(); ctx.stroke();
        
        ctx.fillStyle = "white"; ctx.font = "bold 18px Arial"; ctx.textAlign = "center";
        ctx.fillText(ans.text, ans.x + ans.w / 2, ans.y + ans.h / 2 + 6);
    });

    // Rakete
    ctx.save();
    ctx.translate(rocket.x + ROCKET_SIZE/2, rocket.y + ROCKET_SIZE/2);
    ctx.rotate(rocket.angle);
    ctx.font = "50px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("🚀", 0, 0);
    ctx.restore();
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }

// Steuerung
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft" || e.key === "a") moveSelection(-1);
    if (e.key === "ArrowRight" || e.key === "d") moveSelection(1);
    if (e.key === "ArrowUp" || e.key === "Enter") launch();
    if (e.key === " ") {
        if (gameState === "feedback") nextQuestion();
        else launch();
    }
});

// Touch Events
document.getElementById("leftButton").onclick = () => moveSelection(-1);
document.getElementById("rightButton").onclick = () => moveSelection(1);
document.getElementById("launchButton").onclick = launch;

window.addEventListener("resize", resizeCanvas);
init();
