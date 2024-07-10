import { MetaEvent } from './index.js';
import { EventType, MetaEventType } from '../../consts.js';

export class EndOfTrackMetaEvent extends MetaEvent {
    readonly subtype: MetaEventType = MetaEventType.END_OF_TRACK;

    // 딱히 아무것도 없음
    
    serialize(): Uint8Array {
        return Uint8Array.from([
            EventType.META, this.subtype, 0x00
        ]);
    }
}