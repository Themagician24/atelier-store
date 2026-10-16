"use client";

import { ContactShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useRef, type ReactNode, type RefObject } from "react";
import {
  BackSide,
  MathUtils,
  Vector3,
  type Group,
  type PerspectiveCamera,
} from "three";
import { damp, easeOutCubic, stageFrame } from "@/lib/exploded-view";
import type { ModelKind } from "@/lib/product-models";
import { SNEAKER_STEPS, SneakerModel } from "./sneaker-model";
import {
  NARROW_STAGE,
  StageProvider,
  useStageClock,
  type StageClock,
} from "./stage-context";
import { WATCH_STEPS, WatchModel } from "./watch-model";

/*
 * The canvas behind the product stage. Scroll progress and drag come in
 * through a ref the DOM writes; nothing here re-renders React while it plays.
 */

export type StageInput = {
  /** Raw scroll progress, 0 → 1. */
  progress: number;
  /** Rotation the visitor has dragged in, radians. */
  yaw: number;
  pitch: number;
  /** performance.now() of the last drag, to pause the turntable. */
  touchedAt: number;
};

type Shot = {
  position: [number, number, number];
  target: [number, number, number];
};

type Staging = {
  steps: number;
  /** Where labels line up on narrow frames, units right of the axis. */
  column: number;
  /** Lift so the piece sits centred on the floor, and its resting tilt. */
  lift: number;
  tilt: number;
  floor: number;
  /** How far the floor sinks to stay under the exploded parts. */
  drop: number;
  /** Turn (around y) the piece is first shown at. */
  rest: number;
  /** Turn the piece swings to while exploded, so its parts read clearly. */
  settle: number;
  overview: Shot;
  exploded: Shot;
  detail: Shot;
};

const STAGING: Record<ModelKind, Staging> = {
  watch: {
    steps: WATCH_STEPS,
    column: 1.25,
    lift: 0.3,
    tilt: 0.28,
    floor: -1.0,
    drop: 1.0,
    // Straps out to the sides, crown turned toward the camera.
    rest: -0.6,
    settle: -Math.PI / 2 + 0.2,
    overview: { position: [0, 2.6, 7.4], target: [0, 0.1, 0] },
    exploded: { position: [0, 3.4, 12], target: [0, 0.6, 0] },
    detail: { position: [0, 2.9, 3.4], target: [0, 0.35, 0] },
  },
  sneaker: {
    steps: SNEAKER_STEPS,
    column: 1.8,
    lift: -0.55,
    tilt: 0,
    floor: -0.56,
    drop: 1.7,
    // Outer side on, toe swung slightly toward the camera.
    rest: -0.6,
    settle: -0.35,
    overview: { position: [0, 2.1, 7.6], target: [0, 0.15, 0] },
    exploded: { position: [0, 2.6, 11], target: [0, 0.3, 0] },
    detail: { position: [0, 1.4, 4.2], target: [0.45, 0.35, 0] },
  },
};

const INTRO_SECONDS = 2.2;
/** Turntable speed at rest, radians per second. */
const IDLE_SPIN = 0.18;

export default function Scene({
  kind,
  input,
  active,
  reducedMotion,
  onReady,
  labelLayer,
}: {
  kind: ModelKind;
  input: RefObject<StageInput>;
  active: boolean;
  reducedMotion: boolean;
  onReady: () => void;
  labelLayer: RefObject<HTMLElement | null>;
}) {
  const staging = STAGING[kind];

  return (
    <Canvas
      // The packshot under the canvas stays visible if WebGL can't start.
      fallback={null}
      frameloop={active ? "always" : "never"}
      dpr={[1, 2]}
      camera={{ fov: 32, near: 0.1, far: 100, position: staging.overview.position }}
      gl={{ antialias: true, alpha: true }}
      style={{ touchAction: "pan-y" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 5]} intensity={1.4} />
      <directionalLight position={[-4, 2, -3]} intensity={0.5} />
      <Studio />

      <Director
        input={input}
        steps={staging.steps}
        column={staging.column}
        reducedMotion={reducedMotion}
        onReady={onReady}
        labelLayer={labelLayer}
      >
        <Rig staging={staging} />
        <Turntable input={input} staging={staging} reducedMotion={reducedMotion}>
          {kind === "watch" ? <WatchModel /> : <SneakerModel />}
        </Turntable>
        <FloorShadow staging={staging} />
      </Director>
    </Canvas>
  );
}

/** Softboxes for the metal and leather to catch, rendered once, offline. */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      {/* A grey room, so metal facing away from the softboxes isn't black. */}
      <mesh scale={30}>
        <sphereGeometry args={[1, 32, 16]} />
        <meshBasicMaterial color="#6f6f6f" side={BackSide} />
      </mesh>
      <Lightformer
        form="rect"
        intensity={2.4}
        position={[0, 6, 0]}
        rotation-x={Math.PI / 2}
        scale={[10, 6, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.6}
        position={[-6, 1.5, 1]}
        rotation-y={Math.PI / 2}
        scale={[4, 8, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.2}
        position={[6, 1, -1]}
        rotation-y={-Math.PI / 2}
        scale={[4, 8, 1]}
      />
      <Lightformer form="ring" intensity={1.5} position={[2, 2.5, 6]} scale={2.5} />
    </Environment>
  );
}

/**
 * Owns the stage clock: smooths scroll into the frame every part reads and
 * runs the entrance from the first frame the stage is seen.
 */
