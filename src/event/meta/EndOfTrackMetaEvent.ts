import { MetaEvent } from './index.js';
import { MetaEventType } from '../../consts.js';

export class EndOfTrackMetaEvent extends MetaEvent {
    readonly subtype: MetaEventType = MetaEventType.END_OF_TRACK;
    // 아무것도 없음
}