// --- SCORM API ---
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
        if (this.api) { this.api.LMSInitialize(""); this.active = true; }
    },
    save(score, total) {
        if (!this.active) return;
        let percent = Math.round((score / total) * 100);
        this.api.LMSSetValue("cmi.core.score.raw", percent.toString());
        if (percent >= 66) this.api.LMSSetValue("cmi.core.lesson_status", "passed");
        else this.api.LMSSetValue("cmi.core.lesson_status", "failed");
        this.api.LMSCommit("");
    }
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const answerContainer = document.getElementById("answerContainer");
const scoreDisplay = document.getElementById("scoreDisplay");
const questionDisplay = document.getElementById("questionDisplay");
const astronautFeedback = document.getElementById("astronautFeedback");
const astronautSpeech = document.getElementById("astronautSpeech");
const astronautEmoji = document.getElementById("astronautEmoji");

let viewW, viewH, score = 0, questions = [], currentQuestion = null;
let askedCount = 0, stars = [], effects = [], gameState = "loading"; 

const ROCKET_SIZE = 50;
const EMOJI_FIX = -Math.PI / 4; 

let rocket = {
    x: 0, y: 0, targetX: 0, targetY: 0,
    angle: EMOJI_FIX, speed: 16,
    selectedIdx: 1, isFlying: false
};

async function init() {
    scorm.init();
    resizeCanvas();
    await loadQuestions();
    createStars();
    requestAnimationFrame(gameLoop);
}

function renderMath(text, element) {
    if (window.katex) {
        // Ersetzt $...$ durch KaTeX, erlaubt aber auch <img> Tags
        element.innerHTML = text.replace(/\$(.*?)\$/g, (m, f) => 
            katex.renderToString(f, { throwOnError: false })
        );
    } else { element.innerHTML = text; }
}

async function loadQuestions() {
    try {
        const res = await fetch("question.json?v=" + Date.now());
        let data = await res.json();
        questions = data.sort(() => Math.random() - 0.5);
        nextQuestion();
    } catch (err) { questionDisplay.textContent = "Fehler!"; }
}

function nextQuestion() {
    if (askedCount >= 20 || askedCount >= questions.length) {
        endGame(); return;
    }
    astronautFeedback.style.display = "none";
    effects = [];
    currentQuestion = questions[askedCount];
    renderMath(`${askedCount + 1}/20: ${currentQuestion.question}`, questionDisplay);
    
    // Erstelle HTML-Antwortboxen
    answerContainer.innerHTML = "";
    currentQuestion.answers.forEach((text, i) => {
        const div = document.createElement("div");
        div.className = "answerBox" + (i === 1 ? " selected" : "");
        div.id = "ans" + i;
        renderMath(text, div); // Unterstützt jetzt Mathe & Bilder in Antworten!
        answerContainer.appendChild(div);
    });

    rocket.isFlying = false;
    rocket.selectedIdx = 1;
    rocket.x = viewW / 2 - ROCKET_SIZE / 2;
    rocket.y = viewH - 140;
    updateRocketAngle();
    gameState = "playing";
}

function endGame() {
    gameState = "finished";
    let percent = Math.round((score / (askedCount * 10)) * 100);
    let msg = percent >= 66 ? "MISSION ERFOLGREICH! 🚀" : "BASIS AN RAKETE: ZU WENIG PUNKTE. 👽️";
    questionDisplay.innerHTML = `<h2>Spiel Ende</h2>${msg}<br>Ergebnis: ${percent}%`;
    scorm.save(score, askedCount * 10);
}

function updateRocketAngle() {
    const targetEl = document.getElementById("ans" + rocket.selectedIdx);
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const tx = rect.left + rect.width / 2;
    const ty = rect.top + rect.height;
    
    const dx = tx - (rocket.x + ROCKET_SIZE / 2);
    const dy = ty - (rocket.y + ROCKET_SIZE / 2);
    rocket.angle = Math.atan2(dy, dx) + Math.PI/2 + EMOJI_FIX;
}

