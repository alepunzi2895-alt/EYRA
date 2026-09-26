import * as THREE from "three";
import { SPECIALISTS, type SpecialistId } from "@/lib/dna";

/** A single on-demand render loop; no network calls, textures or postprocessing. */
export function mountDna(host: HTMLDivElement, reduced: boolean, initial: SpecialistId,
  onSelect: (id: SpecialistId) => void, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  const scene = new THREE.Scene();
  const abort = new AbortController();
  let resizeObserver: ResizeObserver | undefined, intersection: IntersectionObserver | undefined;
  let raf = 0, disposed = false, lost = false, paused = reduced, visible = false;
  let last = 0, time = 0, selected = initial, yaw = .3, pitch = 0, settling = 0;
  const dispose = () => {
    if (disposed) return;
    disposed = true; cancelAnimationFrame(raf); abort.abort();
    resizeObserver?.disconnect(); intersection?.disconnect();
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
    scene.traverse(obj => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => materials.add(m));
    });
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    renderer.dispose(); renderer.domElement.remove();
  };

  try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.25 : 1.6));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(34, 1, .1, 50);
    const root = new THREE.Group(); root.rotation.z = -.17; scene.add(root);
    scene.add(new THREE.HemisphereLight(0xccffe8, 0x09241d, 2));
    const light = new THREE.DirectionalLight(0xa6ffe0, 3); light.position.set(3, 4, 5); scene.add(light);
    const rim = new THREE.DirectionalLight(0x16ae99, 2); rim.position.set(-3, -2, -2); scene.add(rim);
    const strand = new THREE.MeshPhysicalMaterial({ color: 0x4cdbb6, metalness: .35, roughness: .28, clearcoat: 1, emissive: 0x096b4c, emissiveIntensity: .6 });
    const sheath = new THREE.MeshBasicMaterial({ color: 0x37d9aa, transparent: true, opacity: .06, depthWrite: false });
    const rungMaterial = new THREE.MeshStandardMaterial({ color: 0x267b66, metalness: .35, roughness: .4, emissive: 0x0c503c, emissiveIntensity: .4 });
    const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x8bf0d0, metalness: .35, roughness: .3 });
    const jointGeometry = new THREE.SphereGeometry(.045, 10, 8);
    const point = (t: number, phase = 0, radius = 1.03) => {
      const a = t * Math.PI * 4 + phase;
      return new THREE.Vector3(Math.sin(a) * radius, 3.6 - t * 7.2, Math.cos(a) * radius);
    };
    for (const phase of [0, Math.PI]) {
      const path = new THREE.CatmullRomCurve3(Array.from({ length: 161 }, (_, i) => point(i / 160, phase)));
      root.add(new THREE.Mesh(new THREE.TubeGeometry(path, 192, .047, 10, false), strand));
      root.add(new THREE.Mesh(new THREE.TubeGeometry(path, 128, .115, 8, false), sheath));
      // A second fine filament gives the backbone a layered, engineered structure.
      const fine = new THREE.CatmullRomCurve3(Array.from({ length: 121 }, (_, i) => point(i / 120, phase + .12, 1.09)));
      root.add(new THREE.Mesh(new THREE.TubeGeometry(fine, 128, .012, 5, false), jointMaterial));
    }
    for (let i = 0; i <= 48; i++) {
      const a = point(i / 48), b = point(i / 48, Math.PI);
      const path = new THREE.LineCurve3(a, b);
      root.add(new THREE.Mesh(new THREE.TubeGeometry(path, 1, .017, 6, false), rungMaterial));
      for (const p of [a, b]) { const joint = new THREE.Mesh(jointGeometry, jointMaterial); joint.position.copy(p); root.add(joint); }
    }
    const nodes = SPECIALISTS.map((s, i) => {
      const node = new THREE.Mesh(new THREE.SphereGeometry(.115, 20, 14), new THREE.MeshStandardMaterial({ color: 0x6ee7b7, emissive: 0x34d399, emissiveIntensity: .9, roughness: .2, metalness: .2 }));
      node.position.copy(point((i + .5) / SPECIALISTS.length));
      node.userData.id = s.id; root.add(node);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(.23, .012, 6, 40), new THREE.MeshBasicMaterial({ color: 0xb0ffe0, transparent: true, opacity: .4 }));
      halo.position.copy(node.position); root.add(halo);
      const label = host.querySelector<HTMLButtonElement>(`[data-node="${s.id}"]`)!;
      return { id: s.id, node, halo, label };
    });
    const links = new THREE.Group(); root.add(links);
    const makeLinks = () => {
      for (const child of [...links.children]) {
        const line = child as THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial>;
        line.geometry.dispose(); line.material.dispose(); links.remove(line);
      }
      const from = nodes.find(n => n.id === selected)!;
      const related = SPECIALISTS.find(s => s.id === selected)!.connections;
      for (const id of related) {
        const to = nodes.find(n => n.id === id)!;
        const mid = from.node.position.clone().lerp(to.node.position, .5);
        mid.x += 1.05; mid.z += .8;
        const curve = new THREE.QuadraticBezierCurve3(from.node.position, mid, to.node.position);
        links.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(40)), new THREE.LineBasicMaterial({ color: 0x6ee7b7, transparent: true, opacity: .28 })));
      }
      nodes.forEach(n => n.label.dataset.connected = String(related.includes(n.id)));
    };
    makeLinks();
    const sparks = [0, Math.PI].map(phase => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(.065, 10, 8), new THREE.MeshBasicMaterial({ color: 0xe4fff4 }));
      root.add(mesh); return { mesh, phase };
    });
    const starPositions = new Float32Array(180 * 3);
    for (let i = 0; i < 180; i++) {
      const r = (n: number) => { const v = Math.sin((i + 1) * n) * 43758.5453; return v - Math.floor(v); };
      starPositions.set([(r(12.9898) - .5) * 13, (r(78.233) - .5) * 12, -2 - r(34.73) * 5], i * 3);
    }
    scene.add(new THREE.Points(new THREE.BufferGeometry().setAttribute("position", new THREE.BufferAttribute(starPositions, 3)), new THREE.PointsMaterial({ color: 0x9dcbbd, size: .018, transparent: true, opacity: .55 })));

    const projected = new THREE.Vector3();
    const canRender = () => !disposed && !lost && visible && !document.hidden;
    const render = (dt = 1) => {
      if (!canRender()) return;
      root.rotation.y = yaw; root.rotation.x = pitch;
      const related = SPECIALISTS.find(s => s.id === selected)!.connections;
      nodes.forEach(n => {
        const target = n.id === selected ? 1.65 : related.includes(n.id) ? 1.12 : .85;
        n.node.scale.lerp(new THREE.Vector3(target, target, target), Math.min(1, dt * 9));
        n.node.material.emissiveIntensity = n.id === selected ? 2 : related.includes(n.id) ? 1 : .35;
        n.halo.material.opacity = n.id === selected ? .9 : related.includes(n.id) ? .4 : .12;
      });
      sparks.forEach((s, i) => s.mesh.position.copy(point((time * .065 + i * .4) % 1, s.phase)));
      renderer.render(scene, camera);
      nodes.forEach(n => {
        n.node.getWorldPosition(projected); projected.project(camera);
        const x = Math.max(24, Math.min(host.clientWidth - 24, (projected.x * .5 + .5) * host.clientWidth));
        const y = (-projected.y * .5 + .5) * host.clientHeight;
        n.label.style.left = `${x}px`; n.label.style.top = `${y}px`;
      });
    };
    const tick = (now: number) => {
      raf = 0;
      if (!canRender()) { last = 0; return; }
      const dt = last ? Math.min((now - last) / 1000, .05) : 1 / 60; last = now;
      if (!paused) { time += dt; if (!drag) yaw += dt * .095; }
      settling = Math.max(0, settling - dt);
      render(dt);
      if (!paused || settling > 0) raf = requestAnimationFrame(tick);
      else last = 0;
    };
    const start = () => { if (canRender() && !raf && (!paused || settling > 0)) raf = requestAnimationFrame(tick); };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; };
    const resize = () => {
      const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
      camera.aspect = w / h;
      camera.position.set(0, 0, Math.max(15.4, 3.6 / (Math.tan(THREE.MathUtils.degToRad(17)) * camera.aspect)));
      camera.updateProjectionMatrix(); renderer.setSize(w, h); render();
    };
    let drag: { id: number; x: number; y: number; distance: number } | null = null;
    const raycaster = new THREE.Raycaster();
    const down = (e: PointerEvent) => {
      if (!e.isPrimary || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, distance: 0 }; host.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.distance += Math.abs(dx) + Math.abs(dy);
      yaw += dx * .007; pitch = THREE.MathUtils.clamp(pitch + dy * .003, -.35, .35);
      drag.x = e.clientX; drag.y = e.clientY; render();
    };
    const up = (e: PointerEvent) => {
      if (!drag || drag.id !== e.pointerId) return;
      if (drag.distance < 6) {
        const rect = host.getBoundingClientRect();
        raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
        const hit = raycaster.intersectObjects(nodes.map(n => n.node))[0];
        if (hit) onSelect(hit.object.userData.id as SpecialistId);
      }
      drag = null; if (host.hasPointerCapture(e.pointerId)) host.releasePointerCapture(e.pointerId);
    };
    const opts = { signal: abort.signal };
    host.addEventListener("pointerdown", down, opts); host.addEventListener("pointermove", move, opts); host.addEventListener("pointerup", up, opts);
    host.addEventListener("pointercancel", () => { drag = null; }, opts);
    host.addEventListener("lostpointercapture", () => { drag = null; }, opts);
    renderer.domElement.addEventListener("webglcontextlost", e => { e.preventDefault(); lost = true; dispose(); onFailure(); }, opts);
    document.addEventListener("visibilitychange", () => { if (document.hidden) stop(); else { render(); start(); } }, opts);
    resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
    intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) { render(); start(); } else stop(); }); intersection.observe(host);
    resize();
    return {
      select(id: SpecialistId) { if (disposed) return; selected = id; makeLinks(); settling = paused ? 0 : .6; render(paused ? 1 : 0); start(); },
      pause(value: boolean) { paused = value; settling = 0; if (paused) { stop(); render(); } else start(); },
      rotate(x: number, y: number) { yaw += x; pitch = THREE.MathUtils.clamp(pitch + y, -.35, .35); render(); },
      reset() { yaw = .3; pitch = 0; render(); },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}
