// Headless PomodoroTimer (no DOM, no Audio)
// Usage:
// const t = new PomodoroTimer({ autoStart: true });
// t.on('tick', ({ progress, formatted, remaining, total, mode }) => { /* update UI */ });
// t.on('modechange', ({ mode, sessionInterval }) => { /* change labels */ });
// t.on('title', (text) => { /* set document.title if you want */ });
// t.on('sound', ({ type, action }) => { /* play/pause sounds in UI if desired */ });

export default class PomodoroTimer {
    constructor(config = {}) {
        // Event listeners map
        this._events = new Map();

        // Config (minutes for durations)
        this.cfg = Object.assign(
            {
                pomodoro: 25,
                shortBreak: 5,
                longBreak: 15,
                intervals: 4,
                autoAdvance: true,
                autoStart: false,
                startMode: "pomodoro", // "pomodoro" | "shortBreak" | "longBreak"
                theme: 1,
                sessionModeTimestamp: false, // when the mode/timer last began
                initialTitle: "Pomodoro Timer", // used on stop
                initialLabel: "Ready?",
            },
            config
        );

        this.sessionInterval = 0;      // how many pomodoros completed in this cycle
        this._intervalId = null;       // setInterval id
        this.title = this.cfg.initialTitle;

        this.sessionMode = this.cfg.startMode;
        this._totalTime = 0;           // seconds for current mode
        this._remaining = 0;           // seconds remaining
        this._pausedAt = false;        // timestamp when paused (number) or false
        this._volumeEnabled = true;    // logical volume toggle (for UI to honor)

        if (this.cfg.autoStart) {
            this.start(this.sessionMode);
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

    start(mode = this.cfg.startMode, timestamp = false) {
        if (this._pausedAt) {
            return this.resume();
        }

        this.sessionMode = mode;
        this._setTitle(this._modeTitle(mode));
        this.modeLabel(mode);

        if (mode === "pomodoro") this.emitSound("tick", "start");

        const total = this._modeToSeconds(mode);
        this._totalTime = total;
        if (timestamp) {
            this._remaining = parseInt(total - ((Date.now() - timestamp) / 1000));
        } else {
            this._remaining = total;
            this.cfg.sessionModeTimestamp = Date.now();
            this.sessionModeTimestamp = Date.now();
        }
        
        console.log(this._remaining);
        

        this.modeLabel(mode);

        this._clearInterval();
        this._intervalId = setInterval(() => this._tick(), 1000);
    }

    /** Pause the timer (idempotent). */
    pause() {
        if (!this._intervalId || this._pausedAt) return;
        this._pausedAt = Date.now();
        this._setTitle("🛑 Paused");
        // stop ticking sound
        this.cfg.paused = Date.now();
        if (this.sessionMode === "pomodoro") this.emitSound("tick", "stop");
        this._clearInterval();
        this._emit("paused", {mode: this.sessionMode, remaining: this._remaining});
    }

    /** Resume if paused. */
    resume() {
        if (!this._pausedAt) return;
        this._pausedAt = false;
        this._setTitle(this._modeTitle(this.sessionMode));
        this.modeLabel(this.sessionMode);
        // resume ticking sound if pomodoro
        if (this.sessionMode === "pomodoro") this.emitSound("tick", "start");
        this.cfg.sessionModeTimestamp = Date.now();
        this._clearInterval();
        this._intervalId = setInterval(() => this._tick(), 1000);
        this._emit("resumed", {mode: this.sessionMode, remaining: this._remaining});
    }

    /** Stop timer and reset state (idempotent). */
    stop() {
        this._setTitle(this.cfg.initialTitle);
        this.modeLabel(false);
        // stop any sounds
        this.emitSound("tick", "stop");
        this._clearInterval();
        this._remaining = 0;
        this._pausedAt = false;
        this.cfg.sessionModeTimestamp = false;
        this.sessionMode = this.cfg.startMode;
        this.sessionInterval = 0;

        // Emit a final tick update with 00:00 so UIs can reset
        this._emitTick(1, 0, this._totalTime, this.sessionMode);
        this._emit("stopped", {});

        // Reset sessionInterval cycle if desired; leaving as-is so UI can decide.
    }

    /** Manually switch theme (purely logical). UI can listen and apply styles. */
    switchTheme() {
        if (this.cfg.theme > 7) this.cfg.theme = 1;
        const current = this.cfg.theme;
        this.cfg.theme++;
        this._emit("themechange", {theme: current});
    }

    /** Logical volume toggle (UI can honor this when playing sounds). */
    toggleVolume() {
        this._volumeEnabled = !this._volumeEnabled;
        if(this._volumeEnabled) this.emitSound("tick", "start");
        if(!this._volumeEnabled) this.emitSound("tick", "stop");
        this._emit("volumechange", {enabled: this._volumeEnabled});
    }

    /** Update part of the config on the fly. */
    setConfig(patch = {}) {
        Object.assign(this.cfg, patch);
        this._emit("config", {cfg: {...this.cfg}});
    }

    /** Get current public state snapshot (useful for UI bootstrapping). */
    getState() {
        return {
            mode: this.sessionMode,
            sessionInterval: this.sessionInterval,
            total: this._totalTime,
            remaining: this._remaining,
            paused: Boolean(this._pausedAt),
            title: this.title,
            theme: this.cfg.theme,
            volumeEnabled: this._volumeEnabled,
            config: {...this.cfg}
        };
    }

    /* ===============================
     * Internals
     * =============================== */

    _tick() {
        // ensure we're “running”
        if (!this._intervalId) return;

        // tick
        this._remaining = Math.max(0, this._remaining - 1);

        const progress = (this._totalTime - this._remaining) / this._totalTime;
        this._emitTick(progress, this._remaining, this._totalTime, this.sessionMode);

        // completion
        if (this._remaining <= 0) {
            // stop tick sound
            if (this.sessionMode === "pomodoro") this.emitSound("tick", "stop");

            // play alarm once
            this.emitSound("alarm", "play");

            this._clearInterval();

            if (this.sessionMode === "pomodoro") {
                this.sessionInterval += 1;
            }

            // auto-advance if enabled
            if (this.cfg.autoAdvance) {
                const next = this._nextMode(this.sessionMode);
                this._emit("autoadvance", {from: this.sessionMode, to: next});
                this.start(next);
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
            if (this.sessionInterval >= this.cfg.intervals) {
                this.sessionInterval = 0; // reset cycle after long break
                return "longBreak";
            }
            return "shortBreak";
        }
        return "pomodoro";
    }

    _modeToSeconds(mode) {
        switch (mode) {
            case "pomodoro":
                return this.cfg.pomodoro * 60;
            case "shortBreak":
                return this.cfg.shortBreak * 60;
            case "longBreak":
                return this.cfg.longBreak * 60;
            default:
                return this.cfg.pomodoro * 60;
        }
    }

    _modeTitle(mode) {
        switch (mode) {
            case "pomodoro":
                return "🍅 Focus time!";
            case "shortBreak":
                return "⏱️ Short break";
            case "longBreak":
                return "☕️ Long break";
            default:
                return this.cfg.initialTitle;
        }
    }

    modeLabel(mode) {
        switch (mode) {
            case "pomodoro":
                this._emit("mode", "Pomodoro");
                return;
            case "shortBreak":
                this._emit("mode", "Short Break");
                return;
            case "longBreak":
                this._emit("mode", "Long Break");
                return;
            default:
                this._emit("mode", this.cfg.initialLabel);
                return;
        }
    }

    _setTitle(text) {
        this.title = text;
        this._emit("title", text);
    }

    emitSound(type, action) {
        this._emit("sound", {type, action, volumeEnabled: this._volumeEnabled});
    }

    _clearInterval() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
        }
    }
}