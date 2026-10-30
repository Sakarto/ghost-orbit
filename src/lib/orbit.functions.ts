import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import fallback from "@/data/fallback-tle.json";

export type RawTle = { name: string; l1: string; l2: string; source: string };

const GROUPS = [
  { key: "cosmos-2251-debris", q: "GROUP=cosmos-2251-debris" },
  { key: "iridium-33-debris", q: "GROUP=iridium-33-debris" },
  { key: "1999-025", q: "INTDES=1999-025" },
];
const MAX_PER_GROUP = 600;

export const getDebris = createServerFn({ method: "GET" }).handler(async () => {
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
        items.push({ name: lines[i].trim(), l1: lines[i + 1], l2: lines[i + 2], source: g.key });
      }
      if (!items.length) throw new Error("empty");
      all.push(...items);
      live++;
    } catch {
      all.push(...(fallback as RawTle[]).filter((f) => f.source === g.key));
    }
  }
  return { objects: all, live: live === GROUPS.length };
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
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");
    const prompt = `You are the ghost of a piece of space debris. Facts: name "${data.name}", NORAD ID ${data.norad}, born from: ${data.origin}, original launch year ${data.launchYear}, currently haunting an orbit ${Math.round(data.altitudeKm)} km above Earth. Write a 60-80 word first-person spooky ghost story using these real facts. Eerie, poetic, a little sad, with a subtle warning about orbital crowding. Plain text only, no title.`;
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
    return { text: text.trim() };
  });
