import test from "node:test";
import assert from "node:assert/strict";
import {
  GRID_SIZE,
  PIXEL_COUNT,
  blankFrame,
  canvasMetrics,
  floodFill,
  indexFor,
  linePoints,
  paintSquare,
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
