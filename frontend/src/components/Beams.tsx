"use client";

/* eslint-disable react/no-unknown-property */
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";
import "./Beams.css";

type BeamsProps = {
  beamWidth?: number;
  beamHeight?: number;
  beamNumber?: number;
  lightColor?: string;
  beamColor?: string;
  backgroundColor?: string;
  speed?: number;
  noiseIntensity?: number;
  scale?: number;
  rotation?: number;
  className?: string;
};

function BeamField({ beamWidth, beamHeight, beamNumber, beamColor, speed, noiseIntensity, scale, rotation }: Required<Pick<BeamsProps, "beamWidth" | "beamHeight" | "beamNumber" | "beamColor" | "speed" | "noiseIntensity" | "scale" | "rotation">>) {
  const group = useRef<THREE.Group>(null);
  const beams = useMemo(() => Array.from({ length: beamNumber }, (_, index) => ({
    x: (index - (beamNumber - 1) / 2) * beamWidth * 1.35,
    phase: index * 0.73,
    lean: (index % 2 ? 1 : -1) * (0.08 + (index % 3) * 0.035),
  })), [beamNumber, beamWidth]);

  useFrame(({ clock }) => {
    if (!group.current) return;
    const time = clock.getElapsedTime() * speed;
    group.current.rotation.z = THREE.MathUtils.degToRad(rotation) + Math.sin(time * 0.18) * 0.025;
    group.current.rotation.y = Math.sin(time * 0.14) * 0.08;
    group.current.children.forEach((child, index) => {
      const beam = beams[index];
      child.position.x = beam.x + Math.sin(time * 0.35 + beam.phase) * noiseIntensity * 0.16;
      child.rotation.z = beam.lean + Math.sin(time * 0.28 + beam.phase) * noiseIntensity * 0.025;
      child.scale.y = 1 + Math.sin(time * 0.42 + beam.phase) * noiseIntensity * 0.035;
    });
  });

  return (
    <group ref={group} scale={scale}>
      {beams.map((beam) => (
        <mesh key={beam.phase} position={[beam.x, 0, -2]} rotation={[0, 0, beam.lean]}>
          <planeGeometry args={[beamWidth, beamHeight, 1, 12]} />
          <meshStandardMaterial color={beamColor} emissive={beamColor} emissiveIntensity={0.8} transparent opacity={0.14} side={THREE.DoubleSide} roughness={0.55} metalness={0.1} />
        </mesh>
      ))}
    </group>
  );
}

export default function Beams({
  beamWidth = 2,
  beamHeight = 15,
  beamNumber = 12,
  lightColor = "#ffffff",
  beamColor = "#9984d8",
  backgroundColor = "#000000",
  speed = 2,
  noiseIntensity = 1.75,
  scale = 0.2,
  rotation = 0,
  className = "",
}: BeamsProps) {
  return (
    <div className={`beams-container ${className}`.trim()}>
      <Canvas dpr={[1, 1.5]} frameloop="always" gl={{ alpha: true, antialias: true }}>
        <PerspectiveCamera makeDefault position={[0, 0, 20]} fov={30} />
        <ambientLight intensity={0.55} />
        <directionalLight color={lightColor} intensity={1.6} position={[0, 3, 10]} />
        <BeamField beamWidth={beamWidth} beamHeight={beamHeight} beamNumber={beamNumber} beamColor={beamColor} speed={speed} noiseIntensity={noiseIntensity} scale={scale} rotation={rotation} />
      </Canvas>
    </div>
  );
}
