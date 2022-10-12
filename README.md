# yjmidi
midi file parser/player

## Usage
```js
const fs = require('fs');
const { MidiFile,MidiPlayer } = require('yjmidi');

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

/**
 * Playing midi files
 */
let player = new MidiPlayer(); // MidiPlayer instance
player.loadMidi(midi); // loading a midi file

player.on('midievent',(event,portnum,message) => {
    event; // information of event
    portnum; // port number
    message; // midi message. if it is null, this event is meta event
});

player.play();
player.pause();

player.tempo; // similar to HTMLMediaElement.playbackRate
player.durationTick; // same as MidiFile.header.durationTick
player.durationMs; // same as MidiFile.header.durationMs
player.currentTick;
player.currentMs;

let buf2 = fs.readFileSync('....'); // another midi file
let midi3 = new MidiFile(buf2);
player.loadMidi(midi3); // insert an instance of MidiFile

player.play();
```