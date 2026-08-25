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

export function canvasMetrics(viewportWidth, viewportHeight) {
  const horizontalRoom = Math.max(160, viewportWidth - 40);
  const verticalRoom = Math.max(160, viewportHeight - 300);
  const cellSize = Math.max(
    5,
    Math.min(11, Math.floor(horizontalRoom / GRID_SIZE), Math.floor(verticalRoom / GRID_SIZE)),
  );
  return { cellSize, canvasSize: cellSize * GRID_SIZE };
}
