import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { getDebris, ghostStory } from "@/lib/orbit.functions";
import { buildGhosts, EVENTS, histogram, ORIGINS, propagateAll, type Ghost } from "@/lib/debris";

const GhostGlobe = lazy(() => import("@/components/GhostGlobe"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Ghost Orbit — Earth's haunted orbit" },
      { name: "description", content: "Real space debris around Earth, shown live as ghosts. Click one to hear its story." },
      { property: "og:title", content: "Ghost Orbit — Earth's haunted orbit" },
      { property: "og:description", content: "Earth's orbit is haunted — and we're running out of space." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const all = useRef<Ghost[]>([]);
  const [live, setLive] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<Ghost | null>(null);
  const [rotate, setRotate] = useState(true);

  useEffect(() => {
    getDebris()
      .then((r) => {
        all.current = buildGhosts(r.objects);
        setGhosts([...all.current]);
        setLive(r.live);
      })
      .catch((e) => setError(String(e?.message ?? e)));
    const t = setInterval(() => {
      if (all.current.length) setGhosts(propagateAll(all.current, new Date()));
    }, 3000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const by: Record<string, number> = {};
    ghosts.forEach((g) => (by[g.source] = (by[g.source] ?? 0) + 1));
    return { by, ...histogram(ghosts) };
  }, [ghosts]);
  const maxBin = Math.max(1, ...stats.bins.map((b) => b.count));

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <Suspense fallback={null}>
        <GhostGlobe ghosts={ghosts} selectedId={sel?.id ?? null} onSelect={setSel} rotate={rotate} />
      </Suspense>

      <header className="pointer-events-none absolute left-6 top-5 z-10">
        <h1 className="font-display text-4xl text-ghost drop-shadow-[0_0_12px_var(--ghost)] sm:text-5xl">Ghost Orbit</h1>
        <p className="mt-2 font-pixel text-[10px] leading-relaxed text-spirit sm:text-xs">
          Earth's orbit is haunted — and we're running out of{" "}
          <em className="text-ghost drop-shadow-[0_0_8px_var(--ghost)]">space</em>.
        </p>
      </header>

      <button
        onClick={() => setRotate((r) => !r)}
        className="panel absolute bottom-5 right-5 z-10 !px-3 !py-2 font-pixel text-[9px] uppercase text-ghost hover:text-spirit"
      >
        {rotate ? "❚❚ Pause spin" : "▶ Resume spin"}
      </button>

      <aside className="panel absolute bottom-5 left-5 z-10 w-72">
        <h2 className="font-pixel text-[10px] uppercase text-spirit">Séance report</h2>
        {error ? (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        ) : !ghosts.length ? (
          <p className="mt-2 text-sm text-muted-foreground">Summoning the dead…</p>
        ) : (
          <>
            <p className="mt-2 text-3xl font-bold text-ghost">{ghosts.length.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">
              ghosts tracked · {live ? "live from CelesTrak" : "backup data"}
            </p>
            <ul className="mt-3 space-y-1 text-xs">
              {Object.entries(stats.by).map(([k, v]) => (
                <li key={k} className="flex justify-between gap-2" title={EVENTS[k]?.short}>
                  <span className="cursor-help text-muted-foreground underline decoration-dotted underline-offset-2">{ORIGINS[k]}</span>
                  <span className="font-mono text-ghost">{v}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <p className="text-xs">
                <span className="font-pixel text-[9px] text-spirit">The Haunted Zone:</span>{" "}
                {stats.haunted.start}–{stats.haunted.start + 100} km ({stats.haunted.count})
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                The most crowded, dangerous altitude band —{" "}
                {Math.round((stats.haunted.count / ghosts.length) * 100)}% of these ghosts are trapped here, where working satellites also fly.
              </p>
              <div className="mt-2 flex h-20 items-end gap-px">
                {stats.bins.map((b) => (
                  <div
                    key={b.start}
                    title={`${b.start}–${b.start + 100} km: ${b.count}`}
                    className={b.start === stats.haunted.start ? "flex-1 bg-spirit shadow-[0_0_8px_var(--spirit)]" : "flex-1 bg-ghost/50"}
                    style={{ height: `${(b.count / maxBin) * 100}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between font-mono text-[10px] text-muted-foreground">
                <span>{stats.bins[0]?.start} km</span>
                <span>{(stats.bins.at(-1)?.start ?? 0) + 100} km</span>
              </div>
            </div>
          </>
        )}
      </aside>

      {sel && <GhostPanel key={sel.id} ghost={sel} onClose={() => setSel(null)} />}
    </main>
  );
}

function GhostPanel({ ghost, onClose }: { ghost: Ghost; onClose: () => void }) {
  const [story, setStory] = useState("");
  const [shown, setShown] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  useEffect(() => {
    if (!story) return;
    let i = 0;
    const t = setInterval(() => {
      i += 2;
      setShown(story.slice(0, i));
      if (i >= story.length) clearInterval(t);
    }, 30);
    return () => clearInterval(t);
  }, [story]);

  const speak = (text: string) => {
    const s = window.speechSynthesis;
    if (!s) return;
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.4;
    u.rate = 0.85;
    s.speak(u);
  };

  const hear = async () => {
    if (story) return speak(story);
    setLoading(true);
    setErr(null);
    try {
      const r = await ghostStory({
        data: {
          name: ghost.name,
          norad: ghost.id,
          origin: ORIGINS[ghost.source],
          altitudeKm: ghost.alt,
          launchYear: ghost.launchYear,
          mission: EVENTS[ghost.source]!.mission,
          death: EVENTS[ghost.source]!.death,
        },
      });
      setStory(r.text);
      speak(r.text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The ghost went silent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="panel absolute right-5 top-5 z-10 w-80 max-w-[calc(100vw-2.5rem)]">
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display text-2xl text-ghost">👻 {ghost.name}</h2>
        <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-muted-foreground">NORAD ID</dt><dd className="font-mono">{ghost.id}</dd>
        <dt className="text-muted-foreground">Origin</dt><dd>{ORIGINS[ghost.source]}</dd>
        <dt className="text-muted-foreground">Altitude</dt><dd className="font-mono">{Math.round(ghost.alt)} km</dd>
        <dt className="text-muted-foreground">Launched</dt><dd className="font-mono">{ghost.launchYear}</dd>
      </dl>
      <p className="mt-3 rounded-md border border-border bg-muted/40 p-2 text-xs leading-snug text-muted-foreground">
        {EVENTS[ghost.source]?.short}
      </p>
      <button
        onClick={hear}
        disabled={loading}
        className="mt-4 w-full rounded-md bg-spirit px-4 py-2 font-pixel text-[10px] uppercase text-primary-foreground shadow-[0_0_16px_var(--spirit)] transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Summoning…" : story ? "Hear it again" : "Hear its story"}
      </button>
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      {shown && <p className="mt-4 text-sm italic leading-relaxed text-ghost/90">{shown}</p>}
    </aside>
  );
}
