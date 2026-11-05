import { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { FIELD, mulberry32 } from './presets';

function paint(g: THREE.BufferGeometry, fn: (x: number, y: number, z: number) => THREE.Color) {
  const pos = g.attributes.position;
  const cols = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const c = fn(pos.getX(i), pos.getY(i), pos.getZ(i));
    cols.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return g;
}

function prep(g: THREE.BufferGeometry) {
  const ng = g.index ? g.toNonIndexed() : g;
  if (!ng.attributes.uv) ng.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(ng.attributes.position.count * 2), 2));
  return ng;
}

/** Broad-leaf village tree (mango / jackfruit / rain-tree silhouette). Height ≈ 1 unit. */
function makeBroadleaf(seed: number) {
  const rnd = mulberry32(seed);
  const parts: THREE.BufferGeometry[] = [];
  const trunkC = new THREE.Color('#4a3524');
  const trunk = new THREE.CylinderGeometry(0.035, 0.06, 0.48, 7, 1);
  trunk.translate(0, 0.24, 0);
  parts.push(prep(paint(trunk, () => trunkC)));
  const blobs = 6 + Math.floor(rnd() * 3);
  for (let i = 0; i < blobs; i++) {
    const r = 0.17 + rnd() * 0.13;
    const g = new THREE.IcosahedronGeometry(r, 2);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const v = new THREE.Vector3(p.getX(k), p.getY(k), p.getZ(k));
      const d = 1 + (Math.sin(v.x * 37 + seed) * Math.cos(v.y * 29) * Math.sin(v.z * 41)) * 0.16;
      v.multiplyScalar(d);
      p.setXYZ(k, v.x, v.y * 0.85, v.z);
    }
    const a = rnd() * Math.PI * 2;
    const rad = rnd() * 0.2;
    g.translate(Math.cos(a) * rad, 0.58 + rnd() * 0.3, Math.sin(a) * rad);
    g.computeVertexNormals();
    const dark = new THREE.Color('#163a17');
    const light = new THREE.Color('#4f7a2a');
    parts.push(prep(paint(g, (_x, y) => dark.clone().lerp(light, THREE.MathUtils.clamp((y - 0.45) / 0.55, 0, 1) * (0.7 + rnd() * 0.3)))));
  }
  return mergeGeometries(parts)!;
}

/** Coconut / betel-nut palm — the defining skyline of rural Bangladesh. Height ≈ 1 unit. */
function makePalm(seed: number) {
  const rnd = mulberry32(seed);
  const parts: THREE.BufferGeometry[] = [];
  const lean = (rnd() - 0.5) * 0.12;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(lean * 0.4, 0.35, 0),
    new THREE.Vector3(lean, 0.7, lean * 0.3),
    new THREE.Vector3(lean * 1.4, 0.92, lean * 0.5),
  ]);
  const trunk = new THREE.TubeGeometry(curve, 10, 0.014, 5, false);
  const trunkC = new THREE.Color('#5d4b39');
  parts.push(prep(paint(trunk, () => trunkC)));
  const top = curve.getPoint(1);
  const fronds = 11;
  const fc1 = new THREE.Color('#1f3f19');
  const fc2 = new THREE.Color('#4d7a2b');
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rnd() * 0.4;
    const len = 0.22 + rnd() * 0.08;
    const g = new THREE.PlaneGeometry(len, 0.06, 8, 1);
    const p = g.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const x = p.getX(k) + len / 2; // 0..len
      const t = x / len;
      const w = p.getY(k) * (1 - t * 0.7);
      const y = Math.sin(t * Math.PI * 0.55) * 0.07 - t * t * 0.16;
      p.setXYZ(k, x, y, w);
    }
    g.rotateY(-a);
    g.translate(top.x, top.y, top.z);
    g.computeVertexNormals();
    parts.push(prep(paint(g, (_x, y) => fc1.clone().lerp(fc2, THREE.MathUtils.clamp((y - top.y + 0.15) / 0.2, 0, 1)))));
  }
  return mergeGeometries(parts)!;
}

/** Bamboo clump. */
function makeBamboo(seed: number) {
  const rnd = mulberry32(seed);
  const parts: THREE.BufferGeometry[] = [];
  const c1 = new THREE.Color('#355d22');
  const c2 = new THREE.Color('#8aa64a');
  for (let i = 0; i < 9; i++) {
    const a = rnd() * Math.PI * 2;
    const tilt = 0.06 + rnd() * 0.22;
    const h = 0.7 + rnd() * 0.3;
    const curve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03),
      new THREE.Vector3(Math.cos(a) * tilt * 0.4, h * 0.6, Math.sin(a) * tilt * 0.4),
      new THREE.Vector3(Math.cos(a) * tilt * 1.6, h, Math.sin(a) * tilt * 1.6),
    );
    const g = new THREE.TubeGeometry(curve, 8, 0.012, 4, false);
    parts.push(prep(paint(g, (_x, y) => c1.clone().lerp(c2, y))));
    const crown = new THREE.IcosahedronGeometry(0.09 + rnd() * 0.05, 1);
    const tip = curve.getPoint(0.92);
    crown.scale(1.4, 0.8, 1.4);
    crown.translate(tip.x, tip.y, tip.z);
    parts.push(prep(paint(crown, () => new THREE.Color('#3e6a26'))));
  }
  return mergeGeometries(parts)!;
}

