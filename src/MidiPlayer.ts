import { EventEmitter } from 'events';
import { ControlChange } from './consts.js';
import { MidiFile } from './MidiFile.js';
import { Event } from './event/Event.js';
import { SysexEvent } from './event/SysexEvent.js';
import { EscapeEvent } from './event/EscapeEvent.js';
import {
    MidiEvent, ControlChangeMidiEvent,
    ProgramChangeMidiEvent, PitchBendMidiEvent
} from './event/midi/index.js';
import { MetaEvent, SetTempoMetaEvent } from './event/meta/index.js';

const INTERVAL_MS = 1;

export interface MidiPlayerOptions {
    /** 미디 재생을 위한 초기 설정을 할지 여부 */
    initialize?: boolean;

    /** reset sysex를 보낼지 여부 */
    sendResetSysex?: boolean;
    
    /**
     * reset sysex 메세지 종류 또는 메세지 데이터.
     * 메세지 데이터를 넣는 경우 제일 앞의 `0xf0`은 빼되 제일 뒤의 `0xf7`은 넣어야 됨
     */
    resetSysex?: 'gm' | 'gs' | 'xg' | number[] | Uint8Array;
}

// reset sysex 메세지
// 제일 앞의 0xf0은 빼되 제일 뒤의 0xf7은 넣어야 됨
const resetSysexMessage = {
    gm: Uint8Array.from([0x7e, 0x7f, 0x09, 0x01, 0xf7]),
    gs: Uint8Array.from([0x41, 0x10, 0x42, 0x12, 0x40, 0x00, 0x7f, 0x00, 0x41, 0xf7]),
    xg: Uint8Array.from([0x43, 0x10, 0x4c, 0x00, 0x00, 0x7e, 0x00, 0xf7])
};

export class MidiPlayer extends EventEmitter {
    public portCount: number;
    public playing: boolean;
    public file: MidiFile;
    public tempo: number;
    private playms: number;
    private lastplayms: number;
    private playtick: number;
    private interval: any;
    private inLoop: boolean;
    #currentTick: number;
    
    /** 틱 단위의 현재 재생 시간 */
    get currentTick(): number {
        return this.#currentTick;
    }

    set currentTick(val: number) {
        if (val < 0) return;
        this.#resetNotes();
        this.playtick = this.#currentTick = val;
        this.playms = this.calcCurrentMsFromCurrentTick(val);
    }

    /** 밀리초 단위의 현재 재생 시간 */
    get currentMs(): number {
        return this.playms;
    }

    set currentMs(val: number) {
        if (val < 0) return;
        this.#resetNotes();
        this.playms = Math.round(val);
        this.playtick = this.calcCurrentTickFromCurrentMs(val);
    }

    /** 틱 단위의 총 재생 시간 */
    get durationTick(): number {
        return this.file.durationTick;
    }

    /** 밀리초 단위의 총 재생 시간 */
    get durationMs(): number {
        return this.file.durationMs;
    }

    /** 재생이 끝났는지 여부 */
    get ended(): boolean {
        return this.currentTick >= this.durationTick && this.currentMs >= this.durationMs;
    }

    /**
     * 생성자
     * @param portCount 미디 포트 수
     */
    constructor(portCount: number = 1) {
        super();
        if (portCount < 1) throw new RangeError('portCount(1st argument) must be >= 1. Received ' + portCount);
        this.portCount = portCount;
    }

    /**
     * 미디 파일을 로드해 재생할 수 있도록 준비함
     * @param data 미디 데이터
     * @param opts 각종 옵션
     */
    loadMidi(data: ArrayBuffer | Uint8Array | MidiFile, opts: MidiPlayerOptions = {}) {
        if (this.playing) this.pause();
        if (data instanceof MidiFile) {
            this.file = data;
        } else {
            this.file = new MidiFile(data);
        }
        this.#prepare(opts);
    }

    /** 미디 재생을 위한 준비 */
    #prepare(opts: MidiPlayerOptions) {
        opts = Object.assign({
            initialize: true,
            sendResetSysex: true,
            resetSysex: 'gs'
        }, opts ?? {});

        this.playms = 0;
        this.lastplayms = 0;
        this.playtick = 0;
        this.#currentTick = 0;
        this.tempo = 1; // 배속 설정
        if (opts.initialize) this.#resetNotes(true);

