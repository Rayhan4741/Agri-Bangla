import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { GrowthModel } from '@/types';
import { mulberry32 } from '@/components/hero/scene/presets';

const FRUIT: Record<string, { color: string; shape: 'round' | 'long' | 'big' }> = {
  tomato: { color: '#d93a2b', shape: 'round' },
  brinjal: { color: '#5b2a6e', shape: 'long' },
  chilli: { color: '#c8261c', shape: 'long' },
  okra: { color: '#5c9a32', shape: 'long' },
  lentil: { color: '#8a9a46', shape: 'round' },
  mungbean: { color: '#4b6b2a', shape: 'long' },
  mustard: { color: '#e5c032', shape: 'round' },
  marigold: { color: '#f2a516', shape: 'round' },
  nursery: { color: '#7cc35a', shape: 'round' },
  'bottle-gourd': { color: '#9cc46a', shape: 'long' },
  pumpkin: { color: '#d9822b', shape: 'big' },
  cucumber: { color: '#4f8a2e', shape: 'long' },
  bean: { color: '#6aa84f', shape: 'long' },
  mango: { color: '#e8b33a', shape: 'round' },
  jackfruit: { color: '#7d9a3a', shape: 'big' },
  banana: { color: '#e6cf4a', shape: 'long' },
  guava: { color: '#a8c95a', shape: 'round' },
  litchi: { color: '#c0392b', shape: 'round' },
  papaya: { color: '#d99a2b', shape: 'big' },
  potato: { color: '#b98b56', shape: 'round' },
  onion: { color: '#a3456a', shape: 'round' },
  garlic: { color: '#eee6d6', shape: 'round' },
  turmeric: { color: '#e09a2a', shape: 'long' },
};

const green = new THREE.Color('#4f9a35');
const darkGreen = new THREE.Color('#2f6b25');
const gold = new THREE.Color('#d6a940');

function bladeGeometry() {
  const g = new THREE.PlaneGeometry(0.035, 1, 1, 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + 0.5;
    p.setXYZ(i, p.getX(i) * (1 - y * 0.85), y, y * y * 0.25);
  }
  g.computeVertexNormals();
  return g;
}

function Sway({ children, amount = 0.04 }: { children: React.ReactNode; amount?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.z = Math.sin(clock.elapsedTime * 1.3) * amount;
  });
  return <group ref={ref}>{children}</group>;
}

function RiceGrain({ g, rice }: { g: number; rice: boolean }) {
  const blade = useMemo(bladeGeometry, []);
  const rnd = useMemo(() => mulberry32(7), []);
  const blades = useMemo(() => Array.from({ length: 22 }, () => ({ a: rnd() * Math.PI * 2, lean: 0.1 + rnd() * 0.35, h: 0.75 + rnd() * 0.3 })), [rnd]);
  const count = Math.round(4 + g * 18);
  const height = 0.25 + Math.min(g, 0.75) * 1.25;
  const ripen = THREE.MathUtils.smoothstep(g, 0.78, 0.98);
  const col = green.clone().lerp(gold, ripen);
  const pan = THREE.MathUtils.smoothstep(g, 0.55, 0.7);
  return (
    <Sway>
      {blades.slice(0, count).map((b, i) => (
        <mesh key={i} geometry={blade} rotation={[b.lean, b.a, 0]} scale={[1, height * b.h, 1]}>
          <meshStandardMaterial color={i % 3 ? col : col.clone().multiplyScalar(0.8)} side={THREE.DoubleSide} roughness={0.8} />
        </mesh>
      ))}
      {pan > 0.01 &&
        blades.slice(0, Math.max(3, Math.round(count / 3))).map((b, i) => (
          <group key={`p${i}`} rotation={[0, b.a, 0]} position={[0, height * 0.98, 0]} scale={pan}>
            {Array.from({ length: 7 }).map((_, k) => (
              <mesh key={k} position={[0.03 + k * 0.035, -k * k * 0.006, 0]}>
                <sphereGeometry args={[0.018, 6, 5]} />
                <meshStandardMaterial color={ripen > 0.3 ? '#d9a440' : '#b5c46a'} roughness={0.7} />
              </mesh>
            ))}
          </group>
        ))}
      {!rice && null}
    </Sway>
  );
}

