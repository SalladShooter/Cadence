// DOM Elements
const minutesInput = document.getElementById("minutes");
const secondsInput = document.getElementById("seconds");
const customLabelInput = document.getElementById("custom-label");
const timerQueueList = document.getElementById("timer-queue");
const progressCircle = document.getElementById("progress-circle");
const timerText = document.getElementById("timer");

const addTimerBtn = document.getElementById("add-timer");
const addBlockBtn = document.getElementById("add-block");
const startBtn = document.getElementById("start-sequence");
const skipBtn = document.getElementById("skip-timer");

const blockRepeatsInput = document.getElementById("block-repeats");
const blockStepsTbody = document.querySelector("#block-steps tbody");
const addStepBtn = document.getElementById("add-step");

// Timer Queue
let timerQueue = [];
let currentTimerIndex = 0;
let startTime = 0;
let duration = 0;
let timerRunning = false;

// ---------------------
// Arrow Buttons
// ---------------------
document.querySelectorAll(".number-input").forEach(wrapper => {
  const input = wrapper.querySelector("input");
  const up = wrapper.querySelector(".up");
  const down = wrapper.querySelector(".down");

  up.addEventListener("click", () => {
    input.value = (parseInt(input.value) || 0) + (parseInt(input.step) || 1);
  });

  down.addEventListener("click", () => {
    input.value = Math.max(parseInt(input.min) || 0, (parseInt(input.value) || 0) - (parseInt(input.step) || 1));
  });
});

// ---------------------
// Add Custom Timer
// ---------------------
addTimerBtn.addEventListener("click", () => {
  const mins = minutesInput.valueAsNumber || 0;
  const secs = secondsInput.valueAsNumber || 0;
  const label = customLabelInput.value || "Custom";

  if (mins <= 0 && secs <= 0) return alert("Enter a valid time");

  timerQueue.push({ minutes: mins, seconds: secs, label });
  renderQueue();

  minutesInput.value = 0;
  secondsInput.value = 0;
  customLabelInput.value = "";
});

