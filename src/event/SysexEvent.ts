import { Event } from './Event.js';
import { EventType } from '../consts.js';
import { MidiMessage } from './MidiMessage.js';
import { MidiMessageEvent } from './MidiMessageEvent.js';

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
}