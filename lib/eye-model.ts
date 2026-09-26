import * as THREE from "three";

/** Sculpted geometry only: the reference image is never used as a texture. */
export function createEyeModel() {
  const root = new THREE.Group();
  root.name = "Eye";
  const iris = new THREE.Group();
  iris.name = "Iris";
  root.add(iris);
  let seed = 1703;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x020806, metalness: .18, roughness: .29, clearcoat: .7, clearcoatRoughness: .18, envMapIntensity: .38 });
  const silver = new THREE.MeshStandardMaterial({ color: 0x384c3d, metalness: .48, roughness: .42, envMapIntensity: .35 });
  const black = new THREE.MeshPhysicalMaterial({ color: 0x010403, metalness: .12, roughness: .27, clearcoat: .55, clearcoatRoughness: .20, envMapIntensity: .3 });
  const emerald = new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, emissive: 0x00150e, emissiveIntensity: .15, metalness: .06, roughness: .58, envMapIntensity: .12, side: THREE.DoubleSide });
  const light = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x75ffbf).multiplyScalar(2.2), toneMapped: false });

  const mesh = (name: string, geo: THREE.BufferGeometry, mat: THREE.Material, parent: THREE.Object3D = root) => {
    const m = new THREE.Mesh(geo, mat); m.name = name; parent.add(m); return m;
  };
  const irisZ = (r: number) => .28 + .25 * (1 - (r / 1.13) ** 2);
  const energy = (r: number, a: number) => Math.exp(-(((r - .66 - Math.sin(a * 5) * .025) / .17) ** 2)) * (.48 + .52 * Math.sin(a * 3 + 1.2) ** 2);
  const hash = (x: number, y: number) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
  function noise(x: number, y: number) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), u), THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), u), v);
  }
  function nebula(x: number, y: number) {
    let sum = 0, amplitude = .55;
    for (let i = 0; i < 5; i++) { sum += noise(x, y) * amplitude; const nx = x * 1.73 - y * .91; y = x * .91 + y * 1.73 + 3.1; x = nx; amplitude *= .48; }
    return sum;
  }
  function curvedAnnulus() {
    const positions: number[] = [], indices: number[] = [], colors: number[] = [];
    const slices = 240, rings = 72;
    for (let j = 0; j <= rings; j++) for (let i = 0; i <= slices; i++) {
      const a = i / slices * Math.PI * 2;
      const inner = .334 + .0008 * (Math.sin(a * 19) + .4 * Math.sin(a * 37));
      const r = inner + (1.12 - inner) * j / rings;
      positions.push(Math.cos(a) * r, Math.sin(a) * r, irisZ(r));
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      const cloud = Math.pow(nebula(x * 5 + Math.sin(y * 4), y * 5 + Math.cos(x * 3)), 2.1);
      const veil = Math.pow(nebula(x * 12 - 8, y * 12 + 3), 3);
      const ridge = Math.pow(Math.max(0, Math.sin(a * 137 + cloud * 17 + r * 8)), 4);
      const e = energy(r, a) * (.25 + ridge * .75);
      colors.push(.0003 + cloud * .003 + e * .001, .001 + cloud * .028 + veil * .012 + e * .047, .0006 + cloud * .018 + veil * .010 + e * .031);
      if (j < rings && i < slices) {
        const n = j * (slices + 1) + i;
        indices.push(n, n + slices + 1, n + 1, n + 1, n + slices + 1, n + slices + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)); g.setIndex(indices); g.computeVertexNormals();
    return g;
  }
  mesh("Curved iris", curvedAnnulus(), emerald, iris);
  const pupil = mesh("Recessed pupil", new THREE.SphereGeometry(.352, 80, 48), new THREE.MeshBasicMaterial({ color: 0x000302 }), iris);
  pupil.scale.z = .42; pupil.position.z = .38;
  const outerRim = mesh("Limbal ring", new THREE.TorusGeometry(1.125, .053, 12, 160), black, iris);
  outerRim.position.z = .27;

  // Hundreds of branching fibres follow the curved iris surface, including depth.
  const fibrePositions: number[] = [], fibreColors: number[] = [], sparks: number[] = [];
  const color = new THREE.Color();
  function segment(a: THREE.Vector3, b: THREE.Vector3, intensity: number) {
    fibrePositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    color.setRGB(.008 * intensity, .46 * intensity, .17 * intensity);
    fibreColors.push(color.r, color.g, color.b, color.r, color.g, color.b);
  }
  for (let i = 0; i < 560; i++) {
    const angle = i / 560 * Math.PI * 2;
    const start = .341 + random() * .065, end = .94 + random() * .17;
    const phase = random() * 6.28, strength = .09 + Math.pow(random(), 2.1) * 1.6;
    let previous: THREE.Vector3 | undefined;
    for (let j = 0; j <= 20; j++) {
      const r = start + (end - start) * j / 20;
      const a = angle + Math.sin(j * 1.9 + phase) * .009 + Math.sin(j * .57 + phase) * .024;
      const p = new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, irisZ(r) + .008 + random() * .012);
      const radial = .015 + energy(r, a) * 1.4;
      const sector = .22 + .78 * Math.abs(Math.sin(angle * 7 + .8));
      if (previous) segment(previous, p, strength * radial * sector);
      if (j > 5 && j < 18 && random() > .84) {
        const b = new THREE.Vector3(Math.cos(a + .024) * (r + .05), Math.sin(a + .024) * (r + .05), irisZ(r + .05) + .014);
        segment(p, b, strength * radial * .55);
      }
      if (j > 4 && energy(r, a) > .3 && random() > .983) sparks.push(p.x, p.y, p.z + .018);
      previous = p;
    }
  }
  const fibreGeo = new THREE.BufferGeometry();
  fibreGeo.setAttribute("position", new THREE.Float32BufferAttribute(fibrePositions, 3));
  fibreGeo.setAttribute("color", new THREE.Float32BufferAttribute(fibreColors, 3));
  const fibres = new THREE.LineSegments(fibreGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .76, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  fibres.name = "Iris filaments"; iris.add(fibres);

  // Variable-width raised strands create the luminous, organic collarette.
  const strandPos: number[] = [], strandCol: number[] = [], strandIdx: number[] = [];
  for (let strand = 0; strand < 105; strand++) {
    const angle = random() * Math.PI * 2, phase = random() * Math.PI * 2;
    const r0 = .41 + random() * .08, r1 = .76 + random() * .20;
    const width = .0018 + Math.pow(random(), 2) * .006, power = .35 + Math.pow(random(), 2) * 2.9;
    const base = strandPos.length / 3;
    for (let j = 0; j <= 24; j++) {
      const t = j / 24, r = r0 + (r1 - r0) * t;
      const a = angle + Math.sin(t * 9 + phase) * .023 + Math.sin(t * 27 + phase) * .008;
      const taper = Math.pow(Math.sin(Math.PI * t), .7);
      const intensity = power * energy(r, a) * taper;
      for (const side of [-1, 1]) {
        const aa = a + side * width * taper / r;
        strandPos.push(Math.cos(aa) * r, Math.sin(aa) * r, irisZ(r) + .021);
        strandCol.push(intensity * .016, intensity * .86, intensity * .43);
      }
      if (j < 24) { const n = base + j * 2; strandIdx.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
    }
  }
  const strandGeo = new THREE.BufferGeometry(); strandGeo.setAttribute("position", new THREE.Float32BufferAttribute(strandPos, 3)); strandGeo.setAttribute("color", new THREE.Float32BufferAttribute(strandCol, 3)); strandGeo.setIndex(strandIdx); strandGeo.computeVertexNormals();
  mesh("Raised emerald strands", strandGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), iris);
  const sparksGeo = new THREE.BufferGeometry(); sparksGeo.setAttribute("position", new THREE.Float32BufferAttribute(sparks, 3));
  const stars = new THREE.Points(sparksGeo, new THREE.PointsMaterial({ color: new THREE.Color(0x62ffb9).multiplyScalar(3), size: .019, sizeAttenuation: true, toneMapped: false }));
  stars.name = "Iris sparks"; iris.add(stars);

  // Irregular connected cells, rather than an even radial pattern.
  const webPositions: number[] = [], webColors: number[] = [];
  const webNodes: THREE.Vector3[][] = [];
  for (let ring = 0; ring < 6; ring++) {
    webNodes[ring] = [];
    for (let i = 0; i < 64; i++) {
      const a = (i + (ring % 2) * .45 + (random() - .5) * .95) / 64 * Math.PI * 2;
      const r = .46 + ring * .105 + (random() - .5) * .14;
      webNodes[ring].push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, irisZ(r) + .026));
    }
  }
  function webLink(a: THREE.Vector3, b: THREE.Vector3) {
    const strength = (.14 + random() * .8) * (.20 + energy(Math.hypot(a.x, a.y), Math.atan2(a.y, a.x)));
    webPositions.push(a.x, a.y, a.z, b.x, b.y, b.z);
    for (let j = 0; j < 2; j++) webColors.push(.006 * strength, .42 * strength, .28 * strength);
  }
  webNodes.forEach((ring, row) => ring.forEach((p, i) => {
    if (random() > .43) webLink(p, ring[(i + 1) % ring.length]);
    if (row < webNodes.length - 1 && random() > .32) webLink(p, webNodes[row + 1][i]);
    if (row < webNodes.length - 1 && random() > .79) webLink(p, webNodes[row + 1][(i + 1) % ring.length]);
    if (i % 11 === row && row > 0 && row < 5) {
      const node = mesh("Iris light node", new THREE.SphereGeometry(.007 + random() * .006, 8, 6), light, iris);
      node.position.copy(p); node.position.z += .012;
    }
  }));
  const webGeo = new THREE.BufferGeometry(); webGeo.setAttribute("position", new THREE.Float32BufferAttribute(webPositions, 3)); webGeo.setAttribute("color", new THREE.Float32BufferAttribute(webColors, 3));
  const web = new THREE.LineSegments(webGeo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: .70, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  web.name = "Crossing iris branches"; iris.add(web);

  const dustPositions: number[] = [], dustColors: number[] = [];
  for (let i = 0; i < 620; i++) {
    const a = random() * Math.PI * 2, r = Math.sqrt(.18 + random() * 1.03);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (nebula(x * 6, y * 6) < .32) continue;
    dustPositions.push(x, y, irisZ(r) + .025 + random() * .045);
    const warm = random() > .94, brightness = .08 + Math.pow(random(), 4) * 1.2;
    dustColors.push(brightness * (warm ? .92 : .22), brightness * .85, brightness * (warm ? .47 : .59));
  }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute("position", new THREE.Float32BufferAttribute(dustPositions, 3)); dustGeo.setAttribute("color", new THREE.Float32BufferAttribute(dustColors, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ vertexColors: true, size: .007, transparent: true, opacity: .62, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  dust.name = "Cosmic iris depth"; iris.add(dust);

  // The lens is an open, shallow dome; it does not enclose the eye in a sphere.
  const lensGeo = new THREE.SphereGeometry(1.145, 80, 40, 0, Math.PI * 2, 0, Math.PI / 2);
  lensGeo.rotateX(Math.PI / 2);
  const lens = mesh("Corneal lens", lensGeo, new THREE.MeshPhysicalMaterial({ color: 0x64af95, metalness: 0, roughness: .055, specularIntensity: .05, transparent: true, opacity: .008, clearcoat: .012, clearcoatRoughness: .09, envMapIntensity: .03, depthWrite: false }), iris);
  lens.scale.z = .34; lens.position.z = .29;

  // A softly feathered reflection follows the actual curved glass surface.
  // Upper-right placement and a smaller pupil glint echo the source photograph.
  function reflection(name: string, r0: number, r1: number, a0: number, a1: number, strength: number, surface: (r: number) => number, parent: THREE.Object3D = iris) {
    const pos: number[] = [], col: number[] = [], idx: number[] = [];
    const rows = 18, cols = 48;
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) {
      const u = i / cols, v = j / rows, r = r0 + (r1 - r0) * v, a = a0 + (a1 - a0) * u;
      const fade = Math.pow(Math.sin(Math.PI * u), .65) * Math.pow(Math.sin(Math.PI * v), 1.6) * strength;
      pos.push(Math.cos(a) * r, Math.sin(a) * r, surface(r));
      col.push(fade * .65, fade * .94, fade);
      if (i < cols && j < rows) { const n = j * (cols + 1) + i; idx.push(n, n + cols + 1, n + 1, n + 1, n + cols + 1, n + cols + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
    g.computeVertexNormals();
    mesh(name, g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .70, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }), parent);
  }
  reflection("Upper-right corneal reflection", .81, 1.07, .22, 1.14, .50, r => .295 + .34 * Math.sqrt(1.145 ** 2 - r * r));
  reflection("Pupil glass glint", .24, .336, -.04, .97, .065, r => Math.sqrt(.352 ** 2 - r * r) + .004, pupil);

  // Tapered oval cross-sections form separate upper/lower sculpted metal blades.
  function blade(sign: number, layer: number) {
    const pts: number[] = [], idx: number[] = [], edge: THREE.Vector3[] = [];
    const steps = 112, cross = 12;
    const center = (t: number) => new THREE.Vector3(
      (t * 2 - 1) * (1.76 + layer * .085),
      sign * Math.pow(Math.max(0, Math.sin(Math.PI * t)), .84 + layer * .04) * (1.075 + layer * .13),
      .22 - layer * .14 + Math.sin(Math.PI * t) * .10,
    );
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, c = center(t);
      const tangent = center(Math.min(1, t + .001)).sub(center(Math.max(0, t - .001))).normalize();
      const n = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
      const taper = .05 + Math.pow(Math.sin(Math.PI * t), .7);
      const width = (.135 + layer * .018) * taper;
      for (let j = 0; j <= cross; j++) {
        const a = j / cross * Math.PI * 2;
        pts.push(c.x + n.x * Math.cos(a) * width, c.y + n.y * Math.cos(a) * width, c.z + Math.sin(a) * .078 * taper);
        if (i < steps && j < cross) {
          const k = i * (cross + 1) + j;
          idx.push(k, k + 1, k + cross + 1, k + 1, k + cross + 2, k + cross + 1);
        }
      }
      edge.push(c.clone().addScaledVector(n, sign * width * .75).add(new THREE.Vector3(0, 0, .035 * taper)));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3)); g.setIndex(idx); g.computeVertexNormals();
    mesh(`${sign > 0 ? "Upper" : "Lower"} blade ${layer + 1}`, g, layer % 2 ? black : metal);
    if (layer === 0 || layer === 2) mesh("Subtle blade edge", new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge), 112, .0035, 5, false), silver);
  }
  for (let layer = 0; layer < 3; layer++) { blade(1, layer); blade(-1, layer); }

  const bodyShape = new THREE.Shape();
  bodyShape.moveTo(-1.77, 0);
  bodyShape.bezierCurveTo(-.83, 1.30, .83, 1.30, 1.77, 0);
  bodyShape.bezierCurveTo(.83, -1.30, -.83, -1.30, -1.77, 0);
  const body = mesh("Solid almond housing", new THREE.ExtrudeGeometry(bodyShape, { depth: .22, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: .06, bevelThickness: .10, curveSegments: 64 }), black);
  body.position.z = -.26;

  const orbitGroups: THREE.Group[] = [];
  const satellites: { mesh: THREE.Mesh; radius: number; phase: number; speed: number }[] = [];
  const satelliteGeo = new THREE.SphereGeometry(.10, 24, 16);
  for (let i = 0; i < 3; i++) {
    const orbit = new THREE.Group(); orbit.name = `Orbit ${i + 1}`;
    orbit.rotation.set(.87 + i * .27, -.30 + i * .21, -.42 + i * .58);
    const radius = 2.00 + i * .24;
    mesh("Orbital filament", new THREE.TorusGeometry(radius, .008, 6, 180), silver, orbit);
    for (let j = 0; j < 2; j++) {
      const satellite = mesh("Metal satellite", satelliteGeo, metal, orbit);
      satellite.scale.setScalar(.75 + i * .23 + j * .18);
      const beacon = mesh("Emerald beacon", new THREE.SphereGeometry(.024, 10, 8), light, satellite); beacon.position.z = .083;
      const phase = j * Math.PI + i * 1.8;
      satellite.position.set(Math.cos(phase) * radius, Math.sin(phase) * radius, 0);
      satellites.push({ mesh: satellite, radius, phase, speed: (i % 2 ? -1 : 1) * (.12 + i * .025) });
    }
    root.add(orbit); orbitGroups.push(orbit);
  }
  // Vertical jewel and spine from the source silhouette.
  const spine = mesh("Vertical spine", new THREE.CylinderGeometry(.006, .006, 3.65, 8), silver);
  spine.position.z = -.36;
  for (const y of [-1.72, 1.72]) {
    const jewel = mesh("Spine jewel", satelliteGeo, metal); jewel.position.set(0, y, -.36); jewel.scale.setScalar(.80);
    const glint = mesh("Jewel light", new THREE.SphereGeometry(.025, 10, 8), light); glint.position.set(0, y, -.28);
  }
  return { root, iris, pupil, satellites, orbitGroups };
}
