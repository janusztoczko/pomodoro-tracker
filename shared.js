import PomodoroTimer from './classes/PomodoroTimer.js';
import {Streamer} from './classes/Streamer.js';

const stopwatchEl = document.querySelector('.stopwatch');
const congratsEl = document.querySelector('.congrats');
const themeBtn = document.querySelector('.theme');
const volumeBtn = document.querySelector('.volume');
const {body} = document;
const tickAudio = new Audio('./assets/tick.mp3');
const alarmAudio = new Audio('./assets/alarm.mp3');
tickAudio.loop = true;
let updater;


function updateStopwatch(progressPct, formatted) {
    stopwatchEl.setAttribute('data-progress', formatted);
    stopwatchEl.style.setProperty('--progress', `${Math.min(100, Math.max(0, progressPct))}%`);
}

function showClock() {
    let now = new Date();
    if ((now.getSeconds() > 10 && now.getSeconds() < 20) || (now.getSeconds()> 30 && now.getSeconds()<40)) {
        stopwatchEl.setAttribute('data-mode', `${now.getHours()}:${now.getMinutes()}`);
        return;
    }
    stopwatchEl.setAttribute('data-mode', stopwatchEl.getAttribute('data-mode-2'));
}

function showCongrats(mode = 'pomodoro'){
    congratsEl.innerHTML = timer.sessionMode === 'pomodoro' ? 'Time to relax!' : 'Get ready!<sub>It\'s focus time!</sub>';
    congratsEl.classList.remove('hidden');
    setTimeout(() => {
        congratsEl.classList.add('hidden');
    }, 2000);
}

function setTheme(themeIdx) {
    body.className = '';
    body.classList.add(`theme-${themeIdx}`);
}

const timer = new PomodoroTimer({
    initialTitle: document.title,
    autoStart: false,
    autoAdvance: false
});
timer.on('tick', ({progress, formatted}) => {
    updateStopwatch(progress, formatted);
    showClock();
});

timer.on('title', (text) => {
    document.title = text;
});

timer.on('mode', (mode) => {
    stopwatchEl.setAttribute('data-mode', mode);
    stopwatchEl.setAttribute('data-mode-2', mode);
});

timer.on('themechange', ({theme}) => {
    setTheme(theme);
});

timer.on('stopped', () => {
    updateStopwatch(100, '00:00');
});

timer.on('completed', () => {
    showCongrats();
});


if (document.location.href.includes('discord')) {
    updater = new Streamer(false, '/stream');
} else {
    updater = new Streamer(false, 'https://rest.justco.work/sessions/justcowork/stream');
}
updater.events.addEventListener('snapshot', function (snapshot) {
    if (snapshot.type === 'snapshot') {
        const session = JSON.parse(snapshot.data).session;
        timer.setConfig({
            startMode: session.sessionMode,
            sessionModeTimestamp: session.sessionModeTimestamp,
            pomodoro: session.pomodoro,
            pomodoroInterval: session.pomodoroInterval,
            shortBreak: session.shortBreak,
            longBreak: session.longBreak,
            autoStart: session.autoStart,
            paused: session.paused,
            counter: session.counter,
            remaining: session.remaining,
        });
        timer.start(session.sessionMode, session.sessionModeTimestamp);
    }
});

updater.events.addEventListener('update', function (event) {
    let session = JSON.parse(event.data).session;
    timer.start(session.sessionMode);
});


themeBtn.addEventListener('click', () => {
    timer.switchTheme();
});
volumeBtn.addEventListener('click', function () {
    this.classList.toggle('mute');
    timer.toggleVolume();
});