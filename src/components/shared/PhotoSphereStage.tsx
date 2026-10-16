import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, Image, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { Etudiant, PortraitEtudiant } from "@/lib/types";

export type SphereDrawPhase = "idle" | "rolling" | "settling" | "revealing" | "complete";

type SpherePortrait = Pick<PortraitEtudiant, "id" | "photo" | "niveau">;

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  if (!count) return [];
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (index / Math.max(count - 1, 1)) * 2;
    const ring = Math.sqrt(1 - y * y);
    const theta = GOLDEN_ANGLE * index;
    return new THREE.Vector3(Math.cos(theta) * ring * radius, y * radius, Math.sin(theta) * ring * radius);
  });
}

function PortraitFallback({ tone }: { tone: string }) {
  return (
    <group position={[0, 0, 0.018]}>
      <mesh position={[0, 0, -0.01]}>
        <planeGeometry args={[0.43, 0.54]} />
        <meshBasicMaterial color="#F0EDED" />
      </mesh>
      <mesh position={[0, 0.08, 0]}>
        <circleGeometry args={[0.092, 20]} />
        <meshBasicMaterial color={tone} />
      </mesh>
      <mesh position={[0, -0.105, 0]} scale={[0.2, 0.16, 1]}>
        <circleGeometry args={[1, 20]} />
        <meshBasicMaterial color={tone} />
      </mesh>
    </group>
  );
}

function SilentPortraitCard({
  portrait,
  position,
  tone,
  dimmed,
}: {
  portrait: SpherePortrait;
  position: THREE.Vector3;
  tone: string;
  dimmed: boolean;
}) {
  return (
    <group position={position}>
      <Billboard follow>
        <group scale={dimmed ? 0.72 : 1}>
          <mesh position={[0, 0, -0.014]}>
            <planeGeometry args={[0.76, 0.94]} />
            <meshBasicMaterial color={tone} transparent opacity={dimmed ? 0.4 : 0.9} />
          </mesh>
          {portrait.photo ? (
            <Image url={portrait.photo} scale={[0.66, 0.84]} transparent opacity={dimmed ? 0.52 : 1} toneMapped={false} />
          ) : (
            <group scale={1.55}><PortraitFallback tone={tone} /></group>
          )}
        </group>
      </Billboard>
    </group>
  );
}

function WinnerPortrait({ winner, tone, side }: { winner: Etudiant; tone: string; side: -1 | 1 }) {
  const card = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (card.current) {
      const targetScale = 1.12;
      const scale = THREE.MathUtils.damp(card.current.scale.x, targetScale, 4.5, delta);
      card.current.scale.setScalar(scale);
      card.current.position.y = Math.sin(clock.getElapsedTime() * 1.7 + side) * 0.1;
    }
    if (halo.current) {
      const scale = 1.25 + Math.sin(clock.getElapsedTime() * 3) * 0.08;
      halo.current.scale.set(scale, scale, scale);
      (halo.current.material as THREE.MeshBasicMaterial).opacity = 0.35 + Math.sin(clock.getElapsedTime() * 3) * 0.08;
    }
  });

  return (
    <group ref={card} position={[side * 2.15, 0, 1.7]} scale={0.1}>
      <mesh ref={halo}>
        <circleGeometry args={[1.12, 48]} />
        <meshBasicMaterial color={tone} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Billboard follow>
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[1.18, 1.48]} />
          <meshBasicMaterial color={tone} />
        </mesh>
        {winner.photo ? <Image url={winner.photo} scale={[1.04, 1.34]} position={[0, 0, 0.01]} toneMapped={false} /> : <group scale={2.5}><PortraitFallback tone={tone} /></group>}
      </Billboard>
    </group>
  );
}

