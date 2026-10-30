import { useEffect, useRef } from "react";
import type { Ghost } from "@/lib/debris";

const EARTH_R = 6371;

export default function GhostGlobe({
  ghosts,
  selectedId,
  onSelect,
  rotate,
}: {
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
      const selMat = new THREE.SpriteMaterial({ map: makeTex("#c79bff"), transparent: true, depthWrite: false });
      // Large invisible hitbox so tiny ghosts are easy to click
      const hitGeo = new THREE.SphereGeometry(2.4, 6, 6);
      const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      if (cancelled || !el.current) return;
      const g = new (Globe as any)(el.current)
        .globeImageUrl("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")
        .bumpImageUrl("https://unpkg.com/three-globe/example/img/earth-topology.png")
        .backgroundImageUrl("https://unpkg.com/three-globe/example/img/night-sky.png")
        .atmosphereColor("#9b6cff")
        .atmosphereAltitude(0.18)
        .objectLat("lat")
        .objectLng("lng")
        .objectAltitude((d: Ghost) => d.alt / EARTH_R)
        .objectFacesSurface(false)
        .objectThreeObject((d: Ghost) => {
          const sel = d.id === selRef.current;
          const sp = new THREE.Sprite(sel ? selMat : mat);
          sp.scale.setScalar(sel ? 6 : 2.6);
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
      gm.color = new THREE.Color("#6b7fa3");
      gm.emissive = new THREE.Color("#0c1630");
      gm.emissiveIntensity = 0.4;
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
