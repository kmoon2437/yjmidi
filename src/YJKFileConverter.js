const MidiFile = require('./MidiFile');
const Consts = require('./Consts');
const { BinaryXML } = require('yj-binaryxml');

function trackname2portnum(name){
    if(!name) return 0;
    let isNum = false;
    let numstr = '';
    for(let c of name){
        if(isNaN(Number(c))){
            if(isNum) return (isNaN(parseInt(numstr,10)) ? 1 : parseInt(numstr,10)) - 1;
            continue;
        }
        isNum = true;
        numstr += c;
    }
    return 0;
}

function newMetaEvent(dt,st,data = {}){
    let event = {
        dt,t:Consts.events.types.META,st
    };
    if(data instanceof Array){
        event.d = {
            d:Buffer.from(data)
        };
    }else{
        event.d = {...data};
    }
    return event;
}

function newMidiEvent(dt,st,c,p1,p2){
    return {
        dt,t:Consts.events.types.MIDI,st,
        d:{
            c,p:Buffer.from([p1,p2])
        }
    };
}

function newSysexEvent(dt,bytes){
    bytes.pop();
    return {
        dt,t:Consts.events.types.SYSEX,
        d:{ d:Buffer.from(bytes) }
    };
}

function newEscapeEvent(dt,bytes){
    return {
        dt,t:Consts.events.types.ESCAPE,
        d:{ d:Buffer.from(bytes) }
    };
}

