import { useMemo } from 'react';
import * as THREE from 'three';
import { mulberry32, type SharedUniforms } from './presets';

/** GPU rain: each streak's fall is computed in the vertex shader, so there is no per-frame CPU work. */
export function Rain({ u, count = 3500 }: { u: SharedUniforms; count?: number }) {
  const mesh = useMemo(() => {
    const geo = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(0.012, 0.55);
    geo.index = base.index;
    geo.setAttribute('position', base.attributes.position);
    const rnd = mulberry32(77);
    const offsets = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      offsets[i * 4] = (rnd() - 0.5) * 60;
      offsets[i * 4 + 1] = rnd() * 22;
      offsets[i * 4 + 2] = 10 - rnd() * 55;
      offsets[i * 4 + 3] = 0.7 + rnd() * 0.6;
    }
    geo.setAttribute('aOffset', new THREE.InstancedBufferAttribute(offsets, 4));
    geo.instanceCount = count;
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: u.uTime, uRain: u.uRain },
      vertexShader: /* glsl */ `
        attribute vec4 aOffset; uniform float uTime; varying float vA;
        void main(){
          vec3 o = aOffset.xyz;
          o.y = mod(o.y - uTime * 14.0 * aOffset.w, 22.0);
          o.x += o.y * 0.12;
          vec4 mv = viewMatrix * vec4(o, 1.0);
          mv.xy += position.xy * vec2(1.0, 1.0);
          vA = smoothstep(55.0, 5.0, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uRain; varying float vA;
        void main(){ gl_FragColor = vec4(0.82, 0.86, 0.9, 0.32 * uRain * vA); }`,
    });
    const m = new THREE.Mesh(geo, mat);
    m.frustumCulled = false;
    return m;
  }, [u, count]);
  return <primitive object={mesh} />;
}

/** Low-lying morning mist bands over the far paddies. */
export function Mist({ u }: { u: SharedUniforms }) {
  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: u.uTime, uMist: u.uMist, uHorizon: u.uHorizon, uSunColor: u.uSunColor },
      vertexShader: /* glsl */ `
        varying vec2 vUv; varying vec3 vWorld;
        void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uMist; uniform vec3 uHorizon; uniform vec3 uSunColor;
        varying vec2 vUv; varying vec3 vWorld;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
          return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
        void main(){
          float edge = smoothstep(0.0, 0.25, vUv.x) * smoothstep(1.0, 0.75, vUv.x);
          float vert = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.2, vUv.y);
          float wisps = n(vec2(vWorld.x * 0.05 + uTime * 0.03, vUv.y * 3.0)) * 0.6 + n(vec2(vWorld.x * 0.13 - uTime * 0.02, vUv.y * 6.0)) * 0.4;
          float a = edge * vert * wisps * 0.38 * uMist;
          vec3 col = mix(uHorizon, uSunColor, 0.25) * 1.05;
          gl_FragColor = vec4(col, a);
          #include <colorspace_fragment>
        }`,
    });
    return mat;
  }, [u]);
  const bands = useMemo(
    () => [
      { z: -38, y: 1.2, w: 120, h: 3.2 },
      { z: -55, y: 1.6, w: 170, h: 4.2 },
      { z: -70, y: 2.2, w: 220, h: 6 },
    ],
    [],
  );
  return (
    <group>
      {bands.map((b, i) => (
        <mesh key={i} position={[0, b.y, b.z]} material={material}>
          <planeGeometry args={[b.w, b.h]} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * Pollen and dust motes drifting in the low sun. Uses a bounded soft falloff, unlike an
 * inverse-distance glow, so it never writes infinite values into the HDR bloom buffer.
 */
export function Motes({ u, count = 90, center }: { u: SharedUniforms; count?: number; center: [number, number, number] }) {
  const points = useMemo(() => {
    const rnd = mulberry32(431);
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = center[0] + (rnd() - 0.5) * 16;
      pos[i * 3 + 1] = center[1] + (rnd() - 0.5) * 3;
      pos[i * 3 + 2] = center[2] + (rnd() - 0.5) * 16;
      seed[i] = rnd();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: u.uTime, uSunColor: u.uSunColor, uRain: u.uRain, uPixel: { value: Math.min(window.devicePixelRatio || 1, 2) } },
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime; uniform float uPixel; varying float vA; varying float vSeed;
        void main(){
          vec3 p = position;
          float t = uTime * (0.15 + aSeed * 0.2) + aSeed * 40.0;
          p += vec3(sin(t) * 0.6, sin(t * 1.3) * 0.25, cos(t * 0.8) * 0.6);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = clamp((2.0 + aSeed * 2.5) * uPixel * 14.0 / max(-mv.z, 0.5), 1.0, 9.0);
          vA = smoothstep(30.0, 3.0, -mv.z) * (0.5 + 0.5 * sin(uTime * 0.9 + aSeed * 20.0));
          vSeed = aSeed;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSunColor; uniform float uRain; varying float vA; varying float vSeed;
        void main(){
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.0, d);
          a *= a * vA * (1.0 - uRain) * 0.65;
          gl_FragColor = vec4(mix(uSunColor, vec3(1.0, 0.93, 0.75), 0.5) * a, a);
        }`,
    });
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  }, [u, count, center]);
  return <primitive object={points} />;
}
