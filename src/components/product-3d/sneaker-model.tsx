"use client";

import { RoundedBox } from "@react-three/drei";
import { useMemo } from "react";
import {
  CatmullRomCurve3,
  DoubleSide,
  EllipseCurve,
  QuadraticBezierCurve3,
  TubeGeometry,
  Vector3,
} from "three";
import { PART_LABELS } from "@/lib/product-models";
import { footprintSlab, parametricSurface, upperPoint } from "./geometry";
import { Part } from "./stage-context";

/*
 * Panelled Runner Sneakers: pastel suede, mesh and leather over a chunky
 * sculpted sole, red laces. Heel at -x, toe at +x, sole on y = 0. The
 * upper stays put; the trims lift off it, and the sole unit drops away
 * underneath, layer by layer.
 */

/** Distinct `order` values below; the stage staggers across them. */
export const SNEAKER_STEPS = 9;

const LABEL = PART_LABELS.sneaker;

const OUTSOLE = 0.09;
const STRIPE = 0.05;
const MIDSOLE = 0.26;
/** Where the upper meets the midsole. */
const BASE = OUTSOLE + STRIPE + MIDSOLE;

/** Eyelet positions around the footprint (outer side; the inner mirrors). */
const EYELETS = [0.27, 0.31, 0.35, 0.39, 0.43];

