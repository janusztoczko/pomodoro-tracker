export default class Ui {
    constructor(config = {}) {
        this._events = new Map();

        this.stopwatchEl = document.querySelector('.stopwatch');
        this.congratsEl = document.querySelector('.congrats');
        this.themeBtn = document.querySelector('.theme');
        this.volumeBtn = document.querySelector('.volume');
        this.alarmBtn = document.querySelector('.alarm');
        this.tickAudio = new Audio('./assets/tick.mp3');
        this.alarmAudio = new Audio('./assets/alarm.mp3');

        this.config = Object.assign(
            {
                initialTitle: "🍅 Pomodoro Timer",
                initialLabel: "Ready?",
                modeTitles: {
                    pomodoro: "🍅 Focus time!",
                    shortBreak: "⏱️ Short break",
                    longBreak: "☕️ Long break"
                },
                modeLabels: {
                    pomodoro: "Pomodoro",
                    shortBreak: "Short Break",
                    longBreak: "Long Break"
                },
                modeCongrats: {
                    pomodoro: "Time to relax!",
                    shortBreak: "Get ready!<sub>It's focus time!</sub>",
                    longBreak: "Time to get back to work!",
                    stop: "Timer stopped!",
                    pause: "Timer paused!",
                },
                customization: {
                    ticking: localStorage.getItem('volume') || 1,
                    alarm: localStorage.getItem('alarm') || 1,
                    theme: localStorage.getItem('theme') || 1,
                }
            },
            config
        );

        this.execute();
    }

    execute() {
        let self = this;
        this.switchTheme();
        this.setTitle(this.config.initialLabel);
        this.modeLabel(this.config.initialLabel);
        this.showClock();
        
        this.tickAudio.muted = this.config.customization.ticking === '0';
        this.alarmAudio.muted = this.config.customization.alarm === '0';
        
        this.volumeBtn.classList.toggle('mute', this.config.customization.ticking === '0');
        this.alarmBtn.classList.toggle('mute', this.config.customization.alarm === '0');

        this.themeBtn.addEventListener('click', () => {
            this.switchTheme();
        });

        this.volumeBtn.addEventListener('click',
            function (event) {
                this.classList.toggle('mute');
                localStorage.setItem('volume', this.classList.contains('mute') ? '0' : '1');
                self.tickAudio.muted = this.classList.contains('mute');
            });

        this.alarmBtn.addEventListener(
            'click',
            function () {
                this.classList.toggle('mute');
                localStorage.setItem('alarm', this.classList.contains('mute') ? '0' : '1');
                self.alarmAudio.muted = this.classList.contains('mute');
            }
        )
    }

    _emit(event, payload) {
        const set = this._events.get(event);
        if (!set) return;
        for (const fn of set) {
            try {
                fn(payload);
            } catch {
            }
        }
    }

    switchTheme() {
        if(!document.body.classList.contains('empty')){
            if (this.config.customization.theme >= 7) this.config.customization.theme = 0;
            this.config.customization.theme++;    
        }
        document.body.classList.remove('empty');
        document.body.className = '';
        document.body.classList.add(`theme-${this.config.customization.theme}`);
        localStorage.setItem('theme', this.config.customization.theme);
    }

    setTitle(mode) {
        document.title = this.config.modeTitles[mode] || this.config.initialTitle;
    }

    modeLabel(mode = false) {
        this.stopwatchEl.setAttribute('data-mode', this.config.modeLabels[mode] || this.config.initialLabel);
        this.stopwatchEl.setAttribute('data-mode-default', this.config.modeLabels[mode]);
    }

    updateStopwatch(progressPct, formatted) {
        this.stopwatchEl.setAttribute('data-progress', formatted);
        this.stopwatchEl.style.setProperty('--progress', `${Math.min(100, Math.max(0, progressPct))}%`);
    }

    showClock() {
        let now = new Date();
        if ((now.getSeconds() > 10 && now.getSeconds() < 20) || (now.getSeconds() > 30 && now.getSeconds() < 40)) {
            this.stopwatchEl.setAttribute('data-mode', `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
            return;
        }
        this.stopwatchEl.setAttribute('data-mode', this.stopwatchEl.getAttribute('data-mode-default'));
    }

    hideClock() {
        this.stopwatchEl.setAttribute('data-mode', this.stopwatchEl.getAttribute('data-mode-default'));
    }

    showCongrats(mode = 'pomodoro') {
        this.congratsEl.innerHTML = this.config.modeCongrats[mode];
        this.congratsEl.classList.remove('hidden');
        setTimeout(() => {
            this.congratsEl.classList.add('hidden');
        }, 2000);

        if (mode !== 'stop' || mode !== 'pause') {
            this.alarmAudio.play();
        }
        
        this.stopTickingSound();
    }
    
    startTickingSound(){
        this.tickAudio.loop = true;
        this.tickAudio.currentTime = 0;
        this.tickAudio.play();
    }
    
    stopTickingSound(){
        this.tickAudio.pause();
        this.tickAudio.currentTime = 0;
    }

}