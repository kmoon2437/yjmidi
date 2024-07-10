import { Event } from './Event.js';
import { EventType } from '../consts.js';
import { MidiMessage } from './MidiMessage.js';
import { MidiMessageEvent } from './MidiMessageEvent.js';
import { ByteStream } from 'byte-data-stream';

export class SysexEvent extends Event implements MidiMessageEvent {
    readonly type: EventType = EventType.SYSEX;
    data: Uint8Array;

    /**
     * 생성자
     * @param data Sysex 메세지 데이터. 맨 앞의 `0xf0`은 빼되 맨 뒤의 `0xf7`은 넣어야 됨
     */
    constructor(data: Uint8Array) {
        super();
        this.data = data;
    }
    
    toMidiMessage(): MidiMessage {
        return [0xf0, ...this.data];
    }

    serialize(): Uint8Array {
        // sysex event 표시 1바이트 + 길이 최소 1바이트 = 최소 2바이트
        let bs = new ByteStream(2 + this.data.length);
        bs.writeUint8(this.type);
        bs.writeVarUint(this.data.length);
        bs.writeBytes(this.data);
        return new Uint8Array(bs.buffer);
    }
}