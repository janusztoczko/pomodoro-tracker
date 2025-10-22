export class Streamer {
    constructor(streamer, config = {}) {
        this.streamer = streamer;
        this.cfg = Object.assign({
            sessionId: false,
            sessionUrl: false
        }, config);
        this.sessionUrl = `${this.cfg.sessionUrl}${this.cfg.sessionId}`;
        this.events = new EventSource(`${this.sessionUrl}/stream`);
    }
}