import { MidiEventType } from '../../consts.js';
import { MidiEvent } from './index.js';
import { MidiMessage } from '../MidiMessage.js';

export abstract class NoteMidiEvent extends MidiEvent {
    channel: number;
    note: number;
    velocity: number;

    constructor(channel: number, note: number, velocity: number = 127) {
        super();
        this.channel = channel;
        this.note = note;
        this.velocity = velocity;
    }
    
    toMidiMessage(): MidiMessage {
        return [(this.subtype << 4) + this.channel, this.note, this.velocity];
    }
}

export class NoteOffMidiEvent extends NoteMidiEvent {
    readonly subtype: MidiEventType = MidiEventType.NOTE_OFF;
}

export class NoteOnMidiEvent extends NoteMidiEvent {
    readonly subtype: MidiEventType = MidiEventType.NOTE_ON;
}