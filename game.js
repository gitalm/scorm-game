// Canvas und DOM-Elemente
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("scoreDisplay");
const questionDisplay = document.getElementById("questionDisplay");
const astronautFeedback = document.getElementById("astronautFeedback");
const astronautSpeech = document.getElementById("astronautSpeech");

// Touch-Buttons
const leftButton = document.getElementById("leftButton");
const middleButton = document.getElementById("middleButton");
const rightButton = document.getElementById("rightButton");

// Viewport-Maße (CSS-Pixel)
let viewW = window.innerWidth;
let viewH = window.innerHeight;

// Spielvariablen
let score = 0;
const ROCKET_SIZE = 50;
let rocket = {
x: viewW / 2 - ROCKET_SIZE / 2,
y: viewH - 100,
width: ROCKET_SIZE,
height: ROCKET_SIZE,
speed: 8,
rotation: 0,
targetX: null,
targetY: null,
isFlying: false
};

let answers = [];
let currentQuestion = null;
let feedback = null;
let questions = [];
let selectedAnswerIndex = 1; // 0=links, 1=mitte, 2=rechts

// Hintergrundobjekte (kein Flackern)
let stars = [];
let ufos = [];

// Fragen laden (robust, mit Log bei Fehler)
async function loadQuestions() {
try {
const url = new URL("question.json", window.location.href);
url.searchParams.set("v", Date.now()); // Cache-Busting
const res = await fetch(url.toString(), { cache: "no-store" });
const text = await res.text();

if (!res.ok) {
  console.error("Fehler beim Laden der Fragen:", res.status, res.statusText);
  console.error("Antwortanfang:", text.slice(0, 200));
  throw new Error("HTTP-Fehler " + res.status);
}

try {
  questions = JSON.parse(text);
} catch (e) {
  console.error("Antwort ist kein gültiges JSON. Anfang:", text.slice(0, 200));
  throw e;
}

placeAnswers();

} catch (err) {
console.error(err);
showAstronautFeedback("Fragen konnten nicht geladen werden. Prüfe question.json und den Pfad.");
}
}

// Astronaut-Feedback
function showAstronautFeedback(text) {
astronautSpeech.textContent = text;
astronautFeedback.style.display = "block";
setTimeout(() => {
astronautFeedback.style.display = "none";
}, 5000);
}

