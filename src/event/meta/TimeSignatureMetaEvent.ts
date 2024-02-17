import { MetaEvent } from './index.js';
import { MetaEventType } from '../../consts.js';

export class TimeSignatureMetaEvent extends MetaEvent {
    readonly subtype: MetaEventType = MetaEventType.TIME_SIGNATURE;
    
    /** 박자표의 분자 */
    numerator: number;

    /**
     * 박자표의 분모의 지수
     * 어차피 n분음표의 n은 2의 제곱수이므로 midi 파일에서는 이렇게 저장됨
     * 실제 박자표의 분모는 2의 이것 제곱으로 표현됨
     */
    denominatorExponent: number;

    /**
     * 메트로놈의 주기
     * 분모에 대응하는 음표의 길이가 기준이 됨
     */
    metronomeClick: number;

    /**
     * 분모에 대응하는 음표 하나 길이에 들어가는 32분음표 수
     * 제작자도 이거 가지고 도대체 뭘 하는 건지 궁금하다
     */
    thirtySecondNotesPerBeat: number;

    /** 박자표의 실제 분모 */
    get denominator(): number {
        return 2 ** this.denominatorExponent;
    }

    set denominator(val: number) {
        // 수2에서 하던걸 여기서 쓰게 될 줄이야
        // 여러분 수학 공부해두면 코딩할때 이런데 쓰기도 하고 도움 많이 됩니다(?)
        this.denominatorExponent = Math.log(val) / Math.log(2);
    }

    /**
     * 박자표의 분자/분모를 직접 받는 생성자
     * @param numerator 분자
     * @param denominator 분모. **분모의 지수가 아니다!**
     * @param metronomeClick 메트로놈 주기
     * @param thirtySecondNotesPerBeat 분모에 대응하는 음표 하나 길이에 들어가는 32분음표 수
     */
    constructor(numerator: number, denominator: number, metronomeClick?: number, thirtySecondNotesPerBeat?: number);

    /**
     * Uint8Array 데이터를 받아 변환하는 생성자
     * @param data 4바이트 길이의 데이터
     */
    constructor(data: Uint8Array);

    constructor(numerator: number | Uint8Array, denominator?: number, metronomeClick?: number, thirtySecondNotesPerBeat?: number) {
        super();
        if (typeof numerator == 'number') {
            this.numerator = numerator;
            this.denominator = denominator;
            this.metronomeClick = metronomeClick ?? 1;
            this.thirtySecondNotesPerBeat = thirtySecondNotesPerBeat ?? 32 / denominator;
        } else if (numerator instanceof Uint8Array) {
            let data = numerator;
            this.numerator = data[0];
            this.denominatorExponent = data[1];
            this.metronomeClick = data[2];
            this.thirtySecondNotesPerBeat = data[3];
        }
    }
}