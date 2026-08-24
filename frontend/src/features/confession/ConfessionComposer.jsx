import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LockOpen,
  SendHorizontal,
} from "lucide-react";

export default function ConfessionComposer({
  value,
  onChange,
  isAnonymous,
  onToggleAnonymous,
  visibility,
  onToggleVisibility,
  onSubmit,
  isSubmitting,
}) {
  return (
    <div className="bg-slate-900 text-white p-8 rounded-3xl sm:rounded-[40px] text-left relative overflow-hidden w-full shadow-sm">
      <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/20 blur-3xl"></div>
      <div className="relative z-10">
        <div className="w-12 h-1 bg-rose-500 rounded-full mb-4"></div>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="bg-transparent border-none outline-none w-full h-32 text-base text-slate-200 resize-none placeholder:text-slate-400"
          placeholder="Write your confession..."
        />
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mt-2">
          <div className="inline-flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleAnonymous}
              aria-pressed={isAnonymous}
              className="text-xs text-slate-400 inline-flex items-center gap-2 rounded-full border border-slate-700/60 px-3 py-1.5 cursor-pointer hover:border-slate-500 hover:text-slate-200 transition-colors"
            >
              {isAnonymous ? (
                <Lock className="w-3.5 h-3.5" />
              ) : (
                <LockOpen className="w-3.5 h-3.5" />
              )}
              {isAnonymous ? "Anonymous" : "Identified"}
            </button>

            <button
              type="button"
              onClick={onToggleVisibility}
              aria-pressed={visibility === "private"}
              className="text-xs text-slate-400 inline-flex items-center gap-2 rounded-full border border-slate-700/60 px-3 py-1.5 cursor-pointer hover:border-slate-500 hover:text-slate-200 transition-colors"
            >
              {visibility === "public" ? (
                <Eye className="w-3.5 h-3.5" />
              ) : (
                <EyeOff className="w-3.5 h-3.5" />
              )}
              {visibility === "public" ? "Public" : "Private"}
            </button>
          </div>
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-2 bg-rose-500 text-white font-semibold rounded-full hover:bg-rose-600 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SendHorizontal className="h-4 w-4" />
            )}
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
