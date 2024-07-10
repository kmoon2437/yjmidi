import { MetaEvent } from './index.js';
import { EventType, MetaEventType } from '../../consts.js';

export class PortPrefixMetaEvent extends MetaEvent {
    readonly subtype: MetaEventType = MetaEventType.PORT_PREFIX;
    port: number;

    /**
     * 포트 번호를 직접 받는 생성자
     * @param port midi 포트 번호
     */
    constructor(port: number);

    /**
     * Uint8Array 데이터를 받아 변환하는 생성자
     * @param data 1바이트짜리 데이터
     */
    constructor(data: Uint8Array);

    constructor(data: number | Uint8Array) {
        super();
        if (typeof data == 'number') this.port = data;
        else if (data instanceof Uint8Array) this.port = data[0];
        else this.port = 0;
    }

    serialize(): Uint8Array {
        return Uint8Array.from([
            EventType.META, this.subtype, 0x01, this.port
        ]);
    }
}