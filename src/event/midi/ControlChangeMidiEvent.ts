import { MidiEventType, ControlChange } from '../../consts.js';
import { MidiEvent } from './index.js';
import { MidiMessage } from '../MidiMessage.js';

// midi의 꽃(?)
export class ControlChangeMidiEvent extends MidiEvent {
    readonly subtype: MidiEventType = MidiEventType.CONTROL_CHANGE;
    channel: number;
    controller: ControlChange;
    value: number;

    constructor(channel: number, controller: ControlChange, value: number) {
        super();
        this.channel = channel;
        this.controller = controller;
        this.value = value;
    }

    toMidiMessage(): MidiMessage {
        return [this.subtype << 4 + this.channel, this.controller, this.value];
    }
}