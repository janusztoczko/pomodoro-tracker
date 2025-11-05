export default class PomodoroTimer {
    constructor(config = {}, session = {}) {
        this._events = new Map();
        this.intervalId = null;

        this.config = Object.assign(
            {
                pomodoro: 25,
                shortBreak: 5,
                longBreak: 15,
                intervals: 4,
                autoAdvance: true,
                autoStart: false,
                startMode: "pomodoro",
            },
            config
        );

        this.session = Object.assign(
            {
                sessionMode: this.config.startMode,
                sessionInterval: 0,
                pausedAt: null,
                remaining: 0,
                totalTime: 0,
                sessionModeTimestamp: null,
            },
            session
        );

        if (this.config.autoStart) {
            this.start(this.config.startMode);
        }
    }

    on(event, handler) {
        if (!this._events.has(event)) this._events.set(event, new Set());
        this._events.get(event).add(handler);
        return () => this.off(event, handler);
    }

    off(event, handler) {
        const set = this._events.get(event);
        if (set) set.delete(handler);
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

    start(mode = this.session.sessionMode, timestamp = false) {
        if (this.session.pausedAt) {
            return this.resume();
        }

        this.session.sessionMode = mode;

        this._emit('start', {mode: this.session.sessionMode});

        this.session.totalTime = this._modeToSeconds(this.session.sessionMode);
        if (timestamp) {
            this.session.remaining = parseInt(this.session.totalTime - ((Date.now() - timestamp) / 1000));
        } else {
            this.session.remaining = this.session.totalTime;
            this.session.sessionModeTimestamp = Date.now();
        }

        this._clearInterval();
        this.intervalId = setInterval(() => this._tick(), 1000);
    }

    pause() {
        if (!this.intervalId || this.session.pausedAt) return;
        this.session.pausedAt = Date.now();
        this._clearInterval();
        this._emit("paused", {mode: this.session.sessionMode, remaining: this.session.remaining});
    }

    resume() {
        if (!this.session.pausedAt) return;
        this.session.pausedAt = false;
        this.session.sessionModeTimestamp = Date.now();
        this._clearInterval();
        this.intervalId = setInterval(() => this._tick(), 1000);
        this._emit("resumed", {mode: this.session.sessionMode, remaining: this.session.remaining});
    }

    stop() {
        this._clearInterval();
        this.session.remaining = 0;
        this.session.pausedAt = false;
        this.session.sessionModeTimestamp = false;
        this.session.sessionMode = this.config.startMode;
        this.sessionInterval = 0;

        this._emitTick(1, 0, this.session.totalTime, this.session.sessionMode);
        this._emit("stopped", {});
    }

    setConfig(patch = {}) {
        Object.assign(this.config, patch);
        this._emit("config", {config: {...this.config}});
    }
    
    setSession(patch = {}) {
        Object.assign(this.session, patch);
        this._emit("session", {session: {...this.session}});
    }

    getState() {
        return {
            session: {...this.session},
            config: {...this.config}
        };
    }

    _tick() {
        if (!this.intervalId) return;

        this.session.remaining = Math.max(0, this.session.remaining - 1);

        const progress = (this.session.totalTime - this.session.remaining) / this.session.totalTime;
        this._emitTick(progress, this.session.remaining, this.session.totalTime, this.session.sessionMode);

        if (this.session.remaining <= 0) {
            this._clearInterval();

            if (this.session.sessionMode === "pomodoro") {
                this.session.sessionInterval += 1;
            }

            this._emit("completed", {sessionMode: this.session.sessionMode});

            if (this.config.autoAdvance) {
                const next = this._nextMode(this.session.sessionMode);
                this.start(next);
                this._emit("autoadvance", {from: this.session.sessionMode, to: next});
            }
        }
    }

    _emitTick(progressFraction, remaining, total, mode) {
        const minutes = Math.floor(remaining / 60);
        const seconds = remaining % 60;
        const formatted = `${minutes.toString().padStart(2, "0")}:${seconds
            .toString()
            .padStart(2, "0")}`;

        this._emit("tick", {
            progress: Math.min(100, Math.max(0, progressFraction * 100)),
            formatted,
            remaining,
            total,
            mode
        });
    }

    _nextMode(current) {
        if (current === "pomodoro") {
            if (this.session.sessionInterval >= this.config.intervals) {
                this.session.sessionInterval = 0;
                return "longBreak";
            }
            return "shortBreak";
        }
        return "pomodoro";
    }

    _modeToSeconds(mode) {
        switch (mode) {
            case "pomodoro":
                return this.config.pomodoro * 60;
            case "shortBreak":
                return this.config.shortBreak * 60;
            case "longBreak":
                return this.config.longBreak * 60;
            default:
                return this.config.pomodoro * 60;
        }
    }

    _clearInterval() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}