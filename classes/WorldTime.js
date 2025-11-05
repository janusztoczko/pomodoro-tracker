export default class WorldTime {
    constructor(config = {}) {
        this._events = new Map();
        this.config = Object.assign(
            {
                defaultTimezones: [
                    "Asia/Tokyo",
                    "Asia/Bangkok",
                    "Europe/Vilnius",
                    "Europe/Warsaw",
                    "Europe/London",
                    "America/Argentina/Buenos_Aires",
                    "America/New_York",
                    "America/Chicago",
                    "America/Los_Angeles",
                ],
                customTimezones: [],
                selectedTimezone: 'America/New_York',
            },
            config
        );

        this.execute();
    }

    execute() {
        let self = this;
        this.loadTimezones();
        this.loadSelectedTimezone();
    }
    
    getTime(){
        return this.showLocalTime(this.config.selectedTimezone, true);
    }
    
    loadTimezones(){
        const timezones = localStorage.getItem('timezones');
        if(timezones){
            this.config.customTimezones = JSON.parse(timezones);
            return;
        }
        this.config.customTimezones = this.config.defaultTimezones;
        this._emit('timezones', {timezones: this.config.customTimezones});
    }
    
    switchSelectedTimezone(timezone = false){
        if(!timezone){
           let currentTimezone = this.config.selectedTimezone;
           let index = this.config.customTimezones.indexOf(currentTimezone) + 1
           if(index>=this.config.customTimezones.length){
               index = 0;
           }
           timezone = this.config.customTimezones[index];
        }
        this.config.selectedTimezone = timezone;
        localStorage.setItem('selectedTimezone', timezone);
        this._emit('selectedTimezone', {timezone: timezone});
    }
    
    loadSelectedTimezone(){
        const selectedTimezone = localStorage.getItem('selectedTimezone');
        if(selectedTimezone){
            this.config.selectedTimezone = selectedTimezone;
            this._emit('selectedTimezone', {timezone: selectedTimezone});
        }
    }

    saveTimezones(selectedTimezones){
        localStorage.setItem('timezones', JSON.stringify(selectedTimezones));
        this.config.customTimezones = selectedTimezones;
    }
    
    saveSelectedTimezone(selectedTimezone){
        localStorage.setItem('selectedTimezone', selectedTimezone);
        this.config.selectedTimezone = selectedTimezone;
    }

    showLocalTime(timezone = 'America/New_York', hour12 = true) {
        const date = new Date;
        const options = {
            timeZone: timezone,
            hour: 'numeric',
            minute: 'numeric',
            hour12: hour12,
        };
        return date.toLocaleString('en-US', options);
    }
    
    getTimezoneName(timezone = false) {
        if(!timezone) timezone = this.config.selectedTimezone;
        return timezone.split('/')[1].replace('_',' ');
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