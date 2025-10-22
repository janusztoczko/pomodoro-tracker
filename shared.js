import PomodoroTimer from './classes/PomodoroTimer.js';
import {Streamer} from './classes/Streamer.js';

const stopwatchEl = document.querySelector('.stopwatch');
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

function setTheme(themeIdx) {
    body.className = '';
    body.classList.add(`theme-${themeIdx}`);
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

timer.on('stopped', () => {
    updateStopwatch(100, '00:00');
    setStartState(false);
});

if(document.location.href.includes('discord')){
    updater = new Streamer(false,  '/stream' );
}
else{
    updater = new Streamer(false,  'https://rest.justco.work/sessions/justcowork/stream' );
}

try {
    updater.events.addEventListener('snapshot', function (snapshot) {
        if (snapshot.type === 'snapshot') {

            const shared = JSON.parse(snapshot.data).session;
            // Push mode/timestamp into timer config so external consumers can read it if needed
            timer.setConfig({
                startMode: shared.sessionMode,
                sessionModeTimestamp: shared.sessionModeTimestamp
            });
            timer.start(shared.sessionMode, shared.sessionModeTimestamp);
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

themeBtn.addEventListener('click', () => {
    timer.switchTheme();
});
volumeBtn.addEventListener('click', function () {
    this.classList.toggle('mute');
    timer.toggleVolume();
});