module.exports = class YJKFileConverter{
    static midi2yjk(midiBuf,opts){
        opts = Object.assign({
            compress:'raw',
            portSeparate:'trackName',
            fileVolume:200
        },opts);
        let file = new MidiFile(midiBuf);

        let header = {
            divtype:file.header.ticksPerBeat ? 'tpb' : 'smtpe',
            div0:file.header.ticksPerBeat || file.header.framesPerSecond,
            div1:file.header.ticksPerBeat ? undefined : file.header.ticksPerFrame,
            fileVolume:opts.fileVolume
        };
        if(typeof header.div1 == 'undefined'){
            delete header.div1;
        }

        let globalEvents = [];
        let global = {
            meta:{},events:[]
        };
        let blocks = [];
        //let last_delta = 0;
        if(file.header.format != 1) throw new TypeError('Only format 1 is supported');
        file.tracks.forEach(track => {
            let eventsObj = track.getEvents();
            let events = [];
            for(let i in eventsObj){
                let arr = [...eventsObj[i]];
                arr.forEach(obj => {
                    obj.PLAYTICK = i;
                    events.push(obj);
                });
            }
            events = events.sort((a,b) => a.PLAYTICK - b.PLAYTICK);
            let trackEvents = [];
            let track2 = {
                meta:{},events:[]
            };
            events.forEach(event => {
                if(event.type == Consts.events.types.META){
                    switch(event.subtype){
                        case Consts.events.subtypes.meta.COPYRIGHT_NOTICE:
                            global.meta.copyrightNotice = Buffer.from(event.data).toString('utf8');
                        break;
                        case Consts.events.subtypes.meta.TRACK_NAME:
                            track2.meta.trackName = Buffer.from(event.data).toString('utf8');
                        break;
                        case Consts.events.subtypes.meta.INSTRUMENT_NAME:
                            track2.meta.instrumentName = Buffer.from(event.data).toString('utf8');
                        break;
                        case Consts.events.subtypes.meta.LYRICS:
                        case Consts.events.subtypes.meta.SET_TEMPO:
                        case Consts.events.subtypes.meta.SMTPE_OFFSET:
                        case Consts.events.subtypes.meta.TIME_SIGNATURE:
                        case Consts.events.subtypes.meta.KEY_SIGNATURE:
                            globalEvents.push(event);
                        break;
                        /**
                        case Consts.events.subtypes.meta.SEQUENCE_NUMBER:
                        case Consts.events.subtypes.meta.TEXT:
                        case Consts.events.subtypes.meta.MARKER:
                        case Consts.events.subtypes.meta.CUE_POINT:
                        case Consts.events.subtypes.meta.CHANNEL_PREFIX:
                        case Consts.events.subtypes.meta.END_OF_TRACK:
                        case Consts.events.subtypes.meta.SEQUENCER_SPECIFIC:
                         */
                        default:
                            trackEvents.push(event);
                        break;
                    }
                }else{
                    trackEvents.push(event);
                }
            });

            /**
             * delta time 방식으로 변환
             */
            trackEvents.forEach((event,i) => {
                let dt = parseInt(trackEvents[i-1] ? event.PLAYTICK-trackEvents[i-1].PLAYTICK : event.PLAYTICK,10);
                if(event.type == Consts.events.types.META){
                    switch(event.subtype){
                        case Consts.events.subtypes.meta.SEQUENCE_NUMBER:
                            track2.events.push(newMetaEvent(dt,event.subtype,{
                                msb:event.msb,
                                lsb:event.lsb
                            }));
                        break;
                        case Consts.events.subtypes.meta.TEXT:
                        case Consts.events.subtypes.meta.MARKER:
                        case Consts.events.subtypes.meta.CUE_POINT:
                            track2.events.push(newMetaEvent(dt,event.subtype,{
                                txt:Buffer.from(event.data).toString('utf8')
                            }));
                        break;
                        case Consts.events.subtypes.meta.CHANNEL_PREFIX:
                            track2.events.push(newMetaEvent(dt,event.subtype,{
                                prefix:event.prefix
                            }));
                        break;
                        case Consts.events.subtypes.meta.END_OF_TRACK:
                            track2.events.push(newMetaEvent(dt,event.subtype));
                        break;
                        case Consts.events.subtypes.meta.SEQUENCER_SPECIFIC:
                            track2.events.push(newMetaEvent(dt,event.subtype,event.data));
                        break;
                    }
                }else if(event.type == Consts.events.types.MIDI){
                    track2.events.push(newMidiEvent(dt,event.subtype,event.channel,...event.params));
                }else if(event.type == Consts.events.types.SYSEX){
                    track2.events.push(newSysexEvent(dt,event.data));
                }else if(event.type == Consts.events.types.ESCAPE){
                    track2.events.push(newEscapeEvent(dt,event.data));
                }
            });

            let portnum = trackname2portnum(track2.meta.trackName);
            //console.log(track2.meta.track_name,portnum);
            if(!blocks[portnum]) blocks[portnum] = [];
            blocks[portnum].push(track2);
        });

        globalEvents.forEach((event,i) => {
            let dt = parseInt(globalEvents[i-1] ? event.PLAYTICK-globalEvents[i-1].PLAYTICK : event.PLAYTICK,10);
            if(event.type == Consts.events.types.META){
                switch(event.subtype){
                    case Consts.events.subtypes.meta.LYRICS:
                        global.events.push(newMetaEvent(dt,event.subtype,{
                            txt:Buffer.from(event.data).toString('utf8')
                        }));
                    break;
                    case Consts.events.subtypes.meta.SET_TEMPO:
                        global.events.push(newMetaEvent(dt,event.subtype,{
                            type:'microsec',
                            tempo:event.tempo
                        }));
                    break;
                    case Consts.events.subtypes.meta.SMTPE_OFFSET:
                        global.events.push(newMetaEvent(dt,event.subtype,[
                            event.hour,
                            event.minutes,
                            event.seconds,
                            event.frames,
                            event.subframes
                        ]));
                    break;
                    case Consts.events.subtypes.meta.TIME_SIGNATURE:{
                        global.events.push(newMetaEvent(dt,event.subtype,event.data));
                    }break;
                    case Consts.events.subtypes.meta.KEY_SIGNATURE:
                        global.events.push(newMetaEvent(dt,event.subtype,{
                            key:event.key,
                            min:!event.scale
                        }));
                    break;
                }
            }/*else if(event.type == Consts.events.types.MIDI){
                track_data.push(new_midi_event(dt,event.subtype,event.channel,...event.params));
            }else if(event.type == Consts.events.types.SYSEX){
                track_data.push(new_sysex_event(dt,event.data));
            }else if(event.type == Consts.events.types.ESCAPE){
                track_data.push(new_escape_event(dt,event.data));
            }*/
        });

        /*let json = {
            header:{
                midi:header,
            },
            midi:{
                global,data:blocks
            }
        };*/
        
        let yjk = {
            type:'element',
            name:'yjk',
            attributes:{
                'xmlns:meta':'https://static.choyunjin.kr/xmlprefix/meta'
            },
            elements:[]
        };
        
        // 헤더
        yjk.elements.push({
            type:'element',
            name:'header',
            elements:[{
                type:'element',
                name:'midi',
                attributes:header
            }]
        });

        let globalEl = {
            type:'element',
            name:'global',
            attributes:{},
            elements:[]
        };
        for(let i in global.meta){
            globalEl.attributes['meta:'+i] = global.meta[i];
        }
        for(let event of global.events){
            globalEl.elements.push({
                type:'element',
                name:'e',
                attributes:{
                    dt:event.dt,
                    t:event.t,
                    st:event.st
                },
                elements:[{
                    type:'element',
                    name:'d',
                    attributes:event.d
                }]
            });
        }
        
        let dataEl = {
            type:'element',
            name:'data',
            elements:[]
        };
        for(let block of blocks){
            let blockEl = {
                type:'element',
                name:'block',
                elements:[]
            };
            for(let track of block){
                let trackEl = {
                    type:'element',
                    name:'track',
                    attributes:{},
                    elements:[]
                };
                for(let i in track.meta){
                    trackEl.attributes['meta:'+i] = track.meta[i];
                }
                for(let event of track.events){
                    trackEl.elements.push({
                        type:'element',
                        name:'e',
                        attributes:{
                            dt:event.dt,
                            t:event.t,
                            st:event.st
                        },
                        elements:[{
                            type:'element',
                            name:'d',
                            attributes:event.d
                        }]
                    });
                }
                blockEl.elements.push(trackEl);
            }
            dataEl.elements.push(blockEl);
        }
        
        let mididataEl = {
            type:'element',
            name:'mididata',
            elements:[globalEl,dataEl]
        };
        
        yjk.elements.push(mididataEl);
        
        let xml = {
            declaration:{ attributes:{
                version:'1.0',
                encoding:'utf-8'
            } },
            elements:[yjk]
        };
        
        return BinaryXML.fromParsedXML(xml,{ compress });
        //return Buffer.from(JSON.stringify(json,0,4),'utf8');
    }
}