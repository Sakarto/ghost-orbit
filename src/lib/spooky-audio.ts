// Synthesized Halloween sound effects (no audio files): a radio-static burst, a spectral chime,
// and a faint cosmic wind/drone that loops while a ghost speaks.

let ctx: AudioContext | null = null;
function ac() {
  if (typeof window === "undefined") return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
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