function Fruit({ shape, color, s }: { shape: 'round' | 'long' | 'big'; color: string; s: number }) {
  if (shape === 'long')
    return (
      <mesh scale={[s * 0.6, s * 1.8, s * 0.6]}>
        <sphereGeometry args={[0.05, 14, 10]} />
        <meshStandardMaterial color={color} roughness={0.45} />
      </mesh>
    );
  return (
    <mesh scale={shape === 'big' ? s * 2.2 : s}>
      <sphereGeometry args={[0.05, 16, 12]} />
      <meshStandardMaterial color={color} roughness={0.45} />
    </mesh>
  );
}

function Leaf({ size = 1, color = green }: { size?: number; color?: THREE.Color }) {
  return (
    <mesh scale={[size * 0.12, size * 0.06, size * 0.2]} position={[0, 0, size * 0.1]}>
      <sphereGeometry args={[1, 10, 6]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

function Vegetable({ g, cropId }: { g: number; cropId: string }) {
  const h = 0.15 + g * 0.95;
  const leaves = Math.round(2 + g * 12);
  const fruit = FRUIT[cropId] ?? { color: '#d93a2b', shape: 'round' as const };
  const flowering = g > 0.45 && g < 0.85;
  const fruitScale = THREE.MathUtils.smoothstep(g, 0.6, 0.95);
  return (
    <Sway amount={0.03}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.03, h, 8]} />
        <meshStandardMaterial color="#4c7a2c" />
      </mesh>
      {Array.from({ length: leaves }).map((_, i) => {
        const y = 0.08 + (i / leaves) * h * 0.95;
        return (
          <group key={i} position={[0, y, 0]} rotation={[0.5, i * 2.4, 0]}>
            <Leaf size={0.9 + (1 - i / leaves) * 0.6} color={i % 2 ? green : darkGreen} />
          </group>
        );
      })}
      {flowering &&
        [0, 1, 2].map((i) => (
          <mesh key={`f${i}`} position={[Math.cos(i * 2.1) * 0.12, h * (0.55 + i * 0.12), Math.sin(i * 2.1) * 0.12]}>
            <sphereGeometry args={[0.025, 8, 6]} />
            <meshStandardMaterial color={cropId === 'mustard' || cropId === 'marigold' ? '#f2c230' : '#fff6d8'} emissive="#3a3000" emissiveIntensity={0.1} />
          </mesh>
        ))}
      {fruitScale > 0.01 &&
        [0, 1, 2, 3].map((i) => (
          <group key={`x${i}`} position={[Math.cos(i * 1.7) * 0.16, h * (0.35 + i * 0.12), Math.sin(i * 1.7) * 0.16]}>
            <Fruit shape={fruit.shape} color={fruit.color} s={fruitScale} />
          </group>
        ))}
    </Sway>
  );
}

function Vine({ g, cropId }: { g: number; cropId: string }) {
  const fruit = FRUIT[cropId] ?? { color: '#9cc46a', shape: 'long' as const };
  const len = 0.2 + g * 1.4;
  const curve = useMemo(
    () => new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 0.5, 0), new THREE.Vector3(-0.05, 1.0, 0), new THREE.Vector3(0.4, 1.12, 0.1), new THREE.Vector3(0.9, 1.14, -0.1)]),
    [],
  );
  const pts = curve.getSpacedPoints(30).slice(0, Math.max(2, Math.round((len / 1.6) * 30)));
  const path = useMemo(() => new THREE.CatmullRomCurve3(pts), [pts]);
  const fs = THREE.MathUtils.smoothstep(g, 0.6, 0.95);
  return (
    <group>
      {/* bamboo trellis (মাচা) */}
      {[
        [-0.3, 0.6],
        [1.0, 0.6],
      ].map(([x], i) => (
        <mesh key={i} position={[x, 0.6, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.2, 6]} />
          <meshStandardMaterial color="#b49a62" />
        </mesh>
      ))}
      <mesh position={[0.35, 1.18, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.015, 0.015, 1.4, 6]} />
        <meshStandardMaterial color="#b49a62" />
      </mesh>
      <mesh>
        <tubeGeometry args={[path, 40, 0.012, 6, false]} />
        <meshStandardMaterial color="#4c7a2c" />
      </mesh>
      {pts.filter((_, i) => i % 3 === 1).map((p, i) => (
        <group key={i} position={p} rotation={[0.6, i * 1.9, 0]}>
          <Leaf size={1.3} color={i % 2 ? green : darkGreen} />
        </group>
      ))}
      {fs > 0.01 &&
        pts.filter((_, i) => i % 7 === 5 && i > 18).map((p, i) => (
          <group key={`f${i}`} position={[p.x, p.y - 0.18 * fs, p.z]}>
            <Fruit shape={fruit.shape} color={fruit.color} s={fs * 1.3} />
          </group>
        ))}
    </group>
  );
}

