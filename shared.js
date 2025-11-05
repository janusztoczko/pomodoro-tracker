import PomodoroTimer from './classes/PomodoroTimer.js';
import Ui from './classes/Ui.js';
import Streamer from './classes/Streamer.js';
import WorldTime from "./classes/WorldTime.js";

let updater;

const timer = new PomodoroTimer({
    autoAdvance: false,
});

const ui = new Ui({
    initialTitle: document.title,
});

const worldTime = new WorldTime();

timer.on('start', (handler) => {
    if(timer.session.sessionModeTimestamp){
        ui.setTitle(timer.session.sessionMode);
        ui.modeLabel(timer.session.sessionMode);
        if(handler.mode === 'pomodoro'){
            ui.startTickingSound();
        }
        return;
    }
    
    timer.stop();
});

timer.on('tick', ({progress, formatted}) => {
    ui.updateStopwatch(progress, formatted);
    ui.updateClock(worldTime.getTime(), worldTime.getTimezoneName());
});

timer.on('mode', (mode) => {
    ui.modeLabel(mode);
    ui.setTitle(mode);
});

timer.on('stopped', () => {
    ui.updateStopwatch(100, '00:00');
    ui.modeLabel();
});

timer.on('completed', () => {
    ui.showCongrats(timer.session.sessionMode);
});

updater = new Streamer();

updater.on('snapshot', (session) => {
    timer.setConfig({
        startMode: session.sessionMode,
        pomodoro: session.pomodoro,
        shortBreak: session.shortBreak,
        longBreak: session.longBreak,
        intervals: session.intervals,
        autoAdvance: false,
    });
    timer.setSession({
        sessionMode: session.sessionMode,
        sessionInterval: session.sessionInterval,
        pausedAt: session.pausedAt,
        remaining: session.remaining,
        totalTime: session.totalTime,
        sessionModeTimestamp: session.sessionModeTimestamp,

    });
    if(session.sessionModeTimestamp){
        timer.start(timer.session.sessionMode, timer.session.sessionModeTimestamp);
        ui.setTitle(timer.session.sessionMode);
        ui.modeLabel(timer.session.sessionMode);
        return;
    }
    
    ui.setTitle();
    ui.modeLabel();

});

updater.on('update', (update) => {
    timer.setConfig({
        startMode: update.sessionMode,
        pomodoro: update.pomodoro,
        shortBreak: update.shortBreak,
        longBreak: update.longBreak,
        intervals: update.intervals,
        autoAdvance: false,
    });
    timer.setSession({
        sessionMode: update.sessionMode,
        sessionInterval: update.sessionInterval,
        pausedAt: update.pausedAt,
        remaining: update.remaining,
        totalTime: update.totalTime,
        sessionModeTimestamp: update.sessionModeTimestamp,
    });
    
    if(update.pausedAt){
        ui.showCongrats('pause');
        timer.pause();
        return;
    }
    
    if(update.sessionModeTimestamp){
        timer.start(update.sessionMode, update.sessionModeTimestamp);
        ui.setTitle(update.sessionMode);
        ui.modeLabel(update.sessionMode);
        return;
    }
    
    ui.showCongrats('stop');
    timer.stop();
    ui.setTitle();
    ui.modeLabel();
});

ui.on('switch-timezone', () => {
    worldTime.switchSelectedTimezone();
});
