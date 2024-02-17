import fs from 'fs';
import { MidiFile } from './index.js';

let mfile = new MidiFile(fs.readFileSync(new URL('../test/girlsLegendU.mid', import.meta.url)));

console.log(mfile)