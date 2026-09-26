import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createEyeModel } from "@/lib/eye-model";

export function mountEye(host: HTMLDivElement, reducedMotion: boolean, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
  renderer.setClearColor(0x030b08, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .88;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 40);
  const model = createEyeModel(); scene.add(model.root);
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  const env = pmrem.fromScene(room, .04);
  scene.environment = env.texture; scene.environmentIntensity = .45;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xd9ffe7, 0x07150e, .65));
  const key = new THREE.DirectionalLight(0xfff5d9, 2.2); key.position.set(-4, 5, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0x64ffc0, 1.8); rim.position.set(4, 1, 1); scene.add(rim);
  const under = new THREE.DirectionalLight(0x72b39a, .8); under.position.set(-2, -3, 1); scene.add(under);
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .30, .4, .95);
  const output = new OutputPass();
  composer.addPass(renderPass); composer.addPass(bloom); composer.addPass(output);
  let disposed = false, paused = reducedMotion, visible = true, raf = 0, time = 0, last = 0;
  let yaw = 0, pitch = 0, dragging = false, pointerX = 0, pointerY = 0;
  let driftX = 0, driftY = 0;
  let currentYaw = 0, currentPitch = 0;
  const render = () => { if (!disposed) composer.render(); };
  const resize = () => {
    const w = Math.max(1, host.clientWidth), h = Math.max(1, host.clientHeight);
    camera.aspect = w / h;
    camera.position.set(0, 0, Math.max(7.7, 5.65 / (2 * Math.tan(THREE.MathUtils.degToRad(18)) * camera.aspect)));
    camera.updateProjectionMatrix(); renderer.setSize(w, h); composer.setSize(w, h); render();
  };
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  const tick = (now: number) => {
    raf = 0;
    if (disposed || paused || !visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now; time += dt;
    const smoothing = 1 - Math.exp(-dt * 5);
    currentYaw += (yaw + driftX - currentYaw) * smoothing;
    currentPitch += (pitch + driftY - currentPitch) * smoothing;
    model.root.rotation.set(currentPitch, currentYaw, 0);
    model.iris.rotation.z = Math.sin(time * .18) * .018;
    const breathe = 1 + Math.sin(time * .9) * .010;
    model.pupil.scale.set(breathe, breathe, .42);
    for (const satellite of model.satellites) {
      const a = satellite.phase + time * satellite.speed;
      satellite.mesh.position.set(Math.cos(a) * satellite.radius, Math.sin(a) * satellite.radius, 0);
    }
    render(); raf = requestAnimationFrame(tick);
  };
  const start = () => { if (!disposed && !paused && visible && !document.hidden && !raf) raf = requestAnimationFrame(tick); };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; last = 0; };
  const intersect = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); else stop(); }); intersect.observe(host);
  const visibility = () => { if (document.hidden) stop(); else start(); };
  const down = (e: PointerEvent) => { if (!e.isPrimary) return; dragging = true; pointerX = e.clientX; pointerY = e.clientY; host.setPointerCapture(e.pointerId); host.dataset.dragging = "true"; };
  const move = (e: PointerEvent) => {
    if (dragging) {
      yaw += (e.clientX - pointerX) * .006;
      pitch = THREE.MathUtils.clamp(pitch + (e.clientY - pointerY) * .004, -.85, .85);
      pointerX = e.clientX; pointerY = e.clientY;
      if (paused) { currentYaw = yaw; currentPitch = pitch; model.root.rotation.set(pitch, yaw, 0); render(); }
    } else if (!reducedMotion && !paused && e.pointerType === "mouse") {
      const rect = host.getBoundingClientRect();
      driftX = ((e.clientX - rect.left) / rect.width - .5) * .10;
      driftY = ((e.clientY - rect.top) / rect.height - .5) * .06;
    }
  };
  const up = () => { dragging = false; host.dataset.dragging = "false"; };
  const leave = () => { driftX = 0; driftY = 0; };
  const lost = (e: Event) => { e.preventDefault(); stop(); onFailure(); };
  host.addEventListener("pointerdown", down); host.addEventListener("pointermove", move);
  host.addEventListener("pointerup", up); host.addEventListener("pointercancel", up); host.addEventListener("lostpointercapture", up); host.addEventListener("pointerleave", leave);
  renderer.domElement.addEventListener("webglcontextlost", lost); document.addEventListener("visibilitychange", visibility);
  resize(); start();
  return {
    pause(value: boolean) { paused = value; if (value) stop(); else start(); },
    reset() { yaw = pitch = driftX = driftY = 0; currentYaw = currentPitch = 0; model.root.rotation.set(0, 0, 0); render(); },
    rotate(x: number, y: number) { yaw += x; pitch = THREE.MathUtils.clamp(pitch + y, -.85, .85); currentYaw = yaw; currentPitch = pitch; model.root.rotation.set(pitch, yaw, 0); render(); },
    dispose() {
      disposed = true; stop(); resizeObserver.disconnect(); intersect.disconnect();
      host.removeEventListener("pointerdown", down); host.removeEventListener("pointermove", move); host.removeEventListener("pointerup", up);
      host.removeEventListener("pointercancel", up); host.removeEventListener("lostpointercapture", up); host.removeEventListener("pointerleave", leave);
      renderer.domElement.removeEventListener("webglcontextlost", lost); document.removeEventListener("visibilitychange", visibility);
      const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>();
      scene.traverse((obj) => { const m = obj as THREE.Mesh; if (m.geometry) geometries.add(m.geometry); if (m.material) for (const mat of Array.isArray(m.material) ? m.material : [m.material]) materials.add(mat); });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      bloom.dispose(); output.dispose(); composer.dispose(); env.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
