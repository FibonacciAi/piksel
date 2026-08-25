import {
  GRID_SIZE,
  PIXEL_COUNT,
  blankFrame,
  canvasMetrics,
  cloneFrame,
  deleteFrameAt,
  effectFrames,
  floodFill,
  indexFor,
  linePoints,
  mirroredBrushCenter,
  moveFrameAt,
  paintSquareInPlace,
} from "./pixel-core.js";

const STORAGE_KEY = "piksel.current-loop.v1";
const CHECKER = ["#15171a", "#1b1e22"];
const GRID_LINE = "rgba(255, 255, 255, 0.055)";
const DEFAULT_COLOR = "#ffd84d";
const HISTORY_LIMIT = 60;
const QUICK_COLORS = [
  { value: "#ffd84d", name: "Yellow" },
  { value: "#ff6f7c", name: "Coral" },
  { value: "#55b8ff", name: "Blue" },
  { value: "#73f0bb", name: "Mint" },
  { value: "#ad7cff", name: "Purple" },
  { value: "#f6f2e8", name: "Cream" },
  { value: "#202126", name: "Ink" },
];
const DRAWING_TOOLS = [
  { id: "pencil", label: "Draw" },
  { id: "eraser", label: "Erase" },
  { id: "fill", label: "Fill" },
  { id: "eyedropper", label: "Pick" },
];
const MAGIC_EFFECTS = [
  { id: "bounce", label: "Bounce", hint: "Up + down", symbol: "↕" },
  { id: "wiggle", label: "Wiggle", hint: "Side to side", symbol: "↔" },
  { id: "pulse", label: "Pulse", hint: "In + out", symbol: "◎" },
  { id: "spark", label: "Spark", hint: "Makes stars", symbol: "✦" },
];
const PLAYBACK_SPEEDS = [6, 12, 18];

function paintRect(frame, x, y, width, height, color) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) {
      frame[indexFor(xx, yy)] = color;
    }
  }
}

function makeCopeFrame(step = 0) {
  const frame = blankFrame();
  const ink = "#202126";
  const body = "#ffcf43";
  const cheek = "#ff6f7c";
  const shadow = "#e49a2d";
  const lift = step === 1 ? -1 : 0;

  paintRect(frame, 9, 9 + lift, 14, 17, body);
  paintRect(frame, 7, 12 + lift, 18, 11, body);
  paintRect(frame, 10, 7 + lift, 12, 2, body);
  paintRect(frame, 8, 23 + lift, 16, 2, shadow);
  paintRect(frame, 11, 13 + lift, 3, 3, ink);
  paintRect(frame, 19, 13 + lift, 3, 3, ink);
  paintRect(frame, 12, 18 + lift, 2, 2, cheek);
  paintRect(frame, 20, 18 + lift, 2, 2, cheek);
  paintRect(frame, 15, 18 + lift, 4, 1, ink);
  paintRect(frame, 14, 19 + lift, 6, 1, ink);
  paintRect(frame, 10 + step, 25 + lift, 4, 2, ink);
  paintRect(frame, 19 - step, 25 + lift, 4, 2, ink);
  return frame;
}

function makeBlinkFrame(closed = false) {
  const frame = blankFrame();
  const blue = "#55b8ff";
  const ink = "#132232";
  const shine = "#d7f5ff";
  paintRect(frame, 8, 8, 16, 17, blue);
  paintRect(frame, 6, 12, 20, 10, blue);
  paintRect(frame, 10, 6, 12, 2, blue);
  if (closed) {
    paintRect(frame, 10, 15, 5, 1, ink);
    paintRect(frame, 19, 15, 5, 1, ink);
  } else {
    paintRect(frame, 11, 13, 4, 5, ink);
    paintRect(frame, 20, 13, 4, 5, ink);
    paintRect(frame, 12, 13, 1, 1, shine);
    paintRect(frame, 21, 13, 1, 1, shine);
  }
  paintRect(frame, 14, 21, 7, 1, ink);
  return frame;
}

function makeOrbitFrame(step = 0) {
  const frame = blankFrame();
  const purple = "#ad7cff";
  const mint = "#73f0bb";
  const core = "#f6f2e8";
  paintRect(frame, 13, 13, 7, 7, purple);
  paintRect(frame, 15, 15, 3, 3, core);
  const points = [
    [16, 6], [22, 9], [25, 16], [22, 23], [16, 26], [9, 22], [6, 16], [9, 9],
  ];
  points.forEach((_, index) => {
    const shifted = points[(index + step) % points.length];
    paintRect(frame, shifted[0], shifted[1], 2, 2, index % 2 ? mint : purple);
  });
  return frame;
}

function makeWaveFrame(step = 0) {
  const frame = blankFrame();
  const pink = "#ff788d";
  const cream = "#fff0c2";
  for (let x = 5; x < 27; x += 1) {
    const y = 15 + Math.round(Math.sin((x + step * 2) * 0.58) * 4);
    paintRect(frame, x, y, 1, 3, pink);
    if (x % 4 === 0) frame[indexFor(x, y - 1)] = cream;
  }
  return frame;
}

