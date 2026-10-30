import { describe, expect, it } from "vitest";
import { GHOST_PLAYBACK_RATE, GHOST_VOICE_SETTINGS, VOICE_IDS } from "@/lib/ghost-voice-config";

describe("haunted voice tuning", () => {
  it("slows playback to 0.86", () => {
    expect(GHOST_PLAYBACK_RATE).toBe(0.86);
  });
  it("sets unstable spirit delivery within the requested 0.20–0.25 range", () => {
    expect(GHOST_VOICE_SETTINGS.stability).toBe(0.22);
  });
  it("defaults to George and includes Roger", () => {
    expect(VOICE_IDS[0]).toBe("JBFqnCBsd6RMkjVDRZzb");
    expect(VOICE_IDS).toContain("CwhRBWXzGAHq8TQ4Fs17");
  });
});