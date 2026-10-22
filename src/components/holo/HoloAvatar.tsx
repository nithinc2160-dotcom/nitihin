import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'explaining' | 'warning' | 'hidden';

interface Props {
  state: AvatarState;
  style: 'human' | 'abstract';
  reduced: boolean;
}

const HOLO = new THREE.Color('#22d3ee');
const VIOLET = new THREE.Color('#a855ff');

/**
 * Procedural holographic avatar built from primitives (no external model). Idle breathing, blink,
 * head turn, and gesture are driven by the real assistant state. Reduced-effects skips particles.
 */
export default function HoloAvatar({ state, style, reduced }: Props) {
  const group = useRef<THREE.Group>(null);
  const head = useRef<THREE.Mesh>(null);
  const armL = useRef<THREE.Mesh>(null);
  const armR = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const particles = useRef<THREE.Points>(null);
  const eyeMat = useRef<THREE.MeshBasicMaterial>(null);
  const bodyMat = useRef<THREE.MeshStandardMaterial>(null);

  const particleGeo = useMemo(() => {
    const n = reduced ? 0 : 120;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 2.4;
      pos[i * 3 + 1] = Math.random() * 2.4 - 1.1;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 1.6;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [reduced]);

  useFrame((ctx, dt) => {
    const t = ctx.clock.elapsedTime;
    const speed = state === 'thinking' ? 3 : state === 'speaking' || state === 'explaining' ? 2.2 : 1;
    if (group.current) {
      group.current.position.y = Math.sin(t * 1.1) * 0.02;
      group.current.rotation.y = Math.sin(t * 0.4) * 0.12;
    }
    if (head.current) {
      const turn = state === 'listening' ? 0.12 : 0;
      head.current.rotation.y += (turn + Math.sin(t * 0.7) * 0.05 - head.current.rotation.y) * 0.08;
    }
    // Gesture: raise right arm while explaining/speaking.
    if (armR.current) {
      const target = state === 'explaining' || state === 'speaking' ? -0.9 + Math.sin(t * 3 * speed) * 0.15 : -0.1;
      armR.current.rotation.z += (target - armR.current.rotation.z) * 0.1;
    }
    if (armL.current) armL.current.rotation.z += (0.1 - armL.current.rotation.z) * 0.1;
    if (ring.current) ring.current.rotation.z += dt * 0.6;
    if (particles.current && !reduced) particles.current.rotation.y += dt * 0.15;
    // Blink: quick dip in eye opacity every ~4s.
    if (eyeMat.current) {
      const blink = (t % 4) < 0.12 ? 0.1 : 1;
      eyeMat.current.opacity = blink;
    }
    // Warning tint.
    if (bodyMat.current) {
      const target = state === 'warning' ? '#f59e0b' : '#22d3ee';
      bodyMat.current.emissive.lerp(new THREE.Color(target), 0.08);
    }
  });

  const bodyOpacity = 0.55;

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[0, 1.5, 2]} intensity={1.2} color="#22d3ee" />
      <pointLight position={[-1.5, 0.5, 1]} intensity={0.8} color="#a855ff" />

      <group ref={group} position={[0, -0.6, 0]}>
        {/* Projection platform */}
        <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.02, 0]}>
          <torusGeometry args={[0.7, 0.012, 8, 64]} />
          <meshBasicMaterial color={VIOLET} transparent opacity={0.8} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.03, 0]}>
          <circleGeometry args={[0.7, 48]} />
          <meshBasicMaterial color={HOLO} transparent opacity={0.08} />
        </mesh>

        {style === 'human' ? (
          <>
            {/* Head */}
            <mesh ref={head} position={[0, 0.95, 0]}>
              <sphereGeometry args={[0.26, 32, 32]} />
              <meshStandardMaterial ref={bodyMat} color={HOLO} transparent opacity={bodyOpacity} emissive={HOLO} emissiveIntensity={0.4} />
            </mesh>
            {/* Eyes */}
            <mesh position={[-0.09, 0.98, 0.22]}>
              <sphereGeometry args={[0.03, 12, 12]} />
              <meshBasicMaterial ref={eyeMat} color="#ffffff" />
            </mesh>
            <mesh position={[0.09, 0.98, 0.22]}>
              <sphereGeometry args={[0.03, 12, 12]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            {/* Torso */}
            <mesh position={[0, 0.3, 0]}>
              <capsuleGeometry args={[0.28, 0.6, 8, 16]} />
              <meshStandardMaterial color={VIOLET} transparent opacity={0.4} emissive={VIOLET} emissiveIntensity={0.35} />
            </mesh>
            {/* Arms */}
            <mesh ref={armL} position={[-0.4, 0.35, 0]} rotation={[0, 0, 0.1]}>
              <capsuleGeometry args={[0.07, 0.5, 6, 12]} />
              <meshStandardMaterial color={HOLO} transparent opacity={0.45} emissive={HOLO} emissiveIntensity={0.3} />
            </mesh>
            <mesh ref={armR} position={[0.4, 0.35, 0]} rotation={[0, 0, -0.1]}>
              <capsuleGeometry args={[0.07, 0.5, 6, 12]} />
              <meshStandardMaterial color={HOLO} transparent opacity={0.45} emissive={HOLO} emissiveIntensity={0.3} />
            </mesh>
          </>
        ) : (
          <>
            {/* Abstract entity: a rotating wireframe core */}
            <mesh position={[0, 0.2, 0]}>
              <icosahedronGeometry args={[0.6, 1]} />
              <meshBasicMaterial color={HOLO} wireframe transparent opacity={0.7} />
            </mesh>
            <mesh position={[0, 0.2, 0]}>
              <icosahedronGeometry args={[0.42, 0]} />
              <meshStandardMaterial ref={bodyMat} color={VIOLET} transparent opacity={0.5} emissive={VIOLET} emissiveIntensity={0.6} />
            </mesh>
          </>
        )}
      </group>

      {!reduced && (
        <points ref={particles} geometry={particleGeo}>
          <pointsMaterial color={HOLO} size={0.015} transparent opacity={0.7} sizeAttenuation />
        </points>
      )}
    </>
  );
}
