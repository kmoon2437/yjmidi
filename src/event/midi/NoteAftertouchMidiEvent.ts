import { MidiEventType } from '../../consts.js';
import { MidiEvent } from './index.js';
import { MidiMessage } from '../MidiMessage.js';

// polyphonic aftertouch라고도 함
export class NoteAftertouchMidiEvent extends MidiEvent {
    readonly subtype: MidiEventType = MidiEventType.NOTE_AFTERTOUCH;
    channel: number;
    note: number;
    pressure: number;

    constructor(channel: number, note: number, pressure: number) {
        super();
        this.channel = channel;
        this.note = note;
        this.pressure = pressure;
    }

    toMidiMessage(): MidiMessage {
        return [this.subtype << 4 + this.channel, this.note, this.pressure];
    }
}