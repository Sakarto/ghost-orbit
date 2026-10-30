import { describe, expect, it, vi } from "vitest";
import { readGhostAudio } from "@/lib/ghost-response";

describe("ElevenLabs failures", () => {
  it.each([401, 402, 429])("returns no audio and the original error body for status %i", async (status) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const body = `provider error ${status}`;
    expect(await readGhostAudio(new Response(body, { status }))).toEqual({ audio: null, reason: body });
    log.mockRestore();
  });
});