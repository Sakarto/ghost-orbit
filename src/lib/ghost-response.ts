/** Failed provider payloads must never be encoded or played as audio. */
export async function readGhostAudio(response: Response): Promise<{ audio: string | null; reason: string }> {
  if (!response.ok) {
    const reason = await response.text();
    console.error(`ElevenLabs failed [${response.status}]: ${reason}`);
    return { audio: null, reason };
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return { audio: btoa(bin), reason: "ok" };
}