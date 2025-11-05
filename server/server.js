import express from "express";
import cors from "cors";
import PomodoroTimer from "./PomodoroTimer.js";

const app = express();

let intervals = {};
let timer;

app.use(cors());
app.use(express.json());

const sessions = new Map();
const streams = new Map();

function broadcast(sessionId, event, data) {
    console.log(sessionId, event, data);
    const set = streams.get(sessionId);
    if (!set || set.size === 0) return;
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of set) {
        try {
            res.write(payload);
        } catch { /* noop */
        }
    }
}

app.get("/sessions/:sessionId/stop", (req, res) => {
    timer.stop();
    const s = sessions.get(req.params.sessionId);
    s.paused = false;
    s.sessionMode = timer.cfg.startMode;
    s.complete = 0;
    timer.sessionInterval = 0;
    broadcast(req.params.sessionId, "stop", {session: s});
    res.json({ok: true});
});

app.get("/sessions/:sessionId/start", (req, res) => {
    timer.start();
    const s = sessions.get(req.params.sessionId);
    s.paused = false;
    s.complete = timer.sessionInterval;
    broadcast(req.params.sessionId, "start", {session: s});
    res.json({ok: true});
});

app.get("/sessions/:sessionId/pause", (req, res) => {
    timer.pause();
    const s = sessions.get(req.params.sessionId);
    s.complete = timer.sessionInterval;
    broadcast(req.params.sessionId, "pause", {session: s});
    res.json({ok: true});
});

app.get("/sessions/:sessionId/stream", (req, res) => {
    const sessionId = req.params.sessionId;
    const s = sessions.get(sessionId);
    if (!s) return res.status(202).end();

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    if (!streams.has(sessionId)) streams.set(sessionId, new Set());
    streams.get(sessionId).add(res);

    res.write(`event: snapshot\ndata: ${JSON.stringify({session: s})}\n\n`);

    req.on("close", () => {
        const set = streams.get(sessionId);
        if (set) {
            set.delete(res);
            if (set.size === 0) streams.delete(sessionId);
        }
    });
});

// ---- Start server ----
const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log("Pomodoro API listening on", PORT);

    const sessionId = 'justcowork';

    timer = new PomodoroTimer();

    timer.start();

    const s = {
        sessionMode: "pomodoro",
        sessionModeTimestamp: timer.cfg.sessionModeTimestamp,
        pomodoro: timer.cfg.pomodoro,
        pomodoroInterval: timer.cfg.intervals,
        shortBreak: timer.cfg.shortBreak,
        longBreak: timer.cfg.longBreak,
        autoAdvance: true,
        autoStart: true,
        paused: false,
        counter: 1,
        remaining: Date.now() - timer.cfg.sessionModeTimestamp,
    };

    sessions.set(sessionId, s);

    timer.on('modechange', ()=>{
         s.sessionModeTimestamp = timer.sessionModeTimestamp;
         s.sessionMode = timer.sessionMode;
         s.paused = timer.paused;
         s.counter = timer.sessionInterval;
         s.remaining = Date.now() - timer.sessionModeTimestamp;
         broadcast(sessionId, 'update', {'session': s});
    });
});