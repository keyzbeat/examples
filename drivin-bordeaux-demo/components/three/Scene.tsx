"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  ContactShadows,
  AdaptiveDpr,
  AdaptiveEvents,
  PerformanceMonitor,
} from "@react-three/drei";
import * as THREE from "three";
import { CarModel } from "./CarModel";

/**
 * Environnement studio 100% procédural (aucun fichier HDRI distant) :
 * un fond sombre + quelques "lightformers" génèrent des reflets réalistes
 * sur la carrosserie sans dépendance réseau ni asset supplémentaire.
 */
function StudioEnvironment() {
  return (
    <Environment resolution={128} background={false}>
      <mesh scale={40}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#050506" side={THREE.BackSide} />
      </mesh>
      <Lightformer
        intensity={3}
        color="#ffffff"
        position={[0, 5, -4]}
        scale={[10, 6, 1]}
      />
      <Lightformer
        intensity={2}
        color="#f89303"
        position={[-6, 1.5, 3]}
        rotation={[0, Math.PI / 2.5, 0]}
        scale={[8, 4, 1]}
      />
      <Lightformer
        intensity={1.2}
        color="#9db4ff"
        position={[6, 2, -2]}
        rotation={[0, -Math.PI / 2.5, 0]}
        scale={[6, 5, 1]}
      />
    </Environment>
  );
}

export function Scene({
  progressRef,
  active,
}: {
  progressRef: React.MutableRefObject<number>;
  active: boolean;
}) {
  const [dpr, setDpr] = useState<[number, number]>([1, 1.5]);

  return (
    <Canvas
      dpr={dpr}
      frameloop={active ? "always" : "never"}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      camera={{ position: [4.2, 1.5, 5.6], fov: 30 }}
      aria-hidden="true"
    >
      <PerformanceMonitor
        onDecline={() => setDpr([1, 1])}
        onIncline={() => setDpr([1, 1.5])}
      />
      <AdaptiveDpr pixelated={false} />
      <AdaptiveEvents />
      <color attach="background" args={["#07070a"]} />
      <fog attach="fog" args={["#07070a", 6, 16]} />

      <ambientLight intensity={0.25} />
      <spotLight
        position={[5, 6, 3]}
        angle={0.35}
        penumbra={0.6}
        intensity={2.2}
        color="#ffffff"
      />
      <pointLight position={[-4, 1.5, -3]} intensity={1.4} color="#f89303" />

      <Suspense fallback={null}>
        <StudioEnvironment />
        <CarModel progressRef={progressRef} />
        {/*
          `frames={1}` : un seul rendu de l'ombre au montage. Par défaut,
          drei re-render cette shadow map à chaque frame (frames=Infinity),
          ce qui est très coûteux ; notre carrosserie tourne sur elle-même
          mais garde une empreinte au sol quasi identique, donc une ombre
          figée reste crédible pour un coût quasi nul.
        */}
        <ContactShadows
          frames={1}
          position={[0, -0.92, 0]}
          opacity={0.6}
          scale={12}
          blur={2.6}
          far={4}
          resolution={256}
        />
      </Suspense>
    </Canvas>
  );
}
