// Credit: https://github.com/razh/js13k-2016/blob/master/src/audio.js

const { AudioContext, OfflineAudioContext } = window;
const audioContext = new AudioContext();
const sampleRate = audioContext.sampleRate;

/** e.g. 69 (a4) --> 440 */
function toFreq(note: number) {
  return Math.pow(2, (note - 69) / 12) * 440;
}

//////////////////////////////
// Playback
//////////////////////////////

function playSound(
  sound: AudioBuffer,
  delay?: number,
  destination?: AudioDestinationNode,
) {
  destination = destination || audioContext.destination;

  let source = audioContext.createBufferSource();
  source.buffer = sound;
  source.connect(destination);
  source.start(delay ? audioContext.currentTime + delay : 0);
}

function playSoundArray(destination: AudioDestinationNode) {
  return (array: any[]) => {
    array.map((note) => {
      let sound = note[0];
      let delay = note[1];
      playSound(sound, delay, destination);
    });
  };
}

function generateAudioBuffer(
  fn: (a: number, b: number, _: Float32Array) => number,
  duration: number,
  volume: number,
) {
  // Convert duration to samples.
  const length = duration * sampleRate;

  let buffer = audioContext.createBuffer(1, length, sampleRate);
  let channel = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    channel[i] = fn(i / sampleRate, i, channel) * volume;
  }

  return buffer;
}

// prettier-ignore
const noteNames = ['c', 'cs', 'd', 'ds','e','f','fs', 'g', 'gs', 'a', 'as', 'b']

/** e.g. 69 --> "a4"  */
function toNoteString(note: number) {
  let name = noteNames[note % 12];
  let octave = Math.floor(note / 12) - 1;
  return name + octave;
}

/** For a given instrument, generates an object containing all notes indexed with their name and octave, from A1 (27) to A7 (105). */
function generateNotes(fn, duration, volume) {
  const notes: Record<string, AudioBuffer> = {};

  function createNoteProperty(note: number) {
    let sound: AudioBuffer;

    let descriptor = {
      get: function () {
        if (!sound) {
          sound = generateAudioBuffer(fn(toFreq(note)), duration, volume);
        }

        return sound;
      },
    };

    Object.defineProperty(notes, note, descriptor);
    Object.defineProperty(notes, toNoteString(note), descriptor);
  }

  for (let i = 21; i <= 105; i++) {
    createNoteProperty(i);
  }

  return notes;
}

//////////////////////////////
// Audio pipeline
//////////////////////////////

const wet = audioContext.createGain();
wet.gain.value = 0.5;
wet.connect(audioContext.destination);

const dry = audioContext.createGain();
wet.gain.value = 1 - wet.gain.value;
wet.connect(audioContext.destination);

const master = audioContext.createGain();
master.gain.value = 0.8;
master.connect(dry);

//////////////////////////////
// Instruments
//////////////////////////////

const sin = (f: number) => (t: number) => Math.sin(t * 2 * Math.PI * f);

const decay = (d) => () => (t: number) => Math.exp(-t * d);

const add = (a, b) => (f) => {
  let af = a(f);
  let bf = b(f);

  return (t: number) => af(t) + bf(t);
};

const mul = (a, b) => (f) => {
  let af = a(f);
  let bf = b(f);

  return (t: number) => af(t) * bf(t);
};

const W = 1;
const P = W / 3;
const H = W / 2;
const Q = H / 2;
const E = Q / 2;
const S = E / 2;
const T = S / 2;

const kick = generateNotes(mul(sin, decay(64)), 0.5, 0.5);
const syn = generateNotes(mul(sin, decay(32)), 1, 1);
const syn2 = generateNotes(mul(sin, decay(8)), 1, 1);
const syn3 = generateNotes(mul(sin, decay(2)), 4, 1);

export function playSynth() {
  playSound(syn.a4, 0, audioContext.destination);
}

const M1 = [
  [syn.d4, H],
  [syn.fs4, H],
  [syn.a4, H],
  [syn.d5, H + Q],
  [syn.fs5, H + Q],
  [syn.a5, H + Q],
  [syn.cs5, H + 2 * Q],
  [syn.fs5, H + 2 * Q],
  [syn.a5, H + 2 * Q],
  [syn.d5, H + 4 * Q],
  [syn.g5, H + 4 * Q],
  [syn.b5, H + 4 * Q],
];

