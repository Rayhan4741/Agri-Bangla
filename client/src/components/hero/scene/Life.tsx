import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { pathX } from './presets';

const skin = '#8a5a3c';

/** Farmer bent over the paddy wearing a মাথাল (wide bamboo hat), lungi and gamchha. */
function Farmer({ position, phase = 0, rotation = 0 }: { position: [number, number, number]; phase?: number; rotation?: number }) {
  const torso = useRef<THREE.Group>(null);
  const armR = useRef<THREE.Group>(null);
  const armL = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + phase;
    const cycle = Math.sin(t * 1.4);
    if (torso.current) torso.current.rotation.x = 1.05 + cycle * 0.06;
    if (armR.current) armR.current.rotation.x = -0.25 + Math.max(0, cycle) * 0.55;
    if (armL.current) armL.current.rotation.x = 0.1 - Math.max(0, -cycle) * 0.3;
  });
  return (
    <group position={position} rotation-y={rotation} scale={1.05}>
      {/* legs in the water */}
      <mesh position={[-0.1, 0.32, 0]}>
        <capsuleGeometry args={[0.06, 0.5, 4, 8]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      <mesh position={[0.1, 0.32, 0.05]}>
        <capsuleGeometry args={[0.06, 0.5, 4, 8]} />
        <meshStandardMaterial color={skin} roughness={0.8} />
      </mesh>
      {/* lungi folded to the knee */}
      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.2, 0.25, 0.32, 12]} />
        <meshStandardMaterial color="#2f5a8a" roughness={0.9} />
      </mesh>
      <group ref={torso} position={[0, 0.86, 0]}>
        <mesh position={[0, 0.3, 0]}>
          <capsuleGeometry args={[0.17, 0.32, 4, 10]} />
          <meshStandardMaterial color="#ece5d3" roughness={0.9} />
        </mesh>
        {/* gamchha over the shoulder */}
        <mesh position={[0.09, 0.42, 0.12]} rotation-z={0.5}>
          <boxGeometry args={[0.07, 0.42, 0.04]} />
          <meshStandardMaterial color="#b8412e" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.72, 0]}>
          <sphereGeometry args={[0.12, 16, 12]} />
          <meshStandardMaterial color={skin} roughness={0.7} />
        </mesh>
        {/* মাথাল hat */}
        <mesh position={[0, 0.82, 0]}>
          <coneGeometry args={[0.36, 0.14, 24, 1, true]} />
          <meshStandardMaterial color="#cda65f" roughness={1} side={THREE.DoubleSide} />
        </mesh>
        <group ref={armR} position={[0.2, 0.5, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <capsuleGeometry args={[0.05, 0.46, 4, 8]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </mesh>
          {/* seedling bundle */}
          <mesh position={[0, -0.56, 0.02]}>
            <coneGeometry args={[0.05, 0.22, 6]} />
            <meshStandardMaterial color="#6aa843" roughness={1} />
          </mesh>
        </group>
        <group ref={armL} position={[-0.2, 0.5, 0]}>
          <mesh position={[0, -0.28, 0]}>
            <capsuleGeometry args={[0.05, 0.46, 4, 8]} />
            <meshStandardMaterial color={skin} roughness={0.8} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

/** White egret (বক) wading in the paddy. */
function Egret({ position, phase, scale = 1 }: { position: [number, number, number]; phase: number; scale?: number }) {
  const head = useRef<THREE.Group>(null);
  const neckCurve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(0.1, 0.48, 0),
        new THREE.Vector3(0.16, 0.62, 0),
        new THREE.Vector3(0.11, 0.74, 0),
        new THREE.Vector3(0.17, 0.84, 0),
      ]),
    [],
  );
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.8 + phase;
    if (head.current) {
      const peck = Math.max(0, Math.sin(t * 0.9) - 0.8) * 4;
      head.current.position.y = 0.84 - peck * 0.25;
      head.current.rotation.z = -peck * 0.9;
    }
  });
  return (
    <group position={position} scale={scale} rotation-y={phase * 2}>
      <mesh position={[0, 0.48, 0]} scale={[1.6, 0.85, 0.85]}>
        <sphereGeometry args={[0.1, 14, 10]} />
        <meshStandardMaterial color="#f5f3ec" roughness={0.6} />
      </mesh>
      <mesh>
        <tubeGeometry args={[neckCurve, 12, 0.022, 6, false]} />
        <meshStandardMaterial color="#f5f3ec" roughness={0.6} />
      </mesh>
      <group ref={head} position={[0.17, 0.84, 0]}>
        <mesh>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshStandardMaterial color="#f5f3ec" roughness={0.6} />
        </mesh>
        <mesh position={[0.07, -0.005, 0]} rotation-z={-Math.PI / 2}>
          <coneGeometry args={[0.012, 0.1, 6]} />
          <meshStandardMaterial color="#e3b23c" roughness={0.5} />
        </mesh>
      </group>
      {[-0.03, 0.03].map((z) => (
        <mesh key={z} position={[0.02, 0.2, z]}>
          <cylinderGeometry args={[0.006, 0.006, 0.42, 4]} />
          <meshStandardMaterial color="#2b2b25" />
        </mesh>
      ))}
    </group>
  );
}

