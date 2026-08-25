export const GRID_SIZE = 32;
export const PIXEL_COUNT = GRID_SIZE * GRID_SIZE;

export function blankFrame() {
  return Array(PIXEL_COUNT).fill(null);
}

export function cloneFrame(frame) {
  return frame.slice(0, PIXEL_COUNT);
}

export function indexFor(x, y) {
  return y * GRID_SIZE + x;
}

export function isInside(x, y) {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

export function paintSquare(frame, x, y, size, color) {
  const next = cloneFrame(frame);
  const offset = Math.floor((size - 1) / 2);

  for (let yy = y - offset; yy < y - offset + size; yy += 1) {
    for (let xx = x - offset; xx < x - offset + size; xx += 1) {
      if (isInside(xx, yy)) next[indexFor(xx, yy)] = color;
    }
  }

  return next;
}

export function floodFill(frame, x, y, color) {
  if (!isInside(x, y)) return cloneFrame(frame);
  const next = cloneFrame(frame);
  const target = next[indexFor(x, y)];
  if (target === color) return next;

  const queue = [[x, y]];
  let cursor = 0;
  while (cursor < queue.length) {
    const [cx, cy] = queue[cursor];
    cursor += 1;
    if (!isInside(cx, cy) || next[indexFor(cx, cy)] !== target) continue;
    next[indexFor(cx, cy)] = color;
    queue.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
  }

  return next;
}

export function linePoints(fromX, fromY, toX, toY) {
  const points = [];
  let x = fromX;
  let y = fromY;
  const dx = Math.abs(toX - fromX);
  const sx = fromX < toX ? 1 : -1;
  const dy = -Math.abs(toY - fromY);
  const sy = fromY < toY ? 1 : -1;
  let error = dx + dy;

  while (true) {
    points.push({ x, y });
    if (x === toX && y === toY) break;
    const doubled = error * 2;
    if (doubled >= dy) {
      error += dy;
      x += sx;
    }
    if (doubled <= dx) {
      error += dx;
      y += sy;
    }
  }

  return points;
}

export function translateFrame(frame, deltaX, deltaY) {
  const next = blankFrame();
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const pixel = frame[indexFor(x, y)];
      const targetX = x + deltaX;
      const targetY = y + deltaY;
      if (pixel && isInside(targetX, targetY)) next[indexFor(targetX, targetY)] = pixel;
    }
  }
  return next;
}

export function scaleFrame(frame, scale) {
  const next = blankFrame();
  const center = (GRID_SIZE - 1) / 2;
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const sourceX = Math.round((x - center) / scale + center);
      const sourceY = Math.round((y - center) / scale + center);
      if (isInside(sourceX, sourceY)) next[indexFor(x, y)] = frame[indexFor(sourceX, sourceY)];
    }
  }
  return next;
}

function frameBounds(frame) {
  let minX = GRID_SIZE;
  let minY = GRID_SIZE;
  let maxX = -1;
  let maxY = -1;
  frame.forEach((pixel, index) => {
    if (!pixel) return;
    const x = index % GRID_SIZE;
    const y = Math.floor(index / GRID_SIZE);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  });
  return maxX < 0 ? { minX: 12, minY: 12, maxX: 19, maxY: 19 } : { minX, minY, maxX, maxY };
}

export function sparkleFrame(frame, color, phase = 0) {
  const next = cloneFrame(frame);
  const { minX, minY, maxX, maxY } = frameBounds(frame);
  const anchors = [
    [minX - 2, minY - 2],
    [maxX + 2, minY + 1],
    [minX - 1, maxY + 2],
    [maxX + 2, maxY - 1],
    [Math.round((minX + maxX) / 2), minY - 3],
    [maxX + 3, Math.round((minY + maxY) / 2)],
    [3, 4],
    [27, 25],
  ];
  const anchor = anchors[Math.abs(phase) % anchors.length];
  const points = phase % 2 === 0
    ? [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]
    : [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  points.forEach(([offsetX, offsetY]) => {
    const x = anchor[0] + offsetX;
    const y = anchor[1] + offsetY;
    if (isInside(x, y) && next[indexFor(x, y)] === null) next[indexFor(x, y)] = color;
  });
  return next;
}

export function effectFrames(frame, effect, color) {
  const base = cloneFrame(frame);
  if (effect === "bounce") {
    return [base, translateFrame(base, 0, -1), base, translateFrame(base, 0, 1)].map(cloneFrame);
  }
  if (effect === "wiggle") {
    return [base, translateFrame(base, -1, 0), base, translateFrame(base, 1, 0)].map(cloneFrame);
  }
  if (effect === "pulse") {
    return [base, scaleFrame(base, 1.1), base, scaleFrame(base, 0.9)].map(cloneFrame);
  }
  if (effect === "spark") {
    return [base, sparkleFrame(base, color, 0), base, sparkleFrame(base, color, 1)].map(cloneFrame);
  }
  return [base];
}

export function mirroredBrushCenter(x, size) {
  const offset = Math.floor((size - 1) / 2);
  return GRID_SIZE - x + offset * 2 - size;
}

export function canvasMetrics(viewportWidth, viewportHeight) {
  const horizontalRoom = Math.max(160, viewportWidth - 40);
  const verticalRoom = Math.max(160, viewportHeight - 300);
  const cellSize = Math.max(
    5,
    Math.min(11, Math.floor(horizontalRoom / GRID_SIZE), Math.floor(verticalRoom / GRID_SIZE)),
  );
  return { cellSize, canvasSize: cellSize * GRID_SIZE };
}
