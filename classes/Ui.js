export default class Ui {
    constructor(config = {customization: {
            ticking: localStorage.getItem('volume') || 1,
            alarm: localStorage.getItem('alarm') || 1,
            theme: localStorage.getItem('theme') || 1,
            alarmSound: localStorage.getItem('alarmSound') || 'alarm',
            tickingSound: localStorage.getItem('tickingSound') || 'tick',
        }}) {
        this._events = new Map();

        this.stopwatchEl = document.querySelector('.stopwatch');
        this.congratsEl = document.querySelector('.congrats');
        this.clockEl = document.querySelector('.clock');
        this.themeBtn = document.querySelector('.theme');
        this.volumeBtn = document.querySelector('.volume');
        this.alarmBtn = document.querySelector('.alarm');
        this.configBtn = document.querySelector('.config');
        this.configEl = document.querySelector('.config-panel');
        if(localStorage.getItem('config')){
            this.config = Object.assign(
                JSON.parse(localStorage.getItem('config')),
                config);
        }
        else{
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
                    sounds:{
                        timer: 'timer.mp3',
                        tick: 'tick.mp3',
                        alarm: 'alarm.mp3',
                        ovation: 'ovation.mp3',
                        chime: 'chime.mp3',
                    },
                    customization: {
                        ticking: localStorage.getItem('volume') || 1,
                        alarm: localStorage.getItem('alarm') || 1,
                        theme: localStorage.getItem('theme') || 1,
                        alarmSound: localStorage.getItem('alarmSound') || 'alarm',
                        tickingSound: localStorage.getItem('tickingSound') || 'tick',
                    }
                },
                config
            );
        }
        if(localStorage.getItem('volume')){
            this.config.customization.ticking = localStorage.getItem('volume');
        }
        if(localStorage.getItem('alarm')){
            this.config.customization.alarm = localStorage.getItem('alarm');
        }
        if(localStorage.getItem('theme')){
            this.config.customization.theme = localStorage.getItem('theme');
        }
        
        this.tickAudio = new Audio(`./assets/sounds/${this.config.sounds[this.config.customization.tickingSound]}`);
        this.alarmAudio = new Audio(`./assets/sounds/${this.config.sounds[this.config.customization.alarmSound]}`);
        this.execute();
    }

    execute() {
        let self = this;
        console.log(this.config);
        this.switchTheme();
        this.setTitle(this.config.initialLabel);
        this.modeLabel(this.config.initialLabel);
        
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
                self.config.customization.ticking = this.classList.contains('mute') ? '0' : '1';
                self.tickAudio.muted = this.classList.contains('mute');
            });

        this.alarmBtn.addEventListener(
            'click',
            function () {
                this.classList.toggle('mute');
                localStorage.setItem('alarm', this.classList.contains('mute') ? '0' : '1');
                self.config.customization.alarm = this.classList.contains('mute') ? '0' : '1';
                self.alarmAudio.muted = this.classList.contains('mute');
            }
        )
        
        this.configBtn.addEventListener('click', (element) => {
            this.configEl.classList.toggle('is-active'); 
            this.configEl.querySelector('textarea').value = JSON.stringify(this.config, null, 2);
            
            this.configEl.querySelector('.save').addEventListener('click', () => {
                try{
                    this.config = JSON.parse(this.configEl.querySelector('textarea').value);
                    localStorage.setItem('config', JSON.stringify(this.config));
                    this.configEl.classList.remove('is-active');
                    document.location.reload();
                }
                catch(error){
                    alert(error);
                }
                
            });
            
            this.configEl.querySelector('.reset').addEventListener('click', () => {
                localStorage.removeItem('config');
                document.location.reload();
            });
            
            document.querySelector('.close-modal').addEventListener('click', () => {
                this.configEl.classList.remove('is-active');
            });
            document.querySelector('.modal-background').addEventListener('click', () => {
               this.configEl.classList.remove('is-active');
            });
            document.querySelector('.cancel').addEventListener('click', () => {
                this.configEl.classList.remove('is-active');
            })
            //on escape
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    this.configEl.classList.remove('is-active');
                }
            });
        });
        
        this.clockEl.addEventListener('click', () => {
            this._emit('switch-timezone', ()=>{});
        });
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

    on(event, handler) {
        if (!this._events.has(event)) this._events.set(event, new Set());
        this._events.get(event).add(handler);
        return () => this.off(event, handler);
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
    
    updateClock(time, timezone, seconds,) {
        this.clockEl.setAttribute('data-time', time);
        this.clockEl.setAttribute('data-timezone', timezone);
        this.clockEl.setAttribute('style', `--progress: ${seconds}%;`);
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