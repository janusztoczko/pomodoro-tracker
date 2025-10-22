import PomodoroTimer from './classes/PomodoroTimer.js';
import {Streamer} from './classes/Streamer.js';

const stopwatchEl = document.querySelector('.stopwatch');
const startBtn = document.querySelector('.start');
const stopBtn = document.querySelector('.stop');
const themeBtn = document.querySelector('.theme');
const volumeBtn = document.querySelector('.volume');

let timerMode = 'single';
const {hash} = document.location;
const {body} = document;
const cowork = document.body.getAttribute('data-mode');

const tickAudio = new Audio('./assets/tick.mp3');
const alarmAudio = new Audio('./assets/alarm.mp3');
tickAudio.loop = true;


function updateStopwatch(progressPct, formatted) {
    stopwatchEl.setAttribute('data-progress', formatted);
    stopwatchEl.style.setProperty('--progress', `${Math.min(100, Math.max(0, progressPct))}%`);
}

function hideControls() {
    body.classList.add('shared-session');
    document.querySelectorAll('.is-single').forEach(el => el.remove());
}

function showControls() {
    body.classList.remove('shared-session');
}

function setTheme(themeIdx) {
    body.className = ''; // clear all
    body.classList.add(`theme-${themeIdx}`);
}

function setStartState(isRunning) {
    if (isRunning) {
        startBtn.classList.remove('start');
        startBtn.classList.add('pause');
        stopBtn.classList.remove('is-hidden');
    } else {
        startBtn.classList.remove('pause');
        startBtn.classList.add('start');
        stopBtn.classList.add('is-hidden');
    }
}

const timer = new PomodoroTimer({
    initialTitle: document.title
});
timer.on('tick', ({progress, formatted}) => {
    updateStopwatch(progress, formatted);
});

timer.on('title', (text) => {
    document.title = text;
});

timer.on('mode', (mode) => {
    stopwatchEl.setAttribute('data-mode', mode);
});


timer.on('themechange', ({theme}) => {
    setTheme(theme);
});

timer.on('sound', ({type, action, volumeEnabled}) => {
    // honor logical volume flag
    tickAudio.muted = !volumeEnabled;
    alarmAudio.muted = !volumeEnabled;

    if (type === 'tick') {
        if (action === 'start') tickAudio.play().catch(() => {
        });
        if (action === 'stop') tickAudio.pause();
    } else if (type === 'alarm') {
        if (action === 'play') {
            // play once
            alarmAudio.currentTime = 0;
            alarmAudio.play().catch(() => {
            });
        }
    }
});

timer.on('paused', () => {
    setStartState(false);
});

timer.on('resumed', () => {
    setStartState(true);
});

timer.on('stopped', () => {
    updateStopwatch(100, '00:00');
    setStartState(false);
});

timer.on('autoadvance', () => {
    setStartState(true); // still running after auto-advance
});
console.log(cowork);
if (hash || cowork === 'cowork') {

    const updater = new Streamer(false, {sessionId: "justcowork", sessionUrl: (cowork === 'cowork' ? './rest/sessions/' : 'https://rest.justco.work/sessions/')});
    document.querySelector('.stopwatch').innerHTML = (cowork === 'cowork' ? './rest/sessions/' : 'https://rest.justco.work/sessions/');
    try {
        updater.events.addEventListener('snapshot', function (snapshot) {
            if (snapshot.type === 'snapshot') {
                // Hide local controls for shared sessions
                hideControls();
                timerMode = 'shared';

                const shared = JSON.parse(snapshot.data).session;
                // Push mode/timestamp into timer config so external consumers can read it if needed
                timer.setConfig({
                    startMode: shared.sessionMode,
                    sessionModeTimestamp: shared.sessionModeTimestamp
                });
                timer.stop();
                timer.start(shared.sessionMode, shared.sessionModeTimestamp);
            } else {
                showControls();
                timerMode = 'single';
            }
        });

        updater.events.addEventListener('update', function (event) {
            let session = JSON.parse(event.data).session;
            timer.start(session.sessionMode);

        });
    } catch (err) {
        showControls();
        console.log(err);
    }
}

themeBtn.addEventListener('click', () => {
    timer.switchTheme();
});

volumeBtn.addEventListener('click', function () {
    this.classList.toggle('mute');
    timer.toggleVolume();
});

startBtn.addEventListener('click', () => {
    const state = timer.getState();

    if (startBtn.classList.contains('start')) {
        // If paused, resume; otherwise start fresh (current mode)
        if (state.paused) {
            timer.resume();
        } else {
            timer.start(state.mode || timer.cfg.startMode);
        }
        setStartState(true);
    } else {
        // Currently running -> pause
        timer.pause();
        setStartState(false);
    }
});

stopBtn.addEventListener('click', () => {
    timer.stop();
    setStartState(false);
});

window.addEventListener('load', () => {
    if (timerMode !== 'shared') {
        timer.modeLabel(false);
    }
});