"use client";

import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import {
  createContext,
  useContext,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { Quaternion, Vector3, type Group } from "three";
import { partExplode, type StageFrame } from "@/lib/exploded-view";

type Vec3 = [number, number, number];

/** What the director computes once per frame, read by every part. */
export type StageClock = StageFrame & {
  /** 0 → 1 over the entrance, once the stage is first seen. */
  intro: number;
};

type Stage = {
  clock: RefObject<StageClock>;
  count: number;
  /**
   * DOM layer the part labels render into. Given explicitly: left to find
   * the canvas's parent itself, the first <Html> to mount can miss it.
   */
  labelLayer: RefObject<HTMLElement | null>;
  /** On narrow frames, how far right of the axis the labels line up. */
  column: number;
};

const StageContext = createContext<Stage | null>(null);

export function StageProvider({
  children,
  ...stage
}: Stage & { children: ReactNode }) {
  return <StageContext value={stage}>{children}</StageContext>;
}

function useStage() {
  const stage = useContext(StageContext);
  if (!stage) throw new Error("Stage parts need a <StageProvider>");
  return stage;
}

/** The current frame, for anything in the scene that follows the timeline. */
export function useStageClock() {
  return useStage().clock;
}

/** Frame width (px) below which every label sits on the right. */
export const NARROW_STAGE = 640;

const screenRight = new Vector3();
const inverse = new Quaternion();

/**
 * One component of the piece. At rest it sits where it was modelled; as the
 * stage explodes it travels by `offset` (turning by `spin` around y), in
 * `order` with its siblings. While the piece is held apart, `label` is
 * shown `reach` units to the screen's `labelSide` of `labelAt` (model space,
 * before the offset) — beside the part whichever way the piece has turned.
 */
export function Part({
  order,
  offset,
  spin = 0,
  label,
  labelAt = [0, 0, 0],
  labelSide = "right",
  reach = 1.1,
  columnAt,
  children,
}: {
  order: number;
  offset: Vec3;
  spin?: number;
  label?: string;
  labelAt?: Vec3;
  labelSide?: "left" | "right";
  reach?: number;
  /**
   * Height of the label (model space, exploded) in the narrow-frame column,
   * when parts side by side would otherwise share a line.
   */
  columnAt?: number;
  children: ReactNode;
}) {
  const { clock, count, labelLayer, column } = useStage();
  // Too narrow for labels on both sides: they all go right, and the rig
  // slides the piece left to make room.
  const narrow = useThree((state) => state.size.width < NARROW_STAGE);
  const side = narrow ? "right" : labelSide;
  const group = useRef<Group>(null);
  const anchor = useRef<Group>(null);
  const tag = useRef<HTMLDivElement>(null);

  useFrame(({ camera }) => {
    if (!group.current) return;
    const amount = partExplode(clock.current.explode, order, count);
    group.current.position.set(
      offset[0] * amount,
      offset[1] * amount,
      offset[2] * amount,
    );
    group.current.rotation.y = spin * amount;

    if (!tag.current || !anchor.current) return;
    const opacity = clock.current.labels * amount;
    tag.current.style.opacity = opacity.toFixed(3);
    tag.current.style.visibility = opacity > 0.01 ? "visible" : "hidden";
    if (opacity <= 0.01) return;

    // The camera's right, expressed in this part's own frame.
    group.current.getWorldQuaternion(inverse).invert();
    screenRight.set(1, 0, 0).applyQuaternion(camera.quaternion).applyQuaternion(inverse);

    if (narrow) {
      // One column right of the piece: the label keeps its part's height
      // but not its sideways travel, so labels stack instead of landing
      // on the parts that moved out toward them.
      const height =
        columnAt === undefined ? labelAt[1] : columnAt - offset[1] * amount;
      anchor.current.position
        .set(-offset[0] * amount, height, -offset[2] * amount)
        .addScaledVector(screenRight, column);
    } else {
      anchor.current.position
        .set(...labelAt)
        .addScaledVector(screenRight, side === "left" ? -reach : reach);
    }
  });

  return (
    <group ref={group}>
      {children}
      {label && (
        <group ref={anchor}>
          <Html
            portal={labelLayer as RefObject<HTMLElement>}
            zIndexRange={[10, 0]}
            pointerEvents="none"
          >
            <div
              ref={tag}
              style={{ opacity: 0, visibility: "hidden" }}
              className={`eyebrow flex -translate-y-1/2 items-center gap-1.5 whitespace-nowrap md:gap-2 text-ink ${side === "left" ? "-translate-x-full flex-row-reverse" : ""}`}
            >
              <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-ink" />
              <span aria-hidden="true" className="h-px w-3 shrink-0 bg-ink md:w-6" />
              {label}
            </div>
          </Html>
        </group>
      )}
    </group>
  );
}