const SAMPLE_LOOPS = [
  { name: "Cope", frames: [makeCopeFrame(0), makeCopeFrame(1), makeCopeFrame(2)] },
  { name: "Blink", frames: [makeBlinkFrame(false), makeBlinkFrame(true), makeBlinkFrame(false)] },
  { name: "Orbit", frames: [0, 1, 2, 3].map(makeOrbitFrame) },
  { name: "Wave", frames: [0, 1, 2].map(makeWaveFrame) },
];

function validFrame(frame) {
  return Array.isArray(frame) && frame.length === PIXEL_COUNT && frame.every((pixel) => pixel === null || /^#[0-9a-f]{6}$/i.test(pixel));
}

function storedLoop() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (typeof parsed?.name === "string" && Array.isArray(parsed.frames) && parsed.frames.length > 0 && parsed.frames.every(validFrame)) {
      return { name: parsed.name.slice(0, 48), frames: parsed.frames.map(cloneFrame) };
    }
  } catch {
    // Device storage is optional; the editor still works without it.
  }
  return { name: SAMPLE_LOOPS[0].name, frames: SAMPLE_LOOPS[0].frames.map(cloneFrame) };
}

const initialLoop = storedLoop();
const state = {
  name: initialLoop.name,
  frames: initialLoop.frames,
  selectedFrame: 0,
  selectedTool: "pencil",
  brushSize: 1,
  color: DEFAULT_COLOR,
  playing: false,
  playTimer: null,
  drawing: false,
  lastCell: null,
  undoStack: [],
  redoStack: [],
  pendingHistory: null,
  mirror: false,
  onionSkin: false,
  playbackFps: 12,
  motionName: null,
};

const app = document.querySelector("#app");
let activeResizeHandler = null;
let activeKeydownHandler = null;

function escapeText(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;",
  })[character]);
}

function saveLoop() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: 1,
      name: state.name,
      frames: state.frames,
    }));
  } catch {
    // Private browsing or a full storage quota should not stop drawing.
  }
}

function useLoop(loop) {
  stopPlayback();
  state.name = loop.name || "Untitled";
  state.frames = loop.frames.map(cloneFrame);
  state.selectedFrame = 0;
  state.selectedTool = "pencil";
  state.brushSize = 1;
  state.undoStack = [];
  state.redoStack = [];
  state.pendingHistory = null;
  state.mirror = false;
  state.onionSkin = false;
  state.motionName = null;
  saveLoop();
  if (location.hash !== "#/editor") location.hash = "#/editor";
  else renderApp();
}

