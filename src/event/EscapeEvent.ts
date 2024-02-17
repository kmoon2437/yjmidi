import { Event } from './Event.js';
import { EventType } from '../consts.js';
import { MidiMessage } from './MidiMessage.js';
import { MidiMessageEvent } from './MidiMessageEvent.js';

export class EscapeEvent extends Event implements MidiMessageEvent {
    readonly type: EventType = EventType.ESCAPE;
    
    /** 날것 그대로의 midi 메세지 데이터 */
    data: Uint8Array;

    /**
     * 생성자
     * @param data 날것 그대로의 midi 메세지 데이터. 연주할 때 이걸 그대로 미디음원 쪽으로 보낸다
     */
    constructor(data: Uint8Array) {
        super();
        this.data = data;
    }

    toMidiMessage(): MidiMessage {
        return [...this.data] as MidiMessage;
    }
}