function Director({
  input,
  steps,
  column,
  reducedMotion,
  onReady,
  labelLayer,
  children,
}: {
  input: RefObject<StageInput>;
  steps: number;
  column: number;
  reducedMotion: boolean;
  onReady: () => void;
  labelLayer: RefObject<HTMLElement | null>;
  children: ReactNode;
}) {
  const clock = useRef<StageClock>({
    explode: 0,
    labels: 0,
    zoom: 0,
    intro: reducedMotion ? 1 : 0,
  });
  const smooth = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);

  useFrame((state, delta) => {
    if (startedAt.current === null) {
      startedAt.current = state.clock.elapsedTime;
      onReady();
    }
    const target = input.current.progress;
    smooth.current =
      reducedMotion || smooth.current === null
        ? target
        : damp(smooth.current, target, 5, Math.min(delta, 0.1));

    const frame = stageFrame(smooth.current);
    const intro = reducedMotion
      ? 1
      : easeOutCubic((state.clock.elapsedTime - startedAt.current) / INTRO_SECONDS);
    clock.current = { ...frame, intro };
  });

  return (
    <StageProvider
      clock={clock}
      count={steps}
      labelLayer={labelLayer}
      column={column}
    >
      {children}
    </StageProvider>
  );
}

/**
 * The camera moves on rails: overview → pulled back for the exploded view →
 * close-up as the piece reassembles. On narrow frames it stands further off
 * so the piece still fits across.
 */
function Rig({ staging }: { staging: Staging }) {
  const clock = useStageClock();
  const size = useThree((state) => state.size);
  const position = useRef(new Vector3());
  const target = useRef(new Vector3());
  const scratch = useRef(new Vector3());

  useFrame(({ camera }) => {
    const { explode, zoom, intro, labels } = clock.current;
    const fit = Math.max(1, 1.05 / (size.width / size.height));

    const blend = (key: keyof Shot, out: Vector3) => {
      out.fromArray(staging.overview[key]);
      out.lerp(scratch.current.fromArray(staging.exploded[key]), explode);
      out.lerp(scratch.current.fromArray(staging.detail[key]), zoom);
      return out;
    };
    blend("target", target.current);
    blend("position", position.current);

    // Stand further back on narrow frames (less so for the close-up), and
    // further still before the entrance, so the piece arrives from afar.
    const reach = MathUtils.lerp(fit, 1, zoom) * (1 + 0.9 * (1 - intro));
    position.current
      .sub(target.current)
      .multiplyScalar(reach)
      .add(target.current);

    camera.position.copy(position.current);
    camera.lookAt(target.current);

    // On narrow frames the labels all sit right, so the piece slides left
    // while they're up.
    const slide = size.width < NARROW_STAGE ? 0.2 * labels : 0;
    if (slide > 0.001) {
      (camera as PerspectiveCamera).setViewOffset(
        size.width,
        size.height,
        size.width * slide,
        0,
        size.width,
        size.height,
      );
    } else if ((camera as PerspectiveCamera).view) {
      (camera as PerspectiveCamera).clearViewOffset();
    }
  });

  return null;
}

/** Slow turntable, plus whatever the visitor drags in, plus the entrance spin. */
function Turntable({
  input,
  staging,
  reducedMotion,
  children,
}: {
  input: RefObject<StageInput>;
  staging: Staging;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  const clock = useStageClock();
  const group = useRef<Group>(null);
  const spin = useRef(0);
  const yaw = useRef(0);
  const pitch = useRef(0);

  useFrame((_, delta) => {
    if (!group.current) return;
    const dt = Math.min(delta, 0.1);
    const { explode, intro } = clock.current;
    const dragged = input.current.yaw;
    const idle = performance.now() - input.current.touchedAt > 1800;

    if (idle) {
      // Turns slowly at rest; as the piece comes apart it swings round to
      // its settle angle (the nearest full turn of it) and holds there.
      if (!reducedMotion) spin.current += dt * IDLE_SPIN * (1 - explode);
      if (explode > 0.001) {
        const turn = dragged + spin.current + staging.rest;
        const lap = Math.PI * 2;
        const settle =
          staging.settle + Math.round((turn - staging.settle) / lap) * lap;
        spin.current = damp(
          spin.current,
          settle - dragged - staging.rest,
          3 * explode,
          dt,
        );
      }
    }

    yaw.current = damp(yaw.current, dragged + spin.current, 7, dt);
    pitch.current = damp(pitch.current, input.current.pitch, 7, dt);

    const entrance = 1 - intro;
    group.current.rotation.set(
      staging.tilt + pitch.current,
      yaw.current + staging.rest - 2.2 * entrance,
      0,
    );
    group.current.position.y = staging.lift - 0.4 * entrance;
  });

  return <group ref={group}>{children}</group>;
}

/** Contact shadow under the piece, sinking as the lower parts drop away. */
function FloorShadow({ staging }: { staging: Staging }) {
  const clock = useStageClock();
  const group = useRef<Group>(null);

  useFrame(() => {
    if (!group.current) return;
    const { explode, intro } = clock.current;
    group.current.position.y =
      staging.floor - staging.drop * explode - 0.4 * (1 - intro);
  });

  return (
    <group ref={group}>
      <ContactShadows opacity={0.32} scale={9} blur={2.6} far={4} resolution={512} />
    </group>
  );
}
