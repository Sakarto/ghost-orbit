export type EventKey = "cosmos-2251-debris" | "iridium-33-debris" | "1999-025";

export const EVENT_META: Record<
  EventKey,
  { country: string; flag: string; event: string; fragLabel: string; facts: string; forbid: string }
> = {
  "cosmos-2251-debris": {
    country: "Russia (USSR)",
    flag: "🇷🇺",
    event: "2009 Cosmos-Iridium Collision",
    fragLabel: "Russian Cosmos 2251 collision fragments",
    facts:
      "I was Cosmos 2251, a Russian military communications satellite launched in 1993, already dead and drifting when it happened. On February 10, 2009 I collided head-on with the working American satellite Iridium 33 at about 42,000 km/h, nearly 790 km above Siberia — the first accidental satellite-on-satellite collision in human history.",
    forbid: "Never say I was hit by a missile or that I was American or Chinese.",
  },
  "iridium-33-debris": {
    country: "United States",
    flag: "🇺🇸",
    event: "2009 Cosmos-Iridium Collision",
    fragLabel: "American Iridium 33 collision fragments",
    facts:
      "I was Iridium 33, an active American commercial communications satellite launched in 1997 that carried satellite phone calls around the world. On February 10, 2009 the dead Russian satellite Cosmos 2251 struck and shattered me at about 42,000 km/h, nearly 790 km above Siberia — the first accidental satellite-on-satellite collision in human history.",
    forbid: "Never say I was hit by a missile or that I was Russian or Chinese.",
  },
  "1999-025": {
    country: "China",
    flag: "🇨🇳",
    event: "2007 Anti-Satellite Missile Test",
    fragLabel: "Chinese anti-satellite test fragments",
    facts:
      "I was Fengyun-1C, a Chinese weather satellite launched in 1999 that watched clouds and storms from space. On January 11, 2007 China deliberately destroyed me with a ground-launched missile that smashed into me in an intentional anti-satellite weapons test, about 865 km up — creating the largest debris cloud in human history, thousands of pieces.",
    forbid:
      "NEVER describe my death as a collision with another satellite, a crash with a satellite, or an accident. It was a deliberate missile strike launched from the ground. Never mention Cosmos or Iridium.",
  },
};