// ---------------------
// Block Builder: Add Step
// ---------------------
addStepBtn.addEventListener("click", () => {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input type="text" class="step-label" placeholder="Label (e.g., Tempo)"></td>
    <td><input type="number" class="step-minutes" min="0" value="0"></td>
    <td><input type="number" class="step-seconds" min="0" value="30"></td>
    <td><button class="remove-step">Remove</button></td>
  `;
  blockStepsTbody.appendChild(tr);

  tr.querySelector(".remove-step").addEventListener("click", () => {
    tr.remove();
  });
});

// ---------------------
// Add Block to Queue
// ---------------------
addBlockBtn.addEventListener("click", () => {
  const repeats = parseInt(blockRepeatsInput.value) || 1;
  const steps = Array.from(blockStepsTbody.querySelectorAll("tr")).map(tr => ({
    label: tr.querySelector(".step-label").value || "Step",
    minutes: parseInt(tr.querySelector(".step-minutes").value) || 0,
    seconds: parseInt(tr.querySelector(".step-seconds").value) || 0
  }));

  if (!steps.length) return alert("Add at least one step");

  for (let r = 1; r <= repeats; r++) {
    steps.forEach(step => {
      timerQueue.push({
        minutes: step.minutes,
        seconds: step.seconds,
        label: `${step.label} (Set ${r})`
      });
    });
  }

  renderQueue();
});

// ---------------------
// Render Queue
// ---------------------
function removeTimer(index) {
  // Prevent removing current active timer
  if (timerRunning && index === currentTimerIndex) {
    alert("Cannot remove the timer that is currently running.");
    return;
  }

  if (index < currentTimerIndex) {
    currentTimerIndex--;
  }

  timerQueue.splice(index, 1);
  renderQueue();
}

function renderQueue() {
  timerQueueList.innerHTML = "";

  timerQueue.forEach((timer, index) => {
    const li = document.createElement("li");

    const labelSpan = document.createElement("span");
    labelSpan.textContent =
      `${timer.label} - ${String(timer.minutes).padStart(2,"0")}:${String(timer.seconds).padStart(2,"0")}`;

    if (index === currentTimerIndex && timerRunning) {
      li.classList.add("active");
    }

    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.classList.add("remove-btn");

    removeBtn.addEventListener("click", () => {
      removeTimer(index);
    });

    li.appendChild(labelSpan);
    li.appendChild(removeBtn);

    timerQueueList.appendChild(li);
  });
}

// ---------------------
// Start / Skip
// ---------------------
startBtn.addEventListener("click", () => {
  if (!timerQueue.length) return alert("No timers!");
  currentTimerIndex = 0;
  startNextTimer();
});

skipBtn.addEventListener("click", () => {
  if (!timerRunning) return alert("No timer running!");
  timerRunning = false;
  currentTimerIndex++;
  startNextTimer();
});

// ---------------------
// Next Timer
// ---------------------
let availableVoices = [];

speechSynthesis.onvoiceschanged = () => {
  availableVoices = speechSynthesis.getVoices();
};

function announceTimer(text) {
  if (!("speechSynthesis" in window)) return;

  const utter = new SpeechSynthesisUtterance(text);

  const preferred =
    availableVoices.find(v =>
      v.lang === "en-US" &&
      v.localService === true &&
      v.name.toLowerCase().includes("female")
    ) ||
    availableVoices.find(v =>
      v.lang === "en-US" && v.localService === true
    ) ||
    availableVoices[0];

  if (preferred) {
    utter.voice = preferred;
  }

  utter.rate = 0.95;
  utter.pitch = 1;
  utter.volume = 1;

  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

function startNextTimer() {
  if (currentTimerIndex >= timerQueue.length) {
    timerRunning = false;
    timerText.textContent = "00:00";
    progressCircle.style.strokeDashoffset = 2 * Math.PI * 70;
    renderQueue();
    new Notification("Workout complete!");
    announceTimer("Workout complete!");
    return;
  }

  const t = timerQueue[currentTimerIndex];
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("Timer Started!", {
      body: `${t.label} - ${String(t.minutes).padStart(2,"0")}:${String(t.seconds).padStart(2,"0")}`,
      silent: false
    });
  }
  announceTimer(`${t.label}. GO!`);
  const durMs = (t.minutes * 60 + t.seconds) * 1000;
  startTimerWithDuration(durMs, () => {
    currentTimerIndex++;
    startNextTimer();
  });
}

// ---------------------
// Timer Runner
// ---------------------
function startTimerWithDuration(durationMs, onFinish) {
  startTime = Date.now();
  duration = durationMs;
  timerRunning = true;

  function update() {
    if (!timerRunning) return;

    const now = Date.now();
    const elapsed = now - startTime;
    const remaining = Math.max(0, duration - elapsed);

    updateProgressCircle(elapsed, duration, remaining);

    if (remaining <= 0) {
      timerRunning = false;
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Timer Finished!");
      }
      if (onFinish) onFinish();
      return;
    }
    requestAnimationFrame(update);
  }

  update();
}

// ---------------------
// Progress Circle
// ---------------------
function updateProgressCircle(elapsed, durationMs, remaining) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = elapsed / durationMs;

  progressCircle.style.strokeDashoffset = circumference * (1 - progress);

  const percentLeft = 1 - progress;
  progressCircle.setAttribute("stroke", getColor(percentLeft));

  const totalSeconds = Math.ceil(remaining / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  timerText.textContent = `${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}`;

  renderQueue();
}

// ---------------------
// Gradient Color
// ---------------------
function getColor(percent) {
  const r = Math.min(255, Math.floor(255 * (1 - percent)));
  const g = Math.min(255, Math.floor(255 * percent / 2));
  const b = Math.min(255, Math.floor(255 * percent));
  return `rgb(${r},${g},${b})`;
}

// ---------------------
// Notifications
// ---------------------
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}
