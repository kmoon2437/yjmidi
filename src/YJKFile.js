const MidiTrack = require('./MidiTrack');
const Consts = require('./Consts');
const { BinaryXML } = require('yj-binaryxml');
const fs = require('fs');
//const { Validator:JSONSchemaValidator } = require('jsonschema');

const DURATION_TAIL_MS = 3000;
//const validator = new JSONSchemaValidator();
//const zk_schema = require('./zk_schema');

function processMetaEvent(e,data){
    if(e.type != Consts.events.types.META) return;
    switch(e.subtype){
        case Consts.events.subtypes.meta.SEQUENCE_NUMBER:
            e.msb = data.msb;
            e.lsb = data.lsb;
        break;
        case Consts.events.subtypes.meta.TEXT:
        case Consts.events.subtypes.meta.COPYRIGHT_NOTICE:
        case Consts.events.subtypes.meta.TRACK_NAME:
        case Consts.events.subtypes.meta.INSTRUMENT_NAME:
        case Consts.events.subtypes.meta.LYRICS:
        case Consts.events.subtypes.meta.MARKER:
        case Consts.events.subtypes.meta.CUE_POINT:
            e.content = data.txt;
        break;
        case Consts.events.subtypes.meta.MIDI_CHANNEL_PREFIX:
            e.prefix = data.prefix;
        break;
        case Consts.events.subtypes.meta.END_OF_TRACK: break;
        case Consts.events.subtypes.meta.SET_TEMPO:
            switch(data.type.toLowerCase()){
                case 'bpm':
                    e.tempo = 60000000 / data.tempo;
                    e.tempoBPM = data.tempo;
                break;
                case 'microsec':
                    e.tempo = data.tempo;
                    e.tempoBPM = 60000000 / data.tempo;
                break;
            }
        break;
        case Consts.events.subtypes.meta.SMTPE_OFFSET:
            e.hour = data.d[0];
            e.minutes = data.d[1];
            e.seconds = data.d[2];
            e.frames = data.d[3];
            e.subframes = data.d[4];
        break;
        case Consts.events.subtypes.meta.TIME_SIGNATURE:
        case Consts.events.subtypes.meta.SEQUENCER_SPECIFIC:
            e.data = [...data.d];
        break;
        case Consts.events.subtypes.meta.KEY_SIGNATURE:
            e.key = data.key;
            e.min = data.min;
        break;
        default: break;
    }
    return true;
}

function processMidiEvent(e,data){
    if(e.type != Consts.events.types.MIDI) return;
    e.channel = data.c;
    e.params = [...data.p];
    return true;
}

function processMidiSystemEvent(e,data){
    if(
        e.type != Consts.events.types.SYSEX
        && e.type != Consts.events.types.ESCAPE
    ) return;
    e.data = [...data.d];
    if(e.type == Consts.events.types.SYSEX) e.data.push(0xf7);
    return true;
}

function processEvent(e,d){
    let s;
    if(s = processMetaEvent(e,d)) return;
    if(s = processMidiEvent(e,d)) return;
    if(s = processMidiSystemEvent(e,d)) return;
}

