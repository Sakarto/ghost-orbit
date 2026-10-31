// Synthesized Halloween sound effects (no audio files): a radio-static burst, a spectral chime,
// and a faint cosmic wind/drone that loops while a ghost speaks.
import { GHOST_PLAYBACK_RATE } from "@/lib/ghost-voice-config";

let ctx: AudioContext | null = null;
function ac() {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  return ctx;
}

/** Unlock on the button gesture, before waiting for story/voice requests. */
export async function unlockSpookyAudio() {
  const c = ac();
  if (!c) throw new Error("Audio processing is unavailable.");
  // Both resume and a silent source start happen on the original tap, before any await.
  const resumed = c.state === "running" ? Promise.resolve() : c.resume();
  const prime = c.createBufferSource();
  prime.buffer = c.createBuffer(1, 1, c.sampleRate);
  prime.connect(c.destination);
  prime.onended = () => prime.disconnect();
  prime.start();
  await resumed;
  if (c.state !== "running") throw new DOMException("Tap Play George's transmission to enable sound.", "NotAllowedError");
}

/** Decode once; cached buffers replay without a network request or a media element. */
export async function decodeGhostTransmission(src: string): Promise<AudioBuffer> {
  const c = ac();
  if (!c) throw new Error("Audio processing is unavailable.");
  const response = await fetch(src);
  if (!response.ok) throw new Error("George's recording could not be loaded.");
  return c.decodeAudioData(await response.arrayBuffer());
}

/** No clean audio bypass: every voice passes through the haunted radio graph. */
export function createGhostTransmission(buffer: AudioBuffer, onEnded: () => void = () => {}): () => void {
  const c = ac();
  if (!c) throw new Error("Audio processing is unavailable");
  if (c.state !== "running") throw new DOMException("Tap Play George's transmission to enable sound.", "NotAllowedError");
  // Buffer-source rate naturally lowers pitch as well; no HTML media autoplay token is needed.
  const source = c.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = GHOST_PLAYBACK_RATE;
  const highpass = c.createBiquadFilter();
  highpass.type = "highpass";
  highpass.frequency.value = 350;
  const lowpass = c.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = 3200;
  const tremolo = c.createGain();
  tremolo.gain.value = 0.85;
  const lfo = c.createOscillator();
  lfo.frequency.value = 4.3;
  const depth = c.createGain();
  depth.gain.value = 0.1;
  lfo.connect(depth).connect(tremolo.gain);

  const delay = c.createDelay(1);
  delay.delayTime.value = 0.18;
  const dampening = c.createBiquadFilter();
  dampening.type = "lowpass";
  dampening.frequency.value = 1800;
  const feedback = c.createGain();
  feedback.gain.value = 0.32;
  const echoMix = c.createGain();
  echoMix.gain.value = 0.28;
  const reverb = c.createConvolver();
  const impulse = noiseBuffer(c, 1.8);
  const samples = impulse.getChannelData(0);
  for (let i = 0; i < samples.length; i++) samples[i] = (samples[i] ?? 0) * (1 - i / samples.length) ** 3;
  reverb.buffer = impulse;
  const reverbMix = c.createGain();
  reverbMix.gain.value = 0.13;
  const output = c.createGain();
  output.gain.value = 0.8;

  source.connect(highpass).connect(lowpass).connect(tremolo);
  tremolo.connect(output);
  tremolo.connect(delay).connect(dampening).connect(feedback).connect(delay);
  delay.connect(echoMix).connect(output);
  tremolo.connect(reverb).connect(reverbMix).connect(output);
  output.connect(c.destination);
  lfo.start();
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    source.onended = null;
    source.stop();
    lfo.stop();
    [source, highpass, lowpass, tremolo, lfo, depth, delay, dampening, feedback, echoMix, reverb, reverbMix, output]
      .forEach((node) => node.disconnect());
  };
  source.onended = () => { stop(); onEnded(); };
  try {
    source.start();
  } catch (error) {
    stop();
    throw error;
  }
  return stop;
}

function noiseBuffer(c: AudioContext, seconds: number) {
  const buf = c.createBuffer(1, c.sampleRate * seconds, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

export function playStaticBurst() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, 1.2);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2200;
  bp.Q.value = 0.6;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.18, t + 0.05);
  // stuttering "tuning" flutter
  for (let i = 0; i < 8; i++) g.gain.setValueAtTime(i % 2 ? 0.04 : 0.16, t + 0.1 + i * 0.09);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
  src.connect(bp).connect(g).connect(c.destination);
  src.start(t);

  // spectral chime
  [880, 1318.5, 1760].forEach((f, i) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const og = c.createGain();
    og.gain.setValueAtTime(0, t + 0.6 + i * 0.12);
    og.gain.linearRampToValueAtTime(0.05, t + 0.65 + i * 0.12);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 3 + i * 0.12);
    o.connect(og).connect(c.destination);
    o.start(t + 0.6 + i * 0.12);
    o.stop(t + 3.2 + i * 0.12);
  });
}

/** Starts a faint eerie drone. Returns a stop function. */
export function startDrone(): () => void {
  const c = ac();
  if (!c) return () => {};
  const t = c.currentTime;
  const master = c.createGain();
  master.gain.setValueAtTime(0, t);
  master.gain.linearRampToValueAtTime(0.06, t + 2);
  master.connect(c.destination);

  const wind = c.createBufferSource();
  wind.buffer = noiseBuffer(c, 4);
  wind.loop = true;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 500;
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.15;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain).connect(lp.frequency);
  wind.connect(lp).connect(master);

  const tones = [55, 82.4, 110.6].map((f) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const og = c.createGain();
    og.gain.value = 0.25;
    o.connect(og).connect(master);
    o.start();
    return o;
  });
  wind.start();
  lfo.start();
  return () => {
    const n = c.currentTime;
    master.gain.cancelScheduledValues(n);
    master.gain.setValueAtTime(master.gain.value, n);
    master.gain.linearRampToValueAtTime(0, n + 1.5);
    setTimeout(() => {
      [wind, lfo, ...tones].forEach((s) => s.stop());
      master.disconnect();
    }, 1700);
  };
}
