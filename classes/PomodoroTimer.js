export class PomodoroTimer {
    constructor(el, config = {}) {
        if (!el) throw new Error("PomodoroTimer requires a target element.");
        this.el = el;
        this.cfg = Object.assign({
            pomodoro: 25,
            shortBreak: 5,
            longBreak: 15,
            intervals: 4,
            autoAdvance: false,
            autoStart: false,
            startMode: "pomodoro",
            theme: 1
        }, config);
        
        this.sessionInterval = 0;
        this.interval;
        this.pageTitle = window.document.title;

        this.paused = false;
        this.pausedMode = this.cfg.startMode;
        this.sessionTime = 0;
        this.switchTheme();
    }

    sessionTimer(mode = this.cfg.startMode) {
        let progress = 0;
        let totalTime;

        if (this.paused) {
            mode = this.pausedMode;
        }

        switch (mode) {
            case "pomodoro":
                window.document.title = '🍅 Focus time!';
                totalTime = this.cfg.pomodoro * 60;
                if (!this.paused) {
                    this.sessionInterval += 1;
                }
                break;
            case "shortBreak":
                window.document.title = '⏱️ Short break';
                totalTime = this.cfg.shortBreak * 60;
                break;
            case "longBreak":
                window.document.title = '☕️ Long break'
                totalTime = this.cfg.longBreak * 60;
                break;
        }

        if (!this.paused) {
            this.sessionTime = totalTime;
        }


        this.interval = setInterval(() => {
            this.paused = false;

            this.sessionTime -= 1;

            let minutes = Math.floor(this.sessionTime / 60);
            let seconds = this.sessionTime % 60;
            let formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            progress = (totalTime - this.sessionTime) * 100 / totalTime;

            this.updateTimer(progress, formatted)

            if (progress >= 100) {
                clearInterval(this.interval);

                if (this.cfg.autoAdvance) {
                    if (mode === "pomodoro") {
                        if (this.sessionInterval >= this.cfg.intervals) {
                            this.sessionTimer('longBreak');
                            this.sessionInterval = 0;
                        } else {
                            this.sessionTimer('shortBreak');
                        }
                    } else {
                        this.sessionTimer('pomodoro');
                    }

                }
            }
        }, 1000);
    }

    pauseTimer() {
        window.document.title = '🛑 Paused';
        clearInterval(this.interval);
        this.paused = true;
    }

    stopTimer() {
        window.document.title = this.pageTitle;
        clearInterval(this.interval);
        this.updateTimer(100, '00:00')
    }

    updateTimer(progress, sessionTime) {
        this.el.setAttribute("data-progress", sessionTime);
        this.el.setAttribute("style", "--progress: " + progress + "%");
    }

    switchTheme() {
        if(this.cfg.theme > 7){
            this.cfg.theme = 1;
        }
        window.document.body.classList = [];
        window.document.body.classList.add('theme-' + this.cfg.theme);
        this.cfg.theme++;
    }
}