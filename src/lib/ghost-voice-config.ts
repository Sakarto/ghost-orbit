export const GHOST_VOICES = [
  { id: "JBFqnCBsd6RMkjVDRZzb", label: "George / Graveyard Phantom" },
] as const;

export const VOICE_IDS = [GHOST_VOICES[0].id] as const;
export const GHOST_PLAYBACK_RATE = 0.86;
export const GHOST_VOICE_SETTINGS = {
  stability: 0.22,
  similarity_boost: 0.75,
  style: 0.8,
  use_speaker_boost: true,
  speed: 0.85,
} as const;