function mixPixelColor(foreground, background, opacity) {
  const channel = (color, offset) => Number.parseInt(color.slice(offset, offset + 2), 16);
  const mixed = [1, 3, 5].map((offset) => Math.round(
    channel(foreground, offset) * opacity + channel(background, offset) * (1 - opacity),
  ));
  return `#${mixed.map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function drawFrame(context, frame, includeChecker = true, onionFrame = null) {
  context.imageSmoothingEnabled = false;
  context.clearRect(0, 0, GRID_SIZE, GRID_SIZE);
  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      const pixel = frame[indexFor(x, y)];
      const checker = CHECKER[(x + y) % 2];
      const onionPixel = onionFrame?.[indexFor(x, y)];
      if (pixel || onionPixel || includeChecker) {
        context.fillStyle = pixel ?? (onionPixel ? mixPixelColor(onionPixel, checker, 0.3) : checker);
        context.fillRect(x, y, 1, 1);
      }
    }
  }
}

function paintPreviewCanvases(root = document) {
  root.querySelectorAll("canvas[data-preview]").forEach((canvas) => {
    const loopIndex = Number(canvas.dataset.preview);
    const source = canvas.dataset.source === "current"
      ? state.frames[0]
      : SAMPLE_LOOPS[loopIndex]?.frames[0];
    if (!source) return;
    const context = canvas.getContext("2d", { alpha: false });
    drawFrame(context, source);
  });
}

function loopCard({ name, frameSource, index, compact = false }) {
  const source = frameSource === "current" ? "current" : "sample";
  return `
    <button class="loop-card${compact ? " is-compact" : ""}" type="button" data-open-loop="${frameSource === "current" ? "current" : index}" aria-label="Open ${escapeText(name)}">
      <span class="loop-preview"><canvas width="32" height="32" data-preview="${index}" data-source="${source}"></canvas></span>
      <span class="loop-card-name">${escapeText(name || "Untitled")}</span>
    </button>
  `;
}

function renderHome() {
  stopPlayback();
  if (activeResizeHandler) window.removeEventListener("resize", activeResizeHandler);
  activeResizeHandler = null;
  if (activeKeydownHandler) window.removeEventListener("keydown", activeKeydownHandler);
  activeKeydownHandler = null;
  const wallLoops = [
    { name: state.name || "Untitled", frameSource: "current", index: 0 },
    { name: SAMPLE_LOOPS[1].name, frameSource: "sample", index: 1 },
    { name: SAMPLE_LOOPS[2].name, frameSource: "sample", index: 2 },
    { name: SAMPLE_LOOPS[3].name, frameSource: "sample", index: 3 },
  ];

  app.innerHTML = `
    <section class="app-shell home-screen" aria-label="Piksel home">
      <header class="home-header">
        <h1>Piksel</h1>
        <p>Pick a loop. Draw. Drop it on the wall.</p>
        <div class="home-magic-note"><span aria-hidden="true">✦</span><strong>Magic motion</strong><span>One frame → four-frame loop</span></div>
      </header>

      <div class="home-content">
        <section aria-labelledby="wall-title">
          <div class="section-heading"><h2 id="wall-title">The wall</h2></div>
          <div class="wall-grid">
            ${wallLoops.map(loopCard).join("")}
          </div>
        </section>

        <section class="featured-section" aria-labelledby="greg-title">
          <div class="section-heading"><h2 id="greg-title">Greg</h2><span>Featured loops</span></div>
          <div class="featured-row">
            ${SAMPLE_LOOPS.slice(0, 3).map((loop, index) => loopCard({ name: loop.name, frameSource: "sample", index, compact: true })).join("")}
          </div>
        </section>

        <div class="start-actions" aria-label="Start a loop">
          <label class="start-button photo-button">
            <input id="photo-input" type="file" accept="image/*" />
            <span class="photo-icon" aria-hidden="true"></span>
            <span>From a photo</span>
          </label>
          <button class="start-button blank-button" type="button">
            <span class="blank-icon" aria-hidden="true">+</span>
            <span>Start blank</span>
          </button>
        </div>
      </div>
      <div class="status-toast" role="status" aria-live="polite"></div>
    </section>
  `;

  paintPreviewCanvases(app);

  app.querySelectorAll("[data-open-loop]").forEach((button) => {
    button.addEventListener("click", () => {
      const source = button.dataset.openLoop;
      if (source === "current") useLoop({ name: state.name, frames: state.frames });
      else useLoop(SAMPLE_LOOPS[Number(source)]);
    });
  });

  app.querySelector(".blank-button").addEventListener("click", () => {
    useLoop({ name: "Untitled", frames: [blankFrame()] });
  });

  app.querySelector("#photo-input").addEventListener("change", importPhoto);
}

function editorMarkup() {
  return `
    <section class="app-shell editor-screen" aria-label="Piksel editor">
      <header class="editor-header">
        <button class="header-action back-action" type="button" aria-label="Back to home">
          <span aria-hidden="true">‹</span><span class="back-word">Back</span>
        </button>
        <h1 class="loop-name">${escapeText(state.name || "Untitled")}</h1>
        <div class="header-actions">
          <button class="icon-button play-button" type="button" aria-label="Play loop">
            <span class="play-icon" aria-hidden="true"></span>
            <span class="play-word">Play</span>
          </button>
          <button class="icon-button share-button" type="button" aria-label="Share loop">
            <span class="share-icon" aria-hidden="true"></span>
            <span>Share</span>
          </button>
        </div>
      </header>

      <div class="editor-body">
        <div class="canvas-stack">
          <div class="canvas-stage" aria-label="32 by 32 drawing canvas">
            <canvas id="pixel-canvas" width="32" height="32"></canvas>
          </div>
          <div class="canvas-hud" aria-live="polite">
            <span class="tool-status">Draw · 1 px</span>
            <span class="frame-status">Frame 1 / ${state.frames.length} · ${state.playbackFps} fps</span>
          </div>
        </div>
      </div>

      <section class="editor-tray" aria-label="Editing controls">
        <div class="frames-row">
          <div class="frame-strip" role="list" aria-label="Frames"></div>
        </div>
        <div class="frame-actions" role="group" aria-label="Selected frame actions">
          <button class="frame-action duplicate-frame" type="button" aria-label="Duplicate selected frame">
            <span class="duplicate-icon" aria-hidden="true"></span><span>Copy</span>
          </button>
          <button class="frame-action move-frame-left" type="button" aria-label="Move selected frame earlier"><span aria-hidden="true">←</span><span>Earlier</span></button>
          <button class="frame-action move-frame-right" type="button" aria-label="Move selected frame later"><span>Later</span><span aria-hidden="true">→</span></button>
          <button class="frame-action delete-frame" type="button" aria-label="Delete selected frame"><span aria-hidden="true">×</span><span>Delete</span></button>
        </div>

        <div class="drawing-controls">
          <div class="tool-group" role="toolbar" aria-label="Drawing tools">
            ${DRAWING_TOOLS.map(({ id, label }) => `
              <button class="tool-button${state.selectedTool === id ? " is-selected" : ""}" type="button" data-tool="${id}" aria-label="${label}" aria-pressed="${state.selectedTool === id}">
                <span class="tool-icon ${id}-icon" aria-hidden="true"></span>
                <span>${label}</span>
              </button>
            `).join("")}
          </div>

          <div class="color-row">
            <span class="control-label">Ink</span>
            <div class="color-palette" role="group" aria-label="Quick colors">
              ${QUICK_COLORS.map(({ value, name }) => `
                <button class="quick-color${state.color === value ? " is-selected" : ""}" type="button" data-color="${value}" aria-label="${name}" aria-pressed="${state.color === value}" style="--quick-color:${value}"></button>
              `).join("")}
              <label class="color-button" aria-label="Choose another color">
                <input id="color-input" type="color" value="${state.color}" />
                <span class="color-swatch" aria-hidden="true" style="background:${state.color}"></span>
                <span>More</span>
              </label>
            </div>
          </div>

          <div class="utility-row">
            <div class="history-group" role="group" aria-label="Edit history">
              <button class="utility-button undo-button" type="button"${state.undoStack.length ? "" : " disabled"}><span aria-hidden="true">↶</span>Undo</button>
              <button class="utility-button redo-button" type="button"${state.redoStack.length ? "" : " disabled"}><span aria-hidden="true">↷</span>Redo</button>
            </div>
            <div class="helper-group" role="group" aria-label="Drawing helpers">
              <button class="toggle-button mirror-button${state.mirror ? " is-selected" : ""}" type="button" aria-label="Mirror drawing" aria-pressed="${state.mirror}"><span aria-hidden="true">↔</span>Mirror</button>
              <button class="toggle-button onion-button${state.onionSkin ? " is-selected" : ""}" type="button" aria-label="Onion skin" aria-pressed="${state.onionSkin}"><span class="onion-icon" aria-hidden="true"></span>Onion</button>
            </div>
            <button class="motion-trigger" type="button" aria-expanded="false" aria-controls="motion-panel" aria-label="Open motion effects"><span aria-hidden="true">✦</span><span>Motion</span><span class="motion-chevron" aria-hidden="true">⌄</span></button>
          </div>

          <div class="motion-panel" id="motion-panel" aria-label="One-tap animation" hidden>
            <div class="motion-copy"><strong>Make it move</strong><small>Choose an effect. Get 8 editable frames.</small></div>
            ${MAGIC_EFFECTS.map(({ id, label, hint, symbol }) => `
              <button class="magic-button" type="button" data-effect="${id}" aria-label="Make a ${label.toLowerCase()} loop">
                <span aria-hidden="true">${symbol}</span><span><strong>${label}</strong><small>${hint}</small></span>
              </button>
            `).join("")}
          </div>

          <div class="control-footer">
            <div class="brush-control">
              <span class="control-label">Brush</span>
              <div class="brush-group" role="group" aria-label="Brush size">
                ${[1, 2, 3, 4].map((size) => `<button class="brush-button${size === state.brushSize ? " is-selected" : ""}" type="button" data-size="${size}" aria-label="${size} pixel brush" aria-pressed="${size === state.brushSize}"><span class="brush-square" style="--dot-size:${3 + size * 2}px" aria-hidden="true"></span><span>${size}</span></button>`).join("")}
              </div>
            </div>
            <div class="speed-control">
              <span class="control-label">Speed</span>
              <div class="speed-group" role="group" aria-label="Playback speed">
                ${PLAYBACK_SPEEDS.map((fps) => `<button class="speed-button${fps === state.playbackFps ? " is-selected" : ""}" type="button" data-fps="${fps}" aria-label="${fps} frames per second" aria-pressed="${fps === state.playbackFps}">${fps}</button>`).join("")}
              </div>
            </div>
          </div>
        </div>
      </section>
      <div class="status-toast" role="status" aria-live="polite"></div>
    </section>
  `;
}

function renderEditor() {
  app.innerHTML = editorMarkup();
  const pixelCanvas = app.querySelector("#pixel-canvas");
  const pixelContext = pixelCanvas.getContext("2d", { alpha: false });
  const frameStrip = app.querySelector(".frame-strip");
  const colorInput = app.querySelector("#color-input");
  const colorSwatch = app.querySelector(".color-swatch");
  let pendingCanvasRender = null;
  pixelContext.imageSmoothingEnabled = false;

  function captureSnapshot() {
    return {
      frames: state.frames.map(cloneFrame),
      selectedFrame: state.selectedFrame,
    };
  }

  function snapshotMatches(snapshot) {
    if (!snapshot || snapshot.frames.length !== state.frames.length) return false;
    return snapshot.frames.every((frame, frameIndex) => (
      frame.every((pixel, pixelIndex) => pixel === state.frames[frameIndex][pixelIndex])
    ));
  }

  function updateHistoryControls() {
    const undoButton = app.querySelector(".undo-button");
    const redoButton = app.querySelector(".redo-button");
    if (undoButton) undoButton.disabled = state.undoStack.length === 0;
    if (redoButton) redoButton.disabled = state.redoStack.length === 0;
  }

  function rememberSnapshot(snapshot) {
    if (!snapshot || snapshotMatches(snapshot)) return false;
    state.undoStack.push(snapshot);
    if (state.undoStack.length > HISTORY_LIMIT) state.undoStack.shift();
    state.redoStack = [];
    updateHistoryControls();
    return true;
  }

  function beginHistoryStep() {
    state.pendingHistory = captureSnapshot();
  }

  function commitHistoryStep() {
    const snapshot = state.pendingHistory;
    state.pendingHistory = null;
    return rememberSnapshot(snapshot);
  }

  function restoreSnapshot(snapshot) {
    state.frames = snapshot.frames.map(cloneFrame);
    state.selectedFrame = Math.min(snapshot.selectedFrame, state.frames.length - 1);
    saveLoop();
    renderFrames();
    renderCanvas();
    updateHistoryControls();
  }

  function undo() {
    if (!state.undoStack.length) return;
    setPlaying(false, renderCanvas, updateFrameSelection);
    state.redoStack.push(captureSnapshot());
    restoreSnapshot(state.undoStack.pop());
    showToast("Undid last change");
  }

  function redo() {
    if (!state.redoStack.length) return;
    setPlaying(false, renderCanvas, updateFrameSelection);
    state.undoStack.push(captureSnapshot());
    restoreSnapshot(state.redoStack.pop());
    showToast("Redid last change");
  }

  function resizeCanvas() {
    const { cellSize, canvasSize } = canvasMetrics(window.innerWidth, window.innerHeight);
    document.documentElement.style.setProperty("--cell-size", `${cellSize}px`);
    document.documentElement.style.setProperty("--canvas-size", `${canvasSize}px`);
    document.documentElement.style.setProperty("--grid-line", GRID_LINE);
  }

  function renderCanvas() {
    const onionFrame = state.onionSkin && !state.playing && state.frames.length > 1
      ? state.frames[(state.selectedFrame - 1 + state.frames.length) % state.frames.length]
      : null;
    drawFrame(pixelContext, state.frames[state.selectedFrame], true, onionFrame);
  }

  function scheduleCanvasRender() {
    if (pendingCanvasRender !== null) return;
    pendingCanvasRender = requestAnimationFrame(() => {
      pendingCanvasRender = null;
      renderCanvas();
    });
  }

  function updateHud() {
    const tool = DRAWING_TOOLS.find(({ id }) => id === state.selectedTool)?.label ?? "Draw";
    const toolStatus = app.querySelector(".tool-status");
    const frameStatus = app.querySelector(".frame-status");
    if (toolStatus) toolStatus.textContent = state.playing && state.motionName
      ? `${state.motionName} · Playing`
      : `${tool} · ${state.brushSize} px`;
    if (frameStatus) frameStatus.textContent = `Frame ${state.selectedFrame + 1} / ${state.frames.length} · ${state.playbackFps} fps`;
  }

  function renderThumbnail(index) {
    const canvas = frameStrip.querySelector(`.frame-card[data-frame="${index}"] canvas`);
    if (!canvas) return;
    const context = canvas.getContext("2d", { alpha: false });
    drawFrame(context, state.frames[index]);
  }

  function updateFrameSelection() {
    frameStrip.querySelectorAll(".frame-card").forEach((card) => {
      const selected = Number(card.dataset.frame) === state.selectedFrame;
      card.classList.toggle("is-selected", selected);
      card.setAttribute("aria-current", String(selected));
    });
    updateFrameControls();
    updateHud();
  }

  function updateFrameControls() {
    const leftButton = app.querySelector(".move-frame-left");
    const rightButton = app.querySelector(".move-frame-right");
    const deleteButton = app.querySelector(".delete-frame");
    if (leftButton) leftButton.disabled = state.selectedFrame === 0;
    if (rightButton) rightButton.disabled = state.selectedFrame === state.frames.length - 1;
    if (deleteButton) deleteButton.disabled = state.frames.length <= 1;
  }

  function updateAssistControls() {
    const mirrorButton = app.querySelector(".mirror-button");
    const onionButton = app.querySelector(".onion-button");
    if (state.frames.length < 2) state.onionSkin = false;
    mirrorButton?.classList.toggle("is-selected", state.mirror);
    mirrorButton?.setAttribute("aria-pressed", String(state.mirror));
    onionButton?.classList.toggle("is-selected", state.onionSkin);
    onionButton?.setAttribute("aria-pressed", String(state.onionSkin));
    if (onionButton) onionButton.disabled = state.frames.length < 2;
  }

  function renderFrames() {
    frameStrip.innerHTML = state.frames.map((_, index) => `
      <button class="frame-card${index === state.selectedFrame ? " is-selected" : ""}" type="button" data-frame="${index}" role="listitem" aria-label="Frame ${index + 1}" aria-current="${index === state.selectedFrame}">
        <canvas width="32" height="32"></canvas>
        <span>${index + 1}</span>
      </button>
    `).join("") + `
      <button class="add-frame" type="button" aria-label="Add frame"><span aria-hidden="true">+</span><span>Frame</span></button>
    `;

    frameStrip.querySelectorAll(".frame-card").forEach((card) => {
      const index = Number(card.dataset.frame);
      renderThumbnail(index);
      card.addEventListener("click", () => selectFrame(index));
    });

    frameStrip.querySelector(".add-frame").addEventListener("click", () => {
      const snapshot = captureSnapshot();
      state.frames.push(blankFrame());
      state.selectedFrame = state.frames.length - 1;
      rememberSnapshot(snapshot);
      saveLoop();
      renderFrames();
      renderCanvas();
      requestAnimationFrame(() => frameStrip.scrollTo({ left: frameStrip.scrollWidth }));
    });

    updateAssistControls();
    updateFrameControls();
    updateHud();
  }

  function selectFrame(index) {
    state.selectedFrame = index;
    renderCanvas();
    updateFrameSelection();
  }

  function duplicateSelectedFrame() {
    const snapshot = captureSnapshot();
    setPlaying(false, renderCanvas, updateFrameSelection);
    state.frames.splice(state.selectedFrame + 1, 0, cloneFrame(state.frames[state.selectedFrame]));
    state.selectedFrame += 1;
    state.motionName = null;
    rememberSnapshot(snapshot);
    saveLoop();
    renderFrames();
    renderCanvas();
    showToast("Frame copied");
  }

  function moveSelectedFrame(offset) {
    const target = state.selectedFrame + offset;
    if (target < 0 || target >= state.frames.length) return;
    const snapshot = captureSnapshot();
    setPlaying(false, renderCanvas, updateFrameSelection);
    state.frames = moveFrameAt(state.frames, state.selectedFrame, target);
    state.selectedFrame = target;
    state.motionName = null;
    rememberSnapshot(snapshot);
    saveLoop();
    renderFrames();
    renderCanvas();
    showToast(offset < 0 ? "Frame moved earlier" : "Frame moved later");
  }

  function deleteSelectedFrame() {
    if (state.frames.length <= 1) {
      showToast("Keep at least one frame");
      return;
    }
    const snapshot = captureSnapshot();
    setPlaying(false, renderCanvas, updateFrameSelection);
    state.frames = deleteFrameAt(state.frames, state.selectedFrame);
    state.selectedFrame = Math.min(state.selectedFrame, state.frames.length - 1);
    state.motionName = null;
    rememberSnapshot(snapshot);
    saveLoop();
    renderFrames();
    renderCanvas();
    showToast("Frame deleted · Undo available");
  }

  function setTool(tool) {
    state.selectedTool = tool;
    app.querySelectorAll(".tool-button").forEach((button) => {
      const selected = button.dataset.tool === tool;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    updateHud();
  }

  function setBrushSize(size) {
    state.brushSize = size;
    app.querySelectorAll(".brush-button").forEach((button) => {
      const selected = Number(button.dataset.size) === size;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    updateHud();
  }

  function setPlaybackFps(fps) {
    state.playbackFps = fps;
    app.querySelectorAll(".speed-button").forEach((button) => {
      const selected = Number(button.dataset.fps) === fps;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    updateHud();
    if (state.playing) setPlaying(true, renderCanvas, updateFrameSelection);
  }

  function setMirror(enabled) {
    state.mirror = enabled;
    updateAssistControls();
    showToast(enabled ? "Mirror on" : "Mirror off");
  }

  function setOnionSkin(enabled) {
    if (state.frames.length < 2) return;
    state.onionSkin = enabled;
    updateAssistControls();
    renderCanvas();
    showToast(enabled ? "Onion skin on" : "Onion skin off");
  }

  function makeMagicLoop(effect) {
    const magic = MAGIC_EFFECTS.find((item) => item.id === effect);
    if (!magic) return;
    const snapshot = captureSnapshot();
    const source = cloneFrame(state.frames[state.selectedFrame]);
    if (!source.some(Boolean) && effect !== "spark") {
      showToast("Draw something first");
      return;
    }
    setPlaying(false, renderCanvas, updateFrameSelection);
    const filledPixels = source.filter(Boolean);
    const selectedColorShare = filledPixels.length
      ? filledPixels.filter((pixel) => pixel?.toLowerCase() === state.color.toLowerCase()).length / filledPixels.length
      : 0;
    const sparkColor = state.color.toLowerCase() === "#202126"
      ? "#ffd84d"
      : selectedColorShare > 0.35 ? "#f6f2e8" : state.color;
    state.frames = effectFrames(source, effect, effect === "spark" ? sparkColor : state.color);
    state.selectedFrame = 0;
    state.motionName = magic.label;
    rememberSnapshot(snapshot);
    saveLoop();
    renderFrames();
    renderCanvas();
    setPlaying(true, renderCanvas, updateFrameSelection);
    const panel = app.querySelector(".motion-panel");
    const trigger = app.querySelector(".motion-trigger");
    if (panel && trigger) {
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
    }
    showToast(`${magic.label} · ${state.frames.length}-frame loop playing`);
  }

  function setColor(color) {
    state.color = color;
    colorInput.value = color;
    colorSwatch.style.background = color;
    app.querySelectorAll(".quick-color").forEach((button) => {
      const selected = button.dataset.color === color;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    setTool("pencil");
  }

  function cellFromPointer(event) {
    const bounds = pixelCanvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(31, Math.floor(((event.clientX - bounds.left) / bounds.width) * GRID_SIZE))),
      y: Math.max(0, Math.min(31, Math.floor(((event.clientY - bounds.top) / bounds.height) * GRID_SIZE))),
    };
  }

  function applyAt(x, y) {
    const frame = state.frames[state.selectedFrame];
    if (state.selectedTool === "fill") {
      state.frames[state.selectedFrame] = floodFill(frame, x, y, state.color);
    } else {
      const color = state.selectedTool === "eraser" ? null : state.color;
      paintSquareInPlace(frame, x, y, state.brushSize, color);
      if (state.mirror) {
        paintSquareInPlace(frame, mirroredBrushCenter(x, state.brushSize), y, state.brushSize, color);
      }
    }
  }

  function applyPointer(event, continuous = false) {
    const cell = cellFromPointer(event);
    if (state.selectedTool === "eyedropper") {
      const sampled = state.frames[state.selectedFrame][indexFor(cell.x, cell.y)];
      if (sampled) setColor(sampled);
      return;
    }

    if (state.selectedTool === "fill") {
      if (!continuous) applyAt(cell.x, cell.y);
    } else {
      const points = continuous && state.lastCell
        ? linePoints(state.lastCell.x, state.lastCell.y, cell.x, cell.y)
        : [cell];
      points.forEach(({ x, y }) => applyAt(x, y));
    }

    state.lastCell = cell;
  }

  pixelCanvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    state.motionName = null;
    if (state.playing) setPlaying(false, renderCanvas, updateFrameSelection);
    pixelCanvas.setPointerCapture(event.pointerId);
    const pointerTool = state.selectedTool;
    state.drawing = true;
    state.lastCell = null;
    if (pointerTool !== "eyedropper") beginHistoryStep();
    applyPointer(event);
    renderCanvas();
    if (pointerTool === "fill" || pointerTool === "eyedropper") {
      state.drawing = false;
      if (pointerTool === "fill" && commitHistoryStep()) {
        saveLoop();
        renderThumbnail(state.selectedFrame);
      }
    }
  });

  pixelCanvas.addEventListener("pointermove", (event) => {
    if (!state.drawing || state.selectedTool === "fill" || state.selectedTool === "eyedropper") return;
    event.preventDefault();
    const coalesced = event.getCoalescedEvents?.();
    const samples = coalesced?.length ? coalesced : [event];
    samples.forEach((sample) => applyPointer(sample, true));
    scheduleCanvasRender();
  });

  function endDrawing(event) {
    if (state.drawing && event.type === "pointerup") applyPointer(event, true);
    if (state.drawing && commitHistoryStep()) {
      saveLoop();
      renderCanvas();
      renderThumbnail(state.selectedFrame);
    }
    state.drawing = false;
    state.lastCell = null;
  }

  pixelCanvas.addEventListener("pointerup", endDrawing);
  pixelCanvas.addEventListener("pointercancel", endDrawing);

  app.querySelectorAll(".tool-button").forEach((button) => {
    button.addEventListener("click", () => setTool(button.dataset.tool));
  });

  app.querySelectorAll(".brush-button").forEach((button) => {
    button.addEventListener("click", () => setBrushSize(Number(button.dataset.size)));
  });

  app.querySelectorAll(".speed-button").forEach((button) => {
    button.addEventListener("click", () => setPlaybackFps(Number(button.dataset.fps)));
  });

  app.querySelectorAll(".magic-button").forEach((button) => {
    button.addEventListener("click", () => makeMagicLoop(button.dataset.effect));
  });

  app.querySelectorAll(".quick-color").forEach((button) => {
    button.addEventListener("click", () => setColor(button.dataset.color));
  });

  colorInput.addEventListener("input", () => {
    setColor(colorInput.value);
  });

  app.querySelector(".duplicate-frame").addEventListener("click", duplicateSelectedFrame);
  app.querySelector(".move-frame-left").addEventListener("click", () => moveSelectedFrame(-1));
  app.querySelector(".move-frame-right").addEventListener("click", () => moveSelectedFrame(1));
  app.querySelector(".delete-frame").addEventListener("click", deleteSelectedFrame);

  app.querySelector(".mirror-button").addEventListener("click", () => setMirror(!state.mirror));
  app.querySelector(".onion-button").addEventListener("click", () => setOnionSkin(!state.onionSkin));
  app.querySelector(".motion-trigger").addEventListener("click", (event) => {
    const panel = app.querySelector(".motion-panel");
    const expanded = event.currentTarget.getAttribute("aria-expanded") === "true";
    event.currentTarget.setAttribute("aria-expanded", String(!expanded));
    event.currentTarget.setAttribute("aria-label", expanded ? "Open motion effects" : "Close motion effects");
    panel.hidden = expanded;
  });

  app.querySelector(".play-button").addEventListener("click", () => {
    setPlaying(!state.playing, renderCanvas, updateFrameSelection);
  });

  app.querySelector(".back-action").addEventListener("click", () => {
    stopPlayback();
    location.hash = "";
  });

  app.querySelector(".share-button").addEventListener("click", shareLoop);
  app.querySelector(".undo-button").addEventListener("click", undo);
  app.querySelector(".redo-button").addEventListener("click", redo);
  if (activeResizeHandler) window.removeEventListener("resize", activeResizeHandler);
  activeResizeHandler = resizeCanvas;
  window.addEventListener("resize", activeResizeHandler, { passive: true });
  if (activeKeydownHandler) window.removeEventListener("keydown", activeKeydownHandler);
  activeKeydownHandler = (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey || event.key.toLowerCase() !== "z") return;
    event.preventDefault();
    if (event.shiftKey) redo();
    else undo();
  };
  window.addEventListener("keydown", activeKeydownHandler);

  resizeCanvas();
  renderCanvas();
  renderFrames();
  updateHistoryControls();
  updateAssistControls();
}

function stopPlayback() {
  clearInterval(state.playTimer);
  state.playTimer = null;
  state.playing = false;
}

function setPlaying(playing, renderCanvas, updateFrameSelection) {
  stopPlayback();
  state.playing = playing;
  const button = app.querySelector(".play-button");
  button?.classList.toggle("is-playing", playing);
  button?.setAttribute("aria-label", playing ? "Pause loop" : "Play loop");
  const word = button?.querySelector(".play-word");
  if (word) word.textContent = playing ? "Pause" : "Play";
  renderCanvas();
  updateFrameSelection();
  if (playing) {
    state.playTimer = setInterval(() => {
      state.selectedFrame = (state.selectedFrame + 1) % state.frames.length;
      renderCanvas();
      updateFrameSelection();
    }, 1000 / state.playbackFps);
  }
}

function loopPng() {
  const canvas = document.createElement("canvas");
  const scale = 16;
  canvas.width = GRID_SIZE * scale;
  canvas.height = GRID_SIZE * scale;
  const context = canvas.getContext("2d", { alpha: true });
  context.imageSmoothingEnabled = false;
  state.frames[state.selectedFrame].forEach((pixel, index) => {
    if (!pixel) return;
    context.fillStyle = pixel;
    context.fillRect((index % GRID_SIZE) * scale, Math.floor(index / GRID_SIZE) * scale, scale, scale);
  });
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

async function shareLoop() {
  const blob = await loopPng();
  if (!blob) return;
  const safeName = (state.name || "piksel").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "piksel";
  const file = new File([blob], `${safeName}.png`, { type: "image/png" });
  const shareData = { files: [file], title: state.name || "Untitled", text: "Made with Piksel." };

  try {
    if (navigator.share && navigator.canShare?.(shareData)) {
      await navigator.share(shareData);
      showToast("Shared");
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = file.name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showToast("Saved as PNG");
  } catch (error) {
    if (error?.name !== "AbortError") showToast("Share didn’t open");
  }
}

function showToast(message) {
  const toast = app.querySelector(".status-toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

async function bitmapFor(file) {
  if ("createImageBitmap" in window) return createImageBitmap(file);
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  await image.decode();
  URL.revokeObjectURL(url);
  return image;
}

async function importPhoto(event) {
  const [file] = event.target.files;
  if (!file) return;
  try {
    const image = await bitmapFor(file);
    const canvas = document.createElement("canvas");
    canvas.width = GRID_SIZE;
    canvas.height = GRID_SIZE;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.imageSmoothingEnabled = false;
    const side = Math.min(image.width, image.height);
    const sourceX = Math.floor((image.width - side) / 2);
    const sourceY = Math.floor((image.height - side) / 2);
    context.drawImage(image, sourceX, sourceY, side, side, 0, 0, GRID_SIZE, GRID_SIZE);
    image.close?.();
    const pixels = context.getImageData(0, 0, GRID_SIZE, GRID_SIZE).data;
    const frame = blankFrame();
    for (let index = 0; index < PIXEL_COUNT; index += 1) {
      const offset = index * 4;
      if (pixels[offset + 3] < 48) continue;
      const channel = (value) => Math.min(255, Math.round(value / 32) * 32);
      const color = [pixels[offset], pixels[offset + 1], pixels[offset + 2]]
        .map(channel)
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      frame[index] = `#${color}`;
    }
    const name = file.name.replace(/\.[^.]+$/, "").slice(0, 48) || "Photo loop";
    useLoop({ name, frames: [frame] });
  } catch {
    showToast("Couldn’t read that photo");
  } finally {
    event.target.value = "";
  }
}

function renderApp() {
  if (location.hash === "#/editor") renderEditor();
  else renderHome();
}

window.addEventListener("hashchange", renderApp);
renderApp();

if ("serviceWorker" in navigator && !["localhost", "127.0.0.1"].includes(location.hostname)) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}
