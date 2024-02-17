import { EventType } from '../consts.js';

export abstract class Event {
    /** 이 이벤트의 종류 */
    abstract readonly type: EventType;

    /**
     * midi 파일에 넣을 수 있는 형태의 이벤트 데이터를 만들어 반환함.
     * event type과 그 뒤에 나오는 subtype, 길이 등의 데이터가 모두 들어 있음
     * @todo 추후 abstract로 바꾸고 구현 예정
     */
    serialize(): Uint8Array {
        return new Uint8Array();
    }
}