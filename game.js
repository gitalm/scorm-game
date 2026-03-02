const Sound = {
    ctx: null, isMuted: true,
    init() { if(!this.ctx) this.ctx = new (AudioContext || webkitAudioContext)(); },
    play(f, t, d) {
        if(!this.ctx || this.isMuted) return;
        let o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = t; o.frequency.setValueAtTime(f, this.ctx.currentTime);
        o.connect(g); g.connect(this.ctx.destination);
        g.gain.setValueAtTime(0.1, this.ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + d);
        o.start(); o.stop(this.ctx.currentTime + d);
    }
};

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const answerContainer = document.getElementById("answerContainer");
const questionDisplay = document.getElementById("questionDisplay");
const astronautFeedback = document.getElementById("astronautFeedback");
const astronautSpeech = document.getElementById("astronautSpeech");

let viewW, viewH, questions = [], curQ = null, asked = 0, score = 0, effects = [], gameState = "start";
const ROCKET_SIZE = 60;
const EMOJI_FIX = -Math.PI / 4; // Korrektur für 🚀 (zeigt standardmäßig nach 45 Grad)
let rocket = { x: 0, y: 0, targetX: 0, targetY: 0, angle: EMOJI_FIX, speed: 18 };

function resize() {
    viewW = window.innerWidth; viewH = window.innerHeight;
    canvas.width = viewW; canvas.height = viewH;
    if(gameState === "playing") resetRocket();
}

function resetRocket() {
    rocket.x = viewW / 2 - ROCKET_SIZE / 2;
    rocket.y = viewH * 0.65; // Zentral positioniert für Mobile-Sicherheit
    rocket.angle = EMOJI_FIX; // SENKRECHT NACH OBEN
}

function nextQuestion() {
    if(asked >= questions.length) { finish(); return; }
    astronautFeedback.style.display = "none";
    curQ = questions[asked];
    asked++;
    
    // Mathe-Rendering
    if(window.katex) questionDisplay.innerHTML = curQ.question.replace(/\$(.*?)\$/g, (m, f) => katex.renderToString(f));
    else questionDisplay.innerText = curQ.question;

    answerContainer.innerHTML = "";
    curQ.answers.forEach((ans, i) => {
        let div = document.createElement("div");
        div.className = "answerBox";
        if(window.katex) div.innerHTML = ans.replace(/\$(.*?)\$/g, (m, f) => katex.renderToString(f));
        else div.innerText = ans;
        div.onclick = () => { if(gameState === "playing") launch(i); };
        answerContainer.appendChild(div);
    });

    resetRocket();
    gameState = "playing";
}

function launch(idx) {
    gameState = "flying";
    let boxes = document.querySelectorAll(".answerBox");
    boxes[idx].classList.add("selected");
    let rect = boxes[idx].getBoundingClientRect();
    
    rocket.targetX = rect.left + rect.width / 2 - ROCKET_SIZE / 2;
    rocket.targetY = rect.top + rect.height / 2;
    
    // Winkel zum Ziel berechnen
    let dx = rocket.targetX - rocket.x, dy = rocket.targetY - rocket.y;
    rocket.angle = Math.atan2(dy, dx) + Math.PI / 2 + EMOJI_FIX;
}

function showResult(isCorrect) {
    gameState = "feedback";
    if(isCorrect) { score += 10; Sound.play(500, "sine", 0.3); } else Sound.play(150, "sawtooth", 0.4);
    document.getElementById("scoreDisplay").innerText = "Punkte: " + score;
    
    astronautFeedback.style.display = "flex";
    let txt = (isCorrect ? "✅ Richtig! " : "❌ Falsch... ") + curQ.explanation;
    if(window.katex) astronautSpeech.innerHTML = txt.replace(/\$(.*?)\$/g, (m, f) => katex.renderToString(f));
    else astronautSpeech.innerText = txt;
}

function finish() {
    gameState = "end";
    questionDisplay.innerHTML = `<h2>Mission Ende!</h2><p>Erfolg: ${Math.round((score/(questions.length*10))*100)}%</p><button class="main-btn" onclick="location.reload()">Neustart</button>`;
    answerContainer.innerHTML = "";
}

function loop() {
    ctx.clearRect(0, 0, viewW, viewH);
    // Sterne
    ctx.fillStyle = "white";
    for(let i=0; i<30; i++) ctx.fillRect((i*137)%viewW, (i*243)%viewH, 1, 1);

    if(gameState === "flying") {
        let dx = rocket.targetX - rocket.x, dy = rocket.targetY - rocket.y, dist = Math.hypot(dx, dy);
        if(dist > 10) {
            rocket.x += (dx/dist) * rocket.speed;
            rocket.y += (dy/dist) * rocket.speed;
        } else {
            showResult(curQ.answers.indexOf(curQ.answers[curQ.correctAnswer]) === Array.from(document.querySelectorAll(".answerBox")).findIndex(b => b.classList.contains("selected")));
            // Korrekte Index-Prüfung
            let win = Array.from(document.querySelectorAll(".answerBox")).findIndex(b => b.classList.contains("selected")) === curQ.correctAnswer;
            showResult(win);
        }
    }

    if(gameState !== "start" && gameState !== "end") {
        ctx.save();
        ctx.translate(rocket.x + ROCKET_SIZE/2, rocket.y + ROCKET_SIZE/2);
        ctx.rotate(rocket.angle);
        ctx.font = ROCKET_SIZE + "px serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("🚀", 0, 0);
        ctx.restore();
    }
    requestAnimationFrame(loop);
}

// GLOBAL INPUTS (Der "Überall-Klick" & Cursor-Fix)
function globalProgress() {
    if(gameState === "feedback") nextQuestion();
}

window.addEventListener("pointerdown", (e) => {
    // Falls wir auf ein UI-Icon klicken, nicht weitergehen
    if(e.target.closest(".ui-icon") || e.target.closest(".main-btn") || e.target.closest(".answerBox")) return;
    globalProgress();
});

window.addEventListener("keydown", (e) => {
    if(gameState === "feedback") { nextQuestion(); return; }
    if(gameState === "playing") {
        if(e.key === "ArrowLeft") launch(0);
        if(e.key === "ArrowUp" || e.key === " ") launch(1);
        if(e.key === "ArrowRight") launch(2);
    }
});

// START
document.getElementById("startBtn").onclick = () => {
    Sound.init(); gameState = "playing";
    document.getElementById("startScreen").style.display = "none";
    fetch("question.json").then(r => r.json()).then(data => {
        questions = data.sort(() => Math.random() - 0.5);
        nextQuestion();
    });
};

document.getElementById("muteToggle").onclick = (e) => {
    Sound.init(); Sound.isMuted = !Sound.isMuted;
    e.target.innerText = Sound.isMuted ? "🔇" : "🔊";
};

window.addEventListener("resize", resize);
resize();
loop();
