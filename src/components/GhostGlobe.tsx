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
    Promise.all([import("globe.gl"), import("three")]).then(([{ default: Globe }, THREE]) => {
      const geo = new THREE.SphereGeometry(0.45, 8, 8);
      const mat = new THREE.MeshBasicMaterial({ color: "#7dffb0", transparent: true, opacity: 0.9 });
      const selMat = new THREE.MeshBasicMaterial({ color: "#c79bff" });
      if (cancelled || !el.current) return;
      const g = new (Globe as any)(el.current)
        .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg")
        .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
        .backgroundImageUrl("https://unpkg.com/three-globe/example/img/night-sky.png")
        .atmosphereColor("#9b6cff")
        .atmosphereAltitude(0.18)
        .objectLat("lat")
        .objectLng("lng")
        .objectAltitude((d: Ghost) => d.alt / EARTH_R)
        .objectFacesSurface(false)
        .objectThreeObject((d: Ghost) => {
          const m = new THREE.Mesh(geo, d.id === selRef.current ? selMat : mat);
          if (d.id === selRef.current) m.scale.setScalar(3);
          return m;
        })
        .objectLabel((d: Ghost) => `<div style="font-family:monospace;color:#9effc0">👻 ${d.name}<br/>${Math.round(d.alt)} km</div>`)
        .onObjectClick((d: Ghost) => cbRef.current(d));
      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.25;
      g.pointOfView({ altitude: 2.6 });
      globe.current = g;
      g.objectsData(ghosts);
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
    globe.current?.objectsData([...ghosts]);
  }, [ghosts, selectedId]);

  return <div ref={el} className="absolute inset-0" />;
}