function Tree({ g, cropId }: { g: number; cropId: string }) {
  const fruit = FRUIT[cropId] ?? { color: '#e8b33a', shape: 'round' as const };
  const h = 0.25 + g * 0.8;
  const canopy = 0.15 + g * 0.45;
  const fs = THREE.MathUtils.smoothstep(g, 0.65, 0.95);
  const flowers = g > 0.45 && g < 0.75;
  return (
    <Sway amount={0.015}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.03 + g * 0.03, 0.05 + g * 0.05, h, 8]} />
        <meshStandardMaterial color="#5c4330" />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[Math.cos(i * 1.6) * canopy * 0.5, h + canopy * (0.5 + (i % 2) * 0.3), Math.sin(i * 1.6) * canopy * 0.5]}>
          <icosahedronGeometry args={[canopy * 0.75, 1]} />
          <meshStandardMaterial color={i % 2 ? '#3f7a2a' : '#2f6224'} roughness={0.9} flatShading />
        </mesh>
      ))}
      {flowers &&
        Array.from({ length: 8 }).map((_, i) => (
          <mesh key={`fl${i}`} position={[Math.cos(i) * canopy * 0.95, h + canopy * (0.6 + (i % 3) * 0.2), Math.sin(i) * canopy * 0.95]}>
            <sphereGeometry args={[0.03, 6, 5]} />
            <meshStandardMaterial color="#f3e7b5" />
          </mesh>
        ))}
      {fs > 0.01 &&
        Array.from({ length: 6 }).map((_, i) => (
          <group key={`fr${i}`} position={[Math.cos(i * 1.05) * canopy * 1.0, h + canopy * 0.35 + (i % 2) * 0.1, Math.sin(i * 1.05) * canopy * 1.0]}>
            <Fruit shape={fruit.shape} color={fruit.color} s={fs} />
          </group>
        ))}
    </Sway>
  );
}

function Tuber({ g, cropId }: { g: number; cropId: string }) {
  const fruit = FRUIT[cropId] ?? { color: '#b98b56', shape: 'round' as const };
  const ts = THREE.MathUtils.smoothstep(g, 0.3, 0.95);
  const foliage = cropId === 'onion' || cropId === 'garlic';
  const wither = THREE.MathUtils.smoothstep(g, 0.85, 1);
  const leafCol = green.clone().lerp(new THREE.Color('#b7a45a'), wither);
  const blade = useMemo(bladeGeometry, []);
  return (
    <group>
      <Sway amount={0.02}>
        {foliage
          ? Array.from({ length: 7 }).map((_, i) => (
              <mesh key={i} geometry={blade} rotation={[0.1 + wither * 0.9, i * 0.9, 0]} scale={[1.6, 0.3 + g * 0.6, 1]}>
                <meshStandardMaterial color={leafCol} side={THREE.DoubleSide} />
              </mesh>
            ))
          : Array.from({ length: Math.round(3 + g * 8) }).map((_, i) => (
              <group key={i} position={[0, 0.08 + (i % 4) * 0.08 * (0.4 + g), 0]} rotation={[0.7 + wither * 0.6, i * 2.3, 0]}>
                <Leaf size={1 + g * 0.6} color={leafCol} />
              </group>
            ))}
      </Sway>
      {/* cut-away soil showing what grows underground */}
      {ts > 0.01 &&
        [0, 1, 2, 3].slice(0, foliage ? 1 : 4).map((i) => (
          <group key={i} position={[Math.cos(i * 1.6) * 0.14, -0.14 - (i % 2) * 0.06, 0.2 + Math.sin(i * 1.6) * 0.06]}>
            <Fruit shape={fruit.shape} color={fruit.color} s={ts * (foliage ? 2.2 : 1.4)} />
          </group>
        ))}
    </group>
  );
}

