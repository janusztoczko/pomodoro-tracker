import {PomodoroTimer} from './classes/PomodoroTimer.js';

const el = document.querySelector(".stopwatch");
const start = document.querySelector(".start");
const stop = document.querySelector(".stop");
const theme = document.querySelector(".theme");

const timer = new PomodoroTimer(el, {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    intervals: 4,
    autoAdvance: false,
    autoStart: false,
    startMode: "pomodoro",
});
window.pomodoroTimer = timer;

start.addEventListener("click", function() {
    if(this.classList.contains("start")) {
        timer.sessionTimer();    
    }
    else{
        timer.pauseTimer();
    }
    this.classList.toggle("start");
    this.classList.toggle("pause");
    stop.classList.remove("is-hidden");
});

stop.addEventListener("click", function() {
    timer.stopTimer();
    start.classList.remove("pause");
    start.classList.add("start");
    stop.classList.add("is-hidden");
});
theme.addEventListener("click", function() {
    timer.switchTheme();
})
