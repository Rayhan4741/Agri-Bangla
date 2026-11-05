import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, Noise, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { BlendFunction, ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { PRESETS, createSharedUniforms, pathX, type PresetId, type SharedUniforms } from './scene/presets';
import { SkyDome } from './scene/SkyDome';
import { RiceField } from './scene/RiceField';
import { Terrain } from './scene/Terrain';
import { Vegetation } from './scene/Vegetation';
import { Life } from './scene/Life';
import { Mist, Motes, Rain } from './scene/Atmosphere';

const MOTE_CENTER: [number, number, number] = [pathX(-4), 1.4, -4];

interface Props {
  preset: PresetId;
  active: boolean;
  quality: number;
  onReady?: () => void;
}

/** Smoothly animates every shared uniform, light and the fog toward the chosen preset. */
function Director({ u, preset, onReady }: { u: SharedUniforms; preset: PresetId; onReady?: () => void }) {
  const { scene, camera } = useThree();
  const sun = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const readyFired = useRef(false);
  const targets = useMemo(() => {
    const p = PRESETS[preset];
    return {
      sunDir: new THREE.Vector3(...p.sunDir).normalize(),
      sunColor: new THREE.Color(p.sunColor),
      zenith: new THREE.Color(p.zenith),
      horizon: new THREE.Color(p.horizon),
      fog: new THREE.Color(p.fog),
      cloudColor: new THREE.Color(p.cloudColor),
      riceBase: new THREE.Color(p.riceBase),
      riceTip: new THREE.Color(p.riceTip),
      panicleColor: new THREE.Color(p.panicleColor),
      hemiSky: new THREE.Color(p.hemiSky),
      hemiGround: new THREE.Color(p.hemiGround),
      p,
    };
  }, [preset]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useEffect(() => {
    if (!scene.fog) scene.fog = new THREE.FogExp2(PRESETS[preset].fog, PRESETS[preset].fogDensity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  useFrame((state, delta) => {
    const k = 1 - Math.pow(0.12, Math.min(delta, 0.1));
    const t = targets;
    u.uTime.value = state.clock.elapsedTime;
    u.uSunDir.value.lerp(t.sunDir, k).normalize();
    u.uSunColor.value.lerp(t.sunColor, k);
    u.uZenith.value.lerp(t.zenith, k);
    u.uHorizon.value.lerp(t.horizon, k);
    u.uCloudColor.value.lerp(t.cloudColor, k);
    u.uRiceBase.value.lerp(t.riceBase, k);
    u.uRiceTip.value.lerp(t.riceTip, k);
    u.uPanicleColor.value.lerp(t.panicleColor, k);
    u.uCloudCover.value += (t.p.cloudCover - u.uCloudCover.value) * k;
    u.uPanicle.value += (t.p.panicle - u.uPanicle.value) * k;
    u.uWater.value += (t.p.water - u.uWater.value) * k;
    u.uWind.value += (t.p.wind - u.uWind.value) * k;
    u.uRain.value += (t.p.rain - u.uRain.value) * k;
    u.uMist.value += (t.p.mist - u.uMist.value) * k;
    const fog = scene.fog as THREE.FogExp2 | null;
    if (fog) {
      fog.color.lerp(t.fog, k);
      fog.density += (t.p.fogDensity - fog.density) * k;
    }
    if (sun.current) {
      sun.current.position.copy(u.uSunDir.value).multiplyScalar(80);
      sun.current.color.copy(u.uSunColor.value);
      sun.current.intensity += (t.p.sunIntensity - sun.current.intensity) * k;
    }
    if (hemi.current) {
      hemi.current.color.lerp(t.hemiSky, k);
      hemi.current.groundColor.lerp(t.hemiGround, k);
      hemi.current.intensity += (t.p.hemiIntensity - hemi.current.intensity) * k;
    }

    // cinematic camera: slow drift + gentle pointer parallax + scroll lift
    const el = state.clock.elapsedTime;
    const scroll = typeof window !== 'undefined' ? Math.min(window.scrollY / window.innerHeight, 1) : 0;
    const z = 9 - Math.sin(el * 0.05) * 1.2;
    const baseX = pathX(z) + 0.15;
    const tx = baseX + pointer.current.x * 0.6 + Math.sin(el * 0.11) * 0.25;
    const ty = 1.72 - pointer.current.y * 0.18 + scroll * 1.6;
    camera.position.x += (tx - camera.position.x) * 0.04;
    camera.position.y += (ty - camera.position.y) * 0.04;
    camera.position.z += (z - camera.position.z) * 0.04;
    const look = new THREE.Vector3(pathX(-30) * 0.6 + pointer.current.x * 1.5, 2.6 - scroll * 0.8, -30);
    camera.lookAt(look);

    if (!readyFired.current && el > 0.25) {
      readyFired.current = true;
      onReady?.();
    }
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#b9cde0', '#5b4a2f', 0.55]} />
      <directionalLight ref={sun} intensity={2.2} />
    </>
  );
}

/**
 * Camera-like finishing: HDR bloom around the sun and water glints, filmic tone mapping,
 * a gentle lens vignette and light film grain. Used only with GPU headroom (quality ≥ 0.5).
 * (Hue/saturation and brightness/contrast passes were tried and left out: merged into this chain
 * they produced black regions on some GPU drivers. Colour grading lives in the presets instead.)
 */
function Grade({ preset }: { preset: PresetId }) {
  const bloom = { sunrise: 0.75, monsoon: 0.35, harvest: 0.38, dusk: 0.9 }[preset];
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={bloom} luminanceThreshold={0.9} luminanceSmoothing={0.25} radius={0.75} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Vignette offset={0.28} darkness={0.55} />
      <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.18} />
      <SMAA />
    </EffectComposer>
  );
}

export default function FieldScene({ preset, active, quality, onReady }: Props) {
  const u = useMemo(() => createSharedUniforms(), []);
  const p = PRESETS[preset];
  const cinematic = quality >= 0.5;
  return (
    <Canvas
      frameloop={active ? 'always' : 'never'}
      dpr={[1, Math.min(1.75, 1 + quality * 0.75)]}
      camera={{ fov: 46, near: 0.1, far: 900, position: [pathX(9), 1.72, 9] }}
      gl={{ antialias: true, powerPreference: 'high-performance', alpha: false }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        scene.fog = new THREE.FogExp2(p.fog, p.fogDensity);
        scene.background = new THREE.Color(p.horizon);
      }}
      aria-hidden
    >
      <Suspense fallback={null}>
        <Director u={u} preset={preset} onReady={onReady} />
        <SkyDome u={u} />
        <Terrain u={u} />
        <RiceField u={u} density={quality} />
        <Vegetation />
        <Life />
        <Mist u={u} />
        <Rain u={u} count={Math.round(3500 * quality)} />
        <Motes u={u} count={90} center={MOTE_CENTER} />
      </Suspense>
      {cinematic && <Grade preset={preset} />}
    </Canvas>
  );
}
