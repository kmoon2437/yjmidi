import { ByteStream } from 'byte-data-stream';
import { MidiChunk } from './MidiChunk.js';

/**
 * midi 파일의 format 정보
 */
export enum MidiFileFormat {
    /**
     * 모든 데이터가 한 채널에 몰려 있는 형태
     */
    SINGLE_TRACK = 0,

    /**
     * 트랙 여러 개가 동시에 연주되는 형태
     * 채널별로 트랙을 나눌 수 있어서 가장 많이 쓰임
     */
    MULTI_TRACK = 1,
    
    /**
     * 트랙이 여러 개긴 한데 각각이 독립된 형태임
     * 쉽게 말해서 저 위의 SINGLE_TRACK이 한 파일에 여러 개가 몰려있는 거라고 보면 됨
     */
    MULTI_INDEPENDENT_TRACK = 2
}

/** midi 파일 헤더의 데이터 길이 */
export const HEADER_LENGTH = 6;

/**
 * midi 파일의 header chunk
 */
export class MidiFileHeader extends MidiChunk {
    static readonly CHUNK_ID = 'MThd';
    readonly id: string = MidiFileHeader.CHUNK_ID;

    /** 이 파일의 트랙 구조 */
    format: MidiFileFormat;

    /** 이 파일의 총 트랙 수 */
    tracksCount: number;

    /** 이 파일의 1박자당 틱 수 */
    ticksPerBeat: number | null;

    /** 이 파일의 초당 프레임 수 */
    framesPerSecond: number | null;

    /** 이 파일의 프레임당 틱 수 */
    ticksPerFrame: number | null;

    /** 이 파일의 틱당 마이크로초 값 */
    tickResolution: number | null;

    /**
     * 생성자
     * @param data header chunk 데이터. 길이는 항상 6바이트이다
     */
    constructor(data: Uint8Array = null) {
        super();
        this.format = MidiFileFormat.MULTI_TRACK;
        this.ticksPerBeat = 960;
        this.tracksCount = 0;
        if (data) this.#readData(data);
    }
    
    #readData(data: Uint8Array) {
        if (data.byteLength != HEADER_LENGTH) throw new Error('Invalid header length');
        const bs = new ByteStream(data);
        this.format = bs.readUint16();
        this.tracksCount = bs.readUint16();
        this.setDivision(bs.readBytes(2));
    }
    
    /**
     * tick 단위가 박자에 기반하는지 시간에 기반하는지 결정
     * @param division 실제로 midi 파일에 수록되는 형태의 division 데이터
     */
    setDivision(division: Uint8Array | number[]) {
        // 일단 전부 null로 설정
        this.ticksPerBeat = this.framesPerSecond = this.ticksPerFrame = this.tickResolution = null;

        if (division[0] & 128) {
            this.framesPerSecond = division[0] & 127;
            this.ticksPerFrame = division[1];
            // 마이크로초 단위
            this.tickResolution = 1000000 / (this.framesPerSecond * this.ticksPerFrame);
        } else {
            this.ticksPerBeat = (division[0] << 8) + division[1];
        }
    }
    
    /**
     * 박자당 틱을 설정해 tick 단위가 박자를 기반으로 하도록 설정
     * @param ticksPerBeat 1박자당 틱
     */
    setTicksPerBeat(ticksPerBeat: number) {
        this.ticksPerBeat = ticksPerBeat;
        this.framesPerSecond = this.ticksPerFrame = this.tickResolution = null;
    }

    serialize(): Uint8Array {
        // id의 길이 4바이트 + 데이터 길이 값 4바이트 + 데이터 6바이트 = 14바이트
        const bs = new ByteStream(new ArrayBuffer(8 + HEADER_LENGTH));
        bs.writeBytes(new TextEncoder().encode(this.id));
        bs.writeUint32(HEADER_LENGTH);
        bs.writeUint16(this.format);
        bs.writeUint16(this.tracksCount);
        this.#writeDivision(bs);
        return new Uint8Array(bs.buffer);
    }

    #writeDivision(bs: ByteStream) {
        let division = [0, 0];

        // 일반적으로 ticks per beat 쪽이 더 권장되는 방법이다
        if (this.ticksPerBeat) {
            division[0] = this.ticksPerBeat >> 8;
            division[1] = this.ticksPerBeat & 255;
        } else {
            division[0] = this.framesPerSecond | 128;
            division[1] = this.ticksPerFrame;
        }
        bs.writeBytes(division);
    }
}