const M2 = [
  [syn.d4, H],
  [syn.fs4, H],
  [syn.a4, H],
  [syn.d5, H + Q],
  [syn.fs5, H + Q],
  [syn.a5, H + Q],
  [syn.cs5, H + 2 * Q],
  [syn.fs5, H + 2 * Q],
  [syn.a5, H + 2 * Q],
  [syn.d5, H + 4 * Q],
  [syn.g5, H + 4 * Q],
  [syn.b5, H + 4 * Q],
  [syn.d5, 2 * H + Q],
  [syn.g5, 2 * H + Q],
  [syn.a5, 2 * H + Q],
  [syn.b4, 2 * H + 2 * Q],
  [syn.d5, 2 * H + 2 * Q],
  [syn.g5, 2 * H + 2 * Q],
];

type Note = AudioBuffer;
type Duration = number;

const triplets = (arr: Note[]) =>
  arr.map((note, i) => [note, Math.floor(i / 3) * W + (i % 3) * P]);

const quarters = (arr: (Note | undefined)[]) =>
  arr.flatMap((note, i) =>
    note ? [[note, Math.floor(i / 4) * W + (i % 4) * Q]] : [],
  );

export const M3 = [
  ...triplets([
    syn.e4,
    syn.g4,
    syn.b4,

    syn.ds5,
    syn.c5,
    syn.b4,

    syn.g4,
    syn.b4,
    syn.e5,

    syn.g5,
    syn.e5,
    syn.b4,

    syn.gs4,
    syn.f5,
    syn.e5,

    syn.d5,
    syn.b4,
    syn.gs4,

    syn.a4,
    syn.c5,
    syn.e5,

    syn.a5,
    syn.fs5,
    syn.e5,

    syn.ds5,
    syn.fs5,
    syn.e5,

    syn.ds5,
    syn.b4,
    syn.a4,

    syn.g4,
    syn.b4,
    syn.ds5,

    syn.e5,
    syn.b4,
    syn.e4,

    syn.a4,
    syn.c5,
    syn.e5,

    syn.as4,
    syn.cs5,
    syn.e5,

    syn.b4,
    syn.c5,
    syn.b4,

    syn.a4,
    syn.g4,
    syn.fs4,
  ]),

  [syn.e5, 0 * W],
  [syn.fs5, 1 * W],
  [syn.b5, 2 * W],

  [syn.b5, 4 * W],
  [syn.e6, 5 * W],
  [syn.b5, 5 * W + 2 * P],
  [syn.c6, 6 * W],

  [syn.b5, 8 * W],
  [syn.c6, 8 * W + 2 * P],
  [syn.b5, 9 * W],
  [syn.c6, 9 * W + 2 * P],
  [syn.b5, 10 * W],
  [syn.a5, 10 * W + 2 * P],
  [syn.g5, 11 * W],

  [syn.fs5, 12 * W],
  [syn.g5, 12 * W + 2 * P],
  [syn.fs5, 13 * W],
  [syn.g5, 13 * W + 2 * P],
  [syn.fs5, 14 * W],
  [syn.b5, 15 * W],
];
const M4_a = [
  syn.g4,
  syn.b4,
  syn.e4,
  syn.b4,

  syn.d4,
  syn.d5,
  syn.g4,
  syn.d5,

  syn.gs4,
  syn.d5,
  syn.e4,
  syn.d5,

  syn.a4,
  syn.c5,
  syn.g4,
  syn.ds5,

  syn.fs4,
  syn2.d4,
  syn2.e4,
  syn2.fs4,

  syn2.g4,
];

const M4_b = [
  syn.d5,
  ,
  syn.g5,
  syn.g5,

  syn2.a5,
  ,
  syn2.b5,
  ,
  syn2.e6,
  ,
  syn.b5,
  syn.e6,

  syn.c6,
  syn.e6,
  syn.a5,
  ,
  syn2.d6,
  ,
  syn2.cs6,
  syn2.c6,

  syn2.b5,
];

