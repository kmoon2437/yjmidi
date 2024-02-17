import { MetaEvent } from './index.js';
import { MetaEventType } from '../../consts.js';

/**
 * 자꾸 SMTP랑 헷갈림
 */
export class SMPTEOffsetMetaEvent extends MetaEvent {
    readonly subtype: MetaEventType = MetaEventType.SMPTE_OFFSET;
    hours: number;
    minutes: number;
    seconds: number;
    frames: number;
    subframes: number;

    /**
     * 각각의 값을 직접 받는 생성자
     * @param hours 시간
     * @param minutes 분
     * @param seconds 초
     * @param frames 프레임
     * @param subframes 프레임의 프레임(?)
     */
    constructor(hours: number, minutes: number, seconds: number, frames: number, subframes: number);

    /**
     * Uint8Array 데이터를 받아 변환하는 생성자
     * @param data 5바이트 길이의 데이터
     */
    constructor(data: Uint8Array);

    constructor(hours: number | Uint8Array, minutes?: number, seconds?: number, frames?: number, subframes?: number) {
        super();
        if (typeof hours == 'number') {
            this.hours = hours;
            this.minutes = minutes;
            this.seconds = seconds;
            this.frames = frames;
            this.subframes = subframes;
        } else if (hours instanceof Uint8Array) {
            let data = hours;
            this.hours = data[0];
            this.minutes = data[1];
            this.seconds = data[2];
            this.frames = data[3];
            this.subframes = data[4];
        }
    }
}