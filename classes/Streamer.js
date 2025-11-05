export default class Streamer {
    constructor(streamer) {
        this._events = new Map();
        this.streamer = streamer;
        this.events = new EventSource(document.location.href.includes('discord') ? '/stream' : 'https://rest.justco.work/sessions/justcowork/stream');
        // this.events = new EventSource(document.location.href.includes('discord') ? '/stream' : 'http://localhost:3000/sessions/justcowork/stream');
        this.execute();
    }

    execute() {
        let self = this;
        this.events.addEventListener('snapshot', function (snapshot) {
            if (snapshot.type === 'snapshot') {
                self._emit('snapshot', JSON.parse(snapshot.data).session);
            }
        });

        this.events.addEventListener('update', function (update) {
            self._emit('update', JSON.parse(update.data).session);
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
}