export function SneakerModel() {
  const geometry = useMemo(() => {
    const surface = (
      [u0, u1]: [number, number],
      [v0, v1]: [number, number],
      inflate: number,
      segments: [number, number] = [48, 24],
    ) =>
      parametricSurface(
        (u, v, target) =>
          upperPoint(u0 + (u1 - u0) * u, v0 + (v1 - v0) * v, BASE - 0.04, inflate, target),
        ...segments,
      );

    // Laces: a ladder across the instep, then the crossings between rungs.
    const eyelet = (u: number) => upperPoint(u, 0.97, BASE - 0.04, 1.05, new Vector3());
    const outer = EYELETS.map(eyelet);
    const inner = EYELETS.map((u) => eyelet(1 - u));
    const lace = (a: Vector3, b: Vector3) => {
      const mid = a.clone().lerp(b, 0.5).add(new Vector3(0, 0.07, 0));
      return new TubeGeometry(new QuadraticBezierCurve3(a, mid, b), 16, 0.022, 8);
    };
    const laces = [
      lace(outer[0], inner[0]),
      ...outer.slice(0, -1).flatMap((o, i) => [
        lace(o, inner[i + 1]),
        lace(inner[i], outer[i + 1]),
      ]),
    ];

    // Tongue: a padded strip under the laces, rising toward the collar.
    const mids = outer.map((o, i) => o.clone().lerp(inner[i], 0.5));
    const spine = new CatmullRomCurve3([
      mids[mids.length - 1].clone().add(new Vector3(0.15, -0.06, 0)),
      ...[...mids].reverse(),
      mids[0].clone().add(new Vector3(-0.35, 0.22, 0)),
    ]);
    const tongue = parametricSurface(
      (u, v, target) => {
        const across = v * 2 - 1;
        spine.getPointAt(u, target);
        target.z += across * 0.24;
        target.y += 0.015 - 0.05 * across * across;
      },
      32,
      8,
    );

    // Collar: the padded rim of the opening, an ellipse over the heel.
    const rim = new EllipseCurve(0, 0, 0.62, 0.3);
    const collarCurve = new CatmullRomCurve3(
      rim.getSpacedPoints(48).slice(0, -1).map(
        (p) => new Vector3(-0.72 + p.x, BASE + 0.9 + 0.12 * (-p.x / 0.62), p.y),
      ),
      true,
    );

    return {
      outsole: footprintSlab(1.03, OUTSOLE - 0.04, 0.02),
      stripe: footprintSlab(1.0, STRIPE - 0.02, 0.01),
      midsole: footprintSlab(1.0, MIDSOLE - 0.08, 0.04),
      insole: footprintSlab(0.86, 0.03, 0.01),
      upper: surface([0, 1], [0, 1.25], 1, [96, 40]),
      toe: surface([0.38, 0.62], [0.02, 1.05], 1.025),
      outerPanel: surface([0.14, 0.33], [0.08, 0.75], 1.025),
      innerPanel: surface([0.67, 0.86], [0.08, 0.75], 1.025),
      heel: surface([0.88, 1.12], [0.02, 0.8], 1.03),
      laces,
      tongue,
      collar: new TubeGeometry(collarCurve, 96, 0.07, 12, true),
    };
  }, []);

  return (
    <group>
      <Part
        order={0}
        offset={[0.1, 1.35, 0]}
        label={LABEL.laces}
        columnAt={2.75}
        labelAt={[0.35, BASE + 0.95, 0]}
        reach={0.75}
      >
        {geometry.laces.map((lace, i) => (
          <mesh key={i} geometry={lace}>
            <meshStandardMaterial color="#c4302b" roughness={0.7} />
          </mesh>
        ))}
      </Part>

      <Part
        order={1}
        offset={[0.15, 0.95, 0]}
        label={LABEL.tongue}
        columnAt={2.4}
        labelAt={[0.45, BASE + 1.05, 0]}
        reach={0.9}
      >
        <mesh geometry={geometry.tongue}>
          <meshStandardMaterial color="#b9cde6" roughness={0.95} side={DoubleSide} />
        </mesh>
      </Part>

      <Part
        order={2}
        offset={[-0.35, 0.75, 0]}
        label={LABEL.collar}
        columnAt={2.05}
        labelAt={[-0.72, BASE + 0.95, 0]}
        reach={0.75}
        labelSide="left"
      >
        <mesh geometry={geometry.collar}>
          <meshStandardMaterial color="#f0d98f" roughness={1} />
        </mesh>
      </Part>

      <Part
        order={3}
        offset={[0.85, 0.25, 0]}
        label={LABEL.toe}
        columnAt={1.35}
        labelAt={[1.25, BASE + 0.25, 0]}
        reach={0.35}
      >
        <mesh geometry={geometry.toe}>
          <meshStandardMaterial color="#eab5b1" roughness={1} side={DoubleSide} />
        </mesh>
      </Part>

      <Part
        order={4}
        offset={[0, 0.1, 0.75]}
        label={LABEL.panels}
        columnAt={1.0}
        labelAt={[-0.1, BASE + 0.35, 0.45]}
        reach={0.3}
      >
        <mesh geometry={geometry.outerPanel}>
          <meshStandardMaterial color="#b6dbc8" roughness={0.9} side={DoubleSide} />
        </mesh>
      </Part>
      <Part order={4} offset={[0, 0.1, -0.75]}>
        <mesh geometry={geometry.innerPanel}>
          <meshStandardMaterial color="#b6dbc8" roughness={0.9} side={DoubleSide} />
        </mesh>
      </Part>

      <Part
        order={5}
        offset={[-0.85, 0.2, 0]}
        label={LABEL.heel}
        columnAt={1.7}
        labelAt={[-1.25, BASE + 0.4, 0]}
        reach={0.35}
        labelSide="left"
      >
        <mesh geometry={geometry.heel}>
          <meshStandardMaterial color="#c4b5dd" roughness={0.5} side={DoubleSide} />
        </mesh>
        <RoundedBox
          args={[0.08, 0.3, 0.14]}
          radius={0.03}
          position={[-1.3, BASE + 0.9, 0]}
          rotation-z={-0.25}
        >
          <meshStandardMaterial color="#c4302b" roughness={0.7} />
        </RoundedBox>
      </Part>

      <Part
        order={6}
        offset={[0, 0, 0]}
        label={LABEL.upper}
        columnAt={0.65}
        labelAt={[-0.2, BASE + 0.1, 0]}
        reach={1.4}
        labelSide="left"
      >
        <mesh geometry={geometry.upper}>
          <meshStandardMaterial color="#efebe4" roughness={0.95} side={DoubleSide} />
        </mesh>
        {/* The dark of the opening, inside the collar. */}
        <group position={[-0.72, BASE + 0.89, 0]} rotation-z={-0.19}>
          <mesh rotation-x={-Math.PI / 2} scale={[0.6, 0.29, 1]}>
            <circleGeometry args={[1, 48]} />
            <meshStandardMaterial color="#3a3633" roughness={1} />
          </mesh>
        </group>
      </Part>

      <Part
        order={7}
        offset={[0, -0.55, 0]}
        label={LABEL.insole}
        labelAt={[0, BASE, 0]}
        reach={1.45}
      >
        <mesh geometry={geometry.insole} position={[0.02, BASE - 0.02, 0]}>
          <meshStandardMaterial color="#d8c7ad" roughness={1} />
        </mesh>
      </Part>

      <Part
        order={8}
        offset={[0, -1.05, 0]}
        label={LABEL.midsole}
        labelAt={[0, OUTSOLE + STRIPE + 0.15, 0]}
        reach={1.65}
      >
        <mesh geometry={geometry.midsole} position={[0, OUTSOLE + STRIPE, 0]}>
          <meshStandardMaterial color="#f4f2ee" roughness={0.8} />
        </mesh>
        <mesh geometry={geometry.stripe} position={[0, OUTSOLE, 0]}>
          <meshStandardMaterial color="#cbbde3" roughness={0.8} />
        </mesh>
      </Part>

      <Part
        order={8}
        offset={[0, -1.6, 0]}
        label={LABEL.outsole}
        labelAt={[0, 0.04, 0]}
        reach={1.65}
      >
        <mesh geometry={geometry.outsole}>
          <meshStandardMaterial color="#8d8a86" roughness={0.9} />
        </mesh>
      </Part>
    </group>
  );
}
