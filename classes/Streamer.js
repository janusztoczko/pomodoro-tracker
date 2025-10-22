export class Streamer {
    constructor(streamer, source ) {
        this.streamer = streamer;
        this.events = new EventSource(source);
    }
}