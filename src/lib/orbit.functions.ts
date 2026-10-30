import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { EVENT_META, ZOMBIES, type EventKey } from "@/lib/events";
import fallback from "@/data/fallback-tle.json";

export type RawTle = { name: string; l1: string; l2: string; source: string };

const GROUPS = [
  { key: "cosmos-2251-debris", q: "GROUP=cosmos-2251-debris" },
  { key: "iridium-33-debris", q: "GROUP=iridium-33-debris" },
  { key: "1999-025", q: "INTDES=1999-025" },
  { key: "derelict", q: "CATNR=5" },
  { key: "derelict", q: "CATNR=27386" },
  { key: "derelict", q: "CATNR=116" },
  { key: "derelict", q: "CATNR=340" },
  { key: "derelict", q: "CATNR=10684" },
  { key: "derelict", q: "CATNR=13603" },
  { key: "derelict", q: "CATNR=11" },
];
const MAX_PER_GROUP = 600;

// CelesTrak rate-limits repeat downloads, so keep each live copy for 2 hours.
let cache: { at: number; data: { objects: RawTle[]; live: boolean } } | null = null;

export const getDebris = createServerFn({ method: "GET" }).handler(async () => {
  if (cache && Date.now() - cache.at < 2 * 3600_000) return cache.data;
  const all: RawTle[] = [];
  let live = 0;
  for (const g of GROUPS) {
    try {
      const res = await fetch(`https://celestrak.org/NORAD/elements/gp.php?${g.q}&FORMAT=tle`, {
        headers: { "User-Agent": "GhostOrbit/1.0" },
      });
      if (!res.ok) throw new Error(String(res.status));
      const lines = (await res.text()).trim().split(/\r?\n/).map((l) => l.trimEnd());
      const items: RawTle[] = [];
      for (let i = 0; i + 2 < lines.length + 1 && items.length < MAX_PER_GROUP; i += 3) {
        if (!lines[i + 1]?.startsWith("1 ") || !lines[i + 2]?.startsWith("2 ")) continue;
        items.push({ name: (lines[i] ?? "").trim(), l1: lines[i + 1]!, l2: lines[i + 2]!, source: g.key });
      }
      if (!items.length) throw new Error("empty");
      all.push(...items);
      live++;
    } catch {
      all.push(
        ...(fallback as RawTle[]).filter(
          (f) => f.source === g.key && (g.key !== "derelict" || Number(f.l1.slice(2, 7)) === Number(g.q.split("=")[1])),
        ),
      );
    }
  }
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
    const key = process.env['LOVABLE_API_KEY'];
    if (!key) throw new Error("AI is not configured");
    const z0 = data.source === "derelict" ? ZOMBIES[String(Number(data.norad))] : undefined;
    const ev = z0 ?? EVENT_META[data.source as EventKey];
    if (!ev.facts) throw new Error("This ghost's history is unknown.");
    const prompt = `You are the restless ghost of one fragment of space debris, speaking to the living on Halloween night.

STRICT HISTORICAL FACTS — use only these, never invent or contradict them:
${ev.facts}
${ev.forbid}
${z0 ? "I am still in one piece, a whole dead spacecraft." : `I am fragment number ${data.norad} of that wreck.`} Today I race around Earth at about 27,000 km/h, ${Math.round(data.altitudeKm)} km up, circling every ~100 minutes, trapped in a cold cosmic purgatory among thousands of dead things, a threat to every living satellite that passes.

Write a 70-90 word first-person ghost story. Heavy Halloween horror mood: cold, endless circling, an eternal haunt above Earth, a chilling warning to the living. Make it crystal clear (1) who I was in life, (2) exactly how I died, per the facts above, (3) how I haunt orbit today.

This text is read aloud by a voice engine, so write ONLY natural spoken English sentences. Absolutely no sound effects or onomatopoeia (no "shhh", "ssshhk", "bzzt", "crackle", "hiss"), no asterisks or stage directions, no stretched letters, no ellipses chains, no emojis, no acronyms. Plain text, no title.`;
    const res = await fetch("https://ai.gateway.lovable.dev/v1/messages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "anthropic/claude-sonnet-5",
        max_tokens: 1024,
        stream: true,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok || !res.body) {
      const body = await res.text();
      if (res.status === 429) throw new Error("The spirits are busy — try again in a moment.");
      if (res.status === 402) throw new Error("Out of AI credits. Add credits in workspace settings.");
      throw new Error(`Story failed [${res.status}]: ${body.slice(0, 200)}`);
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
    return { text: clean };
  });

/** ElevenLabs voice. Returns audio:null when no key is set so the browser voice can take over. */
export const ghostVoice = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ text: z.string().min(1).max(1500) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["ELEVENLABS_API_KEY"];
    if (!key) return { audio: null as string | null, reason: "no-key" };
    const res = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb?output_format=mp3_44100_128",
      {
        method: "POST",
        headers: { "xi-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify({
          text: data.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: { stability: 0.35, similarity_boost: 0.75, style: 0.6, use_speaker_boost: true, speed: 0.85 },
        }),
      },
    );
    if (!res.ok) {
      console.error(`ElevenLabs failed [${res.status}]: ${(await res.text()).slice(0, 300)}`);
      return { audio: null as string | null, reason: `elevenlabs-${res.status}` };
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { audio: btoa(bin), reason: "ok" };
  });