export const M4 = [
  ...quarters([
    ...M4_a,
    syn2.d5,
    syn.b4,
    syn.g4,

    syn.c5,
    syn.e5,
    syn.cs5,
    syn.e5,

    syn.d5,
    syn.a4,
    syn.fs4,
    syn.d4,

    ...M4_a,
    syn.b5,
    syn.g5,
    syn.e5,

    syn.c5,
    syn.a4,
    syn.fs4,
    syn.d4,

    ,
    syn.d4,
    syn.g4,
    ,
  ]),

  ...quarters([
    ...M4_b,
    ,
    syn2.d6,
    ,
    syn.a5,
    syn.b5,
    syn.a5,
    syn.g5,

    syn.fs5,
    syn.a5,
    syn.d5,
    ,
    ...M4_b,
    syn.d6,
    syn.b5,
    syn.g5,

    syn.e5,
    syn.c5,
    syn.a4,
    syn.b4,

    syn2.a4,
    ,
    syn2.g4,
  ]),
];

const M5_a = [
  syn.d4,
  syn.fs4,
  syn.e4,
  syn.g4,
  syn.fs4,
  syn.a4,
  syn.cs4,
  syn.a4,
  syn.d4,
  syn2.a4,
  syn2.g4,
  syn2.fs4,
  syn2.e4,
  syn2.a4,
  syn.fs4,
  syn.d4,

  syn.cs4,
  syn.a4,
  syn.d4,
  syn.a4,
  syn.e4,
  syn.a4,
  syn.g4,
  syn.a4,

  syn.fs4,
  syn2.a4,
  syn2.d5,
  syn2.e5,
  syn2.fs5,
  syn2.e5,
  syn2.d5,
  syn2.a4,

  syn2.gs4,
  syn2.b4,

  syn2.e5,
  syn2.d5,
  syn2.cs5,
  syn2.a5,

  syn2.a4,
  syn2.g4,
  syn2.fs4,
  syn2.a4,

  syn2.d5,
  syn2.c5,
  syn2.b4,
  syn2.g5,
];

const M5_b = [
  syn3.d5,
  ,
  ,
  ,
  ,
  ,
  syn2.e5,
  ,
  syn2.fs5,
  ,
  syn2.e5,
  syn2.d5,
  syn2.cs5,

  ,
  syn2.d5,
  ,
  syn3.a5,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  ,
  syn3.b5,
  ,
  ,
  ,
  syn3.e5,

  ,
  ,
  ,
  syn3.a5,
  ,
  ,
  ,
  syn3.d5,
  ,
  ,
  ,
];
export const M5 = [
  ...quarters([
    ...M5_a,
    syn2.g4,
    syn2.fs4,
    syn2.e4,
    syn2.g4,

    syn2.cs5,
    syn2.b4,
    syn2.a4,
    syn2.g4,
    syn2.fs4,
    syn2.d4,

    syn.a4,
    ,
    ,
    ,
    ,
    ,
    ,
    ,
    ...M5_a,
    syn2.as4,
    syn2.g5,
    syn2.a4,
    syn2.fs5,
    syn2.g4,
    syn2.e5,
    syn2.fs4,
    syn2.d5,
    syn2.cs4,
    syn2.a4,

    syn2.d4,
    syn2.fs4,
    syn2.a4,
    syn2.cs5,
    syn2.d5,
    syn2.a4,
    syn2.fs4,
    syn2.d4,
  ]),

  ...quarters([
    ...M5_b,
    syn2.g5,
    ,
    ,
    ,
    syn2.fs5,
    syn2.e5,
    syn2.d5,
    syn2.fs5,
    syn.e5,
    syn2.b5,
    syn.a5,
    syn2.b5,
    syn2.a5,
    syn2.g5,
    syn2.fs5,
    syn2.e5,

    ...M5_b,
    syn2.d5,
    ,
    syn2.b4,
    ,
    syn2.a4,
    syn2.fs5,
    syn2.e5,
    syn2.cs5,
    syn2.d5,
    ,
  ]),
];

export function playMelody(m) {
  playSoundArray(audioContext.destination)(m);
}
