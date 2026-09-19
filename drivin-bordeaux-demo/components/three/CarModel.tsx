"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RoundedBox, Cylinder, Torus } from "@react-three/drei";
import * as THREE from "three";

/**
 * Modèle de supercar procédural (stylisé, sans dépendance à un fichier GLB
 * externe). Placeholder pensé pour la démo commerciale : à remplacer par un
 * vrai modèle client — voir CREDITS.md et README.md ("Remplacer le modèle 3D").
 */

const ACCENT = "#f89303";

function Wheel({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Torus args={[0.34, 0.13, 16, 32]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#0a0a0a" roughness={0.9} metalness={0.1} />
      </Torus>
      <Cylinder args={[0.22, 0.22, 0.22, 24]} rotation={[0, 0, Math.PI / 2]}>
        <meshStandardMaterial color="#c8c8ce" metalness={1} roughness={0.25} />
      </Cylinder>
    </group>
  );
}

export function CarModel({
  progressRef,
  pointerStrength = 1,
}: {
  progressRef: React.MutableRefObject<number>;
  pointerStrength?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const baseRotation = useRef(0);
  const { pointer } = useThree();

  useFrame((_, delta) => {
    if (!group.current) return;
    baseRotation.current += delta * 0.15;
    const scrollSpin = progressRef.current * Math.PI * 1.4;
    const targetY = baseRotation.current + scrollSpin + pointer.x * 0.25 * pointerStrength;
    const targetX = -pointer.y * 0.05 * pointerStrength;
    group.current.rotation.y += (targetY - group.current.rotation.y) * 0.06;
    group.current.rotation.x += (targetX - group.current.rotation.x) * 0.06;
  });

  return (
    <group ref={group} position={[1.1, -0.65, -0.4]} scale={0.82} dispose={null}>
      {/* Châssis */}
      <RoundedBox args={[3.6, 0.5, 1.7]} radius={0.18} smoothness={4} position={[0, 0.1, 0]}>
        <meshPhysicalMaterial
          color="#101114"
          metalness={0.85}
          roughness={0.18}
          clearcoat={1}
          clearcoatRoughness={0.1}
        />
      </RoundedBox>

      {/* Habitacle */}
      <RoundedBox
        args={[1.7, 0.5, 1.5]}
        radius={0.22}
        smoothness={4}
        position={[-0.15, 0.52, 0]}
        rotation={[0, 0, -0.03]}
      >
        {/*
          Pas de `transmission` ici : le rendu du verre physique déclenche
          une passe de rendu complète de la scène à chaque frame côté
          Three.js, ce qui fait chuter le framerate (constaté : le tween GSAP
          du préloader mettait plus de 20s à se terminer au lieu de 1,3s).
          Un simple matériau sombre et brillant suffit à l'illusion de vitre.
        */}
        <meshPhysicalMaterial
          color="#05070a"
          metalness={0.4}
          roughness={0.08}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </RoundedBox>

      {/* Ligne d'accent */}
      <RoundedBox args={[3.4, 0.05, 0.03]} radius={0.02} position={[0, 0.28, 0.86]}>
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.8} />
      </RoundedBox>
      <RoundedBox args={[3.4, 0.05, 0.03]} radius={0.02} position={[0, 0.28, -0.86]}>
        <meshStandardMaterial color={ACCENT} emissive={ACCENT} emissiveIntensity={0.8} />
      </RoundedBox>

      {/* Phares */}
      <RoundedBox args={[0.16, 0.12, 0.5]} radius={0.04} position={[1.78, 0.16, 0.5]}>
        <meshStandardMaterial color="#fff8ec" emissive="#fff2d6" emissiveIntensity={1.4} />
      </RoundedBox>
      <RoundedBox args={[0.16, 0.12, 0.5]} radius={0.04} position={[1.78, 0.16, -0.5]}>
        <meshStandardMaterial color="#fff8ec" emissive="#fff2d6" emissiveIntensity={1.4} />
      </RoundedBox>

      {/* Aileron */}
      <RoundedBox args={[0.5, 0.06, 1.5]} radius={0.02} position={[-1.7, 0.55, 0]}>
        <meshStandardMaterial color="#0a0a0a" metalness={0.6} roughness={0.4} />
      </RoundedBox>

      {/* Roues */}
      <Wheel position={[1.15, -0.32, 0.85]} />
      <Wheel position={[1.15, -0.32, -0.85]} />
      <Wheel position={[-1.15, -0.32, 0.85]} />
      <Wheel position={[-1.15, -0.32, -0.85]} />
    </group>
  );
}
