"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent,
} from "react";
import {
  scrollProgress,
  stagePhase,
  type StagePhase,
} from "@/lib/exploded-view";
import type { ProductImage } from "@/lib/products";
import { modelDescription, type ModelKind } from "@/lib/product-models";
import type { StageInput } from "./scene";

// three.js only ships to pages that have a model, and only to the browser.
const Scene = dynamic(() => import("./scene"), { ssr: false });

const CAPTIONS: Record<StagePhase, { step: string; title: string; body: string }> = {
  assembled: {
    step: "01",
    title: "The piece",
    body: "Scroll to take it apart.",
  },
  exploded: {
    step: "02",
    title: "Every component",
    body: "Each part, laid out in the order it is assembled.",
  },
  detail: {
    step: "03",
    title: "Up close",
    body: "Drag to turn it in the light.",
  },
};

/*
 * The cinematic lead of a product page that has a 3D model. A tall track
 * holds a viewport-high frame that sticks under the header; scrolling
 * through the track plays the timeline in src/lib/exploded-view.ts —
 * assembled, exploded with labels, reassembled in close-up. Dragging turns
 * the piece. The packshot sits under the canvas until the first frame, and
 * stays if WebGL is unavailable.
 */
export function ProductStage({
  kind,
  productName,
  poster,
}: {
  kind: ModelKind;
  productName: string;
  poster: ProductImage;
}) {
  const track = useRef<HTMLElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const labels = useRef<HTMLDivElement>(null);
  const input = useRef<StageInput>({ progress: 0, yaw: 0, pitch: 0, touchedAt: 0 });
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);

  const [phase, setPhase] = useState<StagePhase>("assembled");
  const [active, setActive] = useState(false);
  const [ready, setReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const trackEl = track.current;
    const frameEl = frame.current;
    if (!trackEl || !frameEl) return;

    let queued = 0;
    const measure = () => {
      queued = 0;
      const rect = trackEl.getBoundingClientRect();
      const stickyTop = parseFloat(getComputedStyle(frameEl).top) || 0;
      const progress = scrollProgress(
        rect.top - stickyTop,
        rect.height,
        frameEl.offsetHeight,
      );
      input.current.progress = progress;
      bar.current?.style.setProperty("transform", `scaleX(${progress})`);
      setPhase(stagePhase(progress));
    };
    const schedule = () => {
      if (!queued) queued = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    // Render only while some of the track is on screen.
    const observer = new IntersectionObserver(([entry]) =>
      setActive(entry.isIntersecting),
    );
    observer.observe(trackEl);

    return () => {
      cancelAnimationFrame(queued);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, []);

  // Horizontal drags turn the piece; a mouse can tilt it too. Vertical
  // swipes on touch stay with the page (touch-action: pan-y).
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start || start.id !== event.pointerId) return;
    const state = input.current;
    state.yaw += (event.clientX - start.x) * 0.008;
    if (event.pointerType === "mouse") {
      state.pitch = Math.max(-0.5, Math.min(0.5, state.pitch + (event.clientY - start.y) * 0.005));
    }
    state.touchedAt = performance.now();
    start.x = event.clientX;
    start.y = event.clientY;
  };
  const endDrag = () => {
    drag.current = null;
  };

  const caption = CAPTIONS[phase];

  return (
    <section
      ref={track}
      aria-label={`${productName} in 3D`}
      className="relative h-[220svh] md:h-[300svh]"
    >
      <div
        ref={frame}
        role="img"
        aria-label={modelDescription(kind, productName)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="sticky top-(--header-height) isolate h-[calc(100svh-var(--header-height))] cursor-grab touch-pan-y overflow-hidden bg-mist select-none active:cursor-grabbing"
      >
        <Image
          src={poster.url}
          alt=""
          fill
          preload
          sizes="(min-width: 80rem) 66vw, (min-width: 48rem) 60vw, 100vw"
          className={`object-cover transition-opacity duration-700 ease-standard ${ready ? "opacity-0" : "opacity-100"}`}
        />

        <div
          className={`absolute inset-0 transition-opacity duration-1000 ease-standard ${ready ? "opacity-100" : "opacity-0"}`}
        >
          <Scene
            kind={kind}
            input={input}
            active={active}
            reducedMotion={reducedMotion}
            onReady={() => setReady(true)}
            labelLayer={labels}
          />
        </div>

        {/* Part labels, positioned by the scene over the canvas. */}
        <div
          ref={labels}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        />

        {/* Caption for the current act, bottom left. */}
        <div
          aria-hidden="true"
          // Mist rises behind the caption so a part passing under it never
          // fights the type.
          className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 bg-linear-to-t from-mist from-40% to-transparent p-gutter pt-24"
        >
          <div key={phase} className="stage-caption max-w-72">
            <p className="eyebrow text-muted">
              {caption.step} <span className="text-line">/ 03</span>
            </p>
            <p className="mt-2 font-display text-title">{caption.title}</p>
            <p className="mt-1 text-muted">{caption.body}</p>
          </div>
          <p className="eyebrow hidden text-muted md:block">Drag to rotate</p>
        </div>

        {/* Progress through the track, a hairline along the bottom edge. */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-line">
          <div
            ref={bar}
            className="h-full origin-left bg-ink"
            style={{ transform: "scaleX(0)" }}
          />
        </div>
      </div>
    </section>
  );
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia("(prefers-reduced-motion: reduce)");
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
