import test from "node:test";
import assert from "node:assert/strict";
import {
  GRID_SIZE,
  PIXEL_COUNT,
  blankFrame,
  canvasMetrics,
  effectFrames,
  floodFill,
  indexFor,
  linePoints,
  mirroredBrushCenter,
  paintSquare,
  paintSquareInPlace,
  sparkleFrame,
  translateFrame,
} from "../src/pixel-core.js";

test("a frame always represents exactly 32 by 32 source pixels", () => {
  assert.equal(GRID_SIZE, 32);
  assert.equal(blankFrame().length, PIXEL_COUNT);
  assert.equal(PIXEL_COUNT, 1024);
});

test("the iPhone target uses integer 11 point cells", () => {
  assert.deepEqual(canvasMetrics(393, 852), { cellSize: 11, canvasSize: 352 });
  assert.equal(canvasMetrics(393, 852).canvasSize % GRID_SIZE, 0);
});

test("small phones keep integer cells and shrink instead of cropping", () => {
  const metrics = canvasMetrics(320, 568);
  assert.equal(metrics.canvasSize, metrics.cellSize * GRID_SIZE);
  assert.ok(metrics.canvasSize <= 288);
});

test("square brushes stay clipped to the source grid", () => {
  const painted = paintSquare(blankFrame(), 0, 0, 4, "#ffffff");
  assert.equal(painted.filter(Boolean).length, 9);
  assert.equal(painted[indexFor(0, 0)], "#ffffff");
});

test("live strokes can paint in place without changing frame geometry", () => {
  const frame = blankFrame();
  const result = paintSquareInPlace(frame, 8, 8, 2, "#ffffff");
  assert.equal(result, frame);
  assert.equal(frame.length, PIXEL_COUNT);
  assert.equal(frame.filter(Boolean).length, 4);
});

test("fill changes one connected region without crossing another color", () => {
  let frame = blankFrame();
  for (let y = 0; y < GRID_SIZE; y += 1) frame = paintSquare(frame, 16, y, 1, "#000000");
  const filled = floodFill(frame, 0, 0, "#ff0000");
  assert.equal(filled[indexFor(0, 0)], "#ff0000");
  assert.equal(filled[indexFor(31, 0)], null);
  assert.equal(filled[indexFor(16, 0)], "#000000");
});

test("fast pointer movement produces an unbroken pixel line", () => {
  const points = linePoints(1, 1, 12, 7);
  assert.deepEqual(points[0], { x: 1, y: 1 });
  assert.deepEqual(points.at(-1), { x: 12, y: 7 });
  points.slice(1).forEach((point, index) => {
    const previous = points[index];
    assert.ok(Math.abs(point.x - previous.x) <= 1);
    assert.ok(Math.abs(point.y - previous.y) <= 1);
  });
});

test("frame translation stays on the exact 32 by 32 source grid", () => {
  const source = paintSquare(blankFrame(), 2, 3, 1, "#ffffff");
  const shifted = translateFrame(source, -2, 4);
  assert.equal(shifted.length, PIXEL_COUNT);
  assert.equal(shifted[indexFor(0, 7)], "#ffffff");
  assert.equal(shifted.filter(Boolean).length, 1);
});

test("animation effects produce eight independent crisp frames", () => {
  const source = paintSquare(blankFrame(), 16, 16, 3, "#55b8ff");
  for (const effect of ["bounce", "wiggle", "pulse", "spark"]) {
    const frames = effectFrames(source, effect, "#ffd84d");
    assert.equal(frames.length, 8);
    frames.forEach((frame) => assert.equal(frame.length, PIXEL_COUNT));
    assert.notEqual(frames[0], source);
    assert.deepEqual(frames[0], source);
    assert.ok(new Set(frames.map((frame) => frame.join(","))).size >= 4);
  }
});

test("bounce and wiggle travel far enough to read as motion", () => {
  const source = paintSquare(blankFrame(), 16, 16, 1, "#55b8ff");
  const bounce = effectFrames(source, "bounce", "#ffd84d");
  const wiggle = effectFrames(source, "wiggle", "#ffd84d");
  assert.equal(bounce[3][indexFor(16, 13)], "#55b8ff");
  assert.equal(wiggle[2][indexFor(14, 16)], "#55b8ff");
});

test("pulse expands off-center art around itself", () => {
  const source = paintSquare(blankFrame(), 5, 7, 3, "#55b8ff");
  const pulse = effectFrames(source, "pulse", "#ffd84d");
  const lit = pulse[2].flatMap((pixel, index) => pixel ? [{ x: index % GRID_SIZE, y: Math.floor(index / GRID_SIZE) }] : []);
  const centerX = (Math.min(...lit.map(({ x }) => x)) + Math.max(...lit.map(({ x }) => x))) / 2;
  const centerY = (Math.min(...lit.map(({ y }) => y)) + Math.max(...lit.map(({ y }) => y))) / 2;
  assert.ok(Math.abs(centerX - 5) <= 0.5);
  assert.ok(Math.abs(centerY - 7) <= 0.5);
});

test("spark frames add only whole selected-color pixels", () => {
  const source = paintSquare(blankFrame(), 16, 16, 1, "#55b8ff");
  const sparkled = sparkleFrame(source, "#ffd84d", 0);
  assert.ok(sparkled.filter((pixel) => pixel === "#ffd84d").length > 0);
  assert.equal(sparkled[indexFor(16, 16)], "#55b8ff");
});

test("even and odd mirrored brushes remain horizontally symmetric", () => {
  for (const size of [1, 2, 3, 4]) {
    let frame = paintSquare(blankFrame(), 3, 10, size, "#ffffff");
    frame = paintSquare(frame, mirroredBrushCenter(3, size), 10, size, "#ffffff");
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        assert.equal(frame[indexFor(x, y)], frame[indexFor(GRID_SIZE - 1 - x, y)]);
      }
    }
  }
});
