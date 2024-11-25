import { ByteStream, ByteStreamSimulator, ByteStreamInterface } from 'byte-data-stream';
import { MidiChunk } from './MidiChunk.js';
import { Event } from '../event/Event.js';
import { MetaEvent, PortPrefixMetaEvent } from '../event/meta/index.js';
import { SysexEvent } from '../event/SysexEvent.js';
import { EscapeEvent } from '../event/EscapeEvent.js';
import { MidiEvent, MidiEventParameter } from '../event/midi/index.js';
import { EventType, MidiEventType } from '../consts.js';

export type ForEachCallback = (events: Event[], playTime: number) => void;

export class MidiTrack extends MidiChunk {
    static readonly CHUNK_ID = 'MTrk';
    readonly id: string = MidiTrack.CHUNK_ID;

    /** 트랙 번호 */
    readonly trackNo: number;

    /**
     * 미디 포트 번호
     * 가장 마지막으로 나온 port prefix 이벤트에서 나온 걸로 지정됨. 기본값은 0
     * 미디파일 재생 시 포트번호 확인용이라 파일 write 시 실제 내용이 반영되지 않음
     */
    portNo: number;

    /** 이벤트 데이터 */
    #events: Map<number, Event[]>;

    constructor(trackNo: number, data: Uint8Array = null) {
        super();
        this.trackNo = trackNo;
        this.#events = new Map();
        this.portNo = 0;
        if (data) this.#readData(data);
    }

    /**
     * 이벤트 추가
     * @param time 틱 단위의 재생 시간
     * @param event 미디 이벤트 데이터
     */
    addEvent(time: number, event: Event) {
        if (!this.#events.has(time)) this.#events.set(time, [event]);
        else this.#events.get(time).push(event);
    }

    /**
     * 이벤트 삭제
     * @param time 틱 단위의 재생 시간
     * @param i 삭제할 이벤트 데이터의 index. 없으면 그 시간의 모든 이벤트를 삭제함
     */
    deleteEvent(time: number, i: number = null) {
        if (!this.#events.has(time)) return;
        if (i == null || i == undefined) {
            this.#events.delete(time);
            return;
        }
        this.#events.get(time).splice(i, 1);
        if (this.#events.get(time).length == 0) this.#events.delete(time);
    }
    
    /**
     * 특정 시간의 이벤트 반환
     * @returns 이벤트 데이터
     */
    getEvents(time: number): Event[] {
        return this.#events.get(time) ?? [];
    }

    /**
     * 특정 시간에 이벤트가 존재하는지 여부 반환
     * @returns 이벤트 데이터 존재 여부
     */
    hasEvents(time: number): boolean {
        return this.#events.has(time);
    }

    /**
     * 이벤트가 존재하는 시간을 작은 것부터 커지는 순서로 반환
     * @returns 이벤트가 존재하는 모든 시간
     */
    getAllEventTimes(): number[] {
        return [...this.#events.keys()].sort((a, b) => a - b);
    }

    /**
     * 이벤트가 존재하는 시간을 큰 것부터 작아지는 순서로 반환
     * @returns 이벤트가 존재하는 모든 시간(역순)
     */
    getAllEventTimesReversed(): number[] {
        return [...this.#events.keys()].sort((a, b) => b - a);
    }

    /**
     * 존재하는 모든 이벤트를 순회
     * @param cbfn callback 함수
     */
    forEach(cbfn: ForEachCallback) {
        for (let playTime of this.getAllEventTimes()) {
            cbfn(this.#events.get(playTime), playTime);
        }
    }

    /** 청크 데이터를 읽음 */
    #readData(data: Uint8Array) {
        let bs = new ByteStream(data);
        let currentTick = 0;
        let textDecoder = new TextDecoder();
        let lastMidiEventType: MidiEventType;
        let lastMidiEventChannel: number;
        while (bs.isDataAvailable) {
            // delta = 직전 이벤트로부터 얼마나 시간이 지났는지에 대한 값
            // 그리스 문자 delta가 수학 같은 데서 뭔 뜻인지 생각해보면 됨
            let delta = bs.readVarUint();
            let type = bs.readUint8();
            
            currentTick += delta;
            if ((type & 0xf0) == 0xf0) { // meta, sysex, escape 이벤트
                if (type == EventType.META) {
                    let subtype = bs.readUint8();
                    let length = bs.readVarUint();
                    let event = MetaEvent.from(subtype, bs.readBytes(length));
                    this.addEvent(currentTick, event);
                } else if (type == EventType.SYSEX) {
                    let length = bs.readVarUint();
                    this.addEvent(currentTick, new SysexEvent(bs.readBytes(length)));
                } else if (type == EventType.ESCAPE) {
                    let length = bs.readVarUint();
                    this.addEvent(currentTick, new EscapeEvent(bs.readBytes(length)));
                }
            } else {
                // midi 이벤트
                let params: MidiEventParameter = [ 0 ];
                let subtype: MidiEventType;
                let channel: number;
                if ((type & 128) == 0) { // 정상적인 midi event type은 무조건 값이 128이거나 더 큰데, 그렇지 않은 경우
                    // running status: 마지막 midi 이벤트와 같은 type과 channel을 따름
                    subtype = lastMidiEventType;
                    channel = lastMidiEventChannel;
                    params[0] = type;
                } else {
                    subtype = lastMidiEventType = type >> 4;
                    channel = lastMidiEventChannel = type & 15;
                    params[0] = bs.readUint8();
                }
                type = EventType.MIDI;
                
                // 파라미터가 1개가 아닌 경우에만 2번째 파라미터를 읽음
                if (!(subtype == MidiEventType.PROGRAM_CHANGE || subtype == MidiEventType.CHANNEL_AFTERTOUCH)) {
                    params[1] = bs.readUint8();
                }

                // velocity 0인 note on은 note off로 처리
                if (subtype == MidiEventType.NOTE_ON && params[1] == 0) {
                    subtype = MidiEventType.NOTE_OFF;
                    params[1] = 127;
                }
                this.addEvent(currentTick, MidiEvent.from(channel, subtype, params));
            }
        }

        this.updatePortPrefix();
    }

    updatePortPrefix() {
        this.forEach(event => {
            if (event instanceof PortPrefixMetaEvent) {
                this.portNo = event.port;
            }
        });
    }

    serialize(): Uint8Array {
        const bsDryRun = new ByteStreamSimulator();
        this.#writeActualData(bsDryRun);
        const bs = new ByteStream(8 + bsDryRun.length);
        bs.writeBytes(new TextEncoder().encode(this.id));
        bs.writeUint32(bsDryRun.length);
        this.#writeActualData(bs);
        return new Uint8Array(bs.buffer);
    }

    #writeActualData(bs: ByteStreamInterface) {
        let textEncoder = new TextEncoder();
        let lastMidiEventType: MidiEventType;
        let lastMidiEventChannel: number;
        let lastTick = 0;
        let delta: number;
        this.forEach((events, tick) => {
            events.forEach(event => {
                // delta = 직전 이벤트로부터 얼마나 시간이 지났는지에 대한 값
                // 그리스 문자 delta가 수학 같은 데서 뭔 뜻인지 생각해보면 됨
                delta = tick - lastTick;
                lastTick = tick;
    
                bs.writeVarUint(delta);
                bs.writeBytes(event.serialize());
            });
        });
    }
}