function MentorSphere({
  portraits,
  winner,
  level,
  phase,
  position,
}: {
  portraits: SpherePortrait[];
  winner: Etudiant | null;
  level: 2 | 3;
  phase: SphereDrawPhase;
  position: [number, number, number];
}) {
  const orbit = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);
  const speed = useRef(0.1);
  const tone = level === 2 ? "#1F7A3A" : "#C62F24";
  const cards = portraits.length ? portraits : winner ? [winner] : [];
  const points = useMemo(() => fibonacciSphere(cards.length, 1.65), [cards.length]);

  useFrame(({ clock }, delta) => {
    const targetSpeed = phase === "rolling" ? 5.4 : phase === "settling" ? 0.18 : phase === "revealing" || phase === "complete" ? 0.025 : 0.12;
    speed.current = THREE.MathUtils.damp(speed.current, targetSpeed, phase === "settling" ? 2.1 : 3.2, delta);
    if (orbit.current) {
      orbit.current.rotation.y += speed.current * delta;
      orbit.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.28 + level) * 0.12;
    }
    if (shell.current) {
      const material = shell.current.material as THREE.MeshPhysicalMaterial;
      material.opacity = THREE.MathUtils.damp(material.opacity, phase === "rolling" ? 0.21 : 0.1, 3, delta);
      shell.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 1.8 + level) * 0.02);
    }
  });

  return (
    <group position={position}>
      <pointLight color={tone} intensity={phase === "rolling" ? 24 : 8} distance={8} />
      <mesh ref={shell}>
        <sphereGeometry args={[1.82, 36, 36]} />
        <meshPhysicalMaterial color={tone} transparent opacity={0.1} roughness={0.22} metalness={0.7} wireframe />
      </mesh>
      <Sparkles count={phase === "rolling" ? 76 : 28} scale={4.35} size={phase === "rolling" ? 2.4 : 1.3} speed={phase === "rolling" ? 2.4 : 0.3} color={tone} />
      <group ref={orbit}>
        {cards.map((portrait, index) => <SilentPortraitCard key={portrait.id} portrait={portrait} position={points[index]} tone={tone} dimmed={Boolean(winner && (phase === "revealing" || phase === "complete"))} />)}
      </group>
      {winner && (phase === "revealing" || phase === "complete") && <WinnerPortrait winner={winner} tone={tone} side={level === 2 ? -1 : 1} />}
    </group>
  );
}

function CameraMotion({ phase }: { phase: SphereDrawPhase }) {
  useFrame(({ camera }, delta) => {
    const target = phase === "rolling" ? 10.3 : phase === "settling" ? 8.7 : phase === "revealing" || phase === "complete" ? 8.3 : 11.6;
    camera.position.z = THREE.MathUtils.damp(camera.position.z, target, 1.5, delta);
  });
  return null;
}

function SphereScene({ portraits, winner2, winner3, phase, showMentorSpheres }: { portraits: PortraitEtudiant[]; winner2: Etudiant | null; winner3: Etudiant | null; phase: SphereDrawPhase; showMentorSpheres: boolean }) {
  const level2 = portraits.filter((portrait) => portrait.niveau === 2);
  const level3 = portraits.filter((portrait) => portrait.niveau === 3);
  return (
    <>
      <ambientLight intensity={1.8} />
      <directionalLight position={[4, 5, 6]} color="#FFFFFF" intensity={3.2} />
      <directionalLight position={[-5, -3, 4]} color="#FFD800" intensity={1.8} />
      <Stars radius={28} depth={16} count={260} factor={2} saturation={0} fade speed={phase === "rolling" ? 1.5 : 0.25} />
      <Sparkles count={90} scale={[13, 8, 4]} size={1.6} speed={phase === "rolling" ? 1.8 : 0.25} color="#FFD800" />
      {showMentorSpheres && <>
        <MentorSphere portraits={level2} winner={winner2} level={2} phase={phase} position={[-2.3, 0, 0]} />
        <MentorSphere portraits={level3} winner={winner3} level={3} phase={phase} position={[2.3, 0, 0]} />
      </>}
      <CameraMotion phase={phase} />
      <OrbitControls enablePan={false} enableDamping dampingFactor={0.06} minDistance={7} maxDistance={15} />
    </>
  );
}

export function PhotoSphereStage({
  portraits,
  winner2,
  winner3,
  phase,
  showMentorSpheres = true,
}: {
  portraits: PortraitEtudiant[];
  winner2: Etudiant | null;
  winner3: Etudiant | null;
  phase: SphereDrawPhase;
  showMentorSpheres?: boolean;
}) {
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 11.6], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <SphereScene portraits={portraits} winner2={winner2} winner3={winner3} phase={phase} showMentorSpheres={showMentorSpheres} />
    </Canvas>
  );
}
