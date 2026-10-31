import { describe, expect, it } from "vitest";
import { GHOST_PLAYBACK_RATE, GHOST_VOICE_SETTINGS, VOICE_IDS } from "@/lib/ghost-voice-config";

describe("haunted voice tuning", () => {
  it("slows playback to 0.86", () => {
    expect(GHOST_PLAYBACK_RATE).toBe(0.86);
  });
  it("sets unstable spirit delivery within the requested 0.20–0.25 range", () => {
    expect(GHOST_VOICE_SETTINGS.stability).toBe(0.22);
  });
  it("allows only George", () => {
    expect(VOICE_IDS).toEqual(["JBFqnCBsd6RMkjVDRZzb"]);
  });
  it("uses supported ElevenLabs settings and a valid speech speed", () => {
    expect(GHOST_VOICE_SETTINGS).toEqual({
      stability: 0.22,
      similarity_boost: 0.75,
      style: 0.8,
      use_speaker_boost: true,
      speed: 0.85,
    });
    expect(GHOST_VOICE_SETTINGS.speed).toBeGreaterThanOrEqual(0.7);
    expect(GHOST_VOICE_SETTINGS.speed).toBeLessThanOrEqual(1.2);
  });
});