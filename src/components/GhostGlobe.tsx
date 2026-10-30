import { useEffect, useRef } from "react";
import type { Ghost } from "@/lib/debris";

const EARTH_R = 6371;

export default function GhostGlobe({
  ghosts,
  selectedId,
  onSelect,
  rotate,
  focusSource,
}: {
  focusSource: string | null;
  rotate: boolean;
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
  const focusRef = useRef(focusSource);
  focusRef.current = focusSource;
  const rotRef = useRef(rotate);
  const hoverRef = useRef(false);
  rotRef.current = rotate;
  useEffect(() => {
    if (globe.current) globe.current.controls().autoRotate = rotate && !hoverRef.current;
  }, [rotate]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([import("globe.gl"), import("three")]).then(([{ default: Globe }, THREE]) => {
      const makeTex = (color: string) => {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const x = c.getContext("2d")!;
        x.shadowColor = color;
        x.shadowBlur = 14;
        x.fillStyle = color;
        x.beginPath();
        x.arc(32, 26, 14, Math.PI, 0);
        x.lineTo(46, 48);
        for (let i = 0; i < 4; i++) x.lineTo(46 - i * 7 - 3.5, i % 2 ? 48 : 42);
        x.lineTo(18, 48);
        x.closePath();
        x.fill();
        x.shadowBlur = 0;
        x.fillStyle = "#0b0f1e";
        x.beginPath();
        x.arc(27, 27, 2.6, 0, Math.PI * 2);
        x.arc(37, 27, 2.6, 0, Math.PI * 2);
        x.fill();
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      };
      const mat = new THREE.SpriteMaterial({ map: makeTex("#7dffb0"), transparent: true, depthWrite: false });
      const dimMat = new THREE.SpriteMaterial({ map: makeTex("#7dffb0"), transparent: true, opacity: 0.12, depthWrite: false });
      const zMat = new THREE.SpriteMaterial({ map: makeTex("#ffb35c"), transparent: true, depthWrite: false });
      const selMat = new THREE.SpriteMaterial({ map: makeTex("#c79bff"), transparent: true, depthWrite: false });
      // Large invisible hitbox so tiny ghosts are easy to click
      const hitGeo = new THREE.SphereGeometry(2.4, 6, 6);
      const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      if (cancelled || !el.current) return;
      const g = new (Globe as any)(el.current)
        .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-night.jpg")
        .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
        .backgroundImageUrl("https://unpkg.com/three-globe/example/img/night-sky.png")
        .atmosphereColor("#5dffa8")
        .atmosphereAltitude(0.22)
        .objectLat("lat")
        .objectLng("lng")
        // High orbits (GPS ~20,000 km, geostationary ~36,000 km) are compressed so they stay on screen.
        .objectAltitude((d: Ghost) => (d.alt <= 3000 ? d.alt : 3000 + Math.sqrt(d.alt - 3000) * 40) / EARTH_R)
        .objectFacesSurface(false)
        .objectThreeObject((d: Ghost) => {
          const sel = d.id === selRef.current;
          const f = focusRef.current;
          const dim = !!f && d.source !== f && !sel;
          const hot = !!f && d.source === f;
          const z = d.source === "derelict";
          const sp = new THREE.Sprite(sel ? selMat : dim ? dimMat : z ? zMat : mat);
          sp.scale.setScalar(sel ? 7 : z ? 8 : hot ? 5 : 4);
          const hit = new THREE.Mesh(hitGeo, hitMat);
          const grp = new THREE.Group();
          grp.add(sp, hit);
          return grp;
        })
        .objectLabel((d: Ghost) => `<div style="font-family:monospace;color:#9effc0">👻 ${d.name}<br/>${Math.round(d.alt)} km</div>`)
        .onObjectClick((d: Ghost) => cbRef.current(d))
        .onObjectHover((d: Ghost | null) => {
          hoverRef.current = !!d;
          g.controls().autoRotate = rotRef.current && !d;
          if (el.current) el.current.style.cursor = d ? "pointer" : "grab";
        });
      const gm = g.globeMaterial();
      gm.color = new THREE.Color("#4a4f78");
      gm.emissive = new THREE.Color("#1a0d33");
      gm.emissiveIntensity = 0.35;
      g.controls().autoRotate = true;
      g.controls().autoRotateSpeed = 0.25;
      g.pointOfView({ altitude: 2.6 });
      globe.current = g;
      g.objectsData(ghosts);
      const resize = () => g.width(el.current?.clientWidth ?? 0).height(el.current?.clientHeight ?? 0);
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
  }, [ghosts, selectedId, focusSource]);

  return <div ref={el} className="absolute inset-y-0 right-0 left-0 md:left-[19.25rem]" />;
}
