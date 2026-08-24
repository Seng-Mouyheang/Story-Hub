import { Eye, EyeOff, Loader2, Lock, LockOpen } from "lucide-react";

import ModalDialog from "../../components/ModalDialog";

export default function ConfessionEditDialog({
  isOpen,
  titleId,
  content,
  onChangeContent,
  isAnonymous,
  onToggleAnonymous,
  visibility,
  onToggleVisibility,
  isSubmitting,
  onCancel,
  onSave,
}) {
  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onCancel}
      title="Edit Confession"
      titleId={titleId}
      closeLabel="Close edit confession modal"
      widthClassName="max-w-2xl"
    >
      <div className="px-4 py-4 space-y-4">
        <textarea
          value={content}
          onChange={(event) => onChangeContent(event.target.value)}
          className="w-full min-h-50 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none focus:border-rose-300 resize-none"
          placeholder="Edit your confession..."
        />

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleAnonymous}
            aria-pressed={isAnonymous}
            className="text-xs text-slate-500 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 cursor-pointer hover:border-slate-400 hover:text-slate-700 transition-colors"
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
            className="text-xs text-slate-500 inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 cursor-pointer hover:border-slate-400 hover:text-slate-700 transition-colors"
          >
            {visibility === "public" ? (
              <Eye className="w-3.5 h-3.5" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
            {visibility === "public" ? "Public" : "Private"}
          </button>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors cursor-pointer disabled:opacity-60"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? "Updating..." : "Save changes"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
