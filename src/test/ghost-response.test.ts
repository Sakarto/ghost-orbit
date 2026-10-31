import { describe, expect, it, vi } from "vitest";
import { readGhostAudio, requireGhostAudio } from "@/lib/ghost-response";

describe("ElevenLabs failures", () => {
  it.each([401, 402, 422, 429])("returns no audio and the original error body for status %i", async (status) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const body = `provider error ${status}`;
    expect(await readGhostAudio(new Response(body, { status }))).toEqual({ audio: null, reason: body, status });
    log.mockRestore();
  });
  it("rejects failed George audio instead of substituting a narrator", () => {
    expect(() => requireGhostAudio({ audio: null, reason: "Invalid voice_settings", status: 422 }))
      .toThrow("George transmission failed [422]: Invalid voice_settings");
  });
  it("turns successful George audio into a playable data URI", async () => {
    const response = new Response(new Uint8Array([73, 68, 51]), { headers: { "Content-Type": "audio/mpeg" } });
    expect(requireGhostAudio(await readGhostAudio(response))).toBe("data:audio/mpeg;base64,SUQz");
  });
  it("rejects a successful HTTP response containing an error document", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await readGhostAudio(new Response('{"error":"not audio"}', { headers: { "Content-Type": "application/json" } }));
    expect(result.audio).toBeNull();
    expect(() => requireGhostAudio(result)).toThrow('not audio');
    log.mockRestore();
  });
});