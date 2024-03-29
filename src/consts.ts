/** midi 파일 내의 이벤트 종류 */
export enum EventType {
    META = 0xff,
    MIDI = 0x8,
    SYSEX = 0xf0,
    ESCAPE = 0xf7
}

/** meta 이벤트의 종류 */
export enum MetaEventType {
    SEQUENCE_NUMBER = 0x00,
    TEXT = 0x01,
    COPYRIGHT_NOTICE = 0x02,
    TRACK_NAME = 0x03,
    INSTRUMENT_NAME = 0x04,
    LYRICS = 0x05,
    MARKER = 0x06,
    CUE_POINT = 0x07,
    CHANNEL_PREFIX = 0x20,
    PORT_PREFIX = 0x21, // 사실 비표준이긴 한데 필요해서 넣어둠
    END_OF_TRACK = 0x2f,
    SET_TEMPO = 0x51,
    SMPTE_OFFSET = 0x54,
    TIME_SIGNATURE = 0x58,
    KEY_SIGNATURE = 0x59,
    SEQUENCER_SPECIFIC = 0x7f
}

/** midi 이벤트의 종류 */
export enum MidiEventType {
    NOTE_OFF = 0x8,
    NOTE_ON = 0x9,
    NOTE_AFTERTOUCH = 0xa,
    CONTROL_CHANGE = 0xb,
    PROGRAM_CHANGE = 0xc,
    CHANNEL_AFTERTOUCH = 0xd,
    PITCH_BEND = 0xe
}

/**
 * midi control change 이벤트의 종류
 * 이거 다 쓰느라 겁나 힘들었음
 */
export enum ControlChange {
    BANK_SELECT = 0x00,
    MODULATION = 0x01,
    BREATH = 0x02,
    FOOT = 0x04,
    PORTAMENTO_TIME = 0x05,
    DATA_ENTRY_MSB = 0x06,
    CHANNEL_VOLUME = 0x07,
    BALANCE = 0x08,
    PAN = 0x0a,
    EXPRESSION = 0x0b,
    EFFECT_1 = 0x0c,
    EFFECT_2 = 0x0d,
    GENERAL_PURPOSE_1 = 0x10,
    GENERAL_PURPOSE_2 = 0x11,
    GENERAL_PURPOSE_3 = 0x12,
    GENERAL_PURPOSE_4 = 0x13,
    BANK_SELECT_LSB = 0x20,
    MODULATION_LSB = 0x21,
    BREATH_LSB = 0x22,
    CONTROLLER_0X03_LSB = 0x23,
    FOOT_LSB = 0x24,
    PORTAMENTO_TIME_LSB = 0x25,
    DATA_ENTRY_LSB = 0x26,
    CHANNEL_VOLUME_LSB = 0x27,
    BALANCE_LSB = 0x28,
    CONTROLLER_0X09_LSB = 0x29,
    PAN_LSB = 0x2a,
    EXPRESSION_LSB = 0x2b,
    EFFECT_1_LSB = 0x2c,
    EFFECT_2_LSB = 0x2d,
    CONTROLLER_0X0E_LSB = 0x2e,
    CONTROLLER_0X0F_LSB = 0x2f,
    GENERAL_PURPOSE_1_LSB = 0x30,
    GENERAL_PURPOSE_2_LSB = 0x31,
    GENERAL_PURPOSE_3_LSB = 0x32,
    GENERAL_PURPOSE_4_LSB = 0x33,
    CONTROLLER_0X14_LSB = 0x34,
    CONTROLLER_0X15_LSB = 0x35,
    CONTROLLER_0X16_LSB = 0x36,
    CONTROLLER_0X17_LSB = 0x37,
    CONTROLLER_0X18_LSB = 0x38,
    CONTROLLER_0X19_LSB = 0x39,
    CONTROLLER_0X1A_LSB = 0x3a,
    CONTROLLER_0X1B_LSB = 0x3b,
    CONTROLLER_0X1C_LSB = 0x3c,
    CONTROLLER_0X1D_LSB = 0x3d,
    CONTROLLER_0X1E_LSB = 0x3e,
    CONTROLLER_0X1F_LSB = 0x3f,
    SUSTAIN_ONOFF = 0x40,
    PORTAMENTO_ONOFF = 0x41,
    SOSTENUTO_ONOFF = 0x42,
    SOFT_PEDAL_ONOFF = 0x43,
    LEGATO_FOOTSWITCH = 0x44,
    HOLD_2 = 0x45,
    
