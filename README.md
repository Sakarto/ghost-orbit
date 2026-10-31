# 👻 Ghost Orbit
**Earth's orbit is haunted — and we're running out of space.**

Ghost Orbit is an interactive 3D globe that shows real space debris as ghosts, at their real positions, moving in real time. Click a ghost and it tells you how it died.

Built solo at **LancerHacks 2026** (Pasadena City College), theme: *Space*.

🔗 **Live demo:** [PASTE LIVE URL]
🎥 **Video:** [PASTE VIDEO URL]

## Features
- **1,300+ real orbital objects** from the 2009 Cosmos–Iridium collision, the 2007 Fengyun-1C anti-satellite test, and intact "zombie" satellites like Vanguard 1 and Telstar 1
- **Real-time orbital physics** using SGP4 propagation on CelesTrak TLE data
- **Ghost Radar:** filter intact dead satellites vs. collision shrapnel
- **The Haunted Zone:** an altitude histogram showing the most crowded orbital band, with sourced ESA debris figures
- **Near-Miss Detector:** predicts the 5 closest debris-on-debris approaches in the next hour (miss distance, time, relative speed) in a Web Worker
- **Haunted transmissions:** Claude writes a fact-locked first-person ghost story, and ElevenLabs voices it through a custom Web Audio "haunted radio" filter

## How it works
CelesTrak TLEs → SGP4 (satellite.js) → 3D globe + near-miss scan (Web Worker)
Verified facts → Claude (Anthropic API) → ElevenLabs TTS → Web Audio filter chain

The near-miss scan propagates every object in 60-second steps over the next hour and records each pair's minimum separation. Pairs are pruned by sorting on altitude and only comparing objects within 10 km in height.

## Tech stack
TypeScript · React · TanStack Start · Vite · Tailwind · globe.gl / Three.js · satellite.js · Anthropic Claude API · ElevenLabs API · Web Audio API · Web Workers · Vitest · Lovable

## Run locally
```bash
bun install
bun run dev
```
Set `ANTHROPIC_API_KEY` and `ELEVENLABS_API_KEY` as environment variables to enable stories and voices.

## Data sources
- Orbital elements: [CelesTrak](https://celestrak.org)
- Debris population figures: [ESA Space Debris](https://www.esa.int/Space_Safety/Space_Debris)
