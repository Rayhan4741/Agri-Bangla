import * as THREE from 'three';

export type PresetId = 'sunrise' | 'monsoon' | 'harvest' | 'dusk';

export interface ScenePreset {
  id: PresetId;
  labelBn: string;
  hintBn: string;
  sunDir: [number, number, number];
  sunColor: string;
  sunIntensity: number;
  zenith: string;
  horizon: string;
  fog: string;
  fogDensity: number;
  cloudCover: number;
  cloudColor: string;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  riceBase: string;
  riceTip: string;
  panicle: number;
  panicleColor: string;
  water: number;
  wind: number;
  rain: number;
  mist: number;
}

export const PRESETS: Record<PresetId, ScenePreset> = {
  sunrise: {
    id: 'sunrise',
    labelBn: 'ভোর',
    hintBn: 'আমন মৌসুম · সূর্যোদয়',
    sunDir: [0.12, 0.075, -1],
    sunColor: '#ffc88a',
    sunIntensity: 2.4,
    zenith: '#4f80bf',
    horizon: '#f8c991',
    fog: '#e8c9a0',
    fogDensity: 0.0075,
    cloudCover: 0.42,
    cloudColor: '#ffe2c4',
    hemiSky: '#b9cde0',
    hemiGround: '#5b4a2f',
    hemiIntensity: 0.55,
    riceBase: '#2a5a1f',
    riceTip: '#a0d25e',
    panicle: 0,
    panicleColor: '#c9b25a',
    water: 1,
    wind: 1,
    rain: 0,
    mist: 1,
  },
  monsoon: {
    id: 'monsoon',
    labelBn: 'বর্ষা',
    hintBn: 'আমন রোপণ · বৃষ্টির দিন',
    sunDir: [0.2, 0.55, -0.7],
    sunColor: '#d9e2e6',
    sunIntensity: 0.9,
    zenith: '#5f6f7c',
    horizon: '#b6c0c3',
    fog: '#a8b3b6',
    fogDensity: 0.016,
    cloudCover: 0.92,
    cloudColor: '#9aa6ad',
    hemiSky: '#c3ccd0',
    hemiGround: '#3e3d2c',
    hemiIntensity: 0.95,
    riceBase: '#1b4719',
    riceTip: '#5fae46',
    panicle: 0,
    panicleColor: '#9fb553',
    water: 1,
    wind: 1.7,
    rain: 1,
    mist: 0.6,
  },
  harvest: {
    id: 'harvest',
    labelBn: 'ফসল কাটা',
    hintBn: 'বোরো মৌসুম · পাকা ধান',
    sunDir: [0.35, 0.62, -0.55],
    sunColor: '#fff1d6',
    sunIntensity: 2.6,
    zenith: '#2f78bf',
    horizon: '#cfe0e8',
    fog: '#cfdde2',
    fogDensity: 0.0042,
    cloudCover: 0.28,
    cloudColor: '#ffffff',
    hemiSky: '#cfe2f0',
    hemiGround: '#7a6440',
    hemiIntensity: 0.7,
    riceBase: '#6d7a26',
    riceTip: '#e0b651',
    panicle: 1,
    panicleColor: '#d9a238',
    water: 0,
    wind: 0.8,
    rain: 0,
    mist: 0,
  },
  dusk: {
    id: 'dusk',
    labelBn: 'গোধূলি',
    hintBn: 'সন্ধ্যার আলো',
    sunDir: [-0.3, 0.06, -1],
    sunColor: '#ff9a5c',
    sunIntensity: 1.9,
    zenith: '#2d3b6b',
    horizon: '#f08b5e',
    fog: '#c98668',
    fogDensity: 0.009,
    cloudCover: 0.45,
    cloudColor: '#f6a688',
    hemiSky: '#8c8fb5',
    hemiGround: '#4a3526',
    hemiIntensity: 0.45,
    riceBase: '#24451b',
    riceTip: '#86a84c',
    panicle: 0.35,
    panicleColor: '#c49a4a',
    water: 1,
    wind: 0.9,
    rain: 0,
    mist: 0.8,
  },
};

/** Pick a sensible default from the calendar month (Bangladesh seasons). */
export function presetForDate(d = new Date()): PresetId {
  const m = d.getMonth() + 1;
  if (m >= 6 && m <= 9) return 'monsoon';
  if (m >= 4 && m <= 5) return 'harvest';
  return 'sunrise';
}

/** Uniforms shared by every custom material in the scene so a preset change animates everything together. */
export function createSharedUniforms() {
  return {
    uTime: { value: 0 },
    uSunDir: { value: new THREE.Vector3(-0.4, 0.1, -1).normalize() },
    uSunColor: { value: new THREE.Color('#ffc88a') },
    uZenith: { value: new THREE.Color('#3f6ea8') },
    uHorizon: { value: new THREE.Color('#f6c58f') },
    uCloudCover: { value: 0.4 },
    uCloudColor: { value: new THREE.Color('#ffe2c4') },
    uRiceBase: { value: new THREE.Color('#22501d') },
    uRiceTip: { value: new THREE.Color('#93c95b') },
    uPanicle: { value: 0 },
    uPanicleColor: { value: new THREE.Color('#c9b25a') },
    uWater: { value: 1 },
    uWind: { value: 1 },
    uRain: { value: 0 },
    uMist: { value: 1 },
  };
}

export type SharedUniforms = ReturnType<typeof createSharedUniforms>;

/** Deterministic PRNG so the field looks identical on every load. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The raised earthen path (আইল) the camera stands on; returns its x for a given z. */
export function pathX(z: number) {
  return 1.1 + Math.sin(z * 0.045) * 3.2 + Math.sin(z * 0.013 + 1.3) * 2.2;
}

export const PLOT_W = 14;
export const PLOT_D = 11;
export const FIELD = { xMin: -34, xMax: 34, zMin: -72, zMax: 7 };

/** True when (x,z) sits on a bund between plots or on the main path. */
export function isOnBundOrPath(x: number, z: number, margin = 0) {
  if (Math.abs(x - pathX(z)) < 0.95 + margin) return true;
  const bx = ((x % PLOT_W) + PLOT_W) % PLOT_W;
  const bz = ((z % PLOT_D) + PLOT_D) % PLOT_D;
  const half = 0.32 + margin;
  return bx < half || bx > PLOT_W - half || bz < half || bz > PLOT_D - half;
}

/** Shared GLSL helpers */
export const GLSL_NOISE = /* glsl */ `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), u.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0; float a = 0.5; for(int i=0;i<5;i++){ v += a*vnoise(p); p = p*2.03 + 17.1; a *= 0.5; } return v; }
`;

export const GLSL_SKY = /* glsl */ `
vec3 skyColor(vec3 dir, vec3 sunDir, vec3 zenith, vec3 horizon, vec3 sunColor){
  float h = max(dir.y, 0.0);
  vec3 col = mix(horizon, zenith, pow(h, 0.36));
  float s = max(dot(dir, sunDir), 0.0);
  col += sunColor * (pow(s, 4.0) * 0.5 + pow(s, 32.0) * 0.9 + pow(s, 400.0) * 2.0);
  return col;
}
`;
