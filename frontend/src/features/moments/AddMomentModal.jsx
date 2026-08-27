import { useCallback, useEffect, useRef, useState } from "react";
import {
  X,
  Image as ImageIcon,
  Type,
  Crop,
  Pipette,
  RotateCw,
  MoveHorizontal,
  Palette,
  Camera,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { uploadMomentImage } from "./momentUpload";
import DeleteConfirmModal from "../stories/DeleteConfirmModal";
import { createMoment } from "../../api/moment/momentApi";
import ImageCropper, { OUTPUT_WIDTH, OUTPUT_HEIGHT } from "./ImageCropper";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

// Draws every draggable text overlay onto an already-prepared canvas
// (either a photo or a gradient fill) at OUTPUT_WIDTH x OUTPUT_HEIGHT —
// shared by both bake functions below so a photo story and a gradient
// story end up with pixel-identical text rendering.
const drawTextOverlays = (context, overlays, stageHeightPx) => {
  const withText = (overlays ?? []).filter((overlay) => overlay.text.trim());
  if (withText.length === 0) return;

  // textAlign is set per-line below instead (see drawLine) since it now
  // varies with each overlay's own alignment choice.
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.strokeStyle = "rgba(0,0,0,0.65)";

  // The preview box wraps text with CSS at the overlay's own widthPct (see
  // the inline `width` on the overlay wrapper) — replicate that here by
  // wrapping at word boundaries to the same proportion, instead of only
  // splitting on the newlines the user typed explicitly. Without this, a
  // caption that visually wrapped across several lines in the composer gets
  // baked as one long line that overflows past the image's edge.
  const wrapParagraph = (paragraph, maxLineWidth) => {
    const words = paragraph.split(" ");
    const wrapped = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (current && context.measureText(candidate).width > maxLineWidth) {
        wrapped.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    wrapped.push(current);
    return wrapped;
  };

  // Preview font sizes are defined at the composer's preview scale — blow
  // them up by the same factor the canvas export uses everywhere else, so
  // the baked text matches what was shown while editing. The stage's
  // rendered height is passed in (rather than assumed) since it now
  // varies with the viewport (see PREVIEW_STAGE_CSS_HEIGHT).
  const previewToCanvasScale =
    OUTPUT_HEIGHT / (stageHeightPx || PREVIEW_STAGE_HEIGHT);

  for (const overlay of withText) {
    const previewPx = overlay.fontSize ?? DEFAULT_TEXT_SIZE_PX;
    const fontSize = previewPx * previewToCanvasScale;
    const lineHeight = fontSize * 1.25;
    context.font = `700 ${fontSize}px system-ui, sans-serif`;
    context.lineWidth = fontSize * 0.12;

    const align = overlay.align || "center";
    const maxLineWidth =
      OUTPUT_WIDTH * (overlay.widthPct ?? DEFAULT_TEXT_WIDTH_PCT);
    const lines = overlay.text
      .split("\n")
      .flatMap((paragraph) => wrapParagraph(paragraph, maxLineWidth));
    const centerX = overlay.xPct * OUTPUT_WIDTH;
    const centerY = overlay.yPct * OUTPUT_HEIGHT;
    const rotationRad = ((overlay.rotationDeg || 0) * Math.PI) / 180;

    // Rotate around the overlay's own center — translating there first
    // means every line can then be drawn at a simple vertical offset from
    // the origin, matching how the box rotates around its own middle in
    // the CSS preview.
    context.save();
    context.translate(centerX, centerY);
    context.rotate(rotationRad);

    const hasSolidBg = Boolean(overlay.bgStyle);
    // Justified lines (all but conventionally the last) are stretched with
    // extra word-spacing to exactly fill maxLineWidth — measureText can't
    // see that stretch, so the highlight/hug box below has to assume the
    // full box width for justify instead of measuring rendered lines.
    const naturalLineWidth = (line) => context.measureText(line).width;
    // A single line is never actually stretched (see the last-line
    // fallback below, which every line hits when it's also the only one),
    // so only multi-line justify needs the full-width assumption.
    const blockContentWidth =
      align === "justify" && lines.length > 1
        ? maxLineWidth
        : Math.max(...lines.map(naturalLineWidth));

    if (hasSolidBg) {
      // Matches the preview's px-3/py-2/rounded-md padding on the text
      // box, scaled from preview px to canvas px the same way font sizes
      // are — so the solid block behind the text lines up exactly with
      // what was shown while editing.
      const paddingX = TEXT_BG_PADDING_X_PREVIEW_PX * previewToCanvasScale;
      const paddingY = TEXT_BG_PADDING_Y_PREVIEW_PX * previewToCanvasScale;
      const radius = TEXT_BG_RADIUS_PREVIEW_PX * previewToCanvasScale;
      const blockWidth = blockContentWidth + paddingX * 2;
      const blockHeight = lines.length * lineHeight + paddingY * 2;
      // The block hugs the text tightly regardless of alignment, so for
      // left/right it has to sit flush against that edge of the maxLineWidth
      // box instead of staying centered on the overlay's own anchor point.
      const blockOffsetX =
        align === "left"
          ? -maxLineWidth / 2 + blockContentWidth / 2
          : align === "right"
            ? maxLineWidth / 2 - blockContentWidth / 2
            : 0;

      context.fillStyle = overlay.bgStyle === "black" ? "#000000" : "#ffffff";
      context.beginPath();
      context.roundRect(
        blockOffsetX - blockWidth / 2,
        -blockHeight / 2,
        blockWidth,
        blockHeight,
        radius,
      );
      context.fill();
    }

    // The dark outline exists to keep text legible over an unpredictable
    // photo/gradient — redundant (and muddies the edges) once it's sitting
    // on a flat, deliberately-chosen background instead.
    context.fillStyle = overlay.color || DEFAULT_TEXT_COLOR;

    // `lineAlign` is the effective alignment for this one line — normally
    // just `align`, except a justified line falls back to "left" instead
    // of being stretched, either because it's the conventionally-unstretched
    // last line, or because it's a single word with no gaps to spread
    // extra space across.
    const drawLine = (line, y, lineAlign) => {
      if (lineAlign === "left" || lineAlign === "right") {
        context.textAlign = lineAlign;
        const x = lineAlign === "left" ? -maxLineWidth / 2 : maxLineWidth / 2;
        if (!hasSolidBg) context.strokeText(line, x, y);
        context.fillText(line, x, y);
        return;
      }

      if (lineAlign === "justify") {
        // Canvas has no native text-align: justify — spread the extra
        // space evenly across each word gap so the line's rendered width
        // matches maxLineWidth exactly, same as the CSS preview does.
        const words = line.split(" ");
        const widths = words.map(naturalLineWidth);
        const wordsWidth = widths.reduce((sum, width) => sum + width, 0);
        const gapCount = words.length - 1;
        const gapWidth =
          (maxLineWidth - wordsWidth) / gapCount || naturalLineWidth(" ");

        context.textAlign = "left";
        let x = -maxLineWidth / 2;
        words.forEach((word, index) => {
          if (!hasSolidBg) context.strokeText(word, x, y);
          context.fillText(word, x, y);
          x += widths[index] + (index < gapCount ? gapWidth : 0);
        });
        return;
      }

      // center (default).
      context.textAlign = "center";
      if (!hasSolidBg) context.strokeText(line, 0, y);
      context.fillText(line, 0, y);
    };

    lines.forEach((line, index) => {
      const y = (index - (lines.length - 1) / 2) * lineHeight;
      const isLastLine = index === lines.length - 1;
      const words = line.split(" ");
      // Conventionally the last line of justified text isn't stretched —
      // it reads as left-aligned instead, matching the CSS preview. A
      // single word has no gaps to spread extra space across either.
      const lineAlign =
        align === "justify" && (isLastLine || words.length === 1)
          ? "left"
          : align;
      drawLine(line, y, lineAlign);
    });
    context.restore();
  }
};

const canvasToJpegFile = (canvas) =>
  new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(new File([blob], "story.jpg", { type: "image/jpeg" })),
      "image/jpeg",
      0.9,
    );
  });

