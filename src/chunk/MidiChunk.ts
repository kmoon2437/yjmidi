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
        // id의 길이는 4바이트이고, 길이 정보를 넣기 위해 적어도 1바이트는 쓰게 됨
        let bs = new ByteStream(new ArrayBuffer(5 + this.data.length));
        bs.writeBytes(new TextEncoder().encode(this.id));
        bs.writeVarUint(this.data.length);
        bs.writeBytes(this.data);
        return new Uint8Array(bs.buffer);
    }
}