/** A grazing cow on a distant bund. */
function Cow({ position, rotation = 0 }: { position: [number, number, number]; rotation?: number }) {
  const headRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (headRef.current) headRef.current.rotation.z = -0.5 + Math.sin(clock.elapsedTime * 0.7) * 0.12;
  });
  const coat = '#e8e1d2';
  return (
    <group position={position} rotation-y={rotation} scale={1.1}>
      <mesh position={[0, 0.85, 0]} rotation-z={Math.PI / 2}>
        <capsuleGeometry args={[0.32, 0.8, 6, 12]} />
        <meshStandardMaterial color={coat} roughness={0.9} />
      </mesh>
      {[
        [0.38, 0.17],
        [0.38, -0.17],
        [-0.38, 0.17],
        [-0.38, -0.17],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.35, z]}>
          <cylinderGeometry args={[0.06, 0.05, 0.7, 6]} />
          <meshStandardMaterial color={coat} roughness={0.9} />
        </mesh>
      ))}
      <group ref={headRef} position={[0.72, 0.95, 0]}>
        <mesh position={[0.2, -0.1, 0]} rotation-z={-0.4}>
          <boxGeometry args={[0.42, 0.22, 0.24]} />
          <meshStandardMaterial color={coat} roughness={0.9} />
        </mesh>
        {[0.1, -0.1].map((z) => (
          <mesh key={z} position={[0.08, 0.06, z]} rotation-x={z > 0 ? -0.6 : 0.6}>
            <coneGeometry args={[0.025, 0.16, 6]} />
            <meshStandardMaterial color="#5a4a38" />
          </mesh>
        ))}
      </group>
      {/* hump typical of deshi cattle */}
      <mesh position={[0.35, 1.18, 0]}>
        <sphereGeometry args={[0.14, 10, 8]} />
        <meshStandardMaterial color={coat} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** A loose flock gliding across the sky. */
function Birds() {
  const group = useRef<THREE.Group>(null);
  const birds = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) => ({
        o: new THREE.Vector3((i % 3) * 1.6 - i * 0.4, Math.sin(i * 1.7) * 0.8, -(i % 4) * 1.3),
        p: i * 0.7,
      })),
    [],
  );
  const wingRefs = useRef<THREE.Mesh[]>([]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-0.5, 0.1, 0, 0, 0, 0.1, 0, 0, -0.1, 0.5, 0.1, 0, 0, 0, 0.1, 0, 0, -0.1], 3));
    g.computeVertexNormals();
    return g;
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (group.current) {
      const x = ((t * 1.6) % 160) - 80;
      group.current.position.set(x, 16 + Math.sin(t * 0.3) * 1.5, -55);
    }
    wingRefs.current.forEach((m, i) => {
      if (m) m.scale.y = 0.4 + Math.abs(Math.sin(t * 6 + birds[i].p)) * 1.4;
    });
  });
  return (
    <group ref={group}>
      {birds.map((b, i) => (
        <mesh
          key={i}
          ref={(el) => {
            if (el) wingRefs.current[i] = el;
          }}
          geometry={geo}
          position={b.o}
        >
          <meshBasicMaterial color="#2a2a2a" side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}

export function Life() {
  return (
    <group>
      <Farmer position={[pathX(-13) + 3.4, 0, -13]} rotation={-0.6} />
      <Farmer position={[pathX(-31) - 7.5, 0, -31]} rotation={0.9} phase={1.7} />
      <Egret position={[pathX(-7) - 3.2, 0, -7]} phase={0.3} />
      <Egret position={[pathX(-18) + 6.5, 0, -18]} phase={1.9} scale={1.1} />
      <Egret position={[pathX(-22) + 7.4, 0, -22.5]} phase={3.1} scale={1.1} />
      <Egret position={[pathX(-26) - 11, 0, -26]} phase={4.2} scale={1.2} />
      <Cow position={[pathX(-44) + 0.2, 0.18, -44]} rotation={1.2} />
      <Birds />
    </group>
  );
}
