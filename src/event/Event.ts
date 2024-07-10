import { EventType } from '../consts.js';

export abstract class Event {
    /** 이 이벤트의 종류 */
    abstract readonly type: EventType;

    /**
     * midi 파일에 넣을 수 있는 형태의 이벤트 데이터를 만들어 반환함.
     * event type과 그 뒤에 나오는 subtype, 길이 등의 데이터가 모두 들어 있음
     * delta time은 제외하며 meta, sysex, escape 이벤트의 경우 데이터의 길이를 포함함
     * (쉽게 말해 delta time 이후에 와야 되는 모든 데이터가 여기서 튀어나와야 됨)
     */
    abstract serialize(): Uint8Array;
}