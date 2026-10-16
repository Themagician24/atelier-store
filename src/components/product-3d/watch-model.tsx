"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import { DoubleSide, LatheGeometry, Vector2 } from "three";
import { PART_LABELS } from "@/lib/product-models";
import { bentStrap, gearGeometry } from "./geometry";
import { Part } from "./stage-context";

/*
 * Leather-Strap Watch: 36 mm rose-gold case, white dial with baton indices,
 * taupe calfskin strap. Built dial-up around the y axis, one unit = 18 mm,
 * so the case is two units across. Parts explode along the axis — crystal
 * first, caseback last — with the crown out to the side and the straps
 * pulled off their lugs.
 */

/** Distinct `order` values below; the stage staggers across them. */
export const WATCH_STEPS = 9;

const LABEL = PART_LABELS.watch;

const ROSE_GOLD = { color: "#d9a48c", metalness: 1, roughness: 0.22 } as const;
const STEEL = { color: "#cfd3d6", metalness: 0.9, roughness: 0.32 } as const;
const BRASS = { color: "#c9a14a", metalness: 1, roughness: 0.3 } as const;

// 10:10:35, the hour every watch is photographed at.
const HOUR = ((10 + 10 / 60) / 12) * Math.PI * 2;
const MINUTE = (10 / 60) * Math.PI * 2;
const SECOND = (35 / 60) * Math.PI * 2;

