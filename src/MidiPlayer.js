const EventEmitter = require('events');
const Consts = require('./Consts.js');
const MidiFile = require('./MidiFile.js');

const INTERVAL_MS = 1;

module.exports = class MidiPlayer extends EventEmitter {
    constructor(portCount = 1) {
        super();
        if (portCount < 1) throw new RangeError('portCount(1st argument) must be >= 1. Received ' + portCount);
        this.portCount = portCount;
    }

    loadMidi(data, opts = {}) {
        if (this.playing) this.pause();
        if (data instanceof MidiFile) {
            this.d = data;
        } else {
            this.d = new MidiFile(data);
        }
        this.prepare(opts);
    }

    /*getPoly(port){
        return this.calcPolyOfAllTracks();
        if(port !== 0){
            
        }
    }*/

    calcPoly(portNum = 0, allPorts = false) {
        let currentPoly = 0;
        let maxPoly = 0;
        let ports = allPorts ? this.d.ports : [this.d.ports[portNum]];
        for (let playtick = 0; playtick <= this.durationTick; playtick++) {
            if (currentPoly < 0) {
                throw new RangeError('currentPoly must not be 0');
            }
            ports.forEach(port =>
                port.forEach(track => {
                    let events = track.getEvents();
                    if (events[playtick]) {
                        events[playtick].forEach(event => {
                            if (event.type == Consts.events.types.MIDI) {
                                if (event.subtype == Consts.events.subtypes.midi.NOTE_ON) {
                                    /*if(events.params[1] == 0){ // Note on인데 velocity 0이면 note off로 처리
                                    currentPoly--;
                                }else{
                                    currentPoly++;
                                    if(currentPoly > maxPoly) maxPoly = currentPoly;
                                }*/
                                    currentPoly++;
                                    if (currentPoly > maxPoly) maxPoly = currentPoly;
                                } else if (event.subtype == Consts.events.subtypes.midi.NOTE_OFF) {
                                    currentPoly--;
                                }
                            }
                        });
                    }
                })
            );
        }
        console.log(currentPoly, maxPoly);
        return maxPoly;
    }

    prepare(opts) {
        opts = Object.assign(
            {
                dontInitialize: false,
                dontSendResetSysex: false
            },
            opts || {}
        );

        this.playms = 0;
        this.lastplayms = 0;
        this.playtick = 0;
        this.tempo = 1; // 배속 설정
        if (!opts.dontInitialize) this.resetNotes(true);

        // reset sysex가 없는 midi파일의 경우 gs reset을 기본으로 적용하도록 설정
        // 테스트용으로 sysex를 보내지 않도록 할 수 있음
        if (!opts.dontSendResetSysex) {
            for (let i = 0; i < this.portCount; i++) {
                this.triggerMidiEvent(
                    {
                        type: Consts.events.types.SYSEX,
                        data: [0x41, 0x10, 0x42, 0x12, 0x40, 0x00, 0x7f, 0x00, 0x41, 0xf7]
                    },
                    i
                );
            }
        }
    }

    triggerMidiEvent(event, portnum = 0) {
        // 두번째 인자로 들어가는 배열은 Synth에 보내는 midi message(없을 경우 null로 설정)
        if (event.type == Consts.events.types.SYSEX) {
            // Sysex
            this.emit('midievent', event, portnum, [event.type, ...event.data]);
        } else if (event.type == Consts.events.types.ESCAPE) {
            // escape(안에 있는 걸 그대로 midi신호로 전송)
            this.emit('midievent', event, portnum, event.data);
        } else if (event.type == Consts.events.types.MIDI) {
            // 일반적인 Midi 이벤트
            this.emit('midievent', event, portnum, [(event.subtype << 4) + event.channel, ...event.params]);
        } else if (event.type == Consts.events.types.META) {
            // Synth에 보낼 필요가 없는 Meta 이벤트
            this.emit('midievent', event, portnum, null);
        }
    }

    resetNotes(resetEverything = false) {
        for (let j = 0; j < this.portCount; j++) {
            for (var i = 0; i < 16; i++) {
                // 모든 노트 끄기
                this.triggerMidiEvent(
                    {
                        type: Consts.events.types.MIDI,
                        subtype: Consts.events.subtypes.midi.CONTROL_CHANGE,
                        channel: i,
                        params: [Consts.events.subtypes.midi.cc.ALL_SOUND_OFF, 0]
                    },
                    j
                );

                // 피치벤드 초기화
                this.triggerMidiEvent(
                    {
                        type: Consts.events.types.MIDI,
                        subtype: Consts.events.subtypes.midi.PITCH_BEND,
                        channel: i,
                        params: [0, 64]
                    },
                    j
                );

                // sustain(피아노의 오른쪽 페달과 같은 기능) 끄기
                this.triggerMidiEvent(
                    {
                        type: Consts.events.types.MIDI,
                        subtype: Consts.events.subtypes.midi.CONTROL_CHANGE,
                        channel: i,
                        params: [Consts.events.subtypes.midi.cc.SUSTAIN_ONOFF, 0]
                    },
                    j
                );
                if (resetEverything) {
                    // 모든 controller 초기화
                    this.triggerMidiEvent(
                        {
                            type: Consts.events.types.MIDI,
                            subtype: Consts.events.subtypes.midi.CONTROL_CHANGE,
                            channel: i,
                            params: [Consts.events.subtypes.midi.cc.RESET_ALL_CONTROLLERS, 0]
                        },
                        j
                    );

                    // 모든 patch를 0번(acoustic grand piano)로 초기화
                    this.triggerMidiEvent(
                        {
                            type: Consts.events.types.MIDI,
                            subtype: Consts.events.subtypes.midi.PROGRAM_CHANGE,
                            channel: i,
                            params: [0, 0]
                        },
                        j
                    );
                }
            }
        }
    }

    calcCurrentTickFromCurrentMs(currentMs) {
        // 초당 n틱 단위인 경우
        // 일단 구현은 해놓았지만 사실상 아예 안쓸듯
        if (!this.d.header.ticksPerBeat) {
            return Math.round(currentMs / (this.d.header.tickResolution / 1000));
        }

        let events = this.d.tempoEvents.getEvents();
        for (let i of Object.keys(events).reverse()) {
            // i는 해당 이벤트가 발생해야 하는 틱
            for (let j in events[i]) {
                if (events[i][j].playms <= currentMs) {
                    // 알 수 없는 이유로 인해
                    // i가 문자열이 되면서
                    // 잘 되던 게 갑자기 ㅈㄴ
                    // 두두두두둗두두둑 하고
                    // 그냥 끝나버리는 버그 수정
                    // ㅆ발 이거때메 ㅈㄴ놀랐음
                    i = parseInt(i, 10);
                    j = parseInt(j, 10);
                    return Math.round(
                        ((currentMs - events[i][j].playms) / (events[i][j].tempo / 1000)) * this.d.header.ticksPerBeat +
                            i
                    );
                }
            }
        }
    }

    get currentTick() {
        return this.calcCurrentTickFromCurrentMs(this.playms);
    }

    set currentTick(val) {
        if (val < 0) return;
        this.resetNotes();
        // 저 위에 그 get currentTick의 역연산
        this.playtick = val;

        // 초당 n틱 단위인 경우
        // 일단 구현은 해놓았지만 사실상 아예 안쓸듯
        if (!this.d.header.ticksPerBeat) {
            this.playms = Math.round(val * (this.d.header.tickResolution / 1000));
            return;
        }

        let events = this.d.tempoEvents.getEvents();
        for (let i of Object.keys(events).reverse()) {
            // i는 해당 이벤트가 발생해야 하는 틱
            for (let j in events[i]) {
                if (i < this.currentTick) {
                    // 혹시 모르니 여기도...
                    i = parseInt(i, 10);
                    j = parseInt(j, 10);
                    this.playms = Math.round(
                        ((val - i) / this.d.header.ticksPerBeat) * (events[i][j].tempo / 1000) + events[i][j].playms
                    );
                }
            }
        }
    }

    get currentMs() {
        return this.playms;
    }
    set currentMs(val) {
        if (val < 0) return;
        this.resetNotes();
        this.playms = Math.round(val);
        this.playtick = this.currentTick;
    }

    get durationTick() {
        return this.d.header.durationTick;
    }

    get durationMs() {
        return this.d.header.durationMs;
    }

    get ended() {
        return this.currentTick >= this.durationTick && this.currentMs >= this.durationMs;
    }

    play() {
        if (this.playing) return;
        this.lastplayms = Date.now();
        this.playing = true;
        this.interval = setInterval(this.playLoop.bind(this), INTERVAL_MS);
    }

    pause() {
        if (!this.playing) return;
        this.resetNotes();
        this.playing = false;
        clearInterval(this.interval);
    }

    playLoop() {
        if (this.inLoop) return;
        this.inLoop = true;
        // 밀리초 계산
        let now = Date.now();
        let elapsedMs = (now - this.lastplayms) * this.tempo;
        this.lastplayms = now;
        this.playms += elapsedMs;

        // 실제 이벤트 수행
        let currentTick = this.currentTick;
        let t = currentTick - this.playtick;
        for (let i = 0; i < t; i++) {
            this.d.ports.forEach((port, num) => {
                port.forEach(track => {
                    let events = track.getEvents();
                    if (events[this.playtick]) {
                        events[this.playtick].forEach(event => this.triggerMidiEvent(event, num));
                    }
                });
            });
            this.playtick++;
        }

        if (this.ended) {
            this.pause();
        }
        this.inLoop = false;
    }
};
