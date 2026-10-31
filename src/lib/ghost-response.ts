/** Failed provider payloads must never be encoded or played as audio. */
export async function readGhostAudio(response: Response): Promise<{ audio: string | null; reason: string; status: number }> {
  if (!response.ok) {
    const reason = await response.text();
    console.error(`ElevenLabs failed [${response.status}]: ${reason}`);
    return { audio: null, reason, status: response.status };
  }
  if (!response.headers.get("content-type")?.startsWith("audio/")) {
    const reason = await response.text();
    console.error(`ElevenLabs returned non-audio [${response.status}]: ${reason}`);
    return { audio: null, reason: reason || "ElevenLabs returned no audio.", status: response.status };
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) return { audio: null, reason: "ElevenLabs returned empty audio.", status: response.status };
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { audio: btoa(bin), reason: "ok", status: response.status };
}

/** Fail visibly rather than substituting an unrelated browser narrator. */
export function requireGhostAudio(result: { audio: string | null; reason: string; status: number }): string {
  if (!result.audio) throw new Error(`George transmission failed [${result.status}]: ${result.reason}`);
  return `data:audio/mpeg;base64,${result.audio}`;
}