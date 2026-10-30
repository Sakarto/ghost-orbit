import { useEffect, useRef } from "react";
import type { Ghost } from "@/lib/debris";

const EARTH_R = 6371;

export default function GhostGlobe({
  ghosts,
  selectedId,
  onSelect,
}: {
  ghosts: Ghost[];
  selectedId: string | null;
  onSelect: (g: Ghost) => void;
}) {
  const el = useRef<HTMLDivElement>(null);
  const globe = useRef<any>(null);
  const selRef = useRef(selectedId);
  const cbRef = useRef(onSelect);
  cbRef.current = onSelect;
  selRef.current = selectedId;

  useEffect(() => {
    let cancelled = false;
    import("globe.gl").then(({ default: Globe }) => {
      if (cancelled || !el.current) return;
      const g = new (Globe as any)(el.current)
        .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg")
        .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
        .backgroundImageUrl("https://unpkg.com/three-globe/example/img/night-sky.png")
        .atmosphereColor("#9b6cff")
        .atmosphereAltitude(0.18)
        .pointLat("lat")
        .pointLng("lng")
        .pointAltitude((d: Ghost) => d.alt / EARTH_R)
        .pointRadius((d: Ghost) => (d.id === selRef.current ? 0.9 : 0.28))
        .pointColor((d: Ghost) => (d.id === selRef.current ? "#c79bff" : "rgba(120,255,170,0.9)"))
        .pointResolution(4)
        .pointsTransitionDuration(0)
        .pointLabel((d: Ghost) => `<div style="font-family:monospace;color:#9effc0">👻 ${d.name}<br/>${Math.round(d.alt)} km</div>`)
        .onPointClick((d: Ghost) => cbRef.current(d));
      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.25;
      g.pointOfView({ altitude: 2.6 });
      globe.current = g;
      g.pointsData(ghosts);
      const resize = () => g.width(window.innerWidth).height(window.innerHeight);
      resize();
      window.addEventListener("resize", resize);
      el.current.setAttribute("data-scene-ready", "true");
    });
    return () => {
      cancelled = true;
      globe.current?._destructor?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    globe.current?.pointsData([...ghosts]);
  }, [ghosts, selectedId]);

  return <div ref={el} className="absolute inset-0" />;
}
