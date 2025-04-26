import { MetaEvent } from './index.js';
import { EventType, MetaEventType } from '../../consts.js';
import { ByteStream } from 'byte-data-stream';

export abstract class BaseTextMetaEvent extends MetaEvent {
    abstract readonly subtype: MetaEventType;
    content: Uint8Array;

    /**
     * 텍스트 문자열을 직접 받는 생성자
     * @param content 텍스트 내용
     */
    constructor(contentText: string);

    /**
     * Uint8Array 데이터를 받아 변환하는 생성자
     * @param data 바이너리로 인코딩된 텍스트 데이터
     */
    constructor(content: Uint8Array);

    constructor(content: string | Uint8Array) {
        super();
        if (content instanceof Uint8Array) this.content = content;
        else if (typeof content == 'string') this.content = new TextEncoder().encode(content);
        else this.content = new Uint8Array();
    }

    serialize(): Uint8Array {
        // meta event 표시 1바이트 + subtype 1바이트 + 길이 최소 1바이트 = 최소 3바이트
        let bs = new ByteStream(3 + this.content.length);
        bs.writeBytes([EventType.META, this.subtype]);
        bs.writeVarUint(this.content.length);
        bs.writeBytes(this.content);
        return new Uint8Array(bs.buffer);
    }
    
    get contentText() {
        return new TextDecoder().decode(this.content);
    }

    set contentText(text) {
        this.content = new TextEncoder().encode(text);
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