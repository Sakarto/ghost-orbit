export type EventKey = "cosmos-2251-debris" | "iridium-33-debris" | "1999-025" | "derelict";

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
  derelict: {
    country: "Various",
    flag: "🧟",
    event: "Derelict Spacecraft",
    fragLabel: "intact zombie satellites",
    facts: "",
    forbid: "",
  },
};

export type Zombie = { country: string; flag: string; event: string; status: string; facts: string; forbid: string; short: string };

/** Intact dead spacecraft, keyed by NORAD ID. */
export const ZOMBIES: Record<string, Zombie> = {
  "5": {
    country: "United States",
    flag: "🇺🇸",
    event: "Derelict Spacecraft — died whole",
    status: "Silent since 1964",
    short: "Vanguard 1 (USA, 1958): the oldest human-made object still orbiting Earth. Its radio went silent in 1964.",
    facts:
      "I am Vanguard 1, a small American satellite about the size of a grapefruit, launched on March 17, 1958 — the first satellite to run on solar power. My radio fell silent in 1964, but I never fell. I am the oldest artificial object still orbiting Earth, and I may keep circling for hundreds of years.",
    forbid: "Never say I was destroyed, shattered, hit by a missile or in a collision. I died whole when my radio went silent.",
  },
  "27386": {
    country: "Europe (ESA)",
    flag: "🇪🇺",
    event: "Derelict Spacecraft — died whole",
    status: "Silent since 2012",
    short: "Envisat (Europe, 2002): an 8-ton Earth-watching giant the size of a double-decker bus that suddenly went silent in 2012.",
    facts:
      "I am Envisat, a European Space Agency satellite launched in 2002 to watch Earth's oceans, ice and air. I weigh about 8 tons, as big as a double-decker bus. On April 8, 2012 I suddenly went silent and nobody could wake me. Now I drift whole and uncontrolled, one of the biggest collision threats in orbit, and I will haunt it for about 150 years.",
    forbid: "Never say I was destroyed, shattered, hit by a missile or in a collision. I died whole when contact was suddenly lost.",
  },
  "116": {
    country: "United States",
    flag: "🇺🇸",
    event: "Derelict Spacecraft — died whole",
    status: "Long dead, nuclear-powered",
    short: "Transit 4A (USA, 1961): a navigation satellite that carried the first nuclear power source into space. Now a silent radioactive ghost.",
    facts:
      "I am Transit 4A, an American navy navigation satellite launched on June 29, 1961. I carried the first nuclear power source ever sent into space, a small plutonium battery. My signals died long ago, but I still circle Earth whole — a silent, radioactive ghost.",
    forbid: "Never say I was destroyed, shattered, hit by a missile or in a collision. Never say I exploded.",
  },
  "340": {
    country: "United States",
    flag: "🇺🇸",
    event: "Derelict Spacecraft — died whole",
    status: "Silent since 1963",
    short: "Telstar 1 (USA, 1962): beamed the first live TV across the Atlantic, then was killed by radiation from a nuclear test.",
    facts:
      "I am Telstar 1, an American communications satellite launched on July 10, 1962. I relayed the first live television pictures across the Atlantic Ocean. Radiation from a high-altitude American nuclear bomb test, Starfish Prime, damaged my electronics, and in February 1963 I fell silent forever. I still circle Earth whole.",
    forbid: "Never say I was destroyed, shattered, hit by a missile or in a collision.",
  },
  "10684": {
    country: "United States",
    flag: "🇺🇸",
    event: "Derelict Spacecraft — died whole",
    status: "Retired in the 1980s",
    short: "Navstar 1 (USA, 1978): the very first GPS satellite, now a retired ghost far above the navigation fleet it started.",
    facts:
      "I am Navstar 1, the very first GPS navigation satellite, launched by the United States on February 22, 1978. I helped prove that satellites could tell anyone on Earth exactly where they are. I was retired in the 1980s and now drift whole and silent about 20,000 km up, a forgotten ancestor of the GPS in every phone.",
    forbid: "Never say I was destroyed, shattered, hit by a missile or in a collision.",
  },
  "13603": {
    country: "Russia (USSR)",
    flag: "🇷🇺",
    event: "Derelict Spacecraft — died whole",
    status: "Retired in the 1980s",
    short: "Cosmos 1413 (USSR, 1982): the first GLONASS navigation satellite, the Soviet answer to GPS. Long dead, still circling.",
    facts:
      "I am Cosmos 1413, the first satellite of the Soviet GLONASS navigation system, launched on October 12, 1982 as the Soviet answer to American GPS. My service ended in the 1980s, and I still drift whole and silent about 19,000 km above Earth.",
    forbid: "Never say I was destroyed, shattered, hit by a missile or in a collision. Never confuse me with Cosmos 2251.",
  },
  "11": {
    country: "United States",
    flag: "🇺🇸",
    event: "Derelict Spacecraft — died whole",
    status: "Silent since 1959",
    short: "Vanguard 2 (USA, 1959): the first weather satellite. Its batteries died after 19 days; it has circled silently ever since.",
    facts:
      "I am Vanguard 2, launched by the United States on February 17, 1959 — the first satellite built to watch Earth's weather from space. I wobbled as I spun, so my cloud pictures came out blurred, and my batteries died after just 19 days. I have circled Earth whole and silent ever since.",
    forbid: "Never say I was destroyed, shattered, hit by a missile or in a collision.",
  },
};
