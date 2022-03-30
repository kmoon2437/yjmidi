# yjmidi
midi/yjk file parser/player

## About yjk file
The yjk(**YJK**araoke) file is a file format created for use in [yj-karaoke-player](https://github.com/kmoon2437/yj-karaoke-player).

## Usage
```js
const fs = require('fs');
const { MidiFile,YJKFile,MidiPlayer,YJKFileConverter } = require('yjmidi');

let midi = fs.readFileSync('...'); // your midi file. it can be an ArrayBuffer or Uint8Array or nodejs Buffer

let file = new MidiFile(midi); // MidiFile instance
file.header.format; // 0,1 or 2
file.header.ticksPerBeat; // If division is frames per seconds, this is null
file.header.tickResolution; // microseconds per tick
file.header.tracksCount; // n
file.header.durationTick; // duration in tick
file.header.durationMs; // duration in ms

file.ports; // the tracks separated by port
file.tempoEvents; // "set tempo" events

let yjk = fs.readFileSync('...'); // your yjk file. it can be an ArrayBuffer or Uint8Array or nodejs Buffer

let file2 = new YJKFile(yjk); // YJKFile instance
file2.header; // similar to MidiFile.header

file2.globalEvents; // global events
file2.tempoEvents; // "set tempo" events
file2.ports; // the tracks separated by port

let midi2 = fs.readFileSync('...'); // your midi file. it can be an ArrayBuffer or Uint8Array or nodejs Buffer
fs.writeFileSync('./test.yjk',YJKFileConverter.midi2yjk(midi2));

/**
 * Playing midi/yjk files
 */
let player = new MidiPlayer(); // MidiPlayer instance
player.loadMidi(midi); // loading a midi file
player.loadYJK(yjk); // loading a yjk file

player.on('midievent',(event,portnum,message) => {
    event; // information of event
    portnum; // port number
    message; // midi message. if it is null, this event is meta event
});

player.play();
player.pause();

player.tempo; // similar to HTMLMediaElement.playbackRate
player.durationTick; // same as MidiFile.header.durationTick and YJKFile.header.durationTick
player.durationMs; // same as MidiFile.header.durationMs and YJKFile.header.durationMs
player.currentTick;
player.currentMs;

let buf2 = fs.readFileSync('....'); // another midi file
let midi3 = new MidiFile(buf2);
player.loadMidi(midi3); // insert an instance of MidiFile

player.play();
```

## Others
This library is using [midifile](https://github.com/nfroidure/midifile) to parse midi files.