        // reset sysex가 없는 midi파일의 경우 reset sysex를 기본으로 적용하도록 설정
        // 테스트용으로 sysex를 보내지 않도록 할 수 있음
        if (opts.sendResetSysex) {
            let sysexData: Uint8Array;
            if (typeof opts.resetSysex == 'string' && resetSysexMessage[opts.resetSysex]) {
                sysexData = resetSysexMessage[opts.resetSysex];
            } else if (opts.resetSysex instanceof Array || opts.resetSysex instanceof Uint8Array) {
                sysexData = Uint8Array.from(opts.resetSysex);
            }
            for (let i = 0; i < this.portCount; i++) {
                this.triggerMidiEvent(new SysexEvent(sysexData), i);
            }
        }
    }

    /**
     * 미디 이벤트를 실행시킴
     * @param event 미디 이벤트 데이터
     * @param portnum 미디 포트 번호
     */
    triggerMidiEvent(event: Event, portnum: number = 0) {
        // 두번째 인자로 들어가는 배열은 Synth에 보내는 midi message(없을 경우 null로 설정)
        if (event instanceof SysexEvent) {
            // Sysex
            this.emit('midievent', event, portnum, event.toMidiMessage());
        } else if (event instanceof EscapeEvent) {
            // escape(안에 있는 걸 그대로 midi신호로 전송)
            this.emit('midievent', event, portnum, event.toMidiMessage());
        } else if (event instanceof MidiEvent) {
            // 일반적인 Midi 이벤트
            this.emit('midievent', event, portnum, event.toMidiMessage());
        } else if (event instanceof MetaEvent) {
            // Synth에 보낼 필요가 없는 Meta 이벤트
            this.emit('midievent', event, portnum, null);
        }
    }

    #resetNotes(resetEverything: boolean = false) {
        for (let j = 0; j < this.portCount; j++) {
            for (var i = 0; i < 16; i++) {
                // 모든 노트 끄기
                this.triggerMidiEvent(new ControlChangeMidiEvent(i, ControlChange.ALL_SOUND_OFF, 0), j);

                // 피치벤드 초기화
                this.triggerMidiEvent(new PitchBendMidiEvent(i, 8192), j);

                // sustain(피아노의 오른쪽 페달과 같은 기능) 끄기
                this.triggerMidiEvent(new ControlChangeMidiEvent(i, ControlChange.SUSTAIN_ONOFF, 0), j);

                if (resetEverything) {
                    // 모든 controller 초기화
                    this.triggerMidiEvent(new ControlChangeMidiEvent(i, ControlChange.RESET_ALL_CONTROLLERS, 0), j);

                    // 모든 patch를 0번(acoustic grand piano)로 초기화
                    this.triggerMidiEvent(new ProgramChangeMidiEvent(i, 0), j);
                }
            }
        }
    }

    /**
     * 현재 밀리초로부터 현재 틱을 계산
     * @param currentMs 밀리초 단위의 현재 재생 시간
     * @returns 현재 재생 시간을 틱 단위로 환산한 값
     */
    calcCurrentTickFromCurrentMs(currentMs: number): number {
        // 초당 n틱 단위인 경우
        // 일단 구현은 해놓았지만 사실상 아예 안쓸듯
        if (!this.file.header.ticksPerBeat) {
            return Math.round(currentMs / (this.file.header.tickResolution / 1000));
        }

        let eventTimesRev = this.file.tempoEvents.getAllEventTimesReversed();
        for (let i of eventTimesRev) {
            // i는 해당 이벤트가 발생해야 하는 틱
            let currentTempoEvents = this.file.tempoEvents.getEvents(i) as SetTempoMetaEvent[];
            for (let j in currentTempoEvents) {
                if (currentTempoEvents[j].playMs <= currentMs) {
                    return Math.round(
                        ((currentMs - currentTempoEvents[j].playMs) / (currentTempoEvents[j].tempo / 1000)) * this.file.header.ticksPerBeat + i
                    );
                }
            }
        }
    }
    
    /**
     * 주어진 틱 단위 시간을 밀리초 단위로 변환
     * @param currentTick 밀리초 단위의 현재 재생 시간
     * @returns 틱 단위의 시간을 밀리초 단위로 환산한 값
     */
    calcCurrentMsFromCurrentTick(currentTick: number): number {
        // 초당 n틱 단위인 경우
        // 일단 구현은 해놓았지만 사실상 아예 안쓸듯
        if (!this.file.header.ticksPerBeat) {
            return Math.round(currentTick * (this.file.header.tickResolution / 1000));
        }

        let eventTimesRev = this.file.tempoEvents.getAllEventTimesReversed();
        for (let i of eventTimesRev) {
            // i는 해당 이벤트가 발생해야 하는 틱
            let currentTempoEvents = this.file.tempoEvents.getEvents(i);
            for (let j in currentTempoEvents) {
                let event = currentTempoEvents[j] as SetTempoMetaEvent;
                if (i < currentTick) {
                    return Math.round(
                        ((currentTick - i) / this.file.header.ticksPerBeat) * (event.tempo / 1000) + event.playMs
                    );
                }
            }
        }
    }

    /**
     * 재생 시작
     */
    play() {
        if (this.playing) return;
        this.lastplayms = Date.now();
        this.playing = true;
        this.interval = setInterval(this.#playLoop.bind(this), INTERVAL_MS);
    }

    /**
     * 일시정지
     */
    pause() {
        if (!this.playing) return;
        this.#resetNotes();
        this.playing = false;
        clearInterval(this.interval);
    }

    /** 재생 중 무한 반복하면서 실행됨 */
    #playLoop() {
        if (this.inLoop) return;
        this.inLoop = true;
        // 밀리초 계산
        let now = Date.now();
        let elapsedMs = (now - this.lastplayms) * this.tempo;
        this.lastplayms = now;
        this.playms += elapsedMs;

        // 실제 이벤트 수행
        this.#currentTick = this.calcCurrentTickFromCurrentMs(this.playms);
        for (; this.playtick < this.#currentTick; this.playtick++) {
            this.file.tracks.forEach(track => {
                if (track.hasEvents(this.playtick)) {
                    track.getEvents(this.playtick).forEach(event => this.triggerMidiEvent(event, track.portNo));
                }
            });
        }

        if (this.ended) {
            this.pause();
        }
        this.inLoop = false;
    }
}