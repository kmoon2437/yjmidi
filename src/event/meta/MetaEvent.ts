import { Event } from '../Event.js';
import { EventType, MetaEventType } from '../../consts.js';
import {
    SequenceNumberMetaEvent,

    TextMetaEvent, CopyrightNoticeMetaEvent,
    TrackNameMetaEvent, InstrumentNameMetaEvent,
    LyricsMetaEvent, MarkerMetaEvent,
    CuePointMetaEvent, SequencerSpecificMetaEvent,

    ChannelPrefixMetaEvent, PortPrefixMetaEvent,
    EndOfTrackMetaEvent, SetTempoMetaEvent,
    SMPTEOffsetMetaEvent, TimeSignatureMetaEvent,
    KeySignatureMetaEvent
} from './index.js';

export abstract class MetaEvent extends Event {
    readonly type: EventType = EventType.META;
    abstract readonly subtype: MetaEventType;

    /**
     * 정해진 subtype에 대응하는 meta 이벤트 객체를 만들어 반환
     * @param subtype meta 이벤트의 종류
     * @param data 파싱을 거치지 않은 날것 그대로의 데이터
     */
    static from(subtype: MetaEventType, data: Uint8Array): MetaEvent {
        let event: MetaEvent;
        switch (subtype) {
            case MetaEventType.SEQUENCE_NUMBER: event = new SequenceNumberMetaEvent(data); break;
            case MetaEventType.TEXT: event = new TextMetaEvent(data); break;
            case MetaEventType.COPYRIGHT_NOTICE: event = new CopyrightNoticeMetaEvent(data); break;
            case MetaEventType.TRACK_NAME: event = new TrackNameMetaEvent(data); break;
            case MetaEventType.INSTRUMENT_NAME: event = new InstrumentNameMetaEvent(data); break;
            case MetaEventType.LYRICS: event = new LyricsMetaEvent(data); break;
            case MetaEventType.MARKER: event = new MarkerMetaEvent(data); break;
            case MetaEventType.CUE_POINT: event = new CuePointMetaEvent(data); break;
            case MetaEventType.CHANNEL_PREFIX: event = new ChannelPrefixMetaEvent(data); break;
            case MetaEventType.PORT_PREFIX: event = new PortPrefixMetaEvent(data); break;
            case MetaEventType.END_OF_TRACK: event = new EndOfTrackMetaEvent(); break;
            case MetaEventType.SET_TEMPO: event = new SetTempoMetaEvent(data); break;
            case MetaEventType.SMPTE_OFFSET: event = new SMPTEOffsetMetaEvent(data); break;
            case MetaEventType.TIME_SIGNATURE: event = new TimeSignatureMetaEvent(data); break;
            case MetaEventType.KEY_SIGNATURE: event = new KeySignatureMetaEvent(data); break;
            case MetaEventType.SEQUENCER_SPECIFIC: event = new SequencerSpecificMetaEvent(data); break;
            default: event = new UnknownMetaEvent(subtype, data); break;
        }
        return event;
    }
}

export class UnknownMetaEvent extends MetaEvent {
    readonly subtype: MetaEventType;
    data: Uint8Array;

    constructor(subtype: MetaEventType, data: Uint8Array) {
        super();
        this.subtype = subtype;
        this.data = data;
    }
}