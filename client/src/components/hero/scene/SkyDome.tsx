import { useMemo } from 'react';
import * as THREE from 'three';
import { GLSL_NOISE, GLSL_SKY, type SharedUniforms } from './presets';

/** Procedural sky: gradient + sun disc + animated fbm clouds lit by the sun. */
export function SkyDome({ u }: { u: SharedUniforms }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTime: u.uTime,
          uSunDir: u.uSunDir,
          uSunColor: u.uSunColor,
          uZenith: u.uZenith,
          uHorizon: u.uHorizon,
          uCloudCover: u.uCloudCover,
          uCloudColor: u.uCloudColor,
        },
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main(){
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform vec3 uSunDir; uniform vec3 uSunColor; uniform vec3 uZenith; uniform vec3 uHorizon;
          uniform float uCloudCover; uniform vec3 uCloudColor;
          varying vec3 vDir;
          ${GLSL_NOISE}
          ${GLSL_SKY}
          void main(){
            vec3 dir = normalize(vDir);
            vec3 sunDir = normalize(uSunDir);
            vec3 col = skyColor(dir, sunDir, uZenith, uHorizon, uSunColor);
            float s = max(dot(dir, sunDir), 0.0);
            // sun disc
            col += uSunColor * smoothstep(0.9993, 0.9997, s) * 14.0 * (1.0 - uCloudCover * 0.85);
            // clouds projected onto a high plane
            if (dir.y > 0.0) {
              vec2 uv = dir.xz / (dir.y + 0.12) * 1.15;
              uv += vec2(uTime * 0.006, uTime * 0.002);
              float n = fbm(uv * 1.3) * 0.65 + fbm(uv * 4.1 + 3.7) * 0.35;
              float cov = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.32, n);
              float thick = smoothstep(0.3, 1.0, n);
              vec3 shadow = mix(uCloudColor * 0.62, uHorizon * 0.7, 0.25);
              vec3 lit = uCloudColor + uSunColor * pow(s, 8.0) * 0.8;
              vec3 cloud = mix(lit, shadow, thick * 0.75);
              float fade = smoothstep(0.0, 0.18, dir.y);
              col = mix(col, cloud, cov * fade * 0.92);
            }
            // horizon haze band
            col = mix(col, uHorizon, (1.0 - smoothstep(-0.02, 0.09, dir.y)) * 0.65);
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }`,
      }),
    [u],
  );

  return (
    <mesh material={material} frustumCulled={false} renderOrder={-10}>
      <sphereGeometry args={[400, 48, 24]} />
    </mesh>
  );
}
