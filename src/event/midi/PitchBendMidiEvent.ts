import { MidiEventType } from '../../consts.js';
import { MidiEvent } from './index.js';
import { MidiMessage } from '../MidiMessage.js';

export class PitchBendMidiEvent extends MidiEvent {
    readonly subtype: MidiEventType = MidiEventType.PITCH_BEND;
    channel: number;
    pitchValue: number;

    constructor(channel: number, pitchValue: number);

    constructor(channel: number, lsb: number, msb: number);

    constructor(channel: number, lsb: number, msb: number = null) {
        super();
        this.channel = channel;
        if (typeof msb == 'number') {
            this.pitchValue = lsb + (msb << 7);
        } else {
            this.pitchValue = lsb;
        }
    }

    toMidiMessage(): MidiMessage {
        return [
            this.subtype << 4 + this.channel,
            this.pitchValue >> 7,
            this.pitchValue - ((this.pitchValue >> 7) << 7) // 한번 오른쪽으로 밀면 밀린 비트는 모두 소실됨
        ];
    }
}