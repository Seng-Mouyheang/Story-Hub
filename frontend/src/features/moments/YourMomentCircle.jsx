import { Plus, User } from "lucide-react";

export default function YourMomentCircle({
  image,
  hasActiveMoments,
  hasUnseen,
  onOpenComposer,
  onOpenViewer,
}) {
  const ringIsUnseen = hasActiveMoments && hasUnseen;

  return (
    <div className="flex flex-col items-center gap-2 shrink-0 p-2 group">
      <div className="relative">
        <button
          type="button"
          onClick={hasActiveMoments ? onOpenViewer : onOpenComposer}
          className={`block w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[2px] transition-transform duration-300 ease-out hover:scale-[1.04] active:scale-95 active:duration-100 ${
            !hasActiveMoments
              ? "border-2 border-slate-300 border-dashed"
              : ringIsUnseen
                ? "bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400"
                : "bg-slate-200 transition-colors duration-300"
          }`}
        >
          <div className="w-full h-full rounded-full bg-white p-[2px]">
            <div className="w-full h-full rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
              {image ? (
                <img
                  src={image}
                  alt="Your story"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={30} className="text-slate-400" />
              )}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={onOpenComposer}
          aria-label="Add to your story"
          className="absolute bottom-0 right-0 bg-rose-600 text-white rounded-full p-1 border-2 border-white shadow-sm"
        >
          <Plus size={12} />
        </button>
      </div>

      <span className="block w-full max-w-16 sm:max-w-20 text-center text-[11px] sm:text-xs font-medium text-slate-700 truncate rounded-md px-1.5 py-1.5 -my-0.5">
        Your Story
      </span>
    </div>
  );
}
