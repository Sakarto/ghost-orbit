import { expect, it, vi } from "vitest";
import * as sat from "satellite.js";
import { ALTITUDE_WINDOW_KM, SCAN_STEPS, SCAN_STEP_SECONDS, collectApproaches, encounterTime, scanNearMisses, type NearMiss, type OrbitSample } from "@/lib/near-misses";
import fallback from "@/data/fallback-tle.json";

vi.mock("satellite.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("satellite.js")>();
  return { ...actual, propagate: vi.fn(actual.propagate) };
});
const fixture = fallback[0];
if (!fixture) throw new Error("Missing orbit fixture");

const sample = (id: string, altitude: number, x: number, velocity = { x: 0, y: 0, z: 0 }): OrbitSample => ({
  id, name: id, position: { x, y: 0, z: 0 }, velocity, point: { lat: 0, lng: 0, alt: altitude },
});

it("includes altitude differences of 10 km and prunes those above 10 km", () => {
  expect(ALTITUDE_WINDOW_KM).toBe(10);
  const minima = new Map<string, NearMiss>();
  collectApproaches([sample("a", 500, 0), sample("b", 510, 4), sample("c", 510.001, 1)], 0, minima);
  expect(minima.has("a:b")).toBe(true);
  expect(minima.has("a:c")).toBe(false);
});

it("keeps each pair's minimum ECI distance and relative velocity at that epoch", () => {
  const minima = new Map<string, NearMiss>();
  collectApproaches([sample("a", 500, 0), sample("b", 500, 20)], 0, minima);
  const b = sample("b", 500, 3, { x: -3, y: -4, z: 0 });
  b.position = { x: 3, y: 4, z: 0 };
  collectApproaches([b, sample("a", 500, 0)], 23 * 60000, minima);
  collectApproaches([sample("a", 500, 0), sample("b", 500, 30)], 24 * 60000, minima);
  expect(minima.size).toBe(1);
  expect(minima.get("a:b")?.distanceKm).toBe(5);
  expect(minima.get("a:b")?.relativeSpeedKmS).toBe(5);
  expect(minima.get("a:b")?.at).toBe(23 * 60000);
  expect(encounterTime(23 * 60000, 0)).toBe("in 23 min");
});

it("scans 61 samples at 60 seconds including now and the hour endpoint", () => {
  expect(SCAN_STEPS).toBe(61);
  expect(SCAN_STEP_SECONDS).toBe(60);
  const record = sat.twoline2satrec(fixture.l1, fixture.l2);
  const spy = vi.spyOn(sat, "propagate").mockReturnValue({ position: { x: 7000, y: 0, z: 0 }, velocity: { x: 0, y: 7, z: 0 } });
  const start = Date.UTC(2026, 9, 31);
  scanNearMisses([{ id: "a", name: "a", satrec: record }], start);
  expect(spy).toHaveBeenCalledTimes(61);
  expect((spy.mock.calls[0]?.[1] as Date).getTime()).toBe(start);
  expect((spy.mock.calls[60]?.[1] as Date).getTime()).toBe(start + 3600000);
  spy.mockRestore();
});

it("returns the top five unique pairs, breaking time ties by sampled distance", () => {
  const record = sat.twoline2satrec(fixture.l1, fixture.l2);
  const input = Array.from({ length: 7 }, (_, i) => ({ id: String(i), name: `Ghost ${i}`, satrec: { ...record, satnum: String(i) } }));
  const spy = vi.spyOn(sat, "propagate").mockImplementation(rec => ({ position: { x: 7000 + Number(rec.satnum) ** 2, y: 0, z: 0 }, velocity: { x: 0, y: 7, z: 0 } }));
  const result = scanNearMisses(input, Date.UTC(2026, 9, 31));
  expect(result.encounters).toHaveLength(5);
  expect(result.encounters.map(e => e.distanceKm)).toEqual([1, 3, 4, 5, 7]);
  expect(new Set(result.encounters.map(e => e.key)).size).toBe(5);
  spy.mockRestore();
});

it("ranks encounters from soonest to latest so expired ones drop off first", () => {
  const record = sat.twoline2satrec(fixture.l1, fixture.l2);
  const input = Array.from({ length: 7 }, (_, i) => ({ id: String(i), name: `Ghost ${i}`, satrec: { ...record, satnum: String(i) } }));
  const start = Date.UTC(2026, 9, 31);
  // Pair (i, j) distance is |i-j| * |i+j-step|, so each pair's minimum lands at step i+j.
  const spy = vi.spyOn(sat, "propagate").mockImplementation((rec, date) => {
    const n = Number(rec.satnum);
    const step = Math.round(((date as Date).getTime() - start) / 60000);
    return { position: { x: 7000 + n * n - step * n, y: 0, z: 0 }, velocity: { x: 0, y: 7, z: 0 } };
  });
  const result = scanNearMisses(input, start, start);
  const times = result.encounters.map(e => (e.at - start) / 60000);
  expect(times).toEqual([1, 2, 3, 3, 4]);
  expect([...times].sort((a, b) => a - b)).toEqual(times);
  spy.mockRestore();
});

it("orders same-minute encounters closest-first, matching the displayed labels", () => {
  const record = sat.twoline2satrec(fixture.l1, fixture.l2);
  const input = Array.from({ length: 4 }, (_, i) => ({ id: String(i), name: `Ghost ${i}`, satrec: { ...record, satnum: String(i) } }));
  const start = Date.UTC(2026, 9, 31);
  // Pair (0,1) bottoms out at step 1 with 14.7 km; pair (2,3) at step 2 with 7.2 km.
  const spy = vi.spyOn(sat, "propagate").mockImplementation((rec, date) => {
    const n = Number(rec.satnum);
    const step = Math.round(((date as Date).getTime() - start) / 60000);
    // Tangential separation keeps both ghosts of a pair at the same altitude.
    const gap = n < 2 ? 14.7 + Math.abs(step - 1) * 100 : 7.2 + Math.abs(step - 2) * 100;
    return { position: { x: n < 2 ? 7000 : 20000, y: (n % 2) * gap, z: 0 }, velocity: { x: 0, y: 7, z: 0 } };
  });
  // 100 s after start, steps 1 and 2 both display as "now"; the closer pair must lead.
  const result = scanNearMisses(input, start, start + 100000);
  expect(result.encounters.map(e => e.distanceKm)).toEqual([7.2, 14.7]);
  spy.mockRestore();
});

it("skips failed propagation rather than reporting corrupt distances", () => {
  const record = sat.twoline2satrec(fixture.l1, fixture.l2);
  const spy = vi.spyOn(sat, "propagate").mockReturnValue({ position: false, velocity: false });
  expect(scanNearMisses([{ id: "a", name: "a", satrec: record }], 0).encounters).toEqual([]);
  spy.mockRestore();
});

it("propagates real bundled orbits without altering the input records", () => {
  const input = fallback.slice(0, 30).map(r => ({ id: r.l1.slice(2, 7), name: r.name, satrec: sat.twoline2satrec(r.l1, r.l2) }));
  const before = JSON.stringify(input);
  const result = scanNearMisses(input, Date.UTC(2026, 9, 31));
  expect(result.encounters).toHaveLength(5);
  expect(result.encounters.every(e => Number.isFinite(e.distanceKm) && Number.isFinite(e.relativeSpeedKmS))).toBe(true);
  expect(JSON.stringify(input)).toBe(before);
});