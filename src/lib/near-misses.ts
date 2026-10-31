import * as sat from "satellite.js";

export const SCAN_STEP_SECONDS = 60;
export const SCAN_STEPS = 61;
export const ALTITUDE_WINDOW_KM = 10;
export const MAX_NEAR_MISSES = 5;

export type ScanGhost = { id: string; name: string; satrec: sat.SatRec };
export type OrbitPoint = { lat: number; lng: number; alt: number };
type Vector = { x: number; y: number; z: number };
export type OrbitSample = {
  id: string; name: string; position: Vector; velocity: Vector; point: OrbitPoint;
};
export type NearMiss = {
  key: string;
  a: { id: string; name: string; point: OrbitPoint };
  b: { id: string; name: string; point: OrbitPoint };
  distanceKm: number;
  relativeSpeedKmS: number;
  at: number;
};
export type ScanResult = { startedAt: number; encounters: NearMiss[]; scannedCount: number };
export type ScanReply = { result: ScanResult } | { error: string };

const separation = (a: Vector, b: Vector) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const validVector = (v: Vector) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

// Pure reducer shared by the worker and numerical tests. Each pair appears only once.
export function collectApproaches(samples: OrbitSample[], at: number, minima: Map<string, NearMiss>) {
  samples.sort((a, b) => a.point.alt - b.point.alt);
  for (let i = 0; i < samples.length; i++) {
    const a = samples[i];
    if (!a) continue;
    for (let j = i + 1; j < samples.length; j++) {
      const b = samples[j];
      if (!b) continue;
      if (b.point.alt - a.point.alt > ALTITUDE_WINDOW_KM) break;
      if (a.id === b.id) continue;
      const key = [a.id, b.id].sort().join(":");
      const distanceKm = separation(a.position, b.position);
      const previous = minima.get(key);
      if (previous && previous.distanceKm <= distanceKm) continue;
      minima.set(key, {
        key, a: { id: a.id, name: a.name, point: a.point }, b: { id: b.id, name: b.name, point: b.point },
        distanceKm, relativeSpeedKmS: separation(a.velocity, b.velocity), at,
      });
    }
  }
}

export function scanNearMisses(input: ScanGhost[], startedAt: number): ScanResult {
  // SGP4 mutates satellite records: do not share these records with live telemetry.
  const ghosts = [...new Map(input.map(g => [g.id, { ...g, satrec: { ...g.satrec } }])).values()];
  const minima = new Map<string, NearMiss>();
  const propagated = new Set<string>();
  for (let step = 0; step < SCAN_STEPS; step++) {
    const at = startedAt + step * SCAN_STEP_SECONDS * 1000;
    const date = new Date(at);
    const gmst = sat.gstime(date);
    const samples: OrbitSample[] = [];
    for (const g of ghosts) {
      try {
        const pv = sat.propagate(g.satrec, date);
        const p = pv.position;
        const v = pv.velocity;
        if (!p || typeof p === "boolean" || !v || typeof v === "boolean" || !validVector(p) || !validVector(v)) continue;
        const gd = sat.eciToGeodetic(p, gmst);
        if (!Number.isFinite(gd.height) || gd.height < 0) continue;
        propagated.add(g.id);
        samples.push({ id: g.id, name: g.name, position: p, velocity: v,
          point: { lat: sat.degreesLat(gd.latitude), lng: sat.degreesLong(gd.longitude), alt: gd.height } });
      } catch { /* Invalid/decayed records cannot produce an encounter. */ }
    }
    collectApproaches(samples, at, minima);
  }
  // Rank by closest miss distance, breaking ties by the soonest encounter.
  return { startedAt, scannedCount: propagated.size,
    encounters: [...minima.values()].sort((a, b) => a.distanceKm - b.distanceKm || a.at - b.at || a.key.localeCompare(b.key)).slice(0, MAX_NEAR_MISSES) };
}

export function encounterTime(at: number, now: number) {
  const minutes = Math.max(0, Math.round((at - now) / 60000));
  return minutes === 0 ? "now" : `in ${minutes} min`;
}