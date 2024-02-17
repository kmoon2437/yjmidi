# yjmidi
midi file parser/player

## Usage
CommonJS `require()` is not supported in version 3.0.0-rc1 or higher.
```ts
import fs from 'fs';
import { MidiFile, MidiPlayer } from 'yjmidi';

let midi = fs.readFileSync('...'); // your midi file. it can be an ArrayBuffer or Uint8Array or nodejs Buffer

let file = new MidiFile(midi); // MidiFile instance
file.header.format; // 0,1 or 2
file.header.ticksPerBeat; // If division is frames per seconds, this is null
file.header.tickResolution; // microseconds per tick
file.header.tracksCount; // n
file.durationTick; // duration in tick
file.durationMs; // duration in ms

file.tracks; // the tracks
file.tempoEvents; // "set tempo" events

/**
 * Playing midi files
 */
let player = new MidiPlayer(); // MidiPlayer instance
player.loadMidi(midi); // loading a midi file

player.on('midievent', (event, portnum, message) => {
    event; // information of the event
    portnum; // port number
    message; // midi message. if it is null, the 'event' may be a meta event
});

player.play();
player.pause();

player.tempo; // similar to HTMLMediaElement.playbackRate
player.durationTick; // same as MidiFile.durationTick
player.durationMs; // same as MidiFile.durationMs
player.currentTick;
player.currentMs;

let buf2 = fs.readFileSync('....'); // another midi file
let midi3 = new MidiFile(buf2);
player.loadMidi(midi3); // insert an instance of MidiFile

player.play();
```