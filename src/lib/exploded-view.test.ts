import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  damp,
  partExplode,
  scrollProgress,
  smoothstep,
  stageFrame,
  stagePhase,
} from "./exploded-view";

describe("smoothstep", () => {
  it("clamps outside the edges and eases between them", () => {
    assert.equal(smoothstep(0, 1, -1), 0);
    assert.equal(smoothstep(0, 1, 2), 1);
    assert.equal(smoothstep(0, 1, 0.5), 0.5);
    assert.ok(smoothstep(0, 1, 0.1) < 0.1);
  });
});

describe("stageFrame", () => {
  it("starts assembled, unlabeled, wide", () => {
    assert.deepEqual(stageFrame(0), { explode: 0, labels: 0, zoom: 0 });
  });

  it("is fully exploded and labeled mid-track", () => {
    const frame = stageFrame(0.6);
    assert.equal(frame.explode, 1);
    assert.equal(frame.labels, 1);
    assert.equal(frame.zoom, 0);
  });

  it("ends reassembled, unlabeled, close up", () => {
    assert.deepEqual(stageFrame(1), { explode: 0, labels: 0, zoom: 1 });
  });

  it("hides the labels before the parts fly back in", () => {
    assert.equal(stageFrame(0.7).labels, 0);
    assert.equal(stageFrame(0.7).explode, 1);
  });

  it("closes in only once the piece is reassembled", () => {
    assert.equal(stageFrame(0.8).zoom, 0);
    assert.ok(stageFrame(0.8).explode < 0.5);
    assert.equal(stageFrame(0.88).explode, 0);
  });

  it("clamps progress out of range", () => {
    assert.deepEqual(stageFrame(-3), stageFrame(0));
    assert.deepEqual(stageFrame(4), stageFrame(1));
  });
});

describe("partExplode", () => {
  it("moves every part fully at full explode", () => {
    for (let i = 0; i < 5; i++) assert.equal(partExplode(1, i, 5), 1);
  });

  it("holds every part home at zero", () => {
    for (let i = 0; i < 5; i++) assert.equal(partExplode(0, i, 5), 0);
  });

  it("sends earlier parts first", () => {
    assert.ok(partExplode(0.3, 0, 5) > partExplode(0.3, 4, 5));
    assert.equal(partExplode(0.3, 4, 5), 0);
  });

  it("handles a single part", () => {
    assert.equal(partExplode(1, 0, 1), 1);
  });
});

describe("scrollProgress", () => {
  it("is 0 before the track reaches the frame", () => {
    assert.equal(scrollProgress(200, 3000, 800), 0);
    assert.equal(scrollProgress(0, 3000, 800), 0);
  });

  it("is linear through the travel and clamps after it", () => {
    assert.equal(scrollProgress(-1100, 3000, 800), 0.5);
    assert.equal(scrollProgress(-2200, 3000, 800), 1);
    assert.equal(scrollProgress(-9000, 3000, 800), 1);
  });

  it("is 0 when the track is no taller than the frame", () => {
    assert.equal(scrollProgress(-50, 800, 800), 0);
  });
});

describe("stagePhase", () => {
  it("names each act", () => {
    assert.equal(stagePhase(0), "assembled");
    assert.equal(stagePhase(0.4), "exploded");
    assert.equal(stagePhase(0.9), "detail");
  });
});

describe("damp", () => {
  it("approaches the target without overshooting", () => {
    const next = damp(0, 1, 6, 1 / 60);
    assert.ok(next > 0 && next < 1);
    assert.equal(damp(0, 1, 6, 0), 0);
    assert.ok(Math.abs(damp(0, 1, 6, 10) - 1) < 1e-9);
  });
});