function createStars() {
    stars = Array.from({ length: 80 }, () => ({
        x: Math.random() * viewW, y: Math.random() * viewH,
        s: Math.random() * 2 + 1, speed: Math.random() * 2 + 1
    }));
}

function resizeCanvas() {
    viewW = window.innerWidth; viewH = window.innerHeight;
    canvas.width = viewW * (window.devicePixelRatio || 1);
    canvas.height = viewH * (window.devicePixelRatio || 1);
    ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
}

function moveSelection(dir) {
    if (gameState !== "playing") return;
    document.getElementById("ans" + rocket.selectedIdx).classList.remove("selected");
    rocket.selectedIdx = Math.max(0, Math.min(2, rocket.selectedIdx + dir));
    document.getElementById("ans" + rocket.selectedIdx).classList.add("selected");
    updateRocketAngle();
}

function launch() {
    if (gameState !== "playing") return;
    const targetEl = document.getElementById("ans" + rocket.selectedIdx);
    const rect = targetEl.getBoundingClientRect();
    rocket.targetX = rect.left + rect.width / 2 - ROCKET_SIZE / 2;
    rocket.targetY = rect.top + rect.height / 2;
    rocket.isFlying = true;
    gameState = "flying";
}

function showFeedback(isCorrect) {
    gameState = "feedback"; 
    askedCount++;
    const char = isCorrect ? "✨" : "👽️";
    for(let i=0; i<15; i++) {
        effects.push({
            x: rocket.x + 25, y: rocket.y + 25,
            vx: (Math.random()-0.5)*12, vy: (Math.random()-0.5)*12,
            char: char, life: 1.0
        });
    }
    renderMath((isCorrect ? "✅ Richtig! " : "❌ Falsch... ") + currentQuestion.explanation, astronautSpeech);
    astronautEmoji.textContent = ["👨‍🚀", "👩‍🚀", "🧑‍🚀"][Math.floor(Math.random() * 3)];
    astronautFeedback.style.display = "flex";
}

function update() {
    stars.forEach(s => { s.y += s.speed; if (s.y > viewH) s.y = 0; });
    effects.forEach(e => { e.x += e.vx; e.y += e.vy; e.life -= 0.02; });

    if (gameState === "flying") {
        const dx = rocket.targetX - rocket.x;
        const dy = rocket.targetY - rocket.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 8) {
            rocket.x += (dx / dist) * rocket.speed;
            rocket.y += (dy / dist) * rocket.speed;
        } else {
            showFeedback(rocket.selectedIdx === currentQuestion.correctAnswer);
            if (rocket.selectedIdx === currentQuestion.correctAnswer) score += 10;
            scoreDisplay.textContent = `Punkte: ${score}`;
        }
    } else if (gameState === "playing") {
        rocket.y = (viewH - 140) + Math.sin(Date.now() / 400) * 4;
    }
}

function draw() {
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.fillStyle = "white"; stars.forEach(s => ctx.fillRect(s.x, s.y, s.s, s.s));
    effects.forEach(e => {
        if(e.life > 0) {
            ctx.globalAlpha = e.life; ctx.font = "24px Arial";
            ctx.fillText(e.char, e.x, e.y);
        }
    });
    ctx.globalAlpha = 1.0;
    if (gameState !== "finished") {
        ctx.save();
        ctx.translate(rocket.x + 25, rocket.y + 25);
        ctx.rotate(rocket.angle);
        ctx.font = "50px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🚀", 0, 0);
        ctx.restore();
    }
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }

document.addEventListener("keydown", (e) => {
    if (gameState === "finished") return;
    if (e.key === "ArrowLeft" || e.key === "a") moveSelection(-1);
    if (e.key === "ArrowRight" || e.key === "d") moveSelection(1);
    if (e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        if (gameState === "feedback") nextQuestion(); else launch();
    }
});

document.getElementById("leftButton").onclick = () => moveSelection(-1);
document.getElementById("rightButton").onclick = () => moveSelection(1);
document.getElementById("launchButton").onclick = launch;
window.addEventListener("resize", resizeCanvas);
init();
