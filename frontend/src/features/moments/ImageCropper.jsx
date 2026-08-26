import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";

// Fixed 9:16 story canvas — matches Instagram/most story surfaces, so there's
// one predictable output shape instead of a menu of sizes to pick from.
export const OUTPUT_WIDTH = 1080;
export const OUTPUT_HEIGHT = 1920;
const STAGE_MAX_HEIGHT = 440;
const STAGE_WIDTH = (STAGE_MAX_HEIGHT * OUTPUT_WIDTH) / OUTPUT_HEIGHT;
const MIN_MAX_ZOOM = 3;
// Export blur radius scales with the ratio between the preview stage and the
// full-resolution canvas, so the backdrop reads the same softness either way.
const BACKDROP_BLUR_PREVIEW_PX = 24;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function ImageCropper({ file, onCancel, onApply }) {
  const imgRef = useRef(null);
  const dragRef = useRef(null);

  const [imageUrl, setImageUrl] = useState("");
  const [naturalSize, setNaturalSize] = useState(null);
  const [zoom, setZoom] = useState(1);
  // `focus` is the fraction (0–1) of the image that sits at the frame's
  // center. Deriving pan from it — rather than storing pan in pixels — means
  // zooming naturally keeps whatever you were looking at centered, instead
  // of jumping when the old pixel offset gets reclamped to new bounds.
  const [focus, setFocus] = useState({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const url = URL.createObjectURL(file);

    const applyUrl = () => setImageUrl(url);
    applyUrl();

    return () => URL.revokeObjectURL(url);
  }, [file]);

  // The image is shown at "contain" scale by default — the whole photo is
  // visible, letterboxed by the blurred backdrop where it doesn't reach the
  // frame's edges. Zooming past 1x lets the user crop in tighter, Instagram
  // style, at which point panning matters again.
  const baseScale = naturalSize
    ? Math.min(
        STAGE_WIDTH / naturalSize.width,
        STAGE_MAX_HEIGHT / naturalSize.height,
      )
    : 1;
  // The zoom needed to go from "contain" to fully covering the frame varies
  // a lot with the photo's aspect ratio — a near-square photo in this tall
  // frame needs much more zoom than a photo that's already close to 9:16.
  // Scale the slider's range to that, with headroom to crop in further, so
  // "fill the frame" is never stuck right at the end of the track.
  const coverScale = naturalSize
    ? Math.max(
        STAGE_WIDTH / naturalSize.width,
        STAGE_MAX_HEIGHT / naturalSize.height,
      )
    : 1;
  const maxZoom = naturalSize
    ? Math.max(MIN_MAX_ZOOM, (coverScale / baseScale) * 1.4)
    : MIN_MAX_ZOOM;
  const actualScale = baseScale * zoom;
  const displayedWidth = naturalSize ? naturalSize.width * actualScale : 0;
  const displayedHeight = naturalSize ? naturalSize.height * actualScale : 0;
  // The <img> itself is always rendered at its base (zoom=1, "contain")
  // size — zoom is applied purely as a GPU-composited CSS transform on top
  // of that, instead of resizing the element's actual box on every slider
  // tick. Changing width/height forces a layout + re-rasterize each frame,
  // which reads as janky/warped; transform: scale() is the standard way to
  // get a smooth, flat 2D zoom.
  const baseWidth = naturalSize ? naturalSize.width * baseScale : 0;
  const baseHeight = naturalSize ? naturalSize.height * baseScale : 0;

  const boundsX = [
    Math.min(0, STAGE_WIDTH - displayedWidth),
    Math.max(0, STAGE_WIDTH - displayedWidth),
  ];
  const boundsY = [
    Math.min(0, STAGE_MAX_HEIGHT - displayedHeight),
    Math.max(0, STAGE_MAX_HEIGHT - displayedHeight),
  ];

  const panFromFocus = (fx, fy) => ({
    x: clamp(STAGE_WIDTH / 2 - fx * displayedWidth, boundsX[0], boundsX[1]),
    y: clamp(
      STAGE_MAX_HEIGHT / 2 - fy * displayedHeight,
      boundsY[0],
      boundsY[1],
    ),
  });

  const pan = panFromFocus(focus.x, focus.y);

  const handleImageLoad = (event) => {
    const { naturalWidth, naturalHeight } = event.target;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });
    setZoom(1);
    setFocus({ x: 0.5, y: 0.5 });
  };

  const handlePointerDown = (event) => {
    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      focusX: focus.x,
      focusY: focus.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current || !displayedWidth || !displayedHeight) return;

    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;

    // Re-derive the effective focus from the clamped pan, so it never
    // drifts out of range while the image is pinned against an edge.
    const rawFocusX = dragRef.current.focusX - deltaX / displayedWidth;
    const rawFocusY = dragRef.current.focusY - deltaY / displayedHeight;
    const clampedPan = panFromFocus(rawFocusX, rawFocusY);

    setFocus({
      x: (STAGE_WIDTH / 2 - clampedPan.x) / displayedWidth,
      y: (STAGE_MAX_HEIGHT / 2 - clampedPan.y) / displayedHeight,
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleApply = () => {
    if (!imgRef.current || !naturalSize) return;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const context = canvas.getContext("2d");
    const outputScale = OUTPUT_WIDTH / STAGE_WIDTH;

    // Backdrop: the same image, scaled to fully cover the canvas and
    // blurred, so any letterboxed gap reads as an intentional soft
    // background instead of a hard black bar.
    const coverScale = Math.max(
      OUTPUT_WIDTH / naturalSize.width,
      OUTPUT_HEIGHT / naturalSize.height,
    );
    const coverWidth = naturalSize.width * coverScale;
    const coverHeight = naturalSize.height * coverScale;

    context.save();
    context.filter = `blur(${BACKDROP_BLUR_PREVIEW_PX * outputScale}px)`;
    context.drawImage(
      imgRef.current,
      (OUTPUT_WIDTH - coverWidth) / 2,
      (OUTPUT_HEIGHT - coverHeight) / 2,
      coverWidth,
      coverHeight,
    );
    context.restore();
    context.fillStyle = "rgba(0,0,0,0.18)";
    context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

    // Foreground: the image at the user's chosen pan/zoom, matching the
    // preview exactly.
    context.drawImage(
      imgRef.current,
      pan.x * outputScale,
      pan.y * outputScale,
      displayedWidth * outputScale,
      displayedHeight * outputScale,
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onApply(new File([blob], "story.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9,
    );
  };

  return (
    <div>
      <div
        className="relative mx-auto overflow-hidden rounded-xl bg-slate-900 select-none touch-none"
        style={{ width: STAGE_WIDTH, height: STAGE_MAX_HEIGHT }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {imageUrl && (
          <>
            {/* blurred backdrop, fills any letterboxed gap */}
            <img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: `blur(${BACKDROP_BLUR_PREVIEW_PX}px)` }}
            />
            <div className="absolute inset-0 bg-black/20" />

            <img
              ref={imgRef}
              src={imageUrl}
              alt=""
              onLoad={handleImageLoad}
              draggable={false}
              onPointerDown={handlePointerDown}
              className="absolute top-0 left-0 select-none cursor-grab active:cursor-grabbing"
              style={{
                width: baseWidth || undefined,
                height: baseHeight || undefined,
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "0 0",
              }}
            />
          </>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-slate-500">Zoom</span>
        <input
          type="range"
          min={1}
          max={maxZoom}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="flex-1"
        />
      </div>

      <p className="mt-2 text-center text-xs text-slate-400">
        Drag to reposition, use the slider to zoom in.
      </p>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-medium bg-slate-100 text-slate-600"
        >
          <X size={16} /> Cancel
        </button>
        <button
          type="button"
          onClick={handleApply}
          disabled={!naturalSize}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold bg-rose-600 text-white disabled:opacity-60"
        >
          <Check size={16} /> Use photo
        </button>
      </div>
    </div>
  );
}
