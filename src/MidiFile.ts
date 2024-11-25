import { ByteStream } from 'byte-data-stream';
import { MidiChunk, UnknownChunk } from './chunk/MidiChunk.js';
import { MidiFileHeader } from './chunk/MidiFileHeader.js';
import { MidiTrack } from './chunk/MidiTrack.js';
import { SetTempoMetaEvent } from './event/meta/index.js';

export class MidiFile {
    /** 어떤 유형인지 알 수 없는 청크들 */
    unknownChunks: MidiChunk[];

    /**
     * header 청크.
     * 미디 파일과 관련된 핵심적인 정보를 담고 있음
     */
    header: MidiFileHeader;

    /** 파일에 들어있는 모든 트랙들 */
    tracks: MidiTrack[];

    /** 템포 이벤트. 단순히 재생할 때 찾기 편하게 하려는 용도라 파일을 쓸 때 이걸 반영하지는 않음 */
    tempoEvents: MidiTrack;

    /** 미디 파일이 공백 없이 그냥 끝나는 경우에 대비해 재생용으로 추가되는 공백 시간(밀리초 단위) */
    tailMs: number;

    /** 이 파일의 총 재생 시간(틱 단위). 초기값은 0 */
    durationTick: number;

    /** 이 파일의 총 재생 시간(밀리초 단위). 초기값은 0 */
    durationMs: number;

    /**
     * 생성자
     * @param data 미디 데이터
     * @param tailMs 미디 파일이 공백 없이 그냥 끝나는 경우에 대비해 재생용으로 추가되는 공백 시간(밀리초 단위)
     */
    constructor(data: ArrayBuffer | Uint8Array = null, tailMs: number = 500) {
        this.tailMs = tailMs;
        this.unknownChunks = [];
        if (data) {
            this.#loadData(data);
        } else {
            this.header = new MidiFileHeader();
            this.tracks = [];
            this.tempoEvents = new MidiTrack(-1);
        }
    }
    
    #loadData(data: ArrayBuffer | Uint8Array) {
        let chunks = [];
        let d = new ByteStream(data);

        while (d.isDataAvailable) {
            let id = d.readBytes(4).reduce((a, b) => a + String.fromCharCode(b), '');
            if (d.i <= 4 && id != MidiFileHeader.CHUNK_ID) throw new Error('Invalid header signature(MThd)');
            let length = d.readUint32();
            let data = d.readBytes(length);
            let chunk = { id, data };
            chunks.push(chunk);
        }

        let headerChunk = [];
        let trackChunks = [];

        chunks.forEach(chunk => {
            if (chunk.id == MidiFileHeader.CHUNK_ID) {
                headerChunk.push(chunk);
            } else if (chunk.id == MidiTrack.CHUNK_ID) {
                trackChunks.push(chunk);
            } else {
                this.unknownChunks.push(new UnknownChunk(chunk.id, chunk.data));
            }
        });

        if (headerChunk.length > 1) {
            throw new Error('Too many header chunks');
        } else if (headerChunk.length < 1) {
            throw new Error('No header chunk');
        }

        this.header = new MidiFileHeader(headerChunk[0].data);
        this.tracks = trackChunks.map((chunk, i) => new MidiTrack(i, chunk.data));

        this.updateTempoEvents();
        this.#calculateDuration();
    }

    /**
     * 템포 이벤트 인덱스 갱신. 파일을 쓰는 작업에서 필요할 거 같아서 public으로 설정함
     */
    updateTempoEvents() {
        this.tempoEvents = new MidiTrack(-1);
        for (let i in this.tracks) {
            this.tracks[i].forEach((events, time) => events.forEach(event => {
                if (event instanceof SetTempoMetaEvent) {
                    this.tempoEvents.addEvent(time, event);
                }
            }));
        }
    }

    /**
     * 파일의 duration을 새로 계산
     */
    #calculateDuration() {
        let endTimes = [];
        let endTimesMs = [];
        for (let i in this.tracks) {
            endTimes.push(this.tracks[i].getAllEventTimesReversed()[0]);
        }
        this.durationTick = Math.max(...endTimes, 0);

        // durationMs 계산
        if (this.header.ticksPerBeat) {
            this.durationMs = 0;
            let currentTempo = 500000; // 마이크로초 단위
            let currentTick = 0;
            this.tempoEvents.forEach((tevents: SetTempoMetaEvent[], playTime) => {
                this.durationMs += currentTempo * ((playTime - currentTick) / this.header.ticksPerBeat);
                // 같은 시간에 템포 이벤트가 여러 개 뜨면 마지막에 있는것만 반영됨
                currentTempo = tevents[tevents.length - 1].tempo;
                for (let i in tevents) {
                    tevents[i].playMs = this.durationMs / 1000;
                }
                currentTick = playTime;
            });
            this.durationMs +=
                currentTempo * ((this.durationTick - currentTick) / this.header.ticksPerBeat);
            this.durationMs /= 1000; // 마이크로초 단위이므로 밀리초로 바꾼다
        } else {
            this.durationMs = (this.durationTick * this.header.tickResolution) / 1000;
        }
        this.durationMs = Math.round(this.durationMs);

        // durationTick에도 정확히 tailMs만큼의 공백시간을 추가
        if (this.tailMs > 0) {
            this.durationMs += this.tailMs;
            if (this.header.ticksPerBeat) {
                let lastTempoEventTime = this.tempoEvents.getAllEventTimesReversed()[0];
                let tevents = this.tempoEvents.getEvents(lastTempoEventTime) as SetTempoMetaEvent[];
                let lastTempo = tevents[tevents.length - 1] ? tevents[tevents.length - 1].tempo : 500000;
                this.durationTick += Math.round(((this.tailMs * 1000) / lastTempo) * this.header.ticksPerBeat);
            } else {
                this.durationTick += Math.round((this.tailMs * 1000) / this.header.tickResolution);
            }
        }
    }

    toUint8Array(): Uint8Array {
        let chunks = [];
        chunks.push(this.header.serialize());
        this.tracks.forEach(track => chunks.push(track.serialize()));
        this.unknownChunks.forEach(chunk => chunks.push(chunk.serialize()));
        let bs = new ByteStream(chunks.map(data => data.length).reduce((a, b) => a + b, 0));
        chunks.forEach(data => bs.writeBytes(data));
        return new Uint8Array(bs.buffer);
    }
}