function Mushroom({ g }: { g: number }) {
  const s = THREE.MathUtils.smoothstep(g, 0.3, 1);
  return (
    <group>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.22, 0.24, 0.6, 20]} />
        <meshStandardMaterial color="#e9e3d2" roughness={0.9} transparent opacity={0.92} />
      </mesh>
      {s > 0.01 &&
        Array.from({ length: 7 }).map((_, i) => (
          <group key={i} position={[Math.cos(i * 0.9) * 0.23, 0.15 + (i % 3) * 0.15, Math.sin(i * 0.9) * 0.23]} rotation={[0, -i * 0.9, -Math.PI / 2.6]} scale={s}>
            <mesh>
              <sphereGeometry args={[0.09, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#d8cfbf" side={THREE.DoubleSide} />
            </mesh>
          </group>
        ))}
    </group>
  );
}

export default function GrowthScene({ model, cropId, growth }: { model: GrowthModel; cropId: string; growth: number }) {
  const water = model === 'rice';
  const below = model === 'tuber';
  return (
    <Canvas camera={{ position: [1.8, 1.25, 2.1], fov: 38 }} dpr={[1, 1.75]} gl={{ antialias: true }} aria-hidden>
      <color attach="background" args={['#f2efe2']} />
      <hemisphereLight args={['#fff7e8', '#8a7a5a', 1.1]} />
      <directionalLight position={[2.5, 4, 2]} intensity={2.2} color="#fff1d8" />
      <group position={[0, below ? 0.12 : -0.35, 0]}>
        {/* soil / paddy bed */}
        <mesh position={[0, -0.06, 0]}>
          <cylinderGeometry args={[0.95, 1, 0.12, 48]} />
          <meshStandardMaterial color={water ? '#5a4a33' : '#7a5c3c'} roughness={1} />
        </mesh>
        {water && (
          <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.94, 48]} />
            <meshStandardMaterial color="#7f9fa8" metalness={0.2} roughness={0.15} transparent opacity={0.65} />
          </mesh>
        )}
        {below && (
          <mesh position={[0, -0.25, 0.25]}>
            <boxGeometry args={[0.9, 0.38, 0.02]} />
            <meshStandardMaterial color="#6d5236" transparent opacity={0.35} />
          </mesh>
        )}
        {model === 'rice' || model === 'grain' ? (
          <RiceGrain g={growth} rice={model === 'rice'} />
        ) : model === 'vine' ? (
          <Vine g={growth} cropId={cropId} />
        ) : model === 'tree' ? (
          <Tree g={growth} cropId={cropId} />
        ) : model === 'tuber' ? (
          <Tuber g={growth} cropId={cropId} />
        ) : model === 'other' ? (
          <Mushroom g={growth} />
        ) : (
          <Vegetable g={growth} cropId={cropId} />
        )}
        <ContactShadows position={[0, 0.001, 0]} opacity={0.35} scale={2.4} blur={2.4} far={1.5} />
      </group>
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={0.6} maxPolarAngle={1.45} autoRotate autoRotateSpeed={0.6} />
    </Canvas>
  );
}
