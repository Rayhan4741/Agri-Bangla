import { useMemo } from 'react';
import * as THREE from 'three';
import { FIELD, GLSL_NOISE, GLSL_SKY, PLOT_D, PLOT_W, pathX, type SharedUniforms } from './presets';

/** Ground that becomes a shallow paddy water surface (sky reflections + sun glitter) when uWater = 1. */
function useGroundMaterial(u: SharedUniforms) {
  return useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      fog: true,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog]) as Record<string, THREE.IUniform>,
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        #include <fog_pars_vertex>
        void main(){
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          vec4 mvPosition = viewMatrix * world;
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uWater; uniform float uRain;
        uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uZenith; uniform vec3 uHorizon;
        uniform float uCloudCover; uniform float uWind; uniform float uPanicle;
        uniform vec3 uRiceBase; uniform vec3 uRiceTip; uniform vec3 uPanicleColor;
        varying vec3 vWorld;
        #include <fog_pars_fragment>
        ${GLSL_NOISE}
        ${GLSL_SKY}
        // mirrors pathX() / isOnBundOrPath() in presets.ts
        float pathX(float z){ return 1.1 + sin(z * 0.045) * 3.2 + sin(z * 0.013 + 1.3) * 2.2; }
        float plantedMask(vec2 p){
          float onPath = 1.0 - smoothstep(0.95, 1.25, abs(p.x - pathX(p.y)));
          float bx = mod(p.x, 14.0); float bz = mod(p.y, 11.0);
          float edge = min(min(bx, 14.0 - bx), min(bz, 11.0 - bz));
          float onBund = 1.0 - smoothstep(0.3, 0.5, edge);
          float halfW = max(34.0, 22.0 + (8.0 - p.y) * 1.05);
          float inField = smoothstep(7.5, 6.0, p.y) * smoothstep(-82.0, -70.0, p.y) * smoothstep(halfW + 2.0, halfW - 2.0, abs(p.x));
          return inField * (1.0 - max(onPath, onBund));
        }
        void main(){
          vec2 p = vWorld.xz;
          vec3 sunDir = normalize(uSunDir);
          // soil
          float n = fbm(p * 0.35);
          float fine = vnoise(p * 6.0);
          vec3 wetSoil = mix(vec3(0.16, 0.12, 0.08), vec3(0.25, 0.19, 0.12), n);
          vec3 drySoil = mix(vec3(0.42, 0.33, 0.21), vec3(0.58, 0.47, 0.31), n) * (0.85 + fine * 0.2);
          // harvested stubble streaks for the dry season
          float stubble = smoothstep(0.55, 0.9, vnoise(vec2(p.x * 9.0, p.y * 0.8)));
          drySoil = mix(drySoil, vec3(0.62, 0.52, 0.3), stubble * 0.35);
          vec3 soil = mix(drySoil, wetSoil, uWater);
          float diff = max(sunDir.y, 0.05);
          vec3 col = soil * (uSunColor * diff * 0.9 + mix(uHorizon, uZenith, 0.5) * 0.25);

          // paddy water
          vec3 viewDir = normalize(cameraPosition - vWorld);
          vec2 rp = p * 1.6;
          float t = uTime;
          vec3 nrm = normalize(vec3(
            (vnoise(rp + t * 0.45) - 0.5) * 0.16 + sin(p.x * 3.1 + t * 1.7) * 0.02,
            1.0,
            (vnoise(rp.yx - t * 0.4) - 0.5) * 0.16 + cos(p.y * 2.7 + t * 1.3) * 0.02));
          // rain ripples
          float rr = vnoise(p * 3.0 + floor(t * 4.0));
          nrm.xz += uRain * (rr - 0.5) * 0.35;
          nrm = normalize(nrm);
          vec3 refl = reflect(-viewDir, nrm);
          refl.y = abs(refl.y);
          vec3 skyRefl = skyColor(refl, sunDir, uZenith, uHorizon, uSunColor);
          skyRefl = mix(skyRefl, mix(uHorizon, vec3(0.75), 0.4), uCloudCover * 0.4);
          float fres = 0.04 + 0.96 * pow(1.0 - max(dot(viewDir, nrm), 0.0), 5.0);
          vec3 waterBase = vec3(0.035, 0.055, 0.04) + soil * 0.2;
          vec3 water = mix(waterBase, skyRefl, clamp(fres * 1.15, 0.0, 1.0));
          float spec = pow(max(dot(refl, sunDir), 0.0), 380.0) * 18.0 + pow(max(dot(refl, sunDir), 0.0), 40.0) * 0.6;
          water += uSunColor * spec * (1.0 - uCloudCover * 0.8);
          col = mix(col, water, uWater);

          // rice canopy carpet: at a distance a paddy reads as one dense, softly rippling surface.
          // It fills the gaps between instanced clumps so the field looks lush to the horizon.
          float dist = length(cameraPosition.xz - p);
          float planted = plantedMask(p);
          float cover = planted * mix(0.18, 0.97, smoothstep(5.0, 28.0, dist));
          vec2 plotId = floor(p / vec2(14.0, 11.0));
          float plotR = hash12(plotId + 7.31);
          float tex = fbm(p * 1.7) * 0.6 + vnoise(p * 9.0) * 0.4;
          vec3 canopy = mix(uRiceBase, uRiceTip, 0.35 + tex * 0.45);
          canopy *= mix(vec3(0.9, 1.0, 0.92), vec3(1.08, 1.02, 0.84), plotR);
          canopy = mix(canopy, uPanicleColor, uPanicle * (0.45 + plotR * 0.35));
          vec2 windDir = normalize(vec2(0.75, -0.66));
          float wave = sin(dot(p, windDir) * 0.32 - uTime * 1.9) * 0.5 + 0.5;
          float gust = fbm(p * 0.06 + windDir * uTime * 0.35);
          float sheen = smoothstep(0.18, 0.62, wave * gust) * uWind;
          vec3 viewDir2 = normalize(cameraPosition - vWorld);
          float back = pow(max(dot(viewDir2, -sunDir), 0.0), 3.0);
          float lightAmt = max(sunDir.y, 0.08) * 0.7 + 0.3;
          vec3 canopyLit = canopy * (uSunColor * lightAmt + mix(uHorizon, uZenith, 0.5) * 0.22);
          canopyLit += canopy * uSunColor * back * 0.9;
          canopyLit += mix(canopy, vec3(0.85, 0.9, 0.7), 0.5) * sheen * 0.35 * lightAmt;
          // darker crevices between rows, lighter crowns
          canopyLit *= 0.78 + tex * 0.32;
          col = mix(col, canopyLit, cover);
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
    });
    Object.assign(mat.uniforms, {
      uTime: u.uTime,
      uWater: u.uWater,
      uRain: u.uRain,
      uSunDir: u.uSunDir,
      uSunColor: u.uSunColor,
      uZenith: u.uZenith,
      uHorizon: u.uHorizon,
      uCloudCover: u.uCloudCover,
      uWind: u.uWind,
      uPanicle: u.uPanicle,
      uRiceBase: u.uRiceBase,
      uRiceTip: u.uRiceTip,
      uPanicleColor: u.uPanicleColor,
    });
    return mat;
  }, [u]);
}