    // sound controller 1~9(일종의 alias)
    SOUND_VARIATION = 0x46, // sound controller 1
    TIMBRE_HARMONIC_INTENS = 0x47, // sound controller 2
    RELEASE_TIME = 0x48, // sound controller 3
    ATTACK_TIME = 0x49, // sound controller 4
    CUTOFF_FREQUENCY = 0x4a, // sound controller 5
    DECAY_TIME = 0x4b, // sound controller 6
    VIBRATO_RATE = 0x4c, // sound controller 7
    VIBRATO_DEPTH = 0x4d, // sound controller 8
    VIBRATO_DELAY = 0x4e, // sound controller 9

    SOUND_CONTROLLER_1 = 0x46,
    SOUND_CONTROLLER_2 = 0x47,
    SOUND_CONTROLLER_3 = 0x48,
    SOUND_CONTROLLER_4 = 0x49,
    SOUND_CONTROLLER_5 = 0x4a,
    SOUND_CONTROLLER_6 = 0x4b,
    SOUND_CONTROLLER_7 = 0x4c,
    SOUND_CONTROLLER_8 = 0x4d,
    SOUND_CONTROLLER_9 = 0x4e,
    SOUND_CONTROLLER_10 = 0x4f,

    GENERAL_PURPOSE_5 = 0x50,
    GENERAL_PURPOSE_6 = 0x51,
    GENERAL_PURPOSE_7 = 0x52,
    GENERAL_PURPOSE_8 = 0x53,
    PORTAMENTO_CONTROL = 0x54,
    HIGH_RESOLUTION_VELOCITY_PREFIX = 0x58,
    REVERB_SEND_LEVEL = 0x5b,
    TREMOLO_DEPTH = 0x5c,
    CHORUS_DEPTH = 0x5d,
    CELESTE_DEPTH = 0x5e,
    PHASER_DEPTH = 0x5f,
    DATA_INCREMENT = 0x60,
    DATA_DECREMENT = 0x61,
    NRPN_LSB = 0x62,
    NRPN_MSB = 0x63,
    RPN_LSB = 0x64,
    RPN_MSB = 0x65,
    ALL_SOUND_OFF = 0x78,
    RESET_ALL_CONTROLLERS = 0x79,
    LOCAL_CONTROL_ONOFF = 0x7a,
    ALL_NOTES_OFF = 0x7b,
    OMNI_OFF = 0x7c,
    OMNI_ON = 0x7d,
    MONO_ON = 0x7e,
    POLY_ON = 0x7f
}

/**
 * RPN(Registered Parameter Number)
 * 각각의 값은 (msb * 0xff + lsb) 형태
 */
// 이름 = 0xmsblsb, 이름 = 0xmsblsb, ......
export enum RPN {
    PITCH_BEND_SENSITIVITY = 0x0000,
    CHANNEL_FINE_TUNING = 0x0001,
    CHANNEL_COARSE_TUNING = 0x0002,
    TUNING_PROGRAM_CHANGE = 0x0003,
    TUNING_BANK_SELECT = 0x0004,
    MODULATION_DEPTH_RANGE = 0x0005,
    MPE_CONFIGURATION = 0x0006,
    AZIMUTH_ANGLE = 0x3d00,
    ELEVATION_ANGLE = 0x3d01,
    GAIN = 0x3d02,
    DISTANCE_RATIO = 0x3d03,
    MAXIMUM_DISTANCE = 0x3d04,
    GAIN_AT_MAXIMUM_DISTANCE = 0x3d05,
    REFERENCE_DISTANCE_RATIO = 0x3d06,
    PAN_SPREAD_ANGLE = 0x3d07,
    ROLL_ANGLE = 0x3d08,
    NULL = 0x7f7f
}