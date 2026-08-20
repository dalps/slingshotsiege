// Credit: https://github.com/razh/js13k-2016/blob/master/src/audio.js

const { AudioContext, OfflineAudioContext } = window;
const audioContext = new AudioContext();
const sampleRate = audioContext.sampleRate;

/** e.g. 69 (a4) --> 440 */
function toFreq(note: number) {
  return Math.pow(2, (note - 69) / 12) * 440;
}

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
  const notes = {};

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
const H = W / 2;
const Q = H / 2;
const E = Q / 2;
const S = E / 2;
const T = S / 2;

const kick = generateNotes(mul(sin, decay(64)), 0.5, 0.5);
const syn = generateNotes(mul(sin, decay(32)), 1, 1);

export function playSynth() {
  playSound(syn.a4, 0, audioContext.destination);
}
