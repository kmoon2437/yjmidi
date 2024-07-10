import { MetaEvent } from './index.js';
import { EventType, MetaEventType } from '../../consts.js';

export class KeySignatureMetaEvent extends MetaEvent {
    readonly subtype: MetaEventType = MetaEventType.KEY_SIGNATURE;

    /**
     * 악보에 붙는 조표의 갯수
     * 양수 = ♯, 음수 = ♭, 0 = 없음
     */
    key: number;

    /**
     * 단조인지 여부
     * false면 장조임
     */
    isMinor: boolean;

    /**
     * 각각의 값을 직접 받는 생성자
     * @param key 조표 수
     * @param isMinor 단조인지 여부
     */
    constructor(key: number, isMinor: boolean);

    /**
     * Uint8Array 데이터를 받아 변환하는 생성자
     * @param data 2바이트 길이의 데이터
     */
    constructor(data: Uint8Array);

    constructor(data: number | Uint8Array, isMinor: boolean = false) {
        super();
        if (typeof data == 'number') {
            this.key = data;
            this.isMinor = isMinor;
        } else if (data instanceof Uint8Array) {
            this.key = data[0] > 127 ? data[0] - 256 : data[0];
            this.isMinor = !!data[1];
        }
    }

    serialize(): Uint8Array {
        return Uint8Array.from([
            EventType.META, this.subtype, 0x02,
            this.key < 0 ? this.key + 256 : this.key,
            this.isMinor ? 1 : 0
        ]);
    }
}