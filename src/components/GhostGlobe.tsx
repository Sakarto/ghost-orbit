import { useEffect, useRef } from "react";
import type { Ghost } from "@/lib/debris";
import type { NearMiss } from "@/lib/near-misses";

const EARTH_R = 6371;
const displayAltitude = (alt: number) => (alt <= 3000 ? alt : 3000 + Math.sqrt(alt - 3000) * 40) / EARTH_R;

export default function GhostGlobe({
  ghosts,
  selectedId,
  onSelect,
  rotate,
  focusSource,
  encounter,
}: {
  encounter: NearMiss | null;
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
  const encounterRef = useRef(encounter);
  encounterRef.current = encounter;
  const updateEncounter = useRef<((moveCamera: boolean) => void) | null>(null);
  const encounterScale = useRef(7);
  const ghostsRef = useRef(ghosts);
  ghostsRef.current = ghosts;
  rotRef.current = rotate;
  useEffect(() => {
    if (globe.current) globe.current.controls().autoRotate = rotate && !hoverRef.current;
  }, [rotate]);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let disposeEncounter: (() => void) | undefined;
    let removeResize: (() => void) | undefined;
    Promise.all([import("globe.gl"), import("three"), import("three/addons/lines/Line2.js"), import("three/addons/lines/LineGeometry.js"), import("three/addons/lines/LineMaterial.js")]).then(([{ default: Globe }, THREE, { Line2 }, { LineGeometry }, { LineMaterial }]) => {
      const makeTex = (color: string) => {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const x = c.getContext("2d");
        if (!x) return new THREE.Texture();
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
      const dangerColor = getComputedStyle(document.documentElement).getPropertyValue("--destructive").trim();
      // Canvas/Three require a resolved sRGB color, rather than an OKLCH CSS token.
      const resolver = document.createElement("canvas").getContext("2d");
      if (resolver) resolver.fillStyle = dangerColor;
      const danger = resolver ? String(resolver.fillStyle) : dangerColor;
      const dangerMat = new THREE.SpriteMaterial({ map: makeTex(danger), transparent: true, depthWrite: false });
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
        .objectAltitude((d: Ghost) => displayAltitude(d.alt))
        .objectFacesSurface(false)
        .objectThreeObject((d: Ghost) => {
          const sel = d.id === selRef.current;
          const f = focusRef.current;
          const dim = !!f && d.source !== f && !sel;
          const hot = !!f && d.source === f;
          const z = d.source === "derelict";
          const near = encounterRef.current;
          const danger = d.id === near?.a.id || d.id === near?.b.id;
          const sp = new THREE.Sprite(danger ? dangerMat : sel ? selMat : dim ? dimMat : z ? zMat : mat);
          sp.scale.setScalar(danger ? encounterScale.current : sel ? 7 : z ? 8 : hot ? 5 : 4);
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
      const lineGeometry = new LineGeometry();
      const lineMaterial = new LineMaterial({ color: danger, linewidth: 5, depthTest: false, depthWrite: false, transparent: true, opacity: 1 });
      const glowMaterial = new LineMaterial({ color: danger, linewidth: 15, depthTest: false, depthWrite: false, transparent: true, opacity: 0.2 });
      const line = new Line2(lineGeometry, lineMaterial);
      const glow = new Line2(lineGeometry, glowMaterial);
      line.visible = glow.visible = false;
      line.renderOrder = 11;
      glow.renderOrder = 10;
      g.scene().add(glow, line);
      disposeEncounter = () => { lineGeometry.dispose(); lineMaterial.dispose(); glowMaterial.dispose(); };
      updateEncounter.current = (moveCamera) => {
        cancelAnimationFrame(frame);
        const near = encounterRef.current;
        line.visible = glow.visible = !!near;
        if (!near) {
          g.controls().target.set(0, 0, 0);
          g.controls().minDistance = 101;
          encounterScale.current = 7;
          if (moveCamera) g.pointOfView({ altitude: 2.6 }, 1000);
          return;
        }
        const points = [near.a.point, near.b.point].map(p => {
          const c = g.getCoords(p.lat, p.lng, displayAltitude(p.alt));
          return new THREE.Vector3(c.x, c.y, c.z);
        });
        lineGeometry.setPositions(points.flatMap(p => [p.x, p.y, p.z]));
        const [first, second] = points;
        if (!first || !second) return;
        const separation = first.distanceTo(second);
        encounterScale.current = Math.max(0.035, Math.min(0.6, separation * 0.22));
        g.objectsData(ghostsRef.current.map(d => d.id === near.a.id ? { ...d, ...near.a.point } : d.id === near.b.id ? { ...d, ...near.b.point } : d));
        if (moveCamera) {
          const middle = first.clone().add(second).multiplyScalar(0.5);
          const axis = second.clone().sub(first).normalize();
          const outward = middle.clone().normalize();
          let direction = outward.clone().addScaledVector(axis, -outward.dot(axis));
          if (direction.lengthSq() < 0.01) direction = new THREE.Vector3(0, 1, 0).cross(axis);
          if (direction.lengthSq() < 0.01) direction = new THREE.Vector3(1, 0, 0).cross(axis);
          direction.normalize();
          const distance = Math.max(0.5, separation * 3.5);
          const destination = middle.clone().addScaledVector(direction, distance);
          const camera = g.camera();
          const controls = g.controls();
          controls.minDistance = 0.1;
          const initialPosition = camera.position.clone();
          const initialTarget = controls.target.clone();
          const started = performance.now();
          const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
          const animate = () => {
            if (cancelled) return;
            const progress = reducedMotion ? 1 : Math.min(1, (performance.now() - started) / 1200);
            const eased = progress * progress * (3 - 2 * progress);
            camera.position.lerpVectors(initialPosition, destination, eased);
            controls.target.lerpVectors(initialTarget, middle, eased);
            controls.update();
            if (progress < 1) frame = requestAnimationFrame(animate);
          };
          animate();
          el.current?.setAttribute("data-encounter-camera-distance", String(distance));
        }
        el.current?.setAttribute("data-encounter-preview", near.key);
      };
      g.objectsData(ghosts);
      updateEncounter.current(true);
      const resize = () => {
        const width = el.current?.clientWidth ?? 0;
        const height = el.current?.clientHeight ?? 0;
        g.width(width).height(height);
        lineMaterial.resolution.set(width, height);
        glowMaterial.resolution.set(width, height);
      };
      resize();
      window.addEventListener("resize", resize);
      removeResize = () => window.removeEventListener("resize", resize);
      el.current.setAttribute("data-scene-ready", "true");
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      removeResize?.();
      disposeEncounter?.();
      globe.current?._destructor?.();
      updateEncounter.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const near = encounterRef.current;
    // Keep the pair at its predicted encounter epoch, not at today's live coordinates.
    const preview = ghosts.map(g => g.id === near?.a.id ? { ...g, ...near.a.point } : g.id === near?.b.id ? { ...g, ...near.b.point } : g);
    globe.current?.objectsData(preview);
  }, [ghosts, selectedId, focusSource, encounter]);

  useEffect(() => {
    updateEncounter.current?.(true);
    if (!encounter) el.current?.removeAttribute("data-encounter-preview");
  }, [encounter]);

  return <div ref={el} className="absolute inset-0" />;
}