/** A small procedural earth texture for bunds and the path. */
function useEarthTexture() {
  return useMemo(() => {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#7b6143';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random() * 2.2;
      const l = 30 + Math.random() * 30;
      ctx.fillStyle = `hsla(${28 + Math.random() * 14}, ${30 + Math.random() * 20}%, ${l}%, ${0.25 + Math.random() * 0.4})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // grass tufts along the edges
    for (let i = 0; i < 900; i++) {
      const edge = Math.random() < 0.5 ? Math.random() * 46 : size - Math.random() * 46;
      const y = Math.random() * size;
      ctx.strokeStyle = `hsla(${85 + Math.random() * 30}, 45%, ${24 + Math.random() * 20}%, .8)`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(edge, y);
      ctx.lineTo(edge + (Math.random() - 0.5) * 8, y - 4 - Math.random() * 6);
      ctx.stroke();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
}

function buildPathGeometry() {
  const pts: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];
  const zStart = 14;
  const zEnd = -95;
  const steps = 220;
  const halfW = 0.8;
  for (let i = 0; i <= steps; i++) {
    const z = zStart + (zEnd - zStart) * (i / steps);
    const x = pathX(z);
    const dx = pathX(z - 0.1) - x;
    const nx = 1;
    const nz = dx / 0.1;
    const len = Math.hypot(nx, nz);
    const ox = (nx / len) * halfW;
    const oz = (nz / len) * halfW;
    // shallow mound profile: edge low, centre raised
    const profile = [
      [-1.25, 0.02],
      [-1, 0.14],
      [0, 0.2],
      [1, 0.14],
      [1.25, 0.02],
    ];
    for (const [f, h] of profile) {
      pts.push(x + ox * f, h, z + oz * f);
      uvs.push((f + 1.25) / 2.5, (i / steps) * 60);
    }
  }
  const cols = 5;
  for (let i = 0; i < steps; i++) {
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j;
      const b = a + cols;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function buildBunds() {
  const boxes: { x: number; z: number; w: number; d: number }[] = [];
  // bunds running along x (constant z)
  const half = (z: number) => Math.max(FIELD.xMax, 22 + (8 - z) * 1.05);
  for (let z = Math.ceil(FIELD.zMin / PLOT_D) * PLOT_D; z <= FIELD.zMax; z += PLOT_D) {
    boxes.push({ x: 0, z, w: half(z) * 2, d: 0.55 });
  }
  // bunds running along z (constant x) — only where the field reaches that far out
  const maxHalf = half(FIELD.zMin);
  for (let x = -Math.floor(maxHalf / PLOT_W) * PLOT_W; x <= maxHalf; x += PLOT_W) {
    const ax = Math.abs(x);
    const zTop = ax <= FIELD.xMax ? FIELD.zMax : Math.min(FIELD.zMax, 8 - (ax - 22) / 1.05);
    if (zTop <= FIELD.zMin) continue;
    boxes.push({ x, z: (FIELD.zMin + zTop) / 2, w: 0.55, d: zTop - FIELD.zMin });
  }
  return boxes;
}

export function Terrain({ u }: { u: SharedUniforms }) {
  const groundMat = useGroundMaterial(u);
  const earth = useEarthTexture();
  const pathGeo = useMemo(buildPathGeometry, []);
  const bunds = useMemo(buildBunds, []);
  const bundTex = useMemo(() => {
    if (!earth) return null;
    const t = earth.clone();
    t.needsUpdate = true;
    t.repeat.set(1, 40);
    return t;
  }, [earth]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} material={groundMat} position={[0, 0, -60]}>
        <planeGeometry args={[420, 260, 1, 1]} />
      </mesh>
      <mesh geometry={pathGeo}>
        <meshStandardMaterial map={earth ?? undefined} color="#d4b48a" emissive="#3a2a18" emissiveIntensity={0.45} roughness={0.95} />
      </mesh>
      {bunds.map((b, i) => (
        <mesh key={i} position={[b.x, 0.07, b.z]}>
          <boxGeometry args={[b.w, 0.16, b.d]} />
          <meshStandardMaterial map={bundTex ?? undefined} color="#a2a06a" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}
