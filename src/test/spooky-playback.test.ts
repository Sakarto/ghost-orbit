import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

describe("gesture-unlocked buffer playback", () => {
  it("resumes and primes synchronously before the resume promise resolves", async () => {
    let finish: (() => void) | undefined;
    const source = { buffer: null, connect: vi.fn(), start: vi.fn(), disconnect: vi.fn(), onended: null };
    const resume = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    const context = { state: "suspended", sampleRate: 48000, destination: {}, resume,
      createBufferSource: () => source, createBuffer: vi.fn(() => ({})) };
    vi.stubGlobal("AudioContext", class { constructor() { return context; } });
    const { unlockSpookyAudio } = await import("@/lib/spooky-audio");
    const pending = unlockSpookyAudio();
    expect(resume).toHaveBeenCalledOnce();
    expect(source.start).toHaveBeenCalledOnce();
    expect(source.connect).toHaveBeenCalledWith(context.destination);
    context.state = "running";
    finish?.();
    await pending;
  });

  it("decodes returned MP3 bytes directly without creating an HTML audio element", async () => {
    const buffer = { length: 48000 };
    const decode = vi.fn(async () => buffer);
    vi.stubGlobal("AudioContext", class { decodeAudioData = decode; });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(new Uint8Array([73, 68, 51]))));
    const audio = vi.fn();
    vi.stubGlobal("Audio", audio);
    const { decodeGhostTransmission } = await import("@/lib/spooky-audio");
    expect(await decodeGhostTransmission("data:audio/mpeg;base64,SUQz")).toBe(buffer);
    expect(new Uint8Array(decode.mock.calls[0]?.[0] as unknown as ArrayBuffer)).toEqual(new Uint8Array([73, 68, 51]));
    expect(audio).not.toHaveBeenCalled();
  });

  it("exposes decoding errors rather than returning a playable recording", async () => {
    vi.stubGlobal("AudioContext", class { decodeAudioData = vi.fn(async () => { throw new Error("Invalid MP3"); }); });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("invalid")));
    const { decodeGhostTransmission } = await import("@/lib/spooky-audio");
    await expect(decodeGhostTransmission("data:audio/mpeg;base64,SUQz"))
      .rejects.toThrow("George's recording could not be decoded: Invalid MP3");
  });
});