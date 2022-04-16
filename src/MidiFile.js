const fs = require('fs');
const MidiFileData = require('midifile');
const MidiTrack = require('./MidiTrack');
const Consts = require('./Consts');

const DURATION_TAIL_MS = 3000;

module.exports = class MidiFile{
    // unsafe를 true로 설정하면 파일의 duration은 (마지막 midi이벤트 타이밍)+3초 가 됨
    // unsafe를 false로 설정하면 파일의 duration은 (meta이벤트를 포함한 마지막 이벤트 시간)이 됨
    constructor(data,unsafe = true){
        this.d = new MidiFileData(data);
        
        this.header = {
            format:this.d.header.getFormat(),
            ticksPerBeat:null,
            framesPerSecond:null,
            ticksPerFrame:null,
            tickResolution:this.d.header.getTickResolution(),
            tracksCount:this.d.header.getTracksCount(),
        };
        
        if(this.d.header.getTimeDivision() == MidiFileData.Header.TICKS_PER_BEAT){
            this.header.ticksPerBeat = this.d.header.getTicksPerBeat();
        }else{
            this.header.framesPerSecond = this.d.header.getSMTPEFrames();
            this.header.ticksPerFrame = this.d.header.getTicksPerFrame();
        }
        
        this.ports = [];
        let tracks = this.ports[0] = [];
        let endtimes = [];
        let endtimesMs = [];
        let events = this.d.getEvents();
        this.tempoEvents = new MidiTrack();
        for(let i = 0;i < this.header.tracksCount;i++){
            let playtick = 0;
            let playms = 0;
            let lastMidiEvent = 0;
            let lastMidiEventMs = 0;
            let track = new MidiTrack(i);
            events.forEach((event) => {
                playtick += event.delta;
                
                event.playms = event.playTime;
                // 일부 미디파일에서 트랙 번호가 undefined로 되어있는 문제 수정
                // 트랙번호가 없으면 0번트랙으로 처리
                if(typeof event.track == 'undefined') event.track = 0;
                if(event.track != i) return;
                if(event.type == Consts.events.types.META){
                    // 어차피 event.data에 다 있음
                    delete event.param1;
                    delete event.param2;
                    delete event.param3;
                    delete event.param4;

                    if(event.subtype == Consts.events.subtypes.meta.PORT_PREFIX){
                        event.port = event.data[0];
                    }
                }else if(event.type == Consts.events.types.MIDI){
                    let p = [];
                    p.push(event.param1 || 0);
                    p.push(event.param2 || 0);
                    event.params = p;
                    delete event.param1;
                    delete event.param2;
                }
                track.addEvent(playtick,event);
                if(event.type != Consts.events.types.META){
                    lastMidiEvent = playtick;
                    lastMidiEventMs = event.playms;
                }
                if(event.type == Consts.events.types.META && event.subtype == Consts.events.subtypes.meta.SET_TEMPO){
                    this.tempoEvents.addEvent(playtick,event);
                    
                    // 모든 midi 이벤트가 끝나고도 tempo 이벤트가 남아있는 경우
                    // durationMs와 durationTick에 차이가 생기는 것을 방지
                    lastMidiEvent = playtick;
                    lastMidiEventMs = event.playms;
                }
            });
            tracks.push(track);
            endtimes.push(unsafe ? lastMidiEvent : playtick);
            endtimesMs.push(unsafe ? lastMidiEventMs : playms);
        }

        this.header.durationTick = Math.max(...endtimes);
        this.header.durationMs = Math.round(Math.max(...endtimesMs));
        
        // durationTick에도 정확히 3초를 추가
        if(unsafe){
            this.header.durationMs += 3000;
            if(this.header.ticksPerBeat){
                let tevents = this.tempoEvents.getEvents();
                tevents = tevents[Math.max(...Object.keys(tevents))];
                let lastTempo = tevents[tevents.length-1] ? tevents[tevents.length-1].tempo : 500000;
                this.header.durationTick += Math.round(DURATION_TAIL_MS*1000/lastTempo*this.header.ticksPerBeat);
            }else{
                this.header.durationTick += Math.round(DURATION_TAIL_MS*1000/this.header.tickResolution);
            }
        }
    }
}