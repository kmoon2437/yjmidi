import { MidiEventType } from '../../consts.js';
import { MidiEvent } from './index.js';
import { MidiMessage } from '../MidiMessage.js';

export class ChannelAftertouchMidiEvent extends MidiEvent {
    readonly subtype: MidiEventType = MidiEventType.CHANNEL_AFTERTOUCH;
    channel: number;
    pressure: number;

    constructor(channel: number, pressure: number) {
        super();
        this.channel = channel;
        this.pressure = pressure;
    }

    toMidiMessage(): MidiMessage {
        return [this.subtype << 4 + this.channel, this.pressure];
    }
}