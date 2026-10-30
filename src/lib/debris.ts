import * as sat from "satellite.js";
import type { RawTle } from "./orbit.functions";

export const ORIGINS: Record<string, string> = {
  "cosmos-2251-debris": "Cosmos 2251 collision (2009)",
  "iridium-33-debris": "Iridium 33 collision (2009)",
  "1999-025": "Fengyun-1C ASAT test (2007)",
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
    if (!isFinite(gd.height) || gd.height < 100 || gd.height > 3000) continue;
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
