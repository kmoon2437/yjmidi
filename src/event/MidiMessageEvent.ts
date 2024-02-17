import { MidiMessage } from './MidiMessage.js';

/** midi 메세지를 보내는 이벤트 */
export interface MidiMessageEvent {
    /**
     * 이벤트를 midi 메세지로 변환
     * @returns 변환된 미디 메세지
     */
    toMidiMessage(): MidiMessage;
}