/*
 * Timeline of the 3D product stage, as pure functions of scroll progress
 * (0 at the top of the stage, 1 once it has scrolled past). The scene reads
 * these every frame; nothing here touches three.js or the DOM.
 *
 *   0 ── 0.10 ───── 0.50 ───── 0.70 ───── 0.88 ── 1
 *   assembled │ parts fly out │ hold, labeled │ reassemble │ close-up
 *
 * The camera only closes in once the parts are home, so the close-up never
 * crops an exploded piece.
 */

export const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Hermite ease between two edges, 0 before the first and 1 after the second. */
export function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export const easeOutCubic = (t: number) => 1 - (1 - clamp01(t)) ** 3;

export type StageFrame = {
  /** 0 assembled → 1 fully exploded. */
  explode: number;
  /** Opacity of the part labels. */
  labels: number;
  /** 0 overview → 1 close-up camera. */
  zoom: number;
};

export function stageFrame(progress: number): StageFrame {
  const p = clamp01(progress);
  return {
    explode: smoothstep(0.1, 0.5, p) * (1 - smoothstep(0.7, 0.88, p)),
    labels: smoothstep(0.42, 0.55, p) * (1 - smoothstep(0.62, 0.7, p)),
    zoom: smoothstep(0.8, 1, p),
  };
}

/**
 * How far one part has travelled, given the overall explode amount. Parts
 * leave in order: part `index` of `count` starts once `stagger` of the way is
 * spread across the earlier ones, so the outermost pieces lead.
 */
export function partExplode(
  explode: number,
  index: number,
  count: number,
  stagger = 0.4,
) {
  if (count <= 1) return easeOutCubic(explode);
  const start = (index / (count - 1)) * stagger;
  return easeOutCubic((explode - start) / (1 - stagger));
}

/**
 * Progress of a tall scroll track whose content sticks in a viewport-high
 * frame: 0 while its top is at or below the frame's top, 1 once its bottom
 * reaches the frame's bottom.
 */
export function scrollProgress(top: number, height: number, frame: number) {
  const travel = height - frame;
  if (travel <= 0) return 0;
  return clamp01(-top / travel);
}

export type StagePhase = "assembled" | "exploded" | "detail";

/** The caption the stage shows for a given progress. */
export function stagePhase(progress: number): StagePhase {
  if (progress < 0.12) return "assembled";
  if (progress < 0.72) return "exploded";
  return "detail";
}

/** Frame-rate independent exponential approach of `current` to `target`. */
export function damp(current: number, target: number, rate: number, dt: number) {
  return target + (current - target) * Math.exp(-rate * dt);
}