module.exports = class YJKFile{
    constructor(data,strict = false){
        let yjk = this.yjk = BinaryXML.toParsedXML(data);
        //if(strict && validator.validate(zk,zk_schema)) throw new TypeError('Validation failed');
        
        // 우선 다루기 편하게 변환
        /*let { elements:[{
            attributes:header
        },globalEl,dataEl] } = zk;*/
        
        let { elements:yjkEls } = yjk;
        let yjkEl = yjkEls.filter(el => {
            return el.type == 'element' && el.name == 'yjk';
        })[0];
        if(!yjkEl) throw new Error('there is no "yjk" element');
        let header = yjkEl.elements.filter(el => {
            return el.type == 'element' && el.name == 'header';
        });
        if(!header.length) throw new Error('there is no "header" element'); 
        header = header[0].elements.filter(el => {
            return el.type == 'element' && el.name == 'midi';
        });
        if(!header.length) throw new Error('there is no "midi" element in the "header" element');
        header = header[0].attributes;
        
        let mididataEl = yjkEl.elements.filter(el => {
            return el.type == 'element' && el.name == 'mididata';
        })[0];
        if(!mididataEl) throw new Error('there is no "mididata" element');
        
        let globalEl = mididataEl.elements.filter(el => {
            return el.type == 'element' && el.name == 'global';
        })[0];
        if(!globalEl) throw new Error('there is no "global" element');
        
        let global = {
            meta:(() => {
                let d = {};
                for(let i in globalEl.attributes){
                    if(!i.startsWith('meta:')) continue;
                    d[i.slice(5).replace(/-/g,'_')] = globalEl.attributes[i];
                };
                return d;
            })(),
            events:globalEl.elements.filter(el => {
                return el.type == 'element' && el.name == 'e';
            }).map(eventEl => {
                // data 처리
                let data = {};
                eventEl.elements.filter(el => {
                    return el.type == 'element' && el.name == 'd';
                }).forEach(d => {
                    for(let i in d.attributes){
                        data[i] = d.attributes[i];
                    }
                });

                return {
                    delta:eventEl.attributes.dt,
                    type:eventEl.attributes.t,
                    subtype:eventEl.attributes.st,
                    dataObj:data
                };
            })
        };
        
        let dataEl = mididataEl.elements.filter(el => {
            return el.type == 'element' && el.name == 'data';
        })[0];
        if(!dataEl) throw new Error('there is no "data" element');
        let blocks = dataEl.elements.filter(el => {
            return el.type == 'element' && el.name == 'block';
        }).map(block => {
            return block.elements.filter(el => {
                return el.type == 'element' && el.name == 'track';
            }).map(track => {
                return {
                    meta:(() => {
                        let d = {};
                        for(let i in globalEl.attributes){
                            if(!i.startsWith('meta:')) continue;
                            d[i.slice(5).replace(/-/g,'_')] = globalEl.attributes[i];
                        };
                        return d;
                    })(),
                    events:track.elements.filter(el => {
                        return el.type == 'element' && el.name == 'e';
                    }).map(eventEl => {
                        // data 처리
                        let data = {};
                        eventEl.elements.filter(el => {
                            return el.type == 'element' && el.name == 'd';
                        }).forEach(d => {
                            for(let i in d.attributes){
                                data[i] = d.attributes[i];
                            }
                        });
    
                        return {
                            delta:eventEl.attributes.dt,
                            type:eventEl.attributes.t,
                            subtype:eventEl.attributes.st,
                            dataObj:data
                        };
                    })
                }
            });
        });
        //fs.writeFileSync('./json.json',JSON.stringify(blocks,0,3));
        //console.log(blocks.length);
        
        // 헤더 처리
        this.header = {
            format:1,
            ticksPerBeat:null,
            tickResolution:null,
            fileVolume:typeof header.fileVolume == 'number' ? header.fileVolume : 200
        };
        
        // division 처리
        switch(header.divtype.toLowerCase()){
            case 'tpb':
                // ticks per beat
                // 이 방식일때는 tick resolution을 사용하지 않는걸 강력히 권장
                this.header.ticksPerBeat = header.div0;
                this.header.tickResolution = 500000 / this.header.ticksPerBeat;
            break;
            case 'smtpe':
                // smtpe(초단위로 계산하는 방식)
                // 따라서 템포의 영향을 받지 않음
                this.header.tickResolution = 1000000 / (header.div0 * header.div1);
            break;
        }

        // 전역 meta 이벤트 처리
        this.globalEvents = new MidiTrack(global.meta);
        this.tempoEvents = new MidiTrack(global.meta);
        let globalPlaytick = 0;
        let globalPlayms = 0;
        let currentTempoUs = 500000;
        global.events.forEach(event => {
            globalPlaytick += event.delta;
            
            // smtpe 방식의 파일에서는 자동적으로 NaN이 됨
            let reso = this.header.ticksPerBeat ? (currentTempoUs / this.header.ticksPerBeat) : this.header.tickResolution;
            globalPlayms += (reso * event.delta)/1000;
            if(event.type != Consts.events.types.META){
                if(strict) throw new TypeError('midi/sysex/escape events cannot be global events');
                return;
            }
            let e = {
                ...event,
                playms:globalPlayms
            };
            processMetaEvent(e,event.dataObj);
            if(e.subtype == Consts.events.subtypes.meta.SET_TEMPO){
                currentTempoUs = e.tempo;
                this.tempoEvents.addEvent(globalPlaytick,e);
            }else{
                this.globalEvents.addEvent(globalPlaytick,e);
            }
        });
        
        // 개별 이벤트 처리
        this.ports = [];
        let playtickArr = [globalPlaytick];
        blocks.forEach(data => {
            let tracks = [];
            data.forEach((trackdata,i) => {
                let track = new MidiTrack(i,trackdata.meta);
                let playtick = 0;
                trackdata.events.forEach(event => {
                    playtick += event.delta;
                    let e = {...event};
                    processEvent(e,event.dataObj);
                    track.addEvent(playtick,e);
                });
                playtickArr.push(playtick);
                tracks.push(track);
            });
            this.ports.push(tracks);
        });

        // duration = 마지막 midi 또는 global 이벤트 + 3초
        this.header.durationTick = Math.max(...playtickArr);
        this.header.durationMs = globalPlayms;
        let ticks = this.header.durationTick - globalPlaytick;
        if(this.header.ticksPerBeat){
            let tevents = this.tempoEvents.getEvents();
            tevents = tevents[Math.max(...Object.keys(tevents))];
            let lastTempo = tevents[tevents.length-1] ? tevents[tevents.length-1].tempo : 500000;
            this.header.durationMs += Math.round(lastTempo*(ticks/this.header.ticksPerBeat)/1000)+DURATION_TAIL_MS;
            this.header.durationTick += Math.round(DURATION_TAIL_MS*1000/lastTempo*this.header.ticksPerBeat);
        }else{
            this.header.durationMs += Math.round(ticks*this.header.tickResolution)+DURATION_TAIL_MS;
            this.header.durationTick += Math.round(DURATION_TAIL_MS*1000/this.header.tickResolution);
        }
    }
}