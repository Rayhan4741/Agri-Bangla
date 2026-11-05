import { useMemo } from 'react';
import * as THREE from 'three';
import { FIELD, GLSL_NOISE, isOnBundOrPath, mulberry32, type SharedUniforms } from './presets';

/**
 * Builds one rice "hill" (a transplanted clump): several arching leaf blades,
 * a central stem and drooping panicles that only appear when uPanicle > 0.
 */
function makeClumpGeometry(seed: number, blades = 7, segments = 4) {
  const rnd = mulberry32(seed);
  const pos: number[] = [];
  const nor: number[] = [];
  const aH: number[] = [];
  const aPan: number[] = [];
  const idx: number[] = [];

  const addStrip = (
    pts: THREE.Vector3[],
    widths: number[],
    side: THREE.Vector3,
    heights: number[],
    panicle: number,
  ) => {
    const base = pos.length / 3;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const w = widths[i];
      const tangent = i < pts.length - 1 ? pts[i + 1].clone().sub(p) : p.clone().sub(pts[i - 1]);
      const n = side.clone().cross(tangent).normalize();
      if (n.y < 0) n.negate();
      pos.push(p.x - side.x * w, p.y - side.y * w, p.z - side.z * w);
      pos.push(p.x + side.x * w, p.y + side.y * w, p.z + side.z * w);
      nor.push(n.x, n.y, n.z, n.x, n.y, n.z);
      aH.push(heights[i], heights[i]);
      aPan.push(panicle, panicle);
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = base + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  };

  // Leaf blades
  for (let b = 0; b < blades; b++) {
    const ang = (b / blades) * Math.PI * 2 + rnd() * 0.9;
    const dir = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const h = 0.7 + rnd() * 0.32;
    const lean = 0.12 + rnd() * 0.32;
    const droop = rnd() * 0.18;
    const pts: THREE.Vector3[] = [];
    const ws: number[] = [];
    const hs: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const out = lean * t * t + 0.02;
      const y = h * t - droop * t * t * t;
      pts.push(new THREE.Vector3(dir.x * out, y, dir.z * out));
      ws.push(0.014 * (1 - t * 0.9) + 0.0008);
      hs.push(y / 1.05);
    }
    addStrip(pts, ws, side, hs, 0);
  }

  // Central stems + panicles (collapsed unless uPanicle > 0)
  for (let k = 0; k < 3; k++) {
    const ang = rnd() * Math.PI * 2;
    const dir = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const top = 0.92 + rnd() * 0.12;
    const pts: THREE.Vector3[] = [];
    const ws: number[] = [];
    const hs: number[] = [];
    const segs = 5;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      // arc that rises then droops under the weight of grain
      const out = 0.05 + t * 0.2;
      const y = top + Math.sin(t * Math.PI * 0.55) * 0.07 - t * t * 0.26;
      pts.push(new THREE.Vector3(dir.x * out, y, dir.z * out));
      ws.push(0.016 * (1 - t * 0.6));
      hs.push(Math.min(y / 1.05, 1));
    }
    addStrip(pts, ws, side, hs, 1);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('aH', new THREE.Float32BufferAttribute(aH, 1));
  g.setAttribute('aPan', new THREE.Float32BufferAttribute(aPan, 1));
  g.setIndex(idx);
  return g;
}

function makeRiceMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog]) as Record<string, THREE.IUniform>,
    vertexShader: /* glsl */ `
      attribute float aH; attribute float aPan; attribute float aRand;
      uniform float uTime; uniform float uWind; uniform float uPanicle;
      varying float vH; varying float vRand; varying vec3 vNormal; varying vec3 vWorld; varying float vPan;
      varying float vPlot; varying float vSheen;
      #include <fog_pars_vertex>
      ${GLSL_NOISE}
      void main(){
        vec3 p = position;
        // collapse panicles to the stem top when not in season
        if (aPan > 0.5) { p = mix(vec3(0.0, 0.92, 0.0), p, uPanicle); }
        vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
        float h = aH;
        // every plot (between bunds) was transplanted on a different day: vary height + tint per plot
        vec2 plotId = floor(world.xz / vec2(14.0, 11.0));
        float plotR = hash12(plotId + 7.31);
        world.y *= 0.8 + plotR * 0.34;
        vPlot = plotR;
        // rolling gusts travelling across the field
        vec2 wp = world.xz;
        vec2 windDir = normalize(vec2(0.75, -0.66));
        float wave = sin(dot(wp, windDir) * 0.32 - uTime * 1.9) * 0.5 + 0.5;
        float gust = fbm(wp * 0.06 + windDir * uTime * 0.35);
        float flutter = sin(uTime * 5.5 + aRand * 31.0 + wp.x * 2.0) * 0.035;
        float bend = uWind * (0.06 + 0.22 * wave * gust + flutter) * h * h;
        vSheen = wave * gust * h;
        world.xz += windDir * bend;
        world.y -= bend * bend * 0.6;
        vH = h; vRand = aRand; vPan = aPan;
        vNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        vWorld = world.xyz;
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uRiceBase; uniform vec3 uRiceTip;
      uniform vec3 uPanicleColor; uniform vec3 uZenith; uniform vec3 uHorizon;
      uniform float uWind; uniform float uPanicle;
      varying float vH; varying float vRand; varying vec3 vNormal; varying vec3 vWorld; varying float vPan;
      varying float vPlot; varying float vSheen;
      #include <fog_pars_fragment>
      void main(){
        vec3 n = normalize(vNormal);
        if (!gl_FrontFacing) n = -n;
        vec3 sunDir = normalize(uSunDir);
        vec3 viewDir = normalize(cameraPosition - vWorld);
        vec3 base = mix(uRiceBase * 0.55, uRiceBase, smoothstep(0.0, 0.35, vH));
        vec3 col = mix(base, uRiceTip, smoothstep(0.25, 1.0, vH) * (0.75 + vRand * 0.25));
        col *= 0.86 + vRand * 0.26;
        // plot-to-plot tint: some plots bluish-green and lush, others a touch yellower / riper
        col *= mix(vec3(0.9, 1.0, 0.92), vec3(1.08, 1.02, 0.84), vPlot);
        col = mix(col, uPanicleColor, uPanicle * vPlot * 0.25 * smoothstep(0.3, 1.0, vH));
        col = mix(col, uPanicleColor * (0.85 + vRand * 0.3), vPan);
        float diff = max(dot(n, sunDir), 0.0) * 0.55 + 0.45;
        // translucency: leaves glow when the sun is behind them
        float back = pow(max(dot(viewDir, -sunDir), 0.0), 3.0);
        vec3 trans = uSunColor * back * vH * (0.55 + 0.45 * (1.0 - vPan)) * 0.75;
        // sky ambient
        vec3 amb = mix(uHorizon, uZenith, 0.5) * 0.3 + uSunColor * 0.06;
        float ao = mix(0.42, 1.0, smoothstep(0.0, 0.7, vH));
        // waxy leaf surface: soft specular glint
        vec3 hv = normalize(sunDir + viewDir);
        float spec = pow(max(dot(n, hv), 0.0), 28.0) * 0.35 * vH;
        // leaves bending in a gust flash their paler undersides: the rolling "waves" over a paddy
        float sheen = smoothstep(0.15, 0.6, vSheen) * uWind * 0.32;
        vec3 lit = col * (uSunColor * diff * 0.95 + amb) * ao + trans * col * 1.6;
        lit += uSunColor * spec + mix(col, vec3(0.85, 0.9, 0.7), 0.5) * sheen * diff;
        gl_FragColor = vec4(lit, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

interface Band {
  zFrom: number;
  zTo: number;
  spacing: number;
  scale: number;
}

function buildInstances(bands: Band[], density: number, seed: number) {
  const rnd = mulberry32(seed);
  const mats: THREE.Matrix4[] = [];
  const rands: number[] = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  for (const band of bands) {
    const sp = band.spacing / Math.sqrt(density);
    for (let z = band.zTo; z > band.zFrom; z -= sp) {
      // the visible field widens with distance (perspective), so extend rows outward
      const half = Math.max(FIELD.xMax, 22 + (8 - z) * 1.05);
      for (let x = -half; x < half; x += sp) {
        const jx = x + (rnd() - 0.5) * sp * 0.35;
        const jz = z + (rnd() - 0.5) * sp * 0.25;
        if (isOnBundOrPath(jx, jz, 0.08)) continue;
        // patches with slightly sparser/shorter growth make it look natural
        const patch = Math.sin(jx * 0.21) * Math.cos(jz * 0.17);
        const h = band.scale * (0.82 + rnd() * 0.24 + patch * 0.06);
        p.set(jx, 0, jz);
        q.setFromAxisAngle(up, rnd() * Math.PI * 2);
        s.set(band.scale * (0.9 + rnd() * 0.3), h, band.scale * (0.9 + rnd() * 0.3));
        m.compose(p, q, s);
        mats.push(m.clone());
        rands.push(rnd());
      }
    }
  }
  return { mats, rands };
}

export function RiceField({ u, density = 1 }: { u: SharedUniforms; density?: number }) {
  const meshes = useMemo(() => {
    const material = makeRiceMaterial();
    // bind shared uniforms by reference so preset transitions animate the field
    Object.assign(material.uniforms, {
      uTime: u.uTime,
      uWind: u.uWind,
      uPanicle: u.uPanicle,
      uSunDir: u.uSunDir,
      uSunColor: u.uSunColor,
      uRiceBase: u.uRiceBase,
      uRiceTip: u.uRiceTip,
      uPanicleColor: u.uPanicleColor,
      uZenith: u.uZenith,
      uHorizon: u.uHorizon,
    });

    const bands: Band[][] = [
      [{ zFrom: -16, zTo: FIELD.zMax, spacing: 0.34, scale: 1 }],
      [{ zFrom: -40, zTo: -16, spacing: 0.56, scale: 1.25 }],
      [{ zFrom: FIELD.zMin, zTo: -40, spacing: 0.95, scale: 1.7 }],
    ];
    const blades = [8, 6, 5];
    return bands.map((b, i) => {
      const geo = makeClumpGeometry(11 + i, blades[i], i === 0 ? 4 : 3);
      const { mats, rands } = buildInstances(b, density, 101 + i * 7);
      geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(new Float32Array(rands), 1));
      const mesh = new THREE.InstancedMesh(geo, material, mats.length);
      mats.forEach((mm, k) => mesh.setMatrixAt(k, mm));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.frustumCulled = false;
      return mesh;
    });
  }, [u, density]);

  return (
    <group>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </group>
  );
}