// Frage-Rendering: Text mit KaTeX-Teilen zwischen …
… rendern
function escapeHtml(s) {
return s.replace(/[&<>"']/g, c => ({ "&":"&", "<":"<", ">":">", '"':""", "'":"'" }[c]));
}
function renderQuestionWithKatex(str) {
// TeX zwischen …
… rendern, Rest als HTML-Text
const parts = str.split("$");
let html = "";
for (let i = 0; i < parts.length; i++) {
const chunk = parts[i];
if (i % 2 === 1 && window.katex) {
try {
html += katex.renderToString(chunk, { throwOnError: false });
} catch {
html += escapeHtml(chunk); // Fallback
}
} else {
html += escapeHtml(chunk);
}
}
questionDisplay.innerHTML = html;
}

// Zufällige Frage
function getRandomQuestion() {
return questions[Math.floor(Math.random() * questions.length)];
}

// Antworten platzieren und Frage anzeigen
function placeAnswers() {
answers = [];
const question = getRandomQuestion();
currentQuestion = question;

renderQuestionWithKatex(question.question);

const answerWidth = 140;
const answerHeight = 44;
const y = Math.floor(viewH / 2);
const spacing = viewW / 4;

question.answers.forEach((answer, index) => {
answers.push({
text: answer,
x: spacing * (index + 0.5) - (answerWidth / 2),
y: y,
width: answerWidth,
height: answerHeight,
isCorrect: index === question.correctAnswer
});
});

showAstronautFeedback("Tipp: Lies die Frage genau und vergleiche die Antworten.");
}

// Rakete zeichnen
function drawRocket() {
ctx.save();
ctx.translate(rocket.x + rocket.width / 2, rocket.y + rocket.height / 2);
ctx.rotate(rocket.rotation);
ctx.font = "50px Arial";
ctx.fillStyle = "white";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("🚀", 0, 0);
ctx.restore();
}

// Astronaut als Emoji (kein Bild)
function drawAstronaut() {
ctx.font = "40px Arial";
ctx.textAlign = "left";
ctx.textBaseline = "alphabetic";
ctx.fillStyle = "white";
ctx.fillText("👩‍🚀", 20, viewH - 40);
}

// Antworten zeichnen
function drawAnswers() {
answers.forEach((answer, index) => {
ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
ctx.fillRect(answer.x, answer.y, answer.width, answer.height);

ctx.lineWidth = 2;
ctx.strokeStyle = selectedAnswerIndex === index ? "yellow" : "transparent";
ctx.strokeRect(answer.x, answer.y, answer.width, answer.height);

ctx.fillStyle = "black";
ctx.font = "16px Arial";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText(answer.text, answer.x + answer.width / 2, answer.y + answer.height / 2);

});
}

// Feedback zeichnen
function drawFeedback() {
if (!feedback) return;
ctx.font = "30px Arial";
ctx.textAlign = "center";
ctx.textBaseline = "alphabetic";
if (feedback.type === "correct") {
ctx.fillStyle = "gold";
ctx.fillText("⭐", feedback.x, feedback.y);
} else {
ctx.fillStyle = "red";
ctx.fillText("💥", feedback.x, feedback.y);
}
}

// Rakete bewegen und Kollision prüfen
function moveRocket() {
if (!rocket.isFlying) return;

const dx = rocket.targetX - rocket.x;
const dy = rocket.targetY - rocket.y;
const distance = Math.hypot(dx, dy);

if (distance > 1) {
rocket.x += (dx / distance) * rocket.speed;
rocket.y += (dy / distance) * rocket.speed;
} else {
rocket.x = rocket.targetX;
rocket.y = rocket.targetY;
rocket.isFlying = false;

answers.forEach((answer) => {
  const hit =
    rocket.x < answer.x + answer.width &&
    rocket.x + rocket.width > answer.x &&
    rocket.y < answer.y + answer.height &&
    rocket.y + rocket.height > answer.y;

  if (hit) {
    if (answer.isCorrect) {
      score++;
      scoreDisplay.textContent = `Punkte: ${score}`;
      feedback = { type: "correct", x: answer.x + answer.width / 2, y: answer.y };
      showAstronautFeedback("Richtig! " + currentQuestion.explanation);
    } else {
      feedback = { type: "wrong", x: answer.x + answer.width / 2, y: answer.y };
      showAstronautFeedback("Falsch. " + currentQuestion.explanation);
    }

    setTimeout(() => {
      feedback = null;
      placeAnswers();
      rocket.x = viewW / 2 - ROCKET_SIZE / 2;
      rocket.y = viewH - 100;
      rocket.rotation = 0;
    }, 2000);
  }
});

}
}

// Richtung setzen
function setRocketDirection(direction) {
if (rocket.isFlying) return;

if (direction === "left" && selectedAnswerIndex > 0) {
selectedAnswerIndex--;
rocket.rotation = -0.5;
} else if (direction === "right" && selectedAnswerIndex < 2) {
selectedAnswerIndex++;
rocket.rotation = 0.5;
} else if (direction === "middle") {
selectedAnswerIndex = 1;
rocket.rotation = 0;
}
}

// Abfeuern
function launchRocket() {
if (rocket.isFlying || !answers[selectedAnswerIndex]) return;
rocket.isFlying = true;
rocket.targetX = answers[selectedAnswerIndex].x + answers[selectedAnswerIndex].width / 2 - rocket.width / 2;
rocket.targetY = answers[selectedAnswerIndex].y;
}

// Tastatursteuerung
document.addEventListener("keydown", (e) => {
const key = e.key.toLowerCase();
if (e.key === "ArrowLeft" || key === "a") setRocketDirection("left");
else if (e.key === "ArrowRight" || key === "d") setRocketDirection("right");
else if (e.key === "ArrowUp" || e.key === " " || key === "w" || e.key === "enter") launchRocket();
});

// Touch-Steuerung
leftButton.addEventListener("click", () => setRocketDirection("left"));
middleButton.addEventListener("click", () => setRocketDirection("middle"));
rightButton.addEventListener("click", () => setRocketDirection("right"));
document.addEventListener("dblclick", launchRocket);

// Canvas-Größe (HiDPI) und Hintergrundobjekte
function resizeCanvas() {
const dpr = window.devicePixelRatio || 1;
viewW = window.innerWidth;
viewH = window.innerHeight;

canvas.style.width = viewW + "px";
canvas.style.height = viewH + "px";
canvas.width = Math.floor(viewW * dpr);
canvas.height = Math.floor(viewH * dpr);
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

rocket.x = viewW / 2 - ROCKET_SIZE / 2;
rocket.y = viewH - 100;

stars = Array.from({ length: 200 }, () => ({
x: Math.random() * viewW,
y: Math.random() * viewH,
size: Math.random() < 0.9 ? 1 : 2
}));
ufos = Array.from({ length: 5 }, () => ({
x: Math.random() * viewW,
y: Math.random() * (viewH - 100),
icon: ["🛸", "👽", "👾"][Math.floor(Math.random() * 3)]
}));

if (answers.length > 0) placeAnswers();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Hauptschleife
function drawGame() {
ctx.fillStyle = "black";
ctx.fillRect(0, 0, viewW, viewH);

ctx.fillStyle = "white";
stars.forEach(s => ctx.fillRect(s.x, s.y, s.size, s.size));

ctx.font = "20px Arial";
ctx.textAlign = "left";
ctx.textBaseline = "alphabetic";
ufos.forEach(u => ctx.fillText(u.icon, u.x, u.y));

drawAnswers();
drawRocket();
drawAstronaut();
drawFeedback();
moveRocket();

requestAnimationFrame(drawGame);
}
