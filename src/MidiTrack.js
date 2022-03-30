module.exports = class MidiTrack{
    constructor(trackNo,meta){
        this.trackNo = trackNo;
        this.meta = meta;
        this.events = {};
    }
    
    addEvent(time,event){
        if(!this.events[time]) this.events[time] = [];
        this.events[time].push(event);
    }

    getEvents(){
        return this.events;
    }
}