export function WatchModel() {
  const geometry = useMemo(() => {
    const caseProfile = [
      [0.88, -0.22],
      [0.98, -0.21],
      [1.04, -0.12],
      [1.06, 0],
      [1.04, 0.1],
      [0.99, 0.17],
      [0.88, 0.18],
      [0.88, -0.22],
    ].map(([r, y]) => new Vector2(r, y));

    return {
      case: new LatheGeometry(caseProfile, 128),
      strap: bentStrap({
        width: 0.8,
        thickness: 0.07,
        length: 1.7,
        radius: 0.95,
      }),
      gearLarge: gearGeometry(0.2, 24, 0.03),
      gearMid: gearGeometry(0.13, 16, 0.03),
      gearSmall: gearGeometry(0.08, 10, 0.03),
    };
  }, []);

  return (
    <group>
      <Part
        order={0}
        offset={[0, 2.4, 0]}
        label={LABEL.crystal}
        labelAt={[0, 0.22, 0]}
      >
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.9, 0.9, 0.05, 96]} />
          {/* Glass as a glaze of reflections, not a refraction pass. */}
          <meshPhysicalMaterial
            transparent
            opacity={0.22}
            roughness={0.04}
            clearcoat={1}
            envMapIntensity={2}
            depthWrite={false}
          />
        </mesh>
      </Part>

      <Part
        order={1}
        offset={[0, 1.85, 0]}
        label={LABEL.bezel}
        labelAt={[0, 0.19, 0]}
        labelSide="left"
      >
        <mesh position={[0, 0.19, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.94, 0.055, 24, 128]} />
          <meshStandardMaterial {...ROSE_GOLD} />
        </mesh>
      </Part>

      <Part
        order={2}
        offset={[0, 1.35, 0]}
        spin={-0.6}
        label={LABEL.hands}
        labelAt={[0, 0.16, 0]}
        reach={0.95}
      >
        <Hand angle={HOUR} length={0.44} width={0.055} y={0.14} />
        <Hand angle={MINUTE} length={0.68} width={0.04} y={0.155} />
        <Hand angle={SECOND} length={0.78} width={0.014} y={0.17} tail />
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.045, 0.045, 0.05, 32]} />
          <meshStandardMaterial {...ROSE_GOLD} />
        </mesh>
      </Part>

      <Part
        order={3}
        offset={[0, 0.8, 0]}
        label={LABEL.dial}
        labelAt={[0, 0.1, 0]}
        labelSide="left"
      >
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.87, 0.87, 0.03, 96]} />
          <meshStandardMaterial color="#f6f3ee" roughness={0.55} />
        </mesh>
        {Array.from({ length: 12 }, (_, hour) => {
          const angle = (hour / 12) * Math.PI * 2;
          const marks = hour === 0 ? [-0.035, 0.035] : [0];
          return marks.map((shift) => (
            <group key={`${hour}${shift}`} rotation-y={-angle}>
              <mesh position={[shift, 0.125, -0.68]}>
                <boxGeometry args={[0.03, 0.02, hour % 3 === 0 ? 0.2 : 0.14]} />
                <meshStandardMaterial {...ROSE_GOLD} />
              </mesh>
            </group>
          ));
        })}
      </Part>

      <Part
        order={4}
        offset={[0.85, 0, 0]}
        label={LABEL.crown}
        labelAt={[1.14, 0.25, 0]}
        reach={0.3}
      >
        <mesh position={[1.04, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.03, 0.03, 0.12, 16]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <mesh position={[1.14, 0, 0]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.11, 0.11, 0.16, 24]} />
          <meshStandardMaterial {...ROSE_GOLD} flatShading />
        </mesh>
      </Part>

      <Part
        order={5}
        offset={[0, 0, 0]}
        label={LABEL.case}
        labelAt={[0, -0.05, 0]}
        reach={1.2}
      >
        <mesh geometry={geometry.case}>
          <meshStandardMaterial {...ROSE_GOLD} side={DoubleSide} />
        </mesh>
        {[-1, 1].map((end) =>
          [-1, 1].map((side) => (
            <RoundedBox
              key={`${end}${side}`}
              args={[0.16, 0.18, 0.42]}
              radius={0.04}
              position={[side * 0.5, -0.03, end * 0.98]}
              rotation-x={end * 0.22}
            >
              <meshStandardMaterial {...ROSE_GOLD} />
            </RoundedBox>
          )),
        )}
      </Part>

      <Part
        order={6}
        offset={[0, -1.05, 0]}
        spin={0.8}
        label={LABEL.movement}
        labelAt={[0, -0.2, 0]}
        reach={0.95}
      >
        <mesh position={[0, -0.12, 0]}>
          <cylinderGeometry args={[0.82, 0.82, 0.07, 96]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        {/* Coin cell, coil, quartz tuning fork and the gear train. */}
        <mesh position={[-0.34, -0.06, 0.22]}>
          <cylinderGeometry args={[0.3, 0.3, 0.06, 64]} />
          <meshStandardMaterial color="#e4e6e8" metalness={1} roughness={0.15} />
        </mesh>
        <mesh position={[0.28, -0.03, -0.32]} rotation-z={Math.PI / 2}>
          <cylinderGeometry args={[0.09, 0.09, 0.5, 32]} />
          <meshStandardMaterial color="#b8733f" metalness={1} roughness={0.35} />
        </mesh>
        <mesh position={[0.42, -0.05, 0.3]} rotation-x={Math.PI / 2}>
          <capsuleGeometry args={[0.035, 0.16, 8, 16]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
        <mesh geometry={geometry.gearLarge} position={[0.05, -0.085, 0.05]}>
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh geometry={geometry.gearMid} position={[0.3, -0.07, 0.02]}>
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh geometry={geometry.gearSmall} position={[0.12, -0.055, -0.18]}>
          <meshStandardMaterial {...BRASS} />
        </mesh>
        <mesh position={[0, -0.02, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 0.2, 16]} />
          <meshStandardMaterial {...STEEL} />
        </mesh>
      </Part>

      <Part
        order={7}
        offset={[0, -1.75, 0]}
        label={LABEL.caseback}
        labelAt={[0, -0.24, 0]}
        reach={1}
      >
        <mesh position={[0, -0.24, 0]}>
          <cylinderGeometry args={[0.87, 0.87, 0.06, 96]} />
          <meshStandardMaterial {...ROSE_GOLD} />
        </mesh>
        <mesh position={[0, -0.275, 0]} rotation-x={Math.PI / 2}>
          <torusGeometry args={[0.6, 0.012, 12, 96]} />
          <meshStandardMaterial {...ROSE_GOLD} roughness={0.4} />
        </mesh>
      </Part>

      {/* The two halves of the strap leave their lugs in opposite directions. */}
      <Part
        order={8}
        offset={[0, -0.45, 0.95]}
        label={LABEL.strap}
        labelAt={[0, -0.1, 1.45]}
        reach={0.4}
        labelSide="left"
      >
        <mesh geometry={geometry.strap} position={[0, -0.04, 1.1]}>
          <meshStandardMaterial color="#9c8574" roughness={0.85} />
        </mesh>
      </Part>
      <Part order={8} offset={[0, -0.45, -0.95]}>
        <mesh
          geometry={geometry.strap}
          position={[0, -0.04, -1.1]}
          rotation-y={Math.PI}
        >
          <meshStandardMaterial color="#9c8574" roughness={0.85} />
        </mesh>
      </Part>
    </group>
  );
}

/** A hand pivoting at the centre, pointing at `angle` (0 = twelve). */
function Hand({
  angle,
  length,
  width,
  y,
  tail = false,
}: {
  angle: number;
  length: number;
  width: number;
  y: number;
  tail?: boolean;
}) {
  const back = tail ? 0.18 : 0.06;
  return (
    <group rotation-y={-angle} position={[0, y, 0]}>
      <mesh position={[0, 0, -(length - back) / 2]}>
        <boxGeometry args={[width, 0.012, length + back]} />
        <meshStandardMaterial {...ROSE_GOLD} />
      </mesh>
    </group>
  );
}
