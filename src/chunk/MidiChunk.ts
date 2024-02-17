import { ByteStream } from 'byte-data-stream';

export abstract class MidiChunk {
    /**
     * 해당 청크의 ID(`MThd`, `MTrk` 등의 형태)
     */
    abstract readonly id: string;
    
    /**
     * midi 파일에 넣을 수 있는 형태의 청크 데이터를 만들어 반환함.
     * chunk id와 길이까지 모두 들어 있음
     * @todo 추후 abstract로 바꾸고 구현 예정
     */
    serialize(): Uint8Array {
        return null;
    }
}

export class UnknownChunk extends MidiChunk {
    readonly id: string;
    data: Uint8Array;
    constructor(chunkId: string, data: Uint8Array) {
        super();
        this.data = data;
    }
    
    serialize(): Uint8Array {
        // id의 길이 4바이트 + 데이터 길이 값 4바이트 = 8바이트
        let bs = new ByteStream(new ArrayBuffer(8 + this.data.length));
        bs.writeBytes(new TextEncoder().encode(this.id));
        bs.writeUint32(this.data.length);
        bs.writeBytes(this.data);
        return new Uint8Array(bs.buffer);
    }
}