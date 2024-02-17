import { MetaEvent } from './index.js';
import { MetaEventType } from '../../consts.js';

export class SequenceNumberMetaEvent extends MetaEvent {
    readonly subtype: MetaEventType = MetaEventType.SEQUENCE_NUMBER;
    sequence: number;

    /**
     * sequence 번호를 직접 받는 생성자
     * @param sequence sequence 번호
     */
    constructor(sequence: number);

    /**
     * Uint8Array 데이터를 받아 변환하는 생성자
     * @param data uint16형의 숫자 데이터
     */
    constructor(data: Uint8Array);

    constructor(data: number | Uint8Array) {
        super();
        if (typeof data == 'number') this.sequence = data;
        else if (data instanceof Uint8Array && data.length >= 2) {
            this.sequence = 0;
            this.sequence += data[0] << 8;
            this.sequence += data[1];
        } else this.sequence = 0;
    }
}