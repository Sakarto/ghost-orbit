import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ZOMBIES } from "@/lib/events";
import fallback from "@/data/fallback-tle.json";
import { GHOST_VOICE_SETTINGS, VOICE_IDS } from "@/lib/ghost-voice-config";
import { readGhostAudio } from "@/lib/ghost-response";
import { getGhostLore } from "@/lib/ghost-lore";

export type RawTle = { name: string; l1: string; l2: string; source: string };

const GROUPS = [
  { key: "cosmos-2251-debris", q: "GROUP=cosmos-2251-debris" },
  { key: "iridium-33-debris", q: "GROUP=iridium-33-debris" },
  { key: "1999-025", q: "INTDES=1999-025" },
  ...Object.keys(ZOMBIES).map((n) => ({ key: "derelict", q: `CATNR=${n}` })),
];
const MAX_PER_GROUP = 600;

// CelesTrak rate-limits repeat downloads, so keep each live copy for 2 hours.
let cache: { at: number; data: { objects: RawTle[]; live: boolean } } | null = null;

export const getDebris = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < 2 * 3600_000) return cache.data;
  // Fetch every group in parallel with a short timeout so a slow or blocking source never stalls the page.
  const results = await Promise.all(
    GROUPS.map(async (g) => {
      try {
        const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?${g.q}&FORMAT=tle`, {
          headers: { "User-Agent": "GhostOrbit/1.0" },
          signal: AbortSignal.timeout(6000),
        });
        if (!res.ok) throw new Error(String(res.status));
        const lines = (await res.text()).trim().split(/\r?\n/).map((l) => l.trimEnd());
        const items: RawTle[] = [];
        for (let i = 0; i + 2 < lines.length + 1 && items.length < MAX_PER_GROUP; i += 3) {
          if (!lines[i + 1]?.startsWith("1 ") || !lines[i + 2]?.startsWith("2 ")) continue;
          items.push({ name: (lines[i] ?? "").trim(), l1: lines[i + 1]!, l2: lines[i + 2]!, source: g.key });
        }
        if (!items.length) throw new Error("empty");
        return { items, live: true };
      } catch {
        const items = (fallback as RawTle[]).filter(
          (f) =>
            f.source === g.key && (g.key !== "derelict" || Number(f.l1.slice(2, 7)) === Number(g.q.split("=")[1])),
        );
        return { items, live: false };
      }
    }),
  );
  const all = results.flatMap((r) => r.items);
  const live = results.filter((r) => r.live).length;
  const data = { objects: all, live: live === GROUPS.length };
  if (data.live) cache = { at: Date.now(), data };
  return data;
});

export const ghostStory = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z
      .object({
        name: z.string().max(100),
        norad: z.string().max(10),
        origin: z.string().max(100),
        altitudeKm: z.number(),
        launchYear: z.string().max(10),
        source: z.enum(["cosmos-2251-debris", "iridium-33-debris", "1999-025", "derelict"]),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    // Prefer the user's own Anthropic key when present; otherwise use the built-in AI gateway.
    const anthropicKey = process.env["ANTHROPIC_API_KEY"];
    const key = process.env["LOVABLE_API_KEY"];
    if (!anthropicKey && !key) throw new Error("AI is not configured");
    const z0 = data.source === "derelict" ? ZOMBIES[String(Number(data.norad))] : undefined;
    const ev = getGhostLore(data.source, data.norad);
    const prompt = `You are a terrifying, exhausted satellite spirit speaking through a haunted radio transmission on Halloween night, not a polished documentary narrator. Your voice is intimate, broken, pleading, then quietly threatening: short breathless sentences, unsettling silences, and dread rather than theatrical exposition.

STRICT HISTORICAL FACTS — use only these, never invent or contradict them:
${ev.facts}
${ev.forbid}
${z0 ? "I am still in one piece, a whole dead spacecraft." : `I am fragment number ${data.norad} of that wreck.`} Today I race around Earth at about 27,000 km/h, ${Math.round(data.altitudeKm)} km up, circling every ~100 minutes, trapped in a cold cosmic purgatory among thousands of dead things, a threat to every living satellite that passes.

Write a 70-90 word first-person ghost story. Begin with an eerie spoken transmission preamble, such as "Can anyone hear me down there? It is so cold... drifting through the dark." Use suspenseful punctuation and occasional single ellipses for natural pauses. Heavy, spine-chilling Halloween horror: the freezing void, an eternity drifting alone in the dark above Earth, a voice trapped between worlds, a growing graveyard of the dead. End with a chilling warning to the living about the chain reaction scientists fear, where each crash makes more ghosts until the sky is a minefield (you may name it Kessler syndrome). Make it crystal clear (1) who I was in life, (2) exactly how I died, per the facts above, (3) how I haunt orbit today.

Weave in two or three vivid cosmic-horror or paranormal electronic-voice metaphors: a freezing thermosphere tomb, phantom telemetry, severed copper nerves, drifting through black nothingness, or wailing solar winds. These are haunted subjective imagery, NOT scientific claims: space carries no audible wind, the thermosphere is not literally freezing, and intact spacecraft must not acquire invented severed wires, explosions, or collision damage. Match any damage imagery to the documented demise. Make the satellite's actual mission and death unmistakable beneath the horror. Never write the acronym EVP or read performance instructions aloud.

This text is read aloud by a voice engine, so write ONLY natural spoken English sentences. Absolutely no sound effects or onomatopoeia (no "shhh", "ssshhk", "bzzt", "crackle", "hiss"), no asterisks or stage directions, no stretched letters, no ellipses chains, no emojis, no acronyms. Plain text, no title.`;
    const body = JSON.stringify({
      model: anthropicKey ? "claude-opus-5-5" : "anthropic/claude-sonnet-5",
      max_tokens: anthropicKey ? 16000 : 1024,
      ...(anthropicKey ? { output_config: { effort: "medium" } } : {}),
      stream: true,
      messages: [{ role: "user", content: prompt }],
    });
    const res = anthropicKey
      ? await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
          body,
        })
      : await fetch("https://ai.gateway.lovable.dev/v1/messages", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
          body,
        });
    if (!res.ok || !res.body) {
      const errBody = await res.text();
      if (res.status === 429) throw new Error("The spirits are busy — try again in a moment.");
      if (res.status === 402) throw new Error("Out of AI credits. Add credits in workspace settings.");
      throw new Error(`Story failed [${res.status}]: ${errBody.slice(0, 200)}`);
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    let refused = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split("\n");
      buf = parts.pop() ?? "";
      for (const line of parts) {
        if (!line.startsWith("data:")) continue;
        try {
          const ev = JSON.parse(line.slice(5).trim());
          if (ev.type === "content_block_delta" && ev.delta?.type === "text_delta") text += ev.delta.text;
          if (ev.type === "message_delta" && ev.delta?.stop_reason === "refusal") refused = true;
          if (ev.type === "error") throw new Error(ev.error?.message ?? "Stream error");
        } catch (e) {
          if (e instanceof Error && e.message !== "" && !(e instanceof SyntaxError)) throw e;
        }
      }
    }
    if (refused) throw new Error("This ghost refuses to speak.");
    const clean = text
      .replace(/\*[^*]*\*/g, "")
      .replace(/\b(s+h+k*|sh{2,}|bz+t|hi+ss+|crackle|kzzt)\b[.!,]*/gi, "")
      .replace(/(\w)\1{3,}/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();
    return { text: clean, model: anthropicKey ? "Claude Opus 5.5" : "Claude Sonnet 5" };
  });

/** ElevenLabs voice. Returns audio:null when no key is set so the browser voice can take over. */
export const ghostVoice = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ text: z.string().min(1).max(1500), voice: z.enum(VOICE_IDS).default(VOICE_IDS[0]) }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env["ELEVENLABS_API_KEY"];
    if (!key) return { audio: null as string | null, reason: "no-key" };
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${data.voice}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: data.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: GHOST_VOICE_SETTINGS,
        }),
      },
    );
    return readGhostAudio(res);
  });
