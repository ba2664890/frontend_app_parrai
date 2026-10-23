import { Canvas, useFrame } from "@react-three/fiber";
import { Billboard, Image, Line, OrbitControls, Sparkles, Stars, Text, useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import QRCode from "qrcode";
import { nomComplet, type Etudiant, type PortraitEtudiant, type TirageResult } from "@/lib/types";

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

/** Texture WebGL floutée progressivement : aucune carte HTML ne sort de la scène. */
function BlurredPhoto({
  url,
  scale,
  blur,
}: {
  url: string;
  scale: [number, number];
  blur: number;
}) {
  const texture = useTexture(url);
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      map: { value: texture },
      blur: { value: blur },
    },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform sampler2D map; uniform float blur; varying vec2 vUv;
      void main() {
        vec2 b = vec2(blur);
        vec4 color = texture2D(map, vUv) * .20;
        color += texture2D(map, vUv + vec2( b.x, 0.0)) * .12;
        color += texture2D(map, vUv + vec2(-b.x, 0.0)) * .12;
        color += texture2D(map, vUv + vec2(0.0,  b.y)) * .12;
        color += texture2D(map, vUv + vec2(0.0, -b.y)) * .12;
        color += texture2D(map, vUv + vec2( b.x,  b.y)) * .08;
        color += texture2D(map, vUv + vec2(-b.x,  b.y)) * .08;
        color += texture2D(map, vUv + vec2( b.x, -b.y)) * .08;
        color += texture2D(map, vUv + vec2(-b.x, -b.y)) * .08;
        gl_FragColor = color;
      }`,
    transparent: true,
    toneMapped: false,
  }), [texture]);

  useEffect(() => {
    material.uniforms.blur.value = blur;
    texture.colorSpace = THREE.SRGBColorSpace;
    material.needsUpdate = true;
  }, [blur, material, texture]);
  useEffect(() => () => material.dispose(), [material]);

  return <mesh><planeGeometry args={scale} /><primitive object={material} attach="material" /></mesh>;
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

function WinnerPortrait({ winner, tone, side, level, revealProgress }: { winner: Etudiant; tone: string; side: -1 | 1; level: 2 | 3; revealProgress: number }) {
  const card = useRef<THREE.Group>(null);
  const halo = useRef<THREE.Mesh>(null);
  const goldTone = "#E5B025";

  useFrame(({ clock }, delta) => {
    if (card.current) {
      const targetScale = 1.25;
      const scale = THREE.MathUtils.damp(card.current.scale.x, targetScale, 4.5, delta);
      card.current.scale.setScalar(scale);
      card.current.position.y = Math.sin(clock.getElapsedTime() * 1.7 + side) * 0.08;
    }
    if (halo.current) {
      const scale = 1.35 + Math.sin(clock.getElapsedTime() * 3) * 0.08;
      halo.current.scale.set(scale, scale, scale);
      (halo.current.material as THREE.MeshBasicMaterial).opacity = 0.32 + Math.sin(clock.getElapsedTime() * 3) * 0.06;
    }
  });

  // Coordonnées pour les ornements de coins dorés
  const halfW = 1.08;
  const halfH = 1.36;
  const cornerSize = 0.16;

  return (
    <group ref={card} position={[side * 1.75, 0, 1.85]} scale={0.1}>
      {/* Halo volumétrique pulsé avec subtilité or/ton */}
      <mesh ref={halo}>
        <circleGeometry args={[2.1, 48]} />
        <meshBasicMaterial color={revealProgress >= 1 ? goldTone : tone} transparent opacity={0.32} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <Billboard follow>
        {/* Ombre portée 3D arrière */}
        <mesh position={[0, -0.05, -0.045]}>
          <planeGeometry args={[2.3, 2.88]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.45} />
        </mesh>

        {/* 1. Cadre externe Or Prestige */}
        <mesh position={[0, 0, -0.03]}>
          <planeGeometry args={[2.24, 2.82]} />
          <meshBasicMaterial color={goldTone} />
        </mesh>

        {/* 2. Liseré intermédiaire couleur filière (vert ou rouge) */}
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[2.16, 2.74]} />
          <meshBasicMaterial color={tone} />
        </mesh>

        {/* 3. Passe-partout intérieur laqué sombre */}
        <mesh position={[0, 0, -0.01]}>
          <planeGeometry args={[2.08, 2.64]} />
          <meshBasicMaterial color="#0E1218" />
        </mesh>

        {/* 4. Ornements aux 4 coins (coins dorés façon cadre de maître) */}
        {[
          [-halfW, halfH],
          [halfW, halfH],
          [-halfW, -halfH],
          [halfW, -halfH],
        ].map(([cx, cy], i) => (
          <group key={i} position={[cx, cy, 0.02]}>
            <mesh>
              <planeGeometry args={[cornerSize, cornerSize]} />
              <meshBasicMaterial color={goldTone} />
            </mesh>
            <mesh position={[0, 0, 0.002]}>
              <planeGeometry args={[cornerSize * 0.6, cornerSize * 0.6]} />
              <meshBasicMaterial color="#0E1218" />
            </mesh>
          </group>
        ))}

        {/* 5. Portrait (avec flou progressif pendant le reveal) */}
        {winner.photo ? (
          <BlurredPhoto url={winner.photo} scale={[1.95, 2.5]} blur={0.042 * (1 - revealProgress)} />
        ) : (
          <group scale={4.5}><PortraitFallback tone={tone} /></group>
        )}

        {/* Compte à rebours avant révélation */}
        {revealProgress < 1 && (
          <group position={[0, 0, 0.04]}>
            <mesh position={[0, 0, -0.005]}>
              <circleGeometry args={[0.55, 32]} />
              <meshBasicMaterial color="#000000" transparent opacity={0.65} />
            </mesh>
            <Text fontSize={0.78} color="#FFD800" anchorX="center" anchorY="middle" outlineWidth={0.03} outlineColor="#1C1B1B">
              {Math.max(0, Math.ceil(3 * (1 - revealProgress)))}
            </Text>
          </group>
        )}

        {/* Badge supérieur ou ruban de niveau */}
        <group position={[0, halfH + 0.02, 0.03]}>
          <mesh position={[0, 0, -0.005]}>
            <planeGeometry args={[1.65, 0.32]} />
            <meshBasicMaterial color="#0E1218" />
          </mesh>
          <mesh position={[0, 0, -0.008]}>
            <planeGeometry args={[1.72, 0.38]} />
            <meshBasicMaterial color={goldTone} />
          </mesh>
          <Text fontSize={0.16} color="#FFD800" anchorX="center" anchorY="middle" outlineWidth={0.006} outlineColor="#0E1218">
            {`✦ PARRAIN ${level}E ANNÉE ✦`}
          </Text>
        </group>

        {/* Cartouche nominatif inférieur VIP */}
        {revealProgress >= 1 && (
          <group position={[0, -halfH - 0.22, 0.03]}>
            <mesh position={[0, 0, -0.005]}>
              <planeGeometry args={[2.5, 0.44]} />
              <meshBasicMaterial color="#0E1218" />
            </mesh>
            <mesh position={[0, 0, -0.008]}>
              <planeGeometry args={[2.56, 0.5]} />
              <meshBasicMaterial color={goldTone} />
            </mesh>
            <Text fontSize={0.18} color="#FFFFFF" anchorX="center" anchorY="middle" maxWidth={2.4} textAlign="center" outlineWidth={0.005} outlineColor="#000000">
              {`${winner.prenom} ${winner.nom}`.toUpperCase()}
            </Text>
          </group>
        )}
      </Billboard>
    </group>
  );
}

function WinnerConnection() {
  return (
    <group>
      <Line points={[[-1.0, 0, 1.85], [1.0, 0, 1.85]]} color="#171717" lineWidth={2.5} transparent opacity={0.94} />
      <mesh position={[0, 0, 1.85]}>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshBasicMaterial color="#171717" />
      </mesh>
    </group>
  );
}

function FamilyQrCode({ tirage }: { tirage: TirageResult }) {
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    const contact = (label: string, person: Etudiant) => [
      `${label}: ${nomComplet(person)}`,
      person.telephone ? `Téléphone: ${person.telephone}` : null,
      person.email ? `Email: ${person.email}` : null,
    ].filter(Boolean).join("\n");
    const details = [
      "AMSEN — FAMILLE DE PARRAINAGE",
      contact("Filleul", tirage.filleul),
      "",
      contact("Parrain 2e année", tirage.parrain2),
      "",
      contact("Parrain 3e année", tirage.parrain3),
    ].join("\n");
    let cancelled = false;
    QRCode.toDataURL(details, { errorCorrectionLevel: "M", margin: 1, width: 320, color: { dark: "#1A1A1A", light: "#FFFFFF" } })
      .then((url) => { if (!cancelled) setQrCode(url); })
      .catch(() => { if (!cancelled) setQrCode(null); });
    return () => { cancelled = true; };
  }, [tirage]);

  if (!qrCode) return null;
  return (
    <Billboard follow position={[0, -1.8, 1.5]}>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[1.08, 1.08]} />
        <meshBasicMaterial color="#FFFFFF" />
      </mesh>
      <Image url={qrCode} scale={[0.92, 0.92]} position={[0, 0, 0.01]} toneMapped={false} />
      <Text position={[0, -0.68, 0.03]} fontSize={0.14} color="#1F7A3A" anchorX="center" anchorY="middle" outlineWidth={0.005} outlineColor="#FFFFFF">
        FAMILLE AMSEN
      </Text>
    </Billboard>
  );
}

function MentorSphere({
  portraits,
  winner,
  level,
  phase,
  position,
  revealProgress,
}: {
  portraits: SpherePortrait[];
  winner: Etudiant | null;
  level: 2 | 3;
  phase: SphereDrawPhase;
  position: [number, number, number];
  revealProgress: number;
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
      <Billboard follow position={[0, 2.32, 0]}>
        <Text fontSize={0.2} color={tone} anchorX="center" anchorY="middle" outlineWidth={0.009} outlineColor="#FFFFFF">
          {`PARRAIN ${level}E ANNÉE`}
        </Text>
      </Billboard>
      <group ref={orbit}>
        {cards.map((portrait, index) => <SilentPortraitCard key={portrait.id} portrait={portrait} position={points[index]} tone={tone} dimmed={Boolean(winner && (phase === "revealing" || phase === "complete"))} />)}
      </group>
      {winner && (phase === "revealing" || phase === "complete") && <WinnerPortrait winner={winner} tone={tone} side={level === 2 ? -1 : 1} level={level} revealProgress={revealProgress} />}
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

function SphereScene({ portraits, winner2, winner3, phase, showMentorSpheres, revealProgress, family }: { portraits: PortraitEtudiant[]; winner2: Etudiant | null; winner3: Etudiant | null; phase: SphereDrawPhase; showMentorSpheres: boolean; revealProgress: number; family: TirageResult | null }) {
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
        <MentorSphere portraits={level2} winner={winner2} level={2} phase={phase} position={[-2.3, 0, 0]} revealProgress={revealProgress} />
        <MentorSphere portraits={level3} winner={winner3} level={3} phase={phase} position={[2.3, 0, 0]} revealProgress={revealProgress} />
      </>}
      {(phase === "revealing" || phase === "complete") && winner2 && winner3 && <WinnerConnection />}
      {phase === "complete" && family && <FamilyQrCode tirage={family} />}
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
  revealProgress = 0,
  family = null,
}: {
  portraits: PortraitEtudiant[];
  winner2: Etudiant | null;
  winner3: Etudiant | null;
  phase: SphereDrawPhase;
  showMentorSpheres?: boolean;
  revealProgress?: number;
  family?: TirageResult | null;
}) {
  return (
    <Canvas
      className="absolute inset-0 h-full w-full"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 11.6], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <SphereScene portraits={portraits} winner2={winner2} winner3={winner3} phase={phase} showMentorSpheres={showMentorSpheres} revealProgress={revealProgress} family={family} />
    </Canvas>
  );
}
