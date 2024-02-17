import { MetaEvent } from './index.js';
import { MetaEventType } from '../../consts.js';

export class SetTempoMetaEvent extends MetaEvent {
    readonly subtype: MetaEventType = MetaEventType.SET_TEMPO;
    tempo: number;
    playMs: number | null;

    /** 템포를 bpm 형식으로 변환해서 반환 */
    get tempoBPM(): number {
        return 60000000 / this.tempo;
    }

    /**
     * 템포 값을 직접 받는 생성자
     * @param tempo 템포 값
     * @param isBPM bpm인지 여부. false면 1박자당 마이크로초인 걸로 간주함
     */
    constructor(tempo: number, isBPM: boolean);

    /**
     * Uint8Array 데이터를 받아 변환하는 생성자
     * @param data uint24형의 숫자 데이터
     */
    constructor(data: Uint8Array);

    constructor(data: number | Uint8Array, isBPM: boolean = false) {
        super();
        if (typeof data == 'number') {
            this.tempo = isBPM ? Math.floor(60000000 / data) : data;
        } else if (data instanceof Uint8Array) {
            this.tempo = 0; // 마이크로초 단위(1박자의 길이)
            this.tempo += data[0] << 16;
            this.tempo += data[1] << 8;
            this.tempo += data[2];
        }
        this.playMs = null;
    }
}