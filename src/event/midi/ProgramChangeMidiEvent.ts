import { MidiEventType } from '../../consts.js';
import { MidiEvent } from './index.js';
import { MidiMessage } from '../MidiMessage.js';

export class ProgramChangeMidiEvent extends MidiEvent {
    readonly subtype: MidiEventType = MidiEventType.PROGRAM_CHANGE;
    channel: number;
    program: number;

    constructor(channel: number, program: number) {
        super();
        this.channel = channel;
        this.program = program;
    }

    toMidiMessage(): MidiMessage {
        return [(this.subtype << 4) + this.channel, this.program];
    }
}