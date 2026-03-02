// --- SOUND ENGINE ---
const Sound = {
    ctx: null,
    isMuted: true,
    init() { 
        if(!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (this.ctx.state === 'suspended') this.ctx.resume();
        }
    },
    play(freq, type, duration, vol=0.1) {
        if (!this.ctx || this.isMuted) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type; osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            osc.connect(gain); gain.connect(this.ctx.destination);
            gain.gain.setValueAtTime(vol, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
            osc.start(); osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    },
    success() { this.play(523, 'sine', 0.2); setTimeout(() => this.play(659, 'sine', 0.3), 100); },
    error() { this.play(150, 'sawtooth', 0.4); this.play(100, 'sawtooth', 0.4); },
    boost() { this.play(200, 'sawtooth', 1.0, 0.05); }
};

// --- SCORM ---
const scorm = {
    active: false,
    init() {
        this.api = (function findAPI(win) {
            let n = 0; while ((win.API == null) && (win.parent != null) && (win.parent != win)) { if (n++ > 10) return null; win = win.parent; }
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

let viewW, viewH, score = 0, questions = [], currentQuestion = null;
let askedCount = 0, effects = [], gameState = "start"; 

const ROCKET_SIZE = 60;
const EMOJI_FIX = -Math.PI / 4; // Damit das Emoji 🚀 gerade steht
const ROCKET_Y_REL = 0.88; 

let rocket = { x: 0, y: 0, targetX: 0, targetY: 0, angle: EMOJI_FIX, speed: 22, selectedIdx: 1, isFlying: false };

function renderMath(text, element) {
    if (window.katex) {
        element.innerHTML = text.replace(/\$(.*?)\$/g, (m, f) => katex.renderToString(f, { throwOnError: false }));
    } else { element.innerHTML = text; }
}

function resizeCanvas() {
    viewW = window.innerWidth; viewH = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = viewW * dpr; canvas.height = viewH * dpr;
    ctx.scale(dpr, dpr);
    if (!rocket.isFlying && gameState !== "intro") resetRocketPos();
}

// Setzt Rakete in die Mitte und lässt sie nach oben zeigen
function resetRocketPos() {
    rocket.x = viewW / 2 - ROCKET_SIZE / 2; 
    rocket.y = viewH * ROCKET_Y_REL - 40; 
    rocket.angle = EMOJI_FIX; // Nach OBEN zeigen
    rocket.isFlying = false;
}

function updateRocketAngle() {
    const targetEl = document.getElementById("ans" + rocket.selectedIdx);
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const dx = (rect.left + rect.width / 2) - (rocket.x + ROCKET_SIZE / 2);
    const dy = (rect.top + rect.height) - (rocket.y + ROCKET_SIZE / 2);
    rocket.angle = Math.atan2(dy, dx) + Math.PI / 2 + EMOJI_FIX;
}

function startIntro() {
    gameState = "intro";
    rocket.x = viewW / 2 - ROCKET_SIZE / 2;
    rocket.y = viewH + 100;
    rocket.angle = EMOJI_FIX;
    Sound.boost();
    const targetY = viewH * ROCKET_Y_REL - 40;
    const animate = () => {
        if (rocket.y > targetY) {
            rocket.y -= 8;
            requestAnimationFrame(animate);
        } else {
            nextQuestion();
        }
    };
    animate();
}

function showFeedback(isCorrect) {
    gameState = "feedback"; askedCount++;
    if (isCorrect) { score += 10; Sound.success(); } else { Sound.error(); }
    scoreDisplay.textContent = `Punkte: ${score}`;
    const char = isCorrect ? "✨" : "👽️";
    for(let i=0; i<15; i++) {
        effects.push({ x: rocket.x + 30, y: rocket.y + 30, vx: (Math.random()-0.5)*18, vy: (Math.random()-0.5)*18, char: char, life: 1.0 });
    }
    renderMath((isCorrect ? "✅ Richtig! " : "❌ Falsch... ") + currentQuestion.explanation + " <br><small>(Tippen oder Taste zum Fortfahren)</small>", astronautSpeech);
    astronautFeedback.style.display = "flex";
}

function nextQuestion() {
    if (askedCount >= questions.length) { endGame(); return; }
    astronautFeedback.style.display = "none";
    effects = [];
    currentQuestion = questions[askedCount];
    renderMath(currentQuestion.question, questionDisplay);
    answerContainer.innerHTML = "";
    currentQuestion.answers.forEach((text, i) => {
        const div = document.createElement("div");
        div.className = "answerBox";
        div.id = "ans" + i;
        div.onclick = (e) => { 
            e.stopPropagation(); // Verhindert globales Klick-Event
            if (gameState === "playing") selectAndLaunch(i); 
        };
        renderMath(text, div);
        answerContainer.appendChild(div);
    });
    resetRocketPos();
    gameState = "playing";
}

function selectAndLaunch(idx) {
    if (gameState !== "playing") return;
    gameState = "flying"; 
    
    // UI Update
    document.querySelectorAll(".answerBox").forEach(b => b.classList.remove("selected"));
    document.getElementById("ans" + idx).classList.add("selected");
    rocket.selectedIdx = idx;
    
    // Winkel berechnen und Flug starten
    updateRocketAngle();
    const rect = document.getElementById("ans" + idx).getBoundingClientRect();
    rocket.targetX = rect.left + rect.width / 2 - ROCKET_SIZE / 2;
    rocket.targetY = rect.top + rect.height;
    rocket.isFlying = true;
}

function endGame() {
    gameState = "finished";
    answerContainer.innerHTML = ""; astronautFeedback.style.display = "none";
    const maxP = questions.length * 10;
    const perc = Math.round((score / maxP) * 100);
    scorm.save(score, maxP);
    questionDisplay.innerHTML = `
        <div class="end-screen">
            <h2>Missionsbericht</h2>
            <div class="stat-box">${perc}% Erfolg</div>
            <button class="end-btn" onclick="location.reload()">Neustart</button>
        </div>`;
}

function update() {
    effects.forEach(e => { e.x += e.vx; e.y += e.vy; e.life -= 0.02; });
    if (gameState === "flying") {
        const dx = rocket.targetX - rocket.x;
        const dy = rocket.targetY - rocket.y;
        const dist = Math.hypot(dx, dy);
        if (dist > rocket.speed) {
            rocket.x += (dx / dist) * rocket.speed;
            rocket.y += (dy / dist) * rocket.speed;
        } else {
            rocket.x = rocket.targetX; rocket.y = rocket.targetY;
            showFeedback(rocket.selectedIdx === currentQuestion.correctAnswer);
        }
    } else if (gameState === "playing") {
        rocket.y = (viewH * ROCKET_Y_REL - 40) + Math.sin(Date.now() / 400) * 4;
    }
}

function draw() {
    ctx.clearRect(0, 0, viewW, viewH);
    ctx.fillStyle = "white"; 
    for(let i=0; i<40; i++) { ctx.fillRect((i*97)%viewW, (i*137)%viewH, 1, 1); }
    effects.forEach(e => { if(e.life > 0) { ctx.globalAlpha = e.life; ctx.font = "30px Arial"; ctx.fillText(e.char, e.x, e.y); } });
    ctx.globalAlpha = 1.0;
    if (!["finished", "start"].includes(gameState)) {
        ctx.save(); ctx.translate(rocket.x + 30, rocket.y + 30); ctx.rotate(rocket.angle);
        ctx.font = "60px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🚀", 0, 0); ctx.restore();
    }
}

function gameLoop() { update(); draw(); requestAnimationFrame(gameLoop); }

async function loadQuestions() {
    try {
        const res = await fetch("question.json?v=" + Date.now());
        questions = (await res.json()).sort(() => Math.random() - 0.5);
    } catch (err) { questionDisplay.textContent = "Ladefehler!"; }
}

// Globales Klick-Event für "Überall Klicken zum Weiter"
window.addEventListener("click", () => {
    if (gameState === "feedback") nextQuestion();
});

// Globales Key-Event für "Jede Taste zum Weiter" oder Steuerung
document.addEventListener("keydown", (e) => {
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
    
    if (gameState === "feedback") {
        nextQuestion();
        return;
    }
    
    if (gameState !== "playing") return;
    
    if (e.key === "ArrowLeft") selectAndLaunch(0);
    if (e.key === "ArrowRight") selectAndLaunch(2);
    if (e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") selectAndLaunch(1);
});

document.getElementById("startBtn").onclick = (e) => { 
    e.stopPropagation(); Sound.init(); 
    document.getElementById("startScreen").style.display = "none"; startIntro(); 
};
document.getElementById("infoToggle").onclick = (e) => { e.stopPropagation(); document.getElementById("infoOverlay").style.display = "flex"; };
document.getElementById("closeInfoBtn").onclick = (e) => { e.stopPropagation(); document.getElementById("infoOverlay").style.display = "none"; };
document.getElementById("muteToggle").onclick = (e) => {
    e.stopPropagation(); Sound.init(); Sound.isMuted = !Sound.isMuted;
    e.target.innerText = Sound.isMuted ? "🔇" : "🔊";
};

window.addEventListener("resize", resizeCanvas);
scorm.init();
resizeCanvas();
loadQuestions();
gameLoop();
