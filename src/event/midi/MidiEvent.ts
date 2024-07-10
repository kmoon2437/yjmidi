import { Event } from '../Event.js';
import { EventType, MidiEventType, ControlChange } from '../../consts.js';
import {
    NoteOffMidiEvent, NoteOnMidiEvent,
    NoteAftertouchMidiEvent, ControlChangeMidiEvent,
    ProgramChangeMidiEvent,
    ChannelAftertouchMidiEvent, PitchBendMidiEvent
} from './index.js';
import { MidiMessage } from '../MidiMessage.js';
import { MidiMessageEvent } from '../MidiMessageEvent.js';

/** midi 메세지용 파라미터. 1개일 수도 있고 2개일 수도 있음 */
export type MidiEventParameter = [number, number?];

export abstract class MidiEvent extends Event implements MidiMessageEvent {
    readonly type: EventType = EventType.MIDI;
    abstract readonly subtype: MidiEventType;
    abstract channel: number;
    
    static from(channel: number, subtype: MidiEventType, params: MidiEventParameter) {
        let event: MidiEvent;
        switch (subtype) {
            case MidiEventType.NOTE_OFF: event = new NoteOffMidiEvent(channel, params[0], params[1]); break;
            case MidiEventType.NOTE_ON: event = new NoteOnMidiEvent(channel, params[0], params[1]); break;
            case MidiEventType.NOTE_AFTERTOUCH: event = new NoteAftertouchMidiEvent(channel, params[0], params[1]); break;
            case MidiEventType.CONTROL_CHANGE: event = new ControlChangeMidiEvent(channel, params[0], params[1]); break;
            case MidiEventType.PROGRAM_CHANGE: event = new ProgramChangeMidiEvent(channel, params[0]); break;
            case MidiEventType.CHANNEL_AFTERTOUCH: event = new ChannelAftertouchMidiEvent(channel, params[0]); break;
            case MidiEventType.PITCH_BEND: event = new PitchBendMidiEvent(channel, params[0], params[1]); break;
            default: throw new TypeError('Unknown midi event type'); break;
        }
        return event;
    }

    abstract toMidiMessage(): MidiMessage;

    serialize(): Uint8Array {
        let msg = this.toMidiMessage();
        return Uint8Array.from(msg);
    }

    serializeShortened(): Uint8Array {
        let msg = this.toMidiMessage();
        msg.pop();
        return Uint8Array.from(msg);
    }
}