interface Placed {
  x: number;
  z: number;
  s: number;
  r: number;
  tint: number;
}

function scatter(seed: number, n: number, zr: [number, number], xr: [number, number], sr: [number, number], avoidField = false) {
  const rnd = mulberry32(seed);
  const out: Placed[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 20) {
    const x = xr[0] + rnd() * (xr[1] - xr[0]);
    const z = zr[0] + rnd() * (zr[1] - zr[0]);
    if (avoidField && Math.abs(x) < Math.max(FIELD.xMax, 22 + (8 - z) * 1.05) && z > FIELD.zMin) continue;
    out.push({ x, z, s: sr[0] + rnd() * (sr[1] - sr[0]), r: rnd() * Math.PI * 2, tint: 0.8 + rnd() * 0.35 });
  }
  return out;
}

function Instanced({ geo, items, roughness = 0.95 }: { geo: THREE.BufferGeometry; items: Placed[]; roughness?: number }) {
  const mesh = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness, metalness: 0, side: THREE.DoubleSide });
    const m = new THREE.InstancedMesh(geo, mat, items.length);
    const tmp = new THREE.Object3D();
    const c = new THREE.Color();
    items.forEach((it, i) => {
      tmp.position.set(it.x, 0, it.z);
      tmp.rotation.set(0, it.r, 0);
      tmp.scale.setScalar(it.s);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      m.setColorAt(i, c.setScalar(it.tint));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    return m;
  }, [geo, items, roughness]);
  return <primitive object={mesh} />;
}

export function Vegetation() {
  const data = useMemo(() => {
    const broad = [makeBroadleaf(3), makeBroadleaf(17), makeBroadleaf(29)];
    const palm = makePalm(5);
    const palm2 = makePalm(41);
    const bamboo = makeBamboo(9);
    // far village tree line behind the paddies
    const lineA = scatter(1, 70, [-100, -84], [-160, 160], [5, 8.5]);
    const lineB = scatter(2, 60, [-100, -82], [-160, 160], [4.5, 7.5]);
    const lineC = scatter(3, 50, [-104, -86], [-160, 160], [6, 9.5]);
    const palmsFar = scatter(4, 55, [-98, -80], [-160, 160], [8, 12]);
    const palmsFar2 = scatter(14, 30, [-98, -80], [-160, 160], [9, 13]);
    // side groves framing the view
    const sideL = scatter(6, 26, [-70, -4], [-75, -40], [6, 10], true);
    const sideR = scatter(7, 26, [-70, -4], [40, 80], [6, 10], true);
    const palmsSide = scatter(8, 18, [-60, -10], [-80, 80], [10, 15], true);
    const bambooItems = scatter(10, 14, [-96, -80], [-120, 120], [5, 7]);
    return { broad, palm, palm2, bamboo, lineA, lineB, lineC, palmsFar, palmsFar2, sideL, sideR, palmsSide, bambooItems };
  }, []);

  return (
    <group>
      <Instanced geo={data.broad[0]} items={[...data.lineA, ...data.sideL.slice(0, 13)]} />
      <Instanced geo={data.broad[1]} items={[...data.lineB, ...data.sideR.slice(0, 13)]} />
      <Instanced geo={data.broad[2]} items={[...data.lineC, ...data.sideL.slice(13), ...data.sideR.slice(13)]} />
      <Instanced geo={data.palm} items={[...data.palmsFar, ...data.palmsSide.slice(0, 9)]} />
      <Instanced geo={data.palm2} items={[...data.palmsFar2, ...data.palmsSide.slice(9)]} />
      <Instanced geo={data.bamboo} items={data.bambooItems} />
      <Village />
    </group>
  );
}

/** A few tin-roof homesteads and haystacks peeking through the trees. */
function Village() {
  const huts = [
    { x: -18, z: -82, r: 0.3, s: 1 },
    { x: 9, z: -85, r: -0.2, s: 1.1 },
    { x: 27, z: -81, r: 0.1, s: 0.9 },
    { x: -42, z: -80, r: -0.4, s: 1 },
  ];
  const stacks = [
    { x: -14, z: -78, s: 1 },
    { x: 13, z: -79.5, s: 1.2 },
    { x: 31, z: -77, s: 0.9 },
  ];
  return (
    <group>
      {huts.map((h, i) => (
        <group key={i} position={[h.x, 0, h.z]} rotation-y={h.r} scale={h.s}>
          <mesh position={[0, 1.1, 0]}>
            <boxGeometry args={[4.2, 2.2, 3]} />
            <meshStandardMaterial color="#b49a72" roughness={1} />
          </mesh>
          <mesh position={[0, 2.75, 0]} rotation-y={Math.PI / 4}>
            <coneGeometry args={[3.5, 1.4, 4, 1]} />
            <meshStandardMaterial color={i % 2 ? '#8d9496' : '#9a6b4f'} roughness={0.55} metalness={0.45} />
          </mesh>
        </group>
      ))}
      {stacks.map((s, i) => (
        <group key={i} position={[s.x, 0, s.z]} scale={s.s}>
          <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[1.35, 1.5, 2, 14]} />
            <meshStandardMaterial color="#c8a159" roughness={1} />
          </mesh>
          <mesh position={[0, 2.55, 0]}>
            <coneGeometry args={[1.45, 1.4, 14]} />
            <meshStandardMaterial color="#b88e47" roughness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