// Bakes every draggable text overlay directly into the exported image, at
// the same resolution ImageCropper exports at, so the story is a single flat
// image like the rest of the pipeline expects.
const bakeTextOverlays = async (file, overlays, stageHeightPx) => {
  const withText = (overlays ?? []).filter((overlay) => overlay.text.trim());
  if (withText.length === 0) {
    return file;
  }

  const url = URL.createObjectURL(file);
  let img;
  try {
    img = await loadImage(url);
  } finally {
    URL.revokeObjectURL(url);
  }

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const context = canvas.getContext("2d");
  context.drawImage(img, 0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  drawTextOverlays(context, overlays, stageHeightPx);

  return canvasToJpegFile(canvas);
};

// Replicates a CSS `linear-gradient(angleDeg, ...)` on a canvas rectangle —
// canvas gradients are defined by two points rather than an angle, so the
// gradient line has to be derived to run the same direction and span the
// same corners the CSS version would.
const fillCanvasWithLinearGradient = (context, width, height, preset) => {
  const rad = (preset.angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const length = Math.abs(width * dx) + Math.abs(height * dy);
  const halfLength = length / 2;
  const cx = width / 2;
  const cy = height / 2;

  const gradient = context.createLinearGradient(
    cx - dx * halfLength,
    cy - dy * halfLength,
    cx + dx * halfLength,
    cy + dy * halfLength,
  );
  preset.stops.forEach(({ offset, color }) =>
    gradient.addColorStop(offset, color),
  );
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
};

// Bakes the chosen gradient background plus every text overlay into a
// single flat image, the same way a photo story does — so a "text mode"
// story reuses the exact same editor (drag/resize/rotate/color/size,
// multiple boxes) and export pipeline as a photo one, instead of being a
// separate, more limited composer.
const bakeGradientStory = async (preset, overlays, stageHeightPx) => {
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const context = canvas.getContext("2d");
  fillCanvasWithLinearGradient(context, OUTPUT_WIDTH, OUTPUT_HEIGHT, preset);
  drawTextOverlays(context, overlays, stageHeightPx);

  return canvasToJpegFile(canvas);
};

const BACKGROUND_PRESETS = [
  {
    name: "Sunset",
    angle: 135,
    stops: [
      { offset: 0, color: "#f97316" },
      { offset: 0.5, color: "#db2777" },
      { offset: 1, color: "#7c3aed" },
    ],
  },
  {
    name: "Ocean",
    angle: 135,
    stops: [
      { offset: 0, color: "#0ea5e9" },
      { offset: 0.5, color: "#2563eb" },
      { offset: 1, color: "#4338ca" },
    ],
  },
  {
    name: "Berry",
    angle: 135,
    stops: [
      { offset: 0, color: "#ec4899" },
      { offset: 0.5, color: "#a855f7" },
      { offset: 1, color: "#6366f1" },
    ],
  },
  {
    name: "Forest",
    angle: 135,
    stops: [
      { offset: 0, color: "#22c55e" },
      { offset: 0.5, color: "#14b8a6" },
      { offset: 1, color: "#0891b2" },
    ],
  },
  {
    name: "Fire",
    angle: 135,
    stops: [
      { offset: 0, color: "#fbbf24" },
      { offset: 0.5, color: "#f97316" },
      { offset: 1, color: "#dc2626" },
    ],
  },
  {
    name: "Midnight",
    angle: 135,
    stops: [
      { offset: 0, color: "#1e293b" },
      { offset: 0.6, color: "#0f172a" },
      { offset: 1, color: "#020617" },
    ],
  },
  {
    name: "Lavender",
    angle: 135,
    stops: [
      { offset: 0, color: "#c4b5fd" },
      { offset: 0.5, color: "#818cf8" },
      { offset: 1, color: "#4f46e5" },
    ],
  },
  {
    name: "Rose",
    angle: 135,
    stops: [
      { offset: 0, color: "#fda4af" },
      { offset: 0.5, color: "#fb7185" },
      { offset: 1, color: "#be123c" },
    ],
  },
  {
    name: "Mint",
    angle: 135,
    stops: [
      { offset: 0, color: "#a7f3d0" },
      { offset: 0.5, color: "#34d399" },
      { offset: 1, color: "#047857" },
    ],
  },
  {
    name: "Peach",
    angle: 135,
    stops: [
      { offset: 0, color: "#fde68a" },
      { offset: 0.5, color: "#fb923c" },
      { offset: 1, color: "#ea580c" },
    ],
  },
  {
    name: "Steel",
    angle: 135,
    stops: [
      { offset: 0, color: "#94a3b8" },
      { offset: 0.5, color: "#475569" },
      { offset: 1, color: "#1e293b" },
    ],
  },
  {
    name: "Candy",
    angle: 135,
    stops: [
      { offset: 0, color: "#67e8f9" },
      { offset: 0.5, color: "#e879f9" },
      { offset: 1, color: "#f472b6" },
    ],
  },
  {
    name: "Gold",
    angle: 135,
    stops: [
      { offset: 0, color: "#fef08a" },
      { offset: 0.5, color: "#facc15" },
      { offset: 1, color: "#a16207" },
    ],
  },
  {
    name: "Coal",
    angle: 135,
    stops: [
      { offset: 0, color: "#44403c" },
      { offset: 0.6, color: "#1c1917" },
      { offset: 1, color: "#000000" },
    ],
  },
];

const cssLinearGradient = (preset) =>
  `linear-gradient(${preset.angle}deg, ${preset.stops
    .map((stop) => `${stop.color} ${stop.offset * 100}%`)
    .join(", ")})`;

const TEXT_COLORS = [
  "#ffffff",
  "#e2e8f0",
  "#94a3b8",
  "#0f172a",
  "#ef4444",
  "#f43f5e",
  "#ec4899",
  "#a855f7",
  "#6366f1",
  "#38bdf8",
  "#14b8a6",
  "#22c55e",
  "#facc15",
  "#f97316",
];

// Font size is stored as the px shown in the composer preview (which renders
// the story at PREVIEW_STAGE_HEIGHT tall); bakeTextOverlays scales it up by
// the same factor as the exported canvas so the baked text matches what was
// previewed.
const MIN_TEXT_SIZE_PX = 14;
const MAX_TEXT_SIZE_PX = 56;
const DEFAULT_TEXT_SIZE_PX = 26;
const DEFAULT_TEXT_COLOR = TEXT_COLORS[0];
// The preview stage grows up to its old full size (35rem) but yields to the
// viewport once that would push the modal card past its own max-height —
// `210px` is the rest of the card's chrome (header, mode tabs, submit
// button) measured against the modal's `max-h-[90vh]`. Both modes share
// this now that the background-swatch picker lives inside the stage
// (behind the "Background" toggle button) instead of a row below it.
const PREVIEW_STAGE_CSS_HEIGHT = "min(35rem, calc(90vh - 210px))";
// Fallback (px) for the export font-size scale below, for the rare case
// the stage's actual rendered height can't be measured at submit time —
// see handleSubmit, which normally passes the real value instead.
const PREVIEW_STAGE_HEIGHT = 440;

// Overlay width is stored as a fraction of the preview stage's width; the
// box is always centered on its xPct/yPct point, so widening it just grows
// both edges out from that center rather than needing an anchor corner.
const MIN_TEXT_WIDTH_PCT = 0.3;
const MAX_TEXT_WIDTH_PCT = 0.95;
const DEFAULT_TEXT_WIDTH_PCT = 0.85;

// A solid black/white block behind the text — for when the photo or
// gradient underneath makes any text color hard to read regardless of
// contrast. Matches Tailwind's px-3/py-2/rounded-md (used on the box in
// both the editing and non-editing preview states) so the export lines up
// with what was shown on screen.
const TEXT_BG_PADDING_X_PREVIEW_PX = 12;
const TEXT_BG_PADDING_Y_PREVIEW_PX = 8;
const TEXT_BG_RADIUS_PREVIEW_PX = 6;
const TEXT_BG_CSS_COLOR = { black: "#000000", white: "#ffffff" };

const TEXT_ALIGN_OPTIONS = ["left", "center", "right", "justify"];
const TEXT_ALIGN_ICONS = {
  left: AlignLeft,
  center: AlignCenter,
  right: AlignRight,
  justify: AlignJustify,
};

// Rotation snaps to these increments whenever the dragged angle lands close
// to one, so hitting exactly 90/180/270 etc. doesn't require pixel-perfect
// dragging — the same "magnetic" feel as most design tools' rotate handles.
const ROTATE_SNAP_DEGREES = 15;
const ROTATE_SNAP_THRESHOLD_DEGREES = 4;

// Downscaled canvas used to sample the background's brightness under a text
// box, so the caret can switch to white or black for contrast — small
// enough to be cheap, and the browser's own downscaling effectively
// pre-blurs it, so a tiny sample from it already reflects a local average
// rather than one lucky/unlucky pixel.
const CARET_SAMPLE_WIDTH = 60;
const CARET_SAMPLE_HEIGHT = Math.round(
  (CARET_SAMPLE_WIDTH * OUTPUT_HEIGHT) / OUTPUT_WIDTH,
);
const CARET_SAMPLE_BOX_PX = 8;
// Perceptual (not simple-average) luminance, 0–255 — matches how bright a
// color actually reads to the eye, so e.g. pure blue doesn't get treated as
// "bright" just because its numeric channel values are high.
const relativeLuminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
const CARET_LUMINANCE_THRESHOLD = 150;

// Rotation is stored unnormalized (it can go well past +/-180 across a long
// drag, so direction stays continuous instead of flipping sign at the
// wrap-around) — normalize only for what's shown to the user.
const normalizeRotationDeg = (deg) => ((deg % 360) + 360) % 360;

// A genuine top-level component (not one nested inside AddMomentModal's
// render) so React treats its identity as stable across re-renders —
// a function redefined every render, even one just returning JSX, would
// get torn down and rebuilt on every parent re-render, which would drop
// focus mid-typing and abort in-progress drags. Everything it needs from
// AddMomentModal's state comes in as props instead of via closure.
function OverlayStage({
  backgroundNode,
  extraBottomActions,
  extraOverlayNode,
  stageCssHeight,
  previewRef,
  colorInputRef,
  sizeTrackRef,
  textOverlays,
  editingOverlayId,
  selectedOverlayId,
  rotatingOverlayId,
  handlePreviewBackgroundPointerDown,
  handleOverlayPointerMove,
  handleOverlayPointerUp,
  handleOverlayColorChange,
  handleOverlayBgStyleCycle,
  handleOverlayAlignCycle,
  handleEyedropper,
  handleSizePointerDown,
  handleSizePointerMove,
  handleSizePointerUp,
  handleOverlayTextChange,
  resizeOverlayTextarea,
  handleOverlayBlur,
  handleOverlayPointerDown,
  handleOverlayResizePointerDown,
  handleOverlayResizePointerMove,
  handleOverlayResizePointerUp,
  handleOverlayRotatePointerDown,
  handleOverlayRotatePointerMove,
  handleOverlayRotatePointerUp,
  handleOverlayRemove,
  handleAddTextButtonClick,
}) {
  return (
    <div
      ref={previewRef}
      className="relative mx-auto aspect-9/16 rounded-xl overflow-hidden bg-slate-900 touch-none"
      style={{ height: stageCssHeight }}
      onPointerDown={handlePreviewBackgroundPointerDown}
      onPointerMove={handleOverlayPointerMove}
      onPointerUp={handleOverlayPointerUp}
      onPointerLeave={handleOverlayPointerUp}
    >
      {backgroundNode}

      {editingOverlayId &&
        (() => {
          const editingOverlay = textOverlays.find(
            (o) => o.id === editingOverlayId,
          );
          const activeColor = editingOverlay?.color || DEFAULT_TEXT_COLOR;
          return (
            // Spans the full width of the preview — the size
            // slider lives separately, pinned to the preview's
            // right edge, so this bar doesn't need to share
            // room with it.
            <div
              className="absolute top-3 left-3 right-3 z-20 flex items-center gap-1.5 rounded-full bg-black/60 pl-2 pr-1.5 py-1.5 backdrop-blur"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {/* Shows the overlay's current color at a glance —
                            including custom/dropper picks that aren't
                            one of the presets below, so it's never
                            ambiguous which color is active. */}
              <span
                className="h-5 w-5 shrink-0 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
                style={{ background: activeColor }}
                aria-label={`Current text color ${activeColor}`}
                title={`Current color: ${activeColor}`}
              />
              <span className="h-4 w-px shrink-0 bg-white/30" />
              {/* Solid block behind the text — cycles
                            none/black/white with one tap, for when the
                            photo or gradient underneath makes the text
                            hard to read regardless of its own color. */}
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleOverlayBgStyleCycle(editingOverlayId)}
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[9px] font-bold ${
                  editingOverlay?.bgStyle === "black"
                    ? "border-white/80 bg-black text-white"
                    : editingOverlay?.bgStyle === "white"
                      ? "border-white/80 bg-white text-black"
                      : "border-dashed border-white/60 bg-transparent text-white"
                }`}
                aria-label={`Text background: ${
                  editingOverlay?.bgStyle ?? "none"
                } — tap to change`}
                title="Solid background behind the text"
              >
                A
              </button>
              <span className="h-4 w-px shrink-0 bg-white/30" />
              {/* Text alignment — cycles left/center/right/
                            justify with one tap, same pattern as the
                            background toggle above. */}
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleOverlayAlignCycle(editingOverlayId)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 border-white/60 text-white"
                aria-label={`Text alignment: ${
                  editingOverlay?.align || "center"
                } — tap to change`}
                title="Text alignment"
              >
                {(() => {
                  const AlignIcon =
                    TEXT_ALIGN_ICONS[editingOverlay?.align || "center"];
                  return <AlignIcon size={12} />;
                })()}
              </button>
              <span className="h-4 w-px shrink-0 bg-white/30" />
              {/* Scrolls to reach every preset without a
                            visible scrollbar cluttering this floating
                            toolbar — drag/swipe/wheel still work, the
                            track and thumb are just hidden. Grows to
                            fill the bar's now-spare width first, only
                            falling back to scrolling if it still
                            doesn't fit. */}
              <div className="no-scrollbar flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() =>
                      handleOverlayColorChange(editingOverlayId, color)
                    }
                    className={`h-5 w-5 shrink-0 rounded-full border-2 ${
                      activeColor === color
                        ? "border-rose-500"
                        : "border-white/50"
                    }`}
                    style={{ background: color }}
                    aria-label={`Text color ${color}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={handleEyedropper}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-white/60 text-white"
                aria-label="Pick a custom color"
                title="Pick a custom color"
              >
                <Pipette size={11} />
              </button>
              <input
                ref={colorInputRef}
                type="color"
                value={activeColor}
                onChange={(event) =>
                  handleOverlayColorChange(editingOverlayId, event.target.value)
                }
                className="absolute h-0 w-0 opacity-0"
                tabIndex={-1}
                aria-hidden="true"
              />
            </div>
          );
        })()}

      {/* Instagram-style vertical drag slider for text size,
                    anchored to the overlay itself (not the top toolbar)
                    so it stays next to whichever text box is active. */}
      {editingOverlayId &&
        (() => {
          const editingOverlay = textOverlays.find(
            (o) => o.id === editingOverlayId,
          );
          const fontSize = editingOverlay?.fontSize ?? DEFAULT_TEXT_SIZE_PX;
          const progress =
            ((fontSize - MIN_TEXT_SIZE_PX) /
              (MAX_TEXT_SIZE_PX - MIN_TEXT_SIZE_PX)) *
            100;
          return (
            <div
              className="absolute top-1/2 right-2 z-20 flex -translate-y-1/2 flex-col items-center gap-1.5 rounded-full bg-black/60 px-1.5 py-2.5 backdrop-blur"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <span className="text-sm font-bold leading-none text-white">
                A
              </span>
              <div
                ref={sizeTrackRef}
                role="slider"
                aria-label="Text size"
                aria-valuemin={MIN_TEXT_SIZE_PX}
                aria-valuemax={MAX_TEXT_SIZE_PX}
                aria-valuenow={fontSize}
                className="relative h-26 w-1.5 touch-none rounded-full bg-white/25"
                onMouseDown={(event) => event.preventDefault()}
                onPointerDown={handleSizePointerDown}
                onPointerMove={handleSizePointerMove}
                onPointerUp={handleSizePointerUp}
                onPointerLeave={handleSizePointerUp}
                onPointerCancel={handleSizePointerUp}
              >
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-full bg-rose-500"
                  style={{ height: `${progress}%` }}
                />
                <div
                  className="absolute left-1/2 h-4 w-4 -translate-x-1/2 translate-y-1/2 rounded-full border-2 border-white bg-rose-500 shadow"
                  style={{ bottom: `${progress}%` }}
                />
              </div>
              <span className="text-[10px] font-bold leading-none text-white">
                A
              </span>
            </div>
          );
        })()}

      {textOverlays.map((overlay) => {
        // Left unset (rather than defaulting immediately) for a
        // brand-new, still-empty overlay — see handleOverlayTextChange,
        // which commits it to DEFAULT_TEXT_WIDTH_PCT the moment real
        // text is typed. Until then the box shrink-wraps to the
        // placeholder instead of claiming its full eventual width,
        // so the caret isn't left sitting in a lot of empty space
        // far from the (much narrower) "Add text" placeholder.
        const hasCommittedWidth = overlay.widthPct != null;
        const widthPct = overlay.widthPct ?? DEFAULT_TEXT_WIDTH_PCT;
        const rotationDeg = overlay.rotationDeg || 0;
        const isSelected = selectedOverlayId === overlay.id;
        const bgColor = TEXT_BG_CSS_COLOR[overlay.bgStyle] || "transparent";
        const hasSolidBg = Boolean(overlay.bgStyle);
        return (
          <div
            key={overlay.id}
            // An explicit width (rather than shrink-to-fit)
            // is what makes the box visibly resizable — text
            // wraps to fill it and centers within it, instead
            // of the box always hugging its content.
            className="absolute select-none"
            style={{
              left: `${overlay.xPct * 100}%`,
              top: `${overlay.yPct * 100}%`,
              width: hasCommittedWidth ? `${widthPct * 100}%` : undefined,
              maxWidth: hasCommittedWidth ? undefined : "90%",
              // Before a real width is committed, the textarea
              // inside sizes itself off its `cols` attribute,
              // which — since intrinsic size scales with
              // font-size — can grow past this wrapper's own
              // `maxWidth` at large sizes. Without centering
              // here too, that overflow spills off to one side
              // (inline content defaults to start-aligned)
              // instead of growing evenly from the middle, which
              // reads as the text getting shoved sideways as it
              // gets bigger.
              textAlign: "center",
              transform: `translate(-50%, -50%) rotate(${rotationDeg}deg)`,
            }}
            onDragStart={(event) => event.preventDefault()}
          >
            {editingOverlayId === overlay.id ? (
              <textarea
                autoFocus
                ref={resizeOverlayTextarea}
                value={overlay.text}
                onChange={(event) => {
                  handleOverlayTextChange(overlay.id, event.target.value);
                  resizeOverlayTextarea(event.target);
                }}
                onBlur={() => handleOverlayBlur(overlay.id)}
                rows={1}
                cols={10}
                placeholder="Add text"
                style={{
                  color: overlay.color || DEFAULT_TEXT_COLOR,
                  // No separate caret-color: the caret always
                  // renders in `currentColor` by default, so
                  // matching `color` here is automatic — there's
                  // no separately-computed value that could ever
                  // visibly mismatch the text itself.
                  fontSize: `${overlay.fontSize ?? DEFAULT_TEXT_SIZE_PX}px`,
                  // Before a real width is committed, this has no
                  // `w-full` and instead falls back to its `cols`
                  // attribute for width — which scales with
                  // font-size, so without a hard cap it can grow
                  // past the wrapper's own maxWidth at large
                  // sizes (see the wrapper's own style above).
                  maxWidth: "100%",
                  backgroundColor: bgColor,
                  textAlign: overlay.align || "center",
                  "--placeholder-color": overlay.color || DEFAULT_TEXT_COLOR,
                }}
                className={`overlay-text-input resize-none overflow-hidden font-bold focus:outline-none ${
                  hasSolidBg
                    ? "rounded-md px-3 py-2"
                    : "[text-shadow:0_1px_4px_rgba(0,0,0,0.65)]"
                } ${hasCommittedWidth ? "w-full" : ""}`}
              />
            ) : (
              // Once editing is done, the box shows an
              // Instagram-style dashed outline with drag/
              // resize/rotate/remove handles — but only while
              // it's selected. Tapping the photo elsewhere
              // deselects it (see handlePreviewBackgroundPointerDown),
              // dropping the border and handles so what's left
              // is a plain preview of how the text will
              // actually look once posted. The box itself (and
              // its padding) stays in the DOM either way, just
              // with a transparent border, so nothing shifts
              // position when the chrome toggles off.
              <div className="relative">
                <div
                  onPointerDown={(event) =>
                    handleOverlayPointerDown(overlay.id, event)
                  }
                  style={{ backgroundColor: bgColor }}
                  className={`w-full cursor-grab touch-none rounded-md border-2 px-3 py-2 active:cursor-grabbing ${
                    isSelected
                      ? "border-dashed border-white/80"
                      : "border-transparent"
                  }`}
                >
                  <p
                    style={{
                      color: overlay.color || DEFAULT_TEXT_COLOR,
                      fontSize: `${overlay.fontSize ?? DEFAULT_TEXT_SIZE_PX}px`,
                      textAlign: overlay.align || "center",
                    }}
                    className={`whitespace-pre-wrap wrap-break-word font-bold ${
                      hasSolidBg
                        ? ""
                        : "[text-shadow:0_1px_4px_rgba(0,0,0,0.65)]"
                    }`}
                  >
                    {overlay.text}
                  </p>
                </div>
                {isSelected && (
                  <>
                    <button
                      type="button"
                      onClick={(event) =>
                        handleOverlayRemove(overlay.id, event)
                      }
                      onPointerDown={(event) => event.stopPropagation()}
                      className="absolute -top-2.5 -right-2.5 flex items-center justify-center rounded-full bg-white/30 p-1 text-white"
                      aria-label="Remove text"
                    >
                      <X
                        size={12}
                        className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                      />
                    </button>
                    <button
                      type="button"
                      onPointerDown={(event) =>
                        handleOverlayResizePointerDown(overlay.id, event)
                      }
                      onPointerMove={handleOverlayResizePointerMove}
                      onPointerUp={handleOverlayResizePointerUp}
                      onPointerLeave={handleOverlayResizePointerUp}
                      onPointerCancel={handleOverlayResizePointerUp}
                      className="absolute -bottom-2.5 -right-2.5 flex h-5 w-5 touch-none items-center justify-center rounded-full bg-white/30 text-white cursor-ew-resize"
                      aria-label="Resize text width"
                      title="Drag to resize width"
                    >
                      <MoveHorizontal size={12} />
                    </button>
                    <button
                      type="button"
                      onPointerDown={(event) =>
                        handleOverlayRotatePointerDown(overlay.id, event)
                      }
                      onPointerMove={handleOverlayRotatePointerMove}
                      onPointerUp={handleOverlayRotatePointerUp}
                      onPointerLeave={handleOverlayRotatePointerUp}
                      onPointerCancel={handleOverlayRotatePointerUp}
                      className="absolute -top-7 left-1/2 flex h-5 w-5 -translate-x-1/2 touch-none items-center justify-center rounded-full bg-white/30 text-white cursor-grab active:cursor-grabbing"
                      aria-label="Rotate text"
                      title="Drag to rotate"
                    >
                      <RotateCw size={12} />
                    </button>
                    {rotatingOverlayId === overlay.id && (
                      // Counter-rotated so the number itself always
                      // reads upright, regardless of how far the
                      // box has been turned.
                      <div
                        className="pointer-events-none absolute -top-16 left-1/2 rounded-full bg-black/70 px-2 py-1 text-xs font-semibold text-white"
                        style={{
                          transform: `translateX(-50%) rotate(${-rotationDeg}deg)`,
                        }}
                      >
                        {Math.round(normalizeRotationDeg(rotationDeg))}°
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}

      {extraOverlayNode}

      <div
        className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleAddTextButtonClick}
          className="flex items-center gap-1.5 rounded-full bg-black/60 text-white px-3 py-1.5 text-xs font-medium backdrop-blur"
        >
          <Type size={14} /> Add text
        </button>
        {extraBottomActions}
      </div>
    </div>
  );
}

export default function AddMomentModal({ isOpen, onClose, onCreated }) {
  const [mode, setMode] = useState("image");
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_PRESETS[0]);
  const [rawImageFile, setRawImageFile] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [textOverlays, setTextOverlays] = useState([]);
  const [editingOverlayId, setEditingOverlayId] = useState(null);
  // Separate from `editingOverlayId` — this is which overlay is showing its
  // dashed outline and drag/resize/rotate/remove handles. It stays selected
  // after you finish typing (so you can still adjust it), and only clears
  // when you tap the photo itself, so tapping away previews the flattened
  // result the same way the exported story will actually look.
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  // Which overlay is mid-rotation-drag, purely to show the live angle badge
  // — separate from rotateDragRef (which drives the actual math) since a
  // ref change alone wouldn't trigger the re-render needed to show/hide it.
  const [rotatingOverlayId, setRotatingOverlayId] = useState(null);
  // Only for the dashed drop-zone's hover styling while a file is dragged
  // over it — has no effect on whether the drop itself is accepted.
  const [isDraggingFileOver, setIsDraggingFileOver] = useState(false);
  // Background swatches live inside the stage now, behind a toggle button
  // (like "Add text"/"Edit crop"), instead of a row permanently taking up
  // space below it.
  const [isBackgroundPickerOpen, setIsBackgroundPickerOpen] = useState(false);
  // Any action that would discard real content (switching Photo/Text mode
  // away from one with something in it, or closing the composer outright)
  // is gated behind a confirmation — this holds the pending action itself,
  // as a zero-arg thunk to run on confirm, or null when nothing's pending.
  const [pendingDiscardAction, setPendingDiscardAction] = useState(null);
  const previewRef = useRef(null);
  const overlayDragRef = useRef(null);
  const colorInputRef = useRef(null);
  const sizeTrackRef = useRef(null);
  const sizeDragRef = useRef(false);
  const resizeDragRef = useRef(null);
  const rotateDragRef = useRef(null);
  const backgroundImgRef = useRef(null);
  const caretSampleCanvasRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Grows the caption box to fit its content instead of clipping/scrolling
  // it inside a fixed single-row height. Memoized since it's also used as
  // the textarea's ref callback — a fresh function identity on every
  // keystroke's re-render would otherwise make React detach and reattach
  // the ref each time instead of keeping it stable across the mount.
  const resizeOverlayTextarea = useCallback((el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Samples the current background (the photo, or the gradient preset) at a
  // given point and returns whichever of white/black reads clearly against
  // it — used to pick a new text box's starting color, so text and its
  // caret are always the exact same color (never a separately-computed one
  // that could visibly mismatch the color the user picked) while still
  // starting out legible against whatever's behind it.
  const computeContrastColor = useCallback(
    (xPct, yPct, modeOverride = mode) => {
      if (!caretSampleCanvasRef.current) {
        caretSampleCanvasRef.current = document.createElement("canvas");
      }
      const canvas = caretSampleCanvasRef.current;
      canvas.width = CARET_SAMPLE_WIDTH;
      canvas.height = CARET_SAMPLE_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) return null;

      if (modeOverride === "image") {
        const img = backgroundImgRef.current;
        if (!img || !img.naturalWidth) return null;
        context.drawImage(img, 0, 0, CARET_SAMPLE_WIDTH, CARET_SAMPLE_HEIGHT);
      } else {
        fillCanvasWithLinearGradient(
          context,
          CARET_SAMPLE_WIDTH,
          CARET_SAMPLE_HEIGHT,
          backgroundColor,
        );
      }

      const centerX = Math.round(xPct * CARET_SAMPLE_WIDTH);
      const centerY = Math.round(yPct * CARET_SAMPLE_HEIGHT);
      const sampleX = clamp(
        centerX - CARET_SAMPLE_BOX_PX / 2,
        0,
        CARET_SAMPLE_WIDTH - CARET_SAMPLE_BOX_PX,
      );
      const sampleY = clamp(
        centerY - CARET_SAMPLE_BOX_PX / 2,
        0,
        CARET_SAMPLE_HEIGHT - CARET_SAMPLE_BOX_PX,
      );

      let imageData;
      try {
        imageData = context.getImageData(
          sampleX,
          sampleY,
          CARET_SAMPLE_BOX_PX,
          CARET_SAMPLE_BOX_PX,
        );
      } catch {
        // A tainted canvas (shouldn't happen for a local blob: URL, but
        // fail safe) just falls back to the default text color.
        return null;
      }

      const { data } = imageData;
      let total = 0;
      const pixelCount = data.length / 4;
      for (let i = 0; i < data.length; i += 4) {
        total += relativeLuminance(data[i], data[i + 1], data[i + 2]);
      }
      const brightness = total / pixelCount;
      return brightness > CARET_LUMINANCE_THRESHOLD ? "#000000" : "#ffffff";
    },
    [mode, backgroundColor],
  );

  // Shared entry point for every way a photo can get into the composer —
  // the file picker, a drag-and-drop, or a clipboard paste all land here
  // and go straight to the crop step, same as before.
  const handleImageFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;

    setRawImageFile(file);
    setIsCropping(true);
    setError("");
    setTextOverlays([]);
    setEditingOverlayId(null);
    setSelectedOverlayId(null);
  }, []);

  // Pasting an image (e.g. a screenshot) anywhere while the empty photo
  // picker is showing jumps straight to the crop step, same as choosing a
  // file. Scoped to only that moment — once cropping or a caption textarea
  // is on screen, a paste there should behave normally instead of being
  // hijacked into replacing/adding a photo.
  useEffect(() => {
    if (!isOpen || mode !== "image" || isCropping || imagePreviewUrl) {
      return undefined;
    }

    const handlePaste = (event) => {
      const items = event.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            event.preventDefault();
            handleImageFile(file);
          }
          break;
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen, mode, isCropping, imagePreviewUrl, handleImageFile]);

  const removeOverlay = useCallback((id) => {
    setTextOverlays((prev) => prev.filter((o) => o.id !== id));
    setEditingOverlayId((current) => (current === id ? null : current));
    setSelectedOverlayId((current) => (current === id ? null : current));
  }, []);

  // Delete/Backspace removes the selected overlay outright — but only while
  // it's selected-not-editing (the dashed-outline state), so the same keys
  // still work as ordinary text editing once the caption textarea is open.
  useEffect(() => {
    if (!isOpen || !selectedOverlayId || editingOverlayId) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;

      // Only when focus isn't actually in some other editable field —
      // this listener is on `window`, so without this it would hijack
      // Backspace/Delete typed anywhere else on the page (e.g. an input
      // reached via Tab) any time an overlay happens to be selected.
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isEditableTarget) return;

      event.preventDefault();
      removeOverlay(selectedOverlayId);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedOverlayId, editingOverlayId, removeOverlay]);

  // Drops any overlay that's still mid-edit and empty (e.g. the user tapped
  // "Add text" twice without typing anything into the first one).
  const discardEmptyEditingOverlay = useCallback(() => {
    setTextOverlays((prev) =>
      prev.filter((o) => !(o.id === editingOverlayId && !o.text.trim())),
    );
  }, [editingOverlayId]);

  // modeOverride lets the auto-added first text box (added the moment you
  // switch to the Text tab, before `mode` state has actually re-rendered
  // yet) sample against the gradient it's about to show rather than
  // whatever the previous tab's background was.
  const handleAddText = useCallback(
    (modeOverride) => {
      discardEmptyEditingOverlay();
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      // Starts in whichever of white/black contrasts with what's currently
      // behind the default center position, rather than always defaulting
      // to white — since the caret always renders in this same color (see
      // the textarea below), starting legible means the caret is too.
      const color =
        computeContrastColor(0.5, 0.5, modeOverride) ?? DEFAULT_TEXT_COLOR;
      const overlay = {
        id,
        text: "",
        xPct: 0.5,
        yPct: 0.5,
        color,
        fontSize: DEFAULT_TEXT_SIZE_PX,
        // Left unset until real text is typed — see the shrink-wrap
        // comment in the overlay render below.
        widthPct: null,
        rotationDeg: 0,
        // null | "black" | "white" — no solid block behind the text by
        // default.
        bgStyle: null,
        // "left" | "center" | "right" | "justify".
        align: "center",
      };
      setTextOverlays((prev) => [...prev, overlay]);
      setEditingOverlayId(id);
      setSelectedOverlayId(id);
    },
    [discardEmptyEditingOverlay, computeContrastColor],
  );

  // Whenever the composer actually lands on Text mode with nothing real
  // typed yet, make sure there's a box ready to type into — driven by
  // `mode` itself (rather than threaded through every individual call site
  // that can flip it to "text": the tab button, discarding a photo, etc.)
  // so it can't be missed no matter which of those paths got here. Only
  // depends on [isOpen, mode] on purpose — it should run once per actual
  // transition into Text mode, not re-run just because textOverlays
  // changes as a result (e.g. once the user starts typing).
  useEffect(() => {
    if (!isOpen || mode !== "text") return;
    if (textOverlays.some((overlay) => overlay.text.trim())) return;
    if (textOverlays.length > 0) return;
    // Deliberately a genuine "on this transition, run a one-time setup
    // action" effect rather than derived state — the lint rule's usual
    // concern (a value that could just be computed during render instead)
    // doesn't apply here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleAddText("text");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode]);

  if (!isOpen) {
    return null;
  }

  const resetState = () => {
    setMode("image");
    setBackgroundColor(BACKGROUND_PRESETS[0]);
    setRawImageFile(null);
    setIsCropping(false);
    setImageFile(null);
    setImagePreviewUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return "";
    });
    setError("");
    setTextOverlays([]);
    setEditingOverlayId(null);
    setSelectedOverlayId(null);
    setIsBackgroundPickerOpen(false);
    setPendingDiscardAction(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    handleImageFile(file);
    event.target.value = "";
  };

  const handleImageDragOver = (event) => {
    event.preventDefault();
    setIsDraggingFileOver(true);
  };

  const handleImageDragLeave = () => {
    setIsDraggingFileOver(false);
  };

  const handleImageDrop = (event) => {
    event.preventDefault();
    setIsDraggingFileOver(false);
    handleImageFile(event.dataTransfer.files?.[0]);
  };

  const handleCropApplied = (croppedFile) => {
    setImageFile(croppedFile);
    setImagePreviewUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return URL.createObjectURL(croppedFile);
    });
    setIsCropping(false);
  };

  const handleCropCancelled = () => {
    setIsCropping(false);
    if (!imageFile) {
      setRawImageFile(null);
    }
  };

  // Actually switches modes — no discarding here, just the mechanics.
  // Called either directly (nothing to lose) or after the discard
  // confirmation below.
  const applyModeSwitch = (targetMode) => {
    setMode(targetMode);
  };

  // Photo and Text are separate composers: switching to Text abandons any
  // photo you'd chosen (Text mode never uses it), and switching to Photo
  // abandons any text you'd typed (identical mechanism, opposite content).
  // Gate the switch behind a confirmation whenever there's actually
  // something on the losing side to lose. The pending action is stored as
  // a thunk (wrapped in an extra arrow so the state setter doesn't mistake
  // it for a functional updater) rather than a `{ type }` tag, so adding a
  // new discardable action later is just another `setPendingDiscardAction`
  // call — confirmPendingDiscard itself never needs another branch.
  const requestModeSwitch = (targetMode) => {
    if (targetMode === mode) return;

    if (targetMode === "text" && imageFile) {
      setPendingDiscardAction(() => () => {
        setRawImageFile(null);
        setIsCropping(false);
        setImageFile(null);
        setImagePreviewUrl((previousUrl) => {
          if (previousUrl) URL.revokeObjectURL(previousUrl);
          return "";
        });
        applyModeSwitch(targetMode);
      });
      return;
    }

    if (
      targetMode === "image" &&
      textOverlays.some((overlay) => overlay.text.trim())
    ) {
      setPendingDiscardAction(() => () => {
        setTextOverlays([]);
        setEditingOverlayId(null);
        setSelectedOverlayId(null);
        setIsBackgroundPickerOpen(false);
        applyModeSwitch(targetMode);
      });
      return;
    }

    applyModeSwitch(targetMode);
  };

  const cancelPendingDiscard = () => setPendingDiscardAction(null);

  const confirmPendingDiscard = () => {
    pendingDiscardAction?.();
    setPendingDiscardAction(null);
  };

  // The X button. Closing outright would silently throw away a chosen
  // photo or typed text the same way switching modes would, so it goes
  // through the same confirmation whenever there's actually something to
  // lose (a photo picked, still mid-crop, or any non-empty text box).
  const requestClose = () => {
    const hasUnsavedChanges =
      Boolean(imageFile || rawImageFile) ||
      textOverlays.some((overlay) => overlay.text.trim());

    if (hasUnsavedChanges) {
      setPendingDiscardAction(() => handleClose);
      return;
    }

    handleClose();
  };

  // The bottom-bar "Add text" button. If there's already a fresh, empty box
  // open (i.e. the user tapped it and hasn't typed anything yet), tapping
  // it again would otherwise just discard that box and create an
  // identical-looking empty replacement — which reads as the button doing
  // nothing. Close it instead in that case; only create a new one when
  // there isn't already an empty one to close.
  const handleAddTextButtonClick = () => {
    const editingOverlay = textOverlays.find((o) => o.id === editingOverlayId);
    if (editingOverlay && !editingOverlay.text.trim()) {
      removeOverlay(editingOverlay.id);
      return;
    }
    handleAddText();
  };

  const handleOverlayTextChange = (id, value) => {
    setTextOverlays((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const text = value.slice(0, 120);
        return {
          ...o,
          text,
          widthPct: o.widthPct ?? (text.trim() ? DEFAULT_TEXT_WIDTH_PCT : null),
        };
      }),
    );
  };

  const handleOverlayColorChange = (id, color) => {
    setTextOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, color } : o)),
    );
  };

  // Cycles null -> "black" -> "white" -> null so one button can reach
  // every option, rather than needing three separate always-visible ones.
  const handleOverlayBgStyleCycle = (id) => {
    setTextOverlays((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const next =
          o.bgStyle === null ? "black" : o.bgStyle === "black" ? "white" : null;
        return { ...o, bgStyle: next };
      }),
    );
  };

  // Cycles left -> center -> right -> justify -> left, same one-button
  // pattern as the background toggle above, to reach all four options
  // without the toolbar needing four separate always-visible buttons.
  const handleOverlayAlignCycle = (id) => {
    setTextOverlays((prev) =>
      prev.map((o) => {
        if (o.id !== id) return o;
        const currentIndex = TEXT_ALIGN_OPTIONS.indexOf(o.align || "center");
        const next =
          TEXT_ALIGN_OPTIONS[(currentIndex + 1) % TEXT_ALIGN_OPTIONS.length];
        return { ...o, align: next };
      }),
    );
  };

  const handleOverlayFontSizeChange = (id, fontSize) => {
    setTextOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, fontSize } : o)),
    );
  };

  // A native <input type="range"> rotated with `writing-mode` renders
  // inconsistently across browsers (Safari and older Chromium ignore it, so
  // the control is stuck horizontal and effectively undraggable). Tracking
  // the pointer directly against the track's own bounding box, the same way
  // `handleOverlayPointerMove` already does for repositioning text, works
  // everywhere pointer events do.
  const fontSizeFromPointerY = (clientY) => {
    const rect = sizeTrackRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const ratio = clamp((rect.bottom - clientY) / rect.height, 0, 1);
    return Math.round(
      MIN_TEXT_SIZE_PX + ratio * (MAX_TEXT_SIZE_PX - MIN_TEXT_SIZE_PX),
    );
  };

  const handleSizePointerDown = (event) => {
    if (!editingOverlayId) return;
    sizeDragRef.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    const fontSize = fontSizeFromPointerY(event.clientY);
    if (fontSize != null) {
      handleOverlayFontSizeChange(editingOverlayId, fontSize);
    }
  };

  const handleSizePointerMove = (event) => {
    // `event.buttons` is a live read of which buttons/contacts are actually
    // down right now — checked in addition to the ref so a stale "still
    // dragging" ref (e.g. left over from a drag that got interrupted by the
    // slider unmounting) can't make the value follow a bare hover.
    if (!sizeDragRef.current || !editingOverlayId || event.buttons !== 1) {
      sizeDragRef.current = false;
      return;
    }
    const fontSize = fontSizeFromPointerY(event.clientY);
    if (fontSize != null) {
      handleOverlayFontSizeChange(editingOverlayId, fontSize);
    }
  };

  const handleSizePointerUp = () => {
    sizeDragRef.current = false;
  };

  // Resizing drags a handle on the box's own bottom-right corner, so once
  // the box is rotated that corner no longer moves purely left/right in
  // screen space — the drag delta is rotated back into the box's own local
  // axes first, so "drag along the box's edge" still reads as a width
  // change no matter which way it's currently facing.
  const handleOverlayResizePointerDown = (id, event) => {
    event.stopPropagation();
    const overlay = textOverlays.find((o) => o.id === id);
    if (!overlay) return;

    resizeDragRef.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      startWidthPct: overlay.widthPct ?? DEFAULT_TEXT_WIDTH_PCT,
      rotationRad: ((overlay.rotationDeg || 0) * Math.PI) / 180,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleOverlayResizePointerMove = (event) => {
    const drag = resizeDragRef.current;
    if (!drag || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    const localDeltaX =
      deltaX * Math.cos(drag.rotationRad) + deltaY * Math.sin(drag.rotationRad);

    // The handle sits at the right edge, half the box's width from center,
    // so moving it by `d` grows that half by `d` — the full width grows by
    // 2x that, since the box stays centered on its xPct/yPct point.
    const widthPct = clamp(
      drag.startWidthPct + (2 * localDeltaX) / rect.width,
      MIN_TEXT_WIDTH_PCT,
      MAX_TEXT_WIDTH_PCT,
    );

    setTextOverlays((prev) =>
      prev.map((o) => (o.id === drag.id ? { ...o, widthPct } : o)),
    );
  };

  const handleOverlayResizePointerUp = () => {
    resizeDragRef.current = null;
  };

  // Rotation reads the pointer's absolute angle around the box's center
  // each move (rather than accumulating a delta), which is what makes a
  // rotate handle feel direct — the handle stays under the cursor instead
  // of drifting.
  const updateOverlayRotation = (id, clientX, clientY) => {
    const overlay = textOverlays.find((o) => o.id === id);
    const rect = previewRef.current?.getBoundingClientRect();
    if (!overlay || !rect) return;

    const centerX = rect.left + overlay.xPct * rect.width;
    const centerY = rect.top + overlay.yPct * rect.height;
    // +90 because the handle's rest position is directly above center
    // (atan2 of "straight up" is -90°), so that position should read as 0°.
    const rawRotationDeg =
      (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI + 90;

    const nearestSnap =
      Math.round(rawRotationDeg / ROTATE_SNAP_DEGREES) * ROTATE_SNAP_DEGREES;
    const rotationDeg =
      Math.abs(rawRotationDeg - nearestSnap) <= ROTATE_SNAP_THRESHOLD_DEGREES
        ? nearestSnap
        : rawRotationDeg;

    setTextOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, rotationDeg } : o)),
    );
  };

  const handleOverlayRotatePointerDown = (id, event) => {
    event.stopPropagation();
    rotateDragRef.current = id;
    setRotatingOverlayId(id);
    event.currentTarget.setPointerCapture(event.pointerId);
    updateOverlayRotation(id, event.clientX, event.clientY);
  };

  const handleOverlayRotatePointerMove = (event) => {
    if (!rotateDragRef.current) return;
    updateOverlayRotation(rotateDragRef.current, event.clientX, event.clientY);
  };

  const handleOverlayRotatePointerUp = () => {
    rotateDragRef.current = null;
    setRotatingOverlayId(null);
  };

  // Prefers the browser's native eyedropper (Chrome/Edge) so the user can
  // sample a color from anywhere on screen — including straight off the
  // photo — instead of only picking from the preset swatches. Firefox and
  // Safari don't implement it yet, so those fall back to a plain color
  // input, which still lets the user choose any color even without sampling.
  const handleEyedropper = async () => {
    if (!editingOverlayId) return;

    if (typeof window !== "undefined" && window.EyeDropper) {
      try {
        const result = await new window.EyeDropper().open();
        handleOverlayColorChange(editingOverlayId, result.sRGBHex);
      } catch {
        // User backed out of the eyedropper (e.g. pressed Escape) — leave
        // the current color as-is.
      }
      return;
    }

    colorInputRef.current?.click();
  };

  const handleOverlayBlur = (id) => {
    setTextOverlays((prev) =>
      prev.filter((o) => !(o.id === id && !o.text.trim())),
    );
    setEditingOverlayId(null);
    // The size slider unmounts as soon as editing closes, so if this blur
    // interrupted an in-progress drag on it, the drag never got a pointerup
    // to clear its ref. Clear it here too so a future hover over a
    // newly-mounted slider can't be mistaken for that stale drag.
    sizeDragRef.current = false;
  };

  // Dragging is only available once editing is done (the outlined box,
  // Instagram-style) — while typing, taps/drags on the text should place the
  // cursor or select text, not move the box. A drag repositions it. A tap
  // (no real movement) is two-stage: the first tap just selects the overlay
  // (showing its dashed outline and drag/resize/rotate/remove handles)
  // without touching its text; a second tap while it's already selected is
  // what reopens it for editing — so the handles get a chance to show
  // instead of being skipped straight into edit mode on every tap.
  const handleOverlayPointerDown = (id, event) => {
    const overlay = textOverlays.find((o) => o.id === id);
    if (!overlay || editingOverlayId === id) return;

    // Stops this from also reaching the preview's own background handler,
    // which deselects everything on a tap outside any overlay — without
    // this, pressing an overlay would immediately deselect it again.
    event.stopPropagation();

    // Bounds are derived from the box's own current size so it can never be
    // dragged far enough to have its text clipped by the frame's edges —
    // a fixed percentage margin isn't enough since the box's width varies
    // with how much text it holds.
    const containerRect = previewRef.current?.getBoundingClientRect();
    const boxRect = event.currentTarget.getBoundingClientRect();

    overlayDragRef.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      startXPct: overlay.xPct,
      startYPct: overlay.yPct,
      marginX: containerRect
        ? Math.min(0.45, boxRect.width / 2 / containerRect.width + 0.02)
        : 0.08,
      marginY: containerRect
        ? Math.min(0.45, boxRect.height / 2 / containerRect.height + 0.02)
        : 0.06,
      // Captured up front rather than read from state in pointer-up, since
      // selectedOverlayId may itself change (e.g. via this same drag) by
      // the time the gesture ends.
      wasAlreadySelected: selectedOverlayId === id,
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleOverlayPointerMove = (event) => {
    const drag = overlayDragRef.current;
    if (!drag || !previewRef.current) return;

    const rect = previewRef.current.getBoundingClientRect();
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (Math.abs(deltaX) + Math.abs(deltaY) > 4) {
      drag.moved = true;
    }

    setTextOverlays((prev) =>
      prev.map((o) =>
        o.id === drag.id
          ? {
              ...o,
              xPct: clamp(
                drag.startXPct + deltaX / rect.width,
                drag.marginX,
                1 - drag.marginX,
              ),
              yPct: clamp(
                drag.startYPct + deltaY / rect.height,
                drag.marginY,
                1 - drag.marginY,
              ),
            }
          : o,
      ),
    );
  };

  const handleOverlayPointerUp = () => {
    const drag = overlayDragRef.current;
    overlayDragRef.current = null;
    if (!drag) return;

    // A drag (regardless of prior selection) just repositions it and leaves
    // it selected. A tap either selects it (first tap) or reopens editing
    // (second tap, while already selected).
    setSelectedOverlayId(drag.id);
    if (!drag.moved && drag.wasAlreadySelected) {
      setEditingOverlayId(drag.id);
    }
  };

  // Tapping the photo itself, outside every overlay, deselects whichever
  // overlay was showing its outline/handles — the same tap-away-to-preview
  // pattern as tools like Instagram, so the user can see the flattened
  // result without any editing chrome in the way.
  const handlePreviewBackgroundPointerDown = () => {
    discardEmptyEditingOverlay();
    setIsBackgroundPickerOpen(false);

    // Tapping away while actively typing lands on the selected/dashed-
    // outline state (same as finishing a second tap-to-edit normally
    // would) rather than deselecting outright — a second tap on the
    // background from there is what actually clears the selection. This
    // runs on pointerdown, before the textarea's own blur fires, so
    // without this the selection would already be gone by the time blur
    // ran and the dashed outline would never get a chance to show.
    const wasEditing = Boolean(editingOverlayId);
    setEditingOverlayId(null);
    if (wasEditing) return;

    setSelectedOverlayId(null);
  };

  const handleOverlayRemove = (id, event) => {
    event.stopPropagation();
    removeOverlay(id);
  };

  const handleSubmit = async () => {
    setError("");

    // Text mode has no photo underneath it, so it needs at least one text
    // box with real content — an empty gradient isn't a story.
    if (
      mode === "text" &&
      !textOverlays.some((overlay) => overlay.text.trim())
    ) {
      setError("Add some text before posting.");
      return;
    }

    if (mode === "image" && !imageFile) {
      setError("Choose an image first.");
      return;
    }

    setIsSubmitting(true);

    // The stage's rendered height now varies with the viewport (see
    // PREVIEW_STAGE_CSS_HEIGHT), so font sizes — stored in preview px —
    // are scaled against whatever it actually measures right
    // now, not a fixed assumption, to keep the export matching the preview.
    const stageHeightPx = previewRef.current?.getBoundingClientRect().height;

    try {
      const flattenedImage =
        mode === "image"
          ? await bakeTextOverlays(imageFile, textOverlays, stageHeightPx)
          : await bakeGradientStory(
              backgroundColor,
              textOverlays,
              stageHeightPx,
            );
      const payload = {
        type: "image",
        imageUrl: await uploadMomentImage(flattenedImage),
      };

      await createMoment(payload);
      onCreated?.();
      handleClose();
    } catch (submitError) {
      setError(submitError.message || "Failed to post story.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stageProps = {
    stageCssHeight: PREVIEW_STAGE_CSS_HEIGHT,
    previewRef,
    colorInputRef,
    sizeTrackRef,
    textOverlays,
    editingOverlayId,
    selectedOverlayId,
    rotatingOverlayId,
    handlePreviewBackgroundPointerDown,
    handleOverlayPointerMove,
    handleOverlayPointerUp,
    handleOverlayColorChange,
    handleOverlayBgStyleCycle,
    handleOverlayAlignCycle,
    handleEyedropper,
    handleSizePointerDown,
    handleSizePointerMove,
    handleSizePointerUp,
    handleOverlayTextChange,
    resizeOverlayTextarea,
    handleOverlayBlur,
    handleOverlayPointerDown,
    handleOverlayResizePointerDown,
    handleOverlayResizePointerMove,
    handleOverlayResizePointerUp,
    handleOverlayRotatePointerDown,
    handleOverlayRotatePointerMove,
    handleOverlayRotatePointerUp,
    handleOverlayRemove,
    handleAddTextButtonClick,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className={`w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl transition-[filter] ${
          pendingDiscardAction ? "blur-sm brightness-75" : ""
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">
            Add to your story
          </h3>
          <button
            type="button"
            onClick={requestClose}
            className="p-1.5 rounded-full text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {isCropping && rawImageFile ? (
          <div className="px-5 py-4">
            <ImageCropper
              file={rawImageFile}
              onCancel={handleCropCancelled}
              onApply={handleCropApplied}
            />
          </div>
        ) : (
          <>
            <div className="flex gap-2 px-5 pt-4">
              <button
                type="button"
                onClick={() => requestModeSwitch("image")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition ${
                  mode === "image"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <ImageIcon size={16} /> Photo
              </button>
              <button
                type="button"
                onClick={() => requestModeSwitch("text")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 text-sm font-medium transition ${
                  mode === "text"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                <Type size={16} /> Text
              </button>
            </div>

            <div className="px-5 py-4">
              {mode === "image" ? (
                imagePreviewUrl ? (
                  <OverlayStage
                    {...stageProps}
                    backgroundNode={
                      <img
                        ref={backgroundImgRef}
                        src={imagePreviewUrl}
                        alt="Preview"
                        draggable={false}
                        onDragStart={(event) => event.preventDefault()}
                        className="w-full h-full object-cover select-none"
                      />
                    }
                    extraBottomActions={
                      <button
                        type="button"
                        onClick={() => setIsCropping(true)}
                        className="flex items-center gap-1.5 rounded-full bg-black/60 text-white px-3 py-1.5 text-xs font-medium backdrop-blur"
                      >
                        <Crop size={14} /> Edit crop
                      </button>
                    }
                  />
                ) : (
                  <div className="space-y-2">
                    <label
                      onDragOver={handleImageDragOver}
                      onDragLeave={handleImageDragLeave}
                      onDrop={handleImageDrop}
                      className={`flex flex-col items-center justify-center gap-2 h-64 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-colors ${
                        isDraggingFileOver
                          ? "border-rose-400 bg-rose-50"
                          : "border-slate-300 bg-slate-50"
                      }`}
                    >
                      <ImageIcon
                        size={28}
                        className={
                          isDraggingFileOver
                            ? "text-rose-400"
                            : "text-slate-400"
                        }
                      />
                      <span className="text-sm text-slate-500 text-center px-4">
                        {isDraggingFileOver
                          ? "Drop to add"
                          : "Tap to choose, drag & drop, or paste an image"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      <Camera size={16} /> Take a photo
                    </button>
                    {/* `capture` opens the device camera directly on phones
                        instead of the regular gallery/file picker — it's
                        ignored (falls back to a normal file picker) on
                        desktop browsers and devices with no camera, so this
                        stays safe to always show rather than needing to
                        feature-detect first. Kept as its own input (rather
                        than reusing the one above) since the two need
                        different `capture` behavior. */}
                    <input
                      ref={cameraInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                )
              ) : (
                <OverlayStage
                  {...stageProps}
                  backgroundNode={
                    <div
                      className="absolute inset-0"
                      style={{
                        background: cssLinearGradient(backgroundColor),
                      }}
                    />
                  }
                  extraBottomActions={
                    <button
                      type="button"
                      onClick={() => setIsBackgroundPickerOpen((open) => !open)}
                      className="flex items-center gap-1.5 rounded-full bg-black/60 text-white px-3 py-1.5 text-xs font-medium backdrop-blur"
                    >
                      <Palette size={14} /> Background
                    </button>
                  }
                  extraOverlayNode={
                    isBackgroundPickerOpen && (
                      <div
                        className="no-scrollbar absolute bottom-14 left-3 right-3 flex items-center gap-2 overflow-x-auto rounded-full bg-black/60 px-2 py-2 backdrop-blur"
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        {BACKGROUND_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => setBackgroundColor(preset)}
                            className={`h-7 w-7 shrink-0 rounded-full border-2 ${
                              backgroundColor === preset
                                ? "border-rose-500"
                                : "border-white/60"
                            }`}
                            style={{ background: cssLinearGradient(preset) }}
                            aria-label={`Choose ${preset.name} background`}
                          />
                        ))}
                      </div>
                    )
                  }
                />
              )}

              {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
            </div>

            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full rounded-full bg-rose-600 text-white font-semibold py-2.5 disabled:opacity-60"
              >
                {isSubmitting ? "Posting..." : "Post to story"}
              </button>
            </div>
          </>
        )}
      </div>

      <DeleteConfirmModal
        isOpen={pendingDiscardAction != null}
        title="Discard unsaved changes?"
        titleId="discard-unsaved-changes-dialog-title"
        message="What you've added here hasn't been posted yet — continuing will discard it."
        confirmLabel="Discard"
        onCancel={cancelPendingDiscard}
        onConfirm={confirmPendingDiscard}
        // No separate dimming/blur layer here — the composer card itself
        // blurs and dims behind this dialog instead (see the
        // pendingDiscardAction check on the card above), so there's one
        // consistent effect instead of two translucent layers stacking.
        backdropClassName="bg-transparent"
      />
    </div>
  );
}
