import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createGhostTransmission, playStaticBurst, startDrone, unlockSpookyAudio } from "@/lib/spooky-audio";
import { getDebris, ghostStory, ghostVoice } from "@/lib/orbit.functions";
import { GHOST_VOICES as VOICES } from "@/lib/ghost-voice-config";
import { NearMissPanel } from "@/components/NearMissPanel";
import type { NearMiss, ScanGhost } from "@/lib/near-misses";
import { buildGhosts, EVENT_META, EVENTS, ZOMBIES, histogram, ORIGINS, propagateAll, type Ghost } from "@/lib/debris";

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
  const [scanGhosts, setScanGhosts] = useState<ScanGhost[]>([]);
  const [encounter, setEncounter] = useState<NearMiss | null>(null);
  const all = useRef<Ghost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<Ghost | null>(null);
  const [rotate, setRotate] = useState(true);
  const [focus, setFocus] = useState<string | null>(null);
  const [cat, setCat] = useState<"all" | "zombie" | "debris">("all");
  const visible = ghosts.filter(
    (g) =>
      (focus ? g.source === focus : true) &&
      (cat === "all" || (cat === "zombie" ? g.source === "derelict" : g.source !== "derelict")),
  );

  useEffect(() => {
    getDebris()
      .then((r) => {
        all.current = buildGhosts(r.objects);
        setScanGhosts(all.current.map(g => ({ id: g.id, name: g.name, satrec: { ...g.satrec } })));
        setGhosts([...all.current]);
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
        <GhostGlobe ghosts={visible} selectedId={sel?.id ?? null} onSelect={(g) => { setEncounter(null); setSel(g); }} rotate={rotate} focusSource={focus} encounter={encounter} />
      </Suspense>

      <header className="pointer-events-none absolute left-6 top-5 z-10 max-w-[calc(100vw-3rem)]">
        <h1 className="font-display text-4xl text-ghost drop-shadow-[0_0_12px_var(--ghost)] sm:text-5xl">Ghost Orbit</h1>
        <p className="mt-2 font-pixel text-xs leading-relaxed text-spirit sm:text-sm">
          Earth's orbit is haunted — and we're running out of{" "}
          <em className="text-ghost drop-shadow-[0_0_8px_var(--ghost)]">space</em>.
        </p>
      </header>
      <p className="pointer-events-none absolute bottom-2 left-1/2 z-10 -translate-x-1/2 text-[10px] text-muted-foreground">
        Stories by Claude (Anthropic) · Voices by ElevenLabs · Orbits from CelesTrak
      </p>

      <button
        onClick={() => setRotate((r) => !r)}
        className="panel absolute bottom-5 right-5 z-10 !px-3 !py-2 font-pixel text-[9px] uppercase text-ghost hover:text-spirit"
      >
        {rotate ? "❚❚ Pause spin" : "▶ Resume spin"}
      </button>

      <aside className="panel absolute bottom-20 left-5 top-40 z-10 w-72 overflow-y-auto md:bottom-auto md:top-1/2 md:max-h-[calc(100dvh-12rem)] md:-translate-y-1/2">
        <h2 className="font-pixel text-[10px] uppercase text-spirit">Ghost Radar</h2>
        {error ? (
          <p className="mt-2 text-sm text-destructive">{error}</p>
        ) : !ghosts.length ? (
          <p className="mt-2 text-sm text-muted-foreground">Summoning the dead…</p>
        ) : (
          <>
            <p className="mt-2 text-3xl font-bold text-ghost">
              {visible.length.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              {focus
                ? `Showing ${EVENT_META[focus as keyof typeof EVENT_META].fragLabel}`
                : cat === "zombie"
                  ? "intact zombie satellites"
                  : cat === "debris"
                    ? "explosion & collision fragments"
                    : "orbital ghosts tracked"}
            </p>
            <div className="mt-3 grid grid-cols-3 gap-1 rounded-md border border-border p-0.5 text-[10px]">
              {([
                ["all", "All Orbital Ghosts"],
                ["zombie", "Intact Zombie Satellites"],
                ["debris", "Explosion / Collision Debris"],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => {
                    setCat(k);
                    setFocus(null);
                    setEncounter(null);
                  }}
                  className={`rounded px-1 py-1 leading-tight transition ${cat === k ? "bg-spirit text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {focus && (
              <button
                onClick={() => setFocus(null)}
                className="mt-2 rounded border border-ghost/50 px-2 py-1 font-pixel text-[9px] uppercase text-ghost hover:bg-ghost/10"
              >
                Show all debris
              </button>
            )}
            <h3 className="mt-4 font-pixel text-[9px] uppercase text-spirit">Debris Cloud Breakdown</h3>
            <p className="mt-2 text-[10px] uppercase tracking-wide text-ghost">💥 Exploded Shrapnel Clouds</p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Each ghost is a piece of shrapnel from a major orbital catastrophe.
            </p>
            <ul className="mt-1 space-y-1 text-xs">
              {Object.entries(stats.by).filter(([k]) => k !== "derelict").map(([k, v]) => (
                <li key={k}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        onClick={() => {
                          setCat("all");
                          setEncounter(null);
                          setFocus((f) => (f === k ? null : k));
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left transition hover:bg-muted ${focus === k ? "bg-spirit/20 ring-1 ring-spirit" : ""} ${focus && focus !== k ? "opacity-50" : ""}`}
                      >
                        <span className="text-muted-foreground underline decoration-dotted underline-offset-2">{ORIGINS[k]}</span>
                        <span className="font-mono text-ghost">{v}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" className="w-72 border-spirit/40 text-sm">
                      <p className="font-pixel text-[10px] uppercase text-spirit">{ORIGINS[k]}</p>
                      <p className="mt-2">{EVENTS[k]?.short}</p>
                      <p className="mt-2 text-xs text-muted-foreground">{EVENTS[k]?.death}.</p>
                      <p className="mt-2 text-xs text-ghost">
                        {focus === k ? "Showing only these ghosts. Click again to show all." : "Click the name to highlight these ghosts."}
                      </p>
                    </PopoverContent>
                  </Popover>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[10px] uppercase tracking-wide text-[color:var(--zombie)]">🧟 Intact Defunct Satellites</p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Whole spacecraft that died — out of fuel, broken or retired — still drifting silently.
            </p>
            <ul className="mt-1 space-y-1 text-xs">
              {Object.entries(stats.by).filter(([k]) => k === "derelict").map(([k, v]) => (
                <li key={k}>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        onClick={() => {
                          setCat("all");
                          setEncounter(null);
                          setFocus((f) => (f === k ? null : k));
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left transition hover:bg-muted ${focus === k ? "bg-spirit/20 ring-1 ring-spirit" : ""} ${focus && focus !== k ? "opacity-50" : ""}`}
                      >
                        <span className="text-muted-foreground underline decoration-dotted underline-offset-2">{ORIGINS[k]}</span>
                        <span className="font-mono text-ghost">{v}</span>
                      </button>
                    </PopoverTrigger>
                    <PopoverContent side="right" className="flex max-h-[min(32rem,var(--radix-popover-content-available-height))] w-80 max-w-[calc(100vw-2rem)] flex-col border-spirit/40 text-sm">
                      <p className="font-pixel text-[10px] uppercase text-spirit">{ORIGINS[k]}</p>
                      <p className="mt-2">{EVENTS[k]?.short}</p>
                      <ul className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-2 text-xs">
                        {Object.values(ZOMBIES).map((z) => {
                          const separator = z.short.indexOf(":");
                          return <li key={z.short} className="border-b border-border pb-3 last:border-0">
                            <p className="font-semibold text-ghost">{separator >= 0 ? z.short.slice(0, separator) : z.short}</p>
                            <p className="mt-1 text-[10px] text-spirit">{z.status}</p>
                            {separator >= 0 && <p className="mt-1 leading-relaxed text-muted-foreground">{z.short.slice(separator + 1).trim()}</p>}
                          </li>;
                        })}
                      </ul>
                      <p className="mt-2 text-xs text-ghost">
                        {focus === k ? "Showing only these ghosts. Click again to show all." : "Click the name to highlight these ghosts."}
                      </p>
                    </PopoverContent>
                  </Popover>
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <p className="text-xs">
                <Popover>
                  <PopoverTrigger className="cursor-help font-pixel text-[9px] text-spirit underline decoration-dotted underline-offset-4">
                    The Haunted Zone ⓘ
                  </PopoverTrigger>
                  <PopoverContent side="right" className="w-72 border-spirit/40 text-sm">
                    <p className="font-pixel text-[10px] uppercase text-spirit">The Haunted Zone</p>
                    <p className="mt-2">
                      {stats.haunted.start}–{stats.haunted.start + 100} km is the most crowded, dangerous altitude band —{" "}
                      {Math.round((stats.haunted.count / ghosts.length) * 100)}% of these ghosts are trapped here, right where working satellites also fly.
                    </p>
                  </PopoverContent>
                </Popover>{" "}
                {stats.haunted.start}–{stats.haunted.start + 100} km ({stats.haunted.count})
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
            <NearMissPanel ghosts={scanGhosts} selected={encounter} onSelect={(next) => {
              setEncounter(next);
              if (next) { setSel(null); setCat("all"); setFocus(null); setRotate(false); }
            }} />
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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTransmission = useRef<(() => void) | null>(null);
  const playbackId = useRef(0);
  const mounted = useRef(true);
  const voiceCache = useRef<Record<string, string>>({});
  const [speaking, setSpeaking] = useState(false);
  const [model, setModel] = useState("Claude");
  const stopDrone = useRef<(() => void) | null>(null);
  const endSpeech = () => {
    setSpeaking(false);
    stopTransmission.current?.();
    stopTransmission.current = null;
    stopDrone.current?.();
    stopDrone.current = null;
  };
  useEffect(
    () => {
      mounted.current = true;
      return () => {
        mounted.current = false;
        playbackId.current++;
        window.speechSynthesis?.cancel();
        audioRef.current?.pause();
        stopTransmission.current?.();
        stopDrone.current?.();
      };
    },
    [],
  );
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

  const speak = async (text: string) => {
    if (!mounted.current) return;
    const id = ++playbackId.current;
    const chosenVoice = VOICES[0].id;
    audioRef.current?.pause();
    window.speechSynthesis?.cancel();
    endSpeech();
    setSpeaking(true);
    if (voiceCache.current[chosenVoice] === undefined) {
      try {
        const v = await ghostVoice({ data: { text, voice: chosenVoice } });
        voiceCache.current[chosenVoice] = v.audio ? `data:audio/mpeg;base64,${v.audio}` : "";
      } catch {
        voiceCache.current[chosenVoice] = "";
      }
    }
    if (!mounted.current || id !== playbackId.current) return;
    const beginTransmission = () => {
      if (!mounted.current || id !== playbackId.current) return;
      playStaticBurst();
      stopDrone.current = startDrone();
    };
    const src = voiceCache.current[chosenVoice];
    if (src) {
      const a = new Audio(src);
      audioRef.current = a;
      a.onended = endSpeech;
      a.onplaying = beginTransmission;
      a.onerror = endSpeech;
      try {
        stopTransmission.current = createGhostTransmission(a);
        await a.play();
        return;
      } catch {
        stopTransmission.current?.();
        stopTransmission.current = null;
        /* fall back to browser voice */
      }
    }
    const s = window.speechSynthesis;
    if (!s) return endSpeech();
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = 0.3;
    u.rate = 0.8;
    u.onend = endSpeech;
    u.onerror = endSpeech;
    u.onstart = beginTransmission;
    s.speak(u);
  };

  const hear = async () => {
    unlockSpookyAudio();
    if (story) return void speak(story);
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
          source: ghost.source as keyof typeof EVENT_META,
        },
      });
      if (!mounted.current) return;
      setStory(r.text);
      setModel(r.model);
      void speak(r.text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "The ghost went silent.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside
      className={`panel absolute right-5 top-5 z-10 max-h-[calc(100dvh-2.5rem)] w-80 max-w-[calc(100vw-2.5rem)] !overflow-y-auto ${loading || speaking ? "seance-active" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display text-2xl text-ghost">👻 {ghost.name}</h2>
        <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
        {(() => {
          const z = ghost.source === "derelict" ? ZOMBIES[String(Number(ghost.id))] : undefined;
          const m = z ?? EVENT_META[ghost.source as keyof typeof EVENT_META];
          return (
            <>
              <dt className="text-muted-foreground">Type</dt>
              <dd className={z ? "font-semibold text-[color:var(--zombie)]" : "font-semibold text-ghost"}>
                {z ? "🧟 Intact Defunct Spacecraft" : ghost.source === "1999-025" ? "💥 Missile-Strike Fragment" : "💥 Collision Fragment"}
              </dd>
              <dt className="text-muted-foreground">Country</dt>
              <dd>{m?.flag} {m?.country}</dd>
              {!z && (<><dt className="text-muted-foreground">Debris Event</dt><dd>{m?.event}</dd></>)}
              {z && (<><dt className="text-muted-foreground">Status</dt><dd>{z.status}</dd></>)}
              <dt className="text-muted-foreground">{z ? "Spacecraft" : "Fragment"}</dt>
              <dd className="font-mono">NORAD {ghost.id}</dd>
            </>
          );
        })()}
        <dt className="text-muted-foreground">Altitude</dt><dd className="font-mono">{Math.round(ghost.alt)} km</dd>
        <dt className="text-muted-foreground">Launched</dt><dd className="font-mono">{ghost.launchYear}</dd>
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">{VOICES[0].label}</p>
      <button
        onClick={hear}
        disabled={loading}
        className="mt-2 w-full rounded-md bg-spirit px-4 py-2 font-pixel text-[10px] uppercase text-primary-foreground shadow-[0_0_16px_var(--spirit)] transition hover:brightness-110 disabled:opacity-60"
      >
        {loading ? "Contacting the dead…" : speaking ? "The ghost speaks…" : story ? "Hear it again" : "Hear its story"}
      </button>
      {err && <p className="mt-3 text-sm text-destructive">{err}</p>}
      {shown && <p className="mt-4 text-sm italic leading-relaxed text-ghost/90">{shown}</p>}
      <p className="mt-4 border-t border-border pt-2 text-center text-[10px] text-muted-foreground">
        Powered by <span className="text-spirit">{model} (Anthropic)</span> & <span className="text-ghost">ElevenLabs</span>
      </p>
    </aside>
  );
}
