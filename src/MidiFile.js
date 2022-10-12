const MidiFileData = require('midifile');
const MidiTrack = require('./MidiTrack');
const Consts = require('./Consts');
const { ByteStream } = require('byte-data-stream');

const DURATION_TAIL_MS = 3000;

module.exports = class MidiFile{
    // unsafe를 true로 설정하면 파일의 duration은 (마지막 midi이벤트 타이밍)+3초 가 됨
    // unsafe를 false로 설정하면 파일의 duration은 (meta이벤트를 포함한 마지막 이벤트 시간)이 됨
    constructor(data,unsafe = true){
        let chunks = [];
        let d = new ByteStream(data);
    
        while(d.i < d.buffer.byteLength){
            let id = d.readBytes(4).reduce((a,b) => a+String.fromCharCode(b),'');
            if(d.i <= 4 && id != 'MThd') throw new Error('Invalid header signature(MThd)');
            let length = d.readUint32();
            let data = d.readBytes(length);
            let chunk = { id,data };
            chunks.push(chunk);
        }
        
        let headerChunk = [];
        this.unknownChunks = [];
        
        let trackChunks = chunks.filter(chunk => {
            if(chunk.id == 'MThd'){
                headerChunk.push(chunk);
                return false;
            }else if(chunk.id == 'MTrk'){
                return true;
            }else{
                unknownChunks.push(chunk);
                return false;
            }
        });
        
        if(headerChunk.length > 1){
            throw new Error('Too many header chunks');
        }else if(headerChunk.length < 1){
            throw new Error('No header chunk');
        }
        
        let headerChunkData = new ByteStream(headerChunk[0].data);
        if(headerChunkData.buffer.byteLength != 6){
            throw new Error('Invalid header length');
        }
        this.header = {
            format:headerChunkData.readUint16(),
            tracksCount:headerChunkData.readUint16(),
            ticksPerBeat:null,
            framesPerSecond:null,
            ticksPerFrame:null,
            tickResolution:null
        };
        let division = headerChunkData.readBytes(2);
        if(division[0] & 128){
            this.header.framesPerSecond = division[0] & 127;
            this.header.ticksPerFrame = division[1];
            // 마이크로초 단위
            this.header.tickResolution = 1000000 / (this.header.framesPerSecond*this.header.ticksPerFrame);
        }else{
            this.header.ticksPerBeat = (division[0] << 8) + division[1];
        }
        
        let tracks = [];
        trackChunks.forEach(chunk => {
            let dd = new ByteStream(chunk.data);
            let events = [];
            let lastMidiEventType;
            let lastMidiEventChannel;
            while(dd.i < dd.buffer.byteLength){
                let delta = dd.readVarUint();
                let type = dd.readUint8();
                let length;
                let subtype;
                let channel;
                let data,params;
                if((type & 0xf0) == 0xf0){
                    if(type == Consts.events.types.META){
                        subtype = dd.readUint8();
                        length = dd.readVarUint();
                        data = dd.readBytes(length);
                    }else if(
                        type == Consts.events.types.SYSEX
                        || type == Consts.events.types.ESCAPE
                    ){
                        length = dd.readVarUint();
                        data = dd.readBytes(length);
                    }
                }else{ // midi 이벤트
                    params = [];
                    if((type & 128) == 0){
                        // 마지막 midi 이벤트와 같은 type과 channel을 따름
                        subtype = lastMidiEventType;
                        channel = lastMidiEventChannel;
                        params.push(type);
                    }else{
                        subtype = lastMidiEventType = type >> 4;
                        channel = lastMidiEventChannel = type & 15;
                        params.push(dd.readUint8());
                    }
                    type = Consts.events.types.MIDI;
                    if(
                        subtype == Consts.events.subtypes.midi.PROGRAM_CHANGE
                        || subtype == Consts.events.subtypes.midi.CHANNEL_AFTERTOUCH
                    ){
                        // 파라미터가 1개인 이벤트
                    }else{
                        params.push(dd.readUint8());
                    }
                    
                    // velocity 0인 note on은 note off로 처리
                    if(subtype == Consts.events.subtypes.midi.NOTE_ON && params[1] == 0){
                        subtype = Consts.events.subtypes.midi.NOTE_OFF;
                        params[1] = 127;
                    }
                }
                
                let event = { delta,type };
                if(typeof subtype != 'undefined') event.subtype = subtype;
                if(typeof length != 'undefined') event.length = length;
                if(typeof channel != 'undefined') event.channel = channel;
                if(typeof data != 'undefined') event.data = [...data];
                if(typeof params != 'undefined') event.params = params;
                events.push(event);
            }
            tracks.push(events);
        });

        this.ports = [];
        let endtimes = [];
        let endtimesMs = [];
        this.tempoEvents = new MidiTrack();
        for(let i in tracks){
            let playtick = 0;
            let playms = 0;
            let lastMidiEvent = 0;
            let lastMidiEventMs = 0;
            let port = 0; // 포트번호 기본값은 0
            let track = new MidiTrack(i);
            let textDecoder = new TextDecoder();
            tracks[i].forEach((event) => {
                playtick += event.delta;

                // meta 이벤트 처리
                if(event.type == Consts.events.types.META){
                    if(event.subtype == Consts.events.subtypes.meta.SEQUENCE_NUMBER){
                        // 아무것도 안함
                    }else if(
                        event.subtype == Consts.events.subtypes.meta.TEXT
                        || event.subtype == Consts.events.subtypes.meta.COPYRIGHT_NOTICE
                        || event.subtype == Consts.events.subtypes.meta.TRACK_NAME
                        || event.subtype == Consts.events.subtypes.meta.INSTRUMENT_NAME
                        || event.subtype == Consts.events.subtypes.meta.LYRICS
                        || event.subtype == Consts.events.subtypes.meta.MARKER
                        || event.subtype == Consts.events.subtypes.meta.CUE_POINT
                    ){
                        // 텍스트 생성
                        event.content = textDecoder.decode(new Uint8Array(event.data));
                    }else if(event.subtype == Consts.events.subtypes.meta.CHANNEL_PREFIX){
                        event.prefix = event.data[0];
                    }else if(event.subtype == Consts.events.subtypes.meta.PORT_PREFIX){
                        port = event.port = event.data[0];
                    }else if(event.subtype == Consts.events.subtypes.meta.END_OF_TRACK){
                        // 아무것도 안함
                    }else if(event.subtype == Consts.events.subtypes.meta.SET_TEMPO){
                        event.tempo = 0; // 마이크로초 단위(1박자의 길이)
                        event.tempo += event.data[0] << 16;
                        event.tempo += event.data[1] << 8;
                        event.tempo += event.data[2];
                        event.tempoBPM = 60000000 / event.tempo;
                    }else if(event.subtype == Consts.events.subtypes.meta.SMPTE_OFFSET){
                        event.hour = event.data[0];
                        event.minutes = event.data[1];
                        event.seconds = event.data[2];
                        event.frames = event.data[3];
                        event.subframes = event.data[4];
                    }else if(event.subtype == Consts.events.subtypes.meta.TIME_SIGNATURE){
                        // 박자표. 이해를 못하겠음
                    }else if(event.subtype == Consts.events.subtypes.meta.KEY_SIGNATURE){
                        // 조표의 갯수(양수 = ♯,음수 = ♭)
                        event.key = event.data[0] > 127 ? event.data[0] - 256 : event.data[0];
                        event.scale = event.data[1]; // 0 = major,1 = minor
                    }else if(event.subtype == Consts.events.subtypes.meta.SEQUENCER_SPECIFIC){
                        // 아무것도 안함
                    }
                }
                track.addEvent(playtick,event);
                if(event.type != Consts.events.types.META){
                    lastMidiEvent = playtick;
                }
                if(event.type == Consts.events.types.META && event.subtype == Consts.events.subtypes.meta.SET_TEMPO){
                    this.tempoEvents.addEvent(playtick,event);
                    
                    // 모든 midi 이벤트가 끝나고도 tempo 이벤트가 남아있는 경우
                    // durationMs와 durationTick에 차이가 생기는 것을 방지
                    lastMidiEvent = playtick;
                }
            });
            if(!this.ports[port]) this.ports[port] = [];
            this.ports[port].push(track);
            endtimes.push(unsafe ? lastMidiEvent : playtick);
            //endtimesMs.push(unsafe ? lastMidiEventMs : playms);
        }
        this.header.durationTick = Math.max(...endtimes);
        
        // durationMs 계산
        if(this.header.ticksPerBeat){
            this.header.durationMs = 0;
            let tevents = this.tempoEvents.getEvents();
            let currentTempo = 500000; // 마이크로초 단위
            let currentTick = 0;
            for(let i of Object.keys(tevents)){
                this.header.durationMs += currentTempo*((i - currentTick)/this.header.ticksPerBeat);
                // 같은 시간에 템포 이벤트가 여러 개 뜨면 마지막에 있는것만 반영됨
                currentTempo = tevents[i][tevents[i].length-1].tempo;
                for(let j in tevents[i]){
                    tevents[i][j].playms = this.header.durationMs/1000;
                }
                currentTick = i;
            }
            this.header.durationMs += currentTempo*((this.header.durationTick - currentTick)/this.header.ticksPerBeat);
            this.header.durationMs /= 1000; // 마이크로초 단위이므로 밀리초로 바꾼다
        }else{
            this.header.durationMs = (this.header.durationTick*this.header.tickResolution) / 1000;
        }
        this.header.durationMs = Math.round(this.header.durationMs);
        
        // durationTick에도 정확히 3초를 추가
        if(unsafe){
            this.header.durationMs += DURATION_TAIL_MS;
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