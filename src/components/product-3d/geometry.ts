import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  ExtrudeGeometry,
  Float32BufferAttribute,
  Shape,
  Vector3,
} from "three";

/*
 * Geometry the product models are built from. Everything is generated once
 * per mount; the models memoise the results.
 */

/** A (u, v) ∈ [0,1]² grid mapped through `fn`, with smooth normals. */
export function parametricSurface(
  fn: (u: number, v: number, target: Vector3) => void,
  uSegments: number,
  vSegments: number,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const point = new Vector3();

  for (let j = 0; j <= vSegments; j++) {
    for (let i = 0; i <= uSegments; i++) {
      const u = i / uSegments;
      const v = j / vSegments;
      fn(u, v, point);
      positions.push(point.x, point.y, point.z);
      uvs.push(u, v);
    }
  }

  const row = uSegments + 1;
  for (let j = 0; j < vSegments; j++) {
    for (let i = 0; i < uSegments; i++) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/**
 * A strap leaving a lug along +z and curling down around a wrist of radius
 * `radius`, tapering to `taper` of its width at the tip.
 */
export function bentStrap({
  width,
  thickness,
  length,
  radius,
  taper = 0.85,
}: {
  width: number;
  thickness: number;
  length: number;
  radius: number;
  taper?: number;
}) {
  const geometry = new BoxGeometry(width, thickness, length, 1, 1, 48);
  geometry.translate(0, 0, length / 2);
  const position = geometry.attributes.position;

  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const t = position.getY(i);
    const s = position.getZ(i);
    const along = s / length;
    const angle = s / radius;
    const r = radius + t;
    position.setXYZ(
      i,
      x * (1 - (1 - taper) * along),
      r * Math.cos(angle) - radius,
      r * Math.sin(angle),
    );
  }

  geometry.computeVertexNormals();
  return geometry;
}

/** A flat spur gear lying in the xz plane, `depth` tall along +y. */
export function gearGeometry(radius: number, teeth: number, depth: number) {
  const shape = new Shape();
  const root = radius * 0.86;
  const steps = teeth * 4;
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2;
    const r = i % 4 === 1 || i % 4 === 2 ? radius : root;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const hole = new Shape();
  hole.absarc(0, 0, radius * 0.18, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geometry = new ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/*
 * The sneaker's footprint seen from above: heel at -x, toe at +x, the
 * outer side (+z) a touch wider than the arch. Everything in the shoe —
 * soles, insole, upper — is derived from this one outline.
 */
const FOOTPRINT: [number, number][] = [
  [-1.45, 0],
  [-1.36, 0.3],
  [-0.95, 0.43],
  [-0.2, 0.42],
  [0.6, 0.53],
  [1.15, 0.43],
  [1.45, 0.18],
  [1.52, 0],
  [1.45, -0.17],
  [1.15, -0.42],
  [0.6, -0.5],
  [-0.2, -0.34],
  [-0.95, -0.4],
  [-1.36, -0.29],
];

export const footprintCurve = new CatmullRomCurve3(
  FOOTPRINT.map(([x, z]) => new Vector3(x, 0, z)),
  true,
  "centripetal",
);

/** The footprint as an extruded slab from y = 0 up to `depth`. */
export function footprintSlab(
  scale: number,
  depth: number,
  bevel = 0,
): BufferGeometry {
  const points = footprintCurve.getSpacedPoints(96);
  const shape = new Shape();
  points.forEach((p, i) => {
    // Shape y becomes -z once the slab is turned to lie flat.
    if (i === 0) shape.moveTo(p.x * scale, -p.z * scale);
    else shape.lineTo(p.x * scale, -p.z * scale);
  });

  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 4,
    curveSegments: 4,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, bevel, 0);
  return geometry;
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const SHOE_ARC = 0.85 * (Math.PI / 2);
const scratch = new Vector3();

/**
 * A point on the sneaker upper. `u` runs around the footprint (0 heel,
 * ~0.5 toe, 1 heel again, +z side first), `v` from the sole (0) up the
 * side to the top line (1) and on to the closed seam along the instep
 * (1.25). `inflate` pushes the point out from the shoe's core, for panels
 * that sit on top of the upper.
 */
export function upperPoint(
  u: number,
  v: number,
  base: number,
  inflate: number,
  target: Vector3,
) {
  footprintCurve.getPointAt(((u % 1) + 1) % 1, scratch);
  const side = Math.min(v, 1);
  const theta = side * SHOE_ARC;
  const height = 0.98 - 0.5 * smooth(-0.6, 1.5, scratch.x);

  let x = scratch.x * (0.8 + 0.2 * Math.cos(theta));
  let z = scratch.z * (0.12 + 0.88 * Math.cos(theta));
  let y = base + (height * Math.sin(theta)) / Math.sin(SHOE_ARC);

  if (v > 1) {
    // Close the top: draw the side in to the centreline, slightly domed.
    const k = Math.min(1, (v - 1) / 0.25);
    z *= 1 - k;
    y += 0.05 * Math.sin(k * Math.PI * 0.5);
    x *= 1 - 0.02 * k;
  }

  const coreY = base + 0.35;
  target.set(x * inflate, coreY + (y - coreY) * inflate, z * inflate);
  return target;
}
