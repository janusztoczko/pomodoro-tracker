export class Streamer {
    constructor(streamer, config = {}) {
        this.streamer = streamer;
        this.cfg = Object.assign({
            sessionId: false
        }, config);
        this.sessionUrl = `https://rest.justco.work/sessions/${this.cfg.sessionId}`;
        this.events = new EventSource(`${this.sessionUrl}/stream`);
    }
}