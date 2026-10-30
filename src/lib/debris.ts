export { EVENT_META, ZOMBIES } from "./events";
import * as sat from "satellite.js";
import type { RawTle } from "./orbit.functions";

export const ORIGINS: Record<string, string> = {
  "cosmos-2251-debris": "Cosmos 2251 collision (2009)",
  "iridium-33-debris": "Iridium 33 collision (2009)",
  "1999-025": "Fengyun-1C ASAT test (2007)",
  derelict: "Zombie satellites (intact)",
};

export const EVENTS: Record<string, { mission: string; death: string; short: string }> = {
  "cosmos-2251-debris": {
    mission: "a Russian military communications satellite that relayed messages for the army, launched in 1993 and switched off years later",
    death: "On February 10, 2009 it smashed into the American Iridium 33 satellite at about 42,000 km/h — the first time two whole satellites ever crashed into each other",
    short: "In 2009 a dead Russian satellite and a working American one crashed head-on — the first satellite-on-satellite collision ever.",
  },
  "iridium-33-debris": {
    mission: "an American satellite in the Iridium network that carried satellite phone calls for people anywhere on Earth",
    death: "On February 10, 2009 a dead Russian satellite, Cosmos 2251, slammed into it at about 42,000 km/h and blew it apart",
    short: "The working American phone satellite destroyed in the same 2009 crash with Cosmos 2251.",
  },
  "1999-025": {
    mission: "a Chinese weather satellite that photographed clouds and storms from space",
    death: "On January 11, 2007 China deliberately destroyed it with a missile in an anti-satellite weapons test, shattering it into thousands of pieces",
    short: "In 2007 a missile test blew up a Chinese weather satellite, creating the largest debris cloud in history.",
  },
  derelict: {
    mission: "famous spacecraft that died whole",
    death: "Vanguard 1 (1958, oldest object in orbit), Envisat (8-ton European giant, silent since 2012) and Transit 4A (1961, first nuclear power source in space) still circle Earth intact",
    short: "These spacecraft never shattered — they simply died and kept circling, whole and silent.",
  },
};

export type Ghost = {
  id: string;
  name: string;
  source: string;
  launchYear: string;
  satrec: sat.SatRec;
  lat: number;
  lng: number;
  alt: number; // km
};

export function buildGhosts(raw: RawTle[]): Ghost[] {
  const out: Ghost[] = [];
  for (const r of raw) {
    try {
      const satrec = sat.twoline2satrec(r.l1, r.l2);
      const yy = parseInt(r.l1.slice(9, 11), 10);
      out.push({
        id: r.l1.slice(2, 7).trim(),
        name: r.name,
        source: r.source,
        launchYear: isNaN(yy) ? "unknown" : String(yy < 57 ? 2000 + yy : 1900 + yy),
        satrec,
        lat: 0,
        lng: 0,
        alt: 0,
      });
    } catch {
      /* skip bad TLE */
    }
  }
  return propagateAll(out, new Date());
}

export function propagateAll(ghosts: Ghost[], date: Date): Ghost[] {
  const gmst = sat.gstime(date);
  const res: Ghost[] = [];
  for (const g of ghosts) {
    const pv = sat.propagate(g.satrec, date);
    const p = pv?.position;
    if (!p || typeof p === "boolean") continue;
    const gd = sat.eciToGeodetic(p, gmst);
    if (!isFinite(gd.height) || gd.height < 100 || gd.height > 5000) continue;
    g.lat = sat.degreesLat(gd.latitude);
    g.lng = sat.degreesLong(gd.longitude);
    g.alt = gd.height;
    res.push(g);
  }
  return res;
}

export function histogram(ghosts: Ghost[], bin = 100) {
  const map = new Map<number, number>();
  for (const g of ghosts) {
    const b = Math.floor(g.alt / bin) * bin;
    map.set(b, (map.get(b) ?? 0) + 1);
  }
  const bins = [...map.entries()].sort((a, b) => a[0] - b[0]).map(([start, count]) => ({ start, count }));
  const max = bins.reduce((m, b) => (b.count > m.count ? b : m), { start: 0, count: 0 });
  return { bins, haunted: max };
}
