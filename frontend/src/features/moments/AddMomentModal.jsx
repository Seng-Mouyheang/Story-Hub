import { useRef, useState } from "react";
import { X, Image as ImageIcon, Type, Crop } from "lucide-react";
import { uploadMomentImage } from "./momentUpload";
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

// Bakes every draggable text overlay directly into the exported image, at
// the same resolution ImageCropper exports at, so the story is a single flat
// image like the rest of the pipeline expects.
const bakeTextOverlays = async (file, overlays) => {
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

  const fontSize = 64;
  const lineHeight = fontSize * 1.25;
  context.font = `700 ${fontSize}px system-ui, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.lineWidth = fontSize * 0.12;
  context.strokeStyle = "rgba(0,0,0,0.65)";
  context.fillStyle = "#ffffff";

  // The preview box wraps text with CSS at up to 85% of the frame's width
  // (see the `max-w-[85%]` on the overlay wrapper) — replicate that here by
  // wrapping at word boundaries to the same proportion, instead of only
  // splitting on the newlines the user typed explicitly. Without this, a
  // caption that visually wrapped across several lines in the composer gets
  // baked as one long line that overflows past the image's edge.
  const maxLineWidth = OUTPUT_WIDTH * 0.85;
  const wrapParagraph = (paragraph) => {
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

  for (const overlay of withText) {
    const lines = overlay.text.split("\n").flatMap(wrapParagraph);
    const x = overlay.xPct * OUTPUT_WIDTH;
    const startY =
      overlay.yPct * OUTPUT_HEIGHT - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, index) => {
      const y = startY + index * lineHeight;
      context.strokeText(line, x, y);
      context.fillText(line, x, y);
    });
  }

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(new File([blob], "story.jpg", { type: "image/jpeg" })),
      "image/jpeg",
      0.9,
    );
  });
};

// Values must match the whitelist in
// backend/server/src/validators/momentValidator.js
const BACKGROUND_PRESETS = [
  "linear-gradient(135deg, #f97316 0%, #db2777 50%, #7c3aed 100%)",
  "linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #4338ca 100%)",
  "linear-gradient(135deg, #ec4899 0%, #a855f7 50%, #6366f1 100%)",
  "linear-gradient(135deg, #22c55e 0%, #14b8a6 50%, #0891b2 100%)",
  "linear-gradient(135deg, #fbbf24 0%, #f97316 50%, #dc2626 100%)",
  "linear-gradient(135deg, #1e293b 0%, #0f172a 60%, #020617 100%)",
];
const BACKGROUND_PRESET_NAMES = [
  "Sunset",
  "Ocean",
  "Berry",
  "Forest",
  "Fire",
  "Midnight",
];

export default function AddMomentModal({ isOpen, onClose, onCreated }) {
  const [mode, setMode] = useState("image");
  const [text, setText] = useState("");
  const [backgroundColor, setBackgroundColor] = useState(BACKGROUND_PRESETS[0]);
  const [rawImageFile, setRawImageFile] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [textOverlays, setTextOverlays] = useState([]);
  const [editingOverlayId, setEditingOverlayId] = useState(null);
  const previewRef = useRef(null);
  const overlayDragRef = useRef(null);

  // Grows the caption box to fit its content instead of clipping/scrolling
  // it inside a fixed single-row height.
  const resizeOverlayTextarea = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  if (!isOpen) {
    return null;
  }

  const resetState = () => {
    setMode("image");
    setText("");
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
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setRawImageFile(file);
    setIsCropping(true);
    setError("");
    setTextOverlays([]);
    setEditingOverlayId(null);
    event.target.value = "";
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

  // Drops any overlay that's still mid-edit and empty (e.g. the user tapped
  // "Add text" twice without typing anything into the first one).
  const discardEmptyEditingOverlay = () => {
    setTextOverlays((prev) =>
      prev.filter((o) => !(o.id === editingOverlayId && !o.text.trim())),
    );
  };

  const handleAddText = () => {
    discardEmptyEditingOverlay();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setTextOverlays((prev) => [
      ...prev,
      { id, text: "", xPct: 0.5, yPct: 0.5 },
    ]);
    setEditingOverlayId(id);
  };

  const handleOverlayTextChange = (id, value) => {
    setTextOverlays((prev) =>
      prev.map((o) => (o.id === id ? { ...o, text: value.slice(0, 120) } : o)),
    );
  };

  const handleOverlayBlur = (id) => {
    setTextOverlays((prev) =>
      prev.filter((o) => !(o.id === id && !o.text.trim())),
    );
    setEditingOverlayId(null);
  };

  // Dragging is only available once editing is done (the outlined box,
  // Instagram-style) — while typing, taps/drags on the text should place the
  // cursor or select text, not move the box. A tap (no real movement) on the
  // box re-opens it for editing; a drag repositions it instead.
  const handleOverlayPointerDown = (id, event) => {
    const overlay = textOverlays.find((o) => o.id === id);
    if (!overlay || editingOverlayId === id) return;

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
    if (drag && !drag.moved) {
      setEditingOverlayId(drag.id);
    }
  };

  const handleOverlayRemove = (id, event) => {
    event.stopPropagation();
    setTextOverlays((prev) => prev.filter((o) => o.id !== id));
    setEditingOverlayId((current) => (current === id ? null : current));
  };

  const handleSubmit = async () => {
    setError("");

    if (mode === "text" && !text.trim()) {
      setError("Write something before posting.");
      return;
    }

    if (mode === "image" && !imageFile) {
      setError("Choose an image first.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload =
        mode === "image"
          ? {
              type: "image",
              imageUrl: await uploadMomentImage(
                await bakeTextOverlays(imageFile, textOverlays),
              ),
            }
          : { type: "text", text: text.trim(), backgroundColor };

      await createMoment(payload);
      onCreated?.();
      handleClose();
    } catch (submitError) {
      setError(submitError.message || "Failed to post story.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900">
            Add to your story
          </h3>
          <button
            type="button"
            onClick={handleClose}
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
                onClick={() => setMode("image")}
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
                onClick={() => setMode("text")}
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
                  <div
                    ref={previewRef}
                    className="relative mx-auto h-140 aspect-9/16 rounded-xl overflow-hidden bg-slate-900 touch-none"
                    onPointerMove={handleOverlayPointerMove}
                    onPointerUp={handleOverlayPointerUp}
                    onPointerLeave={handleOverlayPointerUp}
                  >
                    <img
                      src={imagePreviewUrl}
                      alt="Preview"
                      draggable={false}
                      onDragStart={(event) => event.preventDefault()}
                      className="w-full h-full object-cover select-none"
                    />

                    {textOverlays.map((overlay) => (
                      <div
                        key={overlay.id}
                        // `w-max` gives the box a definite width (its content's
                        // natural size, capped by max-width) instead of the
                        // default shrink-to-fit sizing that absolutely
                        // positioned auto-width elements get — shrink-to-fit
                        // caps width at "available space to the container's
                        // edge" based on the `left` offset alone, so near the
                        // right edge it would force the text to rewrap much
                        // narrower even though translate(-50%) recenters it.
                        className="absolute w-max max-w-[85%] -translate-x-1/2 -translate-y-1/2 select-none"
                        style={{
                          left: `${overlay.xPct * 100}%`,
                          top: `${overlay.yPct * 100}%`,
                        }}
                        onDragStart={(event) => event.preventDefault()}
                      >
                        {editingOverlayId === overlay.id ? (
                          <textarea
                            autoFocus
                            ref={resizeOverlayTextarea}
                            value={overlay.text}
                            onChange={(event) => {
                              handleOverlayTextChange(
                                overlay.id,
                                event.target.value,
                              );
                              resizeOverlayTextarea(event.target);
                            }}
                            onBlur={() => handleOverlayBlur(overlay.id)}
                            rows={1}
                            placeholder="Add text"
                            className="min-w-24 max-w-full resize-none overflow-hidden bg-transparent text-center text-xl font-bold text-white placeholder-white/70 [text-shadow:0_1px_4px_rgba(0,0,0,0.65)] focus:outline-none"
                          />
                        ) : (
                          // Once editing is done, the box shows an Instagram-
                          // style dashed outline: drag anywhere inside it to
                          // reposition (a tap with no movement re-opens
                          // editing instead), or tap the × to remove it.
                          <div className="relative">
                            <div
                              onPointerDown={(event) =>
                                handleOverlayPointerDown(overlay.id, event)
                              }
                              className="cursor-grab touch-none rounded-md border-2 border-dashed border-white/80 px-3 py-2 active:cursor-grabbing"
                            >
                              <p className="whitespace-pre-wrap wrap-break-word text-center text-xl font-bold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.65)]">
                                {overlay.text}
                              </p>
                            </div>
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
                          </div>
                        )}
                      </div>
                    ))}

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={handleAddText}
                        className="flex items-center gap-1.5 rounded-full bg-black/60 text-white px-3 py-1.5 text-xs font-medium backdrop-blur"
                      >
                        <Type size={14} /> Add text
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCropping(true)}
                        className="flex items-center gap-1.5 rounded-full bg-black/60 text-white px-3 py-1.5 text-xs font-medium backdrop-blur"
                      >
                        <Crop size={14} /> Edit crop
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 h-64 rounded-xl border-2 border-dashed border-slate-300 cursor-pointer overflow-hidden bg-slate-50">
                    <ImageIcon size={28} className="text-slate-400" />
                    <span className="text-sm text-slate-500">
                      Tap to choose an image
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )
              ) : (
                <div
                  className="mx-auto flex h-125 aspect-9/16 items-center justify-center rounded-xl p-6"
                  style={{ background: backgroundColor }}
                >
                  <textarea
                    value={text}
                    onChange={(event) =>
                      setText(event.target.value.slice(0, 500))
                    }
                    placeholder="Write your story..."
                    className="w-full h-full bg-transparent resize-none text-center text-xl font-semibold text-white placeholder-white/70 focus:outline-none"
                  />
                </div>
              )}

              {mode === "text" && (
                <div className="flex gap-2 mt-3">
                  {BACKGROUND_PRESETS.map((color, index) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setBackgroundColor(color)}
                      className={`w-7 h-7 rounded-full border-2 ${
                        backgroundColor === color
                          ? "border-rose-600"
                          : "border-white"
                      } shadow`}
                      style={{ background: color }}
                      aria-label={`Choose ${BACKGROUND_PRESET_NAMES[index]} background`}
                    />
                  ))}
                </div>
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
    </div>
  );
}
