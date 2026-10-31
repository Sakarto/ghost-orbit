import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { encounterTime, type NearMiss, type ScanGhost, type ScanReply, type ScanResult } from "@/lib/near-misses";

export function NearMissPanel({ ghosts, selected, onSelect }: {
  ghosts: ScanGhost[]; selected: NearMiss | null; onSelect: (encounter: NearMiss | null) => void;
}) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [now, setNow] = useState(0);
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, []);
  useEffect(() => {
    if (!ghosts.length) return;
    let worker: Worker;
    let busy = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    try {
      worker = new Worker(new URL("../workers/near-misses.worker.ts", import.meta.url), { type: "module" });
      const scan = () => {
        if (busy) return;
        busy = true;
        setScanning(true);
        setError(null);
        worker.postMessage({ ghosts, startedAt: Date.now() });
      };
      worker.onmessage = (event: MessageEvent<ScanReply>) => {
        busy = false;
        setScanning(false);
        if ("result" in event.data) {
          setResult(event.data.result);
          setNow(Date.now());
        } else setError(event.data.error);
      };
      worker.onerror = () => {
        busy = false;
        setScanning(false);
        setError("The orbit scan failed. Try scanning again.");
      };
      scan();
      timer = setInterval(scan, 60000);
    } catch {
      setScanning(false);
      setError("Orbit scanning is unavailable in this browser.");
    }
    return () => { worker?.terminate(); if (timer) clearInterval(timer); };
  }, [ghosts, revision]);

  return (
    <section aria-label="Near-miss detector">
      <div className="flex items-center justify-between gap-1">
        <h3 className="font-pixel text-[9px] leading-relaxed text-destructive">⚠️ Near Misses — Next Hour</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground" aria-label="Rescan orbits" title="Rescan orbits" disabled={scanning || !ghosts.length} onClick={() => { onSelect(null); setRevision(r => r + 1); }}>
          <RefreshCw className={scanning ? "motion-safe:animate-spin" : ""} />
        </Button>
      </div>
      <div aria-live="polite">
        {scanning && <p className="mt-2 text-xs text-ghost">Scanning orbits…</p>}
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
      {result && !error && <>
        <p className="mt-1 text-[10px] text-muted-foreground">Closest sampled pairs · {result.scannedCount.toLocaleString()} ghosts scanned</p>
        <ol className="mt-2 divide-y divide-border">
          {result.encounters.map(encounter => (
            <li key={encounter.key}>
              <Button variant="ghost" aria-pressed={selected?.key === encounter.key} onClick={() => onSelect(encounter)}
                className={`h-auto w-full justify-start whitespace-normal rounded-sm px-1 py-2 text-left hover:bg-destructive/10 hover:text-destructive ${selected?.key === encounter.key ? "bg-destructive/10 text-destructive" : "text-foreground"}`}>
                <span className="min-w-0">
                  <span className="block break-words text-[11px] leading-snug">{encounter.a.name} ↔ {encounter.b.name}</span>
                  <span className="mt-1 block font-mono text-[10px] text-destructive">{encounter.distanceKm.toFixed(2)} km · {encounterTime(encounter.at, now)} · {encounter.relativeSpeedKmS.toFixed(1)} km/s</span>
                  <span className="block font-mono text-[9px] text-muted-foreground">NORAD {encounter.a.id} ↔ {encounter.b.id}</span>
                </span>
              </Button>
            </li>
          ))}
        </ol>
        {!result.encounters.length && <p className="mt-2 text-xs text-muted-foreground">No eligible pairs in this scan.</p>}
      </>}
      {selected && <div className="mt-2 flex items-start justify-between gap-1 text-[10px] text-destructive">
        <span>Encounter preview · {new Date(selected.at).toISOString().slice(11, 19)} UTC</span>
        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" aria-label="Clear encounter preview" title="Clear encounter preview" onClick={() => onSelect(null)}><X /></Button>
      </div>}
      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Computed with SGP4 orbit propagation at 60-second resolution.</p>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Pairs screened within 10 km of altitude.</p>
      <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Sampled estimates, not collision alerts. Actual closest passes may occur between samples; accuracy depends on orbital record age.</p>
    </section>
  );
}