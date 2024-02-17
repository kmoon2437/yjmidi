import { MetaEvent } from './index.js';
import { MetaEventType } from '../../consts.js';

export abstract class BaseTextMetaEvent extends MetaEvent {
    abstract readonly subtype: MetaEventType;
    content: string;

    /**
     * 텍스트 문자열을 직접 받는 생성자
     * @param content 텍스트 내용
     */
    constructor(content: string);

    /**
     * Uint8Array 데이터를 받아 변환하는 생성자
     * @param data 바이너리로 인코딩된 텍스트 데이터
     */
    constructor(data: Uint8Array);

    constructor(data: string | Uint8Array) {
        super();
        if (typeof data == 'string') this.content = data;
        else if (data instanceof Uint8Array) this.content = new TextDecoder().decode(data);
        else this.content = '';
    }
}

export class TextMetaEvent extends BaseTextMetaEvent {
    readonly subtype: MetaEventType = MetaEventType.TEXT;
}

export class CopyrightNoticeMetaEvent extends BaseTextMetaEvent {
    readonly subtype: MetaEventType = MetaEventType.COPYRIGHT_NOTICE;
}

export class TrackNameMetaEvent extends BaseTextMetaEvent {
    readonly subtype: MetaEventType = MetaEventType.TRACK_NAME;
}

export class InstrumentNameMetaEvent extends BaseTextMetaEvent {
    readonly subtype: MetaEventType = MetaEventType.INSTRUMENT_NAME;
}

export class LyricsMetaEvent extends BaseTextMetaEvent {
    readonly subtype: MetaEventType = MetaEventType.LYRICS;
}

export class MarkerMetaEvent extends BaseTextMetaEvent {
    readonly subtype: MetaEventType = MetaEventType.MARKER;
}

export class CuePointMetaEvent extends BaseTextMetaEvent {
    readonly subtype: MetaEventType = MetaEventType.CUE_POINT;
}

export class SequencerSpecificMetaEvent extends BaseTextMetaEvent {
    readonly subtype: MetaEventType = MetaEventType.SEQUENCER_SPECIFIC;
}